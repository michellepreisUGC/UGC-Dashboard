import { Store } from './store.js';
import { uid, eur, fmtDate, todayISO, addDays, el, showToast, slugify, fileToDataUrl, checkAttachmentSize, printAsPdf } from './util.js';
import { openClientModal } from './clients.js';

let current = null; // invoice being edited
let goHome = null;

export function initInvoices(navigate) {
  goHome = navigate;
  document.getElementById('newInvoiceBtn').addEventListener('click', () => openEditor());
  document.getElementById('invoiceCancelBtn').addEventListener('click', () => navigate('invoices'));
  document.getElementById('invoiceSaveBtn').addEventListener('click', saveCurrent);
  document.getElementById('invoicePrintBtn').addEventListener('click', () => {
    const filename = `Rechnung_${current.number}_${slugify(current.clientName)}_${current.date}`;
    printAsPdf(filename);
  });
  document.addEventListener('client-saved', () => { if (current) renderForm(); });
}

export function renderInvoiceList() {
  const tbody = document.getElementById('invoiceTableBody');
  const empty = document.getElementById('invoiceEmptyState');
  const invoices = Store.getInvoices();
  tbody.innerHTML = '';
  empty.classList.toggle('hidden', invoices.length > 0);

  invoices.forEach(inv => {
    const total = calcTotals(inv).gross;
    const statusClass = inv.status === 'paid' ? 'status-paid' : inv.status === 'draft' ? 'status-draft' : 'status-open';
    const statusLabel = inv.status === 'paid' ? 'Bezahlt' : inv.status === 'draft' ? 'Entwurf' : 'Offen';
    const tr = el('tr', {}, [
      el('td', {}, `${inv.number || '—'}${inv.attachmentName ? ' 📎' : ''}`),
      el('td', {}, fmtDate(inv.date)),
      el('td', {}, inv.clientName || '—'),
      el('td', {}, eur(total)),
      el('td', {}, el('span', { class: `status-pill ${statusClass}` }, statusLabel)),
      el('td', {}, el('div', { class: 'row-actions' }, [
        el('button', { class: 'icon-btn', title: 'Bearbeiten', onclick: () => openEditor(inv) }, '✎'),
        el('button', { class: 'icon-btn', title: 'Duplizieren', onclick: () => duplicateInvoice(inv) }, '⧉'),
        el('button', { class: 'icon-btn', title: 'Löschen', onclick: () => removeInvoice(inv) }, '✕')
      ]))
    ]);
    tbody.appendChild(tr);
  });
}

function removeInvoice(inv) {
  if (!confirm(`Rechnung ${inv.number} wirklich löschen?`)) return;
  Store.deleteInvoice(inv.id);
  renderInvoiceList();
  showToast('Rechnung gelöscht');
}

function duplicateInvoice(inv) {
  const settings = Store.getSettings();
  const number = nextInvoiceNumber(settings);
  const copy = { ...inv, id: uid(), number, date: todayISO(), status: 'draft', attachmentName: '', attachmentData: '', items: inv.items.map(i => ({ ...i, id: uid() })) };
  Store.saveInvoice(copy);
  Store.saveSettings({ nextInvoiceNumber: settings.nextInvoiceNumber + 1 });
  renderInvoiceList();
  openEditor(copy);
}

function nextInvoiceNumber(settings) {
  const n = String(settings.nextInvoiceNumber).padStart(3, '0');
  return `${settings.invoicePrefix || 'RE-'}${n}`;
}

function blankItem() {
  return { id: uid(), desc: '', qty: 1, price: 0 };
}

