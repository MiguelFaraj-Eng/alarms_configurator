/**
 * Insightech Alarms Configurator — GitHub API Proxy
 */

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

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!GITHUB_PAT) return res.status(500).json({ error: 'GITHUB_PAT environment variable not set on Vercel.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { method = 'GET', path, body: reqBody } = payload || {};

    if (!path) return res.status(400).json({ error: 'Missing required field: path' });

    const decoded = decodeURIComponent(path);
    const allowedPrefixes = ['data/', 'Projects/', 'Projects', 'assets/avatars/', 'assets/avatars'];
    const isAllowed = allowedPrefixes.some(p => decoded === p || decoded.startsWith(p));
    if (!isAllowed) return res.status(403).json({ error: `Path not allowed: ${path}` });

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

    const ghRes  = await fetch(githubUrl, fetchOptions);
    const text   = await ghRes.text();
    let ghData;
    try { ghData = JSON.parse(text); } catch(e) { ghData = { raw: text }; }

    return res.status(ghRes.status).json(ghData);

  } catch (err) {
    // Return the real error so we can debug
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      type: err.constructor.name
    });
  }
};
