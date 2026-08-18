let ADMIN_SESSION = null;
let ALL_DEALERS = [];

function wireAdminView() {
  document.getElementById("admin-logout-btn").addEventListener("click", logout);

  document
    .getElementById("form-add-dealer")
    .addEventListener("submit", guardClick(document.getElementById("btn-add-dealer"), addDealer));

  document.getElementById("dealer-search").addEventListener(
    "input",
    debounce((e) => filterDealers(e.target.value), 200)
  );

  document.getElementById("btn-open-add-dealer").addEventListener("click", () => {
    document.getElementById("add-dealer-modal").classList.add("open");
    document.getElementById("new-dealer-username").focus();
  });
  document.querySelectorAll("#add-dealer-modal [data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => {
      document.getElementById("add-dealer-modal").classList.remove("open");
    })
  );

  document
    .getElementById("form-add-category")
    .addEventListener("submit", guardClick(document.getElementById("btn-add-category"), addExpenseCategory));
}

async function loadAdminData(session) {
  ADMIN_SESSION = session;
  await Promise.all([loadStats(), loadDealers(), loadExpenseCategories()]);
}

async function loadStats() {
  const { data, error } = await window.db.rpc("admin_stats", { p_admin_id: ADMIN_SESSION.id });
  if (error) {
    console.error(error);
    toast(friendlyError(error), "error");
    return;
  }
  const s = data?.[0] || {};
  animateCounter("stat-total-dealers", s.total_dealers || 0);
  animateCounter("stat-active-dealers", s.active_dealers || 0);
  animateCounter("stat-total-cars", s.total_cars || 0);
  animateCounter("stat-available-cars", s.available_cars || 0);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 24));
  const tick = () => {
    current = Math.min(target, current + step);
    el.textContent = String(current).padStart(2, "0");
    if (current < target) requestAnimationFrame(tick);
  };
  tick();
}

async function loadDealers() {
  const tbody = document.getElementById("dealers-tbody");
  tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Loading dealers…</td></tr>`;

  const { data, error } = await window.db.rpc("admin_list_dealers", { p_admin_id: ADMIN_SESSION.id });
  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">${escapeHtml(friendlyError(error))}</td></tr>`;
    return;
  }
  ALL_DEALERS = data || [];
  renderDealers(ALL_DEALERS);
}

function renderDealers(list) {
  const tbody = document.getElementById("dealers-tbody");
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No dealers yet. Add your first dealer to get started.</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map(
      (d) => `
    <tr data-id="${d.id}">
      <td>
        <div class="dealer-cell">
          <span class="avatar">${escapeHtml(initials(d.full_name || d.username))}</span>
          <div>
            <div class="dealer-name">${escapeHtml(d.full_name || "—")}</div>
            <div class="dealer-shop">${escapeHtml(d.shop_name || "")}</div>
          </div>
        </div>
      </td>
      <td><span class="plate-chip">${escapeHtml(d.username)}</span></td>
      <td>
        <span class="plate-chip pin-cell" data-pin="${escapeHtml(d.pin || "")}" data-revealed="0">
          ${d.pin ? "••••" : "—"}
        </span>
        ${d.pin ? `<button class="btn btn--ghost btn--sm" data-action="toggle-pin" data-id="${d.id}">Show</button>` : ""}
      </td>
      <td>${escapeHtml(d.phone || "—")}</td>
      <td>${escapeHtml(d.email || "—")}</td>
      <td><span class="status-pill status-pill--${d.status}">${escapeHtml(d.status)}</span></td>
      <td class="row-actions">
        <button class="btn btn--ghost btn--sm" data-action="toggle" data-id="${d.id}" data-status="${d.status}">
          ${d.status === "active" ? "Deactivate" : "Activate"}
        </button>
        <button class="btn btn--ghost btn--sm" data-action="reset-pin" data-id="${d.id}">Reset PIN</button>
        <button class="btn btn--danger btn--sm" data-action="delete" data-id="${d.id}">Remove</button>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll('[data-action="toggle-pin"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const cell = btn.previousElementSibling;
      const revealed = cell.dataset.revealed === "1";
      cell.textContent = revealed ? "••••" : cell.dataset.pin;
      cell.dataset.revealed = revealed ? "0" : "1";
      btn.textContent = revealed ? "Show" : "Hide";
    });
  });

  tbody.querySelectorAll('[data-action="reset-pin"]').forEach((btn) => {
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        const newPin = prompt("Enter a new 4-digit PIN for this dealer:");
        if (newPin === null) return;
        if (!/^\d{4}$/.test(newPin.trim())) {
          toast("PIN must be exactly 4 digits.", "error");
          return;
        }
        const { error } = await window.db.rpc("admin_reset_dealer_pin", {
          p_admin_id: ADMIN_SESSION.id,
          p_dealer_id: btn.dataset.id,
          p_new_pin: newPin.trim(),
        });
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        toast("PIN reset.", "success");
        await loadDealers();
      })
    );
  });

  tbody.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        const newStatus = btn.dataset.status === "active" ? "inactive" : "active";
        const { error } = await window.db.rpc("admin_set_dealer_status", {
          p_admin_id: ADMIN_SESSION.id,
          p_dealer_id: btn.dataset.id,
          p_status: newStatus,
        });
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        toast("Dealer status updated.", "success");
        await loadDealers();
        await loadStats();
      })
    );
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        if (!(await showConfirm("Remove this dealer? Their car listings will be removed too.", { danger: true, confirmLabel: "Remove" }))) return;
        const { error } = await window.db.rpc("admin_delete_dealer", {
          p_admin_id: ADMIN_SESSION.id,
          p_dealer_id: btn.dataset.id,
        });
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        toast("Dealer removed.", "success");
        await loadDealers();
        await loadStats();
      })
    );
  });
}

function filterDealers(query) {
  const q = query.trim().toLowerCase();
  if (!q) return renderDealers(ALL_DEALERS);
  renderDealers(
    ALL_DEALERS.filter((d) =>
      [d.username, d.full_name, d.shop_name, d.phone, d.email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    )
  );
}

async function addDealer(e) {
  e.preventDefault();
  const username = document.getElementById("new-dealer-username").value.trim();
  const pin = document.getElementById("new-dealer-pin").value.trim();
  const fullName = document.getElementById("new-dealer-name").value.trim();
  const phone = document.getElementById("new-dealer-phone").value.trim();
  const email = document.getElementById("new-dealer-email").value.trim();
  const shopName = document.getElementById("new-dealer-shop").value.trim();
  const errorEl = document.getElementById("add-dealer-error");
  errorEl.textContent = "";

  if (!username || !pin || !fullName) {
    errorEl.textContent = "Username, PIN and dealer name are required.";
    return;
  }
  if (!/^\d{4}$/.test(pin)) {
    errorEl.textContent = "PIN must be exactly 4 digits.";
    return;
  }

  const { error } = await window.db.rpc("admin_add_dealer", {
    p_admin_id: ADMIN_SESSION.id,
    p_username: username,
    p_pin: pin,
    p_full_name: fullName,
    p_phone: phone || null,
    p_email: email || null,
    p_shop_name: shopName || null,
  });

  if (error) {
    console.error(error);
    errorEl.textContent = friendlyError(error);
    return;
  }

  toast("Dealer added.", "success");
  document.getElementById("form-add-dealer").reset();
  document.getElementById("add-dealer-modal").classList.remove("open");
  await loadDealers();
  await loadStats();
}

/* ===================================================================
   Expense categories — the list dealers pick from in Quick Calc
=================================================================== */
let ALL_CATEGORIES = [];

async function loadExpenseCategories() {
  const tbody = document.getElementById("categories-tbody");
  tbody.innerHTML = `<tr><td colspan="2" class="empty-row">Loading categories…</td></tr>`;

  const { data, error } = await window.db.rpc("admin_list_expense_categories", { p_admin_id: ADMIN_SESSION.id });
  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="2" class="empty-row">${escapeHtml(friendlyError(error))}</td></tr>`;
    return;
  }
  ALL_CATEGORIES = data || [];
  renderCategories(ALL_CATEGORIES);
}

