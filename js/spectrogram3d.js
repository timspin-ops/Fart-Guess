(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  var COLORMAPS = {
    plasma: [
      [0.0, [15, 34, 96]],
      [0.18, [24, 94, 196]],
      [0.36, [26, 180, 178]],
      [0.54, [102, 224, 96]],
      [0.72, [248, 224, 72]],
      [0.88, [242, 126, 40]],
      [1.0, [220, 36, 56]]
    ],
    scientific: [
      [0.0, [15, 34, 96]],
      [0.18, [24, 94, 196]],
      [0.36, [26, 180, 178]],
      [0.54, [102, 224, 96]],
      [0.72, [248, 224, 72]],
      [0.88, [242, 126, 40]],
      [1.0, [220, 36, 56]]
    ],
    toxic: [
      [0.0, [10, 22, 34]],
      [0.25, [12, 78, 88]],
      [0.52, [24, 168, 108]],
      [0.78, [146, 242, 68]],
      [1.0, [238, 255, 175]]
    ],
    magma: [
      [0.0, [11, 10, 22]],
      [0.25, [86, 18, 72]],
      [0.52, [196, 46, 56]],
      [0.78, [248, 142, 48]],
      [1.0, [255, 248, 214]]
    ]
  };

  function sampleColormap(name, val, shade, alpha) {
    var stops = COLORMAPS[name] || COLORMAPS.plasma;
    var v = val < 0 ? 0 : val > 1 ? 1 : val;
    var s = typeof shade === 'number' ? shade : 1.0;

    var c0 = stops[0];
    var c1 = stops[stops.length - 1];
    for (var i = 0; i < stops.length - 1; i++) {
      if (v >= stops[i][0] && v <= stops[i + 1][0]) {
        c0 = stops[i];
        c1 = stops[i + 1];
        break;
      }
    }
    var span = c1[0] - c0[0];
    var t = span > 1e-6 ? (v - c0[0]) / span : 0;
    var r = Math.round((c0[1][0] + (c1[1][0] - c0[1][0]) * t) * s);
    var g = Math.round((c0[1][1] + (c1[1][1] - c0[1][1]) * t) * s);
    var b = Math.round((c0[1][2] + (c1[1][2] - c0[1][2]) * t) * s);
    r = r < 0 ? 0 : r > 255 ? 255 : r;
    g = g < 0 ? 0 : g > 255 ? 255 : g;
    b = b < 0 ? 0 : b > 255 ? 255 : b;
    if (typeof alpha === 'number') {
      var a = clamp(alpha, 0, 1);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
    }
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function Spectrogram3D(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    options = options || {};

    this.spectrogram = options.spectrogram || null;
    this.azimuth = typeof options.azimuth === 'number' ? options.azimuth : 0.60;
    this.elevation = typeof options.elevation === 'number' ? options.elevation : 0.48;
    this.zoom = typeof options.zoom === 'number' ? options.zoom : 1.06;
    this.colormap = options.colormap || 'plasma';
    this.wireframe = options.wireframe !== false;
    this.autoRotate = Boolean(options.autoRotate);
    this.playhead = null;
    this.playbackRate = options.playbackRate || 1.0;

    this.partners = [];
    this.syncPartnersEnabled = true;

    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this._pointers = typeof Map !== 'undefined' ? new Map() : null;
    this._pinchDist = 0;
    this._projCache = null;
    this._rafAnim = null;
    this._resizeRaf = null;
    this._hasRendered = false;
    this._tweenTarget = null;
    this._lastTapTime = 0;
    this._lastTapX = 0;
    this._lastTapY = 0;
    this._destroyed = false;

    if (this.canvas && this.canvas.style) {
      this.canvas.style.touchAction = 'none';
    }
    this._bindEvents();
    this.resize();
    if (this.autoRotate) {
      this._startAnimLoop();
    }
  }

  Spectrogram3D.prototype._bindEvents = function () {
    var self = this;
    var canvas = this.canvas;

    this._onPointerDown = function (e) {
      if (e.button && e.button !== 0) return;
      if (self._pointers && e.pointerId !== undefined) {
        self._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (e.pointerType === 'touch' && (!self._pointers || self._pointers.size === 1)) {
        var nowT = Date.now();
        var distT = Math.hypot(e.clientX - self._lastTapX, e.clientY - self._lastTapY);
        if (self._lastTapTime && (nowT - self._lastTapTime) < 300 && distT < 24) {
          self._lastTapTime = 0;
          self.setPreset('3d');
        } else {
          self._lastTapTime = nowT;
          self._lastTapX = e.clientX;
          self._lastTapY = e.clientY;
        }
      }
      if (self._pointers && self._pointers.size === 2) {
        self._dragging = false;
        var pts = [];
        self._pointers.forEach(function (pt) { pts.push(pt); });
        self._pinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      } else {
        self._dragging = true;
        self._pinchDist = 0;
        self._lastX = e.clientX;
        self._lastY = e.clientY;
      }
      self._tweenTarget = null;
      if (canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
    };

    this._onPointerMove = function (e) {
      if (self._pointers && e.pointerId !== undefined && self._pointers.has(e.pointerId)) {
        self._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (self._pointers.size === 2 && self._pinchDist > 4) {
          var pts = [];
          self._pointers.forEach(function (pt) { pts.push(pt); });
          var newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          if (newDist > 4) {
            self.zoom = clamp(self.zoom * (newDist / self._pinchDist), 0.70, 2.40);
            self._pinchDist = newDist;
            self.render();
            self._notifyPartners();
          }
          return;
        }
      }
      if (!self._dragging) return;
      var dx = e.clientX - self._lastX;
      var dy = e.clientY - self._lastY;
      self._lastX = e.clientX;
      self._lastY = e.clientY;

      self.azimuth += dx * 0.009;
      self.elevation = clamp(self.elevation + dy * 0.008, 0.08, 1.54);
      self.render();
      self._notifyPartners();
    };

    this._onPointerUp = function (e) {
      if (self._pointers && e && e.pointerId !== undefined) {
        self._pointers.delete(e.pointerId);
      }
      self._pinchDist = 0;
      if (!self._pointers || self._pointers.size !== 1) {
        self._dragging = false;
      } else {
        self._pointers.forEach(function (pt) {
          self._lastX = pt.x;
          self._lastY = pt.y;
        });
        self._dragging = true;
      }
    };

    this._onWheel = function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.09 : 0.09;
      self.zoom = clamp(self.zoom + delta, 0.70, 2.40);
      self.render();
      self._notifyPartners();
    };

    this._onDblClick = function () {
      self.setPreset('3d');
    };

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
    canvas.addEventListener('dblclick', this._onDblClick);

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(function () {
        if (self._destroyed || self._resizeRaf) return;
        if (typeof requestAnimationFrame === 'function') {
          self._resizeRaf = requestAnimationFrame(function () {
            self._resizeRaf = null;
            self.resize();
          });
        } else {
          self.resize();
        }
      });
      this._resizeObserver.observe(canvas);
    }
  };

  Spectrogram3D.prototype.resize = function () {
    if (this._destroyed || !this.canvas) return;
    var rect = this.canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var targetW = Math.round(rect.width * dpr);
    var targetH = Math.round(rect.height * dpr);
    if (
      this._hasRendered &&
      this.canvas.width === targetW &&
      this.canvas.height === targetH &&
      this.width === rect.width &&
      this.height === rect.height &&
      this.dpr === dpr
    ) {
      return;
    }
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = dpr;
    this.render();
  };

  Spectrogram3D.prototype.setSpectrogram = function (spec) {
    this.spectrogram = spec || null;
    this.render();
  };

  Spectrogram3D.prototype.setColormap = function (name) {
    if (COLORMAPS[name]) {
      this.colormap = name;
      this.render();
    }
  };

  Spectrogram3D.prototype.setPlaybackRate = function (rate) {
    this.playbackRate = clamp(Number(rate) || 1.0, 0.25, 2.5);
    this.render();
  };

  Spectrogram3D.prototype.setPlayhead = function (progress01) {
    if (progress01 === null || progress01 === undefined) {
      this.playhead = null;
    } else {
      this.playhead = clamp(progress01, 0, 1);
    }
    this.render();
  };

  Spectrogram3D.prototype.setSyncEnabled = function (enabled) {
    this.syncPartnersEnabled = Boolean(enabled);
  };

  Spectrogram3D.prototype.linkPartner = function (other) {
    if (!other || other === this) return;
    if (this.partners.indexOf(other) === -1) {
      this.partners.push(other);
    }
    if (other.partners.indexOf(this) === -1) {
      other.partners.push(this);
    }
  };

  Spectrogram3D.prototype._notifyPartners = function () {
    if (!this.syncPartnersEnabled) return;
    for (var i = 0; i < this.partners.length; i++) {
      var p = this.partners[i];
      if (!p || p._destroyed) continue;
      p.azimuth = this.azimuth;
      p.elevation = this.elevation;
      p.zoom = this.zoom;
      p._tweenTarget = null;
      p.render();
    }
  };

  Spectrogram3D.prototype.setPreset = function (preset) {
    var target = { az: 0.60, el: 0.48, zoom: 1.06 };
    if (preset === 'top') {
      target = { az: 0.0, el: 1.54, zoom: 1.06 };
    } else if (preset === 'side') {
      target = { az: 0.04, el: 0.14, zoom: 1.06 };
    } else if (preset === 'front') {
      target = { az: 0.0, el: 0.16, zoom: 1.08 };
    }
    this.autoRotate = false;
    this._tweenTarget = target;
    this._startAnimLoop();

    if (this.syncPartnersEnabled) {
      for (var i = 0; i < this.partners.length; i++) {
        var p = this.partners[i];
        if (!p || p._destroyed) continue;
        p.autoRotate = false;
        p._tweenTarget = Object.assign({}, target);
        p._startAnimLoop();
      }
    }
  };

  Spectrogram3D.prototype.toggleAutoRotate = function () {
    this.autoRotate = !this.autoRotate;
    if (this.autoRotate) {
      this._tweenTarget = null;
      this._startAnimLoop();
    }
    return this.autoRotate;
  };

  Spectrogram3D.prototype._startAnimLoop = function () {
    if (this._rafAnim || this._destroyed) return;
    var self = this;
    var lastTime = performance.now();

    function step(now) {
      if (self._destroyed) {
        self._rafAnim = null;
        return;
      }
      var dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      var keepGoing = false;

      if (self.autoRotate && !self._dragging) {
        self.azimuth += dt * 0.45;
        keepGoing = true;
      } else if (self._tweenTarget) {
        var t = self._tweenTarget;
        var ease = Math.min(1, dt * 10);
        self.azimuth += (t.az - self.azimuth) * ease;
        self.elevation += (t.el - self.elevation) * ease;
        self.zoom += (t.zoom - self.zoom) * ease;
        if (
          Math.abs(t.az - self.azimuth) < 0.004 &&
          Math.abs(t.el - self.elevation) < 0.004 &&
          Math.abs(t.zoom - self.zoom) < 0.004
        ) {
          self.azimuth = t.az;
          self.elevation = t.el;
          self.zoom = t.zoom;
          self._tweenTarget = null;
        } else {
          keepGoing = true;
        }
      }

      self.render();
      if (keepGoing) {
        self._rafAnim = requestAnimationFrame(step);
      } else {
        self._rafAnim = null;
      }
    }

    this._rafAnim = requestAnimationFrame(step);
  };

  Spectrogram3D.prototype._computeProjection = function () {
    var w = Math.max(1, this.width || 320);
    var h = Math.max(1, this.height || 220);
    var centerY = 0.44;
    var camDist = 3.85;
    var cosAz = Math.cos(this.azimuth);
    var sinAz = Math.sin(this.azimuth);
    var cosEl = Math.cos(this.elevation);
    var sinEl = Math.sin(this.elevation);

    var minU = Infinity;
    var maxU = -Infinity;
    var minV = Infinity;
    var maxV = -Infinity;
    var xs = [-1, 1];
    var ys = [0, 1.05];
    var zs = [-1, 1];
    for (var xi = 0; xi < 2; xi++) {
      for (var yi = 0; yi < 2; yi++) {
        for (var zi = 0; zi < 2; zi++) {
          var cx = xs[xi];
          var cy = ys[yi] - centerY;
          var cz = zs[zi];
          var rx = cx * cosAz - cz * sinAz;
          var rz1 = cx * sinAz + cz * cosAz;
          var ry = cy * cosEl - rz1 * sinEl;
          var rz = cy * sinEl + rz1 * cosEl;
          var depth = Math.max(0.4, camDist - rz);
          var u = rx / depth;
          var v = -ry / depth;
          if (u < minU) minU = u;
          if (u > maxU) maxU = u;
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
      }
    }

    var isNarrow = w < 240;
    var showBar = w >= 210;
    var padL = isNarrow ? 8 : 22;
    var padR = showBar ? 48 : (isNarrow ? 8 : 16);
    var padT = isNarrow ? 8 : 10;
    var padB = isNarrow ? 14 : 22;
    var availW = Math.max(20, w - padL - padR);
    var availH = Math.max(20, h - padT - padB);
    var spanU = Math.max(0.05, maxU - minU);
    var spanV = Math.max(0.05, maxV - minV);
    var zoomVal = clamp(this.zoom || 1.06, 0.5, 3.0);
    var fitFov = Math.min(availW / spanU, availH / spanV) * zoomVal;
    var originX = padL + availW * 0.5 - ((minU + maxU) * 0.5) * fitFov;
    var originY = padT + availH * 0.5 - ((minV + maxV) * 0.5) * fitFov;

    this._projCache = {
      camDist: camDist,
      centerY: centerY,
      cosAz: cosAz,
      sinAz: sinAz,
      cosEl: cosEl,
      sinEl: sinEl,
      fitFov: fitFov,
      originX: originX,
      originY: originY
    };
    return this._projCache;
  };

  Spectrogram3D.prototype._project = function (x, y, z) {
    var p = this._projCache || this._computeProjection();
    var dx = x;
    var dy = y - p.centerY;
    var dz = z;

    // Rotate around Y by -azimuth
    var rx = dx * p.cosAz - dz * p.sinAz;
    var rz1 = dx * p.sinAz + dz * p.cosAz;
    var ry1 = dy;

    // Rotate around X by +elevation
    var ry = ry1 * p.cosEl - rz1 * p.sinEl;
    var rz = ry1 * p.sinEl + rz1 * p.cosEl;

    var depth = Math.max(0.4, p.camDist - rz);
    var factor = p.fitFov / depth;

    return {
      x: p.originX + rx * factor,
      y: p.originY - ry * factor,
      depth: depth
    };
  };

  Spectrogram3D.prototype.render = function () {
    if (this._destroyed || !this.ctx) return;
    if (this.width <= 0 || this.height <= 0) return;
    this._hasRendered = true;

    this._computeProjection();
    var ctx = this.ctx;
    var w = this.width;
    var h = this.height;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Scientific slate-navy lab background gradient
    var bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0b1620');
    bgGrad.addColorStop(1, '#071018');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (!this.spectrogram || !this.spectrogram.grid || this.spectrogram.frames < 2) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No audio loaded for 3D Spectrogram', w * 0.5, h * 0.5);
      ctx.restore();
      return;
    }

    var spec = this.spectrogram;
    var frames = spec.frames;
    var bands = spec.freqBands;
    var grid = spec.grid;

    var camCosEl = Math.cos(this.elevation);
    var camX = camCosEl * Math.sin(this.azimuth);
    var camZ = camCosEl * Math.cos(this.azimuth);

    // Draw 3D bounding box floor & back walls
    this._drawAxesAndGrid(ctx, camX, camZ, spec);

    // Pre-project heightfield vertices
    var maxH = 1.05;
    var pts = new Array(frames * bands);
    for (var t = 0; t < frames; t++) {
      var x = -1 + (2 * t) / (frames - 1);
      for (var f = 0; f < bands; f++) {
        var z = -1 + (2 * f) / (bands - 1);
        var val = grid[t * bands + f];
        pts[t * bands + f] = this._project(x, val * maxH, z);
      }
    }

    // Painter's back-to-front order
    var tStart = camX >= 0 ? 0 : frames - 2;
    var tEnd = camX >= 0 ? frames - 1 : -1;
    var tStep = camX >= 0 ? 1 : -1;

    var fStart = camZ >= 0 ? 0 : bands - 2;
    var fEnd = camZ >= 0 ? bands - 1 : -1;
    var fStep = camZ >= 0 ? 1 : -1;

    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.65;

    for (var ti = tStart; ti !== tEnd; ti += tStep) {
      for (var fi = fStart; fi !== fEnd; fi += fStep) {
        var i00 = ti * bands + fi;
        var i10 = (ti + 1) * bands + fi;
        var i11 = (ti + 1) * bands + (fi + 1);
        var i01 = ti * bands + (fi + 1);

        var v00 = grid[i00];
        var v10 = grid[i10];
        var v11 = grid[i11];
        var v01 = grid[i01];
        var vAvg = 0.25 * (v00 + v10 + v11 + v01);

        // Directional shading from surface gradient
        var slopeX = (v10 + v11 - v00 - v01) * 0.5;
        var slopeZ = (v01 + v11 - v00 - v10) * 0.5;
        var shade = clamp(0.84 + slopeX * 0.45 - slopeZ * 0.35 + vAvg * 0.16, 0.48, 1.18);

        var p00 = pts[i00];
        var p10 = pts[i10];
        var p11 = pts[i11];
        var p01 = pts[i01];

        ctx.beginPath();
        ctx.moveTo(p00.x, p00.y);
        ctx.lineTo(p10.x, p10.y);
        ctx.lineTo(p11.x, p11.y);
        ctx.lineTo(p01.x, p01.y);
        ctx.closePath();

        var quadAlpha = clamp(0.42 + Math.pow(vAvg, 0.72) * 0.48, 0.40, 0.90);
        ctx.fillStyle = sampleColormap(this.colormap, vAvg, shade, quadAlpha);
        ctx.fill();

        if (this.wireframe) {
          ctx.strokeStyle = vAvg > 0.14 ? 'rgba(224, 248, 255, 0.20)' : 'rgba(105, 175, 232, 0.12)';
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }
      }
    }

    // Draw dark translucent front skirts along visible outer edges
    this._drawSkirts(ctx, pts, grid, frames, bands, camX, camZ);

    // Draw real-time playhead slice curtain when playing
    if (this.playhead !== null) {
      this._drawPlayheadCurtain(ctx, spec, maxH);
    }

    if (w >= 210) {
      this._drawAmplitudeColorbar(ctx, w, h);
    }

    // HUD hint in corner on wider canvases
    if (w >= 260) {
      ctx.fillStyle = 'rgba(176, 206, 224, 0.62)';
      ctx.font = '500 9.5px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Drag to orbit • Scroll/pinch to zoom • Dbl-click reset', 10, h - 7);
    }

    ctx.restore();
  };

  Spectrogram3D.prototype._drawAxesAndGrid = function (ctx, camX, camZ, spec) {
    var backX = camX >= 0 ? -1 : 1;
    var backZ = camZ >= 0 ? -1 : 1;
    var frontX = -backX;
    var frontZ = -backZ;
    var isNarrow = (this.width || 320) < 240;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(156, 184, 206, 0.21)';

    // Floor grid lines (Time & Freq)
    for (var i = 0; i <= 4; i++) {
      var u = -1 + (2 * i) / 4;
      var a = this._project(u, 0, -1);
      var b = this._project(u, 0, 1);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      var c = this._project(-1, 0, u);
      var d = this._project(1, 0, u);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }

    // Back walls horizontal dB guides
    ctx.strokeStyle = 'rgba(156, 184, 206, 0.16)';
    for (var hStep = 0.5; hStep <= 1.0; hStep += 0.5) {
      var yH = hStep * 1.05;
      var w1 = this._project(-1, yH, backZ);
      var w2 = this._project(1, yH, backZ);
      ctx.beginPath();
      ctx.moveTo(w1.x, w1.y);
      ctx.lineTo(w2.x, w2.y);
      ctx.stroke();

      var w3 = this._project(backX, yH, -1);
      var w4 = this._project(backX, yH, 1);
      ctx.beginPath();
      ctx.moveTo(w3.x, w3.y);
      ctx.lineTo(w4.x, w4.y);
      ctx.stroke();
    }

    // Vertical corner posts
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    var pBot = this._project(backX, 0, backZ);
    var pTop = this._project(backX, 1.08, backZ);
    ctx.beginPath();
    ctx.moveTo(pBot.x, pBot.y);
    ctx.lineTo(pTop.x, pTop.y);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = 'rgba(203, 213, 225, 0.78)';
    ctx.font = isNarrow
      ? '600 8px ui-monospace, SFMono-Regular, Menlo, monospace'
      : '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';

    // Time ticks along frontZ floor edge
    var effDur = (spec.duration || 0) / Math.max(0.25, this.playbackRate || 1.0);
    ctx.textAlign = 'center';
    var tickCount = isNarrow ? 1 : 2;
    for (var ti = 0; ti <= tickCount; ti++) {
      var fracT = tickCount === 1 ? ti : ti / 2;
      var tx = -1 + 2 * fracT;
      var tSec = (fracT * effDur).toFixed(isNarrow ? 1 : 2) + 's';
      var tp = this._project(tx, -0.02, frontZ * (isNarrow ? 1.04 : 1.10));
      ctx.fillText(tSec, tp.x, tp.y + (isNarrow ? 2 : 4));
    }

    // Frequency ticks along frontX floor edge
    var freqTicks = isNarrow
      ? [
          { z: -1.0, label: '45Hz' },
          { z: 1.0, label: '4.2kHz' }
        ]
      : [
          { z: -1.0, label: '45Hz' },
          { z: -0.35, label: '200Hz' },
          { z: 0.30, label: '1kHz' },
          { z: 1.0, label: '4.2kHz' }
        ];
    ctx.textAlign = camX >= 0 ? 'left' : 'right';
    for (var fi = 0; fi < freqTicks.length; fi++) {
      var ft = freqTicks[fi];
      var fp = this._project(frontX * (isNarrow ? 1.03 : 1.07), -0.02, ft.z);
      ctx.fillText(ft.label, fp.x + (camX >= 0 ? 3 : -3), fp.y + 3);
    }

    // dB labels on back corner post (skip mid label on very narrow canvases)
    if (!isNarrow) {
      var dbLabels = [
        { y: 0.0, text: '-55dB' },
        { y: 0.525, text: '-27dB' },
        { y: 1.05, text: '0dB' }
      ];
      ctx.textAlign = 'right';
      for (var di = 0; di < dbLabels.length; di++) {
        var dp = this._project(backX * 1.05, dbLabels[di].y, backZ);
        ctx.fillText(dbLabels[di].text, dp.x - 4, dp.y + 3);
      }
    }
  };

  Spectrogram3D.prototype._drawAmplitudeColorbar = function (ctx, w, h) {
    var barW = 8;
    var barX = w - 38;
    var barY = Math.max(36, Math.round(h * 0.20));
    var barH = Math.max(68, Math.round(h * 0.56));
    ctx.fillStyle = 'rgba(220, 236, 245, 0.85)';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AMPLITUDE', barX + barW * 0.5, barY - 16);
    ctx.fillText('(dB)', barX + barW * 0.5, barY - 7);

    var grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    grad.addColorStop(0.0, 'rgb(220,36,56)');
    grad.addColorStop(0.18, 'rgb(242,126,40)');
    grad.addColorStop(0.35, 'rgb(248,224,72)');
    grad.addColorStop(0.54, 'rgb(102,224,96)');
    grad.addColorStop(0.72, 'rgb(26,180,178)');
    grad.addColorStop(0.88, 'rgb(24,94,196)');
    grad.addColorStop(1.0, 'rgb(15,34,96)');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = 'rgba(200, 224, 240, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(barX, barY, barW, barH);

    var dbMarks = ['0', '-12', '-24', '-36', '-48'];
    ctx.fillStyle = 'rgba(204, 226, 240, 0.88)';
    ctx.font = '600 7.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    for (var mi = 0; mi < dbMarks.length; mi++) {
      var my = barY + (mi / (dbMarks.length - 1)) * barH;
      ctx.fillText(dbMarks[mi], barX + barW + 4, my + 2.5);
    }
  };

  Spectrogram3D.prototype._drawSkirts = function (ctx, pts, grid, frames, bands, camX, camZ) {
    var maxH = 1.05;
    ctx.fillStyle = 'rgba(12, 28, 56, 0.26)';
    ctx.strokeStyle = 'rgba(130, 190, 235, 0.22)';
    ctx.lineWidth = 1;

    // Front Z edge skirt
    var fEdge = camZ >= 0 ? bands - 1 : 0;
    var zEdge = camZ >= 0 ? 1 : -1;
    ctx.beginPath();
    var pStart = this._project(-1, 0, zEdge);
    ctx.moveTo(pStart.x, pStart.y);
    for (var t = 0; t < frames; t++) {
      var p = pts[t * bands + fEdge];
      ctx.lineTo(p.x, p.y);
    }
    var pEnd = this._project(1, 0, zEdge);
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front X edge skirt
    var tEdge = camX >= 0 ? frames - 1 : 0;
    var xEdge = camX >= 0 ? 1 : -1;
    ctx.beginPath();
    var pxStart = this._project(xEdge, 0, -1);
    ctx.moveTo(pxStart.x, pxStart.y);
    for (var f = 0; f < bands; f++) {
      var pf = pts[tEdge * bands + f];
      ctx.lineTo(pf.x, pf.y);
    }
    var pxEnd = this._project(xEdge, 0, 1);
    ctx.lineTo(pxEnd.x, pxEnd.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  Spectrogram3D.prototype._drawPlayheadCurtain = function (ctx, spec, maxH) {
    var ph = this.playhead;
    var x = -1 + 2 * ph;
    var frames = spec.frames;
    var bands = spec.freqBands;
    var grid = spec.grid;

    var tFloat = ph * (frames - 1);
    var t0 = Math.floor(tFloat);
    var t1 = Math.min(frames - 1, t0 + 1);
    var frac = tFloat - t0;

    // Translucent cyan slice plane
    var cBL = this._project(x, 0, -1);
    var cTL = this._project(x, 1.08, -1);
    var cTR = this._project(x, 1.08, 1);
    var cBR = this._project(x, 0, 1);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
    ctx.beginPath();
    ctx.moveTo(cBL.x, cBL.y);
    ctx.lineTo(cTL.x, cTL.y);
    ctx.lineTo(cTR.x, cTR.y);
    ctx.lineTo(cBR.x, cBR.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.65)';
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // Glowing active ridge contour
    ctx.beginPath();
    for (var f = 0; f < bands; f++) {
      var val = grid[t0 * bands + f] * (1 - frac) + grid[t1 * bands + f] * frac;
      var z = -1 + (2 * f) / (bands - 1);
      var pt = this._project(x, val * maxH, z);
      if (f === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  };

  Spectrogram3D.prototype.destroy = function () {
    this._destroyed = true;
    if (this._rafAnim) {
      cancelAnimationFrame(this._rafAnim);
      this._rafAnim = null;
    }
    if (this._resizeRaf) {
      cancelAnimationFrame(this._resizeRaf);
      this._resizeRaf = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
      this.canvas.removeEventListener('pointerup', this._onPointerUp);
      this.canvas.removeEventListener('pointercancel', this._onPointerUp);
      this.canvas.removeEventListener('wheel', this._onWheel);
      this.canvas.removeEventListener('dblclick', this._onDblClick);
    }
    for (var i = 0; i < this.partners.length; i++) {
      var p = this.partners[i];
      if (p && p.partners) {
        p.partners = p.partners.filter(function (x) {
          return x !== this;
        }, this);
      }
    }
    this.partners = [];
  };

  TootApp.Spectrogram3D = Spectrogram3D;
})(typeof window !== 'undefined' ? window : globalThis);
