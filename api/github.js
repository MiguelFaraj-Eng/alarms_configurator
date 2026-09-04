var fetchFn = globalThis.fetch;

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
  var allowed = ['data/', 'Projects/', 'Projects', 'assets/avatars/', 'assets/avatars', 'Deleted/', 'Deleted'];
  if (!allowed.some(function(p){ return decoded === p || decoded.startsWith(p); })) {
    return res.status(403).json({ error: 'Path not allowed: ' + path });
  }

  // "Deleted/" holds soft-deleted projects and must stay unreadable to
  // normal users. This proxy has no server-side session of its own — the
  // browser just posts {method,path,body} — so a client-reported "I'm an
  // admin" flag can't be trusted. Instead, every request touching Deleted/
  // must carry {username, passwordHash}, which we independently re-check
  // against data/users.json (the real source of truth) on every call.
  var isDeletedPath = decoded === 'Deleted' || decoded.startsWith('Deleted/');
  if (isDeletedPath) {
    var adminAuth = payload.adminAuth || {};
    var isAdmin = false;
    try {
      var usersUrl = 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/data/users.json';
      var usersRes = await fetchFn(usersUrl, {
        headers: {
          'Authorization': 'Bearer ' + GITHUB_PAT,
          'Accept':        'application/vnd.github+json',
          'User-Agent':    'insightech'
        }
      });
      if (usersRes.ok) {
        var usersJson = await usersRes.json();
        var usersList = JSON.parse(Buffer.from(usersJson.content, 'base64').toString('utf8'));
        isAdmin = usersList.some(function(u){
          return u.username && adminAuth.username &&
            u.username.toLowerCase() === String(adminAuth.username).toLowerCase() &&
            u.passwordHash === adminAuth.passwordHash &&
            u.role === 'admin';
        });
      }
    } catch (e) { isAdmin = false; }
    if (!isAdmin) {
      return res.status(403).json({ error: 'Deleted Projects is restricted to Admins.' });
    }
  }

  // Pass the path directly to GitHub API URL — no re-encoding
  // The URL constructor handles encoding correctly
  var baseUrl = 'https://api.github.com/repos/' + GITHUB_REPO + '/contents/';
  var fullUrl = new URL(baseUrl + decoded);

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
    if (reqBody.rawContent !== undefined) {
      reqBody.content = Buffer.from(reqBody.rawContent, 'utf8').toString('base64');
      delete reqBody.rawContent;
    }
    reqBody.branch = reqBody.branch || GITHUB_BRANCH;
    opts.body = JSON.stringify(reqBody);
  }

  try {
    var ghRes = await fetchFn(fullUrl.toString(), opts);
    var text  = await ghRes.text();
    var data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }
    return res.status(ghRes.status).json(data);
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
