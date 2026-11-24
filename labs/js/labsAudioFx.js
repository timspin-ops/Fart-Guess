(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var BELL_FREQS = [523.25, 659.25, 783.99, 987.77, 1174.66];
  var FINALE_CHORD = [261.63, 523.25, 783.99, 1046.5, 1318.51, 1567.98];

  function getAudioCtx() {
    if (root.TootApp && root.TootApp.Audio && typeof root.TootApp.Audio.ensureContext === 'function') {
      try {
        return root.TootApp.Audio.ensureContext();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    var Ctx = root.AudioContext || root.webkitAudioContext;
    if (!Ctx) return Promise.reject(new Error('Web Audio unavailable'));
    var ctx = new Ctx();
    if (ctx.state === 'suspended') {
      return ctx.resume().then(function () { return ctx; });
    }
    return Promise.resolve(ctx);
  }

  function triggerChimeTone(ctx, freq, startOffset, peakGain, durSec) {
    var t0 = ctx.currentTime + (startOffset || 0);
    var partials = [
      { mult: 1.0, amp: peakGain, decay: durSec, type: 'sine' },
      { mult: 2.0, amp: peakGain * 0.36, decay: durSec * 0.58, type: 'sine' },
      { mult: 3.01, amp: peakGain * 0.14, decay: durSec * 0.34, type: 'sine' }
    ];

    for (var i = 0; i < partials.length; i++) {
      var p = partials[i];
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(freq * p.mult, t0);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, p.amp), t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.08, p.decay));

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + Math.max(0.1, p.decay + 0.04));
    }
  }

  function playBell(index) {
    var idx = Math.max(0, Math.min(BELL_FREQS.length - 1, index || 0));
    var freq = BELL_FREQS[idx];
    return getAudioCtx()
      .then(function (ctx) {
        triggerChimeTone(ctx, freq, 0, 0.15, 0.62);
      })
      .catch(function () {
        // Ignore locked autoplay contexts gracefully
      });
  }

  function playLabTick(stepIndex) {
    var idx = Math.max(0, Number(stepIndex) || 0);
    var freq = Math.min(1180, 440 + idx * 42);
    return getAudioCtx()
      .then(function (ctx) {
        var t0 = ctx.currentTime;
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.032, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.065);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.08);
      })
      .catch(function () {
        // Ignore locked autoplay contexts gracefully
      });
  }

  function playAnalysisComplete() {
    return getAudioCtx()
      .then(function (ctx) {
        triggerChimeTone(ctx, 587.33, 0, 0.055, 0.24);
        triggerChimeTone(ctx, 880.0, 0.08, 0.06, 0.34);
      })
      .catch(function () {
        // Ignore locked autoplay contexts gracefully
      });
  }

  function playAutoDetectStartBeep() {
    return getAudioCtx()
      .then(function (ctx) {
        var t0 = ctx.currentTime;
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.09, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.095);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.105);
      })
      .catch(function () {
        // Ignore locked autoplay contexts gracefully
      });
  }

  function playAutoDetectStopBeep() {
    return getAudioCtx()
      .then(function (ctx) {
        var t0 = ctx.currentTime;
        var notes = [
          { freq: 740.0, offset: 0, dur: 0.075 },
          { freq: 1046.5, offset: 0.082, dur: 0.11 }
        ];
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          var osc = ctx.createOscillator();
          var g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, t0 + n.offset);
          g.gain.setValueAtTime(0.0001, t0 + n.offset);
          g.gain.linearRampToValueAtTime(0.10, t0 + n.offset + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.offset + n.dur);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(t0 + n.offset);
          osc.stop(t0 + n.offset + n.dur + 0.015);
        }
      })
      .catch(function () {
        // Ignore locked autoplay contexts gracefully
      });
  }

  function playLegendaryFinale() {
    return getAudioCtx()
      .then(function (ctx) {
        for (var i = 0; i < FINALE_CHORD.length; i++) {
          var gain = i === 0 ? 0.11 : 0.12 - i * 0.012;
          triggerChimeTone(ctx, FINALE_CHORD[i], i * 0.045, Math.max(0.05, gain), 1.45);
        }
      })
      .catch(function () {
        // Ignore locked autoplay contexts gracefully
      });
  }

  function playVaultDoorOpen() {
    return getAudioCtx()
      .then(function (ctx) {
        var t0 = ctx.currentTime;

        // 1. Airlock latch clunk (0.00s - 0.11s)
        var latchOsc = ctx.createOscillator();
        var latchFilter = ctx.createBiquadFilter();
        var latchGain = ctx.createGain();
        latchOsc.type = 'triangle';
        latchOsc.frequency.setValueAtTime(145, t0);
        latchOsc.frequency.exponentialRampToValueAtTime(48, t0 + 0.11);
        latchFilter.type = 'lowpass';
        latchFilter.frequency.setValueAtTime(420, t0);
        latchGain.gain.setValueAtTime(0.0001, t0);
        latchGain.gain.linearRampToValueAtTime(0.14, t0 + 0.012);
        latchGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        latchOsc.connect(latchFilter);
        latchFilter.connect(latchGain);
        latchGain.connect(ctx.destination);
        latchOsc.start(t0);
        latchOsc.stop(t0 + 0.14);

        // 2. Pneumatic pressure release "shhh" (0.05s - 0.92s)
        var noiseDur = 0.95;
        var noiseLen = Math.max(1, Math.floor(ctx.sampleRate * noiseDur));
        var noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
        var chan = noiseBuf.getChannelData(0);
        for (var i = 0; i < noiseLen; i++) {
          chan[i] = Math.random() * 2 - 1;
        }

        var noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        var steamFilter = ctx.createBiquadFilter();
        steamFilter.type = 'bandpass';
        steamFilter.Q.setValueAtTime(1.65, t0 + 0.05);
        steamFilter.frequency.setValueAtTime(3600, t0 + 0.05);
        steamFilter.frequency.exponentialRampToValueAtTime(1250, t0 + 0.92);

        var steamGain = ctx.createGain();
        steamGain.gain.setValueAtTime(0.0001, t0 + 0.05);
        steamGain.gain.linearRampToValueAtTime(0.15, t0 + 0.095);
        steamGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.90);

        noiseSrc.connect(steamFilter);
        steamFilter.connect(steamGain);
        steamGain.connect(ctx.destination);

        // Faint high-frequency air tail
        var airSrc = ctx.createBufferSource();
        airSrc.buffer = noiseBuf;
        var airFilter = ctx.createBiquadFilter();
        airFilter.type = 'highpass';
        airFilter.frequency.setValueAtTime(1800, t0 + 0.05);
        var airGain = ctx.createGain();
        airGain.gain.setValueAtTime(0.0001, t0 + 0.05);
        airGain.gain.linearRampToValueAtTime(0.04, t0 + 0.10);
        airGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.92);
        airSrc.connect(airFilter);
        airFilter.connect(airGain);
        airGain.connect(ctx.destination);

        noiseSrc.start(t0 + 0.05);
        noiseSrc.stop(t0 + 0.95);
        airSrc.start(t0 + 0.05);
        airSrc.stop(t0 + 0.95);

        // 3. Heavy sliding door hum (0.16s - 0.88s)
        var slideOsc = ctx.createOscillator();
        var slideGain = ctx.createGain();
        slideOsc.type = 'sine';
        slideOsc.frequency.setValueAtTime(62, t0 + 0.16);
        slideOsc.frequency.exponentialRampToValueAtTime(46, t0 + 0.88);
        slideGain.gain.setValueAtTime(0.0001, t0 + 0.16);
        slideGain.gain.linearRampToValueAtTime(0.035, t0 + 0.25);
        slideGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.88);
        slideOsc.connect(slideGain);
        slideGain.connect(ctx.destination);
        slideOsc.start(t0 + 0.16);
        slideOsc.stop(t0 + 0.90);
      })
      .catch(function () {
        // Ignore locked autoplay contexts gracefully
      });
  }

  function launchConfetti(canvasEl) {
    if (!canvasEl || typeof canvasEl.getContext !== 'function') {
      return { stop: function () {} };
    }

    var ctx = canvasEl.getContext('2d');
    var colors = ['#22C55E', '#F97316', '#60A5FA', '#8B5CF6', '#FACC15', '#FFFFFF'];
    var particles = [];
    var rafId = null;
    var stopped = false;

    function resizeCanvas() {
      var w = root.innerWidth || canvasEl.clientWidth || 390;
      var h = root.innerHeight || canvasEl.clientHeight || 844;
      var dpr = Math.min(2, root.devicePixelRatio || 1);
      canvasEl.width = Math.round(w * dpr);
      canvasEl.height = Math.round(h * dpr);
      canvasEl.style.width = w + 'px';
      canvasEl.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: w, h: h };
    }

    var dims = resizeCanvas();
    for (var i = 0; i < 130; i++) {
      var fromLeft = i % 2 === 0;
      var originX = fromLeft ? dims.w * 0.22 : dims.w * 0.78;
      var originY = dims.h * 0.34;
      var angle = fromLeft
        ? -Math.PI * 0.55 + (Math.random() - 0.35) * 0.95
        : -Math.PI * 0.45 + (Math.random() - 0.65) * 0.95;
      var speed = 4.2 + Math.random() * 8.5;
      particles.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 28,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0,
        size: 5 + Math.random() * 7,
        aspect: 0.45 + Math.random() * 0.55,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.24,
        color: colors[i % colors.length],
        glow: i % 5 === 0,
        alpha: 1,
        life: 0,
        maxLife: 135 + Math.random() * 70
      });
    }

    function step() {
      if (stopped) return;
      var curW = root.innerWidth || dims.w;
      var curH = root.innerHeight || dims.h;
      ctx.clearRect(0, 0, curW, curH);

      var alive = 0;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.life++;
        if (p.life > p.maxLife || p.y > curH + 40) continue;
        alive++;

        p.vy += 0.22;
        p.vx *= 0.986;
        p.vy *= 0.986;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        var fadeStart = p.maxLife * 0.68;
        p.alpha = p.life > fadeStart ? Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart)) : 1;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
        }
        var rw = p.size;
        var rh = Math.max(2.5, p.size * p.aspect * Math.abs(Math.cos(p.life * 0.14)));
        ctx.fillRect(-rw * 0.5, -rh * 0.5, rw, rh);
        ctx.restore();
      }

      if (alive > 0) {
        rafId = requestAnimationFrame(step);
      } else {
        ctx.clearRect(0, 0, curW, curH);
        stopped = true;
      }
    }

    rafId = requestAnimationFrame(step);

    return {
      stop: function () {
        stopped = true;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        try {
          ctx.clearRect(0, 0, dims.w + 400, dims.h + 400);
        } catch (e) {}
      }
    };
  }

  TootLabs.AudioFx = {
    playBell: playBell,
    playLabTick: playLabTick,
    playAnalysisComplete: playAnalysisComplete,
    playAutoDetectStartBeep: playAutoDetectStartBeep,
    playAutoDetectStopBeep: playAutoDetectStopBeep,
    playLegendaryFinale: playLegendaryFinale,
    playVaultDoorOpen: playVaultDoorOpen,
    launchConfetti: launchConfetti
  };
})(typeof window !== 'undefined' ? window : globalThis);
