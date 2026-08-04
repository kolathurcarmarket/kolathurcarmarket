let DEALER_SESSION = null;
let ALL_CARS = [];

/* ===================================================================
   ADD-A-CAR WIZARD — one question per screen, big touch targets.
   Order: board type -> car number (plate builder) -> owners ->
   insurance -> make -> model -> year -> km -> fuel -> transmission ->
   price -> review
=================================================================== */
const INDIAN_STATE_CODES = [
  "AN","AP","AR","AS","BR","CH","CG","DD","DL","DN","GA","GJ","HR","HP",
  "JK","JH","KA","KL","LA","LD","MP","MH","MN","ML","MZ","NL","OD","PY",
  "PB","RJ","SK","TN","TS","TR","UP","UK","WB",
];

const WIZARD_STEPS = [
  {
    key: "board_type", type: "choice", title: "Commercial or own board?",
    options: [
      { value: "commercial", label: "Commercial board (yellow)" },
      { value: "own", label: "Own board (white)" },
    ],
  },
  {
    key: "car_number", type: "plate", title: "What is the car number?",
    hint: "Pick the state, then fill in the rest — like on the actual plate.",
  },
  {
    key: "owners_count", type: "choice", title: "How many owners so far?",
    options: [
      { value: 1, label: "1st owner" },
      { value: 2, label: "2nd owner" },
      { value: 3, label: "3rd owner" },
      { value: 4, label: "4th owner or more" },
    ],
  },
  {
    key: "insurance_validity", type: "date", title: "Insurance valid till?",
    hint: "Tap the box and pick the expiry date.",
  },
  { key: "make", type: "text", title: "What is the car's brand (Make)?", placeholder: "e.g. Maruti Suzuki" },
  { key: "model", type: "text", title: "What is the model?", placeholder: "e.g. Swift" },
  { key: "year", type: "number", title: "Which year model?", placeholder: "e.g. 2019" },
  { key: "km_driven", type: "number", title: "How many kilometers driven?", placeholder: "e.g. 42000" },
  {
    key: "fuel_type", type: "choice", title: "Fuel type?",
    options: [
      { value: "Petrol", label: "Petrol" },
      { value: "Diesel", label: "Diesel" },
      { value: "CNG + Petrol", label: "CNG + Petrol" },
      { value: "CNG + Diesel", label: "CNG + Diesel" },
      { value: "Electric", label: "Electric" },
    ],
  },
  {
    key: "transmission", type: "choice", title: "Transmission?",
    options: [
      { value: "Manual", label: "Manual" },
      { value: "Automatic", label: "Automatic" },
    ],
  },
  { key: "price", type: "price", title: "What is the price?", placeholder: "e.g. 450000" },
  { key: "review", type: "review", title: "Review & move to garage" },
];

let wizardData = {};
let wizardPlate = { state: "", dist: "", series: "", num: "" };
let wizardStep = 0;
let wizardCarId = null;

