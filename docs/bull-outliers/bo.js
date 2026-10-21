(function () {
  'use strict';

  var BULL = document.documentElement.getAttribute('data-side') === 'bull';
  function sw(fear, bull) { return BULL ? bull : fear; }
  var ADJ = sw('scared', 'bullish');
  var NOUN = sw('fear', 'bull');
  var SPM = sw('S&P 500 meter', 'S&P 500 bull meter');
  var SPF = sw('S&P 500 fear meter', 'S&P 500 bull meter');
  var DIR = sw(-1, 1);
  var K = { n: sw('scared', 'bullish'), pct: sw('pct_scared', 'pct_bullish'), prev: sw('prev_as_scared', 'prev_as_bullish'),
            since: sw('since_calm', 'since_quiet'), most: sw('most_scared', 'most_bullish'), flag: sw('scared', 'bullish'), val: sw('fear', 'bull') };
  var PFX = sw('fo', 'bo');

  var GH = /(^|\.)github\.io$/i.test(location.hostname);
  var RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/outliers-data/outliers/';
  var ROOT = GH ? RAW : 'snap/';
  var BASE = ROOT + (BULL ? 'bull/' : 'fear/');
  var FETCH_TIMEOUT_MS = 20000;
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: sw('#7E57C2', '#26A69A'), light: sw('#B39DDB', '#80CBC4'), gold: '#FFD84D', sp: '#FFFFFF', up: '#26A69A', down: '#EF5350' };
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
  var TFS = ['1D', '1W', '2W', '1M'];
  var TF_WORD = { '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' };
  var TF_NAME = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  var TF_UNIT = { '1D': ['day', 'days'], '1W': ['week', 'weeks'], '2W': ['2-week candle', '2-week candles'], '1M': ['month', 'months'] };
  var SC_KEY = { '1D': 'D', '1W': 'W', '2W': '2W', '1M': 'M' };
  var DOT_KEY = { '1D': 'D', '1W': 'W', '2W': '2W', '1M': 'M' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, 'All': 0 };
  var RANGE_WORDS = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year', '2Y': 'last 2 years', '5Y': 'last 5 years' };
  var ZOOM_STEP = 1.6;
  var TOP_N = 25;
  var CROWD_N = 12;
  var FULL_N = 100;
  var GOLD_N = 10;
  var GOLD_MIN = 100;
  var HOVER = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var TAP = HOVER ? 'hover' : 'tap';
  var CLICK = HOVER ? 'click' : 'tap';
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var HOLD_MS = 380;

  var $ = function (id) { return document.getElementById(id); };
  function stored(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function store(key, v) { try { localStorage.setItem(key, v); } catch (e) {  } }
  function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function dnDate(dn) { return new Date(dn * 864e5); }
  function fmtDay(dn, withYear, withWd) {
    var d = dnDate(dn);
    return (withWd ? WD[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (withYear ? ', ' + d.getUTCFullYear() : '');
  }
  function fmtMonYear(dn) { var d = dnDate(dn); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function elh(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function bsearchLE(arr, x) {
    var lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  }
  function lowerBound(arr, x) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; } return lo; }
  function visIdx(arr, x0, x1) { return { i0: lowerBound(arr, x0), i1: bsearchLE(arr, x1) }; }
  function setAttr(n, k, v) { if (n.getAttribute(k) !== v) n.setAttribute(k, v); }
  function monthsBack(dn, m) {
    var d = dnDate(dn), y = d.getUTCFullYear(), mo = d.getUTCMonth() - m;
    var dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return Date.UTC(y, mo, Math.min(d.getUTCDate(), dim)) / 864e5;
  }
  function sameWindow(a, b) { return Math.abs(a.x0 - b.x0) < 1e-6 && Math.abs(a.x1 - b.x1) < 1e-6; }

  function commas(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function minus(s) { return String(s).replace(/-/g, '−'); }
  function signedPct(x, dp) { return x == null ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(dp == null ? 1 : dp) + '%'; }
  function gapNum(g) { return g == null ? '–' : (g > 0 ? '+' : g < 0 ? '−' : '') + Math.round(Math.abs(g)) + ' pts'; }
  function priceWord(x) { return x == null ? '–' : x >= 1000 ? x.toFixed(0) : x >= 1 ? x.toFixed(2) : x.toFixed(3); }
  function pct1(v) { return v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1) + '%'; }
  function pctShort(v) { return v == null ? '–' : (v >= 10 || v === 0 ? Math.round(v) : Math.round(v * 10) / 10) + '%'; }
  function moneyShort(x) {
    if (x == null) return '–';
    var a = Math.abs(x);
    if (a >= 1e12) return '$' + (x / 1e12).toFixed(1) + 'T';
    if (a >= 1e9) return '$' + (x / 1e9).toFixed(a >= 1e10 ? 0 : 1) + 'B';
    if (a >= 1e6) return '$' + (x / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M';
    return '$' + commas(x);
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function zoneOf(p) {
    var bands = OUT && OUT.meta.zones && OUT.meta.zones.bands;
    if (bands) { for (var i = bands.length - 1; i >= 0; i--) if (p >= bands[i][0]) return bands[i][2]; return bands[0][2]; }
    return p < 10 ? 'calm' : p < 23 ? 'normal' : p < 40 ? 'worried' : p < 60 ? 'fear' : 'panic';
  }
  function chgSpan(x) { return span(x == null ? 'muted' : x >= 0 ? 'up' : 'down', signedPct(x, 1)); }
  function shortName(n, sym) {
    if (!n) return '';
    var full = String(n || '').replace(/ \(The\)$/, '');
    var s = full.replace(/,? (Inc\.?|Incorporated|Corp\.?|Corporation|Ltd\.?|Limited|plc|PLC|N\.?V\.?|S\.?A\.?|L\.?P\.?|Co\.?|Holdings?|Group|Class [A-C]|- Class [A-C]|Common Stock|Ordinary Shares)$/i, '');
    s = s.replace(/,? (Inc\.?|Corp\.?|Ltd\.?|Holdings?)$/i, '');
    var key = function (x) { return String(x || '').toUpperCase().replace(/[-.\s]/g, ''); };
    if (sym && key(s) === key(sym)) return full;
    return s || full;
  }
  function offHigh(v) {
    if (v >= 1) return String(Math.floor(v + 0.5));
    if (v >= 0.1) return (Math.floor(v * 10 + 0.5) / 10).toFixed(1);
    return Math.max(0.01, Math.floor(v * 100 + 0.5) / 100).toFixed(2);
  }
  function topNum(g) { return g.top0 != null ? g.top0 : Math.max(1, Math.round(g.top)); }
  function topWords(g) {
    var p = g.pct ? g.pct['1D'] : g.now['1D'];
    if (p === 0) return 'no stock in it is ' + ADJ + ' today';
    if (g.top > 50) return sw('calmer', 'quieter') + ' than most of its days ' + g.since;
    return 'top ' + topNum(g) + '% of its days ' + g.since;
  }
  function gapWords(g, short) {
    if (g.id === 'index_sp500') return short ? 'the market itself' : 'this is the ' + SPM + ' itself';
    var v = Math.round(g.gap_vs_sp);
    if (v === 0) return 'about the same as the ' + SPM;
    return Math.abs(v) + (Math.abs(v) === 1 ? ' pt ' : ' pts ') + (v > 0 ? 'above' : 'below') + ' the ' + SPM;
  }

  var mctx = document.createElement('canvas').getContext('2d');
  function textW(str, size, weight) { mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; return mctx.measureText(str).width; }
  var NS = 'http://www.w3.org/2000/svg', uid = 0;
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function tx(parent, x, y, str, attrs) {
    var a = attrs || {}; a.x = x; a.y = y;
    if (!a['font-family']) a['font-family'] = FONT;
    var t = el('text', a, parent); t.textContent = str;
    return t;
  }
  function lin(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }
  function niceStep(span, target) {
    var raw = span / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= raw) return steps[i] * mag;
    return 10 * mag;
  }
  var TICK_UNITS = [['d', 1], ['d', 2], ['w', 1], ['w', 2], ['m', 1], ['m', 2], ['m', 3], ['m', 6], ['y', 1], ['y', 2], ['y', 5], ['y', 10]];
  var TICK_YEAR = 8;
  function genTicks(k, n, x0, x1, dd) {
    var out = [], dn, i;
    if (k === 'd' && n === 1) {
      var vi = visIdx(dd, x0, x1);
      for (i = vi.i0; i <= vi.i1; i++) if (dd[i] > x0) out.push({ dn: dd[i], label: fmtDay(dd[i], false) });
    } else if (k === 'd') {
      for (dn = Math.floor(x0) + 1; dn <= x1; dn++) { var wd = (dn + 4) % 7; if (wd === 1 || wd === 3 || wd === 5) out.push({ dn: dn, label: fmtDay(dn, false) }); }
    } else if (k === 'w') {
      for (dn = Math.ceil((x0 - 4) / 7) * 7 + 4; dn <= x1; dn += 7) if (dn > x0 && ((dn - 4) / 7) % n === 0) out.push({ dn: dn, label: fmtDay(dn, false) });
    } else {
      var d0 = dnDate(x0), y = d0.getUTCFullYear(), m = k === 'm' ? d0.getUTCMonth() : 0;
      for (var guard = 0; guard < 2000; guard++) {
        dn = Date.UTC(y, m, 1) / 864e5;
        if (dn > x1) break;
        var mm = ((m % 12) + 12) % 12, yy = y + Math.floor(m / 12);
        if (dn > x0) {
          if (k === 'm' && mm % n === 0) out.push({ dn: dn, label: mm === 0 ? String(yy) : MON[mm] });
          if (k === 'y' && yy % n === 0) out.push({ dn: dn, label: String(yy) });
        }
        if (k === 'm') m++; else y++;
      }
    }
    return out;
  }
  function timeTicks(x0, x1, X, fs, u0, days, last) {
    var ppd = (X(x1) - X(x0)) / (x1 - x0);
    for (var u = u0 || 0; u < TICK_UNITS.length; u++) {
      var k = TICK_UNITS[u][0], n = TICK_UNITS[u][1];
      var approx = k === 'd' ? (n === 1 ? 1.45 : 2.33) : k === 'w' ? 7 * n : k === 'm' ? 30.4 * n : 365.25 * n;
      if (approx * ppd < 24) continue;
      var t = genTicks(k, n, x0, Math.min(x1, last + 0.5), days), need = 0, gap = Infinity;
      t.forEach(function (o) { o.w = textW(o.label, fs); need = Math.max(need, o.w); });
      for (var i = 1; i < t.length; i++) gap = Math.min(gap, X(t[i].dn) - X(t[i - 1].dn));
      if (gap >= need + 12) { t.unit = u; return t; }
    }
    var none = []; none.unit = TICK_UNITS.length; return none;
  }
  function decimate(xs, vs, i0, i1, X, keep) {
    var px = [], pv = [], i;
    if (i1 < i0) return { px: px, pv: pv };
    if (i1 - i0 + 1 <= 2 * (Math.abs(X(xs[i1]) - X(xs[i0])) + 1)) {
      for (i = i0; i <= i1; i++) if (vs[i] != null) { px.push(X(xs[i])); pv.push(vs[i]); }
      return { px: px, pv: pv };
    }
    var col = null, a, lo, hi, z, extra = [];
    function flush() {
      var ids = [a, lo, hi, z].concat(extra).sort(function (p, q) { return p - q; });
      for (var j = 0; j < ids.length; j++) if (j === 0 || ids[j] !== ids[j - 1]) { px.push(X(xs[ids[j]])); pv.push(vs[ids[j]]); }
    }
    for (i = i0; i <= i1; i++) {
      if (vs[i] == null) continue;
      var c = Math.floor(X(xs[i]));
      if (c !== col) { if (col !== null) flush(); col = c; a = lo = hi = z = i; extra = []; }
      else { z = i; if (vs[i] < vs[lo]) lo = i; if (vs[i] > vs[hi]) hi = i; }
      if (keep && keep[i]) extra.push(i);
    }
    if (col !== null) flush();
    return { px: px, pv: pv };
  }
  function pathOf(P, Y) { var s = ''; for (var i = 0; i < P.px.length; i++) s += (i ? 'L' : 'M') + P.px[i].toFixed(1) + ' ' + Y(P.pv[i]).toFixed(1); return s; }
  function panelRect(g, x, y, w, h) { el('rect', { x: x, y: y, width: w, height: h, fill: C.panel, stroke: C.line, 'stroke-width': 1 }, g); }
  function clipFor(svg, x, y, w, h) {
    var id = 'c' + (++uid), defs = svg.querySelector('defs') || el('defs', {}, svg);
    var cp = el('clipPath', { id: id }, defs); el('rect', { x: x, y: y, width: w, height: h }, cp);
    return 'url(#' + id + ')';
  }
  function svgFor(holder, W, H) {
    var svg = holder.firstElementChild;
    if (!svg || svg.tagName.toLowerCase() !== 'svg') { clear(holder); svg = el('svg', {}, holder); }
    else clear(svg);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    return svg;
  }
  function timeGrid(g, X, ticks, top, bot) {
    ticks.forEach(function (t) { var px = X(t.dn); el('line', { x1: px, x2: px, y1: top, y2: bot, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g); });
  }
  function timeAxis(g, X, ticks, y, xmin, xmax) {
    ticks.forEach(function (t) {
      var px = X(t.dn);
      el('line', { x1: px, x2: px, y1: y - 18, y2: y - 14, stroke: C.muted, 'stroke-width': 1 }, g);
      if (px - t.w / 2 >= xmin && px + t.w / 2 <= xmax) tx(g, px, y, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    });
  }
  function yTicks(g, Y, ticks, xR, xL, fmt, side, panelTop) {
    ticks.forEach(function (v) {
      var py = Y(v);
      if (panelTop != null && py < panelTop + 6) return;
      el('line', { x1: xL, x2: xR, y1: py, y2: py, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
      tx(g, side === 'right' ? xR + 5 : xL - 5, py + 3.5, fmt(v), { fill: C.muted, 'font-size': 11, 'text-anchor': side === 'right' ? 'start' : 'end' });
    });
  }
  function seriesPaths(g, X, Y, T, x0, x1, clip, lw) {
    var n = T.v.length, line = '', firstX = null, lastX = null, base = Y(0).toFixed(1);
    var P = decimate(T.e, T.v, Math.max(0, bsearchLE(T.e, x0)), Math.min(n - 1, lowerBound(T.e, x1)), X);
    line = pathOf(P, Y);
    if (P.px.length) { firstX = P.px[0].toFixed(1); lastX = P.px[P.px.length - 1].toFixed(1); }
    if (!line) return;
    el('path', { d: line + 'L' + lastX + ' ' + base + 'L' + firstX + ' ' + base + 'Z', fill: C.fear, 'fill-opacity': 0.35, stroke: 'none', 'clip-path': clip }, g);
    el('path', { d: line, fill: 'none', stroke: C.fear, 'stroke-width': lw, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
  }
  function linePath(g, X, Y, xs, vs, x0, x1, clip, attrs) {
    var n = xs.length, P = decimate(xs, vs, Math.max(0, bsearchLE(xs, x0)), Math.min(n - 1, lowerBound(xs, x1)), X), d = pathOf(P, Y);
    if (!d) return;
    var a = { d: d, fill: 'none', 'stroke-linejoin': 'round', 'clip-path': clip };
    for (var k in attrs) a[k] = attrs[k];
    el('path', a, g);
  }
  function lineWidth(span, narrow) { return span > 2600 ? (narrow ? 0.7 : 0.9) : span > 420 ? (narrow ? 0.9 : 1.1) : span > 100 ? 1.3 : 1.6; }
  var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
  function withHalo(a) { for (var k in HALO) a[k] = HALO[k]; return a; }
  var DOT = { peak: C.gold, edge: C.bg, nowCore: sw('#F3EEFF', '#E6F5F3') };
  function peakDot(g, x, y, r) { el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: DOT.peak, stroke: DOT.edge, 'stroke-width': r > 3 ? 1.6 : 1.3 }, g); }
  function nowDot(g, x, y, r) {
    el('circle', { cx: x, cy: y, r: r + 5, fill: C.light, 'fill-opacity': 0.16, stroke: C.light, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
    el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: C.light, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
    el('circle', { cx: x, cy: y, r: r, fill: DOT.nowCore, stroke: '#fff', 'stroke-width': 1.4 }, g);
  }
  function nowBox(x, y, r) { return { x: x - r - 6, y: y - r - 6, w: 2 * r + 12, h: 2 * r + 12 }; }
  function dotBox(x, y, r) { return { x: x - r - 1, y: y - r - 1, w: 2 * r + 2, h: 2 * r + 2 }; }
  function thinDots(cands, r, obstacles, minDx) {
    var kept = [], beaten = [], minD = 2 * r + 0.5;
    cands.forEach(function (c) {
      if (obstacles && obstacles.some(function (o) { return overlaps(o, dotBox(c.x, c.y, r)); })) return;
      var near = function (k) { return Math.hypot(k.x - c.x, k.y - c.y) < minD || Math.abs(k.x - c.x) < (minDx || 0); };
      if (kept.some(near) || beaten.some(near)) beaten.push(c); else kept.push(c);
    });
    return kept;
  }
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function crossLayer(svg) { return el('g', { 'pointer-events': 'none' }, svg); }
  var GEO = { o: null };
  var hover = { o: null };

  var OUT = null, ROWS = [], GROUPS = [], RBY = {}, GBY = {}, REF = null, REFIDX = null, OPEN = {}, LIVE = false, CPON = true;
  var SDOC = {}, SDOC_ORDER = [], GDOC = {};
  var F = { kind: normKind(stored(PFX + 'Kind')) || 'all', idx: normIdx(stored(PFX + 'Idx')) || 'all', q: '', all: false };
  var CK = normCK(stored(PFX + 'Crowd')) || 'all', CALL = false;
  var FT = { key: 'rank', dir: 1, q: '', all: false, built: false };
  function normKind(s) { return ['all', 'alone', 'crowd', 'deep', 'rare', 'fast', 'quality'].indexOf(s) >= 0 ? s : null; }
  function normIdx(s) { return ['all', 'spx', 'ndx', 'rui', 'iwm'].indexOf(s) >= 0 ? s : null; }
  function normCK(s) { return ['all', 'Sector', 'Industry', 'Index', 'Theme'].indexOf(s) >= 0 ? s : null; }

  function pubErr(msg) { var e = new Error(msg); e.pub = true; return e; }
  function errWords(e) { try { console.warn(NOUN + ' outliers:', e); } catch (x) {  } return e && e.pub ? e.message : 'the data looked broken'; }
  function getJSON1(path, top) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    return fetch((top ? ROOT : BASE) + path, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw pubErr(path + ': HTTP ' + r.status);
        return r.json().catch(function () { throw pubErr(path + ' is not valid JSON'); });
      }, function (e) {
        clearTimeout(timer);
        throw pubErr(e && e.name === 'AbortError' ? path + ' timed out' : 'network error fetching ' + path);
      });
  }
  function getJSON(path, top) {
    return getJSON1(path, top).catch(function (e) {
      if (ROOT === RAW) throw e;
      ROOT = RAW; BASE = RAW + (BULL ? 'bull/' : 'fear/');
      return getJSON1(path, top);
    });
  }
  function unpackDates(d0, dd) {
    if (d0 == null) return [];
    var out = [d0], dn = dayNum(d0);
    for (var i = 0; i < dd.length; i++) { dn += dd[i]; out.push(new Date(dn * 864e5).toISOString().slice(0, 10)); }
    return out;
  }
  function unpackDoc(x) {
    if (x && x.daily && x.daily.d0 !== undefined && !x.daily.d) x.daily.d = unpackDates(x.daily.d0, x.daily.dd || []);
    if (x && x.tf) Object.keys(x.tf).forEach(function (k) {
      var b = x.tf[k];
      if (b && b.s0 !== undefined && !b.s) { b.s = unpackDates(b.s0, b.sd || []); b.e = unpackDates(b.e0, b.ed || []); }
    });
    return x;
  }
  function validOut(d) {
    return !!(d && d.meta && d.meta.schema === 1 && d.headline && d.sp500 && Array.isArray(d.rows) && Array.isArray(d.groups) && Array.isArray(d.definitions));
  }
  function setData(d) {
    OUT = d; ROWS = d.rows; GROUPS = d.groups;
    RBY = {}; GBY = {};
    ROWS.forEach(function (r) { RBY[r.sym] = r; });
    GROUPS.forEach(function (g) { GBY[g.id] = g; });
    LIVE = d.meta.state === 'LIVE';
    CPON = !(d.context && d.context.cp_public === false);
    if (!CPON) {
      FCOLS = FCOLS.filter(function (c) { return c.k !== 'cpsh'; });
      FSORT = FSORT.filter(function (o) { return o[0] !== 'cpsh'; });
      if (FT.key === 'cpsh') { FT.key = 'rank'; FT.dir = 1; }
    }
    TFS.forEach(function (k) { OPEN[k] = LIVE || (k !== '1D' && /so far/.test((d.sp500.note || {})[k] || '')); });
  }
  function load() {
    getJSON('outliers.json').then(function (d) {
      if (!validOut(d)) throw pubErr('the data looked broken');
      setData(d);
      renderAll();
      startPoll();
    }).catch(function (e) { showFatal('Could not load the data (' + errWords(e) + ').'); });
  }

  var POLL_MS = 300000, pollOn = false, RELOADING = false, MAN_SHA = null;
  function startPoll() {
    if (pollOn) return;
    pollOn = true;
    setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
    poll();
  }
  function poll() {
    if (document.hidden || !OUT) return;
    renderStatus();
    getJSON('manifest.json', true).then(function (m) {
      var s = m && m[BULL ? 'bull' : 'fear'] ? m[BULL ? 'bull' : 'fear'].sha256 : null;
      if (!s) return;
      if (MAN_SHA && s !== MAN_SHA) reloadData();
      MAN_SHA = s;
    }, function () {  });
  }
  function reloadData() {
    if (RELOADING) return;
    RELOADING = true;
    getJSON('outliers.json').then(function (d) {
      RELOADING = false;
      if (!validOut(d) || d.meta.built_utc === OUT.meta.built_utc) return;
      var keepS = FS.open && OV.kind === 'stock' && SDOC[OV.id], keepG = FS.open && OV.kind === 'group' && GDOC[OV.id];
      setData(d);
      SDOC = {}; SDOC_ORDER = []; GDOC = {}; REF = null; REFIDX = null; FT.built = false;
      renderStatus(); renderHero(); renderFilters(); renderOutliers(); renderMap(); renderCrowdChips(); renderCrowds();
      renderFullSummary(); renderFoot();
      if ($('full').open) renderFull();
      if (FS.open && OV.kind) {
        if (OV.kind === 'stock' ? RBY[OV.id] : GBY[OV.id]) { OV.err = null; ovLoad(); }
        else {
          if (keepS) { SDOC[OV.id] = keepS; SDOC_ORDER.push(OV.id); }
          if (keepG) GDOC[OV.id] = keepG;
        }
      }
    }, function () { RELOADING = false; });
  }
  function getRef() {
    if (REF) return Promise.resolve(REF);
    return getJSON('ref/sp500.json').then(function (x) {
      x = unpackDoc(x);
      if (!x || !x.daily || !Array.isArray(x.daily.d) || !x.tf) throw pubErr('the S&P 500 meter data looked broken');
      REF = x; REFIDX = {};
      REFIDX['1D'] = idxOf(x.daily.d, x.daily.v);
      ['1W', '2W', '1M'].forEach(function (k) { REFIDX[k] = idxOf(x.tf[k].e, x.tf[k].v); });
      return REF;
    });
  }
  function idxOf(dates, vals) { var o = {}; for (var i = 0; i < dates.length; i++) o[dayNum(dates[i])] = vals[i] == null ? null : vals[i] / 10; return o; }
  function getStock(sym) {
    if (SDOC[sym]) return Promise.resolve(SDOC[sym]);
    return getJSON('stocks/' + encodeURIComponent(sym) + '.json').then(function (x) {
      x = unpackDoc(x);
      if (!x || x.sym !== sym || !x.daily || !Array.isArray(x.daily.d) || !x.tf || !x.tf['1D']) throw pubErr('the data for ' + sym + ' looked broken');
      x._d = x.daily.d.map(dayNum);
      SDOC[sym] = x; SDOC_ORDER.push(sym);
      if (SDOC_ORDER.length > 12) { var old = SDOC_ORDER.shift(); if (old !== OV.id) delete SDOC[old]; }
      return x;
    });
  }
  function getGroup(id) {
    if (GDOC[id]) return Promise.resolve(GDOC[id]);
    return getJSON('groups/' + encodeURIComponent(id) + '.json').then(function (x) {
      x = unpackDoc(x);
      if (!x || x.id !== id || !x.daily || !Array.isArray(x.daily.d) || !x.tf) throw pubErr('the data for this crowd looked broken');
      GDOC[id] = x; return x;
    });
  }

  function showFatal(msg) {
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'NO DATA';
    $('asof').textContent = 'Could not load the ' + NOUN + ' outliers.';
    $('statusLine').textContent = ''; $('membersLine').textContent = '';
    var b = $('banners'); clear(b);
    var d = elh('div', 'banner banner-bad');
    d.appendChild(elh('b', '', 'No numbers to show'));
    d.appendChild(document.createTextNode(msg + ' Try again in a few minutes.'));
    var bt = elh('button', '', 'Try again'); bt.type = 'button'; bt.addEventListener('click', function () { clear(b); load(); });
    d.appendChild(document.createElement('br')); d.appendChild(bt);
    b.appendChild(d);
  }

  function renderAll() {
    $('content').hidden = false;
    renderStatus();
    renderHero();
    renderFilters();
    renderOutliers();
    renderMap();
    renderCrowdChips();
    renderCrowds();
    renderFullSummary();
    renderFoot();
    var h = parseHash();
    if (h) { clearHash(); openOv(h.kind, h.id, h.tf, null, true); }
    else if (location.hash && /^#[a-z0-9-]+$/i.test(location.hash)) {
      var tg = document.getElementById(location.hash.slice(1));
      if (tg && tg.closest('#content')) { if (tg.tagName === 'DETAILS') tg.open = true; tg.scrollIntoView(); }
    }
  }

  function renderStatus() {
    var m = OUT.meta, chip = $('chip'), s = dayNum(m.session);
    chip.className = 'chip chip-closed'; chip.textContent = 'CLOSED';
    $('asof').textContent = (m.session_words || fmtDay(s) + ' close') + ' · the latest closed session (' + WD[dnDate(s).getUTCDay()] + ')';
    $('statusLine').textContent = m.universe.words;
    var c = m.counts;
    $('membersLine').textContent = commas(c.eligible) + ' on the board today · ' + commas(c[K.n]) + ' of them ' + ADJ + ' · ' + GROUPS.length + ' crowds';
  }

  function renderHero() {
    var h = OUT.headline, c = OUT.meta.counts, sp = OUT.sp500;
    $('tqSub').textContent = 'Across ' + commas(OUT.meta.universe.n) + ' US stocks and ' + GROUPS.length + ' crowds: the ' + sw('fear', 'bullishness') + ' that is rare for the stock itself and out of line with its peers and the market.';
    var box = $('heads'); clear(box);
    function tile(cls, num, unit, title, sub, onClick, label) {
      var t = elh(onClick ? 'button' : 'div', 'head ' + (cls || ''));
      if (onClick) { t.type = 'button'; t.addEventListener('click', onClick); t.setAttribute('aria-label', label); }
      var n = elh('div', 'head-n', num); if (unit) n.appendChild(span('u', unit));
      t.appendChild(n);
      t.appendChild(elh('div', 'head-t', title));
      var s = elh('div', 'head-s'); sub.forEach(function (p) { s.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
      t.appendChild(s);
      box.appendChild(t);
    }
    tile('head-gold', commas(h.rare.n), '', 'stocks this ' + ADJ + ' on only 1% of their own days or fewer',
      [(h.rare.words_2y ? h.rare.words_2y + ' · ' : '') + commas(h[K.n].n) + ' stocks ' + ADJ + ' today'], function () { chooseKind('rare'); $('outliers').scrollIntoView(); },
      h.rare.words + ': list them');
    var spTop = sp.top && sp.top['1D'] != null ? 'top ' + (sp.top0 && sp.top0['1D'] != null ? Math.max(1, sp.top0['1D']) : Math.max(1, Math.round(sp.top['1D']))) + '% of its days since 2013' : '';
    tile('', String(sp.now['1D']), '%', SPF + ' · ' + sp.zone,
      [spTop + ' · ' + sp.n + ' stocks counted'], function (e) { openOv('group', 'index_sp500', '1D', null, e.detail > 0); },
      SPF + ' ' + sp.now['1D'] + '%, ' + sp.zone + ': open its chart');
    var cr = h.crowd, g = GBY[cr.id];
    if (g) {
      tile('', String(Math.round(cr.pct)), '%', cr.name + ' ' + ADJ,
        ['the most unusual crowd: ' + topWords(g)], function (e) { openOv('group', cr.id, '1D', null, e.detail > 0); },
        cr.words + ': open its chart');
    }
    var rn = $('rightNow'); clear(rn);
    var r0 = ROWS[0];
    rn.appendChild(span('rn-k', 'Right now: '));
    rn.appendChild(elh('b', '', commas(c[K.n])));
    rn.appendChild(document.createTextNode(' of the ' + commas(c.eligible) + ' stocks on the board are ' + ADJ + '. '));
    if (r0) {
      rn.appendChild(document.createTextNode('The biggest outlier is '));
      var a = elh('button', 'st-btn', r0.sym + ' ›'); a.type = 'button'; a.setAttribute('aria-label', 'Open the ' + r0.sym + ' ' + NOUN + ' chart');
      a.addEventListener('click', function (e) { openOv('stock', r0.sym, '1D', null, e.detail > 0); });
      rn.appendChild(a);
      rn.appendChild(document.createTextNode((r0.name ? ' (' + shortName(r0.name, r0.sym) + ')' : '') + ': ' + r0.words.rare + ', while ' + r0.words.crowd + '. '));
    }
    var hot = GROUPS.filter(function (x) { return x.id !== 'index_sp500' && x.top <= 1.5 && x.pct['1D'] > 0; }).map(function (x) { return x.name; });
    if (hot.length) {
      var list = hot.length === 1 ? hot[0] : hot.slice(0, -1).join(', ') + ' and ' + hot[hot.length - 1];
      rn.appendChild(document.createTextNode(list + (hot.length === 1 ? ' is' : ' are') + ' in the top 1% of ' + (hot.length === 1 ? 'its' : 'their') + ' own days, while the ' + SPM + ' reads ' + sp.zone + '.'));
    }
  }

  var KINDS = [['all', 'All', 'All'], ['alone', 'Alone', 'Alone'], ['crowd', 'With the crowd', 'Crowd'], ['deep', 'Deep', 'Deep'], ['rare', 'Rare', 'Rare'], ['fast', 'Fast', 'Fast'], ['quality', 'Quality', 'Quality']];
  var IDXS = [['all', 'All indexes', 'All'], ['spx', 'S&P 500', 'S&P'], ['ndx', 'Nasdaq 100', 'NDX'], ['rui', 'Russell 1000', 'R1000'], ['iwm', 'Russell 2000', 'R2000']];
  var KIND_TIP = { all: 'every ' + ADJ + ' stock on the board', alone: ADJ + ' while few of its peers are', crowd: ADJ + ' while most of its peers are',
    deep: ADJ + ' on daily, weekly, 2-week and monthly candles', rare: 'this ' + ADJ + ' on 1% of its own days or fewer', fast: 'one of its fastest 5-day ' + sw('drops', 'rises') + ' in mood since 2013', quality: 'business score 70 or more' };
  function passKind(r, k) { if (k === 'all') return true; if (k === 'quality') return r.biz != null && r.biz >= 70; return r.kinds.indexOf(k) >= 0; }
  function passIdx(r, i) { return i === 'all' || r.idx.indexOf(i) >= 0; }
  function passQ(r, q) {
    if (!q) return true;
    var u = q.toUpperCase();
    return r.sym.indexOf(u) === 0 || (r.name || '').toUpperCase().indexOf(u) >= 0 || (r.industry || '').toUpperCase().indexOf(u) >= 0;
  }
  function viewRows() { return ROWS.filter(function (r) { return passKind(r, F.kind) && passIdx(r, F.idx); }); }
  function goldSet(rows) { var o = {}; rows.slice(0, GOLD_N).forEach(function (r) { o[r.sym] = 1; }); return o; }
  function segButtons(box, items, cur, attr, counts, onPick) {
    clear(box);
    items.forEach(function (it) {
      var b = elh('button'); b.type = 'button'; b.setAttribute(attr, it[0]);
      b.appendChild(span('t-l', it[1])); b.appendChild(span('t-s', it[2]));
      if (counts) b.appendChild(span('n', commas(counts[it[0]] || 0)));
      b.setAttribute('aria-pressed', String(cur === it[0]));
      if (KIND_TIP[it[0]] && attr === 'data-fk') b.title = KIND_TIP[it[0]];
      b.addEventListener('click', function () { onPick(it[0]); });
      box.appendChild(b);
    });
  }
  function renderFilters() {
    var kc = {}, ic = {};
    KINDS.forEach(function (k) { kc[k[0]] = ROWS.filter(function (r) { return passIdx(r, F.idx) && passKind(r, k[0]); }).length; });
    IDXS.forEach(function (k) { ic[k[0]] = ROWS.filter(function (r) { return passKind(r, F.kind) && passIdx(r, k[0]); }).length; });
    var fk = $('fKind'); segButtons(fk, KINDS, F.kind, 'data-fk', kc, chooseKind);
    fk.classList.toggle('g3', true);
    segButtons($('fIdx'), IDXS, F.idx, 'data-fi', ic, chooseIdx);
  }
  function chooseKind(k) { if (k === F.kind) return; F.kind = k; F.all = false; store(PFX + 'Kind', k); renderFilters(); renderOutliers(); renderMap(); }
  function chooseIdx(k) { if (k === F.idx) return; F.idx = k; F.all = false; store(PFX + 'Idx', k); renderFilters(); renderOutliers(); renderMap(); }
  function scaredDots(dots) {
    var w = span('scd', '');
    TFS.forEach(function (k) {
      var v = dots ? dots[DOT_KEY[k]] : null, slot = span('sdw', '');
      slot.appendChild(span('sdk', SC_KEY[k]));
      var d = span('sd ' + (v === true ? 'on' : v === false ? 'off' : 'na'), v == null ? '–' : '');
      d.title = cap(TF_WORD[k]) + ' candle: ' + (v === true ? ADJ : v === false ? 'not ' + ADJ : 'no reading');
      slot.appendChild(d); w.appendChild(slot);
    });
    w.setAttribute('aria-label', TFS.map(function (k) { var v = dots ? dots[DOT_KEY[k]] : null; return TF_WORD[k] + ' ' + (v === true ? ADJ : v === false ? 'not ' + ADJ : 'no reading'); }).join(', '));
    return w;
  }
  function chipTitle(r, ch) {
    if (ch.k === 'heavy') return r.words.heavy || ch.label;
    if (ch.k === 'biz') return 'Business score ' + r.biz + ' of 100';
    if (ch.k === 'puts') return 'Put open interest building on one side (' + r.puts + ' window)';
    if (ch.k === 'calls') return 'Call open interest building on one side (' + r.calls + ' window)';
    return ch.label;
  }
  function rowChips(r) { return (r.chips || []).filter(function (ch) { return ch.k !== 'biz'; }); }
  function ctxChips(r) {
    var w = span('ctx', '');
    rowChips(r).forEach(function (ch) { var c = span('fchip fchip-' + ch.k, ch.label); c.title = chipTitle(r, ch); w.appendChild(c); });
    return w;
  }

  var BIZLAB = { rev_yoy: 'Revenue YoY', eps_yoy: 'EPS YoY', peg: 'PEG', fcf_growth: 'FCF growth', fcf_margin: 'FCF margin', rev_qoq: 'Revenue QoQ' };
  var BIZ_ORDER = ['rev_yoy', 'eps_yoy', 'peg', 'fcf_growth', 'fcf_margin', 'rev_qoq'];
  var BUCKET = [['≤1M', 'up to 1 month', '≤ 1M'], ['1-3M', '1–3 months', '1–3M'], ['3-12M', '3–12 months', '3–12M'], ['1Y+', '1 year +', '1Y +']];
  function twoLab(long, short) { var s0 = span('', ''); s0.appendChild(span('ll', long)); s0.appendChild(span('ls', short)); return s0; }
  function bizCls(v) { return v >= 70 ? 'hi' : v >= 50 ? 'mid' : 'lo'; }
  function bizNum(v) { return v % 1 ? v.toFixed(1) : String(v); }
  function bizWord(v) { return v >= 70 ? 'strong' : v >= 50 ? 'middling' : 'weak'; }
  function kf(n) {
    var a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'K';
    return commas(n);
  }
  function signedK(n) { return (n >= 0 ? '+' : '−') + kf(Math.abs(n)); }
  function cpShare(c, p) { return c != null && p != null && c + p > 0 ? c / (c + p) : null; }
  function ratioWords(c, p) {
    var sh = cpShare(c, p); if (sh == null) return null;
    var f = function (x) { return x >= 9.95 ? x.toFixed(0) : x.toFixed(1); };
    return sh >= 0.55 ? f(c / Math.max(p, 1)) + ' : 1' : sh <= 0.45 ? '1 : ' + f(p / Math.max(c, 1)) : 'even';
  }
  function leanOf(sh) { return sh >= 0.55 ? 'calls' : sh <= 0.45 ? 'puts' : 'even'; }
  function moveWords(d) {
    if (d == null) return null;
    if (Math.abs(d) < 1) return '=';
    var n = Math.round(Math.abs(d));
    return (d > 0 ? '▲' : '▼') + n + (n === 1 ? ' pt' : ' pts');
  }
  function moveSpan(words, d) { return span('cpw ' + (words == null || words === '=' ? 'muted' : d > 0 ? 'up' : 'down'), words || ''); }
  function move1w(words, d) {
    var w = span('cpw1', ''); w.appendChild(span('muted', '1W '));
    if (words == null) w.appendChild(span('cpw muted', 'n/a')); else w.appendChild(moveSpan(words, d));
    return w;
  }
  function shareNum(c) { return String(c.words && c.words.share || Math.round(c.call_share * 100) + '% calls').replace(/ calls$/, ''); }
  function tickOf() { return null; }
  function noOpt(n) { return n && n.text ? n.text : 'no saved option chain'; }
  function cpBar(share, ref, cls) {
    var b = span('cpb' + (cls ? ' ' + cls : ''), '');
    var f = span('cpf', ''); f.style.width = (share * 100).toFixed(1) + '%'; b.appendChild(f);
    b.appendChild(span('cpm', ''));
    if (ref != null) { var t = span('cptk', ''); t.style.left = (ref * 100).toFixed(1) + '%'; b.appendChild(t); }
    b.setAttribute('aria-hidden', 'true');
    return b;
  }
  function settleWord(iso) { return iso ? fmtDay(dayNum(iso)) : '–'; }
  function cpTip(c, crowd, none) {
    if (!c) return crowd ? 'No stock in this crowd has options data' : 'No options data: ' + noOpt(none);
    var t = kf(c.calls) + ' calls vs ' + kf(c.puts) + ' puts held (every strike, every expiry still open), ' + shareNum(c) + ' calls';
    if (crowd) t += ', ' + c.n_cp + ' of its ' + c.n + ' stocks with options';
    if (c.older) t += ' · its newest saved chain: the ' + settleWord(c.settle) + ' settle';
    return t;
  }
  function cpBox(c, crowd, none) {
    var box = elh('div', 'dbox dcp' + (c ? '' : ' na'));
    var hd = elh('div', 'dhd'); hd.appendChild(span('', 'Calls : puts'));
    if (c) { var sh = span('dsh', shareNum(c)); sh.appendChild(span('cw', ' calls')); hd.appendChild(sh); }
    box.appendChild(hd);
    var v = elh('div', 'dval');
    if (!c) { v.appendChild(span('muted', 'no options data')); box.appendChild(v); }
    else {
      v.appendChild(span('cpr ' + c.words.lean, c.words.ratio));
      box.appendChild(v); box.appendChild(cpBar(c.call_share, tickOf(c, crowd)));
    }
    box.title = cpTip(c, crowd, none);
    return box;
  }
  function bizBox(b, crowd) {
    var sc = b == null ? null : crowd ? b.median : b.score, cls = sc == null ? 'lo' : bizCls(sc);
    var box = elh('div', 'dbox dbz' + (sc == null ? ' na' : ''));
    var hd = elh('div', 'dhd'); hd.appendChild(span('', 'Business'));
    if (sc != null) hd.appendChild(span('bzt ' + cls, crowd ? bizWord(sc) : b.word));
    box.appendChild(hd);
    var v = elh('div', 'dval');
    if (sc == null) v.appendChild(span('muted', '—'));
    else { var n = span('', ''); n.appendChild(span('bzt ' + cls, bizNum(sc))); n.appendChild(span('muted', crowd ? ' median' : ' /100')); v.appendChild(n); }
    box.appendChild(v);
    if (sc != null) { var bar = span('bzb ' + cls, ''), f = elh('b'); f.style.width = Math.max(0, Math.min(100, sc)) + '%'; bar.appendChild(f); bar.setAttribute('aria-hidden', 'true'); box.appendChild(bar); }
    box.title = sc == null ? (crowd ? 'No business score for its stocks' : 'No business score: not in the 200W business score list') :
      crowd ? 'Median business score ' + bizNum(sc) + ' of its ' + b.n_scored + ' scored stocks (of ' + b.n + ')' : 'Business score ' + sc + ' of 100 (' + b.word + ')';
    return box;
  }
  function duo(c, b, crowd, none) { var d = elh('div', 'duo'); if (CPON) d.appendChild(cpBox(c, crowd, none)); d.appendChild(bizBox(b, crowd)); return d; }
  function cardH(card, a, b) { var h = elh('h4'); h.appendChild(span('', a)); if (b) h.appendChild(span('muted', b)); card.appendChild(h); }
  function cpCard(c, crowd, who, none) {
    var card = elh('div', 'ocard');
    cardH(card, 'Calls : puts', 'open contracts held');
    if (!c) { card.appendChild(elh('p', 'onote', crowd ? 'None of its stocks has a saved option chain.' : 'No options data for ' + who + ': ' + noOpt(none) + '.')); return card; }
    var big = elh('div', 'cpbig');
    big.appendChild(span('cpr ' + c.words.lean, c.words.ratio));
    big.appendChild(span('', shareNum(c) + ' calls'));
    card.appendChild(big);
    card.appendChild(cpBar(c.call_share, tickOf(c, crowd), 'wide'));
    var t = kf(c.calls) + ' calls vs ' + kf(c.puts) + ' puts held at the ' + settleWord(c.settle || (OUT.context || {}).settle) + ' settle' + (crowd ? ', added up over its ' + c.n_cp + ' stocks with options (of ' + c.n + ')' : '') + '.';
    card.appendChild(elh('p', 'otxt', t));
    var bb = c.by_bucket;
    if (bb) {
      var g = elh('div', 'cpg');
      g.appendChild(span('muted h', 'Expiring in · held')); g.appendChild(span('muted h', 'calls | puts')); g.appendChild(span('muted h r', 'calls : puts'));
      BUCKET.forEach(function (k) {
        var x = bb[k[0]]; if (!x) return;
        var sh = cpShare(x[0], x[1]), d = null, tk = null;
        if (crowd && x.length > 4) {
          var sb = cpShare(x[4], x[5]), rs0 = cpShare(x[2], x[3]);
          if (sb != null && rs0 != null && sh != null) { d = (sb - rs0) * 100; tk = sh - d / 100; }
        } else { var rs = cpShare(x[2], x[3]); if (rs != null && sh != null) { d = (sh - rs) * 100; tk = rs; } }
        var lab = twoLab(k[1], k[2]); if (x[0] + x[1] > 0) lab.appendChild(span('muted', ' · ' + kf(x[0] + x[1])));
        g.appendChild(lab);
        if (sh == null) { g.appendChild(span('muted', 'none open')); g.appendChild(span('', '')); return; }
        var cell = span('cpcell', ''); cell.appendChild(cpBar(sh, tk == null ? null : Math.max(0, Math.min(1, tk)), 'wide')); cell.title = kf(x[0]) + ' calls vs ' + kf(x[1]) + ' puts'; g.appendChild(cell);
        var rw = span('r', ''); rw.appendChild(span('cpr ' + leanOf(sh), ratioWords(x[0], x[1]))); g.appendChild(rw);
      });
      card.appendChild(g);
    }
    var note = 'Green = the calls’ share, red = the puts’. Every strike counts (in the money too); one contract = 100 shares.';
    if (c.older) note += ' ' + who + ' has no saved chain on the newest settle; this is its newest one, the ' + settleWord(c.settle) + ' settle.';
    if (crowd && c.n_older) note += ' ' + c.n_older + (c.n_older === 1 ? ' of its stocks has no saved chain on the newest settle and counts with its' : ' of its stocks have no saved chain on the newest settle and count with their') + ' newest one (a few sessions older).';
    card.appendChild(elh('p', 'onote', note));
    return card;
  }
  function bizCard(b, crowd) {
    var card = elh('div', 'ocard');
    cardH(card, 'Business', crowd ? 'median of its stocks' : '200W business score');
    var sc = b == null ? null : crowd ? b.median : b.score;
    if (sc == null) {
      var e = elh('div', 'bzbig'); e.appendChild(span('bzt lo', '—')); card.appendChild(e);
      card.appendChild(elh('p', 'onote', crowd ? 'None of its stocks has a business score.' : 'No business score: this stock is not in the 200W business score list.'));
      return card;
    }
    var cls = bizCls(sc), big = elh('div', 'bzbig');
    big.appendChild(span('bzt ' + cls, bizNum(sc))); big.appendChild(span('muted', '/100'));
    var bar = span('bzb wide ' + cls, ''), f = elh('b'); f.style.width = Math.max(0, Math.min(100, sc)) + '%'; bar.appendChild(f); big.appendChild(bar);
    big.appendChild(span('bzt ' + cls, crowd ? bizWord(sc) : b.word));
    card.appendChild(big);
    if (crowd) {
      card.appendChild(elh('p', 'onote bzmed', 'The median of its ' + b.n_scored + ' scored stocks (of ' + b.n + ').'));
      var row = elh('div', 'bzmixrow'); row.appendChild(span('muted bzmk', 'Mix'));
      var one = [b.strong, b.middling, b.weak].filter(function (n) { return n > 0; }).length <= 1;
      if (!one) {
        var mix = span('bzmix', ''), tot = Math.max(1, b.n_scored);
        [['hi', b.strong], ['mid', b.middling], ['lo', b.weak]].forEach(function (x) { var q = elh('b', x[0]); q.style.width = (x[1] / tot * 100).toFixed(1) + '%'; mix.appendChild(q); });
        mix.setAttribute('aria-hidden', 'true'); row.appendChild(mix);
      }
      var w = span('bzmixw', ''); w.appendChild(span('bzt hi', b.strong + ' strong')); w.appendChild(document.createTextNode(' · ')); w.appendChild(span('bzt mid', b.middling + ' middling'));
      w.appendChild(document.createTextNode(' · ')); w.appendChild(span('bzt lo', b.weak + ' weak'));
      row.appendChild(w); card.appendChild(row);
      return card;
    }
    card.appendChild(elh('p', 'onote', 'Growth, cash-flow and valuation numbers, each ranked against the S&P 500 + Nasdaq 100. The same score as the 200W reports.'));
    return card;
  }
  function peerNote(r) {
    var p = r.peer || {};
    if (p.level === 'theme') return 'compared with its ' + themeShort(p.name) + ' crowd, more ' + ADJ + ' today than its industry' + (p.chain && p.chain.name ? ' (' + p.chain.name + ')' : '');
    if (p.level === 'sector') return 'compared with its sector';
    if (p.level === 'market') return 'compared with every stock on the board';
    return null;
  }
  function themeShort(n) { return String(n || '').replace(/ basket$/, ''); }
  function kindTags(r, which) {
    var out = [];
    which.forEach(function (k) {
      if (r.kinds.indexOf(k) < 0) return;
      out.push(span('tag tag-' + k, k === 'crowd' ? 'With the crowd' : cap(k)));
    });
    return out;
  }
  function renderOutliers() {
    var all = viewRows(), gold = goldSet(all), q = F.q.trim(), rows = q ? all.filter(function (r) { return passQ(r, q); }) : all;
    var shown = q || F.all ? rows : rows.slice(0, TOP_N);
    var kw = F.kind === 'all' ? ADJ + ' stocks' : F.kind === 'quality' ? ADJ + ' quality stocks (business 70+)' : (F.kind === 'crowd' ? '“with the crowd”' : '“' + F.kind + '”') + ' stocks';
    var iw = F.idx === 'all' ? '' : ' in the ' + IDXS.filter(function (x) { return x[0] === F.idx; })[0][1];
    $('oCount').textContent = !all.length ? 'No ' + kw + iw + ' today.' : q ? rows.length + (rows.length === 1 ? ' stock matches “' : ' stocks match “') + q + '” · ' + all.length + ' ' + kw + iw
      : (shown.length < rows.length ? 'The top ' + shown.length + ' of ' : 'All ') + rows.length + ' ' + kw + iw + ' · ranked by outlier score · ' + CLICK + ' a stock for its own ' + NOUN + ' chart';
    var none = $('oNone');
    none.hidden = rows.length > 0;
    none.hidden = rows.length > 0 || !all.length;
    if (!rows.length) none.textContent = 'No ' + ADJ + ' stock matches “' + q + '” here. The search looks at the symbol, the name and the industry.';
    var t = $('oTable'); clear(t);
    if (rows.length) {
      var cap0 = document.createElement('caption'); cap0.className = 'vh'; cap0.textContent = 'Biggest ' + NOUN + ' outliers'; t.appendChild(cap0);
      var th = t.createTHead().insertRow();
      [['Stock', 'c-stock'], ['Outlier score', 'c-score'], ['How rare', 'c-rare'], ['Alone or with the crowd', 'c-crowd'], [cap(ADJ) + ' on', 'c-sizes'], ['Context', 'c-ctx']].forEach(function (c) {
        var h = document.createElement('th'); h.className = c[1]; h.scope = 'col';
        var b = elh('div', 'b-sort');
        if (c[1] === 'c-sizes') {
          b.className += ' b-sort-sc'; b.appendChild(span('', c[0]));
          var lab = span('sc-lab', ''); TFS.forEach(function (k) { lab.appendChild(span('sdl', SC_KEY[k])); }); b.appendChild(lab);
        } else b.appendChild(span('', c[0]));
        h.appendChild(b); th.appendChild(h);
      });
    }
    var tb = t.createTBody();
    shown.forEach(function (r) {
      var tr = tb.insertRow(); tr.className = 'b-row' + (gold[r.sym] ? ' gld' : ''); tr.setAttribute('data-sym', r.sym);
      var c0 = tr.insertCell(); c0.className = 'c-stock';
      var ob = elh('button', 'b-open'); ob.type = 'button'; ob.setAttribute('data-sym', r.sym);
      ob.setAttribute('aria-label', '#' + r.rank + ' ' + r.sym + (r.name ? ' (' + r.name + ')' : '') + ': open its own ' + NOUN + ' chart');
      ob.appendChild(span('b-rank' + (gold[r.sym] ? ' gld' : ''), '#' + r.rank));
      ob.appendChild(span('b-sym', r.sym)); ob.appendChild(span('b-name', shortName(r.name, r.sym)));
      c0.appendChild(ob);
      c0.appendChild(span('b-ind', r.industry || r.sector_name || ''));
      var c1 = tr.insertCell(); c1.className = 'c-score';
      var sc = span('sc', ''), bar = span('sbar', ''), fill = span('sfill' + (gold[r.sym] ? ' gld' : ''), '');
      fill.style.width = Math.max(2, r.score) + '%'; bar.appendChild(fill); sc.appendChild(bar); sc.appendChild(span('snum', String(r.score)));
      sc.title = 'Outlier score ' + r.score + ' of 100'; c1.appendChild(sc);
      var c2 = tr.insertCell(); c2.className = 'c-rare';
      kindTags(r, ['rare', 'fast']).forEach(function (n) { c2.appendChild(n); });
      c2.appendChild(span('wd', cap(r.words.rare)));
      if (r.words.speed) c2.appendChild(span('wd-2', r.words.speed));
      var c3 = tr.insertCell(); c3.className = 'c-crowd';
      kindTags(r, ['alone', 'crowd']).forEach(function (n) { c3.appendChild(n); });
      c3.appendChild(span('wd', cap(r.words.crowd)));
      var pw = peerNote(r); if (pw) c3.appendChild(span('wd-2', pw));
      var c4 = tr.insertCell(); c4.className = 'c-sizes';
      c4.appendChild(scaredDots(r.dots));
      kindTags(r, ['deep']).forEach(function (n) { c4.appendChild(n); });
      var c5 = tr.insertCell(); c5.className = 'c-ctx';
      if (rowChips(r).length) c5.appendChild(ctxChips(r));
      c5.appendChild(span('pline', r.words.price));
      c5.appendChild(duo(r.cp, r.business, false, r.cp_none));
    });
    var more = $('oMore');
    if (!q && rows.length > TOP_N) {
      more.hidden = false;
      more.textContent = F.all ? 'Show the top ' + TOP_N + ' only' : 'Show all ' + rows.length;
    } else more.hidden = true;
    var lg = $('lgO'); clear(lg);
    function item(cls, text) { var s0 = span('lg-i', ''); if (cls) s0.appendChild(span(cls, '')); s0.appendChild(document.createTextNode(text)); return s0; }
    lg.appendChild(item('sd on', ADJ + ' on that candle: D daily · W weekly · 2W 2-week · M monthly'));
    lg.appendChild(item('lg-pin', 'gold = the top ' + GOLD_N + ' in this view (gold on the map too)'));
    lg.appendChild(item('', 'Outlier score 0–100: highest when the stock is ' + ADJ + ' on almost none of its own days while its peers are ' + sw('calm', 'quiet') + '; lower when it is often this ' + ADJ + ' or its peers are ' + ADJ + ' too'));
    lg.appendChild(item(CPON ? 'lg-cp' : '', (CPON ? 'Calls : puts = option contracts held, calls green | puts red · ' : '') + 'Business = the 200W business score (70+ strong, 50–69 middling, under 50 weak)'));
  }

  var MAP = { pts: [], sel: null, hov: null, geo: null, view: null, full: null, raf: false };
  var CORNER_R = 0.02;
  function effR(r) { return r.R > 0 ? r.R : r.rx; }
  function rareTick(v) { var p = v * 100; return (p >= 1 ? String(+p.toFixed(p >= 10 ? 0 : 1)) : String(+p.toFixed(p >= 0.1 ? 2 : 3))) + '%'; }
  function mapXTicks(lo, hi) {
    var ms = hi - lo < 0.9 ? [1, 1.5, 2, 3, 4, 5, 7] : [1, 2, 5], out = [];
    for (var e = -6; e <= 0; e++) ms.forEach(function (m) { var v = m * Math.pow(10, e), lv = Math.log10(v); if (v <= 0.25 && lv >= lo - 1e-9 && lv <= hi + 1e-9) out.push(v); });
    return out.sort(function (a, b) { return b - a; });
  }
  function mapRequest() { if (MAP.raf) return; MAP.raf = true; requestAnimationFrame(function () { MAP.raf = false; renderMap(); }); }
  function mapClamp(v) {
    var F = MAP.full; if (!F || !v) return null;
    var fx = F.x1 - F.x0, fy = F.y1 - F.y0;
    var kx = Math.max(0.04, Math.min(1, (v.x1 - v.x0) / fx)), ky = Math.max(0.04, Math.min(1, (v.y1 - v.y0) / fy));
    if (kx >= 0.999 && ky >= 0.999) return null;
    var cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2, sx = kx * fx, sy = ky * fy;
    var u = Math.max(0, Math.min(1 - kx, (cx - sx / 2 - F.x0) / fx)), w = Math.max(0, Math.min(1 - ky, (cy - sy / 2 - F.y0) / fy));
    var x0 = F.x0 + u * fx, y0 = F.y0 + w * fy;
    return { x0: x0, x1: x0 + sx, y0: y0, y1: y0 + sy };
  }
  function mapSetView(v) { var nv = mapClamp(v); MAP.view = nv; mapRequest(); }
  function mapZoomAt(f, px, py, from) {
    var g = MAP.geo; if (!g) return;
    var V = from || MAP.view || MAP.full, ax = g.X.inv(px), ay = g.Y.inv(py);
    mapSetView({ x0: ax + (V.x0 - ax) * f, x1: ax + (V.x1 - ax) * f, y0: ay + (V.y0 - ay) * f, y1: ay + (V.y1 - ay) * f });
  }
  function mapPanBy(dxPx, dyPx, from) {
    var g = MAP.geo, V = from || MAP.view || MAP.full; if (!g) return;
    var dx = -dxPx * (V.x1 - V.x0) / g.pw, dy = dyPx * (V.y1 - V.y0) / g.ph;
    mapSetView({ x0: V.x0 + dx, x1: V.x1 + dx, y0: V.y0 + dy, y1: V.y1 + dy });
  }
  function renderMap() {
    var holder = $('mapChart'), Wraw = holder.clientWidth;
    if (!Wraw || !OUT) return;
    var W = Math.max(280, Math.round(Wraw)), phone = W < 560;
    var H = phone ? W + 24 : Math.round(Math.min(620, Math.max(380, W * 0.54)));
    var L = phone ? 36 : 54, R = phone ? 8 : 14, T0 = phone ? 24 : 14, B = phone ? 40 : 44;
    var pw = W - L - R, ph = H - T0 - B;
    var rows = viewRows(), gold = goldSet(rows);
    var minR = 1, gLo = 0, gHi = 100;
    ROWS.forEach(function (r) { minR = Math.min(minR, effR(r)); gLo = Math.min(gLo, r.gap); gHi = Math.max(gHi, r.gap); });
    MAP.full = { x0: Math.log10(0.25), x1: Math.log10(minR) - 0.12, y0: Math.floor((gLo - 6) / 25) * 25, y1: Math.ceil((gHi + 6) / 25) * 25 };
    MAP.view = mapClamp(MAP.view);
    var V = MAP.view || MAP.full, zoomed = !!MAP.view;
    var X = lin(V.x0, V.x1, L, L + pw), Y = lin(V.y0, V.y1, T0 + ph, T0);
    var svg = svgFor(holder, W, H), g = el('g', {}, svg), pclip = clipFor(svg, L, T0, pw, ph);
    panelRect(g, L, T0, pw, ph);
    var gg = el('g', { 'clip-path': pclip }, g);
    var qx = X(Math.log10(CORNER_R)), qy = Y(50);
    el('rect', { x: qx, y: qy - 4000, width: 4000, height: 4000, fill: C.gold, 'fill-opacity': 0.035 }, gg);
    var lastX = -1e9, xlo = Math.min(V.x0, V.x1), xhi = Math.max(V.x0, V.x1);
    mapXTicks(xlo, xhi).forEach(function (v) {
      var px = X(Math.log10(v));
      if (px < L - 0.5 || px > L + pw + 0.5) return;
      el('line', { x1: px, x2: px, y1: T0, y2: T0 + ph, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
      var lab = rareTick(v), w = textW(lab, 11);
      if (px - w / 2 < lastX + 8 || px + w / 2 > W) return;
      tx(g, px, T0 + ph + 15, lab, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
      lastX = px + w / 2;
    });
    var ystep = niceStep(V.y1 - V.y0, phone ? 4 : 6);
    for (var yv = Math.ceil(V.y0 / ystep - 1e-9) * ystep; yv <= V.y1 + 1e-9; yv += ystep) {
      var py = Y(yv), z0 = Math.abs(yv) < 1e-9, lab = z0 ? '0' : (yv > 0 ? '+' : '−') + String(+Math.abs(yv).toFixed(2));
      el('line', { x1: L, x2: L + pw, y1: py, y2: py, stroke: z0 ? '#3A3F4D' : C.line, 'stroke-width': 1, opacity: z0 ? 1 : 0.7 }, g);
      tx(g, L - 6, py + 3.5, lab, { fill: C.muted, 'font-size': 11, 'text-anchor': 'end' });
    }
    el('line', { x1: qx, x2: qx, y1: T0 - 2000, y2: T0 + ph + 2000, stroke: C.gold, 'stroke-opacity': 0.5, 'stroke-width': 1, 'stroke-dasharray': '4 3' }, gg);
    el('line', { x1: L - 2000, x2: L + pw + 2000, y1: qy, y2: qy, stroke: C.gold, 'stroke-opacity': 0.5, 'stroke-width': 1, 'stroke-dasharray': '4 3' }, gg);
    var xt = phone ? 'rarer for the stock →' : 'how rare for the stock →   (share of its own days since 2013 this ' + sw('scared or worse', 'bullish or more') + ')';
    tx(g, L + pw / 2, H - 6, xt, { fill: C.text, 'font-size': phone ? 11.5 : 12, 'text-anchor': 'middle' });
    if (phone) tx(g, L, T0 - 8, '↑ more alone among its peers (gap, pts)', { fill: C.text, 'font-size': 11.5 });
    else tx(g, 14, T0 + ph / 2, 'more alone among its peers →  (gap to its peers, pts)', { fill: C.text, 'font-size': 12, 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + (T0 + ph / 2) + ')' });
    var cornerFs = phone ? 12 : 13, cornerBox = null;
    if (qx < L + pw - 40 && qy > T0 + 10) {
      tx(g, L + pw - 8, T0 + cornerFs + 5, 'rare and alone', withHalo({ fill: C.gold, 'font-size': cornerFs, 'font-weight': 700, 'text-anchor': 'end' }));
      cornerBox = { x: L + pw - 8 - textW('rare and alone', cornerFs, 700) - 2, y: T0 + 4, w: textW('rare and alone', cornerFs, 700) + 4, h: cornerFs + 4 };
    }
    var dg = el('g', { 'clip-path': clipFor(svg, L - 6, T0 - 6, pw + 12, ph + 12) }, svg), pts = [];
    var rp = phone ? 3 : 3.4, rg = phone ? 7 : 5.2;
    rows.slice().reverse().forEach(function (r) {
      var p = { x: X(Math.log10(effR(r))), y: Y(r.gap), r: gold[r.sym] ? rg : rp, row: r, gold: !!gold[r.sym] };
      if (p.x < L - 8 || p.x > L + pw + 8 || p.y < T0 - 8 || p.y > T0 + ph + 8) return;
      pts.push(p);
      if (!p.gold) el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: rp, fill: C.fear, 'fill-opacity': 0.72, stroke: C.light, 'stroke-opacity': 0.55, 'stroke-width': 0.8 }, dg);
    });
    var golds = pts.filter(function (p) { return p.gold; }).sort(function (a, b) { return a.row.rank - b.row.rank; });
    var goldNo = {}; rows.slice(0, GOLD_N).forEach(function (r, i) { goldNo[r.sym] = i + 1; });
    var placedB = [];
    golds.forEach(function (p) {
      p.dx = p.x; p.dy = p.y;
      if (phone) {
        var free = function (x, y) { return placedB.every(function (q) { return Math.hypot(q.dx - x, q.dy - y) >= 2 * rg; }); };
        if (!free(p.x, p.y)) {
          var dirs = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], found = false;
          for (var k = 1; k <= 3 && !found; k++) for (var di = 0; di < dirs.length; di++) {
            var nrm = Math.hypot(dirs[di][0], dirs[di][1]), d0 = (2 * rg + 2) * k;
            var bx = p.x + dirs[di][0] / nrm * d0, by = p.y + dirs[di][1] / nrm * d0;
            if (bx < L + rg || bx > L + pw - rg || by < T0 + rg || by > T0 + ph - rg || !free(bx, by)) continue;
            p.dx = bx; p.dy = by; found = true; break;
          }
        }
      }
      placedB.push(p);
    });
    golds.slice().reverse().forEach(function (p) {
      var moved = p.dx !== p.x || p.dy !== p.y;
      if (moved) {
        var ll = Math.hypot(p.dx - p.x, p.dy - p.y);
        el('line', { x1: p.x.toFixed(1), y1: p.y.toFixed(1), x2: (p.dx - (p.dx - p.x) * rg / ll).toFixed(1), y2: (p.dy - (p.dy - p.y) * rg / ll).toFixed(1), stroke: C.gold, 'stroke-width': 1 }, dg);
        el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 2.2, fill: 'none', stroke: C.gold, 'stroke-width': 1.2 }, dg);
      }
      el('circle', { cx: p.dx.toFixed(1), cy: p.dy.toFixed(1), r: rg, fill: C.gold, stroke: C.bg, 'stroke-width': 1.5, 'data-gold': goldNo[p.row.sym] }, dg);
      if (phone) tx(dg, p.dx, p.dy + 3.4, String(goldNo[p.row.sym]), { fill: C.bg, 'font-size': goldNo[p.row.sym] >= 10 ? 8.5 : 9.5, 'font-weight': 700, 'text-anchor': 'middle' });
    });
    var lab = el('g', {}, svg), placed = cornerBox ? [cornerBox] : [], fs = 11.5, keep = rg + 6;
    if (!phone) golds.forEach(function (p) {
      var s0 = p.row.sym, w = textW(s0, fs, 700), hh = fs + 2;
      var tries = [[p.x + rg + 4, p.y - hh / 2, 'start'], [p.x - rg - 4 - w, p.y - hh / 2, 'start'], [p.x - w / 2, p.y - rg - 3 - hh, 'start'], [p.x - w / 2, p.y + rg + 3, 'start'],
        [p.x + rg + 2, p.y - rg - hh, 'start'], [p.x - rg - 2 - w, p.y - rg - hh, 'start'], [p.x + rg + 2, p.y + rg, 'start'], [p.x - rg - 2 - w, p.y + rg, 'start'],
        [p.x - w / 2, p.y - rg - 3 - 2 * hh, 'start'], [p.x - w / 2, p.y + rg + 3 + hh, 'start'], [p.x + rg + 4, p.y - 1.5 * hh, 'start'], [p.x + rg + 4, p.y + 0.5 * hh, 'start'],
        [p.x - rg - 4 - w, p.y - 1.5 * hh, 'start'], [p.x - rg - 4 - w, p.y + 0.5 * hh, 'start']];
      for (var rr = 22; rr <= 46; rr += 12) for (var ang = 0; ang < 8; ang++) {
        var an = ang * Math.PI / 4 - Math.PI / 2, cx = p.x + rr * Math.cos(an), cy = p.y + rr * Math.sin(an);
        tries.push([cx - w / 2, cy - hh / 2, 'lead']);
      }
      for (var i = 0; i < tries.length; i++) {
        var b = { x: tries[i][0], y: tries[i][1], w: w, h: hh };
        if (b.x < L + 2 || b.x + b.w > L + pw - 2 || b.y < T0 + 2 || b.y + b.h > T0 + ph - 2) continue;
        if (placed.some(function (o) { return overlaps(o, b); })) continue;
        if (golds.some(function (o) { return o !== p && overlaps({ x: o.x - keep, y: o.y - keep, w: 2 * keep, h: 2 * keep }, b); })) continue;
        placed.push(b);
        if (tries[i][2] === 'lead') {
          var lx = Math.max(b.x, Math.min(b.x + b.w, p.x)), ly = p.y < b.y ? b.y : b.y + b.h, d = Math.hypot(lx - p.x, ly - p.y);
          if (d > rg + 2) el('line', { x1: (p.x + (lx - p.x) * (rg + 1) / d).toFixed(1), y1: (p.y + (ly - p.y) * (rg + 1) / d).toFixed(1), x2: lx.toFixed(1), y2: ly.toFixed(1), stroke: C.gold, 'stroke-opacity': 0.7, 'stroke-width': 1 }, lab);
        }
        tx(lab, b.x, b.y + fs - 0.5, s0, withHalo({ fill: C.white, 'font-size': fs, 'font-weight': 700, stroke: C.panel }));
        return;
      }
    });
    MAP.cross = crossLayer(svg);
    MAP.pts = pts; MAP.geo = { W: W, H: H, L: L, pw: pw, T0: T0, ph: ph, X: X, Y: Y };
    holder.style.touchAction = zoomed ? 'none' : '';
    if (MAP.sel && !pts.some(function (p) { return p.row.sym === MAP.sel; })) MAP.sel = null;
    mapMark();
    var key = $('mapKey'); clear(key);
    key.hidden = !phone;
    if (phone) {
      key.appendChild(span('muted', 'Gold dots: '));
      rows.slice(0, GOLD_N).forEach(function (r, i) {
        var kb = elh('button', 'mk', ''); kb.type = 'button';
        kb.appendChild(span('mk-n', String(i + 1))); kb.appendChild(document.createTextNode(' ' + r.sym));
        kb.setAttribute('aria-label', 'Gold dot ' + (i + 1) + ': ' + r.sym + ', open its chart');
        kb.addEventListener('click', function (e) { openOv('stock', r.sym, '1D', null, e.detail > 0); });
        key.appendChild(kb);
      });
    }
    var zb = $('mapBar');
    Array.prototype.forEach.call(zb.querySelectorAll('[data-mz]'), function (bt) {
      var z = bt.getAttribute('data-mz');
      bt.disabled = z === 'reset' || z === 'out' ? !zoomed : false;
    });
    $('mapHint').textContent = zoomed ? 'Zoomed in · drag to move · ' + (HOVER ? 'double-click' : 'double-tap') + ' empty space or Reset for the whole map'
      : (HOVER ? 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom into a crowded patch' : 'Pinch to zoom into a crowded patch');
    var lg = $('lgM'); clear(lg);
    function item(cls, text) { var s1 = span('lg-i', ''); s1.appendChild(span(cls, '')); s1.appendChild(document.createTextNode(text)); return s1; }
    lg.appendChild(item('lg-dot', 'one ' + ADJ + ' stock (' + rows.length + ' in this view; same filters as the list above)'));
    lg.appendChild(item('lg-gold', 'the top ' + GOLD_N + ' outliers' + (phone ? ', numbered' : '')));
    lg.appendChild(item('lg-quad', 'rare and alone: very rare for the stock, and far from its peers'));
  }
  function mapPick(clientX, clientY, kind) {
    var g = MAP.geo; if (!g) return null;
    var rect = $('mapChart').getBoundingClientRect(), k = g.W / rect.width, x = (clientX - rect.left) * k, y = (clientY - rect.top) * k;
    var best = null, bestD = Infinity, bd = (kind === 'mouse' ? 10 : 18) * k;
    MAP.pts.forEach(function (p) { var d = Math.hypot(dotX(p) - x, dotY(p) - y) - (p.gold ? 2 : 0); if (d < bestD) { bestD = d; best = p; } });
    if (kind !== 'mouse' && MAP.sel) {
      var sp = null; MAP.pts.forEach(function (p) { if (p.row.sym === MAP.sel) sp = p; });
      if (sp && Math.hypot(dotX(sp) - x, dotY(sp) - y) <= bd) return sp;
    }
    return bestD <= bd ? best : null;
  }
  function dotX(p) { return p.dx != null ? p.dx : p.x; }
  function dotY(p) { return p.dy != null ? p.dy : p.y; }
  function mapMark() {
    var cr = MAP.cross; if (!cr) return;
    clear(cr);
    var sym = MAP.hov || MAP.sel, p = null;
    MAP.pts.forEach(function (q) { if (q.row.sym === sym) p = q; });
    if (p) {
      el('circle', { cx: dotX(p), cy: dotY(p), r: p.r + 4, fill: 'none', stroke: '#fff', 'stroke-width': 1.6 }, cr);
      if (!p.gold) el('circle', { cx: p.x, cy: p.y, r: p.r + 0.6, fill: C.light, stroke: C.bg, 'stroke-width': 1 }, cr);
    }
    mapReadout(p);
  }
  function mapReadout(p) {
    var ro = $('mapRo'); clear(ro);
    if (!p) {
      var n = MAP.pts.length;
      ro.appendChild(span('d', n + ' ' + ADJ + ' stocks' + (MAP.view ? ' in this zoomed view' : '') + '. '));
      ro.appendChild(document.createTextNode('The further up and to the right, the bigger the outlier. Gold = the top ' + GOLD_N + ' by outlier score. ' + cap(TAP) + ' a dot to read it here' + (HOVER ? ', click to open its chart.' : '; tap it again to open its chart.')));
      return;
    }
    var r = p.row;
    ro.appendChild(span('muted', '#' + r.rank + ' '));
    ro.appendChild(span('ro-sym' + (p.gold ? '' : ' p'), r.sym));
    ro.appendChild(document.createTextNode((r.name ? ' ' + shortName(r.name, r.sym) : '') + ' · score '));
    ro.appendChild(span('d', String(r.score)));
    ro.appendChild(document.createTextNode(' · ' + r.words.rare + ' · ' + r.words.crowd + ' · ' + r.words.price + ' '));
    var b = elh('button', 'st-btn ro-open', 'Open ' + r.sym + ' chart ›'); b.type = 'button';
    b.addEventListener('click', function (e) { openOv('stock', r.sym, '1D', '#mapChart', e.detail > 0); });
    ro.appendChild(b);
  }
  function initMap() {
    var h = $('mapChart'), ptrs = {}, mode = null, g0 = null, down = null, lastTap = null;
    h.tabIndex = 0;
    function svgXY(cx, cy) { var g = MAP.geo, rect = h.getBoundingClientRect(), k = g.W / rect.width; return { x: (cx - rect.left) * k, y: (cy - rect.top) * k, k: k }; }
    function list() { return Object.keys(ptrs).map(function (k) { return ptrs[k]; }); }
    function onEmpty(cx, cy, type) { return !mapPick(cx, cy, type); }
    h.addEventListener('pointerdown', function (e) {
      if (!MAP.geo || (e.pointerType === 'mouse' && e.button !== 0)) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), type: e.pointerType };
      var n = Object.keys(ptrs).length;
      try { h.setPointerCapture(e.pointerId); } catch (er) { }
      if (n === 1) { mode = 'pending'; down = ptrs[e.pointerId]; g0 = { view: MAP.view || MAP.full }; }
      else if (n === 2) {
        var q = list(), m = svgXY((q[0].x + q[1].x) / 2, (q[0].y + q[1].y) / 2);
        mode = 'pinch'; down = null;
        g0 = { view: MAP.view || MAP.full, dist: Math.max(24, Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y)), mx: m.x, my: m.y };
      }
      if (e.pointerType === 'mouse') e.preventDefault();
    });
    h.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId];
      if (!p) {
        if (e.pointerType !== 'mouse') return;
        var hp = mapPick(e.clientX, e.clientY, 'mouse'), s0 = hp ? hp.row.sym : null;
        h.style.cursor = hp ? 'pointer' : MAP.view ? 'grab' : 'default';
        if (s0 !== MAP.hov) { MAP.hov = s0; mapMark(); }
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      if (mode === 'pinch') {
        var q = list(); if (q.length < 2) return;
        var d = Math.max(24, Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y));
        mapZoomAt(g0.dist / d, g0.mx, g0.my, g0.view);
        return;
      }
      if (mode === 'pending') {
        var slop = p.type === 'mouse' ? 3 : 8;
        if (Math.abs(p.x - p.sx) < slop && Math.abs(p.y - p.sy) < slop) return;
        mode = MAP.view ? 'pan' : 'none';
        if (mode === 'pan') h.classList.add('dragging');
      }
      if (mode === 'pan') { var k = svgXY(0, 0).k; mapPanBy((p.x - p.sx) * k, (p.y - p.sy) * k, g0.view); }
    });
    function end(e, cancelled) {
      var p = ptrs[e.pointerId]; if (!p) return;
      delete ptrs[e.pointerId];
      var n = Object.keys(ptrs).length;
      if (!cancelled && mode === 'pending' && down === p && performance.now() - p.t < 700) {
        var t = performance.now(), pk = mapPick(e.clientX, e.clientY, p.type);
        if (p.type !== 'mouse' && !pk && lastTap && t - lastTap < 350) { lastTap = null; if (MAP.view) mapSetView(null); }
        else if (!pk) { lastTap = t; if (p.type !== 'mouse' && MAP.sel) { MAP.sel = null; mapMark(); } }
        else if (p.type === 'mouse' || MAP.sel === pk.row.sym) openOv('stock', pk.row.sym, '1D', '#mapChart', true);
        else { MAP.sel = pk.row.sym; mapMark(); }
      }
      if (n === 1 && mode === 'pinch') { var r = list()[0]; r.sx = r.x; r.sy = r.y; mode = MAP.view ? 'pan' : 'none'; g0 = { view: MAP.view || MAP.full }; }
      else if (n === 0) { mode = null; down = null; h.classList.remove('dragging'); }
    }
    h.addEventListener('pointerup', function (e) { end(e, false); });
    h.addEventListener('pointercancel', function (e) { end(e, true); });
    h.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs[e.pointerId] && MAP.hov) { MAP.hov = null; mapMark(); } });
    h.addEventListener('dblclick', function (e) { if (onEmpty(e.clientX, e.clientY, 'mouse') && MAP.view) { e.preventDefault(); mapSetView(null); } });
    h.addEventListener('wheel', function (e) {
      if (!MAP.geo || !(e.ctrlKey || e.metaKey || e.altKey)) return;
      var q = svgXY(e.clientX, e.clientY), dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      e.preventDefault();
      mapZoomAt(Math.max(0.55, Math.min(1.8, Math.exp(Math.max(-300, Math.min(300, dy)) * (e.ctrlKey ? 0.01 : 0.0015)))), q.x, q.y);
    }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach(function (t) { h.addEventListener(t, function (e) { e.preventDefault(); }); });
    h.addEventListener('keydown', function (e) {
      if (!MAP.pts.length) return;
      var order = MAP.pts.slice().sort(function (a, b) { return a.row.rank - b.row.rank; });
      var i = -1; order.forEach(function (p, j) { if (p.row.sym === MAP.sel) i = j; });
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); MAP.sel = order[Math.min(order.length - 1, i + 1)].row.sym; mapMark(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); MAP.sel = order[Math.max(0, i - 1)].row.sym; mapMark(); }
      else if ((e.key === 'Enter' || e.key === ' ') && MAP.sel) { e.preventDefault(); openOv('stock', MAP.sel, '1D', '#mapChart', false); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); mapZoomAt(1 / ZOOM_STEP, MAP.geo.L + MAP.geo.pw / 2, MAP.geo.T0 + MAP.geo.ph / 2); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); mapZoomAt(ZOOM_STEP, MAP.geo.L + MAP.geo.pw / 2, MAP.geo.T0 + MAP.geo.ph / 2); }
      else if (e.key === '0') { e.preventDefault(); mapSetView(null); }
      else if (e.key === 'Escape' && MAP.sel) { MAP.sel = null; mapMark(); }
    });
    Array.prototype.forEach.call($('mapBar').querySelectorAll('[data-mz]'), function (bt) {
      bt.addEventListener('click', function () {
        var z = bt.getAttribute('data-mz'), g = MAP.geo; if (!g) return;
        if (z === 'reset') mapSetView(null);
        else mapZoomAt(z === 'in' ? 1 / ZOOM_STEP : ZOOM_STEP, g.L + g.pw / 2, g.T0 + g.ph / 2);
      });
    });
    h.setAttribute('aria-label', sw('Fear map: each scared stock by how rare its fear is', 'Bull map: each bullish stock by how rare its bullish mood is') + ' and how alone it is among its peers. Arrow keys step through the stocks by rank, Enter opens one, plus and minus zoom, 0 shows the whole map.');
  }

  var CKS = [['all', 'All', 'All'], ['Sector', 'Sectors', 'Sectors'], ['Industry', 'Industries', 'Industries'], ['Index', 'Indexes', 'Indexes'], ['Theme', 'Themes', 'Themes']];
  function renderCrowdChips() {
    var cnt = { all: GROUPS.length };
    GROUPS.forEach(function (g) { cnt[g.kind] = (cnt[g.kind] || 0) + 1; });
    segButtons($('cKind'), CKS, CK, 'data-ck', cnt, function (k) { if (k === CK) return; CK = k; CALL = false; store(PFX + 'Crowd', k); renderCrowdChips(); renderCrowds(); });
  }
  function spark(daily) {
    var vals = [];
    for (var k = daily.length - 1; k >= 0; k -= 5) vals.unshift(daily[k]);
    var W = 140, H = 36, n = vals.length, svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'class': 'spk', 'aria-hidden': 'true', preserveAspectRatio: 'none' });
    if (!n) return svg;
    var X = function (i) { return 1 + i / (n - 1) * (W - 6); }, Y = function (v) { return H - 2 - Math.max(0, Math.min(100, v / 10)) / 100 * (H - 5); };
    el('line', { x1: 0, x2: W, y1: Y(0) + 0.5, y2: Y(0) + 0.5, stroke: C.line, 'stroke-width': 1 }, svg);
    var d = '';
    for (var i = 0; i < n; i++) if (vals[i] != null) d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(vals[i]).toFixed(1);
    el('path', { d: d + 'L' + X(n - 1).toFixed(1) + ' ' + Y(0).toFixed(1) + 'L' + X(0).toFixed(1) + ' ' + Y(0).toFixed(1) + 'Z', fill: C.fear, 'fill-opacity': 0.35 }, svg);
    el('path', { d: d, fill: 'none', stroke: C.fear, 'stroke-width': 1.2, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
    el('rect', { x: X(n - 1) - 1.6, y: Y(vals[n - 1]) - 1.6, width: 3.2, height: 3.2, rx: 1.6, fill: '#fff' }, svg);
    return svg;
  }
  function renderCrowds() {
    var list = GROUPS.filter(function (g) { return CK === 'all' || g.kind === CK; });
    var shown = CK === 'all' && !CALL ? list.slice(0, CROWD_N) : list;
    var t = $('cTable'); clear(t);
    var cap0 = document.createElement('caption'); cap0.className = 'vh'; cap0.textContent = cap(ADJ) + ' crowds, ranked'; t.appendChild(cap0);
    var th = t.createTHead().insertRow();
    [['Crowd', 'c-name'], [cap(ADJ) + ' now', 'c-pct'], ['Vs its own days', 'c-top'], ['Vs the market', 'c-gap'], ['Last year', 'c-spk'], [CPON ? 'Calls : puts · Business' : 'Business', 'c-duo']].forEach(function (c) {
      var h = document.createElement('th'); h.className = c[1]; h.scope = 'col';
      var b = elh('div', 'b-sort'); b.appendChild(span('', c[0])); h.appendChild(b); th.appendChild(h);
    });
    var tb = t.createTBody();
    shown.forEach(function (g) {
      var tr = tb.insertRow(); tr.className = 'b-row' + (g.id === 'index_sp500' ? ' sp' : ''); tr.setAttribute('data-gid', g.id);
      var c0 = tr.insertCell(); c0.className = 'c-name';
      var ob = elh('button', 'b-open'); ob.type = 'button'; ob.setAttribute('data-gid', g.id);
      ob.setAttribute('aria-label', g.full + ': open its ' + NOUN + ' meter');
      ob.appendChild(span('b-rank', '#' + g.rank)); ob.appendChild(span('g-name', g.name));
      c0.appendChild(ob);
      var meta = span('g-meta', ''); meta.appendChild(span('tag tag-k', g.kind));
      meta.appendChild(document.createTextNode(commas(g.n) + ' stocks' + (g.full && g.full !== g.name ? ' · ' + g.full : '')));
      c0.appendChild(meta);
      var c1 = tr.insertCell(); c1.className = 'c-pct';
      c1.appendChild(span('g-pct', pct1(g.pct['1D'])));
      c1.appendChild(span('g-zone', g.zone || zoneOf(g.pct['1D'])));
      var pb = span('pbar', ''), pf = span('pfill', ''); pf.style.width = Math.min(100, g.pct['1D']) + '%'; pb.appendChild(pf); c1.appendChild(pb);
      var tfw = ADJ + ' on weekly ' + pctShort(g.pct['1W']) + ' · 2-week ' + pctShort(g.pct['2W']) + ' · monthly ' + pctShort(g.pct['1M']);
      c1.appendChild(span('wd-2 g-tfs', tfw));
      var c2 = tr.insertCell(); c2.className = 'c-top';
      c2.appendChild(span('wd', topWords(g)));
      c2.appendChild(span('wd-2 g-tfs2', tfw));
      var c3 = tr.insertCell(); c3.className = 'c-gap';
      if (g.id === 'index_sp500') c3.appendChild(span('wd', 'the market itself'));
      else {
        var gv = Math.round(g.gap_vs_sp);
        c3.appendChild(span('g-gap' + (gv > 0 ? ' pos' : ''), gv === 0 ? '±0 pts' : (gv > 0 ? '+' : '−') + Math.abs(gv) + (Math.abs(gv) === 1 ? ' pt' : ' pts')));
        c3.appendChild(span('wd-2', gv === 0 ? 'same as the ' + SPM : (gv > 0 ? 'above' : 'below') + ' the ' + SPM));
      }
      var ew = span('wd-2 g-ew', ''); ew.appendChild(span('k', 'basket')); ew.appendChild(document.createTextNode(' '));
      var a = span('nw', ''); a.appendChild(chgSpan(g.ew1d)); a.appendChild(span('k', ' today')); ew.appendChild(a);
      ew.appendChild(document.createTextNode(' ')); ew.appendChild(span('k', '·')); ew.appendChild(document.createTextNode(' '));
      var b2 = span('nw', ''); b2.appendChild(chgSpan(g.ew1m)); b2.appendChild(span('k', ' this month')); ew.appendChild(b2);
      c3.appendChild(ew);
      var c4 = tr.insertCell(); c4.className = 'c-spk'; c4.appendChild(spark(g.spark || []));
      var c6 = tr.insertCell(); c6.className = 'c-duo'; c6.appendChild(duo(g.cp, g.biz, true));
    });
    var more = $('cMore');
    if (CK === 'all' && list.length > CROWD_N) { more.hidden = false; more.textContent = CALL ? 'Show the top ' + CROWD_N + ' only' : 'Show all ' + list.length + ' crowds'; }
    else more.hidden = true;
    var lg = $('lgC'); clear(lg);
    function item(cls, text) { var s0 = span('lg-i', ''); if (cls) s0.appendChild(span(cls, '')); s0.appendChild(document.createTextNode(text)); return s0; }
    lg.appendChild(item('lg-area', '% of the crowd’s stocks ' + ADJ + ', the last year (weekly steps)'));
    lg.appendChild(item('', 'Ranked by how today ranks among the crowd’s own days since 2013, then by the gap to the ' + SPM + ' · basket = equal weight of its stocks · ' + CLICK + ' a crowd for its meter on 4 candle sizes'));
    lg.appendChild(item(CPON ? 'lg-cp' : '', (CPON ? 'Calls : puts = the option contracts its stocks hold, added up · ' : '') + 'Business = the median business score of its stocks'));
  }

  var FCOLS = [
    { k: 'rank', l: '#', v: function (r) { return r.rank; }, f: function (r) { return String(r.rank); }, dir: 1, ph: 'off' },
    { k: 'sym', l: 'Stock', v: function (r) { return r.sym; }, dir: 1, cls: 'l sym', ph: 'hd' },
    { k: 'name', l: 'Name', v: function (r) { return r.name || ''; }, f: function (r) { return shortName(r.name, r.sym); }, dir: 1, cls: 'l nm', ph: 'off' },
    { k: 'ind', l: 'Sector · industry', v: function (r) { return r.industry || r.sector_name || ''; }, f: function (r) { return r.industry || r.sector_name || ''; }, dir: 1, cls: 'l nm', ph: 'off' },
    { k: 'score', l: 'Score', v: function (r) { return r.score; }, f: function (r) { return String(r.score); }, dir: -1, cls: 'sc0', ph: 'hd' },
    { k: 'fpct', l: sw('Fear %', 'Bull %'), v: function (r) { return r[K.val]; }, f: function (r) { return pct1(r[K.val]); }, dir: -1 },
    { k: 'R', l: 'Rare (days)', v: function (r) { return r.R; }, f: function (r) { return String(+(r.R * 100).toPrecision(2)) + '%'; }, dir: 1, pl: 'rare (days)' },
    { k: 'since', l: 'Since', v: function (r) { return r.base; }, f: function (r) { return r.base.slice(0, 4); }, dir: 1, ph: 'off' },
    { k: 'R1w', l: 'Rare (weeks)', v: function (r) { return r.R1w; }, f: function (r) { return r.R1w == null ? '–' : (r.R1w * 100).toFixed(1) + '%'; }, dir: 1, ph: 'off' },
    { k: 'last', l: 'Last this ' + ADJ, v: function (r) { return r[K.prev] || '0000'; }, f: function (r) { return r[K.prev] ? fmtMonYear(dayNum(r[K.prev])) : 'not since ' + r.base.slice(0, 4); }, dir: 1, ph: 'off' },
    { k: 'peer', l: 'Peers ' + ADJ, v: function (r) { return r.peer[K.pct]; }, f: function (r) { return (r.peer.k != null ? r.peer.k + '/' + r.peer.n : pctShort(r.peer[K.pct])) + (r.peer.level !== 'industry' ? ' (' + (r.peer.level === 'theme' ? themeShort(r.peer.name) : r.peer.level) + ')' : ''); }, dir: 1, pl: 'peers ' + ADJ },
    { k: 'gap', l: 'Peer gap', v: function (r) { return r.gap; }, f: function (r) { return gapNum(r.gap); }, dir: -1, pl: 'peer gap' },
    { k: 'spct', l: '5-day pctl', v: function (r) { return r.speed ? r.speed.pct : null; }, f: function (r) { return r.speed && r.speed.pct != null ? pctShort(r.speed.pct) : '–'; }, dir: 1, ph: 'off' },
    { k: 'calm', l: sw('Days since calm', 'Days since quiet'), v: function (r) { return r.speed ? r.speed[K.since] : null; }, f: function (r) { return r.speed && r.speed[K.since] != null ? String(r.speed[K.since]) : '–'; }, dir: 1, ph: 'off' },
    { k: 'dots', l: 'D W 2W M', v: function (r) { return TFS.filter(function (k) { return r.dots[DOT_KEY[k]]; }).length; }, f: function (r) { return TFS.map(function (k) { return r.dots[DOT_KEY[k]] ? '●' : '○'; }).join(''); }, dir: -1, cls: 'dots yes', pl: 'D W 2W M' },
    { k: 'chg1d', l: '1D', v: function (r) { return r.chg1d; }, f: function (r) { return signedPct(r.chg1d, 1); }, dir: -DIR, ud: true },
    { k: 'chg1m', l: '1M', v: function (r) { return r.chg1m; }, f: function (r) { return signedPct(r.chg1m, 1); }, dir: -DIR, ud: true },
    { k: 'hi', l: 'Off 52w high', v: function (r) { return r.below_hi52; }, f: function (r) { var x = r.below_hi52; return x == null ? '–' : x === 0 ? 'at high' : '−' + offHigh(x) + '%'; }, dir: DIR, pl: 'off high' },
    { k: 'biz', l: 'Business', v: function (r) { return r.business ? r.business.score : null; }, f: function (r) { return r.business ? r.business.score + ' ' + r.business.word : '—'; }, dir: -1, pl: 'business' },
    { k: 'cpsh', l: 'Calls share', v: function (r) { return r.cp ? r.cp.call_share : null; }, f: function (r) { return r.cp ? shareNum(r.cp) + ' · ' + r.cp.words.ratio + ' · ' + kf(r.cp.calls + r.cp.puts) + ' held' : 'no options data'; }, dir: -1, pl: 'calls share' },
    { k: 'puts', l: 'Put build', v: function (r) { return r.puts ? 1 : 0; }, f: function (r) { return r.puts || '–'; }, dir: -1, ph: 'off' },
    { k: 'calls', l: 'Call build', v: function (r) { return r.calls ? 1 : 0; }, f: function (r) { return r.calls || '–'; }, dir: -1, ph: 'off' },
    { k: 'heavy', l: sw('Heavy sell', 'Heavy buy'), v: function (r) { return r.heavy ? dayNum(r.heavy.date) : null; }, f: function (r) { return r.heavy ? fmtDay(dayNum(r.heavy.date)) + ' · ' + signedPct(r.heavy.move, 1) : '–'; }, dir: -1, ph: 'off' },
    { k: 'kinds', l: 'Kinds', v: function (r) { return r.kinds.join(' '); }, f: function (r) { return r.kinds.map(function (k) { return k === 'crowd' ? 'with the crowd' : k; }).join(', ') || '–'; }, dir: 1, cls: 'l', ph: 'off' }];
  var WORSE = sw('scared or worse', 'bullish or more');
  var FTIPS = { rank: 'Outlier rank', R: 'Share of its own days since 2013 (or since its history starts) this ' + WORSE, R1w: 'Share of its own weekly candles this ' + WORSE,
    peer: 'Its peers on the board that are ' + ADJ + ': its industry, or its AI / Semis / Neocloud crowd when that one is more ' + ADJ,
    gap: sw('Its fear % minus the fear % of the middle stock of its peers (a calm stock reads 0%), in points', 'Its bull % minus the bull % of the middle stock of its peers (a quiet stock reads 0%), in points'),
    last: sw('Before this drop', 'Before this rise') + ', the last day it was this ' + WORSE,
    spct: 'Share of its own 5-day mood changes since 2013 this big a ' + sw('drop', 'rise') + ' or bigger', calm: sw('Sessions since its mood was last calm', 'Sessions since its mood was last quiet'),
    dots: cap(ADJ) + ' on daily, weekly, 2-week and monthly candles', hi: 'Below its highest close of the last 52 weeks',
    biz: 'The 200W business score, 0–100: 70+ strong, 50–69 middling, under 50 weak', cpsh: 'Calls’ share of the option contracts held (every strike, every expiry still open), with calls : puts and how many contracts are held',
    puts: 'Put open interest building on one side (1D or 1W window)', calls: 'Call open interest building on one side (1D or 1W window)',
    heavy: sw('A recent down day', 'A recent up day') + ' on heavy volume' };
  if (BULL) (function () {
    var ip = -1, ic = -1; FCOLS.forEach(function (c, i) { if (c.k === 'puts') ip = i; if (c.k === 'calls') ic = i; });
    var t = FCOLS[ip]; FCOLS[ip] = FCOLS[ic]; FCOLS[ic] = t;
  })();
  var FSORT = [['score', 'Score', -1], ['R', 'Rarest', 1], ['gap', 'Most alone', -1], ['chg1m', sw('1M drop', '1M rise'), -DIR], ['biz', 'Business', -1], ['cpsh', 'Calls share', -1]];
  function renderFullSummary() { $('fullSum').textContent = 'Full table · all ' + ROWS.length + ' ' + ADJ + ' stocks with every number'; }
  function renderFull() {
    FT.built = true;
    var col = FCOLS.filter(function (c) { return c.k === FT.key; })[0] || FCOLS[0], d = FT.dir, q = FT.q.trim();
    var rows = ROWS.filter(function (r) { return passQ(r, q); }).map(function (r, i) { return { r: r, i: i, v: col.v(r) }; }).sort(function (a, b) {
      var an = a.v == null, bn = b.v == null;
      if (an || bn) return an && bn ? a.i - b.i : an ? 1 : -1;
      if (a.v < b.v) return -d; if (a.v > b.v) return d; return a.i - b.i;
    }).map(function (o) { return o.r; });
    var shown = q || FT.all ? rows : rows.slice(0, FULL_N);
    var phoneT = !!(window.matchMedia && matchMedia('(max-width: 719px)').matches);
    $('fCount').textContent = (q ? rows.length + ' of ' + ROWS.length + ' match' : shown.length < rows.length ? 'first ' + shown.length + ' of ' + rows.length : 'all ' + rows.length) + ' · ' + (phoneT ? CLICK + ' a chip to sort' : CLICK + ' a header to sort');
    var fs = $('fSort'); clear(fs);
    FSORT.forEach(function (o) {
      var b = elh('button', '', o[1]); b.type = 'button';
      b.setAttribute('aria-pressed', String((FT.key === o[0] || (o[0] === 'score' && FT.key === 'rank' && FT.dir === 1)) && (FT.key === 'rank' || FT.dir === o[2])));
      b.addEventListener('click', function () { FT.key = o[0]; FT.dir = o[2]; renderFull(); });
      fs.appendChild(b);
    });
    var t = $('fTable'); clear(t);
    var th = t.createTHead().insertRow();
    FCOLS.forEach(function (c) {
      var h = document.createElement('th'); h.scope = 'col'; if (/\bl\b/.test(c.cls || '')) h.className = 'l';
      var on = FT.key === c.k;
      h.setAttribute('aria-sort', on ? (FT.dir === 1 ? 'ascending' : 'descending') : 'none');
      var b = elh('button', 'b-sort' + (on ? ' on' : '')); b.type = 'button'; if (FTIPS[c.k]) b.title = FTIPS[c.k];
      b.appendChild(span('', c.l)); b.appendChild(span('b-arr', on ? (FT.dir === 1 ? '▲' : '▼') : ''));
      b.addEventListener('click', function () { if (FT.key === c.k) FT.dir = -FT.dir; else { FT.key = c.k; FT.dir = c.dir; } renderFull(); var nb = $('fTable').querySelector('thead th:nth-child(' + (FCOLS.indexOf(c) + 1) + ') button'); if (nb) nb.focus(); });
      h.appendChild(b); th.appendChild(h);
    });
    var tb = t.createTBody();
    shown.forEach(function (r) {
      var tr = tb.insertRow(); tr.setAttribute('data-sym', r.sym);
      FCOLS.forEach(function (c) {
        var td = tr.insertCell(), txt = c.f ? c.f(r) : String(c.v(r));
        td.className = (c.cls || '') + (c.ph === 'off' ? ' ph-off' : '');
        if (c.k === 'sym') {
          td.className += ' hd';
          var b = elh('button', '', r.sym); b.type = 'button'; b.setAttribute('aria-label', r.sym + ': open its own ' + NOUN + ' chart');
          td.appendChild(b);
          var m = span('muted ph-only', ' #' + r.rank + ' · score ' + r.score); td.appendChild(m);
          return;
        }
        if (c.ph === 'hd') td.className += ' ph-off';
        if (c.ud) { var v = c.v(r); td.appendChild(span(v == null ? 'muted' : v >= 0 ? 'up' : 'down', txt)); }
        else td.textContent = txt;
        if (c.ph !== 'off') td.setAttribute('data-l', c.pl || c.l);
        if (c.k === 'heavy' && r.heavy) td.title = r.words.heavy;
        if (c.k === 'cpsh') { td.title = cpTip(r.cp, false, r.cp_none); td.className += ' cpsh' + (r.cp ? '' : ' muted'); }
      });
    });
    var more = $('fMore');
    if (!q && rows.length > FULL_N) { more.hidden = false; more.textContent = FT.all ? 'Show the first ' + FULL_N + ' only' : 'Show all ' + rows.length; }
    else more.hidden = true;
  }

  function renderFoot() {
    var box = $('footDefs'); clear(box);
    (OUT.definitions || []).forEach(function (d) { if (d.k === 'vintage') return; box.appendChild(elh('p', '', d.text)); });
    ((OUT.context || {}).defs || []).forEach(function (d) { box.appendChild(elh('p', '', d.text)); });
    box.appendChild(elh('p', '', 'A crowd’s meter = the share of its stocks that are ' + ADJ + '. Gold dots on a chart = that stock’s (or crowd’s) own top 1% of readings.'));
    var v = OUT.meta.vintage || {}, defV = (OUT.definitions || []).filter(function (d) { return d.k === 'vintage'; })[0];
    var p = $('footVintage'); clear(p);
    p.appendChild(elh('b', '', 'Data: ' + (defV ? defV.text : OUT.meta.session_words) + '. '));
    var cv = (OUT.context || {}).vintage || {};
    p.appendChild(document.createTextNode(['Prices: ' + v.bars, sw('S&P 500 meter: ', 'S&P 500: ') + v.sp500].concat(cv.options ? [cv.options] : [], ['options builds: ' + v.skew, 'business score: ' + v.biz,
      'sectors: ' + v.sectors, 'industries: ' + v.industries]).join(' · ') + '.'));
  }

  var OV = { kind: null, id: null, tf: '1D', chip: '2Y', userChip: null, view: { chip: '2Y', x0: 0, x1: 0, custom: false }, T: null, err: null, want: 0, opener: null };
  function chipFor(tf) { return OV.userChip || (tf === '1D' ? '2Y' : 'All'); }
  var FS = { open: false, y: 0, pushed: false, depth: 0, pendingBack: false, back: 0, at: -1e9, sr: null };
  var OV_MIN_SPAN = { '1D': 14, '1W': 56, '2W': 112, '1M': 240 };
  var OV_LW = { '1W': 1.3, '2W': 1.5, '1M': 1.7 };
  var OV_LAB_GAP = { '1D': 0.057, '1W': 0.057, '2W': 0.043, '1M': 0.095 };
  function normTf(s) { var u = String(s || '').trim().toUpperCase(); return TFS.indexOf(u) >= 0 ? u : null; }
  function alignTo(idx, e) { if (!idx) return null; var any = false, out = e.map(function (dn) { var v = idx[dn]; if (v != null) any = true; return v == null ? null : v; }); return any ? out : null; }
  function groupIdx(gd, tf) {
    if (!gd) return null;
    var key = '_ix' + tf;
    if (!gd[key]) gd[key] = tf === '1D' ? idxOf(gd.daily.d, gd.daily.v) : gd.tf[tf] ? idxOf(gd.tf[tf].e, gd.tf[tf].v) : null;
    return gd[key];
  }
  function ovPrepare() {
    OV.T = null;
    var tf = OV.tf;
    if (!REF) return;
    if (OV.kind === 'stock') {
      var x = SDOC[OV.id]; if (!x) return;
      var b = x.tf[tf]; if (!b || !Array.isArray(b.f) || !b.f.length) { OV.err = OV.id + ' has no ' + TF_WORD[tf] + ' candles yet.'; return; }
      var s, e;
      if (tf === '1D') { s = e = x._d; } else { s = b.s.map(dayNum); e = b.e.map(dayNum); }
      var f0 = 0; while (f0 < b.f.length && b.f[f0] == null) f0++;
      if (f0 >= b.f.length) { OV.err = OV.id + ' is too young for ' + TF_WORD[tf] + ' candles.'; return; }
      var pm = x.peer_meter, peer = null;
      if (pm && tf === '1D' && Array.isArray(pm.v)) peer = pm.v.map(function (t) { return t == null ? null : t / 10; });
      else if (pm && pm.id && GDOC[pm.id]) peer = alignTo(groupIdx(GDOC[pm.id], tf), e);
      var nHist = b.f.length - 1 - f0, enough = nHist >= GOLD_MIN, pk0 = enough ? (b.pk || []) : [], isPk = {};
      pk0.forEach(function (i) { isPk[i] = 1; });
      OV.T = { kind: 'stock', d: x._d, c: x.daily.c || null, s: s, e: e, v: b.f, pk: pk0, isPk: isPk, p99: enough ? b.p99 : null, few: !enough, peer: peer, sp: alignTo(REFIDX[tf], e),
        peerName: pm ? pm.name : null, first: e[f0], last: e[e.length - 1], open: !!OPEN[tf] };
    } else {
      var gd = GDOC[OV.id]; if (!gd) return;
      var s2, e2, v, n;
      if (tf === '1D') { s2 = e2 = gd.daily.d.map(dayNum); v = gd.daily.v; n = gd.daily.n; }
      else { var tb = gd.tf[tf]; if (!tb) { OV.err = 'No ' + TF_WORD[tf] + ' candles for this crowd.'; return; } s2 = tb.s.map(dayNum); e2 = tb.e.map(dayNum); v = tb.v; n = tb.n; }
      v = v.map(function (t) { return t == null ? null : t / 10; });
      var hist = v.slice(0, -1).filter(function (a) { return a != null; }).sort(function (a, b2) { return a - b2; });
      var p99 = hist.length >= GOLD_MIN ? hist[Math.min(hist.length - 1, Math.floor(0.99 * hist.length))] : null, pk = [], isPk2 = {};
      if (p99 != null) v.forEach(function (a, i) { if (a != null && a > 0 && a >= p99) { pk.push(i); isPk2[i] = 1; } });
      OV.T = { kind: 'group', d: null, c: null, s: s2, e: e2, v: v, n: n, pk: pk, isPk: isPk2, p99: p99, peer: null, alarm: gd.alarm ? gd.alarm[tf] : null,
        sp: OV.id === 'index_sp500' ? null : alignTo(REFIDX[tf], e2), first: e2[0], last: e2[e2.length - 1], open: !!OPEN[tf] };
    }
  }
  function ovPad(span) { return Math.max(1, span * 0.02); }
  function ovHi(span) { return OV.T.last + ovPad(span); }
  function ovLatestSpan(x0) { var b = OV.T.last - x0; return b * 0.02 / 0.98 >= 1 ? b / 0.98 : b + 1; }
  function ovLimits() { var mx = ovLatestSpan(OV.T.first); return { min: Math.min(OV_MIN_SPAN[OV.tf], mx), max: mx }; }
  function ovClamp(v) {
    var lim = ovLimits(), x0 = v.x0, x1 = v.x1, span = Math.max(lim.min, Math.min(lim.max, x1 - x0));
    if (Math.abs(span - (x1 - x0)) > 1e-9) { var c = (x0 + x1) / 2; x0 = c - span / 2; x1 = c + span / 2; }
    var hi = ovHi(span);
    if (x1 > hi) { x0 -= x1 - hi; x1 = hi; }
    if (x0 < OV.T.first) { x1 += OV.T.first - x0; x0 = OV.T.first; }
    return { chip: v.chip, custom: v.custom, x0: x0, x1: x1 };
  }
  function ovToLatest(v, x0) { return ovClamp({ chip: v.chip, custom: v.custom, x0: x0, x1: x0 + ovLatestSpan(x0) }); }
  function ovRangeView(chip) {
    var x0 = chip === 'All' ? OV.T.first : Math.max(OV.T.first, monthsBack(OV.T.last, RANGE_MONTHS[chip]));
    return ovToLatest({ chip: chip, custom: false }, x0);
  }
  function ovAtLatest(v) { return v.x1 >= ovHi(v.x1 - v.x0) - 0.01; }
  function ovKeepRight(v) { var s = v.x1 - v.x0, x1 = ovHi(s); return ovClamp({ chip: v.chip, custom: v.custom, x0: x1 - s, x1: x1 }); }
  function ovZoom(v, c, f, stick) {
    var lim = ovLimits(), s = v.x1 - v.x0, ns = Math.max(lim.min, Math.min(lim.max, s * f));
    if (Math.abs(ns - s) < 1e-6) return v;
    var x0 = c - (c - v.x0) * ns / s, nv = ovClamp({ chip: v.chip, custom: true, x0: x0, x1: x0 + ns });
    return (stick && nv.x1 >= OV.T.last) ? ovKeepRight(nv) : nv;
  }
  function ovPan(v, dd) { return ovClamp({ chip: v.chip, custom: true, x0: v.x0 + dd, x1: v.x1 + dd }); }
  function ovSet(nv) {
    if (!OV.T) return false;
    if (nv.custom && sameWindow(nv, ovRangeView(nv.chip))) nv = ovRangeView(nv.chip);
    if (sameWindow(nv, OV.view) && nv.custom === OV.view.custom && nv.chip === OV.view.chip) return false;
    OV.view = nv; ovRequest(); return true;
  }
  function ovCmd(z) {
    if (!OV.T) return;
    var v = OV.view, latest = ovAtLatest(v);
    if (z === 'in' || z === 'out') ovSet(ovZoom(v, latest ? OV.T.last : (v.x0 + v.x1) / 2, z === 'in' ? 1 / ZOOM_STEP : ZOOM_STEP, latest));
    else if (z === 'reset') ovSet(ovRangeView(v.chip));
    else if (z === 'today') ovSet(ovKeepRight(v));
  }
  var ovCtl = { view: function () { return OV.view; }, set: ovSet, limits: ovLimits, clamp: ovClamp, keepRight: ovKeepRight,
    atLatest: ovAtLatest, pan: ovPan, zoom: ovZoom, reset: function () { ovCmd('reset'); }, cmd: ovCmd,
    xs: function () { return OV.T ? OV.T.e : []; }, last: function () { return OV.T ? OV.T.last : 0; } };
  function ovSpanWords() {
    var T = OV.T, v = OV.view, nb = function (str) { return str.replace(/ /g, ' '); };
    if (!v.custom) {
      var f = dnDate(T.s[0]), since = 'since ' + (f.getUTCMonth() === 0 ? f.getUTCFullYear() : fmtMonYear(T.s[0]));
      return v.chip === 'All' || monthsBack(T.last, RANGE_MONTHS[v.chip]) <= T.first ? since : RANGE_WORDS[v.chip];
    }
    var a = T.e[Math.min(T.e.length - 1, lowerBound(T.e, v.x0))], b = T.e[Math.max(0, bsearchLE(T.e, v.x1))];
    if (b - a > 150) return fmtMonYear(a) === fmtMonYear(b) ? nb(fmtMonYear(a)) : nb(fmtMonYear(a)) + ' – ' + nb(fmtMonYear(b));
    return dnDate(a).getUTCFullYear() === dnDate(b).getUTCFullYear() ? nb(fmtDay(a, false)) + ' – ' + nb(fmtDay(b, true)) : nb(fmtDay(a, true)) + ' – ' + nb(fmtDay(b, true));
  }
  function nowWords(tf, T) {
    if (tf === '1D') return fmtDay(T.last);
    var j = T.s.length - 1;
    if (tf === '1W') return 'week of ' + fmtDay(T.s[j]) + (LIVE ? ' so far' : '');
    if (tf === '2W') return T.open ? '2 weeks so far' : '2 weeks to ' + fmtDay(T.last);
    return MON[dnDate(T.s[j]).getUTCMonth()] + (T.open ? ' so far' : '');
  }
  function candleWords(tf, T, j) {
    return tf === '1D' ? fmtDay(T.e[j], true, true) : tf === '1M' ? fmtMonYear(T.s[j]) : (tf === '1W' ? 'week of ' : '2 weeks from ') + fmtDay(T.s[j], true);
  }
  function pricePanel(svg, X, x0, x1, left, top, w, h, ticks, title) {
    var T = OV.T, g = el('g', {}, svg);
    panelRect(g, left, top, w, h);
    var vi = visIdx(T.d, x0, x1), lo = Infinity, hi = -Infinity, i;
    for (i = Math.max(0, vi.i0 - 1); i <= Math.min(T.d.length - 1, vi.i1 + 1); i++) if (T.c[i] != null) { lo = Math.min(lo, T.c[i]); hi = Math.max(hi, T.c[i]); }
    if (!(hi >= lo)) { lo = 0; hi = 1; }
    if (hi - lo < hi * 0.004) { var mid = (hi + lo) / 2; lo = mid * 0.998; hi = mid * 1.002; }
    var pad = (hi - lo) * 0.08, Y = lin(lo - pad, hi + pad, top + h - 4, top + 22);
    var step = niceStep(hi - lo, 3), yt = [];
    while (Math.abs(Y(0) - Y(step)) < 15 && step < hi) step *= 2;
    var c1000 = Math.round(step * 1000), dec = c1000 % 1000 === 0 ? 0 : c1000 % 100 === 0 ? 1 : c1000 % 10 === 0 ? 2 : 3;
    for (var v = Math.ceil((lo - pad) / step) * step; v <= hi + pad; v += step) yt.push(v);
    yTicks(g, Y, yt, left + w, left, function (x) { return x.toFixed(dec); }, 'right');
    timeGrid(g, X, ticks, top, top + h);
    var P = decimate(T.d, T.c, Math.max(0, bsearchLE(T.d, x0)), Math.min(T.d.length - 1, lowerBound(T.d, x1)), X);
    el('path', { d: pathOf(P, Y), fill: 'none', stroke: C.text, 'stroke-width': 1.1, 'stroke-linejoin': 'round', 'clip-path': clipFor(svg, left, top, w, h) }, g);
    Y.dots = el('g', {}, g);
    var ts = 12.5;
    tx(g, left + 8, top + 16, title, withHalo({ fill: C.text, 'font-size': ts }));
    return Y;
  }
  function labelWords(dn, long, phone) {
    var dd = dnDate(dn);
    if (phone) return long ? MON[dd.getUTCMonth()] + ' ’' + String(dd.getUTCFullYear()).slice(2) : fmtDay(dn, false);
    return long ? fmtMonYear(dn) : fmtDay(dn, false);
  }
  function drawOv(Wraw, H0) {
    var holder = $('ovChart'), T = OV.T;
    if (!T) { GEO.o = null; ovEmpty(holder); return; }
    var W = Math.max(300, Math.round(Wraw)), narrow = W < 640, phone = W < 480, tf = OV.tf, stock = T.kind === 'stock';
    var L = narrow ? 2 : 30, pw = W - L - (narrow ? 30 : 40);
    var H = Math.max(220, Math.round(H0 || 420));
    var gap = stock && T.c ? (H < 420 ? 10 : narrow ? 12 : 20) : 0, av = H - 24 - gap;
    var spyH = stock && T.c ? Math.round(av * 0.32) : 0, mH = av - spyH, mTop = spyH + gap;
    var x0 = OV.view.x0, x1 = OV.view.x1, span = x1 - x0, X = lin(x0, x1, L, L + pw), li = T.v.length - 1;
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, span > 1100 ? TICK_YEAR : 0, T.e, T.last);
    var row = stock ? RBY[OV.id] : null;
    var pY = stock && T.c ? pricePanel(svg, X, x0, x1, L, 0, pw, spyH, ticks, OV.id + (row && row.name ? ' (' + shortName(row.name, OV.id) + ')' : '')) : null;
    var g = el('g', {}, svg), todayIn = T.last >= x0 && T.last <= x1, nowV = T.v[li];
    panelRect(g, L, mTop, pw, mH);
    var room = narrow ? 24 : 30, Y = lin(0, 100, mTop + mH, mTop + room);
    yTicks(g, Y, [0, 20, 40, 60, 80, 100], L + pw, L, String, 'right', mTop);
    timeGrid(g, X, ticks, mTop, mTop + mH);
    if (!narrow) tx(g, 12, mTop + mH / 2, stock ? NOUN + ' %' : '% ' + ADJ, { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mTop + mH / 2) + ')' });
    var clip = clipFor(svg, L, mTop, pw, mH);
    var short = tf !== '1D' || span <= 380;
    T.peerDrawn = !!T.peer && short;
    T.spDrawn = !stock && !!T.sp && short;
    if (stock && T.peerDrawn) linePath(g, X, Y, T.e, T.peer, x0, x1, clip, { stroke: C.light, 'stroke-opacity': 0.6, 'stroke-width': 1 });
    if (T.spDrawn) linePath(g, X, Y, T.e, T.sp, x0, x1, clip, { stroke: C.sp, 'stroke-opacity': 0.6, 'stroke-width': narrow ? 0.9 : 1 });
    seriesPaths(g, X, Y, T, x0, x1, clip, tf === '1D' ? lineWidth(span, narrow) : OV_LW[tf]);
    var rNow = narrow ? 5 : 6, rPk = narrow ? 4 : 4.5, tx0 = X(T.last), ty = Y(nowV == null ? 0 : nowV);
    var obstacles = [], texts = [];
    if (todayIn) obstacles.push(nowBox(tx0, ty, rNow));
    var cands = [];
    T.pk.forEach(function (j) {
      var dn = T.e[j]; if (dn < x0 || dn > x1 || T.v[j] == null) return;
      if (j === li && todayIn) return;
      var x = X(dn); if (x < L - 0.5 || x > L + pw) return;
      x = Math.max(x, L, rPk + 1.5);
      cands.push({ j: j, dn: dn, v: T.v[j], x: x, y: Y(T.v[j]) });
    });
    cands.sort(function (a, b) { return b.v - a.v || a.dn - b.dn; });
    var dots = thinDots(cands, rPk, obstacles.slice(), 2 * (W < 640 ? 2.4 : 3) + 1.5);
    var slab = null, lineV = stock ? 50 : T.alarm;
    if (lineV != null && lineV > 0 && lineV < 100) {
      var sy = Y(lineV), sls = narrow ? 11 : 11.5, slt = stock ? ADJ + ' line 50%' : 'alarm line ' + Math.round(lineV) + '%', slw = textW(slt, sls) + 6;
      el('line', { x1: L, x2: L + pw, y1: sy, y2: sy, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '4 3' }, g);
      var slFree = function (b) { return !dots.some(function (d) { return overlaps(b, dotBox(d.x, d.y, rPk)); }) && !obstacles.some(function (o) { return overlaps(b, o); }); };
      for (var sx = L + 6; sx + slw <= L + pw - 6 && !slab; sx += Math.max(24, slw / 2)) {
        var above = { x: sx, y: sy - sls - 6, w: slw, h: sls + 4 }, below = { x: sx, y: sy + 1, w: slw, h: sls + 4 };
        if (slFree(above)) slab = above;
        else if (below.y + sls + 4 <= mTop + mH - 1 && slFree(below)) slab = below;
      }
      if (!slab) { slab = { x: L + 6, y: sy - sls - 6, w: slw, h: sls + 4 }; dots = dots.filter(function (d) { return !overlaps(slab, dotBox(d.x, d.y, rPk)); }); }
      el('rect', { x: slab.x, y: slab.y, width: slab.w, height: slab.h, fill: C.panel }, g);
      tx(g, slab.x + 3, slab.y + sls + 0.5, slt, { fill: C.text, 'font-size': sls });
      obstacles.push(slab); texts.push(slab);
    }
    if (todayIn && nowV != null) {
      var tl = nowWords(tf, T) + ' ' + Math.round(nowV) + '%', ts = narrow ? 12 : 13, tw = textW(tl, ts, 700);
      var tlx = Math.max(L + 4 + tw, Math.min(tx0 - 8, L + pw - 4)), tly = Math.max(mTop + ts + 2, ty - 12);
      var tryY = [tly, Math.min(mTop + mH - 4, ty + ts + 10), tly - ts - 6, tly - 2 * (ts + 6)];
      for (var ti = 0; ti < tryY.length; ti++) {
        var tb = { x: tlx - tw - 2, y: tryY[ti] - ts, w: tw + 4, h: ts + 6 };
        if (tryY[ti] - ts < mTop + 2) continue;
        if (!dots.some(function (d) { return overlaps(tb, dotBox(d.x, d.y, rPk)); }) && !(slab && overlaps(tb, slab))) { tly = tryY[ti]; break; }
      }
      el('rect', { x: tlx - tw - 3, y: tly - ts, width: tw + 6, height: ts + 4.5, fill: C.panel, rx: 2 }, g);
      tx(g, tlx, tly, tl, withHalo({ fill: C.light, 'font-size': ts, 'font-weight': 700, 'text-anchor': 'end' }));
      var nb = { x: tlx - tw - 2, y: tly - ts, w: tw + 4, h: ts + 6 };
      obstacles.push(nb); texts.push(nb);
    }
    dots.forEach(function (d) { var b = dotBox(d.x, d.y, rPk); b.dn = d.dn; obstacles.push(b); });
    var padX = phone ? 6 : 12;
    function hits(b, dn) { var p = { x: b.x - padX, y: b.y, w: b.w + 2 * padX, h: b.h }; return obstacles.some(function (o) { return o.dn !== dn && overlaps(o, p); }); }
    function leader(px, yTop, yDot) { return yDot - yTop > 1 ? { x: px - 1.5, y: yTop, w: 3, h: yDot - yTop } : null; }
    function crossesText(b) { return !!b && texts.some(function (o) { return overlaps(o, b); }); }
    function keep(box, ld, dn) { box.dn = undefined; obstacles.push(box); texts.push(box); if (ld) { ld.dn = dn; obstacles.push(ld); texts.push(ld); } }
    var lab = el('g', {}, svg), placed = 0, topLimit = mTop + 3, long = span > 240, maxLabels = phone ? 3 : narrow ? 4 : 5;
    var gapD = Math.max(3, span * OV_LAB_GAP[tf]), labDays = [];
    dots.forEach(function (d) {
      if (placed >= maxLabels || labDays.some(function (x) { return Math.abs(x - d.dn) < gapD; })) return;
      var px = d.x, py = d.y, big = Math.round(d.v) + '%', up = rPk - 1.5;
      if (phone) {
        var small = labelWords(T.s[d.j], long, true), s1 = 12, s2 = 10.5, w = Math.max(textW(big, s1, 700), textW(small, s2, 400)) + 4, bh = s1 + s2 + 4, box = null, ld = null;
        var offs = [0, w / 2 + 3, -(w / 2 + 3)];
        for (var lift = 0; lift <= 2 && !box; lift++) for (var oi = 0; oi < offs.length && !box; oi++) {
          var cx = Math.max(L + 2 + w / 2, Math.min(L + pw - 2 - w / 2, px + offs[oi]));
          if (oi > 0 && Math.abs(cx - px) < w / 2 - 2) continue;
          var b = { x: cx - w / 2, y: py - 6 - bh + 2 - up - lift * (bh + 2), w: w, h: bh };
          if (b.y < topLimit || hits(b, d.dn)) continue;
          var l1 = b.y + bh < py - 8 - up ? leader(Math.abs(cx - px) < 2 ? px : Math.max(b.x + 2, Math.min(b.x + w - 2, px)), b.y + bh + 1, py - rPk - 1) : null;
          if (crossesText(l1)) continue;
          box = b; ld = l1;
        }
        if (!box) return;
        keep(box, ld, d.dn);
        var bcx = box.x + w / 2;
        if (ld) el('line', { x1: px, x2: Math.abs(bcx - px) < 2 ? px : Math.max(box.x + 2, Math.min(box.x + w - 2, px)), y1: py - rPk - 1, y2: box.y + bh + 1, stroke: C.muted, 'stroke-width': 0.8 }, lab);
        tx(lab, bcx, box.y + s1, big, withHalo({ fill: C.white, 'font-size': s1, 'font-weight': 700, 'text-anchor': 'middle' }));
        tx(lab, bcx, box.y + s1 + s2 + 1, small, withHalo({ fill: C.text, 'font-size': s2, 'text-anchor': 'middle' }));
        placed++; labDays.push(d.dn);
        return;
      }
      var ps = narrow ? 11.5 : 12.5, lineH = ps + 4, label = big + '  ' + labelWords(T.s[d.j], long, false);
      var lw = textW(label, ps, 700), anchor = 'middle', bx = px - lw / 2;
      if (bx < L + 3) { anchor = 'start'; bx = px + 3; }
      if (bx + lw > L + pw - 3) { anchor = 'end'; bx = px - 3 - lw; }
      var box2 = { x: bx - 2, y: py - 4 - ps - 1 - up, w: lw + 4, h: ps + 3 }, guard = 0;
      while (hits(box2, d.dn) && guard++ < 20) box2.y -= lineH / 2;
      if (box2.y < topLimit || guard >= 20) return;
      var baseY = box2.y + ps + 0.5, ld2 = baseY < py - 6 - up ? leader(px, baseY + 3, py - rPk - 1) : null;
      if (crossesText(ld2)) return;
      keep(box2, ld2, d.dn);
      if (ld2) el('line', { x1: px, x2: px, y1: py - rPk - 1, y2: baseY + 3, stroke: C.muted, 'stroke-width': 0.8 }, lab);
      tx(lab, anchor === 'start' ? bx : anchor === 'end' ? bx + lw : px, baseY, label, withHalo({ fill: C.white, 'font-size': ps, 'font-weight': 700, 'text-anchor': anchor }));
      placed++; labDays.push(d.dn);
    });
    var dotG = el('g', {}, svg);
    dots.sort(function (a, b) { return a.dn - b.dn; });
    dots.forEach(function (d) { peakDot(dotG, d.x, d.y, rPk); });
    if (todayIn && nowV != null) {
      if (T.isPk[li]) el('circle', { cx: tx0, cy: ty, r: rNow + 8.5, fill: 'none', stroke: C.gold, 'stroke-width': 1.6 }, el('g', {}, svg));
      nowDot(el('g', {}, svg), tx0, ty, rNow);
    }
    var snap = dots.map(function (d) { return { x: d.x, y: d.y, dn: d.dn }; });
    if (stock && T.c) {
      var lastC = T.c[T.c.length - 1];
      if (todayIn && lastC != null) { var pn = { x: X(T.last), y: pY(lastC) }; nowDot(pY.dots, pn.x, pn.y, narrow ? 3.5 : 4); snap.push({ x: pn.x, y: pn.y, dn: T.last }); }
    }
    if (todayIn) snap.push({ x: tx0, y: ty, dn: T.last });
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var j = dn == null ? li : Math.max(0, bsearchLE(T.e, dn));
      if (dn != null && T.e[j] >= x0 && T.e[j] <= x1) {
        var px = X(T.e[j]);
        el('line', { x1: px, x2: px, y1: 0, y2: mTop + mH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (stock && T.c) { var di = bsearchLE(T.d, T.e[j]); if (di >= 0 && T.c[di] != null) el('circle', { cx: px, cy: pY(T.c[di]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross); }
        if (T.v[j] != null) el('circle', { cx: px, cy: Y(T.v[j]), r: 4.5, fill: C.light, stroke: '#fff', 'stroke-width': 1.2 }, cross);
      }
      ovReadout(j, dn != null);
    }
    GEO.o = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.o);
  }
  function ovEmpty(holder) {
    clear(holder);
    var p = elh('p', 'st-msg', OV.err || 'Loading ' + (OV.kind === 'stock' ? OV.id : (GBY[OV.id] || {}).name || '') + '…');
    holder.appendChild(p);
    clear($('ovRo'));
  }
  function ovReadout(j, picked) {
    var ro = $('ovRo'), T = OV.T, tf = OV.tf, last = j === T.v.length - 1, v = T.v[j];
    clear(ro);
    var lab = candleWords(tf, T, j);
    if (last && T.open) lab += ' (so far)';
    ro.appendChild(span('d', lab));
    if (T.kind === 'stock') {
      ro.appendChild(span('', ' · ' + NOUN + ' '));
      ro.appendChild(span('p', v == null ? '–' : pct1(v)));
      ro.appendChild(span('', v == null ? '' : v > 50 ? ' · ' + ADJ : v === 0 ? ' · ' + sw('calm', 'quiet') : ' · not ' + ADJ));
      var di = bsearchLE(T.d, T.e[j]), c = di >= 0 && T.c ? T.c[di] : null;
      var pi = tf === '1D' ? di - 1 : j > 0 ? bsearchLE(T.d, T.e[j - 1]) : -1, p0 = pi >= 0 && T.c ? T.c[pi] : null;
      if (c != null) ro.appendChild(span('', ' · ' + OV.id + ' $' + priceWord(c) + ' '));
      if (c != null && p0) { var ch = (c / p0 - 1) * 100; ro.appendChild(span(ch >= 0 ? 'up' : 'down', (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(2) + '%')); }
      if (T.peer && T.peer[j] != null) ro.appendChild(span('', ' · ' + (T.peerName || 'its peers') + ' meter ' + pct1(T.peer[j])));
    } else {
      ro.appendChild(span('', ' · '));
      ro.appendChild(span('p', v == null ? '–' : pct1(v)));
      ro.appendChild(span('', ' ' + ADJ + (T.n && T.n[j] && v != null ? ' (' + Math.round(v * T.n[j] / 100) + ' of ' + T.n[j] + ')' : '')));
    }
    if (T.sp && T.sp[j] != null) ro.appendChild(span('', ' · ' + SPM + ' ' + pct1(T.sp[j])));
    if (T.isPk[j]) ro.appendChild(span('pk', ' · gold: its own top 1%'));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any ' + TF_UNIT[tf][0]));
  }
  function boxRow(box, label, parts) {
    var r = elh('div', 'box-row'); r.appendChild(elh('b', '', label));
    var s = elh('span');
    parts.forEach(function (p) { if (p == null) return; s.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
    r.appendChild(s); box.appendChild(r);
  }
  function ovRenderUi() {
    var T = OV.T, tf = OV.tf, stock = OV.kind === 'stock', r = stock ? RBY[OV.id] : null, g = stock ? null : GBY[OV.id];
    var x = stock ? SDOC[OV.id] : GDOC[OV.id];
    if (!r && !g) return;
    $('ovKicker').textContent = stock ? cap(NOUN) + ' outlier #' + r.rank + ' of ' + ROWS.length + ' · score ' + r.score : cap(ADJ) + ' crowd #' + g.rank + ' of ' + GROUPS.length + ' · ' + g.kind;
    $('ovName').textContent = stock ? r.sym + (r.name ? ' ' + shortName(r.name, r.sym) : '') : g.full || g.name;
    $('ovSpan').textContent = TF_NAME[tf] + (T ? ' · ' + ovSpanWords() : '');
    var sub = $('ovSub'); clear(sub);
    if (stock) {
      sub.appendChild(document.createTextNode(cap(r.words.rare) + ' · ' + r.words.crowd + (r.words.speed ? ' · ' + r.words.speed : '') + ' '));
      sub.appendChild(span('muted', '· ' + (r.industry || r.sector_name)));
    } else {
      sub.appendChild(document.createTextNode(cap(topWords(g)) + ' · ' + gapWords(g) + ' '));
      sub.appendChild(span('muted', '· ' + commas(g.n) + ' stocks counted today'));
      if (!BULL && g.id === 'theme_neocloud') {
        sub.appendChild(span('muted', ' · the full 31-name meter: '));
        var a = elh('a', '', 'Neocloud Fear ›'); a.href = '../neocloud/'; sub.appendChild(a);
      }
    }
    if (T) {
      var li = T.v.length - 1, nv = T.v[li];
      $('ovK').textContent = nowWords(tf, T) + (tf === '1D' ? (LIVE ? ' so far' : ' close') : '');
      $('ovV').textContent = nv == null ? '–' : stock ? Math.round(nv) + '%' : pct1(nv);
      $('ovDate').textContent = stock ? sw('fear', 'bull %') + ' · ' + (nv > 50 ? ADJ : 'not ' + ADJ) + (T.p99 != null ? ' · its gold top-1% level ' + Math.round(T.p99) + '%' : '')
        : 'of its stocks ' + ADJ + (T.p99 != null ? ' · its gold top-1% level ' + pct1(T.p99) : '');
    } else { $('ovK').textContent = ''; $('ovV').textContent = '–'; $('ovDate').textContent = OV.err ? '' : 'Loading…'; }
    Array.prototype.forEach.call($('ovTfs').querySelectorAll('[data-otf]'), function (bt) {
      var k = bt.getAttribute('data-otf'), ok = true;
      if (stock && x && x.tf) { var b = x.tf[k]; ok = !!(b && Array.isArray(b.f) && b.f.some(function (v) { return v != null; })); }
      setAttr(bt, 'aria-pressed', String(k === tf)); bt.disabled = !ok;
      if (!ok) bt.title = OV.id + ' is too young for ' + TF_WORD[k] + ' candles'; else bt.removeAttribute('title');
    });
    Array.prototype.forEach.call($('ovRanges').querySelectorAll('[data-orange]'), function (bt) {
      var mine = bt.getAttribute('data-orange') === OV.view.chip;
      setAttr(bt, 'aria-pressed', String(mine && !OV.view.custom));
      bt.classList.toggle('base', mine && OV.view.custom);
      bt.disabled = !T;
    });
    var lim = T ? ovLimits() : null, s = OV.view.x1 - OV.view.x0;
    Array.prototype.forEach.call($('ovBar').querySelectorAll('[data-oz]'), function (bt) {
      var z = bt.getAttribute('data-oz');
      if (!T) { bt.disabled = true; return; }
      if (z === 'reset') bt.disabled = !OV.view.custom;
      else if (z === 'in') bt.disabled = s <= lim.min + 1e-6;
      else if (z === 'out') bt.disabled = s >= lim.max - 1e-6;
      else if (z === 'today') {
        var off = T.last <= OV.view.x1;
        bt.classList.toggle('off', off); bt.disabled = off;
        if (off) setAttr(bt, 'aria-hidden', 'true'); else bt.removeAttribute('aria-hidden');
      }
    });
    var lg = $('ovLg'); clear(lg);
    function item(cls, text) { var s0 = span('lg-i', ''); s0.appendChild(span(cls, '')); s0.appendChild(document.createTextNode(text)); return s0; }
    lg.appendChild(item('lg-area', stock ? OV.id + ' ' + NOUN + ' %' : '% of its stocks ' + ADJ));
    if (T && T.p99 != null) lg.appendChild(item('lg-pk', 'its own top 1% (99th percentile, ' + (stock ? Math.round(T.p99) + '%' : pct1(T.p99)) + ')'));
    else if (T) lg.appendChild(span('lg-i', 'no gold dots: under ' + GOLD_MIN + ' ' + TF_UNIT[tf][1] + ' of history on this candle size'));
    lg.appendChild(item('lg-now', 'now'));
    if (stock) {
      var pm = x && x.peer_meter;
      if (T && T.peerDrawn) lg.appendChild(item('lg-ind', 'its peers’ meter: % of ' + (pm ? pm.name : 'its industry') + ' ' + ADJ));
      else if (T && T.peer) lg.appendChild(span('lg-i', 'its peers’ meter (' + (pm ? pm.name : 'its industry') + '): in the readout; drawn on 1 year or less of daily candles'));
      else if (pm && tf !== '1D' && !pm.id) lg.appendChild(span('lg-i', 'its peers’ line: daily candles only'));
      lg.appendChild(item('lg-alarm', ADJ + ' line 50%'));
    } else {
      if (T && T.spDrawn) lg.appendChild(item('lg-sp', SPF));
      else if (T && T.sp) lg.appendChild(span('lg-i', SPF + ': in the readout; drawn on 1 year or less of daily candles'));
      if (T && T.alarm != null) lg.appendChild(item('lg-alarm', 'alarm line: a high reading for this candle size by ' + (OV.id === 'index_sp500' ? 'the meter’s' : 'the crowd’s') + ' own history (its 90th percentile)'));
    }
    $('fs').setAttribute('aria-label', (stock ? 'The ' + OV.id + ' ' + NOUN + ' chart, ' : 'The ' + (g.full || g.name) + ' ' + NOUN + ' meter, ') + TF_WORD[tf] + ' candles');
    ovBelow(r, g, x);
  }
  function ovBelow(r, g, x) {
    var below = $('ovBelow'), key = (r ? 's:' + r.sym : 'g:' + g.id) + (x ? ':1' : ':0');
    if (below.getAttribute('data-k') === key) return;
    below.setAttribute('data-k', key); clear(below);
    var box = elh('div', 'box ov-box');
    if (r) {
      boxRow(box, 'How rare', [cap(r.words.rare) + (r.words.last ? '; ' + r.words.last : '') + '. Weekly: ' + r.words.rare_1w + '.']);
      var pl = r.peer.level === 'theme' ? 'its ' + themeShort(r.peer.name) + ' crowd' : 'its ' + r.peer.level + (r.peer.level === 'market' || !r.peer.name ? '' : ' (' + r.peer.name + ')');
      boxRow(box, 'Its peers', [cap(r.words.crowd) + '. Peers: ' + pl + (r.peer.n != null ? ', ' + r.peer.n + ' stocks on the board' : '') + '; its gap to their middle stock ' + gapNum(r.gap) + ' (its ' + NOUN + ' % minus that stock’s).' + (peerNote(r) ? ' ' + cap(peerNote(r)) + '.' : '')]);
      var sp = r.speed || {};
      var spd = sp.pct == null ? '' : sp.fresh ? 'a ' + sw('drop', 'rise') + ' in mood this big or bigger on ' + pctShort(sp.pct) + ' of its 5-day stretches' : sw('no fresh drop in mood over the last 5 days', 'no fresh rise in mood over the last 5 days');
      boxRow(box, 'Speed', [(r.words.speed ? cap(r.words.speed) + '. ' : '') + (spd ? cap(spd) + '.' : '')]);
      var f = null;
      boxRow(box, 'Outlier score', [r.score + ' of 100 · #' + r.rank + ' of ' + ROWS.length + ' ' + ADJ + ' stocks' + (r.kinds.length ? ' · ' + r.kinds.map(function (k) { return k === 'crowd' ? 'with the crowd' : k; }).join(', ') : ''), f]);
      boxRow(box, 'Price', [(r.words.price ? r.words.price + ' · ' : '') + 'today ' + signedPct(r.chg1d, 1)]);
      var also = [];
      if (BULL && r.calls) also.push('Calls building · ' + r.calls);
      if (BULL && r.puts) also.push('Puts building · ' + r.puts);
      if (r.words.heavy) also.push(r.words.heavy);
      if (!BULL && r.puts) also.push('Puts building · ' + r.puts);
      if (!BULL && r.calls) also.push('Calls building · ' + r.calls);
      if (also.length) boxRow(box, 'Also', [also.join(' · ')]);
      below.appendChild(box);
      var full = x && x.row ? x.row : r, cards = elh('div', 'ocards');
      if (CPON) cards.appendChild(cpCard(full.cp, false, r.sym, full.cp_none || r.cp_none)); cards.appendChild(bizCard(full.business, false));
      below.appendChild(cards);
      below.appendChild(elh('p', 'st-foot', sw('Fear % = how deep the stock sits in its washed-out zone, 0–100; above 50% = scared.', 'Bull % = how deep the stock sits in its stretched-up zone, 0–100; above 50% = bullish.') + ' Gold dots = its own top 1% of readings since ' + r.base.slice(0, 4) + '.'));
      return;
    }
    var p = g.pct;
    boxRow(box, 'Right now', [pct1(p['1D']) + ' of its ' + commas(g.n) + ' stocks are ' + ADJ + ' (' + (g.zone || zoneOf(p['1D'])) + ') · weekly ' + pct1(p['1W']) + ' · 2-week ' + pct1(p['2W']) + ' · monthly ' + pct1(p['1M'])]);
    boxRow(box, 'Vs its own days', [cap(topWords(g)) + (g.pctile != null && p['1D'] > 0 ? ' (higher than ' + (100 - topNum(g)) + '% of them)' : '')]);
    boxRow(box, 'Vs the market', [cap(gapWords(g)) + ' (' + OUT.sp500.now['1D'] + '% today)']);
    boxRow(box, 'Basket', ['An equal-weight basket of its stocks: ' + signedPct(g.ew1d, 1) + ' today, ' + signedPct(g.ew1m, 1) + ' this month']);
    below.appendChild(box);
    var gcards = elh('div', 'ocards');
    if (CPON) gcards.appendChild(cpCard(x && x.cp !== undefined ? x.cp : g.cp, true, g.name)); gcards.appendChild(bizCard(x && x.biz !== undefined ? x.biz : g.biz, true));
    below.appendChild(gcards);
    if (!x) { below.appendChild(elh('h3', 'mem-h', 'Its most-' + ADJ + ' stocks today')); below.appendChild(elh('p', 'st-foot', 'Loading…')); return; }
    var mem = (x[K.most] || []).filter(function (m) { return m[K.val] != null && Math.round(m[K.val]) >= 1; });
    below.appendChild(elh('h3', 'mem-h', mem.length === 1 ? 'Its most-' + ADJ + ' stock today' : 'Its ' + (mem.length ? mem.length + ' ' : '') + 'most-' + ADJ + ' stocks today'));
    if (!mem.length) { below.appendChild(elh('p', 'st-foot mem-none', 'None of its stocks is on the ' + sw('scared', 'bullish') + ' side today.')); return; }
    var t = elh('table', 'mem'), tb = t.createTBody();
    mem.forEach(function (m) {
      var tr = tb.insertRow(), on = m.rank != null && RBY[m.sym];
      if (on) { tr.className = 'go'; tr.setAttribute('data-sym', m.sym); }
      var c0 = tr.insertCell();
      if (on) { var b = elh('button', 'b-sym', m.sym); b.type = 'button'; b.setAttribute('aria-label', m.sym + ': open its own ' + NOUN + ' chart'); c0.appendChild(b); }
      else c0.appendChild(span('b-sym', m.sym));
      var c1 = tr.insertCell(); c1.className = 'nm'; c1.textContent = shortName(m.name, m.sym);
      var c2 = tr.insertCell(); c2.className = 'r'; c2.appendChild(span(m[K.flag] ? 'on' : '', NOUN + ' ' + Math.round(m[K.val]) + '%'));
      var c3 = tr.insertCell(); c3.className = 'r'; c3.appendChild(chgSpan(m.chg1d));
      var c4 = tr.insertCell(); c4.className = 'r';
      if (on) c4.appendChild(span('lnk', '#' + m.rank + ' · score ' + m.score + ' ›'));
      else c4.appendChild(span('muted', m.eligible ? 'not ' + ADJ : 'not on the board'));
    });
    t.addEventListener('click', function (e) {
      var tr = e.target && e.target.closest ? e.target.closest('tr[data-sym]') : null;
      if (tr) openOv('stock', tr.getAttribute('data-sym'), '1D', null, e.detail > 0);
    });
    below.appendChild(t);
    below.appendChild(elh('p', 'st-foot', 'Not on the board = too little price, trading or history; it still counts in the crowd’s meter. Stocks held flat by a cash deal and a company’s second share class are left off this list (they count in the meter too).'));
  }
  var ovRaf = false;
  function ovRequest() { if (ovRaf) return; ovRaf = true; requestAnimationFrame(function () { ovRaf = false; ovDraw(); }); }
  function ovChartH() {
    var vh = window.innerHeight, w = $('ovSlot').clientWidth, short = vh <= 540, wide = w >= 600;
    var min = short ? 200 : OV.kind === 'stock' ? (wide ? 340 : 360) : 260;
    var want = vh * (OV.kind === 'stock' ? (wide ? 0.6 : 0.56) : (wide ? 0.5 : 0.46));
    return Math.round(Math.max(min, Math.min(want, wide ? 640 : 520)));
  }
  function ovDraw() {
    if (!FS.open) return;
    var slot = $('ovSlot'), h = ovChartH();
    if (slot.style.height !== h + 'px') slot.style.height = h + 'px';
    var c = $('ovChart');
    if (hover.o != null && OV.T && (hover.o < OV.view.x0 || hover.o > OV.view.x1)) hover.o = null;
    try { drawOv(c.clientWidth, c.clientHeight || h); ovRenderUi(); }
    catch (e) { errWords(e); OV.err = 'This chart could not be drawn.'; OV.T = null; GEO.o = null; ovEmpty(c); }
  }
  function ovApply() {
    var x = OV.kind === 'stock' ? SDOC[OV.id] : null;
    if (x && x.tf && !(x.tf[OV.tf] && x.tf[OV.tf].f && x.tf[OV.tf].f.some(function (v) { return v != null; }))) OV.tf = '1D';
    OV.chip = chipFor(OV.tf);
    ovPrepare();
    if (OV.T) OV.view = ovRangeView(OV.chip);
    if (FS.open) { setHash(); ovRequest(); }
  }
  function ovLoad() {
    var want = ++OV.want, kind = OV.kind, id = OV.id;
    var jobs = [getRef(), kind === 'stock' ? getStock(id) : getGroup(id)];
    Promise.all(jobs).then(function (res) {
      if (want !== OV.want) return;
      var x = res[1];
      if (kind === 'stock' && x.peer_meter && x.peer_meter.id && GBY[x.peer_meter.id] && !GDOC[x.peer_meter.id] && OV.tf !== '1D') {
        return getGroup(x.peer_meter.id).then(function () { if (want === OV.want) ovApply(); }, function () { if (want === OV.want) ovApply(); });
      }
      ovApply();
    }).catch(function (e) {
      if (want !== OV.want) return;
      OV.err = 'Could not load this chart (' + errWords(e) + ').'; OV.T = null; ovRequest();
    });
  }
  function openOv(kind, id, tf, opener, ptr, adopt) {
    if (!OUT) return;
    if (kind === 'stock') { id = String(id || '').toUpperCase(); if (!RBY[id]) return; }
    else if (!GBY[id]) return;
    if (FS.pendingBack) { FS.queued = [kind, id, tf, opener, ptr]; return; }
    OV.kind = kind; OV.id = id; OV.tf = normTf(tf) || '1D'; OV.err = null; OV.T = null; hover.o = null; OV.chip = chipFor(OV.tf);
    if (!FS.open) OV.opener = opener || null;
    OV.view = { chip: OV.chip, x0: 0, x1: 0, custom: false };
    $('ovBelow').removeAttribute('data-k');
    if (!FS.open) fsOpen(ptr, adopt); else setHash();
    ovPrepare();
    if (OV.T) OV.view = ovRangeView(OV.chip);
    ovDraw();
    $('fs').scrollTop = 0;
    if (!OV.T) ovLoad();
    else if (kind === 'stock') {
      var x = SDOC[id], pm = x && x.peer_meter;
      if (pm && pm.id && GBY[pm.id] && !GDOC[pm.id] && OV.tf !== '1D') ovLoad();
    }
  }
  function ovChooseTf(k) {
    if (!OV.kind || k === OV.tf) return;
    OV.tf = k; hover.o = null; OV.err = null;
    var x = OV.kind === 'stock' ? SDOC[OV.id] : null, pm = x && x.peer_meter;
    if (pm && pm.id && GBY[pm.id] && !GDOC[pm.id] && k !== '1D') { ovPrepare(); ovLoad(); }
    ovApply(); ovRequest();
  }
  function ovChooseRange(chip) { if (!OV.T) return; OV.chip = OV.userChip = chip; store(PFX + 'Range', chip); hover.o = null; OV.view = ovRangeView(chip); ovRequest(); }

  function ovHash() { return '#' + (OV.kind === 'stock' ? 'stock=' : 'group=') + encodeURIComponent(OV.id) + '&tf=' + OV.tf; }
  function setHash() { try { history.replaceState(history.state, '', location.pathname + location.search + ovHash()); } catch (e) { } }
  function clearHash() { if (!/^#(stock|group)=/i.test(location.hash || '')) return; try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { } }
  function parseHash() {
    var m = /^#(stock|group)=([^&]*)(?:&tf=([^&]*))?/i.exec(location.hash || '');
    if (!m) return null;
    try { return { kind: m[1].toLowerCase(), id: decodeURIComponent(m[2]), tf: m[3] ? decodeURIComponent(m[3]) : '1D' }; } catch (e) { return null; }
  }
  function setInert(on) {
    ['.top', 'main', '.skip'].forEach(function (sel) {
      var n = document.querySelector(sel); if (!n) return;
      if ('inert' in n) n.inert = on;
      if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden');
    });
  }
  function fsFocus(n, ptr) { if (!n) return; n.classList.toggle('ptr-focus', !!ptr); try { n.focus({ preventScroll: true }); } catch (e) { } }
  function fsOpen(ptr, adopt) {
    FS.y = window.pageYOffset || document.documentElement.scrollTop || 0;
    try { if (FS.sr == null) FS.sr = history.scrollRestoration; history.scrollRestoration = 'manual'; } catch (e) { }
    try {
      if (!adopt) { history.pushState({ fo: 1, n: 1 }, '', location.pathname + location.search + ovHash()); FS.depth = 1; }
      else FS.depth = (history.state && history.state.n) || 1;
      FS.pushed = true;
    } catch (e) { FS.pushed = false; FS.depth = 0; }
    document.body.style.top = -FS.y + 'px';
    document.documentElement.classList.add('fs-open');
    FS.open = true;
    var ov = $('fs'); ov.hidden = false; ov.scrollTop = 0; ov.setAttribute('data-kind', OV.kind);
    $('fsHint').textContent = HOVER ? 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click or Esc to close'
      : 'Pinch to zoom · drag sideways to move · hold to read a candle · double-tap or ✕ to close';
    setInert(true);
    fsFocus($('ovChart'), ptr);
  }
  function closeOv(fromPop, ptr) {
    if (!FS.open) return;
    FS.open = false; OV.want++; GEO.o = null; hover.o = null;
    $('fs').hidden = true; $('ovSlot').style.height = '';
    setInert(false);
    document.documentElement.classList.remove('fs-open');
    document.body.style.top = '';
    window.scrollTo(0, FS.y);
    var op = null; try { op = OV.opener ? document.querySelector(OV.opener) : null; } catch (e) { op = null; }
    if (!op && OV.kind === 'stock') op = document.querySelector('#oTable .b-open[data-sym="' + OV.id + '"]');
    if (!op && OV.kind === 'group') op = document.querySelector('#cTable .b-open[data-gid="' + OV.id + '"]');
    if (op) fsFocus(op, ptr);
    if (FS.pushed && !fromPop) {
      FS.pendingBack = true; clearTimeout(FS.back);
      FS.back = setTimeout(fsBackDone, 1500);
      try { history.go(-Math.max(1, FS.depth)); } catch (e) { fsBackDone(); }
    } else if (!fromPop) clearHash();
    FS.pushed = false; FS.depth = 0;
  }
  function fsBackDone() {
    clearTimeout(FS.back); FS.pendingBack = false;
    if (Math.abs((window.pageYOffset || 0) - FS.y) > 0.5) window.scrollTo(0, FS.y);
    if (FS.queued) { var q = FS.queued; FS.queued = null; openOv(q[0], q[1], q[2], q[3], q[4]); return; }
    try { if (FS.sr != null) { history.scrollRestoration = FS.sr; FS.sr = null; } } catch (e) { }
  }
  function adoptEntry() {
    var st = history.state;
    if (st && st.fo) { FS.depth = st.n || 1; return; }
    FS.depth = (FS.depth || 0) + 1; FS.pushed = true;
    try { history.replaceState({ fo: 1, n: FS.depth }, ''); } catch (e) { }
  }
  function toggleOv(ptr) {
    var t = performance.now();
    if (t - FS.at < 350) return;
    FS.at = t;
    if (FS.open) closeOv(false, ptr);
  }

  var lastTip = -1e9;
  function attachGestures(holder, key, ctl) {
    var ptrs = {}, count = 0, mode = null, g0 = null, rect = null, lastTap = null, engaged = false, tip = null, tipTimer = 0, lastType = 'mouse';
    function showTip() {
      var t = performance.now();
      if (t - lastTip < 20000) return;
      lastTip = t;
      if (!tip) { tip = document.createElement('div'); tip.className = 'zoomtip'; tip.setAttribute('aria-hidden', 'true'); holder.appendChild(tip); }
      if (tip.parentNode !== holder) holder.appendChild(tip);
      tip.textContent = 'To zoom: pinch, or hold ' + (IS_MAC ? '⌘' : 'Ctrl') + ' and scroll (or click the chart first)';
      tip.classList.add('on');
      clearTimeout(tipTimer); tipTimer = setTimeout(function () { tip.classList.remove('on'); }, 2200);
    }
    function clearHold(p) { if (p && p.hold) { clearTimeout(p.hold); p.hold = 0; } }
    function G() { return GEO[key]; }
    function pxOf(clientX) { return (clientX - rect.left) * G().W / rect.width; }
    function list() { return Object.keys(ptrs).map(function (k) { return ptrs[k]; }); }
    function canPan() { var v = ctl.view(); return v.x1 - v.x0 < ctl.limits().max - 1e-6; }
    function pick(clientX, clientY, kind) {
      var g = G(); if (!g) return;
      var xs = ctl.xs(), px = Math.max(g.L, Math.min(g.L + g.pw, pxOf(clientX))), dn = g.X.inv(px), i = bsearchLE(xs, dn);
      if (i < 0) i = 0;
      if (i + 1 < xs.length && Math.abs(xs[i + 1] - dn) < Math.abs(xs[i] - dn)) i++;
      var nL = xs.length - 1, onLast = i === nL && nL > 0 && Math.abs(dn - xs[nL]) <= (xs[nL] - xs[nL - 1]) / 2;
      if (clientY != null && g.snap && g.snap.length && !onLast) {
        var k = g.W / rect.width, sy = (clientY - rect.top) * k, rad = (kind === 'mouse' ? 7 : 14), best = rad;
        g.snap.forEach(function (s) { var d = Math.hypot(s.x - px, s.y - sy); if (d <= best) { best = d; i = bsearchLE(xs, s.dn); } });
      }
      hover[key] = xs[i]; g.set(xs[i]);
    }
    function unpick() { var g = G(); if (hover[key] != null && g) { hover[key] = null; g.set(null); } }
    function startPinch() {
      var p = list(), g = G(), v = ctl.view(), mid = (pxOf(p[0].x) + pxOf(p[1].x)) / 2, s = v.x1 - v.x0;
      g0 = { view: v, dist: Math.max(24, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)), anchor: v.x0 + (mid - g.L) / g.pw * s, latest: ctl.atLatest(v) };
      mode = 'pinch'; holder.classList.add('dragging'); lastTap = null;
    }
    function startPan(p) { g0 = { view: ctl.view(), x: p.x }; mode = 'pan'; holder.classList.add('dragging'); lastTap = null; }
    holder.addEventListener('pointerdown', function (e) {
      if (!G()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      rect = holder.getBoundingClientRect(); lastType = e.pointerType;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), type: e.pointerType };
      count = Object.keys(ptrs).length;
      try { holder.setPointerCapture(e.pointerId); } catch (er) { }
      if (count === 1) {
        mode = 'pending';
        if (e.pointerType !== 'mouse') {
          var p0 = ptrs[e.pointerId];
          p0.hold = setTimeout(function () { p0.hold = 0; if (mode === 'pending' && count === 1 && ptrs[e.pointerId] === p0) { mode = 'scrub'; pick(p0.x, p0.y, p0.type); } }, HOLD_MS);
        }
      } else if (count === 2) { list().forEach(clearHold); startPinch(); }
      if (e.pointerType === 'mouse') { e.preventDefault(); engaged = true; holder.focus({ preventScroll: true }); }
    });
    holder.addEventListener('pointermove', function (e) {
      if (!G()) return;
      var p = ptrs[e.pointerId];
      if (!p) {
        if (e.pointerType !== 'mouse') return;
        rect = holder.getBoundingClientRect();
        var hx = pxOf(e.clientX), g = G();
        if (hx >= g.L && hx <= g.L + g.pw) pick(e.clientX, e.clientY, 'mouse'); else unpick();
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      var g1 = G(), s;
      if (mode === 'pinch') {
        if (count < 2) return;
        var q = list(), lim = ctl.limits(), s0 = g0.view.x1 - g0.view.x0;
        var ns = Math.max(lim.min, Math.min(lim.max, s0 * g0.dist / Math.max(24, Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y))));
        var mid = (pxOf(q[0].x) + pxOf(q[1].x)) / 2, x0 = g0.anchor - (mid - g1.L) / g1.pw * ns;
        var nv = ctl.clamp({ chip: g0.view.chip, custom: true, x0: x0, x1: x0 + ns });
        ctl.set(g0.latest && nv.x1 >= ctl.last() ? ctl.keepRight(nv) : nv);
        return;
      }
      if (mode === 'pending') {
        var dx = p.x - p.sx, dy = p.y - p.sy, slop = p.type === 'mouse' ? 3 : 7;
        if (Math.abs(dx) < slop && Math.abs(dy) < slop) return;
        clearHold(p);
        if (p.type !== 'mouse' && Math.abs(dy) > Math.abs(dx)) { mode = 'none'; return; }
        if (canPan()) { startPan({ x: p.sx }); }
        else mode = p.type === 'mouse' ? 'none' : 'scrub';
      }
      if (mode === 'pan') {
        s = g0.view.x1 - g0.view.x0;
        ctl.set(ctl.pan(g0.view, -(p.x - g0.x) * (g1.W / rect.width) / g1.pw * s));
      } else if (mode === 'scrub') pick(p.x, p.y, p.type);
      else if (mode === 'none' && p.type === 'mouse') pick(p.x, p.y, 'mouse');
    });
    function end(e, cancelled) {
      var p = ptrs[e.pointerId];
      if (!p) return;
      clearHold(p);
      delete ptrs[e.pointerId];
      count = Object.keys(ptrs).length;
      if (!cancelled && mode === 'pending' && p.type !== 'mouse' && performance.now() - p.t < 600) {
        var t = performance.now();
        if (lastTap && t - lastTap.t < 350 && Math.abs(p.x - lastTap.x) < 30 && Math.abs(p.y - lastTap.y) < 30) { lastTap = null; toggleOv(true); }
        else { lastTap = { t: t, x: p.x, y: p.y }; pick(p.x, p.y, p.type); }
      }
      if (count === 1 && mode === 'pinch') { var r = list()[0]; startPan({ x: r.x }); }
      else if (count === 1) mode = 'none';
      if (count === 0) { mode = null; holder.classList.remove('dragging'); }
    }
    holder.addEventListener('pointerup', function (e) { end(e, false); });
    holder.addEventListener('pointercancel', function (e) { end(e, true); });
    holder.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs[e.pointerId]) { engaged = false; unpick(); } });
    holder.addEventListener('blur', function () { engaged = false; });
    holder.addEventListener('contextmenu', function (e) { if (mode === 'scrub' || mode === 'pending') e.preventDefault(); });
    holder.addEventListener('dblclick', function (e) { if (lastType === 'mouse') { e.preventDefault(); toggleOv(true); } });
    holder.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || !lastTap || performance.now() - lastTap.t >= 350 || !e.cancelable) return;
      var t0 = e.touches[0];
      if (Math.abs(t0.clientX - lastTap.x) < 30 && Math.abs(t0.clientY - lastTap.y) < 30) e.preventDefault();
    }, { passive: false });
    holder.addEventListener('touchmove', function (e) {
      if ((e.touches.length > 1 || mode === 'pan' || mode === 'pinch' || mode === 'scrub') && e.cancelable) e.preventDefault();
    }, { passive: false });
    ['gesturestart', 'gesturechange'].forEach(function (t) { holder.addEventListener(t, function (e) { e.preventDefault(); }); });
    holder.addEventListener('wheel', function (e) {
      if (!G()) return;
      var g = G(); rect = holder.getBoundingClientRect();
      var px = pxOf(e.clientX);
      if (px < g.L || px > g.L + g.pw) return;
      var k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1, dx = e.deltaX * k, dy = e.deltaY * k, nv;
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      var pinch = e.ctrlKey, modZoom = e.metaKey || e.altKey;
      var sideways = !pinch && !modZoom && Math.abs(dx) > Math.abs(dy);
      if (!pinch && !modZoom && !sideways && !engaged) { showTip(); return; }
      var v = ctl.view(), s = v.x1 - v.x0;
      if (sideways) nv = ctl.pan(v, dx / g.pw * s);
      else nv = ctl.zoom(v, g.X.inv(px), Math.exp(Math.max(-300, Math.min(300, dy)) * (pinch ? 0.01 : 0.0015)), ctl.atLatest(v));
      if (sameWindow(nv, v)) return;
      e.preventDefault();
      ctl.set(nv);
    }, { passive: false });
    holder.addEventListener('keydown', function (e) {
      if (!G()) return;
      var k = e.key;
      if (k === '+' || k === '=') { e.preventDefault(); ctl.cmd('in'); return; }
      if (k === '-' || k === '_') { e.preventDefault(); ctl.cmd('out'); return; }
      if (k === '0' || k === 'Home') { e.preventDefault(); ctl.reset(); return; }
      if ((k === 'f' || k === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleOv(false); return; }
      if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
      e.preventDefault();
      var xs = ctl.xs(), v = ctl.view(), i = bsearchLE(xs, hover[key] == null ? ctl.last() : hover[key]);
      i = Math.max(0, Math.min(xs.length - 1, i + (k === 'ArrowLeft' ? -1 : 1)));
      var dn = xs[i], s = v.x1 - v.x0;
      hover[key] = dn;
      if (dn < v.x0) ctl.set(ctl.pan(v, dn - v.x0 - s * 0.1));
      else if (dn > v.x1) ctl.set(ctl.pan(v, dn - v.x1 + s * 0.1));
      G().set(dn);
    });
  }

  function initOverlay() {
    $('fsClose').addEventListener('click', function (e) { closeOv(false, e.detail > 0); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-otf]'), function (b) { b.addEventListener('click', function () { ovChooseTf(b.getAttribute('data-otf')); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-orange]'), function (b) { b.addEventListener('click', function () { ovChooseRange(b.getAttribute('data-orange')); }); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-oz]'), function (b) { b.addEventListener('click', function () { ovCmd(b.getAttribute('data-oz')); }); });
    attachGestures($('ovChart'), 'o', ovCtl);
    document.addEventListener('keydown', function () { var a = document.activeElement; if (a && a.classList) a.classList.remove('ptr-focus'); }, true);
    document.addEventListener('focusout', function (e) { if (e.target && e.target.classList) e.target.classList.remove('ptr-focus'); }, true);
    window.addEventListener('popstate', function () {
      if (FS.pendingBack) { fsBackDone(); return; }
      var h = parseHash(), ours = !!(history.state && history.state.fo);
      if (h && OUT) {
        if (FS.open) { adoptEntry(); openOv(h.kind, h.id, h.tf, OV.opener, true); }
        else if (ours) openOv(h.kind, h.id, h.tf, null, true, true);
        else { clearHash(); openOv(h.kind, h.id, h.tf, null, true); }
        return;
      }
      if (FS.open) closeOv(true, true);
    });
    window.addEventListener('hashchange', function () {
      if (!OUT) return;
      var h = parseHash(); if (!h) return;
      if (FS.open) { adoptEntry(); if (h.id !== OV.id || h.kind !== OV.kind || (normTf(h.tf) || '1D') !== OV.tf) openOv(h.kind, h.id, h.tf, OV.opener, true); }
      else { clearHash(); openOv(h.kind, h.id, h.tf, null, true); }
    });
    document.addEventListener('keydown', function (e) {
      if (!FS.open) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeOv(false); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call($('fs').querySelectorAll('button, [tabindex="0"], a[href]'), function (n) {
        return !n.disabled && n.offsetParent !== null && !n.classList.contains('off');
      });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }, true);
    window.addEventListener('resize', function () { if (FS.open) ovRequest(); });
    if ('ResizeObserver' in window) {
      var lastS = '';
      new ResizeObserver(function (ents) {
        var r = ents[0].contentRect, sz = Math.round(r.width) + 'x' + Math.round(r.height);
        if (!FS.open || sz === lastS) return;
        lastS = sz; ovRequest();
      }).observe($('ovSlot'));
    }
  }

  (function initPage() {
    OV.userChip = (function (c) { return RANGE_MONTHS.hasOwnProperty(c) ? c : null; })(stored(PFX + 'Range'));
    var qt = 0;
    $('q').addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { F.q = $('q').value || ''; if (OUT) renderOutliers(); }, 120); });
    var qt2 = 0;
    $('q2').addEventListener('input', function () { clearTimeout(qt2); qt2 = setTimeout(function () { FT.q = $('q2').value || ''; if (OUT && FT.built) renderFull(); }, 120); });
    $('oMore').addEventListener('click', function () { F.all = !F.all; renderOutliers(); if (!F.all) $('outliers').scrollIntoView(); });
    $('cMore').addEventListener('click', function () { CALL = !CALL; renderCrowds(); if (!CALL) $('crowds').scrollIntoView(); });
    $('fMore').addEventListener('click', function () { FT.all = !FT.all; renderFull(); });
    $('full').addEventListener('toggle', function () { if ($('full').open && OUT && !FT.built) renderFull(); });
    $('oTable').addEventListener('click', function (e) {
      var tr = e.target && e.target.closest ? e.target.closest('tbody tr[data-sym]') : null;
      if (tr) openOv('stock', tr.getAttribute('data-sym'), '1D', '#oTable .b-open[data-sym="' + tr.getAttribute('data-sym') + '"]', e.detail > 0);
    });
    $('cTable').addEventListener('click', function (e) {
      var tr = e.target && e.target.closest ? e.target.closest('tbody tr[data-gid]') : null;
      if (tr) openOv('group', tr.getAttribute('data-gid'), '1D', '#cTable .b-open[data-gid="' + tr.getAttribute('data-gid') + '"]', e.detail > 0);
    });
    $('fTable').addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('tbody td.hd button') : null;
      if (b) { var tr = b.closest('tr'); openOv('stock', tr.getAttribute('data-sym'), '1D', null, e.detail > 0); }
    });
    initMap();
    initOverlay();
    if ('ResizeObserver' in window) {
      var lastW = 0;
      new ResizeObserver(function (ents) {
        var w = Math.round(ents[0].contentRect.width);
        if (w !== lastW) { lastW = w; if (OUT && !FS.open) renderMap(); }
      }).observe($('mapChart'));
    } else window.addEventListener('resize', function () { if (OUT) renderMap(); });
    load();
  })();
})();
