import { Store } from './store.js';
import { uid, eur, fmtDate, todayISO, el, showToast, openModal, closeModal } from './util.js';
import { calcTotals } from './invoices.js';

export const EXPENSE_CATEGORIES = [
  'Wareneinkauf & Material',
  'Software & Abos',
  'Marketing & Werbung',
  'Miete & Nebenkosten',
  'Fahrtkosten',
  'Reisekosten',
  'Telefon & Internet',
  'Bürobedarf',
  'Fortbildung',
  'Versicherungen',
  'Steuerberatung & Buchhaltung',
  'Bankgebühren',
  'Sonstiges'
];

let selectedYear = new Date().getFullYear();

function yearOf(dateStr) {
  return Number((dateStr || '').slice(0, 4)) || new Date().getFullYear();
}

function availableYears() {
  const years = new Set([new Date().getFullYear()]);
  Store.getInvoices().forEach(i => years.add(yearOf(i.date)));
  Store.getExpenses().forEach(e => years.add(yearOf(e.date)));
  Store.getIncomeExtra().forEach(i => years.add(yearOf(i.date)));
  return Array.from(years).sort((a, b) => b - a);
}

function incomeRows(year) {
  const fromInvoices = Store.getInvoices()
    .filter(i => i.status === 'paid' && yearOf(i.date) === year)
    .map(i => ({
      id: i.id, date: i.date, label: `Rechnung ${i.number} · ${i.clientName || ''}`.trim(),
      amount: calcTotals(i).gross, source: 'invoice'
    }));
  const manual = Store.getIncomeExtra()
    .filter(i => yearOf(i.date) === year)
    .map(i => ({ id: i.id, date: i.date, label: i.label, amount: Number(i.amount) || 0, source: 'manual' }));
  return [...fromInvoices, ...manual].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function expenseRows(year) {
  return Store.getExpenses().filter(e => yearOf(e.date) === year);
}

export function initFinance(navigate) {
  document.getElementById('newIncomeBtn').addEventListener('click', () => openIncomeModal());
  document.getElementById('newExpenseBtn').addEventListener('click', () => openExpenseModal());
  document.getElementById('financeYearSelect').addEventListener('change', (e) => {
    selectedYear = Number(e.target.value);
    renderFinanceView();
  });
}

export function renderFinanceView() {
  const years = availableYears();
  if (!years.includes(selectedYear)) selectedYear = years[0];

  const yearSelect = document.getElementById('financeYearSelect');
  yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');

  const income = incomeRows(selectedYear);
  const expenses = expenseRows(selectedYear);
  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const profit = totalIncome - totalExpenses;

  document.getElementById('finTotalIncome').textContent = eur(totalIncome);
  document.getElementById('finTotalExpenses').textContent = eur(totalExpenses);
  const profitEl = document.getElementById('finProfit');
  profitEl.textContent = eur(profit);
  profitEl.classList.toggle('negative', profit < 0);

  // Income table
  const incomeBody = document.getElementById('incomeTableBody');
  incomeBody.innerHTML = '';
  document.getElementById('incomeEmptyState').classList.toggle('hidden', income.length > 0);
  income.forEach(row => {
    const tr = el('tr', {}, [
      el('td', {}, fmtDate(row.date)),
      el('td', {}, row.label || '—'),
      el('td', {}, el('span', { class: `status-pill ${row.source === 'invoice' ? 'status-paid' : 'status-draft'}` }, row.source === 'invoice' ? 'Rechnung' : 'Manuell')),
      el('td', { class: 'num' }, eur(row.amount)),
      el('td', {}, row.source === 'manual' ? el('div', { class: 'row-actions' }, [
        el('button', { class: 'icon-btn', title: 'Löschen', onclick: () => { Store.deleteIncomeExtra(row.id); renderFinanceView(); showToast('Einnahme gelöscht'); } }, '✕')
      ]) : '')
    ]);
    incomeBody.appendChild(tr);
  });

  // Expense table
  const expenseBody = document.getElementById('expenseTableBody');
  expenseBody.innerHTML = '';
  document.getElementById('expenseEmptyState').classList.toggle('hidden', expenses.length > 0);
  expenses.forEach(row => {
    const tr = el('tr', {}, [
      el('td', {}, fmtDate(row.date)),
      el('td', {}, row.category || '—'),
      el('td', {}, row.description || '—'),
      el('td', { class: 'num' }, eur(row.amount)),
      el('td', {}, el('div', { class: 'row-actions' }, [
        el('button', { class: 'icon-btn', title: 'Löschen', onclick: () => { Store.deleteExpense(row.id); renderFinanceView(); showToast('Ausgabe gelöscht'); } }, '✕')
      ]))
    ]);
    expenseBody.appendChild(tr);
  });

  // Category breakdown
  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0); });
  const maxCat = Math.max(1, ...Object.values(byCategory));
  const breakdown = document.getElementById('expenseBreakdown');
  breakdown.innerHTML = '';
  if (!Object.keys(byCategory).length) {
    breakdown.innerHTML = '<p class="muted small">Noch keine Ausgaben in diesem Jahr.</p>';
  } else {
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, sum]) => {
        const row = document.createElement('div');
        row.className = 'breakdown-row';
        row.innerHTML = `
          <span class="breakdown-label">${cat}</span>
          <div class="breakdown-bar-track"><div class="breakdown-bar" style="width:${(sum / maxCat) * 100}%"></div></div>
          <span class="breakdown-value">${eur(sum)}</span>
        `;
        breakdown.appendChild(row);
      });
  }
}

