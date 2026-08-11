let DEALER_SESSION = null;
let ALL_CARS = [];
let MASTER_CARS = [];
let CURRENT_GARAGE = "own";

/* ===================================================================
   ADD-A-CAR WIZARD — one question per screen, big touch targets.
   Order: car number (plate builder) -> board type (shown using that
   number, in all 4 real colors) -> owners -> insurance -> make ->
   model -> year -> km -> fuel -> transmission -> price -> review
=================================================================== */
const INDIAN_STATE_CODES = [
  "AN","AP","AR","AS","BR","CH","CG","DD","DL","DN","GA","GJ","HR","HP",
  "JK","JH","KA","KL","LA","LD","MP","MH","MN","ML","MZ","NL","OD","PY",
  "PB","RJ","SK","TN","TS","TR","UP","UK","WB",
];

const BOARD_TYPES = [
  { value: "own", label: "Own", swatch: "own" },
  { value: "commercial", label: "Commercial", swatch: "commercial" },
  { value: "own_ev", label: "EV Own", swatch: "own_ev" },
  { value: "commercial_ev", label: "EV Commercial", swatch: "commercial_ev" },
];

const WIZARD_STEPS = [
  {
    key: "car_number", type: "plate", title: "What is the car number?",
    hint: "Pick the state, then fill in the rest — like on the actual plate.",
  },
  {
    key: "board_type", type: "board-picker", title: "Which of these matches the car's plate?",
    options: BOARD_TYPES,
  },
  {
    key: "owners_count", type: "choice", title: "How many owners so far?",
    options: [
      { value: 1, label: "1st owner", icon: 1 },
      { value: 2, label: "2nd owner", icon: 2 },
      { value: 3, label: "3rd owner", icon: 3 },
      { value: 4, label: "4th owner or more", icon: 4 },
    ],
  },
  {
    key: "insurance_validity", type: "date", title: "Insurance valid till?",
    hint: "Tap the box and pick the expiry date.",
  },
  {
    key: "fc_validity", type: "date", title: "FC (Fitness Certificate) valid till?",
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
  document.querySelectorAll("#detail-modal [data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => document.getElementById("detail-modal").classList.remove("open"))
  );
  document.querySelectorAll("#search-modal [data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => document.getElementById("search-modal").classList.remove("open"))
  );
  document.querySelectorAll("#hold-modal [data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => document.getElementById("hold-modal").classList.remove("open"))
  );
  document.querySelectorAll("#sold-modal [data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => document.getElementById("sold-modal").classList.remove("open"))
  );
  document.querySelectorAll("#share-modal [data-close-modal]").forEach((el) =>
    el.addEventListener("click", () => document.getElementById("share-modal").classList.remove("open"))
  );

  document.getElementById("btn-master-search").addEventListener("click", () => openSearchWizard());

  document.getElementById("btn-clear-filter").addEventListener("click", () => {
    document.getElementById("car-search").value = "";
    document.querySelectorAll(".status-filter").forEach((b) => b.classList.remove("active"));
    document.querySelector('.status-filter[data-status="all"]').classList.add("active");
    renderCars(sortCarsList(MASTER_CARS), true);
  });

  document.getElementById("master-sort").addEventListener("change", () => {
    filterCars(document.getElementById("car-search").value);
  });

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

  document.querySelectorAll(".garage-tab").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".garage-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      CURRENT_GARAGE = btn.dataset.garage;

      document.getElementById("car-listing-view").style.display = CURRENT_GARAGE === "accounts" ? "none" : "";
      document.getElementById("accounts-view").style.display = CURRENT_GARAGE === "accounts" ? "" : "none";
      document.getElementById("btn-open-add-car").style.display = CURRENT_GARAGE === "own" ? "" : "none";
      document.getElementById("master-actions-row").style.display = CURRENT_GARAGE === "master" ? "" : "none";
      document.getElementById("master-sort").style.display = CURRENT_GARAGE === "master" ? "" : "none";

      if (CURRENT_GARAGE === "master") {
        await loadMasterCars();
      } else if (CURRENT_GARAGE === "accounts") {
        renderAccountsView();
      } else {
        updateStatsFromList(ALL_CARS);
        renderCars(ALL_CARS, false);
      }
    });
  });

  document.getElementById("notif-bell").addEventListener("click", (e) => {
    e.stopPropagation();
    const bell = document.getElementById("notif-bell");
    const panel = document.getElementById("notif-panel");
    const opening = !panel.classList.contains("open");
    if (opening) {
      const rect = bell.getBoundingClientRect();
      const panelWidth = Math.min(320, window.innerWidth - 24);
      let left = rect.right - panelWidth;
      left = Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12));
      panel.style.width = panelWidth + "px";
      panel.style.top = rect.bottom + 8 + "px";
      panel.style.left = left + "px";
      panel.classList.add("open");
      renderNotifPanel();
      localStorage.setItem(notifStorageKey(DEALER_SESSION.id), new Date().toISOString());
      document.getElementById("notif-count").style.display = "none";
    } else {
      panel.classList.remove("open");
    }
  });
  document.addEventListener("click", (e) => {
    const wrap = document.getElementById("notif-bell-wrap");
    const panel = document.getElementById("notif-panel");
    if (panel.classList.contains("open") && !wrap.contains(e.target)) {
      panel.classList.remove("open");
    }
  });
}

