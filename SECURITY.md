# SECURITY.md

## Authentication
Google Account authentication only. No app-managed passwords.

## Authorization
Users can only access their own reminder data. Authorization is derived
entirely from the verified Google identity on each request — never from a
user ID, email, or Sheet ID sent by the frontend.

## Backend Validation
Apps Script re-validates every request: identity token, required fields,
field types/formats — even though the frontend also validates. The
frontend's validation is a UX convenience, not a security control.

## User Isolation
One authenticated identity → one Google Sheet. Apps Script never accepts a
Sheet ID as request input, and never allows one user's verified identity to
resolve to another user's Sheet. See DATA_STRUCTURE.md 4.3 for why this is
enforced at the file level, not by row-filtering.

## Input Validation
Every field is validated again on the backend before being written:
`Category` against the known set, `DueDate` as a real date, `Amount` as
non-negative numeric (see DATA_STRUCTURE.md 4.2). Malformed input is
rejected with `VALIDATION_ERROR`, not silently coerced.

## Sensitive Data
No credentials, API keys, or tokens are stored in frontend code. Anything
sensitive (e.g. a lookup Sheet ID, if one exists) is kept in Apps Script
project properties, not in client-visible source.

## Error Messages
User-facing errors are plain-language and generic (e.g. "We couldn't save
that, please try again"). Internal details (stack traces, Sheet
names/IDs, raw exception text) are never shown to the user — they go to
server-side logs only.

## Logging
- **Do log:** timestamp, action type, item ID, success/failure (see
  DATA_STRUCTURE.md `Logs` sheet) — enough to debug a failed write.
- **Do not log:** the identity token itself, or full request/response
  bodies containing personal data (amounts, notes) in any log destination
  outside the user's own Sheet.
