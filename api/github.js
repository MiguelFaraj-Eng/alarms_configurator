module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const GITHUB_PAT    = process.env.GITHUB_PAT;
  const GITHUB_REPO   = process.env.GITHUB_REPO   || 'miguelfaraj-eng/alarms_configurator';
  const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

  if (!GITHUB_PAT) return res.status(500).json({ error: 'GITHUB_PAT not set' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  // Parse body — handle both pre-parsed object and raw string
  var payload;
  try {
    if (typeof req.body === 'object' && req.body !== null) {
      payload = req.body;
    } else if (typeof req.body === 'string') {
      payload = JSON.parse(req.body);
    } else {
      // Read raw body stream
      var rawBody = await new Promise(function(resolve, reject) {
        var chunks = [];
        req.on('data', function(chunk) { chunks.push(chunk); });
        req.on('end', function() { resolve(Buffer.concat(chunks).toString()); });
        req.on('error', reject);
      });
      payload = JSON.parse(rawBody);
    }
  } catch(e) {
    return res.status(400).json({ error: 'Body parse error: ' + e.message });
  }

  var method  = (payload.method || 'GET').toUpperCase();
  var path    = payload.path || '';
  var reqBody = payload.body || null;

  if (!path) return res.status(400).json({ error: 'Missing path' });

  var decoded  = decodeURIComponent(path);
  var allowed  = ['data/', 'Projects/', 'Projects', 'assets/avatars/', 'assets/avatars'];
  var ok       = allowed.some(function(p){ return decoded === p || decoded.startsWith(p); });
  if (!ok) return res.status(403).json({ error: 'Path not allowed: ' + path });

  var segments = decoded.split('/').map(function(s){ return encodeURIComponent(s); }).join('/');
  var url      = 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/' + segments;

  var opts = {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + GITHUB_PAT,
      'Accept':        'application/vnd.github+json',
      'Content-Type':  'application/json',
      'User-Agent':    'insightech'
    }
  };

  if ((method === 'PUT' || method === 'DELETE') && reqBody) {
    reqBody.branch = GITHUB_BRANCH;
    opts.body = JSON.stringify(reqBody);
  }

  try {
    var ghRes = await fetch(url, opts);
    var text  = await ghRes.text();
    var data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
    return res.status(ghRes.status).json(data);
  } catch(err) {
    return res.status(500).json({ error: err.message, url: url });
  }
};
