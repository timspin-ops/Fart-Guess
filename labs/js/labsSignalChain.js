(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var CHAIN_DB_NAME = 'TootLabsSignalChainsDB';
  var CHAIN_DB_VER = 1;
  var CHAIN_STORE = 'chains';
  var memoryChains = new Map();

  var chainState = {
    deps: null,
    chains: [],
    activeChainId: null,
    pane: 'lobby', // 'lobby' | 'pass' | 'analysis'
    pendingOrigin: null, // { name, sampleId, sampleRate, samples }
    pendingMimic: null,  // { sampleRate, samples }
    recKind: null,       // 'origin' | 'mimic' | null
    playingSeq: false,
    cachedAnalysis: null
  };

  function $(id) {
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openChainDB() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      try {
        var req = indexedDB.open(CHAIN_DB_NAME, CHAIN_DB_VER);
        req.onupgradeneeded = function (ev) {
          var db = ev.target.result;
          if (!db.objectStoreNames.contains(CHAIN_STORE)) {
            db.createObjectStore(CHAIN_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = function (ev) {
          resolve(ev.target.result);
        };
        req.onerror = function (ev) {
          reject(ev.target.error || new Error('Chain DB open error'));
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  function cloneFloat32(arr) {
    if (!arr) return new Float32Array(0);
    return arr instanceof Float32Array ? new Float32Array(arr) : new Float32Array(arr);
  }

  function serializeChain(chain) {
    return {
      id: chain.id,
      title: chain.title || 'Acoustic Relay Chain',
      createdAt: chain.createdAt || Date.now(),
      updatedAt: chain.updatedAt || Date.now(),
      origin: {
        name: (chain.origin && chain.origin.name) || 'Origin Specimen',
        sampleId: (chain.origin && chain.origin.sampleId) || null,
        sampleRate: (chain.origin && chain.origin.sampleRate) || 44100,
        samples: cloneFloat32(chain.origin && chain.origin.samples)
      },
      links: (chain.links || []).map(function (lnk) {
        return {
          id: lnk.id,
          playerName: lnk.playerName || 'Subject',
          createdAt: lnk.createdAt || Date.now(),
          sampleRate: lnk.sampleRate || 44100,
          samples: cloneFloat32(lnk.samples)
        };
      })
    };
  }

  function hydrateChain(rec) {
    if (!rec || !rec.origin) return null;
    return {
      id: rec.id,
      title: rec.title || 'Acoustic Relay Chain',
      createdAt: rec.createdAt || Date.now(),
      updatedAt: rec.updatedAt || Date.now(),
      origin: {
        id: rec.origin.sampleId || (rec.id + '_orig'),
        name: rec.origin.name || 'Origin Specimen',
        displayName: rec.origin.name || 'Origin Specimen',
        sampleId: rec.origin.sampleId || null,
        sampleRate: rec.origin.sampleRate || 44100,
        samples: cloneFloat32(rec.origin.samples),
        features: null
      },
      links: (rec.links || []).map(function (lnk, idx) {
        var sr = lnk.sampleRate || 44100;
        var pName = lnk.playerName || ('Subject #' + (idx + 1));
        return {
          id: lnk.id || (rec.id + '_lnk_' + idx),
          playerName: pName,
          name: pName,
          displayName: pName,
          createdAt: lnk.createdAt || Date.now(),
          sampleRate: sr,
          samples: cloneFloat32(lnk.samples),
          features: null
        };
      })
    };
  }

  function loadChains() {
    return openChainDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(CHAIN_STORE, 'readonly');
          var store = tx.objectStore(CHAIN_STORE);
          var req = store.getAll();
          req.onsuccess = function () {
            var rows = (req.result || []).map(hydrateChain).filter(Boolean);
            rows.sort(function (a, b) {
              return (b.updatedAt || 0) - (a.updatedAt || 0);
            });
            rows.forEach(function (c) {
              memoryChains.set(c.id, c);
            });
            chainState.chains = rows;
            resolve(rows);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      })
      .catch(function () {
        var rows = Array.from(memoryChains.values());
        rows.sort(function (a, b) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        chainState.chains = rows;
        return rows;
      });
  }

  function saveChain(chain) {
    chain.updatedAt = Date.now();
    memoryChains.set(chain.id, chain);
    var rec = serializeChain(chain);
    return openChainDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(CHAIN_STORE, 'readwrite');
          var store = tx.objectStore(CHAIN_STORE);
          var req = store.put(rec);
          req.onsuccess = function () { resolve(chain); };
          req.onerror = function () { reject(req.error); };
        });
      })
      .catch(function () {
        return chain;
      });
  }

  function deleteChainById(chainId) {
    memoryChains.delete(chainId);
    chainState.chains = chainState.chains.filter(function (c) { return c.id !== chainId; });
    return openChainDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(CHAIN_STORE, 'readwrite');
          var store = tx.objectStore(CHAIN_STORE);
          var req = store.delete(chainId);
          req.onsuccess = function () { resolve(); };
          req.onerror = function () { reject(req.error); };
        });
      })
      .catch(function () {});
  }

  function ensureFeatures(soundObj) {
    if (!soundObj || !soundObj.samples || soundObj.samples.length === 0) return null;
    if (soundObj.features) return soundObj.features;
    var DSP = root.TootApp && root.TootApp.DSP;
    if (!DSP || typeof DSP.extractFeatures !== 'function') return null;
    soundObj.features = DSP.extractFeatures(soundObj.samples, soundObj.sampleRate || 44100);
    return soundObj.features;
  }

  function computePairSimilarity(featA, featB) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var Store = TootLabs.Store;
    if (!DSP || !featA || !featB) return 0;
    var cmp = DSP.compareSounds(featA, featB);
    if (Store && typeof Store.computeExactScore === 'function') {
      return Number(clamp(Store.computeExactScore(cmp), 0, 100).toFixed(1));
    }
    return Number(clamp((cmp && cmp.overallScore) || 0, 0, 100).toFixed(1));
  }

  function analyzeChain(chain) {
    if (!chain || !chain.origin) return null;
    var originFeat = ensureFeatures(chain.origin);
    var links = chain.links || [];
    var rows = [];
    var prevFeat = originFeat;
    var prevVsOrigin = 100.0;
    var worstDrop = null;

    var originPitch = Math.round((originFeat && (originFeat.medianPitchHz || originFeat.spectralCentroidHz)) || 0);
    var originDur = (originFeat && originFeat.duration) || (chain.origin.samples ? chain.origin.samples.length / (chain.origin.sampleRate || 44100) : 0);

    for (var i = 0; i < links.length; i++) {
      var lnk = links[i];
      var feat = ensureFeatures(lnk);
      var vsOrigin = computePairSimilarity(originFeat, feat);
      var vsPrev = computePairSimilarity(prevFeat, feat);
      var stepDiff = Number((vsOrigin - prevVsOrigin).toFixed(1));
      var linkPitch = Math.round((feat && (feat.medianPitchHz || feat.spectralCentroidHz)) || 0);
      var linkDur = (feat && feat.duration) || (lnk.samples ? lnk.samples.length / (lnk.sampleRate || 44100) : 0);

      var row = {
        index: i + 1,
        link: lnk,
        vsOrigin: vsOrigin,
        vsPrev: vsPrev,
        stepDiff: stepDiff,
        pitchHz: linkPitch,
        pitchDriftHz: linkPitch - originPitch,
        durationSec: Number(linkDur.toFixed(2)),
        durDriftSec: Number((linkDur - originDur).toFixed(2))
      };
      rows.push(row);

      if (!worstDrop || stepDiff < worstDrop.stepDiff) {
        worstDrop = row;
      }
      prevFeat = feat;
      prevVsOrigin = vsOrigin;
    }

    var finalVsOrigin = rows.length > 0 ? rows[rows.length - 1].vsOrigin : 100.0;
    var deteriorationIndex = Number(clamp(100 - finalVsOrigin, 0, 100).toFixed(1));
    var avgDecayPerHop = rows.length > 0 ? Number(((100 - finalVsOrigin) / rows.length).toFixed(1)) : 0;
    var halfLifeHops =
      rows.length > 0 && finalVsOrigin < 99.0
        ? Number(((rows.length * Math.LN2) / Math.log(100 / Math.max(4, finalVsOrigin))).toFixed(1))
        : null;

    var lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
    var pitchMsg = '';
    if (lastRow) {
      var pSign = lastRow.pitchDriftHz > 0 ? '+' : '';
      var dSign = lastRow.durDriftSec > 0 ? '+' : '';
      pitchMsg = ' Final pitch drifted ' + pSign + lastRow.pitchDriftHz + ' Hz (' + dSign + lastRow.durDriftSec + 's duration delta vs. Gen 0).';
    }
    var worstMsg =
      worstDrop && worstDrop.stepDiff < -0.5
        ? ' Largest single-hop inflection occurred at Gen ' + worstDrop.index + ' (' + worstDrop.link.playerName + ', ' + (worstDrop.stepDiff > 0 ? '+' : '') + worstDrop.stepDiff.toFixed(1) + '% vs. previous origin alignment).'
        : '';

    var summary =
      rows.length === 0
        ? 'Origin seed specimen calibrated at 100% integrity (' + originPitch + ' Hz · ' + originDur.toFixed(2) + 's). Capture at least 1 human relay mimic to measure generational decay.'
        : 'Across ' + rows.length + ' human relay generation' + (rows.length === 1 ? '' : 's') + ', acoustic signal fidelity fell from 100.0% to ' + finalVsOrigin.toFixed(1) + '% (Deterioration Index: ' + deteriorationIndex.toFixed(1) + '%, avg ' + avgDecayPerHop.toFixed(1) + '% drift per hop).' + pitchMsg + worstMsg + (halfLifeHops ? ' Estimated Acoustic Half-Life (t½): ' + halfLifeHops + ' hops.' : '');

    return {
      chain: chain,
      originPitchHz: originPitch,
      originDurSec: Number(originDur.toFixed(2)),
      mimicCount: rows.length,
      finalVsOrigin: finalVsOrigin,
      deteriorationIndex: deteriorationIndex,
      avgDecayPerHop: avgDecayPerHop,
      halfLifeHops: halfLifeHops,
      worstDrop: worstDrop,
      rows: rows,
      summary: summary
    };
  }

  function drawStaticWave(canvas, samples, progress01) {
    if (chainState.deps && typeof chainState.deps.drawStaticWaveform === 'function') {
      chainState.deps.drawStaticWaveform(canvas, samples, {
        fallbackW: 440,
        fallbackH: 54,
        progress: typeof progress01 === 'number' ? progress01 : undefined
      });
    }
  }

  function drawDecayCurve(canvas, analysis) {
    if (!canvas) return;
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    var cssW = rect && rect.width > 40 ? Math.round(rect.width) : 440;
    var cssH = rect && rect.height > 40 ? Math.round(rect.height) : 175;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#07141b';
    ctx.fillRect(0, 0, cssW, cssH);

    var pad = { l: 38, r: 16, t: 22, b: 26 };
    var pw = cssW - pad.l - pad.r;
    var ph = cssH - pad.t - pad.b;

    // Horizontal grid lines at 0, 25, 50, 75, 100%
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.lineWidth = 1;
    for (var gi = 0; gi <= 4; gi++) {
      var pct = gi * 25;
      var gy = pad.t + ph - (pct / 100) * ph;
      ctx.strokeStyle = 'rgba(82, 240, 180, 0.14)';
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(pad.l + pw, gy);
      ctx.stroke();
      ctx.fillStyle = '#9ac0b5';
      ctx.fillText(pct + '%', pad.l - 5, gy + 3);
    }

    var rows = (analysis && analysis.rows) || [];
    var totalPts = rows.length + 1;

    function xAt(genIdx) {
      if (totalPts <= 1) return pad.l;
      return pad.l + (genIdx / (totalPts - 1)) * pw;
    }

    function yAt(pctVal) {
      return pad.t + ph - (clamp(pctVal, 0, 100) / 100) * ph;
    }

    // X-axis Gen labels
    ctx.textAlign = 'center';
    for (var xi = 0; xi < totalPts; xi++) {
      var xPos = xAt(xi);
      ctx.fillStyle = '#a8cbc0';
      ctx.fillText('G' + xi, xPos, cssH - 8);
    }

    if (rows.length > 0) {
      // Shaded area under Fidelity-to-Origin curve
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(100));
      for (var ai = 0; ai < rows.length; ai++) {
        ctx.lineTo(xAt(ai + 1), yAt(rows[ai].vsOrigin));
      }
      ctx.lineTo(xAt(rows.length), pad.t + ph);
      ctx.lineTo(xAt(0), pad.t + ph);
      ctx.closePath();
      ctx.fillStyle = 'rgba(70, 232, 166, 0.14)';
      ctx.fill();

      // Step-to-Step Fidelity dashed amber line (G1..GN)
      ctx.save();
      ctx.strokeStyle = '#f6b84c';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(100));
      for (var si = 0; si < rows.length; si++) {
        ctx.lineTo(xAt(si + 1), yAt(rows[si].vsPrev));
      }
      ctx.stroke();
      ctx.restore();

      // Primary Fidelity-to-Origin emerald line
      ctx.strokeStyle = '#46e8a6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(xAt(0), yAt(100));
      for (var pi = 0; pi < rows.length; pi++) {
        ctx.lineTo(xAt(pi + 1), yAt(rows[pi].vsOrigin));
      }
      ctx.stroke();

      // Nodes & value callouts
      for (var ni = 0; ni < totalPts; ni++) {
        var val = ni === 0 ? 100 : rows[ni - 1].vsOrigin;
        var nx = xAt(ni);
        var ny = yAt(val);
        ctx.fillStyle = '#07141b';
        ctx.beginPath();
        ctx.arc(nx, ny, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ni === 0 ? '#ffffff' : '#46e8a6';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (totalPts <= 9 || ni === 0 || ni === totalPts - 1) {
          ctx.fillStyle = '#e8f7f0';
          ctx.font = '700 8.5px "JetBrains Mono", monospace';
          ctx.fillText(Math.round(val) + '%', nx, Math.max(pad.t + 10, ny - 8));
        }
      }
    }

    // Top-right concise legend
    ctx.textAlign = 'right';
    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#46e8a6';
    ctx.fillText('— vs Origin', cssW - 10, 12);
    ctx.fillStyle = '#f6b84c';
    ctx.fillText('-- vs Prev', cssW - 86, 12);

    ctx.restore();
  }

  function getActiveChain() {
    if (!chainState.activeChainId) return null;
    for (var i = 0; i < chainState.chains.length; i++) {
      if (chainState.chains[i].id === chainState.activeChainId) return chainState.chains[i];
    }
    return null;
  }

  function setPane(paneName) {
    chainState.pane = paneName;
    var lobbyEl = $('chain-lobby-pane');
    var passEl = $('chain-pass-pane');
    var anaEl = $('chain-analysis-pane');
    if (lobbyEl) lobbyEl.classList.toggle('hidden', paneName !== 'lobby');
    if (passEl) passEl.classList.toggle('hidden', paneName !== 'pass');
    if (anaEl) anaEl.classList.toggle('hidden', paneName !== 'analysis');
  }

  function populateSeedSelect() {
    var sel = $('chain-seed-select');
    if (!sel || !chainState.deps || typeof chainState.deps.getSamples !== 'function') return;
    var samples = chainState.deps.getSamples() || [];
    var prevVal = sel.value;
    if (samples.length === 0) {
      sel.innerHTML = '<option value="">No Vault specimens — record live below</option>';
      return;
    }
    sel.innerHTML = samples
      .map(function (s) {
        var name = chainState.deps.getSampleName ? chainState.deps.getSampleName(s) : (s.displayName || s.name || 'Specimen');
        var srcTag = s.isBuiltIn ? ' [Archive]' : ' [Recorded]';
        return '<option value="' + esc(s.id) + '">' + esc(name + srcTag) + '</option>';
      })
      .join('');
    if (prevVal && samples.some(function (s) { return s.id === prevVal; })) {
      sel.value = prevVal;
    }
  }

  function renderSavedChainsList() {
    var listEl = $('chain-saved-list');
    if (!listEl) return;
    var chains = chainState.chains || [];
    if (chains.length === 0) {
      listEl.innerHTML =
        '<div class="labs-chain-empty">No propagation chains saved yet. Select any Vault fart or record a live original above to start Passing the Fart!</div>';
      return;
    }

    listEl.innerHTML = chains
      .map(function (ch) {
        var links = ch.links || [];
        var lastLnk = links.length > 0 ? links[links.length - 1] : null;
        var originName = (ch.origin && ch.origin.name) || 'Origin';
        var decayBadge = '0 Mimics';
        var decayTone = 'neutral';
        if (links.length > 0) {
          var a = analyzeChain(ch);
          decayBadge = a ? a.deteriorationIndex.toFixed(0) + '% Decay' : 'Active';
          decayTone = a && a.deteriorationIndex >= 50 ? 'warn' : 'good';
        }
        return (
          '<article class="labs-chain-saved-card" data-chain-id="' + esc(ch.id) + '">' +
          '  <div class="labs-chain-card-top">' +
          '    <div>' +
          '      <h4 class="labs-chain-card-title">' + esc(ch.title) + '</h4>' +
          '      <div class="labs-chain-card-meta">Gen 0: <strong>' + esc(originName) + '</strong>' + (lastLnk ? ' → Final: <strong>' + esc(lastLnk.playerName) + '</strong>' : '') + '</div>' +
          '    </div>' +
          '    <div class="labs-chain-badges">' +
          '      <span class="labs-chip labs-chip-blue">' + links.length + (links.length === 1 ? ' Mimic' : ' Mimics') + '</span>' +
          (links.length > 0 ? '<span class="labs-chip ' + (decayTone === 'warn' ? 'labs-chip-orange' : 'labs-chip-green') + '">' + esc(decayBadge) + '</span>' : '') +
          '    </div>' +
          '  </div>' +
          '  <div class="labs-chain-card-actions">' +
          '    <button type="button" class="labs-btn labs-btn-emerald labs-btn-xs" data-ch-act="continue" data-ch-id="' + esc(ch.id) + '">➕ Continue (' + links.length + ')</button>' +
          (links.length > 0
            ? '<button type="button" class="labs-btn labs-btn-blue labs-btn-xs" data-ch-act="origfinal" data-ch-id="' + esc(ch.id) + '">▶ Orig → Final</button>' +
              '<button type="button" class="labs-btn labs-btn-purple labs-btn-xs" data-ch-act="analyze" data-ch-id="' + esc(ch.id) + '">🔬 Analyze</button>'
            : '') +
          '    <button type="button" class="labs-btn-danger labs-btn-xs" data-ch-act="delete" data-ch-id="' + esc(ch.id) + '" aria-label="Delete chain">🗑️</button>' +
          '  </div>' +
          '</article>'
        );
      })
      .join('');

    listEl.querySelectorAll('[data-ch-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = this.getAttribute('data-ch-act');
        var cid = this.getAttribute('data-ch-id');
        if (act === 'continue') openChainPass(cid);
        else if (act === 'analyze') openChainAnalysis(cid);
        else if (act === 'origfinal') playOrigAndFinal(cid);
        else if (act === 'delete') {
          deleteChainById(cid).then(function () {
            if (chainState.activeChainId === cid) chainState.activeChainId = null;
            renderSavedChainsList();
            if (chainState.deps && chainState.deps.showToast) chainState.deps.showToast('Chain deleted.');
          });
        }
      });
    });
  }

  function playOrigAndFinal(chainId) {
    var chain = null;
    for (var i = 0; i < chainState.chains.length; i++) {
      if (chainState.chains[i].id === chainId) { chain = chainState.chains[i]; break; }
    }
    if (!chain || !chain.origin) return;
    var Audio = root.TootApp && root.TootApp.Audio;
    if (!Audio) return;
    var links = chain.links || [];
    if (links.length === 0) {
      Audio.playSound(chain.origin.samples, chain.origin.sampleRate, { channel: 'chain_seq' });
      return;
    }
    var last = links[links.length - 1];
    if (chainState.deps && chainState.deps.showToast) {
      chainState.deps.showToast('Playing Gen 0 (' + chain.origin.name + ') → Gen ' + links.length + ' (' + last.playerName + ')');
    }
    Audio.playSequence(
      [
        { samples: chain.origin.samples, sampleRate: chain.origin.sampleRate, channel: 'ch_orig' },
        { samples: last.samples, sampleRate: last.sampleRate, channel: 'ch_last' }
      ],
      320
    );
  }

  function playFullChain(chainId) {
    var chain = null;
    for (var i = 0; i < chainState.chains.length; i++) {
      if (chainState.chains[i].id === chainId) { chain = chainState.chains[i]; break; }
    }
    if (!chain || !chain.origin) return;
    var Audio = root.TootApp && root.TootApp.Audio;
    if (!Audio) return;
    var seq = [{ samples: chain.origin.samples, sampleRate: chain.origin.sampleRate, channel: 'ch_0' }];
    (chain.links || []).forEach(function (lnk, idx) {
      seq.push({ samples: lnk.samples, sampleRate: lnk.sampleRate, channel: 'ch_' + (idx + 1) });
    });
    Audio.playSequence(seq, 280);
  }

  function renderPassPane() {
    var ch = getActiveChain();
    if (!ch) {
      setPane('lobby');
      return;
    }
    var links = ch.links || [];
    var prevSound = links.length > 0 ? links[links.length - 1] : ch.origin;
    var nextNum = links.length + 1;

    if ($('chain-pass-title')) $('chain-pass-title').textContent = ch.title;
    if ($('chain-pass-tally')) $('chain-pass-tally').textContent = links.length + (links.length === 1 ? ' MIMIC' : ' MIMICS');
    if ($('chain-handoff-title')) {
      $('chain-handoff-title').textContent = 'SUBJECT #' + nextNum + ' — HEAR PREVIOUS LINK ONLY';
    }
    if ($('chain-handoff-sub')) {
      $('chain-handoff-sub').textContent =
        links.length === 0
          ? 'Listen to Origin Specimen ("' + ch.origin.name + '"), then record Subject #1’s closest mimic.'
          : 'Blind Relay: Listen ONLY to Subject #' + links.length + ' (' + prevSound.playerName + '), then pass your mimic forward!';
    }
    if ($('chain-player-input')) {
      $('chain-player-input').value = '';
      $('chain-player-input').placeholder = 'Subject #' + nextNum + ' (or enter name)';
    }

    var prevCanvas = $('chain-prev-wave');
    if (prevCanvas && prevSound && prevSound.samples) {
      drawStaticWave(prevCanvas, prevSound.samples, null);
    }

    var hasPending = Boolean(chainState.pendingMimic && chainState.pendingMimic.samples);
    if ($('btn-chain-preview-mimic')) $('btn-chain-preview-mimic').classList.toggle('hidden', !hasPending);
    if ($('btn-chain-lock-mimic')) $('btn-chain-lock-mimic').disabled = !hasPending;

    var recBtn = $('btn-chain-rec-mimic');
    if (recBtn && chainState.recKind !== 'mimic') {
      recBtn.textContent = hasPending ? '🔁 Retake Mimic' : '🎤 Record Your Mimic';
      recBtn.classList.remove('recording');
    }

    var footerRow = $('chain-pass-footer');
    if (footerRow) footerRow.classList.toggle('hidden', links.length === 0);
  }

  function openChainPass(chainId) {
    chainState.activeChainId = chainId;
    chainState.pendingMimic = null;
    setPane('pass');
    renderPassPane();
  }

  function renderAnalysisPane() {
    var ch = getActiveChain();
    if (!ch) {
      setPane('lobby');
      return;
    }
    var analysis = analyzeChain(ch);
    chainState.cachedAnalysis = analysis;

    if ($('chain-ana-title')) $('chain-ana-title').textContent = ch.title;
    if ($('chain-ana-sub')) {
      $('chain-ana-sub').textContent =
        'Origin: ' + ch.origin.name + ' (' + analysis.originPitchHz + ' Hz · ' + analysis.originDurSec + 's) · ' + analysis.mimicCount + (analysis.mimicCount === 1 ? ' Mimic' : ' Mimics');
    }
    if ($('chain-stat-decay')) $('chain-stat-decay').textContent = analysis.deteriorationIndex.toFixed(1) + '%';
    if ($('chain-stat-final')) $('chain-stat-final').textContent = analysis.finalVsOrigin.toFixed(1) + '%';
    if ($('chain-stat-count')) $('chain-stat-count').textContent = String(analysis.mimicCount);
    if ($('chain-stat-halflife')) {
      $('chain-stat-halflife').textContent = analysis.halfLifeHops ? analysis.halfLifeHops + ' hops' : '—';
    }
    if ($('chain-analysis-narrative')) {
      $('chain-analysis-narrative').textContent = analysis.summary;
    }

    var cvs = $('chain-decay-canvas');
    if (cvs) {
      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(function () {
          drawDecayCurve(cvs, analysis);
        });
      } else {
        drawDecayCurve(cvs, analysis);
      }
    }

    var ledger = $('chain-ledger-list');
    if (ledger) {
      var origHtml =
        '<div class="labs-chain-ledger-row is-origin">' +
        '  <div class="labs-chain-ledger-main">' +
        '    <div class="labs-chain-ledger-title"><span class="labs-chip labs-chip-green">GEN 0 · ORIGIN</span> <strong>' + esc(ch.origin.name) + '</strong></div>' +
        '    <div class="labs-chain-ledger-sub">Baseline Reference · ' + analysis.originPitchHz + ' Hz · ' + analysis.originDurSec + 's</div>' +
        '  </div>' +
        '  <div class="labs-chain-ledger-metrics">' +
        '    <span class="labs-chain-pct-orig">100.0% Origin</span>' +
        '  </div>' +
        '  <div class="labs-chain-ledger-btns">' +
        '    <button type="button" class="labs-btn-ghost labs-btn-xs" data-ledger-play="orig">▶</button>' +
        '  </div>' +
        '</div>';

      var linksHtml = (analysis.rows || [])
        .map(function (r) {
          var diffSign = r.stepDiff > 0 ? '+' : '';
          var diffTone = r.stepDiff >= -2 ? 'good' : r.stepDiff >= -12 ? 'mid' : 'drop';
          var pitchStr = (r.pitchDriftHz >= 0 ? '+' : '') + r.pitchDriftHz + ' Hz';
          var durStr = (r.durDriftSec >= 0 ? '+' : '') + r.durDriftSec + 's';
          return (
            '<div class="labs-chain-ledger-row">' +
            '  <div class="labs-chain-ledger-main">' +
            '    <div class="labs-chain-ledger-title"><span class="labs-seq-row-idx">GEN ' + r.index + '</span> <strong>' + esc(r.link.playerName) + '</strong></div>' +
            '    <div class="labs-chain-ledger-sub">vs Prev: <strong>' + r.vsPrev.toFixed(1) + '%</strong> · Drift: ' + pitchStr + ', ' + durStr + '</div>' +
            '  </div>' +
            '  <div class="labs-chain-ledger-metrics">' +
            '    <span class="labs-chain-diff-pill is-' + diffTone + '">Δ ' + diffSign + r.stepDiff.toFixed(1) + '%</span>' +
            '    <span class="labs-chain-pct-orig">' + r.vsOrigin.toFixed(1) + '% Origin</span>' +
            '  </div>' +
            '  <div class="labs-chain-ledger-btns">' +
            '    <button type="button" class="labs-btn-ghost labs-btn-xs" data-ledger-play="' + (r.index - 1) + '">▶</button>' +
            '    <button type="button" class="labs-btn labs-btn-blue labs-btn-xs" data-ledger-inspect="' + (r.index - 1) + '">🔬</button>' +
            '  </div>' +
            '</div>'
          );
        })
        .join('');

      ledger.innerHTML = origHtml + linksHtml;

      ledger.querySelectorAll('[data-ledger-play]').forEach(function (b) {
        b.addEventListener('click', function () {
          var arg = this.getAttribute('data-ledger-play');
          var Audio = root.TootApp && root.TootApp.Audio;
          if (!Audio) return;
          if (arg === 'orig') {
            Audio.playSound(ch.origin.samples, ch.origin.sampleRate, { channel: 'chain_ledger' });
          } else {
            var lnk = ch.links[parseInt(arg, 10)];
            if (lnk) Audio.playSound(lnk.samples, lnk.sampleRate, { channel: 'chain_ledger' });
          }
        });
      });

      ledger.querySelectorAll('[data-ledger-inspect]').forEach(function (b) {
        b.addEventListener('click', function () {
          var idx = parseInt(this.getAttribute('data-ledger-inspect'), 10);
          var lnk = ch.links[idx];
          if (!lnk || !chainState.deps || typeof chainState.deps.openComparePair !== 'function') return;
          chainState.deps.openComparePair(
            ch.origin,
            lnk,
            'Gen 0: ' + ch.origin.name,
            'Gen ' + (idx + 1) + ': ' + lnk.playerName
          );
        });
      });
    }
  }

  function openChainAnalysis(chainId) {
    chainState.activeChainId = chainId;
    setPane('analysis');
    renderAnalysisPane();
  }

  function startLiveRecording(kind) {
    var Audio = root.TootApp && root.TootApp.Audio;
    if (!Audio) return;
    if (Audio.isRecordingOrStarting && Audio.isRecordingOrStarting()) {
      if (chainState.recKind === kind && Audio.isRecording && Audio.isRecording()) {
        Audio.stopRecording();
      }
      return;
    }

    var isOrigin = kind === 'origin';
    var btn = isOrigin ? $('btn-chain-rec-origin') : $('btn-chain-rec-mimic');
    var waveCanvas = isOrigin ? $('chain-origin-wave') : $('chain-live-wave');
    var statusEl = isOrigin ? $('chain-origin-rec-status') : $('chain-mimic-status');
    var settled = false;
    chainState.recKind = kind;

    if (waveCanvas) waveCanvas.classList.remove('hidden');
    if (statusEl) {
      statusEl.classList.remove('hidden');
      statusEl.textContent = 'Starting microphone…';
    }

    function finish(res) {
      if (settled) return;
      settled = true;
      chainState.recKind = null;
      if (btn) btn.classList.remove('recording');
      if (!res || !res.ok || !(res.clippedSamples || res.samples)) {
        if (btn) btn.textContent = isOrigin ? '🎤 Record Live Original' : '🎤 Record Your Mimic';
        if (statusEl) statusEl.textContent = (res && res.message) || 'No sound detected — try again.';
        return;
      }
      var samples = res.clippedSamples || res.samples;
      var sr = res.sampleRate || 44100;
      if (isOrigin) {
        chainState.pendingOrigin = {
          name: 'Live Original (' + (samples.length / sr).toFixed(2) + 's)',
          sampleId: null,
          sampleRate: sr,
          samples: cloneFloat32(samples)
        };
        if (btn) btn.textContent = '🔁 Re-record Live Original';
        if (statusEl) statusEl.textContent = 'Live origin captured (' + (samples.length / sr).toFixed(2) + 's) — ready to create chain!';
        if (waveCanvas) drawStaticWave(waveCanvas, samples, null);
      } else {
        chainState.pendingMimic = {
          sampleRate: sr,
          samples: cloneFloat32(samples)
        };
        if (statusEl) statusEl.textContent = 'Mimic recorded (' + (samples.length / sr).toFixed(2) + 's). Preview or Lock & Save!';
        if (waveCanvas) drawStaticWave(waveCanvas, samples, null);
        renderPassPane();
      }
    }

    Audio.startRecording({
      maxDurationSec: 7,
      onStarted: function () {
        if (btn) {
          btn.classList.add('recording');
          btn.textContent = '⏹ Stop Recording';
        }
        if (statusEl) statusEl.textContent = 'Recording… toot or mimic now!';
      },
      onLevel: function (timeData, rms, elapsed) {
        if (chainState.deps && typeof chainState.deps.drawLiveWaveform === 'function' && waveCanvas) {
          chainState.deps.drawLiveWaveform(waveCanvas, timeData, rms);
        }
        if (statusEl) statusEl.textContent = 'Recording ' + elapsed.toFixed(1) + 's — tap Stop when done';
      },
      onAutoStop: finish
    }).catch(function (err) {
      finish({ ok: false, message: (err && err.message) || 'Microphone unavailable.' });
    });
  }

  function bindUiEvents() {
    if (chainState._bound) return;
    chainState._bound = true;

    if ($('btn-chain-back')) {
      $('btn-chain-back').addEventListener('click', function () {
        var Audio = root.TootApp && root.TootApp.Audio;
        if (Audio && Audio.isRecording && Audio.isRecording()) Audio.stopRecording();
        if (Audio && Audio.stopAll) Audio.stopAll();
        if (chainState.pane !== 'lobby') {
          chainState.pane = 'lobby';
          renderLobby();
        } else if (chainState.deps && typeof chainState.deps.onExit === 'function') {
          chainState.deps.onExit();
        }
      });
    }

    if ($('btn-chain-rand-seed')) {
      $('btn-chain-rand-seed').addEventListener('click', function () {
        chainState.pendingOrigin = null;
        if ($('chain-origin-rec-status')) $('chain-origin-rec-status').classList.add('hidden');
        if ($('chain-origin-wave')) $('chain-origin-wave').classList.add('hidden');
        var sel = $('chain-seed-select');
        if (sel && sel.options.length > 0) {
          sel.selectedIndex = Math.floor(Math.random() * sel.options.length);
        }
      });
    }

    if ($('chain-seed-select')) {
      $('chain-seed-select').addEventListener('change', function () {
        chainState.pendingOrigin = null;
        if ($('chain-origin-rec-status')) $('chain-origin-rec-status').classList.add('hidden');
        if ($('chain-origin-wave')) $('chain-origin-wave').classList.add('hidden');
      });
    }

    if ($('btn-chain-rec-origin')) {
      $('btn-chain-rec-origin').addEventListener('click', function () {
        startLiveRecording('origin');
      });
    }

    if ($('btn-chain-create')) {
      $('btn-chain-create').addEventListener('click', function () {
        var titleInp = $('chain-title-input');
        var title = titleInp && titleInp.value ? titleInp.value.trim() : '';

        function launchWithOrigin(orig) {
          if (!orig || !orig.samples || orig.samples.length === 0) {
            if (chainState.deps && chainState.deps.showToast) {
              chainState.deps.showToast('Pick a Vault specimen or record a live sound first.', true);
            }
            return;
          }
          var newChain = {
            id: 'chain_' + Date.now() + '_' + Math.floor(Math.random() * 999),
            title: title || (orig.name + ' Relay'),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            origin: {
              id: orig.sampleId || ('orig_' + Date.now()),
              name: orig.name,
              displayName: orig.name,
              sampleId: orig.sampleId || null,
              sampleRate: orig.sampleRate || 44100,
              samples: cloneFloat32(orig.samples),
              features: null
            },
            links: []
          };
          chainState.pendingOrigin = null;
          if (titleInp) titleInp.value = '';
          saveChain(newChain).then(function () {
            chainState.chains.unshift(newChain);
            renderSavedChainsList();
            openChainPass(newChain.id);
          });
        }

        if (chainState.pendingOrigin && chainState.pendingOrigin.samples) {
          launchWithOrigin(chainState.pendingOrigin);
          return;
        }

        var sel = $('chain-seed-select');
        var sampleId = sel ? sel.value : null;
        var samples = (chainState.deps && chainState.deps.getSamples && chainState.deps.getSamples()) || [];
        var matched = null;
        for (var i = 0; i < samples.length; i++) {
          if (samples[i].id === sampleId) { matched = samples[i]; break; }
        }
        if (!matched) matched = samples[0] || null;
        if (!matched) {
          launchWithOrigin(null);
          return;
        }

        var loadFn = chainState.deps && chainState.deps.ensureTargetReady;
        (loadFn ? loadFn(matched) : Promise.resolve(matched)).then(function (ready) {
          var sName = chainState.deps && chainState.deps.getSampleName ? chainState.deps.getSampleName(ready) : (ready.displayName || ready.name || 'Archive Specimen');
          launchWithOrigin({
            name: sName,
            sampleId: ready.id,
            sampleRate: ready.sampleRate || 44100,
            samples: ready.samples
          });
        });
      });
    }

    if ($('btn-chain-to-lobby')) {
      $('btn-chain-to-lobby').addEventListener('click', function () {
        var Audio = root.TootApp && root.TootApp.Audio;
        if (Audio && Audio.stopAll) Audio.stopAll();
        renderLobby();
      });
    }

    if ($('btn-chain-save-pause')) {
      $('btn-chain-save-pause').addEventListener('click', function () {
        var ch = getActiveChain();
        var done = function () {
          renderLobby();
          if (chainState.deps && chainState.deps.showToast) {
            chainState.deps.showToast('Chain saved! Resume anytime when you meet someone to continue.');
          }
        };
        if (ch) saveChain(ch).then(done);
        else done();
      });
    }

    if ($('btn-chain-play-prev')) {
      $('btn-chain-play-prev').addEventListener('click', function () {
        var ch = getActiveChain();
        if (!ch) return;
        var prevSound = ch.links && ch.links.length > 0 ? ch.links[ch.links.length - 1] : ch.origin;
        var Audio = root.TootApp && root.TootApp.Audio;
        if (!Audio || !prevSound || !prevSound.samples) return;
        Audio.playSound(prevSound.samples, prevSound.sampleRate, {
          channel: 'chain_prev',
          onProgress: function (p) { drawStaticWave($('chain-prev-wave'), prevSound.samples, p); },
          onEnded: function () { drawStaticWave($('chain-prev-wave'), prevSound.samples, null); }
        });
      });
    }

    if ($('btn-chain-rec-mimic')) {
      $('btn-chain-rec-mimic').addEventListener('click', function () {
        startLiveRecording('mimic');
      });
    }

    if ($('btn-chain-preview-mimic')) {
      $('btn-chain-preview-mimic').addEventListener('click', function () {
        var pm = chainState.pendingMimic;
        var Audio = root.TootApp && root.TootApp.Audio;
        if (!pm || !pm.samples || !Audio) return;
        Audio.playSound(pm.samples, pm.sampleRate, {
          channel: 'chain_preview',
          onProgress: function (p) { drawStaticWave($('chain-live-wave'), pm.samples, p); },
          onEnded: function () { drawStaticWave($('chain-live-wave'), pm.samples, null); }
        });
      });
    }

    if ($('btn-chain-lock-mimic')) {
      $('btn-chain-lock-mimic').addEventListener('click', function () {
        var ch = getActiveChain();
        var pm = chainState.pendingMimic;
        if (!ch || !pm || !pm.samples) return;
        var nameInp = $('chain-player-input');
        var typed = nameInp && nameInp.value ? nameInp.value.trim() : '';
        var nextIdx = (ch.links ? ch.links.length : 0) + 1;
        var pName = typed || ('Subject #' + nextIdx);
        var lnk = {
          id: 'lnk_' + Date.now() + '_' + Math.floor(Math.random() * 999),
          playerName: pName,
          name: pName,
          displayName: pName,
          createdAt: Date.now(),
          sampleRate: pm.sampleRate || 44100,
          samples: cloneFloat32(pm.samples),
          features: null
        };
        ch.links.push(lnk);
        chainState.pendingMimic = null;
        if ($('chain-mimic-status')) $('chain-mimic-status').classList.add('hidden');
        if ($('chain-live-wave')) $('chain-live-wave').classList.add('hidden');
        saveChain(ch).then(function () {
          renderPassPane();
          if (chainState.deps && chainState.deps.showToast) {
            chainState.deps.showToast(pName + ' locked! Chain tally: ' + ch.links.length + ' mimic' + (ch.links.length === 1 ? '' : 's') + '.');
          }
        });
      });
    }

    if ($('btn-chain-quick-orig-final')) {
      $('btn-chain-quick-orig-final').addEventListener('click', function () {
        if (chainState.activeChainId) playOrigAndFinal(chainState.activeChainId);
      });
    }

    if ($('btn-chain-play-all')) {
      $('btn-chain-play-all').addEventListener('click', function () {
        if (chainState.activeChainId) playFullChain(chainState.activeChainId);
      });
    }

    if ($('btn-chain-open-analysis')) {
      $('btn-chain-open-analysis').addEventListener('click', function () {
        if (chainState.activeChainId) openChainAnalysis(chainState.activeChainId);
      });
    }

    if ($('btn-chain-ana-orig-final')) {
      $('btn-chain-ana-orig-final').addEventListener('click', function () {
        if (chainState.activeChainId) playOrigAndFinal(chainState.activeChainId);
      });
    }

    if ($('btn-chain-ana-play-all')) {
      $('btn-chain-ana-play-all').addEventListener('click', function () {
        if (chainState.activeChainId) playFullChain(chainState.activeChainId);
      });
    }

    if ($('btn-chain-ana-stop')) {
      $('btn-chain-ana-stop').addEventListener('click', function () {
        if (root.TootApp && root.TootApp.Audio) root.TootApp.Audio.stopAll();
      });
    }

    if ($('btn-chain-ana-continue')) {
      $('btn-chain-ana-continue').addEventListener('click', function () {
        if (chainState.activeChainId) openChainPass(chainState.activeChainId);
      });
    }

    if ($('btn-chain-ana-lobby')) {
      $('btn-chain-ana-lobby').addEventListener('click', function () {
        if (root.TootApp && root.TootApp.Audio) root.TootApp.Audio.stopAll();
        renderLobby();
      });
    }
  }

  function renderLobby() {
    setPane('lobby');
    populateSeedSelect();
    loadChains().then(renderSavedChainsList);
  }

  function init(deps) {
    chainState.deps = deps || {};
    bindUiEvents();
  }

  function openView(deps) {
    if (deps) chainState.deps = deps;
    bindUiEvents();
    if (chainState.deps && typeof chainState.deps.showView === 'function') {
      chainState.deps.showView('chain');
    }
    renderLobby();
  }

  function getSavedCount() {
    return (chainState.chains && chainState.chains.length) || 0;
  }

  function resize() {
    if (chainState.pane === 'analysis' && chainState.cachedAnalysis) {
      drawDecayCurve($('chain-decay-canvas'), chainState.cachedAnalysis);
    }
  }

  TootLabs.SignalChain = {
    init: init,
    openView: openView,
    loadChains: loadChains,
    analyzeChain: analyzeChain,
    getSavedCount: getSavedCount,
    resize: resize
  };
})(typeof window !== 'undefined' ? window : globalThis);
