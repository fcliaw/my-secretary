# PROJECT_RULES.md

This file is the instruction file for AI coding tools (e.g. Claude Code)
working on this project.

## Technology Rules

Phase 1 must use:
```text
Frontend
    HTML
    CSS
    JavaScript
Backend
    Google Apps Script
Database
    Google Sheet
Authentication
    Google Account
```

Do not introduce:
- Firebase
- SQL database
- React
- Vue
- unnecessary frameworks
- unnecessary build systems
- unnecessary third-party services
- active notification channels (Email/WhatsApp/etc. — Phase 2, not now)

...unless explicitly approved later by the project owner.

## Development Rules
1. Keep the application simple.
2. Do not over-engineer.
3. Do not add features that are not requested.
4. Keep frontend and backend responsibilities separated.
5. Keep data access logic centralized in Apps Script.
6. Validate data on the backend, even if the frontend already validated it.
7. Never trust frontend identity information — always re-derive identity
   from the verified Google token server-side.
8. Protect user data isolation — one identity, one Sheet, enforced at the
   file level (see DATA_STRUCTURE.md 4.3).
9. Use clear naming (match the field/action names already used in
   API.md and DATA_STRUCTURE.md — don't invent parallel names).
10. Keep code maintainable.
11. Avoid unnecessary dependencies.
12. Document important decisions in DECISIONS.md.
13. The `Category` field on reminder items is open-ended by design — don't
    hardcode logic that only works for `FixedDeposit`/`SchoolFee`.