function updateStatsFromList(list) {
  document.getElementById("stat-listings").textContent = list.length;
  document.getElementById("stat-available").textContent = list.filter((c) => c.status === "available").length;
  document.getElementById("stat-sold").textContent = list.filter((c) => c.status === "sold").length;
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
        fc_validity: car.fc_validity || "",
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
  wizardPlate = car ? parsePlate(wizardData.car_number || "") : { state: "TN", dist: "", series: "", num: "" };
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

/** Renders n little person silhouettes (max 3 drawn, 4th shows a "+"). */
function personIcons(n) {
  const person = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`;
  const count = Math.min(n, 3);
  let html = `<span class="wizard-icon-row">`;
  for (let i = 0; i < count; i++) html += person;
  if (n > 3) html += `<span class="wizard-icon-plus">+</span>`;
  html += `</span>`;
  return html;
}

function displayValueForStep(step, data) {
  const v = data[step.key];
  if (v === undefined || v === null || v === "") return "—";
  if (step.type === "choice" || step.type === "radio" || step.type === "board-picker") {
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
            (o) => `<button type="button" class="wizard-choice ${o.icon ? "wizard-choice--icon" : ""} ${String(wizardData[step.key]) === String(o.value) ? "selected" : ""}" data-value="${escapeHtml(String(o.value))}">${o.icon ? personIcons(o.icon) : ""}<span>${escapeHtml(o.label)}</span></button>`
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
  } else if (step.type === "board-picker") {
    body.innerHTML = `
      <div class="wizard-step-count">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}</div>
      <div class="wizard-question">${escapeHtml(step.title)}</div>
      <div class="board-picker-list">
        ${step.options
          .map(
            (o) => `
          <label class="board-picker-card ${wizardData.board_type === o.value ? "selected" : ""}">
            <input type="radio" name="wizard-board-type" value="${escapeHtml(o.value)}" ${wizardData.board_type === o.value ? "checked" : ""} />
            <span class="board-picker-plate board-${o.value}">
              <span class="board-picker-plate__text">${escapeHtml(wizardData.car_number || "TN 00 AA 0000")}</span>
            </span>
            <span class="board-picker-label">${escapeHtml(o.label)}</span>
          </label>`
          )
          .join("")}
      </div>
      <p class="form-error" id="wizard-error" role="alert"></p>
      <div class="wizard-nav">${backBtn}<button type="button" class="btn btn--primary" id="wizard-next-btn">Next</button></div>
    `;
    body.querySelectorAll('input[name="wizard-board-type"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        body.querySelectorAll(".board-picker-card").forEach((l) => l.classList.remove("selected"));
        radio.closest(".board-picker-card").classList.add("selected");
      });
    });
    document.getElementById("wizard-next-btn").addEventListener("click", () => {
      const errorEl = document.getElementById("wizard-error");
      const checked = body.querySelector('input[name="wizard-board-type"]:checked');
      if (!checked) {
        errorEl.textContent = "Please choose the plate that matches this car.";
        return;
      }
      wizardData.board_type = checked.value;
      goNext();
    });
  } else if (step.type === "radio") {
    body.innerHTML = `
      <div class="wizard-step-count">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}</div>
      <div class="wizard-question">${escapeHtml(step.title)}</div>
      <div class="wizard-radio-list">
        ${step.options
          .map(
            (o) => `
          <label class="wizard-radio ${wizardData[step.key] === o.value ? "selected" : ""}">
            <input type="radio" name="wizard-radio-${step.key}" value="${escapeHtml(o.value)}" ${wizardData[step.key] === o.value ? "checked" : ""} />
            <span class="plate-swatch plate-swatch--${o.swatch}"></span>
            <span class="wizard-radio__label">${escapeHtml(o.label)}</span>
          </label>`
          )
          .join("")}
      </div>
      <p class="form-error" id="wizard-error" role="alert"></p>
      <div class="wizard-nav">${backBtn}<button type="button" class="btn btn--primary" id="wizard-next-btn">Next</button></div>
    `;
    body.querySelectorAll(`input[name="wizard-radio-${step.key}"]`).forEach((radio) => {
      radio.addEventListener("change", () => {
        body.querySelectorAll(".wizard-radio").forEach((l) => l.classList.remove("selected"));
        radio.closest(".wizard-radio").classList.add("selected");
      });
    });
    document.getElementById("wizard-next-btn").addEventListener("click", () => {
      const errorEl = document.getElementById("wizard-error");
      const checked = body.querySelector(`input[name="wizard-radio-${step.key}"]:checked`);
      if (!checked) {
        errorEl.textContent = "Please choose one option.";
        return;
      }
      wizardData[step.key] = checked.value;
      goNext();
    });
  } else if (step.type === "plate") {
    const boardClass = "board-" + (wizardData.board_type || "own");
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
    stateEl.addEventListener("change", () => { updatePreview(); distEl.focus(); });
    distEl.addEventListener("input", () => {
      distEl.value = distEl.value.replace(/\D/g, "");
      updatePreview();
      if (distEl.value.length >= 2) seriesEl.focus();
    });
    seriesEl.addEventListener("input", () => {
      seriesEl.value = seriesEl.value.toUpperCase().replace(/[^A-Z]/g, "");
      updatePreview();
      if (seriesEl.value.length >= 2) numEl.focus();
    });
    numEl.addEventListener("input", () => { numEl.value = numEl.value.replace(/\D/g, "").slice(0, 4); updatePreview(); });
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
    p_fc: wizardData.fc_validity || null,
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
  CURRENT_GARAGE = "own";
  await loadCars();
  await refreshNotifBadge();
  if (notifPollInterval) clearInterval(notifPollInterval);
  notifPollInterval = setInterval(refreshNotifBadge, 60000);
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
  updateStatsFromList(ALL_CARS);
  if (CURRENT_GARAGE === "own") renderCars(ALL_CARS, false);
}

function sortCarsList(list) {
  const sortVal = document.getElementById("master-sort")?.value || "newest";
  const arr = [...list];
  if (sortVal === "price-asc") arr.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (sortVal === "price-desc") arr.sort((a, b) => (b.price || 0) - (a.price || 0));
  else arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return arr;
}

async function loadMasterCars() {
  const grid = document.getElementById("cars-grid");
  grid.innerHTML = `<div class="empty-row">Loading the master garage…</div>`;

  const { data, error } = await window.db.rpc("dealer_list_all_cars", { p_dealer_id: DEALER_SESSION.id });
  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-row">${escapeHtml(friendlyError(error))}</div>`;
    return;
  }
  MASTER_CARS = data || [];
  updateStatsFromList(MASTER_CARS);
  renderCars(sortCarsList(MASTER_CARS), true);
}

