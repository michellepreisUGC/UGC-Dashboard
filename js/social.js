import { showToast, fmtDate, addDays } from './util.js';

let goHome = null;

async function fetchStatus() {
  const res = await fetch('/api/social-status');
  if (!res.ok) throw new Error('status failed');
  return res.json();
}

async function fetchAnalyticsData() {
  const res = await fetch('/api/social-analytics-data');
  if (!res.ok) throw new Error('data failed');
  return res.json();
}

async function disconnectPlatform(platform) {
  await fetch('/api/social-disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform })
  });
}

async function triggerSync() {
  const res = await fetch('/api/social-sync-now', { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const fmtNum = (n) => (Number(n) || 0).toLocaleString('de-DE');
const fmtPct = (n) => `${((Number(n) || 0) * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;

function handleQueryParams() {
  const params = new URLSearchParams(window.location.search);
  let wantsSettings = false;

  if (params.get('connected') === 'instagram') { showToast('Instagram verbunden ✓'); wantsSettings = true; }
  if (params.get('connected') === 'tiktok') { showToast('TikTok verbunden ✓'); wantsSettings = true; }
  if (params.get('instagram_error')) { showToast(`Instagram-Verbindung fehlgeschlagen: ${params.get('instagram_error')}`); wantsSettings = true; }
  if (params.get('tiktok_error')) { showToast(`TikTok-Verbindung fehlgeschlagen: ${params.get('tiktok_error')}`); wantsSettings = true; }

  if (wantsSettings) {
    window.history.replaceState({}, '', window.location.pathname);
    return 'settings';
  }
  return null;
}

// Gibt die View zurück, zu der beim Start navigiert werden soll (z. B. nach
// einem OAuth-Redirect zurück auf "settings"), oder null für den Normalfall.
export function initSocial(navigate) {
  goHome = navigate;
  const syncBtn = document.getElementById('analyticsSyncBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      syncBtn.textContent = 'Aktualisiere …';
      try {
        await triggerSync();
        showToast('Analytics aktualisiert');
        await renderAnalyticsView();
      } catch (e) {
        showToast('Aktualisierung fehlgeschlagen – Verbindung/Zugangsdaten prüfen');
      } finally {
        syncBtn.disabled = false;
        syncBtn.textContent = '↻ Jetzt aktualisieren';
      }
    });
  }
  return handleQueryParams();
}

function platformRow(key, label, info) {
  if (!info.configured) {
    return `
      <div class="social-connect-item">
        <span class="social-platform-label">${label}</span>
        <span class="muted small">Noch nicht konfiguriert – App-Zugangsdaten fehlen (siehe README).</span>
      </div>`;
  }
  if (info.connected) {
    return `
      <div class="social-connect-item">
        <span class="social-platform-label">${label}</span>
        <span class="status-pill status-paid">✓ Verbunden${info.username ? ' als @' + info.username : ''}</span>
        <button class="btn-ghost small" data-disconnect="${key}">Trennen</button>
      </div>`;
  }
  return `
    <div class="social-connect-item">
      <span class="social-platform-label">${label}</span>
      <button class="btn-primary small" data-connect="${key}">Verbinden</button>
    </div>`;
}

export async function renderSocialSettingsSection() {
  const card = document.getElementById('socialConnectCard');
  if (!card) return;
  card.innerHTML = '<p class="muted small">Lade Verbindungsstatus …</p>';

  let status;
  try {
    status = await fetchStatus();
  } catch {
    card.innerHTML = '<div class="card-head"><h2>Social Media verbinden</h2></div><p class="muted small">Status konnte nicht geladen werden.</p>';
    return;
  }

  card.innerHTML = `
    <div class="card-head"><h2>Social Media verbinden</h2></div>
    <p class="field-hint" style="margin-bottom:14px;">Für automatische Follower- &amp; Beitrags-Analytics, täglich ca. 8 Uhr aktualisiert. Setup-Anleitung siehe README.</p>
    ${platformRow('instagram', 'Instagram', status.instagram)}
    ${platformRow('tiktok', 'TikTok', status.tiktok)}
  `;

  card.querySelectorAll('[data-connect]').forEach(btn => {
    btn.addEventListener('click', () => { window.location.href = `/api/social-${btn.dataset.connect}-start`; });
  });
  card.querySelectorAll('[data-disconnect]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await disconnectPlatform(btn.dataset.disconnect);
      showToast('Verbindung getrennt');
      renderSocialSettingsSection();
    });
  });
}

function sparklineSvg(history, key, colorVar) {
  const points = history.filter(h => h[key] != null);
  if (points.length < 2) return '';
  const values = points.map(p => p[key]);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const w = 200, h = 44;
  const stepX = w / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * stepX;
    const y = h - 4 - ((p[key] - min) / range) * (h - 8);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="trend-sparkline"><path d="${path}" fill="none" stroke="${colorVar}" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
}

function followerDelta(history, key) {
  if (!history || history.length < 2) return null;
  const sorted = history.filter(h => h[key] != null).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const latest = sorted[sorted.length - 1];
  const targetDate = addDays(latest.date, -7);
  let past = null;
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i].date <= targetDate) { past = sorted[i]; break; }
  }
  if (!past) past = sorted[0];
  if (past === latest) return null;
  return { delta: latest[key] - past[key], fromDate: past.date };
}

const POSTS_PREVIEW_COUNT = 6;

function postCard(post) {
  const thumb = post.thumbnail
    ? `<div class="social-post-thumb" style="background-image:url('${post.thumbnail}')"></div>`
    : `<div class="social-post-thumb social-post-thumb-empty">${post.platform === 'instagram' ? '📷' : '🎵'}</div>`;
  const secondaryMetric = post.platform === 'instagram'
    ? `${fmtNum(post.reach)} Reichweite`
    : `${fmtNum(post.views)} Aufrufe`;
  return `
    <a class="social-post-card" href="${post.url || '#'}" target="_blank" rel="noopener">
      ${thumb}
      <div class="social-post-body">
        <p class="social-post-caption">${post.caption ? escapeHtml(post.caption) : '(ohne Bildunterschrift)'}</p>
        <div class="social-post-footer">
          <span class="social-post-metrics">${fmtNum(post.likes)} Likes · ${fmtNum(post.comments)} Kommentare · ${secondaryMetric}</span>
          <span class="social-post-rate">${fmtPct(post.engagementRate)}</span>
        </div>
      </div>
    </a>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function deltaBadge(delta) {
  if (!delta) return `<span class="social-delta-badge">± 0 <span class="muted">/ 7 Tage</span></span>`;
  const cls = delta.delta > 0 ? 'positive' : delta.delta < 0 ? 'negative' : '';
  const sign = delta.delta > 0 ? '+' : '';
  return `<span class="social-delta-badge ${cls}">${sign}${fmtNum(delta.delta)} <span class="muted">/ seit ${fmtDate(delta.fromDate)}</span></span>`;
}

function platformCard(platformKey, label, colorVar, platformData, history, historyKey, expanded) {
  if (!platformData) return '';
  if (platformData.error) {
    return `
      <div class="card social-platform-card">
        <div class="card-head"><h2>${label}</h2></div>
        <p class="muted small">Letzter Sync fehlgeschlagen: ${escapeHtml(platformData.error)}</p>
      </div>`;
  }

  const delta = followerDelta(history, historyKey);
  const posts = platformData.posts || [];
  const avgEngagement = posts.length ? posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length : 0;
  const spark = sparklineSvg(history, historyKey, colorVar);
  const visiblePosts = expanded ? posts : posts.slice(0, POSTS_PREVIEW_COUNT);
  const hasMore = posts.length > POSTS_PREVIEW_COUNT;

  return `
    <div class="card social-platform-card">
      <div class="card-head">
        <h2>${label}</h2>
        <span class="muted small">${platformData.username ? '@' + platformData.username : ''}</span>
      </div>
      <div class="social-header-row">
        <div class="social-follower-block">
          <span class="social-follower-count">${fmtNum(platformData.followers)}</span>
          <span class="social-follower-label">Follower</span>
        </div>
        ${spark ? `<div class="social-sparkline-inline">${spark}</div>` : '<div class="social-sparkline-inline"></div>'}
        ${deltaBadge(delta)}
      </div>
      <p class="social-secondary-stats">Ø Interaktionsrate: <strong>${fmtPct(avgEngagement)}</strong></p>
      <h3 class="section-title small-title">Letzte Beiträge</h3>
      <div class="social-posts-grid">
        ${visiblePosts.length ? visiblePosts.map(postCard).join('') : '<p class="muted small">Noch keine Beitragsdaten.</p>'}
      </div>
      ${hasMore ? `<button class="btn-ghost small social-show-more" data-expand-toggle="${platformKey}">${expanded ? 'Weniger anzeigen' : `Alle ${posts.length} Beiträge anzeigen`}</button>` : ''}
    </div>`;
}

let lastStatus = null;
let lastData = null;
const expandedPlatforms = new Set();

function renderCards() {
  const body = document.getElementById('analyticsBody');
  const cards = [];
  if (lastStatus.instagram.connected) {
    cards.push(platformCard('instagram', 'Instagram', 'var(--rose-dark)', lastData.snapshot.instagram, lastData.history, 'instagramFollowers', expandedPlatforms.has('instagram')));
  }
  if (lastStatus.tiktok.connected) {
    cards.push(platformCard('tiktok', 'TikTok', 'var(--gold)', lastData.snapshot.tiktok, lastData.history, 'tiktokFollowers', expandedPlatforms.has('tiktok')));
  }
  body.innerHTML = `<div class="social-analytics-grid">${cards.join('')}</div>`;

  body.querySelectorAll('[data-expand-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.expandToggle;
      if (expandedPlatforms.has(key)) expandedPlatforms.delete(key); else expandedPlatforms.add(key);
      renderCards();
    });
  });
}

