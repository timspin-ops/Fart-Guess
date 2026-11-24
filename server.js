'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

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
  stem = stem.replace(/^\d+__.*?__/, '');
  stem = stem.replace(/^\d+\s*[-_.]+\s*(?=[a-zA-Z])/, '');
  stem = stem.replace(/\s*\(\d+\)\s*$/, '');
  stem = stem
    .replace(/fatulance/gi, 'Flatulence')
    .replace(/realpoot(\d*)/gi, 'Real Poot $1')
    .replace(/verybadfart/gi, 'Very Bad Fart')
    .replace(/badfart(\d*)/gi, 'Bad Fart $1')
    .replace(/skiddingfart/gi, 'Skidding Fart')
    .replace(/zort(\d+)/gi, 'Zort $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{6}\s+\d{4}s\d+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stem) return 'Vault Fart';
  return stem
    .split(' ')
    .map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : '';
    })
    .join(' ');
}

function detectAudioCodec(buf, ext) {
  var lower = String(ext || '').toLowerCase();
  if (lower === '.m4a' && buf && buf.length > 0) {
    return buf.indexOf(Buffer.from('alac')) !== -1 && buf.indexOf(Buffer.from('mp4a')) === -1
      ? 'alac'
      : 'aac';
  }
  if (lower === '.ogg') return 'ogg';
  return lower.replace(/^\./, '') || 'unknown';
}

function extractWavPreview(buf, barCount) {
  var bars = barCount || 56;
  if (!buf || buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }
  var audioFormat = 0;
  var channels = 1;
  var sampleRate = 44100;
  var bits = 16;
  var dataOffset = -1;
  var dataLen = 0;
  var pos = 12;
  while (pos + 8 <= buf.length) {
    var chunkId = buf.toString('ascii', pos, pos + 4);
    var chunkSize = buf.readUInt32LE(pos + 4);
    var bodyPos = pos + 8;
    if (chunkId === 'fmt ' && bodyPos + 16 <= buf.length) {
      audioFormat = buf.readUInt16LE(bodyPos);
      channels = Math.max(1, buf.readUInt16LE(bodyPos + 2));
      sampleRate = Math.max(1, buf.readUInt32LE(bodyPos + 4));
      bits = buf.readUInt16LE(bodyPos + 14);
      if (audioFormat === 0xfffe && chunkSize >= 40 && bodyPos + 26 <= buf.length) {
        audioFormat = buf.readUInt16LE(bodyPos + 24);
      }
    } else if (chunkId === 'data') {
      dataOffset = bodyPos;
      dataLen = Math.min(chunkSize, Math.max(0, buf.length - bodyPos));
      break;
    }
    pos = bodyPos + chunkSize + (chunkSize % 2);
  }
  if (dataOffset < 0 || dataLen <= 0 || (audioFormat !== 1 && audioFormat !== 3)) return null;
  var bytesPerSample = Math.floor(bits / 8);
  var frameBytes = bytesPerSample * channels;
  if (bytesPerSample <= 0 || frameBytes <= 0) return null;
  var totalFrames = Math.floor(dataLen / frameBytes);
  if (totalFrames <= 0) return null;

  var rawPeaks = new Array(bars);
  var maxPeak = 0.0001;
  for (var b = 0; b < bars; b++) {
    var fStart = Math.floor((b / bars) * totalFrames);
    var fEnd = Math.min(totalFrames, Math.max(fStart + 1, Math.floor(((b + 1) / bars) * totalFrames)));
    var stride = Math.max(1, Math.floor((fEnd - fStart) / 64));
    var pk = 0;
    for (var f = fStart; f < fEnd; f += stride) {
      var monoSum = 0;
      for (var c = 0; c < channels; c++) {
        var off = dataOffset + f * frameBytes + c * bytesPerSample;
        if (off + bytesPerSample > buf.length) continue;
        var s = 0;
        if (audioFormat === 3 && bits === 32) {
          s = buf.readFloatLE(off);
        } else if (bits === 16) {
          s = buf.readInt16LE(off) / 32768;
        } else if (bits === 8) {
          s = (buf.readUInt8(off) - 128) / 128;
        } else if (bits === 24) {
          var v24 = buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16);
          if (v24 & 0x800000) v24 |= ~0xffffff;
          s = v24 / 8388608;
        } else if (bits === 32) {
          s = buf.readInt32LE(off) / 2147483648;
        }
        monoSum += s;
      }
      var absVal = Math.abs(monoSum / channels);
      if (absVal > pk) pk = absVal;
    }
    rawPeaks[b] = pk;
    if (pk > maxPeak) maxPeak = pk;
  }
  var peaks = rawPeaks.map(function (v) {
    return Math.max(4, Math.min(100, Math.round((v / maxPeak) * 100)));
  });
  return {
    durationSec: Number((totalFrames / sampleRate).toFixed(3)),
    peaks: peaks
  };
}

