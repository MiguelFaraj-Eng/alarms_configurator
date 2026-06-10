module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const GITHUB_PAT  = process.env.GITHUB_PAT;
  const GITHUB_REPO = process.env.GITHUB_REPO || 'miguelfaraj-eng/alarms_configurator';
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

  if (!GITHUB_PAT) return res.status(500).json({ error: 'GITHUB_PAT not set' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const payload = req.body || {};
  const method = (payload.method || 'GET').toUpperCase();
  const path = payload.path || '';
  const body = payload.body || null;

  if (!path) return res.status(400).json({ error: 'Missing path' });

  const decoded = decodeURIComponent(path);
  const segments = decoded.split('/').map(function(s){ return encodeURIComponent(s); }).join('/');
  const url = 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/' + segments;

  const opts = {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + GITHUB_PAT,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'insightech'
    }
  };

  if ((method === 'PUT' || method === 'DELETE') && body) {
    body.branch = GITHUB_BRANCH;
    opts.body = JSON.stringify(body);
  }

  var ghRes = await fetch(url, opts);
  var text = await ghRes.text();
  var data;
  try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
  return res.status(ghRes.status).json(data);
};
