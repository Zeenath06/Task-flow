const $ = id => document.getElementById(id);
const KEY = 'taskflow-tasks';
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { tasks = []; }
let filter = 'all', query = '', editingId = null;

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) {} };
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = $('title').value.trim();
  if (!title) return;
  tasks.unshift({ id: Date.now(), title, due: $('due').value, priority: $('priority').value, done: false });
  e.target.reset(); $('priority').value = 'medium';
  save(); render();
});

document.querySelectorAll('.f').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.f;
  document.querySelectorAll('.f').forEach(x => x.classList.toggle('active', x === b));
  render();
}));
$('search').addEventListener('input', e => { query = e.target.value.toLowerCase(); render(); });
$('clear').addEventListener('click', () => { tasks = tasks.filter(t => !t.done); save(); render(); });

$('list').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const id = Number(li.dataset.id), t = tasks.find(x => x.id === id), act = e.target.dataset.act;
  if (act === 'del') tasks = tasks.filter(x => x.id !== id);
  else if (act === 'edit') editingId = id;
  else if (act === 'save') { const v = li.querySelector('.edit').value.trim(); if (v) t.title = v; editingId = null; }
  else if (e.target.type === 'checkbox') t.done = e.target.checked;
  else return;
  save(); render();
});
$('list').addEventListener('keydown', e => {
  if (e.target.classList.contains('edit')) {
    if (e.key === 'Enter') e.target.closest('li').querySelector('[data-act=save]').click();
    if (e.key === 'Escape') { editingId = null; render(); }
  }
});

function render() {
  const today = new Date().toISOString().slice(0, 10);
  const shown = tasks.filter(t =>
    (filter === 'all' || (filter === 'done') === t.done) && t.title.toLowerCase().includes(query));
  $('list').innerHTML = shown.map(t => {
    const late = t.due && !t.done && t.due < today;
    const meta = [t.priority[0].toUpperCase() + t.priority.slice(1) + ' priority', t.due ? (late ? 'Overdue: ' : 'Due ') + t.due : ''].filter(Boolean).join(', ');
    const main = editingId === t.id
      ? `<input class="edit" value="${esc(t.title)}" aria-label="Edit task" autofocus>`
      : `<div class="body"><div class="name">${esc(t.title)}</div><div class="meta ${late ? 'late' : ''}">${meta}</div></div>`;
    const acts = editingId === t.id
      ? `<button data-act="save">Save</button>`
      : `<button data-act="edit">Edit</button><button data-act="del">Delete</button>`;
    return `<li class="item ${t.priority} ${t.done ? 'done' : ''}" data-id="${t.id}">
      <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Mark complete">${main}<div class="acts">${acts}</div></li>`;
  }).join('');
  $('empty').hidden = shown.length > 0;
  const left = tasks.filter(t => !t.done).length;
  $('count').textContent = `${left} task${left === 1 ? '' : 's'} left`;
  const pct = tasks.length ? Math.round((tasks.length - left) / tasks.length * 100) : 0;
  $('pct').textContent = pct + '%';
  $('arc').style.strokeDashoffset = 100 - pct;
  const f = document.querySelector('.edit'); if (f) f.focus();
}
render();
