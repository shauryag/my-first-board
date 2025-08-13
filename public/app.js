import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase initialization
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
const modalOverlay = document.getElementById('modalOverlay');
const modalDate = document.getElementById('modalDate');
const modalDay = document.getElementById('modalDay');
const closeModal = document.getElementById('closeModal');
const noteInput = document.getElementById('noteInput');
const tagSelect = document.getElementById('tagSelect');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const toast = document.getElementById('toast');

// State
let currentDate = new Date();
let selectedDate = null;
let notesData = {};

// Grid rendering
function renderGrid() {
  grid.innerHTML = '';
  const start = new Date(currentDate);
  start.setDate(start.getDate() - start.getDay());

  monthLabel.textContent = start.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Render weekday headers
  weekdayRow.innerHTML = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    .map(day => `<div>${day}</div>`).join('');

  // Render grid cells
  for (let i = 0; i < 14; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const note = notesData[dateStr] || { text: '', tag: 'none' };

    const cell = document.createElement('div');
    cell.className = 'cell';
    if (date.toDateString() === new Date().toDateString()) {
      cell.classList.add('today');
    }

    cell.innerHTML = `
      <div class="cell-head">
        <span class="date">${date.getDate()}</span>
        <span class="weekday">${date.toLocaleString('default', { weekday: 'short' })}</span>
        ${note.tag !== 'none' ? `<span class="tag tag-${note.tag}">${note.tag}</span>` : ''}
      </div>
      <div class="preview">${note.text || 'Click to add note...'}</div>
    `;

    cell.addEventListener('click', () => openModal(date));
    grid.appendChild(cell);
  }
}

// Modal functions
function openModal(date) {
  selectedDate = date;
  const dateStr = date.toISOString().split('T')[0];
  const note = notesData[dateStr] || { text: '', tag: 'none' };

  modalDate.textContent = date.toLocaleDateString();
  modalDay.textContent = date.toLocaleString('default', { weekday: 'long' });
  noteInput.value = note.text;
  tagSelect.value = note.tag;
  deleteBtn.hidden = !note.text;
  modalOverlay.hidden = false;
  noteInput.focus();
}

function closeModalFunc() {
  modalOverlay.hidden = true;
  selectedDate = null;
}

// Note operations
async function saveNote() {
  if (!selectedDate) return;
  
  const dateStr = selectedDate.toISOString().split('T')[0];
  const text = noteInput.value.trim();
  const tag = tagSelect.value;
  
  notesData[dateStr] = { text, tag };
  
  await supabase
    .from('notes')
    .upsert([{ date: dateStr, text, tag }]);
  
  showToast('Note saved');
  closeModalFunc();
  renderGrid();
}

async function deleteNote() {
  if (!selectedDate) return;
  
  const dateStr = selectedDate.toISOString().split('T')[0];
  delete notesData[dateStr];
  
  await supabase
    .from('notes')
    .delete()
    .eq('date', dateStr);
  
  showToast('Note deleted');
  closeModalFunc();
  renderGrid();
}

// Special notes handling
specialNoteCard.addEventListener('click', async () => {
  const note = prompt('Enter special note:', specialNotePreview.textContent);
  if (note !== null) {
    await supabase
      .from('special_notes')
      .upsert([{ id: 1, text: note }]);
    
    specialNotePreview.textContent = note;
    showToast('Special note updated');
  }
});

// Toast notification
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

// Modal event listeners
closeModal.addEventListener('click', closeModalFunc);
saveBtn.addEventListener('click', saveNote);
deleteBtn.addEventListener('click', deleteNote);

// Data loading
async function loadNotes() {
  const { data } = await supabase.from('notes').select('*');
  notesData = {};
  data?.forEach(note => {
    notesData[note.date] = {
      text: note.text,
      tag: note.tag
    };
  });

  const { data: special } = await supabase
    .from('special_notes')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (special) {
    specialNotePreview.textContent = special.text;
  }
}

// Initialize app
async function init() {
  modalOverlay.hidden = true;
  await loadNotes();
  renderGrid();
}

init();