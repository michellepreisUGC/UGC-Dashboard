import { Store } from './store.js';
import { uid, eur, fmtDate, todayISO, el, showToast } from './util.js';
import { openClientModal } from './clients.js';

let current = null;
let goHome = null;

const DEFAULT_SECTIONS = {
  scope: 'Der/die Auftragnehmer:in erstellt für den/die Auftraggeber:in nutzergenerierte Inhalte (UGC) gemäß vorheriger Absprache, u. a. Kurzvideos und/oder Bilder zur Bewerbung von Produkten oder Dienstleistungen des/der Auftraggeber:in. Umfang, Anzahl der Inhalte, Format und inhaltliche Eckpunkte werden vor Produktionsbeginn schriftlich (z. B. per E-Mail) festgelegt.',
  usageRights: 'Der/die Auftragnehmer:in räumt dem/der Auftraggeber:in nach vollständiger Bezahlung ein einfaches, zeitlich und räumlich unbeschränktes Nutzungsrecht an den erstellten Inhalten ein, insbesondere zur Verwendung auf eigenen Social-Media-Kanälen, der Website sowie im Rahmen von organischer und bezahlter Werbung (Paid Ads). Eine Weitergabe der Nutzungsrechte an Dritte sowie eine Bearbeitung der Inhalte bedürfen der vorherigen Zustimmung des/der Auftragnehmer:in, soweit nicht anders vereinbart. Der/die Auftragnehmer:in darf die Inhalte, sofern nicht anders vereinbart, für die eigene Referenz- und Portfoliodarstellung nutzen.',
  confidentiality: 'Beide Parteien verpflichten sich, vertrauliche Informationen, die ihnen im Rahmen der Zusammenarbeit bekannt werden, streng vertraulich zu behandeln und nicht an Dritte weiterzugeben, soweit keine gesetzliche Offenlegungspflicht besteht.',
  termination: 'Dieser Vertrag kann von beiden Parteien mit einer Frist von 14 Tagen zum Ende eines Kalendermonats in Textform gekündigt werden. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Bereits erbrachte Leistungen sind in jedem Fall zu vergüten.',
  finalProvisions: 'Änderungen und Ergänzungen dieses Vertrages bedürfen der Textform. Sollte eine Bestimmung dieses Vertrages unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Es gilt das Recht der Bundesrepublik Deutschland.'
};

