// === Replace with your Supabase credentials ===
const SUPABASE_URL = "https://kspgpdjkcwgctvkglgpr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk";
// ==============================================

// Load supabase-js via ESM CDN (no build step needed)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Tag → soft color map ----
const TAG_BG = {
  none: null,
  homework: "#f0f9ff", // light blue
  test: "#fff7ed",     // light orange
  exam: "#fee2e2",     // light red
};

// UI refs
const gridEl = document.getElementById("grid");
const weekdayRow = document.getElementById("weekdayRow");
const monthLabel = document.getElementById("monthLabel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const modalOverlay = document.getElementById("modalOverlay");
const modalDate = document.getElementById("modalDate");
const modalDay = document.getElementById("modalDay");
const noteInput = document.getElementById("noteInput");
const tagSelect = document.getElementById("tagSelect");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const closeModal = document.getElementById("closeModal");

const specialCard = document.getElementById("specialNoteCard");
const specialPreview = document.getElementById("specialNotePreview");
const toast = document.getElementById("toast");

// State
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let twoWeeksDates = []; // array of Date objects (14)
let currentEdit = { type: "day", dateISO: null, rowId: null }; // type: 'day' | 'special'
let tasksByISO = {}; // { 'YYYY-MM-DD': {id, note, tag, color} }
let specialRow = null; // { id, note, color }

// ---- Utilities ----
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtDDMMYYYY = (x) => {
  const d = x instanceof Date ? x : new Date(x);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth()+1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const weekdayShort = (d) => d.toLocaleDateString(undefined, { weekday: "short" });

// Find Monday of week containing the first of viewMonth; then 14 consecutive days
function computeTwoWeeks(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7; // Monday=0
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  const days = [];
  for (let i = 0; i < 14; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    days.push(x);
  }
  return days;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => (toast.hidden = true), 1800);
}

// ---- Render ----
function renderWeekdayHeader() {
  const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  weekdayRow.innerHTML = labels.map(l => `<div>${l}</div>`).join("");
}

function renderMonthLabel() {
  monthLabel.textContent = viewMonth.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function renderGrid() {
  gridEl.innerHTML = "";
  // rows: 2; columns: 7
  for (let r = 0; r < 2; r++) {
    const row = document.createElement("div");
    row.className = "grid-row";
    for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c;
      const day = twoWeeksDates[idx];
      const iso = fmtISO(day);
      const cellData = tasksByISO[iso] || null;
      const tag = cellData?.tag || "none";
      const bg = TAG_BG[tag];

      const cell = document.createElement("div");
      cell.className = "cell";
      if (bg) cell.style.background = bg;

      cell.innerHTML = `
        <div class="cell-head">
          <div>
            <div class="date">${fmtDDMMYYYY(day)}</div>
            <div class="weekday">${weekdayShort(day)}</div>
          </div>
          ${tag !== "none" ? `<div class="tag">${tag}</div>` : ""}
        </div>
        <div class="preview">${cellData?.note ? escapeHtml(cellData.note) : ""}</div>
      `;
      cell.addEventListener("click", () => openDayModal(day, cellData));
      row.appendChild(cell);
    }
    gridEl.appendChild(row);
  }
}

function renderSpecialCard() {
  if (specialRow) {
    specialPreview.textContent = specialRow.note || "";
    if (specialRow.color) specialCard.style.background = specialRow.color;
    else specialCard.style.removeProperty("background");
  } else {
    specialPreview.textContent = "Click to add special notes…";
    specialCard.style.removeProperty("background");
  }
}

// ---- Modal ----
function openDayModal(dateObj, cellData) {
  currentEdit = { type: "day", dateISO: fmtISO(dateObj), rowId: cellData?.id || null };
  modalDate.textContent = fmtDDMMYYYY(dateObj);
  modalDay.textContent = dateObj.toLocaleDateString(undefined, { weekday: "long" });
  noteInput.value = cellData?.note || "";
  tagSelect.value = cellData?.tag || "none";
  deleteBtn.hidden = !cellData?.id;
  modalOverlay.hidden = false;
}

function openSpecialModal() {
  currentEdit = { type: "special", dateISO: null, rowId: specialRow?.id || null };
  modalDate.textContent = "Special Notes";
  modalDay.textContent = "Shared reminders, tests, events";
  noteInput.value = specialRow?.note || "";
  // convert special color back to closest tag (optional); default none
  tagSelect.value = colorToTag(specialRow?.color) || "none";
  deleteBtn.hidden = !specialRow?.id;
  modalOverlay.hidden = false;
}

function closeModalUI() { modalOverlay.hidden = true; }

// ---- Data (Supabase) ----
// We will use these **schema expectations**:
//
// tasks table (your screenshot variant):
//   id UUID (or any PK)
//   title TEXT (optional; we derive first line of note)
//   description TEXT  ← we store note text here
//   date DATE         ← 'YYYY-MM-DD'
//   color TEXT        ← we store the tag keyword here: 'none' | 'homework' | 'test' | 'exam'
//   created_at TIMESTAMPTZ (optional)
//
// special_notes table:
//   id UUID (or INT) PK
//   note TEXT
//   color TEXT (hex)  ← we store the resolved background color
//   created_at TIMESTAMPTZ
//
// If your `color` column in tasks previously stored hex values — no problem;
// this version stores the **tag** string in `tasks.color` for simplicity.

async function loadMonth() {
  // compute dates
  twoWeeksDates = computeTwoWeeks(viewMonth);
  const isoList = twoWeeksDates.map(fmtISO);

  // fetch tasks for these 14 days
  tasksByISO = {};
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, date, description, color, title, created_at")
      .in("date", isoList);
    if (error) throw error;
    (data || []).forEach(row => {
      const iso = (row.date || "").toString().slice(0,10);
      tasksByISO[iso] = {
        id: row.id,
        note: row.description || "",
        tag: (row.color || "none"), // storing tag keyword here
      };
    });
  } catch (e) {
    console.error("loadMonth tasks:", e);
  }

  // fetch special note (first row)
  try {
    const { data, error } = await supabase
      .from("special_notes")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw error;
    specialRow = (data && data[0]) ? data[0] : null;
  } catch (e) {
    console.error("loadMonth special:", e);
  }

  // render
  renderMonthLabel();
  renderWeekdayHeader();
  renderGrid();
  renderSpecialCard();
}

