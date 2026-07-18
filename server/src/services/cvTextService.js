import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { AppError } from "../lib/errors.js";
import { getCvMeta } from "../repositories/cvRepo.js";
import {
  readOriginalFile,
  readCachedText,
  writeCachedText,
} from "../repositories/cvTextRepo.js";

const MAX_CHARS = 20_000;
const MIN_CHARS = 200;
const TRUNCATED_MARKER = "\n[TRUNCATED]";

function normalize(raw) {
  const collapsed = raw.replace(/\n{3,}/g, "\n\n").trim();
  if (collapsed.length > MAX_CHARS) {
    return `${collapsed.slice(0, MAX_CHARS)}${TRUNCATED_MARKER}`;
  }
  return collapsed;
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractRaw(meta, buffer) {
  if (meta.mimeType === "application/pdf") {
    return extractPdfText(buffer);
  }
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export async function extractText({ jobId, candidateId }) {
  const meta = await getCvMeta(jobId, candidateId);
  if (!meta) throw new AppError("CANDIDATE_NOT_FOUND", "Candidate not found", 404);

  const cached = await readCachedText(jobId, candidateId);
  if (cached) return { text: cached, meta };

  const buffer = await readOriginalFile(jobId, candidateId, meta.storedAs);
  const raw = await extractRaw(meta, buffer);
  const text = normalize(raw);

  if (text.length < MIN_CHARS) {
    throw new AppError(
      "EMPTY_CV",
      "Could not extract enough text from this CV — it may be a scanned/image PDF. OCR is not supported in this MVP.",
      422
    );
  }

  await writeCachedText(jobId, candidateId, text);
  return { text, meta };
}
