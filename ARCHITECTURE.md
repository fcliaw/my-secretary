# ARCHITECTURE.md

## Overview

```text
                    User
                     │
                     ▼
              Frontend Website
                     │
                     ▼
             Google Authentication
                     │
                     ▼
             Google Apps Script
                     │
                     ▼
              User's Google Sheet
```

## 3.1 Frontend

Responsibilities:
- Renders Dashboard, list, add/edit form, settings.
- Client-side form validation (required fields, date format) — a
  convenience for the user, not a security boundary.
- Sends API requests to Apps Script with the user's auth token attached.
- Displays API responses (success data, or plain-language error message).
- Tracks login state (logged in / logged out) and redirects accordingly.
- Shows loading / empty / error states for every data view.

## 3.2 Authentication

- Google Account handles authentication (proving "who is this person").
- The frontend obtains an identity token from Google Sign-In and sends it
  with each API request.
- **Identity vs. Authorization:** the token proves identity; it does not by
  itself grant access to a specific Sheet. Apps Script re-derives the
  user's email from the verified token and looks up *their* Sheet mapping
  — it never accepts a Sheet ID or user ID from the frontend as the source
  of truth.
- **User isolation** is enforced entirely server-side, at the point where
  Apps Script resolves "authenticated email → owned Sheet ID."

## 3.3 Google Apps Script (Backend/API layer)

Responsibilities:
- Receive requests (as a web app `doGet`/`doPost`, action-based).
- Validate the request shape (required fields present, correct types).
- Verify the caller's identity from the Google token — reject anything
  that fails verification with `AUTH_REQUIRED` before touching any Sheet.
- Resolve the correct Sheet for that verified identity.
- Perform business logic (create/read/update/delete reminder items,
  advance due dates on renewal).
- Return a consistent JSON response (see API.md).
- Catch and translate errors into the defined error codes — never leak a
  raw exception to the frontend.

## 3.4 Google Sheet (Phase 1 data store)

- One user → one Spreadsheet (own file, own data, not a shared workbook).
- Access happens only through Apps Script using the script's own
  permissions — the frontend never talks to the Sheets API directly.
- Data structure: see DATA_STRUCTURE.md.
- Limitations (accepted for Phase 1, personal-scale use):
  - Row-based storage — no relational joins, no transactions.
  - Practical ceiling of low-thousands of rows before performance/quota
    issues (Apps Script execution time, Sheets API read limits).
  - Concurrent-write conflicts are unlikely at single/family-user scale
    but not fully guarded against.

## 3.5 Request Flow (example: view Dashboard)

```text
User Login
    ↓
Google Authentication
    ↓
Frontend receives authenticated identity token
    ↓
Frontend calls Apps Script: { action: "getRecords" } + token
    ↓
Apps Script verifies token → resolves user's email
    ↓
Apps Script looks up that email's Sheet ID
    ↓
Apps Script reads reminder rows from that Sheet
    ↓
JSON response returned to frontend
    ↓
Dashboard renders items sorted by due date
```

## 3.6 Security Architecture

- **Authentication:** Google Account, verified token on every request.
- **Authorization:** derived server-side from verified identity, not from
  any frontend-supplied ID.
- **User isolation:** one authenticated identity maps to exactly one
  Sheet; Apps Script never accepts a Sheet ID as request input.
- **Backend validation:** every field re-validated in Apps Script, even
  though the frontend also validates.
- **HTTPS:** all traffic over HTTPS (Apps Script web app deployments and
  Google Sign-In both enforce this by default).
- **Sensitive configuration:** no API keys/secrets are placed in frontend
  code; anything sensitive (e.g. a lookup Sheet ID) lives in Apps Script
  project properties.
- **Error handling:** internal errors are logged server-side (see
  SECURITY.md "Logging") and returned to the frontend only as a generic,
  plain-language message plus an error code.

> Frontend input must never be treated as proof of user identity.

## 3.7 Future Firebase Migration (not built now)

Current (Phase 1):
```text
Frontend
   ↓
Apps Script
   ↓
Google Sheet
```

Possible future (Phase 3, if scale requires it):
```text
Frontend
   ↓
Backend/API
   ↓
Firebase
```

To keep this migration possible without a frontend rewrite, Phase 1 keeps
the frontend talking only to a defined API contract (API.md), never
directly to Sheets — swapping the backend's storage from Sheets to
Firebase later would change Apps Script's internals, not the frontend.
