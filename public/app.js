import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// 🔹 Replace with your own Supabase project credentials
const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const grid = document.getElementById('grid');
const weekdayRow = document.getElementById('weekdayRow');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const monthLabel = document.getElementById('monthLabel');
const specialNoteCard = document.getElementById('specialNoteCard');
const specialNotePreview = document.getElementById('specialNotePreview');
const modalOverlay = document.getElementById('modalOverlay');
const modalDate = document.getElementById('modalDate');
const modalDay = document.getElementById('modalDay');
const closeModal = document.getElementById('closeModal');
const noteInput = document.getElementById('noteInput');
const tagSelect = document.getElementById('tagSelect');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const toast = document.getElementById('toast');

let currentDate = new Date();
let selectedDate = null;
let notesData = {};

// Render weekdays header
function renderWeekdays() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdayRow.innerHTML = weekdays.map(day => `<div class="weekday">${day}</div>`).join('');
}

// Render 2-week grid
function renderGrid() {
  grid.innerHTML = '';
  const start = new Date(currentDate);
  start.setDate(start.getDate() - start.getDay());

  for (let i = 0; i < 14; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const note = notesData[dateStr] || { text: '', tag: 'none' };

    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.tabIndex = 0; // Make cell focusable
    
    cell.innerHTML = `
      <div class="cell-head">
        <span class="date">${date.getDate()}</span>
        <span class="weekday">${date.toLocaleString('default', { weekday: 'short' })}</span>
      </div>
      <div class="preview">${note.text || 'Click to add note...'}</div>
    `;

    // Make cell clickable to open modal
    cell.addEventListener('click', () => openModal(date));
    cell.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') openModal(date);
    });

    grid.appendChild(cell);
  }
}

function openModal(date) {
  selectedDate = date;
  const dateStr = date.toISOString().split('T')[0];
  const note = notesData[dateStr] || { text: '', tag: 'none' };

  modalDate.textContent = date.toLocaleDateString();
  modalDay.textContent = date.toLocaleString('default', { weekday: 'long' });
  noteInput.value = note.text;
  modalOverlay.hidden = false;
  noteInput.focus(); // Focus the textarea when modal opens
}

async function saveNote() {
  if (!selectedDate) return;
  
  const dateStr = selectedDate.toISOString().split('T')[0];
  const text = noteInput.value.trim();
  
  notesData[dateStr] = { text, tag: 'none' };
  
  await supabase
    .from('notes')
    .upsert([{ date: dateStr, text, tag: 'none' }]);
  
  showToast('Saved');
  closeModalFunc();
  renderGrid(); // Refresh grid to show updated note
}

async function deleteNote() {
  if (!selectedDate) return;
  const dateStr = selectedDate.toISOString().split('T')[0];
  delete notesData[dateStr];
  await supabase.from('notes').delete().eq('date', dateStr);
  showToast('Deleted');
  closeModalFunc();
  renderGrid();
}

// Special notes handling
specialNoteCard.addEventListener('click', async () => {
  const note = prompt('Enter special note:', specialNotePreview.textContent);
  if (note !== null) {
    specialNotePreview.textContent = note || 'Click to add special notes…';
    await supabase.from('special_notes').upsert([{ id: 1, text: note }]);
  }
});

// Toast
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => toast.hidden = true, 2000);
}

// Navigation
prevBtn.addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 14);
  renderGrid();
});
nextBtn.addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 14);
  renderGrid();
});

// Modal buttons
closeModal.addEventListener('click', closeModalFunc);
saveBtn.addEventListener('click', saveNote);
deleteBtn.addEventListener('click', deleteNote);

// Load data
async function loadNotes() {
  const { data } = await supabase.from('notes').select('*');
  notesData = {};
  data?.forEach(note => {
    notesData[note.date] = { text: note.text, tag: note.tag };
  });

  const { data: special } = await supabase.from('special_notes').select('*').eq('id', 1).single();
  if (special?.text) {
    specialNotePreview.textContent = special.text;
  }

  renderWeekdays();
  renderGrid();
}

// Init
loadNotes();
modalOverlay.hidden = true;
document.addEventListener('DOMContentLoaded', () => {
  modalOverlay.hidden = true;
});
