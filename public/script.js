const COOKIE_NAME = "workouts";
const EMAIL_COOKIE = "userEmail";
const tbody = document.getElementById("workout-tbody");
const emailSection = document.getElementById("email-section");

let workouts = [];

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Cookie helpers
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift());
  }
  return null;
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadWorkouts() {
  const raw = getCookie(COOKIE_NAME);
  if (raw) {
    try {
      workouts = JSON.parse(raw);
      if (!Array.isArray(workouts)) workouts = [];
    } catch {
      workouts = [];
    }
  } else {
    workouts = [];
  }
  // Always keep descending date order (then time)
  sortWorkouts();
  renderEmailSection();
  renderTable();
}

function saveWorkouts() {
  setCookie(COOKIE_NAME, JSON.stringify(workouts));
}

function sortWorkouts() {
  workouts.sort((a, b) => {
    const da = a.date + "T" + (a.time || "00:00");
    const db = b.date + "T" + (b.time || "00:00");
    return db.localeCompare(da); // descending
  });
}

// Time options: 05:00 to 23:45 in 15-min increments
function buildTimeOptions(selected = "") {
  let html = "";
  for (let h = 5; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const val = `${hh}:${mm}`;
      html += `<option value="${val}" ${val === selected ? "selected" : ""}>${val}</option>`;
    }
  }
  return html;
}

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getLatestDefaults() {
  if (workouts.length === 0) {
    return { type: "walk", distance: "" };
  }
  // workouts already sorted descending, so first is latest
  return {
    type: workouts[0].type || "walk",
    distance: workouts[0].distance != null ? workouts[0].distance : ""
  };
}

function createInputRow() {
  const defaults = getLatestDefaults();
  const tr = document.createElement("tr");
  tr.className = "input-row";
  tr.innerHTML = `
    <td><input type="date" id="new-date" value="${getToday()}"></td>
    <td><select id="new-time">${buildTimeOptions("07:00")}</select></td>
    <td>
      <select id="new-type">
        <option value="walk" ${defaults.type === "walk" ? "selected" : ""}>walk</option>
        <option value="run" ${defaults.type === "run" ? "selected" : ""}>run</option>
        <option value="swim" ${defaults.type === "swim" ? "selected" : ""}>swim</option>
        <option value="bike" ${defaults.type === "bike" ? "selected" : ""}>bike</option>
        <option value="other" ${defaults.type === "other" ? "selected" : ""}>other</option>
      </select>
    </td>
    <td><input type="number" id="new-distance" step="0.01" min="0" value="${defaults.distance}" placeholder="0.00"></td>
    <td><input type="number" id="new-pace" step="0.1" min="0" placeholder="0.0"></td>
    <td><input type="text" id="new-bp" placeholder="120/80"></td>
    <td><input type="number" id="new-temp" step="1" placeholder="°F"></td>
    <td><input type="text" id="new-weather" placeholder="sunny, rainy..."></td>
    <td><textarea id="new-comments" rows="1" placeholder="notes..."></textarea></td>
    <td>
      <button type="button" class="btn-save" id="btn-add-save">Save</button>
      <button type="button" class="btn-cancel" id="btn-add-cancel">Cancel</button>
    </td>
  `;
  return tr;
}

function clearInputRow() {
  document.getElementById("new-date").value = getToday();
  document.getElementById("new-time").value = "07:00";
  const defaults = getLatestDefaults();
  document.getElementById("new-type").value = defaults.type;
  document.getElementById("new-distance").value = defaults.distance;
  document.getElementById("new-pace").value = "";
  document.getElementById("new-bp").value = "";
  document.getElementById("new-temp").value = "";
  document.getElementById("new-weather").value = "";
  document.getElementById("new-comments").value = "";
}

function collectInputValues(prefix = "new-") {
  return {
    date: document.getElementById(prefix + "date").value,
    time: document.getElementById(prefix + "time").value,
    type: document.getElementById(prefix + "type").value,
    distance: parseFloat(document.getElementById(prefix + "distance").value) || 0,
    pace: parseFloat(document.getElementById(prefix + "pace").value) || 0,
    bp: document.getElementById(prefix + "bp").value.trim(),
    temp: document.getElementById(prefix + "temp").value
      ? parseFloat(document.getElementById(prefix + "temp").value)
      : null,
    weather: document.getElementById(prefix + "weather").value.trim(),
    comments: document.getElementById(prefix + "comments").value.trim()
  };
}

function renderEmailSection() {
  const email = getCookie(EMAIL_COOKIE);
  emailSection.innerHTML = "";

  if (email && isValidEmail(email)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-email";
    btn.textContent = "Email all workouts";
    btn.addEventListener("click", sendWorkoutsEmail);
    emailSection.appendChild(btn);
  } else {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-register";
    btn.textContent = "Register my email";
    btn.addEventListener("click", registerEmail);
    emailSection.appendChild(btn);
  }
}

function registerEmail() {
  const email = prompt("Enter your email address:");
  if (!email) return;
  const trimmed = email.trim();
  if (!isValidEmail(trimmed)) {
    alert("Please enter a valid email address.");
    return;
  }
  setCookie(EMAIL_COOKIE, trimmed);
  renderEmailSection();
  alert("Email registered successfully.");
}

