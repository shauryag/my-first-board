import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Your Supabase project ---
const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- App state ---
let currentStartDate;
let currentFamilyId = null;

// ---------- UI helpers ----------
function updateUI(user){
  const signInBtn = document.getElementById('sign-in-btn');
  const userInfoDiv = document.getElementById('user-info');
  const userAvatar = document.getElementById('user-avatar');
  const userNameSpan = document.getElementById('user-name');

  if(user){
    signInBtn.style.display = 'none';
    userInfoDiv.style.display = 'flex';
    userAvatar.src = user.user_metadata?.avatar_url || '';
    userNameSpan.innerText = user.user_metadata?.full_name || '';
  }else{
    signInBtn.style.display = 'inline-block';
    userInfoDiv.style.display = 'none';
  }
}

function setupChildNameLocal(){
  const name = localStorage.getItem('childName');
  const header = document.getElementById('child-name-header');
  const modal = document.getElementById('name-modal');
  if(name){
    header.innerText = name;
    modal.style.display = 'none';
  }else{
    header.innerText = 'Homeboard';
    modal.style.display = 'block';
  }
}

async function saveChildName(){
  const input = document.getElementById('child-name-input');
  const header = document.getElementById('child-name-header');
  const modal = document.getElementById('name-modal');
  const name = (input.value || '').trim();

  if(!name){ alert('Please enter a name!'); return; }

  // local (for quick display)
  localStorage.setItem('childName', name);
  header.innerText = name;
  modal.style.display = 'none';

  // persist for whole family
  if(currentFamilyId){
    const { error } = await supabase.from('families')
      .update({ child_name: name })
      .eq('id', currentFamilyId);
    if(error) console.error('Error saving child name to DB:', error);
  }
}

function showFamilyModal(){
  document.getElementById('family-modal').style.display = 'block';
  renderFamilyOptions();
}
function renderFamilyOptions(){
  document.getElementById('create-family-btn').style.display = 'block';
  document.getElementById('join-family-btn').style.display = 'block';
  document.getElementById('join-family-form').style.display = 'none';
  document.getElementById('family-id-display').style.display = 'none';
}
function renderJoinFamilyForm(){
  document.getElementById('create-family-btn').style.display = 'none';
  document.getElementById('join-family-btn').style.display = 'none';
  document.getElementById('join-family-form').style.display = 'block';
}

// ---------- Family handling ----------
async function createFamily(){
  const { data: familyData, error: familyError } =
    await supabase.from('families').insert({}).select();
  if(familyError){ console.error('Error creating family:', familyError); return; }

  const newFamilyId = familyData[0].id;

  const session = (await supabase.auth.getSession()).data.session;
  if(!session){ alert('Please sign in first.'); return; }

  const { error: profileError } = await supabase.from('user_profiles').insert({
    user_id: session.user.id,
    family_id: newFamilyId
  });
  if(profileError){ console.error('Error creating user profile:', profileError); return; }

  currentFamilyId = newFamilyId;

  // show/copy family id
  document.getElementById('family-id-display').style.display = 'block';
  document.getElementById('family-id-output').value = newFamilyId;
  document.getElementById('family-modal').style.display = 'none';

  await renderGrid(currentStartDate);
  await loadNotes();
  await renderReminders();

  // If there isn't a name yet, prompt for it
  const { data: famRow } = await supabase.from('families').select('child_name').eq('id', currentFamilyId).single();
  if(!famRow?.child_name) document.getElementById('name-modal').style.display = 'block';
}

async function joinFamily(){
  const familyIdInput = document.getElementById('family-id-input').value.trim();
  if(!familyIdInput){ alert('Enter a Family ID'); return; }

  const { data: familyExists, error: familyError } =
    await supabase.from('families').select('id').eq('id', familyIdInput);
  if(familyError || familyExists.length === 0){ alert('Invalid Family ID!'); return; }

  const session = (await supabase.auth.getSession()).data.session;
  if(!session){ alert('Please sign in first.'); return; }

  const { error: profileError } = await supabase.from('user_profiles').insert({
    user_id: session.user.id,
    family_id: familyIdInput
  });
  if(profileError){ console.error('Error joining family:', profileError); return; }

  currentFamilyId = familyIdInput;
  document.getElementById('family-modal').style.display = 'none';

  // load everything
  await renderGrid(currentStartDate);
  await loadNotes();
  await renderReminders();

  // pull child name if set already
  const { data: famRow } = await supabase.from('families').select('child_name').eq('id', currentFamilyId).single();
  if(famRow?.child_name){
    localStorage.setItem('childName', famRow.child_name);
    document.getElementById('child-name-header').innerText = famRow.child_name;
  }else{
    document.getElementById('name-modal').style.display = 'block';
  }
}

