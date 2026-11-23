(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  var state = {
    activeTab: 'guess',
    builtInSounds: [],
    customSounds: [],
    tempSounds: [], // e.g. Quick Compare Lab recordings & imported targets
    guess: {
      actualFart: null,
      origCounter: 0,
      guesses: [],
      lastRailTapId: null,
      lastRailTapAt: 0
    },
    karaoke: {
      selectedId: null,
      rate: 1.0,
      targetSpec: null,
      comparePanel: null,
      lastMimic: null,
      lastRawMimic: null
    },
    lab: {
      actualSound: null,
      guessSound: null,
      guessId: null,
      comparePanel: null
    }
  };

  var toastTimer = null;
  var activeRecorderCtx = null;

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

  function showToast(msg, isError) {
    var el = $('app-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden', 'toast-error');
    if (isError) el.classList.add('toast-error');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.add('hidden');
    }, 4200);
  }

  function getAllSounds() {
    return state.builtInSounds.concat(state.customSounds);
  }

  function getLabSounds() {
    return getAllSounds().concat(state.tempSounds);
  }

  function findSoundById(id) {
    var all = getLabSounds();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function drawIdleWave(canvas, text) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#080b14';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();
    if (text) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, rect.width / 2, rect.height / 2 - 6);
    }
  }

  function drawLiveWave(canvas, timeData, rms) {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var tw = Math.round(rect.width * dpr);
    var th = Math.round(rect.height * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var w = rect.width;
    var h = rect.height;
    ctx.fillStyle = '#080b14';
    ctx.fillRect(0, 0, w, h);

    // Real RMS energy bar glow at bottom
    var levelW = Math.min(1, rms * 5.0) * w;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
    ctx.fillRect(0, h - 5, levelW, 5);

    var peak = 0;
    for (var p = 0; p < timeData.length; p++) {
      var a = Math.abs(timeData[p]);
      if (a > peak) peak = a;
    }
    var visGain = Math.min(10, 0.42 / Math.max(0.04, peak));

    ctx.strokeStyle = rms > 0.025 ? '#a3e635' : '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var step = Math.max(1, Math.floor(timeData.length / 180));
    for (var i = 0; i < timeData.length; i += step) {
      var x = (i / (timeData.length - 1)) * w;
      var scaled = Math.max(-1, Math.min(1, timeData[i] * visGain));
      var y = h * 0.5 + scaled * (h * 0.44);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function resetMicTestUI(statusText) {
    var btn = $('btn-mic-test');
    var meter = $('mic-test-meter');
    var stEl = $('mic-test-status');
    if (btn) btn.textContent = '🔊 Test Mic';
    if (meter) meter.style.width = '0%';
    if (stEl && statusText) stEl.textContent = statusText;
  }

  function refreshMicDevices() {
    var sel = $('mic-device-select');
    if (!sel) return Promise.resolve();
    var currentVal = TootApp.Audio.getSelectedDevice() || sel.value || '';

    return TootApp.Audio.listInputDevices().then(function (devices) {
      var html = '<option value="">System Default Microphone</option>';
      for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        var label = d.label || 'Microphone ' + (i + 1) + ' (grant mic permission to see name)';
        html += '<option value="' + esc(d.deviceId) + '">' + esc(label) + '</option>';
      }
      sel.innerHTML = html;
      if (currentVal) {
        sel.value = currentVal;
      }
    });
  }

  /**
   * Unified toggle recorder controller preventing concurrent recordings.
   */
  function toggleRecorder(cfg) {
    if (TootApp.Audio.isRecordingOrStarting()) {
      if (TootApp.Audio.isRecording() && activeRecorderCtx && activeRecorderCtx.finish) {
        activeRecorderCtx.finish();
      }
      return;
    }

    resetMicTestUI('Ready');

    var btn = cfg.buttonEl;
    var labelEl = cfg.labelEl || btn;
    var iconEl = cfg.iconEl || null;
    var statusEl = cfg.statusEl;
    var waveCanvas = cfg.waveCanvas;
    var origText = cfg.idleLabel || labelEl.textContent;
    var origIcon = cfg.idleIcon || (iconEl ? iconEl.textContent : '');
    var settled = false;

    if (typeof cfg.onBeforeStart === 'function') {
      cfg.onBeforeStart();
    }

    var isWarm = Boolean(TootApp.Audio.hasWarmMic && TootApp.Audio.hasWarmMic());
    if (!isWarm) {
      btn.disabled = true;
      labelEl.textContent = 'Requesting mic…';
      if (iconEl) iconEl.textContent = '⏳';
      if (statusEl) statusEl.textContent = 'Requesting microphone access…';
    } else if (statusEl) {
      statusEl.textContent = 'Starting mic…';
    }

    function finalize(res) {
      if (settled) return;
      settled = true;
      activeRecorderCtx = null;
      btn.disabled = false;
      btn.classList.remove('recording');
      labelEl.textContent = origText;
      if (iconEl) iconEl.textContent = origIcon;

      if (!res || !res.ok) {
        var micName = (res && res.trackLabel) || 'Default Microphone';
        var msg;
        if (res && res.reason === 'all_zeros') {
          msg = 'Mic (' + micName + ') captured pure silence — try switching Microphone in the Mic menu or clicking Test Mic!';
          if ($('mic-drawer')) $('mic-drawer').classList.remove('hidden');
        } else if (res && res.reason === 'too_quiet') {
          msg = 'Signal from "' + micName + '" was very quiet — try setting Gain to 2x or 4x Boost in the Mic menu!';
          if ($('mic-drawer')) $('mic-drawer').classList.remove('hidden');
        } else {
          msg = (res && res.error) || 'Could not capture audio. Check microphone permissions.';
        }
        if (statusEl) statusEl.textContent = msg;
        showToast(msg, true);
        drawIdleWave(waveCanvas, 'Tap Record to try again');
        if (typeof cfg.onError === 'function') cfg.onError(res);
        return;
      }

      if (statusEl) {
        statusEl.textContent =
          'Auto-clipped ' +
          res.clipInfo.originalDuration.toFixed(2) +
          's → ' +
          res.clipInfo.clippedDuration.toFixed(2) +
          's!';
      }
      cfg.onComplete(res);
    }

    activeRecorderCtx = {
      finish: function () {
        btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Auto-clipping & analyzing…';
        TootApp.Audio.stopRecording().then(finalize);
      }
    };

    TootApp.Audio.startRecording({
      maxDurationSec: cfg.maxDurationSec || 7,
      onStarted: function (info) {
        btn.disabled = false;
        btn.classList.add('recording');
        labelEl.textContent = cfg.activeLabel || '⏹ Stop Recording';
        if (iconEl && cfg.activeIcon) iconEl.textContent = cfg.activeIcon;
        if (statusEl) {
          var mutedWarn = info && info.muted ? ' (Warning: track reports muted!)' : '';
          statusEl.textContent = 'Listening on ' + ((info && info.trackLabel) || 'Mic') + mutedWarn + '…';
        }
        refreshMicDevices();
      },
      onLevel: function (timeData, rms, elapsed) {
        drawLiveWave(waveCanvas, timeData, rms);
        if (statusEl) {
          statusEl.textContent = 'Recording ' + elapsed.toFixed(1) + 's (tap Stop when done)…';
        }
      },
      onAutoStop: function (res) {
        finalize(res);
      }
    }).catch(function (err) {
      btn.disabled = false;
      btn.classList.remove('recording');
      labelEl.textContent = origText;
      if (iconEl) iconEl.textContent = origIcon;
      activeRecorderCtx = null;
      var msg = err && err.message ? err.message : 'Microphone unavailable.';
      if (statusEl) statusEl.textContent = msg;
      showToast(msg, true);
      if (typeof cfg.onError === 'function') cfg.onError(err);
    });
  }

  function makeRecordedSoundObj(res, name, emoji) {
    var sr = res.sampleRate || 44100;
    var samples = res.clippedSamples;
    var features = TootApp.DSP.extractFeatures(samples, sr);
    return {
      id: 'rec_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: name || 'Your Mimic',
      emoji: emoji || '🎙️',
      description: 'Auto-clipped live recording.',
      isBuiltIn: false,
      sampleRate: sr,
      rawSamples: res.rawSamples,
      samples: samples,
      trimStartSec: res.clipInfo ? res.clipInfo.startSec : 0,
      trimEndSec: res.clipInfo ? res.clipInfo.endSec : samples.length / sr,
      clipInfo: res.clipInfo,
      features: features
    };
  }

  function bindSpecPresetGroup(selector, getSpecFn) {
    var btns = document.querySelectorAll(selector);
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var spec = getSpecFn();
        if (!spec) return;
        var attr = this.getAttribute('data-karaoke-preset');
        if (attr === 'spin') {
          this.classList.toggle('active', spec.toggleAutoRotate());
        } else {
          for (var j = 0; j < btns.length; j++) {
            var bAttr = btns[j].getAttribute('data-karaoke-preset');
            if (bAttr !== 'spin') btns[j].classList.remove('active');
          }
          this.classList.add('active');
          spec.setPreset(attr);
        }
      });
    }
  }

  /* ==================== TAB NAVIGATION ==================== */
  function switchTab(tabName) {
    state.activeTab = tabName;
    var tabs = document.querySelectorAll('.nav-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tabName);
    }
    var views = document.querySelectorAll('.tab-view');
    for (var j = 0; j < views.length; j++) {
      views[j].classList.toggle('active', views[j].id === 'view-' + tabName);
    }

    requestAnimationFrame(function () {
      if (tabName === 'karaoke') {
        if (state.karaoke.targetSpec) state.karaoke.targetSpec.resize();
        if (state.karaoke.comparePanel) state.karaoke.comparePanel.resize();
        drawIdleWave($('karaoke-wave-canvas'), 'Waveform ready');
      } else if (tabName === 'compare') {
        renderLabCompare();
        if (state.lab.comparePanel) state.lab.comparePanel.resize();
      }
    });
  }

  /* ==================== TAB 1: PLAY (TWO-WAY FART GUESS) ==================== */
  function scoreBadgeColor(score) {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#d97706';
    return '#e11d48';
  }

  function scoreAllGuessesAgainstActual() {
    var g = state.guess;
    if (!g.actualFart) return;
    g.actualFart.features =
      g.actualFart.features || TootApp.DSP.extractFeatures(g.actualFart.samples, g.actualFart.sampleRate);
    for (var i = 0; i < g.guesses.length; i++) {
      var item = g.guesses[i];
      item.result = TootApp.DSP.compareSounds(g.actualFart.features, item.sound.features);
    }
  }

  function clearLabSelection() {
    state.lab.actualSound = null;
    state.lab.guessSound = null;
    state.lab.guessId = null;
    renderLabCompare();
  }

  function openDeepCompare(origSound, guessSound, guessId) {
    if (!origSound || !guessSound) return;
    state.lab.actualSound = origSound;
    state.lab.guessSound = guessSound;
    state.lab.guessId = guessId || guessSound.id;
    renderLabCompare();
    switchTab('compare');
  }

  function renderPastFartsRail() {
    var listEl = $('past-farts-list');
    var g = state.guess;
    var curId = g.actualFart ? g.actualFart.id : null;
    $('btn-rail-new-round').classList.toggle('active', !curId && g.guesses.length === 0);

    if (state.customSounds.length === 0) {
      listEl.innerHTML = '<div class="rail-empty">None yet</div>';
      return;
    }

    listEl.innerHTML = state.customSounds
      .map(function (s) {
        var isActive = s.id === curId;
        return (
          '<div class="rail-fart-item' +
          (isActive ? ' active' : '') +
          '" data-sticker-id="' +
          esc(s.id) +
          '">' +
          '<button type="button" class="rail-fart-main" data-fart-id="' +
          esc(s.id) +
          '" title="Tap to load &amp; play">' +
          esc(s.name) +
          '</button>' +
          '  <button type="button" class="rail-fart-del" data-del-id="' +
          esc(s.id) +
          '" aria-label="Delete saved fart" title="Delete">🗑️</button>' +
          '</div>'
        );
      })
      .join('');

    listEl.querySelectorAll('.rail-fart-main').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-fart-id');
        var found = state.customSounds.find(function (x) {
          return x.id === id;
        });
        if (!found) return;

        loadActualFart(found);
        TootApp.Audio.playSound(found.samples, found.sampleRate, { channel: 'rail_preview' });

        var freshItems = listEl.querySelectorAll('.rail-fart-item');
        for (var i = 0; i < freshItems.length; i++) {
          if (freshItems[i].getAttribute('data-sticker-id') === found.id) {
            (function (el) {
              el.classList.add('playing-flash');
              setTimeout(function () {
                el.classList.remove('playing-flash');
              }, 650);
            })(freshItems[i]);
            break;
          }
        }
      });
    });

    listEl.querySelectorAll('.rail-fart-del').forEach(function (delBtn) {
      delBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var delId = this.getAttribute('data-del-id');
        var deleted = state.customSounds.find(function (x) {
          return x.id === delId;
        });
        TootApp.Storage.deleteCustomSound(delId).then(function () {
          state.customSounds = state.customSounds.filter(function (x) {
            return x.id !== delId;
          });
          if (g.actualFart && g.actualFart.id === delId) {
            g.actualFart = null;
            for (var i = 0; i < g.guesses.length; i++) {
              g.guesses[i].result = null;
            }
            clearLabSelection();
          }
          refreshAllSoundPickers();
          updatePlayUI();
          showToast('Deleted "' + (deleted ? deleted.name : 'fart') + '"');
        });
      });
    });
  }

  function renderLiveFeed() {
    var g = state.guess;
    var wrap = $('play-live-feed-wrap');
    var listEl = $('play-live-feed');
    var titleEl = $('play-feed-title');

    if (g.guesses.length === 0) {
      wrap.classList.add('hidden');
      listEl.innerHTML = '';
      return;
    }

    wrap.classList.remove('hidden');

    if (!g.actualFart) {
      titleEl.textContent = 'Predictions (' + g.guesses.length + ')';
      listEl.innerHTML = g.guesses
        .map(function (entry) {
          return (
            '<div class="guess-card-compact pending">' +
            '  <div class="guess-card-main">' +
            '    <span class="guess-rank-pill">🔮</span>' +
            '    <span class="guess-card-name">' + esc(entry.sound.name) + '</span>' +
            '    <span class="guess-pending-note">Waiting for fart</span>' +
            '  </div>' +
            '  <button type="button" class="btn btn-ghost btn-sm btn-ticket-play" data-attempt-id="' + esc(entry.id) + '">▶ Play</button>' +
            '</div>'
          );
        })
        .join('');
    } else {
      titleEl.textContent = g.guesses.length === 1 ? 'Result' : 'Results (' + g.guesses.length + ')';

      var sorted = g.guesses.slice().sort(function (a, b) {
        var sa = a.result ? a.result.overall : -1;
        var sb = b.result ? b.result.overall : -1;
        if (sb !== sa) return sb - sa;
        return a.guessNum - b.guessNum;
      });

      var ringR = 25;
      var ringCirc = 2 * Math.PI * ringR;

      listEl.innerHTML = sorted
        .map(function (entry, idx) {
          var r = entry.result;
          var score = r ? r.overall : 0;
          var col = scoreBadgeColor(score);
          var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + (idx + 1);
          var offset = ringCirc * (1 - Math.max(0, Math.min(100, score)) / 100);

          return (
            '<div class="guess-card-compact' + (idx === 0 ? ' is-leader' : '') + '">' +
            '  <div class="guess-card-main">' +
            '    <span class="guess-rank-pill">' + medal + '</span>' +
            '    <span class="guess-card-name">' + esc(entry.sound.name) + '</span>' +
            '    <button type="button" class="btn btn-ghost btn-sm btn-ticket-play" data-attempt-id="' + esc(entry.id) + '">▶ Play</button>' +
            '  </div>' +
            '  <button type="button" class="mini-score-ring-btn btn-ticket-compare" data-attempt-id="' + esc(entry.id) + '" title="Open Fartnalysis">' +
            '    <svg class="mini-ring-svg" viewBox="0 0 64 64" aria-hidden="true">' +
            '      <circle class="mini-ring-bg" cx="32" cy="32" r="' + ringR + '"></circle>' +
            '      <circle class="mini-ring-fg" cx="32" cy="32" r="' + ringR + '" stroke="' + col + '" stroke-dasharray="' + ringCirc.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '"></circle>' +
            '    </svg>' +
            '    <span class="mini-ring-center">' +
            '      <span class="mini-ring-pct" style="color:' + col + '">' + score + '%</span>' +
            '      <span class="mini-ring-sub">Lab</span>' +
            '    </span>' +
            '  </button>' +
            '</div>'
          );
        })
        .join('');
    }

    listEl.querySelectorAll('.btn-ticket-play').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-attempt-id');
        var found = g.guesses.find(function (a) {
          return a.id === id;
        });
        if (found) {
          TootApp.Audio.playSound(found.sound.samples, found.sound.sampleRate, { channel: 'play_guess_play' });
        }
      });
    });

    listEl.querySelectorAll('.btn-ticket-compare').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-attempt-id');
        var found = g.guesses.find(function (a) {
          return a.id === id;
        });
        if (found && g.actualFart) {
          openDeepCompare(g.actualFart, found.sound, found.id);
        }
      });
    });
  }

  function updatePlayUI() {
    var g = state.guess;
    var statusPill = $('play-status-pill');
    var playBtn = $('btn-play-actual');
    var clearBtn = $('btn-clear-round');
    var statusEl = $('play-main-status');

    if (g.actualFart) {
      statusPill.textContent = 'Loaded: ' + g.actualFart.name;
      playBtn.classList.remove('hidden');
      clearBtn.classList.remove('hidden');
      statusEl.textContent =
        g.guesses.length === 0
          ? 'Tap Guess Fart to record Guess 1'
          : 'Tap Guess Fart for Guess ' + (g.guesses.length + 1);
    } else if (g.guesses.length > 0) {
      statusPill.textContent = g.guesses.length + ' prediction(s) waiting';
      playBtn.classList.add('hidden');
      clearBtn.classList.remove('hidden');
      statusEl.textContent = 'Now tap Record Fart (or pick a saved fart)';
    } else {
      statusPill.textContent = 'Tap Record or Guess to start';
      playBtn.classList.add('hidden');
      clearBtn.classList.add('hidden');
      statusEl.textContent = 'Tap a button to start';
    }

    renderPastFartsRail();
    renderLiveFeed();
  }

  function loadActualFart(soundObj) {
    TootApp.Audio.stopAll();
    var g = state.guess;
    if (!g.actualFart && g.guesses.length > 0) {
      g.actualFart = soundObj;
      scoreAllGuessesAgainstActual();
      showToast('Scored ' + g.guesses.length + ' prediction(s) against "' + soundObj.name + '"');
    } else if (g.actualFart && g.actualFart.id === soundObj.id) {
      g.actualFart = soundObj;
    } else {
      g.actualFart = soundObj;
      g.guesses = [];
      clearLabSelection();
    }
    $('play-wave-canvas').classList.add('hidden');
    updatePlayUI();
  }

  function resetRoundAll() {
    TootApp.Audio.stopAll();
    var g = state.guess;
    g.actualFart = null;
    g.guesses = [];
    g.lastRailTapId = null;
    g.lastRailTapAt = 0;
    $('play-wave-canvas').classList.add('hidden');
    clearLabSelection();
    updatePlayUI();
  }

  function initGuessTab() {
    $('btn-rail-new-round').addEventListener('click', resetRoundAll);
    $('btn-clear-round').addEventListener('click', resetRoundAll);

    $('btn-feed-clear').addEventListener('click', function () {
      TootApp.Audio.stopAll();
      state.guess.guesses = [];
      clearLabSelection();
      updatePlayUI();
    });

    $('btn-play-actual').addEventListener('click', function () {
      var s = state.guess.actualFart;
      if (s) {
        TootApp.Audio.playSound(s.samples, s.sampleRate, { channel: 'play_actual' });
      }
    });

    $('btn-round-record').addEventListener('click', function () {
      var g = state.guess;
      var waveEl = $('play-wave-canvas');
      var guessBtn = $('btn-round-guess');

      toggleRecorder({
        buttonEl: $('btn-round-record'),
        labelEl: $('rec-btn-label'),
        iconEl: $('rec-btn-icon'),
        idleIcon: '💨',
        activeIcon: '⏹',
        idleLabel: 'Record Fart',
        activeLabel: 'Stop',
        statusEl: $('play-main-status'),
        waveCanvas: waveEl,
        onBeforeStart: function () {
          waveEl.classList.remove('hidden');
          guessBtn.disabled = true;
        },
        onError: function () {
          waveEl.classList.add('hidden');
          guessBtn.disabled = false;
          updatePlayUI();
        },
        onComplete: function (res) {
          waveEl.classList.add('hidden');
          guessBtn.disabled = false;
          g.origCounter++;
          var orig = makeRecordedSoundObj(res, 'Fart #' + g.origCounter, '💨');
          var toSave = {
            id: 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            name: orig.name,
            emoji: '💨',
            description: 'Recorded (' + (orig.samples.length / orig.sampleRate).toFixed(2) + 's).',
            createdAt: Date.now(),
            sampleRate: orig.sampleRate,
            rawSamples: orig.rawSamples || orig.samples,
            trimStartSec: orig.trimStartSec,
            trimEndSec: orig.trimEndSec,
            samples: orig.samples
          };
          TootApp.Storage.saveCustomSound(toSave).then(function (saved) {
            saved.features = saved.features || orig.features;
            state.customSounds.unshift(saved);

            if (!g.actualFart && g.guesses.length > 0) {
              g.actualFart = saved;
              scoreAllGuessesAgainstActual();
              showToast('Real fart recorded — predictions scored!');
            } else {
              g.actualFart = saved;
              g.guesses = [];
              clearLabSelection();
            }

            refreshAllSoundPickers();
            updatePlayUI();
          });
        }
      });
    });

    $('btn-round-guess').addEventListener('click', function () {
      var g = state.guess;
      var waveEl = $('play-wave-canvas');
      var recBtn = $('btn-round-record');
      var guessNum = g.guesses.length + 1;

      toggleRecorder({
        buttonEl: $('btn-round-guess'),
        labelEl: $('guess-btn-label'),
        iconEl: $('guess-btn-icon'),
        idleIcon: '🎤',
        activeIcon: '⏹',
        idleLabel: 'Guess Fart',
        activeLabel: 'Stop #' + guessNum,
        statusEl: $('play-main-status'),
        waveCanvas: waveEl,
        onBeforeStart: function () {
          waveEl.classList.remove('hidden');
          recBtn.disabled = true;
        },
        onError: function () {
          waveEl.classList.add('hidden');
          recBtn.disabled = false;
          updatePlayUI();
        },
        onComplete: function (res) {
          waveEl.classList.add('hidden');
          recBtn.disabled = false;
          var guessSound = makeRecordedSoundObj(res, 'Guess ' + guessNum, '🎤');
          var result = null;
          if (g.actualFart) {
            g.actualFart.features =
              g.actualFart.features || TootApp.DSP.extractFeatures(g.actualFart.samples, g.actualFart.sampleRate);
            result = TootApp.DSP.compareSounds(g.actualFart.features, guessSound.features);
          }
          g.guesses.push({
            id: guessSound.id,
            guessNum: guessNum,
            sound: guessSound,
            result: result
          });
          updatePlayUI();
        }
      });
    });
  }

  /* ==================== TAB 2: MIMIC KARAOKE ==================== */
  function renderKaraokeSoundStrip() {
    var listEl = $('karaoke-sound-list');
    var sounds = state.tempSounds.concat(getAllSounds());
    var stats = TootApp.Storage.getStats();
    listEl.innerHTML = sounds
      .map(function (s) {
        var best = stats.bestBySound && stats.bestBySound[s.id];
        var dur = (s.samples.length / s.sampleRate).toFixed(2) + 's';
        var tag = s.isBuiltIn ? '' : s.isTemp ? ' • Imported' : ' • Custom';
        return (
          '<button type="button" class="sound-pill' +
          (s.id === state.karaoke.selectedId ? ' active' : '') +
          '" data-sound-id="' +
          esc(s.id) +
          '">' +
          '  <div class="sound-pill-top">' +
          '    <span class="sound-pill-emoji">' + esc(s.emoji || '💨') + '</span>' +
          (best ? '<span class="sound-pill-best">🏆 ' + best + '%</span>' : '') +
          '  </div>' +
          '  <div class="sound-pill-name">' + esc(s.name) + '</div>' +
          '  <div class="sound-pill-meta">' + dur + tag + '</div>' +
          '</button>'
        );
      })
      .join('');

    var pills = listEl.querySelectorAll('.sound-pill');
    for (var i = 0; i < pills.length; i++) {
      pills[i].addEventListener('click', function () {
        selectKaraokeSound(this.getAttribute('data-sound-id'));
      });
    }
  }

  function selectKaraokeSound(id) {
    var s = findSoundById(id) || getAllSounds()[0];
    if (!s) return;
    state.karaoke.selectedId = s.id;
    renderKaraokeSoundStrip();

    $('karaoke-target-name').textContent = (s.emoji || '💨') + ' ' + s.name;
    $('karaoke-target-desc').textContent = s.description || '';
    $('karaoke-target-dur').textContent = (s.samples.length / s.sampleRate).toFixed(2) + 's';

    if (!state.karaoke.targetSpec) {
      state.karaoke.targetSpec = new TootApp.Spectrogram3D($('karaoke-target-canvas'), {
        spectrogram: s.features.spectrogram,
        colormap: $('karaoke-colormap').value
      });
    } else {
      state.karaoke.targetSpec.setSpectrogram(s.features.spectrogram);
    }
    state.karaoke.targetSpec.setPlaybackRate(state.karaoke.rate);
  }

  function updateSlowMoHint() {
    var r = state.karaoke.rate;
    var speedMatch = $('chk-karaoke-speedmatch').checked;
    var hintEl = $('karaoke-slowmo-hint');
    if (r < 0.95 && speedMatch) {
      var up = (1 / r).toFixed(2);
      hintEl.textContent =
        'Slow-Mo Active: Target plays at ' +
        r.toFixed(2) +
        'x → Your mimic speeds up ' +
        up +
        'x to match Original!';
    } else if (r < 0.95) {
      hintEl.textContent =
        'Target plays slow (' + r.toFixed(2) + 'x), Speed-Up Mimic disabled.';
    } else {
      hintEl.textContent =
        'Speed (' + r.toFixed(2) + 'x): your recording is scored directly as recorded.';
    }
  }

  function setKaraokeRate(rate) {
    var r = Math.max(0.25, Math.min(2.5, Number(rate) || 1.0));
    state.karaoke.rate = r;
    $('karaoke-speed-slider').value = String(r);
    $('karaoke-speed-val').textContent = r.toFixed(2) + 'x';
    TootApp.Audio.setActiveRate('karaoke_target', r);
    if (state.karaoke.targetSpec) state.karaoke.targetSpec.setPlaybackRate(r);

    var pills = document.querySelectorAll('.karaoke-speed-pill');
    for (var i = 0; i < pills.length; i++) {
      pills[i].classList.toggle('active', Math.abs(parseFloat(pills[i].getAttribute('data-rate')) - r) < 0.01);
    }
    updateSlowMoHint();
  }

  function initKaraokeTab() {
    $('btn-karaoke-random').addEventListener('click', function () {
      var all = state.tempSounds.concat(getAllSounds());
      if (all.length === 0) return;
      var choices = all.filter(function (x) { return x.id !== state.karaoke.selectedId; });
      var pool = choices.length > 0 ? choices : all;
      var pick = pool[Math.floor(Math.random() * pool.length)];
      selectKaraokeSound(pick.id);
    });

    $('btn-karaoke-play').addEventListener('click', function () {
      var target = findSoundById(state.karaoke.selectedId);
      if (!target) return;
      TootApp.Audio.playSound(target.samples, target.sampleRate, {
        playbackRate: state.karaoke.rate,
        channel: 'karaoke_target',
        onProgress: function (p) {
          if (state.karaoke.targetSpec) state.karaoke.targetSpec.setPlayhead(p);
        },
        onEnded: function () {
          if (state.karaoke.targetSpec) state.karaoke.targetSpec.setPlayhead(null);
        }
      });
    });

    $('karaoke-speed-slider').addEventListener('input', function (e) {
      setKaraokeRate(e.target.value);
    });

    var kPills = document.querySelectorAll('.karaoke-speed-pill');
    for (var i = 0; i < kPills.length; i++) {
      kPills[i].addEventListener('click', function () {
        setKaraokeRate(this.getAttribute('data-rate'));
      });
    }

    $('chk-karaoke-speedmatch').addEventListener('change', updateSlowMoHint);

    $('karaoke-colormap').addEventListener('change', function (e) {
      if (state.karaoke.targetSpec) state.karaoke.targetSpec.setColormap(e.target.value);
    });

    bindSpecPresetGroup('[data-karaoke-preset]', function () {
      return state.karaoke.targetSpec;
    });

    $('btn-karaoke-record').addEventListener('click', function () {
      var target = findSoundById(state.karaoke.selectedId);
      if (!target) return;
      var maxDur = state.karaoke.rate < 0.95 ? 12 : 8;
      toggleRecorder({
        buttonEl: $('btn-karaoke-record'),
        statusEl: $('karaoke-rec-status'),
        waveCanvas: $('karaoke-wave-canvas'),
        maxDurationSec: maxDur,
        idleLabel: '🎙️ Record My Mimic',
        activeLabel: '⏹ Stop Recording',
        onComplete: function (res) {
          var rawMimic = makeRecordedSoundObj(res, 'Raw Slow Mimic', '🐢');
          state.karaoke.lastRawMimic = rawMimic;

          var scoredMimic;
          var speedMatch = state.karaoke.rate < 0.95 && $('chk-karaoke-speedmatch').checked;
          if (speedMatch) {
            var factor = 1 / state.karaoke.rate;
            var spedSamples = TootApp.DSP.resampleAudio(res.clippedSamples, factor, res.sampleRate);
            var spedFeat = TootApp.DSP.extractFeatures(spedSamples, res.sampleRate);
            scoredMimic = {
              id: 'sped_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
              name: 'Your Mimic (Sped Up ' + factor.toFixed(2) + 'x)',
              emoji: '🚀',
              description: 'Recorded slow at ' + state.karaoke.rate.toFixed(2) + 'x and sped up ' + factor.toFixed(2) + 'x.',
              isBuiltIn: false,
              sampleRate: res.sampleRate,
              rawSamples: res.rawSamples,
              samples: spedSamples,
              features: spedFeat
            };
            $('btn-karaoke-play-raw').classList.remove('hidden');
            $('karaoke-rec-status').textContent =
              'Sped up ' + factor.toFixed(2) + 'x (' + (spedSamples.length / res.sampleRate).toFixed(2) + 's) & scored!';
          } else {
            scoredMimic = makeRecordedSoundObj(res, 'Your Mimic', '🎤');
            $('btn-karaoke-play-raw').classList.add('hidden');
          }

          state.karaoke.lastMimic = scoredMimic;
          var scoreResult = TootApp.DSP.compareSounds(target.features, scoredMimic.features);
          TootApp.Storage.recordScore(target.id, scoreResult.overall);
          renderKaraokeSoundStrip();

          if (state.karaoke.comparePanel) {
            state.karaoke.comparePanel.destroy();
          }
          $('karaoke-result-wrap').classList.remove('hidden');
          state.karaoke.comparePanel = new TootApp.ComparePanel($('karaoke-compare-mount'), {
            soundA: target,
            soundB: scoredMimic,
            result: scoreResult,
            labelA: 'Target Sound',
            labelB: speedMatch ? 'Sped-Up Mimic' : 'Your Mimic',
            initialColormap: $('karaoke-colormap').value
          });

          if ($('chk-karaoke-autoreplay').checked) {
            TootApp.Audio.playSound(scoredMimic.samples, scoredMimic.sampleRate, {
              playbackRate: 1.0,
              channel: state.karaoke.comparePanel.chanB,
              onProgress: function (p) {
                if (state.karaoke.comparePanel && state.karaoke.comparePanel.specB) {
                  state.karaoke.comparePanel.specB.setPlayhead(p);
                }
              },
              onEnded: function () {
                if (state.karaoke.comparePanel && state.karaoke.comparePanel.specB) {
                  state.karaoke.comparePanel.specB.setPlayhead(null);
                }
              }
            });
          }
        }
      });
    });

    $('btn-karaoke-play-raw').addEventListener('click', function () {
      var raw = state.karaoke.lastRawMimic;
      if (raw) {
        TootApp.Audio.playSound(raw.samples, raw.sampleRate, { channel: 'karaoke_raw_slow' });
      }
    });

    $('btn-karaoke-retry').addEventListener('click', function () {
      $('btn-karaoke-record').click();
    });

    $('btn-karaoke-next').addEventListener('click', function () {
      $('btn-karaoke-random').click();
      $('karaoke-result-wrap').classList.add('hidden');
    });

    $('btn-karaoke-save-mimic').addEventListener('click', function () {
      var mimic = state.karaoke.lastMimic;
      if (!mimic) return;
      var target = findSoundById(state.karaoke.selectedId);
      var saveCopy = Object.assign({}, mimic, {
        id: 'custom_' + Date.now(),
        name: 'Mimic: ' + (target ? target.name : 'Toot'),
        emoji: '🎤',
        createdAt: Date.now()
      });
      TootApp.Storage.saveCustomSound(saveCopy).then(function (saved) {
        state.customSounds.unshift(saved);
        refreshAllSoundPickers();
        showToast('Saved "' + saved.name + '" to your Sound Bank!');
      });
    });

    updateSlowMoHint();
  }

  /* ==================== TAB 2: FARTNALYSIS ==================== */
  function renderLabCompare() {
    var g = state.guess;
    var emptyEl = $('fartnalysis-empty');
    var stripEl = $('fartnalysis-guess-strip');
    var subEl = $('fartnalysis-subtitle');
    var mountEl = $('lab-compare-mount');

    if ((!state.lab.actualSound || !state.lab.guessSound) && g.actualFart) {
      var autoScored = g.guesses
        .filter(function (x) { return !!x.result; })
        .sort(function (a, b) {
          if (b.result.overall !== a.result.overall) return b.result.overall - a.result.overall;
          return a.guessNum - b.guessNum;
        });
      if (autoScored.length > 0) {
        state.lab.actualSound = g.actualFart;
        state.lab.guessSound = autoScored[0].sound;
        state.lab.guessId = autoScored[0].id;
      }
    }

    var sA = state.lab.actualSound;
    var sB = state.lab.guessSound;

    if (!sA || !sB) {
      if (state.lab.comparePanel) {
        state.lab.comparePanel.destroy();
        state.lab.comparePanel = null;
      }
      mountEl.innerHTML = '';
      stripEl.classList.add('hidden');
      stripEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      subEl.textContent = 'Record a fart and a guess on Play to compare them.';
      return;
    }

    emptyEl.classList.add('hidden');
    subEl.textContent = sB.name + ' compared against ' + sA.name;

    var roundScored =
      g.actualFart && g.actualFart.id === sA.id
        ? g.guesses
            .filter(function (x) { return !!x.result; })
            .sort(function (a, b) {
              if (b.result.overall !== a.result.overall) return b.result.overall - a.result.overall;
              return a.guessNum - b.guessNum;
            })
        : [];

    if (roundScored.length > 1) {
      stripEl.classList.remove('hidden');
      stripEl.innerHTML = roundScored
        .map(function (entry) {
          var isAct = entry.id === state.lab.guessId;
          return (
            '<button type="button" class="fartnalysis-guess-pill' +
            (isAct ? ' active' : '') +
            '" data-pick-guess-id="' +
            esc(entry.id) +
            '">' +
            esc(entry.sound.name) +
            ' (' +
            entry.result.overall +
            '%)</button>'
          );
        })
        .join('');

      stripEl.querySelectorAll('.fartnalysis-guess-pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var pid = this.getAttribute('data-pick-guess-id');
          var found = roundScored.find(function (x) { return x.id === pid; });
          if (found) {
            state.lab.guessSound = found.sound;
            state.lab.guessId = found.id;
            renderLabCompare();
          }
        });
      });
    } else {
      stripEl.classList.add('hidden');
      stripEl.innerHTML = '';
    }

    if (state.lab.comparePanel) {
      state.lab.comparePanel.destroy();
    }
    state.lab.comparePanel = new TootApp.ComparePanel(mountEl, {
      soundA: sA,
      soundB: sB,
      labelA: 'Actual Fart',
      labelB: sB.name || 'Guess'
    });
  }

  function initLabTab() {
    $('btn-fartnalysis-back').addEventListener('click', function () {
      switchTab('guess');
    });
    $('btn-fartnalysis-go-play').addEventListener('click', function () {
      switchTab('guess');
    });
  }

  /* ==================== BOOTSTRAP ==================== */
  function refreshAllSoundPickers() {
    renderPastFartsRail();
    renderKaraokeSoundStrip();
  }

  function initMicControls() {
    var devSel = $('mic-device-select');
    var boostSel = $('mic-boost-select');
    var testBtn = $('btn-mic-test');
    var meterEl = $('mic-test-meter');
    var statusEl = $('mic-test-status');

    function runTest() {
      var zeroFrames = 0;
      testBtn.textContent = '⏹ Stop Test';
      statusEl.textContent = 'Requesting mic…';
      TootApp.Audio.startMicTest(function (info) {
        var pct = Math.min(100, Math.round(Math.max(info.rms * 420, info.peak * 110)));
        meterEl.style.width = pct + '%';
        if (info.peak < 1e-6) {
          zeroFrames++;
        } else {
          zeroFrames = 0;
        }
        if (info.muted) {
          statusEl.textContent = '⚠️ ' + info.trackLabel + ' is muted!';
        } else if (zeroFrames > 45) {
          statusEl.textContent = '⚠️ 0 signal on ' + info.trackLabel + ' — try another Mic or check Windows Sound settings';
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
    }

    devSel.addEventListener('change', function () {
      TootApp.Audio.setSelectedDevice(this.value);
      if (TootApp.Audio.isMicTesting()) {
        runTest();
      }
    });

    boostSel.addEventListener('change', function () {
      TootApp.Audio.setMicBoost(parseFloat(this.value) || 1.0);
    });

    testBtn.addEventListener('click', function () {
      if (TootApp.Audio.isMicTesting()) {
        TootApp.Audio.stopMicTest();
        resetMicTestUI('Ready');
      } else {
        runTest();
      }
    });

    $('btn-mic-release').addEventListener('click', function () {
      if (TootApp.Audio.isMicTesting()) {
        TootApp.Audio.stopMicTest();
      }
      if (TootApp.Audio.releaseMic) {
        TootApp.Audio.releaseMic();
      }
      resetMicTestUI('Mic released');
      showToast('Microphone released');
    });

    $('btn-toggle-mic-bar').addEventListener('click', function () {
      $('mic-drawer').classList.toggle('hidden');
    });

    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', refreshMicDevices);
    }
    refreshMicDevices();
  }

  function bootstrap() {
    var isFile = root.location && root.location.protocol === 'file:';
    if (isFile || !navigator.mediaDevices) {
      $('file-protocol-banner').classList.remove('hidden');
      $('mic-drawer').classList.remove('hidden');
    }

    document.querySelectorAll('.nav-tab').forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function () {
        switchTab(this.getAttribute('data-tab'));
      });
    });

    $('btn-global-stop').addEventListener('click', function () {
      TootApp.Audio.stopAll();
      if (TootApp.Audio.isMicTesting()) {
        TootApp.Audio.stopMicTest();
        resetMicTestUI('Ready');
      }
      if (state.karaoke.targetSpec) state.karaoke.targetSpec.setPlayhead(null);
    });

    initMicControls();
    initGuessTab();
    initKaraokeTab();
    initLabTab();
    updatePlayUI();
    switchTab('guess');

    Promise.all([TootApp.Synth.generateBuiltInSounds(), TootApp.Storage.loadCustomSounds()])
      .then(function (results) {
        state.builtInSounds = results[0] || [];
        state.customSounds = results[1] || [];
        var maxFartNum = state.customSounds.length;
        for (var i = 0; i < state.customSounds.length; i++) {
          var nm = state.customSounds[i] && state.customSounds[i].name;
          var matchNum = nm && /#(\d+)/.exec(nm);
          if (matchNum) {
            var parsedNum = parseInt(matchNum[1], 10);
            if (Number.isFinite(parsedNum) && parsedNum > maxFartNum) {
              maxFartNum = parsedNum;
            }
          }
        }
        state.guess.origCounter = maxFartNum;
        refreshAllSoundPickers();
        updatePlayUI();

        renderLabCompare();

        if (state.builtInSounds.length > 0) {
          selectKaraokeSound(state.builtInSounds[0].id);
        }
        drawIdleWave($('karaoke-wave-canvas'), 'Waveform ready');
      })
      .catch(function (err) {
        showToast('Failed to initialize audio synthesizer: ' + (err && err.message ? err.message : err), true);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  TootApp.App = {
    switchTab: switchTab,
    getState: function () { return state; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
