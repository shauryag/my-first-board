import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentStartDate;
let currentFamilyId = null; // NEW: Global variable to store the user's family ID

async function init() {
    // Check for an active session on page load
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        updateUI(session.user);
        await setupFamily(session.user); // NEW: Call the family setup function
    } else {
        updateUI(null);
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            updateUI(session.user);
            await setupFamily(session.user); // NEW: Call the family setup function
        } else {
            updateUI(null);
            currentFamilyId = null; // Clear family ID on sign out
            // Clear the homeboard and reminders
            document.getElementById('grid-container').innerHTML = '';
            document.getElementById('reminders-list').innerHTML = '';
        }
    });

    // NEW: Check and set the child's name
    setupChildName();

    let today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    currentStartDate = new Date(today.setDate(diff));

    // Await family setup before rendering the grid
    if (currentFamilyId) {
        await renderGrid(currentStartDate);
        await loadNotes();
        await renderReminders();
    }

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

    const modal = document.getElementById('modal');
    document.getElementById('cancel').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('save').addEventListener('click', saveEntry);

    document.addEventListener('click', async (e) => {
        const cell = e.target.closest('.cell');
        const notes = e.target.closest('.notes');

        if (cell || notes) {
            const element = cell || notes;
            const date = element.dataset.date;
            
            let content = '';
            let type = '';

            if (date === 'notes') {
                content = document.getElementById('notes-content').innerText;
                document.querySelector('.modal-content label[for="type"]').style.display = 'none';
                document.getElementById('type').style.display = 'none';
                document.getElementById('reminder-label').style.display = 'none';
            } else {
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
        }
    });
    
    document.getElementById('sign-in-btn').addEventListener('click', () => {
        supabase.auth.signInWithOAuth({
            provider: 'google',
        });
    });

    document.getElementById('sign-out-btn').addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error(error);
    });

    // NEW: Add event listeners for the name modal save button
    document.getElementById('save-name-btn').addEventListener('click', saveChildName);
    
    // NEW: Add event listeners for the family modal
    document.getElementById('create-family-btn').addEventListener('click', createFamily);
    document.getElementById('join-family-btn').addEventListener('click', renderJoinFamilyForm);
    document.getElementById('submit-join-btn').addEventListener('click', joinFamily);
    document.getElementById('cancel-join-btn').addEventListener('click', renderFamilyOptions);
}

// NEW: Function to handle family setup
async function setupFamily(user) {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('user_id', user.id);
    if (error) {
        console.error('Error fetching user profile:', error);
        return;
    }

    if (data.length > 0) {
        currentFamilyId = data[0].family_id;
        await renderGrid(currentStartDate);
        await loadNotes();
        await renderReminders();
    } else {
        renderFamilyModal();
    }
}

// NEW: Function to render the family setup modal
function renderFamilyModal() {
    document.getElementById('family-modal').style.display = 'block';
    renderFamilyOptions();
}

// NEW: Function to show initial family options
function renderFamilyOptions() {
    document.getElementById('create-family-btn').style.display = 'block';
    document.getElementById('join-family-btn').style.display = 'block';
    document.getElementById('join-family-form').style.display = 'none';
    document.getElementById('family-id-display').style.display = 'none';
}

// NEW: Function to render the join family form
function renderJoinFamilyForm() {
    document.getElementById('create-family-btn').style.display = 'none';
    document.getElementById('join-family-btn').style.display = 'none';
    document.getElementById('join-family-form').style.display = 'block';
}

// NEW: Function to create a new family
async function createFamily() {
    const { data: familyData, error: familyError } = await supabase.from('families').insert({}).select();
    if (familyError) {
        console.error('Error creating family:', familyError);
        return;
    }
    const newFamilyId = familyData[0].id;
    const user = (await supabase.auth.getSession()).data.session.user;

    const { error: profileError } = await supabase.from('user_profiles').insert({
        user_id: user.id,
        family_id: newFamilyId
    });
    if (profileError) {
        console.error('Error creating user profile:', profileError);
        return;
    }
    currentFamilyId = newFamilyId;

    document.getElementById('family-id-display').style.display = 'block';
    document.getElementById('family-id-output').value = newFamilyId;

    await renderGrid(currentStartDate);
    await loadNotes();
    await renderReminders();
}

// NEW: Function to join an existing family
async function joinFamily() {
    const familyIdInput = document.getElementById('family-id-input').value;
    const user = (await supabase.auth.getSession()).data.session.user;

    const { data: familyExists, error: familyError } = await supabase.from('families').select('id').eq('id', familyIdInput);
    if (familyError || familyExists.length === 0) {
        alert('Invalid Family ID!');
        return;
    }

    const { error: profileError } = await supabase.from('user_profiles').insert({
        user_id: user.id,
        family_id: familyIdInput
    });
    if (profileError) {
        console.error('Error joining family:', profileError);
        return;
    }
    currentFamilyId = familyIdInput;
    document.getElementById('family-modal').style.display = 'none';

    await renderGrid(currentStartDate);
    await loadNotes();
    await renderReminders();
}

