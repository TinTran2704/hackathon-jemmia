# Step 3 — Evidence-Based Evaluation Engine (the heart of the product)

> Goal: evaluate each candidate profile against the JD with a two-layer
> system: (1) criteria extracted from the JD once per job, (2) per-candidate
> evidence-based scoring. The final score is computed DETERMINISTICALLY in
> code from LLM sub-scores — the LLM never outputs the total. Ranking
> endpoint returns a sorted shortlist. Estimated effort: 2–3 hours.

## 0. Prerequisite

Step 2's five pending LLM checks must pass first (real key in .env, at
least 2 real profiles generated, one Vietnamese CV among them). Do not
start Step 3 implementation until that pass is green.

## 1. Design Principles

- **Score nothing without evidence.** Every criterion score must quote
  the profile/CV. A score with empty evidence is invalid output.
- **LLM judges per-criterion; code computes the total.** Weighted math in
  JS = reproducible, explainable, and HR-adjustable later without re-calling
  the LLM.
- **Knockouts are boolean, not weighted.** Missing a must-have doesn't
  lower a score — it caps the candidate at `recommendation: "reject_review"`
  regardless of total (HR still sees them; AI never hard-rejects).
- 2 LLM calls per job total-cost shape: 1 call per job (criteria) +
  1 call per candidate (scoring). No calls at ranking time.

## 2. Data Model

### 2.1 `schemas/criteria.schema.js`

```js
import { z } from 'zod';

export const CriterionSchema = z.object({
  id: z.string(),                       // slug, e.g. "nodejs-experience"
  label: z.string(),                    // human-readable
  description: z.string(),              // what "good" looks like, from JD
  weight: z.number().min(1).max(5),     // LLM proposes; HR edits in step 4
  kind: z.enum(['skill', 'experience', 'education', 'language', 'other']),
});

export const JobCriteriaSchema = z.object({
  jobId: z.string(),
  knockouts: z.array(z.object({         // hard must-haves from the JD
    id: z.string(),
    label: z.string(),
    description: z.string(),
  })).max(5),
  criteria: z.array(CriterionSchema).min(3).max(10),
  generatedAt: z.string(),
});
```

Stored at `storage/jobs/{jobId}/criteria.json`. Generated once per job
(cached; `?force=true` regenerates).

### 2.2 `schemas/evaluation.schema.js`

```js
import { z } from 'zod';

// What the LLM returns (no totals, no recommendation — code adds those)
export const LlmEvaluationSchema = z.object({
  knockoutResults: z.array(z.object({
    id: z.string(),
    passed: z.boolean(),
    evidence: z.string().min(1),        // quote OR explicit "not found in CV"
  })),
  scores: z.array(z.object({
    criterionId: z.string(),
    score: z.number().int().min(0).max(5),
    evidence: z.string().min(1),        // MUST quote profile text; "" invalid
    confidence: z.enum(['high', 'medium', 'low']),
  })),
  strengths: z.array(z.string()).max(5),
  concerns: z.array(z.string()).max(5),
});

// What we store: LLM output + computed fields
export const EvaluationSchema = LlmEvaluationSchema.extend({
  jobId: z.string(),
  candidateId: z.string(),
  totalScore: z.number(),               // 0..100, computed in code
  maxPossible: z.literal(100),
  knockoutFailed: z.boolean(),
  recommendation: z.enum(['strong_match', 'match', 'weak_match', 'reject_review']),
  evaluatedAt: z.string(),
  criteriaVersion: z.string(),          // criteria.generatedAt it was scored against
});
```

Stored at `.../candidates/{candidateId}/evaluation.json`.

## 3. Tasks (in order)

### 3.1 Criteria extraction — `prompts/extractCriteria.js` + `services/criteriaService.js`

- Prompt input: JD text. System prompt instructs:
  - Derive 3–10 weighted criteria + up to 5 knockouts ONLY from what the
    JD actually asks for — do not import generic recruiter wisdom.
  - Knockout = phrased in JD as required/must ("bắt buộc", "yêu cầu",
    "required", "must have"). Nice-to-haves are criteria, never knockouts.
  - Weights: 5 = central to the role, 1 = peripheral mention.
  - JD may be Vietnamese/English/mixed; labels in the JD's language,
    ids always english-slugs.
- Service: `getOrGenerate(jobId, { force })` → cached `criteria.json`
  via `completeJson(JobCriteriaSchema-ish)` (validate WITHOUT jobId/
  generatedAt from LLM; service injects those).
- Route: `POST /api/jobs/:jobId/criteria` (+force), `GET` same path.

