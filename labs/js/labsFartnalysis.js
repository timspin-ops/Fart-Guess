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

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">ACOUSTIC FORENSICS SUITE</div>' +
      '        <h2 class="labs-fn-title">' + esc(labelA) + ' <span class="labs-vs-arrow">vs</span> ' + esc(labelB) + '</h2>' +
      '      </div>' +
      '      <div class="labs-fn-score-chip">' +
      '        <span class="labs-fn-score-val">' + exactScore.toFixed(1) + '%</span>' +
      '        <span class="labs-fn-score-lbl">MATCH</span>' +
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

  TootLabs.Fartnalysis = {
    gaugeStatus: gaugeStatus,
    buildExecutiveGauges: buildExecutiveGauges,
    renderDashboard: renderDashboard
  };
})(typeof window !== 'undefined' ? window : globalThis);