async function saveCurrent() {
  if (currentEdit.type === "day") {
    const note = (noteInput.value || "").trim();
    const tag = tagSelect.value; // 'none'|'homework'|'test'|'exam'
    const title = note.split("\n")[0].slice(0, 80);
    if (currentEdit.rowId) {
      // update
      const { error } = await supabase.from("tasks").update({
        title,
        description: note,
        color: tag,
      }).eq("id", currentEdit.rowId);
      if (error) return errOut(error);
    } else {
      // insert
      const { error } = await supabase.from("tasks").insert([{
        title,
        description: note,
        date: currentEdit.dateISO,
        color: tag,
      }]);
      if (error) return errOut(error);
    }
    showToast("Saved");
  } else {
    // special
    const note = (noteInput.value || "").trim();
    const tag = tagSelect.value;
    const colorHex = TAG_BG[tag] || null;

    if (specialRow?.id) {
      const { error } = await supabase.from("special_notes")
        .update({ note, color: colorHex })
        .eq("id", specialRow.id);
      if (error) return errOut(error);
    } else {
      const { error } = await supabase.from("special_notes")
        .insert([{ note, color: colorHex }]);
      if (error) return errOut(error);
    }
    showToast("Special note saved");
  }

  await loadMonth();
  closeModalUI();
}

async function deleteCurrent() {
  if (currentEdit.type === "day" && currentEdit.rowId) {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", currentEdit.rowId);
    if (error) return errOut(error);
    showToast("Deleted");
    await loadMonth();
    closeModalUI();
  } else if (currentEdit.type === "special" && specialRow?.id) {
    if (!confirm("Clear special note?")) return;
    const { error } = await supabase.from("special_notes").delete().eq("id", specialRow.id);
    if (error) return errOut(error);
    showToast("Cleared");
    await loadMonth();
    closeModalUI();
  }
}

function errOut(error) {
  console.error(error);
  alert("Operation failed. Check console.");
}

// map a stored color hex back to closest tag (best effort)
function colorToTag(hex) {
  if (!hex) return "none";
  const map = Object.entries(TAG_BG).find(([k, v]) => v && v.toLowerCase() === hex.toLowerCase());
  return map ? map[0] : "none";
}

// simple HTML escape for preview
function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));
}

// ---- Events ----
prevBtn.addEventListener("click", () => {
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
  loadMonth();
});
nextBtn.addEventListener("click", () => {
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  loadMonth();
});
closeModal.addEventListener("click", closeModalUI);
saveBtn.addEventListener("click", saveCurrent);
deleteBtn.addEventListener("click", deleteCurrent);
specialCard.addEventListener("click", openSpecialModal);
specialCard.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") openSpecialModal(); });

// Init
loadMonth();
