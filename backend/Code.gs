/**
 * My Secretary — Apps Script entry point.
 */

function doGet(e) {
  return handleRequest(e.parameter);
}

function doPost(e) {
  var body = e.postData ? JSON.parse(e.postData.contents) : {};
  return handleRequest(body);
}

function handleRequest(request) {
  var action = request.action;

  if (!action) {
    return jsonResponse(errorResponse("INVALID_REQUEST", "Missing action."));
  }

  try {
    switch (action) {
      case "authStatus":
        var email = requireAuthenticatedEmail(request.token);
        // Resolves (creating on first login) the user's own Sheet — see
        // SheetService.gs — and returns the reminder list in the same
        // round trip (ADR-014), so login doesn't need a second request.
        var spreadsheet = getOrCreateUserSpreadsheet(email);
        var records = readAllReminderRows(spreadsheet).map(toApiRecord);
        var categories = getCategories(spreadsheet);
        var emailNotificationsEnabled = getEmailNotificationsEnabled(spreadsheet);
        return jsonResponse(successResponse({
          email: email, sheetId: spreadsheet.getId(), records: records, categories: categories,
          emailNotificationsEnabled: emailNotificationsEnabled,
        }));

      case "getRecords":
        return jsonResponse(actionGetRecords(request.token));

      case "createRecord":
        return jsonResponse(actionCreateRecord(request.token, request.payload || {}));

      case "updateRecord":
        return jsonResponse(actionUpdateRecord(request.token, request.payload || {}));

      case "deleteRecord":
        return jsonResponse(actionDeleteRecord(request.token, request.payload || {}));

      case "renewRecord":
        return jsonResponse(actionRenewRecord(request.token, request.payload || {}));

      case "getCategories":
        return jsonResponse(actionGetCategories(request.token));

      case "addCategory":
        return jsonResponse(actionAddCategory(request.token, request.payload || {}));

      case "renameCategory":
        return jsonResponse(actionRenameCategory(request.token, request.payload || {}));

      case "deleteCategory":
        return jsonResponse(actionDeleteCategory(request.token, request.payload || {}));

      case "getLogs":
        return jsonResponse(actionGetLogs(request.token));

      case "setEmailPreference":
        return jsonResponse(actionSetEmailPreference(request.token, request.payload || {}));

      default:
        return jsonResponse(errorResponse("INVALID_REQUEST", "Unknown action: " + action));
    }
  } catch (e) {
    if (e && e.code) {
      return jsonResponse(errorResponse(e.code, e.message));
    }
    Logger.log("Unhandled error: " + e);
    return jsonResponse(errorResponse("SERVER_ERROR", "Something went wrong. Please try again."));
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data, message) {
  return { success: true, data: data || {}, message: message || "" };
}

function errorResponse(code, message) {
  return { success: false, data: null, message: message || code, code: code };
}
