// My Secretary — frontend shell (login + navigation)

const views = {
  login: document.getElementById("view-login"),
  dashboard: document.getElementById("view-dashboard"),
};

function showView(name) {
  Object.values(views).forEach((el) => (el.hidden = true));
  views[name].hidden = false;
}

function showLoginError(message) {
  const el = document.getElementById("login-error");
  el.textContent = message;
  el.hidden = false;
}

function clearLoginError() {
  document.getElementById("login-error").hidden = true;
}

async function handleSignIn() {
  clearLoginError();
  document.getElementById("login-loading").hidden = false;

  const result = await Api.call("authStatus");

  document.getElementById("login-loading").hidden = true;

  if (result.success) {
    showView("dashboard");
    Dashboard.setCategories(result.data.categories);
    Dashboard.setRecords(result.data.records);
    Settings.setEmailPreference(result.data.emailNotificationsEnabled);
  } else {
    Auth.signOut();
    showView("login");
    showLoginError(result.message || "Sign-in failed. Please try again.");
  }
}

document.getElementById("btn-logout").addEventListener("click", () => {
  Auth.signOut();
  showView("login");
});

// --- Add/Edit reminder form (shared modal) ---

const Forms = (() => {
  const overlay = document.getElementById("view-add-form");
  const form = document.getElementById("add-form");
  const errorEl = document.getElementById("add-form-error");
  const submitBtn = form.querySelector('button[type="submit"]');

  function todayParts() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const yyyy = today.getFullYear();
    return { mm, dd, yyyy, iso: `${yyyy}-${mm}-${dd}` };
  }

  function showTodayHint() {
    const { dd, mm, yyyy } = todayParts();
    document.getElementById("today-hint").textContent = `(Today: ${dd}/${mm}/${yyyy})`;
  }

  function openAdd() {
    form.reset();
    editingIsDone = false;
    document.getElementById("field-id").value = "";
    document.getElementById("form-title").textContent = "Add Reminder";
    document.getElementById("field-due-date").value = todayParts().iso;
    showTodayHint();
    errorEl.hidden = true;
    overlay.hidden = false;
  }

  let editingIsDone = false; // preserved across save — see submit handler

  function openEdit(record) {
    form.reset();
    editingIsDone = !!record.isDone;
    document.getElementById("field-id").value = record.id;
    document.getElementById("form-title").textContent = "Edit Reminder";
    document.getElementById("field-category").value = record.category;
    document.getElementById("field-title").value = record.title;
    document.getElementById("field-due-date").value = record.dueDate;
    document.getElementById("field-recurrence").value = record.recurrenceInterval || "None";
    document.getElementById("field-amount").value = record.amount ?? "";
    document.getElementById("field-notes").value = record.notes || "";
    showTodayHint();
    errorEl.hidden = true;
    overlay.hidden = false;
  }

  function close() {
    overlay.hidden = true;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    if (submitBtn.disabled) return; // guard against double-click / double-submit
    submitBtn.disabled = true;

    const id = document.getElementById("field-id").value;
    const amountValue = document.getElementById("field-amount").value;
    const payload = {
      category: document.getElementById("field-category").value,
      title: document.getElementById("field-title").value,
      dueDate: document.getElementById("field-due-date").value,
      recurrenceInterval: document.getElementById("field-recurrence").value,
      amount: amountValue === "" ? null : Number(amountValue),
      notes: document.getElementById("field-notes").value,
    };
    if (id) payload.id = id;

    const result = await Api.call(id ? "updateRecord" : "createRecord", payload);
    submitBtn.disabled = false;

    if (!result.success) {
      errorEl.textContent = result.message || "Unable to save reminder.";
      errorEl.hidden = false;
      return;
    }

    close();
    const savedRecord = {
      id: id || result.data.id,
      category: payload.category,
      title: payload.title,
      dueDate: payload.dueDate,
      recurrenceInterval: payload.recurrenceInterval,
      amount: payload.amount,
      notes: payload.notes,
      isDone: id ? editingIsDone : false, // new records are never done; edits keep their existing status
      displayStatus: Dashboard.computeDisplayStatus(payload.dueDate),
    };
    Dashboard.upsertLocal(savedRecord);
    Report.upsertLocal(savedRecord);
  });

  document.getElementById("btn-cancel-add").addEventListener("click", close);
  document.getElementById("btn-add").addEventListener("click", openAdd);

  return { openAdd, openEdit, close };
})();

// --- Import from CSV ---

document.getElementById("btn-download-template").addEventListener("click", () => {
  ImportExport.downloadTemplate(Dashboard.getCategories());
});

document.getElementById("input-import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById("import-status");
  statusEl.hidden = false;
  statusEl.className = "import-status";
  statusEl.textContent = "Importing...";

  const text = await ImportExport.readFileAsText(file);
  const { rows, errors: parseErrors } = ImportExport.parseCsv(text, Dashboard.getCategories());

  if (rows.length === 0) {
    statusEl.className = "import-status import-error";
    statusEl.textContent = parseErrors.length
      ? `Nothing imported: ${parseErrors.join("; ")}`
      : "Nothing to import.";
    e.target.value = "";
    return;
  }

  const { successCount, errors: saveErrors } = await Dashboard.createMany(rows);
  const allErrors = [...parseErrors, ...saveErrors];

  if (allErrors.length === 0) {
    statusEl.className = "import-status";
    statusEl.textContent = `Imported ${successCount} reminder(s).`;
  } else {
    statusEl.className = "import-status import-error";
    statusEl.textContent = `Imported ${successCount}, ${allErrors.length} skipped: ${allErrors.join("; ")}`;
  }

  e.target.value = ""; // allow re-selecting the same file later
});

Auth.init(handleSignIn);

// If we still have a token from earlier this session (e.g. page refresh),
// re-verify it with the backend instead of forcing sign-in again.
if (Auth.getStoredToken()) {
  showView("dashboard");
  handleSignIn();
} else {
  showView("login");
}

// Auto-logout after 30 minutes of inactivity — checked periodically so
// it also fires while the app stays open and idle, not just at the next
// launch. Auth.getStoredToken() itself clears the token once idle-expired.
setInterval(() => {
  if (!views.dashboard.hidden && !Auth.getStoredToken()) {
    showView("login");
    showLoginError("You were signed out after 30 minutes of inactivity.");
  }
}, 60 * 1000);

// PWA: registers the app shell cache (sw.js) so the site is installable
// (Add to Home Screen) and opens even with no signal. Login/data always
// still need a real connection — see sw.js.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  });
}
