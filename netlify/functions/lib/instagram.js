const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI;

function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_manage_insights',
    state
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    code
  });
  const res = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body });
  if (!res.ok) throw new Error(`Instagram token exchange fehlgeschlagen: ${await res.text()}`);
  return res.json(); // { access_token, user_id }
}

async function exchangeForLongLivedToken(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: APP_SECRET,
    access_token: shortLivedToken
  });
  const res = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Instagram Long-Lived-Token fehlgeschlagen: ${await res.text()}`);
  return res.json(); // { access_token, token_type, expires_in }
}

async function refreshLongLivedToken(accessToken) {
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: accessToken });
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Instagram Token-Refresh fehlgeschlagen: ${await res.text()}`);
  return res.json(); // { access_token, token_type, expires_in }
}

async function fetchProfile(accessToken) {
  const params = new URLSearchParams({
    fields: 'username,followers_count,media_count',
    access_token: accessToken
  });
  const res = await fetch(`https://graph.instagram.com/v21.0/me?${params.toString()}`);
  if (!res.ok) throw new Error(`Instagram Profil-Abruf fehlgeschlagen: ${await res.text()}`);
  return res.json();
}

async function fetchRecentMedia(accessToken, limit = 10) {
  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
    limit: String(limit),
    access_token: accessToken
  });
  const res = await fetch(`https://graph.instagram.com/v21.0/me/media?${params.toString()}`);
  if (!res.ok) throw new Error(`Instagram Media-Abruf fehlgeschlagen: ${await res.text()}`);
  const data = await res.json();
  return data.data || [];
}

// Insights-Metriken unterscheiden sich je nach Medientyp; wir fragen defensiv ab
// und ignorieren einzelne Fehler, statt den ganzen Sync abzubrechen.
async function fetchMediaInsights(accessToken, mediaId, mediaType) {
  const metrics = mediaType === 'VIDEO' || mediaType === 'REELS'
    ? 'reach,saved,shares,plays'
    : 'reach,saved,shares';
  const params = new URLSearchParams({ metric: metrics, access_token: accessToken });
  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${mediaId}/insights?${params.toString()}`);
    if (!res.ok) return {};
    const data = await res.json();
    const out = {};
    (data.data || []).forEach(m => { out[m.name] = m.values?.[0]?.value ?? m.total_value?.value ?? 0; });
    return out;
  } catch {
    return {};
  }
}

module.exports = {
  authorizeUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  refreshLongLivedToken,
  fetchProfile,
  fetchRecentMedia,
  fetchMediaInsights,
  isConfigured: () => Boolean(APP_ID && APP_SECRET && REDIRECT_URI)
};
