import { z } from "zod";

export const JobSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(10),
  createdAt: z.string(),
  status: z.enum(["open", "closed"]).default("open"),
});
