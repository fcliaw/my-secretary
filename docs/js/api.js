// My Secretary — Apps Script API client (Stage 2: only used for authStatus so far)

const Api = (() => {
  async function call(action, payload) {
    if (!CONFIG.BACKEND_URL) {
      return {
        success: false,
        data: null,
        message: "Backend not deployed yet.",
        code: "SERVER_ERROR",
      };
    }

    const token = Auth.getStoredToken();
    const body = { action, token, payload: payload || {} };

    try {
      const res = await fetch(CONFIG.BACKEND_URL, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err) {
      return {
        success: false,
        data: null,
        message: "Could not reach the server. Check your connection.",
        code: "SERVER_ERROR",
      };
    }
  }

  return { call };
})();
