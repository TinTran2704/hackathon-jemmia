import path from "node:path";
import { candidateDirPath } from "./cvRepo.js";
import { readJson, writeJsonAtomic } from "./jsonStore.js";

function profilePath(jobId, candidateId) {
  return path.join(candidateDirPath(jobId, candidateId), "profile.json");
}

export async function readProfile(jobId, candidateId) {
  return readJson(profilePath(jobId, candidateId));
}

export async function writeProfile(jobId, candidateId, profile) {
  await writeJsonAtomic(profilePath(jobId, candidateId), profile);
}
