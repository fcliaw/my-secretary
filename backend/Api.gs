/**
 * My Secretary — CRUD API for reminder items (Stage 4).
 * See API.md for the request/response contract.
 */

var VALID_CATEGORIES = [
  "FixedDeposit", "SchoolFee", "Insurance", "License", "Subscription", "Other",
];
var VALID_RECURRENCE = ["None", "Monthly", "Quarterly", "Yearly"];

function apiError(code, message) {
  throw { code: code, message: message };
}

/** Verifies the token and resolves the caller's own Sheet — every CRUD
 *  action starts here so identity is never inferred from the payload. */
function resolveUserContext(token) {
  var email = requireAuthenticatedEmail(token);
  var spreadsheet = getOrCreateUserSpreadsheet(email);
  return { email: email, spreadsheet: spreadsheet };
}

function remindersSheet(spreadsheet) {
  return spreadsheet.getSheetByName(SHEET_NAMES.REMINDERS);
}

/** Reads all data rows as an array of {field: value} objects, each
 *  tagged with its own sheet row number (for update/delete lookups). */
function readAllReminderRows(spreadsheet) {
  var sheet = remindersSheet(spreadsheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }
  var values = sheet.getRange(2, 1, lastRow - 1, REMINDER_HEADERS.length).getValues();
  return values.map(function (row, i) {
    var record = { _row: i + 2 };
    REMINDER_HEADERS.forEach(function (header, col) {
      record[header] = row[col];
    });
    return record;
  });
}

function findRowById(spreadsheet, id) {
  var rows = readAllReminderRows(spreadsheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].ID === id) {
      return rows[i];
    }
  }
  return null;
}

/** See ADR-015 — Overdue / Today / ThisWeek (1-7d) / NextWeek (8-14d) /
 *  ThisMonth (15-30d) / Later (30d+), all as rolling day-count windows
 *  from today (not calendar-week boundaries, to keep this simple). */
function computeDisplayStatus(dueDate) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  var diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays <= 7) return "ThisWeek";
  if (diffDays <= 14) return "NextWeek";
  if (diffDays <= 30) return "ThisMonth";
  return "Later";
}

function toApiRecord(row) {
  return {
    id: row.ID,
    category: row.Category,
    title: row.Title,
    dueDate: Utilities.formatDate(new Date(row.DueDate), "GMT", "yyyy-MM-dd"),
    recurrenceInterval: row.RecurrenceInterval || "None",
    amount: row.Amount === "" ? null : row.Amount,
    notes: row.Notes || "",
    isDone: !!row.IsDone,
    displayStatus: computeDisplayStatus(row.DueDate),
  };
}

function validateReminderInput(payload, isUpdate) {
  var errors = [];

  if (!isUpdate || payload.category !== undefined) {
    if (VALID_CATEGORIES.indexOf(payload.category) === -1) {
      errors.push("category must be one of: " + VALID_CATEGORIES.join(", "));
    }
  }
  if (!isUpdate || payload.title !== undefined) {
    if (!payload.title || String(payload.title).trim() === "") {
      errors.push("title is required");
    }
  }
  if (!isUpdate || payload.dueDate !== undefined) {
    if (!payload.dueDate || isNaN(new Date(payload.dueDate).getTime())) {
      errors.push("dueDate must be a valid date");
    }
  }
  if (payload.recurrenceInterval !== undefined && payload.recurrenceInterval !== null) {
    if (VALID_RECURRENCE.indexOf(payload.recurrenceInterval) === -1) {
      errors.push("recurrenceInterval must be one of: " + VALID_RECURRENCE.join(", "));
    }
  }
  if (payload.amount !== undefined && payload.amount !== null && payload.amount !== "") {
    var amount = Number(payload.amount);
    if (isNaN(amount) || amount < 0) {
      errors.push("amount must be a non-negative number");
    }
  }

  if (errors.length > 0) {
    apiError("VALIDATION_ERROR", errors.join("; "));
  }
}

