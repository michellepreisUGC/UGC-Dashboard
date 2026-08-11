const crypto = require('crypto');
const instagram = require('./lib/instagram');
const { saveOAuthState } = require('./lib/store');

exports.handler = async () => {
  if (!instagram.isConfigured()) {
    return { statusCode: 500, body: 'Instagram ist noch nicht konfiguriert (INSTAGRAM_APP_ID/SECRET/REDIRECT_URI fehlen als Netlify-Umgebungsvariablen).' };
  }
  const state = crypto.randomBytes(16).toString('hex');
  await saveOAuthState(`instagram:${state}`, { createdAt: Date.now() });
  return {
    statusCode: 302,
    headers: { Location: instagram.authorizeUrl(state) }
  };
};
