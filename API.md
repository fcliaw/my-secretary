# API.md

## 5.1 API Design

Action-based API over a single Apps Script Web App endpoint, following
Google Apps Script conventions:

```json
{
  "action": "getRecords",
  "token": "<google-identity-token>",
  "payload": { }
}
```

As implemented, the frontend always sends `POST` with a JSON body for
every action (including reads) — this keeps one request path instead of
two, and avoids URL length limits on read filters later. `doGet` still
exists in Apps Script for completeness but isn't used by the frontend.
The identity token is required on every action.

## 5.2 API Actions

| Action | Method | Purpose | Authentication |
|---|---|---|---|
| authStatus | POST | Check identity, resolve/create the user's Sheet, and return the reminder list in the same response (ADR-014) | Yes |
| getRecords | POST | Get the authenticated user's reminder items | Yes |
| createRecord | POST | Create a reminder item | Yes |
| updateRecord | POST | Update a reminder item | Yes |
| deleteRecord | POST | Delete a reminder item | Yes |
| renewRecord | POST | Mark an item renewed, advance DueDate (FR-008) | Yes |

Every action requires authentication — there is no public/anonymous
action in this app.

## 5.3 Request Format

**getRecords**
```json
{ "action": "getRecords", "token": "..." }
```

**createRecord**
```json
{
  "action": "createRecord",
  "token": "...",
  "payload": {
    "category": "FixedDeposit",
    "title": "Maybank FD - Emma",
    "dueDate": "2026-09-15",
    "recurrenceInterval": "Yearly",
    "amount": 10000,
    "notes": ""
  }
}
```

**updateRecord**
```json
{
  "action": "updateRecord",
  "token": "...",
  "payload": { "id": "...", "dueDate": "2026-09-30" }
}
```

**deleteRecord**
```json
{ "action": "deleteRecord", "token": "...", "payload": { "id": "..." } }
```

**renewRecord**
```json
{ "action": "renewRecord", "token": "...", "payload": { "id": "..." } }
```

## 5.4 Response Format

Success:
```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

Error:
```json
{
  "success": false,
  "data": null,
  "message": "Error message"
}
```

- `success`: whether the action completed.
- `data`: the result payload on success (e.g. the created/updated record,
  or the list of records); `null` on error.
- `message`: plain-language message — shown to the user on error, may be
  empty on success.

**getRecords `data.records[]` item shape** (see DATA_STRUCTURE.md 4.2 for
`displayStatus` being calculated, not stored):
```json
{
  "id": "...",
  "category": "FixedDeposit",
  "title": "Maybank FD - Emma",
  "dueDate": "2026-09-15",
  "recurrenceInterval": "Yearly",
  "amount": 10000,
  "notes": "",
  "isDone": false,
  "displayStatus": "ThisWeek"
}
```
`displayStatus` is one of (see ADR-015): `Overdue`, `Today`, `ThisWeek`
(due in 1-7 days), `NextWeek` (8-14 days), `ThisMonth` (15-30 days), or
`Later` (30+ days).

## 5.5 Error Codes

```text
AUTH_REQUIRED     — missing or invalid identity token
ACCESS_DENIED     — token valid, but the requested record isn't this user's
INVALID_REQUEST   — malformed action/payload
NOT_FOUND         — record ID doesn't exist
VALIDATION_ERROR  — a field failed validation (see DATA_STRUCTURE.md 4.2)
SERVER_ERROR      — unexpected failure (Sheet unreachable, etc.)
```
