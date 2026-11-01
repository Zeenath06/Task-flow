const $ = id => document.getElementById(id);
const KEY = 'orbit-smart-tasks-v1';
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { tasks = []; }
let filter = 'all', query = '', editingId = null, timerInterval = null, secondsLeft = 25 * 60, timerRunning = false, toastTimeout;

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) { toast('Could not save locally in this browser.'); } };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const prettyDate = value => { if (!value) return ''; const d = new Date(value + 'T00:00:00'); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); };
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('show'), 2400); }

$('todayLabel').textContent = new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase() + ' · YOUR DAILY COMMAND CENTER';
const hour = new Date().getHours();
$('greeting').textContent = hour < 12 ? 'Good morning, go make it happen.' : hour < 18 ? 'Good afternoon, keep the momentum.' : 'Good evening, finish strong.';
$('due').min = todayISO();

$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = $('title').value.trim();
  if (!title) return;
  tasks.unshift({id: Date.now(), title, due: $('due').value, priority: $('priority').value, done:false, createdAt: new Date().toISOString()});
  e.target.reset(); $('priority').value = 'medium'; $('due').min = todayISO();
  save(); render(); $('title').focus(); toast('Task added to your orbit ✦');
});
document.querySelectorAll('.filter').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.f;
  document.querySelectorAll('.filter').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === filter));
  render();
}));
document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.view;
  document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.filter').forEach(x => x.classList.toggle('active', x.dataset.f === filter));
  render();
}));
$('search').addEventListener('input', e => { query = e.target.value.toLowerCase().trim(); render(); });
$('clear').addEventListener('click', () => {
  const before = tasks.length; tasks = tasks.filter(t => !t.done);
  if (before === tasks.length) return toast('No completed tasks to clear.');
  save(); render(); toast('Completed tasks cleared.');
});
$('list').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const id = Number(li.dataset.id), t = tasks.find(x => x.id === id), act = e.target.dataset.act;
  if (!t) return;
  if (act === 'del') { tasks = tasks.filter(x => x.id !== id); toast('Task removed.'); }
  else if (act === 'edit') editingId = id;
  else if (act === 'save') { const input = li.querySelector('.task-edit'); const v = input.value.trim(); if (!v) return toast('A task needs a title.'); t.title = v; editingId = null; toast('Task updated.'); }
  else if (e.target.classList.contains('task-check')) { t.done = e.target.checked; toast(t.done ? 'Nice work — task completed! ✓' : 'Task moved back to in progress.'); }
  else return;
  save(); render();
});
$('list').addEventListener('keydown', e => {
  if (e.target.classList.contains('task-edit')) {
    if (e.key === 'Enter') { e.preventDefault(); e.target.closest('li').querySelector('[data-act="save"]').click(); }
    if (e.key === 'Escape') { editingId = null; render(); }
  }
});
$('themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const light = document.body.classList.contains('light');
  $('themeBtn').textContent = light ? '☾' : '☼';
  try { localStorage.setItem('orbit-theme', light ? 'light' : 'dark'); } catch(e) {}
});
try { if (localStorage.getItem('orbit-theme') === 'light') { document.body.classList.add('light'); $('themeBtn').textContent = '☾'; } } catch(e) {}

