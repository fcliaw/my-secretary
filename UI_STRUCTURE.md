# UI_STRUCTURE.md

## 6.1 Page List

```text
Login
Dashboard (also serves as the full item list — see 6.2, ADR-012)
Add/Edit Reminder Form (modal)
Settings (TBD scope)
```

A standalone Reminder List and Reminder Detail page were originally
planned but merged into the Dashboard as built — see ADR-012.

## 6.2 Page Specification

### Login
- **Purpose:** authenticate the user via Google.
- **User type:** anyone, unauthenticated.
- **Main components:** "Sign in with Google" button, app name/description.
- **Main actions:** click sign-in.
- **Navigation:** on success → Dashboard.
- **Empty/Loading/Error states:** loading spinner during auth redirect;
  error message if Google sign-in fails or is cancelled.

### Dashboard
- **Purpose:** at-a-glance view of everything tracked, grouped by
  urgency. Doubles as the full item list (ADR-012) — there is no separate
  "Reminder List" page.
- **User type:** authenticated Normal User.
- **Main components:** search box (matches title or notes) + category
  filter (Stage 9); an amount-visibility toggle (masked by default —
  privacy, ADR-016) in the top bar; "Overdue" / "Today" / "This Week" /
  "Next Week" / "This Month" / "Later" groups (visually distinct,
  ADR-015), quick-add button, and per-item actions (Edit, Delete, Renewed
  or Mark as Done) inline on each card.
- **Main actions:** search by title, filter by category, edit an item,
  delete it, mark it renewed/done, add a new item — all in one click each,
  no drill-down page required.
- **Navigation:** → Add/Edit Form (modal, opens over the Dashboard).
- **Empty state:** "No reminders yet — add your first one." (no items at
  all) vs. "No reminders match your search." (items exist, filtered out).
- **Loading state:** "Loading..." while records load.
- **Error state:** plain-language message if the Sheet/API call fails.

### Add/Edit Reminder Form
- **Purpose:** create a new item or edit an existing one (shared modal).
- **User type:** authenticated Normal User.
- **Main components:** form fields per DATA_STRUCTURE.md `ReminderItems`,
  Save/Cancel buttons. Title reads "Add Reminder" or "Edit Reminder"
  depending on mode; Edit pre-fills the item's current values.
- **Main actions:** fill fields, submit, cancel.
- **Navigation:** on save success → closes, back to Dashboard (refreshed).
- **Error state:** a general error banner if the save fails server-side
  (e.g. `VALIDATION_ERROR` message from the backend).
- **Loading state:** Save button is disabled while the request is in
  flight (also prevents accidental double-submit).

### Settings
- **Purpose:** `TBD` — no confirmed settings yet.
- Placeholder page only; content to be defined later.

## 6.3 Navigation

```text
Login
  ↓
Dashboard (Overdue / Today / This Week / Next Week / This Month / Later,
           all items, inline actions)
  ├── + Add Reminder → Add/Edit Form (modal)
  ├── Edit (per item) → Add/Edit Form (modal, pre-filled)
  ├── Delete (per item, with confirmation)
  ├── Renewed (recurring items) / Mark as Done (one-off items)
  └── Settings
```
