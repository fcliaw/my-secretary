# ROADMAP — MySecretary

## What This Is

A personal reminder/dashboard app that tracks things that need periodic
**renewal** — Fixed Deposit maturity, children's school fees, and (later)
similar recurring items such as insurance or licenses — so they don't get
missed. Login with Google Account, data stored in the user's own Google
Sheet, viewed on a simple Dashboard.

## Phase 1 (this build)

```text
Frontend Website
        ↓
Google Account Login
        ↓
Google Apps Script
        ↓
User's Google Sheet
```

- Google Login
- Dashboard showing upcoming/overdue renewal items
- Generic "Reminder Item" data model (not hardcoded to just FD/tuition —
  category field so Insurance, License, Subscription etc. can be added later
  without a redesign)
- Add / Edit / Delete reminder items
- No active push notification yet (Email/WhatsApp-style alerts are a
  **future** phase, not Phase 1 — user views the Dashboard to see what's
  coming up)

## User Model

- Phase 1 build target: works correctly for a single user first.
- Designed so it can later be opened up to multiple people/families, each
  isolated to their own Google Sheet (one user → one Sheet, no shared
  access) — this shapes the auth/isolation design now even though only one
  person uses it at first.
- Phase 1 as built: every user's Sheet lives in the **project owner's**
  Google Drive (ADR-011). Before opening the app to a second real person,
  revisit ADR-011 — moving each user's Sheet into their own Drive needs an
  additional Google Drive authorization step and a backend rework.

## Phase 2 (future, not now)

- Active notifications (Email via Apps Script `MailApp`, and/or a
  WhatsApp-style channel — mechanism TBD)

## Phase 3 (future, not now)

- Possible migration from Google Sheets to Firebase if scale/complexity
  requires it. Phase 1 architecture should avoid tight coupling to Sheets
  so this migration stays possible.
