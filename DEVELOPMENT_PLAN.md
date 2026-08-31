# DEVELOPMENT_PLAN.md

## Stage 1 — Project Setup
- **Objective:** working skeleton repo.
- **Tasks:** create frontend project structure; create Apps Script
  project; wire up local dev/deploy workflow.
- **Expected result:** empty pages deploy and load.
- **Dependencies:** none.
- **Testing:** app loads without errors.

## Stage 2 — Google Authentication
- **Objective:** working login/logout.
- **Tasks:** integrate Google Sign-In on frontend; verify identity token
  in Apps Script (`authStatus` action).
- **Expected result:** unauthenticated users see Login only; authenticated
  users reach Dashboard.
- **Dependencies:** Stage 1.
- **Testing:** login, logout, reload while logged in, access while logged
  out (see TEST_PLAN.md Authentication Tests).

## Stage 3 — Google Sheet Initialization
- **Objective:** first-login Sheet creation per user.
- **Tasks:** on first authenticated request with no mapped Sheet, create
  one with `ReminderItems` / `Settings` / `Logs` tabs and headers; store
  the identity→Sheet mapping.
- **Expected result:** a new user gets a correctly structured Sheet
  automatically.
- **Dependencies:** Stage 2.
- **Testing:** first login creates Sheet; second login reuses same Sheet.

## Stage 4 — Apps Script API
- **Objective:** full CRUD API per API.md.
- **Tasks:** implement `getRecords`, `createRecord`, `updateRecord`,
  `deleteRecord`, `renewRecord`; validation; error codes.
- **Expected result:** all actions work against a test Sheet.
- **Dependencies:** Stage 3.
- **Testing:** API Tests in TEST_PLAN.md.

## Stage 5 — Frontend Core
- **Objective:** shared frontend shell.
- **Tasks:** routing/navigation per UI_STRUCTURE.md 6.3; API client with
  token attachment; shared loading/empty/error components.
- **Expected result:** navigable shell with no real data yet.
- **Dependencies:** Stage 4.
- **Testing:** manual click-through of navigation.

## Stage 6 — Dashboard
- **Objective:** working Dashboard page.
- **Tasks:** fetch + group items into Due Soon / Overdue; quick-add entry
  point.
- **Expected result:** Dashboard reflects real Sheet data.
- **Dependencies:** Stage 5.
- **Testing:** items with varying due dates render in correct groups.

## Stage 7 — CRUD Functions
- **Objective:** full item lifecycle from the UI.
- **Tasks:** Reminder List, Detail, Add/Edit Form, Delete confirmation,
  Mark as Renewed.
- **Expected result:** user can fully manage reminder items end-to-end.
- **Dependencies:** Stage 6.
- **Testing:** Data Tests in TEST_PLAN.md.

## Stage 8 — Security
- **Objective:** verify isolation and validation hold under real use.
- **Tasks:** review every action against SECURITY.md; add any missing
  server-side checks found.
- **Expected result:** no action trusts frontend-supplied identity;
  isolation confirmed.
- **Dependencies:** Stage 7.
- **Testing:** User Isolation Tests in TEST_PLAN.md.

## Stage 9 — Testing
- **Objective:** full pass of TEST_PLAN.md.
- **Tasks:** run Authentication, Data, Isolation, UI, and API test sets;
  fix findings.
- **Expected result:** all test categories pass.
- **Dependencies:** Stage 8.
- **Testing:** itself.

## Stage 10 — Deployment
- **Objective:** live, usable app.
- **Tasks:** deploy Apps Script as Web App; deploy/host frontend; confirm
  production Google OAuth config.
- **Expected result:** app usable at a real URL by the actual user.
- **Dependencies:** Stage 9.
- **Testing:** production smoke test (login → add item → see it on
  Dashboard).
