# Step 5 — Interview Kit (the signature feature)

> Goal: for any evaluated candidate, generate a personalized interview
> question set that reuses everything we already have: profile.flags,
> evaluation scores/evidence, strengths, concerns, and the JD criteria.
> One LLM call per candidate, cached. Estimated effort: ~1–1.5 hours.

## 1. Data model — `schemas/interviewKit.schema.js`

```js
import { z } from 'zod';

const QuestionSchema = z.object({
  question: z.string().min(10),
  intent: z.string(),                 // what this question verifies
  basedOn: z.string(),                // verbatim quote: the flag/evidence/
                                      // concern that triggered it
  listenFor: z.array(z.string()).min(1).max(3),  // signs of a good answer
});

export const InterviewKitSchema = z.object({
  jobId: z.string(),
  candidateId: z.string(),
  strengthProbes: z.array(QuestionSchema).min(2).max(5),   // dig into claimed wins
  verificationProbes: z.array(QuestionSchema).min(1).max(4), // gaps, job hopping,
                                                             // unverified skills,
                                                             // low-score criteria
  fitQuestions: z.array(QuestionSchema).min(1).max(3),     // vs JD criteria
  openingNote: z.string().max(300),   // 2-3 sentence brief for the interviewer
  generatedAt: z.string(),
  evaluationVersion: z.string(),      // evaluatedAt it was built from
});
```

Stored at `.../candidates/{candidateId}/interview-kit.json`.

## 2. Prompt — `prompts/generateInterviewKit.js`

Input: profile (incl. flags), evaluation (scores + evidence + strengths +
concerns), criteria labels. Rules for the system prompt:
- Every question MUST be traceable: `basedOn` quotes the specific flag,
  evidence line, or concern it came from. Generic questions that could be
  asked of any candidate ("tell me about yourself") are FORBIDDEN.
- strengthProbes: pick the highest-scoring evidence and ask HOW (method,
  numbers, the candidate's personal contribution vs the team's).
- verificationProbes: one per flag (gap → what happened in that period;
  job_hopping → reasons and pattern; unverified_skill → concrete usage
  question that is hard to bluff), plus any criterion scored 0–2 that has
  weight ≥ 4.
- Questions in the CV's dominant language (match profile.summary language);
  intent/listenFor may stay English.
- Raw JSON only, matching the schema minus jobId/candidateId/generatedAt/
  evaluationVersion (service injects those).

## 3. Service + routes

- `services/interviewKitService.js` — `generate({ jobId, candidateId, force })`:
  1. load profile + evaluation (409 PROFILE_MISSING / EVALUATION_MISSING)
  2. cache hit if evaluationVersion matches evaluation.evaluatedAt and
     no force
  3. completeJson(schema) via existing llmClient → inject fields → atomic
     write → return
- Routes:
  - `POST /api/jobs/:jobId/candidates/:candidateId/interview-kit` (+force)
  - `GET` same path (404 if absent)

## 4. UI (extends step 4's Ranking tab)

- In the expanded candidate card: "Interview Kit" button →
  generates (spinner) or loads cached → renders three sections:
  - each question as a card: the question (big), `basedOn` as a styled
    quote ("Vì CV ghi: …"), intent as one line, listenFor as small checks.
  - a "Copy all" button producing clean plain text (markdown-ish) of the
    whole kit for pasting into notes — this is the demo money-shot.
  - stale banner if evaluation was regenerated after the kit
    (evaluationVersion mismatch) with "Regenerate" action.

## 5. Verification Checklist

- [ ] Kit for the strong-fit CV → strengthProbes reference its actual
      achievements verbatim in basedOn; zero generic questions.
- [ ] Candidate with an `unverified_skill` flag → a verificationProbe
      targets that exact skill with a concrete, bluff-resistant question.
- [ ] Candidate with a gap/job_hopping flag → corresponding probe exists.
- [ ] Vietnamese CV → questions in Vietnamese.
- [ ] Cached: re-POST → no LLM call; force → regenerates. Re-evaluating
      the candidate → UI shows stale banner; regenerate clears it.
- [ ] 409s when profile/evaluation missing.
- [ ] Copy-all produces readable plain text of every question.
- [ ] Commit: `feat: step5 personalized interview kit`

## Out of Scope
- Interviewer feedback capture / scoring the interview itself.
- PDF export of the kit (copy-all text is enough for the demo).
