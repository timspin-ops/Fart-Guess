(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var gaugeUid = 0;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function safeNum(v, fallback) {
    return typeof v === 'number' && Number.isFinite(v) ? v : (fallback || 0);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function gaugeStatus(score) {
    var s = clamp(safeNum(score, 0), 0, 100);
    if (s >= 85) return { label: 'Excellent', color: '#22C55E', tone: 'excellent' };
    if (s >= 70) return { label: 'Strong', color: '#60A5FA', tone: 'strong' };
    if (s >= 50) return { label: 'Average', color: '#F97316', tone: 'average' };
    return { label: 'Weak', color: '#FB7185', tone: 'weak' };
  }

  function formatHzLabel(feat) {
    if (!feat) return '—';
    if (feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0) {
      return Math.round(feat.medianPitchHz) + ' Hz';
    }
    return Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz*';
  }

  function buildClipTag(sound) {
    if (!sound || !sound.samples) return '';
    var sr = sound.sampleRate || 44100;
    var dur = sound.samples.length / sr;
    if (sound.clipInfo && sound.clipInfo.originalDuration > dur + 0.08) {
      return (
        '<span class="labs-chip labs-chip-amber">Clipped ' +
        sound.clipInfo.originalDuration.toFixed(2) +
        's → ' +
        dur.toFixed(2) +
        's</span>'
      );
    }
    return '<span class="labs-chip">' + dur.toFixed(2) + 's</span>';
  }

  function buildExecutiveGauges(soundA, soundB, result) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var Forensics = root.TootApp && root.TootApp.Forensics;

    var fA = (soundA && (soundA.features || (DSP && DSP.extractFeatures(soundA.samples, soundA.sampleRate)))) || {};
    var fB = (soundB && (soundB.features || (DSP && DSP.extractFeatures(soundB.samples, soundB.sampleRate)))) || {};
    if (soundA && !soundA.features) soundA.features = fA;
    if (soundB && !soundB.features) soundB.features = fB;

    var res = result || (DSP ? DSP.compareSounds(fA, fB) : null) || {};
    var bd = res.breakdown || {};
    var pBd = bd.pitch || {};
    var tBd = bd.timbre || {};
    var mBd = bd.modulation || {};
    var oBd = bd.overall || {};

    var bonus =
      Forensics && typeof Forensics.computeBonusMetrics === 'function'
        ? Forensics.computeBonusMetrics(fA, fB)
        : null;

    var bpA = fA.bandProfile || [0.25, 0.25, 0.25, 0.25];
    var bpB = fB.bandProfile || [0.25, 0.25, 0.25, 0.25];
    var subDiff = Math.abs(safeNum(bpA[0], 0.25) - safeNum(bpB[0], 0.25));
    var lowMidDiff = Math.abs(safeNum(bpA[1], 0.25) - safeNum(bpB[1], 0.25));
    var crestDiff = Math.abs(safeNum(fA.crestFactorDb, 8) - safeNum(fB.crestFactorDb, 8));
    var thunderRaw =
      (1 - clamp(subDiff * 2.2, 0, 1)) * 45 +
      (1 - clamp(lowMidDiff * 1.8, 0, 1)) * 25 +
      (1 - clamp(crestDiff / 14, 0, 1)) * 30;
    var thunderScore = Math.round(clamp(thunderRaw * 0.72 + safeNum(res.envelopeScore, 50) * 0.28, 0, 100));

    var mlRaw =
      safeNum(tBd.mfccMeanScore, 0.5) * 34 +
      safeNum(tBd.mfccMacroScore, 0.5) * 28 +
      safeNum(tBd.gridCorr, 0.5) * 20 +
      safeNum(oBd.coreIdentity, 0.5) * 18;
    var mlConfidence = Math.round(clamp(mlRaw, 0, 100));

    var acousticConf = Math.round(
      clamp(
        safeNum(oBd.weightedGeom, safeNum(res.overall, 0)) * 0.55 +
          safeNum(oBd.coreIdentity, 0.5) * 100 * 0.25 +
          safeNum(res.overall, 0) * 0.2,
        0,
        100
      )
    );

    var rhythmicRaw =
      (safeNum(mBd.burstMatch, 0.5) * 0.55 + safeNum(mBd.modBandScore, 0.5) * 0.45) * 100;
    var rhythmicScore = Math.round(clamp(rhythmicRaw * 0.65 + safeNum(res.modulationScore, 50) * 0.35, 0, 100));

    var harmonicRaw =
      (safeNum(tBd.flatMatch, 0.5) * 0.48 +
        safeNum(pBd.voicedMatch, 0.5) * 0.32 +
        safeNum(pBd.absPitch, 0.5) * 0.2) *
      100;
    var harmonicScore = Math.round(clamp(harmonicRaw * 0.6 + safeNum(res.pitchScore, 50) * 0.4, 0, 100));

    var moistureScore = bonus ? Math.round(clamp(safeNum(bonus.wetness.matchScore, 50), 0, 100)) : Math.round(safeNum(res.timbreScore, 50));
    var neighborScore = bonus ? Math.round(clamp(safeNum(bonus.social.matchScore, 50), 0, 100)) : Math.round(safeNum(res.envelopeScore, 50));

    var rawList = [
      {
        id: 'tone',
        title: 'Tone Match',
        score: Math.round(clamp(safeNum(res.pitchScore, 0), 0, 100)),
        sub: formatHzLabel(fA) + ' vs ' + formatHzLabel(fB),
        forensicsKey: 'pitch',
        note: 'Tracks fundamental pitch contour, zero-crossing rate, and logarithmic sweep slope invariance.'
      },
      {
        id: 'duration',
        title: 'Duration Match',
        score: Math.round(clamp(safeNum(res.durationScore, 0), 0, 100)),
        sub: safeNum(fA.duration, 0).toFixed(2) + 's vs ' + safeNum(fB.duration, 0).toFixed(2) + 's',
        forensicsKey: 'duration',
        note: 'Evaluates auto-trimmed airflow event span using asymmetric exponential decay penalties.'
      },
      {
        id: 'pressure',
        title: 'Pressure Signature',
        score: Math.round(clamp(safeNum(res.envelopeScore, 0), 0, 100)),
        sub: 'Peak ' + Math.round(safeNum(fA.crestFactorDb, 0)) + ' vs ' + Math.round(safeNum(fB.crestFactorDb, 0)) + ' dB',
        forensicsKey: 'envelope',
        note: 'Measures cross-correlated blast RMS amplitude curve invariant to micro-onset shifts.'
      },
      {
        id: 'resonance',
        title: 'Resonance Similarity',
        score: Math.round(clamp(safeNum(res.timbreScore, 0), 0, 100)),
        sub: Math.round(safeNum(fA.spectralCentroidHz, 0)) + ' vs ' + Math.round(safeNum(fB.spectralCentroidHz, 0)) + ' Hz',
        forensicsKey: 'timbre',
        note: 'Computes 13-band MFCC acoustic vector proximity and spectral surface topology.'
      },
      {
        id: 'thunder',
        title: 'Thunder Quotient',
        score: thunderScore,
        sub: Math.round(safeNum(bpA[0], 0) * 100) + '% vs ' + Math.round(safeNum(bpB[0], 0) * 100) + '% sub-bass',
        forensicsKey: 'overall',
        note: 'Quantifies 45–150 Hz low-end chamber rumble ratio combined with transient crest slam.'
      },
      {
        id: 'turbulence',
        title: 'Turbulence Index',
        score: Math.round(clamp(safeNum(res.modulationScore, 0), 0, 100)),
        sub: Math.round(safeNum(fA.modRateHz, 0)) + ' Hz vs ' + Math.round(safeNum(fB.modRateHz, 0)) + ' Hz flutter',
        forensicsKey: 'modulation',
        note: 'Analyzes 4–45 Hz modulation FFT spectrum across cheek stutter, flutter, and fast rattle bands.'
      },
      {
        id: 'acoustic_conf',
        title: 'Acoustic Confidence',
        score: acousticConf,
        sub: 'Grade ' + (res.grade || 'B') + ' synthesis',
        forensicsKey: 'overall',
        note: 'Geometric penalty-aware consensus combining all five weighted telemetry channels.'
      },
      {
        id: 'ml_conf',
        title: 'Machine Learning Confidence',
        score: mlConfidence,
        sub: 'MFCC ' + Math.round(safeNum(tBd.mfccMeanScore, 0) * 100) + '% · Grid ' + Math.round(safeNum(tBd.gridCorr, 0) * 100) + '%',
        forensicsKey: 'timbre',
        note: 'Multi-dimensional cepstral feature classifier measuring temporal macro-dynamics and spectrogram alignment.'
      },
      {
        id: 'rhythmic',
        title: 'Rhythmic Stability',
        score: rhythmicScore,
        sub: (fA.burstCount || 1) + ' vs ' + (fB.burstCount || 1) + ' burst(s)',
        forensicsKey: 'modulation',
        note: 'Assesses burst segmentation cadence and modulation-band energy distribution parity.'
      },
      {
        id: 'harmonic',
        title: 'Harmonic Similarity',
        score: harmonicScore,
        sub: 'Flatness ' + safeNum(fA.spectralFlatness, 0).toFixed(2) + ' vs ' + safeNum(fB.spectralFlatness, 0).toFixed(2),
        forensicsKey: 'pitch',
        note: 'Balances tonal periodicity vs turbulent air dispersion across voiced frames.'
      },
      {
        id: 'moisture',
        title: 'Moisture Probability',
        score: moistureScore,
        sub: bonus ? bonus.wetness.wetA + '% vs ' + bonus.wetness.wetB + '%' : 'Squelch parity',
        forensicsKey: 'wetness',
        note: 'Evaluates spectral flux acceleration and mid-frequency squelch resonance convergence.'
      },
      {
        id: 'neighbor',
        title: 'Neighbor Disturbance Forecast',
        score: neighborScore,
        sub: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm vs ' + bonus.social.b.radiusM.toFixed(1) + 'm blast' : 'Propagation zone',
        forensicsKey: 'social',
        note: 'Models confined-space detectability radius and plausible deniability deflection profiles.'
      }
    ];

    return rawList.map(function (g) {
      var st = gaugeStatus(g.score);
      return Object.assign({}, g, {
        status: st.label,
        color: st.color,
        tone: st.tone
      });
    });
  }

  function renderDashboard(mountEl, options) {
    if (!mountEl || !options || !options.soundA || !options.soundB) {
      return { destroy: function () {}, resize: function () {} };
    }

    var opts = options;
    var soundA = opts.soundA;
    var soundB = opts.soundB;
    var DSP = root.TootApp.DSP;
    var Forensics = root.TootApp.Forensics;
    var Spectrogram3D = root.TootApp.Spectrogram3D;
    var Audio = root.TootApp.Audio;

    var featA = soundA.features || DSP.extractFeatures(soundA.samples, soundA.sampleRate);
    var featB = soundB.features || DSP.extractFeatures(soundB.samples, soundB.sampleRate);
    soundA.features = featA;
    soundB.features = featB;

    var result = opts.result || DSP.compareSounds(featA, featB);
    var gauges = buildExecutiveGauges(soundA, soundB, result);
    var bonus = Forensics && typeof Forensics.computeBonusMetrics === 'function' ? Forensics.computeBonusMetrics(featA, featB) : null;
    var labelA = opts.labelA || soundA.displayName || soundA.name || 'Reference';
    var labelB = opts.labelB || soundB.displayName || soundB.name || 'Attempt';
    var exactScore = root.TootLabs.Store ? root.TootLabs.Store.computeExactScore(result) : result.overall;

    var uid = 'lf_' + (++gaugeUid) + '_';
    var chanA = uid + 'A';
    var chanB = uid + 'B';
    var sync3d = true;
    var colormap = opts.colormap || 'plasma';
    var activeGaugeId = opts.initialGaugeId || null;
    var activeForensicsKey = null;
    var specA = null;
    var specB = null;

    var rGauge = 34;
    var cGauge = 2 * Math.PI * rGauge;

    var gaugesHtml = gauges
      .map(function (g) {
        var offset = cGauge * (1 - g.score / 100);
        return (
          '<button type="button" class="labs-gauge-card" data-gauge-id="' +
          esc(g.id) +
          '" data-fkey="' +
          esc(g.forensicsKey) +
          '">' +
          '  <div class="labs-gauge-ring-wrap">' +
          '    <svg class="labs-gauge-svg" viewBox="0 0 84 84" aria-hidden="true">' +
          '      <circle class="labs-gauge-track" cx="42" cy="42" r="' + rGauge + '"></circle>' +
          '      <circle class="labs-gauge-fill" data-target-offset="' +
          offset.toFixed(2) +
          '" cx="42" cy="42" r="' +
          rGauge +
          '" stroke="' +
          g.color +
          '" stroke-dasharray="' +
          cGauge.toFixed(2) +
          '" stroke-dashoffset="' +
          cGauge.toFixed(2) +
          '"></circle>' +
          '    </svg>' +
          '    <div class="labs-gauge-center">' +
          '      <span class="labs-gauge-num" style="color:' + g.color + '">' + g.score + '%</span>' +
          '    </div>' +
          '  </div>' +
          '  <div class="labs-gauge-title">' + esc(g.title) + '</div>' +
          '  <div class="labs-gauge-sub">' + esc(g.sub) + '</div>' +
          '  <span class="labs-status-pill labs-tone-' + esc(g.tone) + '">' + esc(g.status) + '</span>' +
          '</button>'
        );
      })
      .join('');

    var twinBadgeHtml = bonus
      ? '<button type="button" class="labs-twin-pill" data-open-fkey="acoustics" title="Inspect Acoustic Twins &amp; Cheek Resonance">' +
        '  <span>Cheek Resonance Twin:</span> ' +
        '  <strong>' +
        esc(bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.short) +
        '</strong> vs <strong>' +
        esc(bonus.acoustics.twinB.emoji + ' ' + bonus.acoustics.twinB.short) +
        '</strong> (' +
        bonus.acoustics.matchScore +
        '%)</button>'
      : '';

    var presetButtons =
      '<div class="labs-spec-presets">' +
      '  <button type="button" class="labs-mini-chip active" data-preset="3d">3D</button>' +
      '  <button type="button" class="labs-mini-chip" data-preset="top">Top</button>' +
      '  <button type="button" class="labs-mini-chip" data-preset="side">Side</button>' +
      '  <button type="button" class="labs-mini-chip" data-preset="spin">Spin</button>' +
      '</div>';

    var criteriaTabsHtml = Forensics
      ? Forensics.CRITERIA_META.map(function (c) {
          return (
            '<button type="button" class="labs-dossier-pill" data-dossier-key="' +
            esc(c.key) +
            '">' +
            esc(c.label) +
            '</button>'
          );
        }).join('')
      : '';

    var headerBtnsHtml =
      (opts.onEmailAnalysis || opts.onShare
        ? '<div class="labs-fn-header-btns">' +
          (opts.onShare ? '<button type="button" class="labs-btn-ghost labs-btn-sm labs-cmp-share">📤 Share</button>' : '') +
          (opts.onEmailAnalysis ? '<button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-cmp-email">📧 Email Analysis</button>' : '') +
          '</div>'
        : '');

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">COMPARISON FORENSICS SUITE</div>' +
      '        <h2 class="labs-fn-title">' + esc(labelA) + ' <span class="labs-vs-arrow">vs</span> ' + esc(labelB) + '</h2>' +
      '      </div>' +
      '      <div class="labs-fn-right-cluster">' +
      headerBtnsHtml +
      '        <div class="labs-fn-score-chip">' +
      '          <span class="labs-fn-score-val">' + exactScore.toFixed(1) + '%</span>' +
      '          <span class="labs-fn-score-lbl">MATCH</span>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="labs-fn-meta-row">' +
      twinBadgeHtml +
      '      <span class="labs-hint-text">Tap any circular gauge below to expand scientific instrumentation &amp; FFT charts</span>' +
      '    </div>' +
      '  </section>' +
      '  <section class="labs-gauges-grid">' +
      gaugesHtml +
      '  </section>' +
      '  <section class="labs-expanded-panel hidden" id="' + uid + 'expanded">' +
      '    <div class="labs-expanded-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow" id="' + uid + 'exp-eyebrow">METRIC DEEP DIVE</div>' +
      '        <h3 class="labs-expanded-title" id="' + uid + 'exp-title"></h3>' +
      '        <p class="labs-expanded-note" id="' + uid + 'exp-note"></p>' +
      '      </div>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm" id="' + uid + 'exp-close">✕ Collapse</button>' +
      '    </div>' +
      '    <div class="labs-dossier-strip">' +
      criteriaTabsHtml +
      '    </div>' +
      '    <div class="labs-forensics-mount" id="' + uid + 'fmount"></div>' +
      '  </section>' +
      '  <section class="labs-glass-card labs-spec-bay">' +
      '    <div class="labs-spec-bay-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">3D TIME-FREQUENCY TOPOLOGY</div>' +
      '        <h3 class="labs-section-title">Side-by-Side Spectrograms</h3>' +
      '      </div>' +
      '      <div class="labs-spec-actions">' +
      '        <button type="button" class="labs-btn labs-btn-emerald labs-btn-sm labs-fn-b2b">▶ A → B</button>' +
      '        <button type="button" class="labs-btn labs-btn-purple labs-btn-sm labs-fn-overlay">🔀 Overlay</button>' +
      '        <button type="button" class="labs-btn-ghost labs-btn-sm labs-fn-stop">⏹ Stop</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="labs-spec-opts">' +
      '      <label class="labs-check"><input type="checkbox" class="labs-fn-sync" checked /> Sync 3D Camera</label>' +
      '      <label class="labs-select-lbl">Palette ' +
      '        <select class="labs-fn-colormap">' +
      '          <option value="plasma"' + (colormap === 'plasma' ? ' selected' : '') + '>Plasma</option>' +
      '          <option value="toxic"' + (colormap === 'toxic' ? ' selected' : '') + '>Toxic</option>' +
      '          <option value="magma"' + (colormap === 'magma' ? ' selected' : '') + '>Magma</option>' +
      '        </select>' +
      '      </label>' +
      '    </div>' +
      '    <div class="labs-spec-grid">' +
      '      <div class="labs-spec-card" data-side="A">' +
      '        <div class="labs-spec-card-head">' +
      '          <div class="labs-spec-name">' + esc(labelA) + '</div>' +
      buildClipTag(soundA) +
      '        </div>' +
      '        <div class="labs-spec-card-bar">' +
      '          <button type="button" class="labs-mini-play labs-fn-play-a">▶ Play A</button>' +
      presetButtons +
      '        </div>' +
      '        <canvas class="labs-spec-canvas labs-fn-canvas-a"></canvas>' +
      '      </div>' +
      '      <div class="labs-spec-card" data-side="B">' +
      '        <div class="labs-spec-card-head">' +
      '          <div class="labs-spec-name">' + esc(labelB) + '</div>' +
      buildClipTag(soundB) +
      '        </div>' +
      '        <div class="labs-spec-card-bar">' +
      '          <button type="button" class="labs-mini-play labs-fn-play-b">▶ Play B</button>' +
      presetButtons +
      '        </div>' +
      '        <canvas class="labs-spec-canvas labs-fn-canvas-b"></canvas>' +
      '      </div>' +
      '    </div>' +
      '  </section>' +
      '</div>';

    // Animate gauge rings smoothly after first frame
    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        var fills = mountEl.querySelectorAll('.labs-gauge-fill');
        for (var i = 0; i < fills.length; i++) {
          var target = fills[i].getAttribute('data-target-offset');
          if (target != null) fills[i].style.strokeDashoffset = target;
        }
      });
    }

    // Initialize 3D Spectrograms
    var canvasA = mountEl.querySelector('.labs-fn-canvas-a');
    var canvasB = mountEl.querySelector('.labs-fn-canvas-b');
    if (Spectrogram3D && canvasA && canvasB) {
      specA = new Spectrogram3D(canvasA, { spectrogram: featA.spectrogram, colormap: colormap });
      specB = new Spectrogram3D(canvasB, { spectrogram: featB.spectrogram, colormap: colormap });
      specA.linkPartner(specB);
    }

    var expandedEl = mountEl.querySelector('#' + uid + 'expanded');
    var expEyebrowEl = mountEl.querySelector('#' + uid + 'exp-eyebrow');
    var expTitleEl = mountEl.querySelector('#' + uid + 'exp-title');
    var expNoteEl = mountEl.querySelector('#' + uid + 'exp-note');
    var fMountEl = mountEl.querySelector('#' + uid + 'fmount');

    function updateExpandedHeader(gaugeObj, fKey) {
      if (gaugeObj) {
        expEyebrowEl.textContent = 'GAUGE INSTRUMENTATION · ' + gaugeObj.score + '% (' + gaugeObj.status.toUpperCase() + ')';
        expTitleEl.textContent = gaugeObj.title + ' — ' + gaugeObj.sub;
        expNoteEl.textContent = gaugeObj.note;
      } else {
        expEyebrowEl.textContent = 'FORENSIC DOSSIER · ACOUSTIC TWIN ANALYSIS';
        expTitleEl.textContent = 'Cheek Resonance & Acoustic Archetypes';
        expNoteEl.textContent = 'Multi-archetype reference mapping comparing pitch, flatness, and modulation dynamics.';
      }
      var pills = mountEl.querySelectorAll('.labs-dossier-pill');
      for (var i = 0; i < pills.length; i++) {
        pills[i].classList.toggle('active', pills[i].getAttribute('data-dossier-key') === fKey);
      }
    }

    function openForensicsPanel(gaugeId, fKey) {
      if (!Forensics || !expandedEl || !fMountEl) return;
      var matchedGauge = null;
      for (var i = 0; i < gauges.length; i++) {
        if (gauges[i].id === gaugeId) {
          matchedGauge = gauges[i];
          break;
        }
      }
      var targetFKey = fKey || (matchedGauge ? matchedGauge.forensicsKey : 'overall');
      activeGaugeId = matchedGauge ? matchedGauge.id : null;
      activeForensicsKey = targetFKey;

      var cards = mountEl.querySelectorAll('.labs-gauge-card');
      for (var c = 0; c < cards.length; c++) {
        cards[c].classList.toggle('selected', cards[c].getAttribute('data-gauge-id') === activeGaugeId);
      }

      updateExpandedHeader(matchedGauge, targetFKey);
      expandedEl.classList.remove('hidden');

      var drawNow = function () {
        Forensics.renderForensicsDrawer(
          fMountEl,
          targetFKey,
          soundA,
          soundB,
          result,
          null,
          function () {
            closeExpandedPanel();
          },
          { inlineAccordion: true }
        );
        if (typeof expandedEl.scrollIntoView === 'function') {
          try {
            expandedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (e) {}
        }
      };

      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(drawNow);
      } else {
        drawNow();
      }
    }

    function closeExpandedPanel() {
      activeGaugeId = null;
      activeForensicsKey = null;
      if (expandedEl) expandedEl.classList.add('hidden');
      if (fMountEl) fMountEl.innerHTML = '';
      var cards = mountEl.querySelectorAll('.labs-gauge-card');
      for (var c = 0; c < cards.length; c++) cards[c].classList.remove('selected');
    }

    // Bind Gauge clicks
    var gCards = mountEl.querySelectorAll('.labs-gauge-card');
    for (var gi = 0; gi < gCards.length; gi++) {
      gCards[gi].addEventListener('click', function () {
        var gid = this.getAttribute('data-gauge-id');
        var fk = this.getAttribute('data-fkey');
        if (activeGaugeId === gid && !expandedEl.classList.contains('hidden')) {
          closeExpandedPanel();
        } else {
          openForensicsPanel(gid, fk);
        }
      });
    }

    var twinBtn = mountEl.querySelector('.labs-twin-pill');
    if (twinBtn) {
      twinBtn.addEventListener('click', function () {
        openForensicsPanel(null, 'acoustics');
      });
    }

    var dossierBtns = mountEl.querySelectorAll('.labs-dossier-pill');
    for (var di = 0; di < dossierBtns.length; di++) {
      dossierBtns[di].addEventListener('click', function () {
        var nextKey = this.getAttribute('data-dossier-key');
        openForensicsPanel(activeGaugeId, nextKey);
      });
    }

    var expCloseBtn = mountEl.querySelector('#' + uid + 'exp-close');
    if (expCloseBtn) {
      expCloseBtn.addEventListener('click', closeExpandedPanel);
    }

    // Bind Playback & 3D controls
    mountEl.querySelector('.labs-fn-play-a').addEventListener('click', function () {
      Audio.playSound(soundA.samples, soundA.sampleRate, {
        playbackRate: 1.0,
        channel: chanA,
        onProgress: function (p) { if (specA) specA.setPlayhead(p); },
        onEnded: function () { if (specA) specA.setPlayhead(null); }
      });
    });

    mountEl.querySelector('.labs-fn-play-b').addEventListener('click', function () {
      Audio.playSound(soundB.samples, soundB.sampleRate, {
        playbackRate: 1.0,
        channel: chanB,
        onProgress: function (p) { if (specB) specB.setPlayhead(p); },
        onEnded: function () { if (specB) specB.setPlayhead(null); }
      });
    });

    mountEl.querySelector('.labs-fn-b2b').addEventListener('click', function () {
      Audio.playSequence(
        [
          {
            samples: soundA.samples,
            sampleRate: soundA.sampleRate,
            channel: chanA,
            onProgress: function (p) { if (specA) specA.setPlayhead(p); },
            onEnded: function () { if (specA) specA.setPlayhead(null); }
          },
          {
            samples: soundB.samples,
            sampleRate: soundB.sampleRate,
            channel: chanB,
            onProgress: function (p) { if (specB) specB.setPlayhead(p); },
            onEnded: function () { if (specB) specB.setPlayhead(null); }
          }
        ],
        220
      );
    });

    mountEl.querySelector('.labs-fn-overlay').addEventListener('click', function () {
      Audio.playSimultaneous([
        {
          samples: soundA.samples,
          sampleRate: soundA.sampleRate,
          channel: chanA,
          onProgress: function (p) { if (specA) specA.setPlayhead(p); },
          onEnded: function () { if (specA) specA.setPlayhead(null); }
        },
        {
          samples: soundB.samples,
          sampleRate: soundB.sampleRate,
          channel: chanB,
          onProgress: function (p) { if (specB) specB.setPlayhead(p); },
          onEnded: function () { if (specB) specB.setPlayhead(null); }
        }
      ]);
    });

    mountEl.querySelector('.labs-fn-stop').addEventListener('click', function () {
      Audio.stopAll();
      if (specA) specA.setPlayhead(null);
      if (specB) specB.setPlayhead(null);
    });

    mountEl.querySelector('.labs-fn-sync').addEventListener('change', function (e) {
      sync3d = e.target.checked;
      if (specA) specA.setSyncEnabled(sync3d);
      if (specB) specB.setSyncEnabled(sync3d);
    });

    mountEl.querySelector('.labs-fn-colormap').addEventListener('change', function (e) {
      colormap = e.target.value;
      if (specA) specA.setColormap(colormap);
      if (specB) specB.setColormap(colormap);
    });

    function bindSidePresets(sideAttr, getSpec) {
      var btns = mountEl.querySelectorAll('.labs-spec-card[data-side="' + sideAttr + '"] [data-preset]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
          var preset = this.getAttribute('data-preset');
          var sp = getSpec();
          if (!sp) return;
          if (preset === 'spin') {
            var on = sp.toggleAutoRotate();
            this.classList.toggle('active', on);
          } else {
            for (var k = 0; k < btns.length; k++) {
              if (btns[k].getAttribute('data-preset') !== 'spin') btns[k].classList.remove('active');
            }
            this.classList.add('active');
            sp.setPreset(preset);
          }
        });
      }
    }

    bindSidePresets('A', function () { return specA; });
    bindSidePresets('B', function () { return specB; });

    var cmpShareBtn = mountEl.querySelector('.labs-cmp-share');
    if (cmpShareBtn && opts.onShare) {
      cmpShareBtn.addEventListener('click', function () {
        opts.onShare(soundA, soundB, result, exactScore);
      });
    }
    var cmpEmailBtn = mountEl.querySelector('.labs-cmp-email');
    if (cmpEmailBtn && opts.onEmailAnalysis) {
      cmpEmailBtn.addEventListener('click', function () {
        opts.onEmailAnalysis(soundA, soundB, result, exactScore);
      });
    }

    if (activeGaugeId) {
      openForensicsPanel(activeGaugeId);
    }

    return {
      resize: function () {
        if (specA) specA.resize();
        if (specB) specB.resize();
        if (Forensics && fMountEl && activeForensicsKey) {
          Forensics.redrawDrawer(fMountEl);
        }
      },
      destroy: function () {
        if (specA) specA.destroy();
        if (specB) specB.destroy();
        specA = null;
        specB = null;
        if (mountEl) mountEl.innerHTML = '';
      }
    };
  }

  /* ==================== SHARED CANVAS 2D HELPERS ==================== */
  function setupDarkPlot(canvas, minH) {
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    var w = rect && rect.width > 20 ? rect.width : 320;
    var h = rect && rect.height > 20 ? rect.height : minH || 195;
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var tw = Math.round(w * dpr);
    var th = Math.round(h * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0B1222';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(55, 65, 81, 0.45)';
    ctx.lineWidth = 1;
    for (var g = 1; g <= 3; g++) {
      var gy = (h * g) / 4;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }
    return { ctx: ctx, w: w, h: h };
  }

  function renderGaugeCardsHtml(gauges) {
    var rGauge = 34;
    var cGauge = 2 * Math.PI * rGauge;
    return gauges
      .map(function (g) {
        var offset = cGauge * (1 - clamp(safeNum(g.score, 0), 0, 100) / 100);
        return (
          '<div class="labs-gauge-card labs-gauge-static">' +
          '  <div class="labs-gauge-ring-wrap">' +
          '    <svg class="labs-gauge-svg" viewBox="0 0 84 84" aria-hidden="true">' +
          '      <circle class="labs-gauge-track" cx="42" cy="42" r="' + rGauge + '"></circle>' +
          '      <circle class="labs-gauge-fill" data-target-offset="' +
          offset.toFixed(2) +
          '" cx="42" cy="42" r="' +
          rGauge +
          '" stroke="' +
          g.color +
          '" stroke-dasharray="' +
          cGauge.toFixed(2) +
          '" stroke-dashoffset="' +
          cGauge.toFixed(2) +
          '"></circle>' +
          '    </svg>' +
          '    <div class="labs-gauge-center">' +
          '      <span class="labs-gauge-num" style="color:' + g.color + '">' + g.score + '%</span>' +
          '    </div>' +
          '  </div>' +
          '  <div class="labs-gauge-title">' + esc(g.title) + '</div>' +
          '  <div class="labs-gauge-sub">' + esc(g.sub) + '</div>' +
          '  <span class="labs-status-pill labs-tone-' + esc(g.tone) + '">' + esc(g.status) + '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  function animateGaugeRings(mountEl) {
    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(function () {
        var fills = mountEl.querySelectorAll('.labs-gauge-fill');
        for (var i = 0; i < fills.length; i++) {
          var target = fills[i].getAttribute('data-target-offset');
          if (target != null) fills[i].style.strokeDashoffset = target;
        }
      });
    }
  }

  function drawSpectrumPlot(canvas, feat, accent) {
    var p = setupDarkPlot(canvas, 195);
    if (!p || !feat || !feat.avgSpectrum) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 34, r: 12, t: 14, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var spec = feat.avgSpectrum;
    var n = spec.length;
    var barW = Math.max(2, pw / n - 1.5);

    var grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
    grad.addColorStop(0, accent || '#60A5FA');
    grad.addColorStop(1, 'rgba(34, 197, 94, 0.25)');

    ctx.fillStyle = grad;
    for (var i = 0; i < n; i++) {
      var val = clamp(safeNum(spec[i], 0), 0, 1);
      var bh = Math.max(2, val * ph);
      var x = pad.l + (i / n) * pw;
      ctx.fillRect(x, pad.t + ph - bh, barW, bh);
    }

    var fc = feat.spectrogram && feat.spectrogram.freqCenters;
    var centHz = safeNum(feat.spectralCentroidHz, 240);
    if (fc && fc.length === n) {
      var centIdx = 0;
      var bestDist = Infinity;
      for (var c = 0; c < n; c++) {
        var d = Math.abs(fc[c] - centHz);
        if (d < bestDist) { bestDist = d; centIdx = c; }
      }
      var cx = pad.l + ((centIdx + 0.5) / n) * pw;
      ctx.strokeStyle = '#F97316';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx, pad.t);
      ctx.lineTo(cx, pad.t + ph);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('45 Hz', pad.l, h - 7);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDBA74';
    ctx.fillText('Centroid ' + Math.round(centHz) + ' Hz', pad.l + pw * 0.5, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('4.2 kHz', pad.l + pw, h - 7);
  }

  function drawPitchContourPlot(canvas, feat) {
    var p = setupDarkPlot(canvas, 195);
    if (!p || !feat || !feat.pitchHzArr) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 38, r: 12, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var arr = feat.pitchHzArr;
    var maxHz = 180;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] > maxHz) maxHz = arr[i];
    }
    maxHz = Math.min(900, Math.max(220, maxHz * 1.15));

    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    var drawing = false;
    for (var j = 0; j < arr.length; j++) {
      var hz = arr[j];
      var x = pad.l + (j / Math.max(1, arr.length - 1)) * pw;
      if (hz > 20) {
        var y = pad.t + ph - clamp(hz / maxHz, 0, 1) * ph;
        if (!drawing) {
          ctx.moveTo(x, y);
          drawing = true;
        } else {
          ctx.lineTo(x, y);
        }
        ctx.fillStyle = '#86EFAC';
        ctx.fillRect(x - 2, y - 2, 4, 4);
      } else {
        drawing = false;
      }
    }
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(maxHz) + 'Hz', 4, pad.t + 8);
    ctx.fillText('0s', pad.l, h - 7);
    ctx.textAlign = 'right';
    ctx.fillText(safeNum(feat.duration, 0).toFixed(2) + 's', pad.l + pw, h - 7);
  }

  function drawModulationPlot(canvas, feat) {
    var p = setupDarkPlot(canvas, 195);
    if (!p || !feat || !feat.modSpectrum) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 28, r: 12, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var ms = feat.modSpectrum;

    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph);
    for (var i = 0; i < ms.length; i++) {
      var x = pad.l + (i / Math.max(1, ms.length - 1)) * pw;
      var y = pad.t + ph - clamp(safeNum(ms[i], 0), 0, 1) * ph;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(139, 92, 246, 0.24)';
    ctx.fill();

    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (var k = 0; k < ms.length; k++) {
      var lx = pad.l + (k / Math.max(1, ms.length - 1)) * pw;
      var ly = pad.t + ph - clamp(safeNum(ms[k], 0), 0, 1) * ph;
      if (k === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('4 Hz', pad.l, h - 7);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#DDD6FE';
    ctx.fillText('Peak ' + Math.round(safeNum(feat.modRateHz, 0)) + ' Hz · ' + (feat.burstCount || 1) + ' burst(s)', pad.l + pw * 0.5, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('45 Hz', pad.l + pw, h - 7);
  }

  function drawEnvelopePlot(canvas, feat) {
    var p = setupDarkPlot(canvas, 195);
    if (!p || !feat || !feat.envelope) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 28, r: 12, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var env = feat.envelope;

    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph);
    for (var i = 0; i < env.length; i++) {
      var x = pad.l + (i / Math.max(1, env.length - 1)) * pw;
      var y = pad.t + ph - clamp(safeNum(env[i], 0), 0, 1) * ph;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(249, 115, 22, 0.24)';
    ctx.fill();

    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (var k = 0; k < env.length; k++) {
      var lx = pad.l + (k / Math.max(1, env.length - 1)) * pw;
      var ly = pad.t + ph - clamp(safeNum(env[k], 0), 0, 1) * ph;
      if (k === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    // T50 energy median marker
    var t50x = pad.l + clamp(safeNum(feat.t50Ratio, 0.5), 0, 1) * pw;
    ctx.strokeStyle = '#60A5FA';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(t50x, pad.t);
    ctx.lineTo(t50x, pad.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Attack ' + Math.round(safeNum(feat.attackSec, 0) * 1000) + 'ms', pad.l, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#93C5FD';
    ctx.fillText('T50 @ ' + Math.round(safeNum(feat.t50Ratio, 0.5) * 100) + '%', pad.l + pw, h - 7);
  }

  /* ==================== 1 & 2: SINGLE FART / GUESS ANALYSIS ==================== */
  function buildSingleGauges(sound) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var Forensics = root.TootApp && root.TootApp.Forensics;
    var feat = (sound && (sound.features || (DSP && DSP.extractFeatures(sound.samples, sound.sampleRate)))) || {};
    if (sound && !sound.features) sound.features = feat;
    var bonus = Forensics ? Forensics.computeBonusMetrics(feat, feat) : null;

    var crestScore = Math.round(clamp((safeNum(feat.crestFactorDb, 8) / 18) * 100, 15, 99));
    var lowShare = feat.bandProfile ? (safeNum(feat.bandProfile[0], 0.25) + safeNum(feat.bandProfile[1], 0.25)) : 0.5;
    var resScore = Math.round(clamp(lowShare * 88 + (1 - safeNum(feat.spectralFlatness, 0.3)) * 22, 12, 99));
    var turbScore = Math.round(clamp(safeNum(feat.modDepth, 0.25) * 92 + ((feat.burstCount || 1) > 1 ? 15 : 0), 8, 99));
    var moistScore = bonus ? bonus.wetness.wetA : 30;
    var twinScore = bonus ? bonus.acoustics.topScoreA : 60;
    var panicScore = bonus ? bonus.social.a.panicPct : 45;

    var list = [
      {
        id: 's_crest',
        title: 'Crest Intensity',
        score: crestScore,
        sub: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB peak ratio'
      },
      {
        id: 's_resonance',
        title: 'Resonance Depth',
        score: resScore,
        sub: Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz centroid'
      },
      {
        id: 's_turbulence',
        title: 'Flutter Turbulence',
        score: turbScore,
        sub: Math.round(safeNum(feat.modRateHz, 0)) + ' Hz · ' + (feat.burstCount || 1) + ' burst(s)'
      },
      {
        id: 's_moisture',
        title: 'Moisture Probability',
        score: moistScore,
        sub: bonus ? bonus.wetness.labelA : 'Acoustic surface'
      },
      {
        id: 's_twin',
        title: 'Acoustic Twin Affinity',
        score: twinScore,
        sub: bonus ? bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.short : 'Sonic Archetype'
      },
      {
        id: 's_panic',
        title: 'Elevator Panic Risk',
        score: panicScore,
        sub: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm blast zone' : 'Room acoustics'
      }
    ];

    return list.map(function (g) {
      var st = gaugeStatus(g.score);
      return Object.assign({}, g, { status: st.label, color: st.color, tone: st.tone });
    });
  }

  function renderSingleDashboard(mountEl, opts) {
    if (!mountEl || !opts || !opts.sound) {
      return { destroy: function () {}, resize: function () {} };
    }
    var sound = opts.sound;
    var DSP = root.TootApp.DSP;
    var Forensics = root.TootApp.Forensics;
    var Spectrogram3D = root.TootApp.Spectrogram3D;
    var Audio = root.TootApp.Audio;

    var feat = sound.features || DSP.extractFeatures(sound.samples, sound.sampleRate);
    sound.features = feat;
    var prof = DSP.describeSoundProfile(feat);
    var bonus = Forensics ? Forensics.computeBonusMetrics(feat, feat) : null;
    var gauges = buildSingleGauges(sound);
    var label = opts.label || sound.displayName || sound.name || 'Recording';
    var eyebrow = opts.eyebrow || 'SINGLE FART FORENSIC DOSSIER';
    var noteStr =
      Forensics && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? Forensics.hzToNoteName(feat.medianPitchHz)
        : 'Unvoiced Airband';

    var uid = 'lfs_' + (++gaugeUid) + '_';
    var chan = uid + 'S';
    var spec = null;

    var compareBtnHtml = opts.onPrimaryAction
      ? '<button type="button" class="labs-btn labs-btn-emerald labs-btn-sm labs-single-primary">' + esc(opts.primaryLabel || '🎯 Guess This Fart') + '</button>'
      : '';

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">' + esc(eyebrow) + '</div>' +
      '        <h2 class="labs-fn-title">' + esc(label) + '</h2>' +
      '        <div class="labs-detail-meta">' + esc(prof.durationLabel + ' · ' + prof.pitchLabel + ' (' + noteStr + ') · ' + prof.textureLabel) + '</div>' +
      '      </div>' +
      buildClipTag(sound) +
      '    </div>' +
      '    <div class="labs-fn-single-actions">' +
      '      <button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-s-play">▶ Play</button>' +
      compareBtnHtml +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-s-share">📤 Share</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-s-email-audio">🎵 Email MP3</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-s-email-report">📧 Email Analysis</button>' +
      '    </div>' +
      '  </section>' +
      '  <section class="labs-gauges-grid">' +
      renderGaugeCardsHtml(gauges) +
      '  </section>' +
      '  <section class="labs-glass-card labs-single-dossier">' +
      '    <div class="labs-eyebrow">ACOUSTIC LABORATORY OBSERVATIONS</div>' +
      '    <div class="labs-single-facts-grid">' +
      '      <div class="labs-fact-box"><span>Signature Archetype</span><strong>' + esc(prof.profileTag) + '</strong></div>' +
      '      <div class="labs-fact-box"><span>Musical Equivalent</span><strong>' + esc(noteStr) + '</strong></div>' +
      (bonus
        ? '<div class="labs-fact-box"><span>Sound Twin</span><strong>' + esc(bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name) + '</strong></div>' +
          '<div class="labs-fact-box"><span>Official Alibi</span><strong>' + esc(bonus.social.a.verdict) + '</strong></div>'
        : '') +
      '    </div>' +
      '  </section>' +
      '  <section class="labs-single-charts-grid">' +
      '    <div class="labs-glass-card labs-chart-box">' +
      '      <div class="labs-chart-box-head"><span>40-Band FFT Energy Spectrum</span><small>Spectral Centroid ' + Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_spec"></canvas>' +
      '    </div>' +
      '    <div class="labs-glass-card labs-chart-box">' +
      '      <div class="labs-chart-box-head"><span>Pitch &amp; Frequency Sweep</span><small>32-frame F0 tracker</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_pitch"></canvas>' +
      '    </div>' +
      '    <div class="labs-glass-card labs-chart-box">' +
      '      <div class="labs-chart-box-head"><span>Modulation &amp; Flutter FFT (4–45 Hz)</span><small>Depth ' + (safeNum(feat.modDepth, 0) * 100).toFixed(0) + '%</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_mod"></canvas>' +
      '    </div>' +
      '    <div class="labs-glass-card labs-chart-box">' +
      '      <div class="labs-chart-box-head"><span>Blast Pressure Envelope</span><small>Attack / T50 / Decay</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_env"></canvas>' +
      '    </div>' +
      '  </section>' +
      '  <section class="labs-glass-card labs-spec-bay">' +
      '    <div class="labs-spec-bay-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">3D TIME-FREQUENCY TOPOLOGY</div>' +
      '        <h3 class="labs-section-title">Interactive 3D Spectrogram — ' + esc(label) + '</h3>' +
      '      </div>' +
      '      <div class="labs-spec-actions">' +
      '        <button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-s-play2">▶ Play &amp; Sweep</button>' +
      '        <button type="button" class="labs-btn-ghost labs-btn-sm labs-s-stop">⏹ Stop</button>' +
      '        <div class="labs-spec-presets">' +
      '          <button type="button" class="labs-mini-chip active" data-spreset="3d">3D</button>' +
      '          <button type="button" class="labs-mini-chip" data-spreset="top">Top</button>' +
      '          <button type="button" class="labs-mini-chip" data-spreset="side">Side</button>' +
      '          <button type="button" class="labs-mini-chip" data-spreset="spin">Spin</button>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <canvas class="labs-spec-canvas labs-single-spec-canvas" id="' + uid + 'spec3d"></canvas>' +
      '  </section>' +
      '</div>';

    animateGaugeRings(mountEl);

    function drawAllSingleCharts() {
      drawSpectrumPlot(mountEl.querySelector('#' + uid + 'c_spec'), feat, '#60A5FA');
      drawPitchContourPlot(mountEl.querySelector('#' + uid + 'c_pitch'), feat);
      drawModulationPlot(mountEl.querySelector('#' + uid + 'c_mod'), feat);
      drawEnvelopePlot(mountEl.querySelector('#' + uid + 'c_env'), feat);
    }

    var specCanvas = mountEl.querySelector('#' + uid + 'spec3d');
    if (Spectrogram3D && specCanvas) {
      spec = new Spectrogram3D(specCanvas, { spectrogram: feat.spectrogram, colormap: 'plasma' });
    }

    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(drawAllSingleCharts);
    } else {
      drawAllSingleCharts();
    }

    function playSingle() {
      Audio.playSound(sound.samples, sound.sampleRate, {
        channel: chan,
        onProgress: function (p) { if (spec) spec.setPlayhead(p); },
        onEnded: function () { if (spec) spec.setPlayhead(null); }
      });
    }

    mountEl.querySelector('.labs-s-play').addEventListener('click', playSingle);
    mountEl.querySelector('.labs-s-play2').addEventListener('click', playSingle);
    mountEl.querySelector('.labs-s-stop').addEventListener('click', function () {
      Audio.stopAll();
      if (spec) spec.setPlayhead(null);
    });

    var primBtn = mountEl.querySelector('.labs-single-primary');
    if (primBtn && opts.onPrimaryAction) {
      primBtn.addEventListener('click', function () { opts.onPrimaryAction(sound); });
    }
    mountEl.querySelector('.labs-s-share').addEventListener('click', function () {
      if (opts.onShare) opts.onShare(sound);
    });
    mountEl.querySelector('.labs-s-email-audio').addEventListener('click', function () {
      if (opts.onEmailAudio) opts.onEmailAudio(sound);
    });
    mountEl.querySelector('.labs-s-email-report').addEventListener('click', function () {
      if (opts.onEmailAnalysis) opts.onEmailAnalysis(sound);
    });

    var pBtns = mountEl.querySelectorAll('[data-spreset]');
    for (var pi = 0; pi < pBtns.length; pi++) {
      pBtns[pi].addEventListener('click', function () {
        if (!spec) return;
        var pr = this.getAttribute('data-spreset');
        if (pr === 'spin') {
          this.classList.toggle('active', spec.toggleAutoRotate());
        } else {
          for (var k = 0; k < pBtns.length; k++) {
            if (pBtns[k].getAttribute('data-spreset') !== 'spin') pBtns[k].classList.remove('active');
          }
          this.classList.add('active');
          spec.setPreset(pr);
        }
      });
    }

    return {
      resize: function () {
        drawAllSingleCharts();
        if (spec) spec.resize();
      },
      destroy: function () {
        if (spec) spec.destroy();
        spec = null;
        if (mountEl) mountEl.innerHTML = '';
      }
    };
  }

  /* ==================== 3: MULTI-FART COHERENT GROUP MEGAMIX ==================== */
  function buildGroupGauges(groupObj) {
    var m = (groupObj && groupObj.metrics) || {};
    var feat = (groupObj && groupObj.features) || {};
    var dynScore = Math.round(clamp((safeNum(feat.crestFactorDb, 9) / 17) * 100, 15, 99));
    var turbScore = Math.round(clamp(safeNum(feat.modDepth, 0.35) * 90, 12, 99));
    var spanScore = Math.round(clamp(safeNum(m.pitchSpanOctaves, 1) * 32 + 25, 18, 98));
    var blastScore = Math.round(clamp((safeNum(m.combinedBlastRadiusM, 6) / 20) * 100, 15, 99));

    var raw = [
      { id: 'g_coh', title: 'Ensemble Coherence', score: Math.round(clamp(safeNum(m.coherenceScore, 50), 0, 100)), sub: (m.count || 0) + ' Vault movements' },
      { id: 'g_span', title: 'Octave Coverage', score: spanScore, sub: safeNum(m.pitchSpanOctaves, 0).toFixed(2) + ' octaves span' },
      { id: 'g_turb', title: 'Collective Turbulence', score: turbScore, sub: Math.round(safeNum(feat.modRateHz, 0)) + ' Hz mod peak' },
      { id: 'g_wet', title: 'Aggregate Moisture', score: Math.round(clamp(safeNum(m.aggregateMoisturePct, 30), 0, 100)), sub: 'Combined Squelch Index' },
      { id: 'g_blast', title: 'Combined Blast Risk', score: blastScore, sub: safeNum(m.combinedBlastRadiusM, 4).toFixed(1) + 'm cumulative zone' },
      { id: 'g_dyn', title: 'Ensemble Dynamic Range', score: dynScore, sub: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB peak ratio' }
    ];

    return raw.map(function (g) {
      var st = gaugeStatus(g.score);
      return Object.assign({}, g, { status: st.label, color: st.color, tone: st.tone });
    });
  }

  function drawSegmentedWaveform(canvas, groupObj, progress) {
    var p = setupDarkPlot(canvas, 130);
    if (!p || !groupObj || !groupObj.samples || groupObj.samples.length === 0) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    var samples = groupObj.samples;
    var totalSec = Math.max(0.01, (groupObj.metrics && groupObj.metrics.totalDurationSec) || samples.length / 44100);
    var segs = groupObj.segments || [];

    function colorAtSec(sec) {
      for (var i = 0; i < segs.length; i++) {
        if (sec >= segs[i].startSec && sec <= segs[i].endSec) return segs[i].color;
      }
      return '#4B5563';
    }

    var stepPx = 3;
    var bars = Math.max(24, Math.floor(w / stepPx));
    var stride = Math.max(1, Math.floor(samples.length / bars));
    var maxPk = 0.001;
    var pks = new Float32Array(bars);
    for (var b = 0; b < bars; b++) {
      var sIdx = Math.floor((b / bars) * samples.length);
      var eIdx = Math.min(samples.length, sIdx + stride);
      var pk = 0;
      for (var k = sIdx; k < eIdx; k++) {
        var v = Math.abs(samples[k]);
        if (v > pk) pk = v;
      }
      pks[b] = pk;
      if (pk > maxPk) maxPk = pk;
    }

    for (var i = 0; i < bars; i++) {
      var frac = i / bars;
      var sec = frac * totalSec;
      var bh = Math.max(2, (pks[i] / maxPk) * (h * 0.68));
      ctx.fillStyle = colorAtSec(sec);
      if (typeof progress === 'number' && frac > progress) {
        ctx.globalAlpha = 0.42;
      } else {
        ctx.globalAlpha = 0.96;
      }
      ctx.fillRect(i * stepPx, h * 0.54 - bh * 0.5, 2, bh);
    }
    ctx.globalAlpha = 1;

    // Top movement tags
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    for (var s = 0; s < segs.length; s++) {
      var sx = (segs[s].startSec / totalSec) * w;
      var sw = Math.max(2, ((segs[s].endSec - segs[s].startSec) / totalSec) * w);
      ctx.fillStyle = segs[s].color;
      ctx.fillRect(sx, 0, sw, 4);
      if (sw > 44) {
        ctx.fillText(segs[s].name.slice(0, 12), sx + 3, 15);
      }
    }

    if (typeof progress === 'number') {
      var px = clamp(progress, 0, 1) * w;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
  }

  function drawConstellationPlot(canvas, groupObj) {
    var p = setupDarkPlot(canvas, 200);
    if (!p || !groupObj || !groupObj.segments) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 38, r: 16, t: 18, b: 26 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var segs = groupObj.segments;
    var logMin = Math.log2(45);
    var logMax = Math.log2(1600);

    for (var i = 0; i < segs.length; i++) {
      var sg = segs[i];
      var lx = clamp((Math.log2(clamp(sg.pitchHz || 140, 45, 1600)) - logMin) / (logMax - logMin), 0, 1);
      var ly = clamp((sg.wetnessPct || 25) / 100, 0, 1);
      var cx = pad.l + lx * pw;
      var cy = pad.t + ph - ly * ph;

      ctx.fillStyle = sg.color;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = '#E5E7EB';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = cx > w * 0.72 ? 'right' : 'left';
      ctx.fillText(sg.name.slice(0, 16), cx + (cx > w * 0.72 ? -10 : 10), cy + 3);
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('45Hz', pad.l, h - 7);
    ctx.fillText('100% Wet', 4, pad.t + 8);
    ctx.textAlign = 'right';
    ctx.fillText('1.6kHz ->', pad.l + pw, h - 7);
  }

  function renderGroupDashboard(mountEl, opts) {
    if (!mountEl || !opts || !opts.groupObj) {
      return { destroy: function () {}, resize: function () {} };
    }
    var g = opts.groupObj;
    var Spectrogram3D = root.TootApp.Spectrogram3D;
    var Audio = root.TootApp.Audio;
    var gauges = buildGroupGauges(g);
    var uid = 'lfg_' + (++gaugeUid) + '_';
    var chan = uid + 'MIX';
    var spec = null;
    var lastProg = null;

    var trackListHtml = (g.segments || [])
      .map(function (seg, idx) {
        return (
          '<span class="labs-seg-pill" style="border-color:' + seg.color + '">' +
          '  <i class="labs-seg-dot" style="background:' + seg.color + '"></i>' +
          '  <strong>' + (idx + 1) + '. ' + esc(seg.name) + '</strong> ' +
          '  <small>' + seg.durationSec.toFixed(2) + 's · ' + Math.round(seg.pitchHz) + 'Hz</small>' +
          '</span>'
        );
      })
      .join('');

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">COHERENT MULTI-FART MEGAMIX &amp; GROUP ANALYSIS</div>' +
      '        <h2 class="labs-fn-title">' + esc(g.name) + '</h2>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-green">' + g.metrics.totalDurationSec.toFixed(2) + 's Total</span>' +
      '    </div>' +
      '    <div class="labs-fn-single-actions">' +
      '      <button type="button" class="labs-btn labs-btn-emerald labs-btn-sm labs-g-play">▶ Play Combined Track</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-g-stop">⏹ Stop</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-g-email-audio">🎵 Email MP3</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-g-email-report">📧 Email Group Report</button>' +
      '    </div>' +
      '    <div class="labs-seg-pills-row">' + trackListHtml + '</div>' +
      '  </section>' +
      '  <section class="labs-glass-card labs-chart-box">' +
      '    <div class="labs-chart-box-head"><span>Composite Symphony Waveform</span><small>Color-coded Vault Movements</small></div>' +
      '    <canvas class="labs-2d-canvas" id="' + uid + 'c_wave" style="height:130px"></canvas>' +
      '  </section>' +
      '  <section class="labs-gauges-grid">' +
      renderGaugeCardsHtml(gauges) +
      '  </section>' +
      '  <section class="labs-glass-card labs-verdict-card">' +
      '    <div class="labs-eyebrow">GROUP COHERENCE TELEMETRY SUMMARY</div>' +
      '    <p class="labs-verdict-text">' + esc(g.metrics.groupVerdict) + '</p>' +
      '  </section>' +
      '  <section class="labs-single-charts-grid">' +
      '    <div class="labs-glass-card labs-chart-box">' +
      '      <div class="labs-chart-box-head"><span>Vault Specimen Map (Pitch × Moisture)</span><small>Spatial acoustic spread</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_map"></canvas>' +
      '    </div>' +
      '    <div class="labs-glass-card labs-chart-box">' +
      '      <div class="labs-chart-box-head"><span>Combined 40-Band FFT Spectrum</span><small>Aggregate frequency energy</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_spec"></canvas>' +
      '    </div>' +
      '  </section>' +
      '  <section class="labs-glass-card labs-spec-bay">' +
      '    <div class="labs-spec-bay-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">UNIFIED 3D SPECTROGRAM</div>' +
      '        <h3 class="labs-section-title">Combined Track Surface</h3>' +
      '      </div>' +
      '      <div class="labs-spec-presets">' +
      '        <button type="button" class="labs-mini-chip active" data-gpreset="3d">3D</button>' +
      '        <button type="button" class="labs-mini-chip" data-gpreset="top">Top</button>' +
      '        <button type="button" class="labs-mini-chip" data-gpreset="side">Side</button>' +
      '        <button type="button" class="labs-mini-chip" data-gpreset="spin">Spin</button>' +
      '      </div>' +
      '    </div>' +
      '    <canvas class="labs-spec-canvas labs-single-spec-canvas" id="' + uid + 'spec3d"></canvas>' +
      '  </section>' +
      '</div>';

    animateGaugeRings(mountEl);

    function drawGroupVisuals() {
      drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, lastProg);
      drawConstellationPlot(mountEl.querySelector('#' + uid + 'c_map'), g);
      drawSpectrumPlot(mountEl.querySelector('#' + uid + 'c_spec'), g.features, '#22C55E');
    }

    var specCanvas = mountEl.querySelector('#' + uid + 'spec3d');
    if (Spectrogram3D && specCanvas && g.features) {
      spec = new Spectrogram3D(specCanvas, { spectrogram: g.features.spectrogram, colormap: 'toxic' });
    }

    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(drawGroupVisuals);
    } else {
      drawGroupVisuals();
    }

    mountEl.querySelector('.labs-g-play').addEventListener('click', function () {
      Audio.playSound(g.samples, g.sampleRate, {
        channel: chan,
        onProgress: function (pr) {
          lastProg = pr;
          drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, pr);
          if (spec) spec.setPlayhead(pr);
        },
        onEnded: function () {
          lastProg = null;
          drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, null);
          if (spec) spec.setPlayhead(null);
        }
      });
    });

    mountEl.querySelector('.labs-g-stop').addEventListener('click', function () {
      Audio.stopAll();
      lastProg = null;
      drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, null);
      if (spec) spec.setPlayhead(null);
    });

    mountEl.querySelector('.labs-g-email-audio').addEventListener('click', function () {
      if (opts.onEmailAudio) opts.onEmailAudio(g);
    });
    mountEl.querySelector('.labs-g-email-report').addEventListener('click', function () {
      if (opts.onEmailAnalysis) opts.onEmailAnalysis(g);
    });

    var gBtns = mountEl.querySelectorAll('[data-gpreset]');
    for (var gi = 0; gi < gBtns.length; gi++) {
      gBtns[gi].addEventListener('click', function () {
        if (!spec) return;
        var pr = this.getAttribute('data-gpreset');
        if (pr === 'spin') {
          this.classList.toggle('active', spec.toggleAutoRotate());
        } else {
          for (var k = 0; k < gBtns.length; k++) {
            if (gBtns[k].getAttribute('data-gpreset') !== 'spin') gBtns[k].classList.remove('active');
          }
          this.classList.add('active');
          spec.setPreset(pr);
        }
      });
    }

    return {
      resize: function () {
        drawGroupVisuals();
        if (spec) spec.resize();
      },
      destroy: function () {
        if (spec) spec.destroy();
        spec = null;
        if (mountEl) mountEl.innerHTML = '';
      }
    };
  }

  TootLabs.Fartnalysis = {
    gaugeStatus: gaugeStatus,
    buildExecutiveGauges: buildExecutiveGauges,
    buildSingleGauges: buildSingleGauges,
    buildGroupGauges: buildGroupGauges,
    renderDashboard: renderDashboard,
    renderSingleDashboard: renderSingleDashboard,
    renderGroupDashboard: renderGroupDashboard
  };
})(typeof window !== 'undefined' ? window : globalThis);
