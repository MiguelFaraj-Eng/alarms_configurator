var https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  var GITHUB_PAT    = process.env.GITHUB_PAT;
  var GITHUB_REPO   = process.env.GITHUB_REPO   || 'miguelfaraj-eng/alarms_configurator';
  var GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

  if (!GITHUB_PAT) return res.status(500).json({ error: 'GITHUB_PAT not set' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  var payload = req.body || {};
  var method  = (payload.method || 'GET').toUpperCase();
  var path    = payload.path || '';
  var reqBody = payload.body || null;

  if (!path) return res.status(400).json({ error: 'Missing path' });

  var decoded = decodeURIComponent(path);
  var allowed = ['data/', 'Projects/', 'Projects', 'assets/avatars/', 'assets/avatars'];
  if (!allowed.some(function(p){ return decoded === p || decoded.startsWith(p); })) {
    return res.status(403).json({ error: 'Path not allowed: ' + path });
  }

  // Build path — encode each segment individually, preserve slashes
  var encodedPath = decoded.split('/').map(function(s) {
    return s.replace(/ /g, '%20')
            .replace(/\[/g, '%5B')
            .replace(/\]/g, '%5D')
            .replace(/#/g, '%23')
            .replace(/\?/g, '%3F');
  }).join('/');

  var apiPath = '/repos/' + GITHUB_REPO + '/contents/' + encodedPath;

  var bodyStr = null;
  if ((method === 'PUT' || method === 'DELETE') && reqBody) {
    if (reqBody.rawContent !== undefined) {
      reqBody.content = Buffer.from(reqBody.rawContent, 'utf8').toString('base64');
      delete reqBody.rawContent;
    }
    reqBody.branch = reqBody.branch || GITHUB_BRANCH;
    bodyStr = JSON.stringify(reqBody);
  }

  // Use Node.js https module directly — no fetch, no re-encoding
  return new Promise(function(resolve) {
    var options = {
      hostname: 'api.github.com',
      port: 443,
      path: apiPath,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + GITHUB_PAT,
        'Accept':        'application/vnd.github+json',
        'Content-Type':  'application/json',
        'User-Agent':    'insightech',
        'Content-Length': bodyStr ? Buffer.byteLength(bodyStr) : 0
      }
    };

    var req2 = https.request(options, function(ghRes) {
      var chunks = [];
      ghRes.on('data', function(chunk) { chunks.push(chunk); });
      ghRes.on('end', function() {
        var text = Buffer.concat(chunks).toString();
        var data;
        try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
        res.status(ghRes.statusCode).json(data);
        resolve();
      });
    });

    req2.on('error', function(err) {
      res.status(500).json({ error: err.message });
      resolve();
    });

    if (bodyStr) req2.write(bodyStr);
    req2.end();
  });
};
