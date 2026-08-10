const KEY = 'atelier_dashboard_v1';

const DEFAULT_SETTINGS = {
  companyName: '',
  ownerName: '',
  street: '',
  zip: '',
  city: '',
  taxId: '',        // Steuernummer
  vatId: '',         // USt-IdNr.
  kleinunternehmer: false,
  iban: '',
  bic: '',
  bankName: '',
  email: '',
  phone: '',
  website: '',
  logo: '',           // data URL
  invoicePrefix: 'RE-',
  nextInvoiceNumber: 1,
  paymentTermsDays: 14,
  defaultInvoiceNotes: 'Vielen Dank für die gute Zusammenarbeit!',
  location: null       // { name, latitude, longitude }
};

const DEFAULT_DATA = {
  settings: DEFAULT_SETTINGS,
  clients: [],
  invoices: [],
  contracts: [],
  expenses: [],
  incomeExtra: [],
  trendNotes: []
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      clients: parsed.clients || [],
      invoices: parsed.invoices || [],
      contracts: parsed.contracts || [],
      expenses: parsed.expenses || [],
      incomeExtra: parsed.incomeExtra || [],
      trendNotes: parsed.trendNotes || []
    };
  } catch (e) {
    console.error('Konnte gespeicherte Daten nicht laden', e);
    return structuredClone(DEFAULT_DATA);
  }
}

let state = load();

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export const Store = {
  get() { return state; },

  getSettings() { return state.settings; },
  saveSettings(patch) {
    state.settings = { ...state.settings, ...patch };
    persist();
  },

  getClients() { return state.clients; },
  getClient(id) { return state.clients.find(c => c.id === id); },
  saveClient(client) {
    const idx = state.clients.findIndex(c => c.id === client.id);
    if (idx >= 0) state.clients[idx] = client; else state.clients.push(client);
    persist();
  },
  deleteClient(id) {
    state.clients = state.clients.filter(c => c.id !== id);
    persist();
  },

  getInvoices() { return state.invoices.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
  getInvoice(id) { return state.invoices.find(i => i.id === id); },
  saveInvoice(invoice) {
    const idx = state.invoices.findIndex(i => i.id === invoice.id);
    invoice.updatedAt = Date.now();
    if (idx >= 0) state.invoices[idx] = invoice; else state.invoices.push(invoice);
    persist();
  },
  deleteInvoice(id) {
    state.invoices = state.invoices.filter(i => i.id !== id);
    persist();
  },

  getContracts() { return state.contracts.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
  getContract(id) { return state.contracts.find(c => c.id === id); },
  saveContract(contract) {
    const idx = state.contracts.findIndex(c => c.id === contract.id);
    contract.updatedAt = Date.now();
    if (idx >= 0) state.contracts[idx] = contract; else state.contracts.push(contract);
    persist();
  },
  deleteContract(id) {
    state.contracts = state.contracts.filter(c => c.id !== id);
    persist();
  },

  getExpenses() { return state.expenses.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
  saveExpense(expense) {
    const idx = state.expenses.findIndex(e => e.id === expense.id);
    if (idx >= 0) state.expenses[idx] = expense; else state.expenses.push(expense);
    persist();
  },
  deleteExpense(id) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    persist();
  },

  getIncomeExtra() { return state.incomeExtra.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
  saveIncomeExtra(income) {
    const idx = state.incomeExtra.findIndex(i => i.id === income.id);
    if (idx >= 0) state.incomeExtra[idx] = income; else state.incomeExtra.push(income);
    persist();
  },
  deleteIncomeExtra(id) {
    state.incomeExtra = state.incomeExtra.filter(i => i.id !== id);
    persist();
  },

  getTrendNotes() { return state.trendNotes.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')); },
  saveTrendNote(note) {
    const idx = state.trendNotes.findIndex(n => n.id === note.id);
    if (idx >= 0) state.trendNotes[idx] = note; else state.trendNotes.push(note);
    persist();
  },
  deleteTrendNote(id) {
    state.trendNotes = state.trendNotes.filter(n => n.id !== id);
    persist();
  }
};
