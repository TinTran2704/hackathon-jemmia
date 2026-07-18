import { z } from "zod";

export const OutboxMessageSchema = z.object({
  id: z.string(),
  type: z.enum(["hr_digest", "candidate_feedback"]),
  to: z.string().email(),
  subject: z.string().min(3),
  bodyText: z.string().min(10),
  candidateId: z.string().optional().nullable(),
  createdAt: z.string(),
  delivery: z.enum(["demo", "smtp"]),
  status: z.enum(["stored", "sent", "failed"]),
});

export const FeedbackResponseSchema = z.object({
  subject: z.string().min(3),
  bodyText: z.string().min(10),
});
