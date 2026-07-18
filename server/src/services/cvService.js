import { saveCv } from "../repositories/cvRepo.js";

export async function uploadCv(file) {
  return saveCv({
    tmpPath: file.path,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  });
}