function openEditor(invoice = null) {
  const settings = Store.getSettings();
  if (invoice) {
    current = JSON.parse(JSON.stringify(invoice));
  } else {
    current = {
      id: uid(),
      number: nextInvoiceNumber(settings),
      isNew: true,
      date: todayISO(),
      serviceDate: todayISO(),
      dueDate: addDays(todayISO(), settings.paymentTermsDays || 14),
      clientId: '',
      clientName: '',
      clientAddress: '',
      vatRate: settings.kleinunternehmer ? 0 : 19,
      items: [blankItem()],
      notes: settings.defaultInvoiceNotes || '',
      status: 'open',
      attachmentName: '',
      attachmentData: ''
    };
  }
  document.getElementById('invoiceEditorTitle').textContent = invoice ? `Rechnung ${current.number}` : 'Neue Rechnung';
  goHome('invoice-editor');
  renderForm();
  renderPreview();
}

function calcTotals(inv) {
  const net = inv.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const vat = net * ((Number(inv.vatRate) || 0) / 100);
  return { net, vat, gross: net + vat };
}

function clientOptions() {
  const clients = Store.getClients();
  return `<option value="">— frei eingeben —</option>` +
    clients.map(c => `<option value="${c.id}" ${c.id === current.clientId ? 'selected' : ''}>${c.name}${c.company ? ' · ' + c.company : ''}</option>`).join('');
}