export function daysUntil(dateStr) {
  const today = new Date(todayISO() + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}

export function rightsInfo(c) {
  if (c.usageRightsUnlimited !== false || !c.usageRightsEndDate) return null;
  const days = daysUntil(c.usageRightsEndDate);
  const status = days < 0 ? (c.followUpDone ? 'done' : 'expired') : days <= 30 ? 'soon' : 'ok';
  return { endDate: c.usageRightsEndDate, days, status, scope: c.usageRightsScope, followUpDone: !!c.followUpDone };
}

function rightsBadge(c) {
  if (c.usageRightsUnlimited !== false) return { label: 'Unbegrenzt', cls: 'status-draft' };
  if (!c.usageRightsEndDate) return { label: '—', cls: 'status-draft' };
  const info = rightsInfo(c);
  if (info.status === 'expired') return { label: `Abgelaufen (${fmtDate(info.endDate)})`, cls: 'status-danger' };
  if (info.status === 'done') return { label: `Abgelaufen · Follow-up erledigt`, cls: 'status-draft' };
  if (info.status === 'soon') return { label: `bis ${fmtDate(info.endDate)} · noch ${info.days} Tage`, cls: 'status-open' };
  return { label: `bis ${fmtDate(info.endDate)}`, cls: 'status-paid' };
}

export function initContracts(navigate) {
  goHome = navigate;
  document.getElementById('newContractBtn').addEventListener('click', () => openEditor());
  document.getElementById('contractCancelBtn').addEventListener('click', () => navigate('contracts'));
  document.getElementById('contractSaveBtn').addEventListener('click', saveCurrent);
  document.getElementById('contractPrintBtn').addEventListener('click', () => window.print());
  document.addEventListener('client-saved', () => { if (current) renderForm(); });
}

export function renderContractList() {
  const tbody = document.getElementById('contractTableBody');
  const empty = document.getElementById('contractEmptyState');
  const contracts = Store.getContracts();
  tbody.innerHTML = '';
  empty.classList.toggle('hidden', contracts.length > 0);

  contracts.forEach(c => {
    const statusClass = c.status === 'signed' ? 'status-paid' : c.status === 'draft' ? 'status-draft' : 'status-open';
    const statusLabel = c.status === 'signed' ? 'Unterschrieben' : c.status === 'draft' ? 'Entwurf' : 'Versendet';
    const badge = rightsBadge(c);
    const tr = el('tr', {}, [
      el('td', {}, c.title || 'UGC-Vertrag'),
      el('td', {}, fmtDate(c.date)),
      el('td', {}, c.clientName || '—'),
      el('td', {}, el('span', { class: `status-pill ${statusClass}` }, statusLabel)),
      el('td', {}, el('span', { class: `status-pill ${badge.cls}` }, badge.label)),
      el('td', {}, el('div', { class: 'row-actions' }, [
        el('button', { class: 'icon-btn', title: 'Bearbeiten', onclick: () => openEditor(c) }, '✎'),
        el('button', { class: 'icon-btn', title: 'Duplizieren', onclick: () => duplicateContract(c) }, '⧉'),
        el('button', { class: 'icon-btn', title: 'Löschen', onclick: () => removeContract(c) }, '✕')
      ]))
    ]);
    tbody.appendChild(tr);
  });

  renderRightsOverview();
}

function renderRightsOverview() {
  const box = document.getElementById('rightsOverviewCard');
  const list = document.getElementById('rightsOverviewList');
  if (!box) return;

  const tracked = Store.getContracts()
    .map(c => ({ c, info: rightsInfo(c) }))
    .filter(x => x.info && x.info.status !== 'done')
    .sort((a, b) => a.info.days - b.info.days);

  box.classList.toggle('hidden', tracked.length === 0);
  list.innerHTML = '';

  tracked.forEach(({ c, info }) => {
    const row = document.createElement('div');
    row.className = 'rights-row';
    const statusText = info.status === 'expired'
      ? `abgelaufen seit ${Math.abs(info.days)} Tagen`
      : info.status === 'soon'
        ? `läuft in ${info.days} Tagen ab`
        : `läuft in ${info.days} Tagen ab`;
    const pillClass = info.status === 'expired' ? 'status-danger' : info.status === 'soon' ? 'status-open' : 'status-paid';
    row.innerHTML = `
      <div class="rights-row-main">
        <strong>${escapeHtml(c.title || 'UGC-Vertrag')}</strong>
        <span class="muted small"> · ${escapeHtml(c.clientName || 'ohne Kund:in')}${info.scope ? ' · ' + escapeHtml(info.scope) : ''}</span>
      </div>
      <span class="status-pill ${pillClass}">${fmtDate(info.endDate)} · ${statusText}</span>
    `;
    const actions = document.createElement('div');
    actions.className = 'rights-row-actions';
    const openBtn = document.createElement('button');
    openBtn.className = 'btn-ghost small';
    openBtn.textContent = 'Öffnen';
    openBtn.addEventListener('click', () => openEditor(c));
    actions.appendChild(openBtn);
    if (info.status === 'expired') {
      const doneBtn = document.createElement('button');
      doneBtn.className = 'btn-ghost small';
      doneBtn.textContent = 'Follow-up erledigt';
      doneBtn.addEventListener('click', () => {
        Store.saveContract({ ...c, followUpDone: true });
        renderContractList();
        showToast('Als erledigt markiert');
      });
      actions.appendChild(doneBtn);
    }
    row.appendChild(actions);
    list.appendChild(row);
  });
}

function removeContract(c) {
  if (!confirm(`Vertrag "${c.title}" wirklich löschen?`)) return;
  Store.deleteContract(c.id);
  renderContractList();
  showToast('Vertrag gelöscht');
}

function duplicateContract(c) {
  const copy = { ...c, id: uid(), date: todayISO(), status: 'draft', followUpDone: false };
  Store.saveContract(copy);
  renderContractList();
  openEditor(copy);
}

function openEditor(contract = null) {
  if (contract) {
    current = JSON.parse(JSON.stringify(contract));
  } else {
    current = {
      id: uid(),
      title: 'UGC-Vertrag',
      date: todayISO(),
      startDate: todayISO(),
      deliveryDate: '',
      clientId: '',
      clientName: '',
      clientAddress: '',
      feeAmount: '',
      paymentTerms: 'Die Vergütung ist innerhalb von 14 Tagen nach Rechnungsstellung fällig.',
      status: 'draft',
      usageRightsUnlimited: true,
      usageRightsEndDate: '',
      usageRightsScope: '',
      followUpDone: false,
      ...DEFAULT_SECTIONS
    };
  }
  document.getElementById('contractEditorTitle').textContent = contract ? current.title : 'Neuer Vertrag';
  goHome('contract-editor');
  renderForm();
  renderPreview();
}

function clientOptions() {
  const clients = Store.getClients();
  return `<option value="">— frei eingeben —</option>` +
    clients.map(c => `<option value="${c.id}" ${c.id === current.clientId ? 'selected' : ''}>${c.name}${c.company ? ' · ' + c.company : ''}</option>`).join('');
}

function renderForm() {
  const form = document.getElementById('contractForm');
  form.innerHTML = `
    <div class="form-section">
      <h3>Grunddaten</h3>
      <div class="form-row">
        <div class="form-field full"><label for="ct-title">Titel</label><input id="ct-title" value="${current.title}"></div>
      </div>
      <div class="form-row">
        <div class="form-field"><label for="ct-date">Vertragsdatum</label><input type="date" id="ct-date" value="${current.date}"></div>
        <div class="form-field"><label for="ct-status">Status</label>
          <select id="ct-status">
            <option value="draft" ${current.status === 'draft' ? 'selected' : ''}>Entwurf</option>
            <option value="sent" ${current.status === 'sent' ? 'selected' : ''}>Versendet</option>
            <option value="signed" ${current.status === 'signed' ? 'selected' : ''}>Unterschrieben</option>
          </select>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h3>Auftraggeber:in</h3>
      <div class="form-row">
        <div class="form-field full">
          <label for="ct-client">Aus Kundenliste wählen</label>
          <select id="ct-client">${clientOptions()}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-field full"><label for="ct-clientName">Name / Firma</label><input id="ct-clientName" value="${current.clientName || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-field full"><label for="ct-clientAddress">Adresse</label><textarea id="ct-clientAddress">${current.clientAddress || ''}</textarea></div>
      </div>
      <button class="btn-ghost small" id="ct-newClientBtn" type="button">+ Neue Kundin/Kunde anlegen</button>
    </div>

    <div class="form-section">
      <h3>§1 Vertragsgegenstand</h3>
      <div class="form-row"><div class="form-field full"><textarea id="ct-scope">${current.scope}</textarea></div></div>
    </div>

    <div class="form-section">
      <h3>§2 Vergütung &amp; Laufzeit</h3>
      <div class="form-row">
        <div class="form-field"><label for="ct-feeAmount">Vergütung (€)</label><input id="ct-feeAmount" value="${current.feeAmount}" placeholder="z. B. 350,00 €"></div>
        <div class="form-field"><label for="ct-startDate">Beginn</label><input type="date" id="ct-startDate" value="${current.startDate}"></div>
        <div class="form-field"><label for="ct-deliveryDate">Liefertermin</label><input type="date" id="ct-deliveryDate" value="${current.deliveryDate}"></div>
      </div>
      <div class="form-row"><div class="form-field full"><textarea id="ct-paymentTerms">${current.paymentTerms}</textarea></div></div>
    </div>

    <div class="form-section">
      <h3>§3 Nutzungsrechte</h3>
      <div class="form-row"><div class="form-field full"><textarea id="ct-usageRights">${current.usageRights}</textarea></div></div>
      <div class="form-row">
        <div class="form-field">
          <label for="ct-usageRightsUnlimited">Gültigkeit</label>
          <select id="ct-usageRightsUnlimited">
            <option value="true" ${current.usageRightsUnlimited !== false ? 'selected' : ''}>Zeitlich unbegrenzt</option>
            <option value="false" ${current.usageRightsUnlimited === false ? 'selected' : ''}>Befristet bis</option>
          </select>
        </div>
        <div class="form-field ${current.usageRightsUnlimited !== false ? 'hidden' : ''}" id="ct-usageRightsEndDateWrap">
          <label for="ct-usageRightsEndDate">Gültig bis</label>
          <input type="date" id="ct-usageRightsEndDate" value="${current.usageRightsEndDate || ''}">
        </div>
      </div>
      <div class="form-row ${current.usageRightsUnlimited !== false ? 'hidden' : ''}" id="ct-usageRightsScopeWrap">
        <div class="form-field full">
          <label for="ct-usageRightsScope">Umfang der Befristung (optional)</label>
          <input id="ct-usageRightsScope" placeholder="z. B. nur Paid Ads / Whitelisting" value="${current.usageRightsScope || ''}">
        </div>
      </div>
      <div class="form-row ${current.usageRightsUnlimited !== false ? 'hidden' : ''}" id="ct-followUpWrap">
        <label class="checkbox-field"><input type="checkbox" id="ct-followUpDone" ${current.followUpDone ? 'checked' : ''}> Follow-up nach Ablauf bereits erledigt</label>
      </div>
      <p class="field-hint">Bei Befristung erscheint der Vertrag automatisch in "Fristen im Blick", solange kein Follow-up erledigt ist.</p>
    </div>

    <div class="form-section">
      <h3>§4 Vertraulichkeit</h3>
      <div class="form-row"><div class="form-field full"><textarea id="ct-confidentiality">${current.confidentiality}</textarea></div></div>
    </div>

    <div class="form-section">
      <h3>§5 Kündigung</h3>
      <div class="form-row"><div class="form-field full"><textarea id="ct-termination">${current.termination}</textarea></div></div>
    </div>

    <div class="form-section">
      <h3>§6 Schlussbestimmungen</h3>
      <div class="form-row"><div class="form-field full"><textarea id="ct-finalProvisions">${current.finalProvisions}</textarea></div></div>
    </div>
  `;

  document.getElementById('ct-newClientBtn').addEventListener('click', () => openClientModal());
  document.getElementById('ct-client').addEventListener('change', (e) => {
    const c = Store.getClient(e.target.value);
    if (c) {
      current.clientId = c.id;
      current.clientName = c.company ? `${c.name}\n${c.company}` : c.name;
      current.clientAddress = [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join('\n');
      renderForm();
      renderPreview();
    }
  });

  const bind = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      current[key] = e.target.value;
      renderPreview();
    });
  };
  ['title', 'date', 'status', 'clientName', 'clientAddress', 'feeAmount', 'startDate', 'deliveryDate',
   'paymentTerms', 'scope', 'usageRights', 'confidentiality', 'termination', 'finalProvisions']
    .forEach(key => bind(`ct-${key}`, key));

  document.getElementById('ct-usageRightsUnlimited').addEventListener('change', (e) => {
    current.usageRightsUnlimited = e.target.value === 'true';
    renderForm();
    renderPreview();
  });
  document.getElementById('ct-usageRightsEndDate').addEventListener('input', (e) => {
    current.usageRightsEndDate = e.target.value;
    renderPreview();
  });
  document.getElementById('ct-usageRightsScope').addEventListener('input', (e) => {
    current.usageRightsScope = e.target.value;
    renderPreview();
  });
  document.getElementById('ct-followUpDone').addEventListener('change', (e) => {
    current.followUpDone = e.target.checked;
  });
}

