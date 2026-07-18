import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { config } from "../lib/config.js";
import { writeJsonAtomic, readJson } from "./jsonStore.js";
import { CvMetaSchema } from "../schemas/cvUpload.schema.js";

// No job exists yet in Step 1 (jobs CRUD is out of scope), so CVs are
// filed under a placeholder "unassigned" bucket instead of {jobId}.
const UNASSIGNED = "unassigned";

function candidateDir(candidateId) {
  return path.join(config.storage.uploads, UNASSIGNED, candidateId);
}

export async function saveCv({ tmpPath, originalName, mimeType, size }) {
  const candidateId = nanoid(10);
  const ext = path.extname(originalName);
  const dir = candidateDir(candidateId);
  await fs.mkdir(dir, { recursive: true });

  const storedPath = path.join(dir, `original${ext}`);
  await fs.rename(tmpPath, storedPath);

  const meta = CvMetaSchema.parse({
    candidateId,
    originalName,
    mimeType,
    size,
    uploadedAt: new Date().toISOString(),
  });
  await writeJsonAtomic(path.join(dir, "meta.json"), meta);

  return meta;
}

export async function getCvMeta(candidateId) {
  return readJson(path.join(candidateDir(candidateId), "meta.json"));
}
