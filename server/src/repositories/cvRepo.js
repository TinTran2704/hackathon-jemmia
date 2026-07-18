import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { config } from "../lib/config.js";
import { writeJsonAtomic, readJson } from "./jsonStore.js";
import { CvMetaSchema } from "../schemas/cvUpload.schema.js";

function candidateDir(jobId, candidateId) {
  return path.join(config.storage.jobs, jobId, "candidates", candidateId);
}

export async function saveCv({ jobId, tmpPath, originalName, mimeType, size }) {
  const candidateId = nanoid(10);
  const ext = path.extname(originalName);
  const dir = candidateDir(jobId, candidateId);
  await fs.mkdir(dir, { recursive: true });

  const storedAs = `original${ext}`;
  await fs.rename(tmpPath, path.join(dir, storedAs));

  const meta = CvMetaSchema.parse({
    candidateId,
    originalName,
    mimeType,
    size,
    storedAs,
    uploadedAt: new Date().toISOString(),
  });
  await writeJsonAtomic(path.join(dir, "meta.json"), meta);

  return meta;
}

export async function getCvMeta(jobId, candidateId) {
  return readJson(path.join(candidateDir(jobId, candidateId), "meta.json"));
}

export async function listCandidates(jobId) {
  const candidatesRoot = path.join(config.storage.jobs, jobId, "candidates");
  let entries;
  try {
    entries = await fs.readdir(candidatesRoot, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const metas = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => getCvMeta(jobId, entry.name))
  );
  return metas.filter(Boolean);
}

export function candidateDirPath(jobId, candidateId) {
  return candidateDir(jobId, candidateId);
}
