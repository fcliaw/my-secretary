// My Secretary — Dashboard data loading + reminder actions

const Dashboard = (() => {
  const GROUP_KEYS = ["Overdue", "Today", "ThisWeek", "NextWeek", "ThisMonth", "Later"];
  const groupLists = {
    Overdue: document.getElementById("list-overdue"),
    Today: document.getElementById("list-today"),
    ThisWeek: document.getElementById("list-this-week"),
    NextWeek: document.getElementById("list-next-week"),
    ThisMonth: document.getElementById("list-this-month"),
    Later: document.getElementById("list-later"),
  };
  const searchInput = document.getElementById("filter-search");
  const categorySelect = document.getElementById("filter-category");

  let allRecords = []; // last loaded from the server, unfiltered
  let allCategories = []; // last loaded from the server (Settings sheet) — ADR-019
  let amountsVisible = false; // masked by default on every load — privacy (see item 5)

  // Category <select> elements are populated from the server's live list
  // (not hardcoded <option>s) so Settings changes (ADR-019) show up
  // everywhere without a page reload.
  function renderCategoryOptions() {
    const filterSelect = document.getElementById("filter-category");
    const formSelect = document.getElementById("field-category");
    const previousFilterValue = filterSelect.value;
    const previousFormValue = formSelect.value;

    filterSelect.innerHTML = '<option value="">All categories</option>';
    formSelect.innerHTML = "";
    allCategories.forEach((cat) => {
      filterSelect.appendChild(new Option(cat, cat));
      formSelect.appendChild(new Option(cat, cat));
    });

    if (allCategories.includes(previousFilterValue)) filterSelect.value = previousFilterValue;
    if (allCategories.includes(previousFormValue)) formSelect.value = previousFormValue;
  }

  function setCategories(categories) {
    allCategories = categories || [];
    renderCategoryOptions();
  }

  // Must match backend Api.gs computeDisplayStatus (see ADR-013 for why
  // this is duplicated, and ADR-015 for why these particular buckets).
  function computeDisplayStatus(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays <= 7) return "ThisWeek";
    if (diffDays <= 14) return "NextWeek";
    if (diffDays <= 30) return "ThisMonth";
    return "Later";
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
    document.getElementById("dashboard-toolbar").hidden = state === "loading" || state === "error";
    document.getElementById("stat-tiles").hidden =
      state === "loading" || state === "error" || allRecords.filter((r) => !r.isDone).length === 0;
  }

  // Tile counts reflect ALL active (not-done) reminders, ignoring the
  // current search/category filter — a stable "at a glance" total, not
  // affected by what you happen to be searching for right now.
  function updateStatTiles(activeRecords) {
    const counts = { Overdue: 0, Today: 0, ThisWeek: 0, NextWeek: 0, ThisMonth: 0, Later: 0 };
    activeRecords.forEach((r) => {
      counts[r.displayStatus] = (counts[r.displayStatus] || 0) + 1;
    });
    document.getElementById("count-overdue").textContent = counts.Overdue;
    document.getElementById("count-today").textContent = counts.Today;
    document.getElementById("count-this-week").textContent = counts.ThisWeek;
    document.getElementById("count-next-week").textContent = counts.NextWeek;
    document.getElementById("count-this-month").textContent = counts.ThisMonth;
    document.getElementById("count-later").textContent = counts.Later;
  }

  document.querySelectorAll(".stat-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const target = document.getElementById(tile.dataset.target);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  function formatMoney(amount) {
    if (amount === null || amount === undefined || amount === "") return "";
    return amountsVisible ? ` — RM ${Number(amount).toFixed(2)}` : ` — RM ••••`;
  }

  const toggleAmountsBtn = document.getElementById("btn-toggle-amounts");
  toggleAmountsBtn.addEventListener("click", () => {
    amountsVisible = !amountsVisible;
    toggleAmountsBtn.textContent = amountsVisible ? "👁️" : "🙈";
    toggleAmountsBtn.title = amountsVisible ? "Hide amounts" : "Show amounts";
    applyFiltersAndRender();
  });

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
    updateStatTiles(active);

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
        const list = groupLists[record.displayStatus] || groupLists.Later;
        list.appendChild(renderItem(record));
      });

    document.querySelectorAll(".group").forEach((group, i) => {
      const key = GROUP_KEYS[i];
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

  // Sequential create — used by CSV import (item 3). Sequential (not
  // parallel) so one failure's error message is still attributable to a
  // specific row, and so we don't hammer Apps Script with a burst of
  // simultaneous requests.
  async function createMany(rows) {
    let successCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = await Api.call("createRecord", row);
      if (result.success) {
        successCount++;
        upsertLocal({
          id: result.data.id,
          ...row,
          isDone: false,
          displayStatus: computeDisplayStatus(row.dueDate),
        });
      } else {
        errors.push(`Row ${i + 2}: ${result.message || "failed"}`); // +2: header row + 1-index
      }
    }

    return { successCount, errors };
  }

  searchInput.addEventListener("input", applyFiltersAndRender);
  categorySelect.addEventListener("change", applyFiltersAndRender);

  return {
    load, setRecords, upsertLocal, removeLocal, computeDisplayStatus, createMany,
    setCategories, getCategories: () => allCategories.slice(),
  };
})();
