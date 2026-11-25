(function (root) {
  'use strict';

  var TootApp = (root.TootApp = root.TootApp || {});

  function clamp(val, min, max) {
    return val < min ? min : val > max ? max : val;
  }

  function safeNumber(val, fallback) {
    return Number.isFinite(val) ? val : fallback;
  }

  function nextPow2(n) {
    var p = 1;
    while (p < n) p <<= 1;
    return p;
  }

  /**
   * In-place iterative radix-2 Cooley-Tukey FFT.
   * @param {Float32Array} re Real part (length must be power of 2)
   * @param {Float32Array} im Imaginary part (same length as re)
   */
  function fft(re, im) {
    var n = re.length;
    if (n <= 1 || (n & (n - 1)) !== 0) return;

    // Bit-reversal permutation
    var j = 0;
    for (var i = 0; i < n; i++) {
      if (i < j) {
        var tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        var ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
      var m = n >> 1;
      while (m >= 1 && j >= m) {
        j -= m;
        m >>= 1;
      }
      j += m;
    }

    // Butterfly stages
    for (var size = 2; size <= n; size <<= 1) {
      var half = size >> 1;
      var angleStep = (-2 * Math.PI) / size;
      var wStepRe = Math.cos(angleStep);
      var wStepIm = Math.sin(angleStep);

      for (var start = 0; start < n; start += size) {
        var wRe = 1.0;
        var wIm = 0.0;
        for (var k = 0; k < half; k++) {
          var evenIdx = start + k;
          var oddIdx = evenIdx + half;
          var oddRe = re[oddIdx];
          var oddIm = im[oddIdx];

          var tRe = wRe * oddRe - wIm * oddIm;
          var tIm = wRe * oddIm + wIm * oddRe;

          re[oddIdx] = re[evenIdx] - tRe;
          im[oddIdx] = im[evenIdx] - tIm;
          re[evenIdx] += tRe;
          im[evenIdx] += tIm;

          var nextWRe = wRe * wStepRe - wIm * wStepIm;
          wIm = wRe * wStepIm + wIm * wStepRe;
          wRe = nextWRe;
        }
      }
    }
  }

  /**
   * Cosine fade-in/out (8ms default) and peak normalization to targetPeak (0.92).
   */
  function fadeAndNormalize(slice, sampleRate, fadeMs, targetPeak) {
    var n = slice.length;
    var out = new Float32Array(n);
    if (n === 0) return out;

    var peak = 0;
    for (var i = 0; i < n; i++) {
      var a = Math.abs(slice[i]);
      if (a > peak) peak = a;
    }

    var gain = peak > 1e-7 ? targetPeak / peak : 1.0;
    var fadeSamples = Math.min(Math.floor(n / 3), Math.max(1, Math.round(((fadeMs || 8) / 1000) * sampleRate)));

    for (var j = 0; j < n; j++) {
      var w = 1.0;
      if (j < fadeSamples) {
        w = 0.5 * (1 - Math.cos((Math.PI * j) / fadeSamples));
      } else if (j >= n - fadeSamples) {
        var dist = n - 1 - j;
        w = 0.5 * (1 - Math.cos((Math.PI * dist) / fadeSamples));
      }
      out[j] = slice[j] * gain * w;
    }
    return out;
  }

  /**
   * Authenticity v2: Measure respiratory pre-onset inhalation hiss (-450ms..-15ms before clip onset)
   * on the raw pre-clipped audio buffer using a stateful >1 kHz HPF against quiet ambient baseline.
   */
  function measurePreOnsetBreath(samples, sampleRate, onsetSample, noiseFloorRms, eventPeakRms) {
    var sr = sampleRate || 44100;
    var onset = Math.max(0, Math.round(safeNumber(onsetSample, 0)));
    var winStart = Math.max(0, onset - Math.round(0.450 * sr));
    var winEnd = Math.max(0, onset - Math.round(0.015 * sr));
    var winLen = Math.max(0, winEnd - winStart);

    if (!samples || samples.length === 0 || onset <= 0 || winLen < Math.round(0.080 * sr)) {
      return {
        available: false,
        score: 0,
        breathSnrDb: 0,
        breathDurMs: 0,
        highFreqShare: 0,
        preWindowSec: Number((winLen / sr).toFixed(3))
      };
    }

    var alphaHi = 1 - Math.exp((-2 * Math.PI * 1000) / sr);
    var frameLen = Math.max(32, Math.round(0.020 * sr));
    var hopLen = Math.max(16, Math.round(0.010 * sr));

    // Estimate ambient >1 kHz RMS from [onset-1.6s .. winStart] when >= 150ms exists
    var ambStart = Math.max(0, onset - Math.round(1.600 * sr));
    var ambLen = winStart - ambStart;
    var ambientHiRms = Math.max(0.001, (safeNumber(noiseFloorRms, 0) || 0.002) * 0.65);

    if (ambLen >= Math.round(0.150 * sr)) {
      var ambHi = new Float32Array(ambLen);
      var lpAmb = 0;
      for (var ai = 0; ai < ambLen; ai++) {
        var av = samples[ambStart + ai];
        lpAmb += alphaHi * (av - lpAmb);
        ambHi[ai] = av - lpAmb;
      }
      var ambFrames = [];
      for (var af = 0; af + frameLen <= ambLen; af += hopLen) {
        var aSum = 0;
        for (var ak = af; ak < af + frameLen; ak++) {
          aSum += ambHi[ak] * ambHi[ak];
        }
        ambFrames.push(Math.sqrt(aSum / frameLen));
      }
      if (ambFrames.length > 0) {
        ambFrames.sort(function (a, b) { return a - b; });
        var p25 = ambFrames[Math.min(ambFrames.length - 1, Math.floor(ambFrames.length * 0.25))];
        ambientHiRms = Math.max(0.001, p25);
      }
    }

    // Warm >1 kHz HPF slightly before winStart so frame 0 has no transient step
    var warmStart = Math.max(0, winStart - frameLen);
    var lpPre = 0;
    for (var wi = warmStart; wi < winStart; wi++) {
      lpPre += alphaHi * (samples[wi] - lpPre);
    }

    var preHi = new Float32Array(winLen);
    for (var pi = 0; pi < winLen; pi++) {
      var sv = samples[winStart + pi];
      lpPre += alphaHi * (sv - lpPre);
      preHi[pi] = sv - lpPre;
    }

    var qualifyingFrames = 0;
    var qualMaxHiRms = 0;
    var qualHiShareSum = 0;
    var maxHiRms = 0;
    var peakGuard = Math.max(0.55 * (safeNumber(eventPeakRms, 0) || 1), 0.35);

    for (var fStart = 0; fStart < winLen; fStart += hopLen) {
      var fEnd = Math.min(winLen, fStart + frameLen);
      var fCnt = fEnd - fStart;
      if (fCnt < Math.max(16, hopLen >> 1)) break;

      var totPow = 0;
      var hiPow = 0;
      var zc = 0;
      var prevRaw = samples[winStart + fStart];
      for (var j = 0; j < fCnt; j++) {
        var rv = samples[winStart + fStart + j];
        var hv = preHi[fStart + j];
        totPow += rv * rv;
        hiPow += hv * hv;
        if (j > 0 && ((rv >= 0 && prevRaw < 0) || (rv < 0 && prevRaw >= 0))) zc++;
        prevRaw = rv;
      }
      totPow /= fCnt;
      hiPow /= fCnt;
      var totRms = Math.sqrt(totPow);
      var hiRms = Math.sqrt(hiPow);
      var hiShare = hiPow / (totPow + 1e-12);
      var zcrHz = (zc * 0.5 * sr) / Math.max(1, fCnt);

      if (hiRms > maxHiRms) maxHiRms = hiRms;

      if (
        hiShare >= 0.30 &&
        zcrHz >= 1050 &&
        hiRms >= Math.max(0.0025, ambientHiRms * 1.6) &&
        totRms <= peakGuard
      ) {
        qualifyingFrames++;
        qualHiShareSum += hiShare;
        if (hiRms > qualMaxHiRms) qualMaxHiRms = hiRms;
      }
    }

    var peakBreathHiRms = qualifyingFrames > 0 ? qualMaxHiRms : maxHiRms;
    var meanBreathHiShare = qualifyingFrames > 0 ? qualHiShareSum / qualifyingFrames : 0;
    var breathSnrDb = 20 * Math.log10((peakBreathHiRms + 1e-7) / (ambientHiRms + 1e-7));
    var breathDurMs = qualifyingFrames * 10;

    var levelGate = clamp((peakBreathHiRms - 0.0025) / 0.012, 0, 1);
    var snrCue = clamp((breathSnrDb - 3.5) / 14.0, 0, 1);
    var durCue = clamp((breathDurMs - 30) / 140, 0, 1);
    var hiCue = clamp((meanBreathHiShare - 0.26) / 0.44, 0, 1);
    var score = qualifyingFrames > 0
      ? clamp(levelGate * (0.45 * snrCue + 0.30 * durCue + 0.25 * hiCue), 0, 1)
      : 0;

    return {
      available: true,
      score: Number(score.toFixed(3)),
      breathSnrDb: Number(breathSnrDb.toFixed(1)),
      breathDurMs: Math.round(breathDurMs),
      highFreqShare: Number(meanBreathHiShare.toFixed(3)),
      preWindowSec: Number((winLen / sr).toFixed(3))
    };
  }

  /**
   * Automatically detect active sound boundaries and strip leading/trailing silence
   * and isolated transient clicks.
   */
  function autoClipAudio(samples, sampleRate, opts) {
    opts = opts || {};
    var sr = sampleRate || 44100;
    if (!samples || samples.length === 0) {
      return {
        ok: false,
        reason: 'empty',
        maxRMS: 0,
        startSample: 0,
        endSample: 0,
        startSec: 0,
        endSec: 0,
        originalDuration: 0,
        clippedDuration: 0,
        clipped: new Float32Array(0)
      };
    }

    var totalSamples = samples.length;
    var originalDuration = totalSamples / sr;
    var frameLen = Math.max(16, Math.round(0.010 * sr)); // 10ms frame
    var hopLen = Math.max(8, Math.round(0.005 * sr));    // 5ms hop
    var numFrames = Math.max(1, Math.floor((totalSamples - frameLen) / hopLen) + 1);

    var rmsFrames = new Float32Array(numFrames);
    var maxRMS = 0;

    for (var f = 0; f < numFrames; f++) {
      var offset = f * hopLen;
      var end = Math.min(totalSamples, offset + frameLen);
      var sumSq = 0;
      for (var i = offset; i < end; i++) {
        var v = samples[i];
        sumSq += v * v;
      }
      var rms = Math.sqrt(sumSq / Math.max(1, end - offset));
      rmsFrames[f] = rms;
      if (rms > maxRMS) maxRMS = rms;
    }

    if (maxRMS < 1e-6) {
      return {
        ok: false,
        reason: 'all_zeros',
        maxRMS: maxRMS,
        startSample: 0,
        endSample: totalSamples,
        startSec: 0,
        endSec: originalDuration,
        originalDuration: originalDuration,
        clippedDuration: originalDuration,
        clipped: new Float32Array(samples)
      };
    }

    if (maxRMS < 0.0005) {
      return {
        ok: false,
        reason: 'too_quiet',
        maxRMS: maxRMS,
        startSample: 0,
        endSample: totalSamples,
        startSec: 0,
        endSec: originalDuration,
        originalDuration: originalDuration,
        clippedDuration: originalDuration,
        clipped: new Float32Array(samples)
      };
    }

    // 15th percentile noise floor
    var sorted = Array.from(rmsFrames).sort(function (a, b) { return a - b; });
    var p15Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.15));
    var noiseFloor = sorted[p15Idx];

    var onThresh = Math.max(noiseFloor * 2.6, maxRMS * 0.075, 0.0012);
    if (onThresh > maxRMS * 0.85) {
      onThresh = maxRMS * 0.5;
    }
    var offThresh = onThresh * 0.65;

    // Hysteresis segmentation
    var segments = [];
    var active = false;
    var segStart = 0;
    var segPeak = 0;
    var peakFrame = 0;

    for (var k = 0; k < numFrames; k++) {
      var val = rmsFrames[k];
      if (val >= rmsFrames[peakFrame]) peakFrame = k;
      if (!active) {
        if (val >= onThresh) {
          active = true;
          segStart = k;
          segPeak = val;
        }
      } else {
        if (val > segPeak) segPeak = val;
        if (val < offThresh) {
          active = false;
          segments.push({
            startFrame: segStart,
            endFrame: k,
            peak: segPeak,
            durMs: ((k - segStart) * hopLen / sr) * 1000
          });
        }
      }
    }
    if (active) {
      segments.push({
        startFrame: segStart,
        endFrame: numFrames - 1,
        peak: segPeak,
        durMs: ((numFrames - 1 - segStart) * hopLen / sr) * 1000
      });
    }

    if (segments.length === 0) {
      segments.push({
        startFrame: peakFrame,
        endFrame: peakFrame,
        peak: maxRMS,
        durMs: (frameLen / sr) * 1000
      });
    }

    // Identify the segment containing peak energy
    var mainSegIdx = 0;
    for (var s = 1; s < segments.length; s++) {
      if (segments[s].peak > segments[mainSegIdx].peak) {
        mainSegIdx = s;
      }
    }
    var mainSeg = segments[mainSegIdx];

    // Discard isolated transient clicks < 25ms separated by > 250ms from regions containing peak energy
    var kept = [];
    for (var idx = 0; idx < segments.length; idx++) {
      var seg = segments[idx];
      var distToMainFrames = 0;
      if (seg.endFrame < mainSeg.startFrame) {
        distToMainFrames = mainSeg.startFrame - seg.endFrame;
      } else if (seg.startFrame > mainSeg.endFrame) {
        distToMainFrames = seg.startFrame - mainSeg.endFrame;
      }
      var distToMainMs = (distToMainFrames * hopLen / sr) * 1000;
      if (idx !== mainSegIdx && seg.durMs < 25 && distToMainMs > 250) {
        continue;
      }
      kept.push(seg);
    }

    if (kept.length === 0) kept.push(mainSeg);

    // Merge internal gaps < 350ms
    var merged = [Object.assign({}, kept[0])];
    for (var m = 1; m < kept.length; m++) {
      var prev = merged[merged.length - 1];
      var cur = kept[m];
      var gapMs = ((cur.startFrame - prev.endFrame) * hopLen / sr) * 1000;
      if (gapMs < 350) {
        prev.endFrame = cur.endFrame;
        prev.peak = Math.max(prev.peak, cur.peak);
        prev.durMs = ((prev.endFrame - prev.startFrame) * hopLen / sr) * 1000;
      } else {
        merged.push(Object.assign({}, cur));
      }
    }

    // Choose the cluster containing peak energy (after merging < 350ms)
    var bestCluster = merged[0];
    for (var c = 1; c < merged.length; c++) {
      if (merged[c].peak > bestCluster.peak) {
        bestCluster = merged[c];
      }
    }

    var padBefore = Math.round(0.035 * sr); // 35ms
    var padAfter = Math.round(0.050 * sr);  // 50ms
    var startSample = Math.max(0, bestCluster.startFrame * hopLen - padBefore);
    var endSample = Math.min(totalSamples, bestCluster.endFrame * hopLen + frameLen + padAfter);

    // Enforce minimum clipped length 80ms
    var minSamples = Math.min(totalSamples, Math.round(0.080 * sr));
    if (endSample - startSample < minSamples) {
      var deficit = minSamples - (endSample - startSample);
      var shiftLeft = Math.floor(deficit / 2);
      startSample = Math.max(0, startSample - shiftLeft);
      endSample = Math.min(totalSamples, startSample + minSamples);
      if (endSample - startSample < minSamples) {
        startSample = Math.max(0, endSample - minSamples);
      }
    }

    // Measure pre-onset breath metadata on rawSamples BEFORE slicing/normalizing
    var onsetSample = bestCluster.startFrame * hopLen;
    var preBreath = measurePreOnsetBreath(samples, sr, onsetSample, noiseFloor, maxRMS);
    if (mainSeg && mainSeg.startFrame > bestCluster.startFrame && (((mainSeg.startFrame - bestCluster.startFrame) * hopLen) / sr) >= 0.06) {
      var preBreathMain = measurePreOnsetBreath(samples, sr, mainSeg.startFrame * hopLen, noiseFloor, maxRMS);
      if (preBreathMain && preBreathMain.available && (!preBreath.available || preBreathMain.score > preBreath.score)) {
        preBreath = preBreathMain;
      }
    }

    var rawSlice = samples.subarray(startSample, endSample);
    var clipped = fadeAndNormalize(rawSlice, sr, 8, 0.92);

    return {
      ok: true,
      maxRMS: maxRMS,
      startSample: startSample,
      endSample: endSample,
      startSec: startSample / sr,
      endSec: endSample / sr,
      originalDuration: originalDuration,
      clippedDuration: clipped.length / sr,
      activeDurationMs: Number((bestCluster.durMs || 0).toFixed(1)),
      preOnsetBreath: preBreath,
      clipped: clipped
    };
  }

  /**
   * Manual trim helper with 8ms cosine fade-in/out and 0.92 normalization.
   */
  function clipRange(samples, sampleRate, startSec, endSec) {
    var sr = sampleRate || 44100;
    if (!samples || samples.length === 0) return new Float32Array(0);
    var total = samples.length;
    var sIdx = clamp(Math.floor(safeNumber(startSec, 0) * sr), 0, total - 1);
    var eIdx = clamp(Math.ceil(safeNumber(endSec, total / sr) * sr), sIdx + 1, total);
    var minLen = Math.min(total, Math.round(0.020 * sr));
    if (eIdx - sIdx < minLen) {
      eIdx = Math.min(total, sIdx + minLen);
      if (eIdx - sIdx < minLen) {
        sIdx = Math.max(0, eIdx - minLen);
      }
    }
    return fadeAndNormalize(samples.subarray(sIdx, eIdx), sr, 8, 0.92);
  }

  /**
   * Resample mono audio by speedFactor (>1 speeds up & raises pitch, <1 slows down).
   */
  function resampleAudio(samples, speedFactor, sampleRate) {
    if (!samples || samples.length === 0) return new Float32Array(0);
    var speed = clamp(safeNumber(speedFactor, 1.0), 0.25, 4.0);
    var sr = sampleRate || 44100;
    var inLen = samples.length;
    var outLen = Math.max(1, Math.round(inLen / speed));
    var rawOut = new Float32Array(outLen);

    for (var i = 0; i < outLen; i++) {
      var srcPos = i * speed;
      var i0 = Math.floor(srcPos);
      if (i0 >= inLen - 1) {
        rawOut[i] = samples[inLen - 1];
      } else {
        var frac = srcPos - i0;
        rawOut[i] = samples[i0] * (1 - frac) + samples[i0 + 1] * frac;
      }
    }
    return fadeAndNormalize(rawOut, sr, 5, 0.92);
  }

  /**
   * Compute log/mel-spaced STFT spectrogram normalized to 0..1 intensity (-55 dB floor).
   */
  function computeSpectrogram(samples, sampleRate, opts) {
    opts = opts || {};
    var sr = sampleRate || 44100;
    var fftSize = opts.fftSize || 1024;
    var timeFrames = opts.timeFrames || 56;
    var freqBands = opts.freqBands || 40;
    var minFreq = opts.minFreq || 45;
    var maxFreq = Math.min(opts.maxFreq || 4200, sr * 0.48);

    if (!samples || samples.length === 0) {
      return {
        frames: timeFrames,
        freqBands: freqBands,
        duration: 0,
        sampleRate: sr,
        freqCenters: new Float32Array(freqBands),
        grid: new Float32Array(timeFrames * freqBands)
      };
    }

    // Build Hann window
    var hann = new Float32Array(fftSize);
    for (var i = 0; i < fftSize; i++) {
      hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    }

    // Log-spaced frequency band edges and centers (45 Hz -> 4200 Hz)
    var freqEdges = new Float32Array(freqBands + 1);
    var freqCenters = new Float32Array(freqBands);
    var logMin = Math.log(minFreq);
    var logMax = Math.log(maxFreq);
    for (var b = 0; b <= freqBands; b++) {
      freqEdges[b] = Math.exp(logMin + (b / freqBands) * (logMax - logMin));
    }
    for (var bc = 0; bc < freqBands; bc++) {
      freqCenters[bc] = Math.sqrt(freqEdges[bc] * freqEdges[bc + 1]);
    }

    var rawPower = new Float32Array(timeFrames * freqBands);
    var re = new Float32Array(fftSize);
    var im = new Float32Array(fftSize);
    var halfBins = fftSize >> 1;
    var binHz = sr / fftSize;
    var magSq = new Float32Array(halfBins + 1);

    var nSamples = samples.length;
    var maxCenter = Math.max(0, nSamples - 1);
    var maxPower = 0;

    var framePowers = new Float32Array(timeFrames);
    for (var t = 0; t < timeFrames; t++) {
      var center = timeFrames > 1 ? Math.round((t / (timeFrames - 1)) * maxCenter) : Math.floor(nSamples / 2);
      var start = center - (fftSize >> 1);
      for (var w = 0; w < fftSize; w++) {
        var sIdx = start + w;
        var sampleVal = sIdx >= 0 && sIdx < nSamples ? samples[sIdx] : 0;
        re[w] = sampleVal * hann[w];
        im[w] = 0;
      }

      fft(re, im);

      for (var bin = 0; bin <= halfBins; bin++) {
        magSq[bin] = re[bin] * re[bin] + im[bin] * im[bin];
      }

      var fTotalP = 0;
      for (var f = 0; f < freqBands; f++) {
        var fLow = freqEdges[f];
        var fHigh = freqEdges[f + 1];
        var bLow = fLow / binHz;
        var bHigh = fHigh / binHz;
        var bStart = Math.floor(bLow);
        var bEnd = Math.ceil(bHigh);
        var bandPower = 0;

        if (bEnd - bStart <= 1) {
          // Interpolate fractional bin position so low-freq bands stay smooth
          var bCenter = clamp(freqCenters[f] / binHz, 0, halfBins - 1);
          var lo = Math.floor(bCenter);
          var frac = bCenter - lo;
          bandPower = magSq[lo] * (1 - frac) + magSq[lo + 1] * frac;
        } else {
          var count = 0;
          var sBin = clamp(bStart, 1, halfBins);
          var eBin = clamp(bEnd, sBin, halfBins);
          for (var kb = sBin; kb <= eBin; kb++) {
            bandPower += magSq[kb];
            count++;
          }
          bandPower = count > 0 ? bandPower / count : 0;
        }

        rawPower[t * freqBands + f] = bandPower;
        if (bandPower > maxPower) maxPower = bandPower;
        if (bandPower > fTotalP) fTotalP = bandPower;
      }
      framePowers[t] = fTotalP;
    }

    var sortedFramePowers = Array.from(framePowers).sort(function (a, b) { return a - b; });
    var p90Power = sortedFramePowers[Math.min(sortedFramePowers.length - 1, Math.floor(sortedFramePowers.length * 0.90))] || 0;
    var refPower = p90Power > 1e-12 ? p90Power : maxPower;

    var rawGrid = new Float32Array(timeFrames * freqBands);
    var dbFloor = 55;
    if (refPower > 1e-12) {
      var logRef = 10 * Math.log10(refPower);
      for (var g = 0; g < rawGrid.length; g++) {
        var p = rawPower[g];
        if (p <= 1e-15) {
          rawGrid[g] = 0;
        } else {
          var dbRel = 10 * Math.log10(p) - logRef;
          rawGrid[g] = clamp((dbRel + dbFloor) / dbFloor, 0, 1);
        }
      }
    }

    // Mild 3-frame temporal smoothing to reduce phase speckle
    var grid = new Float32Array(timeFrames * freqBands);
    for (var ts = 0; ts < timeFrames; ts++) {
      var tPrev = Math.max(0, ts - 1);
      var tNext = Math.min(timeFrames - 1, ts + 1);
      for (var fs = 0; fs < freqBands; fs++) {
        grid[ts * freqBands + fs] =
          0.25 * rawGrid[tPrev * freqBands + fs] +
          0.50 * rawGrid[ts * freqBands + fs] +
          0.25 * rawGrid[tNext * freqBands + fs];
      }
    }

    return {
      frames: timeFrames,
      freqBands: freqBands,
      duration: nSamples / sr,
      sampleRate: sr,
      freqCenters: freqCenters,
      grid: grid
    };
  }

  /**
   * Estimate frame pitch using Normalized Square Difference Function (NSDF / McLeod).
   */
  function estimateFramePitch(samples, start, len, sr, minHz, maxHz) {
    var minLag = Math.max(2, Math.floor(sr / maxHz));
    var maxLag = Math.min(len - 2, Math.ceil(sr / minHz));
    if (maxLag <= minLag + 2) return { hz: 0, clarity: 0 };

    // Energy check
    var totalE = 0;
    for (var i = 0; i < len; i++) {
      var s = samples[start + i];
      totalE += s * s;
    }
    if (totalE / len < 1e-6) return { hz: 0, clarity: 0 };

    var nsdf = new Float32Array(maxLag + 1);
    for (var tau = minLag; tau <= maxLag; tau++) {
      var acf = 0;
      var divisor = 0;
      var limit = len - tau;
      for (var j = 0; j < limit; j++) {
        var x1 = samples[start + j];
        var x2 = samples[start + j + tau];
        acf += x1 * x2;
        divisor += x1 * x1 + x2 * x2;
      }
      nsdf[tau] = divisor > 1e-12 ? (2 * acf) / divisor : 0;
    }

    // Collect local maxima of positive peaks
    var keyMaxima = [];
    var globalMax = 0;
    for (var t = minLag + 1; t < maxLag; t++) {
      var v = nsdf[t];
      if (v > 0 && v >= nsdf[t - 1] && v >= nsdf[t + 1]) {
        keyMaxima.push({ lag: t, val: v });
        if (v > globalMax) globalMax = v;
      }
    }

    if (keyMaxima.length === 0 || globalMax < 0.30) {
      return { hz: 0, clarity: globalMax };
    }

    // Pick first peak >= 0.85 * globalMax to avoid sub-harmonic octave errors
    var threshold = 0.85 * globalMax;
    var chosen = keyMaxima[0];
    for (var m = 0; m < keyMaxima.length; m++) {
      if (keyMaxima[m].val >= threshold) {
        chosen = keyMaxima[m];
        break;
      }
    }

    var lag = chosen.lag;
    // Parabolic interpolation
    var y0 = nsdf[lag - 1];
    var y1 = nsdf[lag];
    var y2 = nsdf[lag + 1];
    var denom = 2 * (y0 - 2 * y1 + y2);
    var shift = Math.abs(denom) > 1e-9 ? (y0 - y2) / denom : 0;
    var refinedLag = lag + clamp(shift, -0.5, 0.5);

    return {
      hz: sr / refinedLag,
      clarity: chosen.val
    };
  }

  function pearsonCorr(a, b, flatStdEps) {
    var len = Math.min(a.length, b.length);
    if (len === 0) return 0;
    var eps = typeof flatStdEps === 'number' ? flatStdEps : 0.01;
    var sumA = 0;
    var sumB = 0;
    for (var i = 0; i < len; i++) {
      sumA += a[i];
      sumB += b[i];
    }
    var meanA = sumA / len;
    var meanB = sumB / len;
    var num = 0;
    var varA = 0;
    var varB = 0;
    for (var j = 0; j < len; j++) {
      var da = a[j] - meanA;
      var db = b[j] - meanB;
      num += da * db;
      varA += da * da;
      varB += db * db;
    }
    var stdA = Math.sqrt(varA / len);
    var stdB = Math.sqrt(varB / len);
    if (stdA < eps && stdB < eps) return 1.0;
    if (stdA < 1e-4 || stdB < 1e-4) return 0.0;
    return clamp(num / Math.sqrt(varA * varB), -1, 1);
  }

  /**
   * Extract 12 MFCC timbre coefficients per frame, 3-segment macro MFCCs (3x10), and spectral flux.
   */
  function computeMFCCs(spec) {
    var frames = spec.frames || 56;
    var bands = spec.freqBands || 40;
    var grid = spec.grid;
    var numCoeffs = 12;
    var macroCoeffsCount = 10;

    var frameCoeffs = new Float32Array(frames * numCoeffs);
    var meanCoeffs = new Float32Array(numCoeffs);
    var macroCoeffs = new Float32Array(3 * macroCoeffsCount);
    var macroCounts = [0, 0, 0];
    var scale = Math.sqrt(2 / Math.max(1, bands));

    for (var t = 0; t < frames; t++) {
      var rowOff = t * bands;
      var outOff = t * numCoeffs;
      var seg = Math.min(2, Math.floor((t * 3) / Math.max(1, frames)));
      macroCounts[seg]++;
      for (var k = 1; k <= numCoeffs; k++) {
        var sum = 0;
        for (var b = 0; b < bands; b++) {
          sum += grid[rowOff + b] * Math.cos((Math.PI * k * (b + 0.5)) / bands);
        }
        var coeff = sum * scale;
        frameCoeffs[outOff + (k - 1)] = coeff;
        meanCoeffs[k - 1] += coeff;
        if (k <= macroCoeffsCount) {
          macroCoeffs[seg * macroCoeffsCount + (k - 1)] += coeff;
        }
      }
    }

    for (var c = 0; c < numCoeffs; c++) {
      meanCoeffs[c] /= Math.max(1, frames);
    }
    for (var sIdx = 0; sIdx < 3; sIdx++) {
      var cnt = Math.max(1, macroCounts[sIdx]);
      for (var mc = 0; mc < macroCoeffsCount; mc++) {
        macroCoeffs[sIdx * macroCoeffsCount + mc] /= cnt;
      }
    }

    var fluxSum = 0;
    for (var tf = 1; tf < frames; tf++) {
      var prevOff = (tf - 1) * bands;
      var curOff = tf * bands;
      var diffSq = 0;
      for (var bf = 0; bf < bands; bf++) {
        var d = grid[curOff + bf] - grid[prevOff + bf];
        diffSq += d * d;
      }
      fluxSum += Math.sqrt(diffSq / Math.max(1, bands));
    }
    var spectralFlux = frames > 1 ? fluxSum / (frames - 1) : 0;

    return {
      frames: frameCoeffs,
      mean: meanCoeffs,
      macro: macroCoeffs,
      spectralFlux: spectralFlux
    };
  }

  /**
   * Extract acoustic features used for multi-metric scoring and coaching feedback.
   */
  function extractFeatures(samples, sampleRate, spectrogram) {
    var sr = sampleRate || 44100;
    var spec = spectrogram || computeSpectrogram(samples, sr);
    var n = samples ? samples.length : 0;
    var duration = n / sr;

    // 1. 64-point normalized RMS amplitude envelope, crest factor & cumulative energy timing
    var envLen = 64;
    var envelope = new Float32Array(envLen);
    var peakIdx = 0;
    var peakAbs = 0;
    var totalSqSum = 0;
    if (n > 0) {
      for (var si = 0; si < n; si++) {
        var sv = samples[si];
        var absV = sv < 0 ? -sv : sv;
        if (absV > peakAbs) peakAbs = absV;
        totalSqSum += sv * sv;
      }
      var envWin = Math.max(1, Math.floor(n / envLen));
      var envMax = 0;
      for (var e = 0; e < envLen; e++) {
        var eStart = Math.floor((e / envLen) * n);
        var eEnd = Math.min(n, Math.max(eStart + 1, Math.floor(((e + 1) / envLen) * n)));
        if (eEnd - eStart < envWin && eStart + envWin <= n) eEnd = eStart + envWin;
        var sumSq = 0;
        for (var s = eStart; s < eEnd; s++) {
          var v = samples[s];
          sumSq += v * v;
        }
        var rms = Math.sqrt(sumSq / Math.max(1, eEnd - eStart));
        envelope[e] = rms;
        if (rms > envMax) {
          envMax = rms;
          peakIdx = e;
        }
      }
      if (envMax > 1e-9) {
        for (var en = 0; en < envLen; en++) envelope[en] /= envMax;
      }
    }
    var rmsTotal = n > 0 ? Math.sqrt(totalSqSum / n) : 0;
    var crestFactorDb = rmsTotal > 1e-9 ? 20 * Math.log10(Math.max(peakAbs, 1e-9) / rmsTotal) : 0;
    var peakTimeRatio = envLen > 1 ? peakIdx / (envLen - 1) : 0.5;
    var attackSec = peakTimeRatio * duration;
    var decaySec = Math.max(0, duration - attackSec);

    var envSqSum = 0;
    for (var ei = 0; ei < envLen; ei++) envSqSum += envelope[ei] * envelope[ei];
    var t10Ratio = 0.1;
    var t50Ratio = 0.5;
    var t90Ratio = 0.9;
    if (envSqSum > 1e-9) {
      var cumSq = 0;
      var got10 = false;
      var got50 = false;
      var got90 = false;
      for (var ej = 0; ej < envLen; ej++) {
        cumSq += envelope[ej] * envelope[ej];
        var fracE = cumSq / envSqSum;
        var posRatio = envLen > 1 ? ej / (envLen - 1) : 0;
        if (!got10 && fracE >= 0.10) { t10Ratio = posRatio; got10 = true; }
        if (!got50 && fracE >= 0.50) { t50Ratio = posRatio; got50 = true; }
        if (!got90 && fracE >= 0.90) { t90Ratio = posRatio; got90 = true; }
      }
    }

    // Zero-crossing rate (Hz)
    var crossings = 0;
    for (var zi = 1; zi < n; zi++) {
      if ((samples[zi] >= 0 && samples[zi - 1] < 0) || (samples[zi] < 0 && samples[zi - 1] >= 0)) {
        crossings++;
      }
    }
    var zcr = duration > 0.005 ? (crossings * 0.5) / duration : 0;

    // 2. Pitch contour across 32 frames (45-650 Hz)
    var pitchFrames = 32;
    var pitchHzArr = new Float32Array(pitchFrames);
    var voicedPitches = [];
    var winSamples = Math.min(n, Math.max(256, Math.round(0.045 * sr))); // 45ms window covers 45Hz (>=2 cycles)

    if (n >= 128) {
      for (var pf = 0; pf < pitchFrames; pf++) {
        var center = Math.round(((pf + 0.5) / pitchFrames) * n);
        var fStart = clamp(center - (winSamples >> 1), 0, Math.max(0, n - winSamples));
        var res = estimateFramePitch(samples, fStart, Math.min(winSamples, n - fStart), sr, 45, 650);
        if (res.clarity >= 0.30 && res.hz >= 45 && res.hz <= 650) {
          pitchHzArr[pf] = res.hz;
          voicedPitches.push(res.hz);
        }
      }
    }

    var voicedRatio = voicedPitches.length / pitchFrames;
    var medianPitchHz = 0;
    var pitchRangeSemitones = 0;
    var pitchContour = new Float32Array(pitchFrames);

    if (voicedPitches.length > 0) {
      var sortedP = voicedPitches.slice().sort(function (a, b) { return a - b; });
      medianPitchHz = sortedP[Math.floor(sortedP.length / 2)];
      var p10 = sortedP[Math.floor(sortedP.length * 0.1)];
      var p90 = sortedP[Math.min(sortedP.length - 1, Math.floor(sortedP.length * 0.9))];
      pitchRangeSemitones = p10 > 0 ? 12 * Math.log2(p90 / p10) : 0;

      for (var pc = 0; pc < pitchFrames; pc++) {
        if (pitchHzArr[pc] > 0 && medianPitchHz > 0) {
          pitchContour[pc] = clamp(12 * Math.log2(pitchHzArr[pc] / medianPitchHz), -24, 24);
        }
      }
    }

    // 3. Modulation analysis (200 Hz RMS envelope -> 5ms hop)
    var modHop = Math.max(1, Math.round(0.005 * sr));
    var modWin = Math.max(modHop, Math.round(0.010 * sr));
    var modLen = n > modWin ? Math.floor((n - modWin) / modHop) + 1 : 1;
    var modEnv = new Float32Array(modLen);
    var modMean = 0;

    for (var mi = 0; mi < modLen; mi++) {
      var mStart = mi * modHop;
      var mEnd = Math.min(n, mStart + modWin);
      var mSum = 0;
      for (var mj = mStart; mj < mEnd; mj++) {
        var mv = samples[mj];
        mSum += mv * mv;
      }
      var mRms = Math.sqrt(mSum / Math.max(1, mEnd - mStart));
      modEnv[mi] = mRms;
      modMean += mRms;
    }
    modMean /= Math.max(1, modLen);

    var modVar = 0;
    for (var mvIdx = 0; mvIdx < modLen; mvIdx++) {
      var diff = modEnv[mvIdx] - modMean;
      modVar += diff * diff;
    }
    var modStd = Math.sqrt(modVar / Math.max(1, modLen));
    var modDepth = clamp(modStd / (modMean + 1e-8), 0, 2.5);

    // Modulation FFT (4-45 Hz mapped onto 32 fixed bins)
    var modFftSize = Math.max(128, nextPow2(modLen));
    var modRe = new Float32Array(modFftSize);
    var modIm = new Float32Array(modFftSize);
    for (var mf = 0; mf < modLen; mf++) {
      var hw = modLen > 1 ? 0.5 * (1 - Math.cos((2 * Math.PI * mf) / (modLen - 1))) : 1;
      modRe[mf] = (modEnv[mf] - modMean) * hw;
    }
    fft(modRe, modIm);

    var modEnvRate = sr / modHop; // ~200 Hz
    var modBinHz = modEnvRate / modFftSize;
    var modBins = 32;
    var modSpectrum = new Float32Array(modBins);
    var modMinHz = 4;
    var modMaxHz = 45;
    var modPeakMag = 0;
    var modRateHz = 0;

    for (var mb = 0; mb < modBins; mb++) {
      var targetHz = modMinHz + (mb / (modBins - 1)) * (modMaxHz - modMinHz);
      var binPos = clamp(targetHz / modBinHz, 1, (modFftSize >> 1) - 1);
      var b0 = Math.floor(binPos);
      var frac = binPos - b0;
      var mag0 = Math.hypot(modRe[b0], modIm[b0]);
      var mag1 = Math.hypot(modRe[b0 + 1], modIm[b0 + 1]);
      var mag = mag0 * (1 - frac) + mag1 * frac;
      modSpectrum[mb] = mag;
      if (mag > modPeakMag) {
        modPeakMag = mag;
        modRateHz = targetHz;
      }
    }
    if (modPeakMag > 1e-9) {
      for (var mn = 0; mn < modBins; mn++) modSpectrum[mn] /= modPeakMag;
    }

    // 3-Band Modulation Profile (2-8 Hz Slow Stutter, 8-20 Hz Cheek Flutter, 20-45 Hz Fast Rattle)
    // plus 22-42 Hz Bilabial Lip-Trill Signature for Authenticity v2
    var modBands = new Float32Array(3);
    var modBandSum = 0;
    var cheekBandPow = 0;
    var lipBandPow = 0;
    var lipBandPeak = 0;
    var lipBandPeakHz = 0;
    var lipBandBins = 0;
    var halfModFft = modFftSize >> 1;
    for (var mk = 1; mk < halfModFft; mk++) {
      var hzM = mk * modBinHz;
      if (hzM < 2 || hzM > 45) continue;
      var mMag = Math.hypot(modRe[mk], modIm[mk]);
      if (hzM < 8) modBands[0] += mMag;
      else if (hzM < 20) modBands[1] += mMag;
      else modBands[2] += mMag;
      modBandSum += mMag;

      if (hzM >= 6 && hzM <= 20) cheekBandPow += mMag;
      if (hzM >= 22 && hzM <= 42) {
        lipBandPow += mMag;
        lipBandBins++;
        if (mMag > lipBandPeak) {
          lipBandPeak = mMag;
          lipBandPeakHz = hzM;
        }
      }
    }
    if (modBandSum > 1e-9) {
      modBands[0] /= modBandSum;
      modBands[1] /= modBandSum;
      modBands[2] /= modBandSum;
    } else {
      modBands[0] = 0.34;
      modBands[1] = 0.33;
      modBands[2] = 0.33;
    }
    var lipTrillBandShare = modBandSum > 1e-9 ? lipBandPow / modBandSum : 0;
    var lipTrillRatio = (cheekBandPow + lipBandPow) > 1e-9 ? lipBandPow / (cheekBandPow + lipBandPow) : 0;
    var lipTrillPeakSharpness = (lipBandBins > 0 && lipBandPow > 1e-9)
      ? clamp((lipBandPeak / (lipBandPow / lipBandBins) - 1) / 3.2, 0, 1)
      : 0;
    var lipShareGate = clamp((lipTrillBandShare - 0.22) / 0.36, 0, 1);
    var lipPeakProm = modPeakMag > 1e-9 ? clamp((lipBandPeak / modPeakMag - 0.25) / 0.55, 0, 1) : 0;
    var lipRatioCue = clamp((lipTrillRatio - 0.42) / 0.42, 0, 1);
    var lipDepthGate = clamp((modDepth - 0.14) / 0.34, 0, 1);
    var lipTrillScore = clamp(
      lipDepthGate * lipShareGate * (0.45 * lipPeakProm + 0.30 * lipRatioCue + 0.25 * lipTrillPeakSharpness),
      0,
      1
    );

    // Burst count on smoothed 64-point envelope (peaks > 0.35 separated by valleys < 0.18)
    var smoothEnv = new Float32Array(envLen);
    for (var se = 0; se < envLen; se++) {
      var prevE = envelope[Math.max(0, se - 1)];
      var nextE = envelope[Math.min(envLen - 1, se + 1)];
      smoothEnv[se] = 0.25 * prevE + 0.5 * envelope[se] + 0.25 * nextE;
    }
    var burstCount = 0;
    var armed = true;
    var inPeak = false;
    for (var be = 0; be < envLen; be++) {
      var ev = smoothEnv[be];
      if (armed && ev > 0.35) {
        burstCount++;
        armed = false;
        inPeak = true;
      } else if (inPeak && ev < 0.18) {
        armed = true;
        inPeak = false;
      }
    }
    if (burstCount === 0 && duration > 0.01) burstCount = 1;

    // 4. Timbre (40-band avgSpectrum, 4-band perceptual profile, centroid, centroidTrend, flatness, MFCCs)
    var fb = spec.freqBands;
    var tf = spec.frames;
    var avgSpectrum = new Float32Array(fb);
    for (var t = 0; t < tf; t++) {
      for (var f = 0; f < fb; f++) {
        avgSpectrum[f] += spec.grid[t * fb + f];
      }
    }

    var bandProfile = new Float32Array(4); // 45-150, 150-450, 450-1200, 1200-4200 Hz
    var bandSum = 0;
    var weightedFreqSum = 0;
    var specSum = 0;
    var logSpecSum = 0;
    for (var f2 = 0; f2 < fb; f2++) {
      avgSpectrum[f2] /= Math.max(1, tf);
      var lin = Math.pow(10, (avgSpectrum[f2] * 55 - 55) / 20) + 1e-5;
      var fc = spec.freqCenters[f2];
      var eShare = avgSpectrum[f2] * avgSpectrum[f2];
      if (fc < 150) bandProfile[0] += eShare;
      else if (fc < 450) bandProfile[1] += eShare;
      else if (fc < 1200) bandProfile[2] += eShare;
      else bandProfile[3] += eShare;
      bandSum += eShare;

      weightedFreqSum += fc * avgSpectrum[f2];
      specSum += avgSpectrum[f2];
      logSpecSum += Math.log(lin);
    }
    if (bandSum > 1e-9) {
      for (var bi = 0; bi < 4; bi++) bandProfile[bi] /= bandSum;
    } else {
      bandProfile[1] = 1;
    }

    var spectralCentroidHz = specSum > 1e-6 ? weightedFreqSum / specSum : 250;
    var arithMean = 0;
    for (var fa = 0; fa < fb; fa++) {
      arithMean += Math.pow(10, (avgSpectrum[fa] * 55 - 55) / 20) + 1e-5;
    }
    arithMean /= fb;
    var geomMean = Math.exp(logSpecSum / fb);
    var spectralFlatness = clamp(geomMean / (arithMean + 1e-9), 0, 1);

    // 32-point log2 centroid contour across spectrogram frames + macro trend
    var ccLen = 32;
    var centroidContour = new Float32Array(ccLen);
    var defaultLogC = Math.log2(Math.max(40, spectralCentroidHz));
    for (var cc = 0; cc < ccLen; cc++) {
      var tIdx = tf > 1 ? Math.round((cc / (ccLen - 1)) * (tf - 1)) : 0;
      var wSum = 0;
      var eSum = 0;
      var rowBase = tIdx * fb;
      for (var cf = 0; cf < fb; cf++) {
        var val = spec.grid[rowBase + cf];
        wSum += Math.log2(Math.max(40, spec.freqCenters[cf])) * val;
        eSum += val;
      }
      centroidContour[cc] = eSum > 1e-4 ? wSum / eSum : defaultLogC;
    }

    function medianSlice(arr, startIdx, endIdx) {
      var sub = [];
      for (var i = startIdx; i < endIdx; i++) sub.push(arr[i]);
      sub.sort(function (a, b) { return a - b; });
      return sub.length > 0 ? sub[Math.floor(sub.length / 2)] : 0;
    }

    var centroidTrend = medianSlice(centroidContour, 21, 32) - medianSlice(centroidContour, 0, 11);

    var firstThirdPitch = [];
    var lastThirdPitch = [];
    for (var pti = 0; pti < 11; pti++) {
      if (pitchHzArr[pti] > 0) firstThirdPitch.push(pitchContour[pti]);
    }
    for (var ptj = 21; ptj < 32; ptj++) {
      if (pitchHzArr[ptj] > 0) lastThirdPitch.push(pitchContour[ptj]);
    }
    firstThirdPitch.sort(function (a, b) { return a - b; });
    lastThirdPitch.sort(function (a, b) { return a - b; });
    var pitchTrend = (firstThirdPitch.length > 0 && lastThirdPitch.length > 0)
      ? lastThirdPitch[Math.floor(lastThirdPitch.length / 2)] - firstThirdPitch[Math.floor(firstThirdPitch.length / 2)]
      : 0;

    var mfcc = computeMFCCs(spec);

    // 5. Authenticity v2: Direct linear-power STFT 85% Spectral Roll-Off (45 Hz..8 kHz)
    var rollFftSize = 1024;
    var halfRollBins = rollFftSize >> 1;
    var rollBinHz = sr / rollFftSize;
    var rollMinBin = Math.max(1, Math.ceil(45 / rollBinHz));
    var rollMaxBin = Math.min(halfRollBins, Math.floor(Math.min(8000, sr * 0.48) / rollBinHz));
    var spectralRolloff85Hz = 800;
    var above2kPowerShare = 0;
    if (n > 0 && rollMaxBin >= rollMinBin) {
      var hannR = new Float32Array(rollFftSize);
      for (var hr = 0; hr < rollFftSize; hr++) {
        hannR[hr] = 0.5 * (1 - Math.cos((2 * Math.PI * hr) / (rollFftSize - 1)));
      }
      var reR = new Float32Array(rollFftSize);
      var imR = new Float32Array(rollFftSize);
      var accumPowR = new Float32Array(halfRollBins + 1);
      var frameCountR = n <= rollFftSize ? 1 : Math.min(8, Math.max(2, Math.floor(n / 512)));
      for (var fr = 0; fr < frameCountR; fr++) {
        var rCenter = frameCountR === 1 ? Math.floor(n / 2) : Math.round(((fr + 0.5) / frameCountR) * (n - 1));
        var rStart = rCenter - (rollFftSize >> 1);
        for (var rw = 0; rw < rollFftSize; rw++) {
          var sIdxR = rStart + rw;
          reR[rw] = sIdxR >= 0 && sIdxR < n ? samples[sIdxR] * hannR[rw] : 0;
          imR[rw] = 0;
        }
        fft(reR, imR);
        for (var kbR = rollMinBin; kbR <= rollMaxBin; kbR++) {
          accumPowR[kbR] += reR[kbR] * reR[kbR] + imR[kbR] * imR[kbR];
        }
      }
      var totalLinPow = 0;
      var above2kPow = 0;
      for (var kp = rollMinBin; kp <= rollMaxBin; kp++) {
        var pVal = accumPowR[kp];
        totalLinPow += pVal;
        if (kp * rollBinHz >= 2000) above2kPow += pVal;
      }
      if (totalLinPow > 1e-12) {
        above2kPowerShare = clamp(above2kPow / totalLinPow, 0, 1);
        var rollTarget = 0.85 * totalLinPow;
        var cumPow = 0;
        for (var kr = rollMinBin; kr <= rollMaxBin; kr++) {
          var prevCum = cumPow;
          var binP = accumPowR[kr];
          cumPow += binP;
          if (cumPow >= rollTarget) {
            var fracBin = binP > 1e-18 ? (rollTarget - prevCum) / binP : 0;
            spectralRolloff85Hz = clamp((kr - 1 + clamp(fracBin, 0, 1)) * rollBinHz, 45, 8000);
            break;
          }
        }
      }
    }
    var clothingDampingScore = clamp(
      0.65 * clamp(1 - (spectralRolloff85Hz - 950) / 2250, 0, 1) +
      0.35 * clamp(1 - (above2kPowerShare - 0.03) / 0.25, 0, 1),
      0,
      1
    );

    return {
      duration: duration,
      envelope: envelope,
      peakTimeRatio: peakTimeRatio,
      crestFactorDb: crestFactorDb,
      attackSec: attackSec,
      decaySec: decaySec,
      t10Ratio: t10Ratio,
      t50Ratio: t50Ratio,
      t90Ratio: t90Ratio,
      zcr: zcr,
      medianPitchHz: medianPitchHz,
      pitchRangeSemitones: pitchRangeSemitones,
      voicedRatio: voicedRatio,
      pitchHzArr: pitchHzArr,
      pitchContour: pitchContour,
      pitchTrend: pitchTrend,
      centroidContour: centroidContour,
      centroidTrend: centroidTrend,
      modRateHz: modRateHz,
      modDepth: modDepth,
      modSpectrum: modSpectrum,
      modBands: modBands,
      lipTrillScore: Number(lipTrillScore.toFixed(3)),
      lipTrillBandShare: Number(lipTrillBandShare.toFixed(3)),
      lipTrillPeakHz: Number(lipBandPeakHz.toFixed(1)),
      spectralRolloff85Hz: Number(spectralRolloff85Hz.toFixed(1)),
      above2kPowerShare: Number(above2kPowerShare.toFixed(4)),
      clothingDampingScore: Number(clothingDampingScore.toFixed(3)),
      burstCount: burstCount,
      avgSpectrum: avgSpectrum,
      bandProfile: bandProfile,
      spectralCentroidHz: spectralCentroidHz,
      spectralFlatness: spectralFlatness,
      mfccMean: mfcc.mean,
      mfccMacro: mfcc.macro,
      mfccFrames: mfcc.frames,
      spectralFlux: mfcc.spectralFlux,
      spectrogram: spec
    };
  }

  /**
   * Generate concise human-readable profile summary for a single sound.
   */
  function describeSoundProfile(feat) {
    if (!feat) {
      return {
        durationLabel: '0.00s',
        pitchLabel: '—',
        textureLabel: '—',
        profileTag: 'Unknown'
      };
    }

    var durationLabel = feat.duration.toFixed(2) + 's';
    var isVoiced = feat.voicedRatio >= 0.25 && feat.medianPitchHz > 0;
    var pitchLabel;
    if (isVoiced) {
      var hz = Math.round(feat.medianPitchHz);
      var band =
        hz < 95 ? 'Deep Sub-Bass' : hz < 180 ? 'Mid-Low Resonance' : hz < 300 ? 'Mid-Upper Resonance' : 'High-Frequency Resonance';
      pitchLabel = hz + ' Hz (' + band + ')';
    } else {
      pitchLabel = 'Broadband (~' + Math.round(feat.spectralCentroidHz || 250) + ' Hz)';
    }

    var textureLabel;
    if (feat.burstCount >= 3) {
      textureLabel = 'Staccato Multi-Burst · ' + feat.burstCount + ' bursts';
      if (feat.modDepth > 0.35) textureLabel += ' · ' + Math.round(feat.modRateHz) + ' Hz oscillation';
    } else if (feat.burstCount === 2) {
      textureLabel = 'Dual-Impulse · 2 bursts';
    } else if (feat.modDepth > 0.38) {
      textureLabel = 'Modulated · ~' + Math.round(feat.modRateHz) + ' Hz oscillation';
    } else if (feat.spectralFlatness > 0.42) {
      textureLabel = 'Broadband / Aerodynamic';
    } else {
      textureLabel = 'Continuous Laminar Release';
    }

    var profileTag = 'Balanced Acoustic Release';
    var cc = feat.centroidContour;
    var ccDelta = cc && cc.length >= 32 ? cc[29] - cc[2] : 0;
    if (!isVoiced && feat.spectralCentroidHz > 850) {
      profileTag = 'Broadband Air Dispersion';
    } else if (feat.burstCount >= 4) {
      profileTag = 'Multi-Burst Oscillation';
    } else if (feat.burstCount === 2) {
      profileTag = 'Dual-Impulse Release';
    } else if (isVoiced && (ccDelta > 0.65 || (feat.pitchRangeSemitones > 8 && feat.pitchContour[29] > feat.pitchContour[2] + 4))) {
      profileTag = 'Ascending Resonance Sweep';
    } else if (isVoiced && (ccDelta < -0.65 || (feat.pitchRangeSemitones > 8 && feat.pitchContour[2] > feat.pitchContour[29] + 4))) {
      profileTag = 'Descending Resonance Sweep';
    } else if (isVoiced && feat.medianPitchHz >= 240) {
      profileTag = 'High-Frequency Resonance';
    } else if (isVoiced && feat.medianPitchHz < 95 && feat.modDepth < 0.45) {
      profileTag = 'Low-Frequency Sub-Bass';
    } else if (feat.modDepth > 0.50) {
      profileTag = 'High-Turbulence Dispersion';
    }

    return {
      durationLabel: durationLabel,
      pitchLabel: pitchLabel,
      textureLabel: textureLabel,
      profileTag: profileTag
    };
  }

  function l1Dist(a, b) {
    var len = Math.min(a.length, b.length);
    var sum = 0;
    for (var i = 0; i < len; i++) sum += Math.abs(a[i] - b[i]);
    return sum;
  }

  /**
   * Shift-tolerant envelope match across +/-6 bins (~+/-10% onset shift), returning full lag curve.
   */
  function computeEnvelopeLagProfile(envA, envB) {
    var len = Math.min(envA.length, envB.length);
    var lags = [];
    var scores = [];
    var corrs = [];
    var l1Scores = [];
    if (len === 0) {
      return {
        lags: lags,
        scores: scores,
        corrs: corrs,
        l1Scores: l1Scores,
        bestLag: 0,
        bestScore: 0,
        bestCorr: 0,
        bestL1: 0
      };
    }
    var shifted = new Float32Array(len);
    var bestScore = -1;
    var bestLag = 0;
    var bestCorr = 0;
    var bestL1 = 0;

    for (var lag = -6; lag <= 6; lag++) {
      var absSum = 0;
      for (var i = 0; i < len; i++) {
        var j = i + lag;
        var v = j >= 0 && j < len ? envB[j] : 0;
        shifted[i] = v;
        absSum += Math.abs(envA[i] - v);
      }
      var corr = 100 * clamp(pearsonCorr(envA, shifted, 0.12), 0, 1);
      var l1Score = 100 * clamp(1 - 1.65 * (absSum / len), 0, 1);
      var score = 0.55 * corr + 0.45 * l1Score;
      lags.push(lag);
      scores.push(score);
      corrs.push(corr);
      l1Scores.push(l1Score);
      if (score > bestScore || (score === bestScore && Math.abs(lag) < Math.abs(bestLag))) {
        bestScore = score;
        bestLag = lag;
        bestCorr = corr;
        bestL1 = l1Score;
      }
    }
    return {
      lags: lags,
      scores: scores,
      corrs: corrs,
      l1Scores: l1Scores,
      bestLag: bestLag,
      bestScore: Math.max(0, bestScore),
      bestCorr: bestCorr,
      bestL1: bestL1
    };
  }

  function bestLagEnvelopeMatch(envA, envB) {
    return computeEnvelopeLagProfile(envA, envB).bestScore;
  }

  /**
   * Compare two extracted feature objects with human-tolerant similarity + sharp contrast.
   */
  function compareSounds(refFeat, userFeat) {
    if (!refFeat || !userFeat) {
      return {
        overall: 0,
        durationScore: 0,
        pitchScore: 0,
        modulationScore: 0,
        timbreScore: 0,
        envelopeScore: 0,
        grade: 'D',
        title: 'Silent But Confused',
        summaryLine: 'Record a clear sound to compare!',
        tips: ['Record a clear sound to compare!'],
        breakdown: null
      };
    }

    // 1. Duration Score (14%)
    var d1 = Math.max(0.02, safeNumber(refFeat.duration, 0.1));
    var d2 = Math.max(0.02, safeNumber(userFeat.duration, 0.1));
    var durationRatio = Math.min(d1, d2) / Math.max(d1, d2);
    var deltaSec = d2 - d1;
    var durationScore = 100 * Math.pow(durationRatio, 1.25);

    // 2. Pitch & Macro Trend Score (26%)
    var c1 = Math.max(40, safeNumber(refFeat.spectralCentroidHz, 200));
    var c2 = Math.max(40, safeNumber(userFeat.spectralCentroidHz, 200));
    var z1 = Math.max(0, safeNumber(refFeat.zcr, 150));
    var z2 = Math.max(0, safeNumber(userFeat.zcr, 150));
    var v1 = clamp(safeNumber(refFeat.voicedRatio, 0), 0, 1);
    var v2 = clamp(safeNumber(userFeat.voicedRatio, 0), 0, 1);

    var centroidMatch = 100 * Math.exp(-Math.abs(Math.log2(c1 / c2)) / 0.85);
    var zcrMatch = 100 * Math.exp(-Math.abs(Math.log2((z1 + 50) / (z2 + 50))) / 0.85);
    var voicedMatch = 100 * (1 - Math.abs(v1 - v2));

    var ct1 = safeNumber(refFeat.centroidTrend, 0);
    var ct2 = safeNumber(userFeat.centroidTrend, 0);
    var pt1 = safeNumber(refFeat.pitchTrend, 0);
    var pt2 = safeNumber(userFeat.pitchTrend, 0);
    var oppCent = Math.abs(ct1) > 0.35 && Math.abs(ct2) > 0.35 && ct1 * ct2 < 0;
    var oppPitch = Math.abs(pt1) > 3.0 && Math.abs(pt2) > 3.0 && pt1 * pt2 < 0;

    var trendScore;
    var polarityMul = 1.0;
    if (oppCent || oppPitch) {
      trendScore = 10;
      polarityMul = 0.28;
    } else {
      var centTrendDiff = Math.abs(ct1 - ct2);
      var pitchTrendDiff = Math.abs(pt1 - pt2) / 12;
      trendScore = 100 * Math.exp(-Math.max(centTrendDiff, pitchTrendDiff * 0.7) / 0.85);
    }

    var refUnvoiced = v1 < 0.25 || refFeat.medianPitchHz <= 0;
    var userUnvoiced = v2 < 0.25 || userFeat.medianPitchHz <= 0;
    var semitoneDiff = null;
    var absPitch = null;
    var pitchScore = 0;

    if (refUnvoiced && userUnvoiced) {
      pitchScore = (0.45 * centroidMatch + 0.25 * zcrMatch + 0.30 * trendScore) * polarityMul;
    } else if (refUnvoiced !== userUnvoiced) {
      pitchScore = Math.min(45, 0.45 * centroidMatch + 0.25 * zcrMatch + 0.30 * voicedMatch);
    } else {
      semitoneDiff = Math.abs(12 * Math.log2(refFeat.medianPitchHz / userFeat.medianPitchHz));
      absPitch = 100 * Math.exp(-semitoneDiff / 7.5);
      pitchScore = (0.45 * absPitch + 0.25 * centroidMatch + 0.20 * trendScore + 0.10 * voicedMatch) * polarityMul;
    }

    // 3. Timbre & Spectral Color Score (28%)
    var numCoeffs = 12;
    var mfccMeanSq = 0;
    var refMean = refFeat.mfccMean || new Float32Array(numCoeffs);
    var userMean = userFeat.mfccMean || new Float32Array(numCoeffs);
    for (var km = 0; km < numCoeffs; km++) {
      var dm = refMean[km] - userMean[km];
      mfccMeanSq += dm * dm;
    }
    var dMean = Math.sqrt(mfccMeanSq);
    var mfccMeanScore = 100 * Math.exp(-dMean / 2.6);

    var macroLen = 30;
    var refMacro = refFeat.mfccMacro || new Float32Array(macroLen);
    var userMacro = userFeat.mfccMacro || new Float32Array(macroLen);
    var macroSq = 0;
    for (var mi2 = 0; mi2 < macroLen; mi2++) {
      var dmc = refMacro[mi2] - userMacro[mi2];
      macroSq += dmc * dmc;
    }
    var dMacro = Math.sqrt(macroSq);
    var mfccMacroScore = 100 * Math.exp(-dMacro / 1.55);

    var bandProfileScore = refFeat.bandProfile && userFeat.bandProfile
      ? 100 * clamp(1 - 1.35 * l1Dist(refFeat.bandProfile, userFeat.bandProfile), 0, 1)
      : 50;

    var gridCorr = 100 * clamp(pearsonCorr(refFeat.spectrogram.grid, userFeat.spectrogram.grid), 0, 1);
    var flatMatch = 100 * Math.exp(-Math.abs(refFeat.spectralFlatness - userFeat.spectralFlatness) / 0.28);
    var timbreScore =
      0.25 * mfccMeanScore +
      0.35 * mfccMacroScore +
      0.15 * bandProfileScore +
      0.15 * gridCorr +
      0.10 * (0.5 * flatMatch + 0.5 * zcrMatch);

    // 4. Modulation & Flutter Score (18%)
    var md1 = safeNumber(refFeat.modDepth, 0);
    var md2 = safeNumber(userFeat.modDepth, 0);
    var mr1 = safeNumber(refFeat.modRateHz, 0);
    var mr2 = safeNumber(userFeat.modRateHz, 0);
    var depthMatch = 100 * Math.exp(-Math.abs(md1 - md2) / 0.42);

    var modBandScore;
    if (md1 < 0.16 && md2 < 0.16) {
      modBandScore = 100 - Math.abs(md1 - md2) * 80;
    } else if ((md1 < 0.16 && md2 >= 0.35) || (md2 < 0.16 && md1 >= 0.35)) {
      modBandScore = 20;
    } else if (refFeat.modBands && userFeat.modBands) {
      modBandScore = 100 * clamp(1 - 1.2 * l1Dist(refFeat.modBands, userFeat.modBands), 0, 1);
    } else {
      modBandScore = 100 * clamp(pearsonCorr(refFeat.modSpectrum, userFeat.modSpectrum), 0, 1);
    }

    var burstMatch = 100 * Math.exp(-Math.abs(refFeat.burstCount - userFeat.burstCount) / 2.2);
    var flux1 = safeNumber(refFeat.spectralFlux, 0);
    var flux2 = safeNumber(userFeat.spectralFlux, 0);
    var fluxMatch = 100 * Math.exp(-Math.abs(flux1 - flux2) / 0.35);
    var modulationScore = 0.35 * depthMatch + 0.35 * modBandScore + 0.30 * (0.65 * burstMatch + 0.35 * fluxMatch);

    // 5. Envelope & Dynamics Score (14% - shift-tolerant)
    var envLag = computeEnvelopeLagProfile(refFeat.envelope, userFeat.envelope);
    var envelopeScore = envLag.bestScore;

    // Balanced Arithmetic + Geometric Overall Aggregation
    var wDur = 0.14;
    var wPitch = 0.26;
    var wTimbre = 0.28;
    var wMod = 0.18;
    var wEnv = 0.14;

    var weightedArith =
      wDur * durationScore +
      wPitch * pitchScore +
      wTimbre * timbreScore +
      wMod * modulationScore +
      wEnv * envelopeScore;

    var weightedGeom = Math.exp(
      wDur * Math.log(Math.max(2, durationScore)) +
      wPitch * Math.log(Math.max(2, pitchScore)) +
      wTimbre * Math.log(Math.max(2, timbreScore)) +
      wMod * Math.log(Math.max(2, modulationScore)) +
      wEnv * Math.log(Math.max(2, envelopeScore))
    );

    var uncappedOverall = 0.60 * weightedArith + 0.40 * weightedGeom;
    var rawOverall = uncappedOverall;
    var coreIdentity = 0.50 * pitchScore + 0.50 * timbreScore;
    var coreCapApplied = coreIdentity < 45;
    if (coreCapApplied) {
      rawOverall = Math.min(rawOverall, coreIdentity * 0.95 + 6);
    }
    var minKey = Math.min(pitchScore, timbreScore, modulationScore);
    var minKeyCapApplied = minKey < 25;
    if (minKeyCapApplied) {
      rawOverall = Math.min(rawOverall, minKey * 0.8 + 20);
    }

    var breakdown = {
      duration: {
        d1: d1,
        d2: d2,
        durationRatio: durationRatio,
        deltaSec: deltaSec
      },
      pitch: {
        refUnvoiced: refUnvoiced,
        userUnvoiced: userUnvoiced,
        semitoneDiff: semitoneDiff,
        absPitch: absPitch,
        centroidMatch: centroidMatch,
        zcrMatch: zcrMatch,
        voicedMatch: voicedMatch,
        trendScore: trendScore,
        polarityMul: polarityMul,
        oppCent: oppCent,
        oppPitch: oppPitch,
        ct1: ct1,
        ct2: ct2,
        pt1: pt1,
        pt2: pt2
      },
      timbre: {
        dMean: dMean,
        mfccMeanScore: mfccMeanScore,
        dMacro: dMacro,
        mfccMacroScore: mfccMacroScore,
        bandProfileScore: bandProfileScore,
        gridCorr: gridCorr,
        flatMatch: flatMatch
      },
      modulation: {
        md1: md1,
        md2: md2,
        mr1: mr1,
        mr2: mr2,
        depthMatch: depthMatch,
        modBandScore: modBandScore,
        burstMatch: burstMatch,
        fluxMatch: fluxMatch
      },
      envelope: {
        lagProfile: envLag
      },
      overall: {
        weightedArith: weightedArith,
        weightedGeom: weightedGeom,
        uncappedOverall: uncappedOverall,
        rawOverall: rawOverall,
        coreIdentity: coreIdentity,
        minKey: minKey,
        coreCapApplied: coreCapApplied,
        minKeyCapApplied: minKeyCapApplied
      }
    };

    durationScore = Math.round(clamp(safeNumber(durationScore, 0), 0, 100));
    pitchScore = Math.round(clamp(safeNumber(pitchScore, 0), 0, 100));
    modulationScore = Math.round(clamp(safeNumber(modulationScore, 0), 0, 100));
    timbreScore = Math.round(clamp(safeNumber(timbreScore, 0), 0, 100));
    envelopeScore = Math.round(clamp(safeNumber(envelopeScore, 0), 0, 100));
    var overall = Math.round(clamp(safeNumber(rawOverall, 0), 0, 100));

    // Grade & Classification Title
    var grade = 'D';
    var title = 'Significant Acoustic Divergence';
    if (overall >= 90) {
      grade = 'S+';
      title = 'Archive-Grade Reproduction';
    } else if (overall >= 80) {
      grade = 'S';
      title = 'Exceptional Acoustic Alignment';
    } else if (overall >= 68) {
      grade = 'A';
      title = 'Research-Grade Fidelity';
    } else if (overall >= 54) {
      grade = 'B';
      title = 'Moderate Acoustic Convergence';
    } else if (overall >= 38) {
      grade = 'C';
      title = 'Observed Spectral Variance';
    }

    // Analytical telemetry notes detailing exact observed variance
    var tips = [];
    if (!refUnvoiced && !userUnvoiced) {
      var stDiff = Math.abs(12 * Math.log2(refFeat.medianPitchHz / userFeat.medianPitchHz));
      if (stDiff >= 2.5) {
        if (userFeat.medianPitchHz > refFeat.medianPitchHz) {
          tips.push('Primary resonance elevated (' + Math.round(userFeat.medianPitchHz) + ' Hz vs ' + Math.round(refFeat.medianPitchHz) + ' Hz reference).');
        } else {
          tips.push('Primary resonance lower (' + Math.round(userFeat.medianPitchHz) + ' Hz vs ' + Math.round(refFeat.medianPitchHz) + ' Hz reference).');
        }
      }
    } else if (refUnvoiced && !userUnvoiced) {
      tips.push('Excessive harmonic voicing (~' + Math.round(userFeat.medianPitchHz) + ' Hz) relative to unvoiced reference dispersion.');
    } else if (!refUnvoiced && userUnvoiced) {
      tips.push('Insufficient harmonic voicing relative to reference fundamental resonance (~' + Math.round(refFeat.medianPitchHz) + ' Hz).');
    }

    if (Math.abs(refFeat.burstCount - userFeat.burstCount) >= 2) {
      tips.push('Burst segmentation diverged (' + userFeat.burstCount + ' impulse' + (userFeat.burstCount === 1 ? '' : 's') + ' vs ' + refFeat.burstCount + ' in reference).');
    } else if (md1 > 0.42 && md2 < 0.22) {
      tips.push('Attenuated modulation (~' + Math.round(mr1) + ' Hz oscillation absent).');
    } else if (md2 > 0.42 && md1 < 0.22) {
      tips.push('Elevated modulation (~' + Math.round(mr2) + ' Hz oscillation vs laminar reference).');
    }

    if (d2 < d1 * 0.78) {
      tips.push('Emission lifetime shorter (' + d2.toFixed(2) + 's vs ' + d1.toFixed(2) + 's reference).');
    } else if (d2 > d1 * 1.28) {
      tips.push('Emission lifetime extended (' + d2.toFixed(2) + 's vs ' + d1.toFixed(2) + 's reference).');
    }

    if (timbreScore < 55 && tips.length < 3) {
      if (c2 > c1 * 1.35) {
        tips.push('Elevated spectral centroid (' + Math.round(c2) + ' Hz vs ' + Math.round(c1) + ' Hz reference).');
      } else if (c2 < c1 * 0.72) {
        tips.push('Attenuated spectral centroid (' + Math.round(c2) + ' Hz vs ' + Math.round(c1) + ' Hz reference).');
      } else {
        tips.push('Observed spectral distribution variance (Timbre ' + timbreScore + '%).');
      }
    }

    if (tips.length === 0) {
      if (overall >= 82) {
        tips.push('High alignment across primary resonance (' + Math.round(userFeat.medianPitchHz || c2) + ' Hz), emission lifetime (' + d2.toFixed(2) + 's), and spectral distribution.');
      } else {
        tips.push('Nominal emission lifetime (' + d2.toFixed(2) + 's); refine primary resonance and pressure envelope to improve reproduction fidelity.');
      }
    }

    var summaryLine = tips.slice(0, 2).join(' ');

    return {
      overall: overall,
      durationScore: durationScore,
      pitchScore: pitchScore,
      modulationScore: modulationScore,
      timbreScore: timbreScore,
      envelopeScore: envelopeScore,
      grade: grade,
      title: title,
      summaryLine: summaryLine,
      tips: tips.slice(0, 3),
      breakdown: breakdown
    };
  }

  TootApp.DSP = {
    fft: fft,
    measurePreOnsetBreath: measurePreOnsetBreath,
    autoClipAudio: autoClipAudio,
    clipRange: clipRange,
    resampleAudio: resampleAudio,
    computeSpectrogram: computeSpectrogram,
    computeEnvelopeLagProfile: computeEnvelopeLagProfile,
    extractFeatures: extractFeatures,
    describeSoundProfile: describeSoundProfile,
    compareSounds: compareSounds
  };
})(typeof window !== 'undefined' ? window : globalThis);
