Project Status: Live, actively enhanced past Phase 1

Current Phase:
Phase 1 (all 10 stages) complete, plus a batch of Post-Phase-1
enhancements. Live at https://fcliaw.github.io/my-secretary/

Completed — Phase 1:
- All planning docs (ROADMAP through DEVELOPMENT_CHECKLIST)
- Stage 1 — Project Setup
- Stage 2 — Google Authentication
- Stage 3 — Google Sheet Initialization
- Stage 4 — Apps Script API
- Stage 5 — Frontend Shell
- Stage 6 — Dashboard
- Stage 7 — CRUD Functions (Add, Edit, Delete, Renew, Mark as Done)
- Stage 8 — Security Hardening
- Stage 9 — Search / Filter / Settings (category management)
- Stage 10 — Deployment: Apps Script Web App + GitHub Pages

Completed — Post-Phase-1 enhancements (see DEVELOPMENT_CHECKLIST.md for
the full list, DECISIONS.md ADR-015 onward for the "why"):
- 6-bucket Dashboard grouping (Overdue/Today/This Week/Next Week/This
  Month/Later) with clickable stat tiles
- Amount masking (privacy) with a global show/hide toggle
- CSV import (downloadable template + parser)
- User-editable Category list via Settings (add/rename/delete, blocked
  while in use)
- PWA installability (manifest + Service Worker app-shell cache)
- Daily email reminders (Overdue/Today), with a Settings on/off toggle
- Report screen: full reminder list (including Done items) with
  search + category filter, plus this month's activity from Logs
- authStatus performance: combined the category-list and email-
  preference reads into a single Settings-sheet read (was 2)

Repository: https://github.com/fcliaw/my-secretary (public — see
DECISIONS.md for why public code doesn't weaken security here)

Known open items (not blockers):
- Login/refresh still has a real network "floor" (Google identity
  verification + opening the Spreadsheet) — reduced but not eliminated;
  project owner is deciding whether further tuning is worth it
- True Web Push notifications not attempted — Email covers the same need
  for now (ADR-021); Web Push needs manual crypto work Apps Script has no
  library for

Next (optional, nothing here blocks normal use):
- Decide whether to pursue Web Push, or stay with Email
- Phase 3 (ROADMAP.md): possible Firebase migration, only if scale demands it
- ADR-011 revisit: per-user Drive-owned Sheets, only if opened to a
  second real user