export async function renderAnalyticsView() {
  const body = document.getElementById('analyticsBody');
  const updatedLabel = document.getElementById('analyticsUpdatedLabel');
  body.innerHTML = '<p class="muted">Lade Analytics-Daten …</p>';

  let status;
  try {
    status = await fetchStatus();
  } catch {
    body.innerHTML = '<p class="muted">Analytics-Status konnte nicht geladen werden.</p>';
    return;
  }

  if (!status.instagram.connected && !status.tiktok.connected) {
    updatedLabel.textContent = 'Instagram & TikTok auf einen Blick';
    body.innerHTML = `
      <div class="card social-empty-state">
        <p class="social-empty-icon">⬈</p>
        <h3>Noch nichts verbunden</h3>
        <p class="muted">Verbinde Instagram und/oder TikTok in den Firmendaten, um automatische Analytics zu sehen.</p>
        <button class="btn-primary" id="analyticsGoSettingsBtn">Zu den Firmendaten ↗</button>
      </div>`;
    document.getElementById('analyticsGoSettingsBtn').addEventListener('click', () => goHome('settings'));
    return;
  }

  let data;
  try {
    data = await fetchAnalyticsData();
  } catch {
    body.innerHTML = '<p class="muted">Analytics-Daten konnten nicht geladen werden.</p>';
    return;
  }

  if (!data.snapshot) {
    updatedLabel.textContent = 'Noch kein Sync gelaufen';
    body.innerHTML = `
      <div class="card social-empty-state">
        <p class="social-empty-icon">⬈</p>
        <h3>Verbunden, aber noch keine Daten</h3>
        <p class="muted">Klicke oben auf „Jetzt aktualisieren“, um den ersten Sync anzustoßen – danach läuft er automatisch täglich um ca. 8 Uhr.</p>
      </div>`;
    return;
  }

  updatedLabel.textContent = `Letzter Sync: ${new Date(data.snapshot.fetchedAt).toLocaleString('de-DE')}`;
  lastStatus = status;
  lastData = data;
  renderCards();
}

