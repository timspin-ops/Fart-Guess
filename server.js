'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

var PORT = parseInt(process.env.PORT || '3000', 10);
var ROOT_DIR = __dirname;

var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav'
};

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

  if (reqUrl === '/' || reqUrl === '/index.html') {
    res.writeHead(302, {
      Location: '/labs/' + qs,
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    res.end();
    return;
  }

  var safeRel = path.normalize(reqUrl).replace(/^(\.\.[/\\])+/, '');
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