function actionGetRecords(token) {
  var ctx = resolveUserContext(token);
  var rows = readAllReminderRows(ctx.spreadsheet);
  var records = rows.map(toApiRecord);
  return successResponse({ records: records });
}

function actionCreateRecord(token, payload) {
  var ctx = resolveUserContext(token);
  validateReminderInput(payload, false);

  var id = Utilities.getUuid();
  var now = new Date();
  var sheet = remindersSheet(ctx.spreadsheet);

  sheet.appendRow([
    id,
    payload.category,
    payload.title,
    new Date(payload.dueDate),
    payload.recurrenceInterval || "None",
    payload.amount === undefined || payload.amount === null || payload.amount === "" ? "" : Number(payload.amount),
    payload.notes || "",
    false,
    now,
    now,
  ]);

  logAction(ctx.spreadsheet, "Create", id, "Success");
  return successResponse({ id: id });
}

function actionUpdateRecord(token, payload) {
  var ctx = resolveUserContext(token);
  if (!payload || !payload.id) {
    apiError("INVALID_REQUEST", "id is required.");
  }

  var row = findRowById(ctx.spreadsheet, payload.id);
  if (!row) {
    apiError("NOT_FOUND", "Reminder not found.");
  }

  validateReminderInput(payload, true);

  var sheet = remindersSheet(ctx.spreadsheet);
  var updates = {
    Category: payload.category,
    Title: payload.title,
    DueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
    RecurrenceInterval: payload.recurrenceInterval,
    Amount: payload.amount === undefined ? undefined : (payload.amount === null || payload.amount === "" ? "" : Number(payload.amount)),
    Notes: payload.notes,
    IsDone: payload.isDone,
  };

  REMINDER_HEADERS.forEach(function (header, col) {
    if (updates[header] !== undefined) {
      sheet.getRange(row._row, col + 1).setValue(updates[header]);
    }
  });
  sheet.getRange(row._row, REMINDER_HEADERS.indexOf("UpdatedDate") + 1).setValue(new Date());

  logAction(ctx.spreadsheet, "Update", payload.id, "Success");
  return successResponse({ id: payload.id });
}

function actionDeleteRecord(token, payload) {
  var ctx = resolveUserContext(token);
  if (!payload || !payload.id) {
    apiError("INVALID_REQUEST", "id is required.");
  }

  var row = findRowById(ctx.spreadsheet, payload.id);
  if (!row) {
    apiError("NOT_FOUND", "Reminder not found.");
  }

  remindersSheet(ctx.spreadsheet).deleteRow(row._row);
  logAction(ctx.spreadsheet, "Delete", payload.id, "Success");
  return successResponse({ id: payload.id });
}

function advanceDueDate(dueDate, recurrenceInterval) {
  var next = new Date(dueDate);
  switch (recurrenceInterval) {
    case "Monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "Quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "Yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      apiError("VALIDATION_ERROR", "Item has no recurrence set — mark it Done instead of Renewed.");
  }
  return next;
}

function actionRenewRecord(token, payload) {
  var ctx = resolveUserContext(token);
  if (!payload || !payload.id) {
    apiError("INVALID_REQUEST", "id is required.");
  }

  var row = findRowById(ctx.spreadsheet, payload.id);
  if (!row) {
    apiError("NOT_FOUND", "Reminder not found.");
  }

  var nextDueDate = advanceDueDate(row.DueDate, row.RecurrenceInterval);

  var sheet = remindersSheet(ctx.spreadsheet);
  sheet.getRange(row._row, REMINDER_HEADERS.indexOf("DueDate") + 1).setValue(nextDueDate);
  sheet.getRange(row._row, REMINDER_HEADERS.indexOf("UpdatedDate") + 1).setValue(new Date());

  logAction(ctx.spreadsheet, "Renew", payload.id, "Success");
  return successResponse({
    id: payload.id,
    dueDate: Utilities.formatDate(nextDueDate, "GMT", "yyyy-MM-dd"),
  });
}