function renderForm() {
  const settings = Store.getSettings();
  const form = document.getElementById('invoiceForm');
  form.innerHTML = `
    <div class="form-section">
      <h3>Kundin/Kunde</h3>
      <div class="form-row">
        <div class="form-field full">
          <label for="inv-client">Aus Kundenliste wählen</label>
          <select id="inv-client">${clientOptions()}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-field full">
          <label for="inv-clientName">Name / Firma</label>
          <input id="inv-clientName" value="${current.clientName || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field full">
          <label for="inv-clientAddress">Adresse</label>
          <textarea id="inv-clientAddress" placeholder="Straße, PLZ Ort">${current.clientAddress || ''}</textarea>
        </div>
      </div>
      <button class="btn-ghost small" id="inv-newClientBtn" type="button">+ Neue Kundin/Kunde anlegen</button>
    </div>

    <div class="form-section">
      <h3>Rechnungsdaten</h3>
      <div class="form-row">
        <div class="form-field"><label for="inv-number">Rechnungsnummer</label><input id="inv-number" value="${current.number}"></div>
        <div class="form-field"><label for="inv-status">Status</label>
          <select id="inv-status">
            <option value="open" ${current.status === 'open' ? 'selected' : ''}>Offen</option>
            <option value="paid" ${current.status === 'paid' ? 'selected' : ''}>Bezahlt</option>
            <option value="draft" ${current.status === 'draft' ? 'selected' : ''}>Entwurf</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-field"><label for="inv-date">Rechnungsdatum</label><input type="date" id="inv-date" value="${current.date}"></div>
        <div class="form-field"><label for="inv-serviceDate">Leistungsdatum</label><input type="date" id="inv-serviceDate" value="${current.serviceDate}"></div>
        <div class="form-field"><label for="inv-dueDate">Fällig am</label><input type="date" id="inv-dueDate" value="${current.dueDate}"></div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="inv-vatRate">Umsatzsteuer</label>
          <select id="inv-vatRate" ${settings.kleinunternehmer ? 'disabled' : ''}>
            <option value="19" ${current.vatRate == 19 ? 'selected' : ''}>19 %</option>
            <option value="7" ${current.vatRate == 7 ? 'selected' : ''}>7 %</option>
            <option value="0" ${current.vatRate == 0 ? 'selected' : ''}>0 %</option>
          </select>
          ${settings.kleinunternehmer ? '<span class="field-hint">Kleinunternehmerregelung aktiv (§19 UStG)</span>' : ''}
        </div>
      </div>
    </div>

    <div class="form-section">
      <h3>Positionen</h3>
      <div class="line-item-head">
        <span>Beschreibung</span><span>Menge</span><span>Preis</span><span>Summe</span><span></span>
      </div>
      <div class="line-items" id="lineItems"></div>
      <button class="btn-ghost small" id="addItemBtn" type="button">+ Position hinzufügen</button>
    </div>

    <div class="form-section">
      <h3>Hinweise</h3>
      <div class="form-row">
        <div class="form-field full">
          <textarea id="inv-notes">${current.notes || ''}</textarea>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h3>PDF-Anhang</h3>
      <p class="field-hint" style="margin-bottom:10px;">Für bereits abgeschlossene Rechnungen: Original-PDF hier ablegen, dann die Eckdaten oben kurz eintragen.</p>
      ${current.attachmentName ? `
        <div class="attachment-row">
          <span>📎 ${escapeHtml(current.attachmentName)}</span>
          <div class="row-actions">
            <button class="btn-ghost small" type="button" id="inv-attachmentOpen">Öffnen</button>
            <button class="btn-ghost small" type="button" id="inv-attachmentRemove">Entfernen</button>
          </div>
        </div>
      ` : `
        <div class="form-row">
          <div class="form-field full">
            <input type="file" id="inv-attachmentInput" accept="application/pdf">
          </div>
        </div>
      `}
    </div>
  `;

  renderLineItems();

  document.getElementById('inv-newClientBtn').addEventListener('click', () => openClientModal());

  document.getElementById('inv-client').addEventListener('change', (e) => {
    const c = Store.getClient(e.target.value);
    if (c) {
      current.clientId = c.id;
      current.clientName = c.company ? `${c.name}\n${c.company}` : c.name;
      current.clientAddress = [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join('\n');
      renderForm();
      renderPreview();
    }
  });

  const bind = (id, key, transform = (v) => v) => {
    document.getElementById(id).addEventListener('input', (e) => {
      current[key] = transform(e.target.value);
      renderPreview();
    });
  };
  bind('inv-clientName', 'clientName');
  bind('inv-clientAddress', 'clientAddress');
  bind('inv-number', 'number');
  bind('inv-status', 'status');
  bind('inv-date', 'date');
  bind('inv-serviceDate', 'serviceDate');
  bind('inv-dueDate', 'dueDate');
  bind('inv-vatRate', 'vatRate', Number);
  bind('inv-notes', 'notes');

  document.getElementById('addItemBtn').addEventListener('click', () => {
    current.items.push(blankItem());
    renderLineItems();
    renderPreview();
  });

  const attachmentInput = document.getElementById('inv-attachmentInput');
  if (attachmentInput) {
    attachmentInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!checkAttachmentSize(file)) { attachmentInput.value = ''; return; }
      current.attachmentName = file.name;
      current.attachmentData = await fileToDataUrl(file);
      renderForm();
      showToast('PDF angehängt');
    });
  }
  const attachmentOpen = document.getElementById('inv-attachmentOpen');
  if (attachmentOpen) {
    attachmentOpen.addEventListener('click', () => {
      const win = window.open();
      win.document.write(`<iframe src="${current.attachmentData}" style="border:0;width:100%;height:100vh;"></iframe>`);
    });
  }
  const attachmentRemove = document.getElementById('inv-attachmentRemove');
  if (attachmentRemove) {
    attachmentRemove.addEventListener('click', () => {
      current.attachmentName = '';
      current.attachmentData = '';
      renderForm();
      showToast('Anhang entfernt');
    });
  }
}

function renderLineItems() {
  const wrap = document.getElementById('lineItems');
  wrap.innerHTML = '';
  current.items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'line-item-row';
    row.innerHTML = `
      <input type="text" placeholder="z. B. UGC-Video (15s, vertikal)" value="${item.desc}" data-field="desc">
      <input type="number" min="0" step="1" value="${item.qty}" data-field="qty">
      <input type="number" min="0" step="0.01" value="${item.price}" data-field="price">
      <span class="line-sum">${eur((item.qty || 0) * (item.price || 0))}</span>
      <button class="icon-btn" type="button" title="Entfernen">✕</button>
    `;
    row.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => {
        const field = inp.dataset.field;
        item[field] = field === 'desc' ? inp.value : Number(inp.value);
        row.querySelector('.line-sum').textContent = eur((item.qty || 0) * (item.price || 0));
        renderPreview();
      });
    });
    row.querySelector('button').addEventListener('click', () => {
      current.items = current.items.filter(i => i.id !== item.id);
      renderLineItems();
      renderPreview();
    });
    wrap.appendChild(row);
  });
}

