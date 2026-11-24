(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var gaugeUid = 0;

  var INSTITUTE = {
    name: 'TOOT MATCH LABS',
    subtitle: 'Institute of Acoustic Flatulence Research',
    tagline: 'Advancing The Science Of Gastrointestinal Acoustics Since 2026',
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
      bio: 'Dr. Turbulence specializes in pressure release events and airflow behaviour. Many of the laboratory\'s turbulence and thunder quotient models were developed under her leadership.',
      specialities: ['Pressure Mapping', 'Turbulence Analysis', 'Flow Dynamics']
    },
    {
      id: 'wobble',
      name: 'Dr. Penelope Wobble',
      shortName: 'Dr. Wobble',
      title: 'Senior Spectrogram Scientist',
      img: 'img/team/wobble.png',
      initials: 'PW',
      bio: 'Dr. Wobble is responsible for much of the laboratory\'s frequency and resonance research. Her work focuses on identifying unique harmonic signatures.',
      specialities: ['Spectrogram Analysis', 'Frequency Mapping', 'Resonance Studies']
    },
    {
      id: 'flatley',
      name: 'Dr. Miles Flatley',
      shortName: 'Dr. Flatley',
      title: 'Director of Computational Acoustics',
      img: 'img/team/flatley.png',
      initials: 'MF',
      bio: 'Dr. Flatley leads development of comparison algorithms and machine learning systems. His models analyze thousands of acoustic events each year.',
      specialities: ['Machine Learning', 'Similarity Analysis', 'Pattern Recognition']
    },
    {
      id: 'pufferton',
      name: 'Dr. Winston Pufferton',
      shortName: 'Dr. Pufferton',
      title: 'Chief Archive Curator',
      img: 'img/team/pufferton.png',
      initials: 'WP',
      bio: 'Dr. Pufferton maintains the Institute Archive and oversees preservation of historically significant recordings.',
      specialities: ['Classification', 'Data Archiving', 'Research Preservation']
    }
  ];

  var RESEARCH_FOOTNOTES = [
    'Findings validated three times; nobody volunteered for a fourth listening session.',
    'No leather office chairs were falsely accused during the preparation of this report.',
    'Confidence intervals widen noticeably whenever someone in the room insists it was their shoe.',
    'All microphones were sanitized acoustically and spiritually following specimen capture.',
    'Additional grant funding has been denied by the Ethics Committee for the fourth consecutive quarter.',
    'Coffee consumption spiked 340% during spectral classification.',
    'Blaming the family dog remains statistically unsupported by our harmonic telemetry.',
    'Elevator occupancy risk estimates assume poor ventilation and zero eye contact.',
    'Peer review remains heated; two fellows are no longer speaking over whether that sounded like sleet or gumbo mud.',
    'Archive comparison yielded results our interns are still trying to process.',
    'Recorded strictly in the interest of gastrointestinal truth, not personal pride.',
    'National Weather Service Doppler radar in Seattle briefly flagged our test booth as an isolated microburst.',
    'Boots used for wet-mud reference calibration remain missing somewhere behind Building C.',
    'Emotional Mood Classifier readings ("Zen vs. Hostile") carry a ±12% tolerance after spicy lunches.'
  ];

  var SCIENTIST_COMMENT_POOLS = {
    bottomsworth: [
      'A remarkably self-assured turbulence profile. I have given it a standing ovation from my desk.',
      'I have devoted thirty years to barometric and bio-acoustic physics, and frankly this specimen just rewrote Chapter Four.',
      'Do not apologize for this recording. Frame the spectrogram and hang it next to the barometer.',
      'The low-pressure surge here reminds me of a November squall rolling unexpectedly off Puget Sound.',
      'Between weather-front rumble and pure attitude, this specimen scored off the charts for sheer dramatic timing.',
      'An astonishing display of aerodynamic commitment. My monocle fogged up twice.',
      'This profile warrants urgent Senate testimony, or at least a very serious apology to the couch cushions.',
      'Technically illegal in three cramped elevators, yet acoustically a triumph of human determination.',
      'The mood telemetry reads strangely aggressive — like a territorial badger defending the living-room recliner.',
      'Yet when played at half volume, the tail decay becomes surprisingly serene, almost like a porch screen door relaxing shut.',
      'The laboratory remains cautiously optimistic, though everyone has cracked a window just in case.'
    ],
    turbulence: [
      'Pressure release dynamics hit like a microburst slamming into a tin carport roof.',
      'That transient attack velocity struck the microphone like a sudden hailstorm with zero weather advisory.',
      'Textbook turbulent vortex shedding — the kind usually clocked behind coastal gale fronts or swamp airboats.',
      'Strong airflow organization detected. Whatever structural valve held that back deserves a congressional medal.',
      'Moisture flux telemetry resembles pulling a drenched rubber wellington boot out of ankle-deep bog mud.',
      'Peak pressure sustained for far longer than polite society or local barometers generally budget for.',
      'Started like a lazy Sunday hammock breeze, then panicked halfway through into an aggressive diesel backfire.',
      'Aerodynamically restless: high-frequency gusts colliding straight into thick marshmallow mud resistance.',
      'My pressure rig mistook the onset for a tire blowing out on gravel at forty miles per hour.',
      'Smooth laminar onset followed by chaotic swamp-bubble flutter — nature truly refuses to compromise.'
    ],
    wobble: [
      'The resonance trajectory bends like a storm front hitting a mountain ridge — thrillingly unstable.',
      'Several low-frequency ridges stacked up like cumulonimbus thunderheads on July radar.',
      'I zoomed in on the spectrogram for twenty minutes and forgot to eat lunch.',
      'The emotional curve shifted from calm Zen afternoon sigh straight into hostile lawnmower territory in 0.4 seconds.',
      'A dazzling tremor in the 14 Hz register — sounds like a wet flip-flop slapping dock planks in a stiff crosswind.',
      'That pitch sweep bends upward like a rhetorical question even the producer did not see coming.',
      'Strange thermal shimmer at the tail end, reminiscent of steam whistling sideways out of a radiator valve.',
      'At high magnification the surface ripples look less like air and more like thick pancake batter bubbling on a griddle.',
      'Unusually serene mid-band glide — surprisingly soothing if you ignore the blast radius.',
      'Cleanly etched contour lines; Dr. Flatley tried to print them on a weather map.'
    ],
    flatley: [
      'My neural clustering model looked at this waveform, paused for three seconds, and checked the Doppler radar.',
      'The similarity algorithms are unusually excited, which is the closest our software gets to smiling.',
      'This recording sits four standard deviations from normal human politeness — right where my dataset loves it.',
      'Even after running 10,000 Monte Carlo simulations, the computer still mutters "check the weather forecast" under its breath.',
      'Mood telemetry flagged this clip as "Passive-Aggressive Thunder" with 94% statistical confidence.',
      'Statistically speaking, this sample occupies the wild database shelf somewhere between "Flood Warning" and "Stuck Tire in Mud."',
      'Computational confidence just hit 99%. Either this is peak acoustic chaos or the laptop needs fresh air.',
      'The classifier initially filed this under "Small Outboard Engine Cold-Starting in November Mist" before correcting itself.',
      'Zero predictability in the tail sputter — pure wild Markov-chain mayhem from millisecond one.',
      'The algorithm cannot stop replaying the peak transient. Frankly, I need to revoke its headphone privileges.'
    ],
    pufferton: [
      'The Vault has stored four thousand specimens, and none arrived with quite this much diplomatic immunity.',
      'I am filing this under "Historical Treasures Not Suitable For Thanksgiving Dinner."',
      'Cataloged between a coastal foghorn log and "Tractor Tire Escaping a Muddy Rut." Truly rare company.',
      'Handle with cotton gloves: future meteorologists and anthropologists alike will argue over what caused this.',
      'Feels uncannily serene for the first half-second before turning violently chaotic — museum-grade mood whiplash.',
      'I nearly dropped my clipboard indexing this one. Pure Hall-of-Fame wilderness acoustics.',
      'If this specimen were weather, school buses would be delayed two hours purely out of caution.',
      'Stored in Vault Drawer 19B alongside an angry goose recording and a suspiciously damp hiking boot.',
      'Remarkably well-preserved waveform edges — like amber, if amber could clear a waiting room.',
      'A priceless addition to the permanent archive — preferably kept behind triple-paned airtight glass.'
    ]
  };

  var SCIENTIST_COMMENTS = [
    { scientistId: 'bottomsworth', label: 'Laboratory Observation', quote: 'A remarkably self-assured turbulence profile. I have given it a standing ovation from my desk.' },
    { scientistId: 'wobble', label: 'Mood & Radar Note', quote: 'The emotional curve shifted from calm Zen afternoon sigh straight into hostile lawnmower territory in 0.4 seconds.' },
    { scientistId: 'flatley', label: 'Statistical Observation', quote: 'My neural clustering model looked at this waveform, paused for three seconds, and checked the Doppler radar.' },
    { scientistId: 'turbulence', label: 'Weather Front Note', quote: 'Pressure release dynamics hit like a microburst slamming into a tin carport roof.' },
    { scientistId: 'pufferton', label: 'Archive Classification', quote: 'Cataloged between a coastal foghorn log and "Tractor Tire Escaping a Muddy Rut." Truly rare company.' },
    { scientistId: 'bottomsworth', label: 'Scientific Recommendation', quote: 'Technically illegal in three cramped elevators, yet acoustically a triumph of human determination.' },
    { scientistId: 'turbulence', label: 'Field Observation', quote: 'Moisture flux telemetry resembles pulling a drenched rubber wellington boot out of ankle-deep bog mud.' },
    { scientistId: 'wobble', label: 'Storm Telemetry Note', quote: 'Several low-frequency ridges stacked up like cumulonimbus thunderheads on July radar.' },
    { scientistId: 'flatley', label: 'Computational Note', quote: 'Mood telemetry flagged this clip as "Passive-Aggressive Thunder" with 94% statistical confidence.' },
    { scientistId: 'pufferton', label: 'Archive Classification', quote: 'Stored in Vault Drawer 19B alongside an angry goose recording and a suspiciously damp hiking boot.' }
  ];

  var RARE_COMMENTS = [
    'Laboratory dispute erupted: Dr. Wobble classifies this as "Category-3 Bog Suction," while Bottomsworth calls it a dry plains thunderclap.',
    'Emergency decaf revoked — entire peer-review panel switched to double espresso for this recording.',
    'Building maintenance just called asking why all five acoustic sensors registered a sudden barometric cold front.',
    'National Weather Service phoned the lab to ask whether an unlogged squall line just formed inside Conference Room B.',
    'Additional grant funding formally requested strictly to reconstruct how one emission achieved "Relaxing Spa Wind" and "Angry Chainsaw" simultaneously.',
    'Vault indexing delayed: Dr. Pufferton is wiping tears of academic pride off his glasses.',
    'Mood Board deadlock: two fellows insist this recording feels peaceful and meditative; three others hid under their desks.',
    'Mud-calibration team confirmed identical acoustic drag to losing a left rain boot in spring pasture clay.',
    'Several senior fellows requested a second listen and immediately opened two windows and a patio door.',
    'Unanimous committee memo: this recording has officially crossed from comedy into meteorological history.'
  ];

  var SHAREABLE_VERDICTS = [
    'Archive Worthy. Honestly, Put It In The Louvre.',
    'Scientifically Remarkable (Yet Socially Unforgivable).',
    'Professor Bottomsworth Requested A Standing Ovation.',
    'Category-4 Weather Event Without A Forecast.',
    'Aerodynamic Excellence Achieved Without A Permit.',
    'Equal Parts Swamp Mud Suction & Unapologetic Physics.',
    'Acoustically Ambitious. Windows Open Recommended.',
    'Certified Research Material — Keep Away From Elevators.',
    'Passed Peer Review (Barely Kept A Straight Face).',
    'Strangely Relaxing Until The Surprise Hailstorm Finish.',
    'Hostile Mood Telemetry Confirmed — Check Nearest Exit.',
    'Doppler Radar Mistook This For A Passing Cold Front.'
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
      '  <span class="labs-rare-tag">RARE LABORATORY DISPATCH</span>' +
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
    var energyLine = 'More energetic than ' + energyPct + '% of archived samples.';
    var tags = [];
    if (modDepth >= 0.42) tags.push('Above average turbulence.');
    else tags.push('Controlled laminar flow.');
    if (safeNum(f.pitchRangeSemitones, 0) >= 4.0 || cent >= 360 || cent <= 115) tags.push('Rare resonance distribution.');
    else tags.push('Disciplined harmonic structure.');
    if (atk <= 0.055 || (f.burstCount || 1) >= 2) tags.push('Uncommon pressure release signature.');
    else tags.push('Balanced pressure release profile.');
    if (energyPct >= 62 || wet >= 55) tags.push('Acoustically distinctive.');
    if (energyPct >= 72 || dur >= 0.9 || (f.burstCount || 1) >= 3) tags.push('Potential archive candidate.');

    var puff = pickScientistComment('pufferton', seedStr || 'archive', 1);
    return {
      energyPct: energyPct,
      energyLine: energyLine,
      tags: tags,
      scientistId: 'pufferton',
      quote: puff.quote
    };
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
      '<section class="labs-archive-cmp-card" aria-label="Institute Archive Comparison">' +
      '  <div class="labs-archive-cmp-head">' +
      '    <div>' +
      '      <div class="labs-eyebrow">INSTITUTE ARCHIVE COMPARISON</div>' +
      '      <div class="labs-archive-headline">' + esc(archCmp.energyLine) + '</div>' +
      '    </div>' +
      '    <span class="labs-chip labs-chip-blue">' + archCmp.energyPct + 'th Percentile</span>' +
      '  </div>' +
      '  <div class="labs-archive-meter-track"><div class="labs-archive-meter-fill" style="width:' + archCmp.energyPct + '%"></div></div>' +
      '  <div class="labs-archive-pills">' + pillsHtml + '</div>' +
      '  <div class="labs-chart-obs">' +
      '    <img src="' + esc(sci.img) + '" alt="' + esc(sci.shortName) + '" loading="lazy" />' +
      '    <span><strong>Archive Classification:</strong> "' + esc(archCmp.quote) + '" <em>— ' + esc(sci.shortName) + '</em></span>' +
      '  </div>' +
      '</section>'
    );
  }

  function renderShareableVerdictHtml(verdictText, specimenTitle, pctLabel) {
    var chief = getScientistById('bottomsworth');
    return (
      '<section class="labs-glass-card labs-share-verdict-card" aria-label="Official Shareable Laboratory Verdict">' +
      '  <div class="labs-sv-top">' +
      '    <div class="labs-sv-seal">' +
      '      <img src="' + esc(chief.img) + '" alt="' + esc(chief.name) + '" loading="lazy" />' +
      '      <div>' +
      '        <div class="labs-eyebrow">TOOT MATCH LABS · RESEARCH VERDICT</div>' +
      '        <div class="labs-sv-spec">' + esc(specimenTitle) + (pctLabel ? ' · ' + esc(pctLabel) : '') + '</div>' +
      '      </div>' +
      '    </div>' +
      '    <button type="button" class="labs-btn-ghost labs-btn-sm labs-copy-verdict-btn" data-verdict-copy="' + esc(verdictText) + '">📋 Copy Verdict</button>' +
      '  </div>' +
      '  <div class="labs-sv-headline">' + esc(verdictText) + '</div>' +
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
      '<section class="labs-glass-card labs-report-signature" aria-label="Laboratory Certification and Research Footnotes">' +
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
      '  <p class="labs-sig-disclaimer">"This report has been generated using proprietary acoustic analysis techniques and may contain traces of excessive scientific enthusiasm."</p>' +
      '  <div class="labs-footnotes">' +
      '    <div class="labs-eyebrow">RESEARCH FOOTNOTES</div>' +
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
    var bpmA = Math.round(safeNum(fA.modRateHz, 0) * 60);
    var bpmB = Math.round(safeNum(fB.modRateHz, 0) * 60);
    var oppSlope = pBd.oppCent || pBd.oppPitch || safeNum(pBd.polarityMul, 1) < 1;
    var refFreq = formatHzLabel(fA);
    var guessFreq = formatHzLabel(fB);
    var lagBins = (bd.envelope && bd.envelope.lagProfile && bd.envelope.lagProfile.bestLag) || 0;
    var centA = safeNum(fA.spectralCentroidHz, 220);
    var centB = safeNum(fB.spectralCentroidHz, 220);

    var pitchQuip = oppSlope
      ? 'Storm-Front vs Rapid-Deflation Collision! One rises like an oncoming gale while the other drops downhill (×0.28 sweep penalty).'
      : pBd.refUnvoiced !== pBd.userUnvoiced
      ? 'Crosswind vs Storm mismatch: one stayed silent-and-breezy while the other blasted a full pitched wave.'
      : safeNum(res.pitchScore, 0) >= 82
      ? 'Eerily locked on target! Practically oscillating at the exact same barometric core.'
      : 'Frequency offset logged between ' + refFreq + ' and ' + guessFreq + ' across the spectral band.';

    var durQuip =
      Math.abs(deltaMs) < 35
        ? 'Uncanny stopwatch valve discipline — both pinched off within ±' + Math.abs(deltaMs) + 'ms.'
        : deltaMs > 0
        ? 'Recording B kept resonating for +' + deltaMs + 'ms longer than Specimen A.'
        : 'Specimen B truncated ' + Math.abs(deltaMs) + 'ms earlier than Reference A.';

    var envQuip =
      lagBins === 0
        ? 'Detonation peaks arrived phase-locked without needing lag compensation.'
        : 'Aligned Recording B by ' + (lagBins > 0 ? '+' : '') + lagBins + ' time bins for temporal fairness.';

    var timbreQuip =
      centB < centA * 0.72
        ? 'Recording B exhibits dense upholstery attenuation compared to open-air Reference A.'
        : centB > centA * 1.35
        ? 'Recording B packs sharper high-end air hiss — less cushion damping than Reference A.'
        : 'Astonishingly close upholstery damping and cheek resonance coloring.';

    var rawList = [
      {
        id: 'tone',
        title: '📡 Core Pitch & Frequency Sweep',
        score: Math.round(clamp(safeNum(res.pitchScore, 0), 0, 100)),
        sub: refFreq + ' vs ' + guessFreq,
        quip: pitchQuip,
        forensicsKey: 'pitch',
        note: 'Tracks fundamental F0 (45–650 Hz), checks whether mood telemetry bends anxiously upward or deflates downward.'
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
        note: 'Computes 13-band MFCC vocal-tract fingerprints to catch muffled denim vs sharp open-air snap.'
      },
      {
        id: 'thunder',
        title: '⚡ Sub-Bass Thunder Quotient',
        score: thunderScore,
        sub: Math.round(safeNum(bpA[0], 0) * 100) + '% vs ' + Math.round(safeNum(bpB[0], 0) * 100) + '% sub-bass',
        quip: safeNum(bpA[0], 0) + safeNum(bpB[0], 0) >= 0.7 ? 'Dual window-rattling thunderclap — drywalls and barometers stand no chance.' : 'Lighter mid-band snap without heavy rolling thunder.',
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
        title: '💨 Tonal Core vs Stealth Crosswind',
        score: harmonicScore,
        sub: 'Flatness ' + safeNum(fA.spectralFlatness, 0).toFixed(2) + ' vs ' + safeNum(fB.spectralFlatness, 0).toFixed(2),
        quip: safeNum(fA.spectralFlatness, 0) > 0.45 && safeNum(fB.spectralFlatness, 0) > 0.45 ? 'Matched stealth crosswinds — maximum plausible office deniability.' : 'Balances dense thunder rumble against chaotic air turbulence.',
        forensicsKey: 'pitch',
        note: 'Separates aggressive foghorn booms from innocent AC-vent background gusts.'
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
    var authA = computeAuthenticityAnalysis(soundA);
    var authB = computeAuthenticityAnalysis(soundB);

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
    rowItems.push(buildAuthenticitySummaryRow('authenticity', authA, authB, labelA, labelB));

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

    var cmpComment = pickScientistComment(
      'flatley',
      (labelA || '') + '|' + (labelB || '') + '|' + exactScore.toFixed(1),
      0
    );
    cmpComment.label = 'Comparative Match Review';
    var specWobble = pickScientistComment('wobble', (labelA || '') + '|' + (labelB || '') + '|spec3d', 1);
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

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">COMPARISON FORENSICS SUITE · SCIENTIFIC REVIEW</div>' +
      '        <h2 class="labs-fn-title">' + esc(labelA) + ' <span class="labs-vs-arrow">vs</span> ' + esc(labelB) + '</h2>' +
      '      </div>' +
      '      <div class="labs-fn-right-cluster">' +
      headerBtnsHtml +
      '        <div class="labs-fn-score-chip">' +
      '          <span class="labs-fn-score-val">' + exactScore.toFixed(1) + '%</span>' +
      '          <span class="labs-fn-score-lbl">SIMILARITY</span>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="labs-fn-meta-row">' +
      twinBadgeHtml +
      '      <span class="labs-ass-badge">Analysis performed using ' + esc(INSTITUTE.aiAcronym + ' ' + INSTITUTE.aiVersion) + '</span>' +
      '      <span class="labs-hint-text">3D spectrograms above · Expandable comparative telemetry below</span>' +
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
      renderScientistCommentHtml(specWobble.scientistId, specWobble.quote, '3D Spectrogram Commentary') +
      '  </section>' +
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">COMPLETE COMPARATIVE ACOUSTIC ANALYSIS</div>' +
      '        <h3 class="labs-section-title">Head-to-Head Research Summary</h3>' +
      '      </div>' +
      '      <span class="labs-chip labs-chip-blue">' + rowItems.length + ' Telemetry Suites</span>' +
      '    </div>' +
      '    <div class="labs-verdict-banner">' +
      '      <div class="labs-verdict-banner-head">' +
      '        <span class="labs-eyebrow">LABORATORY FINDINGS · OFFICIAL SCIENTIFIC VERDICT</span>' +
      '        <span class="labs-verdict-grade">' + esc('Grade ' + (result.grade || 'B') + ' · ' + (result.title || 'Aligned Profile')) + '</span>' +
      '      </div>' +
      '      <p class="labs-verdict-text">' + esc(cmpVerdict) + '</p>' +
      cmpTipsHtml +
      '    </div>' +
      renderScientistCommentHtml(cmpComment.scientistId, cmpComment.quote, cmpComment.label) +
      renderRareCommentHtml(rareDispatch) +
      humorStripHtml +
      renderArchiveComparisonHtml(archCmp) +
      '    <div class="labs-hint-text">Tap any row below to expand complete FFT charts, side-by-side statistics &amp; equations inline.</div>' +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '  </section>' +
      renderShareableVerdictHtml(shareVerdict, labelA + ' vs ' + labelB, exactScore.toFixed(1) + '% Similarity') +
      renderReportSignatureHtml((labelA || '') + '|' + (labelB || '') + '|cmp') +
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
    if (cmpShareBtn && opts.onShare) {
      cmpShareBtn.addEventListener('click', function () {
        opts.onShare(soundA, soundB, result, exactScore, [canvasA, canvasB]);
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
          if (authCanvas) drawAuthenticityPlot(authCanvas, authA, authB, labelA, labelB);
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
      name: 'Thunderstorm Rumble',
      emoji: '⛈️',
      color: '#60A5FA',
      pitchLog: Math.log2(82),
      flatness: 0.16,
      modDepth: 0.25,
      subShare: 0.56,
      crest: 0.52,
      wetness: 0.25,
      description: 'Low-frequency storm-front rumble anchored below 120 Hz with deep room-rattling sub-bass.'
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
        tag: specAnomaly ? 'Unusual Resonance Spike' : 'Spectral Cluster',
        title: (specAnomaly ? 'Unusual Resonance Spike' : 'Spectral Cluster') + ' @ ' + peakSpecHz + ' Hz',
        telemetry: peakSpecHz + ' Hz · ' + Math.round(clamp(peakSpecVal, 0, 1) * 100) + '% Peak Energy (' + ordinalPct(specPct) + ' pct)',
        story: 'A stubborn wall of sound parked itself at ' + peakSpecHz + ' Hz and refused to apologize. Dr. Wobble zoomed in twice just to admire the nerve of it.',
        scientistId: 'wobble',
        scientistQuote: pickScientistComment('wobble', peakSpecHz + 'spec', 0).quote
      },
      {
        id: 'hs_spec_thunder',
        norm: (subPeakIdx + 0.5) / Math.max(1, spec.length),
        spanLo: 0,
        spanHi: clamp((subPeakIdx + 4) / Math.max(1, spec.length), 0.15, 0.45),
        tag: 'Thunder Concentration',
        title: 'Thunder Concentration @ ' + subPeakHz + ' Hz',
        telemetry: 'Sub-165 Hz Core · ' + Math.round(clamp(subPeakVal, 0, 1) * 100) + '% Low-End Energy',
        story: 'Heavy tectonic pressure anchored around ' + subPeakHz + ' Hz. Dr. Turbulence noted enough sub-bass propagation to rattle silverware in an adjacent postal code.',
        scientistId: 'turbulence',
        scientistQuote: pickScientistComment('turbulence', subPeakHz + 'thunder', 1).quote
      },
      {
        id: 'hs_spec_outlier',
        norm: (maxArchDiffIdx + 0.5) / Math.max(1, spec.length),
        spanLo: clamp((maxArchDiffIdx - 2) / Math.max(1, spec.length), 0, 1),
        spanHi: clamp((maxArchDiffIdx + 3) / Math.max(1, spec.length), 0, 1),
        tag: 'Archive Outlier',
        title: 'Archive Outlier @ ' + outlierHz + ' Hz',
        telemetry: outlierHz + ' Hz · +' + Math.round(maxArchDiffVal * 100) + '% above Institute baseline',
        story: 'At ' + outlierHz + ' Hz, energy drifts miles off normal human etiquette baselines. Dr. Flatley flagged this band as "spectrally unrepentant."',
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
        tag: 'Harmonic Event',
        title: voicedPts.length ? 'Harmonic Event @ ' + Math.round(maxPitch) + ' Hz' : 'Harmonic Stealth Window',
        telemetry: voicedPts.length ? 'Peak F0 ' + Math.round(maxPitch) + ' Hz · Frame ' + (maxPitchFrame + 1) + ' (±' + pitchCi + ' Hz CI)' : 'Unvoiced Aerodynamic Band',
        story: voicedPts.length
          ? 'Pitch locked onto ' + Math.round(maxPitch) + ' Hz with such barometric intensity that Dr. Wobble checked outside for an approaching squall line.'
          : 'Zero tonal pitching detected — pure whisper-stealth aerodynamics engineered for slipping quietly out of a crowded checkout line.',
        scientistId: 'wobble',
        scientistQuote: pickScientistComment('wobble', Math.round(maxPitch) + 'pitch', 1).quote
      },
      {
        id: 'hs_pitch_inflect',
        norm: steepFrame / Math.max(1, pArr.length - 1),
        spanLo: clamp((steepFrame - 2) / Math.max(1, pArr.length - 1), 0, 1),
        spanHi: clamp((steepFrame + 2) / Math.max(1, pArr.length - 1), 0, 1),
        tag: 'Statistical Curiosity',
        title: 'Pitch Inflection Shift (' + pitchSpanSt.toFixed(1) + ' st span)',
        telemetry: 'Sweep Span ' + pitchSpanSt.toFixed(1) + ' semitones · ' + ordinalPct(pitchPct) + ' pct',
        story: 'Frequency swerved abruptly across ' + pitchSpanSt.toFixed(1) + ' semitones like it noticed someone walking into the hallway. Professor Bottomsworth saluted the dramatic plot twist.',
        scientistId: 'bottomsworth',
        scientistQuote: pickScientistComment('bottomsworth', pitchSpanSt + 'sweep', 2).quote
      },
      {
        id: 'hs_pitch_base',
        norm: minPitchFrame / Math.max(1, pArr.length - 1),
        spanLo: clamp((minPitchFrame - 2) / Math.max(1, pArr.length - 1), 0, 1),
        spanHi: clamp((minPitchFrame + 2) / Math.max(1, pArr.length - 1), 0, 1),
        tag: 'Archive Outlier',
        title: 'Register Floor vs 90–240 Hz Corridor',
        telemetry: 'Floor ' + (minPitch < 9000 ? Math.round(minPitch) + ' Hz' : 'Broadband') + ' · Mean ' + Math.round(meanPitch || centHz) + ' Hz',
        story: 'Anchored against our shaded 90–240 Hz baseline corridor (' + ordinalPct(pitchPct) + ' archive percentile), earning an appreciative nod from Dr. Pufferton.',
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
        tag: 'Peak Turbulence Event',
        title: 'Peak Turbulence Event @ ' + Math.round(modRate) + ' Hz',
        telemetry: Math.round(modRate) + ' Hz (' + Math.round(modRate * 60) + ' flaps/min) · Depth ' + modDepthPct + '%',
        story: 'Sustaining ' + Math.round(modRate * 60) + ' cheek flaps/min (' + modDepthPct + '% depth). Dr. Turbulence considers this speed proof that human aerodynamics deserve a wind-tunnel budget.',
        scientistId: 'turbulence',
        scientistQuote: pickScientistComment('turbulence', modDepthPct + 'turb', 0).quote
      },
      {
        id: 'hs_mod_flutter',
        norm: 0.25,
        spanLo: (8 - 4) / 41,
        spanHi: (20 - 4) / 41,
        tag: 'Harmonic Event',
        title: 'Mud-Boot & Flutter Band (8–20 Hz)',
        telemetry: Math.round(safeNum(f.modBands && f.modBands[1], 0.34) * 100) + '% Modulation Share',
        story: 'The chaotic 8–20 Hz vortex pocket captures ' + Math.round(safeNum(f.modBands && f.modBands[1], 0.34) * 100) + '% of ripple power — uncannily like a rain boot yanking free of thick clay mud.',
        scientistId: 'wobble',
        scientistQuote: pickScientistComment('wobble', modRate + 'band', 2).quote
      },
      {
        id: 'hs_mod_rattle',
        norm: 0.68,
        spanLo: (20 - 4) / 41,
        spanHi: 1,
        tag: 'Statistical Curiosity',
        title: 'Fast Turbulence Rattle (20–45 Hz)',
        telemetry: Math.round(safeNum(f.modBands && f.modBands[2], 0.3) * 100) + '% High-Rattle Share (' + ordinalPct(modPct) + ' pct)',
        story: 'Rapid oscillation above 20 Hz sounds suspiciously like a miniature scooter idling inside a tuxedo pocket. Dr. Flatley cannot stop graphing it.',
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
        tag: 'Pressure Instability Zone',
        title: 'Peak Shockwave @ ' + Math.round(envPeakNorm * durSec * 1000) + ' ms',
        telemetry: 'Attack ' + atkMs + 'ms · Crest ' + crestDb.toFixed(1) + ' dB (' + ordinalPct(envPct) + ' pct)',
        story: 'Full ' + crestDb.toFixed(1) + ' dB sonic impact landed in just ' + atkMs + ' ms — faster than anyone nearby could invent an alibi. Professor Bottomsworth is deeply moved.',
        scientistId: 'bottomsworth',
        scientistQuote: pickScientistComment('bottomsworth', crestDb + 'crest', 3).quote
      },
      {
        id: 'hs_env_t50',
        norm: t50Norm,
        spanLo: clamp(t50Norm - 0.1, 0, 1),
        spanHi: clamp(t50Norm + 0.1, 0, 1),
        tag: 'Statistical Curiosity',
        title: 'Mid-Energy T50 Threshold (' + Math.round(t50Norm * 100) + '%)',
        telemetry: 'Half-Energy Expended @ ' + Math.round(t50Norm * durSec * 1000) + 'ms · ±18ms CI',
        story: '50% of total kinetic energy fired off before ' + Math.round(t50Norm * 100) + '% duration — front-loaded boldness with zero interest in tiptoeing out slowly.',
        scientistId: 'turbulence',
        scientistQuote: pickScientistComment('turbulence', Math.round(t50Norm * 100) + 't50', 2).quote
      },
      {
        id: 'hs_env_tail',
        norm: clamp(0.82, 0, 1),
        spanLo: 0.68,
        spanHi: 1.0,
        tag: bursts > 1 ? 'Peak Turbulence Event' : 'Archive Outlier',
        title: bursts > 1 ? bursts + '-Burst Release Tail' : 'Clean Valve Decay Tail',
        telemetry: bursts + ' Hysteresis Burst(s) · ' + durSec.toFixed(2) + 's Total',
        story: bursts > 1
          ? 'Punctuated across ' + bursts + ' distinct dramatic acts, like a sitcom with unexpected post-credits scenes. Dr. Pufferton gave it VIP archive shelving.'
          : 'One clean, dignified release with zero sloppy aftershocks — filed proudly in the Gentlemanly Acoustics Wing.',
        scientistId: 'pufferton',
        scientistQuote: pickScientistComment('pufferton', bursts + 'tail', 2).quote
      }
    ];

    return {
      bases: bases,
      c_spec: {
        key: 'c_spec',
        modalTitle: '40-Band FFT Energy Spectrum',
        modalSubtitle: 'Logarithmic spectral energy (45 Hz – 4.2 kHz) vs Archive baseline & 95% confidence band',
        extraLayerLabel: 'Band Division Markers',
        expertIds: ['wobble', 'flatley'],
        percentile: specPct,
        percentileLabel: ordinalPct(specPct) + ' percentile',
        ciLabel: '95% CI ±11%',
        anomalyTag: specAnomaly ? 'Unusual Resonance Spike' : (specPct >= 75 ? 'Exceeds Archive Avg' : 'Within Archive Norm'),
        scientistId: 'wobble',
        observation: specAnomaly
          ? 'A concentrated resonance spike emerged at ' + peakSpecHz + ' Hz. Dr. Wobble identified unusual harmonic behaviour in the surrounding frequency region.'
          : specPct >= 75
          ? 'Spectral centroid reaches ' + Math.round(centHz) + ' Hz, exceeding typical Institute archive averages across upper harmonics.'
          : 'Harmonic distribution remains cleanly anchored around ' + peakSpecHz + ' Hz against historic Institute Archive baselines.',
        defaultReadout: 'Peak ' + peakSpecHz + ' Hz (' + Math.round(clamp(peakSpecVal, 0, 1) * 100) + '% rel) · Archive Avg @ Peak: ' + Math.round((bases.specMean[peakSpecIdx] || 0.3) * 100) + '% · Tap any bar or callout',
        hotspots: specHotspots,
        describeAtNorm: function (norm) {
          var idx = clamp(Math.floor(norm * Math.max(1, spec.length)), 0, Math.max(0, spec.length - 1));
          var hz = specHzAt(idx);
          var valPct = Math.round(clamp(safeNum(spec[idx], 0), 0, 1) * 100);
          var avgPct = Math.round(clamp(safeNum(bases.specMean[idx], 0.25), 0, 1) * 100);
          var diff = valPct - avgPct;
          var regionLabel = hz < 150 ? 'Thunder Concentration' : hz < 450 ? 'Harmonic Event' : 'Spectral Cluster';
          var sciPick = hz < 150 ? 'turbulence' : 'wobble';
          return {
            tag: diff >= 18 ? 'Archive Outlier' : regionLabel,
            title: hz + ' Hz Spectral Region (' + valPct + '% magnitude)',
            telemetry: hz + ' Hz · Level ' + valPct + '% vs Archive ' + avgPct + '% (' + (diff >= 0 ? '+' : '') + diff + '%)',
            story: diff >= 18
              ? 'Laboratory Observation: At ' + hz + ' Hz, acoustic output stands +' + diff + '% above the Institute archive mean. ' + (sciPick === 'wobble' ? 'Dr. Wobble' : 'Dr. Turbulence') + ' flagged this resonance peak for elevated scientific scrutiny.'
              : 'Laboratory Observation: Measured ' + valPct + '% relative spectral energy at ' + hz + ' Hz (' + (diff >= 0 ? '+' : '') + diff + '% vs archive baseline, 95% CI ±11%). Harmonically consistent with surrounding chamber resonances.',
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
          { label: 'Peak Cluster', value: peakSpecHz + ' Hz', sub: Math.round(clamp(peakSpecVal, 0, 1) * 100) + '% normalized amplitude' },
          { label: 'Archive Percentile', value: ordinalPct(specPct), sub: 'Centroid ' + Math.round(centHz) + ' Hz' },
          { label: '95% CI Band', value: '±11% mag', sub: 'Archive mean corridor overlaid' },
          { label: 'Flagged Anomaly', value: specAnomaly ? 'Resonance Spike' : 'Calibrated Spread', sub: specAnomaly ? 'Dr. Wobble frequency alert' : 'Normal broadband spread' }
        ],
        drillNote: 'Logarithmic 40-band spectrum plotted directly against the Institute Archive mean curve (dashed amber) and 95% confidence band (shaded envelope). Tap any bar, peak, or hotspot to read its localized laboratory story.'
      },
      c_pitch: {
        key: 'c_pitch',
        modalTitle: 'Pitch & Frequency Sweep',
        modalSubtitle: '32-frame YIN fundamental contour overlaid on Institute 90–240 Hz typical register corridor',
        extraLayerLabel: 'Register Inflection Markers',
        expertIds: ['wobble', 'bottomsworth'],
        percentile: pitchPct,
        percentileLabel: ordinalPct(pitchPct) + ' percentile',
        ciLabel: '95% CI ±' + pitchCi + ' Hz',
        anomalyTag: pitchSpanSt >= 5 ? 'Statistical Curiosity' : voicedPts.length === 0 ? 'Unvoiced Stealth Band' : 'Harmonic Event',
        scientistId: 'wobble',
        observation: pitchSpanSt >= 5
          ? 'A wide ' + pitchSpanSt.toFixed(1) + '-semitone inflection sweep suggests uncommon characteristics compared to archived specimens.'
          : voicedPts.length === 0
          ? 'Acoustic emissions remained broadly unvoiced across all 32 frames, resisting classical pitch extraction.'
          : 'Dr. Wobble verified coherent pitch trajectory relative to the 90–240 Hz Institute corridor.',
        defaultReadout: voicedPts.length ? 'Mean ' + Math.round(meanPitch) + ' Hz (Peak ' + Math.round(maxPitch) + ' Hz @ Frame ' + (maxPitchFrame + 1) + ') · Tap contour points to inspect' : 'Unvoiced emission (<25% voiced frames) · Corridor 90–240 Hz shown · Tap to probe',
        hotspots: pitchHotspots,
        describeAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, pArr.length - 1)), 0, Math.max(0, pArr.length - 1));
          var tSec = (idx / Math.max(1, pArr.length - 1)) * durSec;
          var hz = safeNum(pArr[idx], 0);
          return {
            tag: hz > 240 ? 'Archive Outlier' : hz > 20 ? 'Harmonic Event' : 'Statistical Curiosity',
            title: hz > 20 ? 'Frame ' + (idx + 1) + ' Harmonic Point (' + Math.round(hz) + ' Hz)' : 'Frame ' + (idx + 1) + ' Unvoiced Air Segment',
            telemetry: 't=' + tSec.toFixed(2) + 's · ' + (hz > 20 ? Math.round(hz) + ' Hz (±' + pitchCi + ' Hz CI)' : 'Broadband Turbulence'),
            story: hz > 20
              ? 'Laboratory Observation: At ' + tSec.toFixed(2) + 's, cheek oscillation sustained ' + Math.round(hz) + ' Hz (' + (hz > 240 ? 'above the 240 Hz archive ceiling' : hz < 90 ? 'below the 90 Hz sub-bass floor' : 'inside the primary 90–240 Hz vocal-reed zone') + ').'
              : 'Laboratory Observation: At ' + tSec.toFixed(2) + 's, transient airflow overwhelmed harmonic locking, yielding pure unvoiced aerodynamic turbulence.',
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
            ? 't=' + tSec.toFixed(2) + 's · Pitch ' + Math.round(hz) + ' Hz (95% CI ±' + pitchCi + ' Hz · Archive typ 90–240 Hz)'
            : 't=' + tSec.toFixed(2) + 's · Unvoiced frame (Turbulent airband · Archive typ 90–240 Hz)';
        },
        drillStats: [
          { label: 'Mean Pitch F0', value: voicedPts.length ? Math.round(meanPitch) + ' Hz' : 'Unvoiced', sub: voicedPts.length + '/' + pArr.length + ' voiced frames' },
          { label: '95% Confidence', value: '±' + pitchCi + ' Hz', sub: 'Inter-frame stability margin' },
          { label: 'Archive Percentile', value: ordinalPct(pitchPct), sub: 'Vs historical register corpus' },
          { label: 'Sweep Excursion', value: pitchSpanSt.toFixed(1) + ' st', sub: pitchSpanSt >= 5 ? 'Wide inflection anomaly' : 'Controlled pitch contour' }
        ],
        drillNote: 'Frame-by-frame YIN fundamental tracker overlaid on the translucent Archive Typical Register (90–240 Hz) and ±1σ frame confidence corridor.'
      },
      c_mod: {
        key: 'c_mod',
        modalTitle: 'Modulation & Flutter FFT (4–45 Hz)',
        modalSubtitle: 'Biomechanical cheek oscillation speed vs Institute Archive modulation averages',
        extraLayerLabel: '3-Zone Biomechanical Bands',
        expertIds: ['turbulence', 'wobble'],
        percentile: modPct,
        percentileLabel: ordinalPct(modPct) + ' percentile',
        ciLabel: '95% CI ±9% depth',
        anomalyTag: highTurb ? 'Peak Turbulence Event' : 'Measured Flutter',
        scientistId: 'turbulence',
        observation: highTurb
          ? 'High turbulence concentration recorded at ' + Math.round(modRate * 60) + ' flaps/min, exceeding typical Institute archive averages.'
          : 'Flutter kinematics remain well structured around ' + Math.round(modRate) + ' Hz. Dr. Turbulence noted unusually clean air-flow organization.',
        defaultReadout: 'Peak ' + Math.round(modRate) + ' Hz (' + Math.round(modRate * 60) + ' flaps/min) · Depth ' + modDepthPct + '% · Tap any modulation band',
        hotspots: modHotspots,
        describeAtNorm: function (norm) {
          var mHz = 4 + norm * 41;
          var idx = clamp(Math.round(norm * Math.max(0, ms.length - 1)), 0, Math.max(0, ms.length - 1));
          var zone = mHz < 8 ? 'Slow Stutter' : mHz < 20 ? 'Cheek Flutter' : 'Fast Rattle';
          var mVal = Math.round(clamp(safeNum(ms[idx], 0), 0, 1) * 100);
          var mAvg = Math.round(clamp(safeNum(bases.modMean[idx], 0.25), 0, 1) * 100);
          return {
            tag: mVal >= mAvg + 15 ? 'Peak Turbulence Event' : zone,
            title: zone + ' Zone @ ' + mHz.toFixed(1) + ' Hz (' + Math.round(mHz * 60) + ' flaps/min)',
            telemetry: mVal + '% Modulation Energy vs ' + mAvg + '% Archive Avg',
            story: 'Laboratory Observation: At ' + Math.round(mHz * 60) + ' flaps/min (' + zone + ' regime), envelope ripple carries ' + mVal + '% relative energy against a ' + mAvg + '% archive baseline.',
            scientistId: 'turbulence',
            scientistQuote: pickScientistComment('turbulence', Math.round(mHz) + 'mod', idx).quote,
            spanLo: clamp(norm - 0.08, 0, 1),
            spanHi: clamp(norm + 0.08, 0, 1)
          };
        },
        sampleAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, ms.length - 1)), 0, Math.max(0, ms.length - 1));
          var mHz = 4 + norm * 41;
          var zone = mHz < 8 ? 'Slow Stutter' : mHz < 20 ? 'Cheek Flutter' : 'Fast Rattle';
          var mVal = Math.round(clamp(safeNum(ms[idx], 0), 0, 1) * 100);
          var mAvg = Math.round(clamp(safeNum(bases.modMean[idx], 0.25), 0, 1) * 100);
          return mHz.toFixed(1) + ' Hz (' + Math.round(mHz * 60) + ' flaps/min · ' + zone + ') · Energy ' + mVal + '% vs Archive ' + mAvg + '%';
        },
        drillStats: [
          { label: 'Dominant Flutter', value: Math.round(modRate) + ' Hz', sub: Math.round(modRate * 60) + ' cheek flaps/min' },
          { label: 'Modulation Depth', value: modDepthPct + '%', sub: 'Archive median ~36% (±9% CI)' },
          { label: 'Archive Percentile', value: ordinalPct(modPct), sub: highTurb ? 'Top quartile turbulence' : 'Balanced flutter dynamics' },
          { label: 'Bursts Logged', value: String(bursts), sub: '4–45 Hz modulation bands' }
        ],
        drillNote: 'Three anatomical modulation zones are shaded: 4–8 Hz Slow Stutter (blue), 8–20 Hz Classic Cheek Flutter (emerald), and 20–45 Hz Fast Bee-Rattle (violet), compared against the dashed Archive average.'
      },
      c_env: {
        key: 'c_env',
        modalTitle: 'Blast Pressure Envelope',
        modalSubtitle: 'Temporal pressure release curve vs Archive impulse baseline, attack peak & 0.35 burst gate',
        extraLayerLabel: '0.35 Burst Gate Threshold',
        expertIds: ['bottomsworth', 'pufferton'],
        percentile: envPct,
        percentileLabel: ordinalPct(envPct) + ' percentile',
        ciLabel: '95% CI ±18 ms',
        anomalyTag: crestDb >= 12 || bursts > 1 ? 'Pressure Instability Zone' : 'Clean Pressure Release',
        scientistId: 'bottomsworth',
        observation: crestDb >= 12
          ? 'An abrupt ' + crestDb.toFixed(1) + ' dB pressure shockwave occurred at ' + atkMs + ' ms. Professor Bottomsworth requested additional temporal review.'
          : bursts > 1
          ? 'Multi-burst acoustic release exceeds typical single-pulse archive baselines.'
          : 'Pressure attack and attenuation profiles align cleanly within calibrated Institute tolerances.',
        defaultReadout: 'Attack ' + atkMs + 'ms · Crest ' + crestDb.toFixed(1) + ' dB · T50 @ ' + Math.round(t50Norm * 100) + '% · Tap timeline to inspect',
        hotspots: envHotspots,
        describeAtNorm: function (norm) {
          var idx = clamp(Math.round(norm * Math.max(0, env.length - 1)), 0, Math.max(0, env.length - 1));
          var tMs = Math.round(norm * durSec * 1000);
          var ampPct = Math.round(clamp(safeNum(env[idx], 0), 0, 1) * 100);
          var archPct = Math.round(clamp(safeNum(bases.envMean[idx], 0.3), 0, 1) * 100);
          return {
            tag: ampPct >= 35 ? 'Pressure Instability Zone' : 'Statistical Curiosity',
            title: 'Envelope Moment @ ' + tMs + ' ms (' + ampPct + '% pressure)',
            telemetry: 't=' + tMs + 'ms (' + Math.round(norm * 100) + '%) · ' + ampPct + '% Pressure vs ' + archPct + '% Archive',
            story: 'Laboratory Observation: At ' + tMs + ' ms into the release, instantaneous pressure stands at ' + ampPct + '% of maximum against an archive expectation of ' + archPct + '%.' + (ampPct >= 35 ? ' This point clears the 0.35 burst-segmentation gate.' : ''),
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
          { label: 'Onset Attack', value: atkMs + ' ms', sub: 'Peak RMS arrival time' },
          { label: 'Crest Factor', value: crestDb.toFixed(1) + ' dB', sub: 'Archive mean ~9.2 dB' },
          { label: 'Archive Percentile', value: ordinalPct(envPct), sub: 'Dynamic shockwave rank' },
          { label: '95% Timing CI', value: '±18 ms', sub: 'Gate re-arm hysteresis' }
        ],
        drillNote: 'Normalized RMS pressure envelope overlaid against the shaded Institute Archive baseline impulse curve, highlighting attack surge, T50 acoustic midpoint, and the 0.35 hysteresis burst threshold.'
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
        '  <span class="labs-eyebrow">LABORATORY OBSERVATION</span>' +
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
        '<div class="labs-eyebrow">LABORATORY NOTES &amp; FOOTNOTES</div>' +
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
        title: '🎨 Upholstery & Storm Depth',
        score: resScore,
        sub: Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz center',
        quip: subRatio >= 0.35 ? 'Thunderstorm-grade ' + Math.round(subRatio * 100) + '% sub-bass rumble built to rattle windowpanes.' : 'Sharp mid-band turbulence cuts clean through sofa cushions.'
      },
      {
        id: 's_tone',
        title: '📡 Core Pitch & Mood Curve',
        score: toneScore,
        sub: formatHzLabel(feat) + ' · ' + noteTag,
        quip: feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0 ? 'Locks onto ' + noteTag + ' with stubborn barometric conviction.' : 'Operates like an innocent hallway draft rather than a thunderstorm.'
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
        title: '🌩️ Acoustic Doppelgänger Twin',
        score: twinScore,
        sub: bonus ? bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name : 'Archetype',
        quip: bonus ? 'In a blind lineup, sounds startlingly like a ' + bonus.acoustics.twinA.name + '.' : 'Matched against storm, mud, wildlife, and engine archetypes.'
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
        subtitle: '40-band STFT distribution across winter-jeans bass vs sharp hiss turbulence.',
        commentary:
          'Spectral center of mass sits at ' + Math.round(safeNum(feat.spectralCentroidHz, 220)) + ' Hz with ' +
          Math.round(safeNum(bp[0], 0) * 100) + '% of acoustic power below 150 Hz. ' +
          (bp[0] >= 0.35 ? 'Substantial thunderstorm-grade bass depth confirmed — wooden dining chairs act as pure amplifiers.' : 'Sharper upper turbulence dominates; minimal winter-denim muffling detected.'),
        charts: [
          { title: '40-Band FFT Energy Spectrum', sub: '45 Hz to 4.2 kHz logarithmic surface', drawType: 's_spectrum' },
          { title: '4-Band Energy Breakdown', sub: 'Sub-Thunder vs Mud Rumble vs Harsh Rasp vs Air', drawType: 's_4band' }
        ],
        stats: [
          { label: 'Centroid', value: Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz', sub: 'Spectral center of mass' },
          { label: 'Sub-Bass (<150Hz)', value: Math.round(safeNum(bp[0], 0) * 100) + '%', sub: 'Chair-rattling band' },
          { label: 'Mid Rumble', value: Math.round(safeNum(bp[1], 0) * 100) + '%', sub: '150–450 Hz turbulence band' },
          { label: 'Upper Air (>1.2kHz)', value: Math.round(safeNum(bp[3], 0) * 100) + '%', sub: 'Steam-valve air hiss band' }
        ],
        formula: 'Centroid = SUM(f_k * E_k) / SUM(E_k)'
      },
      s_tone: {
        badgeCode: 'DOC-03 // FUNDAMENTAL F0 & MOOD TELEMETRY',
        title: 'Fundamental Musical Note & Mood Curve',
        subtitle: 'Tracks pitch glide in Hz and maps nervous upward bends vs calm deflations.',
        commentary:
          (feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0
            ? 'Clean pitched core locked onto ' + noteStr + ' (' + Math.round(feat.medianPitchHz) + ' Hz) across ' + Math.round(feat.voicedRatio * 100) + '% of frames. Confident enough to set off backyard storm sirens.'
            : 'Stealth Crosswind Emission (' + Math.round(safeNum(feat.voicedRatio, 0) * 100) + '% voiced frames). Operates like a secret office-chair air leak rather than a rolling weather front.'),
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
        subtitle: 'Quantifies mud-boot rasp vs muffled winter-jeans air noise.',
        commentary:
          'Wiener Spectral Flatness reads ' + safeNum(feat.spectralFlatness, 0).toFixed(2) + ' (' + (feat.spectralFlatness > 0.45 ? 'breezy stealth character — plausibly mistaken for a cracked window draft' : 'hostile low-end rumble and coarse flutter — nobody thinks that was the chair') + '). Every acoustic fingerprint stays 100% locally computed.',
        charts: [
          { title: '13-Band MFCC Signature', sub: 'Spectral envelope shape vector', drawType: 's_mfcc13' },
          { title: '40-Band FFT Energy Spectrum', sub: 'Formant resonances & overtones', drawType: 's_spectrum' }
        ],
        stats: [
          { label: 'Flatness', value: safeNum(feat.spectralFlatness, 0).toFixed(3), sub: '0 = dense pitch, 1 = pure air' },
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
        subtitle: 'Cross-referenced against 8 calibrated weather, mud, wildlife, and machine noisemakers.',
        commentary:
          bonus
            ? 'Wild & Weather Twin Match: In a blind acoustic lineup, this specimen impersonates a "' + bonus.acoustics.twinA.name + '" at ' + bonus.acoustics.topScoreA + '% similarity. Mention that scientific fact loudly if accused at dinner.'
            : 'Matched against calibrated noisemaker archetypes.',
        charts: [
          { title: '8-Archetype Affinity Breakdown', sub: 'Thunder, Foghorn, Mud Boot, Chainsaw, Goose, Balloon...', drawType: 's_twin_bars' },
          { title: '2D Hz × Airiness Archetype Map', sub: 'Green dot = Your recording vs archetypes', drawType: 's_twin_map' }
        ],
        stats: [
          { label: 'Top Twin', value: bonus ? bonus.acoustics.twinA.short : '—', sub: bonus ? bonus.acoustics.topScoreA + '% similarity' : '' },
          { label: 'Effective Tone', value: formatHzLabel(feat), sub: 'Comparison frequency' },
          { label: 'Flatness', value: safeNum(feat.spectralFlatness, 0).toFixed(2), sub: 'Texture vs airiness axis' },
          { label: 'Acoustic Biome', value: (feat.medianPitchHz || 200) < 130 ? 'Storm / Bog Mud' : 'Engine / Steam Vent', sub: 'Environmental zone' }
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
        ? 'Detected concentrated 22–42 Hz bilabial lip-trill periodic modulation (' + Math.round(lipTrillPeakHz || modRateHz) + ' Hz peak) — stronger oral embouchure signature than 6–20 Hz cheek flutter.'
        : airflowTurbulenceScore >= 70
          ? 'Strong turbulence signatures, explosive attack (' + (attackSec * 1000).toFixed(0) + ' ms), and ' + Math.round(modRateHz) + ' Hz cheek flutter support authenticity.'
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
        quip: 'Informational heuristic origin check (Organic vs Mouth Suspicion) — excluded from similarity scoring & rankings.',
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
      sub: a.tier.label + ' · Organic ' + a.organicProbability + '% · Mouth Suspicion ' + a.mouthSuspicion + '% · Confidence: ' + a.confidenceLevel,
      quip: 'Informational origin check — heuristic estimate of natural acoustic release vs mouth-generated mimicry.',
      status: a.tier.label,
      color: a.tier.color,
      tone: a.tier.tone
    };
  }

  function drawAuthenticityPlot(target, authA, authB, labelA, labelB) {
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
      ctx.fillStyle = row.polarity === 'overall' ? '#F8FAFC' : '#CBD5E1';
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
      '      <div class="labs-fact-box"><span>Mouth-Fart Suspicion Level</span><strong>' + auth.mouthSuspicion + '%</strong><small class="labs-fact-sub">Oral mimicry likelihood</small></div>' +
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
      '    <div class="labs-eyebrow">INFORMATIONAL DSP HEURISTICS · NOT USED IN GAME SCORING</div>' +
      '    <div class="labs-expanded-note">' + esc(extraNote || 'Pure heuristic acoustic evaluation of natural gastrointestinal release vs mouth-generated emission signatures. Results express probability only.') + '</div>' +
      '  </div>' +
      '  <button type="button" class="labs-btn-ghost labs-btn-sm labs-acc-close">✕ Collapse</button>' +
      '</div>' +
      renderAuthenticityGaugeHtml(auth, 'SPECIMEN ORIGIN TELEMETRY') +
      '<div class="labs-chart-box-inner" style="margin:12px 0">' +
      '  <div class="labs-chart-box-head"><span>Authenticity Indicator Matrix</span><small>Heuristic DSP signals (0–100%)</small></div>' +
      '  <canvas class="labs-2d-canvas" data-auth-chart="single" style="height:220px"></canvas>' +
      '</div>' +
      '<div class="labs-eyebrow" style="margin:8px 0 6px">DETAILED BREAKDOWN (7 INDICATORS + OVERALL SCORE)</div>' +
      renderAuthenticityBreakdownRowsHtml(auth.breakdown) +
      '<div class="labs-formula-strip"><span class="formula-tag">HEURISTIC ENGINE</span> <code>Authenticity = 100 * sum(w_i * OrganicTrait_i); Confidence = Consensus(7) + Duration + SNR (Zero Game Score Impact)</code></div>'
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
      '    <div class="labs-eyebrow">INFORMATIONAL ORIGIN AUDIT · ZERO IMPACT ON SIMILARITY SCORING</div>' +
      '    <div class="labs-expanded-note">Independent probabilistic heuristic scan for both specimens. Acoustic similarity rankings remain purely spectral and temporal based.</div>' +
      '  </div>' +
      '  <button type="button" class="labs-btn-ghost labs-btn-sm labs-acc-close">✕ Collapse</button>' +
      '</div>' +
      '<div class="labs-auth-cmp-grid">' +
      '  <div class="labs-auth-cmp-col">' + renderAuthenticityGaugeHtml(authA, 'SPECIMEN A · ' + labelA) + '</div>' +
      '  <div class="labs-auth-cmp-col">' + renderAuthenticityGaugeHtml(authB, 'SPECIMEN B · ' + labelB) + '</div>' +
      '</div>' +
      '<div class="labs-chart-box-inner" style="margin:12px 0">' +
      '  <div class="labs-chart-box-head"><span>Side-by-Side Authenticity Telemetry</span><small>Blue: ' + esc(labelA) + ' · Rose: ' + esc(labelB) + '</small></div>' +
      '  <canvas class="labs-2d-canvas" data-auth-chart="compare" style="height:220px"></canvas>' +
      '</div>' +
      '<div class="labs-eyebrow" style="margin:8px 0 6px">DETAILED BREAKDOWN (7 INDICATORS + OVERALL SCORE)</div>' +
      '<div class="labs-auth-breakdown">' + rowsHtml + '</div>' +
      '<div class="labs-formula-strip"><span class="formula-tag">HEURISTIC ENGINE</span> <code>Pure DSP indicators only · Informational laboratory telemetry (0% weight in acoustic similarity scoring)</code></div>'
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
    var specWobble = pickScientistComment('wobble', label + '|spec3d', 2);
    var rareDispatch = pickRareComment(label + '|' + prof.durationLabel + '|single');
    var archCmp = buildArchiveComparison(feat, bonus, opts.archiveSamples, label + '|' + prof.durationLabel);
    var shareVerdict = pickShareableVerdict(label + '|' + prof.durationLabel + '|' + ml.topClass.name);
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
      ? '<button type="button" class="labs-btn labs-btn-emerald labs-btn-sm labs-single-primary">' + esc(opts.primaryLabel || '🔬 Comparative Analysis') + '</button>'
      : '';

    var rowsHtml = renderMetricRowsHtml(displayGauges, { expandable: true });

    function renderChartStoryInner(desc, fallbackSciId) {
      if (!desc) return '';
      var sci = getScientistById(desc.scientistId || fallbackSciId || 'wobble');
      return (
        '<div class="labs-story-head">' +
        '  <span class="labs-eyebrow">LABORATORY OBSERVATION</span>' +
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
        '  <div class="labs-chart-story-box" id="' + uid + key + '_story">' + renderChartStoryInner(activeDesc, cm.scientistId) + '</div>' +
        '  <div class="labs-chart-card-actions">' +
        '    <button type="button" class="labs-btn labs-btn-blue labs-btn-sm labs-chart-view-details-btn" data-view-chart="' + esc(key) + '">🔍 View Details</button>' +
        '    <button type="button" class="labs-btn-ghost labs-btn-sm labs-chart-drill-btn" data-drill="' + esc(key) + '" aria-expanded="false">🔬 Scientific Drill-Down &amp; Archive Notes</button>' +
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
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-s-share">📤 Share</button>' +
      '      <button type="button" class="labs-btn-ghost labs-btn-sm labs-s-pdf">📄 PDF</button>' +
      '      <button type="button" class="labs-btn labs-btn-purple labs-btn-sm labs-s-email-report">📧 Email (Audio + PDF)</button>' +
      '    </div>' +
      '    <div class="labs-fn-meta-row">' +
      '      <button type="button" class="labs-twin-pill labs-s-ml-cue">🤖 ML Profile: <strong>' + esc(ml.topClass.emoji + ' ' + ml.topClass.name) + '</strong> (' + ml.confidence + '% confidence)</button>' +
      '      <span class="labs-ass-badge">Analysis performed using ' + esc(INSTITUTE.aiAcronym + ' ' + INSTITUTE.aiVersion) + '</span>' +
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
      renderScientistCommentHtml(specWobble.scientistId, specWobble.quote, '3D Spectrogram Commentary') +
      '  </section>' +
      '  <section class="labs-glass-card labs-analysis-card">' +
      '    <div class="labs-analysis-head">' +
      '      <div>' +
      '        <div class="labs-eyebrow">ANALYSIS DASHBOARD · LABORATORY FINDINGS</div>' +
      '        <h3 class="labs-section-title">Research Summary &amp; Expandable Telemetry</h3>' +
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
      renderScientistCommentHtml(sciComment.scientistId, sciComment.quote, sciComment.label) +
      renderRareCommentHtml(rareDispatch) +
      '    <div class="labs-single-facts-grid">' +
      '      <div class="labs-fact-box"><span>ML Classification</span><strong>' + esc(ml.topClass.emoji + ' ' + ml.topClass.name + ' (' + ml.confidence + '%)') + '</strong></div>' +
      '      <div class="labs-fact-box"><span>Fart Piano Key</span><strong>' + esc(noteStr) + '</strong></div>' +
      (bonus
        ? '<div class="labs-fact-box"><span>Squelch / Laundry Risk</span><strong>' + esc(bonus.wetness.wetA + '% · ' + bonus.wetness.labelA) + '</strong></div>' +
          '<div class="labs-fact-box"><span>Sound Twin</span><strong>' + esc(bonus.acoustics.twinA.emoji + ' ' + bonus.acoustics.twinA.name) + '</strong></div>' +
          '<div class="labs-fact-box"><span>Acoustic Alibi</span><strong>' + esc(bonus.social.a.verdict) + '</strong></div>'
        : '') +
      '    </div>' +
      renderArchiveComparisonHtml(archCmp) +
      '    <div class="labs-hint-text">Tap any of the ' + displayGauges.length + ' metrics below to expand charts, scientific commentary, stats &amp; equation inline.</div>' +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '    <hr class="labs-analysis-divider" />' +
      '    <div class="labs-eyebrow">INTERACTIVE CORE SPECTRAL &amp; TEMPORAL PLOTS (TAP ANY BAR, POINT, OR HOTSPOT)</div>' +
      '    <div class="labs-single-charts-grid">' +
      renderFinalChartCardHtml('c_spec', '40-Band FFT Energy Spectrum', 'Centroid ' + Math.round(safeNum(feat.spectralCentroidHz, 0)) + ' Hz') +
      renderFinalChartCardHtml('c_pitch', 'Pitch & Frequency Sweep', '32-frame F0 tracker') +
      renderFinalChartCardHtml('c_mod', 'Modulation & Flutter FFT (4–45 Hz)', 'Depth ' + (safeNum(feat.modDepth, 0) * 100).toFixed(0) + '%') +
      renderFinalChartCardHtml('c_env', 'Blast Pressure Envelope', 'Attack / T50 / Decay') +
      '    </div>' +
      '  </section>' +
      renderShareableVerdictHtml(shareVerdict, label, ml.topClass.name + ' · ' + archCmp.energyPct + 'th Energy Pct') +
      renderReportSignatureHtml(label + '|' + prof.durationLabel + '|single') +
      '</div>';

    function redrawExpandedSingle() {
      if (!activeDialId || !activeSlotEl) return;
      if (activeDialId === 's_authenticity') {
        var authCanvas = activeSlotEl.querySelector('canvas[data-auth-chart]');
        if (authCanvas) drawAuthenticityPlot(authCanvas, auth);
        return;
      }
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
        '<div class="labs-single-facts-grid">' + statsHtml + '</div>' +
        '<div class="labs-formula-strip"><span class="formula-tag">EQUATION</span> <code>' + esc(rep.formula) + '</code></div>' +
        '<div class="labs-acc-sci-slot">' +
        renderScientistCommentHtml(repSci.scientistId, repSci.quote, 'Specialist Metric Observation') +
        '</div>';

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
      var storyEl = mountEl.querySelector('#' + uid + chartKey + '_story');
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
        if (storyEl && desc) storyEl.innerHTML = renderChartStoryInner(desc, cm.scientistId);
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
        var storyEl = mountEl.querySelector('#' + uid + ck + '_story');
        if (readEl) readEl.textContent = cm.sampleAtNorm(matched.norm);
        if (storyEl) storyEl.innerHTML = renderChartStoryInner(matched, cm.scientistId);
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
          ? '🔬 Scientific Drill-Down & Archive Notes'
          : '✕ Hide Scientific Drill-Down';
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
        if (opts.onShare) opts.onShare(sound, [specCanvas]);
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
        sub: (m.count || 0) + ' Vault fronts',
        quip: cohScore >= 70 ? 'Disturbingly consistent weather-front pressure — feels almost coordinated.' : 'Wild mood swings from calm Zen drizzle straight into swamp-boot chaos.'
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
    var rowsHtml = renderMetricRowsHtml(gauges, { expandable: false }) + renderMetricRowsHtml([authGrpRow], { expandable: true });
    var grpComment = pickScientistComment('bottomsworth', g.name + '|' + sortLabel, 1);
    grpComment.label = 'Conductor Acoustic Review';
    var specWobble = pickScientistComment('wobble', g.name + '|spec3d', 0);
    var rareDispatch = pickRareComment(g.name + '|' + sortLabel + '|group');
    var archCmp = buildArchiveComparison(g.features, null, opts.archiveSamples || null, g.name + '|grp');
    var shareVerdict = pickShareableVerdict(g.name + '|' + sortLabel + '|megamix');

    mountEl.innerHTML =
      '<div class="labs-fartnalysis-root">' +
      '  <section class="labs-glass-card labs-fn-header">' +
      '    <div class="labs-fn-header-top">' +
      '      <div>' +
      '        <div class="labs-eyebrow">MULTI-SPECIMEN MEGAMIX · RESEARCH SUMMARY</div>' +
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
      '    <div class="labs-fn-meta-row">' +
      '      <span class="labs-ass-badge">Analysis performed using ' + esc(INSTITUTE.aiAcronym + ' ' + INSTITUTE.aiVersion) + '</span>' +
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
      renderScientistCommentHtml(specWobble.scientistId, specWobble.quote, '3D Ensemble Topology Note') +
      '    <div class="labs-group-wave-wrap">' +
      '      <div class="labs-chart-box-head"><span>Composite Storm-Front Waveform</span><small>Color-coded Vault Specimens in Active Order</small></div>' +
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
      renderScientistCommentHtml(grpComment.scientistId, grpComment.quote, grpComment.label) +
      renderRareCommentHtml(rareDispatch) +
      renderArchiveComparisonHtml(archCmp) +
      '    <div class="labs-metric-list">' +
      rowsHtml +
      '    </div>' +
      '    <hr class="labs-analysis-divider" />' +
      '    <div class="labs-single-charts-grid">' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>Vault Specimen Map (Pitch × Moisture)</span><small>Spatial acoustic spread</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_map"></canvas>' +
      '        <div class="labs-chart-obs"><img src="' + esc(getScientistById('pufferton').img) + '" alt="Dr. Pufferton" loading="lazy" /><span><strong>Archive Classification:</strong> Constellation spans ' + (g.segments || []).length + ' cataloged Vault movements — Dr. Pufferton had to open a second wing just to shelve it cleanly. <em>(Dr. Pufferton)</em></span></div>' +
      '      </div>' +
      '      <div class="labs-chart-box-inner">' +
      '        <div class="labs-chart-box-head"><span>Combined 40-Band FFT Spectrum</span><small>Aggregate frequency energy</small></div>' +
      '        <canvas class="labs-2d-canvas" id="' + uid + 'c_spec"></canvas>' +
      '        <div class="labs-chart-obs"><img src="' + esc(getScientistById('wobble').img) + '" alt="Dr. Wobble" loading="lazy" /><span><strong>Laboratory Observation:</strong> Aggregate harmonic centroid achieved such unexpected symphonic richness that Dr. Wobble requested Carnegie Hall pricing. <em>(Dr. Wobble)</em></span></div>' +
      '      </div>' +
      '    </div>' +
      '  </section>' +
      renderShareableVerdictHtml(shareVerdict, g.name, (g.segments || []).length + ' Vault Movements') +
      renderReportSignatureHtml(g.name + '|' + sortLabel + '|group') +
      '</div>';

    function drawGroupVisuals() {
      drawSegmentedWaveform(mountEl.querySelector('#' + uid + 'c_wave'), g, lastProg);
      drawConstellationPlot(mountEl.querySelector('#' + uid + 'c_map'), g);
      drawSpectrumPlot(mountEl.querySelector('#' + uid + 'c_spec'), g.features, '#22C55E');
      if (authGrpOpen && authGrpSlotEl) {
        var ac = authGrpSlotEl.querySelector('canvas[data-auth-chart]');
        if (ac) drawAuthenticityPlot(ac, authGrp);
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
          'Heuristic origin evaluation computed across the combined multi-fart master track and movement spectrum (informational only).'
        );
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

    var shareGrpBtn = mountEl.querySelector('.labs-g-share');
    if (shareGrpBtn) {
      shareGrpBtn.addEventListener('click', function () {
        if (opts.onShare) opts.onShare(g, [specCanvas]);
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
