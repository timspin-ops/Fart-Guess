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

  var state = {
    view: 'home',
    samples: [],
    detailSampleId: null,
    detailAttempts: [],
    challengeTargetId: null,
    recordingSpecimenMode: false,
    pendingAttempt: null,
    lastOutcome: null,
    fnSampleId: null,
    fnAttempts: [],
    fnAttemptId: null,
    fnController: null,
    activeRec: null,
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
    }, isErr ? 4400 : 2800);
  }

  function getSampleById(id) {
    if (!id) return null;
    for (var i = 0; i < state.samples.length; i++) {
      if (state.samples[i].id === id) return state.samples[i];
    }
    return null;
  }

  function getSampleName(s) {
    if (!s) return 'Specimen';
    return s.displayName || (TootLabs.Store ? TootLabs.Store.ensureNickname(s) : s.name) || 'Specimen';
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
    var ctx = sized.ctx;
    var w = sized.w;
    var h = sized.h;

    ctx.clearRect(0, 0, w, h);

    // Subtle telemetry baseline
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
    var sized = sizeCanvasDpr(canvas, 320, 76);
    if (!sized) return;
    var ctx = sized.ctx;
    var w = sized.w;
    var h = sized.h;

    ctx.fillStyle = '#0B1222';
    ctx.fillRect(0, 0, w, h);

    var meterW = Math.min(1, rms * 5.2) * w;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
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
    var ctx = sized.ctx;
    var w = sized.w;
    var h = sized.h;

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
    ctx.fillText('SAMPLE', 8, 13);
    ctx.fillStyle = '#FED7AA';
    ctx.fillText('ATTEMPT', 8, h * 0.5 + 14);
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

  /* ==================== VIEW NAVIGATION ==================== */
  function showView(viewKey) {
    if (state.view === 'result' && viewKey !== 'result') {
      clearResultAnimations();
    }
    state.view = viewKey;

    var views = document.querySelectorAll('.labs-view');
    for (var i = 0; i < views.length; i++) {
      views[i].classList.toggle('active', views[i].id === 'labs-view-' + viewKey);
    }

    var navTarget = viewKey === 'detail' ? 'home' : viewKey === 'result' ? 'challenge' : viewKey;
    var navBtns = document.querySelectorAll('.labs-nav-btn');
    for (var n = 0; n < navBtns.length; n++) {
      navBtns[n].classList.toggle('active', navBtns[n].getAttribute('data-view') === navTarget);
    }

    if (typeof root.scrollTo === 'function') {
      root.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        if (viewKey === 'home') drawHomeVaultWaveforms();
        else if (viewKey === 'detail') drawDetailWaveform(null);
        else if (viewKey === 'challenge') drawChallengeWaveforms();
        else if (viewKey === 'fartnalysis' && state.fnController) state.fnController.resize();
      });
    }
  }

  /* ==================== MIC DRAWER & RECORDER ==================== */
  function refreshMicDevices() {
    var sel = $('labs-mic-device');
    if (!sel || !root.TootApp || !root.TootApp.Audio) return Promise.resolve();
    var currentVal = TootApp.Audio.getSelectedDevice() || sel.value || '';

    return TootApp.Audio.listInputDevices().then(function (devices) {
      var html = '<option value="">System Default Microphone</option>';
      for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        var lbl = d.label || 'Microphone ' + (i + 1) + ' (grant mic permission)';
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
      showToast('Microphone connection released');
    });

    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', refreshMicDevices);
    }
    refreshMicDevices();
  }

  function toggleCapture(cfg) {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (TootApp.Audio.isRecording() && state.activeRec && state.activeRec.finish) {
        state.activeRec.finish();
      }
      return;
    }

    resetMicTestUI('Ready');
    var btn = cfg.buttonEl;
    var labelEl = cfg.labelEl;
    var iconEl = cfg.iconEl;
    var statusEl = cfg.statusEl;
    var waveCanvas = cfg.waveCanvas;
    var settled = false;

    if (typeof cfg.onBeforeStart === 'function') cfg.onBeforeStart();

    var isWarm = Boolean(TootApp.Audio.hasWarmMic && TootApp.Audio.hasWarmMic());
    if (!isWarm) {
      btn.disabled = true;
      labelEl.textContent = 'Requesting Mic…';
      if (iconEl) iconEl.textContent = '⏳';
      if (statusEl) statusEl.textContent = 'Requesting microphone authorization…';
    } else if (statusEl) {
      statusEl.textContent = 'Arming input transducer…';
    }

    function finalize(res) {
      if (settled) return;
      settled = true;
      state.activeRec = null;
      btn.disabled = false;
      btn.classList.remove('recording');
      labelEl.textContent = cfg.idleLabel;
      if (iconEl) iconEl.textContent = cfg.idleIcon;

      if (!res || !res.ok) {
        var micName = (res && res.trackLabel) || 'Default Microphone';
        var msg;
        if (res && res.reason === 'all_zeros') {
          msg = 'No audio captured from "' + micName + '" — check input selection under 🎙️ Mic.';
          $('labs-mic-drawer').classList.remove('hidden');
        } else if (res && res.reason === 'too_quiet') {
          msg = 'Signal below noise floor on "' + micName + '" — increase Preamp Gain under 🎙️ Mic.';
          $('labs-mic-drawer').classList.remove('hidden');
        } else {
          msg = (res && res.error) || 'Capture failed. Check browser microphone permissions.';
        }
        if (statusEl) statusEl.textContent = msg;
        showToast(msg, true);
        if (typeof cfg.onError === 'function') cfg.onError(res);
        return;
      }

      cfg.onComplete(res);
    }

    state.activeRec = {
      finish: function () {
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Auto-clipping acoustic window…';
        TootApp.Audio.stopRecording().then(finalize);
      }
    };

    TootApp.Audio.startRecording({
      maxDurationSec: cfg.maxDurationSec || 7,
      onStarted: function () {
        btn.disabled = false;
        btn.classList.add('recording');
        labelEl.textContent = cfg.activeLabel;
        if (iconEl) iconEl.textContent = '⏹';
        if (waveCanvas) waveCanvas.classList.remove('hidden');
        refreshMicDevices();
      },
      onLevel: function (timeData, rms, elapsed) {
        if (waveCanvas) drawLiveWaveform(waveCanvas, timeData, rms);
        if (statusEl) statusEl.textContent = 'Capturing ' + elapsed.toFixed(1) + 's — tap to stop';
      },
      onAutoStop: function (res) {
        finalize(res);
      }
    }).catch(function (err) {
      btn.disabled = false;
      btn.classList.remove('recording');
      labelEl.textContent = cfg.idleLabel;
      if (iconEl) iconEl.textContent = cfg.idleIcon;
      state.activeRec = null;
      var msg = err && err.message ? err.message : 'Microphone unavailable.';
      if (statusEl) statusEl.textContent = msg;
      showToast(msg, true);
      if (typeof cfg.onError === 'function') cfg.onError(err);
    });
  }

  /* ==================== VIEW 1: HOME & FART VAULT ==================== */
  function drawHomeVaultWaveforms() {
    var canvases = document.querySelectorAll('#home-vault-grid canvas[data-wave-id]');
    for (var i = 0; i < canvases.length; i++) {
      var id = canvases[i].getAttribute('data-wave-id');
      var sample = getSampleById(id);
      if (sample) {
        drawStaticWaveform(canvases[i], sample.samples, {
          fallbackW: 260,
          fallbackH: 44,
          colorA: '#22C55E',
          colorB: '#60A5FA'
        });
      }
    }
  }

  function renderHomeView() {
    var summary = TootLabs.Store.getSummaryStats(state.samples);
    $('stat-samples-recorded').textContent = String(summary.samplesRecorded);
    $('stat-best-score').textContent = summary.bestMatchScore.toFixed(1) + '%';
    $('stat-challenges-completed').textContent = String(summary.challengesCompleted);
    $('stat-avg-quality').textContent = summary.averageMatchQuality.toFixed(1) + '%';

    $('home-cta-sub').textContent =
      state.samples.length > 0
        ? 'Challenge "' + getSampleName(state.samples[0]) + '" or capture a fresh specimen'
        : 'Record your first reference specimen to begin testing';

    $('home-vault-count').textContent =
      state.samples.length === 1 ? '1 specimen' : state.samples.length + ' specimens';

    var grid = $('home-vault-grid');
    if (state.samples.length === 0) {
      grid.innerHTML =
        '<div class="labs-glass-card labs-empty-card">' +
        '  <h3>Vault Archive Empty</h3>' +
        '  <p>Record your first fart sample to build your scientific collection and track mimic mastery over time.</p>' +
        '  <button type="button" class="labs-btn labs-btn-emerald btn-empty-record">＋ Record First Specimen</button>' +
        '</div>';
      var emptyBtn = grid.querySelector('.btn-empty-record');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', function () {
          openChallengeWithNewSpecimen();
        });
      }
      return;
    }

    grid.innerHTML = state.samples
      .map(function (s) {
        var st = TootLabs.Store.getSampleStats(s.id);
        var name = getSampleName(s);
        var dur = (s.samples.length / (s.sampleRate || 44100)).toFixed(2) + 's';
        var bestTxt = st.attemptCount > 0 ? st.bestScore.toFixed(1) + '%' : '—';
        var attTxt = st.attemptCount === 1 ? '1 Attempt' : st.attemptCount + ' Attempts';

        return (
          '<article class="labs-vault-card" data-open-id="' + esc(s.id) + '" tabindex="0">' +
          '  <div class="labs-vc-top">' +
          '    <div>' +
          '      <div class="labs-vc-name">' + esc(name) + '</div>' +
          '      <div class="labs-vc-date">' + esc(formatDateShort(s.createdAt)) + ' · ' + dur + '</div>' +
          '    </div>' +
          '    <div class="labs-vc-score-block">' +
          '      <div class="labs-vc-best-lbl">Best Match</div>' +
          '      <div class="labs-vc-best-val">' + bestTxt + '</div>' +
          '    </div>' +
          '  </div>' +
          '  <div class="labs-vc-wave-wrap">' +
          '    <canvas class="labs-vc-wave" data-wave-id="' + esc(s.id) + '"></canvas>' +
          '  </div>' +
          '  <div class="labs-vc-bottom">' +
          '    <span class="labs-vc-attempts">' + esc(attTxt) + '</span>' +
          '    <div class="labs-vc-actions">' +
          '      <button type="button" class="labs-vc-play" data-play-id="' + esc(s.id) + '">▶ Play</button>' +
          '    </div>' +
          '  </div>' +
          '</article>'
        );
      })
      .join('');

    grid.querySelectorAll('.labs-vc-play').forEach(function (playBtn) {
      playBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var s = getSampleById(this.getAttribute('data-play-id'));
        if (s) {
          TootApp.Audio.playSound(s.samples, s.sampleRate, { channel: 'vault_play' });
        }
      });
    });

    grid.querySelectorAll('.labs-vault-card').forEach(function (card) {
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

    drawHomeVaultWaveforms();
  }

  /* ==================== VIEW 2: SAMPLE DETAIL ==================== */
  function drawDetailWaveform(progress) {
    var sample = getSampleById(state.detailSampleId);
    var canvas = $('detail-waveform-canvas');
    if (sample && canvas) {
      drawStaticWaveform(canvas, sample.samples, {
        fallbackW: 520,
        fallbackH: 92,
        progress: progress
      });
    }
  }

  function renderSampleDetail() {
    var sample = getSampleById(state.detailSampleId);
    if (!sample) {
      showView('home');
      return;
    }

    var stats = TootLabs.Store.getSampleStats(sample.id);
    var feat = sample.features || TootApp.DSP.extractFeatures(sample.samples, sample.sampleRate);
    sample.features = feat;
    var prof = TootApp.DSP.describeSoundProfile(feat);

    $('detail-specimen-id').textContent = 'SPECIMEN ID · ' + sample.id.slice(-8).toUpperCase();
    $('detail-sample-name').textContent = getSampleName(sample);
    $('detail-sample-dur').textContent = (sample.samples.length / sample.sampleRate).toFixed(2) + 's';
    $('detail-sample-meta').textContent =
      formatTimeShort(sample.createdAt) + ' · ' + prof.pitchLabel + ' · ' + prof.textureLabel;

    $('detail-best-score').textContent = stats.attemptCount > 0 ? stats.bestScore.toFixed(1) + '%' : '—';
    $('detail-prev-score').textContent =
      typeof stats.previousScore === 'number' ? stats.previousScore.toFixed(1) + '%' : '—';
    $('detail-latest-score').textContent =
      typeof stats.latestScore === 'number' ? stats.latestScore.toFixed(1) + '%' : '—';
    $('detail-attempt-count').textContent = String(stats.attemptCount || 0);

    var banner = $('detail-improvement-banner');
    if (typeof stats.previousScore === 'number' && typeof stats.latestScore === 'number') {
      var diff = Math.round((stats.latestScore - stats.previousScore) * 10) / 10;
      banner.classList.remove('hidden', 'delta-neutral');
      if (diff >= 0) {
        banner.textContent =
          'Trajectory: ' + stats.previousScore.toFixed(1) + '% → ' + stats.latestScore.toFixed(1) + '% (+' + diff.toFixed(1) + '%)';
      } else {
        banner.classList.add('delta-neutral');
        banner.textContent =
          'Trajectory: ' + stats.previousScore.toFixed(1) + '% → ' + stats.latestScore.toFixed(1) + '% (' + diff.toFixed(1) + '%)';
      }
    } else {
      banner.classList.add('hidden');
    }

    var fnBtn = $('btn-detail-fartnalysis');
    fnBtn.disabled = state.detailAttempts.length === 0;

    var listEl = $('detail-attempts-list');
    if (state.detailAttempts.length === 0) {
      listEl.innerHTML =
        '<div class="labs-glass-card labs-empty-card"><p>No mimic challenges logged against this specimen yet. Tap <strong>TRY AGAIN</strong> to set your benchmark.</p></div>';
    } else {
      listEl.innerHTML = state.detailAttempts
        .map(function (att) {
          var score = typeof att.exactScore === 'number' ? att.exactScore : 0;
          var rank = TootLabs.Store.getRankForScore(score);
          var stars = '⭐'.repeat(att.stars || 1);
          return (
            '<div class="labs-attempt-row">' +
            '  <div class="labs-att-left">' +
            '    <span class="labs-att-score" style="color:' + rank.color + '">' + score.toFixed(1) + '%</span>' +
            '    <div>' +
            '      <div class="labs-att-meta">' + esc(att.name) + ' · ' + esc(rank.title) + ' ' + stars + '</div>' +
            '      <div class="labs-att-sub">' + esc(formatTimeShort(att.createdAt)) + '</div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="labs-att-btns">' +
            '    <button type="button" class="labs-btn-ghost labs-btn-sm" data-att-play="' + esc(att.id) + '">▶ Play</button>' +
            '    <button type="button" class="labs-btn labs-btn-blue labs-btn-sm" data-att-inspect="' + esc(att.id) + '">Fartnalysis</button>' +
            '  </div>' +
            '</div>'
          );
        })
        .join('');

      listEl.querySelectorAll('[data-att-play]').forEach(function (b) {
        b.addEventListener('click', function () {
          var aid = this.getAttribute('data-att-play');
          var found = state.detailAttempts.find(function (x) { return x.id === aid; });
          if (found) TootApp.Audio.playSound(found.samples, found.sampleRate, { channel: 'detail_att' });
        });
      });

      listEl.querySelectorAll('[data-att-inspect]').forEach(function (b) {
        b.addEventListener('click', function () {
          var aid = this.getAttribute('data-att-inspect');
          openFartnalysis(sample.id, aid);
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

  /* ==================== VIEW 3: CHALLENGE ==================== */
  function drawChallengeWaveforms() {
    var target = getSampleById(state.challengeTargetId);
    if (target && $('ch-target-wave')) {
      drawStaticWaveform($('ch-target-wave'), target.samples, {
        fallbackW: 480,
        fallbackH: 66
      });
    }
    if (target && state.pendingAttempt && $('ch-compare-preview-canvas')) {
      drawComparisonWaveform($('ch-compare-preview-canvas'), target.samples, state.pendingAttempt.samples);
    }
  }

  function renderChallengeVaultStrip() {
    var strip = $('challenge-vault-strip');
    if (!strip) return;
    if (state.samples.length === 0) {
      strip.innerHTML = '<span class="labs-hint-text">No saved specimens yet — record your first sample below.</span>';
      return;
    }

    strip.innerHTML = state.samples
      .map(function (s) {
        var st = TootLabs.Store.getSampleStats(s.id);
        var active = !state.recordingSpecimenMode && s.id === state.challengeTargetId;
        var scoreBadge = st.attemptCount > 0 ? '<span class="labs-pill-score">' + st.bestScore.toFixed(1) + '%</span>' : '';
        return (
          '<button type="button" class="labs-strip-pill' +
          (active ? ' active' : '') +
          '" data-pick-target="' +
          esc(s.id) +
          '">' +
          '<span>' + esc(getSampleName(s)) + '</span>' +
          scoreBadge +
          '</button>'
        );
      })
      .join('');

    strip.querySelectorAll('[data-pick-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tid = this.getAttribute('data-pick-target');
        selectChallengeTarget(tid, { autoPlay: false });
      });
    });
  }

  function renderChallengeView() {
    renderChallengeVaultStrip();
    var target = getSampleById(state.challengeTargetId);
    var showRecorder = state.recordingSpecimenMode || !target;

    $('ch-loaded-sample-pane').classList.toggle('hidden', showRecorder);
    $('ch-record-specimen-pane').classList.toggle('hidden', !showRecorder);
    $('btn-ch-cancel-specimen').classList.toggle('hidden', !target);

    if (!showRecorder && target) {
      var feat = target.features || TootApp.DSP.extractFeatures(target.samples, target.sampleRate);
      target.features = feat;
      var prof = TootApp.DSP.describeSoundProfile(feat);
      var st = TootLabs.Store.getSampleStats(target.id);

      $('ch-target-name').textContent = getSampleName(target);
      $('ch-target-dur').textContent = (target.samples.length / target.sampleRate).toFixed(2) + 's';
      $('ch-target-meta').textContent =
        formatDateShort(target.createdAt) + ' · ' + prof.pitchLabel + ' · ' + prof.textureLabel;
      $('ch-target-bench').textContent =
        st.attemptCount > 0
          ? 'Target Best: ' + st.bestScore.toFixed(1) + '% · ' + st.attemptCount + ' Attempt' + (st.attemptCount === 1 ? '' : 's')
          : 'Unchallenged specimen — set the inaugural benchmark score.';
    }

    var attemptBtn = $('btn-ch-rec-attempt');
    attemptBtn.disabled = showRecorder || !target;

    var prevPanel = $('ch-preview-panel');
    if (state.pendingAttempt && target && !showRecorder) {
      prevPanel.classList.remove('hidden');
      var attDur = state.pendingAttempt.samples.length / state.pendingAttempt.sampleRate;
      var tgtDur = target.samples.length / target.sampleRate;
      $('ch-attempt-dur').textContent = attDur.toFixed(2) + 's';
      $('ch-preview-ratio').textContent =
        'Target ' + tgtDur.toFixed(2) + 's vs Attempt ' + attDur.toFixed(2) + 's';
      $('ch-attempt-status').textContent =
        'Comparison waveform staged. Review audio or tap ANALYZE MATCH.';
    } else {
      prevPanel.classList.add('hidden');
      $('ch-attempt-dur').textContent = showRecorder ? 'Record Target First' : 'Standby';
      if (!TootApp.Audio.isRecordingOrStarting()) {
        $('ch-attempt-status').textContent = showRecorder
          ? 'Record and store the target specimen above first.'
          : 'Tap Record Attempt and mimic the loaded sample live.';
      }
    }

    drawChallengeWaveforms();
  }

  function selectChallengeTarget(sampleId, opts) {
    opts = opts || {};
    TootApp.Audio.stopAll();
    state.challengeTargetId = sampleId;
    state.recordingSpecimenMode = false;
    if (!opts.keepAttempt) {
      state.pendingAttempt = null;
      $('ch-attempt-live-wave').classList.add('hidden');
    }
    showView('challenge');
    renderChallengeView();
  }

  function openChallengeWithNewSpecimen() {
    TootApp.Audio.stopAll();
    state.recordingSpecimenMode = true;
    state.pendingAttempt = null;
    $('ch-specimen-live-wave').classList.add('hidden');
    $('ch-attempt-live-wave').classList.add('hidden');
    showView('challenge');
    renderChallengeView();
  }

  function analyzeStagedAttempt() {
    var target = getSampleById(state.challengeTargetId);
    if (!target || !state.pendingAttempt) {
      showToast('Record both a target sample and an attempt first.', true);
      return;
    }

    var featA = target.features || TootApp.DSP.extractFeatures(target.samples, target.sampleRate);
    var featB =
      state.pendingAttempt.features ||
      TootApp.DSP.extractFeatures(state.pendingAttempt.samples, state.pendingAttempt.sampleRate);
    target.features = featA;
    state.pendingAttempt.features = featB;

    var result = TootApp.DSP.compareSounds(featA, featB);
    TootLabs.Store.recordChallengeResult(target, state.pendingAttempt, result).then(function (outcome) {
      state.lastOutcome = Object.assign({}, outcome, {
        targetSound: target
      });
      state.fnSampleId = target.id;
      state.fnAttemptId = outcome.attempt.id;
      showView('result');
      renderResultScreen(state.lastOutcome);
    });
  }

  /* ==================== VIEW 4: MATCH RESULT & REWARD SEQUENCE ==================== */
  function renderResultScreen(outcome) {
    if (!outcome) return;
    clearResultAnimations();

    var target = outcome.targetSound;
    var exact = outcome.exactScore;
    var rank = outcome.rank;
    var reward = outcome.reward;
    var stats = outcome.sampleStats || {};

    $('res-sample-context').textContent = 'POST-ANALYSIS TELEMETRY · ' + getSampleName(target).toUpperCase();

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

    // Smooth numeric counter 0.0% -> XX.X%
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
          'Improve delta: ' + outcome.previousScore.toFixed(1) + '% → ' + exact.toFixed(1) + '% (+' + delta.toFixed(1) + '%)';
      } else {
        deltaNoteEl.classList.add('delta-neutral');
        deltaNoteEl.textContent =
          'Previous vs Current: ' + outcome.previousScore.toFixed(1) + '% → ' + exact.toFixed(1) + '% (' + delta.toFixed(1) + '%)';
      }
    } else {
      deltaNoteEl.classList.remove('hidden');
      deltaNoteEl.classList.add('delta-neutral');
      deltaNoteEl.textContent = 'Initial benchmark logged — tap TRY AGAIN to push past ' + exact.toFixed(1) + '%';
    }

    $('res-verdict-text').textContent = outcome.verdict;

    var starsRow = $('res-stars-row');
    var bellLabel = $('res-bell-label');
    var legTitleEl = $('res-legendary-title');
    starsRow.innerHTML = '';
    bellLabel.textContent = 'Assigning Telemetry Rating…';
    legTitleEl.classList.add('hidden');
    legTitleEl.textContent = '';

    // Reveal NEW PERSONAL BEST badge cleanly mid-ring fill
    if (outcome.isPersonalBest) {
      state.resultTimers.push(
        setTimeout(function () {
          pbEl.classList.remove('hidden');
        }, 480)
      );
    }

    // Sequential Bell + Individual Star Fly-Ins
    var startDelay = 620;
    var stepMs = 340;
    for (var sIdx = 0; sIdx < reward.stars; sIdx++) {
      (function (starIndex) {
        var timer = setTimeout(function () {
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

          if (TootLabs.AudioFx) {
            TootLabs.AudioFx.playBell(starIndex);
          }
        }, startDelay + starIndex * stepMs);
        state.resultTimers.push(timer);
      })(sIdx);
    }

    // Legendary Celebration Sequence on 5 Stars
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
          for (var k = 0; k < starEls.length; k++) {
            starEls[k].classList.add('legendary-glow');
          }
          legTitleEl.textContent = outcome.legendaryTitle || TootLabs.Store.pickLegendaryTitle();
          legTitleEl.classList.remove('hidden');
        }, finaleAt)
      );
    }
  }

  /* ==================== VIEW 5: FARTNALYSIS DASHBOARD ==================== */
  function openFartnalysis(sampleId, preferredAttemptId) {
    var targetId = sampleId || (state.samples[0] && state.samples[0].id) || null;
    if (!targetId) {
      state.fnSampleId = null;
      state.fnAttempts = [];
      state.fnAttemptId = null;
      showView('fartnalysis');
      renderFartnalysisView();
      return;
    }

    state.fnSampleId = targetId;
    TootLabs.Store.loadAttemptsForSample(targetId).then(function (attempts) {
      state.fnAttempts = attempts || [];
      if (preferredAttemptId) {
        state.fnAttemptId = preferredAttemptId;
      } else if (state.fnAttempts.length > 0) {
        state.fnAttemptId = state.fnAttempts[0].id;
      } else {
        state.fnAttemptId = null;
      }
      showView('fartnalysis');
      renderFartnalysisView();
    });
  }

  function renderFartnalysisView() {
    var mountEl = $('fn-dashboard-mount');
    var emptyEl = $('fn-empty-state');
    var switcherEl = $('fn-attempt-switcher');
    var pillsEl = $('fn-attempt-pills');

    if (state.fnController) {
      state.fnController.destroy();
      state.fnController = null;
    }

    var sample = getSampleById(state.fnSampleId);
    var attempt = null;
    if (state.fnAttemptId) {
      attempt = state.fnAttempts.find(function (a) { return a.id === state.fnAttemptId; }) || null;
    }
    if (!attempt && state.fnAttempts.length > 0) {
      attempt = state.fnAttempts[0];
      state.fnAttemptId = attempt.id;
    }

    if (!sample || !attempt) {
      switcherEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      mountEl.innerHTML = '';
      return;
    }

    emptyEl.classList.add('hidden');
    switcherEl.classList.remove('hidden');
    $('fn-switcher-label').textContent = 'SPECIMEN: ' + getSampleName(sample).toUpperCase() + ' · SELECT ATTEMPT TO INSPECT';

    pillsEl.innerHTML = state.fnAttempts
      .map(function (a) {
        var active = a.id === attempt.id;
        return (
          '<button type="button" class="labs-strip-pill' +
          (active ? ' active' : '') +
          '" data-fn-att="' +
          esc(a.id) +
          '">' +
          '<span>' + esc(a.name) + '</span>' +
          '<span class="labs-pill-score">' + (a.exactScore || 0).toFixed(1) + '%</span>' +
          '</button>'
        );
      })
      .join('');

    pillsEl.querySelectorAll('[data-fn-att]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.fnAttemptId = this.getAttribute('data-fn-att');
        renderFartnalysisView();
      });
    });

    state.fnController = TootLabs.Fartnalysis.renderDashboard(mountEl, {
      soundA: sample,
      soundB: attempt,
      labelA: getSampleName(sample),
      labelB: attempt.name,
      result: attempt.result || null
    });
  }

  /* ==================== SHARE & MODALS ==================== */
  function shareOutcome(outcome) {
    if (!outcome) return;
    var name = getSampleName(outcome.targetSound);
    var stars = '⭐'.repeat(outcome.reward.stars);
    var text =
      'TOOT MATCH LABS — ACOUSTIC REPORT\n' +
      'Specimen: ' + name + '\n' +
      'Match Quality: ' + outcome.exactScore.toFixed(1) + '% (' + outcome.rank.title + ' ' + stars + ')\n' +
      (outcome.legendaryTitle ? 'Honor: ' + outcome.legendaryTitle + '\n' : '') +
      'Verdict: ' + outcome.verdict;

    if (navigator.share) {
      navigator.share({ title: 'Toot Match Labs Report', text: text }).catch(function () {});
      return;
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(text)
        .then(function () { showToast('Lab telemetry report copied to clipboard'); })
        .catch(function () { showToast('Unable to access clipboard', true); });
    } else {
      showToast('Share unsupported in this browser — inspect on screen');
    }
  }

  function initModals() {
    var renameModal = $('labs-rename-modal');
    var renameInput = $('labs-rename-input');
    var deleteModal = $('labs-delete-modal');

    $('btn-labs-rename-cancel').addEventListener('click', function () {
      renameModal.classList.add('hidden');
    });

    $('btn-labs-rename-save').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      var next = renameInput.value.trim();
      if (!sample || !next) {
        showToast('Enter a valid specimen name', true);
        return;
      }
      TootLabs.Store.renameSample(sample, next).then(function () {
        renameModal.classList.add('hidden');
        renderHomeView();
        renderSampleDetail();
        showToast('Specimen designated "' + next + '"');
      });
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
        if (state.challengeTargetId === delId) {
          state.challengeTargetId = state.samples[0] ? state.samples[0].id : null;
          state.pendingAttempt = null;
        }
        if (state.fnSampleId === delId) {
          state.fnSampleId = null;
          state.fnAttempts = [];
          state.fnAttemptId = null;
        }
        renderHomeView();
        showView('home');
        showToast('Specimen purged from vault');
      });
    });
  }

  /* ==================== EVENT BINDINGS ==================== */
  function initNavigationAndActions() {
    // Bottom Nav
    document.querySelectorAll('.labs-nav-btn').forEach(function (navBtn) {
      navBtn.addEventListener('click', function () {
        var targetView = this.getAttribute('data-view');
        if (targetView === 'home') {
          renderHomeView();
          showView('home');
        } else if (targetView === 'challenge') {
          if (!state.challengeTargetId && state.samples.length > 0) {
            state.challengeTargetId = state.samples[0].id;
            state.recordingSpecimenMode = false;
          } else if (state.samples.length === 0) {
            state.recordingSpecimenMode = true;
          }
          showView('challenge');
          renderChallengeView();
        } else if (targetView === 'fartnalysis') {
          var sId =
            state.fnSampleId ||
            (state.lastOutcome && state.lastOutcome.targetSound && state.lastOutcome.targetSound.id) ||
            state.detailSampleId ||
            state.challengeTargetId ||
            (state.samples[0] && state.samples[0].id);
          openFartnalysis(sId, state.fnAttemptId);
        }
      });
    });

    // Home Actions
    $('btn-home-start-challenge').addEventListener('click', function () {
      if (state.samples.length > 0) {
        selectChallengeTarget(state.samples[0].id);
      } else {
        openChallengeWithNewSpecimen();
      }
    });

    $('btn-home-record-new').addEventListener('click', openChallengeWithNewSpecimen);

    // Detail View Actions
    $('btn-detail-back').addEventListener('click', function () {
      renderHomeView();
      showView('home');
    });

    $('btn-detail-play').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample) return;
      TootApp.Audio.playSound(sample.samples, sample.sampleRate, {
        channel: 'detail_sample',
        onProgress: function (p) { drawDetailWaveform(p); },
        onEnded: function () { drawDetailWaveform(null); }
      });
    });

    $('btn-detail-try-again').addEventListener('click', function () {
      if (state.detailSampleId) {
        selectChallengeTarget(state.detailSampleId);
      }
    });

    $('btn-detail-fartnalysis').addEventListener('click', function () {
      if (state.detailSampleId && state.detailAttempts.length > 0) {
        openFartnalysis(state.detailSampleId, state.detailAttempts[0].id);
      }
    });

    $('btn-detail-rename').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample) return;
      $('labs-rename-input').value = getSampleName(sample);
      $('labs-rename-modal').classList.remove('hidden');
      $('labs-rename-input').focus();
    });

    $('btn-detail-delete').addEventListener('click', function () {
      var sample = getSampleById(state.detailSampleId);
      if (!sample) return;
      $('labs-delete-copy').textContent =
        'Permanently delete "' + getSampleName(sample) + '" and all logged mimic attempts?';
      $('labs-delete-modal').classList.remove('hidden');
    });

    // Challenge View Actions
    $('btn-ch-new-specimen').addEventListener('click', openChallengeWithNewSpecimen);
    $('btn-ch-replace-sample').addEventListener('click', openChallengeWithNewSpecimen);

    $('btn-ch-cancel-specimen').addEventListener('click', function () {
      if (state.samples.length > 0) {
        selectChallengeTarget(state.challengeTargetId || state.samples[0].id, { keepAttempt: true });
      }
    });

    function playLoadedChallengeSample() {
      var target = getSampleById(state.challengeTargetId);
      if (!target) return;
      TootApp.Audio.playSound(target.samples, target.sampleRate, {
        channel: 'ch_sample',
        onProgress: function (p) {
          drawStaticWaveform($('ch-target-wave'), target.samples, {
            fallbackW: 480,
            fallbackH: 66,
            progress: p
          });
        },
        onEnded: function () {
          drawChallengeWaveforms();
        }
      });
    }

    $('btn-ch-play-sample').addEventListener('click', playLoadedChallengeSample);
    $('btn-ch-replay-sample').addEventListener('click', playLoadedChallengeSample);

    $('btn-ch-open-detail').addEventListener('click', function () {
      if (state.challengeTargetId) openSampleDetail(state.challengeTargetId);
    });

    $('btn-ch-rec-specimen').addEventListener('click', function () {
      var waveEl = $('ch-specimen-live-wave');
      toggleCapture({
        buttonEl: $('btn-ch-rec-specimen'),
        labelEl: $('ch-spec-label'),
        iconEl: $('ch-spec-icon'),
        idleIcon: '🎙️',
        activeIcon: '⏹',
        idleLabel: 'Record Sample',
        activeLabel: 'Stop Capture',
        statusEl: $('ch-specimen-status'),
        waveCanvas: waveEl,
        onBeforeStart: function () {
          waveEl.classList.remove('hidden');
        },
        onError: function () {
          waveEl.classList.add('hidden');
        },
        onComplete: function (res) {
          waveEl.classList.add('hidden');
          TootLabs.Store.saveNewSpecimen(res).then(function (saved) {
            state.samples.unshift(saved);
            state.challengeTargetId = saved.id;
            state.recordingSpecimenMode = false;
            state.pendingAttempt = null;
            renderHomeView();
            renderChallengeView();
            showToast('Archived specimen "' + getSampleName(saved) + '"');
          });
        }
      });
    });

    $('btn-ch-rec-attempt').addEventListener('click', function () {
      var waveEl = $('ch-attempt-live-wave');
      toggleCapture({
        buttonEl: $('btn-ch-rec-attempt'),
        labelEl: $('ch-att-label'),
        iconEl: $('ch-att-icon'),
        idleIcon: '🎤',
        activeIcon: '⏹',
        idleLabel: 'Record Attempt',
        activeLabel: 'Stop Capture',
        statusEl: $('ch-attempt-status'),
        waveCanvas: waveEl,
        onBeforeStart: function () {
          waveEl.classList.remove('hidden');
        },
        onError: function () {
          waveEl.classList.add('hidden');
          renderChallengeView();
        },
        onComplete: function (res) {
          waveEl.classList.add('hidden');
          var sr = res.sampleRate || 44100;
          var samples = res.clippedSamples;
          state.pendingAttempt = {
            id: 'att_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            sampleRate: sr,
            samples: samples,
            clipInfo: res.clipInfo,
            features: TootApp.DSP.extractFeatures(samples, sr)
          };
          renderChallengeView();
        }
      });
    });

    $('btn-ch-prev-target').addEventListener('click', function () {
      var target = getSampleById(state.challengeTargetId);
      if (target) TootApp.Audio.playSound(target.samples, target.sampleRate, { channel: 'prev_a' });
    });

    $('btn-ch-prev-attempt').addEventListener('click', function () {
      if (state.pendingAttempt) {
        TootApp.Audio.playSound(state.pendingAttempt.samples, state.pendingAttempt.sampleRate, { channel: 'prev_b' });
      }
    });

    $('btn-ch-prev-ab').addEventListener('click', function () {
      var target = getSampleById(state.challengeTargetId);
      if (target && state.pendingAttempt) {
        TootApp.Audio.playSequence(
          [
            { samples: target.samples, sampleRate: target.sampleRate, channel: 'prev_a' },
            { samples: state.pendingAttempt.samples, sampleRate: state.pendingAttempt.sampleRate, channel: 'prev_b' }
          ],
          220
        );
      }
    });

    $('btn-ch-redo-attempt').addEventListener('click', function () {
      state.pendingAttempt = null;
      renderChallengeView();
    });

    $('btn-ch-analyze').addEventListener('click', analyzeStagedAttempt);

    // Result Screen Actions
    $('btn-res-try-again').addEventListener('click', function () {
      if (state.lastOutcome && state.lastOutcome.targetSound) {
        selectChallengeTarget(state.lastOutcome.targetSound.id);
      } else {
        showView('challenge');
      }
    });

    $('btn-res-fartnalysis').addEventListener('click', function () {
      if (state.lastOutcome) {
        openFartnalysis(state.lastOutcome.targetSound.id, state.lastOutcome.attempt.id);
      }
    });

    $('btn-res-replay').addEventListener('click', function () {
      if (!state.lastOutcome) return;
      var a = state.lastOutcome.targetSound;
      var b = state.lastOutcome.attempt;
      TootApp.Audio.playSequence(
        [
          { samples: a.samples, sampleRate: a.sampleRate, channel: 'res_a' },
          { samples: b.samples, sampleRate: b.sampleRate, channel: 'res_b' }
        ],
        220
      );
    });

    $('btn-res-share').addEventListener('click', function () {
      shareOutcome(state.lastOutcome);
    });

    $('btn-res-home').addEventListener('click', function () {
      renderHomeView();
      showView('home');
    });

    // Fartnalysis View Actions
    $('btn-fn-back').addEventListener('click', function () {
      if (state.fnSampleId) {
        selectChallengeTarget(state.fnSampleId);
      } else {
        showView('challenge');
      }
    });

    $('btn-fn-go-challenge').addEventListener('click', function () {
      if (state.samples.length > 0) {
        selectChallengeTarget(state.samples[0].id);
      } else {
        openChallengeWithNewSpecimen();
      }
    });

    root.addEventListener('resize', function () {
      if (state.view === 'home') drawHomeVaultWaveforms();
      else if (state.view === 'detail') drawDetailWaveform(null);
      else if (state.view === 'challenge') drawChallengeWaveforms();
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
          state.challengeTargetId = state.samples[0].id;
          state.recordingSpecimenMode = false;
        } else {
          state.recordingSpecimenMode = true;
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
    showView: showView
  };
})(typeof window !== 'undefined' ? window : globalThis);
