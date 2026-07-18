import { readProfile } from "../repositories/profileRepo.js";
import { readEvaluation } from "../repositories/evaluationRepo.js";
import { readCriteria } from "../repositories/criteriaRepo.js";
import { completeJson } from "./llmClient.js";
import { candidateFeedbackPrompt } from "../prompts/candidateFeedback.js";
import { FeedbackResponseSchema } from "../schemas/outbox.schema.js";
import { AppError } from "../lib/errors.js";

function hasInternalTerms(text) {
  const lower = text.toLowerCase();
  // Forbidden internal terms from spec + Vietnamese equivalents
  const forbiddenWords = [
    "knockout",
    "reject",
    "reject_review",
    "weak_match",
    "strong_match",
    "flags",
    "loại từ đầu",
    "không đạt",
    "cờ báo động",
    "bắt buộc", // Wait, "bắt buộc" is criteria, let's keep it safe. But "knockout" is definitely banned.
    "loại",
  ];
  // Pattern to catch scores, e.g. 1/5, 2/5, 0/5
  const scorePattern = /\b[0-5]\/[0-5]\b/g;

  if (forbiddenWords.some((word) => lower.includes(word))) return true;
  if (scorePattern.test(lower)) return true;
  return false;
}

export async function generateFeedback({ jobId, candidateId }) {
  const profile = await readProfile(jobId, candidateId);
  if (!profile) {
    throw new AppError("PROFILE_MISSING", "Candidate profile is missing", 409);
  }

  const evaluation = await readEvaluation(jobId, candidateId);
  if (!evaluation) {
    throw new AppError("EVALUATION_MISSING", "Candidate evaluation is missing", 409);
  }

  const criteria = await readCriteria(jobId);
  if (!criteria) {
    throw new AppError("CRITERIA_MISSING", "Job criteria are missing", 409);
  }

  // Guard: recommendation status must be weak_match or reject_review
  if (evaluation.recommendation !== "weak_match" && evaluation.recommendation !== "reject_review") {
    throw new AppError("FEEDBACK_GUARD", "Feedback can only be generated for weak_match or reject_review candidates", 403);
  }

  // Find 2-3 lowest scoring, highest weight criteria
  const criteriaById = new Map(criteria.criteria.map((c) => [c.id, c]));
  const scoresWithWeights = evaluation.scores.map((s) => {
    const crit = criteriaById.get(s.criterionId);
    return {
      id: s.criterionId,
      label: crit ? crit.label : s.criterionId,
      score: s.score,
      weight: crit ? crit.weight : 0,
      description: crit ? crit.description : "",
    };
  });

  // Sort by score ascending (lowest score first), then weight descending (highest weight first)
  scoresWithWeights.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return b.weight - a.weight;
  });

  const lowScoreHighWeightCriteria = scoresWithWeights.slice(0, 3);

  // Detect dominant language from profile summary
  // If summary contains typical Vietnamese words, use Vietnamese, otherwise default to English
  const vnRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const isVietnamese = vnRegex.test(profile.summary || "");
  const language = isVietnamese ? "Vietnamese" : "English";

  const { system, user } = candidateFeedbackPrompt({
    profileSummary: profile.summary,
    concerns: evaluation.concerns,
    lowScoreHighWeightCriteria,
    language,
  });

  let llmResult;
  try {
    llmResult = await completeJson({ system, user, schema: FeedbackResponseSchema });
  } catch (err) {
    throw new AppError("LLM_UPSTREAM", `Feedback generation failed: ${err.message}`, 502);
  }

  // Verify internal terms blocklist
  const combinedText = `${llmResult.subject} ${llmResult.bodyText}`;
  if (hasInternalTerms(combinedText)) {
    // Retry once with repair prompt
    const repairUser = `${user}\n\nYour previous output violated safety/policy rules because it contained forbidden internal terms (such as raw score numbers, 'knockout', or 'reject'). Rewrite the email to be warm, respectful, and constructive, listing the feedback suggestions without any score numbers or internal system words. Return corrected raw JSON only.`;
    try {
      llmResult = await completeJson({ system, user: repairUser, schema: FeedbackResponseSchema });
    } catch (err) {
      throw new AppError("LLM_UPSTREAM", `Feedback repair failed: ${err.message}`, 502);
    }

    const checkText = `${llmResult.subject} ${llmResult.bodyText}`;
    if (hasInternalTerms(checkText)) {
      throw new AppError("FEEDBACK_BLOCKED", "Feedback output contains forbidden internal terms after retry", 502);
    }
  }

  return llmResult;
}
