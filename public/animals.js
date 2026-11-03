// Edit this list to change what the animal card dropdown offers.
const ANIMAL_TYPES = ['Cows', 'Water Buffalo', 'Sheep', 'Goats', 'Pigs', 'Chickens', 'Horses'];
const FOOD_STATES = [['good', 'Good'], ['bad', 'Not good']];

const animalGrid = document.getElementById('animal-grid');
const animalsEmpty = document.getElementById('animals-empty');

const newAnimal = () => ({
  type: ANIMAL_TYPES[0], location: '', food: 'good', foodNeeds: '',
  notes: '', todos: [], plans: [], updatedAt: new Date().toISOString(),
});

const animalLabel = animal => (animal.location.trim() ? `${animal.type} at ${animal.location.trim()}` : animal.type);

// What needs attention because of the animals themselves, not their to-dos.
function animalFlags(animal) {
  if (animal.food !== 'bad') return [];
  const needs = animal.foodNeeds.trim();
  return [{ level: 'warn', text: needs ? `Needs ${needs}` : 'Food not good' }];
}

// Works out the card's badges as rows: red badges side by side (one per urgent to-do),
// then one amber badge for food, or a green badge if neither applies.
function animalAttention(animal) {
  const urgent = animal.todos.filter(todo => todo.priority === 'urgent' && !todo.done);
  const red = urgent.map(todo => todo.text.trim() || 'Urgent to-do');
  const flags = animalFlags(animal);

  const rows = [];
  if (red.length) rows.push(red.map(text => ({ level: 'urgent', text })));
  if (flags.length) rows.push(flags);
  return rows.length ? rows : [[{ level: 'good', text: 'All good' }]];
}

function animalCard(animal) {
  const badges = el('div', { className: 'badges' });
  const updated = el('span', { className: 'card-date' });

  function refresh() {
    badges.replaceChildren(...badgeRows(animalAttention(animal)));
    updated.textContent = `Updated ${formatDate(animal.updatedAt)}`;
  }
  // Every edit updates the badge and date in place rather than rebuilding the card,
  // so the box being typed in keeps its focus.
  function changed() {
    animal.updatedAt = new Date().toISOString();
    refresh();
    scheduleSave();
  }

  const type = dropdown(animal, 'type', ANIMAL_TYPES, changed, { className: 'card-type', ariaLabel: 'Animal type' });

  const location = el('input', { className: 'card-name', type: 'text', value: animal.location, placeholder: 'Location, e.g. Barn by Field 3', ariaLabel: 'Location' });
  location.addEventListener('input', () => { animal.location = location.value; changed(); });

  // The box only hides, so its text comes back if food goes back to not good.
  const foodNeeds = el('textarea', { className: 'food-needs', rows: 2, value: animal.foodNeeds });
  foodNeeds.addEventListener('input', () => { animal.foodNeeds = foodNeeds.value; changed(); });
  const foodNeedsLabel = el('label', { className: 'card-label', hidden: animal.food !== 'bad' }, 'What they need', foodNeeds);

  const foodButtons = FOOD_STATES.map(([key, label]) => {
    const button = el('button', { className: `chip chip-${key}`, type: 'button', textContent: label, ariaPressed: String(animal.food === key) });
    button.addEventListener('click', () => {
      animal.food = key;
      FOOD_STATES.forEach(([other], i) => { foodButtons[i].ariaPressed = String(other === key); });
      foodNeedsLabel.hidden = key !== 'bad';
      changed();
    });
    return button;
  });

  const notes = el('textarea', { rows: 4, value: animal.notes });
  notes.addEventListener('input', () => { animal.notes = notes.value; changed(); });

  const remove = el('button', { className: 'card-delete', type: 'button', textContent: 'Delete animals' });
  remove.addEventListener('click', () => {
    if (!confirm(`Delete ${animalLabel(animal)} and everything on its card?`)) return;
    farm.animals.splice(farm.animals.indexOf(animal), 1);
    renderAnimals();
    scheduleSave();
  });

  refresh();
  return el('article', { className: 'card' },
    el('div', { className: 'card-head' }, type, location),
    badges,
    el('div', { className: 'card-group' }, el('span', { className: 'card-label' }, 'Food'), el('div', { className: 'chips' }, ...foodButtons)),
    foodNeedsLabel,
    el('label', { className: 'card-label' }, 'Notes', notes),
    todoSection(animal, changed),
    planSection(animal, changed),
    el('div', { className: 'card-footer' }, updated, remove),
  );
}

// Cards sort by type, then location. Changing either only moves a card the next
// time the page loads, so it can't jump mid-edit.
const sortedAnimals = () => [...farm.animals].sort((a, b) => a.type.localeCompare(b.type)
  || a.location.localeCompare(b.location, undefined, { numeric: true }));

function renderAnimals(focusAnimal) {
  animalGrid.replaceChildren();
  for (const animal of sortedAnimals()) {
    const card = animalCard(animal);
    cardElements.set(animal, card);
    animalGrid.append(card);
    if (animal === focusAnimal) card.querySelector('.card-name').focus();
  }
  animalsEmpty.hidden = farm.animals.length > 0;
}

function addAnimal() {
  const animal = newAnimal();
  farm.animals.push(animal);
  renderAnimals(animal);
  scheduleSave();
}
