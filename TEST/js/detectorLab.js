(function (root) {
  'use strict';

  var TootTestLab = (root.TootTestLab = root.TootTestLab || {});

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function safeNum(v, fb) {
    return typeof v === 'number' && Number.isFinite(v) ? v : (fb || 0);
  }

  var CRITERIA_DEFS = [
    // Stage 1: Live Trigger & Energy (Sentry v3)
    {
      id: 'rmsNoiseMul',
      group: 'stage1',
      groupLabel: 'Stage 1 · Trigger & Energy',
      label: 'RMS Trigger vs Noise Floor',
      shortLabel: 'RMS/Noise',
      unit: 'x',
      min: 1.2,
      max: 6.0,
      step: 0.1,
      mode: 'min',
      defaultThreshold: 2.8,
      defaultWeight: 1.2,
      defaultEnabled: true,
      description: 'Peak/active signal RMS divided by ambient noise floor RMS. Lower captures quieter / distant farts; higher rejects room rustle.',
      format: function (v) { return safeNum(v, 0).toFixed(2) + 'x'; }
    },
    {
      id: 'minActiveMs',
      group: 'stage1',
      groupLabel: 'Stage 1 · Trigger & Energy',
      label: 'Min Active Duration',
      shortLabel: 'Duration',
      unit: 'ms',
      min: 20,
      max: 500,
      step: 5,
      mode: 'min',
      defaultThreshold: 35,
      defaultWeight: 1.0,
      defaultEnabled: true,
      description: 'Minimum active burst duration after auto-clipping. Rejects sub-35ms desk knocks, mic bumps, and electrical clicks.',
      format: function (v) { return Math.round(safeNum(v, 0)) + ' ms'; }
    },
    {
      id: 'sub55Max',
      group: 'stage1',
      groupLabel: 'Stage 1 · Trigger & Energy',
      label: 'Sub-55 Hz Thump Reject Cap',
      shortLabel: 'Sub-55 Hz',
      unit: 'ratio',
      min: 0.30,
      max: 0.95,
      step: 0.02,
      mode: 'max',
      defaultThreshold: 0.66,
      defaultWeight: 1.1,
      defaultEnabled: true,
      description: 'Fraction of raw power below 55 Hz. Handling noise, footsteps, and table thuds exceed 0.66.',
      format: function (v) { return (safeNum(v, 0) * 100).toFixed(0) + '%'; }
    },
    {
      id: 'triggerConsecFrames',
      group: 'stage1',
      groupLabel: 'Stage 1 · Trigger & Energy',
      label: 'Consecutive Trigger Frames (25ms)',
      shortLabel: 'Consec Frames',
      unit: 'frames',
      min: 1,
      max: 8,
      step: 1,
      mode: 'min',
      defaultThreshold: 2,
      defaultWeight: 0.8,
      defaultEnabled: true,
      description: 'Number of contiguous 25 ms frames above trigger threshold (50 ms at default 2). Filters single-spike clicks.',
      format: function (v) { return Math.round(safeNum(v, 0)) + ' fr'; }
    },

    // Stage 2: Sentry v3 Spectral & Prototype Gates
    {
      id: 'protoAffMin',
      group: 'stage2',
      groupLabel: 'Stage 2 · Sentry v3 Spectral & Prototype',
      label: '47-Fart Prototype Affinity',
      shortLabel: 'Proto Aff',
      unit: 'score',
      min: 0.10,
      max: 0.85,
      step: 0.01,
      mode: 'min',
      defaultThreshold: 0.395,
      defaultWeight: 2.2,
      defaultEnabled: true,
      description: '18-D MFCC + Band + Turbulence similarity to the 47 VaultPreLoads cluster centroids (current Sentry v3 core gate = 0.395).',
      format: function (v) { return safeNum(v, 0).toFixed(3); }
    },
    {
      id: 'b1Min',
      group: 'stage2',
      groupLabel: 'Stage 2 · Sentry v3 Spectral & Prototype',
      label: 'Low-Chamber Share B1 (55–750 Hz)',
      shortLabel: 'B1 Core',
      unit: 'ratio',
      min: 0.05,
      max: 0.85,
      step: 0.02,
      mode: 'min',
      defaultThreshold: 0.25,
      defaultWeight: 1.5,
      defaultEnabled: true,
      description: 'Share of >55 Hz power in 55–750 Hz chamber core. Most real farts concentrate energy here.',
      format: function (v) { return (safeNum(v, 0) * 100).toFixed(0) + '%'; }
    },
    {
      id: 'b2Max',
      group: 'stage2',
      groupLabel: 'Stage 2 · Sentry v3 Spectral & Prototype',
      label: 'Speech Formant Cap B2 (750–2.6 kHz)',
      shortLabel: 'B2 Mid',
      unit: 'ratio',
      min: 0.20,
      max: 0.95,
      step: 0.02,
      mode: 'max',
      defaultThreshold: 0.62,
      defaultWeight: 1.3,
      defaultEnabled: true,
      description: 'Cap on 750–2600 Hz formant band share. Human speech vowels & bright mouth raspberries spike B2.',
      format: function (v) { return (safeNum(v, 0) * 100).toFixed(0) + '%'; }
    },
    {
      id: 'b3Max',
      group: 'stage2',
      groupLabel: 'Stage 2 · Sentry v3 Spectral & Prototype',
      label: 'High Air / Sibilance Cap B3 (>2.6 kHz)',
      shortLabel: 'B3 Air',
      unit: 'ratio',
      min: 0.10,
      max: 0.85,
      step: 0.02,
      mode: 'max',
      defaultThreshold: 0.52,
      defaultWeight: 1.2,
      defaultEnabled: true,
      description: 'Cap on >2600 Hz sibilant / hiss / cough air energy.',
      format: function (v) { return (safeNum(v, 0) * 100).toFixed(0) + '%'; }
    },
    {
      id: 'crestMax',
      group: 'stage2',
      groupLabel: 'Stage 2 · Sentry v3 Spectral & Prototype',
      label: 'Peak Crest Factor Ceiling',
      shortLabel: 'Crest',
      unit: 'dB',
      min: 6,
      max: 26,
      step: 0.5,
      mode: 'max',
      defaultThreshold: 21.0,
      defaultWeight: 1.0,
      defaultEnabled: true,
      description: 'Peak-to-RMS dB ratio ceiling. Sharp impulsive farts naturally reach ~16–20 dB; mic bumps/claps spike higher.',
      format: function (v) { return safeNum(v, 0).toFixed(1) + ' dB'; }
    },
    {
      id: 'zcrMax',
      group: 'stage2',
      groupLabel: 'Stage 2 · Sentry v3 Spectral & Prototype',
      label: 'Zero-Crossing Rate Ceiling',
      shortLabel: 'ZCR',
      unit: 'Hz',
      min: 400,
      max: 4500,
      step: 50,
      mode: 'max',
      defaultThreshold: 1950,
      defaultWeight: 1.0,
      defaultEnabled: true,
      description: 'Zero-crossing rate in Hz. Speech fricatives (s/sh/f) and bright hisses spike past ~1950 Hz.',
      format: function (v) { return Math.round(safeNum(v, 0)) + ' Hz'; }
    },
    {
      id: 'flatnessMin',
      group: 'stage2',
      groupLabel: 'Stage 2 · Sentry v3 Spectral & Prototype',
      label: 'Spectral Flatness Floor',
      shortLabel: 'Flatness',
      unit: 'ratio',
      min: 0.05,
      max: 0.85,
      step: 0.02,
      mode: 'min',
      defaultThreshold: 0.35,
      defaultWeight: 1.1,
      defaultEnabled: true,
      description: 'Minimum spectral turbulence / broadband spread. Pure tonal humming or vocal cords score lower than organic gas.',
      format: function (v) { return safeNum(v, 0).toFixed(2); }
    },

    // Stage 3: Anti-Mouth & Extra Acoustic Dynamics
    {
      id: 'rolloff85Max',
      group: 'stage3',
      groupLabel: 'Stage 3 · Anti-Mouth & Extra Dynamics',
      label: '85% Spectral Roll-Off (Damping)',
      shortLabel: 'RollOff 85',
      unit: 'Hz',
      min: 400,
      max: 4500,
      step: 50,
      mode: 'max',
      defaultThreshold: 2200,
      defaultWeight: 1.4,
      defaultEnabled: false,
      description: 'Frequency holding 85% of linear power. Clothed real farts roll off warm/low; open-mouth raspberries radiate high frequencies.',
      format: function (v) { return Math.round(safeNum(v, 0)) + ' Hz'; }
    },
    {
      id: 'lipTrillMax',
      group: 'stage3',
      groupLabel: 'Stage 3 · Anti-Mouth & Extra Dynamics',
      label: '22–42 Hz Bilabial Lip-Trill Cap',
      shortLabel: 'Lip Trill',
      unit: 'score',
      min: 0.10,
      max: 1.00,
      step: 0.02,
      mode: 'max',
      defaultThreshold: 0.58,
      defaultWeight: 1.5,
      defaultEnabled: false,
      description: 'Amplitude modulation concentration in 22–42 Hz characteristic of wet lip-buzzing mouth mimics.',
      format: function (v) { return safeNum(v, 0).toFixed(2); }
    },
    {
      id: 'preBreathMax',
      group: 'stage3',
      groupLabel: 'Stage 3 · Anti-Mouth & Extra Dynamics',
      label: 'Pre-Onset Breath /Boundary Air Cap',
      shortLabel: 'Pre-Breath',
      unit: 'score',
      min: 0.10,
      max: 1.00,
      step: 0.02,
      mode: 'max',
      defaultThreshold: 0.55,
      defaultWeight: 1.1,
      defaultEnabled: false,
      description: 'Pre-onset inhalation hiss (-450ms..-15ms) or high-freq edge breathiness typical of humans preparing a mouth mimic.',
      format: function (v) { return safeNum(v, 0).toFixed(2); }
    },
    {
      id: 'pitchJitterMin',
      group: 'stage3',
      groupLabel: 'Stage 3 · Anti-Mouth & Extra Dynamics',
      label: 'Frame-to-Frame Pitch Chaos Min',
      shortLabel: 'Pitch Jitter',
      unit: 'st',
      min: 0.0,
      max: 5.0,
      step: 0.05,
      mode: 'min',
      defaultThreshold: 0.45,
      defaultWeight: 1.2,
      defaultEnabled: false,
      description: 'Mean semitone step across voiced frames. Real gas turbulence jitters more organically than held vocal-cord tones.',
      format: function (v) { return safeNum(v, 0).toFixed(2) + ' st'; }
    },
    {
      id: 'formantRatioMax',
      group: 'stage3',
      groupLabel: 'Stage 3 · Anti-Mouth & Extra Dynamics',
      label: 'Vocal Tract F1/F2 Formant Cap',
      shortLabel: 'Formants',
      unit: 'ratio',
      min: 0.15,
      max: 1.00,
      step: 0.02,
      mode: 'max',
      defaultThreshold: 0.62,
      defaultWeight: 1.3,
      defaultEnabled: false,
      description: 'Vowel formant energy (350–850 Hz F1 & 950–2300 Hz F2) normalized against sub-330 Hz pressure core.',
      format: function (v) { return (safeNum(v, 0) * 100).toFixed(0) + '%'; }
    }
  ];

  var CRITERIA_BY_ID = {};
  for (var ci = 0; ci < CRITERIA_DEFS.length; ci++) {
    CRITERIA_BY_ID[CRITERIA_DEFS[ci].id] = CRITERIA_DEFS[ci];
  }

  var SENTRY_CRITERIA_IDS = [
    'rmsNoiseMul',
    'minActiveMs',
    'sub55Max',
    'triggerConsecFrames',
    'protoAffMin',
    'b1Min',
    'b2Max',
    'b3Max',
    'crestMax',
    'zcrMax',
    'flatnessMin'
  ];

  var AUTH_CRITERIA_IDS = [
    'protoAffMin',
    'rolloff85Max',
    'lipTrillMax',
    'preBreathMax',
    'pitchJitterMin',
    'formantRatioMax'
  ];

  function createDefaultAuthConfig() {
    return {
      threshold: 50,
      criteria: {
        protoAffMin: { threshold: 0.36, weight: 1.8, enabled: true },
        rolloff85Max: { threshold: 2200, weight: 1.5, enabled: true },
        lipTrillMax: { threshold: 0.55, weight: 1.6, enabled: true },
        preBreathMax: { threshold: 0.50, weight: 1.0, enabled: true },
        pitchJitterMin: { threshold: 0.45, weight: 1.0, enabled: true },
        formantRatioMax: { threshold: 0.58, weight: 1.4, enabled: true }
      }
    };
  }

  function createDefaultConfig(presetId) {
    var preset = presetId || 'sentry_v3';
    var criteria = {};
    for (var i = 0; i < CRITERIA_DEFS.length; i++) {
      var d = CRITERIA_DEFS[i];
      criteria[d.id] = {
        threshold: d.defaultThreshold,
        weight: d.group === 'stage3' && preset === 'sentry_v3' ? 0 : d.defaultWeight,
        enabled: d.defaultEnabled
      };
    }

    var masterThreshold = 54;
    var hardGateMode = true;
    var bridgeAuthToSentry = false;
    var authCfg = createDefaultAuthConfig();

    if (preset === 'balanced_hybrid') {
      masterThreshold = 55;
      hardGateMode = true;
      bridgeAuthToSentry = true;
      criteria.protoAffMin.threshold = 0.34;
      criteria.b1Min.threshold = 0.22;
      authCfg.criteria.rolloff85Max.threshold = 2400;
    } else if (preset === 'sensitive_room') {
      masterThreshold = 46;
      hardGateMode = false;
      bridgeAuthToSentry = false;
      criteria.rmsNoiseMul.threshold = 1.9;
      criteria.protoAffMin.threshold = 0.26;
      criteria.b1Min.threshold = 0.16;
      criteria.b2Max.threshold = 0.72;
      criteria.b3Max.threshold = 0.62;
      criteria.crestMax.threshold = 23.0;
      criteria.zcrMax.threshold = 2400;
      criteria.flatnessMin.threshold = 0.22;
      authCfg.criteria.rolloff85Max.threshold = 2600;
      authCfg.criteria.lipTrillMax.threshold = 0.68;
    } else if (preset === 'strict_real_only') {
      masterThreshold = 62;
      hardGateMode = true;
      bridgeAuthToSentry = true;
      criteria.protoAffMin.threshold = 0.42;
      authCfg.threshold = 58;
      authCfg.criteria.protoAffMin.threshold = 0.42;
      authCfg.criteria.rolloff85Max.threshold = 1800;
      authCfg.criteria.lipTrillMax.threshold = 0.46;
      authCfg.criteria.preBreathMax.threshold = 0.45;
      authCfg.criteria.formantRatioMax.threshold = 0.52;
      authCfg.criteria.pitchJitterMin.threshold = 0.55;
    }

    return {
      preset: preset,
      masterThreshold: masterThreshold,
      hardGateMode: hardGateMode,
      bridgeAuthToSentry: bridgeAuthToSentry,
      criteria: criteria,
      auth: authCfg
    };
  }

  var PRESETS = [
    { id: 'sentry_v3', label: 'Current Sentry v3 Baseline' },
    { id: 'balanced_hybrid', label: 'Balanced Fart + Anti-Mouth' },
    { id: 'sensitive_room', label: 'Sensitive Across-Room Capture' },
    { id: 'strict_real_only', label: 'Strict Real-Only Filter' }
  ];

  function analyzeAudioBandsFast(samples, sampleRate, refNoiseFloor) {
    var sr = Math.max(8000, Number(sampleRate) || 44100);
    var sl = samples ? samples.length : 0;
    if (sl === 0) {
      return {
        sub55Ratio: 0,
        b1Ratio: 0,
        b2Ratio: 0,
        b3Ratio: 0,
        rms: 0,
        peak: 0,
        crestDb: 0,
        rmsNoiseMul: 0,
        maxConsecTriggerFrames: 0
      };
    }

    var subLen = Math.max(128, Math.round(sr * 0.025));
    var hpAlpha = 1 / (1 + (2 * Math.PI * 36) / sr);
    var alphaB1 = 1 - Math.exp((-2 * Math.PI * 1165) / sr);
    var alphaB2 = 1 - Math.exp((-2 * Math.PI * 4040) / sr);

    var sHpPrevX1 = 0;
    var sHpY1 = 0;
    var sHpPrevX2 = 0;
    var sHpY2 = 0;
    var sLpB1a = 0;
    var sLpB1b = 0;
    var sLpB2a = 0;
    var sLpB2b = 0;

    var rawPow = 0;
    var hpPow = 0;
    var lp1Pow = 0;
    var lp2Pow = 0;
    var peakAbs = 0;
    var subFrames = [];

    for (var o = 0; o < sl; o += subLen) {
      var e = Math.min(sl, o + subLen);
      var flen = e - o;
      if (flen <= 0) break;
      var frPow = 0;
      var fhPow = 0;
      var flp1Pow = 0;
      var flp2Pow = 0;
      for (var i = o; i < e; i++) {
        var s = samples[i];
        var av = s < 0 ? -s : s;
        if (av > peakAbs) peakAbs = av;
        frPow += s * s;

        sHpY1 = hpAlpha * (sHpY1 + s - sHpPrevX1);
        sHpPrevX1 = s;
        sHpY2 = hpAlpha * (sHpY2 + sHpY1 - sHpPrevX2);
        sHpPrevX2 = sHpY1;
        var sHp = sHpY2;
        fhPow += sHp * sHp;

        sLpB1a += alphaB1 * (sHp - sLpB1a);
        sLpB1b += alphaB1 * (sLpB1a - sLpB1b);
        sLpB2a += alphaB2 * (sHp - sLpB2a);
        sLpB2b += alphaB2 * (sLpB2a - sLpB2b);
        flp1Pow += sLpB1b * sLpB1b;
        flp2Pow += sLpB2b * sLpB2b;
      }
      rawPow += frPow;
      hpPow += fhPow;
      lp1Pow += flp1Pow;
      lp2Pow += flp2Pow;

      var subHpRms = Math.sqrt(fhPow / flen);
      var subShare = clamp(1 - fhPow / (frPow + 1e-12), 0, 1);
      var fp1 = Math.min(fhPow, flp1Pow);
      var fp2 = Math.min(fhPow, Math.max(fp1, flp2Pow));
      var ftot = fhPow + 1e-12;
      subFrames.push({
        rms: subHpRms,
        subShare: subShare,
        b1: fp1 / ftot,
        b2: (fp2 - fp1) / ftot,
        b3: (fhPow - fp2) / ftot
      });
    }

    var noise = typeof refNoiseFloor === 'number' && refNoiseFloor > 0
      ? refNoiseFloor
      : 0.004;
    if (!refNoiseFloor && subFrames.length > 0) {
      var sortedRms = subFrames.map(function (x) { return x.rms; }).sort(function (a, b) { return a - b; });
      var p15 = sortedRms[Math.min(sortedRms.length - 1, Math.floor(sortedRms.length * 0.15))];
      noise = clamp(Math.min(p15, 0.012), 0.0015, 0.025);
    }

    var rmsTotal = Math.sqrt(rawPow / Math.max(1, sl));
    var hpRmsTotal = Math.sqrt(hpPow / Math.max(1, sl));
    var crestDb = rmsTotal > 1e-9 ? 20 * Math.log10(Math.max(peakAbs, 1e-9) / rmsTotal) : 0;

    var curRun = 0;
    var maxRun = 0;
    var activeGate = Math.max(0.008, noise * 2.1);
    for (var fi = 0; fi < subFrames.length; fi++) {
      var sf = subFrames[fi];
      var thump = sf.subShare > 0.68;
      var cough = sf.b3 > 0.42 && sf.b1 < 0.12;
      if (!thump && !cough && sf.rms >= activeGate) {
        curRun++;
        if (curRun > maxRun) maxRun = curRun;
      } else {
        curRun = 0;
      }
    }

    var p1 = Math.min(hpPow, lp1Pow);
    var p2 = Math.min(hpPow, Math.max(p1, lp2Pow));
    var totHp = hpPow + 1e-12;
    return {
      sub55Ratio: clamp(1 - hpPow / (rawPow + 1e-12), 0, 1),
      b1Ratio: p1 / totHp,
      b2Ratio: (p2 - p1) / totHp,
      b3Ratio: (hpPow - p2) / totHp,
      rms: rmsTotal,
      hpRms: hpRmsTotal,
      peak: peakAbs,
      crestDb: crestDb,
      rmsNoiseMul: hpRmsTotal / Math.max(0.0012, noise),
      maxConsecTriggerFrames: maxRun
    };
  }

  function computeSpectrumBins64(samples, sampleRate) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var bins = new Float32Array(64);
    var centers = new Float32Array(64);
    var fMin = 40;
    var fMax = 6000;
    for (var b = 0; b < 64; b++) {
      centers[b] = fMin * Math.pow(fMax / fMin, b / 63);
    }
    if (!DSP || typeof DSP.fft !== 'function' || !samples || samples.length < 32) {
      return { bins: bins, centers: centers };
    }

    var sr = Math.max(8000, Number(sampleRate) || 44100);
    var fftSize = 1024;
    var hop = Math.max(256, Math.floor(Math.max(1, samples.length - fftSize) / 10));
    var re = new Float32Array(fftSize);
    var im = new Float32Array(fftSize);
    var accum = new Float32Array(fftSize / 2);
    var frames = 0;
    for (var start = 0; start < samples.length && frames < 16; start += hop) {
      for (var i = 0; i < fftSize; i++) {
        var idx = start + i;
        var w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftSize - 1));
        re[i] = idx < samples.length ? samples[idx] * w : 0;
        im[i] = 0;
      }
      DSP.fft(re, im);
      for (var k = 1; k < fftSize / 2; k++) {
        accum[k] += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      }
      frames++;
    }
    if (frames === 0) return { bins: bins, centers: centers };

    var binHz = sr / fftSize;
    var maxMag = 1e-6;
    for (var bi = 0; bi < 64; bi++) {
      var fLo = bi === 0 ? fMin * 0.85 : Math.sqrt(centers[bi - 1] * centers[bi]);
      var fHi = bi === 63 ? fMax * 1.15 : Math.sqrt(centers[bi] * centers[bi + 1]);
      var kLo = Math.max(1, Math.floor(fLo / binHz));
      var kHi = Math.min(fftSize / 2 - 1, Math.ceil(fHi / binHz));
      var sum = 0;
      var cnt = 0;
      for (var kb = kLo; kb <= kHi; kb++) {
        sum += accum[kb] / frames;
        cnt++;
      }
      bins[bi] = cnt > 0 ? sum / cnt : 0;
      if (bins[bi] > maxMag) maxMag = bins[bi];
    }
    for (var j = 0; j < 64; j++) {
      bins[j] = clamp(bins[j] / maxMag, 0, 1);
    }
    return { bins: bins, centers: centers };
  }

  function computeWindowedRmsStats(samples, sampleRate) {
    var sr = Math.max(8000, Number(sampleRate) || 44100);
    var arr = samples && samples.length ? samples : null;
    if (!arr || arr.length === 0) return null;

    var winSamples = Math.min(arr.length, Math.max(512, Math.round(sr * 0.25)));
    var hopSamples = Math.max(256, Math.round(winSamples * 0.5));
    var rmsArr = [];
    for (var start = 0; start === 0 || start + winSamples <= arr.length; start += hopSamples) {
      var end = Math.min(arr.length, start + winSamples);
      var len = end - start;
      if (len < 128) break;
      var pow = 0;
      for (var i = start; i < end; i++) {
        var s = arr[i];
        pow += s * s;
      }
      rmsArr.push(Math.sqrt(pow / len));
      if (end >= arr.length) break;
    }
    if (rmsArr.length === 0) return null;
    var summary = summarizeNumericArray(rmsArr);
    var rmsMedian = safeNum(summary.median, 0.004);
    var rmsP90 = Math.max(0.0015, safeNum(summary.p90, rmsMedian));
    return {
      rmsMedian: rmsMedian,
      rmsP90: rmsP90,
      count: rmsArr.length
    };
  }

  /**
   * Fast (~2ms) live Sentry telemetry for real-time mic monitoring.
   * Skips heavy offline spectrogram/pitch/lip-trill/MFCC extraction so Auto Sentry stays responsive.
   */
  function extractFastSentryTelemetry(samples, sampleRate, refNoiseFloor) {
    var sr = Math.max(8000, Number(sampleRate) || 44100);
    if (!samples || samples.length < 128) return null;

    var bands = analyzeAudioBandsFast(samples, sr, refNoiseFloor);
    var spec64 = computeSpectrumBins64(samples, sr);
    var rawRmsStats = computeWindowedRmsStats(samples, sr);

    var crossings = 0;
    for (var zi = 1; zi < samples.length; zi++) {
      if ((samples[zi - 1] <= 0 && samples[zi] > 0) || (samples[zi - 1] > 0 && samples[zi] <= 0)) crossings++;
    }
    var zcrHz = (crossings / 2) * (sr / samples.length);

    var totPow = 0;
    var logSum = 0;
    var logCnt = 0;
    var maxBinMag = 0;
    var domHz = 120;
    var pArr = new Float32Array(64);
    for (var k = 0; k < 64; k++) {
      var mag = Math.max(0, safeNum(spec64.bins[k], 0));
      var p = mag * mag;
      pArr[k] = p;
      if (k >= 2 && mag > maxBinMag) {
        maxBinMag = mag;
        domHz = spec64.centers[k] || 120;
      }
      if (k >= 4 && k <= 57) {
        totPow += p;
        if (p > 1e-8) {
          logSum += Math.log(p);
          logCnt++;
        }
      }
    }

    var flatness = 0.2;
    var rolloff85Hz = 1400;
    if (totPow > 1e-10 && logCnt > 0) {
      var arithMean = totPow / 54;
      var geomMean = Math.exp(logSum / logCnt);
      flatness = clamp(geomMean / Math.max(1e-10, arithMean), 0, 1);
      var cum = 0;
      var targetCum = totPow * 0.85;
      for (var rk = 4; rk <= 57; rk++) {
        cum += pArr[rk];
        if (cum >= targetCum) {
          rolloff85Hz = spec64.centers[rk] || 1400;
          break;
        }
      }
    }

    var durationSec = samples.length / sr;
    var activeDurMs = Math.max(bands.maxConsecTriggerFrames * 25, bands.rmsNoiseMul >= 1.6 ? Math.min(durationSec * 1000, 180) : 0);
    var rmsDb = bands.rms > 1e-6 ? Number((20 * Math.log10(bands.rms)).toFixed(1)) : -90;
    var peakDb = bands.peak > 1e-6 ? Number((20 * Math.log10(bands.peak)).toFixed(1)) : -90;

    return {
      isFastLive: true,
      metrics: {
        rmsNoiseMul: Number(clamp(bands.rmsNoiseMul, 0, 20).toFixed(2)),
        minActiveMs: Number(activeDurMs.toFixed(1)),
        sub55Max: Number(bands.sub55Ratio.toFixed(3)),
        triggerConsecFrames: bands.maxConsecTriggerFrames,
        protoAffMin: null,
        b1Min: Number(bands.b1Ratio.toFixed(3)),
        b2Max: Number(bands.b2Ratio.toFixed(3)),
        b3Max: Number(bands.b3Ratio.toFixed(3)),
        crestMax: Number(clamp(bands.crestDb, 0, 35).toFixed(1)),
        zcrMax: Math.round(clamp(zcrHz, 0, 8000)),
        flatnessMin: Number(flatness.toFixed(3)),
        rolloff85Max: Math.round(clamp(rolloff85Hz, 60, 6000)),
        lipTrillMax: null,
        preBreathMax: null,
        pitchJitterMin: null,
        formantRatioMax: null
      },
      durationSec: Number(durationSec.toFixed(3)),
      sampleRate: sr,
      rmsDb: rmsDb,
      rawRmsP90: rawRmsStats ? rawRmsStats.rmsP90 : bands.rms,
      rawRmsMedian: rawRmsStats ? rawRmsStats.rmsMedian : bands.rms,
      peakDb: peakDb,
      dominantPeakHz: Math.round(domHz),
      authenticityScore: null,
      dspClass: null,
      spectrumBins: spec64.bins,
      spectrumCenters: spec64.centers,
      autopsy: null,
      nativeSentry: null
    };
  }

  function extractFullTelemetry(samples, sampleRate, rawSamples, clipInfo, refNoiseFloor, opts) {
    opts = opts || {};
    var sr = Math.max(8000, Number(sampleRate) || 44100);
    var DSP = root.TootApp && root.TootApp.DSP;
    var Audio = root.TootApp && root.TootApp.Audio;

    var rawArr = rawSamples && rawSamples.length ? rawSamples : samples;
    var clip = clipInfo || (
      DSP && typeof DSP.autoClipAudio === 'function' && rawArr && rawArr.length > 0
        ? DSP.autoClipAudio(rawArr, sr)
        : null
    );
    var active = samples && samples.length > 0
      ? samples
      : (clip && clip.clipped && clip.clipped.length > 0 ? clip.clipped : rawArr);

    if (!active || active.length === 0) {
      return null;
    }
    var rawRmsStats = computeWindowedRmsStats(rawArr && rawArr.length ? rawArr : active, sr);

    var feat = DSP && typeof DSP.extractFeatures === 'function' ? DSP.extractFeatures(active, sr) : null;
    var bands = analyzeAudioBandsFast(active, sr, refNoiseFloor);
    var sig = Audio && typeof Audio.scoreFartSignature === 'function'
      ? Audio.scoreFartSignature(active, sr, bands, feat)
      : { matched: false, score: 0, rmsZDist: 6, path: null, reason: 'unavailable' };

    // Avoid redundant second DSP.extractFeatures() inside validateCapturedEvent unless explicitly requested
    var nativeVerdict = null;
    if (opts.runEngineValidate && Audio && typeof Audio.createAutoDetectEngine === 'function' && clip && clip.ok) {
      try {
        var tempEng = Audio.createAutoDetectEngine(sr);
        nativeVerdict = tempEng.validateCapturedEvent(rawArr || active, clip, sr);
        if (nativeVerdict && nativeVerdict.stats && typeof nativeVerdict.stats.fartSignatureScore === 'number') {
          sig.score = nativeVerdict.stats.fartSignatureScore;
        }
      } catch (e) {}
    } else if (clip && clip.ok) {
      var fastValid = Boolean(sig.matched && bands.sub55Ratio <= 0.66);
      var fastReason = !fastValid ? (bands.sub55Ratio > 0.66 ? 'thump' : sig.reason || 'signature_miss') : null;
      var fastMsg = fastValid
        ? 'Accepted as Real Fart'
        : (bands.sub55Ratio > 0.66 ? 'Filtered low-frequency thump' : (sig.message || 'Did not match fart signature'));
      nativeVerdict = { valid: fastValid, reason: fastReason, message: fastMsg };
    }

    var f = feat || {};
    var durationSec = safeNum(f.duration, active.length / sr);
    var activeDurMs = durationSec * 1000;
    var avgSpec = f.avgSpectrum || [];
    var specObj = f.spectrogram || null;
    var centers = specObj && specObj.freqCenters ? specObj.freqCenters : null;
    var nBands = avgSpec.length || (centers ? centers.length : 40);

    // Pitch frame-to-frame chaos (jitter in semitones)
    var pitchArr = f.pitchHzArr || [];
    var prevHz = 0;
    var stepSum = 0;
    var stepCnt = 0;
    for (var pi = 0; pi < pitchArr.length; pi++) {
      var curHz = safeNum(pitchArr[pi], 0);
      if (curHz > 20) {
        if (prevHz > 20) {
          stepSum += 12 * Math.abs(Math.log(curHz / prevHz) / Math.LN2);
          stepCnt++;
        }
        prevHz = curHz;
      } else {
        prevHz = 0;
      }
    }
    var pitchJitter = stepCnt > 0 ? stepSum / stepCnt : 0;

    // F1 (350-850 Hz) & F2 (950-2300 Hz) vocal formant ratio
    var subBandSum = 0;
    var subBandCount = 0;
    var f1Sum = 0;
    var f1Peak = 0;
    var f1Count = 0;
    var f2Sum = 0;
    var f2Peak = 0;
    var f2Count = 0;
    for (var bi = 0; bi < nBands; bi++) {
      var mag = clamp(safeNum(avgSpec[bi], 0), 0, 1);
      var freq = centers && bi < centers.length ? safeNum(centers[bi], 200) : 45 * Math.pow(4200 / 45, bi / Math.max(1, nBands - 1));
      if (freq < 330) {
        subBandSum += mag;
        subBandCount++;
      } else if (freq >= 350 && freq <= 850) {
        f1Sum += mag;
        if (mag > f1Peak) f1Peak = mag;
        f1Count++;
      } else if (freq >= 950 && freq <= 2300) {
        f2Sum += mag;
        if (mag > f2Peak) f2Peak = mag;
        f2Count++;
      }
    }
    var subAvg = subBandCount > 0 ? subBandSum / subBandCount : 0.25;
    var f1Sig = 0.45 * (f1Count > 0 ? f1Sum / f1Count : 0) + 0.55 * f1Peak;
    var f2Sig = 0.45 * (f2Count > 0 ? f2Sum / f2Count : 0) + 0.55 * f2Peak;
    var f1Ratio = clamp(f1Sig / Math.max(0.16, subAvg * 0.95), 0, 1.15) / 1.15;
    var f2Ratio = clamp(f2Sig / Math.max(0.14, subAvg * 0.85), 0, 1.15) / 1.15;
    var formantRatio = clamp(0.55 * f1Ratio + 0.45 * f2Ratio, 0, 1);

    // Pre-onset breath or boundary breathiness fallback
    var preBreathScore = 0;
    if (clip && clip.preOnsetBreath && clip.preOnsetBreath.available) {
      preBreathScore = clamp(safeNum(clip.preOnsetBreath.score, 0), 0, 1);
    } else if (DSP && typeof DSP.measurePreOnsetBreath === 'function' && rawArr && clip && typeof clip.startSample === 'number' && clip.startSample > sr * 0.08) {
      var preRes = DSP.measurePreOnsetBreath(rawArr, sr, clip.startSample);
      if (preRes && preRes.available) preBreathScore = clamp(safeNum(preRes.score, 0), 0, 1);
    } else if (specObj && specObj.grid && specObj.frames > 4 && nBands > 0) {
      var nFrames = specObj.frames;
      var sEnd = Math.max(1, Math.floor(nFrames * 0.16));
      var tStart = Math.max(sEnd, Math.floor(nFrames * 0.78));
      var bHi = 0;
      var bTot = 0;
      for (var fi = 0; fi < nFrames; fi++) {
        if (fi < sEnd || fi >= tStart) {
          var roff = fi * nBands;
          for (var kb = 0; kb < nBands; kb++) {
            var gv = clamp(safeNum(specObj.grid[roff + kb], 0), 0, 1);
            var fc = centers && kb < centers.length ? safeNum(centers[kb], 200) : 45 * Math.pow(4200 / 45, kb / Math.max(1, nBands - 1));
            bTot += gv;
            if (fc >= 1150) bHi += gv;
          }
        }
      }
      if (bTot > 1e-4) preBreathScore = clamp((bHi / bTot) * 1.4, 0, 1);
    }

    var rolloff85Hz = clamp(safeNum(f.spectralRolloff85Hz, f.spectralCentroidHz ? f.spectralCentroidHz * 1.8 : 1400), 60, 6000);
    var lipTrillScore = clamp(safeNum(f.lipTrillScore, 0), 0, 1);
    var crestDb = clamp(safeNum(f.crestFactorDb, bands.crestDb), 0, 35);
    var zcr = clamp(safeNum(f.zcr, 250), 0, 8000);
    var flatness = clamp(safeNum(f.spectralFlatness, 0.2), 0, 1);
    var protoAff = clamp(safeNum(sig.score, 0), 0, 1);
    var clothingDamp = clamp(safeNum(f.clothingDampingScore, 1 - (rolloff85Hz - 950) / 2250), 0, 1);

    // Real-organic vs mouth-mimic composite Authenticity index (0=Fake/Mouth .. 100=Real)
    var authOrganic01 = clamp(
      0.26 * protoAff +
      0.22 * clothingDamp +
      0.20 * (1 - lipTrillScore) +
      0.16 * (1 - formantRatio) +
      0.08 * (1 - preBreathScore) +
      0.08 * clamp(pitchJitter / 1.5, 0, 1),
      0,
      1
    );
    var authenticityScore = Math.round(authOrganic01 * 100);

    var dspClass = DSP && typeof DSP.classifySpecimen === 'function' ? DSP.classifySpecimen(f, active, sr) : null;
    var spec64 = computeSpectrumBins64(active, sr);

    var metrics = {
      rmsNoiseMul: Number(clamp(bands.rmsNoiseMul, 0, 20).toFixed(2)),
      minActiveMs: Number(activeDurMs.toFixed(1)),
      sub55Max: Number(bands.sub55Ratio.toFixed(3)),
      triggerConsecFrames: bands.maxConsecTriggerFrames,
      protoAffMin: Number(protoAff.toFixed(3)),
      b1Min: Number(bands.b1Ratio.toFixed(3)),
      b2Max: Number(bands.b2Ratio.toFixed(3)),
      b3Max: Number(bands.b3Ratio.toFixed(3)),
      crestMax: Number(crestDb.toFixed(1)),
      zcrMax: Math.round(zcr),
      flatnessMin: Number(flatness.toFixed(3)),
      rolloff85Max: Math.round(rolloff85Hz),
      lipTrillMax: Number(lipTrillScore.toFixed(3)),
      preBreathMax: Number(preBreathScore.toFixed(3)),
      pitchJitterMin: Number(pitchJitter.toFixed(2)),
      formantRatioMax: Number(formantRatio.toFixed(3))
    };

    return {
      metrics: metrics,
      durationSec: Number(durationSec.toFixed(3)),
      sampleRate: sr,
      rmsDb: typeof f.rmsDb === 'number' ? f.rmsDb : null,
      rawRmsP90: rawRmsStats ? rawRmsStats.rmsP90 : null,
      rawRmsMedian: rawRmsStats ? rawRmsStats.rmsMedian : null,
      peakDb: typeof f.peakDb === 'number' ? f.peakDb : null,
      dominantPeakHz: typeof f.dominantPeakHz === 'number' ? f.dominantPeakHz : null,
      authenticityScore: authenticityScore,
      dspClass: dspClass,
      spectrumBins: spec64.bins,
      spectrumCenters: spec64.centers,
      autopsy: {
        envelope: f.envelope || [],
        spectrogram: f.spectrogram || null,
        pitchHzArr: f.pitchHzArr || [],
        modSpectrum: f.modSpectrum || [],
        modRateHz: safeNum(f.modRateHz, 0),
        modDepth: safeNum(f.modDepth, 0),
        burstCount: Math.max(1, Math.round(safeNum(f.burstCount, 1))),
        attackSec: safeNum(f.attackSec, 0),
        decaySec: safeNum(f.decaySec, 0),
        t10Ratio: safeNum(f.t10Ratio, 0),
        t90Ratio: safeNum(f.t90Ratio, 1),
        spectralCentroidHz: safeNum(f.spectralCentroidHz, 0),
        voicedRatio: safeNum(f.voicedRatio, 0),
        lipTrillPeakHz: safeNum(f.lipTrillPeakHz, 0)
      },
      nativeSentry: {
        matched: Boolean(nativeVerdict ? nativeVerdict.valid : sig.matched),
        path: sig.path || null,
        reason: (nativeVerdict && !nativeVerdict.valid ? nativeVerdict.reason : sig.reason) || null,
        message: (nativeVerdict && !nativeVerdict.valid ? nativeVerdict.message : sig.message) || 'Accepted as Real Fart'
      }
    };
  }

  function buildBackgroundControlProfile(samples, sampleRate, opts) {
    opts = opts || {};
    var sr = Math.max(8000, Number(sampleRate) || 44100);
    var arr = samples && samples.length ? samples : new Float32Array(0);
    if (arr.length === 0) return null;

    var winSamples = Math.min(arr.length, Math.max(512, Math.round(sr * 0.25)));
    var hopSamples = Math.max(256, Math.round(winSamples * 0.5));

    var rmsArr = [];
    var peakArr = [];
    var b1Arr = [];
    var b2Arr = [];
    var b3Arr = [];
    var subArr = [];
    var zcrArr = [];
    var rollArr = [];
    var flatArr = [];
    var specWindows = [];
    var specCenters = null;

    for (var start = 0; start === 0 || start + winSamples <= arr.length; start += hopSamples) {
      var end = Math.min(arr.length, start + winSamples);
      var win = arr.subarray(start, end);
      if (win.length < 128) break;

      var bands = analyzeAudioBandsFast(win, sr, 0.004);
      var spec = computeSpectrumBins64(win, sr);
      if (!specCenters) specCenters = spec.centers;

      var crossings = 0;
      for (var zi = 1; zi < win.length; zi++) {
        if ((win[zi - 1] <= 0 && win[zi] > 0) || (win[zi - 1] > 0 && win[zi] <= 0)) crossings++;
      }
      var zcrHz = (crossings / 2) * (sr / win.length);

      var totPow = 0;
      var logSum = 0;
      var logCnt = 0;
      var pArr = new Float32Array(64);
      for (var k = 0; k < 64; k++) {
        var mag = Math.max(0, safeNum(spec.bins[k], 0));
        var p = mag * mag;
        pArr[k] = p;
        if (k >= 4 && k <= 57) {
          totPow += p;
          if (p > 1e-8) {
            logSum += Math.log(p);
            logCnt++;
          }
        }
      }
      var flatness = 0.2;
      var rollHz = 1400;
      if (totPow > 1e-10 && logCnt > 0) {
        var arithMean = totPow / 54;
        var geomMean = Math.exp(logSum / logCnt);
        flatness = clamp(geomMean / Math.max(1e-10, arithMean), 0, 1);
        var cum = 0;
        var targetCum = totPow * 0.85;
        for (var rk = 4; rk <= 57; rk++) {
          cum += pArr[rk];
          if (cum >= targetCum) {
            rollHz = spec.centers[rk] || 1400;
            break;
          }
        }
      }

      rmsArr.push(bands.rms);
      peakArr.push(bands.peak);
      b1Arr.push(bands.b1Ratio);
      b2Arr.push(bands.b2Ratio);
      b3Arr.push(bands.b3Ratio);
      subArr.push(bands.sub55Ratio);
      zcrArr.push(zcrHz);
      rollArr.push(rollHz);
      flatArr.push(flatness);
      specWindows.push(spec.bins);

      if (end >= arr.length) break;
    }

    if (rmsArr.length === 0) return null;

    var sRms = summarizeNumericArray(rmsArr);
    var sPeak = summarizeNumericArray(peakArr);
    var sB1 = summarizeNumericArray(b1Arr);
    var sB2 = summarizeNumericArray(b2Arr);
    var sB3 = summarizeNumericArray(b3Arr);
    var sSub = summarizeNumericArray(subArr);
    var sZcr = summarizeNumericArray(zcrArr);
    var sRoll = summarizeNumericArray(rollArr);
    var sFlat = summarizeNumericArray(flatArr);

    var specMean = new Float32Array(64);
    var specP90 = new Float32Array(64);
    for (var sb = 0; sb < 64; sb++) {
      var colVals = [];
      for (var wi = 0; wi < specWindows.length; wi++) {
        colVals.push(safeNum(specWindows[wi][sb], 0));
      }
      var cs = summarizeNumericArray(colVals);
      specMean[sb] = cs.count > 0 ? clamp(safeNum(cs.mean, 0), 0, 1) : 0;
      specP90[sb] = cs.count > 0 ? clamp(safeNum(cs.p90, 0), 0, 1) : 0;
    }

    var rmsMedian = safeNum(sRms.median, 0.004);
    var rmsP90 = Math.max(0.0015, safeNum(sRms.p90, rmsMedian));
    var rmsMax = Math.max(rmsP90, safeNum(sPeak.max, rmsP90));
    var rmsDbP90 = Number((20 * Math.log10(Math.max(1e-5, rmsP90))).toFixed(1));
    var b1Mean = clamp(safeNum(sB1.mean, 0.25), 0, 1);
    var b1P90 = clamp(safeNum(sB1.p90, 0.35), 0, 1);
    var b2Mean = clamp(safeNum(sB2.mean, 0.35), 0, 1);
    var b2P90 = clamp(safeNum(sB2.p90, 0.45), 0, 1);
    var b3Mean = clamp(safeNum(sB3.mean, 0.15), 0, 1);
    var b3P90 = clamp(safeNum(sB3.p90, 0.25), 0, 1);
    var sub55Mean = clamp(safeNum(sSub.mean, 0.2), 0, 1);
    var sub55P90 = clamp(safeNum(sSub.p90, 0.35), 0, 1);
    var zcrP90 = Math.round(safeNum(sZcr.p90, 600));
    var rolloff85P90 = Math.round(safeNum(sRoll.p90, 2200));
    var flatnessMean = clamp(safeNum(sFlat.mean, 0.3), 0, 1);
    var coreRmsP90 = rmsP90 * Math.sqrt(clamp((1 - sub55Mean * 0.5) * b1P90, 0.02, 1));

    var character = 'Quiet Room';
    if (b2P90 >= 0.42 || zcrP90 >= 1500) {
      character = 'TV / Speech Active';
    } else if (rmsMax / Math.max(1e-4, rmsMedian) >= 3.2 && rmsP90 > 0.015) {
      character = 'Impulsive / Barking';
    } else if (rmsP90 >= 0.012) {
      character = 'Steady Fan / Room Hum';
    }

    return {
      active: true,
      name: opts.name || 'Room Control',
      capturedAt: new Date().toISOString(),
      durationSec: Number((arr.length / sr).toFixed(2)),
      sampleRate: sr,
      windowCount: rmsArr.length,
      rmsMedian: rmsMedian,
      rmsP90: rmsP90,
      rmsMax: rmsMax,
      rmsDbP90: rmsDbP90,
      coreRmsP90: coreRmsP90,
      b1Mean: b1Mean,
      b1P90: b1P90,
      b2Mean: b2Mean,
      b2P90: b2P90,
      b3Mean: b3Mean,
      b3P90: b3P90,
      sub55P90: sub55P90,
      zcrP90: zcrP90,
      rolloff85P90: rolloff85P90,
      flatnessMean: flatnessMean,
      spectrumMean: specMean,
      spectrumP90: specP90,
      spectrumCenters: specCenters,
      character: character
    };
  }

  function evaluateAgainstBackground(telemetry, bgProfile) {
    if (!telemetry || !bgProfile || !bgProfile.active) return null;
    var spec = telemetry.spectrumBins || new Float32Array(64);
    var bgMean = bgProfile.spectrumMean || new Float32Array(64);
    var bgP90 = bgProfile.spectrumP90 || new Float32Array(64);

    var dot = 0;
    var nA = 0;
    var nB = 0;
    var excessBins = new Float32Array(64);
    var excessCoreSum = 0;
    var excessCoreCnt = 0;

    for (var k = 0; k < 64; k++) {
      var sv = clamp(safeNum(spec[k], 0), 0, 1);
      var bm = clamp(safeNum(bgMean[k], 0), 0, 1);
      var bp = clamp(safeNum(bgP90[k], 0), 0, 1);
      dot += sv * bm;
      nA += sv * sv;
      nB += bm * bm;
      var ex = Math.max(0, sv - 0.85 * bp);
      excessBins[k] = ex;
      if (k >= 4 && k <= 37) {
        excessCoreSum += ex;
        excessCoreCnt++;
      }
    }

    var bgSimilarity = nA > 1e-6 && nB > 1e-6 ? clamp(dot / Math.sqrt(nA * nB), 0, 1) : 0;
    var excessCoreShare = excessCoreCnt > 0 ? excessCoreSum / excessCoreCnt : 0;
    var activeRms = telemetry.rawRmsP90 > 0
      ? telemetry.rawRmsP90
      : (telemetry.rmsDb != null ? Math.pow(10, telemetry.rmsDb / 20) : 0.04);
    var rmsOverBgP90 = activeRms / Math.max(0.002, bgProfile.rmsP90);

    var m = telemetry.metrics || {};
    var activeB1 = clamp(safeNum(m.b1Min, 0.3), 0, 1);
    var activeSub = clamp(safeNum(m.sub55Max, 0.2), 0, 1);
    var activeCoreRms = activeRms * Math.sqrt(clamp((1 - activeSub * 0.5) * activeB1, 0.01, 1));
    var bgCoreRms = Math.max(0.001, safeNum(bgProfile.coreRmsP90, bgProfile.rmsP90 * Math.sqrt(Math.max(0.05, bgProfile.b1P90))));
    var excessCoreDb = 20 * Math.log10(Math.max(1e-5, activeCoreRms) / bgCoreRms);

    var isBackgroundMatch = Boolean(
      (bgSimilarity >= 0.84 && rmsOverBgP90 < 1.55) ||
      (excessCoreDb < 3.0 && rmsOverBgP90 < 1.35)
    );

    var verdictNote = isBackgroundMatch
      ? 'Matches room control (' + Math.round(bgSimilarity * 100) + '% spec, ' + (excessCoreDb >= 0 ? '+' : '') + excessCoreDb.toFixed(1) + ' dB 55-750Hz)'
      : 'Clears room control (+' + excessCoreDb.toFixed(1) + ' dB core lift, ' + rmsOverBgP90.toFixed(1) + 'x BG)';

    return {
      active: true,
      bgSimilarity: Number(bgSimilarity.toFixed(3)),
      excessCoreDb: Number(excessCoreDb.toFixed(1)),
      excessCoreShare: Number(excessCoreShare.toFixed(3)),
      rmsOverBgP90: Number(rmsOverBgP90.toFixed(2)),
      excessBins: excessBins,
      isBackgroundMatch: isBackgroundMatch,
      verdictNote: verdictNote
    };
  }

  function evaluateAuthenticity(telemetry, config) {
    if (!telemetry || !telemetry.metrics) {
      return {
        score: 50,
        threshold: 50,
        isRealOrganic: null,
        pending: true,
        verdictReason: 'Load a clip to score Real vs. Mouth Authenticity',
        criteriaResults: [],
        failingIds: []
      };
    }
    if (telemetry.isFastLive) {
      return {
        score: null,
        threshold: (config && config.auth && typeof config.auth.threshold === 'number') ? config.auth.threshold : 50,
        isRealOrganic: null,
        pending: true,
        verdictReason: 'Fast Live Sentry tick — Authenticity runs offline after capture',
        criteriaResults: [],
        failingIds: []
      };
    }

    var authCfg = (config && config.auth && config.auth.criteria) ? config.auth : createDefaultAuthConfig();
    var authThr = clamp(safeNum(authCfg.threshold, 50), 15, 85);
    var wSum = 0;
    var weightedSum = 0;
    var criteriaResults = [];
    var failingIds = [];

    for (var i = 0; i < AUTH_CRITERIA_IDS.length; i++) {
      var id = AUTH_CRITERIA_IDS[i];
      var def = CRITERIA_BY_ID[id];
      if (!def) continue;
      var cCfg = (authCfg.criteria && authCfg.criteria[id]) || {
        threshold: def.defaultThreshold,
        weight: def.defaultWeight,
        enabled: true
      };
      var rawVal = telemetry.metrics[id];
      var hasVal = typeof rawVal === 'number' && Number.isFinite(rawVal);
      var val = hasVal ? rawVal : 0;
      var thr = safeNum(cCfg.threshold, def.defaultThreshold);
      var wt = clamp(safeNum(cCfg.weight, def.defaultWeight), 0, 3);
      var en = Boolean(cCfg.enabled) && hasVal;

      var passed = hasVal ? (def.mode === 'min' ? val >= thr : val <= thr) : true;
      var span = Math.max(1e-4, (def.max - def.min) * 0.26);
      var signedMargin = def.mode === 'min' ? (val - thr) / span : (thr - val) / span;
      var normScore01 = clamp(1 / (1 + Math.exp(-signedMargin * 2.0)), 0.02, 0.99);

      if (en && wt > 0) {
        wSum += wt;
        weightedSum += wt * normScore01;
        if (!passed) failingIds.push(id);
      }

      criteriaResults.push({
        id: id,
        label: def.label,
        shortLabel: def.shortLabel,
        value: val,
        formattedValue: hasVal ? def.format(val) : '—',
        threshold: thr,
        formattedThreshold: def.format(thr),
        weight: wt,
        enabled: Boolean(cCfg.enabled),
        mode: def.mode,
        passed: passed,
        normScore01: normScore01
      });
    }

    var score = wSum > 0 ? Math.round(clamp((weightedSum / wSum) * 100, 0, 100)) : safeNum(telemetry.authenticityScore, 50);
    var isRealOrganic = score >= authThr;
    var verdictReason;
    if (isRealOrganic) {
      verdictReason = score + '% Real Organic (≥ ' + Math.round(authThr) + '%)';
    } else if (failingIds.length > 0) {
      var names = failingIds.slice(0, 2).map(function (fid) {
        return CRITERIA_BY_ID[fid] ? CRITERIA_BY_ID[fid].shortLabel : fid;
      });
      verdictReason = score + '% Mouth Cues: ' + names.join(', ') + (failingIds.length > 2 ? ' +' + (failingIds.length - 2) : '');
    } else {
      verdictReason = score + '% Below Real Split (< ' + Math.round(authThr) + '%)';
    }

    return {
      score: score,
      threshold: authThr,
      isRealOrganic: isRealOrganic,
      pending: false,
      verdictReason: verdictReason,
      criteriaResults: criteriaResults,
      failingIds: failingIds
    };
  }

  function evaluateTelemetry(telemetry, config, bgProfile) {
    if (!telemetry || !telemetry.metrics) {
      return {
        detectScore: 0,
        authenticityScore: 50,
        authEval: evaluateAuthenticity(null, config),
        detected: false,
        hardGateBlocked: false,
        bgRejected: false,
        authBridgeRejected: false,
        bgEval: null,
        verdictReason: 'No signal',
        criteriaResults: [],
        failingIds: []
      };
    }

    var cfg = config || createDefaultConfig('sentry_v3');
    var criteriaResults = [];
    var failingIds = [];
    var wSum = 0;
    var weightedNormSum = 0;
    var enabledCount = 0;
    var failCount = 0;
    var hardFailedIds = [];
    var isFastLive = Boolean(telemetry.isFastLive);

    for (var i = 0; i < CRITERIA_DEFS.length; i++) {
      var def = CRITERIA_DEFS[i];
      var isSentryGate = def.group === 'stage1' || def.group === 'stage2';
      var cCfg = (cfg.criteria && cfg.criteria[def.id]) || {
        threshold: def.defaultThreshold,
        weight: def.defaultWeight,
        enabled: def.defaultEnabled
      };
      var rawVal = telemetry.metrics[def.id];
      var hasVal = typeof rawVal === 'number' && Number.isFinite(rawVal);
      var val = hasVal ? rawVal : 0;
      var thr = safeNum(cCfg.threshold, def.defaultThreshold);
      var wt = clamp(safeNum(cCfg.weight, def.defaultWeight), 0, 3);
      var en = Boolean(cCfg.enabled) && isSentryGate && hasVal && !(isFastLive && def.id === 'protoAffMin');

      var passed = hasVal ? (def.mode === 'min' ? val >= thr : val <= thr) : true;
      var span = Math.max(1e-4, (def.max - def.min) * 0.24);
      var signedMargin = def.mode === 'min' ? (val - thr) / span : (thr - val) / span;
      var normScore01 = clamp(1 / (1 + Math.exp(-signedMargin * 2.1)), 0.02, 0.99);

      if (en && wt > 0) {
        enabledCount++;
        wSum += wt;
        weightedNormSum += wt * normScore01;
        if (!passed) {
          failCount++;
          failingIds.push(def.id);
          if (wt >= 0.4) hardFailedIds.push(def.id);
        }
      }

      criteriaResults.push({
        id: def.id,
        label: def.label,
        shortLabel: def.shortLabel,
        value: val,
        formattedValue: hasVal ? def.format(val) : '—',
        threshold: thr,
        formattedThreshold: def.format(thr),
        weight: wt,
        enabled: Boolean(cCfg.enabled),
        mode: def.mode,
        passed: passed,
        normScore01: normScore01
      });
    }

    var baseScore = wSum > 0 ? (weightedNormSum / wSum) * 100 : 50;
    var masterThr = clamp(safeNum(cfg.masterThreshold, 54), 10, 95);
    var hardGateBlocked = Boolean(cfg.hardGateMode && hardFailedIds.length > 0);
    var detectScore = baseScore;
    if (hardGateBlocked && enabledCount > 0) {
      var failFrac = hardFailedIds.length / enabledCount;
      detectScore = Math.min(baseScore, Math.max(4, masterThr - 4 - failFrac * 24));
    }
    detectScore = Math.round(clamp(detectScore, 0, 100));
    var detected = detectScore >= masterThr && !hardGateBlocked;

    var verdictReason;
    if (detected) {
      verdictReason = (isFastLive ? 'LIVE HIT' : 'DETECTED') + ' (' + detectScore + '% >= ' + Math.round(masterThr) + '%)';
    } else if (hardFailedIds.length > 0) {
      var names = hardFailedIds.slice(0, 3).map(function (fid) {
        return CRITERIA_BY_ID[fid] ? CRITERIA_BY_ID[fid].shortLabel : fid;
      });
      verdictReason = 'Rejected by ' + names.join(', ') + (hardFailedIds.length > 3 ? ' +' + (hardFailedIds.length - 3) : '');
    } else {
      verdictReason = 'Below Pass Score (' + detectScore + '% < ' + Math.round(masterThr) + '%)';
    }

    var bgEval = null;
    var bgRejected = false;
    if (bgProfile && bgProfile.active && cfg.useBgControl !== false) {
      bgEval = evaluateAgainstBackground(telemetry, bgProfile);
      if (bgEval && bgEval.isBackgroundMatch) {
        bgRejected = true;
        detected = false;
        detectScore = Math.min(detectScore, Math.max(8, Math.round(masterThr) - 12));
        verdictReason =
          'Blocked by Room Control (' +
          Math.round(bgEval.bgSimilarity * 100) +
          '% BG match, ' +
          (bgEval.excessCoreDb >= 0 ? '+' : '') +
          bgEval.excessCoreDb.toFixed(1) +
          ' dB core)';
      }
    }

    var authEval = evaluateAuthenticity(telemetry, cfg);
    var authBridgeRejected = false;
    if (cfg.bridgeAuthToSentry && !isFastLive && !bgRejected && detected && authEval && authEval.isRealOrganic === false) {
      authBridgeRejected = true;
      detected = false;
      detectScore = Math.min(detectScore, Math.max(10, Math.round(masterThr) - 6));
      verdictReason = 'Post-Capture Anti-Mouth Reject (' + authEval.score + '% < ' + Math.round(authEval.threshold) + '%)';
    }

    return {
      detectScore: detectScore,
      authenticityScore: authEval && authEval.score != null ? authEval.score : safeNum(telemetry.authenticityScore, 50),
      authEval: authEval,
      detected: detected,
      hardGateBlocked: hardGateBlocked,
      bgRejected: bgRejected,
      authBridgeRejected: authBridgeRejected,
      bgEval: bgEval,
      failCount: failCount,
      failingIds: failingIds,
      verdictReason: verdictReason,
      criteriaResults: criteriaResults
    };
  }

  function buildBgRefMap(bgProfile) {
    if (!bgProfile || !bgProfile.active) return {};
    return {
      b1Min: bgProfile.b1P90,
      b2Max: bgProfile.b2P90,
      b3Max: bgProfile.b3P90,
      sub55Max: bgProfile.sub55P90,
      zcrMax: bgProfile.zcrP90,
      rolloff85Max: bgProfile.rolloff85P90,
      flatnessMin: bgProfile.flatnessMean,
      rmsNoiseMul: 1.6
    };
  }

  function computeSingleCutoffForDef(def, val, opts) {
    opts = opts || {};
    var margin = clamp(safeNum(opts.margin, 0.22), 0.08, 0.40);
    var bgRefMap = opts.bgRefMap || buildBgRefMap(opts.bgProfile);
    var noiseItems = Array.isArray(opts.noiseItems)
      ? opts.noiseItems.filter(function (x) { return x && x.telemetry && x.telemetry.metrics; })
      : [];

    var span = Math.max(1e-4, def.max - def.min);
    var bgVals = [];
    if (typeof bgRefMap[def.id] === 'number' && Number.isFinite(bgRefMap[def.id])) {
      bgVals.push(bgRefMap[def.id]);
    }
    if (noiseItems.length > 0) {
      var nArr = noiseItems.map(function (ni) { return safeNum(ni.telemetry.metrics[def.id], 0); });
      var nStat = summarizeNumericArray(nArr);
      if (nStat.count > 0) bgVals.push(nStat.median);
    }
    var bgRef = null;
    if (bgVals.length > 0) {
      var sRef = summarizeNumericArray(bgVals);
      bgRef = sRef.median;
    }

    var cand;
    var pad = Math.max(def.step * 2, span * margin * 0.65);
    if (def.mode === 'min') {
      cand = val - pad;
      if (bgRef !== null && bgRef < val - def.step * 2) {
        cand = Math.max(cand, (bgRef + val) * 0.5);
      }
      cand = Math.min(cand, val - def.step);
    } else {
      cand = val + pad;
      if (bgRef !== null && bgRef > val + def.step * 2) {
        cand = Math.min(cand, (val + bgRef) * 0.5);
      }
      cand = Math.max(cand, val + def.step);
    }

    var rounded = def.step ? (def.min + Math.round((cand - def.min) / def.step) * def.step) : cand;
    return Number(clamp(rounded, def.min, def.max).toFixed(3));
  }

  function calibrateSingleCriterion(defId, targetVal, currentConfig, opts) {
    opts = opts || {};
    var def = CRITERIA_BY_ID[defId];
    var nextCfg = currentConfig ? JSON.parse(JSON.stringify(currentConfig)) : createDefaultConfig('sentry_v3');
    if (!def) {
      return { config: nextCfg, threshold: null };
    }
    var val = safeNum(targetVal, def.defaultThreshold);
    var nextThr = computeSingleCutoffForDef(def, val, opts);
    var cCfg = nextCfg.criteria[def.id] || {
      threshold: def.defaultThreshold,
      weight: def.defaultWeight,
      enabled: def.defaultEnabled
    };
    cCfg.threshold = nextThr;
    cCfg.enabled = true;
    if (!(safeNum(cCfg.weight, 0) > 0)) {
      cCfg.weight = def.defaultWeight > 0 ? def.defaultWeight : 1.0;
    }
    nextCfg.criteria[def.id] = cCfg;
    nextCfg.preset = 'custom';
    return {
      config: nextCfg,
      threshold: nextThr
    };
  }

  function calibrateLimitsFromTarget(targetTelemetry, currentConfig, opts) {
    opts = opts || {};
    var nextCfg = currentConfig ? JSON.parse(JSON.stringify(currentConfig)) : createDefaultConfig('sentry_v3');
    nextCfg.preset = 'custom';
    nextCfg.hardGateMode = true;

    if (!targetTelemetry || !targetTelemetry.metrics) {
      return { config: nextCfg, changedCount: 0, targetEval: null, summaryText: 'No analyzed fart telemetry available.' };
    }

    var margin = clamp(safeNum(opts.margin, 0.22), 0.08, 0.40);
    var bg = opts.bgProfile && opts.bgProfile.active ? opts.bgProfile : null;
    var noiseItems = Array.isArray(opts.noiseItems)
      ? opts.noiseItems.filter(function (x) { return x && x.telemetry && x.telemetry.metrics; })
      : [];
    var bgRefMap = buildBgRefMap(bg);

    var coreEnableIds = {
      rmsNoiseMul: true,
      minActiveMs: true,
      sub55Max: true,
      triggerConsecFrames: true,
      protoAffMin: true,
      b1Min: true,
      b2Max: true,
      b3Max: true,
      crestMax: true,
      zcrMax: true,
      flatnessMin: true,
      rolloff85Max: true
    };

    var changedCount = 0;
    for (var i = 0; i < CRITERIA_DEFS.length; i++) {
      var def = CRITERIA_DEFS[i];
      var cCfg = nextCfg.criteria[def.id] || {
        threshold: def.defaultThreshold,
        weight: def.defaultWeight,
        enabled: def.defaultEnabled
      };
      var val = safeNum(targetTelemetry.metrics[def.id], def.defaultThreshold);
      var nextThr = computeSingleCutoffForDef(def, val, {
        margin: margin,
        bgRefMap: bgRefMap,
        noiseItems: noiseItems
      });
      if (Math.abs(nextThr - safeNum(cCfg.threshold, def.defaultThreshold)) > 1e-6) {
        changedCount++;
      }
      cCfg.threshold = nextThr;

      if (coreEnableIds[def.id]) {
        cCfg.enabled = true;
      } else {
        // Stage-3 anti-mouth gates: enable only if this target fart comfortably clears its own locked threshold
        cCfg.enabled = def.mode === 'min' ? val >= nextThr + def.step : val <= nextThr - def.step;
      }
      nextCfg.criteria[def.id] = cCfg;
    }

    var preEval = evaluateTelemetry(targetTelemetry, nextCfg, null);
    nextCfg.masterThreshold = Math.round(clamp(Math.min(62, Math.max(46, preEval.detectScore - 10)), 40, 75));

    var targetEval = evaluateTelemetry(targetTelemetry, nextCfg, bg);
    var summaryText =
      'Locked ' +
      changedCount +
      ' limits to active sound (' +
      Math.round(targetEval.detectScore) +
      '% score, Thresh ' +
      nextCfg.masterThreshold +
      '%' +
      (bg ? ' + Room Control' : '') +
      ').';

    return {
      config: nextCfg,
      changedCount: changedCount,
      targetEval: targetEval,
      summaryText: summaryText
    };
  }

  function summarizeNumericArray(arr) {
    if (!arr || arr.length === 0) {
      return { count: 0, min: null, p10: null, median: null, mean: null, p90: null, max: null, std: 0 };
    }
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var n = sorted.length;
    var sum = 0;
    for (var i = 0; i < n; i++) sum += sorted[i];
    var mean = sum / n;
    var varSum = 0;
    for (var j = 0; j < n; j++) {
      var d = sorted[j] - mean;
      varSum += d * d;
    }
    var std = n > 1 ? Math.sqrt(varSum / (n - 1)) : 0;
    function q(p) {
      var pos = p * (n - 1);
      var lo = Math.floor(pos);
      var hi = Math.min(n - 1, lo + 1);
      var frac = pos - lo;
      return sorted[lo] * (1 - frac) + sorted[hi] * frac;
    }
    return {
      count: n,
      min: sorted[0],
      p10: q(0.10),
      median: q(0.50),
      mean: mean,
      p90: q(0.90),
      max: sorted[n - 1],
      std: std
    };
  }

  function computeCohortStats(items, config) {
    var list = Array.isArray(items) ? items.filter(function (x) { return x && x.telemetry && x.telemetry.metrics; }) : [];
    var tp = 0;
    var fn = 0;
    var tn = 0;
    var fp = 0;
    var realCount = 0;
    var fakeCount = 0;
    var noiseCount = 0;

    var perItem = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var lbl = it.label === 'fake' || it.label === 'noise' ? it.label : 'real';
      var ev = evaluateTelemetry(it.telemetry, config);
      perItem.push({ item: it, evalRes: ev, label: lbl });
      if (lbl === 'real') {
        realCount++;
        if (ev.detected) tp++;
        else fn++;
      } else {
        if (lbl === 'fake') fakeCount++;
        else noiseCount++;
        if (ev.detected) fp++;
        else tn++;
      }
    }

    var nonRealCount = fakeCount + noiseCount;
    var recallPct = realCount > 0 ? Math.round((tp / realCount) * 100) : null;
    var specificityPct = nonRealCount > 0 ? Math.round((tn / nonRealCount) * 100) : null;
    var accuracyPct = list.length > 0 ? Math.round(((tp + tn) / list.length) * 100) : null;
    var f1Den = 2 * tp + fp + fn;
    var f1Pct = f1Den > 0 ? Math.round(((2 * tp) / f1Den) * 100) : null;

    var criteriaStats = CRITERIA_DEFS.map(function (def) {
      var allVals = [];
      var realVals = [];
      var nonRealVals = [];
      var passReal = 0;
      var passNonReal = 0;
      var cCfg = (config && config.criteria && config.criteria[def.id]) || { threshold: def.defaultThreshold };
      var thr = safeNum(cCfg.threshold, def.defaultThreshold);

      for (var k = 0; k < list.length; k++) {
        var it = list[k];
        var v = safeNum(it.telemetry.metrics[def.id], 0);
        var ok = def.mode === 'min' ? v >= thr : v <= thr;
        allVals.push(v);
        if (it.label === 'fake' || it.label === 'noise') {
          nonRealVals.push(v);
          if (ok) passNonReal++;
        } else {
          realVals.push(v);
          if (ok) passReal++;
        }
      }

      var sAll = summarizeNumericArray(allVals);
      var sReal = summarizeNumericArray(realVals);
      var sNonReal = summarizeNumericArray(nonRealVals);
      var cohensD = null;
      if (sReal.count >= 2 && sNonReal.count >= 2) {
        var pooled = Math.sqrt(
          ((sReal.count - 1) * sReal.std * sReal.std + (sNonReal.count - 1) * sNonReal.std * sNonReal.std) /
          Math.max(1, sReal.count + sNonReal.count - 2)
        );
        if (pooled > 1e-6) {
          var rawDiff = def.mode === 'min' ? (sReal.mean - sNonReal.mean) : (sNonReal.mean - sReal.mean);
          cohensD = Number((rawDiff / pooled).toFixed(2));
        } else {
          cohensD = 0;
        }
      }

      return {
        id: def.id,
        def: def,
        threshold: thr,
        all: sAll,
        real: sReal,
        nonReal: sNonReal,
        passRateReal: realVals.length > 0 ? Math.round((passReal / realVals.length) * 100) : null,
        passRateNonReal: nonRealVals.length > 0 ? Math.round((passNonReal / nonRealVals.length) * 100) : null,
        cohensD: cohensD
      };
    });

    return {
      totalCount: list.length,
      realCount: realCount,
      fakeCount: fakeCount,
      noiseCount: noiseCount,
      nonRealCount: nonRealCount,
      tp: tp,
      fn: fn,
      tn: tn,
      fp: fp,
      recallPct: recallPct,
      specificityPct: specificityPct,
      accuracyPct: accuracyPct,
      f1Pct: f1Pct,
      perItem: perItem,
      criteriaStats: criteriaStats
    };
  }

  function suggestOptimalThresholds(items, currentConfig) {
    var base = currentConfig ? JSON.parse(JSON.stringify(currentConfig)) : createDefaultConfig('balanced_hybrid');
    var list = Array.isArray(items) ? items.filter(function (x) { return x && x.telemetry && x.telemetry.metrics; }) : [];
    var reals = list.filter(function (x) { return x.label !== 'fake' && x.label !== 'noise'; });
    var nonReals = list.filter(function (x) { return x.label === 'fake' || x.label === 'noise'; });

    var summary = {
      usedTwoClass: reals.length >= 2 && nonReals.length >= 2,
      realCount: reals.length,
      nonRealCount: nonReals.length,
      updatedCriteria: []
    };

    if (reals.length < 2) {
      return { config: base, summary: summary };
    }

    var roundPrecision = function (val, step) {
      if (!step) return val;
      return Math.round(val / step) * step;
    };

    for (var i = 0; i < CRITERIA_DEFS.length; i++) {
      var def = CRITERIA_DEFS[i];
      var rVals = reals.map(function (x) { return safeNum(x.telemetry.metrics[def.id], 0); });
      var rStat = summarizeNumericArray(rVals);
      var cCfg = base.criteria[def.id] || { threshold: def.defaultThreshold, weight: def.defaultWeight, enabled: true };

      if (summary.usedTwoClass) {
        var nVals = nonReals.map(function (x) { return safeNum(x.telemetry.metrics[def.id], 0); });
        var nStat = summarizeNumericArray(nVals);
        var lo = Math.max(def.min, Math.min(rStat.min, nStat.min));
        var hi = Math.min(def.max, Math.max(rStat.max, nStat.max));
        var bestThr = def.defaultThreshold;
        var bestJ = -Infinity;
        var midTarget = (rStat.median + nStat.median) / 2;

        for (var stepIdx = 0; stepIdx <= 40; stepIdx++) {
          var cand = lo + ((hi - lo) * stepIdx) / 40;
          var tpC = 0;
          var fpC = 0;
          for (var a = 0; a < rVals.length; a++) {
            if (def.mode === 'min' ? rVals[a] >= cand : rVals[a] <= cand) tpC++;
          }
          for (var b = 0; b < nVals.length; b++) {
            if (def.mode === 'min' ? nVals[b] >= cand : nVals[b] <= cand) fpC++;
          }
          var tpr = tpC / rVals.length;
          var fpr = fpC / nVals.length;
          var jScore = tpr - fpr;
          if (jScore > bestJ + 1e-6 || (Math.abs(jScore - bestJ) <= 1e-6 && Math.abs(cand - midTarget) < Math.abs(bestThr - midTarget))) {
            bestJ = jScore;
            bestThr = cand;
          }
        }
        bestThr = clamp(roundPrecision(bestThr, def.step), def.min, def.max);
        cCfg.threshold = Number(bestThr.toFixed(3));
        cCfg.enabled = bestJ > 0.12;
        if (bestJ > 0.35) cCfg.weight = Number(clamp(1.0 + bestJ * 1.4, 0.8, 2.8).toFixed(1));
        summary.updatedCriteria.push({ id: def.id, threshold: cCfg.threshold, youdenJ: Number(bestJ.toFixed(2)) });
      } else {
        // Only Real samples available: calibrate around 10th-90th percentile coverage envelope
        var target = def.mode === 'min' ? rStat.p10 * 0.92 : rStat.p90 * 1.08;
        var snapped = clamp(roundPrecision(target, def.step), def.min, def.max);
        cCfg.threshold = Number(snapped.toFixed(3));
        summary.updatedCriteria.push({ id: def.id, threshold: cCfg.threshold, youdenJ: null });
      }
      base.criteria[def.id] = cCfg;
    }

    return { config: base, summary: summary };
  }

  function resampleArrayLinear(arr, outLen) {
    var out = new Float32Array(outLen);
    if (!arr || arr.length === 0 || outLen <= 0) return out;
    if (arr.length === 1) {
      for (var k = 0; k < outLen; k++) out[k] = safeNum(arr[0], 0);
      return out;
    }
    for (var i = 0; i < outLen; i++) {
      var pos = (i / Math.max(1, outLen - 1)) * (arr.length - 1);
      var lo = Math.floor(pos);
      var hi = Math.min(arr.length - 1, lo + 1);
      var frac = pos - lo;
      out[i] = safeNum(arr[lo], 0) * (1 - frac) + safeNum(arr[hi], 0) * frac;
    }
    return out;
  }

  function buildGroupCompositeSpecimen(items, opts) {
    opts = opts || {};
    var list = Array.isArray(items)
      ? items.filter(function (x) { return x && x.telemetry && x.telemetry.metrics; })
      : [];
    if (list.length === 0) return null;

    var config = opts.config || null;
    var metrics = {};
    var metricRanges = {};
    for (var ci = 0; ci < CRITERIA_DEFS.length; ci++) {
      var def = CRITERIA_DEFS[ci];
      var vals = [];
      for (var k = 0; k < list.length; k++) {
        vals.push(safeNum(list[k].telemetry.metrics[def.id], 0));
      }
      var st = summarizeNumericArray(vals);
      metrics[def.id] = st.count > 0 ? safeNum(st.median, 0) : def.defaultThreshold;
      metricRanges[def.id] = st;
    }

    function medScalar(fn, fmtRangeFn) {
      var arr = [];
      for (var i = 0; i < list.length; i++) {
        var v = fn(list[i].telemetry);
        if (typeof v === 'number' && Number.isFinite(v)) arr.push(v);
      }
      var s = summarizeNumericArray(arr);
      return {
        median: s.count > 0 ? safeNum(s.median, 0) : 0,
        rangeStr: fmtRangeFn && s.count >= 2 ? fmtRangeFn(s.p10) + '–' + fmtRangeFn(s.p90) : ''
      };
    }

    var durS = medScalar(function (t) { return t.durationSec; }, function (v) { return v.toFixed(2) + 's'; });
    var peakS = medScalar(function (t) { return t.dominantPeakHz; }, function (v) { return Math.round(v) + ' Hz'; });
    var rmsS = medScalar(function (t) { return t.rmsDb; }, function (v) { return v.toFixed(1) + ' dB'; });
    var pDbS = medScalar(function (t) { return t.peakDb; });
    var authS = medScalar(function (t) { return t.authenticityScore; });
    var centS = medScalar(function (t) { return t.autopsy && t.autopsy.spectralCentroidHz; }, function (v) { return Math.round(v) + ' Hz'; });
    var burstS = medScalar(function (t) { return t.autopsy && t.autopsy.burstCount; }, function (v) { return v.toFixed(1); });
    var modRateS = medScalar(function (t) { return t.autopsy && t.autopsy.modRateHz; }, function (v) { return v.toFixed(1) + ' Hz'; });
    var modDepthS = medScalar(function (t) { return t.autopsy && t.autopsy.modDepth; });
    var attS = medScalar(function (t) { return t.autopsy && t.autopsy.attackSec; });
    var decS = medScalar(function (t) { return t.autopsy && t.autopsy.decaySec; });
    var t10S = medScalar(function (t) { return t.autopsy && t.autopsy.t10Ratio; });
    var t90S = medScalar(function (t) { return t.autopsy && t.autopsy.t90Ratio; });
    var voicedS = medScalar(function (t) { return t.autopsy && t.autopsy.voicedRatio; }, function (v) { return Math.round(v * 100) + '%'; });
    var lipS = medScalar(function (t) { return t.autopsy && t.autopsy.lipTrillPeakHz; });

    // Composite 64-bin FFT spectrum + P10-P90 spread
    var specMean = new Float32Array(64);
    var specP10 = new Float32Array(64);
    var specP90 = new Float32Array(64);
    var specCenters = null;
    for (var sIdx = 0; sIdx < list.length; sIdx++) {
      if (list[sIdx].telemetry.spectrumCenters) {
        specCenters = list[sIdx].telemetry.spectrumCenters;
        break;
      }
    }
    for (var bi = 0; bi < 64; bi++) {
      var bVals = [];
      for (var mi = 0; mi < list.length; mi++) {
        var sb = list[mi].telemetry.spectrumBins;
        if (sb && bi < sb.length) bVals.push(safeNum(sb[bi], 0));
      }
      var bs = summarizeNumericArray(bVals);
      specMean[bi] = bs.count > 0 ? clamp(safeNum(bs.mean, 0), 0, 1) : 0;
      specP10[bi] = bs.count > 0 ? clamp(safeNum(bs.p10, 0), 0, 1) : 0;
      specP90[bi] = bs.count > 0 ? clamp(safeNum(bs.p90, 0), 0, 1) : 0;
    }

    // Composite peak-normalized envelope + P10-P90 spread (64 bins)
    var normEnvs = [];
    for (var ei = 0; ei < list.length; ei++) {
      var rawEnv = list[ei].telemetry.autopsy && list[ei].telemetry.autopsy.envelope;
      if (!rawEnv || rawEnv.length === 0) continue;
      var pk = 0.0001;
      for (var ep = 0; ep < rawEnv.length; ep++) {
        if (rawEnv[ep] > pk) pk = rawEnv[ep];
      }
      var res = resampleArrayLinear(rawEnv, 64);
      for (var rk = 0; rk < 64; rk++) res[rk] = clamp(res[rk] / pk, 0, 1);
      normEnvs.push(res);
    }
    var envMean = new Float32Array(64);
    var envP10 = new Float32Array(64);
    var envP90 = new Float32Array(64);
    for (var eb = 0; eb < 64; eb++) {
      var evs = [];
      for (var ne = 0; ne < normEnvs.length; ne++) evs.push(normEnvs[ne][eb]);
      var es = summarizeNumericArray(evs);
      envMean[eb] = es.count > 0 ? clamp(safeNum(es.mean, 0), 0, 1) : 0;
      envP10[eb] = es.count > 0 ? clamp(safeNum(es.p10, 0), 0, 1) : 0;
      envP90[eb] = es.count > 0 ? clamp(safeNum(es.p90, 0), 0, 1) : 0;
    }

    // Composite spectrogram (48 frames x 40 bands)
    var compFrames = 48;
    var compBands = 40;
    var compGrid = new Float32Array(compFrames * compBands);
    var specContributors = 0;
    var compFreqCenters = null;
    for (var gi = 0; gi < list.length; gi++) {
      var sp = list[gi].telemetry.autopsy && list[gi].telemetry.autopsy.spectrogram;
      var nF = sp ? Number(sp.frames || 0) : 0;
      var nB = sp ? Number(sp.freqBands || sp.bands || 0) : 0;
      if (!sp || !sp.grid || nF <= 0 || nB <= 0) continue;
      if (!compFreqCenters && sp.freqCenters) compFreqCenters = sp.freqCenters;
      specContributors++;
      for (var fOut = 0; fOut < compFrames; fOut++) {
        var fPos = nF === 1 ? 0 : (fOut / (compFrames - 1)) * (nF - 1);
        var fLo = Math.floor(fPos);
        var fHi = Math.min(nF - 1, fLo + 1);
        var ff = fPos - fLo;
        for (var bOut = 0; bOut < compBands; bOut++) {
          var bPos = nB === 1 ? 0 : (bOut / (compBands - 1)) * (nB - 1);
          var bLo = Math.floor(bPos);
          var bHi = Math.min(nB - 1, bLo + 1);
          var bf = bPos - bLo;
          var v00 = safeNum(sp.grid[fLo * nB + bLo], 0);
          var v10 = safeNum(sp.grid[fHi * nB + bLo], 0);
          var v01 = safeNum(sp.grid[fLo * nB + bHi], 0);
          var v11 = safeNum(sp.grid[fHi * nB + bHi], 0);
          var interp = (v00 * (1 - ff) + v10 * ff) * (1 - bf) + (v01 * (1 - ff) + v11 * ff) * bf;
          compGrid[fOut * compBands + bOut] += interp;
        }
      }
    }
    if (specContributors > 0) {
      for (var cIdx = 0; cIdx < compGrid.length; cIdx++) {
        compGrid[cIdx] = clamp(compGrid[cIdx] / specContributors, 0, 1);
      }
    }

    // Composite pitch contour (48 normalized time steps) & modulation spectrum (42 bins)
    var compPitch = new Array(48);
    var pitchContributors = 0;
    for (var pi = 0; pi < list.length; pi++) {
      var pa = list[pi].telemetry.autopsy && list[pi].telemetry.autopsy.pitchHzArr;
      if (pa && pa.length > 0) pitchContributors++;
    }
    for (var pt = 0; pt < 48; pt++) {
      var voiced = [];
      for (var pm = 0; pm < list.length; pm++) {
        var pArr = list[pm].telemetry.autopsy && list[pm].telemetry.autopsy.pitchHzArr;
        if (!pArr || pArr.length === 0) continue;
        var idxP = Math.round((pt / 47) * (pArr.length - 1));
        var hz = safeNum(pArr[idxP], 0);
        if (hz > 25) voiced.push(hz);
      }
      if (pitchContributors > 0 && voiced.length >= Math.max(1, Math.ceil(pitchContributors * 0.25))) {
        voiced.sort(function (a, b) { return a - b; });
        compPitch[pt] = voiced[Math.floor(voiced.length / 2)];
      } else {
        compPitch[pt] = 0;
      }
    }

    var compMod = new Float32Array(42);
    var modContributors = 0;
    for (var moi = 0; moi < list.length; moi++) {
      var ma = list[moi].telemetry.autopsy && list[moi].telemetry.autopsy.modSpectrum;
      if (!ma || ma.length < 2) continue;
      modContributors++;
      var mMax = 0.01;
      for (var mm = 0; mm < ma.length; mm++) if (ma[mm] > mMax) mMax = ma[mm];
      var mRes = resampleArrayLinear(ma, 42);
      for (var mk = 0; mk < 42; mk++) compMod[mk] += clamp(mRes[mk] / mMax, 0, 1);
    }
    if (modContributors > 0) {
      for (var mu = 0; mu < 42; mu++) compMod[mu] /= modContributors;
    }

    // Closest member to group prototype/pitch median for representative audio playback
    var repItem = list[0];
    var bestDist = Infinity;
    var medProto = safeNum(metrics.protoAffMin, 0.5);
    var medHz = safeNum(peakS.median, 220);
    for (var ri = 0; ri < list.length; ri++) {
      var it = list[ri];
      var dP = (safeNum(it.telemetry.metrics.protoAffMin, 0.5) - medProto) * 4;
      var dHz = (safeNum(it.telemetry.dominantPeakHz, medHz) - medHz) / 300;
      var dist = dP * dP + dHz * dHz;
      if (dist < bestDist) {
        bestDist = dist;
        repItem = it;
      }
    }

    var detectedCount = 0;
    if (config) {
      for (var di = 0; di < list.length; di++) {
        if (evaluateTelemetry(list[di].telemetry, config).detected) detectedCount++;
      }
    }

    var dspClass = null;
    if (repItem && repItem.telemetry && repItem.telemetry.dspClass) {
      dspClass = repItem.telemetry.dspClass;
    }

    return {
      id: opts.id || '__group__',
      name: opts.name || ('Group Avg (' + list.length + ')'),
      label: opts.label || 'real',
      source: 'Group Average (' + list.length + ' clips)',
      isGroup: true,
      groupCount: list.length,
      memberIds: list.map(function (m) { return m.id; }),
      representativeId: repItem ? repItem.id : null,
      detectedCount: detectedCount,
      durationSec: Number(durS.median.toFixed(3)),
      decoded: true,
      telemetry: {
        metrics: metrics,
        metricRanges: metricRanges,
        scalarRanges: {
          dominantPeakHz: peakS.rangeStr,
          spectralCentroidHz: centS.rangeStr,
          rmsDb: rmsS.rangeStr,
          burstCount: burstS.rangeStr,
          modRateHz: modRateS.rangeStr,
          voicedRatio: voicedS.rangeStr
        },
        durationSec: Number(durS.median.toFixed(3)),
        sampleRate: 44100,
        rmsDb: Number(rmsS.median.toFixed(1)),
        peakDb: Number(pDbS.median.toFixed(1)),
        dominantPeakHz: Math.round(peakS.median),
        authenticityScore: Math.round(authS.median),
        dspClass: dspClass,
        spectrumBins: specMean,
        spectrumP10: specP10,
        spectrumP90: specP90,
        spectrumCenters: specCenters,
        autopsy: {
          envelope: envMean,
          envelopeP10: envP10,
          envelopeP90: envP90,
          spectrogram: specContributors > 0 ? {
            frames: compFrames,
            freqBands: compBands,
            grid: compGrid,
            freqCenters: compFreqCenters
          } : null,
          pitchHzArr: compPitch,
          modSpectrum: compMod,
          modRateHz: Number(modRateS.median.toFixed(1)),
          modDepth: modDepthS.median,
          burstCount: Math.max(1, Math.round(burstS.median)),
          attackSec: attS.median,
          decaySec: decS.median,
          t10Ratio: t10S.median,
          t90Ratio: t90S.median,
          spectralCentroidHz: Math.round(centS.median),
          voicedRatio: voicedS.median,
          lipTrillPeakHz: lipS.median
        }
      }
    };
  }

  function buildMetricCallout(id, valA, valB, normDiff, unitLabel, nameA, nameB) {
    if (Math.abs(normDiff) < 0.06) return 'Comparable';
    var sA = nameA || 'A';
    var sB = nameB || 'B';
    var bHigher = valB > valA;
    var delta = valB - valA;
    var sign = delta > 0 ? '+' : '';
    var cues = {
      rolloff85Max: bHigher
        ? sB + ' brighter (' + sign + Math.round(delta) + ' Hz) — less damping'
        : sA + ' warmer / deeper (' + Math.round(Math.abs(delta)) + ' Hz lower)',
      lipTrillMax: bHigher
        ? 'Stronger 22–42 Hz lip-buzz in ' + sB
        : 'Stronger 22–42 Hz modulation in ' + sA,
      formantRatioMax: bHigher
        ? 'Stronger vowel F1/F2 formants in ' + sB
        : 'Stronger mid-formants in ' + sA,
      preBreathMax: bHigher
        ? 'More pre-onset/edge breath in ' + sB
        : 'More edge air breathiness in ' + sA,
      protoAffMin: bHigher
        ? sB + ' closer to 47-fart centroids'
        : sA + ' closer to 47-fart centroids',
      b1Min: bHigher
        ? 'More low chamber core in ' + sB
        : 'Stronger sub-750 Hz chamber core in ' + sA,
      b2Max: bHigher
        ? 'More 750–2.6k formant mid energy in ' + sB
        : 'More mid-band energy in ' + sA,
      b3Max: bHigher
        ? 'More >2.6 kHz high air/hiss in ' + sB
        : 'More >2.6 kHz air in ' + sA,
      pitchJitterMin: bHigher
        ? 'More organic pitch chaos in ' + sB
        : sA + ' has rougher pitch wobble; ' + sB + ' steadier',
      zcrMax: bHigher
        ? 'Higher fricative/crossing rate in ' + sB
        : 'Higher crossing rate in ' + sA,
      voicedRatio: bHigher
        ? sB + ' more tonal / vocalized'
        : sA + ' more broadband / less vocalized',
      modRateHz: bHigher
        ? 'Faster modulation flutter in ' + sB
        : 'Faster modulation flutter in ' + sA
    };
    if (cues[id]) return cues[id];
    var absD = Math.abs(delta);
    var absStr = absD >= 10 ? Math.round(absD) : absD.toFixed(2);
    return (bHigher ? sB + ' higher (+' : sA + ' higher (+') + absStr + (unitLabel ? ' ' + unitLabel : '') + ')';
  }

  function computeAutopsyDiff(itemA, itemB, config) {
    var telA = itemA && itemA.telemetry ? itemA.telemetry : null;
    var telB = itemB && itemB.telemetry ? itemB.telemetry : null;
    var labelA = itemA ? (itemA.name || 'Specimen A') : 'Specimen A';
    var labelB = itemB ? (itemB.name || 'Specimen B') : 'Specimen B';
    if (!telA || !telB) {
      return {
        ready: false,
        labelA: labelA,
        labelB: labelB,
        isGroupA: Boolean(itemA && itemA.isGroup),
        isGroupB: Boolean(itemB && itemB.isGroup),
        rows: [],
        topDifferences: [],
        spectrumDelta: new Float32Array(64),
        evalA: telA ? evaluateTelemetry(telA, config) : null,
        evalB: telB ? evaluateTelemetry(telB, config) : null
      };
    }

    var evalA = evaluateTelemetry(telA, config);
    var evalB = evaluateTelemetry(telB, config);
    var auA = telA.autopsy || {};
    var auB = telB.autopsy || {};
    var sideA = itemA.isGroup ? (itemA.label === 'fake' ? 'Decoys' : 'Real Avg') : 'A';
    var sideB = itemB.isGroup ? (itemB.label === 'fake' ? 'Decoys' : 'Real Avg') : 'B';
    if (sideA === sideB) {
      sideA = 'A';
      sideB = 'B';
    }

    var rows = [];
    function pushSummaryRow(id, label, shortLabel, valA, valB, span, fmtFn, passA, passB, unitLbl, rangeA, rangeB) {
      var a = safeNum(valA, 0);
      var b = safeNum(valB, 0);
      var normDiff = clamp((b - a) / Math.max(1e-4, span), -1, 1);
      rows.push({
        id: id,
        label: label,
        shortLabel: shortLabel,
        valA: a,
        fmtA: fmtFn(a),
        rangeA: rangeA || '',
        passA: passA,
        valB: b,
        fmtB: fmtFn(b),
        rangeB: rangeB || '',
        passB: passB,
        normDiff: normDiff,
        absNormDiff: Math.abs(normDiff),
        isTopDiff: false,
        callout: buildMetricCallout(id, a, b, normDiff, unitLbl, sideA, sideB)
      });
    }

    var srA = telA.scalarRanges || {};
    var srB = telB.scalarRanges || {};
    pushSummaryRow('detectScore', 'Auto-Detect Score', 'Detect%', evalA.detectScore, evalB.detectScore, 60, function (v) { return Math.round(v) + '%'; }, evalA.detected, evalB.detected, '%');
    pushSummaryRow('authenticityScore', 'Authenticity Index', 'Auth%', evalA.authenticityScore, evalB.authenticityScore, 60, function (v) { return Math.round(v) + '%'; }, evalA.authenticityScore >= 50, evalB.authenticityScore >= 50, '%');
    pushSummaryRow('dominantPeakHz', 'Dominant Peak Frequency', 'Peak Hz', telA.dominantPeakHz || 180, telB.dominantPeakHz || 180, 700, function (v) { return Math.round(v) + ' Hz'; }, null, null, 'Hz', srA.dominantPeakHz, srB.dominantPeakHz);
    pushSummaryRow('spectralCentroidHz', 'Spectral Centroid', 'Centroid', auA.spectralCentroidHz || 250, auB.spectralCentroidHz || 250, 900, function (v) { return Math.round(v) + ' Hz'; }, null, null, 'Hz', srA.spectralCentroidHz, srB.spectralCentroidHz);
    pushSummaryRow('rmsDb', 'RMS Loudness Level', 'RMS dB', telA.rmsDb != null ? telA.rmsDb : -24, telB.rmsDb != null ? telB.rmsDb : -24, 18, function (v) { return v.toFixed(1) + ' dB'; }, null, null, 'dB', srA.rmsDb, srB.rmsDb);
    pushSummaryRow('burstCount', 'Burst / Impulse Count', 'Bursts', auA.burstCount || 1, auB.burstCount || 1, 5, function (v) { return String(Math.round(v)); }, null, null, '', srA.burstCount, srB.burstCount);
    pushSummaryRow('modRateHz', 'Flutter Modulation Rate', 'Mod Hz', auA.modRateHz || 0, auB.modRateHz || 0, 22, function (v) { return v.toFixed(1) + ' Hz'; }, null, null, 'Hz', srA.modRateHz, srB.modRateHz);
    pushSummaryRow('voicedRatio', 'Harmonic Voiced Ratio', 'Voiced', auA.voicedRatio || 0, auB.voicedRatio || 0, 0.7, function (v) { return Math.round(v * 100) + '%'; }, null, null, '', srA.voicedRatio, srB.voicedRatio);

    for (var i = 0; i < CRITERIA_DEFS.length; i++) {
      var def = CRITERIA_DEFS[i];
      var cCfg = (config && config.criteria && config.criteria[def.id]) || { threshold: def.defaultThreshold, enabled: def.defaultEnabled };
      var a = safeNum(telA.metrics[def.id], 0);
      var b = safeNum(telB.metrics[def.id], 0);
      var thr = safeNum(cCfg.threshold, def.defaultThreshold);
      var pA = def.mode === 'min' ? a >= thr : a <= thr;
      var pB = def.mode === 'min' ? b >= thr : b <= thr;
      var span = Math.max(1e-4, (def.max - def.min) * 0.65);
      var normDiff = clamp((b - a) / span, -1, 1);
      var rObjA = telA.metricRanges && telA.metricRanges[def.id];
      var rObjB = telB.metricRanges && telB.metricRanges[def.id];
      rows.push({
        id: def.id,
        label: def.label,
        shortLabel: def.shortLabel,
        valA: a,
        fmtA: def.format(a),
        rangeA: rObjA && rObjA.count >= 2 ? def.format(rObjA.p10) + '–' + def.format(rObjA.p90) : '',
        passA: pA,
        valB: b,
        fmtB: def.format(b),
        rangeB: rObjB && rObjB.count >= 2 ? def.format(rObjB.p10) + '–' + def.format(rObjB.p90) : '',
        passB: pB,
        normDiff: normDiff,
        absNormDiff: Math.abs(normDiff),
        isTopDiff: false,
        callout: buildMetricCallout(def.id, a, b, normDiff, def.unit === 'ratio' || def.unit === 'score' ? '' : def.unit, sideA, sideB)
      });
    }

    var sortedForFindings = rows
      .filter(function (r) { return r.id !== 'detectScore' && r.id !== 'authenticityScore' && r.absNormDiff > 0.04; })
      .slice()
      .sort(function (x, y) { return y.absNormDiff - x.absNormDiff; });

    for (var ti = 0; ti < Math.min(3, sortedForFindings.length); ti++) {
      sortedForFindings[ti].isTopDiff = true;
    }

    var topDifferences = sortedForFindings.slice(0, 4).map(function (r) {
      return {
        id: r.id,
        label: r.shortLabel,
        headline: r.shortLabel + ': ' + sideA + ' ' + r.fmtA + ' vs ' + sideB + ' ' + r.fmtB,
        detail: r.callout
      };
    });

    var spectrumDelta = new Float32Array(64);
    if (telA.spectrumBins && telB.spectrumBins) {
      for (var k = 0; k < 64; k++) {
        spectrumDelta[k] = clamp(safeNum(telB.spectrumBins[k], 0) - safeNum(telA.spectrumBins[k], 0), -1, 1);
      }
    }

    return {
      ready: true,
      labelA: labelA,
      labelB: labelB,
      sideA: sideA,
      sideB: sideB,
      isGroupA: Boolean(itemA && itemA.isGroup),
      isGroupB: Boolean(itemB && itemB.isGroup),
      evalA: evalA,
      evalB: evalB,
      rows: rows,
      topDifferences: topDifferences,
      spectrumDelta: spectrumDelta
    };
  }

  function formatHzShort(hz) {
    if (!Number.isFinite(hz)) return '—';
    return hz >= 1000 ? (hz / 1000).toFixed(2).replace(/\.00$/, '') + ' kHz' : Math.round(hz) + ' Hz';
  }

  function extractContiguousBands(centers, maskArr, minBins) {
    var bands = [];
    var start = -1;
    var minRun = minBins || 2;
    for (var i = 0; i <= maskArr.length; i++) {
      var on = i < maskArr.length && Boolean(maskArr[i]);
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        var len = i - start;
        if (len >= minRun) {
          var loHz = centers[start];
          var hiHz = centers[i - 1];
          bands.push({
            startIdx: start,
            endIdx: i - 1,
            loHz: loHz,
            hiHz: hiHz,
            label: formatHzShort(loHz) + '–' + formatHzShort(hiHz)
          });
        }
        start = -1;
      }
    }
    return bands;
  }

  /**
   * Computes full-corpus 40 Hz - 6 kHz spectral spread & Hit-Rate maps across Real Farts vs. Mouth Decoys.
   */
  function computeFrequencySpreadProfile(items, opts) {
    opts = opts || {};
    var hitThreshold = clamp(safeNum(opts.hitThreshold, 0.25), 0.05, 0.85);
    var list = Array.isArray(items)
      ? items.filter(function (x) { return x && x.telemetry && x.telemetry.spectrumBins && x.telemetry.spectrumBins.length === 64; })
      : [];

    var centers = new Float32Array(64);
    for (var b = 0; b < 64; b++) {
      centers[b] = 40 * Math.pow(6000 / 40, b / 63);
    }
    if (list.length > 0 && list[0].telemetry.spectrumCenters && list[0].telemetry.spectrumCenters.length === 64) {
      centers = list[0].telemetry.spectrumCenters;
    }

    var reals = list.filter(function (x) { return x.label !== 'fake' && x.label !== 'noise'; });
    var decoys = list.filter(function (x) { return x.label === 'fake'; });
    var noises = list.filter(function (x) { return x.label === 'noise'; });

    function summarizeGroup(groupItems) {
      var n = groupItems.length;
      var p0 = new Float32Array(64);
      var p10 = new Float32Array(64);
      var med = new Float32Array(64);
      var p90 = new Float32Array(64);
      var p100 = new Float32Array(64);
      var mean = new Float32Array(64);
      var hitRate = new Float32Array(64);
      var hitCount = new Int32Array(64);
      var traces = [];
      var peakHzArr = [];
      var rolloffArr = [];

      if (n === 0) {
        return {
          count: 0,
          p0: p0,
          p10: p10,
          median: med,
          p90: p90,
          p100: p100,
          mean: mean,
          hitRate: hitRate,
          hitCount: hitCount,
          traces: traces,
          peakHz: summarizeNumericArray([]),
          rolloff85: summarizeNumericArray([])
        };
      }

      for (var i = 0; i < n; i++) {
        var tel = groupItems[i].telemetry;
        if (traces.length < 60) traces.push({ id: groupItems[i].id, name: groupItems[i].name, bins: tel.spectrumBins });
        if (typeof tel.dominantPeakHz === 'number' && tel.dominantPeakHz > 20) peakHzArr.push(tel.dominantPeakHz);
        if (tel.metrics && typeof tel.metrics.rolloff85Max === 'number') rolloffArr.push(tel.metrics.rolloff85Max);
      }

      for (var k = 0; k < 64; k++) {
        var col = new Array(n);
        var hits = 0;
        for (var j = 0; j < n; j++) {
          var v = clamp(safeNum(groupItems[j].telemetry.spectrumBins[k], 0), 0, 1);
          col[j] = v;
          if (v >= hitThreshold) hits++;
        }
        var s = summarizeNumericArray(col);
        p0[k] = safeNum(s.min, 0);
        p10[k] = safeNum(s.p10, 0);
        med[k] = safeNum(s.median, 0);
        p90[k] = safeNum(s.p90, 0);
        p100[k] = safeNum(s.max, 0);
        mean[k] = safeNum(s.mean, 0);
        hitCount[k] = hits;
        hitRate[k] = (hits / n) * 100;
      }

      return {
        count: n,
        p0: p0,
        p10: p10,
        median: med,
        p90: p90,
        p100: p100,
        mean: mean,
        hitRate: hitRate,
        hitCount: hitCount,
        traces: traces,
        peakHz: summarizeNumericArray(peakHzArr),
        rolloff85: summarizeNumericArray(rolloffArr)
      };
    }

    var realGroup = summarizeGroup(reals);
    var decoyGroup = summarizeGroup(decoys);
    var noiseGroup = summarizeGroup(noises);

    var coreThreshPct = 80;
    var coreMask = new Array(64);
    var coreCount = 0;
    for (var m = 0; m < 64; m++) {
      coreMask[m] = realGroup.count > 0 && realGroup.hitRate[m] >= coreThreshPct;
      if (coreMask[m]) coreCount++;
    }
    if (realGroup.count > 0 && coreCount < 2) {
      coreThreshPct = 65;
      for (var m2 = 0; m2 < 64; m2++) coreMask[m2] = realGroup.hitRate[m2] >= coreThreshPct;
    }
    var universalRealBands = extractContiguousBands(centers, coreMask, 2);

    var deadAcousticMask = new Array(64);
    var deadSubMicMask = new Array(64);
    for (var d = 0; d < 64; d++) {
      var isRare = realGroup.count > 0 && realGroup.hitRate[d] <= 15;
      deadAcousticMask[d] = isRare && centers[d] >= 60;
      deadSubMicMask[d] = isRare && centers[d] < 60;
    }
    var deadAcousticBands = extractContiguousBands(centers, deadAcousticMask, 2);
    var deadSubMicBands = extractContiguousBands(centers, deadSubMicMask, 1);

    var mouthExcessMask = new Array(64);
    var realExcessMask = new Array(64);
    var maxMouthExcess = { bin: -1, hz: 0, hitDiff: 0, medDiff: 0 };
    var maxRealExcess = { bin: -1, hz: 0, hitDiff: 0, medDiff: 0 };
    if (realGroup.count > 0 && decoyGroup.count > 0) {
      for (var x = 0; x < 64; x++) {
        var hDiff = decoyGroup.hitRate[x] - realGroup.hitRate[x];
        var mDiff = decoyGroup.median[x] - realGroup.median[x];
        mouthExcessMask[x] = hDiff >= 15 || mDiff >= 0.14;
        realExcessMask[x] = hDiff <= -15 || mDiff <= -0.14;
        if (hDiff > maxMouthExcess.hitDiff || (Math.abs(hDiff - maxMouthExcess.hitDiff) < 1 && mDiff > maxMouthExcess.medDiff)) {
          maxMouthExcess = { bin: x, hz: centers[x], hitDiff: Math.round(hDiff), medDiff: Number(mDiff.toFixed(2)) };
        }
        if (-hDiff > maxRealExcess.hitDiff || (Math.abs(-hDiff - maxRealExcess.hitDiff) < 1 && -mDiff > maxRealExcess.medDiff)) {
          maxRealExcess = { bin: x, hz: centers[x], hitDiff: Math.round(-hDiff), medDiff: Number((-mDiff).toFixed(2)) };
        }
      }
    }
    var mouthExcessBands = extractContiguousBands(centers, mouthExcessMask, 2);
    var realExcessBands = extractContiguousBands(centers, realExcessMask, 2);

    return {
      hitThreshold: hitThreshold,
      centers: centers,
      real: realGroup,
      decoy: decoyGroup,
      noise: noiseGroup,
      coreThreshPct: coreThreshPct,
      universalRealBands: universalRealBands,
      deadAcousticBands: deadAcousticBands,
      deadSubMicBands: deadSubMicBands,
      mouthExcessBands: mouthExcessBands,
      realExcessBands: realExcessBands,
      maxMouthExcess: maxMouthExcess,
      maxRealExcess: maxRealExcess
    };
  }

  function suggestOptimalAuthenticity(items, currentConfig) {
    var base = currentConfig ? JSON.parse(JSON.stringify(currentConfig)) : createDefaultConfig('sentry_v3');
    if (!base.auth || !base.auth.criteria) base.auth = createDefaultAuthConfig();
    var list = Array.isArray(items) ? items.filter(function (x) { return x && x.telemetry && x.telemetry.metrics; }) : [];
    var reals = list.filter(function (x) { return x.label !== 'fake' && x.label !== 'noise'; });
    var decoys = list.filter(function (x) { return x.label === 'fake'; });

    var summary = {
      usedTwoClass: reals.length >= 2 && decoys.length >= 2,
      realCount: reals.length,
      decoyCount: decoys.length,
      updated: []
    };
    if (reals.length < 2) return { config: base, summary: summary };

    var snap = function (val, def) {
      var raw = clamp(val, def.min, def.max);
      var steps = Math.round((raw - def.min) / (def.step || 0.01));
      return Number(clamp(def.min + steps * (def.step || 0.01), def.min, def.max).toFixed(3));
    };

    for (var i = 0; i < AUTH_CRITERIA_IDS.length; i++) {
      var id = AUTH_CRITERIA_IDS[i];
      var def = CRITERIA_BY_ID[id];
      if (!def) continue;
      var cCfg = base.auth.criteria[id] || { threshold: def.defaultThreshold, weight: def.defaultWeight, enabled: true };
      var rVals = reals.map(function (x) { return safeNum(x.telemetry.metrics[id], 0); });
      var rStat = summarizeNumericArray(rVals);

      if (summary.usedTwoClass) {
        var dVals = decoys.map(function (x) { return safeNum(x.telemetry.metrics[id], 0); });
        var dStat = summarizeNumericArray(dVals);
        var lo = Math.max(def.min, Math.min(rStat.min, dStat.min));
        var hi = Math.min(def.max, Math.max(rStat.max, dStat.max));
        var bestThr = cCfg.threshold;
        var bestJ = -Infinity;
        var midTarget = (rStat.median + dStat.median) / 2;
        for (var s = 0; s <= 40; s++) {
          var cand = lo + ((hi - lo) * s) / 40;
          var tp = 0;
          var fp = 0;
          for (var a = 0; a < rVals.length; a++) if (def.mode === 'min' ? rVals[a] >= cand : rVals[a] <= cand) tp++;
          for (var b = 0; b < dVals.length; b++) if (def.mode === 'min' ? dVals[b] >= cand : dVals[b] <= cand) fp++;
          var j = tp / rVals.length - fp / dVals.length;
          if (j > bestJ + 1e-6 || (Math.abs(j - bestJ) <= 1e-6 && Math.abs(cand - midTarget) < Math.abs(bestThr - midTarget))) {
            bestJ = j;
            bestThr = cand;
          }
        }
        cCfg.threshold = snap(bestThr, def);
        cCfg.enabled = bestJ > 0.08;
        cCfg.weight = Number(clamp(0.8 + Math.max(0, bestJ) * 1.8, 0.5, 2.8).toFixed(1));
        summary.updated.push({ id: id, threshold: cCfg.threshold, youdenJ: Number(bestJ.toFixed(2)) });
      } else {
        var target = def.mode === 'min' ? rStat.p10 * 0.94 : rStat.p90 * 1.06;
        cCfg.threshold = snap(target, def);
        cCfg.enabled = true;
        summary.updated.push({ id: id, threshold: cCfg.threshold, youdenJ: null });
      }
      base.auth.criteria[id] = cCfg;
    }
    return { config: base, summary: summary };
  }

  TootTestLab.DetectorLab = {
    CRITERIA_DEFS: CRITERIA_DEFS,
    CRITERIA_BY_ID: CRITERIA_BY_ID,
    SENTRY_CRITERIA_IDS: SENTRY_CRITERIA_IDS,
    AUTH_CRITERIA_IDS: AUTH_CRITERIA_IDS,
    PRESETS: PRESETS,
    createDefaultAuthConfig: createDefaultAuthConfig,
    createDefaultConfig: createDefaultConfig,
    analyzeAudioBandsFast: analyzeAudioBandsFast,
    computeSpectrumBins64: computeSpectrumBins64,
    extractFastSentryTelemetry: extractFastSentryTelemetry,
    extractFullTelemetry: extractFullTelemetry,
    buildBackgroundControlProfile: buildBackgroundControlProfile,
    evaluateAgainstBackground: evaluateAgainstBackground,
    calibrateLimitsFromTarget: calibrateLimitsFromTarget,
    calibrateSingleCriterion: calibrateSingleCriterion,
    evaluateAuthenticity: evaluateAuthenticity,
    evaluateTelemetry: evaluateTelemetry,
    computeCohortStats: computeCohortStats,
    computeFrequencySpreadProfile: computeFrequencySpreadProfile,
    suggestOptimalThresholds: suggestOptimalThresholds,
    suggestOptimalAuthenticity: suggestOptimalAuthenticity,
    buildGroupCompositeSpecimen: buildGroupCompositeSpecimen,
    computeAutopsyDiff: computeAutopsyDiff
  };
})(typeof window !== 'undefined' ? window : globalThis);
