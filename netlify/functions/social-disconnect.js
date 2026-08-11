const { getTokens, saveTokens } = require('./lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let platform;
  try {
    ({ platform } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: 'Ungültiger Request-Body' };
  }
  if (platform !== 'instagram' && platform !== 'tiktok') {
    return { statusCode: 400, body: 'Unbekannte Plattform' };
  }

  const tokens = await getTokens();
  delete tokens[platform];
  await saveTokens(tokens);

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};
