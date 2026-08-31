/**
 * My Secretary — per-user Google Sheet resolution & initialization (Stage 3).
 *
 * Identity -> Sheet mapping is stored in this script's own Script
 * Properties (a global key/value store for the whole script), keyed by
 * the verified email. This is a deliberate simplicity choice for a
 * personal-scale app — see DECISIONS.md ADR-010.
 */

var SHEET_NAMES = {
  REMINDERS: "ReminderItems",
  SETTINGS: "Settings",
  LOGS: "Logs",
};

var REMINDER_HEADERS = [
  "ID", "Category", "Title", "DueDate", "RecurrenceInterval",
  "Amount", "Notes", "IsDone", "CreatedDate", "UpdatedDate",
];

var LOG_HEADERS = ["Timestamp", "Action", "ItemID", "Result"];

function sheetPropertyKey(email) {
  return "SHEET_ID_" + email;
}

/**
 * Returns the Spreadsheet object belonging to the given verified email,
 * creating it (with the required tabs/headers) on first use.
 */
function getOrCreateUserSpreadsheet(email) {
  var props = PropertiesService.getScriptProperties();
  var key = sheetPropertyKey(email);
  var existingId = props.getProperty(key);

  if (existingId) {
    try {
      return SpreadsheetApp.openById(existingId);
    } catch (e) {
      // Sheet was deleted/moved out of reach — fall through and recreate.
      Logger.log("Stored Sheet ID unreachable for " + email + ", recreating: " + e);
    }
  }

  var spreadsheet = SpreadsheetApp.create("My Secretary - " + email);
  initializeSpreadsheetStructure(spreadsheet);
  props.setProperty(key, spreadsheet.getId());
  return spreadsheet;
}

function initializeSpreadsheetStructure(spreadsheet) {
  var reminders = spreadsheet.getSheets()[0];
  reminders.setName(SHEET_NAMES.REMINDERS);
  reminders.getRange(1, 1, 1, REMINDER_HEADERS.length).setValues([REMINDER_HEADERS]);
  reminders.setFrozenRows(1);

  var settings = spreadsheet.insertSheet(SHEET_NAMES.SETTINGS);
  // No confirmed Settings columns yet (see DATA_STRUCTURE.md) — placeholder tab only.

  var logs = spreadsheet.insertSheet(SHEET_NAMES.LOGS);
  logs.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
  logs.setFrozenRows(1);
}

/**
 * Lightweight write-action logging per DATA_STRUCTURE.md / SECURITY.md
 * (no sensitive data, no tokens).
 */
function logAction(spreadsheet, action, itemId, result) {
  var logs = spreadsheet.getSheetByName(SHEET_NAMES.LOGS);
  logs.appendRow([new Date(), action, itemId, result]);
}
