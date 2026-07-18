import fs from "node:fs/promises";
import path from "node:path";
import { candidateDirPath } from "./cvRepo.js";

function cachePath(jobId, candidateId) {
  return path.join(candidateDirPath(jobId, candidateId), "cv-text.txt");
}

export async function readOriginalFile(jobId, candidateId, storedAs) {
  return fs.readFile(path.join(candidateDirPath(jobId, candidateId), storedAs));
}

export async function readCachedText(jobId, candidateId) {
  try {
    return await fs.readFile(cachePath(jobId, candidateId), "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function writeCachedText(jobId, candidateId, text) {
  const filePath = cachePath(jobId, candidateId);
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, text, "utf-8");
  await fs.rename(tmpPath, filePath);
}
