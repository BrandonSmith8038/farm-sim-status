const mapView = document.getElementById('map-view');
const mapText = document.getElementById('map-text');
const mapEdit = document.getElementById('map-edit');
const mapInput = document.getElementById('map-input');
const statusText = document.getElementById('status');
const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.panel')];
const addMenu = document.getElementById('add-menu');
const addButton = document.getElementById('add-button');
const addList = document.getElementById('add-list');

const SAVE_DELAY = 500;
const PRIORITIES = [['urgent', 'Urgent'], ['normal', 'Normal']];

let farm = null; // the page's working copy; edits change it directly, then get saved
let saveTimer = null;
let saving = false;
let unsaved = false;

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle('error', isError);
}

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `The server returned an error (${res.status}).`);
  return data;
}

// ---------- Saving ----------
// Waits for a pause in the edits, so typing doesn't send a save for every letter.
function scheduleSave() {
  unsaved = true;
  showStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(sendSave, SAVE_DELAY);
}

async function sendSave() {
  if (saving) { // one save at a time, so an older one can't land after a newer one
    saveTimer = setTimeout(sendSave, SAVE_DELAY);
    return;
  }
  saving = true;
  unsaved = false;
  try {
    const saved = await api('/api/farm', 'PUT', farm);
    farm.lastUpdated = saved.lastUpdated;
    if (!unsaved) showStatus('Saved');
  } catch (e) {
    unsaved = true;
    showStatus(`Not saved: ${e.message}`, true);
  }
  saving = false;
}

// Asks before closing the page if the latest edits haven't reached the server.
window.addEventListener('beforeunload', e => {
  if (unsaved) e.preventDefault();
});

// ---------- Shared building blocks ----------
// Creates an element: el('div', { className: 'x' }, child, 'text', ...)
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

const formatDate = iso => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Draws a card's badges from rows of { level, text }.
const badgeRows = rows => rows.map(row => el('div', { className: 'badge-row' },
  ...row.map(({ level, text }) => el('span', { className: `badge badge-${level}`, textContent: text }))));

// A dropdown that edits one value on a card.
function dropdown(owner, key, options, onChange, props = {}) {
  const select = el('select', props, ...options.map(option => el('option', { value: option, textContent: option })));
  select.value = owner[key];
  select.addEventListener('change', () => { owner[key] = select.value; onChange(); });
  return select;
}

function prioritySelect(value) {
  const select = el('select', { className: 'priority', ariaLabel: 'Priority' },
    ...PRIORITIES.map(([key, label]) => el('option', { value: key, textContent: label })));
  select.value = value;
  return select;
}

const removeButton = (label, onClick) => {
  const button = el('button', { className: 'list-remove', type: 'button', textContent: '×', title: label, ariaLabel: label });
  button.addEventListener('click', onClick);
  return button;
};

// A text box and Add button under a list. Enter adds too, and the cursor stays put for the next item.
function addForm(placeholder, onAdd, ...extras) {
  const input = el('input', { type: 'text', placeholder, ariaLabel: placeholder });
  const form = el('form', { className: 'add-form' }, input, ...extras, el('button', { className: 'button', type: 'submit', textContent: 'Add' }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    onAdd(text);
    input.value = '';
  });
  return form;
}

// To-do checklist for anything with a .todos list. Unticked items come first, most urgent at the top.
function todoSection(owner, onChange) {
  const rank = todo => (todo.done ? PRIORITIES.length : 0) + PRIORITIES.findIndex(([key]) => key === todo.priority);
  const list = el('ul', { className: 'list' });

  function draw() {
    list.replaceChildren(...[...owner.todos].sort((a, b) => rank(a) - rank(b)).map(todo => {
      const done = el('input', { type: 'checkbox', checked: todo.done, ariaLabel: 'Done' });
      done.addEventListener('change', () => { todo.done = done.checked; onChange(); draw(); });

      const text = el('input', { type: 'text', value: todo.text, ariaLabel: 'To-do' });
      text.addEventListener('input', () => { todo.text = text.value; onChange(); });

      const priority = prioritySelect(todo.priority);
      priority.addEventListener('change', () => { todo.priority = priority.value; onChange(); draw(); });

      const remove = removeButton('Remove to-do', () => { owner.todos.splice(owner.todos.indexOf(todo), 1); onChange(); draw(); });
      return el('li', { className: `list-row priority-${todo.priority}${todo.done ? ' done' : ''}` }, done, text, priority, remove);
    }));
  }

  const newPriority = prioritySelect('normal');
  const form = addForm('Add a to-do', text => {
    owner.todos.push({ text, priority: newPriority.value, done: false });
    newPriority.value = 'normal';
    onChange();
    draw();
  }, newPriority);

  draw();
  return el('div', { className: 'card-group' }, el('span', { className: 'card-label' }, 'To-dos'), list, form);
}

// Future plans list for anything with a .plans list.
function planSection(owner, onChange) {
  const list = el('ul', { className: 'list' });

  function draw() {
    list.replaceChildren(...owner.plans.map(plan => {
      const text = el('input', { type: 'text', value: plan.text, ariaLabel: 'Future plan' });
      text.addEventListener('input', () => { plan.text = text.value; onChange(); });

      const remove = removeButton('Remove plan', () => { owner.plans.splice(owner.plans.indexOf(plan), 1); onChange(); draw(); });
      return el('li', { className: 'list-row' }, text, remove);
    }));
  }

  const form = addForm('Add a future plan', text => {
    owner.plans.push({ text });
    onChange();
    draw();
  });

  draw();
  return el('div', { className: 'card-group' }, el('span', { className: 'card-label' }, 'Future plans'), list, form);
}

function renderMapName() {
  mapText.textContent = farm.mapName;
  mapEdit.hidden = false;
}

// ---------- Tabs ----------
function showTab(name) {
  const active = tabs.some(tab => tab.dataset.tab === name) ? name : tabs[0].dataset.tab;
  for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.tab === active));
  for (const panel of panels) panel.hidden = panel.dataset.panel !== active;
}

// The tab lives in the URL, so a page refresh stays on the same one.
for (const tab of tabs) tab.addEventListener('click', () => { location.hash = tab.dataset.tab; });
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

// ---------- Add menu ----------
const ADDERS = { field: addField, animals: addAnimal, todo: focusNewTodo, plan: focusNewPlan, note: focusNewNote };

function setAddMenuOpen(open) {
  addList.hidden = !open;
  addButton.setAttribute('aria-expanded', String(open));
}

addButton.addEventListener('click', () => setAddMenuOpen(addList.hidden));

for (const item of addList.querySelectorAll('.add-item')) {
  item.addEventListener('click', () => {
    const { tab, add } = item.dataset;
    setAddMenuOpen(false);
    // Show the tab first: a text box can't take the cursor while its tab is hidden.
    location.hash = tab;
    showTab(tab);
    ADDERS[add]();
  });
}

// Clicking anywhere else or pressing Escape closes the menu.
document.addEventListener('click', e => {
  if (!addMenu.contains(e.target)) setAddMenuOpen(false);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || addList.hidden) return;
  setAddMenuOpen(false);
  addButton.focus();
});

// ---------- Map name ----------
function setMapEditing(editing) {
  mapView.hidden = editing;
  mapInput.hidden = !editing;
}

function saveMapName() {
  const name = mapInput.value.trim();
  setMapEditing(false);
  if (!name || name === farm.mapName) return;
  farm.mapName = name;
  renderMapName();
  scheduleSave();
}

mapEdit.addEventListener('click', () => {
  mapInput.value = farm.mapName;
  setMapEditing(true);
  mapInput.focus();
  mapInput.select();
});
mapInput.addEventListener('blur', saveMapName);
mapInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') mapInput.blur();
  if (e.key === 'Escape') {
    mapInput.value = farm.mapName;
    mapInput.blur();
  }
});

// ---------- Start ----------
showTab(location.hash.slice(1));
api('/api/farm')
  .then(data => {
    farm = data;
    farm.fields.forEach(upgradeField);
    renderMapName();
    renderFields();
    renderAnimals();
    renderTodos();
    renderNotes();
    addButton.disabled = false;
  })
  .catch(e => showStatus(`Could not load the farm: ${e.message}`, true));
