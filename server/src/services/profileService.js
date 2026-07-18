import { extractText } from "./cvTextService.js";
import { completeJson } from "./llmClient.js";
import { extractProfilePrompt } from "../prompts/extractProfile.js";
import { ProfileSchema } from "../schemas/profile.schema.js";
import { readProfile, writeProfile } from "../repositories/profileRepo.js";

export async function generate({ jobId, candidateId, force = false }) {
  if (!force) {
    const existing = await readProfile(jobId, candidateId);
    if (existing) return existing;
  }

  const { text } = await extractText({ jobId, candidateId });
  const { system, user } = extractProfilePrompt(text);
  const profile = await completeJson({ system, user, schema: ProfileSchema });

  await writeProfile(jobId, candidateId, profile);
  return profile;
}

export async function get({ jobId, candidateId }) {
  return readProfile(jobId, candidateId);
}
