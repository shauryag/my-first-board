<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2575.6">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica; -webkit-text-stroke: #000000}
    p.p2 {margin: 0.0px 0.0px 0.0px 0.0px; font: 12.0px Helvetica; -webkit-text-stroke: #000000; min-height: 14.0px}
    span.s1 {font-kerning: none}
  </style>
</head>
<body>
<p class="p1"><span class="s1">import { createClient } from '@supabase/supabase-js';</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Replace with your Supabase credentials</span></p>
<p class="p1"><span class="s1">const SUPABASE_URL = ‘https://kspgpdjkcwgctvkglgpr.supabase.co';</span></p>
<p class="p1"><span class="s1">const SUPABASE_ANON_KEY = ‘eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGdwZGprY3dnY3R2a2dsZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgxMTUsImV4cCI6MjA3MDQ5NDExNX0.TdAPwulNmAcgMdBFDLbL1LTyKLOVTAN2YVn1pksORtk’;</span></p>
<p class="p1"><span class="s1">const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">const planner = document.getElementById('planner');</span></p>
<p class="p1"><span class="s1">const specialNotes = document.getElementById('specialNotes');</span></p>
<p class="p1"><span class="s1">const noteDialog = document.getElementById('noteDialog');</span></p>
<p class="p1"><span class="s1">const noteContent = document.getElementById('noteContent');</span></p>
<p class="p1"><span class="s1">const noteColor = document.getElementById('noteColor');</span></p>
<p class="p1"><span class="s1">const saveNote = document.getElementById('saveNote');</span></p>
<p class="p1"><span class="s1">const closeDialog = document.getElementById('closeDialog');</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">let currentNote = { id: null, type: null };</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Load planner (2 weeks)</span></p>
<p class="p1"><span class="s1">async function loadPlanner() {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>planner.innerHTML = '';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>for (let i = 0; i &lt; 14; i++) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>const dayDiv = document.createElement('div');</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>dayDiv.className = 'note';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>dayDiv.dataset.index = i;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>dayDiv.addEventListener('click', () =&gt; openDialog(i, 'tasks'));</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>planner.appendChild(dayDiv);</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const { data: tasks } = await supabase.from('tasks').select('*');</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>tasks?.forEach(task =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>const cell = planner.children[task.day_index];</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>if (cell) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>cell.textContent = task.content;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">      </span>cell.style.backgroundColor = task.color || '#ffffff';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>}</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>});</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Load special notes</span></p>
<p class="p1"><span class="s1">async function loadSpecialNotes() {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>specialNotes.textContent = '';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>specialNotes.addEventListener('click', () =&gt; openDialog(0, 'special_notes'));</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const { data } = await supabase.from('special_notes').select('*').single();</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>if (data) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>specialNotes.textContent = data.content;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>specialNotes.style.backgroundColor = data.color || '#ffffff';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Open dialog</span></p>
<p class="p1"><span class="s1">function openDialog(index, type) {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>currentNote = { id: index, type };</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>noteContent.value = '';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>noteColor.value = '#ffffff';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>noteDialog.style.display = 'block';</span></p>
<p class="p1"><span class="s1">}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Save note</span></p>
<p class="p1"><span class="s1">saveNote.addEventListener('click', async () =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const content = noteContent.value;</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>const color = noteColor.value;</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>if (currentNote.type === 'tasks') {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>await supabase.from('tasks').upsert({ day_index: currentNote.id, content, color });</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>} else {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">    </span>await supabase.from('special_notes').upsert({ id: 1, content, color });</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>}</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>noteDialog.style.display = 'none';</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>loadPlanner();</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>loadSpecialNotes();</span></p>
<p class="p1"><span class="s1">});</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Close dialog</span></p>
<p class="p1"><span class="s1">closeDialog.addEventListener('click', () =&gt; {</span></p>
<p class="p1"><span class="s1"><span class="Apple-converted-space">  </span>noteDialog.style.display = 'none';</span></p>
<p class="p1"><span class="s1">});</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">// Initial load</span></p>
<p class="p1"><span class="s1">loadPlanner();</span></p>
<p class="p1"><span class="s1">loadSpecialNotes();</span></p>
</body>
</html>
