const { runSync } = require('./lib/sync');

function isEightAmInBerlin() {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: '2-digit', hour12: false }).format(new Date());
  return Number(hour) === 8;
}

// Wird stündlich von Netlify aufgerufen (siehe netlify.toml), führt den echten
// Sync aber nur einmal täglich aus, sobald es in Berlin 8 Uhr ist – so bleibt es
// unabhängig von Sommer-/Winterzeit exakt bei der gewünschten lokalen Uhrzeit.
exports.handler = async (event) => {
  const force = event?.queryStringParameters?.force === '1';
  if (!force && !isEightAmInBerlin()) {
    return { statusCode: 200, body: 'skipped (not 8am Europe/Berlin)' };
  }
  try {
    await runSync();
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: String(e.message || e) };
  }
};
