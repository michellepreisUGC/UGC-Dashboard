const { getLatestSnapshot, getHistory } = require('./lib/store');

exports.handler = async () => {
  const [snapshot, history] = await Promise.all([getLatestSnapshot(), getHistory()]);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot: snapshot || null, history })
  };
};
