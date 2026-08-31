# DECISIONS.md

### ADR-001
**Decision:** Use Google Sheet as the Phase 1 database.
**Reason:**
- Simple
- Low cost
- Easy to manage
- Fits the current project
- Works well with Google Apps Script

### ADR-002
**Decision:** Use Google Account authentication.
**Reason:**
The user already has a Google Account and the application is designed
around their own Google resources (their own Sheet).

### ADR-003
**Decision:** Firebase is postponed.
**Reason:**
Firebase may be useful later for scalability, but it adds unnecessary
complexity to the first version.

### ADR-004
**Decision:** Reminder items use a single generic `ReminderItems` sheet
with a `Category` field, instead of separate hardcoded sheets/tables per
type (e.g. a dedicated "FixedDeposit" sheet and a separate "SchoolFee"
sheet).
**Reason:**
Fixed Deposit and school fees are the first two categories, but insurance,
licenses, or subscriptions are likely to follow. A generic structure lets
new categories be added by adding data, not by changing the schema or the
Apps Script logic.

### ADR-005
**Decision:** Data isolation is enforced at the file level (one Sheet per
user), not by a `UserID` column inside a shared Sheet.
**Reason:**
File-level separation means a bug in row-filtering logic can never leak
another user's data — there's no shared file for such a bug to leak from.
This matters because the app is designed to support multiple
users/families later, even though only one person uses it at launch.

### ADR-006
**Decision:** No active notifications (Email/WhatsApp-style alerts) in
Phase 1 — the user checks the Dashboard to see what's due.
**Reason:**
Keeps Phase 1 scope small and avoids picking a notification channel before
it's needed. Revisit in Phase 2 once the core tracking flow is proven
useful.

### ADR-007
**Decision:** `ReminderItems.Status` (Upcoming/Overdue/Done) is replaced by
a stored `IsDone` boolean; `Overdue`/`Due Soon`/`Upcoming` are calculated
on every read from `DueDate` vs. today's date, not stored.
**Reason:**
A stored Overdue/Upcoming value can silently go stale relative to the
real due date (e.g. if a scheduled job to refresh it fails). Computing it
on read guarantees it's always correct, and it's cheap to compute for a
personal-scale dataset.
**Impact:** DATA_STRUCTURE.md `ReminderItems` schema updated; Apps Script
`getRecords` must compute the display status before returning data.

### ADR-008
**Decision:** Apps Script Web App is deployed with `executeAs: "Me"` (the
developer), not "User accessing the web app."
**Reason:**
Testing showed "User accessing the web app" requires the browser to send
Google session cookies cross-origin, which `fetch()` does not do by
default — the request comes back unauthenticated and gets blocked as a
CORS failure before it ever reaches our own code. Since identity is
already verified independently via the Google ID token (Auth.gs,
SECURITY.md), the script doesn't need to run "as the caller" at all.
**Impact:** `backend/appsscript.json` `webapp.executeAs` set to
`USER_DEPLOYING`; deployment in Apps Script must select "Execute as: Me."

### ADR-009
**Decision:** Web App deployment "Who has access" is set to "Anyone," not
"Anyone with Google account."
**Reason:**
"Anyone with Google account" still requires the HTTP request itself to
carry Google auth, which a cross-origin `fetch()` from the frontend
doesn't send — every call failed with a CORS/network error before
reaching our code. "Anyone" removes that outer gate; the app is not
actually open to the public because every action still requires a valid
Google ID token that `Auth.gs` verifies (see SECURITY.md).
**Impact:** Deployment setting only — no code change.

### ADR-010
**Decision:** The email → Sheet ID mapping is stored in Apps Script's own
Script Properties (`SHEET_ID_<email>`), not in a separate master
spreadsheet.
**Reason:**
Script Properties is a built-in key/value store scoped to the whole
script, needs no extra Sheet to manage, and is simple to reason about for
a personal-scale app. A master lookup Sheet was considered but adds a
second point of failure/isolation risk for no real benefit at this scale.
**Impact:** `backend/SheetService.gs` implements `getOrCreateUserSpreadsheet`.
DATA_STRUCTURE.md updated to remove the earlier `TBD`.

