const tiktok = require('./lib/tiktok');
const { getOAuthState, deleteOAuthState, getTokens, saveTokens } = require('./lib/store');

exports.handler = async (event) => {
  const { code, state, error, error_description } = event.queryStringParameters || {};

  if (error) {
    return redirectHome(`tiktok_error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code || !state) {
    return redirectHome('tiktok_error=missing_code');
  }

  const stored = await getOAuthState(`tiktok:${state}`);
  if (!stored) {
    return redirectHome('tiktok_error=invalid_state');
  }
  await deleteOAuthState(`tiktok:${state}`);

  try {
    const token = await tiktok.exchangeCodeForToken(code);

    const tokens = await getTokens();
    tokens.tiktok = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      openId: token.open_id,
      obtainedAt: Date.now(),
      expiresAt: Date.now() + token.expires_in * 1000
    };
    await saveTokens(tokens);

    return redirectHome('connected=tiktok');
  } catch (e) {
    return redirectHome(`tiktok_error=${encodeURIComponent(String(e.message || e))}`);
  }
};

function redirectHome(query) {
  return { statusCode: 302, headers: { Location: `/?${query}#settings` } };
}
