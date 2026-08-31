/**
 * My Secretary — user-editable Category list (Stage 9, ADR-019).
 * Stored in the `Settings` sheet, one category name per row (column A,
 * row 1 is the header "Category").
 */

function categoriesSheet(spreadsheet) {
  return spreadsheet.getSheetByName(SHEET_NAMES.SETTINGS);
}

/**
 * Returns the user's current category list. Sheets created before this
 * feature existed have an empty Settings tab — back-fill the defaults on
 * first read rather than requiring a manual migration step.
 */
function getCategories(spreadsheet) {
  var sheet = categoriesSheet(spreadsheet);
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    sheet.getRange(1, 1).setValue("Category");
    sheet.getRange(2, 1, DEFAULT_CATEGORIES.length, 1)
      .setValues(DEFAULT_CATEGORIES.map(function (c) { return [c]; }));
    return DEFAULT_CATEGORIES.slice();
  }

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return values.map(function (row) { return row[0]; }).filter(function (v) { return v !== ""; });
}

function findCategoryRow(sheet, name) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === name) return i + 2; // sheet row number
  }
  return -1;
}

function actionGetCategories(token) {
  var ctx = resolveUserContext(token);
  return successResponse({ categories: getCategories(ctx.spreadsheet) });
}

function actionAddCategory(token, payload) {
  var ctx = resolveUserContext(token);
  var name = payload && payload.name ? String(payload.name).trim() : "";

  if (!name) {
    apiError("VALIDATION_ERROR", "Category name is required.");
  }

  var categories = getCategories(ctx.spreadsheet);
  if (categories.indexOf(name) !== -1) {
    apiError("VALIDATION_ERROR", "That category already exists.");
  }

  categoriesSheet(ctx.spreadsheet).appendRow([name]);
  return successResponse({ categories: getCategories(ctx.spreadsheet) });
}

function actionRenameCategory(token, payload) {
  var ctx = resolveUserContext(token);
  var oldName = payload && payload.oldName ? String(payload.oldName).trim() : "";
  var newName = payload && payload.newName ? String(payload.newName).trim() : "";

  if (!oldName || !newName) {
    apiError("INVALID_REQUEST", "oldName and newName are required.");
  }

  var sheet = categoriesSheet(ctx.spreadsheet);
  var categories = getCategories(ctx.spreadsheet);

  if (categories.indexOf(oldName) === -1) {
    apiError("NOT_FOUND", "Category not found.");
  }
  if (oldName !== newName && categories.indexOf(newName) !== -1) {
    apiError("VALIDATION_ERROR", "That category name is already used.");
  }

  var inUse = readAllReminderRows(ctx.spreadsheet).some(function (r) { return r.Category === oldName; });
  if (inUse) {
    apiError("VALIDATION_ERROR", "Can't rename a category that's still used by a reminder. Move or delete those reminders first.");
  }

  var row = findCategoryRow(sheet, oldName);
  sheet.getRange(row, 1).setValue(newName);

  return successResponse({ categories: getCategories(ctx.spreadsheet) });
}

function actionDeleteCategory(token, payload) {
  var ctx = resolveUserContext(token);
  var name = payload && payload.name ? String(payload.name).trim() : "";

  if (!name) {
    apiError("INVALID_REQUEST", "name is required.");
  }

  var sheet = categoriesSheet(ctx.spreadsheet);
  var row = findCategoryRow(sheet, name);
  if (row === -1) {
    apiError("NOT_FOUND", "Category not found.");
  }

  var inUse = readAllReminderRows(ctx.spreadsheet).some(function (r) { return r.Category === name; });
  if (inUse) {
    apiError("VALIDATION_ERROR", "Can't delete a category that's still used by a reminder. Move or delete those reminders first.");
  }

  sheet.deleteRow(row);
  return successResponse({ categories: getCategories(ctx.spreadsheet) });
}
