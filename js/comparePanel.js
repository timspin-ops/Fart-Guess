(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  var uidCounter = 0;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatHz(feat) {
    if (!feat) return '—';
    if (feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0) {
      return Math.round(feat.medianPitchHz) + ' Hz';
    }
    return 'Airy (~' + Math.round(feat.spectralCentroidHz || 0) + ' Hz)';
  }

  function scoreColor(score) {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#d97706';
    return '#e11d48';
  }

  function buildClipBadge(sound) {
    if (sound.clipInfo && sound.clipInfo.originalDuration > sound.samples.length / sound.sampleRate + 0.08) {
      return (
        '<span class="badge badge-clip">Auto-Clipped ' +
        sound.clipInfo.originalDuration.toFixed(2) +
        's → ' +
        (sound.samples.length / sound.sampleRate).toFixed(2) +
        's</span>'
      );
    }
    return (
      '<span class="badge badge-dur">' +
      (sound.samples.length / sound.sampleRate).toFixed(2) +
      's</span>'
    );
  }

  function ComparePanel(containerEl, options) {
    this.container = containerEl;
    this.options = options || {};
    this.soundA = this.options.soundA;
    this.soundB = this.options.soundB;
    this.idPrefix = 'cmp_' + (++uidCounter) + '_';

    var featA = this.soundA.features || TootApp.DSP.extractFeatures(this.soundA.samples, this.soundA.sampleRate);
    var featB = this.soundB.features || TootApp.DSP.extractFeatures(this.soundB.samples, this.soundB.sampleRate);
    this.soundA.features = featA;
    this.soundB.features = featB;

    this.result = this.options.result || TootApp.DSP.compareSounds(featA, featB);
    this.sync3d = true;
    this.colormap = this.options.initialColormap || 'plasma';
    this.activeCriterion = null;
    this.specA = null;
    this.specB = null;
    this.chanA = this.idPrefix + 'A';
    this.chanB = this.idPrefix + 'B';

    this._render();
  }

  ComparePanel.prototype._render = function () {
    if (!this.container || !this.soundA || !this.soundB) return;
    var r = this.result;
    var fA = this.soundA.features;
    var fB = this.soundB.features;
    var labelA = this.options.labelA || 'Sound A';
    var labelB = this.options.labelB || 'Sound B';

    var radius = 44;
    var circumference = 2 * Math.PI * radius;
    var dashOffset = circumference * (1 - Math.max(0, Math.min(100, r.overall)) / 100);
    var ringColor = scoreColor(r.overall);

    var tipsHtml = (r.tips || [])
      .map(function (t) {
        return '<li>' + esc(t) + '</li>';
      })
      .join('');

    var coreCriteria = [
      {
        key: 'duration',
        name: 'Duration Match',
        score: r.durationScore,
        detail: fA.duration.toFixed(2) + 's vs ' + fB.duration.toFixed(2) + 's'
      },
      {
        key: 'pitch',
        name: 'Pitch & Sweep',
        score: r.pitchScore,
        detail: formatHz(fA) + ' vs ' + formatHz(fB)
      },
      {
        key: 'modulation',
        name: 'Flutter & Bursts',
        score: r.modulationScore,
        detail:
          fA.burstCount +
          ' burst' +
          (fA.burstCount === 1 ? '' : 's') +
          ' vs ' +
          fB.burstCount +
          ' burst' +
          (fB.burstCount === 1 ? '' : 's')
      },
      {
        key: 'timbre',
        name: 'Timbre & Resonance',
        score: r.timbreScore,
        detail: Math.round(fA.spectralCentroidHz) + ' Hz vs ' + Math.round(fB.spectralCentroidHz) + ' Hz'
      },
      {
        key: 'envelope',
        name: 'Blast Envelope',
        score: r.envelopeScore,
        detail: 'Attack & decay shape'
      }
    ];

    var bonus =
      TootApp.Forensics && typeof TootApp.Forensics.computeBonusMetrics === 'function'
        ? TootApp.Forensics.computeBonusMetrics(fA, fB)
        : null;

    var bonusCriteria = bonus
      ? [
          {
            key: 'wetness',
            name: '💦 Squelch Index',
            score: bonus.wetness.matchScore,
            detail: bonus.wetness.wetA + '% vs ' + bonus.wetness.wetB + '%'
          },
          {
            key: 'acoustics',
            name: '🎺 Sound Twin',
            score: bonus.acoustics.matchScore,
            detail:
              bonus.acoustics.twinA.emoji +
              ' ' +
              bonus.acoustics.twinA.short +
              ' vs ' +
              bonus.acoustics.twinB.emoji +
              ' ' +
              bonus.acoustics.twinB.short
          },
          {
            key: 'social',
            name: '🛋️ Elevator Alibi',
            score: bonus.social.matchScore,
            detail: bonus.social.a.radiusM.toFixed(1) + 'm vs ' + bonus.social.b.radiusM.toFixed(1) + 'm blast'
          }
        ]
      : [];

    function renderAccordionItem(m) {
      var col = scoreColor(m.score);
      return (
        '<div class="criterion-item" data-criterion-item="' +
        esc(m.key) +
        '">' +
        '  <button type="button" class="criterion-row" data-criterion="' +
        esc(m.key) +
        '">' +
        '    <div class="criterion-head">' +
        '      <span class="criterion-name">' + esc(m.name) + '</span>' +
        '      <span class="criterion-detail">' + esc(m.detail) + '</span>' +
        '      <span class="criterion-val" style="color:' + col + '">' + m.score + '%</span>' +
        '      <span class="criterion-chevron" aria-hidden="true">›</span>' +
        '    </div>' +
        '    <div class="metric-track">' +
        '      <div class="metric-fill" style="width:' + m.score + '%;background:' + col + '"></div>' +
        '    </div>' +
        '  </button>' +
        '  <div class="criterion-accordion hidden" data-accordion="' +
        esc(m.key) +
        '"></div>' +
        '</div>'
      );
    }

    var coreHtml = coreCriteria.map(renderAccordionItem).join('');
    var bonusHtml = bonusCriteria.length > 0
      ? '<div class="criteria-section-label">Bonus Fartnalysis</div>' + bonusCriteria.map(renderAccordionItem).join('')
      : '';

    var showScoreHero = this.options.showScoreHero !== false;
    var scoreSectionHtml = showScoreHero
      ? '<div class="criterion-item" data-criterion-item="overall">' +
        '  <div class="compare-score-summary">' +
        '    <button type="button" class="gauge-wrap gauge-btn" data-criterion="overall" title="Inspect Overall Synthesis">' +
        '      <svg class="score-gauge" viewBox="0 0 110 110">' +
        '        <circle class="gauge-bg" cx="55" cy="55" r="' + radius + '"></circle>' +
        '        <circle class="gauge-fg" cx="55" cy="55" r="' + radius + '" stroke="' + ringColor + '" stroke-dasharray="' + circumference.toFixed(2) + '" stroke-dashoffset="' + dashOffset.toFixed(2) + '"></circle>' +
        '      </svg>' +
        '      <div class="gauge-center">' +
        '        <div class="gauge-pct" style="color:' + ringColor + '">' + r.overall + '%</div>' +
        '        <div class="gauge-sub">OVERALL</div>' +
        '        <div class="gauge-inspect-cue">Inspect ›</div>' +
        '      </div>' +
        '    </button>' +
        '    <div class="score-verdict">' +
        '      <div class="verdict-top">' +
        '        <span class="grade-pill" style="border-color:' + ringColor + ';color:' + ringColor + '">Grade ' + esc(r.grade) + '</span>' +
        '        <h3 class="verdict-title">' + esc(r.title) + '</h3>' +
        '      </div>' +
        '      <ul class="verdict-tips">' + tipsHtml + '</ul>' +
        '    </div>' +
        '  </div>' +
        '  <div class="criterion-accordion hidden" data-accordion="overall"></div>' +
        '</div>' +
        '<div class="criteria-accordion-list">' +
        '  <div class="criteria-section-label">Matching Criteria (tap any row to open analysis underneath)</div>' +
        coreHtml +
        bonusHtml +
        '</div>'
      : '';

    var presetButtons =
      '<div class="spec-toolbar">' +
      '  <button type="button" class="chip-btn active" data-preset="3d">3D</button>' +
      '  <button type="button" class="chip-btn" data-preset="top">Top</button>' +
      '  <button type="button" class="chip-btn" data-preset="side">Side</button>' +
      '  <button type="button" class="chip-btn" data-preset="spin">Spin</button>' +
      '</div>';

    this.container.innerHTML =
      '<div class="compare-panel">' +
      scoreSectionHtml +
      '  <div class="compare-toolbar card-glass">' +
      '    <div class="compare-toolbar-btns">' +
      '      <button type="button" class="btn btn-lime btn-sm btn-back-to-back" title="Play Sound A followed immediately by Sound B">⚡ Back-to-Back (A → B)</button>' +
      '      <button type="button" class="btn btn-magenta btn-sm btn-overlay" title="Play both sounds together">🔀 Overlay</button>' +
      '      <button type="button" class="btn btn-ghost btn-sm btn-stop-both">⏹ Stop</button>' +
      '    </div>' +
      '    <div class="compare-toolbar-opts">' +
      '      <label class="toggle-chip"><input type="checkbox" class="chk-sync-3d" checked /> 🔗 Sync 3D Angle</label>' +
      '      <label class="select-chip">Palette ' +
      '        <select class="sel-colormap">' +
      '          <option value="plasma"' + (this.colormap === 'plasma' ? ' selected' : '') + '>Plasma</option>' +
      '          <option value="toxic"' + (this.colormap === 'toxic' ? ' selected' : '') + '>Toxic</option>' +
      '          <option value="magma"' + (this.colormap === 'magma' ? ' selected' : '') + '>Magma</option>' +
      '        </select>' +
      '      </label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="spec-side-by-side">' +
      '    <div class="compare-side card-glass" data-side="A">' +
      '      <div class="side-header">' +
      '        <div>' +
      '          <span class="side-role">' + esc(labelA) + '</span>' +
      '          <h4 class="side-title">' + esc(this.soundA.emoji || '💨') + ' ' + esc(this.soundA.name) + '</h4>' +
      '        </div>' +
      '        ' + buildClipBadge(this.soundA) +
      '      </div>' +
      '      <div class="side-controls">' +
      '        <button type="button" class="btn btn-cyan btn-sm btn-play-a">▶ Play A</button>' +
      presetButtons +
      '      </div>' +
      '      <div class="spec-viewport-wrap">' +
      '        <div class="spec-viewport-header"><span>3D Spectrogram — ' + esc(this.soundA.name) + '</span></div>' +
      '        <canvas class="spec-canvas-a spec-canvas"></canvas>' +
      '      </div>' +
      '    </div>' +
      '    <div class="compare-side card-glass" data-side="B">' +
      '      <div class="side-header">' +
      '        <div>' +
      '          <span class="side-role">' + esc(labelB) + '</span>' +
      '          <h4 class="side-title">' + esc(this.soundB.emoji || '🎤') + ' ' + esc(this.soundB.name) + '</h4>' +
      '        </div>' +
      '        ' + buildClipBadge(this.soundB) +
      '      </div>' +
      '      <div class="side-controls">' +
      '        <button type="button" class="btn btn-magenta btn-sm btn-play-b">▶ Play B</button>' +
      presetButtons +
      '      </div>' +
      '      <div class="spec-viewport-wrap">' +
      '        <div class="spec-viewport-header"><span>3D Spectrogram — ' + esc(this.soundB.name) + '</span></div>' +
      '        <canvas class="spec-canvas-b spec-canvas"></canvas>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    this._initSpectrograms();
    this._bindEvents();
  };

  ComparePanel.prototype._initSpectrograms = function () {
    var canvasA = this.container.querySelector('.spec-canvas-a');
    var canvasB = this.container.querySelector('.spec-canvas-b');
    this.specA = new TootApp.Spectrogram3D(canvasA, {
      spectrogram: this.soundA.features.spectrogram,
      colormap: this.colormap
    });
    this.specB = new TootApp.Spectrogram3D(canvasB, {
      spectrogram: this.soundB.features.spectrogram,
      colormap: this.colormap
    });
    this.specA.linkPartner(this.specB);
  };

  ComparePanel.prototype._bindEvents = function () {
    var self = this;
    var rootEl = this.container;

    rootEl.querySelector('.btn-play-a').addEventListener('click', function () {
      TootApp.Audio.playSound(self.soundA.samples, self.soundA.sampleRate, {
        playbackRate: 1.0,
        channel: self.chanA,
        onProgress: function (p) {
          if (self.specA) self.specA.setPlayhead(p);
        },
        onEnded: function () {
          if (self.specA) self.specA.setPlayhead(null);
        }
      });
    });

    rootEl.querySelector('.btn-play-b').addEventListener('click', function () {
      TootApp.Audio.playSound(self.soundB.samples, self.soundB.sampleRate, {
        playbackRate: 1.0,
        channel: self.chanB,
        onProgress: function (p) {
          if (self.specB) self.specB.setPlayhead(p);
        },
        onEnded: function () {
          if (self.specB) self.specB.setPlayhead(null);
        }
      });
    });

    rootEl.querySelector('.btn-back-to-back').addEventListener('click', function () {
      TootApp.Audio.playSequence(
        [
          {
            samples: self.soundA.samples,
            sampleRate: self.soundA.sampleRate,
            playbackRate: 1.0,
            channel: self.chanA,
            onProgress: function (p) {
              if (self.specA) self.specA.setPlayhead(p);
            },
            onEnded: function () {
              if (self.specA) self.specA.setPlayhead(null);
            }
          },
          {
            samples: self.soundB.samples,
            sampleRate: self.soundB.sampleRate,
            playbackRate: 1.0,
            channel: self.chanB,
            onProgress: function (p) {
              if (self.specB) self.specB.setPlayhead(p);
            },
            onEnded: function () {
              if (self.specB) self.specB.setPlayhead(null);
            }
          }
        ],
        240
      );
    });

    rootEl.querySelector('.btn-overlay').addEventListener('click', function () {
      TootApp.Audio.playSimultaneous([
        {
          samples: self.soundA.samples,
          sampleRate: self.soundA.sampleRate,
          playbackRate: 1.0,
          channel: self.chanA,
          onProgress: function (p) {
            if (self.specA) self.specA.setPlayhead(p);
          },
          onEnded: function () {
            if (self.specA) self.specA.setPlayhead(null);
          }
        },
        {
          samples: self.soundB.samples,
          sampleRate: self.soundB.sampleRate,
          playbackRate: 1.0,
          channel: self.chanB,
          onProgress: function (p) {
            if (self.specB) self.specB.setPlayhead(p);
          },
          onEnded: function () {
            if (self.specB) self.specB.setPlayhead(null);
          }
        }
      ]);
    });

    rootEl.querySelector('.btn-stop-both').addEventListener('click', function () {
      TootApp.Audio.stopAll();
      if (self.specA) self.specA.setPlayhead(null);
      if (self.specB) self.specB.setPlayhead(null);
    });

    rootEl.querySelector('.chk-sync-3d').addEventListener('change', function (e) {
      self.sync3d = e.target.checked;
      if (self.specA) self.specA.setSyncEnabled(self.sync3d);
      if (self.specB) self.specB.setSyncEnabled(self.sync3d);
    });

    rootEl.querySelector('.sel-colormap').addEventListener('change', function (e) {
      self.colormap = e.target.value;
      if (self.specA) self.specA.setColormap(self.colormap);
      if (self.specB) self.specB.setColormap(self.colormap);
    });

    function bindSpecToolbar(sideSelector, getSpec) {
      var btns = rootEl.querySelectorAll(sideSelector + ' [data-preset]');
      for (var j = 0; j < btns.length; j++) {
        btns[j].addEventListener('click', function () {
          var preset = this.getAttribute('data-preset');
          var spec = getSpec();
          if (!spec) return;
          if (preset === 'spin') {
            var spinning = spec.toggleAutoRotate();
            this.classList.toggle('active', spinning);
          } else {
            for (var k = 0; k < btns.length; k++) {
              var bP = btns[k].getAttribute('data-preset');
              if (bP !== 'spin') btns[k].classList.remove('active');
            }
            this.classList.add('active');
            spec.setPreset(preset);
          }
        });
      }
    }

    bindSpecToolbar('[data-side="A"]', function () { return self.specA; });
    bindSpecToolbar('[data-side="B"]', function () { return self.specB; });

    var criterionBtns = rootEl.querySelectorAll('[data-criterion]');
    for (var cb = 0; cb < criterionBtns.length; cb++) {
      criterionBtns[cb].addEventListener('click', function () {
        self.openCriterion(this.getAttribute('data-criterion'));
      });
    }
  };

  ComparePanel.prototype.openCriterion = function (key) {
    var rootEl = this.container;
    if (!rootEl || !TootApp.Forensics) return;
    if (this.activeCriterion === key) {
      this.closeCriterion();
      return;
    }

    this.closeCriterion();
    this.activeCriterion = key;

    var btns = rootEl.querySelectorAll('[data-criterion]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active-criterion', btns[i].getAttribute('data-criterion') === key);
    }

    var itemEl = rootEl.querySelector('.criterion-item[data-criterion-item="' + key + '"]');
    if (itemEl) itemEl.classList.add('is-open');

    var slot = rootEl.querySelector('.criterion-accordion[data-accordion="' + key + '"]');
    if (!slot) return;
    slot.classList.remove('hidden');

    var self = this;
    var renderNow = function () {
      TootApp.Forensics.renderForensicsDrawer(
        slot,
        key,
        self.soundA,
        self.soundB,
        self.result,
        null,
        function () {
          self.closeCriterion();
        },
        { inlineAccordion: true }
      );
      if (typeof slot.scrollIntoView === 'function') {
        try {
          slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {}
      }
    };

    if (typeof root.requestAnimationFrame === 'function') {
      root.requestAnimationFrame(renderNow);
    } else {
      renderNow();
    }
  };

  ComparePanel.prototype.closeCriterion = function () {
    var rootEl = this.container;
    if (!rootEl) return;
    this.activeCriterion = null;

    var slots = rootEl.querySelectorAll('.criterion-accordion');
    for (var s = 0; s < slots.length; s++) {
      slots[s].classList.add('hidden');
    }

    var items = rootEl.querySelectorAll('.criterion-item');
    for (var j = 0; j < items.length; j++) {
      items[j].classList.remove('is-open');
    }

    var btns = rootEl.querySelectorAll('[data-criterion]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.remove('active-criterion');
    }
  };

  ComparePanel.prototype.resize = function () {
    if (this.specA) this.specA.resize();
    if (this.specB) this.specB.resize();
    if (this.activeCriterion && this.container && TootApp.Forensics && TootApp.Forensics.redrawDrawer) {
      var slot = this.container.querySelector('.criterion-accordion[data-accordion="' + this.activeCriterion + '"]');
      if (slot && !slot.classList.contains('hidden')) {
        TootApp.Forensics.redrawDrawer(slot);
      }
    }
  };

  ComparePanel.prototype.destroy = function () {
    TootApp.Audio.stopChannel(this.chanA);
    TootApp.Audio.stopChannel(this.chanB);
    if (this.specA) {
      this.specA.destroy();
      this.specA = null;
    }
    if (this.specB) {
      this.specB.destroy();
      this.specB = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  };

  TootApp.ComparePanel = ComparePanel;
})(typeof window !== 'undefined' ? window : globalThis);
