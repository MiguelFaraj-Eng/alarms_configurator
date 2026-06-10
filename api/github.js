/**
 * Insightech Alarms Configurator — GitHub API Proxy
 * Runs on Vercel. The GitHub PAT never leaves the server.
 */

// Increase body size limit to 10MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

module.exports = async function handler(req, res) {
  const GITHUB_PAT    = process.env.GITHUB_PAT;
  const GITHUB_REPO   = process.env.GITHUB_REPO   || 'miguelfaraj-eng/alarms_configurator';
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const ALLOWED_ORIGIN= process.env.ALLOWED_ORIGIN|| 'https://miguelfaraj-eng.github.io';

  // ── CORS ────────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── PAT check ───────────────────────────────────────────────────────────────
  if (!GITHUB_PAT) {
    return res.status(500).json({ error: 'GITHUB_PAT environment variable not set on Vercel.' });
  }

  // ── Only accept POST ────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let reqBody_parsed;
  try {
    reqBody_parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch(e) {
    return res.status(400).json({ error: 'Invalid JSON body: ' + e.message });
  }

  const { method = 'GET', path, body: reqBody } = reqBody_parsed || {};

  if (!path) {
    return res.status(400).json({ error: 'Missing required field: path' });
  }

  // ── Security: only allow safe paths ─────────────────────────────────────────
  const decoded = decodeURIComponent(path);
  const allowedPrefixes = ['data/', 'Projects/', 'Projects', 'assets/avatars/', 'assets/avatars'];
  const isAllowed = allowedPrefixes.some(p => decoded === p || decoded.startsWith(p));
  if (!isAllowed) {
    return res.status(403).json({ error: `Path not allowed: ${path}` });
  }

  // ── Build GitHub URL — encode each segment individually ──────────────────────
  const githubUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${decoded.split('/').map(s => encodeURIComponent(s)).join('/')}`;

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: {
      'Authorization': `Bearer ${GITHUB_PAT}`,
      'Accept':        'application/vnd.github+json',
      'Content-Type':  'application/json',
      'User-Agent':    'insightech-configurator'
    }
  };

  if (['PUT', 'DELETE'].includes(fetchOptions.method) && reqBody) {
    fetchOptions.body = JSON.stringify({ branch: GITHUB_BRANCH, ...reqBody });
  }

  try {
    const ghRes  = await fetch(githubUrl, fetchOptions);
    const ghData = await ghRes.json().catch(() => ({}));
    return res.status(ghRes.status).json(ghData);
  } catch (err) {
    return res.status(502).json({ error: 'GitHub API request failed: ' + err.message });
  }
};
