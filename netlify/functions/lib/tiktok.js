const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'user.info.basic,user.info.stats,video.list',
    state
  });
  return `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI
  });
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body
  });
  if (!res.ok) throw new Error(`TikTok Token-Austausch fehlgeschlagen: ${await res.text()}`);
  return res.json(); // { access_token, refresh_token, expires_in, open_id, ... }
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body
  });
  if (!res.ok) throw new Error(`TikTok Token-Refresh fehlgeschlagen: ${await res.text()}`);
  return res.json();
}

async function fetchProfile(accessToken) {
  const params = new URLSearchParams({ fields: 'display_name,follower_count,likes_count,video_count,avatar_url' });
  const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`TikTok Profil-Abruf fehlgeschlagen: ${await res.text()}`);
  const data = await res.json();
  return data.data?.user || {};
}

async function fetchRecentVideos(accessToken, maxCount = 10) {
  const params = new URLSearchParams({
    fields: 'id,title,cover_image_url,share_url,view_count,like_count,comment_count,share_count,create_time'
  });
  const res = await fetch(`https://open.tiktokapis.com/v2/video/list/?${params.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_count: maxCount })
  });
  if (!res.ok) throw new Error(`TikTok Video-Abruf fehlgeschlagen: ${await res.text()}`);
  const data = await res.json();
  return data.data?.videos || [];
}

module.exports = {
  authorizeUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  fetchProfile,
  fetchRecentVideos,
  isConfigured: () => Boolean(CLIENT_KEY && CLIENT_SECRET && REDIRECT_URI)
};