function renderCategories(list) {
  const tbody = document.getElementById("categories-tbody");
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="empty-row">No categories yet. Add one above.</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map(
      (c) => `
    <tr data-id="${c.id}">
      <td class="cat-name-cell">${escapeHtml(c.name)}</td>
      <td class="row-actions">
        <button class="btn btn--ghost btn--sm" data-action="edit-cat" data-id="${c.id}">Edit</button>
        <button class="btn btn--danger btn--sm" data-action="delete-cat" data-id="${c.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll('[data-action="edit-cat"]').forEach((btn) => {
    btn.addEventListener("click", () => startEditCategory(btn.dataset.id));
  });

  tbody.querySelectorAll('[data-action="delete-cat"]').forEach((btn) => {
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        const cat = ALL_CATEGORIES.find((c) => c.id === btn.dataset.id);
        const ok = await showConfirm(
          `Delete the "${cat?.name || "this"}" category? Existing expense entries keep their record, but it won't be selectable anymore.`,
          { danger: true, confirmLabel: "Delete" }
        );
        if (!ok) return;
        const { error } = await window.db.rpc("admin_delete_expense_category", {
          p_admin_id: ADMIN_SESSION.id,
          p_category_id: btn.dataset.id,
        });
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        toast("Category removed.", "success");
        await loadExpenseCategories();
      })
    );
  });
}

function startEditCategory(id) {
  const row = document.querySelector(`#categories-tbody tr[data-id="${id}"]`);
  const cat = ALL_CATEGORIES.find((c) => c.id === id);
  if (!row || !cat) return;

  row.querySelector(".cat-name-cell").innerHTML = `
    <input type="text" class="search-input" id="cat-edit-input" value="${escapeHtml(cat.name)}" style="width:100%;" />
  `;
  row.querySelector(".row-actions").innerHTML = `
    <button class="btn btn--primary btn--sm" id="cat-save-btn">Save</button>
    <button class="btn btn--ghost btn--sm" id="cat-cancel-btn">Cancel</button>
  `;

  const input = document.getElementById("cat-edit-input");
  input.focus();
  input.select();

  document.getElementById("cat-cancel-btn").addEventListener("click", () => renderCategories(ALL_CATEGORIES));

  document.getElementById("cat-save-btn").addEventListener(
    "click",
    guardClick(document.getElementById("cat-save-btn"), async () => {
      const newName = input.value.trim();
      if (!newName) {
        toast("Category name can't be empty.", "error");
        return;
      }
      const { error } = await window.db.rpc("admin_update_expense_category", {
        p_admin_id: ADMIN_SESSION.id,
        p_category_id: id,
        p_name: newName,
      });
      if (error) {
        toast(friendlyError(error), "error");
        return;
      }
      toast("Category updated.", "success");
      await loadExpenseCategories();
    })
  );
}

async function addExpenseCategory(e) {
  e.preventDefault();
  const input = document.getElementById("new-category-name");
  const name = input.value.trim();
  if (!name) return;

  const { error } = await window.db.rpc("admin_add_expense_category", {
    p_admin_id: ADMIN_SESSION.id,
    p_name: name,
  });

  if (error) {
    toast(friendlyError(error), "error");
    return;
  }

  toast("Category added.", "success");
  input.value = "";
  await loadExpenseCategories();
}
