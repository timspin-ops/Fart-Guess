(function (root) {
  'use strict';

  var TootTestLab = (root.TootTestLab = root.TootTestLab || {});

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /**
   * Encode mono Float32Array samples into an ArrayBuffer containing 16-bit PCM RIFF/WAVE.
   */
  function encodeWavBuffer(samples, sampleRate) {
    var sr = Math.max(8000, Math.round(Number(sampleRate) || 44100));
    var arr = samples && samples.length ? samples : new Float32Array(0);
    var numSamples = arr.length;
    var buffer = new ArrayBuffer(44 + numSamples * 2);
    var view = new DataView(buffer);

    function writeStr(off, s) {
      for (var i = 0; i < s.length; i++) {
        view.setUint8(off + i, s.charCodeAt(i));
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

    var off = 44;
    for (var i = 0; i < numSamples; i++) {
      var v = arr[i];
      if (!Number.isFinite(v)) v = 0;
      v = v < -1 ? -1 : v > 1 ? 1 : v;
      view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
    return buffer;
  }

  function encodeWavBlob(samples, sampleRate) {
    return new Blob([encodeWavBuffer(samples, sampleRate)], { type: 'audio/wav' });
  }

  function encodeWavBase64(samples, sampleRate) {
    var buf = encodeWavBuffer(samples, sampleRate);
    var bytes = new Uint8Array(buf);
    var chunkSize = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunkSize) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(bytes.length, i + chunkSize))));
    }
    return btoa(parts.join(''));
  }

  function createEngine(opts) {
    opts = opts || {};
    var onEnded = typeof opts.onEnded === 'function' ? opts.onEnded : null;

    var ctx = null;
    var masterGain = null;

    var samples = new Float32Array(0);
    var srcSampleRate = 44100;
    var durationSec = 0;

    // Cached Web Audio native buffers (lazily built once per loaded specimen)
    var bufferedSamplesRef = null;
    var forwardAudioBuf = null;
    var reverseAudioBuf = null;

    // Native transport state
    var activeSrc = null;
    var activeSrcGain = null;
    var activeDir = 1;
    var srcGen = 0;
    var playAnchorCtxTime = 0;
    var playAnchorNorm = 0;
    var playAnchorRate = 1.0;

    // Shared playback / scrub state (also updates cleanly in headless / pre-unlock contexts)
    var playing = false;
    var scrubbing = false;
    var loop = true;
    var rate = 1.0;
    var normPos = 0;
    var targetNormPos = 0;
    var velocity = 0;
    var lastTickMs = 0;
    var lastGestureMs = 0;
    var lastGrainMs = 0;
    var resumeAfterScrub = false;

    function getOrCreateContext() {
      if (ctx && ctx.state === 'closed') {
        ctx = null;
        masterGain = null;
        forwardAudioBuf = null;
        reverseAudioBuf = null;
        bufferedSamplesRef = null;
      }
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.95;
        masterGain.connect(ctx.destination);
      }
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
        try {
          var rp = ctx.resume();
          if (rp && typeof rp.catch === 'function') rp.catch(function () {});
        } catch (e) {}
      }
      return ctx;
    }

    function ensureAudioBuffers(audioCtx) {
      if (!audioCtx || !samples || samples.length === 0) return false;
      if (bufferedSamplesRef === samples && forwardAudioBuf && reverseAudioBuf) return true;
      try {
        var len = samples.length;
        var fwd = audioCtx.createBuffer(1, len, clamp(Math.round(srcSampleRate), 8000, 192000));
        fwd.getChannelData(0).set(samples);

        var rev = audioCtx.createBuffer(1, len, clamp(Math.round(srcSampleRate), 8000, 192000));
        var revData = rev.getChannelData(0);
        for (var i = 0; i < len; i++) {
          revData[i] = samples[len - 1 - i];
        }

        forwardAudioBuf = fwd;
        reverseAudioBuf = rev;
        bufferedSamplesRef = samples;
        return true;
      } catch (e) {
        return false;
      }
    }

    function stopActiveSource(fadeSec) {
      srcGen++;
      var s = activeSrc;
      var g = activeSrcGain;
      activeSrc = null;
      activeSrcGain = null;
      if (!s) return;
      try {
        s.onended = null;
        if (g && ctx) {
          var t0 = ctx.currentTime;
          var fd = typeof fadeSec === 'number' ? fadeSec : 0.006;
          g.gain.cancelScheduledValues(t0);
          g.gain.setValueAtTime(Math.max(0.0001, g.gain.value || 1), t0);
          g.gain.linearRampToValueAtTime(0.0001, t0 + fd);
          s.stop(t0 + fd + 0.004);
        } else {
          s.stop();
        }
      } catch (e) {
        try { s.stop(); } catch (e2) {}
      }
      if (g) {
        setTimeout(function () {
          try { s.disconnect(); } catch (e3) {}
          try { g.disconnect(); } catch (e4) {}
        }, 45);
      }
    }

    function startNativeSource() {
      var audioCtx = getOrCreateContext();
      if (!audioCtx || !ensureAudioBuffers(audioCtx)) return false;
      if (Math.abs(rate) < 0.08 || durationSec <= 0) return false;

      stopActiveSource(0.005);

      var dir = rate < 0 ? -1 : 1;
      var absRate = clamp(Math.abs(rate), 0.1, 2.5);
      var buf = dir >= 0 ? forwardAudioBuf : reverseAudioBuf;
      var offset = dir >= 0
        ? clamp(normPos, 0, 0.998) * durationSec
        : clamp(1 - normPos, 0, 0.998) * durationSec;
      var safeOffset = clamp(offset, 0, Math.max(0, buf.duration - 0.004));

      var src = audioCtx.createBufferSource();
      src.buffer = buf;
      src.loop = Boolean(loop);
      src.playbackRate.value = absRate;

      var g = audioCtx.createGain();
      var t0 = audioCtx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(1.0, t0 + 0.006);

      src.connect(g);
      g.connect(masterGain);

      var myGen = srcGen;
      src.onended = function () {
        if (myGen !== srcGen) return;
        activeSrc = null;
        activeSrcGain = null;
        if (playing && !loop) {
          playing = false;
          velocity = 0;
          normPos = dir >= 0 ? 1 : 0;
          targetNormPos = normPos;
          if (onEnded) onEnded();
        }
      };

      try {
        src.start(t0, safeOffset);
      } catch (e) {
        return false;
      }

      activeSrc = src;
      activeSrcGain = g;
      activeDir = dir;
      playAnchorCtxTime = audioCtx.currentTime;
      playAnchorNorm = normPos;
      playAnchorRate = rate;
      return true;
    }

    function spawnScrubGrain(posNorm, vel) {
      var audioCtx = getOrCreateContext();
      if (!audioCtx || audioCtx.state !== 'running' || !ensureAudioBuffers(audioCtx)) return;
      if (durationSec <= 0) return;

      var dir = vel < 0 ? -1 : 1;
      var buf = dir >= 0 ? forwardAudioBuf : reverseAudioBuf;
      var absRate = clamp(Math.abs(vel), 0.45, 2.2);
      var offset = dir >= 0
        ? clamp(posNorm, 0, 0.992) * durationSec
        : clamp(1 - posNorm, 0, 0.992) * durationSec;
      var safeOffset = clamp(offset, 0, Math.max(0, buf.duration - 0.015));

      try {
        var src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = absRate;

        var g = audioCtx.createGain();
        var t0 = audioCtx.currentTime;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.85, t0 + 0.020);
        g.gain.setValueAtTime(0.85, t0 + 0.045);
        g.gain.linearRampToValueAtTime(0.0001, t0 + 0.085);

        src.connect(g);
        g.connect(masterGain);
        src.start(t0, safeOffset, 0.095);
        src.stop(t0 + 0.090);
        setTimeout(function () {
          try { src.disconnect(); } catch (e) {}
          try { g.disconnect(); } catch (e2) {}
        }, 140);
      } catch (e3) {}
    }

    function syncClockStep() {
      var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (!lastTickMs) {
        lastTickMs = now;
        return;
      }
      var dt = Math.min(0.12, Math.max(0.001, (now - lastTickMs) / 1000));
      lastTickMs = now;
      if (durationSec <= 0 || samples.length === 0) return;

      var audioRunning = Boolean(activeSrc && ctx && ctx.state === 'running');

      if (scrubbing) {
        normPos = clamp(normPos + (targetNormPos - normPos) * 0.65, 0, 1);
        if (now - lastGestureMs > 280) {
          velocity *= 0.78;
          if (Math.abs(velocity) < 0.02) velocity = 0;
        }
      } else if (playing) {
        if (audioRunning) {
          var elapsed = Math.max(0, ctx.currentTime - playAnchorCtxTime);
          var rawNorm = playAnchorNorm + (elapsed * playAnchorRate) / durationSec;
          if (loop) {
            normPos = ((rawNorm % 1) + 1) % 1;
          } else {
            normPos = clamp(rawNorm, 0, 1);
          }
          velocity = rate;
        } else {
          // Smooth wall-clock fallback when AudioContext is suspended/headless
          normPos += (rate * dt) / durationSec;
          velocity = rate;
          if (normPos >= 1) {
            if (loop) normPos = normPos - 1;
            else {
              normPos = 1;
              playing = false;
              velocity = 0;
              if (onEnded) onEnded();
            }
          } else if (normPos <= 0 && rate < 0) {
            if (loop) normPos = 1 + normPos;
            else {
              normPos = 0;
              playing = false;
              velocity = 0;
              if (onEnded) onEnded();
            }
          }
        }
      } else {
        velocity *= 0.72;
        if (Math.abs(velocity) < 0.01) velocity = 0;
      }
    }

    function loadBuffer(float32Samples, sampleRate) {
      stopActiveSource(0.004);
      samples = float32Samples instanceof Float32Array ? float32Samples : new Float32Array(float32Samples || 0);
      srcSampleRate = Math.max(8000, Number(sampleRate) || 44100);
      durationSec = samples.length / srcSampleRate;
      bufferedSamplesRef = null;
      forwardAudioBuf = null;
      reverseAudioBuf = null;
      playing = false;
      scrubbing = false;
      normPos = 0;
      targetNormPos = 0;
      velocity = 0;
      lastTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    function beginScrub(startNormPos) {
      if (samples.length === 0) return;
      getOrCreateContext();
      var p = clamp(typeof startNormPos === 'number' ? startNormPos : normPos, 0, 1);
      resumeAfterScrub = playing;
      if (playing) {
        stopActiveSource(0.005);
        playing = false;
      }
      scrubbing = true;
      normPos = p;
      targetNormPos = p;
      lastTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    function moveScrub(nextNormPos) {
      if (samples.length === 0) return;
      if (!scrubbing) beginScrub(nextNormPos);
      var prev = targetNormPos;
      var p = clamp(Number(nextNormPos) || 0, 0, 1);
      targetNormPos = p;
      normPos = p;
      var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      var dt = Math.max(0.008, (now - (lastTickMs || now)) / 1000);
      lastTickMs = now;
      var delta = p - prev;
      if (durationSec > 0 && Math.abs(delta) > 0.0002) {
        velocity = clamp((delta * durationSec) / dt, -3.2, 3.2);
        lastGestureMs = now;
        if (Math.abs(delta) > 0.0008 && now - lastGrainMs >= 42) {
          lastGrainMs = now;
          spawnScrubGrain(p, velocity);
        }
      }
    }

    function nudgeByDeltaNorm(deltaNorm) {
      var cur = scrubbing ? targetNormPos : normPos;
      var next = clamp(cur + deltaNorm, 0, 1);
      if (!scrubbing) beginScrub(cur);
      moveScrub(next);
      return next;
    }

    function endScrub() {
      if (!scrubbing) return;
      scrubbing = false;
      if (resumeAfterScrub && Math.abs(rate) >= 0.08) {
        play(rate, loop);
      } else {
        playing = false;
        velocity = 0;
      }
    }

    function play(customRate, customLoop) {
      if (samples.length === 0) return;
      if (typeof customRate === 'number' && Number.isFinite(customRate)) rate = clamp(customRate, -2.5, 2.5);
      if (Math.abs(rate) < 0.08) rate = 1.0;
      if (typeof customLoop === 'boolean') loop = customLoop;
      if (rate >= 0 && normPos >= 0.995) normPos = 0;
      else if (rate < 0 && normPos <= 0.005) normPos = 1;
      targetNormPos = normPos;
      scrubbing = false;
      playing = true;
      velocity = rate;
      lastTickMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      playAnchorNorm = normPos;
      playAnchorRate = rate;
      var c = getOrCreateContext();
      playAnchorCtxTime = c ? c.currentTime : 0;
      startNativeSource();
    }

    function pause() {
      syncClockStep();
      playing = false;
      scrubbing = false;
      velocity = 0;
      stopActiveSource(0.006);
    }

    function stop() {
      playing = false;
      scrubbing = false;
      normPos = 0;
      targetNormPos = 0;
      velocity = 0;
      stopActiveSource(0.006);
    }

    function setRate(nextRate, nextLoop) {
      syncClockStep();
      if (typeof nextRate === 'number' && Number.isFinite(nextRate)) {
        rate = clamp(nextRate, -2.5, 2.5);
      }
      if (typeof nextLoop === 'boolean') {
        loop = nextLoop;
      }
      if (!playing) {
        return;
      }
      if (Math.abs(rate) < 0.08) {
        pause();
        return;
      }
      var nextDir = rate < 0 ? -1 : 1;
      velocity = rate;
      if (nextDir !== activeDir || !activeSrc) {
        startNativeSource();
      } else if (ctx && ctx.state === 'running') {
        playAnchorNorm = normPos;
        playAnchorCtxTime = ctx.currentTime;
        playAnchorRate = rate;
        activeSrc.loop = Boolean(loop);
        try {
          activeSrc.playbackRate.setTargetAtTime(Math.abs(rate), ctx.currentTime, 0.015);
        } catch (e) {
          activeSrc.playbackRate.value = Math.abs(rate);
        }
      }
    }

    function seekNorm(p) {
      normPos = clamp(Number(p) || 0, 0, 1);
      targetNormPos = normPos;
      if (playing) {
        startNativeSource();
      }
    }

    function getState() {
      syncClockStep();
      return {
        playing: playing,
        scrubbing: scrubbing,
        loop: loop,
        rate: rate,
        normPos: normPos,
        targetNormPos: targetNormPos,
        velocity: velocity,
        durationSec: durationSec,
        sampleRate: srcSampleRate,
        currentSec: normPos * durationSec,
        sampleCount: samples.length
      };
    }

    function getWindowAroundPlayhead(windowSec) {
      if (!samples || samples.length === 0) return new Float32Array(0);
      var winLen = Math.min(samples.length, Math.max(256, Math.round((windowSec || 0.25) * srcSampleRate)));
      var center = Math.round(normPos * Math.max(0, samples.length - 1));
      var half = Math.floor(winLen / 2);
      var start = clamp(center - half, 0, Math.max(0, samples.length - winLen));
      var end = Math.min(samples.length, start + winLen);
      return samples.subarray(start, end);
    }

    return {
      loadBuffer: loadBuffer,
      beginScrub: beginScrub,
      moveScrub: moveScrub,
      nudgeByDeltaNorm: nudgeByDeltaNorm,
      endScrub: endScrub,
      play: play,
      pause: pause,
      stop: stop,
      setRate: setRate,
      seekNorm: seekNorm,
      getState: getState,
      getWindowAroundPlayhead: getWindowAroundPlayhead
    };
  }

  TootTestLab.VinylScrub = {
    create: createEngine,
    encodeWavBuffer: encodeWavBuffer,
    encodeWavBlob: encodeWavBlob,
    encodeWavBase64: encodeWavBase64
  };
})(typeof window !== 'undefined' ? window : globalThis);
