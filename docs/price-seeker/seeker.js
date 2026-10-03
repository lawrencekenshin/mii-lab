/* Price Seeker · preview. Big call-option piles (each stock's king node) parked far above the price, today's look-alikes
   of the META pattern, and an honest record of hits and misses. The status chip, clock, ?now= / ?data= handling and the
   NYSE calendar are copied from docs/breadth/breadth.js. Plain JS, no dependencies, no cookies. Every value from the data
   is written with textContent. The tier is never recomputed here; the page only explains it.
   Reads seeker.json version 1 (the current engine) and version 2 (node_hist, index[], q_day, closes …): anything a
   version-1 file lacks is hidden or shown as "–", never guessed. */
(function () {
  'use strict';

  // ---------- config ----------
  var LIVE_URL = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/seeker-data/seeker/seeker.json';
  var LIVE_HOST = 'lawrencekenshin.github.io';
  var POLL_FAST = 5 * 60 * 1000;      // NY 9:30-16:30 on a session day
  var POLL_SLOW = 30 * 60 * 1000;     // otherwise (catches the after-close and morning OI rebuilds)
  var TICK_MS = 30 * 1000;            // recompute ages / chip from the phone clock
  var FETCH_TIMEOUT_MS = 15000;
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: '#3987E5', light: '#8EC0FA', up: '#26A69A', down: '#EF5350', amber: '#F2B04B', gold: '#FFD84D' };
  var FONT = (getComputedStyle(document.documentElement).getPropertyValue('--font') || '').trim() || 'sans-serif';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var NY = 'America/New_York', TPE = 'Asia/Taipei';

  // NYSE calendar, copied from docs/breadth/breadth.js (same list as the data job). Extend every December.
  var HOLIDAYS = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'];
  var HALF_DAYS = ['2026-11-27', '2026-12-24', '2027-11-26'];
  var CAL_END = '2027-12-31';

  // the engine's rule; a version-1 file lacks the last three, these are the pre-registered values
  var RULE_DEF = { min_dist: 0.10, min_share: 0.15, or_min_gex_usd: 25e6, min_persist: 5, persist_window: 10, min_call_put: 2,
    max_z: 1.5, dte_lo: 2, dte_hi: 400, tierA_ret20: 0.05, tierB_growth: 0.10, tierB_min: 1000,
    min_closed: 100, test_start: '2026-10-05', borderline: { ret20: 0.01, growth: 0.02 } };
  var TEST_WRITTEN = 'Sat Oct 3, 2026';
  var TIERS = ['AB', 'A', 'B', 'C'];
  var ORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
  var PREVIEW_PAGE = /\/price-seeker-preview\//.test(location.pathname);
  var mqRM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mqRM && mqRM.matches); }

  var CALLOUTS = [
    ['Tier', 'A+B = price moving toward the pile AND calls being added. A = price moving (up 5%+ in 20 days). B = calls at the pile up 10%+ (1,000+ contracts). C = old pile; often covered calls; likely noise.'],
    ['Price → pile and To go', 'The pile is the strike where options traders’ biggest call bet sits (the king node). To go = how far the price has to rise to reach it.'],
    ['Trip', 'Start line = the price 20 days ago, flag = the pile. Green = how much of the trip is done. Red = the price went the other way.'],
    ['Last 60 days', 'The last 60 daily closes. The dashed amber line is the pile, so the gap you see is the distance left.'],
    ['Odds', 'The options’ own chance that the price trades at the pile at least once by the date shown. Priced by the market, not our forecast, and not tested. Different dates are not like-for-like.'],
    ['New calls + Held', 'Calls added at the pile over the last few sessions (changes once a day). Held dots: was this the top strike in each of the last 10 sessions, oldest on the left.'],
    ['$ in calls', 'What the calls at the pile were worth at the last saved option prices (open interest × option price × 100, expiries 2–400 days out). It is money parked at that strike, bought or sold: public data can’t say which side. Ranked by “vs daily trading” it shows this as a share of a normal day’s trading in the stock; by “$ per day left” each expiry’s money is divided by its own days to expiry and added up.'],
    ['Business', 'A business score out of 100 built from six numbers: revenue growth (on the year and on the last quarter), EPS growth, free-cash-flow growth and margin, and PEG, scored against large US companies. Green = 70 or more. Funds, and companies outside the large-company list the score covers or without enough reported numbers, have no score (–).']
  ];
  var GROUP_TEXT = {
    AB: '★ STRONGEST · price moving toward it AND calls being added',
    A: 'A · price moving toward it',
    B: 'B · calls being added',
    C: 'C · old piles: big, not growing, price not moving. Often covered calls; likely noise'
  };

  // ---------- URL params ----------
  var params = new URLSearchParams(location.search);
  var dataUrl = LIVE_URL, previewHost = null;
  // only the project's own raw GitHub files, a local test server or this page's own origin may stand in for the live feed
  function dataHostOk(u) {
    var h = u.hostname;
    if (u.protocol === 'https:' && h === 'raw.githubusercontent.com' && /^\/lawrencekenshin\//.test(u.pathname)) return true;
    if (u.origin === location.origin && /^https?:$/.test(u.protocol)) return true;
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h));
  }
  (function resolveData() {
    var dp = params.get('data');
    if (dp) {
      try {
        var u = new URL(dp, location.href);
        if (dataHostOk(u)) {
          var href = u.href.split('#')[0].split('?')[0];
          if (!/\.json$/i.test(href)) href = href.replace(/\/?$/, '/') + 'seeker.json';
          dataUrl = href; previewHost = u.host; return;
        }
      } catch (e) { /* a bad override falls through */ }
    }
    if (location.hostname !== LIVE_HOST && /^https?:$/.test(location.protocol)) {   // local preview: the file next to the page
      dataUrl = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '') + 'seeker.json';
      previewHost = location.host;
    }
  })();
  var nowOverride = null;
  if (params.get('now')) { var t0 = Date.parse(params.get('now')); if (!isNaN(t0)) nowOverride = t0 - Date.now(); }
  function now() { return Date.now() + (nowOverride || 0); }

  // ---------- small helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; if (text != null) s.textContent = text; return s; }
  function div(cls) { var d = document.createElement('div'); if (cls) d.className = cls; return d; }
  function para(cls, text) { var p = document.createElement('p'); if (cls) p.className = cls; if (text != null) p.textContent = text; return p; }
  function btn(cls, text) { var b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls; if (text != null) b.textContent = text; return b; }
  function add(parent) { for (var i = 1; i < arguments.length; i++) { var a = arguments[i]; if (a == null) continue; parent.appendChild(typeof a === 'string' ? document.createTextNode(a) : a); } return parent; }
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage off: the page still works */ } }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function safeId(s) { return String(s).replace(/[^A-Za-z0-9_-]/g, '_'); }

  // dates: day numbers (UTC days since 1970) for ET trading dates
  function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function isoOf(dn) { return new Date(dn * 864e5).toISOString().slice(0, 10); }
  function dnDate(dn) { return new Date(dn * 864e5); }
  var fmtCache = {};
  function tzParts(epoch, tz) {
    var f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }));
    var o = {};
    f.formatToParts(new Date(epoch)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: o.weekday };
  }
  function tzOffsetMin(epoch, tz) {
    var e = Math.floor(epoch / 6e4) * 6e4, p = tzParts(e, tz);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - e) / 6e4);
  }
  function etEpoch(dn, h, m) { // New York wall clock -> epoch ms
    var wall = dn * 864e5 + h * 36e5 + m * 6e4, g = wall + 4 * 36e5;
    for (var i = 0; i < 3; i++) g = wall - tzOffsetMin(g, NY) * 6e4;
    return g;
  }
  function etDayNum(epoch) { var p = tzParts(epoch, NY); return Date.UTC(p.y, p.mo - 1, p.d) / 864e5; }
  function curYear() { return tzParts(now(), NY).y; }
  function hm12(epoch, tz) { var p = tzParts(epoch, tz), h = p.h % 12 || 12; return h + ':' + pad2(p.mi) + ' ' + (p.h < 12 ? 'am' : 'pm'); }
  function etHm(epoch) { return hm12(epoch, NY) + ' ET'; }                                          // "3:40 pm ET"
  function tpeHmWd(epoch) { return hm12(epoch, TPE) + ' ' + tzParts(epoch, TPE).wd + ' Taipei'; }    // "3:40 am Sat Taipei"
  function fullTz(epoch, tz, label) { var p = tzParts(epoch, tz); return p.wd + ' ' + MON[p.mo - 1] + ' ' + p.d + ', ' + hm12(epoch, tz) + ' ' + label; }
  function etAndTpe(epoch) { return fullTz(epoch, NY, 'ET') + ' · ' + fullTz(epoch, TPE, 'Taipei'); }
  function ago(ms) {
    var m = Math.round(ms / 6e4);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = m / 60;
    if (h < 36) return (h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)) + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }
  function monD(dn, noYear) { var d = dnDate(dn), s = MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); return noYear || d.getUTCFullYear() === curYear() ? s : s + ', ' + d.getUTCFullYear(); }
  function wmd(dn, noYear) { return WD[dnDate(dn).getUTCDay()] + ' ' + monD(dn, noYear); }
  function dS(s, noYear) { return typeof s === 'string' && s.length >= 10 ? monD(dayNum(s), noYear) : '–'; }   // "Oct 16"
  function wS(s, noYear) { return typeof s === 'string' && s.length >= 10 ? wmd(dayNum(s), noYear) : '–'; }   // "Fri Oct 16"
  var HOL = {}, HALF = {};
  HOLIDAYS.forEach(function (s) { HOL[dayNum(s)] = 1; });
  HALF_DAYS.forEach(function (s) { HALF[dayNum(s)] = 1; });
  function isSession(dn) { var wd = (dn + 4) % 7; return wd >= 1 && wd <= 5 && !HOL[dn]; }
  function nextSession(dn) { var d = dn + 1; while (!isSession(d)) d++; return d; }
  function prevSession(dn) { var d = dn - 1; while (!isSession(d)) d--; return d; }
  function sessionsAfter(a, b) { var n = 0; for (var d = a + 1; d <= b; d++) if (isSession(d)) n++; return n; }   // sessions in (a, b]
  function nthSessionFrom(dn, k) { var d = dn; while (!isSession(d)) d++; for (var i = 0; i < k; i++) d = nextSession(d); return d; }

  // numbers
  var NF2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var NFS = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  var NFI = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  function px(v) { return num(v) ? NF2.format(v) : '–'; }                         // prices: 2 dp
  function strike(v) { return num(v) ? NFS.format(v) : '–'; }                     // strikes: no trailing zeros, 1,100
  function int(v) { return num(v) ? NFI.format(v) : '–'; }
  function sgnInt(v) { return num(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + NFI.format(Math.abs(v)) : '–'; }
  // percents round half away from zero (0.1505 -> 15.1%, not the float-edge 15.0%)
  function r0(f) { return (f < 0 ? -1 : 1) * Math.round(Math.abs(f) * 100 + 1e-7); }
  function r1(f) { return (f < 0 ? -1 : 1) * Math.round(Math.abs(f) * 1000 + 1e-6) / 10; }
  function p0(f) { return num(f) ? r0(f) + '%' : '–'; }
  function a1(f) { return num(f) ? Math.abs(r1(f)).toFixed(1) + '%' : '–'; }     // unsigned, 1 dp
  function sp0(f) { if (!num(f)) return '–'; var r = r0(f); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%'; }
  function sp1(f) { if (!num(f)) return '–'; var r = r1(f); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1) + '%'; }
  function compactSigned(v) {
    if (!num(v)) return '–';
    var a = Math.abs(v), s = v < 0 ? '−' : '+', t;
    if (a < 1000) t = String(Math.round(a));
    else if (a < 1e4) t = (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    else if (a < 1e6) t = Math.round(a / 1e3) + 'k';
    else t = (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    return s + t;
  }
  function usd(v) {
    if (!num(v)) return '–';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    return '$' + Math.round(v / 1e3) + 'k';
  }
  function ratioTxt(r) { return !num(r) ? '–' : r >= 10 ? String(Math.round(r)) : String(Math.round(r * 10) / 10); }
  function cpOf(n) { return num(n.call_oi) && num(n.put_oi) ? (n.put_oi > 0 ? n.call_oi / n.put_oi : Infinity) : null; }
  function oneIn(o) { if (!num(o) || o <= 0) return 'almost none'; return o < 0.5 ? '1 in ' + Math.max(2, Math.round(1 / o)) : Math.round(o * 10) + ' in 10'; }
  function tierName(t) { return t === 'AB' ? 'A+B' : t; }

  // ---------- SVG ----------
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, typeof attrs[k] === 'number' ? +attrs[k].toFixed(2) : attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
  function tx(parent, x, y, str, attrs, halo) {
    var a = attrs || {}; a.x = x; a.y = y;
    if (!a['font-family']) a['font-family'] = FONT;
    if (halo) for (var k in HALO) a[k] = halo === true ? HALO[k] : (k === 'stroke' ? halo : HALO[k]);
    var t = el('text', a, parent); t.textContent = str;
    return t;
  }
  function svgNode(W, H) { return el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, focusable: 'false' }); }
  function lin(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / ((d1 - d0) || 1) * (r1 - r0); }; }
  var mctx = document.createElement('canvas').getContext('2d');
  function textW(str, size, weight) { if (!mctx) return str.length * size * 0.55; mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; return mctx.measureText(str).width; }
  function nowDot(g, x, y, r) {
    el('circle', { cx: x, cy: y, r: r + 5, fill: C.light, 'fill-opacity': 0.16, stroke: C.light, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
    el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: C.light, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
    el('circle', { cx: x, cy: y, r: r, fill: '#EEF5FF', stroke: '#fff', 'stroke-width': 1.4 }, g);
  }
  function nearest(xs, x) {
    if (!xs.length) return null;
    var lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] < x) lo = m; else hi = m; }
    return Math.abs(xs[lo] - x) <= Math.abs(xs[hi] - x) ? lo : hi;
  }
  function idxOnOrAfter(d, dn) { for (var i = 0; i < d.length; i++) if (d[i] >= dn) return i; return d.length - 1; }

  // ---------- state ----------
  var P = null;                 // the prepared document
  var lastErr = null, fatal = null, loading = false, lastFetchAt = 0, pollTimer = null, uid = 0, bannerSig = '';
  var rowRefs = {}, ghosts = {}, pendingOpen = null, helpBuilt = false, lastFocus = null, pop = null, popBtn = null;
  var GEO = { mode: geoNow(), spk: 0 };
  GEO.spk = spkW();
  var S = { tier: 'all', sort: 'best', q: '', cOpen: false, open: {}, closingAll: false, scoreBy: 'odds', clOpen: {}, hitOpen: {}, list: 'all' };
  // the lists the option-chain sweep is built from; the page can be narrowed to one of them
  var LISTS = {
    all: { label: 'Whole list', title: 'Every name we keep option chains for: the S&P 500, the Nasdaq-100 and the optionable names on Watchlist 1' },
    spx: { label: 'SPY list', title: 'S&P 500 members' },
    ndx: { label: 'QQQ list', title: 'Nasdaq-100 members' },
    wl: { label: 'Watchlist 1', title: 'The OBV watchlist: hand-picked stocks and ETFs' }
  };
  function isList(k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(LISTS, k); }
  var RAW = null;                                         // the last data file as fetched; prep() narrows it to S.list
  var STORY = null;

  function geoNow() { var w = window.innerWidth || document.documentElement.clientWidth; return w >= 960 ? 'wide' : w >= 720 ? 'mid' : 'card'; }
  function spkW() { return GEO.mode === 'card' ? ((window.innerWidth || 375) < 360 ? 84 : 112) : 120; }   // desktop: 128 px column incl. its gap
  function tripW() { return GEO.mode === 'card' ? 112 : 100; }

  // ---------- validate + prepare ----------
  function check(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) { var e0 = new Error('the file is not a JSON object'); throw e0; }
    if (d.version !== 1 && d.version !== 2) { var e = new Error('data format version ' + d.version); e.version = d.version; throw e; }
    if (!Array.isArray(d.names)) throw new Error('names[] is missing');
    if (typeof d.generated !== 'string' || isNaN(Date.parse(d.generated))) throw new Error('generated time is missing');
  }
  function normSeries(s) {   // [[date, close] …] or {start, c:[…]} -> {d: [day numbers], c: [closes]}
    if (!s) return null;
    var d = [], c = [], h = [];
    if (Array.isArray(s)) {
      s.forEach(function (p) { if (p && typeof p[0] === 'string' && num(p[1])) { d.push(dayNum(p[0])); c.push(p[1]); } });
    } else if (typeof s.start === 'string' && Array.isArray(s.c)) {
      var dn = dayNum(s.start); while (!isSession(dn)) dn++;
      s.c.forEach(function (v, i) {
        if (i) dn = nextSession(dn);
        if (num(v)) { d.push(dn); c.push(v); h.push(Array.isArray(s.h) && num(s.h[i]) ? s.h[i] : null); }
      });
    }
    return c.length >= 2 ? { d: d, c: c, h: h.length ? h : null } : null;
  }
  // the series ends on the price day with today's price (v1 sparks stop at yesterday's close), still 60 points
  function withToday(ser, day, price) {
    if (!ser || typeof day !== 'string' || !num(price)) return ser;
    var dn = dayNum(day), last = ser.d[ser.d.length - 1];
    if (dn === last) ser.c[ser.c.length - 1] = price;
    else if (dn > last) { ser.d.push(dn); ser.c.push(price); if (ser.h) ser.h.push(null); if (ser.c.length > 60) { ser.d.shift(); ser.c.shift(); if (ser.h) ser.h.shift(); } }
    return ser;
  }
  function tripOf(n) {
    if (!num(n.price) || !num(n.node) || !num(n.ret20) || n.ret20 <= -1) return null;
    var p20 = n.price / (1 + n.ret20);
    if (p20 >= n.node) return { above: true, p20: p20 };
    return { t: (n.price - p20) / (n.node - p20), p20: p20 };
  }
  function ncOf(n, R) {
    var ch = n.oi_chg || {}, w = null;
    if (n.b_window != null && Array.isArray(ch[String(n.b_window)])) w = String(n.b_window);
    else if (Array.isArray(ch['3'])) w = '3';
    else if (Array.isArray(ch['1'])) w = '1';
    if (!w || !num(ch[w][0]) || !num(ch[w][1])) return null;
    var chg = ch[w][0], pct = ch[w][1];
    var kind = pct >= R.tierB_growth && chg >= R.tierB_min ? 'strong' : pct >= 0.01 ? 'up' : pct > -0.01 ? 'flat' : 'down';
    return { w: w, chg: chg, pct: pct, kind: kind };
  }
  function prep(d, listKey) {
    var lists = {};
    if (d.lists && typeof d.lists === 'object') Object.keys(LISTS).forEach(function (k) {
      if (k !== 'all' && Array.isArray(d.lists[k])) { lists[k] = {}; d.lists[k].forEach(function (x) { if (typeof x === 'string') lists[k][x] = 1; }); }
    });
    var lk = listKey && Object.prototype.hasOwnProperty.call(lists, listKey) ? listKey : 'all';
    var inL = function (sym) { return lk === 'all' || !!lists[lk][sym]; };
    var allSyms = {}, listCounts = { all: 0 };
    Object.keys(lists).forEach(function (k) { listCounts[k] = 0; });
    (Array.isArray(d.names) ? d.names : []).forEach(function (n) {
      if (!n || typeof n.sym !== 'string') return;
      allSyms[n.sym] = 1; listCounts.all++;
      Object.keys(lists).forEach(function (k) { if (lists[k][n.sym]) listCounts[k]++; });
    });
    var R = {};
    Object.keys(RULE_DEF).forEach(function (k) { R[k] = RULE_DEF[k]; });
    if (d.rule && typeof d.rule === 'object') Object.keys(d.rule).forEach(function (k) { if (d.rule[k] != null) R[k] = d.rule[k]; });
    if (!R.borderline || typeof R.borderline !== 'object') R.borderline = RULE_DEF.borderline;
    var names = d.names.filter(function (n) { return n && typeof n.sym === 'string' && inL(n.sym); });
    var by = {}, settles = [];
    names.forEach(function (n, i) {
      n._i = i;
      if (TIERS.indexOf(n.tier) < 0) n.tier = 'C';
      n._win = num(n.persist_window) && n.persist_window > 0 ? n.persist_window : R.persist_window;
      n._persist = num(n.persist) ? Math.min(n.persist, n._win) : null;          // clamp: never "11 of 10"
      n._spk = withToday(normSeries(n.spark), n.price_day || d.prices_day, n.price);
      n._trip = tripOf(n);
      n._nc = ncOf(n, R);
      by[n.sym] = n;
      if (n.oi_settle) settles.push(n.oi_settle);
    });
    var cmb = names.filter(function (n) { return num(n.combined); }).sort(function (a, b) { return b.combined - a.combined; });
    cmb.forEach(function (n, i) { n._comboRank = i + 1; n._comboN = cmb.length; });
    var closing = (Array.isArray(d.closing) ? d.closing : []).filter(function (c) { return c && typeof c.sym === 'string' && inL(c.sym); });
    closing.forEach(function (c) { c._spk = withToday(normSeries(c.spark), d.prices_day, c.price); c._touched = c.touched_today === true || (num(c.day_high) && num(c.node) && c.day_high >= c.node); });
    var rec = d.record && typeof d.record === 'object' ? d.record : {};
    if (lk !== 'all') {                                   // the record's counts for this list (the engine counts each list)
      var bl = rec.by_list && rec.by_list[lk], r2 = {};
      Object.keys(rec).forEach(function (k) { r2[k] = rec[k]; });
      ['tracked', 'reached', 'still_open'].forEach(function (k) { r2[k] = bl && num(bl[k]) ? bl[k] : null; });
      r2.missed = null; r2.by_exp = null;
      if (Array.isArray(rec.misses)) r2.misses = rec.misses.filter(function (m) { return m && inL(m.sym); });
      rec = r2;
    }
    var hits = (Array.isArray(rec.hits) ? rec.hits : []).filter(function (h) { return h && typeof h.sym === 'string' && inL(h.sym); })
      .map(function (h, i) { h._i = i; h._path = normSeries(h.path); return h; });
    hits.sort(function (a, b) { return (b.reached || '').localeCompare(a.reached || '') || a._i - b._i; });
    var missed = num(rec.missed) ? rec.missed : (num(rec.tracked) && num(rec.reached) && num(rec.still_open) ? Math.max(0, rec.tracked - rec.reached - rec.still_open) : null);
    var byExp = null;
    if (Array.isArray(rec.by_exp)) byExp = rec.by_exp.filter(function (x) { return x && typeof x.exp === 'string' && num(x.n); });
    else {
      var m = {};
      names.forEach(function (n) { if (n.main_exp) m[n.main_exp] = (m[n.main_exp] || 0) + 1; });
      byExp = Object.keys(m).sort().map(function (k) { return { exp: k, n: m[k] }; });
    }
    var counts = { AB: 0, A: 0, B: 0, C: 0 };
    names.forEach(function (n) { counts[n.tier]++; });
    var newest = d.oi_settle || (settles.length ? settles.slice().sort().pop() : null), older = {}, nOlder = 0;
    names.forEach(function (n) { if (newest && n.oi_settle && n.oi_settle < newest) { nOlder++; older[n.oi_settle] = (older[n.oi_settle] || 0) + 1; } });
    var index = null;
    if (Array.isArray(d.index) || (d.index && typeof d.index === 'object')) {
      index = {};
      (Array.isArray(d.index) ? d.index : Object.keys(d.index).map(function (k) { return d.index[k]; })).forEach(function (r) {
        if (Array.isArray(r) && typeof r[0] === 'string') index[r[0].toUpperCase()] = r;
      });
    }
    var oiStart = null;
    names.forEach(function (n) { if (Array.isArray(n.oi_hist) && n.oi_hist[0] && n.oi_hist[0][0] && (!oiStart || n.oi_hist[0][0] < oiStart)) oiStart = n.oi_hist[0][0]; });
    return {
      doc: d, R: R, names: names, by: by, counts: counts, closing: closing, index: index, newest: newest, nOlder: nOlder,
      olderDates: Object.keys(older).sort(), hits: hits, missed: missed, misses: Array.isArray(rec.misses) ? rec.misses : null,
      byExp: byExp, scored: rec.scored && typeof rec.scored === 'object' ? rec.scored : null, rec: rec, meta: d.meta_case || null,
      oiStart: oiStart, gen: Date.parse(d.generated), comboN: cmb.length,
      universeAll: num(d.universe) ? d.universe : null,
      universe: lk === 'all' ? (num(d.universe) ? d.universe : null) : (index ? Object.keys(index).filter(inL).length : null),
      list: lk, lists: lists, listCounts: listCounts, allSyms: allSyms
    };
  }

  // ---------- status (from the phone clock) ----------
  function status() {
    var t = now(), gen = P.gen, age = t - gen, s = { age: age, gen: gen };
    var pdn = P.doc.prices_day ? dayNum(P.doc.prices_day) : etDayNum(gen);
    if (gen - t > 10 * 6e4) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = 'The data says it was built ' + ago(gen - t).replace(' ago', '') + ' in the future: your clock or the feed clock is off.';
      return s;
    }
    if (P.doc.state === 'LIVE') {
      if (age <= 25 * 6e4) {
        var due = gen + 5 * 6e4;
        s.chip = 'LIVE'; s.cls = 'live';
        s.line = 'Updated ' + ago(age) + '. ' + (due > t ? 'Next update ~' + etHm(due) + '.' : 'Next update due any minute.');
      } else if (age <= 60 * 6e4) {
        s.chip = 'LATE'; s.cls = 'late';
        s.line = 'Expected an update by ' + etHm(gen + 25 * 6e4) + '; the last one is ' + Math.round(age / 6e4) + ' min old. Numbers below are from then.';
      } else {
        s.chip = 'STALE'; s.cls = 'stale';
        s.line = 'No update for ' + ago(age).replace(' ago', '') + ' during what should be a live session.';
      }
      return s;
    }
    // CLOSED: fine until the next session's first update is due (9:40 ET + 15 min), LATE until 11:00 ET, then STALE
    var nxt = nextSession(pdn), late = etEpoch(nxt, 9, 55), stale = etEpoch(nxt, 11, 0);
    if (t < late) {
      s.chip = 'CLOSED'; s.cls = 'closed';
      s.line = 'Next price update after the open: ' + wmd(nxt) + ', 9:40 am ET · ' + tpeHmWd(etEpoch(nxt, 9, 40)) + '.';
    } else if (t < stale) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = 'The market has opened but the first live update hasn’t arrived. Numbers below are the close of ' + monD(pdn) + '.';
    } else {
      s.chip = 'STALE'; s.cls = 'stale';
      s.line = 'These are the closing numbers of ' + wmd(pdn) + ', and newer data should exist by now.';
    }
    return s;
  }
  function segText(parent, parts) { parts.forEach(function (p, i) { if (i) parent.appendChild(document.createTextNode(' · ')); parent.appendChild(span('seg-t', p)); }); }
  function renderStatus() {
    renderBanners();
    if (!P) return;
    var s = status(), d = P.doc;
    var chip = $('chip'); chip.className = 'chip chip-' + s.cls; chip.textContent = s.chip;
    var a = $('asof'); clear(a);
    var pdn = d.prices_day ? dayNum(d.prices_day) : etDayNum(P.gen);
    if (d.state === 'LIVE') {
      var pa = d.prices_asof && !isNaN(Date.parse(d.prices_asof)) ? Date.parse(d.prices_asof) : P.gen - 15 * 6e4;
      segText(a, [wmd(pdn), 'prices ' + etHm(pa) + ' (about 15 min delayed)', tpeHmWd(pa)]);
    } else {
      segText(a, ['Close of ' + wmd(pdn), 'built ' + etHm(P.gen), tpeHmWd(P.gen)]);
    }
    $('statusLine').textContent = s.line;
    var pl = $('pilesLine'); clear(pl);
    var older = '';
    if (P.nOlder) older = ' (' + P.nOlder + (P.nOlder === 1 ? ' name' : ' names') + ' still on ' + (P.olderDates.length === 1 ? dS(P.olderDates[0]) : 'older chains') + ')';
    segText(pl, ['Option piles: ' + (P.newest ? dS(P.newest) : '–') + ' settle' + older, 'open interest changes once a day',
      (P.universeAll != null ? int(P.universeAll) : '–') + ' names checked']);
  }
  function banner(kind, title, text, button, inline) {
    var d = document.createElement('div'); d.className = 'banner banner-' + kind;
    if (kind === 'bad') d.setAttribute('role', 'alert');
    if (title) { var b = document.createElement('b'); if (inline) b.className = 'inl'; b.textContent = title; d.appendChild(b); if (inline && text) d.appendChild(document.createTextNode(' ')); }
    if (text) d.appendChild(span('', text));
    if (button) { var x = btn('', button.label); x.addEventListener('click', button.fn); d.appendChild(document.createElement('br')); d.appendChild(x); }
    return d;
  }
  function renderBanners() {
    var list = [];
    if (previewHost) list.push(['info', 'Preview data:', 'numbers come from ' + previewHost + ', not the live feed.', null, true]);
    if (PREVIEW_PAGE) list.push(['info', 'PREVIEW:', 'not linked from the other pages yet.', null, true]);
    if (nowOverride) list.push(['info', 'Clock override:', 'the page is pretending it is ' + etAndTpe(now()) + '.', null, true]);
    if (dayNum(CAL_END) - etDayNum(now()) < 60) list.push(['warn', 'Market calendar ends ' + CAL_END, 'After that the page assumes every weekday is a trading day, so the CLOSED / LATE labels can be wrong on holidays until the calendar is extended.']);
    if (P) {
      var s = status();
      if (s.cls === 'stale') list.push(['bad', 'These numbers are old.', 'Last update ' + etAndTpe(P.gen) + ' (' + ago(s.age) + '). Don’t read them as current.', null, true]);
      if (lastErr) list.push(['warn', 'Refresh failed', 'at ' + hm12(lastErr.at, TPE) + ' ' + tzParts(lastErr.at, TPE).wd + ' Taipei (' + lastErr.msg + '). The numbers below are still from ' + fullTz(P.gen, NY, 'ET') + '.', null, true]);
      var pdn = P.doc.prices_day ? dayNum(P.doc.prices_day) : null;
      if (pdn && P.newest && dayNum(P.newest) < prevSession(pdn))
        list.push(['warn', 'Option piles are from ' + dS(P.newest) + ':', 'today’s open interest hasn’t arrived. Distances and odds still use the latest prices.', null, true]);
    }
    if (fatal) {
      if (fatal.version !== undefined) list.push(['bad', 'The data format changed (version ' + fatal.version + ').', 'This page needs an update.', null, true]);
      else list.push(['bad', 'Couldn’t load the data.', '(' + fatal.msg + ')', { label: 'Try again', fn: function () { load(true); } }, false]);
    }
    var sig = JSON.stringify(list.map(function (b) { return [b[0], b[1], b[2]]; }));
    if (sig === bannerSig) return;
    bannerSig = sig;
    var host = $('banners'); clear(host);
    list.forEach(function (b) { host.appendChild(banner(b[0], b[1], b[2], b[3], b[4])); });
  }

  // ---------- today tiles ----------
  function tileBtn(k, v, small, note, fn) {
    var b = btn('tile');
    b.appendChild(span('t-k', k));
    var tv = span('t-v', v); if (small) tv.appendChild(add(document.createElement('small'), small)); b.appendChild(tv);
    var tn = span('t-n', ''); (Array.isArray(note) ? note : [note]).forEach(function (x, i) { if (i) tn.appendChild(document.createElement('br')); tn.appendChild(document.createTextNode(x)); });
    b.appendChild(tn);
    if (fn) b.addEventListener('click', fn);
    return b;
  }
  function renderTiles() {
    var T = $('tiles'); clear(T);
    var c = P.counts, n = P.names.length;
    T.appendChild(tileBtn('ON THE LIST', String(n), P.universe != null ? 'of ' + int(P.universe) : null, (c.AB + c.A + c.B) + ' outside the old piles',
      function () { setTier('all'); scrollToEl($('filters')); }));
    // strongest: the A+B tickers, each a 44 px button that opens its row
    var t2 = div('tile'), ab = P.names.filter(function (x) { return x.tier === 'AB'; });
    if (ab.length) t2.className += ' hl';
    t2.appendChild(span('t-k', 'STRONGEST (A+B)'));
    var v2 = span('t-v', null);
    if (ab.length) {
      var w = span('tk-wrap', null);
      ab.slice(0, 4).forEach(function (x) {
        var b = btn('tkb', x.sym); b.setAttribute('aria-label', 'Open ' + x.sym);
        b.addEventListener('click', function () { goToRow(x.sym, true); });
        w.appendChild(b);
      });
      if (ab.length > 4) w.appendChild(span('more-n', '+' + (ab.length - 4)));
      v2.appendChild(w);
    } else { v2.textContent = 'none today'; v2.className += ' tv-none'; }
    t2.appendChild(v2);
    t2.appendChild(span('t-n', ab.length ? 'price moving toward it AND calls being added' : 'no name has both right now'));
    T.appendChild(t2);
    // biggest bets: the most money in calls at a far pile, any tier
    var big = P.names.filter(function (x) { return num(x.prem_usd); }).sort(function (a, b) { return b.prem_usd - a.prem_usd; }).slice(0, 3);
    var t5 = div('tile tile-bets'); t5.appendChild(span('t-k', 'BIGGEST BETS'));
    var v5 = span('t-v', null);
    if (big.length) {
      var w5 = span('tk-wrap', null);
      big.forEach(function (x) {
        var b = btn('tkb', null); b.appendChild(span('', x.sym)); b.appendChild(span('tkm', usd(x.prem_usd)));
        b.setAttribute('aria-label', 'Open ' + x.sym + ', ' + usd(x.prem_usd) + ' in calls');
        b.addEventListener('click', function () { if (S.sort !== 'bet') setSort('bet'); goToRow(x.sym, true); });
        w5.appendChild(b);
      });
      v5.appendChild(w5);
    } else { v5.textContent = '–'; v5.className += ' tv-none'; }
    t5.appendChild(v5);
    var n5 = span('t-n', '$ in calls at the pile · ');
    var rb = btn('linkbtn', 'Rank all'); rb.addEventListener('click', function () { setSort('bet'); scrollToEl($('filters')); });
    n5.appendChild(rb); t5.appendChild(n5);
    // closing in
    var cl = P.closing, touched = cl.filter(function (x) { return x._touched; })[0], note3;
    var nT = cl.filter(function (x) { return x._touched; }).length;
    if (touched) note3 = touched.sym + ' touched ' + strike(touched.node) + ' today' + (nT > 1 ? ' (+' + (nT - 1) + ' more)' : '');
    else if (cl.length) { var nr = cl.slice().sort(function (a, b) { return a.dist - b.dist; })[0]; note3 = 'nearest: ' + nr.sym + ' ' + strike(nr.node) + ', ' + a1(nr.dist) + ' to go'; }
    else note3 = 'none right now';
    T.appendChild(tileBtn('CLOSING IN', String(cl.length), null, note3, function () { scrollToEl($('closing')); }));
    // reached so far
    var rec = P.rec, h0 = P.hits[0], early = !P.scored || !num(P.scored.closed) || P.scored.closed < P.R.min_closed;
    T.appendChild(tileBtn('REACHED SO FAR', num(rec.reached) ? String(rec.reached) : '–', num(rec.tracked) ? 'of ' + int(rec.tracked) + ' tracked' : null,
      [h0 ? 'latest: ' + h0.sym + ' ' + strike(h0.node) + ' · ' + dS(h0.reached) : 'latest: none yet', early ? 'too early to grade' : 'graded in the scoreboard'],
      function () { scrollToEl($('hits')); }));
    T.appendChild(t5);
  }

  // ---------- caveat line + story folds ----------
  function initFolds() {
    // first visit: open; later visits: folded unless the reader opened it again (each toggle is remembered)
    var cv = sget('ps.caveats'), st = sget('ps.story');
    setCaveat(cv !== 'closed');
    setStory(st !== 'closed');
    if (cv == null) sset('ps.caveats', 'closed');
    if (st == null) sset('ps.story', 'closed');
    $('cvTog').addEventListener('click', function () { var o = this.getAttribute('aria-expanded') !== 'true'; setCaveat(o); sset('ps.caveats', o ? 'open' : 'closed'); });
    $('storyTog').addEventListener('click', function () { var o = this.getAttribute('aria-expanded') !== 'true'; setStory(o); sset('ps.story', o ? 'open' : 'closed'); if (o && P) drawStory(); });
  }
  function setCaveat(open) {
    var b = $('cvTog'); b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.textContent = open ? 'Hide' : 'Read the 4 caveats';
    $('cvList').hidden = !open;
  }
  function setStory(open) {
    var b = $('storyTog'); b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.textContent = open ? 'Hide the story' : 'Show the story';
    $('storyBody').hidden = !open; $('storyFold').hidden = open;
    $('story').classList.toggle('folded', !open);
  }
  function storyIsOpen() { return $('storyTog').getAttribute('aria-expanded') === 'true'; }

  // ---------- the META story ----------
  function renderStory() {
    var m = P.meta, sec = $('story');
    if (!m || !num(m.node) || !m.seen || !m.base || !m.spike || !m.peak) { sec.hidden = true; STORY = null; return; }
    sec.hidden = false;
    var sym = m.sym || 'META', node = m.node, R = P.R;
    var closes = normSeries(m.closes);
    function closeAt(dn) { if (!closes) return null; var i = closes.d.indexOf(dn); return i >= 0 ? closes.c[i] : null; }
    var baseDn = dayNum(m.base.day), seenDn = dayNum(m.seen.day), spikeDn = dayNum(m.spike.day), peakDn = dayNum(m.peak.day);
    var qdn = m.q_day ? dayNum(m.q_day) : nthSessionFrom(seenDn, R.min_persist - 1);
    var qv = num(m.q_close) ? m.q_close : closeAt(qdn);
    var nw = m.now && m.now.day && num(m.now.close) ? { dn: dayNum(m.now.day), v: m.now.close } :
      (closes ? { dn: closes.d[closes.d.length - 1], v: closes.c[closes.c.length - 1] } : null);
    var seenDist = num(m.seen.dist) ? m.seen.dist : (num(m.seen.close) ? node / m.seen.close - 1 : null);
    $('storyFold').textContent = 'The ' + sym + ' pattern: a ' + strike(node) + ' call pile ' + p0(seenDist) + ' above the price on ' + dS(m.seen.day) + '; the price touched it ' + dS(m.spike.day) + '.';
    $('storyH').textContent = 'A big call pile ' + p0(seenDist) + ' above ' + sym + '’s price. Then the price went there.';
    var steps = [];
    steps.push({ dn: baseDn, v: m.base.close, place: -1, text: wS(m.base.day) + ' · ' + px(m.base.close) + '. A quiet start: ' + strike(node) + ' is ' + p0(node / m.base.close - 1) +
      ' above the price. (Our records start ' + dS(m.seen.day) + ', so we can’t say when the pile first appeared.)' });
    var t2 = wS(m.seen.day) + ' · ' + px(m.seen.close) + '. Our first day of records, and the ' + strike(node) + ' pile is already there: ' + sym + '’s biggest call pile, ' +
      p0(seenDist) + ' above the price, mostly January 2027 calls.';
    if (num(m.seen_odds)) t2 += ' The options gave it about a ' + p0(m.seen_odds) + ' chance (about ' + oneIn(m.seen_odds) + ') of a touch by its main expiry.';
    steps.push({ dn: seenDn, v: m.seen.close, place: 1, text: t2 });
    steps.push({ dn: qdn, v: qv, place: 1, text: wmd(qdn) + (qv != null ? ' · ' + px(qv) : '') + '. ' + (ORD[R.min_persist] || 'Fifth') + ' session with the same pile. Under this page’s rules, this is the day ' + sym + ' would have joined the list.' });
    var past = Math.round((m.spike.high - node) * 100) / 100;
    steps.push({ dn: spikeDn, v: m.spike.high, place: -1, high: true, text: wS(m.spike.day) + ' · high ' + px(m.spike.high) + '. Touched: ' + sym + ' traded $' + strike(past) + ' past the pile, ' +
      sessionsAfter(seenDn, spikeDn) + ' sessions after we first saw it.' });
    steps.push({ dn: peakDn, v: m.peak.close, place: -1, text: wS(m.peak.day) + ' · ' + px(m.peak.close) + '. It kept going: ' + p0(m.peak.close / m.base.close - 1) + ' above ' + dS(m.base.day) + '.' });
    if (nw) {
      var d6 = node / nw.v - 1;
      steps.push({ dn: nw.dn, v: nw.v, place: 1, now: true, text: 'Now · ' + wmd(nw.dn) + ' · ' + px(nw.v) + '. ' + (nw.v > node ? 'Above the pile.' :
        'Back under the pile, ' + a1(d6) + ' away' + (d6 < R.min_dist ? ': too close to make today’s list.' : '.')) });
    } else {
      steps.push({ dn: P.doc.prices_day ? dayNum(P.doc.prices_day) : null, v: null, place: 1, now: true, text: 'Now · ' + wS(P.doc.prices_day) + '. Today’s ' + sym + ' close isn’t in this data file yet.' });
    }
    STORY = { m: m, sym: sym, node: node, closes: closes, steps: steps, seenDn: seenDn, active: STORY ? STORY.active : null };
    // the steps list
    var ol = $('steps'); clear(ol);
    steps.forEach(function (st, i) {
      var li = document.createElement('li'), b = btn('', null);
      b.appendChild(span('sn', String(i + 1))); b.appendChild(span('st-t', st.text));
      b.addEventListener('click', function () { setStep(i); });
      li.appendChild(b); ol.appendChild(li);
      st.btn = b;
    });
    // the 5 checks, with META's values
    renderChecks();
    if (storyIsOpen()) drawStory();
    setStep(STORY.active, true);
  }
  function renderChecks() {
    var m = P.meta, R = P.R, ck = m.checks && typeof m.checks === 'object' ? m.checks : {}, host = $('checks'); clear(host);
    var dist = num(ck.dist) ? ck.dist : (m.seen && num(m.seen.dist) ? m.seen.dist : null);
    var pn = num(ck.persist_n) ? Math.min(ck.persist_n, R.persist_window) : null, pr = num(ck.persist) ? Math.min(ck.persist, pn || R.persist_window) : null;
    var rows = [
      ['FAR', 'At least ' + p0(R.min_dist) + ' above the price', num(dist) ? p0(dist) : null, num(dist) && dist >= R.min_dist,
        'Far enough that the price needs a real move to get there. A pile 3% away is just where the price already is.'],
      ['BIG', 'At least ' + p0(R.min_share) + ' of the stock’s upside gamma, or ' + usd(R.or_min_gex_usd) + '+', num(ck.share) ? p0(ck.share) : null, num(ck.share) && ck.share >= R.min_share,
        'Gamma measures how strongly option bets react when the price moves. If one strike holds this much of it, it is THE pile on that stock, not one of many.'],
      ['STAYS PUT', 'Top pile in ' + R.min_persist + ' of the last ' + R.persist_window + ' sessions', pr != null && pn != null ? pr + ' of ' + pn : null, pr != null && pr >= R.min_persist,
        'A pile that is there one day and gone the next is noise. One that sits there for weeks is a position somebody is holding.'],
      ['MOSTLY CALLS', 'At least ' + strike(R.min_call_put) + ' calls for every put at that strike', num(ck.cp) ? ratioTxt(ck.cp) + ' to 1' : null, num(ck.cp) && ck.cp >= R.min_call_put,
        'Calls pay if the price goes up. A strike with lots of puts too is usually a hedged trade, not a one-way bet.'],
      ['REACHABLE', 'No more than ' + strike(R.max_z) + ' typical moves away by its main expiry', num(ck.z) ? ck.z.toFixed(1) : null, num(ck.z) && ck.z <= R.max_z,
        'A typical move is how far the options expect the price to swing by that date. 20% away with four months left is reachable; 20% away with one week left isn’t. It also means every name here has at least a 13% chance of touching its pile.']
    ];
    rows.forEach(function (r, i) {
      var t = div('ck'), k = div('ck-k'), id = 'ckx' + i;
      k.appendChild(span('', r[0]));
      var ib = btn('ib', 'i'); ib.setAttribute('aria-expanded', 'false'); ib.setAttribute('aria-controls', id); ib.setAttribute('aria-label', 'What ' + r[0] + ' means');
      k.appendChild(ib); t.appendChild(k);
      t.appendChild(div('ck-r')).textContent = r[1];
      var v = div('ck-v');
      if (r[2] == null) { v.textContent = '–'; v.title = 'Not in this data file yet'; }
      else { v.textContent = r[2] + ' '; if (r[3]) v.appendChild(span('ok', '✓')); }
      t.appendChild(v);
      var x = para('ck-x', r[4]); x.id = id; x.hidden = true; t.appendChild(x);
      ib.addEventListener('click', function () { var o = ib.getAttribute('aria-expanded') !== 'true'; ib.setAttribute('aria-expanded', o ? 'true' : 'false'); x.hidden = !o; });
      host.appendChild(t);
    });
  }
  function storyRead(dn, v, isHigh) {
    var ro = $('storyRo'); clear(ro);
    if (dn == null) { ro.textContent = 'Tap a step, or touch the chart, to read a day.'; return; }
    ro.appendChild(span('d', wmd(dn)));
    if (v == null) return;
    ro.appendChild(document.createTextNode(' · ' + STORY.sym + ' ' + (isHigh ? 'high ' : '') + px(v)));
    if (dn >= STORY.seenDn) {
      var x = STORY.node / v - 1;
      ro.appendChild(document.createTextNode(' · pile ' + strike(STORY.node) + ' is ' + a1(x) + (x >= 0 ? ' above' : ' below')));
    }
  }
  function setStep(i, quiet) {
    if (!STORY) return;
    STORY.active = i;
    STORY.steps.forEach(function (st, k) { if (st.btn) { if (k === i) st.btn.setAttribute('aria-current', 'step'); else st.btn.removeAttribute('aria-current'); } });
    if (STORY.mark) STORY.mark(i == null ? null : STORY.steps[i]);
    if (i == null) storyRead(null);
    else { var st = STORY.steps[i]; storyRead(st.dn, st.v, st.high); }
    if (!quiet && i != null && GEO.mode !== 'card') { /* desktop: steps sit beside the chart already */ }
  }
  function drawStory() {
    if (!STORY) return;
    var h = $('storyChart'); clear(h);
    var W = Math.max(280, Math.round(h.clientWidth || 300)), H = W < 520 ? 200 : 240;
    var m = STORY.m, steps = STORY.steps, closes = STORY.closes, node = STORY.node;
    var L = 8, Rr = 10, T = 32, B = 22, pw = W - L - Rr, ph = H - T - B;
    // x = trading-day position from the first close (or 4 sessions before step 1) to the last day shown
    var first = closes ? closes.d[0] : (function () { var d = steps[0].dn; for (var i = 0; i < 4; i++) d = prevSession(d); return d; })();
    var last = closes ? closes.d[closes.d.length - 1] : first;
    steps.forEach(function (st) { if (st.dn != null && st.dn > last) last = st.dn; });
    var SS = []; for (var d = first; d <= last; d++) if (isSession(d)) SS.push(d);
    if (SS.length < 2) SS = [first, last + 1];
    function X(dn) { var i = nearest(SS, dn); return L + (i / (SS.length - 1)) * pw; }
    var vals = [m.base.close, m.peak.close, node, m.spike.high];
    if (closes) vals = vals.concat(closes.c);
    steps.forEach(function (st) { if (num(st.v)) vals.push(st.v); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.04; lo -= pd; hi += pd;
    var Y = lin(lo, hi, T + ph, T);
    var s = svgNode(W, H); h.appendChild(s);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', STORY.sym + ' chart in 6 steps. ' + steps.map(function (st, i) { return (i + 1) + ': ' + st.text; }).join(' '));
    var xSeen = X(STORY.seenDn), ySeen = Y(m.seen.close), yNode = Y(node);
    // our records start
    el('line', { x1: xSeen, x2: xSeen, y1: T - 6, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '1 3' }, s);
    tx(s, xSeen + 4, T + ph - 4, 'our records start', { fill: C.muted, 'font-size': 10.5 }, C.bg);
    // the pile, from the first day of records only; label to its left at the same height
    el('line', { x1: xSeen, x2: L + pw, y1: yNode, y2: yNode, stroke: C.amber, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, s);
    var lab = strike(node) + ' pile (Jan 2027 calls)';
    if (xSeen - 8 - textW(lab, 11, 700) < L) lab = strike(node) + ' pile';
    tx(s, xSeen - 6, yNode + 4, lab, { fill: C.amber, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end' }, C.bg);
    // the +22% bracket at the first day of records
    el('path', { d: 'M' + (xSeen - 4) + ' ' + ySeen + 'H' + xSeen + 'V' + yNode + 'H' + (xSeen - 4), fill: 'none', stroke: C.amber, 'stroke-width': 1.6 }, s);
    var pct = num(m.seen.dist) ? m.seen.dist : node / m.seen.close - 1;
    tx(s, xSeen - 7, (ySeen + yNode) / 2 + 4, '+' + Math.round(pct * 100) + '%', { fill: C.amber, 'font-size': 12, 'font-weight': 700, 'text-anchor': 'end' }, C.bg);
    // the closes
    var xs = [], pts = [];
    if (closes) {
      var dl = '';
      closes.d.forEach(function (dn, i) { var x = X(dn), y = Y(closes.c[i]); dl += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); xs.push(x); pts.push({ dn: dn, v: closes.c[i] }); });
      el('path', { d: dl, fill: 'none', stroke: C.light, 'stroke-width': 2, 'stroke-linejoin': 'round' }, s);
    } else {
      steps.forEach(function (st) { if (st.dn != null && num(st.v)) { xs.push(X(st.dn)); pts.push({ dn: st.dn, v: st.v, high: st.high }); } });
      var ord = xs.map(function (x, i) { return i; }).sort(function (a, b) { return xs[a] - xs[b]; });
      xs = ord.map(function (i) { return xs[i]; }); pts = ord.map(function (i) { return pts[i]; });
      pts.forEach(function (p) { el('circle', { cx: X(p.dn), cy: Y(p.v), r: 2.5, fill: C.light }, s); });
    }
    // gold dot: the touch high
    el('circle', { cx: X(dayNum(m.spike.day)), cy: Y(m.spike.high), r: 4.5, fill: C.gold, stroke: C.bg, 'stroke-width': 1.6 }, s);
    // x labels: first, records start, touch, last
    var labs = [{ x: L, t: monD(first, true), a: 'start' }, { x: xSeen, t: monD(STORY.seenDn, true), a: 'middle' },
      { x: X(dayNum(m.spike.day)), t: monD(dayNum(m.spike.day), true), a: 'middle' }, { x: L + pw, t: monD(last, true), a: 'end' }];
    var kept = [];
    [0, 3, 1, 2].forEach(function (k) {
      var o = labs[k], w = textW(o.t, 11), x0 = o.a === 'start' ? o.x : o.a === 'end' ? o.x - w : o.x - w / 2;
      if (kept.some(function (q) { return x0 < q.x1 + 8 && x0 + w + 8 > q.x0; })) return;
      kept.push({ x0: x0, x1: x0 + w }); tx(s, o.x, H - 6, o.t, { fill: C.muted, 'font-size': 11, 'text-anchor': o.a });
    });
    // the numbered steps: 22 px circles with a 44 px hit area; step 6 = the pulsing now-dot
    var cross = el('g', { 'pointer-events': 'none' }, s);
    var marks = el('g', {}, s), circles = [];
    steps.forEach(function (st, i) {
      if (st.dn == null || !num(st.v)) { circles.push(null); return; }
      var x = X(st.dn), y = Y(st.v), cy = y + st.place * 18;
      if (cy - 11 < 2) cy = y + 18;
      if (cy + 11 > T + ph + 4) cy = y - 18;
      if (st.now) nowDot(marks, x, y, 3.5);
      var g = el('g', { 'class': 'stp', cursor: 'pointer' }, marks);
      el('line', { x1: x, x2: x, y1: y + st.place * 4, y2: cy - st.place * 11, stroke: C.light, 'stroke-width': 1, 'stroke-opacity': 0.5 }, g);
      var c = el('circle', { cx: x, cy: cy, r: 11, fill: C.bg, stroke: C.light, 'stroke-width': 1.5 }, g);
      var t = tx(g, x, cy + 4, String(i + 1), { fill: C.light, 'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'middle' });
      el('circle', { cx: x, cy: cy, r: 22, fill: 'transparent' }, g);
      g.addEventListener('click', function (e) { e.stopPropagation(); setStep(i); });
      circles.push({ c: c, t: t });
    });
    STORY.mark = function (st) {
      clear(cross);
      circles.forEach(function (o, k) { if (!o) return; var on = STORY.steps[k] === st; o.c.setAttribute('fill', on ? C.fear : C.bg); o.c.setAttribute('stroke', on ? C.fear : C.light); o.t.setAttribute('fill', on ? '#fff' : C.light); });
      if (st && st.dn != null) { var x = X(st.dn); el('line', { x1: x, x2: x, y1: T - 6, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross); }
    };
    attachReader(h, {
      xs: xs,
      show: function (i) {
        var p = pts[i]; clear(cross);
        var x = xs[i]; el('line', { x1: x, x2: x, y1: T - 6, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross);
        el('circle', { cx: x, cy: Y(p.v), r: 3.5, fill: '#fff', stroke: C.bg, 'stroke-width': 1.2 }, cross);
        storyRead(p.dn, p.v, p.high);
      },
      rest: function () { setStep(STORY.active, true); }
    });
    if (STORY.active != null) STORY.mark(steps[STORY.active]);
    if (!closes) h.appendChild(para('cap', 'Key days only: the daily line arrives with the next version of the data file.'));
  }

  // ---------- chart reading: hover (mouse), touch-and-hold or tap (finger), arrows (keyboard) ----------
  // The readout sits ABOVE each chart; nothing is drawn under the finger except the thin crosshair.
  function attachReader(holder, api) {
    holder._rd = api;
    if (holder._rdBound) return;
    holder._rdBound = true;
    var cur = null, holdT = null, holding = false, sx = 0, sy = 0, lastX = 0;
    function idx(clientX) {
      var r = holder._rd, svgE = holder.querySelector('svg');
      if (!r || !svgE || !r.xs.length) return null;
      var b = svgE.getBoundingClientRect(), w = +svgE.getAttribute('width') || b.width;
      return nearest(r.xs, (clientX - b.left) * (w / (b.width || 1)));
    }
    function show(i) { if (i == null || !holder._rd) return; cur = i; holder._rd.show(i); }
    holder.addEventListener('pointermove', function (e) {
      lastX = e.clientX;
      if (e.pointerType === 'mouse') { show(idx(e.clientX)); return; }
      if (holding) show(idx(e.clientX));
      else if (holdT && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) { clearTimeout(holdT); holdT = null; }
    });
    holder.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { cur = null; if (holder._rd) holder._rd.rest(); } });
    holder.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      sx = lastX = e.clientX; sy = e.clientY; clearTimeout(holdT);
      holdT = setTimeout(function () { holdT = null; holding = true; show(idx(lastX)); }, 220);
    });
    function end(e) {
      if (e.pointerType === 'mouse') return;
      if (holdT) { clearTimeout(holdT); holdT = null; if (e.type === 'pointerup') show(idx(e.clientX)); }   // a tap reads that day too
      holding = false;
    }
    holder.addEventListener('pointerup', end);
    holder.addEventListener('pointercancel', end);
    holder.addEventListener('touchmove', function (e) { if (holding) e.preventDefault(); }, { passive: false });
    holder.addEventListener('contextmenu', function (e) { if (holding || holdT) e.preventDefault(); });
    holder.addEventListener('keydown', function (e) {
      var r = holder._rd; if (!r || !r.xs.length) return;
      var n = r.xs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(cur == null ? n - 1 : Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)))); }
      else if (e.key === 'Home') { e.preventDefault(); show(0); }
      else if (e.key === 'End') { e.preventDefault(); show(n - 1); }
      else if (e.key === 'Escape' && cur != null) { e.stopPropagation(); cur = null; r.rest(); }
    });
  }

  // ---------- list rows ----------
  function tierPill(t) {
    var R = P ? P.R : RULE_DEF;
    var titles = { AB: 'A+B: price moving toward the pile AND calls being added', A: 'A: price moving toward the pile (up ' + p0(R.tierA_ret20) + '+ in 20 days)',
      B: 'B: calls at the pile up ' + p0(R.tierB_growth) + '+ (' + int(R.tierB_min) + '+ contracts)', C: 'C: old pile; often covered calls; likely noise' };
    var s = span('pill p-' + t, tierName(t)); s.title = titles[t] || ''; return s;
  }
  function fuseDays(n) { return n.main_exp && P.doc.prices_day ? dayNum(n.main_exp) - dayNum(P.doc.prices_day) : null; }
  function touchedRow(n) { return num(n.day_high) && num(n.node) && n.day_high >= n.node; }
  function borderTitle(n) {
    var R = P.R;
    if (n.borderline === 'A') return (n.ret20 >= 0 ? 'Up ' : 'Down ') + a1(n.ret20) + ' in 20 days, just ' + (n.ret20 >= R.tierA_ret20 ? 'over' : 'under') + ' the ' + p0(R.tierA_ret20) + ' bar for A.';
    var x = n._nc; if (!x) return 'Close to the bar for B.';
    if (x.pct >= R.tierB_growth && x.chg < R.tierB_min) return 'Calls up ' + p0(x.pct) + ', but only ' + int(x.chg) + ' contracts, just under the ' + int(R.tierB_min) + ' B needs.';
    return 'Calls ' + (x.pct >= 0 ? 'up ' : 'down ') + a1(x.pct) + ', just ' + (x.pct >= R.tierB_growth ? 'over' : 'under') + ' the ' + p0(R.tierB_growth) + ' bar for B.';
  }
  function fillPills(r) {
    var n = r.n, P0 = r.pills; clear(P0);
    function pill(t, cls, title) { var s = span('pill ' + cls, t); if (title) s.title = title; P0.appendChild(s); }
    if (n.new === true) pill('NEW', 'p-new', 'New since the previous close’s list.');
    if (n.borderline === 'A' || n.borderline === 'B') pill('Borderline', 'p-bord', borderTitle(n));
    var fd = fuseDays(n); if (fd != null && fd >= 0 && fd <= 21) pill('Short fuse', 'p-fuse', 'The main expiry is ' + fd + ' days away' + (num(n.main_share) ? ' (' + p0(n.main_share) + ' of these calls).' : '.'));
    if (touchedRow(n)) pill('TOUCHED today', 'p-touch', 'The price traded at or above the pile today (high ' + px(n.day_high) + ').');
    if (r.leftAt) pill('Left the list ' + r.leftAt, 'p-left', r.leftWhy || '');
    P0.hidden = !P0.firstChild;
  }
  function fillPrice(r) {
    var n = r.n, c = r.c.price; clear(c);
    var p = span('px', px(n.price));
    if (num(n.prev_close) && num(n.price) && n.price !== n.prev_close) { p.className += n.price > n.prev_close ? ' dup' : ' ddn'; p.title = 'Today ' + sp1(n.price / n.prev_close - 1); }
    add(c, p, ' ', add(span('nd-w', null), span('ar', '→ '), span('nd', strike(n.node))));
  }
  function fillTogo(r) { r.c.togo.textContent = num(r.n.dist) ? sp1(r.n.dist) : '–'; }
  function tripSvg(t, W) {
    var H = 12, Z = 18, F = 7, x0 = Z, x1 = W - F;     // stub zone (to -100%) | track (to the pile) | flag
    var s = svgNode(W, H);
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', t < 0 ? 'Trip: the price went the other way' : 'Trip: ' + Math.round(t * 100) + '% of the way');
    el('rect', { x: x0, y: 4, width: x1 - x0, height: 4, rx: 1, fill: C.line }, s);
    if (t > 0) el('rect', { x: x0, y: 3, width: Math.max(1.5, Math.min(1, t) * (x1 - x0)), height: 6, rx: 1, fill: C.up }, s);
    else if (t < 0) {
      var Ls = Math.min(1, -t) * (Z - 3);
      el('rect', { x: x0 - Ls, y: 3, width: Math.max(1.5, Ls), height: 6, rx: 1, fill: C.down }, s);
      if (-t >= 1) el('path', { d: 'M' + (x0 - Ls + 3.5) + ' 1.5L' + (x0 - Ls) + ' 6L' + (x0 - Ls + 3.5) + ' 10.5', stroke: C.down, fill: 'none', 'stroke-width': 1.4 }, s);
    }
    el('line', { x1: x0, x2: x0, y1: 1, y2: 11, stroke: C.text, 'stroke-width': 1.2 }, s);      // start = 20 days ago
    el('line', { x1: x1, x2: x1, y1: 0, y2: 12, stroke: C.amber, 'stroke-width': 1.4 }, s);     // the pile
    el('path', { d: 'M' + x1 + ' 0L' + (x1 + F - 0.5) + ' 2.6L' + x1 + ' 5.2Z', fill: C.amber }, s);
    return s;
  }
  function fillTrip(r) {
    var c = r.c.trip, T = r.n._trip; clear(c);
    if (!T) { c.appendChild(span('mut', '–')); return; }
    if (T.above) { c.appendChild(span('tr-l', 'was above the pile 20 days ago')); return; }
    c.appendChild(tripSvg(T.t, tripW()));
    c.appendChild(span('tr-l' + (T.t < 0 ? ' dn' : ' upl'), T.t < 0 ? 'went the other way' : Math.round(Math.min(1, T.t) * 100) + '%'));
  }
  function sparkSvg(ser, node, W, H) {
    var s = svgNode(W, H); s.setAttribute('aria-hidden', 'true');
    if (!ser) return s;
    var c = ser.c, lo = Math.min.apply(null, c), hi = Math.max(num(node) ? node : -Infinity, Math.max.apply(null, c));
    var pd = (hi - lo) * 0.06 || hi * 0.01; lo -= pd; hi += pd;
    var X = function (i) { return 1.5 + i / (c.length - 1) * (W - 5); }, Y = lin(lo, hi, H - 1.5, 1.5);
    if (num(node)) el('line', { x1: 0, x2: W, y1: Y(node), y2: Y(node), stroke: C.amber, 'stroke-width': 1, 'stroke-dasharray': '3 2' }, s);
    var d = ''; for (var i = 0; i < c.length; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(c[i]).toFixed(1);
    el('path', { d: d, fill: 'none', stroke: C.text, 'stroke-width': 1.25, 'stroke-linejoin': 'round' }, s);
    el('circle', { cx: X(c.length - 1), cy: Y(c[c.length - 1]), r: 1.6, fill: '#fff' }, s);
    return s;
  }
  function fillSpark(r) { clear(r.c.spark); r.c.spark.appendChild(sparkSvg(r.n._spk, r.n.node, spkW(), 28)); }
  function fillOdds(r) {
    var n = r.n, c = r.c.odds; clear(c);
    if (!num(n.odds)) { c.appendChild(span('mut', '–')); return; }
    var top = span('o-top', null);
    add(top, span('ov' + (n.odds >= 0.5 ? ' hi' : ''), p0(n.odds)), ' ', span('by', 'by ' + dS(n.main_exp, true)));
    c.appendChild(top);
    var bar = span('obar', null), f = document.createElement('i'); f.style.width = Math.round(Math.max(0, Math.min(1, n.odds)) * 100) + '%'; bar.appendChild(f); c.appendChild(bar);
  }
  function fillNew(r) {
    var x = r.n._nc, c = r.c.nc; clear(c); c.className = 'c-new';
    if (!x) { c.appendChild(span('mut', '–')); c.removeAttribute('title'); return; }
    var pt = sp0(x.pct), w = ' · ' + x.w + 's';
    c.className += x.kind === 'strong' ? ' strong' : x.kind === 'down' ? ' dnc' : ' mutc';
    c.appendChild(span('nc-long', x.kind === 'strong' ? compactSigned(x.chg) + ' ' + pt + w : (x.kind === 'flat' ? 'flat' : pt) + w));
    c.appendChild(span('nc-short', 'calls ' + (x.kind === 'flat' ? 'flat' : pt)));
    c.title = 'Calls added at this strike over the last ' + x.w + ' sessions (counting expiries ' + P.R.dte_lo + '+ days out). Changes once a day.';
  }
  function fillR20(r) { var v = r.n.ret20, c = r.c.r20; c.textContent = sp1(v); c.className = 'c-r20' + (num(v) ? (v >= 0 ? ' up' : ' down') : ''); }
  function heldDots(n) {
    var txt = n._persist == null ? null : n._persist + ' of last ' + n._win + ' sessions';
    var marks = null;
    if (Array.isArray(n.node_hist) && n.node_hist.length) {
      marks = n.node_hist.slice(-10).map(function (e) { var k = Array.isArray(e) ? e[1] : null; return !num(k) ? 'n' : Math.abs(k - n.node) < 1e-6 ? 'f' : 'h'; });
    } else if (n._persist != null && n._persist === n._win) {
      marks = []; for (var i = 0; i < n._win; i++) marks.push('f');        // held in every session: the order doesn't matter
    }
    if (!marks) return span('held-t', n._persist == null ? '–' : n._persist + ' of ' + n._win);
    while (marks.length < 10) marks.unshift('n');
    var box = span('held', null); box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Held: ' + (txt || '–')); if (txt) box.title = txt;
    marks.forEach(function (m) { var i = document.createElement('i'); i.className = 'h' + m; box.appendChild(i); });
    return box;
  }
  function fillHeld(r) { clear(r.c.held); r.c.held.appendChild(heldDots(r.n)); }
  function pctTxt(f) { var v = f * 100; return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
  function fillBet(r) {
    var n = r.n, c = r.c.bet; clear(c);
    var v, lab;
    if (S.sort === 'betadv') { v = num(n.prem_adv) ? pctTxt(n.prem_adv) : '–'; lab = 'of a day'; }
    else if (S.sort === 'betday') { v = num(n.per_day_usd) ? usd(n.per_day_usd) : '–'; lab = 'per day left'; }
    else { v = usd(n.prem_usd); lab = 'in calls'; }
    c.appendChild(span('bv', v)); c.appendChild(span('bl', lab));
    var sc = num(n.score) ? Math.round(n.score) : null;                       // tablets: the business score shares this cell
    c.appendChild(span('bz' + (sc == null ? ' none' : sc >= 70 ? ' hi' : ''), sc == null ? 'no score' : 'Biz ' + sc));
    c.title = '$ in calls ' + usd(n.prem_usd) + (num(n.prem_adv) ? ' · ' + pctTxt(n.prem_adv) + ' of a normal day’s trading' : '') +
      (num(n.per_day_usd) ? ' · ' + usd(n.per_day_usd) + ' per day left (each expiry’s $ ÷ its own days)' : '');
  }
  function fillBiz(r) {
    var n = r.n, c = r.c.biz; clear(c);
    c.appendChild(span('zph', 'Business '));
    if (!num(n.score)) {
      c.appendChild(span('zv none', '–')); c.title = 'No business score (funds and a few names have none).';
      return;
    }
    var sc = Math.max(0, Math.min(100, Math.round(n.score)));
    c.appendChild(span('zv' + (sc >= 70 ? ' hi' : ''), String(sc)));
    c.appendChild(span('zph', '/100'));
    var bar = span('zbar', null), i = document.createElement('i'); i.style.width = sc + '%'; bar.appendChild(i); c.appendChild(bar);
    c.title = 'Business score ' + sc + ' / 100' + (n.sector ? ' · ' + n.sector : '');
  }
  function fillAll(r) { fillPills(r); fillPrice(r); fillTogo(r); fillTrip(r); fillSpark(r); fillOdds(r); fillNew(r); fillBet(r); fillBiz(r); fillR20(r); fillHeld(r); }

  function buildRow(n, demo) {
    var art = document.createElement('article');
    art.className = 'row t' + n.tier; art.setAttribute('data-sym', n.sym);
    var sid = 'd-' + safeId(n.sym);
    var b = demo ? div('rsum') : btn('rsum', null);
    if (!demo) { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', sid); }
    var r = { art: art, b: b, n: n, c: {} };
    function cell(k, cls) { var s = span(cls, null); b.appendChild(s); r.c[k] = s; return s; }
    cell('tier', 'c-tier').appendChild(tierPill(n.tier));
    var st = cell('stock', 'c-stock'), tk = span('tk', n.sym);
    if (n.name) tk.title = n.name;
    st.appendChild(tk); r.pills = span('pills', null); st.appendChild(r.pills);
    cell('price', 'c-price'); cell('togo', 'c-togo'); cell('trip', 'c-trip'); cell('spark', 'c-spark');
    cell('odds', 'c-odds'); cell('nc', 'c-new'); cell('bet', 'c-bet'); cell('biz', 'c-biz'); cell('r20', 'c-r20'); cell('held', 'c-held');
    cell('chev', 'c-chev').textContent = '›';
    r.c.chev.setAttribute('aria-hidden', 'true');
    fillAll(r);
    art.appendChild(b);
    if (!demo) {
      var det = div('detail'); det.id = sid; det.hidden = true; art.appendChild(det); r.det = det;
      b.addEventListener('click', function () { toggleRow(n.sym); });
    }
    return r;
  }
  function addRow(host, n, ghost) {
    var r = buildRow(n);
    if (ghost) { r.leftAt = ghost.at; r.leftWhy = ghost.why; r.art.classList.add('left'); fillPills(r); }
    rowRefs[n.sym] = r; host.appendChild(r.art);
    return r;
  }

  // ---------- list ----------
  var SORTS = {
    odds: function (a, b) { return (num(b.odds) ? b.odds : -1) - (num(a.odds) ? a.odds : -1); },
    near: function (a, b) { return (num(a.dist) ? a.dist : 9) - (num(b.dist) ? b.dist : 9); },
    far: function (a, b) { return (num(b.dist) ? b.dist : -9) - (num(a.dist) ? a.dist : -9); },
    size: function (a, b) { return (num(b.gex_usd) ? b.gex_usd : -1) - (num(a.gex_usd) ? a.gex_usd : -1); },
    'new': function (a, b) { return (b._nc ? b._nc.pct : -9) - (a._nc ? a._nc.pct : -9); },
    r20: function (a, b) { return (num(b.ret20) ? b.ret20 : -9) - (num(a.ret20) ? a.ret20 : -9); },
    newest: function (a, b) { return (b.first_seen || '').localeCompare(a.first_seen || ''); },
    az: function (a, b) { return a.sym.localeCompare(b.sym); }
  };
  // rankings: every tier is ranked together (the money and the business don't care about the tier)
  var RANKS = {
    bet: { f: 'prem_usd', note: 'Ranked by $ in calls: what the calls at the pile were worth at the last saved option prices (open interest × option price × 100). The most money parked at a far strike comes first.' },
    betadv: { f: 'prem_adv', note: 'Ranked by $ in calls compared with a normal day’s trading in the stock (20-day average). A big bet in a quiet stock ranks high.' },
    betday: { f: 'per_day_usd', note: 'Ranked by $ per day left: each expiry’s money divided by its own days to expiry, added up. Big money on a short clock comes first.' },
    biz: { f: 'score', note: 'Ranked by the business score (six numbers: revenue growth on the year and the quarter, EPS growth, free-cash-flow growth and margin, PEG). Funds, and companies outside the large-company list the score covers or without enough reported numbers, have no score and sit at the bottom.' },
    combo: { f: 'combined', note: 'All three combined: the average of each name’s standing on $ in calls, on $ per day left and on the business score. Names without a business score sit at the bottom.' }
  };
  Object.keys(RANKS).forEach(function (k) {
    var f = RANKS[k].f;
    SORTS[k] = function (a, b) { return (num(b[f]) ? b[f] : -1) - (num(a[f]) ? a[f] : -1); };
  });
  function allRows() {
    var out = P.names.slice();
    Object.keys(ghosts).forEach(function (k) { if (!P.by[k]) out.push(ghosts[k].n); });
    return out;
  }
  function emptyBox(text, linkText, fn) {
    var d = div('empty'); d.appendChild(document.createTextNode(text));
    if (linkText) { d.appendChild(document.createTextNode(' ')); var b = btn('linkbtn', linkText); b.addEventListener('click', fn); d.appendChild(b); }
    return d;
  }
  function renderCounts() {
    var c = P ? P.counts : null;
    Array.prototype.forEach.call(document.querySelectorAll('#tierSeg [data-count]'), function (s) {
      var k = s.getAttribute('data-count');
      s.textContent = !c ? '–' : k === 'all' ? String(P.names.length) : String(c[k]);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#tierSeg button'), function (b) {
      var k = b.getAttribute('data-tier');
      b.setAttribute('aria-pressed', k === S.tier ? 'true' : 'false');
      if (c) b.setAttribute('aria-label', (k === 'all' ? 'All' : 'Tier ' + tierName(k)) + ', ' + (k === 'all' ? P.names.length : c[k]) + ((k === 'all' ? P.names.length : c[k]) === 1 ? ' name' : ' names'));
    });
    $('sort').value = S.sort;
    Array.prototype.forEach.call(document.querySelectorAll('#rankBar button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sort') === S.sort ? 'true' : 'false'); });
  }
  function renderList() {
    closePop();
    var host = $('rows'); clear(host); rowRefs = {};
    if (!P) return;
    $('tierNote').hidden = S.tier !== 'C';
    $('backBest').hidden = S.sort === 'best';
    var rk = RANKS[S.sort], rankOf = {};
    if (rk) {
      P.names.filter(function (n) { return num(n[rk.f]); }).sort(function (a, b) { return SORTS[S.sort](a, b) || a._i - b._i; })
        .forEach(function (n, i) { rankOf[n.sym] = i + 1; });
      var filt = S.tier !== 'all' || !!S.q.trim();
      var among = P.list === 'all' ? 'all ' + P.names.length : 'the ' + P.names.length + ' names on ' + LISTS[P.list].label;
      $('rankNote').textContent = rk.note + (filt ? ' Showing ' + (S.tier !== 'all' ? 'tier ' + tierName(S.tier) : 'your search') + ' only; the numbers are each name’s place among ' + among + '.' : ' All tiers are ranked together' + (P.list === 'all' ? '.' : ', within ' + LISTS[P.list].label + '.'));
    }
    $('rankNote').hidden = !rk;
    var rows = allRows();
    if (!rows.length) { host.appendChild(emptyBox('No name passes all five checks right now. That happens: we don’t lower the bar to fill the list.')); return; }
    if (S.tier !== 'all' && !P.counts[S.tier] && !rows.some(function (n) { return n.tier === S.tier; })) {
      host.appendChild(emptyBox('No tier ' + tierName(S.tier) + ' names today.', 'Show all', function () { setTier('all'); }));
      return;
    }
    var q = S.q.trim().toUpperCase(), ql = S.q.trim().toLowerCase();
    var match = function (n) {
      if (!q || n.sym.indexOf(q) === 0) return true;
      return ql.length >= 2 && typeof n.name === 'string' && (' ' + n.name.toLowerCase()).indexOf(' ' + ql) >= 0;
    };
    var tiers = S.tier === 'all' ? TIERS : [S.tier];
    var list = rows.filter(function (n) { return tiers.indexOf(n.tier) >= 0 && match(n); });
    if (q && !list.length) {
      host.appendChild(emptyBox('No name on today’s list starts with ' + q + '.', 'Check ' + q, function () { checkTicker(q); }));
      return;
    }
    if (S.sort === 'best') {
      tiers.forEach(function (t) {
        var grp = list.filter(function (n) { return n.tier === t; });
        var showRows = t !== 'C' || S.cOpen || S.tier === 'C' || !!q;
        if (!grp.length && !(t === 'C' && !q && P.counts.C)) return;
        host.appendChild(groupHead(t, q ? grp.length : P.counts[t], showRows));
        if (showRows) grp.forEach(function (n) { addRow(host, n, ghosts[n.sym] && !P.by[n.sym] ? ghosts[n.sym] : null); });
      });
    } else {
      var hideC = S.tier === 'all' && !S.cOpen && !q && !rk, f = SORTS[S.sort] || SORTS.odds;
      list.filter(function (n) { return !(hideC && n.tier === 'C'); })
        .sort(function (a, b) { return f(a, b) || (a._i || 0) - (b._i || 0); })
        .forEach(function (n, i) {
          var r = addRow(host, n, ghosts[n.sym] && !P.by[n.sym] ? ghosts[n.sym] : null);
          if (rk && rankOf[n.sym] && P.by[n.sym]) r.c.stock.insertBefore(span('rk', String(rankOf[n.sym])), r.c.stock.firstChild);
        });
      if (hideC && P.counts.C) {
        var p = para('c-hidden', P.counts.C + ' tier C names hidden (old piles). '), b = btn('linkbtn', 'Show ' + P.counts.C);
        b.addEventListener('click', function () { setCOpen(true); }); p.appendChild(b); host.appendChild(p);
      }
    }
    Object.keys(S.open).forEach(function (sym) { if (rowRefs[sym]) openRow(rowRefs[sym], false); else delete S.open[sym]; });
  }
  function groupHead(t, n, open) {
    var h = div('grp g' + t), tx0 = span('gtx', null);
    tx0.appendChild(tierPill(t)); tx0.appendChild(document.createTextNode(' ' + GROUP_TEXT[t] + ' '));
    tx0.appendChild(span('gn', '(' + n + ')'));
    h.appendChild(tx0);
    if (t === 'C' && S.tier !== 'C' && !S.q.trim()) {
      var b = btn('linkbtn', open ? 'Hide' : 'Show ' + n); b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.addEventListener('click', function () { setCOpen(!open); });
      h.appendChild(b);
    }
    return h;
  }
  function renderListBar() {
    var bar = $('listBar'), have = P && Object.keys(P.lists || {}).length;
    bar.hidden = !have;
    if (!have) return;
    Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) {
      var k = b.getAttribute('data-list'), ok = k === 'all' || !!P.lists[k];
      b.hidden = !ok;
      b.setAttribute('aria-pressed', k === P.list ? 'true' : 'false');
      var c = b.querySelector('[data-lcount]'); if (c) c.textContent = ok && num(P.listCounts[k]) ? String(P.listCounts[k]) : '';
      b.title = LISTS[k].title + (ok && num(P.listCounts[k]) ? ': ' + P.listCounts[k] + ' on today’s list' : '');
    });
  }
  function openLinked(sym) {
    if (P.by[sym]) { setTimeout(function () { goToRow(sym, false); }, 0); return; }
    if (P.list !== 'all' && P.allSyms[sym]) { setList('all'); setTimeout(function () { goToRow(sym, false); }, 0); }
  }
  function setList(k) {
    if (!isList(k)) k = 'all';
    S.list = k; sset('ps.list', k);
    if (!RAW) { return; }
    closePop(); ghosts = {}; $('updateBar').hidden = true; setStick();
    P = prep(RAW, k);
    Object.keys(S.open).forEach(function (sym) { if (!P.by[sym]) delete S.open[sym]; });
    renderAll();
  }
  function setTier(k) { S.tier = k; if (k === 'C') { S.cOpen = true; sset('ps.cOpen', '1'); } sset('ps.tier', k); renderCounts(); renderList(); }
  function setSort(k) { S.sort = SORTS[k] || k === 'best' ? k : 'best'; sset('ps.sort', S.sort); renderCounts(); renderList(); }
  function setCOpen(o) { S.cOpen = o; sset('ps.cOpen', o ? '1' : '0'); renderList(); }

  function toggleRow(sym) { var r = rowRefs[sym]; if (!r) return; if (S.open[sym]) closeRow(r, true); else openRow(r, true); }
  function openRow(r, user) {
    var sym = r.n.sym;
    if (user && GEO.mode === 'card') Object.keys(S.open).forEach(function (k) { if (k !== sym && rowRefs[k]) closeRow(rowRefs[k], false); });
    S.open[sym] = 1;
    r.art.classList.add('open'); r.b.setAttribute('aria-expanded', 'true'); r.det.hidden = false;
    buildDetail(r);
    if (user) { setHash(sym); if (GEO.mode === 'card') scrollToEl(r.art); }
  }
  function closeRow(r, user) {
    var sym = r.n.sym;
    delete S.open[sym];
    r.art.classList.remove('open'); r.b.setAttribute('aria-expanded', 'false'); r.det.hidden = true; clear(r.det); r.chart = null;
    if (user && decodeURIComponent(location.hash.slice(1)) === sym) clearHash();
  }
  function scrollToEl(node) {
    if (!node) return;
    try { node.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { node.scrollIntoView(true); }
  }
  function flashRow(r) {
    if (reduced()) return;
    r.art.classList.remove('jump'); void r.art.offsetWidth; r.art.classList.add('jump');
    setTimeout(function () { r.art.classList.remove('jump'); }, 700);
  }
  function goToRow(sym, flash) {
    var n = P && P.by[sym]; if (!n) return false;
    var re = false;
    if (S.tier !== 'all' && S.tier !== n.tier) { S.tier = 'all'; sset('ps.tier', 'all'); re = true; }
    if (n.tier === 'C' && !S.cOpen && S.tier !== 'C') { S.cOpen = true; sset('ps.cOpen', '1'); re = true; }
    if (S.q && n.sym.indexOf(S.q.trim().toUpperCase()) !== 0) { S.q = ''; $('q').value = ''; re = true; }
    if (re || !rowRefs[sym]) { renderCounts(); renderList(); }
    var r = rowRefs[sym]; if (!r) return false;
    if (!S.open[sym]) openRow(r, true); else setHash(sym);
    scrollToEl(r.art);
    if (flash) flashRow(r);
    return true;
  }

  // hash: "#SYM" opens a row; "#t=AB&s=odds&o=DRAM" also sets the tier and the sort (and wins over storage)
  function parseHash() {
    var h = ''; try { h = decodeURIComponent(location.hash.replace(/^#/, '')); } catch (e) { h = location.hash.replace(/^#/, ''); }
    if (!h) return {};
    if (h.indexOf('=') >= 0) { var o = {}; h.split('&').forEach(function (kv) { var p = kv.split('='); o[p[0]] = p[1]; }); return { t: o.t, s: o.s, l: o.l, o: o.o ? o.o.toUpperCase() : null }; }
    return /^[A-Za-z0-9.\-_]{1,12}$/.test(h) ? { o: h.toUpperCase() } : {};
  }
  function setHash(sym) { try { history.replaceState(null, '', location.pathname + location.search + '#' + encodeURIComponent(sym)); } catch (e) { } }
  function clearHash() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } }

  // ---------- row detail ----------
  function kick(t) { return para('d-k', t); }
  function plainEnglish(n) {
    var R = P.R, sym = n.sym, k = '$' + strike(n.node), parts = [];
    var cp = cpOf(n);
    if (num(n.call_oi) && num(n.put_oi))
      parts.push('Traders hold ' + int(n.call_oi) + ' calls at ' + k + ' against ' + int(n.put_oi) + ' puts (' + (cp === Infinity ? 'no puts' : ratioTxt(cp) + ' to 1') + '), counting expiries ' + R.dte_lo + '+ days out.');
    if (num(n.share)) parts.push('That pile is ' + p0(n.share) + ' of all the upside gamma on ' + sym + (n._persist != null ? ', and it has been the top pile in ' + n._persist + ' of the last ' + n._win + ' sessions' : '') +
      (n.first_seen ? ' (first seen ' + dS(n.first_seen) + ').' : '.'));
    var x = n._nc;
    if (x) {
      if (x.kind === 'strong' || x.kind === 'up') parts.push(int(x.chg) + ' calls were added at ' + k + ' over the last ' + x.w + ' sessions (' + sp0(x.pct) + ').');
      else if (x.kind === 'flat') parts.push('Hardly any calls were added lately.');
      else parts.push('Calls at ' + k + ' fell ' + p0(Math.abs(x.pct)) + ' over the last ' + x.w + ' sessions.');
    }
    if (num(n.ret20)) {
      var T = n._trip, trip = !T ? '' : T.above ? '; it was above the pile 20 days ago' : T.t > 0 ? ', ' + Math.round(Math.min(1, T.t) * 100) + '% of the way there from where it was' : ', moving away from it';
      parts.push('The price is ' + (n.ret20 >= 0 ? 'up ' : 'down ') + a1(n.ret20) + ' in 20 days' + trip + '.');
    }
    if (num(n.odds)) parts.push('The options give about a ' + p0(n.odds) + ' chance (about ' + oneIn(n.odds) + ') that ' + sym + ' trades at ' + k + ' at least once by ' + wS(n.main_exp) + '.');
    return parts.join(' ');
  }
  function whyList(n) {
    var R = P.R, ul = document.createElement('ul'); ul.className = 'why';
    var cp = cpOf(n), z = n.z, share = n.share;
    var bigOk = (num(share) && share >= R.min_share) || (num(n.gex_usd) && n.gex_usd >= R.or_min_gex_usd);
    [
      [num(n.dist) && n.dist >= R.min_dist, 'Far', a1(n.dist) + ' above', 'needs ' + p0(R.min_dist)],
      [bigOk, 'Big', p0(share) + ' of upside gamma' + (num(share) && share < R.min_share ? ' (' + usd(n.gex_usd) + ' of gamma)' : ''), 'needs ' + p0(R.min_share) + ', or ' + usd(R.or_min_gex_usd)],
      [n._persist != null && n._persist >= R.min_persist, 'Stays put', (n._persist != null ? n._persist : '–') + ' of ' + n._win + ' sessions', 'needs ' + R.min_persist],
      [cp != null && cp >= R.min_call_put, 'Mostly calls', cp === Infinity ? 'no puts' : ratioTxt(cp) + ' to 1', 'needs ' + strike(R.min_call_put)],
      [num(z) && z <= R.max_z, 'Reachable', (num(z) ? z.toFixed(1) : '–') + ' typical moves', 'needs ' + strike(R.max_z) + ' or less']
    ].forEach(function (w) {
      var li = document.createElement('li');
      li.appendChild(span(w[0] ? 'ok' : 'no', w[0] ? '✓' : '✗'));
      li.appendChild(document.createTextNode(w[1] + ': ' + w[2] + ' (' + w[3] + ')'));
      ul.appendChild(li);
    });
    return ul;
  }
  // the calls side of the tier, in words (the B bar: growth AND a contract count)
  function callsWords(n, flatWords) {
    var R = P.R, x = n._nc; if (!x) return '';
    var w = ' over ' + x.w + (x.w === '1' ? ' session' : ' sessions');
    if (x.kind === 'strong') return 'Calls at the pile are up ' + p0(x.pct) + w + '.';
    if (x.pct >= R.tierB_growth) return 'Calls at the pile are up ' + p0(x.pct) + w + ', but only ' + int(x.chg) + ' contracts (B needs ' + int(R.tierB_min) + '+).';
    if (x.kind === 'up') return 'Calls at the pile are up ' + (n.borderline === 'B' ? a1(x.pct) : p0(x.pct)) + w + ', ' + (n.borderline === 'B' ? 'just under' : 'under') + ' the ' + p0(R.tierB_growth) + ' bar for B.';
    if (x.kind === 'flat') return flatWords;
    return 'Calls at the pile are down ' + p0(Math.abs(x.pct)) + w + '.';
  }
  function priceWords(n) {
    var R = P.R; if (!num(n.ret20)) return '';
    if (n.ret20 <= 0) return 'The price is down ' + a1(n.ret20) + ' in 20 days.';
    return 'The price is up ' + a1(n.ret20) + ' in 20 days, ' + (n.borderline === 'A' ? 'just under' : 'under') + ' the ' + p0(R.tierA_ret20) + ' bar for A.';
  }
  function tierLine(n) {
    var x = n._nc, p = para('d-tier', null), t;
    var calls = x ? 'calls at the pile up ' + p0(Math.max(0, x.pct)) + ' (' + x.w + ' sessions)' : 'calls at the pile growing';
    var flatish = !x || x.kind === 'flat';
    if (n.tier === 'AB') t = 'Why A+B: up ' + a1(n.ret20) + ' in 20 days and ' + calls + '.';
    else if (n.tier === 'A') t = 'Why A: up ' + a1(n.ret20) + ' in 20 days. ' + (callsWords(n, 'Calls at the pile aren’t growing.') || 'Calls at the pile aren’t growing.');
    else if (n.tier === 'B') t = !num(n.ret20) || n.ret20 <= 0 ? 'Why B: ' + calls + ', but the price hasn’t started toward it.' : 'Why B: ' + calls + '. ' + priceWords(n);
    else if (flatish && (!num(n.ret20) || n.ret20 <= 0.01)) t = 'Why C: an old pile. These calls have barely changed and the price isn’t moving toward it. Often a fund selling calls against shares it owns, not a bet on a jump.';
    else t = 'Why C: neither A nor B today. ' + priceWords(n) + ' ' + callsWords(n, 'Calls at the pile have barely changed.') + ' Old piles like this are often a fund selling calls against shares it owns, not a bet on a jump.';
    p.appendChild(document.createTextNode(t.replace(/\s+/g, ' ').trim()));
    var fd = fuseDays(n);
    if (fd != null && fd >= 0 && fd <= 21) p.appendChild(span('amber', 'Short fuse: the main expiry, ' + wS(n.main_exp) + ', is ' + fd + ' days away (' + p0(n.main_share) + ' of these calls).'));
    return p;
  }
  function factsGrid(n) {
    var dl = document.createElement('dl'); dl.className = 'facts';
    function row(k, v) { var dt = document.createElement('dt'); dt.textContent = k; var dd = document.createElement('dd'); if (typeof v === 'string') dd.textContent = v; else dd.appendChild(v); dl.appendChild(dt); dl.appendChild(dd); return dd; }
    var cp = cpOf(n);
    row('$ in calls at the pile', usd(n.prem_usd) + (num(n.prem_adv) ? ' · ' + (n.prem_adv * 100).toFixed(1) + '% of a normal day’s trading (' + usd(n.adv_usd) + ')' : ''));
    if (num(n.per_day_usd)) row('$ per day left', usd(n.per_day_usd) + ' (each expiry’s $ ÷ its own days)');
    row('Business score', num(n.score) ? Math.round(n.score) + ' / 100' + (n.sector ? ' · ' + n.sector : '') : 'none (funds and some companies have no score)');
    if (n._comboRank && P.by[n.sym]) row('All three combined', '#' + n._comboRank + ' of ' + n._comboN + ' names with all three');
    row('Pile size (gamma $)', usd(n.gex_usd));
    row('Share of upside gamma', p0(n.share));
    var held = span('', (n._persist != null ? n._persist : '–') + ' of last ' + n._win + ' sessions ');
    held.appendChild(heldDots(n)); if (held.lastChild.className === 'held-t') held.removeChild(held.lastChild);
    row('Same pile for', held);
    row('First seen', wS(n.first_seen));
    row('Calls / puts at the pile', int(n.call_oi) + ' / ' + int(n.put_oi) + (cp == null ? '' : cp === Infinity ? ' (no puts)' : ' (' + ratioTxt(cp) + ' to 1)'));
    var ch = n.oi_chg || {}, miss = false;
    var nc = ['1', '3', '5'].map(function (w) { var v = ch[w]; if (!Array.isArray(v) || !num(v[0])) { miss = true; return '–'; } return sgnInt(v[0]) + ' (' + sp0(v[1]) + ')'; }).join(' / ');
    var ncv = span('', nc);
    if (miss && Array.isArray(n.oi_hist) && n.oi_hist[0]) ncv.appendChild(span('mut', 'collecting since ' + dS(n.oi_hist[0][0])));
    row('New calls · 1 / 3 / 5 sessions', ncv);
    row('Main expiry', wS(n.main_exp) + (num(n.main_share) ? ' · ' + p0(n.main_share) + ' of these calls' : ''));
    row('Typical moves away', num(n.z) ? n.z.toFixed(1) : '–');
    var r20 = span(num(n.ret20) ? (n.ret20 >= 0 ? 'up' : 'down') : '', sp1(n.ret20)); row('Last 20 trading days', r20);
    row('From 52-week closing high', sp1(n.off_high));
    var old = n.oi_settle && P.newest && n.oi_settle < P.newest;
    row('Option settle', old ? span('amber', dS(n.oi_settle) + ' (older chain)') : dS(n.oi_settle));
    return dl;
  }
  var XCOL = ['#3987E5', '#8EC0FA', '#2E6DB8', '#B9D8FB', '#5A9BE8'];
  function expiryBlock(n) {
    var mix = (Array.isArray(n.exp_mix) ? n.exp_mix : []).filter(function (e) { return Array.isArray(e) && typeof e[0] === 'string' && num(e[1]); }).slice(0, 5);
    if (!mix.length || !num(n.call_oi) || n.call_oi <= 0) return null;
    var w = div(''), bar = div('xbar');
    bar.setAttribute('role', 'img');
    var lab = mix.map(function (e) { return dS(e[0], true) + ' ' + p0(e[1] / n.call_oi); }).join(' · ');
    bar.setAttribute('aria-label', lab);
    mix.forEach(function (e, i) { var s = document.createElement('i'); s.style.width = (Math.min(1, e[1] / n.call_oi) * 100).toFixed(2) + '%'; s.style.background = XCOL[i % XCOL.length]; bar.appendChild(s); });
    w.appendChild(kick('Where the calls at $' + strike(n.node) + ' expire'));
    w.appendChild(bar); w.appendChild(para('xlab', lab));
    return w;
  }
  function copyLink(sym, b) {
    var url = location.origin + location.pathname + location.search + '#' + encodeURIComponent(sym);
    function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy link'; }, 1500); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch (e) { /* nothing */ }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
  }
  function buildDetail(r) {
    var n = r.n, det = r.det; clear(det);
    if (r.leftWhy) det.appendChild(para('d-left', 'Left the list at ' + r.leftAt + ' ET. ' + r.leftWhy));
    if (typeof n.name === 'string' && n.name) det.appendChild(para('d-name', n.sym + ' · ' + n.name));
    det.appendChild(kick('In plain English'));
    det.appendChild(para('d-en', plainEnglish(n)));
    var grid = div('d-grid'), left = div('d-l'), right = div('d-r');
    grid.appendChild(left); grid.appendChild(right); det.appendChild(grid);
    var ro = div('readout d-ro'); ro.setAttribute('aria-live', 'polite'); left.appendChild(ro);
    var ch = div('chart d-chart'); ch.tabIndex = 0; ch.setAttribute('role', 'group');
    ch.setAttribute('aria-label', n.sym + ' runway chart. Left and right arrows move through days.');
    left.appendChild(ch);
    var cap = para('cap', captionFor(n)); left.appendChild(cap);
    right.appendChild(kick('Why it’s here')); right.appendChild(whyList(n)); right.appendChild(tierLine(n));
    right.appendChild(kick('The facts')); right.appendChild(factsGrid(n));
    var xb = expiryBlock(n); if (xb) right.appendChild(xb);
    if (Array.isArray(n.related) && n.related.length) {
      right.appendChild(para('rel', 'Related piles: ' + n.related.filter(function (o) { return o && o.sym; }).map(function (o) { return o.sym + ' ' + strike(o.node) + ' (' + sp1(o.dist) + ')'; }).join(' · ')));
    }
    var links = div('links');
    var a = document.createElement('a'); a.className = 'btn'; a.textContent = 'Chart on TradingView ->';
    a.href = 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(n.tv || n.sym); a.target = '_blank'; a.rel = 'noopener noreferrer';
    var cb = btn('btn', 'Copy link'); cb.addEventListener('click', function () { copyLink(n.sym, cb); });
    links.appendChild(a); links.appendChild(cb); right.appendChild(links);
    r.chart = { holder: ch, ro: ro, n: n };
    drawRunway(r.chart);
  }
  function captionFor(n) {
    var by = wS(n.main_exp), od = p0(n.odds);
    var s = 'Shaded fan = where the price usually is by ' + by + ' (about one typical move up or down). ';
    if (!num(n.z)) return s;
    if (n.z < 1) return s + 'The pile is inside the fan, so the odds are ' + od + '.';
    if (n.z <= 1.5) return s + 'The pile is just outside the fan, so the odds are ' + od + '.';
    return s + 'The pile is outside the fan, so the odds are ' + od + '.';
  }
  function runwayRead(ch, dn, v, fan) {
    var ro = ch.ro, n = ch.n; clear(ro);
    ro.appendChild(span('d', monD(dn)));
    if (fan) { ro.appendChild(document.createTextNode(' · usual range about ' + px(fan.lo) + ' to ' + px(fan.hi) + ' · pile ' + strike(n.node))); return; }
    var x = num(n.node) && v ? n.node / v - 1 : null;
    ro.appendChild(document.createTextNode(' · ' + px(v) + (x == null ? '' : ' · ' + a1(x) + (x >= 0 ? ' under the pile' : ' above the pile'))));
  }
  function drawRunway(ch) {
    var n = ch.n, h = ch.holder; clear(h);
    var ser = n._spk;
    if (!ser) { h.appendChild(span('mut', 'No daily closes in this file.')); return; }
    var W = Math.max(260, Math.round(h.clientWidth || 300)), H = GEO.mode === 'card' ? 200 : 220;
    var L = 4, Rr = 6, T = 16, B = 20, pw = W - L - Rr, ph = H - T - B, hw = pw * 0.65, fw = pw - hw;
    var c = ser.c, d = ser.d, N = c.length, today = d[N - 1];
    var exp = n.main_exp ? dayNum(n.main_exp) : null, spanD = exp && exp > today ? exp - today : null, Ty = spanD ? spanD / 365 : null;
    var sig = num(n.atm_iv) && n.atm_iv > 0 ? n.atm_iv : (num(n.z) && n.z > 0 && num(n.dist) && Ty ? Math.log(1 + n.dist) / n.z / Math.sqrt(Ty) : null);
    var p0v = num(n.price) ? n.price : c[N - 1], fan = [];
    if (spanD && sig) for (var k = 0; k <= 24; k++) { var dd = today + spanD * k / 24, mm = sig * Math.sqrt((dd - today) / 365); fan.push({ dn: dd, hi: p0v * Math.exp(mm), lo: p0v * Math.exp(-mm) }); }
    var lo = Math.min.apply(null, c), hi = Math.max(Math.max.apply(null, c), num(n.node) ? n.node : -Infinity), rng = (hi - lo) || hi * 0.05;
    if (fan.length) { var fe = fan[fan.length - 1]; lo = Math.min(lo, Math.max(fe.lo, lo - rng * 0.35)); hi = Math.max(hi, Math.min(fe.hi, hi + rng * 0.35)); }
    var pd = (hi - lo) * 0.06; lo -= pd; hi += pd;
    var Y = lin(lo, hi, T + ph, T);
    function XH(i) { return L + (N > 1 ? i / (N - 1) : 1) * hw; }
    function XF(dn) { return L + hw + (spanD ? (dn - today) / spanD : 0) * fw; }
    var s = svgNode(W, H); h.appendChild(s);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', n.sym + ': the last ' + N + ' closes, the pile at ' + strike(n.node) + (fan.length ? ', and where the price usually is by ' + wS(n.main_exp) : '') + '.');
    var cid = 'rc' + (++uid), defs = el('defs', {}, s), cpth = el('clipPath', { id: cid }, defs);
    el('rect', { x: L, y: T, width: pw, height: ph }, cpth);
    var g = el('g', { 'clip-path': 'url(#' + cid + ')' }, s);
    if (fan.length) {
      var dp = 'M' + XF(today).toFixed(1) + ' ' + Y(p0v).toFixed(1);
      fan.forEach(function (f) { dp += 'L' + XF(f.dn).toFixed(1) + ' ' + Y(f.hi).toFixed(1); });
      for (var j = fan.length - 1; j >= 0; j--) dp += 'L' + XF(fan[j].dn).toFixed(1) + ' ' + Y(fan[j].lo).toFixed(1);
      el('path', { d: dp + 'Z', fill: C.fear, 'fill-opacity': 0.14 }, g);
      tx(s, XF(today + spanD * 0.7), Math.min(T + ph - 4, Math.max(T + 10, Y(p0v) + 4)), 'about', { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle', 'font-style': 'italic' });
    }
    if (num(n.off_high) && n.off_high < -0.001 && num(n.price)) {
      var h52 = n.price / (1 + n.off_high);
      if (h52 > lo && h52 < hi) {
        el('line', { x1: L, x2: L + hw, y1: Y(h52), y2: Y(h52), stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '1 3' }, g);
        tx(s, L + 2, Y(h52) - 3, '52-wk high', { fill: C.muted, 'font-size': 10.5 }, true);
      }
    }
    if (n.first_seen) {
      var fsd = dayNum(n.first_seen);
      if (fsd >= d[0] && fsd <= today) {
        var xf = XH(idxOnOrAfter(d, fsd));
        el('line', { x1: xf, x2: xf, y1: T, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '1 3' }, s);
        var yfs = num(n.node) && Y(n.node) - T < 18 ? Y(n.node) + 14 : T + 9;     // never on top of the pile line
        tx(s, xf + 3, yfs, 'first seen', { fill: C.muted, 'font-size': 10.5 }, true);
      }
    }
    var xt = XH(N - 1);
    el('line', { x1: xt, x2: xt, y1: T, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, s);
    if (num(n.node)) {
      var yn = Y(n.node);
      el('line', { x1: L, x2: L + pw, y1: yn, y2: yn, stroke: C.amber, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, s);
      tx(s, L + pw - 2, yn - 5, strike(n.node) + ' · pile', { fill: C.amber, 'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'end' }, true);
    }
    var dl = ''; for (var i = 0; i < N; i++) dl += (i ? 'L' : 'M') + XH(i).toFixed(1) + ' ' + Y(c[i]).toFixed(1);
    el('path', { d: dl, fill: 'none', stroke: C.light, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, g);
    el('circle', { cx: xt, cy: Y(c[N - 1]), r: 3.5, fill: '#fff', stroke: C.panel, 'stroke-width': 1.5 }, s);
    // x labels: first day · today · main expiry
    var labs = [{ x: xt, t: monD(today, true) + ' today', a: 'middle', w: 0 }];
    if (spanD) labs.push({ x: L + pw, t: monD(exp, true), a: 'end' });
    labs.push({ x: L, t: monD(d[0], true), a: 'start' });
    var kept = [];
    labs.forEach(function (o) {
      var w = textW(o.t, 11), x0 = o.a === 'start' ? o.x : o.a === 'end' ? o.x - w : o.x - w / 2;
      if (o.a === 'middle') { x0 = Math.max(L, Math.min(L + pw - w, x0)); }
      if (kept.some(function (q) { return x0 < q.x1 + 6 && x0 + w + 6 > q.x0; })) return;
      kept.push({ x0: x0, x1: x0 + w }); tx(s, x0, H - 5, o.t, { fill: C.muted, 'font-size': 11 });
    });
    var cross = el('g', { 'pointer-events': 'none' }, s), xs = [];
    for (i = 0; i < N; i++) xs.push(XH(i));
    for (k = 1; k < fan.length; k++) xs.push(XF(fan[k].dn));
    function rest() { clear(cross); runwayRead(ch, today, c[N - 1]); }
    attachReader(h, {
      xs: xs,
      show: function (ix) {
        clear(cross);
        var x = xs[ix];
        el('line', { x1: x, x2: x, y1: T, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross);
        if (ix < N) { el('circle', { cx: x, cy: Y(c[ix]), r: 3.5, fill: '#fff', stroke: C.bg, 'stroke-width': 1.2 }, cross); runwayRead(ch, d[ix], c[ix]); }
        else { var f = fan[ix - N + 1]; runwayRead(ch, Math.round(f.dn), null, f); }
      },
      rest: rest
    });
    rest();
  }
  function miniChart(holder, ser, o) {
    clear(holder);
    if (!ser) { holder.appendChild(span('mut', 'No daily closes in this file.')); return; }
    var W = Math.max(240, Math.round(holder.clientWidth || 300)), H = o.H, L = 4, Rr = 6, T = 12, B = 18, pw = W - L - Rr, ph = H - T - B;
    var c = ser.c, d = ser.d, N = c.length, vals = c.slice();
    if (num(o.node)) vals.push(o.node);
    if (o.hit && num(o.hit.v)) vals.push(o.hit.v);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.08 || hi * 0.02; lo -= pd; hi += pd;
    var X = function (i) { return L + (N > 1 ? i / (N - 1) : 0) * pw; }, Y = lin(lo, hi, T + ph, T);
    var s = svgNode(W, H); holder.appendChild(s);
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', o.label || 'Price line with the pile');
    if (num(o.node)) {
      el('line', { x1: L, x2: L + pw, y1: Y(o.node), y2: Y(o.node), stroke: C.amber, 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }, s);
      tx(s, L + pw - 2, Y(o.node) - 4, strike(o.node) + ' · pile', { fill: C.amber, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end' }, true);
    }
    var dl = ''; for (var i = 0; i < N; i++) dl += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(c[i]).toFixed(1);
    el('path', { d: dl, fill: 'none', stroke: C.light, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, s);
    if (o.seen != null && o.seen >= d[0] && o.seen <= d[N - 1]) { var si = idxOnOrAfter(d, o.seen); el('circle', { cx: X(si), cy: Y(num(o.seenV) ? o.seenV : c[si]), r: 4, fill: C.bg, stroke: C.light, 'stroke-width': 1.8 }, s); }
    if (o.hit && o.hit.dn != null && o.hit.dn >= d[0] && o.hit.dn <= d[N - 1]) { var hi2 = idxOnOrAfter(d, o.hit.dn); el('circle', { cx: X(hi2), cy: Y(num(o.hit.v) ? o.hit.v : c[hi2]), r: 4.5, fill: C.gold, stroke: C.bg, 'stroke-width': 1.5 }, s); }
    if (o.today) el('circle', { cx: X(N - 1), cy: Y(c[N - 1]), r: 3, fill: '#fff' }, s);
    tx(s, L, H - 4, monD(d[0], true), { fill: C.muted, 'font-size': 10.5 });
    tx(s, L + pw, H - 4, monD(d[N - 1], true), { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'end' });
  }

  // ---------- check any ticker (search + Enter) ----------
  var CHECK_ORDER = ['far', 'big', 'persist', 'calls', 'reach'];
  function hideCheck() { var c = $('checkCard'); c.hidden = true; clear(c); }
  function checkTicker(raw) {
    var sym = String(raw || '').trim().toUpperCase();
    if (!sym || !P) return;
    if (P.by[sym]) { hideCheck(); goToRow(sym, true); return; }
    var card = $('checkCard'); clear(card); card.hidden = false;
    if (P.list !== 'all' && P.allSyms[sym]) {
      var h0 = div('cc-h'), x0 = btn('x-btn', '✕'); x0.setAttribute('aria-label', 'Close the check'); x0.addEventListener('click', hideCheck);
      h0.appendChild(add(document.createElement('b'), sym + ' is on today’s whole list, but not in ' + LISTS[P.list].label + '.')); h0.appendChild(x0); card.appendChild(h0);
      var go = btn('btn', 'Show it on the whole list'); go.addEventListener('click', function () { hideCheck(); setList('all'); goToRow(sym, true); });
      card.appendChild(go); return;
    }
    var ix = P.index ? P.index[sym] : null, inCl = P.closing.filter(function (c) { return c.sym === sym; })[0];
    var hit = P.hits.filter(function (h) { return h.sym === sym; })[0];
    var head = div('cc-h'), x = btn('x-btn', '✕'); x.setAttribute('aria-label', 'Close the check'); x.addEventListener('click', hideCheck);
    var R = P.R;
    if (P.index && !ix && !inCl && !hit) {
      var onL = ['wl', 'spx', 'ndx'].filter(function (k) { return P.lists[k] && P.lists[k][sym]; })[0];
      head.appendChild(span('', onL
        ? sym + ' is on ' + LISTS[onL].label + ', but we don’t keep an option chain for it' + (onL === 'wl' ? ' (the sweep leaves out leveraged and inverse funds, crypto and the VIX, and some names have no usable chain).' : ' (no usable chain today).')
        : 'We don’t keep option chains for ' + sym + '. We track ' + (P.universeAll != null ? int(P.universeAll) : 'about 590') + ' names: the S&P 500, the Nasdaq-100 and the optionable names on Watchlist 1.'));
      head.appendChild(x); card.appendChild(head); return;
    }
    head.appendChild(add(document.createElement('b'), sym + ' isn’t on today’s list.')); head.appendChild(x); card.appendChild(head);
    if (ix) {
      var node = ix[1], dist = ix[2], share = ix[3], fail = ix[4], val = ix[5];
      if (fail === 'below') card.appendChild(para('', sym + '’s biggest call pile is at or below the price, so there’s nothing to seek upward.'));
      else if (fail === 'nochain') card.appendChild(para('', sym + ' has no usable option chain or price history today, so it can’t be checked.'));
      else {
        var ul = document.createElement('ul'), fi = CHECK_ORDER.indexOf(fail);
        var PASS = {
          far: '✓ Far: its biggest call pile (' + strike(node) + ') is ' + a1(dist) + ' above the price.',
          big: '✓ Big: the pile holds ' + p0(share) + ' of upside gamma.',
          persist: '✓ Stays put.', calls: '✓ Mostly calls.', reach: '✓ Reachable.'
        };
        var FAIL = {
          far: '✗ Far: its biggest call pile (' + strike(node) + ') is only ' + a1(dist) + ' above the price (needs ' + p0(R.min_dist) + ').',
          big: '✗ Big: the pile holds ' + p0(share) + ' of upside gamma (needs ' + p0(R.min_share) + ', or ' + usd(R.or_min_gex_usd) + ').',
          persist: '✗ Stays put: the top strike was the same in only ' + (num(val) ? val : '–') + ' of the last ' + R.persist_window + ' sessions (needs ' + R.min_persist + ').',
          calls: '✗ Mostly calls: ' + (num(val) ? ratioTxt(val) : '–') + ' calls per put at that strike (needs ' + strike(R.min_call_put) + ').',
          reach: '✗ Reachable: ' + (num(val) ? val.toFixed(1) : '–') + ' typical moves away (needs ' + strike(R.max_z) + ' or less).'
        };
        var LABEL = { far: 'Far', big: 'Big', persist: 'Stays put', calls: 'Mostly calls', reach: 'Reachable' };
        CHECK_ORDER.forEach(function (k, i) {
          var li = document.createElement('li');
          if (fi < 0 || i < fi) li.textContent = PASS[k];
          else if (i === fi) { li.className = 'first-fail'; li.textContent = FAIL[k]; }
          else li.textContent = '– ' + LABEL[k] + ': not evaluated.';
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
    } else if (!P.index) card.appendChild(para('mut', 'The 5-check detail for names off the list comes with the next version of the data file.'));
    if (inCl || hit) {
      var lk = para('cc-links', null);
      if (inCl) { var b1 = btn('linkbtn', 'It’s in Closing in.'); b1.addEventListener('click', function () { goToClosing(sym); }); lk.appendChild(b1); }
      if (hit) { if (inCl) lk.appendChild(document.createTextNode(' ')); var b2 = btn('linkbtn', 'Its pile ' + strike(hit.node) + ' was reached on ' + dS(hit.reached) + '.'); b2.addEventListener('click', function () { goToHit(sym); }); lk.appendChild(b2); }
      card.appendChild(lk);
    }
  }
  function goToClosing(sym) {
    var list = sortedClosing(), i = list.map(function (c) { return c.sym; }).indexOf(sym);
    if (i >= 5 && !S.closingAll) { S.closingAll = true; renderClosing(); }
    S.clOpen[sym] = 1; renderClosing();
    var node = document.querySelector('#closingRows .cl[data-sym="' + cssEsc(sym) + '"]');
    scrollToEl(node || $('closing'));
  }
  function goToHit(sym) {
    var node = document.querySelector('#hitRows .hl[data-sym="' + cssEsc(sym) + '"]');
    scrollToEl(node || $('hits'));
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  // ---------- closing in ----------
  function sortedClosing() {
    return P.closing.slice().sort(function (a, b) { return (b._touched ? 1 : 0) - (a._touched ? 1 : 0) || (num(a.dist) ? a.dist : 9) - (num(b.dist) ? b.dist : 9); });
  }
  function renderClosing() {
    var sec = $('closing'); sec.hidden = false;
    var list = sortedClosing(), host = $('closingRows'); clear(host);
    $('closingH').textContent = 'Closing in (' + list.length + ')';
    if (!list.length) host.appendChild(para('src', 'None right now.'));
    (S.closingAll ? list : list.slice(0, 5)).forEach(function (c) { host.appendChild(closingRow(c)); });
    var more = $('closingMore');
    more.hidden = list.length <= 5;
    more.textContent = S.closingAll ? 'Show fewer' : 'Show all ' + list.length;
    more.setAttribute('aria-expanded', S.closingAll ? 'true' : 'false');
    Object.keys(S.clOpen).forEach(function (k) { var w = host.querySelector('.cl[data-sym="' + cssEsc(k) + '"]'); if (w && w._draw) w._draw(); });
  }
  function closingRow(c) {
    var w = div('cl' + (c._touched ? ' touched' : '')), id = 'cl-' + safeId(c.sym);
    w.setAttribute('data-sym', c.sym);
    var b = btn('cl-sum', null); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
    var t = span('cl-txt', null);
    var sep = function () { return span('sep', ' · '); };
    add(t, span('tk', c.sym), sep(), span('', px(c.price) + ' → ' + strike(c.node)), sep());
    if (c._touched) add(t, span('', 'TOUCHED today' + (num(c.day_high) ? ' · high ' + px(c.day_high) : '') + '. ' +
      (P.doc.state === 'LIVE' ? 'Counts as a hit once the close confirms it.' : 'It joins Recent hits at the next record update.')));
    else {
      add(t, span('togo', a1(c.dist) + ' to go'), sep(), span('seen', 'first seen ' + dS(c.first_seen) + ' at ' + px(c.spot_first) + ' (' + a1(c.dist_first) + ' away)'));
      if (num(c.price) && num(c.spot_first) && num(c.node) && c.node > c.spot_first)
        add(t, sep(), span('', p0((c.price - c.spot_first) / (c.node - c.spot_first)) + ' of the way'));
    }
    b.appendChild(t);
    var sp = span('cl-sp', null); sp.appendChild(sparkSvg(c._spk, c.node, 128, 28)); b.appendChild(sp);
    var ch = span('c-chev', '›'); ch.setAttribute('aria-hidden', 'true'); b.appendChild(ch);
    w.appendChild(b);
    var det = div('cl-det'); det.id = id; det.hidden = true; w.appendChild(det);
    w._draw = function () {
      w.classList.add('open'); b.setAttribute('aria-expanded', 'true'); det.hidden = false;
      miniChart(det, c._spk, { H: 120, node: c.node, seen: c.first_seen ? dayNum(c.first_seen) : null, seenV: c.spot_first, today: true, label: c.sym + ': the last closes and the pile at ' + strike(c.node) });
    };
    b.addEventListener('click', function () {
      if (S.clOpen[c.sym]) { delete S.clOpen[c.sym]; w.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); det.hidden = true; clear(det); }
      else { S.clOpen[c.sym] = 1; w._draw(); }
    });
    return w;
  }

  // ---------- recent hits ----------
  function onListFirst(h) {
    if (!('q_day' in h)) return '–';
    return h.q_day ? 'Yes, from ' + dS(h.q_day) : 'No: reached before it passed all 5 checks';
  }
  function renderHits() {
    $('hits').hidden = false;
    var rec = P.rec;
    $('hitsCount').textContent = 'Counting since ' + dS(rec.since) + ': ' + (num(rec.tracked) ? int(rec.tracked) : '–') + ' far piles tracked, ' + (num(rec.reached) ? int(rec.reached) : '–') +
      ' reached, ' + (num(rec.still_open) ? int(rec.still_open) : '–') + ' still open, ' + (P.missed != null ? int(P.missed) : '–') + ' ran out of time.';
    var host = $('hitRows'); clear(host);
    if (!P.hits.length) host.appendChild(para('src', 'No far pile has been reached yet.'));
    P.hits.forEach(function (h) {
      var w = div('hl'), canOpen = !!h._path, sum = canOpen ? btn('hl-sum', null) : div('hl-sum');
      w.setAttribute('data-sym', h.sym);
      var first = onListFirst(h);
      add(sum, span('h-stk tk', h.sym), span('h-pile', strike(h.node)),
        add(span('h-seen', null), span('hk', 'first seen '), dS(h.first_seen) + ' · ' + px(h.spot) + ' (' + a1(h.dist) + ' away)'),
        add(span('h-reach', null), span('hk', 'reached '), dS(h.reached) + (num(h.high) ? ' · high ' + px(h.high) : '') + (num(h.sessions) ? ' · ' + h.sessions + ' sessions' : '')),
        add(span('h-first' + (/^Yes/.test(first) ? ' yes' : ''), null), span('hk', 'On the list first? '), first));
      var ch = span('c-chev', canOpen ? '›' : ''); ch.setAttribute('aria-hidden', 'true'); sum.appendChild(ch);
      w.appendChild(sum);
      if (canOpen) {
        var det = div('hl-det'), id = 'hl-' + safeId(h.sym) + '-' + safeId(h.node); det.id = id; det.hidden = true; w.appendChild(det);
        sum.setAttribute('aria-expanded', 'false'); sum.setAttribute('aria-controls', id);
        var key = h.sym + '|' + h.node;
        var draw = function () {
          w.classList.add('open'); sum.setAttribute('aria-expanded', 'true'); det.hidden = false;
          var hd = h.reached ? dayNum(h.reached) : null;
          miniChart(det, h._path, { H: 90, node: h.node, seen: h.first_seen ? dayNum(h.first_seen) : null, seenV: h.spot, hit: { dn: hd, v: h.high }, label: h.sym + ': from first seen to the touch of ' + strike(h.node) });
        };
        sum.addEventListener('click', function () {
          if (S.hitOpen[key]) { delete S.hitOpen[key]; w.classList.remove('open'); sum.setAttribute('aria-expanded', 'false'); det.hidden = true; clear(det); }
          else { S.hitOpen[key] = 1; draw(); }
        });
        if (S.hitOpen[key]) setTimeout(draw, 0);
      }
      host.appendChild(w);
    });
    // misses
    var ms = P.misses || [], n = P.missed != null ? P.missed : ms.length;
    $('missesH').textContent = 'Ran out of time (' + n + ')';
    var mh = $('missRows'); clear(mh);
    if (!ms.length) mh.appendChild(para('src', 'None yet. That isn’t good news: the first main expiries are ' + firstExpWords() + ', and most piles expire in December or January.'));
    ms.forEach(function (m) {
      mh.appendChild(para('miss', m.sym + ' · pile ' + strike(m.node) + ' · first seen ' + dS(m.first_seen) + ' · odds then ' + (num(m.q_odds) ? p0(m.q_odds) : '–') +
        ' · main expiry ' + dS(m.main_exp) + ' passed · got within ' + a1(m.closest)));
    });
  }
  function firstExpWords() { var e = P.byExp && P.byExp[0]; return e ? dS(e.exp) : 'Oct 16'; }

  // ---------- scoreboard ----------
  var BUCKETS = [[0.13, 0.25, '13–25%'], [0.25, 0.40, '25–40%'], [0.40, 0.60, '40–60%'], [0.60, 1.01, '60%+']];
  function renderScore() {
    $('score').hidden = false;
    var rec = P.rec, sc = P.scored || {}, R = P.R;
    var hitsQ = P.hits.filter(function (h) { return 'q_day' in h; }), k = hitsQ.length === P.hits.length && P.hits.length ? P.hits.filter(function (h) { return !!h.q_day; }).length : null;
    var T = $('scoreTiles'); clear(T);
    function tile(kk, v, small, note) {
      var t = div('tile'); t.appendChild(span('t-k', kk));
      var tv = span('t-v', v); if (small) tv.appendChild(add(document.createElement('small'), small)); t.appendChild(tv);
      if (note) t.appendChild(span('t-n', note));
      T.appendChild(t);
    }
    tile('REACHED', num(rec.reached) ? int(rec.reached) : '–');
    tile('STILL OPEN', num(rec.still_open) ? int(rec.still_open) : '–');
    tile('RAN OUT OF TIME', P.missed != null ? int(P.missed) : '–');
    tile('ON THE LIST FIRST', k != null ? String(k) : '–', 'of ' + (num(rec.reached) ? int(rec.reached) : '–'), 'the others were reached before they could pass all 5 checks');
    // calendar
    var cal = $('cal'); clear(cal);
    cal.appendChild(para('cal-t', 'When the piles on today’s list resolve'));
    var rows = P.byExp.slice(0, 4).map(function (e) { return { t: dS(e.exp, true), n: e.n }; });
    var later = P.byExp.slice(4).reduce(function (a, e) { return a + e.n; }, 0);
    if (P.byExp.length > 4) rows.push({ t: 'later', n: later });
    var mx = Math.max.apply(null, rows.map(function (r) { return r.n; }).concat([1]));
    if (!rows.length) cal.appendChild(para('src', 'No piles on today’s list.'));
    rows.forEach(function (r) {
      var row = div('cal-row'); row.appendChild(span('', r.t));
      var bw = span('', null), bar = span('cal-bar', null); bar.style.width = (r.n / mx * 100).toFixed(1) + '%'; bw.appendChild(bar); row.appendChild(bw);
      row.appendChild(span('cal-n', String(r.n))); cal.appendChild(row);
    });
    // early bias: piles on today's list that expire two months out or later
    var N = P.names.length, cut = null, nLate = 0;
    if (N && P.doc.prices_day) {
      var c60 = dayNum(P.doc.prices_day) + 60;
      P.byExp.forEach(function (e) { if (cut == null && dayNum(e.exp) >= c60) cut = e.exp; });
      if (cut) P.byExp.forEach(function (e) { if (e.exp >= cut) nLate += e.n; });
    }
    $('earlyBias').textContent = 'Too early to grade. Hits can come any day, but a miss only counts when the expiry passes' +
      (cut ? ', and ' + nLate + ' of the ' + N + ' piles on today’s list expire ' + dS(cut) + ' or later' : '') + '. So for months the record will look better than it really is.';
    var ts = R.test_start ? dayNum(R.test_start) : null;
    $('testBox').textContent = 'The test, written down ' + TEST_WRITTEN + ': from ' + (ts ? wmd(ts) : 'Mon Oct 5') + ' on, every pile that passes all 5 checks counts from its first day on the list, with the odds it had that day. ' +
      'A pile is reached if the price trades at or above it before its main expiry, and missed if that expiry passes first. Once ' + R.min_closed +
      ' piles have resolved, we compare the reached count with what the odds said, overall and by tier. Piles from before ' + (ts ? monD(ts) : 'Oct 5') + ' are shown above but not scored.';
    var closed = num(sc.closed) ? sc.closed : 0;
    $('progT').textContent = 'Scored so far: ' + closed + ' of the ' + R.min_closed + ' we need';
    var pg = $('prog'); pg.setAttribute('aria-valuemax', String(R.min_closed)); pg.setAttribute('aria-valuenow', String(closed));
    pg.setAttribute('aria-label', 'Scored so far: ' + closed + ' of ' + R.min_closed);
    pg.firstChild.style.width = Math.min(100, closed / R.min_closed * 100).toFixed(1) + '%';
    renderScoreTable();
  }
  function renderScoreTable() {
    var sc = P.scored || {}, R = P.R, early = !num(sc.closed) || sc.closed < R.min_closed;
    Array.prototype.forEach.call(document.querySelectorAll('#scoreSeg button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sv') === S.scoreBy ? 'true' : 'false'); });
    var tb = $('scoreTable'); clear(tb); tb.classList.toggle('greyed', early);
    var cap = tb.createCaption(); cap.textContent = early ? 'Greyed until ' + R.min_closed + ' piles have resolved. Raw counts only.' : 'Odds said = how many the odds expected to be reached.';
    var hr = tb.createTHead().insertRow();
    [S.scoreBy === 'odds' ? 'Odds when listed' : 'Tier', 'Resolved', 'Reached', 'Odds said', 'Verdict'].forEach(function (h, i) { var th = document.createElement('th'); th.textContent = h; if (i === 4) th.className = 'vd'; hr.appendChild(th); });
    var body = tb.createTBody(), rows;
    if (S.scoreBy === 'odds') {
      var bb = Array.isArray(sc.by_bucket) ? sc.by_bucket : [];
      rows = BUCKETS.map(function (b) { var m = bb.filter(function (x) { return x && Math.abs((x.lo || 0) - b[0]) < 0.005; })[0] || {}; return [b[2], m]; });
    } else {
      var bt = Array.isArray(sc.by_tier) ? sc.by_tier : [];
      rows = TIERS.map(function (t) { var m = bt.filter(function (x) { return x && x.tier === t; })[0] || {}; return [tierName(t), m]; });
    }
    rows.forEach(function (r) {
      var m = r[1], cl = num(m.closed) ? m.closed : 0, hit = num(m.hit) ? m.hit : 0, ex = num(m.expected) ? m.expected : null;
      var tr = body.insertRow();
      [r[0], String(cl), String(hit), cl && ex != null ? ex.toFixed(1) : '–', early ? 'Too early' : verdict(hit, ex, cl)].forEach(function (v, i) {
        var td = tr.insertCell(); td.textContent = v; if (i === 4) td.className = 'vd';
      });
    });
  }
  function verdict(hit, ex, closed) {
    if (!closed || ex == null) return '–';
    var p = ex / closed, se = Math.sqrt(closed * p * (1 - p));   // Σp(1−p) with the bucket's mean odds
    if (Math.abs(hit - ex) <= 2 * se) return 'about what the odds said';
    return hit > ex ? 'more than the odds said' : 'fewer than the odds said';
  }

  // ---------- rules + numbers table + footer ----------
  function renderRules() {
    var R = P.R, b = $('rulesBody'); clear(b);
    function h3(t) { var h = document.createElement('h3'); h.textContent = t; b.appendChild(h); }
    function ul(items) { var u = document.createElement('ul'); items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; u.appendChild(li); }); b.appendChild(u); }
    h3('The 5 checks (a pile must pass all five)');
    ul(['Far: at least ' + p0(R.min_dist) + ' above the price.',
      'Big: at least ' + p0(R.min_share) + ' of the stock’s upside gamma, or ' + usd(R.or_min_gex_usd) + '+ of gamma.',
      'Stays put: the top pile in ' + R.min_persist + ' of the last ' + R.persist_window + ' sessions.',
      'Mostly calls: at least ' + strike(R.min_call_put) + ' calls for every put at that strike.',
      'Reachable: no more than ' + strike(R.max_z) + ' typical moves away by its main expiry.']);
    h3('The 4 tiers (set by the engine, explained here)');
    var bl = R.borderline || {};
    ul(['A+B: both A and B.',
      'A: the price is up more than ' + p0(R.tierA_ret20) + ' in 20 trading days.',
      'B: calls at the pile up ' + p0(R.tierB_growth) + '+ and ' + int(R.tierB_min) + '+ contracts over the last few sessions.',
      'C: passes the 5 checks but is neither A nor B: an old pile.',
      'Borderline: within ' + (num(bl.ret20) ? Math.round(bl.ret20 * 100) : 1) + ' point of the A bar or ' + (num(bl.growth) ? Math.round(bl.growth * 100) : 2) + ' points of the B bar.',
      'Short fuse: the main expiry is 21 days away or less.']);
    b.appendChild(para('', 'Expiries ' + R.dte_lo + ' to ' + R.dte_hi + ' days out only. Odds = 2 × (1 − N(z)), z = ln(pile / price) ÷ (at-the-money IV of the main expiry × √years left): the chance a price swinging the way its options expect, with no drift, trades at the pile at least once before that expiry. Ignores skew.'));
  }
  var NUM_COLS = [
    ['Stock', function (n) { return n.sym; }, 0],
    ['Tier', function (n) { return tierName(n.tier); }, 0],
    ['Price', function (n) { return n.price; }, 0, px],
    ['Pile', function (n) { return n.node; }, 0, strike],
    ['To go %', function (n) { return num(n.dist) ? n.dist * 100 : null; }, 0, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['Odds %', function (n) { return num(n.odds) ? n.odds * 100 : null; }, 0, function (v) { return num(v) ? Math.round(v) + '' : '–'; }],
    ['By', function (n) { return n.main_exp || ''; }, 0, function (v) { return dS(v); }],
    ['Typical moves', function (n) { return n.z; }, 1, function (v) { return num(v) ? v.toFixed(2) : '–'; }],
    ['Pile $M', function (n) { return num(n.gex_usd) ? n.gex_usd / 1e6 : null; }, 1, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['Share %', function (n) { return num(n.share) ? n.share * 100 : null; }, 1, function (v) { return num(v) ? Math.round(v) + '' : '–'; }],
    ['Held', function (n) { return n._persist; }, 1, function (v, n) { return v == null ? '–' : v + ' of ' + n._win; }],
    ['First seen', function (n) { return n.first_seen || ''; }, 1, function (v) { return dS(v); }],
    ['Calls', function (n) { return n.call_oi; }, 1, int],
    ['Puts', function (n) { return n.put_oi; }, 1, int],
    ['New calls % (window)', function (n) { return n._nc ? n._nc.pct * 100 : null; }, 1, function (v, n) { return n._nc ? sp0(n._nc.pct) + ' (' + n._nc.w + 's)' : '–'; }],
    ['20d %', function (n) { return num(n.ret20) ? n.ret20 * 100 : null; }, 1, function (v) { return num(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) : '–'; }],
    ['From 52w high %', function (n) { return num(n.off_high) ? n.off_high * 100 : null; }, 1, function (v) { return num(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) : '–'; }],
    ['Settle', function (n) { return n.oi_settle || ''; }, 1, function (v) { return dS(v); }],
    ['$ in calls $M', function (n) { return num(n.prem_usd) ? n.prem_usd / 1e6 : null; }, 0, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['vs day %', function (n) { return num(n.prem_adv) ? n.prem_adv * 100 : null; }, 1, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['$/day left $M', function (n) { return num(n.per_day_usd) ? n.per_day_usd / 1e6 : null; }, 1, function (v) { return num(v) ? v.toFixed(2) : '–'; }],
    ['Business', function (n) { return n.score; }, 0, function (v) { return num(v) ? Math.round(v) + '' : '–'; }],
    ['All three #', function (n) { return n._comboRank || null; }, 1, function (v) { return v ? '#' + v : '–'; }, 'asc']
  ];
  var numSort = { col: -1, dir: 1 };
  function renderNumTable() {
    var tb = $('numTable'); clear(tb);
    if (!P) return;
    var hr = tb.createTHead().insertRow();
    NUM_COLS.forEach(function (c, i) {
      var th = document.createElement('th'); th.scope = 'col'; if (c[2]) th.className = 'wide-only';
      if (numSort.col === i) th.setAttribute('aria-sort', numSort.dir > 0 ? 'ascending' : 'descending');
      var b = btn('', c[0]); b.addEventListener('click', function () { numSort = { col: i, dir: numSort.col === i ? -numSort.dir : (i < 2 || i === 6 || i === 11 || NUM_COLS[i][4] === 'asc' ? 1 : -1) }; renderNumTable(); });
      th.appendChild(b); hr.appendChild(th);
    });
    var rows = P.names.slice();
    if (numSort.col >= 0) {
      var g = NUM_COLS[numSort.col][1];
      rows.sort(function (a, b) {
        var x = g(a), y = g(b);
        if (x == null || x === '') return 1; if (y == null || y === '') return -1;
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * numSort.dir || a._i - b._i;
      });
    }
    var body = tb.createTBody();
    rows.forEach(function (n) {
      var tr = body.insertRow();
      NUM_COLS.forEach(function (c, i) {
        var td = tr.insertCell(), v = c[1](n);
        td.textContent = c[3] ? c[3](v, n) : (v == null ? '–' : String(v));
        if (c[2]) td.className = 'wide-only';
        if (i === 0) td.className = 'tk-c';
      });
    });
  }
  function csvCell(v) { var s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function downloadCsv() {
    if (!P) return;
    var lines = [NUM_COLS.map(function (c) { return csvCell(c[0]); }).join(',')];
    P.names.forEach(function (n) {
      lines.push(NUM_COLS.map(function (c, i) {
        var v = c[1](n);
        if (i === 14) return csvCell(n._nc ? (n._nc.pct * 100).toFixed(1) + ' (' + n._nc.w + ')' : '');
        if (i === 10) return csvCell(n._persist == null ? '' : n._persist + '/' + n._win);
        return csvCell(typeof v === 'number' ? +v.toFixed(4) : v);
      }).join(','));
    });
    var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'price-seeker-' + (P.doc.prices_day || 'today') + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function renderFoot() {
    $('footRec').textContent = 'Pile records start ' + dS(P.rec.since) + '; open-interest history starts ' + (P.oiStart ? dS(P.oiStart) : '–') + '.';
    $('footData').textContent = 'Derived from delayed public options data (previous-session open interest) and ~15-minute delayed prices' +
      (P.doc.price_source ? ' (' + P.doc.price_source + ')' : '') + '. Only computed values are shown, not quotes.';
  }

  // ---------- "How to read a row" dialog + column popovers ----------
  function demoName() {
    if (P && P.names) {
      var full = P.names.filter(function (x) { return num(x.score) && num(x.prem_usd) && x._trip && x._spk && x._nc; });
      var pick = full.filter(function (x) { return x.tier === 'AB'; })[0] || full.filter(function (x) { return x.tier === 'A'; })[0] || full[0];
      if (pick) return pick;
      if (P.by && P.by.DRAM) return P.by.DRAM;
    }
    var c = [], v = 64.4;
    for (var i = 0; i < 60; i++) { v += Math.sin(i / 5) * 0.55 - 0.05; c.push(Math.round(v * 100) / 100); }
    c[59] = 61.78;
    var n = { sym: 'DRAM', tier: 'AB', price: 61.78, prev_close: 62.03, node: 70, dist: 0.1331, odds: 0.2327, main_exp: '2026-10-16', ret20: 0.0991, prem_usd: 43567074,
      oi_chg: { '3': [46181, 0.298] }, persist: 10, persist_window: 10, spark: { start: '2026-07-09', c: c } };
    n._win = 10; n._persist = 10; n._spk = normSeries(n.spark); n._trip = tripOf(n); n._nc = ncOf(n, P ? P.R : RULE_DEF);
    return n;
  }
  function buildHelp() {
    var demo = $('helpDemo'); clear(demo); demo.className = 'demo';
    var savedP = P;
    if (!P) P = { R: RULE_DEF, doc: {}, newest: null };     // the static sample also works before the data arrives
    var r = buildRow(demoName(), true);
    P = savedP;
    [['tier', 1], ['price', 2], ['trip', 3], ['spark', 4], ['odds', 5], ['nc', 6], ['bet', 7], ['biz', 8]].forEach(function (o) { var b = span('cn', String(o[1])); b.setAttribute('aria-hidden', 'true'); r.c[o[0]].insertBefore(b, r.c[o[0]].firstChild); });
    demo.appendChild(r.art);
    var ol = $('helpList'); clear(ol);
    CALLOUTS.forEach(function (c, i) {
      var li = document.createElement('li'); li.appendChild(span('cn', String(i + 1)));
      var t = span('', null); t.appendChild(add(document.createElement('b'), c[0] + ': ')); t.appendChild(document.createTextNode(c[1])); li.appendChild(t);
      ol.appendChild(li);
    });
    helpBuilt = true;
  }
  function openHelp() {
    closePop();
    if (!helpBuilt || (P && P.names && !helpBuilt.real)) { buildHelp(); helpBuilt = { real: !!(P && P.names) }; }
    lastFocus = document.activeElement;
    $('help').hidden = false; document.documentElement.classList.add('dlg-open');
    $('helpClose').focus();
  }
  function closeHelp() {
    $('help').hidden = true; document.documentElement.classList.remove('dlg-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (e) { return !e.disabled && e.offsetParent !== null; });
  }
  function togglePop(b) {
    if (popBtn === b) { closePop(true); return; }
    closePop();
    var k = +b.getAttribute('data-pop'), list = $('list');
    pop = div('pop'); pop.id = 'colpop'; pop.setAttribute('role', 'note');
    pop.appendChild(add(document.createElement('b'), CALLOUTS[k - 1][0] + ': ')); pop.appendChild(document.createTextNode(CALLOUTS[k - 1][1]));
    if (k === 7 && GEO.mode === 'mid') {                  // tablets: Business shares this column, so its (i) explains both
      pop.appendChild(document.createElement('br')); pop.appendChild(add(document.createElement('b'), CALLOUTS[7][0] + ': ')); pop.appendChild(document.createTextNode(CALLOUTS[7][1]));
    }
    list.appendChild(pop);
    var lr = list.getBoundingClientRect(), br = b.getBoundingClientRect(), pw = pop.offsetWidth;
    pop.style.left = Math.max(0, Math.min(lr.width - pw, br.left - lr.left - 20)) + 'px';
    pop.style.top = (br.bottom - lr.top + 8) + 'px';
    b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-describedby', 'colpop'); popBtn = b;
  }
  function closePop(refocus) {
    if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    if (popBtn) { popBtn.setAttribute('aria-expanded', 'false'); popBtn.removeAttribute('aria-describedby'); if (refocus) popBtn.focus(); }
    pop = null; popBtn = null;
  }

  // ---------- live refresh: in-place updates, never a reorder under the finger ----------
  function flashCell(node) {
    if (reduced() || !node) return;
    node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash');
    setTimeout(function () { node.classList.remove('flash'); }, 650);
  }
  function whyLeft(sym, np) {
    var c = np.closing.filter(function (x) { return x.sym === sym; })[0];
    if (c) return 'Now ' + a1(c.dist) + ' away: moved to Closing in.';
    var ix = np.index ? np.index[sym] : null;
    if (ix) {
      var R = np.R, f = ix[4], v = ix[5];
      if (f === 'below') return sym + '’s biggest call pile is at or below the price, so there’s nothing to seek upward.';
      if (f === 'far') return 'Its biggest call pile (' + strike(ix[1]) + ') is only ' + a1(ix[2]) + ' above the price (needs ' + p0(R.min_dist) + ').';
      if (f === 'big') return 'The pile holds ' + p0(ix[3]) + ' of upside gamma (needs ' + p0(R.min_share) + ', or ' + usd(R.or_min_gex_usd) + ').';
      if (f === 'persist') return 'The top strike was the same in only ' + (num(v) ? v : '–') + ' of the last ' + R.persist_window + ' sessions (needs ' + R.min_persist + ').';
      if (f === 'calls') return (num(v) ? ratioTxt(v) : '–') + ' calls per put at that strike (needs ' + strike(R.min_call_put) + ').';
      if (f === 'reach') return (num(v) ? v.toFixed(1) : '–') + ' typical moves away (needs ' + strike(R.max_z) + ' or less).';
    }
    return 'It no longer passes all 5 checks.';
  }
  function updateRow(r, nn) {
    var before = { price: r.c.price.textContent, togo: r.c.togo.textContent, trip: r.c.trip.textContent, odds: r.c.odds.textContent, r20: r.c.r20.textContent };
    r.n = nn; fillAll(r);
    Object.keys(before).forEach(function (k) { if (r.c[k].textContent !== before[k]) flashCell(r.c[k]); });
    if (S.open[nn.sym]) {
      var anchor = r.chart ? r.chart.holder : r.art, top = anchor.getBoundingClientRect().top;
      buildDetail(r);
      var a2 = r.chart ? r.chart.holder : r.art, dy = a2.getBoundingClientRect().top - top;
      if (Math.abs(dy) > 0.5) window.scrollBy(0, dy);
    }
  }
  function applyUpdate(np, viaVisible) {
    var old = P;
    P = np;
    if (!Object.keys(S.open).length && viaVisible) { ghosts = {}; $('updateBar').hidden = true; setStick(); renderAll(); return; }   // nothing under the finger: re-sort
    var t = hm12(np.gen, NY), nNew = 0;
    np.names.forEach(function (n) { if (!old.by[n.sym]) nNew++; });
    Object.keys(rowRefs).forEach(function (sym) {
      var r = rowRefs[sym], nn = np.by[sym];
      if (nn) { if (r.leftAt) { r.leftAt = null; r.leftWhy = null; r.art.classList.remove('left'); delete ghosts[sym]; } updateRow(r, nn); }
      else if (!r.leftAt) {
        r.leftAt = t; r.leftWhy = whyLeft(sym, np); ghosts[sym] = { n: r.n, at: t, why: r.leftWhy };
        r.art.classList.add('left'); fillPills(r);
        if (S.open[sym]) buildDetail(r);
      }
    });
    renderListBar(); renderTiles(); renderCounts(); renderClosing(); renderHits(); renderScore(); renderRules(); renderFoot(); renderStatus();
    if ($('numbers').open) renderNumTable();
    var nLeft = Object.keys(ghosts).filter(function (k) { return !np.by[k]; }).length;
    if (nNew || nLeft) showUpdateBar(t, nNew, nLeft);
  }
  function showUpdateBar(t, nNew, nLeft) {
    var b = $('updateBar'); clear(b); b.hidden = false;
    b.appendChild(span('', 'Updated ' + t + ' ET · ' + nNew + ' new · ' + nLeft + ' left the list'));
    var x = btn('btn', 'Re-sort');
    x.addEventListener('click', function () { ghosts = {}; b.hidden = true; setStick(); renderList(); });
    b.appendChild(x);
    setStick();
  }
  function setStick() {
    var b = $('updateBar');
    document.documentElement.style.setProperty('--stick', (58 + (b.hidden ? 0 : b.offsetHeight + 6)) + 'px');
  }

  // ---------- render everything ----------
  function renderAll() {
    $('content').hidden = false;
    renderListBar(); renderStatus(); renderTiles(); renderStory(); renderCounts(); renderList(); renderClosing(); renderHits(); renderScore(); renderRules(); renderFoot();
    if ($('numbers').open) renderNumTable();
    if (helpBuilt && !helpBuilt.real) helpBuilt = false;
    if (pendingOpen) { var o = pendingOpen; pendingOpen = null; openLinked(o); }
  }
  function showFatal(e) {
    P = null; rowRefs = {}; ghosts = {};
    fatal = e;
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'ERROR';
    $('asof').textContent = e.version !== undefined ? 'The data format changed.' : 'No numbers to show.';
    $('statusLine').textContent = ''; $('pilesLine').textContent = '';
    bannerSig = ''; renderBanners();
  }

  // ---------- fetching ----------
  function getJSON() {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    var url = dataUrl + (dataUrl.indexOf('?') < 0 ? '?' : '&') + 't=' + Math.floor(Date.now() / 60000);
    return fetch(url, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json().catch(function () { throw new Error('the file is not valid JSON'); });
      }, function (e) {
        clearTimeout(timer);
        throw new Error(e && e.name === 'AbortError' ? 'timed out after 15 s' : 'network error');
      });
  }
  function load(initial, viaVisible) {
    if (loading) return;
    loading = true; lastFetchAt = Date.now();
    if (initial && fatal) { var chip = $('chip'); chip.className = 'chip chip-wait'; chip.textContent = 'LOADING'; $('asof').textContent = 'Fetching the latest numbers…'; }
    getJSON().then(function (d) {
      check(d);
      RAW = d;
      var np = prep(d, S.list);
      lastErr = null;
      if (!P) { fatal = null; bannerSig = ''; P = np; renderAll(); }
      else if (np.doc.generated === P.doc.generated) renderStatus();
      else applyUpdate(np, viaVisible);
    }).catch(function (e) {
      var msg = (e && e.message) || String(e);
      if (!P) showFatal(e && e.version !== undefined ? { version: e.version } : { msg: msg });
      else { lastErr = { at: now(), msg: msg }; renderStatus(); }
    }).then(function () { loading = false; schedule(); });
  }
  function pollDelay() {
    var t = now(), p = tzParts(t, NY), dn = Date.UTC(p.y, p.mo - 1, p.d) / 864e5, mins = p.h * 60 + p.mi;
    return isSession(dn) && mins >= 570 && mins <= 990 ? POLL_FAST : POLL_SLOW;
  }
  function schedule() { clearTimeout(pollTimer); if (!document.hidden) pollTimer = setTimeout(function () { load(false, false); }, pollDelay()); }

  // ---------- wire up ----------
  (function initState() {
    var t = sget('ps.tier'), s = sget('ps.sort'), c = sget('ps.cOpen'), li = sget('ps.list');
    if (isList(li)) S.list = li;
    if (t && (t === 'all' || TIERS.indexOf(t) >= 0)) S.tier = t;
    if (s && (s === 'best' || SORTS[s])) S.sort = s;
    S.cOpen = c === '1';
    var h = parseHash();
    if (h.t && (h.t === 'all' || TIERS.indexOf(h.t) >= 0)) S.tier = h.t;
    if (h.s && (h.s === 'best' || SORTS[h.s])) S.sort = h.s;
    if (isList(h.l)) S.list = h.l;
    if (h.o) pendingOpen = h.o;
    if (S.tier === 'C') S.cOpen = true;
  })();
  initFolds();
  renderCounts();
  renderBanners();
  Array.prototype.forEach.call(document.querySelectorAll('#tierSeg button'), function (b) { b.addEventListener('click', function () { setTier(b.getAttribute('data-tier')); }); });
  $('sort').addEventListener('change', function () { setSort(this.value); });
  Array.prototype.forEach.call(document.querySelectorAll('#rankBar button'), function (b) { b.addEventListener('click', function () { setSort(b.getAttribute('data-sort')); }); });
  Array.prototype.forEach.call(document.querySelectorAll('#listBar button'), function (b) { b.addEventListener('click', function () { setList(b.getAttribute('data-list')); }); });
  $('backBestBtn').addEventListener('click', function () { setSort('best'); });
  var q = $('q');
  q.addEventListener('input', function () { S.q = q.value; hideCheck(); renderList(); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); checkTicker(q.value); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (q.value) { q.value = ''; S.q = ''; hideCheck(); renderList(); } else q.blur(); }
  });
  $('helpBtn').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('help').addEventListener('click', function (e) { if (e.target === $('help')) closeHelp(); });
  $('help').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeHelp(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables($('help')); if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('#lhead .ib'), function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); togglePop(b); }); });
  document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target) && e.target !== popBtn) closePop(); });
  document.addEventListener('keydown', function (e) {
    if (!$('help').hidden) return;
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); q.focus(); return; }
    if (e.key === 'Escape') {
      if (pop) { closePop(true); return; }
      var art = t && t.closest ? t.closest('.row') : null;
      if (art && art.classList.contains('open')) { var r = rowRefs[art.getAttribute('data-sym')]; if (r) { closeRow(r, true); r.b.focus(); } }
    }
  });
  $('closingMore').addEventListener('click', function () { S.closingAll = !S.closingAll; renderClosing(); if (!S.closingAll) scrollToEl($('closing')); });
  Array.prototype.forEach.call(document.querySelectorAll('#scoreSeg button'), function (b) { b.addEventListener('click', function () { S.scoreBy = b.getAttribute('data-sv'); if (P) renderScoreTable(); }); });
  $('numbers').addEventListener('toggle', function () { if (this.open) renderNumTable(); });
  $('csvBtn').addEventListener('click', downloadCsv);
  window.addEventListener('hashchange', function () { var h = parseHash(); if (h.o && P) openLinked(h.o); });
  var rsT = null;
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(onResize, 140); });
  function onResize() {
    var g = geoNow(); var mode0 = GEO.mode; GEO.mode = g; var sw = spkW();
    closePop();
    if (P && (g !== mode0 || sw !== GEO.spk)) { GEO.spk = sw; renderList(); }
    else if (P) Object.keys(S.open).forEach(function (k) { var r = rowRefs[k]; if (r && r.chart) drawRunway(r.chart); });
    GEO.spk = sw;
    if (P && STORY && storyIsOpen()) drawStory();
    if (P) {
      Array.prototype.forEach.call(document.querySelectorAll('#closingRows .cl.open'), function (w) { if (w._draw) w._draw(); });
      Array.prototype.forEach.call(document.querySelectorAll('#hitRows .hl.open .hl-sum'), function (b) { b.click(); b.click(); });
    }
    setStick();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(pollTimer); return; }
    if (Date.now() - lastFetchAt > 30 * 1000) load(false, true); else schedule();
  });
  setInterval(function () { if (P) renderStatus(); else renderBanners(); }, TICK_MS);
  // read-only state for tests and debugging
  try {
    Object.defineProperty(window, '__seeker', { configurable: true, get: function () {
      if (!P) return { loaded: false, fatal: fatal, dataUrl: dataUrl };
      return { loaded: true, dataUrl: dataUrl, version: P.doc.version, generated: P.doc.generated, chip: $('chip').textContent, counts: P.counts,
        names: P.names.length, rowsBuilt: Object.keys(rowRefs), open: Object.keys(S.open), tier: S.tier, sort: S.sort, cOpen: S.cOpen, ghosts: Object.keys(ghosts),
        geo: GEO.mode, poll: pollDelay() };
    } });
    window.__seekerPoll = function () { load(false, false); };
  } catch (e) { }
  load(true);
})();
