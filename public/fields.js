// Edit these lists to change what the field card dropdowns offer.
const CROPS = [
  'None', 'Barley', 'Canola', 'Carrots', 'Corn', 'Cotton', 'Grapes', 'Grass', 'Green Beans', 'Long Grain Rice',
  'Oat', 'Oilseed Radish', 'Olives', 'Parsnips', 'Peas', 'Poplar', 'Potatoes', 'Red Beet', 'Rice', 'Sorghum',
  'Soybeans', 'Spinach', 'Sugar Beet', 'Sugarcane', 'Sunflowers', 'Wheat',
];
const GROWTH_STATES = ['Empty', 'Cultivated', 'Planted', 'Growing', 'Ready to harvest', 'Harvested', 'Withered'];
const FIELD_NEEDS = [['plow', 'Plowing'], ['lime', 'Lime'], ['weed', 'Weeding'], ['fertilize', 'Fertilizer']];

const fieldGrid = document.getElementById('field-grid');
const fieldsEmpty = document.getElementById('fields-empty');
const addFieldButton = document.getElementById('add-field');

const newField = () => ({
  name: '', crop: CROPS[0], growth: GROWTH_STATES[0], plow: false, lime: false, weed: false, fertilize: false,
  notes: '', todos: [], plans: [], updatedAt: new Date().toISOString(),
});

// Brings cards saved by older versions up to date: fertilizer stages became a
// simple need, and "someday" to-dos became future plans.
function upgradeField(field) {
  field.fertilize = Boolean(field.fertilize);
  delete field.fertilizer;
  for (const todo of field.todos.filter(todo => todo.priority === 'someday')) {
    if (todo.done) {
      todo.priority = 'normal';
    } else {
      field.plans.push({ text: todo.text });
      field.todos.splice(field.todos.indexOf(todo), 1);
    }
  }
}

// Works out the card's badges as rows: red badges side by side (one per urgent to-do),
// then one amber badge, or a green badge if neither applies.
function fieldAttention(field) {
  const urgent = field.todos.filter(todo => todo.priority === 'urgent' && !todo.done);
  const red = urgent.map(todo => todo.text.trim() || 'Urgent to-do');
  if (field.growth === 'Withered') red.push('Withered');

  const amber = [];
  if (field.growth === 'Ready to harvest') amber.push('Ready to harvest');
  const needs = FIELD_NEEDS.filter(([key]) => field[key]).map(([, label]) => label.toLowerCase());
  if (needs.length) amber.push(`Needs ${needs.join(', ')}`);

  const rows = [];
  if (red.length) rows.push(red.map(text => ({ level: 'urgent', text })));
  if (amber.length) rows.push([{ level: 'warn', text: amber.join(' · ') }]);
  return rows.length ? rows : [[{ level: 'good', text: 'All good' }]];
}

function fieldCard(field) {
  const badges = el('div', { className: 'badges' });
  const updated = el('span', { className: 'card-date' });

  function refresh() {
    badges.replaceChildren(...fieldAttention(field).map(row => el('div', { className: 'badge-row' },
      ...row.map(({ level, text }) => el('span', { className: `badge badge-${level}`, textContent: text })))));
    updated.textContent = `Updated ${formatDate(field.updatedAt)}`;
  }
  // Every edit updates the badge and date in place rather than rebuilding the card,
  // so the box being typed in keeps its focus.
  function changed() {
    field.updatedAt = new Date().toISOString();
    refresh();
    scheduleSave();
  }

  const name = el('input', { className: 'card-name', type: 'text', value: field.name, placeholder: 'Field name or number', ariaLabel: 'Field name or number' });
  name.addEventListener('input', () => { field.name = name.value; changed(); });

  const select = (label, key, options) => {
    const input = el('select', {}, ...options.map(option => el('option', { value: option, textContent: option })));
    input.value = field[key];
    input.addEventListener('change', () => { field[key] = input.value; changed(); });
    return el('label', { className: 'card-label' }, label, input);
  };

  const needs = FIELD_NEEDS.map(([key, label]) => {
    const button = el('button', { className: 'chip', type: 'button', textContent: label, ariaPressed: String(field[key]) });
    button.addEventListener('click', () => {
      field[key] = !field[key];
      button.ariaPressed = String(field[key]);
      changed();
    });
    return button;
  });

  const notes = el('textarea', { rows: 4, value: field.notes });
  notes.addEventListener('input', () => { field.notes = notes.value; changed(); });

  const remove = el('button', { className: 'card-delete', type: 'button', textContent: 'Delete field' });
  remove.addEventListener('click', () => {
    if (!confirm(`Delete ${field.name || 'this field'} and everything on its card?`)) return;
    farm.fields.splice(farm.fields.indexOf(field), 1);
    renderFields();
    scheduleSave();
  });

  refresh();
  return el('article', { className: 'card' },
    name,
    badges,
    el('div', { className: 'card-row' }, select('Crop', 'crop', CROPS), select('Growth state', 'growth', GROWTH_STATES)),
    el('div', { className: 'card-group' }, el('span', { className: 'card-label' }, 'Needs'), el('div', { className: 'chips' }, ...needs)),
    el('label', { className: 'card-label' }, 'Notes', notes),
    todoSection(field, changed),
    planSection(field, changed),
    el('div', { className: 'card-footer' }, updated, remove),
  );
}

// Cards sort by name, so "Field 2" comes before "Field 10". Renaming a card
// only moves it the next time the page loads, so it can't jump mid-edit.
function renderFields(focusField) {
  const sorted = [...farm.fields].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  fieldGrid.replaceChildren();
  for (const field of sorted) {
    const card = fieldCard(field);
    fieldGrid.append(card);
    if (field === focusField) card.querySelector('.card-name').focus();
  }
  fieldsEmpty.hidden = farm.fields.length > 0;
}

addFieldButton.addEventListener('click', () => {
  const field = newField();
  farm.fields.push(field);
  renderFields(field);
  scheduleSave();
});
