(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  var CRITERIA_META = [
    { key: 'overall', label: '🧪 Laboratory Assessment', shortLabel: 'Assessment' },
    { key: 'duration', label: '⏱️ Emission Lifetime', shortLabel: 'Lifetime' },
    { key: 'pitch', label: '📡 Primary Resonance', shortLabel: 'Resonance' },
    { key: 'modulation', label: '🫧 Oscillation Cadence', shortLabel: 'Cadence' },
    { key: 'timbre', label: '🎨 Spectral Distribution', shortLabel: 'Spectral' },
    { key: 'envelope', label: '📈 Pressure Release', shortLabel: 'Pressure' },
    { key: 'wetness', label: '💧 Hydro-Acoustic Flux', shortLabel: 'Hydro Flux' },
    { key: 'acoustics', label: '🔊 Reference Analogue', shortLabel: 'Analogue' },
    { key: 'social', label: '📐 Propagation & Masking', shortLabel: 'Propagation' }
  ];

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  var ACOUSTIC_TWINS = [
    { name: 'Low-Frequency Thunderfront', short: 'Thunderfront', emoji: '⛈️', freq: 68, flat: 0.14, mod: 0.16 },
    { name: 'Maritime Foghorn', short: 'Foghorn', emoji: '🚢', freq: 96, flat: 0.18, mod: 0.14 },
    { name: 'Viscous Clay Extraction', short: 'Clay Suction', emoji: '🥾', freq: 128, flat: 0.28, mod: 0.52 },
    { name: 'Two-Stroke Exhaust Manifold', short: 'Manifold', emoji: '🔧', freq: 180, flat: 0.30, mod: 0.45 },
    { name: 'Anseriformes Vocalization', short: 'Waterfowl', emoji: '🔊', freq: 265, flat: 0.26, mod: 0.34 },
    { name: 'Pressurized Elastomer Vent', short: 'Elastomer', emoji: '🎈', freq: 370, flat: 0.22, mod: 0.26 },
    { name: 'Damped Percussive Membrane', short: 'Membrane', emoji: '🥁', freq: 500, flat: 0.24, mod: 0.20 },
    { name: 'High-Pressure Steam Aperture', short: 'Steam Vent', emoji: '💨', freq: 1150, flat: 0.72, mod: 0.14 }
  ];

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function safeNum(v, fallback) {
    return typeof v === 'number' && Number.isFinite(v) ? v : (fallback || 0);
  }

  function fmt(v, digits) {
    var d = typeof digits === 'number' ? digits : 2;
    return safeNum(v, 0).toFixed(d);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function scoreColor(score) {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#d97706';
    return '#e11d48';
  }

  function hzToNoteName(hz) {
    if (!hz || !Number.isFinite(hz) || hz < 20) return 'N/A';
    var midiExact = 69 + 12 * Math.log2(hz / 440);
    var midiRound = Math.round(midiExact);
    var cents = Math.round((midiExact - midiRound) * 100);
    var note = NOTE_NAMES[((midiRound % 12) + 12) % 12];
    var oct = Math.floor(midiRound / 12) - 1;
    var sign = cents >= 0 ? '+' + cents : String(cents);
    return note + oct + ' (' + sign + '¢)';
  }

  function ensureHydratedSound(sound) {
    if (!sound) return null;
    var f = sound.features;
    if (
      !f ||
      !f.pitchHzArr ||
      typeof f.crestFactorDb !== 'number' ||
      typeof f.t50Ratio !== 'number'
    ) {
      if (TootApp.DSP && sound.samples && sound.samples.length > 0) {
        f = TootApp.DSP.extractFeatures(sound.samples, sound.sampleRate || 44100, f && f.spectrogram);
        sound.features = f;
      }
    }
    return sound;
  }

  function computeFluxSeries(spec) {
    var frames = (spec && spec.frames) || 1;
    var bands = (spec && spec.freqBands) || 1;
    var grid = (spec && spec.grid) || null;
    var out = new Array(frames);
    for (var z = 0; z < frames; z++) out[z] = 0;
    if (!grid || frames < 2 || grid.length < frames * bands) return out;
    for (var t = 1; t < frames; t++) {
      var sumSq = 0;
      var prev = (t - 1) * bands;
      var cur = t * bands;
      for (var b = 0; b < bands; b++) {
        var d = grid[cur + b] - grid[prev + b];
        sumSq += d * d;
      }
      out[t] = Math.sqrt(sumSq / bands);
    }
    return out;
  }

  function singleWetness(f) {
    var flux = clamp(safeNum(f && f.spectralFlux, 0), 0, 1.5);
    var md = clamp(safeNum(f && f.modDepth, 0), 0, 2);
    var bp = (f && f.bandProfile) || [0.25, 0.25, 0.25, 0.25];
    var squelchBand = clamp((bp[1] || 0) * 0.7 + (bp[2] || 0) * 0.9, 0, 1);
    var bursts = (f && f.burstCount) || 1;
    var burstBonus = bursts >= 3 ? 14 : bursts === 2 ? 7 : 0;
    var pct = Math.round(
      clamp(
        22 * Math.min(1, md / 0.65) + 46 * Math.min(1, flux / 0.22) + 22 * squelchBand + burstBonus,
        2,
        99
      )
    );
    var label =
      pct < 24
        ? 'Arid Laminar Profile'
        : pct < 46
        ? 'Low-Flux Particulate'
        : pct < 70
        ? 'Elevated Fluid Turbulence'
        : 'High-Flux Hydro-Acoustic Event';
    return {
      pct: pct,
      label: label,
      flux: flux,
      md: md,
      squelchBand: squelchBand,
      fluxSeries: computeFluxSeries(f && f.spectrogram)
    };
  }

  function singleTwins(f) {
    var effFreq =
      f && f.voicedRatio >= 0.25 && f.medianPitchHz > 0
        ? f.medianPitchHz
        : clamp(safeNum(f && f.spectralCentroidHz, 260), 60, 2600);
    var flat = clamp(safeNum(f && f.spectralFlatness, 0.25), 0, 1);
    var mod = clamp(safeNum(f && f.modDepth, 0.25), 0, 1.5);

    var scores = [];
    var bestIdx = 0;
    var bestVal = -1;
    for (var i = 0; i < ACOUSTIC_TWINS.length; i++) {
      var tw = ACOUSTIC_TWINS[i];
      var octDist = Math.abs(Math.log2(Math.max(40, effFreq) / tw.freq));
      var flatDist = Math.abs(flat - tw.flat);
      var modDist = Math.abs(Math.min(1, mod) - tw.mod);
      var aff = Math.round(100 * Math.exp(-(octDist / 1.15 + flatDist * 1.4 + modDist * 0.75)));
      scores.push(aff);
      if (aff > bestVal) {
        bestVal = aff;
        bestIdx = i;
      }
    }
    return {
      effFreq: effFreq,
      flat: flat,
      scores: scores,
      bestIdx: bestIdx,
      twin: ACOUSTIC_TWINS[bestIdx],
      topScore: Math.max(0, bestVal)
    };
  }

  function singleSocial(f) {
    var dur = clamp(safeNum(f && f.duration, 0.5), 0.03, 12);
    var effFreq =
      f && f.voicedRatio >= 0.25 && f.medianPitchHz > 0
        ? f.medianPitchHz
        : clamp(safeNum(f && f.spectralCentroidHz, 260), 50, 3000);
    var cent = clamp(safeNum(f && f.spectralCentroidHz, 300), 50, 4200);
    var crest = clamp(safeNum(f && f.crestFactorDb, 8), 1, 30);

    var dogBlame = Math.round(
      clamp(100 * Math.exp(-Math.max(0, effFreq - 120) / 140) * clamp(1 - Math.abs(dur - 0.85) * 0.35, 0.25, 1), 4, 98)
    );
    var shoeScuff = Math.round(
      clamp(100 * Math.exp(-Math.max(0, dur - 0.32) / 0.35) * (0.45 + 0.55 * clamp((cent - 180) / 700, 0, 1)), 2, 97)
    );
    var leatherChair = Math.round(
      clamp(
        100 *
          Math.exp(-Math.abs(Math.log2(clamp(effFreq, 50, 900) / 165)) / 1.0) *
          (1 - 0.35 * clamp(safeNum(f && f.spectralFlatness, 0.3), 0, 1)),
        5,
        96
      )
    );
    var panicPct = Math.round(
      clamp(
        20 +
          38 * Math.min(1, dur / 1.2) +
          25 * Math.min(1, crest / 15) +
          17 * (1 - Math.exp(-safeNum(f && f.modDepth, 0.2) / 0.4)),
        5,
        99
      )
    );
    var radiusM = Number((1.8 + 10.5 * (panicPct / 100)).toFixed(1));

    var verdict;
    if (panicPct >= 75 && shoeScuff < 45 && leatherChair < 55) {
      verdict = 'Minimal environmental masking available within enclosed volume.';
    } else if (shoeScuff >= dogBlame && shoeScuff >= leatherChair) {
      verdict = 'Highest spectral overlap with transient footwear friction (' + shoeScuff + '% affinity).';
    } else if (leatherChair >= dogBlame) {
      verdict = 'Highest spectral overlap with synthetic upholstery compression (' + leatherChair + '% affinity).';
    } else {
      verdict = 'Highest low-band overlap with ambient canine vocalization (' + dogBlame + '% affinity).';
    }

    return {
      dogBlame: dogBlame,
      shoeScuff: shoeScuff,
      leatherChair: leatherChair,
      panicPct: panicPct,
      radiusM: radiusM,
      verdict: verdict
    };
  }

  /**
   * Compute all 3 humorous bonus Fartnalysis criteria directly from DSP features.
   */
  function computeBonusMetrics(fA, fB) {
    var wA = singleWetness(fA);
    var wB = singleWetness(fB);
    var wetMatch = Math.round(clamp(100 - Math.abs(wA.pct - wB.pct) * 1.15, 0, 100));

    var tA = singleTwins(fA);
    var tB = singleTwins(fB);
    var l1Twin = 0;
    var sumTwin = 0;
    for (var i = 0; i < ACOUSTIC_TWINS.length; i++) {
      l1Twin += Math.abs(tA.scores[i] - tB.scores[i]);
      sumTwin += Math.max(tA.scores[i], tB.scores[i]);
    }
    var twinMatch = Math.round(clamp(sumTwin > 0 ? 100 * (1 - l1Twin / (sumTwin + 80)) : 50, 0, 100));

    var sA = singleSocial(fA);
    var sB = singleSocial(fB);
    var radDiff = Math.abs(sA.radiusM - sB.radiusM);
    var socMatch = Math.round(
      clamp(
        100 -
          (Math.abs(sA.dogBlame - sB.dogBlame) +
            Math.abs(sA.shoeScuff - sB.shoeScuff) +
            Math.abs(sA.panicPct - sB.panicPct)) /
            3.2 -
          radDiff * 3,
        0,
        100
      )
    );

    return {
      wetness: {
        wetA: wA.pct,
        wetB: wB.pct,
        labelA: wA.label,
        labelB: wB.label,
        fluxSeriesA: wA.fluxSeries,
        fluxSeriesB: wB.fluxSeries,
        detailA: wA,
        detailB: wB,
        matchScore: wetMatch
      },
      acoustics: {
        twinA: tA.twin,
        twinB: tB.twin,
        topScoreA: tA.topScore,
        topScoreB: tB.topScore,
        affinitiesA: tA.scores,
        affinitiesB: tB.scores,
        detailA: tA,
        detailB: tB,
        items: ACOUSTIC_TWINS,
        matchScore: twinMatch
      },
      social: {
        a: sA,
        b: sB,
        matchScore: socMatch
      }
    };
  }

  /**
   * Build structured deadpan gastro-acoustic telemetry + chart specs for any criterion.
   */
  function buildCriterionReport(key, soundA, soundB, result) {
    ensureHydratedSound(soundA);
    ensureHydratedSound(soundB);

    var fA = soundA.features;
    var fB = soundB.features;
    var res = result;
    if (!res || !res.breakdown) {
      res = TootApp.DSP.compareSounds(fA, fB);
    }
    var bd = res.breakdown || {};
    var nameA = soundA.name || 'Sound A';
    var nameB = soundB.name || 'Sound B';
    var bonus = computeBonusMetrics(fA, fB);

    if (key === 'duration') {
      var d = bd.duration || {
        d1: Math.max(0.02, fA.duration),
        d2: Math.max(0.02, fB.duration),
        durationRatio: Math.min(fA.duration, fB.duration) / Math.max(0.02, Math.max(fA.duration, fB.duration)),
        deltaSec: fB.duration - fA.duration
      };
      var deltaMs = Math.round(d.deltaSec * 1000);
      var deltaTag =
        Math.abs(deltaMs) < 35
          ? 'Exceptional temporal discipline — emission termination aligned within ±' + Math.abs(deltaMs) + ' ms.'
          : deltaMs > 0
          ? 'Comparative recording extended +' + deltaMs + ' ms beyond Reference Specimen (' + fmt((d.d2 / d.d1 - 1) * 100, 0) + '% longer lifetime).'
          : 'Comparative recording terminated ' + Math.abs(deltaMs) + ' ms prior to Reference Specimen (' + fmt((1 - d.d2 / d.d1) * 100, 0) + '% shorter lifetime).';
      return {
        key: 'duration',
        badgeCode: 'DOC-01 // EMISSION LIFETIME',
        title: 'Emission Lifetime & Temporal Discharge Audit',
        subtitle: 'Quantifies absolute emission lifetime, T10–T90 acoustic energy burn rate, and temporal observed variance.',
        weightLabel: 'Weight: 14%',
        score: res.durationScore,
        commentary: 'Research Note: ' + deltaTag + ' Evaluated with power-law ratio exponent (1.25).',
        formula:
          'DurationScore = 100 × (min(' +
          fmt(d.d1, 3) +
          's, ' +
          fmt(d.d2, 3) +
          's) / max)^1.25 = 100 × (' +
          fmt(d.durationRatio, 3) +
          ')^1.25 = ' +
          res.durationScore +
          '%',
        stats: [
          { label: 'Reference Lifetime (A)', value: fmt(d.d1, 2) + 's', sub: nameA },
          { label: 'Comparative Lifetime (B)', value: fmt(d.d2, 2) + 's', sub: nameB },
          { label: 'Observed Variance (B−A)', value: (deltaMs >= 0 ? '+' : '') + deltaMs + ' ms', sub: fmt(d.durationRatio * 100, 1) + '% lifetime ratio' },
          { label: 'Peak Onset Latency', value: fmt(fA.attackSec, 2) + 's vs ' + fmt(fB.attackSec, 2) + 's', sub: 'Time to maximum acoustic output' },
          { label: 'T50 Midpoint Burn', value: fmt(fA.t50Ratio * 100, 0) + '% vs ' + fmt(fB.t50Ratio * 100, 0) + '%', sub: '50% cumulative energy coordinate' },
          { label: 'Attenuation Tail', value: fmt(fA.decaySec, 2) + 's vs ' + fmt(fB.decaySec, 2) + 's', sub: 'Post-peak pressure decay window' }
        ],
        charts: [
          {
            id: 'realTimeOverlap',
            title: 'Synchronized Wall-Clock Timeline (Seconds)',
            subtitle: 'Plots Specimen A and Recording B in absolute time — shaded band denotes temporal variance',
            drawType: 'realTimeOverlap'
          },
          {
            id: 'cumulativeBurn',
            title: 'Cumulative Acoustic Energy Integral (T10 / T50 / T90)',
            subtitle: 'Normalized 0% → 100% pressure discharge progression across each specimen',
            drawType: 'cumulativeBurn'
          }
        ]
      };
    }

    if (key === 'pitch') {
      var p = bd.pitch || {};
      var vA = Math.round(safeNum(fA.voicedRatio, 0) * 100);
      var vB = Math.round(safeNum(fB.voicedRatio, 0) * 100);
      var noteA = p.refUnvoiced ? 'Unvoiced / Broadband' : Math.round(fA.medianPitchHz) + ' Hz • ' + hzToNoteName(fA.medianPitchHz);
      var noteB = p.userUnvoiced ? 'Unvoiced / Broadband' : Math.round(fB.medianPitchHz) + ' Hz • ' + hzToNoteName(fB.medianPitchHz);
      var intervalStr =
        p.semitoneDiff != null
          ? (fB.medianPitchHz >= fA.medianPitchHz ? '+' : '−') + fmt(p.semitoneDiff, 2) + ' st'
          : p.refUnvoiced && p.userUnvoiced
          ? 'Both Broadband'
          : 'Voiced vs Unvoiced Variance';

      var sweepLabel =
        safeNum(p.polarityMul, 1) < 1
          ? 'OPPOSED SLOPE (×0.28)'
          : 'ALIGNED (×1.00)';

      var pitchModeFormula;
      if (p.refUnvoiced && p.userUnvoiced) {
        pitchModeFormula =
          'Unvoiced Mode: (0.45×Centroid(' + Math.round(p.centroidMatch) + '%) + 0.25×ZCR(' + Math.round(p.zcrMatch) + '%) + 0.30×Trend(' + Math.round(p.trendScore) + '%)) × ' + fmt(p.polarityMul, 2) + ' = ' + res.pitchScore + '%';
      } else if (p.refUnvoiced !== p.userUnvoiced) {
        pitchModeFormula =
          'Mixed Voicing Cap: min(45%, 0.45×Centroid(' + Math.round(p.centroidMatch) + '%) + 0.25×ZCR(' + Math.round(p.zcrMatch) + '%) + 0.30×Voiced(' + Math.round(p.voicedMatch) + '%)) = ' + res.pitchScore + '%';
      } else {
        pitchModeFormula =
          'Voiced Mode: (0.45×F0(' + Math.round(p.absPitch) + '%, Δ=' + fmt(p.semitoneDiff, 2) + 'st) + 0.25×Centroid(' + Math.round(p.centroidMatch) + '%) + 0.20×Trend(' + Math.round(p.trendScore) + '%) + 0.10×Voicing(' + Math.round(p.voicedMatch) + '%)) × ' + fmt(p.polarityMul, 2) + ' = ' + res.pitchScore + '%';
      }

      var pitchComment =
        safeNum(p.polarityMul, 1) < 1
          ? 'Contour Polarity Divergence: One recording exhibits an ascending trajectory while the comparative trajectory descends, activating the ×0.28 sweep polarity coefficient.'
          : p.refUnvoiced !== p.userUnvoiced
          ? 'Voicing Regime Variance: One recording remained unvoiced broadband dispersion while the other sustained coherent fundamental resonance (' + (noteA.split('•')[0]) + ' vs ' + (noteB.split('•')[0]) + ').'
          : p.semitoneDiff != null && p.semitoneDiff < 2.2
          ? 'High-Precision Resonance Convergence: Primary resonance locked within ' + fmt(p.semitoneDiff, 2) + ' semitones across reference frames.'
          : 'Frequency Variance Logged: Specimens separated by ' + (p.semitoneDiff != null ? fmt(p.semitoneDiff, 2) + ' semitones' : 'spectral register dispersion') + '.';

      return {
        key: 'pitch',
        badgeCode: 'DOC-02 // PRIMARY RESONANCE',
        title: 'Primary Resonance Profile & Sweep Polarimetry',
        subtitle: 'Tracks fundamental frequency F0 (45–650 Hz), musical harmonic alignment, and trajectory polarity.',
        weightLabel: 'Weight: 26%',
        score: res.pitchScore,
        commentary: 'Laboratory Observation: ' + pitchComment,
        formula: pitchModeFormula,
        stats: [
          { label: 'Reference Resonance (A)', value: noteA, sub: vA + '% voiced frames' },
          { label: 'Comparative Resonance (B)', value: noteB, sub: vB + '% voiced frames' },
          { label: 'Semitone Variance (|Δ|)', value: intervalStr, sub: p.semitoneDiff != null ? '±7.5 st tolerance scale' : 'Spectral centroid mode' },
          { label: 'Excursion Span (P10–P90)', value: fmt(fA.pitchRangeSemitones, 1) + ' vs ' + fmt(fB.pitchRangeSemitones, 1) + ' st', sub: 'Intra-event pitch modulation span' },
          { label: 'Centroid Sweep (Δ Oct)', value: (p.ct1 >= 0 ? '+' : '') + fmt(p.ct1, 2) + ' vs ' + (p.ct2 >= 0 ? '+' : '') + fmt(p.ct2, 2), sub: 'Terminal-third minus onset-third' },
          { label: 'Trajectory Polarity', value: sweepLabel, sub: (p.oppCent || p.oppPitch) ? 'Opposite slope detected' : 'Contour directions compatible' }
        ],
        charts: [
          {
            id: 'pitchTrajectory',
            title: 'Log-Hz F0 Trajectory & Centroid Contour (45–650+ Hz)',
            subtitle: 'Solid + markers = voiced F0 track • Dashed = spectral centroid • Equal-temperament grid',
            drawType: 'pitchTrajectory'
          },
          {
            id: 'pitchHistAndInterval',
            title: 'Voiced Resonance Histogram & Semitone Deviation Ruler',
            subtitle: 'Left: frame distribution by Hz • Right: interval variance scale (−12 to +12 semitones)',
            drawType: 'pitchHistAndInterval'
          }
        ]
      };
    }

    if (key === 'modulation') {
      var m = bd.modulation || {};
      var mrA = safeNum(fA.modRateHz, 0);
      var mrB = safeNum(fB.modRateHz, 0);
      var mdA = safeNum(fA.modDepth, 0);
      var mdB = safeNum(fB.modDepth, 0);
      var cpmA = Math.round(mrA * 60);
      var cpmB = Math.round(mrB * 60);

      var regimeA = fA.burstCount >= 3 ? 'Staccato Multi-Burst' : mdA >= 0.35 ? 'Elevated Oscillation' : mdA < 0.16 ? 'Laminar Continuous' : 'Moderate Modulation';
      var regimeB = fB.burstCount >= 3 ? 'Staccato Multi-Burst' : mdB >= 0.35 ? 'Elevated Oscillation' : mdB < 0.16 ? 'Laminar Continuous' : 'Moderate Modulation';

      return {
        key: 'modulation',
        badgeCode: 'DOC-03 // OSCILLATION CADENCE',
        title: 'Airflow Oscillation Cadence & Impulse Segmentation',
        subtitle: 'Quantifies periodic envelope modulation velocity (cycles/min) and discrete impulse segmentation count.',
        weightLabel: 'Weight: 18%',
        score: res.modulationScore,
        commentary:
          'Field Observation: Reference A operates in a "' +
          regimeA +
          '" regime (' +
          fA.burstCount +
          ' burst' +
          (fA.burstCount === 1 ? '' : 's') +
          ', ' +
          cpmA +
          ' cycles/min), while Comparative B registers "' +
          regimeB +
          '" (' +
          fB.burstCount +
          ' burst' +
          (fB.burstCount === 1 ? '' : 's') +
          ', ' +
          cpmB +
          ' cycles/min).',
        formula:
          'ModScore = 0.35×Depth(' +
          Math.round(m.depthMatch) +
          '%) + 0.35×BandSplit(' +
          Math.round(m.modBandScore) +
          '%) + 0.30×[0.65×Bursts(' +
          Math.round(m.burstMatch) +
          '%) + 0.35×Flux(' +
          Math.round(m.fluxMatch) +
          '%)] = ' +
          res.modulationScore +
          '%',
        stats: [
          { label: 'Cadence Rate (A)', value: Math.round(mrA) + ' Hz', sub: cpmA + ' oscillation cycles/min' },
          { label: 'Cadence Rate (B)', value: Math.round(mrB) + ' Hz', sub: cpmB + ' oscillation cycles/min' },
          { label: 'Modulation Depth CV', value: Math.round(mdA * 100) + '% vs ' + Math.round(mdB * 100) + '%', sub: 'std(env) / mean(env)' },
          { label: 'Impulse Segments', value: fA.burstCount + ' vs ' + fB.burstCount, sub: 'Gate >0.35 / Re-arm <0.18' },
          { label: 'Spectral Flux Rate', value: fmt(fA.spectralFlux, 3) + ' vs ' + fmt(fB.spectralFlux, 3), sub: 'Inter-frame mutation rate' },
          { label: 'Regime Classification', value: regimeA.split(' ')[0] + ' vs ' + regimeB.split(' ')[0], sub: 'Kinematic vibration profile' }
        ],
        charts: [
          {
            id: 'modSpectrum',
            title: '4–45 Hz Airflow Modulation FFT Spectrum',
            subtitle: 'Low Cadence (4–8 Hz) • Mid Oscillation (8–20 Hz) • Rapid Oscillation (20–45 Hz)',
            drawType: 'modSpectrum'
          },
          {
            id: 'burstAndModBands',
            title: '3-Band Modulation Distribution & Hysteresis Gates',
            subtitle: 'Top: band distribution • Bottom: envelopes vs Burst (0.35) & Valley (0.18) thresholds',
            drawType: 'burstAndModBands'
          }
        ]
      };
    }

    if (key === 'timbre') {
      var t = bd.timbre || {};
      var zcrScore = (bd.pitch && bd.pitch.zcrMatch) || 0;
      var zcrFlatAvg = 0.5 * safeNum(t.flatMatch, 0) + 0.5 * safeNum(zcrScore, 0);
      var clothVerdict =
        fB.spectralCentroidHz < fA.spectralCentroidHz * 0.72
          ? 'Comparative recording exhibits pronounced low-pass cavity damping relative to Reference A.'
          : fB.spectralCentroidHz > fA.spectralCentroidHz * 1.35
          ? 'Comparative recording carries elevated high-frequency dispersion relative to Reference A.'
          : 'Spectral distribution and cavity damping coefficients show tight cross-specimen alignment.';
      return {
        key: 'timbre',
        badgeCode: 'DOC-04 // SPECTRAL DISTRIBUTION',
        title: 'Spectral Distribution Map, 12-D MFCC & Residual Surface',
        subtitle: 'Deconstructs harmonic coloration across 40 log bands, 12 cepstral dimensions, 3 temporal phases, and 2,240 STFT cells.',
        weightLabel: 'Weight: 28% (Primary)',
        score: res.timbreScore,
        commentary:
          'Research Note: ' +
          clothVerdict +
          ' Spectral centroids stand at ' +
          Math.round(fA.spectralCentroidHz) +
          ' Hz (A) vs ' +
          Math.round(fB.spectralCentroidHz) +
          ' Hz (B), with MFCC distance d=' +
          fmt(t.dMean, 2) +
          '.',
        formula:
          'Timbre = 0.25×MFCC_Mean(' +
          Math.round(t.mfccMeanScore) +
          '%) + 0.35×MFCC_3Act(' +
          Math.round(t.mfccMacroScore) +
          '%) + 0.15×Bands4(' +
          Math.round(t.bandProfileScore) +
          '%) + 0.15×GridR(' +
          Math.round(t.gridCorr) +
          '%) + 0.10×FlatZCR(' +
          Math.round(zcrFlatAvg) +
          '%) = ' +
          res.timbreScore +
          '%',
        stats: [
          { label: 'Spectral Centroid', value: Math.round(fA.spectralCentroidHz) + ' vs ' + Math.round(fB.spectralCentroidHz) + ' Hz', sub: 'Low-band weight vs upper energy' },
          { label: 'Spectral Flatness', value: fmt(fA.spectralFlatness, 2) + ' vs ' + fmt(fB.spectralFlatness, 2), sub: '0=harmonic reed • 1=broadband air' },
          { label: 'MFCC Distance (12-D)', value: fmt(t.dMean, 2), sub: Math.round(t.mfccMeanScore) + '% cepstral alignment' },
          { label: '3-Phase Macro MFCC Dist', value: fmt(t.dMacro, 2), sub: Math.round(t.mfccMacroScore) + '% onset/mid/tail score' },
          { label: '4-Band EQ Alignment', value: Math.round(t.bandProfileScore) + '%', sub: 'Sub / Mid-Low / Upper / Air L1 match' },
          { label: 'STFT Grid Pearson r', value: Math.round(t.gridCorr) + '%', sub: 'Normalized 56×40 cell correlation' }
        ],
        charts: [
          {
            id: 'avgSpectrumEQ',
            title: 'Spectral Distribution Map (40 Log Bands, 45–4200 Hz)',
            subtitle: 'Mean energy across Sub-Bass, Low-Mid Resonance, Upper Midrange & Broadband Air',
            drawType: 'avgSpectrumEQ'
          },
          {
            id: 'mfccFingerprint',
            title: '12-D MFCC Cepstral Fingerprint & 4-Band Energy Split',
            subtitle: 'Top: DCT cepstral coefficients C1–C12 • Bottom: energy distribution per band',
            drawType: 'mfccFingerprint'
          },
          {
            id: 'specDiffHeatmap',
            title: '56×40 Time-Frequency Spectral Residual Map (Specimen A − B)',
            subtitle: 'Time (left→right) × Frequency (bottom→top): Dark = match • Cyan = stronger in A • Magenta = stronger in B',
            drawType: 'specDiffHeatmap',
            fullSpan: true
          }
        ]
      };
    }

    if (key === 'envelope') {
      var envLag = (bd.envelope && bd.envelope.lagProfile) || TootApp.DSP.computeEnvelopeLagProfile(fA.envelope, fB.envelope);
      var bestLag = envLag.bestLag || 0;
      var shiftMs = Math.round((bestLag / 64) * Math.max(fB.duration, 0.02) * 1000);
      var shiftText =
        bestLag === 0
          ? '0 bins (Phase-Aligned)'
          : (bestLag > 0 ? '+' : '') + bestLag + ' bins (~' + (shiftMs >= 0 ? '+' : '') + shiftMs + ' ms)';
      return {
        key: 'envelope',
        badgeCode: 'DOC-05 // PRESSURE RELEASE',
        title: 'Lag-Compensated Pressure Release & Crest Dynamics',
        subtitle: 'Cross-correlates Comparative B across ±6 normalized time bins to isolate structural pressure geometry from trigger offset.',
        weightLabel: 'Weight: 14%',
        score: res.envelopeScore,
        commentary:
          'Pressure Release Assessment: After aligning Comparative B by ' +
          shiftText +
          ', normalized contour correlation reached ' +
          Math.round(envLag.bestCorr) +
          '%. Crest output measured ' +
          fmt(fA.crestFactorDb, 1) +
          ' dB (A) vs ' +
          fmt(fB.crestFactorDb, 1) +
          ' dB (B).',
        formula:
          'BestLag[' +
          bestLag +
          ' bins]: 0.55×Corr(' +
          Math.round(envLag.bestCorr) +
          '%) + 0.45×L1_Fit(' +
          Math.round(envLag.bestL1) +
          '%) = ' +
          res.envelopeScore +
          '%',
        stats: [
          { label: 'Optimal Lag Offset', value: bestLag === 0 ? '0 bins' : (bestLag > 0 ? '+' : '') + bestLag + ' bins', sub: shiftText },
          { label: 'Aligned Pearson r', value: Math.round(envLag.bestCorr) + '%', sub: 'Linear pressure contour correlation' },
          { label: 'Aligned L1 Fit', value: Math.round(envLag.bestL1) + '%', sub: 'Normalized envelope area overlap' },
          { label: 'Crest Output (dB)', value: fmt(fA.crestFactorDb, 1) + ' vs ' + fmt(fB.crestFactorDb, 1) + ' dB', sub: 'Peak-to-RMS energy ratio' },
          { label: 'Peak Energy Position', value: Math.round(fA.peakTimeRatio * 100) + '% vs ' + Math.round(fB.peakTimeRatio * 100) + '%', sub: 'Normalized max amplitude coordinate' },
          { label: 'T90 Energy Depletion', value: Math.round(fA.t90Ratio * 100) + '% vs ' + Math.round(fB.t90Ratio * 100) + '%', sub: 'Coordinate reaching 90% cumulative energy' }
        ],
        charts: [
          {
            id: 'alignedEnvelope',
            title: 'Optimal Lag-Aligned Pressure Contour (64 Bins)',
            subtitle: 'Cyan = Reference A • Solid Magenta = Aligned B • Dotted = Unaligned B • Shaded = Observed Variance',
            drawType: 'alignedEnvelope'
          },
          {
            id: 'lagCurve',
            title: '±6-Bin Lag Cross-Correlation Sweep',
            subtitle: 'Combined score & linear correlation across every evaluated phase shift',
            drawType: 'lagCurve'
          }
        ]
      };
    }

    if (key === 'wetness') {
      var w = bonus.wetness;
      var wetDiff = Math.abs(w.wetA - w.wetB);
      var wetNote =
        w.wetA >= 65 && w.wetB >= 65
          ? 'Both specimens exhibit elevated hydro-acoustic turbulence and vigorous fluid-boundary micro-modulation.'
          : wetDiff <= 15
          ? 'Closely aligned hydro-acoustic profile: both Specimen A (' + w.labelA + ') and B (' + w.labelB + ') agree within ' + wetDiff + ' index points.'
          : w.wetB > w.wetA
          ? 'Comparative B demonstrates ' + wetDiff + '% higher spectral flux turbulence (' + w.labelB + ') than Reference A (' + w.labelA + ').'
          : 'Reference A carries ' + wetDiff + '% greater mid-band fluid modulation (' + w.labelA + ') than Comparative B (' + w.labelB + ').';

      return {
        key: 'wetness',
        badgeCode: 'DOC-06 // HYDRO-ACOUSTIC FLUX',
        title: 'Hydro-Acoustic Turbulence & Spectral Flux Index',
        subtitle: 'Combines frame-to-frame spectral flux transients, modulation depth, and mid-frequency resonance concentration.',
        weightLabel: 'Supplementary Module',
        score: w.matchScore,
        commentary: 'Research Observation: ' + wetNote,
        formula:
          'HydroFluxIndex = 22×min(1, ModDepth/0.65) + 46×min(1, Flux/0.22) + 22×MidBand + BurstBonus | A=' +
          w.wetA +
          '% vs B=' +
          w.wetB +
          '% (Prox ' +
          w.matchScore +
          '%)',
        stats: [
          { label: 'Reference Flux (A)', value: w.wetA + '%', sub: w.labelA },
          { label: 'Comparative Flux (B)', value: w.wetB + '%', sub: w.labelB },
          { label: 'Observed Variance', value: w.matchScore + '%', sub: wetDiff + ' pt index separation' },
          { label: 'Turbulence Flux (A/B)', value: fmt(fA.spectralFlux, 3) + ' vs ' + fmt(fB.spectralFlux, 3), sub: 'Inter-frame transient volatility' },
          { label: 'Mid-Band Share', value: Math.round(w.detailA.squelchBand * 100) + '% vs ' + Math.round(w.detailB.squelchBand * 100) + '%', sub: '150–1200 Hz formant concentration' },
          { label: 'Modulation Depth', value: Math.round(w.detailA.md * 100) + '% vs ' + Math.round(w.detailB.md * 100) + '%', sub: 'Envelope amplitude variance' }
        ],
        charts: [
          {
            id: 'wetnessGauge',
            title: 'Dual Hydro-Acoustic Turbulence Gauges',
            subtitle: 'Left Gauge: Specimen A (' + w.labelA + ') • Right Gauge: Recording B (' + w.labelB + ')',
            drawType: 'wetnessGauge'
          },
          {
            id: 'fluxTimeSeries',
            title: 'Per-Frame Spectral Flux & Turbulence Timeline',
            subtitle: 'Peaks mark rapid frame-to-frame spectral transition events over time',
            drawType: 'fluxTimeSeries'
          }
        ]
      };
    }

    if (key === 'acoustics') {
      var ac = bonus.acoustics;
      var twinNote =
        ac.twinA.name === ac.twinB.name
          ? 'Taxonomic convergence achieved: both specimens map nearest to "' + ac.twinA.name + '" within the Institute acoustic reference atlas.'
          : 'Taxonomic divergence observed: Reference A aligns with "' +
            ac.twinA.name +
            '" (~' +
            Math.round(ac.detailA.effFreq) +
            ' Hz), whereas Comparative B aligns with "' +
            ac.twinB.name +
            '" (~' +
            Math.round(ac.detailB.effFreq) +
            ' Hz).';

      return {
        key: 'acoustics',
        badgeCode: 'DOC-07 // REFERENCE ANALOGUE',
        title: 'Acoustic Reference Analogue Classification Matrix',
        subtitle: 'Computes pitch, flatness, and modulation affinity against 8 calibrated environmental and mechanical acoustic prototypes.',
        weightLabel: 'Supplementary Module',
        score: ac.matchScore,
        commentary: 'Archive Observation: ' + twinNote,
        formula:
          'Affinity(Ref) = 100 × exp(−(|Δoct|/1.15 + |ΔFlat|×1.4 + |ΔMod|×0.75)) | Ref A: ' +
          ac.twinA.short +
          ' (' +
          ac.topScoreA +
          '%) vs Ref B: ' +
          ac.twinB.short +
          ' (' +
          ac.topScoreB +
          '%)',
        stats: [
          { label: 'Reference Analogue (A)', value: ac.twinA.short, sub: ac.topScoreA + '% affinity (~' + ac.twinA.freq + ' Hz)' },
          { label: 'Comparative Analogue (B)', value: ac.twinB.short, sub: ac.topScoreB + '% affinity (~' + ac.twinB.freq + ' Hz)' },
          { label: 'Vector Overlap', value: ac.matchScore + '%', sub: 'Shared 8-class taxonomic distribution' },
          { label: 'Effective Resonance', value: Math.round(ac.detailA.effFreq) + ' vs ' + Math.round(ac.detailB.effFreq) + ' Hz', sub: 'F0 or broadband centroid' },
          { label: 'Spectral Flatness', value: fmt(ac.detailA.flat, 2) + ' vs ' + fmt(ac.detailB.flat, 2), sub: 'Harmonic vs dispersion axis' },
          { label: 'Acoustic Regime', value: ac.detailA.effFreq < 130 ? 'Barometric Sub-Bass' : ac.detailA.effFreq < 400 ? 'Resonant Manifold' : 'High Aperture Dispersion', sub: 'Primary frequency classification' }
        ],
        charts: [
          {
            id: 'doppelgangerBars',
            title: '8-Prototype Environmental Affinity Distribution',
            subtitle: 'Thunderfront • Foghorn • Clay Suction • Manifold • Waterfowl • Elastomer • Membrane • Steam Vent',
            drawType: 'doppelgangerBars'
          },
          {
            id: 'harmonicSpace',
            title: '2D Acoustic Taxonomy Plane (Frequency Hz × Spectral Flatness)',
            subtitle: 'Plots Specimen A (Cyan) & Recording B (Magenta) relative to 8 calibrated prototypes',
            drawType: 'harmonicSpace'
          }
        ]
      };
    }

    if (key === 'social') {
      var soc = bonus.social;
      var sA = soc.a;
      var sB = soc.b;
      return {
        key: 'social',
        badgeCode: 'DOC-08 // PROPAGATION & MASKING',
        title: 'Confined-Space Propagation & Environmental Masking Model',
        subtitle: 'Models spectral masking affinity against benign room acoustics (footwear, upholstery, ambient canine) and estimated propagation perimeter.',
        weightLabel: 'Supplementary Module',
        score: soc.matchScore,
        commentary: 'Field Observation — Specimen A: ' + sA.verdict + ' | Specimen B: ' + sB.verdict,
        formula:
          'PropagationRadius(m) = 1.8 + 10.5 × NoticeabilityIdx | Specimen A=' +
          fmt(sA.radiusM, 1) +
          'm (' +
          sA.panicPct +
          '% noticeability) vs B=' +
          fmt(sB.radiusM, 1) +
          'm (' +
          sB.panicPct +
          '% noticeability)',
        stats: [
          { label: 'Propagation Radius (A/B)', value: fmt(sA.radiusM, 1) + 'm vs ' + fmt(sB.radiusM, 1) + 'm', sub: 'Estimated open-air reach' },
          { label: 'Canine Vocal Overlap', value: sA.dogBlame + '% vs ' + sB.dogBlame + '%', sub: 'Low-frequency resonance overlap' },
          { label: 'Footwear Friction Overlap', value: sA.shoeScuff + '% vs ' + sB.shoeScuff + '%', sub: 'Transient upper-band overlap' },
          { label: 'Upholstery Compression', value: sA.leatherChair + '% vs ' + sB.leatherChair + '%', sub: 'Mid-band leather/vinyl overlap' },
          { label: 'Ambient Noticeability', value: sA.panicPct + '% vs ' + sB.panicPct + '%', sub: 'Crest & duration saliency index' },
          { label: 'Propagation Parity', value: soc.matchScore + '%', sub: 'Environmental profile similarity' }
        ],
        charts: [
          {
            id: 'alibiMatrix',
            title: 'Environmental Masking Affinity Matrix (%)',
            subtitle: 'Compares Canine, Upholstery, Footwear & Noticeability coefficients between A and B',
            drawType: 'alibiMatrix'
          },
          {
            id: 'shockwaveRings',
            title: 'Estimated Acoustic Propagation Radius (Meters)',
            subtitle: 'Top-down dispersion contours (2m, 5m, 10m, 14m) across enclosed space boundaries',
            drawType: 'shockwaveRings'
          }
        ]
      };
    }

    // Default: 'overall'
    var ov = bd.overall || {};
    var capNote = [];
    if (ov.coreCapApplied) {
      capNote.push('Core Identity Guard engaged (0.5×Pitch + 0.5×Timbre = ' + fmt(ov.coreIdentity, 1) + '% < 45%)');
    }
    if (ov.minKeyCapApplied) {
      capNote.push('Bottleneck Guard engaged (min key metric = ' + fmt(ov.minKey, 1) + '% < 25%)');
    }
    var capStr = capNote.length > 0 ? capNote.join(' • ') : 'All five primary telemetry domains satisfied convergence thresholds without scalar capping.';

    return {
      key: 'overall',
      badgeCode: 'DOC-00 // ISO-FART-9000',
      title: 'Laboratory Assessment & Hybrid Eigen-Fidelity Index',
      subtitle: 'Integrates five core telemetry vectors (60% arithmetic mean + 40% geometric mean) with non-compensatory bounds.',
      weightLabel: 'Composite Fidelity',
      score: res.overall,
      commentary:
        'Scientific Consensus (' +
        res.title +
        ', Grade ' +
        res.grade +
        '): Arithmetic Mean=' +
        fmt(ov.weightedArith, 1) +
        '%, Geometric Mean=' +
        fmt(ov.weightedGeom, 1) +
        '%. ' +
        capStr +
        ' (Reference Analogues: ' +
        bonus.acoustics.twinA.short +
        ' vs ' +
        bonus.acoustics.twinB.short +
        '.)',
      formula:
        'Fidelity = 0.60×Arith(' +
        fmt(ov.weightedArith, 1) +
        '%) + 0.40×Geom(' +
        fmt(ov.weightedGeom, 1) +
        '%) = ' +
        fmt(ov.uncappedOverall, 1) +
        '%' +
        (ov.coreCapApplied || ov.minKeyCapApplied ? ' → Bounded to ' + res.overall + '%' : ' → ' + res.overall + '%'),
      stats: [
        { label: 'Weighted Arithmetic (60%)', value: fmt(ov.weightedArith, 1) + '%', sub: 'Linear aggregate of 5 domains' },
        { label: 'Weighted Geometric (40%)', value: fmt(ov.weightedGeom, 1) + '%', sub: 'Penalizes cross-domain variance' },
        { label: 'Core Identity Avg', value: fmt(ov.coreIdentity, 1) + '%', sub: '0.5×Resonance + 0.5×Spectral (Cap < 45%)' },
        { label: 'Min Key Criterion', value: fmt(ov.minKey, 1) + '%', sub: 'Resonance/Spectral/Cadence floor (< 25%)' },
        { label: 'Hydro-Acoustic Flux (A/B)', value: bonus.wetness.wetA + '% vs ' + bonus.wetness.wetB + '%', sub: bonus.wetness.labelA + ' / ' + bonus.wetness.labelB },
        { label: 'Classification Grade', value: res.grade + ' • ' + res.overall + '%', sub: res.title }
      ],
      charts: [
        {
          id: 'radar',
          title: '5-Axis Acoustic Fidelity Compliance Radar',
          subtitle: 'Polygonal parity symmetry relative to 100% reference boundary',
          drawType: 'radar'
        },
        {
          id: 'synthesisBars',
          title: 'Weighted Domain Contribution & Fusion Architecture',
          subtitle: 'Individual domain weighting + Arithmetic vs Geometric convergence',
          drawType: 'synthesisBars'
        }
      ]
    };
  }

  /* ==================== CANVAS 2D CHART ENGINE ==================== */
  function setupCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var w = rect && rect.width > 40 ? rect.width : 480;
    var h = rect && rect.height > 40 ? rect.height : 220;
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#070a13';
    ctx.fillRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function drawPolyline(ctx, pts, color, lineWidth, dashed) {
    if (!pts || pts.length === 0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth || 2;
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawAxesBox(ctx, padL, padT, plotW, plotH, xTicks, yTicks) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.lineWidth = 1;

    if (yTicks) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (var yi = 0; yi < yTicks.length; yi++) {
        var yt = yTicks[yi];
        var y = padT + (1 - yt.pos) * plotH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.fillText(yt.label, padL - 6, y);
      }
    }

    if (xTicks) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (var xi = 0; xi < xTicks.length; xi++) {
        var xt = xTicks[xi];
        var x = padL + xt.pos * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + plotH);
        ctx.stroke();
        ctx.fillText(xt.label, x, padT + plotH + 5);
      }
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.30)';
    ctx.strokeRect(padL, padT, plotW, plotH);
    ctx.restore();
  }

  function drawChart(canvas, drawType, soundA, soundB, result) {
    var setup = setupCanvas(canvas);
    var ctx = setup.ctx;
    var w = setup.w;
    var h = setup.h;
    var fA = soundA.features;
    var fB = soundB.features;
    var bd = (result && result.breakdown) || {};

    if (drawType === 'radar') {
      var axes = [
        { label: 'Lifetime (14%)', score: result.durationScore },
        { label: 'Resonance (26%)', score: result.pitchScore },
        { label: 'Cadence (18%)', score: result.modulationScore },
        { label: 'Spectral (28%)', score: result.timbreScore },
        { label: 'Pressure (14%)', score: result.envelopeScore }
      ];
      var cx = w * 0.5;
      var cy = h * 0.53;
      var R = Math.max(40, Math.min(w, h) * 0.33);

      // Rings
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (var ring = 1; ring <= 5; ring++) {
        var rr = (ring / 5) * R;
        ctx.strokeStyle = ring === 5 ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.14)';
        ctx.beginPath();
        for (var a = 0; a < 5; a++) {
          var ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
          var rx = cx + Math.cos(ang) * rr;
          var ry = cy + Math.sin(ang) * rr;
          if (a === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(148,163,184,0.65)';
        ctx.fillText(String(ring * 20), cx + 4, cy - rr + 2);
      }

      // Spokes & Labels
      for (var sIdx = 0; sIdx < 5; sIdx++) {
        var angS = -Math.PI / 2 + (sIdx * 2 * Math.PI) / 5;
        var sx = cx + Math.cos(angS) * R;
        var sy = cy + Math.sin(angS) * R;
        ctx.strokeStyle = 'rgba(148,163,184,0.18)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        var lx = cx + Math.cos(angS) * (R + 18);
        var ly = cy + Math.sin(angS) * (R + 16);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = Math.cos(angS) > 0.25 ? 'left' : Math.cos(angS) < -0.25 ? 'right' : 'center';
        ctx.textBaseline = Math.sin(angS) > 0.25 ? 'top' : Math.sin(angS) < -0.25 ? 'bottom' : 'middle';
        ctx.fillText(axes[sIdx].label + ' ' + axes[sIdx].score + '%', lx, ly);
      }

      // Data polygon
      var polyCol = scoreColor(result.overall);
      ctx.beginPath();
      var pts = [];
      for (var pIdx = 0; pIdx < 5; pIdx++) {
        var angP = -Math.PI / 2 + (pIdx * 2 * Math.PI) / 5;
        var pr = (clamp(axes[pIdx].score, 0, 100) / 100) * R;
        var px = cx + Math.cos(angP) * pr;
        var py = cy + Math.sin(angP) * pr;
        pts.push([px, py]);
        if (pIdx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
      ctx.fill();
      ctx.strokeStyle = polyCol;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      for (var dIdx = 0; dIdx < pts.length; dIdx++) {
        ctx.fillStyle = scoreColor(axes[dIdx].score);
        ctx.beginPath();
        ctx.arc(pts[dIdx][0], pts[dIdx][1], 4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (drawType === 'synthesisBars') {
      var ov = bd.overall || { weightedArith: result.overall, weightedGeom: result.overall };
      var rows = [
        { name: 'Lifetime × 14%', val: result.durationScore * 0.14, max: 14, col: '#60a5fa', txt: fmt(result.durationScore * 0.14, 1) + ' / 14 pts' },
        { name: 'Resonance × 26%', val: result.pitchScore * 0.26, max: 26, col: '#34d399', txt: fmt(result.pitchScore * 0.26, 1) + ' / 26 pts' },
        { name: 'Spectral × 28%', val: result.timbreScore * 0.28, max: 28, col: '#fb7185', txt: fmt(result.timbreScore * 0.28, 1) + ' / 28 pts' },
        { name: 'Cadence × 18%', val: result.modulationScore * 0.18, max: 18, col: '#facc15', txt: fmt(result.modulationScore * 0.18, 1) + ' / 18 pts' },
        { name: 'Pressure × 14%', val: result.envelopeScore * 0.14, max: 14, col: '#38bdf8', txt: fmt(result.envelopeScore * 0.14, 1) + ' / 14 pts' },
        { name: 'Arith Mean (60%)', val: ov.weightedArith, max: 100, col: '#94a3b8', txt: fmt(ov.weightedArith, 1) + '%' },
        { name: 'Geom Mean (40%)', val: ov.weightedGeom, max: 100, col: '#c084fc', txt: fmt(ov.weightedGeom, 1) + '%' },
        { name: 'FIDELITY SCORE', val: result.overall, max: 100, col: scoreColor(result.overall), txt: result.overall + '%' }
      ];
      var padL = 112;
      var padR = 82;
      var padT = 14;
      var rowH = (h - padT - 12) / rows.length;
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (var ri = 0; ri < rows.length; ri++) {
        var row = rows[ri];
        var y = padT + ri * rowH;
        if (ri === 5) {
          ctx.strokeStyle = 'rgba(148,163,184,0.22)';
          ctx.beginPath();
          ctx.moveTo(10, y - 2);
          ctx.lineTo(w - 10, y - 2);
          ctx.stroke();
        }
        ctx.fillStyle = ri === 7 ? '#ffffff' : '#cbd5e1';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(row.name, padL - 8, y + rowH * 0.48);

        var trackW = Math.max(40, w - padL - padR);
        ctx.fillStyle = 'rgba(148,163,184,0.12)';
        ctx.fillRect(padL, y + 4, trackW, Math.max(8, rowH - 10));

        var fillW = clamp(row.val / row.max, 0, 1) * trackW;
        ctx.fillStyle = row.col;
        ctx.fillRect(padL, y + 4, fillW, Math.max(8, rowH - 10));

        ctx.fillStyle = row.col;
        ctx.textAlign = 'left';
        ctx.fillText(row.txt, padL + trackW + 8, y + rowH * 0.48);
      }
      return;
    }

    if (drawType === 'realTimeOverlap') {
      var d1 = Math.max(0.02, fA.duration);
      var d2 = Math.max(0.02, fB.duration);
      var maxD = Math.max(d1, d2);
      var padL = 44;
      var padR = 16;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      var midY = padT + plotH * 0.5;

      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '0.00s' },
          { pos: 0.25, label: fmt(maxD * 0.25, 2) + 's' },
          { pos: 0.5, label: fmt(maxD * 0.5, 2) + 's' },
          { pos: 0.75, label: fmt(maxD * 0.75, 2) + 's' },
          { pos: 1, label: fmt(maxD, 2) + 's' }
        ],
        [
          { pos: 0.75, label: 'A+' },
          { pos: 0.5, label: '0' },
          { pos: 0.25, label: 'B−' }
        ]
      );

      // Hatched temporal delta zone
      var minD = Math.min(d1, d2);
      var xMin = padL + (minD / maxD) * plotW;
      var xMax = padL + plotW;
      if (xMax - xMin > 2) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
        ctx.fillRect(xMin, padT, xMax - xMin, plotH);
        ctx.fillStyle = '#facc15';
        ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText('Δt = ' + Math.abs(Math.round((d2 - d1) * 1000)) + ' ms', xMax - 5, padT + 12);
      }

      // Draw Sound A top half
      var envA = fA.envelope;
      ctx.beginPath();
      ctx.moveTo(padL, midY);
      for (var ia = 0; ia < envA.length; ia++) {
        var xa = padL + ((ia / (envA.length - 1)) * (d1 / maxD)) * plotW;
        var ya = midY - envA[ia] * (plotH * 0.44);
        ctx.lineTo(xa, ya);
      }
      ctx.lineTo(padL + (d1 / maxD) * plotW, midY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Draw Sound B bottom half (mirrored downward for crystal clarity)
      var envB = fB.envelope;
      ctx.beginPath();
      ctx.moveTo(padL, midY);
      for (var ib = 0; ib < envB.length; ib++) {
        var xb = padL + ((ib / (envB.length - 1)) * (d2 / maxD)) * plotW;
        var yb = midY + envB[ib] * (plotH * 0.44);
        ctx.lineTo(xb, yb);
      }
      ctx.lineTo(padL + (d2 / maxD) * plotW, midY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Attack Peak markers
      var ax = padL + (safeNum(fA.attackSec, 0) / maxD) * plotW;
      var bx = padL + (safeNum(fB.attackSec, 0) / maxD) * plotW;
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(ax - 1, padT, 2, plotH * 0.5);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(bx - 1, midY, 2, plotH * 0.5);
      return;
    }

    if (drawType === 'cumulativeBurn') {
      var padL = 44;
      var padR = 16;
      var padT = 16;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '0%' },
          { pos: 0.25, label: '25%' },
          { pos: 0.5, label: '50%' },
          { pos: 0.75, label: '75%' },
          { pos: 1, label: '100% Clip' }
        ],
        [
          { pos: 0, label: '0%' },
          { pos: 0.5, label: '50%' },
          { pos: 0.9, label: '90%' },
          { pos: 1, label: '100%' }
        ]
      );

      function buildCumCurve(env) {
        var sum = 0;
        for (var i = 0; i < env.length; i++) sum += env[i] * env[i];
        var acc = 0;
        var pts = [];
        for (var j = 0; j < env.length; j++) {
          acc += env[j] * env[j];
          var frac = sum > 1e-9 ? acc / sum : j / Math.max(1, env.length - 1);
          pts.push([padL + (j / (env.length - 1)) * plotW, padT + (1 - frac) * plotH]);
        }
        return pts;
      }

      drawPolyline(ctx, buildCumCurve(fA.envelope), '#60a5fa', 2.4, false);
      drawPolyline(ctx, buildCumCurve(fB.envelope), '#fb7185', 2.4, false);

      // T50 pins
      var y50 = padT + 0.5 * plotH;
      var t50A = padL + safeNum(fA.t50Ratio, 0.5) * plotW;
      var t50B = padL + safeNum(fB.t50Ratio, 0.5) * plotW;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.arc(t50A, y50, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath(); ctx.arc(t50B, y50, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('T50 A', clamp(t50A + 6, padL, w - 46), y50 - 10);
      ctx.fillStyle = '#fb7185';
      ctx.fillText('T50 B', clamp(t50B + 6, padL, w - 46), y50 + 12);
      return;
    }

    if (drawType === 'pitchTrajectory') {
      var padL = 52;
      var padR = 16;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      var minHz = 40;
      var maxHz = 1200;
      var logMin = Math.log2(minHz);
      var logMax = Math.log2(maxHz);
      function hzToY(hz) {
        var norm = (Math.log2(clamp(hz, minHz, maxHz)) - logMin) / (logMax - logMin);
        return padT + (1 - norm) * plotH;
      }

      var freqGuides = [65, 130.8, 261.6, 523.3, 1046.5];
      var guideLabels = ['65Hz', 'C3', 'C4', 'C5', '1kHz'];
      var yTicks = [];
      for (var gi = 0; gi < freqGuides.length; gi++) {
        yTicks.push({
          pos: (Math.log2(freqGuides[gi]) - logMin) / (logMax - logMin),
          label: guideLabels[gi]
        });
      }
      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: 'Start' },
          { pos: 0.33, label: '1/3' },
          { pos: 0.67, label: '2/3' },
          { pos: 1, label: 'End' }
        ],
        yTicks
      );

      // Dashed Spectral Centroid Contours
      function centroidPts(cc) {
        var arr = [];
        for (var i = 0; i < cc.length; i++) {
          var hz = Math.pow(2, cc[i]);
          arr.push([padL + (i / (cc.length - 1)) * plotW, hzToY(hz)]);
        }
        return arr;
      }
      drawPolyline(ctx, centroidPts(fA.centroidContour || []), 'rgba(34, 211, 238, 0.55)', 1.5, true);
      drawPolyline(ctx, centroidPts(fB.centroidContour || []), 'rgba(244, 114, 182, 0.55)', 1.5, true);

      // Voiced F0 Contours (segments break cleanly on unvoiced 0-frames)
      function drawF0Track(hzArr, col) {
        if (!hzArr) return;
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 2.4;
        var inSeg = false;
        ctx.beginPath();
        for (var i = 0; i < hzArr.length; i++) {
          var hz = hzArr[i];
          if (hz > 20) {
            var x = padL + (i / (hzArr.length - 1)) * plotW;
            var y = hzToY(hz);
            if (!inSeg) { ctx.moveTo(x, y); inSeg = true; }
            else ctx.lineTo(x, y);
          } else {
            inSeg = false;
          }
        }
        ctx.stroke();

        for (var j = 0; j < hzArr.length; j++) {
          if (hzArr[j] > 20) {
            ctx.beginPath();
            ctx.arc(padL + (j / (hzArr.length - 1)) * plotW, hzToY(hzArr[j]), 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      drawF0Track(fA.pitchHzArr, '#60a5fa');
      drawF0Track(fB.pitchHzArr, '#fb7185');

      if (bd.pitch && safeNum(bd.pitch.polarityMul, 1) < 1) {
        ctx.fillStyle = 'rgba(244, 114, 182, 0.22)';
        ctx.fillRect(padL + 6, padT + 6, 210, 20);
        ctx.fillStyle = '#facc15';
        ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('⚠️ OPPOSITE SWEEP COLLISION (×0.28)', padL + 12, padT + 19);
      }
      return;
    }

    if (drawType === 'pitchHistAndInterval') {
      var splitX = Math.floor(w * 0.56);
      var padL = 36;
      var padT = 18;
      var padB = 26;
      var plotW = splitX - padL - 12;
      var plotH = h - padT - padB;
      var bins = 12;
      var histMin = Math.log2(45);
      var histMax = Math.log2(650);

      function buildHist(hzArr) {
        var counts = new Array(bins).fill(0);
        var total = 0;
        if (hzArr) {
          for (var i = 0; i < hzArr.length; i++) {
            if (hzArr[i] >= 45 && hzArr[i] <= 650) {
              var b = Math.min(bins - 1, Math.max(0, Math.floor(((Math.log2(hzArr[i]) - histMin) / (histMax - histMin)) * bins)));
              counts[b]++;
              total++;
            }
          }
        }
        if (total > 0) for (var j = 0; j < bins; j++) counts[j] /= total;
        return counts;
      }

      var hA = buildHist(fA.pitchHzArr);
      var hB = buildHist(fB.pitchHzArr);
      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '45Hz' },
          { pos: 0.5, label: '170Hz' },
          { pos: 1, label: '650Hz' }
        ],
        [
          { pos: 0, label: '0%' },
          { pos: 1, label: 'Share' }
        ]
      );

      var groupW = plotW / bins;
      var barW = Math.max(2, groupW * 0.36);
      for (var bi = 0; bi < bins; bi++) {
        var gx = padL + bi * groupW;
        var bhA = hA[bi] * plotH * 0.92;
        var bhB = hB[bi] * plotH * 0.92;
        ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
        ctx.fillRect(gx + 2, padT + plotH - bhA, barW, bhA);
        ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
        ctx.fillRect(gx + 2 + barW + 1, padT + plotH - bhB, barW, bhB);
      }

      // Right pane: Semitone Interval Ruler (-12 to +12 st)
      var rx0 = splitX + 12;
      var rw = w - rx0 - 16;
      var rMidX = rx0 + rw * 0.5;
      var rMidY = h * 0.52;
      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx0, rMidY);
      ctx.lineTo(rx0 + rw, rMidY);
      ctx.stroke();

      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      for (var st = -12; st <= 12; st += 6) {
        var tx = rMidX + (st / 12) * (rw * 0.45);
        ctx.beginPath();
        ctx.moveTo(tx, rMidY - 5);
        ctx.lineTo(tx, rMidY + 5);
        ctx.stroke();
        ctx.fillText((st > 0 ? '+' : '') + st + 'st', tx, rMidY + 14);
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('Semitone Interval (B vs A)', rMidX, 24);

      if (fA.voicedRatio >= 0.25 && fB.voicedRatio >= 0.25 && fA.medianPitchHz > 0 && fB.medianPitchHz > 0) {
        var signedSt = clamp(12 * Math.log2(fB.medianPitchHz / fA.medianPitchHz), -12, 12);
        var pxB = rMidX + (signedSt / 12) * (rw * 0.45);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.28)';
        ctx.fillRect(Math.min(rMidX, pxB), rMidY - 8, Math.abs(pxB - rMidX), 16);
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath(); ctx.arc(rMidX, rMidY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fb7185';
        ctx.beginPath(); ctx.arc(pxB, rMidY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#34d399';
        ctx.fillText((signedSt >= 0 ? '+' : '') + fmt(12 * Math.log2(fB.medianPitchHz / fA.medianPitchHz), 2) + ' semitones', rMidX, rMidY - 22);
      } else {
        ctx.fillStyle = '#facc15';
        ctx.fillText('Unvoiced Spectral Mode', rMidX, rMidY - 20);
      }
      return;
    }

    if (drawType === 'modSpectrum') {
      var padL = 42;
      var padR = 16;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;

      // Shaded modulation regime bands (4..45 Hz)
      function hzToModX(hz) {
        return padL + clamp((hz - 4) / (45 - 4), 0, 1) * plotW;
      }
      ctx.fillStyle = 'rgba(34, 211, 238, 0.06)';
      ctx.fillRect(hzToModX(4), padT, hzToModX(8) - hzToModX(4), plotH);
      ctx.fillStyle = 'rgba(163, 230, 53, 0.06)';
      ctx.fillRect(hzToModX(8), padT, hzToModX(20) - hzToModX(8), plotH);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.06)';
      ctx.fillRect(hzToModX(20), padT, hzToModX(45) - hzToModX(20), plotH);

      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '4Hz' },
          { pos: (8 - 4) / 41, label: '8Hz' },
          { pos: (20 - 4) / 41, label: '20Hz' },
          { pos: (32 - 4) / 41, label: '32Hz' },
          { pos: 1, label: '45Hz' }
        ],
        [
          { pos: 0, label: '0.0' },
          { pos: 0.5, label: '0.5' },
          { pos: 1, label: 'Peak' }
        ]
      );

      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = 'rgba(148,163,184,0.85)';
      ctx.textAlign = 'center';
      ctx.fillText('Low Cadence', (hzToModX(4) + hzToModX(8)) * 0.5, padT + 11);
      ctx.fillText('Mid Oscillation', (hzToModX(8) + hzToModX(20)) * 0.5, padT + 11);
      ctx.fillText('Rapid Osc.', (hzToModX(20) + hzToModX(45)) * 0.5, padT + 11);

      function modPts(spec) {
        var pts = [];
        for (var i = 0; i < spec.length; i++) {
          pts.push([padL + (i / (spec.length - 1)) * plotW, padT + (1 - clamp(spec[i], 0, 1)) * plotH]);
        }
        return pts;
      }
      drawPolyline(ctx, modPts(fA.modSpectrum || []), '#60a5fa', 2.2, false);
      drawPolyline(ctx, modPts(fB.modSpectrum || []), '#fb7185', 2.2, false);
      return;
    }

    if (drawType === 'burstAndModBands') {
      // Top 36%: 3-Band grouped bars; Bottom 64%: Schmitt-Trigger smoothed envelopes
      var splitY = Math.floor(h * 0.38);
      var padL = 42;
      var padR = 16;
      var plotW = w - padL - padR;
      var bandsA = fA.modBands || [0.34, 0.33, 0.33];
      var bandsB = fB.modBands || [0.34, 0.33, 0.33];
      var bNames = ['2–8 Hz Low', '8–20 Hz Mid', '20–45 Hz Rapid'];

      var topH = splitY - 22;
      var gW = plotW / 3;
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (var bi = 0; bi < 3; bi++) {
        var bx = padL + bi * gW;
        var bW = Math.min(24, gW * 0.28);
        var h1 = clamp(bandsA[bi], 0, 1) * topH;
        var h2 = clamp(bandsB[bi], 0, 1) * topH;
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(bx + gW * 0.22, splitY - 12 - h1, bW, h1);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(bx + gW * 0.22 + bW + 4, splitY - 12 - h2, bW, h2);
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(bNames[bi], bx + gW * 0.5, splitY - 2);
      }

      // Bottom pane: smoothed envelopes + 0.35 & 0.18 dashed lines
      var botTop = splitY + 14;
      var botH = h - botTop - 22;
      drawAxesBox(
        ctx,
        padL,
        botTop,
        plotW,
        botH,
        [
          { pos: 0, label: 'Start' },
          { pos: 0.5, label: 'Mid' },
          { pos: 1, label: 'End' }
        ],
        [
          { pos: 0.18, label: '0.18' },
          { pos: 0.35, label: '0.35' },
          { pos: 1, label: '1.0' }
        ]
      );

      var yArm = botTop + (1 - 0.18) * botH;
      var yTrig = botTop + (1 - 0.35) * botH;
      drawPolyline(ctx, [[padL, yTrig], [padL + plotW, yTrig]], '#facc15', 1.2, true);
      drawPolyline(ctx, [[padL, yArm], [padL + plotW, yArm]], '#94a3b8', 1.0, true);

      function smoothEnvPts(env) {
        var pts = [];
        for (var i = 0; i < env.length; i++) {
          var sm = 0.25 * env[Math.max(0, i - 1)] + 0.5 * env[i] + 0.25 * env[Math.min(env.length - 1, i + 1)];
          pts.push([padL + (i / (env.length - 1)) * plotW, botTop + (1 - clamp(sm, 0, 1)) * botH]);
        }
        return pts;
      }
      drawPolyline(ctx, smoothEnvPts(fA.envelope), '#60a5fa', 2.0, false);
      drawPolyline(ctx, smoothEnvPts(fB.envelope), '#fb7185', 2.0, false);
      return;
    }

    if (drawType === 'avgSpectrumEQ') {
      var padL = 42;
      var padR = 16;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      var fc = (fA.spectrogram && fA.spectrogram.freqCenters) || [];
      var minF = fc[0] || 45;
      var maxF = fc[fc.length - 1] || 4200;
      var lMin = Math.log2(minF);
      var lMax = Math.log2(maxF);
      function fToX(hz) {
        return padL + clamp((Math.log2(Math.max(minF, hz)) - lMin) / (lMax - lMin), 0, 1) * plotW;
      }

      ctx.fillStyle = 'rgba(34,211,238,0.05)';
      ctx.fillRect(fToX(minF), padT, fToX(150) - fToX(minF), plotH);
      ctx.fillStyle = 'rgba(163,230,53,0.05)';
      ctx.fillRect(fToX(150), padT, fToX(450) - fToX(150), plotH);
      ctx.fillStyle = 'rgba(250,204,21,0.05)';
      ctx.fillRect(fToX(450), padT, fToX(1200) - fToX(450), plotH);
      ctx.fillStyle = 'rgba(244,114,182,0.05)';
      ctx.fillRect(fToX(1200), padT, fToX(maxF) - fToX(1200), plotH);

      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '45Hz' },
          { pos: (Math.log2(150) - lMin) / (lMax - lMin), label: '150' },
          { pos: (Math.log2(450) - lMin) / (lMax - lMin), label: '450' },
          { pos: (Math.log2(1200) - lMin) / (lMax - lMin), label: '1.2k' },
          { pos: 1, label: '4.2kHz' }
        ],
        [
          { pos: 0, label: '0.0' },
          { pos: 0.5, label: '0.5' },
          { pos: 1, label: '1.0' }
        ]
      );

      function eqPts(avg) {
        var pts = [];
        for (var i = 0; i < avg.length; i++) {
          var x = fc[i] ? fToX(fc[i]) : padL + (i / Math.max(1, avg.length - 1)) * plotW;
          pts.push([x, padT + (1 - clamp(avg[i], 0, 1)) * plotH]);
        }
        return pts;
      }
      drawPolyline(ctx, eqPts(fA.avgSpectrum || []), '#60a5fa', 2.3, false);
      drawPolyline(ctx, eqPts(fB.avgSpectrum || []), '#fb7185', 2.3, false);

      // Centroid Needles
      var cAx = fToX(fA.spectralCentroidHz || 200);
      var cBx = fToX(fB.spectralCentroidHz || 200);
      drawPolyline(ctx, [[cAx, padT], [cAx, padT + plotH]], '#60a5fa', 1.3, true);
      drawPolyline(ctx, [[cBx, padT], [cBx, padT + plotH]], '#fb7185', 1.3, true);
      return;
    }

    if (drawType === 'mfccFingerprint') {
      // Top 60%: MFCC C1..C12 zero-centered bars; Bottom 40%: 4-band perceptual share
      var splitY = Math.floor(h * 0.60);
      var padL = 38;
      var padR = 14;
      var padT = 16;
      var plotW = w - padL - padR;
      var mfccH = splitY - padT - 18;
      var zeroY = padT + mfccH * 0.5;
      var mA = fA.mfccMean || new Float32Array(12);
      var mB = fB.mfccMean || new Float32Array(12);
      var maxAbs = 0.5;
      for (var mi = 0; mi < 12; mi++) {
        maxAbs = Math.max(maxAbs, Math.abs(mA[mi] || 0), Math.abs(mB[mi] || 0));
      }

      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.beginPath();
      ctx.moveTo(padL, zeroY);
      ctx.lineTo(padL + plotW, zeroY);
      ctx.stroke();

      var colW = plotW / 12;
      var bw = Math.max(3, colW * 0.34);
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (var k = 0; k < 12; k++) {
        var kx = padL + k * colW;
        var hA = ((mA[k] || 0) / maxAbs) * (mfccH * 0.45);
        var hB = ((mB[k] || 0) / maxAbs) * (mfccH * 0.45);
        ctx.fillStyle = '#60a5fa';
        if (hA >= 0) ctx.fillRect(kx + 2, zeroY - hA, bw, hA);
        else ctx.fillRect(kx + 2, zeroY, bw, -hA);
        ctx.fillStyle = '#fb7185';
        if (hB >= 0) ctx.fillRect(kx + 2 + bw + 1, zeroY - hB, bw, hB);
        else ctx.fillRect(kx + 2 + bw + 1, zeroY, bw, -hB);

        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('C' + (k + 1), kx + colW * 0.5, splitY - 5);
      }

      // Bottom 4-Band EQ Shares
      var bTop = splitY + 12;
      var bH = h - bTop - 20;
      var bA = fA.bandProfile || [0.25, 0.25, 0.25, 0.25];
      var bB = fB.bandProfile || [0.25, 0.25, 0.25, 0.25];
      var labels4 = ['Sub-Bass', 'Mid-Low', 'Upper-Mid', 'Air Dispersion'];
      var g4W = plotW / 4;
      var b4W = Math.min(20, g4W * 0.28);
      for (var b4 = 0; b4 < 4; b4++) {
        var x4 = padL + b4 * g4W;
        var bh1 = clamp(bA[b4], 0, 1) * bH;
        var bh2 = clamp(bB[b4], 0, 1) * bH;
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(x4 + g4W * 0.24, bTop + bH - bh1, b4W, bh1);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(x4 + g4W * 0.24 + b4W + 3, bTop + bH - bh2, b4W, bh2);
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(labels4[b4], x4 + g4W * 0.5, h - 6);
      }
      return;
    }

    if (drawType === 'specDiffHeatmap') {
      var specA = fA.spectrogram;
      var specB = fB.spectrogram;
      var padL = 46;
      var padR = 16;
      var padT = 14;
      var padB = 24;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      var frames = Math.min(specA.frames, specB.frames);
      var bands = Math.min(specA.freqBands, specB.freqBands);
      var cellW = plotW / Math.max(1, frames);
      var cellH = plotH / Math.max(1, bands);

      for (var t = 0; t < frames; t++) {
        for (var b = 0; b < bands; b++) {
          var vA = specA.grid[t * specA.freqBands + b];
          var vB = specB.grid[t * specB.freqBands + b];
          var diff = vA - vB; // + = Cyan (A louder), - = Magenta (B louder)
          var mag = clamp(Math.abs(diff) * 1.9, 0, 1);
          if (diff >= 0) {
            ctx.fillStyle = 'rgb(' + Math.round(10 + 24 * mag) + ',' + Math.round(14 + 197 * mag) + ',' + Math.round(24 + 214 * mag) + ')';
          } else {
            ctx.fillStyle = 'rgb(' + Math.round(10 + 234 * mag) + ',' + Math.round(14 + 100 * mag) + ',' + Math.round(24 + 158 * mag) + ')';
          }
          var y = padT + (bands - 1 - b) * cellH;
          ctx.fillRect(padL + t * cellW, y, Math.ceil(cellW), Math.ceil(cellH));
        }
      }

      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: 'Start (0%)' },
          { pos: 0.5, label: 'Midpoint (50%)' },
          { pos: 1, label: 'End (100%)' }
        ],
        [
          { pos: 0, label: '45Hz' },
          { pos: 0.5, label: '450Hz' },
          { pos: 1, label: '4.2k' }
        ]
      );
      return;
    }

    if (drawType === 'alignedEnvelope') {
      var envLag = (bd.envelope && bd.envelope.lagProfile) || TootApp.DSP.computeEnvelopeLagProfile(fA.envelope, fB.envelope);
      var bestLag = envLag.bestLag || 0;
      var envA = fA.envelope;
      var envB = fB.envelope;
      var len = Math.min(envA.length, envB.length);
      var padL = 42;
      var padR = 16;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;

      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '0%' },
          { pos: 0.5, label: '50%' },
          { pos: 1, label: '100%' }
        ],
        [
          { pos: 0, label: '0.0' },
          { pos: 0.5, label: '0.5' },
          { pos: 1, label: 'Peak' }
        ]
      );

      var ptsA = [];
      var ptsBRaw = [];
      var ptsBAligned = [];
      for (var i = 0; i < len; i++) {
        var x = padL + (i / Math.max(1, len - 1)) * plotW;
        var vA = envA[i];
        var vBRaw = envB[i];
        var j = i + bestLag;
        var vBAl = j >= 0 && j < len ? envB[j] : 0;
        var yA = padT + (1 - vA) * plotH;
        var yAl = padT + (1 - vBAl) * plotH;
        ptsA.push([x, yA]);
        ptsBRaw.push([x, padT + (1 - vBRaw) * plotH]);
        ptsBAligned.push([x, yAl]);

        // L1 mismatch vertical tint
        var topY = Math.min(yA, yAl);
        var dY = Math.abs(yA - yAl);
        if (dY > 1) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
          ctx.fillRect(x, topY, Math.max(1, plotW / len), dY);
        }
      }

      drawPolyline(ctx, ptsBRaw, 'rgba(244, 114, 182, 0.35)', 1.3, true);
      drawPolyline(ctx, ptsA, '#60a5fa', 2.4, false);
      drawPolyline(ctx, ptsBAligned, '#fb7185', 2.4, false);
      return;
    }

    if (drawType === 'lagCurve') {
      var envLag = (bd.envelope && bd.envelope.lagProfile) || TootApp.DSP.computeEnvelopeLagProfile(fA.envelope, fB.envelope);
      var lags = envLag.lags || [];
      var scores = envLag.scores || [];
      var corrs = envLag.corrs || [];
      var bestLag = envLag.bestLag || 0;
      var padL = 42;
      var padR = 16;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;

      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '-6' },
          { pos: 0.25, label: '-3' },
          { pos: 0.5, label: '0 Lag' },
          { pos: 0.75, label: '+3' },
          { pos: 1, label: '+6 Bins' }
        ],
        [
          { pos: 0, label: '0%' },
          { pos: 0.5, label: '50%' },
          { pos: 1, label: '100%' }
        ]
      );

      var sPts = [];
      var cPts = [];
      var bestX = padL + plotW * 0.5;
      var bestY = padT + plotH * 0.5;
      for (var li = 0; li < lags.length; li++) {
        var x = padL + (li / Math.max(1, lags.length - 1)) * plotW;
        var yS = padT + (1 - clamp(scores[li], 0, 100) / 100) * plotH;
        var yC = padT + (1 - clamp(corrs[li], 0, 100) / 100) * plotH;
        sPts.push([x, yS]);
        cPts.push([x, yC]);
        if (lags[li] === bestLag) {
          bestX = x;
          bestY = yS;
        }
      }

      drawPolyline(ctx, cPts, 'rgba(34, 211, 238, 0.75)', 1.7, true);
      drawPolyline(ctx, sPts, '#fb7185', 2.4, false);

      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(bestX, bestY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = bestX > w * 0.65 ? 'right' : 'left';
      ctx.fillText('Best: ' + bestLag + ' (' + Math.round(envLag.bestScore) + '%)', bestX + (bestX > w * 0.65 ? -10 : 10), bestY - 6);
      return;
    }

    var bonus = computeBonusMetrics(fA, fB);

    if (drawType === 'wetnessGauge') {
      function drawDial(cx, cy, r, valPct, color, tag, subLabel) {
        ctx.strokeStyle = 'rgba(148,163,184,0.22)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Gradient Zones: Dry -> Risky -> Swamp
        ctx.strokeStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * 0.35);
        ctx.stroke();

        ctx.strokeStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI + Math.PI * 0.35, Math.PI + Math.PI * 0.70);
        ctx.stroke();

        ctx.strokeStyle = '#fb7185';
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI + Math.PI * 0.70, Math.PI * 2);
        ctx.stroke();

        var ang = Math.PI + clamp(valPct, 0, 100) / 100 * Math.PI;
        var nx = cx + Math.cos(ang) * (r - 10);
        var ny = cy + Math.sin(ang) * (r - 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '700 18px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(valPct + '%', cx, cy + 24);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(tag, cx, cy - r - 14);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(subLabel, cx, cy + 40);
      }

      var rDial = Math.max(42, Math.min(w * 0.19, h * 0.44));
      var dialY = h * 0.62;
      drawDial(w * 0.27, dialY, rDial, bonus.wetness.wetA, '#60a5fa', 'SOUND A', bonus.wetness.labelA);
      drawDial(w * 0.73, dialY, rDial, bonus.wetness.wetB, '#fb7185', 'SOUND B', bonus.wetness.labelB);
      return;
    }

    if (drawType === 'fluxTimeSeries') {
      var sA = bonus.wetness.fluxSeriesA || [];
      var sB = bonus.wetness.fluxSeriesB || [];
      var maxFlux = 0.08;
      for (var iA = 0; iA < sA.length; iA++) maxFlux = Math.max(maxFlux, sA[iA]);
      for (var iB = 0; iB < sB.length; iB++) maxFlux = Math.max(maxFlux, sB[iB]);
      var padL = 44;
      var padR = 16;
      var padT = 16;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: 'Start' },
          { pos: 0.5, label: 'Mid' },
          { pos: 1, label: 'End' }
        ],
        [
          { pos: 0, label: '0.0' },
          { pos: 0.5, label: fmt(maxFlux * 0.5, 2) },
          { pos: 1, label: fmt(maxFlux, 2) }
        ]
      );
      function seriesPts(arr) {
        var pts = [];
        for (var i = 0; i < arr.length; i++) {
          pts.push([padL + (i / Math.max(1, arr.length - 1)) * plotW, padT + (1 - clamp(arr[i] / maxFlux, 0, 1)) * plotH]);
        }
        return pts;
      }
      drawPolyline(ctx, seriesPts(sA), '#60a5fa', 2.2, false);
      drawPolyline(ctx, seriesPts(sB), '#fb7185', 2.2, false);
      return;
    }

    if (drawType === 'doppelgangerBars') {
      var items = bonus.acoustics.items;
      var affA = bonus.acoustics.affinitiesA;
      var affB = bonus.acoustics.affinitiesB;
      var padL = 96;
      var padR = 48;
      var padT = 12;
      var rowH = (h - padT - 10) / items.length;
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (var di = 0; di < items.length; di++) {
        var y = padT + di * rowH;
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(items[di].short, padL - 8, y + rowH * 0.5);

        var trackW = Math.max(40, w - padL - padR);
        var bH = Math.max(4, (rowH - 6) * 0.45);
        ctx.fillStyle = 'rgba(148,163,184,0.10)';
        ctx.fillRect(padL, y + 2, trackW, rowH - 4);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(padL, y + 2, (clamp(affA[di], 0, 100) / 100) * trackW, bH);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(padL, y + 3 + bH, (clamp(affB[di], 0, 100) / 100) * trackW, bH);

        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'left';
        ctx.fillText(affA[di] + '/' + affB[di], padL + trackW + 6, y + rowH * 0.5);
      }
      return;
    }

    if (drawType === 'harmonicSpace') {
      var padL = 44;
      var padR = 18;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      var lMin = Math.log2(50);
      var lMax = Math.log2(1600);
      function spaceX(hz) {
        return padL + clamp((Math.log2(clamp(hz, 50, 1600)) - lMin) / (lMax - lMin), 0, 1) * plotW;
      }
      function spaceY(flat) {
        return padT + (1 - clamp(flat, 0, 0.9)) * plotH;
      }

      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0, label: '50Hz' },
          { pos: (Math.log2(150) - lMin) / (lMax - lMin), label: '150' },
          { pos: (Math.log2(400) - lMin) / (lMax - lMin), label: '400' },
          { pos: 1, label: '1.6kHz' }
        ],
        [
          { pos: 0, label: 'Harmonic' },
          { pos: 0.5, label: 'Mixed' },
          { pos: 1, label: 'Broadband' }
        ]
      );

      var twList = bonus.acoustics.items;
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (var ti = 0; ti < twList.length; ti++) {
        var tx = spaceX(twList[ti].freq);
        var ty = spaceY(twList[ti].flat);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
        ctx.beginPath();
        ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = tx > w * 0.76 ? 'right' : 'left';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(twList[ti].short, tx + (tx > w * 0.76 ? -6 : 6), ty - 3);
      }

      var axS = spaceX(bonus.acoustics.detailA.effFreq);
      var ayS = spaceY(bonus.acoustics.detailA.flat);
      var bxS = spaceX(bonus.acoustics.detailB.effFreq);
      var byS = spaceY(bonus.acoustics.detailB.flat);
      drawPolyline(ctx, [[axS, ayS], [bxS, byS]], 'rgba(163,230,53,0.7)', 1.5, true);
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.arc(axS, ayS, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath(); ctx.arc(bxS, byS, 6.5, 0, Math.PI * 2); ctx.fill();
      return;
    }

    if (drawType === 'alibiMatrix') {
      var cats = [
        { label: 'Canine', a: bonus.social.a.dogBlame, b: bonus.social.b.dogBlame },
        { label: 'Upholstery', a: bonus.social.a.leatherChair, b: bonus.social.b.leatherChair },
        { label: 'Footwear', a: bonus.social.a.shoeScuff, b: bonus.social.b.shoeScuff },
        { label: 'Noticeability', a: bonus.social.a.panicPct, b: bonus.social.b.panicPct }
      ];
      var padL = 42;
      var padR = 16;
      var padT = 18;
      var padB = 26;
      var plotW = w - padL - padR;
      var plotH = h - padT - padB;
      drawAxesBox(
        ctx,
        padL,
        padT,
        plotW,
        plotH,
        [
          { pos: 0.125, label: cats[0].label },
          { pos: 0.375, label: cats[1].label },
          { pos: 0.625, label: cats[2].label },
          { pos: 0.875, label: cats[3].label }
        ],
        [
          { pos: 0, label: '0%' },
          { pos: 0.5, label: '50%' },
          { pos: 1, label: '100%' }
        ]
      );
      var gw = plotW / cats.length;
      var bw = Math.min(26, gw * 0.30);
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      for (var ci = 0; ci < cats.length; ci++) {
        var gx = padL + ci * gw + (gw - (bw * 2 + 6)) * 0.5;
        var h1 = (cats[ci].a / 100) * plotH;
        var h2 = (cats[ci].b / 100) * plotH;
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(gx, padT + plotH - h1, bw, h1);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(gx + bw + 6, padT + plotH - h2, bw, h2);
      }
      return;
    }

    if (drawType === 'shockwaveRings') {
      var cx = w * 0.5;
      var cy = h * 0.52;
      var maxR = Math.max(36, Math.min(w, h) * 0.40);
      var maxMeters = 14;
      var rings = [2, 5, 10, 14];
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (var ri = 0; ri < rings.length; ri++) {
        var rr = (rings[ri] / maxMeters) * maxR;
        ctx.strokeStyle = 'rgba(148,163,184,0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'left';
        ctx.fillText(rings[ri] + 'm', cx + rr + 3, cy + 3);
      }

      var rA = clamp(bonus.social.a.radiusM / maxMeters, 0.08, 1) * maxR;
      var rB = clamp(bonus.social.b.radiusM / maxMeters, 0.08, 1) * maxR;

      ctx.fillStyle = 'rgba(34, 211, 238, 0.14)';
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, rA, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(244, 114, 182, 0.14)';
      ctx.strokeStyle = '#fb7185';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, cy, rB, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('A Radius: ' + fmt(bonus.social.a.radiusM, 1) + 'm', w * 0.22, 18);
      ctx.fillStyle = '#fb7185';
      ctx.fillText('B Radius: ' + fmt(bonus.social.b.radiusM, 1) + 'm', w * 0.78, 18);
    }
  }

  function redrawDrawer(drawerEl) {
    if (!drawerEl || !drawerEl._forensicsCtx) return;
    var ctxData = drawerEl._forensicsCtx;
    var canvases = drawerEl.querySelectorAll('.forensics-canvas');
    for (var i = 0; i < canvases.length; i++) {
      var c = canvases[i];
      var drawType = c.getAttribute('data-draw-type');
      drawChart(c, drawType, ctxData.soundA, ctxData.soundB, ctxData.result);
    }
  }

  function renderForensicsDrawer(drawerEl, key, soundA, soundB, result, onSelectTab, onClose, opts) {
    if (!drawerEl || !soundA || !soundB) return;
    var report = buildCriterionReport(key, soundA, soundB, result);
    var col = scoreColor(report.score);
    var isInline = opts && opts.inlineAccordion;

    var tabsHtml = isInline
      ? ''
      : CRITERIA_META.map(function (tab) {
          return (
            '<button type="button" class="forensics-tab-btn' +
            (tab.key === report.key ? ' active' : '') +
            '" data-ftab="' +
            esc(tab.key) +
            '">' +
            esc(tab.label) +
            '</button>'
          );
        }).join('');

    var chartsHtml = report.charts
      .map(function (ch) {
        return (
          '<div class="forensics-chart-card' +
          (ch.fullSpan ? ' full-span' : '') +
          '">' +
          '  <div class="forensics-chart-head">' +
          '    <div>' +
          '      <div class="forensics-chart-title">' +
          esc(ch.title) +
          '</div>' +
          '      <div class="forensics-chart-sub">' +
          esc(ch.subtitle) +
          '</div>' +
          '    </div>' +
          '    <div class="forensics-legend">' +
          '      <span><i class="legend-dot cyan"></i> A</span>' +
          '      <span><i class="legend-dot magenta"></i> B</span>' +
          '    </div>' +
          '  </div>' +
          '  <canvas class="forensics-canvas" data-draw-type="' +
          esc(ch.drawType) +
          '"></canvas>' +
          '</div>'
        );
      })
      .join('');

    var statsHtml = report.stats
      .map(function (st) {
        return (
          '<div class="forensics-stat-card">' +
          '  <div class="forensics-stat-label">' +
          esc(st.label) +
          '</div>' +
          '  <div class="forensics-stat-val">' +
          esc(st.value) +
          '</div>' +
          '  <div class="forensics-stat-sub">' +
          esc(st.sub) +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    var topTabsHtml = isInline
      ? ''
      : '<div class="forensics-top-bar">' +
        '  <div class="forensics-tabs">' +
        tabsHtml +
        '</div>' +
        '  <button type="button" class="btn btn-ghost btn-sm btn-close-forensics" title="Close">✕ Close</button>' +
        '</div>';

    var closeInHeader = isInline
      ? '<button type="button" class="btn btn-ghost btn-sm btn-close-forensics" title="Close">✕ Close</button>'
      : '';

    drawerEl.innerHTML =
      '<div class="forensics-drawer">' +
      topTabsHtml +
      '<div class="forensics-header-banner">' +
      '  <div>' +
      '    <div class="forensics-case-row">' +
      '      <span class="forensics-case-badge">' +
      esc(report.badgeCode) +
      '</span>' +
      '      <span class="forensics-weight-tag">' +
      esc(report.weightLabel) +
      '</span>' +
      '    </div>' +
      '    <h4 class="forensics-title">' +
      esc(report.title) +
      '</h4>' +
      '    <p class="forensics-subtitle">' +
      esc(report.subtitle) +
      '</p>' +
      '  </div>' +
      '  <div class="forensics-header-actions">' +
      '    <div class="forensics-score-pill" style="color:' +
      col +
      ';border-color:' +
      col +
      '">' +
      report.score +
      '%</div>' +
      closeInHeader +
      '  </div>' +
      '</div>' +
      '<div class="forensics-commentary">' +
      esc(report.commentary) +
      '</div>' +
      '<div class="forensics-charts-grid">' +
      chartsHtml +
      '</div>' +
      '<div class="forensics-stats-grid">' +
      statsHtml +
      '</div>' +
      '<div class="forensics-formula-bar">' +
      '  <span class="formula-tag">EQUATION</span>' +
      '  <code>' +
      esc(report.formula) +
      '</code>' +
      '</div>' +
      '</div>';

    drawerEl._forensicsCtx = {
      key: report.key,
      soundA: soundA,
      soundB: soundB,
      result: result
    };

    var tabBtns = drawerEl.querySelectorAll('.forensics-tab-btn');
    for (var ti = 0; ti < tabBtns.length; ti++) {
      tabBtns[ti].addEventListener('click', function () {
        if (typeof onSelectTab === 'function') {
          onSelectTab(this.getAttribute('data-ftab'));
        }
      });
    }

    var closeBtn = drawerEl.querySelector('.btn-close-forensics');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (typeof onClose === 'function') onClose();
      });
    }

    redrawDrawer(drawerEl);
  }

  TootApp.Forensics = {
    CRITERIA_META: CRITERIA_META,
    hzToNoteName: hzToNoteName,
    computeBonusMetrics: computeBonusMetrics,
    buildCriterionReport: buildCriterionReport,
    renderForensicsDrawer: renderForensicsDrawer,
    redrawDrawer: redrawDrawer
  };
})(typeof window !== 'undefined' ? window : globalThis);
