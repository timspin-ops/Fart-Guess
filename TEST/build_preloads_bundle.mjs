import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PRELOADS_DIR = path.join(ROOT_DIR, 'VaultPreLoads');
const MANIFEST_PATH = path.join(PRELOADS_DIR, 'manifest.json');
const OUT_CATALOG_PATH = path.join(__dirname, 'js', 'preloadsCatalog.js');
const OUT_AUDIO_PATH = path.join(__dirname, 'js', 'preloadsAudioData.js');

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.length === 0) {
    throw new Error('VaultPreLoads/manifest.json contains 0 files.');
  }

  const catalog = [];
  const audioB64Map = {};

  for (const item of files) {
    const filePath = path.join(PRELOADS_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing VaultPreLoads audio file: ${filePath}`);
    }
    const buf = fs.readFileSync(filePath);
    catalog.push({
      id: item.id,
      name: item.name,
      filename: item.filename,
      ext: item.ext || path.extname(item.filename).toLowerCase(),
      codec: item.codec || '',
      url: item.url || ('../VaultPreLoads/' + String(item.filename).split('/').map(encodeURIComponent).join('/')),
      durationSec: typeof item.durationSec === 'number' ? item.durationSec : null
    });
    audioB64Map[item.id] = buf.toString('base64');
  }

  const catalogSrc =
    '(function (root) {\n' +
    "  'use strict';\n" +
    '  root.TOOT_PRELOADS_CATALOG = ' +
    JSON.stringify(catalog, null, 2) +
    ';\n' +
    "})(typeof window !== 'undefined' ? window : globalThis);\n";

  const audioSrc =
    '(function (root) {\n' +
    "  'use strict';\n" +
    '  root.TOOT_PRELOADS_AUDIO_B64 = ' +
    JSON.stringify(audioB64Map) +
    ';\n' +
    "})(typeof window !== 'undefined' ? window : globalThis);\n";

  fs.writeFileSync(OUT_CATALOG_PATH, catalogSrc, 'utf8');
  fs.writeFileSync(OUT_AUDIO_PATH, audioSrc, 'utf8');

  console.log(
    JSON.stringify({
      ok: true,
      count: catalog.length,
      catalogBytes: fs.statSync(OUT_CATALOG_PATH).size,
      audioBundleBytes: fs.statSync(OUT_AUDIO_PATH).size
    })
  );
}

main();
