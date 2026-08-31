Project Status: Live (Phase 1 complete)

Current Phase:
Phase 1 — all 10 stages complete and verified. Live at
https://fcliaw.github.io/my-secretary/

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
- Stage 2 — Google Authentication
- Stage 3 — Google Sheet Initialization
- Stage 4 — Apps Script API
- Stage 5 — Frontend Shell
- Stage 6 — Dashboard
- Stage 7 — CRUD Functions (Add, Edit, Delete, Renew, Mark as Done)
- Stage 8 — Security Hardening
- Stage 9 — Search / Filter (Settings page content still TBD, deferred)
- Stage 10 — Deployment: Apps Script Web App + frontend on GitHub Pages
  (`docs/` folder), production login verified live

Repository: https://github.com/fcliaw/my-secretary (public — see
DECISIONS.md for why public code doesn't weaken security here)

Known open items (not blockers):
- Settings page has no content yet (scope still TBD)
- Login/refresh performance — noticeably slow (~5s even after ADR-014's
  round-trip merge); project owner deferred deeper tuning to later
- GSI_LOGGER "origin not allowed" console warning seen during earlier
  localhost testing — should now be resolved since the production origin
  was added to Google Cloud Console; re-check on next login test

Next (optional, not required for Phase 1 to be "done"):
- Decide Settings page scope, or leave deferred indefinitely
- Performance tuning pass
- Phase 2 (ROADMAP.md): active notifications
- Phase 3 (ROADMAP.md): possible Firebase migration
- ADR-011 revisit: per-user Drive-owned Sheets, only if opened to a
  second real user
