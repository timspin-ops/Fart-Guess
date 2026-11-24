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
   * Sentry Auto Detect v2 rolling-buffer state machine:
   * - Maintains a fixed 5-second circular raw PCM buffer
   * - Sidechain 2-pole 55 Hz HPF thump rejection + 3-band speech/cough filter
   * - 25 ms sub-frame detection & rolling 20th-percentile ambient noise floor
   * - Post-capture desk-tap/speech/cough/thump validation with automatic Sentry re-arm
   */
  function createAutoDetectEngine(sampleRate, opts) {
    opts = opts || {};
    var sr = Math.max(8000, Number(sampleRate) || 44100);
    var ringSeconds = Math.max(2.0, Number(opts.ringSeconds) || 5.0);
    var preEventSec = Math.max(2.0, Math.min(ringSeconds, Number(opts.preEventSec) || 3.0));
    var settleSec = Math.max(0, Number(opts.settleSec) || 0);
    var calibrationSec = settleSec + Math.max(0.15, Number(opts.calibrationSec) || 0.35);
    var minPostEventSec = Math.max(1.2, Number(opts.minPostEventSec) || 1.85);
    var postSilenceSec = Math.max(0.8, Number(opts.postSilenceSec) || 1.55);
    var maxPostEventSec = Math.max(minPostEventSec + 1.0, Number(opts.maxPostEventSec) || 8.0);
    var autoRearm = opts.autoRearm !== false;

    function clampVal(v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    var ringCap = Math.max(1, Math.round(sr * ringSeconds));
    var ringBuf = new Float32Array(ringCap);
    var ringWrite = 0;
    var ringTotalWritten = 0;

    var subFrameSamples = Math.max(128, Math.round(sr * 0.025)); // 25 ms sub-frame

    var phase = 'listening'; // 'listening' | 'triggered' | 'completed'
    var calSamples = 0;
    var noiseFloorRms = 0.004;
    var consecutiveHits = 0;
    var rearmCount = 0;

    // Rolling 20th-percentile ambient noise floor (~2.0 s across 80 x 25 ms sub-frames)
    var floorHistCap = 80;
    var floorHist = new Float32Array(floorHistCap);
    var floorHistIdx = 0;
    var floorHistCount = 0;

    function pushNoiseFloorSample(val, maxClamp) {
      floorHist[floorHistIdx] = val;
      floorHistIdx = (floorHistIdx + 1) % floorHistCap;
      if (floorHistCount < floorHistCap) floorHistCount++;
      var active = [];
      for (var fi = 0; fi < floorHistCount; fi++) active.push(floorHist[fi]);
      active.sort(function (a, b) { return a - b; });
      var p20 = active[Math.min(active.length - 1, Math.floor(active.length * 0.20))];
      noiseFloorRms = clampVal(p20, 0.002, maxClamp || 0.040);
    }

    // Persistent cascaded 2-pole -12 dB/oct 55 Hz HPF + 3-band crossover (55-750, 750-2600, >2600 Hz)
    var hpAlpha = 1 / (1 + (2 * Math.PI * 36) / sr);
    var hpPrevX1 = 0;
    var hpY1 = 0;
    var hpPrevX2 = 0;
    var hpY2 = 0;
    var alphaB1 = 1 - Math.exp((-2 * Math.PI * 1165) / sr);
    var alphaB2 = 1 - Math.exp((-2 * Math.PI * 4040) / sr);
    var lpB1a = 0;
    var lpB1b = 0;
    var lpB2a = 0;
    var lpB2b = 0;

    // Rolling 1.5s Speech-Context Tracker (60 x 25 ms sub-frames) to block ongoing TV/conversation
    var ctxCap = 60;
    var spcFlag = new Uint8Array(ctxCap);
    var sibFlag = new Uint8Array(ctxCap);
    var spcRmsHist = new Float32Array(ctxCap);
    var ctxIdx = 0;
    var ctxCount = 0;
    var framesSinceSpc = 999;

    function pushSpeechContext(isSpc, isSibActive, rmsVal) {
      spcFlag[ctxIdx] = isSpc ? 1 : 0;
      sibFlag[ctxIdx] = isSibActive ? 1 : 0;
      spcRmsHist[ctxIdx] = isSpc ? rmsVal : 0;
      ctxIdx = (ctxIdx + 1) % ctxCap;
      if (ctxCount < ctxCap) ctxCount++;
      if (isSpc) framesSinceSpc = 0;
      else framesSinceSpc++;
    }

    function getSpeechContext() {
      var speechCount = 0;
      var sibilantCount = 0;
      var rmsList = [];
      for (var ci = 0; ci < ctxCount; ci++) {
        speechCount += spcFlag[ci];
        sibilantCount += sibFlag[ci];
        if (spcRmsHist[ci] > 0) rmsList.push(spcRmsHist[ci]);
      }
      var activeSpeechRms = 0;
      if (rmsList.length > 0) {
        rmsList.sort(function (a, b) { return a - b; });
        activeSpeechRms = rmsList[Math.min(rmsList.length - 1, Math.floor(rmsList.length * 0.75))];
      }
      return {
        speechCount: speechCount,
        sibilantCount: sibilantCount,
        activeSpeechRms: activeSpeechRms,
        inSpeech: speechCount >= 3 || sibilantCount >= 1 || framesSinceSpc <= 14
      };
    }

    var preSnapshot = null;
    var postChunks = [];
    var postSamples = 0;
    var silentSamples = 0;
    var trigAct = 0;
    var trigSpc = 0;
    var trigSib = 0;
    var trigLow = 0;
    var trigFartCore = 0;
    var trigPeakRms = 0;
    var trigEntrySpcRms = 0;
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

    function assembleRawSamples() {
      if (preSnapshot && postChunks.length > 0) {
        var raw = new Float32Array(preSnapshot.length + postSamples);
        raw.set(preSnapshot, 0);
        var off = preSnapshot.length;
        for (var i = 0; i < postChunks.length; i++) {
          raw.set(postChunks[i], off);
          off += postChunks[i].length;
        }
        return {
          rawSamples: raw,
          preSecActual: preSnapshot.length / sr,
          postSecActual: postSamples / sr
        };
      }
      var fallback = readRecentRing(ringCap);
      return {
        rawSamples: fallback,
        preSecActual: fallback.length / sr,
        postSecActual: postSamples / sr
      };
    }

    function analyzeSliceBands(slice) {
      var sl = slice ? slice.length : 0;
      if (sl === 0) {
        return {
          sub55Ratio: 0,
          b1Ratio: 0,
          b2Ratio: 0,
          b3Ratio: 0,
          activeSubFrames: 0,
          speechSubFrames: 0,
          sibilantSubFrames: 0,
          lowVoicedSubFrames: 0
        };
      }
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
      var peakSubRms = 0;
      var subInfos = [];

      for (var o = 0; o < sl; o += subFrameSamples) {
        var e = Math.min(sl, o + subFrameSamples);
        var flen = e - o;
        if (flen <= 0) break;
        var frPow = 0;
        var fhPow = 0;
        var flp1Pow = 0;
        var flp2Pow = 0;
        var fZc = 0;
        var fPrevHp = 0;
        for (var i = o; i < e; i++) {
          var s = slice[i];
          frPow += s * s;
          sHpY1 = hpAlpha * (sHpY1 + s - sHpPrevX1);
          sHpPrevX1 = s;
          sHpY2 = hpAlpha * (sHpY2 + sHpY1 - sHpPrevX2);
          sHpPrevX2 = sHpY1;
          var sHp = sHpY2;
          fhPow += sHp * sHp;
          if (i > o && ((sHp >= 0 && fPrevHp < 0) || (sHp < 0 && fPrevHp >= 0))) fZc++;
          fPrevHp = sHp;

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

        var fRms = Math.sqrt(fhPow / flen);
        if (fRms > peakSubRms) peakSubRms = fRms;
        var fZcr = (fZc * 0.5 * sr) / flen;
        var fp1 = Math.min(fhPow, flp1Pow);
        var fp2 = Math.min(fhPow, Math.max(fp1, flp2Pow));
        var ftot = fhPow + 1e-12;
        subInfos.push({
          rms: fRms,
          zcr: fZcr,
          b1: fp1 / ftot,
          b2: (fp2 - fp1) / ftot,
          b3: (fhPow - fp2) / ftot
        });
      }

      var actGate = Math.max(0.015, peakSubRms * 0.24);
      var activeSubFrames = 0;
      var speechSubFrames = 0;
      var sibilantSubFrames = 0;
      var lowVoicedSubFrames = 0;
      for (var si = 0; si < subInfos.length; si++) {
        var sf = subInfos[si];
        if (sf.rms >= actGate) {
          activeSubFrames++;
          var isSib = (sf.b3 >= 0.32 && sf.b1 < 0.28) || sf.zcr >= 2300;
          var isSpc = isSib || (sf.b2 + sf.b3 >= 0.48) || sf.b3 >= 0.22 || sf.zcr >= 1450;
          var isLow = sf.b1 >= 0.55 && sf.b3 < 0.14 && sf.zcr < 1000;
          if (isSib) sibilantSubFrames++;
          if (isSpc) speechSubFrames++;
          if (isLow) lowVoicedSubFrames++;
        }
      }

      var sub55Ratio = clampVal(1 - hpPow / (rawPow + 1e-12), 0, 1);
      var p1 = Math.min(hpPow, lp1Pow);
      var p2 = Math.min(hpPow, Math.max(p1, lp2Pow));
      var totHp = hpPow + 1e-12;
      return {
        sub55Ratio: sub55Ratio,
        b1Ratio: p1 / totHp,
        b2Ratio: (p2 - p1) / totHp,
        b3Ratio: (hpPow - p2) / totHp,
        activeSubFrames: activeSubFrames,
        speechSubFrames: speechSubFrames,
        sibilantSubFrames: sibilantSubFrames,
        lowVoicedSubFrames: lowVoicedSubFrames
      };
    }

    function validateCapturedEvent(rawSamples, clipInfo, rate) {
      var sampleSr = rate || sr;
      if (!clipInfo || !clipInfo.ok || !clipInfo.clipped || clipInfo.clipped.length === 0) {
        return {
          valid: false,
          reason: 'too_quiet',
          message: 'Too quiet — Sentry re-armed',
          stats: null
        };
      }

      var sIdx = Math.max(0, clipInfo.startSample || 0);
      var eIdx = Math.min(rawSamples.length, clipInfo.endSample || rawSamples.length);
      var activeSlice = eIdx > sIdx ? rawSamples.subarray(sIdx, eIdx) : clipInfo.clipped;
      var bands = analyzeSliceBands(activeSlice);

      var clipped = clipInfo.clipped;
      var clLen = clipped.length;
      var peakAbs = 0;
      var sumSq = 0;
      for (var i = 0; i < clLen; i++) {
        var av = clipped[i] < 0 ? -clipped[i] : clipped[i];
        if (av > peakAbs) peakAbs = av;
        sumSq += clipped[i] * clipped[i];
      }
      var clRms = Math.sqrt(sumSq / Math.max(1, clLen));
      var crestDb = clRms > 1e-9 ? 20 * Math.log10(Math.max(peakAbs, 1e-9) / clRms) : 0;
      var activeDurMs = typeof clipInfo.activeDurationMs === 'number'
        ? clipInfo.activeDurationMs
        : (clipInfo.clippedDuration || (clLen / sampleSr)) * 1000;

      var stats = {
        sub55Ratio: Number(bands.sub55Ratio.toFixed(3)),
        b1Ratio: Number(bands.b1Ratio.toFixed(3)),
        b2Ratio: Number(bands.b2Ratio.toFixed(3)),
        b3Ratio: Number(bands.b3Ratio.toFixed(3)),
        crestDb: Number(crestDb.toFixed(1)),
        activeDurMs: Number(activeDurMs.toFixed(1))
      };

      if (bands.sub55Ratio > 0.62) {
        return {
          valid: false,
          reason: 'thump',
          message: 'Filtered low-frequency thump — Sentry re-armed',
          stats: stats
        };
      }
      if ((activeDurMs < 32 && crestDb > 11.0) || (activeDurMs < 42 && (crestDb > 13.5 || bands.b3Ratio > 0.28 || bands.sub55Ratio > 0.45))) {
        return {
          valid: false,
          reason: 'desk_tap',
          message: 'Filtered desk tap / knock — Sentry re-armed',
          stats: stats
        };
      }
      if ((bands.b3Ratio > 0.32 && bands.b1Ratio < 0.38) || (bands.b2Ratio + bands.b3Ratio > 0.72 && crestDb > 12.0 && bands.b1Ratio < 0.30)) {
        return {
          valid: false,
          reason: 'cough_or_clap',
          message: 'Filtered cough / clap — Sentry re-armed',
          stats: stats
        };
      }

      var DSP = root.TootApp && root.TootApp.DSP;
      if (DSP && typeof DSP.extractFeatures === 'function') {
        var feat = DSP.extractFeatures(clipped, sampleSr);
        var roll85 = typeof feat.spectralRolloff85Hz === 'number' ? feat.spectralRolloff85Hz : feat.spectralCentroidHz;
        var isVowelPlusSibilant =
          bands.sibilantSubFrames >= 2 && bands.lowVoicedSubFrames >= 2 && feat.voicedRatio >= 0.25;
        var isBroadbandSpeech =
          feat.voicedRatio >= 0.32 &&
          (bands.b2Ratio + bands.b3Ratio) >= 0.46 &&
          (roll85 > 1350 || feat.above2kPowerShare >= 0.12 || feat.zcr >= 950);
        var isSyllabicCadence =
          feat.voicedRatio >= 0.40 &&
          feat.modRateHz >= 2.5 &&
          feat.modRateHz <= 7.0 &&
          feat.modBands &&
          feat.modBands[0] >= 0.38 &&
          feat.burstCount >= 3 &&
          (roll85 > 1100 || feat.zcr > 800 || feat.spectralFlatness > 0.42);
        var isMidSpeech =
          (feat.voicedRatio >= 0.32 && bands.b2Ratio >= 0.44 && bands.b1Ratio < 0.44 && roll85 > 900) ||
          (bands.b2Ratio >= 0.50 && bands.b1Ratio < 0.36 && roll85 > 1100);
        if (isVowelPlusSibilant || isBroadbandSpeech || isSyllabicCadence || isMidSpeech) {
          return {
            valid: false,
            reason: 'speech',
            message: 'Filtered speech / TV chatter — Sentry re-armed',
            stats: stats
          };
        }
      }

      return { valid: true, reason: null, message: null, stats: stats };
    }

    function finalize(trackLabel, trackMuted, preBuilt) {
      if (finalizedResult) return finalizedResult;
      phase = 'completed';

      var built = preBuilt || assembleRawSamples();
      var rawSamples = built.rawSamples;
      var preSecActual = built.preSecActual;
      var postSecActual = built.postSecActual;

      var DSP = root.TootApp && root.TootApp.DSP;
      var clipInfo = built.clipInfo || (
        DSP && typeof DSP.autoClipAudio === 'function'
          ? DSP.autoClipAudio(rawSamples, sr)
          : {
              ok: rawSamples.length > 0,
              clipped: rawSamples,
              maxRMS: 0.05
            }
      );

      var bandStats = built.bandStats;
      if (!bandStats && clipInfo && clipInfo.ok && rawSamples.length > 0) {
        var sIdx = Math.max(0, clipInfo.startSample || 0);
        var eIdx = Math.min(rawSamples.length, clipInfo.endSample || rawSamples.length);
        bandStats = analyzeSliceBands(eIdx > sIdx ? rawSamples.subarray(sIdx, eIdx) : clipInfo.clipped);
      }

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
          version: 2,
          preEventSec: preSecActual,
          postEventSec: postSecActual,
          totalCaptureSec: rawSamples.length / sr,
          rearmCount: rearmCount,
          noiseFloorRms: Number(noiseFloorRms.toFixed(5)),
          sub55Ratio: bandStats ? Number(bandStats.sub55Ratio.toFixed(3)) : 0,
          b1Ratio: bandStats ? Number(bandStats.b1Ratio.toFixed(3)) : 0,
          b2Ratio: bandStats ? Number(bandStats.b2Ratio.toFixed(3)) : 0,
          b3Ratio: bandStats ? Number(bandStats.b3Ratio.toFixed(3)) : 0
        }
      };
      return finalizedResult;
    }

    function processSubFrame(subSlice, trackLabel, trackMuted) {
      var n = subSlice.length;
      var rawSumSq = 0;
      var rawPeak = 0;
      var hpPow = 0;
      var lp1Pow = 0;
      var lp2Pow = 0;
      var hpPeak = 0;
      var hpZc = 0;
      var prevHp = 0;

      for (var i = 0; i < n; i++) {
        var s = subSlice[i];
        var aRaw = s < 0 ? -s : s;
        if (aRaw > rawPeak) rawPeak = aRaw;
        rawSumSq += s * s;

        hpY1 = hpAlpha * (hpY1 + s - hpPrevX1);
        hpPrevX1 = s;
        hpY2 = hpAlpha * (hpY2 + hpY1 - hpPrevX2);
        hpPrevX2 = hpY1;
        var sHp = hpY2;

        hpPow += sHp * sHp;
        var aHp = sHp < 0 ? -sHp : sHp;
        if (aHp > hpPeak) hpPeak = aHp;
        if (i > 0 && ((sHp >= 0 && prevHp < 0) || (sHp < 0 && prevHp >= 0))) hpZc++;
        prevHp = sHp;

        lpB1a += alphaB1 * (sHp - lpB1a);
        lpB1b += alphaB1 * (lpB1a - lpB1b);
        lpB2a += alphaB2 * (sHp - lpB2a);
        lpB2b += alphaB2 * (lpB2a - lpB2b);
        lp1Pow += lpB1b * lpB1b;
        lp2Pow += lpB2b * lpB2b;
      }

      var rawRms = Math.sqrt(rawSumSq / n);
      var hpRms = Math.sqrt(hpPow / n);
      var subShare = clampVal(1 - hpPow / (rawSumSq + 1e-12), 0, 1);
      var p1 = Math.min(hpPow, lp1Pow);
      var p2 = Math.min(hpPow, Math.max(p1, lp2Pow));
      var totHp = hpPow + 1e-12;
      var b1Share = p1 / totHp;
      var b2Share = (p2 - p1) / totHp;
      var b3Share = (hpPow - p2) / totHp;
      var lowRatio = hpRms > 1e-7 ? Math.sqrt(p1 / n) / hpRms : 0;
      var hpZcrHz = (hpZc * 0.5 * sr) / Math.max(1, n);
      var subCrest = hpRms > 1e-6 ? hpPeak / hpRms : 0;

      var triggeredNow = false;
      var completedNow = false;
      var rearmedNow = false;
      var rearmReason = null;
      var rearmMessage = null;

      var isSibSub = (b3Share >= 0.32 && b1Share < 0.28) || hpZcrHz >= 2300;
      var spcMinRms = Math.max(0.015, noiseFloorRms * 2.2);
      var isSpcSub = hpRms >= spcMinRms && (isSibSub || (b2Share + b3Share >= 0.48) || b3Share >= 0.22 || hpZcrHz >= 1450);

      if (phase === 'listening') {
        calSamples += n;
        var elapsedSec = calSamples / sr;

        if (elapsedSec <= settleSec) {
          // Ignore initial arming beep window so it never inflates noiseFloorRms or self-triggers
        } else if (elapsedSec <= calibrationSec) {
          pushNoiseFloorSample(hpRms, 0.035);
          pushSpeechContext(isSpcSub, isSibSub && hpRms >= 0.015, hpRms);
          writeToRing(subSlice);
        } else {
          var thresh = Math.max(0.020, noiseFloorRms * 3.2);
          var spcCtx = getSpeechContext();
          var isThump = subShare > 0.62;
          var isSpeechCough = b1Share < 0.36 || b2Share > 0.48 || b3Share > 0.26 || hpZcrHz >= 2600;
          var isClickSpike = subCrest > 7.0 && b3Share > 0.14;

          var qualifies = false;
          if (!isThump && !isSpeechCough && !isClickSpike) {
            if (spcCtx.inSpeech) {
              // Ongoing TV/speech guard: require unmistakable high-b1 fart core above speech volume
              var spThresh = Math.max(thresh * 1.4, spcCtx.activeSpeechRms * 1.35);
              qualifies = hpRms >= spThresh && b1Share >= 0.72 && b3Share < 0.09 && hpZcrHz < 800;
            } else {
              qualifies =
                (hpRms >= thresh * 1.75 && b1Share >= 0.42 && subShare <= 0.55) ||
                (hpRms >= thresh && b1Share >= 0.38) ||
                (hpPeak >= Math.max(0.11, noiseFloorRms * 6.0) && b1Share >= 0.44);
            }
          }

          var needHits = spcCtx.inSpeech ? 3 : 2;
          if (qualifies) {
            consecutiveHits++;
          } else {
            consecutiveHits = 0;
            pushNoiseFloorSample(hpRms, 0.040);
          }
          pushSpeechContext(isSpcSub, isSibSub && hpRms >= 0.015, hpRms);

          if (consecutiveHits >= needHits) {
            preSnapshot = readRecentRing(Math.round(sr * preEventSec));
            postChunks = [new Float32Array(subSlice)];
            postSamples = n;
            silentSamples = 0;
            trigAct = 1;
            trigSpc = 0;
            trigSib = 0;
            trigLow = 1;
            trigFartCore = (b1Share >= 0.65 && b3Share < 0.12 && hpZcrHz < 850) ? 1 : 0;
            trigPeakRms = hpRms;
            trigEntrySpcRms = spcCtx.activeSpeechRms;
            phase = 'triggered';
            triggeredNow = true;
          } else {
            writeToRing(subSlice);
          }
        }
      } else if (phase === 'triggered') {
        postChunks.push(new Float32Array(subSlice));
        postSamples += n;
        if (hpRms > trigPeakRms) trigPeakRms = hpRms;

        var bgSilFloor = trigEntrySpcRms > 0.015 ? Math.min(0.08, Math.max(trigEntrySpcRms * 1.15, trigPeakRms * 0.18)) : 0;
        var silThresh = Math.max(0.014, Math.min(0.032, noiseFloorRms * 2.1), bgSilFloor);
        if (hpRms <= silThresh) {
          silentSamples += n;
        } else {
          silentSamples = 0;
        }

        // Peak-gated live speech monitoring (ignores low-level TV bleed behind a loud captured fart)
        var eventGate = Math.max(spcMinRms, trigPeakRms * 0.24);
        if (hpRms >= eventGate) {
          trigAct++;
          if (isSibSub) trigSib++;
          if (isSpcSub) trigSpc++;
          if (b1Share >= 0.58 && b3Share < 0.14 && hpZcrHz < 1000) trigLow++;
          if (b1Share >= 0.65 && b3Share < 0.12 && hpZcrHz < 850) trigFartCore++;
        }
        pushSpeechContext(isSpcSub, isSibSub && hpRms >= 0.015, hpRms);

        var lockedStrongFart = trigFartCore >= 12 && trigPeakRms >= Math.max(0.10, trigEntrySpcRms * 1.4);
        var postSec = postSamples / sr;
        var silentSec = silentSamples / sr;

        if (!lockedStrongFart && ((trigAct >= 10 && trigSib >= 2 && trigLow >= 1) || (trigAct >= 12 && (trigSpc / trigAct) >= 0.50))) {
          for (var li = 0; li < postChunks.length; li++) {
            writeToRing(postChunks[li]);
          }
          preSnapshot = null;
          postChunks = [];
          postSamples = 0;
          silentSamples = 0;
          consecutiveHits = 0;
          trigAct = 0;
          trigSpc = 0;
          trigSib = 0;
          trigLow = 0;
          trigFartCore = 0;
          trigPeakRms = 0;
          trigEntrySpcRms = 0;
          phase = 'listening';
          rearmCount++;
          rearmedNow = true;
          rearmReason = 'speech';
          rearmMessage = 'Filtered speech / TV chatter — Sentry re-armed';
        } else if ((postSec >= minPostEventSec && silentSec >= postSilenceSec) || postSec >= maxPostEventSec) {
          var built = assembleRawSamples();
          var DSP = root.TootApp && root.TootApp.DSP;
          var clipInfo =
            DSP && typeof DSP.autoClipAudio === 'function'
              ? DSP.autoClipAudio(built.rawSamples, sr)
              : { ok: built.rawSamples.length > 0, clipped: built.rawSamples, maxRMS: 0.05 };
          var verdict = autoRearm ? validateCapturedEvent(built.rawSamples, clipInfo, sr) : { valid: true, stats: null };

          if (autoRearm && !verdict.valid) {
            for (var pi = 0; pi < postChunks.length; pi++) {
              writeToRing(postChunks[pi]);
            }
            preSnapshot = null;
            postChunks = [];
            postSamples = 0;
            silentSamples = 0;
            consecutiveHits = 0;
            trigAct = 0;
            trigSpc = 0;
            trigSib = 0;
            trigLow = 0;
            trigFartCore = 0;
            trigPeakRms = 0;
            trigEntrySpcRms = 0;
            phase = 'listening';
            rearmCount++;
            rearmedNow = true;
            rearmReason = verdict.reason;
            rearmMessage = verdict.message;
          } else {
            built.clipInfo = clipInfo;
            built.bandStats = verdict.stats;
            finalize(trackLabel, trackMuted, built);
            completedNow = true;
          }
        }
      }

      return {
        rms: rawRms,
        peak: rawPeak,
        lowRatio: lowRatio,
        subShare: subShare,
        b1Share: b1Share,
        b2Share: b2Share,
        b3Share: b3Share,
        triggeredNow: triggeredNow,
        completedNow: completedNow,
        rearmedNow: rearmedNow,
        rearmReason: rearmReason,
        rearmMessage: rearmMessage
      };
    }

    function pushChunk(chunk, trackLabel, trackMuted) {
      var n = chunk ? chunk.length : 0;
      if (n === 0 || phase === 'completed') {
        return {
          phase: phase,
          rms: 0,
          peak: 0,
          lowRatio: 0,
          subShare: 0,
          b1Share: 0,
          b2Share: 0,
          b3Share: 0,
          noiseFloorRms: noiseFloorRms,
          rearmCount: rearmCount,
          inSpeechContext: getSpeechContext().inSpeech,
          bufferedSec: Math.min(ringSeconds, ringTotalWritten / sr),
          triggeredNow: false,
          completedNow: false,
          rearmedNow: false,
          rearmReason: null,
          rearmMessage: null,
          result: finalizedResult
        };
      }

      var triggeredNow = false;
      var completedNow = false;
      var rearmedNow = false;
      var rearmReason = null;
      var rearmMessage = null;
      var lastRms = 0;
      var lastPeak = 0;
      var lastLowRatio = 0;
      var lastSubShare = 0;
      var lastB1Share = 0;
      var lastB2Share = 0;
      var lastB3Share = 0;

      var pos = 0;
      while (pos < n && phase !== 'completed') {
        var end = pos + subFrameSamples;
        if (n - end < subFrameSamples * 0.4) {
          end = n;
        }
        var subSlice = pos === 0 && end === n ? chunk : chunk.subarray(pos, end);
        var subRes = processSubFrame(subSlice, trackLabel, trackMuted);
        lastRms = subRes.rms;
        lastPeak = subRes.peak;
        lastLowRatio = subRes.lowRatio;
        lastSubShare = subRes.subShare;
        lastB1Share = subRes.b1Share;
        lastB2Share = subRes.b2Share;
        lastB3Share = subRes.b3Share;
        if (subRes.triggeredNow) triggeredNow = true;
        if (subRes.completedNow) completedNow = true;
        if (subRes.rearmedNow) {
          rearmedNow = true;
          rearmReason = subRes.rearmReason;
          rearmMessage = subRes.rearmMessage;
        }
        pos = end;
      }

      return {
        phase: phase,
        rms: lastRms,
        peak: lastPeak,
        lowRatio: lastLowRatio,
        subShare: lastSubShare,
        b1Share: lastB1Share,
        b2Share: lastB2Share,
        b3Share: lastB3Share,
        noiseFloorRms: noiseFloorRms,
        rearmCount: rearmCount,
        inSpeechContext: getSpeechContext().inSpeech,
        bufferedSec: Math.min(ringSeconds, ringTotalWritten / sr),
        triggeredNow: triggeredNow,
        completedNow: completedNow,
        rearmedNow: rearmedNow,
        rearmReason: rearmReason,
        rearmMessage: rearmMessage,
        result: finalizedResult
      };
    }

    return {
      pushChunk: pushChunk,
      finalize: finalize,
      validateCapturedEvent: validateCapturedEvent,
      getSpeechContext: getSpeechContext,
      getPhase: function () { return phase; },
      getNoiseFloor: function () { return noiseFloorRms; },
      getRearmCount: function () { return rearmCount; },
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
    var onRearmed = typeof opts.onRearmed === 'function' ? opts.onRearmed : null;
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
            noiseFloorRms: engine.getNoiseFloor(),
            rearmCount: 0,
            inSpeechContext: false,
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
              state.noiseFloorRms = info.noiseFloorRms;
              state.rearmCount = info.rearmCount;
              state.inSpeechContext = Boolean(info.inSpeechContext);
              if (info.triggeredNow && onDetected) {
                try { onDetected(info); } catch (e) {}
              }
              if (info.rearmedNow && onRearmed) {
                try { onRearmed(info); } catch (e3) {}
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
              state.noiseFloorRms = info.noiseFloorRms;
              state.rearmCount = info.rearmCount;
              state.inSpeechContext = Boolean(info.inSpeechContext);
              if (info.triggeredNow && onDetected) onDetected(info);
              if (info.rearmedNow && onRearmed) onRearmed(info);
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
                elapsedSec: elapsed,
                noiseFloorRms: state.noiseFloorRms,
                rearmCount: state.rearmCount,
                inSpeechContext: state.inSpeechContext
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
