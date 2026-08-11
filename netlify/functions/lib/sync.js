const instagram = require('./instagram');
const tiktok = require('./tiktok');
const {
  getTokens, saveTokens, getLatestSnapshot, saveLatestSnapshot, getHistory, saveHistory
} = require('./store');

const HISTORY_LIMIT = 180; // ~ ein halbes Jahr täglicher Einträge

function engagementRate(interactions, followers) {
  if (!followers) return 0;
  return interactions / followers;
}

async function syncInstagram(tokens) {
  let token = tokens.instagram;
  if (!token) return null;

  // Long-Lived-Token läuft nach 60 Tagen ab; ab 10 Tage vorher auffrischen.
  const daysLeft = (token.expiresAt - Date.now()) / 86400000;
  if (daysLeft < 10) {
    const refreshed = await instagram.refreshLongLivedToken(token.accessToken);
    token = {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000
    };
  }

  const profile = await instagram.fetchProfile(token.accessToken);
  const media = await instagram.fetchRecentMedia(token.accessToken, 10);

  const posts = [];
  for (const m of media) {
    const insights = await instagram.fetchMediaInsights(token.accessToken, m.id, m.media_type);
    const likes = m.like_count || 0;
    const comments = m.comments_count || 0;
    const shares = insights.shares || 0;
    const reach = insights.reach || 0;
    posts.push({
      id: m.id,
      platform: 'instagram',
      type: m.media_type,
      caption: (m.caption || '').slice(0, 140),
      thumbnail: m.thumbnail_url || m.media_url,
      url: m.permalink,
      postedAt: m.timestamp,
      likes,
      comments,
      shares,
      saved: insights.saved || 0,
      reach,
      plays: insights.plays || 0,
      engagementRate: engagementRate(likes + comments + shares, profile.followers_count)
    });
  }

  return {
    token,
    result: {
      connected: true,
      username: profile.username,
      followers: profile.followers_count || 0,
      mediaCount: profile.media_count || 0,
      posts
    }
  };
}

async function syncTiktok(tokens) {
  let token = tokens.tiktok;
  if (!token) return null;

  // Access-Token gilt nur 24h – vor jedem Sync auffrischen.
  const refreshed = await tiktok.refreshAccessToken(token.refreshToken);
  token = {
    ...token,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || token.refreshToken,
    expiresAt: Date.now() + refreshed.expires_in * 1000
  };

  const profile = await tiktok.fetchProfile(token.accessToken);
  const videos = await tiktok.fetchRecentVideos(token.accessToken, 10);

  const posts = videos.map(v => {
    const likes = v.like_count || 0;
    const comments = v.comment_count || 0;
    const shares = v.share_count || 0;
    return {
      id: v.id,
      platform: 'tiktok',
      type: 'VIDEO',
      caption: (v.title || '').slice(0, 140),
      thumbnail: v.cover_image_url,
      url: v.share_url,
      postedAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
      likes,
      comments,
      shares,
      views: v.view_count || 0,
      engagementRate: engagementRate(likes + comments + shares, profile.follower_count)
    };
  });

  return {
    token,
    result: {
      connected: true,
      username: profile.display_name,
      followers: profile.follower_count || 0,
      likesTotal: profile.likes_count || 0,
      videoCount: profile.video_count || 0,
      posts
    }
  };
}

function bestPost(posts) {
  if (!posts.length) return null;
  return posts.slice().sort((a, b) => b.engagementRate - a.engagementRate)[0];
}

async function runSync() {
  const tokens = await getTokens();
  const nextTokens = { ...tokens };
  const errors = {};

  let instagramResult = { connected: false };
  let tiktokResult = { connected: false };

  if (tokens.instagram) {
    try {
      const r = await syncInstagram(tokens);
      if (r) { nextTokens.instagram = r.token; instagramResult = r.result; }
    } catch (e) {
      errors.instagram = String(e.message || e);
      instagramResult = { connected: true, error: errors.instagram };
    }
  }

  if (tokens.tiktok) {
    try {
      const r = await syncTiktok(tokens);
      if (r) { nextTokens.tiktok = r.token; tiktokResult = r.result; }
    } catch (e) {
      errors.tiktok = String(e.message || e);
      tiktokResult = { connected: true, error: errors.tiktok };
    }
  }

  await saveTokens(nextTokens);

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    instagram: { ...instagramResult, bestPost: instagramResult.posts ? bestPost(instagramResult.posts) : null },
    tiktok: { ...tiktokResult, bestPost: tiktokResult.posts ? bestPost(tiktokResult.posts) : null }
  };
  await saveLatestSnapshot(snapshot);

  const history = await getHistory();
  const today = snapshot.fetchedAt.slice(0, 10);
  const withoutToday = history.filter(h => h.date !== today);
  withoutToday.push({
    date: today,
    instagramFollowers: instagramResult.followers ?? null,
    tiktokFollowers: tiktokResult.followers ?? null
  });
  await saveHistory(withoutToday.slice(-HISTORY_LIMIT));

  return { snapshot, errors };
}

module.exports = { runSync };
