import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentStartDate;

async function init() {
    let today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    currentStartDate = new Date(today.setDate(diff));
    document.getElementById('startDate').value = currentStartDate.toISOString().split('T')[0];

    await renderGrid(currentStartDate);
    await loadNotes();

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

    const modal = document.getElementById('modal');
    document.getElementById('cancel').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('save').addEventListener('click', saveEntry);
    document.getElementById('delete').addEventListener('click', deleteEntry);

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

    for (let w = 0; w < 2; w++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + w * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekDiv = document.createElement('div');
        weekDiv.classList.add('grid-week');
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Week</th><th>Day 1-2</th><th>Day 3-4</th>';
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const tr = document.createElement('tr');
        const weekLabel = document.createElement('th');
        weekLabel.innerText = `Week ${w + 1} (${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
        weekLabel.rowSpan = 2;
        tr.appendChild(weekLabel);

        for (let row = 0; row < 2; row++) {
            const newTr = row === 0 ? tr : document.createElement('tr');
            for (let col = 0; col < 2; col++) {
                const cellDate = new Date(weekStart);
                cellDate.setDate(cellDate.getDate() + row * 2 + col);
                const dateStr = cellDate.toISOString().split('T')[0];

                const td = document.createElement('td');
                td.classList.add('cell');
                td.dataset.date = dateStr;
                td.innerHTML = `<div class="date-label">${cellDate.getDate()}</div><div class="content"></div>`;
                newTr.appendChild(td);
            }
            tbody.appendChild(newTr);
        }
        table.appendChild(tbody);
        weekDiv.appendChild(table);
        gridContainer.appendChild(weekDiv);
    }

    // Handle remaining days (days 5-7) in a separate table if needed
    const remainingStart = new Date(startDate);
    remainingStart.setDate(remainingStart.getDate() + 4);
    const remainingEnd = new Date(remainingStart);
    remainingEnd.setDate(remainingEnd.getDate() + 2);

    const remainingDiv = document.createElement('div');
    remainingDiv.classList.add('grid-week');
    const remainingTable = document.createElement('table');
    const remainingThead = document.createElement('thead');
    const remainingHeaderRow = document.createElement('tr');
    remainingHeaderRow.innerHTML = '<th>Remaining</th><th>Day 5-6</th><th>Day 7</th>';
    remainingThead.appendChild(remainingHeaderRow);
    remainingTable.appendChild(remainingThead);

    const remainingTbody = document.createElement('tbody');
    const remainingTr = document.createElement('tr');
    const remainingLabel = document.createElement('th');
    remainingLabel.innerText = `Days 5-7 (${remainingStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${remainingEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    remainingLabel.rowSpan = 1;
    remainingTr.appendChild(remainingLabel);

    for (let i = 0; i < 3; i++) {
        const cellDate = new Date(remainingStart);
        cellDate.setDate(cellDate.getDate() + i);
        const dateStr = cellDate.toISOString().split('T')[0];

        const td = document.createElement('td');
        td.classList.add('cell');
        td.dataset.date = dateStr;
        td.innerHTML = `<div class="date-label">${cellDate.getDate()}</div><div class="content"></div>`;
        remainingTr.appendChild(td);
    }
    remainingTbody.appendChild(remainingTr);
    remainingTable.appendChild(remainingTbody);
    remainingDiv.appendChild(remainingTable);
    gridContainer.appendChild(remainingDiv);

    const dates = [];
    document.querySelectorAll('.cell').forEach(cell => dates.push(cell.dataset.date));
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