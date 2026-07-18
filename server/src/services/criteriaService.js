import { completeJson } from "./llmClient.js";
import { extractCriteriaPrompt } from "../prompts/extractCriteria.js";
import { JobCriteriaSchema } from "../schemas/criteria.schema.js";
import { readCriteria, writeCriteria } from "../repositories/criteriaRepo.js";
import { AppError } from "../lib/errors.js";

const LlmCriteriaSchema = JobCriteriaSchema.omit({ jobId: true, generatedAt: true });

export async function getOrGenerate({ jobId, description, force = false }) {
  if (!force) {
    const existing = await readCriteria(jobId);
    if (existing) return existing;
  }

  const { system, user } = extractCriteriaPrompt(description);
  const llmResult = await completeJson({ system, user, schema: LlmCriteriaSchema });

  const criteria = JobCriteriaSchema.parse({
    ...llmResult,
    jobId,
    generatedAt: new Date().toISOString(),
  });

  await writeCriteria(jobId, criteria);
  return criteria;
}

export async function get(jobId) {
  return readCriteria(jobId);
}

export async function updateWeights({ jobId, weights }) {
  const existing = await readCriteria(jobId);
  if (!existing) throw new AppError("CRITERIA_NOT_FOUND", "Criteria not found for this job", 404);

  const validIds = new Set(existing.criteria.map((c) => c.id));
  for (const id of Object.keys(weights)) {
    if (!validIds.has(id)) {
      throw new AppError("UNKNOWN_CRITERION", `Unknown criterion id: ${id}`, 400);
    }
  }

  const updatedCriteria = existing.criteria.map((c) =>
    Object.prototype.hasOwnProperty.call(weights, c.id) ? { ...c, weight: weights[c.id] } : c
  );

  const updated = JobCriteriaSchema.parse({
    ...existing,
    criteria: updatedCriteria,
    generatedAt: new Date().toISOString(),
  });

  await writeCriteria(jobId, updated);
  return updated;
}
