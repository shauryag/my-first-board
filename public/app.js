import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentStartDate;

async function init() {
    // Check for an active session on page load
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        updateUI(session.user);
    } else {
        updateUI(null);
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            updateUI(session.user);
        } else {
            updateUI(null);
        }
    });

    let today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    currentStartDate = new Date(today.setDate(diff));

    await renderGrid(currentStartDate);
    await loadNotes();
    await renderReminders();

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
                // NEW: Hide reminder checkbox for notes
                document.getElementById('reminder-label').style.display = 'none';
            } else {
                content = element.querySelector('.content').innerText;
                type = element.dataset.type || '';
                document.querySelector('.modal-content label[for="type"]').style.display = 'block';
                document.getElementById('type').style.display = 'block';
                // NEW: Show reminder checkbox for grid cells
                document.getElementById('reminder-label').style.display = 'flex';
                // NEW: Set checkbox state based on saved data
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
}

function updateUI(user) {
    const signInBtn = document.getElementById('sign-in-btn');
    const userInfoDiv = document.getElementById('user-info');
    const userAvatar = document.getElementById('user-avatar');
    const userNameSpan = document.getElementById('user-name');
    
    if (user) {
        signInBtn.style.display = 'none';
        userInfoDiv.style.display = 'flex';

        const profilePicture = user.user_metadata.avatar_url;
        const userName = user.user_metadata.full_name;

        userAvatar.src = profilePicture;
        userNameSpan.innerText = userName;

    } else {
        signInBtn.style.display = 'inline-block';
        userInfoDiv.style.display = 'none';
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
    
    // NEW: Include 'reminder_set' in the select query
    const { data, error } = await supabase.from('homeboard_entries').select('*, reminder_set').in('date', dates);
    if (error) console.error(error);
    if (data) {
        data.forEach(entry => {
            const cell = document.querySelector(`.cell[data-date="${entry.date}"]`);
            if (cell) {
                cell.querySelector('.content').innerText = entry.content || '';
                cell.dataset.type = entry.type || '';
                // NEW: Set the dataset attribute for reminder
                cell.dataset.reminder = entry.reminder_set || false;
                cell.classList.remove('red', 'yellow');
                if (entry.type