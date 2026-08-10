/**
 * "Accounts" tab — monthly income / expense ledger.
 *
 * This is the UI shell only: table structure + styling, matching the
 * layout the dealer asked for. Every value is a placeholder ("–") for
 * now — real numbers get wired in once the calculation rules
 * (what counts as Sales, COGS, which expense goes where, etc.) are
 * defined. Kept in its own file so wiring it up later doesn't mean
 * touching dealer.js.
 */

const ACCOUNTS_MONTHS_BACK = 2; // how many month columns to show

function accountsMonthLabels(n) {
  const labels = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d
      .toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      .toUpperCase()
      .replace(" ", "-");
    labels.push(label);
  }
  return labels;
}

function accountsValueRow(label, monthCount, cls, sub) {
  const cells = Array.from({ length: monthCount }, () => `<td>\u2013</td>`).join("");
  const labelHtml = sub ? `<span class="accounts-sub">${escapeHtml(label)}</span>` : escapeHtml(label);
  return `<tr class="${cls}"><td>${labelHtml}</td>${cells}</tr>`;
}

function accountsSectionRow(label, monthCount) {
  return `<tr class="accounts-row--header-label"><td>${escapeHtml(label)}</td><td colspan="${monthCount}"></td></tr>`;
}

function renderAccountsPlaceholder() {
  const host = document.getElementById("accounts-view");
  const months = accountsMonthLabels(ACCOUNTS_MONTHS_BACK);
  const n = months.length;

  const headerCells = months.map((m) => `<th>${escapeHtml(m)}</th>`).join("");

  const rows = [
    accountsValueRow("Sales", n, "accounts-row--income"),
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

  host.innerHTML = `
    <div class="page-head" style="margin-bottom:1rem;">
      <div>
        <h1>Accounts</h1>
        <p>Monthly income &amp; expenses at a glance.</p>
      </div>
    </div>
    <div class="panel accounts-table-wrap">
      <table class="accounts-table">
        <thead><tr><th>Category</th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