async function setupFamily(user){
  const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.id);
  if(error){ console.error('Error fetching user profile:', error); return; }

  if(data.length > 0){
    currentFamilyId = data[0].family_id;

    // Get family child name if present
    const { data: fam, error: famErr } =
      await supabase.from('families').select('child_name').eq('id', currentFamilyId).single();
    if(!famErr && fam?.child_name){
      document.getElementById('child-name-header').innerText = fam.child_name;
      localStorage.setItem('childName', fam.child_name);
    }else{
      setupChildNameLocal();
    }

    await renderGrid(currentStartDate);
    await loadNotes();
    await renderReminders();
  }else{
    // no family yet -> show chooser
    showFamilyModal();
  }
}

// ---------- Grid / data ----------
async function renderGrid(startDate){
  // keep date input synced
  document.getElementById('startDate').value = startDate.toISOString().split('T')[0];

  const gridContainer = document.getElementById('grid-container');
  gridContainer.innerHTML = '';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th></th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th><th>Sunday</th>';
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const dates = [];

  for(let w=0; w<2; w++){
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (w*7));

    const tr = document.createElement('tr');
    const weekLabel = document.createElement('th');
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekLabel.innerText = `Week ${w+1} (${weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${weekEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'})})`;
    tr.appendChild(weekLabel);

    for(let d=0; d<7; d++){
      const cellDate = new Date(weekStart);
      cellDate.setDate(cellDate.getDate()+d);
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

  // If no family yet, stop after drawing an empty grid
  if(!currentFamilyId) return;

  // Fill with DB values
  const { data, error } = await supabase
    .from('homeboard_entries')
    .select('*, reminder_set')
    .in('date', dates)
    .eq('family_id', currentFamilyId);

  if(error){ console.error(error); return; }

  (data || []).forEach(entry=>{
    const cell = document.querySelector(`.cell[data-date="${entry.date}"]`);
    if(!cell) return;
    cell.querySelector('.content').innerText = entry.content || '';
    cell.dataset.type = entry.type || '';
    cell.dataset.reminder = entry.reminder_set ? 'true' : 'false';
    cell.classList.remove('red','yellow');
    if(entry.type === 'exam') cell.classList.add('red');
    else if(entry.type === 'test') cell.classList.add('yellow');
  });
}

async function loadNotes(){
  if(!currentFamilyId) return;

  let { data, error } = await supabase
    .from('special_notes')
    .select('*')
    .eq('id', 1)
    .eq('family_id', currentFamilyId);

  if(error){ console.error(error); return; }

  if(data && data.length>0){
    document.getElementById('notes-content').innerText = data[0].content || 'Enter notes...';
  }else{
    // create an empty row for this family
    const { error: upErr } = await supabase
      .from('special_notes')
      .upsert({ id: 1, content: 'Enter notes...', family_id: currentFamilyId }, { onConflict: 'id,family_id' });
    if(upErr) console.error(upErr);
    document.getElementById('notes-content').innerText = 'Enter notes...';
  }
}

async function saveEntry(){
  const modal = document.getElementById('modal');
  const date = modal.dataset.date;

  // If user hasn’t joined a family yet, don’t allow save
  if(!currentFamilyId){
    showFamilyModal();
    return;
  }

  const content = document.getElementById('content').value || '';
  let type = document.getElementById('type').value;
  if(content === '') type = '';

  if(date === 'notes'){
    const { error } = await supabase
      .from('special_notes')
      .upsert({ id: 1, content: content || 'Enter notes...', family_id: currentFamilyId }, { onConflict: 'id,family_id' });
    if(error) console.error(error);
    document.getElementById('notes-content').innerText = content || 'Enter notes...';
  }else{
    const reminderSet = document.getElementById('set-reminder').checked;
    const { error } = await supabase
      .from('homeboard_entries')
      .upsert({ date, content, type, reminder_set: reminderSet, family_id: currentFamilyId }, { onConflict: 'date,family_id' });
    if(error) console.error(error);

    // Update cell UI instantly
    const cell = document.querySelector(`.cell[data-date="${date}"]`);
    if(cell){
      cell.querySelector('.content').innerText = content;
      cell.dataset.type = type;
      cell.dataset.reminder = reminderSet ? 'true' : 'false';
      cell.classList.remove('red','yellow');
      if(type === 'exam') cell.classList.add('red');
      else if(type === 'test') cell.classList.add('yellow');
    }
  }
  modal.style.display = 'none';
  await renderReminders();
}

async function renderReminders(){
  const list = document.getElementById('reminders-list');
  list.innerHTML = '';
  if(!currentFamilyId){ list.innerHTML = '<li>Join a family to track reminders.</li>'; return; }

  const { data, error } = await supabase
    .from('homeboard_entries')
    .select('date, content, type, reminder_set')
    .eq('family_id', currentFamilyId)
    .or('type.eq.exam,type.eq.test')
    .order('date', { ascending: true });

  if(error){ console.error('Error fetching reminders:', error); return; }
  if(!data || data.length===0){ list.innerHTML = '<li>No upcoming exams or tests!</li>'; return; }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate()+1);

  data.forEach(entry=>{
    const entryDate = new Date(entry.date+'T12:00:00');
    const isDue = entry.reminder_set && entryDate.toDateString() === tomorrow.toDateString();
    const li = document.createElement('li');
    const formatted = entryDate.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    li.innerHTML = `
      <span class="reminder-type-${entry.type}">(${entry.type.toUpperCase()})</span>
      <span class="reminder-date">${formatted}:</span>
      <span>${entry.content}</span>
      ${isDue ? '<span style="color:red;font-weight:bold;"> (REMINDER DUE!)</span>' : ''}
    `;
    list.appendChild(li);
  });
}

