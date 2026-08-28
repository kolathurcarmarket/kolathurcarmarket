/**
 * Accounts -> Quick Calc sub-tab.
 *
 * Two big buttons: "Add Expenses" and "Add Earning". This is the UI
 * shell only — the dealer is describing the exact flow step by step,
 * so the click handlers don't do anything real yet. Kept in its own
 * file (separate from accounts.js) so wiring the real logic later
 * doesn't mean touching the Entries / Profit and Loss code.
 */

function renderQuickCalcView() {
  const body = document.getElementById("accounts-subtab-body");
  body.innerHTML = `
    <p class="wizard-hint" style="text-align:left;margin-bottom:1.2rem;">Fast entry for a one-off expense or a one-off earning — no need to attach it to a car sale.</p>
    <div class="quick-calc-buttons">
      <button type="button" class="quick-calc-btn quick-calc-btn--expense" id="qc-add-expense">
        ${quickCalcIcon("expense")}
        <span>Add Expenses</span>
      </button>
      <button type="button" class="quick-calc-btn quick-calc-btn--earning" id="qc-add-earning">
        ${quickCalcIcon("earning")}
        <span>Add Earning</span>
      </button>
    </div>
  `;

  document.getElementById("qc-add-expense").addEventListener("click", () => openQuickCalcAddExpense());
  document.getElementById("qc-add-earning").addEventListener("click", () => openQuickCalcAddEarning());
}

function quickCalcIcon(kind) {
  if (kind === "expense") {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
  }
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;
}

/* ===================================================================
   Add Expenses — amount, then category (category list comes from
   the admin-managed expense_categories table).
=================================================================== */
let qcExpenseAmount = null;

function openQuickCalcAddExpense() {
  qcExpenseAmount = null;
  document.getElementById("quickcalc-modal-title").textContent = "Add Expenses";
  renderQuickCalcExpenseStep1();
  document.getElementById("quickcalc-modal").classList.add("open");
  wireQuickCalcModalClose();
}

function wireQuickCalcModalClose() {
  document.querySelectorAll("#quickcalc-modal [data-close-modal]").forEach((el) => {
    el.onclick = () => document.getElementById("quickcalc-modal").classList.remove("open");
  });
}

function renderQuickCalcExpenseStep1() {
  const body = document.getElementById("quickcalc-modal-body");
  body.innerHTML = `
    <div class="wizard-question">How much did you spend?</div>
    <div class="wizard-input-wrap">
      <input class="wizard-input" id="qce-amount" type="number" inputmode="numeric" placeholder="e.g. 1500" value="${qcExpenseAmount ?? ""}" />
      <p class="form-error" id="qce-error" role="alert"></p>
    </div>
    <div class="wizard-nav">
      <button type="button" class="btn btn--primary btn--block" id="qce-next-btn">Next</button>
    </div>
  `;
  const input = document.getElementById("qce-amount");
  input.focus();
  input.addEventListener("focus", () => scrollFieldIntoView(input));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("qce-next-btn").click();
    }
  });
  document.getElementById("qce-next-btn").addEventListener("click", () => {
    const errorEl = document.getElementById("qce-error");
    const val = input.value.trim();
    if (!val || isNaN(Number(val)) || Number(val) <= 0) {
      errorEl.textContent = "Please enter a valid amount.";
      return;
    }
    qcExpenseAmount = Number(val);
    renderQuickCalcExpenseStep2();
  });
}

async function renderQuickCalcExpenseStep2() {
  const body = document.getElementById("quickcalc-modal-body");
  body.innerHTML = `
    <div class="wizard-question">Which category?</div>
    <div class="wizard-choices" id="qce-categories"><div class="empty-row">Loading categories…</div></div>
    <div class="wizard-nav">
      <button type="button" class="wizard-back" id="qce-back-btn">← Back</button>
    </div>
  `;
  document.getElementById("qce-back-btn").addEventListener("click", renderQuickCalcExpenseStep1);

  const { data, error } = await window.db.rpc("dealer_list_expense_categories", { p_token: DEALER_SESSION.token });
  const list = document.getElementById("qce-categories");
  if (error) {
    list.innerHTML = `<p class="form-error">${escapeHtml(friendlyError(error))}</p>`;
    return;
  }
  if (!data || !data.length) {
    list.innerHTML = `<p class="wizard-hint">No categories yet — ask your admin to add some.</p>`;
    return;
  }

  list.innerHTML = data
    .map((c) => `<button type="button" class="wizard-choice" data-cat-id="${c.id}">${escapeHtml(c.name)}</button>`)
    .join("");

  list.querySelectorAll(".wizard-choice").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const { error: err2 } = await window.db.rpc("dealer_add_expense", {
        p_token: DEALER_SESSION.token,
        p_category_id: btn.dataset.catId,
        p_amount: qcExpenseAmount,
      });
      if (err2) {
        toast(friendlyError(err2), "error");
        btn.disabled = false;
        return;
      }
      document.getElementById("quickcalc-modal").classList.remove("open");
      toast(`${formatCurrency(qcExpenseAmount)} expense recorded.`, "success");
    });
  });
}

/* ===================================================================
   Add Earning — placeholder until the dealer describes this flow.
=================================================================== */
function openQuickCalcAddEarning() {
  toast("Tell me the flow for this and I'll wire it up.", "info");
}
