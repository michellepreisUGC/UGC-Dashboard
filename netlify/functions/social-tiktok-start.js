const crypto = require('crypto');
const tiktok = require('./lib/tiktok');
const { saveOAuthState } = require('./lib/store');

exports.handler = async () => {
  if (!tiktok.isConfigured()) {
    return { statusCode: 500, body: 'TikTok ist noch nicht konfiguriert (TIKTOK_CLIENT_KEY/SECRET/REDIRECT_URI fehlen als Netlify-Umgebungsvariablen).' };
  }
  const state = crypto.randomBytes(16).toString('hex');
  await saveOAuthState(`tiktok:${state}`, { createdAt: Date.now() });
  return {
    statusCode: 302,
    headers: { Location: tiktok.authorizeUrl(state) }
  };
};