function render() {
  const today = todayISO();
  const shown = tasks.filter(t => (filter === 'all' || (filter === 'done') === !!t.done) && t.title.toLowerCase().includes(query));
  // Sort visible tasks: active first, then high priority, then earliest due date.
  shown.sort((a,b) => Number(a.done)-Number(b.done) || ({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]) || (a.due || '9999').localeCompare(b.due || '9999'));
  $('list').innerHTML = shown.map(t => {
    const late = t.due && !t.done && t.due < today;
    const dueToday = t.due === today && !t.done;
    const dueLabel = t.due ? `${late ? '⚠ Overdue · ' : dueToday ? '◷ Due today · ' : '◷ Due '}${prettyDate(t.due)}` : 'No due date';
    const main = editingId === t.id
      ? `<div class="task-copy"><input class="task-edit" value="${esc(t.title)}" aria-label="Edit task" maxlength="100"></div>`
      : `<div class="task-copy"><div class="task-name">${esc(t.title)}</div><div class="task-meta"><span class="priority-badge ${t.priority}">${esc(t.priority)} priority</span><span class="${late ? 'due-late' : dueToday ? 'due-today' : ''}">${dueLabel}</span></div></div>`;
    const acts = editingId === t.id
      ? `<button data-act="save" aria-label="Save task">Save</button><button data-act="cancel" aria-label="Cancel edit">×</button>`
      : `<button data-act="edit" aria-label="Edit task" title="Edit">✎</button><button data-act="del" aria-label="Delete task" title="Delete">×</button>`;
    return `<li class="task-item ${esc(t.priority)} ${t.done ? 'done' : ''}" data-id="${t.id}"><input class="task-check" type="checkbox" ${t.done ? 'checked' : ''} aria-label="Mark ${esc(t.title)} complete">${main}<div class="task-actions">${acts}</div></li>`;
  }).join('');
  $('empty').hidden = shown.length > 0;
  $('boardCount').textContent = shown.length;
  const done = tasks.filter(t => t.done).length, left = tasks.length - done, overdue = tasks.filter(t => !t.done && t.due && t.due < today).length;
  $('totalStat').textContent = tasks.length; $('activeStat').textContent = left; $('doneStat').textContent = done; $('overdueStat').textContent = overdue;
  $('count').textContent = `${left} task${left === 1 ? '' : 's'} left`;
  $('miniDone').textContent = done; $('miniLeft').textContent = left;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $('pct').textContent = pct + '%';
  $('arc').style.strokeDashoffset = 308 - (308 * pct / 100);
  $('progressCaption').textContent = tasks.length === 0 ? 'Your next win is one task away.' : pct === 100 ? 'Orbit complete. You absolutely nailed it!' : `${left} task${left === 1 ? '' : 's'} between you and a clean slate.`;
  $('motivation').textContent = overdue ? `${overdue} overdue task${overdue === 1 ? '' : 's'} need your attention. You’ve got this.` : pct === 100 && tasks.length ? 'Everything is complete. Take a well-earned breath.' : 'Every completed task is momentum earned.';
  const levels = ['high','medium','low'];
  const counts = Object.fromEntries(levels.map(level => [level, tasks.filter(t => !t.done && t.priority === level).length]));
  const max = Math.max(1, ...Object.values(counts));
  $('priorityRadar').innerHTML = levels.map(level => `<div class="radar-row"><span>${level[0].toUpperCase()+level.slice(1)}</span><div class="radar-track"><div class="radar-fill ${level}" style="width:${counts[level]/max*100}%"></div></div><strong>${counts[level]}</strong></div>`).join('');
  const focusSelect = $('focusTask');
  const oldValue = focusSelect.value;
  focusSelect.innerHTML = tasks.filter(t => !t.done).map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('');
  if (oldValue && [...focusSelect.options].some(o => o.value === oldValue)) focusSelect.value = oldValue;
  if (!focusSelect.options.length) focusSelect.innerHTML = '<option value="">Add a task first</option>';
  const edit = document.querySelector('.task-edit'); if (edit) { edit.focus(); edit.setSelectionRange(edit.value.length, edit.value.length); }
}

$('list').addEventListener('click', e => {
  if (e.target.dataset.act === 'cancel') { editingId = null; render(); }
});

$('focusBtn').addEventListener('click', () => {
  $('focusDialog').showModal();
});
function updateTimer() {
  const m = String(Math.floor(secondsLeft/60)).padStart(2,'0'), s = String(secondsLeft%60).padStart(2,'0');
  $('timer').textContent = `${m}:${s}`;
  document.title = timerRunning ? `(${m}:${s}) Focus — Orbit` : 'Orbit — Smart Task Command Center';
}
$('timerStart').addEventListener('click', () => {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false; $('timerStart').textContent = 'Resume timer'; return;
  }
  if (secondsLeft <= 0) secondsLeft = 25*60;
  timerRunning = true; $('timerStart').textContent = 'Pause timer';
  timerInterval = setInterval(() => {
    secondsLeft--; updateTimer();
    if (secondsLeft <= 0) {
      clearInterval(timerInterval); timerRunning = false; $('timerStart').textContent = 'Start another session';
      toast('Focus session complete — take a short break! ✦');
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Orbit focus session complete', {body:'Great work. Take a short break.'});
    }
  },1000);
});
$('timerReset').addEventListener('click', () => {
  clearInterval(timerInterval); timerRunning = false; secondsLeft = 25*60; $('timerStart').textContent = 'Start timer'; updateTimer();
});
$('focusDialog').addEventListener('close', () => { if (timerRunning) { clearInterval(timerInterval); timerRunning = false; $('timerStart').textContent = 'Resume timer'; } });
updateTimer(); render();
