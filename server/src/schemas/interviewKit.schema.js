import { z } from "zod";

const QuestionSchema = z.object({
  question: z.string().min(10),
  intent: z.string(), // what this question verifies
  basedOn: z.string(), // verbatim quote: the flag/evidence/concern that triggered it
  listenFor: z.array(z.string()).min(1).max(3), // signs of a good answer
});

export const InterviewKitSchema = z.object({
  jobId: z.string(),
  candidateId: z.string(),
  strengthProbes: z.array(QuestionSchema).min(2).max(5), // dig into claimed wins
  verificationProbes: z.array(QuestionSchema).min(1).max(4), // gaps, job hopping, unverified skills, low-score criteria
  fitQuestions: z.array(QuestionSchema).min(1).max(3), // vs JD criteria
  openingNote: z.string().max(300), // 2-3 sentence brief for the interviewer
  generatedAt: z.string(),
  evaluationVersion: z.string(), // evaluatedAt it was built from
  invitationSent: z.boolean().optional().nullable(),
  comments: z.string().optional().nullable(),
});
