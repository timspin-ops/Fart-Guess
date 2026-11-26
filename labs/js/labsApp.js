(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  function $(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateShort(ts) {
    if (!ts) return 'Recorded today';
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Logged';
    }
  }

  function formatTimeShort(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  function slugFilename(name) {
    return String(name || 'fart-recording')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'fart-recording';
  }

  var state = {
    view: 'home',
    prevNonTeamView: 'home',
    prevBeforeVault: 'home',
    prevBeforeFartnalysis: 'home',
    samples: [],
    analysisSpec3d: null,
    analysisScopeRaf: null,
    vaultFilter: 'all',
    vaultSearchQuery: '',
    vaultSelectMode: false,
    vaultSelectedSamples: {},
    vaultSelectedGuesses: {},
    deleteModalAction: null,
    detailSampleId: null,
    detailAttempts: [],
    guessTargetId: null,
    guessAttempts: [],
    pendingGuess: null,
    sessionGuesses: [],
    lastSessionResults: [],
    guessSubMode: 'standard',
    subModeReturnTo: 'home',
    guessMode: 'guess',
    guessRevealed: false,
    qfCount: 5,
    qfSource: 'all',
    qfPhase: 'setup',
    qfActive: false,
    qfGen: 0,
    qfTimers: [],
    qfDeck: [],
    qfIndex: 0,
    qfResults: [],
    qfStopCurrentRec: null,
    qfScoreRaf: null,
    qfConfettiHandle: null,
    qfScoringActive: false,
    seqCount: 3,
    seqSource: 'all',
    seqPlayerCount: 1,
    seqPlayerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    seqPhase: 'setup',
    seqActive: false,
    seqGen: 0,
    seqTimers: [],
    seqDeck: [],
    seqPlayerIndex: 0,
    seqActiveResultPlayer: 0,
    seqPlayerResults: [],
    seqStopCurrentRec: null,
    rfDeck: [],
    rfIndex: 0,
    rfResults: [],
    rfVoted: false,
    rfOpenGen: 0,
    rfPhase: 'play',
    rfBriefCollapsed: false,
    hintLevel: 0,
    pickerOpen: false,
    historyOpen: false,
    revealInProgress: false,
    revealTimerId: null,
    revealFallbackTimerId: null,
    blindGuesses: [],
    blindOriginal: null,
    lastOutcome: null,
    quickSavedId: null,
    fnMode: 'original',
    fnSampleId: null,
    fnAttempts: [],
    fnAttemptId: null,
    fnController: null,
    groupSource: 'all',
    groupShuffleSeed: 0,
    groupRenderGen: 0,
    allAttemptsCache: [],
    attemptsCacheLoaded: false,
    fnOpenGen: 0,
    guessOpenGen: 0,
    groupSortBy: 'pitch',
    groupSortDir: 'asc',
    renameTarget: null,
    activeRecStopper: null,
    activeRecCanceller: null,
    homeOscId: null,
    homeOscPlaying: false,
    homeOscProgress: null,
    recordingKind: null,
    recordMode: 'manual',
    inlineSpecA: null,
    inlineSpecB: null,
    revealSpecA: null,
    revealSpecB: null,
    revealStepTimers: [],
    revealSkipCb: null,
    revealGen: 0,
    lastRevealOrder: [],
    resultTimers: [],
    vaultDoorTimers: [],
    analysisTimers: [],
    analysisDoneCb: null,
    autoDetectMsgTimer: null,
    resultCounterRaf: null,
    confettiHandle: null,
    toastTimer: null,
    shareModalActions: null
  };

  function ensureTargetReady(sample) {
    if (!sample) return Promise.resolve(null);
    if (sample.samples && sample.samples.length > 0) return Promise.resolve(sample);
    if (TootLabs.Store && typeof TootLabs.Store.ensureSampleLoaded === 'function') {
      return TootLabs.Store.ensureSampleLoaded(sample);
    }
    return Promise.resolve(sample);
  }

  function showToast(msg, isErr) {
    var el = $('labs-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.toggle('error', Boolean(isErr));
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      el.classList.add('hidden');
    }, isErr ? 4500 : 3000);
  }

  function getSampleById(id) {
    if (!id) return null;
    for (var i = 0; i < state.samples.length; i++) {
      if (state.samples[i].id === id) return state.samples[i];
    }
    return null;
  }

  function getSampleName(s) {
    if (!s) return 'Saved Fart';
    return s.displayName || (TootLabs.Store ? TootLabs.Store.ensureNickname(s) : s.name) || 'Saved Fart';
  }

  /* ==================== SHARE, EMAIL AUDIO & EMAIL ANALYSIS ==================== */
  function copyTextQuiet(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  function openMailDraft(subject, body) {
    var mailtoUrl =
      'mailto:?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body);
    try {
      var a = document.createElement('a');
      a.href = mailtoUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      try {
        root.location.href = mailtoUrl;
      } catch (err) {}
    }
  }

  function triggerBlobDownload(blob, filename) {
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 2000);
      return true;
    } catch (e) {
      return false;
    }
  }

  function stitchComparisonAudio(soundA, soundB) {
    if (!soundA || !soundA.samples) return soundB || null;
    if (!soundB || !soundB.samples) return soundA;
    var DSP = root.TootApp && root.TootApp.DSP;
    var sr = 44100;
    var srA = soundA.sampleRate || sr;
    var srB = soundB.sampleRate || sr;
    var bufA = srA !== sr && DSP && typeof DSP.resampleAudio === 'function'
      ? DSP.resampleAudio(soundA.samples, srA / sr, sr)
      : soundA.samples;
    var bufB = srB !== sr && DSP && typeof DSP.resampleAudio === 'function'
      ? DSP.resampleAudio(soundB.samples, srB / sr, sr)
      : soundB.samples;
    var gap = Math.round(sr * 0.22);
    var out = new Float32Array(bufA.length + gap + bufB.length);
    out.set(bufA, 0);
    out.set(bufB, bufA.length + gap);
    return {
      name: getSampleName(soundA) + '-vs-' + (soundB.name || 'guess'),
      displayName: getSampleName(soundA) + ' vs ' + (soundB.name || 'Guess'),
      sampleRate: sr,
      samples: out
    };
  }

  function buildPdfFromOpts(pdfOpts) {
    if (!TootLabs.PdfExport || typeof TootLabs.PdfExport.generateAnalysisPdf !== 'function') {
      return null;
    }
    try {
      return TootLabs.PdfExport.generateAnalysisPdf(pdfOpts);
    } catch (e) {
      return null;
    }
  }

  function downloadAnalysisPdf(pdfOpts) {
    var pdfRes = buildPdfFromOpts(pdfOpts);
    if (!pdfRes || !pdfRes.blob) {
      showToast('PDF generator unavailable', true);
      return;
    }
    triggerBlobDownload(pdfRes.blob, pdfRes.filename);
    showToast('Saved ' + pdfRes.pageCount + '-page PDF "' + pdfRes.filename + '"');
  }

  function shareOrEmailBundle(bundleOpts) {
    bundleOpts = bundleOpts || {};
    var channel = bundleOpts.channel === 'email' ? 'email' : 'share';
    var subject = bundleOpts.subject || 'Toot Match Labs Analysis';
    var reportText = bundleOpts.reportText || '';
    var pdfOpts = bundleOpts.pdfOpts || null;
    var audioSound = bundleOpts.audioSound || null;
    var Audio = root.TootApp && root.TootApp.Audio;

    var pdfRes = pdfOpts ? buildPdfFromOpts(pdfOpts) : null;
    var audioBlob = null;
    var audioName = null;

    if (audioSound && audioSound.samples && Audio && typeof Audio.encodeWavBlob === 'function') {
      try {
        audioName = slugFilename(getSampleName(audioSound)) + '.wav';
        audioBlob = Audio.encodeWavBlob(audioSound.samples, audioSound.sampleRate || 44100);
      } catch (e) {}
    }

    var shareFiles = [];
    if (typeof File === 'function') {
      try {
        if (pdfRes && pdfRes.blob) {
          shareFiles.push(new File([pdfRes.blob], pdfRes.filename, { type: 'application/pdf' }));
        }
        if (audioBlob && audioName) {
          shareFiles.push(new File([audioBlob], audioName, { type: 'audio/wav' }));
        }
      } catch (e) {}
    }

    function runFallback() {
      var body = reportText;
      var attachNames = [];
      if (pdfRes && pdfRes.blob) {
        triggerBlobDownload(pdfRes.blob, pdfRes.filename);
        attachNames.push(pdfRes.filename);
      }
      if (audioBlob && audioName) {
        if (pdfRes && pdfRes.blob) {
          var delayedBlob = audioBlob;
          var delayedName = audioName;
          setTimeout(function () {
            triggerBlobDownload(delayedBlob, delayedName);
          }, 180);
        } else {
          triggerBlobDownload(audioBlob, audioName);
        }
        attachNames.push(audioName);
      }

      if (attachNames.length > 0) {
        body = body + '\n\n(Attach downloaded files to send: ' + attachNames.join(' + ') + ')';
      }

      copyTextQuiet(reportText || subject).then(function () {
        if (channel === 'email') {
          openMailDraft(subject, body);
          showToast(
            attachNames.length > 0
              ? 'Browser mailto: cannot auto-attach files — saved ' + attachNames.join(' + ') + ' & opened email draft'
              : 'Opened email draft & copied report to clipboard'
          );
        } else {
          showToast(
            attachNames.length > 0
              ? 'Browser blocked combined file share — saved ' + attachNames.join(' + ') + ' & copied report for manual attach'
              : 'Copied report to clipboard'
          );
        }
      });
    }

    if (shareFiles.length > 0 && navigator.share && typeof navigator.canShare === 'function') {
      try {
        if (navigator.canShare({ files: shareFiles })) {
          navigator
            .share({
              title: subject,
              text: reportText || subject,
              files: shareFiles
            })
            .catch(function (err) {
              if (err && err.name === 'AbortError') return;
              runFallback();
            });
          return;
        }
      } catch (e) {}
    }

    runFallback();
  }

  function emailAnalysisReport(subject, reportText, pdfOpts, audioSound) {
    shareOrEmailBundle({
      channel: 'email',
      subject: subject,
      reportText: reportText,
      pdfOpts: pdfOpts,
      audioSound: audioSound
    });
  }

  function shareTextOrAudio(title, text, sound, pdfOpts) {
    shareOrEmailBundle({
      channel: 'share',
      subject: title,
      reportText: text,
      pdfOpts: pdfOpts,
      audioSound: sound
    });
  }

  function closeShareEmailModal() {
    var modal = $('labs-share-modal');
    if (modal) modal.classList.add('hidden');
    state.shareModalActions = null;
  }

  function openShareEmailModal(opts) {
    opts = opts || {};
    var modal = $('labs-share-modal');
    var titleEl = $('labs-share-modal-title');
    var subEl = $('labs-share-modal-sub');
    var pdfBtn = $('btn-share-modal-pdf');
    state.shareModalActions = {
      onShare: typeof opts.onShare === 'function' ? opts.onShare : null,
      onEmail: typeof opts.onEmail === 'function' ? opts.onEmail : null,
      onPdf: typeof opts.onPdf === 'function' ? opts.onPdf : null
    };
    if (pdfBtn) pdfBtn.classList.toggle('hidden', !state.shareModalActions.onPdf);
    if (titleEl) titleEl.textContent = opts.title || 'Share Report';
    if (subEl) subEl.textContent = opts.subtitle || 'Choose how to export or send the full A.S.S. v4.2 PDF dossier & WAV audio.';
    if (modal) modal.classList.remove('hidden');
  }

  /* ==================== WAVEFORM RENDERERS ==================== */
  function sizeCanvasDpr(canvas, fallbackW, fallbackH, opts) {
    if (!canvas) return null;
    var rect = opts && opts.preMeasuredRect ? opts.preMeasuredRect : null;
    if (!rect) rect = canvas.getBoundingClientRect();
    var w = rect && rect.width > 0 ? rect.width : fallbackW || 300;
    var h = rect && rect.height > 0 ? rect.height : fallbackH || 80;
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var tw = Math.round(w * dpr);
    var th = Math.round(h * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  function drawStaticWaveform(canvas, samples, opts) {
    opts = opts || {};
    var sized = sizeCanvasDpr(canvas, opts.fallbackW || 280, opts.fallbackH || 54, opts);
    if (!sized) return;
    var ctx = sized.ctx, w = sized.w, h = sized.h;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = opts.lineColor || 'rgba(55, 65, 81, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    if (!samples || samples.length === 0) return;

    var barWidth = opts.barWidth || 3;
    var gap = opts.gap || 2;
    var stepPx = barWidth + gap;
    var numBars = Math.max(12, Math.floor(w / stepPx));
    var stride = Math.max(1, Math.floor(samples.length / numBars));

    var maxPeak = 0.001;
    var peaks = new Float32Array(numBars);
    for (var b = 0; b < numBars; b++) {
      var sIdx = Math.floor((b / numBars) * samples.length);
      var eIdx = Math.min(samples.length, sIdx + stride);
      var pk = 0;
      for (var i = sIdx; i < eIdx; i++) {
        var a = Math.abs(samples[i]);
        if (a > pk) pk = a;
      }
      peaks[b] = pk;
      if (pk > maxPeak) maxPeak = pk;
    }

    var progress = typeof opts.progress === 'number' ? Math.max(0, Math.min(1, opts.progress)) : null;
    var grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, opts.colorA || '#22C55E');
    grad.addColorStop(1, opts.colorB || '#60A5FA');

    for (var k = 0; k < numBars; k++) {
      var norm = peaks[k] / maxPeak;
      var barH = Math.max(3, norm * (h * 0.84));
      var x = k * stepPx;
      var y = (h - barH) * 0.5;
      var frac = k / numBars;

      if (progress !== null) {
        ctx.fillStyle = frac <= progress ? (opts.activeColor || '#FFFFFF') : (opts.inactiveColor || 'rgba(96, 165, 250, 0.38)');
      } else {
        ctx.fillStyle = grad;
      }
      ctx.fillRect(x, y, barWidth, barH);
    }

    if (progress !== null) {
      var px = progress * w;
      ctx.strokeStyle = opts.cursorColor || '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 2);
      ctx.lineTo(px, h - 2);
      ctx.stroke();
    }
  }

  function drawPreviewWaveform(canvas, peaks, opts) {
    opts = opts || {};
    var sized = sizeCanvasDpr(canvas, opts.fallbackW || 260, opts.fallbackH || 44, opts);
    if (!sized) return;
    var ctx = sized.ctx, w = sized.w, h = sized.h;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = opts.lineColor || 'rgba(55, 65, 81, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    if (!peaks || peaks.length === 0) return;

    var barWidth = opts.barWidth || 3;
    var gap = opts.gap || 2;
    var stepPx = barWidth + gap;
    var numBars = Math.max(12, Math.floor(w / stepPx));
    var grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, opts.colorA || '#60A5FA');
    grad.addColorStop(1, opts.colorB || '#818CF8');
    ctx.fillStyle = grad;

    for (var k = 0; k < numBars; k++) {
      var pos = (k / Math.max(1, numBars - 1)) * (peaks.length - 1);
      var lo = Math.floor(pos);
      var hi = Math.min(peaks.length - 1, lo + 1);
      var frac = pos - lo;
      var pk = ((peaks[lo] || 4) * (1 - frac) + (peaks[hi] || 4) * frac) / 100;
      var barH = Math.max(3, Math.min(1, pk) * (h * 0.84));
      var x = k * stepPx;
      var y = (h - barH) * 0.5;
      ctx.fillRect(x, y, barWidth, barH);
    }
  }

  function drawLiveWaveform(canvas, timeData, rms) {
    var sized = sizeCanvasDpr(canvas, 320, 64);
    if (!sized) return;
    var ctx = sized.ctx, w = sized.w, h = sized.h;

    ctx.fillStyle = '#0B1222';
    ctx.fillRect(0, 0, w, h);

    var meterW = Math.min(1, rms * 5.2) * w;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    ctx.fillRect(0, h - 6, meterW, 6);

    var peak = 0;
    for (var p = 0; p < timeData.length; p++) {
      var a = Math.abs(timeData[p]);
      if (a > peak) peak = a;
    }
    var gain = Math.min(10, 0.44 / Math.max(0.04, peak));

    ctx.strokeStyle = rms > 0.025 ? '#22C55E' : '#60A5FA';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    var step = Math.max(1, Math.floor(timeData.length / 180));
    for (var i = 0; i < timeData.length; i += step) {
      var x = (i / (timeData.length - 1)) * w;
      var y = h * 0.5 + Math.max(-1, Math.min(1, timeData[i] * gain)) * (h * 0.42);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawComparisonWaveform(canvas, samplesA, samplesB) {
    var sized = sizeCanvasDpr(canvas, 340, 118);
    if (!sized) return;
    var ctx = sized.ctx, w = sized.w, h = sized.h;

    ctx.clearRect(0, 0, w, h);
    var laneH = h * 0.42;
    ctx.strokeStyle = 'rgba(55, 65, 81, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    function drawLane(samples, centerY, color) {
      if (!samples || samples.length === 0) return;
      var numBars = Math.max(24, Math.floor(w / 4));
      var stride = Math.max(1, Math.floor(samples.length / numBars));
      var maxPk = 0.001;
      var pks = new Float32Array(numBars);
      for (var b = 0; b < numBars; b++) {
        var sIdx = Math.floor((b / numBars) * samples.length);
        var eIdx = Math.min(samples.length, sIdx + stride);
        var pk = 0;
        for (var i = sIdx; i < eIdx; i++) {
          var v = Math.abs(samples[i]);
          if (v > pk) pk = v;
        }
        pks[b] = pk;
        if (pk > maxPk) maxPk = pk;
      }
      ctx.fillStyle = color;
      for (var k = 0; k < numBars; k++) {
        var bh = Math.max(2, (pks[k] / maxPk) * laneH * 0.78);
        ctx.fillRect(k * 4, centerY - bh * 0.5, 2.4, bh);
      }
    }

    drawLane(samplesA, h * 0.27, '#22C55E');
    drawLane(samplesB, h * 0.75, '#F97316');

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#86EFAC';
    ctx.fillText('SOURCE SPECIMEN', 8, 13);
    ctx.fillStyle = '#FED7AA';
    ctx.fillText('COMPARATIVE TRIAL', 8, h * 0.5 + 14);
  }

  /* ==================== ANIMATION CLEANUP ==================== */
  var ANALYSIS_OPENING_POOL = [
    'Acquiring acoustic telemetry streams...',
    'Initializing waveform morphology model...'
  ];

  var ANALYSIS_COMPARISON_OPENING_POOL = [
    'Synchronizing reference specimen telemetry...',
    'Aligning reference and comparative waveforms...'
  ];

  var ANALYSIS_QUICKFIRE_OPENING_POOL = [
    'Ingesting rapid-sequence trial telemetry...',
    'Synchronizing sequential acoustic captures...'
  ];

  var ANALYSIS_QUICKFIRE_CORE_POOL = [
    'Evaluating spectral drift across sequential trials...',
    'Quantifying emission lifetime consistency across captures...',
    'Ranking primary resonance alignment and harmonic stability...',
    'Dr. Turbulence evaluating pressure release profiles across sequence...',
    'Isolating peak fidelity and maximum variance events...'
  ];

  var ANALYSIS_RESULTS_CORE_POOL = [
    'Computing emission lifetime and onset transient variance...',
    'Measuring primary resonance profile and frequency trajectory...',
    'Cross-correlating oscillation cadence modulation spectra...',
    'Evaluating pressure release potential and attenuation decay...',
    'Executing A.S.S. 22-dimension comparative assessment...',
    'Computing 3D Spectral Distribution Map correlation...',
    'Quantifying observed variance across normalized harmonic bands...',
    'Evaluating heuristic origin telemetry indicators...',
    'Analyzing barometric pressure contour alignment...'
  ];

  var ANALYSIS_STANDARD_POOL = [
    'Calibrating 40-band spectral distribution map...',
    'Cross-referencing Institute Archive baselines...',
    'Consulting historical flatulence research holdings...',
    'Mapping primary resonance harmonic structure...',
    'Computing acoustic energy output and crest dynamics...',
    'Measuring hydro-acoustic turbulence flux coefficient...',
    'Evaluating oscillation cadence across 4–45 Hz bands...',
    'Screening for archive anomalies and research candidates...',
    'Computing probabilistic origin telemetry indicators...',
    'Measuring emission lifetime and T50 energy burn...',
    'Mapping elevated energy release zones...',
    'Evaluating acoustic irregularity regions...',
    'Comparing statistical percentiles against reference corpus...',
    'Executing multi-dimensional vector projection...',
    'Analyzing temporal envelope morphology...',
    'Quantifying broadband airflow dispersion...',
    'Processing gastrointestinal acoustics...',
    'Extracting 13-dimension cepstral fingerprints...',
    'Reconstructing 3D time-frequency surface...',
    'Evaluating environmental masking propagation radius...',
    'Verifying statistical confidence intervals...',
    'Compiling official Laboratory Findings...'
  ];

  var ANALYSIS_SCIENTIST_UPDATES = [
    'Professor Bottomsworth reviewing preliminary telemetry...',
    'Dr. Flatley validating computational clustering models...',
    'Dr. Wobble inspecting 3D harmonic contours...',
    'Dr. Turbulence evaluating pressure release dynamics...',
    'Dr. Pufferton cross-referencing Institute Archive holdings...'
  ];

  var ANALYSIS_RARE_POOL = [
    'Laboratory disagreement detected.',
    'Additional peer review required.',
    'Several scientists requested a second opinion.',
    'Archive retrieval taking longer than expected.',
    'Unexpected resonance behaviour observed.',
    'Further funding has been requested.',
    'Coffee consumption increased during analysis.'
  ];

  var AUTO_DETECT_WAIT_MESSAGES = [
    'Monitoring acoustic baseline...',
    'Calibrating ambient noise floor...',
    'Awaiting gastrointestinal acoustic event...',
    'Acoustic telemetry sensors armed...',
    'Standing by for emission...',
    'Tracking localized pressure conditions...'
  ];

  var AUTO_DETECT_TRIGGER_TITLES = [
    'EVENT DETECTED',
    'TARGET ACQUIRED',
    'ACOUSTIC EVENT DETECTED'
  ];

  function clearAnalysisSequence() {
    for (var i = 0; i < state.analysisTimers.length; i++) {
      clearTimeout(state.analysisTimers[i]);
    }
    state.analysisTimers = [];
    state.analysisDoneCb = null;
    if (state.analysisScopeRaf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(state.analysisScopeRaf);
    }
    state.analysisScopeRaf = null;
    if (state.analysisSpec3d && typeof state.analysisSpec3d.destroy === 'function') {
      state.analysisSpec3d.destroy();
    }
    state.analysisSpec3d = null;
    var annotCanvas = $('labs-an-annot-canvas');
    if (annotCanvas && typeof annotCanvas.getContext === 'function') {
      try {
        var actx = annotCanvas.getContext('2d');
        if (actx) actx.clearRect(0, 0, annotCanvas.width || 320, annotCanvas.height || 196);
      } catch (e) {}
    }
    var overlay = $('labs-analysis-overlay');
    var consensusEl = $('labs-an-consensus');
    if (consensusEl) consensusEl.classList.add('hidden');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.classList.remove('fading-out');
    }
  }

  function clearAutoDetectUI() {
    if (state.autoDetectMsgTimer) {
      clearInterval(state.autoDetectMsgTimer);
      state.autoDetectMsgTimer = null;
    }
    var quickBadge = $('labs-quick-auto-status');
    if (quickBadge) {
      quickBadge.classList.add('hidden');
      quickBadge.classList.remove('triggered');
    }
  }

  function shuffleArray(arr) {
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function pickAnalysisStages(context, opts) {
    opts = opts || {};
    if (context === 'quickfire') {
      var qfOpening = ANALYSIS_QUICKFIRE_OPENING_POOL[Math.floor(Math.random() * ANALYSIS_QUICKFIRE_OPENING_POOL.length)];
      var qfCore = shuffleArray(ANALYSIS_QUICKFIRE_CORE_POOL);
      var qfSci = ANALYSIS_SCIENTIST_UPDATES[Math.floor(Math.random() * ANALYSIS_SCIENTIST_UPDATES.length)];
      var qfStages = [
        { text: qfOpening, rare: false, scientist: false },
        { text: qfCore[0], rare: false, scientist: false },
        {
        text: qfSci,
        rare: false,
        scientist: true
      },
      { text: qfCore[1], rare: Math.random() < 0.35, scientist: false },
      { text: 'Certifying Rapid-Sequence Official Findings...', rare: false, scientist: false }
      ];
      return qfStages.map(function (st, idx) {
        var ms = idx === qfStages.length - 1 ? 520 : Math.round(445 + Math.random() * 95);
        return {
          text: st.text,
          rare: st.rare,
          scientist: st.scientist,
          durationMs: Math.max(440, Math.min(540, ms))
        };
      });
    }

    var isResults = context === 'comparison';
    var openPool = isResults ? ANALYSIS_COMPARISON_OPENING_POOL : ANALYSIS_OPENING_POOL;
    var opening = openPool[Math.floor(Math.random() * openPool.length)];
    var coreShuffled = shuffleArray(isResults ? ANALYSIS_RESULTS_CORE_POOL : ANALYSIS_STANDARD_POOL);
    var extraShuffled = shuffleArray(ANALYSIS_STANDARD_POOL);

    var stages = [{ text: opening, rare: false, scientist: false }];
    var midCount = isResults ? (Math.random() < 0.5 ? 3 : 4) : (Math.random() < 0.5 ? 5 : 6);
    var pickedMid = [];
    var seen = new Set([opening]);

    for (var ci = 0; ci < coreShuffled.length && pickedMid.length < (isResults ? midCount : Math.min(4, midCount)); ci++) {
      if (!seen.has(coreShuffled[ci])) {
        seen.add(coreShuffled[ci]);
        pickedMid.push({ text: coreShuffled[ci], rare: false, scientist: false });
      }
    }
    if (!isResults) {
      for (var ei = 0; ei < extraShuffled.length && pickedMid.length < midCount; ei++) {
        if (!seen.has(extraShuffled[ei])) {
          seen.add(extraShuffled[ei]);
          pickedMid.push({ text: extraShuffled[ei], rare: false, scientist: false });
        }
      }
    }

    if (isResults || Math.random() < 0.58) {
      var sciTxt = ANALYSIS_SCIENTIST_UPDATES[Math.floor(Math.random() * ANALYSIS_SCIENTIST_UPDATES.length)];
      if (isResults && pickedMid.length >= 4) pickedMid.pop();
      var sciPos = Math.max(1, Math.min(pickedMid.length, 1 + Math.floor(Math.random() * 2)));
      pickedMid.splice(sciPos, 0, { text: sciTxt, rare: false, scientist: true });
    }

    if (Math.random() < (isResults ? 0.35 : 0.42)) {
      var rareTxt = ANALYSIS_RARE_POOL[Math.floor(Math.random() * ANALYSIS_RARE_POOL.length)];
      if (isResults && pickedMid.length >= 4) pickedMid.shift();
      var insertPos = Math.max(1, Math.min(pickedMid.length, 2));
      pickedMid.splice(insertPos, 0, { text: rareTxt, rare: true, scientist: false });
    }

    for (var m = 0; m < pickedMid.length; m++) {
      stages.push(pickedMid[m]);
    }
    stages.push({
      text: isResults
        ? (opts.isSolo ? 'Compiling Reproduction Fidelity Assessment...' : 'Finalizing Laboratory Match Confidence Rankings...')
        : 'Finalizing Laboratory Verdict...',
      rare: false,
      scientist: false
    });

    if (isResults) {
      return stages.map(function (st, idx) {
        var ms = idx === stages.length - 1 ? 520 : Math.round(450 + Math.random() * 110);
        return {
          text: st.text,
          rare: st.rare,
          scientist: st.scientist,
          durationMs: Math.max(420, Math.min(600, ms))
        };
      });
    }

    // Target ~7.8s to ~10.2s across specimen cataloging stages
    var targetTotalMs = 7800 + Math.random() * 2400;
    var weights = stages.map(function (st, idx) {
      if (idx === stages.length - 1) return 1.15;
      return (st.scientist || st.rare ? 1.45 : 0.90) + Math.random() * 0.40;
    });
    var sumW = weights.reduce(function (a, b) { return a + b; }, 0) || stages.length;

    return stages.map(function (st, idx) {
      return {
        text: st.text,
        rare: st.rare,
        scientist: st.scientist,
        durationMs: Math.max(850, Math.round((weights[idx] / sumW) * targetTotalMs))
      };
    });
  }

  function buildFallbackAnalysisSpectrogram() {
    var tf = 32;
    var fb = 24;
    var grid = [];
    var freqsHz = [];
    var timesSec = [];
    for (var f = 0; f < fb; f++) freqsHz.push(55 + f * 75);
    for (var t = 0; t < tf; t++) {
      timesSec.push((t / (tf - 1)) * 0.85);
      var nt = t / (tf - 1);
      var env = Math.exp(-Math.pow((nt - 0.34) / 0.24, 2));
      var row = [];
      for (var b = 0; b < fb; b++) {
        var nf = b / (fb - 1);
        var ridge1 = Math.exp(-Math.pow((nf - (0.20 + 0.08 * Math.sin(nt * 7))) / 0.14, 2));
        var ridge2 = 0.52 * Math.exp(-Math.pow((nf - 0.52) / 0.16, 2));
        var ripple = 0.08 * Math.sin(nt * 18 + nf * 9);
        row.push(Math.max(0.02, Math.min(1, env * (ridge1 + ridge2) + ripple)));
      }
      grid.push(row);
    }
    return { timeFrames: tf, freqBins: fb, timesSec: timesSec, freqsHz: freqsHz, grid: grid };
  }

  function extractSpectrogramAnchors(sample, spec) {
    var feat = (sample && sample.features) || {};
    var grid = (spec && spec.grid) || [];
    var rows = grid.length || 1;
    var cols = (grid[0] && grid[0].length) || 1;
    var bestR = Math.floor(rows * 0.35);
    var bestC = Math.floor(cols * 0.22);
    var bestVal = -1;
    for (var r = 0; r < rows; r++) {
      var row = grid[r] || [];
      for (var c = 0; c < row.length; c++) {
        if (row[c] > bestVal) {
          bestVal = row[c];
          bestR = r;
          bestC = c;
        }
      }
    }
    var freqs = (spec && spec.freqsHz) || [];
    var times = (spec && spec.timesSec) || [];
    var peakHz = Math.round(freqs[bestC] || feat.pitchHz || feat.fundamentalHz || 110);
    var centHz = Math.round(feat.spectralCentroidHz || feat.centroidHz || peakHz * 1.8);
    var peakSec = Number(times[bestR] || ((bestR / Math.max(1, rows - 1)) * 0.8));
    var crestDb = Number(feat.crestFactorDb || 12.4);
    var px = -1 + 2 * (bestR / Math.max(1, rows - 1));
    var pz = -1 + 2 * (bestC / Math.max(1, cols - 1));
    var py = 0.92;
    return {
      peakX: px,
      peakY: py,
      peakZ: pz,
      onsetX: Math.max(-0.92, px - 0.28),
      onsetZ: pz,
      tailX: Math.min(0.92, px + 0.56),
      harmZ: Math.min(0.88, pz + 0.44),
      turbX: Math.min(0.82, px + 0.22),
      turbZ: Math.min(0.82, pz + 0.28),
      peakHz: peakHz,
      centHz: centHz,
      peakSec: peakSec,
      crestDb: crestDb
    };
  }

  function startAnalysisScope(sample) {
    var specCanvas = $('labs-an-spec-canvas');
    var annotCanvas = $('labs-an-annot-canvas');
    var badgeEl = $('labs-an-scope-badge');
    var Spectrogram3D = TootApp && TootApp.Spectrogram3D;
    if (!specCanvas || !annotCanvas) return null;

    var featSpec = sample && sample.features && sample.features.spectrogram;
    var specData = (featSpec && featSpec.grid && featSpec.grid.length > 1) ? featSpec : buildFallbackAnalysisSpectrogram();
    var anchors = extractSpectrogramAnchors(sample, specData);

    var spec3d = null;
    if (Spectrogram3D) {
      try {
        spec3d = new Spectrogram3D(specCanvas, {
          spectrogram: specData,
          colormap: 'plasma',
          azimuth: 0.60,
          elevation: 0.50,
          zoom: 1.04
        });
        state.analysisSpec3d = spec3d;
      } catch (e) {
        spec3d = null;
      }
    }

    var views = [
      {
        az: 0.62, el: 0.52, zoom: 1.04, mode: '3D SURFACE SCAN',
        pins: [
          { x: anchors.peakX, y: anchors.peakY, z: anchors.peakZ, label: 'F0 PEAK · ' + anchors.peakHz + ' Hz', dx: 46, dy: -26, color: '#38BDF8', arrow: true, pulse: true },
          { x: anchors.onsetX, y: 0.34, z: anchors.onsetZ, label: 'T=' + anchors.peakSec.toFixed(2) + 's', dx: -48, dy: 24, color: '#22C55E', arrow: true }
        ]
      },
      {
        az: 0.12, el: 0.18, zoom: 1.12, mode: 'PRESSURE CREST PROFILE',
        pins: [
          { x: anchors.peakX, y: anchors.peakY, z: anchors.peakZ, label: 'CREST ' + anchors.crestDb.toFixed(1) + ' dB', dx: 44, dy: -20, color: '#FACC15', arrow: true, pulse: true },
          { x: anchors.onsetX, y: 0.18, z: anchors.onsetZ, label: 'VALVE RELEASE', dx: -46, dy: -24, color: '#38BDF8', arrow: true }
        ]
      },
      {
        az: 0.02, el: 1.38, zoom: 1.05, mode: 'HARMONIC RIDGE LOCK',
        pins: [
          { x: anchors.peakX, y: anchors.peakY, z: anchors.peakZ, label: 'FUNDAMENTAL · ' + anchors.peakHz + ' Hz', dx: 40, dy: -24, color: '#A78BFA', arrow: true, pulse: true },
          { x: anchors.turbX, y: 0.56, z: anchors.harmZ, label: 'HARMONIC RIDGE', dx: -44, dy: 26, color: '#34D399', arrow: true }
        ]
      },
      {
        az: -0.68, el: 0.44, zoom: 1.08, mode: 'SPECTRAL TURBULENCE MAP',
        pins: [
          { x: anchors.turbX, y: 0.64, z: anchors.turbZ, label: 'CENTROID · ' + anchors.centHz + ' Hz', dx: 42, dy: -24, color: '#F472B6', arrow: true, pulse: true },
          { x: anchors.tailX, y: 0.24, z: anchors.onsetZ, label: 'TURBULENCE ZONE', dx: -46, dy: 22, color: '#38BDF8', arrow: true }
        ]
      },
      {
        az: 0.94, el: 0.34, zoom: 1.08, mode: 'DECAY TAIL INTEGRAL',
        pins: [
          { x: anchors.peakX, y: anchors.peakY, z: anchors.peakZ, label: 'IMPULSE MAX', dx: -46, dy: -22, color: '#38BDF8', arrow: true },
          { x: anchors.tailX, y: 0.18, z: anchors.onsetZ, label: 'DECAY ENVELOPE', dx: 36, dy: -26, color: '#22C55E', arrow: true, pulse: true }
        ]
      },
      {
        az: 0.52, el: 0.50, zoom: 1.04, mode: 'A.S.S. v4.2 TELEMETRY LOCK',
        pins: [
          { x: anchors.peakX, y: anchors.peakY, z: anchors.peakZ, label: anchors.peakHz + ' Hz · LOCKED', dx: 42, dy: -24, color: '#4ADE80', arrow: true, pulse: true },
          { x: anchors.turbX, y: 0.58, z: anchors.harmZ, label: 'MODEL VERIFIED', dx: -46, dy: 24, color: '#7DD3FC', arrow: true }
        ]
      }
    ];

    var curViewIdx = 0;
    var stageSwitchAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    var targetPose = views[0];
    var isComplete = false;
    var stopped = false;

    function drawArrowHead(ctx, fromX, fromY, toX, toY, color) {
      var ang = Math.atan2(toY - fromY, toX - fromX);
      var len = 6.5;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - len * Math.cos(ang - 0.45), toY - len * Math.sin(ang - 0.45));
      ctx.lineTo(toX - len * Math.cos(ang + 0.45), toY - len * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function drawFrame(nowTs) {
      if (stopped) return;
      var tNow = typeof nowTs === 'number' ? nowTs : (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      var sec = tNow * 0.001;
      var stageElapsed = Math.max(0, tNow - stageSwitchAt);
      var sweep01 = isComplete ? null : ((sec * 0.55) % 1);

      if (spec3d && !spec3d._destroyed) {
        var tgtAz = targetPose.az + Math.sin(sec * 0.85) * 0.14;
        var tgtEl = targetPose.el + Math.cos(sec * 0.65) * 0.05;
        spec3d.azimuth += (tgtAz - spec3d.azimuth) * 0.08;
        spec3d.elevation += (tgtEl - spec3d.elevation) * 0.08;
        spec3d.zoom += (targetPose.zoom - spec3d.zoom) * 0.08;
        spec3d.playhead = sweep01;
        spec3d.render();
      }

      if (badgeEl) {
        var azDeg = spec3d ? Math.round((spec3d.azimuth * 180) / Math.PI) : Math.round((targetPose.az * 180) / Math.PI);
        var elDeg = spec3d ? Math.round((spec3d.elevation * 180) / Math.PI) : Math.round((targetPose.el * 180) / Math.PI);
        badgeEl.textContent = (isComplete ? 'VERIFIED · ' : targetPose.mode + ' · ') + 'AZ ' + azDeg + '° EL ' + elDeg + '°';
      }

      if (typeof annotCanvas.getContext === 'function') {
        var rect = typeof annotCanvas.getBoundingClientRect === 'function' ? annotCanvas.getBoundingClientRect() : null;
        var cw = rect && rect.width > 20 ? rect.width : 360;
        var ch = rect && rect.height > 20 ? rect.height : 196;
        var dpr = Math.min(2, root.devicePixelRatio || 1);
        var tw = Math.round(cw * dpr);
        var th = Math.round(ch * dpr);
        if (annotCanvas.width !== tw || annotCanvas.height !== th) {
          annotCanvas.width = tw;
          annotCanvas.height = th;
        }
        var ctx = annotCanvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cw, ch);

          // HUD corner calibration brackets
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.36)';
          ctx.lineWidth = 1.25;
          var br = 10;
          ctx.beginPath();
          ctx.moveTo(8, 8 + br); ctx.lineTo(8, 8); ctx.lineTo(8 + br, 8);
          ctx.moveTo(cw - 8 - br, 8); ctx.lineTo(cw - 8, 8); ctx.lineTo(cw - 8, 8 + br);
          ctx.moveTo(8, ch - 8 - br); ctx.lineTo(8, ch - 8); ctx.lineTo(8 + br, ch - 8);
          ctx.moveTo(cw - 8 - br, ch - 8); ctx.lineTo(cw - 8, ch - 8); ctx.lineTo(cw - 8, ch - 8 - br);
          ctx.stroke();

          if (spec3d && typeof spec3d._project === 'function' && spec3d._projCache) {
            var fadeAlpha = Math.min(1, stageElapsed / 240);
            ctx.save();
            ctx.globalAlpha = fadeAlpha;

            // Optional transient curve guide on Stage 4 (decay trace) or baseline on Stage 1
            if (curViewIdx === 4 || curViewIdx === 1) {
              var pStart = spec3d._project(anchors.peakX, anchors.peakY, anchors.peakZ);
              var pEnd = spec3d._project(curViewIdx === 1 ? anchors.peakX : anchors.tailX, 0.08, curViewIdx === 1 ? anchors.peakZ : anchors.onsetZ);
              if (Number.isFinite(pStart.x) && Number.isFinite(pEnd.x)) {
                ctx.save();
                ctx.setLineDash([4, 3]);
                ctx.strokeStyle = curViewIdx === 1 ? 'rgba(250, 204, 21, 0.72)' : 'rgba(34, 197, 94, 0.75)';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(pStart.x, pStart.y);
                ctx.lineTo(pEnd.x, pEnd.y);
                ctx.stroke();
                ctx.restore();
              }
            }

            var pins = targetPose.pins || [];
            ctx.font = '700 10px "JetBrains Mono", monospace';
            for (var pi = 0; pi < pins.length; pi++) {
              var pin = pins[pi];
              var pt = spec3d._project(pin.x, pin.y, pin.z);
              if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;

              // Target reticle
              var pulseR = pin.pulse ? 6 + 3.2 * (0.5 + 0.5 * Math.sin(sec * 6.0 + pi)) : 5;
              ctx.strokeStyle = pin.color;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pulseR, 0, Math.PI * 2);
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2.4, 0, Math.PI * 2);
              ctx.fillStyle = pin.color;
              ctx.fill();

              // Keep label box clamped inside canvas
              var twTxt = ctx.measureText(pin.label).width;
              var boxW = twTxt + 12;
              var boxH = 18;
              var lx = Math.max(10 + boxW * 0.5, Math.min(cw - 10 - boxW * 0.5, pt.x + pin.dx));
              var ly = Math.max(28, Math.min(ch - 14, pt.y + pin.dy));

              if (pin.arrow) {
                var edgeX = lx < pt.x ? lx + boxW * 0.5 : lx - boxW * 0.5;
                var ang = Math.atan2(pt.y - ly, pt.x - edgeX);
                var tipX = pt.x - Math.cos(ang) * (pulseR + 2);
                var tipY = pt.y - Math.sin(ang) * (pulseR + 2);
                ctx.strokeStyle = pin.color;
                ctx.lineWidth = 1.25;
                ctx.beginPath();
                ctx.moveTo(edgeX, ly);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
                drawArrowHead(ctx, edgeX, ly, tipX, tipY, pin.color);
              }

              ctx.fillStyle = 'rgba(6, 11, 22, 0.88)';
              ctx.fillRect(lx - boxW * 0.5, ly - boxH * 0.5, boxW, boxH);
              ctx.strokeStyle = pin.color;
              ctx.lineWidth = 1;
              ctx.strokeRect(lx - boxW * 0.5, ly - boxH * 0.5, boxW, boxH);
              ctx.fillStyle = '#F8FAFC';
              ctx.textAlign = 'center';
              ctx.fillText(pin.label, lx, ly + 3.5);
            }
            ctx.restore();
          }
        }
      }

      if (typeof requestAnimationFrame === 'function') {
        state.analysisScopeRaf = requestAnimationFrame(drawFrame);
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      state.analysisScopeRaf = requestAnimationFrame(drawFrame);
    } else {
      drawFrame(0);
    }

    return {
      setStage: function (idx) {
        curViewIdx = idx % views.length;
        targetPose = views[curViewIdx];
        stageSwitchAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      },
      setComplete: function () {
        isComplete = true;
        targetPose = views[views.length - 1];
        stageSwitchAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      },
      destroy: function () {
        stopped = true;
        if (state.analysisScopeRaf && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(state.analysisScopeRaf);
        }
        state.analysisScopeRaf = null;
        if (state.analysisSpec3d && typeof state.analysisSpec3d.destroy === 'function') {
          state.analysisSpec3d.destroy();
        }
        state.analysisSpec3d = null;
      }
    };
  }

  function runAnalysisSequence(opts, onComplete) {
    clearAnalysisSequence();
    opts = opts || {};

    var isFastCmp = opts.context === 'comparison' || opts.context === 'quickfire';
    var overlay = $('labs-analysis-overlay');
    var titleEl = $('labs-an-title');
    var stagesEl = $('labs-an-stages');
    var pctEl = $('labs-an-pct');
    var barEl = $('labs-an-bar-fill');
    var subEl = $('labs-an-subtitle');
    var consensusEl = $('labs-an-consensus');

    if (!overlay || !stagesEl) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    if (titleEl) {
      titleEl.textContent =
        opts.title || (opts.context === 'quickfire' ? 'SCORING QUICK-FIRE GAUNTLET' : isFastCmp ? 'ANALYZING RESULTS' : 'ANALYZING RECORDING');
    }
    if (consensusEl) consensusEl.classList.add('hidden');

    var stages = pickAnalysisStages(opts.context, { isSolo: Boolean(opts.isSolo) });
    var finished = false;
    var scopeCtrl = null;

    function finishNow(immediate) {
      if (finished) return;
      finished = true;
      for (var t = 0; t < state.analysisTimers.length; t++) {
        clearTimeout(state.analysisTimers[t]);
      }
      state.analysisTimers = [];
      state.analysisDoneCb = null;

      if (immediate) {
        if (scopeCtrl) scopeCtrl.destroy();
        if (consensusEl) consensusEl.classList.add('hidden');
        overlay.classList.add('hidden');
        overlay.classList.remove('fading-out');
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      if (scopeCtrl) scopeCtrl.setComplete();
      if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playAnalysisComplete === 'function') {
        TootLabs.AudioFx.playAnalysisComplete();
      }
      if (pctEl) pctEl.textContent = '100%';
      if (barEl) barEl.style.width = '100%';
      if (consensusEl) consensusEl.classList.remove('hidden');

      var fadeTimer = setTimeout(function () {
        overlay.classList.add('fading-out');
        var endTimer = setTimeout(function () {
          if (scopeCtrl) scopeCtrl.destroy();
          overlay.classList.add('hidden');
          overlay.classList.remove('fading-out');
          if (consensusEl) consensusEl.classList.add('hidden');
          if (typeof onComplete === 'function') onComplete();
        }, isFastCmp ? 220 : 310);
        state.analysisTimers.push(endTimer);
      }, isFastCmp ? 420 : 1050);
      state.analysisTimers.push(fadeTimer);
    }

    state.analysisDoneCb = function () {
      finishNow(true);
    };

    if (subEl) subEl.textContent = opts.subtitle || 'Executing A.S.S. v4.2 multi-dimensional acoustic pipeline...';
    if (pctEl) pctEl.textContent = '0%';
    if (barEl) barEl.style.width = '0%';
    stagesEl.innerHTML = '';
    overlay.classList.remove('hidden', 'fading-out');
    scopeCtrl = startAnalysisScope(opts.sample || null);

    var elapsed = 0;
    for (var sIdx = 0; sIdx < stages.length; sIdx++) {
      (function (index, stage) {
        var rowEl = null;
        var startTimer = setTimeout(function () {
          if (finished) return;
          if (scopeCtrl) scopeCtrl.setStage(index);
          rowEl = document.createElement('li');
          rowEl.className = 'labs-an-stage' + (stage.rare ? ' rare' : '') + (stage.scientist ? ' scientist' : '');
          rowEl.innerHTML =
            '<span class="labs-an-stage-ico">' + (stage.scientist ? '🥼' : '◌') + '</span>' +
            '<span class="labs-an-stage-txt">' + esc(stage.text) + '</span>';
          if (typeof stagesEl.appendChild === 'function') {
            stagesEl.appendChild(rowEl);
          } else {
            stagesEl.innerHTML = stagesEl.innerHTML + '<li class="' + rowEl.className + '">' + rowEl.innerHTML + '</li>';
          }
          try { stagesEl.scrollTop = stagesEl.scrollHeight; } catch (e) {}

          var startPct = Math.round(((index + 0.35) / stages.length) * 96);
          if (pctEl) pctEl.textContent = startPct + '%';
          if (barEl) barEl.style.width = startPct + '%';
        }, elapsed);
        state.analysisTimers.push(startTimer);

        elapsed += stage.durationMs;

        var doneTimer = setTimeout(function () {
          if (finished) return;
          if (rowEl) {
            rowEl.classList.add('done');
            var ico = rowEl.querySelector ? rowEl.querySelector('.labs-an-stage-ico') : null;
            if (ico) ico.textContent = '✓';
          }
          var donePct = Math.round(((index + 1) / stages.length) * 98);
          if (pctEl) pctEl.textContent = donePct + '%';
          if (barEl) barEl.style.width = donePct + '%';
          if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playLabTick === 'function') {
            TootLabs.AudioFx.playLabTick(index);
          }
          if (index === stages.length - 1) {
            var pauseTimer = setTimeout(function () {
              finishNow(false);
            }, isFastCmp ? 160 : 360);
            state.analysisTimers.push(pauseTimer);
          }
        }, elapsed);
        state.analysisTimers.push(doneTimer);
      })(sIdx, stages[sIdx]);
    }
  }

  function setRecordMode(mode) {
    var next = mode === 'auto' ? 'auto' : 'manual';
    state.recordMode = next;
    var btns = document.querySelectorAll('.labs-rec-mode-btn[data-rec-mode]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-rec-mode') === next);
    }

    var sentryBtn = $('btn-home-sentry-toggle');
    if (sentryBtn) {
      sentryBtn.classList.toggle('active', next === 'auto');
      sentryBtn.setAttribute('aria-pressed', next === 'auto' ? 'true' : 'false');
      sentryBtn.textContent = next === 'auto' ? '● AUTO DETECT: ON' : '○ AUTO DETECT: OFF';
    }

    var recDesc = $('home-rec-desc');
    if (recDesc) {
      recDesc.textContent =
        next === 'auto'
          ? 'Automated acoustic capture armed — verified specimens are logged directly to the Research Archive.'
          : 'Manual acoustic capture protocol — recorded specimens are indexed directly to the Research Archive.';
    }
  }

  function destroyRevealSpecs() {
    if (state.revealSpecA) {
      try { state.revealSpecA.partners = []; } catch (e) {}
      if (typeof state.revealSpecA.destroy === 'function') {
        try { state.revealSpecA.destroy(); } catch (e) {}
      }
    }
    if (state.revealSpecB) {
      try { state.revealSpecB.partners = []; } catch (e) {}
      if (typeof state.revealSpecB.destroy === 'function') {
        try { state.revealSpecB.destroy(); } catch (e) {}
      }
    }
    state.revealSpecA = null;
    state.revealSpecB = null;
  }

  function clearRevealTimers() {
    state.revealGen = (state.revealGen || 0) + 1;
    if (state.revealTimerId) {
      clearTimeout(state.revealTimerId);
      state.revealTimerId = null;
    }
    if (state.revealFallbackTimerId) {
      clearTimeout(state.revealFallbackTimerId);
      state.revealFallbackTimerId = null;
    }
    if (Array.isArray(state.revealStepTimers)) {
      for (var i = 0; i < state.revealStepTimers.length; i++) {
        clearTimeout(state.revealStepTimers[i]);
      }
      state.revealStepTimers = [];
    }
    state.revealSkipCb = null;
    state.revealInProgress = false;
    destroyRevealSpecs();
    if (root.TootApp && root.TootApp.Audio && typeof root.TootApp.Audio.stopChannel === 'function') {
      root.TootApp.Audio.stopChannel('guess_reveal');
    }
    var revBanner = $('guess-reveal-banner');
    var revBar = $('guess-reveal-bar');
    var paneA = $('reveal-pane-orig');
    var paneB = $('reveal-pane-guess');
    var sealTitleEl = $('reveal-seal-title');
    var sealSubEl = $('reveal-seal-sub');
    if (paneA) paneA.classList.remove('is-playing-orig', 'is-dimmed', 'is-cueing-pane', 'is-cueing-mystery');
    if (paneB) paneB.classList.remove('is-playing-guess', 'is-dimmed', 'is-cueing-pane');
    if (revBanner) {
      revBanner.classList.remove('is-processing', 'is-playing-live', 'is-mystery-finale');
      revBanner.classList.add('hidden');
    }
    if (sealTitleEl) sealTitleEl.textContent = 'MYSTERY FART';
    if (sealSubEl) sealSubEl.textContent = 'Real sound plays last!';
    if (revBar) {
      revBar.classList.remove('filling');
      if (revBar.style) revBar.style.width = '0%';
    }
  }

  function destroyInlineSpecs() {
    if (state.inlineSpecA && typeof state.inlineSpecA.destroy === 'function') {
      try { state.inlineSpecA.destroy(); } catch (e) {}
    }
    if (state.inlineSpecB && typeof state.inlineSpecB.destroy === 'function') {
      try { state.inlineSpecB.destroy(); } catch (e) {}
    }
    state.inlineSpecA = null;
    state.inlineSpecB = null;
  }

  function clearResultAnimations() {
    clearRevealTimers();
    destroyInlineSpecs();
    for (var i = 0; i < state.resultTimers.length; i++) {
      clearTimeout(state.resultTimers[i]);
    }
    state.resultTimers = [];
    if (state.resultCounterRaf) {
      cancelAnimationFrame(state.resultCounterRaf);
      state.resultCounterRaf = null;
    }
    if (state.confettiHandle && typeof state.confettiHandle.stop === 'function') {
      state.confettiHandle.stop();
      state.confettiHandle = null;
    }
  }

  function clearVaultDoorTimers() {
    for (var i = 0; i < state.vaultDoorTimers.length; i++) {
      clearTimeout(state.vaultDoorTimers[i]);
    }
    state.vaultDoorTimers = [];
  }

  function dismissVaultDoorImmediate() {
    clearVaultDoorTimers();
    var chamber = $('vault-chamber');
    var stage = $('vault-door-stage');
    if (chamber) chamber.classList.remove('door-active');
    if (stage) {
      stage.classList.remove('sealed', 'opening', 'closing-prep', 'closing');
      stage.classList.add('opened');
    }
  }

  function resealVaultAndReturn(opts) {
    opts = opts || {};
    clearVaultDoorTimers();
    if (root.TootApp && root.TootApp.Audio && typeof root.TootApp.Audio.stopAll === 'function') {
      root.TootApp.Audio.stopAll();
    }
    var dest = state.prevBeforeVault && state.prevBeforeVault !== 'vault' && state.prevBeforeVault !== 'detail'
      ? state.prevBeforeVault
      : 'home';

    function finishReturn() {
      dismissVaultDoorImmediate();
      showView(dest);
      if (dest === 'home') renderHomeView();
      else if (dest === 'guess') renderGuessView();
      else if (dest === 'fartnalysis') renderFartnalysisView();
    }

    var chamber = $('vault-chamber');
    var stage = $('vault-door-stage');
    var statusEl = $('vault-door-status');
    if (opts.immediate || !stage) {
      finishReturn();
      return dest;
    }

    if (statusEl) {
      statusEl.textContent = 'PRESSURE SEAL · ENGAGING LOCK…';
    }
    if (chamber) chamber.classList.add('door-active');
    stage.classList.remove('opened', 'opening', 'sealed', 'closing');
    stage.classList.add('closing-prep');
    try {
      void stage.offsetWidth;
    } catch (e) {}

    var t1 = setTimeout(function () {
      stage.classList.remove('closing-prep');
      stage.classList.add('closing');
      if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playVaultDoorOpen === 'function') {
        TootLabs.AudioFx.playVaultDoorOpen();
      }
    }, 20);

    var t2 = setTimeout(function () {
      finishReturn();
    }, 380);

    state.vaultDoorTimers.push(t1, t2);
    return dest;
  }

  function triggerVaultDoorOpen() {
    clearVaultDoorTimers();
    var chamber = $('vault-chamber');
    var stage = $('vault-door-stage');
    var countEl = $('vault-door-count');
    var statusEl = $('vault-door-status');
    if (!stage) return;

    if (countEl) {
      var buckets = getVaultBuckets();
      var fartCount = buckets.counts.recorded + buckets.counts.defaults;
      var guessCount = buckets.counts.guesses;
      countEl.textContent = guessCount > 0
        ? fartCount + (fartCount === 1 ? ' FART' : ' FARTS') + ' · ' + guessCount + (guessCount === 1 ? ' GUESS' : ' GUESSES')
        : fartCount + (fartCount === 1 ? ' SPECIMEN' : ' SPECIMENS');
    }
    if (statusEl) {
      statusEl.textContent = 'PRESSURE SEAL · DEPRESSURIZING…';
    }
    if (chamber) chamber.classList.add('door-active');

    stage.classList.remove('opened', 'opening');
    stage.classList.add('sealed');
    try {
      void stage.offsetWidth;
    } catch (e) {}

    var t1 = setTimeout(function () {
      stage.classList.remove('sealed');
      stage.classList.add('opening');
      if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playVaultDoorOpen === 'function') {
        TootLabs.AudioFx.playVaultDoorOpen();
      }
    }, 35);

    var t2 = setTimeout(function () {
      dismissVaultDoorImmediate();
    }, 1220);

    state.vaultDoorTimers.push(t1, t2);
  }

  function renderTeamView() {
    var grid = $('team-faculty-grid');
    if (!grid) return;
    var team = (TootLabs.Fartnalysis && TootLabs.Fartnalysis.TEAM) || [];
    grid.innerHTML = team
      .map(function (sci) {
        var specsHtml = (sci.specialities || [])
          .map(function (sp) {
            return '<span class="labs-chip">' + esc(sp) + '</span>';
          })
          .join('');
        return (
          '<article class="labs-glass-card labs-team-card">' +
          '  <div class="labs-team-head">' +
          '    <img class="labs-team-avatar" src="' + esc(sci.img) + '" alt="' + esc(sci.name) + '" loading="lazy" />' +
          '    <div>' +
          '      <div class="labs-eyebrow">' + esc(sci.title) + '</div>' +
          '      <h3 class="labs-team-name">' + esc(sci.name) + '</h3>' +
          '    </div>' +
          '  </div>' +
          '  <p class="labs-team-bio">' + esc(sci.bio) + '</p>' +
          '  <div class="labs-team-specs-wrap">' +
          '    <span class="labs-eyebrow">SPECIALITIES</span>' +
          '    <div class="labs-team-spec-pills">' + specsHtml + '</div>' +
          '  </div>' +
          '</article>'
        );
      })
      .join('');
  }

  function openTeamView() {
    if (state.view && state.view !== 'team') {
      state.prevNonTeamView = state.view;
    }
    renderTeamView();
    showView('team');
  }

  /* ==================== NAVIGATION ==================== */
  function closeSettingsMenu() {
    var menu = $('labs-settings-menu');
    var gear = $('btn-labs-settings');
    if (menu) menu.classList.add('hidden');
    if (gear) gear.setAttribute('aria-expanded', 'false');
  }

  function toggleSettingsMenu(ev) {
    if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
    var menu = $('labs-settings-menu');
    var gear = $('btn-labs-settings');
    if (!menu) return;
    var nextOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !nextOpen);
    if (gear) gear.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
  }

  function openAboutModal() {
    closeSettingsMenu();
    var m = $('labs-about-modal');
    if (m) m.classList.remove('hidden');
  }

  function closeAboutModal() {
    var m = $('labs-about-modal');
    if (m) m.classList.add('hidden');
  }

  function openSplashModal() {
    closeSettingsMenu();
    var m = $('labs-splash-modal');
    if (m) m.classList.remove('hidden');
  }

  function closeSplashModal() {
    var m = $('labs-splash-modal');
    if (m) m.classList.add('hidden');
    var chk = $('chk-splash-hide');
    if (chk && chk.checked) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          localStorage.setItem('toot_labs_seen_splash_v1', '1');
        }
      } catch (e) {}
    }
  }

  function showView(viewKey) {
    closeSettingsMenu();
    if (viewKey === 'result') viewKey = 'guess';
    var prevView = state.view;
    if (prevView === 'guess' && viewKey !== 'guess') {
      clearResultAnimations();
      abortQuickFireRound(true);
      if (state.seqActive) {
        abortSequenceRound(true);
      }
    }
    if (prevView === 'vault' && viewKey !== 'vault') {
      dismissVaultDoorImmediate();
    }
    if (viewKey !== 'team' && prevView !== 'team') {
      state.prevNonTeamView = prevView;
    }
    if (viewKey === 'vault' && prevView && prevView !== 'vault' && prevView !== 'detail' && prevView !== 'team') {
      state.prevBeforeVault = prevView;
    }
    if (viewKey === 'fartnalysis' && prevView && prevView !== 'fartnalysis' && prevView !== 'team') {
      state.prevBeforeFartnalysis =
        prevView === 'vault' || prevView === 'detail'
          ? 'vault'
          : prevView === 'guess'
          ? 'guess'
          : prevView === 'realfake'
          ? 'realfake'
          : prevView === 'chain'
          ? 'chain'
          : prevView === 'games'
          ? 'games'
          : 'home';
    }
    state.view = viewKey;
    if (document.body && typeof document.body.setAttribute === 'function') {
      document.body.setAttribute('data-labs-view', viewKey);
    }

    var brandSub = $('labs-brand-sub');
    if (brandSub) {
      brandSub.textContent = 'INSTITUTE OF ACOUSTIC FLATULENCE RESEARCH';
    }

    var views = document.querySelectorAll('.labs-view');
    for (var i = 0; i < views.length; i++) {
      views[i].classList.toggle('active', views[i].id === 'labs-view-' + viewKey);
    }

    var navTarget =
      viewKey === 'vault' || viewKey === 'detail'
        ? 'vault'
        : viewKey === 'fartnalysis'
        ? 'fartnalysis'
        : viewKey === 'games' || viewKey === 'guess' || viewKey === 'realfake' || viewKey === 'chain'
        ? 'games'
        : viewKey === 'team'
        ? 'settings'
        : 'home';

    var navBtns = document.querySelectorAll('.labs-nav-btn');
    for (var n = 0; n < navBtns.length; n++) {
      navBtns[n].classList.toggle('active', navBtns[n].getAttribute('data-view') === navTarget);
    }

    if (typeof root.scrollTo === 'function') {
      root.scrollTo(0, 0);
    }

    if (viewKey === 'vault') {
      dismissVaultDoorImmediate();
    }
    if (viewKey === 'team') {
      renderTeamView();
    }

    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        if (viewKey === 'detail') drawDetailWaveform(null);
        else if (viewKey === 'guess') {
          drawGuessWaveforms();
          if (state.inlineSpecA) state.inlineSpecA.resize();
          if (state.inlineSpecB) state.inlineSpecB.resize();
        } else if (viewKey === 'fartnalysis' && state.fnController) {
          state.fnController.resize();
        } else if (viewKey === 'realfake') {
          renderRealFakeStage();
        } else if (viewKey === 'chain' && TootLabs.SignalChain && TootLabs.SignalChain.resize) {
          TootLabs.SignalChain.resize();
        }
      });
    }
  }

  /* ==================== MIC DRAWER & RECORDERS ==================== */
  function refreshMicDevices() {
    var sel = $('labs-mic-device');
    if (!sel || !root.TootApp || !root.TootApp.Audio) return Promise.resolve();
    var currentVal = TootApp.Audio.getSelectedDevice() || sel.value || '';

    return TootApp.Audio.listInputDevices().then(function (devices) {
      var html = '<option value="">System Default Microphone</option>';
      for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        var lbl = d.label || 'Microphone ' + (i + 1) + ' (grant permission)';
        html += '<option value="' + esc(d.deviceId) + '">' + esc(lbl) + '</option>';
      }
      sel.innerHTML = html;
      if (currentVal) sel.value = currentVal;
      var modalSel = $('labs-settings-mic-select');
      if (modalSel) {
        modalSel.innerHTML = html;
        if (currentVal) modalSel.value = currentVal;
      }
    });
  }

  function resetMicTestUI(statusTxt) {
    var btn = $('btn-labs-mic-test');
    var meter = $('labs-mic-meter');
    var st = $('labs-mic-status');
    if (btn) btn.textContent = '🔊 Test Input';
    if (meter) meter.style.width = '0%';
    if (st && statusTxt) st.textContent = statusTxt;
  }

  function initMicControls() {
    var devSel = $('labs-mic-device');
    var boostSel = $('labs-mic-boost');
    var testBtn = $('btn-labs-mic-test');
    var releaseBtn = $('btn-labs-mic-release');
    var statusEl = $('labs-mic-status');
    var meterEl = $('labs-mic-meter');

    devSel.addEventListener('change', function () {
      TootApp.Audio.setSelectedDevice(this.value);
      if (TootApp.Audio.isMicTesting()) testBtn.click();
    });

    boostSel.addEventListener('change', function () {
      TootApp.Audio.setMicBoost(parseFloat(this.value) || 1.0);
    });

    testBtn.addEventListener('click', function () {
      if (TootApp.Audio.isMicTesting()) {
        TootApp.Audio.stopMicTest();
        resetMicTestUI('Ready');
        return;
      }
      var zeroFrames = 0;
      testBtn.textContent = '⏹ Stop Test';
      statusEl.textContent = 'Opening microphone…';
      TootApp.Audio.startMicTest(function (info) {
        var pct = Math.min(100, Math.round(Math.max(info.rms * 420, info.peak * 110)));
        meterEl.style.width = pct + '%';
        zeroFrames = info.peak < 1e-6 ? zeroFrames + 1 : 0;
        if (info.muted) {
          statusEl.textContent = '⚠️ ' + info.trackLabel + ' reports muted';
        } else if (zeroFrames > 45) {
          statusEl.textContent = '⚠️ No signal on ' + info.trackLabel;
        } else {
          statusEl.textContent = 'Live: ' + info.trackLabel;
        }
      })
        .then(function (meta) {
          statusEl.textContent = 'Live: ' + meta.trackLabel;
          refreshMicDevices();
        })
        .catch(function (err) {
          resetMicTestUI(err && err.message ? err.message : 'Mic test failed');
          showToast(err && err.message ? err.message : 'Mic test failed', true);
        });
    });

    releaseBtn.addEventListener('click', function () {
      if (TootApp.Audio.isMicTesting()) TootApp.Audio.stopMicTest();
      if (TootApp.Audio.releaseMic) TootApp.Audio.releaseMic();
      resetMicTestUI('Mic released');
      showToast('Microphone released');
    });

    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', refreshMicDevices);
    }
    refreshMicDevices();
  }

  /* Instant 1-Tap Quick Record & Auto Detect (Record New Fart Only) */
  function startQuickRecordFart() {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (state.recordingKind === 'quick' && TootApp.Audio.isRecording() && state.activeRecStopper) {
        state.activeRecStopper();
      }
      return;
    }

    resetMicTestUI('Ready');
    clearAutoDetectUI();
    state.recordingKind = 'quick';
    var useAuto = state.recordMode === 'auto' && typeof TootApp.Audio.startAutoDetect === 'function';
    var bar = $('labs-quick-rec-bar');
    var capPane = $('labs-quick-capturing');
    var timerEl = $('labs-quick-timer');
    var waveEl = $('labs-quick-wave');
    var stopBtn = $('btn-quick-stop-save');
    var cancelAutoBtn = $('btn-quick-cancel-auto');
    var autoBadge = $('labs-quick-auto-status');
    var autoTitleEl = $('labs-quick-auto-title');
    var autoMsgEl = $('labs-quick-auto-msg');
    var autoBufEl = $('labs-quick-auto-buf');
    var settled = false;
    var autoWaitIdx = 0;

    bar.classList.remove('hidden');
    capPane.classList.remove('hidden');
    stopBtn.disabled = false;
    stopBtn.textContent = '⏹ Stop & Save';
    state.activeRecCanceller = null;

    var isWarm = Boolean(TootApp.Audio.hasWarmMic && TootApp.Audio.hasWarmMic());
    if (useAuto) {
      timerEl.textContent = isWarm ? 'Arming sensors…' : 'Requesting mic…';
      if (cancelAutoBtn) {
        cancelAutoBtn.classList.remove('hidden');
        cancelAutoBtn.disabled = false;
      }
      if (autoBadge) {
        autoBadge.classList.remove('hidden', 'triggered');
        if (autoTitleEl) autoTitleEl.textContent = 'LISTENING FOR EVENT';
        if (autoMsgEl) autoMsgEl.textContent = 'Acoustic sensors armed — ' + AUTO_DETECT_WAIT_MESSAGES[0];
        if (autoBufEl) autoBufEl.textContent = 'Buffer: 0.0s / 5.0s';
      }
    } else {
      timerEl.textContent = isWarm ? 'Recording…' : 'Requesting mic…';
      if (cancelAutoBtn) cancelAutoBtn.classList.add('hidden');
    }

    function finalizeQuick(res) {
      if (settled) return;
      settled = true;
      clearAutoDetectUI();
      state.activeRecStopper = null;
      state.activeRecCanceller = null;
      state.recordingKind = null;
      stopBtn.textContent = '⏹ Stop & Save';
      stopBtn.disabled = false;
      if (cancelAutoBtn) {
        cancelAutoBtn.classList.add('hidden');
        cancelAutoBtn.disabled = false;
      }

      if (!res || res.reason === 'cancelled') {
        capPane.classList.add('hidden');
        bar.classList.add('hidden');
        if (res && res.reason === 'cancelled') {
          showToast('Auto Detect disarmed');
        }
        return;
      }

      if (!res.ok) {
        capPane.classList.add('hidden');
        bar.classList.add('hidden');
        var micName = (res && res.trackLabel) || 'Default Microphone';
        var msg;
        if (res && res.reason === 'all_zeros') {
          msg = 'No sound captured from "' + micName + '" — check Microphone settings below.';
          $('labs-mic-drawer').classList.remove('hidden');
        } else if (res && res.reason === 'too_quiet') {
          msg = 'No fart energy captured on "' + micName + '" — try getting closer or 2x/4x Boost below.';
          $('labs-mic-drawer').classList.remove('hidden');
        } else {
          msg = (res && res.error) || 'Could not capture audio. Check microphone permissions.';
        }
        showToast(msg, true);
        return;
      }

      capPane.classList.add('hidden');
      bar.classList.add('hidden');
      TootLabs.Store.saveNewSpecimen(res).then(function (saved) {
        state.samples.unshift(saved);
        state.quickSavedId = saved.id;
        if (!state.guessTargetId || state.view === 'guess') {
          state.guessTargetId = saved.id;
          state.guessAttempts = [];
          state.sessionGuesses = [];
          state.pendingGuess = null;
          state.guessMode = 'guess';
          state.guessRevealed = false;
          state.lastOutcome = null;
          state.lastSessionResults = [];
        }
        state.fnSampleId = saved.id;

        renderHomeView();
        if (state.view === 'vault') renderVaultView();
        if (state.view === 'guess') renderGuessView();

        runAnalysisSequence(
          {
            context: 'specimen',
            sample: saved,
            title: 'ANALYZING RECORDING',
            subtitle: 'Cataloging "' + getSampleName(saved) + '" in Bio-Acoustic Vault'
          },
          function () {
            bar.classList.add('hidden');
            showToast('Saved "' + getSampleName(saved) + '" — opening Fartnalysis!');
            openFartnalysis('original', saved.id, null);
          }
        );
      });
    }

    if (useAuto) {
      state.activeRecStopper = function () {
        stopBtn.disabled = true;
        if (cancelAutoBtn) cancelAutoBtn.disabled = true;
        timerEl.textContent = 'Saving captured audio…';
        TootApp.Audio.stopAutoDetect(false).then(function (res) {
          if (res && res.ok && TootLabs.AudioFx && typeof TootLabs.AudioFx.playAutoDetectStopBeep === 'function') {
            TootLabs.AudioFx.playAutoDetectStopBeep();
          }
          finalizeQuick(res);
        });
      };

      state.activeRecCanceller = function () {
        stopBtn.disabled = true;
        if (cancelAutoBtn) cancelAutoBtn.disabled = true;
        timerEl.textContent = 'Disarming sensors…';
        TootApp.Audio.stopAutoDetect(true).then(function (res) {
          finalizeQuick(res || { ok: false, reason: 'cancelled' });
        });
      };

      TootApp.Audio.startAutoDetect({
        settleSec: 0.28,
        onStarted: function () {
          if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playAutoDetectStartBeep === 'function') {
            TootLabs.AudioFx.playAutoDetectStartBeep();
          }
          timerEl.textContent = 'Buffer 0.0 / 5.0s';
          refreshMicDevices();
          state.autoDetectMsgTimer = setInterval(function () {
            autoWaitIdx = (autoWaitIdx + 1) % AUTO_DETECT_WAIT_MESSAGES.length;
            if (autoMsgEl) {
              autoMsgEl.textContent = 'Acoustic sensors armed — ' + AUTO_DETECT_WAIT_MESSAGES[autoWaitIdx];
            }
          }, 2200);
        },
        onLevel: function (timeData, rms, info) {
          if (info && info.phase === 'triggered') {
            timerEl.textContent = 'Capturing event…';
            if (autoBufEl) autoBufEl.textContent = 'EVENT LOCKED';
          } else {
            var bTxt = info ? info.bufferedSec.toFixed(1) : '0.0';
            timerEl.textContent = 'Buffer ' + bTxt + ' / 5.0s';
            if (autoBufEl) {
              autoBufEl.textContent =
                'Buffer: ' + bTxt + 's / 5.0s' + (info && info.inSpeechContext ? ' · Filtering TV/speech' : '');
            }
          }
          drawLiveWaveform(waveEl, timeData, rms);
        },
        onDetected: function () {
          if (state.autoDetectMsgTimer) {
            clearInterval(state.autoDetectMsgTimer);
            state.autoDetectMsgTimer = null;
          }
          var trigHead = AUTO_DETECT_TRIGGER_TITLES[Math.floor(Math.random() * AUTO_DETECT_TRIGGER_TITLES.length)];
          stopBtn.textContent = '⏹ Stop & Save';
          if (autoBadge) autoBadge.classList.add('triggered');
          if (autoTitleEl) autoTitleEl.textContent = trigHead;
          if (autoMsgEl) autoMsgEl.textContent = 'Capturing sample...';
          if (autoBufEl) autoBufEl.textContent = 'EVENT LOCKED';
        },
        onRearmed: function (info) {
          stopBtn.textContent = '⏹ Stop & Save';
          if (autoBadge) autoBadge.classList.remove('triggered');
          if (autoTitleEl) autoTitleEl.textContent = 'LISTENING FOR EVENT';
          if (autoMsgEl) {
            autoMsgEl.textContent = (info && info.rearmMessage) || 'Filtered non-fart sound — Sentry re-armed';
          }
          if (!state.autoDetectMsgTimer) {
            state.autoDetectMsgTimer = setInterval(function () {
              autoWaitIdx = (autoWaitIdx + 1) % AUTO_DETECT_WAIT_MESSAGES.length;
              if (autoMsgEl) {
                autoMsgEl.textContent = 'Acoustic sensors armed — ' + AUTO_DETECT_WAIT_MESSAGES[autoWaitIdx];
              }
            }, 2200);
          }
        },
        onAutoStop: function (res) {
          // Mic is already stopped & disconnected inside audioEngine before onAutoStop runs
          if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playAutoDetectStopBeep === 'function') {
            TootLabs.AudioFx.playAutoDetectStopBeep();
          }
          finalizeQuick(res);
        }
      }).catch(function (err) {
        settled = true;
        clearAutoDetectUI();
        state.activeRecStopper = null;
        state.activeRecCanceller = null;
        state.recordingKind = null;
        stopBtn.textContent = '⏹ Stop & Save';
        if (cancelAutoBtn) {
          cancelAutoBtn.classList.add('hidden');
          cancelAutoBtn.disabled = false;
        }
        bar.classList.add('hidden');
        showToast((err && err.message) || 'Microphone unavailable.', true);
      });
      return;
    }

    state.activeRecStopper = function () {
      stopBtn.disabled = true;
      timerEl.textContent = 'Auto-clipping & saving…';
      TootApp.Audio.stopRecording().then(function (res) {
        if (res && res.ok && TootLabs.AudioFx && typeof TootLabs.AudioFx.playAutoDetectStopBeep === 'function') {
          TootLabs.AudioFx.playAutoDetectStopBeep();
        }
        finalizeQuick(res);
      });
    };

    TootApp.Audio.startRecording({
      maxDurationSec: 7,
      onStarted: function () {
        if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playAutoDetectStartBeep === 'function') {
          TootLabs.AudioFx.playAutoDetectStartBeep();
        }
        timerEl.textContent = 'Recording 0.0s…';
        refreshMicDevices();
      },
      onLevel: function (timeData, rms, elapsed) {
        timerEl.textContent = 'Recording ' + elapsed.toFixed(1) + 's';
        drawLiveWaveform(waveEl, timeData, rms);
      },
      onAutoStop: function (res) {
        if (res && res.ok && TootLabs.AudioFx && typeof TootLabs.AudioFx.playAutoDetectStopBeep === 'function') {
          TootLabs.AudioFx.playAutoDetectStopBeep();
        }
        finalizeQuick(res);
      }
    }).catch(function (err) {
      settled = true;
      state.activeRecStopper = null;
      state.recordingKind = null;
      bar.classList.add('hidden');
      showToast((err && err.message) || 'Microphone unavailable.', true);
    });
  }

  /* Clean Manual GUESS / MIMIC Capture Only (No Auto Detect on Guess Screen) */
  function startGuessCapture() {
    if (state.revealInProgress) return;
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (state.recordingKind === 'guess' && TootApp.Audio.isRecording() && state.activeRecStopper) {
        state.activeRecStopper();
      }
      return;
    }

    var target = getSampleById(state.guessTargetId);
    if (!target) {
      showToast('Record or select a saved fart on Home first!', true);
      return;
    }

    ensureTargetReady(target).catch(function () {});
    resetMicTestUI('Ready');
    state.recordingKind = 'guess';
    var btn = $('btn-guess-rec');
    var playFirstBtn = $('btn-guess-play-first');
    var labelEl = $('guess-rec-label');
    var subEl = $('guess-rec-sub');
    var iconEl = $('guess-rec-icon');
    var statusEl = $('guess-rec-status');
    var waveCanvas = $('guess-live-wave');
    var settled = false;

    if (playFirstBtn) playFirstBtn.disabled = true;
    statusEl.classList.remove('hidden');
    var isWarm = Boolean(TootApp.Audio.hasWarmMic && TootApp.Audio.hasWarmMic());
    if (!isWarm) {
      btn.disabled = true;
      labelEl.textContent = 'Requesting Mic…';
      if (subEl) subEl.textContent = 'Allow microphone access to record';
      iconEl.textContent = '⏳';
      statusEl.textContent = 'Requesting microphone permission…';
    } else {
      statusEl.textContent = 'Arming microphone…';
    }
    waveCanvas.classList.remove('hidden');

    function finalizeGuess(res) {
      if (settled) return;
      settled = true;
      state.activeRecStopper = null;
      state.recordingKind = null;
      btn.disabled = false;
      btn.classList.remove('recording');
      waveCanvas.classList.add('hidden');

      if (!res || !res.ok) {
        renderGuessView();
        var micName = (res && res.trackLabel) || 'Default Microphone';
        var msg =
          res && res.reason === 'all_zeros'
            ? 'No audio captured from "' + micName + '". Check Microphone settings.'
            : res && res.reason === 'too_quiet'
            ? 'Recording was too quiet — increase Gain in Microphone settings.'
            : (res && res.error) || 'Could not record guess.';
        statusEl.classList.remove('hidden');
        statusEl.textContent = msg;
        showToast(msg, true);
        return;
      }

      statusEl.classList.add('hidden');
      var sr = res.sampleRate || 44100;
      var samples = res.clippedSamples;
      var preBreath = (res.clipInfo && res.clipInfo.preOnsetBreath) || null;
      var guessFeat = TootApp.DSP.extractFeatures(samples, sr);
      if (guessFeat && preBreath) guessFeat.preOnsetBreath = preBreath;

      var defaultNum = state.sessionGuesses.length + 1;
      var nameInput = $('guess-name-input');
      var typedName = nameInput && nameInput.value ? nameInput.value.trim() : '';
      var guessName = typedName || ('Player ' + defaultNum);

      var entry = {
        id: 'att_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: guessName,
        isDefaultName: !typedName,
        sampleRate: sr,
        samples: samples,
        rawSamples: res.rawSamples || samples,
        clipInfo: res.clipInfo,
        preOnsetBreath: preBreath,
        features: guessFeat
      };

      state.pendingGuess = null;
      state.lastOutcome = null;
      state.lastSessionResults = [];
      state.sessionGuesses.push(entry);
      if (nameInput) {
        nameInput.value = '';
        nameInput.placeholder = 'Player ' + (state.sessionGuesses.length + 1);
      }
      renderGuessView();
      showToast(entry.name + ' locked! Tap Score Now or record ' + ordinalPlayerLabel(state.sessionGuesses.length + 1) + '.');
    }

    state.activeRecStopper = function () {
      btn.disabled = true;
      statusEl.textContent = 'Auto-clipping recording…';
      TootApp.Audio.stopRecording().then(finalizeGuess);
    };

    TootApp.Audio.startRecording({
      maxDurationSec: 7,
      onStarted: function () {
        btn.disabled = false;
        btn.classList.add('recording');
        labelEl.textContent = state.guessMode === 'mimic' ? 'Stop Mimic' : 'Stop Guess';
        if (subEl) subEl.textContent = 'Tap when finished';
        iconEl.textContent = '⏹';
        refreshMicDevices();
      },
      onLevel: function (timeData, rms, elapsed) {
        drawLiveWaveform(waveCanvas, timeData, rms);
        statusEl.textContent = 'Recording ' + elapsed.toFixed(1) + 's — tap Stop when done';
      },
      onAutoStop: function (res) {
        finalizeGuess(res);
      }
    }).catch(function (err) {
      settled = true;
      state.activeRecStopper = null;
      state.recordingKind = null;
      btn.disabled = false;
      btn.classList.remove('recording');
      waveCanvas.classList.add('hidden');
      statusEl.classList.add('hidden');
      renderGuessView();
      showToast((err && err.message) || 'Microphone unavailable.', true);
    });
  }

  /* ==================== VAULT CATEGORY BUCKETS & CARDS ==================== */
  function upsertAttemptsIntoCache(attemptsList) {
    if (!Array.isArray(attemptsList) || attemptsList.length === 0) return;
    var byId = {};
    var i;
    for (i = 0; i < (state.allAttemptsCache || []).length; i++) {
      var ex = state.allAttemptsCache[i];
      if (ex && ex.id) byId[ex.id] = ex;
    }
    for (i = 0; i < attemptsList.length; i++) {
      var item = attemptsList[i];
      if (item && item.id) byId[item.id] = item;
    }
    var merged = Object.keys(byId).map(function (k) { return byId[k]; });
    merged.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    state.allAttemptsCache = merged;
  }

  function refreshAllAttemptsCache(force) {
    if (!force && state.attemptsCacheLoaded && Array.isArray(state.allAttemptsCache)) {
      return Promise.resolve(state.allAttemptsCache);
    }
    if (!TootLabs.Store || typeof TootLabs.Store.loadAllAttempts !== 'function') {
      state.attemptsCacheLoaded = true;
      return Promise.resolve(state.allAttemptsCache || []);
    }
    return TootLabs.Store.loadAllAttempts()
      .then(function (list) {
        state.allAttemptsCache = Array.isArray(list) ? list : [];
        state.attemptsCacheLoaded = true;
        return state.allAttemptsCache;
      })
      .catch(function () {
        return state.allAttemptsCache || [];
      });
  }

  function getCachedAttemptsForSample(sampleId) {
    if (!sampleId || !Array.isArray(state.allAttemptsCache)) return [];
    var rows = [];
    for (var i = 0; i < state.allAttemptsCache.length; i++) {
      var a = state.allAttemptsCache[i];
      if (a && a.sampleId === sampleId) rows.push(a);
    }
    rows.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return rows;
  }

  function openHomeView() {
    showView('home');
    renderHomeView();
  }

  function openVaultView() {
    showView('vault');
    renderVaultView();
    if (!state.attemptsCacheLoaded) {
      refreshAllAttemptsCache(true).then(function () {
        if (state.view === 'vault') renderVaultView();
      });
    }
  }

  function getVaultBuckets() {
    var recorded = [];
    var defaults = [];
    for (var i = 0; i < state.samples.length; i++) {
      var s = state.samples[i];
      if (!s) continue;
      if (s.isBuiltIn) defaults.push(s);
      else recorded.push(s);
    }
    var guesses = Array.isArray(state.allAttemptsCache) ? state.allAttemptsCache.slice() : [];
    return {
      recorded: recorded,
      guesses: guesses,
      defaults: defaults,
      counts: {
        all: recorded.length + guesses.length + defaults.length,
        recorded: recorded.length,
        guesses: guesses.length,
        defaults: defaults.length
      }
    };
  }

  function setVaultFilter(filterKey) {
    if (filterKey === 'recorded' || filterKey === 'guesses' || filterKey === 'defaults' || filterKey === 'all') {
      state.vaultFilter = filterKey;
    } else {
      state.vaultFilter = 'all';
    }
    renderVaultView();
  }

  function getSelectedVaultIds() {
    var recMap = {};
    var guessMap = {};
    for (var i = 0; i < state.samples.length; i++) {
      var s = state.samples[i];
      if (s && s.id && !s.isBuiltIn) recMap[s.id] = true;
    }
    for (var j = 0; j < (state.allAttemptsCache || []).length; j++) {
      var a = state.allAttemptsCache[j];
      if (a && a.id) guessMap[a.id] = true;
    }
    var sampleIds = Object.keys(state.vaultSelectedSamples || {}).filter(function (id) {
      return Boolean(state.vaultSelectedSamples[id] && recMap[id]);
    });
    var attemptIds = Object.keys(state.vaultSelectedGuesses || {}).filter(function (id) {
      return Boolean(state.vaultSelectedGuesses[id] && guessMap[id]);
    });
    return { sampleIds: sampleIds, attemptIds: attemptIds };
  }

  function clearVaultSelections() {
    state.vaultSelectedSamples = {};
    state.vaultSelectedGuesses = {};
  }

  function setVaultSelectMode(enabled) {
    var next = Boolean(enabled);
    state.vaultSelectMode = next;
    if (!next) {
      clearVaultSelections();
    }
    renderVaultView();
    return state.vaultSelectMode;
  }

  function toggleVaultSelection(kind, id) {
    if (kind === 'default') {
      showToast('Built-in Default Farts always stay in your Vault.');
      return false;
    }
    if (kind === 'recorded') {
      var sample = getSampleById(id);
      if (!sample || sample.isBuiltIn) {
        showToast('Built-in Default Farts always stay in your Vault.');
        return false;
      }
      if (state.vaultSelectedSamples[id]) delete state.vaultSelectedSamples[id];
      else state.vaultSelectedSamples[id] = true;
      renderVaultView();
      return Boolean(state.vaultSelectedSamples[id]);
    }
    if (kind === 'guess') {
      var att = findAttemptInCacheById(id);
      if (!att) return false;
      if (state.vaultSelectedGuesses[id]) delete state.vaultSelectedGuesses[id];
      else state.vaultSelectedGuesses[id] = true;
      renderVaultView();
      return Boolean(state.vaultSelectedGuesses[id]);
    }
    return false;
  }

  function getVisibleDeletableVaultItems(buckets) {
    var b = buckets || getVaultBuckets();
    var f = state.vaultFilter || 'all';
    if (f === 'defaults') return { recorded: [], guesses: [] };
    if (f === 'recorded') return { recorded: b.recorded, guesses: [] };
    if (f === 'guesses') return { recorded: [], guesses: b.guesses };
    return { recorded: b.recorded, guesses: b.guesses };
  }

  function selectAllVisibleVaultItems() {
    var vis = getVisibleDeletableVaultItems();
    var totalVis = vis.recorded.length + vis.guesses.length;
    if (totalVis === 0) {
      showToast(
        state.vaultFilter === 'defaults'
          ? 'Built-in Default Farts always stay in your Vault.'
          : 'No Recorded Farts or Guesses to select here.'
      );
      return 0;
    }
    var allAlreadySelected =
      vis.recorded.every(function (s) { return Boolean(state.vaultSelectedSamples[s.id]); }) &&
      vis.guesses.every(function (a) { return Boolean(state.vaultSelectedGuesses[a.id]); });

    if (allAlreadySelected) {
      vis.recorded.forEach(function (s) { delete state.vaultSelectedSamples[s.id]; });
      vis.guesses.forEach(function (a) { delete state.vaultSelectedGuesses[a.id]; });
    } else {
      vis.recorded.forEach(function (s) { state.vaultSelectedSamples[s.id] = true; });
      vis.guesses.forEach(function (a) { state.vaultSelectedGuesses[a.id] = true; });
    }
    renderVaultView();
    var sel = getSelectedVaultIds();
    return sel.sampleIds.length + sel.attemptIds.length;
  }

  function promptVaultDelete(sampleIds, attemptIds, headingText, copyText) {
    var safeSampleIds = (Array.isArray(sampleIds) ? sampleIds : []).filter(function (id) {
      var s = getSampleById(id);
      return Boolean(s && !s.isBuiltIn);
    });
    var safeAttemptIds = (Array.isArray(attemptIds) ? attemptIds : []).filter(function (id) {
      return Boolean(findAttemptInCacheById(id));
    });
    var total = safeSampleIds.length + safeAttemptIds.length;
    if (total === 0) {
      showToast('Select at least one Recorded Fart or Recorded Guess first.', true);
      return false;
    }
    state.deleteModalAction = {
      kind: 'vault_bulk',
      sampleIds: safeSampleIds,
      attemptIds: safeAttemptIds
    };
    if ($('labs-delete-heading')) {
      $('labs-delete-heading').textContent = headingText || ('Delete ' + total + ' Vault Item' + (total === 1 ? '?' : 's?'));
    }
    if ($('labs-delete-copy')) {
      if (copyText) {
        $('labs-delete-copy').textContent = copyText;
      } else {
        var parts = [];
        if (safeSampleIds.length > 0) parts.push(safeSampleIds.length + ' Recorded Fart' + (safeSampleIds.length === 1 ? '' : 's') + ' (and their guesses)');
        if (safeAttemptIds.length > 0) parts.push(safeAttemptIds.length + ' Recorded Guess' + (safeAttemptIds.length === 1 ? '' : 'es'));
        $('labs-delete-copy').textContent = 'Permanently delete ' + parts.join(' + ') + '? Built-in Default Farts always stay in your Vault.';
      }
    }
    $('labs-delete-modal').classList.remove('hidden');
    return true;
  }

  function getVaultFileNumber(rawId) {
    var s = String(rawId || '00000');
    var hash = 0;
    for (var i = 0; i < s.length; i++) {
      hash = ((hash * 31) + s.charCodeAt(i)) % 90000;
    }
    var n = (hash % 8999) + 1001;
    return 'TM-0' + String(n);
  }

  var VAULT_MIN_ARCHIVE_MS = Date.UTC(1974, 2, 14);
  var VAULT_MAX_DEFAULT_MS = Date.UTC(2025, 9, 20);

  function getSpecimenArchiveDateMs(s) {
    if (!s) return Date.now();
    if (!s.isBuiltIn && typeof s.createdAt === 'number' && s.createdAt > 100000000000) {
      return s.createdAt;
    }
    var raw = String(s.id || s.name || 'default');
    var h = 2166136261;
    for (var i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 2246822519);
    h ^= h >>> 13;
    var u = (h >>> 0) / 4294967296;
    return Math.round(VAULT_MIN_ARCHIVE_MS + u * (VAULT_MAX_DEFAULT_MS - VAULT_MIN_ARCHIVE_MS));
  }

  function formatArchiveDate(ms, isBuiltIn) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) return 'Recent';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (isBuiltIn) {
      return months[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
    }
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function computeVaultAgingMap(samples) {
    var map = {};
    var list = Array.isArray(samples) ? samples : [];
    var nowMs = Math.max(Date.now(), Date.UTC(2026, 10, 26));
    var oldestId = null;
    var minMs = Infinity;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s || !s.id) continue;
      var ms = getSpecimenArchiveDateMs(s);
      var ageYears = Math.max(0, (nowMs - ms) / (365.25 * 86400000));
      var tier = 0;
      if (ageYears >= 38) tier = 4;
      else if (ageYears >= 24) tier = 3;
      else if (ageYears >= 12) tier = 2;
      else if (ageYears >= 3) tier = 1;
      map[s.id] = { archiveMs: ms, ageYears: ageYears, ageTier: tier, isOldest: false };
      if (ms < minMs) {
        minMs = ms;
        oldestId = s.id;
      }
    }
    if (oldestId && map[oldestId]) {
      map[oldestId].isOldest = true;
      map[oldestId].ageTier = 4;
    }
    return map;
  }

  function getVaultStampInfo(s, isDef, attCount, agingInfo) {
    if (agingInfo && agingInfo.isOldest) {
      var yr = new Date(agingInfo.archiveMs).getUTCFullYear();
      return { label: 'ARCHIVE RELIC · ' + yr, cls: 'stamp-red' };
    }
    if (!isDef) {
      return attCount > 0
        ? { label: 'VERIFIED SPECIMEN', cls: 'stamp-red' }
        : { label: 'FIELD RECORDED', cls: 'stamp-green' };
    }
    var stamps = [
      { label: 'VERIFIED SPECIMEN', cls: 'stamp-red' },
      { label: 'RESEARCH CLASSIFIED', cls: 'stamp-blue' },
      { label: 'RARE SPECIMEN', cls: 'stamp-red' },
      { label: 'LAB APPROVED', cls: 'stamp-green' }
    ];
    var id = String((s && s.id) || '');
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % stamps.length;
    return stamps[h];
  }

  function getVaultDescriptors(s, isDef) {
    if (s && s.features && root.TootApp && root.TootApp.DSP && typeof root.TootApp.DSP.describeSoundProfile === 'function') {
      var prof = root.TootApp.DSP.describeSoundProfile(s.features);
      var pitchWord = String(prof.pitchLabel || 'Acoustic').split('(')[0].trim();
      var texWord = String(prof.textureLabel || 'Resonant').split('·')[0].trim();
      var originWord = isDef ? 'Archive Pack' : 'User Recording';
      return pitchWord + ' · ' + texWord + ' · ' + originWord;
    }
    return isDef ? 'Archive Library · Acoustic Specimen' : 'Field Recording · Captured Emission';
  }

  function buildVaultCardHtml(s, opts) {
    opts = opts || {};
    var st = TootLabs.Store.getSampleStats(s.id);
    var name = getSampleName(s);
    var isDef = Boolean(s.isBuiltIn);
    var inVault = Boolean(opts.inVault);
    var isSelected = inVault && !isDef && Boolean(state.vaultSelectedSamples && state.vaultSelectedSamples[s.id]);
    var hasAudio = Boolean(s.samples && s.samples.length > 0);
    var dur = hasAudio
      ? (s.samples.length / (s.sampleRate || 44100)).toFixed(2) + 's'
      : typeof s.previewDurationSec === 'number' && s.previewDurationSec > 0
      ? s.previewDurationSec.toFixed(2) + 's'
      : 'Ready';
    var bestTxt = st.attemptCount > 0 ? st.bestScore.toFixed(1) + '%' : '';
    var attTxt = st.attemptCount === 1 ? '1 guess' : st.attemptCount + ' guesses';
    var fileCode = getVaultFileNumber(s.id);
    var agingInfo = (opts.agingMap && opts.agingMap[s.id]) || {
      archiveMs: getSpecimenArchiveDateMs(s),
      ageTier: isDef ? 1 : 0,
      isOldest: false
    };
    var archiveDateStr = formatArchiveDate(agingInfo.archiveMs, isDef);
    var stamp = getVaultStampInfo(s, isDef, st.attemptCount, agingInfo);
    var descLine = getVaultDescriptors(s, isDef);

    var checkBtnHtml =
      inVault && !isDef
        ? '<button type="button" class="labs-vc-chk-btn' +
          (isSelected ? ' is-checked' : '') +
          '" data-vc-select="' +
          esc(s.id) +
          '" aria-pressed="' +
          (isSelected ? 'true' : 'false') +
          '" aria-label="Select ' +
          esc(name) +
          '" title="Select for bulk delete">' +
          (isSelected ? '✓' : '') +
          '</button>'
        : '';

    var oldestBadgeHtml = agingInfo.isOldest
      ? '<span class="labs-vc-oldest-tag" title="Oldest Archived Specimen — Covered in Dust">🕸️ OLDEST</span>'
      : '';

    var deleteBtnHtml = !isDef
      ? '<button type="button" class="labs-vc-ink-act is-del" data-vc-act="delete" data-vc-id="' +
        esc(s.id) +
        '" aria-label="Delete recording" title="Delete recording">🗑️ Delete</button>'
      : '<span class="labs-vc-lock-pip" title="Protected Default Library Specimen">🔒</span>';

    var cardExtraCls =
      inVault && state.vaultSelectMode
        ? isDef
          ? ' is-locked-default'
          : ' is-selectable' + (isSelected ? ' is-selected' : '')
        : isSelected
        ? ' is-selected'
        : '';
    if (agingInfo.isOldest) cardExtraCls += ' is-oldest-specimen';

    return (
      '<article class="labs-vault-card ' +
      (isDef ? 'labs-vc-kind-default' : 'labs-vc-kind-recorded') +
      cardExtraCls +
      '" data-open-id="' +
      esc(s.id) +
      '" data-vc-kind="' +
      (isDef ? 'default' : 'recorded') +
      '" data-age-tier="' +
      agingInfo.ageTier +
      '"' +
      (agingInfo.isOldest ? ' data-oldest="true"' : '') +
      ' tabindex="0">' +
      '  <div class="labs-vc-sleeve-top">' +
      '    <div class="labs-vc-sleeve-meta">' +
      '      <div class="labs-vc-file-row">' +
      checkBtnHtml +
      '        <span class="labs-vc-file-code">FILE #' + esc(fileCode) + ' · ' + esc(archiveDateStr.toUpperCase()) + '</span>' +
      oldestBadgeHtml +
      '      </div>' +
      '      <div class="labs-vc-name">' + esc(name) + '</div>' +
      '      <div class="labs-vc-tags">' + esc(descLine) + '</div>' +
      '    </div>' +
      '    <div class="labs-vc-stamp-col">' +
      '      <span class="labs-vc-stamp ' + stamp.cls + '">' + stamp.label + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-vc-wave-row">' +
      '    <button type="button" class="labs-vc-play-circle" data-vc-act="play" data-vc-id="' + esc(s.id) + '" aria-label="Play ' + esc(name) + '" title="Play specimen">▶</button>' +
      '    <div class="labs-vc-wave-wrap">' +
      '      <canvas class="labs-vc-wave" data-wave-id="' + esc(s.id) + '"></canvas>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-vc-sleeve-foot">' +
      '    <div class="labs-vc-foot-meta">' +
      '      <span class="labs-vc-dur">' + esc(dur) + '</span>' +
      '      <span class="labs-vc-att">' + esc(attTxt) + (bestTxt ? ' · Best ' + esc(bestTxt) : '') + '</span>' +
      '    </div>' +
      '    <div class="labs-vc-quick-acts">' +
      '      <button type="button" class="labs-vc-ink-act vc-analyze" data-vc-act="analyze" data-vc-id="' + esc(s.id) + '" title="Open Fartnalysis">🧪 Analyze</button>' +
      '      <button type="button" class="labs-vc-ink-act vc-guess" data-vc-act="guess" data-vc-id="' + esc(s.id) + '" title="Guess This Fart">🎯 Guess</button>' +
      deleteBtnHtml +
      '    </div>' +
      '  </div>' +
      '</article>'
    );
  }

  function buildVaultGuessCardHtml(att, opts) {
    opts = opts || {};
    var parent = getSampleById(att.sampleId);
    var parentName = parent ? getSampleName(parent) : 'Saved Fart';
    var inVault = Boolean(opts.inVault);
    var isSelected = inVault && Boolean(state.vaultSelectedGuesses && state.vaultSelectedGuesses[att.id]);
    var dur = att.samples && att.samples.length ? (att.samples.length / (att.sampleRate || 44100)).toFixed(2) + 's' : '0.00s';
    var score = typeof att.exactScore === 'number' ? att.exactScore : 0;
    var rank = TootLabs.Store.getRankForScore(score);
    var fileCode = getVaultFileNumber(att.id);
    var gDateStr = formatArchiveDate(att.createdAt || Date.now(), false);
    var checkBtnHtml = inVault
      ? '<button type="button" class="labs-vc-chk-btn' +
        (isSelected ? ' is-checked' : '') +
        '" data-vg-select="' +
        esc(att.id) +
        '" aria-pressed="' +
        (isSelected ? 'true' : 'false') +
        '" aria-label="Select guess" title="Select for bulk delete">' +
        (isSelected ? '✓' : '') +
        '</button>'
      : '';
    var cardExtraCls =
      inVault && state.vaultSelectMode
        ? ' is-selectable' + (isSelected ? ' is-selected' : '')
        : isSelected
        ? ' is-selected'
        : '';

    return (
      '<article class="labs-vault-card labs-vc-kind-guess' +
      cardExtraCls +
      '" data-open-guess-id="' +
      esc(att.id) +
      '" data-open-guess-sample="' +
      esc(att.sampleId || '') +
      '" data-vc-kind="guess" data-age-tier="0" tabindex="0">' +
      '  <div class="labs-vc-sleeve-top">' +
      '    <div class="labs-vc-sleeve-meta">' +
      '      <div class="labs-vc-file-row">' +
      checkBtnHtml +
      '        <span class="labs-vc-file-code">GUESS #' + esc(fileCode) + ' · ' + esc(gDateStr.toUpperCase()) + '</span>' +
      '      </div>' +
      '      <div class="labs-vc-name">' + esc(att.name || 'Recorded Guess') + '</div>' +
      '      <div class="labs-vc-tags">Guess of ' + esc(parentName) + '</div>' +
      '    </div>' +
      '    <div class="labs-vc-stamp-col">' +
      '      <span class="labs-vc-stamp stamp-blue">MIMIC SPECIMEN</span>' +
      '      <span class="labs-vc-match-chip">' + score.toFixed(1) + '% · ' + esc(rank.title) + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-vc-wave-row">' +
      '    <button type="button" class="labs-vc-play-circle" data-vg-act="play" data-vg-id="' + esc(att.id) + '" aria-label="Play guess">▶</button>' +
      '    <div class="labs-vc-wave-wrap">' +
      '      <canvas class="labs-vc-wave" data-guess-wave-id="' + esc(att.id) + '"></canvas>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-vc-sleeve-foot">' +
      '    <div class="labs-vc-foot-meta">' +
      '      <span class="labs-vc-dur">' + esc(dur) + '</span>' +
      '      <span class="labs-vc-att">Mimic · ' + esc(score.toFixed(0)) + '% Match</span>' +
      '    </div>' +
      '    <div class="labs-vc-quick-acts">' +
      '      <button type="button" class="labs-vc-ink-act vc-analyze" data-vg-act="analyze" data-vg-id="' + esc(att.id) + '" data-vg-sample="' + esc(att.sampleId || '') + '" title="Analyze guess">🧪 Analyze</button>' +
      '      <button type="button" class="labs-vc-ink-act vc-compare" data-vg-act="compare" data-vg-id="' + esc(att.id) + '" data-vg-sample="' + esc(att.sampleId || '') + '" title="Compare with target">⚖️ Compare</button>' +
      '      <button type="button" class="labs-vc-ink-act is-del" data-vg-act="delete" data-vg-id="' + esc(att.id) + '" aria-label="Delete guess" title="Delete guess">🗑️ Delete</button>' +
      '    </div>' +
      '  </div>' +
      '</article>'
    );
  }

  function findAttemptInCacheById(attId) {
    if (!attId || !Array.isArray(state.allAttemptsCache)) return null;
    for (var i = 0; i < state.allAttemptsCache.length; i++) {
      if (state.allAttemptsCache[i] && state.allAttemptsCache[i].id === attId) {
        return state.allAttemptsCache[i];
      }
    }
    return null;
  }

  function wireVaultCards(containerEl) {
    if (!containerEl) return;
    var isVaultGrid = containerEl.id === 'vault-grid';
    if (isVaultGrid) {
      containerEl.querySelectorAll('[data-vg-clear-group]').forEach(function (clearBtn) {
        clearBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var grpKind = this.getAttribute('data-vg-clear-group');
          var bucketsNow = getVaultBuckets();
          if (grpKind === 'recorded' && bucketsNow.recorded.length > 0) {
            var sIds = bucketsNow.recorded.map(function (x) { return x.id; });
            promptVaultDelete(
              sIds,
              [],
              'Delete All Recorded Farts?',
              'Permanently delete all ' +
                sIds.length +
                ' Recorded Fart' +
                (sIds.length === 1 ? '' : 's') +
                ' and their logged guesses? Built-in Default Farts will always remain in your Vault.'
            );
          } else if (grpKind === 'guesses' && bucketsNow.guesses.length > 0) {
            var gIds = bucketsNow.guesses.map(function (x) { return x.id; });
            promptVaultDelete(
              [],
              gIds,
              'Delete All Recorded Guesses?',
              'Permanently delete all ' +
                gIds.length +
                ' Recorded Guess' +
                (gIds.length === 1 ? '' : 'es') +
                '? Recorded Farts and Default Farts will remain in your Vault.'
            );
          }
        });
      });
    }

    containerEl.querySelectorAll('[data-vc-select]').forEach(function (chk) {
      chk.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var sid = this.getAttribute('data-vc-select');
        if (!state.vaultSelectMode) state.vaultSelectMode = true;
        toggleVaultSelection('recorded', sid);
      });
    });

    containerEl.querySelectorAll('[data-vg-select]').forEach(function (chk) {
      chk.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var gid = this.getAttribute('data-vg-select');
        if (!state.vaultSelectMode) state.vaultSelectMode = true;
        toggleVaultSelection('guess', gid);
      });
    });

    containerEl.querySelectorAll('[data-vc-act]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var act = this.getAttribute('data-vc-act');
        var id = this.getAttribute('data-vc-id');
        var sample = getSampleById(id);
        if (!sample) return;

        if (act === 'delete') {
          if (sample.isBuiltIn) {
            showToast('Built-in Default Farts always stay in your Vault.');
            return;
          }
          promptVaultDelete(
            [sample.id],
            [],
            'Delete Fart?',
            'Permanently delete "' + getSampleName(sample) + '" and any logged guesses against it?'
          );
          return;
        }

        if (isVaultGrid && state.vaultSelectMode && act !== 'play') {
          toggleVaultSelection(sample.isBuiltIn ? 'default' : 'recorded', id);
          return;
        }

        if (act === 'play') {
          var playVaultCardSample = function (loaded) {
            if (!loaded || !loaded.samples) return;
            var waveCvs = containerEl.querySelector('canvas[data-wave-id="' + id + '"]');
            var sr = loaded.sampleRate || 44100;
            try {
              var pRes = TootApp.Audio.playSound(loaded.samples, sr, {
                channel: 'vault_play',
                onProgress: function (pr) {
                  if (waveCvs) {
                    drawStaticWaveform(waveCvs, loaded.samples, {
                      fallbackW: 220,
                      fallbackH: 38,
                      barWidth: 2,
                      gap: 1.5,
                      colorA: '#134e38',
                      colorB: '#1f7a53',
                      activeColor: '#0c3b29',
                      inactiveColor: 'rgba(20, 90, 65, 0.24)',
                      lineColor: 'rgba(46, 72, 58, 0.26)',
                      cursorColor: '#0e3f2d',
                      progress: pr
                    });
                  }
                },
                onEnded: function () {
                  if (waveCvs) {
                    drawStaticWaveform(waveCvs, loaded.samples, {
                      fallbackW: 220,
                      fallbackH: 38,
                      barWidth: 2,
                      gap: 1.5,
                      colorA: '#134e38',
                      colorB: '#1f7a53',
                      lineColor: 'rgba(46, 72, 58, 0.26)',
                      progress: null
                    });
                  }
                }
              });
              if (pRes && typeof pRes.catch === 'function') pRes.catch(function () {});
            } catch (e) {}
          };
          if (sample.samples && sample.samples.length > 0) {
            playVaultCardSample(sample);
          } else {
            ensureTargetReady(sample)
              .then(function (loaded) {
                if (loaded && loaded.samples) {
                  var waveCvs = containerEl.querySelector('canvas[data-wave-id="' + id + '"]');
                  if (waveCvs) {
                    drawStaticWaveform(waveCvs, loaded.samples, {
                      fallbackW: 220,
                      fallbackH: 38,
                      barWidth: 2,
                      gap: 1.5,
                      colorA: '#134e38',
                      colorB: '#1f7a53',
                      lineColor: 'rgba(46, 72, 58, 0.26)'
                    });
                  }
                  playVaultCardSample(loaded);
                }
              })
              .catch(function (err) {
                showToast((err && err.message) || 'Could not load audio.', true);
              });
          }
        } else if (act === 'analyze') {
          openFartnalysis('original', sample.id, null);
        } else if (act === 'guess') {
          openGuessMode(sample.id);
        }
      });
    });

    containerEl.querySelectorAll('[data-vg-act]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var act = this.getAttribute('data-vg-act');
        var attId = this.getAttribute('data-vg-id');
        var sampleId = this.getAttribute('data-vg-sample');
        var att = findAttemptInCacheById(attId);
        if (!att) return;

        if (act === 'delete') {
          promptVaultDelete(
            [],
            [attId],
            'Delete Recorded Guess?',
            'Permanently delete "' + (att.name || 'Recorded Guess') + '"?'
          );
          return;
        }

        if (isVaultGrid && state.vaultSelectMode && act !== 'play') {
          toggleVaultSelection('guess', attId);
          return;
        }

        var resolvedSampleId = sampleId || att.sampleId;

        if (act === 'play') {
          if (att.samples && att.samples.length > 0) {
            var gWaveCvs = containerEl.querySelector('canvas[data-guess-wave-id="' + attId + '"]');
            try {
              var gPlay = TootApp.Audio.playSound(att.samples, att.sampleRate || 44100, {
                channel: 'vault_guess_play',
                onProgress: function (pr) {
                  if (gWaveCvs) {
                    drawStaticWaveform(gWaveCvs, att.samples, {
                      fallbackW: 220,
                      fallbackH: 38,
                      barWidth: 2,
                      gap: 1.5,
                      colorA: '#9a3412',
                      colorB: '#d97706',
                      activeColor: '#7c2d12',
                      inactiveColor: 'rgba(154, 52, 18, 0.24)',
                      lineColor: 'rgba(84, 58, 34, 0.26)',
                      cursorColor: '#7c2d12',
                      progress: pr
                    });
                  }
                },
                onEnded: function () {
                  if (gWaveCvs) {
                    drawStaticWaveform(gWaveCvs, att.samples, {
                      fallbackW: 220,
                      fallbackH: 38,
                      barWidth: 2,
                      gap: 1.5,
                      colorA: '#9a3412',
                      colorB: '#d97706',
                      lineColor: 'rgba(84, 58, 34, 0.26)',
                      progress: null
                    });
                  }
                }
              });
              if (gPlay && typeof gPlay.catch === 'function') gPlay.catch(function () {});
            } catch (e) {}
          }
        } else if (act === 'analyze') {
          openFartnalysis('guess', resolvedSampleId, attId);
        } else if (act === 'compare') {
          var parent = getSampleById(resolvedSampleId);
          openFartnalysis(parent ? 'comparison' : 'guess', resolvedSampleId, attId);
        }
      });
    });

    containerEl.querySelectorAll('.labs-vault-card[data-open-id]').forEach(function (card) {
      function handleCardActivate() {
        var oid = card.getAttribute('data-open-id');
        var cKind = card.getAttribute('data-vc-kind');
        if (isVaultGrid && state.vaultSelectMode) {
          toggleVaultSelection(cKind === 'default' ? 'default' : 'recorded', oid);
          return;
        }
        openSampleDetail(oid);
      }
      card.addEventListener('click', handleCardActivate);
      card.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          handleCardActivate();
        }
      });
    });

    containerEl.querySelectorAll('.labs-vault-card[data-open-guess-id]').forEach(function (card) {
      function openGuessFromCard() {
        var attId = card.getAttribute('data-open-guess-id');
        if (isVaultGrid && state.vaultSelectMode) {
          toggleVaultSelection('guess', attId);
          return;
        }
        var sampleId = card.getAttribute('data-open-guess-sample');
        var att = findAttemptInCacheById(attId);
        var resolvedSampleId = sampleId || (att && att.sampleId);
        var parent = getSampleById(resolvedSampleId);
        openFartnalysis(parent ? 'comparison' : 'guess', resolvedSampleId, attId);
      }
      card.addEventListener('click', openGuessFromCard);
      card.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openGuessFromCard();
        }
      });
    });
  }

  function drawVaultWaveforms(containerId) {
    var canvases = document.querySelectorAll('#' + containerId + ' canvas[data-wave-id]');
    var guessCanvases = document.querySelectorAll('#' + containerId + ' canvas[data-guess-wave-id]');
    var sampleRects = new Array(canvases.length);
    var guessRects = new Array(guessCanvases.length);
    var i, j;

    // Pass 1 (Read-only): measure all canvases in one layout pass to prevent read/write thrashing
    for (i = 0; i < canvases.length; i++) {
      sampleRects[i] = typeof canvases[i].getBoundingClientRect === 'function'
        ? canvases[i].getBoundingClientRect()
        : null;
    }
    for (j = 0; j < guessCanvases.length; j++) {
      guessRects[j] = typeof guessCanvases[j].getBoundingClientRect === 'function'
        ? guessCanvases[j].getBoundingClientRect()
        : null;
    }

    // Pass 2 (Write/Draw): update backing sizes and render
    for (i = 0; i < canvases.length; i++) {
      var id = canvases[i].getAttribute('data-wave-id');
      var sample = getSampleById(id);
      var sRect = sampleRects[i];
      if (sample && sample.samples && sample.samples.length > 0) {
        drawStaticWaveform(canvases[i], sample.samples, {
          fallbackW: 220,
          fallbackH: 38,
          preMeasuredRect: sRect,
          barWidth: 2,
          gap: 1.5,
          colorA: '#134e38',
          colorB: '#1f7a53',
          lineColor: 'rgba(46, 72, 58, 0.26)'
        });
      } else if (sample && Array.isArray(sample.previewPeaks) && sample.previewPeaks.length > 0) {
        drawPreviewWaveform(canvases[i], sample.previewPeaks, {
          fallbackW: 220,
          fallbackH: 38,
          preMeasuredRect: sRect,
          barWidth: 2,
          gap: 1.5,
          colorA: '#134e38',
          colorB: '#1f7a53',
          lineColor: 'rgba(46, 72, 58, 0.26)'
        });
      } else if (sample && typeof canvases[i].getContext === 'function') {
        var ctx = canvases[i].getContext('2d');
        var cw = canvases[i].width || 220;
        var ch = canvases[i].height || 38;
        if (ctx && typeof ctx.clearRect === 'function') {
          ctx.clearRect(0, 0, cw, ch);
          ctx.fillStyle = '#2d473a';
          ctx.font = '700 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('Tap ▶ to load specimen', cw * 0.5, ch * 0.56);
        }
      }
    }

    for (j = 0; j < guessCanvases.length; j++) {
      var gId = guessCanvases[j].getAttribute('data-guess-wave-id');
      var att = findAttemptInCacheById(gId);
      if (att && att.samples && att.samples.length > 0) {
        drawStaticWaveform(guessCanvases[j], att.samples, {
          fallbackW: 220,
          fallbackH: 38,
          preMeasuredRect: guessRects[j],
          barWidth: 2,
          gap: 1.5,
          colorA: '#9a3412',
          colorB: '#d97706',
          lineColor: 'rgba(84, 58, 34, 0.26)'
        });
      }
    }
  }

  /* ==================== AREA 1: HOME ==================== */
  function getHomeOscSample() {
    if (!state.samples || state.samples.length === 0) return null;
    var active =
      (state.fnSampleId && getSampleById(state.fnSampleId)) ||
      (state.guessTargetId && getSampleById(state.guessTargetId)) ||
      (state.homeOscId && getSampleById(state.homeOscId)) ||
      state.samples[0];
    if (active) state.homeOscId = active.id;
    return active || null;
  }

  function drawHomeOscCanvas(sample, progress01) {
    var cvs = $('home-osc-canvas');
    if (!cvs || typeof cvs.getContext !== 'function') return;
    var rect = typeof cvs.getBoundingClientRect === 'function' ? cvs.getBoundingClientRect() : null;
    var cw = rect && rect.width > 10 ? rect.width : 190;
    var ch = rect && rect.height > 10 ? rect.height : 80;
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var tw = Math.round(cw * dpr);
    var th = Math.round(ch * dpr);
    if (cvs.width !== tw || cvs.height !== th) {
      cvs.width = tw;
      cvs.height = th;
    }
    var ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    var padL = 16;
    var padR = 5;
    var padT = 4;
    var padB = 11;
    var pw = Math.max(24, cw - padL - padR);
    var ph = Math.max(18, ch - padT - padB);
    var midY = padT + ph * 0.5;

    // Fine minor + major phosphor oscilloscope grid
    ctx.strokeStyle = 'rgba(82, 240, 180, 0.14)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (var gx = 1; gx < 8; gx++) {
      var x = padL + (pw * gx) / 8;
      ctx.moveTo(x, padT); ctx.lineTo(x, padT + ph);
    }
    for (var gy = 0; gy <= 4; gy++) {
      var y = padT + (ph * gy) / 4;
      ctx.moveTo(padL, y); ctx.lineTo(padL + pw, y);
    }
    ctx.stroke();

    // Explicit X & Y oscilloscope axes + tick marks
    ctx.strokeStyle = 'rgba(130, 245, 198, 0.52)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + ph);
    ctx.lineTo(padL + pw, padT + ph);
    for (var tx = 0; tx <= 4; tx++) {
      var tickX = padL + (pw * tx) / 4;
      ctx.moveTo(tickX, padT + ph);
      ctx.lineTo(tickX, padT + ph + 2.5);
    }
    ctx.moveTo(padL - 2.5, padT + 1); ctx.lineTo(padL, padT + 1);
    ctx.moveTo(padL - 2.5, midY); ctx.lineTo(padL, midY);
    ctx.moveTo(padL - 2.5, padT + ph); ctx.lineTo(padL, padT + ph);
    ctx.stroke();

    // True triggered millisecond oscilloscope trace
    var raw = sample && sample.samples && sample.samples.length > 0 ? sample.samples : null;
    var sr = (sample && sample.sampleRate) || 44100;
    var winMs = 32;
    var winLen = Math.min(raw ? raw.length : 1400, Math.max(256, Math.round((sr * winMs) / 1000)));

    ctx.fillStyle = 'rgba(170, 248, 214, 0.74)';
    ctx.font = '600 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('+', padL - 3.5, padT + 5);
    ctx.fillText('0', padL - 3.5, midY + 2.5);
    ctx.fillText('-', padL - 3.5, padT + ph + 1);
    ctx.textAlign = 'left';
    ctx.fillText('0ms', padL, ch - 1.5);
    ctx.textAlign = 'center';
    ctx.fillText('4ms/div', padL + pw * 0.5, ch - 1.5);
    ctx.textAlign = 'right';
    ctx.fillText(winMs + 'ms', padL + pw, ch - 1.5);

    var endY = midY;
    function strokeWavePath() {
      ctx.beginPath();
      var pts = Math.min(240, Math.max(84, Math.floor(pw)));
      if (raw && raw.length > 16) {
        var gStep = Math.max(1, Math.floor(raw.length / 220));
        var gSum = 0, gCnt = 0;
        for (var d = 0; d < raw.length; d += gStep) { gSum += raw[d]; gCnt++; }
        var dcMean = gCnt > 0 ? gSum / gCnt : 0;
        var gMax = 0.015;
        var pkIdx = 0;
        for (var k = 0; k < raw.length; k += gStep) {
          var av = Math.abs(raw[k] - dcMean);
          if (av > gMax) {
            gMax = av;
            pkIdx = k;
          }
        }
        var maxStart = Math.max(0, raw.length - winLen);
        var baseStart =
          typeof progress01 === 'number'
            ? Math.floor(Math.max(0, Math.min(1, progress01)) * maxStart)
            : Math.max(0, Math.min(maxStart, pkIdx - Math.floor(winLen * 0.25)));

        // Rising zero-crossing trigger search (around DC mean)
        var trigLimit = Math.min(raw.length - 2, baseStart + Math.floor(winLen * 0.35));
        var trigStart = baseStart;
        for (var t = Math.max(1, baseStart); t <= trigLimit; t++) {
          if ((raw[t - 1] - dcMean) <= 0 && (raw[t] - dcMean) > 0) {
            trigStart = Math.min(maxStart, t);
            break;
          }
        }

        for (var i = 0; i < pts; i++) {
          var idx = Math.min(raw.length - 1, trigStart + Math.floor((i / Math.max(1, pts - 1)) * (winLen - 1)));
          var px = padL + (i / Math.max(1, pts - 1)) * pw;
          var amp = Math.max(-1, Math.min(1, (raw[idx] - dcMean) / gMax));
          var py = midY - amp * (ph * 0.43);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          endY = py;
        }
      } else {
        // Synthesize harmonic triggered scope trace before full PCM decode
        var hz = 115;
        var pmMeta = sample ? (sample.meta || sample.previewMeta) : null;
        if (sample && sample.features && (sample.features.medianPitchHz || sample.features.pitchHz || sample.features.fundamentalHz)) {
          hz = sample.features.medianPitchHz || sample.features.pitchHz || sample.features.fundamentalHz;
        } else if (pmMeta && pmMeta.pitchLabel) {
          var pm = String(pmMeta.pitchLabel).match(/(\d+)\s*Hz/i);
          if (pm) hz = parseInt(pm[1], 10);
        }
        var cyc = Math.max(2.5, Math.min(9.0, hz * (winMs / 1000)));
        var pkList = sample && (Array.isArray(sample.peaks) ? sample.peaks : Array.isArray(sample.previewPeaks) ? sample.previewPeaks : null);
        var envPeak = 0.72;
        if (pkList && pkList.length > 0) {
          var pkSum = 0;
          for (var pIdx = 0; pIdx < pkList.length; pIdx++) pkSum = Math.max(pkSum, Number(pkList[pIdx]) || 0);
          if (pkSum > 0.1) envPeak = Math.max(0.45, Math.min(0.95, pkSum));
        }
        for (var si = 0; si < pts; si++) {
          var u = si / Math.max(1, pts - 1);
          var ang = u * cyc * Math.PI * 2;
          var wave = Math.sin(ang) * 0.65 + Math.sin(ang * 2.0 + 0.4) * 0.25 + Math.sin(ang * 3.0 - 0.3) * 0.14;
          var sx = padL + u * pw;
          var sy = midY - wave * envPeak * (ph * 0.40);
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
          endY = sy;
        }
      }
    }

    // Phosphor bloom halo + sharp bright CRT beam
    strokeWavePath();
    ctx.strokeStyle = 'rgba(76, 230, 172, 0.38)';
    ctx.lineWidth = 4.2;
    ctx.stroke();

    strokeWavePath();
    ctx.strokeStyle = '#92ffd6';
    ctx.lineWidth = 1.55;
    ctx.stroke();

    if (typeof progress01 === 'number') {
      ctx.beginPath();
      ctx.arc(padL + pw - 1, endY, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#e6fff5';
      ctx.fill();
    }
  }

  function renderHomeOscilloscope() {
    var sample = getHomeOscSample();
    var freqEl = $('home-osc-freq');
    var volEl = $('home-osc-vol');
    var nameEl = $('home-osc-name');
    var playLblEl = $('home-osc-play-lbl');
    var playBtn = $('btn-home-osc-play');
    var screenEl = $('home-osc-screen');
    var progEl = $('home-osc-prog');

    var hzTxt = '-- Hz';
    var lenTxt = '-- s';
    var hasRmsDb = false;
    if (sample) {
      var feat = sample.features;
      var pmObj = sample.meta || sample.previewMeta;
      var hz = feat && (feat.medianPitchHz || feat.pitchHz || feat.fundamentalHz);
      if (!hz && pmObj && pmObj.pitchLabel) {
        var pm = String(pmObj.pitchLabel).match(/(\d+)\s*Hz/i);
        if (pm) hz = parseInt(pm[1], 10);
      }
      if (hz) hzTxt = Math.round(hz) + ' Hz';
      if (feat && typeof feat.rmsDb === 'number') {
        hasRmsDb = true;
        lenTxt = Math.round(feat.rmsDb) + ' dB';
      } else {
        var rawDur = sample.samples && sample.samples.length > 0 ? sample.samples.length / (sample.sampleRate || 44100) : 0;
        var dSec = sample.durationSec || (pmObj && pmObj.durationSec) || (feat && feat.durationSec) || rawDur;
        if (dSec) lenTxt = Number(dSec).toFixed(2) + 's';
      }
    }
    if (freqEl) freqEl.textContent = 'FREQ: ' + hzTxt;
    if (volEl) volEl.textContent = hasRmsDb ? 'LEVEL: ' + lenTxt : 'LEN: ' + lenTxt;
    if (nameEl) nameEl.textContent = sample ? getSampleName(sample) : 'SPECIMEN STANDBY';
    if (playLblEl) playLblEl.textContent = state.homeOscPlaying ? '■ STOP' : '▶ PLAY';
    if (playBtn) playBtn.textContent = state.homeOscPlaying ? '■ Stop' : '▶ Play';
    var selEl = $('home-osc-select');
    if (selEl && state.samples) {
      var sigKey = state.samples.map(function (s) { return s.id; }).join('|');
      if (selEl._labsSig !== sigKey) {
        selEl._labsSig = sigKey;
        selEl.innerHTML = state.samples
          .map(function (s) {
            return '<option value="' + esc(s.id) + '">' + esc(getSampleName(s)) + '</option>';
          })
          .join('');
      }
      if (sample && selEl.value !== sample.id) selEl.value = sample.id;
    }
    if (screenEl && screenEl.classList) screenEl.classList.toggle('is-playing', Boolean(state.homeOscPlaying));
    if (progEl && progEl.style) progEl.style.width = state.homeOscPlaying && typeof state.homeOscProgress === 'number' ? Math.round(state.homeOscProgress * 100) + '%' : '0%';
    drawHomeOscCanvas(sample, state.homeOscPlaying ? state.homeOscProgress : null);
  }

  function toggleHomeOscPlay() {
    var Audio = root.TootApp && root.TootApp.Audio;
    if (!Audio) return;
    if (state.homeOscPlaying) {
      Audio.stopChannel('home_osc');
      state.homeOscPlaying = false;
      state.homeOscProgress = null;
      renderHomeOscilloscope();
      return;
    }
    var sample = getHomeOscSample();
    if (!sample) {
      showToast('Record or select a specimen first.', true);
      return;
    }
    ensureTargetReady(sample).then(function (ready) {
      if (!ready || !ready.samples || ready.samples.length === 0) {
        showToast('Specimen audio not ready yet.', true);
        return;
      }
      state.homeOscPlaying = true;
      state.homeOscProgress = 0;
      renderHomeOscilloscope();
      Audio.playSound(ready.samples, ready.sampleRate || 44100, {
        channel: 'home_osc',
        onProgress: function (p) {
          if (!state.homeOscPlaying) return;
          state.homeOscProgress = p;
          var progEl = $('home-osc-prog');
          if (progEl && progEl.style) progEl.style.width = Math.round(p * 100) + '%';
          drawHomeOscCanvas(ready, p);
        },
        onEnded: function () {
          state.homeOscPlaying = false;
          state.homeOscProgress = null;
          renderHomeOscilloscope();
        }
      });
    });
  }

  function nextHomeOscSample() {
    var Audio = root.TootApp && root.TootApp.Audio;
    if (state.homeOscPlaying && Audio) Audio.stopChannel('home_osc');
    state.homeOscPlaying = false;
    state.homeOscProgress = null;
    if (!state.samples || state.samples.length === 0) {
      renderHomeOscilloscope();
      return;
    }
    var cur = getHomeOscSample();
    var idx = cur ? state.samples.findIndex(function (s) { return s.id === cur.id; }) : -1;
    var next = state.samples[(idx + 1) % state.samples.length];
    state.homeOscId = next ? next.id : null;
    if (next) {
      state.fnSampleId = next.id;
      state.guessTargetId = next.id;
    }
    renderHomeOscilloscope();
  }

  function renderHomeView() {
    var summary = TootLabs.Store.getSummaryStats(state.samples);
    $('stat-samples-recorded').textContent = String(summary.samplesRecorded);
    $('stat-best-score').textContent = summary.bestMatchScore.toFixed(1) + '%';
    $('stat-challenges-completed').textContent = String(summary.challengesCompleted);
    $('stat-avg-quality').textContent = summary.averageMatchQuality.toFixed(1) + '%';

    renderHomeOscilloscope();

    var recentEl = $('home-recent-vault');
    if (state.samples.length === 0) {
      recentEl.innerHTML =
        '<div class="labs-glass-card labs-empty-card">' +
        '  <h3>No Farts Saved Yet</h3>' +
        '  <p>Tap <strong>Record New Fart</strong> above to capture your first fart in one click.</p>' +
        '</div>';
      return;
    }

    var topSamples = state.samples.slice(0, 4);
    var homeAgingMap = computeVaultAgingMap(state.samples);
    recentEl.innerHTML = topSamples.map(function (s) { return buildVaultCardHtml(s, { agingMap: homeAgingMap }); }).join('');
    wireVaultCards(recentEl);
    drawVaultWaveforms('home-recent-vault');
  }

  /* ==================== AREA 2: VAULT ==================== */
  function renderVaultView() {
    var grid = $('vault-grid');
    var buckets = getVaultBuckets();
    var deletableTotal = buckets.counts.recorded + buckets.counts.guesses;
    if (deletableTotal === 0 && state.vaultSelectMode) {
      state.vaultSelectMode = false;
      clearVaultSelections();
    }
    var selIds = getSelectedVaultIds();
    var totalSelected = selIds.sampleIds.length + selIds.attemptIds.length;

    if ($('vault-tab-total')) $('vault-tab-total').textContent = String(buckets.counts.all);
    if ($('vault-tab-recorded')) $('vault-tab-recorded').textContent = String(buckets.counts.recorded);
    if ($('vault-tab-guesses')) $('vault-tab-guesses').textContent = String(buckets.counts.guesses);
    if ($('vault-tab-defaults')) $('vault-tab-defaults').textContent = String(buckets.counts.defaults);
    document.querySelectorAll('.labs-vtab[data-vault-tab]').forEach(function (vt) {
      vt.classList.toggle('active', vt.getAttribute('data-vault-tab') === state.vaultFilter);
    });

    var selectToggleBtn = $('btn-vault-select');
    if (selectToggleBtn) {
      selectToggleBtn.disabled = deletableTotal === 0;
      selectToggleBtn.classList.toggle('active', state.vaultSelectMode);
      selectToggleBtn.textContent = state.vaultSelectMode ? '✕ Cancel Select' : '☑️ Select';
    }

    var bulkBar = $('vault-bulk-bar');
    if (bulkBar) {
      bulkBar.classList.toggle('hidden', !((state.vaultSelectMode || totalSelected > 0) && deletableTotal > 0));
      var selCountEl = $('vault-select-count');
      var delSelBtn = $('btn-vault-delete-selected');
      var selAllBtn = $('btn-vault-select-all');
      if (selCountEl) selCountEl.textContent = totalSelected + ' selected';
      if (delSelBtn) {
        delSelBtn.disabled = totalSelected === 0;
        delSelBtn.textContent = '🗑️ Delete (' + totalSelected + ')';
      }
      if (selAllBtn) {
        var visItems = getVisibleDeletableVaultItems(buckets);
        var visTotal = visItems.recorded.length + visItems.guesses.length;
        selAllBtn.disabled = visTotal === 0;
        var visAllPicked =
          visTotal > 0 &&
          visItems.recorded.every(function (s) { return Boolean(state.vaultSelectedSamples[s.id]); }) &&
          visItems.guesses.every(function (a) { return Boolean(state.vaultSelectedGuesses[a.id]); });
        selAllBtn.textContent = visAllPicked ? '☐ Unselect All' : '☑️ Select All';
      }
    }

    $('btn-vault-megamix').disabled = buckets.counts.all === 0;

    if (buckets.counts.all === 0) {
      grid.innerHTML =
        '<div class="labs-glass-card labs-empty-card">' +
        '  <h3>Your Fart Vault is Empty</h3>' +
        '  <p>Go to <strong>Home</strong> and tap <strong>Record New Fart</strong> anytime to build your collection.</p>' +
        '</div>';
      return;
    }

    var searchNeedle = String(state.vaultSearchQuery || '').trim().toLowerCase();
    var viewRec = buckets.recorded;
    var viewGuesses = buckets.guesses;
    var viewDef = buckets.defaults;
    if (searchNeedle) {
      viewRec = viewRec.filter(function (s) {
        return getSampleName(s).toLowerCase().indexOf(searchNeedle) !== -1 || getVaultFileNumber(s.id).toLowerCase().indexOf(searchNeedle) !== -1;
      });
      viewGuesses = viewGuesses.filter(function (a) {
        var p = getSampleById(a.sampleId);
        var pName = p ? getSampleName(p) : '';
        return (
          String(a.name || '').toLowerCase().indexOf(searchNeedle) !== -1 ||
          pName.toLowerCase().indexOf(searchNeedle) !== -1
        );
      });
      viewDef = viewDef.filter(function (s) {
        return getSampleName(s).toLowerCase().indexOf(searchNeedle) !== -1 || getVaultFileNumber(s.id).toLowerCase().indexOf(searchNeedle) !== -1;
      });
    }

    function buildVaultGroupHtml(kind, chipClass, title, subtitle, count, cardsHtml) {
      var clearBtnHtml =
        (kind === 'recorded' || kind === 'guesses') && count > 0
          ? '<button type="button" class="labs-btn-danger labs-btn-xs labs-vg-clear-btn" data-vg-clear-group="' + kind + '">🗑️ Delete All</button>'
          : '';
      return (
        '<section class="labs-vault-group labs-vault-group-' + kind + '" data-vault-group="' + kind + '">' +
        '  <div class="labs-vault-group-head">' +
        '    <div class="labs-vault-group-title-wrap">' +
        '      <span class="labs-vault-group-title">' + title + '</span>' +
        '      <span class="labs-vault-group-sub">' + subtitle + '</span>' +
        '    </div>' +
        '    <div class="labs-vault-group-right">' +
        clearBtnHtml +
        '      <span class="labs-chip ' + chipClass + '">' + count + '</span>' +
        '    </div>' +
        '  </div>' +
        '  <div class="labs-vault-grid">' + cardsHtml + '</div>' +
        '</section>'
      );
    }

    var filter = state.vaultFilter || 'all';
    if (searchNeedle && viewRec.length + viewGuesses.length + viewDef.length === 0) {
      grid.innerHTML =
        '<div class="labs-glass-card labs-empty-card">' +
        '  <h3>No Matching Specimens</h3>' +
        '  <p>No specimens in your Vault matched "<strong>' + esc(state.vaultSearchQuery) + '</strong>".</p>' +
        '</div>';
      return;
    }

    var agingMap = computeVaultAgingMap(state.samples);

    if (filter === 'recorded') {
      if (viewRec.length === 0) {
        grid.innerHTML =
          '<div class="labs-glass-card labs-empty-card">' +
          '  <h3>No Recorded Farts Yet</h3>' +
          '  <p>Go to <strong>Home</strong> and tap <strong>Record New Fart</strong> to record a primary acoustic specimen.</p>' +
          '</div>';
        return;
      }
      grid.innerHTML = buildVaultGroupHtml(
        'recorded',
        'labs-chip-green',
        '🎙️ User Recorded Farts',
        'Captured specimens indexed from Home',
        viewRec.length,
        viewRec.map(function (s) { return buildVaultCardHtml(s, { inVault: true, agingMap: agingMap }); }).join('')
      );
    } else if (filter === 'guesses') {
      if (viewGuesses.length === 0) {
        grid.innerHTML =
          '<div class="labs-glass-card labs-empty-card">' +
          '  <h3>No Recorded Guesses Yet</h3>' +
          '  <p>Run a <strong>Guess The Fart</strong> or <strong>Mimic Mode</strong> trial to log reproductions here.</p>' +
          '</div>';
        return;
      }
      grid.innerHTML = buildVaultGroupHtml(
        'guesses',
        'labs-chip-orange',
        '🎤 User Recorded Guesses',
        'Participant prediction & mimicry logs',
        viewGuesses.length,
        viewGuesses.map(function (a) { return buildVaultGuessCardHtml(a, { inVault: true, agingMap: agingMap }); }).join('')
      );
    } else if (filter === 'defaults') {
      if (viewDef.length === 0) {
        grid.innerHTML =
          '<div class="labs-glass-card labs-empty-card">' +
          '  <h3>No Pre-Loaded Default Farts Found</h3>' +
          '  <p>Place reference WAV or MP3 files in <strong>VaultPreLoads/</strong> to populate the Archive Reference Pack.</p>' +
          '</div>';
        return;
      }
      grid.innerHTML = buildVaultGroupHtml(
        'defaults',
        'labs-chip-blue',
        '📦 Pre-Loaded Default Farts',
        'Institute Reference Corpus · Protected',
        viewDef.length,
        viewDef.map(function (s) { return buildVaultCardHtml(s, { inVault: true, agingMap: agingMap }); }).join('')
      );
    } else {
      var sectionsHtml = '';
      if (viewRec.length > 0) {
        sectionsHtml += buildVaultGroupHtml(
          'recorded',
          'labs-chip-green',
          '🎙️ User Recorded Farts',
          'Captured specimens indexed from Home',
          viewRec.length,
          viewRec.map(function (s) { return buildVaultCardHtml(s, { inVault: true, agingMap: agingMap }); }).join('')
        );
      }
      if (viewGuesses.length > 0) {
        sectionsHtml += buildVaultGroupHtml(
          'guesses',
          'labs-chip-orange',
          '🎤 User Recorded Guesses',
          'Participant prediction & mimicry logs',
          viewGuesses.length,
          viewGuesses.map(function (a) { return buildVaultGuessCardHtml(a, { inVault: true, agingMap: agingMap }); }).join('')
        );
      }
      if (viewDef.length > 0) {
        sectionsHtml += buildVaultGroupHtml(
          'defaults',
          'labs-chip-blue',
          '📦 Pre-Loaded Default Farts',
          'Built-in default specimen pack · Always kept',
          viewDef.length,
          viewDef.map(function (s) { return buildVaultCardHtml(s, { inVault: true, agingMap: agingMap }); }).join('')
        );
      }
      grid.innerHTML = sectionsHtml;
    }

    wireVaultCards(grid);
    drawVaultWaveforms('vault-grid');
  }

  /* ==================== SAMPLE DETAIL ==================== */
  function drawDetailWaveform(progress) {
    var sample = getSampleById(state.detailSampleId);
    var canvas = $('detail-waveform-canvas');
    if (sample && sample.samples && sample.samples.length > 0 && canvas) {
      drawStaticWaveform(canvas, sample.samples, { fallbackW: 520, fallbackH: 92, progress: progress });
    }
  }

  function renderSampleDetail() {
    var sample = getSampleById(state.detailSampleId);
    if (!sample || !sample.samples || sample.samples.length === 0) {
      openVaultView();
      return;
    }

    var stats = TootLabs.Store.getSampleStats(sample.id);
    var feat = sample.features || TootApp.DSP.extractFeatures(sample.samples, sample.sampleRate);
    sample.features = feat;
    var prof = TootApp.DSP.describeSoundProfile(feat);

    if ($('detail-sample-eyebrow')) {
      $('detail-sample-eyebrow').textContent = sample.isBuiltIn ? '📦 ARCHIVE REFERENCE SPECIMEN' : '🎙️ USER RECORDED FART';
    }
    if ($('detail-specimen-stamp')) {
      $('detail-specimen-stamp').textContent = sample.isBuiltIn ? 'ARCHIVE SPECIMEN' : 'VERIFIED SPECIMEN';
      $('detail-specimen-stamp').classList.toggle('is-default', Boolean(sample.isBuiltIn));
    }
    if ($('btn-detail-delete')) {
      $('btn-detail-delete').classList.toggle('hidden', Boolean(sample.isBuiltIn));
    }
    $('detail-specimen-id').textContent = 'FILE #' + getVaultFileNumber(sample.id);
    $('detail-sample-name').textContent = getSampleName(sample);
    $('detail-sample-dur').textContent = (sample.samples.length / sample.sampleRate).toFixed(2) + 's';
    var detailDate = formatArchiveDate(getSpecimenArchiveDateMs(sample), Boolean(sample.isBuiltIn));
    $('detail-sample-meta').textContent = (sample.isBuiltIn ? 'Archived ' + detailDate : formatTimeShort(sample.createdAt)) + ' · ' + prof.pitchLabel + ' · ' + prof.textureLabel;

    var f0Txt = feat && feat.medianPitchHz > 0 && feat.voicedRatio >= 0.15
      ? Math.round(feat.medianPitchHz) + ' Hz'
      : (feat && feat.spectralCentroidHz > 0 ? Math.round(feat.spectralCentroidHz) + ' Hz' : '—');
    var f0Lbl = feat && feat.medianPitchHz > 0 && feat.voicedRatio >= 0.15 ? 'FUNDAMENTAL F0' : 'DOMINANT FREQ';
    var crestTxt = feat && typeof feat.crestFactorDb === 'number' ? feat.crestFactorDb.toFixed(1) + ' dB' : '—';
    var centTxt = feat && typeof feat.spectralCentroidHz === 'number' ? Math.round(feat.spectralCentroidHz) + ' Hz' : '—';

    if (stats.attemptCount > 0) {
      if ($('detail-lbl-1')) $('detail-lbl-1').textContent = 'PEAK FIDELITY';
      $('detail-best-score').textContent = stats.bestScore.toFixed(1) + '%';

      if (typeof stats.previousScore === 'number') {
        if ($('detail-lbl-2')) $('detail-lbl-2').textContent = 'PRIOR GUESS';
        $('detail-prev-score').textContent = stats.previousScore.toFixed(1) + '%';
      } else {
        if ($('detail-lbl-2')) $('detail-lbl-2').textContent = f0Lbl;
        $('detail-prev-score').textContent = f0Txt;
      }

      if ($('detail-lbl-3')) $('detail-lbl-3').textContent = 'LATEST GUESS';
      $('detail-latest-score').textContent = typeof stats.latestScore === 'number' ? stats.latestScore.toFixed(1) + '%' : stats.bestScore.toFixed(1) + '%';

      if ($('detail-lbl-4')) $('detail-lbl-4').textContent = 'LOGGED GUESSES';
      $('detail-attempt-count').textContent = String(stats.attemptCount);
    } else {
      if ($('detail-lbl-1')) $('detail-lbl-1').textContent = f0Lbl;
      $('detail-best-score').textContent = f0Txt;

      if ($('detail-lbl-2')) $('detail-lbl-2').textContent = 'PEAK CREST';
      $('detail-prev-score').textContent = crestTxt;

      if ($('detail-lbl-3')) $('detail-lbl-3').textContent = 'CENTROID';
      $('detail-latest-score').textContent = centTxt;

      if ($('detail-lbl-4')) $('detail-lbl-4').textContent = 'LOGGED GUESSES';
      $('detail-attempt-count').textContent = '0';
    }

    var banner = $('detail-improvement-banner');
    if (typeof stats.previousScore === 'number' && typeof stats.latestScore === 'number') {
      var diff = Math.round((stats.latestScore - stats.previousScore) * 10) / 10;
      banner.classList.remove('hidden', 'delta-neutral');
      if (diff >= 0) {
        banner.textContent = 'Score Progression: ' + stats.previousScore.toFixed(1) + '% → ' + stats.latestScore.toFixed(1) + '% (+' + diff.toFixed(1) + '%)';
      } else {
        banner.classList.add('delta-neutral');
        banner.textContent = 'Latest Guess: ' + stats.previousScore.toFixed(1) + '% → ' + stats.latestScore.toFixed(1) + '% (' + diff.toFixed(1) + '%)';
      }
    } else {
      banner.classList.add('hidden');
    }

    var listEl = $('detail-attempts-list');
    var ranked = state.detailAttempts.slice().sort(function (a, b) {
      return (b.exactScore || 0) - (a.exactScore || 0);
    });

    if (ranked.length === 0) {
      listEl.innerHTML =
        '<div class="labs-glass-card labs-empty-card"><p>No guesses recorded yet for this fart. Tap <strong>🎯 Guess This Fart</strong> to play.</p></div>';
    } else {
      listEl.innerHTML = ranked
        .map(function (att, idx) {
          var score = typeof att.exactScore === 'number' ? att.exactScore : 0;
          var rank = TootLabs.Store.getRankForScore(score);
          var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + (idx + 1);
          var stars = '⭐'.repeat(att.stars || 1);
          return (
            '<div class="labs-attempt-row">' +
            '  <div class="labs-att-left">' +
            '    <span class="labs-rank-medal">' + medal + '</span>' +
            '    <span class="labs-att-score" style="color:' + rank.color + '">' + score.toFixed(1) + '%</span>' +
            '    <div>' +
            '      <div class="labs-att-meta">' + esc(att.name) + ' · ' + esc(rank.title) + ' ' + stars + '</div>' +
            '      <div class="labs-att-sub">' + esc(formatTimeShort(att.createdAt)) + '</div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="labs-att-btns">' +
            '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-datt-play="' + esc(att.id) + '">▶ Play</button>' +
            '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-datt-single="' + esc(att.id) + '">Guess Analysis</button>' +
            '    <button type="button" class="labs-btn labs-btn-blue labs-btn-sm" data-datt-cmp="' + esc(att.id) + '">Compare</button>' +
            '  </div>' +
            '</div>'
          );
        })
        .join('');

      listEl.querySelectorAll('[data-datt-play]').forEach(function (b) {
        b.addEventListener('click', function () {
          var found = state.detailAttempts.find(function (x) { return x.id === b.getAttribute('data-datt-play'); });
          if (found) TootApp.Audio.playSound(found.samples, found.sampleRate, { channel: 'detail_att' });
        });
      });
      listEl.querySelectorAll('[data-datt-single]').forEach(function (b) {
        b.addEventListener('click', function () {
          openFartnalysis('guess', sample.id, b.getAttribute('data-datt-single'));
        });
      });
      listEl.querySelectorAll('[data-datt-cmp]').forEach(function (b) {
        b.addEventListener('click', function () {
          openFartnalysis('comparison', sample.id, b.getAttribute('data-datt-cmp'));
        });
      });
    }

    drawDetailWaveform(null);
  }

  function openSampleDetail(sampleId) {
    state.detailSampleId = sampleId;
    var sample = getSampleById(sampleId);
    Promise.all([ensureTargetReady(sample), TootLabs.Store.loadAttemptsForSample(sampleId)])
      .then(function (res) {
        state.detailAttempts = res[1] || [];
        showView('detail');
        renderSampleDetail();
      })
      .catch(function (err) {
        showToast((err && err.message) || 'Could not load specimen audio.', true);
      });
  }

  /* ==================== GUESS & MIMIC MODES + INLINE RESULTS ==================== */
  function drawGuessWaveforms() {
    var target = getSampleById(state.guessTargetId);
    var waveCanvas = $('guess-target-wave');
    if (!waveCanvas) return;
    if (target && target.samples && target.samples.length > 0 && (state.guessRevealed || state.guessMode === 'mimic')) {
      drawStaticWaveform(waveCanvas, target.samples, {
        fallbackW: 480,
        fallbackH: 46,
        barWidth: 2,
        gap: 1.5,
        colorA: '#134e38',
        colorB: '#1f7a53',
        lineColor: 'rgba(46, 72, 58, 0.26)'
      });
    } else if (typeof waveCanvas.getContext === 'function') {
      var wctx = waveCanvas.getContext('2d');
      if (wctx && typeof wctx.clearRect === 'function') {
        wctx.clearRect(0, 0, waveCanvas.width || 480, waveCanvas.height || 46);
      }
    }
  }

  function renderGuessLeaderboard() {
    var wrap = $('guess-leaderboard-wrap');
    var toggleBtn = $('btn-guess-toggle-history');
    var winEl = $('guess-winner-banner');
    var listEl = $('guess-leaderboard-list');
    var target = getSampleById(state.guessTargetId);

    if (!target || state.guessAttempts.length === 0) {
      if (toggleBtn) toggleBtn.classList.add('hidden');
      if (wrap) wrap.classList.add('hidden');
      return;
    }

    if (toggleBtn) {
      toggleBtn.classList.remove('hidden');
      toggleBtn.textContent = (state.historyOpen ? '▾ Hide Vault Standings (' : '🏆 Past Vault Standings (') + state.guessAttempts.length + ')';
    }
    if (wrap) {
      wrap.classList.toggle('hidden', !state.historyOpen);
    }

    var sorted = state.guessAttempts.slice().sort(function (a, b) {
      return (b.exactScore || 0) - (a.exactScore || 0);
    });

    var winner = sorted[0];
    var wRank = TootLabs.Store.getRankForScore(winner.exactScore || 0);
    winEl.textContent =
      '🏆 Winner: ' +
      winner.name +
      ' — ' +
      (winner.exactScore || 0).toFixed(1) +
      '% (' +
      wRank.title +
      ') out of ' +
      sorted.length +
      (sorted.length === 1 ? ' guess!' : ' guesses!');

    listEl.innerHTML = sorted
      .map(function (att, idx) {
        var score = typeof att.exactScore === 'number' ? att.exactScore : 0;
        var rank = TootLabs.Store.getRankForScore(score);
        var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + (idx + 1);
        var stars = '⭐'.repeat(att.stars || 1);

        return (
          '<div class="labs-attempt-row">' +
          '  <div class="labs-att-left">' +
          '    <span class="labs-rank-medal">' + medal + '</span>' +
          '    <span class="labs-att-score" style="color:' + rank.color + '">' + score.toFixed(1) + '%</span>' +
          '    <div>' +
          '      <div class="labs-att-meta">' + esc(att.name) + ' · ' + esc(rank.title) + ' ' + stars + '</div>' +
          '      <div class="labs-att-sub">' + esc(formatTimeShort(att.createdAt)) + '</div>' +
          '    </div>' +
          '  </div>' +
          '  <div class="labs-att-btns">' +
          '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-gplay="' + esc(att.id) + '">▶</button>' +
          '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-grename="' + esc(att.id) + '" title="Rename Guesser">✏️</button>' +
          '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-gsingle="' + esc(att.id) + '">Guess Analysis</button>' +
          '    <button type="button" class="labs-btn labs-btn-blue labs-btn-sm" data-gcmp="' + esc(att.id) + '">Compare</button>' +
          '  </div>' +
          '</div>'
        );
      })
      .join('');

    listEl.querySelectorAll('[data-gplay]').forEach(function (b) {
      b.addEventListener('click', function () {
        var found = state.guessAttempts.find(function (x) { return x.id === b.getAttribute('data-gplay'); });
        if (found) TootApp.Audio.playSound(found.samples, found.sampleRate, { channel: 'lb_play' });
      });
    });

    listEl.querySelectorAll('[data-grename]').forEach(function (b) {
      b.addEventListener('click', function () {
        var found = state.guessAttempts.find(function (x) { return x.id === b.getAttribute('data-grename'); });
        if (!found) return;
        state.renameTarget = { kind: 'guess', item: found };
        $('labs-rename-heading').textContent = 'Rename Guesser';
        $('labs-rename-input').value = found.name || '';
        $('labs-rename-modal').classList.remove('hidden');
        $('labs-rename-input').focus();
      });
    });

    listEl.querySelectorAll('[data-gsingle]').forEach(function (b) {
      b.addEventListener('click', function () {
        openFartnalysis('guess', target.id, b.getAttribute('data-gsingle'));
      });
    });

    listEl.querySelectorAll('[data-gcmp]').forEach(function (b) {
      b.addEventListener('click', function () {
        openFartnalysis('comparison', target.id, b.getAttribute('data-gcmp'));
      });
    });
  }

  function renderSessionQueue() {
    var qCard = $('guess-session-queue-card');
    var qCountEl = $('guess-queue-count');
    var qListEl = $('guess-queue-list');
    var qAnalyzeBtn = $('btn-guess-queue-analyze');
    var target = getSampleById(state.guessTargetId);

    if (!qCard || !qListEl) return;
    if (!target || state.sessionGuesses.length === 0) {
      qCard.classList.add('hidden');
      qListEl.innerHTML = '';
      return;
    }

    var isHiddenGuess = state.guessMode === 'guess' && !state.guessRevealed;
    qCard.classList.remove('hidden');
    if (qCountEl) qCountEl.textContent = state.sessionGuesses.length + ' Locked';
    if (qAnalyzeBtn) {
      if (isHiddenGuess) {
        qAnalyzeBtn.textContent =
          state.sessionGuesses.length === 1
            ? '🔊 Score Now — Reveal Mystery Fart'
            : '🔊 Score All ' + state.sessionGuesses.length + ' Guesses — Reveal Fart';
      } else {
        qAnalyzeBtn.textContent =
          state.sessionGuesses.length === 1
            ? '🧪 Score Now — Compare Mimic'
            : '🧪 Score All ' + state.sessionGuesses.length + ' Mimics';
      }
    }

    qListEl.innerHTML = state.sessionGuesses
      .map(function (g, idx) {
        var dur = (g.samples.length / (g.sampleRate || 44100)).toFixed(2) + 's';
        return (
          '<div class="labs-queue-row">' +
          '  <div class="labs-queue-info">' +
          '    <strong>' + esc(g.name) + '</strong>' +
          '    <span class="labs-chip ' + (isHiddenGuess ? 'labs-chip-orange' : 'labs-chip-green') + '">' + (isHiddenGuess ? 'Locked' : 'Recorded') + ' · ' + dur + '</span>' +
          '  </div>' +
          '  <div class="labs-att-btns">' +
          '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-qplay="' + idx + '">▶</button>' +
          '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-qdel="' + idx + '" title="Remove guess">✕</button>' +
          '  </div>' +
          '</div>'
        );
      })
      .join('');

    qListEl.querySelectorAll('[data-qplay]').forEach(function (b) {
      b.addEventListener('click', function () {
        var item = state.sessionGuesses[parseInt(this.getAttribute('data-qplay'), 10)];
        if (item) TootApp.Audio.playSound(item.samples, item.sampleRate, { channel: 'queue_play' });
      });
    });
    qListEl.querySelectorAll('[data-qdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-qdel'), 10);
        if (!isNaN(idx)) {
          state.sessionGuesses.splice(idx, 1);
          renderGuessView();
        }
      });
    });
  }

  function renderBlindPane() {
    var listEl = $('blind-guesses-list');
    var analyzeBtn = $('btn-blind-analyze');
    var origStatus = $('blind-orig-status');
    var origWaveWrap = $('blind-orig-wave-wrap');
    var origWave = $('blind-orig-wave');
    var nameInput = $('blind-name-input');

    if (nameInput && !nameInput.value.trim()) {
      nameInput.placeholder = 'Guesser ' + (state.blindGuesses.length + 1);
    }

    if (listEl) {
      if (state.blindGuesses.length === 0) {
        listEl.innerHTML = '<div class="labs-hint-text">No blind guesses recorded yet for this round.</div>';
      } else {
        listEl.innerHTML = state.blindGuesses
          .map(function (g, idx) {
            var dur = (g.samples.length / (g.sampleRate || 44100)).toFixed(2) + 's';
            return (
              '<div class="labs-queue-row">' +
              '  <div class="labs-queue-info">' +
              '    <strong>' + esc(g.name) + '</strong>' +
              '    <span class="labs-chip labs-chip-orange">Blind Guess · ' + dur + '</span>' +
              '  </div>' +
              '  <div class="labs-att-btns">' +
              '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-bplay="' + idx + '">▶</button>' +
              '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-bdel="' + idx + '">✕</button>' +
              '  </div>' +
              '</div>'
            );
          })
          .join('');
        listEl.querySelectorAll('[data-bplay]').forEach(function (b) {
          b.addEventListener('click', function () {
            var item = state.blindGuesses[parseInt(this.getAttribute('data-bplay'), 10)];
            if (item) TootApp.Audio.playSound(item.samples, item.sampleRate, { channel: 'blind_play' });
          });
        });
        listEl.querySelectorAll('[data-bdel]').forEach(function (b) {
          b.addEventListener('click', function () {
            var idx = parseInt(this.getAttribute('data-bdel'), 10);
            if (!isNaN(idx)) {
              state.blindGuesses.splice(idx, 1);
              renderBlindPane();
            }
          });
        });
      }
    }

    if (origStatus) {
      origStatus.textContent = state.blindOriginal
        ? 'Source Acoustic Specimen: "' + getSampleName(state.blindOriginal) + '" (' + (state.blindOriginal.samples.length / state.blindOriginal.sampleRate).toFixed(2) + 's) — Indexed in Research Archive.'
        : 'No source acoustic specimen captured for this blind trial.';
    }
    if (origWaveWrap && origWave) {
      origWaveWrap.classList.toggle('hidden', !state.blindOriginal);
      if (state.blindOriginal) {
        drawStaticWaveform(origWave, state.blindOriginal.samples, { fallbackW: 440, fallbackH: 60 });
      }
    }
    if (analyzeBtn) {
      analyzeBtn.disabled = !(state.blindGuesses.length > 0 && state.blindOriginal);
    }
  }

  function openGamesView() {
    closeSettingsMenu();
    showView('games');
    var rfStats = loadRealFakeStats();
    var rfBadge = $('games-rf-badge');
    if (rfBadge) {
      rfBadge.textContent = rfStats.played > 0
        ? Math.round((rfStats.youCorrect / rfStats.played) * 100) + '% LIFETIME'
        : 'TOP SECRET';
    }
    var chBadge = $('games-chain-badge');
    if (chBadge && TootLabs.SignalChain && typeof TootLabs.SignalChain.loadChains === 'function') {
      TootLabs.SignalChain.loadChains().then(function (list) {
        var cnt = Array.isArray(list) ? list.length : 0;
        chBadge.textContent = cnt > 0 ? cnt + (cnt === 1 ? ' CHAIN SAVED' : ' CHAINS SAVED') : 'RELAY CHAIN';
      }).catch(function () {});
    }
  }

  function syncSettingsModalState() {
    var sentryBtn = $('btn-settings-toggle-sentry');
    if (sentryBtn) {
      var isAuto = state.recordMode === 'auto';
      sentryBtn.textContent = isAuto ? '● AUTO DETECT: ON' : '○ OFF';
      sentryBtn.classList.toggle('active', isAuto);
    }
    var modalMic = $('labs-settings-mic-select');
    var drawerMic = $('labs-mic-device');
    if (modalMic && drawerMic) {
      if (!modalMic.innerHTML && drawerMic.innerHTML) modalMic.innerHTML = drawerMic.innerHTML;
      modalMic.value = (TootApp.Audio && TootApp.Audio.getSelectedDevice()) || drawerMic.value || '';
    }
  }

  function openSettingsModal() {
    closeSettingsMenu();
    syncSettingsModalState();
    refreshMicDevices();
    var m = $('labs-settings-modal');
    if (m) m.classList.remove('hidden');
  }

  function closeSettingsModal() {
    var m = $('labs-settings-modal');
    if (m) m.classList.add('hidden');
  }

  function openCustomFartnalysisPair(soundA, soundB, labelA, labelB) {
    if (!soundA || !soundB) return;
    if (state.fnController) {
      state.fnController.destroy();
      state.fnController = null;
    }
    state.fnMode = 'comparison';
    showView('fartnalysis');
    state.prevBeforeFartnalysis = 'chain';
    var emptyEl = $('fn-empty-state');
    if (emptyEl) emptyEl.classList.add('hidden');
    var pickersBar = $('fn-pickers-bar');
    if (pickersBar) pickersBar.classList.add('hidden');
    var guessLb = $('fn-guess-leaderboard');
    if (guessLb) guessLb.classList.add('hidden');

    var mountEl = $('fn-dashboard-mount');
    if (!mountEl || !TootLabs.Fartnalysis) return;
    state.fnController = TootLabs.Fartnalysis.renderDashboard(mountEl, {
      soundA: soundA,
      soundB: soundB,
      archiveSamples: state.samples,
      labelA: labelA || soundA.name || 'Origin',
      labelB: labelB || soundB.name || 'Relay Mimic',
      onOpenTeam: openTeamView,
      onCopyVerdict: handleCopyVerdict,
      onShareOrEmail: function (sA, sB, r, exact, specCanvases) {
        var reportText = TootLabs.Store.buildComparisonReportText(sA, sB, r, exact);
        var pdfPayload = { mode: 'comparison', soundA: sA, soundB: sB, result: r, specCanvases: specCanvases };
        var stitched = stitchComparisonAudio(sA, sB);
        openShareEmailModal({
          title: 'Share Relay Link Comparison',
          subtitle: (labelA || 'Origin') + ' vs ' + (labelB || 'Link') + ' (' + exact.toFixed(1) + '%)',
          onShare: function () { shareTextOrAudio('Signal Decay Comparison: ' + exact.toFixed(1) + '%', reportText, stitched, pdfPayload); },
          onEmail: function () { emailAnalysisReport('Signal Decay Comparison: ' + exact.toFixed(1) + '%', reportText, pdfPayload, stitched); },
          onPdf: function () { downloadAnalysisPdf(pdfPayload); }
        });
      },
      onDownloadPdf: function (sA, sB, r, specCanvases) {
        downloadAnalysisPdf({ mode: 'comparison', soundA: sA, soundB: sB, result: r, specCanvases: specCanvases });
      }
    });
  }

  function syncSubModeBackButtons() {
    var label =
      state.subModeReturnTo === 'guess'
        ? '← Back to Guess The Fart'
        : state.subModeReturnTo === 'games'
        ? '← Back to Games'
        : '← Home';
    if ($('btn-seq-back')) $('btn-seq-back').textContent = label;
    if ($('btn-qf-back')) $('btn-qf-back').textContent = label;
    if ($('btn-blind-back')) $('btn-blind-back').textContent = label;
  }

  function handleSubModeBack() {
    abortQuickFireRound(true);
    if (state.seqActive) {
      abortSequenceRound(true);
    }
    if (state.subModeReturnTo === 'guess') {
      setGuessSubMode('standard');
    } else if (state.subModeReturnTo === 'games') {
      openGamesView();
    } else {
      openHomeView();
    }
  }

  function setGuessSubMode(subMode) {
    clearRevealTimers();
    var next =
      subMode === 'blind'
        ? 'blind'
        : subMode === 'quickfire'
        ? 'quickfire'
        : subMode === 'sequence'
        ? 'sequence'
        : 'standard';
    if (state.guessSubMode === 'quickfire' && next !== 'quickfire') {
      abortQuickFireRound(true);
    }
    if (state.guessSubMode === 'sequence' && next !== 'sequence' && state.seqActive) {
      abortSequenceRound(true);
    }
    state.guessSubMode = next;
    syncSubModeBackButtons();
    var stdPane = $('guess-standard-pane');
    var blindPane = $('guess-blind-pane');
    var qfPane = $('guess-quickfire-pane');
    var seqPane = $('guess-sequence-pane');
    if (stdPane) stdPane.classList.toggle('hidden', next !== 'standard');
    if (blindPane) blindPane.classList.toggle('hidden', next !== 'blind');
    if (qfPane) qfPane.classList.toggle('hidden', next !== 'quickfire');
    if (seqPane) seqPane.classList.toggle('hidden', next !== 'sequence');
    if (next === 'blind') renderBlindPane();
    else if (next === 'quickfire') renderQuickFirePane();
    else if (next === 'sequence') renderSequencePane();
    else renderGuessView();
  }

  /* ==================== QUICK-FIRE MIMIC ROUND ==================== */
  function clearQuickFireTimers() {
    for (var i = 0; i < state.qfTimers.length; i++) {
      clearTimeout(state.qfTimers[i]);
    }
    state.qfTimers = [];
    if (state.qfScoreRaf) {
      cancelAnimationFrame(state.qfScoreRaf);
      state.qfScoreRaf = null;
    }
    if (state.qfConfettiHandle && typeof state.qfConfettiHandle.stop === 'function') {
      state.qfConfettiHandle.stop();
      state.qfConfettiHandle = null;
    }
  }

  function createQuickFireAutoDetector(opts) {
    opts = opts || {};
    var calibrateSec = typeof opts.calibrateSec === 'number' ? opts.calibrateSec : 0.08;
    var minSoundMs = typeof opts.minSoundMs === 'number' ? opts.minSoundMs : 75;
    var trailingSilenceMs = typeof opts.trailingSilenceMs === 'number' ? opts.trailingSilenceMs : 200;
    var interBurstSilenceMs = typeof opts.interBurstSilenceMs === 'number' ? opts.interBurstSilenceMs : 380;
    var expectedBursts = Math.max(1, parseInt(opts.expectedBursts, 10) || 1);
    var minElapsedSec = typeof opts.minElapsedSec === 'number' ? opts.minElapsedSec : 0.22;
    var releasePeakRatio = typeof opts.releasePeakRatio === 'number' ? opts.releasePeakRatio : 0.30;

    var phase = 'calibrating';
    var calSamples = [];
    var ambientFloor = 0.006;
    var onsetThresh = 0.020;
    var releaseThresh = 0.012;
    var onsetFrames = 0;
    var burstsDetected = 0;
    var peakRms = 0;
    var activeMs = 0;
    var quietStreakMs = 0;

    function computeFloorFromSamples(arr, fallback) {
      if (!arr || arr.length === 0) return fallback;
      var sorted = arr.slice().sort(function (a, b) { return a - b; });
      var p40Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.40));
      return Math.max(0.0025, Math.min(0.055, sorted[p40Idx]));
    }

    function syncThresholds() {
      onsetThresh = Math.max(0.014, ambientFloor * 2.6 + 0.004);
      releaseThresh = Math.max(0.009, ambientFloor * 1.55 + 0.0025);
    }

    syncThresholds();

    return {
      feed: function (rms, elapsed, dt) {
        var r = Math.max(0, Number(rms) || 0);
        var el = Math.max(0, Number(elapsed) || 0);
        var deltaMs = Math.max(0, Number(dt) || 16);
        var detectedNow = false;
        var shouldStop = false;

        if (phase === 'calibrating') {
          if (el >= 0.04 && r >= 0.042) {
            ambientFloor = calSamples.length > 0 ? computeFloorFromSamples(calSamples, 0.008) : 0.008;
            syncThresholds();
            phase = 'capturing';
            detectedNow = true;
            burstsDetected = 1;
            peakRms = r;
            activeMs = deltaMs;
            quietStreakMs = 0;
          } else if (el < calibrateSec) {
            calSamples.push(r);
          } else {
            ambientFloor = computeFloorFromSamples(calSamples, r);
            syncThresholds();
            phase = 'armed';
          }
        }

        if (phase === 'armed') {
          if (r >= onsetThresh) {
            onsetFrames++;
            if (onsetFrames >= 2 || r >= onsetThresh * 1.8) {
              phase = 'capturing';
              detectedNow = true;
              burstsDetected = 1;
              peakRms = r;
              activeMs += deltaMs;
              quietStreakMs = 0;
            }
          } else {
            onsetFrames = 0;
            ambientFloor = Math.max(0.0025, Math.min(0.055, ambientFloor * 0.92 + r * 0.08));
            syncThresholds();
          }
        } else if (phase === 'capturing' && !detectedNow) {
          if (r > peakRms) peakRms = r;
          var dynRelease = Math.max(releaseThresh, peakRms * releasePeakRatio);
          if (r >= dynRelease) {
            if (quietStreakMs >= 55 && r >= onsetThresh) {
              burstsDetected++;
            }
            activeMs += deltaMs;
            quietStreakMs = 0;
          } else {
            quietStreakMs += deltaMs;
          }
          var effectiveSilenceMs = burstsDetected < expectedBursts ? interBurstSilenceMs : trailingSilenceMs;
          if (activeMs >= minSoundMs && quietStreakMs >= effectiveSilenceMs && el >= minElapsedSec) {
            phase = 'stopped';
            shouldStop = true;
          }
        }

        return {
          phase: phase,
          detectedNow: detectedNow,
          shouldStop: shouldStop,
          ambientFloor: ambientFloor,
          onsetThresh: onsetThresh,
          releaseThresh: releaseThresh,
          activeMs: activeMs,
          quietStreakMs: quietStreakMs
        };
      }
    };
  }

  function getQuickFirePool(srcKey) {
    var src = srcKey || state.qfSource || 'all';
    var out = [];
    for (var i = 0; i < state.samples.length; i++) {
      var s = state.samples[i];
      if (!s) continue;
      if (src === 'defaults' && !s.isBuiltIn) continue;
      if (src === 'recorded' && s.isBuiltIn) continue;
      out.push(s);
    }
    return out;
  }

  function pickQuickFireDeck(count, srcKey) {
    var pool = getQuickFirePool(srcKey);
    var wanted = Math.max(2, Math.min(20, parseInt(count, 10) || 5));
    if (pool.length === 0) return [];
    var shuffled = pool.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    return shuffled.slice(0, Math.min(wanted, shuffled.length));
  }

  function setQuickFireCount(n) {
    var clamped = Math.max(2, Math.min(20, parseInt(n, 10) || 5));
    state.qfCount = clamped;
    var inp = $('qf-count-input');
    if (inp) inp.value = String(clamped);
    var pillsWrap = $('qf-count-pills');
    if (pillsWrap) {
      pillsWrap.querySelectorAll('[data-qf-count]').forEach(function (btn) {
        var pv = parseInt(btn.getAttribute('data-qf-count'), 10);
        btn.classList.toggle('active', pv === clamped);
      });
    }
    renderQuickFireSetup();
  }

  function renderQuickFireSetup() {
    var pool = getQuickFirePool(state.qfSource);
    var actual = Math.min(state.qfCount || 5, pool.length);
    var noteEl = $('qf-pool-note');
    var startBtn = $('btn-qf-start');
    var srcSel = $('qf-source-select');
    var inp = $('qf-count-input');
    if (srcSel) srcSel.value = state.qfSource || 'all';
    if (inp) inp.value = String(state.qfCount || 5);
    var pillsWrap = $('qf-count-pills');
    if (pillsWrap) {
      pillsWrap.querySelectorAll('[data-qf-count]').forEach(function (btn) {
        var pv = parseInt(btn.getAttribute('data-qf-count'), 10);
        btn.classList.toggle('active', pv === state.qfCount);
      });
    }
    if (noteEl) {
      noteEl.textContent =
        pool.length === 0
          ? 'No farts available in this filter — record a fart or switch pool above.'
          : pool.length + (pool.length === 1 ? ' fart available · Playing ' : ' farts available · Playing ') + actual + ' this round';
    }
    if (startBtn) {
      startBtn.disabled = pool.length === 0;
      startBtn.textContent = actual > 0 ? '⚡ Start ' + actual + '-Fart Quick-Fire Round' : '⚡ No Farts in Pool';
    }
  }

  function renderQuickFireDots(activeIdx, recActive, rawCaptures) {
    var dotsEl = $('qf-progress-dots');
    if (!dotsEl) return;
    var total = state.qfDeck.length || state.qfCount || 5;
    var html = [];
    for (var i = 0; i < total; i++) {
      var res = state.qfResults[i];
      var raw = rawCaptures && rawCaptures[i];
      var cls = 'labs-qf-dot';
      var lbl = String(i + 1);
      if (res) {
        cls += res.missed ? ' is-missed' : ' is-done';
        lbl = res.missed ? '✕' : Math.round(res.exactScore) + '%';
      } else if (raw) {
        cls += raw.missed ? ' is-missed' : ' is-done';
        lbl = raw.missed ? '✕' : '✓';
      } else if (i === activeIdx) {
        cls += recActive ? ' is-rec' : ' is-active';
      }
      html.push('<span class="' + cls + '" data-qf-dot="' + i + '">' + lbl + '</span>');
    }
    dotsEl.innerHTML = html.join('');
  }

  function pickQuickFireCelebration(avg) {
    if (avg >= 90) return { banner: '🏛️ EXCEPTIONAL RAPID-SEQUENCE REPRODUCTION — ARCHIVE WORTHY', legendary: true };
    if (avg >= 78) return { banner: '🔬 RESEARCH-GRADE ACOUSTIC PRECISION ACHIEVED', legendary: true };
    if (avg >= 60) return { banner: '📊 STATISTICALLY FAVOURABLE REPRODUCTION FIDELITY', legendary: false };
    if (avg >= 40) return { banner: '🧪 PRELIMINARY TELEMETRY LOGGED — FURTHER TRIALS ADVISED', legendary: false };
    return { banner: '📋 ELEVATED SPECTRAL VARIANCE — RECALIBRATION RECOMMENDED', legendary: false };
  }

  function renderQuickFireResults(opts) {
    opts = opts || {};
    var animate = Boolean(opts.animate);
    var results = state.qfResults || [];
    var celebEl = $('qf-celebration-banner');
    var avgScoreEl = $('qf-avg-score');
    var avgRankEl = $('qf-avg-rank');
    var avgStarsEl = $('qf-avg-stars');
    var avgSummaryEl = $('qf-avg-summary');
    var hiEl = $('qf-highlights');
    var listEl = $('qf-results-list');

    clearQuickFireTimers();

    var sum = 0;
    var valid = 0;
    var best = null;
    var toughest = null;
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      sum += item.exactScore || 0;
      if (!item.missed) valid++;
      if (!best || (item.exactScore || 0) > (best.exactScore || 0)) best = item;
      if (!toughest || (item.exactScore || 0) < (toughest.exactScore || 0)) toughest = item;
    }
    var avg = results.length > 0 ? sum / results.length : 0;
    var avgRank = TootLabs.Store.getRankForScore(avg);
    var avgReward = TootLabs.Store.getRewardTier(avg);
    var celeb = pickQuickFireCelebration(avg);

    var avgTitle = avgRank.title || avgRank.name || 'Rook';
    if (celebEl) {
      celebEl.textContent = celeb.banner;
      celebEl.classList.remove('hidden', 'is-legendary');
      if (celeb.legendary) celebEl.classList.add('is-legendary');
    }
    if (avgRankEl) avgRankEl.textContent = avgTitle;
    if (avgSummaryEl) {
      avgSummaryEl.textContent =
        'Completed ' +
        results.length +
        ' acoustic trials (' +
        valid +
        ' captured) · Mean Reproduction Fidelity ' +
        avg.toFixed(1) +
        '% (' +
        avgTitle +
        ')';
    }
    if (hiEl) {
      var chips = [];
      if (best) {
        chips.push(
          '<span class="labs-chip labs-chip-green">🏆 Best Fidelity: #' +
            (best.index + 1) +
            ' ' +
            esc(getSampleName(best.target)) +
            ' (' +
            (best.exactScore || 0).toFixed(1) +
            '%)</span>'
        );
      }
      if (toughest && toughest !== best) {
        chips.push(
          '<span class="labs-chip labs-chip-orange">🎯 Highest Variance: #' +
            (toughest.index + 1) +
            ' ' +
            esc(getSampleName(toughest.target)) +
            ' (' +
            (toughest.exactScore || 0).toFixed(1) +
            '%)</span>'
        );
      }
      hiEl.innerHTML = chips.join('');
    }

    if (listEl) {
      listEl.innerHTML = results
        .map(function (r, idx) {
          var tName = getSampleName(r.target);
          var scoreStr = (r.exactScore || 0).toFixed(1) + '%';
          var m = r.metrics;
          var chipsHtml = r.missed
            ? '<span class="labs-chip labs-chip-orange">Too quiet / Missed capture</span>'
            : '<span class="labs-chip">Dur ' +
              m.duration +
              '%</span><span class="labs-chip">Res ' +
              m.resonance +
              '%</span><span class="labs-chip">Pres ' +
              m.pressure +
              '%</span><span class="labs-chip">Tim ' +
              m.timing +
              '%</span>';
          var guessBtns = r.guessSound
            ? '<button type="button" class="labs-btn-ghost labs-btn-xs" data-qf-play-guess="' +
              idx +
              '">🎤 Yours</button><button type="button" class="labs-btn-ghost labs-btn-xs" data-qf-play-both="' +
              idx +
              '">🔊 Both</button>'
            : '';
          return (
            '<div class="labs-qf-res-row' +
            (animate ? ' is-pop' : '') +
            '" style="' +
            (animate ? 'animation-delay:' + idx * 65 + 'ms;' : '') +
            '" data-qf-row="' +
            idx +
            '">' +
            '  <div class="labs-qf-res-top">' +
            '    <div class="labs-qf-res-name">#' +
            (r.index + 1) +
            ' · ' +
            esc(tName) +
            '</div>' +
            '    <div class="labs-qf-res-score-wrap">' +
            '      <span class="labs-chip">' +
            esc(r.rank && (r.rank.title || r.rank.name) || '') +
            '</span>' +
            '      <span class="labs-qf-res-score">' +
            scoreStr +
            '</span>' +
            '    </div>' +
            '  </div>' +
            '  <div class="labs-qf-res-chips">' +
            chipsHtml +
            '</div>' +
            '  <div class="labs-qf-res-actions">' +
            '    <button type="button" class="labs-btn-ghost labs-btn-xs" data-qf-play-orig="' +
            idx +
            '">▶ Fart</button>' +
            guessBtns +
            '  </div>' +
            '</div>'
          );
        })
        .join('');

      listEl.querySelectorAll('[data-qf-play-orig]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var r = state.qfResults[parseInt(this.getAttribute('data-qf-play-orig'), 10)];
          if (r && r.target && r.target.samples) {
            TootApp.Audio.playSound(r.target.samples, r.target.sampleRate || 44100, { channel: 'qf_replay' });
          }
        });
      });
      listEl.querySelectorAll('[data-qf-play-guess]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var r = state.qfResults[parseInt(this.getAttribute('data-qf-play-guess'), 10)];
          if (r && r.guessSound && r.guessSound.samples) {
            TootApp.Audio.playSound(r.guessSound.samples, r.guessSound.sampleRate || 44100, { channel: 'qf_replay' });
          }
        });
      });
      listEl.querySelectorAll('[data-qf-play-both]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var r = state.qfResults[parseInt(this.getAttribute('data-qf-play-both'), 10)];
          if (r && r.target && r.target.samples && r.guessSound && r.guessSound.samples && TootApp.Audio.playSimultaneous) {
            TootApp.Audio.playSimultaneous([
              { samples: r.target.samples, sampleRate: r.target.sampleRate || 44100, channel: 'qf_a' },
              { samples: r.guessSound.samples, sampleRate: r.guessSound.sampleRate || 44100, channel: 'qf_b' }
            ]);
          }
        });
      });
    }

    if (!animate) {
      if (avgScoreEl) {
        avgScoreEl.classList.remove('is-counting', 'is-popped');
        avgScoreEl.textContent = avg.toFixed(1) + '%';
      }
      if (avgStarsEl) {
        var starsHtml = [];
        for (var s = 0; s < avgReward.stars; s++) starsHtml.push('<span class="labs-reward-star">⭐</span>');
        avgStarsEl.innerHTML = starsHtml.join('');
      }
      return;
    }

    if (avgScoreEl) {
      avgScoreEl.textContent = '0.0%';
      avgScoreEl.classList.remove('is-popped');
      avgScoreEl.classList.add('is-counting');
      var animStart = performance.now();
      var durationMs = 920;
      var tickAvg = function (now) {
        if (state.view !== 'guess' || state.guessSubMode !== 'quickfire' || state.qfPhase !== 'results') {
          state.qfScoreRaf = null;
          return;
        }
        var t = Math.min(1, (now - animStart) / durationMs);
        var eased = 1 - Math.pow(1 - t, 3);
        avgScoreEl.textContent = (avg * eased).toFixed(1) + '%';
        if (t < 1) {
          state.qfScoreRaf = requestAnimationFrame(tickAvg);
        } else {
          avgScoreEl.textContent = avg.toFixed(1) + '%';
          avgScoreEl.classList.remove('is-counting');
          avgScoreEl.classList.add('is-popped');
          state.qfScoreRaf = null;
        }
      };
      state.qfScoreRaf = requestAnimationFrame(tickAvg);
    }

    if (avgStarsEl) {
      avgStarsEl.innerHTML = '';
      var startDelay = 380;
      var stepMs = 250;
      for (var sIdx = 0; sIdx < avgReward.stars; sIdx++) {
        (function (starIndex) {
          state.qfTimers.push(
            setTimeout(function () {
              if (state.view !== 'guess' || state.guessSubMode !== 'quickfire' || state.qfPhase !== 'results') return;
              var span = document.createElement('span');
              span.className = 'labs-reward-star';
              span.textContent = '⭐';
              avgStarsEl.appendChild(span);
              if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playBell === 'function') {
                TootLabs.AudioFx.playBell(starIndex);
              }
            }, startDelay + starIndex * stepMs)
          );
        })(sIdx);
      }
      if (avgReward.stars >= 4) {
        var finaleDelay = startDelay + Math.max(0, avgReward.stars - 1) * stepMs + 260;
        state.qfTimers.push(
          setTimeout(function () {
            if (state.view !== 'guess' || state.guessSubMode !== 'quickfire' || state.qfPhase !== 'results') return;
            if (TootLabs.AudioFx) {
              if (typeof TootLabs.AudioFx.playLegendaryFinale === 'function') TootLabs.AudioFx.playLegendaryFinale();
              if (typeof TootLabs.AudioFx.launchConfetti === 'function') {
                state.qfConfettiHandle = TootLabs.AudioFx.launchConfetti($('result-confetti-canvas'));
              }
            }
            var starEls = avgStarsEl.querySelectorAll('.labs-reward-star');
            for (var k = 0; k < starEls.length; k++) starEls[k].classList.add('legendary-glow');
          }, finaleDelay)
        );
      }
    }
  }

  function renderQuickFirePane(opts) {
    var setupCard = $('qf-setup-card');
    var liveCard = $('qf-live-card');
    var resCard = $('qf-results-card');
    var phase = state.qfPhase || 'setup';
    if (setupCard) setupCard.classList.toggle('hidden', phase !== 'setup');
    if (liveCard) liveCard.classList.toggle('hidden', phase !== 'live');
    if (resCard) resCard.classList.toggle('hidden', phase !== 'results');
    if (phase === 'setup') renderQuickFireSetup();
    else if (phase === 'results') renderQuickFireResults(opts);
  }

  function abortQuickFireRound(silent) {
    var wasLive = state.qfActive || state.qfPhase === 'live' || state.qfScoringActive;
    state.qfGen++;
    state.qfActive = false;
    clearQuickFireTimers();
    if (state.qfScoringActive) {
      state.qfScoringActive = false;
      clearAnalysisSequence();
    }
    if (wasLive && root.TootApp && root.TootApp.Audio) {
      if (typeof root.TootApp.Audio.stopAll === 'function') root.TootApp.Audio.stopAll();
    }
    var stopper = state.qfStopCurrentRec;
    state.qfStopCurrentRec = null;
    if (typeof stopper === 'function') {
      try { stopper(); } catch (e) {}
    } else if (wasLive && root.TootApp && root.TootApp.Audio && root.TootApp.Audio.isRecording && root.TootApp.Audio.isRecording()) {
      try { root.TootApp.Audio.stopRecording(); } catch (e) {}
    }
    var doneBtn = $('btn-qf-done-early');
    if (doneBtn) doneBtn.classList.add('hidden');
    if (wasLive) state.qfPhase = 'setup';
    if (!silent && state.view === 'guess' && state.guessSubMode === 'quickfire') {
      renderQuickFirePane();
    }
  }

  function openQuickFireMode(count, returnDest) {
    closeSettingsMenu();
    state.subModeReturnTo = returnDest === 'guess' ? 'guess' : returnDest === 'games' ? 'games' : 'home';
    if (typeof count === 'number' || typeof count === 'string') {
      setQuickFireCount(count);
    }
    if (!state.qfActive) state.qfPhase = 'setup';
    showView('guess');
    setGuessSubMode('quickfire');
  }

  /* ==================== SEQUENTIAL RECALL (MEMORY SEQUENCE SOLO & MULTIPLAYER) ==================== */
  function clearSequenceTimers() {
    for (var i = 0; i < (state.seqTimers || []).length; i++) {
      clearTimeout(state.seqTimers[i]);
    }
    state.seqTimers = [];
  }

  function setSequenceCount(n) {
    var clamped = Math.max(2, Math.min(6, parseInt(n, 10) || 3));
    state.seqCount = clamped;
    var inp = $('seq-count-input');
    if (inp) inp.value = String(clamped);
    var pills = $('seq-count-pills');
    if (pills) {
      pills.querySelectorAll('[data-seq-count]').forEach(function (b) {
        b.classList.toggle('active', parseInt(b.getAttribute('data-seq-count'), 10) === clamped);
      });
    }
    renderSequenceSetup();
  }

  function setSequencePlayerCount(n) {
    var clamped = Math.max(1, Math.min(4, parseInt(n, 10) || 1));
    state.seqPlayerCount = clamped;
    var pills = $('seq-player-pills');
    if (pills) {
      pills.querySelectorAll('[data-seq-players]').forEach(function (b) {
        b.classList.toggle('active', parseInt(b.getAttribute('data-seq-players'), 10) === clamped);
      });
    }
    renderSequenceSetup();
  }

  function syncSequencePlayerNamesFromDom() {
    var box = $('seq-players-inputs');
    if (!box) return;
    box.querySelectorAll('input[data-seq-pidx]').forEach(function (inp) {
      var idx = parseInt(inp.getAttribute('data-seq-pidx'), 10);
      if (!isNaN(idx)) {
        state.seqPlayerNames[idx] = inp.value.trim() || ('Player ' + (idx + 1));
      }
    });
  }

  function getActiveSeqPlayers() {
    syncSequencePlayerNamesFromDom();
    var count = Math.max(1, Math.min(4, state.seqPlayerCount || 1));
    if (count === 1) return ['Solo Participant'];
    var list = [];
    for (var i = 0; i < count; i++) {
      list.push((state.seqPlayerNames && state.seqPlayerNames[i]) || ('Player ' + (i + 1)));
    }
    return list;
  }

  function renderSequenceSetup() {
    var pool = getQuickFirePool(state.seqSource || 'all');
    var actual = Math.min(state.seqCount || 3, pool.length);
    var noteEl = $('seq-pool-note');
    var startBtn = $('btn-seq-start');
    var srcSel = $('seq-source-select');
    var inp = $('seq-count-input');
    var pBox = $('seq-players-inputs');

    if (srcSel) srcSel.value = state.seqSource || 'all';
    if (inp) inp.value = String(state.seqCount || 3);
    if (noteEl) {
      noteEl.textContent =
        pool.length < 2
          ? 'Need at least 2 farts in this pool — record another or choose All Vault Farts.'
          : pool.length + ' farts in pool · Sequence of ' + actual + ' specimen' + (actual === 1 ? '' : 's');
    }
    if (startBtn) {
      startBtn.disabled = pool.length < 2;
      startBtn.textContent =
        pool.length >= 2
          ? '🧠 Start ' + actual + '-Fart Memory Sequence' + (state.seqPlayerCount > 1 ? ' (' + state.seqPlayerCount + ' Players)' : '')
          : '🧠 Need 2+ Specimens';
    }
    if (pBox) {
      var pc = state.seqPlayerCount || 1;
      pBox.classList.toggle('hidden', pc < 2);
      if (pc >= 2) {
        var existingCount = pBox.querySelectorAll('input[data-seq-pidx]').length;
        if (existingCount !== pc) {
          var html = [];
          for (var i = 0; i < pc; i++) {
            var val = (state.seqPlayerNames && state.seqPlayerNames[i]) || ('Player ' + (i + 1));
            html.push('<input type="text" class="labs-text-input" maxlength="20" data-seq-pidx="' + i + '" value="' + esc(val) + '" placeholder="Player ' + (i + 1) + '" />');
          }
          pBox.innerHTML = html.join('');
        }
      } else {
        pBox.innerHTML = '';
      }
    }
  }

  function renderSequenceStepPills(activeIdx, phaseMode, completedCount) {
    var el = $('seq-step-pills');
    if (!el) return;
    var total = (state.seqDeck && state.seqDeck.length) || state.seqCount || 3;
    var html = [];
    for (var i = 0; i < total; i++) {
      var cls = 'labs-seq-pill';
      if (i < (completedCount || 0)) cls += ' is-done';
      else if (i === activeIdx) cls += phaseMode === 'rec' ? ' is-rec' : ' is-active';
      html.push('<span class="' + cls + '">#' + (i + 1) + '</span>');
    }
    el.innerHTML = html.join('');
  }

  function renderSequenceResults() {
    var pResults = state.seqPlayerResults || [];
    if (pResults.length === 0) return;
    var activeP = Math.max(0, Math.min(pResults.length - 1, state.seqActiveResultPlayer || 0));
    state.seqActiveResultPlayer = activeP;
    var curPlayer = pResults[activeP];
    var rows = curPlayer.items || [];

    var avgEl = $('seq-avg-score');
    var rankEl = $('seq-avg-rank');
    var noteEl = $('seq-memory-note');
    var tabsEl = $('seq-player-tabs');
    var listEl = $('seq-results-list');

    var avg = curPlayer.avgScore || 0;
    var rank = TootLabs.Store.getRankForScore(avg);
    if (avgEl) avgEl.textContent = avg.toFixed(1) + '%';
    if (rankEl) rankEl.textContent = rank.title || rank.name || 'Rook';

    if (noteEl) {
      if (rows.length >= 3) {
        var firstSc = rows[0].exactScore || 0;
        var midIdx = Math.floor(rows.length / 2);
        var midSc = rows[midIdx].exactScore || 0;
        var lastSc = rows[rows.length - 1].exactScore || 0;
        if (firstSc >= midSc + 6 && lastSc >= midSc + 6) {
          noteEl.textContent = 'Serial-position curve: Primacy (#' + 1 + ': ' + Math.round(firstSc) + '%) & Recency (#' + rows.length + ': ' + Math.round(lastSc) + '%) held stronger than middle chunk #' + (midIdx + 1) + '.';
        } else if (lastSc < firstSc - 8) {
          noteEl.textContent = 'Echoic decay observed: Item #1 (' + Math.round(firstSc) + '%) held via rehearsal while trailing order #'+ rows.length + ' (' + Math.round(lastSc) + '%) faded.';
        } else {
          noteEl.textContent = 'Working memory held ' + rows.length + ' acoustic chunks evenly (' + avg.toFixed(1) + '% mean fidelity). Tap Compare on any row for 3D analysis.';
        }
      } else {
        noteEl.textContent = 'Echoic memory trial across ' + rows.length + ' sequential specimens (' + avg.toFixed(1) + '% mean fidelity).';
      }
    }

    if (tabsEl) {
      tabsEl.classList.toggle('hidden', pResults.length <= 1);
      if (pResults.length > 1) {
        var rankedOrder = pResults
          .map(function (p, i) { return { idx: i, name: p.playerName, avg: p.avgScore || 0 }; })
          .sort(function (a, b) { return b.avg - a.avg; });
        var rankMap = {};
        rankedOrder.forEach(function (entry, rIdx) {
          rankMap[entry.idx] = rIdx === 0 ? '🥇' : rIdx === 1 ? '🥈' : rIdx === 2 ? '🥉' : '#' + (rIdx + 1);
        });
        tabsEl.innerHTML = pResults
          .map(function (pr, idx) {
            return (
              '<button type="button" class="labs-seq-ptab' + (idx === activeP ? ' active' : '') + '" data-seq-ptab="' + idx + '">' +
              rankMap[idx] + ' ' + esc(pr.playerName) + ' · ' + (pr.avgScore || 0).toFixed(1) + '%' +
              '</button>'
            );
          })
          .join('');
        tabsEl.querySelectorAll('[data-seq-ptab]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            state.seqActiveResultPlayer = parseInt(this.getAttribute('data-seq-ptab'), 10) || 0;
            renderSequenceResults();
          });
        });
      } else {
        tabsEl.innerHTML = '';
      }
    }

    if (listEl) {
      listEl.innerHTML = rows
        .map(function (r, idx) {
          var tName = getSampleName(r.target);
          var hasAttempt = Boolean(r.guessSound && r.guessSound.samples && r.guessSound.samples.length > 0);
          var scTxt = r.missed ? 'Missed' : (r.exactScore || 0).toFixed(1) + '%';
          var attBtns = hasAttempt
            ? '<button type="button" class="labs-btn-ghost labs-btn-xs" data-seq-play-g="' + idx + '" title="Play attempt">🎤</button>' +
              '<button type="button" class="labs-btn-ghost labs-btn-xs" data-seq-play-both="' + idx + '" title="Play both">🔊</button>' +
              '<button type="button" class="labs-btn labs-btn-blue labs-btn-xs" data-seq-analyze="' + idx + '" title="Full Comparative Analysis">🔬 Analyze</button>'
            : '';
          return (
            '<div class="labs-seq-compact-row">' +
            '  <div class="labs-seq-row-left">' +
            '    <span class="labs-seq-row-idx">#' + (idx + 1) + '</span>' +
            '    <span class="labs-seq-row-name">' + esc(tName) + '</span>' +
            '  </div>' +
            '  <span class="labs-seq-row-score">' + scTxt + '</span>' +
            '  <div class="labs-seq-row-btns">' +
            '    <button type="button" class="labs-btn-ghost labs-btn-xs" data-seq-play-t="' + idx + '" title="Play target">▶</button>' +
            attBtns +
            '  </div>' +
            '</div>'
          );
        })
        .join('');

      listEl.querySelectorAll('[data-seq-play-t]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = rows[parseInt(this.getAttribute('data-seq-play-t'), 10)];
          if (row && row.target && row.target.samples) {
            TootApp.Audio.playSound(row.target.samples, row.target.sampleRate || 44100, { channel: 'seq_replay' });
          }
        });
      });
      listEl.querySelectorAll('[data-seq-play-g]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = rows[parseInt(this.getAttribute('data-seq-play-g'), 10)];
          if (row && row.guessSound && row.guessSound.samples) {
            TootApp.Audio.playSound(row.guessSound.samples, row.guessSound.sampleRate || 44100, { channel: 'seq_replay' });
          }
        });
      });
      listEl.querySelectorAll('[data-seq-play-both]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = rows[parseInt(this.getAttribute('data-seq-play-both'), 10)];
          if (row && row.target && row.target.samples && row.guessSound && row.guessSound.samples && TootApp.Audio.playSimultaneous) {
            TootApp.Audio.playSimultaneous([
              { samples: row.target.samples, sampleRate: row.target.sampleRate || 44100, channel: 'seq_a' },
              { samples: row.guessSound.samples, sampleRate: row.guessSound.sampleRate || 44100, channel: 'seq_b' }
            ]);
          }
        });
      });
      listEl.querySelectorAll('[data-seq-analyze]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = rows[parseInt(this.getAttribute('data-seq-analyze'), 10)];
          if (row && row.target && row.attempt && row.attempt.id) {
            openFartnalysis('comparison', row.target.id, row.attempt.id);
          }
        });
      });
    }
  }

  function renderSequencePane() {
    var setupCard = $('seq-setup-card');
    var liveCard = $('seq-live-card');
    var resCard = $('seq-results-card');
    var phase = state.seqPhase || 'setup';
    if (setupCard) setupCard.classList.toggle('hidden', phase !== 'setup');
    if (liveCard) liveCard.classList.toggle('hidden', phase !== 'live');
    if (resCard) resCard.classList.toggle('hidden', phase !== 'results');
    if (phase === 'setup') renderSequenceSetup();
    else if (phase === 'results') renderSequenceResults();
  }

  function abortSequenceRound(silent) {
    var wasLive = state.seqActive || state.seqPhase === 'live';
    state.seqGen++;
    state.seqActive = false;
    clearSequenceTimers();
    if (wasLive && root.TootApp && root.TootApp.Audio) {
      if (typeof root.TootApp.Audio.stopAll === 'function') root.TootApp.Audio.stopAll();
    }
    var stopper = state.seqStopCurrentRec;
    state.seqStopCurrentRec = null;
    if (typeof stopper === 'function') {
      try { stopper(); } catch (e) {}
    } else if (wasLive && root.TootApp && root.TootApp.Audio && root.TootApp.Audio.isRecording && root.TootApp.Audio.isRecording()) {
      try { root.TootApp.Audio.stopRecording(); } catch (e) {}
    }
    ['btn-seq-done-early', 'btn-seq-replay', 'btn-seq-begin-turn'].forEach(function (bid) {
      if ($(bid)) $(bid).classList.add('hidden');
    });
    if (wasLive) state.seqPhase = 'setup';
    if (!silent && state.view === 'guess' && state.guessSubMode === 'sequence') {
      renderSequencePane();
    }
  }

  function openSequenceMode(returnDest) {
    closeSettingsMenu();
    state.subModeReturnTo = returnDest === 'guess' ? 'guess' : returnDest === 'games' ? 'games' : 'home';
    if (!state.seqActive && state.seqPhase !== 'results') state.seqPhase = 'setup';
    showView('guess');
    setGuessSubMode('sequence');
  }

  function startSequenceRound(reuseSameDeck) {
    if (state.revealInProgress) {
      showToast('Finish the current reveal first.', true);
      return Promise.resolve([]);
    }
    if (TootApp.Audio && TootApp.Audio.isRecordingOrStarting && TootApp.Audio.isRecordingOrStarting()) {
      showToast('Stop the active recording first.', true);
      return Promise.resolve([]);
    }

    var players = getActiveSeqPlayers();
    var deck = reuseSameDeck && state.seqDeck && state.seqDeck.length >= 2
      ? state.seqDeck.slice()
      : pickQuickFireDeck(state.seqCount || 3, state.seqSource || 'all');

    if (deck.length < 2) {
      showToast('Need at least 2 farts in this pool!', true);
      return Promise.resolve([]);
    }

    var gen = ++state.seqGen;
    clearSequenceTimers();
    state.seqActive = true;
    state.seqDeck = deck;
    state.seqPlayerIndex = 0;
    state.seqPlayerResults = [];
    state.seqPhase = 'live';
    state.seqStopCurrentRec = null;
    if (TootApp.Audio && typeof TootApp.Audio.stopAll === 'function') {
      TootApp.Audio.stopAll();
    }
    renderSequencePane();
    renderSequenceStepPills(0, 'listen', 0);

    var counterEl = $('seq-round-counter');
    var bannerEl = $('seq-stage-banner');
    var phaseEl = $('seq-phase-word');
    var badgeEl = $('seq-stage-badge');
    var titleEl = $('seq-stage-title');
    var subEl = $('seq-stage-sub');
    var timerBar = $('seq-timer-bar');
    var waveCanvas = $('seq-wave-canvas');
    var replayBtn = $('btn-seq-replay');
    var beginBtn = $('btn-seq-begin-turn');
    var doneBtn = $('btn-seq-done-early');

    [replayBtn, beginBtn, doneBtn].forEach(function (b) { if (b) b.classList.add('hidden'); });
    if (counterEl) counterEl.textContent = 'PREPARING · ' + deck.length + ' SPECIMENS';
    if (bannerEl) {
      bannerEl.classList.remove('is-recording', 'is-detected', 'is-scoring');
      bannerEl.classList.add('is-listening');
    }
    if (phaseEl) phaseEl.textContent = '⚙️ CALIBRATING';
    if (badgeEl) badgeEl.textContent = 'WARMING MIC & DECODING SEQUENCE';
    if (titleEl) titleEl.textContent = 'Loading ' + deck.length + ' Acoustic Events…';
    if (subEl) subEl.textContent = 'Listen carefully to the order, pitch, and rhythm.';
    if (timerBar && timerBar.style) timerBar.style.width = '0%';

    function waitSeq(ms) {
      return new Promise(function (resolve) {
        var t = setTimeout(resolve, ms);
        state.seqTimers.push(t);
      });
    }

    var warmP = TootApp.Audio && typeof TootApp.Audio.warmMic === 'function'
      ? TootApp.Audio.warmMic()
      : Promise.resolve(true);

    return Promise.all([warmP].concat(deck.map(function (s) { return ensureTargetReady(s); })))
      .then(function (resolved) {
        if (gen !== state.seqGen || !state.seqActive) return [];
        var readyDeck = resolved.slice(1).filter(function (s) { return s && s.samples && s.samples.length > 0; });
        if (readyDeck.length < 2) {
          abortSequenceRound(true);
          renderSequencePane();
          showToast('Could not decode enough specimens for Sequential Recall.', true);
          return [];
        }
        state.seqDeck = readyDeck;

        function playOne(idx) {
          if (gen !== state.seqGen || !state.seqActive) return Promise.resolve();
          var target = readyDeck[idx];
          renderSequenceStepPills(idx, 'listen', idx);
          if (counterEl) counterEl.textContent = 'MEMORIZE · FART ' + (idx + 1) + ' OF ' + readyDeck.length;
          if (bannerEl) {
            bannerEl.classList.remove('is-recording', 'is-detected', 'is-scoring');
            bannerEl.classList.add('is-listening');
          }
          if (phaseEl) phaseEl.textContent = '🔊 LISTEN #' + (idx + 1);
          if (badgeEl) badgeEl.textContent = 'AUDITORY ENCODING · SPECIMEN ' + (idx + 1) + ' OF ' + readyDeck.length;
          if (titleEl) titleEl.textContent = 'Sequence Event #' + (idx + 1);
          if (subEl) subEl.textContent = 'Lock pitch & rhythm in working memory…';

          return new Promise(function (resolve) {
            var settled = false;
            var fbTimer = null;
            function finish() {
              if (settled) return;
              settled = true;
              if (fbTimer) clearTimeout(fbTimer);
              resolve();
            }
            var sr = target.sampleRate || 44100;
            var durMs = Math.round((target.samples.length / sr) * 1000);
            fbTimer = setTimeout(finish, Math.min(9000, Math.max(800, durMs + 500)));
            state.seqTimers.push(fbTimer);

            if (waveCanvas) {
              drawStaticWaveform(waveCanvas, target.samples, { fallbackW: 420, fallbackH: 56, progress: 0 });
            }
            try {
              var pRes = TootApp.Audio.playSound(target.samples, sr, {
                channel: 'seq_play',
                onProgress: function (pr) {
                  if (gen !== state.seqGen || !state.seqActive) return;
                  if (timerBar && timerBar.style) timerBar.style.width = Math.round(pr * 100) + '%';
                  if (waveCanvas) drawStaticWaveform(waveCanvas, target.samples, { fallbackW: 420, fallbackH: 56, progress: pr });
                },
                onEnded: finish
              });
              if (pRes && typeof pRes.catch === 'function') {
                pRes.catch(function () {
                  state.seqTimers.push(setTimeout(finish, Math.min(2400, Math.max(600, durMs))));
                });
              }
            } catch (e) {
              state.seqTimers.push(setTimeout(finish, 600));
            }
          });
        }

        function playSequenceDeck(playerLabel) {
          var ch = Promise.resolve();
          readyDeck.forEach(function (_, idx) {
            ch = ch.then(function () {
              return playOne(idx).then(function () {
                return idx < readyDeck.length - 1 ? waitSeq(380) : waitSeq(180);
              });
            });
          });
          return ch.then(function () {
            if (counterEl && playerLabel) counterEl.textContent = playerLabel + ' · SEQUENCE COMPLETE';
          });
        }

        function captureRecallItem(target, idx, playerName) {
          var sr = target.sampleRate || 44100;
          var targetDur = target.samples.length / sr;
          var recWindowSec = Math.max(3.2, Math.min(6.0, targetDur + 2.4));
          var tFeat = target.features || (TootApp.DSP && TootApp.DSP.extractFeatures(target.samples, sr));
          var expectedBursts = Math.max(1, Math.min(4, (tFeat && tFeat.burstCount) || 1));
          var detector = createQuickFireAutoDetector({
            calibrateSec: 0.06,
            minSoundMs: 65,
            trailingSilenceMs: 110,
            interBurstSilenceMs: expectedBursts >= 2 ? 380 : 110,
            expectedBursts: expectedBursts,
            minElapsedSec: 0.16,
            releasePeakRatio: 0.30
          });
          return new Promise(function (resolve) {
            var settled = false;
            var stopRequested = false;
            var uiDetected = false;
            var lastPerf = performance.now();

            function done(res) {
              if (settled) return;
              settled = true;
              state.seqStopCurrentRec = null;
              resolve(res);
            }

            function triggerStop() {
              if (stopRequested || settled) return;
              stopRequested = true;
              TootApp.Audio.stopRecording()
                .then(done)
                .catch(function () { done({ ok: false, reason: 'stop_failed' }); });
            }

            state.seqStopCurrentRec = triggerStop;

            TootApp.Audio.startRecording({
              maxDurationSec: recWindowSec,
              onLevel: function (timeData, rms, elapsed) {
                if (gen !== state.seqGen || !state.seqActive || settled || stopRequested) return;
                var now = performance.now();
                var dt = Math.max(0, now - lastPerf);
                lastPerf = now;
                if (waveCanvas) drawLiveWave(waveCanvas, timeData, uiDetected ? '#4ade80' : '#ef4444');
                if (timerBar && timerBar.style) {
                  timerBar.style.width = Math.min(100, Math.round((elapsed / recWindowSec) * 100)) + '%';
                }
                var det = detector.feed(rms, elapsed, dt);
                if (det.detectedNow && !uiDetected) {
                  uiDetected = true;
                  if (bannerEl) bannerEl.classList.add('is-detected');
                  if (badgeEl) badgeEl.textContent = '🟢 CAPTURING ' + playerName.toUpperCase() + ' #' + (idx + 1);
                }
                if (det.shouldStop) triggerStop();
              },
              onAutoStop: done
            }).catch(function (err) {
              done({ ok: false, reason: 'mic_error', error: err ? err.message : 'Microphone unavailable.' });
            });
          });
        }

        function awaitTurnStart(playerName, playerIdx) {
          return new Promise(function (resolve) {
            if (gen !== state.seqGen || !state.seqActive) {
              resolve();
              return;
            }
            if (counterEl) counterEl.textContent = 'HANDOFF · PLAYER ' + (playerIdx + 1) + ' OF ' + players.length;
            renderSequenceStepPills(0, 'listen', 0);
            if (bannerEl) {
              bannerEl.classList.remove('is-recording', 'is-detected');
              bannerEl.classList.add('is-listening');
            }
            if (phaseEl) phaseEl.textContent = '🤝 PASS TO ' + playerName.toUpperCase();
            if (badgeEl) badgeEl.textContent = 'MULTIPLAYER MEMORY HANDOFF';
            if (titleEl) titleEl.textContent = playerName + ' Ready?';
            if (subEl) subEl.textContent = 'Replay the target sequence if needed, or start your ' + readyDeck.length + '-fart recall.';
            if (timerBar && timerBar.style) timerBar.style.width = '0%';
            if (doneBtn) doneBtn.classList.add('hidden');
            if (replayBtn) {
              replayBtn.classList.remove('hidden');
              replayBtn.disabled = false;
              replayBtn.onclick = function () {
                if (replayBtn) replayBtn.disabled = true;
                if (beginBtn) beginBtn.disabled = true;
                playSequenceDeck(playerName).then(function () {
                  if (replayBtn) replayBtn.disabled = false;
                  if (beginBtn) beginBtn.disabled = false;
                  if (phaseEl) phaseEl.textContent = '🤝 ' + playerName.toUpperCase() + ' READY';
                });
              };
            }
            if (beginBtn) {
              beginBtn.classList.remove('hidden');
              beginBtn.disabled = false;
              beginBtn.textContent = '🎤 Start ' + playerName + ' Recall';
              beginBtn.onclick = function () {
                if (replayBtn) replayBtn.classList.add('hidden');
                if (beginBtn) beginBtn.classList.add('hidden');
                resolve();
              };
            } else {
              resolve();
            }
          });
        }

        function runPlayerTurn(playerIdx) {
          if (gen !== state.seqGen || !state.seqActive) return Promise.resolve();
          var playerName = players[playerIdx];
          state.seqPlayerIndex = playerIdx;

          var prepPromise = playerIdx === 0
            ? playSequenceDeck(playerName)
            : awaitTurnStart(playerName, playerIdx);

          return prepPromise.then(function () {
            if (gen !== state.seqGen || !state.seqActive) return null;
            var captures = [];

            function stepRec(i) {
              if (gen !== state.seqGen || !state.seqActive) return Promise.resolve();
              if (i >= readyDeck.length) {
                if (doneBtn) doneBtn.classList.add('hidden');
                if (phaseEl) phaseEl.textContent = '🧪 SCORING';
                if (badgeEl) badgeEl.textContent = 'SAVING ' + playerName.toUpperCase() + ' COMPARISONS…';
                if (titleEl) titleEl.textContent = 'Evaluating ' + readyDeck.length + ' Mimics';

                var items = [];
                var saveChain = Promise.resolve();
                captures.forEach(function (cap) {
                  saveChain = saveChain.then(function () {
                    var target = cap.target;
                    var res = cap.capRes;
                    if (!target.features || !target.features.spectrogram) {
                      target.features = TootApp.DSP.extractFeatures(target.samples, target.sampleRate || 44100);
                    }
                    if (!res || !res.ok || !res.clippedSamples || res.clippedSamples.length === 0) {
                      items.push({
                        index: cap.index,
                        target: target,
                        guessSound: null,
                        attempt: null,
                        exactScore: 0,
                        missed: true
                      });
                      return;
                    }
                    var gSr = res.sampleRate || 44100;
                    var gSamples = res.clippedSamples;
                    var gFeat = TootApp.DSP.extractFeatures(gSamples, gSr);
                    var guessObj = {
                      id: 'seq_g_' + playerIdx + '_' + cap.index + '_' + Date.now(),
                      name: players.length > 1 ? (playerName + ' #' + (cap.index + 1)) : ('Seq #' + (cap.index + 1)),
                      sampleRate: gSr,
                      samples: gSamples,
                      features: gFeat
                    };
                    var cmpRes = TootApp.DSP.compareSounds(target.features, gFeat);
                    return TootLabs.Store.recordChallengeResult(target, guessObj, cmpRes, { guesserName: guessObj.name }).then(function (out) {
                      upsertAttemptsIntoCache([out.attempt]);
                      items.push({
                        index: cap.index,
                        target: target,
                        guessSound: guessObj,
                        attempt: out.attempt,
                        exactScore: out.exactScore,
                        missed: false
                      });
                    });
                  });
                });

                return saveChain.then(function () {
                  if (gen !== state.seqGen) return;
                  var totalSc = items.reduce(function (acc, it) { return acc + (it.exactScore || 0); }, 0);
                  var avgSc = items.length > 0 ? totalSc / items.length : 0;
                  state.seqPlayerResults.push({
                    playerName: playerName,
                    avgScore: avgSc,
                    items: items
                  });
                  if (playerIdx + 1 < players.length) {
                    return runPlayerTurn(playerIdx + 1);
                  }
                  state.seqActive = false;
                  state.seqPhase = 'results';
                  state.seqActiveResultPlayer = 0;
                  renderHomeView();
                  renderSequencePane();
                  return state.seqPlayerResults;
                });
              }

              var target = readyDeck[i];
              renderSequenceStepPills(i, 'rec', i);
              if (counterEl) counterEl.textContent = playerName + ' · RECALL ' + (i + 1) + ' OF ' + readyDeck.length;
              if (bannerEl) {
                bannerEl.classList.remove('is-listening', 'is-detected', 'is-scoring');
                bannerEl.classList.add('is-recording');
              }
              if (phaseEl) phaseEl.textContent = '🎤 RECALL #' + (i + 1);
              if (badgeEl) badgeEl.textContent = playerName.toUpperCase() + ' · REPRODUCE FROM MEMORY';
              if (titleEl) titleEl.textContent = 'Reproduce Fart #' + (i + 1) + ' of ' + readyDeck.length;
              if (subEl) subEl.textContent = 'Mimic sound #' + (i + 1) + ' — auto-advances on silence or tap Next Fart';
              if (timerBar && timerBar.style) timerBar.style.width = '0%';
              if (doneBtn) doneBtn.classList.remove('hidden');

              return captureRecallItem(target, i, playerName).then(function (capRes) {
                if (gen !== state.seqGen || !state.seqActive) return;
                if (doneBtn) doneBtn.classList.add('hidden');
                captures.push({ index: i, target: target, capRes: capRes });
                renderSequenceStepPills(i + 1, 'rec', i + 1);
                return waitSeq(80).then(function () {
                  return stepRec(i + 1);
                });
              });
            }

            return stepRec(0);
          });
        }

        return runPlayerTurn(0);
      })
      .catch(function (err) {
        abortSequenceRound(true);
        renderSequencePane();
        showToast((err && err.message) || 'Could not start Sequential Recall.', true);
        return [];
      });
  }

  /* ==================== REAL OR FAKE? AUTHENTICITY SHOWDOWN ==================== */
  function buildRealFakePools() {
    var realPool = (state.samples || []).filter(Boolean);
    var fakePool = (state.allAttemptsCache || []).filter(function (a) {
      return a && a.samples && a.samples.length > 0;
    });
    return { realPool: realPool, fakePool: fakePool };
  }

  function shuffleArr(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy;
  }

  var RF_STATS_KEY = 'toot_labs_realfake_stats_v1';

  function loadRealFakeStats() {
    var def = { played: 0, youCorrect: 0, aiCorrect: 0, streak: 0, bestStreak: 0 };
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(RF_STATS_KEY);
        if (raw) {
          var p = JSON.parse(raw);
          if (p && typeof p === 'object') {
            return {
              played: Number(p.played) || 0,
              youCorrect: Number(p.youCorrect) || 0,
              aiCorrect: Number(p.aiCorrect) || 0,
              streak: Number(p.streak) || 0,
              bestStreak: Number(p.bestStreak) || 0
            };
          }
        }
      }
    } catch (e) {}
    return def;
  }

  function saveRealFakeStats(st) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(RF_STATS_KEY, JSON.stringify(st));
      }
    } catch (e) {}
  }

  function formatLifetimeBar(st) {
    var pct = st.played > 0 ? Math.round((st.youCorrect / st.played) * 100) : 0;
    return (
      'All-Time: ' +
      st.youCorrect +
      '/' +
      st.played +
      ' (' +
      pct +
      '%) · Streak: ' +
      st.streak +
      ' · Best: ' +
      st.bestStreak +
      ' · A.S.S. AI: ' +
      st.aiCorrect +
      '/' +
      st.played
    );
  }

  function renderRealFakeStage() {
    var pools = buildRealFakePools();
    var lockedCard = $('rf-locked-card');
    var playCard = $('rf-play-card');
    var resCard = $('rf-results-card');
    var lockedCopy = $('rf-locked-copy');
    var rfStats = loadRealFakeStats();

    if (pools.fakePool.length < 2 || pools.realPool.length < 2) {
      if (lockedCard) lockedCard.classList.remove('hidden');
      if (playCard) playCard.classList.add('hidden');
      if (resCard) resCard.classList.add('hidden');
      if (lockedCopy) {
        lockedCopy.textContent =
          'You currently have ' +
          pools.fakePool.length +
          ' recorded guess' +
          (pools.fakePool.length === 1 ? '' : 'es') +
          '. Record at least 2 guesses in Guess The Fart or Sequential Recall so we can test genuine archive farts against real human mimics!';
      }
      return;
    }

    if (lockedCard) lockedCard.classList.add('hidden');

    if (state.rfPhase === 'results') {
      if (playCard) playCard.classList.add('hidden');
      if (resCard) resCard.classList.remove('hidden');
      var rows = state.rfResults || [];
      var youCorrect = rows.filter(function (r) { return r.youCorrect; }).length;
      var aiCorrect = rows.filter(function (r) { return r.aiCorrect; }).length;
      var total = Math.max(1, rows.length);
      var youPct = Math.round((youCorrect / total) * 100);
      var aiPct = Math.round((aiCorrect / total) * 100);

      if ($('rf-final-verdict')) {
        $('rf-final-verdict').textContent =
          youCorrect > aiCorrect
            ? 'You Beat A.S.S. Authenticity AI!'
            : youCorrect < aiCorrect
            ? 'A.S.S. Authenticity AI Edged You Out!'
            : 'Draw: Ears Tied With Spectral DSP!';
      }
      if ($('rf-final-lifetime')) $('rf-final-lifetime').textContent = formatLifetimeBar(rfStats);
      if ($('rf-final-you')) $('rf-final-you').textContent = youPct + '%';
      if ($('rf-final-you-sub')) $('rf-final-you-sub').textContent = youCorrect + ' / ' + total + ' correct';
      if ($('rf-final-ai')) $('rf-final-ai').textContent = aiPct + '%';
      if ($('rf-final-ai-sub')) $('rf-final-ai-sub').textContent = aiCorrect + ' / ' + total + ' correct';
      if ($('rf-final-note')) {
        $('rf-final-note').textContent =
          'Takeaway: Humans are remarkably good at replicating resonance pitch and airflow flutter, which is why pure acoustic telemetry cannot always separate real from fake. For 100% certainty, the human nose remains the ultimate detector.';
      }

      var listEl = $('rf-results-list');
      if (listEl) {
        listEl.innerHTML = rows
          .map(function (r, idx) {
            var sName = r.item.isReal ? getSampleName(r.item.sound) : (r.item.sound.name || 'Human Mimic');
            var tag = r.item.isReal ? 'REAL' : 'FAKE';
            var youMark = r.youCorrect ? 'You ✓' : 'You ✗';
            var aPct = typeof r.authScore === 'number' ? r.authScore : Math.round((r.auth && r.auth.authenticityScore) || 50);
            var aiMark = 'App ' + aPct + '% ' + (r.aiCorrect ? '✓' : '✗');
            return (
              '<div class="labs-seq-compact-row">' +
              '  <div class="labs-seq-row-left">' +
              '    <span class="labs-seq-row-idx">#' + (idx + 1) + '</span>' +
              '    <span class="labs-chip ' + (r.item.isReal ? 'labs-chip-green' : 'labs-chip-orange') + '">' + tag + '</span>' +
              '    <span class="labs-seq-row-name">' + esc(sName) + '</span>' +
              '  </div>' +
              '  <span class="labs-seq-row-score">' + youMark + ' · ' + aiMark + '</span>' +
              '  <div class="labs-seq-row-btns">' +
              '    <button type="button" class="labs-btn-ghost labs-btn-xs" data-rf-play="' + idx + '">▶</button>' +
              '    <button type="button" class="labs-btn labs-btn-blue labs-btn-xs" data-rf-ana="' + idx + '">🧪</button>' +
              '  </div>' +
              '</div>'
            );
          })
          .join('');
        listEl.querySelectorAll('[data-rf-play]').forEach(function (b) {
          b.addEventListener('click', function () {
            var r = rows[parseInt(this.getAttribute('data-rf-play'), 10)];
            if (r && r.item && r.item.sound && r.item.sound.samples) {
              TootApp.Audio.playSound(r.item.sound.samples, r.item.sound.sampleRate || 44100, { channel: 'rf_play' });
            }
          });
        });
        listEl.querySelectorAll('[data-rf-ana]').forEach(function (b) {
          b.addEventListener('click', function () {
            var r = rows[parseInt(this.getAttribute('data-rf-ana'), 10)];
            if (r && r.item) inspectRealFakeItem(r.item);
          });
        });
      }
      return;
    }

    if (resCard) resCard.classList.add('hidden');
    if (playCard) playCard.classList.remove('hidden');

    var deck = state.rfDeck || [];
    var idx = state.rfIndex || 0;
    var item = deck[idx];
    if (!item) return;

    var doneRows = state.rfResults || [];
    var doneCount = doneRows.length;
    var yHits = doneRows.filter(function (r) { return r.youCorrect; }).length;
    var aHits = doneRows.filter(function (r) { return r.aiCorrect; }).length;
    var youAcc = doneCount ? Math.round((yHits / doneCount) * 100) : 0;
    var aiAcc = doneCount ? Math.round((aHits / doneCount) * 100) : 0;

    if ($('rf-counter')) $('rf-counter').textContent = 'SPECIMEN ' + (idx + 1) + ' OF ' + deck.length;
    if ($('rf-score-you')) $('rf-score-you').textContent = yHits + '/' + doneCount;
    if ($('rf-score-you-pct')) $('rf-score-you-pct').textContent = youAcc + '% accuracy';
    if ($('rf-score-ai')) $('rf-score-ai').textContent = aHits + '/' + doneCount;
    if ($('rf-score-ai-pct')) $('rf-score-ai-pct').textContent = aiAcc + '% accuracy';
    if ($('rf-match-status')) {
      var matchEl = $('rf-match-status');
      matchEl.classList.remove('is-lead', 'is-behind', 'is-tied');
      if (doneCount === 0) {
        matchEl.textContent = 'READY';
      } else if (yHits > aHits) {
        matchEl.textContent = 'YOU +' + (yHits - aHits);
        matchEl.classList.add('is-lead');
      } else if (yHits < aHits) {
        matchEl.textContent = 'APP +' + (aHits - yHits);
        matchEl.classList.add('is-behind');
      } else {
        matchEl.textContent = 'TIED';
        matchEl.classList.add('is-tied');
      }
    }
    if ($('rf-streak-pill')) {
      $('rf-streak-pill').textContent = 'Streak: ' + rfStats.streak + (rfStats.streak >= 2 ? ' 🔥' : '');
    }
    if ($('rf-lifetime-bar')) $('rf-lifetime-bar').textContent = formatLifetimeBar(rfStats);

    var dotsEl = $('rf-progress-dots');
    if (dotsEl) {
      var doneMap = {};
      doneRows.forEach(function (r) { doneMap[r.index] = r; });
      var dotsHtml = '';
      for (var d = 0; d < deck.length; d++) {
        var dr = doneMap[d];
        var dCls = dr ? (dr.youCorrect ? ' is-hit' : ' is-miss') : (d === idx ? ' is-now' : '');
        var dTxt = dr ? (dr.youCorrect ? '✓' : '✗') : String(d + 1);
        dotsHtml += '<span class="labs-rf-dot' + dCls + '">' + dTxt + '</span>';
      }
      dotsEl.innerHTML = dotsHtml;
    }

    var waveCanvas = $('rf-wave-canvas');
    if (waveCanvas && item.sound && item.sound.samples) {
      drawStaticWaveform(waveCanvas, item.sound.samples, { fallbackW: 440, fallbackH: 56 });
    }

    var voteRealBtn = $('btn-rf-vote-real');
    var voteFakeBtn = $('btn-rf-vote-fake');
    var revBox = $('rf-reveal-box');
    if ($('btn-rf-play')) {
      $('btn-rf-play').textContent = state.rfVoted ? '▶ REPLAY SPECIMEN' : '▶ PLAY SPECIMEN';
    }
    if (voteRealBtn) {
      voteRealBtn.disabled = state.rfVoted;
      voteRealBtn.classList.remove('is-picked', 'is-correct', 'is-wrong');
    }
    if (voteFakeBtn) {
      voteFakeBtn.disabled = state.rfVoted;
      voteFakeBtn.classList.remove('is-picked', 'is-correct', 'is-wrong');
    }
    if (revBox) revBox.classList.toggle('hidden', !state.rfVoted);

    if (state.rfVoted && doneRows.length > 0) {
      var curRes = doneRows[doneRows.length - 1];
      var pickedBtn = curRes.youPickedReal ? voteRealBtn : voteFakeBtn;
      if (pickedBtn) {
        pickedBtn.classList.add('is-picked', curRes.youCorrect ? 'is-correct' : 'is-wrong');
      }

      var sTitle = item.isReal ? getSampleName(item.sound) : (item.sound.name || 'Recorded Guess');
      var fObj = item.sound && item.sound.features;
      var durTxt = fObj && typeof fObj.duration === 'number' ? fObj.duration.toFixed(2) + 's' : ((item.sound.samples ? (item.sound.samples.length / (item.sound.sampleRate || 44100)).toFixed(2) + 's' : '—'));
      var hzTxt = fObj && fObj.medianPitchHz > 0 ? Math.round(fObj.medianPitchHz) + ' Hz' : (fObj && fObj.spectralCentroidHz > 0 ? Math.round(fObj.spectralCentroidHz) + ' Hz centroid' : 'Broadband');
      var originType = item.isReal
        ? (item.sound.isBuiltIn ? 'Verified Archive Specimen' : 'Field-Recorded Original Fart')
        : 'Recorded Human Mimic Guess';

      var vBanner = $('rf-verdict-banner');
      if (vBanner) {
        vBanner.classList.toggle('is-real', Boolean(item.isReal));
        vBanner.classList.toggle('is-fake', !item.isReal);
      }
      if ($('rf-verdict-stamp')) {
        $('rf-verdict-stamp').textContent = item.isReal ? '✅ IT WAS A REAL FART!' : '🎭 IT WAS A FAKE!';
      }
      if ($('rf-reveal-details')) {
        $('rf-reveal-details').textContent = '"' + sTitle + '" · ' + originType + ' · ' + durTxt + ' · ' + hzTxt;
      }

      var outcomeBox = $('rf-user-outcome-box');
      if (outcomeBox) {
        outcomeBox.classList.toggle('is-right', Boolean(curRes.youCorrect));
        outcomeBox.classList.toggle('is-wrong', !curRes.youCorrect);
      }
      if ($('rf-verdict-outcome')) {
        $('rf-verdict-outcome').textContent = curRes.youCorrect ? '✓ YOU GUESSED CORRECTLY!' : '✗ YOU GUESSED WRONG!';
      }
      if ($('rf-res-you')) {
        $('rf-res-you').textContent = curRes.youCorrect
          ? 'You voted ' + (curRes.youPickedReal ? 'REAL FART' : 'FAKE MIMIC') + ' — Spot on! (+1 pt)'
          : 'You voted ' + (curRes.youPickedReal ? 'REAL FART' : 'FAKE MIMIC') + ', but it was actually a ' + (item.isReal ? 'REAL FART' : 'FAKE MIMIC') + '.';
      }

      var authPct = typeof curRes.authScore === 'number'
        ? curRes.authScore
        : Math.round((curRes.auth && curRes.auth.authenticityScore) || 50);
      var appSaidReal = authPct > 50;

      if ($('rf-app-guess-headline')) {
        $('rf-app-guess-headline').textContent = '🤖 APP GUESSED: ' + (appSaidReal ? 'REAL' : 'FAKE');
      }
      if ($('rf-app-guess-badge')) {
        $('rf-app-guess-badge').textContent = curRes.aiCorrect ? '✓ APP CORRECT' : '✗ APP FOOLED';
        $('rf-app-guess-badge').className = 'labs-rf-algo-badge ' + (curRes.aiCorrect ? 'is-right' : 'is-wrong');
      }
      if ($('rf-algo-copy')) {
        $('rf-algo-copy').innerHTML = 'Our proprietary A.S.S. algorithm says it is <strong>' + esc(String(authPct)) + '% Authentic</strong>.';
      }
      if ($('rf-algo-rule')) {
        $('rf-algo-rule').textContent = appSaidReal
          ? 'Over 50% Authentic → App guesses REAL'
          : '50% or under Authentic → App guesses FAKE';
      }
      if ($('rf-algo-meter-fill')) {
        var fillEl = $('rf-algo-meter-fill');
        fillEl.style.width = Math.max(4, Math.min(100, authPct)) + '%';
        fillEl.classList.toggle('is-real', appSaidReal);
        fillEl.classList.toggle('is-fake', !appSaidReal);
      }

      if ($('rf-reveal-note')) {
        $('rf-reveal-note').textContent = (curRes.auth && curRes.auth.verdict) || 'Humans mimic spectral envelope surprisingly closely; nose verification stays undefeated.';
      }
      if ($('btn-rf-next')) {
        $('btn-rf-next').textContent = idx + 1 >= deck.length ? 'View Final Showdown →' : 'Next Specimen →';
      }
    }
  }

  function inspectRealFakeItem(item) {
    if (!item || !item.sound) return;
    if (item.isReal) {
      openFartnalysis('original', item.sound.id, null);
    } else {
      var parentId = item.sound.sampleId || (state.samples[0] && state.samples[0].id) || null;
      openFartnalysis('guess', parentId, item.sound.id);
    }
  }

  function submitRealFakeVote(pickedReal) {
    if (state.rfVoted) return;
    var deck = state.rfDeck || [];
    var item = deck[state.rfIndex || 0];
    if (!item || !item.sound) return;
    var fn = root.TootLabs && root.TootLabs.Fartnalysis;
    var auth =
      item.auth ||
      (fn && typeof fn.computeAuthenticityAnalysis === 'function'
        ? fn.computeAuthenticityAnalysis(item.sound)
        : { authenticityScore: 50, verdict: 'Spectral telemetry inconclusive without nose verification.' });
    item.auth = auth;
    var authScore = Math.round(typeof auth.authenticityScore === 'number' ? auth.authenticityScore : 50);
    var aiPickedReal = authScore > 50;
    var youHit = Boolean(pickedReal) === Boolean(item.isReal);
    var aiHit = aiPickedReal === Boolean(item.isReal);
    state.rfVoted = true;
    state.rfResults.push({
      index: state.rfIndex || 0,
      item: item,
      youPickedReal: Boolean(pickedReal),
      youCorrect: youHit,
      aiPickedReal: aiPickedReal,
      aiCorrect: aiHit,
      authScore: authScore,
      auth: auth
    });
    var st = loadRealFakeStats();
    st.played += 1;
    if (youHit) {
      st.youCorrect += 1;
      st.streak += 1;
      if (st.streak > st.bestStreak) st.bestStreak = st.streak;
    } else {
      st.streak = 0;
    }
    if (aiHit) st.aiCorrect += 1;
    saveRealFakeStats(st);
    renderRealFakeStage();
  }

  function startNewRealFakeDeck() {
    var reqGen = ++state.rfOpenGen;
    var pools = buildRealFakePools();
    if (pools.fakePool.length < 2 || pools.realPool.length < 2) {
      renderRealFakeStage();
      return Promise.resolve();
    }
    var half = Math.min(4, pools.fakePool.length, pools.realPool.length);
    var reals = shuffleArr(pools.realPool).slice(0, half);
    var fakes = shuffleArr(pools.fakePool).slice(0, half);
    if ($('rf-play-card') && $('rf-counter')) $('rf-counter').textContent = 'PREPARING SPECIMENS…';

    return Promise.all(reals.map(ensureTargetReady))
      .then(function (loadedReals) {
        if (reqGen !== state.rfOpenGen || state.view !== 'realfake') return;
        var entries = [];
        loadedReals.forEach(function (s) {
          if (s && s.samples && s.samples.length > 0) entries.push({ isReal: true, sound: s });
        });
        fakes.forEach(function (a) {
          if (a && a.samples && a.samples.length > 0) entries.push({ isReal: false, sound: a });
        });
        state.rfDeck = shuffleArr(entries);
        state.rfIndex = 0;
        state.rfResults = [];
        state.rfVoted = false;
        state.rfPhase = 'play';
        renderRealFakeStage();
      })
      .catch(function (err) {
        if (reqGen !== state.rfOpenGen) return;
        showToast((err && err.message) || 'Could not load specimens for Real or Fake.', true);
      });
  }

  function openRealFakeView() {
    closeSettingsMenu();
    showView('realfake');
    if (state.attemptsCacheLoaded) {
      startNewRealFakeDeck();
      return Promise.resolve();
    }
    return refreshAllAttemptsCache(true).then(function () {
      if (state.view === 'realfake') startNewRealFakeDeck();
    });
  }

  function startQuickFireRound(opts) {
    opts = opts || {};
    var fastMode = Boolean(opts.fastMode);
    var mockCaptureFn = typeof opts.mockCaptureFn === 'function' ? opts.mockCaptureFn : null;
    if (state.revealInProgress) {
      showToast('Finish the current showdown reveal first.', true);
      return Promise.resolve([]);
    }
    if (!mockCaptureFn && TootApp.Audio && TootApp.Audio.isRecordingOrStarting && TootApp.Audio.isRecordingOrStarting()) {
      showToast('Stop the active recording first.', true);
      return Promise.resolve([]);
    }

    var deck = pickQuickFireDeck(state.qfCount, state.qfSource);
    if (deck.length === 0) {
      showToast('No farts in the selected pool yet!', true);
      return Promise.resolve([]);
    }

    var gen = ++state.qfGen;
    clearQuickFireTimers();
    state.qfActive = true;
    state.qfDeck = deck;
    state.qfIndex = 0;
    state.qfResults = [];
    state.qfPhase = 'live';
    state.qfStopCurrentRec = null;
    if (TootApp.Audio && typeof TootApp.Audio.stopAll === 'function') {
      TootApp.Audio.stopAll();
    }
    renderQuickFirePane();
    renderQuickFireDots(0, false);

    var counterEl = $('qf-round-counter');
    var stageBanner = $('qf-stage-banner');
    var phaseWordEl = $('qf-phase-word');
    var badgeEl = $('qf-stage-badge');
    var titleEl = $('qf-fart-title');
    var subEl = $('qf-stage-sub');
    var timerBar = $('qf-timer-bar');
    var waveCanvas = $('qf-wave-canvas');
    var doneBtn = $('btn-qf-done-early');

    if (counterEl) counterEl.textContent = 'GET READY · ' + deck.length + ' FARTS';
    if (stageBanner) {
      stageBanner.classList.remove('is-recording', 'is-detected', 'is-scoring');
      stageBanner.classList.add('is-listening');
    }
    if (phaseWordEl) phaseWordEl.textContent = '⚙️ CALIBRATING';
    if (badgeEl) badgeEl.textContent = 'WARMING MIC & SPECIMENS';
    if (titleEl) titleEl.textContent = 'Loading ' + deck.length + ' Specimens…';
    if (subEl) subEl.textContent = 'Hands-free sensors unlocking for automatic LISTEN → GUESS loop';
    if (timerBar && timerBar.style) timerBar.style.width = '0%';
    if (doneBtn) doneBtn.classList.add('hidden');

    var warmP = !mockCaptureFn && TootApp.Audio && typeof TootApp.Audio.warmMic === 'function'
      ? TootApp.Audio.warmMic()
      : Promise.resolve(true);

    return Promise.all([warmP].concat(deck.map(function (s) { return ensureTargetReady(s); })))
      .then(function (resolved) {
        if (gen !== state.qfGen || !state.qfActive) return [];
        var readyDeck = resolved.slice(1).filter(function (s) { return s && s.samples && s.samples.length > 0; });
        if (readyDeck.length === 0) {
          abortQuickFireRound(true);
          renderQuickFirePane();
          showToast('Selected Quick-Fire farts could not be decoded.', true);
          return [];
        }
        state.qfDeck = readyDeck;

        function waitMs(ms) {
          return new Promise(function (res) {
            var t = setTimeout(res, ms);
            state.qfTimers.push(t);
          });
        }

        function playTargetForRound(target) {
          return new Promise(function (resolve) {
            if (gen !== state.qfGen || !state.qfActive) {
              resolve();
              return;
            }
            var settled = false;
            var fbTimer = null;
            function finishPlay() {
              if (settled) return;
              settled = true;
              if (fbTimer) clearTimeout(fbTimer);
              resolve();
            }
            var sr = target.sampleRate || 44100;
            var durMs = Math.round((target.samples.length / sr) * 1000);
            var fbMs = fastMode ? 25 : Math.min(9000, Math.max(850, durMs + 550));
            fbTimer = setTimeout(finishPlay, fbMs);
            state.qfTimers.push(fbTimer);

            if (waveCanvas) {
              drawStaticWaveform(waveCanvas, target.samples, { fallbackW: 420, fallbackH: 56, progress: 0 });
            }
            try {
              var pRes = TootApp.Audio.playSound(target.samples, sr, {
                channel: 'qf_play',
                onProgress: function (pr) {
                  if (gen !== state.qfGen || !state.qfActive) return;
                  if (timerBar && timerBar.style) timerBar.style.width = Math.round(pr * 100) + '%';
                  if (waveCanvas) {
                    drawStaticWaveform(waveCanvas, target.samples, { fallbackW: 420, fallbackH: 56, progress: pr });
                  }
                },
                onEnded: finishPlay
              });
              if (pRes && typeof pRes.catch === 'function') {
                pRes.catch(function () {
                  var eT = setTimeout(finishPlay, fastMode ? 8 : Math.min(2400, Math.max(600, durMs)));
                  state.qfTimers.push(eT);
                });
              }
            } catch (e) {
              var cT = setTimeout(finishPlay, fastMode ? 8 : 600);
              state.qfTimers.push(cT);
            }
          });
        }

        function captureMimicForRound(target, idx) {
          if (mockCaptureFn) {
            return Promise.resolve(mockCaptureFn(target, idx, readyDeck.length));
          }
          var sr = target.sampleRate || 44100;
          var targetDur = target.samples.length / sr;
          var recWindowSec = Math.max(3.2, Math.min(6.0, targetDur + 2.4));
          var tFeat = target.features || (TootApp.DSP && TootApp.DSP.extractFeatures(target.samples, sr));
          var expectedBursts = Math.max(1, Math.min(4, (tFeat && tFeat.burstCount) || 1));
          var detector = createQuickFireAutoDetector({
            calibrateSec: 0.06,
            minSoundMs: 65,
            trailingSilenceMs: 110,
            interBurstSilenceMs: expectedBursts >= 2 ? 380 : 110,
            expectedBursts: expectedBursts,
            minElapsedSec: 0.16,
            releasePeakRatio: 0.30
          });
          return new Promise(function (resolve) {
            var settled = false;
            var stopRequested = false;
            var uiDetected = false;
            var lastPerf = performance.now();

            function done(res) {
              if (settled) return;
              settled = true;
              state.qfStopCurrentRec = null;
              resolve(res);
            }

            function triggerStop() {
              if (stopRequested || settled) return;
              stopRequested = true;
              TootApp.Audio.stopRecording()
                .then(done)
                .catch(function () {
                  done({ ok: false, reason: 'stop_failed' });
                });
            }

            state.qfStopCurrentRec = triggerStop;

            TootApp.Audio.startRecording({
              maxDurationSec: recWindowSec,
              onLevel: function (timeData, rms, elapsed) {
                if (gen !== state.qfGen || !state.qfActive || settled || stopRequested) return;
                var now = performance.now();
                var dt = Math.max(0, now - lastPerf);
                lastPerf = now;
                if (waveCanvas) drawLiveWave(waveCanvas, timeData, uiDetected ? '#4ade80' : '#ef4444');
                if (timerBar && timerBar.style) {
                  timerBar.style.width = Math.min(100, Math.round((elapsed / recWindowSec) * 100)) + '%';
                }
                var det = detector.feed(rms, elapsed, dt);
                if (det.detectedNow && !uiDetected) {
                  uiDetected = true;
                  if (stageBanner) stageBanner.classList.add('is-detected');
                  if (phaseWordEl) phaseWordEl.textContent = '🎤 GUESS!';
                  if (badgeEl) badgeEl.textContent = '🟢 ACOUSTIC ONSET DETECTED — RECORDING…';
                  if (subEl) subEl.textContent = 'Reproducing specimen — automated cutoff armed upon completion';
                }
                if (det.shouldStop) {
                  triggerStop();
                }
              },
              onAutoStop: done
            }).catch(function (err) {
              done({ ok: false, reason: 'mic_error', error: err ? err.message : 'Microphone unavailable.' });
            });
          });
        }

        function scoreAllQuickFireCaptures(captures) {
          var scored = [];
          for (var c = 0; c < captures.length; c++) {
            var entry = captures[c];
            var target = entry.target;
            var capRes = entry.capRes;
            if (!target.features || !target.features.spectrogram) {
              target.features = TootApp.DSP.extractFeatures(target.samples, target.sampleRate || 44100);
            }
            if (!capRes || !capRes.ok || !capRes.clippedSamples || capRes.clippedSamples.length === 0) {
              scored.push({
                index: entry.index,
                target: target,
                guessSound: null,
                cmpRes: null,
                exactScore: 0,
                rank: TootLabs.Store.getRankForScore(0),
                metrics: null,
                missed: true
              });
            } else {
              var gSr = capRes.sampleRate || 44100;
              var gSamples = capRes.clippedSamples;
              var gFeat = TootApp.DSP.extractFeatures(gSamples, gSr);
              var guessObj = {
                id: 'qf_g_' + entry.index + '_' + Date.now(),
                name: 'Mimic #' + (entry.index + 1),
                sampleRate: gSr,
                samples: gSamples,
                features: gFeat
              };
              var cmpRes = TootApp.DSP.compareSounds(target.features, gFeat);
              var exactScore = TootLabs.Store.computeExactScore(cmpRes);
              var rRank = TootLabs.Store.getRankForScore(exactScore);
              var rMetrics = buildComparisonChipMetrics(target, guessObj, cmpRes, { skipAuth: true });
              scored.push({
                index: entry.index,
                target: target,
                guessSound: guessObj,
                cmpRes: cmpRes,
                exactScore: exactScore,
                rank: rRank,
                metrics: rMetrics,
                missed: false
              });
            }
          }
          state.qfResults = scored;
          return scored;
        }

        var rawCaptures = [];

        function runRound(idx) {
          if (gen !== state.qfGen || !state.qfActive) return Promise.resolve(state.qfResults);
          if (idx >= readyDeck.length) {
            state.qfActive = false;
            state.qfStopCurrentRec = null;
            if (doneBtn) doneBtn.classList.add('hidden');
            scoreAllQuickFireCaptures(rawCaptures);
            if (fastMode) {
              state.qfPhase = 'results';
              renderQuickFirePane({ animate: false });
              return Promise.resolve(state.qfResults);
            }
            state.qfScoringActive = true;
            return new Promise(function (resolveSeq) {
              runAnalysisSequence(
                {
                  context: 'quickfire',
                  sample: readyDeck[0],
                  title: 'EVALUATING RAPID-SEQUENCE TRIALS',
                  subtitle: 'Computing reproduction fidelity across ' + state.qfResults.length + ' captures via A.S.S. v4.2…',
                  count: state.qfResults.length
                },
                function () {
                  state.qfScoringActive = false;
                  if (gen !== state.qfGen) {
                    resolveSeq(state.qfResults);
                    return;
                  }
                  state.qfPhase = 'results';
                  renderQuickFirePane({ animate: true });
                  resolveSeq(state.qfResults);
                }
              );
            });
          }

          var target = readyDeck[idx];
          state.qfIndex = idx;

          if (counterEl) counterEl.textContent = 'SPECIMEN ' + (idx + 1) + ' OF ' + readyDeck.length;
          renderQuickFireDots(idx, false, rawCaptures);
          if (stageBanner) {
            stageBanner.classList.remove('is-recording', 'is-detected', 'is-scoring');
            stageBanner.classList.add('is-listening');
          }
          if (phaseWordEl) phaseWordEl.textContent = '🔊 LISTEN';
          if (badgeEl) badgeEl.textContent = 'SPECIMEN #' + (idx + 1) + ' OF ' + readyDeck.length + ' · REFERENCE PLAYBACK';
          if (titleEl) titleEl.textContent = getSampleName(target);
          if (subEl) subEl.textContent = 'Automated sequence: microphone telemetry engages after playback';
          if (timerBar && timerBar.style) timerBar.style.width = '0%';
          if (doneBtn) doneBtn.classList.add('hidden');

          var preWaitMs = idx === 0 ? (fastMode ? 8 : 220) : 0;
          return waitMs(preWaitMs)
            .then(function () {
              if (gen !== state.qfGen || !state.qfActive) return null;
              return playTargetForRound(target);
            })
            .then(function () {
              if (gen !== state.qfGen || !state.qfActive) return null;
              return waitMs(fastMode ? 5 : 40);
            })
            .then(function () {
              if (gen !== state.qfGen || !state.qfActive) return null;
              renderQuickFireDots(idx, true, rawCaptures);
              if (stageBanner) {
                stageBanner.classList.remove('is-listening', 'is-detected', 'is-scoring');
                stageBanner.classList.add('is-recording');
              }
              if (phaseWordEl) phaseWordEl.textContent = '🎤 GUESS!';
              if (badgeEl) badgeEl.textContent = '🔴 TELEMETRY ACTIVE · AUTO-DETECT ARMED';
              if (subEl) subEl.textContent = 'Reproduce reference event — automated cutoff active (or tap Next Fart)';
              if (timerBar && timerBar.style) timerBar.style.width = '0%';
              if (doneBtn) doneBtn.classList.remove('hidden');
              return captureMimicForRound(target, idx);
            })
            .then(function (capRes) {
              if (gen !== state.qfGen || !state.qfActive) return state.qfResults;
              if (doneBtn) doneBtn.classList.add('hidden');
              state.qfStopCurrentRec = null;

              var missed = !capRes || !capRes.ok || !capRes.clippedSamples || capRes.clippedSamples.length === 0;
              rawCaptures.push({
                index: idx,
                target: target,
                capRes: capRes,
                missed: missed
              });

              if (stageBanner) {
                stageBanner.classList.remove('is-listening', 'is-recording', 'is-detected');
                stageBanner.classList.add('is-scoring');
              }
              if (timerBar && timerBar.style) timerBar.style.width = '100%';

              if (missed) {
                if (phaseWordEl) phaseWordEl.textContent = '⚠️ BELOW THRESHOLD';
                if (badgeEl) badgeEl.textContent = 'INSUFFICIENT SIGNAL · ADVANCING';
                if (subEl) subEl.textContent = 'Proceeding to next reference specimen.';
              } else {
                if (phaseWordEl) phaseWordEl.textContent = '⚡ NEXT!';
                if (badgeEl) badgeEl.textContent = 'TRIAL #' + (idx + 1) + ' LOGGED · ADVANCING';
                if (subEl) subEl.textContent = idx + 1 >= readyDeck.length ? 'Compiling Rapid-Sequence Official Findings…' : 'Advancing immediately to next specimen.';
              }

              renderQuickFireDots(idx + 1, false, rawCaptures);
              return waitMs(fastMode ? 8 : 35).then(function () {
                return runRound(idx + 1);
              });
            });
        }

        return runRound(0);
      })
      .catch(function (err) {
        abortQuickFireRound(true);
        renderQuickFirePane();
        showToast((err && err.message) || 'Could not start Quick-Fire Mimic Round.', true);
        return [];
      });
  }

  function ordinalPlayerLabel(n) {
    var num = Math.max(1, parseInt(n, 10) || 1);
    var mod100 = num % 100;
    var suf =
      mod100 >= 11 && mod100 <= 13
        ? 'th'
        : num % 10 === 1
        ? 'st'
        : num % 10 === 2
        ? 'nd'
        : num % 10 === 3
        ? 'rd'
        : 'th';
    return num + suf + ' Player';
  }

  function setGuessMode(mode) {
    clearRevealTimers();
    clearResultAnimations();
    var next = mode === 'mimic' ? 'mimic' : 'guess';
    state.guessMode = next;
    state.hintLevel = 0;
    if (next === 'mimic') {
      state.guessRevealed = true;
    } else {
      state.guessRevealed = false;
      state.sessionGuesses = [];
      state.pendingGuess = null;
      state.lastOutcome = null;
      state.lastSessionResults = [];
    }
    renderGuessView();
  }

  function buildGuessHintsHtml(target, hintLevel) {
    if (!target || hintLevel <= 0) return '';
    var DSP = root.TootApp && root.TootApp.DSP;
    var feat = target.features;
    if (!feat && target.samples && target.samples.length > 0 && DSP) {
      feat = DSP.extractFeatures(target.samples, target.sampleRate || 44100);
      target.features = feat;
    }
    var pm = target.previewMeta || null;
    var durSec =
      feat && typeof feat.duration === 'number' && feat.duration > 0
        ? feat.duration
        : typeof target.previewDurationSec === 'number' && target.previewDurationSec > 0
        ? target.previewDurationSec
        : target.samples && target.samples.length > 0
        ? target.samples.length / (target.sampleRate || 44100)
        : 0;
    var bursts = feat ? (feat.burstCount || 1) : (pm ? (pm.burstCount || 1) : 1);
    var prof = feat && DSP ? DSP.describeSoundProfile(feat) : null;
    var textureTxt = prof ? prof.textureLabel : (pm && pm.textureLabel) || 'Atmospheric turbulence';
    var pitchTxt = prof ? prof.pitchLabel : (pm && pm.pitchLabel) || 'Mid-band rumble';
    var mood =
      TootLabs.Store && typeof TootLabs.Store.describeAcousticMood === 'function'
        ? TootLabs.Store.describeAcousticMood(feat || (pm ? Object.assign({ durationSec: durSec }, pm) : { durationSec: durSec }))
        : { moodLabel: 'Mysterious', wildAnalogy: 'Stealth acoustic event.' };

    var chips = [];
    if (hintLevel >= 1) {
      chips.push(
        '<div class="labs-hint-chip" data-hint-step="1">🏷️ <strong>Hint 1 · Name:</strong> ' +
        esc(getSampleName(target)) +
        '</div>'
      );
    }
    if (hintLevel >= 2) {
      var burstDesc =
        bursts >= 3
          ? bursts + ' bursts (staccato modulation)'
          : bursts === 2
          ? 'Dual-impulse burst'
          : 'Continuous laminar release';
      var durTxt = durSec > 0 ? durSec.toFixed(2) + 's' : 'Classified span';
      chips.push(
        '<div class="labs-hint-chip" data-hint-step="2">⏱️ <strong>Hint 2 · Emission Lifetime &amp; Pattern:</strong> ' +
        esc(durTxt + ' · ' + burstDesc + ' · ' + textureTxt) +
        '</div>'
      );
    }
    if (hintLevel >= 3) {
      chips.push(
        '<div class="labs-hint-chip" data-hint-step="3">🌡️ <strong>Hint 3 · Primary Resonance &amp; Acoustic Profile:</strong> ' +
        esc(pitchTxt + ' · Classification: ' + mood.moodLabel + ' — ' + mood.wildAnalogy) +
        '</div>'
      );
    }
    return chips.join('');
  }

  function revealNextGuessHint() {
    var target = getSampleById(state.guessTargetId);
    var isHiddenGuess = state.guessMode === 'guess' && !state.guessRevealed;
    if (!target || !isHiddenGuess || state.hintLevel >= 3) return state.hintLevel;

    state.hintLevel = Math.min(3, (state.hintLevel || 0) + 1);
    if (state.hintLevel >= 2 && !target.features && !target.previewMeta && target.preloadUrl) {
      ensureTargetReady(target)
        .then(function () {
          renderGuessView();
        })
        .catch(function () {
          renderGuessView();
        });
    }
    renderGuessView();
    return state.hintLevel;
  }

  function renderGuessView() {
    var strip = $('guess-vault-strip');
    if (strip) {
      if (state.samples.length === 0) {
        strip.innerHTML = '<span class="labs-hint-text">No saved farts yet. Record one on Home first!</span>';
      } else {
        strip.innerHTML = state.samples
          .map(function (s) {
            var st = TootLabs.Store.getSampleStats(s.id);
            var active = s.id === state.guessTargetId;
            var scoreBadge = st.attemptCount > 0 ? '<span class="labs-pill-score">' + st.bestScore.toFixed(1) + '%</span>' : '';
            return (
              '<button type="button" class="labs-strip-pill' +
              (active ? ' active' : '') +
              '" data-pick-fart="' +
              esc(s.id) +
              '">' +
              '<span>' + (s.isBuiltIn ? '📦 ' : '🎙️ ') + esc(getSampleName(s)) + '</span>' +
              scoreBadge +
              '</button>'
            );
          })
          .join('');

        strip.querySelectorAll('[data-pick-fart]').forEach(function (b) {
          b.addEventListener('click', function () {
            state.pickerOpen = false;
            openGuessMode(this.getAttribute('data-pick-fart'));
          });
        });
      }
    }

    var target = getSampleById(state.guessTargetId);
    var emptyEl = $('guess-empty-target');
    var loadedEl = $('guess-loaded-pane');
    if (emptyEl) emptyEl.classList.toggle('hidden', Boolean(target));
    if (loadedEl) loadedEl.classList.toggle('hidden', !target);

    var pickerDrawer = $('guess-picker-drawer');
    var togglePickerBtn = $('btn-guess-toggle-picker');
    if (pickerDrawer) pickerDrawer.classList.toggle('hidden', !state.pickerOpen || !target);
    if (togglePickerBtn) {
      togglePickerBtn.disabled = !target;
      togglePickerBtn.setAttribute('aria-expanded', state.pickerOpen ? 'true' : 'false');
      togglePickerBtn.textContent = state.pickerOpen ? '▴ Hide' : '▾ Pick';
    }
    if ($('btn-guess-random')) {
      $('btn-guess-random').disabled = state.samples.length === 0;
    }

    var isHiddenGuess = state.guessMode === 'guess' && !state.guessRevealed;

    // Mode pill & reset chip
    var modePill = $('guess-mode-pill');
    var resetBlindBtn = $('btn-guess-reset-blind');
    if (modePill) {
      modePill.classList.toggle('is-mimic', state.guessMode === 'mimic');
      modePill.textContent =
        state.guessMode === 'mimic'
          ? '🦜 MIMIC MODE · SOUND HEARD'
          : state.guessRevealed
          ? '🎯 GUESS THE FART · REVEALED'
          : '🎯 GUESS THE FART · MYSTERY';
    }
    if (resetBlindBtn) {
      resetBlindBtn.classList.toggle('hidden', isHiddenGuess || !target);
      resetBlindBtn.textContent = state.guessMode === 'mimic' ? '🔒 Back to Mystery' : '🔄 New Mystery Round';
    }

    // Clue Bar metadata & waveform gate (ZERO audio/waveform spoilers before reveal!)
    var clueIcon = $('guess-clue-icon');
    var clueName = $('guess-target-name');
    var clueDur = $('guess-target-dur');
    var clueMeta = $('guess-target-meta');
    var waveWrap = $('guess-target-wave-wrap');
    var hintRow = $('guess-hint-row');
    var hintBtn = $('btn-guess-hint');
    var hintStatus = $('guess-hint-status');
    var hintsTray = $('guess-hints-tray');

    if (target) {
      var hasAudio = Boolean(target.samples && target.samples.length > 0);
      var hintLvl = state.hintLevel || 0;
      if (clueIcon) clueIcon.textContent = isHiddenGuess ? '🔒' : '🔊';
      if (clueName) {
        clueName.textContent = isHiddenGuess && hintLvl < 1 ? 'Mystery Fart' : getSampleName(target);
      }
      if (clueDur) {
        clueDur.textContent = hasAudio ? (target.samples.length / target.sampleRate).toFixed(2) + 's' : 'Ready';
        clueDur.classList.toggle('hidden', isHiddenGuess || !hasAudio);
      }
      if (clueMeta) {
        if (isHiddenGuess) {
          clueMeta.textContent =
            hintLvl > 0
              ? 'Hint ' + hintLvl + '/3 unlocked — audio still sealed until reveal'
              : 'Blind mystery — record your guess, or tap Play Fart First to mimic';
        } else if (hasAudio) {
          var feat = target.features || TootApp.DSP.extractFeatures(target.samples, target.sampleRate);
          target.features = feat;
          var prof = TootApp.DSP.describeSoundProfile(feat);
          clueMeta.textContent = (state.guessMode === 'mimic' ? 'Mimic Mode · ' : 'Revealed · ') + prof.pitchLabel + ' · ' + prof.textureLabel;
        } else {
          clueMeta.textContent = 'Loading Mystery Fart audio…';
        }
      }
      if (waveWrap) waveWrap.classList.toggle('hidden', isHiddenGuess || !hasAudio);
      if (hintRow) hintRow.classList.toggle('hidden', !isHiddenGuess);
      if (hintBtn) {
        hintBtn.disabled = !isHiddenGuess || hintLvl >= 3;
        hintBtn.textContent = hintLvl >= 3 ? '💡 All 3 Hints Used' : '💡 Hint (' + hintLvl + '/3)';
      }
      if (hintStatus) {
        hintStatus.textContent =
          hintLvl === 0
            ? 'Next clue: Specimen Name'
            : hintLvl === 1
            ? 'Next clue: Duration'
            : hintLvl === 2
            ? 'Next clue: Resonance Pitch'
            : 'All 3 clues unlocked';
      }
      if (hintsTray) {
        var showTray = isHiddenGuess && hintLvl > 0;
        hintsTray.classList.toggle('hidden', !showTray);
        hintsTray.innerHTML = showTray ? buildGuessHintsHtml(target, hintLvl) : '';
      }
    } else {
      if (clueIcon) clueIcon.textContent = '💨';
      if (clueName) clueName.textContent = 'No Fart Selected';
      if (clueDur) clueDur.classList.add('hidden');
      if (clueMeta) clueMeta.textContent = 'Record a fart on Home first.';
      if (waveWrap) waveWrap.classList.add('hidden');
      if (hintRow) hintRow.classList.add('hidden');
      if (hintsTray) hintsTray.classList.add('hidden');
    }

    // Primary Action Buttons
    var recBtn = $('btn-guess-rec');
    var recIcon = $('guess-rec-icon');
    var recLbl = $('guess-rec-label');
    var recSub = $('guess-rec-sub');
    var playFirstBtn = $('btn-guess-play-first');
    var pfLbl = $('guess-playfirst-label');
    var pfSub = $('guess-playfirst-sub');
    var scoreNowBtn = $('btn-guess-score-now');
    var scoreNowIcon = $('guess-scorenow-icon');
    var scoreNowLbl = $('guess-scorenow-label');
    var scoreNowSub = $('guess-scorenow-sub');
    var replayWaveBtn = $('btn-guess-replay-wave');

    var isCapturing = TootApp.Audio.isRecordingOrStarting() && state.recordingKind === 'guess';
    var queuedCount = state.sessionGuesses.length;
    var hasQueued = Boolean(target) && queuedCount > 0;

    if (recBtn && !isCapturing) {
      recBtn.disabled = !target || state.revealInProgress;
      recBtn.classList.toggle('is-mimic', state.guessMode === 'mimic');
      recBtn.classList.toggle('has-queued', hasQueued);
      if (recIcon) recIcon.textContent = state.guessMode === 'mimic' ? '🦜' : '🎤';
      if (hasQueued) {
        if (recLbl) recLbl.textContent = ordinalPlayerLabel(queuedCount + 1);
        if (recSub) recSub.textContent = state.guessMode === 'mimic' ? 'Record another mimic' : 'Add another guess';
      } else {
        if (recLbl) recLbl.textContent = state.guessMode === 'mimic' ? 'Mimic The Fart' : 'Guess The Fart';
        if (recSub) {
          if (!target) {
            recSub.textContent = 'Record a specimen on Home first';
          } else if (state.guessMode === 'mimic') {
            recSub.textContent = 'Copy what you just heard';
          } else {
            recSub.textContent = 'Record your blind guess';
          }
        }
      }
    }

    if (playFirstBtn) {
      playFirstBtn.classList.toggle('hidden', hasQueued);
      playFirstBtn.disabled = !target || state.revealInProgress || isCapturing || (isHiddenGuess && queuedCount > 0);
      playFirstBtn.classList.toggle('is-active', state.guessMode === 'mimic');
      if (pfLbl) pfLbl.textContent = state.guessMode === 'mimic' ? 'Replay Fart' : 'Play Fart First';
      if (pfSub) pfSub.textContent = state.guessMode === 'mimic' ? 'Hear original again' : 'Mimic Mode';
    }

    if (scoreNowBtn) {
      scoreNowBtn.classList.toggle('hidden', !hasQueued);
      scoreNowBtn.disabled = !target || state.revealInProgress || isCapturing;
      if (scoreNowIcon) scoreNowIcon.textContent = isHiddenGuess ? '🔊' : '🧪';
      if (scoreNowLbl) scoreNowLbl.textContent = 'Score Now';
      if (scoreNowSub) {
        if (isHiddenGuess) {
          scoreNowSub.textContent = queuedCount === 1 ? 'Reveal & score' : 'Reveal & rank ' + queuedCount;
        } else {
          scoreNowSub.textContent = queuedCount === 1 ? 'Compare & score' : 'Rank ' + queuedCount + ' mimics';
        }
      }
    }

    if (replayWaveBtn) {
      replayWaveBtn.disabled = !target || state.revealInProgress || isCapturing;
    }

    // Next Player Name input (only after Player 1 is locked)
    var multiWrap = $('guess-multi-name-wrap');
    var nameInput = $('guess-name-input');
    if (multiWrap) multiWrap.classList.toggle('hidden', !hasQueued);
    if (nameInput && !nameInput.value.trim()) {
      nameInput.placeholder = 'Player ' + (queuedCount + 1);
    }

    // Inline Results Visibility (right below Guess controls)
    var inlineRes = $('guess-inline-results');
    var showRes =
      Boolean(state.lastOutcome) &&
      Boolean(state.lastOutcome.targetSound) &&
      Boolean(target) &&
      state.lastOutcome.targetSound.id === target.id &&
      (state.guessRevealed || state.guessMode === 'mimic');
    if (inlineRes) {
      inlineRes.classList.toggle('hidden', !showRes);
    }
    var nextAfterBtn = $('btn-guess-next-after');
    if (nextAfterBtn) {
      nextAfterBtn.classList.toggle('hidden', !showRes);
      nextAfterBtn.disabled = !target || state.revealInProgress || isCapturing || state.samples.length <= 1;
    }

    renderSessionQueue();
    renderGuessLeaderboard();
    drawGuessWaveforms();
  }

  function openGuessMode(sampleId) {
    var reqGen = ++state.guessOpenGen;
    TootApp.Audio.stopAll();
    clearRevealTimers();
    clearResultAnimations();

    var resolvedId = sampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id) || null;
    state.guessTargetId = resolvedId;
    state.guessSubMode = 'standard';
    state.guessMode = 'guess';
    state.guessRevealed = false;
    state.hintLevel = 0;
    state.pickerOpen = false;
    state.historyOpen = false;
    state.sessionGuesses = [];
    state.pendingGuess = null;
    state.lastOutcome = null;
    state.lastSessionResults = [];

    var stdPane = $('guess-standard-pane');
    var blindPane = $('guess-blind-pane');
    var qfPane = $('guess-quickfire-pane');
    var seqPane = $('guess-sequence-pane');
    if (stdPane) stdPane.classList.remove('hidden');
    if (blindPane) blindPane.classList.add('hidden');
    if (qfPane) qfPane.classList.add('hidden');
    if (seqPane) seqPane.classList.add('hidden');
    if ($('guess-live-wave')) $('guess-live-wave').classList.add('hidden');
    if ($('guess-rec-status')) $('guess-rec-status').classList.add('hidden');

    showView('guess');

    if (!resolvedId) {
      state.guessAttempts = [];
      renderGuessView();
      return Promise.resolve();
    }

    var target = getSampleById(resolvedId);
    var hasAudio = Boolean(target && target.samples && target.samples.length > 0);
    state.guessAttempts = state.attemptsCacheLoaded ? getCachedAttemptsForSample(resolvedId) : [];
    renderGuessView();

    if (hasAudio && state.attemptsCacheLoaded) {
      return Promise.resolve();
    }

    return Promise.all([
      hasAudio ? Promise.resolve(target) : ensureTargetReady(target),
      state.attemptsCacheLoaded
        ? Promise.resolve(state.guessAttempts)
        : TootLabs.Store.loadAttemptsForSample(resolvedId)
    ])
      .then(function (res) {
        if (reqGen !== state.guessOpenGen || state.view !== 'guess' || state.guessTargetId !== resolvedId) return;
        state.guessAttempts = res[1] || [];
        renderGuessView();
      })
      .catch(function () {
        if (reqGen !== state.guessOpenGen || state.view !== 'guess' || state.guessTargetId !== resolvedId) return Promise.resolve();
        if (state.attemptsCacheLoaded) {
          renderGuessView();
          return Promise.resolve();
        }
        return TootLabs.Store.loadAttemptsForSample(resolvedId).then(function (attempts) {
          if (reqGen !== state.guessOpenGen || state.view !== 'guess' || state.guessTargetId !== resolvedId) return;
          state.guessAttempts = attempts || [];
          renderGuessView();
        });
      });
  }

  function pickRandomGuessTarget() {
    if (!state.samples || state.samples.length === 0) {
      showToast('No saved farts in Vault yet — record one on Home first!', true);
      return null;
    }
    var pool = state.samples.length > 1
      ? state.samples.filter(function (s) { return s.id !== state.guessTargetId; })
      : state.samples;
    if (pool.length === 0) pool = state.samples;
    var chosen = pool[Math.floor(Math.random() * pool.length)];
    openGuessMode(chosen.id);
    showToast('🎲 New Mystery Fart locked in — guess blind or tap 💡 Hint!');
    return chosen;
  }

  function playFartFirst() {
    if (state.revealInProgress) return;
    var target = getSampleById(state.guessTargetId);
    if (!target) {
      showToast('Record or select a saved fart on Home first!', true);
      return;
    }
    if (state.guessMode === 'guess' && !state.guessRevealed && state.sessionGuesses.length > 0) {
      showToast('Guesses already locked in Mystery Mode — tap Score Now to reveal!', true);
      return;
    }

    function runPlay(readyTarget) {
      var useTarget = readyTarget || target;
      var switchedFromGuess = state.guessMode !== 'mimic';
      state.guessMode = 'mimic';
      state.guessRevealed = true;
      if (switchedFromGuess) {
        state.lastOutcome = null;
        state.lastSessionResults = [];
      }
      renderGuessView();

      try {
        var playRes = TootApp.Audio.playSound(useTarget.samples, useTarget.sampleRate, {
          channel: 'guess_orig',
          onProgress: function (p) {
            if ($('guess-target-wave')) {
              drawStaticWaveform($('guess-target-wave'), useTarget.samples, {
                fallbackW: 480,
                fallbackH: 46,
                barWidth: 2,
                gap: 1.5,
                colorA: '#134e38',
                colorB: '#1f7a53',
                activeColor: '#092b1e',
                inactiveColor: 'rgba(20, 90, 65, 0.25)',
                lineColor: 'rgba(46, 72, 58, 0.26)',
                cursorColor: '#0e3f2d',
                progress: p
              });
            }
          },
          onEnded: function () {
            drawGuessWaveforms();
          }
        });
        if (playRes && typeof playRes.catch === 'function') {
          playRes.catch(function () {});
        }
      } catch (err) {}
    }

    if (target.samples && target.samples.length > 0) {
      runPlay(target);
    } else {
      ensureTargetReady(target)
        .then(runPlay)
        .catch(function (err) {
          showToast((err && err.message) || 'Could not load fart audio.', true);
        });
    }
  }

  var REVEAL_HEARING_TITLES = [
    '🔬 INSTITUTE ACOUSTIC PLAYBACK — REFERENCE VS. REPRODUCTION',
    '📡 COMPARATIVE AUDIO SEQUENCE — RECORDING INTO ARCHIVE',
    '🏛️ LABORATORY VERIFICATION SEQUENCE — SOURCE AUDIT',
    '🎙️ CONTROLLED SPECTRAL COMPARISON — TRIALS VS. REFERENCE',
    '🧪 PEER-REVIEWED ACOUSTIC VERIFICATION — PREPARING BASELINE'
  ];

  function triggerRevealAndAnalyze(target, rawGuesses, modeUsed, subtitleLabel, delayMs) {
    if (!target || !rawGuesses || rawGuesses.length === 0) {
      return Promise.resolve([]);
    }
    clearRevealTimers();
    state.lastOutcome = null;
    state.lastSessionResults = [];
    state.lastRevealOrder = [];

    var gen = ++state.revealGen;
    state.revealInProgress = true;
    renderGuessView();

    var DSP = root.TootApp && root.TootApp.DSP;
    var Spectrogram3D = root.TootApp && root.TootApp.Spectrogram3D;
    if (DSP && target.samples && (!target.features || !target.features.spectrogram)) {
      target.features = DSP.extractFeatures(target.samples, target.sampleRate || 44100);
    }
    for (var gi = 0; gi < rawGuesses.length; gi++) {
      var gItem = rawGuesses[gi];
      if (DSP && gItem && gItem.samples && (!gItem.features || !gItem.features.spectrogram)) {
        gItem.features = DSP.extractFeatures(gItem.samples, gItem.sampleRate || 44100);
      }
    }

    var isFastTest = typeof delayMs === 'number' && delayMs < 100;
    var introWaitMs = typeof delayMs === 'number' ? Math.max(0, delayMs) : 950;
    var postClipHoldMs = isFastTest ? 10 : 450;
    var guessCueMs = isFastTest ? 10 : 950;
    var mysteryCueMs = isFastTest ? 10 : 1250;
    var settleMs = isFastTest ? 15 : 900;

    var banner = $('guess-reveal-banner');
    var titleEl = $('guess-reveal-title');
    var speakerEl = $('guess-reveal-speaker');
    var txtEl = $('guess-reveal-text');
    var barEl = $('guess-reveal-bar');
    var lineupEl = $('guess-reveal-lineup');
    var paneA = $('reveal-pane-orig');
    var paneB = $('reveal-pane-guess');
    var sealEl = $('reveal-mystery-seal');
    var sealTitleEl = $('reveal-seal-title');
    var sealSubEl = $('reveal-seal-sub');
    var lblA = $('reveal-spec-lbl-a');
    var lblB = $('reveal-spec-lbl-b');
    var pillA = $('reveal-pill-a');
    var pillB = $('reveal-pill-b');
    var cvsA = $('reveal-spec3d-orig');
    var cvsB = $('reveal-spec3d-guess');

    var targetName = getSampleName(target);
    var firstGuessName = (rawGuesses[0] && rawGuesses[0].name) || 'Your Guess';
    var isMysteryReveal = modeUsed !== 'mimic';
    var steps = [];
    for (var si = 0; si < rawGuesses.length; si++) {
      var gObj = rawGuesses[si];
      steps.push({
        kind: 'guess',
        key: 'guess_' + si,
        guessIndex: si,
        label: (gObj && gObj.name) || ('Player ' + (si + 1)),
        sound: gObj
      });
    }
    steps.push({ kind: 'orig', key: 'orig', label: targetName, sound: target });

    function updateLineupPills(activeIdx, cueingMode) {
      if (!lineupEl) return;
      lineupEl.setAttribute('data-active-step', String(activeIdx));
      lineupEl.setAttribute('data-active-label', activeIdx >= 0 && steps[activeIdx] ? steps[activeIdx].label : '');
      lineupEl.innerHTML = steps
        .map(function (st, idx) {
          var isOrig = st.kind === 'orig';
          var cls =
            (isOrig ? ' is-mystery-pill' : '') +
            (idx < activeIdx ? ' is-done' : idx === activeIdx ? (cueingMode ? ' is-cueing' : ' is-active') : '');
          var ico = idx < activeIdx ? '✓' : idx === activeIdx ? (cueingMode ? '⏳' : isOrig ? '🚨' : '🔊') : isOrig ? '🎯' : '🎤';
          var textLbl = isOrig
            ? 'MYSTERY FART (SOURCE)'
            : rawGuesses.length === 1
            ? st.label
            : 'Guess ' + (st.guessIndex + 1) + ': ' + st.label;
          return '<span class="labs-reveal-pill' + cls + '" data-rev-step="' + idx + '">' + ico + ' ' + esc(textLbl) + '</span>';
        })
        .join('');
    }

    if (banner) {
      banner.classList.remove('hidden', 'is-mystery-finale', 'is-playing-live');
      banner.classList.add('is-processing');
    }
    if (titleEl) {
      titleEl.textContent = REVEAL_HEARING_TITLES[Math.floor(Math.random() * REVEAL_HEARING_TITLES.length)];
    }
    if (speakerEl) {
      speakerEl.textContent = rawGuesses.length === 1
        ? '⚙️ PROCESSING · PARTICIPANT RECORDING FIRST'
        : '⚙️ PROCESSING · RECORDING 1 (' + firstGuessName + ')';
    }
    if (txtEl) {
      txtEl.textContent = 'Calibrating waveform & spectral distribution — prepare for playback.';
    }
    if (barEl) {
      barEl.classList.remove('filling');
      if (barEl.style) barEl.style.width = '6%';
    }
    if (paneA) {
      paneA.classList.remove('is-playing-orig', 'is-cueing-pane', 'is-cueing-mystery');
      paneA.classList.add('is-dimmed');
      paneA.classList.toggle('is-mystery-sealed', isMysteryReveal);
    }
    if (paneB) {
      paneB.classList.remove('is-playing-guess', 'is-dimmed');
      paneB.classList.add('is-cueing-pane');
    }
    if (sealEl) sealEl.classList.toggle('hidden', !isMysteryReveal);
    if (sealTitleEl) sealTitleEl.textContent = 'MYSTERY FART';
    if (sealSubEl) sealSubEl.textContent = 'Source specimen plays last';
    if (lblA) {
      lblA.textContent = isMysteryReveal && (state.hintLevel || 0) < 1 ? '🔒 MYSTERY FART' : '🎯 SOURCE · ' + targetName;
    }
    if (lblB) lblB.textContent = rawGuesses.length === 1 ? '🎤 YOUR GUESS' : '🎤 GUESS 1 · ' + firstGuessName;
    if (pillA) pillA.textContent = 'PLAYS LAST';
    if (pillB) pillB.textContent = '⏳ UP FIRST';
    updateLineupPills(0, true);

    if (Spectrogram3D) {
      var specA = target && target.features ? target.features.spectrogram : null;
      if (cvsA && specA) {
        state.revealSpecA = new Spectrogram3D(cvsA, { spectrogram: specA, colormap: 'plasma' });
      }
    }

    function mountRevealGuessSpec(guessSound) {
      if (!Spectrogram3D || !cvsB) return;
      var specG = guessSound && guessSound.features ? guessSound.features.spectrogram : null;
      if (!specG) return;
      if (state.revealSpecA) {
        try { state.revealSpecA.partners = []; } catch (e) {}
      }
      if (state.revealSpecB && typeof state.revealSpecB.destroy === 'function') {
        try { state.revealSpecB.destroy(); } catch (e) {}
      }
      state.revealSpecB = new Spectrogram3D(cvsB, { spectrogram: specG, colormap: 'magma' });
      if (state.revealSpecA && typeof state.revealSpecA.linkPartner === 'function') {
        state.revealSpecA.linkPartner(state.revealSpecB);
        if (typeof state.revealSpecA.azimuth === 'number') {
          state.revealSpecB.azimuth = state.revealSpecA.azimuth;
          state.revealSpecB.elevation = state.revealSpecA.elevation;
          state.revealSpecB.zoom = state.revealSpecA.zoom;
          state.revealSpecB.render();
        }
      }
      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(function () {
          if (state.revealSpecB) state.revealSpecB.resize();
        });
      }
    }

    mountRevealGuessSpec(rawGuesses[0]);
    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        if (state.revealSpecA) state.revealSpecA.resize();
        if (state.revealSpecB) state.revealSpecB.resize();
      });
    }

    return new Promise(function (resolve) {
      var finished = false;

      function finishReveal() {
        if (finished || gen !== state.revealGen) return;
        finished = true;
        if (state.revealTimerId) {
          clearTimeout(state.revealTimerId);
          state.revealTimerId = null;
        }
        if (state.revealFallbackTimerId) {
          clearTimeout(state.revealFallbackTimerId);
          state.revealFallbackTimerId = null;
        }
        if (Array.isArray(state.revealStepTimers)) {
          for (var ti = 0; ti < state.revealStepTimers.length; ti++) {
            clearTimeout(state.revealStepTimers[ti]);
          }
          state.revealStepTimers = [];
        }
        if (root.TootApp && root.TootApp.Audio && typeof root.TootApp.Audio.stopChannel === 'function') {
          root.TootApp.Audio.stopChannel('guess_reveal');
        }
        destroyRevealSpecs();
        state.revealSkipCb = null;
        state.revealInProgress = false;
        state.guessRevealed = true;
        if (paneA) paneA.classList.remove('is-playing-orig', 'is-mystery-sealed', 'is-cueing-pane', 'is-cueing-mystery', 'is-dimmed');
        if (paneB) paneB.classList.remove('is-playing-guess', 'is-cueing-pane', 'is-dimmed');
        if (sealEl) sealEl.classList.add('hidden');
        if (sealTitleEl) sealTitleEl.textContent = 'MYSTERY FART';
        if (sealSubEl) sealSubEl.textContent = 'Real sound plays last!';
        if (banner) {
          banner.classList.add('hidden');
          banner.classList.remove('is-mystery-finale', 'is-processing', 'is-playing-live');
        }
        if (barEl) {
          barEl.classList.remove('filling');
          if (barEl.style) barEl.style.width = '0%';
        }
        renderGuessView();
        var modeLabel = modeUsed === 'mimic' ? 'Mimic Mode' : 'Guess The Fart';
        var sub = subtitleLabel || (modeLabel + ' · Comparing vs ' + targetName);
        analyzeAndShowResults(target, rawGuesses, sub).then(resolve);
      }

      state.revealSkipCb = finishReveal;

      function cueNextStep(nextIdx) {
        if (finished || gen !== state.revealGen) return;
        if (nextIdx >= steps.length) {
          var endTimer = setTimeout(finishReveal, settleMs);
          state.revealStepTimers.push(endTimer);
          return;
        }
        var nextStep = steps[nextIdx];
        if (banner) {
          banner.classList.remove('is-playing-live', 'is-mystery-finale');
          banner.classList.add('is-processing');
        }
        updateLineupPills(nextIdx, true);

        if (nextStep.kind === 'orig') {
          if (paneB) {
            paneB.classList.remove('is-playing-guess', 'is-cueing-pane');
            paneB.classList.add('is-dimmed');
          }
          if (paneA) {
            paneA.classList.remove('is-dimmed', 'is-playing-orig');
            paneA.classList.add('is-cueing-pane');
            paneA.classList.toggle('is-cueing-mystery', isMysteryReveal);
          }
          if (sealEl) sealEl.classList.toggle('hidden', !isMysteryReveal);
          if (isMysteryReveal && sealTitleEl) sealTitleEl.textContent = 'UNSEALING SOURCE SPECIMEN…';
          if (isMysteryReveal && sealSubEl) sealSubEl.textContent = 'Reference acoustic baseline ready';
          if (pillB) pillB.textContent = '✓ LOGGED';
          if (pillA) pillA.textContent = '🔓 UNSEALING…';
          if (speakerEl) speakerEl.textContent = '🔓 PREPARING SOURCE MYSTERY FART…';
          if (txtEl) txtEl.textContent = 'All comparative trials processed — unsealing the source Mystery Fart.';
          var mystCueT = setTimeout(function () {
            startStepPlayback(nextIdx);
          }, mysteryCueMs);
          state.revealStepTimers.push(mystCueT);
        } else {
          mountRevealGuessSpec(nextStep.sound);
          if (paneA) {
            paneA.classList.remove('is-playing-orig', 'is-cueing-pane', 'is-cueing-mystery');
            paneA.classList.add('is-dimmed');
            paneA.classList.toggle('is-mystery-sealed', isMysteryReveal);
          }
          if (paneB) {
            paneB.classList.remove('is-playing-guess', 'is-dimmed');
            paneB.classList.add('is-cueing-pane');
          }
          if (sealEl) sealEl.classList.toggle('hidden', !isMysteryReveal);
          if (lblB) lblB.textContent = '🎤 GUESS ' + (nextStep.guessIndex + 1) + ' · ' + nextStep.label;
          if (pillA) pillA.textContent = 'PLAYS LAST';
          if (pillB) pillB.textContent = '⏳ NEXT AUDIT';
          if (speakerEl) {
            speakerEl.textContent = '⏳ NEXT RECORDING · GUESS ' + (nextStep.guessIndex + 1) + ': ' + nextStep.label;
          }
          if (txtEl) txtEl.textContent = 'Calibrating spectral profile prior to acoustic playback.';
          var gCueT = setTimeout(function () {
            startStepPlayback(nextIdx);
          }, guessCueMs);
          state.revealStepTimers.push(gCueT);
        }
      }

      function startStepPlayback(stepIdx) {
        if (finished || gen !== state.revealGen) return;
        if (stepIdx >= steps.length) {
          var endTimer = setTimeout(finishReveal, settleMs);
          state.revealStepTimers.push(endTimer);
          return;
        }

        var step = steps[stepIdx];
        state.lastRevealOrder.push(step.key);
        if (banner) {
          banner.classList.remove('is-processing');
          banner.classList.add('is-playing-live');
        }
        updateLineupPills(stepIdx, false);
        if (barEl && barEl.style) {
          barEl.style.width = Math.round(((stepIdx + 1) / steps.length) * 100) + '%';
        }

        if (step.kind === 'orig') {
          state.guessRevealed = true;
          renderGuessView();
          if (paneA) {
            paneA.classList.remove('is-mystery-sealed', 'is-cueing-pane', 'is-cueing-mystery', 'is-dimmed');
            paneA.classList.add('is-playing-orig');
          }
          if (paneB) {
            paneB.classList.remove('is-playing-guess', 'is-cueing-pane');
            paneB.classList.add('is-dimmed');
          }
          if (sealEl) sealEl.classList.add('hidden');
          if (banner) banner.classList.add('is-mystery-finale');
          if (lblA) lblA.textContent = '🎯 SOURCE · ' + targetName;
          if (pillA) pillA.textContent = '🔊 SOURCE SPECIMEN';
          if (pillB) pillB.textContent = '✓ LOGGED';
          if (speakerEl) {
            speakerEl.textContent = '🔬 NOW PLAYING · SOURCE MYSTERY FART: ' + targetName;
          }
          if (txtEl) {
            txtEl.textContent = 'Comparing reference source acoustics against recorded trials.';
          }
        } else {
          if (step.guessIndex > 0) {
            mountRevealGuessSpec(step.sound);
          }
          if (paneA) {
            paneA.classList.remove('is-playing-orig', 'is-cueing-pane', 'is-cueing-mystery');
            paneA.classList.add('is-dimmed');
            paneA.classList.toggle('is-mystery-sealed', isMysteryReveal);
          }
          if (paneB) {
            paneB.classList.remove('is-cueing-pane', 'is-dimmed');
            paneB.classList.add('is-playing-guess');
          }
          if (sealEl) sealEl.classList.toggle('hidden', !isMysteryReveal);
          if (banner) banner.classList.remove('is-mystery-finale');
          if (pillA) pillA.textContent = 'PLAYS LAST';
          if (pillB) pillB.textContent = '🔊 PLAYING NOW';
          if (lblB) {
            lblB.textContent = rawGuesses.length === 1 ? '🎤 YOUR GUESS' : '🎤 GUESS ' + (step.guessIndex + 1) + ' · ' + step.label;
          }
          if (speakerEl) {
            speakerEl.textContent = rawGuesses.length === 1
              ? '🔊 NOW PLAYING · YOUR GUESS'
              : '🔊 NOW PLAYING · GUESS ' + (step.guessIndex + 1) + ' OF ' + rawGuesses.length + ': ' + step.label;
          }
          if (txtEl) {
            txtEl.textContent = 'Comparative trial active — source Mystery Fart plays last.';
          }
        }

        var stepDone = false;
        function advanceNext() {
          if (stepDone || finished || gen !== state.revealGen) return;
          stepDone = true;
          if (state.revealFallbackTimerId) {
            clearTimeout(state.revealFallbackTimerId);
            state.revealFallbackTimerId = null;
          }
          if (step.kind === 'orig') {
            drawGuessWaveforms();
            if (state.revealSpecA) state.revealSpecA.setPlayhead(null);
          } else if (state.revealSpecB) {
            state.revealSpecB.setPlayhead(null);
          }

          var nextIdx = stepIdx + 1;
          if (banner) {
            banner.classList.remove('is-playing-live', 'is-mystery-finale');
            banner.classList.add('is-processing');
          }
          if (nextIdx >= steps.length) {
            updateLineupPills(steps.length, false);
            if (paneA) paneA.classList.remove('is-playing-orig', 'is-dimmed');
            if (paneB) paneB.classList.remove('is-dimmed');
            if (pillA) pillA.textContent = '✓ HEARD';
            if (speakerEl) speakerEl.textContent = '⚙️ ALL EXHIBITS CAPTURED';
            if (txtEl) txtEl.textContent = 'Compiling acoustic scores & launching Lab Analysis…';
            var endTimer = setTimeout(finishReveal, settleMs);
            state.revealStepTimers.push(endTimer);
            return;
          }

          updateLineupPills(nextIdx, true);
          if (step.kind === 'guess' && pillB) pillB.textContent = '✓ LOGGED';
          if (speakerEl) speakerEl.textContent = '⚙️ PROCESSING ' + step.label.toUpperCase() + '…';
          if (txtEl) txtEl.textContent = 'Logging pitch, envelope & resonance before next exhibit…';
          var holdT = setTimeout(function () {
            cueNextStep(nextIdx);
          }, postClipHoldMs);
          state.revealStepTimers.push(holdT);
        }

        var snd = step.sound;
        var clipMs = Math.round(((snd && snd.samples ? snd.samples.length : 0) / ((snd && snd.sampleRate) || 44100)) * 1000);
        var fallbackMs = isFastTest ? 35 : Math.min(9500, Math.max(850, clipMs + 650));
        state.revealFallbackTimerId = setTimeout(advanceNext, fallbackMs);

        try {
          var playRes = TootApp.Audio.playSound(snd.samples, snd.sampleRate || 44100, {
            channel: 'guess_reveal',
            onProgress: function (p) {
              if (finished || gen !== state.revealGen) return;
              if (step.kind === 'orig') {
                if ($('guess-target-wave')) {
                  drawStaticWaveform($('guess-target-wave'), snd.samples, {
                    fallbackW: 480,
                    fallbackH: 46,
                    barWidth: 2,
                    gap: 1.5,
                    colorA: '#134e38',
                    colorB: '#1f7a53',
                    activeColor: '#092b1e',
                    inactiveColor: 'rgba(20, 90, 65, 0.25)',
                    lineColor: 'rgba(46, 72, 58, 0.26)',
                    cursorColor: '#0e3f2d',
                    progress: p
                  });
                }
                if (state.revealSpecA) state.revealSpecA.setPlayhead(p);
              } else if (state.revealSpecB) {
                state.revealSpecB.setPlayhead(p);
              }
            },
            onEnded: advanceNext
          });
          if (playRes && typeof playRes.catch === 'function') {
            playRes.catch(function () {
              var errT = setTimeout(advanceNext, isFastTest ? 10 : 500);
              state.revealStepTimers.push(errT);
            });
          }
        } catch (err) {
          var catchT = setTimeout(advanceNext, isFastTest ? 10 : 500);
          state.revealStepTimers.push(catchT);
        }
      }

      state.revealTimerId = setTimeout(function () {
        state.revealTimerId = null;
        startStepPlayback(0);
      }, introWaitMs);
    });
  }

  function addAnotherGuesser() {
    if (!state.pendingGuess) {
      showToast('Record a guess first before adding another player.', true);
      return null;
    }
    var defaultLabel = 'Guesser ' + (state.sessionGuesses.length + 1);
    var nameEl = $('guess-name-input');
    var typed = (nameEl && nameEl.value ? nameEl.value : '').trim();
    var entry = Object.assign({}, state.pendingGuess, { name: typed || defaultLabel });
    state.sessionGuesses.push(entry);
    state.pendingGuess = null;
    if (nameEl) nameEl.value = '';
    renderGuessView();
    showToast(entry.name + ' locked! Ready for Guesser ' + (state.sessionGuesses.length + 1) + '.');
    return entry;
  }

  function buildComparisonChipMetrics(targetSound, attemptSound, res, opts) {
    opts = opts || {};
    var fA = targetSound.features || TootApp.DSP.extractFeatures(targetSound.samples, targetSound.sampleRate);
    var fB = attemptSound.features || TootApp.DSP.extractFeatures(attemptSound.samples, attemptSound.sampleRate);
    var bpA = fA.bandProfile || [0.25, 0.25, 0.25, 0.25];
    var bpB = fB.bandProfile || [0.25, 0.25, 0.25, 0.25];
    var subDiff = Math.abs((bpA[0] || 0.25) - (bpB[0] || 0.25));
    var lowMidDiff = Math.abs((bpA[1] || 0.25) - (bpB[1] || 0.25));
    var crestDiff = Math.abs((fA.crestFactorDb || 8) - (fB.crestFactorDb || 8));
    var thunder = Math.round(Math.max(0, Math.min(100, ((1 - Math.min(1, subDiff * 2.2)) * 45 + (1 - Math.min(1, lowMidDiff * 1.8)) * 25 + (1 - Math.min(1, crestDiff / 14)) * 30) * 0.72 + (res.envelopeScore || 50) * 0.28)));
    var tBd = (res.breakdown && res.breakdown.timbre) || {};
    var oBd = (res.breakdown && res.breakdown.overall) || {};
    var mlSim = Math.round(Math.max(0, Math.min(100, (tBd.mfccMeanScore || 0.5) * 34 + (tBd.mfccMacroScore || 0.5) * 28 + (tBd.gridCorr || 0.5) * 20 + (oBd.coreIdentity || 0.5) * 18)));
    var eBd = (res.breakdown && res.breakdown.envelope) || {};
    var timingScore = Math.round(Math.max(0, Math.min(100, (eBd.lagScore || res.envelopeScore || 50) * (eBd.lagScore <= 1 ? 100 : 1))));
    var skipAuth = Boolean(opts.skipAuth);
    var authA = !skipAuth && TootLabs.Fartnalysis && typeof TootLabs.Fartnalysis.computeAuthenticityAnalysis === 'function' ? TootLabs.Fartnalysis.computeAuthenticityAnalysis(targetSound) : null;
    var authB = !skipAuth && TootLabs.Fartnalysis && typeof TootLabs.Fartnalysis.computeAuthenticityAnalysis === 'function' ? TootLabs.Fartnalysis.computeAuthenticityAnalysis(attemptSound) : null;
    return {
      overall: Math.round(TootLabs.Store.computeExactScore(res)),
      timing: timingScore,
      duration: Math.round(res.durationScore || 0),
      pressure: Math.round(res.envelopeScore || 0),
      resonance: Math.round(res.timbreScore || 0),
      thunder: thunder,
      authA: authA ? authA.authenticityScore : null,
      authB: authB ? authB.authenticityScore : null,
      ml: mlSim
    };
  }

  function analyzeAndShowResults(target, rawGuesses, subtitleLabel) {
    if (!target || !rawGuesses || rawGuesses.length === 0) {
      showToast('Record at least one guess first.', true);
      return Promise.resolve([]);
    }

    var featA = target.features || TootApp.DSP.extractFeatures(target.samples, target.sampleRate);
    target.features = featA;

    var outcomes = [];
    var chain = Promise.resolve();
    rawGuesses.forEach(function (g, idx) {
      chain = chain.then(function () {
        var featB = g.features || TootApp.DSP.extractFeatures(g.samples, g.sampleRate);
        g.features = featB;
        var res = TootApp.DSP.compareSounds(featA, featB);
        var gName = String(g.name || '').trim() || ('Guesser ' + (idx + 1));
        return TootLabs.Store.recordChallengeResult(target, g, res, { guesserName: gName }).then(function (out) {
          outcomes.push(
            Object.assign({}, out, {
              targetSound: target,
              metricsSummary: buildComparisonChipMetrics(target, g, res)
            })
          );
        });
      });
    });

    return chain.then(function () {
      outcomes.sort(function (a, b) {
        return (b.exactScore || 0) - (a.exactScore || 0);
      });
      for (var i = outcomes.length - 1; i >= 0; i--) {
        state.guessAttempts.unshift(outcomes[i].attempt);
      }
      upsertAttemptsIntoCache(outcomes.map(function (o) { return o.attempt; }));
      state.lastSessionResults = outcomes;
      state.lastOutcome = outcomes[0];
      state.guessTargetId = target.id;
      state.guessRevealed = true;
      state.fnSampleId = target.id;
      state.fnAttemptId = outcomes[0].attempt.id;

      renderHomeView();
      if (state.view === 'vault') renderVaultView();

      runAnalysisSequence(
        {
          context: 'comparison',
          isSolo: outcomes.length === 1,
          sample: target,
          title: 'ANALYZING RESULTS',
          subtitle: subtitleLabel || ('Comparing ' + outcomes.length + (outcomes.length === 1 ? ' guess' : ' guesses') + ' against ' + getSampleName(target))
        },
        function () {
          state.guessSubMode = 'standard';
          state.guessRevealed = true;
          var stdPane = $('guess-standard-pane');
          var blindPane = $('guess-blind-pane');
          var qfPane = $('guess-quickfire-pane');
          if (stdPane) stdPane.classList.remove('hidden');
          if (blindPane) blindPane.classList.add('hidden');
          if (qfPane) qfPane.classList.add('hidden');
          showView('guess');
          renderGuessView();
          renderInlineResults(state.lastOutcome, state.lastSessionResults);
        }
      );
      return outcomes;
    });
  }

  function analyzeSessionGuesses(opts) {
    opts = opts || {};
    var target = getSampleById(state.guessTargetId);
    if (!target) {
      showToast('Select a fart first.', true);
      return Promise.resolve([]);
    }
    if (state.pendingGuess) {
      var nameEl = $('guess-name-input');
      var fallbackName = 'Player ' + (state.sessionGuesses.length + 1);
      var customName = (nameEl && nameEl.value ? nameEl.value : '').trim();
      state.sessionGuesses.push(Object.assign({}, state.pendingGuess, { name: customName || fallbackName, isDefaultName: !customName }));
      state.pendingGuess = null;
      if (nameEl) nameEl.value = '';
    }
    if (state.sessionGuesses.length === 0) {
      showToast('Record at least one guess first.', true);
      return Promise.resolve([]);
    }
    var batch = state.sessionGuesses.slice();
    if (batch.length === 1 && batch[0] && (batch[0].isDefaultName || batch[0].name === 'Player 1')) {
      batch[0].name = 'Your Guess';
    }
    state.sessionGuesses = [];
    renderGuessView();
    function dispatchBatch(useTarget) {
      if (!opts.immediate) {
        return triggerRevealAndAnalyze(useTarget, batch, state.guessMode, null, opts.delayMs);
      }
      return analyzeAndShowResults(useTarget, batch);
    }
    if (!target.samples || target.samples.length === 0) {
      return ensureTargetReady(target)
        .then(function (readyTarget) {
          return dispatchBatch(readyTarget || target);
        })
        .catch(function (err) {
          showToast((err && err.message) || 'Could not load Mystery Fart audio.', true);
          return [];
        });
    }
    return dispatchBatch(target);
  }

  function startBlindGuessCapture() {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (state.recordingKind === 'blind_guess' && TootApp.Audio.isRecording() && state.activeRecStopper) {
        state.activeRecStopper();
      }
      return;
    }
    resetMicTestUI('Ready');
    state.recordingKind = 'blind_guess';
    var btn = $('btn-blind-rec-guess');
    var statusEl = $('blind-guess-status');
    var nameInput = $('blind-name-input');
    if (btn) btn.textContent = '⏹ Stop Blind Guess';
    if (statusEl) statusEl.textContent = 'Recording blind guess… tap Stop to save.';

    state.activeRecStopper = function () {
      TootApp.Audio.stopRecording().then(finalizeBlindGuess);
    };

    function finalizeBlindGuess(res) {
      state.activeRecStopper = null;
      state.recordingKind = null;
      if (btn) btn.textContent = '🎤 RECORD GUESS';
      if (!res || !res.ok) {
        if (statusEl) statusEl.textContent = (res && res.error) || 'Could not capture blind guess.';
        showToast((res && res.error) || 'Could not capture blind guess.', true);
        return;
      }
      var sr = res.sampleRate || 44100;
      var defName = 'Guesser ' + (state.blindGuesses.length + 1);
      var nm = (nameInput && nameInput.value ? nameInput.value.trim() : '') || defName;
      var preBreathB = (res.clipInfo && res.clipInfo.preOnsetBreath) || null;
      var blindFeat = TootApp.DSP.extractFeatures(res.clippedSamples, sr);
      if (blindFeat && preBreathB) blindFeat.preOnsetBreath = preBreathB;
      state.blindGuesses.push({
        id: 'blind_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: nm,
        sampleRate: sr,
        samples: res.clippedSamples,
        rawSamples: res.rawSamples || res.clippedSamples,
        clipInfo: res.clipInfo,
        preOnsetBreath: preBreathB,
        features: blindFeat
      });
      if (nameInput) nameInput.value = '';
      if (statusEl) statusEl.textContent = nm + ' recorded! Record another guess or capture Original Fart below.';
      renderBlindPane();
    }

    TootApp.Audio.startRecording({
      maxDurationSec: 7,
      onAutoStop: finalizeBlindGuess
    }).catch(function (err) {
      state.activeRecStopper = null;
      state.recordingKind = null;
      if (btn) btn.textContent = '🎤 RECORD GUESS';
      showToast((err && err.message) || 'Microphone unavailable.', true);
    });
  }

  function startBlindOriginalCapture() {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (state.recordingKind === 'blind_orig' && TootApp.Audio.isRecording() && state.activeRecStopper) {
        state.activeRecStopper();
      }
      return;
    }
    resetMicTestUI('Ready');
    state.recordingKind = 'blind_orig';
    var btn = $('btn-blind-rec-orig');
    var statusEl = $('blind-orig-status');
    var useAuto = state.recordMode === 'auto' && typeof TootApp.Audio.startAutoDetect === 'function';
    if (btn) btn.textContent = useAuto ? '⏹ Stop & Save Original' : '⏹ Stop Original Fart';
    if (statusEl) statusEl.textContent = useAuto ? 'Auto Detect armed for Original Fart…' : 'Recording Original Fart…';

    function finalizeBlindOrig(res) {
      state.activeRecStopper = null;
      state.recordingKind = null;
      if (btn) btn.textContent = '● RECORD ORIGINAL FART';
      if (!res || !res.ok) {
        if (statusEl) statusEl.textContent = (res && res.error) || 'Could not capture original fart.';
        showToast((res && res.error) || 'Could not capture original fart.', true);
        return;
      }
      TootLabs.Store.saveNewSpecimen(res).then(function (saved) {
        state.samples.unshift(saved);
        state.blindOriginal = saved;
        renderHomeView();
        if (state.view === 'vault') renderVaultView();
        renderBlindPane();
        showToast('Original Fart "' + getSampleName(saved) + '" saved! Tap ANALYZE RESULTS.');
      });
    }

    if (useAuto) {
      state.activeRecStopper = function () {
        TootApp.Audio.stopAutoDetect(false).then(function (res) {
          if (res && res.ok && TootLabs.AudioFx) TootLabs.AudioFx.playAutoDetectStopBeep();
          finalizeBlindOrig(res);
        });
      };
      TootApp.Audio.startAutoDetect({
        settleSec: 0.24,
        onStarted: function () {
          if (TootLabs.AudioFx) TootLabs.AudioFx.playAutoDetectStartBeep();
        },
        onRearmed: function (info) {
          if (statusEl) {
            statusEl.textContent = (info && info.rearmMessage) || 'Filtered non-fart sound — Sentry re-armed';
          }
        },
        onAutoStop: function (res) {
          if (TootLabs.AudioFx) TootLabs.AudioFx.playAutoDetectStopBeep();
          finalizeBlindOrig(res);
        }
      }).catch(function (err) {
        state.activeRecStopper = null;
        state.recordingKind = null;
        if (btn) btn.textContent = '● RECORD ORIGINAL FART';
        showToast((err && err.message) || 'Microphone unavailable.', true);
      });
      return;
    }

    state.activeRecStopper = function () {
      TootApp.Audio.stopRecording().then(finalizeBlindOrig);
    };
    TootApp.Audio.startRecording({
      maxDurationSec: 7,
      onAutoStop: finalizeBlindOrig
    }).catch(function (err) {
      state.activeRecStopper = null;
      state.recordingKind = null;
      if (btn) btn.textContent = '● RECORD ORIGINAL FART';
      showToast((err && err.message) || 'Microphone unavailable.', true);
    });
  }

  function analyzeBlindSession() {
    if (!state.blindOriginal || state.blindGuesses.length === 0) {
      showToast('Record at least one blind guess AND the original fart first.', true);
      return Promise.resolve([]);
    }
    var orig = state.blindOriginal;
    var batch = state.blindGuesses.slice();
    state.blindGuesses = [];
    state.blindOriginal = null;
    renderBlindPane();
    return analyzeAndShowResults(orig, batch, 'Blind Prediction Mode · Comparing guesses vs ' + getSampleName(orig));
  }

  /* ==================== MATCH RESULT SCREEN (LEADERBOARD = STAR OF THE GAME) ==================== */
  function placeLabel(idx) {
    if (idx === 0) return '🏆 1st Place';
    if (idx === 1) return '🥈 2nd Place';
    if (idx === 2) return '🥉 3rd Place';
    return (idx + 1) + 'th Place';
  }

  function pickSoloChipBadge(score) {
    if (score >= 95) return '🏛️ Archive-Grade Reproduction · ' + score.toFixed(1) + '%';
    if (score >= 85) return '🎯 Exceptional Fidelity · ' + score.toFixed(1) + '%';
    if (score >= 70) return '🔬 Research-Grade Alignment · ' + score.toFixed(1) + '%';
    if (score >= 50) return '📊 Partial Acoustic Convergence · ' + score.toFixed(1) + '%';
    if (score >= 25) return '📈 Notable Spectral Variance · ' + score.toFixed(1) + '%';
    return '📋 Significant Acoustic Divergence · ' + score.toFixed(1) + '%';
  }

  function pickSoloRowLabel(score) {
    if (score >= 95) return '🏛️ Archive-Grade Benchmark';
    if (score >= 85) return '🎯 Exceptional Fidelity';
    if (score >= 70) return '🔬 Research Grade';
    if (score >= 50) return '📊 Partial Convergence';
    if (score >= 25) return '📈 Notable Spectral Variance';
    return '📋 Significant Acoustic Divergence';
  }

  function pickSoloSubQuip(score) {
    if (score >= 90) return 'Near-Identical Profile';
    if (score >= 75) return 'Favourable Alignment';
    if (score >= 55) return 'Moderate Convergence';
    if (score >= 30) return 'Measurable Variance';
    return 'Divergent Spectral Band';
  }

  function renderInlineResults(outcome, sessionResults) {
    if (!outcome) return;
    clearResultAnimations();

    var resultsList = Array.isArray(sessionResults) && sessionResults.length > 0 ? sessionResults : [outcome];
    var isSoloRound = resultsList.length === 1;
    var isMimic = state.guessMode === 'mimic';
    var target = outcome.targetSound;
    var exact = outcome.exactScore;
    var rank = outcome.rank;
    var reward = outcome.reward;

    var stageEl = $('guess-inline-results');
    if (stageEl && stageEl.classList) {
      stageEl.classList.remove('hidden', 'reveal-enter');
      try { void stageEl.offsetWidth; } catch (e) {}
      stageEl.classList.add('reveal-enter');
    }

    var headingEl = $('res-heading-eyebrow');
    if (headingEl) {
      headingEl.textContent = isSoloRound
        ? (isMimic ? 'REPRODUCTION FIDELITY ASSESSMENT · MIMIC' : 'REPRODUCTION FIDELITY ASSESSMENT')
        : (isMimic ? 'OFFICIAL FINDINGS · MIMIC PARTICIPANT RANKINGS' : 'OFFICIAL FINDINGS · PARTICIPANT RANKINGS');
    }

    $('res-sample-context').textContent = isSoloRound
      ? ('MYSTERY FART: ' + getSampleName(target).toUpperCase() + ' · COMPARATIVE ASSESSMENT')
      : ('MYSTERY FART: ' + getSampleName(target).toUpperCase() + ' · ' + resultsList.length + ' PARTICIPANTS');

    var winChip = $('res-winner-chip');
    if (winChip) {
      if (isSoloRound) {
        winChip.classList.add('hidden');
        winChip.textContent = '';
      } else {
        winChip.classList.remove('hidden');
        winChip.textContent = '🏆 Winner: ' + (outcome.attempt.name || 'Player 1') + ' · ' + exact.toFixed(1) + '%';
      }
    }

    var lbEye = $('res-lb-eyebrow');
    if (lbEye) {
      lbEye.textContent = isSoloRound ? 'OFFICIAL FINDINGS · ASSESSMENT SCORECARD' : '🏆 OFFICIAL FINDINGS · PARTICIPANT RANKINGS';
    }
    var verdEye = $('res-verdict-eyebrow');
    if (verdEye) {
      verdEye.textContent = isSoloRound ? 'LABORATORY VERDICT · COMPARATIVE ASSESSMENT' : 'LABORATORY VERDICT · LEADING REPRODUCTION';
    }
    var repBtn = $('btn-res-replay');
    if (repBtn) {
      repBtn.textContent = isSoloRound ? '▶ Play Guess → Mystery Fart' : '▶ Play Winner → Mystery Fart';
    }

    // Hero Leaderboard / Tidy 3-Row Full-Width Scorecard
    var lbListEl = $('res-leaderboard-list');
    if (lbListEl) {
      lbListEl.innerHTML = resultsList
        .map(function (item, idx) {
          var s = typeof item.exactScore === 'number' ? item.exactScore : 0;
          var rk = item.rank || TootLabs.Store.getRankForScore(s);
          var ms = item.metricsSummary || {};
          var isWinner = !isSoloRound && idx === 0;
          var rowClass = isWinner ? ' first-place' : isSoloRound ? ' is-solo' : '';
          var identHtml = isSoloRound
            ? '<span class="labs-res-guesser-name">' + esc(item.attempt.name) + '</span>' +
              '<span class="labs-solo-quip-badge">' + esc(pickSoloRowLabel(s)) + '</span>'
            : '<span class="labs-res-place">' + placeLabel(idx) + '</span>' +
              '<span class="labs-res-guesser-name">' + esc(item.attempt.name) + '</span>' +
              (isWinner ? '<span class="labs-closest-badge">🏆 Winner · Closest Match</span>' : '');
          return (
            '<div class="labs-res-lb-row' + rowClass + '">' +
            '  <div class="labs-res-lb-top">' +
            '    <div class="labs-res-lb-ident">' + identHtml + '</div>' +
            '    <span class="labs-res-lb-score" style="color:' + rk.color + '">' + s.toFixed(1) + '%</span>' +
            '  </div>' +
            '  <div class="labs-res-mini-metrics">' +
            '    <span><small>Overall</small> <b>' + (ms.overall != null ? ms.overall : Math.round(s)) + '%</b></span>' +
            '    <span><small>Timing</small> <b>' + (ms.timing != null ? ms.timing : '—') + '%</b></span>' +
            '    <span><small>Duration</small> <b>' + (ms.duration != null ? ms.duration : '—') + '%</b></span>' +
            '    <span><small>Pressure</small> <b>' + (ms.pressure != null ? ms.pressure : '—') + '%</b></span>' +
            '    <span><small>Resonance</small> <b>' + (ms.resonance != null ? ms.resonance : '—') + '%</b></span>' +
            '    <span><small>Thunder</small> <b>' + (ms.thunder != null ? ms.thunder : '—') + '%</b></span>' +
            (ms.authB != null ? '<span><small>Auth</small> <b>' + ms.authB + '%</b></span>' : '') +
            '    <span><small>ML</small> <b>' + (ms.ml != null ? ms.ml : '—') + '%</b></span>' +
            '  </div>' +
            '  <div class="labs-res-lb-actions">' +
            '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-rlb-play="' + idx + '">▶ Play</button>' +
            '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-rlb-single="' + idx + '">🧪 Analysis</button>' +
            '    <button type="button" class="labs-btn labs-btn-blue labs-btn-sm" data-rlb-cmp="' + idx + '">🔬 Compare</button>' +
            '  </div>' +
            '</div>'
          );
        })
        .join('');

      lbListEl.querySelectorAll('[data-rlb-play]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = resultsList[parseInt(this.getAttribute('data-rlb-play'), 10)];
          if (row && row.attempt) {
            try {
              var pr = TootApp.Audio.playSound(row.attempt.samples, row.attempt.sampleRate, { channel: 'res_lb' });
              if (pr && typeof pr.catch === 'function') pr.catch(function () {});
            } catch (e) {}
          }
        });
      });
      lbListEl.querySelectorAll('[data-rlb-single]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = resultsList[parseInt(this.getAttribute('data-rlb-single'), 10)];
          if (row && row.attempt) openFartnalysis('guess', target.id, row.attempt.id);
        });
      });
      lbListEl.querySelectorAll('[data-rlb-cmp]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = resultsList[parseInt(this.getAttribute('data-rlb-cmp'), 10)];
          if (row && row.attempt) openFartnalysis('comparison', target.id, row.attempt.id);
        });
      });
    }

    // Side-by-Side 3D Spectrum Plot (Original vs Best/Your Guess)
    var DSP = root.TootApp && root.TootApp.DSP;
    var Spectrogram3D = root.TootApp && root.TootApp.Spectrogram3D;
    if (target && !target.features && DSP && target.samples) {
      target.features = DSP.extractFeatures(target.samples, target.sampleRate || 44100);
    }
    if (outcome.attempt && !outcome.attempt.features && DSP && outcome.attempt.samples) {
      outcome.attempt.features = DSP.extractFeatures(outcome.attempt.samples, outcome.attempt.sampleRate || 44100);
    }
    var origName = getSampleName(target);
    var challengerName = isSoloRound ? 'Your Guess' : (outcome.attempt.name || 'Winner');
    if ($('res-spec3d-b-title')) {
      $('res-spec3d-b-title').textContent = '🎯 Mystery Fart (' + origName + ') vs ' + challengerName;
    }
    if ($('res-spec3d-lbl-a')) {
      $('res-spec3d-lbl-a').textContent = '🎯 MYSTERY · ' + origName;
    }
    if ($('res-spec3d-lbl-b')) {
      $('res-spec3d-lbl-b').textContent = isSoloRound
        ? '🎤 GUESS · ' + exact.toFixed(1) + '%'
        : '🏆 ' + challengerName.slice(0, 10) + ' · ' + exact.toFixed(1) + '%';
    }
    if ($('btn-res-play-orig')) {
      $('btn-res-play-orig').textContent = '🎯 Play Mystery Fart';
    }
    if ($('btn-res-play-guess')) {
      $('btn-res-play-guess').textContent = isSoloRound ? '🎤 Play Your Guess' : ('🏆 Play ' + challengerName.slice(0, 12));
    }

    var presetBtns = document.querySelectorAll('#res-spec3d-bay [data-res-preset]');
    for (var pi = 0; pi < presetBtns.length; pi++) {
      presetBtns[pi].classList.toggle('active', presetBtns[pi].getAttribute('data-res-preset') === '3d');
    }

    if (Spectrogram3D) {
      var cvsA = $('res-spec3d-orig');
      var cvsB = $('res-spec3d-guess');
      var specA = target && target.features ? target.features.spectrogram : null;
      var specB = outcome.attempt && outcome.attempt.features ? outcome.attempt.features.spectrogram : null;
      if (cvsA && specA) {
        state.inlineSpecA = new Spectrogram3D(cvsA, { spectrogram: specA, colormap: 'plasma' });
      }
      if (cvsB && specB) {
        state.inlineSpecB = new Spectrogram3D(cvsB, { spectrogram: specB, colormap: 'magma' });
      }
      if (state.inlineSpecA && state.inlineSpecB && typeof state.inlineSpecA.linkPartner === 'function') {
        state.inlineSpecA.linkPartner(state.inlineSpecB);
      }
      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(function () {
          if (state.inlineSpecA) state.inlineSpecA.resize();
          if (state.inlineSpecB) state.inlineSpecB.resize();
        });
      }
    }

    var pbEl = $('res-pb-pill');
    pbEl.classList.add('hidden');

    var rewardStageEl = $('res-reward-stage');
    if (rewardStageEl && rewardStageEl.classList) rewardStageEl.classList.add('labs-reveal-pending');

    var ringFg = $('res-ring-fg');
    var radius = 90;
    var circ = 2 * Math.PI * radius;
    ringFg.style.transition = 'none';
    ringFg.style.strokeDasharray = circ.toFixed(2);
    ringFg.style.strokeDashoffset = circ.toFixed(2);
    try { void ringFg.getBoundingClientRect(); } catch (e) {}

    var targetOffset = circ * (1 - Math.max(0, Math.min(100, exact)) / 100);
    ringFg.style.transition = 'stroke-dashoffset 1.35s cubic-bezier(0.22, 1, 0.36, 1)';
    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        ringFg.style.strokeDashoffset = targetOffset.toFixed(2);
      });
    } else {
      ringFg.style.strokeDashoffset = targetOffset.toFixed(2);
    }

    var scoreValEl = $('res-score-value');
    scoreValEl.textContent = '0.0%';
    var animStart = performance.now();
    var durationMs = 1320;
    function tickCounter(now) {
      var t = Math.min(1, (now - animStart) / durationMs);
      var eased = 1 - Math.pow(1 - t, 3);
      scoreValEl.textContent = (exact * eased).toFixed(1) + '%';
      if (t < 1) {
        state.resultCounterRaf = requestAnimationFrame(tickCounter);
      } else {
        scoreValEl.textContent = exact.toFixed(1) + '%';
        state.resultCounterRaf = null;
      }
    }
    state.resultCounterRaf = requestAnimationFrame(tickCounter);

    var rankBadge = $('res-rank-badge');
    rankBadge.textContent = rank.title;
    rankBadge.style.borderColor = rank.color;
    rankBadge.style.color = rank.color;
    $('res-rank-desc').textContent = isSoloRound ? rank.desc : ((outcome.attempt.name || 'Winner') + ' — ' + rank.desc);

    var deltaNoteEl = $('res-delta-note');
    if (resultsList.length > 1) {
      deltaNoteEl.classList.remove('hidden', 'delta-neutral');
      deltaNoteEl.textContent =
        '🏆 ' + outcome.attempt.name + ' wins the ' + resultsList.length + '-participant round at ' + exact.toFixed(1) + '% Laboratory Match Confidence.';
    } else if (typeof outcome.previousScore === 'number') {
      var delta = Math.round((exact - outcome.previousScore) * 10) / 10;
      deltaNoteEl.classList.remove('hidden', 'delta-neutral');
      if (delta >= 0) {
        deltaNoteEl.textContent =
          'Observed Variance: ' + outcome.previousScore.toFixed(1) + '% → ' + exact.toFixed(1) + '% (+' + delta.toFixed(1) + '%)';
      } else {
        deltaNoteEl.classList.add('delta-neutral');
        deltaNoteEl.textContent =
          'Observed Variance: ' + outcome.previousScore.toFixed(1) + '% → ' + exact.toFixed(1) + '% (' + delta.toFixed(1) + '%)';
      }
    } else {
      deltaNoteEl.classList.remove('hidden');
      deltaNoteEl.classList.add('delta-neutral');
      deltaNoteEl.textContent = 'Baseline assessment logged — record an additional trial above to evaluate variance.';
    }

    $('res-verdict-text').textContent = outcome.verdict;

    var starsRow = $('res-stars-row');
    var bellLabel = $('res-bell-label');
    var legTitleEl = $('res-legendary-title');
    starsRow.innerHTML = '';
    bellLabel.textContent = 'Calibrating Laboratory Match Confidence…';
    legTitleEl.classList.add('hidden');
    legTitleEl.textContent = '';

    state.resultTimers.push(
      setTimeout(function () {
        if (state.view !== 'guess') return;
        if (rewardStageEl && rewardStageEl.classList) rewardStageEl.classList.remove('labs-reveal-pending');
        bellLabel.textContent = 'Assigning Scientific Assessment…';
        if (outcome.isPersonalBest) {
          pbEl.classList.remove('hidden');
        }
      }, 1360)
    );

    var startDelay = 1750;
    var stepMs = 480;
    for (var sIdx = 0; sIdx < reward.stars; sIdx++) {
      (function (starIndex) {
        state.resultTimers.push(
          setTimeout(function () {
            if (state.view !== 'guess') return;
            var span = document.createElement('span');
            span.className = 'labs-reward-star';
            span.textContent = '⭐';
            starsRow.appendChild(span);

            var curCount = starIndex + 1;
            bellLabel.textContent =
              curCount < reward.stars
                ? curCount + (curCount === 1 ? ' Star…' : ' Stars…')
                : reward.stars + (reward.stars === 1 ? ' Star · ' : ' Stars · ') + reward.label;

            if (TootLabs.AudioFx) TootLabs.AudioFx.playBell(starIndex);
          }, startDelay + starIndex * stepMs)
        );
      })(sIdx);
    }

    if (reward.stars === 5) {
      var lastStarAt = startDelay + (reward.stars - 1) * stepMs;
      var finaleAt = lastStarAt + 680;
      state.resultTimers.push(
        setTimeout(function () {
          if (state.view !== 'guess') return;
          if (TootLabs.AudioFx) {
            TootLabs.AudioFx.playLegendaryFinale();
            state.confettiHandle = TootLabs.AudioFx.launchConfetti($('result-confetti-canvas'));
          }
          var starEls = starsRow.querySelectorAll('.labs-reward-star');
          for (var k = 0; k < starEls.length; k++) starEls[k].classList.add('legendary-glow');
          legTitleEl.textContent = outcome.legendaryTitle || TootLabs.Store.pickLegendaryTitle();
          legTitleEl.classList.remove('hidden');
        }, finaleAt)
      );
    }
  }

  /* ==================== AREA 3: FARTNALYSIS (4 MODES) ==================== */
  function hashWithSeed(seed, str) {
    var s = String(seed || 0) + '|' + String(str || '');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function getMegamixSourceBucket() {
    var MAX_DEF = (TootLabs.Store && TootLabs.Store.MAX_DEFAULT_MEGAMIX) || 20;
    var recorded = [];
    var defaultsAll = [];
    for (var i = 0; i < state.samples.length; i++) {
      var s = state.samples[i];
      if (!s) continue;
      if (s.isBuiltIn) defaultsAll.push(s);
      else recorded.push(s);
    }
    var guesses = Array.isArray(state.allAttemptsCache) ? state.allAttemptsCache.slice() : [];
    var defaultsCapped = defaultsAll.length > MAX_DEF;
    var sampledDefaults = defaultsAll;
    if (defaultsCapped) {
      if (state.groupShuffleSeed > 0) {
        sampledDefaults = defaultsAll.slice().sort(function (a, b) {
          return hashWithSeed(state.groupShuffleSeed, a.id || a.name) - hashWithSeed(state.groupShuffleSeed, b.id || b.name);
        });
      }
      sampledDefaults = sampledDefaults.slice(0, MAX_DEF);
    }

    var src = state.groupSource || 'all';
    if (src !== 'recorded' && src !== 'guesses' && src !== 'defaults') src = 'all';

    var items =
      src === 'recorded'
        ? recorded.slice()
        : src === 'guesses'
        ? guesses.slice()
        : src === 'defaults'
        ? sampledDefaults.slice()
        : recorded.concat(guesses, sampledDefaults);

    return {
      source: src,
      items: items,
      cap: MAX_DEF,
      defaultsCapped: defaultsCapped,
      totalDefaults: defaultsAll.length,
      counts: {
        all: recorded.length + guesses.length + sampledDefaults.length,
        recorded: recorded.length,
        guesses: guesses.length,
        defaults: defaultsAll.length,
        defaultsIncluded: sampledDefaults.length
      }
    };
  }

  function syncGroupFilterBar(bucket) {
    var bar = $('fn-group-filter-bar');
    if (!bar) return;
    var isGroup = state.fnMode === 'group';
    bar.classList.toggle('hidden', !isGroup);
    if (!isGroup || !bucket) return;

    var btns = bar.querySelectorAll('[data-group-source]');
    for (var i = 0; i < btns.length; i++) {
      var key = btns[i].getAttribute('data-group-source');
      btns[i].classList.toggle('active', key === bucket.source);
      if (key === 'all') btns[i].textContent = 'All (' + bucket.counts.all + ')';
      else if (key === 'recorded') btns[i].textContent = 'Field Recordings (' + bucket.counts.recorded + ')';
      else if (key === 'guesses') btns[i].textContent = 'Comparative Recordings (' + bucket.counts.guesses + ')';
      else if (key === 'defaults') {
        btns[i].textContent = bucket.defaultsCapped
          ? 'Archive Reference Pack (' + bucket.counts.defaultsIncluded + '/' + bucket.totalDefaults + ')'
          : 'Archive Reference Pack (' + bucket.counts.defaults + ')';
      }
    }

    var capNote = $('fn-group-cap-note');
    if (capNote) {
      if (bucket.defaultsCapped && (bucket.source === 'all' || bucket.source === 'defaults')) {
        capNote.textContent =
          'Archive Reference Pack capped at ' + bucket.cap + ' of ' + bucket.totalDefaults + ' specimens per synthesis (' + bucket.items.length + ' total tracks).';
      } else {
        capNote.textContent = 'Synthesizing ' + bucket.items.length + ' archived specimen' + (bucket.items.length === 1 ? '' : 's') + ' from selected source.';
      }
    }

    var shufBtn = $('btn-group-shuffle-defaults');
    if (shufBtn) {
      shufBtn.classList.toggle('hidden', !(bucket.defaultsCapped && (bucket.source === 'all' || bucket.source === 'defaults')));
    }
  }

  function setGroupSource(sourceKey) {
    if (sourceKey === 'recorded' || sourceKey === 'guesses' || sourceKey === 'defaults' || sourceKey === 'all') {
      state.groupSource = sourceKey;
    } else {
      state.groupSource = 'all';
    }
    if (state.view === 'fartnalysis' && state.fnMode === 'group') {
      renderFartnalysisView();
    }
  }

  function sortAttemptsByScore(attempts) {
    return (attempts || []).slice().sort(function (a, b) {
      var diff = (b && b.exactScore ? b.exactScore : 0) - (a && a.exactScore ? a.exactScore : 0);
      if (Math.abs(diff) > 0.05) return diff;
      return (b && b.createdAt ? b.createdAt : 0) - (a && a.createdAt ? a.createdAt : 0);
    });
  }

  function openFartnalysis(mode, sampleId, attemptId) {
    var reqGen = ++state.fnOpenGen;
    if (mode) state.fnMode = mode;

    var resolvedSampleId = sampleId;
    if (!resolvedSampleId) {
      if (state.fnMode === 'comparison') {
        if (state.guessTargetId && getSampleById(state.guessTargetId)) {
          resolvedSampleId = state.guessTargetId;
        } else {
          var firstWithAtt = null;
          var allCache = state.allAttemptsCache || [];
          for (var ci = 0; ci < allCache.length; ci++) {
            if (allCache[ci] && allCache[ci].sampleId && getSampleById(allCache[ci].sampleId)) {
              firstWithAtt = allCache[ci].sampleId;
              break;
            }
          }
          resolvedSampleId = firstWithAtt || state.fnSampleId || (state.samples[0] && state.samples[0].id) || null;
        }
      } else {
        resolvedSampleId = state.fnSampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id) || null;
      }
    }
    state.fnSampleId = resolvedSampleId;

    showView('fartnalysis');

    if (state.fnMode === 'group') {
      if (state.attemptsCacheLoaded) {
        renderFartnalysisView();
        return Promise.resolve();
      }
      syncFartnalysisPickers();
      var grpMount = $('fn-dashboard-mount');
      if (grpMount) {
        grpMount.innerHTML =
          '<div class="labs-glass-card labs-empty-card"><h3>Loading Archive Specimens…</h3><p>Preparing multi-specimen anthology.</p></div>';
      }
      return refreshAllAttemptsCache(true)
        .then(function () {
          if (reqGen !== state.fnOpenGen || state.view !== 'fartnalysis') return;
          renderFartnalysisView();
        })
        .catch(function () {
          if (reqGen !== state.fnOpenGen || state.view !== 'fartnalysis') return;
          state.allAttemptsCache = [];
          renderFartnalysisView();
        });
    }

    if (!resolvedSampleId) {
      state.fnAttempts = [];
      state.fnAttemptId = null;
      if (state.attemptsCacheLoaded) {
        renderFartnalysisView();
        return Promise.resolve();
      }
      syncFartnalysisPickers();
      return refreshAllAttemptsCache(true).then(function () {
        if (reqGen !== state.fnOpenGen || state.view !== 'fartnalysis') return;
        renderFartnalysisView();
      });
    }

    var sample = getSampleById(resolvedSampleId);
    var hasAudio = Boolean(sample && sample.samples && sample.samples.length > 0);
    function applyAttemptsAndPick(list) {
      state.fnAttempts = list || [];
      if (attemptId) {
        state.fnAttemptId = attemptId;
      } else if (state.fnAttemptId && state.fnAttempts.some(function (a) { return a.id === state.fnAttemptId; })) {
        // keep current
      } else {
        var sorted = sortAttemptsByScore(state.fnAttempts);
        state.fnAttemptId = sorted[0] ? sorted[0].id : null;
      }
    }

    if (hasAudio && state.attemptsCacheLoaded) {
      applyAttemptsAndPick(getCachedAttemptsForSample(resolvedSampleId));
      renderFartnalysisView();
      return Promise.resolve();
    }

    if (state.fnController) {
      state.fnController.destroy();
      state.fnController = null;
    }
    if (state.attemptsCacheLoaded) {
      applyAttemptsAndPick(getCachedAttemptsForSample(resolvedSampleId));
    }
    syncFartnalysisPickers();
    var emptyEl = $('fn-empty-state');
    if (emptyEl) emptyEl.classList.add('hidden');
    var mountEl = $('fn-dashboard-mount');
    if (mountEl) {
      mountEl.innerHTML =
        '<div class="labs-glass-card labs-empty-card"><h3>Loading Specimen Telemetry…</h3><p>Decoding audio waveform for laboratory analysis.</p></div>';
    }

    return Promise.all([
      hasAudio ? Promise.resolve(sample) : ensureTargetReady(sample),
      state.attemptsCacheLoaded
        ? Promise.resolve(getCachedAttemptsForSample(resolvedSampleId))
        : TootLabs.Store.loadAttemptsForSample(resolvedSampleId),
      refreshAllAttemptsCache()
    ])
      .then(function (res) {
        if (reqGen !== state.fnOpenGen || state.view !== 'fartnalysis') return;
        applyAttemptsAndPick(res[1] || []);
        renderFartnalysisView();
      })
      .catch(function (err) {
        if (reqGen !== state.fnOpenGen || state.view !== 'fartnalysis') return;
        showToast((err && err.message) || 'Could not load specimen for analysis.', true);
      });
  }

  function buildTargetOptionsHtml(showGuessCounts, attemptsBySample) {
    var recorded = [];
    var defaults = [];
    for (var i = 0; i < state.samples.length; i++) {
      var s = state.samples[i];
      if (!s) continue;
      if (s.isBuiltIn) defaults.push(s);
      else recorded.push(s);
    }
    function renderOpt(s) {
      var label = getSampleName(s);
      if (showGuessCounts && attemptsBySample && attemptsBySample[s.id]) {
        var c = attemptsBySample[s.id];
        label += ' (' + c + (c === 1 ? ' comparison)' : ' comparisons)');
      }
      return '<option value="' + esc(s.id) + '">' + esc(label) + '</option>';
    }
    var parts = [];
    if (recorded.length > 0) {
      parts.push('<optgroup label="🎙️ Field Recordings">' + recorded.map(renderOpt).join('') + '</optgroup>');
    }
    if (defaults.length > 0) {
      parts.push('<optgroup label="📦 Archive Reference Pack">' + defaults.map(renderOpt).join('') + '</optgroup>');
    }
    return parts.join('');
  }

  function syncFartnalysisPickers() {
    var activeTabMode = state.fnMode === 'guess' ? 'original' : state.fnMode;
    var modeBtns = document.querySelectorAll('#fn-mode-tabs .labs-mode-tab');
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-fn-mode') === activeTabMode);
    }

    var pickersBar = $('fn-pickers-bar');
    var groupFilterBar = $('fn-group-filter-bar');
    var sampleSel = $('fn-sample-select');
    var sampleLbl = $('fn-sample-label');
    var guessField = $('fn-guess-field');
    var guessSel = $('fn-guess-select');
    var guessLb = $('fn-guess-leaderboard');
    var dateEl = $('fn-report-date');
    var tagEl = $('fn-specimen-tag');

    if (dateEl) {
      try {
        var now = new Date();
        var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        dateEl.textContent = months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
      } catch (e) {}
    }

    var envSideTab = document.querySelector('#fn-side-tabs .labs-fn-side-tab[data-fn-jump="environment"]');
    if (envSideTab) {
      envSideTab.classList.toggle('is-muted', state.fnMode === 'comparison' || state.fnMode === 'group');
    }

    if (state.fnMode === 'group') {
      pickersBar.classList.add('hidden');
      if (tagEl) tagEl.classList.add('hidden');
      if (guessLb) {
        guessLb.classList.add('hidden');
        guessLb.innerHTML = '';
      }
      return;
    }

    if (groupFilterBar) groupFilterBar.classList.add('hidden');
    pickersBar.classList.remove('hidden');

    var attemptsBySample = {};
    var allAtts = Array.isArray(state.allAttemptsCache) ? state.allAttemptsCache : [];
    for (var ai = 0; ai < allAtts.length; ai++) {
      var attItem = allAtts[ai];
      if (attItem && attItem.sampleId) {
        attemptsBySample[attItem.sampleId] = (attemptsBySample[attItem.sampleId] || 0) + 1;
      }
    }
    if (state.fnSampleId && state.fnAttempts.length > 0) {
      attemptsBySample[state.fnSampleId] = Math.max(attemptsBySample[state.fnSampleId] || 0, state.fnAttempts.length);
    }

    var isCompare = state.fnMode === 'comparison';
    if (sampleLbl) {
      sampleLbl.textContent = isCompare ? 'REFERENCE SPECIMEN' : 'PRIMARY ACOUSTIC SPECIMEN';
    }
    if (tagEl) {
      tagEl.classList.toggle('hidden', isCompare);
      if (!isCompare && TootLabs.Fartnalysis && typeof TootLabs.Fartnalysis.computeSpecimenMeta === 'function') {
        var tagTarget = null;
        if (state.fnMode === 'guess' && state.fnAttemptId) {
          tagTarget = state.fnAttempts.find(function (a) { return a.id === state.fnAttemptId; }) || null;
        }
        if (!tagTarget && state.fnSampleId) tagTarget = getSampleById(state.fnSampleId);
        if (tagTarget && tagTarget.features && TootLabs.Fartnalysis.syncShippingTag) {
          TootLabs.Fartnalysis.syncShippingTag(
            TootLabs.Fartnalysis.computeSpecimenMeta(tagTarget, tagTarget.features, null, null, getSampleName(tagTarget))
          );
        }
      }
    }

    var optHtml = buildTargetOptionsHtml(isCompare, attemptsBySample);
    if (!isCompare && allAtts.length > 0) {
      var guessOpts = allAtts
        .map(function (a) {
          var tSample = a.sampleId ? getSampleById(a.sampleId) : null;
          var tLabel = tSample ? getSampleName(tSample) : (a.targetName || 'Archive Specimen');
          var label = a.name + ' (' + (a.exactScore || 0).toFixed(1) + '%) → ' + tLabel;
          return '<option value="' + esc('guess::' + a.id + '::' + a.sampleId) + '">' + esc(label) + '</option>';
        })
        .join('');
      optHtml += '<optgroup label="🔬 Comparative Recordings">' + guessOpts + '</optgroup>';
    }

    sampleSel.innerHTML = optHtml || '<option value="">No archived specimens available</option>';
    if (state.fnMode === 'guess' && state.fnAttemptId && state.fnSampleId) {
      sampleSel.value = 'guess::' + state.fnAttemptId + '::' + state.fnSampleId;
    } else if (state.fnSampleId) {
      sampleSel.value = state.fnSampleId;
    }

    guessField.classList.toggle('hidden', !isCompare);
    if (isCompare) {
      var sortedAttempts = sortAttemptsByScore(state.fnAttempts);
      guessSel.innerHTML =
        sortedAttempts.length === 0
          ? '<option value="">No comparative recordings logged for this specimen</option>'
          : sortedAttempts
              .map(function (a, idx) {
                return (
                  '<option value="' +
                  esc(a.id) +
                  '">' +
                  esc('#' + (idx + 1) + ' ' + a.name + ' (' + (a.exactScore || 0).toFixed(1) + '%)') +
                  '</option>'
                );
              })
              .join('');
      if (state.fnAttemptId) guessSel.value = state.fnAttemptId;

      if (guessLb) {
        if (sortedAttempts.length === 0) {
          guessLb.classList.add('hidden');
          guessLb.innerHTML = '';
        } else {
          var targetObj = getSampleById(state.fnSampleId);
          var targetTitle = targetObj ? getSampleName(targetObj) : 'Selected Specimen';
          var pillsHtml = sortedAttempts
            .map(function (a, idx) {
              var isSel = a.id === state.fnAttemptId;
              return (
                '<button type="button" class="labs-fn-glb-pill' +
                (isSel ? ' active' : '') +
                '" data-fn-att-id="' +
                esc(a.id) +
                '">' +
                '<span class="labs-fn-glb-rank">#' +
                (idx + 1) +
                '</span> ' +
                '<span class="labs-fn-glb-name">' +
                esc(a.name) +
                '</span> ' +
                '<span class="labs-fn-glb-score">' +
                (a.exactScore || 0).toFixed(1) +
                '%</span>' +
                '</button>'
              );
            })
            .join('');

          guessLb.innerHTML =
            '<div class="labs-fn-glb-head">' +
            '  <span class="labs-fn-glb-title">🔬 Comparative Recordings — ' +
            esc(targetTitle) +
            ' (' +
            sortedAttempts.length +
            ')</span>' +
            '  <button type="button" id="btn-fn-inspect-solo" class="labs-btn-ghost labs-btn-xs labs-fn-glb-solo">🧪 Individual Report</button>' +
            '</div>' +
            '<div class="labs-fn-glb-pills" role="listbox" aria-label="Comparative recordings for ' +
            esc(targetTitle) +
            '">' +
            pillsHtml +
            '</div>';
          guessLb.classList.remove('hidden');

          guessLb.querySelectorAll('.labs-fn-glb-pill[data-fn-att-id]').forEach(function (pill) {
            pill.addEventListener('click', function () {
              var attId = this.getAttribute('data-fn-att-id');
              if (!attId) return;
              state.fnAttemptId = attId;
              guessSel.value = attId;
              renderFartnalysisView();
            });
          });
          var soloBtn = guessLb.querySelector('.labs-fn-glb-solo');
          if (soloBtn) {
            soloBtn.addEventListener('click', function () {
              if (state.fnSampleId && state.fnAttemptId) {
                openFartnalysis('guess', state.fnSampleId, state.fnAttemptId);
              }
            });
          }
        }
      }
    } else if (guessLb) {
      guessLb.classList.add('hidden');
      guessLb.innerHTML = '';
    }
  }

  function handleCopyVerdict(verdictText) {
    if (!verdictText) return;
    copyTextQuiet(verdictText).then(function (ok) {
      showToast(ok ? 'Copied verdict: "' + verdictText + '"' : 'Verdict: "' + verdictText + '"');
    });
  }

  function renderFartnalysisView() {
    if (state.fnController) {
      state.fnController.destroy();
      state.fnController = null;
    }

    syncFartnalysisPickers();
    var mountEl = $('fn-dashboard-mount');
    var emptyEl = $('fn-empty-state');
    var emptyTitle = $('fn-empty-title');
    var emptyCopy = $('fn-empty-copy');

    if (state.fnMode === 'group') {
      var bucket = getMegamixSourceBucket();
      syncGroupFilterBar(bucket);

      if (bucket.items.length === 0) {
        emptyEl.classList.remove('hidden');
        emptyTitle.textContent =
          bucket.source === 'recorded'
            ? 'No Field Recordings Indexed'
            : bucket.source === 'guesses'
            ? 'No Comparative Recordings Indexed'
            : bucket.source === 'defaults'
            ? 'No Archive Reference Specimens Found'
            : 'No Specimens Ready for Multi-Specimen Synthesis';
        emptyCopy.textContent =
          bucket.source === 'guesses'
            ? 'Conduct a comparative acoustic trial first to synthesize comparative specimens together.'
            : bucket.source === 'defaults'
            ? 'Add reference audio files to VaultPreLoads to build the Archive Reference Pack.'
            : 'Capture an acoustic specimen from Home to generate a multi-specimen Institute Report.';
        mountEl.innerHTML = '';
        return;
      }

      function mountResolvedGroup(resolvedItems) {
        var validItems = (resolvedItems || []).filter(function (x) {
          return x && x.samples && x.samples.length > 0;
        });
        if (validItems.length === 0) {
          emptyEl.classList.remove('hidden');
          emptyTitle.textContent = 'No Playable Audio in Selection';
          emptyCopy.textContent = 'Selected recordings could not be decoded for Megamix assembly.';
          mountEl.innerHTML = '';
          return;
        }
        var groupObj = TootLabs.Store.composeMultiFartTrack(validItems, {
          sortBy: state.groupSortBy,
          sortDir: state.groupSortDir
        });
        emptyEl.classList.add('hidden');
        state.fnController = TootLabs.Fartnalysis.renderGroupDashboard(mountEl, {
          groupObj: groupObj,
          archiveSamples: state.samples.filter(function (x) { return x && x.samples && x.samples.length > 0; }),
          sortBy: state.groupSortBy,
          sortDir: state.groupSortDir,
          onOpenTeam: openTeamView,
          onCopyVerdict: handleCopyVerdict,
          onSortChange: function (nextSortBy, nextSortDir) {
            if (root.TootApp && root.TootApp.Audio) root.TootApp.Audio.stopAll();
            state.groupSortBy = nextSortBy || state.groupSortBy;
            state.groupSortDir = nextSortDir === 'desc' ? 'desc' : 'asc';
            renderFartnalysisView();
          },
          onShareOrEmail: function (g, specCanvases) {
            var reportText = TootLabs.Store.buildGroupAnalysisReportText(g);
            var pdfPayload = { mode: 'group', groupObj: g, specCanvases: specCanvases };
            openShareEmailModal({
              title: 'Share Megamix Report',
              subtitle: g.name + ' (' + g.segments.length + ' specimens · ' + g.metrics.totalDurationSec.toFixed(2) + 's)',
              onShare: function () {
                shareTextOrAudio('Multi-Specimen Megamix Fartnalysis Report', reportText, g, pdfPayload);
              },
              onEmail: function () {
                emailAnalysisReport('Multi-Specimen Megamix Fartnalysis Report', reportText, pdfPayload, g);
              },
              onPdf: function () {
                downloadAnalysisPdf(pdfPayload);
              }
            });
          },
          onDownloadPdf: function (g, specCanvases) {
            downloadAnalysisPdf({ mode: 'group', groupObj: g, specCanvases: specCanvases });
          }
        });
      }

      var needsLoad = bucket.items.some(function (it) { return !it.samples || it.samples.length === 0; });
      if (!needsLoad) {
        mountResolvedGroup(bucket.items);
        return;
      }

      var gen = ++state.groupRenderGen;
      emptyEl.classList.add('hidden');
      mountEl.innerHTML =
        '<div class="labs-glass-card labs-empty-card"><h3>Loading Megamix Specimens…</h3><p>Decoding ' +
        bucket.items.length +
        ' audio tracks for multi-specimen synthesis.</p></div>';
      Promise.all(bucket.items.map(ensureTargetReady))
        .then(function (loadedItems) {
          if (gen !== state.groupRenderGen || state.fnMode !== 'group') return;
          mountResolvedGroup(loadedItems);
        })
        .catch(function (err) {
          if (gen !== state.groupRenderGen || state.fnMode !== 'group') return;
          showToast((err && err.message) || 'Failed decoding some Megamix specimens.', true);
          mountResolvedGroup(bucket.items);
        });
      return;
    }

    var sample = getSampleById(state.fnSampleId);
    if (!sample || !sample.samples || sample.samples.length === 0) {
      emptyEl.classList.remove('hidden');
      emptyTitle.textContent = sample ? 'Loading Primary Specimen…' : 'No Primary Specimen Selected';
      emptyCopy.textContent = sample
        ? 'Decoding built-in Default Vault audio…'
        : 'Record an acoustic specimen to generate a complete Fartnalysis Report and Laboratory Findings.';
      mountEl.innerHTML = '';
      if (sample && (!sample.samples || sample.samples.length === 0)) {
        ensureTargetReady(sample).then(function () {
          if (state.fnSampleId === sample.id && state.fnMode !== 'group') renderFartnalysisView();
        }).catch(function () {});
      }
      return;
    }

    if (state.fnMode === 'original') {
      emptyEl.classList.add('hidden');
      state.fnController = TootLabs.Fartnalysis.renderSingleDashboard(mountEl, {
        sound: sample,
        archiveSamples: state.samples,
        label: getSampleName(sample),
        eyebrow: 'FARTNALYSIS REPORT · PRIMARY SPECIMEN · INSTITUTE REVIEW',
        onOpenTeam: openTeamView,
        onCopyVerdict: handleCopyVerdict,
        onShareOrEmail: function (s, specCanvases) {
          var sName = getSampleName(s);
          var reportText = TootLabs.Store.buildSingleAnalysisReportText(s, 'FARTNALYSIS REPORT');
          var pdfPayload = { mode: 'single', sound: s, label: sName, eyebrow: 'FARTNALYSIS REPORT · PRIMARY SPECIMEN', specCanvases: specCanvases };
          openShareEmailModal({
            title: 'Share Institute Report',
            subtitle: sName + ' — full PDF Institute Report + WAV audio',
            onShare: function () {
              shareTextOrAudio('Institute Report: ' + sName, reportText, s, pdfPayload);
            },
            onEmail: function () {
              emailAnalysisReport('Fartnalysis Report: ' + sName, reportText, pdfPayload, s);
            },
            onPdf: function () {
              downloadAnalysisPdf(pdfPayload);
            }
          });
        },
        onDownloadPdf: function (s, specCanvases) {
          downloadAnalysisPdf({ mode: 'single', sound: s, label: getSampleName(s), eyebrow: 'FARTNALYSIS REPORT · PRIMARY SPECIMEN', specCanvases: specCanvases });
        }
      });
      return;
    }

    var attempt = state.fnAttempts.find(function (a) { return a.id === state.fnAttemptId; }) || state.fnAttempts[0] || null;
    if (!attempt) {
      emptyEl.classList.remove('hidden');
      emptyTitle.textContent = 'No Comparison Recordings Logged for "' + getSampleName(sample) + '"';
      emptyCopy.textContent = 'Select a comparison recording to inspect Secondary Recording Telemetry and Comparative Analysis.';
      mountEl.innerHTML = '';
      return;
    }
    state.fnAttemptId = attempt.id;

    if (state.fnMode === 'guess') {
      emptyEl.classList.add('hidden');
      state.fnController = TootLabs.Fartnalysis.renderSingleDashboard(mountEl, {
        sound: attempt,
        archiveSamples: state.samples,
        label: attempt.name + ' (Secondary Specimen for ' + getSampleName(sample) + ')',
        eyebrow: 'FARTNALYSIS REPORT · SECONDARY RECORDING · LABORATORY FINDINGS',
        primaryLabel: '⚖️ Open Comparative Assessment',
        onPrimaryAction: function () {
          openFartnalysis('comparison', sample.id, attempt.id);
        },
        onOpenTeam: openTeamView,
        onCopyVerdict: handleCopyVerdict,
        onShareOrEmail: function (g, specCanvases) {
          var reportText = TootLabs.Store.buildSingleAnalysisReportText(g, 'SECONDARY SPECIMEN INSTITUTE REPORT');
          var pdfPayload = { mode: 'single', sound: g, label: g.name, eyebrow: 'FARTNALYSIS REPORT · SECONDARY RECORDING', specCanvases: specCanvases };
          openShareEmailModal({
            title: 'Share Comparative Specimen Report',
            subtitle: g.name + ' — full PDF Institute Report + WAV audio',
            onShare: function () {
              shareTextOrAudio('Institute Report: ' + g.name, reportText, g, pdfPayload);
            },
            onEmail: function () {
              emailAnalysisReport('Fartnalysis Report: ' + g.name, reportText, pdfPayload, g);
            },
            onPdf: function () {
              downloadAnalysisPdf(pdfPayload);
            }
          });
        },
        onDownloadPdf: function (g, specCanvases) {
          downloadAnalysisPdf({ mode: 'single', sound: g, label: g.name, eyebrow: 'FARTNALYSIS REPORT · SECONDARY RECORDING', specCanvases: specCanvases });
        }
      });
      return;
    }

    // 3. Comparative Acoustic Analysis
    emptyEl.classList.add('hidden');
    state.fnController = TootLabs.Fartnalysis.renderDashboard(mountEl, {
      soundA: sample,
      soundB: attempt,
      archiveSamples: state.samples,
      labelA: getSampleName(sample),
      labelB: attempt.name,
      result: attempt.result || null,
      onOpenTeam: openTeamView,
      onCopyVerdict: handleCopyVerdict,
      onShareOrEmail: function (sA, sB, r, exact, specCanvases) {
        var reportText = TootLabs.Store.buildComparisonReportText(sA, sB, r, exact);
        var pdfPayload = { mode: 'comparison', soundA: sA, soundB: sB, result: r, specCanvases: specCanvases };
        openShareEmailModal({
          title: 'Share Comparative Report',
          subtitle: sB.name + ' vs ' + getSampleName(sA) + ' (' + exact.toFixed(1) + '% Reproduction Fidelity)',
          onShare: function () {
            shareTextOrAudio('Toot Match Labs Comparative Assessment: ' + exact.toFixed(1) + '%', reportText, stitchComparisonAudio(sA, sB), pdfPayload);
          },
          onEmail: function () {
            emailAnalysisReport('Toot Match Labs Comparative Assessment: ' + sB.name + ' vs ' + getSampleName(sA), reportText, pdfPayload, stitchComparisonAudio(sA, sB));
          },
          onPdf: function () {
            downloadAnalysisPdf(pdfPayload);
          }
        });
      },
      onDownloadPdf: function (sA, sB, r, exact, specCanvases) {
        downloadAnalysisPdf({ mode: 'comparison', soundA: sA, soundB: sB, result: r, specCanvases: specCanvases });
      }
    });
  }

  /* ==================== MODALS ==================== */
  function initModals() {
    var renameModal = $('labs-rename-modal');
    var renameInput = $('labs-rename-input');
    var deleteModal = $('labs-delete-modal');

    $('btn-labs-rename-cancel').addEventListener('click', function () {
      renameModal.classList.add('hidden');
    });

    $('btn-labs-rename-save').addEventListener('click', function () {
      var next = renameInput.value.trim();
      if (!next || !state.renameTarget) {
        showToast('Enter a valid name', true);
        return;
      }

      if (state.renameTarget.kind === 'sample') {
        TootLabs.Store.renameSample(state.renameTarget.item, next).then(function () {
          renameModal.classList.add('hidden');
          renderHomeView();
          if (state.view === 'vault') renderVaultView();
          if (state.view === 'detail') renderSampleDetail();
          if (state.view === 'guess') renderGuessView();
          showToast('Renamed to "' + next + '"');
        });
      } else if (state.renameTarget.kind === 'guess') {
        TootLabs.Store.renameAttempt(state.renameTarget.item, next).then(function (updated) {
          upsertAttemptsIntoCache([updated || state.renameTarget.item]);
          renameModal.classList.add('hidden');
          renderGuessLeaderboard();
          if (state.view === 'vault') renderVaultView();
          if (state.view === 'detail') renderSampleDetail();
          showToast('Guesser named "' + next + '"');
        });
      }
    });

    $('btn-labs-delete-cancel').addEventListener('click', function () {
      state.deleteModalAction = null;
      deleteModal.classList.add('hidden');
    });

    $('btn-labs-delete-confirm').addEventListener('click', function () {
      var action = state.deleteModalAction;
      state.deleteModalAction = null;
      if (action && action.kind === 'vault_bulk') {
        var sampleIds = (action.sampleIds || []).slice();
        var attemptIds = (action.attemptIds || []).slice();
        var sampleSet = {};
        sampleIds.forEach(function (id) { sampleSet[id] = true; });
        var attemptSet = {};
        attemptIds.forEach(function (id) { attemptSet[id] = true; });
        var standaloneAttemptIds = attemptIds.filter(function (aid) {
          var att = findAttemptInCacheById(aid);
          return att && !sampleSet[att.sampleId];
        });

        Promise.resolve()
          .then(function () {
            return sampleIds.length > 0 ? TootLabs.Store.deleteSamplesBatch(sampleIds, state.samples) : true;
          })
          .then(function () {
            return standaloneAttemptIds.length > 0 ? TootLabs.Store.deleteAttemptsBatch(standaloneAttemptIds) : true;
          })
          .then(function () {
            deleteModal.classList.add('hidden');
            state.samples = state.samples.filter(function (s) {
              return s && (s.isBuiltIn || !sampleSet[s.id]);
            });
            state.allAttemptsCache = (state.allAttemptsCache || []).filter(function (a) {
              return a && !attemptSet[a.id] && !sampleSet[a.sampleId];
            });
            sampleIds.forEach(function (id) { delete state.vaultSelectedSamples[id]; });
            attemptIds.forEach(function (id) { delete state.vaultSelectedGuesses[id]; });
            if (sampleSet[state.guessTargetId]) {
              state.guessTargetId = state.samples[0] ? state.samples[0].id : null;
              state.guessAttempts = [];
              state.pendingGuess = null;
            }
            if (sampleSet[state.fnSampleId]) {
              state.fnSampleId = state.samples[0] ? state.samples[0].id : null;
              state.fnAttempts = [];
              state.fnAttemptId = null;
            } else {
              state.fnAttempts = (state.fnAttempts || []).filter(function (a) { return a && !attemptSet[a.id]; });
              if (attemptSet[state.fnAttemptId]) {
                var sortedLeft = sortAttemptsByScore(state.fnAttempts);
                state.fnAttemptId = sortedLeft[0] ? sortedLeft[0].id : null;
              }
            }
            if (sampleSet[state.detailSampleId]) {
              state.detailSampleId = null;
              state.detailAttempts = [];
              if (state.view === 'detail') showView('vault');
            }
            renderHomeView();
            if (state.view === 'vault') renderVaultView();
            if (state.view === 'fartnalysis') renderFartnalysisView();
            if (state.view === 'guess') renderGuessView();
            refreshAllAttemptsCache(true);
            var parts = [];
            if (sampleIds.length > 0) parts.push(sampleIds.length + ' recording' + (sampleIds.length === 1 ? '' : 's'));
            if (standaloneAttemptIds.length > 0) parts.push(standaloneAttemptIds.length + ' guess' + (standaloneAttemptIds.length === 1 ? '' : 'es'));
            showToast(parts.length > 0 ? 'Deleted ' + parts.join(' & ') + ' from Vault' : 'Updated Vault');
          });
        return;
      }

      var delId = (action && action.sampleId) || state.detailSampleId;
      var targetSample = getSampleById(delId);
      if (!delId || (targetSample && targetSample.isBuiltIn)) {
        deleteModal.classList.add('hidden');
        if (targetSample && targetSample.isBuiltIn) {
          showToast('Built-in Default Farts always stay in your Vault.');
        }
        return;
      }
      TootLabs.Store.deleteSample(delId, state.samples).then(function (ok) {
        deleteModal.classList.add('hidden');
        if (!ok) {
          showToast('Built-in Default Farts always stay in your Vault.');
          return;
        }
        state.samples = state.samples.filter(function (s) { return s.id !== delId; });
        state.allAttemptsCache = (state.allAttemptsCache || []).filter(function (a) { return a && a.sampleId !== delId; });
        delete state.vaultSelectedSamples[delId];
        if (state.guessTargetId === delId) {
          state.guessTargetId = state.samples[0] ? state.samples[0].id : null;
          state.guessAttempts = [];
          state.pendingGuess = null;
        }
        if (state.fnSampleId === delId) {
          state.fnSampleId = state.samples[0] ? state.samples[0].id : null;
          state.fnAttempts = [];
          state.fnAttemptId = null;
        }
        renderHomeView();
        openVaultView();
        refreshAllAttemptsCache(true);
        showToast('Fart deleted from Vault');
      });
    });

    // Top-right Settings Gear Menu, About Modal & Instructional Splash
    var gearBtn = $('btn-labs-settings');
    if (gearBtn) gearBtn.addEventListener('click', toggleSettingsMenu);

    var menuGamesBtn = $('btn-menu-games');
    if (menuGamesBtn) {
      menuGamesBtn.addEventListener('click', function () {
        openGamesView();
      });
    }

    var menuChainBtn = $('btn-menu-chain');
    if (menuChainBtn) {
      menuChainBtn.addEventListener('click', function () {
        closeSettingsMenu();
        if (TootLabs.SignalChain && TootLabs.SignalChain.openView) {
          TootLabs.SignalChain.openView();
        }
      });
    }

    var menuSequenceBtn = $('btn-menu-sequence');
    if (menuSequenceBtn) {
      menuSequenceBtn.addEventListener('click', function () {
        openSequenceMode('home');
      });
    }

    var menuRealFakeBtn = $('btn-menu-realfake');
    if (menuRealFakeBtn) {
      menuRealFakeBtn.addEventListener('click', function () {
        openRealFakeView();
      });
    }

    var menuQuickFireBtn = $('btn-menu-quickfire');
    if (menuQuickFireBtn) {
      menuQuickFireBtn.addEventListener('click', function () {
        openQuickFireMode(null, 'home');
      });
    }

    var menuBlindBtn = $('btn-menu-blind');
    if (menuBlindBtn) {
      menuBlindBtn.addEventListener('click', function () {
        closeSettingsMenu();
        openGuessMode(state.guessTargetId || (state.samples[0] && state.samples[0].id)).then(function () {
          state.subModeReturnTo = 'home';
          setGuessSubMode('blind');
        });
      });
    }

    var menuAboutBtn = $('btn-menu-about');
    if (menuAboutBtn) menuAboutBtn.addEventListener('click', openAboutModal);

    var menuTeamBtn = $('btn-menu-team');
    if (menuTeamBtn) {
      menuTeamBtn.addEventListener('click', function () {
        closeSettingsMenu();
        openTeamView();
      });
    }

    var menuHowToBtn = $('btn-menu-howto');
    if (menuHowToBtn) menuHowToBtn.addEventListener('click', openSplashModal);

    var aboutModal = $('labs-about-modal');
    var aboutCloseBtn = $('btn-about-close');
    var aboutTeamBtn = $('btn-about-open-team');
    if (aboutCloseBtn) aboutCloseBtn.addEventListener('click', closeAboutModal);
    if (aboutTeamBtn) {
      aboutTeamBtn.addEventListener('click', function () {
        closeAboutModal();
        openTeamView();
      });
    }
    if (aboutModal) {
      aboutModal.addEventListener('click', function (ev) {
        if (ev.target === aboutModal) closeAboutModal();
      });
    }

    var shareModal = $('labs-share-modal');
    var shareNativeBtn = $('btn-share-modal-native');
    var shareEmailBtn = $('btn-share-modal-email');
    var shareCloseBtn = $('btn-share-modal-close');
    if (shareNativeBtn) {
      shareNativeBtn.addEventListener('click', function () {
        var actions = state.shareModalActions;
        closeShareEmailModal();
        if (actions && typeof actions.onShare === 'function') actions.onShare();
      });
    }
    if (shareEmailBtn) {
      shareEmailBtn.addEventListener('click', function () {
        var actions = state.shareModalActions;
        closeShareEmailModal();
        if (actions && typeof actions.onEmail === 'function') actions.onEmail();
      });
    }
    var sharePdfBtn = $('btn-share-modal-pdf');
    if (sharePdfBtn) {
      sharePdfBtn.addEventListener('click', function () {
        var actions = state.shareModalActions;
        closeShareEmailModal();
        if (actions && typeof actions.onPdf === 'function') actions.onPdf();
      });
    }
    if (shareCloseBtn) shareCloseBtn.addEventListener('click', closeShareEmailModal);
    if (shareModal) {
      shareModal.addEventListener('click', function (ev) {
        if (ev.target === shareModal) closeShareEmailModal();
      });
    }

    var splashModal = $('labs-splash-modal');
    var splashStartBtn = $('btn-splash-start');
    if (splashStartBtn) splashStartBtn.addEventListener('click', closeSplashModal);
    if (splashModal) {
      splashModal.addEventListener('click', function (ev) {
        if (ev.target === splashModal) closeSplashModal();
      });
    }

    if (typeof document.addEventListener === 'function') {
      document.addEventListener('click', function (ev) {
        var menu = $('labs-settings-menu');
        var gear = $('btn-labs-settings');
        if (!menu || menu.classList.contains('hidden')) return;
        var tgt = ev && ev.target;
        if (tgt === gear || (gear && typeof gear.contains === 'function' && gear.contains(tgt))) return;
        if (tgt === menu || (typeof menu.contains === 'function' && menu.contains(tgt))) return;
        closeSettingsMenu();
      });
    }
  }

  /* ==================== EVENT BINDINGS ==================== */
  function initNavigationAndActions() {
    // Persistent 5-Tab Bottom Dock: Home | Games | Stats | Archive | Settings
    document.querySelectorAll('.labs-nav-btn').forEach(function (navBtn) {
      navBtn.addEventListener('click', function () {
        var targetView = this.getAttribute('data-view');
        if (targetView === 'home') {
          openHomeView();
        } else if (targetView === 'games') {
          openGamesView();
        } else if (targetView === 'vault') {
          openVaultView();
        } else if (targetView === 'fartnalysis') {
          openFartnalysis(state.fnMode || 'original', state.fnSampleId, state.fnAttemptId);
        } else if (targetView === 'settings') {
          openSettingsModal();
        }
      });
    });

    // Dedicated Games Hub Cards
    if ($('btn-games-home')) $('btn-games-home').addEventListener('click', openHomeView);
    if ($('btn-games-guess')) {
      $('btn-games-guess').addEventListener('click', function () {
        openGuessMode(state.guessTargetId || (state.samples[0] && state.samples[0].id));
      });
    }
    if ($('btn-games-sequence')) {
      $('btn-games-sequence').addEventListener('click', function () {
        openSequenceMode('games');
      });
    }
    if ($('btn-games-realfake')) {
      $('btn-games-realfake').addEventListener('click', openRealFakeView);
    }
    if ($('btn-games-chain')) {
      $('btn-games-chain').addEventListener('click', function () {
        if (TootLabs.SignalChain && TootLabs.SignalChain.openView) {
          TootLabs.SignalChain.openView();
        }
      });
    }
    if ($('btn-games-quickfire')) {
      $('btn-games-quickfire').addEventListener('click', function () {
        openQuickFireMode(null, 'games');
      });
    }
    if ($('btn-games-blind')) {
      $('btn-games-blind').addEventListener('click', function () {
        openGuessMode(state.guessTargetId || (state.samples[0] && state.samples[0].id)).then(function () {
          state.subModeReturnTo = 'games';
          setGuessSubMode('blind');
        });
      });
    }

    // Settings Modal Controls
    var settingsModal = $('labs-settings-modal');
    if ($('btn-settings-close')) $('btn-settings-close').addEventListener('click', closeSettingsModal);
    if (settingsModal) {
      settingsModal.addEventListener('click', function (ev) {
        if (ev.target === settingsModal) closeSettingsModal();
      });
    }
    if ($('labs-settings-mic-select')) {
      $('labs-settings-mic-select').addEventListener('change', function () {
        if (TootApp.Audio) TootApp.Audio.setSelectedDevice(this.value);
        if ($('labs-mic-device')) $('labs-mic-device').value = this.value;
        showToast('Microphone input updated.');
      });
    }
    if ($('btn-settings-toggle-sentry')) {
      $('btn-settings-toggle-sentry').addEventListener('click', function () {
        setRecordMode(state.recordMode === 'auto' ? 'manual' : 'auto');
        syncSettingsModalState();
      });
    }
    if ($('btn-settings-team')) {
      $('btn-settings-team').addEventListener('click', function () {
        closeSettingsModal();
        openTeamView();
      });
    }
    if ($('btn-settings-about')) {
      $('btn-settings-about').addEventListener('click', function () {
        closeSettingsModal();
        openAboutModal();
      });
    }
    if ($('btn-settings-howto')) {
      $('btn-settings-howto').addEventListener('click', function () {
        closeSettingsModal();
        openSplashModal();
      });
    }
    if ($('btn-settings-reset-rf')) {
      $('btn-settings-reset-rf').addEventListener('click', function () {
        saveRealFakeStats({ played: 0, youCorrect: 0, aiCorrect: 0, streak: 0, bestStreak: 0 });
        if (state.view === 'realfake') renderRealFakeStage();
        showToast('Real or Fake? all-time score reset.');
      });
    }

    // Global Quick Record Action + Sentry Stop/Save & Disarm
    $('btn-quick-stop-save').addEventListener('click', function () {
      if (state.recordingKind === 'quick' && state.activeRecStopper) {
        state.activeRecStopper();
      }
    });
    if ($('btn-quick-cancel-auto')) {
      $('btn-quick-cancel-auto').addEventListener('click', function () {
        if (state.recordingKind === 'quick' && state.activeRecCanceller) {
          state.activeRecCanceller();
        }
      });
    }

    // Home 3 Primary Action Cards & Inline Record Sentry Toggle
    var homeRecBtn = $('btn-home-record-fart');
    homeRecBtn.addEventListener('click', startQuickRecordFart);
    homeRecBtn.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        startQuickRecordFart();
      }
    });
    var homeSentryBtn = $('btn-home-sentry-toggle');
    if (homeSentryBtn) {
      homeSentryBtn.addEventListener('click', function (ev) {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
        setRecordMode(state.recordMode === 'auto' ? 'manual' : 'auto');
      });
    }
    $('btn-home-guess-fart').addEventListener('click', function () {
      openGuessMode(state.guessTargetId || (state.samples[0] && state.samples[0].id));
    });
    if ($('btn-home-sequence')) {
      $('btn-home-sequence').addEventListener('click', function () {
        openSequenceMode('home');
      });
    }
    if ($('btn-home-realfake')) {
      $('btn-home-realfake').addEventListener('click', function () {
        openRealFakeView();
      });
    }
    if ($('home-osc-screen')) {
      $('home-osc-screen').addEventListener('click', toggleHomeOscPlay);
    }
    if ($('btn-home-osc-play')) {
      $('btn-home-osc-play').addEventListener('click', toggleHomeOscPlay);
    }
    if ($('btn-home-osc-next')) {
      $('btn-home-osc-next').addEventListener('click', nextHomeOscSample);
    }
    if ($('home-osc-select')) {
      $('home-osc-select').addEventListener('change', function () {
        var nextId = this.value;
        var Audio = root.TootApp && root.TootApp.Audio;
        if (state.homeOscPlaying && Audio) Audio.stopChannel('home_osc');
        state.homeOscPlaying = false;
        state.homeOscProgress = null;
        if (nextId) {
          state.homeOscId = nextId;
          state.fnSampleId = nextId;
          state.guessTargetId = nextId;
        }
        renderHomeOscilloscope();
      });
    }
    if ($('btn-home-analyze-fart')) {
      $('btn-home-analyze-fart').addEventListener('click', function () {
        openFartnalysis(
          state.fnMode || 'original',
          state.fnSampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id),
          state.fnAttemptId
        );
      });
    }
    $('btn-home-open-vault').addEventListener('click', function () {
      openVaultView();
    });

    // Vault View Buttons, Search, Selection & Airlock Door (Recording Driven From Home Only)
    var vaultSearchInput = $('vault-search-input');
    if (vaultSearchInput) {
      vaultSearchInput.addEventListener('input', function () {
        state.vaultSearchQuery = this.value || '';
        renderVaultView();
      });
    }
    document.querySelectorAll('.labs-vtab[data-vault-tab]').forEach(function (vt) {
      vt.addEventListener('click', function () {
        setVaultFilter(this.getAttribute('data-vault-tab') || 'all');
      });
    });
    if ($('btn-vault-select')) {
      $('btn-vault-select').addEventListener('click', function () {
        setVaultSelectMode(!state.vaultSelectMode);
      });
    }
    if ($('btn-vault-select-all')) {
      $('btn-vault-select-all').addEventListener('click', selectAllVisibleVaultItems);
    }
    if ($('btn-vault-delete-selected')) {
      $('btn-vault-delete-selected').addEventListener('click', function () {
        var sel = getSelectedVaultIds();
        promptVaultDelete(sel.sampleIds, sel.attemptIds);
      });
    }
    if ($('btn-vault-select-done')) {
      $('btn-vault-select-done').addEventListener('click', function () {
        setVaultSelectMode(false);
      });
    }
    $('btn-vault-megamix').addEventListener('click', function () {
      openFartnalysis('group', null, null);
    });
    $('btn-vault-reseal').addEventListener('click', function () {
      resealVaultAndReturn();
    });
    $('vault-door-stage').addEventListener('click', dismissVaultDoorImmediate);
    $('vault-door-stage').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        dismissVaultDoorImmediate();
      }
    });

    // Detail View Buttons
    $('btn-detail-back').addEventListener('click', function () {
      openVaultView();
    });
    $('btn-detail-play').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample) return;
      ensureTargetReady(sample).then(function (loaded) {
        if (loaded && loaded.samples) {
          TootApp.Audio.playSound(loaded.samples, loaded.sampleRate, {
            channel: 'detail_play',
            onProgress: function (p) { drawDetailWaveform(p); },
            onEnded: function () { drawDetailWaveform(null); }
          });
        }
      });
    });
    $('btn-detail-guess').addEventListener('click', function () {
      if (state.detailSampleId) openGuessMode(state.detailSampleId);
    });
    $('btn-detail-analyze').addEventListener('click', function () {
      if (state.detailSampleId) openFartnalysis('original', state.detailSampleId, null);
    });
    $('btn-detail-share').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample) return;
      var sName = getSampleName(sample);
      var reportText = TootLabs.Store.buildSingleAnalysisReportText(sample, 'INSTITUTE SPECIMEN REPORT');
      var pdfPayload = { mode: 'single', sound: sample, label: sName, eyebrow: 'INSTITUTE SPECIMEN REPORT' };
      openShareEmailModal({
        title: 'Share Specimen Report',
        subtitle: sName + ' — choose Share, Email, or PDF export',
        onShare: function () {
          shareTextOrAudio('Toot Match Labs — ' + sName, TootLabs.Store.buildSingleAnalysisReportText(sample, 'ARCHIVED SPECIMEN'), sample, pdfPayload);
        },
        onEmail: function () {
          emailAnalysisReport('Fartnalysis Report: ' + sName, reportText, pdfPayload, sample);
        },
        onPdf: function () {
          downloadAnalysisPdf(pdfPayload);
        }
      });
    });
    $('btn-detail-rename').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample) return;
      state.renameTarget = { kind: 'sample', item: sample };
      $('labs-rename-heading').textContent = 'Rename Fart';
      $('labs-rename-input').value = getSampleName(sample);
      $('labs-rename-modal').classList.remove('hidden');
      $('labs-rename-input').focus();
    });
    $('btn-detail-delete').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample || sample.isBuiltIn) return;
      state.deleteModalAction = { kind: 'single_sample', sampleId: sample.id };
      if ($('labs-delete-heading')) $('labs-delete-heading').textContent = 'Delete Fart?';
      $('labs-delete-copy').textContent = 'Permanently delete "' + getSampleName(sample) + '" and all guesses against it?';
      $('labs-delete-modal').classList.remove('hidden');
    });

    // Guess & Mimic Game Screen Buttons (No Record New Fart here — Home only)
    if ($('btn-guess-reset-blind')) {
      $('btn-guess-reset-blind').addEventListener('click', function () {
        setGuessMode('guess');
      });
    }
    if ($('btn-guess-next-after')) {
      $('btn-guess-next-after').addEventListener('click', pickRandomGuessTarget);
    }
    if ($('btn-guess-hint')) {
      $('btn-guess-hint').addEventListener('click', revealNextGuessHint);
    }
    if ($('btn-guess-toggle-picker')) {
      $('btn-guess-toggle-picker').addEventListener('click', function () {
        state.pickerOpen = !state.pickerOpen;
        renderGuessView();
      });
    }
    $('btn-guess-analyze-orig').addEventListener('click', function () {
      if (state.guessTargetId) openFartnalysis('original', state.guessTargetId, null);
    });
    if ($('btn-guess-replay-wave')) {
      $('btn-guess-replay-wave').addEventListener('click', playFartFirst);
    }
    $('btn-guess-rec').addEventListener('click', startGuessCapture);
    if ($('btn-guess-play-first')) {
      $('btn-guess-play-first').addEventListener('click', playFartFirst);
    }
    if ($('btn-guess-score-now')) {
      $('btn-guess-score-now').addEventListener('click', function () {
        analyzeSessionGuesses();
      });
    }
    if ($('btn-reveal-skip')) {
      $('btn-reveal-skip').addEventListener('click', function () {
        if (typeof state.revealSkipCb === 'function') state.revealSkipCb();
      });
    }
    $('btn-guess-queue-analyze').addEventListener('click', function () {
      analyzeSessionGuesses();
    });
    if ($('btn-guess-toggle-history')) {
      $('btn-guess-toggle-history').addEventListener('click', function () {
        state.historyOpen = !state.historyOpen;
        renderGuessLeaderboard();
      });
    }
    if ($('btn-open-sequence-footer')) {
      $('btn-open-sequence-footer').addEventListener('click', function () {
        openSequenceMode('guess');
      });
    }
    if ($('btn-open-quickfire-footer')) {
      $('btn-open-quickfire-footer').addEventListener('click', function () {
        openQuickFireMode(null, 'guess');
      });
    }
    if ($('btn-open-blind-footer')) {
      $('btn-open-blind-footer').addEventListener('click', function () {
        state.subModeReturnTo = 'guess';
        setGuessSubMode('blind');
      });
    }
    if ($('btn-blind-back')) {
      $('btn-blind-back').addEventListener('click', handleSubModeBack);
    }
    if ($('btn-qf-back')) {
      $('btn-qf-back').addEventListener('click', handleSubModeBack);
    }
    if ($('btn-seq-back')) {
      $('btn-seq-back').addEventListener('click', handleSubModeBack);
    }
    if ($('seq-count-pills')) {
      $('seq-count-pills').querySelectorAll('[data-seq-count]').forEach(function (pillBtn) {
        pillBtn.addEventListener('click', function () {
          setSequenceCount(this.getAttribute('data-seq-count'));
        });
      });
    }
    if ($('seq-count-input')) {
      $('seq-count-input').addEventListener('change', function () {
        setSequenceCount(this.value);
      });
    }
    if ($('seq-player-pills')) {
      $('seq-player-pills').querySelectorAll('[data-seq-players]').forEach(function (pillBtn) {
        pillBtn.addEventListener('click', function () {
          setSequencePlayerCount(this.getAttribute('data-seq-players'));
        });
      });
    }
    if ($('seq-source-select')) {
      $('seq-source-select').addEventListener('change', function () {
        state.seqSource = this.value || 'all';
        renderSequenceSetup();
      });
    }
    if ($('btn-seq-start')) {
      $('btn-seq-start').addEventListener('click', function () {
        startSequenceRound(false);
      });
    }
    if ($('btn-seq-done-early')) {
      $('btn-seq-done-early').addEventListener('click', function () {
        if (typeof state.seqStopCurrentRec === 'function') state.seqStopCurrentRec();
      });
    }
    if ($('btn-seq-abort')) {
      $('btn-seq-abort').addEventListener('click', function () {
        abortSequenceRound(false);
      });
    }
    if ($('btn-seq-rematch')) {
      $('btn-seq-rematch').addEventListener('click', function () {
        startSequenceRound(true);
      });
    }
    if ($('btn-seq-new')) {
      $('btn-seq-new').addEventListener('click', function () {
        startSequenceRound(false);
      });
    }
    if ($('btn-seq-setup')) {
      $('btn-seq-setup').addEventListener('click', function () {
        state.seqPhase = 'setup';
        renderSequencePane();
      });
    }

    // Real or Fake? Showdown Bindings
    if ($('btn-rf-back')) {
      $('btn-rf-back').addEventListener('click', function () {
        openHomeView();
      });
    }
    if ($('btn-rf-home')) {
      $('btn-rf-home').addEventListener('click', function () {
        openHomeView();
      });
    }
    if ($('btn-rf-toggle-brief')) {
      $('btn-rf-toggle-brief').addEventListener('click', function () {
        state.rfBriefCollapsed = !state.rfBriefCollapsed;
        var b = $('rf-brief-body');
        if (b) b.classList.toggle('hidden', state.rfBriefCollapsed);
        this.setAttribute('aria-expanded', state.rfBriefCollapsed ? 'false' : 'true');
        this.textContent = state.rfBriefCollapsed ? '▾ Show Info' : '▴ Hide Info';
      });
    }
    if ($('btn-rf-go-guess')) {
      $('btn-rf-go-guess').addEventListener('click', function () {
        openGuessMode(state.guessTargetId || (state.samples[0] && state.samples[0].id));
      });
    }
    if ($('btn-rf-go-seq')) {
      $('btn-rf-go-seq').addEventListener('click', function () {
        openSequenceMode();
      });
    }
    if ($('btn-rf-play')) {
      $('btn-rf-play').addEventListener('click', function () {
        var item = (state.rfDeck || [])[state.rfIndex || 0];
        if (!item || !item.sound || !item.sound.samples) return;
        TootApp.Audio.playSound(item.sound.samples, item.sound.sampleRate || 44100, {
          channel: 'rf_play',
          onProgress: function (p) {
            if ($('rf-wave-canvas')) drawStaticWaveform($('rf-wave-canvas'), item.sound.samples, { fallbackW: 440, fallbackH: 56, progress: p });
          },
          onEnded: function () {
            if ($('rf-wave-canvas')) drawStaticWaveform($('rf-wave-canvas'), item.sound.samples, { fallbackW: 440, fallbackH: 56 });
          }
        });
      });
    }
    if ($('btn-rf-vote-real')) {
      $('btn-rf-vote-real').addEventListener('click', function () { submitRealFakeVote(true); });
    }
    if ($('btn-rf-vote-fake')) {
      $('btn-rf-vote-fake').addEventListener('click', function () { submitRealFakeVote(false); });
    }
    if ($('btn-rf-inspect')) {
      $('btn-rf-inspect').addEventListener('click', function () {
        var item = (state.rfDeck || [])[state.rfIndex || 0];
        if (item) inspectRealFakeItem(item);
      });
    }
    if ($('btn-rf-next')) {
      $('btn-rf-next').addEventListener('click', function () {
        var deck = state.rfDeck || [];
        if ((state.rfIndex || 0) + 1 >= deck.length) {
          state.rfPhase = 'results';
        } else {
          state.rfIndex = (state.rfIndex || 0) + 1;
          state.rfVoted = false;
        }
        renderRealFakeStage();
      });
    }
    if ($('btn-rf-again')) {
      $('btn-rf-again').addEventListener('click', function () {
        startNewRealFakeDeck();
      });
    }
    if ($('qf-count-pills')) {
      $('qf-count-pills').querySelectorAll('[data-qf-count]').forEach(function (pillBtn) {
        pillBtn.addEventListener('click', function () {
          setQuickFireCount(this.getAttribute('data-qf-count'));
        });
      });
    }
    if ($('qf-count-input')) {
      $('qf-count-input').addEventListener('change', function () {
        setQuickFireCount(this.value);
      });
    }
    if ($('qf-source-select')) {
      $('qf-source-select').addEventListener('change', function () {
        state.qfSource = this.value || 'all';
        renderQuickFireSetup();
      });
    }
    if ($('btn-qf-start')) {
      $('btn-qf-start').addEventListener('click', function () {
        startQuickFireRound();
      });
    }
    if ($('btn-qf-done-early')) {
      $('btn-qf-done-early').addEventListener('click', function () {
        if (typeof state.qfStopCurrentRec === 'function') state.qfStopCurrentRec();
      });
    }
    if ($('btn-qf-abort')) {
      $('btn-qf-abort').addEventListener('click', function () {
        abortQuickFireRound(false);
      });
    }
    if ($('btn-qf-play-again')) {
      $('btn-qf-play-again').addEventListener('click', function () {
        startQuickFireRound();
      });
    }
    if ($('btn-qf-change-setup')) {
      $('btn-qf-change-setup').addEventListener('click', function () {
        state.qfPhase = 'setup';
        renderQuickFirePane();
      });
    }
    $('btn-blind-rec-guess').addEventListener('click', startBlindGuessCapture);
    $('btn-blind-rec-orig').addEventListener('click', startBlindOriginalCapture);
    $('btn-blind-analyze').addEventListener('click', analyzeBlindSession);

    // Inline Match Result Buttons & Synced Side-by-Side 3D Spectrum Plot Controls
    if ($('res-spec3d-bay')) {
      $('res-spec3d-bay').querySelectorAll('[data-res-preset]').forEach(function (pBtn) {
        pBtn.addEventListener('click', function () {
          var pr = this.getAttribute('data-res-preset');
          if (pr === 'spin') {
            var spinOn = state.inlineSpecA ? state.inlineSpecA.toggleAutoRotate() : false;
            if (state.inlineSpecB && typeof state.inlineSpecB.toggleAutoRotate === 'function') {
              if (state.inlineSpecB.autoRotate !== spinOn) state.inlineSpecB.toggleAutoRotate();
            }
            this.classList.toggle('active', spinOn);
            return;
          }
          var allBtns = $('res-spec3d-bay').querySelectorAll('[data-res-preset]');
          for (var i = 0; i < allBtns.length; i++) {
            if (allBtns[i].getAttribute('data-res-preset') !== 'spin') allBtns[i].classList.remove('active');
          }
          this.classList.add('active');
          if (state.inlineSpecA) state.inlineSpecA.setPreset(pr);
          else if (state.inlineSpecB) state.inlineSpecB.setPreset(pr);
        });
      });
    }

    if ($('btn-res-play-orig')) {
      $('btn-res-play-orig').addEventListener('click', function () {
        if (!state.lastOutcome || !state.lastOutcome.targetSound) return;
        var tgt = state.lastOutcome.targetSound;
        try {
          TootApp.Audio.stopAll();
          var r = TootApp.Audio.playSound(tgt.samples, tgt.sampleRate, {
            channel: 'res_3d_orig',
            onProgress: function (p) { if (state.inlineSpecA) state.inlineSpecA.setPlayhead(p); },
            onEnded: function () { if (state.inlineSpecA) state.inlineSpecA.setPlayhead(null); }
          });
          if (r && typeof r.catch === 'function') r.catch(function () {});
        } catch (e) {}
      });
    }

    if ($('btn-res-play-guess')) {
      $('btn-res-play-guess').addEventListener('click', function () {
        if (!state.lastOutcome || !state.lastOutcome.attempt) return;
        var att = state.lastOutcome.attempt;
        try {
          TootApp.Audio.stopAll();
          var r = TootApp.Audio.playSound(att.samples, att.sampleRate, {
            channel: 'res_3d_guess',
            onProgress: function (p) { if (state.inlineSpecB) state.inlineSpecB.setPlayhead(p); },
            onEnded: function () { if (state.inlineSpecB) state.inlineSpecB.setPlayhead(null); }
          });
          if (r && typeof r.catch === 'function') r.catch(function () {});
        } catch (e) {}
      });
    }

    if ($('btn-res-play-both')) {
      $('btn-res-play-both').addEventListener('click', function () {
        if (!state.lastOutcome || !state.lastOutcome.targetSound || !state.lastOutcome.attempt) return;
        var tgt = state.lastOutcome.targetSound;
        var att = state.lastOutcome.attempt;
        try {
          var r = TootApp.Audio.playSimultaneous([
            {
              samples: tgt.samples,
              sampleRate: tgt.sampleRate,
              channel: 'res_both_a',
              onProgress: function (p) { if (state.inlineSpecA) state.inlineSpecA.setPlayhead(p); },
              onEnded: function () { if (state.inlineSpecA) state.inlineSpecA.setPlayhead(null); }
            },
            {
              samples: att.samples,
              sampleRate: att.sampleRate,
              channel: 'res_both_b',
              onProgress: function (p) { if (state.inlineSpecB) state.inlineSpecB.setPlayhead(p); },
              onEnded: function () { if (state.inlineSpecB) state.inlineSpecB.setPlayhead(null); }
            }
          ]);
          if (r && typeof r.catch === 'function') r.catch(function () {});
        } catch (e) {}
      });
    }

    $('btn-res-next-guesser').addEventListener('click', function () {
      if (state.samples && state.samples.length > 1) {
        pickRandomGuessTarget();
      } else {
        setGuessMode('guess');
      }
    });
    $('btn-res-compare').addEventListener('click', function () {
      if (state.lastOutcome) {
        openFartnalysis('comparison', state.lastOutcome.targetSound.id, state.lastOutcome.attempt.id);
      }
    });
    $('btn-res-replay').addEventListener('click', function () {
      if (!state.lastOutcome) return;
      TootApp.Audio.playSequence(
        [
          { samples: state.lastOutcome.attempt.samples, sampleRate: state.lastOutcome.attempt.sampleRate, channel: 'r_b' },
          { samples: state.lastOutcome.targetSound.samples, sampleRate: state.lastOutcome.targetSound.sampleRate, channel: 'r_a' }
        ],
        240
      );
    });
    $('btn-res-share').addEventListener('click', function () {
      if (!state.lastOutcome) return;
      var o = state.lastOutcome;
      var sName = getSampleName(o.targetSound);
      var reportText = TootLabs.Store.buildComparisonReportText(o.targetSound, o.attempt, o.attempt.result, o.exactScore);
      var pdfPayload = { mode: 'comparison', soundA: o.targetSound, soundB: o.attempt, result: o.attempt.result };
      var stitched = stitchComparisonAudio(o.targetSound, o.attempt);
      openShareEmailModal({
        title: 'Share Match Result',
        subtitle: o.attempt.name + ' vs ' + sName + ' (' + o.exactScore.toFixed(1) + '%)',
        onShare: function () {
          shareTextOrAudio('Toot Match Result: ' + o.exactScore.toFixed(1) + '%', reportText, stitched, pdfPayload);
        },
        onEmail: function () {
          emailAnalysisReport('Toot Match Referee Report: ' + o.attempt.name, reportText, pdfPayload, stitched);
        },
        onPdf: function () {
          downloadAnalysisPdf(pdfPayload);
        }
      });
    });

    // Fartnalysis Mode Switcher, Megamix Source Filter & Selectors
    document.querySelectorAll('#fn-mode-tabs .labs-mode-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = this.getAttribute('data-fn-mode');
        if (mode === 'comparison' && state.fnMode !== 'comparison') {
          openFartnalysis('comparison', null, null);
        } else {
          openFartnalysis(mode, state.fnSampleId, state.fnAttemptId);
        }
      });
    });

    if ($('fn-group-filter-bar')) {
      $('fn-group-filter-bar').querySelectorAll('[data-group-source]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setGroupSource(this.getAttribute('data-group-source'));
        });
      });
    }
    if ($('btn-group-shuffle-defaults')) {
      $('btn-group-shuffle-defaults').addEventListener('click', function () {
        state.groupShuffleSeed = (state.groupShuffleSeed || 0) + 1;
        if (state.view === 'fartnalysis' && state.fnMode === 'group') {
          renderFartnalysisView();
        }
      });
    }

    $('fn-sample-select').addEventListener('change', function () {
      var val = this.value || '';
      if (val.indexOf('guess::') === 0) {
        var parts = val.split('::');
        openFartnalysis('guess', parts[2] || null, parts[1] || null);
      } else {
        var targetMode = state.fnMode === 'guess' ? 'original' : state.fnMode;
        openFartnalysis(targetMode, val, null);
      }
    });

    $('fn-guess-select').addEventListener('change', function () {
      state.fnAttemptId = this.value;
      renderFartnalysisView();
    });

    $('btn-fn-back').addEventListener('click', function () {
      var dest = state.prevBeforeFartnalysis || 'home';
      if (dest === 'vault') {
        openVaultView();
      } else if (dest === 'realfake') {
        showView('realfake');
        renderRealFakeStage();
      } else if (dest === 'chain') {
        showView('chain');
      } else if (dest === 'games') {
        openGamesView();
      } else if (dest === 'guess') {
        showView('guess');
        if (state.guessSubMode === 'sequence') renderSequencePane();
        else if (state.guessSubMode === 'quickfire') renderQuickFirePane();
        else if (state.guessSubMode === 'blind') renderBlindPane();
        else renderGuessView();
      } else {
        openHomeView();
      }
    });

    $('btn-fn-go-guess').addEventListener('click', function () {
      openVaultView();
    });

    document.querySelectorAll('#fn-side-tabs .labs-fn-side-tab[data-fn-jump]').forEach(function (stab) {
      stab.addEventListener('click', function () {
        var key = this.getAttribute('data-fn-jump');
        document.querySelectorAll('#fn-side-tabs .labs-fn-side-tab').forEach(function (el) {
          el.classList.toggle('active', el === stab);
        });
        var rootEl = $('labs-view-fartnalysis');
        if (!rootEl || !key) return;
        var target =
          rootEl.querySelector('[data-fn-sec="' + key + '"]') ||
          (key === 'environment' ? rootEl.querySelector('[data-fn-sec="criteria"]') : null) ||
          rootEl.querySelector('[data-fn-sec="notes"]');
        if (target && typeof target.scrollIntoView === 'function') {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch (e) {
            target.scrollIntoView();
          }
        }
      });
    });

    if ($('btn-team-back')) {
      $('btn-team-back').addEventListener('click', function () {
        var backTo = state.prevNonTeamView && state.prevNonTeamView !== 'team' ? state.prevNonTeamView : 'home';
        if (backTo === 'vault') openVaultView();
        else if (backTo === 'home') openHomeView();
        else showView(backTo);
      });
    }

    var skipAnalysisBtn = $('btn-labs-an-skip');
    if (skipAnalysisBtn) {
      skipAnalysisBtn.addEventListener('click', function () {
        if (typeof state.analysisDoneCb === 'function') state.analysisDoneCb();
      });
    }

    document.querySelectorAll('.labs-rec-mode-btn[data-rec-mode]').forEach(function (modeBtn) {
      modeBtn.addEventListener('click', function () {
        setRecordMode(this.getAttribute('data-rec-mode'));
      });
    });

    var resizeDebounceId = null;
    root.addEventListener('resize', function () {
      if (resizeDebounceId) clearTimeout(resizeDebounceId);
      resizeDebounceId = setTimeout(function () {
        resizeDebounceId = null;
        if (state.view === 'home') {
          drawVaultWaveforms('home-recent-vault');
          renderHomeOscilloscope();
        } else if (state.view === 'vault') drawVaultWaveforms('vault-grid');
        else if (state.view === 'detail') drawDetailWaveform(null);
        else if (state.view === 'guess') {
          drawGuessWaveforms();
          if (state.revealSpecA) state.revealSpecA.resize();
          if (state.revealSpecB) state.revealSpecB.resize();
          if (state.inlineSpecA) state.inlineSpecA.resize();
          if (state.inlineSpecB) state.inlineSpecB.resize();
        } else if (state.view === 'fartnalysis' && state.fnController) {
          state.fnController.resize();
        } else if (state.view === 'chain' && TootLabs.SignalChain && TootLabs.SignalChain.resize) {
          TootLabs.SignalChain.resize();
        }
      }, 120);
    });
  }

  function isAnyModalOrOverlayOpen() {
    if (state.revealInProgress || state.analysisDoneCb) return true;
    var blockerIds = [
      'labs-analysis-overlay',
      'labs-rename-modal',
      'labs-delete-modal',
      'labs-share-modal',
      'labs-chart-modal',
      'labs-about-modal',
      'labs-splash-modal',
      'labs-settings-modal',
      'labs-settings-menu'
    ];
    for (var i = 0; i < blockerIds.length; i++) {
      var el = $(blockerIds[i]);
      if (el && !el.classList.contains('hidden')) return true;
    }
    return false;
  }

  function handleSwipeNavigation(dx, dy, elapsedMs) {
    if (state.qfActive) return false;
    if (TootApp.Audio && typeof TootApp.Audio.isRecordingOrStarting === 'function' && TootApp.Audio.isRecordingOrStarting()) {
      return false;
    }
    if (isAnyModalOrOverlayOpen()) return false;
    var absX = Math.abs(dx);
    var absY = Math.abs(dy);
    if (absX < 58 || absX < absY * 1.45 || elapsedMs > 700) return false;

    var swipeLeft = dx < 0;
    var swipeRight = dx > 0;
    var cur = state.view;

    if (cur === 'home' && swipeLeft) {
      openVaultView();
      return true;
    }
    if (cur === 'vault' && swipeRight) {
      openHomeView();
      return true;
    }
    if (cur === 'vault' && swipeLeft) {
      openFartnalysis(state.fnMode || 'original', state.fnSampleId, state.fnAttemptId);
      return true;
    }
    if (cur === 'fartnalysis' && swipeRight) {
      openVaultView();
      return true;
    }
    if (cur === 'guess' && swipeRight) {
      if (state.guessSubMode === 'quickfire' || state.guessSubMode === 'sequence') {
        setGuessSubMode('standard');
        return true;
      }
      openHomeView();
      return true;
    }
    if (cur === 'realfake' && swipeRight) {
      openHomeView();
      return true;
    }
    if (cur === 'detail' && swipeRight) {
      openVaultView();
      return true;
    }
    if (cur === 'team' && swipeRight) {
      var backTo = state.prevNonTeamView && state.prevNonTeamView !== 'team' ? state.prevNonTeamView : 'home';
      if (backTo === 'home') openHomeView();
      else if (backTo === 'vault') openVaultView();
      else {
        showView(backTo);
        if (backTo === 'guess') renderGuessView();
        else if (backTo === 'fartnalysis') renderFartnalysisView();
      }
      return true;
    }
    return false;
  }

  function initSwipeNavigation() {
    if (!document || typeof document.addEventListener !== 'function') return;
    var swipeStart = null;
    document.addEventListener(
      'touchstart',
      function (ev) {
        if (!ev.touches || ev.touches.length !== 1) {
          swipeStart = null;
          return;
        }
        var tgt = ev.target;
        var blocked =
          tgt &&
          typeof tgt.closest === 'function' &&
          Boolean(
            tgt.closest(
              'canvas, input, select, textarea, button, a, [data-no-swipe], .labs-fn-glb-pills, .labs-group-filter-pills, .labs-vault-tabs, .labs-3d-wrap, .labs-modal, .labs-overlay, .labs-settings-menu'
            )
          );
        var touch = ev.touches[0];
        swipeStart = {
          x: touch.clientX,
          y: touch.clientY,
          t: Date.now(),
          ignore: blocked
        };
      },
      { passive: true }
    );

    document.addEventListener(
      'touchend',
      function (ev) {
        if (!swipeStart || swipeStart.ignore || !ev.changedTouches || ev.changedTouches.length !== 1) {
          swipeStart = null;
          return;
        }
        var touch = ev.changedTouches[0];
        var dx = touch.clientX - swipeStart.x;
        var dy = touch.clientY - swipeStart.y;
        var dt = Date.now() - swipeStart.t;
        swipeStart = null;
        handleSwipeNavigation(dx, dy, dt);
      },
      { passive: true }
    );
  }

  function bootstrap() {
    var isFile = root.location && root.location.protocol === 'file:';
    if (isFile || !navigator.mediaDevices) {
      $('labs-file-banner').classList.remove('hidden');
      $('labs-mic-drawer').classList.remove('hidden');
    }

    initMicControls();
    initModals();
    initNavigationAndActions();
    if (TootLabs.SignalChain && typeof TootLabs.SignalChain.init === 'function') {
      TootLabs.SignalChain.init({
        getSamples: function () { return state.samples; },
        ensureTargetReady: ensureTargetReady,
        getSampleName: getSampleName,
        drawStaticWaveform: drawStaticWaveform,
        drawLiveWaveform: drawLiveWaveform,
        showView: showView,
        showToast: showToast,
        openComparePair: openCustomFartnalysisPair,
        onExit: openGamesView
      });
    }
    initSwipeNavigation();
    if (document.body && typeof document.body.setAttribute === 'function') {
      document.body.setAttribute('data-labs-view', state.view || 'home');
    }
    setRecordMode(state.recordMode);

    var seenSplash = false;
    try {
      seenSplash = typeof localStorage !== 'undefined' && localStorage && localStorage.getItem('toot_labs_seen_splash_v1') === '1';
    } catch (e) {}
    if (!seenSplash) {
      openSplashModal();
    }

    Promise.all([TootLabs.Store.loadVaultSamples(), refreshAllAttemptsCache(true)])
      .then(function (res) {
        state.samples = res[0] || [];
        if (state.samples.length > 0) {
          state.guessTargetId = state.samples[0].id;
          state.fnSampleId = state.samples[0].id;
        }
        renderHomeView();
      })
      .catch(function (err) {
        showToast('Vault initialization failed: ' + (err && err.message ? err.message : err), true);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  TootLabs.App = {
    getState: function () { return state; },
    showView: showView,
    openSequenceMode: openSequenceMode,
    openRealFakeView: openRealFakeView,
    resealVaultAndReturn: resealVaultAndReturn,
    handleSwipeNavigation: handleSwipeNavigation,
    openTeamView: openTeamView,
    openAboutModal: openAboutModal,
    openShareEmailModal: openShareEmailModal,
    closeShareEmailModal: closeShareEmailModal,
    openSplashModal: openSplashModal,
    closeSplashModal: closeSplashModal,
    openGuessMode: openGuessMode,
    openQuickFireMode: openQuickFireMode,
    setQuickFireCount: setQuickFireCount,
    createQuickFireAutoDetector: createQuickFireAutoDetector,
    startQuickFireRound: startQuickFireRound,
    abortQuickFireRound: abortQuickFireRound,
    setGuessSubMode: setGuessSubMode,
    setGuessMode: setGuessMode,
    renderGuessView: renderGuessView,
    revealNextGuessHint: revealNextGuessHint,
    playFartFirst: playFartFirst,
    triggerRevealAndAnalyze: triggerRevealAndAnalyze,
    addAnotherGuesser: addAnotherGuesser,
    analyzeSessionGuesses: analyzeSessionGuesses,
    analyzeBlindSession: analyzeBlindSession,
    pickRandomGuessTarget: pickRandomGuessTarget,
    openFartnalysis: openFartnalysis,
    getVaultBuckets: getVaultBuckets,
    setVaultFilter: setVaultFilter,
    setVaultSelectMode: setVaultSelectMode,
    toggleVaultSelection: toggleVaultSelection,
    selectAllVisibleVaultItems: selectAllVisibleVaultItems,
    promptVaultDelete: promptVaultDelete,
    getMegamixSourceBucket: getMegamixSourceBucket,
    setGroupSource: setGroupSource,
    setRecordMode: setRecordMode,
    pickAnalysisStages: pickAnalysisStages,
    runAnalysisSequence: runAnalysisSequence
  };
})(typeof window !== 'undefined' ? window : globalThis);