function renderPreview() {
  const settings = Store.getSettings();
  const preview = document.getElementById('contractPreview');
  preview.innerHTML = `
    <div class="doc-header">
      ${settings.logo ? `<img class="doc-logo" src="${settings.logo}">` : `<div class="doc-title" style="font-size:1.3rem">${escapeHtml(settings.companyName) || 'Deine Firma'}</div>`}
      <div class="doc-company">
        ${escapeHtml(settings.street) || ''}<br>
        ${escapeHtml([settings.zip, settings.city].filter(Boolean).join(' '))}<br>
        ${settings.email ? escapeHtml(settings.email) : ''}
      </div>
    </div>

    <div class="doc-title">${escapeHtml(current.title)}</div>
    <p class="muted" style="margin-bottom:20px;">Datum: ${fmtDate(current.date)}</p>

    <div class="doc-meta-grid">
      <div class="block">
        <span class="label">Auftraggeber:in</span>
        ${nl2br(escapeHtml(current.clientName)) || '—'}<br>
        ${nl2br(escapeHtml(current.clientAddress))}
      </div>
      <div class="block">
        <span class="label">Auftragnehmer:in</span>
        ${escapeHtml(settings.companyName) || '—'}<br>
        ${escapeHtml(settings.ownerName) || ''}<br>
        ${escapeHtml(settings.street) || ''}<br>
        ${escapeHtml([settings.zip, settings.city].filter(Boolean).join(' '))}
      </div>
    </div>

    <div class="contract-section">
      <h3>§1 Vertragsgegenstand</h3>
      <p class="body-text">${escapeHtml(current.scope)}</p>
    </div>

    <div class="contract-section">
      <h3>§2 Vergütung &amp; Laufzeit</h3>
      <p class="body-text">Die Vergütung für die vereinbarte Leistung beträgt <strong>${escapeHtml(current.feeAmount) || '—'}</strong> zzgl. ggf. anfallender Umsatzsteuer. ${escapeHtml(current.paymentTerms)}</p>
      <p class="body-text">Beginn der Zusammenarbeit: ${fmtDate(current.startDate) || '—'}${current.deliveryDate ? ' · Liefertermin: ' + fmtDate(current.deliveryDate) : ''}</p>
    </div>

    <div class="contract-section">
      <h3>§3 Nutzungsrechte</h3>
      <p class="body-text">${escapeHtml(current.usageRights)}</p>
      <p class="body-text">${current.usageRightsUnlimited !== false
        ? 'Die eingeräumten Nutzungsrechte gelten zeitlich unbegrenzt.'
        : `Die eingeräumten Nutzungsrechte sind befristet${current.usageRightsScope ? ' auf ' + escapeHtml(current.usageRightsScope) : ''} und gültig bis <strong>${fmtDate(current.usageRightsEndDate) || '—'}</strong>.`}</p>
    </div>

    <div class="contract-section">
      <h3>§4 Vertraulichkeit</h3>
      <p class="body-text">${escapeHtml(current.confidentiality)}</p>
    </div>

    <div class="contract-section">
      <h3>§5 Kündigung</h3>
      <p class="body-text">${escapeHtml(current.termination)}</p>
    </div>

    <div class="contract-section">
      <h3>§6 Schlussbestimmungen</h3>
      <p class="body-text">${escapeHtml(current.finalProvisions)}</p>
    </div>

    <div class="doc-sign-row">
      <div class="doc-sign-block">
        <div class="doc-sign-line">Ort, Datum &amp; Unterschrift Auftraggeber:in</div>
      </div>
      <div class="doc-sign-block">
        <div class="doc-sign-line">Ort, Datum &amp; Unterschrift Auftragnehmer:in</div>
      </div>
    </div>

    <div class="doc-footer">
      <span>Diese Vorlage ersetzt keine Rechtsberatung – bei Bedarf bitte anwaltlich prüfen lassen.</span>
    </div>
  `;
}

function saveCurrent() {
  if (!current.clientName) { showToast('Bitte Auftraggeber:in angeben'); return; }
  Store.saveContract(current);
  showToast('Vertrag gespeichert');
  goHome('contracts');
  renderContractList();
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function nl2br(str) { return (str || '').replace(/\n/g, '<br>'); }
