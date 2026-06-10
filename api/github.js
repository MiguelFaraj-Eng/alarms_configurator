/**
 * Insightech Alarms Configurator — GitHub API Proxy
 */

async function handler(req, res) {
  const GITHUB_PAT    = process.env.GITHUB_PAT;
  const GITHUB_REPO   = process.env.GITHUB_REPO   || 'miguelfaraj-eng/alarms_configurator';
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
  const ALLOWED_ORIGIN= process.env.ALLOWED_ORIGIN|| 'https://miguelfaraj-eng.github.io';

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!GITHUB_PAT) return res.status(500).json({ error: 'GITHUB_PAT not set.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { method = 'GET', path, body: reqBody } = payload || {};

    if (!path) return res.status(400).json({ error: 'Missing path.' });

    const decoded = decodeURIComponent(path);
    const allowed = ['data/', 'Projects/', 'Projects', 'assets/avatars/', 'assets/avatars'];
    if (!allowed.some(p => decoded === p || decoded.startsWith(p))) {
      return res.status(403).json({ error: 'Path not allowed: ' + path });
    }

    const encodedPath = decoded.split('/').map(s => encodeURIComponent(s)).join('/');
    const githubUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodedPath}`;

    const options = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'insightech-configurator'
      }
    };

    if (['PUT', 'DELETE'].includes(options.method) && reqBody) {
      options.body = JSON.stringify({ branch: GITHUB_BRANCH, ...reqBody });
    }

    const ghRes = await fetch(githubUrl, options);
    const text  = await ghRes.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
    return res.status(ghRes.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message, type: err.constructor.name });
  }
}

handler.config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

module.exports = handler;
