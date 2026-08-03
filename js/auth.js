/**
 * Login view logic — wired up once by app.js, not auto-run on load,
 * since login/admin/dealer all live in one page now.
 */
function wireLoginView() {
  const tabs = document.querySelectorAll(".role-tab");
  const panels = {
    admin: document.getElementById("panel-admin"),
    dealer: document.getElementById("panel-dealer"),
  };
  const plate = document.getElementById("plate-role-label");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const role = tab.dataset.role;
      Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle("active", key === role);
      });
      if (plate) plate.textContent = role === "admin" ? "ADMIN ACCESS" : "DEALER ACCESS";
    });
  });

  document.querySelectorAll(".pin-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.textContent = showing ? "Show" : "Hide";
    });
  });

  /* -------------------- Admin login -------------------- */
  const adminForm = document.getElementById("form-admin-login");
  const adminBtn = document.getElementById("btn-admin-login");

  adminForm?.addEventListener(
    "submit",
    guardClick(adminBtn, async (e) => {
      e.preventDefault();
      const username = document.getElementById("admin-username").value.trim();
      const pin = document.getElementById("admin-pin").value.trim();
      const errorEl = document.getElementById("admin-login-error");
      errorEl.textContent = "";

      if (!username || !pin) {
        errorEl.textContent = "Enter both username and PIN.";
        return;
      }

      const { data, error } = await window.db.rpc("admin_login", {
        p_username: username,
        p_pin: pin,
      });

      if (error) {
        console.error(error);
        errorEl.textContent = friendlyError(error);
        return;
      }
      if (!data || data.length === 0) {
        errorEl.textContent = "Incorrect username or PIN.";
        return;
      }

      const session = { role: "admin", id: data[0].id, username: data[0].username };
      saveSession(session);
      toast("Welcome back, admin.", "success");
      switchView("admin");
      document.getElementById("admin-current-username").textContent = session.username;
      loadAdminData(session);
    })
  );

  /* -------------------- Dealer login -------------------- */
  const dealerForm = document.getElementById("form-dealer-login");
  const dealerBtn = document.getElementById("btn-dealer-login");

  dealerForm?.addEventListener(
    "submit",
    guardClick(dealerBtn, async (e) => {
      e.preventDefault();
      const username = document.getElementById("dealer-username").value.trim();
      const pin = document.getElementById("dealer-pin").value.trim();
      const errorEl = document.getElementById("dealer-login-error");
      errorEl.textContent = "";

      if (!username || !pin) {
        errorEl.textContent = "Enter both username and PIN.";
        return;
      }

      const { data, error } = await window.db.rpc("dealer_login", {
        p_username: username,
        p_pin: pin,
      });

      if (error) {
        console.error(error);
        errorEl.textContent = friendlyError(error);
        return;
      }
      if (!data || data.length === 0) {
        errorEl.textContent =
          "No account found. Ask your admin to add your username & PIN first.";
        return;
      }

      const d = data[0];
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
    })
  );
}
