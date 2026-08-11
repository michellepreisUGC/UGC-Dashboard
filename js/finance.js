import { Store } from './store.js';
import { uid, eur, fmtDate, todayISO, el, showToast, openModal, closeModal, slugify, printAsPdf, fileToDataUrl, checkAttachmentSize } from './util.js';
import { calcTotals } from './invoices.js';

let goHome = null;

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
  goHome = navigate;
  document.getElementById('newIncomeBtn').addEventListener('click', () => openIncomeModal());
  document.getElementById('newExpenseBtn').addEventListener('click', () => openExpenseModal());
  document.getElementById('financeYearSelect').addEventListener('change', (e) => {
    selectedYear = Number(e.target.value);
    renderFinanceView();
  });
  document.getElementById('financeExportBtn').addEventListener('click', () => {
    renderFinanceExport();
    goHome('finance-export');
  });
  document.getElementById('financeExportBackBtn').addEventListener('click', () => goHome('finance'));
  document.getElementById('financeExportPrintBtn').addEventListener('click', () => {
    const settings = Store.getSettings();
    const filename = `EUER_${selectedYear}_${slugify(settings.companyName || 'Uebersicht')}`;
    printAsPdf(filename);
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
    const actions = [];
    if (row.attachmentData) {
      actions.push(el('button', { class: 'icon-btn', title: 'Beleg öffnen', onclick: () => openAttachment(row.attachmentData) }, '📎'));
    }
    actions.push(el('button', { class: 'icon-btn', title: 'Löschen', onclick: () => { Store.deleteExpense(row.id); renderFinanceView(); showToast('Ausgabe gelöscht'); } }, '✕'));

    const tr = el('tr', {}, [
      el('td', {}, fmtDate(row.date)),
      el('td', {}, row.category || '—'),
      el('td', {}, row.description || '—'),
      el('td', { class: 'num' }, eur(row.amount)),
      el('td', {}, el('div', { class: 'row-actions' }, actions))
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

function renderFinanceExport() {
  const settings = Store.getSettings();
  const income = incomeRows(selectedYear);
  const expenses = expenseRows(selectedYear);
  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const profit = totalIncome - totalExpenses;

  const byCategory = {};
  expenses.forEach(e => {
    (byCategory[e.category] = byCategory[e.category] || []).push(e);
  });

  const incomeRowsHtml = income.length
    ? income.map(r => `
      <tr>
        <td>${fmtDate(r.date)}</td>
        <td>${escapeHtml(r.label)}</td>
        <td class="num">${eur(r.amount)}</td>
      </tr>`).join('')
    : `<tr><td colspan="3" class="muted">Keine Einnahmen in diesem Jahr.</td></tr>`;

  const expenseSections = Object.keys(byCategory).length
    ? Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0])).map(([cat, rows]) => {
      const subtotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      return `
        <tr><td colspan="3" style="padding-top:16px; font-weight:700; color:#8A4E58;">${escapeHtml(cat)}</td></tr>
        ${rows.map(r => `
          <tr>
            <td>${fmtDate(r.date)}</td>
            <td>${escapeHtml(r.description) || '—'}</td>
            <td class="num">${eur(r.amount)}</td>
          </tr>`).join('')}
        <tr><td></td><td class="muted">Zwischensumme ${escapeHtml(cat)}</td><td class="num" style="font-weight:600;">${eur(subtotal)}</td></tr>
      `;
    }).join('')
    : `<tr><td colspan="3" class="muted">Keine Ausgaben in diesem Jahr.</td></tr>`;

  const preview = document.getElementById('financeExportPreview');
  preview.innerHTML = `
    <div class="doc-header">
      ${settings.logo ? `<img class="doc-logo" src="${settings.logo}">` : `<div class="doc-title" style="font-size:1.3rem">${escapeHtml(settings.companyName) || 'Deine Firma'}</div>`}
      <div class="doc-company">
        ${escapeHtml(settings.companyName) || ''}<br>
        ${escapeHtml(settings.street) || ''}<br>
        ${escapeHtml([settings.zip, settings.city].filter(Boolean).join(' '))}<br>
        ${settings.taxId ? 'St.-Nr. ' + escapeHtml(settings.taxId) : ''} ${settings.vatId ? '· USt-IdNr. ' + escapeHtml(settings.vatId) : ''}
      </div>
    </div>

    <div class="doc-title">Einnahmen-Überschuss-Rechnung ${selectedYear}</div>
    <p class="muted" style="margin-bottom:24px;">Erstellt am ${fmtDate(todayISO())} · vereinfachte Übersicht, ersetzt keine Steuerberatung</p>

    <div class="doc-totals" style="width:100%; margin-bottom:30px;">
      <div class="row"><strong>Betriebseinnahmen gesamt</strong><span>${eur(totalIncome)}</span></div>
      <div class="row"><strong>Betriebsausgaben gesamt</strong><span>${eur(totalExpenses)}</span></div>
      <div class="row grand"><strong>Gewinn / Verlust (§4 Abs. 3 EStG)</strong><span>${eur(profit)}</span></div>
    </div>

    <h3 style="font-family: var(--font-display); color:#8A4E58; margin-bottom:8px;">Einnahmen</h3>
    <table class="doc-table">
      <thead><tr><th>Datum</th><th>Bezeichnung</th><th class="num">Betrag</th></tr></thead>
      <tbody>${incomeRowsHtml}</tbody>
    </table>

    <h3 style="font-family: var(--font-display); color:#8A4E58; margin:26px 0 8px;">Ausgaben nach Kategorie</h3>
    <table class="doc-table">
      <thead><tr><th>Datum</th><th>Beschreibung</th><th class="num">Betrag</th></tr></thead>
      <tbody>${expenseSections}</tbody>
    </table>

    <div class="doc-footer">
      <span>${escapeHtml(settings.companyName)} · ${escapeHtml(settings.ownerName)}</span>
      <span>Diese Aufstellung ist eine Arbeitshilfe und ersetzt keine Steuerberatung.</span>
    </div>
  `;
}

function openAttachment(dataUrl) {
  const win = window.open();
  win.document.write(`<iframe src="${dataUrl}" style="border:0;width:100%;height:100vh;"></iframe>`);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
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
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [
        el('label', {}, 'Rechnung/Beleg (PDF, optional)'),
        el('input', { type: 'file', id: 'exp-attachment', accept: 'application/pdf' }),
        el('span', { class: 'field-hint' }, 'Für Rückfragen vom Finanzamt direkt griffbereit, statt in Mails zu suchen.')
      ])
    ]),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn-ghost', onclick: closeModal }, 'Abbrechen'),
      el('button', {
        class: 'btn-primary', onclick: async () => {
          const amount = Number(document.getElementById('exp-amount').value) || 0;
          const description = document.getElementById('exp-description').value.trim();
          const file = document.getElementById('exp-attachment').files[0];
          let attachmentName = '', attachmentData = '';
          if (file) {
            if (!checkAttachmentSize(file)) return;
            attachmentName = file.name;
            attachmentData = await fileToDataUrl(file);
          }
          Store.saveExpense({
            id: uid(),
            date: document.getElementById('exp-date').value,
            amount,
            category: document.getElementById('exp-category').value,
            description,
            attachmentName,
            attachmentData
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
