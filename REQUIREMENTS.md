# REQUIREMENTS.md

## 2.1 Project Overview

**What it is:** A personal dashboard that tracks things needing periodic
renewal — Fixed Deposit maturity, children's school fee due dates, and
(later) similar recurring items — so none of them get missed.

**Problem it solves:** These renewal dates currently live scattered across
memory, paper, or bank apps, and are easy to forget. This app puts them all
in one place, sorted by how soon they're due.

**Who uses it:** The project owner (channelsalesautocount@gmail.com) first.
Designed so it can later be opened to other people/families, each seeing
only their own data.

**Main purpose:** Log a renewal item once (what it is, when it's due, how
often it repeats), and see at a glance on a Dashboard what's coming up or
overdue.

## 2.2 User Types

```text
Normal User — logs in with Google, manages their own reminder items
```

No Administrator role in Phase 1 — there's nothing to administer across
users yet (single Sheet per user, no shared data, no moderation need).
If a shared/family-view role is wanted later, that is:
```text
TBD
```

## 2.3 Authentication Requirements

- Login via Google Account (no separate username/password to manage).
- Logout available from any page, ends the session.
- **User identity must come from the authenticated Google session on the
  backend, never from a value the frontend sends.** A request that claims
  "I am user X" is not trusted — the backend re-derives identity from the
  actual authenticated Google session/token on every request.
- Unauthorized access: any request without a valid Google session is
  rejected before touching any Sheet, with an `AUTH_REQUIRED` error (see
  API.md).
- Session handling: relies on Google's own session/token lifecycle: no app
  is expected to build custom session storage in Phase 1.
- Not logged in: user is shown only a Login screen; no app data, not even
  empty states, is rendered before authentication succeeds.

## 2.4 User Data Isolation

Each user must only be able to access their own Google Sheet and their own
reminder data.

```text
User A
    ↓
Sheet A (Fixed Deposit, school fees, ...)

User B
    ↓
Sheet B (Fixed Deposit, school fees, ...)
```

User A must never be able to read, list, or modify User B's Sheet or data,
even by guessing an ID. This is a core security requirement and applies
from Phase 1 even though only one real user exists at launch — the
isolation model must already be correct before a second user is added.

## 2.5 Google Sheet Requirements

- **Identification:** each user's Sheet is located by a mapping from their
  authenticated Google identity to a Sheet ID (exact storage mechanism —
  e.g. a lookup sheet vs. Apps Script user properties — is `TBD`, decided
  in ARCHITECTURE.md/DATA_STRUCTURE.md).
- **Initialization:** on a user's first login, if no Sheet is mapped to
  them yet, the system creates one with the required tabs/headers
  automatically.
- **If the Sheet is missing/deleted later:** system detects this and
  re-initializes or shows a clear recoverable error — it must not crash
  silently or write to the wrong place.
- **Read:** list reminder items for the authenticated user, sorted by due
  date.
- **Create:** append a new reminder item row.
- **Update:** edit an existing reminder item's fields (including marking a
  renewal as done / rolling its due date forward).
- **Delete:** remove a reminder item.
- **Errors:** any Sheet read/write failure returns a structured error (see
  API.md `SERVER_ERROR`) — the user never sees a raw Google API stack
  trace.

## 2.6 Application Features

```text
- Google Login
- Dashboard (upcoming + overdue renewal items)
- View reminder item list
- Add reminder item
- Edit reminder item
- Delete reminder item
- Mark item as renewed (advances due date per its recurrence)
- Search / Filter by category or status
- Settings (TBD — scope not yet defined)
- Logout
```

Active notifications (email/WhatsApp-style alerts) are explicitly **not**
a Phase 1 feature — see ROADMAP.md Phase 2.

## 2.7 Functional Requirements

| ID | Requirement | User Action | Expected System Behavior | Success Condition | Error Condition |
|---|---|---|---|---|---|
| FR-001 | Google Login | Click "Sign in with Google" | Redirects to Google OAuth, returns authenticated session | User lands on Dashboard | Login cancelled/denied → back to Login screen with message |
| FR-002 | Google Logout | Click "Logout" | Ends session | User returned to Login screen | N/A |
| FR-003 | View Dashboard | Load app while logged in | Fetches user's reminder items, groups by due-soon/overdue | Items shown sorted by due date | Sheet unreachable → error state, not blank crash |
| FR-004 | View Reminder List | Navigate to list | Fetches all items for user | Full list rendered | Empty → Empty state shown |
| FR-005 | Create Reminder Item | Fill form, submit | Backend validates, appends row to user's Sheet | New item appears in list/dashboard | Validation fails → inline field errors, nothing written |
| FR-006 | Edit Reminder Item | Open item, change fields, save | Backend validates, updates matching row | Updated values reflected | Item not found/not owned by user → `NOT_FOUND`/`ACCESS_DENIED` |
| FR-007 | Delete Reminder Item | Confirm delete | Backend removes row | Item disappears from list | Item not owned by user → `ACCESS_DENIED` |
| FR-008 | Mark as Renewed | Click "Renewed" on an item | Backend advances due date by the item's recurrence interval | Due date updates, item moves out of "due soon" | Item has no recurrence set → `TBD` behavior |
| FR-009 | Search/Filter | Type in search / pick category | Frontend filters currently loaded list | Matching items shown | No matches → Empty state |

## 2.8 Non-Functional Requirements

- **Security:** identity always re-verified server-side; one user's data
  never reachable by another (see SECURITY.md).
- **Performance:** dashboard loads in a few seconds for a personal-scale
  dataset (tens to low hundreds of rows) — no need to optimize for
  thousands of rows in Phase 1.
- **Reliability:** a failed Sheet write must not leave partial/corrupt
  data — either the row is written correctly or the user sees an error and
  nothing changed.
- **Maintainability:** logic for "which Sheet does this user own" and
  "read/write a reminder item" stays centralized in Apps Script, not
  duplicated per feature.
- **Usability:** designed for a non-technical user — plain labels, no
  jargon, obvious next action on every screen.
- **Responsive design:** usable on both desktop and mobile browser.
- **Browser compatibility:** current versions of Chrome/Edge/Safari;
  no support requirement for legacy browsers.
- **Error handling:** every user-facing error is a plain-language message,
  never a raw exception or stack trace.
