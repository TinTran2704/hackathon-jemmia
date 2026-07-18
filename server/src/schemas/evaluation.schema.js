import { z } from "zod";

// What the LLM returns (no totals, no recommendation — code adds those)
export const LlmEvaluationSchema = z.object({
  knockoutResults: z.array(
    z.object({
      id: z.string(),
      passed: z.boolean(),
      evidence: z.string().min(1),
    })
  ),
  scores: z.array(
    z.object({
      criterionId: z.string(),
      score: z.number().int().min(0).max(5),
      evidence: z.string().min(1),
      confidence: z.enum(["high", "medium", "low"]),
    })
  ),
  strengths: z.array(z.string()).max(5),
  concerns: z.array(z.string()).max(5),
});

// What we store: LLM output + computed fields
export const EvaluationSchema = LlmEvaluationSchema.extend({
  jobId: z.string(),
  candidateId: z.string(),
  totalScore: z.number(),
  maxPossible: z.literal(100),
  knockoutFailed: z.boolean(),
  recommendation: z.enum(["strong_match", "match", "weak_match", "reject_review"]),
  evaluatedAt: z.string(),
  criteriaVersion: z.string(),
  hrDecision: z.enum(["passed", "rejected", "potential"]).optional().nullable(),
});
