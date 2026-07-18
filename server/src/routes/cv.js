import { Router } from "express";
import multer from "multer";
import { config } from "../lib/config.js";
import { AppError } from "../lib/errors.js";
import { uploadCv } from "../services/cvService.js";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  dest: config.storage.tmp,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError("INVALID_FILE_TYPE", "Only PDF or Word documents are accepted", 400));
      return;
    }
    cb(null, true);
  },
});

function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError(
      "FILE_TOO_LARGE",
      `File exceeds the ${config.maxUploadBytes} byte limit`,
      413
    );
  }
  return new AppError("UPLOAD_FAILED", err.message, 400);
}

function handleUpload(req, res, next) {
  upload.single("cv")(req, res, (err) => {
    if (err) {
      next(toAppError(err));
      return;
    }
    next();
  });
}

const router = Router();

router.post("/upload", handleUpload, async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("NO_FILE", "No file uploaded", 400);
    const result = await uploadCv(req.file);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
