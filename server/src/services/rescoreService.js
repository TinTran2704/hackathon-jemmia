import { AppError } from "../lib/errors.js";
import { computeTotal, computeRecommendation } from "../lib/scoring.js";
import { readCriteria } from "../repositories/criteriaRepo.js";
import { readEvaluation, writeEvaluation } from "../repositories/evaluationRepo.js";
import { listCandidates } from "../repositories/cvRepo.js";
import { EvaluationSchema } from "../schemas/evaluation.schema.js";

// No LLM call: recomputes totals/recommendation from already-stored
// per-criterion scores against the CURRENT criteria weights. Intended for
// the weight-slider flow (weights change, criterion set does not) — a full
// criteria regeneration should go through re-evaluation instead.
export async function rescoreAll(jobId) {
  const criteria = await readCriteria(jobId);
  if (!criteria) throw new AppError("CRITERIA_MISSING", "Generate criteria for this job first", 409);

  const metas = await listCandidates(jobId);
  const rescored = [];

  for (const meta of metas) {
    const evaluation = await readEvaluation(jobId, meta.candidateId);
    if (!evaluation) continue;

    const totalScore = computeTotal(evaluation.scores, criteria.criteria);
    const recommendation = computeRecommendation({
      total: totalScore,
      knockoutFailed: evaluation.knockoutFailed,
    });

    const updated = EvaluationSchema.parse({
      ...evaluation,
      totalScore,
      recommendation,
      criteriaVersion: criteria.generatedAt,
    });

    await writeEvaluation(jobId, meta.candidateId, updated);
    rescored.push(meta.candidateId);
  }

  return { rescored };
}