### 3.2 Scoring math — `lib/scoring.js` (PURE functions, no I/O)

```js
// computeTotal(scores, criteria) -> number 0..100
//   sum(score_i * weight_i) / sum(5 * weight_i) * 100, rounded to 1 decimal
//   confidence 'low' multiplies that criterion's score by 0.7 (we trust
//   weak evidence less). Document this in a comment.
// computeRecommendation({ total, knockoutFailed }) ->
//   knockoutFailed        -> 'reject_review'
//   total >= 75           -> 'strong_match'
//   total >= 55           -> 'match'
//   else                  -> 'weak_match'
```

Unit-test these two functions with plain `node:test` in
`lib/scoring.test.js` (5–6 cases incl. edge: all zeros, all fives,
low-confidence dampening, knockout override). `npm test` script runs it.

### 3.3 Evaluation — `prompts/evaluateCandidate.js` + `services/evaluationService.js`

- Prompt input: criteria.json + profile.json (NOT raw CV text — profile
  is smaller and already normalized; mention flags/highlights are quotable
  evidence).
- System prompt rules:
  - Score each criterion 0–5. 0 = no evidence at all. Quote evidence
    verbatim from the profile for every score and knockout.
  - If evidence is absent, score 0 with evidence "not found in profile" —
    NEVER guess or infer unstated experience.
  - Return raw JSON matching LlmEvaluationSchema only.
- Service `evaluate({ jobId, candidateId, force })`:
  1. load criteria (409 `CRITERIA_MISSING` if absent — tell caller to POST criteria first)
  2. load profile (409 `PROFILE_MISSING` if absent)
  3. cached evaluation? if `criteriaVersion` matches current criteria and
     no force → return cached (stale-version = auto re-evaluate)
  4. `completeJson(LlmEvaluationSchema)`
  5. reject-and-retry-once if any `scores[].criterionId` doesn't exist in
     criteria, or any criterion is missing from scores (treat as bad output)
  6. compute total + recommendation in code → write evaluation.json
- Routes: `POST /api/jobs/:jobId/candidates/:candidateId/evaluation`
  (+force), `GET` same path.

### 3.4 Ranking — `services/rankingService.js` + route

- `GET /api/jobs/:jobId/ranking` → reads all evaluation.json (no LLM):

```json
{
  "jobId": "...",
  "criteriaVersion": "...",
  "ranked": [ { "candidateId", "fullName", "totalScore", "recommendation",
                "knockoutFailed", "topStrength", "topConcern",
                "stale": false } ],
  "pending": [ { "candidateId", "fullName", "reason": "no_profile|no_evaluation" } ]
}
```

- Sort: knockout-passers by totalScore desc first, then knockout-failers
  by totalScore desc. `stale: true` if evaluated against old criteria.
- One convenience endpoint for demo:
  `POST /api/jobs/:jobId/evaluate-all` → sequentially (queue already
  enforces 1-in-flight) generates missing profiles + evaluations for all
  candidates; returns `{ done: [], failed: [{candidateId, code}] }`.
  Partial failure must not abort the batch.

## 4. Verification Checklist (Definition of Done)

- [ ] `npm test` passes (scoring unit tests).
- [ ] POST criteria on a real JD → criteria.json with sensible weights;
      a "bắt buộc"/"required" JD line became a knockout, a nice-to-have
      did not.
- [ ] POST evaluation on a strong-fit CV → every score has non-empty
      evidence quoting the profile; total computed matches hand-check of
      the formula for at least one candidate (show the arithmetic).
- [ ] Weak/unrelated CV → low total, `weak_match` or knockout →
      `reject_review`; no invented evidence for missing skills (score 0,
      "not found in profile").
- [ ] Evaluation before criteria exist → 409 CRITERIA_MISSING.
- [ ] Cached: re-POST → no LLM call (logs). force=true → re-evaluates.
- [ ] Regenerate criteria with force → old evaluations show `stale: true`
      in ranking; re-POST evaluation auto-refreshes it.
- [ ] evaluate-all on a job with ≥3 CVs (mix VN/EN, one bad fit) →
      ranking endpoint returns correct order; batch survives one candidate
      failing (e.g. plant one empty PDF).
- [ ] Ranking endpoint itself makes zero LLM calls (logs).
- [ ] Commit: `feat: step3 evidence-based evaluation and ranking`

## 5. Out of Scope

- Editing criteria/weights via API or UI → step 4 (HR adjustments).
- Embedding-based semantic match (nice-to-have; free-tier embeddings vary
  by provider — revisit only if time remains after step 6).
- Interview Kit (uses strengths/concerns/flags) → step 5.
- Any React work → step 4.