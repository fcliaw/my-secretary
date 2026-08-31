# TEST_PLAN.md

## Authentication Tests
- Login with a valid Google account succeeds and reaches Dashboard.
- Logout ends the session and returns to Login.
- Logging in with a different Google account starts a separate,
  independent session/Sheet (see Isolation Tests).
- Accessing any app URL/API action while logged out is rejected with
  `AUTH_REQUIRED`, not shown any data.

## Data Tests
- Create a reminder item → appears in list and Dashboard.
- Read: list reflects all created items.
- Update: edited fields persist after reload.
- Delete: item removed from list and Sheet.
- Mark as Renewed: `DueDate` advances correctly per `RecurrenceInterval`.
- Validation: invalid `DueDate`, unknown `Category`, or negative `Amount`
  is rejected with `VALIDATION_ERROR` and nothing is written.
- Duplicate records: creating two items with identical fields is allowed
  (no dedup in Phase 1) — confirms this is intentional, not a bug.

## User Isolation Tests
```text
User A logs in
    ↓
User A creates data
User B logs in
    ↓
User B must NOT see User A's data
```
- User B's `getRecords` never returns User A's items.
- User B cannot `updateRecord`/`deleteRecord` an item ID belonging to User
  A, even if the ID is guessed/known — expect `ACCESS_DENIED` or
  `NOT_FOUND`.

## UI Tests
- Desktop browser layout.
- Mobile browser layout (responsive check on Dashboard, List, Form).
- Form validation messages show correctly per field.
- Loading state shows during data fetch/save.
- Error state shows on a forced API failure (e.g. simulate `SERVER_ERROR`).
- Empty state shows for a brand-new user with zero items.

## API Tests
- Valid request for each action in API.md returns the documented success
  shape.
- Invalid/malformed payload returns `INVALID_REQUEST`.
- Missing/invalid token returns `AUTH_REQUIRED`.
- Valid token but nonexistent record ID returns `NOT_FOUND`.
- Simulated backend failure (e.g. Sheet temporarily inaccessible) returns
  `SERVER_ERROR`, not a raw exception.
