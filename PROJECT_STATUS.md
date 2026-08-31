Project Status: In Development

Current Phase:
Phase 1 — Stages 1-8 complete and verified

Completed:
- ROADMAP.md
- REQUIREMENTS.md
- ARCHITECTURE.md
- DATA_STRUCTURE.md
- API.md
- UI_STRUCTURE.md
- SECURITY.md
- DEVELOPMENT_PLAN.md
- TEST_PLAN.md
- PROJECT_RULES.md
- DECISIONS.md
- DEVELOPMENT_CHECKLIST.md
- Stage 1 — Project Setup
- Stage 2 — Google Authentication (real end-to-end test passed)
- Stage 3 — Google Sheet Initialization (real end-to-end test passed)
- Stage 4 — Apps Script API (create/delete/renew/update all verified live)
- Stage 5 — Frontend Shell
- Stage 6 — Dashboard
- Stage 7 — CRUD Functions: Add, Edit, Delete, Renew, Mark as Done all
  built and verified live. Standalone List/Detail pages intentionally
  dropped in favor of inline actions on the Dashboard (ADR-012).
- Stage 8 — Security Hardening: code review against SECURITY.md found no
  issues (identity always re-verified server-side, no path trusts
  frontend-supplied identity/Sheet ID); live test confirmed a forged
  token is rejected with AUTH_REQUIRED before touching any Sheet data.

Known minor issue (not blocking): browser console shows a
`[GSI_LOGGER] origin not allowed for client ID` warning during login.
Login itself works and has been verified repeatedly, so this is cosmetic
for now — worth revisiting when moving off localhost to a real domain
(Stage 10), since the real deployment URL will need to be added to
Authorized JavaScript origins in Google Cloud Console regardless.

Next:
- Stage 9 — Search / Filter / Settings
