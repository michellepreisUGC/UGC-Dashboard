const instagram = require('./lib/instagram');
const { getOAuthState, deleteOAuthState, getTokens, saveTokens } = require('./lib/store');

exports.handler = async (event) => {
  const { code, state, error, error_description } = event.queryStringParameters || {};

  if (error) {
    return redirectHome(`instagram_error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code || !state) {
    return redirectHome('instagram_error=missing_code');
  }

  const stored = await getOAuthState(`instagram:${state}`);
  if (!stored) {
    return redirectHome('instagram_error=invalid_state');
  }
  await deleteOAuthState(`instagram:${state}`);

  try {
    const shortLived = await instagram.exchangeCodeForToken(code);
    const longLived = await instagram.exchangeForLongLivedToken(shortLived.access_token);

    const tokens = await getTokens();
    tokens.instagram = {
      accessToken: longLived.access_token,
      userId: shortLived.user_id,
      obtainedAt: Date.now(),
      expiresAt: Date.now() + longLived.expires_in * 1000
    };
    await saveTokens(tokens);

    return redirectHome('connected=instagram');
  } catch (e) {
    return redirectHome(`instagram_error=${encodeURIComponent(String(e.message || e))}`);
  }
};

function redirectHome(query) {
  return { statusCode: 302, headers: { Location: `/?${query}#settings` } };
}
