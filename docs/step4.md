# Step 4 — R2 CV Ingestion + React Ranking UI

> Goal: (A) import CVs stored in the hackathon's Cloudflare R2 bucket into
> local storage, then (B) build the React UI: job creation, candidate list,
> ranking board with evidence, and HR weight adjustment (recomputed in JS,
> zero LLM calls). Estimated effort: 3–4 hours.

## Part A — R2 ingestion (server)

### A.1 Config & client

- `npm i @aws-sdk/client-s3` (server/).
- New OPTIONAL env vars (server boots without them; import route returns
  503 STORAGE_NOT_CONFIGURED if unset): `STORAGE_ENDPOINT`,
  `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`.
- HARD RULE: credentials are read ONLY in lib/config.js from process.env.
  Never hardcoded, never logged, never echoed in errors. `.env.example`
  updated with empty placeholders.
- `services/r2Client.js`: the only file importing @aws-sdk. Exposes
  `listObjects(prefix?)` and `getObject(key)` (returns Buffer + inferred
  contentType). region "auto".

### A.2 Import flow

- `POST /api/jobs/:jobId/import-cvs` body `{ prefix?: string }`:
  1. list bucket objects (filter: .pdf/.docx only, ≤ 5MB — reuse existing
     limits; skip others, report them as skipped)
  2. for each: download to storage tmp, then reuse the EXISTING cvRepo
     save path (same validation, same meta.json, original R2 key recorded
     in meta as `sourceKey`)
  3. idempotent: if a candidate with the same `sourceKey` already exists
     for this job, skip (report as `duplicate`)
  4. response: `{ imported: [...], skipped: [...], duplicates: [...] }`;
     partial failure must not abort the batch.
- R2 is an INGESTION SOURCE only. All downstream steps (text extraction,
  profile, evaluation) keep reading from local storage. No writes to R2.

### A.3 Verification (Part A)

- [ ] Boot without storage vars → health shows `"r2":"missing"`, import → 503.
- [ ] With vars: import from bucket → files land in local candidates/,
      meta has sourceKey; re-run import → all duplicates, zero re-downloads.
- [ ] A .txt or oversized object in bucket → skipped, batch completes.
- [ ] Credentials appear in no log line and no error response.

## Part B — React UI (client)

Read /mnt/skills or design guidance is N/A here — follow CLAUDE.md §4
React rules. Tailwind only. No component libraries.

### B.1 API layer — `client/src/api/`

`http.js` (base fetch wrapper: JSON, error shape `{error:{code,message}}`
→ throws typed error), then `jobs.js`, `candidates.js`, `ranking.js` —
one function per endpoint. No fetch calls anywhere else.

### B.2 Pages & features

Routing: `react-router-dom` (install). Two pages:

1. **JobsPage** (`/`)
   - list jobs; create-job form (title + JD textarea) — controlled inputs,
     onClick submit (no <form> reload).
2. **JobDetailPage** (`/jobs/:jobId`) with three tabs:
   - **Candidates**: table from GET /candidates (name/filename, hasProfile,
     uploadedAt). Actions: local file upload, "Import from R2" button
     (shows imported/skipped/duplicates result), "Run all" → calls
     evaluate-all with a progress state (button disabled + spinner while
     running; free-tier is slow — set client timeout ≥ 5 min or poll).
   - **Criteria**: shows criteria + knockouts from GET criteria; "Generate"
     if absent. Each criterion row: label, description, kind badge, and a
     WEIGHT SLIDER (1–5).
     - Weight edits: `PATCH /api/jobs/:jobId/criteria` body
       `{ weights: { [criterionId]: number } }` → server updates
       criteria.json, bumps generatedAt (new criteriaVersion), returns
       updated doc. (NEW server endpoint — zod-validate ids exist.)
     - After a weight change the ranking tab shows stale badges; banner
       offers "Re-score all" (evaluate-all with force).
     - IMPORTANT server addition: recomputing totals for a weight change
       does NOT need the LLM (scores are stored per-criterion). Add
       `POST /api/jobs/:jobId/rescore` → recompute totalScore/
       recommendation from stored scores + new weights in lib/scoring.js,
       rewrite evaluations, clear staleness. UI uses THIS (instant),
       "Re-score all (LLM)" is a separate secondary action.
   - **Ranking**: the demo centerpiece.
     - ranked list as cards: name, totalScore (big), recommendation badge
       (color-coded: strong=green, match=blue, weak=amber,
       reject_review=red), knockout-failed marker, topStrength/topConcern.
     - click a card → expand: per-criterion score bars with the EVIDENCE
       QUOTE under each, knockout results, strengths/concerns lists.
       Evidence is the differentiator — make it visually first-class
       (quote styling, not fine print).
     - pending section (no profile / no evaluation) with per-candidate
       "Generate" buttons.

### B.3 State

- A small `useApi(fn, deps)` hook (loading/error/data/refetch). No React
  Query (keep deps light), no global store — lift state to pages.
- Every mutating action: optimistic disable + refetch on success; errors
  render the server's error.code + message inline (never alert()).

### B.4 Verification (Part B)

- [ ] Create job → appears in list → detail page loads.
- [ ] Upload local CV and import from R2 both reflect in Candidates tab.
- [ ] Run all → progress state → Ranking tab shows ordered cards.
- [ ] Expand card → evidence quotes visible per criterion.
- [ ] Move a weight slider → PATCH persists (reload survives) → stale
      badges appear → "Re-score" (no-LLM) updates order INSTANTLY; verify
      server logs show zero LLM calls for rescore.
- [ ] Knockout-failed candidate shows red reject_review but IS visible.
- [ ] Kill server → UI shows readable error states, no white screen.
- [ ] Commit: `feat: step4 r2 ingestion + ranking ui with hr weight control`

## Out of Scope
- Interview Kit UI → step 5. Notifications → step 6. Auth. Mobile layout
  (desktop-only demo is fine).
