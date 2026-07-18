import path from "node:path";
import { candidateDirPath } from "./cvRepo.js";
import { readJson, writeJsonAtomic } from "./jsonStore.js";

function evaluationPath(jobId, candidateId) {
  return path.join(candidateDirPath(jobId, candidateId), "evaluation.json");
}

export async function readEvaluation(jobId, candidateId) {
  return readJson(evaluationPath(jobId, candidateId));
}

export async function writeEvaluation(jobId, candidateId, evaluation) {
  await writeJsonAtomic(evaluationPath(jobId, candidateId), evaluation);
}
