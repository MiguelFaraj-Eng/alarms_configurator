/**
 * Insightech Alarms Configurator — GitHub API Proxy
 * Runs on Vercel. The GitHub PAT never leaves the server.
 *
 * All requests from the frontend hit:
 *   POST https://your-app.vercel.app/api/github
 *
 * Body: { method, path, body }
 *   method : GET | PUT | DELETE
 *   path   : e.g. "data/users.json" or "Projects/Miguel%20Faraj/SOT-060/project.json"
 *   body   : object (for PUT/DELETE), omitted for GET
 */

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://miguelfaraj-eng.github.io';
const GITHUB_PAT     = process.env.GITHUB_PAT;
const GITHUB_REPO    = process.env.GITHUB_REPO    || 'miguelfaraj-eng/alarms_configurator';
const GITHUB_BRANCH  = process.env.GITHUB_BRANCH  || 'main';

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  if (!GITHUB_PAT) {
    return res.status(500).json({ error: 'GITHUB_PAT environment variable not set on Vercel.' });
  }

  // ── Only accept POST from our frontend ───────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { method = 'GET', path, body: reqBody } = req.body || {};

  if (!path) {
    return res.status(400).json({ error: 'Missing required field: path' });
  }

  // ── Security: only allow paths within the known repo structure ────────────
  const allowedPrefixes = ['data/', 'Projects/', 'assets/avatars/'];
  const isAllowed = allowedPrefixes.some(p => decodeURIComponent(path).startsWith(p));
  if (!isAllowed) {
    return res.status(403).json({ error: `Path not allowed: ${path}` });
  }

  // ── Forward to GitHub API ─────────────────────────────────────────────────
  const githubUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;

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
    // Inject branch if not already present
    const payload = { branch: GITHUB_BRANCH, ...reqBody };
    fetchOptions.body = JSON.stringify(payload);
  }

  try {
    const ghRes  = await fetch(githubUrl, fetchOptions);
    const ghData = await ghRes.json().catch(() => ({}));

    return res.status(ghRes.status).json(ghData);
  } catch (err) {
    return res.status(502).json({ error: 'GitHub API request failed: ' + err.message });
  }
}
