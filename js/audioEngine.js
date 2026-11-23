(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  var audioCtx = null;
  var activeChannels = new Map();
  var seqGeneration = 0;
  var recState = null;
  var autoDetectState = null;
  var micTestState = null;
  var warmStream = null;
  var warmDeviceId = null;
  var warmSourceNode = null;
  var warmSourceCtx = null;
  var selectedDeviceId = '';
  var micBoost = 1.0;
  var startingRecording = false;
  var startingAutoDetect = false;

  function ensureContext() {
    if (!audioCtx) {
      var Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) {
        throw new Error('Web Audio API is not supported in this browser.');
      }
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      return audioCtx.resume().then(function () {
        return audioCtx;
      });
    }
    return Promise.resolve(audioCtx);
  }

  function samplesToAudioBuffer(ctx, samples, sampleRate) {
    var sr = sampleRate || ctx.sampleRate || 44100;
    var len = Math.max(1, samples ? samples.length : 0);
    var buf = ctx.createBuffer(1, len, sr);
    if (samples && samples.length > 0) {
      buf.getChannelData(0).set(samples);
    }
    return buf;
  }

  function audioBufferToMono(audioBuffer) {
    var chCount = audioBuffer.numberOfChannels;
    var len = audioBuffer.length;
    var mono = new Float32Array(len);
    if (chCount === 1) {
      mono.set(audioBuffer.getChannelData(0));
      return { samples: mono, sampleRate: audioBuffer.sampleRate };
    }
    for (var ch = 0; ch < chCount; ch++) {
      var data = audioBuffer.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        mono[i] += data[i] / chCount;
      }
    }
    return { samples: mono, sampleRate: audioBuffer.sampleRate };
  }

  function stopChannel(channel) {
    var entry = activeChannels.get(channel);
    if (!entry) return;
    entry.stopped = true;
    if (entry.rafId) {
      cancelAnimationFrame(entry.rafId);
      entry.rafId = null;
    }
    try {
      entry.source.onended = null;
      entry.source.stop();
      entry.source.disconnect();
      entry.gain.disconnect();
    } catch (e) {
      // Ignore already stopped sources
    }
    activeChannels.delete(channel);
    if (entry.onEnded) {
      try {
        entry.onEnded(true);
      } catch (err) {
        // Ignore callback error
      }
    }
  }

  function stopAll() {
    seqGeneration++;
    var keys = Array.from(activeChannels.keys());
    for (var i = 0; i < keys.length; i++) {
      stopChannel(keys[i]);
    }
  }

  function setActiveRate(channel, rate) {
    var entry = activeChannels.get(channel);
    if (!entry || entry.stopped) return;
    var clamped = Math.max(0.25, Math.min(2.5, Number(rate) || 1.0));
    entry.rate = clamped;
    try {
      entry.source.playbackRate.setValueAtTime(clamped, entry.ctx.currentTime);
    } catch (e) {
      entry.source.playbackRate.value = clamped;
    }
  }

  function isPlaying(channel) {
    if (channel) return activeChannels.has(channel);
    return activeChannels.size > 0;
  }

  /**
   * Play mono Float32Array samples with real-time playbackRate & progress tracking.
   */
  function playSound(samples, sampleRate, opts) {
    opts = opts || {};
    if (!samples || samples.length === 0) {
      if (opts.onEnded) opts.onEnded(false);
      return Promise.resolve();
    }

    var channel = opts.channel || 'solo';
    var rate = Math.max(0.25, Math.min(2.5, Number(opts.playbackRate) || 1.0));
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    var onEnded = typeof opts.onEnded === 'function' ? opts.onEnded : null;

    stopChannel(channel);

    return ensureContext().then(function (ctx) {
      var audioBuf = samplesToAudioBuffer(ctx, samples, sampleRate);
      var source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.playbackRate.value = rate;

      var gain = ctx.createGain();
      gain.gain.value = typeof opts.gain === 'number' ? opts.gain : 0.95;

      source.connect(gain);
      gain.connect(ctx.destination);

      var durationSec = audioBuf.duration;
      var entry = {
        ctx: ctx,
        source: source,
        gain: gain,
        rate: rate,
        durationSec: durationSec,
        playedAudioSec: 0,
        lastPerfMs: performance.now(),
        rafId: null,
        stopped: false,
        onEnded: onEnded
      };

      activeChannels.set(channel, entry);

      function tick(nowMs) {
        if (entry.stopped || !activeChannels.has(channel)) return;
        var dt = Math.max(0, (nowMs - entry.lastPerfMs) / 1000);
        entry.lastPerfMs = nowMs;
        entry.playedAudioSec += dt * entry.rate;
        var progress = durationSec > 0 ? Math.min(1, entry.playedAudioSec / durationSec) : 1;
        if (onProgress) {
          onProgress(progress);
        }
        if (progress < 1) {
          entry.rafId = requestAnimationFrame(tick);
        }
      }

      source.onended = function () {
        if (entry.stopped) return;
        entry.stopped = true;
        if (entry.rafId) {
          cancelAnimationFrame(entry.rafId);
          entry.rafId = null;
        }
        activeChannels.delete(channel);
        if (onProgress) onProgress(1);
        if (onEnded) onEnded(false);
      };

      source.start(0);
      if (onProgress) {
        onProgress(0);
        entry.rafId = requestAnimationFrame(tick);
      }
    });
  }

  /**
   * Play an array of { samples, sampleRate, playbackRate, channel, onProgress, onEnded } sequentially.
   */
  function playSequence(items, pauseMs) {
    stopAll();
    var myGen = ++seqGeneration;
    var pause = typeof pauseMs === 'number' ? pauseMs : 280;

    function step(idx) {
      if (myGen !== seqGeneration || idx >= items.length) {
        return Promise.resolve();
      }
      var item = items[idx];
      return new Promise(function (resolve) {
        var settled = false;
        playSound(item.samples, item.sampleRate, {
          playbackRate: item.playbackRate || 1.0,
          channel: item.channel || 'seq_' + idx,
          onProgress: item.onProgress,
          onEnded: function (wasCancelled) {
            if (item.onEnded) item.onEnded(wasCancelled);
            if (settled) return;
            settled = true;
            if (wasCancelled || myGen !== seqGeneration) {
              resolve();
              return;
            }
            if (idx + 1 < items.length && pause > 0) {
              setTimeout(function () {
                step(idx + 1).then(resolve);
              }, pause);
            } else {
              step(idx + 1).then(resolve);
            }
          }
        }).catch(function () {
          if (!settled) {
            settled = true;
            resolve();
          }
        });
      });
    }

    return step(0);
  }

  /**
   * Play multiple sounds simultaneously (Overlay comparison).
   */
  function playSimultaneous(items) {
    stopAll();
    var promises = items.map(function (item, idx) {
      return new Promise(function (resolve) {
        playSound(item.samples, item.sampleRate, {
          playbackRate: item.playbackRate || 1.0,
          channel: item.channel || 'sim_' + idx,
          gain: typeof item.gain === 'number' ? item.gain : 0.72,
          onProgress: item.onProgress,
          onEnded: function (wasCancelled) {
            if (item.onEnded) item.onEnded(wasCancelled);
            resolve();
          }
        }).catch(function () {
          resolve();
        });
      });
    });
    return Promise.all(promises);
  }

  function setSelectedDevice(deviceId) {
    var nextId = deviceId || '';
    if (nextId !== warmDeviceId) {
      releaseMicStream();
    }
    selectedDeviceId = nextId;
  }

  function getSelectedDevice() {
    return selectedDeviceId;
  }

  function setMicBoost(gain) {
    var g = Number(gain);
    if (!Number.isFinite(g)) g = 1.0;
    micBoost = Math.max(0.5, Math.min(6.0, g));
    if (micTestState && micTestState.inputGain) {
      micTestState.inputGain.gain.value = micBoost;
    }
    if (recState && recState.inputGain) {
      recState.inputGain.gain.value = micBoost;
    }
    if (autoDetectState && autoDetectState.inputGain) {
      autoDetectState.inputGain.gain.value = micBoost;
    }
  }

  function getMicBoost() {
    return micBoost;
  }

  function listInputDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return Promise.resolve([]);
    }
    return navigator.mediaDevices
      .enumerateDevices()
      .then(function (devices) {
        var inputs = [];
        for (var i = 0; i < devices.length; i++) {
          if (devices[i].kind === 'audioinput') {
            inputs.push({
              deviceId: devices[i].deviceId,
              label: devices[i].label || ''
            });
          }
        }
        return inputs;
      })
      .catch(function () {
        return [];
      });
  }

  function buildAudioConstraints(deviceId) {
    var audio = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true
    };
    if (deviceId) {
      audio.deviceId = { exact: deviceId };
    }
    return audio;
  }

  function mapMicError(err) {
    var isFile = root.location && root.location.protocol === 'file:';
    if (!err) return new Error('Could not access microphone.');
    var name = err.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return new Error(
        isFile
          ? 'Microphone blocked on file:// page. Start "Launch Toot Match.bat" (or node server.js) and open http://localhost:3000/'
          : 'Microphone permission denied. Click the lock/mic icon in your browser address bar and allow Microphone access.'
      );
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return new Error('No microphone found. Plug in or enable a microphone in Windows Sound settings, or pick another Mic above.');
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return new Error('Microphone is busy or blocked by Windows privacy settings / another app.');
    }
    return new Error(err.message || 'Could not access microphone.');
  }

  function isStreamLive(stream) {
    if (!stream || !stream.active) return false;
    var tracks = typeof stream.getAudioTracks === 'function' ? stream.getAudioTracks() : [];
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].readyState === 'live') return true;
    }
    return false;
  }

  function releaseMicStream() {
    if (micTestState && micTestState.active) {
      stopMicTest();
    }
    if (autoDetectState && autoDetectState.active) {
      stopAutoDetect(true);
    }
    if (warmSourceNode) {
      try { warmSourceNode.disconnect(); } catch (e) {}
    }
    if (warmStream) {
      try {
        warmStream.getTracks().forEach(function (t) { t.stop(); });
      } catch (e) {}
    }
    warmStream = null;
    warmDeviceId = null;
    warmSourceNode = null;
    warmSourceCtx = null;
  }

  function getOrCreateSourceNode(ctx, stream) {
    if (stream === warmStream && warmSourceNode && warmSourceCtx === ctx) {
      return warmSourceNode;
    }
    var node = ctx.createMediaStreamSource(stream);
    if (stream === warmStream) {
      warmSourceNode = node;
      warmSourceCtx = ctx;
    }
    return node;
  }

  function hasWarmMic() {
    return isStreamLive(warmStream) && warmDeviceId === (selectedDeviceId || '');
  }

  function openMicStream(deviceId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      var isFile = root.location && root.location.protocol === 'file:';
      return Promise.reject(
        new Error(
          isFile
            ? 'Microphone requires http://localhost:3000/ (not file://). Double-click "Launch Toot Match.bat" or run "node server.js".'
            : 'Microphone API unavailable in this browser. Open http://localhost:3000/ in Chrome, Edge, or Safari.'
        )
      );
    }

    var targetId = deviceId || '';
    if (warmStream && warmDeviceId === targetId && isStreamLive(warmStream)) {
      return Promise.resolve(warmStream);
    }

    releaseMicStream();
    var primary = { audio: buildAudioConstraints(deviceId) };
    return navigator.mediaDevices
      .getUserMedia(primary)
      .catch(function (err) {
        if (err && (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError')) {
          var fallback = deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true };
          return navigator.mediaDevices.getUserMedia(fallback).catch(function () {
            return navigator.mediaDevices.getUserMedia({ audio: true });
          });
        }
        throw err;
      })
      .then(function (stream) {
        warmStream = stream;
        warmDeviceId = targetId;
        var tracks = typeof stream.getAudioTracks === 'function' ? stream.getAudioTracks() : [];
        for (var i = 0; i < tracks.length; i++) {
          tracks[i].onended = function () {
            if (warmStream === stream && !isStreamLive(stream)) {
              releaseMicStream();
            }
          };
        }
        return stream;
      })
      .catch(function (err) {
        throw mapMicError(err);
      });
  }

  function stopMicTest() {
    if (!micTestState) return;
    var st = micTestState;
    micTestState = null;
    st.active = false;
    if (st.rafId) cancelAnimationFrame(st.rafId);
    try { st.sourceNode.disconnect(); } catch (e) {}
    try { st.inputGain.disconnect(); } catch (e) {}
    try { st.analyser.disconnect(); } catch (e) {}
    try { st.zeroGain.disconnect(); } catch (e) {}
    if (st.stream && st.stream !== warmStream) {
      try {
        st.stream.getTracks().forEach(function (t) { t.stop(); });
      } catch (e) {}
    }
  }

  function isMicTesting() {
    return Boolean(micTestState && micTestState.active);
  }

  function startMicTest(onLevel) {
    stopMicTest();
    if ((recState && recState.active) || (autoDetectState && autoDetectState.active)) {
      return Promise.reject(new Error('Stop recording before testing microphone.'));
    }

    return ensureContext().then(function (ctx) {
      return openMicStream(selectedDeviceId).then(function (stream) {
        var sourceNode = getOrCreateSourceNode(ctx, stream);
        var inputGain = ctx.createGain();
        inputGain.gain.value = micBoost;

        var analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;

        var zeroGain = ctx.createGain();
        zeroGain.gain.value = 0;

        sourceNode.connect(inputGain);
        inputGain.connect(analyser);
        analyser.connect(zeroGain);
        zeroGain.connect(ctx.destination);

        var track = stream.getAudioTracks()[0];
        var trackLabel = (track && track.label) || 'Default Microphone';
        var timeData = new Float32Array(analyser.fftSize);

        var st = {
          active: true,
          stream: stream,
          sourceNode: sourceNode,
          inputGain: inputGain,
          analyser: analyser,
          zeroGain: zeroGain,
          rafId: null
        };
        micTestState = st;

        function pump() {
          if (!st.active) return;
          analyser.getFloatTimeDomainData(timeData);
          var sumSq = 0;
          var peak = 0;
          for (var i = 0; i < timeData.length; i++) {
            var v = timeData[i];
            var a = Math.abs(v);
            if (a > peak) peak = a;
            sumSq += v * v;
          }
          var rms = Math.sqrt(sumSq / timeData.length);
          if (onLevel) {
            onLevel({
              rms: rms,
              peak: peak,
              trackLabel: trackLabel,
              muted: Boolean(track && track.muted)
            });
          }
          st.rafId = requestAnimationFrame(pump);
        }

        st.rafId = requestAnimationFrame(pump);
        return { trackLabel: trackLabel, muted: Boolean(track && track.muted) };
      });
    });
  }

  function pickRecorderMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    var candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(candidates[i])) {
        return candidates[i];
      }
    }
    return '';
  }

  /**
   * Start microphone capture via live Web Audio PCM graph (+ MediaRecorder backup).
   */
  function startRecording(opts) {
    opts = opts || {};
    if (startingRecording || startingAutoDetect || (recState && recState.active) || (autoDetectState && autoDetectState.active)) {
      return Promise.reject(new Error('Recording already in progress.'));
    }

    stopMicTest();
    stopAll();
    startingRecording = true;

    var onLevel = typeof opts.onLevel === 'function' ? opts.onLevel : null;
    var onAutoStop = typeof opts.onAutoStop === 'function' ? opts.onAutoStop : null;
    var onStarted = typeof opts.onStarted === 'function' ? opts.onStarted : null;
    var maxDurationSec = opts.maxDurationSec || 7;

    return ensureContext()
      .then(function (ctx) {
        return openMicStream(selectedDeviceId).then(function (stream) {
          var track = stream.getAudioTracks()[0];
          var trackLabel = (track && track.label) || 'Default Microphone';
          var trackMuted = Boolean(track && track.muted);

          var sourceNode = getOrCreateSourceNode(ctx, stream);
          var inputGain = ctx.createGain();
          inputGain.gain.value = micBoost;

          var analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;

          var zeroGain = ctx.createGain();
          zeroGain.gain.value = 0;

          var scriptNode = null;
          if (typeof ctx.createScriptProcessor === 'function') {
            scriptNode = ctx.createScriptProcessor(2048, 1, 1);
          }

          sourceNode.connect(inputGain);
          inputGain.connect(analyser);
          if (scriptNode) {
            analyser.connect(scriptNode);
            scriptNode.connect(zeroGain);
          } else {
            analyser.connect(zeroGain);
          }
          zeroGain.connect(ctx.destination);

          // Optional MediaRecorder backup in case ScriptProcessor yields 0 chunks
          var backupRecorder = null;
          var backupChunks = [];
          if (typeof MediaRecorder !== 'undefined') {
            try {
              var mimeType = pickRecorderMimeType();
              backupRecorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
              backupRecorder.ondataavailable = function (ev) {
                if (ev.data && ev.data.size > 0) backupChunks.push(ev.data);
              };
              backupRecorder.start(100);
            } catch (err) {
              backupRecorder = null;
            }
          }

          var pcmChunks = [];
          var timeData = new Float32Array(analyser.fftSize);
          var startPerf = performance.now();

          var state = {
            active: true,
            ctx: ctx,
            stream: stream,
            trackLabel: trackLabel,
            trackMuted: trackMuted,
            sourceNode: sourceNode,
            inputGain: inputGain,
            analyser: analyser,
            scriptNode: scriptNode,
            zeroGain: zeroGain,
            pcmChunks: pcmChunks,
            backupRecorder: backupRecorder,
            backupChunks: backupChunks,
            rafId: null,
            timerId: null,
            stopPromise: null
          };
          recState = state;
          startingRecording = false;

          if (scriptNode) {
            scriptNode.onaudioprocess = function (ev) {
              if (!state.active) return;
              var inputBuf = ev.inputBuffer.getChannelData(0);
              state.pcmChunks.push(new Float32Array(inputBuf));
            };
          }

          function pumpLevel() {
            if (!state.active) return;
            analyser.getFloatTimeDomainData(timeData);
            var sumSq = 0;
            for (var i = 0; i < timeData.length; i++) {
              sumSq += timeData[i] * timeData[i];
            }
            var rms = Math.sqrt(sumSq / timeData.length);
            var elapsed = (performance.now() - startPerf) / 1000;
            if (onLevel) {
              onLevel(timeData, rms, elapsed);
            }
            state.rafId = requestAnimationFrame(pumpLevel);
          }

          state.rafId = requestAnimationFrame(pumpLevel);

          state.timerId = setTimeout(function () {
            if (state.active) {
              stopRecording().then(function (res) {
                if (onAutoStop) onAutoStop(res);
              });
            }
          }, maxDurationSec * 1000);

          if (onStarted) {
            onStarted({ trackLabel: trackLabel, muted: trackMuted });
          }
          return true;
        });
      })
      .catch(function (err) {
        startingRecording = false;
        throw err;
      });
  }

  /**
   * Stop recording, assemble PCM (or fallback Blob), and auto-clip silence & stray clicks.
   */
  function stopRecording() {
    if (!recState) {
      return Promise.resolve({ ok: false, reason: 'not_recording' });
    }
    if (recState.stopPromise) {
      return recState.stopPromise;
    }

    var state = recState;
    state.active = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    if (state.timerId) clearTimeout(state.timerId);

    function disconnectAudio() {
      if (state.scriptNode) {
        state.scriptNode.onaudioprocess = null;
        try { state.scriptNode.disconnect(); } catch (e) {}
      }
      try { state.sourceNode.disconnect(); } catch (e) {}
      try { state.inputGain.disconnect(); } catch (e) {}
      try { state.analyser.disconnect(); } catch (e) {}
      try { state.zeroGain.disconnect(); } catch (e) {}
      if (state.stream && state.stream !== warmStream) {
        try {
          state.stream.getTracks().forEach(function (t) { t.stop(); });
        } catch (e) {}
      }
      if (recState === state) {
        recState = null;
      }
    }

    var totalLen = 0;
    for (var i = 0; i < state.pcmChunks.length; i++) {
      totalLen += state.pcmChunks[i].length;
    }

    if (totalLen > 0) {
      var rawSamples = new Float32Array(totalLen);
      var offset = 0;
      for (var c = 0; c < state.pcmChunks.length; c++) {
        rawSamples.set(state.pcmChunks[c], offset);
        offset += state.pcmChunks[c].length;
      }

      if (state.backupRecorder && state.backupRecorder.state !== 'inactive') {
        try {
          state.backupRecorder.onstop = null;
          state.backupRecorder.stop();
        } catch (e) {}
      }
      disconnectAudio();

      var sr = state.ctx.sampleRate || 44100;
      var clipInfo = TootApp.DSP.autoClipAudio(rawSamples, sr);
      state.stopPromise = Promise.resolve({
        ok: clipInfo.ok,
        reason: clipInfo.reason || null,
        trackLabel: state.trackLabel,
        muted: state.trackMuted,
        maxRMS: clipInfo.maxRMS,
        rawSamples: rawSamples,
        clippedSamples: clipInfo.clipped,
        sampleRate: sr,
        clipInfo: clipInfo
      });
      return state.stopPromise;
    }

    // Fallback: decode backup MediaRecorder Blob
    state.stopPromise = new Promise(function (resolve) {
      var recorder = state.backupRecorder;
      if (!recorder || recorder.state === 'inactive') {
        disconnectAudio();
        resolve({
          ok: false,
          reason: 'empty_recording',
          trackLabel: state.trackLabel,
          muted: state.trackMuted
        });
        return;
      }

      recorder.onstop = function () {
        var mime = recorder.mimeType || 'audio/webm';
        var blob = new Blob(state.backupChunks, { type: mime });
        disconnectAudio();

        if (!blob || blob.size === 0) {
          resolve({
            ok: false,
            reason: 'empty_recording',
            trackLabel: state.trackLabel,
            muted: state.trackMuted
          });
          return;
        }

        blob
          .arrayBuffer()
          .then(function (arrBuf) {
            return state.ctx.decodeAudioData(arrBuf);
          })
          .then(function (audioBuf) {
            var mono = audioBufferToMono(audioBuf);
            var clipInfo = TootApp.DSP.autoClipAudio(mono.samples, mono.sampleRate);
            resolve({
              ok: clipInfo.ok,
              reason: clipInfo.reason || null,
              trackLabel: state.trackLabel,
              muted: state.trackMuted,
              maxRMS: clipInfo.maxRMS,
              rawSamples: mono.samples,
              clippedSamples: clipInfo.clipped,
              sampleRate: mono.sampleRate,
              clipInfo: clipInfo
            });
          })
          .catch(function (err) {
            resolve({
              ok: false,
              reason: 'decode_failed',
              trackLabel: state.trackLabel,
              muted: state.trackMuted,
              error: err ? err.message : 'Unable to decode audio recording.'
            });
          });
      };

      try {
        recorder.stop();
      } catch (e) {
        disconnectAudio();
        resolve({ ok: false, reason: 'stop_failed', trackLabel: state.trackLabel });
      }
    });

    return state.stopPromise;
  }

  function isRecording() {
    return Boolean((recState && recState.active) || (autoDetectState && autoDetectState.active));
  }

  function isRecordingOrStarting() {
    return Boolean(
      startingRecording ||
        startingAutoDetect ||
        (recState && recState.active) ||
        (autoDetectState && autoDetectState.active)
    );
  }

  function isAutoDetecting() {
    return Boolean(autoDetectState && autoDetectState.active);
  }

  /**
   * Pure rolling-buffer state machine for Auto Detect recording mode.
   * Maintains a fixed 5-second circular buffer, detects likely fart signatures,
   * records through the event + trailing silence, and returns bounded clipped samples.
   */
  function createAutoDetectEngine(sampleRate, opts) {
    opts = opts || {};
    var sr = Math.max(8000, Number(sampleRate) || 44100);
    var ringSeconds = Math.max(2.0, Number(opts.ringSeconds) || 5.0);
    var preEventSec = Math.max(2.0, Math.min(ringSeconds, Number(opts.preEventSec) || 3.0));
    var calibrationSec = Math.max(0.15, Number(opts.calibrationSec) || 0.35);
    var minPostEventSec = Math.max(1.2, Number(opts.minPostEventSec) || 1.85);
    var postSilenceSec = Math.max(0.8, Number(opts.postSilenceSec) || 1.55);
    var maxPostEventSec = Math.max(minPostEventSec + 1.0, Number(opts.maxPostEventSec) || 8.0);

    var ringCap = Math.max(1, Math.round(sr * ringSeconds));
    var ringBuf = new Float32Array(ringCap);
    var ringWrite = 0;
    var ringTotalWritten = 0;

    var phase = 'listening'; // 'listening' | 'triggered' | 'completed'
    var calSamples = 0;
    var calRmsSum = 0;
    var calChunks = 0;
    var noiseFloorRms = 0.004;
    var consecutiveHits = 0;

    var lpState = 0;
    var lpAlpha = 1 - Math.exp((-2 * Math.PI * 850) / sr);

    var preSnapshot = null;
    var postChunks = [];
    var postSamples = 0;
    var silentSamples = 0;
    var finalizedResult = null;

    function writeToRing(chunk) {
      var n = chunk.length;
      if (n >= ringCap) {
        ringBuf.set(chunk.subarray(n - ringCap), 0);
        ringWrite = 0;
        ringTotalWritten += n;
        return;
      }
      var firstLen = Math.min(n, ringCap - ringWrite);
      ringBuf.set(chunk.subarray(0, firstLen), ringWrite);
      if (n > firstLen) {
        ringBuf.set(chunk.subarray(firstLen), 0);
      }
      ringWrite = (ringWrite + n) % ringCap;
      ringTotalWritten += n;
    }

    function readRecentRing(maxSamples) {
      var available = Math.min(ringTotalWritten, ringCap);
      var count = maxSamples > 0 ? Math.min(available, maxSamples) : available;
      var out = new Float32Array(count);
      if (count === 0) return out;
      var startPos = (ringWrite - count + ringCap) % ringCap;
      var firstLen = Math.min(count, ringCap - startPos);
      out.set(ringBuf.subarray(startPos, startPos + firstLen), 0);
      if (count > firstLen) {
        out.set(ringBuf.subarray(0, count - firstLen), firstLen);
      }
      return out;
    }

    function finalize(trackLabel, trackMuted) {
      if (finalizedResult) return finalizedResult;
      phase = 'completed';

      var rawSamples;
      var preSecActual = 0;
      var postSecActual = postSamples / sr;

      if (preSnapshot && postChunks.length > 0) {
        rawSamples = new Float32Array(preSnapshot.length + postSamples);
        rawSamples.set(preSnapshot, 0);
        var off = preSnapshot.length;
        for (var i = 0; i < postChunks.length; i++) {
          rawSamples.set(postChunks[i], off);
          off += postChunks[i].length;
        }
        preSecActual = preSnapshot.length / sr;
      } else {
        rawSamples = readRecentRing(ringCap);
        preSecActual = rawSamples.length / sr;
      }

      var DSP = root.TootApp && root.TootApp.DSP;
      var clipInfo =
        DSP && typeof DSP.autoClipAudio === 'function'
          ? DSP.autoClipAudio(rawSamples, sr)
          : {
              ok: rawSamples.length > 0,
              clipped: rawSamples,
              maxRMS: 0.05
            };

      finalizedResult = {
        ok: Boolean(clipInfo.ok),
        reason: clipInfo.reason || null,
        trackLabel: trackLabel || 'Default Microphone',
        muted: Boolean(trackMuted),
        maxRMS: clipInfo.maxRMS || 0,
        rawSamples: rawSamples,
        clippedSamples: clipInfo.clipped,
        sampleRate: sr,
        clipInfo: clipInfo,
        autoDetectMeta: {
          preEventSec: preSecActual,
          postEventSec: postSecActual,
          totalCaptureSec: rawSamples.length / sr
        }
      };
      return finalizedResult;
    }

    function pushChunk(chunk, trackLabel, trackMuted) {
      var n = chunk ? chunk.length : 0;
      if (n === 0 || phase === 'completed') {
        return {
          phase: phase,
          rms: 0,
          peak: 0,
          lowRatio: 0,
          bufferedSec: Math.min(ringSeconds, ringTotalWritten / sr),
          triggeredNow: false,
          completedNow: false,
          result: finalizedResult
        };
      }

      var sumSq = 0;
      var lowSumSq = 0;
      var peak = 0;
      var zc = 0;
      var prevS = chunk[0];
      for (var i = 0; i < n; i++) {
        var s = chunk[i];
        var a = s < 0 ? -s : s;
        if (a > peak) peak = a;
        sumSq += s * s;
        lpState += lpAlpha * (s - lpState);
        lowSumSq += lpState * lpState;
        if (i > 0 && ((s >= 0 && prevS < 0) || (s < 0 && prevS >= 0))) zc++;
        prevS = s;
      }

      var rms = Math.sqrt(sumSq / n);
      var lowRms = Math.sqrt(lowSumSq / n);
      var lowRatio = rms > 1e-7 ? lowRms / rms : 0;
      var zcrHz = (zc * 0.5 * sr) / Math.max(1, n);

      var triggeredNow = false;
      var completedNow = false;

      if (phase === 'listening') {
        calSamples += n;
        var elapsedSec = calSamples / sr;

        if (elapsedSec <= calibrationSec) {
          calRmsSum += rms;
          calChunks++;
          noiseFloorRms = Math.max(0.002, Math.min(0.035, calRmsSum / Math.max(1, calChunks)));
          writeToRing(chunk);
        } else {
          var thresh = Math.max(0.022, noiseFloorRms * 3.2);
          var isStrongBurst = rms >= thresh * 1.9 && lowRatio >= 0.36;
          var isSustainedLowMid =
            (rms >= thresh && lowRatio >= 0.32 && zcrHz < 3400) ||
            (peak >= Math.max(0.11, noiseFloorRms * 6.0) && lowRatio >= 0.38 && zcrHz < 3400);

          if (isStrongBurst) {
            consecutiveHits += 2;
          } else if (isSustainedLowMid) {
            consecutiveHits++;
          } else {
            consecutiveHits = 0;
            if (rms < Math.max(0.025, noiseFloorRms * 1.8)) {
              noiseFloorRms = Math.max(0.002, Math.min(0.04, noiseFloorRms * 0.92 + rms * 0.08));
            }
          }

          if (consecutiveHits >= 2) {
            preSnapshot = readRecentRing(Math.round(sr * preEventSec));
            postChunks = [new Float32Array(chunk)];
            postSamples = n;
            silentSamples = 0;
            phase = 'triggered';
            triggeredNow = true;
          } else {
            writeToRing(chunk);
          }
        }
      } else if (phase === 'triggered') {
        postChunks.push(new Float32Array(chunk));
        postSamples += n;

        var silThresh = Math.max(0.014, Math.min(0.032, noiseFloorRms * 2.1));
        if (rms <= silThresh) {
          silentSamples += n;
        } else {
          silentSamples = 0;
        }

        var postSec = postSamples / sr;
        var silentSec = silentSamples / sr;
        if ((postSec >= minPostEventSec && silentSec >= postSilenceSec) || postSec >= maxPostEventSec) {
          finalize(trackLabel, trackMuted);
          completedNow = true;
        }
      }

      return {
        phase: phase,
        rms: rms,
        peak: peak,
        lowRatio: lowRatio,
        bufferedSec: Math.min(ringSeconds, ringTotalWritten / sr),
        triggeredNow: triggeredNow,
        completedNow: completedNow,
        result: finalizedResult
      };
    }

    return {
      pushChunk: pushChunk,
      finalize: finalize,
      getPhase: function () { return phase; },
      getRingCapacitySamples: function () { return ringCap; },
      getBufferedSec: function () { return Math.min(ringSeconds, ringTotalWritten / sr); }
    };
  }

  function startAutoDetect(opts) {
    opts = opts || {};
    if (startingRecording || startingAutoDetect || (recState && recState.active) || (autoDetectState && autoDetectState.active)) {
      return Promise.reject(new Error('Recording already in progress.'));
    }

    stopMicTest();
    stopAll();
    startingAutoDetect = true;

    var onStarted = typeof opts.onStarted === 'function' ? opts.onStarted : null;
    var onLevel = typeof opts.onLevel === 'function' ? opts.onLevel : null;
    var onDetected = typeof opts.onDetected === 'function' ? opts.onDetected : null;
    var onAutoStop = typeof opts.onAutoStop === 'function' ? opts.onAutoStop : null;

    return ensureContext()
      .then(function (ctx) {
        return openMicStream(selectedDeviceId).then(function (stream) {
          var track = stream.getAudioTracks()[0];
          var trackLabel = (track && track.label) || 'Default Microphone';
          var trackMuted = Boolean(track && track.muted);

          var sourceNode = getOrCreateSourceNode(ctx, stream);
          var inputGain = ctx.createGain();
          inputGain.gain.value = micBoost;

          var analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;

          var zeroGain = ctx.createGain();
          zeroGain.gain.value = 0;

          var scriptNode = null;
          if (typeof ctx.createScriptProcessor === 'function') {
            scriptNode = ctx.createScriptProcessor(2048, 1, 1);
          }

          sourceNode.connect(inputGain);
          inputGain.connect(analyser);
          if (scriptNode) {
            analyser.connect(scriptNode);
            scriptNode.connect(zeroGain);
          } else {
            analyser.connect(zeroGain);
          }
          zeroGain.connect(ctx.destination);

          var sr = ctx.sampleRate || 44100;
          var engine = createAutoDetectEngine(sr, opts);
          var timeData = new Float32Array(analyser.fftSize);
          var startPerf = performance.now();

          var state = {
            active: true,
            ctx: ctx,
            stream: stream,
            trackLabel: trackLabel,
            trackMuted: trackMuted,
            sourceNode: sourceNode,
            inputGain: inputGain,
            analyser: analyser,
            scriptNode: scriptNode,
            zeroGain: zeroGain,
            engine: engine,
            lastPhase: 'listening',
            lastBufferedSec: 0,
            rafId: null,
            stopPromise: null
          };
          autoDetectState = state;
          startingAutoDetect = false;

          function disconnectAuto() {
            state.active = false;
            if (state.rafId) {
              cancelAnimationFrame(state.rafId);
              state.rafId = null;
            }
            if (state.scriptNode) {
              state.scriptNode.onaudioprocess = null;
              try { state.scriptNode.disconnect(); } catch (e) {}
            }
            try { state.sourceNode.disconnect(); } catch (e) {}
            try { state.inputGain.disconnect(); } catch (e) {}
            try { state.analyser.disconnect(); } catch (e) {}
            try { state.zeroGain.disconnect(); } catch (e) {}
            if (state.stream && state.stream !== warmStream) {
              try {
                state.stream.getTracks().forEach(function (t) { t.stop(); });
              } catch (e) {}
            }
            if (autoDetectState === state) autoDetectState = null;
          }
          state.disconnectAuto = disconnectAuto;

          if (scriptNode) {
            scriptNode.onaudioprocess = function (ev) {
              if (!state.active) return;
              var inputBuf = ev.inputBuffer.getChannelData(0);
              var info = engine.pushChunk(inputBuf, trackLabel, trackMuted);
              state.lastPhase = info.phase;
              state.lastBufferedSec = info.bufferedSec;
              if (info.triggeredNow && onDetected) {
                try { onDetected(info); } catch (e) {}
              }
              if (info.completedNow) {
                disconnectAuto();
                if (onAutoStop) {
                  try { onAutoStop(info.result); } catch (e2) {}
                }
              }
            };
          }

          function pumpLevel() {
            if (!state.active) return;
            analyser.getFloatTimeDomainData(timeData);
            var sumSq = 0;
            for (var i = 0; i < timeData.length; i++) {
              sumSq += timeData[i] * timeData[i];
            }
            var rms = Math.sqrt(sumSq / timeData.length);
            var elapsed = (performance.now() - startPerf) / 1000;
            if (!scriptNode) {
              // Fallback chunk feeding if ScriptProcessor unavailable
              var info = engine.pushChunk(timeData, trackLabel, trackMuted);
              state.lastPhase = info.phase;
              state.lastBufferedSec = info.bufferedSec;
              if (info.triggeredNow && onDetected) onDetected(info);
              if (info.completedNow) {
                disconnectAuto();
                if (onAutoStop) onAutoStop(info.result);
                return;
              }
            }
            if (onLevel) {
              onLevel(timeData, rms, {
                phase: state.lastPhase,
                bufferedSec: state.lastBufferedSec,
                elapsedSec: elapsed
              });
            }
            state.rafId = requestAnimationFrame(pumpLevel);
          }

          state.rafId = requestAnimationFrame(pumpLevel);
          if (onStarted) {
            onStarted({ trackLabel: trackLabel, muted: trackMuted });
          }
          return true;
        });
      })
      .catch(function (err) {
        startingAutoDetect = false;
        throw err;
      });
  }

  function stopAutoDetect(cancelOnly) {
    if (!autoDetectState) {
      return Promise.resolve({ ok: false, reason: 'not_recording' });
    }
    if (autoDetectState.stopPromise) {
      return autoDetectState.stopPromise;
    }

    var state = autoDetectState;
    var wasListening = state.engine && state.engine.getPhase() === 'listening';
    if (typeof state.disconnectAuto === 'function') {
      state.disconnectAuto();
    }

    if (cancelOnly || wasListening) {
      state.stopPromise = Promise.resolve({
        ok: false,
        reason: 'cancelled',
        trackLabel: state.trackLabel,
        muted: state.trackMuted
      });
      return state.stopPromise;
    }

    var res = state.engine.finalize(state.trackLabel, state.trackMuted);
    state.stopPromise = Promise.resolve(res);
    return state.stopPromise;
  }

  /**
   * Decode an uploaded audio File (.wav, .mp3, .ogg, .webm, etc.) and auto-clip it.
   */
  function decodeAudioFile(file) {
    if (!file) return Promise.reject(new Error('No file selected.'));
    return ensureContext()
      .then(function (ctx) {
        return file.arrayBuffer().then(function (buf) {
          return ctx.decodeAudioData(buf);
        });
      })
      .then(function (audioBuf) {
        var mono = audioBufferToMono(audioBuf);
        var clipInfo = TootApp.DSP.autoClipAudio(mono.samples, mono.sampleRate);
        return {
          ok: clipInfo.ok,
          reason: clipInfo.reason || null,
          rawSamples: mono.samples,
          clippedSamples: clipInfo.clipped,
          sampleRate: mono.sampleRate,
          clipInfo: clipInfo
        };
      });
  }

  /**
   * Encode mono Float32Array samples into a downloadable 16-bit PCM WAV Blob.
   */
  function encodeWavBlob(samples, sampleRate) {
    var sr = sampleRate || 44100;
    var numSamples = samples.length;
    var buffer = new ArrayBuffer(44 + numSamples * 2);
    var view = new DataView(buffer);

    function writeStr(offset, str) {
      for (var i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    var offset = 44;
    for (var i = 0; i < numSamples; i++) {
      var s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  if (root && typeof root.addEventListener === 'function') {
    root.addEventListener('pagehide', releaseMicStream);
    root.addEventListener('beforeunload', releaseMicStream);
  }

  TootApp.Audio = {
    ensureContext: ensureContext,
    samplesToAudioBuffer: samplesToAudioBuffer,
    audioBufferToMono: audioBufferToMono,
    playSound: playSound,
    playSequence: playSequence,
    playSimultaneous: playSimultaneous,
    setActiveRate: setActiveRate,
    stopChannel: stopChannel,
    stopAll: stopAll,
    isPlaying: isPlaying,
    listInputDevices: listInputDevices,
    setSelectedDevice: setSelectedDevice,
    getSelectedDevice: getSelectedDevice,
    hasWarmMic: hasWarmMic,
    releaseMic: releaseMicStream,
    setMicBoost: setMicBoost,
    getMicBoost: getMicBoost,
    startMicTest: startMicTest,
    stopMicTest: stopMicTest,
    isMicTesting: isMicTesting,
    startRecording: startRecording,
    stopRecording: stopRecording,
    createAutoDetectEngine: createAutoDetectEngine,
    startAutoDetect: startAutoDetect,
    stopAutoDetect: stopAutoDetect,
    isAutoDetecting: isAutoDetecting,
    isRecording: isRecording,
    isRecordingOrStarting: isRecordingOrStarting,
    decodeAudioFile: decodeAudioFile,
    encodeWavBlob: encodeWavBlob
  };
})(typeof window !== 'undefined' ? window : globalThis);
