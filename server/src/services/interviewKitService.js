import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { completeJson } from "./llmClient.js";
import { generateInterviewKitPrompt } from "../prompts/generateInterviewKit.js";
import { InterviewKitSchema } from "../schemas/interviewKit.schema.js";
import { readCriteria } from "../repositories/criteriaRepo.js";
import { readProfile } from "../repositories/profileRepo.js";
import { readEvaluation } from "../repositories/evaluationRepo.js";
import { readInterviewKit, writeInterviewKit } from "../repositories/interviewKitRepo.js";

// Inner schema to validate LLM response before adding server metadata
const QuestionSchema = z.object({
  question: z.string().min(10),
  intent: z.string(),
  basedOn: z.string(),
  listenFor: z.array(z.string()).min(1).max(3),
});

const LlmInterviewKitSchema = z.object({
  strengthProbes: z.array(QuestionSchema).min(2).max(5),
  verificationProbes: z.array(QuestionSchema).min(1).max(4),
  fitQuestions: z.array(QuestionSchema).min(1).max(3),
  openingNote: z.string().max(300),
});

export async function generate({ jobId, candidateId, force = false }) {
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

  if (!force) {
    const cached = await readInterviewKit(jobId, candidateId);
    if (cached && cached.evaluationVersion === evaluation.evaluatedAt) {
      return cached;
    }
  }

  const { system, user } = generateInterviewKitPrompt({ profile, evaluation, criteria });
  const llmResult = await completeJson({ system, user, schema: LlmInterviewKitSchema });

  const kit = InterviewKitSchema.parse({
    ...llmResult,
    jobId,
    candidateId,
    generatedAt: new Date().toISOString(),
    evaluationVersion: evaluation.evaluatedAt,
  });

  await writeInterviewKit(jobId, candidateId, kit);
  return kit;
}

export async function get({ jobId, candidateId }) {
  return readInterviewKit(jobId, candidateId);
}
