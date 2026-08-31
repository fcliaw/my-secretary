/**
 * My Secretary — simple key/value settings (Stage: Settings preferences).
 * Stored in the `Settings` sheet, columns C/D (column A/B are the
 * Category list — see CategoryService.gs). Row 1 is headers
 * ("Setting" / "Value"); currently only one key: EmailNotifications.
 */

var SETTINGS_KEYS = { EMAIL_NOTIFICATIONS: "EmailNotifications" };

function findSettingRow(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // column C
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === key) return i + 2;
  }
  return -1;
}

function getSetting(spreadsheet, key, defaultValue) {
  var sheet = categoriesSheet(spreadsheet); // same Settings tab
  var row = findSettingRow(sheet, key);
  if (row === -1) return defaultValue;
  return sheet.getRange(row, 4).getValue(); // column D
}

function setSetting(spreadsheet, key, value) {
  var sheet = categoriesSheet(spreadsheet);
  sheet.getRange(1, 3).setValue("Setting");
  sheet.getRange(1, 4).setValue("Value");

  var row = findSettingRow(sheet, key);
  if (row === -1) {
    row = sheet.getLastRow() + 1;
    sheet.getRange(row, 3).setValue(key);
  }
  sheet.getRange(row, 4).setValue(value);
}

function getEmailNotificationsEnabled(spreadsheet) {
  // Default true — reminders are the whole point of the app; the user
  // opts out, rather than having to opt in and possibly never notice.
  var value = getSetting(spreadsheet, SETTINGS_KEYS.EMAIL_NOTIFICATIONS, true);
  return value === true || value === "true" || value === "";
}

function actionSetEmailPreference(token, payload) {
  var ctx = resolveUserContext(token);
  var enabled = !!(payload && payload.enabled);
  setSetting(ctx.spreadsheet, SETTINGS_KEYS.EMAIL_NOTIFICATIONS, enabled);
  return successResponse({ enabled: enabled });
}