function renderPreview() {
  const settings = Store.getSettings();
  const totals = calcTotals(current);
  const preview = document.getElementById('invoicePreview');

  const itemsRows = current.items.map(it => `
    <tr>
      <td>${escapeHtml(it.desc) || '—'}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${eur(it.price)}</td>
      <td class="num">${eur((it.qty || 0) * (it.price || 0))}</td>
    </tr>`).join('');

  const vatLine = settings.kleinunternehmer
    ? `<div class="row">Umsatzsteuer<span>0,00 € (§19 UStG)</span></div>`
    : `<div class="row">zzgl. ${current.vatRate}% USt.<span>${eur(totals.vat)}</span></div>`;

  preview.innerHTML = `
    <div class="doc-header">
      ${settings.logo ? `<img class="doc-logo" src="${settings.logo}">` : `<div class="doc-title">${escapeHtml(settings.companyName) || 'Deine Firma'}</div>`}
      <div class="doc-company">
        <strong>${escapeHtml(settings.companyName) || ''}</strong><br>
        ${escapeHtml(settings.ownerName) || ''}<br>
        ${escapeHtml(settings.street) || ''}<br>
        ${escapeHtml([settings.zip, settings.city].filter(Boolean).join(' '))}<br>
        ${settings.email ? escapeHtml(settings.email) + '<br>' : ''}
        ${settings.website ? escapeHtml(settings.website) : ''}
      </div>
    </div>

    <div class="doc-title">Rechnung</div>
    <div>${escapeHtml(current.number)}</div>

    <div class="doc-meta-grid">
      <div class="block">
        <span class="label">Rechnung an</span>
        ${nl2br(escapeHtml(current.clientName)) || '—'}<br>
        ${nl2br(escapeHtml(current.clientAddress))}
      </div>
      <div class="block">
        <span class="label">Rechnungsdatum</span>${fmtDate(current.date)}<br><br>
        <span class="label">Leistungsdatum</span>${fmtDate(current.serviceDate)}<br><br>
        <span class="label">Fällig am</span>${fmtDate(current.dueDate)}
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th>Beschreibung</th><th class="num">Menge</th><th class="num">Einzelpreis</th><th class="num">Summe</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="doc-totals">
      <div class="row">Zwischensumme<span>${eur(totals.net)}</span></div>
      ${vatLine}
      <div class="row grand">Gesamtbetrag<span>${eur(totals.gross)}</span></div>
    </div>

    <div class="doc-notes">${escapeHtml(current.notes || '')}</div>

    ${settings.kleinunternehmer ? '<div class="doc-notes">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</div>' : ''}

    <div class="doc-footer">
      <span>${escapeHtml(settings.companyName)} · ${escapeHtml(settings.ownerName)}</span>
      <span>${settings.taxId ? 'St.-Nr. ' + escapeHtml(settings.taxId) : ''} ${settings.vatId ? '· USt-IdNr. ' + escapeHtml(settings.vatId) : ''}</span>
      <span>${settings.iban ? 'IBAN ' + escapeHtml(settings.iban) : ''} ${settings.bic ? '· BIC ' + escapeHtml(settings.bic) : ''}</span>
    </div>
  `;
}

function saveCurrent() {
  const settings = Store.getSettings();
  if (!current.clientName) { showToast('Bitte Kundin/Kunde angeben'); return; }
  if (current.isNew) {
    Store.saveSettings({ nextInvoiceNumber: settings.nextInvoiceNumber + 1 });
    delete current.isNew;
  }
  Store.saveInvoice(current);
  showToast('Rechnung gespeichert');
  goHome('invoices');
  renderInvoiceList();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function nl2br(str) { return (str || '').replace(/\n/g, '<br>'); }

export { calcTotals };
