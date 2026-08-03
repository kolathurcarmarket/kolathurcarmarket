let SESSION = null;
let EDIT_CAR_ID = null;

document.addEventListener("DOMContentLoaded", async () => {
  SESSION = requireRole("dealer");
  if (!SESSION) return;

  document.getElementById("current-username").textContent =
    SESSION.fullName || SESSION.username;
  document.getElementById("current-shop").textContent = SESSION.shopName || "";
  document.getElementById("avatar-initials").textContent = initials(
    SESSION.fullName || SESSION.username
  );
  document.getElementById("logout-btn").addEventListener("click", logout);

  await loadCars();

  document
    .getElementById("form-car")
    .addEventListener("submit", guardClick(document.getElementById("btn-save-car"), saveCar));

  document.getElementById("btn-open-add-car").addEventListener("click", () => openCarModal());
  document.querySelectorAll("[data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => document.getElementById("car-modal").classList.remove("open"))
  );

  document.getElementById("car-search").addEventListener(
    "input",
    debounce((e) => filterCars(e.target.value), 200)
  );

  document.querySelectorAll(".status-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".status-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterCars(document.getElementById("car-search").value, btn.dataset.status);
    });
  });
});

let ALL_CARS = [];

async function loadCars() {
  const grid = document.getElementById("cars-grid");
  grid.innerHTML = `<div class="empty-row">Loading your listings…</div>`;

  const { data, error } = await window.db.rpc("dealer_list_cars", { p_dealer_id: SESSION.id });
  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-row">${escapeHtml(friendlyError(error))}</div>`;
    return;
  }
  ALL_CARS = data || [];
  document.getElementById("stat-listings").textContent = ALL_CARS.length;
  document.getElementById("stat-available").textContent = ALL_CARS.filter(
    (c) => c.status === "available"
  ).length;
  document.getElementById("stat-sold").textContent = ALL_CARS.filter(
    (c) => c.status === "sold"
  ).length;
  renderCars(ALL_CARS);
}

