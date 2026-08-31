// My Secretary — Dashboard data loading + reminder actions

const Dashboard = (() => {
  const groupLists = {
    Overdue: document.getElementById("list-overdue"),
    DueSoon: document.getElementById("list-due-soon"),
    Upcoming: document.getElementById("list-upcoming"),
  };
  const searchInput = document.getElementById("filter-search");
  const categorySelect = document.getElementById("filter-category");

  let allRecords = []; // last loaded from the server, unfiltered
  const DUE_SOON_DAYS = 7; // must match backend Api.gs DUE_SOON_DAYS (ADR-007)

  function computeDisplayStatus(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays <= DUE_SOON_DAYS) return "DueSoon";
    return "Upcoming";
  }

  function setState(state) {
    document.getElementById("dashboard-loading").hidden = state !== "loading";
    document.getElementById("dashboard-error").hidden = state !== "error";
    document.getElementById("dashboard-empty").hidden = state !== "empty";
    document.getElementById("dashboard-no-matches").hidden = state !== "no-matches";
    document.getElementById("dashboard-content").hidden = state !== "content";
    document.getElementById("btn-add").hidden = state === "loading";
    document.getElementById("dashboard-filters").hidden =
      state === "loading" || state === "error" || (state === "empty" && allRecords.length === 0);
  }

  function formatMoney(amount) {
    return amount === null || amount === undefined || amount === ""
      ? ""
      : ` — RM ${Number(amount).toFixed(2)}`;
  }

  function renderItem(record) {
    const li = document.createElement("li");

    const title = document.createElement("strong");
    title.textContent = record.title;

    const meta = document.createElement("div");
    meta.textContent = `${record.category} · Due ${record.dueDate}${formatMoney(record.amount)}`;

    const actions = document.createElement("div");
    actions.className = "reminder-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => Forms.openEdit(record));
    actions.appendChild(editBtn);

    if (record.recurrenceInterval && record.recurrenceInterval !== "None") {
      const renewBtn = document.createElement("button");
      renewBtn.className = "btn btn-small";
      renewBtn.textContent = "Renewed";
      renewBtn.addEventListener("click", () => handleRenew(record.id));
      actions.appendChild(renewBtn);
    } else {
      const doneBtn = document.createElement("button");
      doneBtn.className = "btn btn-small";
      doneBtn.textContent = "Mark as Done";
      doneBtn.addEventListener("click", () => handleMarkDone(record.id));
      actions.appendChild(doneBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-small btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => handleDelete(record.id));
    actions.appendChild(deleteBtn);

    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(actions);
    return li;
  }

  function applyFiltersAndRender() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;

    // Completed one-off items are done — don't clutter the Dashboard with them.
    const active = allRecords.filter((r) => !r.isDone);

    if (active.length === 0) {
      setState("empty");
      return;
    }

    const filtered = active.filter((r) => {
      const matchesQuery =
        !query ||
        r.title.toLowerCase().includes(query) ||
        (r.notes || "").toLowerCase().includes(query);
      const matchesCategory = !category || r.category === category;
      return matchesQuery && matchesCategory;
    });

    if (filtered.length === 0) {
      setState("no-matches");
      return;
    }

    Object.values(groupLists).forEach((ul) => (ul.innerHTML = ""));
    filtered
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .forEach((record) => {
        const list = groupLists[record.displayStatus] || groupLists.Upcoming;
        list.appendChild(renderItem(record));
      });

    document.querySelectorAll(".group").forEach((group, i) => {
      const key = ["Overdue", "DueSoon", "Upcoming"][i];
      group.hidden = groupLists[key].children.length === 0;
    });

    setState("content");
  }

  // Used when authStatus already returned the record list (ADR-014) —
  // renders directly without a second getRecords round trip.
  function setRecords(records) {
    allRecords = records || [];
    applyFiltersAndRender();
  }

  // --- Local (optimistic) updates — avoid a full reload + spinner for
  // actions we already know the result of. See DECISIONS.md ADR-013:
  // single-user app, so we don't guard against concurrent-editor conflicts.

  function upsertLocal(record) {
    const i = allRecords.findIndex((r) => r.id === record.id);
    if (i === -1) {
      allRecords.push(record);
    } else {
      allRecords[i] = record;
    }
    applyFiltersAndRender();
  }

  function removeLocal(id) {
    allRecords = allRecords.filter((r) => r.id !== id);
    applyFiltersAndRender();
  }

  async function load() {
    setState("loading");
    const result = await Api.call("getRecords");

    if (!result.success) {
      document.getElementById("dashboard-error").textContent =
        result.message || "Unable to load reminders.";
      setState("error");
      return;
    }

    allRecords = result.data.records || [];
    applyFiltersAndRender();
  }

  async function handleRenew(id) {
    const result = await Api.call("renewRecord", { id });
    if (!result.success) {
      alert(result.message || "Unable to renew reminder.");
      return;
    }
    const record = allRecords.find((r) => r.id === id);
    if (record) {
      upsertLocal({ ...record, dueDate: result.data.dueDate, displayStatus: computeDisplayStatus(result.data.dueDate) });
    } else {
      load();
    }
  }

  async function handleMarkDone(id) {
    const result = await Api.call("updateRecord", { id, isDone: true });
    if (!result.success) {
      alert(result.message || "Unable to update reminder.");
      return;
    }
    // Done items are filtered out of the Dashboard anyway (applyFiltersAndRender).
    removeLocal(id);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this reminder?")) return;
    const result = await Api.call("deleteRecord", { id });
    if (!result.success) {
      alert(result.message || "Unable to delete reminder.");
      return;
    }
    removeLocal(id);
  }

  searchInput.addEventListener("input", applyFiltersAndRender);
  categorySelect.addEventListener("change", applyFiltersAndRender);

  return { load, setRecords, upsertLocal, removeLocal, computeDisplayStatus };
})();
