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
        desc: 'Acoustic signature bears no legal resemblance to the crime scene. Did you even try?'
      };
    }
    if (s < 40) {
      return {
        title: 'Novice',
        tier: 1,
        color: '#FB7185',
        desc: 'Courageous cheek effort, wildly wrong frequency band. Back to the wind tunnel.'
      };
    }
    if (s < 60) {
      return {
        title: 'Capable',
        tier: 2,
        color: '#F97316',
        desc: 'Recognizable blast silhouette, though your mid-toot wobble wandered off-script.'
      };
    }
    if (s < 80) {
      return {
        title: 'Skilled',
        tier: 3,
        color: '#60A5FA',
        desc: 'Respectable vocal-tract forgery — close enough to fool a distracted bystander.'
      };
    }
    if (s < 90) {
      return {
        title: 'Expert',
        tier: 4,
        color: '#22C55E',
        desc: 'Uncanny cheek-flutter discipline and brass resonance. FBI audio labs are taking notes.'
      };
    }
    if (s < 95) {
      return {
        title: 'Elite',
        tier: 5,
        color: '#8B5CF6',
        desc: 'Alarmingly faithful bio-acoustic forgery. Almost indistinguishable in a blind elevator test.'
      };
    }
    return {
      title: 'Legendary',
      tier: 6,
      color: '#FACC15',
      desc: 'Reference-grade porcelain virtuosity. You have achieved peak human wind-instrument parity.'
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
    var Forensics = root.TootApp && root.TootApp.Forensics;
    var bonus =
      Forensics && typeof Forensics.computeBonusMetrics === 'function' && fA.bandProfile && fB.bandProfile
        ? Forensics.computeBonusMetrics(fA, fB)
        : null;
    var score = typeof exactScore === 'number' ? exactScore : computeExactScore(result);
    var pitchA = fA.voicedRatio >= 0.25 && fA.medianPitchHz > 0 ? Math.round(fA.medianPitchHz) + ' Hz' : Math.round(safeNum(fA.spectralCentroidHz, 220)) + ' Hz centroid';
    var pitchB = fB.voicedRatio >= 0.25 && fB.medianPitchHz > 0 ? Math.round(fB.medianPitchHz) + ' Hz' : Math.round(safeNum(fB.spectralCentroidHz, 220)) + ' Hz centroid';
    var durA = safeNum(fA.duration, 0).toFixed(2) + 's';
    var durB = safeNum(fB.duration, 0).toFixed(2) + 's';
    var envScore = safeNum(result && result.envelopeScore, 0);
    var timScore = safeNum(result && result.timbreScore, 0);
    var modScore = safeNum(result && result.modulationScore, 0);
    var resTitle = (result && result.title) || 'Acoustic Event';
    var grade = (result && result.grade) || 'B';
    var mrA = Math.round(safeNum(fA.modRateHz, 0));
    var bpmB = Math.round(safeNum(fB.modRateHz, 0) * 60);
    var firstTip = result && result.tips && result.tips.length > 0 ? result.tips[0] : '';
    var twinLine = bonus
      ? ' Acoustic doppelgängers mapped to ' + bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.short + ' vs ' + bonus.acoustics.twinB.emoji + ' ' + bonus.acoustics.twinB.short + '.'
      : '';
    var alibiLine = bonus
      ? ' Confined-room radar calls this a ' + bonus.social.b.radiusM.toFixed(1) + 'm blast ("' + bonus.wetness.labelB + '").'
      : '';

    if (score >= 95) {
      return (
        'Lab Verdict [' + resTitle + ', Grade ' + grade + ' — ' + score.toFixed(1) + '%]: Eerily forensic vocal-tract cloning! ' +
        'Your ' + durB + ' mimicry nailed the ' + pitchA + ' brass core (logging ' + pitchB + ' at ' + bpmB + ' cheek flaps/min) and matched the tail sputter well enough to fail a courtroom alibi.' +
        twinLine + alibiLine
      );
    }
    if (score >= 85) {
      var weakness =
        envScore <= timScore && envScore <= modScore
          ? 'terminal pressure decay ("trailing sputter discipline")'
          : modScore <= timScore
          ? 'cheek-flutter RPM (' + bpmB + ' flaps/min vs ' + (mrA * 60) + ' target)'
          : 'upholstery resonance & upper overtones';
      return (
        'Lab Verdict [' + resTitle + ', Grade ' + grade + ' — ' + score.toFixed(1) + '%]: Impressive acoustic impersonation! ' +
        'You locked onto the ' + pitchA + ' target with ' + pitchB + ' across ' + durB + ', losing only trace telemetry points during ' + weakness + '.' +
        twinLine + alibiLine
      );
    }
    if (score >= 70) {
      return (
        'Lab Verdict [' + resTitle + ', Grade ' + grade + ' — ' + score.toFixed(1) + '%]: Respectable room-fooling effort (' +
        pitchB + ' over ' + durB + ' vs ' + pitchA + ' / ' + durA + ').' +
        (firstTip ? ' Forensic note: ' + firstTip : '') +
        ' Tighten embouchure curvature to bump timbre (' + timScore + '%) into Master Blaster territory.' +
        twinLine
      );
    }
    if (score >= 50) {
      return (
        'Lab Verdict [' + resTitle + ', Grade ' + grade + ' — ' + score.toFixed(1) + '%]: Partial witness confusion achieved: your ' +
        pitchB + ' pass fluttered at ' + bpmB + ' flaps/min against the ' + pitchA + ' evidence, while pressure dynamics (' +
        envScore + '%) and wobble cadence (' + modScore + '%) wandered.' +
        (firstTip ? ' Primary divergence: ' + firstTip : '') +
        alibiLine
      );
    }
    return (
      'Lab Verdict [' + resTitle + ', Grade ' + grade + ' — ' + score.toFixed(1) + '%]: Total gastro-acoustic alibi failure! Your ' +
      durB + ' submission (' + pitchB + ', ' + bpmB + ' flaps/min) belongs to a completely different wind instrument than the ' +
      durA + ' (' + pitchA + ') exhibit.' +
      (firstTip ? ' Lab diagnosis: ' + firstTip : '') +
      twinLine
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

  function recordChallengeResult(soundA, attemptSound, result, opts) {
    opts = opts || {};
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
    var customGuesser = String(opts.guesserName || '').trim();
    var guesserLabel = customGuesser || 'Guesser ' + nextAttemptNum;

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
      name: guesserLabel,
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

  function renameAttempt(attemptObj, nextName) {
    var clean = String(nextName || '').trim();
    if (!attemptObj || !clean) return Promise.resolve(attemptObj);
    attemptObj.name = clean;
    return saveAttemptRecord(attemptObj);
  }

  /* ==================== MULTI-FART COHERENT MEGAMIX & REPORTS ==================== */
  var SEGMENT_COLORS = ['#22C55E', '#60A5FA', '#F97316', '#8B5CF6', '#FACC15', '#FB7185', '#34D399', '#38BDF8'];

  var GROUP_SORT_OPTIONS = [
    { key: 'pitch', label: 'Pitch (Hz)', unit: 'Hz' },
    { key: 'wetness', label: 'Wetness / Squelch (%)', unit: '%' },
    { key: 'duration', label: 'Duration (s)', unit: 's' },
    { key: 'crest', label: 'Loudness / Crest (dB)', unit: 'dB' },
    { key: 'radius', label: 'Blast Radius (m)', unit: 'm' },
    { key: 'flutter', label: 'Flutter Rate (Hz)', unit: 'Hz' },
    { key: 'date', label: 'Date Recorded', unit: '' }
  ];

  function getGroupSortMeta(sortKey) {
    for (var i = 0; i < GROUP_SORT_OPTIONS.length; i++) {
      if (GROUP_SORT_OPTIONS[i].key === sortKey) return GROUP_SORT_OPTIONS[i];
    }
    return GROUP_SORT_OPTIONS[0];
  }

  function getPreparedSortValue(item, key) {
    if (key === 'wetness') return item.wetnessPct;
    if (key === 'duration') return item.durationSec;
    if (key === 'crest') return item.crestDb;
    if (key === 'radius') return item.radiusM;
    if (key === 'flutter') return item.modRateHz;
    if (key === 'date') return item.createdAt;
    return item.pitchHz;
  }

  function composeMultiFartTrack(samplesList, opts) {
    opts = opts || {};
    var sortMeta = getGroupSortMeta(opts.sortBy);
    var sortBy = sortMeta.key;
    var sortDir = opts.sortDir === 'desc' ? 'desc' : 'asc';
    var sortLabel = sortMeta.label + ' · ' + (sortDir === 'desc' ? 'Descending' : 'Ascending');

    var DSP = root.TootApp && root.TootApp.DSP;
    var Forensics = root.TootApp && root.TootApp.Forensics;
    var valid = (samplesList || []).filter(function (s) {
      return s && s.samples && s.samples.length > 0;
    });
    if (valid.length === 0) return null;

    var targetSr = 44100;
    var gapSamples = Math.round(targetSr * 0.18);
    var fadeSamples = Math.round(targetSr * 0.008);
    var prepared = [];
    var totalLen = 0;

    for (var i = 0; i < valid.length; i++) {
      var s = valid[i];
      var srcSr = s.sampleRate || targetSr;
      var buf;
      if (srcSr !== targetSr && DSP && typeof DSP.resampleAudio === 'function') {
        buf = DSP.resampleAudio(s.samples, srcSr / targetSr, targetSr);
      } else {
        buf = new Float32Array(s.samples);
      }

      // Micro-fade edges (8ms) to avoid clicks between combined farts
      var fLen = Math.min(fadeSamples, Math.floor(buf.length * 0.25));
      for (var fi = 0; fi < fLen; fi++) {
        var w = fi / Math.max(1, fLen);
        buf[fi] *= w;
        buf[buf.length - 1 - fi] *= w;
      }

      var feat = s.features || (DSP ? DSP.extractFeatures(s.samples, srcSr) : null);
      if (!s.features && feat) s.features = feat;
      var bonus = Forensics && feat ? Forensics.computeBonusMetrics(feat, feat) : null;
      var effHz =
        feat && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
          ? feat.medianPitchHz
          : safeNum(feat && feat.spectralCentroidHz, 220);

      prepared.push({
        sound: s,
        name: ensureNickname(s),
        buf: buf,
        feat: feat || {},
        pitchHz: effHz,
        durationSec: buf.length / targetSr,
        wetnessPct: bonus ? bonus.wetness.wetA : 20,
        crestDb: safeNum(feat && feat.crestFactorDb, 0),
        radiusM: bonus ? bonus.social.a.radiusM : 4.0,
        modRateHz: safeNum(feat && feat.modRateHz, 0),
        createdAt: safeNum(s.createdAt, i),
        origIndex: i,
        twin: bonus ? bonus.acoustics.twinA : { short: 'Anomaly', emoji: '🔊' }
      });

      totalLen += buf.length;
      if (i < valid.length - 1) totalLen += gapSamples;
    }

    var dirMult = sortDir === 'desc' ? -1 : 1;
    prepared.sort(function (a, b) {
      var va = getPreparedSortValue(a, sortBy);
      var vb = getPreparedSortValue(b, sortBy);
      if (va !== vb) return (va - vb) * dirMult;
      return a.origIndex - b.origIndex;
    });

    var combined = new Float32Array(Math.max(1, totalLen));
    var segments = [];
    var cursor = 0;
    var peak = 0;

    for (var j = 0; j < prepared.length; j++) {
      var item = prepared[j];
      var startSec = cursor / targetSr;
      for (var k = 0; k < item.buf.length; k++) {
        var val = item.buf[k];
        combined[cursor + k] = val;
        var a = Math.abs(val);
        if (a > peak) peak = a;
      }
      cursor += item.buf.length;
      var endSec = cursor / targetSr;

      segments.push({
        id: item.sound.id,
        name: item.name,
        startSec: startSec,
        endSec: endSec,
        durationSec: endSec - startSec,
        color: SEGMENT_COLORS[j % SEGMENT_COLORS.length],
        pitchHz: item.pitchHz,
        flatness: safeNum(item.feat.spectralFlatness, 0.3),
        modRateHz: item.modRateHz,
        wetnessPct: item.wetnessPct,
        crestDb: item.crestDb,
        radiusM: item.radiusM,
        createdAt: item.createdAt,
        twin: item.twin
      });

      if (j < prepared.length - 1) cursor += gapSamples;
    }

    if (peak > 1e-5) {
      var scale = 0.9 / peak;
      for (var n = 0; n < combined.length; n++) {
        combined[n] *= scale;
      }
    }

    var compFeatures = DSP ? DSP.extractFeatures(combined, targetSr) : null;
    var minHz = Infinity;
    var maxHz = 0;
    var sumHz = 0;
    var sumWet = 0;
    var maxRad = 0;
    var sumRadSq = 0;

    for (var m = 0; m < segments.length; m++) {
      var seg = segments[m];
      if (seg.pitchHz > 0 && seg.pitchHz < minHz) minHz = seg.pitchHz;
      if (seg.pitchHz > maxHz) maxHz = seg.pitchHz;
      sumHz += seg.pitchHz;
      sumWet += seg.wetnessPct;
      if (seg.radiusM > maxRad) maxRad = seg.radiusM;
      sumRadSq += seg.radiusM * seg.radiusM;
    }

    var count = segments.length;
    var meanPitchHz = sumHz / Math.max(1, count);
    var pitchSpanOctaves = minHz > 0 && maxHz > minHz ? Math.log2(maxHz / minHz) : 0;
    var aggregateMoisturePct = Math.round(sumWet / Math.max(1, count));
    var combinedBlastRadiusM = Number(Math.min(28, Math.sqrt(sumRadSq) * 0.85 + maxRad * 0.25).toFixed(1));
    var coherenceScore = Math.round(
      clamp(92 - pitchSpanOctaves * 18 - Math.abs(aggregateMoisturePct - 45) * 0.22, 18, 99)
    );
    var totalDurationSec = combined.length / targetSr;
    var trackTitle = 'Vault Megamix — Opus in ' + count + ' Movement' + (count === 1 ? '' : 's');

    var moistureNote =
      aggregateMoisturePct >= 62
        ? 'Hazmat Laundry Alert: collective moisture sits at ' + aggregateMoisturePct + '% — advise opening windows before pressing Play.'
        : aggregateMoisturePct >= 38
        ? 'Moderate ' + aggregateMoisturePct + '% squelch turbulence keeps the medley richly organic without triggering floor-mop protocols.'
        : 'Remarkably desert-dry ensemble (' + aggregateMoisturePct + '% moisture) suitable for polite concert halls.';

    var groupVerdict =
      'Conducted ' +
      count +
      ' Vault specimens into a ' +
      totalDurationSec.toFixed(2) +
      's continuous brass anthology, painstakingly arranged by ' +
      sortMeta.label +
      ' (' +
      (sortDir === 'desc' ? 'descending' : 'ascending') +
      ') as though Carnegie Hall had requested it. ' +
      'Ensemble spans ' +
      pitchSpanOctaves.toFixed(2) +
      ' octaves around a ' +
      Math.round(meanPitchHz) +
      ' Hz mean core (' +
      coherenceScore +
      '% symphonic coherence), commanding a cumulative ' +
      combinedBlastRadiusM.toFixed(1) +
      'm elevator evacuation zone. ' +
      moistureNote;

    return {
      id: 'megamix_' + Date.now(),
      name: trackTitle,
      displayName: trackTitle,
      createdAt: Date.now(),
      sampleRate: targetSr,
      samples: combined,
      features: compFeatures,
      segments: segments,
      metrics: {
        count: count,
        totalDurationSec: totalDurationSec,
        meanPitchHz: meanPitchHz,
        pitchSpanOctaves: pitchSpanOctaves,
        aggregateMoisturePct: aggregateMoisturePct,
        combinedBlastRadiusM: combinedBlastRadiusM,
        coherenceScore: coherenceScore,
        sortBy: sortBy,
        sortDir: sortDir,
        sortLabel: sortLabel,
        groupVerdict: groupVerdict
      }
    };
  }

  function buildSingleAnalysisReportText(sound, roleLabel) {
    if (!sound) return '';
    var DSP = root.TootApp && root.TootApp.DSP;
    var Forensics = root.TootApp && root.TootApp.Forensics;
    var feat = sound.features || (DSP ? DSP.extractFeatures(sound.samples, sound.sampleRate) : {});
    if (!sound.features) sound.features = feat;
    var prof = DSP ? DSP.describeSoundProfile(feat) : { durationLabel: '—', pitchLabel: '—', textureLabel: '—' };
    var bonus = Forensics ? Forensics.computeBonusMetrics(feat, feat) : null;
    var noteStr =
      Forensics && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? ' [' + Forensics.hzToNoteName(feat.medianPitchHz) + ']'
        : '';

    var bpmMod = Math.round(safeNum(feat.modRateHz, 0) * 60);
    var labNote =
      bonus && bonus.wetness.wetA >= 65
        ? 'Laundry Advisory: Hazardous bubble-flux turbulence detected — consider standing near an open window.'
        : bonus && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? 'Institute Ruling: Harmonically committed enough to earn a seat near the back of a brass section.'
        : 'Institute Ruling: Pure aerodynamic stealth turbulence — plausible office deniability remains intact.';

    var lines = [
      'TOOT MATCH — ' + (roleLabel || 'FORENSIC AUDIO DOSSIER'),
      'Specimen: ' + (sound.displayName || sound.name || 'Recording'),
      'Duration: ' + prof.durationLabel + ' | Profile: ' + (prof.profileTag || 'Acoustic Event'),
      'Primary Tone: ' + prof.pitchLabel + noteStr,
      'Texture & Flutter: ' + prof.textureLabel + ' (' + bpmMod + ' cheek flaps/min | Centroid ' + Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz)',
      'Crest Dynamics: ' + safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB | Attack ' + Math.round(safeNum(feat.attackSec, 0) * 1000) + 'ms'
    ];
    if (bonus) {
      lines.push('Moisture / Squelch Index: ' + bonus.wetness.wetA + '% (' + bonus.wetness.labelA + ')');
      lines.push('Acoustic Twin: ' + bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name);
      lines.push('Blast Radius: ' + bonus.social.a.radiusM.toFixed(1) + 'm | Alibi: ' + bonus.social.a.verdict);
    }
    lines.push(labNote);
    return lines.join('\n');
  }

  function buildComparisonReportText(soundA, soundB, result, exactScore) {
    if (!soundA || !soundB || !result) return '';
    var exact = typeof exactScore === 'number' ? exactScore : computeExactScore(result);
    var rank = getRankForScore(exact);
    var reward = getRewardTier(exact);
    var verdict = buildScientificVerdict(soundA, soundB, result, exact);
    return [
      'TOOT MATCH — GUESS COMPARISON REPORT',
      'Original Fart: ' + (soundA.displayName || soundA.name || 'Original'),
      'Guesser: ' + (soundB.name || 'Guesser'),
      'Match Quality: ' + exact.toFixed(1) + '% | Rank: ' + rank.title + ' (' + reward.bells + '/5 Stars)',
      'Metrics: Duration ' + result.durationScore + '% | Tone ' + result.pitchScore + '% | Flutter ' + result.modulationScore + '% | Resonance ' + result.timbreScore + '% | Pressure ' + result.envelopeScore + '%',
      'Scientific Verdict: ' + verdict
    ].join('\n');
  }

  function buildGroupAnalysisReportText(groupObj) {
    if (!groupObj || !groupObj.metrics) return '';
    var m = groupObj.metrics;
    var tracks = (groupObj.segments || [])
      .map(function (seg, idx) {
        return '  ' + (idx + 1) + '. ' + seg.name + ' (' + seg.startSec.toFixed(2) + 's–' + seg.endSec.toFixed(2) + 's, ~' + Math.round(seg.pitchHz) + ' Hz, Wetness ' + seg.wetnessPct + '%)';
      })
      .join('\n');
    return [
      'TOOT MATCH — MULTI-FART COHERENT MEGAMIX REPORT',
      'Track: ' + groupObj.name,
      'Arrangement: ' + (m.sortLabel || 'Default'),
      'Movements: ' + m.count + ' | Total Duration: ' + m.totalDurationSec.toFixed(2) + 's | Coherence Score: ' + m.coherenceScore + '%',
      'Aggregate Moisture: ' + m.aggregateMoisturePct + '% | Combined Blast Radius: ' + m.combinedBlastRadiusM.toFixed(1) + 'm',
      'Tracklist:\n' + tracks,
      'Verdict: ' + m.groupVerdict
    ].join('\n');
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
    GROUP_SORT_OPTIONS: GROUP_SORT_OPTIONS,
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
    renameAttempt: renameAttempt,
    composeMultiFartTrack: composeMultiFartTrack,
    buildSingleAnalysisReportText: buildSingleAnalysisReportText,
    buildComparisonReportText: buildComparisonReportText,
    buildGroupAnalysisReportText: buildGroupAnalysisReportText,
    loadAttemptsForSample: loadAttemptsForSample,
    getSampleStats: getSampleStats,
    getSummaryStats: getSummaryStats
  };
})(typeof window !== 'undefined' ? window : globalThis);
