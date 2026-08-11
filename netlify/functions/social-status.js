const instagram = require('./lib/instagram');
const tiktok = require('./lib/tiktok');
const { getTokens, getLatestSnapshot } = require('./lib/store');

exports.handler = async () => {
  const tokens = await getTokens();
  const snapshot = await getLatestSnapshot();

  const body = {
    instagram: {
      configured: instagram.isConfigured(),
      connected: Boolean(tokens.instagram),
      username: snapshot?.instagram?.username || null
    },
    tiktok: {
      configured: tiktok.isConfigured(),
      connected: Boolean(tokens.tiktok),
      username: snapshot?.tiktok?.username || null
    },
    lastSyncAt: snapshot?.fetchedAt || null
  };

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
};
