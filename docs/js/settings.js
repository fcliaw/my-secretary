// My Secretary — Settings: manage categories (Stage 9, ADR-019)

const Settings = (() => {
  const overlay = document.getElementById("view-settings");
  const listEl = document.getElementById("settings-category-list");
  const errorEl = document.getElementById("settings-error");
  const addForm = document.getElementById("add-category-form");
  const newCategoryInput = document.getElementById("field-new-category");

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
  }

  function renderList() {
    listEl.innerHTML = "";
    Dashboard.getCategories().forEach((name) => {
      const li = document.createElement("li");

      const nameSpan = document.createElement("span");
      nameSpan.className = "category-name";
      nameSpan.textContent = name;

      const actions = document.createElement("div");
      actions.className = "category-actions";

      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      renameBtn.className = "btn btn-small";
      renameBtn.textContent = "Rename";
      renameBtn.addEventListener("click", () => handleRename(name));
      actions.appendChild(renameBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-small btn-danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => handleDelete(name));
      actions.appendChild(deleteBtn);

      li.appendChild(nameSpan);
      li.appendChild(actions);
      listEl.appendChild(li);
    });
  }

  function open() {
    clearError();
    renderList();
    overlay.hidden = false;
  }

  function close() {
    overlay.hidden = true;
  }

  async function handleRename(oldName) {
    const newName = prompt("Rename category:", oldName);
    if (!newName || newName.trim() === "" || newName.trim() === oldName) return;

    const result = await Api.call("renameCategory", { oldName, newName: newName.trim() });
    if (!result.success) {
      showError(result.message || "Unable to rename category.");
      return;
    }
    clearError();
    Dashboard.setCategories(result.data.categories);
    renderList();
  }

  async function handleDelete(name) {
    if (!confirm(`Delete category "${name}"?`)) return;

    const result = await Api.call("deleteCategory", { name });
    if (!result.success) {
      showError(result.message || "Unable to delete category.");
      return;
    }
    clearError();
    Dashboard.setCategories(result.data.categories);
    renderList();
  }

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = newCategoryInput.value.trim();
    if (!name) return;

    const result = await Api.call("addCategory", { name });
    if (!result.success) {
      showError(result.message || "Unable to add category.");
      return;
    }
    clearError();
    newCategoryInput.value = "";
    Dashboard.setCategories(result.data.categories);
    renderList();
  });

  document.getElementById("btn-settings").addEventListener("click", open);
  document.getElementById("btn-close-settings").addEventListener("click", close);

  return { open, close };
})();
