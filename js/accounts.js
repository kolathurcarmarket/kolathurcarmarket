/**
 * "Accounts" tab — two sub-tabs:
 *   1. Entries          — real sale records (car + sale amount + the
 *                          two commissions + earning), newest first.
 *   2. Profit and Loss  — monthly ledger. "Sales" is now real data,
 *                          pulled from the same sale entries (summed
 *                          by month). Everything else (COGS, Expenses,
 *                          Total Expenses, Net Profit, Outstanding)
 *                          stays a placeholder until there's an
 *                          expense-entry feature to source them from.
 *
 * Kept in its own file so this can keep growing without touching
 * dealer.js.
 */

let ACCOUNTS_SUBTAB = "quickcalc"; // "quickcalc" | "entries" | "pnl"
let SALES_ENTRIES = [];

function renderAccountsView() {
  const host = document.getElementById("accounts-view");
  host.innerHTML = `
    <div class="page-head" style="margin-bottom:1rem;">
      <div>
        <h1>Accounts</h1>
        <p>Sale entries and monthly profit &amp; loss.</p>
      </div>
    </div>
    <div class="garage-tabs" style="margin-bottom:1.2rem;" role="tablist" aria-label="Choose accounts view">
      <button class="garage-tab ${ACCOUNTS_SUBTAB === "quickcalc" ? "active" : ""}" data-subtab="quickcalc" role="tab">Quick Calc</button>
      <button class="garage-tab ${ACCOUNTS_SUBTAB === "entries" ? "active" : ""}" data-subtab="entries" role="tab">Entries</button>
      <button class="garage-tab ${ACCOUNTS_SUBTAB === "pnl" ? "active" : ""}" data-subtab="pnl" role="tab">Profit and Loss</button>
    </div>
    <div id="accounts-subtab-body"></div>
  `;

  host.querySelectorAll("[data-subtab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ACCOUNTS_SUBTAB = btn.dataset.subtab;
      renderAccountsView();
    });
  });

  if (ACCOUNTS_SUBTAB === "quickcalc") {
    renderQuickCalcView(); // lives in js/quick-calc.js
  } else if (ACCOUNTS_SUBTAB === "entries") {
    loadAndRenderEntries();
  } else {
    loadAndRenderProfitLoss();
  }
}

/* ===================================================================
   Shared: fetch sale entries
=================================================================== */
async function fetchSalesEntries() {
  const { data, error } = await window.db.rpc("dealer_list_sales", { p_token: DEALER_SESSION.token });
  if (error) {
    console.error(error);
    return { entries: [], error };
  }
  SALES_ENTRIES = data || [];
  return { entries: SALES_ENTRIES, error: null };
}

/* ===================================================================
   Entries — real sale records
=================================================================== */
async function loadAndRenderEntries() {
  const body = document.getElementById("accounts-subtab-body");
  body.innerHTML = `<div class="empty-row">Loading entries…</div>`;

  const { entries, error } = await fetchSalesEntries();
  if (error) {
    body.innerHTML = `<div class="empty-row">${escapeHtml(friendlyError(error))}</div>`;
    return;
  }
  renderEntriesTable(entries);
}