function extractMp4AlacPreview(buf, barCount) {
  var bars = barCount || 56;
  if (!buf || buf.length < 32) return null;

  var idxM = buf.indexOf(Buffer.from('mdhd'));
  if (idxM < 0 || idxM + 24 > buf.length) return null;
  var version = buf[idxM + 4];
  var timescale = 0;
  var duration = 0;
  if (version === 0 && idxM + 24 <= buf.length) {
    timescale = buf.readUInt32BE(idxM + 16);
    duration = buf.readUInt32BE(idxM + 20);
  } else if (version === 1 && idxM + 36 <= buf.length) {
    timescale = buf.readUInt32BE(idxM + 24);
    duration = Number(buf.readBigUInt64BE(idxM + 28));
  }
  if (!timescale || duration <= 0) return null;
  var durationSec = Number((duration / timescale).toFixed(3));

  var idxS = buf.indexOf(Buffer.from('stsz'));
  if (idxS < 0 || idxS + 16 > buf.length) return null;
  var sampleSize = buf.readUInt32BE(idxS + 8);
  var count = buf.readUInt32BE(idxS + 12);
  if (!count || count <= 0) return null;

  var sizes = new Array(count);
  for (var i = 0; i < count; i++) {
    if (sampleSize > 0) {
      sizes[i] = sampleSize;
    } else {
      var off = idxS + 16 + i * 4;
      if (off + 4 > buf.length) break;
      sizes[i] = buf.readUInt32BE(off);
    }
  }
  if (sizes.length === 0) return null;

  var rawPeaks = new Array(bars);
  var maxVal = 0.0001;
  for (var b = 0; b < bars; b++) {
    var pos = (b / bars) * (sizes.length - 1);
    var lo = Math.floor(pos);
    var hi = Math.min(sizes.length - 1, lo + 1);
    var frac = pos - lo;
    var sStart = Math.floor((b / bars) * sizes.length);
    var sEnd = Math.min(sizes.length, Math.max(sStart + 1, Math.floor(((b + 1) / bars) * sizes.length)));
    var bucketMax = 0;
    for (var k = sStart; k < sEnd; k++) {
      if ((sizes[k] || 0) > bucketMax) bucketMax = sizes[k] || 0;
    }
    var interp = (sizes[lo] || 0) * (1 - frac) + (sizes[hi] || 0) * frac;
    var val = Math.max(bucketMax, interp);
    rawPeaks[b] = val;
    if (val > maxVal) maxVal = val;
  }

  var peaks = rawPeaks.map(function (v) {
    return Math.max(6, Math.min(100, Math.round(Math.pow(v / maxVal, 0.85) * 100)));
  });

  return {
    durationSec: durationSec,
    peaks: peaks
  };
}