function wireDealerView() {
  document.getElementById("dealer-logout-btn").addEventListener("click", logout);

  document.getElementById("btn-open-add-car").addEventListener("click", () => startCarWizard());
  document.querySelectorAll("#car-modal [data-close-modal]").forEach((el) =>
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
}

/* -------------------- Wizard: open / navigate -------------------- */
function startCarWizard(car = null) {
  wizardCarId = car?.id || null;
  wizardData = car
    ? {
        car_number: car.car_number || "",
        board_type: car.board_type || "",
        owners_count: car.owners_count || "",
        insurance_validity: car.insurance_validity || "",
        make: car.make || "",
        model: car.model || "",
        year: car.year || "",
        km_driven: car.km_driven || "",
        fuel_type: car.fuel_type || "",
        transmission: car.transmission || "",
        price: car.price || "",
        price_type: car.price_type || "",
        status: car.status || "available",
      }
    : {};
  wizardPlate = parsePlate(wizardData.car_number || "");
  wizardStep = car ? WIZARD_STEPS.length - 1 : 0; // editing: jump straight to review
  document.getElementById("car-modal-title").textContent = car ? "Edit listing" : "Add a car";
  document.getElementById("car-modal").classList.add("open");
  renderWizardStep();
}

function parsePlate(str) {
  // Best-effort split of "TN 58 BA 7555" style strings back into parts.
  const parts = (str || "").toUpperCase().replace(/[^A-Z0-9]/g, " ").split(/\s+/).filter(Boolean);
  return { state: parts[0] || "", dist: parts[1] || "", series: parts[2] || "", num: parts[3] || "" };
}

function goToStep(i) {
  wizardStep = i;
  renderWizardStep();
}
function goNext() {
  if (wizardStep < WIZARD_STEPS.length - 1) goToStep(wizardStep + 1);
}
function goBack() {
  if (wizardStep > 0) goToStep(wizardStep - 1);
}

/** Scrolls a freshly-focused field into view once the mobile keyboard
 *  finishes animating in, so the input never ends up hidden behind it. */
function scrollFieldIntoView(el) {
  setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
}

function displayValueForStep(step, data) {
  const v = data[step.key];
  if (v === undefined || v === null || v === "") return "—";
  if (step.type === "choice") {
    const opt = step.options.find((o) => String(o.value) === String(v));
    return opt ? opt.label : v;
  }
  if (step.key === "km_driven") return formatKm(v);
  if (step.key === "insurance_validity") {
    try { return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return v; }
  }
  return v;
}

function renderWizardProgress() {
  const host = document.getElementById("wizard-progress");
  host.innerHTML = WIZARD_STEPS.map((_, i) => {
    const cls = i < wizardStep ? "done" : i === wizardStep ? "current" : "";
    return `<span class="dot ${cls}"></span>`;
  }).join("");
}

function renderWizardStep() {
  renderWizardProgress();
  const step = WIZARD_STEPS[wizardStep];
  const body = document.getElementById("wizard-body");
  const backBtn = wizardStep > 0
    ? `<button type="button" class="wizard-back" id="wizard-back-btn">← Back</button>`
    : "";

  if (step.type === "choice") {
    body.innerHTML = `
      <div class="wizard-step-count">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}</div>
      <div class="wizard-question">${escapeHtml(step.title)}</div>
      <div class="wizard-choices">
        ${step.options
          .map(
            (o) => `<button type="button" class="wizard-choice ${String(wizardData[step.key]) === String(o.value) ? "selected" : ""}" data-value="${escapeHtml(String(o.value))}">${escapeHtml(o.label)}</button>`
          )
          .join("")}
      </div>
      <div class="wizard-nav">${backBtn}</div>
    `;
    body.querySelectorAll(".wizard-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        wizardData[step.key] = /^\d+$/.test(btn.dataset.value) ? Number(btn.dataset.value) : btn.dataset.value;
        setTimeout(goNext, 180);
      });
    });
  } else if (step.type === "plate") {
    const boardClass = wizardData.board_type === "commercial" ? "board-commercial" : "board-own";
    body.innerHTML = `
      <div class="wizard-step-count">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}</div>
      <div class="wizard-question">${escapeHtml(step.title)}</div>
      ${step.hint ? `<div class="wizard-hint" style="margin-top:-0.8rem;margin-bottom:1rem;">${escapeHtml(step.hint)}</div>` : ""}

      <div class="plate-preview ${boardClass}" id="plate-preview">
        <span class="plate-preview__strip"><span>IND</span></span>
        <span class="plate-preview__text">
          <span id="pp-state">${escapeHtml(wizardPlate.state || "ST")}</span
          ><span id="pp-dist">${escapeHtml(wizardPlate.dist || "00")}</span
          ><span id="pp-series">${escapeHtml(wizardPlate.series || "AA")}</span
          ><span id="pp-num">${escapeHtml(wizardPlate.num || "0000")}</span>
        </span>
      </div>

      <div class="plate-fields">
        <div class="plate-field plate-field--state">
          <label for="plate-state">State</label>
          <select id="plate-state" class="wizard-input">
            <option value="">Select</option>
            ${INDIAN_STATE_CODES.map((c) => `<option value="${c}" ${wizardPlate.state === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>
        <div class="plate-field plate-field--dist">
          <label for="plate-dist">District no.</label>
          <input class="wizard-input" id="plate-dist" type="text" inputmode="numeric" maxlength="2" placeholder="58" value="${escapeHtml(wizardPlate.dist)}" />
        </div>
        <div class="plate-field plate-field--series">
          <label for="plate-series">Series</label>
          <input class="wizard-input" id="plate-series" type="text" maxlength="2" placeholder="BA" value="${escapeHtml(wizardPlate.series)}" style="text-transform:uppercase;" />
        </div>
        <div class="plate-field plate-field--num">
          <label for="plate-num">Number</label>
          <input class="wizard-input" id="plate-num" type="text" inputmode="numeric" maxlength="4" placeholder="7555" value="${escapeHtml(wizardPlate.num)}" />
        </div>
      </div>
      <p class="form-error" id="wizard-error" role="alert"></p>
      <div class="wizard-nav">${backBtn}<button type="button" class="btn btn--primary" id="wizard-next-btn">Next</button></div>
    `;

    const stateEl = document.getElementById("plate-state");
    const distEl = document.getElementById("plate-dist");
    const seriesEl = document.getElementById("plate-series");
    const numEl = document.getElementById("plate-num");

    const updatePreview = () => {
      document.getElementById("pp-state").textContent = stateEl.value || "ST";
      document.getElementById("pp-dist").textContent = distEl.value || "00";
      document.getElementById("pp-series").textContent = seriesEl.value || "AA";
      document.getElementById("pp-num").textContent = numEl.value || "0000";
    };
    stateEl.addEventListener("change", updatePreview);
    distEl.addEventListener("input", () => { distEl.value = distEl.value.replace(/\D/g, ""); updatePreview(); });
    seriesEl.addEventListener("input", () => { seriesEl.value = seriesEl.value.toUpperCase().replace(/[^A-Z]/g, ""); updatePreview(); });
    numEl.addEventListener("input", () => { numEl.value = numEl.value.replace(/\D/g, ""); updatePreview(); });
    [stateEl, distEl, seriesEl, numEl].forEach((el) => el.addEventListener("focus", () => scrollFieldIntoView(el)));

    document.getElementById("wizard-next-btn").addEventListener("click", () => {
      const errorEl = document.getElementById("wizard-error");
      errorEl.textContent = "";
      if (!stateEl.value || !distEl.value || !seriesEl.value || !numEl.value) {
        errorEl.textContent = "Please fill in every box of the number plate.";
        return;
      }
      wizardPlate = { state: stateEl.value, dist: distEl.value, series: seriesEl.value, num: numEl.value };
      wizardData.car_number = `${wizardPlate.state} ${wizardPlate.dist} ${wizardPlate.series} ${wizardPlate.num}`;
      goNext();
    });
  } else if (step.type === "text" || step.type === "number" || step.type === "date") {
    const inputType = step.type === "text" ? "text" : step.type === "number" ? "number" : "date";
    body.innerHTML = `
      <div class="wizard-step-count">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}</div>
      <div class="wizard-question">${escapeHtml(step.title)}</div>
      <div class="wizard-input-wrap">
        <input class="wizard-input" id="wizard-field" type="${inputType}" inputmode="${step.type === "number" ? "numeric" : "text"}"
          placeholder="${escapeHtml(step.placeholder || "")}" value="${escapeHtml(wizardData[step.key] ?? "")}" />
        ${step.hint ? `<div class="wizard-hint">${escapeHtml(step.hint)}</div>` : ""}
        <p class="form-error" id="wizard-error" role="alert"></p>
      </div>
      <div class="wizard-nav">${backBtn}<button type="button" class="btn btn--primary" id="wizard-next-btn">Next</button></div>
    `;
    const input = document.getElementById("wizard-field");
    input.focus();
    input.addEventListener("focus", () => scrollFieldIntoView(input));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); handleWizardNext(step); } });
    document.getElementById("wizard-next-btn").addEventListener("click", () => handleWizardNext(step));
  } else if (step.type === "price") {
    body.innerHTML = `
      <div class="wizard-step-count">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}</div>
      <div class="wizard-question">${escapeHtml(step.title)}</div>
      <div class="wizard-input-wrap">
        <input class="wizard-input" id="wizard-field" type="number" inputmode="numeric"
          placeholder="${escapeHtml(step.placeholder)}" value="${escapeHtml(wizardData.price ?? "")}" />
        <div class="wizard-price-type">
          <button type="button" class="wizard-choice ${wizardData.price_type === "fixed" ? "selected" : ""}" data-value="fixed">Fixed price</button>
          <button type="button" class="wizard-choice ${wizardData.price_type === "negotiable" ? "selected" : ""}" data-value="negotiable">Negotiable</button>
        </div>
        <p class="form-error" id="wizard-error" role="alert"></p>
      </div>
      <div class="wizard-nav">${backBtn}<button type="button" class="btn btn--primary" id="wizard-next-btn">Next</button></div>
    `;
    const input = document.getElementById("wizard-field");
    input.focus();
    input.addEventListener("focus", () => scrollFieldIntoView(input));
    body.querySelectorAll(".wizard-price-type .wizard-choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        wizardData.price_type = btn.dataset.value;
        body.querySelectorAll(".wizard-price-type .wizard-choice").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
    document.getElementById("wizard-next-btn").addEventListener("click", () => handleWizardNext(step));
  } else if (step.type === "review") {
    const rows = WIZARD_STEPS.slice(0, -1)
      .map(
        (s, i) => `
      <div class="wizard-review-row">
        <div><div class="rr-label">${escapeHtml(s.title.replace("?", ""))}</div><div class="rr-value">${escapeHtml(String(displayValueForStep(s, wizardData)))}</div></div>
        <button type="button" class="rr-edit" data-step="${i}">Edit</button>
      </div>`
      )
      .join("");
    body.innerHTML = `
      <div class="wizard-step-count">Final step</div>
      <div class="wizard-question">Review everything before saving</div>
      <div class="wizard-review-list">${rows}</div>
      <p class="form-error" id="wizard-error" role="alert"></p>
      <div class="wizard-nav">${backBtn}<button type="button" class="btn btn--primary" id="wizard-finish-btn">✓ Move to Garage</button></div>
    `;
    body.querySelectorAll(".rr-edit").forEach((btn) =>
      btn.addEventListener("click", () => goToStep(Number(btn.dataset.step)))
    );
    document
      .getElementById("wizard-finish-btn")
      .addEventListener("click", guardClick(document.getElementById("wizard-finish-btn"), finishWizard));
  }

  const back = document.getElementById("wizard-back-btn");
  if (back) back.addEventListener("click", goBack);
}

function handleWizardNext(step) {
  const errorEl = document.getElementById("wizard-error");
  const input = document.getElementById("wizard-field");
  const val = input.value.trim();
  if (errorEl) errorEl.textContent = "";

  if (!val) {
    if (errorEl) errorEl.textContent = "Please fill this in to continue.";
    return;
  }
  if (step.type === "number" && (isNaN(Number(val)) || Number(val) < 0)) {
    if (errorEl) errorEl.textContent = "Please enter a valid number.";
    return;
  }
  if (step.type === "price") {
    if (isNaN(Number(val)) || Number(val) <= 0) {
      if (errorEl) errorEl.textContent = "Please enter a valid price.";
      return;
    }
    if (!wizardData.price_type) {
      if (errorEl) errorEl.textContent = "Please choose Fixed or Negotiable.";
      return;
    }
    wizardData.price = Number(val);
    goNext();
    return;
  }

  wizardData[step.key] = step.type === "number" ? Number(val) : val;
  goNext();
}

async function finishWizard() {
  const errorEl = document.getElementById("wizard-error");
  if (errorEl) errorEl.textContent = "";

  const payload = {
    p_car_number: wizardData.car_number || null,
    p_board_type: wizardData.board_type || null,
    p_owners: wizardData.owners_count || null,
    p_insurance: wizardData.insurance_validity || null,
    p_make: wizardData.make || null,
    p_model: wizardData.model || null,
    p_year: wizardData.year || null,
    p_km: wizardData.km_driven || null,
    p_fuel: wizardData.fuel_type || null,
    p_trans: wizardData.transmission || null,
    p_price: wizardData.price || null,
    p_price_type: wizardData.price_type || null,
  };

  let error;
  if (wizardCarId) {
    ({ error } = await window.db.rpc("dealer_update_car", {
      p_dealer_id: DEALER_SESSION.id,
      p_car_id: wizardCarId,
      ...payload,
      p_status: wizardData.status || "available",
    }));
  } else {
    ({ error } = await window.db.rpc("dealer_add_car", {
      p_dealer_id: DEALER_SESSION.id,
      ...payload,
    }));
  }

  if (error) {
    console.error(error);
    if (errorEl) errorEl.textContent = friendlyError(error);
    return;
  }

  toast(wizardCarId ? "Listing updated." : "Car added to your lot.", "success");
  document.getElementById("car-modal").classList.remove("open");
  await loadCars();
}

/* ===================================================================
   Cars grid — list, search, filter, status toggle, delete
=================================================================== */
async function loadDealerData(session) {
  DEALER_SESSION = session;
  await loadCars();
}

async function loadCars() {
  const grid = document.getElementById("cars-grid");
  grid.innerHTML = `<div class="empty-row">Loading your listings…</div>`;

  const { data, error } = await window.db.rpc("dealer_list_cars", { p_dealer_id: DEALER_SESSION.id });
  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-row">${escapeHtml(friendlyError(error))}</div>`;
    return;
  }
  ALL_CARS = data || [];
  document.getElementById("stat-listings").textContent = ALL_CARS.length;
  document.getElementById("stat-available").textContent = ALL_CARS.filter((c) => c.status === "available").length;
  document.getElementById("stat-sold").textContent = ALL_CARS.filter((c) => c.status === "sold").length;
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
      <div class="car-card__media">
        <span class="car-card__placeholder">${escapeHtml(c.car_number || "No number")}</span>
        <span class="status-pill status-pill--${c.status}">${escapeHtml(c.status)}</span>
      </div>
      <div class="car-card__body">
        <h3>${escapeHtml(c.year || "")} ${escapeHtml(c.make)} ${escapeHtml(c.model)}</h3>
        <div class="car-card__price">${formatCurrency(c.price)} ${c.price_type ? `<span style="color:var(--text-faint);font-size:0.78rem;">(${escapeHtml(c.price_type)})</span>` : ""}</div>
        <div class="car-card__meta">
          <span>${formatKm(c.km_driven)}</span>
          <span>${escapeHtml(c.fuel_type || "—")}</span>
          <span>${escapeHtml(c.transmission || "—")}</span>
        </div>
        <div class="car-card__meta">
          <span>${c.board_type ? (c.board_type === "commercial" ? "Commercial" : "Own board") : "—"}</span>
          <span>${c.owners_count ? c.owners_count + " owner(s)" : "—"}</span>
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
      if (car) startCarWizard(car);
    })
  );

  grid.querySelectorAll('[data-action="toggle"]').forEach((btn) =>
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        const car = ALL_CARS.find((c) => c.id === btn.dataset.id);
        const newStatus = btn.dataset.status === "available" ? "sold" : "available";
        const { error } = await window.db.rpc("dealer_update_car", {
          p_dealer_id: DEALER_SESSION.id,
          p_car_id: car.id,
          p_car_number: car.car_number,
          p_board_type: car.board_type,
          p_owners: car.owners_count,
          p_insurance: car.insurance_validity,
          p_make: car.make,
          p_model: car.model,
          p_year: car.year,
          p_km: car.km_driven,
          p_fuel: car.fuel_type,
          p_trans: car.transmission,
          p_price: car.price,
          p_price_type: car.price_type,
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
          p_dealer_id: DEALER_SESSION.id,
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
  const activeStatus = status || document.querySelector(".status-filter.active")?.dataset.status || "all";
  let list = ALL_CARS;
  if (activeStatus !== "all") list = list.filter((c) => c.status === activeStatus);
  if (q) {
    list = list.filter((c) =>
      [c.make, c.model, c.car_number, c.fuel_type].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }
  renderCars(list);
}

function hydrateDealerHeader(session) {
  document.getElementById("dealer-current-username").textContent = session.fullName || session.username;
  document.getElementById("dealer-current-shop").textContent = session.shopName || "";
  document.getElementById("dealer-avatar-initials").textContent = initials(session.fullName || session.username);
}