function renderCars(list, isMaster) {
  const grid = document.getElementById("cars-grid");
  if (!list.length) {
    grid.innerHTML = isMaster
      ? `<div class="empty-row">No listings across the network yet.</div>`
      : `<div class="empty-row">No cars listed yet. Add your first car to build your lot.</div>`;
    return;
  }
  grid.innerHTML = list
    .map(
      (c) => `
    <article class="car-card" data-id="${c.id}">
      <div class="car-card__media">
        <span class="car-card__placeholder">${escapeHtml(c.car_number || "No number")}</span>
        <button type="button" class="icon-btn card-share-btn" data-action="share" data-id="${c.id}" aria-label="Share on WhatsApp">
          ${whatsappIconSvg(16)}
        </button>
        <span class="status-pill status-pill--${c.status}">${escapeHtml(c.status)}</span>
      </div>
      <div class="car-card__body">
        <h3>${escapeHtml(c.year || "")} ${escapeHtml(c.make)} ${escapeHtml(c.model)}</h3>
        ${isMaster ? `<div class="dealer-tag">${escapeHtml(c.dealer_shop || c.dealer_name || "Dealer")}</div>` : ""}
        <div class="car-card__price">${formatCurrency(c.price)} ${c.price_type ? `<span style="color:var(--text-faint);font-size:0.78rem;">(${escapeHtml(c.price_type)})</span>` : ""}</div>
        <div class="car-card__meta">
          <span>${formatKm(c.km_driven)}</span>
          <span>${escapeHtml(c.fuel_type || "—")}</span>
          <span>${escapeHtml(c.transmission || "—")}</span>
        </div>
        <div class="car-card__meta">
          <span>${escapeHtml(boardTypeLabel(c.board_type))}</span>
          <span>${c.owners_count ? c.owners_count + " owner(s)" : "—"}</span>
        </div>
        ${
          isMaster
            ? `<div class="car-card__actions">
          <button class="btn ${c.booked_by_me ? "btn--ghost" : "btn--primary"} btn--sm" data-action="${c.booked_by_me ? "cancel-book" : "book"}" data-id="${c.id}">
            ${c.booked_by_me ? "Cancel booking" : "Book"}
          </button>
          <span class="booking-badge" data-badge-for="${c.id}" title="Dealers who booked this car">${c.booking_count || 0}</span>
        </div>`
            : `<div class="car-card__actions">
          <button class="btn btn--ghost btn--sm" data-action="edit" data-id="${c.id}">Edit</button>
          <button class="btn btn--ghost btn--sm" data-action="hold" data-id="${c.id}">${c.status === "hold" ? "Release hold" : "Hold"}</button>
          <button class="btn btn--ghost btn--sm" data-action="sold" data-id="${c.id}">${c.status === "sold" ? "Mark available" : "Sold"}</button>
          <button class="btn btn--danger btn--sm" data-action="delete" data-id="${c.id}">Delete</button>
        </div>`
        }
      </div>
    </article>`
    )
    .join("");

  grid.querySelectorAll(".car-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const source = isMaster ? MASTER_CARS : ALL_CARS;
      const car = source.find((c) => c.id === card.dataset.id);
      if (car) openCarDetail(car, isMaster);
    });
  });

  grid.querySelectorAll('[data-action="share"]').forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const source = isMaster ? MASTER_CARS : ALL_CARS;
      const car = source.find((c) => c.id === btn.dataset.id);
      if (car) openShareModal(car);
    })
  );

  if (isMaster) {
    grid.querySelectorAll('[data-action="book"]').forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (btn.dataset.busy === "1") return; // duplicate-click guard
        btn.dataset.busy = "1";
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "…";

        const car = MASTER_CARS.find((c) => c.id === btn.dataset.id);
        const { error } = await window.db.rpc("dealer_book_car", {
          p_dealer_id: DEALER_SESSION.id,
          p_car_id: car.id,
        });

        btn.dataset.busy = "0";
        btn.disabled = false;
        if (error) {
          btn.textContent = originalText;
          toast(friendlyError(error), "error");
          return;
        }

        car.booking_count = (car.booking_count || 0) + 1;
        car.booked_by_me = true;
        const badge = grid.querySelector(`[data-badge-for="${car.id}"]`);
        if (badge) badge.textContent = car.booking_count;
        btn.textContent = "Cancel booking";
        btn.dataset.action = "cancel-book";
        btn.classList.remove("btn--primary");
        btn.classList.add("btn--ghost");
        toast("You've booked this car.", "success");
      })
    );

    grid.querySelectorAll('[data-action="cancel-book"]').forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (btn.dataset.busy === "1") return;
        btn.dataset.busy = "1";
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "…";

        const car = MASTER_CARS.find((c) => c.id === btn.dataset.id);
        const { error } = await window.db.rpc("dealer_cancel_booking", {
          p_dealer_id: DEALER_SESSION.id,
          p_car_id: car.id,
        });

        btn.dataset.busy = "0";
        btn.disabled = false;
        if (error) {
          btn.textContent = originalText;
          toast(friendlyError(error), "error");
          return;
        }

        car.booking_count = Math.max(0, (car.booking_count || 1) - 1);
        car.booked_by_me = false;
        const badge = grid.querySelector(`[data-badge-for="${car.id}"]`);
        if (badge) badge.textContent = car.booking_count;
        btn.textContent = "Book";
        btn.dataset.action = "book";
        btn.classList.remove("btn--ghost");
        btn.classList.add("btn--primary");
        toast("Booking cancelled.", "success");
      })
    );

    return; // rest of the actions below are for own-garage cards only
  }

  grid.querySelectorAll('[data-action="edit"]').forEach((btn) =>
    btn.addEventListener("click", () => {
      const car = ALL_CARS.find((c) => c.id === btn.dataset.id);
      if (car) startCarWizard(car);
    })
  );

  grid.querySelectorAll('[data-action="hold"]').forEach((btn) =>
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        const car = ALL_CARS.find((c) => c.id === btn.dataset.id);
        if (car.status === "hold") {
          const { error } = await window.db.rpc("dealer_set_car_status", {
            p_dealer_id: DEALER_SESSION.id,
            p_car_id: car.id,
            p_status: "available",
          });
          if (error) {
            toast(friendlyError(error), "error");
            return;
          }
          toast("Hold released.", "success");
          await loadCars();
        } else {
          openHoldPicker(car);
        }
      })
    )
  );

  grid.querySelectorAll('[data-action="sold"]').forEach((btn) =>
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        const car = ALL_CARS.find((c) => c.id === btn.dataset.id);
        if (car.status === "sold") {
          const confirmed = await showConfirm(
            "Marking this car available again will delete its sale entry, and your Accounts will be recalculated without it. Continue?",
            { danger: true, confirmLabel: "Yes, mark available" }
          );
          if (!confirmed) return;
          const { error } = await window.db.rpc("dealer_revert_sold", {
            p_dealer_id: DEALER_SESSION.id,
            p_car_id: car.id,
          });
          if (error) {
            toast(friendlyError(error), "error");
            return;
          }
          toast("Marked available. Sale entry removed.", "success");
          await loadCars();
        } else {
          openSoldWizard(car);
        }
      })
    )
  );

  grid.querySelectorAll('[data-action="delete"]').forEach((btn) =>
    btn.addEventListener(
      "click",
      guardClick(btn, async () => {
        if (!(await showConfirm("Delete this listing? This can't be undone.", { danger: true, confirmLabel: "Delete" }))) return;
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
  const isMaster = CURRENT_GARAGE === "master";
  let list = isMaster ? MASTER_CARS : ALL_CARS;
  if (activeStatus !== "all") list = list.filter((c) => c.status === activeStatus);
  if (q) {
    list = list.filter((c) =>
      [c.make, c.model, c.car_number, c.fuel_type, isMaster ? c.dealer_shop : null, isMaster ? c.dealer_name : null]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }
  if (isMaster) list = sortCarsList(list);
  renderCars(list, isMaster);
}

function boardTypeLabel(v) {
  const opt = BOARD_TYPES.find((o) => o.value === v);
  return opt ? opt.label : "—";
}

/* ===================================================================
   Hold picker — "Customer" or "Dealer" (then pick which dealer)
=================================================================== */
/* ===================================================================
   WhatsApp share — "Existing" (contacts/groups picker) or "New"
   (type a number, opens that chat directly)
=================================================================== */
function buildShareText(car) {
  const title = `*${[car.year, car.make, car.model].filter(Boolean).join(" ")}*`;
  const lines = [
    title,
    car.car_number || null,
    car.board_type ? `${boardTypeLabel(car.board_type)} Board` : null,
    `${formatCurrency(car.price)}${car.price_type ? ` (${car.price_type})` : ""}`,
    formatKm(car.km_driven),
    car.fuel_type || null,
    car.transmission || null,
    car.owners_count ? `${car.owners_count} owner(s)` : null,
    car.insurance_validity ? `Insurance valid till ${insuranceLabel(car.insurance_validity)}` : null,
    car.fc_validity ? `FC valid till ${insuranceLabel(car.fc_validity)}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function openShareModal(car) {
  const body = document.getElementById("share-modal-body");
  body.innerHTML = `
    <div class="wizard-question">Share this car on WhatsApp</div>
    <div class="wizard-choices">
      <button type="button" class="wizard-choice" id="share-existing-btn">Share to contacts/groups</button>
      <button type="button" class="wizard-choice" id="share-new-btn">Send to a number</button>
    </div>
  `;
  document.getElementById("share-modal").classList.add("open");

  document.getElementById("share-existing-btn").addEventListener("click", () => {
    const text = encodeURIComponent(buildShareText(car));
    window.open(`https://wa.me/?text=${text}`, "_blank");
    document.getElementById("share-modal").classList.remove("open");
  });

  document.getElementById("share-new-btn").addEventListener("click", () => {
    body.innerHTML = `
      <div class="wizard-question">Enter the phone number</div>
      <div class="field">
        <label for="share-number">10-digit mobile number</label>
        <div class="plate-input-wrap">
          <span class="plate-flag">+91</span>
          <input type="tel" id="share-number" inputmode="numeric" maxlength="10" placeholder="98765 43210" style="text-transform:none;letter-spacing:0.05em;" />
        </div>
      </div>
      <p class="form-error" id="share-number-error" role="alert"></p>
      <button type="button" class="btn btn--primary btn--block" id="share-send-btn">Send</button>
    `;
    const numInput = document.getElementById("share-number");
    numInput.addEventListener("input", () => { numInput.value = numInput.value.replace(/\D/g, "").slice(0, 10); });
    numInput.addEventListener("focus", () => scrollFieldIntoView(numInput));
    numInput.focus();

    document.getElementById("share-send-btn").addEventListener("click", () => {
      const errorEl = document.getElementById("share-number-error");
      const num = numInput.value.trim();
      if (!/^\d{10}$/.test(num)) {
        errorEl.textContent = "Enter a valid 10-digit mobile number.";
        return;
      }
      const text = encodeURIComponent(buildShareText(car));
      window.open(`https://wa.me/91${num}?text=${text}`, "_blank");
      document.getElementById("share-modal").classList.remove("open");
    });
  });
}

/* ===================================================================
   Sold wizard — 3 optional questions, then marks the car sold and
   records the entry (Accounts -> Entries).
=================================================================== */
function openSoldWizard(car) {
  const body = document.getElementById("sold-modal-body");
  body.innerHTML = `
    <div class="wizard-question">Sale details</div>
    <div class="wizard-hint" style="margin-top:-0.8rem;margin-bottom:1rem;">All optional — leave blank if you don't want to record it.</div>
    <div class="field">
      <label for="sold-amount">Total sale amount (₹)</label>
      <input type="number" id="sold-amount" class="wizard-input" style="text-align:left;font-size:1rem;padding:0.75rem 0.9rem;" placeholder="e.g. 55000" />
    </div>
    <div class="field">
      <label for="sold-seller-comm">Commission from car owner / other dealer (₹)</label>
      <input type="number" id="sold-seller-comm" class="wizard-input" style="text-align:left;font-size:1rem;padding:0.75rem 0.9rem;" placeholder="e.g. 2000" />
    </div>
    <div class="field">
      <label for="sold-buyer-comm">Commission from buyer (₹)</label>
      <input type="number" id="sold-buyer-comm" class="wizard-input" style="text-align:left;font-size:1rem;padding:0.75rem 0.9rem;" placeholder="e.g. 1500" />
    </div>
    <p class="form-error" id="sold-error" role="alert"></p>
    <button type="button" class="btn btn--primary btn--block" id="sold-confirm-btn">Confirm sold</button>
  `;
  document.getElementById("sold-modal").classList.add("open");

  ["sold-amount", "sold-seller-comm", "sold-buyer-comm"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("focus", () => scrollFieldIntoView(el));
  });

  document.getElementById("sold-confirm-btn").addEventListener(
    "click",
    guardClick(document.getElementById("sold-confirm-btn"), async () => {
      const num = (id) => {
        const v = document.getElementById(id).value.trim();
        return v === "" ? null : Number(v);
      };
      const { error } = await window.db.rpc("dealer_mark_sold", {
        p_dealer_id: DEALER_SESSION.id,
        p_car_id: car.id,
        p_sale_amount: num("sold-amount"),
        p_seller_commission: num("sold-seller-comm"),
        p_buyer_commission: num("sold-buyer-comm"),
      });
      if (error) {
        document.getElementById("sold-error").textContent = friendlyError(error);
        return;
      }
      document.getElementById("sold-modal").classList.remove("open");
      toast("Marked as sold.", "success");
      await loadCars();
    })
  );
}

function openHoldPicker(car) {
  const body = document.getElementById("hold-modal-body");
  body.innerHTML = `
    <div class="wizard-question">Who is this car being held for?</div>
    <div class="wizard-choices">
      <button type="button" class="wizard-choice" id="hold-pick-customer">Customer</button>
      <button type="button" class="wizard-choice" id="hold-pick-dealer">Another dealer</button>
    </div>
  `;
  document.getElementById("hold-modal").classList.add("open");

  document.getElementById("hold-pick-customer").addEventListener(
    "click",
    guardClick(document.getElementById("hold-pick-customer"), async () => {
      const { error } = await window.db.rpc("dealer_set_car_status", {
        p_dealer_id: DEALER_SESSION.id,
        p_car_id: car.id,
        p_status: "hold",
        p_hold_type: "customer",
        p_held_by_dealer_id: null,
      });
      if (error) {
        toast(friendlyError(error), "error");
        return;
      }
      document.getElementById("hold-modal").classList.remove("open");
      toast("Marked on hold for a customer.", "success");
      await loadCars();
    })
  );

  document.getElementById("hold-pick-dealer").addEventListener("click", async () => {
    body.innerHTML = `<div class="wizard-question">Loading dealers…</div>`;
    const { data, error } = await window.db.rpc("dealer_list_dealers", { p_dealer_id: DEALER_SESSION.id });
    if (error) {
      body.innerHTML = `<p class="form-error">${escapeHtml(friendlyError(error))}</p>`;
      return;
    }
    if (!data || !data.length) {
      body.innerHTML = `<p class="wizard-hint">No other dealers on the network yet.</p>`;
      return;
    }
    body.innerHTML = `
      <div class="wizard-question">Which dealer is holding it?</div>
      <div class="wizard-radio-list">
        ${data
          .map(
            (d) => `<label class="wizard-radio"><input type="radio" name="hold-dealer" value="${d.id}" /><span class="wizard-radio__label">${escapeHtml(d.shop_name || d.full_name)}</span></label>`
          )
          .join("")}
      </div>
      <p class="form-error" id="hold-dealer-error" role="alert"></p>
      <button type="button" class="btn btn--primary btn--block" id="hold-dealer-confirm">Confirm</button>
    `;
    body.querySelectorAll('input[name="hold-dealer"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        body.querySelectorAll(".wizard-radio").forEach((l) => l.classList.remove("selected"));
        radio.closest(".wizard-radio").classList.add("selected");
      });
    });
    document.getElementById("hold-dealer-confirm").addEventListener(
      "click",
      guardClick(document.getElementById("hold-dealer-confirm"), async () => {
        const checked = body.querySelector('input[name="hold-dealer"]:checked');
        if (!checked) {
          document.getElementById("hold-dealer-error").textContent = "Please choose a dealer.";
          return;
        }
        const { error: err2 } = await window.db.rpc("dealer_set_car_status", {
          p_dealer_id: DEALER_SESSION.id,
          p_car_id: car.id,
          p_status: "hold",
          p_hold_type: "dealer",
          p_held_by_dealer_id: checked.value,
        });
        if (err2) {
          document.getElementById("hold-dealer-error").textContent = friendlyError(err2);
          return;
        }
        document.getElementById("hold-modal").classList.remove("open");
        toast("Marked on hold for that dealer.", "success");
        await loadCars();
      })
    );
  });
}

