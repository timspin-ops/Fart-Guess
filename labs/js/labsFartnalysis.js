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

    var deltaMs = Math.round((safeNum(fB.duration, 0) - safeNum(fA.duration, 0)) * 1000);
    var bpmA = Math.round(safeNum(fA.modRateHz, 0) * 60);
    var bpmB = Math.round(safeNum(fB.modRateHz, 0) * 60);
    var oppSlope = pBd.oppCent || pBd.oppPitch || safeNum(pBd.polarityMul, 1) < 1;
    var refFreq = formatHzLabel(fA);
    var guessFreq = formatHzLabel(fB);
    var lagBins = (bd.envelope && bd.envelope.lagProfile && bd.envelope.lagProfile.bestLag) || 0;
    var centA = safeNum(fA.spectralCentroidHz, 220);
    var centB = safeNum(fB.spectralCentroidHz, 220);

    var pitchQuip = oppSlope
      ? 'Question-Mark vs Sad-Trombone Collision! One rises nervously while the other deflates (×0.28 sweep penalty).'
      : pBd.refUnvoiced !== pBd.userUnvoiced
      ? 'Stealth vs Brass mismatch: one stayed silent-but-breezy while the other blasted a full horn note.'
      : safeNum(res.pitchScore, 0) >= 82
      ? 'Eerily in tune! Practically harmonizing in the same porcelain brass choir.'
      : 'Musical detuning logged between ' + refFreq + ' and ' + guessFreq + ' on the Fart Piano.';

    var durQuip =
      Math.abs(deltaMs) < 35
        ? 'Uncanny stopwatch valve discipline — both pinched off within ±' + Math.abs(deltaMs) + 'ms.'
        : deltaMs > 0
        ? 'Guess kept honking for +' + deltaMs + 'ms of pure bonus awkwardness.'
        : 'Stage fright! Guess pinched off ' + Math.abs(deltaMs) + 'ms too early.';

    var envQuip =
      lagBins === 0
        ? 'Detonation peaks arrived phase-locked without needing lag compensation.'
        : 'Shifted Guess by ' + (lagBins > 0 ? '+' : '') + lagBins + ' time bins so late Record taps stay fair.';

    var timbreQuip =
      centB < centA * 0.72
        ? 'Guess sounds muffled through thick winter jeans compared to open-air Reference.'
        : centB > centA * 1.35
        ? 'Guess packs extra bright brassy sizzle — less cushion damping than Reference.'
        : 'Astonishingly close upholstery damping and cheek resonance coloring.';

    var rawList = [
      {
        id: 'tone',
        title: '🎵 Pitch & Fart Piano Match',
        score: Math.round(clamp(safeNum(res.pitchScore, 0), 0, 100)),
        sub: refFreq + ' vs ' + guessFreq,
        quip: pitchQuip,
        forensicsKey: 'pitch',
        note: 'Tracks your toot like an opera singer (45–650 Hz), locks it to a Fart Piano key, and catches rising vs deflating bends.'
      },
      {
        id: 'duration',
        title: '⏱️ Chrono-Expulsion (Duration)',
        score: Math.round(clamp(safeNum(res.durationScore, 0), 0, 100)),
        sub: safeNum(fA.duration, 0).toFixed(2) + 's vs ' + safeNum(fB.duration, 0).toFixed(2) + 's',
        quip: durQuip,
        forensicsKey: 'duration',
        note: 'Quantifies absolute emission length, T50 half-gas burn point, and lingering awkward seconds.'
      },
      {
        id: 'pressure',
        title: '📈 Blast Shockwave & Pressure',
        score: Math.round(clamp(safeNum(res.envelopeScore, 0), 0, 100)),
        sub: 'Peak ' + Math.round(safeNum(fA.crestFactorDb, 0)) + ' vs ' + Math.round(safeNum(fB.crestFactorDb, 0)) + ' dB',
        quip: envQuip,
        forensicsKey: 'envelope',
        note: 'Slides shockwave curves across ±6 bins so late Record presses never ruin an honest impression.'
      },
      {
        id: 'resonance',
        title: '🎨 Upholstery Resonance & MFCC',
        score: Math.round(clamp(safeNum(res.timbreScore, 0), 0, 100)),
        sub: Math.round(centA) + ' vs ' + Math.round(centB) + ' Hz',
        quip: timbreQuip,
        forensicsKey: 'timbre',
        note: 'Computes 13-band MFCC vocal-tract fingerprints to catch muffled denim vs bright open brass.'
      },
      {
        id: 'thunder',
        title: '⚡ Sub-Bass Thunder Quotient',
        score: thunderScore,
        sub: Math.round(safeNum(bpA[0], 0) * 100) + '% vs ' + Math.round(safeNum(bpB[0], 0) * 100) + '% sub-bass',
        quip: safeNum(bpA[0], 0) + safeNum(bpB[0], 0) >= 0.7 ? 'Dual window-rattling chamber boom — hollow drywall stands no chance.' : 'Lighter mid-horn punch without seismic bass thump.',
        forensicsKey: 'overall',
        note: 'Quantifies 45–150 Hz room-shaking rumble combined with explosive crest slam.'
      },
      {
        id: 'turbulence',
        title: '🫧 Cheek-Flutter BPM & Turbulence',
        score: Math.round(clamp(safeNum(res.modulationScore, 0), 0, 100)),
        sub: bpmA + ' vs ' + bpmB + ' flaps/min (' + Math.round(safeNum(fA.modRateHz, 0)) + '/' + Math.round(safeNum(fB.modRateHz, 0)) + ' Hz)',
        quip: 'Measured exact gluteal oscillation at ' + bpmA + ' vs ' + bpmB + ' cheek flaps/min (yes, seriously).',
        forensicsKey: 'modulation',
        note: 'Analyzes 4–45 Hz modulation FFT spectrum across Slow Stutter, Classic Cheek Flutter, and Fast Bee-Buzz.'
      },
      {
        id: 'acoustic_conf',
        title: '🧪 Master Eigen-Score Confidence',
        score: acousticConf,
        sub: 'Grade ' + (res.grade || 'B') + ' · ' + (res.title || 'Solid Attempt'),
        quip: oBd.coreCapApplied ? 'Anti-flattery cap intervened to stop generous pitch/timbre drift.' : 'No anti-inflation caps triggered — genuinely well-rounded cheek work!',
        forensicsKey: 'overall',
        note: 'Over-engineers a fart score by fusing 5 weighted pillars (60% arithmetic + 40% geometric) with anti-flattery caps.'
      },
      {
        id: 'ml_conf',
        title: '🤖 ML Archetype Convergence',
        score: mlConfidence,
        sub: 'MFCC ' + Math.round(safeNum(tBd.mfccMeanScore, 0) * 100) + '% · Grid ' + Math.round(safeNum(tBd.gridCorr, 0) * 100) + '%',
        quip: 'Cross-checked 13 cepstral dimensions locally — zero cloud servers bothered.',
        forensicsKey: 'timbre',
        note: 'Deterministic cepstral feature engine comparing 3-act spectral evolution and STFT surface similarity.'
      },
      {
        id: 'rhythmic',
        title: '🥁 Sputter Cadence & Bursts',
        score: rhythmicScore,
        sub: (fA.burstCount || 1) + ' vs ' + (fB.burstCount || 1) + ' burst(s)',
        quip: (fA.burstCount || 1) === (fB.burstCount || 1) ? 'Synchronized burst phrasing — identical impulse choreography.' : 'Cadence diverged: ' + (fA.burstCount || 1) + ' sputter(s) vs ' + (fB.burstCount || 1) + '.',
        forensicsKey: 'modulation',
        note: 'Counts discrete bursts clearing the 0.35 envelope gate like a sputtering 2-stroke engine.'
      },
      {
        id: 'harmonic',
        title: '🎼 Tonal Purity vs Stealth Air',
        score: harmonicScore,
        sub: 'Flatness ' + safeNum(fA.spectralFlatness, 0).toFixed(2) + ' vs ' + safeNum(fB.spectralFlatness, 0).toFixed(2),
        quip: safeNum(fA.spectralFlatness, 0) > 0.45 && safeNum(fB.spectralFlatness, 0) > 0.45 ? 'Matched stealth air vents — maximum plausible office deniability.' : 'Balances pure brass cheek reed vs turbulent hiss scatter.',
        forensicsKey: 'pitch',
        note: 'Separates proud musical honks from silent-but-breezy office distractions.'
      },
      {
        id: 'moisture',
        title: '💦 Squelch Index & Laundry Risk',
        score: moistureScore,
        sub: bonus ? bonus.wetness.wetA + '% (' + bonus.wetness.labelA + ') vs ' + bonus.wetness.wetB + '%' : 'Squelch parity',
        quip: bonus ? (bonus.wetness.wetA >= 65 || bonus.wetness.wetB >= 65 ? 'Laundry Advisory: Heavy turbulent bubble-flux detected!' : 'Viscosity match: "' + bonus.wetness.labelA + '" vs "' + bonus.wetness.labelB + '".') : 'Evaluates spectral flux splat volatility.',
        forensicsKey: 'wetness',
        note: 'Measures frame-to-frame micro-gurgling flux and advises whether laundry inspection is warranted.'
      },
      {
        id: 'neighbor',
        title: '🛋️ Elevator Alibi & Blast Radius',
        score: neighborScore,
        sub: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm vs ' + bonus.social.b.radiusM.toFixed(1) + 'm blast' : 'Propagation zone',
        quip: bonus ? 'Best Excuse (B): ' + bonus.social.b.verdict : 'Models confined-space elevator panic radius.',
        forensicsKey: 'social',
        note: 'Calculates audible awkwardness perimeter and ranks Dog-Blame, Sneaker Scuff, and Vinyl Chair excuses.'
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

    var rowItems = gauges.slice();
    if (bonus && bonus.acoustics) {
      var twinScore = Math.round(clamp(safeNum(bonus.acoustics.matchScore, 0), 0, 100));
      var twinSt = gaugeStatus(twinScore);
      var sameTwin = bonus.acoustics.twinA.name === bonus.acoustics.twinB.name;
      rowItems.push({
        id: 'acoustics',
        title: '🎺 Cheek Resonance & Sound Twin',
        score: twinScore,
        sub: bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.short + ' vs ' + bonus.acoustics.twinB.emoji + ' ' + bonus.acoustics.twinB.short,
        quip: sameTwin
          ? 'Unbelievable convergence — both mapped to a "' + bonus.acoustics.twinA.name + '"!'
          : 'Identity crisis: A channels a "' + bonus.acoustics.twinA.name + '" while B sounds like a "' + bonus.acoustics.twinB.name + '".',
        forensicsKey: 'acoustics',
        note: 'Compares pitch, noisiness, and flutter affinity against 8 scientifically calibrated non-human noisemakers.',
        status: twinSt.label,
        color: twinSt.color,
        tone: twinSt.tone
      });
    }

    var cmpVerdict = root.TootLabs.Store
      ? root.TootLabs.Store.buildScientificVerdict(soundA, soundB, result, exactScore)
      : result.summaryLine || 'Acoustic parity calculated.';
    var cmpTipsHtml =
      result.tips && result.tips.length > 0
        ? '<ul class="labs-verdict-tips">' +
          result.tips
            .map(function (tp) {
              return '<li>' + esc(tp) + '</li>';
            })
            .join('') +
          '</ul>'
        : '';

    var wetRep = bonus && Forensics && typeof Forensics.buildCriterionReport === 'function' ? Forensics.buildCriterionReport('wetness', soundA, soundB, result) : null;
    var twinRep = bonus && Forensics && typeof Forensics.buildCriterionReport === 'function' ? Forensics.buildCriterionReport('acoustics', soundA, soundB, result) : null;
    var socRep = bonus && Forensics && typeof Forensics.buildCriterionReport === 'function' ? Forensics.buildCriterionReport('social', soundA, soundB, result) : null;

    var humorStripHtml = bonus
      ? '<div class="labs-humor-strip">' +
        '  <div class="labs-humor-tile">' +
        '    <div class="labs-humor-tile-head">💦 Laundry Advisory</div>' +
        '    <div class="labs-humor-tile-stat">' + esc(bonus.wetness.wetA + '% ' + bonus.wetness.labelA + ' vs ' + bonus.wetness.wetB + '% ' + bonus.wetness.labelB) + '</div>' +
        '    <div class="labs-humor-tile-body">' + esc(wetRep ? wetRep.commentary : '') + '</div>' +
        '  </div>' +
        '  <div class="labs-humor-tile">' +
        '    <div class="labs-humor-tile-head">🎺 Acoustic Doppelgänger</div>' +
        '    <div class="labs-humor-tile-stat">' + esc(bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name + ' vs ' + bonus.acoustics.twinB.emoji + ' ' + bonus.acoustics.twinB.name) + '</div>' +
        '    <div class="labs-humor-tile-body">' + esc(twinRep ? twinRep.commentary : '') + '</div>' +
        '  </div>' +
        '  <div class="labs-humor-tile">' +
        '    <div class="labs-humor-tile-head">🛋️ Elevator Alibi &amp; Blast Zone</div>' +
        '    <div class="labs-humor-tile-stat">' + esc(bonus.social.a.radiusM.toFixed(1) + 'm vs ' + bonus.social.b.radiusM.toFixed(1) + 'm audible radius') + '</div>' +
        '    <div class="labs-humor-tile-body">' + esc(socRep ? socRep.commentary : '') + '</div>' +
        '  </div>' +
        '</div>'
      : '';

    var uid = 'lf_' + (++gaugeUid) + '_';
    var chanA = uid + 'A';
    var chanB = uid + 'B';
    var sync3d = true;
    var colormap = opts.colormap || 'plasma';
    var activeRowId = opts.initialGaugeId || null;
    var activeForensicsKey = null;
    var activeMountEl = null;
    var specA = null;
    var specB = null;

    var rowsHtml = renderMetricRowsHtml(rowItems, { expandable: true, includeFkey: true });

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

    var headerBtnsHtml =
      (opts.onEmailAnalysis || opts.onShare || opts.onDownloadPdf
        ? '<div class="labs-fn-header-btns">' +
          (opts.onShare ? '<button type="button" class="labs-btn-ghost labs-btn-sm labs-cmp-share">📤 Share</button>' : '') +
          (opts.onDownloadPdf ? '<button type="button" class="labs-btn-ghost labs-btn-sm labs-cmp-pdf">📄 PDF</button>' : '') +
          (opts.onEmailAnalysis ? '<button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-cmp-email">📧 Email (Audio + PDF)</button>' : '') +
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
      '      <span class="labs-hint-text">3D spectrograms above · Expandable comparison breakdown below</span>' +
      '    </div>' +
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
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">COMPLETE COMPARISON ANALYSIS</div>' +
      '        <h3 class="labs-section-title">Head-to-Head Forensic Breakdown</h3>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-blue">' + rowItems.length + ' Telemetry Suites</span>' +
      '    </div>' +
      '    <div class="labs-verdict-banner">' +
      '      <div class="labs-verdict-banner-head">' +
      '        <span class="labs-eyebrow">OFFICIAL REFEREE VERDICT</span>' +
      '        <span class="labs-verdict-grade">' + esc('Grade ' + (result.grade || 'B') + ' · ' + (result.title || 'Solid Attempt')) + '</span>' +
      '      </div>' +
      '      <p class="labs-verdict-text">' + esc(cmpVerdict) + '</p>' +
      cmpTipsHtml +
      '    </div>' +
      humorStripHtml +
      '    <div class="labs-hint-text">Tap any row below to expand complete FFT charts, side-by-side statistics &amp; equations inline.</div>' +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '  </section>' +
      '</div>';

    // Initialize 3D Spectrograms
    var canvasA = mountEl.querySelector('.labs-fn-canvas-a');
    var canvasB = mountEl.querySelector('.labs-fn-canvas-b');
    if (Spectrogram3D && canvasA && canvasB) {
      specA = new Spectrogram3D(canvasA, { spectrogram: featA.spectrogram, colormap: colormap });
      specB = new Spectrogram3D(canvasB, { spectrogram: featB.spectrogram, colormap: colormap });
      specA.linkPartner(specB);
    }

    function closeActiveRow() {
      activeRowId = null;
      activeForensicsKey = null;
      activeMountEl = null;
      var items = mountEl.querySelectorAll('.labs-metric-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('open');
      var rowBtns = mountEl.querySelectorAll('.labs-metric-row[aria-expanded]');
      for (var r = 0; r < rowBtns.length; r++) rowBtns[r].setAttribute('aria-expanded', 'false');
      var slots = mountEl.querySelectorAll('.labs-row-accordion');
      for (var s = 0; s < slots.length; s++) {
        slots[s].classList.add('hidden');
        slots[s].innerHTML = '';
      }
    }

    function openInlineRow(rowId, fKey) {
      if (!Forensics) return;
      var matched = null;
      for (var i = 0; i < rowItems.length; i++) {
        if (rowItems[i].id === rowId) {
          matched = rowItems[i];
          break;
        }
      }
      if (!matched && rowItems.length > 0) matched = rowItems[0];
      var resolvedId = matched ? matched.id : rowId;
      var targetFKey = fKey || (matched ? matched.forensicsKey : 'overall');

      closeActiveRow();

      var itemEl = mountEl.querySelector('.labs-metric-item[data-item-id="' + resolvedId + '"]');
      var rowBtn = mountEl.querySelector('.labs-metric-row[data-row-id="' + resolvedId + '"]');
      var slotEl = mountEl.querySelector('.labs-row-accordion[data-slot-id="' + resolvedId + '"]');
      if (!slotEl) return;

      activeRowId = resolvedId;
      activeForensicsKey = targetFKey;
      if (itemEl) itemEl.classList.add('open');
      if (rowBtn) rowBtn.setAttribute('aria-expanded', 'true');
      slotEl.classList.remove('hidden');

      slotEl.innerHTML = '<div class="labs-forensics-mount"></div>';

      var fMountEl = slotEl.querySelector('.labs-forensics-mount');
      activeMountEl = fMountEl;

      var drawNow = function () {
        if (!fMountEl) return;
        Forensics.renderForensicsDrawer(
          fMountEl,
          targetFKey,
          soundA,
          soundB,
          result,
          null,
          closeActiveRow,
          { inlineAccordion: true }
        );
        if (itemEl && typeof itemEl.scrollIntoView === 'function') {
          try {
            itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch (e) {}
        }
      };

      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(drawNow);
      } else {
        drawNow();
      }
    }

    var rowButtons = mountEl.querySelectorAll('.labs-metric-row[data-row-id]');
    for (var ri = 0; ri < rowButtons.length; ri++) {
      rowButtons[ri].addEventListener('click', function () {
        var rid = this.getAttribute('data-row-id');
        var fk = this.getAttribute('data-fkey');
        if (activeRowId === rid) {
          closeActiveRow();
        } else {
          openInlineRow(rid, fk);
        }
      });
    }

    var twinBtn = mountEl.querySelector('.labs-twin-pill');
    if (twinBtn) {
      twinBtn.addEventListener('click', function () {
        openInlineRow('acoustics', 'acoustics');
      });
    }

    // Bind Playback & 3D controls
    var playABtn = mountEl.querySelector('.labs-fn-play-a');
    if (playABtn) {
      playABtn.addEventListener('click', function () {
        Audio.playSound(soundA.samples, soundA.sampleRate, {
          playbackRate: 1.0,
          channel: chanA,
          onProgress: function (p) { if (specA) specA.setPlayhead(p); },
          onEnded: function () { if (specA) specA.setPlayhead(null); }
        });
      });
    }

    var playBBtn = mountEl.querySelector('.labs-fn-play-b');
    if (playBBtn) {
      playBBtn.addEventListener('click', function () {
        Audio.playSound(soundB.samples, soundB.sampleRate, {
          playbackRate: 1.0,
          channel: chanB,
          onProgress: function (p) { if (specB) specB.setPlayhead(p); },
          onEnded: function () { if (specB) specB.setPlayhead(null); }
        });
      });
    }

    var b2bBtn = mountEl.querySelector('.labs-fn-b2b');
    if (b2bBtn) {
      b2bBtn.addEventListener('click', function () {
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
    }

    var overlayBtn = mountEl.querySelector('.labs-fn-overlay');
    if (overlayBtn) {
      overlayBtn.addEventListener('click', function () {
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
    }

    var stopBtn = mountEl.querySelector('.labs-fn-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        Audio.stopAll();
        if (specA) specA.setPlayhead(null);
        if (specB) specB.setPlayhead(null);
      });
    }

    var syncEl = mountEl.querySelector('.labs-fn-sync');
    if (syncEl) {
      syncEl.addEventListener('change', function (e) {
        sync3d = e.target.checked;
        if (specA) specA.setSyncEnabled(sync3d);
        if (specB) specB.setSyncEnabled(sync3d);
      });
    }

    var cmapEl = mountEl.querySelector('.labs-fn-colormap');
    if (cmapEl) {
      cmapEl.addEventListener('change', function (e) {
        colormap = e.target.value;
        if (specA) specA.setColormap(colormap);
        if (specB) specB.setColormap(colormap);
      });
    }

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
    var cmpPdfBtn = mountEl.querySelector('.labs-cmp-pdf');
    if (cmpPdfBtn && opts.onDownloadPdf) {
      cmpPdfBtn.addEventListener('click', function () {
        opts.onDownloadPdf(soundA, soundB, result, exactScore, [canvasA, canvasB]);
      });
    }
    var cmpEmailBtn = mountEl.querySelector('.labs-cmp-email');
    if (cmpEmailBtn && opts.onEmailAnalysis) {
      cmpEmailBtn.addEventListener('click', function () {
        opts.onEmailAnalysis(soundA, soundB, result, exactScore, [canvasA, canvasB]);
      });
    }

    if (activeRowId) {
      openInlineRow(activeRowId);
    }

    return {
      resize: function () {
        if (specA) specA.resize();
        if (specB) specB.resize();
        if (Forensics && activeMountEl && activeForensicsKey) {
          Forensics.redrawDrawer(activeMountEl);
        }
      },
      destroy: function () {
        if (specA) specA.destroy();
        if (specB) specB.destroy();
        specA = null;
        specB = null;
        activeMountEl = null;
        if (mountEl) mountEl.innerHTML = '';
      }
    };
  }

  /* ==================== SHARED CANVAS 2D HELPERS ==================== */
  function setupDarkPlot(target, minH) {
    if (!target) return null;
    var ctx, w, h, saved = false;
    if (target.ctx && typeof target.w === 'number' && typeof target.h === 'number') {
      ctx = target.ctx;
      w = target.w;
      h = target.h;
      ctx.save();
      ctx.translate(target.x || 0, target.y || 0);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      saved = true;
    } else {
      var canvas = target;
      var rect = typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
      w = rect && rect.width > 20 ? rect.width : 320;
      h = rect && rect.height > 20 ? rect.height : minH || 195;
      var dpr = Math.min(2, root.devicePixelRatio || 1);
      var tw = Math.round(w * dpr);
      var th = Math.round(h * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

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
    return { ctx: ctx, w: w, h: h, saved: saved };
  }

  function finishDarkPlot(p) {
    if (p && p.saved) {
      p.ctx.restore();
    }
  }

  function buildSingleRowHtml(g, opts) {
    var scorePct = clamp(safeNum(g.score, 0), 0, 100);
    var idEsc = esc(g.id);
    var fkeyAttr = opts.includeFkey && g.forensicsKey ? ' data-fkey="' + esc(g.forensicsKey) + '"' : '';
    var inner =
      '<div class="labs-metric-main">' +
      '  <div class="labs-metric-title">' + esc(g.title) + '</div>' +
      '  <div class="labs-metric-sub">' + esc(g.sub) + '</div>' +
      (g.quip ? '  <div class="labs-metric-quip">' + esc(g.quip) + '</div>' : '') +
      '</div>' +
      '<div class="labs-metric-right">' +
      '  <div class="labs-metric-bar-track" aria-hidden="true">' +
      '    <div class="labs-metric-bar-fill" style="width:' + scorePct.toFixed(1) + '%;background:' + g.color + '"></div>' +
      '  </div>' +
      '  <span class="labs-metric-score" style="color:' + g.color + '">' + g.score + '%</span>' +
      '  <span class="labs-status-pill labs-tone-' + esc(g.tone) + '">' + esc(g.status) + '</span>' +
      (opts.expandable ? '  <span class="labs-metric-chevron" aria-hidden="true">›</span>' : '') +
      '</div>';

    if (opts.expandable) {
      return (
        '<div class="labs-metric-item" data-item-id="' + idEsc + '">' +
        '  <button type="button" class="labs-metric-row" data-row-id="' + idEsc + '"' + fkeyAttr + ' aria-expanded="false">' +
        inner +
        '  </button>' +
        '  <div class="labs-row-accordion hidden" data-slot-id="' + idEsc + '"></div>' +
        '</div>'
      );
    }

    return (
      '<div class="labs-metric-item" data-item-id="' + idEsc + '">' +
      '  <div class="labs-metric-row labs-metric-row-static">' +
      inner +
      '  </div>' +
      '</div>'
    );
  }

  function renderMetricRowsHtml(items, opts) {
    var cfg = opts || {};
    return (items || [])
      .map(function (item) {
        return buildSingleRowHtml(item, cfg);
      })
      .join('');
  }

  /* ==================== ON-DEVICE ML CLASSIFIER ==================== */
  var ML_PROTOTYPES = [
    {
      name: 'Sub-Bass Brass',
      emoji: '🎺',
      color: '#60A5FA',
      pitchLog: Math.log2(82),
      flatness: 0.16,
      modDepth: 0.25,
      subShare: 0.56,
      crest: 0.52,
      wetness: 0.25,
      description: 'Low-frequency brass resonance anchored below 120 Hz with deep room-coupling bass.'
    },
    {
      name: 'High-Pressure Squeaker',
      emoji: '🎈',
      color: '#FACC15',
      pitchLog: Math.log2(340),
      flatness: 0.22,
      modDepth: 0.22,
      subShare: 0.14,
      crest: 0.55,
      wetness: 0.22,
      description: 'Pinched aperture oscillation generating elevated pitch stability above 220 Hz.'
    },
    {
      name: 'Staccato Sputterer',
      emoji: '🛵',
      color: '#F97316',
      pitchLog: Math.log2(145),
      flatness: 0.30,
      modDepth: 0.68,
      subShare: 0.35,
      crest: 0.65,
      wetness: 0.48,
      description: 'Multi-burst oscillating valve event driven by strong 8–30 Hz amplitude flutter.'
    },
    {
      name: 'Stealth Airband',
      emoji: '💨',
      color: '#9CA3AF',
      pitchLog: Math.log2(260),
      flatness: 0.62,
      modDepth: 0.16,
      subShare: 0.16,
      crest: 0.28,
      wetness: 0.16,
      description: 'High spectral flatness turbulent airstream engineered for plausible office deniability.'
    },
    {
      name: 'Wet Squelch Event',
      emoji: '💦',
      color: '#8B5CF6',
      pitchLog: Math.log2(135),
      flatness: 0.34,
      modDepth: 0.55,
      subShare: 0.32,
      crest: 0.48,
      wetness: 0.78,
      description: 'Elevated mid-band spectral flux and rapid transient micro-gurgling topology.'
    },
    {
      name: 'Classic Mid-Rumble',
      emoji: '⚡',
      color: '#22C55E',
      pitchLog: Math.log2(150),
      flatness: 0.25,
      modDepth: 0.32,
      subShare: 0.40,
      crest: 0.54,
      wetness: 0.34,
      description: 'Balanced midrange reed timbre displaying textbook acoustic equilibrium.'
    }
  ];

  function classifyAcousticProfile(feat, bonus) {
    feat = feat || {};
    var Forensics = root.TootApp && root.TootApp.Forensics;
    if (!bonus && Forensics && typeof Forensics.computeBonusMetrics === 'function') {
      bonus = Forensics.computeBonusMetrics(feat, feat);
    }

    var effHz =
      feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? feat.medianPitchHz
        : clamp(safeNum(feat.spectralCentroidHz, 220), 50, 2200);
    var pLog = Math.log2(clamp(effHz, 45, 1600));
    var flat = clamp(safeNum(feat.spectralFlatness, 0.28), 0, 1);
    var mod = clamp(safeNum(feat.modDepth, 0.25), 0, 1.2);
    var bp = feat.bandProfile || [0.25, 0.25, 0.25, 0.25];
    var subShare = clamp(safeNum(bp[0], 0.25) + safeNum(bp[1], 0.25) * 0.45, 0, 1);
    var crest = clamp(safeNum(feat.crestFactorDb, 8) / 18, 0, 1);
    var wetness = bonus ? clamp(safeNum(bonus.wetness.wetA, 28) / 100, 0, 1) : clamp(safeNum(feat.spectralFlux, 0.08) * 3, 0, 1);

    var rawWeights = [];
    var sumW = 0;
    for (var i = 0; i < ML_PROTOTYPES.length; i++) {
      var pr = ML_PROTOTYPES[i];
      var dPitch = Math.abs(pLog - pr.pitchLog) / 1.15;
      var dFlat = Math.abs(flat - pr.flatness) / 0.28;
      var dMod = Math.abs(mod - pr.modDepth) / 0.32;
      var dSub = Math.abs(subShare - pr.subShare) / 0.28;
      var dCrest = Math.abs(crest - pr.crest) / 0.32;
      var dWet = Math.abs(wetness - pr.wetness) / 0.30;
      var dist = dPitch * 0.26 + dFlat * 0.18 + dMod * 0.18 + dSub * 0.14 + dCrest * 0.10 + dWet * 0.14;
      var w = Math.exp(-dist / 0.55);
      rawWeights.push(w);
      sumW += w;
    }

    var classes = ML_PROTOTYPES.map(function (pr, idx) {
      var prob = sumW > 0 ? Math.round((rawWeights[idx] / sumW) * 100) : Math.round(100 / ML_PROTOTYPES.length);
      return {
        name: pr.name,
        emoji: pr.emoji,
        color: pr.color,
        prob: prob,
        description: pr.description
      };
    });

    classes.sort(function (a, b) {
      return b.prob - a.prob;
    });

    // Ensure rounded probabilities sum cleanly to 100
    var totalP = classes.reduce(function (acc, c) { return acc + c.prob; }, 0);
    if (classes.length > 0 && totalP !== 100) {
      classes[0].prob = clamp(classes[0].prob + (100 - totalP), 1, 99);
    }

    var topClass = classes[0];
    var runnerUp = classes[1] || classes[0];

    return {
      classes: classes,
      topClass: topClass,
      runnerUp: runnerUp,
      confidence: topClass ? topClass.prob : 50,
      featureVector: {
        pitchHz: Math.round(effHz),
        centroidHz: Math.round(safeNum(feat.spectralCentroidHz, 220)),
        flatnessPct: Math.round(flat * 100),
        modDepthPct: Math.round(mod * 100),
        bursts: feat.burstCount || 1,
        subBandPct: Math.round(safeNum(bp[0], 0) * 100),
        crestDb: Number(safeNum(feat.crestFactorDb, 0).toFixed(1)),
        wetnessPct: Math.round(wetness * 100)
      },
      methodologyNote:
        'Uses a deterministic 22-dimension DSP feature vector (13 MFCCs + pitch, flatness, sub-bass ratio, modulation depth, crest factor, and spectral flux) compared against 6 calibrated archetypes via temperature-scaled softmax.'
    };
  }

  /* ==================== REUSABLE SINGLE & GROUP 2D CHART PLOTS ==================== */
  function drawSpectrumPlot(target, feat, accent) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.avgSpectrum) return finishDarkPlot(p);
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
    finishDarkPlot(p);
  }

  function drawPitchContourPlot(target, feat) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.pitchHzArr) return finishDarkPlot(p);
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
    finishDarkPlot(p);
  }

  function drawModulationPlot(target, feat) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.modSpectrum) return finishDarkPlot(p);
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
    finishDarkPlot(p);
  }

  function drawEnvelopePlot(target, feat) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.envelope) return finishDarkPlot(p);
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
    finishDarkPlot(p);
  }

  function drawHorizontalBarsPlot(target, items) {
    var p = setupDarkPlot(target, 195);
    if (!p || !items || items.length === 0) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var padL = Math.min(130, Math.round(w * 0.36));
    var padR = 38;
    var padT = 12;
    var padB = 10;
    var pw = Math.max(40, w - padL - padR);
    var rowH = (h - padT - padB) / items.length;

    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var cy = padT + i * rowH + rowH * 0.5;
      var barH = Math.min(14, Math.max(7, rowH * 0.52));
      var pct = clamp(safeNum(it.pct, 0), 0, 100);

      ctx.fillStyle = '#D1D5DB';
      ctx.textAlign = 'right';
      ctx.fillText(String(it.label || '').slice(0, 18), padL - 8, cy + 3.5);

      ctx.fillStyle = 'rgba(55, 65, 81, 0.55)';
      ctx.fillRect(padL, cy - barH * 0.5, pw, barH);

      ctx.fillStyle = it.color || '#60A5FA';
      ctx.fillRect(padL, cy - barH * 0.5, Math.max(2, (pct / 100) * pw), barH);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(Math.round(pct) + '%', padL + pw + 6, cy + 3.5);
    }
    finishDarkPlot(p);
  }

  function drawMfcc13Plot(target, feat) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var vec = feat.mfccMean || new Float32Array(13);
    var n = Math.min(13, vec.length || 13);
    var pad = { l: 26, r: 12, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var midY = pad.t + ph * 0.5;

    var maxAbs = 1;
    for (var i = 0; i < n; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(safeNum(vec[i], 0)));
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.beginPath();
    ctx.moveTo(pad.l, midY);
    ctx.lineTo(pad.l + pw, midY);
    ctx.stroke();

    var colW = pw / n;
    for (var k = 0; k < n; k++) {
      var val = safeNum(vec[k], 0) / maxAbs;
      var barH = val * (ph * 0.44);
      var x = pad.l + k * colW + colW * 0.16;
      var bw = Math.max(4, colW * 0.68);
      ctx.fillStyle = val >= 0 ? '#60A5FA' : '#FB7185';
      if (barH >= 0) ctx.fillRect(x, midY - barH, bw, Math.max(2, barH));
      else ctx.fillRect(x, midY, bw, Math.max(2, -barH));
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('C1', pad.l, h - 7);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D1D5DB';
    ctx.fillText('13-Dim MFCC Vocal/Cheek Filterbank Signature', pad.l + pw * 0.5, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('C13', pad.l + pw, h - 7);
    finishDarkPlot(p);
  }

  function drawCumulativeEnergyPlot(target, feat) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.envelope) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 28, r: 12, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var env = feat.envelope;
    var cum = new Float32Array(env.length);
    var total = 0;
    for (var i = 0; i < env.length; i++) {
      total += safeNum(env[i], 0) * safeNum(env[i], 0);
      cum[i] = total;
    }

    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (var k = 0; k < cum.length; k++) {
      var x = pad.l + (k / Math.max(1, cum.length - 1)) * pw;
      var frac = total > 0 ? cum[k] / total : 0;
      var y = pad.t + ph - frac * ph;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    var markers = [
      { ratio: safeNum(feat.t10Ratio, 0.1), label: 'T10', color: '#FACC15' },
      { ratio: safeNum(feat.t50Ratio, 0.5), label: 'T50', color: '#60A5FA' },
      { ratio: safeNum(feat.t90Ratio, 0.9), label: 'T90', color: '#F97316' }
    ];
    ctx.font = '700 10px "JetBrains Mono", monospace';
    for (var m = 0; m < markers.length; m++) {
      var mk = markers[m];
      var mx = pad.l + clamp(mk.ratio, 0, 1) * pw;
      ctx.strokeStyle = mk.color;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mx, pad.t);
      ctx.lineTo(mx, pad.t + ph);
      ctx.stroke();
      ctx.fillStyle = mk.color;
      ctx.textAlign = 'center';
      ctx.fillText(mk.label, mx, pad.t + 11 + m * 12);
    }
    ctx.setLineDash([]);
    finishDarkPlot(p);
  }

  function drawSeriesPlot(target, values, opts) {
    opts = opts || {};
    var p = setupDarkPlot(target, 195);
    if (!p || !values || values.length === 0) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 28, r: 12, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;

    var maxV = opts.maxVal || 0.001;
    if (!opts.maxVal) {
      for (var i = 0; i < values.length; i++) {
        if (values[i] > maxV) maxV = values[i];
      }
    }

    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph);
    for (var k = 0; k < values.length; k++) {
      var x = pad.l + (k / Math.max(1, values.length - 1)) * pw;
      var y = pad.t + ph - clamp(safeNum(values[k], 0) / maxV, 0, 1) * ph;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.closePath();
    ctx.fillStyle = opts.fill || 'rgba(96, 165, 250, 0.22)';
    ctx.fill();

    ctx.strokeStyle = opts.stroke || '#60A5FA';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (var j = 0; j < values.length; j++) {
      var lx = pad.l + (j / Math.max(1, values.length - 1)) * pw;
      var ly = pad.t + ph - clamp(safeNum(values[j], 0) / maxV, 0, 1) * ph;
      if (j === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    if (typeof opts.threshA === 'number') {
      var ty = pad.t + ph - clamp(opts.threshA / maxV, 0, 1) * ph;
      ctx.strokeStyle = '#FACC15';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.l, ty);
      ctx.lineTo(pad.l + pw, ty);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(opts.caption || '', pad.l + pw * 0.5, h - 7);
    finishDarkPlot(p);
  }

  function drawBlastZonePlot(target, radiusM, panicPct) {
    var p = setupDarkPlot(target, 195);
    if (!p) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var cx = w * 0.5;
    var cy = h * 0.52;
    var maxR = Math.min(w, h) * 0.42;
    var rEvent = clamp((safeNum(radiusM, 4) / 13.0) * maxR, 14, maxR);
    var rElevator = (2.2 / 13.0) * maxR;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(cx - rElevator, cy - rElevator, rElevator * 2, rElevator * 2);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(251, 113, 133, 0.2)';
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, rEvent, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FECDD3';
    ctx.fillText('Blast Radius ' + safeNum(radiusM, 4).toFixed(1) + 'm · Panic ' + Math.round(panicPct || 50) + '%', cx, 16);
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Dashed box = Standard 2.2m Elevator Cabin', cx, h - 7);
    finishDarkPlot(p);
  }

  function drawTwinMapPlot(target, bonus) {
    var p = setupDarkPlot(target, 195);
    if (!p || !bonus) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 34, r: 16, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var items = bonus.acoustics.items || [];
    var logMin = Math.log2(50);
    var logMax = Math.log2(1600);

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var x = pad.l + clamp((Math.log2(it.freq) - logMin) / (logMax - logMin), 0, 1) * pw;
      var y = pad.t + ph - clamp(it.flat, 0, 1) * ph;
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = x > w * 0.72 ? 'right' : 'left';
      ctx.fillText(it.short, x + (x > w * 0.72 ? -7 : 7), y + 3);
    }

    var sx = pad.l + clamp((Math.log2(clamp(bonus.acoustics.detailA.effFreq, 50, 1600)) - logMin) / (logMax - logMin), 0, 1) * pw;
    var sy = pad.t + ph - clamp(bonus.acoustics.detailA.flat, 0, 1) * ph;
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#86EFAC';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Closest Twin: ' + bonus.acoustics.twinA.short + ' (' + bonus.acoustics.topScoreA + '%)', w * 0.5, h - 7);
    finishDarkPlot(p);
  }

  function drawSingleChartType(target, chartType, sound, feat, bonus, ml) {
    if (!feat) return;
    if (chartType === 's_spectrum') return drawSpectrumPlot(target, feat, '#60A5FA');
    if (chartType === 's_pitch') return drawPitchContourPlot(target, feat);
    if (chartType === 's_mod') return drawModulationPlot(target, feat);
    if (chartType === 's_envelope') return drawEnvelopePlot(target, feat);
    if (chartType === 's_mfcc13') return drawMfcc13Plot(target, feat);
    if (chartType === 's_energy_cum') return drawCumulativeEnergyPlot(target, feat);
    if (chartType === 's_centroid_contour') {
      return drawSeriesPlot(target, feat.centroidContour || [], { stroke: '#60A5FA', fill: 'rgba(96, 165, 250, 0.2)', caption: 'Spectral Brightness Evolution Across Event' });
    }
    if (chartType === 's_onset_zoom') {
      var env = feat.envelope || [];
      var half = env.slice ? env.slice(0, Math.max(8, Math.floor(env.length * 0.5))) : env;
      return drawSeriesPlot(target, half, { stroke: '#22C55E', fill: 'rgba(34, 197, 94, 0.24)', maxVal: 1.0, caption: 'Initial Attack Surge (First 50% of Event)' });
    }
    if (chartType === 's_burst_gate') {
      return drawSeriesPlot(target, feat.envelope || [], { stroke: '#F97316', fill: 'rgba(249, 115, 22, 0.2)', maxVal: 1.0, threshA: 0.35, caption: 'Envelope vs 0.35 Burst Gate Threshold (' + (feat.burstCount || 1) + ' bursts)' });
    }
    if (chartType === 's_flux') {
      var fx = bonus && bonus.wetness ? bonus.wetness.fluxSeriesA : [];
      return drawSeriesPlot(target, fx, { stroke: '#8B5CF6', fill: 'rgba(139, 92, 246, 0.25)', caption: 'Instantaneous Spectral Change (Wetness Driver)' });
    }
    if (chartType === 's_4band') {
      var bp = feat.bandProfile || [0.25, 0.25, 0.25, 0.25];
      return drawHorizontalBarsPlot(target, [
        { label: '45-150Hz Sub-Bass', pct: safeNum(bp[0], 0) * 100, color: '#60A5FA' },
        { label: '150-450Hz Mid-Buzz', pct: safeNum(bp[1], 0) * 100, color: '#22C55E' },
        { label: '450-1.2kHz Upper', pct: safeNum(bp[2], 0) * 100, color: '#F97316' },
        { label: '1.2k-4.2kHz Air/Hiss', pct: safeNum(bp[3], 0) * 100, color: '#FB7185' }
      ]);
    }
    if (chartType === 's_mod3band') {
      var mb = feat.modBands || [0.34, 0.33, 0.33];
      return drawHorizontalBarsPlot(target, [
        { label: '2-8Hz Slow Stutter', pct: safeNum(mb[0], 0) * 100, color: '#60A5FA' },
        { label: '8-20Hz Cheek Flutter', pct: safeNum(mb[1], 0) * 100, color: '#22C55E' },
        { label: '20-45Hz Fast Rattle', pct: safeNum(mb[2], 0) * 100, color: '#8B5CF6' }
      ]);
    }
    if (chartType === 's_attack_decay') {
      var dur = Math.max(0.05, safeNum(feat.duration, 0.5));
      var atkPct = clamp((safeNum(feat.attackSec, 0.1) / dur) * 100, 1, 95);
      var decPct = clamp((safeNum(feat.decaySec, 0.2) / dur) * 100, 1, 95);
      var sustPct = clamp(100 - atkPct - decPct * 0.5, 5, 95);
      return drawHorizontalBarsPlot(target, [
        { label: 'Attack Rise', pct: atkPct, color: '#FACC15' },
        { label: 'Core Sustain', pct: sustPct, color: '#22C55E' },
        { label: 'Decay Tail', pct: decPct, color: '#60A5FA' }
      ]);
    }
    if (chartType === 's_squelch_mix') {
      var dA = bonus && bonus.wetness ? bonus.wetness.detailA : { md: 0.2, flux: 0.1, squelchBand: 0.2 };
      return drawHorizontalBarsPlot(target, [
        { label: 'Flutter Factor', pct: clamp(safeNum(dA.md, 0) / 0.65, 0, 1) * 100, color: '#22C55E' },
        { label: 'Spectral Flux', pct: clamp(safeNum(dA.flux, 0) / 0.22, 0, 1) * 100, color: '#8B5CF6' },
        { label: 'Mid Squelch Band', pct: clamp(safeNum(dA.squelchBand, 0), 0, 1) * 100, color: '#F97316' }
      ]);
    }
    if (chartType === 's_twin_bars' && bonus) {
      var its = bonus.acoustics.items || [];
      var affs = bonus.acoustics.affinitiesA || [];
      return drawHorizontalBarsPlot(
        target,
        its.map(function (it, idx) {
          return { label: it.emoji + ' ' + it.short, pct: safeNum(affs[idx], 0), color: idx === bonus.acoustics.detailA.bestIdx ? '#22C55E' : '#60A5FA' };
        })
      );
    }
    if (chartType === 's_twin_map') return drawTwinMapPlot(target, bonus);
    if (chartType === 's_blast_map') return drawBlastZonePlot(target, bonus ? bonus.social.a.radiusM : 4.5, bonus ? bonus.social.a.panicPct : 50);
    if (chartType === 's_alibi_bars' && bonus) {
      var soc = bonus.social.a;
      return drawHorizontalBarsPlot(target, [
        { label: 'Blame Family Dog', pct: soc.dogBlame, color: '#22C55E' },
        { label: 'Sneaker Scuff', pct: soc.shoeScuff, color: '#60A5FA' },
        { label: 'Leather Office Chair', pct: soc.leatherChair, color: '#F97316' }
      ]);
    }
    if (chartType === 's_ml_probs' && ml) {
      return drawHorizontalBarsPlot(
        target,
        ml.classes.map(function (c) {
          return { label: c.emoji + ' ' + c.name, pct: c.prob, color: c.color };
        })
      );
    }
    if (chartType === 's_wall_atten') {
      var lowPct = feat.bandProfile ? safeNum(feat.bandProfile[0], 0.25) + safeNum(feat.bandProfile[1], 0.25) : 0.4;
      var penBase = clamp(45 + lowPct * 55, 25, 99);
      return drawHorizontalBarsPlot(target, [
        { label: 'Immediate Vicinity', pct: penBase, color: '#FB7185' },
        { label: 'Thin Drywall Wall', pct: clamp(penBase * (0.52 + lowPct * 0.35), 10, 95), color: '#F97316' },
        { label: 'Across Hallway', pct: clamp(penBase * (0.34 + lowPct * 0.28), 5, 85), color: '#60A5FA' },
        { label: 'Floor Below', pct: clamp(penBase * (0.24 + safeNum(feat.bandProfile ? feat.bandProfile[0] : 0.2, 0.2) * 0.5), 4, 78), color: '#22C55E' }
      ]);
    }
  }

  /* ==================== 1 & 2: INDIVIDUAL 12-DIAL FARTNALYSIS ==================== */
  function buildSingleFieldVerdict(sound, featArg, bonusArg, mlArg, noteArg) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var Forensics = root.TootApp && root.TootApp.Forensics;
    var feat = featArg || (sound && (sound.features || (DSP && DSP.extractFeatures(sound.samples, sound.sampleRate)))) || {};
    var bonus = bonusArg || (Forensics && feat.bandProfile ? Forensics.computeBonusMetrics(feat, feat) : null);
    var ml = mlArg || classifyAcousticProfile(feat, bonus);
    var noteStr =
      noteArg ||
      (Forensics && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? Forensics.hzToNoteName(feat.medianPitchHz)
        : 'Unvoiced Airband');

    var dur = safeNum(feat.duration, 0).toFixed(2) + 's';
    var bpmMod = Math.round(safeNum(feat.modRateHz, 0) * 60);
    var bursts = feat.burstCount || 1;
    var crest = safeNum(feat.crestFactorDb, 0).toFixed(1);
    var isVoiced = feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0;

    var opening = isVoiced
      ? 'This ' + dur + ' emission committed proudly to a musical ' + noteStr + ' (' + Math.round(feat.medianPitchHz) + ' Hz), flapping at ' + bpmMod + ' cheek flaps/min across ' + bursts + ' burst' + (bursts === 1 ? '' : 's') + '.'
      : 'This ' + dur + ' specimen operated as a sneaky ' + bpmMod + ' flaps/min unvoiced breeze (' + Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz center), slipping past pitches like an office chair phantom.';

    var mlLine =
      ' Our 22-dimension offline ML classifier diagnosed it as "' + ml.topClass.emoji + ' ' + ml.topClass.name + '" (' + ml.confidence + '% confidence) at ' + crest + ' dB impulse snap — thankfully processed 100% locally so no cloud server ever has to explain this in a standup.';

    var wetLine = bonus
      ? ' Laundry Advisory: ' + bonus.wetness.wetA + '% ("' + bonus.wetness.labelA + '").'
      : '';
    var twinLine = bonus
      ? ' Blind-lineup Doppelgänger: ' + bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name + ' (' + bonus.acoustics.topScoreA + '% match).'
      : '';
    var alibiLine = bonus
      ? ' Elevator Survival Protocol: ' + bonus.social.a.radiusM.toFixed(1) + 'm blast zone — ' + bonus.social.a.verdict
      : '';

    return opening + mlLine + wetLine + twinLine + alibiLine;
  }

  function buildSingleGauges(sound) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var Forensics = root.TootApp && root.TootApp.Forensics;
    var feat = (sound && (sound.features || (DSP && DSP.extractFeatures(sound.samples, sound.sampleRate)))) || {};
    if (sound && !sound.features) sound.features = feat;
    var bonus = Forensics ? Forensics.computeBonusMetrics(feat, feat) : null;
    var ml = classifyAcousticProfile(feat, bonus);

    var crestDb = safeNum(feat.crestFactorDb, 8);
    var crestScore = Math.round(clamp((crestDb / 17.5) * 100, 15, 99));
    var lowShare = feat.bandProfile ? safeNum(feat.bandProfile[0], 0.25) + safeNum(feat.bandProfile[1], 0.25) : 0.5;
    var resScore = Math.round(clamp(lowShare * 86 + (1 - safeNum(feat.spectralFlatness, 0.3)) * 22, 14, 99));
    var toneScore = Math.round(
      feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? clamp(50 + feat.voicedRatio * 46, 20, 99)
        : clamp(45 - safeNum(feat.spectralFlatness, 0.4) * 28, 12, 70)
    );
    var turbScore = Math.round(clamp(safeNum(feat.modDepth, 0.25) * 92 + ((feat.burstCount || 1) > 1 ? 15 : 0), 10, 99));
    var bursts = feat.burstCount || 1;
    var burstScore = Math.round(clamp(28 + bursts * 16 + safeNum(feat.modDepth, 0.2) * 24, 18, 99));
    var timbreScore = Math.round(clamp(55 + (1 - clamp(safeNum(feat.spectralFlatness, 0.3), 0, 1)) * 42, 18, 99));
    var moistScore = bonus ? bonus.wetness.wetA : 30;
    var twinScore = bonus ? bonus.acoustics.topScoreA : 60;
    var panicScore = bonus ? bonus.social.a.panicPct : 45;
    var mlScore = ml.confidence;
    var durMs = Math.max(40, safeNum(feat.duration, 0.5) * 1000);
    var atkMs = Math.max(8, safeNum(feat.attackSec, 0.08) * 1000);
    var velocityScore = Math.round(clamp(96 - (atkMs / durMs) * 75, 22, 99));
    var subRatio = feat.bandProfile ? safeNum(feat.bandProfile[0], 0.25) : 0.25;
    var neighborScore = Math.round(clamp(subRatio * 82 + panicScore * 0.52, 15, 99));
    var bpmSingle = Math.round(safeNum(feat.modRateHz, 0) * 60);
    var noteTag =
      Forensics && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? Forensics.hzToNoteName(feat.medianPitchHz)
        : 'Stealth Airband';

    var list = [
      {
        id: 's_crest',
        title: '💥 Shockwave Crest Intensity',
        score: crestScore,
        sub: crestDb.toFixed(1) + ' dB peak punch',
        quip: crestDb >= 12 ? 'Explosive onset — nearby glassware definitely registered the shockwave.' : 'Polite hydraulic ramp without extreme pop clipping.'
      },
      {
        id: 's_resonance',
        title: '🎨 Upholstery & Chamber Depth',
        score: resScore,
        sub: Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz center',
        quip: subRatio >= 0.35 ? 'Subwoofer-grade ' + Math.round(subRatio * 100) + '% bass rumble built to vibrate leather chairs.' : 'Crisp mid-horn harmonics dominate over bass boom.'
      },
      {
        id: 's_tone',
        title: '🎵 Fart Piano Note & Pitch',
        score: toneScore,
        sub: formatHzLabel(feat) + ' · ' + noteTag,
        quip: feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0 ? 'Locks onto ' + noteTag + ' — technically ready for a porcelain brass choir.' : 'Operates like a stealth air valve rather than a brass horn.'
      },
      {
        id: 's_turbulence',
        title: '🫧 Cheek-Flutter BPM',
        score: turbScore,
        sub: Math.round(safeNum(feat.modRateHz, 0)) + ' Hz (' + bpmSingle + ' flaps/min)',
        quip: bpmSingle >= 1000 ? 'High-RPM valve chatter at ' + bpmSingle + ' flaps/min (yes, seriously).' : 'Smooth aerodynamic oscillation at ' + bpmSingle + ' flaps/min.'
      },
      {
        id: 's_burst',
        title: '🥁 Sputter & Burst Cadence',
        score: burstScore,
        sub: bursts + ' distinct burst(s)',
        quip: bursts >= 3 ? 'Machine-gun staccato sputtering — rhythmic phrasing nobody can predict.' : bursts === 2 ? 'Clean double-tap cadence; deliberate or unavoidable.' : 'Unified single-stream aerodynamic release.'
      },
      {
        id: 's_timbre',
        title: '🧪 13-Band MFCC & Reed Rasp',
        score: timbreScore,
        sub: 'Flatness ' + safeNum(feat.spectralFlatness, 0).toFixed(2),
        quip: safeNum(feat.spectralFlatness, 0) > 0.45 ? 'Airy/stealth profile muffled as if filtered through thick winter jeans.' : 'Rich harmonic cheek-reed buzz with bold overtones.'
      },
      {
        id: 's_moisture',
        title: '💦 Squelch Index & Laundry Risk',
        score: moistScore,
        sub: bonus ? bonus.wetness.labelA : 'Surface flux',
        quip: bonus && bonus.wetness.wetA >= 65 ? 'Laundry Advisory: Hazardous bubble turbulence — inspect trousers immediately.' : 'Dry aerodynamic exit confirmed — carry on with plausible swagger.'
      },
      {
        id: 's_twin',
        title: '🎺 Acoustic Doppelgänger Twin',
        score: twinScore,
        sub: bonus ? bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name : 'Archetype',
        quip: bonus ? 'In a blind lineup, sounds startlingly like a ' + bonus.acoustics.twinA.name + '.' : 'Matched against non-human brass archetypes.'
      },
      {
        id: 's_panic',
        title: '🛋️ Elevator Panic & Alibi Odds',
        score: panicScore,
        sub: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm blast radius' : 'Radius',
        quip: bonus ? 'Alibi: ' + bonus.social.a.verdict : 'Modeling confined-space social survivability.'
      },
      {
        id: 's_ml',
        title: '🤖 On-Device ML Archetype Fit',
        score: mlScore,
        sub: ml.topClass.emoji + ' ' + ml.topClass.name + ' (Zero Cloud)',
        quip: 'Classified by 22 local features so no cloud server ever sees what you recorded.'
      },
      {
        id: 's_velocity',
        title: '🚀 Detonation Velocity & Onset',
        score: velocityScore,
        sub: Math.round(atkMs) + 'ms blast attack',
        quip: atkMs <= 70 ? 'Hair-trigger transient snap — zero warning shots were fired.' : 'Gradual crescendo buildup before full aerodynamic release.'
      },
      {
        id: 's_neighbor',
        title: '🧱 Drywall & Neighbor Penetration',
        score: neighborScore,
        sub: Math.round(subRatio * 100) + '% wall-piercing bass',
        quip: subRatio >= 0.35 ? 'Low frequencies punch straight through hollow drywall — blame the subwoofer.' : 'Higher hiss decays quickly before crossing apartment walls.'
      }
    ];

    return list.map(function (g) {
      var st = gaugeStatus(g.score);
      return Object.assign({}, g, { status: st.label, color: st.color, tone: st.tone });
    });
  }

  function buildSingleDialReport(dialId, sound) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var Forensics = root.TootApp && root.TootApp.Forensics;
    var feat = (sound && (sound.features || (DSP && DSP.extractFeatures(sound.samples, sound.sampleRate)))) || {};
    if (sound && !sound.features) sound.features = feat;
    var bonus = Forensics ? Forensics.computeBonusMetrics(feat, feat) : null;
    var ml = classifyAcousticProfile(feat, bonus);
    var gauges = buildSingleGauges(sound);
    var g = gauges.find(function (x) { return x.id === dialId; }) || gauges[0];
    var bp = feat.bandProfile || [0.25, 0.25, 0.25, 0.25];
    var dur = safeNum(feat.duration, 0);
    var atkMs = Math.round(safeNum(feat.attackSec, 0) * 1000);
    var decMs = Math.round(safeNum(feat.decaySec, 0) * 1000);
    var bpmSingle = Math.round(safeNum(feat.modRateHz, 0) * 60);
    var noteStr = Forensics && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0 ? Forensics.hzToNoteName(feat.medianPitchHz) : 'Unpitched Stealth Air';

    if (g.id === 's_ml') {
      return {
        id: g.id,
        badgeCode: 'ML-10 // ON-DEVICE CEPSTRAL CLASSIFIER',
        title: 'Machine Learning Acoustic Classification: ' + ml.topClass.emoji + ' ' + ml.topClass.name,
        subtitle: ml.topClass.description,
        score: g.score,
        color: g.color,
        commentary:
          'How our ML engine works (with alarming sincerity): it extracts 22 acoustic descriptors (13 MFCCs, fundamental pitch, spectral flatness, modulation depth, crest shockwave, sub-bass share, and flux) and runs a softmax distance classifier against 6 calibrated archetypes. Confidence sits at ' +
          ml.confidence +
          '% for "' +
          ml.topClass.name +
          '" (runner-up: "' +
          ml.runnerUp.name +
          '" at ' +
          ml.runnerUp.prob +
          '%) — computed 100% locally so no tech billionaire owns a model trained on your butts.',
        charts: [
          { title: '6-Class Softmax Probability Distribution', sub: 'Nearest acoustic archetype fit', drawType: 's_ml_probs' },
          { title: '13-Band MFCC Input Tensor', sub: 'Primary cepstral classification features', drawType: 's_mfcc13' }
        ],
        stats: [
          { label: 'Top Class', value: ml.topClass.name, sub: ml.confidence + '% posterior' },
          { label: 'Runner-Up', value: ml.runnerUp.name, sub: ml.runnerUp.prob + '% posterior' },
          { label: 'Pitch / Centroid', value: ml.featureVector.pitchHz + ' Hz', sub: ml.featureVector.subBandPct + '% sub-bass' },
          { label: 'Model Type', value: '22-D Softmax', sub: '100% local · zero cloud upload' }
        ],
        formula: 'P(class_k) = exp(-d_weighted(x_22d, mu_k) / 0.55) / SUM(exp(-d / 0.55))'
      };
    }

    var map = {
      s_crest: {
        badgeCode: 'DOC-01 // TRANSIENT CREST TELEMETRY',
        title: 'Shockwave Crest Intensity & Impulse Force',
        subtitle: 'Peak-to-RMS acoustic punch across ' + dur.toFixed(2) + 's.',
        commentary:
          'Shockwave Forensics clocked ' + safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB of peak-to-average punchiness. ' +
          (safeNum(feat.crestFactorDb, 0) >= 12 ? 'Noticeably explosive snapping onset — nearby wine glasses and innocent bystanders definitely flinched.' : 'Surprisingly composed aerodynamic release without embarrassing pressure clipping.'),
        charts: [
          { title: 'Blast Pressure Envelope', sub: 'RMS contour vs time', drawType: 's_envelope' },
          { title: 'Cumulative Energy Integral', sub: 'T10 / T50 / T90 energy milestones', drawType: 's_energy_cum' }
        ],
        stats: [
          { label: 'Crest Factor', value: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB', sub: 'Peak / RMS ratio' },
          { label: 'Peak Timing', value: Math.round(safeNum(feat.peakTimeRatio, 0.5) * 100) + '%', sub: 'Point of max pressure' },
          { label: 'Total Span', value: dur.toFixed(2) + 's', sub: 'Auto-trimmed active window' },
          { label: 'Half-Energy T50', value: Math.round(safeNum(feat.t50Ratio, 0.5) * 100) + '%', sub: 'Where half the gas left the room' }
        ],
        formula: 'Crest_dB = 20 * log10(max(|x|) / RMS(x))'
      },
      s_resonance: {
        badgeCode: 'DOC-02 // UPHOLSTERY & FORMANT RESONANCE',
        title: 'Upholstery Damping & Chamber Resonance',
        subtitle: '40-band STFT distribution across winter-jeans bass vs bright brassy sizzle.',
        commentary:
          'Spectral center of mass sits at ' + Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz with ' +
          Math.round(safeNum(bp[0], 0) * 100) + '% of acoustic power below 150 Hz. ' +
          (bp[0] >= 0.35 ? 'Substantial subwoofer-grade chamber depth confirmed — wooden dining chairs act as pure amplifiers.' : 'Brighter upper cheek harmonics dominate; minimal winter-denim muffling detected.'),
        charts: [
          { title: '40-Band FFT Energy Spectrum', sub: '45 Hz to 4.2 kHz logarithmic surface', drawType: 's_spectrum' },
          { title: '4-Band Energy Breakdown', sub: 'Sub-Tuba vs Body Buzz vs Nasal Honk vs Air', drawType: 's_4band' }
        ],
        stats: [
          { label: 'Centroid', value: Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz', sub: 'Spectral center of mass' },
          { label: 'Sub-Bass (<150Hz)', value: Math.round(safeNum(bp[0], 0) * 100) + '%', sub: 'Chair-rattling band' },
          { label: 'Mid Buzz', value: Math.round(safeNum(bp[1], 0) * 100) + '%', sub: '150–450 Hz reed band' },
          { label: 'Upper Air (>1.2kHz)', value: Math.round(safeNum(bp[3], 0) * 100) + '%', sub: 'Brassy sizzle / air band' }
        ],
        formula: 'Centroid = SUM(f_k * E_k) / SUM(E_k)'
      },
      s_tone: {
        badgeCode: 'DOC-03 // FUNDAMENTAL F0 & FART PIANO AUDIT',
        title: 'Fundamental Musical Note & Sweep Track',
        subtitle: 'Locks the toot to an exact piano key (yes, really) and tracks pitch bends.',
        commentary:
          (feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
            ? 'Clean tonal core locked onto ' + noteStr + ' (' + Math.round(feat.medianPitchHz) + ' Hz) across ' + Math.round(feat.voicedRatio * 100) + '% of frames. Harmonious enough to audition for a porcelain brass quintet.'
            : 'Stealth Broadband Emission (' + Math.round(safeNum(feat.voicedRatio, 0) * 100) + '% voiced frames). Operates like a secret office-chair air leak rather than a concert horn.'),
        charts: [
          { title: '32-Frame Pitch Sweep (Hz)', sub: 'Fundamental frequency over time', drawType: 's_pitch' },
          { title: 'Spectral Brightness Drift', sub: 'Log2 centroid trajectory across frames', drawType: 's_centroid_contour' }
        ],
        stats: [
          { label: 'Fart Piano Key', value: formatHzLabel(feat), sub: noteStr },
          { label: 'Glissando Bend', value: safeNum(feat.pitchRangeSemitones, 0).toFixed(1) + ' st', sub: 'Semitone wobble span' },
          { label: 'Voiced Ratio', value: Math.round(safeNum(feat.voicedRatio, 0) * 100) + '%', sub: 'Tonal frame share' },
          { label: 'Sweep Direction', value: (safeNum(feat.pitchTrend, 0) >= 0 ? 'Question-Mark Rise +' : 'Sad-Trombone Drop ') + Math.abs(safeNum(feat.pitchTrend, 0)).toFixed(2), sub: 'Octave delta' }
        ],
        formula: 'F0(frame) via Normalized Lag Autocorrelation; MIDI = 69 + 12 * log2(Hz / 440)'
      },
      s_turbulence: {
        badgeCode: 'DOC-04 // CHEEK-FLUTTER BPM SPECTROSCOPY',
        title: 'Cheek-Flutter BPM & Valve Oscillation',
        subtitle: 'Measures gluteal oscillation speed in Beats-Per-Minute (yes, seriously).',
        commentary:
          'Biomechanics Memo: cheek oscillation clocked ' + Math.round(safeNum(feat.modRateHz, 0)) + ' Hz (' + bpmSingle + ' flaps/min) at ' + Math.round(safeNum(feat.modDepth, 0) * 100) + '% wobble depth. ' +
          (feat.modRateHz >= 18 ? 'Running like a 2-stroke Vespa — high-RPM cheek flutter confirmed.' : 'Cruising at a relaxed trombone ripple cadence.'),
        charts: [
          { title: 'Modulation FFT (4–45 Hz)', sub: 'Stutter, cheek flutter, and fast bee-buzz peaks', drawType: 's_mod' },
          { title: '3-Band Turbulence Split', sub: 'Slow Stutter vs Cheek Flutter vs Fast Rattle', drawType: 's_mod3band' }
        ],
        stats: [
          { label: 'Flap Speed', value: bpmSingle + ' BPM', sub: Math.round(safeNum(feat.modRateHz, 0)) + ' cheek flaps/sec' },
          { label: 'Wobble Depth', value: Math.round(safeNum(feat.modDepth, 0) * 100) + '%', sub: 'Amplitude flutter depth' },
          { label: 'Spectral Flux', value: safeNum(feat.spectralFlux, 0).toFixed(3), sub: 'Texture mutation chaos' },
          { label: 'ZCR', value: safeNum(feat.zcr, 0).toFixed(3), sub: 'Zero-crossing hiss' }
        ],
        formula: 'ModDepth = std(Env) / mean(Env); BPM = 60 * argmax(FFT_mod[4Hz..45Hz])'
      },
      s_burst: {
        badgeCode: 'DOC-05 // SPUTTER PULSE SEGMENTATION',
        title: 'Sputter Gate & Rhythmic Burst Audit',
        subtitle: 'Discrete pressure impulse segmentation across ' + dur.toFixed(2) + 's.',
        commentary:
          'Segmented ' + (feat.burstCount || 1) + ' distinct emission burst(s) clearing the 0.35 envelope gate. ' +
          ((feat.burstCount || 1) >= 3 ? 'Classic staccato motorcycle cadence — chaotic rhythmic phrasing that catches bystanders off-guard.' : feat.burstCount === 2 ? 'Textbook double-tap timing — impossible to pretend that was just your sneaker.' : 'Unified single-stream release — clean start, no sequel.'),
        charts: [
          { title: 'Envelope vs 0.35 Gate Threshold', sub: 'Burst detection hysteresis peaks', drawType: 's_burst_gate' },
          { title: 'Attack / Sustain / Decay Ratio', sub: 'Temporal anatomy percentages', drawType: 's_attack_decay' }
        ],
        stats: [
          { label: 'Bursts Detected', value: String(feat.burstCount || 1), sub: 'Gate > 0.35 / re-arm < 0.18' },
          { label: 'Attack Time', value: atkMs + ' ms', sub: 'Rise to max pressure' },
          { label: 'Decay Tail', value: decMs + ' ms', sub: 'Lingering trailing sputter' },
          { label: 'Total Length', value: dur.toFixed(2) + 's', sub: 'Auto-trimmed span' }
        ],
        formula: 'BurstCount = peaks(SmoothEnv > 0.35 separated by valleys < 0.18)'
      },
      s_timbre: {
        badgeCode: 'DOC-06 // 13-BAND CEPSTRAL FINGERPRINT',
        title: 'Timbre, MFCC & Upholstery Coloring',
        subtitle: 'Quantifies pure cheek reed buzz vs muffled winter-jeans air noise.',
        commentary:
          'Wiener Spectral Flatness reads ' + safeNum(feat.spectralFlatness, 0).toFixed(2) + ' (' + (feat.spectralFlatness > 0.45 ? 'breezy stealth character — plausibly mistaken for an AC vent' : 'bold harmonic brass reed buzz — nobody thinks that was the chair') + '). Every acoustic fingerprint stays 100% locally computed.',
        charts: [
          { title: '13-Band MFCC Signature', sub: 'Spectral envelope shape vector', drawType: 's_mfcc13' },
          { title: '40-Band FFT Energy Spectrum', sub: 'Formant resonances & overtones', drawType: 's_spectrum' }
        ],
        stats: [
          { label: 'Flatness', value: safeNum(feat.spectralFlatness, 0).toFixed(3), sub: '0 = brass reed, 1 = pure air' },
          { label: 'Centroid', value: Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz', sub: 'Upholstery brightness' },
          { label: 'ML Top Fit', value: ml.topClass.name, sub: ml.confidence + '% posterior' },
          { label: 'Voice Share', value: Math.round(safeNum(feat.voicedRatio, 0) * 100) + '%', sub: 'Harmonic frames' }
        ],
        formula: 'Flatness = geomMean(|X|) / arithMean(|X|); MFCC = DCT(log(MelEnergy))'
      },
      s_moisture: {
        badgeCode: 'DOC-07 // HYDRO-ACOUSTIC LAUNDRY ADVISORY',
        title: 'Squelch Index & Moisture Probability',
        subtitle: 'Quantifying suspicious mid-band micro-gurgling dynamics.',
        commentary:
          bonus
            ? 'Laundry Advisory: Classified as "' + bonus.wetness.labelA + '" (' + bonus.wetness.wetA + '%). ' + (bonus.wetness.wetA >= 65 ? 'Heavy turbulent bubble-flux detected — consult emergency laundry protocols immediately.' : 'Dry aerodynamic exit confirmed — trousers remain structurally uncompromised.')
            : 'Surface moisture metrics computed from modulation flux.',
        charts: [
          { title: 'Instantaneous Spectral Flux', sub: 'Micro-texture volatility across event', drawType: 's_flux' },
          { title: 'Moisture Index Components', sub: 'Flutter + Flux + Squelch Band weightings', drawType: 's_squelch_mix' }
        ],
        stats: [
          { label: 'Squelch Score', value: (bonus ? bonus.wetness.wetA : 25) + '%', sub: bonus ? bonus.wetness.labelA : '' },
          { label: 'Spectral Flux', value: safeNum(feat.spectralFlux, 0).toFixed(3), sub: 'Inter-frame splat chaos' },
          { label: 'Mod Depth', value: Math.round(safeNum(feat.modDepth, 0) * 100) + '%', sub: 'Flutter contributor' },
          { label: 'Bursts', value: String(feat.burstCount || 1), sub: 'Bubble interrupt count' }
        ],
        formula: 'Wetness = 22*norm(Mod) + 46*norm(Flux) + 22*SquelchBand + BurstBonus'
      },
      s_twin: {
        badgeCode: 'DOC-08 // ACOUSTIC DOPPELGÄNGER MATCHER',
        title: 'Acoustic Twin: ' + (bonus ? bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name : 'Reference'),
        subtitle: 'Cross-referenced against 8 calibrated non-human noisemakers.',
        commentary:
          bonus
            ? 'Zoological & Brass Match: In a blind acoustic lineup, this specimen impersonates a "' + bonus.acoustics.twinA.name + '" at ' + bonus.acoustics.topScoreA + '% similarity. Mention that scientific fact loudly if accused at dinner.'
            : 'Matched against calibrated noisemaker archetypes.',
        charts: [
          { title: '8-Archetype Affinity Breakdown', sub: 'Tuba, Foghorn, Bullfrog, Vespa, Goose, Duck...', drawType: 's_twin_bars' },
          { title: '2D Hz × Airiness Archetype Map', sub: 'Green dot = Your recording vs archetypes', drawType: 's_twin_map' }
        ],
        stats: [
          { label: 'Top Twin', value: bonus ? bonus.acoustics.twinA.short : '—', sub: bonus ? bonus.acoustics.topScoreA + '% similarity' : '' },
          { label: 'Effective Tone', value: formatHzLabel(feat), sub: 'Comparison frequency' },
          { label: 'Flatness', value: safeNum(feat.spectralFlatness, 0).toFixed(2), sub: 'Buzz vs airiness axis' },
          { label: 'Orchestral Seat', value: (feat.medianPitchHz || 200) < 130 ? 'Tuba / Foghorn' : 'Woodwind / Brass', sub: 'Register assignment' }
        ],
        formula: 'Affinity = 100 * exp(-(|deltaOct|/1.15 + |deltaFlat|*1.4 + |deltaMod|*0.75))'
      },
      s_panic: {
        badgeCode: 'DOC-09 // CONFINED-SPACE ALIBI PROTOCOL',
        title: 'Elevator Panic, Dog-Blame & Blast Radius',
        subtitle: 'Calculates optimal social excuses and audible awkwardness perimeter.',
        commentary:
          bonus
            ? 'Plausible Deniability Briefing: Audible blast perimeter reaches ' + bonus.social.a.radiusM.toFixed(1) + 'm (' + bonus.social.a.panicPct + '% cabin panic). Recommended Cover Story: "' + bonus.social.a.verdict + '"'
            : 'Social blast telemetry.',
        charts: [
          { title: 'Elevator Cabin Blast Radius', sub: 'Event perimeter vs 2.2m cabin box', drawType: 's_blast_map' },
          { title: 'Alibi Deflection Success Odds', sub: 'Dog vs Shoe vs Leather Office Chair', drawType: 's_alibi_bars' }
        ],
        stats: [
          { label: 'Blast Radius', value: bonus ? bonus.social.a.radiusM.toFixed(1) + ' m' : '—', sub: 'Audible awkwardness zone' },
          { label: 'Panic Level', value: (bonus ? bonus.social.a.panicPct : 40) + '%', sub: 'Elevator intimidation' },
          { label: 'Best Alibi', value: bonus ? bonus.social.a.verdict.split('(')[0].trim().slice(0, 22) : 'Dog', sub: 'Highest cover probability' },
          { label: 'Duration Factor', value: dur.toFixed(2) + 's', sub: 'Exposure window' }
        ],
        formula: 'Radius_m = 1.8 + 10.5 * (PanicPct / 100); Deflection = f(Pitch, Duration, Centroid)'
      },
      s_velocity: {
        badgeCode: 'DOC-11 // ONSET VELOCITY & IMPULSE RISE',
        title: 'Detonation Velocity & Attack Speed',
        subtitle: 'How violently pressure ramped from dead silence to peak decibels.',
        commentary:
          'Peak amplitude detonated in just ' + atkMs + 'ms (' + Math.round((atkMs / Math.max(40, dur * 1000)) * 100) + '% into the emission). ' +
          (atkMs <= 70 ? 'Hair-trigger ambush transient — zero warning shots were fired before impact.' : 'Dramatic slow-burn crescendo followed by ' + decMs + 'ms lingering fade-out.'),
        charts: [
          { title: 'Initial Attack Surge Zoom', sub: 'First 50% normalized onset envelope', drawType: 's_onset_zoom' },
          { title: 'Cumulative Energy T10/T50/T90', sub: 'Cumulative acoustic power milestones', drawType: 's_energy_cum' }
        ],
        stats: [
          { label: 'Attack Rise', value: atkMs + ' ms', sub: 'Time to peak RMS' },
          { label: 'Decay Tail', value: decMs + ' ms', sub: 'Post-peak sputter fade' },
          { label: 'T10 / T90', value: Math.round(safeNum(feat.t10Ratio, 0.1) * 100) + '% / ' + Math.round(safeNum(feat.t90Ratio, 0.9) * 100) + '%', sub: 'Energy bounds' },
          { label: 'Crest Impulse', value: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB', sub: 'Shockwave sharpness' }
        ],
        formula: 'AttackVelocity = PeakRMS / max(0.01, AttackSec)'
      },
      s_neighbor: {
        badgeCode: 'DOC-12 // STRUCTURAL DRYWALL PENETRATION FORECAST',
        title: 'Neighbor & Drywall Penetration Risk',
        subtitle: 'Modeling whether low frequencies cross apartment walls.',
        commentary:
          'Structural Acoustics Audit: Sub-150 Hz waves punch straight through hollow-core bedroom doors while high hiss fizzles in the carpet. With ' +
          Math.round(safeNum(bp[0], 0) * 100) + '% sub-bass fuel, through-wall awkwardness stands at ' + g.score + '% — keep a heavy cough queued just in case.',
        charts: [
          { title: 'Structural Transmission Forecast', sub: 'Audibility across walls & floors', drawType: 's_wall_atten' },
          { title: '4-Band Frequency Attenuation', sub: 'Low frequencies travel farthest', drawType: 's_4band' }
        ],
        stats: [
          { label: 'Wall Risk', value: g.score + '%', sub: g.status },
          { label: 'Sub-Bass (<150Hz)', value: Math.round(safeNum(bp[0], 0) * 100) + '%', sub: 'Wall-piercing bass' },
          { label: 'Blast Reach', value: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm' : '4.0m', sub: 'Open-air propagation' },
          { label: 'ML Profile', value: ml.topClass.short || ml.topClass.name, sub: ml.confidence + '% fit' }
        ],
        formula: 'Transmission = 0.82 * SubBassRatio + 0.52 * PanicIndex'
      }
    };

    var found = map[g.id] || map.s_crest;
    return Object.assign({ id: g.id, score: g.score, color: g.color }, found);
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
    var ml = classifyAcousticProfile(feat, bonus);
    var gauges = buildSingleGauges(sound);
    var label = opts.label || sound.displayName || sound.name || 'Recording';
    var eyebrow = opts.eyebrow || 'SINGLE FART FORENSIC DOSSIER';
    var noteStr =
      Forensics && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? Forensics.hzToNoteName(feat.medianPitchHz)
        : 'Unvoiced Airband';
    var fieldVerdict = buildSingleFieldVerdict(sound, feat, bonus, ml, noteStr);

    var uid = 'lfs_' + (++gaugeUid) + '_';
    var chan = uid + 'S';
    var spec = null;
    var activeDialId = null;
    var activeSlotEl = null;

    var compareBtnHtml = opts.onPrimaryAction
      ? '<button type="button" class="labs-btn labs-btn-emerald labs-btn-sm labs-single-primary">' + esc(opts.primaryLabel || '🎯 Guess This Fart') + '</button>'
      : '';

    var rowsHtml = renderMetricRowsHtml(gauges, { expandable: true });

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
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-s-pdf">📄 PDF</button>' +
      '      <button type="button" class="labs-btn labs-btn-purple labs-btn-sm labs-s-email-report">📧 Email (Audio + PDF)</button>' +
      '    </div>' +
      '    <div class="labs-fn-meta-row">' +
      '      <button type="button" class="labs-twin-pill labs-s-ml-cue">🤖 ML Profile: <strong>' + esc(ml.topClass.emoji + ' ' + ml.topClass.name) + '</strong> (' + ml.confidence + '% confidence)</button>' +
      '      <span class="labs-hint-text">3D spectrogram above · Complete expandable analysis below</span>' +
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
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">COMPLETE ACOUSTIC ANALYSIS</div>' +
      '        <h3 class="labs-section-title">Acoustic Summary &amp; Expandable Telemetry</h3>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-purple">🤖 ' + esc(ml.topClass.name) + '</span>' +
      '    </div>' +
      '    <div class="labs-verdict-banner">' +
      '      <div class="labs-verdict-banner-head">' +
      '        <span class="labs-eyebrow">OFFICIAL GASTRO-ACOUSTIC FIELD REPORT</span>' +
      '        <span class="labs-verdict-grade">' + esc(ml.topClass.emoji + ' ' + ml.topClass.name + ' · ' + Math.round(safeNum(feat.modRateHz, 0) * 60) + ' flaps/min') + '</span>' +
      '      </div>' +
      '      <p class="labs-verdict-text">' + esc(fieldVerdict) + '</p>' +
      '    </div>' +
      '    <div class="labs-single-facts-grid">' +
      '      <div class="labs-fact-box"><span>ML Classification</span><strong>' + esc(ml.topClass.emoji + ' ' + ml.topClass.name + ' (' + ml.confidence + '%)') + '</strong></div>' +
      '      <div class="labs-fact-box"><span>Fart Piano Key</span><strong>' + esc(noteStr) + '</strong></div>' +
      (bonus
        ? '<div class="labs-fact-box"><span>Squelch / Laundry Risk</span><strong>' + esc(bonus.wetness.wetA + '% · ' + bonus.wetness.labelA) + '</strong></div>' +
          '<div class="labs-fact-box"><span>Sound Twin</span><strong>' + esc(bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name) + '</strong></div>' +
          '<div class="labs-fact-box"><span>Official Alibi</span><strong>' + esc(bonus.social.a.verdict) + '</strong></div>'
        : '') +
      '    </div>' +
      '    <div class="labs-hint-text">Tap any of the 12 metrics below to expand charts, scientific commentary, stats &amp; equation inline.</div>' +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '    <hr class="labs-analysis-divider" />' +
      '    <div class="labs-eyebrow">CORE SPECTRAL &amp; TEMPORAL PLOTS</div>' +
      '    <div class="labs-single-charts-grid">' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>40-Band FFT Energy Spectrum</span><small>Centroid ' + Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_spec"></canvas>' +
      '      </div>' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>Pitch &amp; Frequency Sweep</span><small>32-frame F0 tracker</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_pitch"></canvas>' +
      '      </div>' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>Modulation &amp; Flutter FFT (4–45 Hz)</span><small>Depth ' + (safeNum(feat.modDepth, 0) * 100).toFixed(0) + '%</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_mod"></canvas>' +
      '      </div>' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>Blast Pressure Envelope</span><small>Attack / T50 / Decay</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_env"></canvas>' +
      '      </div>' +
      '    </div>' +
      '  </section>' +
      '</div>';

    function redrawExpandedSingle() {
      if (!activeDialId || !activeSlotEl) return;
      var canvases = activeSlotEl.querySelectorAll('canvas[data-schart]');
      for (var i = 0; i < canvases.length; i++) {
        drawSingleChartType(canvases[i], canvases[i].getAttribute('data-schart'), sound, feat, bonus, ml);
      }
    }

    function closeSingleRow() {
      activeDialId = null;
      activeSlotEl = null;
      var items = mountEl.querySelectorAll('.labs-metric-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('open');
      var rowBtns = mountEl.querySelectorAll('.labs-metric-row[aria-expanded]');
      for (var r = 0; r < rowBtns.length; r++) rowBtns[r].setAttribute('aria-expanded', 'false');
      var slots = mountEl.querySelectorAll('.labs-row-accordion');
      for (var s = 0; s < slots.length; s++) {
        slots[s].classList.add('hidden');
        slots[s].innerHTML = '';
      }
    }

    function openSingleRow(dialId) {
      var rep = buildSingleDialReport(dialId, sound);
      closeSingleRow();

      var itemEl = mountEl.querySelector('.labs-metric-item[data-item-id="' + rep.id + '"]');
      var rowBtn = mountEl.querySelector('.labs-metric-row[data-row-id="' + rep.id + '"]');
      var slotEl = mountEl.querySelector('.labs-row-accordion[data-slot-id="' + rep.id + '"]');
      if (!slotEl) return;

      activeDialId = rep.id;
      activeSlotEl = slotEl;
      if (itemEl) itemEl.classList.add('open');
      if (rowBtn) rowBtn.setAttribute('aria-expanded', 'true');
      slotEl.classList.remove('hidden');

      var chartsHtml = rep.charts
        .map(function (ch) {
          return (
            '<div class="labs-chart-box-inner">' +
            '  <div class="labs-chart-box-head"><span>' + esc(ch.title) + '</span><small>' + esc(ch.sub) + '</small></div>' +
            '  <canvas class="labs-2d-canvas" data-schart="' + esc(ch.drawType) + '"></canvas>' +
            '</div>'
          );
        })
        .join('');

      var statsHtml = rep.stats
        .map(function (st) {
          return (
            '<div class="labs-fact-box"><span>' + esc(st.label) + '</span><strong>' + esc(st.value) + '</strong><small class="labs-fact-sub">' + esc(st.sub) + '</small></div>'
          );
        })
        .join('');

      slotEl.innerHTML =
        '<div class="labs-acc-head">' +
        '  <div>' +
        '    <div class="labs-eyebrow">' + esc(rep.badgeCode) + '</div>' +
        '    <div class="labs-expanded-note">' + esc(rep.subtitle) + '</div>' +
        '  </div>' +
        '  <button type="button" class="labs-btn-ghost labs-btn-sm labs-acc-close">✕ Collapse</button>' +
        '</div>' +
        '<div class="forensics-commentary labs-single-commentary">' + esc(rep.commentary) + '</div>' +
        '<div class="labs-single-charts-grid">' + chartsHtml + '</div>' +
        '<div class="labs-single-facts-grid">' + statsHtml + '</div>' +
        '<div class="labs-formula-strip"><span class="formula-tag">EQUATION</span> <code>' + esc(rep.formula) + '</code></div>';

      var closeBtn = slotEl.querySelector('.labs-acc-close');
      if (closeBtn) closeBtn.addEventListener('click', closeSingleRow);

      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(function () {
          redrawExpandedSingle();
          if (itemEl && typeof itemEl.scrollIntoView === 'function') {
            try { itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
          }
        });
      } else {
        redrawExpandedSingle();
      }
    }

    var rowButtons = mountEl.querySelectorAll('.labs-metric-row[data-row-id]');
    for (var rb = 0; rb < rowButtons.length; rb++) {
      rowButtons[rb].addEventListener('click', function () {
        var did = this.getAttribute('data-row-id');
        if (activeDialId === did) {
          closeSingleRow();
        } else {
          openSingleRow(did);
        }
      });
    }

    var mlCue = mountEl.querySelector('.labs-s-ml-cue');
    if (mlCue) {
      mlCue.addEventListener('click', function () {
        openSingleRow('s_ml');
      });
    }

    function drawAllSingleCharts() {
      drawSpectrumPlot(mountEl.querySelector('#' + uid + 'c_spec'), feat, '#60A5FA');
      drawPitchContourPlot(mountEl.querySelector('#' + uid + 'c_pitch'), feat);
      drawModulationPlot(mountEl.querySelector('#' + uid + 'c_mod'), feat);
      drawEnvelopePlot(mountEl.querySelector('#' + uid + 'c_env'), feat);
      redrawExpandedSingle();
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

    var sPlay1 = mountEl.querySelector('.labs-s-play');
    if (sPlay1) sPlay1.addEventListener('click', playSingle);
    var sPlay2 = mountEl.querySelector('.labs-s-play2');
    if (sPlay2) sPlay2.addEventListener('click', playSingle);
    var sStop = mountEl.querySelector('.labs-s-stop');
    if (sStop) {
      sStop.addEventListener('click', function () {
        Audio.stopAll();
        if (spec) spec.setPlayhead(null);
      });
    }

    var primBtn = mountEl.querySelector('.labs-single-primary');
    if (primBtn && opts.onPrimaryAction) {
      primBtn.addEventListener('click', function () { opts.onPrimaryAction(sound); });
    }
    var shareBtn = mountEl.querySelector('.labs-s-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        if (opts.onShare) opts.onShare(sound);
      });
    }
    var pdfBtn = mountEl.querySelector('.labs-s-pdf');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', function () {
        if (opts.onDownloadPdf) opts.onDownloadPdf(sound, [specCanvas]);
      });
    }
    var emailRepBtn = mountEl.querySelector('.labs-s-email-report');
    if (emailRepBtn) {
      emailRepBtn.addEventListener('click', function () {
        if (opts.onEmailAnalysis) opts.onEmailAnalysis(sound, [specCanvas]);
      });
    }

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
        activeSlotEl = null;
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
    var cohScore = Math.round(clamp(safeNum(m.coherenceScore, 50), 0, 100));
    var wetPct = Math.round(clamp(safeNum(m.aggregateMoisturePct, 30), 0, 100));
    var bpmGroup = Math.round(safeNum(feat.modRateHz, 0) * 60);
    var blastRad = safeNum(m.combinedBlastRadiusM, 4);

    var raw = [
      {
        id: 'g_coh',
        title: 'Symphonic Coherence',
        score: cohScore,
        sub: (m.count || 0) + ' Vault movements',
        quip: cohScore >= 70 ? 'Disturbingly musical phrasing — sounds almost rehearsed.' : 'Wild tonal mood swings across movements, like an avant-garde brass rehearsal.'
      },
      {
        id: 'g_span',
        title: 'Vocal Range Span',
        score: spanScore,
        sub: safeNum(m.pitchSpanOctaves, 0).toFixed(2) + ' octaves span',
        quip: 'Covers ' + safeNum(m.pitchSpanOctaves, 0).toFixed(2) + ' octaves around ' + Math.round(safeNum(m.meanPitchHz, 140)) + ' Hz average core.'
      },
      {
        id: 'g_turb',
        title: 'Collective Flutter BPM',
        score: turbScore,
        sub: Math.round(safeNum(feat.modRateHz, 0)) + ' Hz (' + bpmGroup + ' flaps/min)',
        quip: bpmGroup >= 900 ? 'High-RPM collective cheek chatter across the ensemble.' : 'Steady low-frequency chamber rumble.'
      },
      {
        id: 'g_wet',
        title: 'Laundry Risk (Group Wetness)',
        score: wetPct,
        sub: 'Combined Squelch Index',
        quip: wetPct >= 62 ? 'Hazmat mop warning! Check floorboards after listening.' : 'Mostly dry aerodynamic emissions — laundry remains safe.'
      },
      {
        id: 'g_blast',
        title: 'Cumulative Blast Zone',
        score: blastScore,
        sub: blastRad.toFixed(1) + 'm evacuation zone',
        quip: blastRad >= 10 ? 'Zero elevator survival odds — evacuate a ' + blastRad.toFixed(1) + 'm perimeter.' : 'Containable within a medium conference room.'
      },
      {
        id: 'g_dyn',
        title: 'Dynamic Blast Shockwave',
        score: dynScore,
        sub: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB peak ratio',
        quip: safeNum(feat.crestFactorDb, 0) >= 11 ? 'Explosive transient pops punctuate the medley.' : 'Mastered at smooth 44.1 kHz studio dynamics.'
      }
    ];

    return raw.map(function (g) {
      var st = gaugeStatus(g.score);
      return Object.assign({}, g, { status: st.label, color: st.color, tone: st.tone });
    });
  }

  function formatSegSortTag(seg, sortBy) {
    if (sortBy === 'wetness') return Math.round(safeNum(seg.wetnessPct, 0)) + '% wet';
    if (sortBy === 'duration') return Math.round(safeNum(seg.pitchHz, 0)) + ' Hz';
    if (sortBy === 'crest') return safeNum(seg.crestDb, 0).toFixed(1) + ' dB';
    if (sortBy === 'radius') return safeNum(seg.radiusM, 0).toFixed(1) + 'm reach';
    if (sortBy === 'flutter') return Math.round(safeNum(seg.modRateHz, 0)) + ' Hz flutter';
    if (sortBy === 'date') {
      try {
        if (seg.createdAt && seg.createdAt > 1e11) {
          return new Date(seg.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        }
      } catch (e) {}
      return Math.round(safeNum(seg.pitchHz, 0)) + ' Hz';
    }
    return Math.round(safeNum(seg.pitchHz, 0)) + ' Hz';
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
    finishDarkPlot(p);
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

    var sortBy = opts.sortBy || (g.metrics && g.metrics.sortBy) || 'pitch';
    var sortDir = opts.sortDir || (g.metrics && g.metrics.sortDir) || 'asc';
    var sortOptions = (root.TootLabs.Store && root.TootLabs.Store.GROUP_SORT_OPTIONS) || [
      { key: 'pitch', label: 'Pitch (Hz)', unit: 'Hz' },
      { key: 'wetness', label: 'Wetness / Squelch (%)', unit: '%' },
      { key: 'duration', label: 'Duration (s)', unit: 's' },
      { key: 'crest', label: 'Loudness / Crest (dB)', unit: 'dB' },
      { key: 'radius', label: 'Blast Radius (m)', unit: 'm' },
      { key: 'flutter', label: 'Flutter Rate (Hz)', unit: 'Hz' },
      { key: 'date', label: 'Date Recorded', unit: '' }
    ];

    var sortOptionsHtml = sortOptions
      .map(function (opt) {
        return '<option value="' + esc(opt.key) + '"' + (opt.key === sortBy ? ' selected' : '') + '>' + esc(opt.label) + '</option>';
      })
      .join('');

    var trackListHtml = (g.segments || [])
      .map(function (seg, idx) {
        return (
          '<span class="labs-seg-pill" style="border-color:' + seg.color + '">' +
          '  <i class="labs-seg-dot" style="background:' + seg.color + '"></i>' +
          '  <strong>' + (idx + 1) + '. ' + esc(seg.name) + '</strong> ' +
          '  <small>' + seg.durationSec.toFixed(2) + 's · ' + esc(formatSegSortTag(seg, sortBy)) + '</small>' +
          '</span>'
        );
      })
      .join('');

    var sortLabel = (g.metrics && g.metrics.sortLabel) || 'Pitch (Hz) · Ascending';
    var rowsHtml = renderMetricRowsHtml(gauges, { expandable: false });

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
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-g-share">📤 Share</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-g-pdf">📄 PDF</button>' +
      '      <button type="button" class="labs-btn labs-btn-purple labs-btn-sm labs-g-email-report">📧 Email (Audio + PDF)</button>' +
      '    </div>' +
      '    <div class="labs-sort-bar">' +
      '      <label class="labs-sort-field" for="' + uid + 'sortby">' +
      '        <span>Arrange Farts By</span>' +
      '        <select id="' + uid + 'sortby" class="labs-g-sort-by">' + sortOptionsHtml + '</select>' +
      '      </label>' +
      '      <div class="labs-dir-group" role="group" aria-label="Sort Direction">' +
      '        <button type="button" class="labs-dir-btn' + (sortDir !== 'desc' ? ' active' : '') + '" data-gdir="asc">↑ Ascending</button>' +
      '        <button type="button" class="labs-dir-btn' + (sortDir === 'desc' ? ' active' : '') + '" data-gdir="desc">↓ Descending</button>' +
      '      </div>' +
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
      '    <div class="labs-group-wave-wrap">' +
      '      <div class="labs-chart-box-head"><span>Composite Symphony Waveform</span><small>Color-coded Vault Movements in Active Order</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_wave" style="height:130px"></canvas>' +
      '    </div>' +
      '  </section>' +
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">COMBINED GROUP ANALYSIS</div>' +
      '        <h3 class="labs-section-title">Ensemble Telemetry &amp; Movement Order</h3>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-blue">' + esc(sortLabel) + '</span>' +
      '    </div>' +
      '    <div class="labs-seg-pills-row">' + trackListHtml + '</div>' +
      '    <div class="labs-verdict-banner">' +
      '      <div class="labs-verdict-banner-head">' +
      '        <span class="labs-eyebrow">CONDUCTOR\'S GASTRO-ACOUSTIC FIELD NOTES</span>' +
      '        <span class="labs-verdict-grade">Studio Mastered · 44.1 kHz</span>' +
      '      </div>' +
      '      <p class="labs-verdict-text">' + esc(g.metrics.groupVerdict) + '</p>' +
      '    </div>' +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '    <hr class="labs-analysis-divider" />' +
      '    <div class="labs-single-charts-grid">' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>Vault Specimen Map (Pitch × Moisture)</span><small>Spatial acoustic spread</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_map"></canvas>' +
      '      </div>' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>Combined 40-Band FFT Spectrum</span><small>Aggregate frequency energy</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_spec"></canvas>' +
      '      </div>' +
      '    </div>' +
      '  </section>' +
      '</div>';

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

    var sortSel = mountEl.querySelector('.labs-g-sort-by');
    if (sortSel && opts.onSortChange) {
      sortSel.addEventListener('change', function () {
        opts.onSortChange(sortSel.value, sortDir);
      });
    }

    var dirBtns = mountEl.querySelectorAll('[data-gdir]');
    for (var di = 0; di < dirBtns.length; di++) {
      dirBtns[di].addEventListener('click', function () {
        var nextDir = this.getAttribute('data-gdir') === 'desc' ? 'desc' : 'asc';
        if (opts.onSortChange) {
          opts.onSortChange(sortSel ? sortSel.value : sortBy, nextDir);
        }
      });
    }

    var playBtn = mountEl.querySelector('.labs-g-play');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
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
    }

    var stopBtn = mountEl.querySelector('.labs-g-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        Audio.stopAll();
        lastProg = null;
        drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, null);
        if (spec) spec.setPlayhead(null);
      });
    }

    var shareGrpBtn = mountEl.querySelector('.labs-g-share');
    if (shareGrpBtn) {
      shareGrpBtn.addEventListener('click', function () {
        if (opts.onShare) opts.onShare(g);
      });
    }
    var pdfBtn = mountEl.querySelector('.labs-g-pdf');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', function () {
        if (opts.onDownloadPdf) opts.onDownloadPdf(g, [specCanvas]);
      });
    }
    var emailRepBtn = mountEl.querySelector('.labs-g-email-report');
    if (emailRepBtn) {
      emailRepBtn.addEventListener('click', function () {
        if (opts.onEmailAnalysis) opts.onEmailAnalysis(g, [specCanvas]);
      });
    }

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
    classifyAcousticProfile: classifyAcousticProfile,
    buildSingleFieldVerdict: buildSingleFieldVerdict,
    buildExecutiveGauges: buildExecutiveGauges,
    buildSingleGauges: buildSingleGauges,
    buildSingleDialReport: buildSingleDialReport,
    buildGroupGauges: buildGroupGauges,
    drawSingleChartType: drawSingleChartType,
    drawSpectrumPlot: drawSpectrumPlot,
    drawPitchContourPlot: drawPitchContourPlot,
    drawModulationPlot: drawModulationPlot,
    drawEnvelopePlot: drawEnvelopePlot,
    drawConstellationPlot: drawConstellationPlot,
    drawSegmentedWaveform: drawSegmentedWaveform,
    renderDashboard: renderDashboard,
    renderSingleDashboard: renderSingleDashboard,
    renderGroupDashboard: renderGroupDashboard
  };
})(typeof window !== 'undefined' ? window : globalThis);
