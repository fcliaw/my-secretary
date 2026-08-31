// My Secretary — Report: full reminder list + this month's activity log

const Report = (() => {
  const overlay = document.getElementById("view-report");
  const loadingEl = document.getElementById("report-loading");
  const contentEl = document.getElementById("report-content");
  const categoryFilter = document.getElementById("report-category-filter");
  const searchInput = document.getElementById("report-search");
  const remindersBody = document.querySelector("#report-reminders-table tbody");
  const logsBody = document.querySelector("#report-logs-table tbody");
  const logsEmpty = document.getElementById("report-logs-empty");

  let allRecords = []; // includes Done items, unlike the Dashboard

  const STATUS_LABELS = {
    Overdue: "Overdue", Today: "Today", ThisWeek: "Within 7 Days",
    NextWeek: "Within 14 Days", ThisMonth: "Within 30 Days", Later: "Later",
  };

  function renderCategoryFilterOptions() {
    const previous = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">All categories</option>';
    Dashboard.getCategories().forEach((cat) => categoryFilter.appendChild(new Option(cat, cat)));
    if (Dashboard.getCategories().includes(previous)) categoryFilter.value = previous;
  }

  function renderReminders() {
    const category = categoryFilter.value;
    const query = searchInput.value.trim().toLowerCase();
    const rows = allRecords.filter((r) => {
      const matchesCategory = !category || r.category === category;
      const matchesQuery =
        !query ||
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        (r.notes || "").toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });

    remindersBody.innerHTML = "";
    rows
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .forEach((r) => {
        const tr = document.createElement("tr");
        const status = r.isDone ? "Done" : (STATUS_LABELS[r.displayStatus] || r.displayStatus);
        tr.innerHTML = `<td>${escapeHtml(r.title)}</td><td>${escapeHtml(r.category)}</td><td>${r.dueDate}</td><td>${status}</td>`;

        const actionsTd = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn btn-small";
        editBtn.textContent = "Edit";
        // Report shows Done items too — this is the only way to change
        // (or free up) the category on an item the Dashboard hides.
        editBtn.addEventListener("click", () => Forms.openEdit(r));
        actionsTd.appendChild(editBtn);
        tr.appendChild(actionsTd);

        remindersBody.appendChild(tr);
      });
  }

  function renderLogs(logs) {
    const now = new Date();
    const thisMonth = logs.filter((l) => {
      const d = new Date(l.timestamp.replace(" ", "T"));
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });

    logsBody.innerHTML = "";
    thisMonth.forEach((l) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${l.timestamp}</td><td>${escapeHtml(l.action)}</td><td>${escapeHtml(l.itemTitle)}</td><td>${escapeHtml(l.result)}</td>`;
      logsBody.appendChild(tr);
    });

    document.getElementById("report-logs-table").hidden = thisMonth.length === 0;
    logsEmpty.hidden = thisMonth.length > 0;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  async function open() {
    overlay.hidden = false;
    loadingEl.hidden = false;
    contentEl.hidden = true;

    const [recordsResult, logsResult] = await Promise.all([
      Api.call("getRecords"),
      Api.call("getLogs"),
    ]);

    loadingEl.hidden = true;
    contentEl.hidden = false;

    allRecords = recordsResult.success ? (recordsResult.data.records || []) : [];
    renderCategoryFilterOptions();
    renderReminders();
    renderLogs(logsResult.success ? (logsResult.data.logs || []) : []);
  }

  function close() {
    overlay.hidden = true;
  }

  // Called from app.js after Add/Edit saves — keeps the Report's already
  // -fetched list in sync without needing to close and reopen it.
  function upsertLocal(record) {
    const i = allRecords.findIndex((r) => r.id === record.id);
    if (i === -1) {
      allRecords.push(record);
    } else {
      allRecords[i] = record;
    }
    if (!overlay.hidden) {
      renderCategoryFilterOptions();
      renderReminders();
    }
  }

  categoryFilter.addEventListener("change", renderReminders);
  searchInput.addEventListener("input", renderReminders);
  document.getElementById("btn-report").addEventListener("click", open);
  document.getElementById("btn-close-report").addEventListener("click", close);

  return { open, close, upsertLocal };
})();
