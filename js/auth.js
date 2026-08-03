document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, skip straight to the right dashboard.
  const existing = getSession();
  if (existing?.role === "admin") window.location.href = "admin.html";
  if (existing?.role === "dealer") window.location.href = "dealer.html";

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

      saveSession({ role: "admin", id: data[0].id, username: data[0].username });
      toast("Welcome back, admin.", "success");
      window.location.href = "admin.html";
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

      const dealer = data[0];
      saveSession({
        role: "dealer",
        id: dealer.id,
        username: dealer.username,
        fullName: dealer.full_name,
        shopName: dealer.shop_name,
      });
      toast(`Welcome, ${dealer.full_name || dealer.username}.`, "success");
      window.location.href = "dealer.html";
    })
  );

  // Toggle PIN visibility
  document.querySelectorAll(".pin-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.textContent = showing ? "Show" : "Hide";
    });
  });
});
