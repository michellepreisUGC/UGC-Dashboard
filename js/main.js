import { Store } from './store.js';
import { fmtDate, eur } from './util.js';
import { initWeather } from './weather.js';
import { renderSettings } from './settings.js';
import { renderClientsView } from './clients.js';
import { initInvoices, renderInvoiceList, calcTotals } from './invoices.js';
import { initContracts, renderContractList, rightsInfo } from './contracts.js';
import { initFinance, renderFinanceView } from './finance.js';
import { initTrends, renderTrendsView } from './trends.js';
import { CURATED_TRENDS } from './trends-data.js';
import { initSocial, renderAnalyticsView, renderSocialSettingsSection } from './social.js';

const NAV_HIGHLIGHT = { 'invoice-editor': 'invoices', 'contract-editor': 'contracts', 'finance-export': 'finance' };

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
  document.getElementById(`view-${view}`).classList.add('is-active');
  const highlight = NAV_HIGHLIGHT[view] || view;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.view === highlight);
  });
  if (view === 'overview') renderOverview();
  if (view === 'invoices') renderInvoiceList();
  if (view === 'contracts') renderContractList();
  if (view === 'clients') renderClientsView();
  if (view === 'settings') { renderSettings(); renderSocialSettingsSection(); }
  if (view === 'finance') renderFinanceView();
  if (view === 'trends') renderTrendsView();
  if (view === 'analytics') renderAnalyticsView();
}

function currentYearFinance() {
  const year = new Date().getFullYear();
  const yearOf = (d) => Number((d || '').slice(0, 4));

  const incomeFromInvoices = Store.getInvoices()
    .filter(i => i.status === 'paid' && yearOf(i.date) === year)
    .reduce((s, i) => s + calcTotals(i).gross, 0);
  const manualIncome = Store.getIncomeExtra()
    .filter(i => yearOf(i.date) === year)
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const expenses = Store.getExpenses()
    .filter(e => yearOf(e.date) === year)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const income = incomeFromInvoices + manualIncome;
  return { year, income, expenses, profit: income - expenses };
}

function renderOverview() {
  const invoices = Store.getInvoices();
  const contracts = Store.getContracts();
  const clients = Store.getClients();

  const openInvoices = invoices.filter(i => i.status === 'open');
  const openSum = openInvoices.reduce((sum, i) => sum + calcTotals(i).gross, 0);

  document.getElementById('statOpenInvoices').textContent = openInvoices.length;
  document.getElementById('statInvoiceSum').textContent = eur(openSum);
  document.getElementById('statContracts').textContent = contracts.length;
  document.getElementById('statClients').textContent = clients.length;

  const fin = currentYearFinance();
  document.getElementById('overviewFinanceYear').textContent = `· ${fin.year}`;
  document.getElementById('ovFinIncome').textContent = eur(fin.income);
  document.getElementById('ovFinExpenses').textContent = eur(fin.expenses);
  const profitEl = document.getElementById('ovFinProfit');
  profitEl.textContent = eur(fin.profit);
  profitEl.classList.toggle('negative', fin.profit < 0);

  const latestTrend = CURATED_TRENDS.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const trendPreview = document.getElementById('overviewTrendPreview');
  if (latestTrend) {
    trendPreview.innerHTML = `
      <div class="trend-card">
        <div class="trend-card-head">
          <span class="trend-tag">${latestTrend.tag}</span>
          <span class="muted small">${fmtDate(latestTrend.date)}</span>
        </div>
        <h3>${latestTrend.title}</h3>
        <p>${latestTrend.description}</p>
      </div>`;
  } else {
    trendPreview.innerHTML = '<p class="muted small">Noch keine Trends erfasst.</p>';
  }

  const trackedRights = contracts
    .map(c => ({ c, info: rightsInfo(c) }))
    .filter(x => x.info && x.info.status !== 'done')
    .sort((a, b) => a.info.days - b.info.days)
    .slice(0, 3);

  const rightsPreview = document.getElementById('overviewRightsPreview');
  if (!trackedRights.length) {
    rightsPreview.innerHTML = '<p class="muted small">Aktuell keine befristeten Nutzungsrechte hinterlegt.</p>';
  } else {
    rightsPreview.innerHTML = trackedRights.map(({ c, info }) => {
      const pillClass = info.status === 'expired' ? 'status-danger' : info.status === 'soon' ? 'status-open' : 'status-paid';
      const statusText = info.status === 'expired' ? `abgelaufen seit ${Math.abs(info.days)} Tagen` : `läuft in ${info.days} Tagen ab`;
      return `
        <div class="rights-row">
          <div class="rights-row-main">
            <strong>${c.title || 'UGC-Vertrag'}</strong>
            <span class="muted small"> · ${c.clientName || 'ohne Kund:in'}</span>
          </div>
          <span class="status-pill ${pillClass}">${fmtDate(info.endDate)} · ${statusText}</span>
        </div>`;
    }).join('');
  }

  const recent = [
    ...invoices.map(i => ({ type: 'invoice', label: `Rechnung ${i.number} · ${i.clientName || 'ohne Kund:in'}`, updatedAt: i.updatedAt || 0 })),
    ...contracts.map(c => ({ type: 'contract', label: `${c.title} · ${c.clientName || 'ohne Kund:in'}`, updatedAt: c.updatedAt || 0 }))
  ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  const list = document.getElementById('recentList');
  list.innerHTML = '';
  if (!recent.length) {
    list.innerHTML = '<p class="muted small">Noch keine Einträge – lege deine erste Rechnung oder deinen ersten Vertrag an.</p>';
  } else {
    recent.forEach(r => {
      const row = document.createElement('div');
      row.className = 'recent-item';
      row.innerHTML = `<span>${r.label}</span><span class="tag ${r.type}">${r.type === 'invoice' ? 'Rechnung' : 'Vertrag'}</span>`;
      list.appendChild(row);
    });
  }
}

function initNav() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
}

function initTodayLabel() {
  const el = document.getElementById('todayLabel');
  const now = new Date();
  el.textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function boot() {
  initNav();
  initTodayLabel();
  initInvoices(navigate);
  initContracts(navigate);
  initFinance(navigate);
  initTrends();
  initWeather();
  const initialView = initSocial(navigate);
  navigate(initialView || 'overview');
}

document.addEventListener('DOMContentLoaded', boot);