function renderEntriesTable(list) {
  const body = document.getElementById("accounts-subtab-body");
  if (!list.length) {
    body.innerHTML = `<div class="empty-row">No sales recorded yet. Mark a car "Sold" from Own Garage to add an entry here.</div>`;
    return;
  }

  const rows = list
    .map(
      (s) => `
    <tr>
      <td style="text-align:left;">${escapeHtml(insuranceLabel(s.sold_at))}</td>
      <td style="text-align:left;">
        ${escapeHtml([s.year, s.make, s.model].filter(Boolean).join(" "))}
        <div class="accounts-sub" style="padding-left:0;">${escapeHtml(s.car_number || "")}</div>
      </td>
      <td>${formatCurrency(s.sale_amount)}</td>
      <td>${formatCurrency(s.seller_commission)}</td>
      <td>${formatCurrency(s.buyer_commission)}</td>
      <td><strong>${formatCurrency(s.total_earning)}</strong></td>
    </tr>`
    )
    .join("");

  body.innerHTML = `
    <div class="panel accounts-table-wrap">
      <table class="accounts-table">
        <thead>
          <tr>
            <th style="text-align:left;">Date</th>
            <th style="text-align:left;">Car</th>
            <th>Sale amount</th>
            <th>Seller commission</th>
            <th>Buyer commission</th>
            <th>Earning</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ===================================================================
   Profit and Loss — monthly ledger
   "Sales" row = real sum of sale-entry earnings for that month.
   Everything else stays a placeholder (no expense-entry source yet).
=================================================================== */
const ACCOUNTS_MONTHS_BACK = 2;

function accountsMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d
      .toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      .toUpperCase()
      .replace(" ", "-");
    months.push({ label, year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function accountsValueRow(label, monthCount, cls, sub) {
  const cells = Array.from({ length: monthCount }, () => `<td>\u2013</td>`).join("");
  const labelHtml = sub ? `<span class="accounts-sub">${escapeHtml(label)}</span>` : escapeHtml(label);
  return `<tr class="${cls}"><td>${labelHtml}</td>${cells}</tr>`;
}

function accountsSectionRow(label, monthCount) {
  return `<tr class="accounts-row--header-label"><td>${escapeHtml(label)}</td><td colspan="${monthCount}"></td></tr>`;
}

async function loadAndRenderProfitLoss() {
  const body = document.getElementById("accounts-subtab-body");
  body.innerHTML = `<div class="empty-row">Loading…</div>`;

  const months = accountsMonths(ACCOUNTS_MONTHS_BACK);
  const { entries, error } = await fetchSalesEntries();
  if (error) {
    body.innerHTML = `<div class="empty-row">${escapeHtml(friendlyError(error))}</div>`;
    return;
  }

  // Sum each month's real earnings (seller + buyer commission) from Entries.
  const salesByMonth = months.map((m) =>
    entries
      .filter((s) => {
        const d = new Date(s.sold_at);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      })
      .reduce((sum, s) => sum + (Number(s.total_earning) || 0), 0)
  );

  const n = months.length;
  const headerCells = months.map((m) => `<th>${escapeHtml(m.label)}</th>`).join("");
  const salesCells = salesByMonth.map((v) => `<td>${formatCurrency(v)}</td>`).join("");
  const salesRow = `<tr class="accounts-row--income"><td>Sales</td>${salesCells}</tr>`;

  const rows = [
    salesRow,
    accountsValueRow("Cost of Goods Sold", n, "accounts-row--income"),
    accountsValueRow("Gross Profit (Sales \u2212 COGS)", n, "accounts-row--income accounts-row--section"),
    accountsSectionRow("Expenses", n),
    accountsValueRow("Rent", n, "accounts-row--expense", true),
    accountsValueRow("Salary", n, "accounts-row--expense", true),
    accountsValueRow("Recharge", n, "accounts-row--expense", true),
    accountsValueRow("Supplies", n, "accounts-row--expense", true),
    accountsValueRow("Maintenance", n, "accounts-row--expense", true),
    accountsValueRow("Other", n, "accounts-row--expense", true),
    accountsValueRow("Investment", n, "accounts-row--expense", true),
    accountsValueRow("Total Expenses", n, "accounts-row--total accounts-row--section"),
    accountsValueRow("Net Profit", n, "accounts-row--profit accounts-row--section"),
    accountsValueRow("Outstanding", n, "accounts-row--profit"),
  ].join("");

  body.innerHTML = `
    <p class="wizard-hint" style="text-align:left;margin-bottom:0.8rem;">"Sales" is your real commission earnings by month. The rest lights up once expense tracking is added.</p>
    <div class="panel accounts-table-wrap">
      <table class="accounts-table">
        <thead><tr><th style="text-align:left;">Category</th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
