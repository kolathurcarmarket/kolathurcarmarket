/**
 * App bootstrap for the single-page portal (login / admin / dealer
 * views all live in index.html; this wires every view once and then
 * routes to the right one based on whatever session already exists).
 */

// Registering this is what makes the "Install app" / "Add to Home
// Screen" prompt available, and lets the app open instantly (and
// keep working with a flaky connection) once installed.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW registration failed:", err));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireLoginView();
  wireAdminView();
  wireDealerView();

  const session = getSession();
  if (session?.role === "admin") {
    switchView("admin");
    document.getElementById("admin-current-username").textContent = session.username;
    loadAdminData(session);
  } else if (session?.role === "dealer") {
    switchView("dealer");
    hydrateDealerHeader(session);
    loadDealerData(session);
  } else {
    switchView("login");
  }
});
