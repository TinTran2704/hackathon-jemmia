# Step 6 — Notifications (HR digest + candidate feedback)

> Goal: close the loop. (A) HR gets a shortlist digest per job; (B) rejected
> candidates get a polite, constructive feedback email generated from their
> own evaluation. DEMO MODE by default: emails are rendered and stored, not
> sent — a mailbox UI shows them. Real SMTP is optional behind env vars.
> Estimated effort: 1–2 hours.

## 1. Design

- `services/notificationService.js` + `repositories/outboxRepo.js`.
- Every "sent" message is a JSON file in `storage/jobs/{jobId}/outbox/
  {messageId}.json`: `{ id, type: 'hr_digest'|'candidate_feedback',
  to, subject, bodyText, candidateId?, createdAt, delivery: 'demo'|'smtp',
  status: 'stored'|'sent'|'failed' }`.
- Delivery driver chosen by env: if `SMTP_URL` is set (nodemailer,
  `npm i nodemailer`), actually send AND store; otherwise store only
  (demo mode). Health reports `mail: demo|smtp`.
- LLM is used ONLY for candidate feedback wording. HR digest is pure
  template code (no LLM — it's structured data we already have).

## 2. HR digest (no LLM)

- `POST /api/jobs/:jobId/notify/hr` body `{ to: email }`:
  - builds from ranking data: top N (default 5) with score, recommendation,
    topStrength, topConcern; pending count; knockout-failed count.
  - plain-text body, tidy monospace-friendly layout. Subject:
    `[HireKit] Shortlist for "<job title>" — X candidates ranked`.

## 3. Candidate feedback (LLM, guarded)

- `POST /api/jobs/:jobId/candidates/:candidateId/notify/feedback`
  body `{ to?: email }` (default: profile.email; 422 NO_EMAIL if none).
- Guard: only allowed when recommendation is `weak_match` or
  `reject_review` AND HR triggers it explicitly (there is NO bulk-send —
  one candidate per call, by design; this is a human decision).
- Prompt `prompts/candidateFeedback.js` — input: profile summary,
  evaluation concerns, and the 2–3 lowest-scoring HIGH-WEIGHT criteria.
  Rules:
  - warm, respectful, in the CV's dominant language; thank them genuinely.
  - 2–3 concrete improvement suggestions derived from the low-score
    criteria (e.g. "showcase a project using X"), NEVER the raw scores,
    NEVER internal wording like "knockout", "flags", "reject_review".
  - no false hope ("we'll keep your CV" only as a real statement about
    the talent pool), no legal-risk phrasing (nothing about protected
    characteristics, age, gender, etc.).
  - output: raw JSON `{ subject, bodyText }` (zod-validated).
- Service validates output contains none of the internal terms
  (blocklist check: score numbers pattern, "knockout", "reject") —
  fail → one repair retry → error, never send.

## 4. UI

- Job detail gains an **Outbox** tab: list stored messages (type badge,
  to, subject, createdAt, delivery status) → click to read full body.
- Ranking card (weak/reject only): "Draft feedback email" → calls the
  endpoint → toast + link to Outbox. HR digest button on the Ranking tab
  header with a small email input.

## 5. Verification Checklist

- [ ] Demo mode (no SMTP_URL): both endpoints → 201, JSON in outbox/,
      visible in Outbox tab, status "stored".
- [ ] HR digest content matches ranking (spot-check top 3) and makes
      ZERO LLM calls (logs).
- [ ] Feedback for a reject_review candidate in Vietnamese CV → email in
      Vietnamese, suggestions map to actual low-score high-weight criteria,
      contains no internal terms (grep the body for "knockout", "score",
      "reject" — clean).
- [ ] Feedback attempt on a strong_match candidate → 403 guard error.
- [ ] Candidate without email → 422 NO_EMAIL.
- [ ] (Optional, only if SMTP_URL provided) real send works; failure →
      status "failed", message still stored, server doesn't crash.
- [ ] Commit: `feat: step6 hr digest and candidate feedback notifications`

## Out of Scope
- Scheduling/auto-send, bulk feedback, email threading, unsubscribe
  handling. Talent-pool re-matching (post-hackathon idea).
