/**
 * My Secretary — daily email reminders (ROADMAP.md Phase 2).
 *
 * Meant to run once a day via a time-driven trigger (set up manually in
 * the Apps Script editor — Triggers → Add Trigger →
 * sendDueReminderEmails → Time-driven → Day timer). Not wired to any web
 * request — this only runs on its own schedule.
 *
 * Scope kept deliberately small: emails only "Overdue" and "Today" items
 * (not the full week) so it stays short and doesn't repeat the same
 * items every day for a week straight.
 */

function sendDueReminderEmails() {
  var props = PropertiesService.getScriptProperties().getProperties();

  Object.keys(props).forEach(function (key) {
    if (key.indexOf("SHEET_ID_") !== 0) return;

    var email = key.substring("SHEET_ID_".length);
    var sheetId = props[key];

    try {
      var spreadsheet = SpreadsheetApp.openById(sheetId);
      sendDueReminderEmailForUser(email, spreadsheet);
    } catch (e) {
      Logger.log("Failed to send reminder email to " + email + ": " + e);
    }
  });
}

function sendDueReminderEmailForUser(email, spreadsheet) {
  var rows = readAllReminderRows(spreadsheet)
    .filter(function (r) { return !r.IsDone; })
    .map(toApiRecord)
    .filter(function (r) { return r.displayStatus === "Overdue" || r.displayStatus === "Today"; });

  if (rows.length === 0) return;

  var overdue = rows.filter(function (r) { return r.displayStatus === "Overdue"; });
  var today = rows.filter(function (r) { return r.displayStatus === "Today"; });

  var lines = [];
  if (overdue.length > 0) {
    lines.push("OVERDUE:");
    overdue.forEach(function (r) { lines.push("- " + r.title + " (" + r.category + ", was due " + r.dueDate + ")"); });
    lines.push("");
  }
  if (today.length > 0) {
    lines.push("DUE TODAY:");
    today.forEach(function (r) { lines.push("- " + r.title + " (" + r.category + ")"); });
  }

  var subject = "My Secretary: " + rows.length + " reminder" + (rows.length === 1 ? "" : "s") + " need your attention";
  var body = lines.join("\n") + "\n\nOpen My Secretary to manage these.";

  MailApp.sendEmail(email, subject, body);
}
