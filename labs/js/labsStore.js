(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var META_STORAGE_KEY = 'toot_match_labs_meta_v2';
  var ATTEMPTS_DB_NAME = 'FartGuessLabsAttemptsDB';
  var ATTEMPTS_DB_VER = 1;
  var ATTEMPTS_STORE = 'attempts';
  var MAX_DEFAULT_MEGAMIX = 20;
  var preloadInFlight = typeof Map !== 'undefined' ? new Map() : null;
  var preloadCatalogCache = null;

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

  var ACOUSTIC_ARCHETYPE_ORDER = [
    'swamp_mud',
    'storm_thunder',
    'stealth_breeze',
    'high_squeaker',
    'rapid_flutter',
    'rising_question',
    'quick_pop',
    'aggressive_rumble',
    'zen_relaxing'
  ];

  var ACOUSTIC_NAME_BANKS = {
    swamp_mud: {
      adjectives: ['Squelchy', 'Swamp-Boot', 'Mud-Pit', 'Bog-Suction', 'Gumbo', 'Marsh-Wading', 'Soggy-Galosh', 'Bayou'],
      nouns: ['Boot Pull', 'Mud Plunge', 'Swamp Bubbles', 'Wellie Escapee', 'Puddle Churn', 'Clay Suction', 'Bayou Gurgle', 'Quagmire Pop']
    },
    storm_thunder: {
      adjectives: ['Barometric', 'Monsoon', 'Category-5', 'Supercell', 'Cumulonimbus', 'Gale-Force', 'Doppler', 'Thunderhead'],
      nouns: ['Thunderclap', 'Pressure Front', 'Cloudburst', 'Squall Line', 'Rolling Storm', 'Trough Drop', 'Microburst', 'Hailstorm']
    },
    stealth_breeze: {
      adjectives: ['Whispering', 'Stealth', 'Phantom', 'Silent-Front', 'Ghostly', 'Drafty', 'Breezy', 'Ninja'],
      nouns: ['Crosswind', 'Window Draft', 'Tire Hiss', 'Steam Vent', 'Sneak Gust', 'Kettle Sigh', 'Trade Wind', 'Hiss Valve']
    },
    high_squeaker: {
      adjectives: ['Helium', 'Squeaky', 'Pinched', 'Kettle-Whistle', 'Balloon-Knot', 'Treble', 'Panic-Pitch', 'High-Altitude'],
      nouns: ['Squealer', 'Rubber Duck', 'Balloon Escape', 'Teapot Chirp', 'Mouse Alarm', 'Squeak Toy', 'Goose Honk', 'Whistle-Pop']
    },
    rapid_flutter: {
      adjectives: ['Machine-Gun', 'Chattering', 'Lawnmower', 'Putt-Putt', 'Jackhammer', 'Rippling', 'Sputtering', 'Chainsaw'],
      nouns: ['Flutter Blast', 'Staccato Rip', 'Tractor Cough', 'Engine Backfire', 'Motorboat', 'Rattle Trap', 'Bubble Burst', 'Wobble Volley']
    },
    rising_question: {
      adjectives: ['Confused', 'Suspicious', 'Inquisitive', 'Skeptical', 'Plot-Twist', 'Dramatic', 'Curious', 'Eyebrow-Raise'],
      nouns: ['Question Mark', 'Plot Twist', 'Elevator Inquiry', 'Upspeak Toot', 'Rhetorical Squeak', 'Cliffhanger', 'Interrogation', 'Rising Doubt']
    },
    quick_pop: {
      adjectives: ['Micro', 'Blistering', 'Instant', 'Blink-and-Miss', 'Drive-By', 'Flash', 'Snappy', 'Tactical'],
      nouns: ['Cork Pop', 'Snap-Crackle', 'Bubble Snap', 'Firecracker', 'Micro-Puff', 'Cap Gun', 'Quick Blip', 'Static Zap']
    },
    aggressive_rumble: {
      adjectives: ['Hostile', 'Furious', 'Aggressive', 'Combative', 'Angry', 'Belligerent', 'Confrontational', 'Ferocious'],
      nouns: ['Brawl Rumble', 'Bear Growl', 'Diesel Roar', 'Warpath Blast', 'Bulldozer', 'Grizzly Huff', 'Rage Vent', 'Rampage']
    },
    zen_relaxing: {
      adjectives: ['Zen', 'Spa-Day', 'Relaxing', 'Therapeutic', 'Meditative', 'Peaceful', 'Hammock', 'Sunday-Nap'],
      nouns: ['Exhale', 'Sigh of Relief', 'Yoga Release', 'Breeze Therapy', 'Calm Drift', 'Porch Creak', 'Hammock Poot', 'Serenity Puff']
    }
  };

  var ACOUSTIC_NAME_COUNT = 9 * 8 * 8;

  var LEGENDARY_TITLES = [
    'MOUTH FART CHAMPION',
    'CERTIFIED CHEEK IMPERSONATOR',
    'MASTER OF RESONANCE',
    'THUNDER SUMMONER',
    'AIRFLOW ARCHITECT',
    'GRAND FLATULENCE MASTER',
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

  function extractNumericStats(feat, bonus) {
    var f = feat || {};
    var dur = safeNum(f.duration, safeNum(f.durationSec, 0.7));
    var voiced = safeNum(f.voicedRatio, 0.5);
    var pitchHz = voiced >= 0.25 && safeNum(f.medianPitchHz, 0) > 0
      ? safeNum(f.medianPitchHz, 200)
      : safeNum(f.pitchHz, safeNum(f.spectralCentroidHz, 200));
    var flat = safeNum(f.spectralFlatness, 0.28);
    var flux = safeNum(f.spectralFlux, 0.08);
    var modRate = safeNum(f.modRateHz, 8);
    var modDepth = safeNum(f.modDepth, 0.3);
    var bursts = safeNum(f.burstCount, 1);
    var trend = safeNum(f.pitchTrend, 0);
    var crest = safeNum(f.crestFactorDb, safeNum(f.crestDb, 10));
    var bp = Array.isArray(f.bandProfile) ? f.bandProfile : [0.25, 0.25, 0.25, 0.25];
    var squelchBand = clamp((bp[1] || 0) * 0.7 + (bp[2] || 0) * 0.9, 0, 1);
    var burstBonus = bursts >= 3 ? 14 : bursts === 2 ? 7 : 0;
    var wetPct = bonus && bonus.wetness && typeof bonus.wetness.pct === 'number'
      ? bonus.wetness.pct
      : Math.round(clamp(22 * Math.min(1, modDepth / 0.65) + 46 * Math.min(1, flux / 0.22) + 22 * squelchBand + burstBonus, 2, 99));
    return {
      dur: dur,
      voiced: voiced,
      pitchHz: pitchHz,
      flat: flat,
      flux: flux,
      modRate: modRate,
      modDepth: modDepth,
      bursts: bursts,
      trend: trend,
      crest: crest,
      bp: bp,
      wetPct: wetPct
    };
  }

  function classifyAcousticArchetype(feat, bonus) {
    var st = extractNumericStats(feat, bonus);
    if (st.wetPct >= 62 || st.flux >= 0.17) return 'swamp_mud';
    if (st.voiced < 0.25 || st.flat >= 0.48) return 'stealth_breeze';
    if (st.pitchHz >= 290) return 'high_squeaker';
    if (st.pitchHz < 145 && (st.crest >= 11 || st.dur >= 0.65 || (st.bp[0] || 0) >= 0.34)) return 'storm_thunder';
    if (st.bursts >= 3 || st.modRate >= 14) return 'rapid_flutter';
    if (st.trend > 0.14) return 'rising_question';
    if (st.dur < 0.35) return 'quick_pop';
    if (st.crest >= 12 || (st.bp[0] || 0) >= 0.36 || st.pitchHz < 175) return 'aggressive_rumble';
    return 'zen_relaxing';
  }

  function describeAcousticMood(feat, bonus) {
    var st = extractNumericStats(feat, bonus);
    var archetype = classifyAcousticArchetype(feat, bonus);
    if (archetype === 'swamp_mud') {
      return {
        archetype: archetype,
        moodLabel: st.wetPct >= 75 ? 'Bogged Down & Chaotic' : 'Squishy & Unforgiving',
        wildAnalogy: 'Sounds like yanking a waterlogged rain boot out of waist-deep swamp clay.'
      };
    }
    if (archetype === 'storm_thunder') {
      return {
        archetype: archetype,
        moodLabel: 'Stormy & Barometric',
        wildAnalogy: 'Tracks on Doppler radar like a low-pressure summer squall line rolling over a tin roof.'
      };
    }
    if (archetype === 'stealth_breeze') {
      return {
        archetype: archetype,
        moodLabel: 'Sneaky & Nonchalant',
        wildAnalogy: 'Feels like an innocent hallway draft from a cracked winter window nobody admits opening.'
      };
    }
    if (archetype === 'high_squeaker') {
      return {
        archetype: archetype,
        moodLabel: 'High-Strung & Startled',
        wildAnalogy: 'Carries the frantic energy of a helium balloon escaping into a startled teacup.'
      };
    }
    if (archetype === 'rapid_flutter') {
      return {
        archetype: archetype,
        moodLabel: 'Agitated & Restless',
        wildAnalogy: 'Putt-putts like a stubborn outboard engine fighting headwinds on a choppy lake.'
      };
    }
    if (archetype === 'rising_question') {
      return {
        archetype: archetype,
        moodLabel: 'Confused & Inquisitive',
        wildAnalogy: 'Sweeps upward like an accidental rhetorical question nobody in the elevator wanted answered.'
      };
    }
    if (archetype === 'quick_pop') {
      return {
        archetype: archetype,
        moodLabel: 'Impulsive & Snappy',
        wildAnalogy: 'Fires like a dry champagne cork popping in a silent library — zero time to duck.'
      };
    }
    if (archetype === 'aggressive_rumble') {
      return {
        archetype: archetype,
        moodLabel: 'Aggressive & Confrontational',
        wildAnalogy: 'Radiates hostile low-end pressure like a territorial badger guarding the thermostat.'
      };
    }
    return {
      archetype: 'zen_relaxing',
      moodLabel: 'Relaxing & Zen',
      wildAnalogy: 'Settles in like a peaceful porch-swing breeze therapy session on a warm Sunday afternoon.'
    };
  }

  function buildCombosForArchetype(archKey) {
    var bank = ACOUSTIC_NAME_BANKS[archKey];
    if (!bank) return [];
    var out = [];
    for (var a = 0; a < bank.adjectives.length; a++) {
      for (var n = 0; n < bank.nouns.length; n++) {
        out.push(bank.adjectives[a] + ' ' + bank.nouns[n]);
      }
    }
    return out;
  }

  function generateNewSpecimenName(features, seedKey) {
    var meta = loadMeta();
    var used = {};
    var keys = Object.keys(meta.samples);
    for (var i = 0; i < keys.length; i++) {
      var nick = meta.samples[keys[i]] && meta.samples[keys[i]].nickname;
      if (nick) used[nick] = true;
    }

    var seedStr = seedKey || ('new_' + Date.now() + '_' + meta.nextNickIndex + '_' + Math.random());
    var hash = hashString(seedStr);

    var order;
    if (features && typeof features === 'object') {
      var primary = classifyAcousticArchetype(features, null);
      var pIdx = ACOUSTIC_ARCHETYPE_ORDER.indexOf(primary);
      order = [];
      for (var step = 0; step < ACOUSTIC_ARCHETYPE_ORDER.length; step++) {
        order.push(ACOUSTIC_ARCHETYPE_ORDER[(Math.max(0, pIdx) + step) % ACOUSTIC_ARCHETYPE_ORDER.length]);
      }
    } else {
      var rot = hash % ACOUSTIC_ARCHETYPE_ORDER.length;
      order = [];
      for (var s = 0; s < ACOUSTIC_ARCHETYPE_ORDER.length; s++) {
        order.push(ACOUSTIC_ARCHETYPE_ORDER[(rot + s) % ACOUSTIC_ARCHETYPE_ORDER.length]);
      }
    }

    for (var o = 0; o < order.length; o++) {
      var combos = buildCombosForArchetype(order[o]);
      var startIdx = (hash + o * 13) % combos.length;
      for (var c = 0; c < combos.length; c++) {
        var candidate = combos[(startIdx + c) % combos.length];
        if (!used[candidate]) {
          meta.nextNickIndex++;
          return candidate;
        }
      }
    }
    meta.nextNickIndex++;
    return 'Specimen #' + String(meta.nextNickIndex).padStart(2, '0');
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
        desc: 'Uncanny cheek-flutter control and barometric wallop. National Weather Service Doppler radar is taking notes.'
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
      desc: 'Reference-grade porcelain virtuosity. You matched everything from swamp-boot suction to gale-force thunder.'
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
        'Your ' + durB + ' mimicry nailed the ' + pitchA + ' storm core (logging ' + pitchB + ' at ' + bpmB + ' cheek flaps/min) and matched the tail sputter well enough to fail a courtroom alibi.' +
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
      durB + ' submission (' + pitchB + ', ' + bpmB + ' flaps/min) sounds like a completely different weather system than the ' +
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
    var preOnsetBreath = rec.preOnsetBreath || (rec.clipInfo && rec.clipInfo.preOnsetBreath) || null;
    var features =
      rec.features && rec.features.pitchHzArr
        ? rec.features
        : root.TootApp && root.TootApp.DSP && samples.length > 0
        ? root.TootApp.DSP.extractFeatures(samples, sr)
        : null;
    if (features && preOnsetBreath && !features.preOnsetBreath) {
      features.preOnsetBreath = preOnsetBreath;
    }
    return Object.assign({}, rec, {
      samples: samples,
      sampleRate: sr,
      preOnsetBreath: preOnsetBreath,
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
      preOnsetBreath:
        att.preOnsetBreath ||
        (att.clipInfo && att.clipInfo.preOnsetBreath) ||
        (att.features && att.features.preOnsetBreath) ||
        null,
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

  function loadAllAttempts() {
    return openAttemptsDB()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(ATTEMPTS_STORE, 'readonly');
          var store = tx.objectStore(ATTEMPTS_STORE);
          var req = store.getAll();
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
          rows.push(val);
        });
        rows.sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        return rows;
      });
  }

  /* ==================== HIGH-LEVEL VAULT OPERATIONS ==================== */
  var cachedOggSupport = null;
  var cachedAlacSupport = null;

  function normalizePreloadUrl(url, filename) {
    var u = String(url || '').trim();
    if (u.indexOf('/VaultPreLoads/') === 0) {
      return '..' + u;
    }
    if (!u && filename) {
      return '../VaultPreLoads/' + String(filename).split('/').map(encodeURIComponent).join('/');
    }
    return u;
  }

  function isCodecSupportedForUrl(url, codec) {
    if (typeof root.Audio !== 'function' || typeof root.document === 'undefined') {
      return true;
    }
    var c = String(codec || '').toLowerCase();
    if (c === 'ogg' || /\.ogg(?:$|\?)/i.test(String(url || ''))) {
      if (cachedOggSupport === null) {
        try {
          var probeAudio = new root.Audio();
          cachedOggSupport = Boolean(probeAudio && typeof probeAudio.canPlayType === 'function' && probeAudio.canPlayType('audio/ogg'));
        } catch (e) {
          cachedOggSupport = false;
        }
      }
      return cachedOggSupport;
    }
    if (c === 'alac') {
      if (cachedAlacSupport === null) {
        try {
          var probeAlac = new root.Audio();
          cachedAlacSupport = Boolean(probeAlac && typeof probeAlac.canPlayType === 'function' && probeAlac.canPlayType('audio/mp4; codecs="alac"'));
        } catch (e) {
          cachedAlacSupport = false;
        }
      }
      return cachedAlacSupport;
    }
    return true;
  }

  function fetchJsonOrNull(url) {
    if (typeof root.fetch !== 'function') return Promise.resolve(null);
    return root
      .fetch(url, { cache: 'no-store' })
      .then(function (resp) {
        if (!resp || !resp.ok) return null;
        return resp.json();
      })
      .catch(function () {
        return null;
      });
  }

  function loadPreloadCatalog() {
    if (typeof root.fetch !== 'function') return Promise.resolve([]);
    if (root.location && root.location.protocol === 'file:') return Promise.resolve([]);

    var host = (root.location && root.location.hostname) || '';
    var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0';
    var primaryUrl = isLocal ? '/api/preloads' : '../VaultPreLoads/manifest.json';
    var fallbackUrl = isLocal ? '../VaultPreLoads/manifest.json' : '/api/preloads';

    return fetchJsonOrNull(primaryUrl)
      .then(function (data) {
        if (data && Array.isArray(data.files)) return data;
        return fetchJsonOrNull(fallbackUrl);
      })
      .then(function (data) {
        var files = data && Array.isArray(data.files) ? data.files : [];
        preloadCatalogCache = files
          .map(function (item, idx) {
            var normUrl = normalizePreloadUrl(item.url, item.filename);
            var itemCodec = item.codec || '';
            if (!normUrl || !isCodecSupportedForUrl(normUrl, itemCodec)) return null;
            var label = item.name || ('Vault Fart #' + (idx + 1));
            return {
              id: item.id || ('preload_' + idx),
              name: label,
              displayName: label,
              emoji: '💨',
              description: 'Pre-loaded Default Vault specimen',
              isBuiltIn: true,
              preloadUrl: normUrl,
              codec: itemCodec,
              filename: item.filename || label,
              previewPeaks: Array.isArray(item.peaks) ? item.peaks.slice() : null,
              previewDurationSec: typeof item.durationSec === 'number' && item.durationSec > 0 ? item.durationSec : null,
              previewMeta: item.meta && typeof item.meta === 'object' ? item.meta : null,
              createdAt: idx + 1,
              sampleRate: 44100,
              samples: null,
              rawSamples: null,
              features: null,
              loaded: false
            };
          })
          .filter(Boolean);
        return preloadCatalogCache.slice();
      })
      .catch(function () {
        return preloadCatalogCache ? preloadCatalogCache.slice() : [];
      });
  }

  function ensureSampleLoaded(sound) {
    if (!sound) return Promise.resolve(null);
    if (sound.samples && sound.samples.length > 0) {
      sound.loaded = true;
      if (!sound.features && root.TootApp && root.TootApp.DSP) {
        sound.features = root.TootApp.DSP.extractFeatures(sound.samples, sound.sampleRate || 44100);
      }
      return Promise.resolve(sound);
    }
    if (!sound.preloadUrl || typeof root.fetch !== 'function') {
      return Promise.resolve(sound);
    }
    if (preloadInFlight && preloadInFlight.has(sound.id)) {
      return preloadInFlight.get(sound.id);
    }
    var p = root
      .fetch(sound.preloadUrl)
      .then(function (resp) {
        if (!resp || !resp.ok) {
          throw new Error('Failed to load audio specimen: ' + (sound.name || sound.id));
        }
        return resp.arrayBuffer();
      })
      .then(function (arrBuf) {
        var Audio = root.TootApp && root.TootApp.Audio;
        if (!Audio || (typeof Audio.decodeAudioBytes !== 'function' && typeof Audio.ensureContext !== 'function')) {
          throw new Error('Web Audio API unavailable to decode preloaded sound.');
        }
        var decodePromise =
          typeof Audio.decodeAudioBytes === 'function'
            ? Audio.decodeAudioBytes(arrBuf)
            : Audio.ensureContext().then(function (ctx) {
                return ctx.decodeAudioData(arrBuf);
              });
        return decodePromise.then(function (audioBuf) {
          var mono = Audio.audioBufferToMono(audioBuf);
          var DSP = root.TootApp && root.TootApp.DSP;
          var clipInfo = DSP && typeof DSP.autoClipAudio === 'function' ? DSP.autoClipAudio(mono.samples, mono.sampleRate) : null;
          var finalSamples =
            clipInfo && clipInfo.ok && clipInfo.clipped && clipInfo.clipped.length > 0
              ? clipInfo.clipped
              : mono.samples;
          sound.rawSamples = mono.samples;
          sound.samples = finalSamples;
          sound.sampleRate = mono.sampleRate || 44100;
          sound.clipInfo = clipInfo;
          sound.loaded = true;
          sound.features = DSP ? DSP.extractFeatures(finalSamples, sound.sampleRate) : null;
          if (preloadInFlight) preloadInFlight.delete(sound.id);
          return sound;
        });
      })
      .catch(function (err) {
        if (preloadInFlight) preloadInFlight.delete(sound.id);
        throw err;
      });
    if (preloadInFlight) preloadInFlight.set(sound.id, p);
    return p;
  }

  function loadVaultSamples() {
    var storage = root.TootApp && root.TootApp.Storage;
    if (!storage) return loadPreloadCatalog();
    return Promise.all([storage.loadCustomSounds(), loadPreloadCatalog()]).then(function (res) {
      var customRows = (res[0] || []).slice().map(function (s) {
        s.isBuiltIn = false;
        s.loaded = Boolean(s.samples && s.samples.length > 0);
        ensureSampleMeta(s);
        return s;
      });
      var seen = new Set(customRows.map(function (r) { return r.id; }));
      var builtIns = (res[1] || []).filter(function (b) { return !seen.has(b.id); });
      var meta = loadMeta();
      builtIns.forEach(function (b) {
        var m = meta.samples[b.id];
        if (m && m.customRenamed && m.nickname) {
          b.name = m.nickname;
          b.displayName = m.nickname;
        } else {
          b.displayName = b.name;
        }
      });
      return customRows.concat(builtIns);
    });
  }

  function saveNewSpecimen(recResult) {
    var storage = root.TootApp && root.TootApp.Storage;
    if (!storage) return Promise.reject(new Error('Storage unavailable'));
    var sr = recResult.sampleRate || 44100;
    var samples = recResult.clippedSamples;
    var DSP = root.TootApp && root.TootApp.DSP;
    var feat = recResult.features || (DSP && samples && samples.length ? DSP.extractFeatures(samples, sr) : null);
    var nickname = generateNewSpecimenName(feat);
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
      preOnsetBreath: (recResult.clipInfo && recResult.clipInfo.preOnsetBreath) || null,
      features: feat,
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
      if (!saved.features && feat) saved.features = feat;
      if (!saved.preOnsetBreath && toSave.preOnsetBreath) saved.preOnsetBreath = toSave.preOnsetBreath;
      if (saved.features && saved.preOnsetBreath && !saved.features.preOnsetBreath) {
        saved.features.preOnsetBreath = saved.preOnsetBreath;
      }
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

    if (!storage || sound.isBuiltIn) return Promise.resolve(sound);
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
      preOnsetBreath:
        attemptSound.preOnsetBreath ||
        (attemptSound.clipInfo && attemptSound.clipInfo.preOnsetBreath) ||
        (attemptSound.features && attemptSound.features.preOnsetBreath) ||
        null,
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
      if (savedAtt.preOnsetBreath && savedAtt.features && !savedAtt.features.preOnsetBreath) {
        savedAtt.features.preOnsetBreath = savedAtt.preOnsetBreath;
      }
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
        name: s.isBuiltIn || s.sampleId ? (s.displayName || s.name || 'Specimen') : ensureNickname(s),
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
    var trackTitle = 'Vault Megamix — Storm System in ' + count + ' Front' + (count === 1 ? '' : 's');

    var moistureNote =
      aggregateMoisturePct >= 62
        ? 'Hazmat Laundry & Bog Warning: collective moisture sits at ' + aggregateMoisturePct + '% — thick wet-boot-in-mud suction energy.'
        : aggregateMoisturePct >= 38
        ? 'Moderate ' + aggregateMoisturePct + '% squelch turbulence keeps the mix richly swamp-adjacent without triggering floor-mop protocols.'
        : 'Remarkably desert-dry cascade (' + aggregateMoisturePct + '% moisture) suitable for quiet library reading rooms.';

    var groupVerdict =
      'Assembled ' +
      count +
      ' Vault specimens into a ' +
      totalDurationSec.toFixed(2) +
      's continuous barometric & acoustic anthology, ordered by ' +
      sortMeta.label +
      ' (' +
      (sortDir === 'desc' ? 'descending' : 'ascending') +
      ') like a miniature Doppler radar forecast. ' +
      'Ensemble spans ' +
      pitchSpanOctaves.toFixed(2) +
      ' octaves around a ' +
      Math.round(meanPitchHz) +
      ' Hz mean core (' +
      coherenceScore +
      '% weather-front coherence), commanding a cumulative ' +
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
    var mood = describeAcousticMood(feat, bonus);
    var labNote =
      bonus && bonus.wetness.wetA >= 65
        ? 'Laundry & Swamp Advisory: Heavy mud-boot suction turbulence detected — crack a window immediately.'
        : bonus && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? 'Institute Mood Ruling (' + mood.moodLabel + '): ' + mood.wildAnalogy
        : 'Institute Ruling (' + mood.moodLabel + '): Pure aerodynamic stealth crosswind — plausible office deniability remains intact.';

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
    var fnApi = root.TootLabs && root.TootLabs.Fartnalysis;
    if (fnApi && typeof fnApi.pickShareableVerdict === 'function') {
      lines.push('Official Verdict: ' + fnApi.pickShareableVerdict((sound.displayName || sound.name || 'Recording') + '|' + prof.durationLabel));
    }
    lines.push('');
    lines.push('Analysis performed using A.S.S. (Acoustic Similarity System v4.2)');
    lines.push('Reviewed and Approved By: Professor Reginald P. Bottomsworth, Chief Acoustic Flatulence Officer, Institute of Acoustic Flatulence Research, Toot Match Labs');
    return lines.join('\n');
  }

  function buildComparisonReportText(soundA, soundB, result, exactScore) {
    if (!soundA || !soundB || !result) return '';
    var exact = typeof exactScore === 'number' ? exactScore : computeExactScore(result);
    var rank = getRankForScore(exact);
    var reward = getRewardTier(exact);
    var verdict = buildScientificVerdict(soundA, soundB, result, exact);
    var fnApi = root.TootLabs && root.TootLabs.Fartnalysis;
    var officialVerdict =
      fnApi && typeof fnApi.pickShareableVerdict === 'function'
        ? fnApi.pickShareableVerdict((soundA.displayName || soundA.name || '') + '|' + (soundB.name || '') + '|' + exact.toFixed(1))
        : null;
    var lines = [
      'TOOT MATCH LABS — COMPARATIVE ACOUSTIC ANALYSIS REPORT',
      'Primary Specimen: ' + (soundA.displayName || soundA.name || 'Specimen A'),
      'Comparison Recording: ' + (soundB.name || 'Specimen B'),
      'Similarity Score: ' + exact.toFixed(1) + '% | Rank: ' + rank.title + ' (' + reward.bells + '/5 Stars)',
      'Metrics: Duration ' + result.durationScore + '% | Tone ' + result.pitchScore + '% | Flutter ' + result.modulationScore + '% | Resonance ' + result.timbreScore + '% | Pressure ' + result.envelopeScore + '%',
      'Scientific Verdict: ' + verdict
    ];
    if (officialVerdict) lines.push('Official Verdict: ' + officialVerdict);
    lines.push('');
    lines.push('Analysis performed using A.S.S. (Acoustic Similarity System v4.2)');
    lines.push('Reviewed and Approved By: Professor Reginald P. Bottomsworth, Chief Acoustic Flatulence Officer, Institute of Acoustic Flatulence Research, Toot Match Labs');
    return lines.join('\n');
  }

  function buildGroupAnalysisReportText(groupObj) {
    if (!groupObj || !groupObj.metrics) return '';
    var m = groupObj.metrics;
    var tracks = (groupObj.segments || [])
      .map(function (seg, idx) {
        return '  ' + (idx + 1) + '. ' + seg.name + ' (' + seg.startSec.toFixed(2) + 's–' + seg.endSec.toFixed(2) + 's, ~' + Math.round(seg.pitchHz) + ' Hz, Wetness ' + seg.wetnessPct + '%)';
      })
      .join('\n');
    var fnApi = root.TootLabs && root.TootLabs.Fartnalysis;
    var officialVerdict =
      fnApi && typeof fnApi.pickShareableVerdict === 'function'
        ? fnApi.pickShareableVerdict(groupObj.name + '|' + (m.sortLabel || 'Default') + '|megamix')
        : null;
    var lines = [
      'TOOT MATCH LABS — MULTI-SPECIMEN COHERENT MEGAMIX REPORT',
      'Track: ' + groupObj.name,
      'Arrangement: ' + (m.sortLabel || 'Default'),
      'Movements: ' + m.count + ' | Total Duration: ' + m.totalDurationSec.toFixed(2) + 's | Coherence Score: ' + m.coherenceScore + '%',
      'Aggregate Moisture: ' + m.aggregateMoisturePct + '% | Combined Blast Radius: ' + m.combinedBlastRadiusM.toFixed(1) + 'm',
      'Tracklist:\n' + tracks,
      'Verdict: ' + m.groupVerdict
    ];
    if (officialVerdict) lines.push('Official Verdict: ' + officialVerdict);
    lines.push('');
    lines.push('Analysis performed using A.S.S. (Acoustic Similarity System v4.2)');
    lines.push('Reviewed and Approved By: Professor Reginald P. Bottomsworth, Chief Acoustic Flatulence Officer, Institute of Acoustic Flatulence Research, Toot Match Labs');
    return lines.join('\n');
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
    ACOUSTIC_NAME_BANKS: ACOUSTIC_NAME_BANKS,
    ACOUSTIC_NAME_COUNT: ACOUSTIC_NAME_COUNT,
    LEGENDARY_TITLES: LEGENDARY_TITLES,
    GROUP_SORT_OPTIONS: GROUP_SORT_OPTIONS,
    MAX_DEFAULT_MEGAMIX: MAX_DEFAULT_MEGAMIX,
    ensureNickname: ensureNickname,
    generateNewSpecimenName: generateNewSpecimenName,
    describeAcousticMood: describeAcousticMood,
    computeExactScore: computeExactScore,
    getRankForScore: getRankForScore,
    getRewardTier: getRewardTier,
    pickLegendaryTitle: pickLegendaryTitle,
    buildScientificVerdict: buildScientificVerdict,
    loadPreloadCatalog: loadPreloadCatalog,
    ensureSampleLoaded: ensureSampleLoaded,
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
    loadAllAttempts: loadAllAttempts,
    getSampleStats: getSampleStats,
    getSummaryStats: getSummaryStats
  };
})(typeof window !== 'undefined' ? window : globalThis);
