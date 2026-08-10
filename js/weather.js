import { Store } from './store.js';

const WMO = {
  0: ['Klarer Himmel', '☀️'],
  1: ['Meist heiter', '🌤️'],
  2: ['Teilweise bewölkt', '⛅'],
  3: ['Bedeckt', '☁️'],
  45: ['Nebel', '🌫️'],
  48: ['Reifnebel', '🌫️'],
  51: ['Leichter Nieselregen', '🌦️'],
  53: ['Nieselregen', '🌦️'],
  55: ['Starker Nieselregen', '🌧️'],
  61: ['Leichter Regen', '🌦️'],
  63: ['Regen', '🌧️'],
  65: ['Starker Regen', '🌧️'],
  66: ['Gefrierender Regen', '🌧️'],
  67: ['Starker gefrierender Regen', '🌧️'],
  71: ['Leichter Schneefall', '🌨️'],
  73: ['Schneefall', '🌨️'],
  75: ['Starker Schneefall', '❄️'],
  77: ['Schneegriesel', '🌨️'],
  80: ['Leichte Regenschauer', '🌦️'],
  81: ['Regenschauer', '🌧️'],
  82: ['Heftige Regenschauer', '⛈️'],
  85: ['Leichte Schneeschauer', '🌨️'],
  86: ['Starke Schneeschauer', '❄️'],
  95: ['Gewitter', '⛈️'],
  96: ['Gewitter mit Hagel', '⛈️'],
  99: ['Schweres Gewitter mit Hagel', '⛈️']
};

function describe(code) {
  return WMO[code] || ['Wechselhaft', '🌡️'];
}

const dayLabel = (iso, idx) => {
  if (idx === 0) return 'Heute';
  if (idx === 1) return 'Morgen';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short' });
};

async function reverseGeocodeName(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=de`);
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || 'Aktueller Standort';
  } catch {
    return 'Aktueller Standort';
  }
}

export async function searchLocations(query) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=de&format=json`);
  const data = await res.json();
  return (data.results || []).map(r => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude
  }));
}

async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto&forecast_days=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Wetterdaten nicht verfügbar');
  return res.json();
}

function renderDays(daily) {
  const body = document.getElementById('weatherBody');
  body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'weather-days';
  daily.time.forEach((iso, i) => {
    const [label, icon] = describe(daily.weathercode[i]);
    const day = document.createElement('div');
    day.className = 'weather-day';
    day.innerHTML = `
      <span class="wd-label">${dayLabel(iso, i)}</span>
      <span class="wd-icon" title="${label}">${icon}</span>
      <span class="wd-temp"><span class="max">${Math.round(daily.temperature_2m_max[i])}°</span> / <span class="min">${Math.round(daily.temperature_2m_min[i])}°</span></span>
      <span class="wd-rain">☂ ${daily.precipitation_probability_max[i]}%</span>
    `;
    wrap.appendChild(day);
  });
  body.appendChild(wrap);
  const meta = document.createElement('p');
  meta.className = 'weather-meta';
  meta.textContent = `Wind bis ${Math.round(Math.max(...daily.windspeed_10m_max))} km/h · aktualisiert ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  body.appendChild(meta);
}

function renderError(message, showRetry = true) {
  const body = document.getElementById('weatherBody');
  body.innerHTML = `<p class="muted">${message}</p>`;
  if (showRetry) {
    document.getElementById('locationSearch').classList.remove('hidden');
  }
}

async function loadForLocation(loc) {
  document.getElementById('weatherPlace').textContent = `· ${loc.name}`;
  try {
    const data = await fetchForecast(loc.latitude, loc.longitude);
    renderDays(data.daily);
  } catch (e) {
    renderError('Wetterdaten konnten nicht geladen werden. Bitte Ort erneut wählen.');
  }
}

export async function initWeather() {
  const settings = Store.getSettings();
  const searchBox = document.getElementById('locationSearch');
  const input = document.getElementById('locationInput');
  const results = document.getElementById('locationResults');
  const searchBtn = document.getElementById('locationSearchBtn');
  const changeBtn = document.getElementById('changeLocationBtn');

  changeBtn.addEventListener('click', () => searchBox.classList.toggle('hidden'));

  async function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    results.innerHTML = '<div class="muted">Suche…</div>';
    try {
      const locs = await searchLocations(q);
      results.innerHTML = '';
      if (!locs.length) {
        results.innerHTML = '<div class="muted">Keine Treffer</div>';
        return;
      }
      locs.forEach(loc => {
        const row = document.createElement('div');
        row.textContent = loc.name;
        row.addEventListener('click', () => {
          Store.saveSettings({ location: loc });
          results.innerHTML = '';
          searchBox.classList.add('hidden');
          loadForLocation(loc);
        });
        results.appendChild(row);
      });
    } catch {
      results.innerHTML = '<div class="muted">Suche fehlgeschlagen</div>';
    }
  }
  searchBtn.addEventListener('click', doSearch);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

  if (settings.location) {
    return loadForLocation(settings.location);
  }

  if (!navigator.geolocation) {
    renderError('Standort nicht verfügbar. Bitte Ort manuell wählen.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const name = await reverseGeocodeName(latitude, longitude);
      const loc = { name, latitude, longitude };
      Store.saveSettings({ location: loc });
      loadForLocation(loc);
    },
    () => {
      renderError('Standortzugriff nicht erlaubt. Bitte Ort manuell eingeben.');
    },
    { timeout: 8000 }
  );
}
