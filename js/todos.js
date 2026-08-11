import { Store } from './store.js';
import { el } from './util.js';

const CATEGORIES = [
  { key: 'today', label: 'Heute' },
  { key: 'week', label: 'Diese Woche' },
  { key: 'important', label: 'Super wichtig' }
];

export function renderTodos() {
  const container = document.getElementById('todoLists');
  if (!container) return;
  const todos = Store.getTodos();

  container.innerHTML = '';
  CATEGORIES.forEach(cat => {
    container.appendChild(el('div', { class: 'todo-column' }, [
      el('h3', { class: 'todo-column-title' }, cat.label),
      el('div', { class: 'todo-items' }, todos[cat.key].map((item, idx) => todoRow(cat.key, idx, item)))
    ]));
  });
}

function todoRow(catKey, idx, item) {
  const checkAttrs = {
    type: 'checkbox',
    class: 'todo-checkbox',
    onchange: (e) => {
      const todos = Store.getTodos();
      todos[catKey][idx].done = e.target.checked;
      Store.saveTodos(todos);
      renderTodos();
    }
  };
  if (item.done) checkAttrs.checked = 'checked';

  const textAttrs = {
    type: 'text',
    class: 'todo-text-input',
    value: item.text || '',
    placeholder: '…',
    onchange: (e) => {
      const todos = Store.getTodos();
      todos[catKey][idx].text = e.target.value;
      Store.saveTodos(todos);
    }
  };

  return el('label', { class: `todo-row${item.done ? ' is-done' : ''}` }, [
    el('input', checkAttrs),
    el('input', textAttrs)
  ]);
}
