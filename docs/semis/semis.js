





(function () {
  'use strict';


  var DEFAULT_BASE = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/semis-data/semis/';
  var BUNDLED = 'semis.json';
  var POLL_MS = 5 * 60 * 1000;
  var TICK_MS = 30 * 1000;
  var FETCH_TIMEOUT_MS = 15000;
  var FIRST_SNAPSHOT_MS = 3500;

  var HOLIDAYS = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'];
  var HALF_DAYS = ['2026-11-27', '2026-12-24', '2027-11-26'];
  var CAL_END = '2027-12-31';
  var QS = new URLSearchParams(location.search);
  var base = DEFAULT_BASE, preview = null;

  function dataHostOk(u) {
    var h = u.hostname;
    if (u.protocol === 'https:' && h === 'raw.githubusercontent.com' && /^\/lawrencekenshin\//.test(u.pathname)) return true;
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h));
  }
  if (QS.get('data')) {
    try {
      var du = new URL(QS.get('data'), location.href);
      if (dataHostOk(du)) {
        var href = du.href.split('?')[0].split('#')[0];
        if (/\.json$/i.test(href)) href = href.replace(/[^/]*$/, '');
        if (!/\/$/.test(href)) href += '/';
        base = href; preview = du.host;
      }
    } catch (e) {  }
  }
  var nowOverride = null;
  if (QS.get('now')) { var t0 = Date.parse(QS.get('now')); if (!isNaN(t0)) nowOverride = t0 - Date.now(); }
  function nowMs() { return Date.now() + (nowOverride || 0); }
  var pollMs = POLL_MS;
  if (preview && !/raw\.githubusercontent\.com/.test(preview) && +QS.get('poll') >= 2) pollMs = +QS.get('poll') * 1000;


  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: '#7E57C2', light: '#B39DDB' };
  var YEL = '#FFD84D';
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var TILES1 = ['TW_SEMI_S', 'TSMC', 'MEMORY_TW', 'TW_COMP', 'US_AI_HW', 'KR_MEM'];
  var STACK = { c2: ['TW_SEMI_S', 'TSMC', 'TPEX_SEMI', 'TW_COMP', 'ASPEED', 'TW_ORD_ELEC', 'TW_EXP_IC', 'TW_EXP_ADP', 'TW_FOREIGN'],
                c3: ['US_AI_HW', 'KR_MEM', 'WSTS', 'MU_GM', 'HYPER_CAPEX', 'KR_CHIP'] };
  var NAME = { TW_SEMI_S: 'TWSE semis 半導體業', TSMC: 'TSMC', TPEX_SEMI: 'TPEx semis (OTC)', MEMORY_TW: 'Memory: Nanya, Winbond, Macronix',
    TW_COMP: 'TWSE computers 電腦及週邊', ASPEED: 'ASPEED (server BMC chips)', TW_ORD_ELEC: 'MOEA orders: electronics 電子產品',
    TW_EXP_IC: 'MOF exports: ICs', TW_EXP_ADP: 'MOF exports: servers', TW_FOREIGN: 'Foreign net buying 外資',
    WSTS: 'WSTS chip sales', MU_GM: 'Micron gross margin', HYPER_CAPEX: 'Hyperscaler capex', US_AI_HW: 'US AI-hardware imports',
    KR_MEM: 'Korea memory exports', KR_CHIP: 'Korea chip exports',

    KR20: 'KCS chip exports, days 1–20', KR_SYS: 'Korea system-chip exports',
    HYNIX_RS63: 'SK Hynix vs SMH (in USD)', SAMSUNG_RS63: 'Samsung vs SMH (in USD)', KRW63: 'Won vs dollar (up = stronger won)' };
  var TILE_NAME = { TW_SEMI_S: 'TWSE semis', TSMC: 'TSMC', MEMORY_TW: 'Memory (TW)', TW_COMP: 'Servers (TWSE)', US_AI_HW: 'US AI-hw imports',
    KR_MEM: 'Korea memory', TPEX_SEMI: 'TPEx semis', ASPEED: 'ASPEED', TW_ORD_ELEC: 'MOEA orders', TW_EXP_IC: 'MOF IC exports',
    TW_EXP_ADP: 'Server exports', TW_FOREIGN: 'Foreign flows', WSTS: 'WSTS', MU_GM: 'Micron GM', HYPER_CAPEX: 'Hyperscaler capex',
    KR_CHIP: 'Korea chips', KR20: 'Korea 20-day', KR_SYS: 'System chips', HYNIX_RS63: 'Hynix/SMH', SAMSUNG_RS63: 'Samsung/SMH',
    KRW63: 'Won vs $', KR_DRAM_PPI: 'DRAM / flash prices' };
  var UNIT_SHORT = { yoy3: '3-month YoY', yoyq: 'quarter YoY', level: 'gross margin', flow: '3-month net / gross traded',
    yoy_print: 'days 1–20, y/y as printed', rel63: 'vs SMH, both in USD', chg63: 'up = stronger won' };
  var CARD_OF = { US_AI_HW: 'CENSUS' };
  var AXIS_WORDS = { yoy3: '% vs a year earlier', yoyq: '% vs a year earlier', level: 'gross margin %', flow: '% of gross traded',
    yoy_print: '% vs a year earlier', rel63: '% vs SMH, 63 sessions', chg63: '% vs the dollar, 63 sessions' };

  var CHART_ID = { c2: 'chart2', c3: 'chart3', c4: 'chart4' }, RO_ID = { c2: 'ro2', c3: 'ro3', c4: 'ro4' }, LG_ID = { c2: 'lg2', c3: 'lg3', c4: 'lg4' };
  function stackKeys(key) { return key === 'c4' ? (D && D.kor ? D.kor.stack : []) : STACK[key]; }

  var HOVER = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var TAP = HOVER ? 'hover' : 'tap';
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');


  var $ = function (id) { return document.getElementById(id); };
  function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +(s.slice(8, 10) || 1)) / 864e5; }
  function isoOf(dn) { return new Date(dn * 864e5).toISOString().slice(0, 10); }
  function dnDate(dn) { return new Date(dn * 864e5); }
  function fmtDay(dn, withYear, withWd) {
    var d = dnDate(dn);
    return (withWd ? WD[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (withYear ? ', ' + d.getUTCFullYear() : '');
  }
  function fmtMonYear(dn) { var d = dnDate(dn); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function refWord(ref) { return MON[+ref.slice(5, 7) - 1] + ' ' + ref.slice(0, 4); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function bsearchLE(arr, x) { var lo = 0, hi = arr.length - 1, ans = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; }
  function lowerBound(arr, x) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; } return lo; }
  function visIdx(arr, x0, x1) { return { i0: lowerBound(arr, x0), i1: bsearchLE(arr, x1) }; }
  function ordinal(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
  function sgn(v, dp) { if (v == null || isNaN(v)) return '–'; return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(dp == null ? 1 : dp); }
  function fmtV(S, v) { return v == null ? '–' : S.unit === 'level' ? v.toFixed(1) + '%' : sgn(v, 1) + '%'; }
  function fmtLv(v) { return (v < 0 ? '−' : '') + Math.round(Math.abs(v)) + '%'; }
  function fmtAxis(v) { var a = Math.abs(v), s = a >= 1000 ? (a / 1000) + 'k' : (Math.round(a * 10) / 10).toString(); return (v < 0 ? '−' : '') + s; }
  function fmtPrice(v) { return v >= 1000 ? (v / 1000) + 'k' : v < 10 ? v.toFixed(1) : String(v); }
  function rnk(p) { var r = Math.round(p); if (r >= 100 && p < 100) r = 99; return r; }

  function topRec(S, j) { return j === S.v.length - 1 && S.now && S.now.top && rnk(S.p[j]) < 99; }


  function printWord(S, j) { return MON[+S.ref[j].slice(5, 7) - 1] + ' 1–20'; }
  function refHead(S, j) {
    var pub = fmtDay(S.t[j], false);
    if (S.daily) return '63 sessions to ' + pub;
    if (S.unit === 'yoy_print') return printWord(S, j) + ' print · public ' + pub;
    return refWord(S.ref[j]) + ' data · public ' + pub;
  }
  function refCol(S, j) {
    var pub = fmtDay(S.t[j], false);
    if (S.daily) return ['63 sessions to ' + pub, 'to ' + pub];
    if (S.unit === 'yoy_print') return [printWord(S, j) + ' print, public ' + pub, printWord(S, j) + ' · public ' + pub, 'public ' + pub];
    return [refWord(S.ref[j]) + ' data, public ' + pub, refWord(S.ref[j]) + ' · public ' + pub, MON[+S.ref[j].slice(5, 7) - 1] + ' · public ' + pub];
  }
  function dataWord(S, j) {
    if (S.daily) return '63 sessions to ' + fmtDay(S.t[j], true);
    if (S.unit === 'yoy_print') return printWord(S, j) + ', ' + S.ref[j].slice(0, 4);
    return refWord(S.ref[j]);
  }
  function lvCell(S, q) { return S.lv[q] == null ? '–' : fmtLv(S.lv[q]); }
  function setAttr(n, k, v) { if (n.getAttribute(k) !== v) n.setAttribute(k, v); }


  var fmtCache = {};
  function tzParts(epoch, tz) {
    var f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }));
    var o = {};
    f.formatToParts(new Date(epoch)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: o.weekday };
  }
  function fmtTz(epoch, tz, label, withDay) {
    var p = tzParts(epoch, tz);
    var hm0 = (p.h < 10 ? '0' : '') + p.h + ':' + (p.mi < 10 ? '0' : '') + p.mi;
    return (withDay === false ? '' : p.wd + ' ' + MON[p.mo - 1] + ' ' + p.d + ', ') + hm0 + ' ' + label;
  }
  function hm(epoch) { return fmtTz(epoch, 'America/New_York', '', false).trim(); }
  function etAndTpe(epoch) { return fmtTz(epoch, 'America/New_York', 'ET') + ' · ' + fmtTz(epoch, 'Asia/Taipei', 'Taipei'); }
  function tzOffsetMin(epoch, tz) {
    var e = Math.floor(epoch / 6e4) * 6e4, p = tzParts(e, tz);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - e) / 6e4);
  }
  function etEpoch(dn, h, m) {
    var wall = dn * 864e5 + h * 36e5 + m * 6e4, g = wall + 4 * 36e5;
    for (var i = 0; i < 3; i++) g = wall - tzOffsetMin(g, 'America/New_York') * 6e4;
    return g;
  }
  function etDayNum(epoch) { var p = tzParts(epoch, 'America/New_York'); return Date.UTC(p.y, p.mo - 1, p.d) / 864e5; }
  function ago(ms) {
    var m = Math.round(ms / 6e4);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = m / 60;
    if (h < 36) return (h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)) + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }
  var HOL = {}, HALF = {};
  HOLIDAYS.forEach(function (s) { HOL[dayNum(s)] = 1; });
  HALF_DAYS.forEach(function (s) { HALF[dayNum(s)] = 1; });
  function isSession(dn) { var wd = (dn + 4) % 7; return wd >= 1 && wd <= 5 && !HOL[dn]; }
  function nextSession(dn) { var d = dn + 1; while (!isSession(d)) d++; return d; }
  function closeHour(dn) { return HALF[dn] ? 13 : 16; }


  var mctx = document.createElement('canvas').getContext('2d');
  function textW(str, size, weight) { mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; return mctx.measureText(str).width; }


  var NS = 'http://www.w3.org/2000/svg', uid = 0;
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var TXREC = null;
  function tx(parent, x, y, str, attrs) {
    var a = attrs || {}; a.x = x; a.y = y;
    if (!a['font-family']) a['font-family'] = FONT;
    var t = el('text', a, parent); t.textContent = str;
    if (TXREC && !a.transform && str) {
      var fs = parseFloat(a['font-size']) || 12, w = textW(str, fs, a['font-weight'] || 400);
      var an = a['text-anchor'], bx = an === 'middle' ? x - w / 2 : an === 'end' ? x - w : x;
      TXREC.push({ x: bx - 2, y: y - fs * 0.82 - 1, w: w + 4, h: fs * 1.08 + 2 });
    }
    return t;
  }
  function lin(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }
  function tickStep(top, px, minPx) {
    var steps = [1, 2, 2.5, 5], mag = Math.pow(10, Math.floor(Math.log10(Math.max(top, 1e-9)))) / 10;
    for (var m = mag; m < 1e9; m *= 10) for (var i = 0; i < steps.length; i++) if (steps[i] * m / top * px >= minPx) return steps[i] * m;
    return top;
  }
  var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
  function withHalo(a) { for (var k in HALO) a[k] = HALO[k]; return a; }
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
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
  function crossLayer(svg) { return el('g', { 'pointer-events': 'none' }, svg); }
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
  function yTicks(g, Y, ticks, xR, xL, fmt, panelTop) {
    ticks.forEach(function (v) {
      var py = Y(v);
      if (panelTop != null && py < panelTop + 6) return;
      el('line', { x1: xL, x2: xR, y1: py, y2: py, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
      tx(g, xR + 5, py + 3.5, fmt(v), { fill: C.muted, 'font-size': 11, 'text-anchor': 'start' });
    });
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


  function peakDot(g, x, y, r) { el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: YEL, stroke: C.bg, 'stroke-width': r > 3 ? 1.6 : 1.3 }, g); }
  function ringDot(g, x, y, r) { el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: C.panel, stroke: YEL, 'stroke-width': 1.7 }, g); }
  function nowDot(g, x, y, r) {
    el('circle', { cx: x, cy: y, r: r + 5, fill: C.light, 'fill-opacity': 0.16, stroke: C.light, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
    el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: C.light, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
    el('circle', { cx: x, cy: y, r: r, fill: '#F3EEFF', stroke: '#fff', 'stroke-width': 1.4 }, g);
  }

  function evMark(g, x, y, r, type) {
    var s = r * 1.3, d;
    if (type === 'TT') d = 'M' + x.toFixed(1) + ' ' + (y - s).toFixed(1) + 'L' + (x + s).toFixed(1) + ' ' + (y + s * 0.8).toFixed(1) + 'L' + (x - s).toFixed(1) + ' ' + (y + s * 0.8).toFixed(1) + 'Z';
    else d = 'M' + x.toFixed(1) + ' ' + (y - s).toFixed(1) + 'L' + (x + s).toFixed(1) + ' ' + y.toFixed(1) + 'L' + x.toFixed(1) + ' ' + (y + s).toFixed(1) + 'L' + (x - s).toFixed(1) + ' ' + y.toFixed(1) + 'Z';
    el('path', { d: d, fill: YEL, stroke: C.bg, 'stroke-width': 1.1 }, g);
  }
  function nowBox(x, y, r) { return { x: x - r - 6, y: y - r - 6, w: 2 * r + 12, h: 2 * r + 12 }; }
  function pulseBox(x, y, r) { var R = (r + 2) * 2.1 + 1.5; return { x: x - R, y: y - R, w: 2 * R, h: 2 * R }; }
  function dotBox(x, y, r) { return { x: x - r - 1, y: y - r - 1, w: 2 * r + 2, h: 2 * r + 2 }; }
  function thinDots(cands, r, obstacles) {
    var kept = [], beaten = [], minD = 2 * r + 0.5;
    cands.forEach(function (c) {
      if (obstacles && obstacles.some(function (o) { return overlaps(o, dotBox(c.x, c.y, r)); })) return;
      var near = function (k) { return Math.hypot(k.x - c.x, k.y - c.y) < minD; };
      if (kept.some(near) || beaten.some(near)) beaten.push(c); else kept.push(c);
    });
    return kept;
  }


  var J = null, D = null, sel = 'TW_SEMI_S';
  var hover = { c1: null, c2: null, c3: null, c4: null };
  var GEO = { c1: null, c2: null, c3: null, c4: null };


  var SRC = { kind: null, why: '', lastErr: null, loads: 0, polls: 0, manifests: 0, docs: 0, badSha: null, badWhy: '',
    fails: 0, lastOk: 0, lastPoll: 0, older: false };


  function validate(d) {
    if (!d || typeof d !== 'object') return 'not JSON';
    if (!Array.isArray(d.smh) || d.smh.length < 100) return 'SMH series missing';
    if (!Array.isArray(d.series) || !d.series.length) return 'data series missing';
    for (var i = 0; i < d.series.length; i++) {
      var s = d.series[i];
      if (!s.pts || !s.pts.length || !s.now || !s.lv || s.pts[0].length < 4) return 'series ' + s.key + ' incomplete';
    }
    if (!d.smh_last || !Array.isArray(d.lows) || !Array.isArray(d.now)) return 'readings missing';
    return null;
  }

  function validateLive(d) {
    var bad = validate(d);
    if (bad) return bad;
    if (d.schema !== 1) return 'unknown schema ' + d.schema;
    if (d.state !== 'LIVE' && d.state !== 'CLOSED') return 'unknown state ' + d.state;
    if (typeof d.generated_at !== 'number' || !isFinite(d.generated_at)) return 'build time missing';
    if (!d.as_of || !/^\d{4}-\d\d-\d\d$/.test(d.as_of.session || '')) return 'session missing';
    if (!d.live || !d.live.smh || typeof d.live.smh.price !== 'number') return 'live block missing';
    return null;
  }
  function validateManifest(m) {
    if (!m || typeof m !== 'object') return 'not JSON';
    if (m.schema !== 1) return 'unknown schema ' + m.schema;
    if (typeof m.generated_at !== 'number' || !isFinite(m.generated_at)) return 'build time missing';
    var f = m.files && m.files['semis.json'];
    if (!f || !/^[0-9a-f]{64}$/.test(f.sha256 || '')) return 'semis.json entry missing';
    return null;
  }
  function prepare(d) {
    var P = { ser: {}, cards: {} }, pts = d.smh.map(function (p) { return { t: dayNum(p[0]), c: p[1], dd: p[2] }; }), have = {};
    pts.forEach(function (p) { have[p.t] = 1; });
    P.lows = d.lows.map(function (l) { return { t: dayNum(l.d), c: l.c, dd: l.dd, name: l.name, kind: l.kind }; });
    P.lows.forEach(function (l) { if (!have[l.t]) pts.push({ t: l.t, c: l.c, dd: l.dd, low: true }); });
    pts.sort(function (a, b) { return a.t - b.t; });
    P.xs = pts.map(function (p) { return p.t; }); P.c = pts.map(function (p) { return p.c; });
    P.lc = pts.map(function (p) { return Math.log(p.c); }); P.dd = pts.map(function (p) { return p.dd; });
    P.isLow = pts.map(function (p) { return !!p.low; });
    P.first = P.xs[0]; P.last = P.xs[P.xs.length - 1];
    P.lowAt = {}; P.lows.forEach(function (l) { P.lowAt[l.t] = l; });
    P.eps = d.eps.map(function (e) { return { t: dayNum(e.d), name: e.name }; });
    d.series.forEach(function (s) { P.ser[s.key] = prepSeries(s, P.last); });
    d.now.forEach(function (g) { g.cards.forEach(function (c) { P.cards[c.key] = c; }); });
    P.kor = prepKorea(d.korea, P, 'doc', d.built);
    return P;
  }
  function prepSeries(s, last) {
    var S = { key: s.key, short: s.short, label: s.label, unit: s.unit, unitText: s.unit_text, src: s.src, group: s.group,
      t: [], v: [], ref: [], p: [], lv: s.lv, now: s.now };
    s.pts.forEach(function (p) { S.t.push(dayNum(p[0])); S.v.push(p[1]); S.ref.push(p[2]); S.p.push(p[3]); });
    S.ev = s.ev.map(function (e) { return { t: dayNum(e[0]), type: e[1], v: e[2] }; });

    S.osc = S.daily = s.unit === 'rel63' || s.unit === 'chg63';
    S.since = s.unit === 'yoy_print' ? '2016' : '2013';

    var q = S.unit === 'yoyq' || S.unit === 'level', lp = S.t[S.t.length - 1];
    if (S.daily) S.staleAt = lp < last - 14 ? lp + 7 : null;
    else S.staleAt = lp < last - (q ? 120 : 60) ? lp + (q ? 100 : 45) : null;
    return S;
  }



  function koreaBad(K) {
    if (typeof K !== 'object') return 'not an object';
    if (!Array.isArray(K.stack) || !Array.isArray(K.series) || !Array.isArray(K.cards)) return 'stack, series or cards missing';
    for (var i = 0; i < K.series.length; i++) {
      var s = K.series[i];
      if (!s || !s.key || !Array.isArray(s.pts) || !s.pts.length || s.pts[0].length < 4 || !s.now || !s.lv || !Array.isArray(s.ev)) return 'series ' + (s && s.key) + ' incomplete';
      for (var j = 0; j < s.pts.length; j++) {
        var p = s.pts[j];
        if (!p || typeof p[0] !== 'string' || (p[1] !== null && typeof p[1] !== 'number') || typeof p[2] !== 'string' || typeof p[3] !== 'number') return 'series ' + s.key + ' has a bad reading';
      }
    }
    return null;
  }
  function prepKorea(K, P, how, built) {
    if (K == null) return null;
    var bad = koreaBad(K);
    if (bad) { if (window.console) console.warn('Korea block not shown: ' + bad); return null; }
    var ser = {};
    try { K.series.forEach(function (s) { ser[s.key] = prepSeries(s, P.last); ser[s.key].kr = true; }); }
    catch (e) { if (window.console) console.warn('Korea block not shown: ' + e.message); return null; }
    for (var k in ser) if (!P.ser[k]) P.ser[k] = ser[k];
    var stack = K.stack.filter(function (k) { return !!P.ser[k]; });
    if (!stack.length) return null;
    var cards = {}, nk = [];
    K.cards.forEach(function (c) { if (!c || !c.key) return; cards[c.key] = c; if (c.status === 'needs_key') nk.push(c); });
    return { K: K, stack: stack, cards: cards, nk: nk, how: how, built: built || '' };
  }
  function serAt(S, dn) {
    var j = bsearchLE(S.t, dn);
    return { j: j, gone: S.staleAt != null && dn > S.staleAt };
  }
  function cardFor(key) { return D.cards[CARD_OF[key] || key] || null; }
  function recentPeak(S) {
    var n = S.v.length, best = -1;
    for (var j = Math.max(0, n - 6); j < n; j++) if (best < 0 || S.v[j] > S.v[best]) best = j;
    return best;
  }


  var RANGE_MONTHS = { '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120, 'All': 0 };
  var RANGE_WORDS = { '1Y': 'last year', '2Y': 'last 2 years', '5Y': 'last 5 years', '10Y': 'last 10 years' };
  var MIN_SPAN = 120;
  var ZOOM_STEP = 1.6;
  var view = { chip: '5Y', x0: 0, x1: 0, custom: false }, renders = 0;
  function normRange(s) { if (!s) return null; var u = String(s).trim().toUpperCase(); if (u === 'ALL') return 'All'; return RANGE_MONTHS.hasOwnProperty(u) ? u : null; }
  function padFor(span) { return Math.max(4, span * 0.02); }
  function hiEdge(span) { return D.last + padFor(span); }
  function latestSpan(x0) { var b = D.last - x0; return b * 0.02 / 0.98 >= 4 ? b / 0.98 : b + 4; }
  function spanLimits() { return { min: MIN_SPAN, max: latestSpan(D.first) }; }
  function monthsBack(dn, m) {
    var d = dnDate(dn), y = d.getUTCFullYear(), mo = d.getUTCMonth() - m;
    var dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return Date.UTC(y, mo, Math.min(d.getUTCDate(), dim)) / 864e5;
  }
  function clampView(v) {
    var lim = spanLimits(), x0 = v.x0, x1 = v.x1, span = Math.max(lim.min, Math.min(lim.max, x1 - x0));
    if (Math.abs(span - (x1 - x0)) > 1e-9) { var c = (x0 + x1) / 2; x0 = c - span / 2; x1 = c + span / 2; }
    var hi = hiEdge(span);
    if (x1 > hi) { x0 -= x1 - hi; x1 = hi; }
    if (x0 < D.first) { x1 += D.first - x0; x0 = D.first; }
    return { chip: v.chip, custom: v.custom, x0: x0, x1: x1 };
  }
  function toLatest(v, x0) { return clampView({ chip: v.chip, custom: v.custom, x0: x0, x1: x0 + latestSpan(x0) }); }
  function rangeView(chip) {
    var x0 = chip === 'All' ? D.first : Math.max(D.first, monthsBack(D.last, RANGE_MONTHS[chip]));
    return toLatest({ chip: chip, custom: false }, x0);
  }
  function atLatest(v) { return v.x1 >= hiEdge(v.x1 - v.x0) - 0.01; }
  function keepRight(v) { var s = v.x1 - v.x0, x1 = hiEdge(s); return clampView({ chip: v.chip, custom: v.custom, x0: x1 - s, x1: x1 }); }
  function zoomView(v, c, f, stickRight) {
    var lim = spanLimits(), s = v.x1 - v.x0, ns = Math.max(lim.min, Math.min(lim.max, s * f));
    if (Math.abs(ns - s) < 1e-6) return v;
    var x0 = c - (c - v.x0) * ns / s, nv = clampView({ chip: v.chip, custom: true, x0: x0, x1: x0 + ns });
    return (stickRight && nv.x1 >= D.last) ? keepRight(nv) : nv;
  }
  function panView(v, dd) { return clampView({ chip: v.chip, custom: true, x0: v.x0 + dd, x1: v.x1 + dd }); }
  function sameWindow(a, b) { return Math.abs(a.x0 - b.x0) < 1e-6 && Math.abs(a.x1 - b.x1) < 1e-6; }
  function setView(nv) {
    if (nv.custom && sameWindow(nv, rangeView(nv.chip))) nv = rangeView(nv.chip);
    if (sameWindow(nv, view) && nv.custom === view.custom && nv.chip === view.chip) return false;
    view = nv; requestRender(); return true;
  }
  function spanWords() {
    if (!view.custom) return view.chip === 'All' ? 'all data since ' + dnDate(D.first).getUTCFullYear() : RANGE_WORDS[view.chip];
    var a = D.xs[Math.min(D.xs.length - 1, lowerBound(D.xs, view.x0))], b = D.xs[Math.max(0, bsearchLE(D.xs, view.x1))];
    var nb = function (str) { return str.replace(/ /g, ' '); };
    if (b - a > 150) return fmtMonYear(a) === fmtMonYear(b) ? nb(fmtMonYear(a)) : nb(fmtMonYear(a)) + ' – ' + nb(fmtMonYear(b));
    return dnDate(a).getUTCFullYear() === dnDate(b).getUTCFullYear() ? nb(fmtDay(a, false)) + ' – ' + nb(fmtDay(b, true)) : nb(fmtDay(a, true)) + ' – ' + nb(fmtDay(b, true));
  }


  var TICK_UNITS = [['w', 1], ['w', 2], ['m', 1], ['m', 2], ['m', 3], ['m', 6], ['y', 1], ['y', 2], ['y', 5], ['y', 10]];
  function genTicks(k, n, x0, x1) {
    var out = [], dn;
    if (k === 'w') {
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
  function timeTicks(x0, x1, X, fs, u0) {
    var ppd = (X(x1) - X(x0)) / (x1 - x0);
    for (var u = u0 || 0; u < TICK_UNITS.length; u++) {
      var k = TICK_UNITS[u][0], n = TICK_UNITS[u][1];
      var approx = k === 'w' ? 7 * n : k === 'm' ? 30.4 * n : 365.25 * n;
      if (approx * ppd < 24) continue;
      var t = genTicks(k, n, x0, Math.min(x1, D.last + 0.5)), need = 0, gap = Infinity;
      t.forEach(function (o) { o.w = textW(o.label, fs); need = Math.max(need, o.w); });
      for (var i = 1; i < t.length; i++) gap = Math.min(gap, X(t[i].dn) - X(t[i - 1].dn));
      if (gap >= need + 12) { t.unit = u; return t; }
    }
    var none = []; none.unit = TICK_UNITS.length; return none;
  }
  function tickUnit(pw) { return timeTicks(view.x0, view.x1, lin(view.x0, view.x1, 0, pw), 11).unit; }


  var PL = { 90: { c: '#A99CC8', op: 0.7, w: 1 }, 95: { c: '#B98AF2', op: 0.85, w: 1.15 }, 99: { c: '#D17BFF', op: 1, w: 1.4 } };
  PL[5] = PL[95];
  var PL_DASH = '6 4', PLDBG = {};
  function pctLines(g, S, Y, L, pw, top, bot, lineTop, zeroY, small) {
    var out = { g: g, L: L, pw: pw, lines: [], above: [], ys: zeroY != null ? [zeroY] : [] };
    (S.osc ? [5, 95] : [90, 95, 99]).forEach(function (q) {
      var v = S.lv[q]; if (v == null) return;
      var y = Y(v), s = ordinal(q) + ' · ' + fmtLv(v);
      if (y < lineTop) { out.above.push({ q: q, v: v, s: s }); return; }
      if (y > bot - 1) return;
      out.lines.push({ q: q, v: v, y: y, s: s }); out.ys.push(y);
    });

    var l90 = out.lines.filter(function (l) { return l.q === 90; })[0], l95 = out.lines.filter(function (l) { return l.q === 95; })[0];
    if (small && l90 && l95 && Math.abs(l90.y - l95.y) < 14) l90.nolab = true;
    return out;
  }
  function pctDraw(P, boxes) {
    P.lines.forEach(function (ln) {
      var hw = PL[ln.q].w / 2 + 0.5, cuts = [];
      (boxes || []).forEach(function (b) { if (b.y < ln.y + hw && b.y + b.h > ln.y - hw && b.x < P.L + P.pw && b.x + b.w > P.L) cuts.push([b.x - 1, b.x + b.w + 1]); });
      cuts.sort(function (a, b) { return a[0] - b[0]; });
      var x = P.L, segs = [];
      cuts.forEach(function (c) { if (c[0] > x) segs.push([x, c[0]]); x = Math.max(x, c[1]); });
      if (x < P.L + P.pw) segs.push([x, P.L + P.pw]);
      segs.forEach(function (sg) {
        if (sg[1] - sg[0] < 2) return;
        el('line', { x1: sg[0].toFixed(1), x2: sg[1].toFixed(1), y1: ln.y.toFixed(1), y2: ln.y.toFixed(1), stroke: PL[ln.q].c, 'stroke-opacity': PL[ln.q].op,
          'stroke-width': PL[ln.q].w, 'stroke-dasharray': PL_DASH, 'data-pl': ln.q }, P.g);
      });
    });
  }
  function pctLabels(g, P, L, pw, top, bot, obstacles, hit, tag) {
    var fs = 11, H = 14, placed = [], dbg = { lines: [], above: [] };
    function box(s, x, yMid) { return { x: x, y: yMid - H / 2, w: textW(s, fs, 600) + 8, h: H }; }
    function clear0(b) {
      if (b.x < L + 1 || b.x + b.w > L + pw - 1 || b.y < top + 1 || b.y + b.h > bot - 1) return false;
      return !obstacles.some(function (o) { return overlaps(o, b); }) && !placed.some(function (o) { return overlaps(o, b); });
    }
    function lineFree(b, owns, onLine) {
      var tol = onLine ? 0.5 : 2.5;
      return !P.ys.some(function (y) {
        if (!(y > b.y - 1 && y < b.y + b.h + 1)) return false;
        if (owns.some(function (o) { return Math.abs(y - o) <= 0.5; })) return false;
        return !(owns.some(function (o) { return Math.abs(y - o) <= tol; }) && (y <= b.y + 1 || y >= b.y + b.h - 1));
      });
    }
    function find(s, yMid, edge, owns) {
      owns = edge ? [] : owns || [yMid];
      var mine = function (y) { return owns.some(function (o) { return Math.abs(y - o) <= 0.5; }); };
      var w = box(s, 0, yMid).w, xs = [L + pw - 2 - w, L + 2], x, i, v, b;
      for (x = L + pw - 2 - w - 24; x > L + 2; x -= 24) xs.push(x);
      for (x = L + 26; x + w < L + pw - 2; x += 24) xs.push(x);
      var ys = edge ? [yMid] : [yMid, yMid - H / 2 - 1.5, yMid + H / 2 + 1.5];
      if (!edge) {
        var up = top, dn = bot;
        P.ys.forEach(function (y) { if (mine(y)) return; if (y < yMid) up = Math.max(up, y); else dn = Math.min(dn, y); });
        if (dn - up > H + 2.5 && Math.abs((up + dn) / 2 - yMid) < H / 2) ys.push((up + dn) / 2);
      }
      for (v = 0; v < ys.length; v++) for (i = 0; i < xs.length; i++) { b = box(s, xs[i], ys[v]); if (clear0(b) && lineFree(b, owns, ys[v] === yMid) && !(hit && hit(b))) return b; }
      if (hit) for (v = 0; v < ys.length; v++) for (i = 0; i < xs.length; i++) { b = box(s, xs[i], ys[v]); if (b.x + b.w < L + pw * 0.85 && clear0(b) && lineFree(b, owns, ys[v] === yMid)) return b; }
      return null;
    }
    function draw(b, s, q, qs) {
      el('rect', { x: b.x.toFixed(1), y: b.y.toFixed(1), width: b.w.toFixed(1), height: b.h, rx: 2, fill: C.panel, 'fill-opacity': 0.88, 'data-pll': qs || q }, g);
      tx(g, b.x + b.w / 2, b.y + b.h / 2 + 3.8, s, { fill: PL[q].c, 'font-size': fs, 'font-weight': 600, 'text-anchor': 'middle' });
      placed.push(b);
    }
    var res = P.lines.filter(function (ln) { return !ln.nolab; }).map(function (ln) { var b = find(ln.s, ln.y); if (b) placed.push(b); return { ln: ln, b: b, s: ln.s }; });
    var byY = res.slice().sort(function (p, q) { return p.ln.y - q.ln.y; }), groups = [], cur = [];
    byY.forEach(function (r) {
      if (cur.length && (r.b || r.ln.y - cur[cur.length - 1].ln.y > H + 2)) { groups.push(cur); cur = []; }
      if (!r.b) cur.push(r);
    });
    if (cur.length) groups.push(cur);
    groups.forEach(function (gr) {
      if (gr.length !== 1) return;
      var i = byY.indexOf(gr[0]), nb = [byY[i - 1], byY[i + 1]].filter(function (o) { return o && Math.abs(o.ln.y - gr[0].ln.y) <= H + 2; })
        .sort(function (p, q) { return Math.abs(p.ln.y - gr[0].ln.y) - Math.abs(q.ln.y - gr[0].ln.y); })[0];
      if (nb) { gr.push(nb); gr.sort(function (p, q) { return p.ln.y - q.ln.y; }); }
    });
    groups.forEach(function (gr) {
      if (gr.length < 2 || gr.every(function (r) { return r.b; })) return;
      gr.forEach(function (r) { if (r.b) placed.splice(placed.indexOf(r.b), 1); });
      var asc = gr.slice().sort(function (p, q) { return p.ln.v - q.ln.v; });
      var s2 = asc.map(function (r) { return ordinal(r.ln.q) + ' ' + fmtLv(r.ln.v); }).join(' · ');
      var b2 = find(s2, (gr[0].ln.y + gr[gr.length - 1].ln.y) / 2, false, gr.map(function (r) { return r.ln.y; }));
      if (b2) { placed.push(b2); asc.forEach(function (r) { r.b = b2; r.s = s2; r.qs = asc.map(function (o) { return o.ln.q; }).join(','); r.q = asc[asc.length - 1].ln.q; }); }
      else gr.forEach(function (r) { if (r.b) placed.push(r.b); });
    });
    placed = [];
    res.forEach(function (r) {
      var b = r.b, ln = r.ln;
      if (b && placed.indexOf(b) < 0) draw(b, r.s, r.q || ln.q, r.qs);
      dbg.lines.push({ q: ln.q, v: ln.v, s: ln.s, shared: r.qs ? r.s : undefined, box: b ? { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.w.toFixed(1) } : null });
    });
    if (P.above.length) {
      var yE = top + 2 + H / 2, rowsE = [yE, yE + H + 1, yE + 2 * (H + 1)].filter(function (y, i) { return !i || y + H / 2 <= top + (bot - top) * 0.5; }), got = [];
      var edgeFind = function (s) { for (var i = 0; i < rowsE.length; i++) { var b = find(s, rowsE[i], true); if (b) return b; } return null; };
      P.above.forEach(function (ln) { var b = edgeFind('↑ ' + ln.s); if (b) { got.push({ b: b, ln: ln }); placed.push(b); } });
      if (got.length < P.above.length) {
        got.forEach(function (o) { placed.splice(placed.indexOf(o.b), 1); });
        var s2 = '↑ ' + P.above.map(function (ln) { return ln.s; }).join('  '), b2 = edgeFind(s2);
        got = b2 ? [{ b: b2, ln: P.above[P.above.length - 1], s: s2 }] : [];
      } else got.forEach(function (o) { placed.splice(placed.indexOf(o.b), 1); });
      got.forEach(function (o) { var s = o.s || '↑ ' + o.ln.s; draw(o.b, s, o.ln.q); dbg.above.push({ q: o.ln.q, s: s }); });
      if (!got.length) P.above.forEach(function (ln) { dbg.above.push({ q: ln.q, s: '↑ ' + ln.s, box: null }); });
    }
    if (tag) PLDBG[tag] = dbg;
    return placed;
  }

  function stepHit(S, X, Y, x0, stopT) {
    return function (bx) {
      var a = X.inv(bx.x - 2), b = Math.min(X.inv(bx.x + bx.w + 2), stopT), yz = Y(0);
      if (b < a) return false;
      for (var j = Math.max(0, bsearchLE(S.t, a)); j < S.t.length && S.t[j] <= b; j++) {
        var yv = Y(S.v[j]), y0 = Math.min(yv, yz), y1 = Math.max(yv, yz);
        if (y0 < bx.y + bx.h + 1 && y1 > bx.y - 1) return true;
      }
      return false;
    };
  }


  function logTicks(lo, hi, Y, minPx) {
    var sets = [[1], [1, 2, 5], [1, 2, 3, 5, 7], [1, 1.5, 2, 3, 4, 5, 6, 7, 8]], best = null;
    sets.forEach(function (ms) {
      var out = [];
      for (var e = -1; e <= 6; e++) ms.forEach(function (m) { var v = Math.round(m * Math.pow(10, e) * 100) / 100; if (v >= lo && v <= hi) out.push(v); });
      out.sort(function (a, b) { return a - b; });
      var ok = true;
      for (var i = 1; i < out.length; i++) if (Math.abs(Y(out[i - 1]) - Y(out[i])) < minPx) ok = false;
      if (ok && out.length <= 6 && (!best || out.length > best.length)) best = out;
    });
    return best || [];
  }
  function eLines(g, X, x0, x1, top, bot) {
    D.eps.forEach(function (e) {
      if (e.t < x0 || e.t > x1) return;
      var px = X(e.t).toFixed(1);
      el('line', { x1: px, x2: px, y1: top, y2: bot, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: 0.35 }, g);
    });
  }
  function smhStrip(svg, X, x0, x1, L, top, w, h, ticks, o) {
    var g = el('g', {}, svg);
    panelRect(g, L, top, w, h);
    var vi = visIdx(D.xs, x0, x1), lo = Infinity, hi = -Infinity, i;
    for (i = Math.max(0, vi.i0 - 1); i <= Math.min(D.xs.length - 1, vi.i1 + 1); i++) { lo = Math.min(lo, D.c[i]); hi = Math.max(hi, D.c[i]); }
    if (!(hi >= lo)) { lo = 1; hi = 2; }
    var ll = Math.log(lo), lh = Math.log(Math.max(hi, lo * 1.01)), pad = (lh - ll) * 0.07;
    var Yl = lin(ll - pad, lh + pad, top + h - (o.narrow ? 14 : 18), top + (o.titleRoom || 22));
    var Y = function (c) { return Yl(Math.log(c)); };
    Y.log = Yl;
    yTicks(g, Y, logTicks(lo * 0.97, hi * 1.03, Y, o.narrow ? 20 : 26), L + w, L, fmtPrice, top);
    timeGrid(g, X, ticks, top, top + h);
    eLines(g, X, x0, x1, top, top + h);
    var keep = {};
    D.lows.forEach(function (l) { var k = bsearchLE(D.xs, l.t); if (k >= 0) keep[k] = 1; });
    var P = decimate(D.xs, D.lc, Math.max(0, bsearchLE(D.xs, x0)), Math.min(D.xs.length - 1, lowerBound(D.xs, x1)), X, keep);
    el('path', { d: pathOf(P, Yl), fill: 'none', stroke: C.text, 'stroke-width': o.narrow ? 1.1 : 1.3, 'stroke-linejoin': 'round', 'clip-path': clipFor(svg, L, top, w, h) }, g);
    var ts = o.titleSize || 12.5, title = 'SMH weekly close (log)';
    tx(g, L + 8, top + 16, title, withHalo({ fill: C.text, 'font-size': ts }));
    var titleBox = { x: L + 6, y: top + 16 - ts - 1, w: textW(title, ts) + 4, h: ts + 5 };

    var dg = el('g', {}, g), snap = [], r = o.narrow ? 3.3 : 4, obs = [titleBox], seen = {};
    D.eps.forEach(function (e) { if (e.t >= x0 && e.t <= x1) seen.e = 1; });
    D.lows.forEach(function (l) {
      if (l.t < x0 || l.t > x1) return;
      var x = X(l.t), y = Y(l.c);
      if (x < L + r || x > L + w - 1 || overlaps(titleBox, dotBox(x, y, r))) return;
      if (l.kind === 'false') { ringDot(dg, x, y, r); seen.ring = 1; } else { peakDot(dg, x, y, r); seen.low = 1; }
      snap.push({ x: x, y: y, dn: l.t });
      if (/^E\d$/.test(l.name)) {

        var lw = textW(l.name, 11.5, 700), lab = function (yy) { return { x: x - lw / 2 - 1, y: yy - 10, w: lw + 2, h: 13 }; };
        var ly = [y + r + 13, y - r - 5].filter(function (yy) { return yy <= top + h - 3 && yy - 10 >= top + 1 && !overlaps(titleBox, lab(yy)); })[0];
        if (ly != null) tx(dg, x, ly, l.name, withHalo({ fill: C.white, 'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'middle' }));
      }
    });
    var li = D.xs.length - 1, nowIn = D.last >= x0 && D.last <= x1;
    var nowR = o.narrow ? 3.5 : 4, nowB = null;
    if (nowIn) { var nx = X(D.last), ny = Y(D.c[li]); nowDot(dg, nx, ny, nowR); snap.push({ x: nx, y: ny, dn: D.last }); nowB = nowBox(nx, ny, nowR); }
    return { Y: Y, snap: snap, top: top, h: h, g: el('g', {}, g), titleBox: titleBox, nowB: nowB, seen: seen, L: L, w: w };
  }


  function seriesPane(svg, S, X, x0, x1, L, top, pw, h, o) {
    var g = el('g', {}, svg), bot = top + h, n = S.t.length;
    panelRect(g, L, top, pw, h);
    var j0 = Math.max(0, bsearchLE(S.t, x0)), j1 = bsearchLE(S.t, x1), stopT = S.staleAt != null ? S.staleAt : D.last;
    var has = j1 >= 0 && stopT >= x0, lo = 0, hi = 0, j;
    if (has) for (j = j0; j <= j1; j++) { lo = Math.min(lo, S.v[j]); hi = Math.max(hi, S.v[j]); }
    if (hi - lo < 1) hi = lo + 1;
    var room = o.titleRoom || 4, sp = hi - lo, aLo = lo < 0 ? lo - sp * 0.06 : 0, aHi = hi + sp * 0.08;
    var Y = lin(aLo, aHi, bot - 2, top + room + 2);
    var step = tickStep(aHi - aLo, h - room - 4, o.minPx || 26), ticks = [];
    for (var v = Math.ceil(aLo / step - 1e-9) * step; v <= aHi + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
    yTicks(g, Y, ticks, L + pw, L, fmtAxis, top + room - 4);
    timeGrid(g, X, o.ticks, top, bot);
    var zeroY = aLo < 0 ? Y(0) : null;
    if (zeroY != null) el('line', { x1: L, x2: L + pw, y1: zeroY.toFixed(1), y2: zeroY.toFixed(1), stroke: C.muted, 'stroke-width': 1, opacity: 0.85 }, g);
    var clip = clipFor(svg, L, top, pw, h), snap = [], obstacles = [], nowXY = null;
    TXREC = [];
    var plg = el('g', {}, g);
    var pl = pctLines(plg, S, Y, L, pw, top, bot, top + room + 2, zeroY, h < 110);
    if (has) {
      var d = '', yv, xEnd = X(stopT);
      for (j = j0; j <= j1; j++) {
        var px = X(S.t[j]); yv = Y(S.v[j]);
        d += j === j0 ? 'M' + px.toFixed(1) + ' ' + yv.toFixed(1) : 'H' + px.toFixed(1) + 'V' + yv.toFixed(1);
      }
      d += 'H' + xEnd.toFixed(1);
      var yz = Y(Math.max(aLo, Math.min(aHi, 0)));
      el('path', { d: d + 'V' + yz.toFixed(1) + 'H' + X(S.t[j0]).toFixed(1) + 'Z', fill: C.fear, 'fill-opacity': 0.35, stroke: 'none', 'clip-path': clip }, g);
      el('path', { d: d, fill: 'none', stroke: C.fear, 'stroke-width': o.lw || 1.5, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
      if (S.staleAt != null && S.staleAt < x1) {
        var xe = Math.min(L + pw, X(Math.min(D.last, x1)));
        el('line', { x1: xEnd.toFixed(1), x2: xe.toFixed(1), y1: yv.toFixed(1), y2: yv.toFixed(1), stroke: C.light, 'stroke-width': 1.2, 'stroke-dasharray': '2 4', opacity: 0.5, 'clip-path': clip }, g);
        var nt = 'no update after ' + fmtDay(S.t[n - 1], true), nw = textW(nt, 11);
        var nx = Math.max(L + 4, Math.min(xEnd + 4, L + pw - nw - 4)), ny = Math.max(top + room + 14, yv - 6);
        tx(g, nx, ny, nt, withHalo({ fill: C.muted, 'font-size': 11 }));
        obstacles.push({ x: nx - 2, y: ny - 11, w: nw + 4, h: 14 });
      }
    } else {
      var msg = S.t[0] > x1 ? 'no data yet in this window' : 'no update after ' + fmtDay(S.t[n - 1], true);
      tx(g, L + pw / 2, top + h / 2 + 4, msg, { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle' });
    }
    if (o.title) {
      var ts = o.titleSize || 13;
      tx(g, L + 8, top + ts + 3, o.title, withHalo({ fill: C.white, 'font-size': ts, 'font-weight': 700 }));
      obstacles.push({ x: L + 6, y: top + 2, w: textW(o.title, ts, 700) + 4, h: ts + 5 });
    }
    var rPk = o.rPk || 4, rNow = o.rNow || 5, cands = [];
    var nowIn = has && S.staleAt == null && D.last >= x0 && D.last <= x1;
    if (nowIn) { nowXY = { x: X(D.last), y: Y(S.v[n - 1]) }; obstacles.push(nowBox(nowXY.x, nowXY.y, rNow)); }
    S.ev.forEach(function (e) {
      if (e.t < x0 || e.t > x1 || e.v == null || e.t > stopT) return;
      var x = X(e.t); if (x < L + rPk + 1 || x > L + pw - 1) return;
      cands.push({ e: e, x: x, y: Math.max(top + rPk + 2, Math.min(bot - rPk - 2, Y(e.v))) });
    });
    cands.sort(function (a, b) { return b.e.t - a.e.t; });
    var kept = thinDots(cands, rPk * 1.2, obstacles);
    var plObs = obstacles.concat(kept.map(function (k) { return dotBox(k.x, k.y, rPk * 1.3); }));
    if (nowXY) plObs.push(pulseBox(nowXY.x, nowXY.y, rNow));
    pctLabels(el('g', {}, svg), pl, L, pw, top, bot, plObs, has ? stepHit(S, X, Y, x0, stopT) : null, o.tag);
    pctDraw(pl, TXREC); TXREC = null;
    var top2 = el('g', {}, svg);
    var seen = { ser: has };
    kept.forEach(function (k) { evMark(top2, k.x, k.y, rPk, k.e.type); snap.push({ x: k.x, y: k.y, dn: k.e.t }); seen[k.e.type === 'TT' ? 'tt' : 'c0'] = 1; });
    if (nowXY) { nowDot(top2, nowXY.x, nowXY.y, rNow); snap.push({ x: nowXY.x, y: nowXY.y, dn: D.last }); seen.now = 1; }
    if (pl.lines.length || pl.above.length) seen[S.osc ? 'pl2' : 'pl'] = 1;
    return { Y: Y, snap: snap, top: top, bot: bot, S: S, stopT: stopT, marks: kept, seen: seen };
  }


  function geo1(Wraw) { var W = Math.max(280, Math.round(Wraw)), narrow = W < 640, L = narrow ? 2 : 30; return { W: W, narrow: narrow, L: L, pw: W - L - (narrow ? 32 : 42) }; }
  function drawChart1(Wraw, tu, hFs) {
    var gm = geo1(Wraw), holder = $('chart1'), W = gm.W, narrow = gm.narrow, L = gm.L, pw = gm.pw;

    var smhH = narrow ? 112 : 210, gap = narrow ? 12 : 26, mH = narrow ? 270 : 380;
    if (hFs) { gap = hFs < 420 ? 10 : narrow ? 12 : 18; var av = hFs - 24 - gap; smhH = Math.round(av * 0.34); mH = av - smhH; }
    var mTop = smhH + gap, H = mTop + mH + 24, x0 = view.x0, x1 = view.x1, X = lin(x0, x1, L, L + pw);
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu), S = D.ser[sel];
    var sm = smhStrip(svg, X, x0, x1, L, 0, pw, smhH, ticks, { narrow: narrow });
    var title = S.short + ' · ' + UNIT_SHORT[S.unit] + (S.unit === 'level' ? ' %' : ' %');
    if (!narrow && textW(AXIS_WORDS[S.unit], 11.5) < mH - 30) tx(svg, 12, mTop + mH / 2, AXIS_WORDS[S.unit], { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mTop + mH / 2) + ')' });
    var pane = seriesPane(svg, S, X, x0, x1, L, mTop, pw, mH, { ticks: ticks, title: title, titleSize: narrow ? 12.5 : 13, titleRoom: 20,
      lw: narrow ? 1.5 : 1.8, rPk: narrow ? 4 : 4.6, rNow: narrow ? 5 : 6, minPx: narrow ? 28 : 34, tag: 'c1' });

    var rS = narrow ? 2.4 : 3, sameWk = 0;
    pane.marks.forEach(function (k) {
      var i = bsearchLE(D.xs, k.e.t); if (i < 0) return;
      var i2 = Math.min(D.xs.length - 1, i + 1), f = D.xs[i2] > D.xs[i] ? (k.e.t - D.xs[i]) / (D.xs[i2] - D.xs[i]) : 0;
      var y = sm.Y.log(D.lc[i] + (D.lc[i2] - D.lc[i]) * f), b = dotBox(k.x, y, rS + 1);
      if (overlaps(sm.titleBox, b) || (sm.nowB && overlaps(sm.nowB, b))) return;
      evMark(sm.g, k.x, y, rS, k.e.type); sameWk++;
    });
    timeAxis(svg, X, ticks, H - 4, 0, W);
    setLegend('lg1', [sm.seen, pane.seen], !FS.key, sameWk > 0);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var i = dn == null ? D.xs.length - 1 : bsearchLE(D.xs, dn);
      if (dn != null && D.xs[i] >= x0 && D.xs[i] <= x1) {
        var px = X(D.xs[i]), a = serAt(S, D.xs[i]);
        el('line', { x1: px, x2: px, y1: 0, y2: mTop + mH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        el('circle', { cx: px, cy: sm.Y(D.c[i]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
        if (a.j >= 0 && !a.gone) el('circle', { cx: px, cy: pane.Y(S.v[a.j]), r: 4.5, fill: C.light, stroke: '#fff', 'stroke-width': 1.2 }, cross);
      }
      readout1(i, dn != null);
    }
    GEO.c1 = { W: W, L: L, pw: pw, X: X, set: set, snap: sm.snap.concat(pane.snap) };
    set(hover.c1);
  }

  function weekNotes(dn, keys) {
    var wk0 = dn - 6, out = [];
    D.lows.forEach(function (l) {
      if (l.t < wk0 || l.t > dn) return;
      out.push(/^E\d$/.test(l.name) ? l.name + ' low' : l.name + (l.kind === 'false' ? '' : ' low'));
    });
    keys.forEach(function (k) {
      var S = D.ser[k];
      S.ev.forEach(function (e) { if (e.t >= wk0 && e.t <= dn) out.push((keys.length > 1 ? TILE_NAME[k] + ' ' : '') + (e.type === 'TT' ? 'trough-turn ' : 'crossed above 0 ') + fmtDay(e.t, false)); });
    });
    return out;
  }
  function dateHead(i) {
    var dn = D.xs[i], frag = document.createDocumentFragment(), dd = D.dd[i];
    var tag = i === D.xs.length - 1 ? (liveIntraday() ? '(' + asofEt() + ' ET, 15-min delayed) ' : livePrelim() ? '(preliminary close) ' : '') : '';
    frag.appendChild(span('d', (D.isLow[i] ? 'Low day ' : 'Week to ') + fmtDay(dn, true, true)));
    frag.appendChild(span('', ' · SMH $' + D.c[i].toFixed(2) + ' ' + tag));
    frag.appendChild(span(dd < -0.05 ? 'down' : 'up', dd < -0.05 ? sgn(dd, 1) + '% from its 1-year high' : 'at its 1-year high'));
    return frag;
  }
  function readout1(i, picked) {
    var ro = $('ro1'), S = D.ser[sel], dn = D.xs[i], a = serAt(S, dn); clear(ro);
    ro.appendChild(dateHead(i));
    ro.appendChild(span('', ' · '));
    if (a.j < 0) ro.appendChild(span('muted', S.short + ': no data yet on this date'));
    else if (a.gone) ro.appendChild(span('muted', S.short + ': no update after ' + fmtDay(S.t[S.t.length - 1], true)));
    else {
      ro.appendChild(span('p', S.short + ' ' + fmtV(S, S.v[a.j])));
      ro.appendChild(span('', picked ? ' (' + refWord(S.ref[a.j]) + ' data, public ' + fmtDay(S.t[a.j], false) + ') · ' : ' · '));
      ro.appendChild(span('pc', ordinal(rnk(S.p[a.j])) + ' percentile'));
    }
    var notes = weekNotes(dn, [sel]);
    if (notes.length) ro.appendChild(span('pk', ' · ' + notes.join(' · ')));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any week'));
  }


  function geoS(Wraw, key) { var W = Math.max(280, Math.round(Wraw)), wide = W >= (FS.key === key ? 600 : 700), RC = wide ? 168 : 0; return { W: W, wide: wide, L: 2, RA: 32, RC: RC, pw: W - 2 - 32 - RC }; }

  function stackHead(S, L, pw, RA) {

    var j = S.t.length - 1, right = L + pw + RA, rows = [], val = fmtV(S, S.v[j]), vW = textW(val, 22, 700), stale = S.staleAt != null;
    var name = NAME[S.key];
    var o = ordinal(rnk(S.p[j])), pcs = topRec(S, j) ? ['highest since ' + S.since, 'highest', o] : [o + ' percentile', o + ' pct', o];
    if (L + 2 + textW(name, 14, 700) + 10 + textW(pcs[2], 11.5) > right - vW - 8) name = S.short;
    var nameR = L + 2 + textW(name, 14, 700) + 10, pc = pcs[2];
    for (var i = 0; i < pcs.length; i++) if (right - vW - 8 - textW(pcs[i], 11.5) >= nameR) { pc = pcs[i]; break; }
    rows.push({ x: L + 2, y: 15, s: name, fill: C.white, fs: 14, fw: 700 });
    rows.push({ x: right, y: 20, s: val, fill: stale ? C.muted : C.light, fs: 22, fw: 700, a: 'end' });
    rows.push({ x: right - vW - 8, y: 19, s: pc, fill: C.text, fs: 11.5, a: 'end', tag: 'pc' });
    var l2 = refHead(S, j) + (stale ? ' · no update since' : '');
    rows.push({ x: L + 2, y: 33, s: l2, fill: C.muted, fs: 11 });
    var acc = S.now.acc, r2 = acc != null && !stale ? (acc >= 0 ? 'accel ' : 'slowing ') + sgn(acc, 0) + ' pp' : topRec(S, j) ? o + ': ' + S.now.n_lo + ' of ' + S.now.n + ' lower' :
      S.unit === 'yoy_print' && S.now.top && !stale ? 'record of ' + S.now.n + ' prints' : '';
    if (r2 && L + 2 + textW(l2, 11) + 10 + textW(r2, 11) <= right) rows.push({ x: right, y: 33, s: r2, fill: acc != null && acc < 0 && !stale ? '#E8C547' : C.muted, fs: 11, a: 'end' });
    return { h: 42, rows: rows };
  }
  function drawStack(key, Wraw, tu, hFs) {
    var keys = stackKeys(key), gm = geoS(Wraw, key), holder = $(CHART_ID[key]), W = gm.W, wide = gm.wide;
    var L = gm.L, RA = gm.RA, RC = gm.RC, pw = gm.pw, n = keys.length;
    var smhH = wide ? 110 : 84, gap = wide ? 16 : 10, panH = wide ? 128 : 96, heads = {}, headSum = 0;
    keys.forEach(function (k) { heads[k] = wide ? { h: 0 } : stackHead(D.ser[k], L, pw, RA); headSum += heads[k].h; });
    if (hFs) {
      gap = wide ? (hFs < 400 ? 4 : 6) : 6;
      var av = hFs - 24 - n * gap - headSum;
      smhH = Math.max(wide && hFs < 400 ? 40 : 56, Math.round(av * 0.16)); panH = Math.max(56, Math.floor((av - smhH) / n));
      smhH = Math.max(40, av - n * panH);
    }
    var x0 = view.x0, x1 = view.x1, X = lin(x0, x1, L, L + pw);
    var H = smhH + n * (gap + panH) + headSum + 24;
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu);
    var sm = smhStrip(svg, X, x0, x1, L, 0, pw, smhH, ticks, { narrow: !wide, titleSize: 12, titleRoom: 20 }), snap = sm.snap.slice(), panes = [];
    var y = smhH;
    keys.forEach(function (k) {
      var S = D.ser[k], hd = heads[k];
      y += gap;
      if (!wide) {
        var gh = el('g', {}, svg);
        hd.rows.forEach(function (r) { tx(gh, r.x, y + r.y, r.s, { fill: r.fill, 'font-size': r.fs, 'font-weight': r.fw || 400, 'text-anchor': r.a || 'start', 'data-th': r.tag || null }); });
        y += hd.h;
      }
      var pane = seriesPane(svg, S, X, x0, x1, L, y, pw, panH, { ticks: ticks, title: wide ? NAME[k] : null, titleSize: 12.5, titleRoom: wide ? 18 : 3,
        lw: wide ? 1.4 : 1.2, rPk: wide ? 3.8 : 3.2, rNow: wide ? 4.5 : 3.8, minPx: wide ? 24 : 20, tag: key + k });
      snap = snap.concat(pane.snap);
      if (wide) {
        var cx = L + pw + RA + 14, cw = RC - 18, j = S.t.length - 1, stale = S.staleAt != null, yy = y + Math.min(30, panH * 0.36);
        var big = Math.max(17, Math.min(26, Math.round(panH * 0.27)));
        tx(svg, cx, yy, fmtV(S, S.v[j]), { fill: stale ? C.muted : C.light, 'font-size': big, 'font-weight': 700 });
        var o13 = ordinal(rnk(S.p[j])), acc = S.now.acc;
        var tr = topRec(S, j), sy = S.since, lines = [[tr ? ['highest since ' + sy + ' (' + o13 + ': ' + S.now.n_lo + ' of ' + S.now.n + ' lower)', 'highest since ' + sy + ' (' + o13 + ')', 'highest since ' + sy] : [o13 + ' percentile since ' + sy, o13 + ' percentile', o13 + ' pctl'], 12.5, C.text, 'pc'],
          [refCol(S, j), 11.5, C.muted],
          [stale ? ['no update since ' + fmtDay(S.t[j], true), 'no update since'] : acc != null ? [(acc >= 0 ? 'accel ' : 'slowing ') + sgn(acc, 0) + ' pp vs 3 months earlier', (acc >= 0 ? 'accel ' : 'slowing ') + sgn(acc, 0) + ' pp (3 months)', (acc >= 0 ? 'accel ' : 'slowing ') + sgn(acc, 0) + ' pp'] :
            S.unit === 'yoy_print' && S.now.top ? ['a record: highest of ' + S.now.n + ' prints', 'a record (' + S.now.n + ' prints)', 'a record'] : [UNIT_SHORT[S.unit], S.unit],
            11.5, acc != null && acc < 0 && !stale ? '#E8C547' : C.muted]];
        lines.forEach(function (r) {
          if (yy + r[1] + 4 > y + panH - 2) return;
          var s = r[0].filter(function (t0) { return textW(t0, r[1]) <= cw; })[0];
          if (!s) return;
          yy += r[1] + 4; tx(svg, cx, yy, s, { fill: r[2], 'font-size': r[1], 'data-th': r[3] || null });
        });
      }
      panes.push(pane);
      y += panH;
    });
    timeAxis(svg, X, ticks, H - 4, 0, L + pw + RA);
    setLegend(LG_ID[key], [sm.seen].concat(panes.map(function (p) { return p.seen; })), false, false);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var i = dn == null ? D.xs.length - 1 : bsearchLE(D.xs, dn), day = D.xs[i], show = dn != null && day >= x0 && day <= x1;
      if (show) {
        var px = X(day);
        el('line', { x1: px, x2: px, y1: 0, y2: H - 22, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        el('circle', { cx: px, cy: sm.Y(D.c[i]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
        panes.forEach(function (p) {
          var a = serAt(p.S, day);
          if (a.j >= 0 && !a.gone) el('circle', { cx: px, cy: Math.max(p.top + 2, Math.min(p.bot - 2, p.Y(p.S.v[a.j]))), r: 3.8, fill: C.light, stroke: '#fff', 'stroke-width': 1.1 }, cross);
        });
      }
      readoutStack(key, i, dn != null);
    }
    GEO[key] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover[key]);
  }
  function stackMinH(key) {
    var n = stackKeys(key).length, wide = fsSlot('chart').clientWidth >= 600;
    return 24 + 84 + n * (6 + (wide ? 0 : 42) + 56);
  }

  function tile(S, j, gone) {
    var c = document.createElement('div');
    c.appendChild(span('k', TILE_NAME[S.key]));
    if (j < 0) { c.appendChild(span('v', '–')); c.appendChild(span('s', 'no data yet')); c.appendChild(miniBar(null)); return c; }
    if (gone) c.className = 'gone';
    c.appendChild(span('v', fmtV(S, S.v[j])));
    c.appendChild(span('pc', ' ' + ordinal(rnk(S.p[j]))));
    var py = dnDate(S.t[j]).getUTCFullYear(), ly = dnDate(D.last).getUTCFullYear(), yr = py !== ly ? ' ’' + String(py).slice(2) : '';
    c.appendChild(span('s', gone ? 'no update since ' + (S.daily ? fmtDay(S.t[j], false) + yr : refWord(S.ref[j]).slice(0, 3) + ' ’' + S.ref[j].slice(2, 4)) :
      (S.daily ? 'to ' : 'public ') + fmtDay(S.t[j], false) + yr));
    c.appendChild(miniBar(S.p[j]));
    c.title = NAME[S.key] + ': ' + fmtV(S, S.v[j]) + ' (' + UNIT_SHORT[S.unit] + '), ' + (S.daily ? '63 sessions to ' + fmtDay(S.t[j], true) :
      (S.unit === 'yoy_print' ? printWord(S, j) + ' ' + S.ref[j].slice(0, 4) + ' print' : refWord(S.ref[j]) + ' data') + ', public ' + fmtDay(S.t[j], true)) +
      ', ' + ordinal(rnk(S.p[j])) + ' percentile since ' + S.since;
    return c;
  }

  function nkTile(c) {
    var t = node('div', 'nk');
    t.appendChild(span('k', TILE_NAME[c.key] || c.title)); t.appendChild(span('v', c.val)); t.appendChild(span('s', c.unit || ''));
    t.title = c.title + ': ' + (c.hist || c.val);
    return t;
  }
  function readoutStack(key, i, picked) {
    var ro = $(RO_ID[key]), dn = D.xs[i], keys = stackKeys(key), nk = key === 'c4' && D.kor ? D.kor.nk : []; clear(ro);
    var top = node('div', 'rg-date');
    top.appendChild(dateHead(i));
    var notes = weekNotes(dn, keys);
    if (notes.length) top.appendChild(span('pk', ' · ' + notes.join(' · ')));
    if (!picked) top.appendChild(span('muted', ' · ' + TAP + ' a panel for any week'));
    ro.appendChild(top);
    var grid = node('div', 'rg'); grid.setAttribute('data-n', String(keys.length + nk.length));
    keys.forEach(function (k) { var S = D.ser[k], a = serAt(S, dn); grid.appendChild(tile(S, a.j, a.gone)); });
    nk.forEach(function (c) { grid.appendChild(nkTile(c)); });
    ro.appendChild(grid);
  }


  var GAUGE_BANDS = [[0, 50, '#262B3D'], [50, 80, '#30335A'], [80, 90, '#41346E'], [90, 95, '#57408F'], [95, 99, '#7552BC'], [99, 100, '#A070F0']];
  var GAUGE_TICKS = [0, 50, 80, 90, 95, 99], GAUGE_TICK_PRIO = [0, 50, 90, 99, 80, 95];
  var heroNow = null, heroPk = null, gaugeKey = '';
  var PEAK_WORDS = 'Recent peak = the highest of the series’ last 6 readings, the latest one included.';
  function bandsInto(bar) {
    GAUGE_BANDS.forEach(function (b) {
      var s = document.createElement('span'); s.className = 'g-band';
      s.style.left = b[0] + '%'; s.style.width = (b[1] - b[0]) + '%'; s.style.background = b[2];
      bar.appendChild(s);
    });
  }
  function miniBar(p) {
    var b = document.createElement('span'); b.className = 'mb'; b.setAttribute('aria-hidden', 'true'); bandsInto(b);
    if (p != null) { var m = document.createElement('i'); m.className = 'mb-m'; m.style.left = Math.max(0, Math.min(100, p)).toFixed(2) + '%'; b.appendChild(m); }
    return b;
  }
  function zoneWord(r) { return r >= 95 ? 'Very high' : r >= 80 ? 'High' : r >= 20 ? 'Middle of its range' : r >= 5 ? 'Low' : 'Very low'; }
  function renderHero() {
    var sm = J.smh_last, S = D.ser[sel], n = S.t.length, j = n - 1, pk = recentPeak(S), same = pk === j, r = rnk(S.p[j]);

    $('heroK').textContent = TILE_NAME[S.key] || S.short; $('heroV').textContent = fmtV(S, S.v[j]);
    var hd = $('heroDate'); clear(hd);
    hd.textContent = refWord(S.ref[j]) + ' data · public ' + fmtDay(S.t[j], true);
    var hp = $('heroPct'); clear(hp);
    var acc = S.now.acc;
    if (topRec(S, j)) { hp.appendChild(span('hp-b', 'highest since 2013')); hp.appendChild(document.createTextNode(' (' + ordinal(r) + ' percentile: ' + S.now.n_lo + ' of ' + S.now.n + ' readings lower)')); }
    else { var h1 = span('hp-1', ''); h1.appendChild(span('hp-b', ordinal(r) + ' percentile')); h1.appendChild(document.createTextNode(' since 2013')); hp.appendChild(h1); }
    if (acc != null) {
      hp.appendChild(document.createTextNode(' '));
      var h2 = span('hp-2', '· ' + (acc >= 0 ? 'accel ' : 'slowing ') + sgn(acc, 0) + ' pp'); h2.title = 'growth now vs 3 months earlier, in percentage points';
      h2.appendChild(span('hp-3', ' vs 3 months earlier')); hp.appendChild(h2);
    }
    var pe = $('heroPeak'); clear(pe);
    pe.appendChild(span('', 'SMH $' + sm.close.toFixed(2) + ' (' + fmtDay(dayNum(sm.date), false) + (liveIntraday() ? ', ' + asofEt() + ' ET' : '') + ') · '));
    pe.appendChild(span(sm.off_high < 0 ? 'dn' : 'up', sgn(sm.off_high, 1) + '% from its 1-year high'));
    pe.appendChild(span('', ' (' + fmtDay(dayNum(sm.high_date), false) + ')'));
    if (!same) {
      pe.appendChild(span('', ' · '));
      var pkt = span('hp-rule', 'recent peak ' + fmtV(S, S.v[pk]) + ' (' + refWord(S.ref[pk]).slice(0, 3) + ') = ' + ordinal(rnk(S.p[pk])));
      pkt.title = PEAK_WORDS; pe.appendChild(pkt);
    }
    heroNow = { p: S.p[j], r: r }; heroPk = same ? null : { p: S.p[pk], r: rnk(S.p[pk]), ref: S.ref[pk] };
    var g = $('gauge1'); clear(g);
    g.setAttribute('aria-label', 'Percentile gauge since 2013 for ' + S.short + ': now ' + ordinal(r) + (heroPk ? ', recent peak ' + ordinal(heroPk.r) : ''));
    var labs = node('div', 'g-labs'); g.appendChild(labs);
    var bar = node('div', 'g-bar'); bandsInto(bar); g.appendChild(bar);
    var mk = function (cls, p) { var m = document.createElement('i'); m.className = 'g-m ' + cls; m.style.left = Math.max(0, Math.min(100, p)).toFixed(2) + '%'; bar.appendChild(m); };
    if (heroPk) mk('g-m-pk' + (Math.abs(heroPk.p - heroNow.p) < 1.5 ? ' g-m-near' : ''), heroPk.p);
    mk('g-m-now', heroNow.p);
    if (heroPk) { var pl = span('g-lab g-lab-pk', refWord(heroPk.ref).slice(0, 3) + ' peak ' + ordinal(heroPk.r)); pl.setAttribute('data-p', heroPk.p); labs.appendChild(pl); }
    var nl = span('g-lab g-lab-now', same ? 'now = recent peak · ' + ordinal(r) : 'now ' + ordinal(r)); nl.setAttribute('data-p', heroNow.p); labs.appendChild(nl);
    var tk = node('div', 'g-ticks'); g.appendChild(tk);
    GAUGE_TICKS.forEach(function (t) { var s = span('g-t', String(t)); s.setAttribute('data-t', t); tk.appendChild(s); });
    g.appendChild(span('g-cap', 'percentile since 2013 · deeper purple = rarer'));
    gaugeKey = ''; layoutGauge();
    var zl = $('zoneLine'); clear(zl);
    zl.appendChild(span('zw', zoneWord(r)));
    zl.appendChild(span('', ' — ' + S.short + (S.unit === 'level' ? ' at ' : ' growth at ') + fmtV(S, S.v[j]) + ' is higher than ' + r + '% of its readings since 2013.'));
    var sc0 = $('serCap'); clear(sc0);
    sc0.appendChild(node('b', '', S.label));
    sc0.appendChild(document.createTextNode(' · ' + S.unitText + ' · ' + S.src + (S.staleAt != null ? ' · no update after ' + fmtDay(S.t[n - 1], true) : '')));
    var rn2 = $('rightNow'); clear(rn2);
    var sc = cardFor(S.key);
    if (sc) { var b = document.createElement('b'); b.textContent = (S.key === 'US_AI_HW' ? 'US AI-hardware imports' : sc.title) + ': '; rn2.appendChild(b); rn2.appendChild(document.createTextNode(sc.hist)); }
  }
  function layoutGauge() {
    var g = $('gauge1'); if (!g || !heroNow || !g.firstChild) return;
    var W = g.clientWidth, key = W + '|' + sel; if (!W || key === gaugeKey) return;
    gaugeKey = key;
    var labs = g.querySelector('.g-labs'), Ls = [];
    Array.prototype.forEach.call(labs.children, function (s) { Ls.push({ s: s, w: s.offsetWidth, c: (+s.getAttribute('data-p') || 0) / 100 * W, row: 0 }); });
    Ls.forEach(function (o) { o.x = Math.max(0, Math.min(W - o.w, o.c - o.w / 2)); });
    if (Ls.length === 2) {
      var a = Ls[0].c <= Ls[1].c ? Ls[0] : Ls[1], b = a === Ls[0] ? Ls[1] : Ls[0], need = a.w + b.w + 8;
      if (a.x + a.w + 8 > b.x) {
        var mid = (a.c + b.c) / 2, ax = mid - 4 - a.w, bx = mid + 4;
        if (ax < 0) { bx += -ax; ax = 0; }
        if (bx + b.w > W) { ax -= bx + b.w - W; bx = W - b.w; }
        if (ax >= 0 && need <= W) { a.x = ax; b.x = bx; } else { b.row = 1; }
      }
    }
    var rows = 1;
    Ls.forEach(function (o) { o.s.style.left = o.x.toFixed(1) + 'px'; o.s.style.top = (o.row * 15) + 'px'; rows = Math.max(rows, o.row + 1); });
    labs.style.height = (rows * 15) + 'px';
    var ticks = Array.prototype.slice.call(g.querySelectorAll('.g-t')), kept = [];
    ticks.forEach(function (s) { s.style.visibility = 'hidden'; });
    GAUGE_TICK_PRIO.forEach(function (t) {
      var s = ticks.filter(function (q) { return +q.getAttribute('data-t') === t; })[0]; if (!s) return;
      var w = s.offsetWidth, x = Math.max(0, Math.min(W - w, t / 100 * W - w / 2));
      if (kept.some(function (o) { return x < o.x + o.w + 5 && x + w + 5 > o.x; })) return;
      kept.push({ x: x, w: w }); s.style.left = x.toFixed(1) + 'px'; s.style.visibility = '';
    });
  }

  function renderTiles1() {
    var box = $('tiles1'); clear(box);
    TILES1.forEach(function (k) {
      var S = D.ser[k]; if (!S) return;
      var j = S.t.length - 1, b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-k', k); b.setAttribute('aria-pressed', String(k === sel));
      var t = tile(S, j, false);
      while (t.firstChild) b.appendChild(t.firstChild);
      b.setAttribute('aria-label', 'Chart ' + NAME[k] + ': ' + fmtV(S, S.v[j]) + ', ' + ordinal(rnk(S.p[j])) + ' percentile since 2013, ' + refWord(S.ref[j]) + ' data, public ' + fmtDay(S.t[j], true));
      b.addEventListener('click', function () { pickSeries(k); });
      box.appendChild(b);
    });
  }
  function pickSeries(k) {
    if (!D.ser[k] || k === sel) return;
    var tl = $('tiles1'), y0 = tl.getBoundingClientRect().top;
    sel = k;
    try { localStorage.setItem('semisSeries', k); } catch (e) { }
    Array.prototype.forEach.call(tl.children, function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-k') === k)); });
    renderHero(); requestRender();

    requestAnimationFrame(function () {
      var dy = tl.getBoundingClientRect().top - y0;
      if (Math.abs(dy) >= 1) { if (FS.key) $('fs').scrollTop += dy; else window.scrollBy(0, dy); }
    });
  }


  var LG_KEY = {};
  function setLegend(id, seens, long, sameWk) {
    var f = {};
    seens.forEach(function (o) { for (var k in o) if (o[k]) f[k] = 1; });
    var items = [];
    if (f.low) items.push(['lg-pk', 'SMH low after a 20%+ drop']);
    if (f.ring) items.push(['lg-ring', long ? 'false start (the 6 in the indicator test)' : 'false start']);
    if (f.e) items.push(['lg-e', 'E1–E3 rally starts']);
    if (f.ser) items.push(['lg-ser', 'data as known that day']);
    if (f.tt) items.push(['lg-tt', 'trough-turn' + (sameWk && !f.c0 ? ' (small: same week on SMH)' : '')]);
    if (f.c0) items.push(['lg-c0', 'growth crossed above 0' + (sameWk ? ' (small: same week on SMH)' : '')]);
    if (f.now) items.push(['lg-now', 'now']);
    if (f.pl && f.pl2) items.push(['lg-pl', '90th · 95th · 99th percentile (5th · 95th on the price panels)']);
    else if (f.pl) items.push(['lg-pl', '90th · 95th · 99th percentile' + (long ? ' of this series' : '') + ' since 2013']);
    else if (f.pl2) items.push(['lg-pl', '5th · 95th percentile since 2013']);
    var key = JSON.stringify(items), l = $(id);
    if (!l || LG_KEY[id] === key) return;
    LG_KEY[id] = key; clear(l);
    items.forEach(function (it) {
      var s0 = span('lg-i', '');
      if (it[0]) s0.appendChild(span(it[0], ''));
      s0.appendChild(document.createTextNode(it[1])); l.appendChild(s0);
    });
  }


  function taipeiToday() { var t = new Date(nowMs() + 8 * 36e5); return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) / 864e5; }
  function calState(e) { var a = dayNum(e.d0), b = dayNum(e.d1), now = taipeiToday(); return now > b ? 'past' : now >= a ? 'today' : 'next'; }
  function calWhen(e) {
    var a = dayNum(e.d0), b = dayNum(e.d1), da = dnDate(a), db = dnDate(b), when = fmtDay(a, false), wd = WD[da.getUTCDay()];
    if (b !== a) { when += '–' + (da.getUTCMonth() === db.getUTCMonth() ? db.getUTCDate() : fmtDay(b, false)); wd += '–' + WD[db.getUTCDay()]; }
    return { when: when, wd: wd };
  }



  function isLive() { return SRC.kind === 'live'; }
  function liveIntraday() { return isLive() && J.state === 'LIVE' && !J.live.session_closed; }
  function livePrelim() { return isLive() && J.state === 'LIVE' && !!J.live.session_closed; }
  function asofEt() {
    var a = J.live && J.live.smh && J.live.smh.asof_et;
    if (a) return a;
    var m = /(\d\d:\d\d) ET/.exec((J.as_of && J.as_of.et) || '');
    return m ? m[1] : '';
  }
  function smhWords() {
    var d = fmtDay(dayNum(J.smh_last.date), false);
    return liveIntraday() ? d + ', ' + asofEt() + ' ET (15-min delayed)' : d + ' close' + (livePrelim() ? ' (preliminary)' : '');
  }
  function missedSessions(sess, t) {
    var n = 0, d = sess;
    for (var i = 0; i < 4; i++) { d = nextSession(d); if (etEpoch(d, 10, 15) <= t) n++; else break; }
    return n;
  }
  function closingDue(sess) {
    var c = etEpoch(sess, closeHour(sess), 0), tp = new Date(c + 8 * 36e5);
    var due = Date.UTC(tp.getUTCFullYear(), tp.getUTCMonth(), tp.getUTCDate(), 7, 30) - 8 * 36e5;
    return due > c ? due : due + 864e5;
  }
  function nextTick(t) {
    var nu = J.next_update && J.next_update.utc ? Date.parse(J.next_update.utc) : NaN;
    if (nu > t) return nu;
    var d = etDayNum(t);
    if (isSession(d)) {
      if (t < etEpoch(d, 9, 45)) return etEpoch(d, 9, 45);
      if (t < etEpoch(d, closeHour(d), 30)) return t;
    }
    return etEpoch(nextSession(d), 9, 45);
  }
  function whenWords(at, t) {
    if (at <= t) return 'due any minute';
    if (etDayNum(at) === etDayNum(t)) return '~' + hm(at) + ' ET';
    return '~' + hm(at) + ' ET ' + fmtDay(etDayNum(at), false, true) + ' (' + fmtTz(at, 'Asia/Taipei', 'Taipei', false) + ')';
  }
  function status() {
    var t = nowMs(), s = { chip: 'CLOSED', cls: 'closed', line: '' };
    if (!isLive()) {
      s.chip = 'SNAPSHOT'; s.cls = 'snap';
      if (loading && !SRC.why) { s.line = 'Showing the bundled snapshot while the live feed loads…'; return s; }
      s.line = 'Live feed unavailable (' + whyWords(SRC.why) + '). Showing the bundled snapshot' +
        (J.built ? ' (built ' + J.built + ')' : '') + '; it does not update by itself. Retrying every ' +
        (pollMs >= 6e4 ? Math.round(pollMs / 6e4) + ' min' : Math.round(pollMs / 1000) + ' s') + '.';
      return s;
    }
    var g = J.generated_at * 1000, age = t - g, sess = dayNum(J.as_of.session), L = J.live;
    var upd = 'Updated ' + ago(age), sessW = fmtDay(sess, false, true), miss = missedSessions(sess, t);
    s.at = g; s.age = age; s.sess = sess;
    if (g - t > 10 * 6e4) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = 'The data says it was built ' + ago(g - t).replace(' ago', '') + ' in the future: your clock or the feed clock is off.';
      return s;
    }
    if (miss >= 2) {
      s.chip = 'STALE'; s.cls = 'stale';
      s.line = upd + ' · these are the numbers of ' + sessW + (J.state === 'LIVE' && !L.session_closed ? ' (before the close)' : '') +
        ', more than one trading day old; newer data should exist by now.';
      return s;
    }
    if (J.state === 'LIVE' && !L.session_closed) {
      var closeAt = etEpoch(sess, closeHour(sess), 0);
      if (miss === 1 || t > closeAt + 45 * 6e4) {
        s.chip = 'LATE'; s.cls = 'late';
        s.line = upd + ' · these numbers are from before the close of ' + sessW + ' (SMH ~' + asofEt() + ' ET); the closing update did not arrive.';
      } else {

        var nu = J.next_update && J.next_update.utc ? Date.parse(J.next_update.utc) : NaN;
        var dueBy = (nu > g ? nu : g + 15 * 6e4) + 15 * 6e4;
        if (t <= dueBy) {
          s.chip = 'LIVE'; s.cls = 'live';
          s.line = upd + ' · next update ' + whenWords(nextTick(t), t);
        } else {
          s.chip = 'LATE'; s.cls = 'late';
          s.line = upd + ' · expected an update by ' + hm(dueBy) + ' ET; the numbers below are from then.';
        }
      }
      return s;
    }
    if (J.state === 'LIVE') {
      if (miss === 1) {
        s.chip = 'LATE'; s.cls = 'late';
        s.line = upd + ' · no update yet for ' + fmtDay(nextSession(sess), false, true) + '; the numbers below are the preliminary close of ' + sessW + '.';
      } else if (t < closingDue(sess)) {
        s.chip = 'AFTER CLOSE'; s.cls = 'after';
        s.line = upd + ' · preliminary close; the final close usually lands ~05:45–06:40 Taipei · next live update ' + whenWords(nextTick(t), t);
      } else {
        s.chip = 'LATE'; s.cls = 'late';
        s.line = upd + ' · the final close (usually ~05:45–06:40 Taipei) has not arrived; these are the preliminary closing numbers.';
      }
      return s;
    }
    if (miss === 1) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = upd + ' · no update yet for ' + fmtDay(nextSession(sess), false, true) + '; the numbers below are the close of ' + sessW + '.';
    } else s.line = upd + ' · next update ' + whenWords(nextTick(t), t);
    return s;
  }
  function whyWords(w) {
    w = w || '';
    if (/HTTP 404/.test(w)) return 'it is not published yet';
    if (/timed out|network error/.test(w)) return 'no connection to the feed';
    if (/HTTP \d/.test(w)) return 'the feed answered ' + /HTTP \d+/.exec(w)[0];
    if (/looked broken|not valid JSON|does not match|older than its manifest|could not be drawn/.test(w)) return 'the latest file failed its checks';
    return w ? 'it could not be used' : 'not loaded yet';
  }

  function refreshTrouble() { return !!SRC.lastErr && (SRC.fails >= 2 || nowMs() - (SRC.lastOk || 0) > 10 * 6e4); }
  function chipEl(s) { return span('chip chip-' + s.cls, s.chip); }
  function banner(kind, title, text) {
    var d = node('div', 'banner banner-' + kind);
    if (kind === 'bad') d.setAttribute('role', 'alert');
    d.appendChild(node('b', '', title)); d.appendChild(span('', text));
    return d;
  }

  function renderSigAsof(s) {
    var sp = $('sigSpan'), pa = $('sigAsof'); if (!sp || !pa) return;
    var d = fmtDay(dayNum(J.smh_last.date), false); clear(pa);
    if (!isLive()) {
      sp.textContent = 'as of ' + d + ' close';
      pa.appendChild(span('chip chip-closed', 'STATIC'));
      pa.appendChild(span('', 'Study readings at the ' + d + ' close; they do not update by themselves.'));
      return;
    }
    sp.textContent = liveIntraday() ? 'as of ' + d + ', ' + asofEt() + ' ET' : 'as of ' + d + ' close' + (livePrelim() ? ' (prelim.)' : '');
    pa.appendChild(chipEl(s));
    pa.appendChild(span('', 'Market and chart readings ' + (liveIntraday() ? 'as of ' + d + ', ' + asofEt() + ' ET (15-min delayed)' :
      'at the ' + d + ' close' + (livePrelim() ? ' (preliminary)' : '')) + '; they update with the page. The macro cards are updated by hand and dated in their text.'));
  }
  function renderStatus() {
    if (!J) return;
    var s = status();
    var chip = $('chip'); chip.className = 'chip chip-' + s.cls; chip.textContent = s.chip;
    var line = s.line;
    if (isLive() && refreshTrouble()) line += ' · Refresh failed ' + fmtTz(SRC.lastErr.at, 'Asia/Taipei', 'Taipei', false) +
      ' (' + whyWords(SRC.lastErr.msg) + '); the numbers are the ones built ' + hm(s.at) + ' ET.';
    $('statusLine').textContent = line;
    $('statusLine').title = !isLive() ? (SRC.why || '') : refreshTrouble() ? SRC.lastErr.msg : '';
    var parts = [];
    parts.push('SMH ' + smhWords());
    [['TW_SEMI_S', 'Taiwan'], ['US_AI_HW', 'US imports'], ['KR_MEM', 'Korea']].forEach(function (x) {
      var S = D.ser[x[0]]; if (S) parts.push(x[1] + ' ' + MON[+S.now.ref.slice(5, 7) - 1] + ' (' + fmtDay(dayNum(S.now.public), false) + ')');
    });
    $('asof').textContent = 'Latest public data: ' + parts.join(' · ');
    var nx = $('nextLine'); clear(nx);
    var up = (J.calendar || []).filter(function (e) { return calState(e) !== 'past'; }).slice(0, 1);
    if (up.length) {
      nx.appendChild(span('', 'Next: '));
      up.forEach(function (e) {
        var w = calWhen(e);
        nx.appendChild(span('', w.when));
        nx.appendChild(span('', ' ' + e.what.replace(/\s*\(.*$/, '').replace(/^MOPS company /, 'MOPS ') + (e.est ? ' (est.)' : '')));
      });
    }
    var fst = $('fsStatus'); clear(fst);
    fst.appendChild(chipEl(s));
    fst.appendChild(span('', 'SMH ' + smhWords()));
    renderSigAsof(s);


    var b = $('banners'), frag = document.createDocumentFragment();
    if (preview) frag.appendChild(banner('info', 'Preview data', isLive() ? 'Numbers below come from ' + preview + ', not the live feed.' :
      loading && !SRC.why ? 'The page is reading ' + preview + ' instead of the live feed; the bundled snapshot is shown meanwhile.' :
      'The page tried ' + preview + ' instead of the live feed; it was unavailable, so the bundled snapshot is shown.'));
    if (nowOverride) frag.appendChild(banner('info', 'Clock override', 'The page is pretending it is ' + etAndTpe(nowMs()) + '.'));
    if (isLive() && dayNum(CAL_END) - etDayNum(nowMs()) < 60) frag.appendChild(banner('warn', 'Market calendar ends ' + CAL_END,
      'After that the page assumes every weekday is a trading day, so the CLOSED / LATE / STALE labels can be wrong on holidays until the calendar is extended.'));
    if (s.cls === 'stale') frag.appendChild(banner('bad', 'The market numbers are old', 'Last update ' + etAndTpe(s.at) + ': SMH, breadth and the chart signals are from ' +
      fmtDay(s.sess, true, true) + '. Do not read them as current; each monthly reading keeps its own public date.'));
    var k = frag.textContent;
    if (b.getAttribute('data-k') !== k) { clear(b); b.appendChild(frag); b.setAttribute('data-k', k); }
  }


  function keepPlace(fn) {
    var se = document.scrollingElement || document.documentElement;
    var anchored = window.CSS && CSS.supports && CSS.supports('overflow-anchor', 'auto') && getComputedStyle(se).overflowAnchor !== 'none';
    if (anchored || FS.key || !window.scrollY) return fn();
    var top = document.querySelector('.top'), lim = top ? top.getBoundingClientRect().bottom : 0, a = null, y0 = 0;
    var n = document.querySelectorAll('#content [id]');
    for (var i = 0; i < n.length; i++) { var r = n[i].getBoundingClientRect(); if (r.height && r.top >= lim) { a = n[i]; y0 = r.top; break; } }
    var out = fn();
    if (a && a.isConnected) { var dy = a.getBoundingClientRect().top - y0; if (Math.abs(dy) >= 0.5) window.scrollBy(0, dy); }
    return out;
  }
  var CAL_SHOW = 6;
  function renderCal() {
    var ul = $('cal'), ul2 = $('cal2'); clear(ul); clear(ul2);
    var now = taipeiToday(), main = [], more = [], old = 0, cal = J.calendar || [];


    var ahead = cal.filter(function (e) { return calState(e) !== 'past'; });
    var pick = ahead.filter(function (e) { return !e.gen; }).slice(0, CAL_SHOW);
    ahead.forEach(function (e) { if (e.gen && pick.length < CAL_SHOW) pick.push(e); });
    cal.forEach(function (e) {
      var st = calState(e);
      if (st === 'past') { if (now - dayNum(e.d1) <= 7) main.push(e); else { more.push(e); old++; } }
      else if (pick.indexOf(e) >= 0) main.push(e); else more.splice(more.length - old, 0, e);
    });
    $('calMore').hidden = !more.length;
    $('calMoreSum').textContent = (old ? 'More releases (' : 'Later releases (') + more.length + ')';
    main.concat(more).forEach(function (e, idx) {
      var st = calState(e), w = calWhen(e), li = node('li', st);
      var d = node('div'); d.appendChild(span('dchip', w.when)); d.appendChild(span('wd', w.wd + (st === 'past' ? ' · done' : st === 'today' ? ' · today' : '')));
      var m = node('div'), wt = node('div', 'w', e.what);
      if (e.est) wt.appendChild(span('est', 'EST.'));
      m.appendChild(wt); m.appendChild(node('div', 'where', e.where));
      if (e.note) m.appendChild(node('div', 'n', e.note));
      li.appendChild(d); li.appendChild(m); (idx < main.length ? ul : ul2).appendChild(li);
    });
  }

  function readingsList(target, groups, only) {
    var box = $(target); clear(box);
    groups.forEach(function (gid) {
      var g = J.now.filter(function (x) { return x.id === gid; })[0]; if (!g) return;
      var cards = g.cards.filter(function (c) { return !only || only(c, gid); }); if (!cards.length) return;
      var wrap = node('div', 'rl-g'); wrap.appendChild(node('h4', '', g.title));
      if (g.note) wrap.appendChild(node('p', 'rl-note', g.note));
      cards.forEach(function (c) { wrap.appendChild(rlCard(c)); });
      box.appendChild(wrap);
    });
  }
  function rlCard(c) {
    var r = node('div', 'rl' + (c.warn ? ' warn' : '') + (c.status === 'needs_key' ? ' nk' : '')), h = node('div', 'rl-h');
    h.appendChild(node('b', '', c.title));
    var v = node('span', 'rl-v', c.val); if (c.unit) v.appendChild(node('small', '', c.unit)); h.appendChild(v);
    r.appendChild(h);
    if (c.sub) r.appendChild(node('div', 'rl-s', c.sub));
    var p = [c.pct_text].concat(c.meta || []).filter(Boolean).join(' · ');
    if (p) r.appendChild(node('div', 'rl-p', p));
    if (c.extra) r.appendChild(node('div', 'rl-x', c.extra));
    if (c.hist) r.appendChild(node('div', 'rl-hist', c.hist));
    return r;
  }

  function koreaOn() { return !!(D && D.kor); }
  function renderKorea() {
    var on = koreaOn();
    $('korea').hidden = !on; $('krMore').hidden = !on;
    if (!on) return;
    var K = D.kor.K, a = K.asof || {}, pa = $('asof4'); clear(pa);
    if (D.kor.how === 'graft') {
      pa.appendChild(span('chip chip-snap', 'SNAPSHOT'));
      pa.appendChild(span('', 'Korea numbers from the snapshot bundled with the page' + (D.kor.built ? ' (built ' + D.kor.built + ')' : '') +
        '; the live feed does not carry them yet.'));
    }
    var parts = [], d = function (x) { return fmtDay(dayNum(x), false); };
    if (a.kcs) parts.push('KCS ' + d(a.kcs));
    if (a.motir) parts.push('MOTIR ' + d(a.motir));
    if (a.prices) parts.push('Seoul close ' + d(a.prices));
    var np = K.next_print;
    if (np && np.d && /^\d{4}-\d\d-\d\d$/.test(np.d)) parts.push('next KCS print ' + fmtDay(dayNum(np.d), false, true) + (np.est ? ' (est.)' : ''));
    pa.appendChild(span('', (parts.length ? 'Latest: ' + parts.join(' · ') + ' · ' : '') + 'Seoul dates, each reading on its public date'));
    var rn = $('krNow'); clear(rn);
    (K.right_now || []).forEach(function (t, i) { if (t) rn.appendChild(node('span', i ? 'box-p' : '', t)); });
    if (!rn.firstChild) rn.textContent = 'No Korea reading in this build.';
    var box = $('krList'); clear(box);
    var wrap = node('div', 'rl-g');
    K.cards.forEach(function (c) { if (c && c.title) wrap.appendChild(rlCard(c)); });
    box.appendChild(wrap);
    $('krAttr').textContent = K.attribution || '';
  }
  function koreaFailed(e) {
    if (window.console) console.warn('Korea card hidden: ' + (e && e.message));
    if (D) D.kor = null;
    $('korea').hidden = true; $('krMore').hidden = true;
  }
  function renderTaiwanText() {
    var A = {}; (J.asof || []).forEach(function (a) { A[a.k] = a.v; });
    var pa = $('asof2'); clear(pa);
    pa.appendChild(span('', 'Monthly data · each reading on its public date'));
    var sl = $('twSlow'); clear(sl);
    var warns = [];
    J.now.forEach(function (g) { if (g.id === 'tw-chip' || g.id === 'tw-server') g.cards.forEach(function (c) { if (c.warn) warns.push(c); }); });
    warns.forEach(function (c, i) {
      var p = node('span', i ? 'box-p' : '');
      var b = document.createElement('b'); b.textContent = c.title; p.appendChild(b);
      p.appendChild(document.createTextNode(' ' + c.val + ' (' + c.unit + '): ' + c.pct_text + '. ' + c.hist));
      sl.appendChild(p);
    });
    if (!warns.length) sl.textContent = 'No Taiwan series is slowing hard right now.';
    readingsList('twList', ['tw-chip', 'tw-server', 'trade'], function (c, gid) { return !(gid === 'trade' && c.key === 'KR_MEM'); });
  }

  function gpuDay(col) {
    if (col.asof && /^\d{4}-\d\d-\d\d$/.test(col.asof)) return col.asof;
    var g = J.sources && J.sources.GPU && J.sources.GPU.last_public;
    return g && /^\d{4}-\d\d-\d\d/.test(g.public || '') ? g.public.slice(0, 10) : col.first;
  }
  function renderHardwareText() {
    var hw = J.hardware || {}, pa = $('asof3'); clear(pa);
    function stat(x) {
      if (!x) return null;
      if (x.status === 're-checked') return ['chip-done', 'RE-CHECKED', fmtDay(dayNum(x.updated), false)];
      return x.status === 'first pass' ? ['chip-late', 'FIRST PASS', fmtDay(dayNum(x.updated), false)] : ['chip-late', 'IN PROGRESS', 'still being built'];
    }
    var t = stat(hw.trade), m = stat(hw.memory), col = hw.collector, has = col && col.table && col.table.length;

    var parts = [];
    if (t && m && t[1] === m[1] && t[2] === m[2]) parts.push(['trade + memory calls · ' + t[2], 'Trade history 2014+: US AI-hardware imports, Korea memory exports, lead/lag vs SMH · ' + (hw.trade.recheck || '') + ' | Memory-price calls vs MU and SMH · ' + (hw.memory.recheck || '')]);
    else {
      if (t) parts.push(['trade · ' + t[2] + (t[1] === 'RE-CHECKED' ? '' : ' (' + t[1].toLowerCase() + ')'), 'Trade history 2014+: US AI-hardware imports, Korea memory exports, lead/lag vs SMH · ' + (hw.trade.recheck || '')]);
      if (m) parts.push(['memory calls · ' + m[2] + (m[1] === 'RE-CHECKED' ? '' : ' (' + m[1].toLowerCase() + ')'), 'Memory-price calls vs MU and SMH · ' + (hw.memory.recheck || '')]);
    }
    if (col) {
      var gd = has ? gpuDay(col) : null;
      parts.push([!has ? 'GPU prices: in progress' : gd && col.first && gd > col.first ? 'GPU prices: latest list prices (' + fmtDay(dayNum(gd), false) + ')' :
        'GPU prices: first record (' + fmtDay(dayNum(col.first), false) + ')', 'GPU rental list prices · a dated baseline, not a signal' +
        (col.first ? ' · collected daily since ' + fmtDay(dayNum(col.first), true) : '')]);
    }
    if (J.census) parts.push(['Census 2023+', 'US AI-hardware imports, 2023+ (Census) · monthly table in "GPU · CPU · memory in full"']);
    var lead = t || m;
    if (parts.length) {
      var line = span('pa', '');
      if (lead) line.appendChild(span('chip ' + lead[0], lead[1]));
      var rest = span('', ''); line.appendChild(rest);
      parts.forEach(function (it, i) { var p0 = span('', (i ? ' · ' : '') + it[0]); p0.title = it[1]; rest.appendChild(p0); });
      pa.appendChild(line);
    }
    if (m) { $('memTag').textContent = m[1]; $('memTag').className = 'chip ' + m[0]; }
    if (t) { $('tradeTag').textContent = t[1]; $('tradeTag').className = 'chip ' + t[0]; }
    var cen = J.census, note = '';
    if (cen) {
      var ct = $('censusTable'); clear(ct);
      var cap = document.createElement('caption'); cap.textContent = 'AI-hardware imports, $ billions a month'; ct.appendChild(cap);
      var hr = ct.insertRow(); ['Month', 'Total', 'y/y', '3-month y/y'].forEach(function (h) { var th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
      cen.rows.forEach(function (r) {
        var tr = ct.insertRow();
        tr.insertCell().textContent = refWord(r.m);
        tr.insertCell().textContent = '$' + r.tot.toFixed(1) + 'B';
        var c2 = tr.insertCell(); c2.textContent = r.yoy == null ? '–' : sgn(r.yoy, 0) + '%'; c2.className = r.yoy >= 0 ? 'up' : 'dn';
        tr.insertCell().textContent = r.yoy3 == null ? '–' : sgn(r.yoy3, 0) + '%';
      });
      var hs = $('censusHs'); clear(hs);
      cap = document.createElement('caption'); cap.textContent = refWord(cen.last) + ' by product (HS-6 code)'; hs.appendChild(cap);
      hr = hs.insertRow(); [['HS', ''], ['What', 'l'], ['$B', ''], ['y/y', '']].forEach(function (h) { var th = document.createElement('th'); th.textContent = h[0]; if (h[1]) th.className = h[1]; hr.appendChild(th); });
      cen.hs.forEach(function (r) {
        var tr = hs.insertRow();
        tr.insertCell().textContent = r.hs;
        var w = tr.insertCell(); w.textContent = r.name; w.className = 'l tw';
        tr.insertCell().textContent = r.v.toFixed(2);
        tr.insertCell().textContent = r.yoy == null ? '–' : sgn(r.yoy, 0) + '%';
      });
      note = 'Source: US Census Bureau international trade data (general imports, monthly value). ' + refWord(cen.last) + ' data was public ' +
        (cen.public ? fmtDay(dayNum(cen.public), true) : 'about 35 days after month end') + '. Next: ' + cen.next + '.' +
        ' This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau.';
    }
    $('censusNote').textContent = 'Source: US Census Bureau international trade data (general imports, monthly value). This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau.';
    $('censusNote2').textContent = note;
    var hn = $('hwNow'); clear(hn);
    var cc = D.cards.CENSUS, kc = D.cards.KR_MEM;
    if (cc) {
      var b = document.createElement('b'); b.textContent = 'US AI-hardware imports, ' + cc.title.replace(/ imports$/, '') + ': '; hn.appendChild(b);
      hn.appendChild(document.createTextNode(cc.val + ', ' + cc.unit + ' · ' + cc.pct_text + '. '));
    }
    if (kc) {
      var b2 = document.createElement('b'); b2.textContent = 'Korea memory-chip exports: '; hn.appendChild(b2);
      hn.appendChild(document.createTextNode(kc.val + ' (' + kc.unit + '). ' + (kc.extra || '')));
    }
    if (has) {
      var g = $('gpuTable'); clear(g);
      var cap2 = document.createElement('caption'); cap2.textContent = '$ per GPU-hour, list prices, ' + fmtDay(dayNum(gpuDay(col)), true) + '. AWS: on-demand, us-east-1. Azure: East US 2.'; g.appendChild(cap2);
      var hr2 = g.insertRow(); ['GPU', 'AWS', 'Azure', 'Azure spot'].forEach(function (h) { var th = document.createElement('th'); th.textContent = h; hr2.appendChild(th); });
      var f = function (v) { return v == null ? '–' : '$' + v.toFixed(2); };
      col.table.forEach(function (r) {
        var tr = g.insertRow();
        [r.gpu, f(r.aws), f(r.az), r.azs == null && r.azs_note ? '–*' : f(r.azs)].forEach(function (v) { tr.insertCell().textContent = v; });
      });
      $('gpuNote').textContent = 'Sources: Azure Retail Prices API and the AWS Price List bulk files (official, keyless, documented for programmatic use). ' +
        'Marketplaces such as Vast.ai and RunPod, and paid GPU indices, forbid automated collection and are not used. Spot = Azure’s posted spot list price, revised monthly.' +
        (col.table.some(function (r) { return r.azs == null && r.azs_note; }) ? ' * Azure lists spot for these sizes at the on-demand price (no discount), so no spot price is shown.' : '');
    } else { $('gpuTag').textContent = 'IN PROGRESS'; }
    readingsList('hwList', ['trade', 'us-hw'], function (c, gid) { return gid !== 'trade' || c.key === 'KR_MEM'; });
  }
  function renderSignals() {

    var box = $('sigs'), hl = $('sigHist'); clear(box); clear(hl);
    ['market', 'chart', 'macro'].forEach(function (gid) {
      var g = J.now.filter(function (x) { return x.id === gid; })[0]; if (!g) return;
      box.appendChild(node('p', 'sig-h', g.title));
      if (g.note && gid === 'chart') box.appendChild(node('p', 'sig-note', g.note));
      var grid = node('div', 'sig-grid');
      g.cards.forEach(function (c) {
        var t = node('div', 'sig' + (c.warn ? ' warn' : ''));
        t.appendChild(node('span', 'k', c.title));
        var v = node('div'); v.appendChild(node('span', 'v', c.val)); if (c.unit) v.appendChild(node('span', 'u', c.unit)); t.appendChild(v);
        var sub = [c.sub, c.pct_text].filter(Boolean).join(' · ');
        if (sub) t.appendChild(node('span', 's', sub));
        if (c.hist) { var li = node('li'); li.appendChild(node('b', '', c.title + ':')); li.appendChild(document.createTextNode(' ' + c.hist)); hl.appendChild(li); }
        grid.appendChild(t);
      });
      box.appendChild(grid);
    });
    var mg = J.now.filter(function (x) { return x.id === 'macro'; })[0];
    $('macroNote').textContent = mg && mg.note ? 'Macro: ' + mg.note : '';
  }
  function renderRallies() {
    var last = J.smh_last, t = $('rallies'); clear(t);
    var hr = t.insertRow();
    [['Rally', ''], ['Low (close)', ''], ['Drop into it', ''], ['SMH since', ''], ['SPY since', ''], ['Note', 'l']].forEach(function (h) { var th = document.createElement('th'); th.textContent = h[0]; if (h[1]) th.className = h[1]; hr.appendChild(th); });
    J.rallies.forEach(function (r) {
      var since = r.mult >= 2 ? '×' + r.mult.toFixed(2) : sgn((r.mult - 1) * 100, 0) + '%';
      var spy = r.spy == null ? '–' : (r.spy >= 2 ? '×' + r.spy.toFixed(2) : sgn((r.spy - 1) * 100, 0) + '%');
      var note = r.label + (r.peak != null ? '; peak +' + r.peak.toFixed(1) + '% on ' + fmtDay(dayNum(r.peak_d), false) : '');
      var tr = t.insertRow();
      var c0 = tr.insertCell(); var b = document.createElement('b'); b.textContent = r.name; c0.appendChild(b);
      tr.insertCell().textContent = fmtDay(dayNum(r.d), true) + ' · ' + r.c.toFixed(2);
      var c2 = tr.insertCell(); c2.textContent = sgn(r.dd, 0) + '%'; c2.className = 'dn';
      var c3 = tr.insertCell(); c3.textContent = since; c3.className = 'up';
      tr.insertCell().textContent = spy;
      var c5 = tr.insertCell(); c5.textContent = note; c5.className = 'l tw';
    });
    $('ralliesCap').textContent = 'SMH adjusted closes; "since" runs to the ' + fmtDay(dayNum(last.date), true) + (liveIntraday() ? ' price at ' + asofEt() + ' ET (15-min delayed). ' : livePrelim() ? ' close (preliminary). ' : ' close. ') +
      'The hard-evidence comparison below (×4.38 vs ×7.06, ×2.40 vs ×3.32) runs to the Sep 21, 2026 close, as in the study.';
  }
  function renderCands() {
    var desc = {
      A: ['Tier A: the price assumes about the current path', 'The growth the price already assumes is near what the business is doing now. At today’s size that means business-like compounding, not another 10×.'],
      B: ['Tier B: right profile, big open question', 'The price or the business still has a large unresolved issue.'],
      C: ['Tier C: growing fast, but the price needs more', 'The price needs more than a realistic path delivers, or the growth is cyclical.']
    };
    var box = $('cands'); clear(box);
    var cur = null, grid = null;
    J.candidates.rows.forEach(function (r) {
      if (r.tier !== cur) {
        cur = r.tier;
        var h = node('p', 'tier-h', desc[cur][0]); h.appendChild(node('small', '', desc[cur][1])); box.appendChild(h);
        grid = node('div', 'cands'); box.appendChild(grid);
      }
      var a = node('article', 'cand'), hd = node('div', 'cand-h');
      hd.appendChild(span('t', r.t)); hd.appendChild(span('n', r.name));
      hd.appendChild(span('tier', r.tier + (r.was && r.was !== r.tier ? ' (was ' + r.was + ')' : '')));
      a.appendChild(hd);
      var nd = node('div', 'nd'); nd.appendChild(document.createTextNode('Price needs ')); nd.appendChild(node('b', '', r.needs)); a.appendChild(nd);
      var row = function (lab, txt) { var d = node('div', 'row'); d.appendChild(span('', lab)); d.appendChild(document.createTextNode(txt)); a.appendChild(d); };
      row('How: ', r.needs_long);
      if (r.yard != null) row('Plain yardstick (trailing revenue): ', r.yard.toFixed(1) + '%/yr');
      row('Growing now: ', r.growing);
      row('Main risk: ', r.risk);
      grid.appendChild(a);
    });
  }
  function renderTables() {
    var t = $('serTable'); clear(t);
    var osc = Object.keys(D.ser).some(function (k) { return D.ser[k].osc; });
    var cap = document.createElement('caption'); cap.textContent = 'Latest reading of every series on this page (as known today)' +
      (osc ? '; the Korea price rows swing around 0 and show their 5th, 95th and 99th percentiles' : ''); t.appendChild(cap);
    var cols = [['Series', 'l'], ['Latest', ''], ['Data', ''], ['Public', ''], ['Pctl 2013+', ''], ['90th', 'w'], ['95th', 'w'], ['99th', 'w'], ['Unit', 'w l'], ['Source', 'w l']];
    var hr = t.insertRow();
    cols.forEach(function (c) { var th = document.createElement('th'); th.textContent = c[0]; th.className = c[1].replace('w', 'wide-only'); hr.appendChild(th); });
    Object.keys(D.ser).forEach(function (k) {
      var S = D.ser[k], j = S.t.length - 1, vals;
      try { vals = [S.label, fmtV(S, S.v[j]), dataWord(S, j), fmtDay(S.t[j], true), ordinal(rnk(S.p[j])) + (S.since !== '2013' ? ' (' + S.since + '+)' : ''), S.osc ? '5th: ' + lvCell(S, 5) : lvCell(S, 90), lvCell(S, 95), lvCell(S, 99), S.unitText, S.src]; }
      catch (e) { if (S.kr) return; throw e; }
      var r = t.insertRow();
      vals.forEach(function (v, i) { var c = r.insertCell(); c.textContent = v; c.className = (i === 0 ? 'l tw ' : '') + cols[i][1].replace('w', 'wide-only').replace(/^l$/, ''); });
    });
    var lt = $('lowTable'); clear(lt);
    cap = document.createElement('caption'); cap.textContent = 'SMH lows after a 20%+ drop, the E3 dip and the 6 false starts of the indicator test'; lt.appendChild(cap);
    hr = lt.insertRow(); ['Low', 'Date', 'SMH close', 'Off 1-yr high', 'Kind'].forEach(function (h) { var th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
    D.lows.forEach(function (l) {
      var r = lt.insertRow();
      [l.name, fmtDay(l.t, true), l.c.toFixed(2), sgn(l.dd, 1) + '%', l.kind === 'false' ? 'false start' : l.kind === 'rally' ? 'rally start' : 'low'].forEach(function (v) { r.insertCell().textContent = v; });
    });
    var wt = $('weekTable'); clear(wt);
    cap = document.createElement('caption'); cap.textContent = 'SMH, last 12 weekly closes' + (liveIntraday() ? ' (the newest is the ' + asofEt() + ' ET price, 15-min delayed)' : ''); wt.appendChild(cap);
    hr = wt.insertRow(); ['Week to', 'SMH close', 'Off 1-yr high'].forEach(function (h) { var th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
    for (var i = D.xs.length - 1, k = 0; i >= 0 && k < 12; i--) {
      if (D.isLow[i]) continue;
      var r = wt.insertRow(); k++;
      [fmtDay(D.xs[i], true, true), D.c[i].toFixed(2), sgn(D.dd[i], 1) + '%'].forEach(function (v) { r.insertCell().textContent = v; });
    }
    var al = $('asofList'); clear(al);
    (J.asof || []).forEach(function (a) { al.appendChild(node('dt', '', a.k)); al.appendChild(node('dd', '', a.v)); });
    if (koreaOn()) try {
      var K = D.kor.K, pr = K.prints || {}, ka = K.asof || {}, rows = [], f = function (x) { return fmtDay(dayNum(x), false); };
      var kp = [pr.p10, pr.p20].filter(function (x) { return x && x.public && x.ref; }).sort(function (x, y) { return x.public < y.public ? 1 : -1; })[0];
      if (kp) rows.push(['Korea customs (KCS)', MON[+kp.ref.slice(5, 7) - 1] + ' 1–' + (kp === pr.p20 ? '20' : '10') + ', ' + kp.ref.slice(0, 4) + ' print (public ' + f(kp.public) + ')']);
      if (pr.first && pr.first.ref && pr.first.public) rows.push(['Korea trade ministry (MOTIR)', refWord(pr.first.ref) + ' (public ' + f(pr.first.public) + ')']);
      if (ka.prices) rows.push(['Korean prices', 'Seoul close ' + f(ka.prices) + (ka.fx ? '; USD/KRW ' + f(ka.fx) : '') + (D.kor.how === 'graft' ? ' (bundled snapshot)' : '')]);
      rows.forEach(function (r) { al.appendChild(node('dt', '', r[0])); al.appendChild(node('dd', '', r[1])); });
    } catch (e) { if (window.console) console.warn('Korea sources line skipped: ' + e.message); }
  }
  function renderText() {
    renderStatus(); renderTiles1(); renderHero(); renderTaiwanText();
    try { renderKorea(); } catch (e) { koreaFailed(e); }
    renderHardwareText();
    renderSignals(); renderCal(); renderRallies(); renderCands(); renderTables();
    $('built').textContent = 'Page data built ' + J.built + (isLive() ? ' (live feed)' : ' (the snapshot bundled with the page)') + '. Derived values, plus public list prices, US Census totals and SMH weekly closes for context. No cookies, no tracking.';
  }


  function renderViewUi() {
    if (!D) return;
    var words = spanWords(), lim = spanLimits(), s = view.x1 - view.x0;
    Array.prototype.forEach.call(document.querySelectorAll('[data-span]'), function (n) { if (n.textContent !== words) n.textContent = words; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-range]'), function (b) {
      var mine = b.getAttribute('data-range') === view.chip;
      setAttr(b, 'aria-pressed', String(mine && !view.custom));
      b.classList.toggle('base', mine && view.custom);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-z]'), function (b) {
      var z = b.getAttribute('data-z');
      if (z === 'reset') b.disabled = !view.custom;
      else if (z === 'in') b.disabled = s <= lim.min + 1e-6;
      else if (z === 'out') b.disabled = s >= lim.max - 1e-6;
      else if (z === 'today') {
        var off = D.last <= view.x1;
        b.classList.toggle('off', off); b.disabled = off;
        if (off) setAttr(b, 'aria-hidden', 'true'); else b.removeAttribute('aria-hidden');
      }
    });
  }
  function zoomBy(f) { var latest = atLatest(view); setView(zoomView(view, latest ? D.last : (view.x0 + view.x1) / 2, f, latest)); }
  function resetView() { setView(rangeView(view.chip)); }
  function zoomCmd(z) {
    if (!D) return;
    if (z === 'in') zoomBy(1 / ZOOM_STEP);
    else if (z === 'out') zoomBy(ZOOM_STEP);
    else if (z === 'reset') resetView();
    else if (z === 'today') setView(keepRight(view));
  }
  function chooseRange(chip) {
    view = D ? rangeView(chip) : { chip: chip, x0: 0, x1: 0, custom: false };
    try { localStorage.setItem('semisRange', chip); } catch (e) { }
    hover.c1 = hover.c2 = hover.c3 = hover.c4 = null;
    if (D) requestRender(); else renderViewUiChips();
  }
  function renderViewUiChips() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-range]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-range') === view.chip)); });
  }






  var HOLD_MS = 380, lastTip = -1e9;
  var mainCtl = { view: function () { return view; }, set: setView, limits: spanLimits, clamp: clampView, keepRight: keepRight,
    atLatest: atLatest, pan: panView, zoom: zoomView, reset: resetView, cmd: zoomCmd, xs: function () { return D.xs; }, last: function () { return D.last; } };
  function attachGestures(holder, key, ctl) {
    ctl = ctl || mainCtl;
    var ptrs = {}, count = 0, mode = null, g0 = null, rect = null, lastTap = null, engaged = false, tip = null, tipTimer = 0, lastType = 'mouse';
    function showTip() {
      var t = performance.now();
      if (t - lastTip < 20000) return;
      lastTip = t;
      if (!tip) { tip = document.createElement('div'); tip.className = 'zoomtip'; tip.setAttribute('aria-hidden', 'true'); holder.appendChild(tip); }
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
      if (i < 0) i = 0;
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
      if (!D || !G()) return;
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
      if (!D || !G()) return;
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
        if (lastTap && t - lastTap.t < 350 && Math.abs(p.x - lastTap.x) < 30 && Math.abs(p.y - lastTap.y) < 30) { lastTap = null; toggleFs(key, true); }
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
    holder.addEventListener('dblclick', function (e) { if (D && lastType === 'mouse') { e.preventDefault(); toggleFs(key, true); } });
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
      if (!D || !G()) return;
      var g = G(); rect = holder.getBoundingClientRect();
      var px = pxOf(e.clientX);
      if (px < g.L || px > g.L + g.pw) { if (e.ctrlKey) e.preventDefault(); return; }
      var k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1, dx = e.deltaX * k, dy = e.deltaY * k, nv;
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      var pinch = e.ctrlKey, modZoom = e.metaKey || e.altKey;
      var sideways = !pinch && !modZoom && Math.abs(dx) > Math.abs(dy);
      if (!pinch && !modZoom && !sideways && !engaged) { showTip(); return; }
      var v = ctl.view(), s = v.x1 - v.x0;
      if (sideways) nv = ctl.pan(v, dx / g.pw * s);
      else nv = ctl.zoom(v, g.X.inv(px), Math.exp(Math.max(-300, Math.min(300, dy)) * (pinch ? 0.01 : 0.0015)), ctl.atLatest(v));
      if (sameWindow(nv, v)) { if (pinch) e.preventDefault(); return; }
      e.preventDefault();
      ctl.set(nv);
    }, { passive: false });
    holder.addEventListener('keydown', function (e) {
      if (!D || !G()) return;
      var k = e.key;
      if (k === '+' || k === '=') { e.preventDefault(); ctl.cmd('in'); return; }
      if (k === '-' || k === '_') { e.preventDefault(); ctl.cmd('out'); return; }
      if (k === '0' || k === 'Home') { e.preventDefault(); ctl.reset(); return; }
      if ((k === 'f' || k === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleFs(key); return; }
      if (k === 'Escape') { unpick(); return; }
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




  var FS = { sr: null, key: null, nodes: [], y: 0, pushed: false, pendingBack: false, queued: null, queuedPtr: false, at: -1e9, back: 0, vw: 0, vh: 0, off: 0 };
  var FS_SLOTS = ['head', 'note', 'chips', 'ro', 'bar', 'chart', 'legend', 'pick'];
  var SEC = { c1: ['now', 'ro1', 'chart1', 'lg1', 'Semis now'], c2: ['taiwan', 'ro2', 'chart2', 'lg2', 'Taiwan monthly data'], c3: ['hardware', 'ro3', 'chart3', 'lg3', 'GPU · CPU · memory'],
    c4: ['korea', 'ro4', 'chart4', 'lg4', 'Korea chip data'] };
  function fsSlot(name) { return $('fs').querySelector('[data-fs="' + name + '"]'); }
  function fsHeight(holder) { return FS.key && holder.parentNode === fsSlot('chart') ? holder.clientHeight : null; }
  function fsParts(key) {
    var s = SEC[key], sec = $(s[0]);
    return { label: s[4] + ', full screen', head: sec.querySelector('.card-head'), note: null, pick: key === 'c1' ? $('pick1') : null, ro: $(s[1]),
      bar: sec.querySelector('.zoombar'), chart: $(s[2]), legend: $(s[3]), chips: $('ranges') };
  }
  function fsMinH(key) { var short = window.innerHeight <= 540; return key === 'c1' ? (short ? 180 : 220) : stackMinH(key); }
  function fsSize() { if (FS.key) { var m = fsMinH(FS.key) + 'px'; if (fsSlot('chart').style.flexBasis !== m) fsSlot('chart').style.flexBasis = m; } }
  function fsDraw(now) { if (!FS.key || !D) return; if (now) { try { drawCharts(); } catch (e) { showFatal('The charts could not be drawn (' + e.message + ').'); } } else requestRender(); }
  function fsHint() {
    $('fsHint').textContent = HOVER ? 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click or Esc to close'
      : 'Pinch to zoom · drag sideways to move · tap to read · double-tap or ✕ to close';
  }
  function setInert(on) {
    ['.top', 'main', '.skip'].forEach(function (sel0) {
      var n = document.querySelector(sel0); if (!n) return;
      if ('inert' in n) n.inert = on;
      if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden');
    });
  }
  function fsFocus(n, ptr) { if (!n) return; n.classList.toggle('ptr-focus', !!ptr); try { n.focus({ preventScroll: true }); } catch (e) { } }
  function openFs(key, ptr) {
    if (!D || !J || FS.key) return;
    if (FS.pendingBack) { FS.queued = key; FS.queuedPtr = !!ptr; return; }
    var parts = fsParts(key); if (!parts.chart) return;
    FS.y = window.pageYOffset || document.documentElement.scrollTop || 0;
    FS.vw = window.innerWidth; FS.vh = window.innerHeight; FS.off = parts.chart.getBoundingClientRect().top;
    var moves = [];
    FS_SLOTS.forEach(function (name) {
      var n = parts[name]; if (!n || !n.parentNode) return;
      var cs = getComputedStyle(n), ph = document.createElement('div');
      ph.className = 'fs-ph'; ph.setAttribute('aria-hidden', 'true');
      ph.style.height = n.getBoundingClientRect().height + 'px'; ph.style.marginTop = cs.marginTop; ph.style.marginBottom = cs.marginBottom;
      if (cs.display === 'none') ph.style.display = 'none';
      moves.push({ n: n, ph: ph, slot: fsSlot(name) });
    });
    FS.key = key; FS.nodes = moves;
    try { if (FS.sr == null) FS.sr = history.scrollRestoration; history.scrollRestoration = 'manual'; } catch (e) { }
    try { history.pushState({ semisFs: key }, ''); FS.pushed = true; } catch (e) { FS.pushed = false; }
    document.body.style.top = -FS.y + 'px';
    document.documentElement.classList.add('fs-open');
    moves.forEach(function (m) { m.n.parentNode.insertBefore(m.ph, m.n); m.slot.appendChild(m.n); });
    var ov = $('fs');
    ov.setAttribute('aria-label', parts.label); ov.setAttribute('data-kind', key);
    fsHint();
    ov.hidden = false; ov.scrollTop = 0;
    setInert(true);
    fsSize(); renderStatus(); renderViewUi();
    fsDraw(true);
    fsFocus(parts.chart, ptr);
  }
  function closeFs(fromPop, ptr) {
    if (!FS.key) return;
    var key = FS.key, chart = fsParts(key).chart;
    FS.nodes.forEach(function (m) { if (m.ph.parentNode) m.ph.parentNode.replaceChild(m.n, m.ph); });
    FS.nodes = []; FS.key = null;
    $('fs').hidden = true; fsSlot('chart').style.flexBasis = '';
    setInert(false);
    if (J && D) { try { drawCharts(); } catch (e) { showFatal('The charts could not be drawn (' + e.message + ').'); } }
    var turned = window.innerWidth !== FS.vw || Math.abs(window.innerHeight - FS.vh) > 120;
    var docTop = turned ? chart.getBoundingClientRect().top + FS.y : 0;
    document.documentElement.classList.remove('fs-open');
    document.body.style.top = '';
    if (turned) {
      var off = Math.max(0, Math.min(FS.off, window.innerHeight * 0.4)), maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      FS.y = Math.max(0, Math.min(maxY, Math.round(docTop - off)));
    }
    window.scrollTo(0, FS.y);
    fsFocus(chart, ptr);
    if (FS.pushed && !fromPop) {
      FS.pendingBack = true; clearTimeout(FS.back);
      FS.back = setTimeout(function () { fsBackDone(); }, 1500);
      try { history.back(); } catch (e) { fsBackDone(); }
    }
    FS.pushed = false;
  }
  function fsScrollAuto() { if (FS.key || FS.pendingBack || FS.sr == null) return; try { history.scrollRestoration = FS.sr; } catch (e) { } FS.sr = null; }
  function fsBackDone() {
    clearTimeout(FS.back); FS.pendingBack = false;
    if (Math.abs((window.pageYOffset || 0) - FS.y) > 0.5) window.scrollTo(0, FS.y);
    if (FS.queued) { var q = FS.queued; FS.queued = null; openFs(q, FS.queuedPtr); } else fsScrollAuto();
  }
  function toggleFs(key, ptr) {
    var t = performance.now();
    if (t - FS.at < 350) return;
    FS.at = t;
    if (FS.key === key) closeFs(false, ptr); else if (!FS.key) openFs(key, ptr);
  }
  function initFs() {
    $('fsClose').addEventListener('click', function (e) { closeFs(false, e.detail > 0); });
    document.addEventListener('keydown', function () { var a = document.activeElement; if (a && a.classList) a.classList.remove('ptr-focus'); }, true);
    document.addEventListener('focusout', function (e) { if (e.target && e.target.classList) e.target.classList.remove('ptr-focus'); }, true);
    window.addEventListener('popstate', function () {
      if (FS.pendingBack) { fsBackDone(); return; }
      if (FS.key) { closeFs(true, true); requestAnimationFrame(function () { if (!FS.key && Math.abs((window.pageYOffset || 0) - FS.y) > 0.5) window.scrollTo(0, FS.y); fsScrollAuto(); }); }
    });
    document.addEventListener('keydown', function (e) {
      if (!FS.key) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFs(false); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call($('fs').querySelectorAll('button, [tabindex="0"], a[href]'), function (n) { return !n.disabled && n.offsetParent !== null && !n.classList.contains('off'); });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    }, true);
    if ('ResizeObserver' in window) {
      var lastS = '';
      new ResizeObserver(function (ents) {
        var r = ents[0].contentRect, sz = Math.round(r.width) + 'x' + Math.round(r.height);
        if (!FS.key || sz === lastS) return;
        lastS = sz; fsSize(); fsDraw(false);
      }).observe(fsSlot('chart'));
    }
    window.addEventListener('resize', function () { if (FS.key) { fsSize(); fsDraw(false); } });
    window.addEventListener('orientationchange', function () { if (FS.key) { fsSize(); fsDraw(false); } });
  }


  var rafPending = false;
  function drawCharts() {
    var c1 = $('chart1'), c2 = $('chart2'), c3 = $('chart3'), w1 = c1.clientWidth, w2 = c2.clientWidth, w3 = c3.clientWidth;
    var h1 = fsHeight(c1), h2 = fsHeight(c2), h3 = fsHeight(c3);

    var c4 = $('chart4'), k4 = koreaOn() && !$('korea').hidden, w4 = k4 ? c4.clientWidth : 0, h4 = k4 ? fsHeight(c4) : null;
    ['c1', 'c2', 'c3', 'c4'].forEach(function (k) { if (hover[k] != null && (hover[k] < view.x0 || hover[k] > view.x1)) hover[k] = null; });
    var u1 = tickUnit(geo1(w1).pw), u2 = tickUnit(geoS(w2, 'c2').pw), u3 = tickUnit(geoS(w3, 'c3').pw), u4 = k4 ? tickUnit(geoS(w4, 'c4').pw) : 0;
    var tu = FS.key === 'c1' ? u1 : FS.key === 'c2' ? u2 : FS.key === 'c3' ? u3 : FS.key === 'c4' ? u4 : Math.max(u1, u2, u3, u4);
    if (!FS.key || FS.key === 'c1') drawChart1(w1, tu, h1);
    if (!FS.key || FS.key === 'c2') drawStack('c2', w2, tu, h2);
    if (k4 && (!FS.key || FS.key === 'c4')) {
      try { drawStack('c4', w4, tu, h4); }
      catch (e) { koreaFailed(e); if (FS.key === 'c4') closeFs(false); }
    }
    if (!FS.key || FS.key === 'c3') drawStack('c3', w3, tu, h3);
    layoutGauge();
    renderViewUi();
    renders++;
  }
  function renderAll(strict) {
    if (!J) return null;
    $('content').hidden = false;
    try { renderText(); } catch (e) { if (strict) return e; if (window.console) console.error(e); }
    try { drawCharts(); } catch (e) { if (strict) return e; showFatal('The charts could not be drawn (' + e.message + ').'); }
    return null;
  }
  function requestRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      if (!J) return;
      try { drawCharts(); } catch (e) { showFatal('The charts could not be drawn (' + e.message + ').'); }
    });
  }
  function showFatal(msg) {
    J = null; D = null;
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'NO DATA';
    $('asof').textContent = 'Could not load the semis data.';
    $('nextLine').textContent = '';
    $('statusLine').textContent = '';
    var b = $('banners'); clear(b); b.removeAttribute('data-k');
    if (preview) b.appendChild(banner('info', 'Preview data', 'Trying to read from ' + preview + ', not the live feed.'));
    var d = node('div', 'banner banner-bad'); d.setAttribute('role', 'alert');
    d.appendChild(node('b', '', 'No numbers to show'));
    d.appendChild(span('', msg + ' Nothing is shown rather than partial numbers.'));
    var x = document.createElement('button'); x.type = 'button'; x.textContent = 'Try again'; x.addEventListener('click', function () { clear(b); load(true); });
    d.appendChild(document.createElement('br')); d.appendChild(x);
    b.appendChild(d);
  }


  function getBytes(url, name, cacheMode) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    return fetch(url, { cache: cacheMode || 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
        return r.arrayBuffer();
      }, function (e) {
        throw new Error(e && e.name === 'AbortError' ? name + ' timed out' : 'network error fetching ' + name);
      })
      .then(function (buf) { clearTimeout(timer); return buf; }, function (e) {
        clearTimeout(timer);
        throw (e && e.name === 'AbortError') ? new Error(name + ' timed out') : e;
      });
  }
  function parseJSON(buf, name) {
    try { return JSON.parse(new TextDecoder('utf-8').decode(buf)); } catch (e) { throw new Error(name + ' is not valid JSON'); }
  }
  function sha256hex(buf) {
    if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) return Promise.resolve(null);
    return crypto.subtle.digest('SHA-256', buf).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join('');
    }, function () { return null; });
  }
  function getManifest() {
    SRC.manifests++;
    var bust = Math.floor(Date.now() / 60000);
    return getBytes(base + 'manifest.json?m=' + bust, 'manifest.json').then(function (buf) {
      var m = parseJSON(buf, 'manifest.json'), bad = validateManifest(m);
      if (bad) throw new Error('manifest.json looked broken: ' + bad);
      return m;
    });
  }
  var RETRY_MS = 3000;
  function getLive(m0, again) {
    return (m0 ? Promise.resolve(m0) : getManifest()).then(function (m) {
      var f = m.files['semis.json'];
      if (f.sha256 === SRC.badSha) throw new Error(SRC.badWhy);
      SRC.docs++;
      return getBytes(base + 'semis.json?v=' + f.sha256.slice(0, 16), 'semis.json').then(function (buf) {
        var d = parseJSON(buf, 'semis.json'), bad = validateLive(d);
        if (bad) throw new Error('semis.json looked broken: ' + bad);
        return sha256hex(buf).then(function (h) {



          var older = d.generated_at < m.generated_at, newer = d.generated_at > m.generated_at;
          if (h != null && h !== f.sha256 && !newer && !older) {
            if (!again) return new Promise(function (r) { setTimeout(r, RETRY_MS); }).then(function () { return getLive(null, true); });
            throw new Error('semis.json does not match its manifest');
          }
          SRC.older = older;
          if (older) setTimeout(poll, 60000);
          return { d: d, P: prepare(d), sha: h || f.sha256 };
        });
      });
    });
  }


  function apply(d, P, kind, sha) {
    var changed = !J || SRC.kind !== kind || d.generated_at !== J.generated_at;
    var prev = { J: J, D: D, kind: SRC.kind, view: view, sel: sel, hover: { c1: hover.c1, c2: hover.c2, c3: hover.c3, c4: hover.c4 } };
    var hadView = !!D, wasLatest = hadView ? atLatest(view) : true;
    J = d; D = P; SRC.kind = kind;
    if (prev.D) ['c1', 'c2', 'c3', 'c4'].forEach(function (k) { if (hover[k] === prev.D.last && D.xs.indexOf(prev.D.last) < 0) hover[k] = D.last; });
    if (!D.ser[sel]) sel = TILES1.filter(function (k) { return D.ser[k]; })[0] || d.series[0].key;

    if (!hadView || !view.custom) view = rangeView(view.chip);
    else view = wasLatest ? toLatest(view, view.x0) : clampView(view);
    if (kind === 'live') { SRC.fails = 0; SRC.lastOk = nowMs(); }
    if (!changed) { SRC.lastErr = null; SRC.loads++; keepPlace(renderStatus); return null; }
    var fk = document.activeElement && document.activeElement.getAttribute && document.activeElement.parentNode === $('tiles1') ?
      document.activeElement.getAttribute('data-k') : null;
    var err = keepPlace(function () { return renderAll(kind === 'live'); });
    if (err) {
      var msg = 'the live data could not be drawn: ' + err.message;
      SRC.badSha = sha || null; SRC.badWhy = msg;
      J = prev.J; D = prev.D; SRC.kind = prev.kind; view = prev.view; sel = prev.sel;
      hover.c1 = prev.hover.c1; hover.c2 = prev.hover.c2; hover.c3 = prev.hover.c3; hover.c4 = prev.hover.c4;
      if (!J) { SRC.why = msg; return 'fallback'; }
      if (isLive()) SRC.lastErr = { at: nowMs(), msg: msg }; else SRC.why = msg;
      renderAll();
      return 'kept';
    }
    SRC.lastErr = null; SRC.loads++;
    if (kind === 'live') SRC.why = '';
    keepPlace(renderStatus);
    if (fk) { var nb = $('tiles1').querySelector('[data-k="' + fk + '"]'); if (nb) nb.focus({ preventScroll: true }); }
    return null;
  }
  var bundledP = null;
  function getBundled() {
    if (!bundledP) bundledP = getBytes(BUNDLED, 'the bundled semis.json', 'no-cache').then(function (buf) {
      var d = parseJSON(buf, 'the bundled semis.json'), bad = validate(d);
      if (bad) throw new Error('the bundled data looked broken: ' + bad);
      return d;
    }).catch(function (e) { bundledP = null; throw e; });
    return bundledP;
  }
  function loadBundled() {
    return getBundled().then(function (d) { if (!(J && isLive())) apply(d, prepare(d), 'snapshot'); });
  }


  function withKorea(x) {
    if (!x.d || x.d.korea !== undefined || x.P.kor) return Promise.resolve(x);
    return getBundled().then(function (b) {
      if (b && b.korea) x.P.kor = prepKorea(b.korea, x.P, 'graft', b.built);
      return x;
    }, function () { return x; });
  }
  function liveError(e) {
    SRC.fails++;
    SRC.lastErr = { at: nowMs(), msg: e.message };
  }
  var loading = false;
  function load(initial, m) {
    if (loading) return;
    loading = true;


    var snapT = initial && !J ? setTimeout(function () { if (!J) loadBundled().catch(function () { }); }, FIRST_SNAPSHOT_MS) : 0;
    getLive(m).then(withKorea).then(function (x) {
      if (J && isLive() && x.d.generated_at < J.generated_at) return;
      if (apply(x.d, x.P, 'live', x.sha) === 'fallback') return loadBundled();
    }, function (e) {
      if (J && isLive()) { liveError(e); keepPlace(renderStatus); return; }
      SRC.why = e.message;
      if (J) { keepPlace(renderStatus); return; }
      return loadBundled();
    }).catch(function (e) {
      if (!J) showFatal('Could not load the data (' + (SRC.why ? 'live feed: ' + SRC.why + '; ' : '') + e.message + ').');
      else if (window.console) console.error(e);
    }).then(function () { clearTimeout(snapT); loading = false; if (J) keepPlace(renderStatus); });
  }
  function poll() {
    if (document.hidden) return;
    if (navigator.onLine === false) return;
    SRC.polls++;
    SRC.lastPoll = Date.now();
    if (!J || !isLive()) { load(); return; }
    getManifest().then(function (m) {
      if (m.generated_at > J.generated_at) load(false, m);
      else { SRC.lastErr = null; SRC.fails = 0; SRC.lastOk = nowMs(); keepPlace(renderStatus); }
    }, function (e) { liveError(e); keepPlace(renderStatus); });
  }


  (function initState() {
    var r = null, s = null;
    try { r = normRange(localStorage.getItem('semisRange')); s = localStorage.getItem('semisSeries'); } catch (e) { }
    var params = new URLSearchParams(location.search);
    view.chip = normRange(params.get('range')) || r || '5Y';
    var ps = params.get('series');
    if (ps && TILES1.indexOf(ps) >= 0) sel = ps; else if (s && TILES1.indexOf(s) >= 0) sel = s;
    renderViewUiChips();
  })();
  Array.prototype.forEach.call(document.querySelectorAll('[data-range]'), function (b) { b.addEventListener('click', function () { chooseRange(b.getAttribute('data-range')); }); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-z]'), function (b) { b.addEventListener('click', function () { zoomCmd(b.getAttribute('data-z')); }); });
  if (HOVER) Array.prototype.forEach.call(document.querySelectorAll('[data-zoomhint]'), function (n) {
    n.textContent = 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click for full screen';
  });
  initFs();
  attachGestures($('chart1'), 'c1');
  attachGestures($('chart2'), 'c2');
  attachGestures($('chart3'), 'c3');
  attachGestures($('chart4'), 'c4');
  try {
    Object.defineProperty(window, '__semisView', { configurable: true, get: function () {
      if (!D) return null;
      return { chip: view.chip, custom: view.custom, x0: view.x0, x1: view.x1, from: isoOf(Math.floor(view.x0)), to: isoOf(Math.floor(view.x1)),
        span: view.x1 - view.x0, atLatest: atLatest(view), latest: isoOf(D.last), first: isoOf(D.first), limits: spanLimits(), renders: renders,
        title: spanWords(), sel: sel, fs: FS.key, hover: { c1: hover.c1 == null ? null : isoOf(hover.c1), c2: hover.c2 == null ? null : isoOf(hover.c2), c3: hover.c3 == null ? null : isoOf(hover.c3), c4: hover.c4 == null ? null : isoOf(hover.c4) },
        korea: D.kor ? { how: D.kor.how, stack: D.kor.stack.slice(), built: D.kor.built } : null };
    } });
    Object.defineProperty(window, '__semisPct', { configurable: true, get: function () { return D ? JSON.parse(JSON.stringify(PLDBG)) : null; } });

    Object.defineProperty(window, '__semisLive', { configurable: true, get: function () {
      var s = J ? status() : null;
      return { source: SRC.kind, why: SRC.why, lastErr: SRC.lastErr ? SRC.lastErr.msg : null, fails: SRC.fails, older: SRC.older,
        loading: loading, base: base, preview: preview, pollMs: pollMs,
        loads: SRC.loads, polls: SRC.polls, manifests: SRC.manifests, docs: SRC.docs, hidden: document.hidden,
        chip: s ? s.chip : null, cls: s ? s.cls : null, line: s ? s.line : null,
        state: J ? J.state || null : null, kind: J && J.as_of ? J.as_of.kind : null, session: J && J.as_of ? J.as_of.session : null,
        generated_at: J ? J.generated_at || null : null, smh: J ? J.smh_last.close : null, smhDate: J ? J.smh_last.date : null,
        last: D ? isoOf(D.last) : null };
    } });
  } catch (e) { }
  if ('ResizeObserver' in window) {
    var lastW = 0;
    new ResizeObserver(function (ents) {
      var w = Math.round(ents[0].contentRect.width);
      if (w !== lastW) { lastW = w; gaugeKey = ''; requestRender(); }
    }).observe($('content'));
  } else window.addEventListener('resize', function () { gaugeKey = ''; requestRender(); });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (J) keepPlace(renderStatus);
    if (Date.now() - (SRC.lastPoll || 0) > 30000) poll();
  });
  window.addEventListener('online', function () { if (Date.now() - (SRC.lastPoll || 0) > 30000) poll(); });
  setInterval(function () { if (J) keepPlace(renderStatus); }, TICK_MS);
  setInterval(poll, pollMs);
  load(true);
})();
