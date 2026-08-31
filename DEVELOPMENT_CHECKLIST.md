# DEVELOPMENT_CHECKLIST.md

Converts DEVELOPMENT_PLAN.md's 10 stages into checkable tasks. Checked
only when actually implemented **and** tested — see TEST_PLAN.md.

## Stage 1 — Project Setup
- [x] Frontend project structure (HTML/CSS/JS) — `docs/` (named `docs`,
      not `frontend`, so it can be served directly by GitHub Pages)
- [x] Apps Script project skeleton — `backend/` (Code.gs, appsscript.json)
- [x] Local dev workflow — PHP built-in server via `.claude/launch.json`,
      verified in-browser (desktop + mobile viewport, no console errors)

## Stage 2 — Google Authentication
- [x] Google Sign-In on frontend (code written — `auth.js`)
- [x] Identity token verified in Apps Script (`authStatus`) — `Auth.gs`
- [x] Login state gates all pages (no data before login)
- [x] Logout ends session
- [x] **Real end-to-end test passed** in the project owner's own Chrome:
      Google Sign-In → Apps Script `authStatus` verifies the ID token →
      Dashboard shell shown. (Required deploying with `Execute as: Me` +
      `Who has access: Anyone` — see ADR-008/ADR-009.)

## Stage 3 — Google Sheet Initialization
- [x] First-login Sheet creation (`ReminderItems` / `Settings` / `Logs`) —
      verified end-to-end: real login created a correctly structured Sheet
- [x] Identity → Sheet ID mapping mechanism decided and implemented —
      Script Properties, `SHEET_ID_<email>` (ADR-010)
- [x] Existing user reuses their same Sheet on subsequent logins —
      verified: multiple logout/login cycles, no duplicate Sheet created

## Stage 4 — Apps Script API
- [x] `getRecords` — includes computed Overdue/DueSoon/Upcoming (ADR-007,
      7-day DueSoon window)
- [x] `createRecord` with backend validation
- [x] `updateRecord` (ownership is implicit — file-level isolation, ADR-005)
- [x] `deleteRecord` (ownership is implicit — file-level isolation, ADR-005)
- [x] `renewRecord` — advances `DueDate` per `RecurrenceInterval`
- [x] Error codes wired: `AUTH_REQUIRED`, `INVALID_REQUEST`, `NOT_FOUND`,
      `VALIDATION_ERROR`, `SERVER_ERROR` (`ACCESS_DENIED` unreachable by
      design — see ADR-005, no other user's rows ever exist in this file)
- [x] **Deployed + tested** — real end-to-end test in browser: create,
      delete, and renew (Monthly → DueDate advanced correctly by 1 month)
      all verified against the real Google Sheet

## Stage 5 — Frontend Shell
- [x] Navigation: Login ↔ Dashboard per UI_STRUCTURE.md (List/Detail pages
      not built yet — see Stage 7)
- [x] API client attaches identity token to every request — `api.js`
- [x] Shared loading / empty / error state components — verified live

## Stage 6 — Dashboard
- [x] Fetch + group items (Overdue / DueSoon / Upcoming) — `dashboard.js`,
      verified live with a real recurring item
- [x] Quick-add entry point — `+ Add Reminder` button

## Stage 7 — CRUD Functions
- [x] ~~Reminder List (standalone page)~~ — intentionally dropped, see
      ADR-012; Dashboard is the list. Search/filter still pending (Stage 9)
- [x] ~~Reminder Detail (standalone page)~~ — intentionally dropped, see
      ADR-012; actions live inline on the Dashboard card instead
- [x] Add Form (matches DATA_STRUCTURE.md fields) — verified live
- [x] Edit Form — shares the Add modal (`Forms.openEdit`), verified live:
      pre-fills existing values, saves via `updateRecord`
- [x] Delete with confirmation — verified live (`confirm()` dialog)
- [x] Mark as Renewed (recurring items) — verified live (Monthly tested,
      advances DueDate correctly)
- [x] Mark as Done (one-off items) — verified live: sets `isDone`, item
      drops off the Dashboard (Dashboard filters out done items)

## Stage 8 — Security Hardening
- [x] Every action re-verified against SECURITY.md — code review pass,
      all CRUD actions start from `resolveUserContext(token)`, no path
      trusts frontend-supplied identity or Sheet ID
- [x] Confirm no action trusts a frontend-supplied identity/Sheet ID —
      confirmed by code review (see DECISIONS.md review notes)
- [x] Isolation re-checked — live test: forged token → `AUTH_REQUIRED`,
      confirmed unauthenticated requests never reach Sheet data

## Stage 9 — Search / Filter / Settings
- [x] Search by title and notes — verified live
- [x] Filter by category — verified live
- [ ] Settings page (scope still `TBD`)
- [ ] **Performance tuning deferred to the end of Phase 1** — login/refresh
      still feels slow (~5s even after ADR-014 merged the two round trips
      into one). Revisit once all features are done — see PROJECT_STATUS.md.

## Stage 10 — Deployment
- [x] Apps Script deployed as Web App — Execute as Me, Anyone (ADR-008/009)
- [x] Frontend deployed/hosted — GitHub Pages, `docs/` folder, main branch:
      https://fcliaw.github.io/my-secretary/
- [x] Production Google OAuth config confirmed — GitHub Pages origin added
      to Authorized JavaScript origins
- [x] Production smoke test — verified live on the real production URL
      (not localhost): login succeeded, real reminder data loaded,
      correctly grouped into Overdue/Due Soon/Upcoming

## Testing (run alongside each stage, per TEST_PLAN.md)
- [ ] Authentication tests
- [ ] CRUD tests (happy + failure paths)
- [ ] Renewal tests (Monthly/Quarterly/Yearly/One-off/Invalid)
- [ ] User isolation tests
- [ ] Error tests
- [ ] Mobile/responsive tests
