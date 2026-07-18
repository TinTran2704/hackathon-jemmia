# Step 2 — Jobs, CV Text Extraction & Structured Profile (first LLM step)

> Goal: create Jobs (JD), extract raw text from uploaded CVs locally, then
> use a FREE LLM API (OpenAI-compatible endpoint) to convert CV text into
> a validated structured profile. Estimated effort: 2–3 hours.

## 1. Outcome

After this step:
- `POST /api/jobs` creates a job from a JD; CVs upload under a real jobId.
- CV text is extracted locally (pdf-parse for PDF, mammoth for DOCX) —
  no LLM needed for extraction.
- `POST /api/jobs/:jobId/candidates/:candidateId/profile` calls the LLM
  once and writes a zod-validated `profile.json` next to the CV.
- LLM provider is fully swappable via 3 env vars.

## 2. Provider Strategy (free LLM, swappable)

Use the OpenAI-compatible `/chat/completions` format — Groq, OpenRouter,
Gemini (via its OpenAI-compat endpoint), Together, and most free tiers
all speak it. Provider = pure config:

`server/.env` (gitignored; update `.env.example` too):

```
LLM_BASE_URL=https://api.groq.com/openai/v1   # or OpenRouter/Gemini-compat URL
LLM_API_KEY=your-free-key
LLM_MODEL=llama-3.3-70b-versatile             # any model the provider offers
```

Rules:
- Free tiers have harsh rate limits → llmClient must queue requests
  (concurrency 1) and retry once on HTTP 429 with backoff from the
  `retry-after` header (fallback 5s).
- config.js: these 3 vars are OPTIONAL at boot (server still starts
  without them), but llmClient throws `LLM_NOT_CONFIGURED` (503) if
  called while unset. Health endpoint reports `llm: configured|missing`.

## 3. Tasks (in order)

### 3.1 Install (server/)

```bash
npm i pdf-parse mammoth
```

(No LLM SDK — llmClient uses plain fetch, Node 20 has it built in.)

### 3.2 Job schema + repo + routes

- `schemas/job.schema.js`:

```js
import { z } from 'zod';
export const JobSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(10),   // the JD text
  createdAt: z.string(),
  status: z.enum(['open', 'closed']).default('open'),
});
```

- `repositories/jobsRepo.js`: `create`, `getById`, `list` — JSON at
  `storage/jobs/{jobId}/job.json` via the existing jsonStore/atomic write.
- `routes/jobs.js`: `POST /api/jobs` (validate body with zod),
  `GET /api/jobs`, `GET /api/jobs/:jobId` (404 JSON error if missing).
- Migrate CV upload: route becomes `POST /api/jobs/:jobId/cvs`; cvRepo
  now stores under `storage/jobs/{jobId}/candidates/{candidateId}/`.
  The route must 404 if the jobId doesn't exist. Remove the `unassigned/`
  path from step 1 (delete dead code; no data migration needed).

### 3.3 Local text extraction — `services/cvTextService.js`

```js
// extractText({ jobId, candidateId }) -> { text, meta }
// - reads meta.json to find storedAs + mimetype
// - pdf  -> pdf-parse ; docx -> mammoth.extractRawText
// - normalize: collapse >2 blank lines, trim, cap at 20_000 chars
//   (append marker "[TRUNCATED]" if cut)
// - throws EMPTY_CV (422) if extracted text < 200 chars — likely a
//   scanned/image PDF; message tells the user OCR is not supported in MVP
// - caches result to cv-text.txt in the candidate dir (plain fs via repo)
```

### 3.4 LLM client — `services/llmClient.js`

The ONLY file that talks to the provider.

```js
// complete({ system, user, maxTokens = 1500 }) -> string (assistant text)
// - POST `${LLM_BASE_URL}/chat/completions` with Authorization: Bearer
// - body: { model, messages:[{role:'system',...},{role:'user',...}],
//           temperature: 0, max_tokens }
// - in-process queue: only 1 request in flight (free-tier rate limits)
// - on 429: wait retry-after (or 5s), retry ONCE, then throw LLM_RATE_LIMITED (429)
// - on network/5xx: throw LLM_UPSTREAM (502) with provider status in message
// - never log the API key; log model + latency via logger
```

