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
    samples: [],
    vaultFilter: 'all',
    detailSampleId: null,
    detailAttempts: [],
    guessTargetId: null,
    guessAttempts: [],
    pendingGuess: null,
    sessionGuesses: [],
    lastSessionResults: [],
    guessSubMode: 'standard',
    guessMode: 'guess',
    guessRevealed: false,
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
    groupSortBy: 'pitch',
    groupSortDir: 'asc',
    renameTarget: null,
    activeRecStopper: null,
    activeRecCanceller: null,
    recordingKind: null,
    recordMode: 'auto',
    inlineSpecA: null,
    inlineSpecB: null,
    resultTimers: [],
    vaultDoorTimers: [],
    analysisTimers: [],
    analysisDoneCb: null,
    autoDetectMsgTimer: null,
    resultCounterRaf: null,
    confettiHandle: null,
    toastTimer: null
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

  /* ==================== WAVEFORM RENDERERS ==================== */
  function sizeCanvasDpr(canvas, fallbackW, fallbackH) {
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
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
    var sized = sizeCanvasDpr(canvas, opts.fallbackW || 280, opts.fallbackH || 54);
    if (!sized) return;
    var ctx = sized.ctx, w = sized.w, h = sized.h;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(55, 65, 81, 0.7)';
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
        ctx.fillStyle = frac <= progress ? (opts.activeColor || '#FFFFFF') : 'rgba(96, 165, 250, 0.38)';
      } else {
        ctx.fillStyle = grad;
      }
      ctx.fillRect(x, y, barWidth, barH);
    }

    if (progress !== null) {
      var px = progress * w;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 2);
      ctx.lineTo(px, h - 2);
      ctx.stroke();
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
    ctx.fillText('ORIGINAL FART', 8, 13);
    ctx.fillStyle = '#FED7AA';
    ctx.fillText('YOUR GUESS', 8, h * 0.5 + 14);
  }

  /* ==================== ANIMATION CLEANUP ==================== */
  var ANALYSIS_OPENING_POOL = [
    'Capturing acoustic signatures...',
    'Generating waveform model...'
  ];

  var ANALYSIS_COMPARISON_OPENING_POOL = [
    'Locking onto Mystery Fart evidence...',
    'Aligning guess & original waveforms...'
  ];

  var ANALYSIS_RESULTS_CORE_POOL = [
    'Comparing onset timing & attack snap...',
    'Measuring pitch delta & cheek resonance...',
    'Cross-correlating flutter RPM cadence...',
    'Weighing pressure decay & tail sputter...',
    'Running A.S.S. 22-dimension comparison...',
    'Evaluating 3D spectrogram peak overlap...',
    'Scoring vocal-tract forgery fidelity...',
    'Comparing airflow turbulence dynamics...'
  ];

  var ANALYSIS_STANDARD_POOL = [
    'Calibrating frequency spectrum...',
    'Calculating cheek resonance...',
    'Consulting historical fart archive...',
    'Analyzing harmonic distribution...',
    'Computing pressure profile...',
    'Matching turbulence characteristics...',
    'Comparing resonance events...',
    'Detecting acoustic anomalies...',
    'Evaluating authenticity indicators...',
    'Running temporal analysis...',
    'Examining frequency structures...',
    'Calculating moisture estimate...',
    'Reviewing historical specimens...',
    'Performing multi-dimensional comparison...',
    'Analyzing waveform morphology...',
    'Detecting airflow irregularities...',
    'Processing gastrointestinal acoustics...',
    'Evaluating sonic fingerprints...',
    'Reconstructing emission profile...',
    'Checking for suspicious facial involvement...',
    'Estimating neighbour awareness risk...',
    'Validating laboratory findings...'
  ];

  var ANALYSIS_SCIENTIST_UPDATES = [
    'Professor Bottomsworth reviews the evidence...',
    'Dr. Flatley checks the similarity math...',
    'Dr. Wobble inspects the 3D peaks...',
    'Dr. Turbulence measures cheek rumble...',
    'Dr. Pufferton updates the archive log...'
  ];

  var ANALYSIS_RARE_POOL = [
    'Laboratory disagreement detected...',
    'Science team requests more coffee...',
    'This comparison is eerily close...',
    'Unexpected harmonic behaviour!',
    'Results under emergency peer review...'
  ];

  var AUTO_DETECT_WAIT_MESSAGES = [
    'Listening for emissions...',
    'Monitoring acoustic activity...',
    'Awaiting gastrointestinal event...',
    'Acoustic sensors armed...',
    'Standing by...',
    'Monitoring pressure conditions...'
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

  function pickAnalysisStages(context) {
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
      text: isResults ? 'Determining winner...' : 'Finalizing laboratory verdict...',
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

  function runAnalysisSequence(opts, onComplete) {
    clearAnalysisSequence();
    opts = opts || {};

    var isFastCmp = opts.context === 'comparison';
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
      titleEl.textContent = opts.title || (isFastCmp ? 'ANALYZING RESULTS' : 'ANALYZING RECORDING');
    }
    if (consensusEl) consensusEl.classList.add('hidden');

    var stages = pickAnalysisStages(opts.context);
    var finished = false;

    function finishNow(immediate) {
      if (finished) return;
      finished = true;
      for (var t = 0; t < state.analysisTimers.length; t++) {
        clearTimeout(state.analysisTimers[t]);
      }
      state.analysisTimers = [];
      state.analysisDoneCb = null;

      if (immediate) {
        if (consensusEl) consensusEl.classList.add('hidden');
        overlay.classList.add('hidden');
        overlay.classList.remove('fading-out');
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      if (TootLabs.AudioFx && typeof TootLabs.AudioFx.playAnalysisComplete === 'function') {
        TootLabs.AudioFx.playAnalysisComplete();
      }
      if (pctEl) pctEl.textContent = '100%';
      if (barEl) barEl.style.width = '100%';
      if (consensusEl) consensusEl.classList.remove('hidden');

      var fadeTimer = setTimeout(function () {
        overlay.classList.add('fading-out');
        var endTimer = setTimeout(function () {
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

    var elapsed = 0;
    for (var sIdx = 0; sIdx < stages.length; sIdx++) {
      (function (index, stage) {
        var rowEl = null;
        var startTimer = setTimeout(function () {
          if (finished) return;
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
          ? 'Sentry mode armed — beeps on start & stop, auto-saved to Vault.'
          : 'Manual 1-tap capture — beeps on start & stop, saved to Vault.';
    }
  }

  function clearRevealTimers() {
    if (state.revealTimerId) {
      clearTimeout(state.revealTimerId);
      state.revealTimerId = null;
    }
    if (state.revealFallbackTimerId) {
      clearTimeout(state.revealFallbackTimerId);
      state.revealFallbackTimerId = null;
    }
    state.revealInProgress = false;
    if (root.TootApp && root.TootApp.Audio && typeof root.TootApp.Audio.stopChannel === 'function') {
      root.TootApp.Audio.stopChannel('guess_reveal');
    }
    var revBanner = $('guess-reveal-banner');
    var revBar = $('guess-reveal-bar');
    if (revBanner) revBanner.classList.add('hidden');
    if (revBar) revBar.classList.remove('filling');
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
      stage.classList.remove('sealed', 'opening');
      stage.classList.add('opened');
    }
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
    }
    if (prevView === 'vault' && viewKey !== 'vault') {
      dismissVaultDoorImmediate();
    }
    if (viewKey !== 'team' && prevView !== 'team') {
      state.prevNonTeamView = prevView;
    }
    state.view = viewKey;

    var brandSub = $('labs-brand-sub');
    if (brandSub) {
      brandSub.textContent =
        viewKey === 'fartnalysis'
          ? 'INSTITUTE OF ACOUSTIC FLATULENCE RESEARCH · FARTNALYSIS REPORT'
          : viewKey === 'team'
          ? 'INSTITUTE OF ACOUSTIC FLATULENCE RESEARCH'
          : 'GUESS THE FART · ACOUSTIC LAB';
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
        : 'home';

    var navBtns = document.querySelectorAll('.labs-nav-btn');
    for (var n = 0; n < navBtns.length; n++) {
      navBtns[n].classList.toggle('active', navBtns[n].getAttribute('data-view') === navTarget);
    }

    if (typeof root.scrollTo === 'function') {
      root.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (viewKey === 'vault' && prevView !== 'vault' && prevView !== 'detail') {
      triggerVaultDoorOpen();
    }
    if (viewKey === 'team') {
      renderTeamView();
    }

    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        if (viewKey === 'home') drawVaultWaveforms('home-recent-vault');
        else if (viewKey === 'vault') drawVaultWaveforms('vault-grid');
        else if (viewKey === 'detail') drawDetailWaveform(null);
        else if (viewKey === 'guess') {
          drawGuessWaveforms();
          if (state.inlineSpecA) state.inlineSpecA.resize();
          if (state.inlineSpecB) state.inlineSpecB.resize();
        } else if (viewKey === 'fartnalysis' && state.fnController) state.fnController.resize();
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
        if (!state.fnSampleId) state.fnSampleId = saved.id;

        renderHomeView();
        renderVaultView();
        if (state.view === 'guess') renderGuessView();

        runAnalysisSequence(
          {
            context: 'specimen',
            title: 'ANALYZING RECORDING',
            subtitle: 'Cataloging "' + getSampleName(saved) + '" in Bio-Acoustic Vault'
          },
          function () {
            bar.classList.add('hidden');
            if (state.view === 'guess') renderGuessView();
            showToast('Saved "' + getSampleName(saved) + '" to Fart Vault!');
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

  function refreshAllAttemptsCache() {
    if (!TootLabs.Store || typeof TootLabs.Store.loadAllAttempts !== 'function') {
      return Promise.resolve(state.allAttemptsCache || []);
    }
    return TootLabs.Store.loadAllAttempts()
      .then(function (list) {
        state.allAttemptsCache = Array.isArray(list) ? list : [];
        return state.allAttemptsCache;
      })
      .catch(function () {
        return state.allAttemptsCache || [];
      });
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

  function buildVaultCardHtml(s) {
    var st = TootLabs.Store.getSampleStats(s.id);
    var name = getSampleName(s);
    var isDef = Boolean(s.isBuiltIn);
    var hasAudio = Boolean(s.samples && s.samples.length > 0);
    var dur = hasAudio ? (s.samples.length / (s.sampleRate || 44100)).toFixed(2) + 's' : 'Ready';
    var dateLbl = isDef ? 'Pre-loaded Default' : formatDateShort(s.createdAt);
    var bestTxt = st.attemptCount > 0 ? st.bestScore.toFixed(1) + '%' : '—';
    var attTxt = st.attemptCount === 1 ? '1 Guess' : st.attemptCount + ' Guesses';
    var packBadge = isDef
      ? '<span class="labs-chip labs-chip-blue labs-vc-tag">📦 Default Fart</span>'
      : '<span class="labs-chip labs-chip-green labs-vc-tag">🎙️ Recorded Fart</span>';

    return (
      '<article class="labs-vault-card ' + (isDef ? 'labs-vc-kind-default' : 'labs-vc-kind-recorded') + '" data-open-id="' + esc(s.id) + '" data-vc-kind="' + (isDef ? 'default' : 'recorded') + '" tabindex="0">' +
      '  <div class="labs-vc-top">' +
      '    <div>' +
      '      <div class="labs-vc-name">' + esc(name) + packBadge + '</div>' +
      '      <div class="labs-vc-date">' + esc(dateLbl) + ' · ' + dur + ' · ' + esc(attTxt) + '</div>' +
      '    </div>' +
      '    <div class="labs-vc-score-block">' +
      '      <div class="labs-vc-best-lbl">Best Guess</div>' +
      '      <div class="labs-vc-best-val">' + bestTxt + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-vc-wave-wrap">' +
      '    <canvas class="labs-vc-wave" data-wave-id="' + esc(s.id) + '"></canvas>' +
      '  </div>' +
      '  <div class="labs-vc-action-grid">' +
      '    <button type="button" class="labs-vc-btn vc-play" data-vc-act="play" data-vc-id="' + esc(s.id) + '">▶ Play</button>' +
      '    <button type="button" class="labs-vc-btn vc-analyze" data-vc-act="analyze" data-vc-id="' + esc(s.id) + '">🧪 Analyze</button>' +
      '    <button type="button" class="labs-vc-btn vc-guess" data-vc-act="guess" data-vc-id="' + esc(s.id) + '">🎯 Guess This Fart</button>' +
      '  </div>' +
      '</article>'
    );
  }

  function buildVaultGuessCardHtml(att) {
    var parent = getSampleById(att.sampleId);
    var parentName = parent ? getSampleName(parent) : 'Saved Fart';
    var dur = att.samples && att.samples.length ? (att.samples.length / (att.sampleRate || 44100)).toFixed(2) + 's' : '0.00s';
    var score = typeof att.exactScore === 'number' ? att.exactScore : 0;
    var rank = TootLabs.Store.getRankForScore(score);

    return (
      '<article class="labs-vault-card labs-vc-kind-guess" data-open-guess-id="' + esc(att.id) + '" data-open-guess-sample="' + esc(att.sampleId || '') + '" data-vc-kind="guess" tabindex="0">' +
      '  <div class="labs-vc-top">' +
      '    <div>' +
      '      <div class="labs-vc-name">' + esc(att.name || 'Recorded Guess') + '<span class="labs-chip labs-chip-orange labs-vc-tag">🎤 Recorded Guess</span></div>' +
      '      <div class="labs-vc-date">Guess of ' + esc(parentName) + ' · ' + esc(formatDateShort(att.createdAt)) + ' · ' + dur + '</div>' +
      '    </div>' +
      '    <div class="labs-vc-score-block">' +
      '      <div class="labs-vc-best-lbl">Match Score</div>' +
      '      <span class="labs-vc-best-val" style="color:' + rank.color + '">' + score.toFixed(1) + '%</span>' +
      '      <div class="labs-vc-rank-sub">' + esc(rank.title) + '</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-vc-wave-wrap">' +
      '    <canvas class="labs-vc-wave" data-guess-wave-id="' + esc(att.id) + '"></canvas>' +
      '  </div>' +
      '  <div class="labs-vc-action-grid">' +
      '    <button type="button" class="labs-vc-btn vc-play" data-vg-act="play" data-vg-id="' + esc(att.id) + '">▶ Play</button>' +
      '    <button type="button" class="labs-vc-btn vc-analyze" data-vg-act="analyze" data-vg-id="' + esc(att.id) + '" data-vg-sample="' + esc(att.sampleId || '') + '">🧪 Analyze</button>' +
      '    <button type="button" class="labs-vc-btn vc-compare" data-vg-act="compare" data-vg-id="' + esc(att.id) + '" data-vg-sample="' + esc(att.sampleId || '') + '">⚖️ Compare</button>' +
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
    containerEl.querySelectorAll('[data-vc-act]').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var act = this.getAttribute('data-vc-act');
        var id = this.getAttribute('data-vc-id');
        var sample = getSampleById(id);
        if (!sample) return;

        if (act === 'play') {
          if (sample.samples && sample.samples.length > 0) {
            try {
              var pRes = TootApp.Audio.playSound(sample.samples, sample.sampleRate, { channel: 'vault_play' });
              if (pRes && typeof pRes.catch === 'function') pRes.catch(function () {});
            } catch (e) {}
          } else {
            ensureTargetReady(sample)
              .then(function (loaded) {
                if (loaded && loaded.samples) {
                  drawVaultWaveforms(containerEl.id);
                  return TootApp.Audio.playSound(loaded.samples, loaded.sampleRate, { channel: 'vault_play' });
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
        var resolvedSampleId = sampleId || att.sampleId;

        if (act === 'play') {
          if (att.samples && att.samples.length > 0) {
            try {
              var gPlay = TootApp.Audio.playSound(att.samples, att.sampleRate || 44100, { channel: 'vault_guess_play' });
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
      card.addEventListener('click', function () {
        openSampleDetail(this.getAttribute('data-open-id'));
      });
      card.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openSampleDetail(this.getAttribute('data-open-id'));
        }
      });
    });

    containerEl.querySelectorAll('.labs-vault-card[data-open-guess-id]').forEach(function (card) {
      function openGuessFromCard() {
        var attId = card.getAttribute('data-open-guess-id');
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
    for (var i = 0; i < canvases.length; i++) {
      var id = canvases[i].getAttribute('data-wave-id');
      var sample = getSampleById(id);
      if (sample && sample.samples && sample.samples.length > 0) {
        drawStaticWaveform(canvases[i], sample.samples, {
          fallbackW: 260,
          fallbackH: 44,
          colorA: sample.isBuiltIn ? '#60A5FA' : '#22C55E',
          colorB: sample.isBuiltIn ? '#818CF8' : '#34D399'
        });
      } else if (sample && typeof canvases[i].getContext === 'function') {
        var ctx = canvases[i].getContext('2d');
        var cw = canvases[i].width || 260;
        var ch = canvases[i].height || 44;
        if (ctx && typeof ctx.clearRect === 'function') {
          ctx.clearRect(0, 0, cw, ch);
          ctx.fillStyle = '#93C5FD';
          ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Pre-loaded Default · Tap Play to load', cw * 0.5, ch * 0.56);
        }
      }
    }

    var guessCanvases = document.querySelectorAll('#' + containerId + ' canvas[data-guess-wave-id]');
    for (var j = 0; j < guessCanvases.length; j++) {
      var gId = guessCanvases[j].getAttribute('data-guess-wave-id');
      var att = findAttemptInCacheById(gId);
      if (att && att.samples && att.samples.length > 0) {
        drawStaticWaveform(guessCanvases[j], att.samples, {
          fallbackW: 260,
          fallbackH: 44,
          colorA: '#F97316',
          colorB: '#FACC15'
        });
      }
    }
  }

  /* ==================== AREA 1: HOME ==================== */
  function renderHomeView() {
    var summary = TootLabs.Store.getSummaryStats(state.samples);
    $('stat-samples-recorded').textContent = String(summary.samplesRecorded);
    $('stat-best-score').textContent = summary.bestMatchScore.toFixed(1) + '%';
    $('stat-challenges-completed').textContent = String(summary.challengesCompleted);
    $('stat-avg-quality').textContent = summary.averageMatchQuality.toFixed(1) + '%';

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
    recentEl.innerHTML = topSamples.map(buildVaultCardHtml).join('');
    wireVaultCards(recentEl);
    drawVaultWaveforms('home-recent-vault');
  }

  /* ==================== AREA 2: VAULT ==================== */
  function renderVaultView() {
    var grid = $('vault-grid');
    var filterBar = $('vault-filter-bar');
    var buckets = getVaultBuckets();
    if (filterBar) {
      filterBar.classList.remove('hidden');
      var fBtns = filterBar.querySelectorAll('[data-vault-filter]');
      for (var i = 0; i < fBtns.length; i++) {
        var key = fBtns[i].getAttribute('data-vault-filter');
        fBtns[i].classList.toggle('active', key === state.vaultFilter);
        if (key === 'all') fBtns[i].textContent = 'All (' + buckets.counts.all + ')';
        else if (key === 'recorded') fBtns[i].textContent = '🎙️ Recorded Farts (' + buckets.counts.recorded + ')';
        else if (key === 'guesses') fBtns[i].textContent = '🎤 Recorded Guesses (' + buckets.counts.guesses + ')';
        else if (key === 'defaults') fBtns[i].textContent = '📦 Default Farts (' + buckets.counts.defaults + ')';
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

    function buildVaultGroupHtml(kind, chipClass, title, subtitle, count, cardsHtml) {
      return (
        '<section class="labs-vault-group labs-vault-group-' + kind + '" data-vault-group="' + kind + '">' +
        '  <div class="labs-vault-group-head">' +
        '    <div class="labs-vault-group-title-wrap">' +
        '      <span class="labs-vault-group-title">' + title + '</span>' +
        '      <span class="labs-vault-group-sub">' + subtitle + '</span>' +
        '    </div>' +
        '    <span class="labs-chip ' + chipClass + '">' + count + '</span>' +
        '  </div>' +
        '  <div class="labs-vault-grid">' + cardsHtml + '</div>' +
        '</section>'
      );
    }

    var filter = state.vaultFilter || 'all';
    if (filter === 'recorded') {
      if (buckets.recorded.length === 0) {
        grid.innerHTML =
          '<div class="labs-glass-card labs-empty-card">' +
          '  <h3>No Recorded Farts Yet</h3>' +
          '  <p>Go to <strong>Home</strong> and tap <strong>Record New Fart</strong> to record your own real fart.</p>' +
          '</div>';
        return;
      }
      grid.innerHTML = buildVaultGroupHtml(
        'recorded',
        'labs-chip-green',
        '🎙️ User Recorded Farts',
        'Real farts recorded from Home',
        buckets.recorded.length,
        buckets.recorded.map(buildVaultCardHtml).join('')
      );
    } else if (filter === 'guesses') {
      if (buckets.guesses.length === 0) {
        grid.innerHTML =
          '<div class="labs-glass-card labs-empty-card">' +
          '  <h3>No Recorded Guesses Yet</h3>' +
          '  <p>Play <strong>Guess The Fart</strong> or <strong>Mimic Mode</strong> to log your guesses here.</p>' +
          '</div>';
        return;
      }
      grid.innerHTML = buildVaultGroupHtml(
        'guesses',
        'labs-chip-orange',
        '🎤 User Recorded Guesses',
        'Your guess & mimic recordings',
        buckets.guesses.length,
        buckets.guesses.map(buildVaultGuessCardHtml).join('')
      );
    } else if (filter === 'defaults') {
      if (buckets.defaults.length === 0) {
        grid.innerHTML =
          '<div class="labs-glass-card labs-empty-card">' +
          '  <h3>No Pre-Loaded Default Farts Found</h3>' +
          '  <p>Add .wav or .mp3 files into <strong>VaultPreLoads/</strong> to populate the Default Pack.</p>' +
          '</div>';
        return;
      }
      grid.innerHTML = buildVaultGroupHtml(
        'defaults',
        'labs-chip-blue',
        '📦 Pre-Loaded Default Farts',
        'Built-in default specimen pack',
        buckets.defaults.length,
        buckets.defaults.map(buildVaultCardHtml).join('')
      );
    } else {
      var sectionsHtml = '';
      if (buckets.recorded.length > 0) {
        sectionsHtml += buildVaultGroupHtml(
          'recorded',
          'labs-chip-green',
          '🎙️ User Recorded Farts',
          'Real farts recorded from Home',
          buckets.recorded.length,
          buckets.recorded.map(buildVaultCardHtml).join('')
        );
      }
      if (buckets.guesses.length > 0) {
        sectionsHtml += buildVaultGroupHtml(
          'guesses',
          'labs-chip-orange',
          '🎤 User Recorded Guesses',
          'Your guess & mimic recordings',
          buckets.guesses.length,
          buckets.guesses.map(buildVaultGuessCardHtml).join('')
        );
      }
      if (buckets.defaults.length > 0) {
        sectionsHtml += buildVaultGroupHtml(
          'defaults',
          'labs-chip-blue',
          '📦 Pre-Loaded Default Farts',
          'Built-in default specimen pack',
          buckets.defaults.length,
          buckets.defaults.map(buildVaultCardHtml).join('')
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
      showView('vault');
      return;
    }

    var stats = TootLabs.Store.getSampleStats(sample.id);
    var feat = sample.features || TootApp.DSP.extractFeatures(sample.samples, sample.sampleRate);
    sample.features = feat;
    var prof = TootApp.DSP.describeSoundProfile(feat);

    if ($('detail-sample-eyebrow')) {
      $('detail-sample-eyebrow').textContent = sample.isBuiltIn ? '📦 PRE-LOADED DEFAULT FART' : '🎙️ USER RECORDED FART';
    }
    if ($('btn-detail-delete')) {
      $('btn-detail-delete').classList.toggle('hidden', Boolean(sample.isBuiltIn));
    }
    $('detail-specimen-id').textContent = 'SPECIMEN ID · ' + sample.id.slice(-8).toUpperCase();
    $('detail-sample-name').textContent = getSampleName(sample);
    $('detail-sample-dur').textContent = (sample.samples.length / sample.sampleRate).toFixed(2) + 's';
    $('detail-sample-meta').textContent = (sample.isBuiltIn ? 'Pre-loaded Default Pack' : formatTimeShort(sample.createdAt)) + ' · ' + prof.pitchLabel + ' · ' + prof.textureLabel;

    $('detail-best-score').textContent = stats.attemptCount > 0 ? stats.bestScore.toFixed(1) + '%' : '—';
    $('detail-prev-score').textContent = typeof stats.previousScore === 'number' ? stats.previousScore.toFixed(1) + '%' : '—';
    $('detail-latest-score').textContent = typeof stats.latestScore === 'number' ? stats.latestScore.toFixed(1) + '%' : '—';
    $('detail-attempt-count').textContent = String(stats.attemptCount || 0);

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
      drawStaticWaveform(waveCanvas, target.samples, { fallbackW: 480, fallbackH: 46 });
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
        ? 'Recorded Original Fart: "' + getSampleName(state.blindOriginal) + '" (' + (state.blindOriginal.samples.length / state.blindOriginal.sampleRate).toFixed(2) + 's) — Saved to Vault!'
        : 'No original fart recorded yet for this blind round.';
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

  function setGuessSubMode(subMode) {
    clearRevealTimers();
    var next = subMode === 'blind' ? 'blind' : 'standard';
    state.guessSubMode = next;
    var stdPane = $('guess-standard-pane');
    var blindPane = $('guess-blind-pane');
    if (stdPane) stdPane.classList.toggle('hidden', next !== 'standard');
    if (blindPane) blindPane.classList.toggle('hidden', next !== 'blind');
    if (next === 'blind') renderBlindPane();
    else renderGuessView();
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

    if (target) {
      var hasAudio = Boolean(target.samples && target.samples.length > 0);
      if (clueIcon) clueIcon.textContent = isHiddenGuess ? '🔒' : '🔊';
      if (clueName) clueName.textContent = getSampleName(target);
      if (clueDur) {
        clueDur.textContent = hasAudio ? (target.samples.length / target.sampleRate).toFixed(2) + 's' : 'Ready';
        clueDur.classList.toggle('hidden', isHiddenGuess || !hasAudio);
      }
      if (clueMeta) {
        if (isHiddenGuess) {
          clueMeta.textContent = 'Mystery audio hidden until reveal';
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
    } else {
      if (clueIcon) clueIcon.textContent = '💨';
      if (clueName) clueName.textContent = 'No Fart Selected';
      if (clueDur) clueDur.classList.add('hidden');
      if (clueMeta) clueMeta.textContent = 'Record a fart on Home first.';
      if (waveWrap) waveWrap.classList.add('hidden');
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
            recSub.textContent = 'Record a fart on Home first';
          } else if (state.guessMode === 'mimic') {
            recSub.textContent = 'Reproduce the fart you just heard';
          } else {
            recSub.textContent = 'Record what you imagine it sounds like';
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
    if (inlineRes) {
      var showRes =
        Boolean(state.lastOutcome) &&
        Boolean(state.lastOutcome.targetSound) &&
        Boolean(target) &&
        state.lastOutcome.targetSound.id === target.id &&
        (state.guessRevealed || state.guessMode === 'mimic');
      inlineRes.classList.toggle('hidden', !showRes);
    }

    renderSessionQueue();
    renderGuessLeaderboard();
    drawGuessWaveforms();
  }

  function openGuessMode(sampleId) {
    TootApp.Audio.stopAll();
    clearRevealTimers();
    clearResultAnimations();

    var resolvedId = sampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id) || null;
    state.guessTargetId = resolvedId;
    state.guessSubMode = 'standard';
    state.guessMode = 'guess';
    state.guessRevealed = false;
    state.pickerOpen = false;
    state.historyOpen = false;
    state.sessionGuesses = [];
    state.pendingGuess = null;
    state.lastOutcome = null;
    state.lastSessionResults = [];

    var stdPane = $('guess-standard-pane');
    var blindPane = $('guess-blind-pane');
    if (stdPane) stdPane.classList.remove('hidden');
    if (blindPane) blindPane.classList.add('hidden');
    if ($('guess-live-wave')) $('guess-live-wave').classList.add('hidden');
    if ($('guess-rec-status')) $('guess-rec-status').classList.add('hidden');

    if (!resolvedId) {
      state.guessAttempts = [];
      showView('guess');
      renderGuessView();
      return Promise.resolve();
    }

    var target = getSampleById(resolvedId);
    return Promise.all([ensureTargetReady(target), TootLabs.Store.loadAttemptsForSample(resolvedId)])
      .then(function (res) {
        state.guessAttempts = res[1] || [];
        showView('guess');
        renderGuessView();
      })
      .catch(function () {
        return TootLabs.Store.loadAttemptsForSample(resolvedId).then(function (attempts) {
          state.guessAttempts = attempts || [];
          showView('guess');
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
    showToast('🎲 Mystery Fart: "' + getSampleName(chosen) + '"');
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
              drawStaticWaveform($('guess-target-wave'), useTarget.samples, { fallbackW: 480, fallbackH: 46, progress: p });
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

  function triggerRevealAndAnalyze(target, rawGuesses, modeUsed, subtitleLabel, delayMs) {
    if (!target || !rawGuesses || rawGuesses.length === 0) {
      return Promise.resolve([]);
    }
    clearRevealTimers();
    state.lastOutcome = null;
    state.lastSessionResults = [];
    renderGuessView();

    state.revealInProgress = true;
    var waitMs = typeof delayMs === 'number' ? Math.max(0, delayMs) : 1500;
    var banner = $('guess-reveal-banner');
    var txtEl = $('guess-reveal-text');
    var barEl = $('guess-reveal-bar');
    var targetName = getSampleName(target);
    var lockNoun = rawGuesses.length === 1 ? 'Guess locked!' : rawGuesses.length + ' guesses locked!';

    if (banner) banner.classList.remove('hidden');
    if (txtEl) txtEl.textContent = '🔒 ' + lockNoun + ' Revealing "' + targetName + '"…';
    if (barEl) {
      barEl.classList.remove('filling');
      try { void barEl.offsetWidth; } catch (e) {}
      barEl.classList.add('filling');
    }

    return new Promise(function (resolve) {
      state.revealTimerId = setTimeout(function () {
        state.revealTimerId = null;
        state.guessRevealed = true;
        renderGuessView();
        if (txtEl) txtEl.textContent = '🔊 NOW PLAYING: "' + targetName + '" — Listen to how close you got!';

        var done = false;
        function finishReveal() {
          if (done) return;
          done = true;
          if (state.revealFallbackTimerId) {
            clearTimeout(state.revealFallbackTimerId);
            state.revealFallbackTimerId = null;
          }
          var settleDelay = waitMs < 100 ? 15 : 350;
          setTimeout(function () {
            state.revealInProgress = false;
            if (banner) banner.classList.add('hidden');
            if (barEl) barEl.classList.remove('filling');
            var sub = subtitleLabel || ('Guess The Fart · Comparing vs ' + targetName);
            analyzeAndShowResults(target, rawGuesses, sub).then(resolve);
          }, settleDelay);
        }

        var clipMs = Math.round(((target.samples ? target.samples.length : 0) / (target.sampleRate || 44100)) * 1000);
        var fallbackMs = waitMs < 100 ? 45 : Math.min(9500, Math.max(850, clipMs + 650));
        state.revealFallbackTimerId = setTimeout(finishReveal, fallbackMs);

        try {
          var playRes = TootApp.Audio.playSound(target.samples, target.sampleRate, {
            channel: 'guess_reveal',
            onProgress: function (p) {
              if ($('guess-target-wave')) {
                drawStaticWaveform($('guess-target-wave'), target.samples, { fallbackW: 480, fallbackH: 46, progress: p });
              }
            },
            onEnded: function () {
              drawGuessWaveforms();
              finishReveal();
            }
          });
          if (playRes && typeof playRes.catch === 'function') {
            playRes.catch(function () {
              if (waitMs < 100) finishReveal();
              else setTimeout(finishReveal, 500);
            });
          }
        } catch (err) {
          if (waitMs < 100) finishReveal();
          else setTimeout(finishReveal, 500);
        }
      }, waitMs);
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

  function buildComparisonChipMetrics(targetSound, attemptSound, res) {
    var Forensics = root.TootApp && root.TootApp.Forensics;
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
    var authA = TootLabs.Fartnalysis && typeof TootLabs.Fartnalysis.computeAuthenticityAnalysis === 'function' ? TootLabs.Fartnalysis.computeAuthenticityAnalysis(targetSound) : null;
    var authB = TootLabs.Fartnalysis && typeof TootLabs.Fartnalysis.computeAuthenticityAnalysis === 'function' ? TootLabs.Fartnalysis.computeAuthenticityAnalysis(attemptSound) : null;
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
      renderVaultView();

      runAnalysisSequence(
        {
          context: 'comparison',
          title: 'ANALYZING RESULTS',
          subtitle: subtitleLabel || ('Comparing ' + outcomes.length + (outcomes.length === 1 ? ' guess' : ' guesses') + ' against ' + getSampleName(target))
        },
        function () {
          state.guessSubMode = 'standard';
          state.guessRevealed = true;
          var stdPane = $('guess-standard-pane');
          var blindPane = $('guess-blind-pane');
          if (stdPane) stdPane.classList.remove('hidden');
          if (blindPane) blindPane.classList.add('hidden');
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
      if (!opts.immediate && state.guessMode === 'guess' && !state.guessRevealed) {
        return triggerRevealAndAnalyze(useTarget, batch, 'guess', null, opts.delayMs);
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
        renderVaultView();
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
    if (score >= 95) return '🧙 Cheek Sorcery · ' + score.toFixed(1) + '%';
    if (score >= 85) return '🎺 Suspiciously Accurate · ' + score.toFixed(1) + '%';
    if (score >= 70) return '💨 Room-Fooling Forgery · ' + score.toFixed(1) + '%';
    if (score >= 50) return '🌬️ Noble Amateur Effort · ' + score.toFixed(1) + '%';
    if (score >= 25) return '🦆 Bold Audacity · ' + score.toFixed(1) + '%';
    return '💥 Pure Delusion · ' + score.toFixed(1) + '%';
  }

  function pickSoloRowLabel(score) {
    if (score >= 95) return '🧙 Courtroom-Grade Clone';
    if (score >= 85) return '🎺 Honor-Roll Forger';
    if (score >= 70) return '🌬️ Convincing Alibi';
    if (score >= 50) return '🙃 Half-Cooked Toot';
    if (score >= 25) return '🦆 Different Zip Code';
    return '🚨 Lab Evacuated in Confusion';
  }

  function pickSoloSubQuip(score) {
    if (score >= 90) return 'Scarily Close';
    if (score >= 75) return 'Solid Impression';
    if (score >= 55) return 'Getting Warm';
    if (score >= 30) return 'Noble Attempt';
    return 'Send Backup';
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
        ? (isMimic ? 'HOW CLOSE WAS YOUR MIMIC?' : 'HOW CLOSE WAS YOUR GUESS?')
        : (isMimic ? 'WHO MIMICKED THE FART BEST?' : 'WHO GUESSED THE FART BEST?');
    }

    $('res-sample-context').textContent = isSoloRound
      ? ('MYSTERY FART: ' + getSampleName(target).toUpperCase() + ' · SOLO ROUND')
      : ('ORIGINAL FART: ' + getSampleName(target).toUpperCase() + ' · ' + resultsList.length + ' GUESSES');

    var winChip = $('res-winner-chip');
    if (winChip) {
      winChip.textContent = isSoloRound
        ? pickSoloChipBadge(exact)
        : ('🏆 ' + (outcome.attempt.name || 'Guesser 1') + ' · ' + exact.toFixed(1) + '%');
    }

    var lbEye = $('res-lb-eyebrow');
    if (lbEye) {
      lbEye.textContent = isSoloRound ? 'YOUR SOLO SCORECARD' : 'WINNER & GUESSER RANKINGS';
    }
    var verdEye = $('res-verdict-eyebrow');
    if (verdEye) {
      verdEye.textContent = isSoloRound ? 'SCIENTIFIC EXPLANATION · YOUR COMPARISON' : 'SCIENTIFIC EXPLANATION · WINNER COMPARISON';
    }
    var repBtn = $('btn-res-replay');
    if (repBtn) {
      repBtn.textContent = isSoloRound ? '⚡ Play Real → Yours' : '⚡ Play Real → Winner';
    }

    // Hero Leaderboard / Solo Scorecard
    var lbListEl = $('res-leaderboard-list');
    if (lbListEl) {
      lbListEl.innerHTML = resultsList
        .map(function (item, idx) {
          var s = typeof item.exactScore === 'number' ? item.exactScore : 0;
          var rk = item.rank || TootLabs.Store.getRankForScore(s);
          var ms = item.metricsSummary || {};
          var isWinner = idx === 0;
          var placeText = isSoloRound ? pickSoloRowLabel(s) : placeLabel(idx);
          var tagHtml = isSoloRound
            ? ' <span class="labs-closest-badge">' + esc(pickSoloSubQuip(s)) + '</span>'
            : (isWinner ? ' <span class="labs-closest-badge">Closest Match</span>' : '');
          return (
            '<div class="labs-res-lb-row' + (isWinner ? ' first-place' : '') + '">' +
            '  <div class="labs-res-lb-main">' +
            '    <div class="labs-res-lb-left">' +
            '      <span class="labs-res-place">' + placeText + '</span>' +
            '      <div>' +
            '        <div class="labs-res-guesser-name">' + esc(item.attempt.name) + tagHtml + '</div>' +
            '        <div class="labs-res-mini-metrics">' +
            '          <span>Overall ' + (ms.overall != null ? ms.overall : Math.round(s)) + '%</span>' +
            '          <span>Timing ' + (ms.timing != null ? ms.timing : '—') + '%</span>' +
            '          <span>Duration ' + (ms.duration != null ? ms.duration : '—') + '%</span>' +
            '          <span>Pressure ' + (ms.pressure != null ? ms.pressure : '—') + '%</span>' +
            '          <span>Resonance ' + (ms.resonance != null ? ms.resonance : '—') + '%</span>' +
            '          <span>Thunder ' + (ms.thunder != null ? ms.thunder : '—') + '%</span>' +
            (ms.authB != null ? '<span>Auth ' + ms.authB + '%</span>' : '') +
            '          <span>ML ' + (ms.ml != null ? ms.ml : '—') + '%</span>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '    <div class="labs-res-lb-right">' +
            '      <span class="labs-res-lb-score" style="color:' + rk.color + '">' + s.toFixed(1) + '%</span>' +
            '      <div class="labs-att-btns">' +
            '        <button type="button" class="labs-btn-ghost labs-btn-sm" data-rlb-play="' + idx + '">▶ Play</button>' +
            '        <button type="button" class="labs-btn-ghost labs-btn-sm" data-rlb-single="' + idx + '">Analysis</button>' +
            '        <button type="button" class="labs-btn labs-btn-blue labs-btn-sm" data-rlb-cmp="' + idx + '">Compare</button>' +
            '      </div>' +
            '    </div>' +
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
      $('res-spec3d-b-title').textContent = origName + ' vs ' + challengerName;
    }
    if ($('res-spec3d-lbl-a')) {
      $('res-spec3d-lbl-a').textContent = 'Original · ' + origName;
    }
    if ($('res-spec3d-lbl-b')) {
      $('res-spec3d-lbl-b').textContent = challengerName + ' · ' + exact.toFixed(1) + '%';
    }
    if ($('btn-res-play-guess')) {
      $('btn-res-play-guess').textContent = isSoloRound ? '▶ Play Guess' : ('▶ Play ' + challengerName.slice(0, 14));
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
    $('res-rank-desc').textContent = (outcome.attempt.name || 'Winner') + ' — ' + rank.desc;

    var deltaNoteEl = $('res-delta-note');
    if (resultsList.length > 1) {
      deltaNoteEl.classList.remove('hidden', 'delta-neutral');
      deltaNoteEl.textContent =
        '🏆 ' + outcome.attempt.name + ' wins the ' + resultsList.length + '-guesser round at ' + exact.toFixed(1) + '% Closest Match!';
    } else if (typeof outcome.previousScore === 'number') {
      var delta = Math.round((exact - outcome.previousScore) * 10) / 10;
      deltaNoteEl.classList.remove('hidden', 'delta-neutral');
      if (delta >= 0) {
        deltaNoteEl.textContent =
          'Score Delta: ' + outcome.previousScore.toFixed(1) + '% → ' + exact.toFixed(1) + '% (+' + delta.toFixed(1) + '%)';
      } else {
        deltaNoteEl.classList.add('delta-neutral');
        deltaNoteEl.textContent =
          'Previous vs Current: ' + outcome.previousScore.toFixed(1) + '% → ' + exact.toFixed(1) + '% (' + delta.toFixed(1) + '%)';
      }
    } else {
      deltaNoteEl.classList.remove('hidden');
      deltaNoteEl.classList.add('delta-neutral');
      deltaNoteEl.textContent = 'First guess recorded — tap Guess The Fart above or Play Real → Winner to try again!';
    }

    $('res-verdict-text').textContent = outcome.verdict;

    var starsRow = $('res-stars-row');
    var bellLabel = $('res-bell-label');
    var legTitleEl = $('res-legendary-title');
    starsRow.innerHTML = '';
    bellLabel.textContent = 'Calibrating Match Quality…';
    legTitleEl.classList.add('hidden');
    legTitleEl.textContent = '';

    state.resultTimers.push(
      setTimeout(function () {
        if (state.view !== 'guess') return;
        if (rewardStageEl && rewardStageEl.classList) rewardStageEl.classList.remove('labs-reveal-pending');
        bellLabel.textContent = 'Assigning Telemetry Rating…';
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
                ? curCount + (curCount === 1 ? ' Bell…' : ' Bells…')
                : reward.stars + (reward.stars === 1 ? ' Bell · ' : ' Bells · ') + reward.label;

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
      else if (key === 'recorded') btns[i].textContent = 'Recorded (Real Farts) (' + bucket.counts.recorded + ')';
      else if (key === 'guesses') btns[i].textContent = 'Recorded Guesses (' + bucket.counts.guesses + ')';
      else if (key === 'defaults') {
        btns[i].textContent = bucket.defaultsCapped
          ? 'Default Farts (' + bucket.counts.defaultsIncluded + '/' + bucket.totalDefaults + ')'
          : 'Default Farts (' + bucket.counts.defaults + ')';
      }
    }

    var capNote = $('fn-group-cap-note');
    if (capNote) {
      if (bucket.defaultsCapped && (bucket.source === 'all' || bucket.source === 'defaults')) {
        capNote.textContent =
          'Default pack limited to ' + bucket.cap + ' of ' + bucket.totalDefaults + ' built-in farts per Megamix (' + bucket.items.length + ' total tracks).';
      } else {
        capNote.textContent = 'Combining ' + bucket.items.length + ' recording' + (bucket.items.length === 1 ? '' : 's') + ' from selected source.';
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

  function openFartnalysis(mode, sampleId, attemptId) {
    if (mode) state.fnMode = mode;
    var resolvedSampleId = sampleId || state.fnSampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id) || null;
    state.fnSampleId = resolvedSampleId;

    if (state.fnMode === 'group') {
      var loadAllP =
        TootLabs.Store && typeof TootLabs.Store.loadAllAttempts === 'function'
          ? TootLabs.Store.loadAllAttempts()
          : Promise.resolve([]);
      return loadAllP
        .then(function (allAtts) {
          state.allAttemptsCache = allAtts || [];
          showView('fartnalysis');
          renderFartnalysisView();
        })
        .catch(function () {
          state.allAttemptsCache = [];
          showView('fartnalysis');
          renderFartnalysisView();
        });
    }

    if (!resolvedSampleId) {
      state.fnAttempts = [];
      state.fnAttemptId = null;
      showView('fartnalysis');
      renderFartnalysisView();
      return Promise.resolve();
    }

    return Promise.all([ensureTargetReady(getSampleById(resolvedSampleId)), TootLabs.Store.loadAttemptsForSample(resolvedSampleId)])
      .then(function (res) {
        var attempts = res[1] || [];
        state.fnAttempts = attempts;
        if (attemptId) {
          state.fnAttemptId = attemptId;
        } else if (state.fnAttemptId && state.fnAttempts.some(function (a) { return a.id === state.fnAttemptId; })) {
          // keep current
        } else {
          state.fnAttemptId = state.fnAttempts[0] ? state.fnAttempts[0].id : null;
        }
        showView('fartnalysis');
        renderFartnalysisView();
      })
      .catch(function (err) {
        showToast((err && err.message) || 'Could not load specimen for analysis.', true);
      });
  }

  function syncFartnalysisPickers() {
    var modeBtns = document.querySelectorAll('#fn-mode-tabs .labs-mode-tab');
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-fn-mode') === state.fnMode);
    }

    var pickersBar = $('fn-pickers-bar');
    var groupFilterBar = $('fn-group-filter-bar');
    var sampleSel = $('fn-sample-select');
    var guessField = $('fn-guess-field');
    var guessSel = $('fn-guess-select');

    if (state.fnMode === 'group') {
      pickersBar.classList.add('hidden');
      return;
    }

    if (groupFilterBar) groupFilterBar.classList.add('hidden');
    pickersBar.classList.remove('hidden');
    sampleSel.innerHTML =
      state.samples.length === 0
        ? '<option value="">No saved farts</option>'
        : state.samples
            .map(function (s) {
              return '<option value="' + esc(s.id) + '">' + esc(getSampleName(s)) + '</option>';
            })
            .join('');
    if (state.fnSampleId) sampleSel.value = state.fnSampleId;

    var needsGuess = state.fnMode === 'guess' || state.fnMode === 'comparison';
    guessField.classList.toggle('hidden', !needsGuess);
    if (needsGuess) {
      guessSel.innerHTML =
        state.fnAttempts.length === 0
          ? '<option value="">No comparison recordings available</option>'
          : state.fnAttempts
              .map(function (a) {
                return (
                  '<option value="' +
                  esc(a.id) +
                  '">' +
                  esc(a.name + ' (' + (a.exactScore || 0).toFixed(1) + '% similarity)') +
                  '</option>'
                );
              })
              .join('');
      if (state.fnAttemptId) guessSel.value = state.fnAttemptId;
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
            ? 'No Recorded Real Farts Yet'
            : bucket.source === 'guesses'
            ? 'No Recorded Guesses Yet'
            : bucket.source === 'defaults'
            ? 'No Default Pack Farts Found'
            : 'No Recordings Ready for Megamix';
        emptyCopy.textContent =
          bucket.source === 'guesses'
            ? 'Play a round of Guess The Fart first to analyze recorded guesses together.'
            : bucket.source === 'defaults'
            ? 'Add audio files to VaultPreLoads to build the Default Pack.'
            : 'Record a new specimen from Home (or play a Guess round) to build your Megamix.';
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
          onShare: function (g, specCanvases) {
            shareTextOrAudio(
              'Multi-Specimen Megamix Fartnalysis Report',
              TootLabs.Store.buildGroupAnalysisReportText(g),
              g,
              { mode: 'group', groupObj: g, specCanvases: specCanvases }
            );
          },
          onDownloadPdf: function (g, specCanvases) {
            downloadAnalysisPdf({ mode: 'group', groupObj: g, specCanvases: specCanvases });
          },
          onEmailAnalysis: function (g, specCanvases) {
            emailAnalysisReport(
              'Multi-Specimen Megamix Fartnalysis Report',
              TootLabs.Store.buildGroupAnalysisReportText(g),
              { mode: 'group', groupObj: g, specCanvases: specCanvases },
              g
            );
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
        eyebrow: 'FARTNALYSIS REPORT · PRIMARY SPECIMEN · ACOUSTIC ANALYSIS',
        onOpenTeam: openTeamView,
        onCopyVerdict: handleCopyVerdict,
        onShare: function (s, specCanvases) {
          shareTextOrAudio(
            'Fartnalysis Report: ' + getSampleName(s),
            TootLabs.Store.buildSingleAnalysisReportText(s, 'FARTNALYSIS REPORT'),
            s,
            { mode: 'single', sound: s, label: getSampleName(s), eyebrow: 'FARTNALYSIS REPORT · PRIMARY SPECIMEN', specCanvases: specCanvases }
          );
        },
        onDownloadPdf: function (s, specCanvases) {
          downloadAnalysisPdf({ mode: 'single', sound: s, label: getSampleName(s), eyebrow: 'FARTNALYSIS REPORT · PRIMARY SPECIMEN', specCanvases: specCanvases });
        },
        onEmailAnalysis: function (s, specCanvases) {
          emailAnalysisReport(
            'Fartnalysis Report: ' + getSampleName(s),
            TootLabs.Store.buildSingleAnalysisReportText(s, 'FARTNALYSIS REPORT'),
            { mode: 'single', sound: s, label: getSampleName(s), eyebrow: 'FARTNALYSIS REPORT · PRIMARY SPECIMEN', specCanvases: specCanvases },
            s
          );
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
        label: attempt.name + ' (Secondary Recording for ' + getSampleName(sample) + ')',
        eyebrow: 'FARTNALYSIS REPORT · SECONDARY RECORDING · LABORATORY FINDINGS',
        primaryLabel: '⚖️ Open Comparative Analysis',
        onPrimaryAction: function () {
          openFartnalysis('comparison', sample.id, attempt.id);
        },
        onOpenTeam: openTeamView,
        onCopyVerdict: handleCopyVerdict,
        onShare: function (g, specCanvases) {
          shareTextOrAudio(
            'Acoustic Analysis: ' + g.name,
            TootLabs.Store.buildSingleAnalysisReportText(g, 'SECONDARY RECORDING ANALYSIS'),
            g,
            { mode: 'single', sound: g, label: g.name, eyebrow: 'FARTNALYSIS REPORT · SECONDARY RECORDING', specCanvases: specCanvases }
          );
        },
        onDownloadPdf: function (g, specCanvases) {
          downloadAnalysisPdf({ mode: 'single', sound: g, label: g.name, eyebrow: 'FARTNALYSIS REPORT · SECONDARY RECORDING', specCanvases: specCanvases });
        },
        onEmailAnalysis: function (g, specCanvases) {
          emailAnalysisReport(
            'Fartnalysis Report: ' + g.name,
            TootLabs.Store.buildSingleAnalysisReportText(g, 'SECONDARY RECORDING ANALYSIS'),
            { mode: 'single', sound: g, label: g.name, eyebrow: 'FARTNALYSIS REPORT · SECONDARY RECORDING', specCanvases: specCanvases },
            g
          );
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
      onShare: function (sA, sB, r, exact, specCanvases) {
        shareTextOrAudio(
          'Toot Match Comparative Report: ' + exact.toFixed(1) + '%',
          TootLabs.Store.buildComparisonReportText(sA, sB, r, exact),
          stitchComparisonAudio(sA, sB),
          { mode: 'comparison', soundA: sA, soundB: sB, result: r, specCanvases: specCanvases }
        );
      },
      onDownloadPdf: function (sA, sB, r, exact, specCanvases) {
        downloadAnalysisPdf({ mode: 'comparison', soundA: sA, soundB: sB, result: r, specCanvases: specCanvases });
      },
      onEmailAnalysis: function (sA, sB, r, exact, specCanvases) {
        emailAnalysisReport(
          'Toot Match Comparative Analysis: ' + sB.name + ' vs ' + getSampleName(sA),
          TootLabs.Store.buildComparisonReportText(sA, sB, r, exact),
          { mode: 'comparison', soundA: sA, soundB: sB, result: r, specCanvases: specCanvases },
          stitchComparisonAudio(sA, sB)
        );
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
          renderVaultView();
          if (state.view === 'detail') renderSampleDetail();
          if (state.view === 'guess') renderGuessView();
          showToast('Renamed to "' + next + '"');
        });
      } else if (state.renameTarget.kind === 'guess') {
        TootLabs.Store.renameAttempt(state.renameTarget.item, next).then(function (updated) {
          upsertAttemptsIntoCache([updated || state.renameTarget.item]);
          renameModal.classList.add('hidden');
          renderGuessLeaderboard();
          renderVaultView();
          if (state.view === 'detail') renderSampleDetail();
          showToast('Guesser named "' + next + '"');
        });
      }
    });

    $('btn-labs-delete-cancel').addEventListener('click', function () {
      deleteModal.classList.add('hidden');
    });

    $('btn-labs-delete-confirm').addEventListener('click', function () {
      var delId = state.detailSampleId;
      if (!delId) {
        deleteModal.classList.add('hidden');
        return;
      }
      TootLabs.Store.deleteSample(delId).then(function () {
        deleteModal.classList.add('hidden');
        state.samples = state.samples.filter(function (s) { return s.id !== delId; });
        state.allAttemptsCache = (state.allAttemptsCache || []).filter(function (a) { return a && a.sampleId !== delId; });
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
        renderVaultView();
        showView('vault');
        showToast('Fart deleted from Vault');
      });
    });

    // Top-right Settings Gear Menu, About Modal & Instructional Splash
    var gearBtn = $('btn-labs-settings');
    if (gearBtn) gearBtn.addEventListener('click', toggleSettingsMenu);

    var menuBlindBtn = $('btn-menu-blind');
    if (menuBlindBtn) {
      menuBlindBtn.addEventListener('click', function () {
        closeSettingsMenu();
        openGuessMode(state.guessTargetId || (state.samples[0] && state.samples[0].id)).then(function () {
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
    // Persistent 3-Area Bottom Dock
    document.querySelectorAll('.labs-nav-btn').forEach(function (navBtn) {
      navBtn.addEventListener('click', function () {
        var targetView = this.getAttribute('data-view');
        if (targetView === 'home') {
          renderHomeView();
          showView('home');
        } else if (targetView === 'vault') {
          renderVaultView();
          showView('vault');
          refreshAllAttemptsCache().then(function () {
            if (state.view === 'vault') renderVaultView();
          });
        } else if (targetView === 'fartnalysis') {
          openFartnalysis(state.fnMode || 'original', state.fnSampleId, state.fnAttemptId);
        }
      });
    });

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
    $('btn-home-analyze-fart').addEventListener('click', function () {
      openFartnalysis(
        state.fnMode || 'original',
        state.fnSampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id),
        state.fnAttemptId
      );
    });
    $('btn-home-open-vault').addEventListener('click', function () {
      renderVaultView();
      showView('vault');
      refreshAllAttemptsCache().then(function () {
        if (state.view === 'vault') renderVaultView();
      });
    });

    // Vault View Buttons, Filter & Airlock Door (Recording Driven From Home Only)
    var vaultFilterBar = $('vault-filter-bar');
    if (vaultFilterBar) {
      vaultFilterBar.querySelectorAll('[data-vault-filter]').forEach(function (fb) {
        fb.addEventListener('click', function () {
          setVaultFilter(this.getAttribute('data-vault-filter') || 'all');
        });
      });
    }
    $('btn-vault-megamix').addEventListener('click', function () {
      openFartnalysis('group', null, null);
    });
    $('btn-vault-reseal').addEventListener('click', triggerVaultDoorOpen);
    $('vault-door-stage').addEventListener('click', dismissVaultDoorImmediate);
    $('vault-door-stage').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        dismissVaultDoorImmediate();
      }
    });

    // Detail View Buttons
    $('btn-detail-back').addEventListener('click', function () {
      renderVaultView();
      showView('vault');
      refreshAllAttemptsCache().then(function () {
        if (state.view === 'vault') renderVaultView();
      });
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
      if (sample) {
        shareTextOrAudio(
          'Toot Match — ' + getSampleName(sample),
          TootLabs.Store.buildSingleAnalysisReportText(sample, 'SAVED FART'),
          sample,
          { mode: 'single', sound: sample, label: getSampleName(sample), eyebrow: 'ORIGINAL FART ANALYSIS' }
        );
      }
    });
    $('btn-detail-email-analysis').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (sample) {
        emailAnalysisReport(
          'Fartnalysis Report: ' + getSampleName(sample),
          TootLabs.Store.buildSingleAnalysisReportText(sample, 'ORIGINAL FART ANALYSIS'),
          { mode: 'single', sound: sample, label: getSampleName(sample), eyebrow: 'ORIGINAL FART ANALYSIS' },
          sample
        );
      }
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
      if (!sample) return;
      $('labs-delete-copy').textContent = 'Permanently delete "' + getSampleName(sample) + '" and all guesses against it?';
      $('labs-delete-modal').classList.remove('hidden');
    });

    // Guess & Mimic Game Screen Buttons (No Record New Fart here — Home only)
    if ($('btn-guess-reset-blind')) {
      $('btn-guess-reset-blind').addEventListener('click', function () {
        setGuessMode('guess');
      });
    }
    if ($('btn-guess-random')) {
      $('btn-guess-random').addEventListener('click', pickRandomGuessTarget);
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
    $('btn-guess-queue-analyze').addEventListener('click', function () {
      analyzeSessionGuesses();
    });
    if ($('btn-guess-toggle-history')) {
      $('btn-guess-toggle-history').addEventListener('click', function () {
        state.historyOpen = !state.historyOpen;
        renderGuessLeaderboard();
      });
    }
    if ($('btn-open-blind-footer')) {
      $('btn-open-blind-footer').addEventListener('click', function () {
        setGuessSubMode('blind');
      });
    }
    if ($('btn-blind-back')) {
      $('btn-blind-back').addEventListener('click', function () {
        setGuessSubMode('standard');
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
          { samples: state.lastOutcome.targetSound.samples, sampleRate: state.lastOutcome.targetSound.sampleRate, channel: 'r_a' },
          { samples: state.lastOutcome.attempt.samples, sampleRate: state.lastOutcome.attempt.sampleRate, channel: 'r_b' }
        ],
        220
      );
    });
    $('btn-res-email').addEventListener('click', function () {
      if (!state.lastOutcome) return;
      var o = state.lastOutcome;
      emailAnalysisReport(
        'Toot Match Referee Report: ' + o.attempt.name,
        TootLabs.Store.buildComparisonReportText(o.targetSound, o.attempt, o.attempt.result, o.exactScore),
        { mode: 'comparison', soundA: o.targetSound, soundB: o.attempt, result: o.attempt.result },
        stitchComparisonAudio(o.targetSound, o.attempt)
      );
    });
    $('btn-res-share').addEventListener('click', function () {
      if (!state.lastOutcome) return;
      var o = state.lastOutcome;
      shareTextOrAudio(
        'Toot Match Result: ' + o.exactScore.toFixed(1) + '%',
        TootLabs.Store.buildComparisonReportText(o.targetSound, o.attempt, o.attempt.result, o.exactScore),
        stitchComparisonAudio(o.targetSound, o.attempt),
        { mode: 'comparison', soundA: o.targetSound, soundB: o.attempt, result: o.attempt.result }
      );
    });

    // Fartnalysis Mode Switcher, Megamix Source Filter & Selectors
    document.querySelectorAll('#fn-mode-tabs .labs-mode-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = this.getAttribute('data-fn-mode');
        openFartnalysis(mode, state.fnSampleId, state.fnAttemptId);
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
      openFartnalysis(state.fnMode, this.value, null);
    });

    $('fn-guess-select').addEventListener('change', function () {
      state.fnAttemptId = this.value;
      renderFartnalysisView();
    });

    $('btn-fn-back').addEventListener('click', function () {
      renderVaultView();
      showView('vault');
      refreshAllAttemptsCache().then(function () {
        if (state.view === 'vault') renderVaultView();
      });
    });

    $('btn-fn-go-guess').addEventListener('click', function () {
      renderVaultView();
      showView('vault');
      refreshAllAttemptsCache().then(function () {
        if (state.view === 'vault') renderVaultView();
      });
    });

    if ($('btn-fn-team')) {
      $('btn-fn-team').addEventListener('click', openTeamView);
    }
    if ($('btn-team-back')) {
      $('btn-team-back').addEventListener('click', function () {
        var backTo = state.prevNonTeamView && state.prevNonTeamView !== 'team' ? state.prevNonTeamView : 'home';
        showView(backTo);
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

    root.addEventListener('resize', function () {
      if (state.view === 'home') drawVaultWaveforms('home-recent-vault');
      else if (state.view === 'vault') drawVaultWaveforms('vault-grid');
      else if (state.view === 'detail') drawDetailWaveform(null);
      else if (state.view === 'guess') {
        drawGuessWaveforms();
        if (state.inlineSpecA) state.inlineSpecA.resize();
        if (state.inlineSpecB) state.inlineSpecB.resize();
      } else if (state.view === 'fartnalysis' && state.fnController) state.fnController.resize();
    });
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
    setRecordMode(state.recordMode);

    var seenSplash = false;
    try {
      seenSplash = typeof localStorage !== 'undefined' && localStorage && localStorage.getItem('toot_labs_seen_splash_v1') === '1';
    } catch (e) {}
    if (!seenSplash) {
      openSplashModal();
    }

    Promise.all([TootLabs.Store.loadVaultSamples(), refreshAllAttemptsCache()])
      .then(function (res) {
        state.samples = res[0] || [];
        if (state.samples.length > 0) {
          state.guessTargetId = state.samples[0].id;
          state.fnSampleId = state.samples[0].id;
        }
        renderHomeView();
        renderVaultView();
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
    openTeamView: openTeamView,
    openAboutModal: openAboutModal,
    openSplashModal: openSplashModal,
    closeSplashModal: closeSplashModal,
    openGuessMode: openGuessMode,
    setGuessSubMode: setGuessSubMode,
    setGuessMode: setGuessMode,
    renderGuessView: renderGuessView,
    playFartFirst: playFartFirst,
    triggerRevealAndAnalyze: triggerRevealAndAnalyze,
    addAnotherGuesser: addAnotherGuesser,
    analyzeSessionGuesses: analyzeSessionGuesses,
    analyzeBlindSession: analyzeBlindSession,
    pickRandomGuessTarget: pickRandomGuessTarget,
    openFartnalysis: openFartnalysis,
    getVaultBuckets: getVaultBuckets,
    setVaultFilter: setVaultFilter,
    getMegamixSourceBucket: getMegamixSourceBucket,
    setGroupSource: setGroupSource,
    setRecordMode: setRecordMode,
    pickAnalysisStages: pickAnalysisStages,
    runAnalysisSequence: runAnalysisSequence
  };
})(typeof window !== 'undefined' ? window : globalThis);
