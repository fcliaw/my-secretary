// My Secretary — CSV template download + import (item 3)
// No external library — CSV is simple enough to parse/generate by hand,
// and both Excel and Google Sheets open/save CSV natively.
//
// Category is now a user-editable list (ADR-019), not a fixed set — the
// template and parser both work off whatever categories the caller
// currently has (passed in), not a hardcoded dictionary.

const ImportExport = (() => {
  const CSV_HEADERS = ["Category", "Title", "DueDate (YYYY-MM-DD)", "RecurrenceInterval", "Amount", "Notes"];

  const RECURRENCE_LABELS = {
    "One-off": "None",
    "Monthly": "Monthly",
    "Quarterly": "Quarterly",
    "Yearly": "Yearly",
  };
  const RECURRENCE_EXAMPLES = ["Yearly", "One-off", "Monthly", "Quarterly"];

  // Lenient on purpose: strips spaces/hyphens/underscores and lowercases,
  // so "FixedDeposit", "Fixed Deposit", "fixed-deposit" all match — users
  // typing the template by hand shouldn't get rejected over formatting.
  function normalize(label) {
    return (label || "").trim().toLowerCase().replace(/[\s\-_]/g, "");
  }

  function labelToCategory(label, validCategories) {
    return validCategories.find((c) => normalize(c) === normalize(label)) || null;
  }

  function labelToRecurrence(label) {
    const found = Object.keys(RECURRENCE_LABELS).find((k) => normalize(k) === normalize(label));
    return found ? RECURRENCE_LABELS[found] : null;
  }

  // One example row per current category, cycling through the recurrence
  // options so the template also demonstrates those values — real,
  // directly-importable rows instead of separate instruction rows (which
  // confused Excel's delimiter auto-detection when opened by double-click).
  function downloadTemplate(categories) {
    const exampleRows = categories.map((cat, i) => [
      cat,
      `${cat} example`,
      "2026-09-15",
      RECURRENCE_EXAMPLES[i % RECURRENCE_EXAMPLES.length],
      "",
      "",
    ]);
    const lines = [CSV_HEADERS.join(","), ...exampleRows.map((row) => row.join(","))];
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

  function parseCsv(text, validCategories) {
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
    if (lines.length < 2) return { rows: [], errors: ["File has no data rows."] };

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCsvLine(lines[i]);
      const [categoryLabel, title, dueDate, recurrenceLabel, amount, notes] = fields;
      const rowNum = i + 1; // 1-indexed, includes header

      const category = labelToCategory(categoryLabel, validCategories);
      if (!category) {
        errors.push(`Row ${rowNum}: unknown category "${categoryLabel}" — check Settings for the current list`);
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
        errors.push(`Row ${rowNum}: unknown repeat value "${recurrenceLabel}" (One-off/Monthly/Quarterly/Yearly)`);
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