Also: `completeJson({ system, user, schema })`:
1. call `complete` with system prompt demanding RAW JSON only, no fences
2. strip ```json fences defensively → `JSON.parse`
3. `schema.parse(...)`
4. on parse/validation failure: retry ONCE appending the error text to the
   prompt ("Your previous output failed validation: <err>. Return corrected
   raw JSON only."), then throw `LLM_BAD_OUTPUT` (502).

### 3.5 Profile schema — `schemas/profile.schema.js`

```js
import { z } from 'zod';

export const ProfileSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().max(600),
  yearsOfExperience: z.number().nullable(),   // best estimate from dates
  skills: z.array(z.string()).max(40),
  languages: z.array(z.string()),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string().nullable(),          // "YYYY-MM" or null
    endDate: z.string().nullable(),            // null = present
    highlights: z.array(z.string()).max(6),    // verbatim-ish achievements
  })).max(15),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().nullable(),
    year: z.string().nullable(),
  })).max(10),
  flags: z.array(z.object({                    // things worth probing later
    type: z.enum(['gap', 'job_hopping', 'unverified_skill', 'other']),
    note: z.string(),
  })).max(10),
});
```

`flags` is deliberate: it feeds the Interview Kit in step 5. The prompt
must instruct: no invented data — anything absent from the CV is null/[];
`unverified_skill` = listed in skills section but appearing in zero
experience highlights.

### 3.6 Prompt — `prompts/extractProfile.js`

A template function `(cvText) => ({ system, user })`.
- system: role ("expert technical recruiter assistant"), output contract
  (raw JSON matching the schema, field-by-field description), the
  no-invention rule, and: CV may be Vietnamese, English, or mixed —
  keep original language of names/companies, write `summary` in the
  CV's dominant language.
- user: the CV text.

### 3.7 Profile service + route

- `services/profileService.js`: `generate({ jobId, candidateId })` →
  ensure cv text (3.3) → `completeJson` with ProfileSchema → write
  `profile.json` (atomic) → return it. If `profile.json` already exists,
  return it unless `?force=true`.
- Routes:
  - `POST /api/jobs/:jobId/candidates/:candidateId/profile` (+`?force=true`)
  - `GET  /api/jobs/:jobId/candidates/:candidateId/profile` (404 if absent)
  - `GET  /api/jobs/:jobId/candidates` → list of `{ meta, hasProfile }`

## 4. Verification Checklist (Definition of Done)

- [ ] Server boots WITHOUT the 3 LLM env vars; `/api/health` shows
      `"llm":"missing"`. With vars set, shows `"llm":"configured"`.
- [ ] `POST /api/jobs` with a real JD → 201; `job.json` on disk.
- [ ] `POST /api/jobs/<realId>/cvs` with sample.pdf → 201; file lands in
      `storage/jobs/<id>/candidates/<cid>/`. Upload to fake jobId → 404.
- [ ] With LLM unset: POST profile → 503 `LLM_NOT_CONFIGURED`, no crash.
- [ ] With LLM set: POST profile on a real CV → 201; `profile.json` on
      disk, passes `ProfileSchema.parse` when re-read.
- [ ] Vietnamese-language CV → profile fields populated, summary in
      Vietnamese, no invented email/phone.
- [ ] A CV listing a skill never mentioned in any job highlight → that
      skill appears in `flags` as `unverified_skill`.
- [ ] Re-POST without `?force` → returns cached profile, NO new LLM call
      (verify via logs). With `?force=true` → regenerates.
- [ ] Text/near-empty PDF → 422 `EMPTY_CV` with helpful message.
- [ ] API key never appears in any log line.
- [ ] Commit: `feat: step2 jobs crud, cv text extraction, llm profile generation`

## 5. Out of Scope

- Evaluation/scoring against JD → step 3.
- Ranking UI / React work → step 4.
- Interview Kit → step 5. Email/notify → step 6.
- OCR for scanned PDFs. Batch/parallel profile generation.