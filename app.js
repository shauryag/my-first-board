import { createClient } from '@supabase/supabase-js';

// 🔹 Replace with your own Supabase project credentials
const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM elements ---
const grid = document.getElementById('grid');
const weekdayRow = document.getElementById('weekdayRow');
const monthLabel = document.getElementById('monthLabel');
const specialNotePreview = document.getElementById('specialNotePreview');
const specialNoteCard = document.getElementById('specialNoteCard');

// Modal elements
const modalOverlay = document.getElementById('modalOverlay');
const modalDate = document.getElementById('modalDate');
const modalDay = document.getElementById('modalDay');
const noteInput = document.getElementById('noteInput');
const tagSelect = document.getElementById('tagSelect');
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');

// Toast
const toast = document.getElementById('toast');

let currentMonth = new Date();
let selectedDate = null;
let notesData = {}; // cache for quick lookup

// --- Helper: Show toast ---
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => toast.hidden = true, 2000);
}

// --- Load notes from Supabase ---
async function loadNotes() {
  const { data, error } = await supabase.from('notes').select('*');
  if (error) {
    console.error('Error loading notes:', error);
    return;
  }
  notesData = {};
  data.forEach(row => {
    notesData[row.date] = row;
  });

  // Update special note preview
  if (notesData['special']) {
    specialNotePreview.textContent = notesData['special'].special_note || "Click to add special notes…";
  } else {
    specialNotePreview.textContent = "Click to add special notes…";
  }

  renderCalendar();
}

// --- Render weekday header ---
function renderWeekdays() {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  weekdayRow.innerHTML = days.map(d => `<div class="weekday">${d}</div>`).join('');
}

// --- Render the calendar ---
function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  monthLabel.textContent = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  grid.innerHTML = '';

  for (let week = 0; week < 2; week++) {
    for (let day = 0; day < 7; day++) {
      const dateNum = week * 7 + day - startDay + 1;
      const cell = document.createElement('div');
      cell.classList.add('day-cell');

      if (dateNum > 0 && dateNum <= new Date(year, month + 1, 0).getDate()) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dateNum).padStart(2,'0')}`;
        cell.dataset.date = dateStr;
        cell.innerHTML = `<div class="date">${dateNum}</div>`;

        if (notesData[dateStr]) {
          const note = notesData[dateStr];
          if (note.tag && note.tag !== 'none') {
            cell.classList.add(`tag-${note.tag}`);
          }
        }

        cell.addEventListener('click', () => openModal(dateStr));
      }

      grid.appendChild(cell);
    }
  }
}

// --- Open modal ---
function openModal(dateStr) {
  selectedDate = dateStr;
  modalDate.textContent = dateStr;
  modalDay.textContent = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
  noteInput.value = notesData[dateStr]?.note || '';
  tagSelect.value = notesData[dateStr]?.tag || 'none';
  deleteBtn.hidden = !notesData[dateStr];
  modalOverlay.hidden = false;
}

// --- Save note ---
async function saveNote() {
  if (selectedDate === 'special') {
    await supabase.from('notes').upsert({ date: 'special', special_note: noteInput.value });
  } else {
    await supabase.from('notes').upsert({
      date: selectedDate,
      note: noteInput.value,
      tag: tagSelect.value
    });
  }
  showToast('Saved!');
  modalOverlay.hidden = true;
  loadNotes();
}

// --- Delete note ---
async function deleteNote() {
  await supabase.from('notes').delete().eq('date', selectedDate);
  showToast('Deleted!');
  modalOverlay.hidden = true;
  loadNotes();
}

// --- Event listeners ---
document.getElementById('prevBtn').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById('nextBtn').addEventListener('click', () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
});
document.getElementById('closeModal').addEventListener('click', () => modalOverlay.hidden = true);
saveBtn.addEventListener('click', saveNote);
deleteBtn.addEventListener('click', deleteNote);
specialNoteCard.addEventListener('click', () => {
  selectedDate = 'special';
  modalDate.textContent = 'Special Notes';
  modalDay.textContent = '';
  noteInput.value = notesData['special']?.special_note || '';
  tagSelect.value = 'none';
  deleteBtn.hidden = true;
  modalOverlay.hidden = false;
});

// --- Init ---
renderWeekdays();
loadNotes();
