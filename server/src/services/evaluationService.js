import { AppError } from "../lib/errors.js";
import { completeJson } from "./llmClient.js";
import { evaluateCandidatePrompt } from "../prompts/evaluateCandidate.js";
import { LlmEvaluationSchema, EvaluationSchema } from "../schemas/evaluation.schema.js";
import { computeTotal, computeRecommendation } from "../lib/scoring.js";
import { readCriteria } from "../repositories/criteriaRepo.js";
import { readProfile } from "../repositories/profileRepo.js";
import { readEvaluation, writeEvaluation } from "../repositories/evaluationRepo.js";

function hasExactCoverage(llmResult, criteria) {
  const criterionIds = new Set(criteria.map((c) => c.id));
  const scoredIds = llmResult.scores.map((s) => s.criterionId);
  if (scoredIds.length !== criterionIds.size) return false;
  return scoredIds.every((id) => criterionIds.has(id)) && new Set(scoredIds).size === criterionIds.size;
}

export async function evaluate({ jobId, candidateId, force = false }) {
  const criteria = await readCriteria(jobId);
  if (!criteria) {
    throw new AppError("CRITERIA_MISSING", "Generate criteria for this job first", 409);
  }

  const profile = await readProfile(jobId, candidateId);
  if (!profile) {
    throw new AppError("PROFILE_MISSING", "Generate a profile for this candidate first", 409);
  }

  if (!force) {
    const cached = await readEvaluation(jobId, candidateId);
    if (cached && cached.criteriaVersion === criteria.generatedAt) return cached;
  }

  const { system, user } = evaluateCandidatePrompt({ criteria, profile });
  let llmResult = await completeJson({ system, user, schema: LlmEvaluationSchema });

  if (!hasExactCoverage(llmResult, criteria.criteria)) {
    const repairUser = `${user}

Your previous output scored the wrong set of criteria. "scores" must contain exactly one entry per criterion id listed above — no missing criteria, no extra or invented ids. Return corrected raw JSON only.`;
    llmResult = await completeJson({ system, user: repairUser, schema: LlmEvaluationSchema });
    if (!hasExactCoverage(llmResult, criteria.criteria)) {
      throw new AppError("LLM_BAD_OUTPUT", "LLM did not score the expected set of criteria", 502);
    }
  }

  const knockoutFailed = llmResult.knockoutResults.some((k) => !k.passed);
  const totalScore = computeTotal(llmResult.scores, criteria.criteria);
  const recommendation = computeRecommendation({ total: totalScore, knockoutFailed });

  const evaluation = EvaluationSchema.parse({
    ...llmResult,
    jobId,
    candidateId,
    totalScore,
    maxPossible: 100,
    knockoutFailed,
    recommendation,
    evaluatedAt: new Date().toISOString(),
    criteriaVersion: criteria.generatedAt,
  });

  await writeEvaluation(jobId, candidateId, evaluation);
  return evaluation;
}

export async function get(jobId, candidateId) {
  return readEvaluation(jobId, candidateId);
}