/* ===================================================================
   Full-page car detail view
=================================================================== */
function insuranceLabel(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return v; }
}

function openCarDetail(car, isMaster) {
  document.getElementById("detail-modal-title").textContent = `${car.year || ""} ${car.make} ${car.model}`.trim();
  const boardClass = "board-" + (car.board_type || "own");

  const holdReason =
    car.status === "hold"
      ? car.hold_type === "dealer"
        ? `Reserved by dealer — ${car.held_by_name || "another dealer"}`
        : "Reserved for a customer"
      : null;

  const rows = [
    ["Car number", car.car_number || "—"],
    ["Plate type", boardTypeLabel(car.board_type)],
    ["Owners", car.owners_count ? car.owners_count + " owner(s)" : "—"],
    ["Insurance valid till", insuranceLabel(car.insurance_validity)],
    ["FC valid till", insuranceLabel(car.fc_validity)],
    ["Kilometers driven", formatKm(car.km_driven)],
    ["Fuel type", car.fuel_type || "—"],
    ["Transmission", car.transmission || "—"],
    ["Status", car.status || "—"],
  ];
  if (isMaster && holdReason) rows.push(["Hold reason", holdReason]);

  document.getElementById("detail-modal-body").innerHTML = `
    <div class="detail-plate">
      <span class="board-picker-plate ${boardClass}" style="min-width:200px;">
        <span class="board-picker-plate__text" style="font-size:1.1rem;">${escapeHtml(car.car_number || "—")}</span>
      </span>
    </div>
    <div class="detail-price">
      ${formatCurrency(car.price)} ${car.price_type ? `<span>(${escapeHtml(car.price_type)})</span>` : ""}
    </div>
    ${
      isMaster
        ? `<div class="detail-dealer">Listed by <strong>${escapeHtml(car.dealer_shop || car.dealer_name || "a dealer")}</strong></div>`
        : ""
    }
    <div class="detail-grid">
      ${rows
        .map((r) => `<div class="detail-row"><div class="dr-label">${escapeHtml(r[0])}</div><div class="dr-value">${escapeHtml(String(r[1]))}</div></div>`)
        .join("")}
    </div>
    <div id="detail-bookings"></div>
    <button type="button" class="btn btn--whatsapp btn--block" id="detail-share-btn" style="margin-bottom:0.6rem;">
      <span style="vertical-align:-3px;margin-right:0.4rem;display:inline-block;">${whatsappIconSvg(18)}</span>
      Share on WhatsApp
    </button>
    ${
      isMaster
        ? car.dealer_phone
          ? `<a class="btn btn--primary btn--block" href="tel:${escapeHtml(car.dealer_phone)}" style="text-decoration:none;">📞 Call ${escapeHtml(car.dealer_shop || car.dealer_name || "dealer")}</a>`
          : ""
        : `<button type="button" class="btn btn--primary btn--block" id="detail-edit-btn">Edit this listing</button>`
    }
  `;

  document.getElementById("detail-share-btn").addEventListener("click", () => openShareModal(car));

  if (!isMaster) {
    document.getElementById("detail-edit-btn").addEventListener("click", () => {
      document.getElementById("detail-modal").classList.remove("open");
      startCarWizard(car);
    });
  }

  document.getElementById("detail-modal").classList.add("open");

  // Fetch the ordered list of dealers who booked this car (if any).
  const bookingsEl = document.getElementById("detail-bookings");
  window.db
    .rpc("dealer_list_car_bookings", { p_dealer_id: DEALER_SESSION.id, p_car_id: car.id })
    .then(({ data, error }) => {
      if (error || !data || !data.length) return;
      bookingsEl.innerHTML = `
        <div class="filter-group">
          <h4>Booked by (${data.length})</h4>
          <ol class="booking-list">
            ${data.map((b) => `<li>${escapeHtml(b.dealer_shop || b.dealer_name || "Dealer")}</li>`).join("")}
          </ol>
        </div>
      `;
    });
}

/* ===================================================================
   Master Garage — search by budget + precise filters
=================================================================== */
const BUDGET_MIN = 5000;
const BUDGET_MAX = 2000000; // shown as "20L+"

function formatBudgetLabel(v) {
  if (v >= BUDGET_MAX) return "₹20,00,000+";
  return formatCurrency(v);
}

function openSearchWizard() {
  renderSearchStep1();
  document.getElementById("search-modal").classList.add("open");
}

function renderSearchStep1() {
  const body = document.getElementById("search-modal-body");
  const startVal = 500000;
  body.innerHTML = `
    <div class="wizard-question">What's your budget?</div>
    <div class="budget-display" id="budget-display">${formatBudgetLabel(startVal)}</div>
    <div class="budget-sub">Move the slider to set the maximum you'd like to pay</div>
    <div class="budget-slider-wrap">
      <input type="range" id="budget-slider" class="budget-slider" min="${BUDGET_MIN}" max="${BUDGET_MAX}" step="5000" value="${startVal}" />
    </div>
    <div class="wizard-nav">
      <button type="button" class="btn btn--primary btn--block" id="budget-next-btn">Next: Filters</button>
    </div>
  `;
  const slider = document.getElementById("budget-slider");
  const display = document.getElementById("budget-display");
  slider.addEventListener("input", () => { display.textContent = formatBudgetLabel(Number(slider.value)); });
  document.getElementById("budget-next-btn").addEventListener("click", () => {
    renderSearchStep2(Number(slider.value));
  });
}

