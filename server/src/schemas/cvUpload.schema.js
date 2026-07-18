import { z } from "zod";

export const CvMetaSchema = z.object({
  candidateId: z.string().length(10),
  originalName: z.string().min(1),
  mimeType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  size: z.number().int().positive(),
  storedAs: z.string().min(1),
  uploadedAt: z.string().datetime(),
});