function setupChildName() {
    const name = localStorage.getItem('childName');
    const nameHeader = document.getElementById('child-name-header');
    const nameModal = document.getElementById('name-modal');

    if (name) {
        nameHeader.innerText = name;
        nameModal.style.display = 'none';
    } else {
        nameHeader.innerText = 'Homeboard'; // Default text until a name is set
        nameModal.style.display = 'block';
    }
}

function saveChildName() {
    const nameInput = document.getElementById('child-name-input');
    const nameHeader = document.getElementById('child-name-header');
    const nameModal = document.getElementById('name-modal');
    const name = nameInput.value.trim();

    if (name) {
        localStorage.setItem('childName', name);
        nameHeader.innerText = name;
        nameModal.style.display = 'none';
    } else {
        alert('Please enter a name!');
    }
}

async function renderGrid(startDate) {
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

    for (let w = 0; w < 2; w++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + w * 7);

        const tr = document.createElement('tr');
        const weekLabel = document.createElement('th');
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        weekLabel.innerText = `Week ${w + 1} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        weekLabel.rowSpan = 1;
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
    
    const { data, error } = await supabase.from('homeboard_entries').select('*, reminder_set').in('date', dates).eq('family_id', currentFamilyId);
    if (error) console.error(error);
    if (data) {
        data.forEach(entry => {
            const cell = document.querySelector(`.cell[data-date="${entry.date}"]`);
            if (cell) {
                cell.querySelector('.content').innerText = entry.content || '';
                cell.dataset.type = entry.type || '';
                cell.dataset.reminder = entry.reminder_set || false;
                cell.classList.remove('red', 'yellow');
                if (entry.type === 'exam') cell.classList.add('red');
                else if (entry.type === 'test') cell.classList.add('yellow');
            }
        });
    }
}

async function loadNotes() {
    let { data, error } = await supabase.from('special_notes').select('*').eq('id', 1).eq('family_id', currentFamilyId);
    if (error) console.error(error);
    if (data && data.length > 0) {
        document.getElementById('notes-content').innerText = data[0].content || 'Enter notes...';
    } else {
        await supabase.from('special_notes').upsert({ id: 1, content: 'Enter notes...' }, { onConflict: 'id' });
        document.getElementById('notes-content').innerText = 'Enter notes...';
    }
}

async function saveEntry() {
    const modal = document.getElementById('modal');
    const date = modal.dataset.date;
    const content = document.getElementById('content').value || '';
    let type = document.getElementById('type').value;

    if (content === '') {
        type = '';
    }

    if (date === 'notes') {
        const { error } = await supabase.from('special_notes').upsert({ id: 1, content: content || 'Enter notes...', family_id: currentFamilyId }, { onConflict: 'id' });
        if (error) console.error(error);
        document.getElementById('notes-content').innerText = content || 'Enter notes...';
    } else {
        const reminderSet = document.getElementById('set-reminder').checked;
        const { error } = await supabase.from('homeboard_entries').upsert({ date, content, type, reminder_set: reminderSet, family_id: currentFamilyId }, { onConflict: 'date' });
        if (error) console.error(error);
        const cell = document.querySelector(`.cell[data-date="${date}"]`);
        if (cell) {
            cell.querySelector('.content').innerText = content;
            cell.dataset.type = type;
            cell.dataset.reminder = reminderSet;
            cell.classList.remove('red', 'yellow');
            if (type === 'exam') cell.classList.add('red');
            else if (type === 'test') cell.classList.add('yellow');
        }
    }
    modal.style.display = 'none';
    await renderReminders();
}

async function renderReminders() {
    const { data, error } = await supabase
        .from('homeboard_entries')
        .select('date, content, type, reminder_set')
        .eq('family_id', currentFamilyId)
        .or('type.eq.exam,type.eq.test')
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching reminders:', error);
        return;
    }

    const remindersList = document.getElementById('reminders-list');
    remindersList.innerHTML = '';

    if (data && data.length > 0) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        data.forEach(entry => {
            const entryDate = new Date(entry.date + 'T12:00:00');
            const isReminderDue = entry.reminder_set && entryDate.toDateString() === tomorrow.toDateString();

            const li = document.createElement('li');
            const formattedDate = entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            li.innerHTML = `
                <span class="reminder-type-${entry.type}">(${entry.type.toUpperCase()})</span>
                <span class="reminder-date">${formattedDate}:</span>
                <span>${entry.content}</span>
            `;

            if (isReminderDue) {
                li.innerHTML += ` <span style="color: red; font-weight: bold;">(REMINDER DUE!)</span>`;
            }

            remindersList.appendChild(li);
        });
    } else {
        remindersList.innerHTML = '<li>No upcoming exams or tests!</li>';
    }
}

init();