export async function renderOverviewSocialPreview() {
  const container = document.getElementById('overviewSocialPreview');
  if (!container) return;

  let status;
  try {
    status = await fetchStatus();
  } catch {
    container.innerHTML = '<p class="muted small">Status konnte nicht geladen werden.</p>';
    return;
  }

  if (!status.instagram.connected && !status.tiktok.connected) {
    container.innerHTML = '<p class="muted small">Noch nicht verbunden – siehe Firmendaten.</p>';
    return;
  }

  let data;
  try {
    data = await fetchAnalyticsData();
  } catch {
    container.innerHTML = '<p class="muted small">Daten konnten nicht geladen werden.</p>';
    return;
  }

  if (!data.snapshot) {
    container.innerHTML = '<p class="muted small">Noch kein Sync gelaufen.</p>';
    return;
  }

  const rows = [];
  if (status.instagram.connected && data.snapshot.instagram) {
    rows.push(overviewSocialRow('Instagram', data.snapshot.instagram, data.history, 'instagramFollowers'));
  }
  if (status.tiktok.connected && data.snapshot.tiktok) {
    rows.push(overviewSocialRow('TikTok', data.snapshot.tiktok, data.history, 'tiktokFollowers'));
  }
  container.innerHTML = rows.join('') || '<p class="muted small">Noch keine Daten.</p>';
}

function overviewSocialRow(label, platformData, history, historyKey) {
  const delta = followerDelta(history, historyKey);
  return `
    <div class="social-mini-row">
      <span class="social-mini-label">${label}${platformData.username ? ' · @' + platformData.username : ''}</span>
      <span class="social-mini-followers">${fmtNum(platformData.followers)}</span>
      ${deltaBadge(delta)}
    </div>`;
}
