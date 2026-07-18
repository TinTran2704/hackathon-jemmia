import path from "node:path";
import { config } from "../lib/config.js";
import * as r2Client from "./r2Client.js";
import { saveCv, findBySourceKey } from "../repositories/cvRepo.js";

const ALLOWED_EXTENSIONS = new Map([
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
]);

export async function importFromR2({ jobId, prefix = "" }) {
  const objects = await r2Client.listObjects(prefix);

  const imported = [];
  const skipped = [];
  const duplicates = [];

  for (const obj of objects) {
    const ext = path.extname(obj.key).toLowerCase();
    const mimeType = ALLOWED_EXTENSIONS.get(ext);

    if (!mimeType) {
      skipped.push({ key: obj.key, reason: "unsupported_type" });
      continue;
    }
    if (obj.size > config.maxUploadBytes) {
      skipped.push({ key: obj.key, reason: "too_large" });
      continue;
    }

    const existing = await findBySourceKey(jobId, obj.key);
    if (existing) {
      duplicates.push({ key: obj.key, candidateId: existing.candidateId });
      continue;
    }

    try {
      const { buffer } = await r2Client.getObject(obj.key);
      const meta = await saveCv({
        jobId,
        buffer,
        originalName: path.basename(obj.key),
        mimeType,
        size: obj.size,
        sourceKey: obj.key,
      });
      imported.push({ key: obj.key, candidateId: meta.candidateId });
    } catch {
      skipped.push({ key: obj.key, reason: "download_failed" });
    }
  }

  return { imported, skipped, duplicates };
}
