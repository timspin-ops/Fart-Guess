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

  function drawSpectrogramSlot(ctx, x, y, w, h, domCanvas, spectrogram, title, colormap) {
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
    if (
      root.TootApp &&
      root.TootApp.Spectrogram3D &&
      spectrogram &&
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function'
    ) {
      var sw = Math.max(120, Math.round(w - 32));
      var sh = Math.max(120, Math.round(h - 62));
      var tmp = document.createElement('canvas');
      tmp.width = sw;
      tmp.height = sh;
      tmp.getBoundingClientRect = function () {
        return { width: sw, height: sh };
      };
      var sp = null;
      try {
        sp = new root.TootApp.Spectrogram3D(tmp, {
          spectrogram: spectrogram,
          colormap: colormap || 'plasma',
          autoRotate: false
        });
        if (tmp.width > 20 && tmp.height > 20) {
          drawRoundedCard(ctx, x, y, w, h, 18, '#070B16', '#374151');
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '700 18px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(title, x + 20, y + 32);
          ctx.drawImage(tmp, x + 16, y + 46, w - 32, h - 62);
          return;
        }
      } catch (e2) {
      } finally {
        if (sp && typeof sp.destroy === 'function') {
          try {
            sp.destroy();
          } catch (e3) {}
        }
      }
    }
    drawHeatmapFallback(ctx, x, y, w, h, spectrogram, title);
  }

  function drawForensicsChartToPdf(ctx, box, drawType, soundA, soundB, result) {
    var Forensics = root.TootApp && root.TootApp.Forensics;
    if (!Forensics || typeof Forensics.redrawDrawer !== 'function' || typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return;
    }
    try {
      var bw = Math.max(120, Math.round(box.w));
      var bh = Math.max(80, Math.round(box.h));
      var tmp = document.createElement('canvas');
      tmp.width = bw;
      tmp.height = bh;
      if (typeof tmp.setAttribute === 'function') tmp.setAttribute('data-draw-type', drawType);
      tmp.getAttribute = function (k) {
        return k === 'data-draw-type' ? drawType : '';
      };
      tmp.getBoundingClientRect = function () {
        return { width: bw, height: bh };
      };
      var stub = {
        _forensicsCtx: { soundA: soundA, soundB: soundB, result: result },
        querySelectorAll: function () {
          return [tmp];
        }
      };
      Forensics.redrawDrawer(stub);
      ctx.drawImage(tmp, box.x, box.y, box.w, box.h);
    } catch (e) {}
  }

  function drawCompactGaugeTile(ctx, x, y, w, h, g) {
    drawRoundedCard(ctx, x, y, w, h, 16, '#1B2436', '#334155');
    var col = g.color || '#22C55E';
    var sc = clamp(safeNum(g.score, 0), 0, 100);
    var cx = x + 46;
    var cy = y + 48;
    var r = 28;

    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.5, -Math.PI * 0.5 + (sc / 100) * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.fillStyle = col;
    ctx.font = '800 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(sc) + '%', cx, cy + 6);

    ctx.fillStyle = col;
    ctx.font = '800 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(g.status || 'LOGGED').toUpperCase().slice(0, 16), x + w - 16, y + 48);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '800 16px sans-serif';
    ctx.textAlign = 'left';
    drawWrappedText(ctx, String(g.title || ''), x + 16, y + 102, w - 32, 20, 2);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 13px monospace';
    ctx.fillText(String(g.sub || '').slice(0, 30), x + 16, y + 160);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.fillRect(x + 16, y + h - 22, w - 32, 6);
    ctx.fillStyle = col;
    ctx.fillRect(x + 16, y + h - 22, Math.max(6, (sc / 100) * (w - 32)), 6);
  }

  function drawExpandedCriterionBlock(ctx, x, y, w, h, rep, drawChartFn) {
    drawRoundedCard(ctx, x, y, w, h, 20, '#141D2F', '#334155');
    var col = rep.color || '#38BDF8';
    if (!rep.color) {
      var rs = safeNum(rep.score, 50);
      col = rs >= 80 ? '#22C55E' : rs >= 60 ? '#60A5FA' : rs >= 40 ? '#FBBF24' : '#FB7185';
    }

    ctx.fillStyle = '#60A5FA';
    ctx.font = '700 14px monospace';
    ctx.textAlign = 'left';
    var topBadge = String(rep.badgeCode || 'FORENSIC CRITERION');
    if (rep.weightLabel) topBadge += '  ·  ' + rep.weightLabel;
    ctx.fillText(topBadge.slice(0, 68), x + 24, y + 34);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '800 22px sans-serif';
    ctx.fillText(String(rep.title || '').slice(0, 58), x + 24, y + 64);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 14px sans-serif';
    ctx.fillText(String(rep.subtitle || '').slice(0, 96), x + 24, y + 88);

    drawRoundedCard(ctx, x + w - 134, y + 20, 110, 54, 14, '#0B1222', col);
    ctx.fillStyle = col;
    ctx.font = '800 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(safeNum(rep.score, 0)) + '%', x + w - 79, y + 55);

    // Humorous & Scientific Commentary Box
    drawRoundedCard(ctx, x + 24, y + 102, w - 48, 96, 12, '#0B1222', '#1E293B');
    ctx.fillStyle = col;
    ctx.fillRect(x + 24, y + 110, 5, 80);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 15px sans-serif';
    ctx.textAlign = 'left';
    drawWrappedText(ctx, rep.commentary || '', x + 42, y + 126, w - 84, 21, 4);

    // Two Expanded Side-by-Side Charts
    var charts = rep.charts || [];
    var chCount = Math.min(2, charts.length);
    var chW = chCount === 1 ? w - 48 : Math.floor((w - 72) * 0.5);
    var chY = y + 210;
    var chH = 304;
    for (var ci = 0; ci < chCount; ci++) {
      var ch = charts[ci];
      var cx = x + 24 + ci * (chW + 24);
      drawRoundedCard(ctx, cx, chY, chW, chH, 14, '#0B1222', '#263244');
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(ch.title || '').slice(0, 44), cx + 14, chY + 24);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 12px monospace';
      ctx.fillText(String(ch.subtitle || ch.sub || '').slice(0, 58), cx + 14, chY + 42);
      if (typeof drawChartFn === 'function') {
        drawChartFn(ch, { ctx: ctx, x: cx + 10, y: chY + 52, w: chW - 20, h: chH - 60 });
      }
    }

    // Telemetry Stats Row/Grid
    var stats = (rep.stats || []).slice(0, 6);
    var stY = y + 526;
    if (stats.length > 0) {
      var cols = stats.length <= 4 ? stats.length : 3;
      var rows = Math.ceil(stats.length / cols);
      var stGap = 14;
      var stW = Math.floor((w - 48 - (cols - 1) * stGap) / cols);
      var stH = rows === 1 ? 124 : 59;
      for (var si = 0; si < stats.length; si++) {
        var st = stats[si];
        var sc = si % cols;
        var sr = Math.floor(si / cols);
        var sx = x + 24 + sc * (stW + stGap);
        var sy = stY + sr * (stH + 6);
        drawRoundedCard(ctx, sx, sy, stW, stH, 10, '#0F172A', '#263244');
        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(String(st.label || '').toUpperCase().slice(0, 26), sx + 12, sy + 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = rows === 1 ? '800 18px sans-serif' : '800 15px sans-serif';
        ctx.fillText(String(st.value || '').slice(0, 24), sx + 12, sy + (rows === 1 ? 56 : 38));
        ctx.fillStyle = '#64748B';
        ctx.font = '500 12px sans-serif';
        if (rows === 1) {
          drawWrappedText(ctx, String(st.sub || ''), sx + 12, sy + 82, stW - 24, 16, 2);
        } else {
          ctx.fillText(String(st.sub || '').slice(0, 32), sx + 12, sy + 53);
        }
      }
    }

    // Equation Strip
    var eqY = y + h - 72;
    drawRoundedCard(ctx, x + 24, eqY, w - 48, 56, 10, '#090F1A', '#1E293B');
    drawRoundedCard(ctx, x + 36, eqY + 14, 92, 26, 6, '#1E293B', '#38BDF8');
    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EQUATION', x + 82, eqY + 31);
    ctx.fillStyle = '#93C5FD';
    ctx.font = '600 13px monospace';
    ctx.textAlign = 'left';
    drawWrappedText(ctx, String(rep.formula || ''), x + 142, eqY + 25, w - 184, 18, 2);
  }

  function drawAuthenticitySummaryCard(ctx, x, y, w, h, auth, heading) {
    drawRoundedCard(ctx, x, y, w, h, 18, '#141D2F', '#334155');
    var tier = (auth && auth.tier) || { label: 'Uncertain', color: '#FBBF24' };
    var sc = clamp(safeNum(auth && auth.authenticityScore, 50), 0, 100);
    var col = tier.color || '#FBBF24';

    var ringCx = x + 88;
    var ringCy = y + Math.min(108, h * 0.44);
    var r = 52;
    ctx.lineWidth = 11;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.arc(ringCx, ringCy, r, -Math.PI * 0.5, -Math.PI * 0.5 + (sc / 100) * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.fillStyle = col;
    ctx.font = '800 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(sc) + '%', ringCx, ringCy + 7);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '700 11px sans-serif';
    ctx.fillText(String(tier.label || '').slice(0, 22), ringCx, ringCy + 72);

    var kx = x + 172;
    var kw = w - 192;
    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(heading || 'SPECIMEN ORIGIN TELEMETRY').slice(0, 48), kx, y + 32);

    var kpis = [
      { l: 'Authenticity Score', v: Math.round(sc) + '% (' + tier.label + ')' },
      { l: 'Organic Emission Prob.', v: Math.round(safeNum(auth && auth.organicProbability, sc)) + '%' },
      { l: 'Mouth-Fart Suspicion', v: Math.round(safeNum(auth && auth.mouthSuspicion, 100 - sc)) + '%' },
      { l: 'Analysis Confidence', v: String((auth && auth.confidenceLevel) || 'Moderate') + ' (' + Math.round(safeNum(auth && auth.confidenceScore, 50)) + '%)' }
    ];
    var cellW = Math.floor((kw - 12) / 2);
    for (var ki = 0; ki < kpis.length; ki++) {
      var kc = ki % 2;
      var kr = Math.floor(ki / 2);
      var bx = kx + kc * (cellW + 12);
      var by = y + 46 + kr * 58;
      drawRoundedCard(ctx, bx, by, cellW, 50, 10, '#0B1222', '#263244');
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(kpis[ki].l.toUpperCase(), bx + 10, by + 17);
      ctx.fillStyle = ki === 0 ? col : '#F8FAFC';
      ctx.font = '800 14px sans-serif';
      ctx.fillText(String(kpis[ki].v).slice(0, 26), bx + 10, by + 39);
    }

    var vy = y + 170;
    var vh = h - 186;
    drawRoundedCard(ctx, x + 18, vy, w - 36, vh, 12, '#0B1222', col);
    ctx.fillStyle = col;
    ctx.font = '700 12px monospace';
    ctx.fillText('LABORATORY VERDICT (PROBABILISTIC HEURISTIC ESTIMATE)', x + 32, vy + 22);
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 14px sans-serif';
    drawWrappedText(ctx, (auth && auth.verdict) || '', x + 32, vy + 46, w - 64, 20, Math.max(2, Math.floor((vh - 50) / 20)));
  }

  function drawAuthenticityPdfPage(pg, opts, pageNum, totalPages) {
    var Fn = TootLabs.Fartnalysis;
    var ctx = pg.ctx;
    var authA = opts.authA;
    var authB = opts.authB || null;
    var labelA = opts.labelA || 'Specimen A';
    var labelB = opts.labelB || 'Specimen B';

    drawPdfHeader(
      ctx,
      'AUTHENTICITY ANALYSIS · PURE DSP HEURISTICS (NO ML · ZERO GAME SCORE IMPACT)',
      authB ? labelA + ' vs ' + labelB : labelA,
      'Probabilistic Acoustic Screening (Natural Emission vs Mouth-Generated Likelihood)',
      pageNum,
      totalPages
    );

    var breakdownY;
    var plotY;
    if (authB) {
      drawAuthenticitySummaryCard(ctx, 44, 184, 564, 290, authA, 'SPECIMEN A · ' + labelA);
      drawAuthenticitySummaryCard(ctx, 632, 184, 564, 290, authB, 'SPECIMEN B · ' + labelB);
      plotY = 492;
      drawRoundedCard(ctx, 44, plotY, PAGE_W - 88, 278, 16, '#0B1222', '#334155');
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Side-by-Side Authenticity Indicator Profile (' + labelA.slice(0, 18) + ' vs ' + labelB.slice(0, 18) + ')', 64, plotY + 28);
      if (Fn && typeof Fn.drawAuthenticityPlot === 'function') {
        Fn.drawAuthenticityPlot({ ctx: ctx, x: 56, y: plotY + 38, w: PAGE_W - 112, h: 228 }, authA, authB, labelA, labelB);
      }
      breakdownY = 788;
    } else {
      drawAuthenticitySummaryCard(ctx, 44, 184, PAGE_W - 88, 286, authA, 'SPECIMEN ORIGIN TELEMETRY · ' + labelA);
      plotY = 488;
      drawRoundedCard(ctx, 44, plotY, PAGE_W - 88, 282, 16, '#0B1222', '#334155');
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Authenticity Indicator Matrix (7 DSP Heuristics + Overall Score)', 64, plotY + 28);
      if (Fn && typeof Fn.drawAuthenticityPlot === 'function') {
        Fn.drawAuthenticityPlot({ ctx: ctx, x: 56, y: plotY + 38, w: PAGE_W - 112, h: 232 }, authA);
      }
      breakdownY = 788;
    }

    drawRoundedCard(ctx, 44, breakdownY, PAGE_W - 88, 908, 18, '#111827', '#334155');
    ctx.fillStyle = '#60A5FA';
    ctx.font = '700 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DETAILED AUTHENTICITY BREAKDOWN (7 INDICATORS + OVERALL SCORE)', 66, breakdownY + 30);

    var itemsA = (authA && authA.breakdown) || [];
    var itemsB = (authB && authB.breakdown) || [];
    var rowStartY = breakdownY + 46;
    var rowStep = 106;
    for (var bi = 0; bi < Math.min(8, itemsA.length); bi++) {
      var rA = itemsA[bi];
      var rB = itemsB[bi] || null;
      var ry = rowStartY + bi * rowStep;
      var isOverall = rA.polarity === 'overall';
      drawRoundedCard(
        ctx,
        62,
        ry,
        PAGE_W - 124,
        96,
        12,
        isOverall ? '#162238' : '#0B1222',
        isOverall ? '#38BDF8' : '#263244'
      );
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '800 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(rA.name || ''), 80, ry + 26);

      if (rB) {
        ctx.fillStyle = rA.statusColor || '#60A5FA';
        ctx.font = '700 13px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('A: ' + rA.score + '% (' + rA.status + ')', PAGE_W - 350, ry + 26);
        ctx.fillStyle = rB.statusColor || '#FB7185';
        ctx.fillText('B: ' + rB.score + '% (' + rB.status + ')', PAGE_W - 80, ry + 26);
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '500 13px sans-serif';
        ctx.textAlign = 'left';
        drawWrappedText(
          ctx,
          labelA.slice(0, 14) + ': ' + rA.explanation + '  |  ' + labelB.slice(0, 14) + ': ' + rB.explanation,
          80,
          ry + 50,
          PAGE_W - 160,
          18,
          2
        );
      } else {
        var barX = PAGE_W - 430;
        ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.fillRect(barX, ry + 16, 120, 8);
        ctx.fillStyle = rA.statusColor || '#38BDF8';
        ctx.fillRect(barX, ry + 16, Math.max(4, (clamp(rA.score, 0, 100) / 100) * 120), 8);
        ctx.font = '800 15px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(rA.score + '%', barX + 178, ry + 26);
        ctx.font = '700 13px monospace';
        ctx.fillText(String(rA.status || '').toUpperCase().slice(0, 24), PAGE_W - 80, ry + 26);
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '500 13px sans-serif';
        ctx.textAlign = 'left';
        drawWrappedText(ctx, String(rA.explanation || ''), 80, ry + 50, PAGE_W - 160, 18, 2);
      }
    }

    drawPdfFooter(ctx);
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
      var dataUrl = pg.canvas.toDataURL('image/jpeg', 0.84);
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
      var authA = typeof Fn.computeAuthenticityAnalysis === 'function' ? Fn.computeAuthenticityAnalysis(sA) : null;
      var authB = typeof Fn.computeAuthenticityAnalysis === 'function' ? Fn.computeAuthenticityAnalysis(sB) : null;
      var labelA = sA.displayName || sA.name || 'Original';
      var labelB = sB.name || 'Guess';
      var totalCmpPages = 7;

      // PAGE 1: 3D Spectrograms FIRST + Executive Verdict + All 12 Comparison Tiles
      var p1 = createPageCanvas();
      drawPdfHeader(
        p1.ctx,
        'FORENSIC COMPARISON DOSSIER · ' + nowStr,
        labelA + ' vs ' + labelB,
        'Match Quality: ' + exact.toFixed(1) + '% | Rank: ' + rank.title + ' (Grade ' + res.grade + ')',
        1,
        totalCmpPages
      );
      var domSpecs = opts.specCanvases || [];
      drawSpectrogramSlot(p1.ctx, 44, 180, 564, 468, domSpecs[0], fA.spectrogram, 'Sound A: ' + labelA, 'plasma');
      drawSpectrogramSlot(p1.ctx, 632, 180, 564, 468, domSpecs[1], fB.spectrogram, 'Sound B: ' + labelB, 'magma');

      var bonusCmp = Forensics && typeof Forensics.computeBonusMetrics === 'function' ? Forensics.computeBonusMetrics(fA, fB) : null;
      drawRoundedCard(p1.ctx, 44, 666, PAGE_W - 88, 304, 18, '#111827', '#374151');
      p1.ctx.fillStyle = '#22C55E';
      p1.ctx.font = '700 17px monospace';
      p1.ctx.textAlign = 'left';
      p1.ctx.fillText('SCIENTIFIC REFEREE VERDICT, HUMOROUS NOTES & ML CROSS-CHECK', 68, 700);
      p1.ctx.fillStyle = '#FFFFFF';
      p1.ctx.font = '600 18px sans-serif';
      drawWrappedText(p1.ctx, verdict, 68, 732, PAGE_W - 136, 25, 3);
      p1.ctx.fillStyle = '#D1D5DB';
      p1.ctx.font = '600 16px sans-serif';
      drawWrappedText(
        p1.ctx,
        'Duration: ' + fA.duration.toFixed(2) + 's vs ' + fB.duration.toFixed(2) + 's | ' +
          'Flutter: ' + Math.round(safeNum(fA.modRateHz, 0) * 60) + ' vs ' + Math.round(safeNum(fB.modRateHz, 0) * 60) + ' flaps/min. ' +
          (bonusCmp
            ? 'Laundry Advisory: ' + bonusCmp.wetness.wetA + '% (' + bonusCmp.wetness.labelA + ') vs ' + bonusCmp.wetness.wetB + '% (' + bonusCmp.wetness.labelB + '). Sound Twins: ' + bonusCmp.acoustics.twinA.name + ' vs ' + bonusCmp.acoustics.twinB.name + '. Alibi: ' + bonusCmp.social.b.verdict
            : ''),
        68,
        822,
        PAGE_W - 136,
        24,
        4
      );
      p1.ctx.fillStyle = '#60A5FA';
      p1.ctx.font = '700 15px monospace';
      p1.ctx.fillText(
        'Original ML: ' + mlA.topClass.name + ' (' + mlA.confidence + '%)   |   Guess ML: ' + mlB.topClass.name + ' (' + mlB.confidence + '%)',
        68,
        948
      );

      for (var ci = 0; ci < Math.min(12, gauges.length); ci++) {
        var cCol = ci % 4;
        var cRow = Math.floor(ci / 4);
        drawCompactGaugeTile(p1.ctx, 44 + cCol * 292, 988 + cRow * 234, 274, 214, gauges[ci]);
      }
      drawPdfFooter(p1.ctx);
      pushPageCanvas(p1);

      // PAGES 2-5: All First 8 Forensics Criteria Opened in Full (2 per page)
      var cmpKeys = ['overall', 'duration', 'pitch', 'modulation', 'timbre', 'envelope', 'wetness', 'acoustics'];
      for (var pIdx = 0; pIdx < 4; pIdx++) {
        var cp = createPageCanvas();
        drawPdfHeader(
          cp.ctx,
          'EXPANDED COMPARISON CRITERIA · PART ' + (pIdx + 1) + ' OF 5',
          labelA + ' vs ' + labelB,
          'Opened Forensics Commentary, Side-by-Side Plots, Telemetry Stats & Scoring Equations',
          pIdx + 2,
          totalCmpPages
        );
        for (var slotIdx = 0; slotIdx < 2; slotIdx++) {
          var fKey = cmpKeys[pIdx * 2 + slotIdx];
          var rep = Forensics.buildCriterionReport(fKey, sA, sB, res);
          drawExpandedCriterionBlock(
            cp.ctx,
            44,
            184 + slotIdx * 766,
            PAGE_W - 88,
            746,
            rep,
            function (ch, box) {
              drawForensicsChartToPdf(cp.ctx, box, ch.drawType, sA, sB, res);
            }
          );
        }
        drawPdfFooter(cp.ctx);
        pushPageCanvas(cp);
      }

      // PAGE 6: 9th Forensics Criterion (social / Alibi) + ML Distributions + Mathematical Equations
      var p6 = createPageCanvas();
      drawPdfHeader(
        p6.ctx,
        'ELEVATOR ALIBI AUDIT, ML CLASSIFICATION & FORMULAS',
        labelA + ' vs ' + labelB,
        'Opened Social Blast Perimeter Analysis, 22-Feature ML Classification & Scoring Mathematics',
        6,
        totalCmpPages
      );
      var socRep = Forensics.buildCriterionReport('social', sA, sB, res);
      drawExpandedCriterionBlock(p6.ctx, 44, 184, PAGE_W - 88, 746, socRep, function (ch, box) {
        drawForensicsChartToPdf(p6.ctx, box, ch.drawType, sA, sB, res);
      });

      drawRoundedCard(p6.ctx, 44, 950, PAGE_W - 88, 742, 20, '#111827', '#334155');
      p6.ctx.fillStyle = '#8B5CF6';
      p6.ctx.font = '700 17px monospace';
      p6.ctx.textAlign = 'left';
      p6.ctx.fillText('ON-DEVICE ML ARCHETYPE CLASSIFICATION & EQUATIONS', 68, 984);
      p6.ctx.fillStyle = '#60A5FA';
      p6.ctx.font = '700 14px monospace';
      p6.ctx.fillText('ORIGINAL (' + labelA.slice(0, 22) + ') ML DISTRIBUTION', 68, 1012);
      p6.ctx.fillStyle = '#FB7185';
      p6.ctx.fillText('GUESS (' + labelB.slice(0, 22) + ') ML DISTRIBUTION', 648, 1012);
      Fn.drawSingleChartType({ ctx: p6.ctx, x: 68, y: 1024, w: 524, h: 256 }, 's_ml_probs', sA, fA, null, mlA);
      Fn.drawSingleChartType({ ctx: p6.ctx, x: 648, y: 1024, w: 524, h: 256 }, 's_ml_probs', sB, fB, null, mlB);

      p6.ctx.fillStyle = '#22C55E';
      p6.ctx.font = '700 16px monospace';
      p6.ctx.fillText('WHAT IS "MACHINE LEARNING ANALYSIS" IN TOOT MATCH?', 68, 1314);
      p6.ctx.fillStyle = '#D1D5DB';
      p6.ctx.font = '500 15px sans-serif';
      drawWrappedText(
        p6.ctx,
        'Toot Match runs a 100% private, offline 22-feature acoustic ML classifier directly in JavaScript with zero server uploads. STFT spectrograms, 13-band MFCCs, Wiener flatness, modulation FFT, and crest factor feed temperature-scaled softmax distances across 6 acoustic archetypes — zero cloud servers required.',
        68,
        1344,
        PAGE_W - 136,
        22,
        4
      );
      p6.ctx.fillStyle = '#60A5FA';
      p6.ctx.font = '700 16px monospace';
      p6.ctx.fillText('MATHEMATICAL SCORING EQUATIONS', 68, 1456);
      var cmpEqs = [
        '1. Overall Parity = 0.60*Arith + 0.40*Geom across (Duration 14%, Pitch 26%, Flutter 18%, Timbre 28%, Envelope 14%)',
        '2. MFCC Cosine Similarity = dot(MFCC_A, MFCC_B) / (||MFCC_A|| * ||MFCC_B||)',
        '3. Pitch Gap = |12 * log2(F0_Guess / F0_Original)| semitones',
        '4. Modulation FFT = Hann-windowed FFT(Envelope - Mean) across [4 Hz .. 45 Hz]',
        '5. Squelch Index = 22*norm(ModDepth) + 46*norm(SpectralFlux) + 22*MidBand + BurstBonus',
        '6. Blast Radius (m) = 1.8 + 10.5 * (PanicPct / 100)'
      ];
      p6.ctx.fillStyle = '#93C5FD';
      p6.ctx.font = '600 14px monospace';
      for (var ceq = 0; ceq < cmpEqs.length; ceq++) {
        p6.ctx.fillText(cmpEqs[ceq].slice(0, 106), 68, 1488 + ceq * 31);
      }
      drawPdfFooter(p6.ctx);
      pushPageCanvas(p6);

      // PAGE 7: Side-by-Side Authenticity Analysis (Informational Only)
      var p7 = createPageCanvas();
      drawAuthenticityPdfPage(
        p7,
        { authA: authA, authB: authB, labelA: labelA, labelB: labelB },
        7,
        totalCmpPages
      );
      pushPageCanvas(p7);

      var cmpSafeA = String(labelA).replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Original';
      return { blob: buildPdfBlobFromJpegPages(pages), filename: 'TootMatch_' + cmpSafeA + '_Comparison.pdf', pageCount: pages.length };
    }

    if (mode === 'group' && opts.groupObj) {
      var grp = opts.groupObj;
      var gg = Fn.buildGroupGauges(grp);
      var gMl = Fn.classifyAcousticProfile(grp.features);
      var gBonus = Forensics && grp.features ? Forensics.computeBonusMetrics(grp.features, grp.features) : null;
      var gAuth = typeof Fn.computeAuthenticityAnalysis === 'function'
        ? Fn.computeAuthenticityAnalysis({ features: grp.features, samples: grp.samples, sampleRate: grp.sampleRate })
        : null;
      var gDom = (opts.specCanvases && opts.specCanvases[0]) || null;
      var totalGrpPages = 4;

      // PAGE 1: Unified 3D Spectrogram FIRST + Symphony Waveform + Ensemble Verdict + 6 Gauges
      var gp1 = createPageCanvas();
      drawPdfHeader(
        gp1.ctx,
        'MULTI-FART GROUP TELEMETRY · ' + nowStr,
        grp.name,
        grp.metrics.count + ' Vault Specimens Combined (' + grp.metrics.totalDurationSec.toFixed(2) + 's)',
        1,
        totalGrpPages
      );
      drawSpectrogramSlot(
        gp1.ctx,
        44,
        180,
        PAGE_W - 88,
        486,
        gDom,
        grp.features ? grp.features.spectrogram : null,
        'Unified Group Track 3D Spectrogram — ' + grp.name,
        'toxic'
      );
      Fn.drawSegmentedWaveform({ ctx: gp1.ctx, x: 44, y: 684, w: PAGE_W - 88, h: 204 }, grp, null);
      drawRoundedCard(gp1.ctx, 44, 906, PAGE_W - 88, 224, 18, '#111827', '#374151');
      gp1.ctx.fillStyle = '#22C55E';
      gp1.ctx.font = '700 17px monospace';
      gp1.ctx.textAlign = 'left';
      gp1.ctx.fillText('CONDUCTOR VERDICT & COMPOSITE ML CLASSIFICATION', 68, 942);
      gp1.ctx.fillStyle = '#FFFFFF';
      gp1.ctx.font = '600 18px sans-serif';
      drawWrappedText(
        gp1.ctx,
        grp.metrics.groupVerdict + ' Composite ML Archetype: "' + gMl.topClass.name + '" (' + gMl.confidence + '% certainty). Sort Order: ' + (grp.metrics.sortLabel || 'Custom'),
        68,
        978,
        PAGE_W - 136,
        27,
        5
      );
      for (var gi = 0; gi < Math.min(6, gg.length); gi++) {
        var gc = gi % 3;
        var gr = Math.floor(gi / 3);
        drawCompactGaugeTile(gp1.ctx, 44 + gc * 392, 1148 + gr * 224, 368, 206, gg[gi]);
      }
      drawPdfFooter(gp1.ctx);
      pushPageCanvas(gp1);

      // PAGE 2: Group Spatial, Spectral, Pitch & Modulation Plots + Full Movement Tracklist
      var gp2 = createPageCanvas();
      drawPdfHeader(
        gp2.ctx,
        'GROUP CHARTS, MOVEMENT TRACKLIST & COHERENCE AUDIT',
        grp.name,
        'Vault Map, Aggregate FFT, Combined Pitch & Flutter Contours, Sequential Tracklist',
        2,
        totalGrpPages
      );
      drawRoundedCard(gp2.ctx, 44, 184, 564, 338, 16, '#111827', '#374151');
      gp2.ctx.fillStyle = '#FFFFFF';
      gp2.ctx.font = '700 16px sans-serif';
      gp2.ctx.textAlign = 'left';
      gp2.ctx.fillText('Vault Specimen Map (Pitch vs Moisture)', 62, 212);
      Fn.drawConstellationPlot({ ctx: gp2.ctx, x: 56, y: 224, w: 540, h: 286 }, grp);

      drawRoundedCard(gp2.ctx, 632, 184, 564, 338, 16, '#111827', '#374151');
      gp2.ctx.fillStyle = '#FFFFFF';
      gp2.ctx.font = '700 16px sans-serif';
      gp2.ctx.fillText('Combined 40-Band FFT Energy Spectrum', 650, 212);
      Fn.drawSpectrumPlot({ ctx: gp2.ctx, x: 644, y: 224, w: 540, h: 286 }, grp.features, '#22C55E');

      drawRoundedCard(gp2.ctx, 44, 540, 564, 338, 16, '#111827', '#374151');
      gp2.ctx.fillStyle = '#FFFFFF';
      gp2.ctx.font = '700 16px sans-serif';
      gp2.ctx.fillText('Combined Pitch Contour Across Megamix', 62, 568);
      Fn.drawPitchContourPlot({ ctx: gp2.ctx, x: 56, y: 580, w: 540, h: 286 }, grp.features);

      drawRoundedCard(gp2.ctx, 632, 540, 564, 338, 16, '#111827', '#374151');
      gp2.ctx.fillStyle = '#FFFFFF';
      gp2.ctx.font = '700 16px sans-serif';
      gp2.ctx.fillText('Combined Modulation & Flutter FFT (4-45 Hz)', 650, 568);
      Fn.drawModulationPlot({ ctx: gp2.ctx, x: 644, y: 580, w: 540, h: 286 }, grp.features);

      drawRoundedCard(gp2.ctx, 44, 898, PAGE_W - 88, 524, 18, '#1F2937', '#374151');
      gp2.ctx.fillStyle = '#60A5FA';
      gp2.ctx.font = '700 17px monospace';
      gp2.ctx.fillText('MOVEMENT TRACKLIST (' + (grp.metrics.sortLabel || 'Arranged') + ')', 68, 934);
      gp2.ctx.fillStyle = '#D1D5DB';
      gp2.ctx.font = '600 15px monospace';
      var segs = (grp.segments || []).slice(0, 14);
      for (var si = 0; si < segs.length; si++) {
        var sg = segs[si];
        gp2.ctx.fillText(
          (si + 1) + '. ' + String(sg.name || '').slice(0, 26) + '   [' + sg.startSec.toFixed(2) + 's-' + sg.endSec.toFixed(2) + 's]   ~' + Math.round(sg.pitchHz) + ' Hz   Wet ' + sg.wetnessPct + '%   Crest ' + safeNum(sg.crestDb, 0).toFixed(1) + ' dB',
          68,
          972 + si * 31
        );
      }

      drawRoundedCard(gp2.ctx, 44, 1440, PAGE_W - 88, 250, 18, '#111827', '#374151');
      gp2.ctx.fillStyle = '#8B5CF6';
      gp2.ctx.font = '700 17px monospace';
      gp2.ctx.fillText('HOW MULTI-FART COHERENCE IS MEASURED', 68, 1478);
      gp2.ctx.fillStyle = '#D1D5DB';
      gp2.ctx.font = '500 17px sans-serif';
      drawWrappedText(
        gp2.ctx,
        'Every saved Vault recording is cleanly resampled to 44.1 kHz, micro-faded at 8ms boundaries, and stitched with 0.18s silent pauses in your chosen arrangement order. Ensemble gauges track octave continuity across movements, cumulative crest headroom, and aggregate harmonic texture — giving a medley of farts the studio mastering dignity Carnegie Hall never asked for.',
        68,
        1516,
        PAGE_W - 136,
        26,
        5
      );
      drawPdfFooter(gp2.ctx);
      pushPageCanvas(gp2);

      // PAGE 3: Group Authenticity Analysis (Informational Only)
      var gp3 = createPageCanvas();
      drawAuthenticityPdfPage(
        gp3,
        { authA: gAuth, authB: null, labelA: grp.name },
        3,
        totalGrpPages
      );
      pushPageCanvas(gp3);

      // PAGE 4: 2x2 Deep Ensemble Telemetry & Methodology
      var gp4 = createPageCanvas();
      drawPdfHeader(
        gp4.ctx,
        'ENSEMBLE DEEP TELEMETRY & MACHINE LEARNING BREAKDOWN',
        grp.name,
        'ML Classification Probabilities, 13-Band MFCCs, Frequency Bands & Blast Envelope',
        4,
        totalGrpPages
      );
      var gCharts = [
        { title: 'Composite ML 6-Class Softmax Fit', type: 's_ml_probs' },
        { title: 'Ensemble 13-Band MFCC Timbre', type: 's_mfcc13' },
        { title: '4-Band Frequency Energy Share', type: 's_4band' },
        { title: 'Aggregate Blast Pressure Envelope', type: 's_envelope' }
      ];
      for (var gci = 0; gci < gCharts.length; gci++) {
        var gcc = gci % 2;
        var gcr = Math.floor(gci / 2);
        var gbx = 44 + gcc * 588;
        var gby = 186 + gcr * 420;
        drawRoundedCard(gp4.ctx, gbx, gby, 564, 398, 16, '#111827', '#374151');
        gp4.ctx.fillStyle = '#FFFFFF';
        gp4.ctx.font = '800 17px sans-serif';
        gp4.ctx.textAlign = 'left';
        gp4.ctx.fillText(gCharts[gci].title, gbx + 18, gby + 32);
        Fn.drawSingleChartType({ ctx: gp4.ctx, x: gbx + 14, y: gby + 48, w: 536, h: 336 }, gCharts[gci].type, grp, grp.features, gBonus, gMl);
      }
      drawRoundedCard(gp4.ctx, 44, 1034, PAGE_W - 88, 650, 20, '#111827', '#334155');
      gp4.ctx.fillStyle = '#22C55E';
      gp4.ctx.font = '700 18px monospace';
      gp4.ctx.fillText('COMPOSITE ML EXPLANATION & MASTER EQUATIONS', 72, 1076);
      gp4.ctx.fillStyle = '#D1D5DB';
      gp4.ctx.font = '500 18px sans-serif';
      drawWrappedText(
        gp4.ctx,
        gMl.methodologyNote + ' Master Feature Vector -> Pitch/Centroid: ' + gMl.featureVector.pitchHz + ' Hz, Sub-Bass: ' + gMl.featureVector.subBandPct + '%, Flatness: ' + gMl.featureVector.flatnessPct + '%, Flutter: ' + gMl.featureVector.modDepthPct + '%, Bursts: ' + gMl.featureVector.bursts + ', Crest: ' + gMl.featureVector.crestDb + ' dB, Wetness: ' + gMl.featureVector.wetnessPct + '%. Computed 100% locally in your browser.',
        72,
        1116,
        PAGE_W - 144,
        28,
        7
      );
      gp4.ctx.fillStyle = '#93C5FD';
      gp4.ctx.font = '600 16px monospace';
      gp4.ctx.fillText('• Coherent STFT: 1024-pt Hann FFT across 40 log-spaced bands (45 Hz - 4.2 kHz)', 72, 1380);
      gp4.ctx.fillText('• Concatenated Envelope Crest = 20 * log10(max(|Mix|) / RMS(Mix))', 72, 1430);
      gp4.ctx.fillText('• Cross-Movement Coherence = 100 * exp(-PitchDispersionOctaves) * EnergyBalance', 72, 1480);
      gp4.ctx.fillText('• Authenticity Analysis: 7 Pure DSP Heuristics (Informational Only)', 72, 1530);
      drawPdfFooter(gp4.ctx);
      pushPageCanvas(gp4);

      return { blob: buildPdfBlobFromJpegPages(pages), filename: 'TootMatch_Group_Megamix_Fartnalysis.pdf', pageCount: pages.length };
    }

    // DEFAULT: SINGLE FART DOSSIER (Original Fart or Guess Analysis — 9 Pages, Full Whack)
    var s = opts.sound;
    var feat = s.features || DSP.extractFeatures(s.samples, s.sampleRate);
    s.features = feat;
    var bonus = Forensics.computeBonusMetrics(feat, feat);
    var ml = Fn.classifyAcousticProfile(feat, bonus);
    var authS = typeof Fn.computeAuthenticityAnalysis === 'function' ? Fn.computeAuthenticityAnalysis(s) : null;
    var sGauges = Fn.buildSingleGauges(s);
    var prof = DSP.describeSoundProfile(feat);
    var titleName = opts.label || s.displayName || s.name || 'Saved Fart';
    var totalSinglePages = 9;

    // PAGE 1: HERO 3D Spectrogram FIRST + Field Report + All 12 Summary Tiles
    var sp1 = createPageCanvas();
    drawPdfHeader(
      sp1.ctx,
      (opts.eyebrow || 'INDIVIDUAL FARTNALYSIS DOSSIER') + ' · ' + nowStr,
      titleName,
      prof.durationLabel + '  |  ' + prof.pitchLabel + '  |  ' + prof.textureLabel,
      1,
      totalSinglePages
    );
    var sDom = (opts.specCanvases && opts.specCanvases[0]) || null;
    drawSpectrogramSlot(sp1.ctx, 44, 180, PAGE_W - 88, 522, sDom, feat.spectrogram, '3D Spectrogram Surface — ' + titleName, 'plasma');

    var singleFieldSummary =
      typeof Fn.buildSingleFieldVerdict === 'function'
        ? Fn.buildSingleFieldVerdict(s, feat, bonus, ml)
        : 'Wetness telemetry clocked ' + bonus.wetness.wetA + '% (' + bonus.wetness.labelA + '). ' + ml.topClass.description;

    drawRoundedCard(sp1.ctx, 44, 718, PAGE_W - 88, 252, 18, '#111827', '#374151');
    sp1.ctx.fillStyle = '#22C55E';
    sp1.ctx.font = '700 16px monospace';
    sp1.ctx.textAlign = 'left';
    sp1.ctx.fillText('OFFICIAL GASTRO-ACOUSTIC FIELD REPORT, ML PROFILE & ALIBI', 68, 750);
    sp1.ctx.fillStyle = '#FFFFFF';
    sp1.ctx.font = '600 17px sans-serif';
    drawWrappedText(sp1.ctx, singleFieldSummary, 68, 782, PAGE_W - 136, 24, 5);
    sp1.ctx.fillStyle = '#60A5FA';
    sp1.ctx.font = '700 15px monospace';
    sp1.ctx.fillText(
      'ML Class: ' + ml.topClass.name + ' (' + ml.confidence + '%)   |   Twin: ' + bonus.acoustics.twinA.name + ' (' + bonus.acoustics.topScoreA + '%)   |   Blast Zone: ' + bonus.social.a.radiusM.toFixed(1) + 'm',
      68,
      944
    );

    for (var sgIdx = 0; sgIdx < Math.min(12, sGauges.length); sgIdx++) {
      var sc = sgIdx % 4;
      var srow = Math.floor(sgIdx / 4);
      drawCompactGaugeTile(sp1.ctx, 44 + sc * 292, 988 + srow * 234, 274, 214, sGauges[sgIdx]);
    }
    drawPdfFooter(sp1.ctx);
    pushPageCanvas(sp1);

    // PAGES 2-7: ALL 12 Single-Fart Criteria Opened in Full (2 expanded criteria per page)
    for (var pgIdx = 0; pgIdx < 6; pgIdx++) {
      var spC = createPageCanvas();
      drawPdfHeader(
        spC.ctx,
        'COMPLETE CRITERIA & CHARTS · PART ' + (pgIdx + 1) + ' OF 6',
        titleName,
        'Expanded Telemetry Commentary, Dual DSP Charts, Measurements & Formulas',
        pgIdx + 2,
        totalSinglePages
      );
      for (var kIdx = 0; kIdx < 2; kIdx++) {
        var gObj = sGauges[pgIdx * 2 + kIdx];
        if (!gObj) continue;
        var sRep = Fn.buildSingleDialReport(gObj.id, s);
        drawExpandedCriterionBlock(
          spC.ctx,
          44,
          184 + kIdx * 766,
          PAGE_W - 88,
          746,
          sRep,
          function (ch, box) {
            Fn.drawSingleChartType(box, ch.drawType, s, feat, bonus, ml);
          }
        );
      }
      drawPdfFooter(spC.ctx);
      pushPageCanvas(spC);
    }

    // PAGE 8: Full Expanded Authenticity Analysis (Pure Heuristic, Informational Only)
    var spAuth = createPageCanvas();
    drawAuthenticityPdfPage(
      spAuth,
      { authA: authS, authB: null, labelA: titleName },
      8,
      totalSinglePages
    );
    pushPageCanvas(spAuth);

    // PAGE 9: Core Spectral/Temporal Plots + ML Explanation + Master Equations
    var sp9 = createPageCanvas();
    drawPdfHeader(
      sp9.ctx,
      'CORE PLOTS, MACHINE LEARNING METHODOLOGY & EQUATIONS',
      titleName,
      '40-Band Spectrum, Pitch Contour, Modulation FFT, Envelope & Full Feature Tensor',
      9,
      totalSinglePages
    );
    var coreSlots = [
      { title: '40-Band FFT Energy Spectrum', type: 's_spectrum' },
      { title: 'Pitch Sweep Contour (Hz)', type: 's_pitch' },
      { title: 'Modulation & Flutter FFT (4-45 Hz)', type: 's_mod' },
      { title: 'Blast Pressure Envelope', type: 's_envelope' }
    ];
    for (var csi = 0; csi < coreSlots.length; csi++) {
      var csc = csi % 2;
      var csr = Math.floor(csi / 2);
      var bx = 44 + csc * 588;
      var by = 186 + csr * 356;
      drawRoundedCard(sp9.ctx, bx, by, 564, 336, 16, '#111827', '#374151');
      sp9.ctx.fillStyle = '#FFFFFF';
      sp9.ctx.font = '800 17px sans-serif';
      sp9.ctx.textAlign = 'left';
      sp9.ctx.fillText(coreSlots[csi].title, bx + 18, by + 30);
      Fn.drawSingleChartType({ ctx: sp9.ctx, x: bx + 14, y: by + 44, w: 536, h: 278 }, coreSlots[csi].type, s, feat, bonus, ml);
    }

    drawRoundedCard(sp9.ctx, 44, 912, PAGE_W - 88, 368, 18, '#111827', '#374151');
    sp9.ctx.fillStyle = '#8B5CF6';
    sp9.ctx.font = '700 19px monospace';
    sp9.ctx.textAlign = 'left';
    sp9.ctx.fillText('WHAT IS "MACHINE LEARNING ANALYSIS" IN TOOT MATCH LABS?', 72, 954);
    sp9.ctx.fillStyle = '#D1D5DB';
    sp9.ctx.font = '600 18px sans-serif';
    drawWrappedText(
      sp9.ctx,
      ml.methodologyNote + ' Measured Input Vector -> Pitch/Centroid: ' + ml.featureVector.pitchHz + ' Hz, Sub-Bass: ' + ml.featureVector.subBandPct + '%, Flatness: ' + ml.featureVector.flatnessPct + '%, Flutter: ' + ml.featureVector.modDepthPct + '%, Bursts: ' + ml.featureVector.bursts + ', Crest: ' + ml.featureVector.crestDb + ' dB, Wetness: ' + ml.featureVector.wetnessPct + '%. Computed 100% locally so no cloud server ever has to explain this to its boss.',
      72,
      996,
      PAGE_W - 144,
      28,
      8
    );

    drawRoundedCard(sp9.ctx, 44, 1300, PAGE_W - 88, 386, 18, '#1F2937', '#374151');
    sp9.ctx.fillStyle = '#60A5FA';
    sp9.ctx.font = '700 19px monospace';
    sp9.ctx.fillText('MASTER EQUATIONS USED BY TOOT MATCH LABS', 72, 1342);
    var singleEqs = [
      '• STFT Spectrogram: 1024-pt Hann-windowed FFT across 40 log-spaced bands (45 Hz - 4.2 kHz)',
      '• MFCC Signature: Discrete Cosine Transform of log-mel filterbank frame energies (C1..C13)',
      '• Squelch / Moisture: 22*norm(ModDepth) + 46*norm(SpectralFlux) + 22*MidSquelchBand + BurstBonus',
      '• Blast Zone (m): 1.8 + 10.5 * (PanicPct / 100)  |  Softmax Prob = exp(-d/0.55) / SUM(exp(-d/0.55))'
    ];
    sp9.ctx.fillStyle = '#93C5FD';
    sp9.ctx.font = '600 16px monospace';
    for (var k = 0; k < singleEqs.length; k++) {
      drawWrappedText(sp9.ctx, singleEqs[k], 72, 1384 + k * 70, PAGE_W - 144, 24, 2);
    }
    drawPdfFooter(sp9.ctx);
    pushPageCanvas(sp9);

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
