import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase initialization
const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// State
let currentDate = new Date();
let selectedDate = null;
let notesData = {};

// DOM Elements
const grid = document.getElementById('grid');
const modalOverlay = document.getElementById('modalOverlay');
const noteInput = document.getElementById('noteInput');
const typeSelect = document.getElementById('typeSelect');

// Load notes from Supabase
async function loadNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*');
  
  if (error) {
    console.error('Error loading notes:', error);
    return;
  }

  notesData = {};
  data.forEach(note => {
    notesData[note.date] = {
      text: note.text,
      type: note.type
    };
  });

  renderGrid();
}

// Save note to Supabase
async function saveNote() {
  if (!selectedDate) return;

  const dateStr = selectedDate.toISOString().split('T')[0];
  const text = noteInput.value.trim();
  const type = typeSelect.value;

  const { error } = await supabase
    .from('notes')
    .upsert({
      date: dateStr,
      text: text,
      type: type
    });

  if (error) {
    console.error('Error saving note:', error);
    return;
  }

  notesData[dateStr] = { text, type };
  closeModal();
  renderGrid();
}

// Delete note from Supabase
async function deleteNote() {
  if (!selectedDate) return;

  const dateStr = selectedDate.toISOString().split('T')[0];

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('date', dateStr);

  if (error) {
    console.error('Error deleting note:', error);
    return;
  }

  delete notesData[dateStr];
  closeModal();
  renderGrid();
}

// Render grid with notes
function renderGrid() {
  grid.innerHTML = '';
  const start = new Date(currentDate);
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(start);
    const dateStr = date.toISOString().split('T')[0];
    const note = notesData[dateStr];

    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    if (note) {
      cell.textContent = note.text;
      cell.dataset.type = note.type;
    }
    
    cell.addEventListener('click', () => openModal(date));
    grid.appendChild(cell);
  }
}

// Modal handlers
function openModal(date) {
  selectedDate = date;
  const dateStr = date.toISOString().split('T')[0];
  const note = notesData[dateStr] || { text: '', type: 'homework' };

  noteInput.value = note.text;
  typeSelect.value = note.type;
  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
  selectedDate = null;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  
  // Event listeners
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('saveBtn').addEventListener('click', saveNote);
  document.getElementById('deleteBtn').addEventListener('click', deleteNote);
});