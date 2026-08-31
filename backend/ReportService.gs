/**
 * My Secretary — Report data (Stage: Report). The "all reminders" half of
 * the Report reuses actionGetRecords (Api.gs) — it already returns every
 * row including Done ones, the Dashboard just filters those out
 * client-side. This file only adds the activity-log half.
 */

function readAllLogRows(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SHEET_NAMES.LOGS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, LOG_HEADERS.length).getValues();
  return values.map(function (row) {
    return { Timestamp: row[0], Action: row[1], ItemID: row[2], Result: row[3] };
  });
}

function actionGetLogs(token) {
  var ctx = resolveUserContext(token);

  // Item titles for logged actions — deleted items won't have one.
  var titleById = {};
  readAllReminderRows(ctx.spreadsheet).forEach(function (r) {
    titleById[r.ID] = r.Title;
  });

  var logs = readAllLogRows(ctx.spreadsheet).map(function (l) {
    return {
      timestamp: Utilities.formatDate(new Date(l.Timestamp), "GMT", "yyyy-MM-dd HH:mm"),
      action: l.Action,
      itemTitle: titleById[l.ItemID] || "(deleted item)",
      result: l.Result,
    };
  });

  // Newest first.
  logs.sort(function (a, b) { return b.timestamp.localeCompare(a.timestamp); });

  return successResponse({ logs: logs });
}
