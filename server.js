'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = parseInt(process.env.PORT || '3000', 10);
var ROOT_DIR = __dirname;

var PRELOAD_DIR = path.join(ROOT_DIR, 'VaultPreLoads');
var PRELOAD_AUDIO_RE = /\.(wav|mp3|m4a|ogg|webm|aac|flac)$/i;

var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac'
};

function stablePreloadId(relPath) {
  var s = String(relPath || '');
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  var slug = path.basename(s, path.extname(s))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28) || 'clip';
  return 'preload_' + slug + '_' + (h >>> 0).toString(16);
}

function humanizeFilename(filename) {
  var stem = path.basename(String(filename || ''), path.extname(String(filename || '')));
  stem = stem.replace(/^\d+\s*[-_.]+\s*(?=[a-zA-Z])/, '');
  stem = stem.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stem) return 'Vault Fart';
  return stem
    .split(' ')
    .map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : '';
    })
    .join(' ');
}

function scanPreloadsSync() {
  var results = [];
  function walk(dirPath, relPrefix, depth) {
    if (depth > 2) return;
    var entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (var i = 0; i < entries.length; i++) {
      var ent = entries[i];
      if (!ent || ent.name.charAt(0) === '.') continue;
      var full = path.join(dirPath, ent.name);
      var rel = relPrefix ? relPrefix + '/' + ent.name : ent.name;
      if (ent.isDirectory()) {
        walk(full, rel, depth + 1);
      } else if (ent.isFile() && PRELOAD_AUDIO_RE.test(ent.name)) {
        results.push({
          id: stablePreloadId(rel),
          name: humanizeFilename(ent.name),
          filename: rel,
          url: '/VaultPreLoads/' + rel.split('/').map(encodeURIComponent).join('/')
        });
      }
    }
  }
  walk(PRELOAD_DIR, '', 0);
  results.sort(function (a, b) {
    return a.filename.localeCompare(b.filename);
  });
  return results;
}

var server = http.createServer(function (req, res) {
  var rawUrl = req.url || '/';
  var qIdx = rawUrl.indexOf('?');
  var reqUrl = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
  var qs = qIdx >= 0 ? rawUrl.slice(qIdx) : '';

  if (reqUrl === '/__health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('toot-match-ok');
    return;
  }

  if (reqUrl === '/api/preloads') {
    var files = scanPreloadsSync();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end(JSON.stringify({ count: files.length, files: files }));
    return;
  }

  if (reqUrl === '/' || reqUrl === '/index.html') {
    res.writeHead(302, {
      Location: '/labs/' + qs,
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end();
    return;
  }

  var decodedUrl = reqUrl;
  try {
    decodedUrl = decodeURIComponent(reqUrl);
  } catch (e) {}
  var safeRel = path.normalize(decodedUrl).replace(/^(\.\.[/\\])+/, '');
  var filePath = path.join(ROOT_DIR, safeRel);

  if (filePath.indexOf(ROOT_DIR) !== 0) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  function serveFile(resolvedPath) {
    var ext = path.extname(resolvedPath).toLowerCase();
    var mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    fs.createReadStream(resolvedPath).pipe(res);
  }

  fs.stat(filePath, function (err, stats) {
    if (!err && stats.isDirectory()) {
      if (reqUrl.charAt(reqUrl.length - 1) !== '/') {
        res.writeHead(302, { Location: reqUrl + '/' });
        res.end();
        return;
      }
      var indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, function (idxErr, idxStats) {
        if (idxErr || !idxStats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }
        serveFile(indexPath);
      });
      return;
    }

    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    serveFile(filePath);
  });
});

server.on('error', function (err) {
  if (err && err.code === 'EADDRINUSE') {
    console.log('Toot Match Labs v2 server is already running at http://localhost:' + PORT + '/labs/');
    process.exit(0);
  }
  console.error('Server error:', err && err.message ? err.message : err);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', function () {
  console.log('Toot Match Labs v2 server running at http://localhost:' + PORT + '/labs/');
  console.log('Press Ctrl+C to stop.');
});
