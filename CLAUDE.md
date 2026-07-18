# CLAUDE.md — HireKit (AI Recruiting Copilot)

> This file defines the conventions and context for AI-assisted development.
> Read this BEFORE writing any code. All code must follow these rules.

## 1. Project Overview

HireKit is a hackathon MVP: an AI hiring copilot that scans CVs, builds
structured profiles, evaluates candidates against a Job Description (JD)
with evidence-based scoring, generates a personalized Interview Kit, and
notifies both HR and candidates.

**Core principle: AI assists, human decides.** The AI never rejects a
candidate automatically — it produces a ranked shortlist with evidence
that HR reviews and adjusts.

## 2. Tech Stack

| Layer      | Choice                              | Notes                              |
|------------|--------------------------------------|------------------------------------|
| Backend    | Node.js 20 LTS + Express             | ES Modules (`"type": "module"`)    |
| Frontend   | React 18 + Vite                      | Functional components + hooks only |
| Styling    | Tailwind CSS                         | No inline styles, no CSS files per component |
| AI         | Anthropic API (claude-sonnet)        | All prompts live in `/server/src/prompts/` |
| Storage    | Local filesystem (MVP)               | See `step1.md` — JSON + uploaded files on disk |
| Validation | zod                                  | Validate ALL external input (API bodies, LLM JSON output) |

No database in MVP. Storage is file-based (see Section 5). Design storage
access behind a repository layer so a DB can replace it later without
touching business logic.

## 3. Repository Layout

```
hirekit/
├── CLAUDE.md
├── docs/                  # step1.md, step2.md, ... build plan
├── server/
│   ├── src/
│   │   ├── index.js       # Express bootstrap only — no logic here
│   │   ├── routes/        # HTTP layer: parse req, call service, send res
│   │   ├── services/      # Business logic (cvParser, evaluator, interviewKit, notifier)
│   │   ├── repositories/  # ALL filesystem/storage access goes through here
│   │   ├── prompts/       # LLM prompt templates, one file per prompt
│   │   ├── schemas/       # zod schemas (candidateProfile, evaluation, ...)
│   │   └── lib/           # small pure utilities
│   └── storage/           # runtime data (gitignored) — created by step1
└── client/
    └── src/
        ├── api/           # fetch wrappers, one file per resource
        ├── components/    # dumb/presentational components
        ├── features/      # smart components grouped by feature (upload, ranking, interviewKit)
        ├── hooks/
        └── pages/
```

## 4. Coding Conventions

### General
- Language: JavaScript (ESM). No TypeScript in MVP, but ALL data shapes
  must have a zod schema in `server/src/schemas/` — schemas are the source
  of truth for data structure.
- Naming: `camelCase` for variables/functions, `PascalCase` for React
  components and zod schemas, `kebab-case` for file names on the server,
  `PascalCase.jsx` for component files.
- Functions small and pure where possible. A route handler must be ≤ 20
  lines: parse → validate → call service → respond.
- Errors: never swallow. Services throw typed errors
  (`AppError(code, message, httpStatus)`); a single Express error
  middleware maps them to JSON responses `{ error: { code, message } }`.
- Async: `async/await` only. No `.then()` chains, no callbacks.
- No `console.log` in committed code — use the tiny logger in
  `lib/logger.js` (`logger.info/warn/error`).

### LLM calls (critical)
- Every LLM call goes through `services/llmClient.js` — never call fetch
  to the API directly from other files.
- Prompts are template functions in `prompts/`, never inline strings.
- LLM output that must be JSON: prompt explicitly demands raw JSON (no
  markdown fences), then `stripFences() → JSON.parse → zodSchema.parse`.
  If parsing fails, retry once with the error appended, then throw.
- Every evaluation score MUST carry `evidence` (quoted from the CV) —
  reject LLM output that scores without evidence.

### React
- Functional components + hooks only. No class components.
- Server state via a thin `useApi` hook (or React Query if time allows);
  never fetch inside `useEffect` scattered across components.
- Components in `components/` receive data via props only (no fetching).
  Fetching/state lives in `features/` or `pages/`.
- No HTML `<form>` submit-reload patterns — controlled inputs + onClick.

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- One logical change per commit. Commit after each step in `docs/stepN.md`
  is completed and verified.

## 5. Storage Rules (MVP — local filesystem)

- Root: `server/storage/` (gitignored, auto-created on boot).
- Uploaded CVs: `storage/uploads/{jobId}/{candidateId}.{ext}` (original file kept).
- Structured data: JSON files, one per entity:
  - `storage/jobs/{jobId}/job.json`
  - `storage/jobs/{jobId}/candidates/{candidateId}/profile.json`
  - `storage/jobs/{jobId}/candidates/{candidateId}/evaluation.json`
  - `storage/jobs/{jobId}/candidates/{candidateId}/interview-kit.json`
- IDs: `nanoid(10)`.
- All reads/writes go through `repositories/` — atomic write pattern
  (write to `.tmp` then rename) to avoid corrupted JSON.
- Never store secrets in storage/. API keys via `.env` (gitignored),
  loaded with `dotenv`, accessed only in `lib/config.js`.

## 6. Definition of Done (per step)

A step is done when:
1. Code runs with `npm run dev` (server) / `npm run dev` (client) with no errors.
2. The step's verification checklist in `docs/stepN.md` passes.
3. New data shapes have zod schemas.
4. No lint errors (`npm run lint`).
5. Committed with a conventional commit message referencing the step.

## 7. Build Order

1. `docs/step1.md` — Local storage foundation (folders, repositories, config)
2. `docs/step2.md` — CV upload + parsing to structured profile
3. `docs/step3.md` — Evidence-based evaluation against JD
4. `docs/step4.md` — Ranking UI + HR adjustments
5. `docs/step5.md` — Interview Kit generation
6. `docs/step6.md` — Notifications (HR + candidate feedback email)

Do not start step N+1 until step N's Definition of Done passes.
