





(function () {
  'use strict';



  var GH = /(^|\.)github\.io$/i.test(location.hostname);
  var DEFAULT_BASE = GH ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/ai-semis-fear-data/ai-semis-fear/' : 'snap/';
  var DATA_FILE = 'aisf.json';
  var POLL_MS = GH ? 5 * 60 * 1000 : 60 * 1000;
  var TICK_MS = 30 * 1000;
  var FETCH_TIMEOUT_MS = 20000;
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: '#7E57C2', light: '#B39DDB', sp: '#FFFFFF' };
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
  var TFS = ['1D', '1W', '2W', '1M'];
  var TF_NAME = { '1D': 'Daily candles', '1W': 'Weekly candles', '2W': '2-week candles', '1M': 'Monthly candles' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


  var HOLIDAYS = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'];
  var HALF_DAYS = ['2026-11-27', '2026-12-24', '2027-11-26'];
  var CAL_END = '2027-12-31';


  var params = new URLSearchParams(location.search);
  var base = DEFAULT_BASE, preview = null;
  var nowOverride = null;
  if (params.get('now')) { var t0 = Date.parse(params.get('now')); if (!isNaN(t0)) nowOverride = t0 - Date.now(); }
  function now() { return Date.now() + (nowOverride || 0); }





  var GROUPS = [], PRICES = [];
  var PRICE_ORDER = ['QQQ', 'SMH', 'SPY', 'BASKET'];
  var DEFAULT_PRICE = { all: 'QQQ', ai: 'QQQ', semis: 'SMH', hb: 'BASKET' };
  function normGroup(s) { var u = String(s || '').trim().toLowerCase(); return /^[a-z0-9_]{1,24}$/.test(u) && (!GROUPS.length || GROUPS.indexOf(u) >= 0) ? u : null; }
  function normPrice(s) { var u = String(s || '').trim().toUpperCase(); return /^[A-Z0-9_.]{1,12}$/.test(u) && (!PRICES.length || PRICES.indexOf(u) >= 0) ? u : null; }
  function stored(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function store(key, v) { try { localStorage.setItem(key, v); } catch (e) {  } }
  var grpChosen = !!(normGroup(params.get('g')) || normGroup(stored('aisfGroup')));
  var grp = normGroup(params.get('g')) || normGroup(stored('aisfGroup')) || 'all';
  var urlPrice = normPrice(params.get('p'));
  var pickedPrice = normPrice(stored('aisfPrice'));
  var pp = urlPrice || pickedPrice || DEFAULT_PRICE[grp] || 'QQQ';

  var HOVER = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var TAP = HOVER ? 'hover' : 'tap';


  var $ = function (id) { return document.getElementById(id); };
  function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function isoOf(dn) { return new Date(dn * 864e5).toISOString().slice(0, 10); }
  function dnDate(dn) { return new Date(dn * 864e5); }
  function fmtDay(dn, withYear, withWd) {
    var d = dnDate(dn);
    return (withWd ? WD[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (withYear ? ', ' + d.getUTCFullYear() : '');
  }
  function fmtMonYear(dn) { var d = dnDate(dn); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function pct0(v) { return Math.round(v) + '%'; }
  function lat0(st) { return (typeof st.latest0 === 'number' ? st.latest0 : Math.round(st.latest)) + '%'; }
  function closedNow() { return doc.state === 'LIVE' && !!doc.live.session_closed; }
  function hm(epoch) { return fmtTz(epoch, 'America/New_York', '', false).trim(); }
  function pct1(v) { return v.toFixed(1) + '%'; }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function bsearchLE(arr, x) {
    var lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  }
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
    var hm = (p.h < 10 ? '0' : '') + p.h + ':' + (p.mi < 10 ? '0' : '') + p.mi;
    return (withDay === false ? '' : p.wd + ' ' + MON[p.mo - 1] + ' ' + p.d + ', ') + hm + ' ' + label;
  }

  var LOCAL_TZ = (function () { try { var z = new Intl.DateTimeFormat().resolvedOptions().timeZone; tzParts(0, z); return z || ''; } catch (e) { return ''; } })();
  function localTail(epoch, withDay) {
    if (!LOCAL_TZ || tzOffsetMin(epoch, LOCAL_TZ) === tzOffsetMin(epoch, 'America/New_York')) return '';
    return ' · ' + fmtTz(epoch, LOCAL_TZ, 'your time', withDay);
  }
  function etAndLocal(epoch) { return fmtTz(epoch, 'America/New_York', 'ET') + localTail(epoch); }
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


  var NS = 'http://www.w3.org/2000/svg';
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
      var fs = parseFloat(a['font-size']) || 12, w = textW(str, fs, a['font-weight'] || 400) + (a['letter-spacing'] ? str.length * 0.5 : 0);
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
  function niceStep(span, target) {
    var raw = span / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= raw) return steps[i] * mag;
    return 10 * mag;
  }
  function f1(v) { return Math.round(v * 10) / 10; }





  var full = null, fullSha = null, doc = null, D = null, GW = null, PX = null, RF = null, loadedAt = 0, lastErr = null, uid = 0;
  var hover = { c1: null, c2: null, cv: null, cs: null, cb: null, cgs: null, cgb: null };



  function arr(a, n) { return Array.isArray(a) && (n == null || a.length === n); }

  function groupKeys(f) {
    var L = f.meta && arr(f.meta.groups) ? f.meta.groups.map(function (m) { return m && m.key; }).filter(function (k) { return k && f.groups[k]; }) : [];
    return L.length ? L : Object.keys(f.groups);
  }

  function priceKeys(f, g) {
    var ks = Object.keys((f.prices && f.prices[g]) || {}), order = f.meta && arr(f.meta.prices) && f.meta.prices.length ? f.meta.prices : PRICE_ORDER;
    return order.filter(function (p) { return ks.indexOf(p) >= 0; }).concat(ks.filter(function (p) { return order.indexOf(p) < 0; }));
  }

  function validateFull(f) {
    if (!f || typeof f !== 'object' || f.schema !== 2 || !f.groups || !f.prices || !f.board || !f.funds || !f.meta) return false;
    var gs = groupKeys(f), ps = gs.length ? priceKeys(f, gs[0]) : [];
    if (!gs.length || !ps.length) return false;
    return gs.every(function (g) {
      var d = f.groups[g], pr = f.prices[g];
      if (!validate(d) || !d.group || !d.group.bases || !pr || !arr(f.board[g])) return false;
      return ps.every(function (p) {
        var x = pr[p]; if (!x || !arr(x.d, d.daily.d.length) || !x.info) return false;
        return ['1W', '2W', '1M'].every(function (k) { return arr(x[k], d.tf[k].s.length); });
      });
    });
  }


  function tenth(x) { return typeof x === 'number' && isFinite(x) ? x / 10 : null; }
  function prepareRef(r) {
    if (!r || typeof r !== 'object' || !r.daily || !arr(r.daily.d) || r.daily.d.length < 2 || !arr(r.daily.v, r.daily.d.length)) return null;
    if (!r.daily.d.every(function (x) { return /^\d{4}-\d\d-\d\d$/.test(x); })) return null;
    var d = r.daily.d.map(dayNum), o = { tf: {}, latest: {} };
    o.tf['1D'] = { s: d, e: d, v: r.daily.v.map(tenth) };
    ['1W', '2W', '1M'].forEach(function (k) {
      var t = r.tf && r.tf[k];
      o.tf[k] = t && arr(t.s) && t.s.length && arr(t.e, t.s.length) && arr(t.v, t.s.length) ?
        { s: t.s.map(dayNum), e: t.e.map(dayNum), v: t.v.map(tenth) } : null;
    });
    TFS.forEach(function (k) {
      var x = r.latest ? r.latest[k] : null, T = o.tf[k];
      if (x && typeof x === 'object') x = typeof x.latest === 'number' ? x.latest : x.v;
      o.latest[k] = typeof x === 'number' && isFinite(x) ? x : T && T.v.length ? T.v[T.v.length - 1] : null;
    });
    var as = r.as_of;
    o.session = as && typeof as === 'object' ? (as.session || null) : typeof as === 'string' && /^\d{4}-\d\d-\d\d/.test(as) ? as.slice(0, 10) : isoOf(d[d.length - 1]);
    o.live = !!r.is_live;
    return o;
  }

  var TF_DAYS = { '1W': 7, '2W': 14, '1M': 31 };
  function refIdx(k, dn) {
    var T = RF && RF.tf[k]; if (!T) return -1;
    var i = bsearchLE(T.s, dn);
    if (i < 0) return -1;
    if (k === '1D') return T.s[i] === dn ? i : -1;

    return i < T.s.length - 1 || dn - T.s[i] < TF_DAYS[k] ? i : -1;
  }

  function groupDoc(f, g, p) {
    var src = f.groups[g], d = {};
    for (var key in src) d[key] = src[key];
    d.daily = { d: src.daily.d, v: src.daily.v, n: src.daily.n, spy: f.prices[g][p].d };
    return d;
  }


  var GROUP_WORDS = {
    all: { short: 'All', who: 'AI, semis & high-beta stocks', title: 'The AI, semis & high-beta fear meter' },
    ai: { short: 'AI', who: 'AI stocks', title: 'The AI fear meter' },
    semis: { short: 'Semis', who: 'semiconductor stocks', title: 'The semis fear meter' },
    hb: { short: 'High beta', who: 'high-beta stocks', title: 'The high-beta fear meter' } };
  var PRICE_TITLE = { QQQ: 'QQQ (Nasdaq-100 fund)', SMH: 'SMH (VanEck semiconductor fund)', SPY: 'SPY (S&P 500 fund)',
    SOXX: 'SOXX (iShares semiconductor fund)', BASKET: 'Basket (equal weight, 100 at start)' };
  function priceName(p) { return p === 'BASKET' ? 'Basket' : p; }
  function gMeta(g) {
    var L = full && full.meta && arr(full.meta.groups) ? full.meta.groups : [];
    for (var i = 0; i < L.length; i++) if (L[i] && L[i].key === g) return L[i];
    return {};
  }
  function groupWords(g) {
    var m = gMeta(g), w = GROUP_WORDS[g] || {}, G = (full.groups[g] && full.groups[g].group) || {};
    var label = m.label || G.label || g, short = m.short || w.short || label, dp = String(m.default_price || '').toUpperCase();
    return { short: short, label: label, who: m.who || m.words || w.who || label + ' stocks', title: m.title || w.title || 'The ' + label + ' fear meter',
      n: typeof m.n_listed === 'number' ? m.n_listed : G.listed,
      price: PRICES.indexOf(dp) >= 0 ? dp : PRICES.indexOf(DEFAULT_PRICE[g]) >= 0 ? DEFAULT_PRICE[g] : PRICES[0] };
  }
  function setWords() {
    var G = doc.group, b = G.bases, w = groupWords(grp);
    GW = { key: grp, label: w.label, short: w.short, title: w.title, listed: G.listed, who: w.who, a: b.r13.word, aS: b.r13.short,
      b: b.r21.word, bS: b.r21.short, one: !!b.r21.same_as_r13, start: dayNum(G.series_start) };
    PCT_BASES.s13.word = GW.a; PCT_BASES.s13.short = GW.aS; PCT_BASES.s21.word = GW.b; PCT_BASES.s21.short = GW.bS;
    var info = full.prices[grp][pp].info || {};
    PX = { key: pp, name: priceName(pp), title: info.title || PRICE_TITLE[pp] || pp, info: info, first: info.first_date ? dayNum(info.first_date) : null };
  }
  function validate(d) {
    if (!d || typeof d !== 'object' || d.schema !== 1) return false;
    if (d.state !== 'LIVE' && d.state !== 'CLOSED') return false;
    if (!d.daily || !arr(d.daily.d) || d.daily.d.length < 300) return false;
    var n = d.daily.d.length, V = d.view, i, k;
    if (!arr(d.daily.v, n) || !arr(d.daily.spy, n) || !arr(d.daily.n, n)) return false;
    if (!V || V.v !== 1 || !V.tf || !arr(V.hot) || !arr(V.hp, 2) || typeof V.foot !== 'string') return false;
    for (i = 0; i < 4; i++) {
      k = TFS[i];
      var t = i ? d.tf && d.tf[k] : null, m = i ? (t && arr(t.s) ? t.s.length : -1) : n, w = V.tf[k];
      if (i && (m < 10 || !arr(t.e, m) || !arr(t.v, m))) return false;
      if (!d.stats || !d.stats[k] || typeof d.stats[k].latest !== 'number') return false;
      if (!w || !arr(w.r13, m) || !arr(w.r21, m) || !arr(w.K, m) || !arr(w.D, m) || !arr(w.J, m) || !arr(w.lv, 3) ||
        !arr(w.pk) || !arr(w.xu) || !arr(w.xd) || typeof w.rp !== 'number' || w.rp < 0 || w.rp >= m) return false;
    }
    if (!d.live || !d.live.asof_utc || isNaN(Date.parse(d.live.asof_utc)) || !/^\d{4}-\d\d-\d\d$/.test(d.live.session_date)) return false;
    return true;
  }
  function prepare(d) {
    var P = { d: d.daily.d.map(dayNum), v: d.daily.v.map(function (x) { return x / 10; }), n: d.daily.n, spy: d.daily.spy, tf: {}, hot: {} };
    P.tf['1D'] = { s: P.d, e: P.d, v: P.v, n: P.n };
    ['1W', '2W', '1M'].forEach(function (k) {
      var t = d.tf[k];
      P.tf[k] = { s: t.s.map(dayNum), e: t.e.map(dayNum), v: t.v.map(function (x) { return x / 10; }), n: arr(t.n, t.s.length) ? t.n : null };
    });
    P.last = P.d[P.d.length - 1];



    TFS.forEach(function (k) {
      var w = d.view.tf[k], T = P.tf[k];
      T.r13 = w.r13; T.r21 = w.r21; T.lv = w.lv; T.mg = !!w.mg; T.peaks = w.pk; T.rp = w.rp;
    });
    d.view.hot.forEach(function (i) { P.hot[i] = 1; });
    P.hp = d.view.hp;

    P.spv = P.d.map(function () { return null; }); P.gap = P.spv.slice();
    if (RF) {
      var S = RF.tf['1D'], j = 0;
      for (var i = 0; i < P.d.length; i++) {
        while (j < S.e.length && S.e[j] < P.d[i]) j++;
        if (j < S.e.length && S.e[j] === P.d[i] && S.v[j] != null) { P.spv[i] = S.v[j]; P.gap[i] = f1(P.v[i] - S.v[j]); }
      }
    }
    P.kdj = prepareKdj(P, d);
    return P;
  }




  var PCT_BASES = { s13: { word: 'since 2013', short: '2013+' }, s21: { word: 'since 2021', short: '2021+' } };
  var PCT_LEVELS = [90, 95, 99];
  var PEAK_TIP = 'Recent peak = the highest reading of the last few weeks (or candles), the latest one included.';
  function ordinal(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }

  function rankWords(r, open) {
    if (r == null) return null;
    var rec = r === 100;
    return { r: r, record: rec, open: !!open, ord: ordinal(r), top: rec ? 0 : Math.max(1, 100 - r) };
  }
  function isOpen(k, j) { return j === D.tf[k].v.length - 1 && !!doc.stats[k].open; }
  function candleVal(k, j) { return j === D.tf[k].v.length - 1 ? doc.stats[k].latest : D.tf[k].v[j]; }
  function pctCandle(k, j) {
    var T = D.tf[k], open = isOpen(k, j);
    return { k: k, j: j, x: candleVal(k, j), open: open, s13: rankWords(T.r13[j], open), s21: rankWords(T.r21[j], open) };
  }
  function recentPeak(k) { return pctCandle(k, D.tf[k].rp); }
  function pctWord(r) { return r ? r.ord : '–'; }
  function topWord(r, base) { return !r ? '' : r.record ? 'highest ' + PCT_BASES[base || 's13'].word : 'top ' + r.top + '%'; }
  function alarmMerged(k) { return D.tf[k].mg; }

  var PK_TXT = '#E8C547';
  function peakWords(k) {
    var Pk = recentPeak(k), T = D.tf[k];
    if (Pk.j === T.v.length - 1) return 'now = recent peak';
    var when = k === '1D' ? fmtDay(T.e[Pk.j], false) : k === '1M' ? fmtMonYear(T.s[Pk.j]).slice(0, 3) : 'to ' + fmtDay(T.e[Pk.j], false);
    return 'recent peak ' + pct1(Pk.x) + ' (' + when.replace(/ /g, ' ') + ') = ' + pctWord(Pk.s13);
  }
  function alarmWords(k, lead) { return (lead || 'alarm ') + Math.round(doc.stats[k].alarm) + '%' + (alarmMerged(k) ? ' ≈ 90th' : ''); }


  function status() {
    var t = now(), asof = Date.parse(doc.live.asof_utc), age = t - asof, live = doc.live;
    var sess = dayNum(live.session_date), s = { age: age, asof: asof };
    var calNote = sess >= dayNum(CAL_END) ? ' (The page calendar ends ' + CAL_END + '; extend it.)' : '';
    var refEt = live.refresh_et || '17:45';
    var refresh = live.refresh_utc ? Date.parse(live.refresh_utc) : etEpoch(sess, 17, 45);
    var closeAt = etEpoch(sess, closeHour(sess), 0);
    if (asof - t > 10 * 6e4) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = 'The data says it was built ' + ago(asof - t).replace(' ago', '') + ' in the future: your clock or the feed clock is off.';
      return s;
    }
    if (doc.state === 'LIVE' && !live.session_closed) {
      var due = asof + 15 * 6e4;
      if (t > closeAt + 45 * 6e4) {
        var st2 = etEpoch(nextSession(sess), 10, 15);
        s.chip = t < st2 ? 'LATE' : 'STALE'; s.cls = t < st2 ? 'late' : 'stale'; s.expected = closeAt + 30 * 6e4;
        s.line = 'These numbers are from before the close (prices ~' + hm(asof - 15 * 6e4) + ' ET); the closing update did not arrive.';
        return s;
      }
      if (age <= 25 * 6e4) {
        s.chip = 'LIVE'; s.cls = 'live';
        s.line = 'Updated ' + ago(age) + '. ' + (due > t ? 'Next update ~' + hm(due) + ' ET.' : 'Next update due any minute.');
      }
      else if (age <= 60 * 6e4) { s.chip = 'LATE'; s.cls = 'late'; s.line = 'Expected an update by ' + hm(asof + 25 * 6e4) + ' ET; the last one is ' + ago(age).replace(' ago', '') + ' old. Numbers below are from then.'; }
      else { s.chip = 'STALE'; s.cls = 'stale'; s.line = 'No update for ' + ago(age).replace(' ago', '') + ' during what should be a live session.'; s.expected = asof + 25 * 6e4; }
      return s;
    }
    if (doc.state === 'LIVE' && live.session_closed) {
      var lateAt = refresh + 105 * 6e4, staleAt = etEpoch(nextSession(sess), 10, 15);
      if (t < lateAt) {
        s.chip = 'AFTER CLOSE'; s.cls = 'after';
        s.line = 'Market closed ' + (live.close_et || '16:00') + ' ET. These are the delayed-feed closing numbers (preliminary); final numbers come with the evening refresh ~' + refEt + ' ET' + localTail(refresh, false) + '.';
      }
      else if (t < staleAt) { s.chip = 'LATE'; s.cls = 'late'; s.line = 'The evening close refresh (usually ~' + refEt + ' ET' + localTail(refresh, false) + ') has not arrived yet. These are the preliminary delayed-feed closing numbers.'; }
      else { s.chip = 'STALE'; s.cls = 'stale'; s.line = 'These are the closing numbers of ' + fmtDay(sess, true, true) + ', and newer data should exist by now.'; s.expected = staleAt; }
      return s;
    }

    var nxt = nextSession(sess), firstTick = etEpoch(nxt, 9, 45), late2 = etEpoch(nxt, 10, 15), stale2 = etEpoch(nxt, 11, 0);
    if (t < late2) {
      s.chip = 'CLOSED'; s.cls = 'closed';
      s.line = 'Final close of ' + fmtDay(sess, true, true) + '. Next update after the open: ' + etAndLocal(firstTick) + '.' + calNote;
    } else if (t < stale2) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = 'The market has opened (' + fmtDay(nxt, false, true) + ') but the first live update has not arrived. Numbers below are the close of ' + fmtDay(sess, false, true) + '.' + calNote;
    } else {
      s.chip = 'STALE'; s.cls = 'stale'; s.expected = late2;
      s.line = 'These are the closing numbers of ' + fmtDay(sess, true, true) + ', and newer data should exist by now.' + calNote;
    }
    return s;
  }
  function chipEl(s) { return span('chip chip-' + s.cls, s.chip); }

  function renderStatus() {
    if (!doc) return;
    var s = status();
    var chip = $('chip'); chip.className = 'chip chip-' + s.cls; chip.textContent = s.chip;
    var sessDn = dayNum(doc.live.session_date), L0 = doc.live, head;
    if (doc.state === 'LIVE' && !L0.session_closed) {
      var pr = L0.prices_asof_utc ? Date.parse(L0.prices_asof_utc) : s.asof - 15 * 6e4;
      head = 'Today so far · prices ~' + hm(pr) + ' ET (15-min delayed) · built ' + hm(s.asof) + ' ET' + localTail(s.asof, false);
    } else if (doc.state === 'LIVE') {
      head = 'Close of ' + fmtDay(sessDn, false, true) + ' (preliminary) · built ' + etAndLocal(s.asof);
    } else {
      head = 'Close of ' + fmtDay(sessDn, false, true) + ' · built ' + etAndLocal(s.asof);
    }
    $('asof').textContent = head;
    $('statusLine').textContent = s.line;
    var L = doc.live, ml = (L.members_counted != null ? L.members_counted : '?') + ' of ' + (L.members_listed || '?') + ' counted on the latest day';
    var extra = [];
    if (L.short_history) extra.push(L.short_history + ' too young for the daily meter');
    if (L.stale_cache) extra.push(L.stale_cache + ' with stale data');
    if (L.no_bar_today) extra.push(L.no_bar_today + ' without a bar today');
    var gw = GW.short + ' ' + GW.listed;
    $('membersLine').textContent = (full.meta.members_line ? full.meta.members_line + '. ' : '') + 'This view: ' + gw + ' · ' + ml +
      (extra.length ? ' (' + extra.join(', ') + ')' : '') + '.';

    ['asof1', 'asofV', 'asofB', 'asof2', 'asof3'].forEach(function (id) {
      var p = $(id); clear(p);
      var flagged = s.cls === 'late' || s.cls === 'stale';
      p.hidden = id === 'asof1' && !flagged;
      if (s.cls === 'late' || s.cls === 'stale') p.appendChild(chipEl(s));
      p.appendChild(span('', doc.state === 'LIVE' && !doc.live.session_closed ? 'as of ' + hm(s.asof) + ' ET' :
        'close of ' + fmtDay(sessDn, false, true) + (doc.state === 'LIVE' ? ' (preliminary)' : '')));
    });

    var fst = $('fsStatus'); clear(fst);
    fst.appendChild(chipEl(s));
    fst.appendChild(span('', doc.state === 'LIVE' && !doc.live.session_closed ? 'as of ' + hm(s.asof) + ' ET' :
      'close of ' + fmtDay(sessDn, false, true) + (doc.state === 'LIVE' ? ' (preliminary)' : '')));

    var b = $('banners'); clear(b);
    if (preview) b.appendChild(banner('info', 'Preview data', 'Numbers below come from ' + preview + ', not the live feed.'));
    if (nowOverride) b.appendChild(banner('info', 'Clock override', 'The page is pretending it is ' + etAndLocal(now()) + '.'));
    var calLeft = dayNum(CAL_END) - etDayNum(now());
    if (calLeft < 60) b.appendChild(banner('warn', 'Market calendar ends ' + CAL_END, 'After that the page assumes every weekday is a trading day, so the CLOSED / LATE labels can be wrong on holidays until the calendar is extended.'));
    if (s.cls === 'stale') {
      b.appendChild(banner('bad', 'These numbers are old', 'Last update ' + etAndLocal(s.asof) + ' (' + ago(s.age) + '). ' + s.line +
        ' Do not read them as current.'));
    }
    if (lastErr) b.appendChild(banner('warn', 'Refresh failed', 'Tried at ' + hm(lastErr.at) + ' ET' + localTail(lastErr.at, false) + ' (' + lastErr.msg +
      '). The numbers below are still the ones from ' + etAndLocal(s.asof) + '.'));
  }
  function banner(kind, title, text, btn) {
    var d = document.createElement('div'); d.className = 'banner banner-' + kind;
    if (kind === 'bad') d.setAttribute('role', 'alert');
    var bt = document.createElement('b'); bt.textContent = title; d.appendChild(bt);
    d.appendChild(span('', text));
    if (btn) { var x = document.createElement('button'); x.type = 'button'; x.textContent = btn.label; x.addEventListener('click', btn.fn); d.appendChild(document.createElement('br')); d.appendChild(x); }
    return d;
  }


  function renderText() {
    var st = doc.stats, live = doc.state === 'LIVE', latest = st['1D'].latest, sessDn = dayNum(doc.live.session_date);
    var cn = closedNow();
    $('heroK').textContent = cn ? 'today’s close (prelim.)' : live ? 'today so far' : 'last close';
    $('heroV').textContent = lat0(st['1D']);
    $('heroDate').textContent = fmtDay(sessDn, true, true) + (live ? ' · as of ' + fmtTz(Date.parse(doc.live.asof_utc), 'America/New_York', 'ET', false) : '');
    renderHeroPct();
    var zl = $('zoneLine'); clear(zl);
    var word = (doc.zone && doc.zone.word) || '';
    zl.appendChild(span('zw', word.charAt(0).toUpperCase() + word.slice(1)));
    zl.appendChild(span('', ' — ' + lat0(st['1D']) + ' of ' + GW.who + ' are scared' +
      (cn ? ' at today’s close (preliminary).' : live ? ' (today so far).' : ' at the close.')));
    $('zoneKey').textContent = 'From fewest to most stocks scared: calm · normal · worried · fear · panic. Alarm line ' +
      Math.round(st['1D'].alarm) + '% = a high reading by the meter’s own history.';
    $('howTo').textContent = doc.text.how_to_read;
    $('rightNow').textContent = rightNowText(st, cn, live);
    $('whatChanges').textContent = doc.text.what_changes;

    $('tfClaim').textContent = 'Against its own history ' + GW.a + ': ' + TFS.map(function (k) {
      var R = pctCandle(k, D.tf[k].v.length - 1);
      return { '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' }[k] + ' ' + pctWord(R.s13) + soFar(k, R) + ' (' + topWord(R.s13) + ')';
    }).join(', ') + '. Unfinished candles are ranked “so far”.';
    $('tfCount').textContent = countedWords();
    $('tfSub').textContent = 'Same rule — % of ' + GW.who + ' scared — on daily, weekly, 2-week and monthly candles' + (RF ? ', with the S&P 500 fear meter dashed. ' : '. ') +
      (cn ? 'Today’s closing candle counted (preliminary).' : live ? 'Today’s candle counted as if it closed now.' : 'Last candle counted as of the close of ' + fmtDay(sessDn, false, false) + '.');
    $('t1name').textContent = GW.title;
    $('t2name').textContent = GW.title + ' on 4 candle sizes';
    $('t1sub').textContent = 'How many of the ' + GW.listed + ' ' + GW.who + ' are scared, every day' + (RF ? ' · dashed white = the S&P 500 fear meter' : '');
    $('footRule').textContent = 'Scared = a stock whose TET mood reading sits in its washed-out zone. Today’s members (' + listsWord() +
      '), back in time; a young stock joins once it has enough trading history, and a bigger candle once it has enough candles of that size.';
    $('footPct').textContent = 'Percentile = how a reading ranks against finished candles of the same size ' + GW.a + (GW.one ? '' : ' (or ' + GW.b + ')') +
      '; an unfinished candle is ranked “so far”. Dashed purple lines = the 90th, 95th and 99th percentile levels ' + GW.a +
      '. Recent peak = the highest reading of the last few weeks (or candles), the latest one included.';
    $('footSp').hidden = !RF;
    if (RF) $('footSp').textContent = 'S&P 500 line = the live S&P 500 fear meter (the Fear meter tab): the same TET mood rule over the S&P 500 stocks' +
      (RF.session ? ', ' + (RF.live ? 'as of ' : 'close of ') + fmtDay(dayNum(RF.session), true) : '') + '. Gap = this group’s reading minus the S&P 500’s, in points.';
    $('footData').textContent = 'Prices: daily closing bars; during the session the open candle comes from a ~15-min delayed quote. Basket = equal-weight index of the counted members, rebalanced daily, 100 at the series start. Built ' +
      etAndLocal(doc.generated_epoch * 1000) + '. No cookies, no tracking.';
    renderHeroSp();
    renderLegends();
    renderTables();
  }

  function listsWord() {
    var s = full.meta.lists_asof;
    return 'the AI basket, semis and high-beta (2-year beta of 1.3 or more) lists' + (s && /^\d{4}-\d\d-\d\d$/.test(s) ? ' as of ' + fmtDay(dayNum(s), true) : '');
  }

  var GAP_GOLD = 10, GAP_LINE = 15;


  function spTable() { return full.compare && full.compare.now_table ? full.compare.now_table.sp || null : null; }
  function spLatest(k) {
    var t = spTable(), x = t ? tableVal(t[k]) : null;
    if (x != null) return x;


    var m = full.compare && full.compare.now_meta;
    if (k !== '1D' && m && m.sp_aligned === false) return null;
    return RF ? RF.latest[k] : null;
  }
  function spNow() { return spLatest('1D'); }
  function gapNow() {
    var c = full.compare && full.compare[grp];
    if (c && 'gap_now' in c) return typeof c.gap_now === 'number' ? c.gap_now : null;
    var sp = spNow(); return sp == null ? null : f1(doc.stats['1D'].latest - sp);
  }
  function gapWord(x) { var r = Math.round(x); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + ' pts'; }
  function gapWord1(x) { var t = Math.abs(x).toFixed(1); return (+t === 0 ? '' : x > 0 ? '+' : '−') + t + ' pts'; }
  function spBehind() {
    var m = full.compare && full.compare.now_meta;
    if (m && typeof m.sp_aligned === 'boolean') return !m.sp_aligned && tableVal((spTable() || {})['1D']) == null;
    return !!(RF && RF.session && RF.session !== doc.live.session_date);
  }
  function spAsOf() { return ' (' + (RF.live ? 'as of ' : 'close of ') + fmtDay(dayNum(RF.session), false) + ')'; }
  function renderHeroSp() {
    var p = $('heroSp'); clear(p);
    var sp = spNow(), gap = gapNow();
    p.hidden = sp == null;
    if (p.hidden) return;
    p.classList.toggle('gold', gap != null && gap >= GAP_GOLD);
    if (gap == null) {
      p.appendChild(document.createTextNode('S&P 500 fear meter ' + pct1(sp)));
      p.appendChild(span('muted', spAsOf()));
      return;
    }
    p.appendChild(document.createTextNode('S&P 500 fear meter ' + pct1(sp) + ' → this group is '));
    p.appendChild(span('hs-gap', Math.round(gap) === 0 ? 'level with the market' : gapWord(gap) + ' vs the market'));
  }

  function halfUp(x) { return Math.floor(x + 0.5); }
  function rightNowText(st, cn, live) {
    var v = lat0(st['1D']), info = PX.info || {}, below = typeof info.pct_below_record === 'number' ? info.pct_below_record : null, refTxt;
    var when = cn ? 'At today’s close (preliminary)' : live ? 'So far today' : 'At the close';
    var nm = pp === 'BASKET' ? 'the basket' : PX.name;
    if (below == null) refTxt = nm + ' has no price yet';
    else if (below < 0.15) refTxt = nm + ' is at its record';
    else if (below < 3) refTxt = below >= 1 ? nm + ' sits only ' + halfUp(below) + '% below its record' : nm + ' sits ' + below.toFixed(1) + '% below its record';
    else refTxt = nm + ' is ' + halfUp(below) + '% below its record';
    var alarm = st['1D'].alarm, lat = st['1D'].latest, right;
    var looksFine = nm + ' looks fine';
    if (lat >= alarm && below != null && below < 3) right = v + ' of ' + GW.who + ' are scared while ' + refTxt + ' — ' + (lat >= 50 ? 'most' : 'many') + ' of them are hurting while ' + looksFine + '.';
    else if (lat >= alarm) right = v + ' of ' + GW.who + ' are scared and ' + refTxt + ' — the selling is broad.';
    else if (lat >= 10) right = v + ' of ' + GW.who + ' are scared — a normal amount; ' + refTxt + '.';
    else right = 'Only ' + v + ' of ' + GW.who + ' are scared — calm; ' + refTxt + '.';
    return when + ': ' + right;
  }

  var TF_WORD = { '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' };
  function countedWords() {
    var all = [], part = [];
    TFS.forEach(function (k) { var n = doc.stats[k].n; (n >= GW.listed ? all : part).push(k); });
    function list(ks) { var w = ks.map(function (k) { return TF_WORD[k]; }); return w.length < 2 ? w.join('') : w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1]; }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    var out = all.length ? cap(list(all)) + (all.length === 1 ? ' counts' : ' count') + ' all ' + GW.listed + '. ' : '';
    if (part.length) {
      var p = part.map(function (k, i) { return (i ? TF_WORD[k] : cap(TF_WORD[k])) + ' counts ' + doc.stats[k].n + ' of ' + GW.listed; });
      out += (p.length < 2 ? p[0] : p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1]) + ': the rest are too young for ' +
        (part.length === 1 ? TF_WORD[part[0]] + ' candles' : 'those candle sizes') + '.';
    }
    return out.trim();
  }


  var GAUGE_BANDS = [[0, 50, '#262B3D'], [50, 80, '#30335A'], [80, 90, '#41346E'], [90, 95, '#57408F'], [95, 99, '#7552BC'], [99, 100, '#A070F0']];
  var GAUGE_TICKS = [0, 50, 80, 90, 95, 99], GAUGE_TICK_PRIO = [0, 50, 90, 99, 80, 95];
  var heroPk = null, heroNow = null, gaugeKey = '';
  function bandsInto(bar) {
    GAUGE_BANDS.forEach(function (b) {
      var s = document.createElement('span'); s.className = 'g-band';
      s.style.left = b[0] + '%'; s.style.width = (b[1] - b[0]) + '%'; s.style.background = b[2];
      bar.appendChild(s);
    });
  }
  function renderHeroPct() {
    var k = '1D', last = D.tf[k].v.length - 1, R = pctCandle(k, last), Pk = recentPeak(k);

    var pNow = R.s13 ? D.hp[0] : null, pPk = Pk.s13 ? D.hp[1] : null;
    heroNow = { p: pNow }; heroPk = { p: pPk };
    var hp = $('heroPct'); clear(hp);
    hp.appendChild(span('hp-b', pctWord(R.s13) + ' percentile')); hp.appendChild(document.createTextNode(' ' + GW.a));
    if (!GW.one) { hp.appendChild(span('hp-sep', ' · ')); hp.appendChild(span('hp-2', pctWord(R.s21) + ' ' + GW.b)); }
    var pk = $('heroPeak'); clear(pk);
    var same = Pk.j === last, pdn = D.tf[k].e[Pk.j];
    var pkt = span('hp-rule', same ? 'today is the recent peak' : 'recent peak ' + pct1(Pk.x) + ' (' + fmtDay(pdn, false) + ') = ' + pctWord(Pk.s13) + (Pk.open ? ' so far' : ''));
    pkt.title = PEAK_TIP; pk.appendChild(pkt);
    pk.title = PEAK_TIP;

    var g = $('gauge1'); clear(g);
    g.setAttribute('aria-label', 'Percentile gauge ' + GW.a + ': now ' + pctWord(R.s13) + (same ? '' : ', recent peak ' + pctWord(Pk.s13)));
    var labs = document.createElement('div'); labs.className = 'g-labs'; g.appendChild(labs);
    var bar = document.createElement('div'); bar.className = 'g-bar'; bandsInto(bar); g.appendChild(bar);
    var mk = function (cls, p) { var m = document.createElement('i'); m.className = 'g-m ' + cls; m.style.left = Math.max(0, Math.min(100, p)).toFixed(2) + '%'; bar.appendChild(m); return m; };
    if (!same && pPk != null) mk('g-m-pk' + (pNow != null && Math.abs(pPk - pNow) < 1.5 ? ' g-m-near' : ''), pPk);
    if (pNow != null) mk('g-m-now', pNow);
    if (!same && Pk.s13) labs.appendChild(span('g-lab g-lab-pk', fmtDay(pdn, false) + ' peak ' + pctWord(Pk.s13)));
    labs.appendChild(span('g-lab g-lab-now', same ? 'now = recent peak · ' + pctWord(R.s13) : 'now ' + pctWord(R.s13)));
    var tk = document.createElement('div'); tk.className = 'g-ticks'; g.appendChild(tk);
    GAUGE_TICKS.forEach(function (t) { var s = span('g-t', String(t)); s.setAttribute('data-t', t); tk.appendChild(s); });
    g.appendChild(span('g-cap', 'percentile ' + GW.a + ' · deeper purple = rarer'));
    gaugeKey = ''; layoutGauge();
  }


  function layoutGauge() {
    var g = $('gauge1'); if (!g || !heroNow || !g.firstChild) return;
    var W = g.clientWidth, key = W + '|' + (doc && doc.generated_epoch); if (!W || key === gaugeKey) return;
    gaugeKey = key;
    var labs = g.querySelector('.g-labs'), L = [];
    Array.prototype.forEach.call(labs.children, function (s) {
      var p = s.classList.contains('g-lab-pk') ? heroPk.p : heroNow.p;
      L.push({ s: s, w: s.offsetWidth, c: (p != null ? p : 0) / 100 * W, row: 0 });
    });
    L.forEach(function (o) { o.x = Math.max(0, Math.min(W - o.w, o.c - o.w / 2)); });
    if (L.length === 2) {
      var a = L[0].c <= L[1].c ? L[0] : L[1], b = a === L[0] ? L[1] : L[0], need = a.w + b.w + 8;
      if (a.x + a.w + 8 > b.x) {
        var mid = (a.c + b.c) / 2, ax = mid - 4 - a.w, bx = mid + 4;
        if (ax < 0) { bx += -ax; ax = 0; }
        if (bx + b.w > W) { ax -= bx + b.w - W; bx = W - b.w; }
        if (ax >= 0 && need <= W) { a.x = ax; b.x = bx; } else { b.row = 1; }
      }
    }
    var rows = 1;
    L.forEach(function (o) { o.s.style.left = o.x.toFixed(1) + 'px'; o.s.style.top = (o.row * 15) + 'px'; rows = Math.max(rows, o.row + 1); });
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

  function miniBar(p) {
    var b = document.createElement('span'); b.className = 'mb'; b.setAttribute('aria-hidden', 'true'); bandsInto(b);
    if (p != null) { var m = document.createElement('i'); m.className = 'mb-m'; m.style.left = Math.max(0, Math.min(100, p)).toFixed(2) + '%'; b.appendChild(m); }
    return b;
  }

  function renderLegends() {
    function item(cls, text) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(text)); return s; }
    var l1 = $('lg1'); clear(l1);
    l1.appendChild(item('lg-pk', 'fear peak (a big daily spike, same day on ' + PX.name + ')'));
    l1.appendChild(item('lg-now', 'now'));
    l1.appendChild(item('lg-pl', '90th · 95th · 99th percentile of daily candles ' + GW.a));
    if (RF) l1.appendChild(item('lg-sp', 'S&P 500 fear meter'));
    var l2 = $('lg2'); clear(l2);
    l2.appendChild(item('lg-pk', 'fear peak (the biggest spikes of each candle size)'));
    l2.appendChild(item('lg-now', 'now'));
    l2.appendChild(item('lg-pl', '90th · 95th · 99th percentile of each candle size ' + GW.a));
    if (RF) l2.appendChild(item('lg-sp', 'S&P 500 fear meter, same candle'));
  }
  function renderTables() {
    var t = $('tfTable'); clear(t);
    var cap = document.createElement('caption'); cap.textContent = 'Latest candle on each size'; t.appendChild(cap);


    var cols = [['Candle', ''], ['Scared', ''], ['Counted', 'w'], ['Stocks', 'w'], ['Alarm', ''], [(GW.aS.length > 6 ? 'Pctl ' : 'Percentile ') + GW.aS, ''], [GW.bS, 'w'],
      ['Peak ' + GW.a, 'w'], ['Candle dates', 'w'], ['Note', 'w'], ['S&P 500', 'w']];
    if (GW.one) cols[6] = null;
    if (!RF) cols[10] = null;
    var hr = t.insertRow();
    cols.forEach(function (c) { if (!c) return; var th = document.createElement('th'); th.textContent = c[0]; if (c[1]) th.className = 'wide-only'; hr.appendChild(th); });
    TFS.forEach(function (k) {
      var s = doc.stats[k], r = t.insertRow(), R = pctCandle(k, D.tf[k].v.length - 1);
      [k + (s.open ? (k === '1D' && closedNow() ? ' · prelim.' : ' · so far') : ''), pct1(s.latest), s.n + ' of ' + GW.listed, s.below + ' of ' + s.n,
        pct1(s.alarm), pctWord(R.s13) + ' · ' + (R.s13 && R.s13.record ? 'highest' : topWord(R.s13)), pctWord(R.s21), pct1(s.peak_since_2013),
        s.start === s.end ? s.start : s.start + ' → ' + s.end, s.note, RF && spLatest(k) != null ? pct1(spLatest(k)) : '–'].forEach(function (v, i) {
        if (!cols[i]) return;
        var c = r.insertCell(); c.textContent = v; if (cols[i][1]) c.className = 'wide-only'; });
    });
    var dtb = $('dayTable'); clear(dtb);
    cap = document.createElement('caption'); cap.textContent = 'Last 15 days, daily candles · percentile ' + GW.a; dtb.appendChild(cap);
    var dcols = [['Day', ''], ['Scared', ''], ['Pctl', ''], ['Counted', 'w'], ['S&P 500', ''], ['Gap', ''], [PX.name, 'w']];
    if (!RF) { dcols[4] = null; dcols[5] = null; }
    hr = dtb.insertRow(); dcols.forEach(function (c) { if (!c) return; var th = document.createElement('th'); th.textContent = c[0]; if (c[1]) th.className = 'wide-only'; hr.appendChild(th); });
    for (var i = D.d.length - 1; i >= Math.max(0, D.d.length - 15); i--) {
      var r = dtb.insertRow(), tag = (i === D.d.length - 1 && doc.state === 'LIVE') ? (closedNow() ? ' (prelim.)' : ' (so far)') : '';
      [fmtDay(D.d[i], false, true) + tag, pct1(D.v[i]), pctWord(pctCandle('1D', i).s13), String(D.n[i]), D.spv[i] == null ? '–' : pct1(D.spv[i]),
        D.gap[i] == null ? '–' : gapWord1(D.gap[i]), D.spy[i] == null ? '–' : D.spy[i].toFixed(2)].forEach(function (v, ci) {
        if (!dcols[ci]) return;
        var c = r.insertCell(); c.textContent = v; if (dcols[ci][1]) c.className = 'wide-only'; });
    }
  }




  var RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, 'All': 0 };
  var RANGE_WORDS = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year',
    '2Y': 'last 2 years', '5Y': 'last 5 years' };
  var MIN_SPAN = 14;
  var ZOOM_STEP = 1.6;
  var view = { chip: '2Y', x0: 0, x1: 0, custom: false };

  function normRange(s) {
    if (!s) return null;
    var u = String(s).trim().toUpperCase();
    if (u === 'ALL') return 'All';
    return RANGE_MONTHS.hasOwnProperty(u) ? u : null;
  }
  function padFor(span) { return Math.max(1, span * 0.02); }
  function hiEdge(span) { return D.last + padFor(span); }
  function latestSpan(x0) {
    var b = D.last - x0;
    return b * 0.02 / 0.98 >= 1 ? b / 0.98 : b + 1;
  }
  function spanLimits() { return { min: MIN_SPAN, max: latestSpan(D.d[0]) }; }
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
    if (x0 < D.d[0]) { x1 += D.d[0] - x0; x0 = D.d[0]; }
    return { chip: v.chip, custom: v.custom, x0: x0, x1: x1 };
  }
  function toLatest(v, x0) { return clampView({ chip: v.chip, custom: v.custom, x0: x0, x1: x0 + latestSpan(x0) }); }
  function rangeView(chip) {
    var x0 = chip === 'All' ? D.d[0] : Math.max(D.d[0], monthsBack(D.last, RANGE_MONTHS[chip]));
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
    if (!view.custom) {
      var since = 'all data since ' + (dnDate(D.d[0]).getUTCMonth() === 0 ? dnDate(D.d[0]).getUTCFullYear() : fmtMonYear(D.d[0]));
      return view.chip === 'All' || monthsBack(D.last, RANGE_MONTHS[view.chip]) <= D.d[0] ? since : RANGE_WORDS[view.chip];
    }
    var a = D.d[Math.min(D.d.length - 1, lowerBound(D.d, view.x0))], b = D.d[Math.max(0, bsearchLE(D.d, view.x1))];
    var nb = function (str) { return str.replace(/ /g, '\u00a0'); };
    if (b - a > 150) return fmtMonYear(a) === fmtMonYear(b) ? nb(fmtMonYear(a)) : nb(fmtMonYear(a)) + ' – ' + nb(fmtMonYear(b));
    return dnDate(a).getUTCFullYear() === dnDate(b).getUTCFullYear() ? nb(fmtDay(a, false)) + ' – ' + nb(fmtDay(b, true)) : nb(fmtDay(a, true)) + ' – ' + nb(fmtDay(b, true));
  }


  function lowerBound(arr, x) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; } return lo; }
  function visIdx(arr, x0, x1) { return { i0: lowerBound(arr, x0), i1: bsearchLE(arr, x1) }; }

  function niceAxis(target, px, minPx) {
    var t = Math.max(target, 1), step, top;
    if (t > 100) { step = tickStep(100, px * 100 / t, minPx); top = t; }
    else {
      step = tickStep(t, px, minPx); top = Math.ceil(t / step - 1e-9) * step;
      if (step / top * px < minPx) { step = tickStep(top, px, minPx); top = Math.ceil(t / step - 1e-9) * step; }
    }
    var ticks = [];
    for (var v = 0; v <= Math.min(top, 100) + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { top: top, ticks: ticks };
  }


  var TICK_UNITS = [['d', 1], ['d', 2], ['w', 1], ['w', 2], ['m', 1], ['m', 2], ['m', 3], ['m', 6], ['y', 1], ['y', 2], ['y', 5], ['y', 10]];
  function genTicks(k, n, x0, x1) {
    var out = [], dn, i;
    if (k === 'd' && n === 1) {
      var vi = visIdx(D.d, x0, x1);
      for (i = vi.i0; i <= vi.i1; i++) if (D.d[i] > x0) out.push({ dn: D.d[i], label: fmtDay(D.d[i], false) });
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

  function timeTicks(x0, x1, X, fs, u0) {
    var ppd = (X(x1) - X(x0)) / (x1 - x0);
    for (var u = u0 || 0; u < TICK_UNITS.length; u++) {
      var k = TICK_UNITS[u][0], n = TICK_UNITS[u][1];
      var approx = k === 'd' ? (n === 1 ? 1.45 : 2.33) : k === 'w' ? 7 * n : k === 'm' ? 30.4 * n : 365.25 * n;
      if (approx * ppd < 24) continue;
      var t = genTicks(k, n, x0, Math.min(x1, D.last + 0.5)), need = 0, gap = Infinity;
      t.forEach(function (o) { o.w = textW(o.label, fs); need = Math.max(need, o.w); });
      for (var i = 1; i < t.length; i++) gap = Math.min(gap, X(t[i].dn) - X(t[i - 1].dn));
      if (gap >= need + 12) { t.unit = u; return t; }
    }
    var none = []; none.unit = TICK_UNITS.length; return none;
  }
  function tickUnit(pw) { return timeTicks(view.x0, view.x1, lin(view.x0, view.x1, 0, pw), 11).unit; }


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



  function findPeaks(d, v, x0, x1) {
    var vi = visIdx(d, x0, x1), n = vi.i1 - vi.i0 + 1, out = [], i, j;
    if (n < 5) return [];
    var N = Math.max(2, Math.min(10, Math.round(n / 60))), gap = Math.max(3, (x1 - x0) * 0.055), lo = Infinity, hi = -Infinity;
    for (i = vi.i0; i <= vi.i1; i++) { lo = Math.min(lo, v[i]); hi = Math.max(hi, v[i]); }
    var floor = lo + 0.35 * (hi - lo), cand = [], last = v.length - 1;
    for (i = vi.i0; i <= vi.i1; i++) {
      if (v[i] < floor || i >= last) continue;
      var ok = true;
      for (j = Math.max(0, i - N); j <= Math.min(last, i + N) && ok; j++) if (j !== i && (j < i ? v[j] >= v[i] : v[j] > v[i])) ok = false;
      if (ok) cand.push(i);
    }
    cand.sort(function (a, b) { return v[b] - v[a]; });
    cand.forEach(function (c) { if (out.every(function (o) { return Math.abs(d[o] - d[c]) >= gap; })) out.push(c); });
    return out.map(function (k) { return { dn: d[k], v: v[k], i: k }; });
  }


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
  function spyPanel(svg, X, x0, x1, left, top, w, h, labelSize, ticks, keep) {
    var g = el('g', {}, svg);
    panelRect(g, left, top, w, h);
    var vi = visIdx(D.d, x0, x1), lo = Infinity, hi = -Infinity, i;
    for (i = vi.i0; i <= vi.i1; i++) if (D.spy[i] != null) { lo = Math.min(lo, D.spy[i]); hi = Math.max(hi, D.spy[i]); }
    if (!(hi >= lo)) { lo = 0; hi = 1; }
    if (hi - lo < hi * 0.004) { var mid = (hi + lo) / 2; lo = mid * 0.998; hi = mid * 1.002; }
    var pad = (hi - lo) * 0.08, Y = lin(lo - pad, hi + pad, top + h - 4, top + 22);
    var step = niceStep(hi - lo, 3), yt = [];
    while (Math.abs(Y(0) - Y(step)) < 15 && step < hi) step *= 2;
    var c100 = Math.round(step * 100), dec = c100 % 100 === 0 ? 0 : c100 % 10 === 0 ? 1 : 2;
    for (var v = Math.ceil((lo - pad) / step) * step; v <= hi + pad; v += step) yt.push(v);
    yTicks(g, Y, yt, left + w, left, function (v) { return v.toFixed(dec); }, 'right');
    timeGrid(g, X, ticks, top, top + h);
    var P = decimate(D.d, D.spy, Math.max(0, bsearchLE(D.d, x0)), Math.min(D.d.length - 1, lowerBound(D.d, x1)), X, keep);
    el('path', { d: pathOf(P, Y), fill: 'none', stroke: C.text, 'stroke-width': 1.1, 'stroke-linejoin': 'round', 'clip-path': clipFor(svg, left, top, w, h) }, g);
    Y.dots = el('g', {}, g);
    var ts = labelSize || 12.5;
    tx(g, left + 8, top + 16, PX.title, withHalo({ fill: C.text, 'font-size': ts }));
    Y.titleBox = { x: left + 6, y: top + 16 - ts - 1, w: textW(PX.title, ts) + 4, h: ts + 5 };

    if (PX.first != null && PX.first > x0) priceGapNote(g, left, Math.min(left + w, X(PX.first)), top + 22, top + h - 4, Y.titleBox);
    return Y;
  }

  function priceGapNote(g, xa, xb, yTop, yBot, avoid) {
    var str = PX.name + ' trades from ' + fmtDay(PX.first, true), fs = 11.5, w = textW(str, fs);
    if (xb - xa < 24) return;
    if (xb - xa < w + 16) { str = 'from ' + fmtDay(PX.first, true); w = textW(str, fs); if (xb - xa < w + 16) return; }
    var cx = (xa + xb) / 2, cy = (yTop + yBot) / 2 + 4, b = { x: cx - w / 2 - 2, y: cy - fs, w: w + 4, h: fs + 5 };
    if (avoid && overlaps(avoid, b)) { cy = Math.min(yBot - 4, avoid.y + avoid.h + fs + 8); }
    el('line', { x1: xb.toFixed(1), x2: xb.toFixed(1), y1: yTop - 4, y2: yBot, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.8 }, g);
    tx(g, cx, cy, str, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
  }

  function spyR(W) { return W < 640 ? 2.4 : 3; }


  function spyDots(Y, X, days, r, rNow, todayIn, left, w) {
    var out = [], li = D.d.length - 1, now = todayIn && D.spy[li] != null ? { x: X(D.last), y: Y(D.spy[li]) } : null;
    out.under = [];
    days.forEach(function (dn) {
      var i = bsearchLE(D.d, dn); if (i < 0 || D.d[i] !== dn || D.spy[i] == null) return;
      var x = X(dn), y = Y(D.spy[i]);
      if (x < Math.max(left, r + 0.5) || x > left + w || overlaps(Y.titleBox, dotBox(x, y, r))) return;
      if (now && Math.hypot(x - now.x, y - now.y) < rNow + 5 + r) { out.under.push(dn); return; }
      peakDot(Y.dots, x, y, r); out.push(dn);
    });
    if (now) nowDot(Y.dots, now.x, now.y, rNow);
    return out;
  }

  function seriesPaths(g, X, Y, T, x0, x1, clip, lw, steps, plotW) {
    var n = T.v.length, line = '', firstX = null, lastX = null, base = Y(0).toFixed(1), dots = [], j;
    if (steps) {
      for (j = Math.max(0, bsearchLE(T.s, x0)); j <= bsearchLE(T.s, x1); j++) {
        var xs = X(T.s[j]), xe = j + 1 < n ? X(T.s[j + 1]) : Math.max(X(T.e[j]), xs + 2), y = Y(T.v[j]).toFixed(1);
        line += (line ? 'L' : 'M') + xs.toFixed(1) + ' ' + y + 'L' + xe.toFixed(1) + ' ' + y;
        if (firstX === null) firstX = xs.toFixed(1); lastX = xe.toFixed(1);
      }
    } else {
      var P = decimate(T.e, T.v, Math.max(0, bsearchLE(T.e, x0)), Math.min(n - 1, lowerBound(T.e, x1)), X);
      line = pathOf(P, Y);
      if (P.px.length) { firstX = P.px[0].toFixed(1); lastX = P.px[P.px.length - 1].toFixed(1); }
      var vi = visIdx(T.e, x0, x1), inView = vi.i1 - vi.i0 + 1;
      if (inView > 0 && plotW / inView >= 9) for (j = vi.i0; j <= vi.i1; j++) dots.push(j);
    }
    if (!line) return;
    el('path', { d: line + 'L' + lastX + ' ' + base + 'L' + firstX + ' ' + base + 'Z', fill: C.fear, 'fill-opacity': 0.35, stroke: 'none', 'clip-path': clip }, g);
    el('path', { d: line, fill: 'none', stroke: C.fear, 'stroke-width': lw, 'stroke-linejoin': 'round', 'clip-path': clip }, g);

    dots.forEach(function (k) { el('circle', { cx: X(T.e[k]).toFixed(1), cy: Y(T.v[k]).toFixed(1), r: 1.8, fill: C.light, 'fill-opacity': 0.55 }, g); });
  }

  function spLine(g, X, Y, T, x0, x1, clip, steps, narrow) {
    if (!T) return;
    var d = '', j;
    if (steps) {
      for (j = Math.max(0, bsearchLE(T.s, x0)); j <= bsearchLE(T.s, x1); j++) {
        if (T.v[j] == null) continue;
        var xs = X(T.s[j]), xe = j + 1 < T.s.length ? X(T.s[j + 1]) : Math.max(X(T.e[j]), xs + 2), y = Y(T.v[j]).toFixed(1);
        d += (d ? 'L' : 'M') + xs.toFixed(1) + ' ' + y + 'L' + xe.toFixed(1) + ' ' + y;
      }
    } else d = pathOf(decimate(T.e, T.v, Math.max(0, bsearchLE(T.e, x0)), Math.min(T.e.length - 1, lowerBound(T.e, x1)), X), Y);
    if (d) el('path', { d: d, fill: 'none', stroke: C.sp, 'stroke-width': narrow ? 1.1 : 1.25, 'stroke-opacity': 0.82, 'stroke-dasharray': '4 3',
      'stroke-linejoin': 'round', 'clip-path': clip, 'data-sp': '1' }, g);
  }

  function spMax(k, x0, x1) {
    var T = RF && RF.tf[k], m = 0; if (!T) return 0;
    for (var j = Math.max(0, lowerBound(T.e, x0) - (k === '1M' ? 1 : 0)); j < T.s.length && T.s[j] <= x1; j++) if (T.v[j] != null) m = Math.max(m, T.v[j]);
    return m;
  }
  function lineWidth(span, narrow) { return span > 2600 ? (narrow ? 0.7 : 0.9) : span > 420 ? (narrow ? 0.9 : 1.1) : span > 100 ? 1.3 : 1.6; }


  function alarmLine(g, Y, left, w, alarm, label, size, avoid, ys, top, bot) {
    var py = Y(alarm);
    el('line', { x1: left, x2: left + w, y1: py, y2: py, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '4 3' }, g);
    var lw = textW(label, size) + 6;
    function at(by) { var b = { x: left + 6, y: by, w: lw, h: size + 4 }; if (avoid && overlaps(avoid, b)) b.x = avoid.x + avoid.w + 8; return b; }
    function crossed(b) { return (ys || []).some(function (y) { return Math.abs(y - py) > 0.5 && y > b.y - 1.5 && y < b.y + b.h + 1.5; }); }
    var box = at(py - size - 6);
    if (crossed(box)) {
      var b2 = at(py + 1);
      if (!crossed(b2) && (bot == null || b2.y + size + 0.5 <= bot - 0.5) && (top == null || b2.y >= top + 1)) box = b2;
    }
    el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, fill: C.panel }, g);
    tx(g, box.x + 3, box.y + size + 0.5, label, { fill: C.text, 'font-size': size });
    return box;
  }


  var PL = { 90: { c: '#A99CC8', op: 0.7, w: 1 }, 95: { c: '#B98AF2', op: 0.85, w: 1.15 }, 99: { c: '#D17BFF', op: 1, w: 1.4 } };
  var PL_DASH = '6 4';




  function pctLines(g, k, Y, L, pw, top, bot, lineTop) {
    var lv = D.tf[k].lv, merged = alarmMerged(k), out = { k: k, g: g, L: L, pw: pw, lines: [], above: [], merged: merged, ys: [Y(doc.stats[k].alarm)] };
    PCT_LEVELS.forEach(function (q, qi) {
      var v = lv[qi]; if (v == null || (q === 90 && merged)) return;
      var y = Y(v), s = ordinal(q) + ' · ' + Math.round(v) + '%';
      if (y < (lineTop != null ? lineTop : top + 3)) { out.above.push({ q: q, v: v, s: s }); return; }
      if (y > bot - 1) return;
      out.lines.push({ q: q, v: v, y: y, s: s }); out.ys.push(y);
    });
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

  function seriesHit(T, X, Y, steps) {
    return function (bx) {
      var a = X.inv(bx.x - 2), b = X.inv(bx.x + bx.w + 2), xs = steps ? T.s : T.e;
      for (var j = Math.max(0, bsearchLE(xs, a)); j < xs.length && xs[j] <= b; j++) if (Y(T.v[j]) < bx.y + bx.h + 1) return true;
      return false;
    };
  }




  function pctLabels(g, P, L, pw, top, bot, obstacles, hit, tag) {
    var fs = 11, H = 14, placed = [];
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
    var res = P.lines.map(function (ln) { var b = find(ln.s, ln.y); if (b) placed.push(b); return { ln: ln, b: b, s: ln.s }; });




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
      var s2 = asc.map(function (r) { return ordinal(r.ln.q) + ' ' + Math.round(r.ln.v) + '%'; }).join(' · ');
      var b2 = find(s2, (gr[0].ln.y + gr[gr.length - 1].ln.y) / 2, false, gr.map(function (r) { return r.ln.y; }));
      if (b2) { placed.push(b2); asc.forEach(function (r) { r.b = b2; r.s = s2; r.qs = asc.map(function (o) { return o.ln.q; }).join(','); r.q = asc[asc.length - 1].ln.q; }); }
      else gr.forEach(function (r) { if (r.b) placed.push(r.b); });
    });
    placed = [];
    res.forEach(function (r) {
      var b = r.b, ln = r.ln;
      if (b && placed.indexOf(b) < 0) draw(b, r.s, r.q || ln.q, r.qs);
    });
    if (P.above.length) {
      var yE = top + 2 + H / 2, yE2 = yE + H + 1, yE3 = yE2 + H + 1, got = [];
      var edgeFind = function (s) { return find(s, yE, true) || find(s, yE2, true) || find(s, yE3, true); };
      P.above.forEach(function (ln) { var b = edgeFind('↑ ' + ln.s); if (b) { got.push({ b: b, ln: ln }); placed.push(b); } });
      if (got.length < P.above.length) {
        got.forEach(function (o) { placed.splice(placed.indexOf(o.b), 1); });
        var s2 = '↑ ' + P.above.map(function (ln) { return ln.s; }).join('  '), b2 = edgeFind(s2);
        got = b2 ? [{ b: b2, ln: P.above[P.above.length - 1], s: s2 }] : [];
      } else got.forEach(function (o) { placed.splice(placed.indexOf(o.b), 1); });
      got.forEach(function (o) {
        var s = o.s || '↑ ' + o.ln.s; draw(o.b, s, o.ln.q);
      });
    }
    return placed;
  }
  var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
  function withHalo(a) { for (var k in HALO) a[k] = HALO[k]; return a; }

  var DOT = { peak: '#FFD84D', edge: C.bg, nowCore: '#F3EEFF' };
  function peakDot(g, x, y, r) { el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: DOT.peak, stroke: DOT.edge, 'stroke-width': r > 3 ? 1.6 : 1.3 }, g); }
  function nowDot(g, x, y, r) {
    el('circle', { cx: x, cy: y, r: r + 5, fill: C.light, 'fill-opacity': 0.16, stroke: C.light, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
    el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: C.light, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
    el('circle', { cx: x, cy: y, r: r, fill: DOT.nowCore, stroke: '#fff', 'stroke-width': 1.4 }, g);
  }
  function nowBox(x, y, r) { return { x: x - r - 6, y: y - r - 6, w: 2 * r + 12, h: 2 * r + 12 }; }

  function pulseBox(x, y, r) { var R = (r + 2) * 2.1 + 1.5; return { x: x - R, y: y - R, w: 2 * R, h: 2 * R }; }
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
  var lastDaily = [];
  var dotDays = {};
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function crossLayer(svg) { return el('g', { 'pointer-events': 'none' }, svg); }
  var GEO = { c1: null, c2: null };


  function geo1(Wraw) { var W = Math.max(300, Math.round(Wraw)), narrow = W < 640, L = narrow ? 2 : 30; return { W: W, narrow: narrow, L: L, pw: W - L - (narrow ? 30 : 40) }; }
  function geoV(Wraw) { var W = Math.max(300, Math.round(Wraw)), narrow = W < 640, L = narrow ? 2 : 30; return { W: W, narrow: narrow, L: L, pw: W - L - (narrow ? 34 : 44) }; }
  function geo2(Wraw) { var W = Math.max(300, Math.round(Wraw)), wide = W >= (FS.key === 'c2' ? 600 : 700), RC = wide ? 164 : 0; return { W: W, wide: wide, L: 2, RA: 30, RC: RC, pw: W - 2 - 30 - RC }; }


  function drawChart1(Wraw, tu, pw2, hFs) {
    var gm = geo1(Wraw), holder = $('chart1'), W = gm.W, narrow = gm.narrow, phone = W < 480;
    var L = gm.L, pw = gm.pw;
    var spyH = narrow ? 112 : 210, gap = narrow ? 12 : 26, mH = narrow ? 270 : 380;
    if (hFs) {
      gap = hFs < 420 ? 10 : narrow ? 12 : 20;
      var av1 = hFs - 24 - gap;
      spyH = Math.round(av1 * 0.34); mH = av1 - spyH;
    }
    var mTop = spyH + gap, H = mTop + mH + 24;
    var x0 = view.x0, x1 = view.x1, span = x1 - x0, X = lin(x0, x1, L, L + pw);
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu);

    var T1 = D.tf['1D'], fpk = findPeaks(D.d, D.v, x0, x1), keep = {}, gapD = Math.max(3, span * 0.055);


    fpk = fpk.filter(function (p) {
      return !T1.peaks.some(function (i) { return D.d[i] >= x0 && D.d[i] <= x1 && D.v[i] > p.v && Math.abs(D.d[i] - p.dn) < gapD; });
    });
    T1.peaks.forEach(function (i) { keep[i] = 1; });
    fpk.forEach(function (p) { if (D.hot[p.i]) keep[p.i] = 1; });
    var spyY = spyPanel(svg, X, x0, x1, L, 0, pw, spyH, 12.5, ticks, keep);
    var g = el('g', {}, svg), st = doc.stats['1D'], todayIn = D.last >= x0 && D.last <= x1;
    panelRect(g, L, mTop, pw, mH);

    var vi = visIdx(D.d, x0, x1), vmax = 0;
    for (var i = vi.i0; i <= vi.i1; i++) vmax = Math.max(vmax, D.v[i]);
    if (todayIn) vmax = Math.max(vmax, st.latest);
    vmax = Math.max(vmax, spMax('1D', x0, x1));
    var ax = niceAxis(Math.max(vmax / (1 - (phone ? 40 : 28) / mH), st.alarm * 1.3), mH, narrow ? 30 : 36);
    var Y = lin(0, ax.top, mTop + mH, mTop);
    yTicks(g, Y, ax.ticks, L + pw, L, String, 'right', mTop);
    timeGrid(g, X, ticks, mTop, mTop + mH);
    if (!narrow) tx(g, 12, mTop + mH / 2, '% of stocks scared', { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mTop + mH / 2) + ')' });
    var clip = clipFor(svg, L, mTop, pw, mH);
    seriesPaths(g, X, Y, D.tf['1D'], x0, x1, clip, lineWidth(span, narrow), false, pw);
    if (RF) spLine(g, X, Y, RF.tf['1D'], x0, x1, clip, false, narrow);
    var obstacles = [];
    TXREC = [];
    var pl1 = pctLines(el('g', {}, g), '1D', Y, L, pw, mTop, mTop + mH);
    obstacles.push(alarmLine(g, Y, L, pw, st.alarm, alarmWords('1D', 'alarm line '), narrow ? 11 : 11.5, null, pl1.ys, mTop, mTop + mH));
    var tx0 = X(D.last), ty = Y(st.latest), live = doc.state === 'LIVE', rNow = narrow ? 5 : 6, rPk = narrow ? (span > 2600 ? 3 : 4) : 4.5;
    if (todayIn) obstacles.push(nowBox(tx0, ty, rNow));

    var cands = [];
    T1.peaks.forEach(function (i) {
      if (D.d[i] < x0 || D.d[i] > x1) return;
      var x = X(D.d[i]); if (x >= Math.max(L, rPk + 0.5) && x <= L + pw) cands.push({ dn: D.d[i], v: D.v[i], x: x, y: Y(D.v[i]) });
    });
    cands.sort(function (a, b) { return b.v - a.v; });

    var minDx = (2 * spyR(W) + 1.5) * Math.max(1, pw / (pw2 || pw));
    var dots = thinDots(cands, rPk, obstacles.slice(), minDx);
    if (todayIn) {
      var tl = (closedNow() ? 'close (prelim.) ' : live ? 'today so far ' : 'last close ') + lat0(st), ts = narrow ? 12 : 13, tw = textW(tl, ts, 700);
      var tlx = Math.max(L + 4 + tw, Math.min(tx0 - 8, L + pw - 4)), tly = Math.max(mTop + ts + 2, ty - 12);

      var tryY = [tly, Math.min(mTop + mH - 4, ty + ts + 10), tly - ts - 6, tly - 2 * (ts + 6)];
      for (var ti = 0; ti < tryY.length; ti++) {
        var tb = { x: tlx - tw - 2, y: tryY[ti] - ts, w: tw + 4, h: ts + 6 };
        if (tryY[ti] - ts < mTop + 2) continue;
        if (!dots.some(function (d) { return overlaps(tb, dotBox(d.x, d.y, rPk)); })) { tly = tryY[ti]; break; }
      }
      tx(g, tlx, tly, tl, withHalo({ fill: C.light, 'font-size': ts, 'font-weight': 700, 'text-anchor': 'end' }));
      obstacles.push({ x: tlx - tw - 2, y: tly - ts, w: tw + 4, h: ts + 6 });
    }
    dots.forEach(function (d) { var b = dotBox(d.x, d.y, rPk); b.dn = d.dn; obstacles.push(b); });
    var dotG = el('g', {}, svg), labelled = [];
    function hits(b, dn) { return obstacles.some(function (o) { return o.dn !== dn && overlaps(o, b); }); }
    var lab = el('g', {}, svg), placed = 0, topLimit = mTop + 4, long = span > 240;
    var maxLabels = phone ? 4 : narrow ? 5 : 9;
    fpk.forEach(function (p) {
      if (placed >= maxLabels) return;
      var dn = p.dn, px = X(dn), py = Y(p.v), dd = dnDate(dn);
      if (px < L || px > L + pw) return;
      var big = Math.round(p.v) + '%', dotted = !!D.hot[p.i], up = dotted ? rPk - 1.5 : 0, y0 = dotted ? rPk + 1 : 3;
      if (phone) {
        var small = long ? MON[dd.getUTCMonth()] + ' ’' + String(dd.getUTCFullYear()).slice(2) : fmtDay(dn, false);
        var s1 = 12.5, s2 = 11, w = Math.max(textW(big, s1, 700), textW(small, s2, 400)) + 4, bh = s1 + s2 + 4;

        var box = null, offs = [0, w / 2 + 3, -(w / 2 + 3)];
        for (var lift = 0; lift <= 2 && !box; lift++) {
          for (var oi = 0; oi < offs.length && !box; oi++) {
            var cx = Math.max(L + 2 + w / 2, Math.min(L + pw - 2 - w / 2, px + offs[oi]));
            if (oi > 0 && Math.abs(cx - px) < w / 2 - 2) continue;
            var b = { x: cx - w / 2, y: py - 6 - bh + 2 - up - lift * (bh + 2), w: w, h: bh };
            if (b.y >= topLimit && !hits(b, dn)) box = b;
          }
        }
        if (!box) return;
        obstacles.push(box);
        var bcx = box.x + w / 2;
        if (box.y + bh < py - 8 - up) el('line', { x1: px, x2: Math.abs(bcx - px) < 2 ? px : Math.max(box.x + 2, Math.min(box.x + w - 2, px)), y1: py - y0, y2: box.y + bh + 1, stroke: C.muted, 'stroke-width': 0.8 }, lab);
        tx(lab, bcx, box.y + s1, big, withHalo({ fill: C.white, 'font-size': s1, 'font-weight': 700, 'text-anchor': 'middle' }));
        tx(lab, bcx, box.y + s1 + s2 + 1, small, withHalo({ fill: C.text, 'font-size': s2, 'text-anchor': 'middle' }));
        placed++; labelled.push(p);
        return;
      }
      var ps = narrow ? 11.5 : 12.5, lineH = ps + 4;
      var label = big + ' ' + (long ? fmtMonYear(dn) : fmtDay(dn, false));
      var lw = textW(label, ps, 700), anchor = 'middle', bx = px - lw / 2;
      if (bx < L + 3) { anchor = 'start'; bx = px + 3; }
      if (bx + lw > L + pw - 3) { anchor = 'end'; bx = px - 3 - lw; }
      var box2 = { x: bx - 2, y: py - 4 - ps - 1 - up, w: lw + 4, h: ps + 3 }, guard = 0;
      while (hits(box2, dn) && guard++ < 20) { box2.y -= lineH / 2; }
      if (box2.y < topLimit || guard >= 20) return;
      obstacles.push(box2);
      var baseY = box2.y + ps + 0.5;
      if (baseY < py - 6 - up) el('line', { x1: px, x2: px, y1: py - (dotted ? y0 : 0), y2: baseY + 3, stroke: C.muted, 'stroke-width': 0.8 }, lab);
      tx(lab, anchor === 'start' ? bx : anchor === 'end' ? bx + lw : px, baseY, label, withHalo({ fill: C.white, 'font-size': ps, 'font-weight': 700, 'text-anchor': anchor }));
      placed++; labelled.push(p);
    });

    labelled.forEach(function (p) {
      if (!D.hot[p.i] || dots.some(function (d) { return d.dn === p.dn; })) return;
      var c = { dn: p.dn, v: p.v, x: X(p.dn), y: Y(p.v), lab: true };
      if (c.x < Math.max(L, rPk + 0.5) || c.x > L + pw) return;
      dots = dots.filter(function (d) { return d.lab || (Math.hypot(d.x - c.x, d.y - c.y) >= 2 * rPk + 0.5 && Math.abs(d.x - c.x) >= minDx); });
      dots.push(c);
    });
    dots.sort(function (a, b) { return a.dn - b.dn; });
    dotDays = {};
    dots.forEach(function (d) { dotDays[d.dn] = 1; peakDot(dotG, d.x, d.y, rPk); });

    var plObs = obstacles.concat(dots.map(function (d) { return dotBox(d.x, d.y, rPk); }));
    if (todayIn) plObs.push(pulseBox(tx0, ty, rNow));
    pctLabels(el('g', {}, svg), pl1, L, pw, mTop, mTop + mH, plObs, seriesHit(T1, X, Y, false), 'c1');
    pctDraw(pl1, TXREC); TXREC = null;
    var nowG = el('g', {}, svg);
    if (todayIn) nowDot(nowG, tx0, ty, rNow);
    lastDaily = dots.map(function (d) { return d.dn; });
    var spyShown = spyDots(spyY, X, lastDaily, spyR(W), narrow ? 3.5 : 4, todayIn, L, pw);
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var i = dn == null ? D.d.length - 1 : bsearchLE(D.d, dn);
      if (dn != null && D.d[i] >= x0 && D.d[i] <= x1) {
        var px = X(D.d[i]);
        el('line', { x1: px, x2: px, y1: 0, y2: mTop + mH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (D.spy[i] != null) el('circle', { cx: px, cy: spyY(D.spy[i]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
        el('circle', { cx: px, cy: Y(D.v[i]), r: 4.5, fill: C.light, stroke: '#fff', 'stroke-width': 1.2 }, cross);
      }
      readout1(i, dn != null);
    }
    var snap = dots.map(function (d) { return { x: d.x, y: d.y, dn: d.dn }; });
    spyShown.forEach(function (dn) { snap.push({ x: X(dn), y: spyY(D.spy[bsearchLE(D.d, dn)]), dn: dn }); });
    if (todayIn) snap.push({ x: tx0, y: ty, dn: D.last });
    GEO.c1 = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.c1);
  }
  function spyChange(i) {
    if (i < 1 || D.spy[i] == null || D.spy[i - 1] == null) return null;
    return (D.spy[i] / D.spy[i - 1] - 1) * 100;
  }
  function readout1(i, picked) {
    var ro = $('ro1'); clear(ro);
    var isLast = i === D.d.length - 1, live = doc.state === 'LIVE' && isLast;
    ro.appendChild(span('d', fmtDay(D.d[i], true, true) + (live ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('p', pct1(D.v[i])));
    var R = pctCandle('1D', i);
    ro.appendChild(span('', ' scared (' + Math.round(D.v[i] / 100 * D.n[i]) + ' of ' + D.n[i] + ') · '));
    ro.appendChild(span('pc', pctWord(R.s13) + ' percentile' + soFar('1D', R)));
    if (RF) ro.appendChild(span('sp', ' · S&P 500 ' + (D.spv[i] == null ? '–' : pct1(D.spv[i]))));
    ro.appendChild(span('', ' · ' + PX.name + ' ' + (D.spy[i] == null ? '–' : D.spy[i].toFixed(2)) + ' '));
    var ch = spyChange(i);
    if (ch != null) ro.appendChild(span(ch >= 0 ? 'up' : 'down', (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(2) + '%'));
    if (dotDays[D.d[i]]) ro.appendChild(span('pk', ' · fear peak'));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }





  function gapTick(v) { var r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '') + String(Math.abs(r)); }



  var VS3 = ['ai', 'semis', 'hb'];
  var VS_COL = { ai: '#42A5F5', semis: '#FFA726', hb: '#EC407A' };
  var vsMode = (function () {
    var q = null;
    try { q = new URL(location.href).searchParams.get('vs'); } catch (e) { }
    return q === '1' || q === '3' ? +q : stored('aisfVs') === '1' ? 1 : 3;
  })();
  var V3 = null;
  function prepV3() {
    if (V3 && V3.sha === fullSha && V3.rf === RF) return V3.m;
    var m = {};
    VS3.forEach(function (g) {
      var G = full && full.groups && full.groups[g];
      if (!G || !G.daily || !arr(G.daily.d) || !arr(G.daily.v, G.daily.d.length)) return;
      var d = G.daily.d.map(dayNum), v = G.daily.v.map(function (x) { return x / 10; }), gp = d.map(function () { return null; });
      if (RF) {
        var S = RF.tf['1D'], j = 0;
        for (var i = 0; i < d.length; i++) {
          while (j < S.e.length && S.e[j] < d[i]) j++;
          if (j < S.e.length && S.e[j] === d[i] && S.v[j] != null) gp[i] = f1(v[i] - S.v[j]);
        }
      }
      m[g] = { d: d, v: v, gap: gp };
    });
    V3 = { sha: fullSha, rf: RF, m: m };
    return m;
  }
  function vs3Groups() { var m = prepV3(); return VS3.filter(function (g) { return m[g] && GROUPS.indexOf(g) >= 0; }); }
  function vs3On() { return vsMode === 3 && !!RF && vs3Groups().length > 1; }
  function syncVsChips() {
    var box = $('vsMode'); if (!box) return;
    box.hidden = !RF;
    Array.prototype.forEach.call(box.querySelectorAll('[data-vs]'), function (b) { setAttr(b, 'aria-pressed', String(+b.getAttribute('data-vs') === vsMode)); });
  }
  function chooseVs(m) {
    if (m !== 1 && m !== 3) return;
    vsMode = m; store('aisfVs', String(m));
    try { var u = new URL(location.href); u.searchParams.delete('vs'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) { }
    hover.cv = null;
    renderVs(); drawCharts();
  }
  function drawChartV3(Wraw, tu, hFs) {
    var M = prepV3(), gs = vs3Groups();
    var gm = geoV(Wraw), holder = $('chartV'), W = gm.W, narrow = gm.narrow, L = gm.L, pw = gm.pw;
    var tH = narrow ? 230 : 340, gap = narrow ? 12 : 18, gH = narrow ? 128 : 165;
    if (hFs) { gap = hFs < 420 ? 8 : 14; var av = hFs - 24 - gap; tH = Math.round(av * 0.6); gH = av - tH; }
    var gTop = tH + gap, H = gTop + gH + 24;
    var x0 = view.x0, x1 = view.x1, span = x1 - x0, X = lin(x0, x1, L, L + pw);
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu), S = RF.tf['1D'], lw = lineWidth(span, narrow), i;
    var win = {};
    gs.forEach(function (k) { var A = M[k]; win[k] = { a: Math.max(0, bsearchLE(A.d, x0)), b: Math.min(A.d.length - 1, lowerBound(A.d, x1)), vi: visIdx(A.d, x0, x1) }; });

    var g = el('g', {}, svg);
    panelRect(g, L, 0, pw, tH);
    var vmax = spMax('1D', x0, x1);
    gs.forEach(function (k) { var A = M[k], vi = win[k].vi; for (i = vi.i0; i <= vi.i1; i++) vmax = Math.max(vmax, A.v[i]); });
    var ax = niceAxis(Math.max(vmax * 1.06, 10), tH - 26, narrow ? 30 : 36), Y = lin(0, ax.top, tH, 26);
    yTicks(g, Y, ax.ticks, L + pw, L, String, 'right', 0);
    timeGrid(g, X, ticks, 0, tH);
    var clip = clipFor(svg, L, 0, pw, tH), y0 = Y(0).toFixed(1);
    var PS = decimate(S.e, S.v, Math.max(0, bsearchLE(S.e, x0)), Math.min(S.e.length - 1, lowerBound(S.e, x1)), X);
    if (PS.px.length) {
      var sl = pathOf(PS, Y);
      el('path', { d: sl + 'L' + PS.px[PS.px.length - 1].toFixed(1) + ' ' + y0 + 'L' + PS.px[0].toFixed(1) + ' ' + y0 + 'Z', fill: C.fear, 'fill-opacity': 0.34, stroke: 'none', 'clip-path': clip }, g);
      el('path', { d: sl, fill: 'none', stroke: C.fear, 'stroke-width': Math.max(0.8, lw - 0.2), 'stroke-opacity': 0.8, 'stroke-linejoin': 'round', 'clip-path': clip, 'data-sp': '1' }, g);
    }
    gs.forEach(function (k) {
      var A = M[k], P = decimate(A.d, A.v, win[k].a, win[k].b, X);
      if (P.px.length) el('path', { d: pathOf(P, Y), fill: 'none', stroke: VS_COL[k], 'stroke-width': lw + 0.1, 'stroke-opacity': 0.95, 'stroke-linejoin': 'round', 'clip-path': clip, 'data-g': k }, g);
    });
    var t1 = paneTitle(g, L + 7, 15, '% OF STOCKS SCARED');

    var gg = el('g', {}, svg);
    panelRect(gg, L, gTop, pw, gH);
    var gmin = -5, gmax = GAP_LINE + 3;
    gs.forEach(function (k) { var A = M[k], vi = win[k].vi; for (i = vi.i0; i <= vi.i1; i++) if (A.gap[i] != null) { gmin = Math.min(gmin, A.gap[i]); gmax = Math.max(gmax, A.gap[i]); } });
    var gpad = (gmax - gmin) * 0.06, Yg = lin(gmin - gpad, gmax + gpad, gTop + gH - 3, gTop + 22);
    var step = niceStep(gmax - gmin, narrow ? 3 : 4), yt = [];
    while (Math.abs(Yg(0) - Yg(step)) < 17) step *= 2;
    for (var v = Math.ceil((gmin - gpad) / step) * step; v <= gmax + gpad + 1e-9; v += step) yt.push(Math.round(v * 1000) / 1000);
    yTicks(gg, Yg, yt, L + pw, L, gapTick, 'right', gTop);
    timeGrid(gg, X, ticks, gTop, gTop + gH);
    var zy = Yg(0), clipG = clipFor(svg, L, gTop, pw, gH);
    el('line', { x1: L, x2: L + pw, y1: zy.toFixed(1), y2: zy.toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.9 }, gg);
    gs.forEach(function (k) {
      var A = M[k], P = decimate(A.d, A.gap, win[k].a, win[k].b, X);
      if (P.px.length) el('path', { d: pathOf(P, Yg), fill: 'none', stroke: VS_COL[k], 'stroke-width': Math.max(0.9, lw - 0.1), 'stroke-opacity': 0.95, 'stroke-linejoin': 'round', 'clip-path': clipG }, gg);
    });
    var t2 = paneTitle(gg, L + 7, gTop + 15, 'GAP VS THE S&P 500, POINTS');
    if (Yg(GAP_LINE) > gTop + 2) alarmLine(gg, Yg, L, pw, GAP_LINE, '+' + GAP_LINE + ' pts', narrow ? 11 : 11.5, t2, [], gTop, gTop + gH);

    var nowG = el('g', {}, svg), snap = [], fs = narrow ? 11.5 : 12.5, used = [t1, t2];
    function lab(str, x, y, fill, gy0, gy1) {
      var w = textW(str, fs, 700), cands = [y - 9, y + fs + 9, y + 4];
      for (var c = 0; c < cands.length; c++) {
        var bx = { x: x - 8 - w - 2, y: cands[c] - fs, w: w + 4, h: fs + 4 };
        if (bx.y < gy0 + 2 || bx.y + bx.h > gy1 - 2 || bx.x < L + 2 || used.some(function (u) { return overlaps(u, bx); })) continue;
        used.push(bx); tx(nowG, x - 8, cands[c], str, withHalo({ fill: fill, 'font-size': fs, 'font-weight': 700, 'text-anchor': 'end' })); return;
      }
    }
    var lastS = S.e.length - 1, spIn = lastS >= 0 && S.e[lastS] >= x0 && S.e[lastS] <= x1 && S.v[lastS] != null;
    var order = gs.filter(function (k) { var A = M[k], n = A.d.length - 1; return n >= 0 && A.d[n] >= x0 && A.d[n] <= x1; })
      .sort(function (p, q) { return M[q].v[M[q].v.length - 1] - M[p].v[M[p].v.length - 1]; });
    order.forEach(function (k) { var A = M[k], n = A.d.length - 1; used.push(dotBox(X(A.d[n]), Y(A.v[n]), 5)); });
    order.forEach(function (k) {
      var A = M[k], n = A.d.length - 1, nx = X(A.d[n]), ny = Y(A.v[n]);
      lab(groupWords(k).short + ' ' + pct0(A.v[n]), nx - 3, ny, VS_COL[k], 0, tH);
      el('circle', { cx: nx.toFixed(1), cy: ny.toFixed(1), r: narrow ? 4 : 4.6, fill: VS_COL[k], stroke: '#fff', 'stroke-width': 1.3 }, nowG);
      snap.push({ x: nx, y: ny, dn: A.d[n] });
      if (A.gap[n] != null) {
        var gy = Yg(A.gap[n]);
        el('circle', { cx: nx.toFixed(1), cy: gy.toFixed(1), r: narrow ? 3.2 : 3.8, fill: VS_COL[k], stroke: '#fff', 'stroke-width': 1.1 }, nowG);
        snap.push({ x: nx, y: gy, dn: A.d[n] });
      }
    });
    if (spIn) {
      var sx = X(S.e[lastS]), sy = Y(S.v[lastS]);
      el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: narrow ? 3.2 : 3.8, fill: C.light, stroke: C.bg, 'stroke-width': 1.3 }, nowG);
      lab('S&P 500 ' + pct1(S.v[lastS]), sx, sy, C.light, 0, tH);
      snap.push({ x: sx, y: sy, dn: S.e[lastS] });
    }
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg), lastDay = order.length ? M[order[0]].d[M[order[0]].d.length - 1] : D.last;
    function set(dn) {
      clear(cross);
      var day = dn == null ? lastDay : dn;
      if (dn != null && day >= x0 && day <= x1) {
        var px = X(day);
        el('line', { x1: px, x2: px, y1: 0, y2: gTop + gH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        var sj = bsearchLE(S.e, day);
        if (sj >= 0 && S.e[sj] === day && S.v[sj] != null) el('circle', { cx: px, cy: Y(S.v[sj]), r: 3.6, fill: C.light, stroke: C.bg, 'stroke-width': 1.4 }, cross);
        gs.forEach(function (k) {
          var A = M[k], j = bsearchLE(A.d, day);
          if (j < 0 || A.d[j] !== day) return;
          el('circle', { cx: px, cy: Y(A.v[j]), r: 4.2, fill: VS_COL[k], stroke: '#fff', 'stroke-width': 1.2 }, cross);
          if (A.gap[j] != null) el('circle', { cx: px, cy: Yg(A.gap[j]), r: 3.8, fill: VS_COL[k], stroke: '#fff', 'stroke-width': 1.1 }, cross);
        });
      }
      readoutV3(day, dn != null);
    }
    GEO.cv = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.cv);
  }
  function readoutV3(day, picked) {
    var ro = $('roV'), M = prepV3(), S = RF.tf['1D']; clear(ro);
    var live = doc.state === 'LIVE' && day === D.last;
    ro.appendChild(span('d', fmtDay(day, true, true) + (live ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    vs3Groups().forEach(function (k) {
      var A = M[k], j = bsearchLE(A.d, day), ok = j >= 0 && A.d[j] === day;
      ro.appendChild(span('', ' · '));
      var nm = span('', groupWords(k).short + ' '); nm.style.color = VS_COL[k]; nm.style.fontWeight = '600'; ro.appendChild(nm);
      ro.appendChild(span('p', ok ? pct1(A.v[j]) : '–'));
      if (ok && A.gap[j] != null) ro.appendChild(span(A.gap[j] >= GAP_GOLD ? 'pk' : 'muted', ' (' + gapWord1(A.gap[j]).replace(' pts', '') + ')'));
    });
    var sj = bsearchLE(S.e, day);
    ro.appendChild(span('', ' · S&P 500 '));
    ro.appendChild(span('sp', sj >= 0 && S.e[sj] === day && S.v[sj] != null ? pct1(S.v[sj]) : '–'));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }
  function drawChartV(Wraw, tu, hFs) {
    if (vs3On()) return drawChartV3(Wraw, tu, hFs);
    var gm = geoV(Wraw), holder = $('chartV'), W = gm.W, narrow = gm.narrow, L = gm.L, pw = gm.pw;
    var tH = narrow ? 200 : 280, gap = narrow ? 12 : 18, gH = narrow ? 128 : 165;
    if (hFs) { gap = hFs < 420 ? 8 : 14; var av = hFs - 24 - gap; tH = Math.round(av * 0.6); gH = av - tH; }
    var gTop = tH + gap, H = gTop + gH + 24, last = D.d.length - 1;
    var x0 = view.x0, x1 = view.x1, span = x1 - x0, X = lin(x0, x1, L, L + pw), todayIn = D.last >= x0 && D.last <= x1;
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu), S = RF.tf['1D'], lw = lineWidth(span, narrow), i;
    var a = Math.max(0, bsearchLE(D.d, x0)), b = Math.min(last, lowerBound(D.d, x1));

    var g = el('g', {}, svg);
    panelRect(g, L, 0, pw, tH);
    var vi = visIdx(D.d, x0, x1), vmax = 0;
    for (i = vi.i0; i <= vi.i1; i++) { vmax = Math.max(vmax, D.v[i]); if (D.spv[i] != null) vmax = Math.max(vmax, D.spv[i]); }
    vmax = Math.max(vmax, spMax('1D', x0, x1));
    var ax = niceAxis(Math.max(vmax * 1.06, 10), tH - 26, narrow ? 30 : 36), Y = lin(0, ax.top, tH, 26);
    yTicks(g, Y, ax.ticks, L + pw, L, String, 'right', 0);
    timeGrid(g, X, ticks, 0, tH);
    var clip = clipFor(svg, L, 0, pw, tH), y0 = Y(0).toFixed(1);
    var PS = decimate(S.e, S.v, Math.max(0, bsearchLE(S.e, x0)), Math.min(S.e.length - 1, lowerBound(S.e, x1)), X);
    if (PS.px.length) {
      var sl = pathOf(PS, Y);
      el('path', { d: sl + 'L' + PS.px[PS.px.length - 1].toFixed(1) + ' ' + y0 + 'L' + PS.px[0].toFixed(1) + ' ' + y0 + 'Z', fill: C.muted, 'fill-opacity': 0.3, stroke: 'none', 'clip-path': clip }, g);
      el('path', { d: sl, fill: 'none', stroke: '#B2B5BE', 'stroke-width': Math.max(0.8, lw - 0.2), 'stroke-opacity': 0.75, 'stroke-linejoin': 'round', 'clip-path': clip, 'data-sp': '1' }, g);
    }
    var PG = decimate(D.d, D.v, a, b, X);
    el('path', { d: pathOf(PG, Y), fill: 'none', stroke: '#9575CD', 'stroke-width': lw + 0.5, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    var t1 = paneTitle(g, L + 7, 15, '% OF STOCKS SCARED');

    var gg = el('g', {}, svg);
    panelRect(gg, L, gTop, pw, gH);
    var gmin = -5, gmax = GAP_LINE + 3;
    for (i = vi.i0; i <= vi.i1; i++) if (D.gap[i] != null) { gmin = Math.min(gmin, D.gap[i]); gmax = Math.max(gmax, D.gap[i]); }
    var gpad = (gmax - gmin) * 0.06, Yg = lin(gmin - gpad, gmax + gpad, gTop + gH - 3, gTop + 22);
    var step = niceStep(gmax - gmin, narrow ? 3 : 4), yt = [];
    while (Math.abs(Yg(0) - Yg(step)) < 17) step *= 2;
    for (var v = Math.ceil((gmin - gpad) / step) * step; v <= gmax + gpad + 1e-9; v += step) yt.push(Math.round(v * 1000) / 1000);
    yTicks(gg, Yg, yt, L + pw, L, gapTick, 'right', gTop);
    timeGrid(gg, X, ticks, gTop, gTop + gH);
    var zy = Yg(0), clipG = clipFor(svg, L, gTop, pw, gH);
    var clipUp = clipFor(svg, L, gTop, pw, Math.max(0, Math.min(gH, zy - gTop))), clipDn = clipFor(svg, L, Math.max(gTop, zy), pw, Math.max(0, gTop + gH - zy));
    var PP = decimate(D.d, D.gap, a, b, X);
    if (PP.px.length) {
      var gl = pathOf(PP, Yg), area = gl + 'L' + PP.px[PP.px.length - 1].toFixed(1) + ' ' + zy.toFixed(1) + 'L' + PP.px[0].toFixed(1) + ' ' + zy.toFixed(1) + 'Z';
      el('path', { d: area, fill: C.fear, 'fill-opacity': 0.42, stroke: 'none', 'clip-path': clipUp }, gg);
      el('path', { d: area, fill: C.muted, 'fill-opacity': 0.32, stroke: 'none', 'clip-path': clipDn }, gg);
      el('path', { d: gl, fill: 'none', stroke: C.light, 'stroke-width': Math.max(0.9, lw - 0.1), 'stroke-linejoin': 'round', 'clip-path': clipG }, gg);
    }
    el('line', { x1: L, x2: L + pw, y1: zy.toFixed(1), y2: zy.toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.9 }, gg);
    var t2 = paneTitle(gg, L + 7, gTop + 15, 'GAP · ' + GW.short.toUpperCase() + ' − S&P 500, POINTS');
    if (Yg(GAP_LINE) > gTop + 2) alarmLine(gg, Yg, L, pw, GAP_LINE, '+' + GAP_LINE + ' pts', narrow ? 11 : 11.5, t2, [], gTop, gTop + gH);

    var nowG = el('g', {}, svg), snap = [];
    if (todayIn) {
      var nx = X(D.last), ny = Y(D.v[last]), rNow = narrow ? 4.5 : 5.5, fs = narrow ? 11.5 : 12.5, used = [t1];
      var lab = function (str, x, y, fill, gy0, gy1) {
        var w = textW(str, fs, 700), cands = [y - 9, y + fs + 9];
        for (var c = 0; c < cands.length; c++) {
          var bx = { x: x - 8 - w - 2, y: cands[c] - fs, w: w + 4, h: fs + 4 };
          if (bx.y < gy0 + 2 || bx.y + bx.h > gy1 - 2 || bx.x < L + 2 || used.some(function (u) { return overlaps(u, bx); })) continue;
          used.push(bx); tx(nowG, x - 8, cands[c], str, withHalo({ fill: fill, 'font-size': fs, 'font-weight': 700, 'text-anchor': 'end' })); return;
        }
      };
      var sv = D.spv[last], sy = sv == null ? null : Y(sv);
      if (sv != null) used.push(dotBox(nx, sy, 5));
      lab(GW.short + ' ' + pct0(D.v[last]), nx - 3, ny, C.light, 0, tH);
      used.push(nowBox(nx, ny, rNow));
      if (sv != null) {
        el('circle', { cx: nx.toFixed(1), cy: sy.toFixed(1), r: narrow ? 3.2 : 3.8, fill: '#B2B5BE', stroke: C.bg, 'stroke-width': 1.3 }, nowG);
        lab('S&P 500 ' + pct1(sv), nx, sy, '#B2B5BE', 0, tH);
        snap.push({ x: nx, y: sy, dn: D.last });
      }
      nowDot(nowG, nx, ny, rNow); snap.push({ x: nx, y: ny, dn: D.last });
      if (D.gap[last] != null) {
        var gy = Yg(D.gap[last]);
        el('circle', { cx: nx.toFixed(1), cy: gy.toFixed(1), r: narrow ? 3.4 : 4, fill: '#F3EEFF', stroke: '#fff', 'stroke-width': 1.2 }, nowG);
        used.push(t2);
        lab(gapWord(D.gap[last]), nx, gy, D.gap[last] >= GAP_GOLD ? DOT.peak : C.text, gTop, gTop + gH);
        snap.push({ x: nx, y: gy, dn: D.last });
      }
    }
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var j = dn == null ? last : bsearchLE(D.d, dn);
      if (dn != null && D.d[j] >= x0 && D.d[j] <= x1) {
        var px = X(D.d[j]);
        el('line', { x1: px, x2: px, y1: 0, y2: gTop + gH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (D.spv[j] != null) el('circle', { cx: px, cy: Y(D.spv[j]), r: 3.6, fill: '#B2B5BE', stroke: C.bg, 'stroke-width': 1.4 }, cross);
        el('circle', { cx: px, cy: Y(D.v[j]), r: 4.5, fill: C.light, stroke: '#fff', 'stroke-width': 1.2 }, cross);
        if (D.gap[j] != null) el('circle', { cx: px, cy: Yg(D.gap[j]), r: 4, fill: C.light, stroke: '#fff', 'stroke-width': 1.1 }, cross);
      }
      readoutV(j, dn != null);
    }
    GEO.cv = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.cv);
  }
  function readoutV(i, picked) {
    var ro = $('roV'); clear(ro);
    var live = doc.state === 'LIVE' && i === D.d.length - 1, gp = D.gap[i];
    ro.appendChild(span('d', fmtDay(D.d[i], true, true) + (live ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    ro.appendChild(span('', ' · ' + GW.short + ' '));
    ro.appendChild(span('p', pct1(D.v[i])));
    ro.appendChild(span('', ' · S&P 500 '));
    ro.appendChild(span('sp', D.spv[i] == null ? '–' : pct1(D.spv[i])));
    ro.appendChild(span('', ' · gap '));
    ro.appendChild(span(gp == null ? 'muted' : gp >= GAP_GOLD ? 'pk' : 'pc', gp == null ? '–' : gapWord1(gp)));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }


  function shareWords(p, word) {
    if (typeof p !== 'number') return null;
    return (p === 0 ? '<0.1' : p < 1 ? p.toFixed(1) : String(Math.round(p))) + '% of days ' + word;
  }
  function renderVs() {
    var sec = $('vs');
    sec.hidden = !RF;
    if (!RF) return;
    syncVsChips();
    var c = (full.compare && full.compare[grp]) || {}, sp = spNow(), gap = gapNow(), live = doc.state === 'LIVE', cn = closedNow();
    var vl = $('vsLine'), vr = $('vsRank'); clear(vl); vr.textContent = '';
    var who = GW.who.charAt(0).toUpperCase() + GW.who.slice(1), when = cn ? ' at today’s close (preliminary)' : live ? ' (today so far)' : ' at the close';
    if (vs3On()) { renderVs3(sp, when); renderLegendV3(); renderVsTable(); return; }
    $('vsSub').textContent = GW.title + ' (purple) against the S&P 500 fear meter (grey), every day. Lower panel: the gap between them, in points.';
    if (sp == null) {  }
    else if (gap == null) {
      vl.appendChild(span('', who + ' ' + lat0(doc.stats['1D']) + ' scared' + when + '; the S&P 500 fear meter reads ' + pct1(sp) + spAsOf() + '. Today’s gap comes with its next update.'));
    } else {
      vl.appendChild(span('zw' + (gap >= GAP_GOLD ? ' gold' : ''), Math.round(gap) === 0 ? 'Level with the market' : gapWord(gap) + ' vs the market'));
      vl.appendChild(span('', ' — ' + who + ' ' + lat0(doc.stats['1D']) + ' scared, S&P 500 ' + pct1(sp) + when + '.'));
      var widest = typeof c.gap_max === 'number' && gap > c.gap_max, prev = typeof c.gap_max === 'number' && c.gap_max_date ?
        gapWord(c.gap_max) + ' on ' + fmtDay(dayNum(c.gap_max_date), true) : null;
      if (widest) vr.textContent = 'The widest gap ' + GW.a + (prev ? ' (the widest before today: ' + prev + ')' : '') + '.';
      else {
        var w13 = shareWords(c.gap_pct_r13, GW.a), w21 = GW.one ? null : shareWords(c.gap_pct_r21, GW.b);
        if (w13) vr.textContent = (gap >= 0 ? 'A gap this wide or wider: ' : 'The gap was at this level or higher on ') + w13 + (w21 ? ' · ' + w21 : '') + '.' +
          (gap >= 0 && prev ? ' Widest ' + GW.a + ': ' + prev + '.' : '');
      }
    }
    renderLegendV(); renderVsTable();
  }

  function renderVs3(sp, when) {
    var M = prepV3(), gs = vs3Groups(), vl = $('vsLine'), vr = $('vsRank');
    $('vsSub').textContent = 'AI, semis and high-beta stocks (coloured lines) against the S&P 500 fear meter (purple area), every day. Lower panel: each group’s gap to the S&P 500, in points.';
    if (sp == null) return;
    var rows = gs.map(function (k) { var A = M[k], n = A.d.length - 1; return { k: k, v: A.v[n], gap: A.gap[n], c: (full.compare && full.compare[k]) || {} }; })
      .filter(function (r) { return r.gap != null; }).sort(function (p, q) { return q.gap - p.gap; });
    if (!rows.length) { vl.appendChild(span('', 'The S&P 500 fear meter reads ' + pct1(sp) + spAsOf() + '. Today’s gaps come with the next update.')); return; }
    rows.forEach(function (r, i) {
      if (i) vl.appendChild(span('', ' · '));
      var nm = span('zw', groupWords(r.k).short + ' '); nm.style.color = VS_COL[r.k]; vl.appendChild(nm);
      vl.appendChild(span('zw' + (r.gap >= GAP_GOLD ? ' gold' : ''), gapWord(r.gap)));
    });
    vl.appendChild(span('', ' vs the market — S&P 500 ' + pct1(sp) + when + '.'));
    var parts = rows.map(function (r) {
      var p = r.c.gap_pct_r13;
      if (r.gap < 0 || typeof p !== 'number') return null;
      return groupWords(r.k).short + ' ' + (p === 0 ? '<0.1' : p < 1 ? p.toFixed(1) : String(Math.round(p))) + '%';
    }).filter(Boolean);
    if (parts.length) vr.textContent = 'A gap this wide or wider, share of days ' + GW.a + ': ' + parts.join(' · ') + '.';
  }
  function renderLegendV3() {
    var l = $('lgV'); clear(l);
    vs3Groups().forEach(function (k) {
      var s0 = span('lg-i', ''), sw = span('lg-gl', ''); sw.style.borderTopColor = VS_COL[k];
      s0.appendChild(sw); s0.appendChild(document.createTextNode(groupWords(k).short + ' (' + groupWords(k).n + ')')); l.appendChild(s0);
    });
    var sa = span('lg-i', ''); sa.appendChild(span('lg-sa lg-sa-p', '')); sa.appendChild(document.createTextNode('S&P 500 fear meter')); l.appendChild(sa);
    var al = span('lg-i', ''); al.appendChild(span('lg-alarm', '')); al.appendChild(document.createTextNode('+' + GAP_LINE + ' pts: much more scared than the market')); l.appendChild(al);
  }
  function renderLegendV() {
    function item(cls, text) { var s0 = span('lg-i', ''); s0.appendChild(span(cls, '')); s0.appendChild(document.createTextNode(text)); return s0; }
    var l = $('lgV'); clear(l);
    l.appendChild(item('lg-gl', GW.title.replace(/^The /, '')));
    l.appendChild(item('lg-sa', 'S&P 500 fear meter'));
    l.appendChild(item('lg-gap', 'gap = ' + GW.short + ' − S&P 500 (purple: more scared than the market)'));
    l.appendChild(item('lg-alarm', '+' + GAP_LINE + ' pts'));
  }

  function tableVal(x) { if (x && typeof x === 'object') x = typeof x.latest === 'number' ? x.latest : x.v; return typeof x === 'number' && isFinite(x) ? x : null; }
  function renderVsTable() {
    var t = $('vsTable'); clear(t);
    var nt = full.compare && full.compare.now_table;
    t.hidden = !nt;
    if (!nt) return;
    var cap = document.createElement('caption'); cap.textContent = 'Latest candle, every group vs the S&P 500 fear meter (gap in points)'; t.appendChild(cap);
    var hr = t.insertRow(), heads = [['', ''], ['D', 'Daily'], ['W', 'Weekly'], ['2W', '2-week'], ['M', 'Monthly']];
    heads.forEach(function (h) { var th = document.createElement('th'); th.textContent = h[0]; if (h[1]) th.title = h[1] + ' candles'; th.scope = 'col'; hr.appendChild(th); });
    var spRow = nt.sp || {};
    GROUPS.forEach(function (g) {
      var row = nt[g]; if (!row) return;
      var r = t.insertRow(); if (g === grp) r.className = 'on';
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = groupWords(g).short; r.appendChild(th);
      TFS.forEach(function (k) {
        var v = tableVal(row[k]), sv = tableVal(spRow[k]), c = r.insertCell();
        c.appendChild(span('vt-v', v == null ? '–' : pct1(v)));
        if (v != null && sv != null) { var dg = f1(v - sv); c.appendChild(span('vt-g' + (dg >= GAP_GOLD ? ' gold' : dg < 0 ? ' neg' : ''), gapWord1(dg).replace(' pts', ''))); }
      });
    });
    var rs = t.insertRow(); rs.className = 'sp';
    var th2 = document.createElement('th'); th2.scope = 'row'; th2.textContent = 'S&P 500'; rs.appendChild(th2);
    TFS.forEach(function (k) { var v = tableVal(spRow[k]); rs.insertCell().appendChild(span('vt-v', v == null ? '–' : pct1(v))); });
  }


  function drawChart2(Wraw, tu, hFs) {
    var gm = geo2(Wraw), holder = $('chart2'), W = gm.W, wide = gm.wide;
    var L = gm.L, RA = gm.RA, RC = gm.RC, pw = gm.pw;
    var spyH = wide ? 110 : 84, gap = wide ? 16 : 10, panH = wide ? 160 : 118, live = doc.state === 'LIVE';

    var heads = {}, headSum = 0;
    TFS.forEach(function (k) { heads[k] = wide ? { h: 0 } : tfHead(k, L, pw, RA, live, !!hFs); headSum += heads[k].h; });
    if (hFs) {
      gap = wide ? (hFs < 300 ? 6 : hFs < 560 ? 8 : 14) : 8;
      var av2 = hFs - 24 - TFS.length * gap - headSum, short2 = wide && hFs < 300;
      spyH = Math.max(short2 ? 36 : 44, Math.round(av2 * 0.2)); panH = Math.max(short2 ? 30 : 40, Math.floor((av2 - spyH) / TFS.length));
      spyH = Math.max(spyH, av2 - TFS.length * panH);
    }
    var x0 = view.x0, x1 = view.x1, span = x1 - x0, X = lin(x0, x1, L, L + pw);
    var todayIn = D.last >= x0 && D.last <= x1;
    var H = spyH + TFS.length * (gap + panH) + headSum + 24;
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu);
    var keep2 = {}; lastDaily.forEach(function (dn) { keep2[bsearchLE(D.d, dn)] = 1; });
    var spyY = spyPanel(svg, X, x0, x1, L, 0, pw, spyH, 12, ticks, keep2), snap = [];
    var spyShown = spyDots(spyY, X, lastDaily, spyR(W), wide ? 4 : 3.5, todayIn, L, pw);
    spyShown.forEach(function (dn) { snap.push({ x: X(dn), y: spyY(D.spy[bsearchLE(D.d, dn)]), dn: dn }); });
    if (todayIn && D.spy[D.d.length - 1] != null) snap.push({ x: X(D.last), y: spyY(D.spy[D.d.length - 1]), dn: D.last });
    var y = spyH, panels = [];
    TFS.forEach(function (k) {
      var st = doc.stats[k], T = D.tf[k], steps = k === '1M';
      y += gap;
      var g = el('g', {}, svg), note = noteFor(k, st, live), R = pctCandle(k, T.v.length - 1), sf = soFar(k, R);
      if (!wide) {
        heads[k].rows.forEach(function (r) { tx(g, r.x, y + r.y, r.s, { fill: r.fill, 'font-size': r.fs, 'font-weight': r.fw || 400, 'text-anchor': r.a || 'start', 'data-th': r.tag || null }); });
        y += heads[k].h;
      }
      panelRect(g, L, y, pw, panH);

      var j0 = lowerBound(T.e, x0), j1 = bsearchLE(T.s, x1), mx = 0;
      for (var i = j0; i <= j1; i++) mx = Math.max(mx, T.v[i]);
      if (todayIn) mx = Math.max(mx, st.latest);
      mx = Math.max(mx, spMax(k, x0, x1));
      var ax = niceAxis(Math.max(mx * 1.1, st.alarm * 1.3), panH, wide ? 30 : 24);
      var Y = lin(0, ax.top, y + panH, y + (wide ? 4 : 2));
      yTicks(g, Y, ax.ticks, L + pw, L, String, 'right', y);
      timeGrid(g, X, ticks, y, y + panH);
      var clip = clipFor(svg, L, y, pw, panH);
      var lw = k === '1D' ? lineWidth(span, true) : { '1W': 1.1, '2W': 1.3, '1M': 1.5 }[k];
      seriesPaths(g, X, Y, T, x0, x1, clip, lw, steps, pw);
      if (RF) spLine(g, X, Y, RF.tf[k], x0, x1, clip, steps, !wide);
      TXREC = [];
      var plk = pctLines(el('g', {}, g), k, Y, L, pw, y, y + panH);
      var obs = [alarmLine(g, Y, L, pw, st.alarm, alarmWords(k), 11, wide ? { x: L + 6, y: y + 4, w: textW(TF_NAME[k], 14, 700) + 4, h: 19 } : null, plk.ys, y, y + panH)];
      if (wide) {
        tx(g, L + 8, y + 18, TF_NAME[k], withHalo({ fill: C.white, 'font-size': 14, 'font-weight': 700 }));
        obs.push({ x: L + 6, y: y + 4, w: textW(TF_NAME[k], 14, 700) + 4, h: 19 });
      }
      var rPk = wide ? 4 : 3.5, rNow = wide ? 5.5 : 4.5, nx = X(T.e[T.e.length - 1]), ny = Y(st.latest);
      if (todayIn) obs.push(nowBox(nx, ny, rNow));

      var idx = k === '1D' ? lastDaily.map(function (dn) { return bsearchLE(D.d, dn); }) : T.peaks, cands = [];
      idx.forEach(function (j) {
        var a = T.s[j], b = j + 1 < T.s.length ? T.s[j + 1] : T.e[j];
        if (steps ? (b < x0 || a > x1) : (T.e[j] < x0 || T.e[j] > x1)) return;
        var px = steps ? (X(a) + X(b)) / 2 : X(T.e[j]);
        if (px >= Math.max(L, rPk + 0.5) && px <= L + pw) cands.push({ j: j, v: T.v[j], x: px, y: Y(T.v[j]) });
      });
      cands.sort(function (p, q) { return q.v - p.v; });
      var kept = thinDots(cands, rPk, obs);
      kept.forEach(function (d) { obs.push(dotBox(d.x, d.y, rPk)); });
      pctLabels(g, plk, L, pw, y, y + panH, todayIn ? obs.concat([pulseBox(nx, ny, rNow)]) : obs, seriesHit(T, X, Y, steps), 'c2' + k);
      pctDraw(plk, TXREC); TXREC = null;
      kept.forEach(function (d) { peakDot(g, d.x, d.y, rPk); snap.push({ x: d.x, y: d.y, dn: D.d[Math.max(0, bsearchLE(D.d, steps ? X.inv(d.x) : T.e[d.j]))] }); });
      kept.sort(function (p, q) { return p.j - q.j; });
      if (todayIn) { nowDot(g, nx, ny, rNow); snap.push({ x: nx, y: ny, dn: D.last }); }
      if (wide) {
        var cx = L + pw + RA + 14, cw = RC - 18, full = panH >= 150, cnt = 'counts ' + st.n + ' of ' + GW.listed;

        var rec13 = !!(R.s13 && R.s13.record), p1 = pctWord(R.s13) + ' percentile' + sf, tp = '(' + (rec13 ? 'highest' : topWord(R.s13)) + ')',
          one = textW(p1 + ' ' + tp, 13) <= cw;
        var rows = [[one ? p1 + ' ' + tp : p1, 13, C.text, 'p13'], [one ? GW.a : tp + ' ' + GW.a, 12, C.muted, 'b13']];
        if (!GW.one) rows.push([pctWord(R.s21) + ' ' + GW.b, 11.5, C.muted, 'p21']);
        rows.push([cnt, 11.5, st.n < GW.listed ? C.text : C.muted, 'cnt']);
        if (RF && spLatest(k) != null) rows.push(['S&P 500 ' + pct1(spLatest(k)), 11.5, C.text, 'sp']);
        var pkw = peakWords(k), bot = y + panH - 4;

        var wrapIn = function (yy0, str, size, fill, tag) {
          var words = str.split(' '), line = '', lines = [], yy = yy0;
          words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (textW(t, size) > cw && line) { lines.push(line); line = w; } else line = t; });
          if (line) lines.push(line);
          lines.forEach(function (l) { if (yy <= bot) tx(g, cx, yy, l, { fill: fill, 'font-size': size, 'data-th': tag || null }); yy += size + 3; });
          return yy - size - 3;
        };
        if (full) {
          tx(g, cx, y + 34, lat0(st), { fill: C.light, 'font-size': 30, 'font-weight': 700 });
          var yy = y + 34;
          rows.forEach(function (r, i) {
            yy += i ? r[1] + 5 : 22;
            if (textW(r[0], r[1]) > cw) yy = wrapIn(yy, r[0], r[1], r[2], r[3]);
            else tx(g, cx, yy, r[0], { fill: r[2], 'font-size': r[1], 'data-th': r[3] });
          });
          yy = wrapIn(yy + 17, pkw, 11.5, PK_TXT, 'pk');
          if (note) wrapIn(yy + 17, note, 11.5, C.muted);
        } else {
          var big = Math.max(18, Math.min(30, Math.round(panH * 0.3))), y2 = y + big + 2, bigW = textW(lat0(st), big, 700);
          tx(g, cx, y2, lat0(st), { fill: C.light, 'font-size': big, 'font-weight': 700 });
          var o13 = pctWord(R.s13), t13 = topWord(R.s13);
          var p13 = [o13 + ' percentile' + sf + ' (' + t13 + ')', o13 + ' percentile' + sf + ' ' + GW.a, o13 + ' percentile' + sf, o13 + sf + ' (' + t13 + ')', o13 + sf, o13]
            .filter(function (s0) { return textW(s0, 12) <= cw; })[0] || o13;
          var roomRows = Math.floor((y + panH - 3 - y2) / 17);
          if (roomRows < 1) {
            var inl = [o13 + ' percentile' + sf, o13 + sf, o13].filter(function (s0) { return bigW + 8 + textW(s0, 12) <= cw; })[0];
            if (inl) tx(g, cx + bigW + 8, y2, inl, { fill: C.text, 'font-size': 12, 'data-th': 'p13' });
          }
          var short = [[p13, 12, C.text, 'p13'], [GW.one ? '' : pctWord(R.s21) + ' ' + GW.b, 11, C.muted, 'p21'], [cnt, 11, C.muted, 'cnt'], [pkw, 11, PK_TXT, 'pk'], [note, 11, C.muted]];
          if (roomRows >= 1) short.forEach(function (r) {
            if (!r[0] || y2 + r[1] + 5 > y + panH - 3) return;
            if (textW(r[0], r[1]) > cw) return;
            y2 += r[1] + 5;
            tx(g, cx, y2, r[0], { fill: r[2], 'font-size': r[1], 'data-th': r[3] || null });
          });
        }
      }
      panels.push({ k: k, T: T, Y: Y, top: y, h: panH, steps: steps });
      y += panH;
    });
    timeAxis(svg, X, ticks, H - 4, 0, L + pw + RA);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var di = dn == null ? D.d.length - 1 : bsearchLE(D.d, dn), day = D.d[di], picks = {}, show = dn != null && day >= x0 && day <= x1;
      panels.forEach(function (p) {
        var T = p.T, j = bsearchLE(T.s, day); if (j < 0) j = 0;
        picks[p.k] = j;
        var px = p.steps ? X(day) : X(T.e[j]);
        if (show && px >= L - 0.5 && px <= L + pw + 0.5) el('circle', { cx: px, cy: p.Y(T.v[j]), r: 4, fill: C.light, stroke: '#fff', 'stroke-width': 1.1 }, cross);
      });
      if (show) {
        var x = X(day);
        el('line', { x1: x, x2: x, y1: 0, y2: H - 22, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (D.spy[di] != null) el('circle', { cx: x, cy: spyY(D.spy[di]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
      }
      readout2(di, picks, dn != null);
    }
    GEO.c2 = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.c2);
  }
  function soFar(k, R) { return !R.open ? '' : (k === '1D' && closedNow() ? ' (prelim.)' : ' so far'); }



  function tfHead(k, L, pw, RA, live, noPeak) {
    var st = doc.stats[k], R = pctCandle(k, D.tf[k].v.length - 1), sf = soFar(k, R), right = L + pw + RA, rows = [];
    var big = lat0(st), vW = textW(big, 22, 700), nameR = L + 2 + textW(TF_NAME[k], 14, 700) + 10, o = pctWord(R.s13), tp = topWord(R.s13);
    rows.push({ x: L + 2, y: 15, s: TF_NAME[k], fill: C.white, fs: 14, fw: 700 });
    rows.push({ x: right, y: 20, s: big, fill: C.light, fs: 22, fw: 700, a: 'end' });
    var opts = [o + ' percentile' + sf + ' (' + tp + ')', o + sf + ' (' + tp + ')', o + ' percentile' + sf, o + sf, o], p13 = o;
    for (var i = 0; i < opts.length; i++) if (right - vW - 8 - textW(opts[i], 11.5) >= nameR) { p13 = opts[i]; break; }
    rows.push({ x: right - vW - 8, y: 19, s: p13, fill: C.text, fs: 11.5, a: 'end', tag: 'p13' });
    var note = noteFor(k, st, live), r2 = GW.one ? GW.a : GW.a + ' · ' + pctWord(R.s21) + ' ' + GW.b;
    if (!GW.one && textW(r2, 11) > pw * 0.62) r2 = pctWord(R.s21) + ' ' + GW.b;
    rows.push({ x: right, y: 33, s: r2, fill: C.muted, fs: 11, a: 'end', tag: 'p21' });
    var h = 42;
    if (note) {
      if (L + 2 + textW(note, 11) + 10 <= right - textW(r2, 11)) rows.push({ x: L + 2, y: 33, s: note, fill: C.muted, fs: 11 });
      else { rows.push({ x: L + 2, y: 47, s: note, fill: C.muted, fs: 11 }); h = 54; }
    }
    if (!noPeak) {
      var pkw = peakWords(k), cnt = 'counts ' + st.n + ' of ' + GW.listed;
      rows.push({ x: L + 2, y: h + 5, s: pkw, fill: PK_TXT, fs: 11, tag: 'pk' });
      if (L + 2 + textW(pkw, 11) + 12 + textW(cnt, 11) <= right) rows.push({ x: right, y: h + 5, s: cnt, fill: st.n < GW.listed ? C.text : C.muted, fs: 11, a: 'end', tag: 'cnt' });
      else { rows.push({ x: right, y: h + 18, s: cnt, fill: st.n < GW.listed ? C.text : C.muted, fs: 11, a: 'end', tag: 'cnt' }); h += 13; }
      h += 13;
    }
    return { h: h, rows: rows };
  }
  function noteFor(k, st, live) {
    if (k === '1D' && st.open && !closedNow()) return 'today so far, as if it closed now';
    return st.note || '';
  }
  function wrapText(g, x, y, str, maxW, size, fill) {
    var words = str.split(' '), line = '', lines = [];
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (textW(t, size) > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    lines.slice(0, 3).forEach(function (l, i) { tx(g, x, y + i * (size + 3), l, { fill: fill, 'font-size': size }); });
  }
  function candleLabel(k, T, j) {
    var s = T.s[j], e = T.e[j];
    if (k === '1D') return fmtDay(e, false, false);
    if (k === '1M') return fmtMonYear(s);
    return (k === '1W' ? 'wk of ' : 'from ') + fmtDay(s, false, false);
  }
  function readout2(di, picks, picked) {
    var ro = $('ro2'); clear(ro);
    var top = document.createElement('div'); top.className = 'rg-date';
    var isLast = di === D.d.length - 1;
    top.appendChild(span('d', fmtDay(D.d[di], true, true) + (isLast && doc.state === 'LIVE' ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    top.appendChild(span('', ' · ' + PX.name + ' ' + (D.spy[di] == null ? '–' : D.spy[di].toFixed(2)) + ' '));
    var ch = spyChange(di);
    if (ch != null) top.appendChild(span(ch >= 0 ? 'up' : 'down', (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(2) + '%'));
    if (dotDays[D.d[di]]) top.appendChild(span('pk', ' · daily fear peak'));
    if (!picked) top.appendChild(span('muted', ' · ' + TAP + ' a panel for any day'));
    ro.appendChild(top);
    var grid = document.createElement('div'); grid.className = 'rg';
    TFS.forEach(function (k) {
      var T = D.tf[k], j = picks[k], c = document.createElement('div');
      var open = j === T.v.length - 1 && doc.stats[k].open;
      c.appendChild(span('k', k + (open ? ' · so far' : '')));
      c.appendChild(span('v', j === T.v.length - 1 ? lat0(doc.stats[k]) : pct0(T.v[j])));
      var R = pctCandle(k, j);
      c.appendChild(span('pc', ' ' + pctWord(R.s13)));
      var lab = candleLabel(k, T, j), pre = /^(wk of |from )/.exec(lab), sEl = span('s', '');
      if (pre) sEl.appendChild(span('sp', pre[1]));
      sEl.appendChild(document.createTextNode(pre ? lab.slice(pre[1].length) : lab));
      c.appendChild(sEl);

      var nn = j === T.v.length - 1 ? doc.stats[k].n : k === '1D' ? D.n[j] : (T.n ? T.n[j] : null);
      if (nn != null) { var cEl = span('s cnt', nn + ' of ' + GW.listed); cEl.appendChild(span('cw', ' counted')); c.appendChild(cEl); }
      if (RF) {
        var si = refIdx(k, k === '1D' ? D.d[di] : T.e[j]), sv = si < 0 ? null : j === T.v.length - 1 && si === RF.tf[k].v.length - 1 ? spLatest(k) : RF.tf[k].v[si];
        c.appendChild(span('s spt', 'S&P ' + (sv == null ? '–' : pct1(sv))));
      }
      c.appendChild(miniBar(R.s13 ? R.s13.r : null));
      grid.appendChild(c);
    });
    ro.appendChild(grid);
  }


  function setAttr(n, k, v) { if (n.getAttribute(k) !== v) n.setAttribute(k, v); }
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
  function zoomBy(f) {
    var latest = atLatest(view);
    setView(zoomView(view, latest ? D.last : (view.x0 + view.x1) / 2, f, latest));
  }
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
    store('aisfRange', chip);
    hover.c1 = hover.c2 = hover.cv = hover.cs = hover.cb = hover.cgs = hover.cgb = null;
    if (doc) requestRender(); else renderViewUiChips();
  }
  function renderViewUiChips() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-range]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-range') === view.chip)); });
  }








  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var HOLD_MS = 380;
  var lastTip = -1e9;

  var mainCtl = { view: function () { return view; }, set: setView, limits: spanLimits, clamp: clampView, keepRight: keepRight,
    atLatest: atLatest, pan: panView, zoom: zoomView, reset: resetView, cmd: zoomCmd, xs: function () { return D.d; }, last: function () { return D.last; } };
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
      hover[key] = xs[i]; g.set(xs[i]);
    }
    function unpick() { var g = G(); if (hover[key] != null && g) { hover[key] = null; g.set(null); } }
    function startPinch() {
      var p = list(), g = G(), v = ctl.view(), mid = (pxOf(p[0].x) + pxOf(p[1].x)) / 2, s = v.x1 - v.x0;
      g0 = { view: v, dist: Math.max(24, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)),
        anchor: v.x0 + (mid - g.L) / g.pw * s, latest: ctl.atLatest(v) };
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



  var KC = { k: '#4FC3F7', d: '#FFB74D', j: '#8A8F9E', yel: '#FFD84D', up: '#EF5350', dn: '#26A69A' };
  var K_NAME = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  var K_SHOW = { '1D': 90, '1W': 78, '2W': 52, '1M': 60 };
  var K_UNIT = { '1D': ['day', 'days'], '1W': ['week', 'weeks'], '2W': ['2-week candle', '2-week candles'], '1M': ['month', 'months'] };
  var K_NEXT = { '1D': 'next day', '1W': 'next week', '2W': 'next 2-week candle', '1M': 'next month' };
  var K_MIN = 12;


  function prepareKdj(P, d) {
    var out = {};
    TFS.forEach(function (k) {
      var T = P.tf[k], w = d.view.tf[k], n = T.v.length, idx = new Array(n), spy = new Array(n), t10 = function (x) { return x / 10; };
      for (var i = 0; i < n; i++) { idx[i] = i; var di = bsearchLE(P.d, T.e[i]); spy[i] = di >= 0 ? P.spy[di] : null; }
      var Q = { K: w.K.map(t10), D: w.D.map(t10), J: w.J.map(t10), n: n, idx: idx, spy: spy, open: !!w.op, cross: {}, peak: {} };
      w.xu.forEach(function (j) { Q.cross[j] = 'up'; });
      w.xd.forEach(function (j) { Q.cross[j] = 'down'; });
      T.peaks.forEach(function (j) { Q.peak[j] = 1; });
      Q.rising = !!w.up;
      Q.flip = w.fl == null ? null : w.fl;
      out[k] = Q;
    });
    return out;
  }





  var KV = {}, KN = {}, KB = {}, kPending = {}, kRaf = false;

  function kKind(k) { var c = k.charAt(0); return c === 'v' || c === 's' || c === 'b' || c === 'p' ? c : 'f'; }
  function isVk(k) { return k.charAt(0) === 'v'; }
  function isVolK(k) { var c = k.charAt(0); return c === 's' || c === 'b'; }
  function kTf(k) { return kKind(k) === 'f' ? k : k.slice(1); }
  function kSer(k) { var c = kKind(k); return c === 'f' ? D.tf[k] : c === 'v' ? VK.q[k.slice(1)] : c === 'p' ? SPQ[k.slice(1)] : VOLQ[c][k.slice(1)]; }
  function kQ(k) { var c = kKind(k); return c === 'f' ? D.kdj[k] : c === 'v' ? VK.q[k.slice(1)] : c === 'p' ? SPQ[k.slice(1)] : VOLQ[c][k.slice(1)]; }
  function kShowOf(k) { return kKind(k) === 'p' ? SP_SHOW[kTf(k)] : K_SHOW[kTf(k)]; }
  function kUnitOf(k) { return kKind(k) === 'p' ? SP_UNIT[kTf(k)] : K_UNIT[kTf(k)]; }
  function kPad(span) { return Math.max(0.9, span * 0.02); }
  function kHi(k, span) { return KN[k] - 1 + kPad(span); }
  function kLatestSpan(k, x0) { var b = KN[k] - 1 - x0; return 0.9 >= 0.02 * (b + 0.9) ? b + 0.9 : b / 0.98; }
  function kLimits(k) { return { min: Math.min(K_MIN, kLatestSpan(k, -0.6)), max: kLatestSpan(k, -0.6) }; }
  function kClamp(k, v) {
    var lim = kLimits(k), x0 = v.x0, x1 = v.x1, span = Math.max(lim.min, Math.min(lim.max, x1 - x0));
    if (Math.abs(span - (x1 - x0)) > 1e-9) { var c = (x0 + x1) / 2; x0 = c - span / 2; x1 = c + span / 2; }
    var hi = kHi(k, span);
    if (x1 > hi) { x0 -= x1 - hi; x1 = hi; }
    if (x0 < -0.6) { x1 += -0.6 - x0; x0 = -0.6; }
    return { chip: null, custom: v.custom, x0: x0, x1: x1 };
  }
  function kToLatest(k, v, x0) { return kClamp(k, { custom: v.custom, x0: x0, x1: x0 + kLatestSpan(k, x0) }); }



  var K_RANGES = ['Auto', '1M', '3M', '6M', '1Y', '2Y', '5Y', 'All'];
  var kChip = 'Auto';
  function normKRange(s) {
    if (!s) return null;
    var u = String(s).trim().toUpperCase();
    if (u === 'AUTO') return 'Auto';
    return normRange(u);
  }
  function kChipOf(k) { return isVk(k) ? vkChip : isVolK(k) ? volKChip[k.charAt(0)] : kKind(k) === 'p' ? 'Auto' : kChip; }
  function kChipCount(k, chip) {
    var n = KN[k], T = kSer(k);
    if (chip === 'All') return n;
    if (!RANGE_MONTHS[chip]) return Math.min(n, kShowOf(k));
    return n - (bsearchLE(T.s, monthsBack(T.e[n - 1], RANGE_MONTHS[chip])) + 1);
  }
  function kChipShown(k) { return Math.min(KN[k], Math.max(K_MIN, kChipCount(k, kChipOf(k)))); }
  function kDefault(k) { return kToLatest(k, { custom: false }, Math.max(-0.6, KN[k] - kChipShown(k) - 0.5)); }
  function kAtLatest(k, v) { return v.x1 >= kHi(k, v.x1 - v.x0) - 0.01; }
  function kKeepRight(k, v) { var s = v.x1 - v.x0, x1 = kHi(k, s); return kClamp(k, { custom: v.custom, x0: x1 - s, x1: x1 }); }
  function kZoom(k, v, c, f, stick) {
    var lim = kLimits(k), s = v.x1 - v.x0, ns = Math.max(lim.min, Math.min(lim.max, s * f));
    if (Math.abs(ns - s) < 1e-6) return v;
    var x0 = c - (c - v.x0) * ns / s, nv = kClamp(k, { custom: true, x0: x0, x1: x0 + ns });
    return (stick && nv.x1 >= KN[k] - 1) ? kKeepRight(k, nv) : nv;
  }
  function kPan(k, v, dd) { return kClamp(k, { custom: true, x0: v.x0 + dd, x1: v.x1 + dd }); }
  function kCandles(k, v) { return [Math.max(0, Math.ceil(v.x0 - 1e-9)), Math.min(KN[k] - 1, Math.floor(v.x1 + 1e-9))]; }
  function kSet(k, nv) {
    var dv = kDefault(k);
    if (nv.custom && sameWindow(nv, dv)) nv = dv;

    if (nv.custom && kAtLatest(k, nv)) { var c1 = kCandles(k, nv), c2 = kCandles(k, dv); if (c1[0] === c2[0] && c1[1] === c2[1]) nv = dv; }
    var cur = KV[k];
    if (cur && sameWindow(nv, cur) && nv.custom === cur.custom) return false;
    KV[k] = nv; requestKdj(k); return true;
  }
  function kCmd(k, z) {
    if (!D) return;
    var v = KV[k], latest = kAtLatest(k, v);
    if (z === 'in' || z === 'out') kSet(k, kZoom(k, v, latest ? KN[k] - 1 : (v.x0 + v.x1) / 2, z === 'in' ? 1 / ZOOM_STEP : ZOOM_STEP, latest));
    else if (z === 'reset') kSet(k, kDefault(k));
  }


  function renderKChips() {
    var fk = FS.key && FS.key.charAt(0) === 'k' && kKind(FS.key.slice(1)) === 'f' ? FS.key.slice(1) : null;
    var custom = fk ? !!(KV[fk] && KV[fk].custom) : TFS.some(function (k) { return KV[k] && KV[k].custom; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-krange]'), function (b) {
      var mine = b.getAttribute('data-krange') === kChip;
      setAttr(b, 'aria-pressed', String(mine && !(custom && D)));
      b.classList.toggle('base', mine && custom && !!D);
    });
    renderVkChips(); renderVolKChips('s'); renderVolKChips('b');
  }
  function chooseKRange(chip) {
    kChip = chip;
    store('aisfKdjRange', chip);
    if (D && D.kdj) TFS.forEach(function (k) { KV[k] = kDefault(k); hover['k' + k] = null; });
    renderKChips();
    if (D && D.kdj) requestKdj('all');
  }
  function kCtl(k) {
    return { view: function () { return KV[k]; }, set: function (nv) { return kSet(k, nv); }, limits: function () { return kLimits(k); },
      clamp: function (v) { return kClamp(k, v); }, keepRight: function (v) { return kKeepRight(k, v); }, atLatest: function (v) { return kAtLatest(k, v); },
      pan: function (v, dd) { return kPan(k, v, dd); }, zoom: function (v, c, f, st) { return kZoom(k, v, c, f, st); },
      reset: function () { kSet(k, kDefault(k)); }, cmd: function (z) { kCmd(k, z); },
      xs: function () { return kQ(k).idx; }, last: function () { return KN[k] - 1; } };
  }




  function kShift(oldS, newS) {
    if (!oldS || !oldS.length || !newS.length || oldS[0] === newS[0]) return 0;
    var j = newS.indexOf(oldS[0]); if (j >= 0) return j;
    j = oldS.indexOf(newS[0]); return j >= 0 ? -j : 0;
  }
  function kdjAfterLoad(keys, prevN, prevS) {
    keys.forEach(function (k) {
      var old = KV[k], wasLatest = old && prevN[k] ? (function () { var nn = KN[k]; KN[k] = prevN[k]; var r = kAtLatest(k, old); KN[k] = nn; return r; })() : true;
      var sh = prevS ? kShift(prevS[k], kSer(k).s) : 0;
      if (sh && old) {
        old = { custom: old.custom, x0: old.x0 + sh, x1: old.x1 + sh };
        if (hover['k' + k] != null) hover['k' + k] = hover['k' + k] + sh >= 0 ? hover['k' + k] + sh : null;
      }
      if (!old || !old.custom) KV[k] = kDefault(k);
      else KV[k] = wasLatest ? kToLatest(k, old, old.x0) : kClamp(k, old);
      if (hover['k' + k] != null && hover['k' + k] > KN[k] - 1) hover['k' + k] = null;
    });
  }


  var K_UNITS = [['w', 1], ['w', 2], ['m', 1], ['m', 3], ['m', 6], ['y', 1], ['y', 2], ['y', 5]];

  var K_TICK0 = { '1D': 0, '1W': 0, '2W': 1, '1M': 2 };
  function kTicks(T, i0, i1, X, fs, xmin, xmax, u0, quarters) {
    function key(i, u, n) {
      var dn = T.s[i], d = dnDate(dn);
      if (u === 'w') return Math.floor(Math.floor((dn - 4) / 7) / n);
      if (u === 'm') return Math.floor((d.getUTCFullYear() * 12 + d.getUTCMonth()) / n);
      return Math.floor(d.getUTCFullYear() / n);
    }
    for (var ui = u0 || 0; ui < K_UNITS.length; ui++) {
      var u = K_UNITS[ui][0], n = K_UNITS[ui][1], out = [];
      for (var i = Math.max(1, i0); i <= i1; i++) {
        if (key(i, u, n) === key(i - 1, u, n)) continue;
        var d = dnDate(T.s[i]), lab = u === 'w' ? fmtDay(T.s[i], false) : u === 'm' ? (quarters ? 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + ' ’' + String(d.getUTCFullYear()).slice(2) :
          d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()]) : String(d.getUTCFullYear());
        out.push({ i: i, x: X(i), label: lab, w: textW(lab, fs) });
      }
      if (!out.length) continue;
      var need = 0, gap = Infinity;
      out.forEach(function (o) { need = Math.max(need, o.w); });
      for (var j = 1; j < out.length; j++) gap = Math.min(gap, out[j].x - out[j - 1].x);
      if (gap >= need + 12) return out.filter(function (o) { return o.x - o.w / 2 >= xmin && o.x + o.w / 2 <= xmax; });
    }
    return [];
  }
  function kRangeLabel(k, T, i, withYear) {
    var s = T.s[i], e = T.e[i];
    if (k === '1D') return fmtDay(e, withYear, true);
    if (k === '1M') return fmtMonYear(s);
    var ys = dnDate(s).getUTCFullYear() !== dnDate(e).getUTCFullYear();
    return s === e ? fmtDay(s, withYear) : fmtDay(s, ys) + ' – ' + fmtDay(e, withYear || ys);
  }
  function kWinWords(k) {
    var v = KV[k], T = kSer(k), n = KN[k], ch = kChipOf(k), U = kUnitOf(k);
    if (!v.custom) {
      if (ch === 'Auto') return kKind(k) === 'p' && n >= SP_SHOW[kTf(k)] ? SP_WIN[kTf(k)] : 'last ' + Math.min(n, kShowOf(k)) + ' ' + U[1];
      var want = kChipCount(k, ch), shown = kChipShown(k);
      if (want < shown) return 'last ' + shown + ' ' + U[shown === 1 ? 0 : 1] + ' (shortest view)';


      if (ch === 'All' || (RANGE_MONTHS[ch] && monthsBack(T.e[n - 1], RANGE_MONTHS[ch]) < T.s[0]))
        return 'all ' + n + ' ' + U[1] + ' ' + (isVk(k) ? (T.first ? 'from ' + fmtMonYear(T.s[0]) : VK.since) :
          isVolK(k) ? (T.first ? 'from ' + fmtMonYear(T.s[0]) : 'since ' + dnDate(T.s[0]).getUTCFullYear()) : GW.a);
      return RANGE_WORDS[ch] + ' · ' + shown + ' ' + U[shown === 1 ? 0 : 1];
    }
    var a = Math.max(0, Math.ceil(v.x0)), b = Math.min(n - 1, Math.floor(v.x1)), cnt = b - a + 1;
    var nb = function (str) { return str.replace(/ /g, ' '); };
    var da = T.s[a], db = T.e[b];
    var words = db - da > 150 ? (fmtMonYear(da) === fmtMonYear(db) ? nb(fmtMonYear(da)) : nb(fmtMonYear(da)) + ' – ' + nb(fmtMonYear(db)))
      : nb(fmtDay(da, dnDate(da).getUTCFullYear() !== dnDate(db).getUTCFullYear())) + ' – ' + nb(fmtDay(db, true));
    return words + ' · ' + cnt + ' ' + U[cnt === 1 ? 0 : 1];
  }
  function f0(x) { return String(Math.round(x)); }
  function kFlipText(k, Q) {
    if (Q.flip == null) return null;
    var f = Q.flip.toFixed(1) + '%';

    if (Q.open && Q.cross[Q.n - 1]) return Q.rising ? 'no cross, stays easing below ' + f : 'no cross, stays rising above ' + f;
    var t = Q.rising ? 'flips to easing below ' + f : 'flips to rising above ' + f;
    return Q.open ? t : K_NEXT[k] + ' ' + t;
  }
  function kStateText(k, Q) {
    var n = Q.n, c = Q.cross[n - 1], s;
    if (c) s = (Q.open ? 'K would cross ' : 'K just crossed ') + (c === 'up' ? 'above D' : 'below D') + ': fear ' + (c === 'up' ? 'rising' : 'easing');
    else s = Q.rising ? 'K above D: fear rising' : 'K below D: fear easing';
    if (Q.flip == null) s += ' · no fear level (0–100%) ' + (Q.open ? 'before this candle closes' : 'on the ' + K_NEXT[k]) + ' flips it to ' + (Q.rising ? 'easing' : 'rising');
    return s;
  }
  function kNote(k, st, Q) {
    var note = st.note || '';
    if (Q.open && !/as if/.test(note)) note += ', as if closed today';
    return note;
  }
  function renderKdjText() {
    var cn = closedNow(), live = doc.state === 'LIVE', sessDn = dayNum(doc.live.session_date);
    $('kdjSub').textContent = PX.name + ' price · fear bars · KDJ of the fear %, per candle size';
    $('kdjSub2').textContent = (cn ? 'Close of ' + fmtDay(sessDn, false, true) + ' (preliminary)' : live ? 'Today so far' : 'Close of ' + fmtDay(sessDn, false, true)) +
      ' · open candles drawn as if they closed today (dotted lines, hollow dots, shaded column)';
    TFS.forEach(function (k) {
      var B = KB[k], Q = D.kdj[k], st = doc.stats[k], n = Q.n;
      var R = pctCandle(k, n - 1);
      clear(B.val);

      B.val.appendChild(span('kv-a', 'fear ' + lat0(st) + ' · ' + pctWord(R.s13)));
      B.val.appendChild(span('kv-b', ' · K ' + f0(Q.K[n - 1]) + ' D ' + f0(Q.D[n - 1]) + ' J ' + f0(Q.J[n - 1])));
      B.val.classList.toggle('ghost', Q.open);
      B.note.textContent = kNote(k, st, Q) + ' · ' + kStateText(k, Q);
      B.note.classList.toggle('ghost', Q.open);
    });
    var lg = $('lg3'); clear(lg);
    function item(cls, text) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(text)); return s; }
    lg.appendChild(item('lg-bar', 'fear %'));
    lg.appendChild(item('lg-pk', 'fear peak (same candle on ' + PX.name + ')'));
    lg.appendChild(item('lg-ln lg-k', 'K'));
    lg.appendChild(item('lg-ln lg-d', 'D'));
    lg.appendChild(item('lg-ln lg-j', 'J'));
    lg.appendChild(item('lg-tri lg-up', 'K crosses up = fear rising'));
    lg.appendChild(item('lg-tri lg-dn', 'K crosses down = fear easing'));
    lg.appendChild(item('lg-pl', '90/95/99th pct (' + GW.aS + ')'));
    lg.appendChild(item('lg-ghost', 'as if closed today (hollow = not final)'));
    lg.appendChild(item('lg-flip', 'flip level: the fear % where K would cross D'));
    lg.appendChild(item('lg-alarm', 'alarm line'));
  }

  function triPath(x, y, s, up) {
    return up ? 'M' + x.toFixed(1) + ' ' + (y - s).toFixed(1) + 'L' + (x + s).toFixed(1) + ' ' + (y + s * 0.8).toFixed(1) + 'L' + (x - s).toFixed(1) + ' ' + (y + s * 0.8).toFixed(1) + 'Z'
      : 'M' + x.toFixed(1) + ' ' + (y + s).toFixed(1) + 'L' + (x + s).toFixed(1) + ' ' + (y - s * 0.8).toFixed(1) + 'L' + (x - s).toFixed(1) + ' ' + (y - s * 0.8).toFixed(1) + 'Z';
  }
  function paneTitle(g, x, y, str, extra, extraFill) {
    var t = tx(g, x, y, str, withHalo({ fill: C.muted, 'font-size': 11, 'font-weight': 700, 'letter-spacing': '0.04em' }));
    var w = textW(str, 11, 700) + str.length * 0.44;
    if (extra) { tx(g, x + w + 8, y, extra, withHalo({ fill: extraFill, 'font-size': 11, 'font-weight': 600 })); w += 8 + textW(extra, 11, 600); }
    return { x: x - 2, y: y - 11, w: w + 4, h: 15 };
  }



  function kLine(g, X, Y, xs, vals, a, b, cut, clip, color, w, op, dotted, keep, dotW) {
    var P = decimate(xs, vals, a, Math.min(b, cut), X, keep);
    if (P.px.length) el('path', { d: pathOf(P, Y), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-opacity': op, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    if (dotted && b >= cut + 1 && cut >= 0 && vals[cut] != null && vals[cut + 1] != null)
      el('line', { x1: X(cut).toFixed(1), y1: Y(vals[cut]).toFixed(1), x2: X(cut + 1).toFixed(1), y2: Y(vals[cut + 1]).toFixed(1), stroke: color, 'stroke-width': dotW || w,
        'stroke-opacity': op, 'stroke-dasharray': '1.6 2.2', 'stroke-linecap': 'round', 'clip-path': clip }, g);
    return P;
  }



  var KLAB = 11;
  function kLabBox(str, x, yMid, right) { var w = textW(str, KLAB) + 8; return { x: right ? x - w : x, y: yMid - 6.5, w: w, h: 13 }; }
  function kGridY(g, Y, vals, L, pw) { vals.forEach(function (v) { var py = Y(v); el('line', { x1: L, x2: L + pw, y1: py, y2: py, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g); }); }


  function kInsideLabels(g, items, L, pw, obstacles, hit, pTop, pBot, overLeft, rightX) {
    var xR = rightX != null ? rightX : L + pw - 2;
    function candsOf(it, side) {
      var c = [];
      if (side !== 'L') c.push(kLabBox(it.s, xR, it.y, true));
      if (side !== 'R') {
        c.push(kLabBox(it.s, L + 2, it.y, false));
        if (overLeft) {
          var w = c[c.length - 1].w, x;
          for (x = L + 24; x + w < L + pw * 0.55; x += 22) c.push(kLabBox(it.s, x, it.y, false));
          for (x = L + 2; x + w < L + pw * 0.55; x += 22) { var f = kLabBox(it.s, x, it.y, false); f.force = true; c.push(f); }
        }
      }
      return c;
    }
    function run(side) {
      var placed = [];
      items.forEach(function (it) {
        var cands = candsOf(it, side), pick = null;
        for (var c = 0; c < cands.length && !pick; c++) {
          var bx = cands[c];
          if (bx.y < pTop + 1 || bx.y + bx.h > pBot - 1 || bx.x < L + 1 || bx.x + bx.w > L + pw) continue;
          var core = { x: bx.x, y: bx.y + 1.5, w: bx.w, h: bx.h - 3 };
          if (obstacles.some(function (o) { return overlaps(o, o.full ? bx : core); }) || placed.some(function (o) { return overlaps(o, bx); }) || (hit && !bx.force && hit(bx))) continue;
          pick = bx;
        }
        if (!pick) return;
        pick.side = pick.x > L + pw / 2 ? 'R' : 'L'; pick.s = it.s; pick.ym = it.y;
        placed.push(pick);
      });
      return placed;
    }

    var best = run('R');
    if (best.length < items.length) { var l = run('L'); if (l.length === items.length) best = l; else { var m = run(null); if (m.length > best.length) best = m; } }

    var nR = best.filter(function (o) { return o.side === 'R'; }).length, nL = best.length - nR;
    if (Math.min(nR, nL) === 1 && Math.max(nR, nL) >= 3) { var main = nR > nL ? 'R' : 'L'; best = best.filter(function (o) { return o.side === main; }); }
    best.forEach(function (pick) {
      el('rect', { x: pick.x.toFixed(1), y: pick.y.toFixed(1), width: pick.w.toFixed(1), height: pick.h, rx: 2, fill: C.panel, 'fill-opacity': 0.82, 'data-ylab': '1' }, g);
      tx(g, pick.x + pick.w / 2, pick.ym + 3.8, pick.s, { fill: C.muted, 'font-size': KLAB, 'text-anchor': 'middle' });
    });
    return best;
  }

  function kLineHit(X, Y, vals, a, b, pad) {
    return function (bx) {
      var j0 = Math.max(a, Math.floor(X.inv(bx.x)) - 1), j1 = Math.min(b, Math.ceil(X.inv(bx.x + bx.w)) + 1);
      for (var j = j0; j < j1; j++) {
        if (vals[j] == null || vals[j + 1] == null) continue;
        var xa = X(j), xb = X(j + 1);
        if (xb < bx.x || xa > bx.x + bx.w) continue;
        var y0 = Y(vals[j]), y1 = Y(vals[j + 1]), t0 = Math.max(0, (bx.x - xa) / (xb - xa)), t1 = Math.min(1, (bx.x + bx.w - xa) / (xb - xa));
        var ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1;
        if (Math.max(ya, yb) >= bx.y - pad && Math.min(ya, yb) <= bx.y + bx.h + pad) return true;
      }
      return false;
    };
  }
  function anyHit(fns) { return function (bx) { return fns.some(function (f) { return f(bx); }); }; }

  function kPriceTicks(lo, hi, Y, yTop, yBot) {
    var vLo = Y.inv(yBot), vHi = Y.inv(yTop), e = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, (vHi - vLo) / 4)))), best = null;
    [e / 10, e, e * 10].forEach(function (p) {
      [1, 2, 2.5, 4, 5].forEach(function (m) {
        var step = m * p, out = [];
        for (var q = Math.ceil(vLo / step - 1e-9); q * step <= vHi + 1e-9; q++) { var v = q * step, py = Y(v); if (py >= yTop - 0.01 && py <= yBot + 0.01) out.push(Math.round(v * 1e6) / 1e6); }

        var nT = out.length, score = (nT >= 4 && nT <= 5 ? 0 : nT === 6 ? 0.6 : nT === 7 ? 1 : 2 + Math.abs(nT - 4.5)) + (m === 2.5 ? 0.3 : m === 4 ? 0.7 : 0);
        if (!best || score < best.score - 1e-9) best = { score: score, step: step, ticks: out };
      });
    });
    var c100 = Math.round(best.step * 100);
    best.dec = c100 % 100 === 0 ? 0 : c100 % 10 === 0 ? 1 : 2;
    return best;
  }




  function kGridX(g, ticks, top, h) { ticks.forEach(function (t) { el('line', { x1: t.x, x2: t.x, y1: top, y2: top + h, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g); }); }
  function kShade(g, o, top, h) {
    if (!o.open || !o.lastIn) return;
    var x0 = Math.max(o.L, o.col.x), x1 = Math.min(o.L + o.pw, o.col.x + o.col.w);
    if (x1 > x0) el('rect', { x: x0.toFixed(1), y: top, width: Math.max(1, x1 - x0).toFixed(1), height: h, fill: C.fear, 'fill-opacity': 0.2 }, g);
  }
  function kdjPane(svg, o) {
    var Q = o.Q, X = o.X, a = o.a, b = o.b, last = o.last, cut = o.cut, open = o.open, lastIn = o.lastIn, L = o.L, pw = o.pw;
    var kTop = o.top, kH = o.h, narrow = o.narrow, ppc = o.ppc, snap = o.snap;
    var gK = el('g', {}, svg), cUp = o.cUp || KC.up, cDn = o.cDn || KC.dn;
    panelRect(gK, L, kTop, pw, kH);
    var Yk = lin(-20, 120, kTop + kH, kTop);
    el('rect', { x: L, y: Yk(120), width: pw, height: Yk(80) - Yk(120), fill: cUp, 'fill-opacity': 0.07 }, gK);
    el('rect', { x: L, y: Yk(20), width: pw, height: Yk(-20) - Yk(20), fill: cDn, 'fill-opacity': 0.07 }, gK);
    kGridY(gK, Yk, [0, 50, 100], L, pw);
    kGridX(gK, o.ticks, kTop, kH); kShade(gK, o, kTop, kH);
    var clipK = clipFor(svg, L, kTop, pw, kH), lwK = ppc < 1 ? 1 : ppc < 2.5 ? 1.3 : narrow ? 1.6 : 1.9;
    kLine(gK, X, Yk, Q.idx, Q.J, a, b, cut, clipK, KC.j, ppc < 1 ? 0.7 : 1, ppc < 1 ? 0.4 : ppc < 2.5 ? 0.6 : 0.8, open, null, 1);
    kLine(gK, X, Yk, Q.idx, Q.K, a, b, cut, clipK, KC.k, lwK, 1, open);
    kLine(gK, X, Yk, Q.idx, Q.D, a, b, cut, clipK, KC.d, lwK, 1, open);
    var titleK = paneTitle(gK, L + 7, kTop + 13, o.title);

    var gG = el('g', {}, gK), gr = narrow ? 3.4 : 4, ghostY = {}, obsK = [];
    if (open && lastIn) {
      var gxx = X(last);
      [['J', KC.j], ['D', KC.d], ['K', KC.k]].forEach(function (s) {
        var val = Q[s[0]][last], yy = Math.max(kTop + gr + 1.5, Math.min(kTop + kH - gr - 1.5, Yk(val)));
        el('circle', { cx: gxx.toFixed(1), cy: yy.toFixed(1), r: gr, fill: C.bg, stroke: s[1], 'stroke-width': 1.7 }, gG);
        ghostY[s[0]] = yy; snap.push({ x: gxx, y: yy, dn: last }); obsK.push(dotBox(gxx, yy, gr + 1));
      });
    }






    var sTri = narrow ? 4 : 4.6, tri = ppc >= 2 * sTri ? sTri : Math.max(3, Math.min(sTri, ppc * 0.9)), thin = ppc < 2, keptX = [], crossShown = [];
    var ck = Object.keys(Q.cross).map(Number).filter(function (j) { return j >= a && j <= b; }).sort(function (p, q) { return q - p; });
    var gT = el('g', {}, gK), skipNext = false, yLo = kTop + tri + 1, yHi = kTop + kH - tri - 1;
    function clampY(y) { return Math.max(yLo, Math.min(yHi, y)); }
    ck.forEach(function (j) {
      if (skipNext) { skipNext = false; return; }
      var x = X(j); if (x < L + 1 || x > L + pw + 1) return;
      if (thin && keptX.some(function (kx) { return Math.abs(kx - x) < 2 * tri + 1; })) { skipNext = true; return; }
      var y = clampY(Yk((Q.K[j] + Q.D[j]) / 2)), up = Q.cross[j] === 'up', hollow = open && j === last, dx = 0;
      if (hollow && ghostY.K != null) {
        var gys = [ghostY.K, ghostY.D, ghostY.J], need = gr + tri + 1.5;
        var free = function (yy) { return gys.every(function (g) { return Math.abs(yy - g) >= need; }); };
        if (!free(y)) {
          var cand = [];
          gys.forEach(function (g) { cand.push(clampY(g - need - 1), clampY(g + need + 1)); });



          cand = cand.filter(free);
          if (cand.length) {
            var dMin = Math.min.apply(null, cand.map(function (p) { return Math.abs(p - y); }));
            cand = cand.filter(function (p) { return Math.abs(p - y) <= dMin + 1; }).sort(function (p, q) { return up ? q - p : p - q; });
            y = cand[0];
          } else dx = -(gr + tri + 2);
        }
      }
      if (overlaps(titleK, { x: x - tri, y: y - tri, w: 2 * tri, h: 2 * tri }) && !hollow) y = clampY(Math.max(y, titleK.y + titleK.h + tri + 1));
      keptX.push(x);
      el('path', { d: triPath(x + dx, y, tri, up), fill: hollow ? C.bg : (up ? cUp : cDn), stroke: hollow ? (up ? cUp : cDn) : C.bg, 'stroke-width': hollow ? 1.5 : 0.8, 'data-tri': up ? 'up' : 'down' }, gT);
      snap.push({ x: x + dx, y: y, dn: j }); crossShown.push({ i: j, dir: Q.cross[j], hollow: hollow, y: y, x: x + dx, r: tri });
    });
    crossShown.forEach(function (c) { obsK.push({ x: c.x - c.r - 1, y: c.y - c.r - 1, w: 2 * c.r + 2, h: 2 * c.r + 2 }); });
    obsK.push(titleK);
    kInsideLabels(gK, [100, 50, 0].map(function (t) { return { y: Yk(t), s: String(t) }; }), L, pw, obsK,
      anyHit([kLineHit(X, Yk, Q.K, a, b, 1.5), kLineHit(X, Yk, Q.D, a, b, 1.5)]), kTop, kTop + kH, true, o.rX);
    return { Y: Yk, g: gK };
  }

  function drawKdj(k) {
    var B = KB[k], Q = D.kdj[k], T = D.tf[k], st = doc.stats[k], v = KV[k], n = Q.n, last = n - 1;
    var W = Math.max(300, Math.round(B.chart.clientWidth)), narrow = W < 640;

    var L = 1, pw = W - 2;

    var spyH = narrow ? Math.max(160, Math.min(200, Math.round(W * 0.5))) : 230, gp = narrow ? 8 : 10, fH = narrow ? 88 : 118, kH = narrow ? 132 : 172;
    var hFs = fsHeight(B.chart);
    if (hFs) {
      var avK = hFs - 20 - 2 * gp;
      spyH = Math.round(avK * 0.43); fH = Math.round(avK * 0.22); kH = avK - spyH - fH;
    }
    var fTop = spyH + gp, kTop = fTop + fH + gp, H = kTop + kH + 20;
    var X = lin(v.x0, v.x1, L, L + pw), ppc = pw / (v.x1 - v.x0);
    var svg = svgFor(B.chart, W, H);
    var a = Math.max(0, Math.floor(v.x0)), b = Math.min(last, Math.ceil(v.x1));
    var vi0 = Math.max(0, Math.ceil(v.x0 - 0.4)), vi1 = Math.min(last, Math.floor(v.x1 + 0.4));
    var open = Q.open, lastIn = last >= v.x0 && X(last) <= L + pw + 0.5;
    var cut = open ? last - 1 : last;
    var ticks = kTicks(T, a, b, X, 11, 0, L + pw, K_TICK0[k]);
    var col = { x: X(last - 0.5), w: ppc };
    function shade(g, top, h) {
      if (!open || !lastIn) return;
      var x0 = Math.max(L, col.x), x1 = Math.min(L + pw, col.x + col.w);
      if (x1 > x0) el('rect', { x: x0.toFixed(1), y: top, width: Math.max(1, x1 - x0).toFixed(1), height: h, fill: C.fear, 'fill-opacity': 0.2 }, g);
    }
    function grid(g, top, h) { ticks.forEach(function (t) { el('line', { x1: t.x, x2: t.x, y1: top, y2: top + h, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g); }); }


    var rPk = narrow ? 3.2 : 3.8, pkIn = T.peaks.filter(function (j) { return j >= a && j <= b && j < last; }), keepPk = {};
    pkIn.forEach(function (j) { keepPk[j] = 1; });
    var snap = [];


    var gS = el('g', {}, svg);
    panelRect(gS, L, 0, pw, spyH);
    var lo = Infinity, hi = -Infinity, i;
    for (i = vi0; i <= vi1; i++) if (Q.spy[i] != null) { lo = Math.min(lo, Q.spy[i]); hi = Math.max(hi, Q.spy[i]); }
    if (!(hi >= lo)) { lo = 0; hi = 1; }
    if (hi - lo < hi * 0.004) { var mid = (hi + lo) / 2; lo = mid * 0.998; hi = mid * 1.002; }
    var pad = (hi - lo) * 0.08, Ys = lin(lo - pad, hi + pad, spyH - 6, 26);
    var pt = kPriceTicks(lo, hi, Ys, 30, spyH - 8);
    kGridY(gS, Ys, pt.ticks, L, pw);
    grid(gS, 0, spyH); shade(gS, 0, spyH);
    var clipS = clipFor(svg, L, 0, pw, spyH);

    var PA = decimate(Q.idx, Q.spy, a, Math.min(b, cut), X, keepPk);
    if (PA.px.length > 1) {
      var gid = 'ga' + (++uid), defs = svg.querySelector('defs') || el('defs', {}, svg), grd = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: '0', 'stop-color': C.text, 'stop-opacity': 0.16 }, grd);
      el('stop', { offset: '1', 'stop-color': C.text, 'stop-opacity': 0.015 }, grd);
      el('path', { d: pathOf(PA, Ys) + 'L' + PA.px[PA.px.length - 1].toFixed(1) + ' ' + spyH + 'L' + PA.px[0].toFixed(1) + ' ' + spyH + 'Z', fill: 'url(#' + gid + ')', stroke: 'none', 'clip-path': clipS }, gS);
    }
    kLine(gS, X, Ys, Q.idx, Q.spy, a, b, cut, clipS, C.white, 2, 1, open, keepPk, narrow ? 1.3 : 1.5);
    var gSd = el('g', {}, gS);
    var titleS = paneTitle(gS, L + 7, 14, PX.name.toUpperCase());
    if (PX.first != null && T.e[a] < PX.first && Q.spy[b] != null) {
      var fj = Math.max(a, lowerBound(T.e, PX.first));
      priceGapNote(gS, L, Math.min(L + pw, X(fj - 0.5)), 26, spyH - 6, titleS);
    }
    var obsS = [titleS], spyNow = null;
    if (lastIn && Q.spy[last] != null) {
      var sx = X(last), sy = Ys(Q.spy[last]), rS = narrow ? 3.5 : 4;
      el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: rS, fill: open ? C.fear : '#F3EEFF', stroke: '#fff', 'stroke-width': 1.2 }, gS);
      spyNow = { x: sx, y: sy, r: rS }; var nowBoxS = dotBox(sx, sy, rS + 1); snap.push({ x: sx, y: sy, dn: last });

      var pl = (pp === 'BASKET' ? '' : '$') + Q.spy[last].toFixed(2), pfs = 12, pwid = textW(pl, pfs, 700), right = sx - rS - 6, best = null;
      [sy - 8, sy + pfs + 7, 15, spyH - 7].forEach(function (base) {
        var box = { x: right - pwid - 2, y: base - pfs, w: pwid + 4, h: pfs + 3 };
        if (box.y < 2 || box.y + box.h > spyH - 1 || box.x < L + 2 || overlaps(box, titleS)) return;
        var hitsN = 0;
        for (var j = Math.max(a, Math.floor(X.inv(box.x)) - 1); j <= Math.min(last, Math.ceil(X.inv(box.x + box.w)) + 1); j++) {
          if (Q.spy[j] == null) continue;
          var py = Ys(Q.spy[j]); if (py >= box.y - 2 && py <= box.y + box.h + 2) hitsN++;
        }
        var dotGap = Math.hypot(Math.max(box.x - sx, 0, sx - (box.x + box.w)), Math.max(box.y - sy, 0, sy - (box.y + box.h)));
        if (dotGap < rS + 2) return;
        pkIn.forEach(function (j) {
          if (Q.spy[j] == null) return;
          if (overlaps(box, dotBox(X(j), Ys(Q.spy[j]), rPk + 1))) hitsN += 6;
        });
        if (!best || hitsN < best.h) best = { base: base, h: hitsN, box: box };
      });
      if (best) {
        tx(gS, right, best.base, pl, withHalo({ fill: C.white, 'font-size': pfs, 'font-weight': 700, 'text-anchor': 'end' }));
        obsS.push(best.box);
      }
    }
    var dotObsS = obsS.slice();
    if (spyNow) obsS.push(nowBoxS);


    var gF = el('g', {}, svg);
    panelRect(gF, L, fTop, pw, fH);
    var vmax = 0;
    for (i = vi0; i <= vi1; i++) vmax = Math.max(vmax, T.v[i]);
    var flipIn = Q.flip != null && Q.flip <= Math.max(vmax * 1.15, st.alarm * 1.5, 10) * 2.2;
    var target = Math.max(10, vmax * 1.15, st.alarm * 1.5, flipIn ? Q.flip * 1.12 : 0);

    var fStep = tickStep(target, fH - 16, narrow ? 22 : 28);
    if (target / fStep < 2) fStep = tickStep(target, fH - 16, 15);
    var ax = { top: target, ticks: [] }, Yf = lin(0, target, fTop + fH, fTop + 16);
    for (var tv = 0; tv <= target + 1e-9; tv += fStep) ax.ticks.push(Math.round(tv * 1000) / 1000);
    var tagY = Q.flip != null ? (flipIn ? Yf(Q.flip) : fTop + 8) : null;
    kGridY(gF, Yf, ax.ticks.filter(function (t) { return Yf(t) > fTop + 6 && t > 0; }), L, pw);
    grid(gF, fTop, fH); shade(gF, fTop, fH);
    var clipF = clipFor(svg, L, fTop, pw, fH), bw = Math.max(1, ppc * 0.8), base0 = Yf(0);
    var gb = el('g', { 'clip-path': clipF }, gF);
    var bLast = Math.min(b, cut);
    if (ppc >= 2) {
      var dB = '';
      for (i = a; i <= bLast; i++) { var top0 = Yf(T.v[i]); dB += 'M' + (X(i) - bw / 2).toFixed(1) + ' ' + base0.toFixed(1) + 'V' + top0.toFixed(1) + 'h' + bw.toFixed(1) + 'V' + base0.toFixed(1) + 'Z'; }
      if (dB) el('path', { d: dB, fill: C.fear, 'fill-opacity': 0.62 }, gb);
    } else {
      var cols = {}, dC = '';
      for (i = a; i <= bLast; i++) { var cx = Math.floor(X(i)); if (!(cx in cols) || T.v[i] > cols[cx]) cols[cx] = T.v[i]; }
      Object.keys(cols).forEach(function (cx) { dC += 'M' + cx + ' ' + base0.toFixed(1) + 'V' + Yf(cols[cx]).toFixed(1) + 'h1V' + base0.toFixed(1) + 'Z'; });
      if (dC) el('path', { d: dC, fill: C.fear, 'fill-opacity': 0.62 }, gb);
    }
    if (open && b >= last) {
      var gx = X(last) - Math.max(bw, 3) / 2, gwid = Math.max(bw, 3), gy = Yf(T.v[last]);
      el('rect', { x: gx.toFixed(1), y: gy.toFixed(1), width: gwid.toFixed(1), height: Math.max(0.5, base0 - gy).toFixed(1), fill: C.light, 'fill-opacity': 0.35,
        stroke: C.light, 'stroke-width': 1.1, 'stroke-dasharray': '2 1.5' }, gb);
    }

    function barHit(bx) {
      var hw = Math.max(bw, 3) / 2 + 1, j0 = Math.max(a, Math.floor(X.inv(bx.x - hw))), j1 = Math.min(b, Math.ceil(X.inv(bx.x + bx.w + hw)));
      for (var j = j0; j <= j1; j++) { var xj = X(j); if (xj + hw < bx.x || xj - hw > bx.x + bx.w) continue; if (Yf(T.v[j]) < bx.y + bx.h + 1) return true; }
      return false;
    }
    var flipTxt = kFlipText(k, Q);
    TXREC = [];
    var plG = el('g', {}, gF);
    var titleF = paneTitle(gF, L + 7, fTop + 13, 'FEAR %', flipTxt, KC.yel);

    var ay = Yf(st.alarm), alab = alarmWords(k), aw = textW(alab, 11) + 6;
    el('line', { x1: L, x2: L + pw, y1: ay, y2: ay, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '4 3' }, gF);


    var plF = pctLines(plG, k, Yf, L, pw, fTop, fTop + fH, fTop + 2);
    if (Q.flip != null && flipIn) plF.ys.push(tagY);
    var plCross = function (bx) { return plF.lines.some(function (ln) { return ln.y > bx.y - 1.5 && ln.y < bx.y + bx.h + 1.5; }); };
    var abox = { x: L + 6, y: ay - 16, w: aw, h: 14 }, obsF = [titleF];
    if (overlaps(abox, titleF) || abox.y < fTop + 2 || (plCross(abox) && ay + 16 <= fTop + fH - 1 && !plCross({ x: abox.x, y: ay + 2, w: aw, h: 14 }))) abox.y = ay + 2;
    var aShow = abox.y + abox.h <= fTop + fH - 1, gAl = el('g', {}, gF);
    if (aShow) obsF.push(abox);



    var gFl = el('g', {}, gF), gFd = el('g', {}, gF), cands = [], dotObs = [];
    pkIn.forEach(function (j) {
      var x = X(j); if (x < L + rPk + 0.5 || x > L + pw - rPk - 0.5) return;
      cands.push({ j: j, v: T.v[j], x: x, y: Math.max(fTop + rPk + 1.5, Yf(T.v[j])) });
    });
    cands.sort(function (p, q) { return q.v - p.v; });
    var edgeCut = pkIn.filter(function (j) { var x = X(j); return x < L + rPk + 0.5 || x > L + pw - rPk - 0.5; });
    var keptF = thinDots(cands, rPk, obsF), spyPk = [], spyUnder = [], spyHidden = [], spyKept = [];
    keptF.forEach(function (d) {
      peakDot(gFd, d.x, d.y, rPk); obsF.push(dotBox(d.x, d.y, rPk)); dotObs.push(dotBox(d.x, d.y, rPk)); snap.push({ x: d.x, y: d.y, dn: d.j });
      if (Q.spy[d.j] == null) { spyHidden.push(d.j); return; }
      var y2 = Ys(Q.spy[d.j]), bx = dotBox(d.x, y2, rPk);
      if (spyNow && Math.hypot(d.x - spyNow.x, y2 - spyNow.y) < spyNow.r + rPk + 0.5) spyUnder.push(d.j);
      if (dotObsS.some(function (o) { return overlaps(o, bx); }) || spyKept.some(function (o) { return Math.hypot(o.x - d.x, o.y - y2) < 2 * rPk + 0.5; })) { spyHidden.push(d.j); return; }
      spyKept.push({ x: d.x, y: y2, j: d.j });
    });
    spyKept.forEach(function (d) { peakDot(gSd, d.x, d.y, rPk); obsS.push(dotBox(d.x, d.y, rPk)); snap.push({ x: d.x, y: d.y, dn: d.j }); spyPk.push(d.j); });



    if (Q.flip != null) {
      if (flipIn) el('line', { x1: L, x2: L + pw, y1: tagY.toFixed(1), y2: tagY.toFixed(1), stroke: KC.yel, 'stroke-width': 1.3, 'stroke-dasharray': '5 3', 'stroke-opacity': 0.95 }, gFl);
      var tagT = (flipIn ? '' : '↑') + Q.flip.toFixed(1), tw = textW(tagT, 11, 700) + 8;
      var tagR = { x: L + pw - tw - 1, y: tagY - 7.5, w: tw, h: 15 }, tagLft = { x: L + 1, y: tagY - 7.5, w: tw, h: 15 };
      var onObs = function (bx) { return obsF.some(function (o) { return overlaps(o, bx); }); };
      var onDot = function (bx) { return dotObs.some(function (o) { return overlaps(o, bx); }); };
      var tagB = !barHit(tagR) && !onObs(tagR) ? tagR : !onDot(tagLft) && !overlaps(tagLft, titleF) ? tagLft : tagR;

      if (aShow && tagB === tagLft && overlaps(abox, tagB)) {
        var aAlt = ay - 16 < fTop + 2 || overlaps({ x: abox.x, y: ay - 16, w: aw, h: 14 }, titleF) ? null : ay - 16, aY2 = abox.y === ay + 2 ? aAlt : ay + 2;
        var spots = function (w0) {
          return [{ x: tagB.x + tw + 4, y: abox.y }, { x: abox.x, y: aY2 }, { x: tagB.x + tw + 4, y: aY2 }].filter(function (q) { return q.y != null; })
            .map(function (q) { return { x: q.x, y: q.y, w: w0, h: 14 }; })
            .filter(function (q) { return q.y >= fTop + 2 && q.y + q.h <= fTop + fH - 1 && !overlaps(q, titleF) && !overlaps(q, tagB) && !onDot(q); })
            .sort(function (p, q) { return plCross(p) - plCross(q); });
        };
        var aC = spots(aw);
        if (!aC.length && alarmMerged(k)) {
          alab = alarmWords(k).replace(' ≈ 90th', ''); aw = textW(alab, 11) + 6; aC = spots(aw);
        }
        if (aC.length) { abox.x = aC[0].x; abox.y = aC[0].y; abox.w = aw; } else aShow = false;
      }
      var gTag = el('g', {}, gF);
      el('rect', { x: tagB.x.toFixed(1), y: tagB.y.toFixed(1), width: tw.toFixed(1), height: 15, rx: 2, fill: KC.yel }, gTag);
      tx(gTag, tagB.x + tw / 2, tagY + 3.8, tagT, { fill: C.bg, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
      tagB.full = true; obsF.push(tagB);
    }
    if (!aShow) obsF = obsF.filter(function (o) { return o !== abox; });
    if (aShow) {
      el('rect', { x: abox.x, y: abox.y, width: abox.w, height: abox.h, fill: C.panel, 'fill-opacity': 0.85 }, gAl);
      tx(gAl, abox.x + 3, abox.y + 11, alab, { fill: C.text, 'font-size': 11 });
    }


    var rX = open && lastIn && col.w <= 16 && col.x - 1 < L + pw - 2 ? col.x - 1 : null;
    var labS = kInsideLabels(gS, pt.ticks.map(function (t) { return { y: Ys(t), s: t.toFixed(pt.dec) }; }), L, pw, obsS, kLineHit(X, Ys, Q.spy, a, b, 2), 0, spyH, false, rX);
    var labF = kInsideLabels(gF, ax.ticks.filter(function (t) { return t > 0; }).map(function (t) { return { y: Yf(t), s: String(t) }; }), L, pw, obsF, barHit, fTop, fTop + fH, true, rX);

    var plObsF = obsF.concat(labF.map(function (o) { return { x: o.x, y: o.y, w: o.w, h: o.h }; }));
    if (open && lastIn) plObsF.push({ x: col.x - 1, y: fTop, w: col.w + 2, h: fH });
    var plPlaced = pctLabels(el('g', {}, gF), plF, L, pw, fTop, fTop + fH, plObsF, barHit, 'k' + k);
    pctDraw(plF, TXREC); TXREC = null;


    var KP = kdjPane(svg, { Q: Q, X: X, a: a, b: b, last: last, cut: cut, open: open, lastIn: lastIn, L: L, pw: pw, top: kTop, h: kH,
      narrow: narrow, ppc: ppc, ticks: ticks, col: col, snap: snap, title: 'KDJ OF FEAR', rX: rX }), Yk = KP.Y;


    ticks.forEach(function (t) {
      el('line', { x1: t.x, x2: t.x, y1: H - 18, y2: H - 14, stroke: C.muted, 'stroke-width': 1 }, svg);
      tx(svg, t.x, H - 4, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    });


    var cross = crossLayer(svg);
    function set(ix) {
      clear(cross);
      var j = ix == null ? last : Math.max(0, Math.min(last, Math.round(ix)));
      if (ix != null && j >= v.x0 && j <= v.x1) {
        var px = X(j);
        el('line', { x1: px, x2: px, y1: 0, y2: kTop + kH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (Q.spy[j] != null) el('circle', { cx: px, cy: Ys(Q.spy[j]), r: 3.2, fill: C.text, stroke: C.bg, 'stroke-width': 1.4 }, cross);
        el('circle', { cx: px, cy: Math.max(fTop + 3, Yf(T.v[j])), r: 3.6, fill: C.light, stroke: '#fff', 'stroke-width': 1.1 }, cross);
        [['K', KC.k], ['D', KC.d]].forEach(function (s) {
          el('circle', { cx: px, cy: Math.max(kTop + 3, Math.min(kTop + kH - 3, Yk(Q[s[0]][j]))), r: 3.2, fill: s[1], stroke: C.bg, 'stroke-width': 1.2 }, cross);
        });
      }
      kReadout(k, j, ix != null);
    }
    GEO['k' + k] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    if (hover['k' + k] != null && (hover['k' + k] < v.x0 - 0.5 || hover['k' + k] > v.x1 + 0.5)) hover['k' + k] = null;
    set(hover['k' + k]);

    var lim = kLimits(k), s = v.x1 - v.x0;
    B.btns.forEach(function (bt) {
      var z = bt.getAttribute('data-kz');
      bt.disabled = z === 'reset' ? !v.custom : z === 'in' ? s <= lim.min + 0.5 : s >= lim.max - 1e-6;
    });
    var ww = kWinWords(k); if (B.win.textContent !== ww) B.win.textContent = ww;
  }
  function kReadout(k, j, picked) {
    var B = KB[k], Q = D.kdj[k], T = D.tf[k], ro = B.ro, isLast = j === Q.n - 1;
    clear(ro);
    ro.appendChild(span('d', kRangeLabel(k, T, j, true) + (isLast && Q.open ? ' (so far)' : '')));
    ro.appendChild(span('', ' · fear '));
    ro.appendChild(span('p', isLast ? pct1(doc.stats[k].latest) : pct1(T.v[j])));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('pc', pctWord(pctCandle(k, j).s13)));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('kk', 'K ' + f0(Q.K[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kd', 'D ' + f0(Q.D[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kj', 'J ' + f0(Q.J[j])));
    ro.appendChild(span('', ' · ' + PX.name + ' ' + (Q.spy[j] == null ? '–' : Q.spy[j].toFixed(2))));
    var c = Q.cross[j];
    if (Q.peak[j]) ro.appendChild(span('pk', ' · fear peak'));
    if (c) ro.appendChild(span(c === 'up' ? 'down' : 'up', ' · ' + (c === 'up' ? '▲ K crossed above D' : '▼ K crossed below D') + (isLast && Q.open ? ' (if it closed now)' : '')));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' for any ' + K_UNIT[k][0]));
  }


  function requestKdj(k) {
    if (k === 'all') TFS.forEach(function (t) { kPending[t] = 1; }); else if (k === 'vall') VKS.forEach(function (t) { kPending[t] = 1; });
    else if (k === 'sall' || k === 'ball') VOLKS[k.charAt(0)].forEach(function (t) { kPending[t] = 1; });
    else if (k === 'pall') SPKS.forEach(function (t) { kPending[t] = 1; }); else kPending[k] = 1;
    if (kRaf) return;
    kRaf = true;
    requestAnimationFrame(function () { kRaf = false; drawKdjPending(); });
  }
  function drawKdjPending() {
    if (!doc || !D || !D.kdj) return;
    var todo = Object.keys(kPending); kPending = {};
    var kk = todo.filter(function (k) { return kKind(k) === 'f'; }), vk = todo.filter(isVk);
    try { kk.forEach(drawKdj); $('kdjErr').hidden = true; renderKChips(); }
    catch (e) { var er = $('kdjErr'); er.hidden = false; errWords(e); er.textContent = 'The KDJ section could not be drawn.'; }
    if (vk.length && VK.q && !$('vs').hidden) {
      try { vk.forEach(drawVk); $('vkErr').hidden = true; renderVkChips(); }
      catch (e) { var ev = $('vkErr'); ev.hidden = false; errWords(e); ev.textContent = 'The candle-size blocks could not be drawn.'; }
    }
    VOL_CARDS.forEach(function (c) {
      var ks = todo.filter(function (k) { return k.charAt(0) === c; }), p = VC[c].p;
      if (!ks.length || !VOLQ[c] || $(p).hidden) return;
      try { ks.forEach(drawVolK); $(p + 'KErr').hidden = true; renderVolKChips(c); }
      catch (e) { var eb = $(p + 'KErr'); eb.hidden = false; errWords(e); eb.textContent = 'The ' + (c === 's' ? 'selling' : 'buying') + '-volume KDJ blocks could not be drawn.'; }
    });
    var pk = todo.filter(function (k) { return kKind(k) === 'p'; });
    if (pk.length && SPQ && !$('speed').hidden) {
      try { pk.forEach(drawSpeed); $('speedPErr').hidden = true; }
      catch (e) { var ep = $('speedPErr'); ep.hidden = false; errWords(e); ep.textContent = 'The picking-up-or-slowing-down panels could not be drawn.'; }
    }
  }
  function initKdjBlocks() {
    TFS.forEach(function (k) {
      var root = document.querySelector('.kblock[data-k="' + k + '"]');
      KB[k] = { root: root, val: root.querySelector('[data-kv]'), note: root.querySelector('[data-kn]'), ro: root.querySelector('[data-kro]'),
        win: root.querySelector('[data-kw]'), chart: root.querySelector('[data-kc]'), btns: Array.prototype.slice.call(root.querySelectorAll('[data-kz]')) };
      KB[k].btns.forEach(function (bt) { bt.addEventListener('click', function () { kCmd(k, bt.getAttribute('data-kz')); }); });
      attachGestures(KB[k].chart, 'k' + k, kCtl(k));
    });
  }











  var VKS = ['v1D', 'v1W', 'v2W', 'v1M'];
  var VK = { q: null, g: null, full: null, rf: null, since: '', lines: null };
  var VK_GREY = '#5D606B';
  var VK_WHEN = { '1D': ['today’s close', 'the next close'], '1W': ['this week’s close', 'next week’s close'],
    '2W': ['this 2-week close', 'the next 2-week close'], '1M': ['this month’s close', 'next month’s close'] };
  function vkNorm(s) { var u = String(s || '').trim().toLowerCase(); return VS3.indexOf(u) >= 0 ? u : null; }
  var urlVk = vkNorm(params.get('vk'));
  var pickedVk = vkNorm(stored('aisfVsK'));
  var vkChip = 'Auto';
  function vkAvail(g) { return !!(full && full.compare && full.compare[g] && full.compare[g].tf); }
  function vkGroup() {
    var want = urlVk || pickedVk || (VS3.indexOf(grp) >= 0 ? grp : 'semis');
    if (vkAvail(want)) return want;
    return vkAvail('semis') ? 'semis' : VS3.filter(vkAvail)[0] || null;
  }
  function sgn1(x) { var t = Math.abs(x).toFixed(1); return (+t === 0 ? '' : x > 0 ? '+' : '−') + t; }

  function vkLines(k) {
    if (!VK.lines || VK.lines.full !== full || VK.lines.rf !== RF) VK.lines = { full: full, rf: RF };
    if (VK.lines[k]) return VK.lines[k];
    var o = {};
    VS3.forEach(function (g) {
      var G = full.groups[g]; if (!G) return;
      var s = k === '1D' ? G.daily.d : G.tf[k].s, v = k === '1D' ? G.daily.v : G.tf[k].v, m = {};
      for (var i = 0; i < s.length; i++) if (typeof v[i] === 'number') m[dayNum(s[i])] = v[i] / 10;
      o[g] = m;
    });
    var R = RF && RF.tf[k], ms = {};
    if (R) for (var j = 0; j < R.s.length; j++) if (R.v[j] != null) ms[R.s[j]] = R.v[j];
    o.sp = ms;
    return (VK.lines[k] = o);
  }
  function prepVk() {
    var g = vkGroup();
    if (!g || !RF) return null;
    if (VK.q && VK.g === g && VK.full === full && VK.rf === RF) return VK.q;
    var c = full.compare[g].tf, q = {}, t10 = function (x) { return x / 10; };
    for (var ti = 0; ti < TFS.length; ti++) {
      var k = TFS[ti], x = c[k];
      if (!x || !arr(x.s) || !x.s.length) return null;
      var n = x.s.length;
      if (!arr(x.e, n) || !arr(x.gap, n) || !arr(x.K, n) || !arr(x.D, n) || !arr(x.J, n) || !arr(x.xu) || !arr(x.xd) || !x.last) return null;
      var idx = new Array(n);
      for (var j = 0; j < n; j++) idx[j] = j;
      var Q = { s: x.s.map(dayNum), e: x.e.map(dayNum), gap: x.gap.map(t10), K: x.K.map(t10), D: x.D.map(t10), J: x.J.map(t10), n: n, idx: idx,
        open: !!x.op, cross: {}, rising: !!x.up, flip: typeof x.fl === 'number' && isFinite(x.fl) ? x.fl : null, missing: !!x.sp_missing_latest,
        first: x.first || 0, last: x.last, pending: x.pending || null, lines: {}, sp: null };
      x.xu.forEach(function (i) { Q.cross[i] = 'up'; });
      x.xd.forEach(function (i) { Q.cross[i] = 'down'; });
      var LN = vkLines(k);
      VS3.forEach(function (g2) { var m = LN[g2]; Q.lines[g2] = m ? Q.s.map(function (dn) { return dn in m ? m[dn] : null; }) : null; });
      Q.sp = Q.s.map(function (dn) { return dn in LN.sp ? LN.sp[dn] : null; });
      q[k] = Q;
    }
    VK.q = q; VK.g = g; VK.full = full; VK.rf = RF;
    var G = full.groups[g] && full.groups[g].group;
    VK.since = G && G.bases && G.bases.r13 ? G.bases.r13.word : 'since 2013';
    return q;
  }

  function prepVkBlocks() {
    var prevN = {}, prevS = {};
    VKS.forEach(function (k) { prevN[k] = KN[k]; prevS[k] = VK.q ? VK.q[k.slice(1)].s : null; });
    var q = null;
    try { q = full ? prepVk() : null; } catch (e) { errWords(e); q = null; }
    if (!q) { VK.q = null; return; }
    VKS.forEach(function (k) { KN[k] = q[k.slice(1)].n; });
    kdjAfterLoad(VKS, prevN, prevS);
  }
  function vkWhen(tf, Q) {
    if (Q.open) return VK_WHEN[tf][0];
    if (Q.missing && Q.pending) return tf === '1D' ? 'the ' + fmtDay(dayNum(Q.pending.e), false) + ' close' : VK_WHEN[tf][0];
    return VK_WHEN[tf][1];
  }
  function renderVkText() {
    var box = $('vsk');
    box.hidden = !VK.q;
    if (!VK.q) return;
    var g = VK.g, name = groupWords(g).short;
    TFS.forEach(function (tf) {
      var k = 'v' + tf, B = KB[k], Q = VK.q[tf], n = Q.n, L0 = Q.last;
      clear(B.val);
      var nm = span('vb-g', name + ' '); nm.style.color = VS_COL[g]; B.val.appendChild(nm);
      B.val.appendChild(span('', pct1(L0.g) + ' vs S&P ' + pct1(L0.sp) + ' → gap '));
      B.val.appendChild(span('vb-gap', sgn1(L0.gap)));
      B.val.appendChild(span('', (Q.open ? ' (so far)' : '') + ' · KDJ of the gap '));
      B.val.appendChild(span('kk', 'K ' + f0(Q.K[n - 1])));
      B.val.appendChild(span('', ' '));
      B.val.appendChild(span('kd', 'D ' + f0(Q.D[n - 1])));
      B.val.appendChild(span('', ' '));
      B.val.appendChild(span('kj', 'J ' + f0(Q.J[n - 1])));
      B.val.appendChild(span('', ' · '));
      B.val.appendChild(span(Q.rising ? 'vb-up' : 'vb-dn', Q.rising ? 'widening' : 'narrowing'));
      if (Q.flip != null) {
        B.val.appendChild(span('', ' · flips if ' + vkWhen(tf, Q) + ' gap ends ' + (Q.rising ? 'below ' : 'above ')));
        B.val.appendChild(span('vb-fl', sgn1(Q.flip)));
      }
      B.val.classList.toggle('ghost', Q.open);
      var pend = Q.pending ? { s: [dayNum(Q.pending.s)], e: [dayNum(Q.pending.e)] } : null;


      var pnd = pend ? ' (' + kRangeLabel(tf, pend, 0, true) + ')' : '', spE = Q.pending && typeof Q.pending.sp_e === 'string' ? Q.pending.sp_e : null;
      var ahead = !!(spE && Q.pending.e && spE > Q.pending.e);
      B.note.textContent = 'Latest ' + K_UNIT[tf][0] + ': ' + kRangeLabel(tf, Q, n - 1, true) + (Q.open ? ' (so far, as if it closed now)' : '') +
        (!Q.missing ? '' : ahead ? ' · the S&P 500 is already on ' + fmtDay(dayNum(spE), false, true) + ', so this candle' + pnd + ' waits for this board’s next update'
          : ' · S&P not updated for this candle yet' + pnd);
    });
    if (FS.key && isVk(FS.key.slice(1))) $('fsKicker').textContent = fsParts(FS.key).kicker;
    renderVkChips();
  }
  function renderVkChips() {
    var box = $('vkGroups'); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('[data-vk]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-vk') === VK.g)); });
    var fk = FS.key && FS.key.charAt(0) === 'k' && isVk(FS.key.slice(1)) ? FS.key.slice(1) : null;
    var custom = fk ? !!(KV[fk] && KV[fk].custom) : VKS.some(function (k) { return KV[k] && KV[k].custom; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-vkrange]'), function (b) {
      var mine = b.getAttribute('data-vkrange') === vkChip;
      setAttr(b, 'aria-pressed', String(mine && !(custom && VK.q)));
      b.classList.toggle('base', mine && custom && !!VK.q);
    });
  }
  function chooseVk(g) {
    if (VS3.indexOf(g) < 0 || !vkAvail(g)) return;
    pickedVk = g; urlVk = null; store('aisfVsK', g);
    try { var u = new URL(location.href); if (u.searchParams.has('vk')) { u.searchParams.delete('vk'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } } catch (e) { }
    if (g === VK.g) { renderVkChips(); return; }
    VKS.forEach(function (k) { hover['k' + k] = null; });
    prepVkBlocks();
    try { renderVkText(); } catch (e) { errWords(e); }
    requestKdj('vall'); drawKdjPending();
  }
  function chooseVkRange(chip) {
    vkChip = chip;
    store('aisfVsKRange', chip);
    if (VK.q) VKS.forEach(function (k) { KV[k] = kDefault(k); hover['k' + k] = null; });
    renderVkChips();
    if (VK.q) requestKdj('vall');
  }


  function vkSeries(g, X, Y, idx, vals, a, b, cut, last, steps, color, w, op, clip, attrs) {
    var d = '', x0 = null, x1 = null, i;
    if (steps) {
      var pen = false;
      for (i = a; i <= Math.min(b, cut); i++) {
        if (vals[i] == null) { pen = false; continue; }
        var y = Y(vals[i]).toFixed(1), xa = X(i - 0.5), xb = X(i + 0.5);
        d += (pen ? 'L' : 'M') + xa.toFixed(1) + ' ' + y + 'L' + xb.toFixed(1) + ' ' + y; pen = true;
        if (x0 == null) x0 = xa; x1 = xb;
      }
    } else {
      var P = decimate(idx, vals, a, Math.min(b, cut), X);
      d = pathOf(P, Y);
      if (P.px.length) { x0 = P.px[0]; x1 = P.px[P.px.length - 1]; }
    }
    if (d) {
      var at = { d: d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-opacity': op, 'stroke-linejoin': 'round', 'clip-path': clip };
      for (var key in attrs || {}) at[key] = attrs[key];
      el('path', at, g);
    }
    if (cut < last && b >= last && cut >= 0 && vals[cut] != null && vals[last] != null) {
      var od = steps ? 'M' + X(cut + 0.5).toFixed(1) + ' ' + Y(vals[cut]).toFixed(1) + 'V' + Y(vals[last]).toFixed(1) + 'H' + X(last).toFixed(1)
        : 'M' + X(cut).toFixed(1) + ' ' + Y(vals[cut]).toFixed(1) + 'L' + X(last).toFixed(1) + ' ' + Y(vals[last]).toFixed(1);
      el('path', { d: od, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-opacity': op, 'stroke-dasharray': '1.6 2.2', 'stroke-linecap': 'round', 'clip-path': clip }, g);
    }
    return { d: d, x0: x0, x1: x1 };
  }
  function drawVk(k) {
    var tf = kTf(k), B = KB[k], Q = VK.q[tf], v = KV[k], n = Q.n, last = n - 1, g = VK.g, gc = VS_COL[g];
    var W = Math.max(300, Math.round(B.chart.clientWidth)), narrow = W < 640, L = 1, pw = W - 2;
    var lH = narrow ? Math.max(150, Math.min(190, Math.round(W * 0.46))) : 210, gp = narrow ? 8 : 10, hH = narrow ? 100 : 128, kH = narrow ? 132 : 172;
    var hFs = fsHeight(B.chart);
    if (hFs) {
      var av = hFs - 20 - 2 * gp;
      lH = Math.round(av * 0.40); hH = Math.round(av * 0.25); kH = av - lH - hH;
    }
    var hTop = lH + gp, kTop = hTop + hH + gp, H = kTop + kH + 20;
    var X = lin(v.x0, v.x1, L, L + pw), ppc = pw / (v.x1 - v.x0);
    var svg = svgFor(B.chart, W, H);
    var a = Math.max(0, Math.floor(v.x0)), b = Math.min(last, Math.ceil(v.x1));
    var vi0 = Math.max(0, Math.ceil(v.x0 - 0.4)), vi1 = Math.min(last, Math.floor(v.x1 + 0.4));
    var open = Q.open, lastIn = last >= v.x0 && X(last) <= L + pw + 0.5, cut = open ? last - 1 : last;
    var ticks = kTicks(Q, a, b, X, 11, 0, L + pw, K_TICK0[tf]);
    var col = { x: X(last - 0.5), w: ppc }, sh = { open: open, lastIn: lastIn, col: col, L: L, pw: pw };
    var steps = tf !== '1D' && ppc >= 1.5, snap = [], i;

    var aL = steps ? Math.max(a, Math.floor(v.x0 - 0.5) + 1) : a;
    var rX = open && lastIn && col.w <= 16 && col.x - 1 < L + pw - 2 ? col.x - 1 : null;
    var gs = VS3.filter(function (x) { return Q.lines[x]; });


    var gL = el('g', {}, svg);
    panelRect(gL, L, 0, pw, lH);
    var vmax = 0;
    for (i = vi0; i <= vi1; i++) {
      if (Q.sp[i] != null) vmax = Math.max(vmax, Q.sp[i]);
      for (var gi = 0; gi < gs.length; gi++) { var yv = Q.lines[gs[gi]][i]; if (yv != null) vmax = Math.max(vmax, yv); }
    }
    var top = Math.max(10, vmax * 1.12), lStep = tickStep(top, lH - 24, narrow ? 24 : 30);
    if (top / lStep < 2) lStep = tickStep(top, lH - 24, 15);
    var Yl = lin(0, top, lH, 22), lt = [];
    for (var tv = lStep; tv <= top + 1e-9; tv += lStep) lt.push(Math.round(tv * 1000) / 1000);
    kGridY(gL, Yl, lt, L, pw); kGridX(gL, ticks, 0, lH); kShade(gL, sh, 0, lH);
    var clipL = clipFor(svg, L, 0, pw, lH), lw = ppc < 1 ? 1 : ppc < 2.5 ? 1.3 : narrow ? 1.5 : 1.7;
    var gA = el('g', {}, gL);
    var SP = vkSeries(gL, X, Yl, Q.idx, Q.sp, aL, b, cut, last, steps, C.fear, 1, 0.95, clipL);
    if (SP.d) el('path', { d: SP.d + 'L' + SP.x1.toFixed(1) + ' ' + lH + 'L' + SP.x0.toFixed(1) + ' ' + lH + 'Z', fill: C.fear, 'fill-opacity': 0.38, stroke: 'none', 'clip-path': clipL, 'data-vsp': '1' }, gA);
    gs.filter(function (x) { return x !== g; }).concat(gs.indexOf(g) >= 0 ? [g] : []).forEach(function (x) {
      vkSeries(gL, X, Yl, Q.idx, Q.lines[x], aL, b, cut, last, steps, VS_COL[x], x === g ? lw + 0.7 : lw, x === g ? 1 : 0.8, clipL, { 'data-vg': x });
    });
    var titleL = paneTitle(gL, L + 7, 14, '% OF STOCKS SCARED'), obsL = [titleL];

    if (lastIn) {
      var rD = narrow ? 3.2 : 3.8, dots = [];
      if (Q.sp[last] != null) dots.push([C.fear, Q.sp[last], 'sp']);
      gs.filter(function (x) { return x !== g; }).concat([g]).forEach(function (x) { if (Q.lines[x] && Q.lines[x][last] != null) dots.push([VS_COL[x], Q.lines[x][last], x]); });
      dots.forEach(function (d) {
        var cx = X(last), cy = Yl(d[1]), r = d[2] === g ? rD + 0.6 : rD;
        el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r, fill: open ? C.bg : d[0], stroke: open ? d[0] : C.bg, 'stroke-width': open ? 1.6 : 1.1 }, gL);
        snap.push({ x: cx, y: cy, dn: last }); obsL.push(dotBox(cx, cy, r + 1));
      });
    }
    kInsideLabels(gL, lt.map(function (t) { return { y: Yl(t), s: String(t) }; }), L, pw, obsL,
      anyHit(gs.map(function (x) { return kLineHit(X, Yl, Q.lines[x], a, b, 2); }).concat([kLineHit(X, Yl, Q.sp, a, b, 2)])), 0, lH, false, rX);


    var gH = el('g', {}, svg);
    panelRect(gH, L, hTop, pw, hH);
    var glo = -5, ghi = GAP_LINE + 3;
    for (i = vi0; i <= vi1; i++) { glo = Math.min(glo, Q.gap[i]); ghi = Math.max(ghi, Q.gap[i]); }
    var span0 = ghi - glo, flipIn = Q.flip != null && Q.flip >= glo - span0 * 1.2 && Q.flip <= ghi + span0 * 1.2;
    if (flipIn) { glo = Math.min(glo, Q.flip); ghi = Math.max(ghi, Q.flip); }
    var gpad = (ghi - glo) * 0.08, Yh = lin(glo - gpad, ghi + gpad, hTop + hH - 3, hTop + 20);
    var hStep = niceStep(ghi - glo, narrow ? 3 : 4), ht = [];
    while (Math.abs(Yh(0) - Yh(hStep)) < 17) hStep *= 2;
    for (var hv = Math.ceil((glo - gpad) / hStep) * hStep; hv <= ghi + gpad + 1e-9; hv += hStep) ht.push(Math.round(hv * 1000) / 1000);
    ht = ht.filter(function (t) { return Yh(t) > hTop + 8 && Yh(t) < hTop + hH - 4; });
    kGridY(gH, Yh, ht.filter(function (t) { return t !== 0; }), L, pw); kGridX(gH, ticks, hTop, hH); kShade(gH, sh, hTop, hH);
    var clipH = clipFor(svg, L, hTop, pw, hH), bw = Math.max(1, ppc * 0.75), z0 = Yh(0), bLast = Math.min(b, cut);
    var gb = el('g', { 'clip-path': clipH }, gH), dP = '', dN = '';
    if (ppc >= 2) {
      for (i = a; i <= bLast; i++) {
        var seg = 'M' + (X(i) - bw / 2).toFixed(1) + ' ' + z0.toFixed(1) + 'V' + Yh(Q.gap[i]).toFixed(1) + 'h' + bw.toFixed(1) + 'V' + z0.toFixed(1) + 'Z';
        if (Q.gap[i] >= 0) dP += seg; else dN += seg;
      }
    } else {
      var cP = {}, cN = {};
      for (i = a; i <= bLast; i++) {
        var cx = Math.floor(X(i)), gv = Q.gap[i];
        if (gv >= 0) { if (!(cx in cP) || gv > cP[cx]) cP[cx] = gv; } else if (!(cx in cN) || gv < cN[cx]) cN[cx] = gv;
      }
      Object.keys(cP).forEach(function (c) { dP += 'M' + c + ' ' + z0.toFixed(1) + 'V' + Yh(cP[c]).toFixed(1) + 'h1V' + z0.toFixed(1) + 'Z'; });
      Object.keys(cN).forEach(function (c) { dN += 'M' + c + ' ' + z0.toFixed(1) + 'V' + Yh(cN[c]).toFixed(1) + 'h1V' + z0.toFixed(1) + 'Z'; });
    }
    if (dP) el('path', { d: dP, fill: gc, 'fill-opacity': 0.88, 'data-vbar': 'up' }, gb);
    if (dN) el('path', { d: dN, fill: VK_GREY, 'fill-opacity': 0.95, 'data-vbar': 'down' }, gb);
    if (open && b >= last) {
      var gwid = Math.max(bw, 3), gx = X(last) - gwid / 2, gy = Yh(Q.gap[last]), pos = Q.gap[last] >= 0;
      el('rect', { x: gx.toFixed(1), y: Math.min(gy, z0).toFixed(1), width: gwid.toFixed(1), height: Math.max(0.5, Math.abs(z0 - gy)).toFixed(1),
        fill: pos ? gc : VK_GREY, 'fill-opacity': 0.12, stroke: pos ? gc : C.muted, 'stroke-width': 1.2, 'stroke-dasharray': '2 1.5', 'data-vbar': 'open' }, gb);
    }
    if (lastIn) snap.push({ x: X(last), y: Yh(Q.gap[last]), dn: last });
    el('line', { x1: L, x2: L + pw, y1: z0.toFixed(1), y2: z0.toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.9 }, gH);
    var y15 = Yh(GAP_LINE);
    if (y15 > hTop + 2) el('line', { x1: L, x2: L + pw, y1: y15.toFixed(1), y2: y15.toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '4 3', 'stroke-opacity': 0.85 }, gH);
    var titleH = paneTitle(gH, L + 7, hTop + 14, 'GAP: ' + groupWords(g).short.toUpperCase() + ' − S&P 500, POINTS', narrow ? null : 'dashed +' + GAP_LINE, C.muted);
    function barHit(bx) {
      var hw = Math.max(bw, 3) / 2 + 1, j0 = Math.max(a, Math.floor(X.inv(bx.x - hw))), j1 = Math.min(b, Math.ceil(X.inv(bx.x + bx.w + hw)));
      for (var j = j0; j <= j1; j++) {
        var xj = X(j); if (xj + hw < bx.x || xj - hw > bx.x + bx.w) continue;
        var y1 = Math.min(z0, Yh(Q.gap[j])), y2 = Math.max(z0, Yh(Q.gap[j]));
        if (y1 < bx.y + bx.h + 1 && y2 > bx.y - 1) return true;
      }
      return false;
    }
    var obsH = [titleH];

    if (Q.flip != null) {
      var fy = flipIn ? Yh(Q.flip) : Q.flip > ghi ? hTop + 26 : hTop + hH - 10;
      if (flipIn) el('line', { x1: L, x2: L + pw, y1: fy.toFixed(1), y2: fy.toFixed(1), stroke: KC.yel, 'stroke-width': 1.3, 'stroke-dasharray': '5 3', 'stroke-opacity': 0.95, 'data-vflip': '1' }, gH);
      var tagT = (flipIn ? '' : Q.flip > ghi ? '↑ ' : '↓ ') + 'flip ' + sgn1(Q.flip), tw = textW(tagT, 11, 700) + 8;
      fy = Math.max(hTop + 8, Math.min(hTop + hH - 8, fy));
      var tagR = { x: L + pw - tw - 1, y: fy - 7.5, w: tw, h: 15 }, tagLf = { x: L + 1, y: fy - 7.5, w: tw, h: 15 };
      var tagB = !barHit(tagR) ? tagR : !overlaps(tagLf, titleH) && !barHit(tagLf) ? tagLf : !overlaps(tagLf, titleH) ? tagLf : tagR;
      var gTag = el('g', {}, gH);
      el('rect', { x: tagB.x.toFixed(1), y: tagB.y.toFixed(1), width: tw.toFixed(1), height: 15, rx: 2, fill: KC.yel }, gTag);
      tx(gTag, tagB.x + tw / 2, fy + 3.8, tagT, { fill: C.bg, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', 'data-vtag': '1' });
      tagB.full = true; obsH.push(tagB);
    }
    kInsideLabels(gH, ht.map(function (t) { return { y: Yh(t), s: gapTick(t) }; }), L, pw, obsH, barHit, hTop, hTop + hH, true, rX);


    var KP = kdjPane(svg, { Q: Q, X: X, a: a, b: b, last: last, cut: cut, open: open, lastIn: lastIn, L: L, pw: pw, top: kTop, h: kH,
      narrow: narrow, ppc: ppc, ticks: ticks, col: col, snap: snap, title: 'KDJ OF THE GAP', rX: rX }), Yk = KP.Y;


    ticks.forEach(function (t) {
      el('line', { x1: t.x, x2: t.x, y1: H - 18, y2: H - 14, stroke: C.muted, 'stroke-width': 1 }, svg);
      tx(svg, t.x, H - 4, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    });


    var cross = crossLayer(svg);
    function set(ix) {
      clear(cross);
      var j = ix == null ? last : Math.max(0, Math.min(last, Math.round(ix)));
      if (ix != null && j >= v.x0 && j <= v.x1) {
        var px = X(j);
        el('line', { x1: px, x2: px, y1: 0, y2: kTop + kH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (Q.sp[j] != null) el('circle', { cx: px, cy: Yl(Q.sp[j]), r: 3.2, fill: C.light, stroke: C.bg, 'stroke-width': 1.2 }, cross);
        gs.forEach(function (x) { var y = Q.lines[x][j]; if (y != null) el('circle', { cx: px, cy: Yl(y), r: x === g ? 3.8 : 3.2, fill: VS_COL[x], stroke: '#fff', 'stroke-width': 1.1 }, cross); });
        el('circle', { cx: px, cy: Math.max(hTop + 3, Math.min(hTop + hH - 3, Yh(Q.gap[j]))), r: 3.4, fill: Q.gap[j] >= 0 ? gc : VK_GREY, stroke: '#fff', 'stroke-width': 1.1 }, cross);
        [['K', KC.k], ['D', KC.d]].forEach(function (s) {
          el('circle', { cx: px, cy: Math.max(kTop + 3, Math.min(kTop + kH - 3, Yk(Q[s[0]][j]))), r: 3.2, fill: s[1], stroke: C.bg, 'stroke-width': 1.2 }, cross);
        });
      }
      vkReadout(k, j, ix != null);
    }
    GEO['k' + k] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    if (hover['k' + k] != null && (hover['k' + k] < v.x0 - 0.5 || hover['k' + k] > v.x1 + 0.5)) hover['k' + k] = null;
    set(hover['k' + k]);
    var lim = kLimits(k), s = v.x1 - v.x0;
    B.btns.forEach(function (bt) {
      var z = bt.getAttribute('data-kz');
      bt.disabled = z === 'reset' ? !v.custom : z === 'in' ? s <= lim.min + 0.5 : s >= lim.max - 1e-6;
    });
    var ww = kWinWords(k); if (B.win.textContent !== ww) B.win.textContent = ww;
  }
  function vkReadout(k, j, picked) {
    var tf = kTf(k), B = KB[k], Q = VK.q[tf], ro = B.ro, isLast = j === Q.n - 1;
    clear(ro);
    ro.appendChild(span('d', kRangeLabel(tf, Q, j, true) + (isLast && Q.open ? ' (so far)' : '')));
    VS3.forEach(function (x) {
      if (!Q.lines[x]) return;
      ro.appendChild(span('', ' · '));
      var nm = span('vr-g', groupWords(x).short + ' '); nm.style.color = VS_COL[x]; ro.appendChild(nm);
      ro.appendChild(span(x === VK.g ? 'vr-sel' : '', Q.lines[x][j] == null ? '–' : pct1(Q.lines[x][j])));
    });
    ro.appendChild(span('', ' · S&P '));
    ro.appendChild(span('sp', Q.sp[j] == null ? '–' : pct1(Q.sp[j])));
    ro.appendChild(span('', ' · gap '));
    ro.appendChild(span('pc', sgn1(Q.gap[j])));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('kk', 'K ' + f0(Q.K[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kd', 'D ' + f0(Q.D[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kj', 'J ' + f0(Q.J[j])));
    var c = Q.cross[j];
    if (c) ro.appendChild(span(c === 'up' ? 'down' : 'up', ' · ' + (c === 'up' ? '▲ K crossed above D' : '▼ K crossed below D') + (isLast && Q.open ? ' (if it closed now)' : '')));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' for any ' + K_UNIT[tf][0]));
  }
  function initVkBlocks() {
    VKS.forEach(function (k) {
      var root = document.querySelector('.vblock[data-vk-tf="' + k.slice(1) + '"]');
      KB[k] = { root: root, val: root.querySelector('[data-vh]'), note: root.querySelector('[data-kn]'), ro: root.querySelector('[data-kro]'),
        win: root.querySelector('[data-kw]'), chart: root.querySelector('[data-kc]'), btns: Array.prototype.slice.call(root.querySelectorAll('[data-kz]')) };
      KB[k].btns.forEach(function (bt) { bt.addEventListener('click', function () { kCmd(k, bt.getAttribute('data-kz')); }); });
      attachGestures(KB[k].chart, 'k' + k, kCtl(k));
    });
    $('vkGroups').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-vk]'); if (b) chooseVk(b.getAttribute('data-vk')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-vkrange]'), function (b) {
      b.addEventListener('click', function () { chooseVkRange(b.getAttribute('data-vkrange')); });
    });
    vkChip = normKRange(params.get('vkrange')) || normKRange(stored('aisfVsKRange')) || 'Auto';
    renderVkChips();
  }







  var VOL_FILE = 'vol.json';

  var VOLD = null, volSha = null, volManSha, volLoading = false, volErr = null, volHashDone = false;
  var VOL_CARDS = ['s', 'b'], VOL_GS = ['all', 'ai', 'semis', 'hb'];
  var VOL_COL = { all: '#7E57C2', ai: '#42A5F5', semis: '#FFA726', hb: '#EC407A', sp: '#B2B5BE' };
  var VOL_RED = '#EF5350', VOL_ROSE = '#C77C7A', VOL_GREEN = '#26A69A', VOL_MINT = '#7CC4B8', VOL_GREY = '#5D606B', VOL_GOLD = '#FFD84D';
  var VOL_PL = '#9E86D8', VOL_PLT = '#B39DDB';
  var VC = { s: { p: 'sell', key: 'cs', gkey: 'cgs', W: 'Selling', w: 'selling' }, b: { p: 'buy', key: 'cb', gkey: 'cgb', W: 'Buying', w: 'buying' } };
  var VOL_FS = {
    cs: { c: 's', g: false, sec: 'sell', ro: 'sellRo', chart: 'sellChart', lg: 'sellLg', label: 'Selling volume' },
    cb: { c: 'b', g: false, sec: 'buy', ro: 'buyRo', chart: 'buyChart', lg: 'buyLg', label: 'Buying volume' },
    cgs: { c: 's', g: true, sec: 'sellGrp', ro: 'sellGRo', chart: 'sellGChart', lg: 'sellGLg', label: 'Selling volume, every group vs the S&P 500' },
    cgb: { c: 'b', g: true, sec: 'buyGrp', ro: 'buyGRo', chart: 'buyGChart', lg: 'buyGLg', label: 'Buying volume, every group vs the S&P 500' } };
  var VOLKS = { s: ['s1D', 's1W', 's2W', 's1M'], b: ['b1D', 'b1W', 'b2W', 'b1M'] };
  var VOLQ = { s: null, b: null };
  var volPick = { s: null, b: null };
  var volKChip = { s: 'Auto', b: 'Auto' };
  var VOL_WHEN = { '1D': ['today’s close', 'the next close'], '1W': ['this week’s close', 'next week’s close'],
    '2W': ['this 2-week close', 'the next 2-week close'], '1M': ['this month’s close', 'next month’s close'] };
  var VOL_DAILY = ['sell_share', 'sell_x', 'buy_x', 'dist', 'acc', 'sell_fast', 'sell_slow', 'buy_fast', 'buy_slow', 'n', 'n_heavy_up', 'n_heavy_down'];

  function volShaOf(m) { return m && m.files && m.files[VOL_FILE] ? m.files[VOL_FILE].sha256 || null : null; }
  function validateVol(v) {
    if (!v || typeof v !== 'object' || v.schema !== 2 || !v.groups || !/^\d{4}-\d\d-\d\d$/.test(v.asof || '')) return false;
    function dailyOk(G) {
      var dd = G && G.daily, n = dd && arr(dd.d) ? dd.d.length : 0;
      return n >= 30 && VOL_DAILY.every(function (k) { return arr(dd[k], n); }) && !!G.now && !!G.now.sell && !!G.now.buy &&
        !!G.now.lines && !!G.now.dots && arr(G.now.dots.sell) && arr(G.now.dots.buy) && !!G.now.rank;
    }
    if (v.groups.sp && !dailyOk(v.groups.sp)) return false;
    return VOL_GS.every(function (g) {
      var G = v.groups[g];
      if (!dailyOk(G) || !G.tf) return false;
      return TFS.every(function (k) {
        var t = G.tf[k];
        return t && ['sell', 'acc'].every(function (sk) {
          var x = t[sk], m = x && arr(x.s) ? x.s.length : 0;
          return m >= 10 && arr(x.e, m) && arr(x.v, m) && arr(x.K, m) && arr(x.D, m) && arr(x.J, m) && arr(x.xu) && arr(x.xd) && !!x.last;
        });
      });
    });
  }
  function volShown(c) { return !!VOLD && !$(VC[c].p).hidden; }
  function volGroup(c) { var g = volPick[c] || grp; return VOLD && VOLD.groups[g] && VOL_GS.indexOf(g) >= 0 ? g : 'all'; }
  function volSinceWord() { var s = VOLD && VOLD.groups.all && VOLD.groups.all.now.since; return 'since ' + (s ? s.slice(0, 4) : '2021'); }
  function volRank(r, withSince) {
    if (typeof r !== 'number' || !isFinite(r)) return '–';
    var s = withSince ? ' ' + volSinceWord() : '';
    return r >= 100 ? 'highest' + s : r <= 0 ? 'lowest' + s : ordinal(Math.round(r)) + s;
  }
  function volX(x) { return typeof x === 'number' && isFinite(x) ? x.toFixed(2) + '×' : '–'; }
  function volP1(x) { return typeof x === 'number' && isFinite(x) ? x.toFixed(1) + '%' : '–'; }
  function volR(r) { return typeof r !== 'number' || !isFinite(r) ? '–' : r >= 1 ? r.toFixed(1) : r.toFixed(2); }

  function volPctWord(x) { return x >= 99.5 && x < 100 ? (Math.floor(x * 10) / 10).toFixed(1) + '%' : x >= 10 ? Math.round(x) + '%' : x.toFixed(1) + '%'; }
  function volWordCls(c, word) {
    if (c === 's') return word === 'picking up' ? 'vr' : word === 'slowing' ? 'vg' : 'vp';
    return word === 'picking up' ? 'vg' : word === 'drying up' ? 'vr' : 'vp';
  }


  var VP = null, VGD = null;
  function groupDays(g) {
    if (!VGD || VGD.full !== full) VGD = { full: full, m: {} };
    if (!VGD.m[g]) VGD.m[g] = full.groups[g] ? full.groups[g].daily.d.map(dayNum) : [];
    return VGD.m[g];
  }
  function byDate(dst, srcD, srcV) {
    var out = new Array(dst.length), j = 0;
    for (var i = 0; i < dst.length; i++) {
      while (j < srcD.length && srcD[j] < dst[i]) j++;
      out[i] = j < srcD.length && srcD[j] === dst[i] && srcV[j] != null ? srcV[j] : null;
    }
    return out;
  }
  function volPrep(g) {
    if (!VP || VP.vol !== VOLD || VP.full !== full || VP.pp !== pp) VP = { vol: VOLD, full: full, pp: pp, m: {} };
    if (VP.m[g]) return VP.m[g];
    var G = VOLD.groups[g], dd = G.daily, d = dd.d.map(dayNum), o = { g: g, d: d, n: d.length, r: dd, now: G.now, px: null, sp: null };
    var pr = full.prices && full.prices[g] && full.prices[g][pp];
    o.px = pr ? byDate(d, groupDays(g), pr.d) : d.map(function () { return null; });
    var info = pr && pr.info || {};
    o.pxName = priceName(pp); o.pxTitle = info.title || PRICE_TITLE[pp] || pp;
    if (g !== 'sp' && VOLD.groups.sp) o.spShare = byDate(d, volPrep('sp').d, VOLD.groups.sp.daily.sell_share);
    o.dots = { s: {}, b: {} };
    G.now.dots.sell.forEach(function (i) { o.dots.s[i] = 1; });
    G.now.dots.buy.forEach(function (i) { o.dots.b[i] = 1; });
    o.dotList = { s: G.now.dots.sell, b: G.now.dots.buy };
    return (VP.m[g] = o);
  }




  function volAsofWords() {
    var av = dayNum(VOLD.asof), a = fmtDay(av, false, true), sess = doc ? doc.live.session_date : null, sn = sess ? dayNum(sess) : null;
    if (sn == null || av >= sn) return 'Close of ' + a + '.';
    if (doc.state === 'LIVE') {
      var dd = D && D.d, prev = dd && dd.length > 1 ? dd[dd.length - 2] : null;
      if (prev != null && av < prev) return 'As of the close of ' + a + '; the days since then fill in with the evening close refresh.';
      return 'As of the close of ' + a + (closedNow() ? '; today’s volume fills in with the evening close refresh.' : '; today’s volume fills in after the close.');
    }
    return 'As of the close of ' + a + '; the ' + fmtDay(sn, false, true) + ' close fills in with the next update.';
  }
  function renderVolText(c) {
    var p = VC[c].p, sell = c === 's', g = volGroup(c), w = groupWords(g), N = VOLD.groups[g].now, V = sell ? N.sell : N.buy;
    $(p + 'Name').textContent = VC[c].W + ' volume · ' + w.short;
    $(p + 'Sub').textContent = sell ? 'How much of the ' + w.who + '’ trading is selling, every day · dollar volume, today’s members back in time'
      : 'Are buyers showing up in the ' + w.who + '? Dollar volume in rising stocks, and stocks rising on heavy volume';
    var hero = $(p + 'Hero'); clear(hero);
    hero.appendChild(span('vh-w ' + volWordCls(c, V.word), VC[c].W + ' is ' + V.word));
    $(p + 'L1').textContent = 'Recent days: ' + VC[c].w + ' volume ' + volX(V.recent) + ' a normal day, vs ' + volX(V.before) +
      ' in the weeks before (' + volR(V.r) + '×)';
    var day = fmtDay(dayNum(N.d), false, true) + ': ';
    $(p + 'L2').textContent = sell
      ? day + pct0(N.sell_share) + ' of the dollar volume was in falling stocks (' + volRank(N.rank.sell_share, true) + ') · ' + N.n_heavy_down + ' of ' +
        N.n + ' fell on heavy volume (' + volRank(N.rank.dist) + ') · selling volume ' + volX(N.sell_x) + ' normal (' + volRank(N.rank.sell_x) + ')'
      : day + 'buying volume ' + volX(N.buy_x) + ' normal (' + volRank(N.rank.buy_x, true) + ') · ' + N.n_heavy_up + ' of ' + N.n +
        ' rose on heavy volume (' + volRank(N.rank.acc) + ') · recent days avg ' + volP1(N.buy.acc_recent) + ' vs ' + volP1(N.buy.acc_before) + ' before';
    $(p + 'Asof').textContent = volAsofWords();
    var W = (VOLD.meta && VOLD.meta.words) || {};
    $(p + 'Foot').textContent = [sell ? W.selling : W.buying, W.normal, W.heavy, sell ? W.share : W.accumulation,
      sell ? 'Red dots = the group’s heaviest selling days ' + volSinceWord() + ' (its very highest selling share).'
        : 'Green dots = the group’s strongest accumulation days ' + volSinceWord() + '.',
      'Dashed lines = high and very high readings for the group by its own history ' + volSinceWord() + '.',
      W.percentiles, W.members].filter(Boolean).join(' ');
    $(p + 'KTitle').textContent = VC[c].W + ' volume · KDJ — ' + w.short;
  }
  function renderVolChips(c) {
    var box = $(VC[c].p + 'Chips'), gs = VOL_GS.filter(function (g) { return VOLD.groups[g] && GROUPS.indexOf(g) >= 0; }), sig = gs.join('|');
    if (box.getAttribute('data-sig') !== sig) {
      clear(box); box.setAttribute('data-sig', sig);
      gs.forEach(function (g) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-volg', g); b.textContent = groupWords(g).short;
        box.appendChild(b);
      });
    }
    var cur = volGroup(c);
    Array.prototype.forEach.call(box.querySelectorAll('[data-volg]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-volg') === cur)); });
  }
  function volLegendItem(l, cls, text, color) {
    var s0 = span('lg-i', ''), sw = span(cls, '');
    if (color) sw.style.borderTopColor = color;
    s0.appendChild(sw); s0.appendChild(document.createTextNode(text)); l.appendChild(s0);
  }
  function renderVolLegends(c) {
    var l = $(VC[c].p + 'Lg'), g = volGroup(c), P = volPrep(g); clear(l);
    if (c === 's') {
      volLegendItem(l, 'lg-vdot lg-vdot-s', 'heaviest selling day (on ' + P.pxName + ')');
      volLegendItem(l, 'lg-vbar lg-vbar-up', 'volume in rising stocks');
      volLegendItem(l, 'lg-vbar lg-vbar-dn', 'volume in falling stocks');
      volLegendItem(l, 'lg-ln lg-gold', 'selling, short average');
      volLegendItem(l, 'lg-ln lg-gold lg-dash', 'longer average');
      volLegendItem(l, 'lg-ln lg-spdot', 'S&P 500 selling share');
      volLegendItem(l, 'lg-ln lg-p95r', 'very high for this group');
      volLegendItem(l, 'lg-ln lg-plv', 'high / very high for this group');
    } else {
      volLegendItem(l, 'lg-vdot lg-vdot-b', 'strongest buying day (on ' + P.pxName + ')');
      volLegendItem(l, 'lg-vbar lg-vbar-up', 'buying volume 1× normal or more (mint: 0.5× or more)');
      volLegendItem(l, 'lg-ln lg-gold', 'short average');
      volLegendItem(l, 'lg-ln lg-gold lg-dash', 'longer average');
      volLegendItem(l, 'lg-ln lg-plv', 'high / very high for this group');
    }
    var gl = $(VC[c].p + 'GLg'); clear(gl);
    volLegendItem(gl, 'lg-ln lg-dash lg-spl', 'S&P 500');
    VOL_GS.forEach(function (x) { if (VOLD.groups[x]) volLegendItem(gl, 'lg-ln lg-gline', groupWords(x).short, VOL_COL[x]); });
  }

  function renderVolTable(c) {
    var t = $(VC[c].p + 'Tab'), sell = c === 's', cur = volGroup(c); clear(t);
    var day = fmtDay(dayNum(VOLD.asof), false);
    var heads = sell ? [day + ' volume in falling stocks', 'Selling vol. (× normal)', 'Fell on heavy volume', 'before → recent', 'Selling is']
      : [day + ' volume in rising stocks', 'Buying vol. (× normal)', 'Rose on heavy volume', 'before → recent', 'Buying is'];
    var labs = sell ? ['in falling stocks', 'selling', 'fell on heavy volume', 'before → recent', ''] : ['in rising stocks', 'buying', 'rose on heavy volume', 'before → recent', ''];
    var th = t.createTHead().insertRow(), h0 = document.createElement('th'); h0.scope = 'col'; th.appendChild(h0);
    heads.forEach(function (h) { var x = document.createElement('th'); x.scope = 'col'; x.textContent = h; th.appendChild(x); });
    var tb = t.createTBody();
    VOL_GS.concat(['sp']).forEach(function (g) {
      var G = VOLD.groups[g]; if (!G) return;
      var N = G.now, V = sell ? N.sell : N.buy, r = tb.insertRow();
      r.setAttribute('data-volrow', g);
      if (g === cur) r.className = 'on';
      if (g === 'sp') r.className = 'sp';
      var nm = document.createElement('th'); nm.scope = 'row';
      nm.textContent = g === 'sp' ? 'S&P 500' + (N.lags ? ' (' + fmtDay(dayNum(N.d), false) + ')' : '') : groupWords(g).short;
      nm.style.color = VOL_COL[g]; r.appendChild(nm);
      var vals = [pct0(sell ? N.sell_share : N.buy_share), volX(sell ? N.sell_x : N.buy_x), (sell ? N.n_heavy_down : N.n_heavy_up) + ' of ' + N.n,
        volX(V.before) + ' → ' + volX(V.recent), V.word];
      vals.forEach(function (v, i) {
        var td = r.insertCell(); td.setAttribute('data-l', labs[i]); td.className = 'vt-c' + i;
        if (i === 4) td.appendChild(span('vt-w ' + volWordCls(c, v), v)); else td.textContent = v;
      });
    });
  }
  function renderVolKText(c) {
    var Qs = VOLQ[c], p = VC[c].p, sell = c === 's';
    if (!Qs) return;
    var asofDn = dayNum(VOLD.asof);
    TFS.forEach(function (tf) {
      var k = c + tf, B = KB[k], Q = Qs[tf], n = Q.n, L0 = Q.last;
      clear(B.val);
      B.val.appendChild(span('vb-v', (sell ? 'selling share ' : 'accumulation ') + L0.v.toFixed(1) + '%' + (Q.open ? ' so far' : '')));
      B.val.appendChild(span('', ' (' + volRank(Q.rank, true) + ') · '));
      B.val.appendChild(span('kk', 'K ' + f0(Q.K[n - 1])));
      B.val.appendChild(span('', ' '));
      B.val.appendChild(span('kd', 'D ' + f0(Q.D[n - 1])));
      B.val.appendChild(span('', ' '));
      B.val.appendChild(span('kj', 'J ' + f0(Q.J[n - 1])));
      B.val.appendChild(span('', ' · '));

      B.val.appendChild(span(Q.rising === sell ? 'vr' : 'vg', sell ? (Q.rising ? 'selling rising' : 'selling easing') : (Q.rising ? 'buying rising' : 'buying fading')));
      var when = VOL_WHEN[tf][Q.open ? 0 : 1];
      if (Q.flip != null) {
        B.val.appendChild(span('', ' · flips if ' + when + ' ' + (sell ? 'selling share' : 'accumulation') + ' ends ' + (Q.rising ? 'below ' : 'above ')));
        B.val.appendChild(span('vb-fl', Q.flip.toFixed(1) + '%'));
      } else B.val.appendChild(span('', ' · no level (0–100%) flips it at ' + when));
      B.val.classList.toggle('ghost', Q.open);
      var c0 = Q.cross[n - 1];
      B.note.textContent = 'Latest ' + K_UNIT[tf][0] + ': ' + kRangeLabel(tf, Q, n - 1, true) +
        (Q.open ? ' (so far, as of the close of ' + fmtDay(asofDn, false, true) + ')' : '') +
        (c0 ? ' · K ' + (Q.open ? 'would cross ' : 'just crossed ') + (c0 === 'up' ? 'above' : 'below') + ' D' : '');
    });
    if (FS.key && FS.key.charAt(0) === 'k' && FS.key.charAt(1) === c) $('fsKicker').textContent = fsParts(FS.key).kicker;
  }
  function renderVolCard(c) {
    var p = VC[c].p, sec = $(p);
    sec.hidden = !VOLD;
    if (!VOLD) return;
    renderVolChips(c); renderVolText(c); renderVolLegends(c); renderVolTable(c);
    try { renderVolKText(c); $(p + 'KErr').hidden = true; }
    catch (e) { var eb = $(p + 'KErr'); eb.hidden = false; errWords(e); eb.textContent = 'The ' + VC[c].w + '-volume KDJ blocks could not be drawn.'; }
    renderVolKChips(c);
  }
  function renderVol() {
    VOL_CARDS.forEach(function (c) {
      var p = VC[c].p;


      $(p).classList.toggle('vol-nodata', !VOLD);
      if (!VOLD) {
        $(p).hidden = !volErr;
        if (volErr) { var eb = $(p + 'Err'); eb.hidden = false; eb.textContent = 'The ' + VC[c].w + '-volume numbers could not be loaded (' + volErr + '). The page tries again within a minute.'; }
        return;
      }
      try { renderVolCard(c); }
      catch (e) { errWords(e); var er = $(p + 'Err'); er.hidden = false; er.textContent = 'The ' + VC[c].w + '-volume card could not be drawn.'; }
    });
    renderSpeed();
  }




  function volBars(g, X, xs, vals, a, b, Y, sgn, cls, fills, clip, bw, dense, tag) {
    var y0 = Y(0).toFixed(1), paths = fills.map(function () { return ''; }), i, v;
    if (!dense) {
      for (i = a; i <= b; i++) {
        v = vals[i]; if (v == null || !(v > 0)) continue;
        paths[cls(i)] += 'M' + (X(xs[i]) - bw / 2).toFixed(1) + ' ' + y0 + 'V' + Y(sgn * v).toFixed(1) + 'h' + bw.toFixed(1) + 'V' + y0 + 'Z';
      }
    } else {
      var col = {};
      for (i = a; i <= b; i++) { v = vals[i]; if (v == null || !(v > 0)) continue; var cx = Math.floor(X(xs[i])); if (!(cx in col) || v > vals[col[cx]]) col[cx] = i; }
      Object.keys(col).forEach(function (cx) { var j = col[cx]; paths[cls(j)] += 'M' + cx + ' ' + y0 + 'V' + Y(sgn * vals[j]).toFixed(1) + 'h1V' + y0 + 'Z'; });
    }
    var gb = el('g', { 'clip-path': clip }, g);
    paths.forEach(function (d, k) { if (d) el('path', { d: d, fill: fills[k], 'fill-opacity': 0.9, 'data-vb': tag + k }, gb); });
  }
  function volLine(g, X, xs, vals, a, b, Y, color, w, clip, dash, tag) {
    var P = decimate(xs, vals, a, b, X);
    if (P.px.length) el('path', { d: pathOf(P, Y), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-dasharray': dash || null, 'clip-path': clip, 'data-vl': tag || null }, g);
  }

  function volLevel(g, Y, L, pw, top, h, v, color, label, labColor, title, used) {
    var y = Y(v); if (!(y >= top - 0.5 && y <= top + h + 0.5)) return;
    el('line', { x1: L, x2: L + pw, y1: y.toFixed(1), y2: y.toFixed(1), stroke: color, 'stroke-width': 1.1, 'stroke-dasharray': '4 3', 'stroke-opacity': 0.95, 'data-vlevel': label }, g);
    if (!label) return;


    var fs = 11, w = textW(label, fs) + 4, x = L + 8, ly = y - 4;
    function box() { return { x: x - 2, y: ly - fs, w: w, h: fs + 3 }; }
    var bx = box();
    if (ly - fs < top + 2 || overlaps(bx, title)) { ly = y + fs + 3; bx = box(); }
    if (overlaps(bx, title) || bx.y + bx.h > top + h) { ly = y - 4; x = title.x + title.w + 10; bx = box(); }
    used.forEach(function (u) { if (overlaps(u, bx)) { x = Math.max(x, u.x + u.w + 10); bx = box(); } });
    if (bx.y + bx.h > top + h || bx.x + bx.w > L + pw) return;
    used.push(bx);
    tx(g, x, ly, label, withHalo({ fill: labColor || color, 'font-size': fs }));
  }
  function volYAxis(g, Y, ticks, L, pw, fmt, top) {
    ticks.forEach(function (v) {
      var py = Y(v); if (py < top + 6) return;
      el('line', { x1: L, x2: L + pw, y1: py, y2: py, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
      tx(g, L + pw + 5, py + 3.5, fmt(v), { fill: C.muted, 'font-size': 11, 'text-anchor': 'start' });
    });
  }
  function volPricePane(svg, P, X, x0, x1, L, pw, top, h, ticks, dotKind, narrow, snap) {
    var g = el('g', {}, svg), n = P.n, vi = visIdx(P.d, x0, x1), i;
    panelRect(g, L, top, pw, h);
    var lo = Infinity, hi = -Infinity;
    for (i = vi.i0; i <= vi.i1; i++) if (P.px[i] != null) { lo = Math.min(lo, P.px[i]); hi = Math.max(hi, P.px[i]); }
    if (!(hi >= lo)) { lo = 0; hi = 1; }
    if (hi - lo < hi * 0.004) { var mid = (hi + lo) / 2; lo = mid * 0.998; hi = mid * 1.002; }
    var pad = (hi - lo) * 0.08, Y = lin(lo - pad, hi + pad, top + h - 4, top + 22);
    var step = niceStep(hi - lo, 3), yt = [];
    while (Math.abs(Y(0) - Y(step)) < 15 && step < hi) step *= 2;
    var c100 = Math.round(step * 100), dec = c100 % 100 === 0 ? 0 : c100 % 10 === 0 ? 1 : 2;
    for (var v = Math.ceil((lo - pad) / step) * step; v <= hi + pad; v += step) yt.push(v);
    volYAxis(g, Y, yt, L, pw, function (x) { return x.toFixed(dec); }, top);
    timeGrid(g, X, ticks, top, top + h);
    var keep = {}, dl = P.dotList[dotKind], clip = clipFor(svg, L, top, pw, h);
    dl.forEach(function (j) { keep[j] = 1; });
    var a = Math.max(0, bsearchLE(P.d, x0)), b = Math.min(n - 1, lowerBound(P.d, x1));
    var PL = decimate(P.d, P.px, a, b, X, keep);
    el('path', { d: pathOf(PL, Y), fill: 'none', stroke: C.text, 'stroke-width': 1.15, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    var r = narrow ? 2.6 : 3.2, fill = dotKind === 's' ? VOL_RED : VOL_GREEN, gd = el('g', {}, g), cnt = 0;
    dl.forEach(function (j) {
      if (j < vi.i0 || j > vi.i1 || P.px[j] == null) return;
      var x = X(P.d[j]), y = Y(P.px[j]);
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: fill, stroke: C.bg, 'stroke-width': 0.8, 'data-vdot': j }, gd);
      snap.push({ x: x, y: y, dn: P.d[j] }); cnt++;
    });
    if (P.d[n - 1] >= x0 && P.d[n - 1] <= x1 && P.px[n - 1] != null) {
      var nx = X(P.d[n - 1]), ny = Y(P.px[n - 1]);
      el('circle', { cx: nx.toFixed(1), cy: ny.toFixed(1), r: narrow ? 3.4 : 4, fill: '#F3EEFF', stroke: '#fff', 'stroke-width': 1.2 }, g);
      snap.push({ x: nx, y: ny, dn: P.d[n - 1] });
    }
    var note = dotKind === 's' ? (narrow ? 'red dot = heaviest selling day' : 'red dot = one of the group’s heaviest selling days ' + volSinceWord())
      : (narrow ? 'green dot = strongest buying day' : 'green dot = one of the group’s strongest buying days ' + volSinceWord());
    var nm = P.pxName === 'Basket' ? (narrow ? 'Basket' : 'Basket (equal weight)') : P.pxName;
    tx(g, L + 8, top + 16, nm, withHalo({ fill: C.text, 'font-size': 12.5, 'font-weight': 600 }));
    tx(g, L + 8 + textW(nm, 12.5, 600) + 6, top + 16, '· ' + note, withHalo({ fill: C.muted, 'font-size': 11.5 }));
    return { Y: Y, dots: cnt };
  }
  function drawVolChart(c, Wraw, tu, hFs) {
    var sell = c === 's', cf = VC[c], g = volGroup(c), P = volPrep(g), R = P.r, N = P.now, Ln = N.lines;
    var gm = geoV(Wraw), W = gm.W, narrow = gm.narrow, L = gm.L, pw = gm.pw, gap = narrow ? 10 : 14;
    var hs = sell ? (narrow ? [124, 160, 116, 108] : [156, 210, 156, 146]) : (narrow ? [124, 160, 124] : [156, 216, 176]);
    if (hFs) {
      var av = hFs - 24 - gap * (hs.length - 1), tot = hs.reduce(function (s0, x) { return s0 + x; }, 0);
      hs = hs.map(function (x) { return Math.max(34, Math.floor(av * x / tot)); });
    }
    var tops = [], y = 0;
    hs.forEach(function (x) { tops.push(y); y += x + gap; });
    var H = y - gap + 24;
    var x0 = view.x0, x1 = view.x1, span = x1 - x0, X = lin(x0, x1, L, L + pw);
    var svg = svgFor($(cf.p + 'Chart'), W, H), ticks = timeTicks(x0, x1, X, 11, tu), n = P.n, i;
    svg.setAttribute('data-x0', x0.toFixed(3)); svg.setAttribute('data-x1', x1.toFixed(3)); svg.setAttribute('data-g', g);
    var a = Math.max(0, bsearchLE(P.d, x0)), b = Math.min(n - 1, lowerBound(P.d, x1)), vi = visIdx(P.d, x0, x1);
    var ppd = pw / span, bw = Math.max(1, Math.min(14, ppd * 1.45 * 0.72)), dense = ppd * 1.45 < 2.2, snap = [];
    var wide = !narrow, Ys = [];

    var PP = volPricePane(svg, P, X, x0, x1, L, pw, tops[0], hs[0], ticks, c, narrow, snap);
    Ys.push(PP.Y);
    function maxOf(keys) { var m = 0; for (var j = vi.i0; j <= vi.i1; j++) keys.forEach(function (k) { var v = R[k][j]; if (v != null && v > m) m = v; }); return m; }
    if (sell) {

      var t1 = tops[1], h1 = hs[1], g1 = el('g', {}, svg);
      panelRect(g1, L, t1, pw, h1);
      var top1 = Math.max(0.6, maxOf(['buy_x', 'sell_x', 'sell_fast', 'sell_slow']) * 1.06), Y1 = lin(-top1, top1, t1 + h1 - 4, t1 + 22);
      var st1 = niceStep(top1, narrow ? 2 : 3), yt1 = [];
      while (Math.abs(Y1(0) - Y1(st1)) < 16) st1 *= 2;
      for (var v1 = -Math.floor(top1 / st1) * st1; v1 <= top1 + 1e-9; v1 += st1) yt1.push(Math.round(v1 * 1000) / 1000);
      var dec1 = Math.round(st1 * 100) % 10 === 0 ? 1 : 2;
      volYAxis(g1, Y1, yt1, L, pw, function (v) { return Math.abs(v) < 1e-9 ? '0' : Math.abs(v).toFixed(dec1) + '×'; }, t1);
      timeGrid(g1, X, ticks, t1, t1 + h1);
      var clip1 = clipFor(svg, L, t1, pw, h1);
      volBars(g1, X, P.d, R.buy_x, a, b, Y1, 1, function () { return 0; }, [VOL_GREEN], clip1, bw, dense, 'up');
      volBars(g1, X, P.d, R.sell_x, a, b, Y1, -1, function () { return 0; }, [VOL_RED], clip1, bw, dense, 'dn');
      var Yneg = function (v) { return Y1(-v); };
      volLine(g1, X, P.d, R.sell_slow, a, b, Yneg, VOL_GOLD, 1.1, clip1, '4 3', 'sell_slow');
      volLine(g1, X, P.d, R.sell_fast, a, b, Yneg, VOL_GOLD, 1.7, clip1, null, 'sell_fast');
      el('line', { x1: L, x2: L + pw, y1: Y1(0).toFixed(1), y2: Y1(0).toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.9 }, g1);
      paneTitle(g1, L + 7, t1 + 15, narrow ? 'RISING ▲ VS FALLING ▼ · × NORMAL' : 'VOLUME IN RISING (GREEN, UP) VS FALLING (RED, DOWN) STOCKS · × A NORMAL DAY');
      if (wide && h1 >= 150) tx(g1, L + 8, t1 + h1 - 10, 'gold = selling, short average · dashed = longer average', withHalo({ fill: VOL_GOLD, 'font-size': 11.5 }));
      Ys.push(Y1);

      var t2 = tops[2], h2 = hs[2], g2 = el('g', {}, svg), p95s = Ln.sell_share.higher;
      panelRect(g2, L, t2, pw, h2);
      var Y2 = lin(0, 100, t2 + h2, t2 + 20), st2 = tickStep(100, h2 - 20, narrow ? 24 : 28), yt2 = [];
      for (var v2 = 0; v2 <= 100 + 1e-9; v2 += st2) yt2.push(v2);
      volYAxis(g2, Y2, yt2, L, pw, String, t2);
      timeGrid(g2, X, ticks, t2, t2 + h2);
      var clip2 = clipFor(svg, L, t2, pw, h2);
      el('line', { x1: L, x2: L + pw, y1: Y2(50).toFixed(1), y2: Y2(50).toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.6 }, g2);
      volBars(g2, X, P.d, R.sell_share, a, b, Y2, 1, function (j) { var v = R.sell_share[j]; return v >= p95s ? 0 : v >= 50 ? 1 : 2; }, [VOL_RED, VOL_ROSE, VOL_GREY], clip2, bw, dense, 'ss');
      if (P.spShare) {
        if (ppd * 1.45 >= 4) volLine(g2, X, P.d, P.spShare, a, b, Y2, '#E6E8EE', 1.1, clip2, '1.5 2.5', 'spshare');
        else { var gsp = el('g', { opacity: 0.55 }, g2); volLine(gsp, X, P.d, P.spShare, a, b, Y2, '#E6E8EE', 0.8, clip2, null, 'spshare'); }
      }
      var tt2 = paneTitle(g2, L + 7, t2 + 15, narrow ? '% OF $ VOLUME IN FALLING STOCKS' : '% OF THE DOLLAR VOLUME IN FALLING STOCKS', narrow ? null : 'dotted = S&P 500', C.muted);
      volLevel(g2, Y2, L, pw, t2, h2, p95s, VOL_RED, 'very high ' + volPctWord(p95s), VOL_RED, tt2, []);
      Ys.push(Y2);

      var t3 = tops[3], h3 = hs[3], g3 = el('g', {}, svg), p90d = Ln.dist.high, p95d = Ln.dist.higher;
      panelRect(g3, L, t3, pw, h3);
      var top3 = Math.max(10, maxOf(['dist']), p95d * 1.15) * 1.08, Y3 = lin(0, top3, t3 + h3, t3 + 20), st3 = tickStep(top3, h3 - 20, narrow ? 22 : 26), yt3 = [];
      for (var v3 = 0; v3 <= top3 + 1e-9; v3 += st3) yt3.push(Math.round(v3 * 1000) / 1000);
      volYAxis(g3, Y3, yt3, L, pw, String, t3);
      timeGrid(g3, X, ticks, t3, t3 + h3);
      var clip3 = clipFor(svg, L, t3, pw, h3);
      volBars(g3, X, P.d, R.dist, a, b, Y3, 1, function (j) { var v = R.dist[j]; return v >= p95d ? 0 : v >= p90d ? 1 : 2; }, [VOL_RED, VOL_ROSE, VOL_GREY], clip3, bw, dense, 'di');
      var tt3 = paneTitle(g3, L + 7, t3 + 15, narrow ? '% FELL ON HEAVY VOLUME' : '% OF STOCKS THAT FELL ON HEAVY VOLUME (FAR ABOVE THEIR OWN NORMAL)'), u3 = [];
      volLevel(g3, Y3, L, pw, t3, h3, p95d, VOL_PL, 'very high ' + volPctWord(p95d), VOL_PLT, tt3, u3);
      volLevel(g3, Y3, L, pw, t3, h3, p90d, VOL_PL, 'high ' + volPctWord(p90d), VOL_PLT, tt3, u3);
      Ys.push(Y3);
    } else {

      var tb1 = tops[1], hb1 = hs[1], gb1 = el('g', {}, svg);
      panelRect(gb1, L, tb1, pw, hb1);
      var topb = Math.max(1.1, maxOf(['buy_x', 'buy_fast', 'buy_slow']) * 1.06), Yb1 = lin(0, topb, tb1 + hb1, tb1 + 22);
      var stb = niceStep(topb, narrow ? 3 : 5), ytb = [];
      while (Math.abs(Yb1(0) - Yb1(stb)) < 16) stb *= 2;
      for (var vb = 0; vb <= topb + 1e-9; vb += stb) ytb.push(Math.round(vb * 1000) / 1000);
      var decb = Math.round(stb * 100) % 10 === 0 ? 1 : 2;
      volYAxis(gb1, Yb1, ytb, L, pw, function (v) { return v === 0 ? '0' : v.toFixed(decb) + '×'; }, tb1);
      timeGrid(gb1, X, ticks, tb1, tb1 + hb1);
      var clipb1 = clipFor(svg, L, tb1, pw, hb1);
      el('line', { x1: L, x2: L + pw, y1: Yb1(0.5).toFixed(1), y2: Yb1(0.5).toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.6 }, gb1);
      volBars(gb1, X, P.d, R.buy_x, a, b, Yb1, 1, function (j) { var v = R.buy_x[j]; return v >= 1 ? 0 : v >= 0.5 ? 1 : 2; }, [VOL_GREEN, VOL_MINT, VOL_GREY], clipb1, bw, dense, 'bx');
      volLine(gb1, X, P.d, R.buy_slow, a, b, Yb1, VOL_GOLD, 1.1, clipb1, '4 3', 'buy_slow');
      volLine(gb1, X, P.d, R.buy_fast, a, b, Yb1, VOL_GOLD, 1.7, clipb1, null, 'buy_fast');
      var ttb = paneTitle(gb1, L + 7, tb1 + 15, narrow ? 'BUYING VOLUME · × NORMAL' : 'BUYING VOLUME (DOLLAR VOLUME IN RISING STOCKS) · × A NORMAL DAY');
      if (wide && hb1 >= 150) tx(gb1, L + 8, ttb.y + ttb.h + 14, 'gold = short average · dashed = longer average', withHalo({ fill: VOL_GOLD, 'font-size': 11.5 }));
      Ys.push(Yb1);

      var tb2 = tops[2], hb2 = hs[2], gb2 = el('g', {}, svg), p90a = Ln.acc.high, p95a = Ln.acc.higher;
      panelRect(gb2, L, tb2, pw, hb2);
      var topa = Math.max(10, maxOf(['acc']), p95a * 1.15) * 1.08, Yb2 = lin(0, topa, tb2 + hb2, tb2 + 20), sta = tickStep(topa, hb2 - 20, narrow ? 22 : 26), yta = [];
      for (var va = 0; va <= topa + 1e-9; va += sta) yta.push(Math.round(va * 1000) / 1000);
      volYAxis(gb2, Yb2, yta, L, pw, String, tb2);
      timeGrid(gb2, X, ticks, tb2, tb2 + hb2);
      var clipb2 = clipFor(svg, L, tb2, pw, hb2);
      volBars(gb2, X, P.d, R.acc, a, b, Yb2, 1, function (j) { var v = R.acc[j]; return v >= p95a ? 0 : v >= p90a ? 1 : 2; }, [VOL_GREEN, VOL_MINT, VOL_GREY], clipb2, bw, dense, 'ac');
      var tta = paneTitle(gb2, L + 7, tb2 + 15, narrow ? '% ROSE ON HEAVY VOLUME' : '% OF STOCKS THAT ROSE ON HEAVY VOLUME (FAR ABOVE THEIR OWN NORMAL) = ACCUMULATION'), ua = [];
      volLevel(gb2, Yb2, L, pw, tb2, hb2, p95a, VOL_PL, 'very high ' + volPctWord(p95a), VOL_PLT, tta, ua);
      volLevel(gb2, Yb2, L, pw, tb2, hb2, p90a, VOL_PL, 'high ' + volPctWord(p90a), VOL_PLT, tta, ua);
      Ys.push(Yb2);
    }
    timeAxis(svg, X, ticks, H - 4, 0, W);

    var cross = crossLayer(svg), bottom = tops[tops.length - 1] + hs[hs.length - 1];
    function set(dn) {
      clear(cross);
      var j = dn == null ? n - 1 : bsearchLE(P.d, dn);
      if (j < 0) j = 0;
      if (dn != null && P.d[j] >= x0 && P.d[j] <= x1) {
        var px = X(P.d[j]);
        el('line', { x1: px, x2: px, y1: 0, y2: bottom, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (P.px[j] != null) el('circle', { cx: px, cy: Ys[0](P.px[j]), r: 3.4, fill: C.text, stroke: C.bg, 'stroke-width': 1.3 }, cross);
      }
      volReadout(c, P, j, dn != null);
    }
    GEO[cf.key] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover[cf.key]);
  }
  function volReadout(c, P, j, picked) {
    var ro = $(VC[c].p + 'Ro'), R = P.r; clear(ro);
    ro.appendChild(span('d', fmtDay(P.d[j], true, true)));
    if (c === 's') {
      ro.appendChild(span('', ' · selling '));
      ro.appendChild(span('down', volX(R.sell_x[j])));
      ro.appendChild(span('', ' normal (short average ' + volX(R.sell_fast[j]) + ') · buying '));
      ro.appendChild(span('up', volX(R.buy_x[j])));
      ro.appendChild(span('', ' · in falling stocks '));
      ro.appendChild(span('p', pct1(R.sell_share[j])));
      if (P.spShare && P.spShare[j] != null) ro.appendChild(span('sp', ' (S&P 500 ' + pct1(P.spShare[j]) + ')'));
      ro.appendChild(span('', ' · fell on heavy volume ' + R.n_heavy_down[j] + ' of ' + R.n[j]));
    } else {
      ro.appendChild(span('', ' · buying '));
      ro.appendChild(span('up', volX(R.buy_x[j])));
      ro.appendChild(span('', ' normal (short average ' + volX(R.buy_fast[j]) + ') · rose on heavy volume ' + R.n_heavy_up[j] + ' of ' + R.n[j] + ' ('));
      ro.appendChild(span('p', pct1(R.acc[j])));
      ro.appendChild(span('', ')'));
    }
    ro.appendChild(span('', ' · ' + P.pxName + ' ' + (P.px[j] == null ? '–' : P.px[j].toFixed(2))));
    if (P.dots[c][j]) ro.appendChild(span(c === 's' ? 'down' : 'up', c === 's' ? ' · heaviest selling day' : ' · strongest buying day'));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }


  function drawVolGroups(c, Wraw, tu, hFs) {
    var sell = c === 's', cf = VC[c], key = sell ? 'sell_fast' : 'buy_fast', cur = volGroup(c);
    var gm = geoV(Wraw), W = gm.W, narrow = gm.narrow, L = gm.L, pw = gm.pw;
    var h = hFs ? hFs - 24 : narrow ? 230 : 330, H = h + 24;
    var x0 = view.x0, x1 = view.x1, X = lin(x0, x1, L, L + pw);
    var svg = svgFor($(cf.p + 'GChart'), W, H), ticks = timeTicks(x0, x1, X, 11, tu), snap = [];
    var gs = ['sp'].concat(VOL_GS.filter(function (g) { return g !== cur; }), [cur]).filter(function (g) { return VOLD.groups[g]; });
    var S = {}, vmax = 0;
    gs.forEach(function (g) {
      var P = volPrep(g), vi = visIdx(P.d, x0, x1);
      S[g] = { P: P, a: Math.max(0, bsearchLE(P.d, x0)), b: Math.min(P.n - 1, lowerBound(P.d, x1)), vi: vi };
      for (var i = vi.i0; i <= vi.i1; i++) { var v = P.r[key][i]; if (v != null && v > vmax) vmax = v; }
    });
    var g0 = el('g', {}, svg);
    panelRect(g0, L, 0, pw, h);
    var top = Math.max(0.7, vmax * 1.08), Y = lin(0, top, h, 22), st = niceStep(top, narrow ? 4 : 6), yt = [];
    while (Math.abs(Y(0) - Y(st)) < 18) st *= 2;
    for (var v = st; v <= top + 1e-9; v += st) yt.push(Math.round(v * 1000) / 1000);
    var c100g = Math.round(st * 100), decg = c100g % 10 === 0 ? 1 : 2;
    volYAxis(g0, Y, yt, L, pw, function (x) { return x.toFixed(decg) + '×'; }, 0);
    timeGrid(g0, X, ticks, 0, h);
    var clip = clipFor(svg, L, 0, pw, h);
    el('line', { x1: L, x2: L + pw, y1: Y(0.5).toFixed(1), y2: Y(0.5).toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.6 }, g0);
    var lw = lineWidth(x1 - x0, narrow);
    gs.forEach(function (g) {
      var s0 = S[g];
      volLine(g0, X, s0.P.d, s0.P.r[key], s0.a, s0.b, Y, VOL_COL[g], g === 'sp' ? Math.max(1, lw) : g === cur ? lw + 0.9 : lw + 0.3, clip, g === 'sp' ? '4 3' : null, 'g-' + g);
    });
    paneTitle(g0, L + 7, 15, (sell ? 'SELLING' : 'BUYING') + (narrow ? ', SHORT AVERAGE · × NORMAL' : ' VOLUME, SHORT AVERAGE · × A NORMAL DAY'));
    var nowG = el('g', {}, svg);
    gs.forEach(function (g) {
      var P = S[g].P, n = P.n - 1, vv = P.r[key][n];
      if (P.d[n] < x0 || P.d[n] > x1 || vv == null) return;
      var nx = X(P.d[n]), ny = Y(vv);
      el('circle', { cx: nx.toFixed(1), cy: ny.toFixed(1), r: narrow ? 3.4 : 4, fill: VOL_COL[g], stroke: '#fff', 'stroke-width': 1.1, 'data-vnow': g }, nowG);
      snap.push({ x: nx, y: ny, dn: P.d[n] });
    });
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg), P0 = volPrep(cur), last = P0.d[P0.n - 1];
    function set(dn) {
      clear(cross);
      var day = dn == null ? last : dn;
      if (dn != null && day >= x0 && day <= x1) {
        var px = X(day);
        el('line', { x1: px, x2: px, y1: 0, y2: h, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        gs.forEach(function (g) {
          var P = S[g].P, j = bsearchLE(P.d, day);
          if (j >= 0 && P.d[j] === day && P.r[key][j] != null) el('circle', { cx: px, cy: Y(P.r[key][j]), r: g === cur ? 4 : 3.3, fill: VOL_COL[g], stroke: g === 'sp' ? C.bg : '#fff', 'stroke-width': 1.1 }, cross);
        });
      }
      volGReadout(c, day, dn != null);
    }
    GEO[cf.gkey] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover[cf.gkey]);
  }
  function volGReadout(c, day, picked) {
    var ro = $(VC[c].p + 'GRo'), key = c === 's' ? 'sell_fast' : 'buy_fast'; clear(ro);
    ro.appendChild(span('d', fmtDay(day, true, true)));
    ro.appendChild(span('', ' · ' + VC[c].w + ' × normal, short average:'));
    VOL_GS.concat(['sp']).forEach(function (g, i) {
      if (!VOLD.groups[g]) return;
      var P = volPrep(g), j = bsearchLE(P.d, day), ok = j >= 0 && P.d[j] === day;
      ro.appendChild(span('', i ? ' · ' : ' '));
      var nm = span('vr-g', (g === 'sp' ? 'S&P 500' : groupWords(g).short) + ' '); nm.style.color = VOL_COL[g]; ro.appendChild(nm);
      ro.appendChild(span(g === volGroup(c) ? 'vr-sel' : '', ok ? volX(P.r[key][j]) : '–'));
    });
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }


  function prepVolQ(c) {
    var g = volGroup(c), P = volPrep(g), T = VOLD.groups[g].tf, sk = c === 's' ? 'sell' : 'acc', q = { g: g }, t10 = function (x) { return x / 10; };
    var base = dayNum((VOLD.groups[g].now.since) || '2021-01-04');
    TFS.forEach(function (tf) {
      var x = T[tf][sk], n = x.s.length, idx = new Array(n), spy = new Array(n), s = x.s.map(dayNum), e = x.e.map(dayNum);
      for (var i = 0; i < n; i++) { idx[i] = i; var di = bsearchLE(P.d, e[i]); spy[i] = di >= 0 ? P.px[di] : null; }
      var Q = { s: s, e: e, v: x.v.map(t10), K: x.K.map(t10), D: x.D.map(t10), J: x.J.map(t10), n: n, idx: idx, spy: spy, open: !!x.op,
        cross: {}, rising: !!x.up, flip: typeof x.fl === 'number' && isFinite(x.fl) ? x.fl : null, hi: x.high, pct: x.pct, rank: x.rank,
        first: x.first || 0, last: x.last, med: null };
      x.xu.forEach(function (j) { Q.cross[j] = 'up'; });
      x.xd.forEach(function (j) { Q.cross[j] = 'down'; });
      if (c === 'b' && typeof x.mid === 'number' && isFinite(x.mid)) Q.med = x.mid;
      else if (c === 'b') {
        var h = []; for (var k = 0; k < n; k++) if (e[k] >= base && !(Q.open && k === n - 1)) h.push(Q.v[k]);
        h.sort(function (p1, p2) { return p1 - p2; });
        Q.med = h.length ? (h.length % 2 ? h[(h.length - 1) / 2] : (h[h.length / 2 - 1] + h[h.length / 2]) / 2) : null;
      }
      q[tf] = Q;
    });
    return q;
  }
  function prepVolBlocks(c) {
    var keys = VOLKS[c], prevN = {}, prevS = {};
    keys.forEach(function (k) { prevN[k] = KN[k]; prevS[k] = VOLQ[c] ? VOLQ[c][k.slice(1)].s : null; });
    var q = null;
    try { q = VOLD && full ? prepVolQ(c) : null; } catch (e) { errWords(e); q = null; }
    VOLQ[c] = q;
    if (!q) return;
    keys.forEach(function (k) { KN[k] = q[k.slice(1)].n; });
    kdjAfterLoad(keys, prevN, prevS);
  }
  function renderVolKChips(c) {
    var fk = FS.key && FS.key.charAt(0) === 'k' && FS.key.charAt(1) === c ? FS.key.slice(1) : null;
    var custom = fk ? !!(KV[fk] && KV[fk].custom) : VOLKS[c].some(function (k) { return KV[k] && KV[k].custom; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-' + c + 'krange]'), function (b) {
      var mine = b.getAttribute('data-' + c + 'krange') === volKChip[c];
      setAttr(b, 'aria-pressed', String(mine && !(custom && VOLQ[c])));
      b.classList.toggle('base', mine && custom && !!VOLQ[c]);
    });
  }
  function chooseVolKRange(c, chip) {
    volKChip[c] = chip;
    store('aisfVolKRange' + c, chip);
    if (VOLQ[c]) VOLKS[c].forEach(function (k) { KV[k] = kDefault(k); hover['k' + k] = null; });
    renderVolKChips(c);
    if (VOLQ[c]) requestKdj(c + 'all');
  }
  function drawVolK(k) {
    var c = k.charAt(0), tf = k.slice(1), sell = c === 's', B = KB[k], Q = VOLQ[c][tf], v = KV[k], n = Q.n, last = n - 1;
    var W = Math.max(300, Math.round(B.chart.clientWidth)), narrow = W < 640, L = 1, pw = W - 2;
    var pH = narrow ? Math.max(140, Math.min(180, Math.round(W * 0.45))) : 190, gp = narrow ? 8 : 10, hH = narrow ? 104 : 132, kH = narrow ? 132 : 172;
    var hFs = fsHeight(B.chart);
    if (hFs) { var av = hFs - 20 - 2 * gp; pH = Math.round(av * 0.38); hH = Math.round(av * 0.27); kH = av - pH - hH; }
    var hTop = pH + gp, kTop = hTop + hH + gp, H = kTop + kH + 20;
    var X = lin(v.x0, v.x1, L, L + pw), ppc = pw / (v.x1 - v.x0);
    var svg = svgFor(B.chart, W, H);
    var a = Math.max(0, Math.floor(v.x0)), b = Math.min(last, Math.ceil(v.x1));
    var vi0 = Math.max(0, Math.ceil(v.x0 - 0.4)), vi1 = Math.min(last, Math.floor(v.x1 + 0.4));
    var open = Q.open, lastIn = last >= v.x0 && X(last) <= L + pw + 0.5, cut = open ? last - 1 : last;
    var ticks = kTicks(Q, a, b, X, 11, 0, L + pw, K_TICK0[tf]);
    var col = { x: X(last - 0.5), w: ppc }, sh = { open: open, lastIn: lastIn, col: col, L: L, pw: pw }, snap = [], i;
    var rX = open && lastIn && col.w <= 16 && col.x - 1 < L + pw - 2 ? col.x - 1 : null;
    var P = volPrep(VOLQ[c].g);


    var gS = el('g', {}, svg);
    panelRect(gS, L, 0, pw, pH);
    var lo = Infinity, hi = -Infinity;
    for (i = vi0; i <= vi1; i++) if (Q.spy[i] != null) { lo = Math.min(lo, Q.spy[i]); hi = Math.max(hi, Q.spy[i]); }
    if (!(hi >= lo)) { lo = 0; hi = 1; }
    if (hi - lo < hi * 0.004) { var mid = (hi + lo) / 2; lo = mid * 0.998; hi = mid * 1.002; }
    var pad = (hi - lo) * 0.08, Ys = lin(lo - pad, hi + pad, pH - 6, 26), pt = kPriceTicks(lo, hi, Ys, 30, pH - 8);
    kGridY(gS, Ys, pt.ticks, L, pw); kGridX(gS, ticks, 0, pH); kShade(gS, sh, 0, pH);
    var clipS = clipFor(svg, L, 0, pw, pH);
    kLine(gS, X, Ys, Q.idx, Q.spy, a, b, cut, clipS, C.white, narrow ? 1.6 : 1.9, 1, open, null, narrow ? 1.3 : 1.5);
    var titleS = paneTitle(gS, L + 7, 14, P.pxName.toUpperCase()), obsS = [titleS];
    if (lastIn && Q.spy[last] != null) {
      var sx = X(last), sy = Ys(Q.spy[last]), rS = narrow ? 3.5 : 4;
      el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: rS, fill: open ? C.fear : '#F3EEFF', stroke: '#fff', 'stroke-width': 1.2 }, gS);
      snap.push({ x: sx, y: sy, dn: last }); obsS.push(dotBox(sx, sy, rS + 1));
    }



    var gH = el('g', {}, svg);
    panelRect(gH, L, hTop, pw, hH);
    var vmax = 0;
    for (i = vi0; i <= vi1; i++) vmax = Math.max(vmax, Q.v[i]);
    var flipIn = Q.flip != null, top = 100;
    if (!sell) {
      flipIn = Q.flip != null && Q.flip <= Math.max(vmax, Q.hi) * 2.2;
      top = Math.max(5, vmax, Q.hi, flipIn ? Q.flip : 0) * 1.2;
    }
    var Yh = lin(0, top, hTop + hH, hTop + 18), hs = tickStep(top, hH - 18, narrow ? 22 : 26);
    if (top / hs < 2) hs = tickStep(top, hH - 18, 15);
    var ht = [];
    if (sell) ht = [50];
    else for (var tv = hs; tv <= top + 1e-9; tv += hs) ht.push(Math.round(tv * 1000) / 1000);
    ht = ht.filter(function (t) { return Yh(t) > hTop + 8; });
    kGridY(gH, Yh, ht, L, pw); kGridX(gH, ticks, hTop, hH); kShade(gH, sh, hTop, hH);
    if (sell) el('line', { x1: L, x2: L + pw, y1: Yh(50).toFixed(1), y2: Yh(50).toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.6 }, gH);
    var clipH = clipFor(svg, L, hTop, pw, hH), bw = Math.max(1, ppc * 0.75), z0 = Yh(0), bLast = Math.min(b, cut);
    var fills = sell ? [VOL_RED, VOL_ROSE, VOL_GREY] : [VOL_GREEN, VOL_MINT, VOL_GREY];
    function cls(x) { return x >= Q.hi ? 0 : (sell ? x >= 50 : Q.med != null && x >= Q.med) ? 1 : 2; }
    var gb = el('g', { 'clip-path': clipH }, gH), dd = ['', '', ''];
    if (ppc >= 2) {
      for (i = a; i <= bLast; i++) dd[cls(Q.v[i])] += 'M' + (X(i) - bw / 2).toFixed(1) + ' ' + z0.toFixed(1) + 'V' + Yh(Q.v[i]).toFixed(1) + 'h' + bw.toFixed(1) + 'V' + z0.toFixed(1) + 'Z';
    } else {
      var cols = {};
      for (i = a; i <= bLast; i++) { var cx = Math.floor(X(i)); if (!(cx in cols) || Q.v[i] > cols[cx]) cols[cx] = Q.v[i]; }
      Object.keys(cols).forEach(function (cx) { dd[cls(cols[cx])] += 'M' + cx + ' ' + z0.toFixed(1) + 'V' + Yh(cols[cx]).toFixed(1) + 'h1V' + z0.toFixed(1) + 'Z'; });
    }
    dd.forEach(function (d, j) { if (d) el('path', { d: d, fill: fills[j], 'fill-opacity': 0.92, 'data-kbar': j }, gb); });
    if (open && b >= last) {
      var gwid = Math.max(bw, 3), gx = X(last) - gwid / 2, gy = Yh(Q.v[last]), oc = fills[cls(Q.v[last])];
      el('rect', { x: gx.toFixed(1), y: gy.toFixed(1), width: gwid.toFixed(1), height: Math.max(0.5, z0 - gy).toFixed(1),
        fill: oc, 'fill-opacity': 0.12, stroke: oc, 'stroke-width': 1.2, 'stroke-dasharray': '2 1.5', 'data-kbar': 'open' }, gb);
    }
    if (lastIn) snap.push({ x: X(last), y: Yh(Q.v[last]), dn: last });
    var pc = sell ? VOL_RED : VOL_GREEN, y90 = Yh(Q.hi);
    el('line', { x1: L, x2: L + pw, y1: y90.toFixed(1), y2: y90.toFixed(1), stroke: pc, 'stroke-width': 1, 'stroke-dasharray': '4 3', 'stroke-opacity': 0.85, 'data-khi': '1' }, gH);
    var titleH = paneTitle(gH, L + 7, hTop + 13, sell ? (narrow ? 'SELLING SHARE, %' : 'SELLING SHARE: % OF DOLLAR VOLUME IN FALLING STOCKS')
      : (narrow ? 'ACCUMULATION, %' : 'ACCUMULATION: AVERAGE % OF STOCKS RISING ON HEAVY VOLUME PER DAY'));
    function barHit(bx) {
      var hw = Math.max(bw, 3) / 2 + 1, j0 = Math.max(a, Math.floor(X.inv(bx.x - hw))), j1 = Math.min(b, Math.ceil(X.inv(bx.x + bx.w + hw)));
      for (var j = j0; j <= j1; j++) { var xj = X(j); if (xj + hw < bx.x || xj - hw > bx.x + bx.w) continue; if (Yh(Q.v[j]) < bx.y + bx.h + 1) return true; }
      return false;
    }
    var obsH = [titleH];

    var l90 = 'high ' + (sell ? volPctWord(Q.hi) : Q.hi.toFixed(1) + '%'), w90 = textW(l90, 11) + 4, ly = y90 - 4;
    var b90 = { x: L + 6, y: ly - 11, w: w90, h: 14 };
    if (overlaps(b90, titleH) || b90.y < hTop + 2) { ly = y90 + 13; b90 = { x: L + 6, y: ly - 11, w: w90, h: 14 }; }
    if (b90.y + b90.h <= hTop + hH) { tx(gH, L + 8, ly, l90, withHalo({ fill: pc, 'font-size': 11 })); obsH.push(b90); }
    if (Q.flip != null) {
      var fy = flipIn ? Yh(Q.flip) : hTop + 26;
      if (flipIn) el('line', { x1: L, x2: L + pw, y1: fy.toFixed(1), y2: fy.toFixed(1), stroke: KC.yel, 'stroke-width': 1.3, 'stroke-dasharray': '5 3', 'stroke-opacity': 0.95, 'data-kflip': '1' }, gH);
      var tagT = (flipIn ? '' : '↑ ') + 'flip ' + Q.flip.toFixed(1) + '%', tw = textW(tagT, 11, 700) + 8;
      fy = Math.max(hTop + 8, Math.min(hTop + hH - 8, fy));
      var tagR = { x: L + pw - tw - 1, y: fy - 7.5, w: tw, h: 15 }, tagLf = { x: L + 1, y: fy - 7.5, w: tw, h: 15 };
      var tagB = !barHit(tagR) ? tagR : !overlaps(tagLf, titleH) && !obsH.some(function (o) { return overlaps(o, tagLf); }) ? tagLf : tagR;
      var gTag = el('g', {}, gH);
      el('rect', { x: tagB.x.toFixed(1), y: tagB.y.toFixed(1), width: tw.toFixed(1), height: 15, rx: 2, fill: KC.yel }, gTag);
      tx(gTag, tagB.x + tw / 2, fy + 3.8, tagT, { fill: C.bg, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle', 'data-ktag': '1' });
      tagB.full = true; obsH.push(tagB);
    }
    kInsideLabels(gH, ht.map(function (t) { return { y: Yh(t), s: String(t) }; }), L, pw, obsH, barHit, hTop, hTop + hH, true, rX);
    kInsideLabels(gS, pt.ticks.map(function (t) { return { y: Ys(t), s: t.toFixed(pt.dec) }; }), L, pw, obsS, kLineHit(X, Ys, Q.spy, a, b, 2), 0, pH, false, rX);


    var KP = kdjPane(svg, { Q: Q, X: X, a: a, b: b, last: last, cut: cut, open: open, lastIn: lastIn, L: L, pw: pw, top: kTop, h: kH,
      narrow: narrow, ppc: ppc, ticks: ticks, col: col, snap: snap, title: sell ? 'KDJ OF THE SELLING SHARE' : 'KDJ OF ACCUMULATION', rX: rX,
      cUp: sell ? KC.up : KC.dn, cDn: sell ? KC.dn : KC.up }), Yk = KP.Y;

    ticks.forEach(function (t) {
      el('line', { x1: t.x, x2: t.x, y1: H - 18, y2: H - 14, stroke: C.muted, 'stroke-width': 1 }, svg);
      tx(svg, t.x, H - 4, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    });
    var cross = crossLayer(svg);
    function set(ix) {
      clear(cross);
      var j = ix == null ? last : Math.max(0, Math.min(last, Math.round(ix)));
      if (ix != null && j >= v.x0 && j <= v.x1) {
        var px = X(j);
        el('line', { x1: px, x2: px, y1: 0, y2: kTop + kH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (Q.spy[j] != null) el('circle', { cx: px, cy: Ys(Q.spy[j]), r: 3.2, fill: C.text, stroke: C.bg, 'stroke-width': 1.4 }, cross);
        el('circle', { cx: px, cy: Math.max(hTop + 3, Yh(Q.v[j])), r: 3.4, fill: fills[cls(Q.v[j])], stroke: '#fff', 'stroke-width': 1.1 }, cross);
        [['K', KC.k], ['D', KC.d]].forEach(function (s0) {
          el('circle', { cx: px, cy: Math.max(kTop + 3, Math.min(kTop + kH - 3, Yk(Q[s0[0]][j]))), r: 3.2, fill: s0[1], stroke: C.bg, 'stroke-width': 1.2 }, cross);
        });
      }
      volKReadout(k, j, ix != null);
    }
    GEO['k' + k] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    if (hover['k' + k] != null && (hover['k' + k] < v.x0 - 0.5 || hover['k' + k] > v.x1 + 0.5)) hover['k' + k] = null;
    set(hover['k' + k]);
    var lim = kLimits(k), s = v.x1 - v.x0;
    B.btns.forEach(function (bt) {
      var z = bt.getAttribute('data-kz');
      bt.disabled = z === 'reset' ? !v.custom : z === 'in' ? s <= lim.min + 0.5 : s >= lim.max - 1e-6;
    });
    var ww = kWinWords(k); if (B.win.textContent !== ww) B.win.textContent = ww;
  }
  function volKReadout(k, j, picked) {
    var c = k.charAt(0), tf = k.slice(1), sell = c === 's', B = KB[k], Q = VOLQ[c][tf], ro = B.ro, isLast = j === Q.n - 1;
    clear(ro);
    ro.appendChild(span('d', kRangeLabel(tf, Q, j, true) + (isLast && Q.open ? ' (so far)' : '')));
    ro.appendChild(span('', sell ? ' · selling share ' : ' · accumulation '));
    ro.appendChild(span('p', pct1(isLast ? Q.last.v : Q.v[j])));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('kk', 'K ' + f0(Q.K[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kd', 'D ' + f0(Q.D[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kj', 'J ' + f0(Q.J[j])));
    ro.appendChild(span('', ' · ' + volPrep(VOLQ[c].g).pxName + ' ' + (Q.spy[j] == null ? '–' : Q.spy[j].toFixed(2))));
    var cr = Q.cross[j];

    if (cr) ro.appendChild(span((cr === 'up') === sell ? 'down' : 'up', ' · ' + (cr === 'up' ? '▲ K crossed above D' : '▼ K crossed below D') + (isLast && Q.open ? ' (if it closed now)' : '')));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' for any ' + K_UNIT[tf][0]));
  }


  function chooseVolG(c, g) {
    if (!VOLD || !VOLD.groups[g] || VOL_GS.indexOf(g) < 0) return;
    var was = volGroup(c);
    volPick[c] = g === grp ? null : g;
    if (volGroup(c) === was) { renderVolChips(c); return; }
    hover[VC[c].key] = hover[VC[c].gkey] = null;
    VOLKS[c].forEach(function (k) { hover['k' + k] = null; });
    prepVolBlocks(c);
    try { renderVolCard(c); } catch (e) { errWords(e); }
    requestRender(); requestKdj(c + 'all');
  }
  function volFollowPage() {
    volPick.s = volPick.b = spPick = null;
    SPKS.forEach(function (k) { hover['k' + k] = null; });
    hover.cs = hover.cb = hover.cgs = hover.cgb = null;
    VOL_CARDS.forEach(function (c) { VOLKS[c].forEach(function (k) { hover['k' + k] = null; }); });
  }
  function volCtl(c) {
    var o = {}; for (var key in mainCtl) o[key] = mainCtl[key];
    o.xs = function () { return VOLD ? volPrep(volGroup(c)).d : D.d; };
    return o;
  }
  function loadVol() {
    if (volLoading || !full) return;
    if (volManSha === null) return;
    if (VOLD && (!volManSha || volManSha === volSha)) return;
    volLoading = true;
    var want = volManSha;
    getJSONRetry(VOL_FILE).then(function (v) {
      if (!validateVol(v)) throw pubErr('vol.json looked broken');
      var changed = !VOLD || v.built_utc !== VOLD.built_utc || v.asof !== VOLD.asof;
      volSha = want; volErr = null;
      if (!changed) return;
      VOLD = v; VP = null;
      volAfterLoad();
    }).catch(function (e) {
      volErr = errWords(e);
      if (doc && !VOLD) renderVol();
    }).then(function () { volLoading = false; });
  }
  function volAfterLoad() {
    if (!doc) return;
    prepVolBlocks('s'); prepVolBlocks('b'); prepSpeedBlocks();
    renderVol();
    requestRender(); requestKdj('sall'); requestKdj('ball'); requestKdj('pall');

    if (!volHashDone) {
      volHashDone = true;
      var h = location.hash;
      if (h === '#sell' || h === '#buy' || h === '#sellK' || h === '#buyK' || h === '#sellGrp' || h === '#buyGrp' || h === '#speed' || h === '#speedP')
        requestAnimationFrame(function () { var t = document.getElementById(h.slice(1)); if (t) t.scrollIntoView(); });
    }
  }
  function initVol() {
    VOL_CARDS.forEach(function (c) {
      var p = VC[c].p;
      $(p + 'Chips').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-volg]'); if (b) chooseVolG(c, b.getAttribute('data-volg')); });
      attachGestures($(p + 'Chart'), VC[c].key, volCtl(c));
      attachGestures($(p + 'GChart'), VC[c].gkey, volCtl(c));
      VOLKS[c].forEach(function (k) {
        var root = document.querySelector('.volblock[data-vol-c="' + c + '"][data-vol-tf="' + k.slice(1) + '"]');
        KB[k] = { root: root, val: root.querySelector('[data-vh]'), note: root.querySelector('[data-kn]'), ro: root.querySelector('[data-kro]'),
          win: root.querySelector('[data-kw]'), chart: root.querySelector('[data-kc]'), btns: Array.prototype.slice.call(root.querySelectorAll('[data-kz]')) };
        KB[k].btns.forEach(function (bt) { bt.addEventListener('click', function () { kCmd(k, bt.getAttribute('data-kz')); }); });
        attachGestures(KB[k].chart, 'k' + k, kCtl(k));
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-' + c + 'krange]'), function (b) {
        b.addEventListener('click', function () { chooseVolKRange(c, b.getAttribute('data-' + c + 'krange')); });
      });
      volKChip[c] = normKRange(params.get(c + 'krange')) || normKRange(stored('aisfVolKRange' + c)) || 'Auto';
      renderVolKChips(c);
    });
  }









  var SP_SIZES = ['1D', '3D', '1W', '2W', '1M', '3M'], SPKS = SP_SIZES.map(function (k) { return 'p' + k; });
  var SP_NAME = { '1D': 'Daily', '3D': '3 days', '1W': 'Weekly', '2W': '2 weeks', '1M': 'Monthly', '3M': 'Quarterly' };
  var SP_CHIP = { '1D': 'D', '3D': '3D', '1W': 'W', '2W': '2W', '1M': 'M', '3M': 'Q' };
  var SP_CANDLES = { '1D': 'Daily', '3D': '3-day', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly', '3M': 'Quarterly' };
  var SP_SHOW = { '1D': 60, '3D': 40, '1W': 52, '2W': 39, '1M': 36, '3M': 16 };
  var SP_WIN = { '1D': 'last 60 days', '3D': 'last 40 three-day candles', '1W': 'last 52 weeks', '2W': 'last 39 two-week candles',
    '1M': 'last 3 years', '3M': 'last 4 years' };
  var SP_UNIT = { '1D': ['day', 'days'], '3D': ['3-day candle', '3-day candles'], '1W': ['week', 'weeks'],
    '2W': ['2-week candle', '2-week candles'], '1M': ['month', 'months'], '3M': ['quarter', 'quarters'] };
  var SP_TICK0 = { '1D': 0, '3D': 0, '1W': 0, '2W': 1, '1M': 2, '3M': 3 };
  var SP_ROWS = ['all', 'ai', 'semis', 'hb', 'sp'], SP_SIDES = ['sell', 'buy'];
  var SP_COL = { sell: VOL_RED, buy: VOL_GREEN };
  var SP_LO = 0.06, SP_HI = 9;
  var SPQ = null, spPick = null, spOpen = {};

  function spAvail() { return !!(VOLD && VOLD.groups.all && VOLD.groups.all.speed); }
  function speedOk(v) {
    return SP_ROWS.every(function (g) {
      var G = v.groups[g];
      if (!G) return g === 'sp';
      var s = G.speed;
      return !!s && SP_SIZES.every(function (k) {
        return !!s[k] && SP_SIDES.every(function (sd) {
          var x = s[k][sd], c = x && x.candles, m = c && arr(c.s) ? c.s.length : 0;
          return m >= 5 && arr(c.e, m) && arr(c.v, m) && typeof x.n_so_far === 'number' && typeof x.n_total === 'number';
        });
      });
    });
  }
  function spGroup() { var g = spPick || grp; return VOLD && VOLD.groups[g] && VOL_GS.indexOf(g) >= 0 ? g : 'all'; }

  function spTone(side, arrow) {
    if (!arrow || arrow === '→') return 'flat';
    return (side === 'sell') === (arrow.charAt(0) === '▲') ? 'bad' : 'good';
  }
  function spX(x) { return typeof x === 'number' && isFinite(x) ? x.toFixed(2) + '×' : '–'; }
  function spSoFar(x) { return x.open ? 'so far · ' + x.n_so_far + ' of ' + x.n_total + ' days' : 'closed'; }
  function spName(g) {
    if (g !== 'sp') return groupWords(g).short;
    var N = VOLD.groups.sp.now;
    return 'S&P 500' + (N.lags ? ' (' + fmtDay(dayNum(N.d), false) + ')' : '');
  }
  function spRange(tf, Q, j, withYear) {
    var s = Q.s[j], e = Q.e[j];
    if (tf === '1D') return fmtDay(e, withYear, true);
    if (tf === '1M') return fmtMonYear(s);
    if (tf === '3M') { var d = dnDate(s); return 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + ' ' + d.getUTCFullYear(); }
    var ys = dnDate(s).getUTCFullYear() !== dnDate(e).getUTCFullYear();
    return s === e ? fmtDay(s, withYear) : fmtDay(s, ys) + ' – ' + fmtDay(e, withYear || ys);
  }
  function spNum(x) { return String(+x); }



  function prepSpeedQ() {
    var g = spGroup(), S = VOLD.groups[g].speed, q = { g: g };
    SP_SIZES.forEach(function (tf) {
      var A = S[tf].sell, B = S[tf].buy, ca = A.candles, cb = B.candles, n = ca.s.length, bi = {}, buy = new Array(n), idx = new Array(n);
      cb.s.forEach(function (d, i) { bi[d] = cb.v[i]; });
      for (var i = 0; i < n; i++) { idx[i] = i; buy[i] = Object.prototype.hasOwnProperty.call(bi, ca.s[i]) ? bi[ca.s[i]] : null; }
      q[tf] = { s: ca.s.map(dayNum), e: ca.e.map(dayNum), sell: ca.v.slice(), buy: buy, n: n, idx: idx, open: !!A.open, A: A, B: B, first: 0 };
    });
    return q;
  }
  function prepSpeedBlocks() {
    var prevN = {}, prevS = {}, q = null;
    SPKS.forEach(function (k) { prevN[k] = KN[k]; prevS[k] = SPQ ? SPQ[k.slice(1)].s : null; });
    try { q = full && spAvail() && speedOk(VOLD) ? prepSpeedQ() : null; } catch (e) { errWords(e); q = null; }
    SPQ = q;
    if (!q) return;
    SPKS.forEach(function (k) { KN[k] = q[k.slice(1)].n; });
    kdjAfterLoad(SPKS, prevN, prevS);
  }


  function spCell(td, side, tf, x) {
    td.className = 'spc t-' + spTone(side, x.arrow);
    td.setAttribute('data-spc', side + ' ' + tf);
    td.appendChild(span('spc-v', (x.arrow ? x.arrow + ' ' : '') + spX(x.now)));
    td.appendChild(span('spc-w', x.word || '–'));
    var n = span('spc-n', x.open ? 'so far · ' : 'closed');
    if (x.open) n.appendChild(span('nw', x.n_so_far + ' of ' + x.n_total + ' days'));
    td.appendChild(n);
    td.appendChild(span('spc-l', 'last closed ' + spX(x.last_closed)));
  }
  function renderSpeedTable(cur) {
    var box = $('speedTab'); clear(box);
    SP_SIDES.forEach(function (side) {
      var t = document.createElement('table'); t.className = 'spt'; t.setAttribute('data-side', side);
      var cg = document.createElement('colgroup'), c0 = document.createElement('col'); c0.className = 'spt-lc'; cg.appendChild(c0);
      SP_SIZES.forEach(function () { cg.appendChild(document.createElement('col')); });
      t.appendChild(cg);
      var th = t.createTHead(), r0 = th.insertRow(), r1 = th.insertRow(), e0 = document.createElement('th');
      r0.appendChild(e0);
      var hs = document.createElement('th'); hs.colSpan = 6; hs.scope = 'colgroup'; hs.className = 'spt-side ' + side;
      hs.textContent = side === 'sell' ? 'SELLING' : 'BUYING'; r0.appendChild(hs);
      r1.appendChild(document.createElement('th'));
      SP_SIZES.forEach(function (tf) { var h = document.createElement('th'); h.scope = 'col'; h.textContent = SP_NAME[tf]; r1.appendChild(h); });
      var tb = t.createTBody();
      SP_ROWS.forEach(function (g) {
        var G = VOLD.groups[g]; if (!G) return;
        var r = tb.insertRow(), nm = document.createElement('th');
        r.setAttribute('data-sprow', g);
        if (g === cur) r.className = 'on';
        nm.scope = 'row'; nm.textContent = spName(g); nm.style.color = VOL_COL[g]; r.appendChild(nm);
        SP_SIZES.forEach(function (tf) { spCell(r.insertCell(), side, tf, G.speed[tf][side]); });
      });
      box.appendChild(t);
    });
  }
  function spDetail(g, key) {
    var p = key.split('|'), x = VOLD.groups[g].speed[p[1]][p[0]];
    return (p[0] === 'sell' ? 'Selling' : 'Buying') + ' · ' + SP_NAME[p[1]] + ': ' + (x.arrow ? x.arrow + ' ' : '') + spX(x.now) + ' ' +
      (x.word || '') + ' · ' + spSoFar(x) + ' · last closed ' + spX(x.last_closed);
  }
  function renderSpeedCards(cur) {
    var box = $('speedCards'); clear(box);
    SP_ROWS.forEach(function (g) {
      var G = VOLD.groups[g]; if (!G) return;
      var card = document.createElement('div'); card.className = 'spm-card' + (g === cur ? ' on' : ''); card.setAttribute('data-sprow', g);
      var h = span('spm-g', spName(g)); h.style.color = VOL_COL[g];
      var hd = document.createElement('div'); hd.className = 'spm-h'; hd.appendChild(h); card.appendChild(hd);
      SP_SIDES.forEach(function (side) {
        var row = document.createElement('div'); row.className = 'spm-r'; row.setAttribute('data-side', side);
        row.appendChild(span('spm-s ' + side, side === 'sell' ? 'Sell' : 'Buy'));
        var chips = document.createElement('div'); chips.className = 'spm-chips';
        SP_SIZES.forEach(function (tf) {
          var x = G.speed[tf][side], b = document.createElement('button'), key = side + '|' + tf;
          b.type = 'button'; b.className = 'spm-c t-' + spTone(side, x.arrow); b.setAttribute('data-spc', g + '|' + key);
          b.setAttribute('aria-pressed', String(spOpen[g] === key));
          b.setAttribute('aria-label', (side === 'sell' ? 'Selling, ' : 'Buying, ') + SP_NAME[tf].toLowerCase() + ': ' + spX(x.now) + (x.word ? ', ' + x.word : ''));
          b.appendChild(span('spm-k', SP_CHIP[tf]));
          b.appendChild(span('spm-a', x.arrow || '–'));
          b.appendChild(span('spm-x', spX(x.now)));
          chips.appendChild(b);
        });
        row.appendChild(chips); card.appendChild(row);
      });
      var d = document.createElement('p'); d.className = 'spm-d'; d.setAttribute('aria-live', 'polite');
      d.hidden = !spOpen[g]; if (spOpen[g]) d.textContent = spDetail(g, spOpen[g]);
      card.appendChild(d);
      box.appendChild(card);
    });
  }
  function spCardTap(b) {
    var p = b.getAttribute('data-spc').split('|'), g = p[0], key = p[1] + '|' + p[2];
    if (!VOLD || !VOLD.groups[g]) return;
    spOpen[g] = spOpen[g] === key ? null : key;
    var card = b.closest('.spm-card'), d = card.querySelector('.spm-d');
    Array.prototype.forEach.call(card.querySelectorAll('[data-spc]'), function (x) {
      setAttr(x, 'aria-pressed', String(spOpen[g] === x.getAttribute('data-spc').split('|').slice(1).join('|')));
    });
    d.hidden = !spOpen[g]; d.textContent = spOpen[g] ? spDetail(g, spOpen[g]) : '';
  }
  function renderSpeedChips() {
    var box = $('speedChips'), gs = VOL_GS.filter(function (g) { return VOLD.groups[g] && GROUPS.indexOf(g) >= 0; }), sig = gs.join('|');
    if (box.getAttribute('data-sig') !== sig) {
      clear(box); box.setAttribute('data-sig', sig);
      gs.forEach(function (g) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-spg', g); b.textContent = groupWords(g).short;
        box.appendChild(b);
      });
    }
    var cur = spGroup();
    Array.prototype.forEach.call(box.querySelectorAll('[data-spg]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-spg') === cur)); });
  }
  function spHead(side, x) {
    var s = span('sp-h sp-' + spTone(side, x.arrow), (side === 'sell' ? 'selling ' : 'buying ') + (x.arrow ? x.arrow + ' ' : '') + spX(x.now) +
      (x.open ? ' so far' : '') + ' · ' + (x.word || '–'));
    s.setAttribute('data-sph', side);
    return s;
  }
  function renderSpeedText() {
    var cur = spGroup(), S = VOLD.groups[cur].speed, M = (VOLD.meta && VOLD.meta.speed) || {}, W = (VOLD.meta && VOLD.meta.words) || {};
    $('speedSub').textContent = 'Dollar volume per day in falling stocks (selling) and rising stocks (buying) in the candle that is still open — as if ' +
      'it closed today — vs the candles just before it · close of ' + fmtDay(dayNum(VOLD.asof), false, true);
    var key = $('speedKey'); clear(key);
    key.appendChild(span('', '▲ picking up · ▲▲ picking up fast · ▼ slowing / drying up · ▼▼ slowing / drying up fast · '));

    [['bad', 'red', ' = bad for the stocks (more selling or less buying)'], ['good', 'green', ' = good'], ['flat', 'grey', ' = steady']].forEach(function (t, i) {
      var s0 = span('sp-ki', ''), w0 = span('nw', ''); w0.appendChild(span('sw sw-' + t[0], '')); w0.appendChild(document.createTextNode(t[1]));
      s0.appendChild(w0); s0.appendChild(document.createTextNode(t[2] + (i < 2 ? ' · ' : '')));
      key.appendChild(s0);
    });
    var aw = volAsofWords(), ao = $('speedAsof');
    ao.hidden = !/^As of/.test(aw); ao.textContent = ao.hidden ? '' : aw;
    renderSpeedTable(cur); renderSpeedCards(cur); renderSpeedChips();
    $('speedPTitle').textContent = 'Picking up or slowing down? · ' + groupWords(cur).short;
    var asofDn = dayNum(VOLD.groups[cur].now.d);
    SP_SIZES.forEach(function (tf) {
      var B = KB['p' + tf], A = S[tf].sell, Bb = S[tf].buy, Q = SPQ && SPQ[tf], U = SP_UNIT[tf][0];
      clear(B.val);
      B.val.appendChild(spHead('sell', A));
      B.val.appendChild(spHead('buy', Bb));
      B.spn.textContent = A.open ? A.n_so_far + ' of ' + A.n_total + ' days · ' : '';
      if (Q) B.note.textContent = 'Latest ' + U + ': ' + spRange(tf, Q, Q.n - 1, true) + (A.open ? ' (so far, as of the close of ' + fmtDay(asofDn, false, true) + ')' : '') +
        ' · the ' + U + ' before: selling ' + spX(A.last_closed) + ', buying ' + spX(Bb.last_closed);
    });
    $('speedFoot').textContent = [W.selling, W.buying,
      'Each candle’s reading = its dollar volume per day against the candles just before it (1× = the same pace).',
      'Daily = each day vs the days just before · 3 days = blocks of 3 trading sessions · Weekly = Monday to Friday · ' +
      '2 weeks = the meter’s 2-week candles · Monthly · Quarterly = calendar quarter.',
      'Per-day averages, so a candle that is still open compares fairly with full ones; sessions counted on the NYSE calendar (holidays and half days included).',
      W.members].filter(Boolean).join(' ');
    if (FS.key && FS.key.charAt(1) === 'p') $('fsKicker').textContent = fsParts(FS.key).kicker;
  }
  function renderSpeed() {
    var sec = $('speed'), has = spAvail();
    sec.hidden = !has;
    if (!has) return;
    var ok = !!SPQ;
    sec.classList.toggle('vol-nodata', !ok);
    $('speedErr').hidden = ok;
    if (!ok) { $('speedErr').textContent = 'The picking-up-or-slowing-down numbers could not be read; the next volume build replaces them.'; return; }
    try { renderSpeedText(); }
    catch (e) { errWords(e); $('speedErr').hidden = false; $('speedErr').textContent = 'The picking-up-or-slowing-down section could not be drawn.'; }
  }


  function spClamp(x) { return x == null ? null : Math.min(SP_HI, Math.max(SP_LO, x)); }
  function drawSpeed(k) {
    var tf = k.slice(1), B = KB[k], Q = SPQ[tf], v = KV[k], n = Q.n, last = n - 1, i;
    var W = Math.max(300, Math.round(B.chart.clientWidth)), narrow = W < 640, L = narrow ? 34 : 42, RG = narrow ? 44 : 56, pw = W - L - RG;

    var xH = narrow ? 112 : 140, gp = narrow ? 6 : 8, pH = narrow ? 168 : 200, hFs = fsHeight(B.chart);
    if (hFs) { var avS = Math.max(280, hFs - 22 - gp); xH = Math.round(avS * 0.38); pH = avS - xH; }
    var sT = xH + gp;
    var H = sT + pH + 22, X = lin(v.x0, v.x1, L, L + pw), ppc = pw / (v.x1 - v.x0);
    var svg = svgFor(B.chart, W, H);
    svg.setAttribute('data-g', SPQ.g);
    var a = Math.max(0, Math.floor(v.x0)), b = Math.min(last, Math.ceil(v.x1));
    var vi0 = Math.max(0, Math.ceil(v.x0 - 0.4)), vi1 = Math.min(last, Math.floor(v.x1 + 0.4));
    var open = Q.open, lastIn = last >= v.x0 - 0.01 && last <= v.x1 + 0.01, cut = open ? last - 1 : last;
    var cs = { sell: Q.sell.map(spClamp), buy: Q.buy.map(spClamp) }, lo = Infinity, hi = -Infinity;
    for (i = vi0; i <= vi1; i++) SP_SIDES.forEach(function (sd) { var x = cs[sd][i]; if (x != null) { lo = Math.min(lo, x); hi = Math.max(hi, x); } });
    if (!(hi >= lo)) { lo = 1; hi = 1; }
    lo = Math.min(Math.max(lo * 0.85, 0.05), 0.6); hi = Math.max(Math.min(hi * 1.2, 11), 1.6);
    var top = sT + 7, bot = sT + pH - 7, ly = lin(Math.log(lo), Math.log(hi), bot, top);
    var Y = function (x) { return ly(Math.log(x)); };
    var ticks = kTicks(Q, a, b, X, 11, L, L + pw, SP_TICK0[tf], tf === '3M'), shS = { open: open, lastIn: lastIn, col: { x: X(last - 0.5), w: ppc }, L: L, pw: pw };
    var fs = narrow ? 10.5 : 11;

    var PP = volPrep(SPQ.g), px = new Array(n);
    for (i = 0; i < n; i++) { var di = bsearchLE(PP.d, Q.e[i]); px[i] = di >= 0 ? PP.px[di] : null; }
    Q.px = px;
    var gP = el('g', {}, svg);
    panelRect(gP, L, 0, pw, xH);
    var plo = Infinity, phi = -Infinity;
    for (i = vi0; i <= vi1; i++) if (px[i] != null) { plo = Math.min(plo, px[i]); phi = Math.max(phi, px[i]); }
    if (!(phi >= plo)) { plo = 0; phi = 1; }
    if (phi - plo < phi * 0.004) { var pmid = (phi + plo) / 2; plo = pmid * 0.998; phi = pmid * 1.002; }
    var ppad = (phi - plo) * 0.08, Yp = lin(plo - ppad, phi + ppad, xH - 5, 22), ptk = kPriceTicks(plo, phi, Yp, 24, xH - 6);
    kGridY(gP, Yp, ptk.ticks, L, pw); kGridX(gP, ticks, 0, xH); kShade(gP, shS, 0, xH);
    ptk.ticks.forEach(function (t) { tx(svg, L - 5, Yp(t) + 3.8, t.toFixed(ptk.dec), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end', 'data-sppxtick': '1' }); });
    var clipP = clipFor(svg, L, 0, pw, xH);
    kLine(gP, X, Yp, Q.idx, px, a, b, open ? last - 1 : last, clipP, C.white, narrow ? 1.6 : 1.9, 1, open, null, narrow ? 1.3 : 1.5);
    paneTitle(gP, L + 7, 14, PP.pxName.toUpperCase());
    if (lastIn && px[last] != null) {
      var pxX = X(last), pxY = Yp(px[last]), rP = narrow ? 3.5 : 4;
      el('circle', { cx: pxX.toFixed(1), cy: pxY.toFixed(1), r: rP, fill: open ? C.fear : '#F3EEFF', stroke: '#fff', 'stroke-width': 1.2, 'data-sppxnow': '1' }, gP);
      var pv = px[last], pl = (pp === 'BASKET' ? '' : '$') + pv.toFixed(narrow && pv >= 100 ? 0 : 2);
      tx(svg, pxX + (narrow ? 7 : 9), Math.max(12, Math.min(xH - 3, pxY + 4)), pl, { fill: C.white, 'font-size': narrow ? 11 : 12, 'font-weight': 700,
        'paint-order': 'stroke', stroke: C.bg, 'stroke-width': 3, 'stroke-linejoin': 'round', 'data-sppxend': '1' });
    }

    var g = el('g', {}, svg);
    panelRect(g, L, sT, pw, pH);
    kGridX(g, ticks, sT, pH);
    kShade(g, shS, sT, pH);


    var used = [], wideR = hi / lo > 12;
    [1, 0.5, 2, 0.25, 4, 0.1, 8].forEach(function (t) {
      if (t < lo || t > hi) return;
      var y = Y(t), level = t === 1;
      if (level) el('line', { x1: L, x2: L + pw, y1: y.toFixed(1), y2: y.toFixed(1), stroke: t === 1 ? '#A9ADBA' : C.muted, 'stroke-width': t === 1 ? 1.2 : 1,
        'stroke-dasharray': t === 1 ? null : '4 3', 'stroke-opacity': t === 1 ? 0.9 : 0.75, 'data-splevel': String(t) }, g);
      if (y < sT + 5 || y > sT + pH - 2 || used.some(function (u) { return Math.abs(u - y) < 12; })) return;
      used.push(y);
      if (!level) el('line', { x1: L, x2: L + pw, y1: y.toFixed(1), y2: y.toFixed(1), stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
      tx(svg, L - 5, y + 3.8, String(t) + '×', { fill: t === 1 ? C.text : C.muted, 'font-size': fs, 'text-anchor': 'end', 'data-sptick': String(t) });
    });

    var clip = clipFor(svg, L, sT, pw, pH), snap = [], dotsOn = tf !== '1D' && ppc >= 5, lw = tf === '1D' ? (narrow ? 1.2 : 1.4) : (narrow ? 1.5 : 1.7);
    SP_SIDES.forEach(function (sd) {
      var vals = cs[sd], col = SP_COL[sd], d = '', pen = false, end = Math.min(b, cut), dots = '', r = narrow ? 1.8 : 2.2;
      for (i = a; i <= end; i++) {
        if (vals[i] == null) { pen = false; continue; }
        var px = X(i).toFixed(1), py = Y(vals[i]).toFixed(1);
        d += (pen ? 'L' : 'M') + px + ' ' + py; pen = true;
        if (dotsOn && !(i === last)) dots += 'M' + (X(i) - r).toFixed(1) + ' ' + py + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0';
      }
      if (d) el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': lw, 'stroke-linejoin': 'round', 'clip-path': clip, 'data-spl': sd }, g);
      if (dots) el('path', { d: dots, fill: col, stroke: 'none', 'clip-path': clip, 'data-spdots': sd }, g);
      if (open && b >= last && cut >= 0 && vals[cut] != null && vals[last] != null)
        el('line', { x1: X(cut).toFixed(1), y1: Y(vals[cut]).toFixed(1), x2: X(last).toFixed(1), y2: Y(vals[last]).toFixed(1), stroke: col,
          'stroke-width': lw, 'stroke-dasharray': '2 2.6', 'stroke-linecap': 'round', 'clip-path': clip, 'data-spopen': sd }, g);
      if (lastIn && vals[last] != null) {
        var ex = X(last), ey = Y(vals[last]);
        if (open) el('circle', { cx: ex.toFixed(1), cy: ey.toFixed(1), r: narrow ? 3.7 : 4.3, fill: C.panel, stroke: col, 'stroke-width': 1.8, 'data-spnow': 'open' }, g);
        else el('circle', { cx: ex.toFixed(1), cy: ey.toFixed(1), r: narrow ? 3.3 : 3.9, fill: col, stroke: C.bg, 'stroke-width': 1, 'data-spnow': 'closed' }, g);
        snap.push({ x: ex, y: ey, dn: last });
      }
    });

    if (lastIn) {
      var labs = SP_SIDES.filter(function (sd) { return cs[sd][last] != null; }).map(function (sd) { return { sd: sd, y: Y(cs[sd][last]), s: spX(Q[sd][last]) }; });
      if (labs.length === 2 && Math.abs(labs[0].y - labs[1].y) < 13) {
        var m = (labs[0].y + labs[1].y) / 2, u = labs[0].y <= labs[1].y ? 0 : 1;
        labs[u].y = m - 6.5; labs[1 - u].y = m + 6.5;
      }
      labs.forEach(function (it) {
        tx(svg, X(last) + (narrow ? 7 : 9), Math.max(sT + 10, Math.min(sT + pH - 2, it.y)) + 4, it.s,
          { fill: SP_COL[it.sd], 'font-size': narrow ? 11 : 12, 'font-weight': 700, 'paint-order': 'stroke', stroke: C.bg, 'stroke-width': 3, 'stroke-linejoin': 'round', 'data-spend': it.sd });
      });
    }
    ticks.forEach(function (t) {
      el('line', { x1: t.x, x2: t.x, y1: sT + pH, y2: sT + pH + 4, stroke: C.muted, 'stroke-width': 1 }, svg);
      tx(svg, t.x, H - 4, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    });
    var cross = crossLayer(svg);
    function set(ix) {
      clear(cross);
      var j = ix == null ? last : Math.max(0, Math.min(last, Math.round(ix)));
      if (ix != null && j >= v.x0 && j <= v.x1) {
        var px = X(j);
        el('line', { x1: px, x2: px, y1: 0, y2: sT + pH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (Q.px && Q.px[j] != null) el('circle', { cx: px, cy: Yp(Q.px[j]), r: 3.4, fill: C.white, stroke: C.bg, 'stroke-width': 1.2 }, cross);
        SP_SIDES.forEach(function (sd) {
          if (cs[sd][j] != null) el('circle', { cx: px, cy: Y(cs[sd][j]), r: 3.4, fill: SP_COL[sd], stroke: '#fff', 'stroke-width': 1.1 }, cross);
        });
      }
      spReadout(k, j, ix != null);
    }
    GEO['k' + k] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    if (hover['k' + k] != null && (hover['k' + k] < v.x0 - 0.5 || hover['k' + k] > v.x1 + 0.5)) hover['k' + k] = null;
    set(hover['k' + k]);
    var lim = kLimits(k), s = v.x1 - v.x0;
    B.btns.forEach(function (bt) {
      var z = bt.getAttribute('data-kz');
      bt.disabled = z === 'reset' ? !v.custom : z === 'in' ? s <= lim.min + 0.5 : s >= lim.max - 1e-6;
    });
    var ww = kWinWords(k); if (B.win.textContent !== ww) B.win.textContent = ww;
  }
  function spReadout(k, j, picked) {
    var tf = k.slice(1), Q = SPQ[tf], ro = KB[k].ro, isLast = j === Q.n - 1, so = isLast && Q.open;
    clear(ro);
    ro.appendChild(span('d', spRange(tf, Q, j, true)));
    ro.appendChild(span('', ' · selling '));
    ro.appendChild(span('down', spX(Q.sell[j])));
    ro.appendChild(span('', ' · buying '));
    ro.appendChild(span('up', spX(Q.buy[j])));
    ro.appendChild(span(so ? 'p' : 'muted', ' · ' + (so ? 'so far, ' + Q.A.n_so_far + ' of ' + Q.A.n_total + ' days' : 'closed')));
    if (Q.px && Q.px[j] != null) ro.appendChild(span('', ' · ' + volPrep(SPQ.g).pxName + ' ' + Q.px[j].toFixed(2)));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' for any ' + SP_UNIT[tf][0]));
  }


  function chooseSpeedG(g) {
    if (!VOLD || !VOLD.groups[g] || VOL_GS.indexOf(g) < 0) return;
    var was = spGroup();
    spPick = g === grp ? null : g;
    if (spGroup() === was) { renderSpeedChips(); return; }
    SPKS.forEach(function (k) { hover['k' + k] = null; });
    prepSpeedBlocks();
    renderSpeed();
    requestKdj('pall');
  }
  function initSpeed() {
    SPKS.forEach(function (k) {
      var root = document.querySelector('.spblock[data-sp-tf="' + k.slice(1) + '"]');
      KB[k] = { root: root, val: root.querySelector('[data-vh]'), note: root.querySelector('[data-kn]'), ro: root.querySelector('[data-kro]'),
        win: root.querySelector('[data-kw]'), spn: root.querySelector('[data-spn]'), chart: root.querySelector('[data-kc]'),
        btns: Array.prototype.slice.call(root.querySelectorAll('[data-kz]')) };
      KB[k].btns.forEach(function (bt) { bt.addEventListener('click', function () { kCmd(k, bt.getAttribute('data-kz')); }); });
      attachGestures(KB[k].chart, 'k' + k, kCtl(k));
    });
    $('speedChips').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-spg]'); if (b) chooseSpeedG(b.getAttribute('data-spg')); });
    $('speedCards').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-spc]'); if (b) spCardTap(b); });
  }







  var FS = { sr: null, key: null, nodes: [], y: 0, pushed: false, pendingBack: false, queued: null, queuedPtr: false, at: -1e9, back: 0, vw: 0, vh: 0, off: 0 };
  var FS_SLOTS = ['head', 'note', 'chips', 'ro', 'bar', 'chart', 'legend'];
  function fsSlot(name) { return $('fs').querySelector('[data-fs="' + name + '"]'); }
  function fsHeight(holder) { return FS.key && holder.parentNode === fsSlot('chart') ? holder.clientHeight : null; }
  function fsParts(key) {
    if (VOL_FS[key]) {
      var VF = VOL_FS[key], vsec = $(VF.sec);
      return { label: VF.label + ', full screen', kicker: '', head: vsec.querySelector('.card-head'), ro: $(VF.ro), bar: vsec.querySelector('.zoombar'),
        chart: $(VF.chart), legend: $(VF.lg), chips: $('ranges') };
    }
    if (key === 'c1' || key === 'c2' || key === 'cv') {
      var P3 = { c1: ['daily', 'ro1', 'chart1', 'lg1', GW.title], c2: ['tf', 'ro2', 'chart2', 'lg2', GW.title + ' on 4 candle sizes'],
        cv: ['vs', 'roV', 'chartV', 'lgV', 'This crowd vs the market'] }[key], sec = $(P3[0]);
      return { label: P3[4] + ', full screen', kicker: '',
        head: sec.querySelector('.card-head'), ro: $(P3[1]), bar: sec.querySelector('.zoombar'),
        chart: $(P3[2]), legend: $(P3[3]), chips: $('ranges') };
    }
    var k = key.slice(1), B = KB[k];
    if (isVolK(k)) {
      var vc = k.charAt(0), vp = VC[vc].p, vw = vc === 's' ? 'Selling' : 'Buying';
      return { label: K_NAME[kTf(k)] + ' candles, ' + vw.toLowerCase() + ' volume KDJ, full screen',
        kicker: vw + ' volume · KDJ' + (VOLQ[vc] ? ' · ' + groupWords(VOLQ[vc].g).short : ''),
        head: B.root.querySelector('.kb-head'), note: B.note, ro: B.ro, bar: B.root.querySelector('.kb-bar'), chart: B.chart,
        legend: $(vp + 'KLg'), chips: $(vp + 'KCtl') };
    }
    if (kKind(k) === 'p') return { label: SP_CANDLES[kTf(k)] + ' candles, picking up or slowing down, full screen',
      kicker: 'Picking up or slowing down?' + (SPQ ? ' · ' + groupWords(SPQ.g).short : ''),
      head: B.root.querySelector('.kb-head'), note: B.note, ro: B.ro, bar: B.root.querySelector('.kb-bar'), chart: B.chart,
      legend: $('speedLg'), chips: $('speedChips') };
    if (isVk(k)) return { label: K_NAME[kTf(k)] + ' candles, this crowd vs the market, full screen', kicker: 'This crowd vs the market · ' + (VK.g ? groupWords(VK.g).short : ''),
      head: B.root.querySelector('.kb-head'), note: B.note, ro: B.ro, bar: B.root.querySelector('.kb-bar'), chart: B.chart,
      legend: $('lgVK'), chips: $('vkCtl') };
    return { label: K_NAME[k] + ' candles, fear meter KDJ, full screen', kicker: 'Fear meter · KDJ',
      head: B.root.querySelector('.kb-head'), note: B.note, ro: B.ro, bar: B.root.querySelector('.kb-bar'), chart: B.chart,
      legend: $('lg3'), chips: $('kranges') };
  }
  function fsMinH(key) {
    var short = window.innerHeight <= 540;
    if (key === 'c1') return short ? 180 : 220;
    if (key === 'cv') return short ? 190 : 280;
    if (key === 'c2') return fsSlot('chart').clientWidth >= 600 ? (short ? 204 : 260) : 470;
    if (key === 'cs') return short ? 226 : 520;
    if (key === 'cb') return short ? 200 : 430;
    if (key === 'cgs' || key === 'cgb') return short ? 190 : 280;
    return short ? 176 : 236;
  }
  function fsSize() { if (FS.key) { var m = fsMinH(FS.key) + 'px'; if (fsSlot('chart').style.flexBasis !== m) fsSlot('chart').style.flexBasis = m; } }
  function fsDraw(now) {
    if (!FS.key || !D) return;
    if (FS.key.charAt(0) === 'c') { if (now) { try { drawCharts(); } catch (e) { errWords(e); showFatal('The charts could not be drawn.'); } } else requestRender(); }
    else { requestKdj(FS.key.slice(1)); if (now) drawKdjPending(); }
  }
  function fsHint() {
    $('fsHint').textContent = HOVER ? 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click or Esc to close'
      : 'Pinch to zoom · drag sideways to move · tap to read · double-tap or ✕ to close';
  }
  function setInert(on) {
    ['.top', 'main', '.skip'].forEach(function (sel) {
      var n = document.querySelector(sel); if (!n) return;
      if ('inert' in n) n.inert = on;
      if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden');
    });
  }
  function fsFocus(n, ptr) {
    if (!n) return;
    n.classList.toggle('ptr-focus', !!ptr);
    try { n.focus({ preventScroll: true }); } catch (e) { }
  }
  function openFs(key, ptr) {
    if (!D || !doc || FS.key) return;
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
    try { history.pushState({ fearFs: key }, ''); FS.pushed = true; } catch (e) { FS.pushed = false; }
    document.body.style.top = -FS.y + 'px';
    document.documentElement.classList.add('fs-open');
    moves.forEach(function (m) { m.n.parentNode.insertBefore(m.ph, m.n); m.slot.appendChild(m.n); });
    var ov = $('fs');
    ov.setAttribute('aria-label', parts.label); ov.setAttribute('data-kind', key.charAt(0) === 'k' ? 'kdj' : key);
    $('fsKicker').textContent = parts.kicker; $('fsKicker').hidden = !parts.kicker;
    fsHint();
    ov.hidden = false; ov.scrollTop = 0;
    setInert(true);
    fsSize(); renderStatus(); renderViewUi(); renderKChips();
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

    if (doc && D) {
      try { drawCharts(); } catch (e) { errWords(e); showFatal('The charts could not be drawn.'); }
      TFS.concat(VKS, VOLKS.s, VOLKS.b, SPKS).forEach(function (k) { kPending[k] = 1; }); drawKdjPending();
    }
    renderKChips();


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
  function fsScrollAuto() {
    if (FS.key || FS.pendingBack || FS.sr == null) return;
    try { history.scrollRestoration = FS.sr; } catch (e) { }
    FS.sr = null;
  }
  function fsBackDone() {
    clearTimeout(FS.back); FS.pendingBack = false;
    if (Math.abs((window.pageYOffset || 0) - FS.y) > 0.5) window.scrollTo(0, FS.y);
    if (FS.queued) { var q = FS.queued; FS.queued = null; openFs(q, FS.queuedPtr); }
    else fsScrollAuto();
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

      var f = Array.prototype.filter.call($('fs').querySelectorAll('button, [tabindex="0"], a[href]'), function (n) {
        return !n.disabled && n.offsetParent !== null && !n.classList.contains('off');
      });
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
    var c1 = $('chart1'), c2 = $('chart2'), cv = $('chartV'), w1 = c1.clientWidth, w2 = c2.clientWidth, wv = cv.clientWidth;
    var h1 = fsHeight(c1), h2 = fsHeight(c2), hv = fsHeight(cv), showV = !!RF && !$('vs').hidden;
    var vw = {};
    VOL_CARDS.forEach(function (c) {
      if (!volShown(c)) return;
      var a = $(VC[c].p + 'Chart'), b = $(VC[c].p + 'GChart');
      vw[c] = { w: a.clientWidth, h: fsHeight(a), gw: b.clientWidth, gh: fsHeight(b) };
    });
    ['c1', 'c2', 'cv', 'cs', 'cb', 'cgs', 'cgb'].forEach(function (k) { if (hover[k] != null && (hover[k] < view.x0 || hover[k] > view.x1)) hover[k] = null; });

    var fv = VOL_FS[FS.key], tu = FS.key === 'c1' ? tickUnit(geo1(w1).pw) : FS.key === 'c2' ? tickUnit(geo2(w2).pw) : FS.key === 'cv' ? tickUnit(geoV(wv).pw) :
      fv && vw[fv.c] ? tickUnit(geoV(fv.g ? vw[fv.c].gw : vw[fv.c].w).pw) :
      Math.max(tickUnit(geo1(w1).pw), tickUnit(geo2(w2).pw), showV ? tickUnit(geoV(wv).pw) : 0,
        vw.s ? tickUnit(geoV(vw.s.w).pw) : 0, vw.b ? tickUnit(geoV(vw.b.w).pw) : 0);

    drawChart1(w1, tu, FS.key === 'c1' ? null : geo2(w2).pw, h1);
    if (!FS.key || FS.key === 'c2') drawChart2(w2, tu, h2);
    if (showV && (!FS.key || FS.key === 'cv')) drawChartV(wv, tu, hv);
    VOL_CARDS.forEach(function (c) {
      if (!vw[c]) return;
      var p = VC[c].p;
      try {
        if (!FS.key || FS.key === VC[c].key) drawVolChart(c, vw[c].w, tu, vw[c].h);
        if (!FS.key || FS.key === VC[c].gkey) drawVolGroups(c, vw[c].gw, tu, vw[c].gh);
        $(p + 'Err').hidden = true;
      } catch (e) { errWords(e); var eb = $(p + 'Err'); eb.hidden = false; eb.textContent = 'The ' + (c === 's' ? 'selling' : 'buying') + '-volume charts could not be drawn.'; }
    });
    layoutGauge();
    renderViewUi();
  }
  function renderAll() {
    if (!doc) return;
    $('content').hidden = false;
    renderStatus(); renderText(); renderVs();
    try { renderVkText(); $('vkErr').hidden = true; } catch (e) { var ev = $('vkErr'); ev.hidden = false; errWords(e); ev.textContent = 'The candle-size blocks could not be drawn.'; }
    try { renderBoard(); $('boardErr').hidden = true; } catch (e) { errWords(e); $('boardErr').hidden = false; }
    renderVol();
    try { drawCharts(); }
    catch (e) { errWords(e); showFatal('The charts could not be drawn.'); return; }
    try { renderKdjText(); } catch (e) { var er = $('kdjErr'); er.hidden = false; errWords(e); er.textContent = 'The KDJ section could not be drawn.'; }
    requestKdj('all'); requestKdj('vall'); requestKdj('sall'); requestKdj('ball'); requestKdj('pall'); drawKdjPending();

    if (!hashDone) {
      hashDone = true;
      var tg = location.hash && /^#[a-z0-9-]+$/i.test(location.hash) ? document.getElementById(location.hash.slice(1)) : null;
      if (tg && tg.closest('#content')) tg.scrollIntoView();
    }
  }
  var hashDone = false;
  function requestRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      if (!doc) return;
      try { drawCharts(); } catch (e) { errWords(e); showFatal('The charts could not be drawn.'); }
    });
  }

  function showFatal(msg) {
    doc = null; D = null; full = null; fullSha = null;
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'NO DATA';
    $('asof').textContent = 'Could not load the AI · semis · high-beta fear meter.';
    $('statusLine').textContent = ''; $('membersLine').textContent = '';
    var b = $('banners'); clear(b);
    if (preview) b.appendChild(banner('info', 'Preview data', 'Trying to read from ' + preview + ', not the live feed.'));
    b.appendChild(banner('bad', 'No numbers to show', msg + ' Nothing is shown rather than old or partial numbers. Try again in a few minutes.',
      { label: 'Try again', fn: function () { load(true); } }));
  }




  function pubErr(msg) { var e = new Error(msg); e.pub = true; return e; }
  function errWords(e) { try { console.warn('ai semis fear:', e); } catch (x) {  } return e && e.pub ? e.message : 'the data looked broken'; }
  function getJSON(name, url) {


    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    var bust = Math.floor(Date.now() / 60000);
    function fail(e) { throw pubErr(timedOut || (e && e.name === 'AbortError') ? name + ' timed out' : 'network error fetching ' + name); }
    return fetch((url || base + name) + '?m=' + bust, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        if (!r.ok) { clearTimeout(timer); throw pubErr(name + ': HTTP ' + r.status); }
        return r.text().then(function (t) {
          clearTimeout(timer);
          try { return JSON.parse(t); } catch (e) { throw pubErr(name + ' is not valid JSON'); }
        }, function (e) { clearTimeout(timer); fail(e); });
      }, function (e) { clearTimeout(timer); fail(e); });
  }

  function getJSONRetry(name, tries) {
    tries = tries == null ? 3 : tries;
    return getJSON(name).catch(function (e) {
      if (tries <= 1 || !(e && e.pub) || /HTTP 4|not valid JSON/.test(e.message)) throw e;
      return new Promise(function (res) { setTimeout(res, 1500); }).then(function () { return getJSONRetry(name, tries - 1); });
    });
  }
  var loading = false;

  function shaOf(m) { return m && m.files && m.files[DATA_FILE] ? m.files[DATA_FILE].sha256 || null : null; }
  function load(initial) {
    if (loading) return; loading = true;
    getJSONRetry('manifest.json').then(function (m) { volManSha = volShaOf(m); return m; }, function () { volManSha = undefined; return null; }).then(function (man) {
      var sha = shaOf(man);
      return getJSONRetry(DATA_FILE).then(function (f) {
        if (!validateFull(f)) throw pubErr('the data looked broken');
        var g0 = groupKeys(f)[0];
        var changed = !full || f.built_utc !== full.built_utc || f.groups[g0].generated_epoch !== (full.groups[g0] || {}).generated_epoch;
        fullSha = man && man.generated_utc === f.built_utc ? sha : null; loadedAt = now(); lastErr = null;
        if (!changed) { renderStatus(); return; }
        full = f;
        GROUPS = groupKeys(f); PRICES = priceKeys(f, GROUPS[0]);
        RF = prepareRef(f.ref);

        if (!grpChosen && f.meta.default_group && GROUPS.indexOf(f.meta.default_group) >= 0) grp = f.meta.default_group;
        if (GROUPS.indexOf(grp) < 0) grp = GROUPS.indexOf('all') >= 0 ? 'all' : GROUPS[0];
        if (urlPrice && PRICES.indexOf(urlPrice) < 0) urlPrice = null;
        if (pickedPrice && PRICES.indexOf(pickedPrice) < 0) pickedPrice = null;
        pp = urlPrice || pickedPrice || groupWords(grp).price;
        applySelection();
        renderAll();
      });
    }).catch(function (e) {
      var w = errWords(e);
      if (!doc) showFatal('Could not load the data (' + w + ').');
      else { lastErr = { at: now(), msg: w }; renderStatus(); }
    }).then(function () { loading = false; if (doc) loadVol(); });
  }
  function poll() {
    if (document.hidden) return;
    if (!full) { load(); return; }
    getJSON('manifest.json').then(function (m) {
      var sha = shaOf(m);
      volManSha = volShaOf(m);
      if (!sha || sha !== fullSha) load();
      else { lastErr = null; renderStatus(); loadVol(); }
    }).catch(function (e) { lastErr = { at: now(), msg: errWords(e) }; renderStatus(); });
  }




  function applySelection() {
    var hadView = !!D, wasLatest = hadView ? atLatest(view) : true, prevN = {}, prevS = {};
    TFS.forEach(function (k) { prevN[k] = KN[k]; prevS[k] = D && D.tf[k] ? D.tf[k].s : null; });
    doc = groupDoc(full, grp, pp); setWords(); D = prepare(doc);
    TFS.forEach(function (k) { KN[k] = D.kdj[k].n; });
    kdjAfterLoad(TFS, prevN, prevS);
    prepVkBlocks();
    prepVolBlocks('s'); prepVolBlocks('b'); prepSpeedBlocks();
    if (!hadView || !view.custom) view = rangeView(view.chip);
    else view = wasLatest ? toLatest(view, view.x0) : clampView(view);
    renderSelChips();
  }


  function renderSelChips() {
    if (!full) return;
    var gb = $('groups'), pb = $('prices');
    var gSig = GROUPS.map(function (g) { var w = groupWords(g); return g + ':' + w.short + ' ' + w.n; }).join('|'), pSig = PRICES.join('|');
    if (gb.getAttribute('data-sig') !== gSig) {
      clear(gb); gb.setAttribute('data-sig', gSig);
      GROUPS.forEach(function (g) {
        var w = groupWords(g), b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-g', g);
        b.appendChild(span('gc-n', w.short)); b.appendChild(span('gc-c', w.n != null ? ' ' + w.n : ''));
        b.setAttribute('aria-label', w.label + (w.n != null ? ', ' + w.n + ' stocks' : ''));
        gb.appendChild(b);
      });
    }
    if (pb.getAttribute('data-sig') !== pSig) {
      clear(pb); pb.setAttribute('data-sig', pSig);
      PRICES.forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-p', p); b.textContent = priceName(p);
        if (p === 'BASKET') b.setAttribute('aria-label', 'Basket (equal weight)');
        pb.appendChild(b);
      });
    }
    Array.prototype.forEach.call(gb.querySelectorAll('[data-g]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-g') === grp)); });
    Array.prototype.forEach.call(pb.querySelectorAll('[data-p]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-p') === pp)); });
  }
  function syncUrl() {
    try {
      var u = new URL(location.href); u.searchParams.set('g', grp);
      if (urlPrice || pickedPrice) u.searchParams.set('p', pp); else u.searchParams.delete('p');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    } catch (e) { }
  }
  function chooseGroup(g) {
    if (!full || g === grp || GROUPS.indexOf(g) < 0) return;
    grp = g; store('aisfGroup', g);
    if (!urlPrice && !pickedPrice) pp = groupWords(g).price;
    syncUrl();
    hover.c1 = hover.c2 = hover.cv = null;
    volFollowPage();
    applySelection(); renderAll();
  }
  function choosePrice(p) {
    if (!full || PRICES.indexOf(p) < 0) return;
    pickedPrice = p; urlPrice = null; store('aisfPrice', p);
    if (p === pp) { syncUrl(); return; }
    pp = p; syncUrl();
    hover.c1 = hover.c2 = hover.cv = null;
    hover.cs = hover.cb = hover.cgs = hover.cgb = null;
    applySelection(); renderAll();
  }





  var GOLD = '#FFD84D';
  var BOARD_TOP = 30;
  var bSort = { key: 'rank', dir: 1 };
  var bShowAll = false, bQuery = '';
  var TAGS = [['ai', 'AI'], ['semis', 'Semis'], ['hb', 'High beta']];
  var BCOLS = [
    { key: 'sym', label: 'Stock', dir: 1, val: function (r) { return r.sym; }, cls: 'b-stock' },
    { key: 'rank', label: 'Scared on', dir: 1, val: function (r) { return typeof r.rank === 'number' ? r.rank : null; }, cls: 'b-sc', tip: 'Daily, weekly, 2-week and monthly candles · most scared first' },
    { key: 'd1', label: '1D', dir: 1, val: function (r) { return r.d1; }, cls: 'b-num', tip: 'Change vs the previous close' },
    { key: 'm1', label: '1M', dir: 1, val: function (r) { return r.m1; }, cls: 'b-num', tip: 'Change vs the close 21 trading days ago' },
    { key: 'off', label: 'Off high', dir: -1, val: function (r) { return r.off_high; }, cls: 'b-num', tip: '% below the highest price of the last 52 weeks' },
    { key: 'beta', label: 'Beta', dir: -1, val: function (r) { return typeof r.beta === 'number' ? r.beta : null; }, cls: 'b-num b-beta', tip: '2-year beta vs SPY' },
    { key: 'last', label: 'Last', dir: -1, val: function (r) { return r.last; }, cls: 'b-num b-last' }];
  var PHONE_SORT = [['rank', 'Scared'], ['d1', '1D'], ['m1', '1M'], ['off', 'Off high'], ['beta', 'Beta']];
  function sortRows(rows) {
    var c = BCOLS.filter(function (x) { return x.key === bSort.key; })[0] || BCOLS[1], d = bSort.dir;
    return rows.map(function (r, i) { return { r: r, i: i, v: c.val(r) }; }).sort(function (a, b) {
      var an = a.v == null, bn = b.v == null;
      if (an || bn) return an && bn ? a.i - b.i : an ? 1 : -1;
      if (a.v < b.v) return -d; if (a.v > b.v) return d; return a.i - b.i;
    }).map(function (o) { return o.r; });
  }
  function signedPct(x, dp) {
    if (x == null) return '–';
    var t = Math.abs(x).toFixed(dp == null ? 1 : dp);
    return (+t === 0 ? '' : x > 0 ? '+' : '−') + t + '%';
  }
  function priceWord(x) { return x == null ? '–' : x >= 1000 ? x.toFixed(0) : x >= 1 ? x.toFixed(2) : x.toFixed(3); }
  function betaWord(x) { return typeof x === 'number' && isFinite(x) ? x.toFixed(2) : '–'; }
  var SC_KEY = { '1D': 'D', '1W': 'W', '2W': '2W', '1M': 'M' };
  function scaredDots(sc) {
    var w = span('scd', '');
    TFS.forEach(function (k) {
      var v = sc ? sc[k] : null, slot = span('sdw', '');
      slot.appendChild(span('sdk', SC_KEY[k]));
      var d = span('sd ' + (v === true ? 'on' : v === false ? 'off' : 'na'), v == null ? '–' : '');
      d.title = TF_WORD[k] + ': ' + (v === true ? 'scared' : v === false ? 'not scared' : 'too young for this candle size');
      slot.appendChild(d); w.appendChild(slot);
    });
    w.setAttribute('aria-label', TFS.map(function (k) { var v = sc ? sc[k] : null; return TF_WORD[k] + ' ' + (v === true ? 'scared' : v === false ? 'not scared' : 'too young'); }).join(', '));
    return w;
  }
  function tagChips(tags) {
    var w = span('tags', '');
    TAGS.forEach(function (t) { if (arr(tags) && tags.indexOf(t[0]) >= 0) w.appendChild(span('tag tag-' + t[0], t[1])); });
    return w;
  }
  function chgSpan(x) { return span(x == null ? 'muted' : x >= 0 ? 'up' : 'down', signedPct(x, 1)); }

  var FUND_ORDER = ['SMH', 'SOXX', 'QQQ', 'SPY'];
  function renderFunds() {
    var box = $('funds'); clear(box);
    var ks = Object.keys(full.funds || {}), order = FUND_ORDER.filter(function (k) { return ks.indexOf(k) >= 0; }).concat(ks.filter(function (k) { return FUND_ORDER.indexOf(k) < 0; }));
    $('fundsH').hidden = !order.length;
    order.forEach(function (sym) {
      var f = full.funds[sym]; if (!f) return;
      var t = document.createElement('div'); t.className = 'fund' + (sym === pp ? ' f-sel' : '');
      var h = document.createElement('div'); h.className = 'f-head';
      h.appendChild(span('b-sym', f.sym || sym)); h.appendChild(span('f-name', f.name || ''));
      h.appendChild(span('f-last', '$' + priceWord(f.last)));
      t.appendChild(h);
      var r = document.createElement('div'); r.className = 'f-row';
      r.appendChild(scaredDots(f.scared));

      var ch = span('f-ch', '');
      [['1D ', chgSpan(f.d1)], ['1M ', chgSpan(f.m1)], ['off high ', span('', signedPct(f.off_high == null ? null : -f.off_high, 1))]].forEach(function (o) {
        var it = span('f-i', ''); it.appendChild(span('k', o[0])); it.appendChild(o[1]); ch.appendChild(it);
      });
      r.appendChild(ch);
      t.appendChild(r);
      if (f.note && !/not counted/i.test(f.note)) t.appendChild(span('f-note', f.note));
      box.appendChild(t);
    });
  }
  function renderBoard() {
    var rows = full.board[grp] || [], st = doc.stats, cn = closedNow(), live = doc.state === 'LIVE';
    $('bSub').textContent = 'Each of the ' + rows.length + ' ' + GW.who + ', scared or not on each candle size ' + (cn ? 'at today’s close (preliminary)' : live ? 'today so far' : 'at the close') +
      ' · most scared first';
    var bl = $('bLine'); clear(bl);
    bl.appendChild(span('zw', st['1D'].below + ' of ' + st['1D'].n));
    bl.appendChild(span('', ' scared on the daily candle · ' + TFS.slice(1).map(function (k) { return TF_WORD[k] + ' ' + st[k].below + ' of ' + st[k].n; }).join(' · ')));
    renderFunds();

    var ps = $('bSort'); clear(ps);
    PHONE_SORT.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = o[1]; b.setAttribute('data-bs', o[0]);
      b.setAttribute('aria-pressed', String(bSort.key === o[0]));
      b.addEventListener('click', function () { sortBy(o[0]); });
      ps.appendChild(b);
    });
    var t = $('boardTable'); clear(t);
    var cap = document.createElement('caption'); cap.className = 'vh'; cap.textContent = 'Stocks of the group, sortable'; t.appendChild(cap);
    var th = t.createTHead().insertRow();
    BCOLS.forEach(function (c) {
      var h = document.createElement('th'); h.className = c.cls; h.scope = 'col';
      var on = bSort.key === c.key;
      h.setAttribute('aria-sort', on ? (bSort.dir === 1 ? 'ascending' : 'descending') : 'none');
      var b = document.createElement('button'); b.type = 'button'; b.className = 'b-sort' + (on ? ' on' : '');
      if (c.tip) b.title = c.tip;
      var arw = span('b-arr', on ? (bSort.dir === 1 ? '▲' : '▼') : '');
      if (c.key === 'rank') {
        b.className += ' b-sort-sc';
        var l1 = span('', c.label + ' '); l1.appendChild(arw); b.appendChild(l1);
        var lab = span('sc-lab', ''); TFS.forEach(function (k) { lab.appendChild(span('sdl', SC_KEY[k])); }); b.appendChild(lab);
      } else if (/b-num/.test(c.cls)) { b.appendChild(arw); b.appendChild(span('', c.label)); }
      else { b.appendChild(span('', c.label)); b.appendChild(arw); }
      b.addEventListener('click', function () { sortBy(c.key); });
      h.appendChild(b); th.appendChild(h);
    });
    var tb = t.createTBody();
    sortRows(rows).forEach(function (r) {
      var tr = tb.insertRow();
      tr._k = { s: String(r.sym || '').toLowerCase(), n: String(r.name || '').toLowerCase() };
      var c0 = tr.insertCell(); c0.className = 'b-stock';
      var l1 = span('b-l1', ''); l1.appendChild(span('b-sym', r.sym)); l1.appendChild(tagChips(r.tags)); c0.appendChild(l1);
      var l2 = span('b-name', r.name || '');
      if (r.theme) l2.appendChild(span('b-theme', ' · ' + r.theme));
      c0.appendChild(l2);
      var c3 = tr.insertCell(); c3.className = 'b-sc'; c3.appendChild(scaredDots(r.scared));
      [['d1', r.d1], ['m1', r.m1], ['off', r.off_high == null ? null : -r.off_high], ['beta', r.beta], ['last', r.last]].forEach(function (o) {
        var c = tr.insertCell(); c.className = 'b-num b-' + o[0];
        c.setAttribute('data-l', { d1: '1D', m1: '1M', off: 'off high', beta: 'β', last: '' }[o[0]]);
        if (o[0] === 'last') c.appendChild(span('', '$' + priceWord(o[1])));
        else if (o[0] === 'beta') c.appendChild(span('', betaWord(o[1])));
        else if (o[0] !== 'off') c.appendChild(chgSpan(o[1]));
        else { c.appendChild(span('', signedPct(o[1], 1))); if (r.high52_full === false) { var a = span('b-ast', '*'); a.title = 'listed less than a year: below its high since listing'; c.appendChild(a); } }
      });
    });
    applyBoardView();
    var lg = $('lgB'); clear(lg);
    function item(cls, text) { var s0 = span('lg-i', ''); s0.appendChild(span(cls, '')); s0.appendChild(document.createTextNode(text)); return s0; }
    lg.appendChild(item('sd on', 'scared on that candle (washed out)'));
    lg.appendChild(item('sd off', 'not scared'));
    lg.appendChild(item('sd-dash', 'too young for that candle size (not counted)'));
    lg.appendChild(document.createTextNode('1M = vs 21 trading days ago · off high = below the 52-week high (* listed less than a year: since listing) · beta = 2-year beta vs SPY'));
  }

  function boardMatch(k, q) { return k.s.indexOf(q) >= 0 || k.n.indexOf(q) >= 0; }
  function applyBoardView() {
    var tb = $('boardTable').tBodies[0]; if (!tb) return;
    var q = bQuery.trim().toLowerCase(), trs = tb.rows, n = trs.length, hits = 0, shown = 0;
    for (var i = 0; i < n; i++) {
      var tr = trs[i], hit = !q || boardMatch(tr._k, q);
      if (hit) hits++;
      var show = hit && (!!q || bShowAll || hits <= BOARD_TOP);
      if (tr.hidden === show) tr.hidden = !show;
      if (show) shown++;
    }
    var c = BCOLS.filter(function (x) { return x.key === bSort.key; })[0], def = bSort.key === 'rank' && bSort.dir === 1, cnt = $('bCount');
    var least = bSort.key === 'rank' && !def, by = ' by ' + c.label + (bSort.dir === 1 ? ' ▲' : ' ▼');
    if (q) cnt.textContent = hits ? hits + (hits === 1 ? ' stock matches' : ' stocks match') + ' “' + bQuery.trim() + '”' : 'No stock matches “' + bQuery.trim() + '”';
    else if (bShowAll || n <= BOARD_TOP) cnt.textContent = 'All ' + n + ' stocks' + (def ? ', most scared first' : least ? ', least scared first' : ',' + by);
    else cnt.textContent = def ? 'The ' + BOARD_TOP + ' most scared of ' + n : least ? 'The ' + BOARD_TOP + ' least scared of ' + n : 'The first ' + BOARD_TOP + ' of ' + n + by;
    var more = $('bMore');
    more.hidden = !!q || n <= BOARD_TOP;
    more.textContent = bShowAll ? 'Show the top ' + BOARD_TOP : 'Show all ' + n;
    more.setAttribute('aria-expanded', String(bShowAll));
  }
  function sortBy(key) {
    var c = BCOLS.filter(function (x) { return x.key === key; })[0]; if (!c) return;
    if (bSort.key === key) bSort.dir = -bSort.dir; else { bSort.key = key; bSort.dir = c.dir; }
    var a = document.activeElement, refocus = a && a.closest && a.closest('#board') ? (a.getAttribute('data-bs') ? '[data-bs="' + key + '"]' : null) : null;
    var hi = a && a.closest && a.closest('#boardTable th') ? Array.prototype.indexOf.call(a.closest('tr').children, a.closest('th')) : -1;
    renderBoard();
    if (hi >= 0) { var nb = $('boardTable').querySelectorAll('thead th button')[hi]; if (nb) nb.focus(); }
    else if (refocus) { var pb = $('bSort').querySelector(refocus); if (pb) pb.focus(); }
  }
  (function initBoardTools() {
    var inp = $('bSearch'), timer = 0;
    inp.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { bQuery = inp.value; if (full) applyBoardView(); }, 90);
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Escape' && inp.value) { e.preventDefault(); inp.value = ''; bQuery = ''; if (full) applyBoardView(); } });
    $('bMore').addEventListener('click', function () {
      bShowAll = !bShowAll; applyBoardView();
      if (!bShowAll) {
        var r = $('bMore').getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) $('bMore').scrollIntoView({ block: 'center' });
      }
    });
  })();


  (function initRange() {
    view.chip = normRange(params.get('range')) || normRange(stored('aisfRange')) || '2Y';
    renderViewUiChips();
  })();
  $('groups').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-g]'); if (b) chooseGroup(b.getAttribute('data-g')); });
  $('prices').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-p]'); if (b) choosePrice(b.getAttribute('data-p')); });
  $('vsMode').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-vs]'); if (b) chooseVs(+b.getAttribute('data-vs')); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-range]'), function (b) {
    b.addEventListener('click', function () { chooseRange(b.getAttribute('data-range')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-z]'), function (b) {
    b.addEventListener('click', function () { zoomCmd(b.getAttribute('data-z')); });
  });
  if (HOVER) Array.prototype.forEach.call(document.querySelectorAll('[data-zoomhint]'), function (n) {
    n.textContent = 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click for full screen';
  });
  (function initKRange() {
    kChip = normKRange(params.get('krange')) || normKRange(stored('aisfKdjRange')) || 'Auto';
    renderKChips();
  })();
  Array.prototype.forEach.call(document.querySelectorAll('[data-krange]'), function (b) {
    b.addEventListener('click', function () { chooseKRange(b.getAttribute('data-krange')); });
  });
  initFs();
  attachGestures($('chart1'), 'c1');
  attachGestures($('chart2'), 'c2');
  attachGestures($('chartV'), 'cv');
  initKdjBlocks();
  initVkBlocks();
  initVol();
  initSpeed();
  (function () {
    var t = document.querySelector('.tabs'), a = t && t.querySelector('[aria-current=page]');
    if (!a || t.scrollWidth <= t.clientWidth) return;
    var d = a.getBoundingClientRect().right - t.getBoundingClientRect().right;
    if (d > 0) t.scrollLeft += d;
  })();
  if ('ResizeObserver' in window) {
    var lastW = 0;
    new ResizeObserver(function (ents) {
      var w = Math.round(ents[0].contentRect.width);
      if (w !== lastW) { lastW = w; requestRender(); requestKdj('all'); requestKdj('vall'); requestKdj('sall'); requestKdj('ball'); requestKdj('pall'); }
    }).observe($('content'));
  } else window.addEventListener('resize', function () { requestRender(); requestKdj('all'); requestKdj('vall'); requestKdj('sall'); requestKdj('ball'); requestKdj('pall'); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  setInterval(function () { if (doc) renderStatus(); }, TICK_MS);
  setInterval(poll, POLL_MS);
  load(true);
})();