function renderCars(list) {
  const grid = document.getElementById("cars-grid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-row">No cars listed yet. Add your first car to build your lot.</div>`;
    return;
  }
  grid.innerHTML = list
    .map(
      (c) => `
    <article class="car-card" data-id="${c.id}">
      <div class="car-card__media" style="${
        c.image_url ? `background-image:url('${escapeHtml(c.image_url)}')` : ""
      }">
        ${!c.image_url ? '<span class="car-card__placeholder">No photo</span>' : ""}
        <span class="status-pill status-pill--${c.status}">${escapeHtml(c.status)}</span>
      </div>
      <div class="car-card__body">
        <h3>${escapeHtml(c.year || "")} ${escapeHtml(c.make)} ${escapeHtml(c.model)}</h3>
        <div class="car-card__price">${formatCurrency(c.price)}</div>
        <div class="car-card__meta">
          <span>${formatKm(c.km_driven)}</span>
          <span>${escapeHtml(c.fuel_type || "—")}</span>
          <span>${escapeHtml(c.transmission || "—")}</span>
        </div>
        <div class="car-card__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${c.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-action="toggle" data-id="${c.id}" data-status="${c.status}">
            Mark ${c.status === "available" ? "sold" : "available"}
          </button>
          <button class="btn btn--danger btn--sm" data-action="delete" data-id="${c.id}">Delete</button>
        </div>
      </div>
    </article>`
    )
    .join("");

  grid.querySelectorAll('[data-action="edit"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      const car = ALL_CARS.find((c) => c.id === btn.dataset.id);
      if (car) openCarModal(car);
    })
  );

  grid.querySelectorAll('[data-action="toggle"]').forEach((btn) =>
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        const car = ALL_CARS.find((c) => c.id === btn.dataset.id);
        const newStatus = btn.dataset.status === "available" ? "sold" : "available";
        const { error } = await window.db.rpc("dealer_update_car", {
          p_dealer_id: SESSION.id,
          p_car_id: car.id,
          p_make: car.make,
          p_model: car.model,
          p_year: car.year,
          p_price: car.price,
          p_km: car.km_driven,
          p_fuel: car.fuel_type,
          p_trans: car.transmission,
          p_color: car.color,
          p_desc: car.description,
          p_image: car.image_url,
          p_status: newStatus,
        });
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        toast("Listing updated.", "success");
        await loadCars();
      })
    )
  );

  grid.querySelectorAll('[data-action="delete"]').forEach((btn) =>
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        if (!confirm("Delete this listing? This can't be undone.")) return;
        const { error } = await window.db.rpc("dealer_delete_car", {
          p_dealer_id: SESSION.id,
          p_car_id: btn.dataset.id,
        });
        if (error) {
          toast(friendlyError(error), "error");
          return;
        }
        toast("Listing deleted.", "success");
        await loadCars();
      })
    )
  );
}

function filterCars(query, status) {
  const q = (query || "").trim().toLowerCase();
  const activeStatus =
    status || document.querySelector(".status-filter.active")?.dataset.status || "all";
  let list = ALL_CARS;
  if (activeStatus !== "all") list = list.filter((c) => c.status === activeStatus);
  if (q) {
    list = list.filter((c) =>
      [c.make, c.model, c.color, c.fuel_type].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }
  renderCars(list);
}

function openCarModal(car = null) {
  EDIT_CAR_ID = car?.id || null;
  document.getElementById("car-modal-title").textContent = car ? "Edit listing" : "Add a car";
  document.getElementById("car-make").value = car?.make || "";
  document.getElementById("car-model").value = car?.model || "";
  document.getElementById("car-year").value = car?.year || "";
  document.getElementById("car-price").value = car?.price || "";
  document.getElementById("car-km").value = car?.km_driven || "";
  document.getElementById("car-fuel").value = car?.fuel_type || "Petrol";
  document.getElementById("car-trans").value = car?.transmission || "Manual";
  document.getElementById("car-color").value = car?.color || "";
  document.getElementById("car-image").value = car?.image_url || "";
  document.getElementById("car-desc").value = car?.description || "";
  document.getElementById("car-form-error").textContent = "";
  document.getElementById("car-modal").classList.add("open");
  document.getElementById("car-make").focus();
}

async function saveCar(e) {
  e.preventDefault();
  const errorEl = document.getElementById("car-form-error");
  errorEl.textContent = "";

  const payload = {
    p_make: document.getElementById("car-make").value.trim(),
    p_model: document.getElementById("car-model").value.trim(),
    p_year: Number(document.getElementById("car-year").value) || null,
    p_price: Number(document.getElementById("car-price").value) || null,
    p_km: Number(document.getElementById("car-km").value) || null,
    p_fuel: document.getElementById("car-fuel").value,
    p_trans: document.getElementById("car-trans").value,
    p_color: document.getElementById("car-color").value.trim() || null,
    p_desc: document.getElementById("car-desc").value.trim() || null,
    p_image: document.getElementById("car-image").value.trim() || null,
  };

  if (!payload.p_make || !payload.p_model) {
    errorEl.textContent = "Make and model are required.";
    return;
  }

  let error;
  if (EDIT_CAR_ID) {
    ({ error } = await window.db.rpc("dealer_update_car", {
      p_dealer_id: SESSION.id,
      p_car_id: EDIT_CAR_ID,
      ...payload,
      p_status: ALL_CARS.find((c) => c.id === EDIT_CAR_ID)?.status || "available",
    }));
  } else {
    ({ error } = await window.db.rpc("dealer_add_car", {
      p_dealer_id: SESSION.id,
      ...payload,
    }));
  }

  if (error) {
    console.error(error);
    errorEl.textContent = friendlyError(error);
    return;
  }

  toast(EDIT_CAR_ID ? "Listing updated." : "Car added to your lot.", "success");
  document.getElementById("car-modal").classList.remove("open");
  document.getElementById("form-car").reset();
  await loadCars();
}
