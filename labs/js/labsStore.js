(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var META_STORAGE_KEY = 'toot_match_labs_meta_v2';
  var ATTEMPTS_DB_NAME = 'FartGuessLabsAttemptsDB';
  var ATTEMPTS_DB_VER = 1;
  var ATTEMPTS_STORE = 'attempts';

  var SPECIMEN_NICKNAMES = [
    'Seattle Thunder',
    'The Diplomat',
    'Conference Call Incident',
    'Silent But Verified',
    'Midnight Regret',
    'Thunder Goose',
    'The Brown Note',
    'The Tuesday Incident',
    'Corporate Disaster',
    'Submarine Ping',
    'Brass Anomaly',
    'Elevator Protocol',
    'Project Mayhem',
    'Acoustic Mirage',
    'Boardroom Earthquake',
    'Tectonic Whisper',
    'Velvet Foghorn',
    'Protocol Zero',
    'Barometric Spike',
    'Turbo Bassoon',
    'Thermal Release',
    'Stealth Hornet',
    'Canyon Echo',
    'Pressure Valve #9',
    'Classified Brass',
    'Sonic Boomstick',
    'The Quarterly Report',
    'Diplomatic Immunity',
    'Aftershock Echo',
    'Chamber Resonance'
  ];

  var LEGENDARY_TITLES = [
    'MOUTH FART CHAMPION',
    'LEGENDARY MIMIC',
    'CERTIFIED CHEEK IMPERSONATOR',
    'MASTER OF RESONANCE',
    'PRESSURE LORD',
    'THUNDER SUMMONER',
    'GRAND FLATULENCE MASTER',
    'AIRFLOW ARCHITECT',
    'ACOUSTIC GENIUS'
  ];

  var memoryMeta = {
    totalChallenges: 0,
    scoreSum: 0,
    nextNickIndex: 0,
    samples: {}
  };

  var memoryAttempts = new Map();

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function safeNum(v, fallback) {
    return typeof v === 'number' && Number.isFinite(v) ? v : (fallback || 0);
  }

  function loadMeta() {
    try {
      var raw = root.localStorage ? root.localStorage.getItem(META_STORAGE_KEY) : null;
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryMeta.totalChallenges = safeNum(parsed.totalChallenges, 0);
          memoryMeta.scoreSum = safeNum(parsed.scoreSum, 0);
          memoryMeta.nextNickIndex = safeNum(parsed.nextNickIndex, 0);
          memoryMeta.samples = parsed.samples && typeof parsed.samples === 'object' ? parsed.samples : {};
        }
      }
    } catch (e) {
      // Ignore storage read errors
    }
    return memoryMeta;
  }

  function persistMeta() {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(memoryMeta));
      }
    } catch (e) {
      // Ignore storage write errors
    }
  }

  function hashString(str) {
    var h = 2166136261;
    var s = String(str || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function isGenericSampleName(name) {
    var n = String(name || '').trim();
    if (!n) return true;
    return /^Fart\s*#\d+$/i.test(n) || /^Custom Toot$/i.test(n);
  }

  function pickUniqueNickname(seedKey) {
    var meta = loadMeta();
    var used = {};
    var keys = Object.keys(meta.samples);
    for (var i = 0; i < keys.length; i++) {
      var nick = meta.samples[keys[i]] && meta.samples[keys[i]].nickname;
      if (nick) used[nick] = true;
    }

    var startIdx = seedKey ? hashString(seedKey) % SPECIMEN_NICKNAMES.length : meta.nextNickIndex % SPECIMEN_NICKNAMES.length;
    for (var offset = 0; offset < SPECIMEN_NICKNAMES.length; offset++) {
      var candidate = SPECIMEN_NICKNAMES[(startIdx + offset) % SPECIMEN_NICKNAMES.length];
      if (!used[candidate]) {
        meta.nextNickIndex++;
        return candidate;
      }
    }
    meta.nextNickIndex++;
    return 'Specimen #' + String(meta.nextNickIndex).padStart(2, '0');
  }

  function ensureSampleMeta(sound) {
    var meta = loadMeta();
    if (!sound || !sound.id) return null;
    var rec = meta.samples[sound.id];
    var changed = false;
    if (!rec) {
      rec = {
        nickname: isGenericSampleName(sound.name) ? pickUniqueNickname(sound.id) : sound.name,
        bestScore: 0,
        previousScore: null,
        latestScore: null,
        attemptCount: 0,
        lastAttemptAt: null
      };
      meta.samples[sound.id] = rec;
      changed = true;
    } else if (!rec.nickname) {
      rec.nickname = isGenericSampleName(sound.name) ? pickUniqueNickname(sound.id) : sound.name;
      changed = true;
    } else if (!isGenericSampleName(sound.name) && rec.nickname !== sound.name && rec.customRenamed !== true) {
      // Respect user-chosen name from classic/external edit
      rec.nickname = sound.name;
      changed = true;
    }

    if (changed) persistMeta();
    sound.displayName = rec.nickname;
    return rec;
  }

  function ensureNickname(sound) {
    var rec = ensureSampleMeta(sound);
    return rec ? rec.nickname : (sound && sound.name) || 'Specimen';
  }

  function generateNewSpecimenName() {
    return pickUniqueNickname('new_' + Date.now() + '_' + Math.random());
  }

  function computeExactScore(result) {
    if (!result) return 0;
    var raw =
      result.breakdown &&
      result.breakdown.overall &&
      typeof result.breakdown.overall.rawOverall === 'number' &&
      Number.isFinite(result.breakdown.overall.rawOverall)
        ? result.breakdown.overall.rawOverall
        : safeNum(result.overall, 0);
    return Math.round(clamp(raw, 0, 100) * 10) / 10;
  }

  function getRankForScore(score) {
    var s = clamp(safeNum(score, 0), 0, 100);
    if (s < 20) {
      return {
        title: 'Unclassified',
        tier: 0,
        color: '#9CA3AF',
        desc: 'Signal variance exceeds classification tolerance. Re-calibration advised.'
      };
    }
    if (s < 40) {
      return {
        title: 'Novice',
        tier: 1,
        color: '#FB7185',
        desc: 'Rudimentary harmonic alignment detected. Fundamental airflow diverges.'
      };
    }
    if (s < 60) {
      return {
        title: 'Capable',
        tier: 2,
        color: '#F97316',
        desc: 'Recognizable envelope contour with moderate tonal or burst drift.'
      };
    }
    if (s < 80) {
      return {
        title: 'Skilled',
        tier: 3,
        color: '#60A5FA',
        desc: 'Competent acoustic reconstruction across primary resonance bands.'
      };
    }
    if (s < 90) {
      return {
        title: 'Expert',
        tier: 4,
        color: '#22C55E',
        desc: 'High-precision vocal tract resonance modeling and flutter locking.'
      };
    }
    if (s < 95) {
      return {
        title: 'Elite',
        tier: 5,
        color: '#8B5CF6',
        desc: 'Laboratory-grade spectral contour and pressure decay fidelity.'
      };
    }
    return {
      title: 'Legendary',
      tier: 6,
      color: '#FACC15',
      desc: 'Reference-grade biomechanical acoustic parity achieved.'
    };
  }

  function getRewardTier(score) {
    var s = clamp(safeNum(score, 0), 0, 100);
    if (s < 40) return { bells: 1, stars: 1, label: 'Poor Match' };
    if (s < 60) return { bells: 2, stars: 2, label: 'Fair Match' };
    if (s < 80) return { bells: 3, stars: 3, label: 'Good Match' };
    if (s < 95) return { bells: 4, stars: 4, label: 'Excellent Match' };
    return { bells: 5, stars: 5, label: 'Legendary Match' };
  }

  function pickLegendaryTitle() {
    var idx = Math.floor(Math.random() * LEGENDARY_TITLES.length);
    return LEGENDARY_TITLES[idx];
  }

  function buildScientificVerdict(soundA, soundB, result, exactScore) {
    var fA = (soundA && soundA.features) || {};
    var fB = (soundB && soundB.features) || {};
    var score = typeof exactScore === 'number' ? exactScore : computeExactScore(result);
    var pitchA = fA.voicedRatio >= 0.25 && fA.medianPitchHz > 0 ? Math.round(fA.medianPitchHz) + ' Hz' : Math.round(safeNum(fA.spectralCentroidHz, 220)) + ' Hz centroid';
    var pitchB = fB.voicedRatio >= 0.25 && fB.medianPitchHz > 0 ? Math.round(fB.medianPitchHz) + ' Hz' : Math.round(safeNum(fB.spectralCentroidHz, 220)) + ' Hz centroid';
    var durA = safeNum(fA.duration, 0).toFixed(2) + 's';
    var durB = safeNum(fB.duration, 0).toFixed(2) + 's';
    var envScore = safeNum(result && result.envelopeScore, 0);
    var timScore = safeNum(result && result.timbreScore, 0);
    var modScore = safeNum(result && result.modulationScore, 0);

    if (score >= 95) {
      return (
        'Match confidence is exceptionally high (' +
        score.toFixed(1) +
        '%). Acoustic signatures are nearly indistinguishable across fundamental resonance (' +
        pitchB +
        ' vs ' +
        pitchA +
        ') and ' +
        durB +
        ' blast topology.'
      );
    }
    if (score >= 85) {
      var weakness =
        envScore <= timScore && envScore <= modScore
          ? 'terminal airflow release decay'
          : modScore <= timScore
          ? 'micro-flutter cadence'
          : 'upper harmonic overtones';
      return (
        'The challenger successfully recreated the primary resonance event (' +
        pitchB +
        ' against ' +
        pitchA +
        ' reference). Minor deviations detected during ' +
        weakness +
        '.'
      );
    }
    if (score >= 70) {
      return (
        'The laboratory observed strong tonal alignment and above-average pressure similarity across ' +
        durB +
        ' vs ' +
        durA +
        ' duration windows. Refinement of timbre (' +
        timScore +
        '%) could elevate classification tier.'
      );
    }
    if (score >= 50) {
      return (
        'Moderate structural correlation logged: primary centroid tracked ' +
        pitchB +
        ' against the ' +
        pitchA +
        ' baseline, while envelope dynamics (' +
        envScore +
        '%) and flutter modulation (' +
        modScore +
        '%) diverged mid-event.'
      );
    }
    return (
      'Forensic telemetry indicates substantial acoustic divergence between challenger emission (' +
      pitchB +
      ', ' +
      durB +
      ') and stored reference (' +
      pitchA +
      ', ' +
      durA +
      '). Recommend recalibrating embouchure tightness and airflow duration.'
    );
  }

  /* ==================== ATTEMPTS INDEXEDDB ==================== */
  function openAttemptsDB() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      try {
        var req = indexedDB.open(ATTEMPTS_DB_NAME, ATTEMPTS_DB_VER);
        req.onupgradeneeded = function (ev) {
          var db = ev.target.result;
          if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) {
            var store = db.createObjectStore(ATTEMPTS_STORE, { keyPath: 'id' });
            store.createIndex('sampleId', 'sampleId', { unique: false });
          }
        };
        req.onsuccess = function (ev) {
          resolve(ev.target.result);
        };
        req.onerror = function (ev) {
          reject(ev.target.error || new Error('Failed opening attempts DB'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  function hydrateAttempt(rec) {
    if (!rec) return null;
    var samples = rec.samples instanceof Float32Array ? rec.samples : new Float32Array(rec.samples || []);
    var sr = rec.sampleRate || 44100;
    var features =
      rec.features && rec.features.pitchHzArr
        ? rec.features
        : root.TootApp && root.TootApp.DSP && samples.length > 0
        ? root.TootApp.DSP.extractFeatures(samples, sr)
        : null;
    return Object.assign({}, rec, {
      samples: samples,
      sampleRate: sr,
      features: features
    });
  }

  function serializeAttempt(att) {
    return {
      id: att.id,
      sampleId: att.sampleId,
      name: att.name,
      emoji: att.emoji || '🎤',
      attemptNum: att.attemptNum,
      createdAt: att.createdAt || Date.now(),
      sampleRate: att.sampleRate || 44100,
      samples: new Float32Array(att.samples || []),
      clipInfo: att.clipInfo || null,
      exactScore: att.exactScore,
      stars: att.stars,
      bellLabel: att.bellLabel,
      rankTitle: att.rankTitle,
      legendaryTitle: att.legendaryTitle || null,
      verdict: att.verdict || '',
      isPersonalBest: Boolean(att.isPersonalBest),
      prevBestScore: att.prevBestScore || 0,
      result: att.result || null
    };
  }

  function saveAttemptRecord(att) {
    var payload = serializeAttempt(att);
    var hydrated = hydrateAttempt(payload);
    memoryAttempts.set(hydrated.id, hydrated);

    return openAttemptsDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(ATTEMPTS_STORE, 'readwrite');
          var store = tx.objectStore(ATTEMPTS_STORE);
          var req = store.put(payload);
          req.onsuccess = function () {
            resolve(hydrated);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      })
      .catch(function () {
        return hydrated;
      });
  }

  function loadAttemptsForSample(sampleId) {
    if (!sampleId) return Promise.resolve([]);
    return openAttemptsDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(ATTEMPTS_STORE, 'readonly');
          var store = tx.objectStore(ATTEMPTS_STORE);
          var idx = store.index('sampleId');
          var req = idx.getAll(sampleId);
          req.onsuccess = function () {
            var list = (req.result || []).map(hydrateAttempt).filter(Boolean);
            list.sort(function (a, b) {
              return (b.createdAt || 0) - (a.createdAt || 0);
            });
            list.forEach(function (item) {
              memoryAttempts.set(item.id, item);
            });
            resolve(list);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      })
      .catch(function () {
        var rows = [];
        memoryAttempts.forEach(function (val) {
          if (val.sampleId === sampleId) rows.push(val);
        });
        rows.sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        return rows;
      });
  }

  function deleteAttemptsForSample(sampleId) {
    if (!sampleId) return Promise.resolve(true);
    memoryAttempts.forEach(function (val, key) {
      if (val.sampleId === sampleId) memoryAttempts.delete(key);
    });
    return loadAttemptsForSample(sampleId)
      .then(function (rows) {
        if (rows.length === 0) return true;
        return openAttemptsDB().then(function (db) {
          return new Promise(function (resolve) {
            var tx = db.transaction(ATTEMPTS_STORE, 'readwrite');
            var store = tx.objectStore(ATTEMPTS_STORE);
            rows.forEach(function (r) {
              store.delete(r.id);
            });
            tx.oncomplete = function () { resolve(true); };
            tx.onerror = function () { resolve(true); };
          });
        });
      })
      .catch(function () {
        return true;
      });
  }

  /* ==================== HIGH-LEVEL VAULT OPERATIONS ==================== */
  function loadVaultSamples() {
    var storage = root.TootApp && root.TootApp.Storage;
    if (!storage) return Promise.resolve([]);
    return storage.loadCustomSounds().then(function (list) {
      var rows = (list || []).slice();
      for (var i = 0; i < rows.length; i++) {
        ensureSampleMeta(rows[i]);
      }
      return rows;
    });
  }

  function saveNewSpecimen(recResult) {
    var storage = root.TootApp && root.TootApp.Storage;
    if (!storage) return Promise.reject(new Error('Storage unavailable'));
    var nickname = generateNewSpecimenName();
    var sr = recResult.sampleRate || 44100;
    var samples = recResult.clippedSamples;
    var toSave = {
      id: 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: nickname,
      emoji: '💨',
      description: 'Specimen logged (' + (samples.length / sr).toFixed(2) + 's).',
      createdAt: Date.now(),
      sampleRate: sr,
      rawSamples: recResult.rawSamples || samples,
      trimStartSec: recResult.clipInfo ? recResult.clipInfo.startSec : 0,
      trimEndSec: recResult.clipInfo ? recResult.clipInfo.endSec : samples.length / sr,
      samples: samples
    };
    return storage.saveCustomSound(toSave).then(function (saved) {
      var meta = loadMeta();
      meta.samples[saved.id] = {
        nickname: nickname,
        customRenamed: true,
        bestScore: 0,
        previousScore: null,
        latestScore: null,
        attemptCount: 0,
        lastAttemptAt: null
      };
      persistMeta();
      saved.displayName = nickname;
      saved.clipInfo = recResult.clipInfo;
      return saved;
    });
  }

  function renameSample(sound, nextName) {
    var storage = root.TootApp && root.TootApp.Storage;
    var clean = String(nextName || '').trim();
    if (!sound || !clean) return Promise.resolve(sound);

    var meta = loadMeta();
    var rec = ensureSampleMeta(sound) || {};
    rec.nickname = clean;
    rec.customRenamed = true;
    meta.samples[sound.id] = rec;
    persistMeta();

    sound.name = clean;
    sound.displayName = clean;

    if (!storage) return Promise.resolve(sound);
    return storage.saveCustomSound(sound).then(function (saved) {
      saved.displayName = clean;
      return saved;
    });
  }

  function deleteSample(sampleId) {
    var storage = root.TootApp && root.TootApp.Storage;
    var meta = loadMeta();
    if (meta.samples[sampleId]) {
      delete meta.samples[sampleId];
      persistMeta();
    }
    return Promise.all([
      storage ? storage.deleteCustomSound(sampleId) : Promise.resolve(true),
      deleteAttemptsForSample(sampleId)
    ]).then(function () {
      return true;
    });
  }

  function recordChallengeResult(soundA, attemptSound, result) {
    var storage = root.TootApp && root.TootApp.Storage;
    var meta = loadMeta();
    var sampleMeta = ensureSampleMeta(soundA);
    var prevBest = safeNum(sampleMeta.bestScore, 0);
    var prevLatest = typeof sampleMeta.latestScore === 'number' ? sampleMeta.latestScore : null;
    var exactScore = computeExactScore(result);
    var rank = getRankForScore(exactScore);
    var reward = getRewardTier(exactScore);
    var legendaryTitle = reward.stars === 5 ? pickLegendaryTitle() : null;
    var verdict = buildScientificVerdict(soundA, attemptSound, result, exactScore);
    var isPersonalBest = exactScore > prevBest;
    var nextAttemptNum = (sampleMeta.attemptCount || 0) + 1;

    sampleMeta.previousScore = prevLatest;
    sampleMeta.latestScore = exactScore;
    sampleMeta.attemptCount = nextAttemptNum;
    sampleMeta.lastAttemptAt = Date.now();
    if (exactScore > sampleMeta.bestScore) {
      sampleMeta.bestScore = exactScore;
    }

    meta.totalChallenges = (meta.totalChallenges || 0) + 1;
    meta.scoreSum = (meta.scoreSum || 0) + exactScore;
    persistMeta();

    if (storage && typeof storage.recordScore === 'function') {
      storage.recordScore(soundA.id, Math.round(exactScore));
    }

    var attemptObj = {
      id: attemptSound.id || ('att_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      sampleId: soundA.id,
      name: 'Attempt #' + nextAttemptNum,
      emoji: '🎤',
      attemptNum: nextAttemptNum,
      createdAt: Date.now(),
      sampleRate: attemptSound.sampleRate || 44100,
      samples: attemptSound.samples,
      clipInfo: attemptSound.clipInfo || null,
      exactScore: exactScore,
      stars: reward.stars,
      bellLabel: reward.label,
      rankTitle: rank.title,
      legendaryTitle: legendaryTitle,
      verdict: verdict,
      isPersonalBest: isPersonalBest,
      prevBestScore: prevBest,
      previousScore: prevLatest,
      result: result
    };

    return saveAttemptRecord(attemptObj).then(function (savedAtt) {
      savedAtt.features = attemptSound.features || savedAtt.features;
      return {
        attempt: savedAtt,
        exactScore: exactScore,
        rank: rank,
        reward: reward,
        legendaryTitle: legendaryTitle,
        verdict: verdict,
        isPersonalBest: isPersonalBest,
        prevBestScore: prevBest,
        previousScore: prevLatest,
        sampleStats: getSampleStats(soundA.id)
      };
    });
  }

  function getSampleStats(sampleId) {
    var meta = loadMeta();
    var rec = meta.samples[sampleId] || null;
    if (!rec) {
      return {
        sampleId: sampleId,
        nickname: 'Unknown Specimen',
        bestScore: 0,
        previousScore: null,
        latestScore: null,
        attemptCount: 0,
        lastAttemptAt: null
      };
    }
    return Object.assign({ sampleId: sampleId }, rec);
  }

  function getSummaryStats(samplesList) {
    var meta = loadMeta();
    var list = samplesList || [];
    var bestMatch = 0;
    for (var i = 0; i < list.length; i++) {
      var st = meta.samples[list[i].id];
      if (st && st.bestScore > bestMatch) {
        bestMatch = st.bestScore;
      }
    }
    var keys = Object.keys(meta.samples);
    for (var k = 0; k < keys.length; k++) {
      var m = meta.samples[keys[k]];
      if (m && m.bestScore > bestMatch) {
        bestMatch = m.bestScore;
      }
    }
    var storageBest = 0;
    if (root.TootApp && root.TootApp.Storage && typeof root.TootApp.Storage.getStats === 'function') {
      storageBest = safeNum(root.TootApp.Storage.getStats().bestOverall, 0);
    }
    if (storageBest > bestMatch) bestMatch = storageBest;

    var avg = meta.totalChallenges > 0 ? Math.round((meta.scoreSum / meta.totalChallenges) * 10) / 10 : 0;
    return {
      samplesRecorded: list.length,
      bestMatchScore: Math.round(bestMatch * 10) / 10,
      challengesCompleted: meta.totalChallenges || 0,
      averageMatchQuality: avg
    };
  }

  TootLabs.Store = {
    SPECIMEN_NICKNAMES: SPECIMEN_NICKNAMES,
    LEGENDARY_TITLES: LEGENDARY_TITLES,
    ensureNickname: ensureNickname,
    computeExactScore: computeExactScore,
    getRankForScore: getRankForScore,
    getRewardTier: getRewardTier,
    pickLegendaryTitle: pickLegendaryTitle,
    buildScientificVerdict: buildScientificVerdict,
    loadVaultSamples: loadVaultSamples,
    saveNewSpecimen: saveNewSpecimen,
    renameSample: renameSample,
    deleteSample: deleteSample,
    recordChallengeResult: recordChallengeResult,
    loadAttemptsForSample: loadAttemptsForSample,
    getSampleStats: getSampleStats,
    getSummaryStats: getSummaryStats
  };
})(typeof window !== 'undefined' ? window : globalThis);
