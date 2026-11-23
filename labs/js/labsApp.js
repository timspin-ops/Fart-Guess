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
    samples: [],
    detailSampleId: null,
    detailAttempts: [],
    guessTargetId: null,
    guessAttempts: [],
    pendingGuess: null,
    lastOutcome: null,
    quickSavedId: null,
    fnMode: 'original',
    fnSampleId: null,
    fnAttempts: [],
    fnAttemptId: null,
    fnController: null,
    renameTarget: null,
    activeRecStopper: null,
    recordingKind: null,
    resultTimers: [],
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

  function emailAudioSound(sound, roleLabel) {
    if (!sound || !sound.samples) return;
    var Audio = root.TootApp && root.TootApp.Audio;
    if (!Audio || typeof Audio.encodeWavBlob !== 'function') {
      showToast('Audio encoder unavailable', true);
      return;
    }
    var name = getSampleName(sound);
    var filename = slugFilename(name) + '.wav';
    var wavBlob = Audio.encodeWavBlob(sound.samples, sound.sampleRate || 44100);
    var summary = TootLabs.Store.buildSingleAnalysisReportText(sound, roleLabel || 'FART RECORDING');

    // Use native iOS/mobile share sheet with file attachment when supported
    if (typeof File === 'function' && navigator.share && typeof navigator.canShare === 'function') {
      try {
        var file = new File([wavBlob], filename, { type: 'audio/wav' });
        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({
              title: 'Toot Match — ' + name,
              text: summary,
              files: [file]
            })
            .catch(function () {});
          return;
        }
      } catch (e) {}
    }

    // Desktop fallback: download WAV file + open pre-filled email draft
    triggerBlobDownload(wavBlob, filename);
    openMailDraft(
      'Toot Match Audio: ' + name,
      summary + '\n\n(Attach downloaded audio file "' + filename + '" to send.)'
    );
    showToast('Downloaded "' + filename + '" & opened email draft (attach file to send)');
  }

  function emailAnalysisReport(subject, reportText) {
    if (!reportText) return;
    copyTextQuiet(reportText).then(function (copied) {
      openMailDraft(subject, reportText);
      showToast(copied ? 'Opened email draft & copied report to clipboard' : 'Opened email draft with report');
    });
  }

  function shareTextOrAudio(title, text, sound) {
    var Audio = root.TootApp && root.TootApp.Audio;
    if (sound && sound.samples && Audio && typeof Audio.encodeWavBlob === 'function' && typeof File === 'function' && navigator.share && typeof navigator.canShare === 'function') {
      try {
        var wavBlob = Audio.encodeWavBlob(sound.samples, sound.sampleRate || 44100);
        var file = new File([wavBlob], slugFilename(getSampleName(sound)) + '.wav', { type: 'audio/wav' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ title: title, text: text, files: [file] }).catch(function () {});
          return;
        }
      } catch (e) {}
    }

    if (navigator.share) {
      navigator.share({ title: title, text: text }).catch(function () {});
      return;
    }

    copyTextQuiet(text).then(function (ok) {
      showToast(ok ? 'Report copied to clipboard' : 'Unable to access clipboard', !ok);
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

  /* ==================== NAVIGATION ==================== */
  function showView(viewKey) {
    if (state.view === 'result' && viewKey !== 'result') {
      clearResultAnimations();
    }
    state.view = viewKey;

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

    $('btn-labs-mic-drawer').addEventListener('click', function () {
      $('labs-mic-drawer').classList.toggle('hidden');
    });

    $('btn-labs-stop').addEventListener('click', function () {
      TootApp.Audio.stopAll();
      if (TootApp.Audio.isMicTesting()) {
        TootApp.Audio.stopMicTest();
        resetMicTestUI('Ready');
      }
    });

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

  /* Instant 1-Tap Quick Record (Anywhere in App) */
  function startQuickRecordFart() {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (state.recordingKind === 'quick' && TootApp.Audio.isRecording() && state.activeRecStopper) {
        state.activeRecStopper();
      }
      return;
    }

    resetMicTestUI('Ready');
    state.recordingKind = 'quick';
    var topBtn = $('btn-labs-quick-record');
    var bar = $('labs-quick-rec-bar');
    var capPane = $('labs-quick-capturing');
    var savedPane = $('labs-quick-saved');
    var timerEl = $('labs-quick-timer');
    var waveEl = $('labs-quick-wave');
    var stopBtn = $('btn-quick-stop-save');
    var settled = false;

    bar.classList.remove('hidden');
    capPane.classList.remove('hidden');
    savedPane.classList.add('hidden');
    stopBtn.disabled = false;

    var isWarm = Boolean(TootApp.Audio.hasWarmMic && TootApp.Audio.hasWarmMic());
    timerEl.textContent = isWarm ? 'Recording…' : 'Requesting mic…';
    topBtn.classList.add('recording');
    topBtn.textContent = '⏹ Stop & Save';

    function finalizeQuick(res) {
      if (settled) return;
      settled = true;
      state.activeRecStopper = null;
      state.recordingKind = null;
      topBtn.classList.remove('recording');
      topBtn.textContent = '● Record Fart';
      stopBtn.disabled = false;

      if (!res || !res.ok) {
        capPane.classList.add('hidden');
        bar.classList.add('hidden');
        var micName = (res && res.trackLabel) || 'Default Microphone';
        var msg;
        if (res && res.reason === 'all_zeros') {
          msg = 'No sound captured from "' + micName + '" — check 🎙️ Mic settings.';
          $('labs-mic-drawer').classList.remove('hidden');
        } else if (res && res.reason === 'too_quiet') {
          msg = 'Fart was too quiet on "' + micName + '" — try 2x/4x Boost in 🎙️ Mic.';
          $('labs-mic-drawer').classList.remove('hidden');
        } else {
          msg = (res && res.error) || 'Could not capture audio. Check microphone permissions.';
        }
        showToast(msg, true);
        return;
      }

      TootLabs.Store.saveNewSpecimen(res).then(function (saved) {
        state.samples.unshift(saved);
        state.quickSavedId = saved.id;
        if (!state.guessTargetId) state.guessTargetId = saved.id;
        if (!state.fnSampleId) state.fnSampleId = saved.id;

        capPane.classList.add('hidden');
        savedPane.classList.remove('hidden');
        $('labs-quick-saved-name').textContent = getSampleName(saved);

        renderHomeView();
        renderVaultView();
        if (state.view === 'guess') renderGuessView();
        showToast('Saved "' + getSampleName(saved) + '" to Fart Vault!');
      });
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
      topBtn.classList.remove('recording');
      topBtn.textContent = '● Record Fart';
      bar.classList.add('hidden');
      showToast((err && err.message) || 'Microphone unavailable.', true);
    });
  }

  function startGuessCapture() {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (state.recordingKind === 'guess' && TootApp.Audio.isRecording() && state.activeRecStopper) {
        state.activeRecStopper();
      }
      return;
    }

    var target = getSampleById(state.guessTargetId);
    if (!target) {
      showToast('Select or record a fart first.', true);
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
            ? 'No audio captured from "' + micName + '". Check 🎙️ Mic.'
            : res && res.reason === 'too_quiet'
            ? 'Guess was too quiet — increase Gain in 🎙️ Mic.'
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

      var defaultNum = state.guessAttempts.length + 1;
      $('guess-name-input').value = 'Guesser ' + defaultNum;
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
      '    <button type="button" class="labs-vc-btn" data-vc-act="share" data-vc-id="' + esc(s.id) + '">📤 Share</button>' +
      '    <button type="button" class="labs-vc-btn" data-vc-act="email_mp3" data-vc-id="' + esc(s.id) + '">🎵 Email MP3</button>' +
      '    <button type="button" class="labs-vc-btn" data-vc-act="email_report" data-vc-id="' + esc(s.id) + '">📧 Email Analysis</button>' +
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
        } else if (act === 'share') {
          shareTextOrAudio(
            'Toot Match — ' + getSampleName(sample),
            TootLabs.Store.buildSingleAnalysisReportText(sample, 'SAVED FART'),
            sample
          );
        } else if (act === 'email_mp3') {
          emailAudioSound(sample, 'SAVED FART');
        } else if (act === 'email_report') {
          emailAnalysisReport(
            'Fartnalysis Report: ' + getSampleName(sample),
            TootLabs.Store.buildSingleAnalysisReportText(sample, 'ORIGINAL FART ANALYSIS')
          );
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

    if (target) {
      var feat = target.features || TootApp.DSP.extractFeatures(target.samples, target.sampleRate);
      target.features = feat;
      var prof = TootApp.DSP.describeSoundProfile(feat);
      $('guess-target-name').textContent = getSampleName(target);
      $('guess-target-dur').textContent = (target.samples.length / target.sampleRate).toFixed(2) + 's';
      $('guess-target-meta').textContent = formatDateShort(target.createdAt) + ' · ' + prof.pitchLabel + ' · ' + prof.textureLabel;
    }

    var prevPanel = $('guess-preview-panel');
    if (target && state.pendingGuess) {
      prevPanel.classList.remove('hidden');
      var gDur = state.pendingGuess.samples.length / state.pendingGuess.sampleRate;
      var oDur = target.samples.length / target.sampleRate;
      $('guess-attempt-dur').textContent = gDur.toFixed(2) + 's';
      $('guess-preview-ratio').textContent = 'Original ' + oDur.toFixed(2) + 's vs Guess ' + gDur.toFixed(2) + 's';
      $('guess-rec-status').textContent = 'Optional: enter guesser name, then tap JUDGE THIS GUESS.';
    } else {
      prevPanel.classList.add('hidden');
      $('guess-attempt-dur').textContent = target ? 'Standby' : 'No Fart';
      if (!TootApp.Audio.isRecordingOrStarting()) {
        $('guess-rec-status').textContent = target
          ? 'Next default label: Guesser ' + (state.guessAttempts.length + 1)
          : 'Record or select a saved fart above first.';
      }
    }

    renderGuessLeaderboard();
    drawGuessWaveforms();
  }

  function openGuessMode(sampleId) {
    TootApp.Audio.stopAll();
    var resolvedId = sampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id) || null;
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

  function judgePendingGuess() {
    var target = getSampleById(state.guessTargetId);
    if (!target || !state.pendingGuess) {
      showToast('Record a guess first.', true);
      return;
    }

    var featA = target.features || TootApp.DSP.extractFeatures(target.samples, target.sampleRate);
    var featB = state.pendingGuess.features || TootApp.DSP.extractFeatures(state.pendingGuess.samples, state.pendingGuess.sampleRate);
    target.features = featA;
    state.pendingGuess.features = featB;

    var customName = $('guess-name-input').value.trim();
    var result = TootApp.DSP.compareSounds(featA, featB);

    TootLabs.Store.recordChallengeResult(target, state.pendingGuess, result, { guesserName: customName }).then(function (outcome) {
      state.guessAttempts.unshift(outcome.attempt);
      state.pendingGuess = null;
      state.lastOutcome = Object.assign({}, outcome, { targetSound: target });
      state.fnSampleId = target.id;
      state.fnAttemptId = outcome.attempt.id;

      renderHomeView();
      renderVaultView();
      showView('result');
      renderResultScreen(state.lastOutcome);
    });
  }

  /* ==================== MATCH RESULT SCREEN ==================== */
  function renderResultScreen(outcome) {
    if (!outcome) return;
    clearResultAnimations();

    var target = outcome.targetSound;
    var exact = outcome.exactScore;
    var rank = outcome.rank;
    var reward = outcome.reward;
    var stats = outcome.sampleStats || {};

    $('res-sample-context').textContent =
      (outcome.attempt.name || 'Guesser').toUpperCase() + ' vs ' + getSampleName(target).toUpperCase();

    var pbEl = $('res-pb-pill');
    pbEl.classList.add('hidden');

    var ringFg = $('res-ring-fg');
    var radius = 90;
    var circ = 2 * Math.PI * radius;
    ringFg.style.transition = 'none';
    ringFg.style.strokeDasharray = circ.toFixed(2);
    ringFg.style.strokeDashoffset = circ.toFixed(2);
    void ringFg.getBoundingClientRect();

    var targetOffset = circ * (1 - Math.max(0, Math.min(100, exact)) / 100);
    ringFg.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(0.22, 1, 0.36, 1)';
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
    var durationMs = 1100;
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
    $('res-rank-desc').textContent = rank.desc;

    $('res-best-score').textContent = (stats.bestScore || exact).toFixed(1) + '%';
    $('res-prev-score').textContent =
      typeof outcome.previousScore === 'number' ? outcome.previousScore.toFixed(1) + '%' : 'Baseline';
    $('res-current-score').textContent = exact.toFixed(1) + '%';

    var deltaNoteEl = $('res-delta-note');
    if (typeof outcome.previousScore === 'number') {
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
      deltaNoteEl.textContent = 'First guess recorded — hand the phone to Guesser 2 or try to beat ' + exact.toFixed(1) + '%!';
    }

    $('res-verdict-text').textContent = outcome.verdict;

    var starsRow = $('res-stars-row');
    var bellLabel = $('res-bell-label');
    var legTitleEl = $('res-legendary-title');
    starsRow.innerHTML = '';
    bellLabel.textContent = 'Assigning Telemetry Rating…';
    legTitleEl.classList.add('hidden');
    legTitleEl.textContent = '';

    if (outcome.isPersonalBest) {
      state.resultTimers.push(setTimeout(function () { pbEl.classList.remove('hidden'); }, 480));
    }

    var startDelay = 620;
    var stepMs = 340;
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
      var finaleAt = startDelay + reward.stars * stepMs + 340;
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
          ? '<option value="">No guesses recorded yet</option>'
          : state.fnAttempts
              .map(function (a) {
                return (
                  '<option value="' +
                  esc(a.id) +
                  '">' +
                  esc(a.name + ' (' + (a.exactScore || 0).toFixed(1) + '%)') +
                  '</option>'
                );
              })
              .join('');
      if (state.fnAttemptId) guessSel.value = state.fnAttemptId;
    }
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
        emptyTitle.textContent = 'No Farts in Vault for Megamix';
        emptyCopy.textContent = 'Record at least one fart (or several!) to assemble the Coherent Multi-Fart Megamix.';
        mountEl.innerHTML = '';
        return;
      }
      var groupObj = TootLabs.Store.composeMultiFartTrack(state.samples);
      emptyEl.classList.add('hidden');
      state.fnController = TootLabs.Fartnalysis.renderGroupDashboard(mountEl, {
        groupObj: groupObj,
        onEmailAudio: function (g) {
          emailAudioSound(g, 'MULTI-FART MEGAMIX');
        },
        onEmailAnalysis: function (g) {
          emailAnalysisReport('Multi-Fart Megamix Analysis', TootLabs.Store.buildGroupAnalysisReportText(g));
        }
      });
      return;
    }

    var sample = getSampleById(state.fnSampleId);
    if (!sample) {
      emptyEl.classList.remove('hidden');
      emptyTitle.textContent = 'No Saved Fart Selected';
      emptyCopy.textContent = 'Record a fart first to inspect full FFT, frequency, envelope, and 3D spectrogram data.';
      mountEl.innerHTML = '';
      return;
    }

    if (state.fnMode === 'original') {
      emptyEl.classList.add('hidden');
      state.fnController = TootLabs.Fartnalysis.renderSingleDashboard(mountEl, {
        sound: sample,
        label: getSampleName(sample),
        eyebrow: '1 · ORIGINAL FART ANALYSIS',
        primaryLabel: '🎯 Guess This Fart',
        onPrimaryAction: function (s) {
          openGuessMode(s.id);
        },
        onShare: function (s) {
          shareTextOrAudio('Fartnalysis: ' + getSampleName(s), TootLabs.Store.buildSingleAnalysisReportText(s, 'ORIGINAL FART ANALYSIS'), s);
        },
        onEmailAudio: function (s) {
          emailAudioSound(s, 'ORIGINAL FART');
        },
        onEmailAnalysis: function (s) {
          emailAnalysisReport('Fartnalysis Report: ' + getSampleName(s), TootLabs.Store.buildSingleAnalysisReportText(s, 'ORIGINAL FART ANALYSIS'));
        }
      });
      return;
    }

    var attempt = state.fnAttempts.find(function (a) { return a.id === state.fnAttemptId; }) || state.fnAttempts[0] || null;
    if (!attempt) {
      emptyEl.classList.remove('hidden');
      emptyTitle.textContent = 'No Guesses Recorded Yet for "' + getSampleName(sample) + '"';
      emptyCopy.textContent = 'Head to Guess A Fart and record at least one player guess to unlock Guess Analysis and Comparison.';
      mountEl.innerHTML = '';
      return;
    }
    state.fnAttemptId = attempt.id;

    if (state.fnMode === 'guess') {
      emptyEl.classList.add('hidden');
      state.fnController = TootLabs.Fartnalysis.renderSingleDashboard(mountEl, {
        sound: attempt,
        label: attempt.name + ' (Guess for ' + getSampleName(sample) + ')',
        eyebrow: '2 · GUESS FORENSIC ANALYSIS',
        primaryLabel: '⚖️ Compare vs Original',
        onPrimaryAction: function () {
          openFartnalysis('comparison', sample.id, attempt.id);
        },
        onShare: function (g) {
          shareTextOrAudio('Guess Analysis: ' + g.name, TootLabs.Store.buildSingleAnalysisReportText(g, 'GUESS ANALYSIS'), g);
        },
        onEmailAudio: function (g) {
          emailAudioSound(g, 'GUESS RECORDING');
        },
        onEmailAnalysis: function (g) {
          emailAnalysisReport('Guess Fartnalysis: ' + g.name, TootLabs.Store.buildSingleAnalysisReportText(g, 'GUESS ANALYSIS'));
        }
      });
      return;
    }

    // 3. Comparison Analysis (full 12 circular gauges + 9 Forensics drawers + side-by-side 3D spectrograms)
    emptyEl.classList.add('hidden');
    state.fnController = TootLabs.Fartnalysis.renderDashboard(mountEl, {
      soundA: sample,
      soundB: attempt,
      labelA: getSampleName(sample),
      labelB: attempt.name,
      result: attempt.result || null,
      onShare: function (sA, sB, r, exact) {
        shareTextOrAudio(
          'Toot Match Comparison: ' + exact.toFixed(1) + '%',
          TootLabs.Store.buildComparisonReportText(sA, sB, r, exact),
          null
        );
      },
      onEmailAnalysis: function (sA, sB, r, exact) {
        emailAnalysisReport(
          'Toot Match Comparison: ' + sB.name + ' vs ' + getSampleName(sA),
          TootLabs.Store.buildComparisonReportText(sA, sB, r, exact)
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
    $('btn-labs-quick-record').addEventListener('click', startQuickRecordFart);
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

    // Home 3 Primary Action Cards
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

    // Vault View Buttons
    $('btn-vault-record').addEventListener('click', startQuickRecordFart);
    $('btn-vault-megamix').addEventListener('click', function () {
      openFartnalysis('group', null, null);
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
        shareTextOrAudio('Toot Match — ' + getSampleName(sample), TootLabs.Store.buildSingleAnalysisReportText(sample, 'SAVED FART'), sample);
      }
    });
    $('btn-detail-email-mp3').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (sample) emailAudioSound(sample, 'SAVED FART');
    });
    $('btn-detail-email-analysis').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (sample) {
        emailAnalysisReport('Fartnalysis Report: ' + getSampleName(sample), TootLabs.Store.buildSingleAnalysisReportText(sample, 'ORIGINAL FART ANALYSIS'));
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
    $('btn-guess-judge').addEventListener('click', judgePendingGuess);

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
        TootLabs.Store.buildComparisonReportText(o.targetSound, o.attempt, o.attempt.result, o.exactScore)
      );
    });
    $('btn-res-share').addEventListener('click', function () {
      if (!state.lastOutcome) return;
      var o = state.lastOutcome;
      shareTextOrAudio(
        'Toot Match Result: ' + o.exactScore.toFixed(1) + '%',
        TootLabs.Store.buildComparisonReportText(o.targetSound, o.attempt, o.attempt.result, o.exactScore),
        o.attempt
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
      openGuessMode(state.fnSampleId || state.guessTargetId);
    });

    $('btn-fn-go-guess').addEventListener('click', function () {
      openGuessMode(state.fnSampleId || state.guessTargetId || (state.samples[0] && state.samples[0].id));
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
    openGuessMode: openGuessMode,
    openFartnalysis: openFartnalysis
  };
})(typeof window !== 'undefined' ? window : globalThis);
