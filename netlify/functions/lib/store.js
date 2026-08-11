const { getStore } = require('@netlify/blobs');

// Ein Blob-Store für alles Social-Media-bezogene: OAuth-Status, Tokens, Snapshots.
function socialStore() {
  return getStore('social-analytics');
}

async function getTokens() {
  const store = socialStore();
  return (await store.get('tokens', { type: 'json' })) || {};
}

async function saveTokens(tokens) {
  const store = socialStore();
  await store.setJSON('tokens', tokens);
}

async function getOAuthState(key) {
  const store = socialStore();
  return store.get(`oauth-state:${key}`, { type: 'json' });
}

async function saveOAuthState(key, value) {
  const store = socialStore();
  await store.setJSON(`oauth-state:${key}`, value);
}

async function deleteOAuthState(key) {
  const store = socialStore();
  await store.delete(`oauth-state:${key}`);
}

async function getLatestSnapshot() {
  const store = socialStore();
  return store.get('latest', { type: 'json' });
}

async function saveLatestSnapshot(snapshot) {
  const store = socialStore();
  await store.setJSON('latest', snapshot);
}

async function getHistory() {
  const store = socialStore();
  return (await store.get('history', { type: 'json' })) || [];
}

async function saveHistory(history) {
  const store = socialStore();
  await store.setJSON('history', history);
}

module.exports = {
  socialStore,
  getTokens,
  saveTokens,
  getOAuthState,
  saveOAuthState,
  deleteOAuthState,
  getLatestSnapshot,
  saveLatestSnapshot,
  getHistory,
  saveHistory
};
