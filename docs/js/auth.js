// My Secretary — Google Sign-In (Stage 2)
// The ID token from Google proves identity to Google. It is NOT trusted
// as proof of identity by itself — the backend (Auth.gs) re-verifies it
// on every request. See SECURITY.md.

const Auth = (() => {
  const STORAGE_KEY = "mysecretary_id_token";

  function init(onCredential, attemptsLeft) {
    attemptsLeft = attemptsLeft === undefined ? 20 : attemptsLeft;

    if (!window.google || !google.accounts || !google.accounts.id) {
      if (attemptsLeft <= 0) {
        console.error("Google Identity Services script did not load.");
        return;
      }
      setTimeout(() => init(onCredential, attemptsLeft - 1), 150);
      return;
    }

    google.accounts.id.initialize({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      callback: (response) => {
        sessionStorage.setItem(STORAGE_KEY, response.credential);
        onCredential(response.credential);
      },
    });
    google.accounts.id.renderButton(
      document.getElementById("google-signin-button"),
      { theme: "outline", size: "large", width: 280 }
    );
  }

  function getStoredToken() {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  function signOut() {
    sessionStorage.removeItem(STORAGE_KEY);
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
  }

  return { init, getStoredToken, signOut };
})();
