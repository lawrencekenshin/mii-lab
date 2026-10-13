






(function () {
  'use strict';

  var LW_URL = 'https://cdn.jsdelivr.net/npm/lightweight-charts@5.2.1/dist/lightweight-charts.standalone.production.js';
  var LW = window.LightweightCharts || null, lwPromise = null;
  function loadLW() {
    if (window.LightweightCharts) { LW = window.LightweightCharts; return Promise.resolve(LW); }
    if (lwPromise) return lwPromise;
    lwPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script'), done = false;
      var fin = function (ok, why) {
        if (done) return; done = true; clearTimeout(t);
        if (ok && window.LightweightCharts) { LW = window.LightweightCharts; resolve(LW); }
        else { lwPromise = null; console.warn('Sornette: chart library', why); reject(new Error(why)); }
      };
      var t = setTimeout(function () { fin(false, 'timeout'); }, 10000);
      s.src = LW_URL; s.async = true;
      s.onload = function () { fin(true); };
      s.onerror = function () { fin(false, 'load error'); };
      document.head.appendChild(s);
    });
    return lwPromise;
  }

  function withLW(el, draw, fallback) {
    if (LW) { draw(LW); return; }
    loadLW().then(function () { if (el && el.isConnected) draw(LW); }, function () { if (el && el.isConnected) fallback(); });
  }
  var $ = function (id) { return document.getElementById(id); };
  var C = {bg: '#131722', panel: '#1E222D', panel2: '#181C27', line: '#2A2E39', line2: '#363A45', text: '#D1D4DC', muted: '#8A8E99', ink2: '#B2B5BE',
           white: '#FFFFFF', accent: '#7E57C2', light: '#B39DDB', amber: '#F5B84B', teal: '#26A69A', miss: '#667085', fail: '#4A5060', slate: '#5B6275',
           k: '#FFFFFF', d: '#FFD54F', j: '#B388FF', upx: '#EF5350', brk: '#FF8A80', gauge: '#9C7FE0'};
  var FONT = '-apple-system,BlinkMacSystemFont,Roboto,Segoe UI,Helvetica Neue,Arial,sans-serif';
  var SNAP = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/sornette-data/sornette/' : 'snap/pub/';
  var STR = {
    loading: 'Loading the readings...',
    noData: 'No valid readings for this symbol.',
    warmup: 'Not enough completed history yet.',
    missing: 'A required day is missing. This reading is unavailable.',
    numFail: 'The fit did not finish its numerical checks. No reading today.',
    partial: '{eligible} of {configured} time scales have complete prices.',
    unresolved: '{unresolved} time scales could not be solved; they still count in the total.',
    timingAbsent: 'Too few passing time scales to show a range.',
    timingFloor: 'The turn date sits right at today, so no range is shown.',
    inProgress: 'In progress through {dataThrough}; ends {periodEnd}.',
    stale: 'Price through {priceDate}; bubble test through {modelDate}.',
    refreshNull: 'The latest price refresh was incomplete. Showing the last good prices.',
    kdjFlat: 'The count has not changed lately.',
    reqError: 'Could not load this part of the page. The rest is still shown.'
  };
  var NOCHART = 'Charts could not load in this browser. The numbers above are unaffected.';
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }


  var CHECKS = [
    ['f', 'The fit finished', 'Fit did not finish'],
    ['s', 'The maths is stable', 'Maths unstable'],
    ['v', 'Price actually moved', 'Price barely moved'],
    ['a', 'The curve has a clear size', 'Curve size unclear'],
    ['t', 'Turn date is neither already here nor far off', 'Turn date out of range'],
    ['m', 'The climb bends the right amount', 'Climb bends the wrong amount'],
    ['w', 'Wiggle speed is in range', 'Wiggles too fast or too slow'],
    ['d', 'The climb outweighs the wiggles', 'Wiggles too big for the climb'],
    ['c', 'Enough wiggles', 'Too few wiggles'],
    ['e', 'Curve stays close to the price every day', 'Curve strays too far from the price']
  ];
  var CHK = {};
  CHECKS.forEach(function (c, i) { CHK[c[0]] = {i: i, pass: c[1], fail: c[2]}; });

  var CODE = {t: 't', m: 'm', w: 'w', d: 'd', c: 'c', e: 'e', a: 'a', v: 'v'};

  var WHYCOL = {t: '#5C6BC0', m: '#8E6FC9', w: '#3F8FC4', d: '#9A9A3A', c: '#A1887F', e: '#B07AA1', a: '#78909C', v: '#546E7A'};

  var PAPERCOL = {A: '#FBE0AA', B: '#9ED9D2'};





  function hasTrust() { return !!(S.d && S.d.series.lp.tp); }
  function lpArr(kind, dir) {
    var lp = S.d.series.lp, neg = dir === 'neg';
    if (kind === 'trust' && lp.tp) return neg ? lp.tn || [] : lp.tp;
    if (kind === 'shape' && lp.sp) return neg ? lp.sn || [] : lp.sp;
    return neg ? lp.neg : lp.pos;
  }

  function rulesOf(ov) {
    var c = ov && ov.c13, t = ov && ov.trust;
    if (!c) return null;
    return {pos: t ? t.pos || 0 : c.pos || 0, neg: t ? t.neg || 0 : c.neg || 0, sPos: c.pos || 0, sNeg: c.neg || 0, E: c.E, paper: !!t,
            tp: t ? t.tp : c.tp};
  }
  function trustEvents() { var t = S.d.series.tevents; return (t && t.length ? t : null) || S.d.series.events || []; }

  function failsUnder(i, rule) {
    var T = S.d && S.d.today;
    if (!T) return null;
    var x = T[rule === 'strict' ? 's' : 'p'][i];
    return x == null ? null : x.split('');
  }
  function failText(k) { return CHK[k] ? CHK[k].fail : k; }

  var FAMILY_ORDER = ['SPY', 'GSPC', 'QQQ', 'NDX', 'SMH', 'SOX', 'EWY', 'EWT'];
  var PAIRS = [['SPY', 'GSPC'], ['QQQ', 'NDX'], ['SMH', 'SOX'], ['EWY'], ['EWT']];
  var TICK = {SPY: 'SPY', GSPC: 'S&P 500', QQQ: 'QQQ', NDX: 'NDX', SMH: 'SMH', SOX: 'SOX', EWY: 'EWY', EWT: 'EWT'};
  var PILL = {SPY: 'SPY', GSPC: 'S&P 500', QQQ: 'QQQ', NDX: 'Nasdaq-100', SMH: 'SMH', SOX: 'SOX', EWY: 'EWY', EWT: 'EWT'};
  var PLAIN = {SPY: 'S&P 500 ETF', GSPC: 'S&P 500 index', QQQ: 'Nasdaq-100 ETF', NDX: 'Nasdaq-100 index', SMH: 'Chip stocks ETF',
               SOX: 'Chip stocks index', EWY: 'South Korea ETF', EWT: 'Taiwan ETF'};
  var GROUPS = [['US broad', ['SPY', 'GSPC']], ['US growth', ['QQQ', 'NDX']], ['Semiconductors', ['SMH', 'SOX']], ['Korea', ['EWY']], ['Taiwan', ['EWT']]];
  var COMP = {GSPC: 'SPY', NDX: 'QQQ', SOX: 'SMH'};
  var SHORTN = {SPY: 'S&P 500', QQQ: 'Nasdaq-100', SMH: 'Chips', EWY: 'Korea', EWT: 'Taiwan'};
  var KST = {b: 'Heating up', f: 'Cooling down', n: 'Steady', x: 'Flat', w: 'Too little history', u: 'Unavailable'};
  var TFN = {D: 'Daily', W: 'Weekly', '2W': '2-week', M: 'Monthly'};
  var RANGES = ['1y', '3y', '5y', '2013', 'all'];

  var S = {sym: 'QQQ', man: null, d: null, range: '5y', runRange: '2013', weakRange: '1y', heatMode: 'pass', heatRange: 'all',
           kin: 'shape', ktf: 'D', kdjForce: false, panes: {bub: true, gauge: true, low: true, heat: true, old: false}, log: true, tvFailed: false, dot: null, symCache: {}, kdjCache: {}, heroReset: false, heroVis: null, heroLR: null, heroApi: null, heroPtr: 'mouse', heatSel: null, req: 0, lastW: 0, extraBanner: null};
  var CH = {kdj: null, timing: null, hero: null};
  var IDX = {};




  function getJSON(url, signal, tries) {
    tries = tries == null ? 3 : tries;
    var ac = window.AbortController ? new AbortController() : null, timedOut = false;
    var t = ac ? setTimeout(function () { timedOut = true; ac.abort(); }, 20000) : null;
    if (signal && ac) { if (signal.aborted) ac.abort(); else signal.addEventListener('abort', function () { ac.abort(); }); }
    return fetch(url, ac ? {cache: 'no-cache', signal: ac.signal} : {cache: 'no-cache'}).then(function (r) {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    }).then(function (j) { clearTimeout(t); return j; }, function (e) {
      clearTimeout(t);
      if (timedOut && !(signal && signal.aborted)) {
        if (tries > 1) return getJSON(url, signal, tries - 1);
        throw new Error(url + ': timed out');
      }
      throw e;
    });
  }
  function isAbort(e) { return !!e && e.name === 'AbortError'; }


  function abortOthers(sym) {
    if (S.d && S.d.kdjAC && S.sym !== sym) { try { S.d.kdjAC.abort(); } catch (e) {  } }
  }
  function trimCaches(keep) {
    Object.keys(S.kdjCache).forEach(function (k) { if (keep.indexOf(k) < 0) delete S.kdjCache[k]; });
    Object.keys(S.symCache).forEach(function (k) { if (keep.indexOf(k) < 0) delete S.symCache[k]; });
  }

  function prepSeries(sr) {
    if (sr.dates) return sr;
    var t = Date.parse(sr.d0 + 'T00:00:00Z'), D = [sr.d0];
    for (var i = 0; i < sr.dd.length; i++) { t += sr.dd[i] * 86400000; D.push(new Date(t).toISOString().slice(0, 10)); }
    sr.dates = D;
    sr.breaks = [];
    for (i = 0; i < D.length; i++) if (sr.brk[i]) sr.breaks.push(D[i]);
    return sr;
  }
  function safe(name, f) { try { return f(); } catch (e) { console.error('Sornette: ' + name + ' failed to render', e); } }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fd(d) { if (!d) return '—'; return MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10)) + ', ' + d.slice(0, 4); }
  function fdm(d) { if (!d) return '—'; return MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4); }
  function fds(d) { if (!d) return '—'; return MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10)); }
  function yearNow() { return S.d ? S.d.series.through.slice(0, 4) : ''; }
  function fdY(d) { return !d ? '—' : d.slice(0, 4) === yearNow() ? fds(d) : fd(d); }
  function isIndex() { return !!(S.d && S.d.series.index); }
  function money(v) { return v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function fp(v, idx) { if (v == null) return '—'; return (idx == null ? isIndex() : idx) ? money(v) + ' pts' : '$' + money(v); }
  function fpx(v) { return v == null ? '' : money(v); }
  function axisNum(t) { return Math.abs(t - Math.round(t)) < 1e-9 ? Math.round(t).toLocaleString('en-US') : t.toLocaleString('en-US', {maximumFractionDigits: 1}); }
  function minus(s) { return s.replace(/^-/, '−'); }
  function pct1(v) {
    if (v == null || !isFinite(v)) return '—';
    if (v !== 0 && Math.abs(v) < 0.0005) return '<0.1%';
    return (Math.abs(v * 100) < 10 ? (Math.abs(v) * 100).toFixed(1) : Math.round(Math.abs(v) * 100)) + '%';
  }
  function wsp(v) { if (v == null) return '—'; var r = Math.round(v * 100); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%'; }
  function sp2(v) {
    if (v == null || !isFinite(v)) return '—';
    if (v !== 0 && Math.abs(v) < 0.00005) return (v > 0 ? '+' : '−') + '<0.01%';
    return (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(2) + '%';
  }
  function g2(v) { return v == null ? '—' : minus(v.toFixed(2)); }
  function g3(v) { return v == null ? '—' : minus(v.toFixed(3)); }
  function n2(v) { return v == null ? '—' : v.toFixed(2); }
  function int(v) { return v == null ? '—' : Math.round(v).toLocaleString('en-US'); }
  function share(x) { if (x == null) return '—'; if (x <= 0) return '0%'; var p = 100 * x; return p < 0.5 ? '<1%' : Math.round(p) + '%'; }
  function plural(n, w, ws) { return int(n) + ' ' + (n === 1 ? w : (ws || w + 's')); }
  function lcFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }

  function timeKey(t) {
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return new Date(t * 1000).toISOString().slice(0, 10);
    return t.year + '-' + String(t.month).padStart(2, '0') + '-' + String(t.day).padStart(2, '0');
  }
  function dayNum(d) { return Math.round(Date.parse(d + 'T00:00:00Z') / 86400000); }
  function numDay(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }
  function yearsBack(last, y) { return (+last.slice(0, 4) - y) + last.slice(4); }
  function monthsBack(last, m) { var dt = new Date(Date.parse(last + 'T00:00:00Z')); dt.setUTCMonth(dt.getUTCMonth() - m); return dt.toISOString().slice(0, 10); }
  function lowerBound(arr, v) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; }
  function tsET(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('en-US', {timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false}) + ' ET'; }
    catch (e) { return iso; }
  }
  function debounce(f, ms) { var t; return function () { clearTimeout(t); t = setTimeout(f, ms); }; }
  function setPressed(el, attr, val) {
    if (!el) return;
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) { if (b.dataset[attr] != null) b.setAttribute('aria-pressed', b.dataset[attr] === val ? 'true' : 'false'); });
  }
  function ovOf(sym) { return S.man ? S.man.overview.filter(function (o) { return o.sym === sym; })[0] : null; }
  function isPhone() { return window.innerWidth < 900; }
  function lines(arr) { return arr.map(function (s) { return '<p>' + s + '</p>'; }).join(''); }
  function stateMsg(s) { return '<div class="state-msg">' + s + '</div>'; }
  function hatchPattern(ctx) {
    var c = document.createElement('canvas'); c.width = 6; c.height = 6;
    var g = c.getContext('2d');
    g.fillStyle = '#1C2130'; g.fillRect(0, 0, 6, 6);
    g.strokeStyle = '#59617A'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, 6); g.lineTo(6, 0); g.stroke();
    return ctx.createPattern(c, 'repeat');
  }
  function fitCanvas(cv, cssH) {
    var W = cv.clientWidth, dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.round(cssH * dpr);
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return {ctx: ctx, W: W, H: cssH};
  }

  function nScales() { return (S.man && S.man.scales && S.man.scales.n) || 13; }
  function scaleName(i) { var n = S.man && S.man.scales && S.man.scales.names; return (n && n[i]) || 'time scale ' + (i + 1); }
  function scaleShort() { return (S.man && S.man.scales && S.man.scales.short) || ''; }
  function scaleLong() { return (S.man && S.man.scales && S.man.scales.long) || ''; }
  function firstNonNull(arr, from) { for (var i = from || 0; i < arr.length; i++) if (arr[i] != null) return i; return -1; }


  function bubKind(c) {
    if (!c) return 'none';
    if (c.status === 'warmup') return 'warmup';
    if (c.status === 'missing_data') return 'missing';
    if (c.status === 'fit_failure') return 'fitfail';
    if (!c.A) return 'notyet';

    if (!c.full) return (c.A < c.E || countCodes(c.codes || '', 'X')) ? 'partial' : 'unres';
    return 'full';
  }
  function kindMsg(k) { return k === 'warmup' ? STR.warmup : k === 'missing' ? STR.missing : k === 'fitfail' ? STR.numFail : STR.noData; }
  function countCodes(codes, set) { var n = 0; for (var i = 0; i < codes.length; i++) if (set.indexOf(codes[i]) >= 0) n++; return n; }
  function bubStates(c, r) {
    var out = [], k = bubKind(c);
    if (k === 'none' || k === 'warmup' || k === 'missing' || k === 'fitfail') return [kindMsg(k)];
    if (c.E < c.configured) out.push(fill(STR.partial, {eligible: c.E, configured: c.configured}));
    if (c.U > 0) out.push(fill(STR.unresolved, {unresolved: c.U}));
    return out;
  }


  function hist(kind) {
    var sr = S.d.series, lp = sr.lp, PA = lpArr(kind, 'pos'), NA = lpArr(kind, 'neg'), h = {tries: 0, passes: 0, full: 0, attempted: 0, first: null, lastFull: null, daysPos: 0, daysNeg: 0, lastPos: null, lastNeg: null,
      firstPos: null, maxPos: 0, maxNeg: 0, notyet: 0, unres: 0, olderMissing: 0, episodes: 0};
    var lastJ = null;
    for (var j = 0; j < lp.E.length; j++) {
      if (lp.A[j]) h.attempted++;
      if (lp.full[j] !== 1) {
        if ((lp.A[j] || 0) < lp.E[j]) h.notyet++; else h.unres++;
        if (!h.first) h.olderMissing++;
        continue;
      }
      var p = PA[j] || 0, n = NA[j] || 0;
      h.tries += lp.A[j] || 0;
      h.passes += p + n;
      var d = sr.dates[lp.from + j];
      h.full++;
      if (!h.first) h.first = d;
      h.lastFull = d;
      if (p > 0) { h.daysPos++; h.lastPos = d; if (!h.firstPos) h.firstPos = d; h.maxPos = Math.max(h.maxPos, p); }
      if (n > 0) { h.daysNeg++; h.lastNeg = d; h.maxNeg = Math.max(h.maxNeg, n); }

      if (p > 0 || n > 0) { if (lastJ == null || j - lastJ > 21) h.episodes++; lastJ = j; }
    }
    return h;
  }


  function stripCode(i) {
    var lp = S.d.series.lp, j = i - lp.from, TP = lpArr('trust', 'pos'), TN = lpArr('trust', 'neg');
    if (j < 0 || j >= lp.E.length) return null;
    if (!lp.A[j]) return 'X';
    if (lp.full[j] !== 1) return TP[j] > 0 ? 'p' : TN[j] > 0 ? 'n' : 'X';
    return TP[j] > 0 ? 'P' : TN[j] > 0 ? 'N' : 'R';
  }
  function passRuns() {
    var sr = S.d.series, lp = sr.lp, TP = lpArr('trust', 'pos'), TN = lpArr('trust', 'neg'), out = [], cur = null;
    for (var j = 0; j < lp.E.length; j++) {
      var c = lp.full[j] === 1 ? (TP[j] > 0 ? 'a' : TN[j] > 0 ? 't' : null) : null, i = lp.from + j;
      if (c && cur && cur.c === c && cur.i1 === i - 1) cur.i1 = i;
      else if (c) { cur = {c: c, i0: i, i1: i}; out.push(cur); }
      else cur = null;
    }
    return out.map(function (r) { return {i0: r.i0, i1: r.i1, color: r.c === 'a' ? C.amber : C.teal}; });
  }

  function covInfo() {
    var sr = S.d.series, h = S.d.histT, c = sr.coverage || (S.d.ov && S.d.ov.coverage);
    var complete = c && c.scheduled ? c.complete : h.full, scheduled = c && c.scheduled ? c.scheduled : sr.lp.E.length;
    return {complete: complete, scheduled: scheduled, low: complete < scheduled / 2, part: complete < scheduled};
  }

  function episodeCount() { return S.d.histT.episodes; }

  function isReplay() { return !S.d || S.d.series.replay !== false; }
  function replayNote() {
    var n = episodeCount();
    return 'This history is a replay on today\'s data, not readings issued at the time: ' + (n === 1 ? 'one episode' : n + ' episodes') + '.';
  }


  function init() {
    var q = new URLSearchParams(location.search);
    if (q.get('sym')) S.sym = q.get('sym').toUpperCase();
    var r = (q.get('range') || '').toLowerCase();
    S.range = RANGES.indexOf(r) >= 0 ? r : '5y';
    setPressed($('rangeSeg'), 'r', S.range);
    S.lastW = window.innerWidth;
    bindControls();
    safe('nav', showActiveTab);
    getJSON(SNAP + 'sornette.json')
      .then(function (man) {
        if (!man || man.kind !== 'sornette' || man.schema !== 2) throw new Error('unexpected file');
        S.man = man;
        if (S.man.symbols.indexOf(S.sym) < 0) S.sym = S.man.symbols.indexOf('QQQ') >= 0 ? 'QQQ' : S.man.symbols[0];
        buildPicker();
        return loadSym(S.sym);
      }, function (e) {
        console.warn('Sornette: manifest', e);
        $('meta').textContent = STR.reqError;
        $('banners').innerHTML = '<div class="banner">' + esc(STR.reqError) + '</div>';
        $('grid').hidden = true;
        $('quote').innerHTML = '';
      });
  }

  function showActiveTab() {
    var tabs = document.querySelector('nav.tabs'), a = tabs && tabs.querySelector('[aria-current]');
    if (!a) return;
    var over = a.getBoundingClientRect().right - tabs.getBoundingClientRect().right;
    if (over > 0) tabs.scrollLeft += Math.ceil(over) + 2;
    var mark = function () { tabs.classList.toggle('scrolled', tabs.scrollLeft > 2); };
    mark();
    if (!tabs.dataset.sk) { tabs.dataset.sk = '1'; tabs.addEventListener('scroll', mark, {passive: true}); }
  }
  function setBusy(on) {
    var m = $('main');
    m.classList.toggle('busy', on);
    if (on) m.setAttribute('aria-busy', 'true'); else m.removeAttribute('aria-busy');
  }
  function loadSym(sym) {
    var tok = ++S.req, err = {};
    S.want = sym;
    abortOthers(sym);
    $('meta').textContent = STR.loading;
    setBusy(true);

    var symP = S.symCache[sym] ? Promise.resolve(S.symCache[sym]) : getJSON(SNAP + sym + '.json');
    return symP
      .then(function (sr) {
        if (tok !== S.req) return;
        if (!sr || sr.kind !== 'sornette-sym' || sr.schema !== 2) throw new Error(sym + ': unexpected file');
        setBusy(false);
        var changed = S.sym !== sym || !S.d, first = !S.d, prevSym = S.sym;
        S.sym = sym; S.extraBanner = null;
        S.symCache[sym] = sr;
        trimCaches([sym, prevSym]);
        if (changed) { S.dot = null; S.heatSel = null; S.kdjForce = false; S.heroReset = true; if (S.weakRange === 'ev') S.weakRange = '1y'; }
        prepSeries(sr);
        S.d = {series: sr, heat: sr.heat, kdj: S.kdjCache[sym], timing: sr.timing, today: sr.today, old: sr.old, err: err, ov: ovOf(sym) || emptyOv()};
        if (!sr.heat) err.heat = true;
        if (!sr.timing) err.timing = true;
        IDX = {};
        S.d.series.dates.forEach(function (d, i) { IDX[d] = i; });
        S.d.hist = hist('strict');
        S.d.histT = hist('trust');
        S.d.runs = passRuns();
        syncURL();
        renderAll();
        if (first) {

          var hid = location.hash && location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : '', tgt = hid ? document.getElementById(hid) : null;
          if (tgt) requestAnimationFrame(function () { tgt.scrollIntoView({block: 'start'}); });

          setTimeout(function () { loadLW().catch(function () {  }); }, 1500);
        }
      }, function (e) {
        if (tok !== S.req) return;
        setBusy(false);
        console.warn('Sornette: series layer for ' + sym, e);
        if (!S.d) {
          $('grid').hidden = true;
          $('meta').textContent = '';
          $('banners').innerHTML = '<div class="banner">' + esc(STR.reqError + ' (' + (TICK[sym] || sym) + ')') + '</div>';
          $('quote').innerHTML = '';
          safe('picker', renderPickerState);
          return;
        }
        S.extraBanner = STR.reqError;
        S.want = S.sym;
        safe('picker', renderPickerState);
        safe('meta', renderMeta);

        if (S.d.kdj === undefined && !S.d.kdjP && (S.panes.heat || $('trendWhy').open)) kdjOf(S.d, S.sym);
      });
  }
  function emptyOv() { return {c13: null, run: {value: null}, weak: {breakdownToday: null}, kdj: null, coverage: null}; }
  function syncURL() {
    try {
      var q = new URLSearchParams(location.search);
      q.set('sym', S.sym); q.set('range', S.range);
      window.history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);
    } catch (e) {  }
  }

  function bindControls() {
    $('symSelect').addEventListener('change', function () { loadSym(this.value); });
    $('symChips').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-sym]'); if (!b || b.disabled) return;
      setPressed($('symChips'), 'sym', b.dataset.sym);
      loadSym(b.dataset.sym);
    });
    $('rangeSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-r]'); if (!b || !S.d) return;
      S.range = b.dataset.r; S.heroReset = true; setPressed($('rangeSeg'), 'r', S.range); syncURL();
      safe('price chart', renderHero);
    });
    bindHeroEvents();
    $('paneToggles').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]'); if (!b || !S.d) return;
      paneToggle(b.dataset.p);
    });
    $('runRange').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-r]'); if (!b || !S.d) return;
      S.runRange = b.dataset.r; setPressed($('runRange'), 'r', S.runRange); safe('gauge chart', drawRun);
    });
    $('bubDots').addEventListener('click', function (e) {
      var b = e.target.closest('button.d'); if (!b || !S.d) return;
      var i = +b.dataset.i;
      S.dot = S.dot === i ? null : i;
      Array.prototype.forEach.call(this.querySelectorAll('button.d'), function (x) {
        var on = +x.dataset.i === S.dot; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderDotNote();
    });
    $('ovList').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-sym]'); if (!b || b.disabled) return;
      loadSym(b.dataset.sym).then(function () { var n = $('now'); if (n) n.scrollIntoView({behavior: 'smooth', block: 'start'}); });
    });

    $('bubWhy').addEventListener('toggle', function () { if (this.open && S.d) safe('bubble why', renderBubWhy); else if (!this.open) killChart('timing'); });
    $('runWhy').addEventListener('toggle', function () { if (this.open && S.d) safe('gauge why', renderRunWhy); });
    $('weakWhy').addEventListener('toggle', function () { if (this.open && S.d) safe('weakening why', renderWeakWhy); });
    $('trendWhy').addEventListener('toggle', function () { if (this.open && S.d) safe('trend why', renderTrendWhy); else if (!this.open) killChart('kdj'); });
    window.addEventListener('resize', debounce(function () {
      if (window.innerWidth === S.lastW) return;
      S.lastW = window.innerWidth;
      safe('nav', showActiveTab);
      if (!S.d) return;
      safe('price chart', renderHero);
      safe('gauge chart', drawRun);
      safe('weakening picture', renderWeakPic);
      safe('strip', drawStrip);
      if ($('bubWhy').open) safe('heat map', drawHeat);
      if ($('weakWhy').open) safe('weakening chart', drawWeakWhy);
    }, 150));
  }
  function killChart(k) { if (CH[k]) { try { CH[k].remove(); } catch (e) {  } CH[k] = null; } }


  function buildPicker() {
    var sel = '';
    GROUPS.forEach(function (g) {
      sel += '<optgroup label="' + esc(g[0]) + '">';
      g[1].forEach(function (s) {
        var have = S.man.symbols.indexOf(s) >= 0;
        sel += '<option value="' + s + '"' + (have ? '' : ' disabled title="Not in this build yet"') + '>' + esc(TICK[s] + ' · ' + PLAIN[s]) + '</option>';
      });
      sel += '</optgroup>';
    });
    $('symSelect').innerHTML = sel;
    $('symChips').innerHTML = PAIRS.map(function (p) {
      return '<span class="pair">' + p.map(function (s) {
        var have = S.man.symbols.indexOf(s) >= 0, o = ovOf(s);
        return '<button type="button" data-sym="' + s + '" aria-pressed="' + (s === S.sym) + '"' + (have ? '' : ' disabled') +
          ' title="' + esc(have ? (o && o.name) || PLAIN[s] : 'Not in this build yet') + '">' + esc(PILL[s]) + '</button>';
      }).join('') + '</span>';
    }).join('');
  }
  function renderPickerState() {
    $('symSelect').value = S.sym;
    $('faceT').textContent = TICK[S.sym] || S.sym; $('faceN').textContent = PLAIN[S.sym] || '';
    setPressed($('symChips'), 'sym', S.sym);
  }
  function renderQuote() {
    var ov = S.d.ov, sr = S.d.series, px = ov.price != null ? ov.price : sr.price[sr.price.length - 1];
    $('quote').innerHTML = '<span class="px">' + fp(px) + '</span><span class="sub">' + (ov.chg1d == null ? '' : sp2(ov.chg1d) + ' · ') + fds(sr.through) + ' close</span>';
  }
  function renderMeta() {
    var sr = S.d.series, man = S.man, m;
    var close = (sr.adjusted ? 'Adjusted close' : 'Close') + ' through <b>' + fd(sr.through) + '</b>.';
    if (!sr.model) m = close + ' Bubble test: no complete day yet, still computing.';
    else if (sr.model < sr.through) m = esc(fill(STR.stale, {priceDate: fd(sr.through), modelDate: fd(sr.model)}));
    else m = close;
    m += ' Built ' + esc(tsET(man.built_utc)) + '.';
    $('meta').innerHTML = m;
    var b = [];
    if (S.d.ov && S.d.ov.held) b.push(STR.refreshNull);
    if (man.errors && man.errors.length) b.push(STR.reqError + ' (' + man.errors.join(', ') + ')');
    if (S.extraBanner) b.push(S.extraBanner);
    $('banners').innerHTML = b.map(function (x) { return '<div class="banner">' + esc(x) + '</div>'; }).join('');
    $('footData').innerHTML = 'End-of-day ' + (isIndex() ? 'index levels' : 'prices') + ', updated after each US close.';
  }


  function runMax(fromDate) {
    var sr = S.d.series, best = null, bi = -1;
    for (var i = 0; i < sr.run.length; i++) if (sr.run[i] != null && (!fromDate || sr.dates[i] >= fromDate) && (best == null || sr.run[i] > best)) { best = sr.run[i]; bi = i; }
    return bi < 0 ? null : {v: best, i: bi, d: sr.dates[bi]};
  }
  function runRank() {
    var sr = S.d.series, p = S.d.ov.run;
    if (!p || p.value == null) return null;
    var ti = p.date && IDX[p.date] != null ? IDX[p.date] : sr.run.length - 1, t = sr.run[ti];
    if (t == null) t = p.value;
    var n = 0, below = 0, above = 0, first = null;
    for (var i = 0; i < sr.run.length; i++) {
      var v = sr.run[i];
      if (v == null || sr.dates[i] < '2013-01-01') continue;
      if (!first) first = sr.dates[i];
      n++; if (v < t) below++; else if (v > t) above++;
    }
    if (!n) return null;
    return {p: 100 * below / n, max: above === 0, since: first > '2013-03-01' ? fdm(first) : '2013'};
  }
  function rankPhrase(r, lead) {
    if (!r) return '';
    if (r.max) return 'Today is its highest reading since ' + r.since + '.';
    var pp = r.p < 1 ? 'fewer than 1%' : r.p > 99 ? 'more than 99%' : Math.round(r.p) + '%';
    return lead + ' than on ' + pp + ' of days since ' + r.since + '.';
  }




  function noWeakReading(w) { return w.breakdownToday == null || (!w.breakdownToday && w.prior20Low == null); }
  function renderNow() {
    var ov = S.d.ov, c = ov.c13, p = ov.run || {}, w = ov.weak || {}, k = bubKind(c), rows = [], r = rulesOf(ov);
    var a1, s1 = '', c1 = '', cls1 = '', sep1, pf = r && r.paper ? ', paper filter' : '';
    if (k === 'full') {
      var strictTxt = r.paper ? 'Strict rule (much stricter on curve error): ' + (r.sPos || r.sNeg ? (r.sPos ? r.sPos + ' of ' + c.E + ' rising' : r.sNeg + ' of ' + c.E + ' falling') : '0 of ' + c.E) + '. ' : '';
      if (r.pos > 0) { a1 = 'Rising shape on ' + r.pos + ' of ' + c.E; s1 = 'time scales' + pf; sep1 = ' '; c1 = strictTxt + 'Describes the path so far.'; cls1 = 'amber'; }
      else if (r.neg > 0) { a1 = 'Falling mirror on ' + r.neg + ' of ' + c.E; s1 = 'time scales' + pf; sep1 = ' '; c1 = strictTxt + 'Describes the path so far.'; cls1 = 'teal'; }
      else if (r.sPos > 0) { a1 = 'Strict rule only: ' + r.sPos + ' of ' + c.E; s1 = '0 of ' + c.E + ' time scales' + pf; c1 = 'Describes the path so far.'; cls1 = 'amber'; }
      else {
        a1 = 'Not detected'; s1 = '0 of ' + c.E + ' time scales' + pf;
        c1 = strictTxt + (covInfo().low ? 'Most of its history is not computed yet.' : 'The usual reading.');
      }
    } else if (k === 'partial') {
      var done = c.E - countCodes(c.codes || '', 'X');
      a1 = 'Still computing'; s1 = done + ' of ' + c.E + ' checked' + (r.pos ? ', ' + r.pos + ' passed' + pf : ', none passed');
      c1 = 'The other ' + (c.E - done) + ' are not computed yet.';
    } else if (k === 'unres') {
      a1 = 'Incomplete'; s1 = (c.V || 0) + ' of ' + c.E + ' solved' + (r.pos ? ', ' + r.pos + ' passed' + pf : ', none passed');
      c1 = (c.U || 0) + ' could not be solved; they still count in the ' + c.E + '.';
    } else if (k === 'notyet') { a1 = 'Not computed yet'; c1 = 'This symbol is still being computed.'; }
    else { a1 = 'No reading'; c1 = kindMsg(k); }
    rows.push(['#bubble', 'Does the climb look like a bubble?', a1, s1, c1, cls1, sep1]);
    if (p.value == null) rows.push(['#runaway', 'Is the price running away?', 'No reading', '', STR.missing, '']);
    else rows.push(['#runaway', 'Is the price running away?', g2(p.value), 'fast moves up or down', rankPhrase(runRank(), 'Higher'), '']);
    if (noWeakReading(w)) rows.push(['#weak', 'Has the price started to weaken?', 'No reading', '', STR.missing, '']);
    else if (w.breakdownToday) rows.push(['#weak', 'Has the price started to weaken?', 'Yes', 'closed below its 4-week low', 'Seen after the price has already fallen.', 'coral']);
    else rows.push(['#weak', 'Has the price started to weaken?', 'No', pct1(ov.price / w.prior20Low - 1) + ' above its 4-week low', '', '']);
    $('answers').innerHTML = rows.map(function (r, i) {
      return '<li><a href="' + r[0] + '"><span class="num">' + (i + 1) + '</span><span class="body"><span class="q">' + r[1] + '</span><span class="a ' + r[5] + '">' + r[2] +
        '<span class="s">' + (r[3] ? '<span class="sep">' + (r[6] || ' · ') + '</span>' + r[3] : '') + '</span></span>' +
        (r[4] ? '<span class="c">' + esc(r[4]) + '</span>' : '') + '</span><span class="chev" aria-hidden="true">›</span></a></li>';
    }).join('');
  }




  var uid = 0;
  function niceStep(sp, n) {
    var raw = sp / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  }
  function hatchDef(id) {
    return '<pattern id="' + id + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="5" height="5" fill="#1C2130"/><rect width="1.6" height="5" fill="#59617A"/></pattern>';
  }
  function textW(s) {
    var w = 0;
    for (var i = 0; i < s.length; i++) { var ch = s.charAt(i); w += '.,: '.indexOf(ch) >= 0 ? 3.5 : /[A-Z]/.test(ch) ? 8 : 7; }
    return w;
  }
  var STRIPCOL = {P: C.amber, N: C.teal, p: 'rgba(245,184,75,0.45)', n: 'rgba(38,166,154,0.45)', R: C.slate};
  function svgChart(el, o) {
    if (!el) return null;
    var W = el.clientWidth || 600, H = o.h, phone = isPhone(), id = 'sc' + (++uid);
    var i0 = o.i0, i1 = o.i1, D = o.D, k, v;
    var lo = Infinity, hi = -Infinity;
    for (k = i0; k <= i1; k++) { v = o.val(k); if (v == null) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!isFinite(lo) || i1 < i0) { el.innerHTML = stateMsg(esc(o.empty || STR.noData)); return null; }
    if (o.ref && o.ref.v != null) { lo = Math.min(lo, o.ref.v); hi = Math.max(hi, o.ref.v); }
    if (o.yMin != null) lo = Math.min(lo, o.yMin);
    if (o.yMax != null) hi = Math.max(hi, o.yMax);
    var mt = o.mt || 14, mb = o.strip ? 44 : 26, ph = H - mt - mb, base = mt + ph;
    var log = !!o.log && lo > 0, f0, f1;
    if (log) { f0 = Math.log(lo); f1 = Math.log(hi); var pd = (f1 - f0) * 0.07 || 0.05; f0 -= pd; f1 += pd; }
    else { var pd2 = (hi - lo) * 0.08 || 1; f0 = lo - pd2; f1 = hi + pd2; if (o.yMin === 0 && lo >= 0) f0 = Math.min(f0, 0); }
    var Y = function (z) { var t = log ? Math.log(z) : z; return mt + (f1 - t) / (f1 - f0) * ph; };

    var ticks = [];
    if (log) {
      var lo2 = Math.exp(f0), hi2 = Math.exp(f1);
      for (var e = Math.floor(Math.log10(lo2)); e <= Math.ceil(Math.log10(hi2)); e++) [1, 2, 5].forEach(function (q) { var t = q * Math.pow(10, e); if (t >= lo2 && t <= hi2) ticks.push(t); });
      if (ticks.length > 6) ticks = ticks.filter(function (t, x) { return x % 2 === 0; });
      if (ticks.length < 3) { ticks = []; var st0 = niceStep(hi2 - lo2, 4); for (var t0 = Math.ceil(lo2 / st0) * st0; t0 <= hi2; t0 += st0) ticks.push(+t0.toFixed(10)); }
    } else { var st = niceStep(f1 - f0, phone ? 3 : 4); for (var t1 = Math.ceil(f0 / st) * st; t1 <= f1 + 1e-9; t1 += st) ticks.push(+t1.toFixed(10)); }

    var ty = o.noToday ? null : o.val(i1), pillTxt = ty != null ? o.fmtPill(ty) : null, pillW = pillTxt ? Math.ceil(textW(pillTxt) + 12) : 0, labW = 0;
    ticks.forEach(function (t) { labW = Math.max(labW, textW(o.fmtAxis(t))); });
    var m = {l: 4, r: Math.max(o.mr != null ? o.mr : (phone ? 52 : 64), Math.ceil(8 + Math.max(pillW, labW) + 2)), t: mt, b: mb};
    var pw = W - m.l - m.r, xr = pw - 10;
    var X = function (i) { return m.l + (i1 === i0 ? xr : (i - i0) / (i1 - i0) * xr); };
    var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" tabindex="0" aria-label="' + esc(o.aria || 'Chart') + '">' +
      '<defs><linearGradient id="' + id + 'g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + C.accent + '" stop-opacity=".30"/><stop offset="1" stop-color="' + C.accent + '" stop-opacity="0"/></linearGradient>' +
      hatchDef(id + 'h') + '</defs>';
    var pillY = ty != null ? Y(ty) : null;
    ticks.forEach(function (t) {
      var y = Y(t), clash = pillY != null && Math.abs(pillY - y) < 16;
      s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + C.line + '" stroke-width="1" opacity=".55"/>' +
        (clash ? '' : '<text class="svgt" x="' + (m.l + pw + 8) + '" y="' + (y + 4).toFixed(1) + '">' + esc(o.fmtAxis(t)) + '</text>');
    });

    var sp = i1 - i0, monthly = dayNum(D[i1]) - dayNum(D[i0]) < 560, prev = null, xt = [];
    for (k = i0; k <= i1; k++) {
      var key = monthly ? D[k].slice(0, 7) : D[k].slice(0, 4);
      if (prev !== null && key !== prev) xt.push(k);
      prev = key;
    }
    var minGap = phone ? 54 : 70, lastX = -1e9;
    var yAx = base + (o.strip ? 34 : 18);
    xt.forEach(function (q) {
      var x = X(q);
      if (x - lastX < minGap || x > m.l + xr - 16 || x < m.l + 12) return;
      lastX = x;
      var lab = monthly ? (D[q].slice(5, 7) === '01' ? D[q].slice(0, 4) : MON[+D[q].slice(5, 7) - 1]) : D[q].slice(0, 4);
      s += '<text class="svgt" x="' + x.toFixed(1) + '" y="' + yAx + '" text-anchor="middle">' + lab + '</text>';
    });

    var bucket = Math.max(1, Math.floor((sp + 1) / (xr * 1.5))), segs = [], cur = [];
    for (k = i0; k <= i1; k += bucket) {
      var mn = null, mx = null, imn = k, imx = k, any = false;
      for (var q2 = k; q2 < Math.min(i1 + 1, k + bucket); q2++) {
        v = o.val(q2); if (v == null) continue; any = true;
        if (mn == null || v < mn) { mn = v; imn = q2; }
        if (mx == null || v > mx) { mx = v; imx = q2; }
      }
      if (!any) { if (cur.length) segs.push(cur); cur = []; continue; }
      if (bucket === 1) {
        if (o.step && cur.length) cur.push([X(k), cur[cur.length - 1][1]]);
        cur.push([X(k), Y(mn)]);
      } else if (imn <= imx) { cur.push([X(imn), Y(mn)]); cur.push([X(imx), Y(mx)]); }
      else { cur.push([X(imx), Y(mx)]); cur.push([X(imn), Y(mn)]); }
    }
    if (cur.length) segs.push(cur);
    segs.forEach(function (sg) {
      var d = 'M' + sg.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');
      if (o.fill) s += '<path d="' + d + 'L' + sg[sg.length - 1][0].toFixed(1) + ' ' + base + 'L' + sg[0][0].toFixed(1) + ' ' + base + 'Z" fill="url(#' + id + 'g)"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + o.color + '" stroke-width="' + (o.width || 1.7) + '" stroke-linejoin="round"/>';
    });

    if (o.ref && o.ref.v != null) {
      var yr = Y(o.ref.v), lw = textW(o.ref.label) + 6, xEnd = m.l + 6 + lw, hitUp = 0, hitDn = 0;
      for (k = i0; k <= i1; k++) {
        var xk = X(k); if (xk > xEnd) break;
        v = o.val(k); if (v == null) continue;
        var yk = Y(v);
        if (yk > yr - 22 && yk < yr - 2) hitUp++;
        if (yk > yr + 2 && yk < yr + 22) hitDn++;
      }
      var below = hitUp > hitDn || yr - 20 < m.t;
      s += '<line x1="' + m.l + '" x2="' + (m.l + pw) + '" y1="' + yr.toFixed(1) + '" y2="' + yr.toFixed(1) + '" stroke="' + o.ref.color + '" stroke-width="1.4" stroke-dasharray="6 5"/>' +
        '<text class="svgt" x="' + (m.l + 6) + '" y="' + (below ? yr + 16 : yr - 7).toFixed(1) + '" style="fill:' + o.ref.color + ';paint-order:stroke;stroke:' + C.bg +
        ';stroke-width:4px;stroke-linejoin:round;font-weight:600">' + esc(o.ref.label) + '</text>';
    }

    if (o.runs) o.runs.forEach(function (r) {
      var a = Math.max(r.i0, i0), b = Math.min(r.i1, i1); if (a > b) return;
      var pts = [];
      for (var q3 = a; q3 <= b; q3++) { var vv = o.val(q3); if (vv != null) pts.push([X(q3), Y(vv)]); }
      if (!pts.length) return;
      if (pts.length === 1) s += '<circle cx="' + pts[0][0].toFixed(1) + '" cy="' + pts[0][1].toFixed(1) + '" r="4.5" fill="' + r.color + '" stroke="' + C.bg + '" stroke-width="1.5"/>';
      else s += '<path d="M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + '" fill="none" stroke="' + r.color +
        '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
    });

    if (o.dots) o.dots.forEach(function (dt) { if (dt.i < i0 || dt.i > i1) return; s += '<circle cx="' + X(dt.i).toFixed(1) + '" cy="' + Y(dt.v).toFixed(1) + '" r="' + dt.r + '" fill="' + dt.color + '"/>'; });

    if (o.mark && o.mark.i >= i0 && o.mark.i <= i1) {
      var mx1 = X(o.mark.i), my1 = Y(o.mark.v), lw2 = textW(o.mark.label), best = null;
      var hits = function (xa2, xb2, ya2, yb2) {
        var n2 = 0;
        if (xa2 < m.l || xb2 > m.l + pw || ya2 < 0 || yb2 > base) return 1e9;
        for (var q4 = i0; q4 <= i1; q4++) { var xq = X(q4); if (xq < xa2 || xq > xb2) continue; var vq = o.val(q4); if (vq == null) continue; var yq = Y(vq); if (yq >= ya2 && yq <= yb2) n2++; }
        return n2;
      };

      [[mx1, my1 - 11, 'middle'], [mx1 + 9, my1 - 9, 'start'], [mx1 - 9, my1 - 9, 'end'], [mx1 + 10, my1 + 4, 'start'], [mx1 - 10, my1 + 4, 'end'],
       [mx1, my1 + 21, 'middle'], [mx1 + 9, my1 + 18, 'start'], [mx1 - 9, my1 + 18, 'end']].forEach(function (c, ci) {
        var xa2 = c[2] === 'middle' ? c[0] - lw2 / 2 : c[2] === 'start' ? c[0] : c[0] - lw2, sc2 = hits(xa2 - 2, xa2 + lw2 + 2, c[1] - 12, c[1] + 3) * 10 + ci;
        if (!best || sc2 < best.sc) best = {sc: sc2, x: c[0], y: c[1], a: c[2]};
      });
      s += '<circle cx="' + mx1.toFixed(1) + '" cy="' + my1.toFixed(1) + '" r="4.5" fill="' + C.bg + '" stroke="' + C.white + '" stroke-width="1.8"/>' +
        '<text class="svgt s" x="' + best.x.toFixed(1) + '" y="' + best.y.toFixed(1) + '" text-anchor="' + best.a + '" style="paint-order:stroke;stroke:' + C.panel + ';stroke-width:4px;stroke-linejoin:round">' + esc(o.mark.label) + '</text>';
    }

    if (o.strip) {
      var sy = base + 8, sh = 8, cw = i1 > i0 ? xr / (i1 - i0) : xr, runs = [], rc = null, pass = [];
      for (k = i0; k <= i1; k++) { var sc = o.strip(k); if (rc && rc.c === sc) rc.b = k; else { rc = {c: sc, a: k, b: k}; runs.push(rc); } }
      var xa = function (q) { return Math.max(m.l, X(q) - cw / 2); }, xb = function (q) { return Math.min(m.l + xr + cw / 2, X(q) + cw / 2); };
      var hatch = [], cell = function (g, fillc) {
        var x1 = xa(g.a), x2 = xb(g.b), w = x2 - x1;
        if (w < 3) { x1 = (x1 + x2) / 2 - 1.5; w = 3; }
        x1 = Math.max(m.l, Math.min(x1, m.l + xr + cw / 2 - w));
        s += '<rect x="' + x1.toFixed(2) + '" y="' + sy + '" width="' + w.toFixed(2) + '" height="' + sh + '" fill="' + fillc + '"/>';
      };

      runs.forEach(function (g) {
        if (!g.c) return;
        if ('PNpn'.indexOf(g.c) >= 0) { pass.push(g); return; }
        var fillc = g.c === 'R' ? C.slate : 'url(#' + id + 'h)';
        if (xb(g.b) - xa(g.a) < 3) { hatch.push([g, fillc]); return; }
        s += '<rect x="' + xa(g.a).toFixed(2) + '" y="' + sy + '" width="' + (xb(g.b) - xa(g.a)).toFixed(2) + '" height="' + sh + '" fill="' + fillc + '"/>';
      });
      hatch.forEach(function (x) { cell(x[0], x[1]); });
      pass.forEach(function (g) { cell(g, STRIPCOL[g.c]); });
    }

    if (ty != null) {
      var tc = o.todayColor || C.white;
      s += '<circle cx="' + X(i1).toFixed(1) + '" cy="' + pillY.toFixed(1) + '" r="5" fill="' + tc + '" stroke="' + C.bg + '" stroke-width="2.5"/>' +
        '<rect x="' + (m.l + pw + 8) + '" y="' + (pillY - 10).toFixed(1) + '" width="' + pillW + '" height="20" rx="4" fill="' + tc + '"/>' +
        '<text x="' + (m.l + pw + 14) + '" y="' + (pillY + 4.2).toFixed(1) + '" style="font:700 12px ' + FONT + ';fill:#131722">' + esc(pillTxt) + '</text>';
    }

    s += '<line class="cur" x1="0" x2="0" y1="' + m.t + '" y2="' + base + '" stroke="' + C.ink2 + '" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>' +
      '<circle class="curdot" r="4.5" fill="' + C.bg + '" stroke="' + C.white + '" stroke-width="2" visibility="hidden"/>';
    s += '<rect class="hitbox" x="' + m.l + '" y="0" width="' + pw + '" height="' + H + '" fill="transparent"/></svg>';
    el.innerHTML = s;
    var svg = el.querySelector('svg'), cl = svg.querySelector('.cur'), cd = svg.querySelector('.curdot'), at = i1;
    var move = function (i) {
      at = Math.max(i0, Math.min(i1, i));
      var vv = o.val(at), x = X(at);
      cl.setAttribute('x1', x); cl.setAttribute('x2', x); cl.setAttribute('visibility', 'visible');
      if (vv != null) { cd.setAttribute('cx', x); cd.setAttribute('cy', Y(vv)); cd.setAttribute('visibility', 'visible'); } else cd.setAttribute('visibility', 'hidden');
      if (o.onCursor) o.onCursor(at, false);
    };
    var reset = function () { cl.setAttribute('visibility', 'hidden'); cd.setAttribute('visibility', 'hidden'); at = i1; if (o.onCursor) o.onCursor(i1, true); };
    var fromEvt = function (ev) { var r = svg.getBoundingClientRect(); return Math.round(i0 + (ev.clientX - r.left - m.l) / xr * (i1 - i0)); };
    var tStart = null, scrub = false;
    svg.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'touch') { tStart = [ev.clientX, ev.clientY]; scrub = false; return; }
      move(fromEvt(ev));
    });
    svg.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') {
        if (!tStart) return;
        if (!scrub) {
          var dx = Math.abs(ev.clientX - tStart[0]), dy = Math.abs(ev.clientY - tStart[1]);
          if (dx > 6 && dx > dy) scrub = true; else return;
        }
      }
      move(fromEvt(ev));
    });
    svg.addEventListener('pointerup', function (ev) {
      if (ev.pointerType !== 'touch') return;
      if (tStart && !scrub) move(fromEvt(ev));
      tStart = null; scrub = false;
    });
    svg.addEventListener('pointercancel', function () { tStart = null; scrub = false; reset(); });
    svg.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') reset(); });
    svg.addEventListener('blur', reset);
    svg.addEventListener('keydown', function (ev) {
      var stepK = ev.shiftKey ? 20 : 1;
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); move(at - stepK); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); move(at + stepK); }
      else if (ev.key === 'Escape') reset();
    });
    if (o.onCursor) o.onCursor(i1, true);
    return {X: X, Y: Y};
  }


  function rangeFrom(last, r) {
    if (r === 'all') return null;
    if (r === '2013') return '2013-01-01';
    return yearsBack(last, r === '1y' ? 1 : r === '3y' ? 3 : 5);
  }
  function heroView() {
    var sr = S.d.series, D = sr.dates, from = rangeFrom(D[D.length - 1], S.range), a = from ? lowerBound(D, from) : 0;
    var f = firstNonNull(sr.price, a);
    return [f < 0 ? a : f, D.length - 1];
  }
  function heroReadout(i) {
    var sr = S.d.series, lp = sr.lp, j = i - lp.from, last = sr.dates.length - 1, parts = [], TP = lpArr('trust', 'pos'), TN = lpArr('trust', 'neg');
    parts.push('<b>' + fd(sr.dates[i]) + '</b>' + (i === last ? ' (latest)' : ''));
    parts.push(fp(sr.price[i]));
    if (j < 0 || j >= lp.E.length) parts.push('no bubble test before ' + fdm(lp.fromDate));
    else if (!lp.A[j]) parts.push('bubble test: not computed yet');
    else if (lp.full[j] !== 1) {
      if (lp.A[j] < lp.E[j]) parts.push('bubble test: ' + lp.A[j] + ' of ' + lp.E[j] + ' computed' + (TP[j] ? ', ' + TP[j] + ' passed the paper filter' : ''));
      else parts.push('bubble test: ' + ((lp.U && lp.U[j]) || 'some') + ' of ' + lp.E[j] + ' unsolved' + (TP[j] ? ', ' + TP[j] + ' passed the paper filter' : ''));
    } else parts.push('paper filter ' + (TP[j] ? '<b style="color:var(--amber)">' + TP[j] + '</b>' : '0') + ' of ' + lp.E[j] + (TN[j] ? ' · falling ' + TN[j] : '') +
      ' · strict ' + (lp.pos[j] || 0) + (lp.neg[j] ? ' · strict falling ' + lp.neg[j] : ''));
    if (sr.brk[i] == null || sr.low20[i] == null || sr.price[i] == null) parts.push('4-week low n/a');
    else if (sr.brk[i]) parts.push('<span style="color:var(--brk)">closed below its 4-week low</span>');
    else parts.push(pct1(sr.price[i] / sr.low20[i] - 1) + ' above its 4-week low');
    $('heroReadout').innerHTML = parts.join(' · ');
  }
  function renderHero() {
    var sr = S.d.series, lp = sr.lp, v = heroView(), ov = S.d.ov, w = ov.weak || {}, h = S.d.histT, hs = S.d.hist;
    renderPaneToggles();
    drawHeroMain();
    if (!S.tvFailed) { renderTvKeyCaption(); return; }

    var anyR = false, anyX = false, anyU = false, anyPp = false, anyPn = false, posIn = 0, negIn = 0;
    for (var i = v[0]; i <= v[1]; i++) {
      var sc = stripCode(i), j = i - lp.from;
      if (sc === 'R') anyR = true;
      else if (sc === 'X') { if ((lp.A[j] || 0) < lp.E[j]) anyX = true; else anyU = true; }
      else if (sc === 'p') anyPp = true;
      else if (sc === 'n') anyPn = true;
      if (sc === 'P') posIn++; else if (sc === 'N') negIn++;
    }

    var key = [], phone = isPhone();
    if (w.prior20Low != null) key.push('<span><i class="k-dash"></i>today\'s 4-week low</span>');
    if (h.daysPos && (!phone || posIn)) key.push('<span><i class="k-sq" style="background:var(--amber)"></i>' + (phone ? 'paper filter passed' : 'paper filter passed (rising bubble shape)') + '</span>');
    if (h.daysNeg && (!phone || negIn)) key.push('<span><i class="k-sq" style="background:var(--teal)"></i>falling mirror passed the paper filter</span>');
    if (anyPp || anyPn) key.push('<span><i class="k-sq" style="background:' + (anyPp ? STRIPCOL.p : STRIPCOL.n) + '"></i>passed on a day not fully computed</span>');
    if (anyR) key.push('<span><i class="k-sq" style="background:var(--slate)"></i>checked, none passed</span>');
    if (anyX || anyU) key.push('<span><i class="k-hatch"></i>' + (anyX && anyU ? 'not computed yet or could not be solved' : anyX ? 'not computed yet' : 'could not be solved') + '</span>');
    $('heroKey').innerHTML = key.join('');



    var dash = w.prior20Low == null ? ' Today\'s 4-week low is unavailable.' : phone ? '' :
      ' <b>Dashed line:</b> today\'s 4-week low, ' + fp(w.prior20Low) + '. A close below it counts as weakening.';
    var cap, nm = esc(TICK[S.sym] || S.sym), cv = covInfo();
    if (!h.full) {
      cap = '<b>The bubble test has not been run on ' + nm + '\'s history yet</b>, so no amber marks can appear and the strip under the chart stays hatched.';
    } else if (cv.low && !h.daysPos && !h.daysNeg) {
      cap = '<b>The bubble test has only been fully run on ' + int(cv.complete) + ' of ' + int(cv.scheduled) + ' days of ' + nm + '\'s history so far</b>, so amber marks cannot appear yet and most of the strip under the chart stays hatched.';
    } else if (!h.daysPos && !h.daysNeg) {
      var rng = fdm(h.first) === fdm(h.lastFull) ? fdm(h.first) : fdm(h.first) + ' to ' + fdm(h.lastFull);
      cap = '<b>No checked day passed the paper filter' + (hs.daysPos || hs.daysNeg ? '' : ' or the strict rule') + '</b> (' + plural(h.full, 'day') + ' checked, ' + rng + (h.olderMissing ? '; older days are not computed yet' : '') + '). ' +
        'That is why the line has no amber marks.';
    } else {
      var inView = posIn + negIn > 0, where = '';
      if (!inView) {
        var latest = [h.lastPos, h.lastNeg].filter(Boolean).sort().pop();
        where = ' None are in this view: tap ' + (S.range !== '2013' && latest >= '2013-01-01' ? '2013+' : 'All') + ' to see them.';
        if (S.range === 'all') where = '';
      }
      if (phone) {
        var tap = where ? '; tap ' + (S.range !== '2013' && [h.lastPos, h.lastNeg].filter(Boolean).sort().pop() >= '2013-01-01' ? '2013+' : 'All') + ' to see them' : '';
        if (h.daysPos) cap = (h.daysPos === 1 ? '<b>Amber marks the one day</b> that passed the paper filter (' : '<b>Amber marks ' + plural(h.daysPos, 'day') + '</b> that passed the paper filter (latest ') + fd(h.lastPos) + (h.daysNeg ? '' : tap) + ')' +
          (h.daysNeg ? ', teal ' + plural(h.daysNeg, 'day') + ' with the falling mirror (latest ' + fd(h.lastNeg) + tap + ')' : '') + '.';
        else cap = '<b>Teal marks ' + plural(h.daysNeg, 'day') + '</b> with the falling mirror (latest ' + fd(h.lastNeg) + tap + ').';
        if (isReplay()) cap += ' A replay on today\'s data, not readings issued at the time: ' + (episodeCount() === 1 ? 'one episode' : episodeCount() + ' episodes') + '.';
      } else {
        if (h.daysPos) cap = (h.daysPos === 1 ? '<b>Amber marks the one day</b> when a time scale passed the paper filter (' : '<b>Amber marks the ' + plural(h.daysPos, 'day') + '</b> when at least one time scale passed the paper filter (latest ') + fd(h.lastPos) + ')' +
          (h.daysNeg ? ', teal the ' + plural(h.daysNeg, 'day') + ' with the falling mirror' : '') + '.' + where;
        else cap = '<b>Teal marks the ' + plural(h.daysNeg, 'day') + '</b> when at least one time scale showed the falling mirror (latest ' + fd(h.lastNeg) + ').' + where;
        if (isReplay()) cap += ' ' + replayNote();
      }
      cap += ' ' + strictSentence();
      if (cv.low) cap += ' Only ' + int(cv.complete) + ' of ' + int(cv.scheduled) + ' days are checked so far.';
    }
    $('heroCaption').innerHTML = cap + dash;
    $('heroFine').innerHTML = '';
  }
  function drawHero() {
    var el = $('heroChart'), sr = S.d.series, v = heroView(), w = S.d.ov.weak || {}, phone = isPhone();
    svgChart(el, {
      D: sr.dates, i0: v[0], i1: v[1], h: phone ? 250 : 360, mr: phone ? 52 : 64, log: S.range === 'all' || S.range === '2013',
      color: C.text, width: 1.7, fill: true,
      val: function (i) { return sr.price[i]; }, fmtAxis: axisNum, fmtPill: fpx,
      ref: w.prior20Low != null ? {v: w.prior20Low, label: '4-week low ' + fp(w.prior20Low), color: C.brk} : null,
      runs: S.d.runs, strip: stripCode,
      onCursor: heroReadout, aria: 'Price chart. Use the left and right arrow keys to move through days.'
    });
  }






  var PANES = [
    {k: 'bub', name: 'Bubble test', short: 'Bubble', color: C.amber, tip: 'Two ways to judge the same fitted curves: the paper filter (the published paper\'s looser limits) and the strict rule (this page\'s original reading, much stricter on curve error; it almost never passes). Amber bars: how many of the 13 time scales passed the paper filter that day. White dots: how many passed the strict rule. Shaded = not run or not computed yet, never a zero.'},
    {k: 'gauge', name: 'Runaway gauge', short: 'Runaway', color: C.gauge, tip: 'How explosive the recent path is. It rises in fast rallies and in fast falls, so it does not say up or down.'},
    {k: 'low', name: 'Below 4-week low', short: '4-week low', color: C.brk, tip: 'How far a close fell below the lowest close of the previous 4 weeks (weakening). No bar = the close was not below it.'},
    {k: 'heat', name: 'Heating / cooling', short: 'Heat / cool', kd: true, tip: 'KDJ of the shape count (how many of the 13 time scales show the bubble shape, shape checks only): K white, D yellow; grey bars = the count; dotted grey = flat, the count has not changed lately. Daily lines; weekly or monthly ones when zoomed far out.'},
    {k: 'old', name: 'Old engine', short: 'Old engine', color: C.ink2, tip: 'The earlier engine in its own pane, counted in time scales of 13.'}
  ];
  var BAND = '#2B3040';
  function tickFmt(t, type) {
    var d = timeKey(t), span = S.heroSpan || 0;
    if (type === 0) return d.slice(0, 4);
    if (type === 1) return span > 2000 ? '' : MON[+d.slice(5, 7) - 1];
    if (type === 2) return span > 300 ? '' : MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10));
    return null;
  }
  function tvChart(el, phone) {
    if (!LW && window.LightweightCharts) LW = window.LightweightCharts;
    try {
      return LW.createChart(el, {
        autoSize: true,
        layout: {background: {type: 'solid', color: C.panel}, textColor: C.muted, fontSize: phone ? 10 : 11, fontFamily: FONT, attributionLogo: false,
                 panes: {separatorColor: C.line2, separatorHoverColor: '#4A4F5C', enableResize: !phone}},
        localization: {timeFormatter: function (t) { return fd(timeKey(t)); }},
        grid: {vertLines: {color: 'rgba(42,46,57,0.55)'}, horzLines: {color: 'rgba(42,46,57,0.75)'}},
        rightPriceScale: {borderVisible: false, minimumWidth: phone ? 48 : 62, entireTextOnly: true},
        timeScale: {borderVisible: false, rightOffset: 3, minBarSpacing: 0.02, fixLeftEdge: true, lockVisibleTimeRangeOnResize: true, tickMarkFormatter: tickFmt},
        crosshair: {mode: LW.CrosshairMode.Normal,
                    vertLine: {color: '#5A5F6E', width: 1, style: LW.LineStyle.Dashed, labelBackgroundColor: C.line2},
                    horzLine: {color: '#5A5F6E', width: 1, style: LW.LineStyle.Dashed, labelBackgroundColor: C.line2}},

        handleScroll: {mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false},
        handleScale: {mouseWheel: true, pinch: true, axisPressedMouseMove: {time: true, price: true}, axisDoubleClickReset: {time: false, price: true}}
      });
    } catch (e) { console.warn('Sornette: chart library', e); return null; }
  }

  function renderPaneToggles() {
    var el = $('paneToggles'); if (!el) return;
    el.hidden = !!S.tvFailed;
    if (!el.querySelector('button[data-p]')) {
      el.innerHTML = PANES.map(function (p) {
        return '<button type="button" class="pt" data-p="' + p.k + '" aria-pressed="false" title="' + esc(p.tip) + '">' +
          (p.kd ? '<i class="kd" aria-hidden="true"></i>' : '<i style="background:' + p.color + '" aria-hidden="true"></i>') +
          '<span class="pt-l">' + esc(p.name) + '</span><span class="pt-s">' + esc(p.short) + '</span></button>';
      }).join('') + '<button type="button" class="pt pt-log" data-p="log" aria-pressed="false" title="Logarithmic price scale"><span class="pt-l">Log scale</span><span class="pt-s">Log</span></button>';
    }
    Array.prototype.forEach.call(el.querySelectorAll('button[data-p]'), function (b) {
      var k = b.dataset.p;
      b.setAttribute('aria-pressed', String(k === 'log' ? !!S.log : !!S.panes[k]));
    });
  }
  function paneToggle(k) {
    if (k === 'log') {
      S.log = !S.log;
      renderPaneToggles();
      if (CH.hero && CH.heroPrice) CH.heroPrice.priceScale().applyOptions({mode: S.log ? LW.PriceScaleMode.Logarithmic : LW.PriceScaleMode.Normal});
      return;
    }
    S.panes[k] = !S.panes[k];


    if (k === 'heat' && S.panes.heat && S.d && S.d.err.kdj) { S.d.err.kdj = false; S.d.kdj = undefined; }
    safe('price chart', renderHero);
  }


  function kdjOf(d, sym) {
    if (d.kdj !== undefined) return Promise.resolve(d.kdj);
    if (!d.kdjP) {
      var ac = window.AbortController ? new AbortController() : null;
      d.kdjAC = ac;
      d.kdjP = getJSON(SNAP + sym + '-kdj.json', ac && ac.signal).then(function (K) {
        if (!K || K.kind !== 'sornette-kdj') throw new Error(sym + ': unexpected heating / cooling file');
        d.kdj = K; S.kdjCache[sym] = K;
      },
        function (e) { if (isAbort(e)) return; console.warn('Sornette: kdj layer', e); d.err.kdj = true; d.kdj = null; })
        .then(function () {
          d.kdjP = null; d.kdjAC = null;
          if (S.d !== d) return;
          if (S.panes.heat && !S.tvFailed) safe('price chart', renderHero);
          if ($('trendWhy').open) safe('trend why', renderTrendWhy);
        });
    }
    return d.kdjP;
  }

  function heroDeps() {
    var d = S.d, sym = S.sym;
    if (S.panes.heat && d.kdj === undefined && (!S.want || S.want === sym)) kdjOf(d, sym);
  }


  function heroBubAt(j) {
    var lp = S.d.series.lp;
    if (j < 0 || j >= lp.E.length) return 'pre';
    if (!lp.A[j]) return 'nc';
    if (lp.full[j] === 1) return 'full';
    return lp.A[j] < lp.E[j] ? 'part' : 'unres';
  }


  function heroPreset(el) {
    var sr = S.d.series, D = sr.dates, last = D.length - 1, f0 = Math.max(0, firstNonNull(sr.price, 0));
    var from = rangeFrom(D[last], S.range), fi = from ? Math.max(f0, lowerBound(D, from)) : f0, to = last + 3;
    var plotW = Math.max(200, (el.clientWidth || 600) - 70), pad = fi > f0 ? Math.min(fi - f0, Math.ceil(18 * (to - fi) / plotW), Math.ceil(0.03 * (to - fi))) : 0;
    return {from: fi - pad, to: to};
  }

  function gaugeNote(phone) {
    var sr = S.d.series, best = null, fall = null, first = null;
    for (var i = 20; i < sr.run.length; i++) {
      var v = sr.run[i];
      if (v == null || sr.dates[i] < '2013-01-01' || sr.price[i] == null || sr.price[i - 20] == null) continue;
      if (!first) first = sr.dates[i];
      var c = sr.price[i] / sr.price[i - 20] - 1;
      if (!best || v > best.v) best = {v: v, i: i, c: c};
      if (c <= -0.10 && (!fall || v > fall.v)) fall = {v: v, i: i, c: c};
    }
    if (!best) return '';
    var since = first > '2013-03-01' ? fdm(first) : '2013';
    if (best.c <= -0.10) return phone ? 'The runaway gauge\'s top reading since ' + since + ' came in a fall (' + fd(sr.dates[best.i]) + '), so a spike is not a bubble reading.' :
      'The runaway gauge\'s highest reading since ' + since + ' (' + g2(best.v) + ' on ' + fd(sr.dates[best.i]) + ') came after a ' + pct1(-best.c) +
      ' fall in 4 weeks: it rises in fast falls as well as fast rallies, so a spike is not a bubble reading.';
    if (fall && fall.v >= 0.5 * best.v) return phone ? 'The runaway gauge also spikes in fast falls (' + fd(sr.dates[fall.i]) + '), so a spike is not a bubble reading.' :
      'The runaway gauge rises in fast falls as well as fast rallies (' + g2(fall.v) + ' on ' + fd(sr.dates[fall.i]) + ', after a ' + pct1(-fall.c) +
      ' fall in 4 weeks), so a spike alone is not a bubble reading.';
    return 'The runaway gauge rises in fast falls as well as fast rallies, so a spike alone is not a bubble reading.';
  }

  function strictSentence(ring) {
    var hs = S.d.hist;
    if (!hasTrust() || !hs.full) return '';
    if (!hs.daysPos && !hs.daysNeg) return 'The strict rule never passed' + (hs.olderMissing ? ' on the days computed so far' : '') + '.';
    var n = hs.daysPos || hs.daysNeg, lastD = hs.daysPos ? hs.lastPos : hs.lastNeg;
    return ring ? 'A white ring marks the ' + plural(n, 'day') + ' when the strict rule passed too (latest ' + fd(lastD) + ').' :
      'The strict rule passed on ' + plural(n, 'day') + ' (latest ' + fd(lastD) + ').';
  }

  function heroKin(K) { return K && K.shape && K.shape.D && K.shape.D.rows && K.shape.D.rows.length ? 'shape' : K && K.positive && K.positive.D && K.positive.D.rows && K.positive.D.rows.length ? 'positive' : null; }
  function renderTvKeyCaption() {
    var sr = S.d.series, D = sr.dates, lp = sr.lp, w = S.d.ov.weak || {}, h = S.d.histT, hs = S.d.hist, P = S.panes, key = [], phone = isPhone(), last = D.length - 1;

    var a, b, vis = S.heroVis && CH.hero && CH.heroSym === S.sym ? S.heroVis : null;
    if (vis) { a = vis[0]; b = vis[1]; } else { var from = rangeFrom(D[last], S.range); a = from ? lowerBound(D, from) : 0; b = last; }
    var anyPre = lp.from > Math.max(0, firstNonNull(sr.price, 0)), anyNc = h.notyet + h.unres > 0;
    var why = [anyPre ? 'not run' : '', h.notyet ? 'not computed yet' : '', h.unres ? 'not fully solved' : ''].filter(Boolean);
    var whyTxt = why.length > 1 ? why.slice(0, -1).join(', ') + ' or ' + why[why.length - 1] : why[0] || '';
    var K = S.d.kdj, kin = heroKin(K), kRows = kin ? K[kin].D.rows : null, kLast = kRows ? kRows[kRows.length - 1] : null;
    var anyStrict = hasTrust() && (hs.daysPos || hs.daysNeg), anyPaper = h.daysPos || h.daysNeg, TPk = lpArr('trust', 'pos'), TNk = lpArr('trust', 'neg'), fadedIn = 0;

    for (var jf = Math.max(0, a - lp.from); jf <= Math.min(lp.E.length - 1, b - lp.from); jf++) if (lp.full[jf] !== 1 && (TPk[jf] > 0 || TNk[jf] > 0)) fadedIn++;
    var gloss = 'Two ways to judge the same fitted curves: the paper filter (the published paper\'s looser limits) and the strict rule (this page\'s original reading, much stricter on curve error; it almost never passes).';

    if (w.prior20Low != null) key.push('<span><i class="k-dash"></i>today\'s 4-week low</span>');
    if (h.daysPos) key.push('<span title="' + esc(gloss) + '"><i class="k-dot" style="background:var(--amber)"></i>' + (phone ? 'paper filter passed' + (anyStrict ? '; white ring = strict too' : '') : 'paper filter passed (bigger dot = more time scales)') + '</span>');
    if (anyStrict && !(phone && h.daysPos)) key.push('<span><i class="k-ring"></i>' + (phone ? 'ring = strict rule too' : 'white ring = the strict rule passed too') + '</span>');
    if (h.daysNeg) key.push('<span><i class="k-dot" style="background:var(--teal)"></i>falling mirror passed</span>');
    if (fadedIn) key.push('<span><i class="k-fade"></i>' + (phone ? 'faded = day not fully solved (not counted)' : 'faded = passed on a day not fully solved (not counted)') + '</span>');
    if (!P.low && sr.breaks && sr.breaks.length) key.push('<span><i class="k-tick"></i>closed below its 4-week low</span>');
    if (trustEvents().length) key.push('<span><i class="k-sq" style="background:var(--brk)"></i>first break after a bubble' + (hasTrust() ? ', paper filter' : '') + '</span>');
    if (P.bub) {
      if (anyPaper) key.push('<span title="' + esc(gloss) + '"><i class="k-bar" style="background:var(--amber)"></i>' + (phone ? 'bar = paper filter count' + (anyStrict ? ', white dot = strict' : '') : 'bar = time scales passing the paper filter') + '</span>');
      if (anyStrict && !(phone && anyPaper)) key.push('<span><i class="k-wdot"></i>' + (phone ? 'white dot = strict rule count' : 'white dot = time scales passing the strict rule') + '</span>');
      if (h.full) key.push('<span><i class="k-zero"></i>flat line at 0 = checked, none passed</span>');
      if (anyPre || anyNc) key.push('<span><i class="k-band"></i>shaded = bubble test ' + whyTxt + (phone ? '' : ' (a short tick when only a day or two)') + '</span>');
    }
    if (P.low && !phone) key.push('<span><i class="k-bar"></i>bar = how far a close fell below its 4-week low</span>');
    if (P.heat && kRows) {
      var wkly = CH.hero && CH.heroSym === S.sym && (S.heroKdMode === 'W' || S.heroKdMode === 'M') ? (S.heroKdMode === 'W' ? 'weekly' : 'monthly') : '';
      var crossTxt = S.heroCrossOn === false ? (phone ? '; zoom in for cross dots' : '; zoom in to see the red / teal cross dots') :
        S.heroCrossOn == null ? '' : (phone ? '; red / teal dot = crossed up / down' : '; red dot = crossed up, teal = crossed down');
      if (kin === 'shape') key.push('<span><i class="k-gbar"></i>' + (phone ? 'grey bars = shape count' : 'grey bars = shape count (0 to 13)') + '</span>');
      key.push('<span><i class="k-kd"></i>K white, D yellow' + (wkly ? (phone ? ' (' + wkly + ': zoom in for daily)' : ', ' + wkly + ' while zoomed out (zoom in for daily)') : '') + crossTxt + '</span>');
      if (kRows.some(function (r) { return r[9] === 'x'; })) key.push('<span><i class="k-flat"></i>' + (phone ? 'dotted = flat, not a reading' : 'dotted grey = flat: the count has not changed lately, not a reading') + '</span>');
    }
    if (P.old && S.d.old) key.push('<span><i class="k-step"></i>old engine</span>');
    $('heroKey').innerHTML = key.join('');
    var nm = esc(TICK[S.sym] || S.sym), cv = covInfo(), cap, inView = 0, TP = lpArr('trust', 'pos'), TN = lpArr('trust', 'neg');
    for (var j = Math.max(0, a - lp.from); j <= Math.min(lp.E.length - 1, b - lp.from); j++) if (lp.full[j] === 1 && (TP[j] > 0 || TN[j] > 0)) inView++;
    if (!h.full) {
      cap = '<b>The bubble test has not been run on ' + nm + '\'s history yet</b>, so the Bubble test pane is shaded (not computed yet, which is not zero) and no amber dots can appear. ' +
        'The runaway gauge and the 4-week-low pane are complete.';
    } else if (cv.low && !anyPaper) {
      cap = '<b>The bubble test has only been fully run on ' + int(cv.complete) + ' of ' + int(cv.scheduled) + ' days of ' + nm + '\'s history so far</b>, so amber dots cannot appear yet. ' +
        'The Bubble test pane is shaded where the test has not been run; shaded is not zero.';
    } else if (!anyPaper) {
      var rng = fdm(h.first) === fdm(h.lastFull) ? fdm(h.first) : fdm(h.first) + ' to ' + fdm(h.lastFull);
      cap = '<b>No checked day passed the paper filter' + (anyStrict ? '' : ' or the strict rule') + '</b> (' + plural(h.full, 'day') + ' checked, ' + rng + '). That is why there are no amber dots: in the Bubble test pane those days are the flat line at 0' +
        (anyPre || anyNc ? '; shaded days were ' + whyTxt + ', which is not zero' : '') + '.' + (anyStrict ? ' ' + strictSentence(true) : '') +
        ' The other panes move every day: read them as context, not as alarms.';
    } else if (phone) {
      var tapTo = [h.lastPos, h.lastNeg].filter(Boolean).sort().pop() >= '2013-01-01' ? '2013+' : 'All', nS = hs.daysPos || hs.daysNeg;
      cap = (h.daysPos ? '<b>Amber dots: ' + plural(h.daysPos, 'day') + '</b> passed the paper filter (latest ' + fd(h.lastPos) + ')' : '<b>Teal dots: ' + plural(h.daysNeg, 'day') + '</b> with the falling mirror (latest ' + fd(h.lastNeg) + ')') +
        (!hasTrust() ? '' : nS ? '; a white ring on the ' + int(nS) + ' that passed the strict rule too.' : '; the strict rule never passed.') +
        (inView ? '' : ' None in this view: tap ' + tapTo + '.') +
        (isReplay() ? ' A replay on today\'s data: ' + (episodeCount() === 1 ? 'one episode' : episodeCount() + ' episodes') + '.' : '');
    } else {
      if (h.daysPos) cap = (h.daysPos === 1 ? '<b>The amber dot marks the one day</b> when a time scale passed the paper filter (' + fd(h.lastPos) + ')' :
        '<b>Amber dots mark the ' + plural(h.daysPos, 'day') + '</b> when at least one time scale passed the paper filter (latest ' + fd(h.lastPos) + ')') +
        (h.daysNeg ? '; teal dots the ' + plural(h.daysNeg, 'day') + ' with the falling mirror' : '') + '.';
      else cap = '<b>Teal dots mark the ' + plural(h.daysNeg, 'day') + '</b> when at least one time scale showed the falling mirror under the paper filter (latest ' + fd(h.lastNeg) + ').';
      cap += ' ' + strictSentence(true);
      var fadedAll = 0; for (var jq = 0; jq < lp.E.length; jq++) if (lp.full[jq] !== 1 && (TP[jq] > 0 || TN[jq] > 0)) fadedAll++;
      if (fadedAll) cap += ' ' + (fadedAll === 1 ? 'One faded dot marks a pass on a day that was not fully solved; it is' : plural(fadedAll, 'faded dot') + ' mark passes on days that were not fully solved; they are') + ' not counted.';
      if (!inView) cap += ' None are in this view: tap ' + ([h.lastPos, h.lastNeg].filter(Boolean).sort().pop() >= '2013-01-01' ? '2013+' : 'All') + ' or drag the chart to see them.';
      if (isReplay()) cap += ' ' + replayNote();
    }
    if (cv.low && h.full && anyPaper) cap += ' Only ' + int(cv.complete) + ' of ' + int(cv.scheduled) + ' days are checked so far; the rest of the Bubble test pane is shaded.';
    if (P.heat && kin === 'shape') cap += phone ? ' <b>Heating / cooling</b> follows the looser shape count (grey bars), so it moves even when neither rule passes.' :
      ' <b>Heating / cooling</b> follows the shape count (grey bars), a looser count than either rule, so it moves even when neither rule passes.';
    if (P.gauge) { var gn = gaugeNote(phone); if (gn) cap += ' ' + gn; }
    if (P.old) cap += !S.d.old ? ' ' + esc(STR.reqError) :
      ' <b>Old engine</b> (its own pane, grey steps): the earlier engine with different rules, counted the same way in time scales of 13.';
    if (P.heat && S.d.err.kdj && !(P.old && !S.d.old)) cap += ' ' + esc(STR.reqError);
    $('heroCaption').innerHTML = cap;
    var fine = [];
    if (P.heat && kLast && kLast[9] === 'x') fine.push('Heating / cooling: ' + lcFirst(STR.kdjFlat));
    $('heroFine').innerHTML = lines(fine);
  }
  function drawHeroMain() {
    var tv = $('heroTV'), svg = $('heroChart'), ro = $('heroReadout');
    if (S.tvFailed) {
      killChart('hero'); S.heroApi = null; tv.hidden = true; svg.hidden = false; $('tvHint').textContent = '';
      ro.hidden = false; ro.setAttribute('aria-live', 'polite');
      drawHero(); return;
    }
    tv.hidden = false; svg.hidden = true; svg.innerHTML = '';

    ro.hidden = true; ro.setAttribute('aria-live', 'off');
    heroDeps();
    if (!LW && !CH.hero) { tv.innerHTML = '<p class="tvload">Loading the chart…</p>'; $('tvHint').textContent = ''; }
    withLW(tv, function () { safe('stacked chart', heroTV); }, function () { S.tvFailed = true; safe('price chart', renderHero); });
  }

  function bindHeroEvents() {
    var el = $('heroTV');
    el.addEventListener('pointerdown', function (e) { S.heroPtr = e.pointerType; }, true);

    el.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.stopPropagation();
    }, {capture: true, passive: true});

    el.addEventListener('dblclick', function (e) {
      var api = S.heroApi; if (!api || !CH.hero) return;
      var r = el.getBoundingClientRect();
      if (r.bottom - e.clientY <= CH.hero.timeScale().height() + 2) api.reset();
    }, true);
    el.addEventListener('keydown', function (e) {
      var api = S.heroApi; if (!api || !CH.hero) return;
      var k = e.key, step = e.shiftKey ? 20 : 1, h = api.held(), i;
      if (k === 'Escape') { if (h != null) { e.preventDefault(); api.release(); } return; }
      if (k === 'ArrowLeft') i = (h != null ? h : api.lastVis() + 1) - step;
      else if (k === 'ArrowRight') i = (h != null ? h : api.lastVis() - 1) + step;
      else if (k === 'Home') i = api.firstVis();
      else if (k === 'End') i = api.lastVis();
      else return;
      e.preventDefault();
      api.pin(i, true);
    });
    el.addEventListener('blur', function () { if (S.heroApi && S.heroApi.held() != null) S.heroApi.release(); });
  }
  function heroTV() {
    var el = $('heroTV'), sr = S.d.series, D = sr.dates, lp = sr.lp, phone = isPhone(), narrow = window.innerWidth < 600, P = S.panes, w = S.d.ov.weak || {}, last = D.length - 1;


    var keep = CH.hero && !S.heroReset && CH.heroSym === S.sym && S.heroLR ? S.heroLR : null;
    S.heroReset = false; S.heroVis = null; S.heroApi = null;
    killChart('hero');
    el.innerHTML = '';
    var NORMAL = LW.PriceScaleMode.Normal, LS = LW.LineStyle;
    var K = S.d.kdj, kin = heroKin(K), kdjRows = P.heat && kin ? K[kin].D.rows : null;
    var L = P.old ? S.d.old : null;
    var on = ['bub', 'old', 'gauge', 'low', 'heat'].filter(function (k) { return P[k]; });
    var many = on.length > 3, priceH = phone ? 240 : 330, paneH = phone ? (many ? 78 : 88) : (many ? 100 : 112);
    el.style.height = (priceH + on.length * paneH + 28) + 'px';
    var ch = tvChart(el, phone);
    if (!ch) { S.tvFailed = true; safe('price chart', renderHero); return; }
    CH.hero = ch; CH.heroSym = S.sym;
    var lgFns = [], pane = 0, held = null, cur = last, viewNote = '', tickBucket = null, crossFor = null, bandFor = null, heatLg = -1;
    var cntLim = Infinity;
    var countFmt = {type: 'custom', formatter: function (v) { return Math.abs(v) > cntLim + 0.01 ? '' : String(Math.round(Math.abs(v))); }, minMove: 1};
    var fixed = function (lo, hi) { return function () { return {priceRange: {minValue: lo, maxValue: hi}}; }; };
    var nm = esc(TICK[S.sym] || S.sym);


    var TPh = lpArr('trust', 'pos'), TNh = lpArr('trust', 'neg'), dsz = function (n) { return Math.min(2.4, 0.75 + 0.22 * n); }, rings = [];
    for (var jr = 0; jr < lp.E.length; jr++) {
      if (lp.full[jr] !== 1) continue;
      var ir = lp.from + jr, spr = lp.pos[jr] || 0, snr = lp.neg[jr] || 0;
      if (spr > 0) rings.push({time: D[ir], position: 'inBar', shape: 'circle', color: C.white, size: dsz(Math.max(TPh[jr] || 0, spr)) + 0.75});
      else if (snr > 0 && !(TPh[jr] > 0)) rings.push({time: D[ir], position: 'inBar', shape: 'circle', color: C.white, size: dsz(Math.max(TNh[jr] || 0, snr)) + 0.75});
    }
    if (rings.length) {
      var ringS = ch.addSeries(LW.LineSeries, {lineVisible: false, pointMarkersVisible: false, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false}, 0);
      ringS.setData(D.map(function (d, i) { return sr.price[i] == null ? {time: d} : {time: d, value: sr.price[i]}; }));
      LW.createSeriesMarkers(ringS, rings);
    }
    var price = ch.addSeries(LW.AreaSeries, {lineColor: C.text, lineWidth: 1.6, topColor: 'rgba(126,87,194,0.32)', bottomColor: 'rgba(126,87,194,0.02)',
      priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 3, priceFormat: {type: 'price', precision: 2, minMove: 0.01}}, 0);
    CH.heroPrice = price;
    price.setData(D.map(function (d, i) { return sr.price[i] == null ? {time: d} : {time: d, value: sr.price[i]}; }));

    var tickStrip = !P.low && sr.brk.some(function (x) { return !!x; });
    price.priceScale().applyOptions({mode: S.log ? LW.PriceScaleMode.Logarithmic : NORMAL, scaleMargins: {top: 0.12, bottom: tickStrip ? 0.14 : 0.08}});
    if (w.prior20Low != null) price.createPriceLine({price: w.prior20Low, color: C.brk, lineWidth: 1, lineStyle: LS.Dashed, axisLabelVisible: true, title: phone ? '' : '4-week low'});
    if (tickStrip) {
      var ticks = ch.addSeries(LW.HistogramSeries, {priceScaleId: 'brk', color: C.brk, priceLineVisible: false, lastValueVisible: false, base: 0}, 0);
      ticks.priceScale().applyOptions({mode: NORMAL, scaleMargins: {top: 0.955, bottom: 0}, visible: false});
      ticks.setData(D.map(function (d, i) { return sr.brk[i] ? {time: d, value: 1} : {time: d}; }));
    }


    var mk = [], evText = !phone && /^[135]y$/.test(S.range) ? 'first break after a bubble' : '';
    for (var j = 0; j < lp.E.length; j++) {
      var ii = lp.from + j, full = lp.full[j] === 1, tpj = TPh[j] || 0, tnj = TNh[j] || 0, spj = full ? lp.pos[j] || 0 : 0, snj = full ? lp.neg[j] || 0 : 0;

      if (tpj > 0 || spj > 0) mk.push({time: D[ii], position: 'inBar', shape: 'circle', color: tpj > 0 ? (full ? C.amber : 'rgba(245,184,75,0.5)') : C.panel, size: dsz(Math.max(tpj, spj))});
      if (tnj > 0 || snj > 0) {
        var posn = tpj > 0 || spj > 0 ? 'belowBar' : 'inBar';
        if (posn === 'inBar' || tnj > 0) mk.push({time: D[ii], position: posn, shape: 'circle', color: tnj > 0 ? (full ? C.teal : 'rgba(38,166,154,0.5)') : C.panel, size: dsz(Math.max(tnj, snj))});
      }
    }
    trustEvents().forEach(function (e) { if (IDX[e.date] != null) mk.push({time: e.date, position: 'belowBar', shape: 'square', color: C.brk, size: 1.3, text: evText}); });
    mk.forEach(function (m, q) { m.q = q; });
    mk.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : a.q - b.q; });
    mk.forEach(function (m) { delete m.q; });
    if (mk.length) LW.createSeriesMarkers(price, mk);
    lgFns.push(function (i) {
      var p = sr.price[i], q = i > 0 ? sr.price[i - 1] : null;
      return '<span class="pl-n">' + nm + '</span> <b>' + (p == null ? '—' : fpx(p)) + '</b>' +
        (p != null && q ? ' <span class="na">' + (p >= q ? '+' : '') + minus(((p / q - 1) * 100).toFixed(2)) + '%</span>' : '') +
        ' <span class="na">· ' + fd(D[i]) + (i === last ? ' (latest)' : '') + '</span>';
    });

    var mxP = 0, mxN = 0, b;
    for (b = 0; b < lp.E.length; b++) if (lp.A[b]) {
      var pb = Math.max(TPh[b] || 0, lp.pos[b] || 0), nb2 = Math.max(TNh[b] || 0, lp.neg[b] || 0);
      if (pb > mxP) mxP = pb; if (!(pb > 0) && nb2 > mxN) mxN = nb2;
    }

    var lconf = 13, oldMap = null, ld = [], ln = [], oMxP = 0, oMxN = 0;
    if (L) {
      lconf = L.conf || 13; oldMap = {};
      L.b.forEach(function (cb, k) {
        var d = D[L.from + k], cn = L.n[k];
        if (d == null || cb === null) return;
        var ok = cb >= 0;
        oldMap[d] = ok ? [cb, cn] : 'x';
        ld.push(ok ? {time: d, value: cb} : {time: d});
        ln.push(ok ? {time: d, value: -cn} : {time: d});
        if (ok) { oMxP = Math.max(oMxP, cb); oMxN = Math.max(oMxN, cn); }
      });
    }
    var top = Math.max(3, mxP, oMxP), tN = Math.max(mxN, oMxN), bot = tN > 0 ? -Math.max(3, tN) : 0;
    cntLim = Math.max(top, -bot);
    var countMargins = {top: narrow ? 0.3 : 0.24, bottom: bot ? 0.1 : 0.14};

    if (P.bub) {
      pane++;


      var bandOn = [], zeroD = [], barD = [], strictV = [], strictD = [], anyStrictH = false, isolated = false, CLR = 'rgba(0,0,0,0)';
      for (var i = 0; i < D.length; i++) {
        var jj = i - lp.from, st = heroBubAt(jj), t = D[i], ran = st !== 'pre' && st !== 'nc';
        var pos = ran ? TPh[jj] || 0 : 0, neg = ran ? TNh[jj] || 0 : 0;
        bandOn.push(st !== 'full' && !(pos || neg));
        var iso = st === 'full' && heroBubAt(jj - 1) !== 'full' && heroBubAt(jj + 1) !== 'full';
        if (iso) isolated = true;
        zeroD.push(st === 'pre' ? {time: t} : {time: t, value: 0, color: st === 'full' && (heroBubAt(jj + 1) === 'full' || iso) ? C.slate : CLR});
        if (pos > 0) barD.push({time: t, value: pos, color: st === 'full' ? C.amber : 'rgba(245,184,75,0.45)'});
        else if (neg > 0) barD.push({time: t, value: -neg, color: st === 'full' ? C.teal : 'rgba(38,166,154,0.45)'});
        else barD.push({time: t});

        var sv = st === 'full' ? (lp.pos[jj] > 0 ? lp.pos[jj] : lp.neg[jj] > 0 ? -lp.neg[jj] : 0) : null;
        strictV.push(sv); if (sv) anyStrictH = true;
      }


      if (anyStrictH) for (i = 0; i < D.length; i++) strictD.push(strictV[i] ? {time: D[i], value: strictV[i]} : {time: D[i]});



      var bandRuns = [], rs0 = -1, bandMin = null, tickV = bot + 0.25 * (top - bot);
      for (i = 0; i <= D.length; i++) { if (i < D.length && bandOn[i]) { if (rs0 < 0) rs0 = i; } else if (rs0 >= 0) { bandRuns.push([rs0, i - 1]); rs0 = -1; } }
      var bandS = ch.addSeries(LW.HistogramSeries, {color: BAND, base: bot, priceLineVisible: false, lastValueVisible: false, priceFormat: countFmt, autoscaleInfoProvider: fixed(bot, top)}, pane);
      bandFor = function (spanBars) {
        var w0 = ch.timeScale().width() || (el.clientWidth - 60), ppb = w0 / Math.max(1, spanBars), minLen = Math.max(1, Math.ceil(6 / Math.max(0.01, ppb)));
        if (minLen === bandMin) return;
        bandMin = minLen;
        var out = D.map(function (t0) { return {time: t0}; });
        bandRuns.forEach(function (r) { var v = r[1] - r[0] + 1 < minLen ? tickV : top; for (var q = r[0]; q <= r[1]; q++) out[q] = {time: D[q], value: v}; });
        bandS.setData(out);
      };
      ch.addSeries(LW.LineSeries, {color: C.slate, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        pointMarkersVisible: isolated, pointMarkersRadius: 2, priceFormat: countFmt, autoscaleInfoProvider: fixed(bot, top)}, pane).setData(zeroD);
      var hb = ch.addSeries(LW.HistogramSeries, {base: 0, priceLineVisible: false, lastValueVisible: false, priceFormat: countFmt, autoscaleInfoProvider: fixed(bot, top)}, pane);
      hb.setData(barD);
      if (anyStrictH) ch.addSeries(LW.LineSeries, {color: C.white, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: phone ? 2 : 2.5, priceLineVisible: false,
        lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: countFmt, autoscaleInfoProvider: fixed(bot, top)}, pane).setData(strictD);
      hb.priceScale().applyOptions({mode: NORMAL, scaleMargins: countMargins});
      var hasP = hasTrust();
      lgFns.push(function (i) {
        var j2 = i - lp.from, st2 = heroBubAt(j2), s, E, pos2, neg2, sp2v, sn2v;
        if (st2 === 'pre') s = '<span class="na">not run before ' + fdm(lp.fromDate) + '</span>';
        else if (st2 === 'nc') s = '<span class="na">not computed yet</span>';
        else {
          E = lp.E[j2]; pos2 = TPh[j2] || 0; neg2 = TNh[j2] || 0; sp2v = lp.pos[j2] || 0; sn2v = lp.neg[j2] || 0;
          var amb = function (n) { return '<b style="color:' + C.amber + '">' + n + '</b>'; }, mir = neg2 ? ' · <b style="color:' + C.teal + '">' + neg2 + '</b> falling' : '';
          var pf = hasP ? (narrow ? 'paper ' : 'paper filter ') : '';
          var strict = !hasP ? '' : ' · strict <b>' + sp2v + '</b>' + (narrow ? '' : ' of ' + E) + (sn2v ? ' · strict falling <b>' + sn2v + '</b>' : '');
          if (st2 === 'full') s = pf + '<b style="color:' + (pos2 ? C.amber : C.white) + '">' + pos2 + '</b> of ' + E + (hasP ? '' : narrow ? ' passed' : ' time scales passed') + mir + strict;
          else if (st2 === 'part') s = '<span class="na">still computing: ' + lp.A[j2] + ' of ' + E + ' time scales done,</span> ' + (pos2 ? amb(pos2) + ' passed ' + pf + 'so far' : 'none passed so far') + mir;
          else {
            var U = (lp.U && lp.U[j2]) || 0, V = lp.V && lp.V[j2] != null ? lp.V[j2] : E - U;
            s = (pos2 ? amb(pos2) + ' of the ' + V + ' solved passed' + (hasP ? ' the paper filter' : '') : 'none of the ' + V + ' solved passed') + mir + (U ? ' <span class="na">· ' + esc(fill(STR.unresolved, {unresolved: U})) + '</span>' : '');
          }
        }
        return '<span class="pl-n">Bubble test</span> ' + s + viewNote;
      });
    }

    if (P.old) {
      pane++;
      if (!L) {
        ch.addSeries(LW.LineSeries, {lineVisible: false, priceLineVisible: false, lastValueVisible: false}, pane).setData([]);
        lgFns.push(function () { return '<span class="pl-n">Old engine</span> <span class="na">not available</span>'; });
      } else {
        var olo = {color: 'rgba(178,181,190,0.9)', lineWidth: 1.5, lineType: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
          priceFormat: countFmt, autoscaleInfoProvider: fixed(bot, top)};
        var os = ch.addSeries(LW.LineSeries, olo, pane);
        os.setData(ld);
        if (oMxN > 0) ch.addSeries(LW.LineSeries, olo, pane).setData(ln);
        os.priceScale().applyOptions({mode: NORMAL, scaleMargins: countMargins});
        lgFns.push(function (i) {
          var o = oldMap[D[i]], s;
          if (o === undefined) s = '<span class="na">no reading</span>';
          else if (o === 'x') s = '<span class="na">fewer than ' + lconf + ' time scales that day</span>';
          else s = '<b>' + o[0] + '</b> of ' + lconf + ' rising' + (o[1] ? ' · <b>' + o[1] + '</b> falling' : '');
          return '<span class="pl-n">Old engine</span> ' + s;
        });
      }
    }

    if (P.gauge) {
      pane++;
      var gs = ch.addSeries(LW.LineSeries, {color: C.gauge, lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 3,
        priceFormat: {type: 'price', precision: 2, minMove: 0.01}}, pane);
      gs.setData(D.map(function (d, i) { return sr.run[i] == null ? {time: d} : {time: d, value: sr.run[i]}; }));
      gs.priceScale().applyOptions({mode: NORMAL, scaleMargins: {top: narrow ? 0.4 : 0.24, bottom: 0.14}});
      gs.createPriceLine({price: 0, color: C.muted, lineWidth: 1, lineStyle: LS.Dotted, axisLabelVisible: false, title: ''});
      lgFns.push(function (i) {
        return '<span class="pl-n">' + (narrow ? 'Runaway' : 'Runaway gauge') + '</span> ' + (sr.run[i] == null ? '<span class="na">n/a</span>' : '<b>' + g2(sr.run[i]) + '</b>') +
          ' <span class="na">· ' + (narrow ? 'up&nbsp;or&nbsp;down' : 'fast moves up or down') + '</span>';
      });
    }

    if (P.low) {
      pane++;
      var ls = ch.addSeries(LW.HistogramSeries, {color: C.brk, base: 0, priceLineVisible: false, lastValueVisible: false,
        priceFormat: {type: 'custom', formatter: function (v) { return minus((Math.abs(v) < 0.05 ? 0 : v).toFixed(1)) + '%'; }, minMove: 0.1},
        autoscaleInfoProvider: function (orig) { var r = orig(), mn = r && r.priceRange ? r.priceRange.minValue : 0; return {priceRange: {minValue: Math.min(-5, mn), maxValue: 0}}; }}, pane);
      ls.setData(D.map(function (d, i) {
        if (sr.low20[i] == null || sr.price[i] == null) return {time: d};
        var v = 100 * (sr.price[i] / sr.low20[i] - 1);
        return v < 0 ? {time: d, value: v} : {time: d, value: 0, color: 'rgba(138,142,153,0.4)'};
      }));
      ls.priceScale().applyOptions({mode: NORMAL, scaleMargins: {top: 0.26, bottom: 0.1}});
      lgFns.push(function (i) {
        if (sr.low20[i] == null || sr.price[i] == null) return '<span class="pl-n">Below 4-week low</span> <span class="na">n/a</span>';
        var v = sr.price[i] / sr.low20[i] - 1;
        return '<span class="pl-n">Below 4-week low</span> ' + (v < 0 ? '<b style="color:' + C.brk + '">' + pct1(-v) + ' below</b> <span class="na">(weakening)</span>' :
          '<b>no</b> <span class="na">· ' + pct1(v) + ' above it</span>');
      });
    }




    if (P.heat) {
      pane++;
      if (!kdjRows) {
        ch.addSeries(LW.LineSeries, {lineVisible: false, priceLineVisible: false, lastValueVisible: false}, pane).setData([]);
        lgFns.push(function () { return '<span class="pl-n">Heating / cooling</span> <span class="na">' + (S.d.err && S.d.err.kdj ? 'not loaded' : S.d.kdj ? 'not computed yet' : 'loading…') + '</span>'; });
      } else {
        var SPh = kin === 'shape' ? lpArr('shape', 'pos') : null, conf13 = (S.d.ov.c13 && S.d.ov.c13.configured) || nScales();

        var kMarg = {top: narrow ? 0.32 : 0.24, bottom: 0.08};
        if (SPh) {
          var scs = ch.addSeries(LW.HistogramSeries, {priceScaleId: 'shape', color: 'rgba(138,142,153,0.30)', base: 0, priceLineVisible: false, lastValueVisible: false,
            priceFormat: countFmt, autoscaleInfoProvider: fixed(0, conf13)}, pane);
          scs.priceScale().applyOptions({visible: false, mode: NORMAL, scaleMargins: kMarg});
          scs.setData(D.map(function (d, i) { var j4 = i - lp.from; return heroBubAt(j4) === 'full' && SPh[j4] > 0 ? {time: d, value: SPh[j4]} : {time: d}; }));
        }


        var KCLR = 'rgba(0,0,0,0)', FLATC = 'rgba(138,142,153,0.75)', kSer = K[kin];
        var drawnR = function (r) { return !!r && r[5] != null && r[9] !== 'x'; }, flatR = function (r) { return !!r && r[9] === 'x'; };
        var kdBuild = function (rows) {
          var pts = rows.filter(function (r) { return IDX[r[2]] != null; }), o = {kk: [], dd: [], ff: [], cr: [], rows: pts, ends: [], map: {}};
          pts.forEach(function (r, q) {
            var nx = pts[q + 1], pv = pts[q - 1], t = r[2];
            o.ends.push(t); o.map[t] = r;
            if (drawnR(r)) {

              if (flatR(pv) && pv[5] != null && !drawnR(pv)) { o.kk[q - 1] = {time: pv[2], value: pv[5], color: C.k}; o.dd[q - 1] = {time: pv[2], value: pv[6], color: C.d}; }
              o.kk.push({time: t, value: r[5], color: drawnR(nx) ? C.k : KCLR});
              o.dd.push({time: t, value: r[6], color: drawnR(nx) ? C.d : KCLR});
              if (r[10]) o.cr.push({time: t, position: 'inBar', shape: 'circle', color: r[10] === 'u' ? C.upx : C.teal, size: 0.7});
            } else { o.kk.push({time: t}); o.dd.push({time: t}); }
            o.ff.push(flatR(r) ? {time: t, value: 50, color: flatR(nx) ? FLATC : KCLR} : {time: t});
          });
          return o;
        };


        var PVST = {building: 'b', fading: 'f', steady: 'n', flat: 'x'}, kdMode = null;
        var mkTf = function (tf) {
          var ser = kSer[tf]; if (!ser || !ser.rows || !ser.rows.length) return null;
          var o = kdBuild(ser.rows), pv = ser.preview && IDX[ser.preview.plotDate] != null ? ser.preview : null;
          o.lastR = o.rows.length ? o.rows[o.rows.length - 1] : null;
          o.pvRow = pv && o.lastR && pv.plotDate > o.lastR[2] ? [pv.key, pv.start, pv.plotDate, 'p', pv.value, pv.k, pv.d, pv.j, pv.flat ? 1 : 0, pv.flat ? 'x' : PVST[pv.state] || 'n', null] : null;
          return o.rows.length ? o : null;
        };
        var kdD = kdBuild(kdjRows), TFK = {D: kdD, W: mkTf('W'), M: mkTf('M')}, PER = {D: 1, W: 5, M: 21};

        var kFmt = {type: 'custom', minMove: 1, formatter: function (v) { var r = Math.round(v); return Math.abs(v - r) < 1e-6 && r % 10 === 0 && r !== 20 && r !== 50 && r !== 80 ? '' : String(r); }};
        var k100 = fixed(0, 100), kLine = function (c, extra) {
          var o = {color: c, lineWidth: 1.2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: kFmt, autoscaleInfoProvider: k100};
          if (extra) Object.keys(extra).forEach(function (q) { o[q] = extra[q]; });
          return ch.addSeries(LW.LineSeries, o, pane);
        };
        var fs = kLine(FLATC, {lineWidth: 1.5, lineStyle: LS.Dotted});
        var ds = kLine(C.d), ks = kLine(C.k);
        var pvK = kLine(C.k, {lineWidth: 1, lineStyle: LS.Dashed}), pvD = kLine(C.d, {lineWidth: 1, lineStyle: LS.Dashed});
        ks.priceScale().applyOptions({mode: NORMAL, scaleMargins: kMarg});
        [20, 50, 80].forEach(function (lv) {
          ks.createPriceLine({price: lv, color: 'rgba(138,142,153,0.45)', lineWidth: 1, lineStyle: LS.Dotted, lineVisible: lv !== 50, axisLabelVisible: true,
            axisLabelColor: C.panel, axisLabelTextColor: C.muted, title: ''});
        });
        var crApi = LW.createSeriesMarkers(ks, []), crKey = null;
        var setKd = function (m) {
          if (m === kdMode) return;
          kdMode = m;
          var src = TFK[m], ff = src.ff.slice(), lr = src.lastR, pr = src.pvRow;
          ks.setData(src.kk); ds.setData(src.dd);
          var pk = [], pd = [];
          if (pr && lr) {
            if (drawnR(lr) && drawnR(pr)) {
              pk = [{time: lr[2], value: lr[5]}, {time: pr[2], value: pr[5]}];
              pd = [{time: lr[2], value: lr[6]}, {time: pr[2], value: pr[6]}];
            } else if (flatR(lr) && flatR(pr)) {
              ff[ff.length - 1] = {time: lr[2], value: 50, color: FLATC};
              ff.push({time: pr[2], value: 50, color: KCLR});
            }
          }
          fs.setData(ff); pvK.setData(pk); pvD.setData(pd);
          S.heroKdMode = m;
        };




        crossFor = function (spanBars) {
          var w0 = ch.timeScale().width() || (el.clientWidth - 60), dpp = spanBars / Math.max(1, w0), m = 'D';
          if (TFK.W && spanBars > 400 && dpp > (kdMode === 'D' || !kdMode ? 1.05 : 0.9)) m = TFK.M && dpp > (kdMode === 'M' ? 6 : 7.5) ? 'M' : 'W';
          setKd(m);

          var src = TFK[kdMode], want = kdMode === 'D' ? spanBars <= 1.3 * w0 : 3 * spanBars / PER[kdMode] <= w0, key = kdMode + (want ? '1' : '0');
          if (key !== crKey) { crKey = key; crApi.setMarkers(want && src.cr.length ? src.cr : []); }
          S.heroCrossOn = src.cr.length ? want : null;
        };
        setKd('D');
        var KW = {b: 'heating up', f: 'cooling down', n: 'steady', x: 'flat (no change)', w: 'too little history', u: 'unavailable'};
        var KWN = {b: 'heating', f: 'cooling', n: 'steady', x: 'flat', w: 'too little history', u: 'unavailable'};
        var periodRow = function (o, d) {
          var q = lowerBound(o.ends, d);
          if (q < o.ends.length) { var r = o.rows[q]; return r[1] <= d ? r : null; }
          return o.pvRow && d >= o.pvRow[1] ? o.pvRow : null;
        };
        var TFW = {W: ['weekly ', 'this week so far: ', 'wk ', 'this wk '], M: ['monthly ', 'this month so far: ', 'mo ', 'this mo ']};
        heatLg = lgFns.length;
        var tight = window.innerWidth < 380;
        lgFns.push(function (i) {
          var wk = kdMode !== 'D', r = wk ? periodRow(TFK[kdMode], D[i]) : kdD.map[D[i]], j4 = i - lp.from, sc = '', st4 = heroBubAt(j4);
          var n0 = '<span class="pl-n">' + (narrow ? 'Heat/cool' : 'Heating / cooling') + '</span> ';
          if (SPh) sc = st4 === 'full' ? (narrow ? '<b>' + (SPh[j4] || 0) + '</b>/' + conf13 : 'shape count <b>' + (SPh[j4] || 0) + '</b> of ' + conf13) :
            st4 === 'pre' ? '' : '<span class="na">' + (narrow ? 'n/a' : 'shape count n/a') + '</span>';
          var pvw = !!r && r[3] === 'p', sep = sc ? ' · ' : '', so = '';
          var wkT = wk ? '<span class="na">' + TFW[kdMode][(pvw ? 1 : 0) + (narrow ? 2 : 0)] + '</span>' : '';
          if (!r) return n0 + (sc || '<span class="na">n/a</span>');
          if (r[9] === 'x') return n0 + sc + sep + wkT + '<span class="na">' + (narrow ? KWN.x : KW.x) + '</span>' + so;
          if (r[5] == null) return n0 + sc + sep + wkT + '<span class="na">' + (KW[r[9]] || 'n/a') + '</span>' + so;
          var cross = r[10] ? (narrow ? ' <i class="pl-x" style="background:' + (r[10] === 'u' ? C.upx : C.teal) + '" title="' + (r[10] === 'u' ? 'crossed up' : 'crossed down') + '"></i>' :
            ' · ' + (r[10] === 'u' ? 'crossed up' : 'crossed down')) : '';
          var kg = tight ? '' : ' ';
          return n0 + sc + sep + wkT + '<span style="color:' + C.k + '">K' + kg + Math.round(r[5]) + '</span> <span style="color:' + C.d + '">D' + kg + Math.round(r[6]) + '</span> <span class="na">· ' +
            ((narrow ? KWN : KW)[r[9]] || '') + cross + '</span>' + so;
        });
      }
    }
    var panes = ch.panes();
    panes[0].setStretchFactor(priceH);
    for (var pz = 1; pz < panes.length; pz++) panes[pz].setStretchFactor(paneH);

    var lgEls = lgFns.map(function (f, k) { var dv = document.createElement('div'); dv.className = 'pl' + (k === heatLg && narrow ? ' pl1' : ''); el.appendChild(dv); return dv; });
    var place = function () {
      if (!CH.hero || CH.hero !== ch) return;
      var y = 0, ps = ch.panes();
      ps.forEach(function (p, k) { if (lgEls[k]) lgEls[k].style.top = (y + 4) + 'px'; y += p.getHeight() + 1; });
    };
    var show = function (i) { cur = i; lgFns.forEach(function (f, k) { lgEls[k].innerHTML = f(i); }); };


    var preset = heroPreset(el);
    var noteFor = function (a, z) {
      if (!P.bub) return '';
      var pre = 0, nc = 0, un = 0, n = 0;
      for (var q = a; q <= z; q++) {
        if (sr.price[q] == null) continue;
        n++; var s2 = heroBubAt(q - lp.from);
        if (s2 === 'pre') pre++; else if (s2 === 'nc' || s2 === 'part') nc++; else if (s2 === 'unres') un++;
      }
      if (!n || pre + nc + un < 0.1 * n) return '';
      var ws = [pre ? 'not run' : '', nc ? 'not computed yet' : '', un ? 'not fully solved' : ''].filter(Boolean);
      var what = ws.length > 1 ? ws.slice(0, -1).join(', ') + ' or ' + ws[ws.length - 1] : ws[0];
      return ' <span class="na">· ' + int(pre + nc + un) + (narrow ? '/' : ' of ') + int(n) + ' days in view ' + what + '</span>';
    };
    var onView = debounce(function () {
      if (CH.hero !== ch) return;
      var lr = ch.timeScale().getVisibleLogicalRange(); if (!lr || !(ch.timeScale().width() > 0)) return;
      var a = Math.max(0, Math.ceil(lr.from)), z = Math.min(last, Math.floor(lr.to));
      if (z < a) return;
      S.heroVis = [a, z]; S.heroLR = {from: lr.from, to: lr.to}; S.heroSpan = lr.to - lr.from;

      var tb = S.heroSpan > 2000 ? 2 : S.heroSpan > 300 ? 1 : 0;
      if (tb !== tickBucket) { tickBucket = tb; ch.applyOptions({timeScale: {tickMarkFormatter: function (t, ty) { return tickFmt(t, ty); }}}); }
      var tol = Math.max(3, 0.02 * (preset.to - preset.from));
      setPressed($('rangeSeg'), 'r', Math.abs(lr.from - preset.from) <= tol && Math.abs(lr.to - preset.to) <= tol ? S.range : '');
      viewNote = noteFor(a, z);
      if (crossFor) crossFor(lr.to - lr.from);
      if (bandFor) bandFor(lr.to - lr.from);
      show(held != null ? held : cur);
      safe('price caption', renderTvKeyCaption);
    }, 120);
    var visLast = function () { var lr = ch.timeScale().getVisibleLogicalRange(); return lr ? Math.min(last, Math.floor(lr.to)) : last; };
    var visFirst = function () { var lr = ch.timeScale().getVisibleLogicalRange(); return lr ? Math.max(0, Math.ceil(lr.from)) : 0; };
    var f0 = Math.max(0, firstNonNull(sr.price, 0));
    var srText = function () { return lgEls.map(function (e) { return e.textContent; }).join('. '); };
    var pin = function (i, kb) {
      i = Math.max(f0, Math.min(last, i));
      if (kb) {
        var lr = ch.timeScale().getVisibleLogicalRange();
        if (lr && (i < lr.from + 1 || i > lr.to - 1)) {
          var sp = lr.to - lr.from, nf = i < lr.from + 1 ? i - 2 : i + 2 - sp;
          ch.timeScale().setVisibleLogicalRange({from: nf, to: nf + sp});
        }
      }
      held = i; show(i);
      if (sr.price[i] != null) ch.setCrosshairPosition(sr.price[i], D[i], price);
      if (kb) $('heroSr').textContent = srText();
    };
    var release = function () { held = null; ch.clearCrosshairPosition(); show(last); };
    S.heroApi = {pin: pin, release: release, held: function () { return held; }, lastVis: visLast, firstVis: visFirst,
      reset: function () { S.heroLR = heroPreset(el); ch.timeScale().setVisibleLogicalRange(S.heroLR); }};
    viewNote = noteFor(preset.from < 0 ? 0 : Math.max(0, Math.ceil(preset.from)), last);
    show(last);
    requestAnimationFrame(place);
    setTimeout(place, 250);
    ch.subscribeCrosshairMove(function (p) {
      var d = p && p.time ? timeKey(p.time) : null;
      if (d != null && IDX[d] != null) show(IDX[d]); else show(held != null ? held : last);
    });

    ch.subscribeClick(function (p) {
      if (S.heroPtr !== 'touch' || !p || !p.time) return;
      var i = IDX[timeKey(p.time)];
      if (i != null) pin(i, false);
    });
    ch.timeScale().subscribeSizeChange && ch.timeScale().subscribeSizeChange(place);
    S.heroLR = keep || preset; S.heroSpan = S.heroLR.to - S.heroLR.from;
    if (crossFor) crossFor(S.heroSpan);
    if (bandFor) bandFor(S.heroSpan);
    ch.timeScale().setVisibleLogicalRange(S.heroLR);
    ch.timeScale().subscribeVisibleLogicalRangeChange(onView);
    onView();
    $('tvHint').textContent = phone ? 'Swipe sideways on the chart to move back in time; pinch to zoom; tap a day for its values.'
                                    : 'Drag the chart to move back in time; pinch, Ctrl+scroll or drag the time axis to zoom; hover for values. Double-click the time axis to go back to the chosen range.';
  }


  function bigOf(n, E, cls, unit) { return '<div class="v-big' + (cls ? ' ' + cls : '') + '">' + n + '<span class="of"> of ' + E + '</span></div><div class="v-unit">' + (unit || 'time scales') + '</div>'; }


  function failCounts(rule) {
    var c = S.d.ov.c13, o = {}, V = 0, T = S.d.today;
    if (rule === 'strict') {
      if (!c || !c.qc || !c.V) return null;
      CHECKS.forEach(function (x) { if (c.qc[x[0]] > 0) o[x[0]] = c.qc[x[0]]; });
      return {n: o, V: c.V};
    }
    if (!T) return null;
    T.p.forEach(function (fl, i) {
      if (!T.ok[i] || fl == null) return;
      V++; fl.split('').forEach(function (k) { o[k] = (o[k] || 0) + 1; });
    });
    return V ? {n: o, V: V} : null;
  }
  function failKeys(fc) { return Object.keys(fc.n).sort(function (a, b) { return (fc.n[b] - fc.n[a]) || (CHK[a].i - CHK[b].i); }); }
  function missLine(rule, lead) {
    var fc = failCounts(rule); if (!fc) return '';
    var keys = failKeys(fc).slice(0, 2);
    if (!keys.length) return '';
    return '<b>' + lead + '</b> ' + esc(keys.map(function (q) { return lcFirst(failText(q)) + ' (' + fc.n[q] + ' of ' + fc.V + ')'; }).join(' and ') + '.');
  }
  function renderMisses() {
    var c = S.d.ov.c13, r = rulesOf(S.d.ov), out = [], k = bubKind(c);
    if (!c || !c.V || !r || !(k === 'full' || k === 'partial' || k === 'unres')) { $('bubMisses').innerHTML = ''; return; }
    if (r.paper && r.pos < c.V) { var p = missLine('paper', 'Paper filter misses:'); if (p) out.push(p); }
    if (r.sPos < c.V) { var s = missLine('strict', r.paper ? 'Strict rule misses:' : 'Main misses today:'); if (s) out.push(s); }
    $('bubMisses').innerHTML = out.map(function (x) { return '<p>' + x + '</p>'; }).join('');
  }
  function renderBubble() {
    var ov = S.d.ov, c = ov.c13, k = bubKind(c), r = rulesOf(ov), v, pf = !!(r && r.paper), ht = S.d.histT;
    var unit = pf ? 'time scales, paper filter' : 'time scales';
    var strictLine = function () {
      if (!pf) return '';
      var n = r.sPos ? r.sPos + ' of ' + c.E + ' rising' : r.sNeg ? r.sNeg + ' of ' + c.E + ' falling' : '0 of ' + c.E;

      return '<div class="v-strict">' + (r.sPos ? '<i class="ring ring-a" aria-hidden="true"></i>' : '') + 'Strict rule: <b>' + n + '</b></div>' +
        '<div class="v-gloss">Two ways to judge the same fitted curves: the <b>paper filter</b> (the published paper\'s looser limits) and the <b>strict rule</b> (this page\'s original reading, much stricter on curve error; it almost never passes).</div>';
    };
    if (k === 'full') {
      if (r.pos > 0) v = bigOf(r.pos, c.E, 'amber', unit) + strictLine() + '<div class="v-text"><b>Rising bubble shape</b> on ' + (r.pos === 1 ? 'this time scale' : 'these time scales') +
        '. This describes the path so far.' + (r.neg ? ' ' + r.neg + ' show the falling (crash-shape) mirror.' : '') + '</div>';
      else if (r.neg > 0) v = bigOf(r.neg, c.E, 'teal', unit) + strictLine() + '<div class="v-text"><b>Falling (crash-shape) mirror</b>: a path that has been dropping faster and faster. It describes the path so far.</div>';
      else {
        var usual = ht.full && (ht.daysPos + ht.daysNeg) < ht.full / 2;
        v = bigOf(0, c.E, '', unit) + strictLine() + '<div class="v-text">' + (covInfo().low ?
          '<b>No bubble shape today.</b> Most of this symbol\'s history is not computed yet, so how usual that is stays unknown.' :
          (r.sPos ? '<b>No bubble shape under the paper filter</b>, though the strict rule passed.' : '<b>No bubble shape' + (pf ? ' under either rule' : '') + '.</b>') + (usual ? ' The usual reading.' : '')) + '</div>';
      }
    } else if (k === 'partial') {
      var x = countCodes(c.codes || '', 'X'), done = c.E - x, u = Math.max(0, (c.U || 0) - x), via = pf ? ' the paper filter' : '';
      var got = r.pos || r.neg ? (r.pos ? ' ' + r.pos + ' passed' + via + ' (rising)' : '') + (r.neg ? (r.pos ? ',' : '') + ' ' + r.neg + ' passed' + via + ' (falling)' : '') + '.' : ' none passed.';
      v = '<div class="v-word dim">Still computing</div><div class="v-text"><b>' + done + ' of ' + c.E + '</b> time scales checked so far today,' + got +
        (x ? ' The other ' + x + ' are not computed yet, so there is no overall answer yet.' : '') +
        (u ? ' ' + u + ' could not be solved; they still count in the ' + c.E + '.' : '') + '</div>';
    } else if (k === 'unres') {
      var via2 = pf ? ' the paper filter' : '';
      var gotU = r.pos || r.neg ? (r.pos ? ' ' + r.pos + ' passed' + via2 + ' (rising)' : '') + (r.neg ? (r.pos ? ',' : '') + ' ' + r.neg + ' passed' + via2 + ' (falling)' : '') + '.' : ' none passed.';
      v = '<div class="v-word dim">Incomplete</div><div class="v-text"><b>' + (c.V || 0) + ' of ' + c.E + '</b> time scales solved today,' + gotU + ' ' + (c.U || 0) +
        ' could not be solved; they still count in the ' + c.E + ', so there is no full answer today.</div>';
    } else if (k === 'notyet') {
      v = '<div class="v-word dim">Not computed yet</div><div class="v-text">This symbol\'s bubble-shape readings are still being computed, newest days first.</div>';
    } else {
      v = '<div class="v-word dim">No reading</div><div class="v-text">' + esc(kindMsg(k)) + '</div>';
    }
    $('bubVerdict').innerHTML = v;
    renderMisses();
    renderDots();
    renderBubHistory();
    $('bubFine').innerHTML = lines(bubStates(c, r).map(esc));
    if ($('bubWhy').open) renderBubWhy();
  }
  function dotText(code, i) {
    var head = '<b>' + scaleName(i) + '</b>: ', pf = hasTrust();
    if (code === 'P') return head + '<b>passed ' + (pf ? 'both rules' : 'all 10 checks') + '</b>, rising bubble shape.';
    if (code === 'N') return head + '<b>passed ' + (pf ? 'both rules' : 'all 10 checks') + '</b>, falling (crash-shape) mirror.';
    if (code === 'A') return head + '<b>passed the paper filter</b> (not the strict rule), rising bubble shape.';
    if (code === 'B') return head + '<b>passed the paper filter</b> (not the strict rule), falling (crash-shape) mirror.';
    if (code === 'X') return head + 'not computed yet. It counts as unresolved, never as zero.';
    if (code === 'U') return head + 'the fit could not be solved. It is unresolved and still counts in the ' + ((S.d.ov.c13 && S.d.ov.c13.E) || 13) + '.';
    if (code === 'I') return head + 'not enough price history for this time scale.';
    var f = CODE[code];
    return head + 'checked, ' + (pf ? 'passed neither rule. First strict check it failed' : 'no bubble shape. First check it failed') + ': <b>' + (f ? lcFirst(CHK[f].fail) : esc(code)) + '</b>.';
  }
  function plainResult(code) {
    var pf = hasTrust();
    if (code === 'P') return pf ? 'passed both rules, rising bubble shape' : 'passed all 10 checks, rising bubble shape';
    if (code === 'N') return pf ? 'passed both rules, falling mirror' : 'passed all 10 checks, falling mirror';
    if (code === 'A') return 'passed the paper filter only, rising bubble shape';
    if (code === 'B') return 'passed the paper filter only, falling mirror';
    if (code === 'X') return 'not computed yet';
    if (code === 'U') return 'unresolved, the fit could not be solved';
    if (code === 'I') return 'not enough price history';
    var f = CODE[code];
    return pf ? 'checked, passed neither rule' : 'checked, did not pass' + (f ? ' (first failed check: ' + lcFirst(CHK[f].fail) + ')' : '');
  }
  function renderDots() {
    var c = S.d.ov.c13;
    if (!c || !c.codes) { $('bubDots').innerHTML = ''; $('bubScale').innerHTML = ''; $('bubDotNote').textContent = ''; return; }
    $('bubDots').innerHTML = c.codes.split('').map(function (cd, i) {
      var cls = 'PNXUIAB'.indexOf(cd) >= 0 ? cd : 'R';
      return '<button type="button" class="d ' + cls + (S.dot === i ? ' sel' : '') + '" data-i="' + i + '" aria-pressed="' + (S.dot === i) + '" aria-label="' +
        esc(scaleName(i) + ': ' + plainResult(cd)) + '"></button>';
    }).join('');
    $('bubScale').innerHTML = '<span>' + esc(scaleShort()) + '</span><span><span class="lg">← each circle is one time scale →</span><span class="sh">← one per time scale →</span></span><span>' +
      esc(scaleLong()) + '</span>';
    renderDotNote();
  }


  function circleNote(i) {
    var c = S.d.ov.c13, cd = c.codes[i];
    if (!hasTrust() || 'XUI'.indexOf(cd) >= 0 || !S.d.today) return dotText(cd, i);
    var head = '<b>' + scaleName(i) + '</b>: ';
    var pPass = 'PNAB'.indexOf(cd) >= 0, sPass = cd === 'P' || cd === 'N', fall = cd === 'N' || cd === 'B';
    var verdict = sPass ? 'passed both rules' : pPass ? 'passed the paper filter, not the strict rule' : 'checked, passed neither rule';
    verdict += pPass ? (fall ? ' (falling mirror).' : ' (rising bubble shape).') : '.';
    var row = function (rule, name, passed) {
      if (passed) return '<span class="rl"><b>' + name + ':</b> passed every check.</span>';
      var fl = failsUnder(i, rule);
      if (!fl || !fl.length) return '<span class="rl"><b>' + name + ':</b> did not pass, right at a limit.</span>';
      return '<span class="rl"><b>' + name + ':</b> failed ' + (fl.length === 1 ? 'one check' : fl.length + ' checks') + ': ' +
        fl.map(function (q) { return lcFirst(failText(q)); }).join(', ') + '.</span>';
    };
    return head + verdict + row('paper', 'Paper filter', pPass) + row('strict', 'Strict rule', sPass);
  }
  function renderDotNote() {
    var c = S.d.ov.c13;
    if (!c || !c.codes) return;
    var note, pf = hasTrust();
    if (S.dot != null && c.codes[S.dot]) note = circleNote(S.dot);
    else note = (pf ? 'Amber = passed the paper filter.' + (countCodes(c.codes, 'PN') ? ' White ring = passed the strict rule too.' : '') + (countCodes(c.codes, 'NB') ? ' Teal = falling mirror.' : '') + ' Hollow = passed neither.' :
      'Amber = passed all 10 checks.' + (countCodes(c.codes, 'N') ? ' Teal = falling mirror passed.' : '') + ' Hollow = checked, did not pass.') +
      (countCodes(c.codes, 'X') ? ' Hatched = not computed yet.' : '') + (countCodes(c.codes, 'U') ? ' Dashed = could not be solved.' : '') + ' Tap a circle for why.';
    $('bubDotNote').innerHTML = note;
  }
  function renderBubHistory() {
    var h = S.d.histT, hs = S.d.hist, sr = S.d.series, cov = covInfo(), c0 = S.d.ov.c13, conf = (c0 && c0.configured) || 13, hb, pf = hasTrust();
    var r0 = rulesOf(S.d.ov), vSaysLow = bubKind(c0) === 'full' && r0 && !r0.pos && !r0.neg && cov.low;
    if (!h.full) {
      hb = '<div class="h-title"><b>History not computed yet.</b> The newest days are computed first; ' + int(cov.complete) + ' of ' + int(cov.scheduled) +
        ' days are complete. Missing days are never counted as zero.</div>';
    } else {
      var t, older = h.olderMissing ? '; older days are not computed yet' : '';
      var strictTail = pf ? '; strict rule on ' + plural(hs.daysPos, 'day') + (hs.daysNeg ? ' (falling mirror on ' + plural(hs.daysNeg, 'day') + ')' : '') + '.' : '.';
      var name = pf ? 'Paper filter' : 'Bubble shape';
      if (h.daysPos) t = '<b>' + name + ' passed on ' + plural(h.daysPos, 'day') + '</b> since ' + fdm(h.first) + ' (' + plural(h.episodes, 'episode') + ', latest ' + fd(h.lastPos) +
        ', at most ' + h.maxPos + ' of ' + conf + ' time scales' + older + ')' + strictTail +
        (h.daysNeg ? ' The falling mirror passed the paper filter on ' + plural(h.daysNeg, 'day') + ' (latest ' + fd(h.lastNeg) + ').' : '');
      else if (h.daysNeg) t = '<b>No rising shape so far.</b> The falling mirror passed ' + (pf ? 'the paper filter ' : '') + 'on ' + int(h.daysNeg) + ' of ' + plural(h.full, 'day') + ' checked since ' + fdm(h.first) + ' (latest ' + fd(h.lastNeg) + older + ')' + strictTail;
      else if (cov.low) t = '<b>Only ' + int(cov.complete) + ' of ' + int(cov.scheduled) + ' days checked so far:</b> 0 passes in ' + plural(h.tries, 'try', 'tries') + (pf ? ' under either rule' : '') + ' (' +
        (fdm(h.first) === fdm(h.lastFull) ? fdm(h.first) : fdm(h.first) + ' to ' + fdm(h.lastFull)) + ').' +
        (vSaysLow ? '' : ' The rest of the history is not computed yet, so how often this test passes is still unknown.');
      else if (pf && (hs.daysPos || hs.daysNeg)) t = '<b>Paper filter: never so far</b> in ' + plural(h.full, 'day') + ' checked since ' + fdm(h.first) + older + strictTail;
      else t = '<b>Never so far:</b> 0 passes in ' + plural(h.tries, 'try', 'tries') + (pf ? ' under either rule' : '') + ' on ' + plural(h.full, 'day') + ' checked since ' + fdm(h.first) + older + '. "None" is the usual reading.';

      if ((h.daysPos || h.daysNeg || hs.daysPos || hs.daysNeg) && isReplay()) t += ' <span class="h-note">Replayed on today\'s data.</span>';
      if ((h.daysPos || h.daysNeg) && cov.low) t += ' Only ' + int(cov.complete) + ' of ' + int(cov.scheduled) + ' days are checked so far.';
      hb = '<div class="h-title">' + t + '</div><canvas class="strip" id="bubStrip" aria-hidden="true"></canvas><div class="strip-ax"><span>' + fdm(sr.lp.fromDate) + '</span>' +
        (h.notyet || h.unres ? '<span class="x">' + (h.notyet && h.unres ? 'not computed yet or could not be solved' : h.notyet ? 'not computed yet' : 'could not be solved') + '</span>' : '') +
        '<span>' + fdm(sr.through) + '</span></div>';
    }
    $('bubHistory').innerHTML = hb;
    drawStrip();
  }
  function drawStrip() {
    var cv = $('bubStrip'); if (!cv || !S.d) return;
    var g = fitCanvas(cv, 12), ctx = g.ctx, W = g.W, lp = S.d.series.lp, n = lp.E.length, pat = hatchPattern(ctx);
    var PR = {P: 5, N: 4, p: 3, n: 3, X: 2, R: 1}, col = {}, codes = [], j, x;
    for (j = 0; j < n; j++) {
      var s = stripCode(lp.from + j); codes.push(s); x = Math.floor(j / n * W);
      if (s && (!col[x] || PR[s] > PR[col[x]])) col[x] = s;
    }
    Object.keys(col).forEach(function (x) {
      var s = col[x];
      ctx.fillStyle = s === 'X' ? pat : STRIPCOL[s];
      ctx.fillRect(+x, 0, 1, 12);
    });


    var runs = [], cur = null;
    for (j = 0; j < n; j++) { if (cur && cur.c === codes[j]) cur.b = j; else { cur = {c: codes[j], a: j, b: j}; runs.push(cur); } }
    var cell = function (r) {
      var x1 = r.a / n * W, x2 = (r.b + 1) / n * W, w = Math.max(3, x2 - x1), xc = (x1 + x2) / 2;
      ctx.fillStyle = r.c === 'X' ? pat : STRIPCOL[r.c];
      ctx.fillRect(Math.max(0, Math.min(W - w, xc - w / 2)), 0, w, 12);
    };
    runs.forEach(function (r) { if (r.c && 'RXpn'.indexOf(r.c) >= 0 && (r.b + 1 - r.a) / n * W < 3) cell(r); });
    runs.forEach(function (r) { if (r.c === 'P' || r.c === 'N') cell(r); });
  }

  function hbar(label, val, frac, title) {
    return '<div class="hb"' + (title ? ' title="' + esc(title) + '"' : '') + '><div class="row"><span>' + esc(label) + '</span><b>' + val +
      '</b></div><div class="trk"><div class="fil" style="width:' + Math.max(1, Math.min(100, Math.round(100 * frac))) + '%"></div></div></div>';
  }

  function rulesTable() {
    var row = function (name, plain, p, s2) {
      var d = p !== s2;
      return '<tr><td><b>' + name + '</b><small class="rp">' + plain + '</small></td><td>' + (d ? '<b>' + p + '</b>' : p) + '</td><td>' + (d ? '<b>' + s2 + '</b>' : s2) + '</td></tr>';
    };
    return '<h3>Two rules, side by side</h3><p>Both rules read the <b>same fitted curves</b> (nothing is refitted); they only differ in how close a curve must come to the textbook bubble shape.</p>' +
      '<div class="tbl-wrap rules-wrap"><table class="rt rules"><thead><tr><th>Check</th><th>Paper filter</th><th>Strict rule</th></tr></thead><tbody>' +
      row('Turn date', 'how far ahead the curve\'s turn may be', 'a little closer', 'a little further') +
      row('Curve bend', 'the climb bends the right amount', 'same', 'same') +
      row('Wiggle rhythm', 'wiggles neither too fast nor too slow', 'same', 'same') +
      row('Wiggles', 'how many wiggles the curve shows', 'same', 'same') +
      row('Damping', 'the climb must outweigh the wiggles', 'looser', 'tighter') +
      row('Error allowed', 'largest gap between curve and price, on any day', 'looser', 'much tighter') +
      '</tbody></table></div>' +
      '<p class="note">Both rules also need the same four numerical checks: the fit finished, the maths is stable, the price actually moved and the curve has a clear size.</p>' +
      '<ul class="plain">' +
      '<li><b>Strict rule</b> (this page\'s original rule): its tight error limit rejects almost everything.</li>' +
      '<li><b>Paper filter</b> uses the limits published in the LPPLS research, on the same fits.</li>' +
      (S.d.ov.shape ? '<li><b>Shape count</b> (the heating / cooling input) keeps only the shape checks (turn date, curve bend, wiggle rhythm, wiggles) and drops damping and error, so it is looser than either rule.</li>' : '') +
      '</ul>';
  }

  function renderPaperFails() {
    var el = $('paperFails'); if (!el || !S.d) return;
    var fc = failCounts('paper'), r = rulesOf(S.d.ov);
    if (!fc) { el.innerHTML = stateMsg(STR.reqError); return; }
    var keys = failKeys(fc), failed = fc.V - (r ? r.pos + r.neg : 0);
    el.innerHTML = failed > 0 && keys.length ? '<p class="note">' + failed + ' of ' + fc.V + ' failed.</p>' + keys.map(function (q) { return hbar(failText(q), fc.n[q] + ' of ' + fc.V, fc.n[q] / fc.V); }).join('') :
      '<p class="note">Every time scale passed today.</p>';
  }
  function renderBubWhy() {
    if (!S.d) return;
    killChart('timing');
    var c = S.d.ov.c13, k = bubKind(c), H = S.d.heat, h = '', r = rulesOf(S.d.ov), pf = !!(r && r.paper);
    h += '<h3>The test in one breath</h3><p>It fits one curve, a <b>faster-and-faster climb with shrinking wiggles</b>, to the price on ' + nScales() + ' time scales from ' +
      esc(scaleShort()) + ' to ' + esc(scaleLong()) + '. A time scale counts only if its curve passes every check of a rule' + (pf ? ': the <b>paper filter</b> (the main reading) or the <b>strict rule</b> (much tighter on curve error and damping, slightly looser on turn date)' : '') +
      '. The same fit can also show the <b>falling mirror</b> (the crash-shape, upside down).</p>';
    if (pf) h += rulesTable();
    else h += '<h3>The 10 checks</h3><ol class="checks cols2">' + CHECKS.map(function (x) { return '<li>' + x[1] + '</li>'; }).join('') + '</ol>';

    if (c && c.V && c.qc && (k === 'full' || k === 'partial' || k === 'unres')) {
      var sFailed = c.V - (c.pos || 0) - (c.neg || 0);
      var sKeys = CHECKS.map(function (x) { return x[0]; }).filter(function (q) { return c.qc[q] > 0; }).sort(function (a, b) { return (c.qc[b] - c.qc[a]) || (CHK[a].i - CHK[b].i); });
      var sHtml = sFailed > 0 && sKeys.length ? '<p class="note">' + sFailed + ' of ' + c.V + ' failed.</p>' + sKeys.map(function (q) { return hbar(failText(q), c.qc[q] + ' of ' + c.V, c.qc[q] / c.V); }).join('') : '<p class="note">Every time scale passed today.</p>';
      if (pf) h += '<h3>Why today\'s time scales failed</h3><p class="note">A time scale can fail several checks at once.</p><div class="rules2"><div><h4>Paper filter</h4><div id="paperFails"></div></div><div><h4>Strict rule</h4>' + sHtml + '</div></div>';
      else if (sFailed > 0 && sKeys.length) h += '<h3>Why today\'s ' + sFailed + ' checked time scale' + (sFailed === 1 ? '' : 's') + ' failed</h3><p class="note">A time scale can fail several checks at once.</p><div class="bars2">' +
        sKeys.map(function (q) { return hbar(CHK[q].fail, c.qc[q] + ' of ' + c.V, c.qc[q] / c.V); }).join('') + '</div>';
    }

    h += '<h3>Share passing today</h3>';
    if (k === 'full') h += '<p>' + (pf ? 'Paper filter: <b>' + share(r.pos / c.E) + '</b> rising, <b>' + share(r.neg / c.E) + '</b> falling. Strict rule: <b>' + share(r.sPos / c.E) + '</b> rising, <b>' + share(r.sNeg / c.E) + '</b> falling (of the ' + c.E + ' time scales).' :
      'Share of the ' + c.E + ' time scales passing today: <b>' + share(c.pos / c.E) + '</b> rising, <b>' + share(c.neg / c.E) + '</b> falling.') + '</p>';
    else if (k === 'partial' || k === 'notyet') h += '<p>No full share today: only ' + (c.A || 0) + ' of ' + c.E + ' time scales are computed.</p>';
    else if (k === 'unres') h += '<p>No full share today: ' + (c.U || 0) + ' of ' + c.E + ' time scales could not be solved.</p>';
    else h += '<p>No share today. ' + esc(kindMsg(k)) + '</p>';

    h += '<h3>The turn date the curve points to</h3>';
    var tpS = c && c.tp, tpP = pf ? r.tp : tpS, fl0 = c && c.floor > 0 ? c.floor : 0;
    var flTxt = fl0 ? ' ' + fl0 + ' time scale' + (fl0 === 1 ? '' : 's') + ' passing the strict rule with the turn right at today ' + (fl0 === 1 ? 'is' : 'are') + ' left out.' : '';
    var tline = function (tp, who) {
      return '<b>' + who + Math.round(tp.lo) + ' to ' + Math.round(tp.hi) + ' trading days ahead</b> (middle ' + Math.round(tp.mid) +
        ', from ' + tp.n + ' passing time scale' + (tp.n === 1 ? '' : 's') + ').';
    };
    if (tpP || tpS) {
      h += '<p>' + (tpP ? tline(tpP, pf ? 'Today, paper filter: ' : 'Today: ') : (pf ? 'Paper filter: none today. ' : '')) + (pf && tpS ? ' ' + tline(tpS, 'Strict rule: ') : pf ? ' Strict rule: none today.' : '') + '</p>';
      if (fl0) h += '<p class="note">' + STR.timingFloor + flTxt + '</p>';
    } else h += '<p>None today. ' + (fl0 ? STR.timingFloor + flTxt : STR.timingAbsent) + '</p>';
    h += '<div id="timingBox"></div>';

    h += '<h3>Every day, every time scale</h3>';
    if (H) {
      h += '<p class="note">Rows = the ' + nScales() + ' time scales (shortest at the bottom); columns = days. Tap anywhere for that day.</p>' +
        '<div class="heat-tools"><div class="seg" role="group" aria-label="Colour cells by" id="heatMode">' +
        '<button type="button" data-m="pass" aria-pressed="' + (S.heatMode === 'pass') + '">Passed or not</button>' +
        '<button type="button" data-m="why" aria-pressed="' + (S.heatMode === 'why') + '">First failed check</button></div>' +
        '<div class="seg" role="group" aria-label="Heat map range" id="heatRange">' +
        ['1y', '5y', 'all'].map(function (rr) { return '<button type="button" data-r="' + rr + '" aria-pressed="' + (S.heatRange === rr) + '">' + (rr === 'all' ? 'All' : rr.toUpperCase()) + '</button>'; }).join('') +
        '</div></div>' +
        '<div class="heatbox"><canvas id="heatCanvas" tabindex="0" role="img" aria-label="Heat map of the time scales by day. Use the arrow keys to move through days and time scales."></canvas><div class="heat-ylab"><span>' + esc(scaleLong().replace(' years', ' yr').replace(' year', ' yr')) +
        '</span><span>' + esc(scaleShort().replace(' months', ' mo')) + '</span></div></div>' +
        '<div class="heat-xlab" id="heatX"></div><div class="heat-key" id="heatKey"></div>' +
        '<div class="heat-detail" id="heatDetail" aria-live="polite">Tap the map to see one day.</div>';
    } else h += stateMsg(STR.reqError);


    h += '<h3>First failed check' + (pf ? ' under the strict rule' : '') + ', every day checked so far</h3>';
    if (H) {
      var hs = S.d.hist, lpx = S.d.series.lp, cnt = {}, tot = 0, xFits = 0, xDays = 0, xUnres = 0, nPaper = 0, nBoth = 0;
      H.codes.forEach(function (s, j) {
        var inH = j < lpx.E.length, full = inH && lpx.full[j] === 1, nf = 0;
        for (var q = 0; q < s.length; q++) {
          var cd = s[q];
          if (CODE[cd]) { nf++; if (full) cnt[cd] = (cnt[cd] || 0) + 1; }
          else if (full && (cd === 'A' || cd === 'B')) nPaper++;
          else if (full && (cd === 'P' || cd === 'N')) nBoth++;
        }
        if (full) tot += nf;
        else if (nf) { xFits += nf; xDays++; if (inH && (lpx.A[j] || 0) >= lpx.E[j]) xUnres++; }
      });
      var xKind = xUnres === xDays ? (xDays === 1 ? 'day where some time scales could not be solved' : 'days where some time scales could not be solved') :
        !xUnres ? (xDays === 1 ? 'partly computed day' : 'partly computed days') : (xDays === 1 ? 'incomplete day' : 'incomplete days');
      var left = xFits ? ' Left out: ' + int(xFits) + ' failed fit' + (xFits === 1 ? '' : 's') + ' on ' + int(xDays) + ' ' + xKind + '.' : '';
      if (tot) {
        var rng7 = fdm(hs.first) === fdm(hs.lastFull) ? fdm(hs.first) : fdm(hs.first) + ' to ' + fdm(hs.lastFull), nf7 = tot + nPaper;

        h += '<p class="note">' + (nf7 === hs.tries ? (nf7 === 1 ? 'The only try' : 'All ' + int(nf7) + ' tries') : int(nf7) + ' of the ' + int(hs.tries) + ' tries') + ' on the ' +
          plural(hs.full, 'day') + ' checked failed ' + (pf ? 'the strict rule' : 'a check') + ' (' + rng7 + (hs.olderMissing && !covInfo().low ? '; older days are not computed yet' : '') + ')' +
          (nBoth ? '; ' + int(nBoth) + ' passed ' + (pf ? 'both rules' : 'every check') : '') + '.' +
          (nPaper ? ' ' + int(nPaper) + ' of those failures passed the paper filter; their first strict miss is not stored, so the bars count the other ' + int(tot) + '.' : '') +
          (covInfo().low ? ' Most of the history is not computed yet.' : '') + left +
          ' The history keeps only the first check each fit failed, so these are not "how many fail each check"; today\'s full counts are above.</p>';
        h += '<div class="bars2">';
        Object.keys(cnt).sort(function (a, b) { return (cnt[b] - cnt[a]) || (CHK[CODE[a]].i - CHK[CODE[b]].i); }).forEach(function (cd) {
          h += hbar(CHK[CODE[cd]].fail, share(cnt[cd] / tot) + ' <small>· ' + int(cnt[cd]) + ' of ' + int(tot) + '</small>', cnt[cd] / tot);
        });
        h += '</div>';
      } else if (!hs.full) h += '<p>No day is fully checked yet, so there is nothing to count here.' + left + '</p>';
      else h += '<p>No try on the ' + plural(hs.full, 'day') + ' checked has failed a check.' + left + '</p>';
    } else h += stateMsg(STR.reqError);

    var e = H && H.dense;
    h += '<h3>Fine-grained check (' + (e ? e.configured : 'many') + ' time scales, latest day only' + (pf ? ', strict rule' : '') + ')</h3>';
    if (!H) h += stateMsg(STR.reqError);
    else if (!e) h += '<p>Not computed yet for this symbol. It runs for the latest day only; earlier days are never filled in.</p>';
    else {
      var notyet = countCodes(e.codes, 'X');
      h += '<p>' + fd(e.date) + ': ' + e.configured + ' time scales' + (e.short ? ' from ' + esc(e.short) + ' to ' + esc(e.long) : '') + '. <b>' + e.pos + '</b> rising and <b>' + e.neg +
        '</b> falling passed' + (pf ? ' the strict rule' : '') + ', out of ' + e.eligible + (notyet ? '; ' + notyet + ' not computed yet' : '') + '.</p>' +
        '<div class="dense" role="img" aria-label="' + e.configured + ' time scales coloured by result">' + e.codes.split('').map(function (cd) {
          var col = cd === 'P' ? C.amber : cd === 'N' ? C.teal : PAPERCOL[cd] ? PAPERCOL[cd] : cd === 'X' || cd === 'U' ? 'repeating-linear-gradient(135deg,#59617A 0 1.5px,#1C2130 1.5px 4px)' : cd === 'I' ? 'transparent' : C.slate;
          return '<i style="background:' + col + '"></i>';
        }).join('') + '</div><div class="dense-ax"><span>' + esc(e.short || '') + '</span><span>' + esc(e.long || '') + '</span></div>';
      var df = [];
      if (e.eligible < e.configured) df.push(fill(STR.partial, {eligible: e.eligible, configured: e.configured}));
      if (e.unresolved) df.push(fill(STR.unresolved, {unresolved: e.unresolved}));
      if (df.length) h += '<div class="fine">' + lines(df.map(esc)) + '</div>';
    }
    $('bubWhyBody').innerHTML = h;
    if (pf) renderPaperFails();
    if (H) {
      $('heatMode').onclick = function (ev) { var b = ev.target.closest('button[data-m]'); if (!b) return; S.heatMode = b.dataset.m; setPressed(this, 'm', S.heatMode); drawHeat(); };
      $('heatRange').onclick = function (ev) { var b = ev.target.closest('button[data-r]'); if (!b) return; S.heatRange = b.dataset.r; setPressed(this, 'r', S.heatRange); S.heatSel = null; drawHeat(); };
      $('heatCanvas').onclick = heatTap;
      $('heatCanvas').onkeydown = heatKey;
      drawHeat();
    }
    renderTiming();
  }


  var heatGeo = null;
  function heatRows(H) { return (H.codes[0] || '').length || nScales(); }
  function heatDate(i) { return S.d.series.dates[S.d.series.lp.from + i]; }
  function heatSpan() {
    var H = S.d.heat, n = H.codes.length, last = heatDate(n - 1);
    var from = S.heatRange === '1y' ? yearsBack(last, 1) : S.heatRange === '5y' ? yearsBack(last, 5) : heatDate(0);
    return [lowerBound(S.d.series.dates.slice(S.d.series.lp.from), from), n];
  }
  function drawHeat() {
    var cv = $('heatCanvas'), H = S.d && S.d.heat;
    if (!cv || !H) return;
    var rows = heatRows(H), g = fitCanvas(cv, 130), ctx = g.ctx, W = g.W, rowH = 130 / rows, pat = hatchPattern(ctx);
    var sp = heatSpan(), a = sp[0], b = sp[1], n = b - a;
    ctx.fillStyle = C.panel2; ctx.fillRect(0, 0, W, 130);
    heatGeo = {a: a, n: n, W: W, rowH: rowH, rows: rows};
    var PRI = {P: 6, N: 5, A: 4.5, B: 4, U: 3, X: 3};
    var colOf = function (cd) {
      if (cd === 'P') return C.amber;
      if (cd === 'N') return C.teal;
      if (PAPERCOL[cd]) return PAPERCOL[cd];
      if (cd === 'U' || cd === 'X') return pat;
      if (cd === 'I' || cd === '.' || cd == null) return null;
      return S.heatMode === 'why' ? (WHYCOL[cd] || C.slate) : C.slate;
    };
    var pxw = W / n;
    if (pxw >= 1) {
      for (var i = 0; i < n; i++) {
        var codes = H.codes[a + i], x = Math.floor(i * pxw), w = Math.max(1, Math.ceil(pxw));
        for (var r = 0; r < rows; r++) { var col = colOf(codes[r]); if (!col) continue; ctx.fillStyle = col; ctx.fillRect(x, (rows - 1 - r) * rowH, w, rowH - 1); }
      }
    } else {
      var px = {};
      for (var k = 0; k < n; k++) {
        var p = Math.floor(k * pxw), cur = px[p] || (px[p] = new Array(rows)), cs = H.codes[a + k];
        for (var r2 = 0; r2 < rows; r2++) { var cd = cs[r2], old = cur[r2]; if (old == null || (PRI[cd] || 1) > (PRI[old] || 1) || (old === 'I' && cd !== 'I')) cur[r2] = cd; }
      }
      Object.keys(px).forEach(function (p) {
        for (var r3 = 0; r3 < rows; r3++) { var col = colOf(px[p][r3]); if (!col) continue; ctx.fillStyle = col; ctx.fillRect(+p, (rows - 1 - r3) * rowH, 1, rowH - 1); }
      });
    }
    if (S.heatSel && S.heatSel.i >= a && S.heatSel.i < b) {
      var sw = Math.max(3, pxw + 2), sx = Math.min(Math.max(0.75, Math.floor((S.heatSel.i - a) * pxw) - 1), W - sw - 0.75);
      var sy = Math.max(0.75, (rows - 1 - S.heatSel.r) * rowH - 0.5), shh = Math.min(rowH + 0.5, 130 - 0.75 - sy);
      ctx.strokeStyle = C.white; ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, sw, shh);
    }
    $('heatX').innerHTML = '<span>' + fdm(heatDate(a)) + '</span><span>' + fdm(heatDate(b - 1)) + '</span>';
    var anyCode = function (set) { for (var q = a; q < b; q++) if (countCodes(H.codes[q], set)) return true; return false; }, pfm = hasTrust();

    var ki = function (col, txt) { return '<span><i style="background:' + col + '"></i>' + txt + '</span>'; }, key = '';
    if (pfm) key += (anyCode('P') ? ki(C.amber, 'rising, passed both rules') : '') + (anyCode('A') ? ki(PAPERCOL.A, 'rising, passed the paper filter only') : '') +
      (anyCode('N') ? ki(C.teal, 'falling, both rules') : '') + (anyCode('B') ? ki(PAPERCOL.B, 'falling, paper filter only') : '');
    else key += (anyCode('P') ? ki(C.amber, 'rising shape passed') : '') + (anyCode('N') ? ki(C.teal, 'falling mirror passed') : '');
    if (S.heatMode === 'why') Object.keys(WHYCOL).forEach(function (cd) { key += '<span><i style="background:' + WHYCOL[cd] + '"></i>' + CHK[CODE[cd]].fail + '</span>'; });
    else key += '<span><i style="background:' + C.slate + '"></i>checked, ' + (pfm ? 'passed neither rule' : 'did not pass') + '</span>';
    if (anyCode('XU')) key += '<span><i style="background:repeating-linear-gradient(135deg,#59617A 0 1.5px,#1C2130 1.5px 4px)"></i>not computed yet or unresolved</span>';
    $('heatKey').innerHTML = key;
  }
  function heatTap(ev) {
    if (!heatGeo || !S.d || !S.d.heat) return;
    var r = this.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    var i = heatGeo.a + Math.max(0, Math.min(heatGeo.n - 1, Math.floor(x / heatGeo.W * heatGeo.n)));
    var row = heatGeo.rows - 1 - Math.max(0, Math.min(heatGeo.rows - 1, Math.floor(y / heatGeo.rowH)));
    heatPick(i, row);
  }
  function heatKey(ev) {
    if (!heatGeo || !S.d || !S.d.heat) return;
    var a = heatGeo.a, b = heatGeo.a + heatGeo.n - 1, cur = S.heatSel && S.heatSel.i >= a && S.heatSel.i <= b ? S.heatSel : null;
    var i = cur ? cur.i : b, row = cur ? cur.r : 0, st = ev.shiftKey ? 20 : 1;
    if (ev.key === 'ArrowLeft') i -= cur ? st : 0;
    else if (ev.key === 'ArrowRight') i += cur ? st : 0;
    else if (ev.key === 'ArrowUp') row += cur ? 1 : 0;
    else if (ev.key === 'ArrowDown') row -= cur ? 1 : 0;
    else if (ev.key === 'Home') i = a;
    else if (ev.key === 'End') i = b;
    else if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    heatPick(Math.max(a, Math.min(b, i)), Math.max(0, Math.min(heatGeo.rows - 1, row)));
  }
  function heatPick(i, row) {
    var H = S.d.heat, d = heatDate(i), cd = H.codes[i][row];
    S.heatSel = {i: i, r: row}; drawHeat();
    var codes = H.codes[i], pos = countCodes(codes, 'P'), neg = countCodes(codes, 'N'), x2 = countCodes(codes, 'XU'), pA = countCodes(codes, 'PA'), pB = countCodes(codes, 'NB');
    var dayTxt = !hasTrust() ? pos + ' of ' + codes.length + ' rising, ' + neg + ' falling' :
      'paper filter ' + pA + ' of ' + codes.length + ' rising' + (pB ? ', ' + pB + ' falling' : '') + '; strict rule ' + pos + ' rising' + (neg ? ', ' + neg + ' falling' : '');
    $('heatDetail').innerHTML = '<b>' + fd(d) + '</b> · ' + dotText(cd, row) +
      '<div class="note" style="margin-top:4px">That day: ' + (x2 === codes.length ? 'not computed yet.' : dayTxt + (x2 ? ', ' + x2 + ' unresolved or not computed' : '') + '.') + '</div>';
  }




  function renderTiming() {
    var box = $('timingBox'); killChart('timing');
    if (!box) return;
    var T = S.d.timing;
    if (!T) { box.innerHTML = stateMsg(STR.reqError); return; }
    var pf = hasTrust();
    var scen = (pf ? T.t : T.s) || [], fl = pf ? T.tf || 0 : T.sf || 0, h = '';
    var sScen = pf ? T.s || [] : [], sFl = pf ? T.sf || 0 : 0;
    var withDate = scen.filter(function (s) { return s[3]; }), sWithDate = sScen.filter(function (s) { return s[3]; });
    var rp = isReplay(), all = scen.concat(sScen);
    if (all.length) {
      var dts = all.map(function (s) { return s[0]; }).sort();
      h += '<p><b>Earlier readings' + (rp ? ' (replay)' : '') + ':</b> ' + plural(scen.length, 'turn-date estimate') + (pf ? ' under the paper filter' : '') +
        (pf ? ' and ' + int(sScen.length) + ' under the strict rule' : '') + (dts[0] === dts[dts.length - 1] ? (rp ? ', replayed for ' : ', issued on ') + fd(dts[0]) :
          (rp ? ', replayed for ' : ', issued from ') + fd(dts[0]) + ' to ' + fd(dts[dts.length - 1])) +
        (rp ? ' on today\'s data, not issued at the time' : '') + '.</p>' +
        (withDate.length || sWithDate.length ? '<div id="tWrap"><p class="note">Each dot stays on its day; its height is the date it pointed to. Dotted line = "turn date is today".</p><div class="lwc" id="tChart" role="img" aria-label="Turn-date estimates by the day they were ' + (rp ? 'replayed for' : 'issued') + '"></div>' +
          (pf ? '<div class="key"><span><i class="k-dot" style="background:var(--amber)"></i>paper filter estimate</span>' + (sWithDate.length ? '<span><i class="k-ring k-ring-a"></i>white ring = the strict rule gave it too</span>' : '') + '</div>' : '') + '</div>' : '');
    } else h += '<p>No earlier readings to show' + (pf ? ' under either rule' : '') + '.</p>';
    if (fl || sFl) h += '<p class="note">' + (pf ? int(fl) + ' paper-filter and ' + int(sFl) + ' strict-rule estimates' : fl + ' passing time scale' + (fl > 1 ? 's' : '')) +
      ' had their turn right at the day they were made and ' + (fl + sFl > 1 ? 'are' : 'is') + ' left out.</p>';
    box.innerHTML = h;
    if (!withDate.length && !sWithDate.length) return;
    var el = $('tChart');
    withLW(el, function () { drawTiming(el, withDate, sWithDate); }, function () { timingFallback(el); });
  }

  function timingFallback(el) { var wr = $('tWrap') || el; if (wr && wr.isConnected) wr.outerHTML = stateMsg(NOCHART); }
  function drawTiming(el, withDate, sWithDate) {
    killChart('timing');
    var narrow = el.clientWidth < 600;

    var yFmt = function (v) { var d = numDay(Math.round(v)); return narrow ? fds(d) + " '" + d.slice(2, 4) : fd(d); };
    var ch = makeChart(el, {localization: {priceFormatter: yFmt}, rightPriceScale: {borderVisible: false, scaleMargins: {top: 0.1, bottom: 0.1}},
      timeScale: {borderVisible: false, fixLeftEdge: true, rightOffset: 2, minBarSpacing: 0.005, lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: function (t, type) {
          var k = timeKey(t);
          if (type === 0) return k.slice(0, 4);
          if (type === 1) return MON[+k.slice(5, 7) - 1] + (k.slice(5, 7) === '01' ? ' ' + k.slice(0, 4) : '');
          return MON[+k.slice(5, 7) - 1] + ' ' + (+k.slice(8, 10));
        }}});
    if (!ch) { timingFallback(el); return; }
    CH.timing = ch;
    var D = S.d.series.dates, d0 = withDate.concat(sWithDate || []).map(function (s) { return s[0]; }).sort(), a = IDX[d0[0]], b = IDX[d0[d0.length - 1]];
    if (a != null && b != null) {
      var diag = [];
      for (var i = Math.max(0, a - 10); i <= Math.min(D.length - 1, b + 10); i++) diag.push({time: D[i], value: dayNum(D[i])});
      ch.addSeries(LW.LineSeries, {color: C.miss, lineWidth: 1, lineStyle: LW.LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false}).setData(diag);
    }
    var r0 = narrow ? 2 : 3;
    var addGroups = function (rows, colorOf, rad) {
      var groups = {};
      rows.forEach(function (s) { var key = s[2] + '|' + s[1]; (groups[key] = groups[key] || {})[s[0]] = dayNum(s[3]); });
      Object.keys(groups).forEach(function (key) {
        var g = groups[key], pts = Object.keys(g).sort().map(function (t) { return {time: t, value: g[t]}; });
        ch.addSeries(LW.LineSeries, {color: colorOf(key), lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: rad,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false}).setData(pts);
      });
    };

    if (sWithDate && sWithDate.length) addGroups(sWithDate, function () { return C.white; }, r0 + 1.5);
    addGroups(withDate, function (key) { return key.indexOf('up') === 0 ? C.amber : C.teal; }, r0);
    ch.timeScale().fitContent();
  }


  function makeChart(el, extra) {
    if (!LW && window.LightweightCharts) LW = window.LightweightCharts;
    if (!LW || !el) return null;
    var o = {
      autoSize: true,
      layout: {background: {type: 'solid', color: C.panel}, textColor: C.muted, fontSize: 11, fontFamily: FONT, attributionLogo: false,
               panes: {separatorColor: C.line, enableResize: false}},
      grid: {vertLines: {visible: false}, horzLines: {color: 'rgba(42,46,57,0.75)'}},
      rightPriceScale: {borderVisible: false, scaleMargins: {top: 0.2, bottom: 0.08}},
      timeScale: {borderVisible: false, fixLeftEdge: true, rightOffset: 2, minBarSpacing: 0.005, lockVisibleTimeRangeOnResize: true},
      crosshair: {mode: LW.CrosshairMode.Magnet, vertLine: {color: '#4A4F5C', width: 1, style: LW.LineStyle.Solid, labelVisible: false},
                  horzLine: {visible: false, labelVisible: false}},
      handleScroll: false, handleScale: false
    };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    try { return LW.createChart(el, o); } catch (e) { console.warn('Sornette: chart library', e); return null; }
  }


  function renderRun() {
    var p = S.d.ov.run || {}, sr = S.d.series;
    if (p.value == null) {
      $('runVerdict').innerHTML = '<div class="v-word dim">No reading</div><div class="v-text">' + STR.missing + '</div>';
      $('runContext').textContent = '';
    } else {
      var rec = runMax(null), rr = rec ? sr.r126[rec.i] : null;
      $('runVerdict').innerHTML = '<div class="v-big">' + g2(p.value) + '</div><div class="v-unit">runaway-price gauge</div><div class="v-text">' +
        (rec && rr != null ? 'It does not say up or down: its record came in ' + fdm(rec.d) + ', after a ' + Math.round(Math.abs(rr) * 100) + '% ' + (rr < 0 ? 'fall' : 'rise') + ' in 6 months.' : 'It does not say up or down.') +
        '<span id="runRecHint"></span></div>';
      $('runContext').textContent = rankPhrase(runRank(), 'Today it is higher');
    }
    $('runFine').innerHTML = '';
    setPressed($('runRange'), 'r', S.runRange);
    drawRun();
    if ($('runWhy').open) renderRunWhy();
  }
  function drawRun() {
    var sr = S.d.series, D = sr.dates, last = D.length - 1, el = $('runChart');
    var from = S.runRange === '5y' ? yearsBack(D[last], 5) : S.runRange === '2013' ? '2013-01-01' : null;
    var a = from ? lowerBound(D, from) : 0, f = firstNonNull(sr.run, a);
    var hint = $('runRecHint');
    if (f < 0) { el.innerHTML = stateMsg(STR.missing); $('runReadout').innerHTML = ''; if (hint) hint.textContent = ''; return; }
    a = f;
    var mx = runMax(D[a]), rec = runMax(null), lab = S.runRange === '2013' ? 'Since 2013' : S.runRange === '5y' ? 'Last 5 years' : 'All history';
    if (hint) hint.textContent = rec && rec.i < a ? ' (tap All to see it)' : '';

    var nar = (el.clientWidth || 600) < 600;
    var scope = mx && rec && mx.i === rec.i ? 'record' : S.runRange === '2013' ? (nar ? '2013+ high' : 'highest since 2013') : S.runRange === '5y' ? (nar ? '5-year high' : 'highest in 5 years') : 'record';
    var dflt = '<b>' + lab + '</b> · today ' + (sr.run[last] == null ? 'no reading' : g2(sr.run[last]));

    var PD = D, PV = sr.run, kind = null, pi0 = a, pi1 = last, mi = mx ? mx.i : null;
    var wk = sr.runW;
    if (S.runRange !== '5y' && wk && wk.length) {
      PD = []; PV = []; kind = [];
      wk.forEach(function (r) { if (r[1] == null || r[0] < D[a] || r[0] > D[last]) return; PD.push(r[0]); PV.push(r[1]); kind.push('w'); });
      if (mx) { var k = lowerBound(PD, mx.d); if (PD[k] === mx.d) { PV[k] = mx.v; kind[k] = 'd'; } else { PD.splice(k, 0, mx.d); PV.splice(k, 0, mx.v); kind.splice(k, 0, 'd'); } mi = lowerBound(PD, mx.d); }
      if (sr.run[last] != null) {
        if (PD.length && PD[PD.length - 1] === D[last]) { PV[PV.length - 1] = sr.run[last]; kind[kind.length - 1] = 'd'; }
        else { PD.push(D[last]); PV.push(sr.run[last]); kind.push('d'); }
      }
      pi0 = 0; pi1 = PD.length - 1;
      if (pi1 < 1) { PD = D; PV = sr.run; kind = null; pi0 = a; pi1 = last; mi = mx ? mx.i : null; }
    }
    svgChart(el, {
      D: PD, i0: pi0, i1: pi1, h: isPhone() ? 160 : 206, mt: 30, color: C.gauge, width: 1.7, fill: true,
      val: function (i) { return PV[i]; },
      fmtAxis: function (t) { return minus(t.toFixed(1)); }, fmtPill: g2,
      mark: mx && mx.i < last - 5 ? {i: mi, v: mx.v, label: scope + ': ' + g2(mx.v) + ' · ' + fdm(mx.d)} : null,
      onCursor: function (i, isReset) {
        $('runReadout').innerHTML = isReset ? dflt : '<b>' + (kind && kind[i] === 'w' ? 'Week ending ' : '') + fd(PD[i]) + '</b> · ' + (PV[i] == null ? 'no reading' : g2(PV[i]));
      },
      aria: 'Runaway-price gauge over time. Use the left and right arrow keys to move through ' + (kind ? 'weeks' : 'days') + '.'
    });
  }
  function renderRunWhy() {
    var p = S.d.ov.run || {}, sr = S.d.series, i = sr.dates.length - 1, h = '';
    var since13 = runMax('2013-01-01'), rec = runMax(null);
    h += '<h3>In plain words</h3><p>The gauge looks back over the last few years of prices, tries every stretch ending today, and reports the most explosive one. ' +
      'Bigger means the path looks more self-feeding. A crash can score as high as a melt-up, so it does not say up or down.</p>';
    h += '<h3>Today\'s numbers</h3><dl class="kv">' +
      '<dt>Gauge</dt><dd>' + g3(p.value) + ' on ' + fd(p.date) + '</dd>' +
      (p.L ? '<dt>Most explosive stretch</dt><dd>the last ' + int(p.L) + ' trading days (' + fd(sr.dates[i - p.L + 1]) + ' to ' + fd(sr.dates[i]) + ')</dd>' : '') +
      '<dt>Price over that stretch</dt><dd>' + wsp(p.ret) + ' (context only)</dd>' +
      '<dt>Last 6 months</dt><dd>' + wsp(sr.r126[i]) + '</dd>' +
      (since13 ? '<dt>Highest since 2013</dt><dd>' + g3(since13.v) + ' on ' + fd(since13.d) + '</dd>' : '') +
      (rec ? '<dt>Highest on record</dt><dd>' + g3(rec.v) + ' on ' + fd(rec.d) + '</dd>' : '') + '</dl>';
    var f0 = firstNonNull(sr.run, 0);
    h += '<p class="note">' + (f0 >= 0 ? 'First reading for ' + esc(TICK[S.sym] || S.sym) + ': ' + fd(sr.dates[f0]) + '. Past peaks are shown for scale.' : 'No reading yet.') + '</p>';
    $('runWhyBody').innerHTML = h;
  }


  function renderWeak() {
    var ov = S.d.ov, w = ov.weak || {}, sr = S.d.series, brk = w.breakdownToday, v, nm = esc(TICK[S.sym] || S.sym);
    if (noWeakReading(w)) v = '<div class="v-word dim">No reading</div><div class="v-text">' + STR.missing + '</div>';
    else if (brk) v = '<div class="v-word coral">Yes</div><div class="v-text">' + nm + ' closed at ' + fp(ov.price) + ', below its lowest close of the previous 4 weeks (' + fp(w.prior20Low) +
      '). This is seen after the price has already fallen.</div>';
    else v = '<div class="v-word">No</div><div class="v-text">' + nm + ' closed <b>' + pct1(ov.price / w.prior20Low - 1) + ' above</b> its lowest close of the previous 4 weeks (' + fp(w.prior20Low) + ').</div>';
    $('weakVerdict').innerHTML = v;
    $('weakFacts').innerHTML =
      '<li><b>' + (w.lastBreak ? fdY(w.lastBreak) : '—') + '</b>last close below&nbsp;it</li>' +
      '<li><b>' + wsp(w.s50) + '</b>vs 50-day average</li>' +
      '<li><b>' + wsp(w.s200) + '</b>vs 200-day average</li>';
    var t, h = S.d.hist, rp = isReplay(), pf = hasTrust() && w.contextActiveTrust !== undefined;

    var ca = pf ? w.contextActiveTrust : w.contextActive, es = pf ? w.episodeStateTrust : w.episodeState, cd = pf ? w.contextDateTrust : w.contextDate,
      cs = pf ? w.contextEpisodeStartTrust : w.contextEpisodeStart, le = pf ? w.lastEventTrust : w.lastEvent, via = pf ? ' passing the paper filter' : '';
    if (ca == null || !h.full) t = 'unknown until this symbol\'s bubble history is computed.';
    else if (!ca) t = 'off (no bubble shape' + via + ' in the past month). ' + (le ? (rp ? 'Last replayed event ' : 'Last recorded ') + fd(le.date) + '.' :
      h.olderMissing ? 'It has not been recorded since ' + fdm(h.first) + '; older days are not computed yet.' : 'It has never been recorded.');
    else if (es === 'active_consumed') t = 'already recorded once in this bubble episode (since ' + fd(cs) + ').';
    else t = 'possible this month: a bubble shape' + via + ' showed on ' + fd(cd) + ', so the next close below the 4-week low would be recorded as the first break after a bubble.';
    if (pf && h.full && ca != null) {
      var sl = w.lastEvent, same = (sl && sl.date) === (le && le.date);
      if (!same) t += ' Strict rule: ' + (sl ? 'last ' + (rp ? 'replayed ' : '') + 'event ' + fd(sl.date) + '.' : 'never recorded.');
    }
    $('weakCtx').innerHTML = '<b>First break after a bubble:</b> ' + t;
    renderWeakPic();
    $('weakFine').innerHTML = '';
    if ($('weakWhy').open) renderWeakWhy();
  }

  function distBar(close, low, hi20, broke, W) {
    var H = 74, x0 = 8, x1 = W - 8, ty = 32;
    var a = Math.min(low, close), b = Math.max(hi20, close), pad = (b - a) * 0.06 || 1;
    a -= pad; b += pad;
    var X = function (z) { return x0 + (z - a) / (b - a) * (x1 - x0); };
    var xl = X(low), xc = X(close), xh = X(hi20);
    var lowTxt = '4-week low ' + fp(low), nowTxt = 'today ' + fp(close), lwT = textW(lowTxt), nwT = textW(nowTxt) * 1.05;
    var la = xl - 2 + lwT > W - 2 ? 'end' : 'start', lx = la === 'start' ? Math.max(2, xl - 2) : Math.min(W - 2, xl + 2);
    var ca = xc + nwT / 2 > W - 2 ? 'end' : xc - nwT / 2 < 2 ? 'start' : 'middle', cx = ca === 'end' ? Math.min(W - 2, xc + 8) : ca === 'start' ? Math.max(2, xc - 8) : xc;
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Close ' + esc(fp(close)) + ' against the 4-week low ' + esc(fp(low)) + '">' +
      '<rect x="' + Math.min(xl, xh).toFixed(1) + '" y="' + ty + '" width="' + Math.abs(xh - xl).toFixed(1) + '" height="8" rx="4" fill="' + C.line + '"/>' +
      '<line x1="' + xl.toFixed(1) + '" x2="' + xl.toFixed(1) + '" y1="' + (ty - 12) + '" y2="' + (ty + 20) + '" stroke="' + C.brk + '" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<line x1="' + Math.min(xl, xc).toFixed(1) + '" x2="' + Math.max(xl, xc).toFixed(1) + '" y1="' + (ty + 4) + '" y2="' + (ty + 4) + '" stroke="' + (broke ? C.brk : C.ink2) + '" stroke-width="2"/>' +
      '<circle cx="' + xc.toFixed(1) + '" cy="' + (ty + 4) + '" r="8" fill="' + (broke ? C.brk : C.white) + '" stroke="' + C.panel + '" stroke-width="3"/>' +
      '<text class="svgt b" x="' + cx.toFixed(1) + '" y="' + (ty - 12) + '" text-anchor="' + ca + '">' + esc(nowTxt) + '</text>' +
      '<text class="svgt" x="' + lx.toFixed(1) + '" y="' + (ty + 36) + '" text-anchor="' + la + '" style="fill:' + C.brk + ';font-weight:600">' + esc(lowTxt) + '</text>' +
      '</svg>';
  }
  function renderWeakPic() {
    var el = $('weakPic'), ov = S.d.ov, w = ov.weak || {}, sr = S.d.series, n = sr.price.length;
    if (w.breakdownToday == null || w.prior20Low == null || ov.price == null) { el.innerHTML = ''; return; }
    var hi20 = -Infinity; for (var k = Math.max(0, n - 20); k < n; k++) if (sr.price[k] != null) hi20 = Math.max(hi20, sr.price[k]);
    if (!isFinite(hi20)) hi20 = ov.price;
    el.innerHTML = distBar(ov.price, w.prior20Low, hi20, !!w.breakdownToday, Math.max(220, el.clientWidth || 300));
  }
  function renderWeakWhy() {
    var sr = S.d.series, w = S.d.ov.weak || {}, h = '', nb = sr.breaks.length;
    h += '<h3>The rule</h3><p>A <b>close below the 4-week low</b> is a close below the lowest close of the previous 4 weeks. Today\'s close is not part of that low, and a tie does not count. ' +
      'It can repeat day after day in a slide.</p>';
    var pfw = hasTrust(), evs = trustEvents(), sEv = sr.events || [];
    h += '<h3>First break after a bubble</h3><p>A stricter event: it is recorded at most once per bubble episode. It needs a recent day where every time scale was computed and at least one passed ' +
      (pfw ? 'the <b>paper filter</b>' : 'all 10 checks') + '; the first close below the 4-week low after that is recorded.</p>';
    var hs = pfw ? S.d.histT : S.d.hist, cv = covInfo(), rp = isReplay();
    if (pfw) {
      var sameEv = sEv.length === evs.length && sEv.every(function (e, q) { return e.date === evs[q].date; });
      h += '<p class="note">' + (sameEv ? 'The strict rule records the same ' + (sEv.length === 1 ? 'event' : 'events') + (sEv.length ? '' : ' (none)') + '.' :
        'The strict rule, run the same way, ' + (sEv.length ? 'records ' + plural(sEv.length, 'event') + ': ' + sEv.map(function (e) { return fd(e.date); }).join(', ') + '.' : 'never records one here.')) + '</p>';
    }
    if (!evs.length) {

      if ((pfw ? w.contextActiveTrust : w.contextActive) == null || !hs.full) h += stateMsg('Unknown: this symbol\'s bubble history is not computed yet (' + int(cv.complete) + ' of ' + int(cv.scheduled) +
        ' days), so a first break after a bubble can be neither recorded nor ruled out.');
      else h += stateMsg('None recorded since ' + fdm(hs.first) + (hs.olderMissing ? '; older days are not computed yet' : '') + '. ' +
        (!hs.daysPos ? 'No complete day ' + (hs.olderMissing ? 'since then' : 'ever') + ' passed the ' + (pfw ? 'paper filter' : 'bubble-shape test') + ', so there was no bubble episode to record.' : 'Each bubble episode ended without a close below the 4-week low.'));
    } else {
      var firstPass = [], evRev = evs.slice().reverse();
      evRev.forEach(function (e) { var ci = e.contextEpisodeStart ? IDX[e.contextEpisodeStart] : null; if (ci != null && ci > 0) firstPass.push([e.contextEpisodeStart, sr.dates[ci - 1]]); });

      if (window.innerWidth < 600) h += '<p class="note">' + (rp ? 'Replayed days' : 'Recorded days') + ', newest first:</p><ul class="evlist">' + evRev.map(function (e) {
        return '<li><b>' + fd(e.date) + '</b> · <span class="nw">close ' + fp(e.price) + '</span> · <span class="nw">4-week low ' + fp(e.prior20Low) + '</span>' +
          '<span class="ev2"><span class="nw">Bubble reading ' + fd(e.contextDate) + '</span> · <span class="nw">context from ' + fd(e.contextEpisodeStart) + '</span></span></li>';
      }).join('') + '</ul>';
      else h += '<div class="tbl-wrap"><table class="rt"><thead><tr><th>' + (rp ? 'Day (replay)' : 'Recorded on') + '</th><th class="r">Close</th><th class="r">4-week low</th><th>Bubble reading</th><th>Context from</th></tr></thead><tbody>' +
        evRev.map(function (e) {
          return '<tr><td>' + fd(e.date) + '</td><td class="r">' + fp(e.price) + '</td><td class="r">' + fp(e.prior20Low) + '</td><td>' + fd(e.contextDate) + '</td><td>' + fd(e.contextEpisodeStart) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      if (firstPass.length === 1) h += '<p class="note">Context starts the session after the first passing day (' + fd(firstPass[0][1]) + ').' + (rp ? ' ' + esc(replayNote()) : '') + '</p>';
      else h += '<p class="note">Context starts the session after the first passing day of each episode.' + (rp ? ' ' + esc(replayNote()) : '') + '</p>';
    }
    h += '<h3>Every close below the 4-week low</h3><div class="chart-head"><span class="readout" id="wReadout"></span><div class="seg" role="group" aria-label="Weakening chart range" id="weakRange">' +
      [['6m', '6M'], ['1y', '1Y'], ['5y', '5Y']].map(function (r) { return '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (S.weakRange === r[0]) + '">' + r[1] + '</button>'; }).join('') +
      '</div></div><div class="svgbox" id="wChart"></div><div class="key" id="wKey"></div><div id="wEv"></div>';
    var br = sr.breaks.slice(-12).reverse();
    h += '<h3>Recent closes below the 4-week low</h3>';
    h += br.length ? '<div class="tbl-wrap"><table class="rt"><thead><tr><th>Day</th><th class="r">Close</th><th class="r">4-week low</th><th class="r">Below by</th></tr></thead><tbody>' +
      br.map(function (d) { var i = IDX[d]; return '<tr><td>' + fdY(d) + '</td><td class="r">' + fp(sr.price[i]) + '</td><td class="r">' + fp(sr.low20[i]) + '</td><td class="r">' + sp2(sr.price[i] / sr.low20[i] - 1) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">' + plural(nb, 'such close') + ' in the full price history.</p>' : stateMsg('No closes below the 4-week low in the price history.');
    $('weakWhyBody').innerHTML = h;
    $('weakRange').onclick = function (e) { var b = e.target.closest('button[data-r]'); if (!b) return; S.weakRange = b.dataset.r; setPressed(this, 'r', S.weakRange); drawWeakWhy(); };
    $('wEv').onclick = function (e) { var b = e.target.closest('button[data-ev]'); if (!b) return; S.weakRange = 'ev'; setPressed($('weakRange'), 'r', 'ev'); drawWeakWhy(); };
    drawWeakWhy();
  }
  function drawWeakWhy() {
    var el = $('wChart'); if (!el || !S.d) return;
    var sr = S.d.series, D = sr.dates, last = D.length - 1, rp = isReplay();
    var evs = trustEvents(), ev = evs.length ? evs[evs.length - 1] : null, evi = ev ? IDX[ev.date] : null;
    if (S.weakRange === 'ev' && evi == null) S.weakRange = '1y';
    var i0, i1 = last, zoom = S.weakRange === 'ev';
    if (zoom) {
      i0 = lowerBound(D, monthsBack(ev.date, 6));
      var to = monthsBack(ev.date, -6); i1 = Math.min(last, Math.max(evi, lowerBound(D, to) - 1));
    } else i0 = lowerBound(D, S.weakRange === '6m' ? monthsBack(D[last], 6) : S.weakRange === '5y' ? yearsBack(D[last], 5) : yearsBack(D[last], 1));
    var f = firstNonNull(sr.price, i0); if (f >= 0 && f <= i1) i0 = f;
    var dots = [], nb = 0;
    sr.breaks.forEach(function (d) { var i = IDX[d]; if (i != null && i >= i0 && i <= i1 && sr.price[i] != null) { dots.push({i: i, v: sr.price[i], r: 2.5, color: C.brk}); nb++; } });

    var mark = ev && evi != null && evi >= i0 && evi <= i1 && sr.price[evi] != null ? {i: evi, v: sr.price[evi], label: (el.clientWidth < 600 ? '' : 'first break after a bubble · ') + fd(ev.date)} : null;
    var runsIn = zoom ? (S.d.runs || []).filter(function (r) { return r.i1 >= i0 && r.i0 <= i1; }) : [];
    var lab = zoom ? fdm(D[i0]) + ' to ' + fdm(D[i1]) : {'6m': 'Last 6 months', '1y': 'Last 12 months', '5y': 'Last 5 years'}[S.weakRange];
    var dflt = '<b>' + lab + '</b> · ' + plural(nb, 'close') + ' below the 4-week low';

    $('wEv').innerHTML = ev && evi != null && !zoom ? (mark ? '' : '<button type="button" class="linkbtn" data-ev="1"><span class="only-wide">Show the first break after a bubble (' + fd(ev.date) + ') ›</span>' +
        '<span class="only-narrow">Show the ' + fd(ev.date) + ' break ›</span></button>') :
      zoom && rp ? '<p class="note">' + esc(replayNote()) + '</p>' : '';
    svgChart(el, {
      D: D, i0: i0, i1: i1, h: isPhone() ? 170 : 220, color: C.white, width: 1.5, fill: false, noToday: i1 < last,
      val: function (i) { return sr.price[i]; }, fmtAxis: axisNum, fmtPill: fpx, dots: dots, mark: mark, runs: runsIn.length ? runsIn : null,
      onCursor: function (i, isReset) {
        $('wReadout').innerHTML = isReset ? dflt : '<b>' + fd(D[i]) + '</b> · ' + fp(sr.price[i]) +
          (sr.brk[i] ? ' · <span style="color:var(--brk)">closed below</span>' : sr.low20[i] != null ? ' · 4-week low ' + fp(sr.low20[i]) : '');
      },
      aria: 'Daily close with every close below the 4-week low marked. Use the left and right arrow keys to move through days.'
    });
    $('wKey').innerHTML = '<span><i class="k-line" style="border-color:#fff"></i>close</span><span><i class="k-dot" style="background:var(--brk)"></i>closed below its 4-week low</span>' +
      (runsIn.some(function (r) { return r.color === C.amber; }) ? '<span><i class="k-sq" style="background:var(--amber)"></i>' + (hasTrust() ? 'paper filter passed' : 'rising bubble shape passed') + '</span>' : '') +
      (runsIn.some(function (r) { return r.color === C.teal; }) ? '<span><i class="k-sq" style="background:var(--teal)"></i>falling mirror passed</span>' : '') +
      (mark ? '<span><i class="k-mark"></i>first break after a bubble' + (rp ? ' (replay)' : '') + '</span>' : '');
  }




  var KIN = {shape: 'Shape count', trust: 'Paper filter', positive: 'Strict rule'};
  function kinOK(K, kin) { return !!(K && K[kin] && K[kin].D && K[kin].D.rows && K[kin].D.rows.length); }
  function kdjRow(tf, kin) {
    var K = S.d.kdj, ser = K && K[kin || 'shape'] && K[kin || 'shape'][tf];
    if (!ser || !ser.rows || !ser.rows.length) return null;
    return {r: ser.rows[ser.rows.length - 1], pv: ser.preview, ser: ser};
  }
  function shapeInput() { var ov = S.d.ov; return !!(ov && ov.shape); }
  function renderTrend() {

    var kd = S.d.ov.kdj, cv = covInfo(), TF = ['D', 'W', '2W', 'M'], READ = {b: 1, f: 1, n: 1, x: 1}, states = [], shp = shapeInput(), so = S.d.ov.shape;
    TF.forEach(function (tf) { var x = kd && kd[tf]; states.push(x && x.state ? x.state : null); });
    var word = function (st) { return !st || (st === 'u' && cv.low) ? 'Not yet' : KST[st] || st; };
    $('trendTiles').innerHTML = TF.map(function (tf, i) {
      var st = states[i], dot = st === 'b' ? '<i class="dot" style="background:var(--upx)"></i>' : st === 'f' ? '<i class="dot" style="background:var(--teal)"></i>' : '';
      return '<div class="t"><div class="tf">' + TFN[tf] + '</div><div class="st' + (READ[st] ? '' : ' dim') + '">' + dot + '<span>' + word(st) + '</span></div></div>';
    }).join('');
    var real = states.filter(function (st) { return READ[st]; }), distinct = real.filter(function (st, i) { return real.indexOf(st) === i; });
    var list = TF.map(function (tf, i) { return TFN[tf] + ': ' + word(states[i]).toLowerCase(); }).join(' · ') + '.';
    var v, zeroNow = shp ? so && so.full && so.pos === 0 : S.d.ov.c13 && S.d.ov.c13.full && S.d.ov.c13.pos === 0;
    if (!kd) v = '<div class="v-word dim">Not computed yet</div><div class="v-text">It needs this symbol\'s daily bubble history first.</div>';
    else if (!real.length) v = cv.low ?
      '<div class="v-word dim">Not computed yet</div><div class="v-text">It needs this symbol\'s daily bubble history first (' + int(cv.complete) + ' of ' + int(cv.scheduled) + ' days complete).</div>' :
      '<div class="v-word dim">Too little history</div><div class="v-text">It needs more complete periods of this symbol\'s bubble history on each timeframe.</div>';
    else if (states.every(function (st) { return st === 'x'; })) v = '<div class="v-word">Flat</div><div class="v-unit">has not moved' + (zeroNow ? ' from 0' : '') + '</div>';
    else if (states.every(function (st) { return st === states[0]; })) v = '<div class="v-word">' + KST[states[0]] + '</div><div class="v-text">Same on all four timeframes. They share one input, so this is one reading shown four ways.</div>';
    else if (distinct.length >= 2) v = '<div class="v-word">Mixed</div><div class="v-text">' + list + '</div>';
    else v = '<div class="v-word">' + KST[distinct[0]] + '</div><div class="v-text">' + list + '</div>';
    $('trendVerdict').innerHTML = v;
    $('trendInput').innerHTML = shp ? '<b>Input:</b> how many of the ' + ((S.d.ov.c13 && S.d.ov.c13.configured) || nScales()) + ' time scales show the bubble shape (shape checks only), a looser count than either rule.' +
      (so && so.full ? ' Today: <b>' + so.pos + ' of ' + so.E + '</b>.' : '') : '<b>Input:</b> the share of the time scales passing the strict rule.';
    var fine = [];
    if (states.some(function (st) { return st === 'x'; })) fine.push(STR.kdjFlat);
    $('trendFine').innerHTML = lines(fine);
    if ($('trendWhy').open) renderTrendWhy();
  }
  function allFlat(kin) {
    var K = S.d.kdj;
    return ['D', 'W', '2W', 'M'].every(function (tf) { var ser = K[kin] && K[kin][tf], rr = ser && ser.rows; return rr && rr.length && rr[rr.length - 1][9] === 'x'; });
  }
  function renderTrendWhy() {
    var d = S.d, h = '';
    killChart('kdj');
    if (d.kdj === undefined) {
      $('trendWhyBody').innerHTML = '<p class="note">' + STR.loading + '</p>';
      kdjOf(d, S.sym);
      return;
    }
    var K = d.kdj;
    if (d.err.kdj || !K) { $('trendWhyBody').innerHTML = stateMsg(STR.reqError); return; }
    var kins = ['shape', 'trust', 'positive'].filter(function (k) { return kinOK(K, k); });
    if (!kins.length) { $('trendWhyBody').innerHTML = stateMsg('Not computed yet: it needs this symbol\'s daily bubble history.'); return; }
    if (kins.indexOf(S.kin) < 0) S.kin = kins[0];
    h += '<p>Bars = the input at each period\'s last day. Lines = the KDJ of that input: <b>K</b> white, <b>D</b> yellow, <b>J</b> purple. ' +
      'A red dot = K crossed up through D (heating up); a teal dot = crossed down (cooling down).</p>';
    h += '<div class="kdj-tools"><div class="seg" role="group" aria-label="Timeframe" id="ktf">' + ['D', 'W', '2W', 'M'].map(function (tf) {
      return '<button type="button" data-tf="' + tf + '" aria-pressed="' + (S.ktf === tf) + '">' + TFN[tf] + '</button>'; }).join('') + '</div>' +
      (kins.length > 1 ? '<div class="seg" role="group" aria-label="Input" id="kin">' + kins.map(function (k) {
        return '<button type="button" data-k="' + k + '" aria-pressed="' + (S.kin === k) + '">' + KIN[k] + '</button>'; }).join('') + '</div>' : '') + '</div>';
    h += '<p class="note" id="kinNote"></p><div class="readout" id="kdjReadout" style="margin-top:8px"></div><div id="kdjBox"></div><div id="kdjNotes"></div>';
    $('trendWhyBody').innerHTML = h;
    $('ktf').onclick = function (e) { var b = e.target.closest('button[data-tf]'); if (!b) return; S.ktf = b.dataset.tf; setPressed(this, 'tf', S.ktf); drawKdj(); };
    if ($('kin')) $('kin').onclick = function (e) { var b = e.target.closest('button[data-k]'); if (!b) return; S.kin = b.dataset.k; S.kdjForce = false; setPressed(this, 'k', S.kin); drawKdj(); };
    drawKdj();
  }
  function kinNote() {
    var el = $('kinNote'); if (!el) return;
    var conf = (S.d.ov.c13 && S.d.ov.c13.configured) || nScales();
    el.innerHTML = S.kin === 'shape' ? 'Shape count: how many of the ' + conf + ' time scales show the bubble shape (shape checks only). The tiles above use this input.' :
      S.kin === 'trust' ? 'Paper filter: the share of the ' + conf + ' time scales passing the paper filter.' :
      'Strict rule: the share of the ' + conf + ' time scales passing the strict rule.';
  }
  function kdjVal(r) {
    if (r[3] === 'm' || r[4] == null) return 'missing reading';
    if (S.kin === 'shape') { var conf = (S.d.ov.c13 && S.d.ov.c13.configured) || nScales(); return 'shape count ' + Math.round(r[4] * conf) + ' of ' + conf; }
    return 'passed share ' + share(r[4]);
  }
  function kdjShow(r) {
    if (!r) { $('kdjReadout').innerHTML = ''; return; }
    var parts = ['<b>' + TFN[S.ktf] + ' period ending ' + fd(r[2]) + '</b>', kdjVal(r)];
    if (r[5] != null) parts.push('K ' + r[5].toFixed(0) + ' · D ' + r[6].toFixed(0) + ' · J ' + r[7].toFixed(0));
    else if (r[9] !== 'w') parts.push('too little history');
    if (KST[r[9]]) parts.push(KST[r[9]]);
    $('kdjReadout').innerHTML = parts.join(' · ');
  }
  function kdjNotes(col, boxShown) {
    var x = kdjRow(S.ktf, S.kin), notes = [];
    if (!boxShown && x && (x.r[9] === 'x' || x.r[8])) notes.push(STR.kdjFlat);
    ['W', '2W', 'M'].forEach(function (tf) {
      var y = kdjRow(tf, S.kin);
      if (y && y.pv) notes.push(TFN[tf] + ': ' + fill(STR.inProgress, {dataThrough: fd(y.pv.plotDate), periodEnd: fd(y.pv.periodEnd)}));
    });
    $('kdjNotes').innerHTML = notes.map(function (n) { return '<p class="inprog">' + esc(n) + '</p>'; }).join('') + (col ?
      '<div class="key"><span><i class="k-sq" style="background:' + col + '"></i>' + (S.kin === 'shape' ? 'shape count' : 'passed share') + '</span><span><i class="k-line" style="border-color:#fff"></i>K</span>' +
      '<span><i class="k-line" style="border-color:' + C.d + '"></i>D</span><span><i class="k-line" style="border-color:' + C.j + '"></i>J</span>' +
      '<span><i class="k-dot" style="background:var(--upx)"></i>crossed up</span><span><i class="k-dot" style="background:var(--teal)"></i>crossed down</span>' +
      '<span><i class="k-line" style="border-top-style:dashed;border-color:#fff"></i>period in progress</span></div>' : '');
  }
  function drawKdj() {
    killChart('kdj');
    var box = $('kdjBox'); if (!box || !S.d || !S.d.kdj) return;
    kinNote();
    var K = S.d.kdj, ser = K[S.kin] && K[S.kin][S.ktf];
    if (!ser || !ser.rows || !ser.rows.length) { box.innerHTML = stateMsg(STR.noData); $('kdjReadout').innerHTML = ''; kdjNotes(null); return; }
    var rows = ser.rows, pv = ser.preview, lastR = rows[rows.length - 1], col = S.kin === 'shape' ? '#8A8E99' : C.amber;
    kdjShow(lastR);
    if (!rows.some(function (r) { return r[5] != null; })) {
      var cv = covInfo();
      box.innerHTML = stateMsg('No heating or cooling reading on this timeframe yet. It needs more complete periods of the bubble history' +
        (cv.low ? ' (only ' + int(cv.complete) + ' of ' + int(cv.scheduled) + ' days are checked so far)' : '') + '.');
      kdjNotes(null, true);
      return;
    }
    if (allFlat(S.kin) && !S.kdjForce) {
      box.innerHTML = '<div class="state-msg"><b>Nothing has moved.</b> ' + (S.kin === 'shape' ? 'The shape count has been ' + kdjVal(lastR).replace('shape count ', '') :
        'The share of time scales passing the ' + (S.kin === 'trust' ? 'paper filter' : 'strict rule') + ' has been ' + share(lastR[4])) +
        ' for a while on every timeframe, so K and D have settled near 50 and no cross can happen.</div><button type="button" class="linkbtn" id="kdjAnyway">Draw the flat chart anyway</button>';
      $('kdjAnyway').onclick = function () { S.kdjForce = true; drawKdj(); };
      kdjNotes(null, true);
      return;
    }
    box.innerHTML = '<div class="lwc chart-kdj" id="kdjChart" role="img" aria-label="' + esc(KIN[S.kin] || 'Input') + ' bars and KDJ lines"></div>';
    var el = $('kdjChart');
    withLW(el, function () { kdjChart(el, rows, pv, lastR, col); }, function () { box.innerHTML = stateMsg(NOCHART); kdjNotes(null); });
  }
  function kdjChart(el, rows, pv, lastR, col) {
    killChart('kdj');
    var ch = makeChart(el);
    if (!ch) { $('kdjBox').innerHTML = stateMsg(NOCHART); kdjNotes(null); return; }
    CH.kdj = ch;

    var cnt = S.kin === 'shape', conf = (S.d.ov.c13 && S.d.ov.c13.configured) || nScales(), sc = cnt ? conf : 100;
    var hist = ch.addSeries(LW.HistogramSeries, {priceLineVisible: false, lastValueVisible: false, color: col,
      priceFormat: {type: 'custom', formatter: function (v) { return Math.round(v) + (cnt ? '' : '%'); }, minMove: 1}}, 0);
    var pvCol = cnt ? 'rgba(138,142,153,0.4)' : 'rgba(245,184,75,0.4)';
    var hd = rows.map(function (r) { return r[3] === 'm' || r[4] == null ? {time: r[2]} : {time: r[2], value: sc * r[4], color: r[4] > 0 ? col : C.fail}; });
    if (pv && pv.value != null && pv.plotDate > lastR[2]) hd.push({time: pv.plotDate, value: sc * pv.value, color: pv.value > 0 ? pvCol : C.fail});
    hist.setData(hd);
    var mx = cnt ? 1 : 10; hd.forEach(function (x) { if (x.value != null) mx = Math.max(mx, x.value); });
    var top = cnt ? conf : Math.min(100, Math.ceil(mx / 10) * 10);
    hist.applyOptions({autoscaleInfoProvider: function () { return {priceRange: {minValue: 0, maxValue: top}}; }});
    hist.priceScale().applyOptions({scaleMargins: {top: 0.12, bottom: 0.12}});
    var pf = {type: 'price', precision: 0, minMove: 1};
    var mk = function (c, w) { return ch.addSeries(LW.LineSeries, {color: c, lineWidth: w || 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: pf}, 1); };
    var kS = mk(C.k), dS = mk(C.d), jS = mk(C.j, 1);


    var pick = function (z, col) {
      return rows.map(function (r, q) {
        var nx = rows[q + 1];
        return r[z] == null ? {time: r[2]} : {time: r[2], value: r[z], color: !nx || nx[z] != null ? col : 'rgba(0,0,0,0)'};
      });
    };
    kS.setData(pick(5, C.k)); dS.setData(pick(6, C.d)); jS.setData(pick(7, C.j));
    var jlo = 0, jhi = 100; rows.forEach(function (r) { if (r[7] != null) { jlo = Math.min(jlo, r[7]); jhi = Math.max(jhi, r[7]); } });
    if (pv && pv.j != null) { jlo = Math.min(jlo, pv.j); jhi = Math.max(jhi, pv.j); }
    var lo = Math.floor(Math.min(0, jlo) / 10) * 10, hi = Math.ceil(Math.max(100, jhi) / 10) * 10;
    [kS, dS, jS].forEach(function (sx) { sx.applyOptions({autoscaleInfoProvider: function () { return {priceRange: {minValue: lo, maxValue: hi}}; }}); });
    kS.priceScale().applyOptions({scaleMargins: {top: 0.10, bottom: 0.10}});
    kS.createPriceLine({price: 50, color: C.miss, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: false, title: ''});
    if (pv && pv.k != null && lastR && lastR[5] != null && pv.plotDate > lastR[2]) {
      [[5, 'k', C.k], [6, 'd', C.d], [7, 'j', C.j]].forEach(function (z) {
        ch.addSeries(LW.LineSeries, {color: z[2], lineWidth: 1, lineStyle: LW.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: pf}, 1)
          .setData([{time: lastR[2], value: lastR[z[0]]}, {time: pv.plotDate, value: pv[z[1]]}]);
      });
    }
    var crosses = rows.filter(function (r) { return r[10]; }).map(function (r) { return {time: r[2], position: 'inBar', shape: 'circle', color: r[10] === 'u' ? C.upx : C.teal, size: 0.9}; });
    if (crosses.length && crosses.length <= 400) LW.createSeriesMarkers(kS, crosses);
    var panes = ch.panes(); if (panes[0]) panes[0].setStretchFactor(1); if (panes[1]) panes[1].setStretchFactor(1.6);
    var D = rows.map(function (r) { return r[2]; }), last = D[D.length - 1];
    var from = S.ktf === 'D' ? yearsBack(last, 1) : S.ktf === 'W' ? yearsBack(last, 5) : null;
    if (from && D[0] < from) ch.timeScale().setVisibleRange({from: from, to: pv && pv.plotDate > last ? pv.plotDate : last}); else ch.timeScale().fitContent();
    var byT = {}; rows.forEach(function (r) { byT[r[2]] = r; });


    var armed = false, p0 = null;
    el.addEventListener('pointerdown', function () { armed = true; });
    el.addEventListener('pointermove', function (ev) {
      if (armed) return;
      if (!p0) { p0 = [ev.clientX, ev.clientY]; return; }
      if (Math.abs(ev.clientX - p0[0]) + Math.abs(ev.clientY - p0[1]) > 3) armed = true;
    });
    ch.subscribeCrosshairMove(function (p) { var d = armed && p && p.time ? timeKey(p.time) : null; kdjShow(d && byT[d] ? byT[d] : lastR); });
    kdjNotes(col);
  }




  function hcell(lgW, lgS, shW, shS) {
    var part = function (cls, w, s) {
      var sp = w.indexOf(' '), first = sp < 0 ? w : w.slice(0, sp), rest = sp < 0 ? '' : w.slice(sp);
      return '<span class="' + cls + '"><span class="nw"><i class="hx" aria-hidden="true"></i>' + first + '</span>' + rest + (s ? ' <small>' + s + '</small>' : '') + '</span>';
    };
    return '<span class="hatchtxt">' + part('bl', lgW, lgS) + part('bs', shW, shS) + '</span>';
  }
  function renderOverview() {
    var h = '<div class="ovh" role="presentation"><span></span><span>Bubble shape<small class="ovs"> paper filter (strict)</small></span><span>Runaway</span><span>vs 4-wk low</span>' +
      '<span class="dx">vs 200-day</span><span class="dx">Heating / cooling<small class="ovs"> shape count, daily</small></span><span class="dx">History built</span></div>';
    FAMILY_ORDER.forEach(function (s) {
      var o = ovOf(s), comp = !!COMP[s], have = S.man.symbols.indexOf(s) >= 0;
      if (!o) { h += '<div role="listitem"><div class="ovr' + (comp ? ' comp' : '') + '"><span class="nm"><b>' + esc(TICK[s]) + '</b><small>not in this build yet</small></span></div></div>'; return; }
      var c = o.c13, k = bubKind(c), bub, bubT, rr = rulesOf(o);
      if (k === 'full') {

        var st = rr.paper ? ' <small class="strict">(strict ' + (rr.sPos ? rr.sPos : rr.sNeg ? rr.sNeg + ' falling' : 0) + ')</small>' : '';
        bub = (rr.pos ? '<span class="amber">' + rr.pos + ' of ' + c.E + ' rising</span>' : rr.neg ? '<span class="teal">' + rr.neg + ' of ' + c.E + ' falling</span>' : rr.pos + ' of ' + c.E) + st;
        bubT = (rr.paper ? 'paper filter ' : '') + bub.replace(/<[^>]+>/g, '');
      }
      else if (k === 'partial') { var dn = c.E - countCodes(c.codes || '', 'X'); bub = hcell('computing', dn + '/' + c.E, dn + '/' + c.E, 'so far'); bubT = 'computing, ' + dn + ' of ' + c.E + ' time scales so far'; }
      else if (k === 'unres') { bub = hcell('incomplete', (c.V || 0) + '/' + c.E, (c.V || 0) + '/' + c.E, 'solved'); bubT = 'incomplete, ' + (c.V || 0) + ' of ' + c.E + ' time scales solved'; }
      else if (k === 'notyet') { bub = hcell('not computed yet', '', 'not yet', ''); bubT = 'not computed yet'; }
      else { bub = '<span class="dim">no reading</span>'; bubT = 'no reading'; }
      var w = o.weak || {}, wk = noWeakReading(w) ? '<span class="dim">n/a</span>' : w.breakdownToday ? '<span class="coral">closed below</span>' :
        pct1(o.price / w.prior20Low - 1) + ' above';
      var wkT = wk.replace(/<[^>]+>/g, '').replace('&lt;', '<');
      var kd = o.kdj && o.kdj.D && o.kdj.D.state ? (KST[o.kdj.D.state] || esc(o.kdj.D.state)) : '<span class="dim">not computed yet</span>';
      if (o.kdj && o.kdj.D && o.kdj.D.state === 'b') kd = '<i class="kdot" style="background:var(--upx)"></i>' + kd;
      else if (o.kdj && o.kdj.D && o.kdj.D.state === 'f') kd = '<i class="kdot" style="background:var(--teal)"></i>' + kd;
      var cv = o.coverage, cov = '<span class="dim">—</span>';
      if (cv && cv.scheduled) {
        var t = int(cv.complete) + ' of ' + int(cv.scheduled) + ' days';
        if (cv.complete >= cv.scheduled) cov = '<span title="' + t + '">100%</span>';
        else if (!cv.complete) cov = '<span class="hatchtxt" title="' + t + '"><i class="hx" aria-hidden="true"></i>not started</span>';
        else { var pc = Math.floor(100 * cv.complete / cv.scheduled); cov = '<span title="' + t + '">' + (pc < 1 ? '&lt;1%' : pc + '%') + '</span>'; }
      }
      var aria = 'Open ' + TICK[s] + ': bubble shape ' + bubT + ', runaway gauge ' + (o.run && o.run.value != null ? g2(o.run.value) : 'no reading') + ', ' +
        (wkT === 'n/a' ? '4-week low n/a' : wkT === 'closed below' ? 'closed below its 4-week low' : wkT + ' its 4-week low');
      h += '<div role="listitem"><button type="button" class="ovr' + (comp ? ' comp' : '') + (s === S.sym ? ' cur' : '') + '" data-sym="' + s + '"' + (have ? '' : ' disabled') +
        ' aria-label="' + esc(aria) + '"' + (s === S.sym ? ' aria-current="true"' : '') + '><span class="nm"><b>' + esc(TICK[s]) + '</b><small>' +
        (comp ? 'index' : '<span class="lg">' + esc(PLAIN[s].replace(/ ETF$/, '')) + '</span><span class="sh">' + esc(SHORTN[s] || PLAIN[s]) + '</span>') + '</small></span>' +
        '<span class="n2">' + bub + '</span><span class="n2">' + (o.run && o.run.value != null ? g2(o.run.value) : '<span class="dim">—</span>') + '</span><span class="n2">' + wk + '</span>' +
        '<span class="dx n2">' + wsp(w.s200) + '</span><span class="dx">' + kd + '</span><span class="dx n2">' + cov + '</span></button></div>';
    });
    $('ovList').innerHTML = h;
  }


  function renderAll() {
    if (!S.d) return;
    $('grid').hidden = false;
    safe('picker', renderPickerState);
    safe('quote', renderQuote);
    safe('meta', renderMeta);
    safe('right now', renderNow);
    safe('price', renderHero);
    safe('bubble', renderBubble);
    safe('runaway', renderRun);
    safe('weakening', renderWeak);
    safe('trend', renderTrend);
    safe('overview', renderOverview);
  }

  init();
})();
