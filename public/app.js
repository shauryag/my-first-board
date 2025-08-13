import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = 'https://kspgpdjkcwgctvkglgpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Week</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th>';
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const dates = [];

    for (let w = 0; w < 2; w++) {
        const tr = document.createElement('tr');
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate