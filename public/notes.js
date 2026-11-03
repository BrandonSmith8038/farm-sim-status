const notesPanel = document.getElementById('notes-panel');

function noteRow(note, onRemove) {
  const updated = el('span', { className: 'note-date', textContent: formatDate(note.updatedAt) });

  // Every edit updates the date in place rather than rebuilding the list,
  // so the box being typed in keeps its focus.
  function changed() {
    note.updatedAt = new Date().toISOString();
    updated.textContent = formatDate(note.updatedAt);
    scheduleSave();
  }

  const text = el('input', { type: 'text', value: note.text, ariaLabel: 'Note' });
  text.addEventListener('input', () => { note.text = text.value; changed(); });

  // A note with details always shows them, so nothing is hidden when you come back.
  const details = el('textarea', { className: 'note-details', rows: 2, value: note.details, ariaLabel: 'Details', hidden: !note.details });
  details.addEventListener('input', () => { note.details = details.value; changed(); });

  const more = el('button', { className: 'note-more', type: 'button', textContent: '+ Details', hidden: !details.hidden });
  more.addEventListener('click', () => {
    details.hidden = false;
    more.hidden = true;
    details.focus();
  });

  const remove = removeButton('Remove note', () => {
    if (note.details.trim() && !confirm(`Delete "${note.text}" and its details?`)) return;
    onRemove(note);
  });

  return el('li', { className: 'note' }, el('div', { className: 'note-row' }, text, updated, more, remove), details);
}

// Newest notes go first, and notes never move while being edited.
function renderNotes() {
  const list = el('ul', { className: 'list note-list' });

  function draw() {
    list.replaceChildren(...farm.notes.map(note => noteRow(note, removed => {
      farm.notes.splice(farm.notes.indexOf(removed), 1);
      scheduleSave();
      draw();
    })));
  }

  const form = addForm('Add a note', text => {
    farm.notes.unshift({ text, details: '', updatedAt: new Date().toISOString() });
    scheduleSave();
    draw();
  });

  draw();
  notesPanel.replaceChildren(el('article', { className: 'card note-card' }, list, form));
}

function focusNewNote() {
  notesPanel.querySelector('.add-form input').focus();
}