### ADR-011
**Decision:** For now, every user's Sheet is created in the project
owner's own Google Drive (via `SpreadsheetApp.create`, running as "Me").
Sheets living in each individual user's own Drive is deferred.
**Reason:**
Storing a file in the *caller's* own Drive requires a second, separate
Google authorization (an OAuth access token with Drive scope, distinct
from the identity-only ID token used today) and a rework of how the
backend talks to Sheets/Drive (direct REST calls with that user's token,
instead of the simpler `SpreadsheetApp`/`DriveApp` calls used today).
Since the app currently has one real user, this added complexity isn't
justified yet. Revisit when the app is actually opened to a second
person/family — see ROADMAP.md.
**Impact:** No code change now. When revisited: `SheetService.gs` will
need to switch from `SpreadsheetApp.create` to Sheets/Drive REST calls
authorized with a per-user Drive-scoped access token; frontend
(`auth.js`) will need to request that additional scope and handle token
refresh (~1hr expiry). Isolation guarantee (ADR-005) is unaffected either
way — one user's Sheet is never reachable by another regardless of whose
Drive it lives in.

### ADR-012
**Decision:** Drop the standalone "Reminder List" and "Reminder Detail"
pages from UI_STRUCTURE.md. The Dashboard doubles as the full item list,
and per-item actions (Edit, Delete, Renewed, Mark as Done) live inline on
each card instead of a separate detail page.
**Reason:**
Built and tested this way while verifying Stage 4's API — it worked well
and matches PROJECT_RULES.md §7 ("this is a personal productivity tool,
not an enterprise platform... do not create unnecessary screens"). A
personal-scale list (tens of items) doesn't need a drill-down page; one
click per action is faster for the actual user than navigating in and
back out of a Detail page each time.
**Impact:** UI_STRUCTURE.md updated. Stage 7 checklist items for List/
Detail pages are considered intentionally out of scope, not incomplete.

### ADR-013
**Decision:** After create/edit/delete/renew/mark-done, the Dashboard
updates its already-loaded list locally instead of re-fetching everything
from the backend (`getRecords`) and showing a full-page loading spinner.
Only the initial page load (and a failed session-restore) does a full
fetch.
**Reason:**
The full-reload spinner after every single action felt heavy for what's
usually a one-field change. Since the app is single-user (ROADMAP.md —
Phase 1 targets one person), there's no other browser tab/device that
could be editing the same data at the same time, so there's nothing to
reconcile — the local update and the real Sheet can't disagree.
**Impact:** `dashboard.js` gained `upsertLocal`/`removeLocal` plus a
frontend copy of `computeDisplayStatus` (must stay in sync with the same
logic in `Api.gs` — both implement the DueSoon-within-7-days rule from
ADR-007). If the app is ever opened to more than one concurrent user
(ADR-011), revisit this — reintroduce a full reload after actions, or add
real conflict detection.

### ADR-014
**Decision:** `authStatus` now also returns the caller's reminder list
(`data.records`), so login / session-restore no longer needs a separate
`getRecords` call.
**Reason:**
Login was doing two sequential round trips to Apps Script (verify
identity, then fetch records), each with real network latency — the
project owner noticed a ~5 second wait on refresh. Combining them into
one response removes one full round trip.
**Impact:** `Code.gs` `authStatus` case now also reads and returns
records; frontend `app.js` calls `Dashboard.setRecords(...)` directly
instead of `Dashboard.load()` after a successful `authStatus`. The
standalone `getRecords` action still exists (used nowhere currently, kept
for API completeness / potential future manual-refresh button).

### ADR-015
**Decision:** Replace the 3-bucket Dashboard grouping (Overdue / Due Soon
within 7 days / Upcoming, ADR-007) with 6 buckets: Overdue, Today, This
Week (1-7 days), Next Week (8-14 days), This Month (15-30 days), Later
(30+ days) — all as a rolling day-count from today, not calendar-week
boundaries.
**Reason:**
The project owner wanted finer-grained urgency signal than a single
"Due Soon" bucket. Rolling day-count windows (vs. real calendar
week/month boundaries) were chosen to keep the logic simple and avoid
edge cases like "This Week" being nearly empty on a Sunday.
**Impact:** `Api.gs` and `dashboard.js` both reimplement
`computeDisplayStatus` (kept in sync per ADR-013's existing duplication
tradeoff); `API.md`, `DATA_STRUCTURE.md`, `UI_STRUCTURE.md` updated;
HTML/CSS gained 3 more group sections/colors.

### ADR-016
**Decision:** Reminder amounts are masked (`RM ••••`) by default on every
page load; a single eye-icon toggle in the top bar reveals/hides them for
all items at once (not per-item).
**Reason:**
The project owner wanted to avoid someone standing nearby seeing dollar
amounts immediately after login. A single global toggle (not stored
anywhere, resets to masked on every reload) is simplest and matches the
actual concern — a passive glance, not a determined attacker.
**Impact:** `dashboard.js` `formatMoney` checks a module-level
`amountsVisible` flag; no backend change — the backend still returns real
amounts, masking is purely a display concern.

### ADR-017
**Decision:** Bulk import uses a downloadable CSV template (with one
example row per Category, demonstrating valid values) rather than parsing
an arbitrary existing Excel file, and rather than a real `.xlsx` binary
format.
**Reason:**
CSV can be generated and parsed with plain JavaScript — no external
library needed (PROJECT_RULES.md: avoid unnecessary dependencies), and
both Excel and Google Sheets open/save CSV natively. An early version put
usage instructions in extra comment rows / long header text, but this
confused Excel's delimiter auto-detection when opened by double-click
(inconsistent column counts per row) — real, directly-importable example
rows turned out to be both clearer for the user and safer for Excel to
parse.
**Impact:** `docs/js/importExport.js` (template generation + a lenient
CSV parser that accepts category/recurrence labels with or without
spaces/hyphens); `docs/js/app.js` wires the download/import buttons;
`Dashboard.createMany` (`dashboard.js`) does the actual sequential
`createRecord` calls.

### ADR-018
**Decision:** Add a row of 6 clickable stat tiles (Overdue/Today/This
Week/Next Week/This Month/Later, each showing a count) above the
Dashboard's item list. Clicking a tile scrolls to that group below —
tiles are a summary, not a replacement for the detailed list. Counts
reflect all active (not-done) reminders regardless of the current search/
category filter.
**Reason:**
Project owner wanted an at-a-glance numeric summary matching the 6
buckets already defined in ADR-015, on top of (not instead of) the
existing detailed cards — confirmed via AskUserQuestion before building.
**Impact:** `index.html` (`#stat-tiles`), `style.css` (`.stat-tile` +
per-bucket colors), `dashboard.js` (`updateStatTiles`, called from
`applyFiltersAndRender` using the unfiltered active list).

### ADR-019
**Decision:** Category stops being a fixed, hardcoded set
(`FixedDeposit`/`SchoolFee`/.../`Other`) and becomes a user-editable list
stored in the `Settings` sheet — add / rename / delete, all through a new
Settings screen. **Both rename and delete are blocked if any reminder
still uses that category** — an early version tried to bulk-update
existing reminders' `Category` cell on rename, but the frontend's already
-loaded Dashboard data wasn't kept in sync with that change, so a renamed
category's reminders appeared to go blank until the next full reload;
blocking rename entirely when in use (matching delete's existing rule) is
simpler and has no such sync hazard. Defaults are seeded on first Sheet creation using the exact same strings
already hardcoded before (no spaces — `FixedDeposit`, not
`Fixed Deposit`) so existing test data stays valid without a migration.
Sheets created before this feature (empty `Settings` tab) get the
defaults back-filled the first time `getCategories` runs.
**Reason:**
Project owner wants to track categories beyond the original 6 (e.g.
insurance sub-types, car loan, etc.) without needing a code change each
time — this was explicit user-facing scope from the start (ADR-004
already designed the *data model* to be category-agnostic; this ADR makes
the *category list itself* user-editable, closing that loop).
**Impact:** New `backend/CategoryService.gs`
(getCategories/addCategory/renameCategory/deleteCategory);
`Api.gs.validateReminderInput` now takes `spreadsheet` and reads the
dynamic list instead of a hardcoded `VALID_CATEGORIES` array; `Code.gs`
wires 4 new actions and `authStatus` also returns `categories`;
`DATA_STRUCTURE.md`/`API.md` updated. Frontend: category `<select>`
elements (Add/Edit form, filter, CSV import) are now populated from the
server's live list instead of hardcoded `<option>`s — see follow-up
frontend commit.

### ADR-020
**Decision:** Turn the frontend into an installable PWA (Web App
Manifest + a Service Worker caching the static app shell), as the
groundwork for eventual push notifications — but this ADR covers
installability only, not push itself.
**Reason:**
Project owner wants the app to feel more like a native app on their
phone (home-screen icon, opens without the browser chrome). A Service
Worker is also a hard technical prerequisite for the Push API, so this
is a deliberate first step before attempting notifications (Email first,
per the earlier discussion — see ROADMAP.md Phase 2).
**Impact:** New `docs/manifest.json`, `docs/sw.js`, `docs/icons/` (192px/
512px PNGs generated locally, not hand-designed — placeholder branding);
`index.html` links the manifest + registers the service worker. The
service worker only caches same-origin static files (HTML/CSS/JS/icons)
cache-first-with-network-update; it never intercepts calls to Apps
Script or Google's domains, so login and data are always live.

### ADR-021
**Decision:** Daily email reminders (ROADMAP.md Phase 2) via a
time-driven Apps Script trigger calling `sendDueReminderEmails`, using
`MailApp` — not Web Push. Email only covers "Overdue" and "Today" items
(not the full week), so the email stays short and doesn't repeat the
same items every day.
**Reason:**
Chosen over Web Push per the earlier discussion (see chat): Web Push
needs manual encryption work Apps Script has no library for, while
`MailApp` is a one-line native call. Loops over every `SHEET_ID_*`
Script Property so it scales to more than one user without change.
**Impact:** New `backend/Notifications.gs`. Not wired to any web
request — runs only on its own schedule. The trigger itself must be
created once, manually, in the Apps Script editor (Triggers → Add
Trigger); this can't be set up from a deployment or from code without
the project owner running it once interactively.

### ADR-022
**Decision:** Add a per-user on/off toggle for email reminders (default
ON), stored as a simple key/value pair in the `Settings` sheet — columns
C/D, alongside the Category list in columns A/B (not mixed into the same
column).
**Reason:**
User should be able to turn off the daily email without needing to
delete every reminder or ask for a code change. Default ON (not OFF)
because reminders are the entire point of the app — someone who never
opens Settings should still get them; opting out is a deliberate action,
opting in by finding a hidden setting is not something to require.
**Impact:** New `backend/SettingsService.gs`
(get/setEmailNotificationsEnabled, generic get/setSetting for future
keys); `Notifications.gs` checks the flag before sending; `authStatus`
also returns `emailNotificationsEnabled`; new `setEmailPreference`
action; Settings screen gained a checkbox (`docs/js/settings.js`).

### ADR-023
**Decision:** Add a Report screen: a full list of every reminder
(including `Done` ones, which the Dashboard hides), filterable by
category, plus a read-only "This Month's Activity" table built from the
existing `Logs` sheet (Create/Update/Delete/Renew).
**Reason:**
Project owner wanted a way to see everything ever tracked, not just what's
currently outstanding, and to review what actually happened in a given
month — explicit user-facing scope, confirmed via AskUserQuestion before
building.
**Impact:** New `backend/ReportService.gs` (`getLogs` action — reuses
`actionGetRecords` for the reminder half, since it already returns
`Done` items unfiltered); new `docs/js/report.js` and a wide modal in
`index.html`/`style.css`. "This month" is filtered client-side from all
logs (personal-scale row counts, no need for a server-side date filter).

### ADR-024
**Decision:** Rename the Dashboard/Report display bucket labeled "This
Month" (ADR-015 — 15-30 days from today, a rolling window) to "Within 30
Days". The internal code name stays `ThisMonth` (`Api.gs`/`dashboard.js`
`computeDisplayStatus`, `GROUP_KEYS`) — only the user-facing label
changed, since the underlying 15-30-day rule (ADR-015) isn't changing.
**Reason:**
Project owner found an item due 15 days out, in the next calendar month,
sitting in "This Month" — a real bucket-boundary case that exposed the
label as misleading: it reads as "the current calendar month" but is
actually a rolling day-count window, unrelated to calendar-month
boundaries. Renaming the visible label (not the bucket rule) removes the
confusion cheaply and doesn't touch ADR-015's math. Report's unrelated
"This Month's Activity" (the real calendar-month log filter) keeps its
name — it genuinely means the calendar month.
**Impact:** `index.html`, `docs/js/report.js`, `UI_STRUCTURE.md` — label
text only, no logic change.
