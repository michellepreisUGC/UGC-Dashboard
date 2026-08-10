import { Store } from './store.js';
import { showToast } from './util.js';

function field(label, id, value, opts = {}) {
  const { type = 'text', hint = '', full = false, placeholder = '' } = opts;
  return `
    <div class="form-field ${full ? 'full' : ''}">
      <label for="${id}">${label}</label>
      <input type="${type}" id="${id}" value="${value ?? ''}" placeholder="${placeholder}">
      ${hint ? `<span class="field-hint">${hint}</span>` : ''}
    </div>`;
}

export function renderSettings() {
  const s = Store.getSettings();
  const form = document.getElementById('settingsForm');
  form.innerHTML = `
    <div class="form-section">
      <h3>Firma</h3>
      <div class="form-row">
        ${field('Firmenname / Künstlername', 'st-companyName', s.companyName, { full: true, placeholder: 'z. B. Studio Lumière' })}
      </div>
      <div class="form-row">
        ${field('Inhaber:in', 'st-ownerName', s.ownerName)}
      </div>
      <div class="form-row">
        ${field('Straße &amp; Hausnummer', 'st-street', s.street)}
      </div>
      <div class="form-row">
        ${field('PLZ', 'st-zip', s.zip)}
        ${field('Ort', 'st-city', s.city)}
      </div>
      <div class="form-row">
        ${field('E-Mail', 'st-email', s.email, { type: 'email' })}
        ${field('Telefon', 'st-phone', s.phone)}
        ${field('Website', 'st-website', s.website)}
      </div>
      <div class="form-row">
        <div class="form-field full">
          <label for="st-logo">Logo (optional)</label>
          <input type="file" id="st-logo" accept="image/*">
          <span class="field-hint">${s.logo ? 'Logo hinterlegt · neue Datei wählen zum Ersetzen' : 'Wird oben auf Rechnungen &amp; Verträgen angezeigt'}</span>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h3>Steuerliche Angaben</h3>
      <div class="form-row">
        ${field('Steuernummer', 'st-taxId', s.taxId)}
        ${field('USt-IdNr.', 'st-vatId', s.vatId)}
      </div>
      <div class="form-row">
        <label class="checkbox-field">
          <input type="checkbox" id="st-kleinunternehmer" ${s.kleinunternehmer ? 'checked' : ''}>
          Kleinunternehmerregelung nach §19 UStG (keine Umsatzsteuer ausweisen)
        </label>
      </div>
    </div>

    <div class="form-section">
      <h3>Bankverbindung</h3>
      <div class="form-row">
        ${field('IBAN', 'st-iban', s.iban)}
        ${field('BIC', 'st-bic', s.bic)}
        ${field('Bank', 'st-bankName', s.bankName)}
      </div>
    </div>

    <div class="form-section">
      <h3>Rechnungseinstellungen</h3>
      <div class="form-row">
        ${field('Präfix Rechnungsnummer', 'st-invoicePrefix', s.invoicePrefix)}
        ${field('Nächste laufende Nummer', 'st-nextInvoiceNumber', s.nextInvoiceNumber, { type: 'number' })}
        ${field('Standard-Zahlungsziel (Tage)', 'st-paymentTermsDays', s.paymentTermsDays, { type: 'number' })}
      </div>
      <div class="form-row">
        <div class="form-field full">
          <label for="st-defaultInvoiceNotes">Standard-Hinweistext auf Rechnungen</label>
          <textarea id="st-defaultInvoiceNotes">${s.defaultInvoiceNotes || ''}</textarea>
        </div>
      </div>
    </div>
  `;

  let pendingLogo = s.logo;
  document.getElementById('st-logo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { pendingLogo = reader.result; };
    reader.readAsDataURL(file);
  });

  document.getElementById('settingsSaveBtn').onclick = () => {
    Store.saveSettings({
      companyName: document.getElementById('st-companyName').value.trim(),
      ownerName: document.getElementById('st-ownerName').value.trim(),
      street: document.getElementById('st-street').value.trim(),
      zip: document.getElementById('st-zip').value.trim(),
      city: document.getElementById('st-city').value.trim(),
      email: document.getElementById('st-email').value.trim(),
      phone: document.getElementById('st-phone').value.trim(),
      website: document.getElementById('st-website').value.trim(),
      logo: pendingLogo,
      taxId: document.getElementById('st-taxId').value.trim(),
      vatId: document.getElementById('st-vatId').value.trim(),
      kleinunternehmer: document.getElementById('st-kleinunternehmer').checked,
      iban: document.getElementById('st-iban').value.trim(),
      bic: document.getElementById('st-bic').value.trim(),
      bankName: document.getElementById('st-bankName').value.trim(),
      invoicePrefix: document.getElementById('st-invoicePrefix').value.trim(),
      nextInvoiceNumber: Number(document.getElementById('st-nextInvoiceNumber').value) || 1,
      paymentTermsDays: Number(document.getElementById('st-paymentTermsDays').value) || 14,
      defaultInvoiceNotes: document.getElementById('st-defaultInvoiceNotes').value
    });
    showToast('Firmendaten gespeichert');
    renderSettings();
  };
}
