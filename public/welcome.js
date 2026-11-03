const welcomePanel = document.getElementById('welcome');
const welcomeDate = document.getElementById('welcome-date');
const welcomeToggle = document.getElementById('welcome-toggle');
const welcomeColumns = document.getElementById('welcome-columns');
const welcomeTodos = document.getElementById('welcome-todos');
const welcomeAttention = document.getElementById('welcome-attention');
const welcomeNotes = document.getElementById('welcome-notes');

function showLastUpdated() {
  welcomeDate.textContent = farm.lastUpdated ? `Last updated ${formatDate(farm.lastUpdated)}` : 'No updates yet';
}

// One clickable row in the summary. The summary is read-only, so clicking takes you to where the item is edited.
function welcomeRow(tab, owner, className, ...content) {
  const button = el('button', { className: 'welcome-item', type: 'button' }, ...content);
  button.addEventListener('click', () => jumpTo(tab, owner));
  return el('li', { className }, button);
}

const welcomeSource = label => el('span', { className: 'welcome-source', textContent: label });

// Fills a column, or shows a short message if it has nothing in it.
function fillWelcomeList(list, rows, emptyMessage) {
  list.replaceChildren(...(rows.length ? rows : [el('li', { className: 'empty', textContent: emptyMessage })]));
}

function welcomeTodoRows(cards) {
  const places = [...cards, { tab: 'todos', owner: farm, label: 'General' }];
  const open = places.flatMap(place => place.owner.todos.filter(todo => !todo.done).map(todo => ({ ...place, todo })));
  const isUrgent = item => item.todo.priority === 'urgent';
  return open.sort((a, b) => isUrgent(b) - isUrgent(a)).map(({ tab, owner, label, todo }) => welcomeRow(
    tab, owner, `list-row priority-${todo.priority}`,
    el('span', { textContent: todo.text.trim() || 'Unnamed to-do' }),
    welcomeSource(label),
  ));
}

// Urgent to-dos are left out here because they already lead the To-dos column.
function welcomeAttentionRows(cards) {
  const flagged = cards.flatMap(card => card.flags.map(flag => ({ ...card, flag })));
  const isUrgent = item => item.flag.level === 'urgent';
  return flagged.sort((a, b) => isUrgent(b) - isUrgent(a)).map(({ tab, owner, label, flag }) => welcomeRow(
    tab, owner, 'welcome-flag',
    el('span', { className: `badge badge-${flag.level}`, textContent: flag.text }),
    welcomeSource(label),
  ));
}

function welcomeNoteRows() {
  return farm.notes.map(note => welcomeRow(
    'notes', note, 'welcome-note',
    el('span', { textContent: note.text.trim() || 'Unnamed note' }),
    welcomeSource(formatDate(note.updatedAt)),
    ...(note.details.trim() ? [el('span', { className: 'welcome-details', textContent: note.details })] : []),
  ));
}

function renderWelcome() {
  const cards = [
    ...sortedFields().map(field => ({ tab: 'fields', owner: field, label: fieldLabel(field), flags: fieldFlags(field) })),
    ...sortedAnimals().map(animal => ({ tab: 'animals', owner: animal, label: animalLabel(animal), flags: animalFlags(animal) })),
  ];
  showLastUpdated();
  fillWelcomeList(welcomeTodos, welcomeTodoRows(cards), 'No open to-dos');
  fillWelcomeList(welcomeAttention, welcomeAttentionRows(cards), 'Nothing needs attention');
  fillWelcomeList(welcomeNotes, welcomeNoteRows(), 'No notes');
  welcomePanel.hidden = false;
}

// Not remembered on purpose: the summary is always open when you come back.
welcomeToggle.addEventListener('click', () => {
  welcomeColumns.hidden = !welcomeColumns.hidden;
  welcomeToggle.textContent = welcomeColumns.hidden ? 'Show' : 'Hide';
  welcomeToggle.setAttribute('aria-expanded', String(!welcomeColumns.hidden));
});