// ---------- App init ----------
async function init(){
  // set currentStartDate to Monday of current week
  const today = new Date();
  const dow = today.getDay(); // 0=Sun ... 6=Sat
  const diff = today.getDate() - dow + (dow === 0 ? -6 : 1); // Monday
  currentStartDate = new Date(today.setDate(diff));

  // Render an empty grid immediately (works even before login/family)
  await renderGrid(currentStartDate);

  // Session/UI bootstrap
  const { data: { session } } = await supabase.auth.getSession();
  if(session){
    updateUI(session.user);
    await setupFamily(session.user);
  }else{
    updateUI(null);
    setupChildNameLocal();
  }

  // Auth state listener
  supabase.auth.onAuthStateChange(async (_event, sess) => {
    if(sess){
      updateUI(sess.user);
      await setupFamily(sess.user);
    }else{
      updateUI(null);
      currentFamilyId = null;
      document.getElementById('reminders-list').innerHTML = '';
      await renderGrid(currentStartDate); // still show empty grid
    }
  });

  // Navigation
  document.getElementById('prev').addEventListener('click', () => {
    currentStartDate.setDate(currentStartDate.getDate() - 14);
    renderGrid(currentStartDate);
  });
  document.getElementById('next').addEventListener('click', () => {
    currentStartDate.setDate(currentStartDate.getDate() + 14);
    renderGrid(currentStartDate);
  });
  document.getElementById('startDate').addEventListener('change', (e)=>{
    currentStartDate = new Date(e.target.value);
    renderGrid(currentStartDate);
  });

  // Modal controls
  const modal = document.getElementById('modal');
  document.getElementById('cancel').addEventListener('click', ()=> modal.style.display='none');
  document.getElementById('save').addEventListener('click', saveEntry);

  // Global click handler (cells + notes)
  document.addEventListener('click', (e)=>{
    const cell = e.target.closest('.cell');
    const notes = e.target.closest('.notes');
    if(!(cell || notes)) return;

    // If not joined/created a family yet, guide user instead of opening editor
    if(!currentFamilyId){
      showFamilyModal();
      return;
    }

    const element = cell || notes;
    const date = element.dataset.date;

    let content = '';
    let type = '';

    if(date === 'notes'){
      content = document.getElementById('notes-content').innerText;
      document.querySelector('.modal-content label[for="type"]').style.display = 'none';
      document.getElementById('type').style.display = 'none';
      document.getElementById('reminder-label').style.display = 'none';
      document.getElementById('set-reminder').checked = false;
    }else{
      content = element.querySelector('.content').innerText;
      type = element.dataset.type || '';
      document.querySelector('.modal-content label[for="type"]').style.display = 'block';
      document.getElementById('type').style.display = 'block';
      document.getElementById('reminder-label').style.display = 'flex';
      document.getElementById('set-reminder').checked = element.dataset.reminder === 'true';
    }

    document.getElementById('content').value = (content === 'Enter notes...') ? '' : content;
    document.getElementById('type').value = type;
    modal.dataset.date = date;
    modal.style.display = 'block';
  });

  // Auth buttons
  document.getElementById('sign-in-btn').addEventListener('click', ()=>{
    supabase.auth.signInWithOAuth({ provider: 'google' });
  });
  document.getElementById('sign-out-btn').addEventListener('click', async ()=>{
    const { error } = await supabase.auth.signOut();
    if(error) console.error(error);
  });

  // Name & family modal buttons
  document.getElementById('save-name-btn').addEventListener('click', saveChildName);
  document.getElementById('create-family-btn').addEventListener('click', createFamily);
  document.getElementById('join-family-btn').addEventListener('click', renderJoinFamilyForm);
  document.getElementById('submit-join-btn').addEventListener('click', joinFamily);
  document.getElementById('cancel-join-btn').addEventListener('click', renderFamilyOptions);
  document.getElementById('copy-family-id-btn').addEventListener('click', ()=>{
    const el = document.getElementById('family-id-output');
    el.select(); el.setSelectionRange(0, 99999);
    document.execCommand('copy');
  });
}
init();
