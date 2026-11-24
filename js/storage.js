(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  var DB_NAME = 'FartGuessDB';
  var DB_VERSION = 1;
  var STORE_NAME = 'customSounds';
  var STATS_KEY = 'toot_match_stats_v1';

  var memorySounds = new Map();
  var memoryStats = {
    totalAttempts: 0,
    streak: 0,
    bestStreak: 0,
    bestOverall: 0,
    bestBySound: {},
    partyCorrect: 0,
    partyPlayed: 0
  };

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (ev) {
          var db = ev.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = function (ev) {
          resolve(ev.target.result);
        };
        req.onerror = function (ev) {
          reject(ev.target.error || new Error('IndexedDB open failed'));
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  function hydrateSound(record) {
    if (!record) return null;
    var samples = record.samples instanceof Float32Array
      ? record.samples
      : new Float32Array(record.samples || []);
    var rawSamples = record.rawSamples instanceof Float32Array
      ? record.rawSamples
      : new Float32Array(record.rawSamples || samples);
    var sr = record.sampleRate || 44100;
    var trimStartSec = typeof record.trimStartSec === 'number' ? record.trimStartSec : 0;
    var trimEndSec = typeof record.trimEndSec === 'number' ? record.trimEndSec : samples.length / sr;
    var preOnsetBreath = record.preOnsetBreath || null;
    if (
      !preOnsetBreath &&
      TootApp.DSP &&
      typeof TootApp.DSP.measurePreOnsetBreath === 'function' &&
      rawSamples.length > samples.length &&
      trimStartSec >= 0.09
    ) {
      preOnsetBreath = TootApp.DSP.measurePreOnsetBreath(rawSamples, sr, Math.round(trimStartSec * sr));
    }
    var features = TootApp.DSP ? TootApp.DSP.extractFeatures(samples, sr) : null;
    if (features && preOnsetBreath) {
      features.preOnsetBreath = preOnsetBreath;
    }
    return {
      id: record.id,
      name: record.name || 'Custom Toot',
      emoji: record.emoji || '💨',
      description: record.description || 'User-recorded custom sound.',
      isBuiltIn: false,
      createdAt: record.createdAt || Date.now(),
      sampleRate: sr,
      rawSamples: rawSamples,
      trimStartSec: trimStartSec,
      trimEndSec: trimEndSec,
      preOnsetBreath: preOnsetBreath,
      samples: samples,
      features: features
    };
  }

  function serializeSound(sound) {
    return {
      id: sound.id,
      name: sound.name,
      emoji: sound.emoji || '💨',
      description: sound.description || 'User-recorded custom sound.',
      createdAt: sound.createdAt || Date.now(),
      sampleRate: sound.sampleRate || 44100,
      rawSamples: sound.rawSamples ? new Float32Array(sound.rawSamples) : new Float32Array(sound.samples || []),
      trimStartSec: typeof sound.trimStartSec === 'number' ? sound.trimStartSec : 0,
      trimEndSec: typeof sound.trimEndSec === 'number' ? sound.trimEndSec : 0,
      preOnsetBreath:
        sound.preOnsetBreath ||
        (sound.clipInfo && sound.clipInfo.preOnsetBreath) ||
        (sound.features && sound.features.preOnsetBreath) ||
        null,
      samples: new Float32Array(sound.samples || [])
    };
  }

  function loadCustomSounds() {
    return openDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, 'readonly');
          var store = tx.objectStore(STORE_NAME);
          var req = store.getAll();
          req.onsuccess = function () {
            var rows = (req.result || []).map(hydrateSound).filter(Boolean);
            rows.sort(function (a, b) {
              return (b.createdAt || 0) - (a.createdAt || 0);
            });
            rows.forEach(function (r) {
              memorySounds.set(r.id, r);
            });
            resolve(rows);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      })
      .catch(function () {
        var list = Array.from(memorySounds.values());
        list.sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        return list;
      });
  }

  function saveCustomSound(sound) {
    var payload = serializeSound(sound);
    var hydrated = hydrateSound(payload);
    memorySounds.set(hydrated.id, hydrated);

    return openDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          var store = tx.objectStore(STORE_NAME);
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

  function deleteCustomSound(id) {
    memorySounds.delete(id);
    return openDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE_NAME, 'readwrite');
          var store = tx.objectStore(STORE_NAME);
          var req = store.delete(id);
          req.onsuccess = function () {
            resolve(true);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      })
      .catch(function () {
        return true;
      });
  }

  function getStats() {
    try {
      var raw = root.localStorage ? root.localStorage.getItem(STATS_KEY) : null;
      if (raw) {
        var parsed = JSON.parse(raw);
        memoryStats = Object.assign({}, memoryStats, parsed);
      }
    } catch (e) {
      // Ignore storage errors
    }
    return Object.assign({}, memoryStats, {
      bestBySound: Object.assign({}, memoryStats.bestBySound)
    });
  }

  function persistStats() {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(STATS_KEY, JSON.stringify(memoryStats));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  function recordScore(soundId, score) {
    getStats();
    var num = Math.max(0, Math.min(100, Math.round(score || 0)));
    memoryStats.totalAttempts++;
    if (num >= 65) {
      memoryStats.streak++;
    } else {
      memoryStats.streak = 0;
    }
    if (memoryStats.streak > memoryStats.bestStreak) {
      memoryStats.bestStreak = memoryStats.streak;
    }
    if (num > memoryStats.bestOverall) {
      memoryStats.bestOverall = num;
    }
    if (soundId) {
      var prev = memoryStats.bestBySound[soundId] || 0;
      if (num > prev) {
        memoryStats.bestBySound[soundId] = num;
      }
    }
    persistStats();
    return getStats();
  }

  function recordPartyRound(wasCorrect) {
    getStats();
    memoryStats.partyPlayed++;
    if (wasCorrect) {
      memoryStats.partyCorrect++;
    }
    persistStats();
    return getStats();
  }

  TootApp.Storage = {
    loadCustomSounds: loadCustomSounds,
    saveCustomSound: saveCustomSound,
    deleteCustomSound: deleteCustomSound,
    getStats: getStats,
    recordScore: recordScore,
    recordPartyRound: recordPartyRound
  };
})(typeof window !== 'undefined' ? window : globalThis);
