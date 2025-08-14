import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Supabase config ---
const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentStartDate;
let currentFamilyId = null;

// ---------------- UI ----------------
function updateUI(user) {
  const signInBtn = document.getElementById('sign-in-btn');
  const userInfoDiv = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userNameSpan = document.getElementById('user-name');

  if (user) {
    signInBtn.style.display = 'none';
    userInfoDiv.style.display = 'flex';
    userAvatar.src = user.user_metadata?.avatar_url || '';
    userNameSpan.innerText = user.user_metadata?.full_name || '';
  } else {
    signInBtn.style.display = 'inline-block';
    userInfoDiv.style.display = 'none';
  }
}

function setupChildNameLocal() {
  const name = localStorage.getItem('childName');
  const header = document.getElementById('child-name-header');
  const modal = document.getElementById('name-modal');
  if (name) {
    header.innerText = name;
    modal.style.display = 'none';
  } else {
    header.innerText = 'Homeboard';
    modal.style.display = 'block';
  }
}

async function saveChildName() {
  const name = document.getElementById('child-name-input').value.trim();
  if (!name) {
    alert('Please enter a name!');
    return;
  }
  localStorage.setItem('childName', name);
  document.getElementById('child-name-header').innerText = name;
  document.getElementById('name-modal').style.display = 'none';

  if (currentFamilyId) {
    const { error } = await supabase.from('families')
      .update({ child_name: name })
      .eq('id', currentFamilyId);
    if (error) console.error('Error saving child name to DB:', error);
  }
}

// ---------------- Family ----------------
function showFamilyModal() {
  document.getElementById('family-modal').style.display = 'block';
  renderFamilyOptions();
}

function renderFamilyOptions() {
  document.getElementById('create-family-btn').style.display = 'block';
  document.getElementById('join-family-btn').style.display = 'block';
  document.getElementById('join-family-form').style.display = 'none';
}

function renderJoinFamilyForm() {
  document.getElementById('create-family-btn').style.display = 'none';
  document.getElementById('join-family-btn').style.display = 'none';
  document.getElementById('join-family-form').style.display = 'block';
}

async function createFamily() {
  const { data: familyData, error: familyError } = await supabase.from('families').insert({}).select();
  if (familyError) { console.error('Error creating family:', familyError); return; }

  const newFamilyId = familyData[0].id;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { alert('Please sign in first.'); return; }

  await supabase.from('user_profiles').insert({
    user_id: session.user.id,
    family_id: newFamilyId
  });

  currentFamilyId = newFamilyId;

  // 🔹 Sync local child name to DB if exists
  const localName = localStorage.getItem('childName');
  if (localName) {
    await supabase.from('families')
      .update({ child_name: localName })
      .eq('id', currentFamilyId);
    document.getElementById('child-name-header').innerText = localName;
  } else {
    document.getElementById('name-modal').style.display = 'block';
  }

  document.getElementById('family-modal').style.display = 'none';
  await renderGrid(currentStartDate);
  await loadNotes();
  await renderReminders();
}

async function joinFamily() {
  const familyIdInput = document.getElementById('family-id-input').value.trim();
  if (!familyIdInput) { alert('Enter a Family ID'); return; }

  const { data: familyExists } = await supabase.from('families').select('id').eq('id', familyIdInput);
  if (!familyExists || familyExists.length === 0) { alert('Invalid Family ID!'); return; }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { alert('Please sign in first.'); return; }

  await supabase.from('user_profiles').insert({
    user_id: session.user.id,
    family_id: familyIdInput
  });

  currentFamilyId = familyIdInput;

  // 🔹 Sync local child name if present, otherwise fetch from DB
  const localName = localStorage.getItem('childName');
  if (localName) {
    await supabase.from('families')
      .update({ child_name: localName })
      .eq('id', currentFamilyId);
    document.getElementById('child-name-header').innerText = localName;
  } else {
    const { data: famRow } = await supabase.from('families')
      .select('child_name')
      .eq('id', currentFamilyId)
      .single();
    if (famRow?.child_name) {
      localStorage.setItem('childName', famRow.child_name);
      document.getElementById('child-name-header').innerText = famRow.child_name;
    } else {
      document.getElementById('name-modal').style.display = 'block';
    }
  }

  document.getElementById('family-modal').style.display = 'none';
  await renderGrid(currentStartDate);
  await loadNotes();
  await renderReminders();
}

async function setupFamily(user) {
  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id);
  if (data.length > 0) {
    currentFamilyId = data[0].family_id;
    const { data: fam } = await supabase.from('families').select('child_name').eq('id', currentFamilyId).single();
    if (fam?.child_name) {
      document.getElementById('child-name-header').innerText = fam.child_name;
      localStorage.setItem('childName', fam.child_name);
    } else {
      setupChildNameLocal();
    }
    await renderGrid(currentStartDate);
    await loadNotes();
    await renderReminders();
  } else {
    showFamilyModal();
    const localName = localStorage.getItem('childName');
    if (!localName) {
      document.getElementById('name-modal').style.display = 'block';
    } else {
      document.getElementById('child-name-header').innerText = localName;
    }
  }
}