function openIncomeModal() {
  const box = el('div', {}, [
    el('h3', {}, 'Neue Einnahme'),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field' }, [ el('label', {}, 'Datum'), el('input', { type: 'date', id: 'inc-date', value: todayISO() }) ]),
      el('div', { class: 'form-field' }, [ el('label', {}, 'Betrag (€)'), el('input', { type: 'number', step: '0.01', id: 'inc-amount', value: '0' }) ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [ el('label', {}, 'Bezeichnung'), el('input', { id: 'inc-label', placeholder: 'z. B. Barzahlung Shooting' }) ])
    ]),
    el('div', { class: 'field-hint' }, 'Bezahlte Rechnungen erscheinen automatisch als Einnahme – hier nur zusätzliche Einnahmen erfassen.'),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn-ghost', onclick: closeModal }, 'Abbrechen'),
      el('button', {
        class: 'btn-primary', onclick: () => {
          const amount = Number(document.getElementById('inc-amount').value) || 0;
          const label = document.getElementById('inc-label').value.trim();
          if (!label) { showToast('Bitte eine Bezeichnung angeben'); return; }
          Store.saveIncomeExtra({ id: uid(), date: document.getElementById('inc-date').value, amount, label });
          closeModal();
          renderFinanceView();
          showToast('Einnahme gespeichert');
        }
      }, 'Speichern')
    ])
  ]);
  openModal(box);
}

function openExpenseModal() {
  const box = el('div', {}, [
    el('h3', {}, 'Neue Ausgabe'),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field' }, [ el('label', {}, 'Datum'), el('input', { type: 'date', id: 'exp-date', value: todayISO() }) ]),
      el('div', { class: 'form-field' }, [ el('label', {}, 'Betrag (€)'), el('input', { type: 'number', step: '0.01', id: 'exp-amount', value: '0' }) ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [
        el('label', {}, 'Kategorie'),
        el('select', { id: 'exp-category' }, EXPENSE_CATEGORIES.map(c => el('option', { value: c }, c)))
      ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [ el('label', {}, 'Beschreibung'), el('input', { id: 'exp-description', placeholder: 'z. B. Adobe Creative Cloud Abo' }) ])
    ]),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn-ghost', onclick: closeModal }, 'Abbrechen'),
      el('button', {
        class: 'btn-primary', onclick: () => {
          const amount = Number(document.getElementById('exp-amount').value) || 0;
          const description = document.getElementById('exp-description').value.trim();
          Store.saveExpense({
            id: uid(),
            date: document.getElementById('exp-date').value,
            amount,
            category: document.getElementById('exp-category').value,
            description
          });
          closeModal();
          renderFinanceView();
          showToast('Ausgabe gespeichert');
        }
      }, 'Speichern')
    ])
  ]);
  openModal(box);
}
