# Prompt — Step 1 (paste vào Claude Code / coding agent)

## A. Setup trước khi chạy (làm 1 lần, thủ công)

Tạo file `.claude/settings.local.json` trong thư mục project (file này
gitignored theo mặc định, chỉ áp dụng cho repo này — KHÔNG đặt ở
`~/.claude/settings.json` để tránh bypass mọi project khác):

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": [
      "Bash(rm -rf /*)",
      "Bash(sudo:*)",
      "Read(.env)",
      "Read(./**/.env)"
    ]
  }
}
```

Sau đó khởi động: `claude` (hoặc `claude --dangerously-skip-permissions`
nếu setting chưa ăn — flag CLI là tương đương). Lần đầu sẽ có 1 dialog
cảnh báo, accept 1 lần là xong.

> ⚠️ Lưu ý: bypass mode nghĩa là agent chạy mọi lệnh không hỏi. Chỉ dùng
> trong repo hackathon này, và luôn commit thường xuyên để git là nút undo.
> Deny-list ở trên chặn sẵn các lệnh phá hoại và không cho đọc `.env`.

---

## B. Prompt chính (copy toàn bộ phần dưới đây)

```
You are implementing Step 1 of the HireKit project.

## Context files — read these FIRST, in this order
1. ./CLAUDE.md        — project conventions. Everything you write must comply.
2. ./docs/step1.md    — the full spec for this step, including code samples
                        and the verification checklist.

## Your task
Implement Step 1 exactly as specified in docs/step1.md:
- Scaffold the repo (server + client) per the layout in CLAUDE.md §3.
- Implement the local storage foundation: config, storage bootstrap with
  idempotent directory creation, atomic JSON helpers, cvRepo, the CV
  upload route, and the Express bootstrap with the single error handler.
- Add the npm scripts and .gitignore entries listed in the spec.

## Hard constraints
- NO external API calls of any kind in this step. No LLM, no email,
  nothing leaves localhost. Do not install any LLM SDK.
- Do not implement anything listed in step1.md §5 "Out of Scope"
  (no CV parsing, no jobs CRUD, no React UI work).
- The code samples in step1.md are the reference implementation — follow
  them; only deviate to fix a genuine bug, and note any deviation in your
  final summary.
- All filesystem access must live in repositories/ (CLAUDE.md §4).

## Verification (mandatory before you declare done)
Work through docs/step1.md §4 "Verification Checklist" yourself:
- Start the server and hit /api/health with curl.
- Create a small sample.pdf (any valid PDF) and test the upload happy path.
- Test the failure cases: wrong file type (.txt) and oversized file —
  server must return the JSON error shape and must not crash.
- Restart the server and confirm uploaded data survives and tmp/ is wiped.
- Run `git status` to confirm storage/ and .env are untracked.

If any check fails, fix and re-run until all pass. Show me the actual
curl outputs, not just claims.

## Finish
- Commit with exactly: feat: step1 project setup + local cv storage
- End with a short summary: files created, checklist results (pass/fail
  per item), and any deviation from the spec with a one-line reason.
- Then STOP. Do not start Step 2.
```