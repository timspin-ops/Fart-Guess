(function (root) {
  'use strict';

  var TootLabs = (root.TootLabs = root.TootLabs || {});

  var PAGE_W = 1240;
  var PAGE_H = 1754;
  var PDF_PT_W = 595;
  var PDF_PT_H = 842;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function safeNum(v, fallback) {
    return typeof v === 'number' && Number.isFinite(v) ? v : (fallback || 0);
  }

  /* ==================== STANDARDS-COMPLIANT PDF 1.4 BINARY BUILDER ==================== */
  function strToBytes(str) {
    var out = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      out[i] = str.charCodeAt(i) & 0xff;
    }
    return out;
  }

  function dataUrlToJpegBytes(dataUrl) {
    var idx = String(dataUrl || '').indexOf(',');
    var b64 = idx >= 0 ? dataUrl.slice(idx + 1) : '';
    var bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  function buildPdfBytesFromJpegPages(jpegPages) {
    var pages = jpegPages || [];
    var nPages = pages.length;
    var chunks = [];
    var byteLen = 0;
    var offsets = [0]; // obj 0 placeholder

    function pushBytes(u8) {
      chunks.push(u8);
      byteLen += u8.length;
    }

    function pushAscii(s) {
      pushBytes(strToBytes(s));
    }

    function startObj(objId) {
      offsets[objId] = byteLen;
      pushAscii(objId + ' 0 obj\n');
    }

    function endObj() {
      pushAscii('\nendobj\n');
    }

    // PDF Header with binary marker comment
    pushAscii('%PDF-1.4\n');
    pushBytes(new Uint8Array([37, 226, 227, 207, 211, 10])); // %\xE2\xE3\xCF\xD3\n

    var kidsRefs = [];
    for (var p = 0; p < nPages; p++) {
      kidsRefs.push(3 + p * 3 + ' 0 R');
    }

    // 1: Catalog
    startObj(1);
    pushAscii('<< /Type /Catalog /Pages 2 0 R >>');
    endObj();

    // 2: Pages root
    startObj(2);
    pushAscii('<< /Type /Pages /Kids [' + kidsRefs.join(' ') + '] /Count ' + nPages + ' >>');
    endObj();

    // Per-page objects: Page, Content stream, Image XObject
    for (var i = 0; i < nPages; i++) {
      var pg = pages[i];
      var pageObj = 3 + i * 3;
      var contentObj = pageObj + 1;
      var imgObj = pageObj + 2;
      var imgW = pg.width || PAGE_W;
      var imgH = pg.height || PAGE_H;
      var jpeg = pg.bytes;

      startObj(pageObj);
      pushAscii(
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' +
          PDF_PT_W +
          ' ' +
          PDF_PT_H +
          '] /Resources << /XObject << /Im0 ' +
          imgObj +
          ' 0 R >> >> /Contents ' +
          contentObj +
          ' 0 R >>'
      );
      endObj();

      var drawStream = 'q\n' + PDF_PT_W + ' 0 0 ' + PDF_PT_H + ' 0 0 cm\n/Im0 Do\nQ\n';
      startObj(contentObj);
      pushAscii('<< /Length ' + drawStream.length + ' >>\nstream\n' + drawStream + 'endstream');
      endObj();

      startObj(imgObj);
      pushAscii(
        '<< /Type /XObject /Subtype /Image /Width ' +
          imgW +
          ' /Height ' +
          imgH +
          ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
          jpeg.length +
          ' >>\nstream\n'
      );
      pushBytes(jpeg);
      pushAscii('\nendstream');
      endObj();
    }

    var totalObjs = 3 + nPages * 3;
    var xrefOffset = byteLen;
    pushAscii('xref\n0 ' + totalObjs + '\n');
    pushAscii('0000000000 65535 f \n');
    for (var id = 1; id < totalObjs; id++) {
      var offStr = String(offsets[id] || 0);
      while (offStr.length < 10) offStr = '0' + offStr;
      pushAscii(offStr + ' 00000 n \n');
    }

    pushAscii(
      'trailer\n<< /Size ' +
        totalObjs +
        ' /Root 1 0 R >>\nstartxref\n' +
        xrefOffset +
        '\n%%EOF\n'
    );

    var finalBuf = new Uint8Array(byteLen);
    var pos = 0;
    for (var c = 0; c < chunks.length; c++) {
      finalBuf.set(chunks[c], pos);
      pos += chunks[c].length;
    }
    return finalBuf;
  }

  function buildPdfBlobFromJpegPages(jpegPages) {
    var bytes = buildPdfBytesFromJpegPages(jpegPages);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /* ==================== HIGH-RES PAGE DRAWING PRIMITIVES ==================== */
  function createPageCanvas() {
    var c = document.createElement('canvas');
    c.width = PAGE_W;
    c.height = PAGE_H;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    return { canvas: c, ctx: ctx };
  }

  function drawRoundedCard(ctx, x, y, w, h, r, fill, stroke) {
    var rad = r || 18;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
    ctx.fillStyle = fill || '#1F2937';
    ctx.fill();
    if (stroke !== null) {
      ctx.strokeStyle = stroke || '#374151';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWrappedText(ctx, text, x, y, maxW, lineH, maxLines) {
    var words = String(text || '').split(/\s+/);
    var line = '';
    var linesDrawn = 0;
    var limit = maxLines || 12;
    for (var i = 0; i < words.length; i++) {
      var testLine = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(testLine).width > maxW && line) {
        ctx.fillText(line, x, y + linesDrawn * lineH);
        linesDrawn++;
        line = words[i];
        if (linesDrawn >= limit - 1 && i < words.length - 1) {
          var rest = [line].concat(words.slice(i + 1)).join(' ');
          while (rest.length > 4 && ctx.measureText(rest + '...').width > maxW) {
            rest = rest.slice(0, -1);
          }
          ctx.fillText(rest + '...', x, y + linesDrawn * lineH);
          return linesDrawn + 1;
        }
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, y + linesDrawn * lineH);
      linesDrawn++;
    }
    return linesDrawn;
  }

  function drawPdfHeader(ctx, eyebrow, title, subtitle, pageNum, totalPages) {
    drawRoundedCard(ctx, 44, 38, PAGE_W - 88, 128, 22, '#111827', '#374151');
    ctx.fillStyle = '#60A5FA';
    ctx.font = '700 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(eyebrow, 72, 76);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 34px sans-serif';
    ctx.fillText(String(title || '').slice(0, 44), 72, 118);

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(String(subtitle || '').slice(0, 80), 72, 148);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '700 17px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('PAGE ' + pageNum + ' / ' + totalPages, PAGE_W - 72, 76);
    ctx.fillStyle = '#22C55E';
    ctx.fillText('TOOT MATCH LABS', PAGE_W - 72, 118);
  }

  function drawPdfFooter(ctx) {
    ctx.fillStyle = '#6B7280';
    ctx.font = '600 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Generated locally by Toot Match Labs · Deterministic Acoustic DSP + 22-Feature Softmax Classifier',
      PAGE_W * 0.5,
      PAGE_H - 28
    );
  }

  function drawPdfGaugeCard(ctx, x, y, w, h, g) {
    drawRoundedCard(ctx, x, y, w, h, 20, '#1F2937', '#374151');
    var cx = x + w * 0.5;
    var cy = y + 72;
    var r = 44;

    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(55, 65, 81, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    var endAngle = -Math.PI * 0.5 + (clamp(safeNum(g.score, 0), 0, 100) / 100) * Math.PI * 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = g.color || '#22C55E';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.5, endAngle);
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.fillStyle = g.color || '#22C55E';
    ctx.font = '800 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(g.score) + '%', cx, cy + 9);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 19px sans-serif';
    ctx.fillText(String(g.title || '').slice(0, 22), cx, y + 144);

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '600 15px monospace';
    ctx.fillText(String(g.sub || '').slice(0, 26), cx, y + 169);

    ctx.fillStyle = g.color || '#60A5FA';
    ctx.font = '800 14px monospace';
    ctx.fillText(String(g.status || '').toUpperCase(), cx, y + 196);
  }

  function drawHeatmapFallback(ctx, x, y, w, h, spectrogram, title) {
    drawRoundedCard(ctx, x, y, w, h, 18, '#0B1222', '#374151');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 20, y + 32);

    var gx = x + 20, gy = y + 48, gw = w - 40, gh = h - 76;
    if (!spectrogram || !spectrogram.grid) return;
    var frames = spectrogram.frames || 1;
    var bands = spectrogram.freqBands || 1;
    var grid = spectrogram.grid;
    var cw = gw / frames;
    var ch = gh / bands;

    for (var t = 0; t < frames; t++) {
      for (var b = 0; b < bands; b++) {
        var v = clamp(grid[t * bands + b] || 0, 0, 1);
        var r = Math.round(clamp(v * 255 * 1.3, 12, 255));
        var g = Math.round(clamp((v - 0.35) * 290, 14, 240));
        var bl = Math.round(clamp((1 - Math.abs(v - 0.45) * 2) * 190 + v * 65, 34, 235));
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + bl + ')';
        ctx.fillRect(gx + t * cw, gy + gh - (b + 1) * ch, Math.ceil(cw), Math.ceil(ch));
      }
    }
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 13px monospace';
    ctx.fillText('Time ->', gx, gy + gh + 18);
    ctx.textAlign = 'right';
    ctx.fillText('45 Hz -> 4.2 kHz (Vertical)', gx + gw, gy + gh + 18);
  }

  function drawSpectrogramSlot(ctx, x, y, w, h, domCanvas, spectrogram, title) {
    if (domCanvas && domCanvas.width > 20 && domCanvas.height > 20) {
      try {
        drawRoundedCard(ctx, x, y, w, h, 18, '#070B16', '#374151');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(title, x + 20, y + 32);
        ctx.drawImage(domCanvas, x + 16, y + 46, w - 32, h - 62);
        return;
      } catch (e) {}
    }
    drawHeatmapFallback(ctx, x, y, w, h, spectrogram, title);
  }

  /* ==================== COMPARISON MULTI-CHART HELPERS ==================== */
  function drawCompareDualPlot(ctx, x, y, w, h, title, sub, arrA, arrB, minV, maxV) {
    drawRoundedCard(ctx, x, y, w, h, 16, '#111827', '#374151');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 18, y + 28);
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 13px monospace';
    ctx.fillText(sub, x + 18, y + 48);

    var px = x + 20, py = y + 60, pw = w - 40, ph = h - 82;
    ctx.fillStyle = '#0B1222';
    ctx.fillRect(px, py, pw, ph);

    function trace(arr, col) {
      if (!arr || arr.length === 0) return;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < arr.length; i++) {
        var v = safeNum(arr[i], 0);
        if (minV > 0 && v <= 0) {
          started = false;
          continue;
        }
        var lx = px + (i / Math.max(1, arr.length - 1)) * pw;
        var norm = clamp((v - minV) / Math.max(1e-5, maxV - minV), 0, 1);
        var ly = py + ph - norm * ph;
        if (!started) {
          ctx.moveTo(lx, ly);
          started = true;
        } else {
          ctx.lineTo(lx, ly);
        }
      }
      ctx.stroke();
    }

    trace(arrA, '#60A5FA');
    trace(arrB, '#FB7185');

    ctx.font = '700 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#60A5FA';
    ctx.fillText('A = Original', x + w - 105, y + 28);
    ctx.fillStyle = '#FB7185';
    ctx.fillText('B = Guess', x + w - 20, y + 28);
  }

  /* ==================== COMPOSITOR: SINGLE / COMPARISON / GROUP PDF ==================== */
  function generateAnalysisPdf(opts) {
    opts = opts || {};
    var Fn = TootLabs.Fartnalysis;
    var Store = TootLabs.Store;
    var DSP = root.TootApp.DSP;
    var Forensics = root.TootApp.Forensics;
    var mode = opts.mode || 'single';
    var pages = [];
    var nowStr = new Date().toLocaleString();

    function pushPageCanvas(pg) {
      var dataUrl = pg.canvas.toDataURL('image/jpeg', 0.90);
      pages.push({
        bytes: dataUrlToJpegBytes(dataUrl),
        width: PAGE_W,
        height: PAGE_H
      });
    }

    if (mode === 'comparison' && opts.soundA && opts.soundB) {
      var sA = opts.soundA;
      var sB = opts.soundB;
      var fA = sA.features || DSP.extractFeatures(sA.samples, sA.sampleRate);
      var fB = sB.features || DSP.extractFeatures(sB.samples, sB.sampleRate);
      sA.features = fA;
      sB.features = fB;
      var res = opts.result || DSP.compareSounds(fA, fB);
      var exact = Store.computeExactScore(res);
      var rank = Store.getRankForScore(exact);
      var verdict = Store.buildScientificVerdict(sA, sB, res, exact);
      var gauges = Fn.buildExecutiveGauges(sA, sB, res);
      var mlA = Fn.classifyAcousticProfile(fA);
      var mlB = Fn.classifyAcousticProfile(fB);

      // PAGE 1: Executive Comparison Summary + All 12 Gauges
      var p1 = createPageCanvas();
      drawPdfHeader(
        p1.ctx,
        'FORENSIC COMPARISON DOSSIER · ' + nowStr,
        (sA.displayName || sA.name) + ' vs ' + (sB.name || 'Guess'),
        'Match Quality: ' + exact.toFixed(1) + '% | Rank: ' + rank.title + ' (Grade ' + res.grade + ')',
        1,
        3
      );

      for (var i = 0; i < gauges.length; i++) {
        var col = i % 3;
        var row = Math.floor(i / 3);
        drawPdfGaugeCard(p1.ctx, 44 + col * 392, 188 + row * 234, 368, 214, gauges[i]);
      }

      drawRoundedCard(p1.ctx, 44, 1138, PAGE_W - 88, 250, 20, '#111827', '#374151');
      p1.ctx.fillStyle = '#22C55E';
      p1.ctx.font = '700 18px monospace';
      p1.ctx.textAlign = 'left';
      p1.ctx.fillText('SCIENTIFIC REFEREE VERDICT & ML CROSS-CHECK', 72, 1178);
      p1.ctx.fillStyle = '#FFFFFF';
      p1.ctx.font = '600 21px sans-serif';
      drawWrappedText(p1.ctx, verdict, 72, 1218, PAGE_W - 144, 30, 4);
      p1.ctx.fillStyle = '#60A5FA';
      p1.ctx.font = '700 17px monospace';
      p1.ctx.fillText(
        'Original ML Class: ' + mlA.topClass.name + ' (' + mlA.confidence + '%)   |   Guess ML Class: ' + mlB.topClass.name + ' (' + mlB.confidence + '%)',
        72,
        1360
      );

      var bonusCmp = Forensics && typeof Forensics.computeBonusMetrics === 'function' ? Forensics.computeBonusMetrics(fA, fB) : null;
      drawRoundedCard(p1.ctx, 44, 1410, PAGE_W - 88, 280, 20, '#1F2937', '#374151');
      p1.ctx.fillStyle = '#F97316';
      p1.ctx.font = '700 18px monospace';
      p1.ctx.fillText('CORE TELEMETRY AUDIT & HUMOROUS FORENSIC NOTES', 72, 1450);
      p1.ctx.fillStyle = '#D1D5DB';
      p1.ctx.font = '600 19px sans-serif';
      drawWrappedText(
        p1.ctx,
        'Rating: Grade ' + (res.grade || 'B') + ' (' + (res.title || 'Acoustic Event') + '). ' +
        'Measured Duration: ' + fA.duration.toFixed(2) + 's vs ' + fB.duration.toFixed(2) + 's | ' +
        'Pitch Core: ' + Math.round(fA.medianPitchHz || fA.spectralCentroidHz) + ' Hz vs ' + Math.round(fB.medianPitchHz || fB.spectralCentroidHz) + ' Hz | ' +
        'Cheek Flutter: ' + Math.round(safeNum(fA.modRateHz, 0) * 60) + ' vs ' + Math.round(safeNum(fB.modRateHz, 0) * 60) + ' flaps/min. ' +
        (bonusCmp
          ? 'Laundry Advisory: ' + bonusCmp.wetness.wetA + '% (' + bonusCmp.wetness.labelA + ') vs ' + bonusCmp.wetness.wetB + '% (' + bonusCmp.wetness.labelB + '). ' +
            'Sound Twins: ' + bonusCmp.acoustics.twinA.name + ' vs ' + bonusCmp.acoustics.twinB.name + '. ' +
            'Guess Elevator Alibi: ' + bonusCmp.social.b.verdict
          : exact >= 85 ? 'Both emissions belong to practically the same biomechanical acoustic family.' : 'Noticeable divergence logged — challenger needs tighter valve control.'),
        72,
        1490,
        PAGE_W - 144,
        29,
        5
      );
      drawPdfFooter(p1.ctx);
      pushPageCanvas(p1);

      // PAGE 2: Multi-Chart Side-by-Side Telemetry Curves
      var p2 = createPageCanvas();
      drawPdfHeader(p2.ctx, 'COMPARATIVE FFT, PITCH, ENVELOPE & ML GRAPHS', 'Waveform & Cepstral Overlay Suite', 'Blue = Original Fart   |   Coral = Recorded Guess', 2, 3);

      drawCompareDualPlot(p2.ctx, 44, 190, 564, 330, '40-Band FFT Energy Spectrum', '45 Hz -> 4.2 kHz frequency profile', fA.avgSpectrum, fB.avgSpectrum, 0, 1);
      drawCompareDualPlot(p2.ctx, 632, 190, 564, 330, 'Pitch Sweep Contour (Hz)', '32-frame fundamental track', fA.pitchHzArr, fB.pitchHzArr, 20, 480);
      drawCompareDualPlot(p2.ctx, 44, 542, 564, 330, 'Blast Amplitude Envelope', 'Normalized 64-point attack/decay shape', fA.envelope, fB.envelope, 0, 1);
      drawCompareDualPlot(p2.ctx, 632, 542, 564, 330, 'Modulation Spectrum (4-45 Hz)', 'Cheek flutter & burst turbulence rate', fA.modSpectrum, fB.modSpectrum, 0, 1);
      drawCompareDualPlot(p2.ctx, 44, 894, 564, 330, '13-Band MFCC Vector Comparison', 'Spectral timbre fingerprint (C1-C13)', fA.mfccMean, fB.mfccMean, -6, 6);

      // Slot 6: Core 5 Criteria Horizontal Bars
      drawRoundedCard(p2.ctx, 632, 894, 564, 330, 16, '#111827', '#374151');
      p2.ctx.fillStyle = '#FFFFFF';
      p2.ctx.font = '800 17px sans-serif';
      p2.ctx.textAlign = 'left';
      p2.ctx.fillText('Weighted Scoring Breakdown', 652, 924);
      var barItems = [
        { label: 'Duration Match', val: res.durationScore, col: '#22C55E' },
        { label: 'Pitch & Sweep', val: res.pitchScore, col: '#60A5FA' },
        { label: 'Flutter & Bursts', val: res.modulationScore, col: '#8B5CF6' },
        { label: 'Timbre & MFCC', val: res.timbreScore, col: '#F97316' },
        { label: 'Blast Envelope', val: res.envelopeScore, col: '#FACC15' }
      ];
      for (var bi = 0; bi < barItems.length; bi++) {
        var by = 964 + bi * 50;
        p2.ctx.fillStyle = '#D1D5DB';
        p2.ctx.font = '700 16px sans-serif';
        p2.ctx.textAlign = 'left';
        p2.ctx.fillText(barItems[bi].label, 652, by);
        p2.ctx.fillStyle = '#0B1222';
        p2.ctx.fillRect(652, by + 10, 440, 16);
        p2.ctx.fillStyle = barItems[bi].col;
        p2.ctx.fillRect(652, by + 10, Math.max(6, (barItems[bi].val / 100) * 440), 16);
        p2.ctx.fillStyle = '#FFFFFF';
        p2.ctx.textAlign = 'right';
        p2.ctx.fillText(barItems[bi].val + '%', 1170, by + 22);
      }

      // Bottom ML Box
      drawRoundedCard(p2.ctx, 44, 1252, PAGE_W - 88, 436, 20, '#1F2937', '#374151');
      p2.ctx.fillStyle = '#8B5CF6';
      p2.ctx.font = '700 18px monospace';
      p2.ctx.textAlign = 'left';
      p2.ctx.fillText('ON-DEVICE ML ARCHETYPE CLASSIFICATION (ORIGINAL VS GUESS)', 72, 1294);
      Fn.drawSingleChartType({ ctx: p2.ctx, x: 72, y: 1320, w: 520, h: 330 }, 's_ml_probs', sA, fA, null, mlA);
      Fn.drawSingleChartType({ ctx: p2.ctx, x: 648, y: 1320, w: 520, h: 330 }, 's_ml_probs', sB, fB, null, mlB);
      p2.ctx.fillStyle = '#60A5FA';
      p2.ctx.font = '700 15px monospace';
      p2.ctx.fillText('ORIGINAL ML DISTRIBUTION', 72, 1312);
      p2.ctx.fillStyle = '#FB7185';
      p2.ctx.fillText('GUESS ML DISTRIBUTION', 648, 1312);
      drawPdfFooter(p2.ctx);
      pushPageCanvas(p2);

      // PAGE 3: 3D Spectrograms + Equations + ML Methodology
      var p3 = createPageCanvas();
      drawPdfHeader(p3.ctx, '3D TIME-FREQUENCY SPECTROGRAMS & EQUATIONS', 'Topographic Acoustic Surface & ML Engine Notes', 'Inspectable energy intensity across frequency (Hz) and time (s)', 3, 3);
      var domSpecs = opts.specCanvases || [];
      drawSpectrogramSlot(p3.ctx, 44, 196, 564, 520, domSpecs[0], fA.spectrogram, 'Sound A: ' + (sA.displayName || sA.name));
      drawSpectrogramSlot(p3.ctx, 632, 196, 564, 520, domSpecs[1], fB.spectrogram, 'Sound B: ' + (sB.name || 'Guess'));

      drawRoundedCard(p3.ctx, 44, 744, PAGE_W - 88, 940, 22, '#111827', '#374151');
      p3.ctx.fillStyle = '#22C55E';
      p3.ctx.font = '700 20px monospace';
      p3.ctx.textAlign = 'left';
      p3.ctx.fillText('WHAT IS "MACHINE LEARNING ANALYSIS" IN TOOT MATCH?', 74, 792);
      p3.ctx.fillStyle = '#D1D5DB';
      p3.ctx.font = '600 19px sans-serif';
      drawWrappedText(
        p3.ctx,
        'Toot Match runs a 100% private, offline 22-feature acoustic ML classifier directly in JavaScript with zero server uploads. First, STFT spectrograms, 13-band Mel-Frequency Cepstral Coefficients (MFCCs), Wiener flatness, modulation FFT, and blast crest ratio are extracted. Then temperature-scaled softmax distance scoring maps the vector onto 6 acoustic archetypes and checks MFCC + macro-contour alignment between Original and Guess — all computed 100% locally so no cloud server has to explain this to its boss.',
        74,
        832,
        PAGE_W - 148,
        29,
        6
      );

      p3.ctx.fillStyle = '#60A5FA';
      p3.ctx.font = '700 20px monospace';
      p3.ctx.fillText('MATHEMATICAL SCORING EQUATIONS', 74, 1068);
      var eqs = [
        '1. Overall Parity = Geometric-Weighted Mean(Duration 15%, Pitch 28%, Modulation 17%, Timbre 25%, Envelope 15%)',
        '2. MFCC Cosine Similarity = dot(MFCC_A, MFCC_B) / (||MFCC_A|| * ||MFCC_B||)',
        '3. Pitch Gap = |12 * log2(F0_Guess / F0_Original)| semitones',
        '4. Modulation FFT = Hann-windowed FFT(Envelope - Mean) evaluated across [4 Hz .. 45 Hz]',
        '5. Squelch Index = 22*norm(ModDepth) + 46*norm(SpectralFlux) + 22*MidBand + BurstBonus',
        '6. Blast Radius (m) = 1.8 + 10.5 * (PanicPct / 100)'
      ];
      p3.ctx.fillStyle = '#93C5FD';
      p3.ctx.font = '600 17px monospace';
      for (var eq = 0; eq < eqs.length; eq++) {
        drawWrappedText(p3.ctx, eqs[eq], 74, 1114 + eq * 86, PAGE_W - 148, 25, 2);
      }
      drawPdfFooter(p3.ctx);
      pushPageCanvas(p3);

      var fname = 'TootMatch_' + (sA.displayName || sA.name).replace(/[^a-z0-9]+/gi, '_') + '_Comparison.pdf';
      return { blob: buildPdfBlobFromJpegPages(pages), filename: fname, pageCount: pages.length };
    }

    if (mode === 'group' && opts.groupObj) {
      var grp = opts.groupObj;
      var gg = Fn.buildGroupGauges(grp);
      var gMl = Fn.classifyAcousticProfile(grp.features);

      var gp1 = createPageCanvas();
      drawPdfHeader(gp1.ctx, 'MULTI-FART GROUP TELEMETRY · ' + nowStr, grp.name, grp.metrics.count + ' Vault Specimens Combined (' + grp.metrics.totalDurationSec.toFixed(2) + 's)', 1, 2);
      for (var gi = 0; gi < gg.length; gi++) {
        var gc = gi % 3, gr = Math.floor(gi / 3);
        drawPdfGaugeCard(gp1.ctx, 44 + gc * 392, 194 + gr * 238, 368, 218, gg[gi]);
      }
      Fn.drawSegmentedWaveform({ ctx: gp1.ctx, x: 44, y: 696, w: PAGE_W - 88, h: 220 }, grp, null);
      drawRoundedCard(gp1.ctx, 44, 940, PAGE_W - 88, 250, 20, '#111827', '#374151');
      gp1.ctx.fillStyle = '#22C55E';
      gp1.ctx.font = '700 18px monospace';
      gp1.ctx.textAlign = 'left';
      gp1.ctx.fillText('ENSEMBLE COHERENCE & ML ANALYSIS', 72, 980);
      gp1.ctx.fillStyle = '#FFFFFF';
      gp1.ctx.font = '600 20px sans-serif';
      drawWrappedText(gp1.ctx, grp.metrics.groupVerdict + ' Composite ML Archetype: ' + gMl.topClass.name + ' (' + gMl.confidence + '%).', 72, 1020, PAGE_W - 144, 30, 5);
      drawRoundedCard(gp1.ctx, 44, 1216, PAGE_W - 88, 470, 20, '#1F2937', '#374151');
      gp1.ctx.fillStyle = '#60A5FA';
      gp1.ctx.font = '700 18px monospace';
      gp1.ctx.fillText('MOVEMENT TRACKLIST', 72, 1254);
      gp1.ctx.fillStyle = '#D1D5DB';
      gp1.ctx.font = '600 17px monospace';
      var segs = (grp.segments || []).slice(0, 12);
      for (var si = 0; si < segs.length; si++) {
        var sg = segs[si];
        gp1.ctx.fillText(
          (si + 1) + '. ' + sg.name + '   [' + sg.startSec.toFixed(2) + 's-' + sg.endSec.toFixed(2) + 's]   ~' + Math.round(sg.pitchHz) + ' Hz   Wet ' + sg.wetnessPct + '%',
          72,
          1296 + si * 30
        );
      }
      drawPdfFooter(gp1.ctx);
      pushPageCanvas(gp1);

      var gp2 = createPageCanvas();
      drawPdfHeader(gp2.ctx, 'GROUP CHARTS & COMBINED 3D SPECTROGRAM', grp.name, 'Constellation Map, Combined FFT & Time-Frequency Surface', 2, 2);
      Fn.drawConstellationPlot({ ctx: gp2.ctx, x: 44, y: 194, w: 564, h: 360 }, grp);
      Fn.drawSpectrumPlot({ ctx: gp2.ctx, x: 632, y: 194, w: 564, h: 360 }, grp.features, '#22C55E');
      var gDom = (opts.specCanvases && opts.specCanvases[0]) || null;
      drawSpectrogramSlot(gp2.ctx, 44, 584, PAGE_W - 88, 620, gDom, grp.features ? grp.features.spectrogram : null, 'Unified Group Track 3D Spectrogram');
      drawRoundedCard(gp2.ctx, 44, 1232, PAGE_W - 88, 440, 20, '#111827', '#374151');
      gp2.ctx.fillStyle = '#8B5CF6';
      gp2.ctx.font = '700 18px monospace';
      gp2.ctx.textAlign = 'left';
      gp2.ctx.fillText('HOW MULTI-FART COHERENCE IS MEASURED', 72, 1272);
      gp2.ctx.fillStyle = '#D1D5DB';
      gp2.ctx.font = '600 19px sans-serif';
      drawWrappedText(
        gp2.ctx,
        'Every saved Vault recording is resampled cleanly to 44.1 kHz, micro-faded at 8ms boundaries, and stitched with 0.18s silent pauses. Coherence scores measure octave continuity across movements, RMS crest dynamic range, and cumulative blast spread — giving a medley of farts the studio mastering dignity Carnegie Hall never asked for.',
        72,
        1314,
        PAGE_W - 144,
        30,
        6
      );
      drawPdfFooter(gp2.ctx);
      pushPageCanvas(gp2);

      return { blob: buildPdfBlobFromJpegPages(pages), filename: 'TootMatch_Group_Megamix_Fartnalysis.pdf', pageCount: pages.length };
    }

    // DEFAULT: SINGLE FART DOSSIER (Original Fart or Guess Analysis — 3 Pages)
    var s = opts.sound;
    var feat = s.features || DSP.extractFeatures(s.samples, s.sampleRate);
    s.features = feat;
    var bonus = Forensics.computeBonusMetrics(feat, feat);
    var ml = Fn.classifyAcousticProfile(feat, bonus);
    var sGauges = Fn.buildSingleGauges(s);
    var prof = DSP.describeSoundProfile(feat);
    var titleName = opts.label || s.displayName || s.name || 'Saved Fart';

    // PAGE 1: All 12 Single-Fart Executive Gauges + ML + Alibi + Twin Summary
    var sp1 = createPageCanvas();
    drawPdfHeader(
      sp1.ctx,
      (opts.eyebrow || 'INDIVIDUAL FARTNALYSIS DOSSIER') + ' · ' + nowStr,
      titleName,
      prof.durationLabel + '  |  ' + prof.pitchLabel + '  |  ' + prof.textureLabel,
      1,
      3
    );

    for (var sgIdx = 0; sgIdx < sGauges.length; sgIdx++) {
      var sc = sgIdx % 3;
      var srow = Math.floor(sgIdx / 3);
      drawPdfGaugeCard(sp1.ctx, 44 + sc * 392, 188 + srow * 234, 368, 214, sGauges[sgIdx]);
    }

    drawRoundedCard(sp1.ctx, 44, 1138, PAGE_W - 88, 250, 20, '#111827', '#374151');
    sp1.ctx.fillStyle = '#22C55E';
    sp1.ctx.font = '700 18px monospace';
    sp1.ctx.textAlign = 'left';
    sp1.ctx.fillText('ML CLASSIFICATION, SOUND TWIN & ELEVATOR ALIBI', 72, 1178);
    sp1.ctx.fillStyle = '#FFFFFF';
    sp1.ctx.font = '600 20px sans-serif';
    drawWrappedText(
      sp1.ctx,
      'ML Verdict: "' + ml.topClass.name + '" (' + ml.confidence + '% certainty; runner-up: ' + ml.runnerUp.name + ' at ' + ml.runnerUp.prob + '%). ' +
      'Acoustic Twin: ' + bonus.acoustics.twinA.name + ' (' + bonus.acoustics.topScoreA + '% match). ' +
      'Elevator Blast Radius: ' + bonus.social.a.radiusM.toFixed(1) + 'm (' + bonus.social.a.panicPct + '% panic). Official Excuse: ' + bonus.social.a.verdict,
      72,
      1218,
      PAGE_W - 144,
      30,
      5
    );

    var singleFieldSummary =
      typeof Fn.buildSingleFieldVerdict === 'function'
        ? Fn.buildSingleFieldVerdict(s, feat, bonus, ml)
        : 'Wetness telemetry clocked ' + bonus.wetness.wetA + '% (' + bonus.wetness.labelA + '). Peak crest hit ' + safeNum(feat.crestFactorDb, 0).toFixed(1) + ' dB in ' + Math.round(safeNum(feat.attackSec, 0) * 1000) + 'ms across ' + (feat.burstCount || 1) + ' burst(s). ' + ml.topClass.description;

    drawRoundedCard(sp1.ctx, 44, 1410, PAGE_W - 88, 280, 20, '#1F2937', '#374151');
    sp1.ctx.fillStyle = '#60A5FA';
    sp1.ctx.font = '700 18px monospace';
    sp1.ctx.fillText('OFFICIAL GASTRO-ACOUSTIC FIELD REPORT', 72, 1450);
    sp1.ctx.fillStyle = '#D1D5DB';
    sp1.ctx.font = '600 19px sans-serif';
    drawWrappedText(
      sp1.ctx,
      singleFieldSummary,
      72,
      1492,
      PAGE_W - 144,
      29,
      6
    );
    drawPdfFooter(sp1.ctx);
    pushPageCanvas(sp1);

    // PAGE 2: 8-Chart Comprehensive Telemetry Plots
    var sp2 = createPageCanvas();
    drawPdfHeader(sp2.ctx, 'COMPLETE CHARTS, FFT & MACHINE LEARNING PLOTS', titleName, '40-Band Spectrum, Pitch, Modulation, Envelope, MFCCs, ML Probabilities, Twin & Wall Forecast', 2, 3);
    var chartSlots = [
      { title: '40-Band FFT Energy Spectrum', type: 's_spectrum' },
      { title: 'Pitch Sweep Contour (Hz)', type: 's_pitch' },
      { title: 'Modulation & Flutter FFT (4-45Hz)', type: 's_mod' },
      { title: 'Blast Pressure Envelope', type: 's_envelope' },
      { title: '13-Band MFCC Fingerprint', type: 's_mfcc13' },
      { title: 'ML 6-Class Softmax Probabilities', type: 's_ml_probs' },
      { title: '8-Archetype Sound Twin Affinity', type: 's_twin_bars' },
      { title: 'Drywall & Neighbor Penetration', type: 's_wall_atten' }
    ];
    for (var ci = 0; ci < chartSlots.length; ci++) {
      var cc = ci % 2;
      var cr = Math.floor(ci / 2);
      var bx = 44 + cc * 588;
      var by = 184 + cr * 378;
      drawRoundedCard(sp2.ctx, bx, by, 564, 356, 16, '#111827', '#374151');
      sp2.ctx.fillStyle = '#FFFFFF';
      sp2.ctx.font = '800 17px sans-serif';
      sp2.ctx.textAlign = 'left';
      sp2.ctx.fillText(chartSlots[ci].title, bx + 18, by + 30);
      Fn.drawSingleChartType({ ctx: sp2.ctx, x: bx + 14, y: by + 44, w: 536, h: 296 }, chartSlots[ci].type, s, feat, bonus, ml);
    }
    drawPdfFooter(sp2.ctx);
    pushPageCanvas(sp2);

    // PAGE 3: 3D Spectrogram + ML Explanation + Scientific Equations
    var sp3 = createPageCanvas();
    drawPdfHeader(sp3.ctx, '3D SPECTROGRAM TOPOLOGY & ML EXPLANATION', titleName, 'Full Time-Frequency Energy Map & Feature Vector Breakdown', 3, 3);
    var sDom = (opts.specCanvases && opts.specCanvases[0]) || null;
    drawSpectrogramSlot(sp3.ctx, 44, 194, PAGE_W - 88, 600, sDom, feat.spectrogram, '3D Spectrogram Surface — ' + titleName);

    drawRoundedCard(sp3.ctx, 44, 824, PAGE_W - 88, 420, 20, '#111827', '#374151');
    sp3.ctx.fillStyle = '#8B5CF6';
    sp3.ctx.font = '700 20px monospace';
    sp3.ctx.textAlign = 'left';
    sp3.ctx.fillText('WHAT IS "MACHINE LEARNING ANALYSIS"?', 74, 868);
    sp3.ctx.fillStyle = '#D1D5DB';
    sp3.ctx.font = '600 19px sans-serif';
    drawWrappedText(
      sp3.ctx,
      ml.methodologyNote + ' Measured Input Vector -> Pitch/Centroid: ' + ml.featureVector.pitchHz + ' Hz, Sub-Bass: ' + ml.featureVector.subBandPct + '%, Flatness: ' + ml.featureVector.flatnessPct + '%, Flutter: ' + ml.featureVector.modDepthPct + '%, Bursts: ' + ml.featureVector.bursts + ', Crest: ' + ml.featureVector.crestDb + ' dB, Wetness: ' + ml.featureVector.wetnessPct + '%. Computed 100% locally so no cloud server ever has to explain this to its boss.',
      74,
      910,
      PAGE_W - 148,
      30,
      8
    );

    drawRoundedCard(sp3.ctx, 44, 1272, PAGE_W - 88, 408, 20, '#1F2937', '#374151');
    sp3.ctx.fillStyle = '#60A5FA';
    sp3.ctx.font = '700 20px monospace';
    sp3.ctx.fillText('FORMULAS USED BY TOOT MATCH LABS', 74, 1314);
    var singleEqs = [
      '• STFT Spectrogram: 1024-pt Hann-windowed FFT across 40 log-spaced bands (45 Hz - 4.2 kHz)',
      '• MFCC Signature: Discrete Cosine Transform of log-mel filterbank frame energies',
      '• Squelch / Moisture: 22*norm(ModDepth) + 46*norm(SpectralFlux) + 22*MidSquelchBand + BurstBonus',
      '• Blast Zone (m): 1.8 + 10.5 * (PanicPct / 100)  |  Softmax Prob = exp(-d/0.55) / SUM(exp(-d/0.55))'
    ];
    sp3.ctx.fillStyle = '#93C5FD';
    sp3.ctx.font = '600 17px monospace';
    for (var k = 0; k < singleEqs.length; k++) {
      drawWrappedText(sp3.ctx, singleEqs[k], 74, 1358 + k * 72, PAGE_W - 148, 26, 2);
    }
    drawPdfFooter(sp3.ctx);
    pushPageCanvas(sp3);

    var safeName = String(titleName).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Recording';
    return {
      blob: buildPdfBlobFromJpegPages(pages),
      filename: 'TootMatch_' + safeName + '_Fartnalysis.pdf',
      pageCount: pages.length
    };
  }

  TootLabs.PdfExport = {
    buildPdfBytesFromJpegPages: buildPdfBytesFromJpegPages,
    buildPdfBlobFromJpegPages: buildPdfBlobFromJpegPages,
    generateAnalysisPdf: generateAnalysisPdf
  };
})(typeof window !== 'undefined' ? window : globalThis);
