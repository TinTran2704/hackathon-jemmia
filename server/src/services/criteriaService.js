import { completeJson } from "./llmClient.js";
import { extractCriteriaPrompt } from "../prompts/extractCriteria.js";
import { JobCriteriaSchema } from "../schemas/criteria.schema.js";
import { readCriteria, writeCriteria } from "../repositories/criteriaRepo.js";

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
