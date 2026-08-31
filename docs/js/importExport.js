// My Secretary — CSV template download + import (item 3)
// No external library — CSV is simple enough to parse/generate by hand,
// and both Excel and Google Sheets open/save CSV natively.

const ImportExport = (() => {
  const CSV_HEADERS = ["Category", "Title", "DueDate (YYYY-MM-DD)", "RecurrenceInterval", "Amount", "Notes"];

  // One example row per valid Category, each demonstrating a different
  // valid RecurrenceInterval — this teaches the allowed values through
  // real, importable example data instead of header text (which gets cut
  // off by column width) or separate comment rows (which confused
  // Excel's delimiter auto-detection when opened by double-click).
  const EXAMPLE_ROWS = [
    ["Fixed Deposit", "Maybank FD - Emma", "2026-09-15", "Yearly", "10000", ""],
    ["School Fee", "School Fee - Emma", "2026-09-15", "One-off", "500", ""],
    ["Insurance", "Car Insurance", "2026-09-15", "Yearly", "1200", ""],
    ["License", "Driving License Renewal", "2026-09-15", "Quarterly", "", ""],
    ["Subscription", "Netflix", "2026-09-15", "Monthly", "45", ""],
    ["Other", "Gym Membership", "2026-09-15", "One-off", "", ""],
  ];

  // Full readable labels the user actually types/sees — matches the
  // wording already used in the Add Reminder dropdowns, so there's only
  // one vocabulary to remember. Maps to the internal codes Api.gs expects.
  const CATEGORY_LABELS = {
    "Fixed Deposit": "FixedDeposit",
    "School Fee": "SchoolFee",
    "Insurance": "Insurance",
    "License": "License",
    "Subscription": "Subscription",
    "Other": "Other",
  };
  const RECURRENCE_LABELS = {
    "One-off": "None",
    "Monthly": "Monthly",
    "Quarterly": "Quarterly",
    "Yearly": "Yearly",
  };

  // Lenient on purpose: strips spaces/hyphens/underscores and lowercases,
  // so "FixedDeposit", "Fixed Deposit", "fixed-deposit" all match — users
  // typing the template by hand shouldn't get rejected over formatting.
  function normalize(label) {
    return (label || "").trim().toLowerCase().replace(/[\s\-_]/g, "");
  }

  function labelToCategory(label) {
    const found = Object.keys(CATEGORY_LABELS).find((k) => normalize(k) === normalize(label));
    return found ? CATEGORY_LABELS[found] : null;
  }

  function labelToRecurrence(label) {
    const found = Object.keys(RECURRENCE_LABELS).find((k) => normalize(k) === normalize(label));
    return found ? RECURRENCE_LABELS[found] : null;
  }

  function downloadTemplate() {
    const lines = [CSV_HEADERS.join(","), ...EXAMPLE_ROWS.map((row) => row.join(","))];
    const csv = lines.join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-secretary-import-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Minimal CSV line parser — handles plain comma-separated values and
  // double-quoted fields (with "" as an escaped quote). Good enough for
  // a simple template; not a full RFC 4180 parser.
  function parseCsvLine(line) {
    const fields = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields.map((f) => f.trim());
  }

  function parseCsv(text) {
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return { rows: [], errors: ["File has no data rows."] };

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      const [categoryLabel, title, dueDate, recurrenceLabel, amount, notes] = fields;
      const rowNum = i + 1; // 1-indexed, includes header

      const category = labelToCategory(categoryLabel);
      if (!category) {
        errors.push(`Row ${rowNum}: unknown category "${categoryLabel}" (see instructions in the template)`);
        continue;
      }
      if (!title || title.trim() === "") {
        errors.push(`Row ${rowNum}: title is required`);
        continue;
      }
      if (!dueDate || isNaN(new Date(dueDate).getTime())) {
        errors.push(`Row ${rowNum}: invalid due date "${dueDate}"`);
        continue;
      }
      const recurrence = recurrenceLabel ? labelToRecurrence(recurrenceLabel) : "None";
      if (recurrenceLabel && !recurrence) {
        errors.push(`Row ${rowNum}: unknown repeat value "${recurrenceLabel}" (see instructions in the template)`);
        continue;
      }
      const amountValue = amount === "" || amount === undefined ? null : Number(amount);
      if (amountValue !== null && (isNaN(amountValue) || amountValue < 0)) {
        errors.push(`Row ${rowNum}: invalid amount "${amount}"`);
        continue;
      }

      rows.push({
        category,
        title,
        dueDate,
        recurrenceInterval: recurrence || "None",
        amount: amountValue,
        notes: notes || "",
      });
    }

    return { rows, errors };
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  return { downloadTemplate, parseCsv, readFileAsText };
})();
