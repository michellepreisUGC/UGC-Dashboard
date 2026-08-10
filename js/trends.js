import { Store } from './store.js';
import { uid, fmtDate, todayISO, el, showToast, openModal, closeModal } from './util.js';
import { CURATED_TRENDS, TRENDS_LAST_UPDATED } from './trends-data.js';

const QUICK_LINKS = [
  { label: 'TikTok Creative Center · Trends', url: 'https://ads.tiktok.com/business/creativecenter/trends/home' },
  { label: 'TikTok Discover', url: 'https://www.tiktok.com/discover' },
  { label: 'Google Trends', url: 'https://trends.google.com/trends/' }
];

export function initTrends() {
  document.getElementById('newTrendNoteBtn').addEventListener('click', () => openTrendNoteModal());

  const links = document.getElementById('trendQuickLinks');
  links.innerHTML = '';
  QUICK_LINKS.forEach(l => {
    const a = document.createElement('a');
    a.href = l.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'btn-ghost small trend-link';
    a.textContent = `${l.label} ↗`;
    links.appendChild(a);
  });
}

function daysSince(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function renderTrendsView() {
  document.getElementById('trendsUpdatedLabel').textContent = `Kuratierte Liste – Stand ${fmtDate(TRENDS_LAST_UPDATED)}`;

  const stale = daysSince(TRENDS_LAST_UPDATED) > 9;
  document.getElementById('trendsStaleHint').classList.toggle('hidden', !stale);

  const curatedList = document.getElementById('curatedTrendsList');
  curatedList.innerHTML = '';
  CURATED_TRENDS.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(t => {
    const card = document.createElement('div');
    card.className = 'trend-card';
    card.innerHTML = `
      <div class="trend-card-head">
        <span class="trend-tag">${t.tag}</span>
        <span class="muted small">${fmtDate(t.date)}</span>
      </div>
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.description)}</p>
      ${t.source ? `<a href="${t.source}" target="_blank" rel="noopener noreferrer" class="trend-source">Quelle ↗</a>` : ''}
    `;
    curatedList.appendChild(card);
  });

  const notes = Store.getTrendNotes();
  const notesList = document.getElementById('trendNotesList');
  notesList.innerHTML = '';
  document.getElementById('trendNotesEmptyState').classList.toggle('hidden', notes.length > 0);
  notes.forEach(n => {
    const card = document.createElement('div');
    card.className = 'trend-card trend-card-manual';
    card.innerHTML = `
      <div class="trend-card-head">
        <span class="trend-tag manual">Eigene Notiz</span>
        <span class="muted small">${fmtDate(n.date)}</span>
      </div>
      <h3>${escapeHtml(n.title)}</h3>
      <p>${escapeHtml(n.note)}</p>
      ${n.link ? `<a href="${escapeAttr(n.link)}" target="_blank" rel="noopener noreferrer" class="trend-source">Link ↗</a>` : ''}
    `;
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn trend-delete';
    delBtn.title = 'Löschen';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      Store.deleteTrendNote(n.id);
      renderTrendsView();
      showToast('Notiz gelöscht');
    });
    card.appendChild(delBtn);
    notesList.appendChild(card);
  });
}

function openTrendNoteModal() {
  const box = el('div', {}, [
    el('h3', {}, 'Neue Trend-Notiz'),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [ el('label', {}, 'Titel'), el('input', { id: 'tn-title', placeholder: 'z. B. Neuer Transition-Sound' }) ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field' }, [ el('label', {}, 'Datum'), el('input', { type: 'date', id: 'tn-date', value: todayISO() }) ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [ el('label', {}, 'Notiz'), el('textarea', { id: 'tn-note', placeholder: 'Was macht den Trend aus, wie ließe er sich für ein Kundenprodukt nutzen?' }) ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [ el('label', {}, 'Link (optional)'), el('input', { id: 'tn-link', placeholder: 'https://www.tiktok.com/@...' }) ])
    ]),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn-ghost', onclick: closeModal }, 'Abbrechen'),
      el('button', {
        class: 'btn-primary', onclick: () => {
          const title = document.getElementById('tn-title').value.trim();
          if (!title) { showToast('Bitte einen Titel angeben'); return; }
          Store.saveTrendNote({
            id: uid(),
            title,
            date: document.getElementById('tn-date').value,
            note: document.getElementById('tn-note').value.trim(),
            link: document.getElementById('tn-link').value.trim()
          });
          closeModal();
          renderTrendsView();
          showToast('Trend-Notiz gespeichert');
        }
      }, 'Speichern')
    ])
  ]);
  openModal(box);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }
