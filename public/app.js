import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentStartDate;

async function init() {
    // Assume tables exist: homeboard_entries (date text primary key, content text, type text)
    // special_notes (id integer primary key, content text) with id=1

    // Set initial start date to Monday of current week
    let today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    currentStartDate = new Date(today.setDate(diff));
    document.getElementById('startDate').value = currentStartDate.toISOString().split('T')[0];

    await renderGrid(currentStartDate);
    await loadNotes();

    // Event listeners
    document.getElementById('prev').addEventListener('click', () => {
        currentStartDate.setDate(currentStartDate.getDate() - 14);
        renderGrid(currentStartDate);
    });
    document.getElementById('next').addEventListener('click', () => {
        currentStartDate.setDate(currentStartDate.getDate() + 14);
        renderGrid(currentStartDate);
    });
    document.getElementById('startDate').addEventListener('change', (e) => {
        const selectedDate = new Date(e.target.value);
        const selectedDay = selectedDate.getDay();
        const selectedDiff = selectedDate.getDate() - selectedDay + (selectedDay === 0 ? -6 : 1);
        currentStartDate = new Date(selectedDate.setDate(selectedDiff));
        renderGrid(currentStartDate);
    });

    // Modal buttons
    const modal = document.getElementById('modal');
    document.getElementById('cancel').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('save').addEventListener('click', saveEntry);
    document.getElementById('delete').addEventListener('click', deleteEntry);

    // Click handlers for cells and notes
    document.addEventListener('click', (e) => {
        if (e.target.closest('.cell') || e.target.closest('.notes')) {
            const element = e.target.closest('.cell') || e.target.closest('.notes');
            const date = element.dataset.date;
            const content = element.querySelector('.content') ? element.querySelector('.content').innerText : document.getElementById('notes-content').innerText;
            const type = element.dataset.type || '';

            document.getElementById('content').value = content;
            document.getElementById('type').value = type;
            modal.dataset.date = date;

            if (date === 'notes') {
                document.getElementById('type-label').style.display = 'none';
                document.getElementById('type').style.display = 'none';
            } else {
                document.getElementById('type-label').style.display = 'block';
                document.getElementById('type').style.display = 'block';
            }

            modal.style.display = 'block';
        }
    });
}

async function renderGrid(startDate) {
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];

    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = '';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th></th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th>';
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const dates = [];

    for (let w = 0; w < 2; w++) {
        const tr = document.createElement('tr');
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + w * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekLabel = document.createElement('td');
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

    // Load data
    const { data, error } = await supabase.from('homeboard_entries').select('*').in('date', dates);
    if (error) console.error(error);
    if (data) {
        data.forEach(entry => {
            const cell = document.querySelector(`.cell[data-date="${entry.date}"]`);
            if (cell) {
                cell.querySelector('.content').innerText = entry.content || '';
                cell.dataset.type = entry.type || '';
                cell.classList.remove('red', 'yellow', 'green');
                if (entry.type === 'exam') cell.classList.add('red');
                else if (entry.type === 'test') cell.classList.add('yellow');
                else if (entry.type === 'homework') cell.classList.add('green');
            }
        });
    }
}

async function loadNotes() {
    let { data, error } = await supabase.from('special_notes').select('*').eq('id', 1);
    if (error) console.error(error);
    if (data.length === 0) {
        await supabase.from('special_notes').insert({ id: 1, content: '' });
        document.getElementById('notes-content').innerText = '';
    } else {
        document.getElementById('notes-content').innerText = data[0].content || '';
    }
}

async function saveEntry() {
    const modal = document.getElementById('modal');
    const date = modal.dataset.date;
    const content = document.getElementById('content').value;
    const type = document.getElementById('type').value;

    if (date === 'notes') {
        const { error } = await supabase.from('special_notes').upsert({ id: 1, content }, { onConflict: 'id' });
        if (error) console.error(error);
        document.getElementById('notes-content').innerText = content;
    } else {
        const { error } = await supabase.from('homeboard_entries').upsert({ date, content, type }, { onConflict: 'date' });
        if (error) console.error(error);
        const cell = document.querySelector(`.cell[data-date="${date}"]`);
        if (cell) {
            cell.querySelector('.content').innerText = content;
            cell.dataset.type = type;
            cell.classList.remove('red', 'yellow', 'green');
            if (type === 'exam') cell.classList.add('red');
            else if (type === 'test') cell.classList.add('yellow');
            else if (type === 'homework') cell.classList.add('green');
        }
    }
    modal.style.display = 'none';
}

async function deleteEntry() {
    const modal = document.getElementById('modal');
    const date = modal.dataset.date;

    if (date === 'notes') {
        const { error } = await supabase.from('special_notes').update({ content: '' }).eq('id', 1);
        if (error) console.error(error);
        document.getElementById('notes-content').innerText = '';
    } else {
        const { error } = await supabase.from('homeboard_entries').delete().eq('date', date);
        if (error) console.error(error);
        const cell = document.querySelector(`.cell[data-date="${date}"]`);
        if (cell) {
            cell.querySelector('.content').innerText = '';
            cell.dataset.type = '';
            cell.classList.remove('red', 'yellow', 'green');
        }
    }
    modal.style.display = 'none';
}

init();