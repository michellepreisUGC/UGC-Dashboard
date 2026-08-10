import { Store } from './store.js';
import { uid, el, showToast, openModal, closeModal } from './util.js';

export function renderClientsView() {
  const tbody = document.getElementById('clientTableBody');
  const empty = document.getElementById('clientEmptyState');
  const clients = Store.getClients();
  tbody.innerHTML = '';
  empty.classList.toggle('hidden', clients.length > 0);

  clients.forEach(c => {
    const tr = el('tr', {}, [
      el('td', {}, c.name || '—'),
      el('td', {}, c.company || '—'),
      el('td', {}, [c.zip, c.city].filter(Boolean).join(' ') || '—'),
      el('td', {}, c.email || '—'),
      el('td', {}, el('div', { class: 'row-actions' }, [
        el('button', { class: 'icon-btn', title: 'Bearbeiten', onclick: () => openClientModal(c) }, '✎'),
        el('button', { class: 'icon-btn', title: 'Löschen', onclick: () => removeClient(c) }, '✕')
      ]))
    ]);
    tbody.appendChild(tr);
  });
}

function removeClient(c) {
  if (!confirm(`"${c.name}" wirklich löschen?`)) return;
  Store.deleteClient(c.id);
  renderClientsView();
  showToast('Kund:in gelöscht');
}

export function openClientModal(existing = null) {
  const c = existing || { id: uid(), name: '', company: '', street: '', zip: '', city: '', email: '' };
  const box = el('div', {}, [
    el('h3', {}, existing ? 'Kund:in bearbeiten' : 'Neue Kundin/Kunde'),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [
        el('label', {}, 'Name'),
        el('input', { id: 'cl-name', value: c.name })
      ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [
        el('label', {}, 'Firma (optional)'),
        el('input', { id: 'cl-company', value: c.company })
      ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [
        el('label', {}, 'Straße &amp; Hausnummer'),
        el('input', { id: 'cl-street', value: c.street })
      ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field' }, [ el('label', {}, 'PLZ'), el('input', { id: 'cl-zip', value: c.zip }) ]),
      el('div', { class: 'form-field' }, [ el('label', {}, 'Ort'), el('input', { id: 'cl-city', value: c.city }) ])
    ]),
    el('div', { class: 'form-row' }, [
      el('div', { class: 'form-field full' }, [
        el('label', {}, 'E-Mail'),
        el('input', { id: 'cl-email', type: 'email', value: c.email })
      ])
    ]),
    el('div', { class: 'modal-actions' }, [
      el('button', { class: 'btn-ghost', onclick: closeModal }, 'Abbrechen'),
      el('button', {
        class: 'btn-primary', onclick: () => {
          const name = document.getElementById('cl-name').value.trim();
          if (!name) { showToast('Bitte einen Namen angeben'); return; }
          Store.saveClient({
            id: c.id,
            name,
            company: document.getElementById('cl-company').value.trim(),
            street: document.getElementById('cl-street').value.trim(),
            zip: document.getElementById('cl-zip').value.trim(),
            city: document.getElementById('cl-city').value.trim(),
            email: document.getElementById('cl-email').value.trim()
          });
          closeModal();
          renderClientsView();
          document.dispatchEvent(new CustomEvent('client-saved'));
          showToast('Kund:in gespeichert');
        }
      }, 'Speichern')
    ])
  ]);
  openModal(box);
}