async function sendWorkoutsEmail() {
  const email = getCookie(EMAIL_COOKIE);
  if (!email || !isValidEmail(email)) {
    alert("No valid email registered.");
    renderEmailSection();
    return;
  }
  if (workouts.length === 0) {
    alert("No workouts to email.");
    return;
  }
  if (!confirm(`Send all ${workouts.length} workout(s) to ${email}?`)) return;

  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, workouts })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert("Email sent successfully!");
    } else {
      alert("Failed to send email: " + (data.error || res.statusText || "Unknown error"));
    }
  } catch (err) {
    alert("Network error while sending email. Please try again.");
    console.error(err);
  }
}

function renderTable() {
  tbody.innerHTML = "";

  // Always first: the new-entry row
  const inputRow = createInputRow();
  tbody.appendChild(inputRow);

  // Wire add buttons
  document.getElementById("btn-add-save").addEventListener("click", () => {
    const data = collectInputValues("new-");
    if (!data.date || !data.time) {
      alert("Date and time are required.");
      return;
    }
    const workout = {
      id: generateId(),
      ...data
    };
    workouts.unshift(workout); // add to front
    sortWorkouts();
    saveWorkouts();
    renderTable();
  });

  document.getElementById("btn-add-cancel").addEventListener("click", clearInputRow);

  // Existing workouts
  if (workouts.length === 0) {
    const emptyTr = document.createElement("tr");
    emptyTr.innerHTML = `<td colspan="10" class="empty-message">No workouts yet. Add your first one above!</td>`;
    tbody.appendChild(emptyTr);
    return;
  }

  workouts.forEach((w) => {
    const tr = document.createElement("tr");
    tr.dataset.id = w.id;
    tr.innerHTML = `
      <td class="display">${w.date}</td>
      <td class="display">${w.time}</td>
      <td class="display">${w.type}</td>
      <td class="display">${w.distance}</td>
      <td class="display">${w.pace}</td>
      <td class="display">${w.bp || ""}</td>
      <td class="display">${w.temp != null ? w.temp : ""}</td>
      <td class="display">${w.weather || ""}</td>
      <td class="display">${w.comments || ""}</td>
      <td>
        <button type="button" class="btn-edit">Edit</button>
        <button type="button" class="btn-delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);

    const editBtn = tr.querySelector(".btn-edit");
    const deleteBtn = tr.querySelector(".btn-delete");

    editBtn.addEventListener("click", () => startInlineEdit(tr, w));
    deleteBtn.addEventListener("click", () => {
      if (!confirm("Delete this workout?")) return;
      workouts = workouts.filter((item) => item.id !== w.id);
      saveWorkouts();
      renderTable();
    });
  });
}

function startInlineEdit(tr, w) {
  tr.classList.add("editing");
  tr.innerHTML = `
    <td><input type="date" class="edit-date" value="${w.date}"></td>
    <td><select class="edit-time">${buildTimeOptions(w.time)}</select></td>
    <td>
      <select class="edit-type">
        <option value="walk" ${w.type === "walk" ? "selected" : ""}>walk</option>
        <option value="run" ${w.type === "run" ? "selected" : ""}>run</option>
        <option value="swim" ${w.type === "swim" ? "selected" : ""}>swim</option>
        <option value="bike" ${w.type === "bike" ? "selected" : ""}>bike</option>
        <option value="other" ${w.type === "other" ? "selected" : ""}>other</option>
      </select>
    </td>
    <td><input type="number" class="edit-distance" step="0.01" min="0" value="${w.distance}"></td>
    <td><input type="number" class="edit-pace" step="0.1" min="0" value="${w.pace}"></td>
    <td><input type="text" class="edit-bp" value="${w.bp || ""}" placeholder="120/80"></td>
    <td><input type="number" class="edit-temp" step="1" value="${w.temp != null ? w.temp : ""}"></td>
    <td><input type="text" class="edit-weather" value="${w.weather || ""}"></td>
    <td><textarea class="edit-comments" rows="1">${w.comments || ""}</textarea></td>
    <td>
      <button type="button" class="btn-save">Save</button>
      <button type="button" class="btn-cancel">Cancel</button>
    </td>
  `;

  const saveBtn = tr.querySelector(".btn-save");
  const cancelBtn = tr.querySelector(".btn-cancel");

  saveBtn.addEventListener("click", () => {
    const updated = {
      id: w.id,
      date: tr.querySelector(".edit-date").value,
      time: tr.querySelector(".edit-time").value,
      type: tr.querySelector(".edit-type").value,
      distance: parseFloat(tr.querySelector(".edit-distance").value) || 0,
      pace: parseFloat(tr.querySelector(".edit-pace").value) || 0,
      bp: tr.querySelector(".edit-bp").value.trim(),
      temp: tr.querySelector(".edit-temp").value
        ? parseFloat(tr.querySelector(".edit-temp").value)
        : null,
      weather: tr.querySelector(".edit-weather").value.trim(),
      comments: tr.querySelector(".edit-comments").value.trim()
    };

    // Basic validation
    if (!updated.date || !updated.time) {
      alert("Date and time are required.");
      return;
    }

    // Update the workout in the array
    const idx = workouts.findIndex((item) => item.id === w.id);
    if (idx !== -1) {
      workouts[idx] = updated;
      sortWorkouts();
      saveWorkouts();
      renderTable();
    }
  });

  cancelBtn.addEventListener("click", () => {
    renderTable(); // simply re-render to exit edit mode
  });
}

document.addEventListener("DOMContentLoaded", loadWorkouts);