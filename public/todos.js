const todoColumns = document.getElementById('todo-columns');

// The farm has .todos and .plans lists just like a card does, so the shared sections
// work on it directly. These items have no dates of their own, so an edit only saves.
function renderTodos() {
  const todoCard = el('article', { className: 'card' }, todoSection(farm, scheduleSave));
  cardElements.set(farm, todoCard);
  todoColumns.replaceChildren(todoCard, el('article', { className: 'card' }, planSection(farm, scheduleSave)));
}

function focusNewTodo() {
  todoColumns.children[0].querySelector('.add-form input').focus();
}

function focusNewPlan() {
  todoColumns.children[1].querySelector('.add-form input').focus();
}
