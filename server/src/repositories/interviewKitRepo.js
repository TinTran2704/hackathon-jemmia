import path from "node:path";
import { candidateDirPath } from "./cvRepo.js";
import { readJson, writeJsonAtomic } from "./jsonStore.js";

function interviewKitPath(jobId, candidateId) {
  return path.join(candidateDirPath(jobId, candidateId), "interview-kit.json");
}

export async function readInterviewKit(jobId, candidateId) {
  return readJson(interviewKitPath(jobId, candidateId));
}

export async function writeInterviewKit(jobId, candidateId, kit) {
  await writeJsonAtomic(interviewKitPath(jobId, candidateId), kit);
}