function readCachedManifestMap() {
  var map = {};
  try {
    var mp = path.join(PRELOAD_DIR, 'manifest.json');
    if (!fs.existsSync(mp)) return map;
    var data = JSON.parse(fs.readFileSync(mp, 'utf8'));
    var files = data && Array.isArray(data.files) ? data.files : [];
    for (var i = 0; i < files.length; i++) {
      var item = files[i];
      if (!item || !item.filename) continue;
      map[item.filename + '|' + item.size] = item;
    }
  } catch (e) {}
  return map;
}

function scanPreloadsSync() {
  var raw = [];
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
        raw.push({ full: full, rel: rel, name: ent.name });
      }
    }
  }
  walk(PRELOAD_DIR, '', 0);

  raw.sort(function (a, b) {
    var aDup = /\s\(\d+\)(?=\.[^.]+$|$)/.test(a.rel) ? 1 : 0;
    var bDup = /\s\(\d+\)(?=\.[^.]+$|$)/.test(b.rel) ? 1 : 0;
    if (aDup !== bDup) return aDup - bDup;
    return a.rel.localeCompare(b.rel);
  });

  var cachedMap = readCachedManifestMap();
  var seenHashes = {};
  var seenNames = {};
  var results = [];

  for (var j = 0; j < raw.length; j++) {
    var item = raw[j];
    var buf;
    try {
      buf = fs.readFileSync(item.full);
    } catch (e) {
      continue;
    }
    var hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (seenHashes[hash]) continue;
    seenHashes[hash] = true;

    var baseName = humanizeFilename(item.name);
    var nameKey = baseName.toLowerCase();
    var displayName = baseName;
    if (seenNames[nameKey]) {
      var suffix = seenNames[nameKey] + 1;
      while (seenNames[(baseName + ' #' + suffix).toLowerCase()]) {
        suffix++;
      }
      displayName = baseName + ' #' + suffix;
      seenNames[nameKey] = suffix;
      seenNames[displayName.toLowerCase()] = 1;
    } else {
      seenNames[nameKey] = 1;
    }

    var ext = path.extname(item.name).toLowerCase();
    var codec = detectAudioCodec(buf, ext);
    var entryObj = {
      id: stablePreloadId(item.rel),
      name: displayName,
      filename: item.rel,
      ext: ext,
      codec: codec,
      size: buf.length,
      url: '../VaultPreLoads/' + item.rel.split('/').map(encodeURIComponent).join('/')
    };
    var cached = cachedMap[item.rel + '|' + buf.length];
    if (cached && Array.isArray(cached.peaks) && cached.peaks.length > 0) {
      entryObj.peaks = cached.peaks;
      if (typeof cached.durationSec === 'number') entryObj.durationSec = cached.durationSec;
      if (cached.meta && typeof cached.meta === 'object') entryObj.meta = cached.meta;
      if (cached.codec) entryObj.codec = cached.codec;
    } else if (ext === '.wav') {
      var wavPrev = extractWavPreview(buf, 56);
      if (wavPrev) {
        entryObj.durationSec = wavPrev.durationSec;
        entryObj.peaks = wavPrev.peaks;
      }
    } else if (codec === 'alac') {
      var alacPrev = extractMp4AlacPreview(buf, 56);
      if (alacPrev) {
        entryObj.durationSec = alacPrev.durationSec;
        entryObj.peaks = alacPrev.peaks;
      }
    }
    results.push(entryObj);
  }

  results.sort(function (a, b) {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
  return results;
}

function writeManifestSync() {
  var files = scanPreloadsSync();
  var payload = {
    generatedAt: new Date().toISOString(),
    count: files.length,
    files: files
  };
  fs.mkdirSync(PRELOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(PRELOAD_DIR, 'manifest.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return payload;
}

if (process.argv.indexOf('--write-manifest') !== -1) {
  var manifestOut = writeManifestSync();
  console.log('PRELOAD_MANIFEST_WRITTEN ' + manifestOut.count);
  process.exit(0);
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
