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
   Placeholders — the dealer will describe the exact flow next.
=================================================================== */
function openQuickCalcAddExpense() {
  toast("Tell me the flow for this and I'll wire it up.", "info");
}

function openQuickCalcAddEarning() {
  toast("Tell me the flow for this and I'll wire it up.", "info");
}
