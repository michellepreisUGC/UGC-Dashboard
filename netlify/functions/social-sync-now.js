const { runSync } = require('./lib/sync');

// Manueller Sync-Trigger (Button "Jetzt aktualisieren" im Dashboard),
// nutzt dieselbe Sync-Logik wie der tägliche Scheduled-Job.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { snapshot, errors } = await runSync();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ snapshot, errors }) };
  } catch (e) {
    return { statusCode: 500, body: String(e.message || e) };
  }
};
