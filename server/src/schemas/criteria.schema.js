import { z } from "zod";

export const CriterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  weight: z.number().min(1).max(5),
  kind: z.enum(["skill", "experience", "education", "language", "other"]),
});

export const JobCriteriaSchema = z.object({
  jobId: z.string(),
  knockouts: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string(),
      })
    )
    .max(5),
  criteria: z.array(CriterionSchema).min(3).max(10),
  generatedAt: z.string(),
});