function uniqueValues(list, key) {
  return [...new Set(list.map((c) => c[key]).filter(Boolean))];
}

function renderSearchStep2(budget) {
  const body = document.getElementById("search-modal-body");
  const makes = uniqueValues(MASTER_CARS, "make");
  const models = uniqueValues(MASTER_CARS, "model");
  const fuels = uniqueValues(MASTER_CARS, "fuel_type");
  const transmissions = uniqueValues(MASTER_CARS, "transmission");

  const checkGroup = (title, name, values, labelFn) => `
    <div class="filter-accordion" data-group="${name}">
      <button type="button" class="filter-accordion__header">
        <span>${escapeHtml(title)}</span>
        <span class="filter-accordion__meta">
          <span class="filter-accordion__count" data-count-for="${name}"></span>
          <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>
      <div class="filter-accordion__body">
        <div class="filter-check-list">
          ${values
            .map(
              (v) => `<label class="filter-check"><input type="checkbox" name="${name}" value="${escapeHtml(String(v))}" />${escapeHtml(labelFn ? labelFn(v) : v)}</label>`
            )
            .join("")}
        </div>
      </div>
    </div>`;

  body.innerHTML = `
    <div class="wizard-question">Narrow it down</div>
    <div class="budget-sub">Budget up to ${formatBudgetLabel(budget)} — tap a category to pick options, or leave all blank to see everything.</div>
    ${checkGroup("Make", "f-make", makes)}
    ${checkGroup("Model", "f-model", models)}
    ${checkGroup("Fuel type", "f-fuel", fuels)}
    ${checkGroup("Transmission", "f-trans", transmissions)}
    ${checkGroup("Plate type", "f-board", BOARD_TYPES.map((o) => o.value), (v) => boardTypeLabel(v))}
    <div class="wizard-nav">
      <button type="button" class="wizard-back" id="search-back-btn">← Back</button>
      <button type="button" class="btn btn--primary" id="search-apply-btn">Show results</button>
    </div>
  `;

  body.querySelectorAll(".filter-accordion__header").forEach((header) => {
    header.addEventListener("click", () => {
      header.closest(".filter-accordion").classList.toggle("open");
    });
  });
  body.querySelectorAll('.filter-check-list input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const group = cb.closest(".filter-accordion");
      const n = group.querySelectorAll('input[type="checkbox"]:checked').length;
      const countEl = group.querySelector(".filter-accordion__count");
      countEl.textContent = n > 0 ? n : "";
    });
  });

  document.getElementById("search-back-btn").addEventListener("click", () => renderSearchStep1());
  document.getElementById("search-apply-btn").addEventListener("click", () => applySearchFilters(budget));
}

