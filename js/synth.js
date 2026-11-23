(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  var SAMPLE_RATE = 44100;
  var cachedSounds = null;
  var pendingPromise = null;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createNoiseBuffer(ctx, durationSec, seed) {
    var len = Math.max(1, Math.ceil(durationSec * ctx.sampleRate));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    var rand = mulberry32(seed);
    for (var i = 0; i < len; i++) {
      data[i] = rand() * 2 - 1;
    }
    return buf;
  }

  function makeTanhCurve(drive) {
    var n = 1024;
    var curve = new Float32Array(n);
    var k = drive || 3.2;
    for (var i = 0; i < n; i++) {
      var x = (i * 2) / (n - 1) - 1;
      curve[i] = Math.tanh(x * k);
    }
    return curve;
  }

  function createOffline(durationSec) {
    var OfflineCtx = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    var length = Math.ceil(durationSec * SAMPLE_RATE);
    return new OfflineCtx(1, length, SAMPLE_RATE);
  }

  function addNoiseLayer(ctx, dest, durationSec, seed, centerHz, q, gainCurve) {
    var src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, durationSec, seed);

    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = centerHz;
    bp.Q.value = q;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, 0);
    gainCurve(g.gain);

    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(0);
    src.stop(durationSec);
  }

  var SOUND_SPECS = [
    {
      id: 'squeaker',
      name: 'Mouse Squeaker',
      emoji: '🐭',
      description: 'Tight high-pitched squeak with a cheeky pitch bend.',
      duration: 0.48,
      render: function (ctx) {
        var dur = 0.48;
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, 0);
        osc.frequency.exponentialRampToValueAtTime(480, 0.22);
        osc.frequency.exponentialRampToValueAtTime(360, 0.45);

        // Subtle jitter LFO
        var lfo = ctx.createOscillator();
        lfo.frequency.value = 34;
        var lfoG = ctx.createGain();
        lfoG.gain.value = 18;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(2.6);

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(620, 0);
        bp.frequency.exponentialRampToValueAtTime(1150, 0.25);
        bp.Q.value = 1.9;

        var amp = ctx.createGain();
        amp.gain.setValueAtTime(0.001, 0);
        amp.gain.linearRampToValueAtTime(0.85, 0.04);
        amp.gain.setValueAtTime(0.75, 0.32);
        amp.gain.exponentialRampToValueAtTime(0.001, dur - 0.01);

        osc.connect(shaper);
        shaper.connect(bp);
        bp.connect(amp);
        amp.connect(ctx.destination);

        addNoiseLayer(ctx, ctx.destination, dur, 101, 1400, 1.4, function (g) {
          g.linearRampToValueAtTime(0.22, 0.05);
          g.exponentialRampToValueAtTime(0.001, dur - 0.02);
        });

        osc.start(0);
        lfo.start(0);
        osc.stop(dur);
        lfo.stop(dur);
      }
    },
    {
      id: 'tuba_blast',
      name: 'Tuba Blast',
      emoji: '🎺',
      description: 'Deep, booming brassy rumble that shakes the cushions.',
      duration: 1.25,
      render: function (ctx) {
        var dur = 1.25;
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(72, 0);
        osc.frequency.linearRampToValueAtTime(60, 0.45);
        osc.frequency.linearRampToValueAtTime(52, 1.15);

        var sub = ctx.createOscillator();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(72, 0);
        sub.frequency.linearRampToValueAtTime(52, 1.15);

        // Flutter AM & FM
        var lfo = ctx.createOscillator();
        lfo.frequency.value = 14;
        var lfoFreqG = ctx.createGain();
        lfoFreqG.gain.value = 4.5;
        lfo.connect(lfoFreqG);
        lfoFreqG.connect(osc.frequency);

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(4.2);

        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(420, 0);
        lp.frequency.linearRampToValueAtTime(290, 1.1);
        lp.Q.value = 3.2;

        var formant = ctx.createBiquadFilter();
        formant.type = 'peaking';
        formant.frequency.value = 210;
        formant.gain.value = 7;

        var amp = ctx.createGain();
        amp.gain.setValueAtTime(0.001, 0);
        amp.gain.linearRampToValueAtTime(0.92, 0.05);
        amp.gain.setValueAtTime(0.84, 0.85);
        amp.gain.exponentialRampToValueAtTime(0.001, dur - 0.02);

        osc.connect(shaper);
        sub.connect(shaper);
        shaper.connect(lp);
        lp.connect(formant);
        formant.connect(amp);
        amp.connect(ctx.destination);

        addNoiseLayer(ctx, ctx.destination, dur, 202, 350, 0.9, function (g) {
          g.linearRampToValueAtTime(0.24, 0.06);
          g.exponentialRampToValueAtTime(0.001, dur - 0.03);
        });

        osc.start(0);
        sub.start(0);
        lfo.start(0);
        osc.stop(dur);
        sub.stop(dur);
        lfo.stop(dur);
      }
    },
    {
      id: 'bubbly_stutter',
      name: 'Bubbly Stutter',
      emoji: '🫧',
      description: 'Six bouncy, resonant staccato bubble pops in a row.',
      duration: 1.18,
      render: function (ctx) {
        var dur = 1.18;
        var times = [0.02, 0.21, 0.39, 0.58, 0.77, 0.96];
        var pitches = [125, 148, 132, 165, 142, 188];

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(3.4);
        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 360;
        bp.Q.value = 2.8;
        shaper.connect(bp);
        bp.connect(ctx.destination);

        for (var i = 0; i < times.length; i++) {
          var t0 = times[i];
          var p0 = pitches[i];
          var osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(p0, t0);
          osc.frequency.exponentialRampToValueAtTime(p0 * 1.38, t0 + 0.09);

          var g = ctx.createGain();
          g.gain.setValueAtTime(0.001, t0);
          g.gain.linearRampToValueAtTime(0.88, t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);

          osc.connect(g);
          g.connect(shaper);
          osc.start(t0);
          osc.stop(t0 + 0.14);
        }

        addNoiseLayer(ctx, ctx.destination, dur, 303, 520, 1.8, function (g) {
          for (var j = 0; j < times.length; j++) {
            g.setValueAtTime(0.001, times[j]);
            g.linearRampToValueAtTime(0.18, times[j] + 0.02);
            g.exponentialRampToValueAtTime(0.001, times[j] + 0.11);
          }
        });
      }
    },
    {
      id: 'question_mark',
      name: 'Question Mark?',
      emoji: '❓',
      description: 'Starts low and dubious, then swoops upward as if asking a question.',
      duration: 0.78,
      render: function (ctx) {
        var dur = 0.78;
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, 0);
        osc.frequency.setValueAtTime(98, 0.25);
        osc.frequency.exponentialRampToValueAtTime(340, 0.70);

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(3.0);

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(260, 0);
        bp.frequency.exponentialRampToValueAtTime(840, 0.72);
        bp.Q.value = 1.6;

        var amp = ctx.createGain();
        amp.gain.setValueAtTime(0.001, 0);
        amp.gain.linearRampToValueAtTime(0.86, 0.05);
        amp.gain.setValueAtTime(0.82, 0.56);
        amp.gain.exponentialRampToValueAtTime(0.001, dur - 0.02);

        osc.connect(shaper);
        shaper.connect(bp);
        bp.connect(amp);
        amp.connect(ctx.destination);

        addNoiseLayer(ctx, ctx.destination, dur, 404, 700, 1.2, function (g) {
          g.linearRampToValueAtTime(0.20, 0.08);
          g.exponentialRampToValueAtTime(0.001, dur - 0.02);
        });

        osc.start(0);
        osc.stop(dur);
      }
    },
    {
      id: 'trombone_deflate',
      name: 'Deflating Balloon',
      emoji: '🎈',
      description: 'High frantic screech sputtering lazily down into a low sad flop.',
      duration: 1.35,
      render: function (ctx) {
        var dur = 1.35;
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(325, 0);
        osc.frequency.exponentialRampToValueAtTime(160, 0.55);
        osc.frequency.exponentialRampToValueAtTime(64, 1.28);

        var lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(28, 0);
        lfo.frequency.linearRampToValueAtTime(10, 1.25);
        var lfoG = ctx.createGain();
        lfoG.gain.value = 14;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(3.4);

        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1400, 0);
        lp.frequency.exponentialRampToValueAtTime(280, 1.25);
        lp.Q.value = 2.4;

        var amp = ctx.createGain();
        amp.gain.setValueAtTime(0.001, 0);
        amp.gain.linearRampToValueAtTime(0.85, 0.04);
        amp.gain.setValueAtTime(0.75, 0.95);
        amp.gain.exponentialRampToValueAtTime(0.001, dur - 0.02);

        osc.connect(shaper);
        shaper.connect(lp);
        lp.connect(amp);
        amp.connect(ctx.destination);

        addNoiseLayer(ctx, ctx.destination, dur, 505, 900, 1.0, function (g) {
          g.linearRampToValueAtTime(0.24, 0.06);
          g.exponentialRampToValueAtTime(0.001, dur - 0.02);
        });

        osc.start(0);
        lfo.start(0);
        osc.stop(dur);
        lfo.stop(dur);
      }
    },
    {
      id: 'machine_gun',
      name: 'The Jackhammer',
      emoji: '🥁',
      description: 'Rapid-fire ~18 Hz cheek-flapping staccato rattle.',
      duration: 1.06,
      render: function (ctx) {
        var dur = 1.06;
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(118, 0);
        osc.frequency.linearRampToValueAtTime(98, 1.0);

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(4.0);

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 340;
        bp.Q.value = 1.4;

        // 18 Hz square-ish amplitude chopper
        var modAmp = ctx.createGain();
        modAmp.gain.value = 0.5;
        var lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 18;
        var lfoDepth = ctx.createGain();
        lfoDepth.gain.value = 0.45;
        lfo.connect(lfoDepth);
        lfoDepth.connect(modAmp.gain);

        var masterEnv = ctx.createGain();
        masterEnv.gain.setValueAtTime(0.001, 0);
        masterEnv.gain.linearRampToValueAtTime(0.95, 0.03);
        masterEnv.gain.setValueAtTime(0.88, 0.90);
        masterEnv.gain.exponentialRampToValueAtTime(0.001, dur - 0.02);

        osc.connect(shaper);
        shaper.connect(bp);
        bp.connect(modAmp);
        modAmp.connect(masterEnv);
        masterEnv.connect(ctx.destination);

        addNoiseLayer(ctx, modAmp, dur, 606, 650, 1.1, function (g) {
          g.linearRampToValueAtTime(0.32, 0.04);
          g.setValueAtTime(0.28, 0.9);
          g.exponentialRampToValueAtTime(0.001, dur - 0.02);
        });

        osc.start(0);
        lfo.start(0);
        osc.stop(dur);
        lfo.stop(dur);
      }
    },
    {
      id: 'stealth_hiss',
      name: 'Steam Leak',
      emoji: '💨',
      description: 'Sneaky, airy hissing pressure release with barely a whisper of buzz.',
      duration: 0.96,
      render: function (ctx) {
        var dur = 0.96;

        // Subtle soft hum beneath heavy filtered air
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(112, 0);
        osc.frequency.linearRampToValueAtTime(104, 0.9);

        var humG = ctx.createGain();
        humG.gain.setValueAtTime(0.001, 0);
        humG.gain.linearRampToValueAtTime(0.16, 0.08);
        humG.gain.exponentialRampToValueAtTime(0.001, dur - 0.02);
        osc.connect(humG);
        humG.connect(ctx.destination);

        // Primary high-passed / band-passed hiss
        var src = ctx.createBufferSource();
        src.buffer = createNoiseBuffer(ctx, dur, 707);

        var hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 650;

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1750, 0);
        bp.frequency.linearRampToValueAtTime(1250, 0.88);
        bp.Q.value = 0.9;

        var amp = ctx.createGain();
        amp.gain.setValueAtTime(0.001, 0);
        amp.gain.linearRampToValueAtTime(0.95, 0.09);
        amp.gain.setValueAtTime(0.78, 0.65);
        amp.gain.exponentialRampToValueAtTime(0.001, dur - 0.02);

        src.connect(hp);
        hp.connect(bp);
        bp.connect(amp);
        amp.connect(ctx.destination);

        osc.start(0);
        src.start(0);
        osc.stop(dur);
        src.stop(dur);
      }
    },
    {
      id: 'double_tap',
      name: 'The Double Tap',
      emoji: '✌️',
      description: 'A punchy low puff, a suspicious pause, then a cheeky high squeak.',
      duration: 0.80,
      render: function (ctx) {
        // Puff 1 (0.02 -> 0.24)
        var osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(92, 0.02);
        osc1.frequency.exponentialRampToValueAtTime(76, 0.23);

        var shaper1 = ctx.createWaveShaper();
        shaper1.curve = makeTanhCurve(3.6);
        var lp1 = ctx.createBiquadFilter();
        lp1.type = 'lowpass';
        lp1.frequency.value = 380;
        var g1 = ctx.createGain();
        g1.gain.setValueAtTime(0.001, 0.02);
        g1.gain.linearRampToValueAtTime(0.9, 0.05);
        g1.gain.exponentialRampToValueAtTime(0.001, 0.23);

        osc1.connect(shaper1);
        shaper1.connect(lp1);
        lp1.connect(g1);
        g1.connect(ctx.destination);

        // 180ms silence gap (0.24 -> 0.42), then Puff 2 (0.42 -> 0.76)
        var osc2 = ctx.createOscillator();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(215, 0.42);
        osc2.frequency.exponentialRampToValueAtTime(305, 0.68);

        var shaper2 = ctx.createWaveShaper();
        shaper2.curve = makeTanhCurve(3.0);
        var bp2 = ctx.createBiquadFilter();
        bp2.type = 'bandpass';
        bp2.frequency.value = 560;
        bp2.Q.value = 1.5;
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.001, 0.42);
        g2.gain.linearRampToValueAtTime(0.88, 0.45);
        g2.gain.exponentialRampToValueAtTime(0.001, 0.76);

        osc2.connect(shaper2);
        shaper2.connect(bp2);
        bp2.connect(g2);
        g2.connect(ctx.destination);

        addNoiseLayer(ctx, ctx.destination, 0.80, 808, 480, 1.2, function (g) {
          g.setValueAtTime(0.001, 0.02);
          g.linearRampToValueAtTime(0.22, 0.05);
          g.exponentialRampToValueAtTime(0.001, 0.22);
          g.setValueAtTime(0.001, 0.42);
          g.linearRampToValueAtTime(0.22, 0.46);
          g.exponentialRampToValueAtTime(0.001, 0.75);
        });

        osc1.start(0.02);
        osc1.stop(0.24);
        osc2.start(0.42);
        osc2.stop(0.77);
      }
    },
    {
      id: 'wet_raspy',
      name: 'Swamp Monster',
      emoji: '🐸',
      description: 'Chaotic wet FM/AM growl with soggy resonant crackle.',
      duration: 0.98,
      render: function (ctx) {
        var dur = 0.98;
        var carrier = ctx.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(84, 0);
        carrier.frequency.linearRampToValueAtTime(66, 0.9);

        // Dual FM modulators for wet chaotic wobble
        var mod1 = ctx.createOscillator();
        mod1.type = 'triangle';
        mod1.frequency.value = 23;
        var mod1G = ctx.createGain();
        mod1G.gain.value = 34;
        mod1.connect(mod1G);
        mod1G.connect(carrier.frequency);

        var mod2 = ctx.createOscillator();
        mod2.type = 'sine';
        mod2.frequency.value = 11.5;
        var mod2G = ctx.createGain();
        mod2G.gain.value = 16;
        mod2.connect(mod2G);
        mod2G.connect(carrier.frequency);

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(4.6);

        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(290, 0);
        bp.frequency.linearRampToValueAtTime(430, 0.45);
        bp.frequency.linearRampToValueAtTime(220, 0.9);
        bp.Q.value = 3.5;

        var amGain = ctx.createGain();
        amGain.gain.value = 0.65;
        var amLfo = ctx.createOscillator();
        amLfo.frequency.value = 26;
        var amDepth = ctx.createGain();
        amDepth.gain.value = 0.32;
        amLfo.connect(amDepth);
        amDepth.connect(amGain.gain);

        var amp = ctx.createGain();
        amp.gain.setValueAtTime(0.001, 0);
        amp.gain.linearRampToValueAtTime(0.95, 0.04);
        amp.gain.setValueAtTime(0.86, 0.72);
        amp.gain.exponentialRampToValueAtTime(0.001, dur - 0.02);

        carrier.connect(shaper);
        shaper.connect(bp);
        bp.connect(amGain);
        amGain.connect(amp);
        amp.connect(ctx.destination);

        addNoiseLayer(ctx, ctx.destination, dur, 909, 680, 2.2, function (g) {
          g.linearRampToValueAtTime(0.32, 0.06);
          g.exponentialRampToValueAtTime(0.001, dur - 0.02);
        });

        carrier.start(0);
        mod1.start(0);
        mod2.start(0);
        amLfo.start(0);
        carrier.stop(dur);
        mod1.stop(dur);
        mod2.stop(dur);
        amLfo.stop(dur);
      }
    },
    {
      id: 'royal_fanfare',
      name: 'Three-Note Fanfare',
      emoji: '👑',
      description: 'Majestic three-step comic trumpet salute (da-da-daaa!).',
      duration: 1.22,
      render: function (ctx) {
        var notes = [
          { start: 0.02, end: 0.24, freq: 110 },
          { start: 0.29, end: 0.51, freq: 145 },
          { start: 0.56, end: 1.16, freq: 195 }
        ];

        var shaper = ctx.createWaveShaper();
        shaper.curve = makeTanhCurve(3.4);
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 780;
        lp.Q.value = 2.0;
        shaper.connect(lp);
        lp.connect(ctx.destination);

        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          var osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n.freq, n.start);
          osc.frequency.linearRampToValueAtTime(n.freq * 1.03, n.end);

          var g = ctx.createGain();
          g.gain.setValueAtTime(0.001, n.start);
          g.gain.linearRampToValueAtTime(0.88, n.start + 0.025);
          g.gain.setValueAtTime(0.78, n.end - 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, n.end);

          osc.connect(g);
          g.connect(shaper);
          osc.start(n.start);
          osc.stop(n.end + 0.01);
        }

        addNoiseLayer(ctx, ctx.destination, 1.22, 1010, 480, 1.3, function (g) {
          for (var j = 0; j < notes.length; j++) {
            g.setValueAtTime(0.001, notes[j].start);
            g.linearRampToValueAtTime(0.16, notes[j].start + 0.03);
            g.exponentialRampToValueAtTime(0.001, notes[j].end);
          }
        });
      }
    }
  ];

  function renderSpec(spec) {
    var ctx = createOffline(spec.duration);
    spec.render(ctx);
    return ctx.startRendering().then(function (audioBuffer) {
      var raw = new Float32Array(audioBuffer.getChannelData(0));
      var clipInfo = TootApp.DSP.autoClipAudio(raw, SAMPLE_RATE);
      var samples = clipInfo.ok ? clipInfo.clipped : raw;
      var features = TootApp.DSP.extractFeatures(samples, SAMPLE_RATE);
      return {
        id: spec.id,
        name: spec.name,
        emoji: spec.emoji,
        description: spec.description,
        isBuiltIn: true,
        sampleRate: SAMPLE_RATE,
        rawSamples: raw,
        samples: samples,
        clipInfo: clipInfo,
        features: features
      };
    });
  }

  function generateBuiltInSounds() {
    if (cachedSounds) {
      return Promise.resolve(cachedSounds);
    }
    if (pendingPromise) {
      return pendingPromise;
    }
    pendingPromise = Promise.all(SOUND_SPECS.map(renderSpec)).then(function (sounds) {
      cachedSounds = sounds;
      pendingPromise = null;
      return sounds;
    });
    return pendingPromise;
  }

  TootApp.Synth = {
    generateBuiltInSounds: generateBuiltInSounds
  };
})(typeof window !== 'undefined' ? window : globalThis);
