(function (root) {
  'use strict';

  var TootTestLab = (root.TootTestLab = root.TootTestLab || {});

  var TAG_STORAGE_KEY = 'toot_test_lab_tags_v1';
  var CFG_STORAGE_KEY = 'toot_test_lab_cfg_v1';
  var GROUP_REAL_ID = '__group_real__';
  var GROUP_DECOY_ID = '__group_fake__';
  var GROUP_REC_REAL_ID = '__group_rec_real__';

  function isGroupSlotId(id) {
    return id === GROUP_REAL_ID || id === GROUP_DECOY_ID || id === GROUP_REC_REAL_ID;
  }

  function formatLabelDisplay(lbl) {
    if (lbl === 'fake') return 'DECOY';
    if (lbl === 'noise') return 'NOISE';
    return 'REAL';
  }

  var state = {
    diskApiAvailable: false,
    specimens: [],
    byId: {},
    selectedIds: {},
    tagOverrides: {},
    activeId: null,
    autopsyAId: null,
    autopsyBId: null,
    autopsyNormTime: true,
    lastAutopsyDiff: null,
    pendingRecordTarget: null,
    bankFilter: 'all',
    searchQuery: '',
    config: null,
    armedDeleteKey: null,
    armedDeleteTimer: null,

    // Charts
    stripCriterionId: 'protoAffMin',
    scatterXId: 'protoAffMin',
    scatterYId: 'rolloff85Max',
    stripDotHits: [],
    scatterDotHits: [],
    stripDragging: false,

    // Playback / scrub
    scrub: null,
    lastDeckRedrawMs: 0,
    lastWindowTelMs: 0,
    windowTelemetry: null,

    // Meters animation
    detectMeterAnim: { current: 0, velocity: 0, peak: 0, target: 0 },
    authMeterAnim: { current: 50, velocity: 0, peak: 50, target: 50 },
    detectTargetScore: 0,
    authTargetScore: 50,
    liveEvalResult: null,
    liveNativeVerdict: null,

    // Recording, Live Oscilloscope & Live Sentry Monitor
    isManualRecording: false,
    liveOscFrame: new Float32Array(1024),
    liveOscHistory: [],
    liveOscRms: 0,
    liveOscPeakDb: -90,
    liveOscDomHz: 0,
    liveOscElapsed: 0,
    liveOscActive: false,
    recLiveRing: new Float32Array(44100 * 2),
    recLiveRingWrite: 0,
    recLiveRingTotal: 0,
    recLastTelAt: 0,
    liveMonitorActive: false,
    liveMonitorStartedAt: 0,
    liveMonitorCtx: null,
    liveMonitorStream: null,
    liveMonitorScript: null,
    liveMonitorSource: null,
    liveMonitorZero: null,
    liveRing: null,
    liveRingWrite: 0,
    liveRingTotal: 0,
    liveSr: 44100,
    liveFloorHist: [],
    liveNoiseFloor: 0.004,
    liveTrigPhase: 'idle',
    liveTrigChunks: [],
    liveTrigSilSamples: 0,
    liveConsecHits: 0,
    liveLastMeterAt: 0,
    liveEvents: [],

    // Speed/Jog Wheel, Room Background Control & Playback Spectrum
    wheelMode: 'speed',
    bgProfile: null,
    isSamplingBg: false,
    liveBgCalibrating: false,
    liveBgChunks: [],
    liveBgSamples: 0,
    playbackSpectrumBins: null,
    lastPlaySpecAt: 0,

    // Criteria 1-row Accordion, Peak-Hold & Interactive Profile Graph
    expandedCriteria: {},
    focusedCriterionId: null,
    focusedCriterionTimer: null,
    criteriaPeaks: {},
    criteriaGraphCols: [],
    criteriaGraphHoverId: null,
    criteriaGraphDragId: null,
    criteriaGraphPointerDown: null,

    // Performance caches & 2-Page layout state
    activePage: 'sentry',
    authSubTab: 'spread',
    metersDirty: true,
    workbenchView: 'sentry',
    specBitmapCache: {},
    specBitmapCacheOrder: [],
    heavyRefreshTimer: null,
    lastLiveTickMs: 0,

    // Frequency Spread & 6-Axis Authenticity Profile state
    spreadHitThreshold: 0.25,
    spreadShowP1090: true,
    spreadShowMinMax: true,
    spreadShowTraces: false,
    spreadShowZones: true,
    spreadShowActive: true,
    spreadHoverBin: -1,
    lastSpreadProfile: null,
    authProfileCols: [],
    authProfileDragId: null,
    authProfileHoverId: null,

    // Cohort cache
    lastCohortStats: null,
    analyzingCohort: false
  };

  function syncStickyCockpitOffset() {
    var cockpit = $('tl-sticky-cockpit');
    if (!cockpit || !root.document || !root.document.documentElement) return;
    var rect = cockpit.getBoundingClientRect();
    var h = Math.max(110, Math.ceil(rect && rect.height ? rect.height : 224));
    root.document.documentElement.style.setProperty('--tl-cockpit-h', h + 'px');
  }

  function redrawActivePageCanvases() {
    var act = getActiveSpecimen();
    if (state.activePage === 'sentry') {
      drawLiveSpectrumCanvas(act ? act.telemetry : null, state.playbackSpectrumBins);
      drawCriteriaProfileGraph(getActiveTelemetryForCriteria());
    } else {
      if (state.authSubTab === 'spread') {
        renderFrequencySpreadAndProfile();
      } else if (state.authSubTab === 'deck') {
        drawScrubWaveform();
        drawSpeedJogWheel();
        drawLiveSpectrumCanvas(act ? act.telemetry : null, state.playbackSpectrumBins);
      } else if (state.authSubTab === 'autopsy') {
        renderAutopsyView();
      } else if (state.authSubTab === 'cohort') {
        drawStripDistributionChart();
        drawScatterClusterChart();
      }
    }
  }

  function setLabPage(pageId) {
    var nextPage = pageId === 'authenticity' ? 'authenticity' : 'sentry';
    state.activePage = nextPage;
    state.workbenchView = nextPage;

    document.querySelectorAll('.tl-page-btn[data-lab-page]').forEach(function (btn) {
      var isAct = btn.getAttribute('data-lab-page') === nextPage;
      btn.classList.toggle('is-active', isAct);
      btn.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    var pSentry = $('page-sentry');
    var pAuth = $('page-authenticity');
    if (pSentry) pSentry.classList.toggle('hidden', nextPage !== 'sentry');
    if (pAuth) pAuth.classList.toggle('hidden', nextPage !== 'authenticity');

    var dialSentry = $('dial-card-sentry');
    var dialAuth = $('dial-card-auth');
    if (dialSentry) dialSentry.classList.toggle('hidden', nextPage !== 'sentry');
    if (dialAuth) dialAuth.classList.toggle('hidden', nextPage !== 'authenticity');

    var ctrlSentry = $('cockpit-ctrl-sentry');
    var ctrlAuth = $('cockpit-ctrl-auth');
    if (ctrlSentry) ctrlSentry.classList.toggle('hidden', nextPage !== 'sentry');
    if (ctrlAuth) ctrlAuth.classList.toggle('hidden', nextPage !== 'authenticity');

    var bgBox = $('bg-control-box');
    if (bgBox) bgBox.classList.toggle('is-secondary-on-auth', nextPage !== 'sentry');

    try {
      if (root.history && typeof root.history.replaceState === 'function') {
        root.history.replaceState(null, '', '#' + nextPage);
      }
    } catch (e) {}

    state.metersDirty = true;
    syncStickyCockpitOffset();
    redrawActivePageCanvases();
  }

  function setAuthSubTab(tabId) {
    var nextTab = tabId === 'autopsy' || tabId === 'cohort' || tabId === 'deck' ? tabId : 'spread';
    state.authSubTab = nextTab;

    document.querySelectorAll('.tl-wb-tab[data-auth-tab]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-auth-tab') === nextTab);
    });
    document.querySelectorAll('[data-auth-section]').forEach(function (sec) {
      sec.classList.toggle('hidden', sec.getAttribute('data-auth-section') !== nextTab);
    });

    if (state.activePage === 'authenticity') {
      redrawActivePageCanvases();
    }
  }

  function setWorkbenchView(viewId) {
    var v = viewId || 'sentry';
    if (v === 'autopsy' || v === 'cohort' || v === 'spread' || v === 'deck') {
      setLabPage('authenticity');
      setAuthSubTab(v);
    } else if (v === 'authenticity') {
      setLabPage('authenticity');
    } else {
      setLabPage('sentry');
    }
  }

  function isAutopsyIdentical(itemA, itemB, diff) {
    if (!itemA || !itemB) return false;
    if (!itemA.isGroup && !itemB.isGroup && itemA.id === itemB.id) return true;
    return Boolean(diff && diff.ready && diff.topDifferences.length === 0);
  }

  var toastTimer = null;
  var abPlayTimers = [];

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function safeNum(v, fb) {
    return typeof v === 'number' && Number.isFinite(v) ? v : (fb || 0);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg, isErr) {
    var el = $('tl-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-err', Boolean(isErr));
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.add('hidden');
    }, 3200);
  }

  function loadStoredTags() {
    try {
      var raw = root.localStorage ? root.localStorage.getItem(TAG_STORAGE_KEY) : null;
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') state.tagOverrides = parsed;
      }
    } catch (e) {}
  }

  function persistStoredTags() {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(state.tagOverrides));
      }
    } catch (e) {}
  }

  function loadStoredConfig() {
    var Lab = TootTestLab.DetectorLab;
    var def = Lab.createDefaultConfig('sentry_v3');
    try {
      var raw = root.localStorage ? root.localStorage.getItem(CFG_STORAGE_KEY) : null;
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.criteria) {
          def.preset = parsed.preset || 'custom';
          def.masterThreshold = safeNum(parsed.masterThreshold, def.masterThreshold);
          def.hardGateMode = parsed.hardGateMode !== false;
          def.bridgeAuthToSentry = Boolean(parsed.bridgeAuthToSentry);
          Object.keys(def.criteria).forEach(function (k) {
            if (parsed.criteria[k]) {
              def.criteria[k] = {
                threshold: safeNum(parsed.criteria[k].threshold, def.criteria[k].threshold),
                weight: safeNum(parsed.criteria[k].weight, def.criteria[k].weight),
                enabled: typeof parsed.criteria[k].enabled === 'boolean' ? parsed.criteria[k].enabled : def.criteria[k].enabled
              };
            }
          });
          if (parsed.auth && typeof parsed.auth === 'object') {
            def.auth.threshold = clamp(safeNum(parsed.auth.threshold, def.auth.threshold), 25, 75);
            if (parsed.auth.criteria && def.auth && def.auth.criteria) {
              Object.keys(def.auth.criteria).forEach(function (ak) {
                if (parsed.auth.criteria[ak]) {
                  def.auth.criteria[ak] = {
                    threshold: safeNum(parsed.auth.criteria[ak].threshold, def.auth.criteria[ak].threshold),
                    weight: safeNum(parsed.auth.criteria[ak].weight, def.auth.criteria[ak].weight),
                    enabled: typeof parsed.auth.criteria[ak].enabled === 'boolean' ? parsed.auth.criteria[ak].enabled : def.auth.criteria[ak].enabled
                  };
                }
              });
            }
          }
        }
      }
    } catch (e) {}
    state.config = def;
  }

  function getSentryDefs() {
    var Lab = TootTestLab.DetectorLab;
    return Lab.CRITERIA_DEFS.filter(function (d) { return d.group === 'stage1' || d.group === 'stage2'; });
  }

  function getAuthDefs() {
    var Lab = TootTestLab.DetectorLab;
    var ids = Lab.AUTH_CRITERIA_IDS || [];
    return ids.map(function (id) { return Lab.CRITERIA_BY_ID[id]; }).filter(Boolean);
  }

  function getAuthCriterionCfg(id) {
    var Lab = TootTestLab.DetectorLab;
    var def = Lab.CRITERIA_BY_ID[id];
    var auth = state.config && state.config.auth ? state.config.auth : null;
    if (auth && auth.criteria && auth.criteria[id]) return auth.criteria[id];
    return {
      threshold: def ? def.defaultThreshold : 0.5,
      weight: def ? def.defaultWeight : 1.0,
      enabled: true
    };
  }

  function persistStoredConfig() {
    try {
      if (root.localStorage && state.config) {
        root.localStorage.setItem(CFG_STORAGE_KEY, JSON.stringify(state.config));
      }
    } catch (e) {}
  }

  function getActiveSpecimen() {
    return state.activeId ? state.byId[state.activeId] || null : null;
  }

  function getCriterionCfg(id) {
    var def = TootTestLab.DetectorLab.CRITERIA_BY_ID[id];
    var cfg = state.config && state.config.criteria && state.config.criteria[id];
    return cfg || {
      threshold: def.defaultThreshold,
      weight: def.defaultWeight,
      enabled: def.defaultEnabled
    };
  }

  /* ==================== SPECIMEN LOADING, DELETION & DECODING ==================== */
  function isDeletableSpecimen(item) {
    return Boolean(item && item.storeType !== 'builtin' && item.source !== 'VaultPreLoads');
  }

  function registerSpecimen(item, atTop) {
    if (!item || !item.id) return null;
    if (state.byId[item.id]) {
      var existing = state.byId[item.id];
      Object.assign(existing, item);
      if (state.tagOverrides[existing.id] && !existing.isTestDisk) {
        existing.label = state.tagOverrides[existing.id];
      }
      return existing;
    }
    if (state.tagOverrides[item.id] && !item.isTestDisk) {
      item.label = state.tagOverrides[item.id];
    }
    state.byId[item.id] = item;
    if (atTop) state.specimens.unshift(item);
    else state.specimens.push(item);
    return item;
  }

  function clearArmedDelete() {
    state.armedDeleteKey = null;
    if (state.armedDeleteTimer) {
      clearTimeout(state.armedDeleteTimer);
      state.armedDeleteTimer = null;
    }
  }

  function updateDeleteSelectedButton() {
    var btn = $('btn-delete-selected');
    if (!btn) return;
    var delIds = Object.keys(state.selectedIds).filter(function (id) {
      return state.selectedIds[id] && isDeletableSpecimen(state.byId[id]);
    });
    var cnt = delIds.length;
    var armed = state.armedDeleteKey === '__bulk__' && cnt > 0;
    btn.disabled = cnt === 0;
    btn.classList.toggle('is-armed', armed);
    btn.textContent = armed ? 'Confirm (' + cnt + ')?' : '🗑 Delete Sel (' + cnt + ')';

    var diskBtn = $('btn-delete-disk');
    var act = getActiveSpecimen();
    if (diskBtn) {
      var canDelAct = isDeletableSpecimen(act);
      diskBtn.classList.toggle('hidden', !canDelAct);
      var diskArmed = canDelAct && state.armedDeleteKey === 'deck_' + act.id;
      diskBtn.classList.toggle('is-armed', diskArmed);
      diskBtn.textContent = diskArmed ? 'Confirm Delete?' : '🗑 Delete';
    }
  }

  async function deleteSpecimensByIds(ids) {
    var reqIds = Array.isArray(ids) ? ids.filter(Boolean) : [ids].filter(Boolean);
    var targets = [];
    var skippedBuiltIn = 0;
    for (var i = 0; i < reqIds.length; i++) {
      var it = state.byId[reqIds[i]];
      if (!it) continue;
      if (isDeletableSpecimen(it)) targets.push(it);
      else skippedBuiltIn++;
    }
    clearArmedDelete();

    if (targets.length === 0) {
      updateDeleteSelectedButton();
      renderBankList();
      if (skippedBuiltIn > 0) {
        showToast('Built-in VaultPreLoads are protected and cannot be deleted.', true);
      } else {
        showToast('No deletable recorded farts or decoys selected.', true);
      }
      return 0;
    }

    var removedMap = {};
    var deletedCount = 0;
    for (var k = 0; k < targets.length; k++) {
      var item = targets[k];
      try {
        if ((item.storeType === 'testDisk' || (item.isTestDisk && item.filename)) && item.filename && state.diskApiAvailable) {
          var qLbl = item.diskLabel || item.label || 'real';
          var resp = await fetch(
            '/api/test/recordings?label=' + encodeURIComponent(qLbl) + '&file=' + encodeURIComponent(item.filename),
            { method: 'DELETE' }
          );
          if (!resp.ok && resp.status !== 404) {
            var dErr = await resp.json().catch(function () { return {}; });
            throw new Error(dErr.error || ('HTTP ' + resp.status));
          }
        } else if (item.storeType === 'vaultSample' && root.TootLabs && root.TootLabs.Store && typeof root.TootLabs.Store.deleteSample === 'function') {
          await root.TootLabs.Store.deleteSample(item.rawStoreId);
        } else if (item.storeType === 'vaultAttempt' && root.TootLabs && root.TootLabs.Store && typeof root.TootLabs.Store.deleteAttempt === 'function') {
          await root.TootLabs.Store.deleteAttempt(item.rawStoreId);
        } else if (item.storeType === 'legacyCustom' && root.TootApp && root.TootApp.Storage && typeof root.TootApp.Storage.deleteCustomSound === 'function') {
          await root.TootApp.Storage.deleteCustomSound(item.rawStoreId);
        }
        removedMap[item.id] = true;
        delete state.byId[item.id];
        delete state.selectedIds[item.id];
        if (state.tagOverrides[item.id]) delete state.tagOverrides[item.id];
        deletedCount++;
      } catch (err) {
        showToast('Failed to delete ' + item.name + ': ' + err.message, true);
      }
    }

    if (deletedCount > 0) {
      persistStoredTags();
      state.specimens = state.specimens.filter(function (x) { return !removedMap[x.id]; });
      state.liveEvents = state.liveEvents.filter(function (ev) { return !removedMap[ev.itemId]; });

      if (state.activeId && removedMap[state.activeId]) {
        if (state.scrub) state.scrub.stop();
        state.activeId = null;
        if (state.specimens.length > 0) {
          await loadSpecimenOnDeck(state.specimens[0].id);
        } else {
          evaluateAndUpdateDeckMeters();
          drawScrubWaveform();
          drawSpeedJogWheel();
        }
      }
      if (state.autopsyAId && !isGroupSlotId(state.autopsyAId) && removedMap[state.autopsyAId]) {
        var nextA = state.specimens.find(function (x) { return x.label === 'real'; }) || state.specimens[0] || null;
        state.autopsyAId = nextA ? nextA.id : null;
      }
      if (state.autopsyBId && !isGroupSlotId(state.autopsyBId) && removedMap[state.autopsyBId]) {
        var nextB =
          state.specimens.find(function (x) { return x.label === 'fake' && x.id !== state.autopsyAId; }) ||
          state.specimens.find(function (x) { return x.id !== state.autopsyAId; }) ||
          state.specimens[0] ||
          null;
        state.autopsyBId = nextB ? nextB.id : GROUP_DECOY_ID;
      }

      renderAutopsySelectDropdowns();
      renderBankList();
      updateDeleteSelectedButton();
      renderAutopsyView();
      updateCohortAnalytics();
      showToast(
        'Deleted ' + deletedCount + ' recorded item(s)' +
        (skippedBuiltIn > 0 ? ' (' + skippedBuiltIn + ' built-in skipped)' : '.')
      );
    }
    return deletedCount;
  }

  function triggerTwoStepDelete(key, ids) {
    if (!ids || ids.length === 0) return;
    if (state.armedDeleteKey === key) {
      deleteSpecimensByIds(ids);
      return;
    }
    clearArmedDelete();
    state.armedDeleteKey = key;
    updateDeleteSelectedButton();
    renderBankList();
    showToast('Click again within 4s to permanently delete (' + ids.length + ').');
    state.armedDeleteTimer = setTimeout(function () {
      clearArmedDelete();
      updateDeleteSelectedButton();
      renderBankList();
    }, 4000);
  }

  async function checkDiskRecordings() {
    try {
      var resp = await fetch('/api/test/recordings', { cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var json = await resp.json();
      if (!json || !json.ok) throw new Error('Invalid API payload');
      state.diskApiAvailable = true;
      var pill = $('disk-status-pill');
      if (pill) {
        pill.textContent = 'Disk WAV API Ready';
        pill.className = 'tl-pill tl-pill-ok';
      }
      var files = Array.isArray(json.files) ? json.files : [];
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        registerSpecimen({
          id: f.id,
          name: f.name || f.filename,
          filename: f.filename,
          url: f.url,
          label: f.label || 'real',
          diskLabel: f.label || 'real',
          storeType: 'testDisk',
          source: 'TEST Disk',
          isTestDisk: true,
          durationSec: f.durationSec || null,
          sampleRate: f.sampleRate || 44100,
          createdAt: f.createdAt || null,
          decoded: false,
          telemetry: null
        });
      }
      return true;
    } catch (e) {
      state.diskApiAvailable = false;
      var pill2 = $('disk-status-pill');
      if (pill2) {
        pill2.textContent = 'Browser Download Mode';
        pill2.className = 'tl-pill tl-pill-warn';
      }
      return false;
    }
  }

  var offlineAudioBundlePromise = null;

  function ensureOfflinePreloadAudioBundle() {
    if (root.TOOT_PRELOADS_AUDIO_B64 && typeof root.TOOT_PRELOADS_AUDIO_B64 === 'object') {
      return Promise.resolve(root.TOOT_PRELOADS_AUDIO_B64);
    }
    if (offlineAudioBundlePromise) return offlineAudioBundlePromise;
    offlineAudioBundlePromise = new Promise(function (resolve) {
      try {
        var doc = root.document;
        if (!doc || !doc.body) {
          resolve(null);
          return;
        }
        var scriptEl = doc.createElement('script');
        scriptEl.src = './js/preloadsAudioData.js?v=20261127t10';
        scriptEl.async = false;
        scriptEl.onload = function () {
          resolve(root.TOOT_PRELOADS_AUDIO_B64 || null);
        };
        scriptEl.onerror = function () {
          resolve(null);
        };
        doc.body.appendChild(scriptEl);
      } catch (e) {
        resolve(null);
      }
    });
    return offlineAudioBundlePromise;
  }

  async function loadEmbeddedPreloadArrayBuffer(itemId) {
    if (!itemId) return null;
    var map = await ensureOfflinePreloadAudioBundle();
    if (!map || typeof map[itemId] !== 'string' || !map[itemId]) return null;
    var b64 = map[itemId];
    var bin = root.atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function loadPreloadsAndIndexedDb() {
    var isFileProto = Boolean(root.location && root.location.protocol === 'file:');
    var preloadsList = [];
    var usedEmbeddedCatalog = false;

    if (!isFileProto) {
      var candidates = ['/api/preloads', '../VaultPreLoads/manifest.json', '/VaultPreLoads/manifest.json'];
      for (var ci = 0; ci < candidates.length && preloadsList.length === 0; ci++) {
        try {
          var res = await fetch(candidates[ci], { cache: 'no-store' });
          if (res.ok) {
            var d = await res.json();
            if (d && Array.isArray(d.files) && d.files.length > 0) {
              preloadsList = d.files;
            }
          }
        } catch (e) {}
      }
    }

    if (preloadsList.length === 0 && Array.isArray(root.TOOT_PRELOADS_CATALOG) && root.TOOT_PRELOADS_CATALOG.length > 0) {
      preloadsList = root.TOOT_PRELOADS_CATALOG;
      usedEmbeddedCatalog = true;
    }

    for (var i = 0; i < preloadsList.length; i++) {
      var p = preloadsList[i];
      var url = p.url || ('../VaultPreLoads/' + String(p.filename || '').split('/').map(encodeURIComponent).join('/'));
      registerSpecimen({
        id: p.id || ('preload_' + i),
        name: p.name || p.filename || ('Preload #' + (i + 1)),
        filename: p.filename || '',
        url: url,
        label: 'real',
        storeType: 'builtin',
        source: 'VaultPreLoads',
        isTestDisk: false,
        durationSec: p.durationSec || null,
        decoded: false,
        telemetry: null
      });
    }

    if (root.TootLabs && root.TootLabs.Store) {
      try {
        var vaultSamples = await root.TootLabs.Store.loadVaultSamples();
        for (var vi = 0; vi < vaultSamples.length; vi++) {
          var vs = vaultSamples[vi];
          if (!vs) continue;
          if (vs.isBuiltIn && state.byId[vs.id]) continue;
          var hasRaw = vs.rawSamples && vs.rawSamples.length > 0;
          var hasClip = vs.samples && vs.samples.length > 0;
          registerSpecimen({
            id: vs.isBuiltIn ? vs.id : ('vault_' + vs.id),
            rawStoreId: vs.id,
            storeType: vs.isBuiltIn ? 'builtin' : 'vaultSample',
            name: vs.displayName || vs.name || 'User Recorded Fart',
            filename: vs.filename || '',
            url: vs.preloadUrl || '',
            label: 'real',
            source: vs.isBuiltIn ? 'VaultPreLoads' : 'Recorded Fart',
            isTestDisk: false,
            rawSamples: hasRaw ? vs.rawSamples : (hasClip ? vs.samples : null),
            clippedSamples: hasClip ? vs.samples : null,
            sampleRate: vs.sampleRate || 44100,
            durationSec: hasClip ? (vs.samples.length / (vs.sampleRate || 44100)) : (vs.previewDurationSec || null),
            decoded: false,
            telemetry: null
          });
        }
      } catch (e3) {}

      try {
        var attempts = await root.TootLabs.Store.loadAllAttempts();
        for (var ai = 0; ai < attempts.length; ai++) {
          var att = attempts[ai];
          if (!att || !att.samples || att.samples.length === 0) continue;
          var rawName = String(att.name || 'My Decoy').replace(/\s+Mimic$/i, '');
          registerSpecimen({
            id: 'decoy_' + att.id,
            rawStoreId: att.id,
            storeType: 'vaultAttempt',
            sampleId: att.sampleId || null,
            name: rawName + ' (Decoy)',
            label: 'fake',
            source: 'Vault Decoy',
            isTestDisk: false,
            rawSamples: att.rawSamples && att.rawSamples.length ? att.rawSamples : att.samples,
            clippedSamples: att.samples,
            sampleRate: att.sampleRate || 44100,
            durationSec: att.samples.length / (att.sampleRate || 44100),
            decoded: false,
            telemetry: null
          });
        }
      } catch (e4) {}
    }

    if (root.TootApp && root.TootApp.Storage && typeof root.TootApp.Storage.loadCustomSounds === 'function') {
      try {
        var customSounds = await root.TootApp.Storage.loadCustomSounds();
        for (var ki = 0; ki < customSounds.length; ki++) {
          var cs = customSounds[ki];
          if (!cs || !cs.samples || cs.samples.length === 0) continue;
          if (state.byId['vault_' + cs.id]) continue;
          registerSpecimen({
            id: 'legacy_' + cs.id,
            rawStoreId: cs.id,
            storeType: 'legacyCustom',
            name: cs.name || 'Recorded Fart',
            label: 'real',
            source: 'Recorded Fart',
            isTestDisk: false,
            rawSamples: cs.rawSamples && cs.rawSamples.length ? cs.rawSamples : cs.samples,
            clippedSamples: cs.samples,
            sampleRate: cs.sampleRate || 44100,
            durationSec: cs.samples.length / (cs.sampleRate || 44100),
            decoded: false,
            telemetry: null
          });
        }
      } catch (e5) {}
    }

    var preloadCount = state.specimens.filter(function (s) {
      return s && s.source === 'VaultPreLoads';
    }).length;
    var banner = $('file-proto-banner');
    if (banner) {
      if (preloadCount === 0) {
        banner.innerHTML =
          'No pre-recorded <code>VaultPreLoads</code> clips loaded. Run <strong>TEST/Launch TEST Lab.bat</strong> (<code>http://localhost:3000/TEST/</code>) or click <strong>📂 Vault Folder</strong> below and select <code>VaultPreLoads</code>.';
        banner.classList.remove('hidden');
      } else if (isFileProto) {
        banner.innerHTML =
          'Offline <code>file://</code> mode — all <strong>' +
          preloadCount +
          '</strong> pre-recorded Guess the Fart clips loaded via embedded bundle. Run <strong>TEST/Launch TEST Lab.bat</strong> (<code>http://localhost:3000/TEST/</code>) for live Mic recording &amp; Disk WAV saving.';
        banner.classList.remove('hidden');
      } else if (usedEmbeddedCatalog) {
        banner.innerHTML =
          'Loaded <strong>' +
          preloadCount +
          '</strong> pre-recorded Guess the Fart clips from the offline catalog fallback (<code>/api/preloads</code> unavailable on this server).';
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  async function ensureDecoded(item) {
    if (!item) return null;
    if (item.decoded && item.telemetry && item.clippedSamples) return item;

    var DSP = root.TootApp && root.TootApp.DSP;
    var Audio = root.TootApp && root.TootApp.Audio;
    var sr = item.sampleRate || 44100;
    var isFileProto = Boolean(root.location && root.location.protocol === 'file:');

    if ((!item.clippedSamples || item.clippedSamples.length === 0) && item.url) {
      var buf = null;
      if (!isFileProto) {
        try {
          var res = await fetch(item.url, { cache: 'no-store' });
          if (res && res.ok) {
            buf = await res.arrayBuffer();
          }
        } catch (eFetch) {
          buf = null;
        }
      }
      if (!buf) {
        buf = await loadEmbeddedPreloadArrayBuffer(item.id);
      }
      if (!buf) {
        throw new Error('Audio fetch failed and offline bundle had no data for ' + (item.name || item.id));
      }
      var audioBuf = await Audio.decodeAudioBytes(buf);
      var mono = Audio.audioBufferToMono(audioBuf);
      item.rawSamples = mono.samples;
      item.sampleRate = mono.sampleRate;
      sr = mono.sampleRate;
      var clipInfo = DSP.autoClipAudio(mono.samples, sr);
      item.clipInfo = clipInfo;
      item.clippedSamples = clipInfo && clipInfo.clipped && clipInfo.clipped.length > 0 ? clipInfo.clipped : mono.samples;
    } else if (!item.clippedSamples && item.rawSamples && item.rawSamples.length > 0) {
      var clipInfo2 = DSP.autoClipAudio(item.rawSamples, sr);
      item.clipInfo = clipInfo2;
      item.clippedSamples = clipInfo2 && clipInfo2.clipped && clipInfo2.clipped.length > 0 ? clipInfo2.clipped : item.rawSamples;
    }

    if (!item.rawSamples && item.clippedSamples) {
      item.rawSamples = item.clippedSamples;
    }
    if (!item.clipInfo && item.clippedSamples && item.clippedSamples.length > 0) {
      item.clipInfo = DSP.autoClipAudio(item.rawSamples, sr);
    }

    item.telemetry = TootTestLab.DetectorLab.extractFullTelemetry(
      item.clippedSamples,
      sr,
      item.rawSamples,
      item.clipInfo,
      null
    );
    item.durationSec = item.telemetry ? item.telemetry.durationSec : (item.clippedSamples ? item.clippedSamples.length / sr : 0);
    item.decoded = true;
    return item;
  }

  /* ==================== UI RENDERING: BANK & SELECTORS ==================== */
  function getFilteredBankItems() {
    var q = state.searchQuery.trim().toLowerCase();
    return state.specimens.filter(function (it) {
      if (state.bankFilter === 'recorded' || state.bankFilter === 'testrec') {
        if (!isDeletableSpecimen(it)) return false;
      }
      if (state.bankFilter === 'real' && it.label !== 'real') return false;
      if (state.bankFilter === 'fake' && it.label !== 'fake') return false;
      if (state.bankFilter === 'noise' && it.label !== 'noise') return false;
      if (q) {
        var hay = (it.name + ' ' + it.source + ' ' + it.id + ' ' + it.label + ' ' + formatLabelDisplay(it.label)).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function resolveGroupItems(slotId) {
    var decoded = state.specimens.filter(function (it) {
      return it && it.decoded && it.telemetry && it.telemetry.metrics;
    });
    if (slotId === GROUP_REAL_ID) {
      var selReal = decoded.filter(function (it) { return state.selectedIds[it.id] && it.label === 'real'; });
      return selReal.length > 0 ? selReal : decoded.filter(function (it) { return it.label === 'real'; });
    }
    if (slotId === GROUP_DECOY_ID) {
      var selDecoy = decoded.filter(function (it) { return state.selectedIds[it.id] && it.label === 'fake'; });
      return selDecoy.length > 0 ? selDecoy : decoded.filter(function (it) { return it.label === 'fake'; });
    }
    if (slotId === GROUP_REC_REAL_ID) {
      return decoded.filter(function (it) { return isDeletableSpecimen(it) && it.label === 'real'; });
    }
    return [];
  }

  function resolveAutopsyOperand(slotId) {
    if (!slotId) return null;
    if (slotId === GROUP_REAL_ID) {
      var reals = resolveGroupItems(GROUP_REAL_ID);
      return TootTestLab.DetectorLab.buildGroupCompositeSpecimen(reals, {
        id: GROUP_REAL_ID,
        label: 'real',
        name: 'Real Farts Avg (' + reals.length + ')',
        config: state.config
      });
    }
    if (slotId === GROUP_DECOY_ID) {
      var decoys = resolveGroupItems(GROUP_DECOY_ID);
      return TootTestLab.DetectorLab.buildGroupCompositeSpecimen(decoys, {
        id: GROUP_DECOY_ID,
        label: 'fake',
        name: 'My Decoys Avg (' + decoys.length + ')',
        config: state.config
      });
    }
    if (slotId === GROUP_REC_REAL_ID) {
      var recReals = resolveGroupItems(GROUP_REC_REAL_ID);
      return TootTestLab.DetectorLab.buildGroupCompositeSpecimen(recReals, {
        id: GROUP_REC_REAL_ID,
        label: 'real',
        name: 'My Recorded Farts Avg (' + recReals.length + ')',
        config: state.config
      });
    }
    return state.byId[slotId] || null;
  }

  function syncAutopsyModePills() {
    var bSingle = $('btn-mode-single');
    var bGroup = $('btn-mode-real-vs-decoys');
    var bOneDecoys = $('btn-mode-one-vs-decoys');
    var isGroupVsGroup = state.autopsyAId === GROUP_REAL_ID && state.autopsyBId === GROUP_DECOY_ID;
    var isOneVsDecoys = !isGroupVsGroup && !isGroupSlotId(state.autopsyAId) && state.autopsyBId === GROUP_DECOY_ID;
    if (bGroup) bGroup.classList.toggle('is-active', isGroupVsGroup);
    if (bOneDecoys) bOneDecoys.classList.toggle('is-active', isOneVsDecoys);
    if (bSingle) bSingle.classList.toggle('is-active', !isGroupVsGroup && !isOneVsDecoys);
  }

  function renderAutopsySelectDropdowns() {
    var selA = $('sel-autopsy-a');
    var selB = $('sel-autopsy-b');
    if (!selA || !selB) return;

    var realCnt = state.specimens.filter(function (x) { return x.label === 'real'; }).length;
    var decoyCnt = state.specimens.filter(function (x) { return x.label === 'fake'; }).length;
    var recRealCnt = state.specimens.filter(function (x) { return isDeletableSpecimen(x) && x.label === 'real'; }).length;

    var groupOptsHtml =
      '<optgroup label="Group Averages (Multi-Clip)">' +
      '<option value="' + GROUP_REAL_ID + '">[GROUP] Selected / All Real Farts Avg (' + realCnt + ')</option>' +
      '<option value="' + GROUP_DECOY_ID + '">[GROUP] My Decoys Avg (' + decoyCnt + ')</option>' +
      '<option value="' + GROUP_REC_REAL_ID + '">[GROUP] My Recorded Real Farts Avg (' + recRealCnt + ')</option>' +
      '</optgroup>';

    var itemOptsHtml =
      '<optgroup label="Individual Specimens">' +
      state.specimens
        .map(function (it) {
          var lbl = '[' + formatLabelDisplay(it.label) + ']';
          return '<option value="' + esc(it.id) + '">' + esc(lbl + ' ' + it.name + ' (' + it.source + ')') + '</option>';
        })
        .join('') +
      '</optgroup>';

    var fullHtml = groupOptsHtml + itemOptsHtml;
    selA.innerHTML = fullHtml;
    selB.innerHTML = fullHtml;
    if (state.autopsyAId && (isGroupSlotId(state.autopsyAId) || state.byId[state.autopsyAId])) selA.value = state.autopsyAId;
    if (state.autopsyBId && (isGroupSlotId(state.autopsyBId) || state.byId[state.autopsyBId])) selB.value = state.autopsyBId;
    syncAutopsyModePills();
  }

  function renderBankList() {
    var listEl = $('bank-list');
    var countEl = $('bank-count-badge');
    if (!listEl) return;
    var items = getFilteredBankItems();
    if (countEl) countEl.textContent = String(items.length) + ' / ' + state.specimens.length;

    if (items.length === 0) {
      listEl.innerHTML = '<div class="tl-empty-mini">No specimens match filter. Record, import files/Vault folder, or clear search.</div>';
      updateDeleteSelectedButton();
      return;
    }

    listEl.innerHTML = items
      .map(function (it) {
        var isSel = Boolean(state.selectedIds[it.id]);
        var isAct = state.activeId === it.id;
        var isPinA = state.autopsyAId === it.id;
        var isPinB = state.autopsyBId === it.id;
        var canDelete = isDeletableSpecimen(it);
        var isDelArmed = canDelete && state.armedDeleteKey === 'row_' + it.id;
        var durTxt = typeof it.durationSec === 'number' ? it.durationSec.toFixed(2) + 's' : '—';
        var verdictHtml = '<span class="tl-bank-verdict raw">RAW</span>';
        if (it.decoded && it.telemetry) {
          var ev = TootTestLab.DetectorLab.evaluateTelemetry(it.telemetry, state.config, state.bgProfile);
          verdictHtml =
            '<span class="tl-bank-verdict ' +
            (ev.detected ? 'pass' : 'fail') +
            '">' +
            (ev.bgRejected ? 'BG✕ ' : ev.detected ? '✓ ' : '✕ ') +
            ev.detectScore +
            '%</span>';
        }
        var lblTxt = formatLabelDisplay(it.label);
        var delBtnHtml = canDelete
          ? '  <button type="button" class="tl-del-row-btn' +
            (isDelArmed ? ' is-armed' : '') +
            '" data-delete-id="' +
            esc(it.id) +
            '" title="Delete this recording">' +
            (isDelArmed ? 'Del?' : '🗑') +
            '</button>'
          : '';
        return (
          '<div class="tl-bank-row' +
          (isAct ? ' is-active' : '') +
          '" data-item-id="' +
          esc(it.id) +
          '">' +
          '  <input type="checkbox" data-sel-id="' +
          esc(it.id) +
          '" ' +
          (isSel ? 'checked' : '') +
          ' aria-label="Select ' +
          esc(it.name) +
          '" />' +
          '  <div class="tl-bank-info">' +
          '    <div class="tl-bank-title">' +
          esc(it.name) +
          '</div>' +
          '    <div class="tl-bank-sub">' +
          '      <button type="button" class="tl-tag-chip ' +
          esc(it.label) +
          '" data-cycle-id="' +
          esc(it.id) +
          '" title="Click to cycle Real / Decoy / Noise">' +
          lblTxt +
          '</button>' +
          '      <span>' +
          esc(it.source) +
          '</span>' +
          '      <span>· ' +
          durTxt +
          '</span>' +
          '    </div>' +
          '  </div>' +
          '  <div class="tl-pin-btns">' +
          '    <button type="button" class="tl-pin-btn is-a' + (isPinA ? ' active' : '') + '" data-pin-a="' + esc(it.id) + '" title="Compare as Specimen A">A</button>' +
          '    <button type="button" class="tl-pin-btn is-b' + (isPinB ? ' active' : '') + '" data-pin-b="' + esc(it.id) + '" title="Compare as Specimen B">B</button>' +
          '  </div>' +
          verdictHtml +
          delBtnHtml +
          '</div>'
        );
      })
      .join('');
    updateDeleteSelectedButton();
  }

  function getActiveTelemetryForCriteria() {
    var active = getActiveSpecimen();
    if ((state.liveMonitorActive || state.isManualRecording) && state.windowTelemetry) {
      return state.windowTelemetry;
    }
    if (state.scrub && (state.scrub.getState().scrubbing || state.scrub.getState().playing) && state.windowTelemetry) {
      return state.windowTelemetry;
    }
    return active && active.telemetry ? active.telemetry : null;
  }

  function syncExpandAllButtonLabel() {
    var btn = $('btn-crit-expand-all');
    if (!btn) return;
    var defs = getSentryDefs();
    var openCount = 0;
    for (var i = 0; i < defs.length; i++) {
      if (state.expandedCriteria[defs[i].id]) openCount++;
    }
    var allOpen = defs.length > 0 && openCount >= defs.length;
    btn.textContent = allOpen ? '▴ Collapse All' : '▾ Expand All';
  }

  function toggleCriterionRow(defId, forceOpen) {
    var card = $('crit-card-' + defId);
    if (!card) return;
    var nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !card.classList.contains('is-open');
    state.expandedCriteria[defId] = nextOpen;
    card.classList.toggle('is-open', nextOpen);
    var sumEl = card.querySelector('.tl-crit-row-summary');
    if (sumEl) sumEl.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    syncExpandAllButtonLabel();
  }

  function setAllCriteriaExpanded(open) {
    var defs = getSentryDefs();
    for (var i = 0; i < defs.length; i++) {
      toggleCriterionRow(defs[i].id, Boolean(open));
    }
  }

  function focusAndOpenCriterion(defId) {
    var def = TootTestLab.DetectorLab.CRITERIA_BY_ID[defId];
    if (!def) return;
    if (state.activePage !== 'sentry') {
      setLabPage('sentry');
    }
    toggleCriterionRow(defId, true);
    var card = $('crit-card-' + defId);
    if (!card) return;

    document.querySelectorAll('.tl-crit-row.is-focused').forEach(function (el) {
      if (el !== card) el.classList.remove('is-focused');
    });
    card.classList.add('is-focused');
    state.focusedCriterionId = defId;
    if (state.focusedCriterionTimer) clearTimeout(state.focusedCriterionTimer);
    state.focusedCriterionTimer = setTimeout(function () {
      if (card) card.classList.remove('is-focused');
    }, 1900);

    try {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      card.scrollIntoView(true);
    }
    drawCriteriaProfileGraph(getActiveTelemetryForCriteria());
  }

  function lockOneCriterionToActive(defId) {
    var tel = getActiveTelemetryForCriteria();
    var def = TootTestLab.DetectorLab.CRITERIA_BY_ID[defId];
    if (!def || !tel || !tel.metrics) {
      showToast('Load or record a sound first to lock this gate.', true);
      return;
    }
    var noiseAndDecoys = state.specimens.filter(function (s) {
      return s.decoded && s.telemetry && (s.label === 'noise' || s.label === 'fake');
    });
    var res = TootTestLab.DetectorLab.calibrateSingleCriterion(defId, tel.metrics[defId], state.config, {
      margin: 0.22,
      bgProfile: state.bgProfile,
      noiseItems: noiseAndDecoys
    });
    state.config = res.config;
    var selPreset = $('sel-preset');
    if (selPreset && Array.from(selPreset.options).some(function (o) { return o.value === 'custom'; })) {
      selPreset.value = 'custom';
    }
    syncCriteriaSlidersFromConfig();
    onConfigMutated();
    showToast('Locked ' + def.shortLabel + ' cutoff to ' + (def.mode === 'min' ? '≥ ' : '≤ ') + def.format(res.threshold));
  }

  function resetOneCriterionToDefault(defId) {
    var Lab = TootTestLab.DetectorLab;
    var def = Lab.CRITERIA_BY_ID[defId];
    if (!def) return;
    var selPreset = $('sel-preset');
    var pId = (selPreset && selPreset.value && selPreset.value !== 'custom') ? selPreset.value : 'sentry_v3';
    var base = Lab.createDefaultConfig(pId);
    state.config.criteria[defId] = JSON.parse(JSON.stringify(base.criteria[defId]));
    state.config.preset = 'custom';
    syncCriteriaSlidersFromConfig();
    onConfigMutated();
    showToast('Reset ' + def.shortLabel + ' to preset default.');
  }

  function lockLimitsToPeaks() {
    var baseTel = getActiveTelemetryForCriteria();
    var defs = getSentryDefs();
    var peakMetrics = {};
    var hasAny = false;
    for (var i = 0; i < defs.length; i++) {
      var id = defs[i].id;
      var activeVal = baseTel && baseTel.metrics && typeof baseTel.metrics[id] === 'number' ? baseTel.metrics[id] : null;
      var peakVal = typeof state.criteriaPeaks[id] === 'number' ? state.criteriaPeaks[id] : activeVal;
      if (peakVal != null && Number.isFinite(peakVal)) {
        peakMetrics[id] = activeVal != null ? Math.max(activeVal, peakVal) : peakVal;
        hasAny = true;
      } else {
        peakMetrics[id] = defs[i].defaultThreshold;
      }
    }
    if (!hasAny) {
      showToast('No observed peaks yet — play, load, or monitor a fart first.', true);
      return null;
    }
    var peakTel = baseTel ? JSON.parse(JSON.stringify(baseTel)) : { metrics: {}, authenticityScore: 65 };
    peakTel.metrics = peakMetrics;
    var noiseAndDecoys = state.specimens.filter(function (s) {
      return s.decoded && s.telemetry && (s.label === 'noise' || s.label === 'fake');
    });
    var res = TootTestLab.DetectorLab.calibrateLimitsFromTarget(peakTel, state.config, {
      margin: 0.20,
      bgProfile: state.bgProfile,
      noiseItems: noiseAndDecoys
    });
    state.config = res.config;
    var selPreset = $('sel-preset');
    if (selPreset && Array.from(selPreset.options).some(function (o) { return o.value === 'custom'; })) {
      selPreset.value = 'custom';
    }
    syncCriteriaSlidersFromConfig();
    onConfigMutated();
    showToast('Auto-adjusted all 16 cutoffs from Peaks (' + Math.round(res.targetEval.detectScore) + '% peak score).');
    return res;
  }

  function buildCriteriaDom() {
    var mount = $('criteria-groups-mount');
    if (!mount) return;
    var defs = getSentryDefs();
    var groups = [];
    var groupMap = {};
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      if (!groupMap[d.group]) {
        groupMap[d.group] = { id: d.group, label: d.groupLabel, items: [] };
        groups.push(groupMap[d.group]);
      }
      groupMap[d.group].items.push(d);
    }

    mount.innerHTML = groups
      .map(function (g) {
        var rows = g.items
          .map(function (def) {
            var c = getCriterionCfg(def.id);
            var modeStr = def.mode === 'min' ? '≥' : '≤';
            var isOpen = Boolean(state.expandedCriteria[def.id]);
            return (
              '<div class="tl-crit-card tl-crit-row' +
              (isOpen ? ' is-open' : '') +
              '" id="crit-card-' +
              def.id +
              '" data-crit-row="' +
              def.id +
              '">' +
              '  <div class="tl-crit-row-summary" role="button" tabindex="0" aria-expanded="' +
              (isOpen ? 'true' : 'false') +
              '" data-crit-toggle="' +
              def.id +
              '" title="Click to open/close sliders &amp; details for ' +
              esc(def.label) +
              '">' +
              '    <input type="checkbox" data-crit-enable="' +
              def.id +
              '" ' +
              (c.enabled ? 'checked' : '') +
              ' aria-label="Enable ' +
              esc(def.label) +
              '" />' +
              '    <div class="tl-crit-row-name">' +
              '      <span>' +
              esc(def.label) +
              '</span>' +
              '      <small class="tl-crit-mode-tag">' +
              modeStr +
              '</small>' +
              '    </div>' +
              '    <div class="tl-crit-meter-bar">' +
              '      <div id="crit-passzone-' +
              def.id +
              '" class="tl-crit-pass-zone"></div>' +
              '      <div id="crit-valbar-' +
              def.id +
              '" class="tl-crit-val-bar"></div>' +
              '      <div id="crit-peakpin-' +
              def.id +
              '" class="tl-crit-peak-pin"></div>' +
              '      <div id="crit-thrpin-' +
              def.id +
              '" class="tl-crit-thr-pin"></div>' +
              '      <div id="crit-valpin-' +
              def.id +
              '" class="tl-crit-val-pin"></div>' +
              '    </div>' +
              '    <div class="tl-crit-row-nums">' +
              '      <span id="crit-valtxt-' +
              def.id +
              '">Val: —</span>' +
              '      <span class="tl-crit-num-pk" id="crit-peaktxt-' +
              def.id +
              '">Pk: —</span>' +
              '      <span class="tl-crit-num-cut" id="crit-thrtxt-' +
              def.id +
              '">Cut: ' +
              modeStr +
              esc(def.format(c.threshold)) +
              '</span>' +
              '    </div>' +
              '    <span id="crit-badge-' +
              def.id +
              '" class="tl-crit-badge off">—</span>' +
              '    <span class="tl-crit-chevron" aria-hidden="true">▸</span>' +
              '  </div>' +
              '  <div class="tl-crit-drawer">' +
              '    <div class="tl-crit-sliders">' +
              '      <div class="tl-crit-slider-col">' +
              '        <span>Cutoff Threshold (' +
              modeStr +
              ' pass)</span>' +
              '        <input type="range" data-crit-thr="' +
              def.id +
              '" min="' +
              def.min +
              '" max="' +
              def.max +
              '" step="' +
              def.step +
              '" value="' +
              c.threshold +
              '" />' +
              '      </div>' +
              '      <div class="tl-crit-slider-col">' +
              '        <span id="crit-wtlbl-' +
              def.id +
              '">Wt: ' +
              safeNum(c.weight, 1).toFixed(1) +
              'x</span>' +
              '        <input type="range" data-crit-wt="' +
              def.id +
              '" min="0" max="3" step="0.1" value="' +
              c.weight +
              '" />' +
              '      </div>' +
              '      <div class="tl-crit-row-tools">' +
              '        <button type="button" class="tl-mini-btn" data-crit-lock-one="' +
              def.id +
              '" title="Snap this gate cutoff to the active sound">🎯 Lock</button>' +
              '        <button type="button" class="tl-mini-btn" data-crit-reset-one="' +
              def.id +
              '" title="Reset this gate to preset default">↺ Default</button>' +
              '      </div>' +
              '    </div>' +
              '    <div class="tl-crit-desc">' +
              esc(def.description) +
              '</div>' +
              '  </div>' +
              '</div>'
            );
          })
          .join('');
        return '<div><h3 class="tl-crit-group-title">' + esc(g.label) + '</h3><div class="tl-crit-list">' + rows + '</div></div>';
      })
      .join('');
    syncExpandAllButtonLabel();
  }

  function syncCriteriaSlidersFromConfig() {
    var defs = getSentryDefs();
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      var c = getCriterionCfg(d.id);
      var chk = document.querySelector('[data-crit-enable="' + d.id + '"]');
      var thrEl = document.querySelector('[data-crit-thr="' + d.id + '"]');
      var wtEl = document.querySelector('[data-crit-wt="' + d.id + '"]');
      if (chk) chk.checked = Boolean(c.enabled);
      if (thrEl) thrEl.value = String(c.threshold);
      if (wtEl) wtEl.value = String(c.weight);
    }
    var mThr = $('rng-master-thresh');
    var mLbl = $('lbl-master-thresh');
    var hg = $('chk-hard-gate');
    var br = $('chk-sentry-bridge-auth');
    var aThr = $('rng-auth-thresh');
    var aLbl = $('lbl-auth-thresh');
    if (mThr) mThr.value = String(state.config.masterThreshold);
    if (mLbl) mLbl.textContent = Math.round(state.config.masterThreshold) + '%';
    if (hg) hg.checked = Boolean(state.config.hardGateMode);
    if (br) br.checked = Boolean(state.config.bridgeAuthToSentry);
    var authThrVal = state.config.auth ? safeNum(state.config.auth.threshold, 50) : 50;
    if (aThr) aThr.value = String(Math.round(authThrVal));
    if (aLbl) aLbl.textContent = Math.round(authThrVal) + '%';
    syncAuthSlidersFromConfig();
  }

  function drawCriteriaProfileGraph(telemetry) {
    var canvas = $('canvas-criteria-graph');
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#081016';
    ctx.fillRect(0, 0, w, h);

    var defs = getSentryDefs();
    var n = defs.length;
    if (n === 0) return;
    var compact = w < 540;
    var padL = compact ? 30 : 40;
    var padR = compact ? 8 : 14;
    var padT = 26;
    var padB = compact ? 74 : 70;
    var plotW = Math.max(80, w - padL - padR);
    var plotH = Math.max(50, h - padT - padB);
    var plotBot = padT + plotH;
    var colW = plotW / n;

    // Sentry stages (11 gates: Stage 1 Energy [4] + Stage 2 Sentry Spectral [7])
    var stages = [
      { id: 'stage1', label: 'STAGE 1 · LIVE TRIGGER & ENERGY', startIdx: 0, count: 4, col: 'rgba(16, 185, 129, 0.14)' },
      { id: 'stage2', label: 'STAGE 2 · SENTRY v3 SPECTRAL', startIdx: 4, count: Math.max(1, n - 4), col: 'rgba(56, 189, 248, 0.10)' }
    ];
    for (var si = 0; si < stages.length; si++) {
      var sg = stages[si];
      var sx0 = padL + sg.startIdx * colW;
      var sw = sg.count * colW;
      ctx.fillStyle = sg.col;
      ctx.fillRect(sx0, padT, sw, plotH);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = compact ? 'bold 8px Consolas, monospace' : 'bold 9px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(compact ? sg.label.replace(' · ', ' ') : sg.label, sx0 + sw / 2, 14);
      if (si > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx0, padT);
        ctx.lineTo(sx0, plotBot);
        ctx.stroke();
      }
    }

    // Y-axis reference grid (0%..100% normalized range)
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'right';
    [0, 0.25, 0.5, 0.75, 1.0].forEach(function (u) {
      var gy = plotBot - u * plotH;
      ctx.strokeStyle = u === 0 ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + plotW, gy);
      ctx.stroke();
      ctx.fillStyle = '#89b79f';
      ctx.fillText(Math.round(u * 100) + '%', padL - 4, gy + 3);
    });

    var colsHit = [];
    for (var i = 0; i < n; i++) {
      var def = defs[i];
      var c = getCriterionCfg(def.id);
      var span = Math.max(1e-6, def.max - def.min);
      var x0 = padL + i * colW;
      var x1 = x0 + colW;
      var cx = x0 + colW * 0.5;
      var barW = clamp(colW * 0.44, 6, 22);
      var barX = cx - barW * 0.5;

      var val = telemetry && telemetry.metrics ? telemetry.metrics[def.id] : null;
      var hasVal = typeof val === 'number' && Number.isFinite(val);
      var peakRaw = typeof state.criteriaPeaks[def.id] === 'number' ? state.criteriaPeaks[def.id] : val;
      var peakVal = typeof peakRaw === 'number' && Number.isFinite(peakRaw)
        ? (hasVal ? Math.max(peakRaw, val) : peakRaw)
        : null;

      var normVal = hasVal ? clamp((val - def.min) / span, 0, 1) : 0;
      var normPeak = peakVal != null ? clamp((peakVal - def.min) / span, 0, 1) : normVal;
      var normThr = clamp((c.threshold - def.min) / span, 0, 1);

      var valY = plotBot - normVal * plotH;
      var peakY = plotBot - normPeak * plotH;
      var thrY = plotBot - normThr * plotH;
      var passed = hasVal ? (def.mode === 'min' ? val >= c.threshold : val <= c.threshold) : null;
      var activeGate = Boolean(c.enabled && safeNum(c.weight, 0) > 0);
      var isHover = state.criteriaGraphHoverId === def.id;
      var isDrag = state.criteriaGraphDragId === def.id;
      var isFocused = state.focusedCriterionId === def.id;

      // Hover / focus / drag highlight band
      if (isHover || isDrag || isFocused) {
        ctx.fillStyle = isDrag ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x0 + 1, padT, colW - 2, plotH);
      }

      // Pass zone shading inside each column
      ctx.fillStyle = activeGate ? 'rgba(34, 197, 94, 0.10)' : 'rgba(148, 163, 184, 0.05)';
      if (def.mode === 'min') {
        ctx.fillRect(x0 + 2, padT, colW - 4, Math.max(0, thrY - padT));
      } else {
        ctx.fillRect(x0 + 2, thrY, colW - 4, Math.max(0, plotBot - thrY));
      }

      // Active value vertical bar
      if (hasVal) {
        var barH = Math.max(2, plotBot - valY);
        ctx.fillStyle = !activeGate ? '#64748b' : (passed ? '#22c55e' : '#ef4444');
        ctx.globalAlpha = activeGate ? 0.88 : 0.48;
        ctx.fillRect(barX, valY, barW, barH);
        ctx.globalAlpha = 1;
      }

      // Amber Peak Hold cap & stem
      if (peakVal != null) {
        if (hasVal && peakY < valY - 2) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, peakY);
          ctx.lineTo(cx, valY);
          ctx.stroke();
        }
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(barX - 1, peakY - 1.5, barW + 2, 3);
        ctx.beginPath();
        ctx.moveTo(cx, peakY - 4);
        ctx.lineTo(cx + 3.5, peakY);
        ctx.lineTo(cx, peakY + 4);
        ctx.lineTo(cx - 3.5, peakY);
        ctx.closePath();
        ctx.fill();
      }

      // Draggable Cyan Cutoff bar + handle knob
      ctx.strokeStyle = activeGate ? '#38bdf8' : '#94a3b8';
      ctx.lineWidth = isDrag || isHover ? 2.4 : 1.8;
      ctx.beginPath();
      ctx.moveTo(x0 + 3, thrY);
      ctx.lineTo(x1 - 3, thrY);
      ctx.stroke();

      var knobR = isDrag ? 6.5 : (isHover ? 5.5 : 4.5);
      ctx.beginPath();
      ctx.arc(cx, thrY, knobR, 0, Math.PI * 2);
      ctx.fillStyle = activeGate ? '#38bdf8' : '#64748b';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Rotated X-axis criterion label (clickable to jump to row)
      ctx.save();
      ctx.translate(cx + 2, plotBot + 8);
      ctx.rotate(compact ? -0.84 : -0.62);
      ctx.font = compact ? 'bold 8px Consolas, monospace' : 'bold 9.5px Consolas, monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = isDrag || isHover || isFocused ? '#38bdf8' : (passed === false && activeGate ? '#fca5a5' : '#d8f3e5');
      ctx.fillText(def.shortLabel, 0, 0);
      ctx.restore();

      colsHit.push({
        id: def.id,
        def: def,
        x0: x0,
        x1: x1,
        cx: cx,
        valY: valY,
        peakY: peakY,
        thrY: thrY,
        plotTop: padT,
        plotBot: plotBot,
        val: val,
        peakVal: peakVal,
        thr: c.threshold,
        enabled: c.enabled,
        passed: passed
      });
    }

    state.criteriaGraphCols = colsHit;

    // Live floating readout pill while dragging a cutoff handle
    if (state.criteriaGraphDragId) {
      var dragCol = colsHit.find(function (col) { return col.id === state.criteriaGraphDragId; });
      if (dragCol) {
        var dDef = dragCol.def;
        var modeStr = dDef.mode === 'min' ? '≥ ' : '≤ ';
        var pillTxt = dDef.shortLabel + ' Cutoff: ' + modeStr + dDef.format(dragCol.thr);
        ctx.font = 'bold 10px Consolas, monospace';
        var tw = ctx.measureText(pillTxt).width + 14;
        var bx = clamp(dragCol.cx - tw / 2, padL + 2, w - tw - 4);
        var by = clamp(dragCol.thrY - 24, padT + 2, plotBot - 20);
        ctx.fillStyle = 'rgba(8, 18, 14, 0.92)';
        ctx.fillRect(bx, by, tw, 17);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx, by, tw, 17);
        ctx.fillStyle = '#e0f2fe';
        ctx.textAlign = 'left';
        ctx.fillText(pillTxt, bx + 7, by + 12);
      }
    }
  }

  function updateCriteriaReadouts(telemetry) {
    var defs = getSentryDefs();
    var activeCnt = 0;
    var passCnt = 0;

    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      var c = getCriterionCfg(d.id);
      var card = $('crit-card-' + d.id);
      var badge = $('crit-badge-' + d.id);
      var pz = $('crit-passzone-' + d.id);
      var vb = $('crit-valbar-' + d.id);
      var pp = $('crit-peakpin-' + d.id);
      var tp = $('crit-thrpin-' + d.id);
      var vp = $('crit-valpin-' + d.id);
      var vTxt = $('crit-valtxt-' + d.id);
      var pTxt = $('crit-peaktxt-' + d.id);
      var tTxt = $('crit-thrtxt-' + d.id);
      var wLbl = $('crit-wtlbl-' + d.id);

      var span = Math.max(1e-6, d.max - d.min);
      var thrPct = clamp(((c.threshold - d.min) / span) * 100, 0, 100);
      if (tp) tp.style.left = thrPct.toFixed(1) + '%';
      if (pz) {
        if (d.mode === 'min') {
          pz.style.left = thrPct.toFixed(1) + '%';
          pz.style.width = (100 - thrPct).toFixed(1) + '%';
        } else {
          pz.style.left = '0%';
          pz.style.width = thrPct.toFixed(1) + '%';
        }
      }
      if (tTxt) tTxt.textContent = 'Cut: ' + (d.mode === 'min' ? '≥' : '≤') + d.format(c.threshold);
      if (wLbl) wLbl.textContent = 'Wt: ' + safeNum(c.weight, 0).toFixed(1) + 'x';

      var val = telemetry && telemetry.metrics ? telemetry.metrics[d.id] : null;
      var hasVal = typeof val === 'number' && Number.isFinite(val);
      if (hasVal) {
        var prevPk = state.criteriaPeaks[d.id];
        state.criteriaPeaks[d.id] = typeof prevPk === 'number' && Number.isFinite(prevPk) ? Math.max(prevPk, val) : val;
      }
      var peakVal = typeof state.criteriaPeaks[d.id] === 'number' && Number.isFinite(state.criteriaPeaks[d.id])
        ? state.criteriaPeaks[d.id]
        : val;
      var passed = hasVal ? (d.mode === 'min' ? val >= c.threshold : val <= c.threshold) : null;

      if (hasVal) {
        var valPct = clamp(((val - d.min) / span) * 100, 0, 100);
        if (vb) vb.style.width = valPct.toFixed(1) + '%';
        if (vp) vp.style.left = valPct.toFixed(1) + '%';
        if (vTxt) vTxt.textContent = 'Val: ' + d.format(val);
      } else {
        if (vb) vb.style.width = '0%';
        if (vp) vp.style.left = '0%';
        if (vTxt) vTxt.textContent = 'Val: —';
      }

      if (typeof peakVal === 'number' && Number.isFinite(peakVal)) {
        var peakPct = clamp(((peakVal - d.min) / span) * 100, 0, 100);
        if (pp) {
          pp.style.left = peakPct.toFixed(1) + '%';
          pp.style.display = 'block';
        }
        if (pTxt) pTxt.textContent = 'Pk: ' + d.format(peakVal);
      } else {
        if (pp) pp.style.display = 'none';
        if (pTxt) pTxt.textContent = 'Pk: —';
      }

      if (c.enabled && c.weight > 0) activeCnt++;
      if (c.enabled && c.weight > 0 && passed) passCnt++;

      if (card) {
        card.classList.toggle('is-disabled', !c.enabled || c.weight <= 0);
        card.classList.toggle('is-pass', Boolean(c.enabled && hasVal && passed));
        card.classList.toggle('is-fail', Boolean(c.enabled && hasVal && !passed));
      }
      if (badge) {
        if (!c.enabled || c.weight <= 0) {
          badge.textContent = 'OFF';
          badge.className = 'tl-crit-badge off';
        } else if (!hasVal) {
          badge.textContent = 'WAIT';
          badge.className = 'tl-crit-badge off';
        } else if (passed) {
          badge.textContent = 'PASS';
          badge.className = 'tl-crit-badge pass';
        } else {
          badge.textContent = 'FAIL';
          badge.className = 'tl-crit-badge fail';
        }
      }
    }

    var pillEl = $('lbl-criteria-passing');
    if (pillEl) {
      pillEl.textContent = passCnt + ' / ' + activeCnt + ' Active Passing';
    }
    drawCriteriaProfileGraph(telemetry);
  }

  /* ==================== DECK & EVALUATION REFRESH ==================== */
  function evaluateAndUpdateDeckMeters() {
    var active = getActiveSpecimen();
    var tel = null;
    if ((state.liveMonitorActive || state.isManualRecording) && state.windowTelemetry) {
      tel = state.windowTelemetry;
    } else if ((state.scrub && (state.scrub.getState().scrubbing || state.scrub.getState().playing)) && state.windowTelemetry) {
      tel = state.windowTelemetry;
    } else if (active && active.telemetry) {
      tel = active.telemetry;
    }

    var isFastLive = Boolean(tel && tel.isFastLive);
    var evalRes = tel ? TootTestLab.DetectorLab.evaluateTelemetry(tel, state.config, state.bgProfile) : null;
    state.liveEvalResult = evalRes;

    if (evalRes) {
      state.detectTargetScore = evalRes.detectScore;
      if (!isFastLive && evalRes.authenticityScore != null) {
        state.authTargetScore = evalRes.authenticityScore;
      }
    } else {
      state.detectTargetScore = 0;
      state.authTargetScore = 50;
    }
    state.metersDirty = true;

    var led = $('detect-status-led');
    var vLine = $('detect-verdict-line');
    var aLed = $('auth-status-led');
    var aLine = $('auth-verdict-line');

    if (evalRes) {
      if (led) {
        led.textContent = evalRes.detected ? 'DETECTED' : 'REJECTED';
        led.className = 'tl-status-led ' + (evalRes.detected ? 'is-pass' : 'is-fail');
      }
      if (vLine) {
        vLine.textContent = evalRes.verdictReason;
        vLine.title = evalRes.verdictReason;
      }

      if (!isFastLive) {
        var authEval = evalRes.authEval || TootTestLab.DetectorLab.evaluateAuthenticity(tel, state.config);
        var isRealOrg = authEval && authEval.isRealOrganic !== null ? authEval.isRealOrganic : (evalRes.authenticityScore >= 50);
        if (aLed) {
          aLed.textContent = isRealOrg ? 'ORGANIC' : 'DECOY';
          aLed.className = 'tl-status-led ' + (isRealOrg ? 'is-pass' : 'is-warn');
        }
        if (aLine) {
          var authTxt = (authEval && authEval.verdictReason)
            ? authEval.verdictReason
            : (evalRes.authenticityScore + '% Real Organic');
          aLine.textContent = authTxt;
          aLine.title = authTxt;
        }
      }
    } else {
      if (led) {
        led.textContent = (state.liveMonitorActive || state.isManualRecording) ? 'LISTENING' : 'STANDBY';
        led.className = 'tl-status-led is-idle';
      }
      if (vLine) {
        var standbyTxt = (state.liveMonitorActive || state.isManualRecording)
          ? 'Capturing live audio — make a fart or decoy sound...'
          : 'Load or record a specimen.';
        vLine.textContent = standbyTxt;
        vLine.title = standbyTxt;
      }
      if (aLed) {
        aLed.textContent = 'ORIGIN';
        aLed.className = 'tl-status-led is-idle';
      }
      if (aLine) {
        aLine.textContent = 'Mouth Decoy vs. Real Organic likelihood.';
        aLine.title = aLine.textContent;
      }
    }

    var natEl = $('native-sentry-verdict');
    if (natEl) {
      if (tel && tel.nativeSentry) {
        natEl.textContent =
          'Sentry v3: ' +
          (tel.nativeSentry.matched ? '✓ ' : '✕ ') +
          tel.nativeSentry.message +
          (tel.nativeSentry.path ? ' [' + tel.nativeSentry.path + ']' : '');
      } else if (isFastLive) {
        natEl.textContent = 'Live Sentry: ~' + state.lastLiveTickMs.toFixed(1) + ' ms tick';
      } else {
        natEl.textContent = 'Sentry v3: —';
      }
    }

    updateCriteriaReadouts(tel);
    drawLiveSpectrumCanvas(tel);
    if (!isFastLive) {
      updateAuthCriteriaUi(tel);
    }
  }

  async function loadSpecimenOnDeck(itemId) {
    var item = state.byId[itemId];
    if (!item) return;
    state.activeId = itemId;
    state.windowTelemetry = null;
    state.playbackSpectrumBins = null;
    if (state.scrub) state.scrub.pause();

    renderBankList();
    var titleEl = $('deck-specimen-title');
    if (titleEl) titleEl.textContent = item.name;

    var lblPill = $('deck-label-pill');
    if (lblPill) {
      lblPill.textContent = formatLabelDisplay(item.label);
      lblPill.className = 'tl-pill tl-pill-' + item.label;
    }

    updateDeleteSelectedButton();

    try {
      await ensureDecoded(item);
      if (state.activeId !== itemId) return;

      var activeSamples = item.clippedSamples || item.rawSamples;
      if (state.scrub && activeSamples && activeSamples.length > 0) {
        state.scrub.loadBuffer(activeSamples, item.sampleRate || 44100);
      }

      var clsPill = $('deck-dsp-class-pill');
      if (clsPill) {
        clsPill.textContent = item.telemetry && item.telemetry.dspClass ? item.telemetry.dspClass.badgeFull : 'Decoded';
        clsPill.className = 'tl-pill tl-pill-dark';
      }

      var wInfo = $('lbl-wave-info');
      if (wInfo && item.telemetry) {
        wInfo.textContent =
          ((item.sampleRate || 44100) / 1000).toFixed(1) +
          ' kHz · ' +
          item.telemetry.durationSec.toFixed(2) +
          's · Dom ' +
          (item.telemetry.dominantPeakHz ? Math.round(item.telemetry.dominantPeakHz) + ' Hz' : '—');
      }

      renderBankList();
      evaluateAndUpdateDeckMeters();
      drawScrubWaveform();
      drawSpeedJogWheel();
    } catch (err) {
      showToast('Decode failed: ' + (err && err.message ? err.message : err), true);
    }
  }

  /* ==================== FART AUTOPSY (SIDE-BY-SIDE VISUALS + METRIC DIFF) ==================== */
  async function ensureGroupDecoded(slotId) {
    var targets = [];
    if (slotId === GROUP_REAL_ID) {
      var checkedReals = state.specimens.filter(function (x) { return state.selectedIds[x.id] && x.label === 'real'; });
      targets = checkedReals.length > 0 ? checkedReals : state.specimens.filter(function (x) { return x.label === 'real'; }).slice(0, 12);
    } else if (slotId === GROUP_DECOY_ID) {
      targets = state.specimens.filter(function (x) { return x.label === 'fake'; });
    } else if (slotId === GROUP_REC_REAL_ID) {
      targets = state.specimens.filter(function (x) { return isDeletableSpecimen(x) && x.label === 'real'; });
    }
    var pending = targets.filter(function (x) { return !x.decoded || !x.telemetry; });
    for (var i = 0; i < pending.length; i++) {
      try { await ensureDecoded(pending[i]); } catch (e) {}
    }
  }

  async function setAutopsySlots(nextAId, nextBId) {
    if (nextAId && (isGroupSlotId(nextAId) || state.byId[nextAId])) state.autopsyAId = nextAId;
    if (nextBId && (isGroupSlotId(nextBId) || state.byId[nextBId])) state.autopsyBId = nextBId;

    var selA = $('sel-autopsy-a');
    var selB = $('sel-autopsy-b');
    if (selA && state.autopsyAId) selA.value = state.autopsyAId;
    if (selB && state.autopsyBId) selB.value = state.autopsyBId;
    syncAutopsyModePills();
    renderBankList();

    try {
      await Promise.all([
        isGroupSlotId(state.autopsyAId)
          ? ensureGroupDecoded(state.autopsyAId)
          : (state.byId[state.autopsyAId] && !state.byId[state.autopsyAId].decoded ? ensureDecoded(state.byId[state.autopsyAId]) : Promise.resolve()),
        isGroupSlotId(state.autopsyBId)
          ? ensureGroupDecoded(state.autopsyBId)
          : (state.byId[state.autopsyBId] && !state.byId[state.autopsyBId].decoded ? ensureDecoded(state.byId[state.autopsyBId]) : Promise.resolve())
      ]);
    } catch (err) {
      showToast('Autopsy decode failed: ' + (err && err.message ? err.message : err), true);
    }

    renderAutopsyView();
  }

  function formatAutopsyMeta(item, evalRes) {
    if (!item || !item.telemetry) return 'Not decoded yet';
    var t = item.telemetry;
    if (item.isGroup) {
      var passStr = typeof item.detectedCount === 'number'
        ? item.detectedCount + '/' + item.groupCount + ' Pass Gate'
        : (evalRes ? (evalRes.detected ? 'AVG PASS ' : 'AVG REJECT ') + evalRes.detectScore + '%' : '');
      return formatLabelDisplay(item.label) + ' GROUP (' + item.groupCount + ' clips) · Med ' + t.durationSec.toFixed(2) + 's · Peak ' + Math.round(t.dominantPeakHz || 0) + ' Hz' + (passStr ? ' · ' + passStr : '');
    }
    var cls = t.dspClass ? t.dspClass.badgeShort : 'Decoded';
    var sc = evalRes ? (evalRes.detected ? 'DETECTED ' : 'REJECTED ') + evalRes.detectScore + '%' : '';
    return formatLabelDisplay(item.label) + ' · ' + t.durationSec.toFixed(2) + 's · ' + cls + (sc ? ' · ' + sc : '');
  }

  function syncAutopsyGroupOptionCounts() {
    var realCnt = state.specimens.filter(function (x) { return x.label === 'real'; }).length;
    var decoyCnt = state.specimens.filter(function (x) { return x.label === 'fake'; }).length;
    var recRealCnt = state.specimens.filter(function (x) { return isDeletableSpecimen(x) && x.label === 'real'; }).length;
    ['sel-autopsy-a', 'sel-autopsy-b'].forEach(function (selId) {
      var sel = $(selId);
      if (!sel) return;
      var oR = sel.querySelector('option[value="' + GROUP_REAL_ID + '"]');
      var oD = sel.querySelector('option[value="' + GROUP_DECOY_ID + '"]');
      var oRR = sel.querySelector('option[value="' + GROUP_REC_REAL_ID + '"]');
      if (oR) oR.textContent = '[GROUP] Selected / All Real Farts Avg (' + realCnt + ')';
      if (oD) oD.textContent = '[GROUP] My Decoys Avg (' + decoyCnt + ')';
      if (oRR) oRR.textContent = '[GROUP] My Recorded Real Farts Avg (' + recRealCnt + ')';
    });
  }

  function renderAutopsyView() {
    var itemA = resolveAutopsyOperand(state.autopsyAId);
    var itemB = resolveAutopsyOperand(state.autopsyBId);
    var diff = TootTestLab.DetectorLab.computeAutopsyDiff(itemA, itemB, state.config);
    state.lastAutopsyDiff = diff;
    syncAutopsyGroupOptionCounts();
    syncAutopsyModePills();

    var thA = $('th-autopsy-a');
    var thB = $('th-autopsy-b');
    if (thA) thA.textContent = itemA ? itemA.name : 'Specimen A';
    if (thB) thB.textContent = itemB ? itemB.name : 'Specimen B';

    var metaA = $('autopsy-meta-a');
    var metaB = $('autopsy-meta-b');
    if (metaA) {
      metaA.textContent = itemA
        ? formatAutopsyMeta(itemA, diff.evalA)
        : (state.autopsyAId === GROUP_REC_REAL_ID ? 'No user-recorded real farts analyzed yet.' : 'No Real specimen decoded yet.');
    }
    if (metaB) {
      metaB.textContent = itemB
        ? formatAutopsyMeta(itemB, diff.evalB)
        : (state.autopsyBId === GROUP_DECOY_ID ? 'No Decoy clips yet — click Record Decoy or tag any clip as DECOY.' : 'Not decoded yet.');
    }

    var findEl = $('autopsy-findings');
    if (findEl) {
      var samePair = isAutopsyIdentical(itemA, itemB, diff);
      if (samePair) {
        var isExactId = Boolean(itemA && itemB && !itemA.isGroup && !itemB.isGroup && itemA.id === itemB.id);
        findEl.innerHTML =
          '<div class="tl-finding-pill is-identical">' +
          '  <div class="tl-finding-copy">' +
          '    <strong>0.0% Acoustic Difference · ' +
          (isExactId ? 'Identical Clip in Slot A &amp; Slot B' : 'Acoustic Twin Pair') +
          '</strong>' +
          '    <span>Both slots hold "' +
          esc(itemA ? itemA.name : 'Specimen') +
          '". Dashed orange B sits directly over green A across all scopes.</span>' +
          '  </div>' +
          '  <button type="button" id="btn-autopsy-pick-distinct" class="tl-btn tl-btn-xs tl-btn-b">Pick Different Clip for B</button>' +
          '</div>';
      } else if (!diff.ready || diff.topDifferences.length === 0) {
        if (state.autopsyBId === GROUP_DECOY_ID && !itemB) {
          findEl.innerHTML = '<div class="tl-finding-pill"><strong>No Decoys in Bank Yet</strong><span>Click "🎙️ Record Decoy → B" or click any clip tag chip to mark it DECOY to compare your Real Fart(s) vs. My Decoys.</span></div>';
        } else {
          findEl.innerHTML = '<div class="tl-finding-pill">Select two distinct clips or groups in Slots A and B to dissect their acoustic &amp; timing differences.</div>';
        }
      } else {
        findEl.innerHTML = diff.topDifferences
          .map(function (f, idx) {
            return (
              '<div class="tl-finding-pill">' +
              '  <strong>#' + (idx + 1) + ' ' + esc(f.headline) + '</strong>' +
              '  <span>' + esc(f.detail) + '</span>' +
              '</div>'
            );
          })
          .join('');
      }
    }

    var tbody = $('autopsy-diff-tbody');
    if (tbody) {
      if (!diff.ready) {
        tbody.innerHTML = '<tr><td colspan="5">Waiting for both Specimen A and Specimen B (or Groups) to have decoded clips...</td></tr>';
      } else {
        tbody.innerHTML = diff.rows
          .map(function (r) {
            var clsA = r.passA === true ? 'pass' : r.passA === false ? 'fail' : 'neutral';
            var clsB = r.passB === true ? 'pass' : r.passB === false ? 'fail' : 'neutral';
            var pctW = clamp(Math.abs(r.normDiff) * 50, 0, 50);
            var barStyle = r.normDiff >= 0
              ? 'left:50%;width:' + pctW.toFixed(1) + '%;'
              : 'left:' + (50 - pctW).toFixed(1) + '%;width:' + pctW.toFixed(1) + '%;';
            var barCls = r.normDiff >= 0 ? 'is-b' : 'is-a';
            var topBadge = r.isTopDiff ? ' <span class="tl-top-diff-tag">★ KEY DIFF</span>' : '';
            var rangeAHtml = r.rangeA ? '<span class="tl-range-sub">P10–90: ' + esc(r.rangeA) + '</span>' : '';
            var rangeBHtml = r.rangeB ? '<span class="tl-range-sub">P10–90: ' + esc(r.rangeB) + '</span>' : '';
            return (
              '<tr>' +
              '  <td>' + esc(r.label) + topBadge + '</td>' +
              '  <td><span class="tl-val-badge ' + clsA + '">' + esc(r.fmtA) + '</span>' + rangeAHtml + '</td>' +
              '  <td><div class="tl-diff-bar-wrap"><div class="tl-diff-midline"></div><div class="tl-diff-fill ' + barCls + '" style="' + barStyle + '"></div></div></td>' +
              '  <td><span class="tl-val-badge ' + clsB + '">' + esc(r.fmtB) + '</span>' + rangeBHtml + '</td>' +
              '  <td>' + esc(r.callout) + '</td>' +
              '</tr>'
            );
          })
          .join('');
      }
    }

    drawAutopsyEnvCanvas(itemA, itemB);
    drawAutopsySpectrogramCanvas($('canvas-autopsy-spec-a'), itemA, 'A', '#34d399');
    drawAutopsySpectrogramCanvas($('canvas-autopsy-spec-b'), itemB, 'B', '#fb923c');
    drawAutopsyFftDiffCanvas(itemA, itemB, diff);
    drawAutopsyPitchModCanvas(itemA, itemB);
  }

  function setupHiDpiCanvas(canvas) {
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.max(120, Math.round(rect.width || canvas.width));
    var cssH = Math.max(48, Math.round(rect.height || canvas.height));
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: cssW, h: cssH };
  }

  function drawAutopsyEnvCanvas(itemA, itemB) {
    var canvas = $('canvas-autopsy-env');
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#0a1411';
    ctx.fillRect(0, 0, w, h);

    var envA = itemA && itemA.telemetry && itemA.telemetry.autopsy ? itemA.telemetry.autopsy.envelope : [];
    var envB = itemB && itemB.telemetry && itemB.telemetry.autopsy ? itemB.telemetry.autopsy.envelope : [];

    var durA = itemA && itemA.telemetry ? itemA.telemetry.durationSec : 1;
    var durB = itemB && itemB.telemetry ? itemB.telemetry.durationSec : 1;
    var maxDur = state.autopsyNormTime ? 1 : Math.max(0.1, durA, durB);

    function drawMiniTrack(item, dur, cy, ampH, color, tag) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      var spanW = state.autopsyNormTime ? w : (dur / maxDur) * w;
      var arr = item && !item.isGroup ? (item.clippedSamples || item.rawSamples) : null;
      var env = item && item.telemetry && item.telemetry.autopsy ? item.telemetry.autopsy.envelope : null;
      var envP90 = item && item.telemetry && item.telemetry.autopsy ? item.telemetry.autopsy.envelopeP90 : null;

      if (arr && arr.length > 0) {
        var bars = Math.max(40, Math.floor(spanW / 3));
        var pkAll = 0.01;
        for (var s = 0; s < arr.length; s += Math.max(1, Math.floor(arr.length / 800))) {
          var av = Math.abs(arr[s]);
          if (av > pkAll) pkAll = av;
        }
        ctx.fillStyle = color;
        for (var b = 0; b < bars; b++) {
          var i0 = Math.floor((b / bars) * arr.length);
          var i1 = Math.min(arr.length, Math.max(i0 + 1, Math.floor(((b + 1) / bars) * arr.length)));
          var pk = 0;
          for (var i = i0; i < i1; i++) {
            var v = Math.abs(arr[i]);
            if (v > pk) pk = v;
          }
          var bh = Math.max(1, (pk / pkAll) * ampH * 0.85);
          ctx.fillRect((b / bars) * spanW, cy - bh, Math.max(1.2, spanW / bars - 0.8), bh * 2);
        }
      } else if (env && env.length > 1) {
        if (envP90 && envP90.length === env.length) {
          ctx.fillStyle = color === '#34d399' ? 'rgba(52, 211, 153, 0.22)' : 'rgba(251, 146, 60, 0.22)';
          ctx.beginPath();
          for (var i2 = 0; i2 < env.length; i2++) {
            var gx0 = (i2 / (env.length - 1)) * spanW;
            var gyTop = cy - clamp(envP90[i2], 0, 1) * ampH * 0.88;
            if (i2 === 0) ctx.moveTo(gx0, gyTop);
            else ctx.lineTo(gx0, gyTop);
          }
          for (var i3 = env.length - 1; i3 >= 0; i3--) {
            var gx1 = (i3 / (env.length - 1)) * spanW;
            var gyBot = cy + clamp(envP90[i3], 0, 1) * ampH * 0.88;
            ctx.lineTo(gx1, gyBot);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = color === '#34d399' ? 'rgba(52, 211, 153, 0.48)' : 'rgba(251, 146, 60, 0.48)';
        ctx.beginPath();
        for (var m0 = 0; m0 < env.length; m0++) {
          var mx0 = (m0 / (env.length - 1)) * spanW;
          var myTop = cy - clamp(env[m0], 0, 1) * ampH * 0.84;
          if (m0 === 0) ctx.moveTo(mx0, myTop);
          else ctx.lineTo(mx0, myTop);
        }
        for (var m1 = env.length - 1; m1 >= 0; m1--) {
          var mx1 = (m1 / (env.length - 1)) * spanW;
          var myBot = cy + clamp(env[m1], 0, 1) * ampH * 0.84;
          ctx.lineTo(mx1, myBot);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.font = 'bold 9px Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(tag, 5, cy - ampH + 9);
    }

    drawMiniTrack(itemA, durA, h * 0.19, h * 0.15, '#34d399', 'A: ' + (itemA ? itemA.name : '—'));
    drawMiniTrack(itemB, durB, h * 0.50, h * 0.15, '#fb923c', 'B: ' + (itemB ? itemB.name : '—'));

    // Overlaid smoothed pressure envelopes (+ P10-P90 group spread band) at bottom
    var envTop = h * 0.69;
    var envBot = h - 10;
    var envH = Math.max(20, envBot - envTop);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(0, envTop, w, envH);
    ctx.fillStyle = '#c8ead8';
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.fillText(state.autopsyNormTime ? 'OVERLAID ENVELOPES (0–100%)' : 'OVERLAID ENVELOPES (0–' + maxDur.toFixed(2) + 's)', 5, envTop + 10);

    function strokeEnvSpread(p10, p90, dur, fillCol) {
      if (!p10 || !p90 || p10.length < 2 || p10.length !== p90.length) return;
      var spanW = state.autopsyNormTime ? w : (dur / maxDur) * w;
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      for (var i = 0; i < p90.length; i++) {
        var x = (i / (p90.length - 1)) * spanW;
        var y = envBot - clamp(p90[i], 0, 1) * (envH - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (var j = p10.length - 1; j >= 0; j--) {
        var x2 = (j / (p10.length - 1)) * spanW;
        var y2 = envBot - clamp(p10[j], 0, 1) * (envH - 6);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.fill();
    }

    function strokeEnv(env, dur, col, dashed) {
      if (!env || env.length < 2) return;
      var maxV = 0.01;
      for (var k = 0; k < env.length; k++) if (env[k] > maxV) maxV = env[k];
      var spanW = state.autopsyNormTime ? w : (dur / maxDur) * w;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.beginPath();
      for (var i = 0; i < env.length; i++) {
        var x = (i / (env.length - 1)) * spanW;
        var y = envBot - (clamp(env[i] / maxV, 0, 1)) * (envH - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    var identical = isAutopsyIdentical(itemA, itemB, state.lastAutopsyDiff);
    if (itemA && itemA.telemetry && itemA.telemetry.autopsy) {
      strokeEnvSpread(itemA.telemetry.autopsy.envelopeP10, itemA.telemetry.autopsy.envelopeP90, durA, 'rgba(52, 211, 153, 0.16)');
    }
    if (itemB && itemB.telemetry && itemB.telemetry.autopsy) {
      strokeEnvSpread(itemB.telemetry.autopsy.envelopeP10, itemB.telemetry.autopsy.envelopeP90, durB, 'rgba(251, 146, 60, 0.16)');
    }
    strokeEnv(envA, durA, '#34d399', false);
    strokeEnv(envB, durB, '#fb923c', identical);
  }

  function heatColor(val01) {
    var v = clamp(val01, 0, 1);
    if (v < 0.25) {
      var t = v / 0.25;
      return 'rgb(' + Math.round(10 + t * 20) + ',' + Math.round(20 + t * 45) + ',' + Math.round(24 + t * 80) + ')';
    } else if (v < 0.6) {
      var t2 = (v - 0.25) / 0.35;
      return 'rgb(' + Math.round(30 + t2 * 160) + ',' + Math.round(65 + t2 * 110) + ',' + Math.round(104 - t2 * 70) + ')';
    }
    var t3 = (v - 0.6) / 0.4;
    return 'rgb(' + Math.round(190 + t3 * 65) + ',' + Math.round(175 + t3 * 72) + ',' + Math.round(34 + t3 * 86) + ')';
  }

  function drawAutopsySpectrogramCanvas(canvas, item, slotLbl, accentColor) {
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#09110e';
    ctx.fillRect(0, 0, w, h);

    var spec = item && item.telemetry && item.telemetry.autopsy ? item.telemetry.autopsy.spectrogram : null;
    var rollHz = item && item.telemetry && item.telemetry.metrics ? item.telemetry.metrics.rolloff85Max : null;
    var nF = spec ? Number(spec.frames || 0) : 0;
    var nB = spec ? Number(spec.freqBands || spec.bands || 0) : 0;
    if (!spec || !spec.grid || !nF || !nB) {
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 10px Consolas, monospace';
      ctx.fillText(slotLbl + ': No spectrogram telemetry', 8, h / 2);
      return;
    }

    var cacheKey = (item && item.id ? item.id : slotLbl) + '|' + nF + 'x' + nB + '|' + (item && item.groupCount ? item.groupCount : 1);
    var cachedCanvas = state.specBitmapCache[cacheKey];
    if (!cachedCanvas && root.document) {
      cachedCanvas = root.document.createElement('canvas');
      cachedCanvas.width = nF;
      cachedCanvas.height = nB;
      var oCtx = cachedCanvas.getContext('2d');
      for (var f = 0; f < nF; f++) {
        var rowOff = f * nB;
        for (var b = 0; b < nB; b++) {
          var v = clamp(safeNum(spec.grid[rowOff + b], 0), 0, 1);
          oCtx.fillStyle = heatColor(v);
          oCtx.fillRect(f, nB - 1 - b, 1, 1);
        }
      }
      state.specBitmapCache[cacheKey] = cachedCanvas;
      state.specBitmapCacheOrder.push(cacheKey);
      if (state.specBitmapCacheOrder.length > 24) {
        var oldKey = state.specBitmapCacheOrder.shift();
        if (oldKey && oldKey !== cacheKey) delete state.specBitmapCache[oldKey];
      }
    }
    if (cachedCanvas) {
      var prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cachedCanvas, 0, 0, w, h);
      ctx.imageSmoothingEnabled = prevSmooth;
    }

    var fMin = 45;
    var fMax = 4200;
    var hzToY = function (hz) {
      var fVal = clamp(hz, fMin, fMax);
      return h - (Math.log(fVal / fMin) / Math.log(fMax / fMin)) * h;
    };

    // Frequency landmark guides
    ctx.setLineDash([3, 3]);
    ctx.font = 'bold 8px Consolas, monospace';
    ctx.textAlign = 'right';
    [
      { hz: 350, lbl: '350', col: 'rgba(255,255,255,0.28)' },
      { hz: 750, lbl: '750', col: 'rgba(255,255,255,0.34)' },
      { hz: 2000, lbl: '2k Air', col: 'rgba(56,189,248,0.45)' }
    ].forEach(function (g) {
      var y = hzToY(g.hz);
      ctx.strokeStyle = g.col;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillStyle = '#d1fae5';
      ctx.fillText(g.lbl, w - 4, clamp(y - 2, 9, h - 3));
    });

    if (typeof rollHz === 'number' && rollHz > 0) {
      var ry = hzToY(rollHz);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(w, ry);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(10, 20, 17, 0.78)';
    ctx.fillRect(4, 3, 190, 14);
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      slotLbl + ': ' + (item.name || '').slice(0, 18) + (rollHz ? ' · Roll ' + Math.round(rollHz) + 'Hz' : ''),
      7,
      13
    );
  }

  function drawAutopsyFftDiffCanvas(itemA, itemB, diff) {
    var canvas = $('canvas-autopsy-fft-diff');
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#0a1411';
    ctx.fillRect(0, 0, w, h);

    var topH = h * 0.54;
    var divBase = h * 0.76;
    var divAmp = h * 0.20;

    // Band guides
    var fMin = 40;
    var fMax = 6000;
    var freqToX = function (hz) {
      return (Math.log(clamp(hz, fMin, fMax) / fMin) / Math.log(fMax / fMin)) * w;
    };
    ctx.fillStyle = 'rgba(239,68,68,0.1)';
    ctx.fillRect(0, 0, freqToX(55), topH);
    ctx.fillStyle = 'rgba(34,197,94,0.08)';
    ctx.fillRect(freqToX(55), 0, freqToX(750) - freqToX(55), topH);
    ctx.fillStyle = 'rgba(245,158,11,0.08)';
    ctx.fillRect(freqToX(750), 0, freqToX(2600) - freqToX(750), topH);

    function strokeSpreadBand(p10, p90, fillCol) {
      if (!p10 || !p90 || p10.length < 2 || p10.length !== p90.length) return;
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      for (var i = 0; i < p90.length; i++) {
        var x = (i / (p90.length - 1)) * w;
        var y = topH - 4 - clamp(p90[i], 0, 1) * (topH - 12);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (var j = p10.length - 1; j >= 0; j--) {
        var x2 = (j / (p10.length - 1)) * w;
        var y2 = topH - 4 - clamp(p10[j], 0, 1) * (topH - 12);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.fill();
    }

    function strokeSpec(bins, col, dashed) {
      if (!bins || !bins.length) return;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.beginPath();
      for (var i = 0; i < bins.length; i++) {
        var x = (i / (bins.length - 1)) * w;
        var y = topH - 4 - clamp(bins[i], 0, 1) * (topH - 12);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    var identical = isAutopsyIdentical(itemA, itemB, diff);
    if (itemA && itemA.telemetry && itemA.telemetry.spectrumP10 && itemA.telemetry.spectrumP90) {
      strokeSpreadBand(itemA.telemetry.spectrumP10, itemA.telemetry.spectrumP90, 'rgba(52, 211, 153, 0.16)');
    }
    if (itemB && itemB.telemetry && itemB.telemetry.spectrumP10 && itemB.telemetry.spectrumP90) {
      strokeSpreadBand(itemB.telemetry.spectrumP10, itemB.telemetry.spectrumP90, 'rgba(251, 146, 60, 0.16)');
    }
    var binsA = itemA && itemA.telemetry ? itemA.telemetry.spectrumBins : null;
    var binsB = itemB && itemB.telemetry ? itemB.telemetry.spectrumBins : null;
    strokeSpec(binsA, '#34d399', false);
    strokeSpec(binsB, '#fb923c', identical);

    // Diverging B - A delta bars
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, divBase);
    ctx.lineTo(w, divBase);
    ctx.stroke();

    var delta = diff && diff.spectrumDelta ? diff.spectrumDelta : null;
    if (delta) {
      var bw = w / delta.length;
      for (var k = 0; k < delta.length; k++) {
        var d = delta[k];
        var bh = Math.abs(d) * divAmp;
        var bx = (k / delta.length) * w;
        ctx.fillStyle = d >= 0 ? '#fb923c' : '#34d399';
        if (d >= 0) ctx.fillRect(bx + 1, divBase - bh, Math.max(1.5, bw - 2), bh);
        else ctx.fillRect(bx + 1, divBase, Math.max(1.5, bw - 2), bh);
      }
    }

    ctx.fillStyle = '#9fe2c4';
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'center';
    [55, 150, 350, 750, 1500, 3000, 5000].forEach(function (hz) {
      ctx.fillText(hz >= 1000 ? (hz / 1000).toFixed(1) + 'k' : String(hz), freqToX(hz), h - 4);
    });
  }

  function drawAutopsyPitchModCanvas(itemA, itemB) {
    var canvas = $('canvas-autopsy-pitch-mod');
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#0a1411';
    ctx.fillRect(0, 0, w, h);

    var midX = w * 0.50;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();

    // Left panel: F0 pitch contours (50-800 Hz)
    var pA = itemA && itemA.telemetry && itemA.telemetry.autopsy ? itemA.telemetry.autopsy.pitchHzArr : [];
    var pB = itemB && itemB.telemetry && itemB.telemetry.autopsy ? itemB.telemetry.autopsy.pitchHzArr : [];
    var fMin = 50;
    var fMax = 800;
    var padL = 8;
    var pw = midX - 16;
    var plotT = 18;
    var plotB = h - 18;
    var ph = Math.max(20, plotB - plotT);
    var hzToY = function (hz) {
      return plotB - (clamp((hz - fMin) / (fMax - fMin), 0, 1)) * ph;
    };

    ctx.fillStyle = '#bfe7d3';
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('F0 PITCH TRACK (50–800 Hz)', 6, 12);

    var identical = isAutopsyIdentical(itemA, itemB, state.lastAutopsyDiff);
    function drawPitchLine(arr, col, dashed) {
      if (!arr || arr.length === 0) return;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < arr.length; i++) {
        var hz = arr[i];
        if (hz > 25) {
          var x = padL + (i / Math.max(1, arr.length - 1)) * pw;
          var y = hzToY(hz);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
          ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        } else {
          started = false;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawPitchLine(pA, '#34d399', false);
    drawPitchLine(pB, '#fb923c', identical);

    // Right panel: Modulation spectrum 4-45 Hz + 22-42 Hz Lip-Trill shaded band
    var rx0 = midX + 8;
    var rw = w - rx0 - 8;
    var lipX0 = rx0 + ((22 - 4) / (45 - 4)) * rw;
    var lipX1 = rx0 + ((42 - 4) / (45 - 4)) * rw;
    ctx.fillStyle = 'rgba(251, 146, 60, 0.16)';
    ctx.fillRect(lipX0, plotT, lipX1 - lipX0, ph);
    ctx.fillStyle = '#fed7aa';
    ctx.fillText('MOD 4–45 Hz (22–42 Lip-Buzz)', rx0, 12);

    var mA = itemA && itemA.telemetry && itemA.telemetry.autopsy ? itemA.telemetry.autopsy.modSpectrum : [];
    var mB = itemB && itemB.telemetry && itemB.telemetry.autopsy ? itemB.telemetry.autopsy.modSpectrum : [];
    function strokeMod(arr, col, dashed) {
      if (!arr || arr.length < 2) return;
      var maxV = 0.01;
      for (var i = 0; i < arr.length; i++) if (arr[i] > maxV) maxV = arr[i];
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.beginPath();
      for (var j = 0; j < arr.length; j++) {
        var x = rx0 + (j / (arr.length - 1)) * rw;
        var y = plotB - clamp(arr[j] / maxV, 0, 1) * ph;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    strokeMod(mA, '#34d399', false);
    strokeMod(mB, '#fb923c', identical);

    ctx.fillStyle = '#9fe2c4';
    ctx.fillText('Time →', 6, h - 5);
    ctx.fillText('4 Hz', rx0, h - 5);
    ctx.fillText('22', lipX0 - 4, h - 5);
    ctx.fillText('42 Hz', lipX1 - 18, h - 5);
  }

  /* ==================== ANALOG METERS, VINYL PLATTER, WAVEFORM & SPECTRUM ==================== */
  function stepSpringMeter(anim, targetVal, dt) {
    anim.target = clamp(targetVal, 0, 100);
    var stiffness = 135;
    var damping = 18;
    var force = (anim.target - anim.current) * stiffness;
    anim.velocity += (force - anim.velocity * damping) * dt;
    anim.current = clamp(anim.current + anim.velocity * dt, 0, 100);
    if (anim.current > anim.peak) {
      anim.peak = anim.current;
    } else {
      anim.peak = Math.max(anim.current, anim.peak - 14 * dt);
    }
  }

  function drawAnalogPointerMeter(canvas, title, value, peakVal, thrVal, mode, statusOpts) {
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;
    var opts = statusOpts || {};

    ctx.clearRect(0, 0, w, h);

    var compact = w < 200 || h < 108;
    var pad = compact ? 3 : 4;
    ctx.fillStyle = '#fbf4df';
    ctx.strokeStyle = '#6c624d';
    ctx.lineWidth = compact ? 1.5 : 1.8;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, compact ? 6 : 7);
    else ctx.rect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.fill();
    ctx.stroke();

    var titleY = pad + (compact ? 8 : 10);
    ctx.fillStyle = '#252c27';
    ctx.font = (compact ? '800 7.2px' : '800 8.5px') + ' Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, titleY);

    var cx = w / 2;
    var footerH = compact ? 23 : 29;
    var cy = h - pad - footerH;
    var topLimit = pad + (compact ? 16 : 21);
    var sideMargin = compact ? 11 : 16;
    var r = Math.max(24, Math.min(cx - pad - sideMargin, cy - topLimit));

    // Classic 180-degree semicircle (left=0%, top=50%, right=100%)
    var aStart = Math.PI;
    var aSpan = Math.PI;
    var aEnd = aStart + aSpan;
    var valToAngle = function (v) {
      return aStart + (clamp(safeNum(v, 0), 0, 100) / 100) * aSpan;
    };

    // Subtle horizontal meter baseline at pivot height
    ctx.strokeStyle = '#dfd5bc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.94, cy);
    ctx.lineTo(cx + r * 0.94, cy);
    ctx.stroke();

    var thrClamped = clamp(safeNum(thrVal, 50), 0, 100);
    var thrA = valToAngle(thrClamped);
    var arcR = r * 0.89;
    ctx.lineWidth = compact ? 6 : 8;
    ctx.lineCap = 'butt';

    if (mode === 'detect') {
      var amberStart = Math.max(0, thrClamped - 12);
      var ambA = valToAngle(amberStart);
      if (amberStart > 0) {
        ctx.strokeStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, aStart, ambA);
        ctx.stroke();
      }
      if (thrClamped > amberStart) {
        ctx.strokeStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, ambA, thrA);
        ctx.stroke();
      }
      ctx.strokeStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, thrA, aEnd);
      ctx.stroke();
    } else {
      var authMidLow = Math.max(0, Math.min(thrClamped - 10, 42));
      var midA = valToAngle(authMidLow);
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, aStart, midA);
      ctx.stroke();

      ctx.strokeStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, midA, thrA);
      ctx.stroke();

      ctx.strokeStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, thrA, aEnd);
      ctx.stroke();
    }

    // Ticks & scale numerals (0, 20, 40, 60, 80, 100)
    ctx.fillStyle = '#1b201d';
    ctx.strokeStyle = '#252b27';
    ctx.font = (compact ? '700 7px' : '700 8.5px') + ' Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var labelR = r * (compact ? 0.59 : 0.61);
    for (var t = 0; t <= 100; t += 10) {
      var ang = valToAngle(t);
      var major = t % 20 === 0;
      var innerR = major ? r * 0.72 : r * 0.77;
      var outerTickR = r * 0.83;
      ctx.lineWidth = major ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR);
      ctx.lineTo(cx + Math.cos(ang) * outerTickR, cy + Math.sin(ang) * outerTickR);
      ctx.stroke();
      if (major) {
        var lx = cx + Math.cos(ang) * labelR;
        var ly = cy + Math.sin(ang) * labelR;
        if (t === 0 || t === 100) ly = cy - (compact ? 5 : 6);
        ctx.fillText(String(t), lx, ly);
      }
    }

    // Threshold / Pass Score notch + outer caret triangle at thrClamped
    ctx.strokeStyle = '#141917';
    ctx.lineWidth = compact ? 2 : 2.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(thrA) * (r * 0.81), cy + Math.sin(thrA) * (r * 0.81));
    ctx.lineTo(cx + Math.cos(thrA) * (r * 0.97), cy + Math.sin(thrA) * (r * 0.97));
    ctx.stroke();

    var tipR = r * 0.96;
    var baseR = r * 1.02;
    var perpX = -Math.sin(thrA);
    var perpY = Math.cos(thrA);
    var halfW = compact ? 2.6 : 3.2;
    ctx.fillStyle = '#141917';
    ctx.strokeStyle = '#fbf4df';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(thrA) * tipR, cy + Math.sin(thrA) * tipR);
    ctx.lineTo(cx + Math.cos(thrA) * baseR + perpX * halfW, cy + Math.sin(thrA) * baseR + perpY * halfW);
    ctx.lineTo(cx + Math.cos(thrA) * baseR - perpX * halfW, cy + Math.sin(thrA) * baseR - perpY * halfW);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle peak-hold rim pip only when peak exceeds live needle by > 1.5%
    var curVal = clamp(safeNum(value, 0), 0, 100);
    var pkVal = clamp(safeNum(peakVal, curVal), 0, 100);
    if (pkVal > curVal + 1.5) {
      var pkAng = valToAngle(pkVal);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = compact ? 1.8 : 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(pkAng) * (r * 0.83), cy + Math.sin(pkAng) * (r * 0.83));
      ctx.lineTo(cx + Math.cos(pkAng) * (r * 0.96), cy + Math.sin(pkAng) * (r * 0.96));
      ctx.stroke();
    }

    // Tapered crimson pointer needle strictly inside semicircle + pivot hub
    var vAng = valToAngle(curVal);
    var ndx = Math.cos(vAng);
    var ndy = Math.sin(vAng);
    var npx = -ndy;
    var npy = ndx;
    var nTail = compact ? 3 : 4;
    var nTip = r * 0.86;
    var nHw = compact ? 1.8 : 2.3;

    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - ndx * nTail + npx * nHw, cy - ndy * nTail + npy * nHw);
    ctx.lineTo(cx + ndx * nTip, cy + ndy * nTip);
    ctx.lineTo(cx - ndx * nTail - npx * nHw, cy - ndy * nTail - npy * nHw);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Full un-clipped metallic pivot hub
    var pivotR = compact ? 5 : 6.5;
    ctx.fillStyle = '#1e2420';
    ctx.beginPath();
    ctx.arc(cx, cy, pivotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, pivotR * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Clean needle-free digital footer row below pivot
    var footerY = cy + (compact ? 13.5 : 17.5);
    var numColor = '#141917';
    if (opts.hasEval) {
      if (mode === 'detect') numColor = opts.detected ? '#15803d' : '#b91c1c';
      else numColor = curVal >= thrClamped ? '#15803d' : '#b45309';
    }
    ctx.fillStyle = numColor;
    ctx.font = (compact ? '800 11.5px' : '800 14px') + ' Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(curVal) + '%', cx, footerY);

    ctx.font = (compact ? '700 6.8px' : '700 7.8px') + ' Consolas, monospace';
    var cornerPadX = pad + (compact ? 5 : 6);
    var cornerY = footerY + 0.5;
    if (mode === 'detect') {
      ctx.fillStyle = '#991b1b';
      ctx.textAlign = 'left';
      ctx.fillText(compact ? 'FAIL' : 'REJECT', cornerPadX, cornerY);

      ctx.textAlign = 'right';
      if (opts.bgRejected) {
        ctx.fillStyle = '#b91c1c';
        ctx.fillText('BG BLOCK', w - cornerPadX, cornerY);
      } else if (opts.authRejected) {
        ctx.fillStyle = '#c2410c';
        ctx.fillText(compact ? 'MOUTH!' : 'MOUTH BLOCK', w - cornerPadX, cornerY);
      } else if (opts.hardGateBlocked) {
        ctx.fillStyle = '#b91c1c';
        ctx.fillText(compact ? 'GATE!' : 'GATE BLOCK', w - cornerPadX, cornerY);
      } else {
        ctx.fillStyle = '#166534';
        ctx.fillText((compact ? '≥' : 'PASS ≥') + Math.round(thrClamped) + '%', w - cornerPadX, cornerY);
      }
    } else {
      ctx.fillStyle = '#b45309';
      ctx.textAlign = 'left';
      ctx.fillText('DECOY', cornerPadX, cornerY);

      ctx.fillStyle = '#166534';
      ctx.textAlign = 'right';
      ctx.fillText('REAL', w - cornerPadX, cornerY);
    }
  }

  function wheelRateToAngle(r) {
    var frac = (clamp(safeNum(r, 1.0), -2.0, 2.5) + 2.0) / 4.5;
    return (135 + frac * 270) * (Math.PI / 180);
  }

  function drawSpeedJogWheel() {
    var canvas = $('canvas-speed-wheel');
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;
    var st = state.scrub ? state.scrub.getState() : { normPos: 0, velocity: 0, rate: 1, durationSec: 0, currentSec: 0, playing: false, scrubbing: false };
    var sliderRate = $('rng-deck-rate') ? parseFloat($('rng-deck-rate').value) : st.rate;
    var curRate = Number.isFinite(sliderRate) ? sliderRate : (st.rate || 1.0);

    ctx.clearRect(0, 0, w, h);
    var cx = w / 2;
    var cy = h / 2;
    var outerR = Math.min(w, h) * 0.45;

    // Outer precision housing ring
    ctx.fillStyle = '#1d2823';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 6, 0, Math.PI * 2);
    ctx.fill();

    if (state.wheelMode === 'speed') {
      var aStart = wheelRateToAngle(-2.0);
      var aEnd = wheelRateToAngle(2.5);
      var aZero = wheelRateToAngle(0);
      var aCur = wheelRateToAngle(curRate);

      // Base speed track
      ctx.strokeStyle = '#31423a';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, outerR - 4, aStart, aEnd);
      ctx.stroke();

      // Active value arc from 0.0x to current speed
      ctx.strokeStyle = curRate < -0.05 ? '#fb923c' : curRate > 1.25 ? '#fbbf24' : '#34d399';
      ctx.lineWidth = 9;
      ctx.beginPath();
      if (aCur >= aZero) ctx.arc(cx, cy, outerR - 4, aZero, aCur);
      else ctx.arc(cx, cy, outerR - 4, aCur, aZero);
      ctx.stroke();

      // Speed detent tick marks & labels
      var ticks = [-2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
      ctx.font = '700 8px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var ti = 0; ti < ticks.length; ti++) {
        var tv = ticks[ti];
        var ta = wheelRateToAngle(tv);
        var isKey = tv === 0 || tv === 1 || tv === -1;
        ctx.strokeStyle = isKey ? '#fef3c7' : '#94a3b8';
        ctx.lineWidth = isKey ? 1.8 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ta) * (outerR - 12), cy + Math.sin(ta) * (outerR - 12));
        ctx.lineTo(cx + Math.cos(ta) * (outerR - 18), cy + Math.sin(ta) * (outerR - 18));
        ctx.stroke();
        if (tv === -2 || tv === -1 || tv === 0 || tv === 1 || tv === 2) {
          ctx.fillStyle = tv === 1 ? '#6ee7b7' : '#cbd5e1';
          ctx.fillText(tv === 0 ? '0' : (tv > 0 ? '+' : '') + tv + 'x', cx + Math.cos(ta) * (outerR - 27), cy + Math.sin(ta) * (outerR - 27));
        }
      }

      // Machined dark-aluminum inner knob
      var knobR = outerR * 0.54;
      var grad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, knobR);
      grad.addColorStop(0, '#364940');
      grad.addColorStop(1, '#131b17');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, knobR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotary indicator bar & dot on knob
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(aCur) * (knobR * 0.45), cy + Math.sin(aCur) * (knobR * 0.45));
      ctx.lineTo(cx + Math.cos(aCur) * (knobR - 4), cy + Math.sin(aCur) * (knobR - 4));
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 15px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((curRate >= 0 ? '+' : '') + curRate.toFixed(2) + 'x', cx, cy - 3);
      ctx.fillStyle = st.playing ? '#6ee7b7' : '#94a3b8';
      ctx.font = '700 8px Consolas, monospace';
      ctx.fillText(st.playing ? (curRate < -0.05 ? 'PLAY REV' : 'PLAYING') : 'SPEED DIAL', cx, cy + 14);
    } else {
      // Jog Scrub encoder wheel
      var rotTurns = Math.max(1.2, Math.min(4.0, (st.durationSec || 1.0) * 1.8));
      var angle = st.normPos * Math.PI * 2 * rotTurns;

      ctx.fillStyle = '#6ee7b7';
      for (var d = 0; d < 36; d++) {
        var da = angle + (d / 36) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(da) * outerR, cy + Math.sin(da) * outerR, d % 3 === 0 ? 1.8 : 1.0, 0, Math.PI * 2);
        ctx.fill();
      }

      var encR = outerR * 0.86;
      ctx.fillStyle = '#111815';
      ctx.strokeStyle = '#385145';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, encR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      // Finger cup + radial marker
      ctx.fillStyle = '#1f362c';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(encR * 0.56, 0, encR * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(encR * 0.34, 0);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 13px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(st.normPos * 100) + '%', cx, cy - 4);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '700 8px Consolas, monospace';
      ctx.fillText('JOG SCRUB', cx, cy + 12);
    }

    var spdEl = $('lbl-scrub-speed');
    var tmEl = $('lbl-scrub-time');
    if (spdEl) {
      if (state.wheelMode === 'speed') {
        spdEl.textContent = (st.playing ? 'PLAY ' : 'SPEED: ') + (curRate >= 0 ? '+' : '') + curRate.toFixed(2) + 'x' + (curRate < -0.05 ? ' REV' : '');
      } else {
        var v = st.velocity || 0;
        var tag = st.scrubbing ? 'JOG: ' : st.playing ? 'PLAY: ' : 'IDLE: ';
        spdEl.textContent = tag + (v >= 0 ? '+' : '') + v.toFixed(2) + 'x' + (v < -0.05 ? ' REV' : '');
      }
    }
    if (tmEl) {
      tmEl.textContent = (st.currentSec || 0).toFixed(3) + 's / ' + (st.durationSec || 0).toFixed(3) + 's';
    }
  }

  function drawScrubWaveform() {
    var canvas = $('canvas-scrub-wave');
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#0a1411';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(94, 234, 175, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    var item = getActiveSpecimen();
    var arr = state.liveMonitorActive && state.liveRing
      ? readLiveRingTail(Math.round((state.liveSr || 44100) * 1.5))
      : state.isManualRecording && state.recLiveRing
      ? readRingTail(state.recLiveRing, 'recLiveRingWrite', 'recLiveRingTotal', Math.round((state.liveSr || 44100) * 1.5))
      : (item && (item.clippedSamples || item.rawSamples));

    if (!arr || arr.length === 0) {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '700 12px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No Audio Loaded — Select a Specimen or Start Mic Monitor', w / 2, h / 2 - 4);
      return;
    }

    var n = arr.length;
    var bars = Math.max(60, Math.floor(w / 3));
    var step = n / bars;
    var midY = h / 2;
    var maxBarH = h * 0.44;
    var barW = Math.max(1.5, w / bars - 1);

    var peakAll = 0.02;
    for (var s = 0; s < n; s += Math.max(1, Math.floor(n / 1200))) {
      var av = Math.abs(arr[s]);
      if (av > peakAll) peakAll = av;
    }

    var st = state.scrub ? state.scrub.getState() : { normPos: 0 };
    var playX = clamp(st.normPos, 0, 1) * w;

    for (var b = 0; b < bars; b++) {
      var i0 = Math.floor(b * step);
      var i1 = Math.min(n, Math.max(i0 + 1, Math.floor((b + 1) * step)));
      var pk = 0;
      for (var i = i0; i < i1; i++) {
        var v = Math.abs(arr[i]);
        if (v > pk) pk = v;
      }
      var x = (b / bars) * w;
      var bh = Math.max(2, (pk / peakAll) * maxBarH);
      ctx.fillStyle = x <= playX ? '#34d399' : '#166534';
      ctx.fillRect(x, midY - bh, barW, bh * 2);
    }

    if (!state.liveMonitorActive && !state.isManualRecording) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, h);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(playX - 6, 0);
      ctx.lineTo(playX + 6, 0);
      ctx.lineTo(playX, 9);
      ctx.closePath();
      ctx.fill();
    }
  }

  function renderSpectrumToCanvas(canvas, rollLblEl, telemetry, liveBinsOverride) {
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#0a1411';
    ctx.fillRect(0, 0, w, h);

    var fMin = 40;
    var fMax = 6000;
    var freqToX = function (hz) {
      var f = clamp(hz, fMin, fMax);
      return (Math.log(f / fMin) / Math.log(fMax / fMin)) * w;
    };

    var bands = [
      { lo: 40, hi: 55, color: 'rgba(239, 68, 68, 0.14)', label: 'Sub55' },
      { lo: 55, hi: 750, color: 'rgba(34, 197, 94, 0.10)', label: 'B1 Core (55-750)' },
      { lo: 750, hi: 2600, color: 'rgba(245, 158, 11, 0.10)', label: 'B2 Mid (750-2.6k)' },
      { lo: 2600, hi: 6000, color: 'rgba(56, 189, 248, 0.10)', label: 'B3 Air (>2.6k)' }
    ];
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'left';
    for (var bi = 0; bi < bands.length; bi++) {
      var x0 = freqToX(bands[bi].lo);
      var x1 = freqToX(bands[bi].hi);
      ctx.fillStyle = bands[bi].color;
      ctx.fillRect(x0, 0, x1 - x0, h - 16);
      ctx.fillStyle = 'rgba(220, 245, 234, 0.72)';
      ctx.fillText(bands[bi].label, x0 + 4, 12);
    }

    var bins = liveBinsOverride || (telemetry && telemetry.spectrumBins ? telemetry.spectrumBins : null);
    if (bins) {
      var bw = w / bins.length;
      for (var k = 0; k < bins.length; k++) {
        var mag = clamp(bins[k], 0, 1);
        var bh = mag * (h - 32);
        var bx = (k / bins.length) * w;
        ctx.fillStyle = mag > 0.7 ? '#f59e0b' : '#34d399';
        ctx.fillRect(bx + 1, h - 16 - bh, Math.max(2, bw - 2), bh);
      }

      var rollHz = telemetry && telemetry.metrics ? telemetry.metrics.rolloff85Max : null;
      if (typeof rollHz === 'number' && rollHz > 0) {
        var rx = freqToX(rollHz);
        ctx.strokeStyle = '#f87171';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx, h - 16);
        ctx.stroke();
        ctx.setLineDash([]);
        if (rollLblEl) rollLblEl.textContent = '85% Roll-Off: ' + Math.round(rollHz) + ' Hz';
      } else if (rollLblEl) {
        rollLblEl.textContent = '85% Roll-Off: — Hz';
      }
    }

    // Room Background Control spectral subtraction floor overlay
    if (state.bgProfile && state.bgProfile.active && state.bgProfile.spectrumP90) {
      var bgBins = state.bgProfile.spectrumP90;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.14)';
      ctx.beginPath();
      ctx.moveTo(0, h - 16);
      for (var gk = 0; gk < bgBins.length; gk++) {
        var gx = (gk / Math.max(1, bgBins.length - 1)) * w;
        var gy = h - 16 - clamp(bgBins[gk], 0, 1) * (h - 32);
        ctx.lineTo(gx, gy);
      }
      ctx.lineTo(w, h - 16);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#22d3ee';
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (var gk2 = 0; gk2 < bgBins.length; gk2++) {
        var gx2 = (gk2 / Math.max(1, bgBins.length - 1)) * w;
        var gy2 = h - 16 - clamp(bgBins[gk2], 0, 1) * (h - 32);
        if (gk2 === 0) ctx.moveTo(gx2, gy2);
        else ctx.lineTo(gx2, gy2);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(7, 17, 13, 0.78)';
      ctx.fillRect(w - 134, 17, 128, 14);
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 9px Consolas, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('--- ROOM CONTROL FLOOR', w - 8, 27);
    }

    ctx.fillStyle = '#9fe2c4';
    ctx.font = '700 9px Consolas, monospace';
    ctx.textAlign = 'center';
    [55, 120, 250, 500, 750, 1200, 2600, 5000].forEach(function (hz) {
      ctx.fillText(hz >= 1000 ? (hz / 1000).toFixed(1) + 'k' : String(hz), freqToX(hz), h - 4);
    });
  }

  function drawLiveSpectrumCanvas(telemetry, liveBinsOverride) {
    renderSpectrumToCanvas($('canvas-live-spectrum'), $('lbl-rolloff-marker'), telemetry, liveBinsOverride);
    renderSpectrumToCanvas($('canvas-deck-spectrum'), $('lbl-deck-rolloff-marker'), telemetry, liveBinsOverride);
  }

  /* ==================== COHORT ANALYTICS & CHARTS ==================== */
  function getSelectedDecodedItems() {
    var out = [];
    for (var i = 0; i < state.specimens.length; i++) {
      var it = state.specimens[i];
      if (state.selectedIds[it.id] && it.decoded && it.telemetry) {
        out.push(it);
      }
    }
    return out;
  }

  function updateCohortAnalytics() {
    var selCount = Object.keys(state.selectedIds).filter(function (k) { return state.selectedIds[k]; }).length;
    var items = getSelectedDecodedItems();
    var stats = TootTestLab.DetectorLab.computeCohortStats(items, state.config);
    state.lastCohortStats = stats;

    var sumEl = $('cohort-selection-summary');
    if (sumEl) {
      sumEl.textContent =
        selCount +
        ' Selected (' +
        stats.totalCount +
        ' Analyzed: ' +
        stats.realCount +
        ' Real · ' +
        stats.fakeCount +
        ' Decoy · ' +
        stats.noiseCount +
        ' Noise)';
    }

    var kpiEl = $('cohort-kpi-strip');
    if (kpiEl) {
      var fmtPct = function (v) { return v === null ? '—' : v + '%'; };
      kpiEl.innerHTML =
        '<div class="tl-kpi-box"><div class="tl-kpi-val">' + fmtPct(stats.accuracyPct) + '</div><div class="tl-kpi-lbl">Overall Accuracy</div></div>' +
        '<div class="tl-kpi-box"><div class="tl-kpi-val">' + fmtPct(stats.recallPct) + '</div><div class="tl-kpi-lbl">Real Fart Hit Rate (' + stats.tp + '/' + stats.realCount + ')</div></div>' +
        '<div class="tl-kpi-box"><div class="tl-kpi-val">' + fmtPct(stats.specificityPct) + '</div><div class="tl-kpi-lbl">Decoy/Noise Reject (' + stats.tn + '/' + stats.nonRealCount + ')</div></div>' +
        '<div class="tl-kpi-box"><div class="tl-kpi-val">' + stats.fp + '</div><div class="tl-kpi-lbl">False Positives (Decoy Triggered)</div></div>' +
        '<div class="tl-kpi-box"><div class="tl-kpi-val">' + stats.fn + '</div><div class="tl-kpi-lbl">False Negatives (Real Missed)</div></div>' +
        '<div class="tl-kpi-box"><div class="tl-kpi-val">' + fmtPct(stats.f1Pct) + '</div><div class="tl-kpi-lbl">F1 Separation Score</div></div>';
    }

    var tbody = $('cohort-table-body');
    if (tbody) {
      tbody.innerHTML = stats.criteriaStats
        .map(function (cs) {
          var d = cs.def;
          var fmtRange = function (s) {
            if (!s || s.count === 0) return '—';
            return d.format(s.median) + ' (' + d.format(s.p10) + '–' + d.format(s.p90) + ')';
          };
          var allRange = cs.all.count > 0 ? d.format(cs.all.min) + ' – ' + d.format(cs.all.max) : '—';
          var dCls = cs.cohensD === null ? '' : Math.abs(cs.cohensD) >= 0.8 ? 'tl-sep-strong' : Math.abs(cs.cohensD) >= 0.4 ? 'tl-sep-mid' : 'tl-sep-weak';
          var dTxt = cs.cohensD === null ? 'Need 2+ Decoys' : (cs.cohensD >= 0 ? '+' : '') + cs.cohensD.toFixed(2);
          return (
            '<tr>' +
            '<td>' + esc(d.label) + '</td>' +
            '<td>' + (d.mode === 'min' ? '≥ ' : '≤ ') + esc(d.format(cs.threshold)) + '</td>' +
            '<td>' + esc(fmtRange(cs.real)) + '</td>' +
            '<td>' + esc(fmtRange(cs.nonReal)) + '</td>' +
            '<td>' + esc(allRange) + '</td>' +
            '<td>' + (cs.passRateReal === null ? '—' : cs.passRateReal + '%') + '</td>' +
            '<td>' + (cs.passRateNonReal === null ? '—' : cs.passRateNonReal + '%') + '</td>' +
            '<td class="' + dCls + '">' + esc(dTxt) + '</td>' +
            '</tr>'
          );
        })
        .join('');
    }

    drawStripDistributionChart();
    drawScatterClusterChart();
    renderFrequencySpreadAndProfile();
  }

  function drawStripDistributionChart() {
    var canvas = $('canvas-strip-chart');
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#0a1411';
    ctx.fillRect(0, 0, w, h);

    var cid = state.stripCriterionId;
    var def = TootTestLab.DetectorLab.CRITERIA_BY_ID[cid];
    if (!def) return;
    var cfg = getCriterionCfg(cid);

    var padL = 44;
    var padR = 22;
    var padT = 24;
    var padB = 34;
    var plotW = Math.max(80, w - padL - padR);
    var plotH = Math.max(60, h - padT - padB);
    var valToX = function (v) {
      return padL + clamp((v - def.min) / Math.max(1e-6, def.max - def.min), 0, 1) * plotW;
    };

    var tx = valToX(cfg.threshold);
    if (def.mode === 'min') {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.12)';
      ctx.fillRect(padL, padT, tx - padL, plotH);
      ctx.fillStyle = 'rgba(22, 163, 74, 0.14)';
      ctx.fillRect(tx, padT, padL + plotW - tx, plotH);
    } else {
      ctx.fillStyle = 'rgba(22, 163, 74, 0.14)';
      ctx.fillRect(padL, padT, tx - padL, plotH);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.12)';
      ctx.fillRect(tx, padT, padL + plotW - tx, plotH);
    }

    var rowY = { real: padT + plotH * 0.25, fake: padT + plotH * 0.56, noise: padT + plotH * 0.84 };
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = 'bold 10px Consolas, monospace';
    ctx.textAlign = 'left';
    ['real', 'fake', 'noise'].forEach(function (lbl) {
      var y = rowY[lbl];
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillStyle = lbl === 'real' ? '#86efac' : lbl === 'fake' ? '#fdba74' : '#cbd5e1';
      ctx.fillText(formatLabelDisplay(lbl), 6, y + 3);
    });

    var items = getSelectedDecodedItems();
    state.stripDotHits = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var val = safeNum(it.telemetry.metrics[cid], 0);
      var dx = valToX(val);
      var jitter = (((i * 37) % 13) - 6) * 2.1;
      var dy = (rowY[it.label] || rowY.real) + jitter;
      var col = it.label === 'fake' ? '#fb923c' : it.label === 'noise' ? '#94a3b8' : '#22c55e';
      var isAct = state.activeId === it.id;

      ctx.fillStyle = col;
      ctx.strokeStyle = isAct ? '#fef08a' : '#0a1411';
      ctx.lineWidth = isAct ? 2.5 : 1.2;
      ctx.beginPath();
      ctx.arc(dx, dy, isAct ? 6.5 : 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      state.stripDotHits.push({ x: dx, y: dy, r: 9, item: it, val: val });
    }

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(tx, padT - 4);
    ctx.lineTo(tx, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(tx, padT - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 10px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THR ' + def.format(cfg.threshold), clamp(tx, padL + 38, padL + plotW - 38), 11);

    ctx.fillStyle = '#9fe2c4';
    ctx.font = '700 9px Consolas, monospace';
    for (var t = 0; t <= 4; t++) {
      var tv = def.min + ((def.max - def.min) * t) / 4;
      ctx.fillText(def.format(tv), valToX(tv), h - 10);
    }
  }

  function drawScatterClusterChart() {
    var canvas = $('canvas-scatter-chart');
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#0a1411';
    ctx.fillRect(0, 0, w, h);

    var Lab = TootTestLab.DetectorLab;
    var xDef = Lab.CRITERIA_BY_ID[state.scatterXId];
    var yDef = Lab.CRITERIA_BY_ID[state.scatterYId];
    if (!xDef || !yDef) return;
    var xCfg = getCriterionCfg(xDef.id);
    var yCfg = getCriterionCfg(yDef.id);

    var padL = 52;
    var padR = 20;
    var padT = 18;
    var padB = 30;
    var plotW = Math.max(80, w - padL - padR);
    var plotH = Math.max(60, h - padT - padB);

    var mapX = function (v) { return padL + clamp((v - xDef.min) / Math.max(1e-6, xDef.max - xDef.min), 0, 1) * plotW; };
    var mapY = function (v) { return padT + plotH - clamp((v - yDef.min) / Math.max(1e-6, yDef.max - yDef.min), 0, 1) * plotH; };

    var xT = mapX(xCfg.threshold);
    var yT = mapY(yCfg.threshold);
    var qx0 = xDef.mode === 'min' ? xT : padL;
    var qx1 = xDef.mode === 'min' ? padL + plotW : xT;
    var qy0 = yDef.mode === 'max' ? yT : padT;
    var qy1 = yDef.mode === 'max' ? padT + plotH : yT;
    ctx.fillStyle = 'rgba(22, 163, 74, 0.14)';
    ctx.fillRect(qx0, qy0, qx1 - qx0, qy1 - qy0);

    ctx.strokeStyle = 'rgba(248, 113, 113, 0.72)';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(xT, padT);
    ctx.lineTo(xT, padT + plotH);
    ctx.moveTo(padL, yT);
    ctx.lineTo(padL + plotW, yT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(159, 226, 196, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    var items = getSelectedDecodedItems();
    state.scatterDotHits = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var xv = safeNum(it.telemetry.metrics[xDef.id], 0);
      var yv = safeNum(it.telemetry.metrics[yDef.id], 0);
      var px = mapX(xv);
      var py = mapY(yv);
      var isAct = state.activeId === it.id;

      ctx.strokeStyle = isAct ? '#fef08a' : '#0a1411';
      ctx.lineWidth = isAct ? 2.4 : 1.1;

      if (it.label === 'fake') {
        ctx.fillStyle = '#fb923c';
        var rad = isAct ? 7 : 5.5;
        ctx.beginPath();
        ctx.moveTo(px, py - rad);
        ctx.lineTo(px + rad, py + rad);
        ctx.lineTo(px - rad, py + rad);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (it.label === 'noise') {
        ctx.fillStyle = '#94a3b8';
        var sr = isAct ? 6 : 4.5;
        ctx.fillRect(px - sr, py - sr, sr * 2, sr * 2);
        ctx.strokeRect(px - sr, py - sr, sr * 2, sr * 2);
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(px, py, isAct ? 6.5 : 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      state.scatterDotHits.push({ x: px, y: py, r: 9, item: it, xv: xv, yv: yv });
    }

    ctx.fillStyle = '#9fe2c4';
    ctx.font = '700 9px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(xDef.shortLabel + ' (' + xDef.format(xDef.min) + ' .. ' + xDef.format(xDef.max) + ')', padL + plotW / 2, h - 8);
    ctx.textAlign = 'left';
    ctx.fillText(yDef.format(yDef.max), 4, padT + 8);
    ctx.fillText(yDef.format(yDef.min), 4, padT + plotH - 2);
  }

  /* ==================== PAGE 2: FULL-CORPUS FREQUENCY SPREAD & REAL-VS-MOUTH PROFILE ==================== */
  function getAllDecodedCorpusItems() {
    return state.specimens.filter(function (it) {
      return it && it.decoded && it.telemetry && it.telemetry.metrics;
    });
  }

  function buildAuthCriteriaDom() {
    var mount = $('auth-criteria-mount');
    if (!mount) return;
    var defs = getAuthDefs();
    mount.innerHTML = defs
      .map(function (def) {
        var c = getAuthCriterionCfg(def.id);
        var modeStr = def.mode === 'min' ? '≥' : '≤';
        return (
          '<div class="tl-auth-row" id="auth-row-' + def.id + '" data-auth-row="' + def.id + '">' +
          '  <div class="tl-auth-row-head">' +
          '    <label class="tl-auth-row-title">' +
          '      <input type="checkbox" data-auth-enable="' + def.id + '" ' + (c.enabled ? 'checked' : '') + ' />' +
          '      <span>' + esc(def.shortLabel) + '</span>' +
          '      <small class="tl-crit-mode-tag">' + modeStr + '</small>' +
          '    </label>' +
          '    <div class="tl-auth-row-vals">' +
          '      <span id="auth-val-' + def.id + '">Val: —</span>' +
          '      <span id="auth-cut-' + def.id + '">Cut: ' + modeStr + esc(def.format(c.threshold)) + '</span>' +
          '      <span id="auth-badge-' + def.id + '" class="tl-crit-badge off">—</span>' +
          '    </div>' +
          '  </div>' +
          '  <div class="tl-auth-row-sliders">' +
          '    <div class="tl-auth-slider-item">' +
          '      <span>Split</span>' +
          '      <input type="range" data-auth-thr="' + def.id + '" min="' + def.min + '" max="' + def.max + '" step="' + def.step + '" value="' + c.threshold + '" />' +
          '    </div>' +
          '    <div class="tl-auth-slider-item">' +
          '      <span id="auth-wtlbl-' + def.id + '">Wt ' + safeNum(c.weight, 1).toFixed(1) + 'x</span>' +
          '      <input type="range" data-auth-wt="' + def.id + '" min="0" max="3" step="0.1" value="' + c.weight + '" />' +
          '    </div>' +
          '  </div>' +
          '</div>'
        );
      })
      .join('');
  }

  function syncAuthSlidersFromConfig() {
    var defs = getAuthDefs();
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      var c = getAuthCriterionCfg(d.id);
      var en = document.querySelector('[data-auth-enable="' + d.id + '"]');
      var thr = document.querySelector('[data-auth-thr="' + d.id + '"]');
      var wt = document.querySelector('[data-auth-wt="' + d.id + '"]');
      if (en) en.checked = Boolean(c.enabled);
      if (thr) thr.value = String(c.threshold);
      if (wt) wt.value = String(c.weight);
    }
    var br = $('chk-sentry-bridge-auth');
    if (br) br.checked = Boolean(state.config && state.config.bridgeAuthToSentry);
    var pushBtn = $('btn-auth-push-sentry');
    if (pushBtn) {
      var bridgeOn = Boolean(state.config && state.config.bridgeAuthToSentry);
      pushBtn.textContent = bridgeOn ? '✓ Sentry Bridge ON' : '↗ Enable in Sentry Bridge';
      pushBtn.classList.toggle('is-active', bridgeOn);
    }
  }

  function updateAuthCriteriaUi(telemetry) {
    var defs = getAuthDefs();
    var corpus = getAllDecodedCorpusItems();
    var reals = corpus.filter(function (x) { return x.label !== 'fake' && x.label !== 'noise'; });
    var decoys = corpus.filter(function (x) { return x.label === 'fake'; });

    for (var i = 0; i < defs.length; i++) {
      var def = defs[i];
      var c = getAuthCriterionCfg(def.id);
      var modeStr = def.mode === 'min' ? '≥' : '≤';
      var row = $('auth-row-' + def.id);
      var valEl = $('auth-val-' + def.id);
      var cutEl = $('auth-cut-' + def.id);
      var wtEl = $('auth-wtlbl-' + def.id);
      var badge = $('auth-badge-' + def.id);

      var rawVal = telemetry && telemetry.metrics ? telemetry.metrics[def.id] : null;
      var hasVal = typeof rawVal === 'number' && Number.isFinite(rawVal);
      var passed = hasVal ? (def.mode === 'min' ? rawVal >= c.threshold : rawVal <= c.threshold) : null;

      if (valEl) valEl.textContent = 'Val: ' + (hasVal ? def.format(rawVal) : '—');
      if (cutEl) cutEl.textContent = 'Cut: ' + modeStr + def.format(c.threshold);
      if (wtEl) wtEl.textContent = 'Wt ' + safeNum(c.weight, 1).toFixed(1) + 'x';
      if (row) {
        row.classList.toggle('is-disabled', !c.enabled || c.weight <= 0);
        row.classList.toggle('is-real', Boolean(c.enabled && hasVal && passed));
        row.classList.toggle('is-mouth', Boolean(c.enabled && hasVal && passed === false));
      }
      if (badge) {
        if (!c.enabled || c.weight <= 0) {
          badge.textContent = 'OFF';
          badge.className = 'tl-crit-badge off';
        } else if (!hasVal) {
          badge.textContent = 'WAIT';
          badge.className = 'tl-crit-badge off';
        } else if (passed) {
          badge.textContent = 'REAL';
          badge.className = 'tl-crit-badge pass';
        } else {
          badge.textContent = 'MOUTH';
          badge.className = 'tl-crit-badge fail';
        }
      }
    }

    var kpiEl = $('auth-kpi-mini');
    if (kpiEl) {
      var realOk = 0;
      for (var r = 0; r < reals.length; r++) {
        var rEv = TootTestLab.DetectorLab.evaluateAuthenticity(reals[r].telemetry, state.config);
        if (rEv.isRealOrganic) realOk++;
      }
      var decoyCaught = 0;
      for (var d = 0; d < decoys.length; d++) {
        var dEv = TootTestLab.DetectorLab.evaluateAuthenticity(decoys[d].telemetry, state.config);
        if (dEv.isRealOrganic === false) decoyCaught++;
      }
      var realPct = reals.length > 0 ? Math.round((realOk / reals.length) * 100) + '%' : '—';
      var mouthPct = decoys.length > 0 ? Math.round((decoyCaught / decoys.length) * 100) + '%' : 'Add Decoy';
      var sepDen = reals.length + decoys.length;
      var sepPct = (reals.length > 0 && decoys.length > 0 && sepDen > 0)
        ? Math.round(((realOk + decoyCaught) / sepDen) * 100) + '%'
        : '1-Class';
      kpiEl.innerHTML =
        '<div class="tl-auth-kpi-box"><strong>' + realPct + '</strong><small>Real Organic (' + realOk + '/' + reals.length + ')</small></div>' +
        '<div class="tl-auth-kpi-box"><strong>' + mouthPct + '</strong><small>Mouth Caught (' + decoyCaught + '/' + decoys.length + ')</small></div>' +
        '<div class="tl-auth-kpi-box"><strong>' + sepPct + '</strong><small>Real vs. Mouth Acc</small></div>';
    }

    if (state.activePage === 'authenticity' && state.authSubTab === 'spread') {
      drawAuthProfileCanvas(telemetry, corpus);
    }
  }

  function drawAuthProfileCanvas(telemetry, corpusItems) {
    var canvas = $('canvas-auth-profile');
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#070d14';
    ctx.fillRect(0, 0, w, h);

    var defs = getAuthDefs();
    var corpus = Array.isArray(corpusItems) ? corpusItems : getAllDecodedCorpusItems();
    var reals = corpus.filter(function (x) { return x.label !== 'fake' && x.label !== 'noise'; });
    var decoys = corpus.filter(function (x) { return x.label === 'fake'; });
    var actTel = telemetry || getActiveTelemetryForCriteria();

    var compact = w < 460;
    var padL = 36;
    var padR = 12;
    var padT = 26;
    var padB = 56;
    var plotW = Math.max(80, w - padL - padR);
    var plotH = Math.max(60, h - padT - padB);
    var plotBot = padT + plotH;
    var colW = plotW / Math.max(1, defs.length);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('REAL FARTS P10–P90 (GREEN) vs. MOUTH DECOYS P10–P90 (ORANGE) · DRAG CYAN CUTOFFS', padL, 14);

    ctx.textAlign = 'right';
    [0, 0.25, 0.5, 0.75, 1.0].forEach(function (u) {
      var gy = plotBot - u * plotH;
      ctx.strokeStyle = u === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(148,163,184,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + plotW, gy);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(Math.round(u * 100) + '%', padL - 4, gy + 3);
    });

    function summarizeProp(arr, fn) {
      if (!arr || !arr.length) return null;
      var s = arr.map(fn).sort(function (a, b) { return a - b; });
      var qAt = function (p) {
        var pos = p * (s.length - 1);
        var lo = Math.floor(pos);
        var hi = Math.min(s.length - 1, lo + 1);
        return s[lo] * (1 - (pos - lo)) + s[hi] * (pos - lo);
      };
      return { min: s[0], p10: qAt(0.10), med: qAt(0.50), p90: qAt(0.90), max: s[s.length - 1] };
    }

    var colsHit = [];
    for (var i = 0; i < defs.length; i++) {
      var def = defs[i];
      var c = getAuthCriterionCfg(def.id);
      var span = Math.max(1e-6, def.max - def.min);
      var x0 = padL + i * colW;
      var x1 = x0 + colW;
      var cx = x0 + colW * 0.5;
      var valToY = function (v) { return plotBot - clamp((v - def.min) / span, 0, 1) * plotH; };
      var thrY = valToY(c.threshold);

      var isHover = state.authProfileHoverId === def.id;
      var isDrag = state.authProfileDragId === def.id;
      if (isHover || isDrag) {
        ctx.fillStyle = isDrag ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(x0 + 2, padT, colW - 4, plotH);
      }

      // Pass region shading for REAL
      ctx.fillStyle = c.enabled ? 'rgba(16, 185, 129, 0.09)' : 'rgba(148, 163, 184, 0.04)';
      if (def.mode === 'min') {
        ctx.fillRect(x0 + 4, padT, colW - 8, Math.max(0, thrY - padT));
      } else {
        ctx.fillRect(x0 + 4, thrY, colW - 8, Math.max(0, plotBot - thrY));
      }

      var rStat = summarizeProp(reals, function (it) { return safeNum(it.telemetry.metrics[def.id], def.defaultThreshold); });
      var dStat = summarizeProp(decoys, function (it) { return safeNum(it.telemetry.metrics[def.id], def.defaultThreshold); });

      var boxW = Math.max(8, Math.min(20, colW * 0.24));
      if (rStat) {
        var rx = cx - boxW * 0.72;
        var yRMin = valToY(rStat.min);
        var yRP10 = valToY(rStat.p10);
        var yRMed = valToY(rStat.med);
        var yRP90 = valToY(rStat.p90);
        var yRMax = valToY(rStat.max);

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(rx, yRMin);
        ctx.lineTo(rx, yRMax);
        ctx.stroke();

        ctx.fillStyle = 'rgba(16, 185, 129, 0.36)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.4;
        var rh = Math.max(4, Math.abs(yRP10 - yRP90));
        ctx.fillRect(rx - boxW * 0.5, Math.min(yRP10, yRP90), boxW, rh);
        ctx.strokeRect(rx - boxW * 0.5, Math.min(yRP10, yRP90), boxW, rh);

        ctx.strokeStyle = '#d1fae5';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(rx - boxW * 0.5, yRMed);
        ctx.lineTo(rx + boxW * 0.5, yRMed);
        ctx.stroke();
      }

      if (dStat) {
        var dx = cx + boxW * 0.72;
        var yDMin = valToY(dStat.min);
        var yDP10 = valToY(dStat.p10);
        var yDMed = valToY(dStat.med);
        var yDP90 = valToY(dStat.p90);
        var yDMax = valToY(dStat.max);

        ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(dx, yDMin);
        ctx.lineTo(dx, yDMax);
        ctx.stroke();

        ctx.fillStyle = 'rgba(249, 115, 22, 0.36)';
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 1.4;
        var dh = Math.max(4, Math.abs(yDP10 - yDP90));
        ctx.fillRect(dx - boxW * 0.5, Math.min(yDP10, yDP90), boxW, dh);
        ctx.strokeRect(dx - boxW * 0.5, Math.min(yDP10, yDP90), boxW, dh);

        ctx.strokeStyle = '#ffedd5';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(dx - boxW * 0.5, yDMed);
        ctx.lineTo(dx + boxW * 0.5, yDMed);
        ctx.stroke();
      }

      // Active deck clip value diamond
      var actVal = actTel && actTel.metrics && typeof actTel.metrics[def.id] === 'number' ? actTel.metrics[def.id] : null;
      if (actVal != null && Number.isFinite(actVal)) {
        var ay = valToY(actVal);
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, ay - 5);
        ctx.lineTo(cx + 5, ay);
        ctx.lineTo(cx, ay + 5);
        ctx.lineTo(cx - 5, ay);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Draggable Cyan Cutoff Bar & Knob
      ctx.strokeStyle = c.enabled ? '#38bdf8' : '#64748b';
      ctx.lineWidth = isDrag || isHover ? 2.5 : 1.9;
      ctx.beginPath();
      ctx.moveTo(x0 + 6, thrY);
      ctx.lineTo(x1 - 6, thrY);
      ctx.stroke();

      ctx.fillStyle = c.enabled ? '#38bdf8' : '#64748b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, thrY, isDrag ? 6.5 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // X-Axis Label + Real/Mouth directional hint
      var dirCue = def.mode === 'min' ? '▲ Real High' : '▼ Real Low';
      ctx.textAlign = 'center';
      ctx.fillStyle = isDrag || isHover ? '#38bdf8' : '#e2e8f0';
      ctx.font = compact ? 'bold 8.5px Consolas, monospace' : 'bold 9.5px Consolas, monospace';
      ctx.fillText(def.shortLabel, cx, plotBot + 16);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7.8px Consolas, monospace';
      ctx.fillText(dirCue, cx, plotBot + 30);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText((def.mode === 'min' ? '≥' : '≤') + def.format(c.threshold), cx, plotBot + 42);

      colsHit.push({
        id: def.id,
        def: def,
        x0: x0,
        x1: x1,
        cx: cx,
        thrY: thrY,
        plotTop: padT,
        plotBot: plotBot,
        rStat: rStat,
        dStat: dStat,
        actVal: actVal,
        thr: c.threshold
      });
    }

    state.authProfileCols = colsHit;
  }

  function renderSpreadSummaryCards(profile) {
    var box = $('spread-summary-cards');
    if (!box) return;
    if (!profile || profile.real.count === 0) {
      box.innerHTML = '<div class="tl-spread-sum-card is-core"><small>WAITING</small><strong>No Real Farts Decoded</strong><span>Click Decode All 48 Farts above to populate the corpus map.</span></div>';
      return;
    }

    var coreTxt = profile.universalRealBands.length > 0
      ? profile.universalRealBands.map(function (b) { return b.label; }).join(', ')
      : 'Wide broadband spread';
    var deadTxt = profile.deadAcousticBands.length > 0
      ? profile.deadAcousticBands.map(function (b) { return b.label; }).join(', ')
      : 'Active energy across tested mid/high bins';
    var subMicTxt = profile.deadSubMicBands.length > 0
      ? (' Plus <60 Hz (' + profile.deadSubMicBands.map(function (b) { return b.label; }).join(', ') + ') near mic roll-off.')
      : '';

    var mouthTitle = 'Add Mouth Decoys';
    var mouthDesc = 'Record or import 2+ Mouth Decoys to map exact frequencies mouth mimics hit that real farts miss.';
    if (profile.decoy.count > 0) {
      if (profile.mouthExcessBands.length > 0) {
        mouthTitle = profile.mouthExcessBands.map(function (b) { return b.label; }).join(', ');
        mouthDesc = 'Mouth Decoys hit hotter here (peak +' + profile.maxMouthExcess.hitDiff + '% hit rate @ ' + Math.round(profile.maxMouthExcess.hz) + ' Hz vs Real).';
      } else if (profile.maxMouthExcess.bin >= 0) {
        mouthTitle = 'Peak @ ' + Math.round(profile.maxMouthExcess.hz) + ' Hz';
        mouthDesc = 'Mouth Decoy hit delta +' + profile.maxMouthExcess.hitDiff + '% across ' + profile.decoy.count + ' decoy(s).';
      }
    }

    var pMin = profile.real.peakHz.p10 ? Math.round(profile.real.peakHz.p10) : '—';
    var pMax = profile.real.peakHz.p90 ? Math.round(profile.real.peakHz.p90) : '—';
    var rMed = profile.real.rolloff85.median ? Math.round(profile.real.rolloff85.median) : '—';

    box.innerHTML =
      '<div class="tl-spread-sum-card is-core">' +
      '  <small>1. UNIVERSAL REAL CORE (≥' + profile.coreThreshPct + '% HIT)</small>' +
      '  <strong>' + esc(coreTxt) + '</strong>' +
      '  <span>Bands hit by nearly all ' + profile.real.count + ' Real Farts at ≥' + Math.round(profile.hitThreshold * 100) + '% energy.</span>' +
      '</div>' +
      '<div class="tl-spread-sum-card is-dead">' +
      '  <small>2. REAL DEAD / RARE ZONES (≤15% HIT)</small>' +
      '  <strong>' + esc(deadTxt) + '</strong>' +
      '  <span>Acoustic zones ≥60 Hz rarely hit by real farts.' + esc(subMicTxt) + '</span>' +
      '</div>' +
      '<div class="tl-spread-sum-card is-mouth">' +
      '  <small>3. MOUTH VS. REAL DIVERGENCE (' + profile.decoy.count + ' DECOYS)</small>' +
      '  <strong>' + esc(mouthTitle) + '</strong>' +
      '  <span>' + esc(mouthDesc) + '</span>' +
      '</div>' +
      '<div class="tl-spread-sum-card is-mic">' +
      '  <small>4. MIC SENSITIVITY &amp; P10–P90 PEAKS</small>' +
      '  <strong>' + pMin + '–' + pMax + ' Hz (85% Roll ' + rMed + ' Hz)</strong>' +
      '  <span>Below 60 Hz is shaded Mic Low-Cut (phone mics/speakers roll off). Above 3.5 kHz reflects clothing damping vs mouth air.</span>' +
      '</div>';
  }

  function drawFrequencySpreadCanvas(profile) {
    var canvas = $('canvas-freq-spread');
    if (!canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#070d14';
    ctx.fillRect(0, 0, w, h);

    if (!profile || !profile.centers) return;
    var centers = profile.centers;
    var padL = 44;
    var padR = 14;
    var padT = 22;
    var padB = 26;
    var plotW = Math.max(80, w - padL - padR);
    var usableH = Math.max(120, h - padT - padB);
    var topH = Math.round(usableH * 0.56);
    var gapH = 22;
    var botH = Math.max(60, usableH - topH - gapH);
    var top0 = padT;
    var top1 = top0 + topH;
    var bot0 = top1 + gapH;
    var bot1 = bot0 + botH;

    var xOfBin = function (idx) { return padL + (idx / 63) * plotW; };
    var xOfHz = function (hz) {
      var u = Math.log(clamp(hz, 40, 6000) / 40) / Math.log(6000 / 40);
      return padL + u * plotW;
    };

    // Acoustic & Mic Zones in background
    if (state.spreadShowZones) {
      var zones = [
        { lo: 40, hi: 60, col: 'rgba(100, 116, 139, 0.16)', lbl: 'MIC LOW-CUT', lcol: '#94a3b8' },
        { lo: 60, hi: 750, col: 'rgba(16, 185, 129, 0.08)', lbl: 'GAS CORE (60–750)', lcol: '#6ee7b7' },
        { lo: 350, hi: 850, col: 'rgba(245, 158, 11, 0.06)', lbl: 'F1', lcol: '#fcd34d' },
        { lo: 950, hi: 2300, col: 'rgba(249, 115, 22, 0.08)', lbl: 'MOUTH F2', lcol: '#fdba74' },
        { lo: 2600, hi: 6000, col: 'rgba(148, 163, 184, 0.07)', lbl: 'AIR / HISS >2.6K', lcol: '#cbd5e1' }
      ];
      for (var zi = 0; zi < zones.length; zi++) {
        var z = zones[zi];
        var zx0 = xOfHz(z.lo);
        var zx1 = xOfHz(z.hi);
        ctx.fillStyle = z.col;
        ctx.fillRect(zx0, top0, Math.max(2, zx1 - zx0), topH);
        ctx.fillRect(zx0, bot0, Math.max(2, zx1 - zx0), botH);
        ctx.fillStyle = z.lcol;
        ctx.font = 'bold 8px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(z.lbl, (zx0 + zx1) * 0.5, top0 + 10);
      }
    }

    // Top Plot Y Grid (Normalized Spectral Magnitude 0..1)
    ctx.font = 'bold 8.5px Consolas, monospace';
    ctx.textAlign = 'right';
    [0, 0.25, 0.5, 0.75, 1.0].forEach(function (u) {
      var gy = top1 - u * topH;
      ctx.strokeStyle = u === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(148,163,184,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + plotW, gy);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(Math.round(u * 100) + '%', padL - 4, gy + 3);
    });

    function fillBand(loArr, hiArr, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (var i = 0; i < 64; i++) {
        var px = xOfBin(i);
        var py = top1 - clamp(hiArr[i], 0, 1) * topH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (var j = 63; j >= 0; j--) {
        ctx.lineTo(xOfBin(j), top1 - clamp(loArr[j], 0, 1) * topH);
      }
      ctx.closePath();
      ctx.fill();
    }

    function strokeCurve(arr, color, lw, dash) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      for (var i = 0; i < 64; i++) {
        var px = xOfBin(i);
        var py = top1 - clamp(arr[i], 0, 1) * topH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Real Farts Envelope & Median
    if (profile.real.count > 0) {
      if (state.spreadShowMinMax) fillBand(profile.real.p0, profile.real.p100, 'rgba(16, 185, 129, 0.11)');
      if (state.spreadShowP1090) fillBand(profile.real.p10, profile.real.p90, 'rgba(16, 185, 129, 0.28)');
      if (state.spreadShowTraces) {
        for (var rt = 0; rt < profile.real.traces.length; rt++) {
          strokeCurve(profile.real.traces[rt].bins, 'rgba(52, 211, 153, 0.20)', 0.9);
        }
      }
      strokeCurve(profile.real.median, '#10b981', 2.4);
    }

    // Mouth Decoys Envelope & Median
    if (profile.decoy.count > 0) {
      if (state.spreadShowMinMax) fillBand(profile.decoy.p0, profile.decoy.p100, 'rgba(249, 115, 22, 0.11)');
      if (state.spreadShowP1090) fillBand(profile.decoy.p10, profile.decoy.p90, 'rgba(249, 115, 22, 0.28)');
      if (state.spreadShowTraces) {
        for (var dt = 0; dt < profile.decoy.traces.length; dt++) {
          strokeCurve(profile.decoy.traces[dt].bins, 'rgba(251, 146, 60, 0.24)', 0.9);
        }
      }
      strokeCurve(profile.decoy.median, '#fb923c', 2.4);
    }

    // Active Loaded Clip Overlay
    var act = getActiveSpecimen();
    if (state.spreadShowActive && act && act.telemetry && act.telemetry.spectrumBins) {
      strokeCurve(act.telemetry.spectrumBins, '#f8fafc', 1.6, [5, 3]);
    }

    // Hit Energy Threshold Horizontal Line
    var thrY = top1 - clamp(profile.hitThreshold, 0, 1) * topH;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padL, thrY);
    ctx.lineTo(padL + plotW, thrY);
    ctx.stroke();
    ctx.restore();
    var hitTxt = 'HIT THR ' + Math.round(profile.hitThreshold * 100) + '%';
    ctx.font = 'bold 8.5px Consolas, monospace';
    var hitW = ctx.measureText(hitTxt).width + 8;
    ctx.fillStyle = 'rgba(7, 13, 20, 0.85)';
    ctx.fillRect(padL + plotW - hitW - 2, thrY - 14, hitW, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(hitTxt, padL + plotW - 6, thrY - 5);

    // Top Plot Title
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.fillText('NORMALIZED SPECTRAL SPREAD (MEDIAN + P10–P90 + MIN–MAX) · ACTIVE CLIP DASHED WHITE', padL, 13);

    // Bottom Plot Header & Grid (Hit Rate 0..100%)
    ctx.fillStyle = '#93c5fd';
    ctx.textAlign = 'left';
    ctx.fillText('FREQUENCY HIT RATE (% OF CLIPS ≥' + Math.round(profile.hitThreshold * 100) + '% ENERGY) · GREEN ≥80% UNIVERSAL CORE · GRAY ≤15% DEAD ZONE', padL, bot0 - 6);

    ctx.textAlign = 'right';
    [0, 15, 50, 80, 100].forEach(function (pct) {
      var gy = bot1 - (pct / 100) * botH;
      ctx.save();
      if (pct === 80 || pct === 15) ctx.setLineDash([3, 3]);
      ctx.strokeStyle = pct === 80 ? 'rgba(16,185,129,0.55)' : pct === 15 ? 'rgba(148,163,184,0.45)' : 'rgba(148,163,184,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(padL + plotW, gy);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = pct === 80 ? '#6ee7b7' : '#64748b';
      ctx.fillText(pct + '%', padL - 4, gy + 3);
    });

    // Hit Rate Bars for Real Farts
    var bw = Math.max(2, (plotW / 64) * 0.72);
    if (profile.real.count > 0) {
      for (var bi = 0; bi < 64; bi++) {
        var hr = clamp(profile.real.hitRate[bi], 0, 100);
        var bh = Math.max(1, (hr / 100) * botH);
        var bx = xOfBin(bi) - bw * 0.5;
        ctx.fillStyle = hr >= profile.coreThreshPct ? '#10b981' : hr <= 15 ? '#475569' : '#0ea5e9';
        ctx.fillRect(bx, bot1 - bh, bw, bh);
      }
    }

    // Mouth Decoys Hit Rate Overlay Curve
    if (profile.decoy.count > 0) {
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (var di = 0; di < 64; di++) {
        var dx = xOfBin(di);
        var dy = bot1 - (clamp(profile.decoy.hitRate[di], 0, 100) / 100) * botH;
        if (di === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      }
      ctx.stroke();
    }

    // Log-frequency X-axis ruler ticks
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 9px Consolas, monospace';
    ctx.textAlign = 'center';
    [45, 60, 100, 180, 350, 750, 1500, 3000, 5500].forEach(function (hzTick) {
      var tx = xOfHz(hzTick);
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, bot1);
      ctx.lineTo(tx, bot1 + 4);
      ctx.stroke();
      ctx.fillText(hzTick >= 1000 ? (hzTick / 1000).toFixed(1) + 'k' : String(hzTick), tx, h - 8);
    });

    // Hover Crosshair
    if (state.spreadHoverBin >= 0 && state.spreadHoverBin < 64) {
      var hx = xOfBin(state.spreadHoverBin);
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, top0);
      ctx.lineTo(hx, top1);
      ctx.moveTo(hx, bot0);
      ctx.lineTo(hx, bot1);
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderFrequencySpreadAndProfile() {
    var corpus = getAllDecodedCorpusItems();
    var reals = corpus.filter(function (x) { return x.label !== 'fake' && x.label !== 'noise'; });
    var decoys = corpus.filter(function (x) { return x.label === 'fake'; });
    var noises = corpus.filter(function (x) { return x.label === 'noise'; });
    var totalRealBank = state.specimens.filter(function (x) { return x.label !== 'fake' && x.label !== 'noise'; }).length;

    var covPill = $('lbl-corpus-coverage');
    if (covPill) {
      covPill.textContent = reals.length + ' / ' + totalRealBank + ' Real · ' + decoys.length + ' Mouth Decoys Analyzed';
    }

    var profile = TootTestLab.DetectorLab.computeFrequencySpreadProfile(corpus, {
      hitThreshold: state.spreadHitThreshold
    });
    state.lastSpreadProfile = profile;

    var metaBox = $('spread-corpus-meta');
    if (metaBox) {
      var pkMed = profile.real.peakHz.median ? Math.round(profile.real.peakHz.median) + ' Hz' : '—';
      var roMed = profile.real.rolloff85.median ? Math.round(profile.real.rolloff85.median) + ' Hz' : '—';
      metaBox.innerHTML =
        '<div><b>Decoded Real:</b> ' + reals.length + ' / ' + totalRealBank + '</div>' +
        '<div><b>Mouth Decoys:</b> ' + decoys.length + ' · <b>Noise:</b> ' + noises.length + '</div>' +
        '<div><b>Real Peak Med:</b> ' + pkMed + ' · <b>85% Roll Med:</b> ' + roMed + '</div>';
    }

    renderSpreadSummaryCards(profile);
    if (state.activePage === 'authenticity' && state.authSubTab === 'spread') {
      drawFrequencySpreadCanvas(profile);
    }
    var tel = getActiveTelemetryForCriteria();
    updateAuthCriteriaUi(tel);
  }

  function wireSpreadAndAuthInteractions() {
    var spreadCanvas = $('canvas-freq-spread');
    if (spreadCanvas) {
      var updateHoverAtX = function (ev) {
        var rect = spreadCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var padL = 44;
        var padR = 14;
        var plotW = Math.max(80, rect.width - padL - padR);
        var u = clamp((px - padL) / plotW, 0, 1);
        var bin = Math.round(u * 63);
        state.spreadHoverBin = bin;
        var prof = state.lastSpreadProfile;
        var tip = $('freq-spread-hover-tip');
        if (tip && prof && prof.centers) {
          var hz = Math.round(prof.centers[bin]);
          var rHit = prof.real.count > 0 ? Math.round(prof.real.hitRate[bin]) + '% (' + prof.real.hitCount[bin] + '/' + prof.real.count + ')' : '—';
          var rMed = prof.real.count > 0 ? Math.round(prof.real.median[bin] * 100) + '% [' + Math.round(prof.real.p10[bin] * 100) + '–' + Math.round(prof.real.p90[bin] * 100) + '%]' : '—';
          var dHit = prof.decoy.count > 0 ? Math.round(prof.decoy.hitRate[bin]) + '% (' + prof.decoy.hitCount[bin] + '/' + prof.decoy.count + ')' : 'Add Decoys';
          tip.textContent = hz + ' Hz · Real Hit: ' + rHit + ' · Real Energy Med: ' + rMed + ' · Mouth Hit: ' + dHit;
        }
        drawFrequencySpreadCanvas(prof);
      };
      spreadCanvas.addEventListener('pointermove', updateHoverAtX);
      spreadCanvas.addEventListener('pointerleave', function () {
        state.spreadHoverBin = -1;
        var tip = $('freq-spread-hover-tip');
        if (tip) tip.textContent = 'Hover across frequencies (40 Hz – 6 kHz) to inspect exact Real vs. Mouth energy & % Hit Rate';
        drawFrequencySpreadCanvas(state.lastSpreadProfile);
      });
    }

    var authCanvas = $('canvas-auth-profile');
    if (authCanvas) {
      var findAuthColAtX = function (px) {
        var cols = state.authProfileCols || [];
        for (var i = 0; i < cols.length; i++) {
          if (px >= cols[i].x0 && px <= cols[i].x1) return cols[i];
        }
        return null;
      };
      var applyAuthDragAtY = function (col, py) {
        if (!col || !col.def || !state.config.auth) return;
        var def = col.def;
        var plotH = Math.max(20, col.plotBot - col.plotTop);
        var u = clamp((col.plotBot - py) / plotH, 0, 1);
        var raw = def.min + u * (def.max - def.min);
        var snapped = def.step ? (def.min + Math.round((raw - def.min) / def.step) * def.step) : raw;
        var nextThr = clamp(Number(snapped.toFixed(3)), def.min, def.max);
        var aCfg = getAuthCriterionCfg(def.id);
        aCfg.threshold = nextThr;
        aCfg.enabled = true;
        if (!(safeNum(aCfg.weight, 0) > 0)) aCfg.weight = def.defaultWeight;
        state.config.auth.criteria[def.id] = aCfg;
        syncAuthSlidersFromConfig();
        onConfigMutated({ fast: true });
        var tip = $('auth-profile-tip');
        if (tip) {
          tip.textContent = 'Dragging ' + def.shortLabel + ' Real/Mouth cutoff → ' + (def.mode === 'min' ? '≥ ' : '≤ ') + def.format(nextThr);
        }
      };

      authCanvas.addEventListener('pointerdown', function (ev) {
        var rect = authCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        var col = findAuthColAtX(px);
        if (!col) return;
        state.authProfileDragId = col.id;
        if (authCanvas.setPointerCapture) {
          try { authCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
        }
        applyAuthDragAtY(col, py);
      });
      authCanvas.addEventListener('pointermove', function (ev) {
        var rect = authCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        if (state.authProfileDragId) {
          var dragCol = (state.authProfileCols || []).find(function (c) { return c.id === state.authProfileDragId; });
          if (dragCol) {
            authCanvas.style.cursor = 'ns-resize';
            applyAuthDragAtY(dragCol, py);
          }
          return;
        }
        var col = findAuthColAtX(px);
        var nextHover = col ? col.id : null;
        authCanvas.style.cursor = col && Math.abs(py - col.thrY) <= 16 ? 'ns-resize' : (col ? 'pointer' : 'default');
        var tip = $('auth-profile-tip');
        if (tip && col) {
          var rStr = col.rStat ? col.def.format(col.rStat.p10) + '–' + col.def.format(col.rStat.p90) : '—';
          var dStr = col.dStat ? col.def.format(col.dStat.p10) + '–' + col.def.format(col.dStat.p90) : 'Need Decoy';
          tip.textContent = col.def.label + ' · Real P10–P90: ' + rStr + ' · Mouth P10–P90: ' + dStr + ' · Drag cyan knob to adjust';
        }
        if (nextHover !== state.authProfileHoverId) {
          state.authProfileHoverId = nextHover;
          drawAuthProfileCanvas(getActiveTelemetryForCriteria());
        }
      });
      var endAuthDrag = function () {
        if (state.authProfileDragId) {
          state.authProfileDragId = null;
          authCanvas.style.cursor = 'default';
          flushHeavyConfigRefresh();
          drawAuthProfileCanvas(getActiveTelemetryForCriteria());
        }
      };
      authCanvas.addEventListener('pointerup', endAuthDrag);
      authCanvas.addEventListener('pointercancel', endAuthDrag);
      authCanvas.addEventListener('pointerleave', function () {
        if (!state.authProfileDragId && state.authProfileHoverId) {
          state.authProfileHoverId = null;
          drawAuthProfileCanvas(getActiveTelemetryForCriteria());
        }
      });
    }
  }

  /* ==================== REAL-TIME OSCILLOSCOPE, LIVE MIC SENTRY & RECORDER ==================== */
  function pushRingSamples(ring, wKey, tKey, chunk) {
    if (!ring || !chunk || !chunk.length) return;
    var cap = ring.length;
    var n = chunk.length;
    if (n >= cap) {
      ring.set(chunk.subarray(n - cap), 0);
      state[wKey] = 0;
      state[tKey] += n;
      return;
    }
    var wPos = state[wKey] || 0;
    var first = Math.min(n, cap - wPos);
    ring.set(chunk.subarray(0, first), wPos);
    if (n > first) ring.set(chunk.subarray(first), 0);
    state[wKey] = (wPos + n) % cap;
    state[tKey] = (state[tKey] || 0) + n;
  }

  function readRingTail(ring, wKey, tKey, count) {
    if (!ring || !state[tKey]) return new Float32Array(0);
    var cap = ring.length;
    var avail = Math.min(cap, state[tKey]);
    var len = Math.min(avail, count || avail);
    var out = new Float32Array(len);
    var start = (state[wKey] - len + cap) % cap;
    var first = Math.min(len, cap - start);
    out.set(ring.subarray(start, start + first), 0);
    if (len > first) out.set(ring.subarray(0, len - first), first);
    return out;
  }

  function pushLiveRing(chunk) {
    pushRingSamples(state.liveRing, 'liveRingWrite', 'liveRingTotal', chunk);
  }

  function readLiveRingTail(count) {
    return readRingTail(state.liveRing, 'liveRingWrite', 'liveRingTotal', count);
  }

  function estimateDomHzFast(samples, sr) {
    if (!samples || samples.length < 128) return 0;
    var rate = sr || 44100;
    var len = Math.min(1024, samples.length);
    var off = samples.length - len;
    var crossings = [];
    for (var i = 1; i < len; i++) {
      if (samples[off + i - 1] <= 0 && samples[off + i] > 0) crossings.push(i);
    }
    if (crossings.length >= 2) {
      var span = crossings[crossings.length - 1] - crossings[0];
      if (span > 0) {
        var hz = ((crossings.length - 1) * rate) / span;
        if (hz >= 35 && hz <= 2800) return Math.round(hz);
      }
    }
    return 0;
  }

  function setLiveScopeVisible(isVisible) {
    var bar = $('cockpit-live-scope-bar');
    if (bar) bar.classList.toggle('hidden', !isVisible);
    syncStickyCockpitOffset();
  }

  function pushLiveOscSample(samples, rms, elapsed, isActive) {
    state.liveOscActive = Boolean(isActive);
    setLiveScopeVisible(state.liveOscActive);

    if (samples && samples.length > 0) {
      var dst = state.liveOscFrame;
      if (!dst || dst.length !== 1024) {
        dst = new Float32Array(1024);
        state.liveOscFrame = dst;
      }
      var srcLen = samples.length;
      if (srcLen >= dst.length) {
        dst.set(samples.subarray(srcLen - dst.length), 0);
      } else {
        dst.copyWithin(0, srcLen);
        dst.set(samples, dst.length - srcLen);
      }
      var pk = 0;
      for (var i = 0; i < srcLen; i++) {
        var av = Math.abs(samples[i]);
        if (av > pk) pk = av;
      }
      var calcRms = typeof rms === 'number' && Number.isFinite(rms) ? rms : Math.min(1, pk * 0.707);
      state.liveOscRms = calcRms;
      state.liveOscPeakDb = 20 * Math.log10(Math.max(1e-5, Math.max(calcRms, pk * 0.5)));
      state.liveOscDomHz = calcRms > 0.007 ? estimateDomHzFast(samples, state.liveSr || 44100) : 0;
      state.liveOscElapsed = safeNum(elapsed, 0);
      if (isActive) {
        state.liveOscHistory.push({ peak: pk, rms: calcRms, clip: pk >= 0.96 });
        if (state.liveOscHistory.length > 140) state.liveOscHistory.shift();
      }
    }

    var recMetrics = $('rec-osc-metrics');
    var dockStatus = $('cockpit-osc-status');
    var dockReadout = $('cockpit-osc-readout');
    if (state.liveOscActive) {
      var dbTxt = (state.liveOscPeakDb > -85 ? state.liveOscPeakDb.toFixed(1) : '-inf') + ' dB';
      var hzTxt = state.liveOscDomHz > 0 ? state.liveOscDomHz + ' Hz' : '— Hz';
      var elTxt = state.liveOscElapsed.toFixed(1) + 's';
      var readStr = dbTxt + ' · ' + hzTxt + ' · ' + elTxt;
      if (recMetrics) recMetrics.textContent = readStr;
      if (dockReadout) dockReadout.textContent = readStr;
      if (dockStatus) dockStatus.textContent = state.isManualRecording ? 'LIVE RECORDING' : 'LIVE MIC MONITOR';
    } else {
      if (recMetrics) recMetrics.textContent = 'STANDBY';
      if (dockReadout) dockReadout.textContent = '-inf dB · — Hz · 0.0s';
    }
  }

  function drawRealtimeOscilloscope(canvas, compact) {
    var info = setupHiDpiCanvas(canvas);
    if (!info) return;
    var ctx = info.ctx;
    var w = info.w;
    var h = info.h;

    ctx.fillStyle = '#06120d';
    ctx.fillRect(0, 0, w, h);

    // Subtle CRT graticule
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.11)';
    ctx.lineWidth = 1;
    for (var gx = 1; gx < 8; gx++) {
      var x = (gx / 8) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (var gy = 1; gy < 4; gy++) {
      var y = (gy / 4) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    var midY = h / 2;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Determine source trace: live osc when active, or scrub window when playing back
    var trace = null;
    var isPlayMirror = false;
    if (state.liveOscActive) {
      trace = state.liveOscFrame;
    } else if (state.scrub) {
      var stScrub = state.scrub.getState();
      if (stScrub.playing || stScrub.scrubbing) {
        trace = state.scrub.getWindowAroundPlayhead(0.05);
        isPlayMirror = true;
      }
    }

    // Scrolling RMS/Peak history ribbon during live capture
    if (state.liveOscActive && state.liveOscHistory.length > 1) {
      var hist = state.liveOscHistory;
      var hw = w / 140;
      for (var hi = 0; hi < hist.length; hi++) {
        var hItem = hist[hi];
        var hx = w - (hist.length - hi) * hw;
        var hb = clamp(hItem.peak, 0, 1) * (h * 0.42);
        ctx.fillStyle = hItem.clip ? 'rgba(248, 113, 113, 0.22)' : 'rgba(52, 211, 153, 0.16)';
        ctx.fillRect(hx, midY - hb, Math.max(1.2, hw - 0.5), hb * 2);
      }
    }

    if (!trace || trace.length < 32) {
      if (!compact) {
        ctx.fillStyle = 'rgba(134, 239, 172, 0.6)';
        ctx.font = 'bold 10px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('STANDBY · PRESS RECORD OR LIVE MIC MONITOR', w / 2, midY - 6);
      }
      return;
    }

    // Rising zero-crossing trigger stabilization
    var dispLen = Math.min(512, trace.length);
    var searchLim = Math.max(1, trace.length - dispLen);
    var trigIdx = 0;
    for (var tIdx = 1; tIdx < searchLim; tIdx++) {
      if (trace[tIdx - 1] <= 0 && trace[tIdx] > 0) {
        trigIdx = tIdx;
        break;
      }
    }

    var pkFrame = 0.02;
    for (var sIdx = 0; sIdx < dispLen; sIdx++) {
      var sv = Math.abs(trace[trigIdx + sIdx]);
      if (sv > pkFrame) pkFrame = sv;
    }
    var gain = state.liveOscActive ? Math.min(4.2, 0.88 / Math.max(0.18, pkFrame)) : (0.85 / Math.max(0.04, pkFrame));

    var lblEl = document.querySelector('input[name="rec-label"]:checked');
    var curLbl = lblEl ? lblEl.value : 'real';
    var traceColor = pkFrame >= 0.96
      ? '#f87171'
      : state.liveOscActive && curLbl === 'fake'
      ? '#fb923c'
      : '#4ade80';

    var ampMax = h * 0.43;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Phosphor bloom + crisp bright beam
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0
        ? (traceColor === '#f87171' ? 'rgba(248,113,113,0.24)' : traceColor === '#fb923c' ? 'rgba(251,146,60,0.24)' : 'rgba(74,222,128,0.24)')
        : traceColor;
      ctx.lineWidth = pass === 0 ? 5 : 2;
      ctx.beginPath();
      for (var px = 0; px < dispLen; px++) {
        var xPos = (px / (dispLen - 1)) * w;
        var yNorm = clamp(trace[trigIdx + px] * gain, -1, 1);
        var yPos = midY - yNorm * ampMax;
        if (px === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      }
      ctx.stroke();
    }

    if (!compact) {
      ctx.fillStyle = state.liveOscActive ? '#fef08a' : '#86efac';
      ctx.font = 'bold 9px Consolas, monospace';
      ctx.textAlign = 'left';
      var tagTxt = state.liveOscActive
        ? (state.isManualRecording ? '● REC LIVE' : '● MONITOR LIVE')
        : (isPlayMirror ? '▶ DECK SCOPE' : 'SCOPE');
      ctx.fillText(tagTxt, 6, 12);
    }
  }

  function feedOscilloscopeFrame(samples, rms, elapsed, isActive) {
    pushLiveOscSample(samples, rms, elapsed, isActive);
    drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
    if (isActive) {
      drawRealtimeOscilloscope($('canvas-cockpit-oscilloscope'), true);
    }
  }

  function appendLiveEventLog(entry) {
    state.liveEvents.unshift(entry);
    if (state.liveEvents.length > 8) state.liveEvents.length = 8;
    var logEl = $('live-event-log');
    if (!logEl) return;
    logEl.innerHTML = state.liveEvents
      .map(function (ev, idx) {
        return (
          '<div class="tl-event-item" data-ev-idx="' +
          idx +
          '">' +
          '  <span>' +
          (ev.detected ? '🟢' : '🔴') +
          ' ' +
          esc(ev.name) +
          '</span>' +
          '  <strong>' +
          ev.detectScore +
          '% · ' +
          esc(ev.reasonShort) +
          '</strong>' +
          '</div>'
        );
      })
      .join('');
  }

  async function saveSpecimenWavToDisk(item) {
    if (!item) return null;
    var samples = item.clippedSamples || item.rawSamples;
    if (!samples || samples.length === 0) {
      showToast('No audio samples to save.', true);
      return null;
    }
    var sr = item.sampleRate || 44100;
    var b64 = TootTestLab.VinylScrub.encodeWavBase64(samples, sr);
    var resp = await fetch('/api/test/recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: item.label || 'real',
        name: item.name || 'Recorded Specimen',
        wavBase64: b64,
        sampleRate: sr,
        durationSec: samples.length / sr,
        notes: 'Captured in Toot Match TEST Autopsy Lab'
      })
    });
    var data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error((data && data.error) || 'Failed to save WAV');
    }
    var saved = data.file;
    var oldId = item.id;
    item.id = saved.id;
    item.filename = saved.filename;
    item.url = saved.url;
    item.storeType = 'testDisk';
    item.diskLabel = saved.label;
    item.isTestDisk = true;
    item.source = 'TEST Disk';
    if (oldId && oldId !== saved.id) {
      delete state.byId[oldId];
      if (state.selectedIds[oldId]) {
        delete state.selectedIds[oldId];
        state.selectedIds[saved.id] = true;
      }
      state.liveEvents.forEach(function (ev) {
        if (ev.itemId === oldId) ev.itemId = saved.id;
      });
    }
    state.byId[saved.id] = item;
    state.selectedIds[saved.id] = true;
    if (state.activeId === oldId) state.activeId = saved.id;
    if (state.autopsyAId === oldId) state.autopsyAId = saved.id;
    if (state.autopsyBId === oldId) state.autopsyBId = saved.id;
    renderAutopsySelectDropdowns();
    renderBankList();
    updateDeleteSelectedButton();
    updateCohortAnalytics();
    showToast('Saved WAV to TEST/recordings/' + saved.label + '/' + saved.filename);
    return saved;
  }

  /* ==================== ROOM BACKGROUND CONTROL & LOCK LIMITS ==================== */
  function applyBackgroundProfile(profile) {
    state.bgProfile = profile && profile.active ? profile : null;
    var box = document.querySelector('.tl-bg-control-box');
    var badge = $('bg-control-badge');
    var stEl = $('bg-control-status');
    var clrBtn = $('btn-clear-bg');

    if (state.bgProfile) {
      if (box) box.classList.add('is-active');
      if (badge) {
        badge.textContent = 'ACTIVE';
        badge.className = 'tl-pill tl-pill-ok';
      }
      if (clrBtn) clrBtn.classList.remove('hidden');
      if (stEl) {
        stEl.textContent =
          'Active: Blocking "' +
          state.bgProfile.character +
          '" below ' +
          state.bgProfile.rmsDbP90.toFixed(1) +
          ' dB · Sounds need +3 dB punch in 55–750 Hz bass core (from "' +
          state.bgProfile.name +
          '").';
      }
    } else {
      if (box) box.classList.remove('is-active');
      if (badge) {
        badge.textContent = 'OFF';
        badge.className = 'tl-pill tl-pill-muted';
      }
      if (clrBtn) clrBtn.classList.add('hidden');
      if (stEl) {
        stEl.textContent =
          'No room control sampled yet. Press Sample Room (3s) while TV or chatter plays normally.';
      }
    }

    renderBankList();
    evaluateAndUpdateDeckMeters();
    var act = getActiveSpecimen();
    drawLiveSpectrumCanvas(act ? act.telemetry : null, state.playbackSpectrumBins);
  }

  function clearBackgroundControl() {
    state.liveBgCalibrating = false;
    state.liveBgChunks = [];
    state.liveBgSamples = 0;
    applyBackgroundProfile(null);
    showToast('Room Background Control cleared.');
  }

  async function setBackgroundControlFromSpecimen(specId) {
    var targetId = specId || state.activeId;
    var item = targetId ? state.byId[targetId] : null;
    if (!item) {
      showToast('Load or select a specimen first.', true);
      return null;
    }
    await ensureDecoded(item);
    var samples = item.rawSamples && item.rawSamples.length ? item.rawSamples : item.clippedSamples;
    if (!samples || samples.length === 0) {
      showToast('Selected clip has no audio samples.', true);
      return null;
    }
    var prof = TootTestLab.DetectorLab.buildBackgroundControlProfile(samples, item.sampleRate || 44100, {
      name: item.name
    });
    if (!prof) {
      showToast('Could not analyze clip as room control.', true);
      return null;
    }
    applyBackgroundProfile(prof);
    showToast('Room Control set from "' + item.name + '" (' + prof.character + ').');
    return prof;
  }

  async function sampleRoomBackground3s() {
    var Audio = root.TootApp && root.TootApp.Audio;
    var btn = $('btn-sample-bg');
    var badge = $('bg-control-badge');
    var stEl = $('bg-control-status');
    if (!Audio) {
      showToast('Audio capture engine unavailable.', true);
      return;
    }
    if (state.liveMonitorActive) {
      await toggleLiveMicMonitor();
    }
    if (state.isManualRecording) {
      await toggleManualRecording();
    }
    if (state.isSamplingBg) {
      return;
    }

    state.isSamplingBg = true;
    state.liveOscHistory = [];
    state.liveOscActive = true;
    setLiveScopeVisible(true);
    if ($('cockpit-osc-status')) $('cockpit-osc-status').textContent = 'SAMPLING ROOM (3s)';
    if (btn) btn.disabled = true;
    if (badge) {
      badge.textContent = 'REC 0.0s';
      badge.className = 'tl-pill tl-pill-warn';
    }
    if (stEl) stEl.textContent = 'Sampling 3s of room background (TV, talking, dogs)... stay quiet!';

    try {
      await Audio.startRecording({
        maxDurationSec: 3.0,
        onLevel: function (samples, rms, elapsed) {
          if (badge) badge.textContent = 'BG ' + elapsed.toFixed(1) + '/3s';
          pushLiveOscSample(samples, rms, elapsed, true);
        },
        onAutoStop: function (res) {
          state.isSamplingBg = false;
          state.liveOscActive = false;
          setLiveScopeVisible(false);
          if (btn) btn.disabled = false;
          drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
          if (!res || !res.rawSamples || res.rawSamples.length === 0) {
            applyBackgroundProfile(state.bgProfile);
            showToast('Could not capture room audio.', true);
            return;
          }
          var prof = TootTestLab.DetectorLab.buildBackgroundControlProfile(res.rawSamples, res.sampleRate || 44100, {
            name: 'Live Room Control (3s)'
          });
          applyBackgroundProfile(prof);
          showToast('Room Background Control locked (' + (prof ? prof.character : 'Done') + ')!');
        }
      });
    } catch (err) {
      state.isSamplingBg = false;
      state.liveOscActive = false;
      setLiveScopeVisible(false);
      if (btn) btn.disabled = false;
      applyBackgroundProfile(state.bgProfile);
      showToast('Room sample failed: ' + (err && err.message ? err.message : err), true);
    }
  }

  function lockLimitsToCurrentSound() {
    var targetTel = null;
    var srcName = '';
    if ((state.liveMonitorActive || state.isManualRecording) && state.windowTelemetry && state.liveOscRms > 0.012) {
      targetTel = state.windowTelemetry;
      srcName = 'Live Mic Fart';
    } else {
      var act = getActiveSpecimen();
      if (act && act.telemetry && act.telemetry.metrics) {
        targetTel = act.telemetry;
        srcName = act.name;
      } else {
        var opA = resolveAutopsyOperand(state.autopsyAId);
        if (opA && opA.telemetry && opA.telemetry.metrics) {
          targetTel = opA.telemetry;
          srcName = opA.name;
        }
      }
    }

    if (!targetTel) {
      showToast('Load, play, or make a fart sound on the mic first!', true);
      return null;
    }

    var noiseAndDecoys = state.specimens.filter(function (s) {
      return s.decoded && s.telemetry && (s.label === 'noise' || s.label === 'fake');
    });

    var res = TootTestLab.DetectorLab.calibrateLimitsFromTarget(targetTel, state.config, {
      margin: 0.22,
      bgProfile: state.bgProfile,
      noiseItems: noiseAndDecoys
    });
    state.config = res.config;
    var selPreset = $('sel-preset');
    if (selPreset && Array.from(selPreset.options).some(function (o) { return o.value === 'custom'; })) {
      selPreset.value = 'custom';
    }
    syncCriteriaSlidersFromConfig();
    onConfigMutated();
    showToast('Locked limits to "' + srcName + '": ' + res.summaryText);
    return res;
  }

  async function finalizeLiveBurst() {
    var sr = state.liveSr || 44100;
    var totalLen = 0;
    for (var i = 0; i < state.liveTrigChunks.length; i++) totalLen += state.liveTrigChunks[i].length;
    if (totalLen < sr * 0.08) return;

    var rawBuf = new Float32Array(totalLen);
    var off = 0;
    for (var j = 0; j < state.liveTrigChunks.length; j++) {
      rawBuf.set(state.liveTrigChunks[j], off);
      off += state.liveTrigChunks[j].length;
    }

    var DSP = root.TootApp.DSP;
    var clipInfo = DSP.autoClipAudio(rawBuf, sr);
    var active = clipInfo && clipInfo.clipped && clipInfo.clipped.length > 0 ? clipInfo.clipped : rawBuf;
    var tel = TootTestLab.DetectorLab.extractFullTelemetry(active, sr, rawBuf, clipInfo, state.liveNoiseFloor);
    var ev = TootTestLab.DetectorLab.evaluateTelemetry(tel, state.config, state.bgProfile);

    var lblEl = document.querySelector('input[name="rec-label"]:checked');
    var lbl = lblEl ? lblEl.value : 'real';
    var baseName = ($('inp-rec-name') && $('inp-rec-name').value.trim()) || ('Live ' + formatLabelDisplay(lbl) + ' #' + (state.liveEvents.length + 1));

    if (ev.bgRejected) {
      appendLiveEventLog({
        itemId: null,
        name: baseName + ' (Ignored Room Noise)',
        detected: false,
        detectScore: ev.detectScore,
        reasonShort: 'ROOM_CTRL'
      });
      return;
    }

    var item = registerSpecimen({
      id: 'live_' + Date.now() + '_' + Math.floor(Math.random() * 999),
      name: baseName,
      label: lbl,
      storeType: 'session',
      source: 'Live Mic Capture',
      isTestDisk: false,
      rawSamples: rawBuf,
      clippedSamples: active,
      sampleRate: sr,
      clipInfo: clipInfo,
      telemetry: tel,
      durationSec: tel ? tel.durationSec : active.length / sr,
      decoded: true
    }, true);

    state.selectedIds[item.id] = true;
    appendLiveEventLog({
      itemId: item.id,
      name: item.name,
      detected: ev.detected,
      detectScore: ev.detectScore,
      reasonShort: ev.authBridgeRejected
        ? 'AUTH_REJECT'
        : ev.detected
        ? 'DETECTED'
        : (ev.failingIds[0] || 'BELOW_THR')
    });

    if ($('chk-auto-save-disk') && $('chk-auto-save-disk').checked && state.diskApiAvailable) {
      saveSpecimenWavToDisk(item).catch(function () {});
    }

    renderAutopsySelectDropdowns();
    renderBankList();
    updateCohortAnalytics();
  }

  function processLiveMicAudioChunk(buf) {
    if (!state.liveMonitorActive) return;
    pushLiveRing(buf);
    var sr = state.liveSr || 44100;

    var sumSq = 0;
    for (var i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    var rms = Math.sqrt(sumSq / Math.max(1, buf.length));
    state.liveFloorHist.push(rms);
    if (state.liveFloorHist.length > 40) state.liveFloorHist.shift();
    var sortedF = state.liveFloorHist.slice().sort(function (a, b) { return a - b; });
    var p20 = sortedF[Math.floor(sortedF.length * 0.20)] || 0.004;
    if (state.liveTrigPhase === 'idle') {
      state.liveNoiseFloor = clamp(p20, 0.0015, 0.035);
    }

    var now = performance.now();
    var elapsed = (now - (state.liveMonitorStartedAt || now)) / 1000;
    pushLiveOscSample(buf, rms, elapsed, true);

    if (state.liveBgCalibrating) {
      state.liveBgChunks.push(new Float32Array(buf));
      state.liveBgSamples += buf.length;
      var calSec = state.liveBgSamples / sr;
      var bgBadge = $('bg-control-badge');
      var bgSt = $('bg-control-status');
      var micSt = $('live-mic-status');
      if (bgBadge) {
        bgBadge.textContent = 'BG ' + Math.min(3.0, calSec).toFixed(1) + '/3s';
        bgBadge.className = 'tl-pill tl-pill-warn';
      }
      if (bgSt) bgSt.textContent = 'Auto-sampling Room Control (' + Math.min(3.0, calSec).toFixed(1) + '/3.0s) — let TV/room play...';
      if (micSt) micSt.textContent = 'Calibrating Room Control (' + Math.min(3.0, calSec).toFixed(1) + '/3.0s)...';

      if (state.liveBgSamples >= sr * 3.0) {
        var combined = new Float32Array(state.liveBgSamples);
        var bOff = 0;
        for (var bi = 0; bi < state.liveBgChunks.length; bi++) {
          combined.set(state.liveBgChunks[bi], bOff);
          bOff += state.liveBgChunks[bi].length;
        }
        state.liveBgCalibrating = false;
        state.liveBgChunks = [];
        state.liveBgSamples = 0;
        state.liveConsecHits = 0;
        var autoProf = TootTestLab.DetectorLab.buildBackgroundControlProfile(combined, sr, {
          name: 'Auto Room Control (3s)'
        });
        applyBackgroundProfile(autoProf);
        showToast('Room Control ready (' + (autoProf ? autoProf.character : 'OK') + ') — Listening for farts!');
      }
      return;
    }

    var rmsMul = getCriterionCfg('rmsNoiseMul').threshold;
    var needConsec = Math.max(1, Math.round(getCriterionCfg('triggerConsecFrames').threshold));
    var trigThresh = Math.max(0.008, state.liveNoiseFloor * rmsMul);
    if (state.bgProfile && state.bgProfile.active) {
      trigThresh = Math.max(trigThresh, state.bgProfile.rmsP90 * 1.35);
    }

    if (state.liveTrigPhase === 'idle') {
      if (rms >= trigThresh) {
        state.liveConsecHits++;
        if (state.liveConsecHits >= needConsec) {
          state.liveTrigPhase = 'capturing';
          var preTail = readLiveRingTail(Math.round(sr * 0.65));
          state.liveTrigChunks = preTail.length ? [preTail] : [new Float32Array(buf)];
          state.liveTrigSilSamples = 0;
        }
      } else {
        state.liveConsecHits = 0;
      }
    } else if (state.liveTrigPhase === 'capturing') {
      state.liveTrigChunks.push(new Float32Array(buf));
      var silFloor = Math.max(0.006, state.liveNoiseFloor * 1.8);
      if (state.bgProfile && state.bgProfile.active) {
        silFloor = Math.max(silFloor, state.bgProfile.rmsP90 * 1.05);
      }
      if (rms <= silFloor) state.liveTrigSilSamples += buf.length;
      else state.liveTrigSilSamples = 0;

      var capSamples = 0;
      for (var c = 0; c < state.liveTrigChunks.length; c++) capSamples += state.liveTrigChunks[c].length;
      if (state.liveTrigSilSamples >= sr * 0.75 || capSamples >= sr * 5.0) {
        state.liveTrigPhase = 'idle';
        state.liveConsecHits = 0;
        finalizeLiveBurst();
      }
    }

    if (now - state.liveLastMeterAt >= 85) {
      state.liveLastMeterAt = now;
      var win = readLiveRingTail(Math.round(sr * 0.45));
      if (win.length >= Math.round(sr * 0.12)) {
        var t0 = performance.now();
        state.windowTelemetry = TootTestLab.DetectorLab.extractFastSentryTelemetry(win, sr, state.liveNoiseFloor);
        state.lastLiveTickMs = performance.now() - t0;
        evaluateAndUpdateDeckMeters();
        var stEl = $('live-mic-status');
        if (stEl) {
          var bgTxt = state.bgProfile && state.bgProfile.active ? ' · Room Ctrl ON' : '';
          stEl.textContent =
            'Live Sentry ON · ' +
            state.lastLiveTickMs.toFixed(1) +
            'ms/tick · Floor ' +
            (state.liveNoiseFloor * 1000).toFixed(1) +
            'm · ' +
            (state.liveTrigPhase === 'capturing' ? 'CAPTURING...' : 'Listening (' + Math.round(state.detectTargetScore) + '%)') +
            bgTxt;
        }
      }
    }
  }

  async function toggleLiveMicMonitor() {
    var btn = $('btn-live-monitor');
    if (state.liveMonitorActive) {
      state.liveMonitorActive = false;
      state.liveBgCalibrating = false;
      state.liveBgChunks = [];
      state.liveBgSamples = 0;
      state.liveOscActive = false;
      state.windowTelemetry = null;
      setLiveScopeVisible(false);
      if ($('rec-osc-metrics')) $('rec-osc-metrics').textContent = 'STANDBY';
      if (state.liveMonitorScript) {
        state.liveMonitorScript.onaudioprocess = null;
        try { state.liveMonitorScript.disconnect(); } catch (e) {}
      }
      if (state.liveMonitorSource) try { state.liveMonitorSource.disconnect(); } catch (e2) {}
      if (state.liveMonitorZero) try { state.liveMonitorZero.disconnect(); } catch (e3) {}
      if (state.liveMonitorStream) {
        try { state.liveMonitorStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e4) {}
      }
      if (btn) {
        btn.textContent = '🔴 Live Mic Sentry Monitor: OFF';
        btn.classList.remove('is-live');
      }
      var stEl = $('live-mic-status');
      if (stEl) stEl.textContent = 'Live Mic Monitor stopped.';
      applyBackgroundProfile(state.bgProfile);
      evaluateAndUpdateDeckMeters();
      drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      showToast('Microphone API unavailable in this browser.', true);
      return;
    }

    try {
      var stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      var AC = root.AudioContext || root.webkitAudioContext;
      var ctx = state.liveMonitorCtx && state.liveMonitorCtx.state !== 'closed' ? state.liveMonitorCtx : new AC();
      if (ctx.state === 'suspended') await ctx.resume();
      state.liveMonitorCtx = ctx;
      state.liveMonitorStream = stream;
      state.liveSr = ctx.sampleRate || 44100;
      state.liveRing = new Float32Array(Math.round(state.liveSr * 5));
      state.liveRingWrite = 0;
      state.liveRingTotal = 0;
      state.liveFloorHist = [];
      state.liveNoiseFloor = 0.004;
      state.liveTrigPhase = 'idle';
      state.liveConsecHits = 0;
      state.liveOscHistory = [];
      state.liveMonitorStartedAt = performance.now();

      var autoBg = $('chk-auto-bg-before-live') && $('chk-auto-bg-before-live').checked && !(state.bgProfile && state.bgProfile.active);
      state.liveBgCalibrating = Boolean(autoBg);
      state.liveBgChunks = [];
      state.liveBgSamples = 0;

      state.liveMonitorActive = true;
      state.liveOscActive = true;
      setLiveScopeVisible(true);

      var src = ctx.createMediaStreamSource(stream);
      var script = ctx.createScriptProcessor(2048, 1, 1);
      var zero = ctx.createGain();
      zero.gain.value = 0;
      script.onaudioprocess = function (ev) {
        processLiveMicAudioChunk(ev.inputBuffer.getChannelData(0));
      };
      src.connect(script);
      script.connect(zero);
      zero.connect(ctx.destination);
      state.liveMonitorSource = src;
      state.liveMonitorScript = script;
      state.liveMonitorZero = zero;

      if (btn) {
        btn.textContent = '🟢 Live Mic Sentry Monitor: ON (Click to Stop)';
        btn.classList.add('is-live');
      }
      showToast(
        autoBg
          ? 'Sampling 3s room background before arming Auto-Detect — stay quiet!'
          : 'Live Mic Sentry Monitor armed — oscilloscope and meters active!'
      );
    } catch (err) {
      showToast('Microphone access failed: ' + (err && err.message ? err.message : err), true);
    }
  }

  async function toggleManualRecording() {
    var Audio = root.TootApp && root.TootApp.Audio;
    var btn = $('btn-record-toggle');
    var mimicBtn = $('btn-rec-mimic-b');
    var badge = $('rec-timer-badge');
    if (!Audio) return;

    if (state.liveMonitorActive) {
      await toggleLiveMicMonitor();
    }

    if (state.isManualRecording) {
      state.isManualRecording = false;
      state.liveOscActive = false;
      setLiveScopeVisible(false);
      if (btn) btn.textContent = '🎙️ Record Specimen';
      if (mimicBtn) mimicBtn.textContent = '🎙️ Record Decoy → B';
      if (badge) {
        badge.textContent = 'PROCESSING';
        badge.className = 'tl-pill tl-pill-warn';
      }
      var res = await Audio.stopRecording();
      handleManualRecResult(res);
      return;
    }

    try {
      state.isManualRecording = true;
      state.recLiveRing = new Float32Array(44100 * 2);
      state.recLiveRingWrite = 0;
      state.recLiveRingTotal = 0;
      state.recLastTelAt = 0;
      state.liveOscHistory = [];
      state.liveOscActive = true;
      setLiveScopeVisible(true);
      if (btn) btn.textContent = '⏹ Stop Recording & Evaluate';
      if (state.pendingRecordTarget === 'B' && mimicBtn) {
        mimicBtn.textContent = '⏹ Stop Decoy Recording';
      }
      if (badge) {
        badge.textContent = 'REC 0.0s';
        badge.className = 'tl-pill tl-pill-fake';
      }
      await Audio.startRecording({
        maxDurationSec: 7,
        onLevel: function (samples, rms, elapsed) {
          if (badge) badge.textContent = 'REC ' + elapsed.toFixed(1) + 's';
          pushLiveOscSample(samples, rms, elapsed, true);
          pushRingSamples(state.recLiveRing, 'recLiveRingWrite', 'recLiveRingTotal', samples);

          var now = performance.now();
          var sr = state.liveSr || 44100;
          if (now - state.recLastTelAt >= 95 && state.recLiveRingTotal >= Math.round(sr * 0.14)) {
            state.recLastTelAt = now;
            var win = readRingTail(state.recLiveRing, 'recLiveRingWrite', 'recLiveRingTotal', Math.round(sr * 0.4));
            if (win.length >= 1024) {
              var tRec0 = performance.now();
              state.windowTelemetry = TootTestLab.DetectorLab.extractFastSentryTelemetry(win, sr, null);
              state.lastLiveTickMs = performance.now() - tRec0;
              evaluateAndUpdateDeckMeters();
            }
          }
        },
        onAutoStop: function (res) {
          state.isManualRecording = false;
          state.liveOscActive = false;
          setLiveScopeVisible(false);
          if (btn) btn.textContent = '🎙️ Record Specimen';
          if (mimicBtn) mimicBtn.textContent = '🎙️ Record Decoy → B';
          handleManualRecResult(res);
        }
      });
    } catch (err) {
      state.isManualRecording = false;
      state.liveOscActive = false;
      state.pendingRecordTarget = null;
      setLiveScopeVisible(false);
      if (btn) btn.textContent = '🎙️ Record Specimen';
      if (mimicBtn) mimicBtn.textContent = '🎙️ Record Decoy → B';
      if (badge) {
        badge.textContent = 'IDLE';
        badge.className = 'tl-pill tl-pill-muted';
      }
      if ($('rec-osc-metrics')) $('rec-osc-metrics').textContent = 'STANDBY';
      drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
      showToast('Could not start recording: ' + (err && err.message ? err.message : err), true);
    }
  }

  async function handleManualRecResult(res) {
    state.liveOscActive = false;
    setLiveScopeVisible(false);
    if ($('rec-osc-metrics')) $('rec-osc-metrics').textContent = 'STANDBY';
    var badge = $('rec-timer-badge');
    if (badge) {
      badge.textContent = 'IDLE';
      badge.className = 'tl-pill tl-pill-muted';
    }
    var targetSlot = state.pendingRecordTarget;
    state.pendingRecordTarget = null;
    if (!res || !res.rawSamples || res.rawSamples.length === 0) {
      drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
      showToast('Recording captured no usable audio.', true);
      return;
    }
    var sr = res.sampleRate || 44100;
    var active = res.clippedSamples && res.clippedSamples.length ? res.clippedSamples : res.rawSamples;
    var tel = TootTestLab.DetectorLab.extractFullTelemetry(active, sr, res.rawSamples, res.clipInfo, null);
    var lblEl = document.querySelector('input[name="rec-label"]:checked');
    var lbl = lblEl ? lblEl.value : 'real';
    var name = ($('inp-rec-name') && $('inp-rec-name').value.trim()) ||
      (targetSlot === 'B' ? 'Decoy B #' + (state.specimens.length + 1) : 'Recorded ' + formatLabelDisplay(lbl) + ' #' + (state.specimens.length + 1));

    var item = registerSpecimen({
      id: 'rec_' + Date.now(),
      name: name,
      label: lbl,
      storeType: 'session',
      source: 'TEST Capture',
      isTestDisk: false,
      rawSamples: res.rawSamples,
      clippedSamples: active,
      sampleRate: sr,
      clipInfo: res.clipInfo,
      telemetry: tel,
      durationSec: tel ? tel.durationSec : active.length / sr,
      decoded: true
    }, true);

    state.selectedIds[item.id] = true;
    renderAutopsySelectDropdowns();
    await loadSpecimenOnDeck(item.id);
    if (targetSlot === 'B') {
      await setAutopsySlots(state.autopsyAId, item.id);
    }

    if ($('chk-auto-save-disk') && $('chk-auto-save-disk').checked && state.diskApiAvailable) {
      saveSpecimenWavToDisk(item).catch(function (err) {
        showToast('Disk save failed: ' + err.message, true);
      });
    }
    updateCohortAnalytics();
    drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
  }

  /* ==================== BULK ANALYZE SELECTED & FULL CORPUS ==================== */
  async function analyzeSelectedSpecimens(opts) {
    opts = opts || {};
    if (state.analyzingCohort) return;
    var toDecode = state.specimens.filter(function (it) {
      return (opts.all ? true : state.selectedIds[it.id]) && (!it.decoded || !it.telemetry);
    });
    if (toDecode.length === 0) {
      updateCohortAnalytics();
      if (!opts.silent) showToast('All selected specimens are already analyzed.');
      return;
    }

    state.analyzingCohort = true;
    var bar = $('cohort-decode-progress');
    var fill = $('cohort-decode-fill');
    var txt = $('cohort-decode-text');
    if (bar) bar.classList.remove('hidden');

    for (var i = 0; i < toDecode.length; i++) {
      try {
        await ensureDecoded(toDecode[i]);
      } catch (e) {}
      var pct = Math.round(((i + 1) / toDecode.length) * 100);
      if (fill) fill.style.width = pct + '%';
      if (txt) txt.textContent = 'Analyzing ' + (i + 1) + ' / ' + toDecode.length + '...';
      if (i % 3 === 2 || i === toDecode.length - 1) {
        renderBankList();
        updateCohortAnalytics();
        await new Promise(function (r) { setTimeout(r, 0); });
      }
    }

    state.analyzingCohort = false;
    if (bar) bar.classList.add('hidden');
    renderBankList();
    updateCohortAnalytics();
    renderAutopsyView();
    if (!opts.silent) showToast('Analyzed ' + toDecode.length + ' specimens.');
  }

  async function analyzeAllSpecimens(opts) {
    opts = opts || {};
    state.specimens.forEach(function (it) {
      state.selectedIds[it.id] = true;
    });
    renderBankList();
    return analyzeSelectedSpecimens({ all: true, silent: opts.silent });
  }

  /* ==================== AUDIO IMPORTS + DIRECTORY PICKER ==================== */
  async function handleImportFiles(files, forceDirDefaultReal) {
    var Audio = root.TootApp && root.TootApp.Audio;
    if (!Audio || !files || !files.length) return;
    var lblEl = document.querySelector('input[name="rec-label"]:checked');
    var selectedLbl = lblEl ? lblEl.value : 'fake';
    var audioRe = /\.(wav|mp3|m4a|ogg|webm|aac|flac)$/i;
    var imported = 0;
    var lastLoadedId = null;

    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!audioRe.test(f.name || '')) continue;
      if (/manifest\.json$/i.test(f.name || '')) continue;
      try {
        var rel = String(f.webkitRelativePath || f.name || '').toLowerCase();
        var itemLbl = forceDirDefaultReal || rel.indexOf('vaultpreloads') !== -1 || rel.indexOf('/real/') !== -1 || rel.indexOf('\\real\\') !== -1
          ? 'real'
          : rel.indexOf('/noise/') !== -1 || rel.indexOf('\\noise\\') !== -1
          ? 'noise'
          : selectedLbl;
        var dec = await Audio.decodeAudioFile(f);
        var sr = dec.sampleRate || 44100;
        var active = dec.clippedSamples && dec.clippedSamples.length ? dec.clippedSamples : dec.rawSamples;
        var tel = TootTestLab.DetectorLab.extractFullTelemetry(active, sr, dec.rawSamples, dec.clipInfo, null);
        var item = registerSpecimen({
          id: 'import_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 999),
          name: f.name.replace(/\.[^.]+$/, ''),
          label: itemLbl,
          storeType: 'session',
          source: forceDirDefaultReal ? 'Vault Folder' : 'Imported',
          isTestDisk: false,
          rawSamples: dec.rawSamples,
          clippedSamples: active,
          sampleRate: sr,
          clipInfo: dec.clipInfo,
          telemetry: tel,
          durationSec: tel ? tel.durationSec : active.length / sr,
          decoded: true
        }, true);
        state.selectedIds[item.id] = true;
        lastLoadedId = item.id;
        imported++;
      } catch (err) {}
    }

    if (imported > 0) {
      var banner = $('file-proto-banner');
      if (banner) banner.classList.add('hidden');
      renderAutopsySelectDropdowns();
      renderBankList();
      updateCohortAnalytics();
      if (lastLoadedId) await loadSpecimenOnDeck(lastLoadedId);
      if (!state.autopsyAId && lastLoadedId) await setAutopsySlots(lastLoadedId, state.autopsyBId);
      showToast('Imported ' + imported + ' audio file(s).');
    } else {
      showToast('No supported audio files found in selection.', true);
    }
  }

  /* ==================== INTERACTION WIRING (VINYL, WAVEFORM, AUTOPSY, CHARTS) ==================== */
  function clearAbTimers() {
    while (abPlayTimers.length) {
      clearTimeout(abPlayTimers.pop());
    }
  }

  function setDeckPlaybackRate(nextRate, autoPlayIfIdle) {
    var r = clamp(Math.round(Number(nextRate) * 20) / 20, -2.0, 2.5);
    if (Math.abs(r - 1.0) < 0.055) r = 1.0;
    if (Math.abs(r) < 0.055) r = 0.0;
    if ($('rng-deck-rate')) $('rng-deck-rate').value = String(r);
    if ($('lbl-deck-rate')) $('lbl-deck-rate').textContent = (r >= 0 ? '+' : '') + r.toFixed(2) + 'x';
    document.querySelectorAll('.tl-rate-pill').forEach(function (b) {
      b.classList.toggle('is-active', Math.abs(parseFloat(b.getAttribute('data-rate')) - r) < 0.02);
    });
    if (state.scrub) {
      var st = state.scrub.getState();
      if (autoPlayIfIdle && !st.playing && Math.abs(r) >= 0.08 && getActiveSpecimen()) {
        var loop = $('chk-deck-loop') ? $('chk-deck-loop').checked : true;
        state.scrub.play(r, loop);
      } else {
        state.scrub.setRate(r);
      }
    }
    drawSpeedJogWheel();
    return r;
  }

  function setWheelMode(mode) {
    state.wheelMode = mode === 'jog' ? 'jog' : 'speed';
    if ($('btn-wheel-speed')) $('btn-wheel-speed').classList.toggle('is-active', state.wheelMode === 'speed');
    if ($('btn-wheel-jog')) $('btn-wheel-jog').classList.toggle('is-active', state.wheelMode === 'jog');
    drawSpeedJogWheel();
  }

  function wireDeckInteractions() {
    var waveCanvas = $('canvas-scrub-wave');
    if (waveCanvas) {
      var draggingWave = false;
      var normFromPointer = function (ev) {
        var r = waveCanvas.getBoundingClientRect();
        return clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1);
      };
      waveCanvas.addEventListener('pointerdown', function (ev) {
        if (!state.scrub || !getActiveSpecimen()) return;
        draggingWave = true;
        if (waveCanvas.setPointerCapture) {
          try { waveCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
        }
        state.scrub.beginScrub(normFromPointer(ev));
        drawScrubWaveform();
        drawSpeedJogWheel();
      });
      waveCanvas.addEventListener('pointermove', function (ev) {
        if (!draggingWave || !state.scrub) return;
        state.scrub.moveScrub(normFromPointer(ev));
        drawScrubWaveform();
        drawSpeedJogWheel();
      });
      var finishWaveScrub = function (ev) {
        if (!draggingWave || !state.scrub) return;
        draggingWave = false;
        if (waveCanvas.releasePointerCapture) {
          try { waveCanvas.releasePointerCapture(ev.pointerId); } catch (e) {}
        }
        state.scrub.endScrub();
        state.windowTelemetry = null;
        evaluateAndUpdateDeckMeters();
        drawScrubWaveform();
        drawSpeedJogWheel();
      };
      waveCanvas.addEventListener('pointerup', finishWaveScrub);
      waveCanvas.addEventListener('pointercancel', finishWaveScrub);
    }

    var wheelCanvas = $('canvas-speed-wheel');
    if (wheelCanvas) {
      var draggingWheel = false;
      var lastAngle = 0;
      var angleOf = function (ev) {
        var r = wheelCanvas.getBoundingClientRect();
        return Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2));
      };
      var rateFromWheelPointer = function (ev) {
        var angDeg = angleOf(ev) * (180 / Math.PI);
        var rel = ((angDeg - 135) % 360 + 360) % 360;
        var frac = rel <= 270 ? rel / 270 : (rel <= 315 ? 1 : 0);
        return -2.0 + frac * 4.5;
      };
      wheelCanvas.addEventListener('pointerdown', function (ev) {
        if (!state.scrub || !getActiveSpecimen()) return;
        draggingWheel = true;
        if (wheelCanvas.setPointerCapture) {
          try { wheelCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
        }
        if (state.wheelMode === 'speed') {
          setDeckPlaybackRate(rateFromWheelPointer(ev), true);
        } else {
          lastAngle = angleOf(ev);
          state.scrub.beginScrub();
          drawSpeedJogWheel();
        }
      });
      wheelCanvas.addEventListener('pointermove', function (ev) {
        if (!draggingWheel || !state.scrub) return;
        if (state.wheelMode === 'speed') {
          setDeckPlaybackRate(rateFromWheelPointer(ev), true);
        } else {
          var a = angleOf(ev);
          var dA = a - lastAngle;
          if (dA > Math.PI) dA -= Math.PI * 2;
          else if (dA < -Math.PI) dA += Math.PI * 2;
          lastAngle = a;
          var st = state.scrub.getState();
          var turns = Math.max(1.2, Math.min(4.0, (st.durationSec || 1.0) * 1.8));
          state.scrub.nudgeByDeltaNorm(dA / (Math.PI * 2 * turns));
          drawScrubWaveform();
          drawSpeedJogWheel();
        }
      });
      var finishWheelDrag = function (ev) {
        if (!draggingWheel) return;
        draggingWheel = false;
        if (wheelCanvas.releasePointerCapture) {
          try { wheelCanvas.releasePointerCapture(ev.pointerId); } catch (e) {}
        }
        if (state.wheelMode === 'jog' && state.scrub) {
          state.scrub.endScrub();
          state.windowTelemetry = null;
          evaluateAndUpdateDeckMeters();
          drawScrubWaveform();
          drawSpeedJogWheel();
        }
      };
      wheelCanvas.addEventListener('pointerup', finishWheelDrag);
      wheelCanvas.addEventListener('pointercancel', finishWheelDrag);
      wheelCanvas.addEventListener('wheel', function (ev) {
        if (state.wheelMode !== 'speed' || !getActiveSpecimen()) return;
        ev.preventDefault();
        var cur = parseFloat($('rng-deck-rate').value);
        if (!Number.isFinite(cur)) cur = 1.0;
        setDeckPlaybackRate(cur + (ev.deltaY < 0 ? 0.05 : -0.05), false);
      }, { passive: false });
    }

    if ($('btn-wheel-speed')) $('btn-wheel-speed').addEventListener('click', function () { setWheelMode('speed'); });
    if ($('btn-wheel-jog')) $('btn-wheel-jog').addEventListener('click', function () { setWheelMode('jog'); });
    if ($('btn-wheel-reset-1x')) $('btn-wheel-reset-1x').addEventListener('click', function () { setDeckPlaybackRate(1.0, false); });

    $('btn-deck-play').addEventListener('click', function () {
      clearAbTimers();
      var active = getActiveSpecimen();
      if (!active || !state.scrub) return;
      var loop = $('chk-deck-loop') ? $('chk-deck-loop').checked : true;
      var rate = parseFloat($('rng-deck-rate').value);
      if (!Number.isFinite(rate) || Math.abs(rate) < 0.08) rate = 1.0;
      setDeckPlaybackRate(rate, false);
      state.scrub.play(rate, loop);
      drawSpeedJogWheel();
    });
    $('btn-deck-pause').addEventListener('click', function () {
      clearAbTimers();
      if (state.scrub) state.scrub.pause();
      state.windowTelemetry = null;
      state.playbackSpectrumBins = null;
      evaluateAndUpdateDeckMeters();
      drawSpeedJogWheel();
    });
    $('btn-deck-stop').addEventListener('click', function () {
      clearAbTimers();
      if (state.scrub) state.scrub.stop();
      state.windowTelemetry = null;
      state.playbackSpectrumBins = null;
      evaluateAndUpdateDeckMeters();
      drawScrubWaveform();
      drawSpeedJogWheel();
    });
    $('chk-deck-loop').addEventListener('change', function () {
      if (state.scrub) state.scrub.setRate(null, this.checked);
    });
    $('rng-deck-rate').addEventListener('input', function () {
      var r = parseFloat(this.value);
      if (!Number.isFinite(r)) r = 1.0;
      $('lbl-deck-rate').textContent = (r >= 0 ? '+' : '') + r.toFixed(2) + 'x';
      document.querySelectorAll('.tl-rate-pill').forEach(function (b) {
        b.classList.toggle('is-active', Math.abs(parseFloat(b.getAttribute('data-rate')) - r) < 0.02);
      });
      if (state.scrub) state.scrub.setRate(r);
      drawSpeedJogWheel();
    });
    document.querySelectorAll('.tl-rate-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var r = parseFloat(this.getAttribute('data-rate'));
        if (!Number.isFinite(r)) r = 1.0;
        setDeckPlaybackRate(r, false);
      });
    });

    // Quick A / B / A->B play from pinned cockpit (uses median representative if slot is a Group)
    function resolvePlayableIdForSlot(slotId) {
      if (!slotId) return null;
      if (!isGroupSlotId(slotId)) return state.byId[slotId] ? slotId : null;
      var op = resolveAutopsyOperand(slotId);
      return op && op.representativeId ? op.representativeId : null;
    }

    $('btn-play-a').addEventListener('click', async function () {
      clearAbTimers();
      var playId = resolvePlayableIdForSlot(state.autopsyAId);
      if (!playId) {
        showToast('No decoded specimen available in Slot A.', true);
        return;
      }
      if (isGroupSlotId(state.autopsyAId)) {
        showToast('Playing representative Real clip: ' + state.byId[playId].name);
      }
      await loadSpecimenOnDeck(playId);
      if (state.scrub) state.scrub.play(parseFloat($('rng-deck-rate').value) || 1.0, false);
    });
    $('btn-play-b').addEventListener('click', async function () {
      clearAbTimers();
      var playId = resolvePlayableIdForSlot(state.autopsyBId);
      if (!playId) {
        showToast('No Decoy clip in Slot B yet — record a Decoy first!', true);
        return;
      }
      if (isGroupSlotId(state.autopsyBId)) {
        showToast('Playing representative Decoy clip: ' + state.byId[playId].name);
      }
      await loadSpecimenOnDeck(playId);
      if (state.scrub) state.scrub.play(parseFloat($('rng-deck-rate').value) || 1.0, false);
    });
    $('btn-play-ab').addEventListener('click', async function () {
      clearAbTimers();
      var playA = resolvePlayableIdForSlot(state.autopsyAId);
      var playB = resolvePlayableIdForSlot(state.autopsyBId);
      if (!playA || !playB) {
        showToast('Need decoded specimens in both Slot A and Slot B to play A→B.', true);
        return;
      }
      await loadSpecimenOnDeck(playA);
      var itemA = state.byId[playA];
      var durAMs = Math.max(250, Math.round(((itemA && itemA.durationSec) || 0.6) * 1000));
      var rate = Math.abs(parseFloat($('rng-deck-rate').value) || 1.0) || 1.0;
      if (state.scrub) state.scrub.play(rate, false);
      abPlayTimers.push(setTimeout(async function () {
        await loadSpecimenOnDeck(playB);
        if (state.scrub) state.scrub.play(rate, false);
      }, Math.round(durAMs / rate) + 260));
    });
  }

  function wireChartInteractions() {
    var stripCanvas = $('canvas-strip-chart');
    if (stripCanvas) {
      var updateStripThrFromClientX = function (clientX, isFast) {
        var def = TootTestLab.DetectorLab.CRITERIA_BY_ID[state.stripCriterionId];
        if (!def) return;
        var rect = stripCanvas.getBoundingClientRect();
        var padL = 44;
        var padR = 22;
        var u = clamp((clientX - rect.left - padL) / Math.max(20, rect.width - padL - padR), 0, 1);
        var raw = def.min + u * (def.max - def.min);
        var snapped = def.step ? (def.min + Math.round((raw - def.min) / def.step) * def.step) : raw;
        state.config.criteria[def.id].threshold = clamp(Number(snapped.toFixed(3)), def.min, def.max);
        syncCriteriaSlidersFromConfig();
        onConfigMutated({ fast: Boolean(isFast) });
      };

      stripCanvas.addEventListener('pointerdown', function (ev) {
        var rect = stripCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        var best = null;
        var bestDist = 11;
        for (var i = 0; i < state.stripDotHits.length; i++) {
          var d = state.stripDotHits[i];
          var dist = Math.hypot(px - d.x, py - d.y);
          if (dist < bestDist) {
            bestDist = dist;
            best = d;
          }
        }
        if (best) {
          loadSpecimenOnDeck(best.item.id);
          return;
        }
        state.stripDragging = true;
        if (stripCanvas.setPointerCapture) try { stripCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
        updateStripThrFromClientX(ev.clientX, true);
      });
      stripCanvas.addEventListener('pointermove', function (ev) {
        var rect = stripCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        if (state.stripDragging) {
          updateStripThrFromClientX(ev.clientX, true);
          return;
        }
        var def = TootTestLab.DetectorLab.CRITERIA_BY_ID[state.stripCriterionId];
        var tip = $('strip-hover-tip');
        var found = null;
        for (var i = 0; i < state.stripDotHits.length; i++) {
          var d = state.stripDotHits[i];
          if (Math.hypot(px - d.x, py - d.y) <= d.r) {
            found = d;
            break;
          }
        }
        if (tip) {
          tip.textContent = found
            ? found.item.name + ' [' + formatLabelDisplay(found.item.label) + '] · ' + def.shortLabel + ' = ' + def.format(found.val) + ' (click to load)'
            : 'Hover dots to inspect · Drag red handle to tune threshold · Click dot to load onto deck';
        }
      });
      var endStrip = function () {
        if (state.stripDragging) {
          state.stripDragging = false;
          flushHeavyConfigRefresh();
        }
      };
      stripCanvas.addEventListener('pointerup', endStrip);
      stripCanvas.addEventListener('pointercancel', endStrip);
    }

    var scatterCanvas = $('canvas-scatter-chart');
    if (scatterCanvas) {
      scatterCanvas.addEventListener('pointermove', function (ev) {
        var rect = scatterCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        var found = null;
        for (var i = 0; i < state.scatterDotHits.length; i++) {
          var d = state.scatterDotHits[i];
          if (Math.hypot(px - d.x, py - d.y) <= d.r) {
            found = d;
            break;
          }
        }
        var Lab = TootTestLab.DetectorLab;
        var xd = Lab.CRITERIA_BY_ID[state.scatterXId];
        var yd = Lab.CRITERIA_BY_ID[state.scatterYId];
        var tip = $('scatter-hover-tip');
        if (tip) {
          tip.textContent = found
            ? found.item.name + ' [' + formatLabelDisplay(found.item.label) + '] · ' + xd.shortLabel + '=' + xd.format(found.xv) + ', ' + yd.shortLabel + '=' + yd.format(found.yv)
            : '🟢 Real Fart · 🟠 Decoy (Mouth) · ⚪ Noise · Click any dot to load & play';
        }
      });
      scatterCanvas.addEventListener('click', function (ev) {
        var rect = scatterCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        var best = null;
        var bestD = 12;
        for (var i = 0; i < state.scatterDotHits.length; i++) {
          var d = state.scatterDotHits[i];
          var dist = Math.hypot(px - d.x, py - d.y);
          if (dist < bestD) {
            bestD = dist;
            best = d;
          }
        }
        if (best) loadSpecimenOnDeck(best.item.id);
      });
    }

    wireCriteriaGraphInteractions();
  }

  function wireCriteriaGraphInteractions() {
    var graphCanvas = $('canvas-criteria-graph');
    if (!graphCanvas) return;

    function findColAtX(px) {
      var cols = state.criteriaGraphCols || [];
      for (var i = 0; i < cols.length; i++) {
        if (px >= cols[i].x0 && px <= cols[i].x1) return cols[i];
      }
      return null;
    }

    function applyDragThrAtY(col, py) {
      if (!col || !col.def) return;
      var def = col.def;
      var plotH = Math.max(20, col.plotBot - col.plotTop);
      var u = clamp((col.plotBot - py) / plotH, 0, 1);
      var raw = def.min + u * (def.max - def.min);
      var snapped = def.step ? (def.min + Math.round((raw - def.min) / def.step) * def.step) : raw;
      var nextThr = clamp(Number(snapped.toFixed(3)), def.min, def.max);
      var cCfg = getCriterionCfg(def.id);
      cCfg.threshold = nextThr;
      cCfg.enabled = true;
      if (!(safeNum(cCfg.weight, 0) > 0)) {
        cCfg.weight = def.defaultWeight > 0 ? def.defaultWeight : 1.0;
      }
      state.config.preset = 'custom';
      var selPreset = $('sel-preset');
      if (selPreset && Array.from(selPreset.options).some(function (o) { return o.value === 'custom'; })) {
        selPreset.value = 'custom';
      }
      syncCriteriaSlidersFromConfig();
      onConfigMutated({ fast: true });
      var tip = $('criteria-graph-tip');
      if (tip) {
        var modeStr = def.mode === 'min' ? '≥ ' : '≤ ';
        tip.textContent = 'Dragging ' + def.label + ' cutoff → ' + modeStr + def.format(nextThr);
      }
    }

    function formatHoverTip(col) {
      var def = col.def;
      var valStr = typeof col.val === 'number' ? def.format(col.val) : '—';
      var pkStr = typeof col.peakVal === 'number' ? def.format(col.peakVal) : '—';
      var cutStr = (def.mode === 'min' ? '≥' : '≤') + def.format(col.thr);
      var stStr = !col.enabled ? 'OFF' : (col.passed === true ? 'PASS' : col.passed === false ? 'FAIL' : 'WAIT');
      return def.label + ' · Val ' + valStr + ' · Peak ' + pkStr + ' · Cutoff ' + cutStr + ' [' + stStr + '] · Click to open row or drag knob';
    }

    graphCanvas.addEventListener('pointerdown', function (ev) {
      var rect = graphCanvas.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var py = ev.clientY - rect.top;
      var col = findColAtX(px);
      if (!col) return;

      if (Math.abs(py - col.thrY) <= 14) {
        state.criteriaGraphDragId = col.id;
        state.criteriaGraphPointerDown = null;
        if (graphCanvas.setPointerCapture) {
          try { graphCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
        }
        applyDragThrAtY(col, py);
      } else {
        state.criteriaGraphPointerDown = { id: col.id, x: px, y: py };
      }
    });

    graphCanvas.addEventListener('pointermove', function (ev) {
      var rect = graphCanvas.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var py = ev.clientY - rect.top;
      var cols = state.criteriaGraphCols || [];

      if (state.criteriaGraphDragId) {
        var dragCol = cols.find(function (c) { return c.id === state.criteriaGraphDragId; });
        if (dragCol) {
          graphCanvas.style.cursor = 'ns-resize';
          applyDragThrAtY(dragCol, py);
        }
        return;
      }

      var col = findColAtX(px);
      var nextHover = col ? col.id : null;
      var nearKnob = Boolean(col && Math.abs(py - col.thrY) <= 14);
      graphCanvas.style.cursor = nearKnob ? 'ns-resize' : (col ? 'pointer' : 'default');

      var tip = $('criteria-graph-tip');
      if (tip) {
        tip.textContent = col
          ? formatHoverTip(col)
          : 'Drag any cyan cutoff knob up/down to adjust · Click any criterion name or peak bar to jump to & expand its row';
      }
      if (nextHover !== state.criteriaGraphHoverId) {
        state.criteriaGraphHoverId = nextHover;
        drawCriteriaProfileGraph(getActiveTelemetryForCriteria());
      }
    });

    function endGraphPointer(ev, allowClick) {
      if (state.criteriaGraphDragId) {
        state.criteriaGraphDragId = null;
        state.criteriaGraphPointerDown = null;
        graphCanvas.style.cursor = 'default';
        drawCriteriaProfileGraph(getActiveTelemetryForCriteria());
        flushHeavyConfigRefresh();
        return;
      }
      if (allowClick && state.criteriaGraphPointerDown) {
        var down = state.criteriaGraphPointerDown;
        state.criteriaGraphPointerDown = null;
        var rect = graphCanvas.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        if (Math.hypot(px - down.x, py - down.y) <= 9) {
          var hitCol = findColAtX(px);
          focusAndOpenCriterion(hitCol ? hitCol.id : down.id);
        }
      } else {
        state.criteriaGraphPointerDown = null;
      }
    }

    graphCanvas.addEventListener('pointerup', function (ev) { endGraphPointer(ev, true); });
    graphCanvas.addEventListener('pointercancel', function (ev) { endGraphPointer(ev, false); });
    graphCanvas.addEventListener('pointerleave', function () {
      if (!state.criteriaGraphDragId && state.criteriaGraphHoverId) {
        state.criteriaGraphHoverId = null;
        drawCriteriaProfileGraph(getActiveTelemetryForCriteria());
      }
    });
  }

  function runCohortAutoSuggest() {
    var items = getSelectedDecodedItems();
    if (items.length < 2) {
      showToast('Select and analyze at least 2 specimens first.', true);
      return;
    }
    var res = TootTestLab.DetectorLab.suggestOptimalThresholds(items, state.config);
    state.config = res.config;
    state.config.preset = 'custom';
    var selPreset = $('sel-preset');
    if (selPreset && Array.from(selPreset.options).some(function (o) { return o.value === 'custom'; })) {
      selPreset.value = 'custom';
    }
    syncCriteriaSlidersFromConfig();
    onConfigMutated();
    if (res.summary.usedTwoClass) {
      showToast('Optimized limits from ' + res.summary.realCount + ' Real vs ' + res.summary.nonRealCount + ' Decoy/Noise!');
    } else {
      showToast('Calibrated P10–P90 envelope on ' + res.summary.realCount + ' Real farts. Add Decoy/Mouth sounds for 2-class tuning!');
    }
  }

  function flushHeavyConfigRefresh() {
    if (state.heavyRefreshTimer) {
      clearTimeout(state.heavyRefreshTimer);
      state.heavyRefreshTimer = null;
    }
    persistStoredConfig();
    renderBankList();
    renderAutopsyView();
  }

  function onConfigMutated(opts) {
    opts = opts || {};
    state.metersDirty = true;
    evaluateAndUpdateDeckMeters();
    updateCohortAnalytics();
    if (opts.fast) {
      if (state.heavyRefreshTimer) clearTimeout(state.heavyRefreshTimer);
      state.heavyRefreshTimer = setTimeout(flushHeavyConfigRefresh, 100);
      return;
    }
    flushHeavyConfigRefresh();
  }

  function wireControlsAndEvents() {
    var Lab = TootTestLab.DetectorLab;

    var selPreset = $('sel-preset');
    if (selPreset) {
      selPreset.innerHTML = Lab.PRESETS.map(function (p) {
        return '<option value="' + esc(p.id) + '">' + esc(p.label) + '</option>';
      }).join('');
      if (Lab.PRESETS.some(function (p) { return p.id === state.config.preset; })) {
        selPreset.value = state.config.preset;
      }
      selPreset.addEventListener('change', function () {
        state.config = Lab.createDefaultConfig(this.value);
        syncCriteriaSlidersFromConfig();
        onConfigMutated();
        showToast('Loaded preset: ' + this.options[this.selectedIndex].text);
      });
    }

    var critOpts = Lab.CRITERIA_DEFS.map(function (d) {
      return '<option value="' + esc(d.id) + '">' + esc(d.label) + '</option>';
    }).join('');
    ['sel-strip-criterion', 'sel-scatter-x', 'sel-scatter-y'].forEach(function (selId) {
      var el = $(selId);
      if (el) el.innerHTML = critOpts;
    });
    if ($('sel-strip-criterion')) {
      $('sel-strip-criterion').value = state.stripCriterionId;
      $('sel-strip-criterion').addEventListener('change', function () {
        state.stripCriterionId = this.value;
        drawStripDistributionChart();
      });
    }
    if ($('sel-scatter-x')) {
      $('sel-scatter-x').value = state.scatterXId;
      $('sel-scatter-x').addEventListener('change', function () {
        state.scatterXId = this.value;
        drawScatterClusterChart();
      });
    }
    if ($('sel-scatter-y')) {
      $('sel-scatter-y').value = state.scatterYId;
      $('sel-scatter-y').addEventListener('change', function () {
        state.scatterYId = this.value;
        drawScatterClusterChart();
      });
    }

    $('btn-auto-suggest').addEventListener('click', runCohortAutoSuggest);

    if ($('btn-lock-limits')) {
      $('btn-lock-limits').addEventListener('click', lockLimitsToCurrentSound);
    }
    if ($('btn-lock-limits-criteria')) {
      $('btn-lock-limits-criteria').addEventListener('click', lockLimitsToCurrentSound);
    }
    if ($('btn-graph-auto-active')) {
      $('btn-graph-auto-active').addEventListener('click', lockLimitsToCurrentSound);
    }
    if ($('btn-graph-auto-peaks')) {
      $('btn-graph-auto-peaks').addEventListener('click', lockLimitsToPeaks);
    }
    if ($('btn-graph-auto-cohort')) {
      $('btn-graph-auto-cohort').addEventListener('click', runCohortAutoSuggest);
    }
    if ($('btn-graph-reset-peaks')) {
      $('btn-graph-reset-peaks').addEventListener('click', function () {
        state.criteriaPeaks = {};
        updateCriteriaReadouts(getActiveTelemetryForCriteria());
        showToast('Peak-hold markers cleared.');
      });
    }
    if ($('btn-crit-expand-all')) {
      $('btn-crit-expand-all').addEventListener('click', function () {
        var defs = getSentryDefs();
        var openCnt = 0;
        for (var i = 0; i < defs.length; i++) if (state.expandedCriteria[defs[i].id]) openCnt++;
        setAllCriteriaExpanded(openCnt < defs.length);
      });
    }
    if ($('autopsy-findings')) {
      $('autopsy-findings').addEventListener('click', function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest('#btn-autopsy-pick-distinct') : null;
        if (!btn) return;
        var nextB =
          state.specimens.find(function (x) { return x.label === 'fake' && x.id !== state.autopsyAId; }) ||
          state.specimens.find(function (x) { return x.decoded && x.id !== state.autopsyAId; }) ||
          state.specimens.find(function (x) { return x.id !== state.autopsyAId; });
        if (nextB) {
          setAutopsySlots(state.autopsyAId, nextB.id);
        } else {
          showToast('No second distinct specimen available yet.', true);
        }
      });
    }
    if ($('btn-sample-bg')) {
      $('btn-sample-bg').addEventListener('click', sampleRoomBackground3s);
    }
    if ($('btn-bg-from-active')) {
      $('btn-bg-from-active').addEventListener('click', function () {
        setBackgroundControlFromSpecimen(state.activeId);
      });
    }
    if ($('btn-clear-bg')) {
      $('btn-clear-bg').addEventListener('click', clearBackgroundControl);
    }

    $('btn-copy-config').addEventListener('click', function () {
      var text = JSON.stringify(state.config, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showToast('Copied tuned thresholds & weights JSON!');
        }).catch(function () {
          showToast('Inspect TootTestLab.App.getState().config in console.');
        });
      } else {
        showToast('Config ready in console.');
      }
    });

    $('btn-reset-config').addEventListener('click', function () {
      var p = ($('sel-preset') && $('sel-preset').value) || 'sentry_v3';
      state.config = Lab.createDefaultConfig(p);
      syncCriteriaSlidersFromConfig();
      onConfigMutated();
      showToast('Reset parameters to preset defaults.');
    });

    var toggleBtn = $('btn-toggle-cockpit');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var hdr = $('tl-sticky-cockpit');
        var collapsed = hdr.classList.toggle('is-dials-collapsed');
        this.textContent = collapsed ? '▸ Dial' : '▾ Dial';
        this.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        if (!collapsed) state.metersDirty = true;
        syncStickyCockpitOffset();
      });
    }

    document.querySelectorAll('.tl-page-btn[data-lab-page]').forEach(function (pageBtn) {
      pageBtn.addEventListener('click', function () {
        setLabPage(this.getAttribute('data-lab-page') || 'sentry');
      });
    });

    if ($('btn-jump-to-auth')) {
      $('btn-jump-to-auth').addEventListener('click', function () {
        setLabPage('authenticity');
      });
    }

    document.querySelectorAll('.tl-wb-tab[data-auth-tab]').forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function () {
        setAuthSubTab(this.getAttribute('data-auth-tab') || 'spread');
      });
    });

    $('rng-master-thresh').addEventListener('input', function () {
      state.config.masterThreshold = Number(this.value);
      $('lbl-master-thresh').textContent = Math.round(state.config.masterThreshold) + '%';
      onConfigMutated({ fast: true });
    });
    $('rng-master-thresh').addEventListener('change', flushHeavyConfigRefresh);
    $('chk-hard-gate').addEventListener('change', function () {
      state.config.hardGateMode = Boolean(this.checked);
      onConfigMutated();
    });
    if ($('chk-sentry-bridge-auth')) {
      $('chk-sentry-bridge-auth').addEventListener('change', function () {
        state.config.bridgeAuthToSentry = Boolean(this.checked);
        syncAuthSlidersFromConfig();
        onConfigMutated();
        showToast(state.config.bridgeAuthToSentry ? 'Post-capture Anti-Mouth Filter enabled in Sentry.' : 'Post-capture Anti-Mouth Filter disabled (Sentry runs independent).');
      });
    }

    // Page 2 Master Controls + Spread Controls + Live Auth Controls
    if ($('rng-auth-thresh')) {
      $('rng-auth-thresh').addEventListener('input', function () {
        if (!state.config.auth) state.config.auth = Lab.createDefaultAuthConfig();
        state.config.auth.threshold = Number(this.value);
        if ($('lbl-auth-thresh')) $('lbl-auth-thresh').textContent = Math.round(state.config.auth.threshold) + '%';
        onConfigMutated({ fast: true });
      });
      $('rng-auth-thresh').addEventListener('change', flushHeavyConfigRefresh);
    }

    var triggerDecodeAll = function () { analyzeAllSpecimens(); };
    if ($('btn-cockpit-analyze-all')) $('btn-cockpit-analyze-all').addEventListener('click', triggerDecodeAll);
    if ($('btn-spread-analyze-all')) $('btn-spread-analyze-all').addEventListener('click', triggerDecodeAll);
    if ($('btn-spread-analyze-all-2')) $('btn-spread-analyze-all-2').addEventListener('click', triggerDecodeAll);

    var triggerRecDecoy = function () {
      var fakeRadio = document.querySelector('input[name="rec-label"][value="fake"]');
      if (fakeRadio) fakeRadio.checked = true;
      state.pendingRecordTarget = null;
      toggleManualRecording();
    };
    if ($('btn-cockpit-rec-decoy')) $('btn-cockpit-rec-decoy').addEventListener('click', triggerRecDecoy);
    if ($('btn-spread-rec-decoy')) $('btn-spread-rec-decoy').addEventListener('click', triggerRecDecoy);

    if ($('rng-spread-hit-thr')) {
      $('rng-spread-hit-thr').addEventListener('input', function () {
        state.spreadHitThreshold = clamp(parseFloat(this.value) || 0.25, 0.10, 0.60);
        if ($('lbl-spread-hit-thr')) $('lbl-spread-hit-thr').textContent = Math.round(state.spreadHitThreshold * 100) + '%';
        renderFrequencySpreadAndProfile();
      });
    }
    [
      { id: 'chk-spread-p1090', key: 'spreadShowP1090' },
      { id: 'chk-spread-minmax', key: 'spreadShowMinMax' },
      { id: 'chk-spread-traces', key: 'spreadShowTraces' },
      { id: 'chk-spread-zones', key: 'spreadShowZones' },
      { id: 'chk-spread-active', key: 'spreadShowActive' }
    ].forEach(function (pair) {
      var el = $(pair.id);
      if (el) {
        el.addEventListener('change', function () {
          state[pair.key] = Boolean(this.checked);
          drawFrequencySpreadCanvas(state.lastSpreadProfile);
        });
      }
    });

    if ($('btn-auth-auto-tune')) {
      $('btn-auth-auto-tune').addEventListener('click', function () {
        var corpus = getAllDecodedCorpusItems();
        if (corpus.length < 2) {
          showToast('Decode more clips first (click Decode All 48).', true);
          return;
        }
        var res = Lab.suggestOptimalAuthenticity(corpus, state.config);
        state.config = res.config;
        syncAuthSlidersFromConfig();
        onConfigMutated();
        if (res.summary.usedTwoClass) {
          showToast('Tuned Real vs. Mouth from ' + res.summary.realCount + ' Real & ' + res.summary.decoyCount + ' Mouth Decoys!');
        } else {
          showToast('Calibrated Real P10–P90 envelope across ' + res.summary.realCount + ' Real farts. Record Mouth Decoys for 2-class tuning.');
        }
      });
    }
    if ($('btn-auth-reset')) {
      $('btn-auth-reset').addEventListener('click', function () {
        state.config.auth = Lab.createDefaultAuthConfig();
        if ($('rng-auth-thresh')) $('rng-auth-thresh').value = '50';
        if ($('lbl-auth-thresh')) $('lbl-auth-thresh').textContent = '50%';
        syncAuthSlidersFromConfig();
        onConfigMutated();
        showToast('Reset Real vs. Mouth cutoffs to defaults.');
      });
    }
    if ($('btn-auth-push-sentry')) {
      $('btn-auth-push-sentry').addEventListener('click', function () {
        state.config.bridgeAuthToSentry = !Boolean(state.config.bridgeAuthToSentry);
        syncAuthSlidersFromConfig();
        onConfigMutated();
        showToast(state.config.bridgeAuthToSentry ? 'Enabled post-capture Anti-Mouth Filter in Auto Sentry.' : 'Disabled post-capture Anti-Mouth Filter in Auto Sentry.');
      });
    }

    if ($('auth-criteria-mount')) {
      $('auth-criteria-mount').addEventListener('input', function (ev) {
        var t = ev.target;
        var thrId = t.getAttribute('data-auth-thr');
        var wtId = t.getAttribute('data-auth-wt');
        if (!state.config.auth) state.config.auth = Lab.createDefaultAuthConfig();
        if (thrId && state.config.auth.criteria[thrId]) {
          state.config.auth.criteria[thrId].threshold = parseFloat(t.value);
          onConfigMutated({ fast: true });
        } else if (wtId && state.config.auth.criteria[wtId]) {
          state.config.auth.criteria[wtId].weight = parseFloat(t.value);
          onConfigMutated({ fast: true });
        }
      });
      $('auth-criteria-mount').addEventListener('change', function (ev) {
        var t = ev.target;
        var enId = t.getAttribute('data-auth-enable');
        if (!state.config.auth) state.config.auth = Lab.createDefaultAuthConfig();
        if (enId && state.config.auth.criteria[enId]) {
          state.config.auth.criteria[enId].enabled = Boolean(t.checked);
          onConfigMutated();
        } else if (t.getAttribute('data-auth-thr') || t.getAttribute('data-auth-wt')) {
          flushHeavyConfigRefresh();
        }
      });
    }

    // Autopsy controls + Group modes + Oscilloscope stop button
    $('sel-autopsy-a').addEventListener('change', function () {
      setAutopsySlots(this.value, state.autopsyBId);
    });
    $('sel-autopsy-b').addEventListener('change', function () {
      setAutopsySlots(state.autopsyAId, this.value);
    });
    $('chk-autopsy-norm-time').addEventListener('change', function () {
      state.autopsyNormTime = Boolean(this.checked);
      renderAutopsyView();
    });
    $('btn-autopsy-swap').addEventListener('click', function () {
      setAutopsySlots(state.autopsyBId, state.autopsyAId);
    });
    if ($('btn-mode-single')) {
      $('btn-mode-single').addEventListener('click', function () {
        var rItem = state.specimens.find(function (x) { return x.label === 'real'; }) || state.specimens[0] || null;
        var bItem = state.specimens.find(function (x) { return x.label === 'fake'; }) || state.specimens.find(function (x) { return rItem && x.id !== rItem.id; }) || rItem;
        if (rItem && bItem) setAutopsySlots(rItem.id, bItem.id);
      });
    }
    if ($('btn-mode-real-vs-decoys')) {
      $('btn-mode-real-vs-decoys').addEventListener('click', function () {
        state.specimens.forEach(function (it) { if (it.label === 'fake') state.selectedIds[it.id] = true; });
        setAutopsySlots(GROUP_REAL_ID, GROUP_DECOY_ID);
      });
    }
    if ($('btn-mode-one-vs-decoys')) {
      $('btn-mode-one-vs-decoys').addEventListener('click', function () {
        var act = getActiveSpecimen();
        var singleA = act && act.label === 'real' ? act.id : (state.specimens.find(function (x) { return x.label === 'real'; }) || state.specimens[0] || {}).id;
        state.specimens.forEach(function (it) { if (it.label === 'fake') state.selectedIds[it.id] = true; });
        setAutopsySlots(singleA, GROUP_DECOY_ID);
      });
    }
    $('btn-rec-mimic-b').addEventListener('click', function () {
      var fakeRadio = document.querySelector('input[name="rec-label"][value="fake"]');
      if (fakeRadio) fakeRadio.checked = true;
      state.pendingRecordTarget = 'B';
      toggleManualRecording();
    });
    $('btn-scrub-a').addEventListener('click', function () {
      var target = isGroupSlotId(state.autopsyAId)
        ? (resolveAutopsyOperand(state.autopsyAId) || {}).representativeId
        : state.autopsyAId;
      if (target) loadSpecimenOnDeck(target);
    });
    $('btn-scrub-b').addEventListener('click', function () {
      var target = isGroupSlotId(state.autopsyBId)
        ? (resolveAutopsyOperand(state.autopsyBId) || {}).representativeId
        : state.autopsyBId;
      if (target) loadSpecimenOnDeck(target);
    });
    if ($('btn-cockpit-stop-rec')) {
      $('btn-cockpit-stop-rec').addEventListener('click', function () {
        if (state.isSamplingBg && root.TootApp && root.TootApp.Audio) {
          root.TootApp.Audio.stopRecording().catch(function () {});
        } else if (state.isManualRecording) {
          toggleManualRecording();
        } else if (state.liveMonitorActive) {
          toggleLiveMicMonitor();
        }
      });
    }

    $('criteria-groups-mount').addEventListener('input', function (ev) {
      var t = ev.target;
      var thrId = t.getAttribute('data-crit-thr');
      var wtId = t.getAttribute('data-crit-wt');
      if (thrId) {
        state.config.criteria[thrId].threshold = parseFloat(t.value);
        if (thrId === state.stripCriterionId || thrId === state.scatterXId || thrId === state.scatterYId) {
          drawStripDistributionChart();
          drawScatterClusterChart();
        }
        onConfigMutated({ fast: true });
      } else if (wtId) {
        state.config.criteria[wtId].weight = parseFloat(t.value);
        onConfigMutated({ fast: true });
      }
    });
    $('criteria-groups-mount').addEventListener('change', function (ev) {
      var t = ev.target;
      var enId = t.getAttribute('data-crit-enable');
      if (enId) {
        state.config.criteria[enId].enabled = Boolean(t.checked);
        onConfigMutated();
      } else if (t.getAttribute('data-crit-thr') || t.getAttribute('data-crit-wt')) {
        flushHeavyConfigRefresh();
      }
    });
    $('criteria-groups-mount').addEventListener('click', function (ev) {
      var lockBtn = ev.target && ev.target.closest ? ev.target.closest('[data-crit-lock-one]') : null;
      if (lockBtn) {
        ev.stopPropagation();
        lockOneCriterionToActive(lockBtn.getAttribute('data-crit-lock-one'));
        return;
      }
      var resetBtn = ev.target && ev.target.closest ? ev.target.closest('[data-crit-reset-one]') : null;
      if (resetBtn) {
        ev.stopPropagation();
        resetOneCriterionToDefault(resetBtn.getAttribute('data-crit-reset-one'));
        return;
      }
      if (ev.target && ev.target.closest && ev.target.closest('input, button, label.tl-switch')) {
        return;
      }
      var rowSum = ev.target && ev.target.closest ? ev.target.closest('[data-crit-toggle]') : null;
      if (rowSum) {
        toggleCriterionRow(rowSum.getAttribute('data-crit-toggle'));
      }
    });
    $('criteria-groups-mount').addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      if (ev.target && ev.target.tagName === 'INPUT') return;
      var rowSum = ev.target && ev.target.closest ? ev.target.closest('[data-crit-toggle]') : null;
      if (rowSum) {
        ev.preventDefault();
        toggleCriterionRow(rowSum.getAttribute('data-crit-toggle'));
      }
    });

    $('btn-record-toggle').addEventListener('click', toggleManualRecording);
    $('btn-live-monitor').addEventListener('click', toggleLiveMicMonitor);

    document.querySelectorAll('[data-bank-filter]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('[data-bank-filter]').forEach(function (x) { x.classList.remove('is-active'); });
        this.classList.add('is-active');
        state.bankFilter = this.getAttribute('data-bank-filter') || 'all';
        renderBankList();
      });
    });
    $('inp-bank-search').addEventListener('input', function () {
      state.searchQuery = this.value || '';
      renderBankList();
    });
    $('btn-sel-visible').addEventListener('click', function () {
      getFilteredBankItems().forEach(function (it) { state.selectedIds[it.id] = true; });
      renderBankList();
      analyzeSelectedSpecimens();
    });
    $('btn-sel-real').addEventListener('click', function () {
      state.specimens.forEach(function (it) { if (it.label === 'real') state.selectedIds[it.id] = true; });
      renderBankList();
      analyzeSelectedSpecimens();
    });
    $('btn-sel-fake').addEventListener('click', function () {
      state.specimens.forEach(function (it) { if (it.label === 'fake') state.selectedIds[it.id] = true; });
      renderBankList();
      analyzeSelectedSpecimens();
    });
    $('btn-sel-clear').addEventListener('click', function () {
      state.selectedIds = {};
      renderBankList();
      updateDeleteSelectedButton();
      updateCohortAnalytics();
    });
    if ($('btn-delete-selected')) {
      $('btn-delete-selected').addEventListener('click', function () {
        var delIds = Object.keys(state.selectedIds).filter(function (id) {
          return state.selectedIds[id] && isDeletableSpecimen(state.byId[id]);
        });
        triggerTwoStepDelete('__bulk__', delIds);
      });
    }
    $('btn-analyze-selected').addEventListener('click', function () {
      analyzeSelectedSpecimens();
    });
    $('btn-analyze-all').addEventListener('click', function () {
      getFilteredBankItems().forEach(function (it) { state.selectedIds[it.id] = true; });
      renderBankList();
      analyzeSelectedSpecimens();
    });

    $('bank-list').addEventListener('click', function (ev) {
      var delBtn = ev.target.closest ? ev.target.closest('[data-delete-id]') : null;
      if (delBtn) {
        ev.stopPropagation();
        var did = delBtn.getAttribute('data-delete-id');
        if (did) triggerTwoStepDelete('row_' + did, [did]);
        return;
      }
      var pinA = ev.target.closest ? ev.target.closest('[data-pin-a]') : null;
      if (pinA) {
        ev.stopPropagation();
        setAutopsySlots(pinA.getAttribute('data-pin-a'), state.autopsyBId);
        return;
      }
      var pinB = ev.target.closest ? ev.target.closest('[data-pin-b]') : null;
      if (pinB) {
        ev.stopPropagation();
        setAutopsySlots(state.autopsyAId, pinB.getAttribute('data-pin-b'));
        return;
      }
      var chk = ev.target.closest ? ev.target.closest('[data-sel-id]') : null;
      if (chk) {
        ev.stopPropagation();
        var sid = chk.getAttribute('data-sel-id');
        state.selectedIds[sid] = Boolean(chk.checked);
        updateDeleteSelectedButton();
        updateCohortAnalytics();
        return;
      }
      var cyc = ev.target.closest ? ev.target.closest('[data-cycle-id]') : null;
      if (cyc) {
        ev.stopPropagation();
        var cid = cyc.getAttribute('data-cycle-id');
        var item = state.byId[cid];
        if (item) {
          var nextLbl = item.label === 'real' ? 'fake' : item.label === 'fake' ? 'noise' : 'real';
          item.label = nextLbl;
          state.tagOverrides[cid] = nextLbl;
          persistStoredTags();
          if (state.activeId === cid) {
            var lblPill = $('deck-label-pill');
            if (lblPill) {
              lblPill.textContent = formatLabelDisplay(nextLbl);
              lblPill.className = 'tl-pill tl-pill-' + nextLbl;
            }
          }
          renderAutopsySelectDropdowns();
          renderBankList();
          renderAutopsyView();
          updateCohortAnalytics();
        }
        return;
      }
      var row = ev.target.closest ? ev.target.closest('[data-item-id]') : null;
      if (row) {
        loadSpecimenOnDeck(row.getAttribute('data-item-id'));
      }
    });

    $('live-event-log').addEventListener('click', function (ev) {
      var itemEl = ev.target.closest ? ev.target.closest('[data-ev-idx]') : null;
      if (!itemEl) return;
      var idx = parseInt(itemEl.getAttribute('data-ev-idx'), 10);
      var entry = state.liveEvents[idx];
      if (entry && entry.itemId) {
        if (state.liveMonitorActive) toggleLiveMicMonitor();
        loadSpecimenOnDeck(entry.itemId);
      }
    });

    $('btn-cycle-tag').addEventListener('click', function () {
      var item = getActiveSpecimen();
      if (!item) return;
      var nextLbl = item.label === 'real' ? 'fake' : item.label === 'fake' ? 'noise' : 'real';
      item.label = nextLbl;
      state.tagOverrides[item.id] = nextLbl;
      persistStoredTags();
      var lblPill = $('deck-label-pill');
      if (lblPill) {
        lblPill.textContent = formatLabelDisplay(nextLbl);
        lblPill.className = 'tl-pill tl-pill-' + nextLbl;
      }
      renderAutopsySelectDropdowns();
      renderBankList();
      renderAutopsyView();
      updateCohortAnalytics();
    });

    $('btn-save-disk').addEventListener('click', async function () {
      var item = getActiveSpecimen();
      if (!item) return;
      if (!state.diskApiAvailable) {
        showToast('Disk API unavailable — use Download WAV instead.', true);
        return;
      }
      try {
        await saveSpecimenWavToDisk(item);
      } catch (err) {
        showToast('Save failed: ' + err.message, true);
      }
    });

    $('btn-download-wav').addEventListener('click', function () {
      var item = getActiveSpecimen();
      if (!item) return;
      var samples = item.clippedSamples || item.rawSamples;
      if (!samples || samples.length === 0) return;
      var blob = TootTestLab.VinylScrub.encodeWavBlob(samples, item.sampleRate || 44100);
      var url = root.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (item.name || 'specimen').replace(/[^a-z0-9_-]+/gi, '_') + '.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { root.URL.revokeObjectURL(url); }, 1500);
    });

    $('btn-delete-disk').addEventListener('click', function () {
      var item = getActiveSpecimen();
      if (!item || !isDeletableSpecimen(item)) return;
      triggerTwoStepDelete('deck_' + item.id, [item.id]);
    });

    $('inp-import-audio').addEventListener('change', function () {
      if (this.files && this.files.length) handleImportFiles(this.files, false);
      this.value = '';
    });
    $('inp-import-folder').addEventListener('change', function () {
      if (this.files && this.files.length) handleImportFiles(this.files, true);
      this.value = '';
    });

    var dropZone = $('bank-drop-zone');
    if (dropZone) {
      dropZone.addEventListener('dragover', function (ev) {
        ev.preventDefault();
        dropZone.classList.add('is-drag-over');
      });
      dropZone.addEventListener('dragleave', function () {
        dropZone.classList.remove('is-drag-over');
      });
      dropZone.addEventListener('drop', function (ev) {
        ev.preventDefault();
        dropZone.classList.remove('is-drag-over');
        if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
          handleImportFiles(ev.dataTransfer.files, false);
        }
      });
    }

    wireDeckInteractions();
    wireChartInteractions();
    wireSpreadAndAuthInteractions();
  }

  /* ==================== ANIMATION LOOP ==================== */
  var lastAnimTs = 0;
  function animationFrame(ts) {
    if (!lastAnimTs) lastAnimTs = ts;
    var dt = Math.min(0.05, Math.max(0.004, (ts - lastAnimTs) / 1000));
    lastAnimTs = ts;

    var dA = state.detectMeterAnim;
    var aA = state.authMeterAnim;
    var metersMoving =
      state.metersDirty ||
      Math.abs(dA.velocity) > 0.04 ||
      Math.abs(state.detectTargetScore - dA.current) > 0.08 ||
      Math.abs(dA.peak - dA.current) > 0.08 ||
      Math.abs(aA.velocity) > 0.04 ||
      Math.abs(state.authTargetScore - aA.current) > 0.08 ||
      Math.abs(aA.peak - aA.current) > 0.08;

    if (metersMoving) {
      stepSpringMeter(dA, state.detectTargetScore, dt);
      stepSpringMeter(aA, state.authTargetScore, dt);

      var settled =
        Math.abs(dA.velocity) <= 0.04 &&
        Math.abs(state.detectTargetScore - dA.current) <= 0.08 &&
        Math.abs(dA.peak - dA.current) <= 0.08 &&
        Math.abs(aA.velocity) <= 0.04 &&
        Math.abs(state.authTargetScore - aA.current) <= 0.08 &&
        Math.abs(aA.peak - aA.current) <= 0.08;
      if (settled) {
        dA.current = dA.target;
        dA.peak = dA.target;
        dA.velocity = 0;
        aA.current = aA.target;
        aA.peak = aA.target;
        aA.velocity = 0;
      }
      state.metersDirty = false;

      var ev = state.liveEvalResult;
      drawAnalogPointerMeter(
        $('canvas-detect-meter'),
        'FART DETECT CONFIDENCE',
        dA.current,
        dA.peak,
        state.config ? state.config.masterThreshold : 54,
        'detect',
        {
          hasEval: Boolean(ev),
          detected: Boolean(ev && ev.detected),
          hardGateBlocked: Boolean(ev && ev.hardGateBlocked),
          bgRejected: Boolean(ev && ev.bgRejected),
          authRejected: Boolean(ev && ev.authBridgeRejected)
        }
      );
      var authSplit = (state.config && state.config.auth && typeof state.config.auth.threshold === 'number')
        ? state.config.auth.threshold
        : 50;
      drawAnalogPointerMeter(
        $('canvas-auth-meter'),
        'DECOY MOUTH <--> REAL ORGANIC',
        aA.current,
        aA.peak,
        authSplit,
        'auth',
        { hasEval: Boolean(ev) }
      );
    }

    var scrubSt = state.scrub ? state.scrub.getState() : { playing: false, scrubbing: false };
    var liveOrRec = state.liveOscActive || state.liveMonitorActive || state.isManualRecording || state.isSamplingBg;

    if (liveOrRec || scrubSt.playing || scrubSt.scrubbing) {
      if (ts - state.lastDeckRedrawMs >= 30) {
        state.lastDeckRedrawMs = ts;
        if (scrubSt.playing || scrubSt.scrubbing) {
          drawSpeedJogWheel();
          if (ts - state.lastPlaySpecAt >= 55) {
            state.lastPlaySpecAt = ts;
            var win = state.scrub.getWindowAroundPlayhead(0.08);
            if (win && win.length >= 256) {
              state.playbackSpectrumBins = TootTestLab.DetectorLab.computeSpectrumBins64(win, scrubSt.sampleRate || 44100).bins;
              var actItem = getActiveSpecimen();
              drawLiveSpectrumCanvas(actItem ? actItem.telemetry : null, state.playbackSpectrumBins);
            }
          }
        }
        drawScrubWaveform();
        drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
        if (liveOrRec) {
          drawRealtimeOscilloscope($('canvas-cockpit-oscilloscope'), true);
        }
      }
    }

    root.requestAnimationFrame(animationFrame);
  }

  /* ==================== BOOTSTRAP ==================== */
  async function bootstrap() {
    loadStoredTags();
    loadStoredConfig();

    state.scrub = TootTestLab.VinylScrub.create({
      onEnded: function () {
        state.windowTelemetry = null;
        state.playbackSpectrumBins = null;
        evaluateAndUpdateDeckMeters();
        drawScrubWaveform();
        drawSpeedJogWheel();
        drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
      }
    });

    buildCriteriaDom();
    buildAuthCriteriaDom();
    syncCriteriaSlidersFromConfig();
    wireControlsAndEvents();
    var initHash = String((root.location && root.location.hash) || '').toLowerCase();
    setLabPage(initHash === '#authenticity' ? 'authenticity' : 'sentry');
    syncStickyCockpitOffset();

    var stickyCockpitEl = $('tl-sticky-cockpit');
    if (typeof root.ResizeObserver === 'function' && stickyCockpitEl) {
      new root.ResizeObserver(syncStickyCockpitOffset).observe(stickyCockpitEl);
    }

    await checkDiskRecordings();
    await loadPreloadsAndIndexedDb();

    // Auto-select first 10 Real farts + all User Recordings, Vault Decoys & TEST Disk clips
    var rPicked = 0;
    for (var i = 0; i < state.specimens.length; i++) {
      var s = state.specimens[i];
      if (s.label === 'fake' || s.label === 'noise' || isDeletableSpecimen(s)) {
        state.selectedIds[s.id] = true;
      } else if (s.label === 'real' && rPicked < 10) {
        state.selectedIds[s.id] = true;
        rPicked++;
      }
    }

    // Initialize Autopsy Slots A (first Real) & B (first Decoy, or matched target, or second Real)
    var firstReal = state.specimens.find(function (x) { return x.label === 'real'; }) || state.specimens[0] || null;
    var firstDecoy = state.specimens.find(function (x) { return x.label === 'fake'; }) || null;
    if (firstDecoy && firstDecoy.sampleId) {
      var pairedTarget = state.specimens.find(function (x) { return x.id === firstDecoy.sampleId || x.id === 'vault_' + firstDecoy.sampleId; });
      if (pairedTarget) firstReal = pairedTarget;
    }
    var slotBDefault = firstDecoy || state.specimens.find(function (x) { return firstReal && x.id !== firstReal.id; }) || firstReal;

    state.autopsyAId = firstReal ? firstReal.id : null;
    state.autopsyBId = slotBDefault ? slotBDefault.id : null;

    renderAutopsySelectDropdowns();
    renderBankList();
    drawSpeedJogWheel();
    drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);

    if (firstReal) {
      await loadSpecimenOnDeck(firstReal.id);
    }
    await analyzeSelectedSpecimens({ silent: true });
    if (state.autopsyAId && state.autopsyBId) {
      await setAutopsySlots(state.autopsyAId, state.autopsyBId);
    }

    root.addEventListener('resize', function () {
      syncStickyCockpitOffset();
      state.metersDirty = true;
      redrawActivePageCanvases();
      drawRealtimeOscilloscope($('canvas-rec-oscilloscope'), false);
      if (state.liveOscActive) drawRealtimeOscilloscope($('canvas-cockpit-oscilloscope'), true);
    });

    root.requestAnimationFrame(animationFrame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  TootTestLab.App = {
    getState: function () { return state; },
    loadSpecimenById: loadSpecimenOnDeck,
    setAutopsySlots: setAutopsySlots,
    setLabPage: setLabPage,
    setAuthSubTab: setAuthSubTab,
    setWorkbenchView: setWorkbenchView,
    setWheelMode: setWheelMode,
    setBackgroundControlFromSpecimen: setBackgroundControlFromSpecimen,
    clearBackgroundControl: clearBackgroundControl,
    lockLimitsToCurrentSound: lockLimitsToCurrentSound,
    lockLimitsToPeaks: lockLimitsToPeaks,
    focusAndOpenCriterion: focusAndOpenCriterion,
    toggleCriterionRow: toggleCriterionRow,
    drawCriteriaProfileGraph: function () { return drawCriteriaProfileGraph(getActiveTelemetryForCriteria()); },
    renderFrequencySpreadAndProfile: renderFrequencySpreadAndProfile,
    deleteSpecimenById: function (id) { return deleteSpecimensByIds([id]); },
    deleteSpecimensByIds: deleteSpecimensByIds,
    feedOscilloscopeFrame: feedOscilloscopeFrame,
    analyzeSelected: analyzeSelectedSpecimens,
    analyzeAllSpecimens: analyzeAllSpecimens,
    updateCohortAnalytics: updateCohortAnalytics,
    setConfig: function (nextCfg) {
      state.config = nextCfg;
      syncCriteriaSlidersFromConfig();
      onConfigMutated();
    },
    getScrubEngine: function () { return state.scrub; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
