/**
 * Login view logic — wired up once by app.js. One form now: it tries
 * admin_login first, then dealer_login, so the person never has to
 * pick a role themselves.
 */
function wireLoginView() {
  document.querySelectorAll(".pin-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.textContent = showing ? "Show" : "Hide";
    });
  });

  const form = document.getElementById("form-login");
  const btn = document.getElementById("btn-login");

  form?.addEventListener(
    "submit",
    guardClick(btn, async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const pin = document.getElementById("login-pin").value.trim();
      const errorEl = document.getElementById("login-error");
      errorEl.textContent = "";

      if (!username || !pin) {
        errorEl.textContent = "Enter both username and PIN.";
        return;
      }

      // Try admin first.
      const adminRes = await window.db.rpc("admin_login", { p_username: username, p_pin: pin });
      if (adminRes.error) {
        console.error(adminRes.error);
        errorEl.textContent = friendlyError(adminRes.error);
        return;
      }
      if (adminRes.data && adminRes.data.length > 0) {
        const session = { role: "admin", id: adminRes.data[0].id, username: adminRes.data[0].username };
        saveSession(session);
        toast("Welcome back, admin.", "success");
        switchView("admin");
        document.getElementById("admin-current-username").textContent = session.username;
        loadAdminData(session);
        return;
      }

      // Not an admin — try dealer.
      const dealerRes = await window.db.rpc("dealer_login", { p_username: username, p_pin: pin });
      if (dealerRes.error) {
        console.error(dealerRes.error);
        errorEl.textContent = friendlyError(dealerRes.error);
        return;
      }
      if (dealerRes.data && dealerRes.data.length > 0) {
        const d = dealerRes.data[0];
        const session = {
          role: "dealer",
          id: d.id,
          username: d.username,
          fullName: d.full_name,
          shopName: d.shop_name,
        };
        saveSession(session);
        toast(`Welcome, ${d.full_name || d.username}.`, "success");
        switchView("dealer");
        hydrateDealerHeader(session);
        loadDealerData(session);
        return;
      }

      // Matched neither.
      errorEl.textContent = "Incorrect username or PIN.";
    })
  );
}
