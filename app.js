import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase credentials
const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const planner = document.getElementById('planner');
const specialNotes = document.getElementById('specialNotes');
const noteDialog = document.getElementById('noteDialog');
const noteContent = document.getElementById('noteContent');
const noteColor = document.getElementById('noteColor');
const saveNote = document.getElementById('saveNote');
const closeDialog = document.getElementById('closeDialog');

let currentNote = { id: null, type: null };

// Load planner (2 weeks)
async function loadPlanner() {
  planner.innerHTML = '';
  for (let i = 0; i < 14; i++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'note';
    dayDiv.dataset.index = i;
    dayDiv.addEventListener('click', () => openDialog(i, 'tasks'));
    planner.appendChild(dayDiv);
  }

  const { data: tasks } = await supabase.from('tasks').select('*');
  tasks?.forEach(task => {
    const cell = planner.children[task.day_index];
    if (cell) {
      cell.textContent = task.content;
      cell.style.backgroundColor = task.color || '#ffffff';
    }
  });
}

// Load special notes
async function loadSpecialNotes() {
  specialNotes.textContent = '';
  specialNotes.addEventListener('click', () => openDialog(0, 'special_notes'));

  const { data } = await supabase.from('special_notes').select('*').single();
  if (data) {
    specialNotes.textContent = data.content;
    specialNotes.style.backgroundColor = data.color || '#ffffff';
  }
}

// Open dialog
function openDialog(index, type) {
  currentNote = { id: index, type };
  noteContent.value = '';
  noteColor.value = '#ffffff';
  noteDialog.style.display = 'block';
}

// Save note
saveNote.addEventListener('click', async () => {
  const content = noteContent.value;
  const color = noteColor.value;

  if (currentNote.type === 'tasks') {
    await supabase.from('tasks').upsert({ day_index: currentNote.id, content, color });
  } else {
    await supabase.from('special_notes').upsert({ id: 1, content, color });
  }

  noteDialog.style.display = 'none';
  loadPlanner();
  loadSpecialNotes();
});

// Close dialog
closeDialog.addEventListener('click', () => {
  noteDialog.style.display = 'none';
});

// Initial load
loadPlanner();
loadSpecialNotes();