function applySearchFilters(budget) {
  const body = document.getElementById("search-modal-body");
  const checked = (name) => [...body.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  const makes = checked("f-make");
  const models = checked("f-model");
  const fuels = checked("f-fuel");
  const transmissions = checked("f-trans");
  const boards = checked("f-board");

  let results = MASTER_CARS.filter((c) => (c.price || 0) <= budget);
  if (makes.length) results = results.filter((c) => makes.includes(c.make));
  if (models.length) results = results.filter((c) => models.includes(c.model));
  if (fuels.length) results = results.filter((c) => fuels.includes(c.fuel_type));
  if (transmissions.length) results = results.filter((c) => transmissions.includes(c.transmission));
  if (boards.length) results = results.filter((c) => boards.includes(c.board_type));

  document.getElementById("search-modal").classList.remove("open");
  renderCars(sortCarsList(results), true);
  toast(`${results.length} car${results.length === 1 ? "" : "s"} match your search.`, "success");
}

function hydrateDealerHeader(session) {
  document.getElementById("dealer-current-username").textContent = session.fullName || session.username;
  document.getElementById("dealer-current-shop").textContent = session.shopName || "";
  document.getElementById("dealer-avatar-initials").textContent = initials(session.fullName || session.username);
}

/* ===================================================================
   Notification bell — new listings from other dealers, and bookings
   on your own cars. Polled every 60s; unread state kept in
   localStorage per dealer so the badge survives a page reload.
=================================================================== */
let notifPollInterval = null;
let NOTIF_CACHE = [];

function notifStorageKey(dealerId) {
  return `scd_notif_seen_${dealerId}`;
}

async function refreshNotifBadge() {
  if (!DEALER_SESSION) return;
  const { data, error } = await window.db.rpc("dealer_notifications", {
    p_dealer_id: DEALER_SESSION.id,
    p_limit: 30,
  });
  if (error) {
    console.error(error);
    return;
  }
  NOTIF_CACHE = data || [];
  const lastSeen = localStorage.getItem(notifStorageKey(DEALER_SESSION.id)) || "1970-01-01T00:00:00Z";
  const unread = NOTIF_CACHE.filter((n) => new Date(n.created_at) > new Date(lastSeen)).length;
  const countEl = document.getElementById("notif-count");
  if (unread > 0) {
    countEl.textContent = unread > 9 ? "9+" : String(unread);
    countEl.style.display = "";
  } else {
    countEl.style.display = "none";
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

function renderNotifPanel() {
  const panel = document.getElementById("notif-panel");
  if (!NOTIF_CACHE.length) {
    panel.innerHTML = `<div class="notif-empty">No updates yet.</div>`;
    return;
  }
  panel.innerHTML = NOTIF_CACHE.map((n) => {
    const text =
      n.kind === "booking"
        ? `<strong>${escapeHtml(n.actor_name)}</strong> booked your <strong>${escapeHtml(n.car_label)}</strong>`
        : n.kind === "held_for_you"
        ? `<strong>${escapeHtml(n.actor_name)}</strong> held <strong>${escapeHtml(n.car_label)}</strong> for you`
        : `<strong>${escapeHtml(n.actor_name)}</strong> listed a new car — <strong>${escapeHtml(n.car_label)}</strong>`;
    return `<div class="notif-item">${text}<div class="notif-time">${timeAgo(n.created_at)}</div></div>`;
  }).join("");
}
