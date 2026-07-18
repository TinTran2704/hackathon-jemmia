import { z } from "zod";

export const ProfileSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().max(600),
  yearsOfExperience: z.number().nullable(),
  skills: z.array(z.string()).max(40),
  languages: z.array(z.string()),
  experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        startDate: z.string().nullable(),
        endDate: z.string().nullable(),
        highlights: z.array(z.string()).max(6),
      })
    )
    .max(15),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string().nullable(),
        year: z.string().nullable(),
      })
    )
    .max(10),
  flags: z
    .array(
      z.object({
        type: z.enum(["gap", "job_hopping", "unverified_skill", "other"]),
        note: z.string(),
      })
    )
    .max(10),
});