// ---------------- Grid ----------------
async function renderGrid(startDate) {
  document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
  const gridContainer = document.getElementById('grid-container');
  gridContainer.innerHTML = '';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th></th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th><th>Sunday</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const dates = [];
  for (let w = 0; w < 2; w++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const tr = document.createElement('tr');
    const weekLabel = document.createElement('th');
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekLabel.innerText = `Week ${w + 1} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    tr.appendChild(weekLabel);

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate() + d);
      const dateStr = cellDate.toISOString().split('T')[0];
      dates.push(dateStr);
      const td = document.createElement('td');
      td.classList.add('cell');
      td.dataset.date = dateStr;
      td.innerHTML = `<div class="date-label">${cellDate.getDate()}</div><div class="content"></div>`;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  gridContainer.appendChild(table);

  if (!currentFamilyId) return;

  const { data } = await supabase.from('homeboard_entries')
    .select('*, reminder_set')
    .in('date', dates)
    .eq('family_id', currentFamilyId);
  (data || []).forEach(entry => {
    const cell = document.querySelector(`.cell[data-date="${entry.date}"]`);
    if (cell) {
      cell.querySelector('.content').innerText = entry.content || '';
      cell.dataset.type = entry.type || '';
      cell.dataset.reminder = entry.reminder_set || false;
    }
  });
}

// ---------------- Notes / Reminders ----------------
async function loadNotes() {
  if (!currentFamilyId) return;
  const { data } = await supabase.from('special_notes').select('*').eq('id', 1).eq('family_id', currentFamilyId);
  if (data && data.length > 0) {
    document.getElementById('notes-content').innerText = data[0].content || 'Enter notes...';
  }
}

async function saveEntry() {
  if (!currentFamilyId) {
    showFamilyModal();
    return;
  }
  const modal = document.getElementById('modal');
  const date = modal.dataset.date;
  const content = document.getElementById('content').value || '';
  let type = document.getElementById('type').value;
  if (content === '') type = '';
  if (date === 'notes') {
    await supabase.from('special_notes').upsert({ id: 1, content, family_id: currentFamilyId });
    document.getElementById('notes-content').innerText = content || 'Enter notes...';
  } else {
    const reminderSet = document.getElementById('set-reminder').checked;
    await supabase.from('homeboard_entries').upsert({ date, content, type, reminder_set: reminderSet, family_id: currentFamilyId });
    const cell = document.querySelector(`.cell[data-date="${date}"]`);
    if (cell) {
      cell.querySelector('.content').innerText = content;
      cell.dataset.type = type;
      cell.dataset.reminder = reminderSet;
    }
  }
  modal.style.display = 'none';
}

async function renderReminders() {
  if (!currentFamilyId) return;
  const { data } = await supabase.from('homeboard_entries')
    .select('date, content, type, reminder_set')
    .eq('family_id', currentFamilyId)
    .or('type.eq.exam,type.eq.test')
    .order('date', { ascending: true });
  const list = document.getElementById('reminders-list');
  list.innerHTML = '';
  (data || []).forEach(entry => {
    const li = document.createElement('li');
    li.innerText = `${entry.date}: ${entry.content}`;
    list.appendChild(li);
  });
}

// ---------------- Init ----------------
async function init() {
  const today = new Date();
  const dow = today.getDay();
  const diff = today.getDate() - dow + (dow === 0 ? -6 : 1);
  currentStartDate = new Date(today.setDate(diff));

  await renderGrid(currentStartDate);

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    updateUI(session.user);
    await setupFamily(session.user);
  } else {
    updateUI(null);
    const localName = localStorage.getItem('childName');
    if (!localName) {
      document.getElementById('name-modal').style.display = 'block';
    } else {
      document.getElementById('child-name-header').innerText = localName;
    }
  }

  supabase.auth.onAuthStateChange(async (_event, sess) => {
    if (sess) {
      updateUI(sess.user);
      await setupFamily(sess.user);
    } else {
      updateUI(null);
      currentFamilyId = null;
      await renderGrid(currentStartDate);
    }
  });

  document.getElementById('prev').addEventListener('click', () => {
    currentStartDate.setDate(currentStartDate.getDate() - 14);
    renderGrid(currentStartDate);
  });
  document.getElementById('next').addEventListener('click', () => {
    currentStartDate.setDate(currentStartDate.getDate() + 14);
    renderGrid(currentStartDate);
  });
  document.getElementById('startDate').addEventListener('change', (e) => {
    currentStartDate = new Date(e.target.value);
    renderGrid(currentStartDate);
  });

  document.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    const notes = e.target.closest('.notes');
    if (!(cell || notes)) return;
    if (!currentFamilyId) { showFamilyModal(); return; }
    const element = cell || notes;
    const date = element.dataset.date;
    document.getElementById('content').value = element.querySelector('.content')?.innerText || '';
    document.getElementById('type').value = element.dataset.type || '';
    document.getElementById('modal').dataset.date = date;
    document.getElementById('modal').style.display = 'block';
  });

  document.getElementById('sign-in-btn').addEventListener('click', () => {
    supabase.auth.signInWithOAuth({ provider: 'google' });
  });
  document.getElementById('sign-out-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
  });
  document.getElementById('save-name-btn').addEventListener('click', saveChildName);
  document.getElementById('create-family-btn').addEventListener('click', createFamily);
  document.getElementById('join-family-btn').addEventListener('click', renderJoinFamilyForm);
  document.getElementById('submit-join-btn').addEventListener('click', joinFamily);
  document.getElementById('cancel-join-btn').addEventListener('click', renderFamilyOptions);
  document.getElementById('save').addEventListener('click', saveEntry);
  document.getElementById('cancel').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
  });
}
init();
