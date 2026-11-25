(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var gaugeUid = 0;

  var INSTITUTE = {
    name: 'TOOT MATCH LABS',
    subtitle: 'Institute of Acoustic Flatulence Research',
    tagline: 'Advancing the scientific understanding of gastrointestinal acoustics.',
    aiAcronym: 'A.S.S.',
    aiName: 'Acoustic Similarity System',
    aiVersion: 'v4.2'
  };

  var TEAM = [
    {
      id: 'bottomsworth',
      name: 'Professor Reginald P. Bottomsworth',
      shortName: 'Professor Bottomsworth',
      title: 'Chief Acoustic Flatulence Officer',
      img: 'img/team/bottomsworth.png',
      initials: 'RB',
      bio: 'Professor Bottomsworth founded Toot Match Labs after a distinguished career studying unusual acoustic phenomena. His work established many of the laboratory\'s modern analysis standards and remains central to the field of comparative flatulence science.',
      specialities: ['Acoustic Classification', 'Resonance Research', 'Comparative Emissions Analysis']
    },
    {
      id: 'turbulence',
      name: 'Dr. Ava Turbulence',
      shortName: 'Dr. Turbulence',
      title: 'Director of Pressure Dynamics',
      img: 'img/team/turbulence.png',
      initials: 'AT',
      bio: 'Dr. Turbulence specializes in pressure release events and airflow behaviour. Many of the laboratory\'s turbulence and energy output telemetry models were developed under her leadership.',
      specialities: ['Pressure Mapping', 'Turbulence Analysis', 'Flow Dynamics']
    },
    {
      id: 'wobble',
      name: 'Dr. Penelope Wobble',
      shortName: 'Dr. Wobble',
      title: 'Senior Spectrogram Scientist',
      img: 'img/team/wobble.png',
      initials: 'PW',
      bio: 'Dr. Wobble is responsible for much of the laboratory\'s frequency and resonance research. Her work focuses on identifying unique harmonic signatures across multi-band spectrograms.',
      specialities: ['Spectrogram Analysis', 'Frequency Mapping', 'Resonance Studies']
    },
    {
      id: 'flatley',
      name: 'Dr. Miles Flatley',
      shortName: 'Dr. Flatley',
      title: 'Director of Computational Acoustics',
      img: 'img/team/flatley.png',
      initials: 'MF',
      bio: 'Dr. Flatley leads development of comparison algorithms and machine learning systems. His models evaluate thousands of acoustic specimens each year with strict mathematical rigor.',
      specialities: ['Machine Learning', 'Reproduction Fidelity', 'Pattern Recognition']
    },
    {
      id: 'pufferton',
      name: 'Dr. Winston Pufferton',
      shortName: 'Dr. Pufferton',
      title: 'Chief Archive Curator',
      img: 'img/team/pufferton.png',
      initials: 'WP',
      bio: 'Dr. Pufferton maintains the Institute Archive and oversees long-term classification and preservation of historically significant acoustic recordings.',
      specialities: ['Archive Classification', 'Data Archiving', 'Research Preservation']
    }
  ];

  var RESEARCH_FOOTNOTES = [
    'Findings successfully reproduced.',
    'Additional review remains ongoing.',
    'Archive correlation exceeded expectations.',
    'The research team remains intrigued.',
    'Statistical confidence remains favourable.',
    'Laboratory debate continues.',
    'Coffee consumption increased during analysis.',
    'Further funding has been requested.',
    'Spectral calibration tolerances verified against reference standards.',
    'All telemetry modules executed deterministically under controlled conditions.',
    'Long-term archive indexing remains under peer review.',
    'Supplemental harmonic measurements appended to the Institute record.'
  ];

  var SCIENTIST_COMMENT_POOLS = {
    bottomsworth: [
      'This profile deserves additional study.',
      'This finding may become archive worthy.',
      'The science appears unusually cooperative today.',
      'A fascinating acoustic specimen.',
      'I believe we are observing something notable.',
      'This recording exceeds expectations.',
      'The Institute will wish to examine this emission lifetime under formal review.',
      'Every harmonic transition exhibits remarkable scientific discipline.',
      'This pressure release trajectory warrants inclusion in the quarterly journal.',
      'A distinguished contribution to the study of gastrointestinal acoustics.'
    ],
    turbulence: [
      'Pressure behaviour exceeded model expectations.',
      'An unusually balanced airflow event.',
      'The turbulence profile remains remarkably stable.',
      'This pressure curve developed exactly as predicted.',
      'Flow transition boundaries remained coherent across the entire emission lifetime.',
      'Acoustic energy output accelerated cleanly into the primary release phase.',
      'Sub-150 Hz pressure propagation aligns closely with theoretical projections.',
      'Turbulent shear attenuation occurred without unexpected instability.',
      'Envelope symmetry across the primary impulse remains scientifically noteworthy.',
      'Measured pressure gradients confirm disciplined aerodynamic boundary conditions.'
    ],
    wobble: [
      'This spectrogram has character.',
      'I am particularly interested in this harmonic structure.',
      'The resonance profile appears unusually disciplined.',
      'Several frequencies have my full attention.',
      'Overtones across the primary resonance profile exhibit rare spectral coherence.',
      'The 40-band spectral distribution map reveals exceptional structural clarity.',
      'Harmonic inflection boundaries align cleanly with reference spectral baselines.',
      'I have annotated this frequency concentration for secondary spectral inspection.',
      'The transition between fundamental harmonics and broadband dispersion is compelling.',
      'Upper-band resonance decay remains remarkably consistent across active frames.'
    ],
    flatley: [
      'The machine learning system is unexpectedly confident.',
      'Our clustering models found this scientifically interesting.',
      'The comparison engine remains highly convinced.',
      'Computational curiosity levels have increased.',
      'Multi-dimensional cepstral projections converged earlier than model predictions.',
      'Reproduction fidelity vectors align cleanly across all 22 telemetry features.',
      'Statistical separation within the cosine manifold remains unusually decisive.',
      'Our deterministic classification pipeline assigned high posterior certainty.',
      'Observed variance across the 3-phase macro vector stayed well within bounds.',
      'The computational suite flagged this specimen for elevated research priority.'
    ],
    pufferton: [
      'The archive contains few comparable examples.',
      'This recording has preservation potential.',
      'A valuable addition to the Institute collection.',
      'Historically speaking, this is uncommon.',
      'I have cross-referenced this acoustic artifact against five decades of records.',
      'Preservation standards recommend immediate cataloging in the permanent collection.',
      'Few archived specimens demonstrate such consistent harmonic documentation.',
      'Long-term archival indexing has been initiated for this acoustic profile.',
      'Comparable waveforms appear in only a small fraction of historical holdings.',
      'Future researchers will find this specimen instructive for comparative reference.'
    ]
  };

  var SCIENTIST_COMMENTS = [
    { scientistId: 'bottomsworth', label: 'Peer Review Comment', quote: 'This profile deserves additional study.' },
    { scientistId: 'turbulence', label: 'Field Observation', quote: 'Pressure behaviour exceeded model expectations.' },
    { scientistId: 'wobble', label: 'Research Note', quote: 'I am particularly interested in this harmonic structure.' },
    { scientistId: 'flatley', label: 'Laboratory Observation', quote: 'Our clustering models found this scientifically interesting.' },
    { scientistId: 'pufferton', label: 'Archive Observation', quote: 'The archive contains few comparable examples.' },
    { scientistId: 'bottomsworth', label: 'Laboratory Observation', quote: 'A fascinating acoustic specimen.' },
    { scientistId: 'turbulence', label: 'Research Note', quote: 'An unusually balanced airflow event.' },
    { scientistId: 'wobble', label: 'Peer Review Observation', quote: 'The resonance profile appears unusually disciplined.' },
    { scientistId: 'flatley', label: 'Research Note', quote: 'The machine learning system is unexpectedly confident.' },
    { scientistId: 'pufferton', label: 'Archive Note', quote: 'This recording has preservation potential.' }
  ];

  var RARE_COMMENTS = [
    'Laboratory disagreement detected.',
    'Additional peer review required.',
    'Several scientists requested a second opinion.',
    'Archive retrieval taking longer than expected.',
    'Unexpected resonance behaviour observed.',
    'Further funding has been requested.',
    'Coffee consumption increased during analysis.',
    'Committee consensus paused pending supplemental spectrogram inspection.',
    'Archival cross-reference triggered secondary verification protocol.',
    'Laboratory instruments recalibrated following elevated harmonic activity.'
  ];

  var SHAREABLE_VERDICTS = [
    'Archive Worthy',
    'Research Grade',
    'Acoustically Significant',
    'Scientifically Remarkable',
    'Exceptional Resonance Event',
    'High Research Interest',
    'Noteworthy Acoustic Artifact',
    'Suitable For Peer Review',
    'Candidate For Long-Term Preservation',
    'Distinguished Acoustic Specimen',
    'Priority Archive Classification',
    'Verified Laboratory Benchmark'
  ];

  var DIAL_SCIENTIST_MAP = {
    s_crest: 'turbulence',
    s_resonance: 'wobble',
    s_tone: 'wobble',
    s_turbulence: 'turbulence',
    s_burst: 'turbulence',
    s_timbre: 'wobble',
    s_moisture: 'turbulence',
    s_twin: 'pufferton',
    s_panic: 'pufferton',
    s_ml: 'flatley',
    s_velocity: 'turbulence',
    s_neighbor: 'bottomsworth',
    s_authenticity: 'bottomsworth',
    overall: 'bottomsworth',
    duration: 'turbulence',
    pitch: 'wobble',
    modulation: 'turbulence',
    timbre: 'wobble',
    envelope: 'turbulence',
    wetness: 'turbulence',
    acoustics: 'pufferton',
    social: 'bottomsworth',
    authenticity: 'bottomsworth'
  };

  function hashSeed(str) {
    var s = String(str || 'toot');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickBySeed(seedStr, list, offset) {
    if (!list || list.length === 0) return null;
    var h = hashSeed(seedStr) + (offset || 0);
    return list[Math.abs(h) % list.length];
  }

  function getScientistById(id) {
    for (var i = 0; i < TEAM.length; i++) {
      if (TEAM[i].id === id) return TEAM[i];
    }
    return TEAM[0];
  }

  function pickScientistComment(scientistId, seedStr, offset) {
    var pool = SCIENTIST_COMMENT_POOLS[scientistId] || SCIENTIST_COMMENT_POOLS.bottomsworth;
    var q = pickBySeed((seedStr || '') + '|' + scientistId, pool, offset || 0) || pool[0];
    return { scientistId: scientistId, quote: q };
  }

  function pickRareComment(seedStr) {
    var h = hashSeed((seedStr || '') + '|rare');
    if (h % 3 !== 0) return null; // ~33% institutional dispatch frequency
    return RARE_COMMENTS[Math.floor(h / 3) % RARE_COMMENTS.length];
  }

  function pickShareableVerdict(seedStr) {
    return pickBySeed((seedStr || '') + '|verdict', SHAREABLE_VERDICTS, 0) || SHAREABLE_VERDICTS[0];
  }

  function renderRareCommentHtml(text) {
    if (!text) return '';
    return (
      '<div class="labs-rare-comment" role="note">' +
      '  <span class="labs-rare-tag">LABORATORY EVENT</span>' +
      '  <span class="labs-rare-text">' + esc(text) + '</span>' +
      '</div>'
    );
  }

  function renderScientistCommentHtml(scientistId, quote, noteLabel) {
    var sci = getScientistById(scientistId);
    return (
      '<div class="labs-sci-comment">' +
      '  <img class="labs-sci-avatar" src="' + esc(sci.img) + '" alt="' + esc(sci.name) + '" loading="lazy" />' +
      '  <div class="labs-sci-body">' +
      '    <span class="labs-sci-tag">' + esc(noteLabel || 'Laboratory Observation') + '</span>' +
      '    <blockquote class="labs-sci-quote">"' + esc(quote) + '"</blockquote>' +
      '    <div class="labs-sci-attr">— ' + esc(sci.shortName) + ' <span class="labs-sci-role">· ' + esc(sci.title) + '</span></div>' +
      '  </div>' +
      '</div>'
    );
  }

  function buildArchiveComparison(feat, bonus, archiveSamples, seedStr) {
    var f = feat || {};
    var crest = safeNum(f.crestFactorDb, 8.5);
    var modDepth = safeNum(f.modDepth, 0.3);
    var cent = safeNum(f.spectralCentroidHz, 220);
    var dur = safeNum(f.duration, 0.5);
    var atk = safeNum(f.attackSec, 0.08);
    var wet = bonus && bonus.wetness ? bonus.wetness.wetA : 32;

    var energyPct = percentileAgainstArchive(crest + modDepth * 4.5, archiveSamples, 'crestFactorDb', 9.2, 3.1);
    var energyLine = 'Acoustic energy output exceeds ' + energyPct + '% of archived specimens.';
    var tags = [];
    if (modDepth >= 0.42) tags.push('Elevated airflow turbulence.');
    else tags.push('Disciplined laminar flow.');
    if (safeNum(f.pitchRangeSemitones, 0) >= 4.0 || cent >= 360 || cent <= 115) tags.push('Uncommon spectral distribution.');
    else tags.push('Coherent harmonic structure.');
    if (atk <= 0.055 || (f.burstCount || 1) >= 2) tags.push('Distinctive pressure release onset.');
    else tags.push('Balanced pressure release contour.');
    if (energyPct >= 62 || wet >= 55) tags.push('High research interest.');
    if (energyPct >= 72 || dur >= 0.9 || (f.burstCount || 1) >= 3) tags.push('Candidate for preservation.');

    var puff = pickScientistComment('pufferton', seedStr || 'archive', 1);
    return {
      energyPct: energyPct,
      energyLine: energyLine,
      tags: tags,
      scientistId: 'pufferton',
      quote: puff.quote
    };
  }

  function analyzeSpectrogram3D(feat) {
    var f = feat || {};
    var spec = f.spectrogram;
    var dur = safeNum(spec && spec.duration, safeNum(f.duration, 0));
    var bp = f.bandProfile || [0.25, 0.25, 0.25, 0.25];
    var subPct = Math.round(safeNum(bp[0], 0) * 100);
    var midPct = Math.round((safeNum(bp[1], 0) + safeNum(bp[2], 0)) * 100);
    var highPct = Math.round(safeNum(bp[3], 0) * 100);
    var centroidHz = Math.round(safeNum(f.spectralCentroidHz, safeNum(f.medianPitchHz, 220)));

    var peakVal = -1;
    var peakFrame = 0;
    var peakBand = 0;
    var activeCells = 0;
    var frames = spec && spec.frames ? spec.frames : 0;
    var bands = spec && spec.freqBands ? spec.freqBands : 0;
    var grid = spec && spec.grid ? spec.grid : null;
    if (grid && frames > 0 && bands > 0) {
      for (var t = 0; t < frames; t++) {
        for (var b = 0; b < bands; b++) {
          var v = safeNum(grid[t * bands + b], 0);
          if (v > 0.25) activeCells++;
          if (v > peakVal) {
            peakVal = v;
            peakFrame = t;
            peakBand = b;
          }
        }
      }
    }

    var peakFreqHz = centroidHz;
    if (peakVal > 0 && spec && spec.freqCenters && spec.freqCenters[peakBand] > 0) {
      peakFreqHz = Math.round(spec.freqCenters[peakBand]);
    } else if (f.medianPitchHz > 0) {
      peakFreqHz = Math.round(f.medianPitchHz);
    }

    var peakTimePct =
      peakVal > 0 && frames > 1
        ? Math.round((peakFrame / (frames - 1)) * 100)
        : Math.round(clamp(safeNum(f.peakTimeRatio, 0.35), 0, 1) * 100);
    var peakTimeSec = dur > 0 ? Number(((peakTimePct / 100) * dur).toFixed(2)) : 0;
    var densityPct =
      grid && frames * bands > 0 ? Math.round((activeCells / (frames * bands)) * 100) : 35;

    var dominantBand =
      subPct >= midPct && subPct >= highPct
        ? 'sub-bass (<150 Hz at ' + subPct + '% energy)'
        : highPct >= midPct
          ? 'upper aperture (>1.2 kHz at ' + highPct + '% energy)'
          : 'mid-band core (150 Hz–1.2 kHz at ' + midPct + '% energy)';

    var temporalShape =
      peakTimePct <= 28
        ? 'front-loaded onset ridge at ' + peakTimeSec.toFixed(2) + 's (' + peakTimePct + '% of trace)'
        : peakTimePct >= 68
          ? 'late-phase surge peaking at ' + peakTimeSec.toFixed(2) + 's (' + peakTimePct + '% into emission)'
          : 'central pressure crest at ' + peakTimeSec.toFixed(2) + 's (' + peakTimePct + '% span)';

    var bursts = f.burstCount || 1;
    var trend = safeNum(f.pitchTrend, 0);
    var ridgeContour =
      bursts >= 3
        ? bursts + ' discrete multi-crest peaks'
        : bursts === 2
          ? 'dual-ridge separation'
          : trend >= 0.12
            ? 'upward frequency climb'
            : trend <= -0.12
              ? 'downward thermal pitch fade'
              : safeNum(f.spectralFlatness, 0) > 0.45
                ? 'broad, low-Q broadband dispersion'
                : 'focused harmonic spine';

    return {
      dur: dur,
      peakFreqHz: peakFreqHz,
      peakTimeSec: peakTimeSec,
      peakTimePct: peakTimePct,
      subPct: subPct,
      midPct: midPct,
      highPct: highPct,
      centroidHz: centroidHz,
      densityPct: densityPct,
      dominantBand: dominantBand,
      temporalShape: temporalShape,
      ridgeContour: ridgeContour
    };
  }

  function buildSingle3DSpectrogramCommentary(feat) {
    var m = analyzeSpectrogram3D(feat);
    return (
      'The 3D surface peaks at ' + m.peakFreqHz + ' Hz during a ' + m.temporalShape +
      ', with ' + m.dominantBand + ' and a spectral centroid of ' + m.centroidHz + ' Hz. ' +
      'Terrain morphology exhibits a ' + m.ridgeContour + ' occupying ' + m.densityPct + '% active time-frequency area.'
    );
  }

  function buildComparison3DSpectrogramCommentary(featA, featB, labelA, labelB) {
    var a = analyzeSpectrogram3D(featA);
    var b = analyzeSpectrogram3D(featB);
    var nameA = String(labelA || 'Specimen A').slice(0, 26);
    var nameB = String(labelB || 'Specimen B').slice(0, 26);
    var freqDiff = Math.abs(a.peakFreqHz - b.peakFreqHz);
    var timeDiff = Math.abs(a.peakTimePct - b.peakTimePct);
    var alignTxt =
      freqDiff <= 35 && timeDiff <= 18
        ? 'Peak ridges align closely in both frequency and phase timing.'
        : 'Surfaces diverge by ' + freqDiff + ' Hz in peak ridge height and ' + timeDiff + '% in temporal crest timing.';
    return (
      nameA + ' crests at ' + a.peakFreqHz + ' Hz (' + a.peakTimePct + '% span, ' + a.ridgeContour + '), while ' +
      nameB + ' peaks at ' + b.peakFreqHz + ' Hz (' + b.peakTimePct + '% span, ' + b.ridgeContour + '). ' + alignTxt
    );
  }

  function buildGroup3DSpectrogramCommentary(groupObj) {
    var g = groupObj || {};
    var m = analyzeSpectrogram3D(g.features || {});
    var met = g.metrics || {};
    var segCount = (g.segments && g.segments.length) || met.count || 0;
    var spanOct = safeNum(met.pitchSpanOctaves, 0).toFixed(2);
    return (
      'Composite ' + segCount + '-specimen surface spans ' + spanOct + ' octaves across ' + m.dur.toFixed(2) +
      's, cresting at ' + m.peakFreqHz + ' Hz (' + m.peakTimePct + '% elapsed) with ' + m.dominantBand + '.'
    );
  }

  function renderCollapsibleStatsHtml(statsHtml, formulaText, count, labelPrefix, formulaTag) {
    var cntText = typeof count === 'number' && count > 0 ? ' (' + count + ')' : '';
    var titleTxt = (labelPrefix || 'Individual Telemetry Metrics & Equation') + cntText;
    return (
      '<div class="labs-sub-disclosure">' +
      '  <button type="button" class="labs-sub-disclosure-btn" aria-expanded="false">' +
      '    <span>📊 ' + esc(titleTxt) + '</span>' +
      '    <span class="labs-disclosure-chev" aria-hidden="true">▸</span>' +
      '  </button>' +
      '  <div class="labs-sub-disclosure-body hidden">' +
      statsHtml +
      (formulaText
        ? '<div class="labs-formula-strip"><span class="formula-tag">' + esc(formulaTag || 'EQUATION') + '</span> <code>' + esc(formulaText) + '</code></div>'
        : '') +
      '  </div>' +
      '</div>'
    );
  }

  function wireSubDisclosures(rootEl) {
    if (!rootEl) return;
    var btns = rootEl.querySelectorAll('.labs-sub-disclosure-btn');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i]._labsBound) continue;
      btns[i]._labsBound = true;
      btns[i].addEventListener('click', function () {
        var box = this.parentElement;
        var body = box ? box.querySelector('.labs-sub-disclosure-body') : null;
        if (!body) return;
        var isHidden = body.classList.contains('hidden');
        body.classList.toggle('hidden', !isHidden);
        this.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        var chev = this.querySelector('.labs-disclosure-chev');
        if (chev) chev.textContent = isHidden ? '▾' : '▸';
      });
    }
  }

  function wireArchiveToggles(mountEl) {
    if (!mountEl) return;
    var btns = mountEl.querySelectorAll('.labs-archive-toggle');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i]._labsBound) continue;
      btns[i]._labsBound = true;
      btns[i].addEventListener('click', function () {
        var card = this.parentElement;
        var body = card ? card.querySelector('.labs-archive-cmp-body') : null;
        if (!body) return;
        var willOpen = body.classList.contains('hidden');
        body.classList.toggle('hidden', !willOpen);
        if (card) card.classList.toggle('is-collapsed', !willOpen);
        this.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        var chev = this.querySelector('.labs-disclosure-chev');
        if (chev) chev.textContent = willOpen ? '▾' : '▸';
      });
    }
  }

  function renderArchiveComparisonHtml(archCmp) {
    if (!archCmp) return '';
    var sci = getScientistById(archCmp.scientistId || 'pufferton');
    var pillsHtml = (archCmp.tags || [])
      .map(function (t) {
        return '<span class="labs-chart-pill">' + esc(t) + '</span>';
      })
      .join('');
    return (
      '<section class="labs-archive-cmp-card is-collapsed" aria-label="Archive Comparison">' +
      '  <button type="button" class="labs-archive-toggle" aria-expanded="false">' +
      '    <span class="labs-archive-toggle-left">' +
      '      <span class="labs-eyebrow">ARCHIVE OBSERVATION · HISTORICAL COMPARISON</span>' +
      '      <span class="labs-archive-headline">' + esc(archCmp.energyLine) + '</span>' +
      '    </span>' +
      '    <span class="labs-archive-toggle-right">' +
      '      <span class="labs-chip labs-chip-blue">' + archCmp.energyPct + 'th Percentile</span>' +
      '      <span class="labs-disclosure-chev" aria-hidden="true">▸</span>' +
      '    </span>' +
      '  </button>' +
      '  <div class="labs-archive-cmp-body hidden">' +
      '    <div class="labs-archive-meter-track"><div class="labs-archive-meter-fill" style="width:' + archCmp.energyPct + '%"></div></div>' +
      '    <div class="labs-archive-pills">' + pillsHtml + '</div>' +
      '    <div class="labs-chart-obs">' +
      '      <img src="' + esc(sci.img) + '" alt="' + esc(sci.shortName) + '" loading="lazy" />' +
      '      <span><strong>Archive Classification:</strong> "' + esc(archCmp.quote) + '" <em>— ' + esc(sci.shortName) + '</em></span>' +
      '    </div>' +
      '  </div>' +
      '</section>'
    );
  }

  function renderShareableVerdictHtml(verdictText, specimenTitle, pctLabel, actionBtnsHtml) {
    var chief = getScientistById('bottomsworth');
    return (
      '<section class="labs-glass-card labs-share-verdict-card" aria-label="Official Laboratory Verdict and Share Options">' +
      '  <div class="labs-sv-top">' +
      '    <div class="labs-sv-seal">' +
      '      <img src="' + esc(chief.img) + '" alt="' + esc(chief.name) + '" loading="lazy" />' +
      '      <div>' +
      '        <div class="labs-eyebrow">TOOT MATCH LABS · OFFICIAL LABORATORY VERDICT</div>' +
      '        <div class="labs-sv-spec">' + esc(specimenTitle) + (pctLabel ? ' · ' + esc(pctLabel) : '') + '</div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-sv-headline">' + esc(verdictText) + '</div>' +
      '  <div class="labs-bottom-share-actions">' +
      (actionBtnsHtml || '') +
      '    <button type="button" class="labs-btn-ghost labs-btn-sm labs-copy-verdict-btn" data-verdict-copy="' + esc(verdictText) + '">📋 Copy Verdict</button>' +
      '  </div>' +
      '  <div class="labs-sv-footer">' +
      '    <span>' + esc(INSTITUTE.subtitle) + '</span>' +
      '    <span>Certified via ' + esc(INSTITUTE.aiAcronym + ' ' + INSTITUTE.aiVersion) + '</span>' +
      '  </div>' +
      '</section>'
    );
  }

  function renderReportSignatureHtml(seedStr) {
    var chief = getScientistById('bottomsworth');
    var fnBase = hashSeed(seedStr);
    var notes = [];
    for (var i = 0; i < 4; i++) {
      notes.push(RESEARCH_FOOTNOTES[(fnBase + i * 2) % RESEARCH_FOOTNOTES.length]);
    }
    var notesHtml = notes
      .map(function (n, idx) {
        return '<li><sup>[' + (idx + 1) + ']</sup> * ' + esc(n) + '</li>';
      })
      .join('');

    return (
      '<section class="labs-glass-card labs-report-signature" aria-label="Laboratory Certification and Academic Footnotes">' +
      '  <div class="labs-sig-top">' +
      '    <div class="labs-sig-reviewer">' +
      '      <img class="labs-sig-portrait" src="' + esc(chief.img) + '" alt="' + esc(chief.name) + '" loading="lazy" />' +
      '      <div>' +
      '        <div class="labs-eyebrow">Reviewed and Approved By</div>' +
      '        <div class="labs-sig-name">' + esc(chief.name) + '</div>' +
      '        <div class="labs-sig-title">' + esc(chief.title) + '</div>' +
      '        <div class="labs-sig-org">' + esc(INSTITUTE.subtitle) + ' · ' + esc(INSTITUTE.name) + '</div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="labs-sig-engine">' +
      '      <div class="labs-eyebrow">Analysis Performed Using</div>' +
      '      <div class="labs-sig-ass">' + esc(INSTITUTE.aiAcronym) + '</div>' +
      '      <div class="labs-sig-ass-sub">' + esc(INSTITUTE.aiName) + ' ' + esc(INSTITUTE.aiVersion) + '</div>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-fn-meet-team">🏛️ Meet The Team</button>' +
      '    </div>' +
      '  </div>' +
      '  <p class="labs-sig-disclaimer">"This Institute Report has been generated using deterministic acoustic telemetry protocols in pursuit of advancing the scientific understanding of gastrointestinal acoustics."</p>' +
      '  <div class="labs-footnotes">' +
      '    <div class="labs-eyebrow">ACADEMIC FOOTNOTES</div>' +
      '    <ul>' + notesHtml + '</ul>' +
      '  </div>' +
      '</section>'
    );
  }

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
    var cpmA = Math.round(safeNum(fA.modRateHz, 0) * 60);
    var cpmB = Math.round(safeNum(fB.modRateHz, 0) * 60);
    var oppSlope = pBd.oppCent || pBd.oppPitch || safeNum(pBd.polarityMul, 1) < 1;
    var refFreq = formatHzLabel(fA);
    var guessFreq = formatHzLabel(fB);
    var lagBins = (bd.envelope && bd.envelope.lagProfile && bd.envelope.lagProfile.bestLag) || 0;
    var centA = safeNum(fA.spectralCentroidHz, 220);
    var centB = safeNum(fB.spectralCentroidHz, 220);

    var pitchQuip = oppSlope
      ? 'Opposing frequency trajectory detected across active frames (×0.28 trajectory polarity factor applied).'
      : pBd.refUnvoiced !== pBd.userUnvoiced
      ? 'Regime mismatch: one specimen exhibited broadband airflow dispersion while the other sustained harmonic voicing.'
      : safeNum(res.pitchScore, 0) >= 82
      ? 'Primary resonance trajectories converged tightly across active measurement frames.'
      : 'Observed variance between ' + refFreq + ' and ' + guessFreq + ' across primary resonance bands.';

    var durQuip =
      Math.abs(deltaMs) < 35
        ? 'High temporal precision — emission lifetime aligned within ±' + Math.abs(deltaMs) + 'ms.'
        : deltaMs > 0
        ? 'Recording B sustained +' + deltaMs + 'ms longer emission lifetime than Reference Specimen A.'
        : 'Recording B terminated ' + Math.abs(deltaMs) + 'ms prior to Reference Specimen A.';

    var envQuip =
      lagBins === 0
        ? 'Pressure release maxima arrived phase-aligned without lag compensation.'
        : 'Synchronized Recording B by ' + (lagBins > 0 ? '+' : '') + lagBins + ' time bins for shape parity calibration.';

    var timbreQuip =
      centB < centA * 0.72
        ? 'Recording B exhibits elevated low-pass cavity damping relative to Reference A.'
        : centB > centA * 1.35
        ? 'Recording B shows elevated upper-harmonic dispersion relative to Reference A.'
        : 'Spectral distribution contours align closely across harmonic resonance bands.';

    var rawList = [
      {
        id: 'tone',
        title: '📡 Primary Resonance Profile',
        score: Math.round(clamp(safeNum(res.pitchScore, 0), 0, 100)),
        sub: refFreq + ' vs ' + guessFreq,
        quip: pitchQuip,
        forensicsKey: 'pitch',
        note: 'Tracks fundamental F0 trajectory (45–650 Hz) and evaluates ascending versus descending sweep polarity.'
      },
      {
        id: 'duration',
        title: '⏱️ Emission Lifetime',
        score: Math.round(clamp(safeNum(res.durationScore, 0), 0, 100)),
        sub: safeNum(fA.duration, 0).toFixed(2) + 's vs ' + safeNum(fB.duration, 0).toFixed(2) + 's',
        quip: durQuip,
        forensicsKey: 'duration',
        note: 'Quantifies absolute emission lifetime, T50 cumulative energy burn point, and observed variance.'
      },
      {
        id: 'pressure',
        title: '📈 Pressure Release Potential',
        score: Math.round(clamp(safeNum(res.envelopeScore, 0), 0, 100)),
        sub: 'Peak ' + Math.round(safeNum(fA.crestFactorDb, 0)) + ' vs ' + Math.round(safeNum(fB.crestFactorDb, 0)) + ' dB',
        quip: envQuip,
        forensicsKey: 'envelope',
        note: 'Cross-correlates pressure envelopes across ±6 bins to isolate contour alignment from trigger offset.'
      },
      {
        id: 'resonance',
        title: '🎨 Spectral Distribution Map & MFCC',
        score: Math.round(clamp(safeNum(res.timbreScore, 0), 0, 100)),
        sub: Math.round(centA) + ' vs ' + Math.round(centB) + ' Hz',
        quip: timbreQuip,
        forensicsKey: 'timbre',
        note: 'Evaluates 13-band MFCC cepstral fingerprints, 4-band energy distribution, and STFT grid parity.'
      },
      {
        id: 'thunder',
        title: '⚡ Acoustic Energy Output (Sub-Bass)',
        score: thunderScore,
        sub: Math.round(safeNum(bpA[0], 0) * 100) + '% vs ' + Math.round(safeNum(bpB[0], 0) * 100) + '% sub-bass',
        quip: safeNum(bpA[0], 0) + safeNum(bpB[0], 0) >= 0.7 ? 'Substantial 45–150 Hz low-frequency acoustic energy concentration confirmed.' : 'Moderate mid-band energy distribution without dominant sub-bass concentration.',
        forensicsKey: 'overall',
        note: 'Quantifies 45–150 Hz sub-bass energy release paired with transient crest factor.'
      },
      {
        id: 'turbulence',
        title: '🫧 Oscillation Cadence & Turbulence',
        score: Math.round(clamp(safeNum(res.modulationScore, 0), 0, 100)),
        sub: cpmA + ' vs ' + cpmB + ' cycles/min (' + Math.round(safeNum(fA.modRateHz, 0)) + '/' + Math.round(safeNum(fB.modRateHz, 0)) + ' Hz)',
        quip: 'Measured periodic envelope oscillation at ' + cpmA + ' vs ' + cpmB + ' cycles/min.',
        forensicsKey: 'modulation',
        note: 'Analyzes 4–45 Hz modulation FFT spectrum across low, mid, and rapid oscillatory regimes.'
      },
      {
        id: 'acoustic_conf',
        title: '🧪 Reproduction Fidelity Assessment',
        score: acousticConf,
        sub: 'Grade ' + (res.grade || 'B') + ' · ' + (res.title || 'Aligned Profile'),
        quip: oBd.coreCapApplied ? 'Non-compensatory core identity bound applied to preserve classification integrity.' : 'All primary telemetry domains cleared convergence thresholds cleanly.',
        forensicsKey: 'overall',
        note: 'Fuses five weighted telemetry domains (60% arithmetic + 40% geometric) with boundary safeguards.'
      },
      {
        id: 'ml_conf',
        title: '🤖 Computational Model Convergence',
        score: mlConfidence,
        sub: 'MFCC ' + Math.round(safeNum(tBd.mfccMeanScore, 0) * 100) + '% · Grid ' + Math.round(safeNum(tBd.gridCorr, 0) * 100) + '%',
        quip: 'Evaluated 13 cepstral dimensions deterministically on local device instrumentation.',
        forensicsKey: 'timbre',
        note: 'Deterministic feature engine comparing 3-phase spectral macro-evolution and STFT cell correlation.'
      },
      {
        id: 'rhythmic',
        title: '🥁 Impulse Segmentation & Cadence',
        score: rhythmicScore,
        sub: (fA.burstCount || 1) + ' vs ' + (fB.burstCount || 1) + ' burst(s)',
        quip: (fA.burstCount || 1) === (fB.burstCount || 1) ? 'Synchronized impulse segmentation — identical discrete burst choreography.' : 'Segmentation variance: ' + (fA.burstCount || 1) + ' impulse(s) vs ' + (fB.burstCount || 1) + '.',
        forensicsKey: 'modulation',
        note: 'Counts discrete acoustic impulses exceeding the 0.35 normalized envelope gate.'
      },
      {
        id: 'harmonic',
        title: '💨 Harmonic Structure vs Dispersion',
        score: harmonicScore,
        sub: 'Flatness ' + safeNum(fA.spectralFlatness, 0).toFixed(2) + ' vs ' + safeNum(fB.spectralFlatness, 0).toFixed(2),
        quip: safeNum(fA.spectralFlatness, 0) > 0.45 && safeNum(fB.spectralFlatness, 0) > 0.45 ? 'Synchronized broadband laminar dispersion across both specimens.' : 'Evaluates harmonic reed periodicity against turbulent airflow dispersion.',
        forensicsKey: 'pitch',
        note: 'Separates tonal periodic harmonics from broadband unvoiced aerodynamic release.'
      },
      {
        id: 'moisture',
        title: '💧 Hydro-Acoustic Turbulence Profile',
        score: moistureScore,
        sub: bonus ? bonus.wetness.wetA + '% (' + bonus.wetness.labelA + ') vs ' + bonus.wetness.wetB + '%' : 'Turbulence parity',
        quip: bonus ? (bonus.wetness.wetA >= 65 || bonus.wetness.wetB >= 65 ? 'Research Note: Elevated fluid-boundary spectral flux volatility observed.' : 'Turbulence alignment: "' + bonus.wetness.labelA + '" vs "' + bonus.wetness.labelB + '".') : 'Evaluates frame-to-frame spectral flux volatility.',
        forensicsKey: 'wetness',
        note: 'Measures inter-frame spectral flux transients and mid-band resonance modulation.'
      },
      {
        id: 'neighbor',
        title: '📐 Acoustic Propagation & Masking',
        score: neighborScore,
        sub: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm vs ' + bonus.social.b.radiusM.toFixed(1) + 'm radius' : 'Propagation zone',
        quip: bonus ? 'Masking Model (B): ' + bonus.social.b.verdict : 'Models confined-space acoustic propagation radius.',
        forensicsKey: 'social',
        note: 'Computes estimated propagation perimeter and environmental spectral masking overlap.'
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
    var authA = computeAuthenticityAnalysis(soundA);
    var authB = computeAuthenticityAnalysis(soundB);

    var rowItems = gauges.slice();
    if (bonus && bonus.acoustics) {
      var twinScore = Math.round(clamp(safeNum(bonus.acoustics.matchScore, 0), 0, 100));
      var twinSt = gaugeStatus(twinScore);
      var sameTwin = bonus.acoustics.twinA.name === bonus.acoustics.twinB.name;
      rowItems.push({
        id: 'acoustics',
        title: '📡 Reference Acoustic Analogue',
        score: twinScore,
        sub: bonus.acoustics.twinA.short + ' vs ' + bonus.acoustics.twinB.short,
        quip: sameTwin
          ? 'Taxonomic convergence: both specimens align nearest with "' + bonus.acoustics.twinA.name + '".'
          : 'Taxonomic separation: Reference A aligns with "' + bonus.acoustics.twinA.name + '" while Recording B maps toward "' + bonus.acoustics.twinB.name + '".',
        forensicsKey: 'acoustics',
        note: 'Evaluates pitch, flatness, and modulation affinity against eight calibrated environmental prototypes.',
        status: twinSt.label,
        color: twinSt.color,
        tone: twinSt.tone
      });
    }
    rowItems.push(buildAuthenticitySummaryRow('authenticity', authA, authB, labelA, labelB));

    var cmpVerdict = root.TootLabs.Store
      ? root.TootLabs.Store.buildScientificVerdict(soundA, soundB, result, exactScore)
      : result.summaryLine || 'Reproduction fidelity calibrated.';
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
        '    <div class="labs-humor-tile-head">💧 Hydro-Acoustic Field Observation</div>' +
        '    <div class="labs-humor-tile-stat">' + esc(bonus.wetness.wetA + '% ' + bonus.wetness.labelA + ' vs ' + bonus.wetness.wetB + '% ' + bonus.wetness.labelB) + '</div>' +
        '    <div class="labs-humor-tile-body">' + esc(wetRep ? wetRep.commentary : '') + '</div>' +
        '  </div>' +
        '  <div class="labs-humor-tile">' +
        '    <div class="labs-humor-tile-head">📡 Reference Analogue Classification</div>' +
        '    <div class="labs-humor-tile-stat">' + esc(bonus.acoustics.twinA.name + ' vs ' + bonus.acoustics.twinB.name) + '</div>' +
        '    <div class="labs-humor-tile-body">' + esc(twinRep ? twinRep.commentary : '') + '</div>' +
        '  </div>' +
        '  <div class="labs-humor-tile">' +
        '    <div class="labs-humor-tile-head">📐 Confined-Space Propagation Note</div>' +
        '    <div class="labs-humor-tile-stat">' + esc(bonus.social.a.radiusM.toFixed(1) + 'm vs ' + bonus.social.b.radiusM.toFixed(1) + 'm propagation radius') + '</div>' +
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
      ? '<button type="button" class="labs-twin-pill" data-open-fkey="acoustics" title="Inspect Reference Analogue Classification">' +
        '  <span>Reference Analogue:</span> ' +
        '  <strong>' +
        esc(bonus.acoustics.twinA.short) +
        '</strong> vs <strong>' +
        esc(bonus.acoustics.twinB.short) +
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
      (opts.onShareOrEmail || opts.onEmailAnalysis || opts.onShare || opts.onDownloadPdf
        ? '<div class="labs-fn-header-btns">' +
          (opts.onShareOrEmail || opts.onShare || opts.onEmailAnalysis ? '<button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-cmp-share">📤 Share / Email</button>' : '') +
          (opts.onDownloadPdf ? '<button type="button" class="labs-btn-ghost labs-btn-sm labs-cmp-pdf">📄 PDF</button>' : '') +
          '</div>'
        : '');

    var cmpComment = pickScientistComment(
      'flatley',
      (labelA || '') + '|' + (labelB || '') + '|' + exactScore.toFixed(1),
      0
    );
    cmpComment.label = 'Comparative Match Review';
    var specWobbleQuote = buildComparison3DSpectrogramCommentary(featA, featB, labelA, labelB);
    var rareDispatch = pickRareComment((labelA || '') + '|' + (labelB || '') + '|cmp');
    var archCmp = buildArchiveComparison(
      featA,
      bonus,
      opts.archiveSamples,
      (labelA || '') + '|' + (labelB || '') + '|arch'
    );
    var shareVerdict = pickShareableVerdict(
      (labelA || '') + '|' + (labelB || '') + '|' + exactScore.toFixed(1)
    );
    var cmpBottomActionsHtml =
      (opts.onShareOrEmail || opts.onEmailAnalysis || opts.onShare
        ? '<button type="button" class="labs-btn labs-btn-purple labs-btn-sm labs-cmp-share">📤 Share / Email</button>'
        : '') +
      (opts.onDownloadPdf
        ? '<button type="button" class="labs-btn-ghost labs-btn-sm labs-cmp-pdf">📄 PDF</button>'
        : '');

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">INSTITUTE REPORT · COMPARATIVE ACOUSTIC ASSESSMENT</div>' +
      '        <h2 class="labs-fn-title">' + esc(labelA) + ' <span class="labs-vs-arrow">vs</span> ' + esc(labelB) + '</h2>' +
      '      </div>' +
      '      <div class="labs-fn-right-cluster">' +
      '        <div class="labs-fn-score-chip">' +
      '          <span class="labs-fn-score-val">' + exactScore.toFixed(1) + '%</span>' +
      '          <span class="labs-fn-score-lbl">REPRODUCTION FIDELITY</span>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="labs-fn-meta-row">' +
      twinBadgeHtml +
      '      <span class="labs-ass-badge">Analysis performed using ' + esc(INSTITUTE.aiAcronym + ' ' + INSTITUTE.aiVersion) + '</span>' +
      '    </div>' +
      '    <div class="labs-verdict-banner">' +
      '      <div class="labs-verdict-banner-head">' +
      '        <span class="labs-eyebrow">OFFICIAL FINDINGS · LABORATORY VERDICT</span>' +
      '        <span class="labs-verdict-grade">' + esc('Grade ' + (result.grade || 'B') + ' · ' + (result.title || 'Aligned Profile')) + '</span>' +
      '      </div>' +
      '      <p class="labs-verdict-text">' + esc(cmpVerdict) + '</p>' +
      cmpTipsHtml +
      '    </div>' +
      renderScientistCommentHtml(cmpComment.scientistId, cmpComment.quote, cmpComment.label) +
      renderRareCommentHtml(rareDispatch) +
      '  </section>' +
      '  <section class="labs-glass-card labs-spec-bay">' +
      '    <div class="labs-spec-bay-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">3D SPECTRAL DISTRIBUTION TOPOLOGY</div>' +
      '        <h3 class="labs-section-title">Comparative 3D Spectrograms</h3>' +
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
      renderScientistCommentHtml('wobble', specWobbleQuote, '3D Spectrogram Telemetry Commentary') +
      '  </section>' +
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">TELEMETRY DOMAINS · COMPARATIVE ANALYSIS</div>' +
      '        <h3 class="labs-section-title">Comparative Telemetry Breakdown</h3>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-blue">' + rowItems.length + ' Suites</span>' +
      '    </div>' +
      humorStripHtml +
      renderArchiveComparisonHtml(archCmp) +
      '    <div class="labs-hint-text">Select any telemetry domain below to inspect interactive plots; detailed metrics stay collapsed until opened.</div>' +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '  </section>' +
      renderReportSignatureHtml((labelA || '') + '|' + (labelB || '') + '|cmp') +
      renderShareableVerdictHtml(shareVerdict, labelA + ' vs ' + labelB, exactScore.toFixed(1) + '% Reproduction Fidelity', cmpBottomActionsHtml) +
      '</div>';

    wireArchiveToggles(mountEl);

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
      if (resolvedId !== 'authenticity' && !Forensics) return;

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

      if (resolvedId === 'authenticity') {
        activeMountEl = slotEl;
        var authSci = pickScientistComment(
          DIAL_SCIENTIST_MAP.authenticity || 'bottomsworth',
          (labelA || '') + '|' + (labelB || '') + '|auth',
          1
        );
        slotEl.innerHTML =
          renderAuthenticityComparisonAccordionHtml(labelA, authA, labelB, authB) +
          '<div class="labs-acc-sci-slot">' +
          renderScientistCommentHtml(authSci.scientistId, authSci.quote, 'Authenticity Review') +
          '</div>';
        wireSubDisclosures(slotEl);
        wireAuthChartInteraction(slotEl, authA, authB, labelA, labelB);
        var closeAuthBtn = slotEl.querySelector('.labs-acc-close');
        if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeActiveRow);
        var drawAuthNow = function () {
          var authCanvas = slotEl.querySelector('canvas[data-auth-chart]');
          if (authCanvas) drawAuthenticityPlot(authCanvas, authA, authB, labelA, labelB);
          if (itemEl && typeof itemEl.scrollIntoView === 'function') {
            try {
              itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (e) {}
          }
        };
        if (typeof root.requestAnimationFrame === 'function') {
          root.requestAnimationFrame(drawAuthNow);
        } else {
          drawAuthNow();
        }
        return;
      }

      var rowSci = pickScientistComment(
        DIAL_SCIENTIST_MAP[targetFKey] || DIAL_SCIENTIST_MAP[resolvedId] || 'turbulence',
        (labelA || '') + '|' + (labelB || '') + '|' + resolvedId,
        1
      );
      slotEl.innerHTML =
        '<div class="labs-forensics-mount"></div>' +
        '<div class="labs-acc-sci-slot">' +
        renderScientistCommentHtml(rowSci.scientistId, rowSci.quote, 'Specialist Telemetry Remark') +
        '</div>';

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
    if (cmpShareBtn) {
      cmpShareBtn.addEventListener('click', function () {
        if (opts.onShareOrEmail) opts.onShareOrEmail(soundA, soundB, result, exactScore, [canvasA, canvasB]);
        else if (opts.onShare) opts.onShare(soundA, soundB, result, exactScore, [canvasA, canvasB]);
        else if (opts.onEmailAnalysis) opts.onEmailAnalysis(soundA, soundB, result, exactScore, [canvasA, canvasB]);
      });
    }
    var cmpPdfBtn = mountEl.querySelector('.labs-cmp-pdf');
    if (cmpPdfBtn && opts.onDownloadPdf) {
      cmpPdfBtn.addEventListener('click', function () {
        opts.onDownloadPdf(soundA, soundB, result, exactScore, [canvasA, canvasB]);
      });
    }
    var cmpTeamBtn = mountEl.querySelector('.labs-fn-meet-team');
    if (cmpTeamBtn && opts.onOpenTeam) {
      cmpTeamBtn.addEventListener('click', opts.onOpenTeam);
    }
    var cmpCopyVerdictBtn = mountEl.querySelector('.labs-copy-verdict-btn');
    if (cmpCopyVerdictBtn) {
      cmpCopyVerdictBtn.addEventListener('click', function () {
        var txt = this.getAttribute('data-verdict-copy') || shareVerdict;
        if (opts.onCopyVerdict) opts.onCopyVerdict(txt);
      });
    }

    if (activeRowId) {
      openInlineRow(activeRowId);
    }

    return {
      resize: function () {
        if (specA) specA.resize();
        if (specB) specB.resize();
        if (activeRowId === 'authenticity' && activeMountEl) {
          var authCanvas = activeMountEl.querySelector('canvas[data-auth-chart]');
          if (authCanvas) drawAuthenticityPlot(authCanvas, authA, authB, labelA, labelB, typeof authCanvas._labsSelIdx === 'number' ? { selectedIdx: authCanvas._labsSelIdx } : null);
        } else if (Forensics && activeMountEl && activeForensicsKey) {
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
      name: 'Barometric Sub-Bass Front',
      emoji: '⛈️',
      color: '#60A5FA',
      pitchLog: Math.log2(82),
      flatness: 0.16,
      modDepth: 0.25,
      subShare: 0.56,
      crest: 0.52,
      wetness: 0.25,
      description: 'Sustained sub-120 Hz low-frequency resonance exhibiting pronounced acoustic energy propagation.'
    },
    {
      name: 'High-Frequency Resonant Mode',
      emoji: '📡',
      color: '#FACC15',
      pitchLog: Math.log2(340),
      flatness: 0.22,
      modDepth: 0.22,
      subShare: 0.14,
      crest: 0.55,
      wetness: 0.22,
      description: 'Constricted aperture harmonic oscillation maintaining tonal stability above 220 Hz.'
    },
    {
      name: 'Multi-Burst Staccato Regime',
      emoji: '📊',
      color: '#F97316',
      pitchLog: Math.log2(145),
      flatness: 0.30,
      modDepth: 0.68,
      subShare: 0.35,
      crest: 0.65,
      wetness: 0.48,
      description: 'Segmented multi-impulse discharge governed by pronounced 8–30 Hz periodic amplitude modulation.'
    },
    {
      name: 'Broadband Laminar Dispersion',
      emoji: '💨',
      color: '#9CA3AF',
      pitchLog: Math.log2(260),
      flatness: 0.62,
      modDepth: 0.16,
      subShare: 0.16,
      crest: 0.28,
      wetness: 0.16,
      description: 'High spectral flatness characteristic of unvoiced laminar airflow dispersion.'
    },
    {
      name: 'Hydro-Acoustic Turbulence Profile',
      emoji: '💧',
      color: '#8B5CF6',
      pitchLog: Math.log2(135),
      flatness: 0.34,
      modDepth: 0.55,
      subShare: 0.32,
      crest: 0.48,
      wetness: 0.78,
      description: 'Elevated mid-band spectral flux paired with rapid transient fluid-boundary modulation.'
    },
    {
      name: 'Equilibrium Mid-Band Profile',
      emoji: '⚡',
      color: '#22C55E',
      pitchLog: Math.log2(150),
      flatness: 0.25,
      modDepth: 0.32,
      subShare: 0.40,
      crest: 0.54,
      wetness: 0.34,
      description: 'Balanced midrange harmonic structure exhibiting textbook Institute spectral equilibrium.'
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

  /* ==================== REUSABLE SINGLE & GROUP 2D CHART PLOTS + ARCHIVE OVERLAYS ==================== */
  function erfApprox(x) {
    var sign = x < 0 ? -1 : 1;
    var ax = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * ax);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function percentileAgainstArchive(val, samplesArr, fieldName, fallbackMean, fallbackStd) {
    var vals = [];
    if (Array.isArray(samplesArr)) {
      for (var i = 0; i < samplesArr.length; i++) {
        var f = samplesArr[i] && samplesArr[i].features;
        if (f && typeof f[fieldName] === 'number' && Number.isFinite(f[fieldName]) && f[fieldName] > 0) {
          vals.push(f[fieldName]);
        }
      }
    }
    if (vals.length >= 4) {
      var below = 0;
      for (var j = 0; j < vals.length; j++) {
        if (vals[j] <= val) below++;
      }
      return clamp(Math.round((below / vals.length) * 100), 4, 99);
    }
    var z = (val - fallbackMean) / Math.max(1e-4, fallbackStd);
    var p = 0.5 * (1 + erfApprox(z / Math.SQRT2));
    return clamp(Math.round(p * 100), 4, 99);
  }

  function buildArchiveBaselines(feat, archiveSamples) {
    var avgSpec = feat && feat.avgSpectrum ? feat.avgSpectrum : [];
    var nSpec = avgSpec.length || 40;
    var fc = feat && feat.spectrogram && feat.spectrogram.freqCenters;
    var specMean = new Array(nSpec);
    var specSpread = new Array(nSpec);

    for (var i = 0; i < nSpec; i++) {
      var fHz = fc && i < fc.length ? safeNum(fc[i], 200) : 45 * Math.pow(4200 / 45, i / Math.max(1, nSpec - 1));
      var prior = 0.62 * Math.exp(-Math.pow((Math.log2(fHz) - Math.log2(165)) / 1.55, 2)) + 0.14;
      var sum = prior * 2.0;
      var sumSq = prior * prior * 2.0;
      var cnt = 2;
      if (Array.isArray(archiveSamples)) {
        for (var s = 0; s < archiveSamples.length; s++) {
          var sf = archiveSamples[s] && archiveSamples[s].features;
          if (sf && sf.avgSpectrum && i < sf.avgSpectrum.length) {
            var v = clamp(safeNum(sf.avgSpectrum[i], 0), 0, 1);
            sum += v;
            sumSq += v * v;
            cnt++;
          }
        }
      }
      var mu = sum / cnt;
      var variance = Math.max(0.008, sumSq / cnt - mu * mu);
      specMean[i] = clamp(mu, 0.04, 0.92);
      specSpread[i] = clamp(1.96 * Math.sqrt(variance) * 0.65, 0.06, 0.28);
    }

    var ms = feat && feat.modSpectrum ? feat.modSpectrum : [];
    var nMod = ms.length || 24;
    var modMean = new Array(nMod);
    for (var m = 0; m < nMod; m++) {
      var mHz = 4 + (m / Math.max(1, nMod - 1)) * 41;
      var mPrior = 0.56 * Math.exp(-Math.pow((mHz - 14.5) / 8.5, 2)) + 0.12;
      var mSum = mPrior * 2.0;
      var mCnt = 2;
      if (Array.isArray(archiveSamples)) {
        for (var k = 0; k < archiveSamples.length; k++) {
          var mf = archiveSamples[k] && archiveSamples[k].features;
          if (mf && mf.modSpectrum && m < mf.modSpectrum.length) {
            mSum += clamp(safeNum(mf.modSpectrum[m], 0), 0, 1);
            mCnt++;
          }
        }
      }
      modMean[m] = clamp(mSum / mCnt, 0.05, 0.85);
    }

    var env = feat && feat.envelope ? feat.envelope : [];
    var nEnv = env.length || 32;
    var envMean = new Array(nEnv);
    for (var e = 0; e < nEnv; e++) {
      var tf = e / Math.max(1, nEnv - 1);
      var ePrior = tf < 0.16 ? 0.18 + (tf / 0.16) * 0.62 : 0.80 * Math.exp(-(tf - 0.16) * 2.45);
      envMean[e] = clamp(ePrior, 0.04, 0.9);
    }

    return { specMean: specMean, specSpread: specSpread, modMean: modMean, envMean: envMean };
  }

  function ordinalPct(p) {
    var mod100 = p % 100;
    if (mod100 >= 11 && mod100 <= 13) return p + 'th';
    var mod10 = p % 10;
    if (mod10 === 1) return p + 'st';
    if (mod10 === 2) return p + 'nd';
    if (mod10 === 3) return p + 'rd';
    return p + 'th';
  }

  function buildFinalChartsMetadata(sound, feat, bonus, archiveSamples) {
    var f = feat || {};
    var bases = buildArchiveBaselines(f, archiveSamples);
    var spec = f.avgSpectrum || [];
    var fc = f.spectrogram && f.spectrogram.freqCenters;
    var centHz = safeNum(f.spectralCentroidHz, 240);
    var peakSpecIdx = 0;
    var peakSpecVal = -1;
    var subPeakIdx = 0;
    var subPeakVal = -1;
    var upperIdx = Math.floor(spec.length * 0.55);
    var maxArchDiffIdx = 0;
    var maxArchDiffVal = -1;
    for (var si = 0; si < spec.length; si++) {
      if (spec[si] > peakSpecVal) { peakSpecVal = spec[si]; peakSpecIdx = si; }
      var bHz = fc && si < fc.length ? fc[si] : 45 * Math.pow(4200 / 45, si / Math.max(1, spec.length - 1));
      if (bHz <= 165 && spec[si] > subPeakVal) { subPeakVal = spec[si]; subPeakIdx = si; }
      var diffArch = spec[si] - (bases.specMean[si] || 0.25);
      if (diffArch > maxArchDiffVal && si >= upperIdx * 0.4) { maxArchDiffVal = diffArch; maxArchDiffIdx = si; }
    }
    var specHzAt = function (idx) {
      return fc && idx < fc.length ? Math.round(fc[idx]) : Math.round(45 * Math.pow(4200 / 45, idx / Math.max(1, spec.length - 1)));
    };
    var peakSpecHz = specHzAt(peakSpecIdx);
    var subPeakHz = specHzAt(subPeakIdx);
    var outlierHz = specHzAt(maxArchDiffIdx);
    var specPct = percentileAgainstArchive(centHz, archiveSamples, 'spectralCentroidHz', 235, 110);
    var specAnomaly = peakSpecVal > 0.72 && (bases.specMean[peakSpecIdx] || 0.35) < peakSpecVal - 0.22;

    var pArr = f.pitchHzArr || [];
    var voicedPts = [];
    var maxPitch = 0;
    var minPitch = 9999;
    var maxPitchFrame = 0;
    var minPitchFrame = 0;
    var steepFrame = 0;
    var maxStepJump = 0;
    var prevV = 0;
    for (var pi = 0; pi < pArr.length; pi++) {
      if (pArr[pi] > 20) {
        voicedPts.push(pArr[pi]);
        if (pArr[pi] > maxPitch) { maxPitch = pArr[pi]; maxPitchFrame = pi; }
        if (pArr[pi] < minPitch) { minPitch = pArr[pi]; minPitchFrame = pi; }
        if (prevV > 20 && Math.abs(pArr[pi] - prevV) > maxStepJump) {
          maxStepJump = Math.abs(pArr[pi] - prevV);
          steepFrame = pi;
        }
        prevV = pArr[pi];
      } else {
        prevV = 0;
      }
    }
    var meanPitch = voicedPts.length ? voicedPts.reduce(function (a, b) { return a + b; }, 0) / voicedPts.length : safeNum(f.medianPitchHz, 0);
    var pitchCi = voicedPts.length >= 3 ? Math.max(4, Math.round(clamp(safeNum(f.pitchRangeSemitones, 2) * 3.8, 4, 48))) : 16;
    var pitchPct = percentileAgainstArchive(meanPitch || centHz, archiveSamples, 'medianPitchHz', 145, 55);
    var pitchSpanSt = safeNum(f.pitchRangeSemitones, 0);

    var ms = f.modSpectrum || [];
    var modRate = safeNum(f.modRateHz, 12);
    var modDepthPct = Math.round(clamp(safeNum(f.modDepth, 0.25) * 100, 0, 220));
    var modPct = percentileAgainstArchive(safeNum(f.modDepth, 0.25), archiveSamples, 'modDepth', 0.36, 0.18);
    var highTurb = modDepthPct >= 55 || modRate >= 22;
    var modPeakNorm = clamp((modRate - 4) / 41, 0.04, 0.96);

    var durSec = Math.max(0.05, safeNum(f.duration, 0.5));
    var crestDb = safeNum(f.crestFactorDb, 8);
    var envPct = percentileAgainstArchive(crestDb, archiveSamples, 'crestFactorDb', 9.2, 3.0);
    var env = f.envelope || [];
    var atkMs = Math.round(safeNum(f.attackSec, 0.08) * 1000);
    var bursts = f.burstCount || 1;
    var envPeakIdx = 0;
    var envPeakVal = -1;
    for (var ei = 0; ei < env.length; ei++) {
      if (env[ei] > envPeakVal) { envPeakVal = env[ei]; envPeakIdx = ei; }
    }
    var envPeakNorm = envPeakIdx / Math.max(1, env.length - 1);
    var t50Norm = clamp(safeNum(f.t50Ratio, 0.5), 0.08, 0.92);

    var specHotspots = [
      {
        id: 'hs_spec_peak',
        norm: (peakSpecIdx + 0.5) / Math.max(1, spec.length),
        spanLo: clamp((peakSpecIdx - 2) / Math.max(1, spec.length), 0, 1),
        spanHi: clamp((peakSpecIdx + 3) / Math.max(1, spec.length), 0, 1),
        tag: specAnomaly ? 'Significant Harmonic Concentration' : 'Research Candidate',
        obsLabel: 'Laboratory Observation',
        title: (specAnomaly ? 'Significant Harmonic Concentration' : 'Primary Spectral Cluster') + ' @ ' + peakSpecHz + ' Hz',
        telemetry: peakSpecHz + ' Hz · ' + Math.round(clamp(peakSpecVal, 0, 1) * 100) + '% Peak Energy (' + ordinalPct(specPct) + ' pct)',
        story: 'A significant concentration of acoustic energy was detected within this ' + peakSpecHz + ' Hz region, maintaining elevated spectral stability relative to neighboring bands.',
        scientistId: 'wobble',
        scientistQuote: pickScientistComment('wobble', peakSpecHz + 'spec', 0).quote
      },
      {
        id: 'hs_spec_thunder',
        norm: (subPeakIdx + 0.5) / Math.max(1, spec.length),
        spanLo: 0,
        spanHi: clamp((subPeakIdx + 4) / Math.max(1, spec.length), 0.15, 0.45),
        tag: 'Elevated Energy Release Zone',
        obsLabel: 'Field Observation',
        title: 'Elevated Energy Release Zone @ ' + subPeakHz + ' Hz',
        telemetry: 'Sub-165 Hz Core · ' + Math.round(clamp(subPeakVal, 0, 1) * 100) + '% Low-Band Output',
        story: 'High-energy low-frequency acoustic release anchored near ' + subPeakHz + ' Hz. Comparable behaviour appears in only a small subset of preserved recordings.',
        scientistId: 'turbulence',
        scientistQuote: pickScientistComment('turbulence', subPeakHz + 'thunder', 1).quote
      },
      {
        id: 'hs_spec_outlier',
        norm: (maxArchDiffIdx + 0.5) / Math.max(1, spec.length),
        spanLo: clamp((maxArchDiffIdx - 2) / Math.max(1, spec.length), 0, 1),
        spanHi: clamp((maxArchDiffIdx + 3) / Math.max(1, spec.length), 0, 1),
        tag: 'Archive Anomaly',
        obsLabel: 'Research Note',
        title: 'Archive Anomaly @ ' + outlierHz + ' Hz',
        telemetry: outlierHz + ' Hz · +' + Math.round(maxArchDiffVal * 100) + '% vs Institute Archive baseline',
        story: 'This frequency cluster falls outside typical archive distributions at ' + outlierHz + ' Hz. Several researchers have requested additional examination of this area.',
        scientistId: 'flatley',
        scientistQuote: pickScientistComment('flatley', outlierHz + 'outlier', 2).quote
      }
    ];

    var pitchHotspots = [
      {
        id: 'hs_pitch_peak',
        norm: maxPitchFrame / Math.max(1, pArr.length - 1),
        spanLo: clamp((maxPitchFrame - 2) / Math.max(1, pArr.length - 1), 0, 1),
        spanHi: clamp((maxPitchFrame + 2) / Math.max(1, pArr.length - 1), 0, 1),
        tag: 'Primary Resonance Event',
        obsLabel: 'Peer Review Observation',
        title: voicedPts.length ? 'Primary Resonance Event @ ' + Math.round(maxPitch) + ' Hz' : 'Unvoiced Aerodynamic Window',
        telemetry: voicedPts.length ? 'Peak F0 ' + Math.round(maxPitch) + ' Hz · Frame ' + (maxPitchFrame + 1) + ' (±' + pitchCi + ' Hz CI)' : 'Unvoiced Broadband Regime',
        story: voicedPts.length
          ? 'Primary resonance locked onto ' + Math.round(maxPitch) + ' Hz with exceptional harmonic discipline. This pattern exceeds archive averages and warrants further study.'
          : 'No periodic fundamental contour detected — broadband aerodynamic dispersion remained stable across active frames.',
        scientistId: 'wobble',
        scientistQuote: pickScientistComment('wobble', Math.round(maxPitch) + 'pitch', 1).quote
      },
      {
        id: 'hs_pitch_inflect',
        norm: steepFrame / Math.max(1, pArr.length - 1),
        spanLo: clamp((steepFrame - 2) / Math.max(1, pArr.length - 1), 0, 1),
        spanHi: clamp((steepFrame + 2) / Math.max(1, pArr.length - 1), 0, 1),
        tag: 'Research Candidate',
        obsLabel: 'Peer Review Comment',
        title: 'Resonance Inflection Shift (' + pitchSpanSt.toFixed(1) + ' st span)',
        telemetry: 'Sweep Span ' + pitchSpanSt.toFixed(1) + ' semitones · ' + ordinalPct(pitchPct) + ' pct',
        story: 'Primary resonance traversed ' + pitchSpanSt.toFixed(1) + ' semitones mid-emission. The science team remains interested in these findings for comparative resonance modeling.',
        scientistId: 'bottomsworth',
        scientistQuote: pickScientistComment('bottomsworth', pitchSpanSt + 'sweep', 2).quote
      },
      {
        id: 'hs_pitch_base',
        norm: minPitchFrame / Math.max(1, pArr.length - 1),
        spanLo: clamp((minPitchFrame - 2) / Math.max(1, pArr.length - 1), 0, 1),
        spanHi: clamp((minPitchFrame + 2) / Math.max(1, pArr.length - 1), 0, 1),
        tag: 'Archive Observation',
        obsLabel: 'Archive Note',
        title: 'Register Floor vs 90–240 Hz Reference Corridor',
        telemetry: 'Floor ' + (minPitch < 9000 ? Math.round(minPitch) + ' Hz' : 'Broadband') + ' · Mean ' + Math.round(meanPitch || centHz) + ' Hz',
        story: 'This characteristic sits at the ' + ordinalPct(pitchPct) + ' archive percentile against our preserved 90–240 Hz corridor. Several comparable events appear in historical recordings.',
        scientistId: 'pufferton',
        scientistQuote: pickScientistComment('pufferton', Math.round(meanPitch) + 'floor', 0).quote
      }
    ];

    var modHotspots = [
      {
        id: 'hs_mod_peak',
        norm: modPeakNorm,
        spanLo: clamp(modPeakNorm - 0.1, 0, 1),
        spanHi: clamp(modPeakNorm + 0.1, 0, 1),
        tag: 'Primary Resonance Event',
        obsLabel: 'Field Observation',
        title: 'Peak Oscillation Cadence @ ' + Math.round(modRate) + ' Hz',
        telemetry: Math.round(modRate) + ' Hz (' + Math.round(modRate * 60) + ' cycles/min) · Depth ' + modDepthPct + '%',
        story: 'Sustained ' + Math.round(modRate * 60) + ' oscillation cycles/min at ' + modDepthPct + '% modulation depth. High-energy airflow behaviour exceeded nominal pressure dynamics predictions.',
        scientistId: 'turbulence',
        scientistQuote: pickScientistComment('turbulence', modDepthPct + 'turb', 0).quote
      },
      {
        id: 'hs_mod_flutter',
        norm: 0.25,
        spanLo: (8 - 4) / 41,
        spanHi: (20 - 4) / 41,
        tag: 'Elevated Energy Release Zone',
        obsLabel: 'Research Observation',
        title: 'Primary Oscillation Band (8–20 Hz)',
        telemetry: Math.round(safeNum(f.modBands && f.modBands[1], 0.34) * 100) + '% Modulation Share',
        story: 'The 8–20 Hz modulation regime accounts for ' + Math.round(safeNum(f.modBands && f.modBands[1], 0.34) * 100) + '% of total envelope energy, exceeding archive baseline distributions.',
        scientistId: 'wobble',
        scientistQuote: pickScientistComment('wobble', modRate + 'band', 2).quote
      },
      {
        id: 'hs_mod_rattle',
        norm: 0.68,
        spanLo: (20 - 4) / 41,
        spanHi: 1,
        tag: 'Acoustic Irregularity Region',
        obsLabel: 'Archive Observation',
        title: 'Acoustic Irregularity Region (20–45 Hz)',
        telemetry: Math.round(safeNum(f.modBands && f.modBands[2], 0.3) * 100) + '% Rapid Modulation Share (' + ordinalPct(modPct) + ' pct)',
        story: 'Rapid envelope oscillation above 20 Hz constitutes an uncommon characteristic among recorded samples, warranting supplemental Fourier review.',
        scientistId: 'flatley',
        scientistQuote: pickScientistComment('flatley', modPct + 'rattle', 1).quote
      }
    ];

    var envHotspots = [
      {
        id: 'hs_env_peak',
        norm: envPeakNorm,
        spanLo: clamp(envPeakNorm - 0.08, 0, 1),
        spanHi: clamp(envPeakNorm + 0.08, 0, 1),
        tag: 'Elevated Energy Release Zone',
        obsLabel: 'Laboratory Observation',
        title: 'Peak Acoustic Energy Release @ ' + Math.round(envPeakNorm * durSec * 1000) + ' ms',
        telemetry: 'Onset ' + atkMs + 'ms · Crest ' + crestDb.toFixed(1) + ' dB (' + ordinalPct(envPct) + ' pct)',
        story: 'Maximum ' + crestDb.toFixed(1) + ' dB acoustic energy output developed within ' + atkMs + ' ms. A significant concentration of energy was detected within this region.',
        scientistId: 'bottomsworth',
        scientistQuote: pickScientistComment('bottomsworth', crestDb + 'crest', 3).quote
      },
      {
        id: 'hs_env_t50',
        norm: t50Norm,
        spanLo: clamp(t50Norm - 0.1, 0, 1),
        spanHi: clamp(t50Norm + 0.1, 0, 1),
        tag: 'Research Candidate',
        obsLabel: 'Field Observation',
        title: 'T50 Energy Equilibrium Coordinate (' + Math.round(t50Norm * 100) + '%)',
        telemetry: 'Half-Energy Released @ ' + Math.round(t50Norm * durSec * 1000) + 'ms · ±18ms CI',
        story: 'Fifty percent of cumulative pressure release occurred prior to ' + Math.round(t50Norm * 100) + '% emission lifetime, indicating front-loaded discharge kinetics.',
        scientistId: 'turbulence',
        scientistQuote: pickScientistComment('turbulence', Math.round(t50Norm * 100) + 't50', 2).quote
      },
      {
        id: 'hs_env_tail',
        norm: clamp(0.82, 0, 1),
        spanLo: 0.68,
        spanHi: 1.0,
        tag: bursts > 1 ? 'Acoustic Irregularity Region' : 'Archive Anomaly',
        obsLabel: 'Field Observation',
        title: bursts > 1 ? bursts + '-Burst Terminal Phase' : 'Disciplined Attenuation Phase',
        telemetry: bursts + ' Impulse Segment(s) · ' + durSec.toFixed(2) + 's Emission Lifetime',
        story: bursts > 1
          ? 'High-energy airflow behaviour was observed near the terminal phase across ' + bursts + ' distinct segments. Comparable behaviour appears in only a small subset of preserved recordings.'
          : 'Smooth laminar attenuation observed across the terminal decay boundary. This characteristic has strong preservation potential within the Institute collection.',
        scientistId: 'pufferton',
        scientistQuote: pickScientistComment('pufferton', bursts + 'tail', 2).quote
      }
    ];

    return {
      bases: bases,
      c_spec: {
        key: 'c_spec',
        modalTitle: 'Spectral Distribution Map (40-Band FFT)',
        modalSubtitle: 'Logarithmic spectral energy (45 Hz – 4.2 kHz) vs Institute Archive baseline & 95% confidence corridor',
        extraLayerLabel: 'Band Division Markers',
        expertIds: ['wobble', 'flatley'],
        percentile: specPct,
        percentileLabel: ordinalPct(specPct) + ' percentile',
        ciLabel: '95% CI ±11%',
        anomalyTag: specAnomaly ? 'Significant Harmonic Concentration' : (specPct >= 75 ? 'Research Candidate' : 'Within Archive Norm'),
        scientistId: 'wobble',
        observation: specAnomaly
          ? 'Significant Harmonic Concentration detected at ' + peakSpecHz + ' Hz. This pattern exceeds archive averages and warrants further study.'
          : specPct >= 75
          ? 'Spectral centroid reaches ' + Math.round(centHz) + ' Hz, exceeding typical Institute archive distributions across upper harmonics.'
          : 'Harmonic distribution remains cleanly anchored around ' + peakSpecHz + ' Hz relative to preserved Archive baselines.',
        defaultReadout: 'Peak ' + peakSpecHz + ' Hz (' + Math.round(clamp(peakSpecVal, 0, 1) * 100) + '% rel) · Archive Avg @ Peak: ' + Math.round((bases.specMean[peakSpecIdx] || 0.3) * 100) + '% · Tap any bar or annotation',
        hotspots: specHotspots,
        describeAtNorm: function (norm) {
          var idx = clamp(Math.floor(norm * Math.max(1, spec.length)), 0, Math.max(0, spec.length - 1));
          var hz = specHzAt(idx);
          var valPct = Math.round(clamp(safeNum(spec[idx], 0), 0, 1) * 100);
          var avgPct = Math.round(clamp(safeNum(bases.specMean[idx], 0.25), 0, 1) * 100);
          var diff = valPct - avgPct;
          var regionLabel = hz < 150 ? 'Elevated Energy Release Zone' : hz < 450 ? 'Significant Harmonic Concentration' : 'Research Candidate';
          var sciPick = hz < 150 ? 'turbulence' : 'wobble';
          return {
            tag: diff >= 18 ? 'Archive Anomaly' : regionLabel,
            obsLabel: diff >= 18 ? 'Archive Observation' : 'Research Note',
            title: hz + ' Hz Spectral Region (' + valPct + '% magnitude)',
            telemetry: hz + ' Hz · Level ' + valPct + '% vs Archive ' + avgPct + '% (' + (diff >= 0 ? '+' : '') + diff + '%)',
            story: diff >= 18
              ? 'This frequency cluster falls outside typical archive distributions (+' + diff + '% above archive mean at ' + hz + ' Hz). Several researchers have requested additional examination of this area.'
              : 'Measured ' + valPct + '% relative spectral energy at ' + hz + ' Hz (' + (diff >= 0 ? '+' : '') + diff + '% vs archive mean, 95% CI ±11%). Harmonically consistent with preserved reference profiles.',
            scientistId: sciPick,
            scientistQuote: pickScientistComment(sciPick, hz + 'probe', idx).quote,
            spanLo: clamp((idx - 1.5) / Math.max(1, spec.length), 0, 1),
            spanHi: clamp((idx + 2.5) / Math.max(1, spec.length), 0, 1)
          };
        },
        sampleAtNorm: function (norm) {
          var idx = clamp(Math.floor(norm * Math.max(1, spec.length)), 0, Math.max(0, spec.length - 1));
          var hz = specHzAt(idx);
          var valPct = Math.round(clamp(safeNum(spec[idx], 0), 0, 1) * 100);
          var avgPct = Math.round(clamp(safeNum(bases.specMean[idx], 0.25), 0, 1) * 100);
          var ciPct = Math.round(clamp(safeNum(bases.specSpread[idx], 0.12), 0.04, 0.35) * 100);
          var diff = valPct - avgPct;
          return hz + ' Hz · Level ' + valPct + '% vs Archive ' + avgPct + '% (' + (diff >= 0 ? '+' : '') + diff + '%, ±' + ciPct + '% CI)';
        },
        drillStats: [
          { label: 'Harmonic Peak', value: peakSpecHz + ' Hz', sub: Math.round(clamp(peakSpecVal, 0, 1) * 100) + '% normalized energy' },
          { label: 'Archive Percentile', value: ordinalPct(specPct), sub: 'Centroid ' + Math.round(centHz) + ' Hz' },
          { label: '95% Confidence Band', value: '±11% mag', sub: 'Archive mean corridor overlaid' },
          { label: 'Discovery Flag', value: specAnomaly ? 'Archive Anomaly' : 'Calibrated Spread', sub: specAnomaly ? 'Dr. Wobble spectral alert' : 'Normal dispersion spread' }
        ],
        drillNote: 'Historical Archive Comparison & Confidence Discussion: 40-band Spectral Distribution Map plotted directly against the Institute Archive baseline mean (dashed amber) and 95% statistical confidence interval (shaded corridor). Select any bar or callout to examine outlier deviations.'
      },
      c_pitch: {
        key: 'c_pitch',
        modalTitle: 'Primary Resonance Profile & Frequency Sweep',
        modalSubtitle: '32-frame YIN fundamental contour overlaid on Institute 90–240 Hz archival register corridor',
        extraLayerLabel: 'Register Inflection Markers',
        expertIds: ['wobble', 'bottomsworth'],
        percentile: pitchPct,
        percentileLabel: ordinalPct(pitchPct) + ' percentile',
        ciLabel: '95% CI ±' + pitchCi + ' Hz',
        anomalyTag: pitchSpanSt >= 5 ? 'Archive Anomaly' : voicedPts.length === 0 ? 'Acoustic Irregularity Region' : 'Primary Resonance Event',
        scientistId: 'wobble',
        observation: pitchSpanSt >= 5
          ? 'A wide ' + pitchSpanSt.toFixed(1) + '-semitone inflection trajectory exceeds archive averages and warrants further study.'
          : voicedPts.length === 0
          ? 'Emissions remained broadband unvoiced across all 32 frames, resisting classical pitch extraction.'
          : 'Dr. Wobble verified disciplined harmonic contour tracking within the 90–240 Hz Institute corridor.',
        defaultReadout: voicedPts.length ? 'Mean ' + Math.round(meanPitch) + ' Hz (Peak ' + Math.round(maxPitch) + ' Hz @ Frame ' + (maxPitchFrame + 1) + ') · Tap contour points to inspect' : 'Unvoiced emission (<25% voiced frames) · Corridor 90–240 Hz shown · Tap to probe',
        hotspots: pitchHotspots,
        describeAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, pArr.length - 1)), 0, Math.max(0, pArr.length - 1));
          var tSec = (idx / Math.max(1, pArr.length - 1)) * durSec;
          var hz = safeNum(pArr[idx], 0);
          return {
            tag: hz > 240 ? 'Archive Anomaly' : hz > 20 ? 'Primary Resonance Event' : 'Acoustic Irregularity Region',
            obsLabel: hz > 240 ? 'Archive Note' : 'Laboratory Observation',
            title: hz > 20 ? 'Frame ' + (idx + 1) + ' Primary Resonance (' + Math.round(hz) + ' Hz)' : 'Frame ' + (idx + 1) + ' Broadband Dispersion',
            telemetry: 't=' + tSec.toFixed(2) + 's · ' + (hz > 20 ? Math.round(hz) + ' Hz (±' + pitchCi + ' Hz CI)' : 'Broadband Turbulence'),
            story: hz > 20
              ? 'At ' + tSec.toFixed(2) + 's, primary resonance sustained ' + Math.round(hz) + ' Hz (' + (hz > 240 ? 'above the 240 Hz archive ceiling — uncommon among recorded samples' : hz < 90 ? 'within the sub-90 Hz barometric floor' : 'inside the primary 90–240 Hz harmonic reference corridor') + ').'
              : 'At ' + tSec.toFixed(2) + 's, transient airflow dispersion dominated harmonic locking, generating unvoiced broadband energy.',
            scientistId: hz > 240 ? 'bottomsworth' : 'wobble',
            scientistQuote: pickScientistComment(hz > 240 ? 'bottomsworth' : 'wobble', idx + 'f0', 0).quote,
            spanLo: clamp((idx - 1.5) / Math.max(1, pArr.length - 1), 0, 1),
            spanHi: clamp((idx + 1.5) / Math.max(1, pArr.length - 1), 0, 1)
          };
        },
        sampleAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, pArr.length - 1)), 0, Math.max(0, pArr.length - 1));
          var tSec = (idx / Math.max(1, pArr.length - 1)) * durSec;
          var hz = safeNum(pArr[idx], 0);
          return hz > 20
            ? 't=' + tSec.toFixed(2) + 's · Resonance ' + Math.round(hz) + ' Hz (95% CI ±' + pitchCi + ' Hz · Archive typ 90–240 Hz)'
            : 't=' + tSec.toFixed(2) + 's · Broadband frame (Unvoiced airflow · Archive typ 90–240 Hz)';
        },
        drillStats: [
          { label: 'Mean Resonance F0', value: voicedPts.length ? Math.round(meanPitch) + ' Hz' : 'Broadband', sub: voicedPts.length + '/' + pArr.length + ' voiced frames' },
          { label: '95% Confidence', value: '±' + pitchCi + ' Hz', sub: 'Inter-frame stability margin' },
          { label: 'Archive Percentile', value: ordinalPct(pitchPct), sub: 'Vs historical corpus' },
          { label: 'Sweep Excursion', value: pitchSpanSt.toFixed(1) + ' st', sub: pitchSpanSt >= 5 ? 'Archive anomaly span' : 'Controlled trajectory' }
        ],
        drillNote: 'Archive Comparison & Confidence Discussion: Frame-by-frame YIN fundamental resonance overlaid against the 90–240 Hz Institute Archive Reference Corridor and ±95% inter-frame confidence bounds.'
      },
      c_mod: {
        key: 'c_mod',
        modalTitle: 'Airflow Modulation & Oscillation FFT (4–45 Hz)',
        modalSubtitle: 'Periodic oscillation cadence relative to Institute Archive modulation baselines',
        extraLayerLabel: '3-Regime Modulation Zones',
        expertIds: ['turbulence', 'wobble'],
        percentile: modPct,
        percentileLabel: ordinalPct(modPct) + ' percentile',
        ciLabel: '95% CI ±9% depth',
        anomalyTag: highTurb ? 'Acoustic Irregularity Region' : 'Research Candidate',
        scientistId: 'turbulence',
        observation: highTurb
          ? 'Elevated oscillation concentration recorded at ' + Math.round(modRate * 60) + ' cycles/min, exceeding typical Institute archive distributions.'
          : 'Airflow modulation remains disciplined around ' + Math.round(modRate) + ' Hz. Dr. Turbulence noted balanced aerodynamic organization.',
        defaultReadout: 'Peak ' + Math.round(modRate) + ' Hz (' + Math.round(modRate * 60) + ' cycles/min) · Depth ' + modDepthPct + '% · Tap any modulation band',
        hotspots: modHotspots,
        describeAtNorm: function (norm) {
          var mHz = 4 + norm * 41;
          var idx = clamp(Math.round(norm * Math.max(0, ms.length - 1)), 0, Math.max(0, ms.length - 1));
          var zone = mHz < 8 ? 'Low-Frequency Cadence' : mHz < 20 ? 'Mid-Band Oscillation' : 'Rapid Oscillation';
          var mVal = Math.round(clamp(safeNum(ms[idx], 0), 0, 1) * 100);
          var mAvg = Math.round(clamp(safeNum(bases.modMean[idx], 0.25), 0, 1) * 100);
          return {
            tag: mVal >= mAvg + 15 ? 'Acoustic Irregularity Region' : 'Elevated Energy Release Zone',
            obsLabel: 'Peer Review Observation',
            title: zone + ' @ ' + mHz.toFixed(1) + ' Hz (' + Math.round(mHz * 60) + ' cycles/min)',
            telemetry: mVal + '% Modulation Energy vs ' + mAvg + '% Archive Avg',
            story: 'At ' + Math.round(mHz * 60) + ' cycles/min (' + zone + '), envelope modulation carries ' + mVal + '% relative energy against a ' + mAvg + '% archive average. Comparable behaviour appears in only a small subset of preserved recordings.',
            scientistId: 'turbulence',
            scientistQuote: pickScientistComment('turbulence', Math.round(mHz) + 'mod', idx).quote,
            spanLo: clamp(norm - 0.08, 0, 1),
            spanHi: clamp(norm + 0.08, 0, 1)
          };
        },
        sampleAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, ms.length - 1)), 0, Math.max(0, ms.length - 1));
          var mHz = 4 + norm * 41;
          var zone = mHz < 8 ? 'Low Cadence' : mHz < 20 ? 'Mid Oscillation' : 'Rapid Oscillation';
          var mVal = Math.round(clamp(safeNum(ms[idx], 0), 0, 1) * 100);
          var mAvg = Math.round(clamp(safeNum(bases.modMean[idx], 0.25), 0, 1) * 100);
          return mHz.toFixed(1) + ' Hz (' + Math.round(mHz * 60) + ' cycles/min · ' + zone + ') · Energy ' + mVal + '% vs Archive ' + mAvg + '%';
        },
        drillStats: [
          { label: 'Dominant Cadence', value: Math.round(modRate) + ' Hz', sub: Math.round(modRate * 60) + ' cycles/min' },
          { label: 'Modulation Depth', value: modDepthPct + '%', sub: 'Archive median ~36% (±9% CI)' },
          { label: 'Archive Percentile', value: ordinalPct(modPct), sub: highTurb ? 'Upper-quartile turbulence' : 'Balanced modulation dynamics' },
          { label: 'Impulse Segments', value: String(bursts), sub: '4–45 Hz modulation bands' }
        ],
        drillNote: 'Archive Comparison & Confidence Discussion: Three oscillatory domains are shaded (4–8 Hz Low Cadence, 8–20 Hz Mid Oscillation, 20–45 Hz Rapid Oscillation) and compared against the dashed Institute Archive mean curve.'
      },
      c_env: {
        key: 'c_env',
        modalTitle: 'Pressure Release Potential & Energy Envelope',
        modalSubtitle: 'Temporal pressure contour vs Institute Archive impulse baseline, onset peak & 0.35 segmentation gate',
        extraLayerLabel: '0.35 Burst Gate Threshold',
        expertIds: ['bottomsworth', 'pufferton'],
        percentile: envPct,
        percentileLabel: ordinalPct(envPct) + ' percentile',
        ciLabel: '95% CI ±18 ms',
        anomalyTag: crestDb >= 12 || bursts > 1 ? 'Elevated Energy Release Zone' : 'Research Candidate',
        scientistId: 'bottomsworth',
        observation: crestDb >= 12
          ? 'Elevated Acoustic Energy Output (' + crestDb.toFixed(1) + ' dB crest) developed within ' + atkMs + ' ms. Additional temporal review requested.'
          : bursts > 1
          ? 'Multi-impulse pressure segmentation exceeds typical single-pulse archive baselines.'
          : 'Pressure onset and terminal attenuation profiles align cleanly within calibrated Institute tolerances.',
        defaultReadout: 'Onset ' + atkMs + 'ms · Crest ' + crestDb.toFixed(1) + ' dB · T50 @ ' + Math.round(t50Norm * 100) + '% · Tap timeline to inspect',
        hotspots: envHotspots,
        describeAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, env.length - 1)), 0, Math.max(0, env.length - 1));
          var tMs = Math.round(norm * durSec * 1000);
          var ampPct = Math.round(clamp(safeNum(env[idx], 0), 0, 1) * 100);
          var archPct = Math.round(clamp(safeNum(bases.envMean[idx], 0.3), 0, 1) * 100);
          return {
            tag: ampPct >= 35 ? 'Elevated Energy Release Zone' : 'Research Candidate',
            obsLabel: norm >= 0.65 ? 'Field Observation' : 'Laboratory Observation',
            title: 'Envelope Coordinate @ ' + tMs + ' ms (' + ampPct + '% pressure)',
            telemetry: 't=' + tMs + 'ms (' + Math.round(norm * 100) + '%) · ' + ampPct + '% Pressure vs ' + archPct + '% Archive',
            story: 'At ' + tMs + ' ms into the emission lifetime, instantaneous pressure registered ' + ampPct + '% of peak output against an archive expectation of ' + archPct + '%.' + (ampPct >= 35 ? ' This region exceeds the 0.35 segmentation threshold.' : ''),
            scientistId: norm < 0.35 ? 'turbulence' : 'bottomsworth',
            scientistQuote: pickScientistComment(norm < 0.35 ? 'turbulence' : 'bottomsworth', idx + 'env', 1).quote,
            spanLo: clamp(norm - 0.07, 0, 1),
            spanHi: clamp(norm + 0.07, 0, 1)
          };
        },
        sampleAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, env.length - 1)), 0, Math.max(0, env.length - 1));
          var tMs = Math.round(norm * durSec * 1000);
          var ampPct = Math.round(clamp(safeNum(env[idx], 0), 0, 1) * 100);
          var archPct = Math.round(clamp(safeNum(bases.envMean[idx], 0.3), 0, 1) * 100);
          return 't=' + tMs + 'ms (' + Math.round(norm * 100) + '%) · Pressure ' + ampPct + '% vs Archive ' + archPct + '% · 95% CI ±18ms';
        },
        drillStats: [
          { label: 'Onset Latency', value: atkMs + ' ms', sub: 'Peak RMS arrival time' },
          { label: 'Crest Factor', value: crestDb.toFixed(1) + ' dB', sub: 'Archive mean ~9.2 dB' },
          { label: 'Archive Percentile', value: ordinalPct(envPct), sub: 'Pressure release rank' },
          { label: '95% Timing CI', value: '±18 ms', sub: 'Segmentation hysteresis' }
        ],
        drillNote: 'Archive Comparison & Confidence Discussion: Normalized RMS pressure envelope overlaid against the preserved Institute Archive baseline curve, highlighting onset peak, T50 coordinate, and 0.35 hysteresis segmentation threshold.'
      }
    };
  }

  function drawChartHotspotsAndSelection(ctx, pad, pw, ph, w, interOpts) {
    if (!interOpts) return;
    var layers = interOpts.layers || {};
    if (Array.isArray(interOpts.highlightRange) && interOpts.highlightRange.length === 2) {
      var xLo = pad.l + clamp(interOpts.highlightRange[0], 0, 1) * pw;
      var xHi = pad.l + clamp(interOpts.highlightRange[1], 0, 1) * pw;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(xLo, pad.t, Math.max(4, xHi - xLo), ph);
    }

    if (layers.callouts !== false && Array.isArray(interOpts.hotspots)) {
      var glyphs = ['1', '2', '3'];
      for (var i = 0; i < interOpts.hotspots.length; i++) {
        var hs = interOpts.hotspots[i];
        var hx = pad.l + clamp(hs.norm, 0.04, 0.96) * pw;
        var isAct = interOpts.activeHotspotId === hs.id;
        var hy = pad.t + (i % 2 === 0 ? 11 : 22);
        ctx.strokeStyle = isAct ? 'rgba(250, 204, 21, 0.8)' : 'rgba(56, 189, 248, 0.38)';
        ctx.lineWidth = isAct ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(hx, hy + 7);
        ctx.lineTo(hx, pad.t + ph);
        ctx.stroke();

        ctx.fillStyle = isAct ? '#FACC15' : '#0EA5E9';
        ctx.beginPath();
        ctx.arc(hx, hy, isAct ? 8 : 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#090D16';
        ctx.font = '800 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(glyphs[i] || String(i + 1), hx, hy + 3);
      }
    }
  }

  function drawSpectrumPlot(target, feat, accent, interOpts) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.avgSpectrum) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 34, r: 12, t: 24, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var spec = feat.avgSpectrum;
    var n = spec.length;
    var barW = Math.max(2, pw / n - 1.5);
    var base = (interOpts && interOpts.archiveBases) || buildArchiveBaselines(feat, interOpts && interOpts.archiveSamples);
    var layers = (interOpts && interOpts.layers) || { archiveAvg: true, ciBand: true, callouts: true, extraLayer: true };

    // Shaded 95% Archive Confidence Band
    if (layers.ciBand !== false && base && base.specMean && base.specMean.length === n) {
      ctx.beginPath();
      for (var bi = 0; bi < n; bi++) {
        var bx = pad.l + ((bi + 0.5) / n) * pw;
        var up = clamp(base.specMean[bi] + base.specSpread[bi], 0, 1);
        var uy = pad.t + ph - up * ph;
        if (bi === 0) ctx.moveTo(bx, uy);
        else ctx.lineTo(bx, uy);
      }
      for (var bj = n - 1; bj >= 0; bj--) {
        var bx2 = pad.l + ((bj + 0.5) / n) * pw;
        var lo = clamp(base.specMean[bj] - base.specSpread[bj], 0, 1);
        var ly = pad.t + ph - lo * ph;
        ctx.lineTo(bx2, ly);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.fill();
    }

    var grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
    grad.addColorStop(0, accent || '#60A5FA');
    grad.addColorStop(1, 'rgba(34, 197, 94, 0.25)');

    var hoverIdx = interOpts && typeof interOpts.hoverNorm === 'number'
      ? clamp(Math.floor(interOpts.hoverNorm * n), 0, n - 1)
      : -1;

    var peakIdx = 0;
    var peakVal = -1;
    for (var i = 0; i < n; i++) {
      var val = clamp(safeNum(spec[i], 0), 0, 1);
      if (val > peakVal) { peakVal = val; peakIdx = i; }
      var bh = Math.max(2, val * ph);
      var x = pad.l + (i / n) * pw;
      ctx.fillStyle = i === hoverIdx ? '#38BDF8' : grad;
      ctx.fillRect(x, pad.t + ph - bh, barW, bh);
    }

    // Extra Layer: 4-Band Division Markers
    if (layers.extraLayer !== false) {
      var divPositions = [0.27, 0.52, 0.74];
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.setLineDash([2, 3]);
      for (var di = 0; di < divPositions.length; di++) {
        var dx = pad.l + divPositions[di] * pw;
        ctx.beginPath();
        ctx.moveTo(dx, pad.t);
        ctx.lineTo(dx, pad.t + ph);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Dashed Archive Mean Line
    if (layers.archiveAvg !== false && base && base.specMean && base.specMean.length === n) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.68)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var ai = 0; ai < n; ai++) {
        var ax = pad.l + ((ai + 0.5) / n) * pw;
        var ay = pad.t + ph - clamp(base.specMean[ai], 0, 1) * ph;
        if (ai === 0) ctx.moveTo(ax, ay);
        else ctx.lineTo(ax, ay);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    var fc = feat.spectrogram && feat.spectrogram.freqCenters;
    var peakX = pad.l + ((peakIdx + 0.5) / n) * pw;
    var peakY = pad.t + ph - clamp(peakVal, 0, 1) * ph;
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
    ctx.fill();

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

    drawChartHotspotsAndSelection(ctx, pad, pw, ph, w, interOpts);

    if (hoverIdx >= 0) {
      var hx = pad.l + ((hoverIdx + 0.5) / n) * pw;
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, pad.t + ph);
      ctx.stroke();
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('45 Hz', pad.l, h - 7);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FDBA74';
    ctx.fillText('Centroid ' + Math.round(centHz) + ' Hz · --- Archive Avg', pad.l + pw * 0.5, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('4.2 kHz', pad.l + pw, h - 7);
    finishDarkPlot(p);
  }

  function drawPitchContourPlot(target, feat, interOpts) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.pitchHzArr) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 38, r: 12, t: 24, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var arr = feat.pitchHzArr;
    var layers = (interOpts && interOpts.layers) || { archiveAvg: true, ciBand: true, callouts: true, extraLayer: true };
    var maxHz = 240;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] > maxHz) maxHz = arr[i];
    }
    maxHz = Math.min(900, Math.max(260, maxHz * 1.15));

    // Archive typical pitch corridor (90-240 Hz)
    if (layers.ciBand !== false) {
      var yArchTop = pad.t + ph - clamp(240 / maxHz, 0, 1) * ph;
      var yArchBot = pad.t + ph - clamp(90 / maxHz, 0, 1) * ph;
      ctx.fillStyle = 'rgba(96, 165, 250, 0.11)';
      ctx.fillRect(pad.l, yArchTop, pw, Math.max(4, yArchBot - yArchTop));
      ctx.fillStyle = 'rgba(147, 197, 253, 0.55)';
      ctx.font = '600 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('Archive Corridor 90–240 Hz', pad.l + pw - 2, Math.max(pad.t + 9, yArchTop + 10));
    }

    if (layers.archiveAvg !== false) {
      var yMean = pad.t + ph - clamp(145 / maxHz, 0, 1) * ph;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.58)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pad.l, yMean);
      ctx.lineTo(pad.l + pw, yMean);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    var drawing = false;
    var pkHz = 0;
    var pkX = pad.l;
    var pkY = pad.t + ph;
    for (var j = 0; j < arr.length; j++) {
      var hz = arr[j];
      var x = pad.l + (j / Math.max(1, arr.length - 1)) * pw;
      if (hz > 20) {
        var y = pad.t + ph - clamp(hz / maxHz, 0, 1) * ph;
        if (hz > pkHz) { pkHz = hz; pkX = x; pkY = y; }
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

    if (layers.extraLayer !== false && pkHz > 20) {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(pkX, pkY, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    drawChartHotspotsAndSelection(ctx, pad, pw, ph, w, interOpts);

    if (interOpts && typeof interOpts.hoverNorm === 'number') {
      var hx = pad.l + clamp(interOpts.hoverNorm, 0, 1) * pw;
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, pad.t + ph);
      ctx.stroke();
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(maxHz) + 'Hz', 4, pad.t + 8);
    ctx.fillText('0s', pad.l, h - 7);
    ctx.textAlign = 'right';
    ctx.fillText(safeNum(feat.duration, 0).toFixed(2) + 's', pad.l + pw, h - 7);
    finishDarkPlot(p);
  }

  function drawModulationPlot(target, feat, interOpts) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.modSpectrum) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 28, r: 12, t: 24, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var ms = feat.modSpectrum;
    var base = (interOpts && interOpts.archiveBases) || buildArchiveBaselines(feat, interOpts && interOpts.archiveSamples);
    var layers = (interOpts && interOpts.layers) || { archiveAvg: true, ciBand: true, callouts: true, extraLayer: true };

    // Highlight 3 flutter zones: 4-8Hz, 8-20Hz, 20-45Hz
    if (layers.extraLayer !== false && layers.ciBand !== false) {
      var z1 = ((8 - 4) / 41) * pw;
      var z2 = ((20 - 4) / 41) * pw;
      ctx.fillStyle = 'rgba(96, 165, 250, 0.06)';
      ctx.fillRect(pad.l, pad.t, z1, ph);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.fillRect(pad.l + z1, pad.t, z2 - z1, ph);
      ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
      ctx.fillRect(pad.l + z2, pad.t, pw - z2, ph);
    }

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

    // Dashed Archive Avg modulation profile
    if (layers.archiveAvg !== false && base && base.modMean && base.modMean.length === ms.length) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var mi = 0; mi < ms.length; mi++) {
        var mx = pad.l + (mi / Math.max(1, ms.length - 1)) * pw;
        var my = pad.t + ph - clamp(base.modMean[mi], 0, 1) * ph;
        if (mi === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

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

    drawChartHotspotsAndSelection(ctx, pad, pw, ph, w, interOpts);

    if (interOpts && typeof interOpts.hoverNorm === 'number') {
      var hx = pad.l + clamp(interOpts.hoverNorm, 0, 1) * pw;
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, pad.t + ph);
      ctx.stroke();
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('4 Hz', pad.l, h - 7);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#DDD6FE';
    ctx.fillText('Peak ' + Math.round(safeNum(feat.modRateHz, 0)) + ' Hz · ' + (feat.burstCount || 1) + ' burst(s) · --- Arch', pad.l + pw * 0.5, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('45 Hz', pad.l + pw, h - 7);
    finishDarkPlot(p);
  }

  function drawEnvelopePlot(target, feat, interOpts) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat || !feat.envelope) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 28, r: 12, t: 24, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var env = feat.envelope;
    var base = (interOpts && interOpts.archiveBases) || buildArchiveBaselines(feat, interOpts && interOpts.archiveSamples);
    var layers = (interOpts && interOpts.layers) || { archiveAvg: true, ciBand: true, callouts: true, extraLayer: true };

    if (layers.archiveAvg !== false && base && base.envMean && base.envMean.length > 2) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.58)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var ei = 0; ei < base.envMean.length; ei++) {
        var ex = pad.l + (ei / Math.max(1, base.envMean.length - 1)) * pw;
        var ey = pad.t + ph - clamp(base.envMean[ei], 0, 1) * ph;
        if (ei === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

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
    var pkIdx = 0;
    var pkVal = -1;
    for (var k = 0; k < env.length; k++) {
      var ev = clamp(safeNum(env[k], 0), 0, 1);
      if (ev > pkVal) { pkVal = ev; pkIdx = k; }
      var lx = pad.l + (k / Math.max(1, env.length - 1)) * pw;
      var ly = pad.t + ph - ev * ph;
      if (k === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    if (layers.extraLayer !== false) {
      var yGate = pad.t + ph - 0.35 * ph;
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.65)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.l, yGate);
      ctx.lineTo(pad.l + pw, yGate);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    var pkX = pad.l + (pkIdx / Math.max(1, env.length - 1)) * pw;
    var pkY = pad.t + ph - clamp(pkVal, 0, 1) * ph;
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(pkX, pkY, 4.2, 0, Math.PI * 2);
    ctx.fill();

    var t50x = pad.l + clamp(safeNum(feat.t50Ratio, 0.5), 0, 1) * pw;
    ctx.strokeStyle = '#60A5FA';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(t50x, pad.t);
    ctx.lineTo(t50x, pad.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    drawChartHotspotsAndSelection(ctx, pad, pw, ph, w, interOpts);

    if (interOpts && typeof interOpts.hoverNorm === 'number') {
      var hx = pad.l + clamp(interOpts.hoverNorm, 0, 1) * pw;
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, pad.t + ph);
      ctx.stroke();
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Attack ' + Math.round(safeNum(feat.attackSec, 0) * 1000) + 'ms · --- Arch', pad.l, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#93C5FD';
    ctx.fillText('T50 @ ' + Math.round(safeNum(feat.t50Ratio, 0.5) * 100) + '%', pad.l + pw, h - 7);
    finishDarkPlot(p);
  }

  function openChartInvestigationModal(cfg) {
    var doc = root.document;
    if (!doc) return;
    var modal = doc.getElementById('labs-chart-modal');
    if (!modal || !cfg || !cfg.meta) return;

    var cm = cfg.meta;
    var feat = cfg.feat;
    var bases = cfg.bases;
    var key = cfg.chartKey;
    var layerState = { archiveAvg: true, ciBand: true, callouts: true, extraLayer: true };
    var hoverNorm = typeof cfg.initialNorm === 'number' ? cfg.initialNorm : (cm.hotspots[0] ? cm.hotspots[0].norm : 0.35);
    var activeHsId = cfg.initialHotspotId || (cm.hotspots[0] && cm.hotspots[0].id) || null;
    var activeDesc = null;
    for (var i = 0; i < cm.hotspots.length; i++) {
      if (cm.hotspots[i].id === activeHsId) { activeDesc = cm.hotspots[i]; break; }
    }
    if (!activeDesc) activeDesc = cm.describeAtNorm(hoverNorm);

    var titleEl = doc.getElementById('labs-cm-title');
    var subEl = doc.getElementById('labs-cm-subtitle');
    var layersEl = doc.getElementById('labs-cm-layers');
    var hotspotsEl = doc.getElementById('labs-cm-hotspots');
    var storyEl = doc.getElementById('labs-cm-story');
    var metricsEl = doc.getElementById('labs-cm-metrics');
    var expertsEl = doc.getElementById('labs-cm-experts');
    var notesEl = doc.getElementById('labs-cm-notes');
    var cvs = doc.getElementById('labs-cm-canvas');
    var closeBtn = doc.getElementById('btn-labs-cm-close');

    if (titleEl) titleEl.textContent = cm.modalTitle || 'Scientific Investigation';
    if (subEl) subEl.textContent = (cfg.label ? cfg.label + ' — ' : '') + (cm.modalSubtitle || '');

    function drawModalPlot() {
      if (!cvs) return;
      var opts = {
        hoverNorm: hoverNorm,
        archiveBases: bases,
        layers: layerState,
        hotspots: cm.hotspots,
        activeHotspotId: activeHsId,
        highlightRange: activeDesc ? [activeDesc.spanLo, activeDesc.spanHi] : null
      };
      if (key === 'c_spec') drawSpectrumPlot(cvs, feat, '#60A5FA', opts);
      else if (key === 'c_pitch') drawPitchContourPlot(cvs, feat, opts);
      else if (key === 'c_mod') drawModulationPlot(cvs, feat, opts);
      else if (key === 'c_env') drawEnvelopePlot(cvs, feat, opts);
    }

    function updateModalStory() {
      if (!storyEl || !activeDesc) return;
      var sci = getScientistById(activeDesc.scientistId || cm.scientistId);
      storyEl.innerHTML =
        '<div class="labs-story-head">' +
        '  <span class="labs-eyebrow">' + esc(activeDesc.obsLabel || 'LABORATORY OBSERVATION') + '</span>' +
        '  <span class="labs-chart-anomaly-tag">' + esc(activeDesc.tag) + '</span>' +
        '</div>' +
        '<div class="labs-story-title">' + esc(activeDesc.title) + '</div>' +
        '<p class="labs-story-narrative">' + esc(activeDesc.story) + '</p>' +
        '<div class="labs-story-telemetry">' + esc(activeDesc.telemetry) + '</div>' +
        '<div class="labs-chart-obs">' +
        '  <img src="' + esc(sci.img) + '" alt="' + esc(sci.shortName) + '" />' +
        '  <span>"' + esc(activeDesc.scientistQuote) + '" <em>— ' + esc(sci.shortName) + '</em></span>' +
        '</div>';
    }

    if (layersEl) {
      var layerDefs = [
        { k: 'archiveAvg', lbl: 'Archive Average' },
        { k: 'ciBand', lbl: '95% Confidence Band' },
        { k: 'callouts', lbl: 'Anomaly Callouts' },
        { k: 'extraLayer', lbl: cm.extraLayerLabel || 'Scientific Overlay' }
      ];
      layersEl.innerHTML = layerDefs
        .map(function (ld) {
          return '<button type="button" class="labs-cm-layer-btn active" data-layer="' + esc(ld.k) + '">' + esc(ld.lbl) + '</button>';
        })
        .join('');
      layersEl.querySelectorAll('[data-layer]').forEach(function (b) {
        b.addEventListener('click', function () {
          var lk = this.getAttribute('data-layer');
          layerState[lk] = !layerState[lk];
          this.classList.toggle('active', layerState[lk]);
          drawModalPlot();
        });
      });
    }

    if (hotspotsEl) {
      hotspotsEl.innerHTML = cm.hotspots
        .map(function (hs, idx) {
          return (
            '<button type="button" class="labs-hotspot-pill' +
            (hs.id === activeHsId ? ' active' : '') +
            '" data-mhs="' +
            esc(hs.id) +
            '"><strong>' +
            (idx + 1) +
            '.</strong> ' +
            esc(hs.tag) +
            '</button>'
          );
        })
        .join('');
      hotspotsEl.querySelectorAll('[data-mhs]').forEach(function (b) {
        b.addEventListener('click', function () {
          var hid = this.getAttribute('data-mhs');
          for (var j = 0; j < cm.hotspots.length; j++) {
            if (cm.hotspots[j].id === hid) {
              activeHsId = hid;
              activeDesc = cm.hotspots[j];
              hoverNorm = cm.hotspots[j].norm;
              break;
            }
          }
          hotspotsEl.querySelectorAll('[data-mhs]').forEach(function (x) {
            x.classList.toggle('active', x.getAttribute('data-mhs') === activeHsId);
          });
          updateModalStory();
          drawModalPlot();
        });
      });
    }

    if (metricsEl) {
      metricsEl.innerHTML = cm.drillStats
        .map(function (st) {
          return '<div class="labs-fact-box"><span>' + esc(st.label) + '</span><strong>' + esc(st.value) + '</strong><small class="labs-fact-sub">' + esc(st.sub) + '</small></div>';
        })
        .join('');
    }

    if (expertsEl) {
      var expIds = Array.isArray(cm.expertIds) && cm.expertIds.length ? cm.expertIds : ['wobble', 'bottomsworth'];
      expertsEl.innerHTML = expIds
        .map(function (sid, idx) {
          var q = pickScientistComment(sid, (cfg.label || '') + key + idx, idx);
          return renderScientistCommentHtml(sid, q.quote, idx === 0 ? 'Lead Scientist Review' : 'Peer Review Note');
        })
        .join('');
    }

    if (notesEl) {
      var fnSeed = hashSeed((cfg.label || '') + key);
      notesEl.innerHTML =
        '<div class="labs-eyebrow">LABORATORY NOTES &amp; ACADEMIC FOOTNOTES</div>' +
        '<p class="labs-chart-drill-note">' + esc(cm.drillNote) + '</p>' +
        '<ul>' +
        '  <li><sup>[1]</sup> * ' + esc(RESEARCH_FOOTNOTES[fnSeed % RESEARCH_FOOTNOTES.length]) + '</li>' +
        '  <li><sup>[2]</sup> * ' + esc(RESEARCH_FOOTNOTES[(fnSeed + 3) % RESEARCH_FOOTNOTES.length]) + '</li>' +
        '</ul>';
    }

    if (cvs && typeof cvs.addEventListener === 'function') {
      cvs.onpointerdown = cvs.onpointermove = function (ev) {
        var rect = cvs.getBoundingClientRect ? cvs.getBoundingClientRect() : null;
        if (!rect || rect.width <= 0) return;
        hoverNorm = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
        activeHsId = null;
        activeDesc = cm.describeAtNorm(hoverNorm);
        if (hotspotsEl) {
          hotspotsEl.querySelectorAll('[data-mhs]').forEach(function (x) { x.classList.remove('active'); });
        }
        updateModalStory();
        drawModalPlot();
      };
    }

    function closeModal() {
      modal.classList.add('hidden');
    }
    if (closeBtn) closeBtn.onclick = closeModal;
    modal.onclick = function (ev) {
      if (ev.target === modal) closeModal();
    };

    updateModalStory();
    modal.classList.remove('hidden');
    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(drawModalPlot);
    } else {
      drawModalPlot();
    }
  }

  function drawHorizontalBarsPlot(target, items, interOpts) {
    var p = setupDarkPlot(target, 195);
    if (!p || !items || items.length === 0) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var padL = Math.min(130, Math.round(w * 0.36));
    var padR = 38;
    var padT = 12;
    var padB = 10;
    var pw = Math.max(40, w - padL - padR);
    var rowH = (h - padT - padB) / items.length;
    var selIdx = interOpts && typeof interOpts.selectedIdx === 'number' ? interOpts.selectedIdx : -1;

    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var cy = padT + i * rowH + rowH * 0.5;
      var barH = Math.min(14, Math.max(7, rowH * 0.52));
      var pct = clamp(safeNum(it.pct, 0), 0, 100);
      if (i === selIdx) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.fillRect(4, padT + i * rowH + 1, w - 8, Math.max(10, rowH - 2));
      }

      ctx.fillStyle = i === selIdx ? '#F8FAFC' : '#D1D5DB';
      ctx.textAlign = 'right';
      ctx.fillText(String(it.label || '').slice(0, 18), padL - 8, cy + 3.5);

      ctx.fillStyle = 'rgba(55, 65, 81, 0.55)';
      ctx.fillRect(padL, cy - barH * 0.5, pw, barH);

      var fillW = Math.max(2, (pct / 100) * pw);
      ctx.fillStyle = it.color || '#60A5FA';
      ctx.fillRect(padL, cy - barH * 0.5, fillW, barH);
      if (i === selIdx) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(padL, cy - barH * 0.5, fillW, barH);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(Math.round(pct) + '%', padL + pw + 6, cy + 3.5);
    }
    finishDarkPlot(p);
  }

  function drawMfcc13Plot(target, feat, interOpts) {
    var p = setupDarkPlot(target, 195);
    if (!p || !feat) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var vec = feat.mfccMean || new Float32Array(13);
    var n = Math.min(13, vec.length || 13);
    var pad = { l: 26, r: 12, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var midY = pad.t + ph * 0.5;
    var selIdx = interOpts && typeof interOpts.selectedIdx === 'number' ? interOpts.selectedIdx : -1;

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
      var ry = barH >= 0 ? midY - barH : midY;
      var rh = Math.max(2, Math.abs(barH));
      ctx.fillRect(x, ry, bw, rh);
      if (k === selIdx) {
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x, ry, bw, rh);
      }
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('C1', pad.l, h - 7);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D1D5DB';
    ctx.fillText('13-Dim MFCC Resonance & Filterbank Signature', pad.l + pw * 0.5, h - 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('C13', pad.l + pw, h - 7);
    finishDarkPlot(p);
  }

  function drawCumulativeEnergyPlot(target, feat, interOpts) {
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

    if (interOpts && typeof interOpts.hoverNorm === 'number') {
      var hn = clamp(interOpts.hoverNorm, 0, 1);
      var idxH = Math.round(hn * Math.max(0, cum.length - 1));
      var fracH = total > 0 ? cum[idxH] / total : 0;
      var hx = pad.l + hn * pw;
      var hy = pad.t + ph - fracH * ph;
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, pad.t + ph);
      ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }
    finishDarkPlot(p);
  }

  function drawSeriesPlot(target, values, opts, interOpts) {
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

    if (interOpts && typeof interOpts.hoverNorm === 'number') {
      var hn = clamp(interOpts.hoverNorm, 0, 1);
      var idxH = Math.round(hn * Math.max(0, values.length - 1));
      var hx = pad.l + hn * pw;
      var hy = pad.t + ph - clamp(safeNum(values[idxH], 0) / maxV, 0, 1) * ph;
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, pad.t + ph);
      ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
    }

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(opts.caption || '', pad.l + pw * 0.5, h - 7);
    finishDarkPlot(p);
  }

  function computeWitnessPerception(distM, radiusM, panicPct, feat) {
    var d = clamp(safeNum(distM, 2.2), 0.3, 13.0);
    var rNom = clamp(safeNum(radiusM, 4.5), 1.8, 13.0);
    var crest = safeNum(feat && feat.crestFactorDb, 8);
    var baseDb = clamp(54 + (panicPct || 45) * 0.28 + Math.max(0, crest - 6) * 1.1, 50, 86);
    var dropoff = 20 * Math.log10(Math.max(0.5, d) / 0.5) * 0.78;
    var estDb = Math.round(clamp(baseDb - dropoff, 22, 86));
    var audibilityPct = Math.round(clamp(100 * Math.exp(-Math.pow(d / Math.max(2.0, rNom * 0.95), 1.45)), 5, 100));
    var lowpassHz = Math.round(clamp(4200 * Math.exp(-0.22 * Math.max(0, d - 0.6)), 260, 4200));
    var gain = Number(clamp(Math.pow(audibilityPct / 100, 0.72) * 0.96, 0.05, 0.98).toFixed(3));
    var zoneLabel =
      d <= 2.2
        ? 'Inside 2.2m Chamber'
        : d <= rNom
          ? 'Within Audible Perimeter'
          : d <= rNom * 1.35
            ? 'Perimeter Threshold'
            : 'Sub-Audible Floor';
    var whatHeard =
      lowpassHz >= 1800
        ? 'Full spectral clarity — onset transient and upper harmonics clearly discernible.'
        : lowpassHz >= 750
          ? 'Mid-band attenuation; core pitch remains distinct while upper air hiss softens.'
          : 'Low-frequency sustain only; high-frequency air contour absorbed over distance.';
    return {
      distM: Number(d.toFixed(2)),
      estDb: estDb,
      audibilityPct: audibilityPct,
      lowpassHz: lowpassHz,
      gain: gain,
      zoneLabel: zoneLabel,
      whatHeard: whatHeard
    };
  }

  function drawBlastZonePlot(target, radiusM, panicPct, witnessState) {
    var p = setupDarkPlot(target, 195);
    if (!p) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var cx = w * 0.5;
    var cy = h * 0.52;
    var maxR = Math.min(w, h) * 0.42;
    var rEvent = clamp((safeNum(radiusM, 4) / 13.0) * maxR, 14, maxR);
    var rElevator = (2.2 / 13.0) * maxR;

    var guideM = [2, 5, 10];
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (var gi = 0; gi < guideM.length; gi++) {
      var gr = (guideM[gi] / 13.0) * maxR;
      ctx.beginPath();
      ctx.arc(cx, cy, gr, 0, Math.PI * 2);
      ctx.stroke();
    }

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

    if (witnessState && typeof witnessState.dxM === 'number' && typeof witnessState.dyM === 'number') {
      var wx = clamp(cx + (witnessState.dxM / 13.0) * maxR, 18, w - 18);
      var wy = clamp(cy + (witnessState.dyM / 13.0) * maxR, 24, h - 20);
      var distM = Math.hypot(witnessState.dxM, witnessState.dyM);

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.arc(wx, wy, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(wx, wy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#E0F2FE';
      ctx.textAlign = wx > w * 0.68 ? 'right' : 'left';
      ctx.fillText('Witness ' + distM.toFixed(1) + 'm', wx + (wx > w * 0.68 ? -14 : 14), wy + 3.5);
    }

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FECDD3';
    ctx.fillText('Propagation Radius ' + safeNum(radiusM, 4).toFixed(1) + 'm · Disruption ' + Math.round(panicPct || 50) + '%', cx, 16);
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(witnessState ? 'Drag or tap canvas to reposition Witness · Dashed box = 2.2m Chamber' : 'Dashed boundary = 2.2m Standard Acoustic Chamber', cx, h - 7);
    finishDarkPlot(p);
  }

  function drawTwinMapPlot(target, bonus, interOpts) {
    var p = setupDarkPlot(target, 195);
    if (!p || !bonus) return finishDarkPlot(p);
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 34, r: 16, t: 16, b: 24 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var items = bonus.acoustics.items || [];
    var logMin = Math.log2(50);
    var logMax = Math.log2(1600);
    var selIdx = interOpts && typeof interOpts.selectedIdx === 'number' ? interOpts.selectedIdx : -1;

    var sx = pad.l + clamp((Math.log2(clamp(bonus.acoustics.detailA.effFreq, 50, 1600)) - logMin) / (logMax - logMin), 0, 1) * pw;
    var sy = pad.t + ph - clamp(bonus.acoustics.detailA.flat, 0, 1) * ph;

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var x = pad.l + clamp((Math.log2(it.freq) - logMin) / (logMax - logMin), 0, 1) * pw;
      var y = pad.t + ph - clamp(it.flat, 0, 1) * ph;
      if (i === selIdx) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = i === selIdx ? '#38BDF8' : '#FACC15';
      ctx.beginPath();
      ctx.arc(x, y, i === selIdx ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      if (i === selIdx) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.fillStyle = i === selIdx ? '#E0F2FE' : '#9CA3AF';
      ctx.font = (i === selIdx ? '700 ' : '600 ') + '9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = x > w * 0.72 ? 'right' : 'left';
      ctx.fillText(it.short, x + (x > w * 0.72 ? -8 : 8), y + 3);
    }

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
    ctx.fillText('Closest Reference: ' + bonus.acoustics.twinA.short + ' (' + bonus.acoustics.topScoreA + '%)', w * 0.5, h - 7);
    finishDarkPlot(p);
  }

  function drawSingleChartType(target, chartType, sound, feat, bonus, ml, interOpts) {
    if (!feat) return;
    if (chartType === 's_spectrum') return drawSpectrumPlot(target, feat, '#60A5FA', interOpts);
    if (chartType === 's_pitch') return drawPitchContourPlot(target, feat, interOpts);
    if (chartType === 's_mod') return drawModulationPlot(target, feat, interOpts);
    if (chartType === 's_envelope') return drawEnvelopePlot(target, feat, interOpts);
    if (chartType === 's_mfcc13') return drawMfcc13Plot(target, feat, interOpts);
    if (chartType === 's_energy_cum') return drawCumulativeEnergyPlot(target, feat, interOpts);
    if (chartType === 's_centroid_contour') {
      return drawSeriesPlot(target, feat.centroidContour || [], { stroke: '#60A5FA', fill: 'rgba(96, 165, 250, 0.2)', caption: 'Spectral Brightness Evolution Across Event' }, interOpts);
    }
    if (chartType === 's_onset_zoom') {
      var env = feat.envelope || [];
      var half = env.slice ? env.slice(0, Math.max(8, Math.floor(env.length * 0.5))) : env;
      return drawSeriesPlot(target, half, { stroke: '#22C55E', fill: 'rgba(34, 197, 94, 0.24)', maxVal: 1.0, caption: 'Initial Attack Surge (First 50% of Event)' }, interOpts);
    }
    if (chartType === 's_burst_gate') {
      return drawSeriesPlot(target, feat.envelope || [], { stroke: '#F97316', fill: 'rgba(249, 115, 22, 0.2)', maxVal: 1.0, threshA: 0.35, caption: 'Envelope vs 0.35 Burst Gate Threshold (' + (feat.burstCount || 1) + ' bursts)' }, interOpts);
    }
    if (chartType === 's_flux') {
      var fx = bonus && bonus.wetness ? bonus.wetness.fluxSeriesA : [];
      return drawSeriesPlot(target, fx, { stroke: '#8B5CF6', fill: 'rgba(139, 92, 246, 0.25)', caption: 'Instantaneous Spectral Flux (Turbulence Driver)' }, interOpts);
    }
    if (chartType === 's_4band') {
      var bp = feat.bandProfile || [0.25, 0.25, 0.25, 0.25];
      return drawHorizontalBarsPlot(target, [
        { label: '45-150Hz Sub-Bass', pct: safeNum(bp[0], 0) * 100, color: '#60A5FA' },
        { label: '150-450Hz Mid-Low Resonance', pct: safeNum(bp[1], 0) * 100, color: '#22C55E' },
        { label: '450-1.2kHz Mid-Upper', pct: safeNum(bp[2], 0) * 100, color: '#F97316' },
        { label: '1.2k-4.2kHz Upper Aperture', pct: safeNum(bp[3], 0) * 100, color: '#FB7185' }
      ], interOpts);
    }
    if (chartType === 's_mod3band') {
      var mb = feat.modBands || [0.34, 0.33, 0.33];
      return drawHorizontalBarsPlot(target, [
        { label: '2-8Hz Slow Oscillation', pct: safeNum(mb[0], 0) * 100, color: '#60A5FA' },
        { label: '8-20Hz Primary Flutter', pct: safeNum(mb[1], 0) * 100, color: '#22C55E' },
        { label: '20-45Hz High-Rate Modulation', pct: safeNum(mb[2], 0) * 100, color: '#8B5CF6' }
      ], interOpts);
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
      ], interOpts);
    }
    if (chartType === 's_squelch_mix') {
      var dA = bonus && bonus.wetness ? bonus.wetness.detailA : { md: 0.2, flux: 0.1, squelchBand: 0.2 };
      return drawHorizontalBarsPlot(target, [
        { label: 'Modulation Depth', pct: clamp(safeNum(dA.md, 0) / 0.65, 0, 1) * 100, color: '#22C55E' },
        { label: 'Spectral Flux', pct: clamp(safeNum(dA.flux, 0) / 0.22, 0, 1) * 100, color: '#8B5CF6' },
        { label: 'Turbulence Band', pct: clamp(safeNum(dA.squelchBand, 0), 0, 1) * 100, color: '#F97316' }
      ], interOpts);
    }
    if (chartType === 's_twin_bars' && bonus) {
      var its = bonus.acoustics.items || [];
      var affs = bonus.acoustics.affinitiesA || [];
      return drawHorizontalBarsPlot(
        target,
        its.map(function (it, idx) {
          return { label: it.emoji + ' ' + it.short, pct: safeNum(affs[idx], 0), color: idx === bonus.acoustics.detailA.bestIdx ? '#22C55E' : '#60A5FA' };
        }),
        interOpts
      );
    }
    if (chartType === 's_twin_map') return drawTwinMapPlot(target, bonus, interOpts);
    if (chartType === 's_blast_map') return drawBlastZonePlot(target, bonus ? bonus.social.a.radiusM : 4.5, bonus ? bonus.social.a.panicPct : 50, interOpts && interOpts.witness ? interOpts.witness : null);
    if (chartType === 's_alibi_bars' && bonus) {
      var soc = bonus.social.a;
      return drawHorizontalBarsPlot(target, [
        { label: 'Mechanical Floor Resonance', pct: soc.dogBlame, color: '#22C55E' },
        { label: 'Footwear Friction Transient', pct: soc.shoeScuff, color: '#60A5FA' },
        { label: 'Pneumatic Chair Compression', pct: soc.leatherChair, color: '#F97316' }
      ], interOpts);
    }
    if (chartType === 's_ml_probs' && ml) {
      return drawHorizontalBarsPlot(
        target,
        ml.classes.map(function (c) {
          return { label: c.emoji + ' ' + c.name, pct: c.prob, color: c.color };
        }),
        interOpts
      );
    }
    if (chartType === 's_wall_atten') {
      var lowPct = feat.bandProfile ? safeNum(feat.bandProfile[0], 0.25) + safeNum(feat.bandProfile[1], 0.25) : 0.4;
      var penBase = clamp(45 + lowPct * 55, 25, 99);
      return drawHorizontalBarsPlot(target, [
        { label: 'Primary Microphone Zone', pct: penBase, color: '#FB7185' },
        { label: 'Partition Wall Boundary', pct: clamp(penBase * (0.52 + lowPct * 0.35), 10, 95), color: '#F97316' },
        { label: 'Corridor Boundary', pct: clamp(penBase * (0.34 + lowPct * 0.28), 5, 85), color: '#60A5FA' },
        { label: 'Lower Deck Chamber', pct: clamp(penBase * (0.24 + safeNum(feat.bandProfile ? feat.bandProfile[0] : 0.2, 0.2) * 0.5), 4, 78), color: '#22C55E' }
      ], interOpts);
    }
  }

  var BARRIER_PROFILES = [
    { label: 'Open Chamber', cutoffHz: 4200, gain: 0.94, dbLoss: 0 },
    { label: 'Partition Wall', cutoffHz: 420, gain: 0.46, dbLoss: 11 },
    { label: 'Solid Door', cutoffHz: 260, gain: 0.28, dbLoss: 16 },
    { label: 'Floor Below', cutoffHz: 155, gain: 0.17, dbLoss: 21 }
  ];

  function bindPointerScrub(canvas, onUpdate, opts) {
    if (!canvas || canvas._labsPointerBound) return;
    canvas._labsPointerBound = true;
    canvas.classList.add('labs-interactive-drag');
    var dragging = false;
    var stopDrag = function () { dragging = false; };
    var handleXY = function (clientX, clientY) {
      var rect = typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
      var w = rect && rect.width > 10 ? rect.width : canvas.width || 320;
      var h = rect && rect.height > 10 ? rect.height : canvas.height || 195;
      var lx = rect ? clientX - rect.left : w * 0.5;
      var ly = rect ? clientY - rect.top : h * 0.5;
      onUpdate(clamp(lx / w, 0, 1), clamp(ly / h, 0, 1), w, h);
    };
    canvas.addEventListener('pointerdown', function (ev) {
      dragging = true;
      handleXY(ev.clientX, ev.clientY);
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (dragging || (opts && opts.hoverMove && ev.pointerType === 'mouse')) {
        handleXY(ev.clientX, ev.clientY);
      }
    });
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('pointerleave', stopDrag);
    canvas.addEventListener('click', function (ev) {
      handleXY(ev.clientX, ev.clientY);
    });
  }

  function describeSingleBarInspect(chartType, idx, feat, bonus, ml) {
    if (chartType === 's_4band') {
      var bp = feat.bandProfile || [0.25, 0.25, 0.25, 0.25];
      var bNames = ['Sub-Bass (45–150 Hz)', 'Mid-Low Resonance (150–450 Hz)', 'Mid-Upper (450–1.2 kHz)', 'Upper Aperture (>1.2 kHz)'];
      return bNames[idx] + ': ' + Math.round(safeNum(bp[idx], 0) * 100) + '% of total spectral energy.';
    }
    if (chartType === 's_mod3band') {
      var mb = feat.modBands || [0.34, 0.33, 0.33];
      var mNames = ['2–8 Hz Slow Oscillation', '8–20 Hz Primary Flutter', '20–45 Hz High-Rate Modulation'];
      return mNames[idx] + ': ' + Math.round(safeNum(mb[idx], 0) * 100) + '% modulation power share.';
    }
    if (chartType === 's_attack_decay') {
      var dur = Math.max(0.05, safeNum(feat.duration, 0.5));
      var atkPct = Math.round(clamp((safeNum(feat.attackSec, 0.1) / dur) * 100, 1, 95));
      var decPct = Math.round(clamp((safeNum(feat.decaySec, 0.2) / dur) * 100, 1, 95));
      var sustPct = Math.round(clamp(100 - atkPct - decPct * 0.5, 5, 95));
      var aNames = ['Attack Rise: ' + atkPct + '% (' + Math.round(safeNum(feat.attackSec, 0) * 1000) + ' ms)', 'Core Sustain: ' + sustPct + '% amplitude hold', 'Decay Tail: ' + decPct + '% (' + Math.round(safeNum(feat.decaySec, 0) * 1000) + ' ms)'];
      return aNames[idx] || aNames[0];
    }
    if (chartType === 's_squelch_mix') {
      var dA = bonus && bonus.wetness ? bonus.wetness.detailA : { md: 0.2, flux: 0.1, squelchBand: 0.2 };
      var sVals = [
        'Modulation Depth: ' + Math.round(clamp(safeNum(dA.md, 0) / 0.65, 0, 1) * 100) + '%',
        'Spectral Flux: ' + Math.round(clamp(safeNum(dA.flux, 0) / 0.22, 0, 1) * 100) + '%',
        'Turbulence Band: ' + Math.round(clamp(safeNum(dA.squelchBand, 0), 0, 1) * 100) + '%'
      ];
      return sVals[idx] || sVals[0];
    }
    if (chartType === 's_twin_bars' && bonus) {
      var its = bonus.acoustics.items || [];
      var affs = bonus.acoustics.affinitiesA || [];
      var it = its[clamp(idx, 0, Math.max(0, its.length - 1))];
      return it ? it.emoji + ' ' + it.name + ': ' + Math.round(safeNum(affs[idx], 0)) + '% structural affinity.' : '';
    }
    if (chartType === 's_alibi_bars' && bonus) {
      var soc = bonus.social.a;
      var cItems = [
        'Mechanical Floor Resonance: ' + Math.round(soc.dogBlame) + '% masking fit',
        'Footwear Friction Transient: ' + Math.round(soc.shoeScuff) + '% masking fit',
        'Pneumatic Chair Compression: ' + Math.round(soc.leatherChair) + '% masking fit'
      ];
      return cItems[idx] || cItems[0];
    }
    if (chartType === 's_ml_probs' && ml) {
      var cl = ml.classes[clamp(idx, 0, Math.max(0, ml.classes.length - 1))];
      return cl ? cl.emoji + ' ' + cl.name + ': ' + cl.prob + '% Softmax posterior.' : '';
    }
    if (chartType === 's_wall_atten') {
      var br = BARRIER_PROFILES[clamp(idx, 0, BARRIER_PROFILES.length - 1)];
      var lowPct = feat.bandProfile ? safeNum(feat.bandProfile[0], 0.25) + safeNum(feat.bandProfile[1], 0.25) : 0.4;
      var penBase = clamp(45 + lowPct * 55, 25, 99);
      var scales = [1, 0.52 + lowPct * 0.35, 0.34 + lowPct * 0.28, 0.24 + safeNum(feat.bandProfile ? feat.bandProfile[0] : 0.2, 0.2) * 0.5];
      var pct = Math.round(clamp(penBase * (scales[idx] || 1), 4, 99));
      return br.label + ': ' + pct + '% transmission · -' + br.dbLoss + ' dB · LPF ' + br.cutoffHz + ' Hz';
    }
    return '';
  }

  function bindSingleChartInteractions(slotEl, sound, feat, bonus, ml, Audio) {
    if (!slotEl) return;
    var canvases = slotEl.querySelectorAll('canvas[data-schart]');
    var barCounts = { s_4band: 4, s_mod3band: 3, s_attack_decay: 3, s_squelch_mix: 3, s_twin_bars: bonus ? bonus.acoustics.items.length : 8, s_alibi_bars: 3, s_ml_probs: ml ? ml.classes.length : 6, s_wall_atten: 4 };

    for (var i = 0; i < canvases.length; i++) {
      (function (canvas) {
        var cType = canvas.getAttribute('data-schart');
        var box = canvas.closest ? canvas.closest('.labs-chart-box-inner') : canvas.parentElement;
        var liveEl = box ? box.querySelector('.labs-chart-live-bar') : null;
        var ctrlEl = box ? box.querySelector('.labs-chart-controls') : null;
        var stateObj = canvas._labsInterState || {};
        canvas._labsInterState = stateObj;

        if (cType === 's_blast_map') {
          var radM = bonus && bonus.social ? bonus.social.a.radiusM : 4.5;
          var pPct = bonus && bonus.social ? bonus.social.a.panicPct : 50;
          if (!stateObj.witness) {
            var initD = Number(Math.min(radM * 0.55, 2.2).toFixed(2));
            stateObj.witness = { dxM: Number((initD * 0.78).toFixed(2)), dyM: Number((-initD * 0.62).toFixed(2)) };
          }
          canvas.setAttribute('data-witness-canvas', '1');
          function refreshWitnessUI() {
            var wSt = stateObj.witness;
            var d = Math.hypot(wSt.dxM, wSt.dyM);
            var perc = computeWitnessPerception(d, radM, pPct, feat);
            drawSingleChartType(canvas, cType, sound, feat, bonus, ml, { witness: wSt });
            if (liveEl) {
              liveEl.textContent =
                'Witness @ ' + perc.distM.toFixed(1) + 'm (' + perc.zoneLabel + '): ~' + perc.estDb +
                ' dB · ' + perc.audibilityPct + '% audible · LPF ' + perc.lowpassHz + ' Hz — ' + perc.whatHeard;
            }
          }
          if (ctrlEl) {
            ctrlEl.innerHTML =
              '<div class="labs-witness-controls">' +
              '  <div class="labs-witness-presets">' +
              '    <button type="button" class="labs-mini-chip labs-witness-preset" data-wdist="1.0">1m Chamber</button>' +
              '    <button type="button" class="labs-mini-chip labs-witness-preset" data-wdist="3.0">3m Desk</button>' +
              '    <button type="button" class="labs-mini-chip labs-witness-preset" data-wdist="6.0">6m Hall</button>' +
              '    <button type="button" class="labs-mini-chip labs-witness-preset" data-wdist="11.0">11m Far</button>' +
              '  </div>' +
              '  <button type="button" class="labs-btn labs-btn-blue labs-btn-xs labs-witness-audition-btn">🔊 Hear What Witness Hears</button>' +
              '</div>';
            ctrlEl.querySelectorAll('.labs-witness-preset').forEach(function (btn) {
              btn.addEventListener('click', function () {
                var targetD = parseFloat(this.getAttribute('data-wdist')) || 2.5;
                stateObj.witness = { dxM: Number((targetD * 0.78).toFixed(2)), dyM: Number((-targetD * 0.62).toFixed(2)) };
                refreshWitnessUI();
              });
            });
            var audBtn = ctrlEl.querySelector('.labs-witness-audition-btn');
            if (audBtn) {
              audBtn.addEventListener('click', function () {
                var perc = computeWitnessPerception(Math.hypot(stateObj.witness.dxM, stateObj.witness.dyM), radM, pPct, feat);
                if (Audio && typeof Audio.playSound === 'function') {
                  Audio.playSound(sound.samples, sound.sampleRate, {
                    channel: 'witness_sim',
                    gain: perc.gain,
                    lowpassHz: perc.lowpassHz
                  });
                }
              });
            }
          }
          bindPointerScrub(canvas, function (nx, ny, w, h) {
            var maxR = Math.min(w, h) * 0.42;
            var dx = ((nx * w - w * 0.5) / Math.max(10, maxR)) * 13.0;
            var dy = ((ny * h - h * 0.52) / Math.max(10, maxR)) * 13.0;
            var mag = Math.hypot(dx, dy);
            if (mag < 0.35) { dx = 0.35; dy = 0; }
            stateObj.witness = { dxM: clamp(dx, -11.5, 11.5), dyM: clamp(dy, -11.5, 11.5) };
            refreshWitnessUI();
          }, { hoverMove: false });
          refreshWitnessUI();
          return;
        }

        if (cType === 's_wall_atten') {
          if (typeof stateObj.selectedIdx !== 'number') stateObj.selectedIdx = 1;
          function refreshBarrierUI() {
            var idx = clamp(stateObj.selectedIdx, 0, BARRIER_PROFILES.length - 1);
            drawSingleChartType(canvas, cType, sound, feat, bonus, ml, { selectedIdx: idx });
            if (liveEl) liveEl.textContent = describeSingleBarInspect(cType, idx, feat, bonus, ml);
            if (ctrlEl) {
              ctrlEl.querySelectorAll('.labs-barrier-preset').forEach(function (b, bIdx) {
                b.classList.toggle('active', bIdx === idx);
              });
            }
          }
          if (ctrlEl) {
            ctrlEl.innerHTML =
              '<div class="labs-witness-controls">' +
              '  <div class="labs-witness-presets">' +
              BARRIER_PROFILES.map(function (bp, bIdx) {
                return '<button type="button" class="labs-mini-chip labs-barrier-preset' + (bIdx === stateObj.selectedIdx ? ' active' : '') + '" data-bidx="' + bIdx + '">' + esc(bp.label) + '</button>';
              }).join('') +
              '  </div>' +
              '  <button type="button" class="labs-btn labs-btn-blue labs-btn-xs labs-barrier-audition-btn">🔊 Audition Through Barrier</button>' +
              '</div>';
            ctrlEl.querySelectorAll('.labs-barrier-preset').forEach(function (b) {
              b.addEventListener('click', function () {
                stateObj.selectedIdx = parseInt(this.getAttribute('data-bidx'), 10) || 0;
                refreshBarrierUI();
              });
            });
            var bAudBtn = ctrlEl.querySelector('.labs-barrier-audition-btn');
            if (bAudBtn) {
              bAudBtn.addEventListener('click', function () {
                var bp = BARRIER_PROFILES[clamp(stateObj.selectedIdx, 0, BARRIER_PROFILES.length - 1)];
                if (Audio && typeof Audio.playSound === 'function') {
                  Audio.playSound(sound.samples, sound.sampleRate, {
                    channel: 'barrier_sim',
                    gain: bp.gain,
                    lowpassHz: bp.cutoffHz
                  });
                }
              });
            }
          }
          bindPointerScrub(canvas, function (_nx, ny) {
            stateObj.selectedIdx = clamp(Math.floor(ny * BARRIER_PROFILES.length), 0, BARRIER_PROFILES.length - 1);
            refreshBarrierUI();
          }, { hoverMove: false });
          refreshBarrierUI();
          return;
        }

        if (barCounts[cType]) {
          var cnt = barCounts[cType];
          bindPointerScrub(canvas, function (_nx, ny) {
            var idx = clamp(Math.floor(ny * cnt), 0, cnt - 1);
            stateObj.selectedIdx = idx;
            drawSingleChartType(canvas, cType, sound, feat, bonus, ml, stateObj);
            if (liveEl) liveEl.textContent = describeSingleBarInspect(cType, idx, feat, bonus, ml);
          }, { hoverMove: true });
          return;
        }

        if (cType === 's_mfcc13') {
          bindPointerScrub(canvas, function (nx) {
            var idx = clamp(Math.floor(nx * 13), 0, 12);
            stateObj.selectedIdx = idx;
            drawSingleChartType(canvas, cType, sound, feat, bonus, ml, stateObj);
            var val = feat.mfccMean ? safeNum(feat.mfccMean[idx], 0) : 0;
            if (liveEl) liveEl.textContent = 'Cepstral Coefficient C' + (idx + 1) + ': ' + val.toFixed(2) + ' (spectral filterbank shape weight).';
          }, { hoverMove: true });
          return;
        }

        if (cType === 's_twin_map' && bonus) {
          bindPointerScrub(canvas, function (nx, ny, w, h) {
            var pad = { l: 34, r: 16, t: 16, b: 24 };
            var pw = w - pad.l - pad.r;
            var ph = h - pad.t - pad.b;
            var px = nx * w;
            var py = ny * h;
            var its = bonus.acoustics.items || [];
            var affs = bonus.acoustics.affinitiesA || [];
            var logMin = Math.log2(50);
            var logMax = Math.log2(1600);
            var bestIdx = 0;
            var bestDist = Infinity;
            for (var k = 0; k < its.length; k++) {
              var ix = pad.l + clamp((Math.log2(its[k].freq) - logMin) / (logMax - logMin), 0, 1) * pw;
              var iy = pad.t + ph - clamp(its[k].flat, 0, 1) * ph;
              var dd = Math.hypot(px - ix, py - iy);
              if (dd < bestDist) { bestDist = dd; bestIdx = k; }
            }
            stateObj.selectedIdx = bestIdx;
            drawSingleChartType(canvas, cType, sound, feat, bonus, ml, stateObj);
            var selItem = its[bestIdx];
            if (liveEl && selItem) {
              liveEl.textContent = selItem.emoji + ' ' + selItem.name + ' (' + selItem.freq + ' Hz · flatness ' + selItem.flat.toFixed(2) + ') — ' + Math.round(safeNum(affs[bestIdx], 0)) + '% analogue affinity.';
            }
          }, { hoverMove: false });
          return;
        }

        // Spectrum, Pitch, Modulation, Envelope, Cumulative Energy, Centroid, Flux, Onset, Burst Gate
        bindPointerScrub(canvas, function (nx) {
          stateObj.hoverNorm = nx;
          drawSingleChartType(canvas, cType, sound, feat, bonus, ml, stateObj);
          if (!liveEl) return;
          var durS = safeNum(feat.duration, 0);
          var tAt = (nx * durS).toFixed(2) + 's';
          if (cType === 's_spectrum') {
            var hz = Math.round(45 * Math.pow(4200 / 45, nx));
            var bins = feat.avgSpectrum || [];
            var bIdx = clamp(Math.round(nx * Math.max(0, bins.length - 1)), 0, Math.max(0, bins.length - 1));
            liveEl.textContent = 'Frequency: ' + hz + ' Hz · Relative Energy: ' + Math.round(safeNum(bins[bIdx], 0) * 100) + '%';
          } else if (cType === 's_mod') {
            var mHz = Math.round(4 + nx * 41);
            var mSpec = feat.modSpectrum || [];
            var mIdx = clamp(Math.round(nx * Math.max(0, mSpec.length - 1)), 0, Math.max(0, mSpec.length - 1));
            liveEl.textContent = 'Modulation Band: ' + mHz + ' Hz (' + (mHz * 60) + ' cyc/m) · Magnitude: ' + Math.round(safeNum(mSpec[mIdx], 0) * 100) + '%';
          } else if (cType === 's_pitch') {
            var pArr = feat.pitchHzArr || [];
            var pIdx = clamp(Math.round(nx * Math.max(0, pArr.length - 1)), 0, Math.max(0, pArr.length - 1));
            var pVal = safeNum(pArr[pIdx], 0);
            liveEl.textContent = 't = ' + tAt + ' (' + Math.round(nx * 100) + '%) · F0: ' + (pVal > 0 ? Math.round(pVal) + ' Hz' : 'Unvoiced/Transition');
          } else if (cType === 's_energy_cum') {
            var envArr = feat.envelope || [];
            var tot = 0, sub = 0, targetK = clamp(Math.round(nx * Math.max(0, envArr.length - 1)), 0, Math.max(0, envArr.length - 1));
            for (var ei = 0; ei < envArr.length; ei++) {
              var e2 = safeNum(envArr[ei], 0) * safeNum(envArr[ei], 0);
              tot += e2;
              if (ei <= targetK) sub += e2;
            }
            liveEl.textContent = 't = ' + tAt + ' (' + Math.round(nx * 100) + '%) · Cumulative Acoustic Energy: ' + (tot > 0 ? Math.round((sub / tot) * 100) : 0) + '%';
          } else if (cType === 's_centroid_contour') {
            var cc = feat.centroidContour || [];
            var cIdx = clamp(Math.round(nx * Math.max(0, cc.length - 1)), 0, Math.max(0, cc.length - 1));
            liveEl.textContent = 't = ' + tAt + ' · Spectral Brightness Offset: ' + safeNum(cc[cIdx], 0).toFixed(2);
          } else if (cType === 's_flux') {
            var flx = bonus && bonus.wetness ? bonus.wetness.fluxSeriesA : [];
            var fIdx = clamp(Math.round(nx * Math.max(0, flx.length - 1)), 0, Math.max(0, flx.length - 1));
            liveEl.textContent = 't = ' + tAt + ' · Instantaneous Spectral Flux: ' + safeNum(flx[fIdx], 0).toFixed(3);
          } else {
            var env = feat.envelope || [];
            var lim = cType === 's_onset_zoom' ? Math.max(8, Math.floor(env.length * 0.5)) : env.length;
            var eIdx = clamp(Math.round(nx * Math.max(0, lim - 1)), 0, Math.max(0, lim - 1));
            var tShow = cType === 's_onset_zoom' ? (nx * durS * 0.5).toFixed(2) + 's' : tAt;
            liveEl.textContent = 't = ' + tShow + ' · Instantaneous Amplitude: ' + Math.round(safeNum(env[eIdx], 0) * 100) + '%';
          }
        }, { hoverMove: true });
      })(canvases[i]);
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
      ? 'This ' + dur + ' specimen exhibited a sustained fundamental resonance at ' + noteStr + ' (' + Math.round(feat.medianPitchHz) + ' Hz), oscillating at ' + safeNum(feat.modRateHz, 0).toFixed(1) + ' Hz (' + bpmMod + ' cycles/min) across ' + bursts + ' burst' + (bursts === 1 ? '' : 's') + '.'
      : 'This ' + dur + ' specimen presented as an unpitched aerodynamic release oscillating at ' + bpmMod + ' cycles/min (' + Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz spectral centroid), evading standard harmonic detection.';

    var mlLine =
      ' The 22-dimension local acoustic classifier assigned "' + ml.topClass.emoji + ' ' + ml.topClass.name + '" (' + ml.confidence + '% model confidence) with a ' + crest + ' dB pressure crest — computed entirely within our offline laboratory telemetry suite.';

    var wetLine = bonus
      ? ' Hydro-Acoustic Stability: ' + bonus.wetness.wetA + '% turbulence index ("' + bonus.wetness.labelA + '").'
      : '';
    var twinLine = bonus
      ? ' Closest Acoustic Reference: ' + bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name + ' (' + bonus.acoustics.topScoreA + '% structural correspondence).'
      : '';
    var alibiLine = bonus
      ? ' Environmental Propagation Model: ' + bonus.social.a.radiusM.toFixed(1) + 'm effective acoustic radius — ' + bonus.social.a.verdict
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
        : 'Unpitched Airband';

    var list = [
      {
        id: 's_crest',
        title: '💥 Transient Crest Intensity',
        score: crestScore,
        sub: crestDb.toFixed(1) + ' dB peak crest',
        quip: crestDb >= 12 ? 'High-amplitude initial transient consistent with rapid valve release.' : 'Controlled pressure gradient without extreme impulse clipping.'
      },
      {
        id: 's_resonance',
        title: '🎨 Spectral Distribution Depth',
        score: resScore,
        sub: Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz centroid',
        quip: subRatio >= 0.35 ? 'Substantial ' + Math.round(subRatio * 100) + '% sub-bass energy concentration below 150 Hz.' : 'Focused mid-band harmonic concentration above the low-frequency floor.'
      },
      {
        id: 's_tone',
        title: '📡 Primary Resonance Profile',
        score: toneScore,
        sub: formatHzLabel(feat) + ' · ' + noteTag,
        quip: feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0 ? 'Sustained pitch locking around ' + noteTag + ' with disciplined modal stability.' : 'Aperiodic broadband flow resistant to single-pitch tracking.'
      },
      {
        id: 's_turbulence',
        title: '🫧 Oscillation Cadence',
        score: turbScore,
        sub: Math.round(safeNum(feat.modRateHz, 0)) + ' Hz (' + bpmSingle + ' cycles/min)',
        quip: bpmSingle >= 1000 ? 'Elevated acoustic oscillation at ' + bpmSingle + ' cycles/min.' : 'Measured aerodynamic ripple at ' + bpmSingle + ' cycles/min.'
      },
      {
        id: 's_burst',
        title: '🥁 Emission & Burst Segmentation',
        score: burstScore,
        sub: bursts + ' discrete phase(s)',
        quip: bursts >= 3 ? 'Multi-stage episodic pulse train exhibiting irregular temporal spacing.' : bursts === 2 ? 'Distinct dual-phase emission profile.' : 'Single continuous aerodynamic release.'
      },
      {
        id: 's_timbre',
        title: '🧪 13-Band MFCC Harmonic Index',
        score: timbreScore,
        sub: 'Flatness ' + safeNum(feat.spectralFlatness, 0).toFixed(2),
        quip: safeNum(feat.spectralFlatness, 0) > 0.45 ? 'Broadband dampened profile with minimal discrete harmonic partials.' : 'Coherent harmonic structure with pronounced upper overtones.'
      },
      {
        id: 's_moisture',
        title: '💦 Hydro-Acoustic Turbulence',
        score: moistScore,
        sub: bonus ? bonus.wetness.labelA : 'Spectral flux',
        quip: bonus && bonus.wetness.wetA >= 65 ? 'Laboratory Assessment: Elevated spectral-flux irregularity across mid-band bins.' : 'Dry laminar discharge confirmed under laboratory inspection.'
      },
      {
        id: 's_twin',
        title: '🌩️ Comparative Archive Analogue',
        score: twinScore,
        sub: bonus ? bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name : 'Reference Class',
        quip: bonus ? 'Closest structural acoustic analogue: ' + bonus.acoustics.twinA.name + '.' : 'Indexed against calibrated meteorological and mechanical reference profiles.'
      },
      {
        id: 's_panic',
        title: '🛋️ Propagation & Masking Index',
        score: panicScore,
        sub: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm effective radius' : 'Radius',
        quip: bonus ? 'Masking Assessment: ' + bonus.social.a.verdict : 'Evaluating enclosed-chamber acoustic detectability.'
      },
      {
        id: 's_ml',
        title: '🤖 Computational Classification',
        score: mlScore,
        sub: ml.topClass.emoji + ' ' + ml.topClass.name + ' (Local)',
        quip: 'Evaluated locally across 22 acoustic descriptors inside the offline telemetry suite.'
      },
      {
        id: 's_velocity',
        title: '🚀 Onset Rise Velocity',
        score: velocityScore,
        sub: Math.round(atkMs) + 'ms pressure rise',
        quip: atkMs <= 70 ? 'Rapid transient onset with negligible pressure ramp.' : 'Progressive pressure escalation preceding peak release.'
      },
      {
        id: 's_neighbor',
        title: '🧱 Structural Boundary Attenuation',
        score: neighborScore,
        sub: Math.round(subRatio * 100) + '% sub-150Hz coupling',
        quip: subRatio >= 0.35 ? 'Low-frequency wavelength demonstrates strong structural boundary transmission.' : 'Higher-frequency energy attenuates rapidly across architectural partitions.'
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
        title: 'Computational Classification: ' + ml.topClass.emoji + ' ' + ml.topClass.name,
        subtitle: ml.topClass.description,
        score: g.score,
        color: g.color,
        commentary:
          'This 22-dimension offline acoustic classifier evaluates 13 MFCC coefficients, fundamental resonance pitch, spectral flatness, modulation depth, transient crest, sub-bass concentration, and spectral flux against six calibrated laboratory prototypes. Posterior confidence sits at ' +
          ml.confidence +
          '% for "' +
          ml.topClass.name +
          '" (secondary candidate: "' +
          ml.runnerUp.name +
          '" at ' +
          ml.runnerUp.prob +
          '%), executed entirely within the institute local workstation.',
        charts: [
          { title: '6-Class Softmax Probability Distribution', sub: 'Nearest archive prototype correspondence', drawType: 's_ml_probs' },
          { title: '13-Band MFCC Input Tensor', sub: 'Primary cepstral classification vector', drawType: 's_mfcc13' }
        ],
        stats: [
          { label: 'Primary Class', value: ml.topClass.name, sub: ml.confidence + '% posterior' },
          { label: 'Secondary', value: ml.runnerUp.name, sub: ml.runnerUp.prob + '% posterior' },
          { label: 'Pitch / Centroid', value: ml.featureVector.pitchHz + ' Hz', sub: ml.featureVector.subBandPct + '% sub-bass' },
          { label: 'Model Type', value: '22-D Softmax', sub: 'Offline local telemetry' }
        ],
        formula: 'P(class_k) = exp(-d_weighted(x_22d, mu_k) / 0.55) / SUM(exp(-d / 0.55))'
      };
    }

    var map = {
      s_crest: {
        badgeCode: 'DOC-01 // TRANSIENT CREST TELEMETRY',
        title: 'Transient Crest Intensity & Impulse Force',
        subtitle: 'Peak-to-RMS acoustic energy across ' + dur.toFixed(2) + 's emission lifetime.',
        commentary:
          'Transient telemetry measured ' + safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB of peak-to-average impulse contrast. ' +
          (safeNum(feat.crestFactorDb, 0) >= 12 ? 'A sharply defined valve-release transient triggered maximum peak excursion early in the trace.' : 'A measured hydraulic pressure rise progressed without extreme impulse clipping.'),
        charts: [
          { title: 'Pressure Release Envelope', sub: 'RMS contour vs time', drawType: 's_envelope' },
          { title: 'Cumulative Energy Integral', sub: 'T10 / T50 / T90 energy milestones', drawType: 's_energy_cum' }
        ],
        stats: [
          { label: 'Crest Factor', value: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB', sub: 'Peak / RMS ratio' },
          { label: 'Peak Timing', value: Math.round(safeNum(feat.peakTimeRatio, 0.5) * 100) + '%', sub: 'Maximum pressure phase' },
          { label: 'Emission Lifetime', value: dur.toFixed(2) + 's', sub: 'Active acoustic window' },
          { label: 'Half-Energy T50', value: Math.round(safeNum(feat.t50Ratio, 0.5) * 100) + '%', sub: '50% cumulative release point' }
        ],
        formula: 'Crest_dB = 20 * log10(max(|x|) / RMS(x))'
      },
      s_resonance: {
        badgeCode: 'DOC-02 // SPECTRAL DISTRIBUTION & FORMANT RESONANCE',
        title: 'Spectral Distribution & Chamber Resonance',
        subtitle: '40-band STFT distribution mapping sub-bass coupling vs upper-band air dispersion.',
        commentary:
          'Spectral center of mass resides at ' + Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz with ' +
          Math.round(safeNum(bp[0], 0) * 100) + '% of acoustic output concentrated below 150 Hz. ' +
          (bp[0] >= 0.35 ? 'Low-frequency coupling dominates the spectrum, generating sustained resonant boundary amplification.' : 'Mid- and high-band turbulence dominates over low-frequency dampened propagation.'),
        charts: [
          { title: '40-Band Spectral Distribution Map', sub: '45 Hz to 4.2 kHz logarithmic surface', drawType: 's_spectrum' },
          { title: '4-Band Energy Breakdown', sub: 'Sub-Bass vs Mid-Low vs Mid-Upper vs Aperture', drawType: 's_4band' }
        ],
        stats: [
          { label: 'Spectral Centroid', value: Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz', sub: 'Acoustic center of mass' },
          { label: 'Sub-Bass (<150Hz)', value: Math.round(safeNum(bp[0], 0) * 100) + '%', sub: 'Low-frequency coupling' },
          { label: 'Mid-Low Resonance', value: Math.round(safeNum(bp[1], 0) * 100) + '%', sub: '150–450 Hz core band' },
          { label: 'Upper Aperture (>1.2kHz)', value: Math.round(safeNum(bp[3], 0) * 100) + '%', sub: 'High-frequency diffusion' }
        ],
        formula: 'Centroid = SUM(f_k * E_k) / SUM(E_k)'
      },
      s_tone: {
        badgeCode: 'DOC-03 // FUNDAMENTAL F0 & PITCH TRAJECTORY',
        title: 'Primary Resonance Profile & Pitch Trajectory',
        subtitle: 'Tracks fundamental pitch contour in Hz across voiced emission frames.',
        commentary:
          (feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
            ? 'Disciplined harmonic resonance locked onto ' + noteStr + ' (' + Math.round(feat.medianPitchHz) + ' Hz) across ' + Math.round(feat.voicedRatio * 100) + '% of active frames.'
            : 'Broadband unpitched emission (' + Math.round(safeNum(feat.voicedRatio, 0) * 100) + '% voiced frames), behaving acoustically as a diffused boundary airflow discharge.'),
        charts: [
          { title: '32-Frame Primary Resonance Contour', sub: 'Fundamental frequency over time', drawType: 's_pitch' },
          { title: 'Spectral Brightness Trajectory', sub: 'Log2 centroid progression across frames', drawType: 's_centroid_contour' }
        ],
        stats: [
          { label: 'Primary Resonance', value: formatHzLabel(feat), sub: noteStr },
          { label: 'Pitch Deviation', value: safeNum(feat.pitchRangeSemitones, 0).toFixed(1) + ' st', sub: 'Semitone modulation span' },
          { label: 'Harmonic Ratio', value: Math.round(safeNum(feat.voicedRatio, 0) * 100) + '%', sub: 'Pitched frame share' },
          { label: 'Trajectory Drift', value: (safeNum(feat.pitchTrend, 0) >= 0 ? 'Ascending +' : 'Descending ') + Math.abs(safeNum(feat.pitchTrend, 0)).toFixed(2), sub: 'Octave delta' }
        ],
        formula: 'F0(frame) via Normalized Lag Autocorrelation; MIDI = 69 + 12 * log2(Hz / 440)'
      },
      s_turbulence: {
        badgeCode: 'DOC-04 // OSCILLATION CADENCE SPECTROSCOPY',
        title: 'Oscillation Cadence & Valve Modulation',
        subtitle: 'Quantifies periodic envelope modulation frequency in Hz and cycles/min.',
        commentary:
          'Modulation analysis recorded ' + Math.round(safeNum(feat.modRateHz, 0)) + ' Hz (' + bpmSingle + ' cycles/min) at ' + Math.round(safeNum(feat.modDepth, 0) * 100) + '% envelope modulation depth. ' +
          (feat.modRateHz >= 18 ? 'Elevated rapid-cycle valve flutter remained persistent across the primary release window.' : 'Controlled low-frequency aerodynamic cadence maintained throughout.'),
        charts: [
          { title: 'Modulation FFT (4–45 Hz)', sub: 'Low oscillation, primary flutter, and high-rate modulation', drawType: 's_mod' },
          { title: '3-Band Modulation Split', sub: 'Slow vs Primary Flutter vs High-Rate Modulation', drawType: 's_mod3band' }
        ],
        stats: [
          { label: 'Oscillation Rate', value: bpmSingle + ' cyc/m', sub: Math.round(safeNum(feat.modRateHz, 0)) + ' Hz envelope frequency' },
          { label: 'Modulation Depth', value: Math.round(safeNum(feat.modDepth, 0) * 100) + '%', sub: 'Amplitude flutter depth' },
          { label: 'Spectral Flux', value: safeNum(feat.spectralFlux, 0).toFixed(3), sub: 'Inter-frame variance' },
          { label: 'ZCR', value: safeNum(feat.zcr, 0).toFixed(3), sub: 'Zero-crossing turbulence' }
        ],
        formula: 'ModDepth = std(Env) / mean(Env); Rate = 60 * argmax(FFT_mod[4Hz..45Hz])'
      },
      s_burst: {
        badgeCode: 'DOC-05 // EPISODIC PULSE SEGMENTATION',
        title: 'Burst Gate & Temporal Segmentation Audit',
        subtitle: 'Discrete pressure impulse segmentation across ' + dur.toFixed(2) + 's emission lifetime.',
        commentary:
          'Envelope gating identified ' + (feat.burstCount || 1) + ' distinct emission phase(s) exceeding the 0.35 amplitude threshold. ' +
          ((feat.burstCount || 1) >= 3 ? 'Multi-stage pulse sequencing produced discrete acoustic packets separated by measurable valleys.' : feat.burstCount === 2 ? 'Dual-phase temporal separation confirmed two consecutive discharge events.' : 'Unified single-phase aerodynamic discharge without secondary re-ignition.'),
        charts: [
          { title: 'Envelope vs 0.35 Gate Threshold', sub: 'Burst detection hysteresis peaks', drawType: 's_burst_gate' },
          { title: 'Attack / Sustain / Decay Ratio', sub: 'Temporal structure distribution', drawType: 's_attack_decay' }
        ],
        stats: [
          { label: 'Phases Detected', value: String(feat.burstCount || 1), sub: 'Gate > 0.35 / re-arm < 0.18' },
          { label: 'Attack Time', value: atkMs + ' ms', sub: 'Rise to peak RMS' },
          { label: 'Decay Tail', value: decMs + ' ms', sub: 'Post-peak attenuation span' },
          { label: 'Emission Lifetime', value: dur.toFixed(2) + 's', sub: 'Active trace duration' }
        ],
        formula: 'BurstCount = peaks(SmoothEnv > 0.35 separated by valleys < 0.18)'
      },
      s_timbre: {
        badgeCode: 'DOC-06 // 13-BAND CEPSTRAL FINGERPRINT',
        title: 'Timbral Texture, MFCC & Boundary Attenuation',
        subtitle: 'Quantifies harmonic overtone structure vs broadband airflow dispersion.',
        commentary:
          'Wiener Spectral Flatness measured ' + safeNum(feat.spectralFlatness, 0).toFixed(2) + ' (' + (feat.spectralFlatness > 0.45 ? 'elevated broadband airiness with subdued discrete harmonics' : 'dense harmonic structure with distinct modal overtones') + '). All 13-band cepstral signatures remain stored locally within the laboratory archive.',
        charts: [
          { title: '13-Band MFCC Signature', sub: 'Spectral envelope shape vector', drawType: 's_mfcc13' },
          { title: '40-Band Spectral Distribution Map', sub: 'Formant resonances & overtones', drawType: 's_spectrum' }
        ],
        stats: [
          { label: 'Spectral Flatness', value: safeNum(feat.spectralFlatness, 0).toFixed(3), sub: '0 = tonal, 1 = broadband' },
          { label: 'Spectral Centroid', value: Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz', sub: 'Weighted frequency balance' },
          { label: 'ML Classification', value: ml.topClass.name, sub: ml.confidence + '% posterior' },
          { label: 'Harmonic Share', value: Math.round(safeNum(feat.voicedRatio, 0) * 100) + '%', sub: 'Tonal frames' }
        ],
        formula: 'Flatness = geomMean(|X|) / arithMean(|X|); MFCC = DCT(log(MelEnergy))'
      },
      s_moisture: {
        badgeCode: 'DOC-07 // HYDRO-ACOUSTIC TURBULENCE TELEMETRY',
        title: 'Hydro-Acoustic Turbulence & Spectral Flux',
        subtitle: 'Quantifies transient mid-band micro-modulation dynamics.',
        commentary:
          bonus
            ? 'Laboratory Assessment: Classified under "' + bonus.wetness.labelA + '" (' + bonus.wetness.wetA + '%). ' + (bonus.wetness.wetA >= 65 ? 'High inter-frame spectral volatility recorded within the core turbulence band.' : 'Low spectral volatility confirms stable dry aerodynamic discharge.')
            : 'Hydro-acoustic modulation metrics derived from instantaneous spectral flux.',
        charts: [
          { title: 'Instantaneous Spectral Flux', sub: 'Inter-frame spectral volatility', drawType: 's_flux' },
          { title: 'Turbulence Component Mix', sub: 'Modulation + Flux + Turbulence Band weightings', drawType: 's_squelch_mix' }
        ],
        stats: [
          { label: 'Turbulence Index', value: (bonus ? bonus.wetness.wetA : 25) + '%', sub: bonus ? bonus.wetness.labelA : '' },
          { label: 'Spectral Flux', value: safeNum(feat.spectralFlux, 0).toFixed(3), sub: 'Inter-frame variance' },
          { label: 'Modulation Depth', value: Math.round(safeNum(feat.modDepth, 0) * 100) + '%', sub: 'Envelope ripple factor' },
          { label: 'Phases', value: String(feat.burstCount || 1), sub: 'Discrete impulse count' }
        ],
        formula: 'Turbulence = 22*norm(Mod) + 46*norm(Flux) + 22*Band + BurstBonus'
      },
      s_twin: {
        badgeCode: 'DOC-08 // REFERENCE ANALOGUE CLASSIFICATION',
        title: 'Archive Analogue: ' + (bonus ? bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name : 'Reference'),
        subtitle: 'Cross-referenced against 8 calibrated meteorological, fluid, and mechanical profiles.',
        commentary:
          bonus
            ? 'Comparative Archive Match: Acoustic parameters align most closely with "' + bonus.acoustics.twinA.name + '" at ' + bonus.acoustics.topScoreA + '% structural affinity across fundamental pitch, flatness, and modulation.'
            : 'Indexed against calibrated reference archetypes.',
        charts: [
          { title: '8-Analogue Affinity Distribution', sub: 'Comparison across calibrated natural & mechanical profiles', drawType: 's_twin_bars' },
          { title: '2D Hz × Flatness Archive Map', sub: 'Green point = Subject specimen vs reference classes', drawType: 's_twin_map' }
        ],
        stats: [
          { label: 'Closest Analogue', value: bonus ? bonus.acoustics.twinA.short : '—', sub: bonus ? bonus.acoustics.topScoreA + '% affinity' : '' },
          { label: 'Primary Frequency', value: formatHzLabel(feat), sub: 'Reference alignment band' },
          { label: 'Spectral Flatness', value: safeNum(feat.spectralFlatness, 0).toFixed(2), sub: 'Harmonic vs noise axis' },
          { label: 'Acoustic Regime', value: (feat.medianPitchHz || 200) < 130 ? 'Sub-Bass / Fluid' : 'High-Pressure / Aero', sub: 'Archive stratum' }
        ],
        formula: 'Affinity = 100 * exp(-(|deltaOct|/1.15 + |deltaFlat|*1.4 + |deltaMod|*0.75))'
      },
      s_panic: {
        badgeCode: 'DOC-09 // ACOUSTIC PROPAGATION & MASKING AUDIT',
        title: 'Propagation Radius & Environmental Masking',
        subtitle: 'Models enclosed-chamber audibility radius and ambient acoustic masking.',
        commentary:
          bonus
            ? 'Propagation Briefing: Effective acoustic perimeter extends to ' + bonus.social.a.radiusM.toFixed(1) + 'm (' + bonus.social.a.panicPct + '% chamber prominence). Masking Finding: "' + bonus.social.a.verdict + '"'
            : 'Propagation radius telemetry.',
        charts: [
          { title: 'Enclosed Chamber Propagation Map', sub: 'Audible perimeter vs 2.2m reference chamber', drawType: 's_blast_map' },
          { title: 'Ambient Masking Comparators', sub: 'Mechanical vs Friction vs Pneumatic profiles', drawType: 's_alibi_bars' }
        ],
        stats: [
          { label: 'Effective Radius', value: bonus ? bonus.social.a.radiusM.toFixed(1) + ' m' : '—', sub: 'Audible propagation zone' },
          { label: 'Prominence Index', value: (bonus ? bonus.social.a.panicPct : 40) + '%', sub: 'Chamber detectability' },
          { label: 'Nearest Mask', value: bonus ? bonus.social.a.verdict.split('(')[0].trim().slice(0, 22) : 'Ambient', sub: 'Highest masking overlap' },
          { label: 'Emission Lifetime', value: dur.toFixed(2) + 's', sub: 'Exposure duration' }
        ],
        formula: 'Radius_m = 1.8 + 10.5 * (ProminencePct / 100); Masking = f(Pitch, Duration, Centroid)'
      },
      s_velocity: {
        badgeCode: 'DOC-11 // ONSET VELOCITY & IMPULSE RISE',
        title: 'Onset Rise Velocity & Transient Slope',
        subtitle: 'Quantifies pressure escalation rate from baseline silence to peak amplitude.',
        commentary:
          'Peak amplitude was reached in ' + atkMs + 'ms (' + Math.round((atkMs / Math.max(40, dur * 1000)) * 100) + '% of emission lifetime). ' +
          (atkMs <= 70 ? 'A steep, unmitigated initial step response indicates instantaneous pressure release.' : 'A progressive pressure ramp preceded Peak RMS, followed by ' + decMs + 'ms of exponential decay.'),
        charts: [
          { title: 'Initial Attack Surge Zoom', sub: 'First 50% normalized onset envelope', drawType: 's_onset_zoom' },
          { title: 'Cumulative Energy T10/T50/T90', sub: 'Cumulative acoustic power milestones', drawType: 's_energy_cum' }
        ],
        stats: [
          { label: 'Attack Rise', value: atkMs + ' ms', sub: 'Time to peak RMS' },
          { label: 'Decay Tail', value: decMs + ' ms', sub: 'Post-peak attenuation' },
          { label: 'T10 / T90', value: Math.round(safeNum(feat.t10Ratio, 0.1) * 100) + '% / ' + Math.round(safeNum(feat.t90Ratio, 0.9) * 100) + '%', sub: 'Energy bounds' },
          { label: 'Crest Impulse', value: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB', sub: 'Transient sharpness' }
        ],
        formula: 'AttackVelocity = PeakRMS / max(0.01, AttackSec)'
      },
      s_neighbor: {
        badgeCode: 'DOC-12 // ARCHITECTURAL BOUNDARY ATTENUATION',
        title: 'Structural Boundary Transmission Forecast',
        subtitle: 'Models low-frequency acoustic wavelength propagation across solid partitions.',
        commentary:
          'Structural Transmission Audit: Sub-150 Hz waves couple effectively across rigid partitions while high-frequency content attenuates rapidly. With ' +
          Math.round(safeNum(bp[0], 0) * 100) + '% sub-bass allocation, structural boundary transmission measures ' + g.score + '%.',
        charts: [
          { title: 'Structural Transmission Forecast', sub: 'Attenuation across architectural boundaries', drawType: 's_wall_atten' },
          { title: '4-Band Frequency Attenuation', sub: 'Low-frequency coupling vs upper absorption', drawType: 's_4band' }
        ],
        stats: [
          { label: 'Transmission Index', value: g.score + '%', sub: g.status },
          { label: 'Sub-Bass (<150Hz)', value: Math.round(safeNum(bp[0], 0) * 100) + '%', sub: 'Boundary-coupling band' },
          { label: 'Propagation Radius', value: bonus ? bonus.social.a.radiusM.toFixed(1) + 'm' : '4.0m', sub: 'Open-chamber range' },
          { label: 'ML Profile', value: ml.topClass.short || ml.topClass.name, sub: ml.confidence + '% fit' }
        ],
        formula: 'Transmission = 0.82 * SubBassRatio + 0.52 * ProminenceIndex'
      }
    };

    var found = map[g.id] || map.s_crest;
    return Object.assign({ id: g.id, score: g.score, color: g.color }, found);
  }

  /* ==================== AUTHENTICITY ANALYSIS (PURE HEURISTICS, INFORMATIONAL ONLY) ==================== */
  function classifyAuthenticityScore(score) {
    var s = clamp(safeNum(score, 50), 0, 100);
    if (s < 20) {
      return { key: 'highly_suspicious', label: 'Highly Suspicious', color: '#F87171', tone: 'low' };
    }
    if (s < 40) {
      return { key: 'likely_mouth', label: 'Likely Mouth Generated', color: '#FB923C', tone: 'warn' };
    }
    if (s < 60) {
      return { key: 'uncertain', label: 'Uncertain', color: '#FBBF24', tone: 'mid' };
    }
    if (s < 80) {
      return { key: 'likely_authentic', label: 'Likely Authentic', color: '#38BDF8', tone: 'good' };
    }
    return { key: 'highly_authentic', label: 'Highly Authentic', color: '#22C55E', tone: 'good' };
  }

  function metricIntensityLabel(score) {
    var s = clamp(safeNum(score, 0), 0, 100);
    if (s < 30) return 'Low';
    if (s < 55) return 'Moderate';
    if (s < 75) return 'Elevated';
    return 'High';
  }

  function authenticityMetricColor(score, polarity) {
    var s = clamp(safeNum(score, 0), 0, 100);
    if (polarity === 'overall') return classifyAuthenticityScore(s).color;
    var favorable = polarity === 'suspicious' ? 100 - s : s;
    if (favorable >= 70) return '#22C55E';
    if (favorable >= 45) return '#38BDF8';
    if (favorable >= 25) return '#FBBF24';
    return '#F87171';
  }

  function computeAuthenticityAnalysis(soundOrFeat) {
    var DSP = root.TootApp && root.TootApp.DSP;
    var feat = null;
    if (soundOrFeat) {
      if (soundOrFeat.features) {
        feat = soundOrFeat.features;
      } else if (typeof soundOrFeat.spectralCentroidHz === 'number' && soundOrFeat.avgSpectrum) {
        feat = soundOrFeat;
      } else if (DSP && soundOrFeat.samples && soundOrFeat.samples.length > 0) {
        feat = DSP.extractFeatures(soundOrFeat.samples, soundOrFeat.sampleRate || 44100);
        soundOrFeat.features = feat;
      }
    }

    if (!feat) {
      var fallbackTier = classifyAuthenticityScore(50);
      return {
        authenticityScore: 50,
        organicProbability: 50,
        mouthSuspicion: 50,
        tier: fallbackTier,
        confidenceLevel: 'Low',
        confidenceScore: 15,
        verdict: 'Evidence is inconclusive due to insufficient acoustic telemetry. Further investigation recommended.',
        v2Telemetry: null,
        breakdown: [
          { key: 'pitch_stability', name: 'Pitch Stability', score: 50, status: 'Moderate', statusColor: '#FBBF24', polarity: 'suspicious', weight: 0.12, explanation: 'Insufficient voiced frames to isolate vocal pitch locking.' },
          { key: 'harmonic_regularity', name: 'Harmonic Regularity', score: 50, status: 'Moderate', statusColor: '#FBBF24', polarity: 'suspicious', weight: 0.13, explanation: 'Overtone periodicity could not be conclusively resolved.' },
          { key: 'spectral_complexity', name: 'Spectral Complexity', score: 50, status: 'Moderate', statusColor: '#38BDF8', polarity: 'authentic', weight: 0.14, explanation: 'Baseline spectral spread metrics unavailable.' },
          { key: 'airflow_turbulence', name: 'Airflow Turbulence', score: 50, status: 'Moderate', statusColor: '#38BDF8', polarity: 'authentic', weight: 0.17, explanation: 'Modulation depth and impulse transients unavailable.' },
          { key: 'resonance_pattern', name: 'Resonance Pattern', score: 50, status: 'Moderate', statusColor: '#38BDF8', polarity: 'authentic', weight: 0.16, explanation: 'Acoustic chamber distribution unavailable.' },
          { key: 'formant_presence', name: 'Formant Presence', score: 50, status: 'Moderate', statusColor: '#FBBF24', polarity: 'suspicious', weight: 0.15, explanation: 'Speech-tract formant scan yielded inconclusive baseline.' },
          { key: 'breath_contamination', name: 'Breath Contamination', score: 50, status: 'Moderate', statusColor: '#FBBF24', polarity: 'suspicious', weight: 0.13, explanation: 'Boundary respiratory air telemetry unavailable.' },
          { key: 'overall_authenticity', name: 'Overall Authenticity Score', score: 50, status: fallbackTier.label, statusColor: fallbackTier.color, polarity: 'overall', weight: 1.0, explanation: 'Informational origin likelihood score derived solely from DSP heuristics.' }
        ]
      };
    }

    var bp = feat.bandProfile && feat.bandProfile.length >= 4 ? feat.bandProfile : [0.25, 0.35, 0.25, 0.15];
    var subShare = clamp(safeNum(bp[0], 0), 0, 1);
    var lowMidShare = clamp(safeNum(bp[1], 0), 0, 1);
    var upperMidShare = clamp(safeNum(bp[2], 0), 0, 1);
    var highAirShare = clamp(safeNum(bp[3], 0), 0, 1);
    var lowChamberShare = clamp(subShare + lowMidShare, 0, 1);

    var duration = clamp(safeNum(feat.duration, 0.4), 0.04, 30);
    var voicedRatio = clamp(safeNum(feat.voicedRatio, 0), 0, 1);
    var medianPitchHz = clamp(safeNum(feat.medianPitchHz, 0), 0, 1200);
    var pitchRangeSt = clamp(safeNum(feat.pitchRangeSemitones, 0), 0, 36);
    var pitchTrend = safeNum(feat.pitchTrend, 0);
    var centroidHz = clamp(safeNum(feat.spectralCentroidHz, 240), 40, 6000);
    var spectralFlatness = clamp(safeNum(feat.spectralFlatness, 0.2), 0, 1);
    var spectralFlux = clamp(safeNum(feat.spectralFlux, 0.04), 0, 1);
    var attackSec = clamp(safeNum(feat.attackSec, 0.06), 0.001, 10);
    var decaySec = clamp(safeNum(feat.decaySec, 0.15), 0.001, 15);
    var crestDb = clamp(safeNum(feat.crestFactorDb, 8), 0, 35);
    var modRateHz = clamp(safeNum(feat.modRateHz, 12), 0, 60);
    var modDepth = clamp(safeNum(feat.modDepth, 0.4), 0, 3);
    var modBands = feat.modBands && feat.modBands.length >= 3 ? feat.modBands : [0.3, 0.4, 0.3];
    var burstCount = Math.max(1, Math.round(safeNum(feat.burstCount, 1)));
    var zcr = clamp(safeNum(feat.zcr, 200), 0, 8000);

    // Authenticity v2 Telemetry (Lip-trill 22-42 Hz, 85% roll-off clothing damping, pre-onset breath)
    var preOnsetBreath =
      (soundOrFeat && soundOrFeat.preOnsetBreath) ||
      (soundOrFeat && soundOrFeat.clipInfo && soundOrFeat.clipInfo.preOnsetBreath) ||
      (feat && feat.preOnsetBreath) ||
      null;
    if (
      !preOnsetBreath &&
      DSP &&
      typeof DSP.measurePreOnsetBreath === 'function' &&
      soundOrFeat &&
      soundOrFeat.rawSamples &&
      soundOrFeat.rawSamples.length > 0 &&
      typeof soundOrFeat.trimStartSec === 'number' &&
      soundOrFeat.trimStartSec >= 0.09
    ) {
      var rawSr = soundOrFeat.sampleRate || 44100;
      preOnsetBreath = DSP.measurePreOnsetBreath(soundOrFeat.rawSamples, rawSr, Math.round(soundOrFeat.trimStartSec * rawSr));
    }

    var lipTrillScore = clamp(safeNum(feat.lipTrillScore, 0), 0, 1);
    var lipTrillPeakHz = clamp(safeNum(feat.lipTrillPeakHz, 0), 0, 60);
    var spectralRolloff85Hz = clamp(safeNum(feat.spectralRolloff85Hz, centroidHz * 1.9), 80, 8000);
    var above2kPowerShare = clamp(safeNum(feat.above2kPowerShare, highAirShare * 0.5), 0, 1);
    var clothingDampingScore = typeof feat.clothingDampingScore === 'number'
      ? clamp(feat.clothingDampingScore, 0, 1)
      : clamp(
          0.65 * clamp(1 - (spectralRolloff85Hz - 950) / 2250, 0, 1) +
          0.35 * clamp(1 - (above2kPowerShare - 0.03) / 0.25, 0, 1),
          0,
          1
        );
    var preBreathAvail = Boolean(preOnsetBreath && preOnsetBreath.available);
    var preBreathScore = preBreathAvail ? clamp(safeNum(preOnsetBreath.score, 0), 0, 1) : 0;

    // Inspect 40-band spectrum & 32-frame grid for formants, harmonics & boundary breathiness
    var avgSpec = feat.avgSpectrum && feat.avgSpectrum.length ? feat.avgSpectrum : [];
    var specObj = feat.spectrogram || null;
    var centers = specObj && specObj.freqCenters && specObj.freqCenters.length ? specObj.freqCenters : null;
    var nBands = avgSpec.length || (centers ? centers.length : 40);

    var specSum = 0;
    var subBandSum = 0;
    var subBandCount = 0;
    var f1Sum = 0;
    var f1Peak = 0;
    var f1Count = 0;
    var f2Sum = 0;
    var f2Peak = 0;
    var f2Count = 0;
    var hiAirSpecSum = 0;
    var hiAirSpecCount = 0;
    for (var bi = 0; bi < nBands; bi++) {
      var mag = clamp(safeNum(avgSpec[bi], 0), 0, 1);
      var freq = centers && bi < centers.length ? safeNum(centers[bi], 200) : 45 * Math.pow(4200 / 45, bi / Math.max(1, nBands - 1));
      specSum += mag;
      if (freq < 330) {
        subBandSum += mag;
        subBandCount++;
      } else if (freq >= 350 && freq <= 850) {
        f1Sum += mag;
        if (mag > f1Peak) f1Peak = mag;
        f1Count++;
      } else if (freq >= 950 && freq <= 2300) {
        f2Sum += mag;
        if (mag > f2Peak) f2Peak = mag;
        f2Count++;
      }
      if (freq >= 1200) {
        hiAirSpecSum += mag;
        hiAirSpecCount++;
      }
    }

    // Spectral Shannon Entropy across 40 frequency bins
    var specEntropy = 0.5;
    if (specSum > 1e-6 && nBands > 1) {
      var rawH = 0;
      for (var ei = 0; ei < nBands; ei++) {
        var pk = clamp(safeNum(avgSpec[ei], 0), 0, 1) / specSum;
        if (pk > 1e-9) rawH -= pk * Math.log(pk);
      }
      specEntropy = clamp(rawH / Math.log(nBands), 0, 1);
    }

    // Pitch frame-to-frame jitter across voiced frames
    var pitchArr = feat.pitchHzArr || [];
    var prevHz = 0;
    var stepSum = 0;
    var stepCnt = 0;
    for (var pi = 0; pi < pitchArr.length; pi++) {
      var curHz = safeNum(pitchArr[pi], 0);
      if (curHz > 20) {
        if (prevHz > 20) {
          stepSum += 12 * Math.abs(Math.log(curHz / prevHz) / Math.LN2);
          stepCnt++;
        }
        prevHz = curHz;
      } else {
        prevHz = 0;
      }
    }
    var meanPitchStep = stepCnt > 0 ? stepSum / stepCnt : 0;

    // Centroid variation across frames
    var cArr = feat.centroidContour || [];
    var cMean = 0;
    var cCnt = cArr.length || 0;
    for (var ci = 0; ci < cCnt; ci++) cMean += safeNum(cArr[ci], 0);
    cMean = cCnt > 0 ? cMean / cCnt : 0;
    var cVar = 0;
    for (var cj = 0; cj < cCnt; cj++) {
      var cd = safeNum(cArr[cj], 0) - cMean;
      cVar += cd * cd;
    }
    var centroidStd = cCnt > 0 ? Math.sqrt(cVar / cCnt) : 0.25;

    // Envelope frame-to-frame delta & mean energy (checks abrupt airflow turbulence vs smooth vocal/breath plateau)
    var env = feat.envelope || [];
    var envMean = 0;
    var envDeltaSum = 0;
    for (var vi = 0; vi < env.length; vi++) {
      var ev = clamp(safeNum(env[vi], 0), 0, 1);
      envMean += ev;
      if (vi > 0) envDeltaSum += Math.abs(ev - clamp(safeNum(env[vi - 1], 0), 0, 1));
    }
    envMean = env.length > 0 ? envMean / env.length : 0.2;
    var envJitter = env.length > 1 ? envDeltaSum / (env.length - 1) : 0.08;

    // Boundary breathiness from spectrogram grid (high-frequency fraction in first 15% and last 22% frames)
    var boundaryHighRatio = highAirShare;
    if (specObj && specObj.grid && specObj.frames > 4 && nBands > 0) {
      var nFrames = specObj.frames;
      var startEnd = Math.max(1, Math.floor(nFrames * 0.16));
      var tailStart = Math.max(startEnd, Math.floor(nFrames * 0.78));
      var bHi = 0;
      var bTot = 0;
      for (var fi = 0; fi < nFrames; fi++) {
        if (fi < startEnd || fi >= tailStart) {
          var rowOff = fi * nBands;
          for (var kb = 0; kb < nBands; kb++) {
            var gv = clamp(safeNum(specObj.grid[rowOff + kb], 0), 0, 1);
            var fc = centers && kb < centers.length ? safeNum(centers[kb], 200) : 45 * Math.pow(4200 / 45, kb / Math.max(1, nBands - 1));
            bTot += gv;
            if (fc >= 1150) bHi += gv;
          }
        }
      }
      if (bTot > 1e-4) boundaryHighRatio = clamp(bHi / bTot, 0, 1);
    }

    // Formant & Pre-Onset baseline signals used by Voiced-Squeaker vs. Voiced-Raspberry separation
    var subAvg = subBandCount > 0 ? subBandSum / subBandCount : 0.25;
    var f1Avg = f1Count > 0 ? f1Sum / f1Count : 0;
    var f2Avg = f2Count > 0 ? f2Sum / f2Count : 0;
    var f1Signal = 0.45 * f1Avg + 0.55 * f1Peak;
    var f2Signal = 0.45 * f2Avg + 0.55 * f2Peak;
    var f1Ratio = clamp(f1Signal / Math.max(0.16, subAvg * 0.95), 0, 1.15) / 1.15;
    var f2Ratio = clamp(f2Signal / Math.max(0.14, subAvg * 0.85), 0, 1.15) / 1.15;
    var midTractEnergy = clamp((upperMidShare - 0.08) / 0.32, 0, 1);
    var lipSpitCue = centroidHz > 280 ? clamp((centroidHz - 280) / 520, 0, 1) : 0;
    var mfccSlopeCue = feat.mfccMean && feat.mfccMean.length >= 3
      ? clamp((safeNum(feat.mfccMean[1], 0) < 12 ? (12 - safeNum(feat.mfccMean[1], 0)) / 22 : 0.15), 0, 1)
      : 0.25;
    var upperAirCue = clamp((highAirShare - 0.03) / 0.24, 0, 1);

    // Authenticity v2: Voiced-Squeaker vs. Voiced-Raspberry Separation
    var openMouthRadiation = clamp(1 - clothingDampingScore, 0, 1);
    var squeakerPitchFit = voicedRatio >= 0.35 && medianPitchHz >= 245 ? clamp((medianPitchHz - 235) / 110, 0, 1) : 0;
    var squeakerCleanliness =
      clamp(1 - Math.max(0, spectralFlatness - 0.15) / 0.22, 0, 1) *
      clamp(1 - above2kPowerShare / 0.12, 0, 1) *
      clamp(1 - lipTrillScore / 0.32, 0, 1);
    var squeakerRollGuard = spectralRolloff85Hz < Math.max(1650, medianPitchHz * 3.6) ? 1.0 : 0.3;
    var squeakerBreathGuard = (!preBreathAvail || preBreathScore < 0.32) ? 1.0 : 0.25;
    var squeakerGlideBonus = (pitchRangeSt >= 2.5 || Math.abs(pitchTrend) >= 1.5) ? 1.0 : 0.78;
    var squeakerScore = clamp(
      squeakerPitchFit * squeakerCleanliness * squeakerRollGuard * squeakerBreathGuard * squeakerGlideBonus,
      0,
      1
    );
    var vocalF0Match = medianPitchHz >= 85 && medianPitchHz <= 285 ? 1.0 : (medianPitchHz > 285 ? 0.35 : 0.45);
    var voicedRaspberryScore = clamp(
      0.38 * lipTrillScore +
      0.26 * (voicedRatio * vocalF0Match * (0.45 + 0.55 * openMouthRadiation)) +
      0.20 * (0.5 * f1Ratio + 0.5 * f2Ratio) * openMouthRadiation +
      0.16 * (preBreathAvail ? preBreathScore : upperAirCue),
      0,
      1
    );
    var archetype =
      squeakerScore >= 0.45
        ? 'Clothed High Squeaker'
        : voicedRaspberryScore >= 0.45
          ? 'Voiced Bilabial Raspberry'
          : lipTrillScore >= 0.35
            ? 'Bilabial Trill (22–42 Hz)'
            : clothingDampingScore >= 0.65
              ? 'Damped Cavity Resonance'
              : 'Unclassified Acoustic Blend';

    // 1. PITCH STABILITY (0-100; high = steady vocal pitch control -> suspicious, with squeaker forgiveness)
    var steadiness = stepCnt > 0 ? clamp(1 - meanPitchStep / 3.4, 0, 1) : clamp(1 - centroidStd / 0.55, 0, 1);
    var narrowness = stepCnt > 0 ? clamp(1 - pitchRangeSt / 8.5, 0, 1) : clamp(1 - Math.abs(safeNum(feat.centroidTrend, 0)) / 0.7, 0, 1);
    var pitchZoneRisk = medianPitchHz >= 120 && medianPitchHz <= 290 ? 1.0 : (medianPitchHz > 290 ? 0.78 : 0.28);
    var subBassDamp = lowChamberShare > 0.78 && upperMidShare < 0.16 ? 0.65 : 1.0;
    var stabilityRaw = voicedRatio >= 0.22
      ? (0.34 * voicedRatio + 0.28 * steadiness + 0.18 * narrowness + 0.20 * pitchZoneRisk) * subBassDamp
      : 0.18 * steadiness + 0.14 * narrowness + 0.08 * voicedRatio;
    stabilityRaw = stabilityRaw * (1 - 0.52 * squeakerScore) + 0.14 * voicedRaspberryScore;
    var pitchStabilityScore = Math.round(clamp(stabilityRaw * 100, 4, 96));

    // 2. HARMONIC REGULARITY (0-100; high = clean mid-band vocal harmonics or bilabial lip trill -> suspicious)
    var harmonicOrder = clamp(1 - spectralFlatness * 2.1, 0, 1);
    var lowChaosBonus = clamp(1 - spectralFlux / 0.12, 0, 1);
    var singleBurstOrder = clamp(1 - (burstCount - 1) / 3, 0, 1);
    var vocalBandFocus = clamp((upperMidShare - 0.08) / 0.36, 0, 1);
    var harmonicRaw = 0.28 * voicedRatio * (0.45 + 0.55 * vocalBandFocus) + 0.24 * harmonicOrder * (0.4 + 0.6 * vocalBandFocus) + 0.22 * lowChaosBonus + 0.16 * vocalBandFocus + 0.10 * singleBurstOrder;
    if (subShare > 0.35 && upperMidShare < 0.18) harmonicRaw *= 0.62;
    harmonicRaw += 0.24 * lipTrillScore;
    if (above2kPowerShare < 0.08) harmonicRaw *= (1 - 0.45 * squeakerScore);
    var harmonicRegularityScore = Math.round(clamp(harmonicRaw * 100, 5, 95));

    // 3. SPECTRAL COMPLEXITY (0-100; high = rich entropy + dynamic flux -> authentic)
    var fluxRichness = clamp(spectralFlux / 0.095, 0, 1);
    var centroidDynamics = clamp(centroidStd / 0.45, 0, 1);
    var pitchSweepDiversity = clamp(pitchRangeSt / 7.5, 0, 1);
    var hissDamp = highAirShare > 0.32 ? clamp(1 - (highAirShare - 0.32) * 1.45, 0.25, 1) : 1.0;
    var complexityRaw = (0.46 * specEntropy + 0.28 * fluxRichness + 0.16 * centroidDynamics + 0.10 * pitchSweepDiversity) * hissDamp;
    complexityRaw = complexityRaw * (1 - 0.22 * openMouthRadiation * lipTrillScore) + 0.16 * squeakerScore * clamp(pitchRangeSt / 6, 0.35, 1);
    var spectralComplexityScore = Math.round(clamp(complexityRaw * 100, 8, 97));

    // 4. AIRFLOW TURBULENCE (0-100; high = explosive attack + 6-20 Hz cheek flutter, penalized on 22-42 Hz lip trill -> authentic)
    var attackSharpness = clamp(1 - (attackSec - 0.015) / 0.21, 0, 1);
    var crestPunch = clamp((crestDb - 4.0) / 13.5, 0, 1);
    var flutterIndex = clamp(modDepth / 0.85, 0, 1);
    var cheekBandFit = clamp((safeNum(modBands[1], 0) + 0.5 * safeNum(modBands[0], 0)) / 0.65, 0, 1);
    var burstTurbulence = clamp(envJitter / 0.12, 0, 1);
    var rateAffinity = (modRateHz >= 6 && modRateHz <= 21)
      ? 1.0
      : (modRateHz >= 22 && modRateHz <= 42 && lipTrillScore > 0.30 ? 0.22 : 0.45);
    var turbulenceRaw = (
      0.26 * attackSharpness +
      0.22 * crestPunch +
      0.24 * (0.65 * flutterIndex + 0.35 * rateAffinity) +
      0.16 * cheekBandFit +
      0.12 * burstTurbulence
    ) * (1 - 0.50 * lipTrillScore);
    var airflowTurbulenceScore = Math.round(clamp(turbulenceRaw * 100, 6, 98));

    // 5. RESONANCE PATTERN (0-100; incorporates 85% spectral roll-off clothing damping -> authentic)
    var chamberDominance = clamp((lowChamberShare - 0.30) / 0.62, 0, 1);
    var centroidFit =
      centroidHz <= 320
        ? clamp(1 - Math.max(0, 75 - centroidHz) / 120, 0.72, 1)
        : clamp(1 - (centroidHz - 320) / 520, 0.04, 1);
    var pressureDecayDrop = (pitchTrend < -0.4 || safeNum(feat.centroidTrend, 0) < -0.03) ? 0.96 : 0.44;
    var subVsMouthRatio = clamp(lowChamberShare / (upperMidShare * 1.4 + highAirShare * 1.6 + 0.12), 0, 2.2) / 2.2;
    var resonanceRaw =
      0.32 * chamberDominance +
      0.22 * centroidFit +
      0.26 * clothingDampingScore +
      0.12 * subVsMouthRatio +
      0.08 * pressureDecayDrop +
      0.26 * squeakerScore * clothingDampingScore;
    var resonancePatternScore = Math.round(clamp(resonanceRaw * 100, 5, 98));

    // 6. FORMANT PRESENCE (0-100; speech F1/F2 + 22-42 Hz lip trill + voiced raspberry -> suspicious)
    var formantRaw =
      (0.22 * f1Ratio + 0.22 * f2Ratio + 0.24 * lipTrillScore + 0.16 * voicedRaspberryScore + 0.10 * midTractEnergy + 0.06 * mfccSlopeCue) *
      (1 - 0.35 * squeakerScore);
    var formantPresenceScore = Math.round(clamp(formantRaw * 100, 4, 96));

    // 7. BREATH CONTAMINATION (0-100; uses pre-onset breath SNR/dur before clipping when available -> suspicious)
    var boundaryCue = clamp((boundaryHighRatio - 0.06) / 0.28, 0, 1);
    var zcrBreathCue = clamp((zcr - 220) / 1100, 0, 1);
    var slowRampBreath = clamp((attackSec - 0.035) / 0.20, 0, 1) * clamp(highAirShare / 0.14, 0, 1);
    var hiAvgSpec = hiAirSpecCount > 0 ? hiAirSpecSum / hiAirSpecCount : 0;
    var hissPresence = clamp(hiAvgSpec / 0.30, 0, 1);
    var breathRaw;
    if (preBreathAvail) {
      breathRaw = 0.36 * preBreathScore + 0.22 * upperAirCue + 0.18 * boundaryCue + 0.12 * zcrBreathCue + 0.12 * hissPresence;
      if (preBreathScore >= 0.48) {
        breathRaw = Math.max(breathRaw, 0.56 + 0.34 * preBreathScore);
      } else if (preBreathScore < 0.12) {
        breathRaw *= 0.85;
      }
    } else {
      breathRaw = 0.30 * upperAirCue + 0.28 * boundaryCue + 0.18 * zcrBreathCue + 0.14 * hissPresence + 0.10 * slowRampBreath;
    }
    var breathContaminationScore = Math.round(clamp(breathRaw * 100, 3, 97));

    // Weighted contribution toward Overall Authenticity Score (weights sum to 1.00)
    var contribs = [
      { key: 'pitch_stability', weight: 0.12, organic: (100 - pitchStabilityScore) / 100 },
      { key: 'harmonic_regularity', weight: 0.13, organic: (100 - harmonicRegularityScore) / 100 },
      { key: 'spectral_complexity', weight: 0.14, organic: spectralComplexityScore / 100 },
      { key: 'airflow_turbulence', weight: 0.17, organic: airflowTurbulenceScore / 100 },
      { key: 'resonance_pattern', weight: 0.16, organic: resonancePatternScore / 100 },
      { key: 'formant_presence', weight: 0.15, organic: (100 - formantPresenceScore) / 100 },
      { key: 'breath_contamination', weight: 0.13, organic: (100 - breathContaminationScore) / 100 }
    ];

    var weightedOrganic = 0;
    var meanOrganic = 0;
    for (var wi = 0; wi < contribs.length; wi++) {
      weightedOrganic += contribs[wi].weight * contribs[wi].organic;
      meanOrganic += contribs[wi].organic;
    }
    meanOrganic /= contribs.length;

    var authenticityScore = Math.round(clamp(weightedOrganic * 100, 2, 98));
    var organicProbability = authenticityScore;
    var mouthSuspicion = 100 - authenticityScore;
    var tier = classifyAuthenticityScore(authenticityScore);

    // Separate Confidence Score (certainty of measurement, NOT authenticity itself)
    var orgVar = 0;
    for (var vi2 = 0; vi2 < contribs.length; vi2++) {
      var dOrg = contribs[vi2].organic - meanOrganic;
      orgVar += dOrg * dOrg;
    }
    var orgStd = Math.sqrt(orgVar / contribs.length);
    var agreementScore = clamp(1 - orgStd / 0.36, 0, 1);
    var durationScore = clamp((duration - 0.10) / 0.55, 0, 1);
    var signalEnergyScore = clamp((envMean - 0.04) / 0.22, 0, 1);
    var decisivenessBonus = clamp(Math.abs(authenticityScore - 50) / 38, 0, 1);
    var confidenceScore = Math.round(
      clamp(100 * (0.38 * agreementScore + 0.27 * durationScore + 0.18 * signalEnergyScore + 0.17 * decisivenessBonus), 10, 96)
    );
    var confidenceLevel = confidenceScore >= 68 ? 'High' : (confidenceScore >= 40 ? 'Moderate' : 'Low');

    var pitchExplain =
      pitchStabilityScore >= 70
        ? 'Suspiciously steady F0 lock (' + (voicedRatio * 100).toFixed(0) + '% voiced) consistent with deliberate vocal pitch control.'
        : pitchStabilityScore >= 45
          ? 'Moderately stabilized frequency contour; minor tonal control or steady cavity oscillation observed.'
          : 'Organic pitch instability and irregular frame drift observed across the emission.';

    var harmonicExplain =
      harmonicRegularityScore >= 70
        ? 'Clean overtone spacing and low spectral mutation suggest probable vocal-fold periodicity.'
        : harmonicRegularityScore >= 45
          ? 'Mixed periodic pulse train with intermittent harmonic disruption.'
          : 'Chaotic pulse-train harmonics and rapid spectral mutation support involuntary flutter.';

    var complexityExplain =
      spectralComplexityScore >= 70
        ? 'Rich spectral entropy and vigorous frame-to-frame texture evolution support organic gas dynamics.'
        : spectralComplexityScore >= 45
          ? 'Moderate spectral complexity with balanced broadband dispersion.'
          : 'Narrow, overly uniform frequency contour typical of simplified tonal imitation.';

    var turbulenceExplain =
      lipTrillScore >= 0.38
        ? 'Detected concentrated 22–42 Hz bilabial lip-trill periodic modulation (' + Math.round(lipTrillPeakHz || modRateHz) + ' Hz peak) — stronger oral embouchure signature than 6–20 Hz lower-aperture flutter.'
        : airflowTurbulenceScore >= 70
          ? 'Strong turbulence signatures, rapid pressure onset (' + (attackSec * 1000).toFixed(0) + ' ms), and ' + Math.round(modRateHz) + ' Hz airflow oscillation support authenticity.'
          : airflowTurbulenceScore >= 45
            ? 'Moderate airflow irregularity and impulse modulation detected.'
            : 'Smooth ramp-up and muted turbulence suggest controlled oral or gentle steady air release.';

    var resonanceExplain =
      resonancePatternScore >= 70
        ? '85% spectral roll-off sits at ' + Math.round(spectralRolloff85Hz) + ' Hz with ' + Math.round(clothingDampingScore * 100) + '% clothing/cavity low-pass damping and ' + Math.round(lowChamberShare * 100) + '% sub-450 Hz weight.'
        : resonancePatternScore >= 45
          ? 'Intermediate cavity weighting (85% roll-off ' + Math.round(spectralRolloff85Hz) + ' Hz); partially damped lower-chamber profile.'
          : 'Broadband open-air radiation (85% roll-off ' + Math.round(spectralRolloff85Hz) + ' Hz; ' + (above2kPowerShare * 100).toFixed(1) + '% >2 kHz) indicates unmuffled oral/open aperture projection.';

    var formantExplain =
      formantPresenceScore >= 70
        ? (lipTrillScore >= 0.38 || voicedRaspberryScore >= 0.45
            ? 'Elevated 22–42 Hz bilabial lip-trill and voiced F1/F2 vocal-tract clustering strongly suggest oral raspberry mimicry.'
            : 'Speech-like resonance patterns and elevated F1/F2 lip-activity signatures detected.')
        : squeakerScore >= 0.45
          ? 'High harmonic squeak stayed clothing-damped with negligible 22–42 Hz lip trill or oral formant radiation.'
          : formantPresenceScore >= 45
            ? 'Mild mid-band formant peaks detected; possible lip-cushion shaping or upholstery coloration.'
            : 'Negligible speech formant clustering; frequency profile bypasses human vowel corridors.';

    var breathExplain =
      preBreathAvail && preBreathScore >= 0.40
        ? 'Pre-clip raw lead-in detected +' + preOnsetBreath.breathSnrDb + ' dB respiratory inhalation (' + preOnsetBreath.breathDurMs + ' ms >1 kHz) right before onset, plus ' + Math.round(highAirShare * 100) + '% >1.2 kHz bleed.'
        : breathContaminationScore >= 70
          ? 'Elevated upper-band air hiss (' + Math.round(highAirShare * 100) + '% >1.2 kHz) suggests probable respiratory exhalation bleed.'
          : preBreathAvail && preBreathScore < 0.12
            ? 'Verified quiet pre-onset window before clipping (' + preOnsetBreath.preWindowSec.toFixed(2) + 's scanned); minimal respiratory contamination.'
            : breathContaminationScore >= 45
              ? 'Moderate high-frequency air turbulence present near transient boundaries.'
              : 'Minimal respiratory air contamination detected before onset or after decay.';

    // Humorous, strictly probabilistic laboratory verdict (NEVER uses "REAL FART" / "FAKE FART")
    var verdict;
    if (authenticityScore >= 80) {
      verdict =
        airflowTurbulenceScore >= 65
          ? 'Authentic characteristics observed. Acoustic characteristics are consistent with naturally occurring gastrointestinal gas release; strong turbulence signatures support authenticity.'
          : 'Authentic characteristics observed. Dominant low-chamber resonance and minimal speech formant telemetry indicate highly probable involuntary emission.';
    } else if (authenticityScore >= 60) {
      verdict =
        formantPresenceScore >= 55
          ? 'Likely authentic rear-origin acoustic event. Mild mid-band resonance anomalies prevent complete exclusion of oral assistance, though probable organic origin prevails.'
          : 'Likely authentic rear-origin acoustic event. Sub-450 Hz cavity profile and irregular airflow modulation support naturally occurring emission.';
    } else if (authenticityScore >= 40) {
      verdict =
        breathContaminationScore >= 55 || formantPresenceScore >= 55
          ? 'Evidence is inconclusive. The laboratory remains divided regarding the origin of this sample; elevated lip-resonance indicators coexist with plausible lower-chamber rumble. Further investigation recommended.'
          : 'Evidence is inconclusive. Conflicting pitch, formant, and airflow indicators leave organic versus oral origin uncertain; further investigation recommended.';
    } else if (authenticityScore >= 20) {
      verdict =
        breathContaminationScore >= 60
          ? 'Likely mouth generated. Several indicators suggest possible facially generated emission activity with suspicious upper-band respiratory bleed.'
          : 'Elevated lip-resonance indicators detected. Several indicators suggest possible facially generated emission activity rather than involuntary rear propulsion.';
    } else {
      verdict =
        'Highly suspicious acoustic signature. Prominent formant structure, vocal pitch stability, and respiratory hiss indicate probable mouth-origin mimicry; further committee review advised.';
    }

    var breakdown = [
      {
        key: 'pitch_stability',
        name: 'Pitch Stability',
        score: pitchStabilityScore,
        status: metricIntensityLabel(pitchStabilityScore),
        statusColor: authenticityMetricColor(pitchStabilityScore, 'suspicious'),
        polarity: 'suspicious',
        weight: 0.12,
        explanation: pitchExplain
      },
      {
        key: 'harmonic_regularity',
        name: 'Harmonic Regularity',
        score: harmonicRegularityScore,
        status: metricIntensityLabel(harmonicRegularityScore),
        statusColor: authenticityMetricColor(harmonicRegularityScore, 'suspicious'),
        polarity: 'suspicious',
        weight: 0.13,
        explanation: harmonicExplain
      },
      {
        key: 'spectral_complexity',
        name: 'Spectral Complexity',
        score: spectralComplexityScore,
        status: metricIntensityLabel(spectralComplexityScore),
        statusColor: authenticityMetricColor(spectralComplexityScore, 'authentic'),
        polarity: 'authentic',
        weight: 0.14,
        explanation: complexityExplain
      },
      {
        key: 'airflow_turbulence',
        name: 'Airflow Turbulence',
        score: airflowTurbulenceScore,
        status: metricIntensityLabel(airflowTurbulenceScore),
        statusColor: authenticityMetricColor(airflowTurbulenceScore, 'authentic'),
        polarity: 'authentic',
        weight: 0.17,
        explanation: turbulenceExplain
      },
      {
        key: 'resonance_pattern',
        name: 'Resonance Pattern',
        score: resonancePatternScore,
        status: metricIntensityLabel(resonancePatternScore),
        statusColor: authenticityMetricColor(resonancePatternScore, 'authentic'),
        polarity: 'authentic',
        weight: 0.16,
        explanation: resonanceExplain
      },
      {
        key: 'formant_presence',
        name: 'Formant Presence',
        score: formantPresenceScore,
        status: metricIntensityLabel(formantPresenceScore),
        statusColor: authenticityMetricColor(formantPresenceScore, 'suspicious'),
        polarity: 'suspicious',
        weight: 0.15,
        explanation: formantExplain
      },
      {
        key: 'breath_contamination',
        name: 'Breath Contamination',
        score: breathContaminationScore,
        status: metricIntensityLabel(breathContaminationScore),
        statusColor: authenticityMetricColor(breathContaminationScore, 'suspicious'),
        polarity: 'suspicious',
        weight: 0.13,
        explanation: breathExplain
      },
      {
        key: 'overall_authenticity',
        name: 'Overall Authenticity Score',
        score: authenticityScore,
        status: tier.label,
        statusColor: tier.color,
        polarity: 'overall',
        weight: 1.0,
        explanation: verdict
      }
    ];

    return {
      authenticityScore: authenticityScore,
      organicProbability: organicProbability,
      mouthSuspicion: mouthSuspicion,
      tier: tier,
      confidenceLevel: confidenceLevel,
      confidenceScore: confidenceScore,
      verdict: verdict,
      v2Telemetry: {
        lipTrillScore: Number(lipTrillScore.toFixed(3)),
        lipTrillPeakHz: Number(lipTrillPeakHz.toFixed(1)),
        spectralRolloff85Hz: Math.round(spectralRolloff85Hz),
        clothingDampingScore: Number(clothingDampingScore.toFixed(3)),
        above2kPowerShare: Number(above2kPowerShare.toFixed(4)),
        preOnsetBreath: preOnsetBreath,
        squeakerScore: Number(squeakerScore.toFixed(3)),
        voicedRaspberryScore: Number(voicedRaspberryScore.toFixed(3)),
        archetype: archetype
      },
      breakdown: breakdown
    };
  }

  function buildAuthenticitySummaryRow(rowId, authA, authB, labelA, labelB) {
    if (authB) {
      var avgScore = Math.round(clamp((authA.authenticityScore + authB.authenticityScore) / 2, 0, 100));
      var avgTier = classifyAuthenticityScore(avgScore);
      return {
        id: rowId || 'authenticity',
        title: '🔬 Authenticity Analysis',
        score: avgScore,
        sub: (labelA || 'Specimen A') + ': ' + authA.authenticityScore + '% (' + authA.tier.label + ') vs ' + (labelB || 'Specimen B') + ': ' + authB.authenticityScore + '% (' + authB.tier.label + ')',
        quip: 'Informational heuristic origin check (Organic vs Oral Mimicry) — excluded from Reproduction Fidelity & rankings.',
        forensicsKey: 'authenticity',
        status: avgTier.label,
        color: avgTier.color,
        tone: avgTier.tone
      };
    }
    var a = authA;
    return {
      id: rowId || 's_authenticity',
      title: '🔬 Authenticity Analysis',
      score: a.authenticityScore,
      sub: a.tier.label + ' · Organic ' + a.organicProbability + '% · Oral Mimicry ' + a.mouthSuspicion + '% · Confidence: ' + a.confidenceLevel,
      quip: 'Informational origin assessment — heuristic estimate of naturally occurring release vs oral mimicry.',
      status: a.tier.label,
      color: a.tier.color,
      tone: a.tier.tone
    };
  }

  function drawAuthenticityPlot(target, authA, authB, labelA, labelB, interOpts) {
    var p = setupDarkPlot(target, 215);
    if (!p || !authA || !authA.breakdown) return;
    var ctx = p.ctx;
    var w = p.w;
    var h = p.h;
    ctx.fillStyle = '#070B12';
    ctx.fillRect(0, 0, w, h);

    var items = authA.breakdown;
    var padL = 136;
    var padR = 44;
    var padT = 18;
    var padB = 18;
    var plotW = Math.max(40, w - padL - padR);
    var plotH = Math.max(40, h - padT - padB);
    var rowStep = plotH / Math.max(1, items.length);
    var selIdx = interOpts && typeof interOpts.selectedIdx === 'number' ? interOpts.selectedIdx : -1;

    // Reference vertical grid lines at 20%, 40%, 60%, 80%, 100%
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    var ticks = [20, 40, 60, 80, 100];
    for (var ti = 0; ti < ticks.length; ti++) {
      var tx = padL + (ticks[ti] / 100) * plotW;
      ctx.beginPath();
      ctx.moveTo(tx, padT);
      ctx.lineTo(tx, padT + plotH);
      ctx.stroke();
      ctx.fillStyle = '#64748B';
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ticks[ti] + '%', tx, h - 5);
    }

    for (var i = 0; i < items.length; i++) {
      var row = items[i];
      var yMid = padT + i * rowStep + rowStep / 2;
      if (i === selIdx) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.fillRect(4, padT + i * rowStep + 1, w - 8, Math.max(10, rowStep - 2));
      }
      ctx.fillStyle = i === selIdx || row.polarity === 'overall' ? '#F8FAFC' : '#CBD5E1';
      ctx.font = (row.polarity === 'overall' ? '700 ' : '600 ') + '10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row.name.slice(0, 22), padL - 8, yMid + 3.5);

      if (authB && authB.breakdown && authB.breakdown[i]) {
        var rowB = authB.breakdown[i];
        var bh = Math.max(4, Math.min(8, rowStep * 0.28));
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(padL, yMid - bh - 1, plotW, bh);
        ctx.fillRect(padL, yMid + 1, plotW, bh);

        ctx.fillStyle = '#60A5FA';
        ctx.fillRect(padL, yMid - bh - 1, (row.score / 100) * plotW, bh);
        ctx.fillStyle = '#FB7185';
        ctx.fillRect(padL, yMid + 1, (rowB.score / 100) * plotW, bh);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '600 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(row.score + '/' + rowB.score, padL + plotW + 5, yMid + 3);
      } else {
        var bh1 = Math.max(6, Math.min(12, rowStep * 0.48));
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(padL, yMid - bh1 / 2, plotW, bh1);
        ctx.fillStyle = row.statusColor || '#38BDF8';
        ctx.fillRect(padL, yMid - bh1 / 2, (row.score / 100) * plotW, bh1);

        ctx.fillStyle = row.statusColor || '#E2E8F0';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(row.score + '%', padL + plotW + 6, yMid + 3);
      }
    }

    if (authB) {
      ctx.fillStyle = '#60A5FA';
      ctx.fillRect(padL, 5, 8, 6);
      ctx.fillStyle = '#93C5FD';
      ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(labelA || 'A').slice(0, 14), padL + 12, 11);

      ctx.fillStyle = '#FB7185';
      ctx.fillRect(padL + 115, 5, 8, 6);
      ctx.fillStyle = '#FDA4AF';
      ctx.fillText(String(labelB || 'B').slice(0, 14), padL + 127, 11);
    }

    finishDarkPlot(p);
  }

  function wireAuthChartInteraction(slotEl, authA, authB, labelA, labelB) {
    if (!slotEl || !authA || !authA.breakdown) return;
    var canvas = slotEl.querySelector('canvas[data-auth-chart]');
    var liveEl = slotEl.querySelector('.labs-auth-live-bar');
    if (!canvas) return;
    var items = authA.breakdown;
    bindPointerScrub(canvas, function (_nx, ny, _w, h) {
      var padT = 18, padB = 18;
      var plotH = Math.max(40, h - padT - padB);
      var yPx = clamp(ny * h - padT, 0, plotH - 0.1);
      var idx = clamp(Math.floor((yPx / plotH) * items.length), 0, items.length - 1);
      canvas._labsSelIdx = idx;
      drawAuthenticityPlot(canvas, authA, authB, labelA, labelB, { selectedIdx: idx });
      var rA = items[idx];
      var rB = authB && authB.breakdown ? authB.breakdown[idx] : null;
      if (liveEl && rA) {
        liveEl.textContent = rB
          ? rA.name + ' — ' + (labelA || 'A') + ': ' + rA.score + '% (' + rA.status + ') vs ' + (labelB || 'B') + ': ' + rB.score + '% (' + rB.status + ')'
          : rA.name + ': ' + rA.score + '% (' + rA.status + ') — ' + rA.explanation;
      }
    }, { hoverMove: true });
  }

  function renderAuthenticityGaugeHtml(auth, tagLabel) {
    var score = auth.authenticityScore;
    var r = 42;
    var c = 2 * Math.PI * r;
    var dashOffset = c * (1 - score / 100);
    var v2 = auth.v2Telemetry;
    var v2Html = '';
    if (v2) {
      var pb = v2.preOnsetBreath;
      var rollSub =
        v2.clothingDampingScore >= 0.65
          ? 'Clothing-damped'
          : v2.clothingDampingScore >= 0.35
            ? 'Moderate damping'
            : 'Open-air bright';
      var lipSub = v2.lipTrillScore >= 0.15 && v2.lipTrillPeakHz > 0
        ? Math.round(v2.lipTrillPeakHz) + ' Hz peak'
        : 'None detected';
      var pbVal = pb && pb.available ? (pb.score >= 0.40 ? '+' + pb.breathSnrDb + ' dB' : 'Quiet') : 'Trimmed';
      var pbSub =
        pb && pb.available
          ? pb.score >= 0.40
            ? pb.breathDurMs + ' ms pre-inhale'
            : 'No inhale bleed'
          : 'Raw pre-onset N/A';
      v2Html =
        '<div class="labs-auth-v2-strip">' +
        '  <div class="labs-auth-v2-chip"><span>85% Roll-Off</span><strong>' + Math.round(v2.spectralRolloff85Hz) + ' Hz</strong><small>' + esc(rollSub) + '</small></div>' +
        '  <div class="labs-auth-v2-chip"><span>Lip-Trill (22–42 Hz)</span><strong>' + Math.round(v2.lipTrillScore * 100) + '%</strong><small>' + esc(lipSub) + '</small></div>' +
        '  <div class="labs-auth-v2-chip"><span>Pre-Onset Breath</span><strong>' + esc(pbVal) + '</strong><small>' + esc(pbSub) + '</small></div>' +
        '  <div class="labs-auth-v2-chip"><span>Voiced Separation</span><strong>' + esc(v2.archetype) + '</strong><small>Sq ' + Math.round(v2.squeakerScore * 100) + '% / Rasp ' + Math.round(v2.voicedRaspberryScore * 100) + '%</small></div>' +
        '</div>';
    }
    return (
      '<div class="labs-auth-summary">' +
      '  <div class="labs-auth-ring-wrap">' +
      '    <svg class="labs-auth-ring-svg" viewBox="0 0 108 108" width="108" height="108" aria-label="Authenticity Score ' + score + '%">' +
      '      <circle class="labs-auth-ring-track" cx="54" cy="54" r="' + r + '" />' +
      '      <circle class="labs-auth-ring-fill" cx="54" cy="54" r="' + r + '" stroke="' + auth.tier.color + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + dashOffset.toFixed(1) + '" />' +
      '    </svg>' +
      '    <div class="labs-auth-ring-center">' +
      '      <span class="labs-auth-ring-num" style="color:' + auth.tier.color + '">' + score + '%</span>' +
      '      <span class="labs-auth-ring-lbl">' + esc(auth.tier.label) + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="labs-auth-kpis">' +
      (tagLabel ? '<div class="labs-eyebrow">' + esc(tagLabel) + '</div>' : '') +
      '    <div class="labs-single-facts-grid">' +
      '      <div class="labs-fact-box"><span>Authenticity Score</span><strong style="color:' + auth.tier.color + '">' + score + '%</strong><small class="labs-fact-sub">' + esc(auth.tier.label) + '</small></div>' +
      '      <div class="labs-fact-box"><span>Organic Emission Probability</span><strong>' + auth.organicProbability + '%</strong><small class="labs-fact-sub">Posterior heuristic weight</small></div>' +
      '      <div class="labs-fact-box"><span>Oral Mimicry Indicator</span><strong>' + auth.mouthSuspicion + '%</strong><small class="labs-fact-sub">Estimated vocal/oral probability</small></div>' +
      '      <div class="labs-fact-box"><span>Analysis Confidence</span><strong>' + esc(auth.confidenceLevel) + '</strong><small class="labs-fact-sub">Signal certainty (' + auth.confidenceScore + '%)</small></div>' +
      '    </div>' +
      v2Html +
      '    <div class="labs-auth-verdict-box">' +
      '      <div class="labs-eyebrow">LABORATORY VERDICT</div>' +
      '      <p class="labs-auth-verdict-text">' + esc(auth.verdict) + '</p>' +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderAuthenticityBreakdownRowsHtml(breakdown) {
    return (
      '<div class="labs-auth-breakdown">' +
      breakdown
        .map(function (row) {
          var isOverall = row.polarity === 'overall';
          var dirHint =
            row.polarity === 'suspicious'
              ? 'Higher = Elevated oral/vocal indicator'
              : row.polarity === 'authentic'
                ? 'Higher = Stronger organic trait'
                : 'Weighted heuristic composite';
          return (
            '<div class="labs-auth-row' + (isOverall ? ' labs-auth-row-overall' : '') + '">' +
            '  <div class="labs-auth-row-main">' +
            '    <div class="labs-auth-row-title-group">' +
            '      <span class="labs-auth-row-name">' + esc(row.name) + '</span>' +
            '      <small class="labs-auth-row-hint">' + esc(dirHint) + '</small>' +
            '    </div>' +
            '    <div class="labs-auth-row-right">' +
            '      <div class="labs-auth-bar-track"><div class="labs-auth-bar-fill" style="width:' + row.score + '%;background:' + row.statusColor + '"></div></div>' +
            '      <span class="labs-auth-row-score" style="color:' + row.statusColor + '">' + row.score + '%</span>' +
            '      <span class="labs-auth-status-pill" style="border-color:' + row.statusColor + ';color:' + row.statusColor + '">' + esc(row.status) + '</span>' +
            '    </div>' +
            '  </div>' +
            '  <div class="labs-auth-row-explain">' + esc(row.explanation) + '</div>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderAuthenticityAccordionHtml(auth, extraNote) {
    return (
      '<div class="labs-acc-head">' +
      '  <div>' +
      '    <div class="labs-eyebrow">INFORMATIONAL TELEMETRY ONLY · EXCLUDED FROM REPRODUCTION FIDELITY</div>' +
      '    <div class="labs-expanded-note">' + esc(extraNote || 'Pure heuristic acoustic evaluation of natural gastrointestinal emission vs oral mimicry signatures. Results express scientific probability only.') + '</div>' +
      '  </div>' +
      '  <button type="button" class="labs-btn-ghost labs-btn-sm labs-acc-close">✕ Collapse</button>' +
      '</div>' +
      renderAuthenticityGaugeHtml(auth, 'SPECIMEN ORIGIN TELEMETRY') +
      '<div class="labs-chart-box-inner" style="margin:12px 0">' +
      '  <div class="labs-chart-box-head"><span>Authenticity Indicator Matrix</span><small>Tap or drag rows to inspect indicators</small></div>' +
      '  <canvas class="labs-2d-canvas" data-auth-chart="single" style="height:220px"></canvas>' +
      '  <div class="labs-chart-live-bar labs-auth-live-bar">Select any indicator bar above to inspect its acoustic basis.</div>' +
      '</div>' +
      renderCollapsibleStatsHtml(
        renderAuthenticityBreakdownRowsHtml(auth.breakdown),
        'Authenticity = 100 * sum(w_i * OrganicTrait_i); Confidence = Consensus(7) + Duration + SNR (Excluded From Fidelity Index)',
        (auth.breakdown || []).length,
        'Detailed Breakdown (7 Indicators + Overall)',
        'HEURISTIC ENGINE'
      )
    );
  }

  function renderAuthenticityComparisonAccordionHtml(labelA, authA, labelB, authB) {
    var rowsHtml = authA.breakdown
      .map(function (rA, idx) {
        var rB = authB.breakdown[idx] || rA;
        var isOverall = rA.polarity === 'overall';
        return (
          '<div class="labs-auth-row' + (isOverall ? ' labs-auth-row-overall' : '') + '">' +
          '  <div class="labs-auth-row-main">' +
          '    <div class="labs-auth-row-title-group">' +
          '      <span class="labs-auth-row-name">' + esc(rA.name) + '</span>' +
          '      <small class="labs-auth-row-hint">' + esc(labelA) + ' vs ' + esc(labelB) + '</small>' +
          '    </div>' +
          '    <div class="labs-auth-row-right labs-auth-row-right-cmp">' +
          '      <span class="labs-auth-status-pill" style="border-color:' + rA.statusColor + ';color:' + rA.statusColor + '">A: ' + rA.score + '% ' + esc(rA.status) + '</span>' +
          '      <span class="labs-auth-status-pill" style="border-color:' + rB.statusColor + ';color:' + rB.statusColor + '">B: ' + rB.score + '% ' + esc(rB.status) + '</span>' +
          '    </div>' +
          '  </div>' +
          '  <div class="labs-auth-row-explain"><strong>' + esc(labelA) + ':</strong> ' + esc(rA.explanation) + ' · <strong>' + esc(labelB) + ':</strong> ' + esc(rB.explanation) + '</div>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="labs-acc-head">' +
      '  <div>' +
      '    <div class="labs-eyebrow">INFORMATIONAL ORIGIN AUDIT · EXCLUDED FROM REPRODUCTION FIDELITY</div>' +
      '    <div class="labs-expanded-note">Independent probabilistic heuristic scan for both specimens. Reproduction Fidelity rankings remain purely spectral and temporal based.</div>' +
      '  </div>' +
      '  <button type="button" class="labs-btn-ghost labs-btn-sm labs-acc-close">✕ Collapse</button>' +
      '</div>' +
      '<div class="labs-auth-cmp-grid">' +
      '  <div class="labs-auth-cmp-col">' + renderAuthenticityGaugeHtml(authA, 'SPECIMEN A · ' + labelA) + '</div>' +
      '  <div class="labs-auth-cmp-col">' + renderAuthenticityGaugeHtml(authB, 'SPECIMEN B · ' + labelB) + '</div>' +
      '</div>' +
      '<div class="labs-chart-box-inner" style="margin:12px 0">' +
      '  <div class="labs-chart-box-head"><span>Side-by-Side Authenticity Telemetry</span><small>Blue: ' + esc(labelA) + ' · Rose: ' + esc(labelB) + ' · Tap rows to inspect</small></div>' +
      '  <canvas class="labs-2d-canvas" data-auth-chart="compare" style="height:220px"></canvas>' +
      '  <div class="labs-chart-live-bar labs-auth-live-bar">Select any row above to compare specimen A vs specimen B telemetry.</div>' +
      '</div>' +
      renderCollapsibleStatsHtml(
        '<div class="labs-auth-breakdown">' + rowsHtml + '</div>',
        'Pure DSP indicators only · Informational laboratory telemetry (0% weight in Reproduction Fidelity)',
        (authA.breakdown || []).length,
        'Detailed Breakdown (7 Indicators + Overall)',
        'HEURISTIC ENGINE'
      )
    );
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
    var auth = computeAuthenticityAnalysis(sound);
    var displayGauges = gauges.slice();
    displayGauges.push(buildAuthenticitySummaryRow('s_authenticity', auth));
    var label = opts.label || sound.displayName || sound.name || 'Recording';
    var eyebrow = opts.eyebrow || 'FARTNALYSIS REPORT · ACOUSTIC ANALYSIS';
    var noteStr =
      Forensics && feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
        ? Forensics.hzToNoteName(feat.medianPitchHz)
        : 'Unvoiced Airband';
    var fieldVerdict = buildSingleFieldVerdict(sound, feat, bonus, ml, noteStr);
    var sciComment = pickScientistComment('bottomsworth', label + '|' + prof.durationLabel, 0);
    sciComment.label = 'Lead Laboratory Evaluation';
    var specWobbleQuote = buildSingle3DSpectrogramCommentary(feat);
    var rareDispatch = pickRareComment(label + '|' + prof.durationLabel + '|single');
    var archCmp = buildArchiveComparison(feat, bonus, opts.archiveSamples, label + '|' + prof.durationLabel);
    var shareVerdict = pickShareableVerdict(label + '|' + prof.durationLabel + '|' + ml.topClass.name);
    var singleBottomActionsHtml =
      '<button type="button" class="labs-btn labs-btn-purple labs-btn-sm labs-s-share">📤 Share / Email</button>' +
      '<button type="button" class="labs-btn-ghost labs-btn-sm labs-s-pdf">📄 PDF</button>';
    var chartMeta = buildFinalChartsMetadata(sound, feat, bonus, opts.archiveSamples);
    var hoverState = { c_spec: null, c_pitch: null, c_mod: null, c_env: null };
    var activeHotspots = {
      c_spec: chartMeta.c_spec.hotspots[0] ? chartMeta.c_spec.hotspots[0].id : null,
      c_pitch: chartMeta.c_pitch.hotspots[0] ? chartMeta.c_pitch.hotspots[0].id : null,
      c_mod: chartMeta.c_mod.hotspots[0] ? chartMeta.c_mod.hotspots[0].id : null,
      c_env: chartMeta.c_env.hotspots[0] ? chartMeta.c_env.hotspots[0].id : null
    };
    var activeRanges = {
      c_spec: chartMeta.c_spec.hotspots[0] ? [chartMeta.c_spec.hotspots[0].spanLo, chartMeta.c_spec.hotspots[0].spanHi] : null,
      c_pitch: chartMeta.c_pitch.hotspots[0] ? [chartMeta.c_pitch.hotspots[0].spanLo, chartMeta.c_pitch.hotspots[0].spanHi] : null,
      c_mod: chartMeta.c_mod.hotspots[0] ? [chartMeta.c_mod.hotspots[0].spanLo, chartMeta.c_mod.hotspots[0].spanHi] : null,
      c_env: chartMeta.c_env.hotspots[0] ? [chartMeta.c_env.hotspots[0].spanLo, chartMeta.c_env.hotspots[0].spanHi] : null
    };

    var uid = 'lfs_' + (++gaugeUid) + '_';
    var chan = uid + 'S';
    var spec = null;
    var activeDialId = null;
    var activeSlotEl = null;

    var compareBtnHtml = opts.onPrimaryAction
      ? '<button type="button" class="labs-btn labs-btn-emerald labs-btn-sm labs-single-primary">' + esc(opts.primaryLabel || '🔬 Comparative Acoustic Assessment') + '</button>'
      : '';

    var rowsHtml = renderMetricRowsHtml(displayGauges, { expandable: true });

    function renderChartStoryInner(desc, fallbackSciId) {
      if (!desc) return '';
      var sci = getScientistById(desc.scientistId || fallbackSciId || 'wobble');
      return (
        '<div class="labs-story-head">' +
        '  <span class="labs-eyebrow">' + esc(desc.obsLabel || 'LABORATORY OBSERVATION') + '</span>' +
        '  <span class="labs-chart-anomaly-tag">' + esc(desc.tag) + '</span>' +
        '</div>' +
        '<div class="labs-story-title">' + esc(desc.title) + '</div>' +
        '<p class="labs-story-narrative">' + esc(desc.story) + '</p>' +
        '<div class="labs-story-telemetry">' + esc(desc.telemetry) + '</div>' +
        '<div class="labs-chart-obs">' +
        '  <img src="' + esc(sci.img) + '" alt="' + esc(sci.shortName) + '" loading="lazy" />' +
        '  <span>"' + esc(desc.scientistQuote) + '" <em>— ' + esc(sci.shortName) + '</em></span>' +
        '</div>'
      );
    }

    function renderFinalChartCardHtml(key, titleText, subText) {
      var cm = chartMeta[key];
      var hsList = Array.isArray(cm.hotspots) ? cm.hotspots : [];
      var activeDesc = hsList[0] || cm.describeAtNorm(0.35);
      var hotspotButtonsHtml = hsList
        .map(function (hs, idx) {
          return (
            '<button type="button" class="labs-hotspot-pill' +
            (hs.id === activeHotspots[key] ? ' active' : '') +
            '" data-chart-key="' +
            esc(key) +
            '" data-hs-id="' +
            esc(hs.id) +
            '"><strong>' +
            (idx + 1) +
            '.</strong> ' +
            esc(hs.tag) +
            '</button>'
          );
        })
        .join('');
      var statsHtml = cm.drillStats
        .map(function (st) {
          return (
            '<div class="labs-fact-box"><span>' + esc(st.label) + '</span><strong>' + esc(st.value) + '</strong><small class="labs-fact-sub">' + esc(st.sub) + '</small></div>'
          );
        })
        .join('');

      return (
        '<div class="labs-chart-box-inner labs-chart-interactive" data-chart-card="' + esc(key) + '">' +
        '  <div class="labs-chart-box-head"><span>' + esc(titleText) + '</span><small>' + esc(subText) + '</small></div>' +
        '  <div class="labs-chart-meta-strip">' +
        '    <span class="labs-chart-pill">' + esc(cm.percentileLabel) + '</span>' +
        '    <span class="labs-chart-pill">' + esc(cm.ciLabel) + '</span>' +
        '    <span class="labs-chart-anomaly-tag">' + esc(cm.anomalyTag) + '</span>' +
        '  </div>' +
        '  <div class="labs-chart-hotspots">' + hotspotButtonsHtml + '</div>' +
        '  <canvas class="labs-2d-canvas" id="' + uid + key + '"></canvas>' +
        '  <div class="labs-chart-readout" id="' + uid + key + '_readout">' + esc(cm.defaultReadout) + '</div>' +
        '  <div class="labs-chart-card-actions">' +
        '    <button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-chart-view-details-btn" data-view-chart="' + esc(key) + '">🔍 Laboratory Notes</button>' +
        '    <button type="button" class="labs-btn-ghost labs-btn-sm labs-chart-drill-btn" data-drill="' + esc(key) + '" aria-expanded="false">🔬 Archive Comparison &amp; Archive Notes</button>' +
        '  </div>' +
        '  <div class="labs-chart-drilldown hidden" data-drill-slot="' + esc(key) + '">' +
        '    <div class="labs-single-facts-grid">' + statsHtml + '</div>' +
        '    <p class="labs-chart-drill-note">' + esc(cm.drillNote) + '</p>' +
        '  </div>' +
        '</div>'
      );
    }

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
      '      <button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-s-play">▶ Play Specimen</button>' +
      compareBtnHtml +
      '      <span class="labs-ass-badge">Analysis performed using ' + esc(INSTITUTE.aiAcronym + ' ' + INSTITUTE.aiVersion) + '</span>' +
      '    </div>' +
      '    <div class="labs-verdict-banner">' +
      '      <div class="labs-verdict-banner-head">' +
      '        <span class="labs-eyebrow">OFFICIAL FINDINGS · ACOUSTIC PROFILE SUMMARY</span>' +
      '        <span class="labs-verdict-grade">' + esc(Math.round(safeNum(feat.modRateHz, 0)) + ' Hz Modulation') + '</span>' +
      '      </div>' +
      '      <p class="labs-verdict-text">' + esc(fieldVerdict) + '</p>' +
      '    </div>' +
      renderScientistCommentHtml(sciComment.scientistId, sciComment.quote, sciComment.label) +
      renderRareCommentHtml(rareDispatch) +
      '  </section>' +
      '  <section class="labs-glass-card labs-spec-bay">' +
      '    <div class="labs-spec-bay-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">3D TIME-FREQUENCY TOPOLOGY</div>' +
      '        <h3 class="labs-section-title">' + esc(label) + '</h3>' +
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
      renderScientistCommentHtml('wobble', specWobbleQuote, '3D Spectrogram Telemetry Commentary') +
      '  </section>' +
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">TELEMETRY DOMAINS · LABORATORY FINDINGS</div>' +
      '        <h3 class="labs-section-title">Telemetry Diagnostics &amp; Interactive Plots</h3>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-blue">' + displayGauges.length + ' Metrics</span>' +
      '    </div>' +
      renderArchiveComparisonHtml(archCmp) +
      '    <div class="labs-hint-text">Select any telemetry card to inspect interactive charts; individual metric readouts stay collapsed inside until opened.</div>' +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '    <hr class="labs-analysis-divider" />' +
      '    <div class="labs-sub-disclosure labs-bottom-charts-disclosure">' +
      '      <button type="button" class="labs-sub-disclosure-btn" aria-expanded="false">' +
      '        <span>📈 Interactive Spectral &amp; Temporal Plots (4)</span>' +
      '        <span class="labs-disclosure-chev" aria-hidden="true">▸</span>' +
      '      </button>' +
      '      <div class="labs-sub-disclosure-body hidden">' +
      '        <div class="labs-single-charts-grid">' +
      renderFinalChartCardHtml('c_spec', 'Spectral Distribution Map (40-Band FFT)', 'Centroid ' + Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz') +
      renderFinalChartCardHtml('c_pitch', 'Primary Resonance Profile', '32-frame F0 tracker') +
      renderFinalChartCardHtml('c_mod', 'Airflow Modulation FFT (4–45 Hz)', 'Depth ' + (safeNum(feat.modDepth, 0) * 100).toFixed(0) + '%') +
      renderFinalChartCardHtml('c_env', 'Pressure Release Envelope', 'Attack / T50 / Decay') +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </section>' +
      renderReportSignatureHtml(label + '|' + prof.durationLabel + '|single') +
      renderShareableVerdictHtml(shareVerdict, label, archCmp.energyPct + 'th Energy Percentile', singleBottomActionsHtml) +
      '</div>';

    wireArchiveToggles(mountEl);
    wireSubDisclosures(mountEl);
    var bottomChartsBtn = mountEl.querySelector('.labs-bottom-charts-disclosure .labs-sub-disclosure-btn');
    if (bottomChartsBtn) {
      bottomChartsBtn.addEventListener('click', function () {
        if (this.getAttribute('aria-expanded') === 'true') {
          if (typeof root.requestAnimationFrame === 'function') {
            root.requestAnimationFrame(drawAllSingleCharts);
          } else {
            drawAllSingleCharts();
          }
        }
      });
    }

    function redrawExpandedSingle() {
      if (!activeDialId || !activeSlotEl) return;
      if (activeDialId === 's_authenticity') {
        var authCanvas = activeSlotEl.querySelector('canvas[data-auth-chart]');
        if (authCanvas) drawAuthenticityPlot(authCanvas, auth, null, null, null, typeof authCanvas._labsSelIdx === 'number' ? { selectedIdx: authCanvas._labsSelIdx } : null);
        return;
      }
      var canvases = activeSlotEl.querySelectorAll('canvas[data-schart]');
      for (var i = 0; i < canvases.length; i++) {
        drawSingleChartType(canvases[i], canvases[i].getAttribute('data-schart'), sound, feat, bonus, ml, canvases[i]._labsInterState);
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
      if (dialId === 's_authenticity') {
        closeSingleRow();
        var aItemEl = mountEl.querySelector('.labs-metric-item[data-item-id="s_authenticity"]');
        var aRowBtn = mountEl.querySelector('.labs-metric-row[data-row-id="s_authenticity"]');
        var aSlotEl = mountEl.querySelector('.labs-row-accordion[data-slot-id="s_authenticity"]');
        if (!aSlotEl) return;

        activeDialId = 's_authenticity';
        activeSlotEl = aSlotEl;
        if (aItemEl) aItemEl.classList.add('open');
        if (aRowBtn) aRowBtn.setAttribute('aria-expanded', 'true');
        aSlotEl.classList.remove('hidden');
        var sAuthSci = pickScientistComment(DIAL_SCIENTIST_MAP.s_authenticity || 'bottomsworth', label + '|sauth', 1);
        aSlotEl.innerHTML =
          renderAuthenticityAccordionHtml(auth) +
          '<div class="labs-acc-sci-slot">' +
          renderScientistCommentHtml(sAuthSci.scientistId, sAuthSci.quote, 'Authenticity Review') +
          '</div>';
        wireSubDisclosures(aSlotEl);
        wireAuthChartInteraction(aSlotEl, auth);

        var aCloseBtn = aSlotEl.querySelector('.labs-acc-close');
        if (aCloseBtn) aCloseBtn.addEventListener('click', closeSingleRow);

        if (typeof root.requestAnimationFrame === 'function') {
          root.requestAnimationFrame(function () {
            redrawExpandedSingle();
            if (aItemEl && typeof aItemEl.scrollIntoView === 'function') {
              try { aItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
            }
          });
        } else {
          redrawExpandedSingle();
        }
        return;
      }

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
            '  <div class="labs-chart-controls"></div>' +
            '  <div class="labs-chart-live-bar">Tap or drag the chart above to inspect live values.</div>' +
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

      var repSci = pickScientistComment(DIAL_SCIENTIST_MAP[rep.id] || 'wobble', label + '|' + rep.id, 1);
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
        renderCollapsibleStatsHtml(
          '<div class="labs-single-facts-grid">' + statsHtml + '</div>',
          rep.formula,
          (rep.stats || []).length,
          'Individual Telemetry Metrics & Equation',
          'EQUATION'
        ) +
        '<div class="labs-acc-sci-slot">' +
        renderScientistCommentHtml(repSci.scientistId, repSci.quote, 'Specialist Metric Observation') +
        '</div>';
      wireSubDisclosures(slotEl);

      var closeBtn = slotEl.querySelector('.labs-acc-close');
      if (closeBtn) closeBtn.addEventListener('click', closeSingleRow);
      bindSingleChartInteractions(slotEl, sound, feat, bonus, ml, Audio);

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

    function drawFinalPlotByKey(key) {
      var cvs = mountEl.querySelector('#' + uid + key);
      var iOpts = {
        hoverNorm: hoverState[key],
        archiveBases: chartMeta.bases,
        archiveSamples: opts.archiveSamples,
        hotspots: chartMeta[key] ? chartMeta[key].hotspots : null,
        activeHotspotId: activeHotspots[key],
        highlightRange: activeRanges[key]
      };
      if (key === 'c_spec') drawSpectrumPlot(cvs, feat, '#60A5FA', iOpts);
      else if (key === 'c_pitch') drawPitchContourPlot(cvs, feat, iOpts);
      else if (key === 'c_mod') drawModulationPlot(cvs, feat, iOpts);
      else if (key === 'c_env') drawEnvelopePlot(cvs, feat, iOpts);
    }

    function drawAllSingleCharts() {
      drawFinalPlotByKey('c_spec');
      drawFinalPlotByKey('c_pitch');
      drawFinalPlotByKey('c_mod');
      drawFinalPlotByKey('c_env');
      redrawExpandedSingle();
    }

    ['c_spec', 'c_pitch', 'c_mod', 'c_env'].forEach(function (chartKey) {
      var cvs = mountEl.querySelector('#' + uid + chartKey);
      var readEl = mountEl.querySelector('#' + uid + chartKey + '_readout');
      var cm = chartMeta[chartKey];
      if (!cvs || !cm) return;

      function updateNorm(ev) {
        var rect = cvs.getBoundingClientRect ? cvs.getBoundingClientRect() : null;
        if (!rect || rect.width <= 0) return;
        var norm = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
        hoverState[chartKey] = norm;
        activeHotspots[chartKey] = null;
        var desc = cm.describeAtNorm(norm);
        activeRanges[chartKey] = desc ? [desc.spanLo, desc.spanHi] : null;
        if (readEl) readEl.textContent = cm.sampleAtNorm(norm);
        var cardPills = mountEl.querySelectorAll('.labs-hotspot-pill[data-chart-key="' + chartKey + '"]');
        for (var pi2 = 0; pi2 < cardPills.length; pi2++) cardPills[pi2].classList.remove('active');
        drawFinalPlotByKey(chartKey);
      }

      if (typeof cvs.addEventListener === 'function') {
        cvs.addEventListener('pointerdown', updateNorm);
        cvs.addEventListener('pointermove', updateNorm);
        cvs.addEventListener('pointerleave', function () {
          hoverState[chartKey] = null;
          if (readEl) readEl.textContent = cm.defaultReadout;
          drawFinalPlotByKey(chartKey);
        });
      }
    });

    var hsPills = mountEl.querySelectorAll('.labs-hotspot-pill[data-chart-key][data-hs-id]');
    for (var hsi = 0; hsi < hsPills.length; hsi++) {
      hsPills[hsi].addEventListener('click', function () {
        var ck = this.getAttribute('data-chart-key');
        var hid = this.getAttribute('data-hs-id');
        var cm = chartMeta[ck];
        if (!cm || !Array.isArray(cm.hotspots)) return;
        var matched = null;
        for (var hi = 0; hi < cm.hotspots.length; hi++) {
          if (cm.hotspots[hi].id === hid) { matched = cm.hotspots[hi]; break; }
        }
        if (!matched) return;
        activeHotspots[ck] = hid;
        activeRanges[ck] = [matched.spanLo, matched.spanHi];
        hoverState[ck] = matched.norm;
        var siblings = mountEl.querySelectorAll('.labs-hotspot-pill[data-chart-key="' + ck + '"]');
        for (var si = 0; si < siblings.length; si++) {
          siblings[si].classList.toggle('active', siblings[si].getAttribute('data-hs-id') === hid);
        }
        var readEl = mountEl.querySelector('#' + uid + ck + '_readout');
        if (readEl) readEl.textContent = cm.sampleAtNorm(matched.norm);
        drawFinalPlotByKey(ck);
      });
    }

    var viewDetailsBtns = mountEl.querySelectorAll('.labs-chart-view-details-btn[data-view-chart]');
    for (var vdi = 0; vdi < viewDetailsBtns.length; vdi++) {
      viewDetailsBtns[vdi].addEventListener('click', function () {
        var ck = this.getAttribute('data-view-chart');
        if (!chartMeta[ck]) return;
        openChartInvestigationModal({
          chartKey: ck,
          label: label,
          feat: feat,
          bases: chartMeta.bases,
          meta: chartMeta[ck],
          initialHotspotId: activeHotspots[ck],
          initialNorm: hoverState[ck]
        });
      });
    }

    var drillBtns = mountEl.querySelectorAll('.labs-chart-drill-btn');
    for (var dbi = 0; dbi < drillBtns.length; dbi++) {
      drillBtns[dbi].addEventListener('click', function () {
        var dk = this.getAttribute('data-drill');
        var slot = mountEl.querySelector('.labs-chart-drilldown[data-drill-slot="' + dk + '"]');
        if (!slot) return;
        var isOpen = !slot.classList.contains('hidden');
        slot.classList.toggle('hidden', isOpen);
        this.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        this.textContent = isOpen
          ? '🔬 Archive Comparison & Archive Notes'
          : '✕ Hide Drill-Down';
      });
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
        if (opts.onShareOrEmail) opts.onShareOrEmail(sound, [specCanvas]);
        else if (opts.onShare) opts.onShare(sound, [specCanvas]);
        else if (opts.onEmailAnalysis) opts.onEmailAnalysis(sound, [specCanvas]);
      });
    }
    var pdfBtn = mountEl.querySelector('.labs-s-pdf');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', function () {
        if (opts.onDownloadPdf) opts.onDownloadPdf(sound, [specCanvas]);
      });
    }
    var singleTeamBtn = mountEl.querySelector('.labs-fn-meet-team');
    if (singleTeamBtn && opts.onOpenTeam) {
      singleTeamBtn.addEventListener('click', opts.onOpenTeam);
    }
    var singleCopyVerdictBtn = mountEl.querySelector('.labs-copy-verdict-btn');
    if (singleCopyVerdictBtn) {
      singleCopyVerdictBtn.addEventListener('click', function () {
        var txt = this.getAttribute('data-verdict-copy') || shareVerdict;
        if (opts.onCopyVerdict) opts.onCopyVerdict(txt);
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
        title: 'Barometric Front Coherence',
        score: cohScore,
        sub: (m.count || 0) + ' archive specimens',
        quip: cohScore >= 70 ? 'Unusually disciplined spectral consistency across independent acoustic emissions.' : 'Marked spectral divergence spanning tranquil airflow and turbulent pressure fronts.'
      },
      {
        id: 'g_span',
        title: 'Primary Resonance Span',
        score: spanScore,
        sub: safeNum(m.pitchSpanOctaves, 0).toFixed(2) + ' octaves span',
        quip: 'Spans ' + safeNum(m.pitchSpanOctaves, 0).toFixed(2) + ' octaves around a ' + Math.round(safeNum(m.meanPitchHz, 140)) + ' Hz mean centroid.'
      },
      {
        id: 'g_turb',
        title: 'Ensemble Oscillation Rate',
        score: turbScore,
        sub: Math.round(safeNum(feat.modRateHz, 0)) + ' Hz (' + bpmGroup + ' cyc/m)',
        quip: bpmGroup >= 900 ? 'Sustained high-rate valve modulation across the composite sequence.' : 'Measured low-frequency resonant chamber modulation.'
      },
      {
        id: 'g_wet',
        title: 'Aggregate Hydro-Acoustic Turbulence',
        score: wetPct,
        sub: 'Combined Turbulence Index',
        quip: wetPct >= 62 ? 'Elevated cumulative spectral flux across multiple constituent emissions.' : 'Consistent dry laminar release maintained across the sequence.'
      },
      {
        id: 'g_blast',
        title: 'Composite Propagation Radius',
        score: blastScore,
        sub: blastRad.toFixed(1) + 'm effective perimeter',
        quip: blastRad >= 10 ? 'Extended open-chamber audibility across a ' + blastRad.toFixed(1) + 'm acoustic perimeter.' : 'Contained within a standard enclosed acoustic test chamber.'
      },
      {
        id: 'g_dyn',
        title: 'Composite Transient Crest',
        score: dynScore,
        sub: safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB peak ratio',
        quip: safeNum(feat.crestFactorDb, 0) >= 11 ? 'High-contrast pressure transients punctuate the composite sequence.' : 'Balanced 44.1 kHz studio dynamic range throughout.'
      }
    ];

    return raw.map(function (g) {
      var st = gaugeStatus(g.score);
      return Object.assign({}, g, { status: st.label, color: st.color, tone: st.tone });
    });
  }

  function formatSegSortTag(seg, sortBy) {
    if (sortBy === 'wetness') return Math.round(safeNum(seg.wetnessPct, 0)) + '% turb';
    if (sortBy === 'duration') return Math.round(safeNum(seg.pitchHz, 0)) + ' Hz';
    if (sortBy === 'crest') return safeNum(seg.crestDb, 0).toFixed(1) + ' dB';
    if (sortBy === 'radius') return safeNum(seg.radiusM, 0).toFixed(1) + 'm radius';
    if (sortBy === 'flutter') return Math.round(safeNum(seg.modRateHz, 0)) + ' Hz mod';
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

  function drawConstellationPlot(canvas, groupObj, selectedIdx) {
    var p = setupDarkPlot(canvas, 200);
    if (!p || !groupObj || !groupObj.segments) return;
    var ctx = p.ctx, w = p.w, h = p.h;
    var pad = { l: 38, r: 16, t: 18, b: 26 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;
    var segs = groupObj.segments;
    var logMin = Math.log2(45);
    var logMax = Math.log2(1600);
    var sel = typeof selectedIdx === 'number' ? selectedIdx : -1;

    for (var i = 0; i < segs.length; i++) {
      var sg = segs[i];
      var lx = clamp((Math.log2(clamp(sg.pitchHz || 140, 45, 1600)) - logMin) / (logMax - logMin), 0, 1);
      var ly = clamp((sg.wetnessPct || 25) / 100, 0, 1);
      var cx = pad.l + lx * pw;
      var cy = pad.t + ph - ly * ph;

      if (i === sel) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = sg.color;
      ctx.beginPath();
      ctx.arc(cx, cy, i === sel ? 8.5 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = i === sel ? '#38BDF8' : '#FFFFFF';
      ctx.lineWidth = i === sel ? 2.2 : 1.4;
      ctx.stroke();

      ctx.fillStyle = i === sel ? '#F8FAFC' : '#E5E7EB';
      ctx.font = (i === sel ? '700 ' : '600 ') + '10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = cx > w * 0.72 ? 'right' : 'left';
      ctx.fillText(sg.name.slice(0, 16), cx + (cx > w * 0.72 ? -10 : 10), cy + 3);
    }

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('45Hz', pad.l, h - 7);
    ctx.fillText('100% Turb', 4, pad.t + 8);
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
    var authGrp = computeAuthenticityAnalysis({ features: g.features, samples: g.samples, sampleRate: g.sampleRate });
    var authGrpRow = buildAuthenticitySummaryRow('g_authenticity', authGrp);
    var uid = 'lfg_' + (++gaugeUid) + '_';
    var chan = uid + 'MIX';
    var spec = null;
    var lastProg = null;
    var authGrpOpen = false;
    var authGrpSlotEl = null;

    var sortBy = opts.sortBy || (g.metrics && g.metrics.sortBy) || 'pitch';
    var sortDir = opts.sortDir || (g.metrics && g.metrics.sortDir) || 'asc';
    var sortOptions = (root.TootLabs.Store && root.TootLabs.Store.GROUP_SORT_OPTIONS) || [
      { key: 'pitch', label: 'Primary Resonance (Hz)', unit: 'Hz' },
      { key: 'wetness', label: 'Turbulence Index (%)', unit: '%' },
      { key: 'duration', label: 'Emission Lifetime (s)', unit: 's' },
      { key: 'crest', label: 'Acoustic Energy / Crest (dB)', unit: 'dB' },
      { key: 'radius', label: 'Propagation Radius (m)', unit: 'm' },
      { key: 'flutter', label: 'Modulation Rate (Hz)', unit: 'Hz' },
      { key: 'date', label: 'Date Archived', unit: '' }
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
    var rowsHtml = renderMetricRowsHtml(gauges, { expandable: false }) + renderMetricRowsHtml([authGrpRow], { expandable: true });
    var grpComment = pickScientistComment('bottomsworth', g.name + '|' + sortLabel, 1);
    grpComment.label = 'Conductor Acoustic Review';
    var specWobbleQuote = buildGroup3DSpectrogramCommentary(g);
    var rareDispatch = pickRareComment(g.name + '|' + sortLabel + '|group');
    var archCmp = buildArchiveComparison(g.features, null, opts.archiveSamples || null, g.name + '|grp');
    var shareVerdict = pickShareableVerdict(g.name + '|' + sortLabel + '|megamix');
    var groupBottomActionsHtml =
      '<button type="button" class="labs-btn labs-btn-purple labs-btn-sm labs-g-share">📤 Share / Email</button>' +
      '<button type="button" class="labs-btn-ghost labs-btn-sm labs-g-pdf">📄 PDF</button>';

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">INSTITUTE REPORT · MULTI-SPECIMEN SYNTHESIS</div>' +
      '        <h2 class="labs-fn-title">' + esc(g.name) + '</h2>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-green">' + g.metrics.totalDurationSec.toFixed(2) + 's Total</span>' +
      '    </div>' +
      '    <div class="labs-fn-single-actions">' +
      '      <button type="button" class="labs-btn labs-btn-emerald labs-btn-sm labs-g-play">▶ Play Combined Track</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-g-stop">⏹ Stop</button>' +
      '      <span class="labs-ass-badge">Analysis performed using ' + esc(INSTITUTE.aiAcronym + ' ' + INSTITUTE.aiVersion) + '</span>' +
      '    </div>' +
      '    <div class="labs-sort-bar">' +
      '      <label class="labs-sort-field" for="' + uid + 'sortby">' +
      '        <span>Order Specimens By</span>' +
      '        <select id="' + uid + 'sortby" class="labs-g-sort-by">' + sortOptionsHtml + '</select>' +
      '      </label>' +
      '      <div class="labs-dir-group" role="group" aria-label="Sort Direction">' +
      '        <button type="button" class="labs-dir-btn' + (sortDir !== 'desc' ? ' active' : '') + '" data-gdir="asc">↑ Ascending</button>' +
      '        <button type="button" class="labs-dir-btn' + (sortDir === 'desc' ? ' active' : '') + '" data-gdir="desc">↓ Descending</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="labs-verdict-banner">' +
      '      <div class="labs-verdict-banner-head">' +
      '        <span class="labs-eyebrow">OFFICIAL FINDINGS · ENSEMBLE CONDUCTOR ASSESSMENT</span>' +
      '        <span class="labs-verdict-grade">Archive Mastered · 44.1 kHz</span>' +
      '      </div>' +
      '      <p class="labs-verdict-text">' + esc(g.metrics.groupVerdict) + '</p>' +
      '    </div>' +
      renderScientistCommentHtml(grpComment.scientistId, grpComment.quote, grpComment.label) +
      renderRareCommentHtml(rareDispatch) +
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
      renderScientistCommentHtml('wobble', specWobbleQuote, '3D Ensemble Topology Commentary') +
      '    <div class="labs-group-wave-wrap">' +
      '      <div class="labs-chart-box-head"><span>Composite Acoustic Profile Waveform</span><small>Tap waveform to seek &amp; audition sequence</small></div>' +
      '      <canvas class="labs-2d-canvas" id="' + uid + 'c_wave" style="height:130px"></canvas>' +
      '      <div class="labs-chart-live-bar" id="' + uid + 'c_wave_live">Tap anywhere on waveform to seek to that specimen.</div>' +
      '    </div>' +
      '  </section>' +
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">TELEMETRY DOMAINS · COMPOSITE ANALYSIS</div>' +
      '        <h3 class="labs-section-title">Ensemble Telemetry &amp; Specimen Order</h3>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-blue">' + esc(sortLabel) + '</span>' +
      '    </div>' +
      '    <div class="labs-seg-pills-row">' + trackListHtml + '</div>' +
      renderArchiveComparisonHtml(archCmp) +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '    <hr class="labs-analysis-divider" />' +
      '    <div class="labs-sub-disclosure labs-bottom-charts-disclosure">' +
      '      <button type="button" class="labs-sub-disclosure-btn" aria-expanded="false">' +
      '        <span>📈 Interactive Ensemble Plots (2)</span>' +
      '        <span class="labs-disclosure-chev" aria-hidden="true">▸</span>' +
      '      </button>' +
      '      <div class="labs-sub-disclosure-body hidden">' +
      '        <div class="labs-single-charts-grid">' +
      '          <div class="labs-chart-box-inner">' +
      '            <div class="labs-chart-box-head"><span>Archive Specimen Constellation (Pitch × Turbulence)</span><small>Tap node to inspect specimen</small></div>' +
      '            <canvas class="labs-2d-canvas" id="' + uid + 'c_map"></canvas>' +
      '            <div class="labs-chart-live-bar" id="' + uid + 'c_map_live">Select any constellation node to inspect specimen telemetry.</div>' +
      '          </div>' +
      '          <div class="labs-chart-box-inner">' +
      '            <div class="labs-chart-box-head"><span>Spectral Distribution Map (Combined 40-Band FFT)</span><small>Tap band to inspect energy</small></div>' +
      '            <canvas class="labs-2d-canvas" id="' + uid + 'c_spec"></canvas>' +
      '            <div class="labs-chart-live-bar" id="' + uid + 'c_spec_live">Tap or drag across spectrum bars to inspect frequency energy.</div>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </section>' +
      renderReportSignatureHtml(g.name + '|' + sortLabel + '|group') +
      renderShareableVerdictHtml(shareVerdict, g.name, (g.segments || []).length + ' Archive Specimens', groupBottomActionsHtml) +
      '</div>';

    wireArchiveToggles(mountEl);
    wireSubDisclosures(mountEl);
    var grpBottomChartsBtn = mountEl.querySelector('.labs-bottom-charts-disclosure .labs-sub-disclosure-btn');
    if (grpBottomChartsBtn) {
      grpBottomChartsBtn.addEventListener('click', function () {
        if (this.getAttribute('aria-expanded') === 'true') {
          if (typeof root.requestAnimationFrame === 'function') {
            root.requestAnimationFrame(drawGroupVisuals);
          } else {
            drawGroupVisuals();
          }
        }
      });
    }

    var grpMapSelIdx = null;
    var grpSpecHover = null;

    function drawGroupVisuals() {
      drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, lastProg);
      drawConstellationPlot(mountEl.querySelector('#' + uid + 'c_map'), g, grpMapSelIdx);
      drawSpectrumPlot(mountEl.querySelector('#' + uid + 'c_spec'), g.features, '#22C55E', grpSpecHover != null ? { hoverNorm: grpSpecHover } : null);
      if (authGrpOpen && authGrpSlotEl) {
        var ac = authGrpSlotEl.querySelector('canvas[data-auth-chart]');
        if (ac) drawAuthenticityPlot(ac, authGrp, null, null, null, typeof ac._labsSelIdx === 'number' ? { selectedIdx: ac._labsSelIdx } : null);
      }
    }

    function closeGroupAuthRow() {
      authGrpOpen = false;
      authGrpSlotEl = null;
      var itemEl = mountEl.querySelector('.labs-metric-item[data-item-id="g_authenticity"]');
      var rowBtn = mountEl.querySelector('.labs-metric-row[data-row-id="g_authenticity"]');
      var slotEl = mountEl.querySelector('.labs-row-accordion[data-slot-id="g_authenticity"]');
      if (itemEl) itemEl.classList.remove('open');
      if (rowBtn) rowBtn.setAttribute('aria-expanded', 'false');
      if (slotEl) {
        slotEl.classList.add('hidden');
        slotEl.innerHTML = '';
      }
    }

    var gAuthBtn = mountEl.querySelector('.labs-metric-row[data-row-id="g_authenticity"]');
    if (gAuthBtn) {
      gAuthBtn.addEventListener('click', function () {
        if (authGrpOpen) {
          closeGroupAuthRow();
          return;
        }
        var itemEl = mountEl.querySelector('.labs-metric-item[data-item-id="g_authenticity"]');
        var slotEl = mountEl.querySelector('.labs-row-accordion[data-slot-id="g_authenticity"]');
        if (!slotEl) return;
        authGrpOpen = true;
        authGrpSlotEl = slotEl;
        if (itemEl) itemEl.classList.add('open');
        gAuthBtn.setAttribute('aria-expanded', 'true');
        slotEl.classList.remove('hidden');
        slotEl.innerHTML = renderAuthenticityAccordionHtml(
          authGrp,
          'Heuristic origin evaluation computed across the combined multi-specimen composite track and movement spectrum (informational only).'
        );
        wireSubDisclosures(slotEl);
        wireAuthChartInteraction(slotEl, authGrp);
        var closeBtn = slotEl.querySelector('.labs-acc-close');
        if (closeBtn) closeBtn.addEventListener('click', closeGroupAuthRow);
        if (typeof root.requestAnimationFrame === 'function') {
          root.requestAnimationFrame(drawGroupVisuals);
        } else {
          drawGroupVisuals();
        }
      });
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
    var stopBtn = mountEl.querySelector('.labs-g-stop');
    var isPlaying = false;
    var pausedAtSec = 0;

    function syncPlayBtn() {
      if (!playBtn) return;
      playBtn.classList.toggle('is-playing', isPlaying);
      if (isPlaying) {
        playBtn.textContent = '⏸ Pause Track';
        playBtn.setAttribute('aria-pressed', 'true');
      } else if (pausedAtSec > 0.02 && pausedAtSec < g.totalDur - 0.02) {
        playBtn.textContent = '▶ Resume Track';
        playBtn.setAttribute('aria-pressed', 'false');
      } else {
        playBtn.textContent = '▶ Play Combined Track';
        playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    if (playBtn) {
      syncPlayBtn();
      playBtn.addEventListener('click', function () {
        if (isPlaying) {
          var prNow = lastProg != null ? Math.max(0, Math.min(1, lastProg)) : 0;
          pausedAtSec = prNow * g.totalDur;
          isPlaying = false;
          Audio.stopChannel(chan);
          drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, prNow);
          if (spec) spec.setPlayhead(prNow);
          syncPlayBtn();
          return;
        }
        if (pausedAtSec >= g.totalDur - 0.05) pausedAtSec = 0;
        isPlaying = true;
        syncPlayBtn();
        var playP = Audio.playSound(g.samples, g.sampleRate, {
          channel: chan,
          offsetSec: pausedAtSec,
          onProgress: function (pr) {
            lastProg = pr;
            drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, pr);
            if (spec) spec.setPlayhead(pr);
          },
          onEnded: function (stoppedManually) {
            if (stoppedManually) return;
            isPlaying = false;
            pausedAtSec = 0;
            lastProg = null;
            drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, null);
            if (spec) spec.setPlayhead(null);
            syncPlayBtn();
          }
        });
        if (playP && typeof playP.catch === 'function') {
          playP.catch(function () {
            isPlaying = false;
            syncPlayBtn();
          });
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', function () {
        isPlaying = false;
        pausedAtSec = 0;
        lastProg = null;
        Audio.stopAll();
        drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, null);
        if (spec) spec.setPlayhead(null);
        syncPlayBtn();
      });
    }

    var grpWaveCanvas = mountEl.querySelector('#' + uid + 'c_wave');
    var grpWaveLive = mountEl.querySelector('#' + uid + 'c_wave_live');
    if (grpWaveCanvas) {
      bindPointerScrub(grpWaveCanvas, function (nx) {
        var seekSec = nx * g.totalDur;
        lastProg = nx;
        pausedAtSec = seekSec;
        drawSegmentedWaveform(grpWaveCanvas, g, nx);
        if (spec) spec.setPlayhead(nx);
        var segs = g.segments || [];
        var hitSeg = null;
        for (var si = 0; si < segs.length; si++) {
          if (seekSec >= segs[si].startSec && seekSec <= segs[si].endSec) { hitSeg = segs[si]; break; }
        }
        if (grpWaveLive) {
          grpWaveLive.textContent = hitSeg
            ? 'Seeked to ' + seekSec.toFixed(2) + 's — Specimen: ' + hitSeg.name + ' (' + Math.round(hitSeg.pitchHz) + ' Hz)'
            : 'Seeked to ' + seekSec.toFixed(2) + 's / ' + g.totalDur.toFixed(2) + 's';
        }
      }, { hoverMove: false });
    }

    var grpMapCanvas = mountEl.querySelector('#' + uid + 'c_map');
    var grpMapLive = mountEl.querySelector('#' + uid + 'c_map_live');
    if (grpMapCanvas && (g.segments || []).length > 0) {
      bindPointerScrub(grpMapCanvas, function (nx, ny, w, h) {
        var pad = { l: 38, r: 16, t: 18, b: 26 };
        var pw = w - pad.l - pad.r;
        var ph = h - pad.t - pad.b;
        var px = nx * w, py = ny * h;
        var segs = g.segments || [];
        var logMin = Math.log2(45), logMax = Math.log2(1600);
        var bestI = 0, bestD = Infinity;
        for (var si = 0; si < segs.length; si++) {
          var sg = segs[si];
          var sx = pad.l + clamp((Math.log2(clamp(sg.pitchHz || 140, 45, 1600)) - logMin) / (logMax - logMin), 0, 1) * pw;
          var sy = pad.t + ph - clamp((sg.wetnessPct || 25) / 100, 0, 1) * ph;
          var dd = Math.hypot(px - sx, py - sy);
          if (dd < bestD) { bestD = dd; bestI = si; }
        }
        grpMapSelIdx = bestI;
        drawConstellationPlot(grpMapCanvas, g, bestI);
        var selSg = segs[bestI];
        if (grpMapLive && selSg) {
          grpMapLive.textContent = '#' + (bestI + 1) + ' ' + selSg.name + ': ' + Math.round(selSg.pitchHz || 0) + ' Hz · ' + selSg.durationSec.toFixed(2) + 's · Turbulence ' + Math.round(selSg.wetnessPct || 0) + '%';
        }
      }, { hoverMove: false });
    }

    var grpSpecCanvas = mountEl.querySelector('#' + uid + 'c_spec');
    var grpSpecLive = mountEl.querySelector('#' + uid + 'c_spec_live');
    if (grpSpecCanvas && g.features) {
      bindPointerScrub(grpSpecCanvas, function (nx) {
        grpSpecHover = nx;
        drawSpectrumPlot(grpSpecCanvas, g.features, '#22C55E', { hoverNorm: nx });
        var hz = Math.round(45 * Math.pow(4200 / 45, nx));
        var bins = g.features.avgSpectrum || [];
        var bIdx = clamp(Math.round(nx * Math.max(0, bins.length - 1)), 0, Math.max(0, bins.length - 1));
        if (grpSpecLive) {
          grpSpecLive.textContent = 'Ensemble Frequency: ' + hz + ' Hz · Mean Normalized Energy: ' + Math.round(safeNum(bins[bIdx], 0) * 100) + '%';
        }
      }, { hoverMove: true });
    }

    var shareGrpBtn = mountEl.querySelector('.labs-g-share');
    if (shareGrpBtn) {
      shareGrpBtn.addEventListener('click', function () {
        if (opts.onShareOrEmail) opts.onShareOrEmail(g, [specCanvas]);
        else if (opts.onShare) opts.onShare(g, [specCanvas]);
        else if (opts.onEmailAnalysis) opts.onEmailAnalysis(g, [specCanvas]);
      });
    }
    var pdfBtn = mountEl.querySelector('.labs-g-pdf');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', function () {
        if (opts.onDownloadPdf) opts.onDownloadPdf(g, [specCanvas]);
      });
    }
    var grpTeamBtn = mountEl.querySelector('.labs-fn-meet-team');
    if (grpTeamBtn && opts.onOpenTeam) {
      grpTeamBtn.addEventListener('click', opts.onOpenTeam);
    }
    var grpCopyVerdictBtn = mountEl.querySelector('.labs-copy-verdict-btn');
    if (grpCopyVerdictBtn) {
      grpCopyVerdictBtn.addEventListener('click', function () {
        var txt = this.getAttribute('data-verdict-copy') || shareVerdict;
        if (opts.onCopyVerdict) opts.onCopyVerdict(txt);
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
        isPlaying = false;
        pausedAtSec = 0;
        if (Audio && typeof Audio.stopChannel === 'function') Audio.stopChannel(chan);
        if (spec) spec.destroy();
        spec = null;
        if (mountEl) mountEl.innerHTML = '';
      }
    };
  }

  TootLabs.Fartnalysis = {
    INSTITUTE: INSTITUTE,
    TEAM: TEAM,
    RESEARCH_FOOTNOTES: RESEARCH_FOOTNOTES,
    SCIENTIST_COMMENTS: SCIENTIST_COMMENTS,
    SCIENTIST_COMMENT_POOLS: SCIENTIST_COMMENT_POOLS,
    RARE_COMMENTS: RARE_COMMENTS,
    SHAREABLE_VERDICTS: SHAREABLE_VERDICTS,
    pickScientistComment: pickScientistComment,
    pickRareComment: pickRareComment,
    pickShareableVerdict: pickShareableVerdict,
    buildArchiveComparison: buildArchiveComparison,
    buildSingle3DSpectrogramCommentary: buildSingle3DSpectrogramCommentary,
    buildComparison3DSpectrogramCommentary: buildComparison3DSpectrogramCommentary,
    buildGroup3DSpectrogramCommentary: buildGroup3DSpectrogramCommentary,
    buildFinalChartsMetadata: buildFinalChartsMetadata,
    openChartInvestigationModal: openChartInvestigationModal,
    gaugeStatus: gaugeStatus,
    classifyAcousticProfile: classifyAcousticProfile,
    classifyAuthenticityScore: classifyAuthenticityScore,
    computeAuthenticityAnalysis: computeAuthenticityAnalysis,
    drawAuthenticityPlot: drawAuthenticityPlot,
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
