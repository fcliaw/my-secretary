/**
 * My Secretary — identity verification (Stage 2).
 *
 * SECURITY: the frontend sends a Google ID token (a JWT signed by Google).
 * We NEVER trust an email/user ID sent directly in the request payload —
 * identity is only ever taken from a token that this function has verified
 * with Google itself. See SECURITY.md.
 *
 * Set the expected audience once via:
 *   PropertiesService.getScriptProperties().setProperty(
 *     "GOOGLE_CLIENT_ID", "<your-client-id>.apps.googleusercontent.com"
 *   );
 */

/**
 * Verifies a Google ID token and returns the verified email, or null if
 * the token is missing, expired, malformed, or issued for a different
 * client (aud mismatch).
 */
function verifyIdToken(idToken) {
  if (!idToken) {
    return null;
  }

  var response;
  try {
    response = UrlFetchApp.fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
  } catch (e) {
    Logger.log("Token verification request failed: " + e);
    return null;
  }

  if (response.getResponseCode() !== 200) {
    return null;
  }

  var info = JSON.parse(response.getContentText());

  var expectedClientId = PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID");
  if (!expectedClientId || info.aud !== expectedClientId) {
    Logger.log("Token audience mismatch.");
    return null;
  }

  if (!info.email || info.email_verified !== "true") {
    return null;
  }

  return info.email;
}

/**
 * Resolves the verified caller's email for the current request, or
 * throws a structured error the caller (Code.gs) turns into AUTH_REQUIRED.
 */
function requireAuthenticatedEmail(token) {
  var email = verifyIdToken(token);
  if (!email) {
    throw { code: "AUTH_REQUIRED", message: "Please sign in again." };
  }
  return email;
}
