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
    detailSampleId: null,
    detailAttempts: [],
    guessTargetId: null,
    guessAttempts: [],
    pendingGuess: null,
    sessionGuesses: [],
    lastSessionResults: [],
    guessSubMode: 'standard',
    blindGuesses: [],
    blindOriginal: null,
    lastOutcome: null,
    quickSavedId: null,
    fnMode: 'original',
    fnSampleId: null,
    fnAttempts: [],
    fnAttemptId: null,
    fnController: null,
    groupSortBy: 'pitch',
    groupSortDir: 'asc',
    renameTarget: null,
    activeRecStopper: null,
    recordingKind: null,
    recordMode: 'manual',
    resultTimers: [],
    vaultDoorTimers: [],
    analysisTimers: [],
    analysisDoneCb: null,
    autoDetectMsgTimer: null,
    resultCounterRaf: null,
    confettiHandle: null,
    toastTimer: null
  };

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

  var ANALYSIS_RESULTS_CORE_POOL = [
    'Mapping resonance profiles...',
    'Comparing turbulence patterns...',
    'Running similarity calculations...',
    'Evaluating spectral alignment...',
    'Computing pressure distribution...',
    'Comparing airflow dynamics...',
    'Evaluating thunder quotient...',
    'Running A.S.S. cross-correlation...'
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
    'Professor Bottomsworth is reviewing preliminary findings...',
    'Dr. Flatley is validating similarity calculations...',
    'Dr. Wobble is analyzing harmonic structure...',
    'Dr. Turbulence is examining pressure release turbulence...',
    'Dr. Pufferton is indexing specimen archive records...'
  ];

  var ANALYSIS_RARE_POOL = [
    'Laboratory disagreement detected...',
    'Science team requests additional coffee...',
    'This one is unusual...',
    'Unexpected harmonic behaviour observed...',
    'Results under peer review...',
    'Rechecking findings...',
    'Further investigation recommended...'
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
    var opening = ANALYSIS_OPENING_POOL[Math.floor(Math.random() * ANALYSIS_OPENING_POOL.length)];
    var coreShuffled = shuffleArray(isResults ? ANALYSIS_RESULTS_CORE_POOL : ANALYSIS_STANDARD_POOL);
    var extraShuffled = shuffleArray(ANALYSIS_STANDARD_POOL);

    var stages = [{ text: opening, rare: false, scientist: false }];
    var midCount = Math.random() < 0.5 ? 5 : 6;
    var pickedMid = [];
    var seen = new Set([opening]);

    for (var ci = 0; ci < coreShuffled.length && pickedMid.length < Math.min(4, midCount); ci++) {
      if (!seen.has(coreShuffled[ci])) {
        seen.add(coreShuffled[ci]);
        pickedMid.push({ text: coreShuffled[ci], rare: false, scientist: false });
      }
    }
    for (var ei = 0; ei < extraShuffled.length && pickedMid.length < midCount; ei++) {
      if (!seen.has(extraShuffled[ei])) {
        seen.add(extraShuffled[ei]);
        pickedMid.push({ text: extraShuffled[ei], rare: false, scientist: false });
      }
    }

    // Occasional (or regular on results) scientist update
    if (isResults || Math.random() < 0.58) {
      var sciTxt = ANALYSIS_SCIENTIST_UPDATES[Math.floor(Math.random() * ANALYSIS_SCIENTIST_UPDATES.length)];
      var sciPos = Math.max(1, Math.min(pickedMid.length, 1 + Math.floor(Math.random() * 3)));
      pickedMid.splice(sciPos, 0, { text: sciTxt, rare: false, scientist: true });
    }

    if (Math.random() < 0.42) {
      var rareTxt = ANALYSIS_RARE_POOL[Math.floor(Math.random() * ANALYSIS_RARE_POOL.length)];
      var insertPos = Math.max(2, Math.min(pickedMid.length, 2 + Math.floor(Math.random() * 3)));
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

    // Target ~3.5s to ~5.6s across stages (plus consensus beat + fade)
    var targetTotalMs = 3500 + Math.random() * 1950;
    var weights = stages.map(function (st, idx) {
      if (idx === stages.length - 1) return 1.15;
      return (st.scientist || st.rare ? 1.25 : 0.85) + Math.random() * 0.45;
    });
    var sumW = weights.reduce(function (a, b) { return a + b; }, 0) || stages.length;

    return stages.map(function (st, idx) {
      return {
        text: st.text,
        rare: st.rare,
        scientist: st.scientist,
        durationMs: Math.max(300, Math.round((weights[idx] / sumW) * targetTotalMs))
      };
    });
  }

  function runAnalysisSequence(opts, onComplete) {
    clearAnalysisSequence();
    opts = opts || {};

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
      titleEl.textContent = opts.title || (opts.context === 'comparison' ? 'ANALYZING RESULTS' : 'ANALYZING RECORDING');
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
        }, 310);
        state.analysisTimers.push(endTimer);
      }, 620);
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
            }, 180);
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

    var homeHint = $('home-mode-hint');
    if (homeHint) {
      homeHint.textContent =
        next === 'auto'
          ? 'AUTO DETECT active on Record New Fart: beeps on arm, listens with 5s rolling buffer & beeps after auto-stop'
          : 'Manual Record captures immediately · Auto Detect arms a 5s rolling trigger buffer';
    }
  }

  function clearResultAnimations() {
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
      countEl.textContent = state.samples.length + (state.samples.length === 1 ? ' SPECIMEN' : ' SPECIMENS');
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
  function showView(viewKey) {
    var prevView = state.view;
    if (prevView === 'result' && viewKey !== 'result') {
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
        else if (viewKey === 'guess') drawGuessWaveforms();
        else if (viewKey === 'fartnalysis' && state.fnController) state.fnController.resize();
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
    var savedPane = $('labs-quick-saved');
    var timerEl = $('labs-quick-timer');
    var waveEl = $('labs-quick-wave');
    var stopBtn = $('btn-quick-stop-save');
    var autoBadge = $('labs-quick-auto-status');
    var autoTitleEl = $('labs-quick-auto-title');
    var autoMsgEl = $('labs-quick-auto-msg');
    var autoBufEl = $('labs-quick-auto-buf');
    var settled = false;
    var autoWaitIdx = 0;

    bar.classList.remove('hidden');
    capPane.classList.remove('hidden');
    savedPane.classList.add('hidden');
    stopBtn.disabled = false;

    var isWarm = Boolean(TootApp.Audio.hasWarmMic && TootApp.Audio.hasWarmMic());
    if (useAuto) {
      timerEl.textContent = isWarm ? 'Arming sensors…' : 'Requesting mic…';
      stopBtn.textContent = '⏹ Cancel Auto';
      if (autoBadge) {
        autoBadge.classList.remove('hidden', 'triggered');
        if (autoTitleEl) autoTitleEl.textContent = 'LISTENING FOR EVENT';
        if (autoMsgEl) autoMsgEl.textContent = 'Acoustic sensors armed — ' + AUTO_DETECT_WAIT_MESSAGES[0];
        if (autoBufEl) autoBufEl.textContent = 'Buffer: 0.0s / 5.0s';
      }
    } else {
      timerEl.textContent = isWarm ? 'Recording…' : 'Requesting mic…';
      stopBtn.textContent = '⏹ Stop & Save';
    }

    function finalizeQuick(res) {
      if (settled) return;
      settled = true;
      clearAutoDetectUI();
      state.activeRecStopper = null;
      state.recordingKind = null;
      stopBtn.textContent = '⏹ Stop & Save';
      stopBtn.disabled = false;

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
          msg = 'Fart was too quiet on "' + micName + '" — try 2x/4x Boost below.';
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
        if (!state.guessTargetId) state.guessTargetId = saved.id;
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
            bar.classList.remove('hidden');
            capPane.classList.add('hidden');
            savedPane.classList.remove('hidden');
            $('labs-quick-saved-name').textContent = getSampleName(saved);
            showToast('Saved "' + getSampleName(saved) + '" to Fart Vault!');
          }
        );
      });
    }

    if (useAuto) {
      state.activeRecStopper = function () {
        stopBtn.disabled = true;
        timerEl.textContent = 'Disarming sensors…';
        TootApp.Audio.stopAutoDetect(false).then(function (res) {
          if (res && res.ok && TootLabs.AudioFx && typeof TootLabs.AudioFx.playAutoDetectStopBeep === 'function') {
            TootLabs.AudioFx.playAutoDetectStopBeep();
          }
          finalizeQuick(res);
        });
      };

      TootApp.Audio.startAutoDetect({
        settleSec: 0.24,
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
            if (autoBufEl) autoBufEl.textContent = 'Buffer: ' + bTxt + 's / 5.0s';
          }
          drawLiveWaveform(waveEl, timeData, rms);
        },
        onDetected: function () {
          if (state.autoDetectMsgTimer) {
            clearInterval(state.autoDetectMsgTimer);
            state.autoDetectMsgTimer = null;
          }
          var trigHead = AUTO_DETECT_TRIGGER_TITLES[Math.floor(Math.random() * AUTO_DETECT_TRIGGER_TITLES.length)];
          stopBtn.textContent = '⏹ Finish & Save';
          if (autoBadge) autoBadge.classList.add('triggered');
          if (autoTitleEl) autoTitleEl.textContent = trigHead;
          if (autoMsgEl) autoMsgEl.textContent = 'Capturing sample...';
          if (autoBufEl) autoBufEl.textContent = 'EVENT LOCKED';
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
        state.recordingKind = null;
        stopBtn.textContent = '⏹ Stop & Save';
        bar.classList.add('hidden');
        showToast((err && err.message) || 'Microphone unavailable.', true);
      });
      return;
    }

    state.activeRecStopper = function () {
      stopBtn.disabled = true;
      timerEl.textContent = 'Auto-clipping & saving…';
      TootApp.Audio.stopRecording().then(finalizeQuick);
    };

    TootApp.Audio.startRecording({
      maxDurationSec: 7,
      onStarted: function () {
        timerEl.textContent = 'Recording 0.0s…';
        refreshMicDevices();
      },
      onLevel: function (timeData, rms, elapsed) {
        timerEl.textContent = 'Recording ' + elapsed.toFixed(1) + 's';
        drawLiveWaveform(waveEl, timeData, rms);
      },
      onAutoStop: function (res) {
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

  /* Clean Manual RECORD GUESS Only (No Auto Detect on Guess The Fart) */
  function startGuessCapture() {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (state.recordingKind === 'guess' && TootApp.Audio.isRecording() && state.activeRecStopper) {
        state.activeRecStopper();
      }
      return;
    }

    var target = getSampleById(state.guessTargetId);
    if (!target) {
      showToast('Select a fart first.', true);
      return;
    }

    resetMicTestUI('Ready');
    state.recordingKind = 'guess';
    var btn = $('btn-guess-rec');
    var labelEl = $('guess-rec-label');
    var iconEl = $('guess-rec-icon');
    var statusEl = $('guess-rec-status');
    var waveCanvas = $('guess-live-wave');
    var settled = false;

    var isWarm = Boolean(TootApp.Audio.hasWarmMic && TootApp.Audio.hasWarmMic());
    if (!isWarm) {
      btn.disabled = true;
      labelEl.textContent = 'Requesting Mic…';
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
      labelEl.textContent = 'Record Guess';
      iconEl.textContent = '🎤';
      waveCanvas.classList.add('hidden');

      if (!res || !res.ok) {
        var micName = (res && res.trackLabel) || 'Default Microphone';
        var msg =
          res && res.reason === 'all_zeros'
            ? 'No audio captured from "' + micName + '". Check Microphone settings.'
            : res && res.reason === 'too_quiet'
            ? 'Guess was too quiet — increase Gain in Microphone settings.'
            : (res && res.error) || 'Could not record guess.';
        statusEl.textContent = msg;
        showToast(msg, true);
        return;
      }

      var sr = res.sampleRate || 44100;
      var samples = res.clippedSamples;
      state.pendingGuess = {
        id: 'att_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        sampleRate: sr,
        samples: samples,
        clipInfo: res.clipInfo,
        features: TootApp.DSP.extractFeatures(samples, sr)
      };

      var defaultNum = state.sessionGuesses.length + 1;
      $('guess-name-input').value = 'Guesser ' + defaultNum;
      $('guess-name-input').placeholder = 'Guesser ' + defaultNum;
      renderGuessView();
    }

    state.activeRecStopper = function () {
      btn.disabled = true;
      statusEl.textContent = 'Auto-clipping guess…';
      TootApp.Audio.stopRecording().then(finalizeGuess);
    };

    TootApp.Audio.startRecording({
      maxDurationSec: 7,
      onStarted: function () {
        btn.disabled = false;
        btn.classList.add('recording');
        labelEl.textContent = 'Stop Guess';
        iconEl.textContent = '⏹';
        refreshMicDevices();
      },
      onLevel: function (timeData, rms, elapsed) {
        drawLiveWaveform(waveCanvas, timeData, rms);
        statusEl.textContent = 'Recording guess ' + elapsed.toFixed(1) + 's — tap to stop';
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
      labelEl.textContent = 'Record Guess';
      iconEl.textContent = '🎤';
      waveCanvas.classList.add('hidden');
      showToast((err && err.message) || 'Microphone unavailable.', true);
    });
  }

  /* ==================== VAULT CARD SHARED RENDERER ==================== */
  function buildVaultCardHtml(s) {
    var st = TootLabs.Store.getSampleStats(s.id);
    var name = getSampleName(s);
    var dur = (s.samples.length / (s.sampleRate || 44100)).toFixed(2) + 's';
    var bestTxt = st.attemptCount > 0 ? st.bestScore.toFixed(1) + '%' : '—';
    var attTxt = st.attemptCount === 1 ? '1 Guess' : st.attemptCount + ' Guesses';

    return (
      '<article class="labs-vault-card" data-open-id="' + esc(s.id) + '" tabindex="0">' +
      '  <div class="labs-vc-top">' +
      '    <div>' +
      '      <div class="labs-vc-name">' + esc(name) + '</div>' +
      '      <div class="labs-vc-date">' + esc(formatDateShort(s.createdAt)) + ' · ' + dur + ' · ' + esc(attTxt) + '</div>' +
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
          TootApp.Audio.playSound(sample.samples, sample.sampleRate, { channel: 'vault_play' });
        } else if (act === 'analyze') {
          openFartnalysis('original', sample.id, null);
        } else if (act === 'guess') {
          openGuessMode(sample.id);
        }
      });
    });

    containerEl.querySelectorAll('.labs-vault-card').forEach(function (card) {
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
  }

  function drawVaultWaveforms(containerId) {
    var canvases = document.querySelectorAll('#' + containerId + ' canvas[data-wave-id]');
    for (var i = 0; i < canvases.length; i++) {
      var id = canvases[i].getAttribute('data-wave-id');
      var sample = getSampleById(id);
      if (sample) {
        drawStaticWaveform(canvases[i], sample.samples, { fallbackW: 260, fallbackH: 44 });
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
    $('btn-vault-megamix').disabled = state.samples.length === 0;

    if (state.samples.length === 0) {
      grid.innerHTML =
        '<div class="labs-glass-card labs-empty-card">' +
        '  <h3>Your Fart Vault is Empty</h3>' +
        '  <p>Tap <strong>● Record New Fart</strong> anytime to build your collection.</p>' +
        '</div>';
      return;
    }

    grid.innerHTML = state.samples.map(buildVaultCardHtml).join('');
    wireVaultCards(grid);
    drawVaultWaveforms('vault-grid');
  }

  /* ==================== SAMPLE DETAIL ==================== */
  function drawDetailWaveform(progress) {
    var sample = getSampleById(state.detailSampleId);
    var canvas = $('detail-waveform-canvas');
    if (sample && canvas) {
      drawStaticWaveform(canvas, sample.samples, { fallbackW: 520, fallbackH: 92, progress: progress });
    }
  }

  function renderSampleDetail() {
    var sample = getSampleById(state.detailSampleId);
    if (!sample) {
      showView('vault');
      return;
    }

    var stats = TootLabs.Store.getSampleStats(sample.id);
    var feat = sample.features || TootApp.DSP.extractFeatures(sample.samples, sample.sampleRate);
    sample.features = feat;
    var prof = TootApp.DSP.describeSoundProfile(feat);

    $('detail-specimen-id').textContent = 'SPECIMEN ID · ' + sample.id.slice(-8).toUpperCase();
    $('detail-sample-name').textContent = getSampleName(sample);
    $('detail-sample-dur').textContent = (sample.samples.length / sample.sampleRate).toFixed(2) + 's';
    $('detail-sample-meta').textContent = formatTimeShort(sample.createdAt) + ' · ' + prof.pitchLabel + ' · ' + prof.textureLabel;

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
    TootLabs.Store.loadAttemptsForSample(sampleId).then(function (attempts) {
      state.detailAttempts = attempts || [];
      showView('detail');
      renderSampleDetail();
    });
  }

  /* ==================== GUESS MODE & LEADERBOARD ==================== */
  function drawGuessWaveforms() {
    var target = getSampleById(state.guessTargetId);
    if (target && $('guess-target-wave')) {
      drawStaticWaveform($('guess-target-wave'), target.samples, { fallbackW: 480, fallbackH: 66 });
    }
    if (target && state.pendingGuess && $('guess-compare-canvas')) {
      drawComparisonWaveform($('guess-compare-canvas'), target.samples, state.pendingGuess.samples);
    }
  }

  function renderGuessLeaderboard() {
    var wrap = $('guess-leaderboard-wrap');
    var winEl = $('guess-winner-banner');
    var listEl = $('guess-leaderboard-list');
    var target = getSampleById(state.guessTargetId);

    if (!target || state.guessAttempts.length === 0) {
      wrap.classList.add('hidden');
      return;
    }

    wrap.classList.remove('hidden');
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
    var qTargetEl = $('guess-queue-target-name');
    var qCountEl = $('guess-queue-count');
    var qListEl = $('guess-queue-list');
    var target = getSampleById(state.guessTargetId);

    if (!qCard || !qListEl) return;
    if (!target || state.sessionGuesses.length === 0) {
      qCard.classList.add('hidden');
      qListEl.innerHTML = '';
      return;
    }

    qCard.classList.remove('hidden');
    if (qTargetEl) qTargetEl.textContent = 'Original Fart: ' + getSampleName(target);
    if (qCountEl) qCountEl.textContent = state.sessionGuesses.length + ' Recorded';

    qListEl.innerHTML = state.sessionGuesses
      .map(function (g, idx) {
        var dur = (g.samples.length / (g.sampleRate || 44100)).toFixed(2) + 's';
        return (
          '<div class="labs-queue-row">' +
          '  <div class="labs-queue-info">' +
          '    <strong>' + esc(g.name) + '</strong>' +
          '    <span class="labs-chip labs-chip-green">Recorded · ' + dur + '</span>' +
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
    var next = subMode === 'blind' ? 'blind' : 'standard';
    state.guessSubMode = next;
    var stdBtn = $('btn-submode-standard');
    var blindBtn = $('btn-submode-blind');
    var stdPane = $('guess-standard-pane');
    var blindPane = $('guess-blind-pane');
    if (stdBtn) stdBtn.classList.toggle('active', next === 'standard');
    if (blindBtn) blindBtn.classList.toggle('active', next === 'blind');
    if (stdPane) stdPane.classList.toggle('hidden', next !== 'standard');
    if (blindPane) blindPane.classList.toggle('hidden', next !== 'blind');
    if (next === 'blind') renderBlindPane();
    else renderGuessView();
  }

  function renderGuessView() {
    var strip = $('guess-vault-strip');
    if (state.samples.length === 0) {
      strip.innerHTML = '<span class="labs-hint-text">No saved farts yet. Record a new fart first!</span>';
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
            '<span>' + esc(getSampleName(s)) + '</span>' +
            scoreBadge +
            '</button>'
          );
        })
        .join('');

      strip.querySelectorAll('[data-pick-fart]').forEach(function (b) {
        b.addEventListener('click', function () {
          openGuessMode(this.getAttribute('data-pick-fart'));
        });
      });
    }

    var target = getSampleById(state.guessTargetId);
    $('guess-empty-target').classList.toggle('hidden', Boolean(target));
    $('guess-loaded-pane').classList.toggle('hidden', !target);
    $('btn-guess-rec').disabled = !target;
    if ($('btn-guess-random')) {
      $('btn-guess-random').disabled = state.samples.length === 0;
    }

    if (target) {
      var feat = target.features || TootApp.DSP.extractFeatures(target.samples, target.sampleRate);
      target.features = feat;
      var prof = TootApp.DSP.describeSoundProfile(feat);
      var tStats = TootLabs.Store.getSampleStats(target.id);
      $('guess-target-name').textContent = getSampleName(target);
      $('guess-target-dur').textContent = (target.samples.length / target.sampleRate).toFixed(2) + 's';
      $('guess-target-meta').textContent = formatDateShort(target.createdAt) + ' · ' + prof.pitchLabel + ' · ' + prof.textureLabel;
      if ($('guess-target-best')) {
        $('guess-target-best').textContent = tStats.attemptCount > 0 ? 'Best: ' + tStats.bestScore.toFixed(1) + '%' : 'Best: —';
      }
    }

    var prevPanel = $('guess-preview-panel');
    if (target && state.pendingGuess) {
      prevPanel.classList.remove('hidden');
      var gDur = state.pendingGuess.samples.length / state.pendingGuess.sampleRate;
      var oDur = target.samples.length / target.sampleRate;
      $('guess-attempt-dur').textContent = gDur.toFixed(2) + 's';
      $('guess-preview-ratio').textContent = 'Original ' + oDur.toFixed(2) + 's vs Guess ' + gDur.toFixed(2) + 's';
      $('guess-rec-status').textContent = 'Add another guesser or tap ANALYZE RESULTS to determine the winner.';
    } else {
      prevPanel.classList.add('hidden');
      $('guess-attempt-dur').textContent = target ? 'Standby' : 'No Fart';
      if (!TootApp.Audio.isRecordingOrStarting()) {
        $('guess-rec-label').textContent = 'Record Guess';
        $('guess-rec-status').textContent = target
          ? state.sessionGuesses.length > 0
            ? state.sessionGuesses.length + ' guess(es) queued — next default: Guesser ' + (state.sessionGuesses.length + 1)
            : 'Next default label: Guesser 1'
          : 'Record or select a saved fart above first.';
      }
    }

    renderSessionQueue();
    renderGuessLeaderboard();
    drawGuessWaveforms();
  }

  function openGuessMode(sampleId) {
    TootApp.Audio.stopAll();
    var resolvedId = sampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id) || null;
    if (sampleId && sampleId !== state.guessTargetId) {
      state.sessionGuesses = [];
    }
    state.guessTargetId = resolvedId;
    state.pendingGuess = null;
    $('guess-live-wave').classList.add('hidden');

    if (!resolvedId) {
      state.guessAttempts = [];
      showView('guess');
      renderGuessView();
      return;
    }

    TootLabs.Store.loadAttemptsForSample(resolvedId).then(function (attempts) {
      state.guessAttempts = attempts || [];
      showView('guess');
      renderGuessView();
    });
  }

  function pickRandomGuessTarget() {
    if (!state.samples || state.samples.length === 0) {
      showToast('No saved farts in Vault yet — record one first!', true);
      return null;
    }
    var pool = state.samples.length > 1
      ? state.samples.filter(function (s) { return s.id !== state.guessTargetId; })
      : state.samples;
    if (pool.length === 0) pool = state.samples;
    var chosen = pool[Math.floor(Math.random() * pool.length)];
    openGuessMode(chosen.id);
    showToast('🎲 Random Vault Fart: "' + getSampleName(chosen) + '"');
    return chosen;
  }

  function addAnotherGuesser() {
    if (!state.pendingGuess) {
      showToast('Record a guess first before adding another player.', true);
      return null;
    }
    var defaultLabel = 'Guesser ' + (state.sessionGuesses.length + 1);
    var typed = ($('guess-name-input').value || '').trim();
    var entry = Object.assign({}, state.pendingGuess, { name: typed || defaultLabel });
    state.sessionGuesses.push(entry);
    state.pendingGuess = null;
    $('guess-name-input').value = '';
    renderGuessView();
    showToast(entry.name + ' recorded! Ready for Guesser ' + (state.sessionGuesses.length + 1) + '.');
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
      state.lastSessionResults = outcomes;
      state.lastOutcome = outcomes[0];
      state.guessTargetId = target.id;
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
          showView('result');
          renderResultScreen(state.lastOutcome, state.lastSessionResults);
        }
      );
      return outcomes;
    });
  }

  function analyzeSessionGuesses() {
    var target = getSampleById(state.guessTargetId);
    if (!target) {
      showToast('Select a fart first.', true);
      return Promise.resolve([]);
    }
    if (state.pendingGuess) {
      var fallbackName = 'Guesser ' + (state.sessionGuesses.length + 1);
      var customName = ($('guess-name-input').value || '').trim() || fallbackName;
      state.sessionGuesses.push(Object.assign({}, state.pendingGuess, { name: customName }));
      state.pendingGuess = null;
      $('guess-name-input').value = '';
    }
    if (state.sessionGuesses.length === 0) {
      showToast('Record at least one guess first.', true);
      return Promise.resolve([]);
    }
    var batch = state.sessionGuesses.slice();
    state.sessionGuesses = [];
    return analyzeAndShowResults(target, batch);
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
      state.blindGuesses.push({
        id: 'blind_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: nm,
        sampleRate: sr,
        samples: res.clippedSamples,
        clipInfo: res.clipInfo,
        features: TootApp.DSP.extractFeatures(res.clippedSamples, sr)
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
    if (btn) btn.textContent = useAuto ? '⏹ Disarm Auto' : '⏹ Stop Original Fart';
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

  function renderResultScreen(outcome, sessionResults) {
    if (!outcome) return;
    clearResultAnimations();

    var resultsList = Array.isArray(sessionResults) && sessionResults.length > 0 ? sessionResults : [outcome];
    var target = outcome.targetSound;
    var exact = outcome.exactScore;
    var rank = outcome.rank;
    var reward = outcome.reward;
    var stats = outcome.sampleStats || {};

    var stageEl = document.querySelector ? document.querySelector('#labs-view-result .labs-result-stage') : null;
    if (stageEl && stageEl.classList) {
      stageEl.classList.remove('reveal-enter');
      try { void stageEl.offsetWidth; } catch (e) {}
      stageEl.classList.add('reveal-enter');
    }

    $('res-sample-context').textContent =
      'ORIGINAL FART: ' + getSampleName(target).toUpperCase() + ' · ' + resultsList.length + (resultsList.length === 1 ? ' GUESS' : ' GUESSES');

    var winChip = $('res-winner-chip');
    if (winChip) {
      winChip.textContent = '🏆 ' + (outcome.attempt.name || 'Guesser 1') + ' · ' + exact.toFixed(1) + '%';
    }

    // Hero Leaderboard Card
    var lbListEl = $('res-leaderboard-list');
    if (lbListEl) {
      lbListEl.innerHTML = resultsList
        .map(function (item, idx) {
          var s = typeof item.exactScore === 'number' ? item.exactScore : 0;
          var rk = item.rank || TootLabs.Store.getRankForScore(s);
          var ms = item.metricsSummary || {};
          var isWinner = idx === 0;
          return (
            '<div class="labs-res-lb-row' + (isWinner ? ' first-place' : '') + '">' +
            '  <div class="labs-res-lb-main">' +
            '    <div class="labs-res-lb-left">' +
            '      <span class="labs-res-place">' + placeLabel(idx) + '</span>' +
            '      <div>' +
            '        <div class="labs-res-guesser-name">' + esc(item.attempt.name) + (isWinner ? ' <span class="labs-closest-badge">Closest Match</span>' : '') + '</div>' +
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
          if (row && row.attempt) TootApp.Audio.playSound(row.attempt.samples, row.attempt.sampleRate, { channel: 'res_lb' });
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

    var pbEl = $('res-pb-pill');
    pbEl.classList.add('hidden');

    var rankBlockEl = document.querySelector ? document.querySelector('#labs-view-result .labs-rank-block') : null;
    var rewardStageEl = $('res-reward-stage');
    if (rankBlockEl && rankBlockEl.classList) rankBlockEl.classList.add('labs-reveal-pending');
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

    $('res-best-score').textContent = (stats.bestScore || exact).toFixed(1) + '%';
    $('res-prev-score').textContent =
      typeof outcome.previousScore === 'number' ? outcome.previousScore.toFixed(1) + '%' : 'Baseline';
    $('res-current-score').textContent = exact.toFixed(1) + '%';

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
      deltaNoteEl.textContent = 'First guess recorded — hand the phone to Guesser 2 or play another round to beat ' + exact.toFixed(1) + '%!';
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
        if (state.view !== 'result') return;
        if (rankBlockEl && rankBlockEl.classList) rankBlockEl.classList.remove('labs-reveal-pending');
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
            if (state.view !== 'result') return;
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
          if (state.view !== 'result') return;
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
  function openFartnalysis(mode, sampleId, attemptId) {
    if (mode) state.fnMode = mode;
    var resolvedSampleId = sampleId || state.fnSampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id) || null;
    state.fnSampleId = resolvedSampleId;

    if (!resolvedSampleId) {
      state.fnAttempts = [];
      state.fnAttemptId = null;
      showView('fartnalysis');
      renderFartnalysisView();
      return;
    }

    TootLabs.Store.loadAttemptsForSample(resolvedSampleId).then(function (attempts) {
      state.fnAttempts = attempts || [];
      if (attemptId) {
        state.fnAttemptId = attemptId;
      } else if (state.fnAttemptId && state.fnAttempts.some(function (a) { return a.id === state.fnAttemptId; })) {
        // keep current
      } else {
        state.fnAttemptId = state.fnAttempts[0] ? state.fnAttempts[0].id : null;
      }
      showView('fartnalysis');
      renderFartnalysisView();
    });
  }

  function syncFartnalysisPickers() {
    var modeBtns = document.querySelectorAll('#fn-mode-tabs .labs-mode-tab');
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-fn-mode') === state.fnMode);
    }

    var pickersBar = $('fn-pickers-bar');
    var sampleSel = $('fn-sample-select');
    var guessField = $('fn-guess-field');
    var guessSel = $('fn-guess-select');

    if (state.fnMode === 'group') {
      pickersBar.classList.add('hidden');
      return;
    }

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
      if (state.samples.length === 0) {
        emptyEl.classList.remove('hidden');
        emptyTitle.textContent = 'No Archive Specimens for Megamix';
        emptyCopy.textContent = 'Log at least one acoustic specimen to assemble the Multi-Specimen Megamix Research Summary.';
        mountEl.innerHTML = '';
        return;
      }
      var groupObj = TootLabs.Store.composeMultiFartTrack(state.samples, {
        sortBy: state.groupSortBy,
        sortDir: state.groupSortDir
      });
      emptyEl.classList.add('hidden');
      state.fnController = TootLabs.Fartnalysis.renderGroupDashboard(mountEl, {
        groupObj: groupObj,
        archiveSamples: state.samples,
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
      return;
    }

    var sample = getSampleById(state.fnSampleId);
    if (!sample) {
      emptyEl.classList.remove('hidden');
      emptyTitle.textContent = 'No Primary Specimen Selected';
      emptyCopy.textContent = 'Record an acoustic specimen to generate a complete Fartnalysis Report and Laboratory Findings.';
      mountEl.innerHTML = '';
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
        TootLabs.Store.renameAttempt(state.renameTarget.item, next).then(function () {
          renameModal.classList.add('hidden');
          renderGuessLeaderboard();
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
        } else if (targetView === 'fartnalysis') {
          openFartnalysis(state.fnMode || 'original', state.fnSampleId, state.fnAttemptId);
        }
      });
    });

    // Global Quick Record & Bar Actions
    $('btn-quick-stop-save').addEventListener('click', function () {
      if (state.recordingKind === 'quick' && state.activeRecStopper) {
        state.activeRecStopper();
      }
    });
    $('btn-quick-play').addEventListener('click', function () {
      var s = getSampleById(state.quickSavedId);
      if (s) TootApp.Audio.playSound(s.samples, s.sampleRate, { channel: 'quick_play' });
    });
    $('btn-quick-guess').addEventListener('click', function () {
      if (state.quickSavedId) openGuessMode(state.quickSavedId);
    });
    $('btn-quick-analyze').addEventListener('click', function () {
      if (state.quickSavedId) openFartnalysis('original', state.quickSavedId, null);
    });
    $('btn-quick-dismiss').addEventListener('click', function () {
      $('labs-quick-rec-bar').classList.add('hidden');
    });

    // Home 3 Primary Action Cards & Meet The Team
    $('btn-home-record-fart').addEventListener('click', startQuickRecordFart);
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
    });
    if ($('btn-home-meet-team')) {
      $('btn-home-meet-team').addEventListener('click', openTeamView);
    }

    // Vault View Buttons & Airlock Door
    $('btn-vault-record').addEventListener('click', startQuickRecordFart);
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
    });
    $('btn-detail-play').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample) return;
      TootApp.Audio.playSound(sample.samples, sample.sampleRate, {
        channel: 'detail_play',
        onProgress: function (p) { drawDetailWaveform(p); },
        onEnded: function () { drawDetailWaveform(null); }
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

    // Guess View Buttons
    if ($('btn-guess-random')) {
      $('btn-guess-random').addEventListener('click', pickRandomGuessTarget);
    }
    $('btn-guess-record-new').addEventListener('click', startQuickRecordFart);
    $('btn-guess-empty-rec').addEventListener('click', startQuickRecordFart);

    function playGuessTargetFart() {
      var target = getSampleById(state.guessTargetId);
      if (!target) return;
      TootApp.Audio.playSound(target.samples, target.sampleRate, {
        channel: 'guess_orig',
        onProgress: function (p) {
          drawStaticWaveform($('guess-target-wave'), target.samples, { fallbackW: 480, fallbackH: 66, progress: p });
        },
        onEnded: function () {
          drawGuessWaveforms();
        }
      });
    }

    $('btn-guess-play').addEventListener('click', playGuessTargetFart);
    $('btn-guess-replay').addEventListener('click', playGuessTargetFart);
    $('btn-guess-analyze-orig').addEventListener('click', function () {
      if (state.guessTargetId) openFartnalysis('original', state.guessTargetId, null);
    });
    $('btn-guess-rec').addEventListener('click', startGuessCapture);
    $('btn-guess-prev-orig').addEventListener('click', playGuessTargetFart);
    $('btn-guess-prev-att').addEventListener('click', function () {
      if (state.pendingGuess) TootApp.Audio.playSound(state.pendingGuess.samples, state.pendingGuess.sampleRate, { channel: 'prev_g' });
    });
    $('btn-guess-prev-ab').addEventListener('click', function () {
      var target = getSampleById(state.guessTargetId);
      if (target && state.pendingGuess) {
        TootApp.Audio.playSequence(
          [
            { samples: target.samples, sampleRate: target.sampleRate, channel: 'prev_o' },
            { samples: state.pendingGuess.samples, sampleRate: state.pendingGuess.sampleRate, channel: 'prev_g' }
          ],
          220
        );
      }
    });
    $('btn-guess-redo').addEventListener('click', function () {
      state.pendingGuess = null;
      renderGuessView();
    });
    $('btn-guess-add-another').addEventListener('click', addAnotherGuesser);
    $('btn-guess-judge').addEventListener('click', analyzeSessionGuesses);
    $('btn-guess-queue-analyze').addEventListener('click', analyzeSessionGuesses);

    // Guess Sub-Modes (Primary vs Blind Prediction Experimental Mode)
    $('btn-submode-standard').addEventListener('click', function () {
      setGuessSubMode('standard');
    });
    $('btn-submode-blind').addEventListener('click', function () {
      setGuessSubMode('blind');
    });
    $('btn-blind-rec-guess').addEventListener('click', startBlindGuessCapture);
    $('btn-blind-rec-orig').addEventListener('click', startBlindOriginalCapture);
    $('btn-blind-analyze').addEventListener('click', analyzeBlindSession);

    // Match Result Buttons
    $('btn-res-next-guesser').addEventListener('click', function () {
      var sid = (state.lastOutcome && state.lastOutcome.targetSound && state.lastOutcome.targetSound.id) || state.guessTargetId;
      openGuessMode(sid);
    });
    $('btn-res-compare').addEventListener('click', function () {
      if (state.lastOutcome) {
        openFartnalysis('comparison', state.lastOutcome.targetSound.id, state.lastOutcome.attempt.id);
      }
    });
    $('btn-res-leaderboard').addEventListener('click', function () {
      var sid = (state.lastOutcome && state.lastOutcome.targetSound && state.lastOutcome.targetSound.id) || state.guessTargetId;
      openGuessMode(sid);
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

    // Fartnalysis Mode Switcher & Selectors
    document.querySelectorAll('#fn-mode-tabs .labs-mode-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var mode = this.getAttribute('data-fn-mode');
        openFartnalysis(mode, state.fnSampleId, state.fnAttemptId);
      });
    });

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
    });

    $('btn-fn-go-guess').addEventListener('click', function () {
      renderVaultView();
      showView('vault');
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
      else if (state.view === 'guess') drawGuessWaveforms();
      else if (state.view === 'fartnalysis' && state.fnController) state.fnController.resize();
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

    TootLabs.Store.loadVaultSamples()
      .then(function (list) {
        state.samples = list || [];
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
    openGuessMode: openGuessMode,
    setGuessSubMode: setGuessSubMode,
    addAnotherGuesser: addAnotherGuesser,
    analyzeSessionGuesses: analyzeSessionGuesses,
    analyzeBlindSession: analyzeBlindSession,
    pickRandomGuessTarget: pickRandomGuessTarget,
    openFartnalysis: openFartnalysis,
    setRecordMode: setRecordMode,
    pickAnalysisStages: pickAnalysisStages,
    runAnalysisSequence: runAnalysisSequence
  };
})(typeof window !== 'undefined' ? window : globalThis);
