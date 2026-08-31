// My Secretary — Google Sign-In (Stage 2)
// The ID token from Google proves identity to Google. It is NOT trusted
// as proof of identity by itself — the backend (Auth.gs) re-verifies it
// on every request. See SECURITY.md.

const Auth = (() => {
  const STORAGE_KEY = "mysecretary_id_token";
  const ACTIVITY_KEY = "mysecretary_last_activity";
  const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

  // localStorage (not sessionStorage) so the login survives closing the
  // app entirely — important on mobile/PWA, where the OS back button can
  // kill the whole app, not just background it. Idle auto-logout below
  // is what keeps this safe to do.
  function touchActivity() {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  }

  function isIdleExpired() {
    const last = Number(localStorage.getItem(ACTIVITY_KEY) || 0);
    return Date.now() - last > IDLE_LIMIT_MS;
  }

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
        localStorage.setItem(STORAGE_KEY, response.credential);
        touchActivity();
        onCredential(response.credential);
      },
    });
    google.accounts.id.renderButton(
      document.getElementById("google-signin-button"),
      { theme: "outline", size: "large", width: 280 }
    );
  }

  function getStoredToken() {
    if (isIdleExpired()) {
      signOut();
      return null;
    }
    return localStorage.getItem(STORAGE_KEY);
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
  }

  // Any real interaction resets the 30-minute idle clock. Throttled so
  // we're not writing to localStorage on every single mousemove.
  let lastTouch = 0;
  function trackActivity() {
    ["click", "keydown", "touchstart", "scroll"].forEach((evt) => {
      document.addEventListener(
        evt,
        () => {
          if (!getStoredTokenRaw()) return; // not logged in — nothing to keep alive
          const now = Date.now();
          if (now - lastTouch > 10000) {
            lastTouch = now;
            touchActivity();
          }
        },
        { passive: true }
      );
    });
  }

  function getStoredTokenRaw() {
    return localStorage.getItem(STORAGE_KEY);
  }

  trackActivity();

  return { init, getStoredToken, signOut, touchActivity, isIdleExpired };
})();
