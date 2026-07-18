import { saveCv } from "../repositories/cvRepo.js";

export async function uploadCv({ jobId, file }) {
  return saveCv({
    jobId,
    tmpPath: file.path,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  });
}
