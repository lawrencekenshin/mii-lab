























































(function () {
  'use strict';



  var GH = /(^|\.)github\.io$/i.test(location.hostname);
  var BASE = GH ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/ai-semis-breadth-data/ai-semis-breadth/' : 'snap/';
  var FILE = 'breadth.json';
  var POLL_MS = GH ? 5 * 60 * 1000 : 60 * 1000;
  var TICK_MS = 30 * 1000;
  var FETCH_TIMEOUT_MS = 20000;

  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: '#3987E5', light: '#8EC0FA', b200: '#F0883E', b200l: '#F7B57F', sp: '#7E57C2', spLine: '#9575CD', spl: '#B39DDB' };
  var GCOL = { ai: '#42A5F5', semis: '#FFA726', hb: '#EC407A', all: '#E6E8EE' };
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
  var TFS = ['1D', '1W', '2W', '1M'];
  var TF_NAME = { '1D': 'Daily candles', '1W': 'Weekly candles', '2W': '2-week candles', '1M': 'Monthly candles' };
  var TF_SHORT = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var GUIDE = { lo: 25, hi: 50 };
  var GAP_LINE = -15;


  var HOLIDAYS = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'];
  var HALF_DAYS = ['2026-11-27', '2026-12-24', '2027-11-26'];
  var CAL_END = '2027-12-31';


  var params = new URLSearchParams(location.search);
  var nowOverride = null;
  if (params.get('now')) { var t0 = Date.parse(params.get('now')); if (!isNaN(t0)) nowOverride = t0 - Date.now(); }
  function now() { return Date.now() + (nowOverride || 0); }
  var KEY_G = 'aisfGroup', KEY_P = 'aisfPrice', KEY_R = 'aisbRange', KEY_VK = 'aisbVsK';


  var GROUPS = [], PRICES = [];
  var DEFAULT_PRICE = { all: 'QQQ', ai: 'QQQ', semis: 'SMH', hb: 'BASKET' };
  function normGroup(s) { var u = String(s || '').trim().toLowerCase(); return /^[a-z0-9_]{1,24}$/.test(u) && (!GROUPS.length || GROUPS.indexOf(u) >= 0) ? u : null; }
  function normPrice(s) { var u = String(s || '').trim().toUpperCase(); return /^[A-Z0-9_.]{1,12}$/.test(u) && (!PRICES.length || PRICES.indexOf(u) >= 0) ? u : null; }
  function stored(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function store(key, v) { try { localStorage.setItem(key, v); } catch (e) {  } }
  var grpChosen = !!(normGroup(params.get('g')) || normGroup(stored(KEY_G)));
  var grp = normGroup(params.get('g')) || normGroup(stored(KEY_G)) || 'all';
  var urlPrice = normPrice(params.get('p'));
  var pickedPrice = normPrice(stored(KEY_P));
  var pp = urlPrice || pickedPrice || DEFAULT_PRICE[grp] || 'QQQ';
  var vsK = params.get('vk') === '200' ? 200 : params.get('vk') === '50' ? 50 : stored(KEY_VK) === '200' ? 200 : 50;

  var HOVER = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var TAP = HOVER ? 'hover' : 'tap';


  var $ = function (id) { return document.getElementById(id); };
  function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function dnDate(dn) { return new Date(dn * 864e5); }
  function fmtDay(dn, withYear, withWd) {
    var d = dnDate(dn);
    return (withWd ? WD[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (withYear ? ', ' + d.getUTCFullYear() : '');
  }
  function fmtMonYear(dn) { var d = dnDate(dn); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function pct0(v) { return v == null ? '–' : Math.round(v) + '%'; }
  function pct1(v) { return v == null ? '–' : v.toFixed(1) + '%'; }
  function isLive() { return !!full && full.as_of.state === 'LIVE'; }
  function closedNow() { return isLive() && !!full.live.session_closed; }
  function hm(epoch) { return fmtTz(epoch, 'America/New_York', '', false).trim(); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function arr(a, n) { return Array.isArray(a) && (n == null || a.length === n); }
  function cap1(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function bsearchLE(a, x) {
    var lo = 0, hi = a.length - 1, ans = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (a[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; }
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
    var hhmm = (p.h < 10 ? '0' : '') + p.h + ':' + (p.mi < 10 ? '0' : '') + p.mi;
    return (withDay === false ? '' : p.wd + ' ' + MON[p.mo - 1] + ' ' + p.d + ', ') + hhmm + ' ' + label;
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
  function niceStep(sp, target) {
    var raw = sp / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= raw) return steps[i] * mag;
    return 10 * mag;
  }



  var full = null, fullSha = null, G = null, D = null, loadedAt = 0, lastErr = null, uid = 0;
  var hover = { c1: null, cv: null, c3: null };


  var LISTEN = { data: [], group: [], price: [], range: [] };
  function emit(ev, arg) {
    LISTEN[ev].slice().forEach(function (fn) {
      try { fn(arg); } catch (e) { try { console.error('AISB "' + ev + '" handler failed:', e); } catch (x) {  } }
    });
  }
  function rangeKey() { return view.chip === 'All' ? 'ALL' : view.chip; }
  window.AISB = {
    data: function () { return full; },
    group: function () { return grp; },
    price: function () { return pp; },
    range: function () { return rangeKey(); },
    on: function (ev, fn) {
      if (!LISTEN[ev] || typeof fn !== 'function') return function () { };
      LISTEN[ev].push(fn);
      if (ev === 'data' && full) {
        var f0 = full;
        setTimeout(function () {
          if (full !== f0 || LISTEN.data.indexOf(fn) < 0) return;
          try { fn(full); } catch (e) { try { console.error('AISB "data" handler failed:', e); } catch (x) { } }
        }, 0);
      }
      return function () { var i = LISTEN[ev].indexOf(fn); if (i >= 0) LISTEN[ev].splice(i, 1); };
    }
  };



  function groupKeys(f) {
    var L = f.meta && arr(f.meta.groups) ? f.meta.groups.map(function (m) { return m && m.key; }).filter(function (k) { return k && f.groups[k]; }) : [];
    return L.length ? L : Object.keys(f.groups || {});
  }
  function priceKeys(f) {
    var L = f.meta && arr(f.meta.prices) ? f.meta.prices.filter(function (p) { return typeof p === 'string'; }) : [];
    return L.length ? L : ['QQQ', 'SMH', 'SPY', 'BASKET'];
  }
  function validGroup(f, g, ps) {
    var x = f.groups[g]; if (!x || typeof x !== 'object') return false;
    var si = x.start_i, n = f.days.length - si, i, k;
    if (typeof si !== 'number' || si < 0 || n < 300) return false;
    if (!x.v || !['v20', 'v50', 'v100', 'v200'].every(function (q) { return arr(x.v[q], n); })) return false;
    if (!x.daily || !['n', 'a50'].every(function (q) { return arr(x.daily[q], n); })) return false;
    if (!x.p13 || !['g20', 'g50', 'g100', 'g200'].every(function (q) { return arr(x.p13[q], n); })) return false;
    if (!x.pnow || !['g20', 'g50', 'g100', 'g200'].every(function (q) { return x.pnow[q] && typeof x.pnow[q] === 'object'; })) return false;
    for (i = 1; i < 4; i++) {
      k = TFS[i];
      var t = x.tf && x.tf[k];
      if (!t || !arr(t.ei) || t.ei.length < 10 || !['si', 'v50', 'v200'].every(function (q) { return arr(t[q], t.ei.length); }) ||
        !arr(x.p13[k], t.ei.length)) return false;
    }
    if (!x.wash || !TFS.every(function (q) { return arr(x.wash[q]); })) return false;
    if (!x.open || !x.hero || !x.hero.low || !x.text || !x.text.wash_state || !x.after || !x.prices) return false;
    if (!ps.every(function (p) { return arr(x.prices[p], n) && x.after[p] && arr(x.after[p].cells); })) return false;
    return x.daily.n[n - 1] > 0;
  }
  function validate(f) {
    if (!f || typeof f !== 'object' || f.schema !== 2 || f.kind !== 'ai-semis-breadth') return false;
    if (!arr(f.days) || f.days.length < 300 || !f.groups || !f.meta || !f.compare) return false;
    if (!f.as_of || (f.as_of.state !== 'LIVE' && f.as_of.state !== 'CLOSED')) return false;
    if (!f.live || !f.live.asof_utc || isNaN(Date.parse(f.live.asof_utc)) || !/^\d{4}-\d\d-\d\d$/.test(f.live.session_date || '')) return false;
    if (!f.candles || !TFS.every(function (k) { return f.candles[k]; })) return false;
    var gs = groupKeys(f), ps = priceKeys(f);
    return gs.length > 0 && gs.every(function (g) { return validGroup(f, g, ps); });
  }
  function hund(a) { return a.map(function (h) { return h == null ? null : h / 100; }); }



  function washOf(rows, n) {
    var W = { sig: [], rings: [], active: null, ends: {}, low: {}, vr: {}, lr: {} };
    (rows || []).forEach(function (r) {
      var i = r[0], end = r[1] < 0 ? n : r[1];
      W.sig.push(i); W.ends[i] = end; W.low[i] = r[2]; W.vr[i] = r[4]; W.lr[i] = r[5];
      if (r[3]) W.rings.push({ i: i, k: r[2] });
      if (end === n) W.active = { i: i, low: r[2] };
    });
    return W;
  }

  function refOn(key, si, n) {
    var R = full && full.ref && full.ref.on_days;
    return R && arr(R[key]) && R[key].length >= si + n ? hund(R[key].slice(si, si + n)) : null;
  }
  function prepare(f, g, p) {
    var X = f.groups[g], si = X.start_i, n = X.v.v50.length;
    var d = f.days.slice(si, si + n).map(dayNum);
    var P = { g: g, d: d, si: si, v: hund(X.v.v50), t: hund(X.v.v200), f20: hund(X.v.v20), f100: hund(X.v.v100),
      n: X.daily.n, a: X.daily.a50, spy: X.prices[p], tf: {}, cstat: {} };
    P.sp50 = refOn('v50', si, n);
    P.tf['1D'] = { s: d, e: d, v: P.v, t: P.t, a: P.a, n: P.n, p13: X.p13.g50, p13t: X.p13.g200 };
    ['1W', '2W', '1M'].forEach(function (k) {
      var t = X.tf[k];
      P.tf[k] = { s: t.si.map(function (i) { return d[i]; }), e: t.ei.map(function (i) { return d[i]; }), ei: t.ei,
        v: hund(t.v50), t: hund(t.v200), p13: X.p13[k], p13t: null };
    });
    P.last = d[n - 1];

    TFS.forEach(function (k) {
      var T = P.tf[k], j = T.v.length - 1, c = f.candles[k] || {};
      T.open = !!X.open[k]; T.closed = T.open ? T.v.length - 1 : T.v.length;
      P.cstat[k] = { latest: T.v[j], latest200: T.t[j], open: T.open, note: c.note || '', name: c.name || TF_NAME[k] };

      T.wash = washOf(X.wash[k], T.v.length);
      T.ringOf = {}; T.wash.rings.forEach(function (r) { T.ringOf[r.k] = r.i; });
      T.sigOf = {}; T.wash.sig.forEach(function (i) { T.sigOf[i] = 1; });
    });
    return P;
  }

  function episodeOf(T, j) {
    var s = T.wash.sig, w = null;
    for (var q = 0; q < s.length && s[q] <= j; q++) w = s[q];
    return w != null && T.wash.ends[w] > j ? w : null;
  }


  function gMeta(g) {
    var L = full && full.meta && arr(full.meta.groups) ? full.meta.groups : [];
    for (var i = 0; i < L.length; i++) if (L[i] && L[i].key === g) return L[i];
    var X = full && full.groups[g];
    return X ? { key: g, label: X.label, short: X.short, title: X.title, words: X.words, n_listed: X.n_listed, default_price: X.default_price } : {};
  }
  function gShort(g) { var m = gMeta(g); return m.short || m.label || g; }
  function priceHead(p) { var h = full && full.meta && full.meta.price_head; return (h && h[p]) || (p === 'BASKET' ? 'Basket' : p); }

  function priceWord(p) { var w = full && full.meta && full.meta.price_word; return (w && w[p]) || (p === 'BASKET' ? 'the basket' : p); }
  var PRICE_TITLE = { QQQ: 'QQQ (Nasdaq-100 fund)', SMH: 'SMH (VanEck semiconductor fund)', SPY: 'SPY (S&P 500 fund)',
    BASKET: 'Basket (equal weight of the counted stocks)' };
  function priceTitle(p) { return PRICE_TITLE[p] || priceHead(p); }
  function groupDefaultPrice(g) {
    var dp = String(gMeta(g).default_price || '').toUpperCase();
    return PRICES.indexOf(dp) >= 0 ? dp : PRICES.indexOf(DEFAULT_PRICE[g]) >= 0 ? DEFAULT_PRICE[g] : PRICES[0];
  }
  function startYear() { return dnDate(D.d[0]).getUTCFullYear(); }


  var PCT_BASES = { s13: { word: 'since 2013' }, s21: { word: 'since 2021' } };
  var RECENT_LOW_TIP = 'Recent low = the lowest 50-day reading of the last few weeks, the latest day included.';
  function ordinal(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
  function rankOf(r, p) {
    if (r == null) return null;
    return { r: r, p: p == null ? r : p, low: r === 0, record: r === 100, ord: r === 0 ? 'lowest' : ordinal(r) };
  }


  function pctCandle(k, j, key) {
    var T = D.tf[k], x = (key === 't' ? T.t : T.v)[j], N = G.pnow, latest = k === '1D' && j === T.v.length - 1;
    var o = { k: k, j: j, x: x, open: j >= T.closed, s13: null, s21: null };
    if (key === 't') {
      o.s13 = latest ? rankOf(N.g200.r13) : T.p13t ? rankOf(T.p13t[j]) : null;
      if (latest) o.s21 = rankOf(N.g200.r21);
      return o;
    }
    if (latest) { o.s13 = rankOf(N.g50.r13, N.g50.p13); o.s21 = rankOf(N.g50.r21); }
    else o.s13 = rankOf(T.p13[j]);
    return o;
  }
  function recentLow() {
    var L = G.hero.low;
    return { k: '1D', j: L.i, x: D.v[L.i], open: !!L.open, s13: rankOf(L.r13, L.p) };
  }
  function pctWord(r) { return r ? (r.low ? 'lowest' : r.ord) : '–'; }
  function rankWord(r, base) {
    if (!r) return '';
    if (r.low) return 'lowest ' + PCT_BASES[base || 's13'].word;
    if (r.record) return 'highest ' + PCT_BASES[base || 's13'].word;
    return r.r <= 50 ? 'bottom ' + Math.max(1, r.r) + '%' : 'top ' + Math.max(1, 100 - r.r) + '%';
  }
  function soFar(k, R) { return !R.open ? '' : (k === '1D' && closedNow() ? ' (prelim.)' : ' so far'); }
  var PK_TXT = '#E8C547';


  function status() {
    var t = now(), live = full.live, asof = Date.parse(live.asof_utc), age = t - asof;
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
    if (isLive() && !live.session_closed) {
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
    if (isLive() && live.session_closed) {
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
  function asofWords() {
    var sessDn = dayNum(full.live.session_date);
    return isLive() && !full.live.session_closed ? 'as of ' + hm(Date.parse(full.live.asof_utc)) + ' ET' :
      'close of ' + fmtDay(sessDn, false, true) + (isLive() ? ' (preliminary)' : '');
  }
  function renderStatus() {
    if (!full || !G) return;
    var s = status();
    var chip = $('chip'); chip.className = 'chip chip-' + s.cls; chip.textContent = s.chip;
    var sessDn = dayNum(full.live.session_date), L0 = full.live, head;
    if (isLive() && !L0.session_closed) {
      var pr = L0.prices_asof_utc ? Date.parse(L0.prices_asof_utc) : s.asof - 15 * 6e4;
      head = 'Today so far · prices ~' + hm(pr) + ' ET (15-min delayed) · built ' + hm(s.asof) + ' ET' + localTail(s.asof, false);
    } else if (isLive()) {
      head = 'Close of ' + fmtDay(sessDn, false, true) + ' (preliminary) · built ' + etAndLocal(s.asof);
    } else {
      head = 'Close of ' + fmtDay(sessDn, false, true) + ' · built ' + etAndLocal(s.asof);
    }
    $('asof').textContent = head;
    $('statusLine').textContent = s.line;

    var m = gMeta(grp), extra = [], y = G.young || {};
    if (G.hist200 != null && G.hist200 < G.n_now) extra.push(G.hist200 + ' with 200 days of history');
    if (y['200']) extra.push(y['200'] + ' with fewer than 200 closes counted as above');
    if (G.n_no_bars > 0) extra.push(G.n_no_bars + ' without bars');
    $('membersLine').textContent = (full.meta.members_line ? full.meta.members_line + '. ' : '') + 'This view: ' + (m.label || gShort(grp)) + ' · ' +
      G.n_now + ' of ' + G.n_listed + ' counted on the latest day' + (extra.length ? ' (' + extra.join(', ') + ')' : '') + '.';

    ['asof1', 'asofV', 'asof4'].forEach(function (id) {
      var p = $(id); clear(p);
      var flagged = s.cls === 'late' || s.cls === 'stale';
      p.hidden = id === 'asof1' && !flagged;
      if (flagged) p.appendChild(chipEl(s));
      p.appendChild(span('', asofWords()));
    });

    var fst = $('fsStatus'); clear(fst);
    fst.appendChild(chipEl(s));
    fst.appendChild(span('', asofWords()));

    var b = $('banners'); clear(b);
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


  function nowWords() { return closedNow() ? 'at today’s close (preliminary)' : isLive() ? 'today so far' : 'at the close'; }
  function renderText() {
    var st = D.cstat, live = isLive(), s1 = st['1D'], sessDn = dayNum(full.live.session_date), cn = closedNow();
    $('t1name').textContent = G.title || gMeta(grp).title || 'Breadth';
    $('t1sub').textContent = 'How many of the ' + G.n_listed + ' ' + G.words + ' are above their 50-day and 200-day averages' +
      (D.sp50 ? ' · dashed white = the S&P 500’s 50-day line' : '');
    $('heroK').textContent = '50-day';
    $('heroV').textContent = pct0(s1.latest);
    $('heroV2').textContent = s1.latest200 == null ? '' : pct0(s1.latest200);
    $('heroV2k').textContent = s1.latest200 == null ? '' : '200-day';
    $('heroDate').textContent = (cn ? 'today’s close (prelim.) · ' : live ? 'today so far · ' : 'last close · ') + fmtDay(sessDn, true, true) +
      (live ? ' · as of ' + fmtTz(Date.parse(full.live.asof_utc), 'America/New_York', 'ET', false) : '');
    renderHeroPct();
    renderHeroSp();

    var zl = $('zoneLine'); clear(zl);
    var zt = String(G.text.zone_line || ''), cut = zt.indexOf(' — ');
    if (cut > 0) { zl.appendChild(span('zw', zt.slice(0, cut))); zl.appendChild(span('', zt.slice(cut))); }
    else zl.appendChild(span('', zt));
    var W = G.text.wash_state || {}, wsn = $('washState'); clear(wsn);
    if (W.on && W.lead) { var b = document.createElement('b'); b.textContent = W.lead; wsn.appendChild(b); }
    wsn.appendChild(document.createTextNode(W.body || ''));
    wsn.hidden = !W.body;
    $('howTo').textContent = G.text.how_to_read || '';
    $('zoneKey').textContent = G.text.zone_key || '';
    var pl = G.text.price_line && G.text.price_line[pp];
    $('rightNow').textContent = (G.text.right_now || '') + (pl ? ' ' + pl : '');
    var c = full.compare[grp] && full.compare[grp].k50;
    $('rightVs').textContent = c && c.line ? c.line : '';
    $('rightVs').hidden = !(c && c.line);
    renderLegends();
  }

  function renderHeroSp() {
    var p = $('heroSp'); clear(p);
    var c = full.compare[grp] && full.compare[grp].k50;
    p.hidden = !c || c.sp_now == null;
    if (p.hidden) return;
    p.appendChild(document.createTextNode('S&P 500 ' + pct1(c.sp_now) + ' → '));
    if (c.gap_now == null) { p.appendChild(span('muted', 'not updated for this day yet')); return; }
    var g = Math.abs(c.gap_now);
    p.appendChild(span('hs-gap', g < 0.05 ? 'level with the market' : g.toFixed(1) + ' pts ' + (c.dir || (c.gap_now < 0 ? 'below' : 'above')) + ' the market'));
    if (spBehind()) p.appendChild(span('muted', ' (S&P not updated for this day yet)'));
  }


  function spBehind() {
    var m = full.compare.now_meta || {};
    return m.sp_aligned === false && !!m.sp_session && !!m.session && m.sp_session < m.session;
  }

  var GAUGE_BANDS = [[0, 1, '#6AA8F7'], [1, 5, '#3F80DA'], [5, 10, '#3263A8'], [10, 20, '#2A4A79'], [20, 50, '#263553'], [50, 100, '#232A3B']];
  var GAUGE_TICKS = [0, 5, 10, 20, 50, 100], GAUGE_TICK_PRIO = [0, 50, 100, 10, 5, 20];
  var heroPk = null, heroNow = null, gaugeKey = '';
  function bandsInto(bar) {
    GAUGE_BANDS.forEach(function (b) {
      var s = document.createElement('span'); s.className = 'g-band';
      s.style.left = b[0] + '%'; s.style.width = (b[1] - b[0]) + '%'; s.style.background = b[2];
      bar.appendChild(s);
    });
  }
  function renderHeroPct() {
    var k = '1D', last = D.tf[k].v.length - 1, R = pctCandle(k, last), Pk = recentLow(), R2 = pctCandle(k, last, 't');
    heroNow = R; heroPk = Pk;
    var hp = $('heroPct'); clear(hp);
    hp.appendChild(span('hp-b', pctWord(R.s13) + (R.s13 && R.s13.low ? '' : ' percentile'))); hp.appendChild(document.createTextNode(' since 2013'));
    hp.appendChild(span('hp-sep', ' · ')); hp.appendChild(span('hp-2', pctWord(R.s21) + ' since 2021'));
    if (R2.s13) { hp.appendChild(span('hp-sep', ' · ')); hp.appendChild(span('hp-2', '200-day ' + pctWord(R2.s13))); }
    var pk = $('heroPeak'); clear(pk);
    var same = Pk.j === last, pdn = D.tf[k].e[Pk.j];
    var pkt = span('hp-rule', same ? 'today is the recent low' : 'recent low ' + pct1(Pk.x) + ' (' + fmtDay(pdn, false) + ') = ' + pctWord(Pk.s13) + (Pk.open ? ' so far' : ''));
    pkt.title = RECENT_LOW_TIP; pk.appendChild(pkt);
    pk.title = RECENT_LOW_TIP;
    var g = $('gauge1'); clear(g);
    g.setAttribute('aria-label', 'Percentile gauge of the 50-day line since 2013: now ' + pctWord(R.s13) + (same ? '' : ', recent low ' + pctWord(Pk.s13)));
    var labs = document.createElement('div'); labs.className = 'g-labs'; g.appendChild(labs);
    var bar = document.createElement('div'); bar.className = 'g-bar'; bandsInto(bar); g.appendChild(bar);
    var mk = function (cls, p) { var m = document.createElement('i'); m.className = 'g-m ' + cls; m.style.left = Math.max(0, Math.min(100, p)).toFixed(2) + '%'; bar.appendChild(m); return m; };
    if (!same && Pk.s13) mk('g-m-pk' + (R.s13 && Math.abs(Pk.s13.p - R.s13.p) < 1.5 ? ' g-m-near' : ''), Pk.s13.p);
    if (R.s13) mk('g-m-now', R.s13.p);
    if (!same && Pk.s13) labs.appendChild(span('g-lab g-lab-pk', fmtDay(pdn, false) + ' low ' + pctWord(Pk.s13)));
    labs.appendChild(span('g-lab g-lab-now', same ? 'now = recent low · ' + pctWord(R.s13) : 'now ' + pctWord(R.s13)));
    var tk = document.createElement('div'); tk.className = 'g-ticks'; g.appendChild(tk);
    GAUGE_TICKS.forEach(function (t) { var s = span('g-t', String(t)); s.setAttribute('data-t', t); tk.appendChild(s); });
    g.appendChild(span('g-cap', '50-day line, percentile since 2013 · deeper blue = rarer (fewer stocks above)'));
    gaugeKey = ''; layoutGauge();
  }

  function layoutGauge() {
    var g = $('gauge1'); if (!g || !heroNow || !g.firstChild) return;
    var W = g.clientWidth, key = W + '|' + (full && full.built_utc) + '|' + grp; if (!W || key === gaugeKey) return;
    gaugeKey = key;
    var labs = g.querySelector('.g-labs'), L = [];
    Array.prototype.forEach.call(labs.children, function (s) {
      var pk = s.classList.contains('g-lab-pk'), r = pk ? heroPk.s13 : heroNow.s13;
      L.push({ s: s, w: s.offsetWidth, c: (r ? r.p : 0) / 100 * W, row: 0 });
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
  function legendItem(cls, text, color) {
    var s = span('lg-i', ''), sw = span(cls, '');
    if (color) sw.style.borderTopColor = color;
    s.appendChild(sw); s.appendChild(document.createTextNode(text)); return s;
  }
  var SPEED_C = { 20: '#4DD0E1', 50: C.fear, 100: '#A99BFF', 200: C.b200 };
  var SPEED_L = { 20: '#A6EEF6', 50: C.light, 100: '#D2CAFF', 200: C.b200l };
  function renderLegends() {
    var l1 = $('lg1'); clear(l1);
    l1.appendChild(legendItem('lg-b50', '% above 50-day average'));
    l1.appendChild(legendItem('lg-b200', '% above 200-day average'));
    if (D.sp50) l1.appendChild(legendItem('lg-spd', 'S&P 500, 50-day (the Breadth page)'));
    l1.appendChild(legendItem('lg-pk', 'washout (same day on ' + priceWord(pp) + ')'));
    l1.appendChild(legendItem('lg-ring', 'deepest close of that washout'));
    l1.appendChild(legendItem('lg-now', 'now'));
    l1.appendChild(legendItem('lg-nowring', 'now, in a washout (dashed = so far)'));
    l1.appendChild(legendItem('lg-wash', 'washout line'));
    l1.appendChild(legendItem('lg-rearm', 're-arm line'));
    var l4 = $('lg4'); clear(l4);
    var last = D.d.length - 1, V = { 20: D.f20, 50: D.v, 100: D.f100, 200: D.t };
    [20, 50, 100, 200].forEach(function (n) {
      var it = legendItem('lg-spd4', n + '-day', SPEED_C[n]);
      it.appendChild(span('lg-v', pct0(V[n][last])));
      l4.appendChild(it);
    });
    l4.appendChild(legendItem('lg-pk', 'washout (50-day line only; same day on ' + priceWord(pp) + ')'));
    l4.appendChild(legendItem('lg-now', 'now'));
  }


  function renderSpeedsText() {
    $('t5name').textContent = (G.title || 'Breadth') + ' at 4 speeds';
    $('t5sub').textContent = '% of the ' + G.n_listed + ' ' + G.words + ' above their 20-, 50-, 100- and 200-day averages';
    var last = D.d.length - 1, V = { 20: D.f20, 50: D.v, 100: D.f100, 200: D.t }, N = G.pnow;
    var parts = [20, 50, 100, 200].map(function (n) { return n + '-day ' + pct0(V[n][last]) + ' (' + pctWord(rankOf(N['g' + n].r13)) + ')'; });
    $('spNow').textContent = cap1(G.words) + ' above their average ' + nowWords() + ': ' + parts.join(' · ') + '. Percentiles since 2013; low = rare.';
  }


  function renderAfter() {
    var A = G.after[pp];
    $('afterSub').textContent = 'Every daily washout of the 50-day line of the ' + G.words + ' since ' + startYear() + ', and what ' + priceWord(pp) + ' did next';
    var tiles = $('studyTiles'); clear(tiles);
    (A.tiles || []).forEach(function (o) {
      var t0 = document.createElement('div'); t0.className = 'tile' + (o.hl ? ' hl' : '');
      t0.appendChild(span('t-k', o.k));
      var vv = document.createElement('div'); vv.className = 't-v'; vv.textContent = o.v;
      if (o.small) { var sm = document.createElement('small'); sm.textContent = o.small; vv.appendChild(sm); }
      t0.appendChild(vv);
      if (o.note) { var nn = document.createElement('div'); nn.className = 't-n'; nn.textContent = o.note; t0.appendChild(nn); }
      tiles.appendChild(t0);
    });
    var t = $('washTable'); clear(t);
    var cap = document.createElement('caption');
    cap.textContent = 'Every daily washout since ' + startYear() + ', newest first (' + priceHead(pp) + ' price, not total return)';
    t.appendChild(cap);


    var wide = { 2: 1, 3: 1, 6: 1, 7: 1 }, narrow = { 1: 1 };
    var cols = arr(A.cols) ? A.cols : [];
    var hr = t.insertRow();
    function hideCls(i) { return wide[i] ? 'wide-only ' : narrow[i] ? 'n420 ' : ''; }
    cols.forEach(function (c, i) { var th = document.createElement('th'); th.textContent = c; th.className = hideCls(i).trim(); hr.appendChild(th); });
    (A.cells || []).forEach(function (cells, q) {
      var r = t.insertRow();
      if (q === A.now_i) r.className = 'now';
      cells.forEach(function (c, i) { var td = r.insertCell(); td.textContent = c[0]; td.className = (hideCls(i) + (c[1] || '')).trim(); });
    });
    if (arr(A.sum) && A.sum.length) {
      var rs = t.insertRow(); rs.className = 'sum';
      A.sum.forEach(function (c, i) { var td = rs.insertCell(); td.textContent = c[0]; td.className = hideCls(i).trim(); });
    }
    $('studySrc').textContent = A.src || '';
  }


  function renderVsText() {
    var c = full.compare[grp] && full.compare[grp]['k' + vsK], meta = full.compare.now_meta || {};
    Array.prototype.forEach.call($('vsK').querySelectorAll('[data-vsk]'), function (b) { setAttr(b, 'aria-pressed', String(+b.getAttribute('data-vsk') === vsK)); });
    $('vsSub').textContent = 'AI, semis and high-beta stocks (lines' + (grp === 'all' ? '; white = all ' + G.n_listed : '') + ') against the S&P 500 (purple area): % above their ' +
      vsK + '-day average, every day. Lower panel: each group minus the S&P 500, in points.';
    $('vsLine').textContent = c && c.line ? c.line : '';
    var note = $('vsNote'), behind = spBehind();
    note.hidden = !behind;
    note.textContent = behind ? 'S&P not updated for this day yet: its latest reading is ' + (meta.sp_is_live ? 'from ' : 'the close of ') + fmtDay(dayNum(meta.sp_session), true) + '.' : '';
    renderLegendV();
    renderVsTable();
  }
  function renderLegendV() {
    var l = $('lgV'); clear(l);
    vsGroups().forEach(function (k) {
      var m = gMeta(k), it = legendItem('lg-gl', m.label || gShort(k), GCOL[k]);
      l.appendChild(it);
    });
    if (full.ref) { var sa = span('lg-i', ''); sa.appendChild(span('lg-sa', '')); sa.appendChild(document.createTextNode('S&P 500 (' + (full.ref.members_listed || 500) + ', the Breadth page)')); l.appendChild(sa); }
    if (vsK === 50) l.appendChild(legendItem('lg-wash', 'washout line'));
    l.appendChild(legendItem('lg-gapln', GAP_LINE + ' pts: much weaker than the market'));
  }


  function renderVsTable() {
    var t = $('vsTable'); clear(t);
    var nt = full.compare.now_table;
    t.hidden = !nt;
    if (!nt) return;
    var cap = document.createElement('caption');
    cap.textContent = 'Latest day, % above the average (points vs the S&P 500)'; t.appendChild(cap);
    var hr = t.insertRow();
    ['', '20-day', '50-day', '100-day', '200-day'].forEach(function (h) { var th = document.createElement('th'); th.textContent = h; th.scope = 'col'; hr.appendChild(th); });
    var sp = nt.sp || {}, SPN = [20, 50, 100, 200];
    GROUPS.forEach(function (g) {
      var row = nt[g]; if (!row) return;
      var r = t.insertRow(); if (g === grp) r.className = 'on';
      var th = document.createElement('th'); th.scope = 'row';
      var sw = document.createElement('i'); sw.style.background = GCOL[g] || C.muted; th.appendChild(sw);
      th.appendChild(document.createTextNode(gShort(g))); r.appendChild(th);
      SPN.forEach(function (n) {
        var v = row['v' + n], s = sp['v' + n], c = r.insertCell();
        c.appendChild(span('vt-v', v == null ? '–' : pct1(v / 100)));
        if (v != null && s != null) {
          var dg = (v - s) / 100, a = Math.abs(dg).toFixed(1);
          c.appendChild(span('vt-g' + (dg < -0.05 ? ' neg' : dg > 0.05 ? ' pos' : ''), (+a === 0 ? '' : dg > 0 ? '+' : '−') + a));
        }
      });
    });
    var rs = t.insertRow(); rs.className = 'sp';
    var th2 = document.createElement('th'); th2.scope = 'row'; th2.textContent = 'S&P 500'; rs.appendChild(th2);

    var nm = full.compare.now_meta || {}, same = full.ref && full.ref.latest && full.ref.latest.d === nm.session;
    var PN = same && full.ref.pnow ? full.ref.pnow : {};
    SPN.forEach(function (n) {
      var v = sp['v' + n], c = rs.insertCell(), R = PN['sp' + n] ? rankOf(PN['sp' + n].r13) : null;
      c.appendChild(span('vt-v', v == null ? '–' : pct1(v / 100)));
      if (v != null && R) c.appendChild(span('vt-g', pctWord(R)));
    });
  }


  function washCell(k) {
    var T = D.tf[k], A = T.wash.active;
    if (!A) return 'no washout';
    return 'washout ' + (A.i === T.v.length - 1 && T.open ? 'so far' : 'since ' + fmtDay(T.e[A.i], false));
  }
  function renderTables() {
    var t = $('tfTable'); clear(t);
    var cap = document.createElement('caption'); cap.textContent = 'Latest readings (% of ' + G.words + ' above their average)'; t.appendChild(cap);
    var cols = [['Line', ''], ['Now', ''], ['Pctl 2013+', ''], ['2021+', 'w'], ['Washout', ''], ['Candle', 'w']];
    var hr = t.insertRow();
    cols.forEach(function (c) { var th = document.createElement('th'); th.textContent = c[0]; if (c[1]) th.className = 'wide-only'; hr.appendChild(th); });

    function row(cells) {
      var r = t.insertRow();
      cells.forEach(function (x, i) {
        var c = r.insertCell(); if (cols[i][1]) c.className = 'wide-only';
        if (Array.isArray(x)) { c.appendChild(document.createTextNode(x[0])); if (x[1]) c.appendChild(span('wide-only', x[1])); }
        else c.textContent = x;
      });
    }
    function pctCell(R) { return [pctWord(R), R ? ' · ' + rankWord(R) : '']; }
    TFS.forEach(function (k) {
      var T = D.tf[k], j = T.v.length - 1, R = pctCandle(k, j);
      row([TF_SHORT[k] + ' · 50-day', pct1(T.v[j]) + soFar(k, R), pctCell(R.s13), pctWord(R.s21), washCell(k), D.cstat[k].note]);
    });
    var last = D.d.length - 1, N = G.pnow;
    [[20, D.f20], [100, D.f100], [200, D.t]].forEach(function (o) {
      var R13 = rankOf(N['g' + o[0]].r13), R21 = rankOf(N['g' + o[0]].r21);
      row(['Daily · ' + o[0] + '-day', pct1(o[1][last]), pctCell(R13), pctWord(R21), '', D.cstat['1D'].note]);
    });
    var ref = full.ref;
    if (ref && ref.latest) {
      [[50, 'sp50'], [200, 'sp200']].forEach(function (o) {
        var v = ref.latest['v' + o[0]], P = ref.pnow && ref.pnow[o[1]], R13 = P ? rankOf(P.r13) : null, R21 = P ? rankOf(P.r21) : null;
        row(['S&P 500 · ' + o[0] + '-day', v == null ? '–' : pct1(v / 100), pctCell(R13), pctWord(R21), '',
          ref.latest.d ? (ref.is_live ? 'as of ' : 'close of ') + fmtDay(dayNum(ref.latest.d), false) : '']);
      });
    }
    var dtb = $('dayTable'); clear(dtb);
    cap = document.createElement('caption'); cap.textContent = 'Last 15 days, daily candles'; dtb.appendChild(cap);
    hr = dtb.insertRow();
    var dcols = [['Day', ''], ['20-day', ''], ['50-day', ''], ['100-day', 'w'], ['200-day', ''], ['Pctl 2013+', 'w'], ['Counted', 'w'], ['S&P 50-day', 'w'], [priceHead(pp), 'w']];
    dcols.forEach(function (h) { var th = document.createElement('th'); th.textContent = h[0]; if (h[1]) th.className = 'wide-only'; hr.appendChild(th); });
    var T1 = D.tf['1D'];
    for (var i = last; i >= Math.max(0, D.d.length - 15); i--) {
      var r = dtb.insertRow(), tag = (i === last && isLive()) ? (closedNow() ? ' (prelim.)' : ' (so far)') : '';
      [fmtDay(D.d[i], false, true) + tag + (T1.sigOf[i] ? ' · washout' : ''), pct1(D.f20[i]), pct1(D.v[i]), pct1(D.f100[i]), pct1(D.t[i]),
        pctWord(pctCandle('1D', i).s13), D.a[i] + ' of ' + D.n[i], D.sp50 ? pct1(D.sp50[i]) : '–',
        D.spy[i] == null ? '–' : D.spy[i].toFixed(2)].forEach(function (v, q) { var c = r.insertCell(); c.textContent = v; if (dcols[q][1]) c.className = 'wide-only'; });
    }
  }


  var RULE_NAMES = { above: 'Above its average', members: 'Members', series: 'Series start', washout: 'Washout', zones: 'Zones',
    percentiles: 'Percentile', candles: 'Weekly, 2-week, monthly', kdjwash: 'KDJ washout meter', newlows: 'New 52-week lows',
    after: 'After past washouts', thin: 'Thin rally check', thrust: 'Thrust tracker' };
  function renderFoot() {
    var ff = $('footFoot'); clear(ff);
    (arr(full.meta.foot) ? full.meta.foot : []).forEach(function (s) { var p = document.createElement('p'); p.textContent = s; ff.appendChild(p); });
    var dl = $('footRules'); clear(dl);
    var R = full.meta.rules || {};
    Object.keys(R).forEach(function (k) {
      if (typeof R[k] !== 'string') return;
      var dt = document.createElement('dt'); dt.textContent = RULE_NAMES[k] || cap1(k); dl.appendChild(dt);
      var dd = document.createElement('dd'); dd.textContent = R[k]; dl.appendChild(dd);
    });
    var ref = full.ref, parts = [];
    if (ref) {
      var rd = ref.as_of && ref.as_of.session ? fmtDay(dayNum(ref.as_of.session), true) : null;
      parts.push('S&P 500 line: the Breadth page’s copy' + (rd ? ', ' + (ref.is_live ? 'as of ' : 'close of ') + rd : '') + '.');
    }
    if (full.meta.lists_asof && /^\d{4}-\d\d-\d\d$/.test(full.meta.lists_asof)) parts.push('Lists as of ' + fmtDay(dayNum(full.meta.lists_asof), true) + '.');
    parts.push('Built ' + etAndLocal(Date.parse(full.built_utc)) + '. No cookies, no tracking.');
    $('footData').textContent = parts.join(' ');
  }




  var RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120, 'All': 0 };
  var RANGE_WORDS = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year',
    '2Y': 'last 2 years', '5Y': 'last 5 years', '10Y': 'last 10 years' };
  var MIN_SPAN = 14;
  var ZOOM_STEP = 1.6;
  var view = { chip: '5Y', x0: 0, x1: 0, custom: false };

  function normRange(s) {
    if (!s) return null;
    var u = String(s).trim().toUpperCase();
    if (u === 'ALL') return 'All';
    return RANGE_MONTHS.hasOwnProperty(u) ? u : null;
  }
  function padFor(sp) { return Math.max(1, sp * 0.02); }
  function hiEdge(sp) { return D.last + padFor(sp); }
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
    var lim = spanLimits(), x0 = v.x0, x1 = v.x1, sp = Math.max(lim.min, Math.min(lim.max, x1 - x0));
    if (Math.abs(sp - (x1 - x0)) > 1e-9) { var c = (x0 + x1) / 2; x0 = c - sp / 2; x1 = c + sp / 2; }
    var hi = hiEdge(sp);
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
    if (!view.custom) return view.chip === 'All' ? 'all data since ' + dnDate(D.d[0]).getUTCFullYear() : RANGE_WORDS[view.chip];
    var a = D.d[Math.min(D.d.length - 1, lowerBound(D.d, view.x0))], b = D.d[Math.max(0, bsearchLE(D.d, view.x1))];
    var nb = function (str) { return str.replace(/ /g, ' '); };
    if (b - a > 150) return fmtMonYear(a) === fmtMonYear(b) ? nb(fmtMonYear(a)) : nb(fmtMonYear(a)) + ' – ' + nb(fmtMonYear(b));
    return dnDate(a).getUTCFullYear() === dnDate(b).getUTCFullYear() ? nb(fmtDay(a, false)) + ' – ' + nb(fmtDay(b, true)) : nb(fmtDay(a, true)) + ' – ' + nb(fmtDay(b, true));
  }


  function lowerBound(a, x) { var lo = 0, hi = a.length; while (lo < hi) { var m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; }
  function visIdx(a, x0, x1) { return { i0: lowerBound(a, x0), i1: bsearchLE(a, x1) }; }

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
      var lab = fmt(v);
      if (lab != null) tx(g, side === 'right' ? xR + 5 : xL - 5, py + 3.5, lab, { fill: C.muted, 'font-size': 11, 'text-anchor': side === 'right' ? 'start' : 'end' });
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
    yTicks(g, Y, yt, left + w, left, function (q) { return q.toFixed(dec); }, 'right');
    timeGrid(g, X, ticks, top, top + h);
    var P = decimate(D.d, D.spy, Math.max(0, bsearchLE(D.d, x0)), Math.min(D.d.length - 1, lowerBound(D.d, x1)), X, keep);
    el('path', { d: pathOf(P, Y), fill: 'none', stroke: C.text, 'stroke-width': 1.1, 'stroke-linejoin': 'round', 'clip-path': clipFor(svg, left, top, w, h) }, g);
    Y.dots = el('g', {}, g);
    var ts = labelSize || 12.5, lab = w < 360 ? priceHead(pp) : priceTitle(pp);
    tx(g, left + 8, top + 16, lab, withHalo({ fill: C.text, 'font-size': ts }));
    Y.titleBox = { x: left + 6, y: top + 16 - ts - 1, w: textW(lab, ts) + 4, h: ts + 5 };
    return Y;
  }


  function spyR(W) { return W < 640 ? 2.4 : 3; }
  function spyDots(Y, X, days, r, rNow, todayIn, left, w, hollowDay) {
    var out = [], li = D.d.length - 1, nw = todayIn && D.spy[li] != null ? { x: X(D.last), y: Y(D.spy[li]) } : null;
    days.forEach(function (dn) {
      var i = bsearchLE(D.d, dn); if (i < 0 || D.d[i] !== dn || D.spy[i] == null) return;
      var x = X(dn), y = Y(D.spy[i]);
      if (x < Math.max(left, r + 0.5) || x > left + w || overlaps(Y.titleBox, dotBox(x, y, r))) return;
      if (nw && Math.hypot(x - nw.x, y - nw.y) < rNow + 5 + r) return;
      if (dn === hollowDay) hollowDot(Y.dots, x, y, r); else peakDot(Y.dots, x, y, r);
      out.push(dn);
    });
    if (nw) nowDot(Y.dots, nw.x, nw.y, rNow);
    return out;
  }


  function breadthPaths(g, X, Y, T, x0, x1, clip, lw, plotW) {
    var n = T.v.length, dots = [], j;
    function plain(vs) { return pathOf(decimate(T.e, vs, Math.max(0, bsearchLE(T.e, x0)), Math.min(n - 1, lowerBound(T.e, x1)), X), Y); }
    var l200 = plain(T.t), l50 = plain(T.v);
    var vi = visIdx(T.e, x0, x1), inView = vi.i1 - vi.i0 + 1;
    if (inView > 0 && plotW / inView >= 9) for (j = vi.i0; j <= vi.i1; j++) dots.push(j);
    if (l200) el('path', { d: l200, fill: 'none', stroke: C.b200, 'stroke-width': lw, 'stroke-opacity': 0.95, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    if (l50) el('path', { d: l50, fill: 'none', stroke: C.fear, 'stroke-width': lw + 0.2, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    dots.forEach(function (k) { if (T.v[k] != null) el('circle', { cx: X(T.e[k]).toFixed(1), cy: Y(T.v[k]).toFixed(1), r: 1.8, fill: C.light, 'fill-opacity': 0.55 }, g); });
  }

  function spDashed(g, X, Y, vs, x0, x1, clip, narrow) {
    if (!vs) return;
    var P = decimate(D.d, vs, Math.max(0, bsearchLE(D.d, x0)), Math.min(D.d.length - 1, lowerBound(D.d, x1)), X);
    if (P.px.length) el('path', { d: pathOf(P, Y), fill: 'none', stroke: '#FFFFFF', 'stroke-width': narrow ? 1 : 1.15, 'stroke-opacity': 0.62,
      'stroke-dasharray': '4 3', 'stroke-linejoin': 'round', 'clip-path': clip, 'data-sp': '1' }, g);
  }
  function lineWidth(sp, narrow) { return sp > 2600 ? (narrow ? 0.8 : 1) : sp > 420 ? (narrow ? 1 : 1.2) : sp > 100 ? 1.4 : 1.7; }

  function breadthY(top, h, padTop) { return lin(0, 100, top + h - 3, top + (padTop == null ? 7 : padTop)); }
  function breadthTicks(Y) { return Math.abs(Y(0) - Y(25)) >= 20 ? [0, 25, 50, 75, 100] : [0, 50, 100]; }

  function washLines(g, Y, left, w, noRearm) {
    var py = Y(GUIDE.lo), pr = Y(GUIDE.hi);
    if (!noRearm) el('line', { x1: left, x2: left + w, y1: pr, y2: pr, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '3 4', 'stroke-opacity': 0.8 }, g);
    el('line', { x1: left, x2: left + w, y1: py, y2: py, stroke: DOT.peak, 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.7 }, g);
  }


  function washLabel(g, Y, left, w, label, size, obstacles, top, bot) {
    var py = Y(GUIDE.lo), lw = textW(label, size) + 6, h = size + 4;
    var spots = [[left + 6, py - h - 2], [left + 6, py + 2], [left + w * 0.3, py - h - 2], [left + w * 0.3, py + 2]];
    for (var i = 0; i < spots.length; i++) {
      var b = { x: spots[i][0], y: spots[i][1], w: lw, h: h };
      if (b.y < top + 1 || b.y + b.h > bot - 1 || b.x + b.w > left + w - 2) continue;
      if ((obstacles || []).some(function (o) { return overlaps(o, b); })) continue;
      el('rect', { x: b.x.toFixed(1), y: b.y.toFixed(1), width: b.w.toFixed(1), height: b.h, rx: 2, fill: C.panel, 'fill-opacity': 0.85 }, g);
      tx(g, b.x + 3, b.y + size + 0.5, label, { fill: '#E8C547', 'font-size': size });
      return b;
    }
    return null;
  }
  var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
  function withHalo(a) { for (var k in HALO) a[k] = HALO[k]; return a; }


  var DOT = { peak: '#FFD84D', edge: C.bg, nowCore: '#EEF5FF', now200: '#FFE2C7' };
  function peakDot(g, x, y, r) { el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: DOT.peak, stroke: DOT.edge, 'stroke-width': r > 3 ? 1.6 : 1.3 }, g); }
  function hollowDot(g, x, y, r) { el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: C.bg, stroke: DOT.peak, 'stroke-width': r > 3 ? 2 : 1.6 }, g); }
  function ringDot(g, x, y, r) {
    el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r + 1.5, fill: 'none', stroke: C.bg, 'stroke-width': 3.6, 'stroke-opacity': 0.8 }, g);
    el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r + 1.5, fill: 'none', stroke: DOT.peak, 'stroke-width': 1.8 }, g);
  }
  function nowDot(g, x, y, r, orange) {
    var c = orange ? C.b200l : C.light;
    el('circle', { cx: x, cy: y, r: r + 5, fill: c, 'fill-opacity': 0.16, stroke: c, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
    el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: c, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
    el('circle', { cx: x, cy: y, r: r, fill: orange ? DOT.now200 : DOT.nowCore, stroke: '#fff', 'stroke-width': 1.4 }, g);
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
  var GEO = { c1: null, cv: null, c3: null };
  function paneTitle(g, x, y, str) {
    tx(g, x, y, str, withHalo({ fill: C.muted, 'font-size': 11, 'font-weight': 700, 'letter-spacing': '0.04em' }));
    var w = textW(str, 11, 700) + str.length * 0.44;
    return { x: x - 2, y: y - 11, w: w + 4, h: 15 };
  }


  function geo1(Wraw) { var W = Math.max(280, Math.round(Wraw)), narrow = W < 640, L = narrow ? 2 : 30; return { W: W, narrow: narrow, L: L, pw: W - L - (narrow ? 30 : 40) }; }
  function geoV(Wraw) { var W = Math.max(280, Math.round(Wraw)), narrow = W < 640, L = narrow ? 2 : 30; return { W: W, narrow: narrow, L: L, pw: W - L - (narrow ? 34 : 44) }; }


  function washRing(g, x, y, r, dashed) {
    el('circle', { cx: x, cy: y, r: r + 3.4, fill: 'none', stroke: C.bg, 'stroke-width': 3.6, 'stroke-opacity': 0.7 }, g);
    el('circle', { cx: x, cy: y, r: r + 3.4, fill: 'none', stroke: DOT.peak, 'stroke-width': 2, 'stroke-dasharray': dashed ? '3 2' : null }, g);
  }

  function episodeLow(T, i) { var lo = i; T.wash.rings.forEach(function (r) { if (r.i === i) lo = r.k; }); return lo; }
  function drawChart1(Wraw, tu, hFs) {
    var gm = geo1(Wraw), holder = $('chart1'), W = gm.W, narrow = gm.narrow, phone = W < 480;
    var L = gm.L, pw = gm.pw;
    var spyH = narrow ? 112 : 210, gap = narrow ? 12 : 26, mH = narrow ? 270 : 380;
    if (hFs) {
      gap = hFs < 420 ? 10 : narrow ? 12 : 20;
      var av1 = hFs - 24 - gap;
      spyH = Math.round(av1 * 0.34); mH = av1 - spyH;
    }
    var mTop = spyH + gap, H = mTop + mH + 24;
    var x0 = view.x0, x1 = view.x1, span1 = x1 - x0, X = lin(x0, x1, L, L + pw);
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu);
    var T1 = D.tf['1D'], last = D.d.length - 1, keep = {};
    T1.wash.sig.forEach(function (i) { keep[i] = 1; });
    var spyY = spyPanel(svg, X, x0, x1, L, 0, pw, spyH, 12.5, ticks, keep);
    var g = el('g', {}, svg), st = D.cstat['1D'], todayIn = D.last >= x0 && D.last <= x1, live = isLive();
    panelRect(g, L, mTop, pw, mH);
    var Y = breadthY(mTop, mH, 8);
    yTicks(g, Y, breadthTicks(Y), L + pw, L, String, 'right', mTop);
    timeGrid(g, X, ticks, mTop, mTop + mH);
    if (!narrow) tx(g, 12, mTop + mH / 2, '% of stocks above their average', { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mTop + mH / 2) + ')' });
    var clip = clipFor(svg, L, mTop, pw, mH);
    washLines(g, Y, L, pw);
    spDashed(g, X, Y, D.sp50, x0, x1, clip, narrow);
    breadthPaths(g, X, Y, T1, x0, x1, clip, lineWidth(span1, narrow), pw);
    var obstacles = [];
    var tx0 = X(D.last), ty = Y(st.latest), ty2 = st.latest200 == null ? null : Y(st.latest200);
    var rNow = narrow ? 5 : 6, rPk = narrow ? (span1 > 2600 ? 3 : 4) : 4.5, open1 = T1.open;
    if (todayIn) { obstacles.push(nowBox(tx0, ty, rNow)); if (ty2 != null) obstacles.push(nowBox(tx0, ty2, rNow - 1)); }


    var cands = [];
    T1.wash.sig.forEach(function (i) {
      if (i === last || D.d[i] < x0 || D.d[i] > x1) return;
      var x = X(D.d[i]); if (x >= Math.max(L, rPk + 0.5) && x <= L + pw) cands.push({ dn: D.d[i], i: i, v: D.v[i], x: x, y: Y(D.v[i]) });
    });
    cands.sort(function (a, b) { return T1.wash.vr[a.i] - T1.wash.vr[b.i]; });
    var dots = thinDots(cands, rPk, obstacles.slice(), 2 * spyR(W) + 1.5);
    var rings = [];
    T1.wash.rings.forEach(function (r) {
      if (r.k === last || D.d[r.k] < x0 || D.d[r.k] > x1) return;
      var x = X(D.d[r.k]), y = Y(D.v[r.k]);
      if (x < L + rPk + 2 || x > L + pw - rPk - 2) return;
      if (dots.some(function (d) { return Math.hypot(d.x - x, d.y - y) < 2 * rPk + 2; })) return;
      rings.push({ dn: D.d[r.k], i: r.k, v: D.v[r.k], x: x, y: y, of: r.i });
    });
    dots.forEach(function (d) { var b = dotBox(d.x, d.y, rPk); b.dn = d.dn; obstacles.push(b); });
    rings.forEach(function (d) { var b = dotBox(d.x, d.y, rPk + 2); b.dn = d.dn; obstacles.push(b); });

    var lab = el('g', {}, svg);
    function todayLabel(str, yy, fill, size) {
      var tw = textW(str, size, 700), tlx = Math.max(L + 4 + tw, Math.min(tx0 - 9, L + pw - 4));
      var tries = [yy - 10, yy + size + 8, yy - size - 16];
      for (var q = 0; q < tries.length; q++) {
        var b = { x: tlx - tw - 2, y: tries[q] - size, w: tw + 4, h: size + 5 };
        if (b.y < mTop + 2 || b.y + b.h > mTop + mH - 2) continue;
        if (obstacles.some(function (o) { return overlaps(o, b); })) continue;
        tx(lab, tlx, tries[q], str, withHalo({ fill: fill, 'font-size': size, 'font-weight': 700, 'text-anchor': 'end' }));
        obstacles.push(b); return b;
      }
      return null;
    }
    if (todayIn) {
      var ts = narrow ? 12 : 13, pre = closedNow() ? 'close (prelim.) ' : live ? 'so far ' : 'last close ';
      todayLabel(pre + pct1(st.latest), ty, C.light, ts);
      if (ty2 != null) todayLabel('200-day ' + pct1(st.latest200), ty2, C.b200l, ts - 1);
    }

    var placed = 0, maxLabels = phone ? 4 : narrow ? 5 : 9, long = span1 > 240;
    var eps = T1.wash.sig.map(function (i) { return { i: i, lo: episodeLow(T1, i) }; })
      .filter(function (e) { return e.lo !== last && D.d[e.lo] >= x0 && D.d[e.lo] <= x1; })
      .sort(function (a, b) { return T1.wash.lr[a.i] - T1.wash.lr[b.i]; });
    eps.forEach(function (e) {
      if (placed >= maxLabels) return;
      var dn = D.d[e.lo], px = X(dn), py = Y(D.v[e.lo]), dd = dnDate(dn);
      var drawn = dots.some(function (d) { return d.i === e.lo; }) || rings.some(function (d) { return d.i === e.lo; });
      if (!drawn) return;
      var big = Math.round(D.v[e.lo]) + '%', small = long ? MON[dd.getUTCMonth()] + (phone ? ' ’' + String(dd.getUTCFullYear()).slice(2) : ' ' + dd.getUTCFullYear()) : fmtDay(dn, false);
      var s1 = phone ? 12 : 12.5, s2 = phone ? 10.5 : 11.5, w = Math.max(textW(big, s1, 700), textW(small, s2, 400)) + 4, bh = s1 + s2 + 3;
      var rr = rPk + 3, box = null, offs = [0, w / 2 + rr, -(w / 2 + rr)];
      var ys = [py + rr + 1, py - rr - 1 - bh];
      for (var yi = 0; yi < ys.length && !box; yi++) {
        for (var oi = 0; oi < offs.length && !box; oi++) {
          var cx = Math.max(L + 2 + w / 2, Math.min(L + pw - 2 - w / 2, px + offs[oi]));
          var b = { x: cx - w / 2, y: ys[yi], w: w, h: bh };
          if (b.y < mTop + 2 || b.y + b.h > mTop + mH - 2) continue;
          if (obstacles.some(function (o) { return o.dn !== dn && overlaps(o, b); })) continue;
          box = b;
        }
      }
      if (!box) return;
      obstacles.push(box);
      tx(lab, box.x + w / 2, box.y + s1, big, withHalo({ fill: C.white, 'font-size': s1, 'font-weight': 700, 'text-anchor': 'middle' }));
      tx(lab, box.x + w / 2, box.y + s1 + s2 + 1, small, withHalo({ fill: C.text, 'font-size': s2, 'text-anchor': 'middle' }));
      placed++;
    });
    washLabel(lab, Y, L, pw, 'washout line', narrow ? 11 : 11.5, obstacles, mTop, mTop + mH);
    var dotG = el('g', {}, svg);
    rings.forEach(function (d) { ringDot(dotG, d.x, d.y, rPk); });
    dots.forEach(function (d) { peakDot(dotG, d.x, d.y, rPk); });
    var nowG = el('g', {}, svg), lastSig = !!T1.sigOf[last];
    if (todayIn) {
      if (ty2 != null) nowDot(nowG, tx0, ty2, rNow - 1, true);
      nowDot(nowG, tx0, ty, rNow);

      if (T1.wash.active) washRing(nowG, tx0, ty, rNow, lastSig && open1);
    }
    var spyDays = dots.map(function (d) { return d.dn; }); if (lastSig) spyDays.push(D.last);
    var spyShown = spyDots(spyY, X, spyDays, spyR(W), narrow ? 3.5 : 4, todayIn, L, pw, open1 && lastSig ? D.last : null);
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var i = dn == null ? D.d.length - 1 : bsearchLE(D.d, dn);
      if (dn != null && D.d[i] >= x0 && D.d[i] <= x1) {
        var px = X(D.d[i]);
        el('line', { x1: px, x2: px, y1: 0, y2: mTop + mH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (D.spy[i] != null) el('circle', { cx: px, cy: spyY(D.spy[i]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
        if (D.sp50 && D.sp50[i] != null) el('circle', { cx: px, cy: Y(D.sp50[i]), r: 3, fill: '#FFFFFF', stroke: C.bg, 'stroke-width': 1.2 }, cross);
        if (D.t[i] != null) el('circle', { cx: px, cy: Y(D.t[i]), r: 3.8, fill: C.b200, stroke: '#fff', 'stroke-width': 1.1 }, cross);
        el('circle', { cx: px, cy: Y(D.v[i]), r: 4.5, fill: C.fear, stroke: '#fff', 'stroke-width': 1.2 }, cross);
      }
      readout1(i, dn != null);
    }
    var snap = dots.map(function (d) { return { x: d.x, y: d.y, dn: d.dn }; }).concat(rings.map(function (d) { return { x: d.x, y: d.y, dn: d.dn }; }));
    spyShown.forEach(function (dn) { snap.push({ x: X(dn), y: spyY(D.spy[bsearchLE(D.d, dn)]), dn: dn }); });
    if (todayIn) snap.push({ x: tx0, y: ty, dn: D.last });
    GEO.c1 = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.c1);
  }
  function spyChange(i) {
    if (i < 1 || D.spy[i] == null || D.spy[i - 1] == null) return null;
    return (D.spy[i] / D.spy[i - 1] - 1) * 100;
  }


  function washTag(k, j) {
    var T = D.tf[k], last = T.v.length - 1;
    if (T.sigOf[j]) return j === last && T.open ? 'washout so far' : 'washout';
    if (T.ringOf[j] != null) return 'deepest close of the ' + fmtDay(T.e[T.ringOf[j]], false) + ' washout';
    var ep = episodeOf(T, j);
    return ep != null ? 'in a washout (' + (k === '1D' ? 'day ' : 'candle ') + (j - ep + 1) + ')' : '';
  }
  function priceRo(ro, i) {
    ro.appendChild(span('', ' · ' + priceHead(pp) + ' '));
    ro.appendChild(span('px', D.spy[i] == null ? '–' : D.spy[i].toFixed(2)));
    var ch = spyChange(i);
    if (ch != null) ro.appendChild(span(ch >= 0 ? 'up' : 'down', ' ' + (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(2) + '%'));
  }
  function readout1(i, picked) {
    var ro = $('ro1'); clear(ro);
    var isLast = i === D.d.length - 1, lv = isLive() && isLast;
    ro.appendChild(span('d', fmtDay(D.d[i], true, true) + (lv ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    ro.appendChild(span('', ' · 50-day '));
    ro.appendChild(span('p', pct1(D.v[i])));
    var R = pctCandle('1D', i), T = D.tf['1D'];
    ro.appendChild(span('', ' (' + T.a[i] + ' of ' + T.n[i] + ') · '));
    ro.appendChild(span('pc', pctWord(R.s13) + (R.s13 && R.s13.low ? '' : ' percentile') + soFar('1D', R)));
    if (D.t[i] != null) { ro.appendChild(span('', ' · 200-day ')); ro.appendChild(span('p2', pct1(D.t[i]))); }
    if (D.sp50) { ro.appendChild(span('', ' · S&P 500 ')); ro.appendChild(span('sp', pct1(D.sp50[i]))); }
    priceRo(ro, i);
    var wt = washTag('1D', i);
    if (wt) ro.appendChild(span('pk', ' · ' + wt));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }


  var VS3 = ['ai', 'semis', 'hb'];
  function vsGroups() {
    var gs = VS3.filter(function (g) { return full.groups[g] && GROUPS.indexOf(g) >= 0; });
    if (grp === 'all' && full.groups.all) gs.unshift('all');
    return gs;
  }
  var VSC = null;
  function prepVs() {
    var key = full.built_utc + '|' + vsK;
    if (VSC && VSC.key === key) return VSC;
    var n = full.days.length, R = full.ref && full.ref.on_days && arr(full.ref.on_days['v' + vsK], n) ? full.ref.on_days['v' + vsK] : null;
    var o = { key: key, d: full.days.map(dayNum), sp: R ? hund(R) : null, g: {} };
    GROUPS.forEach(function (g) {
      var X = full.groups[g], si = X.start_i, src = X.v['v' + vsK], v = new Array(n), gp = new Array(n);
      for (var i = 0; i < n; i++) {
        var h = i >= si ? src[i - si] : null;
        v[i] = h == null ? null : h / 100;
        gp[i] = h == null || !R || R[i] == null ? null : (h - R[i]) / 100;
      }
      o.g[g] = { v: v, gap: gp };
    });
    VSC = o; return o;
  }
  function gapTick(v) { var r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '') + String(Math.abs(r)); }
  function gapWord1(x) { var t = Math.abs(x).toFixed(1); return (+t === 0 ? '' : x > 0 ? '+' : '−') + t; }
  function drawChartV(Wraw, tu, hFs) {
    var M = prepVs(), gs = vsGroups(), xs = M.d, n = xs.length, i;
    var gm = geoV(Wraw), holder = $('chartV'), W = gm.W, narrow = gm.narrow, L = gm.L, pw = gm.pw;
    var tH = narrow ? 240 : 340, gap = narrow ? 12 : 18, gH = narrow ? 132 : 170;
    if (hFs) { gap = hFs < 420 ? 8 : 14; var av = hFs - 24 - gap; tH = Math.round(av * 0.62); gH = av - tH; }
    var gTop = tH + gap, H = gTop + gH + 24;
    var x0 = view.x0, x1 = view.x1, X = lin(x0, x1, L, L + pw), lw = lineWidth(x1 - x0, narrow);
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu);
    var a = Math.max(0, bsearchLE(xs, x0)), b = Math.min(n - 1, lowerBound(xs, x1)), vi = visIdx(xs, x0, x1);

    var g = el('g', {}, svg);
    panelRect(g, L, 0, pw, tH);
    var Y = breadthY(0, tH, 24);
    yTicks(g, Y, breadthTicks(Y), L + pw, L, String, 'right', 0);
    timeGrid(g, X, ticks, 0, tH);
    var clip = clipFor(svg, L, 0, pw, tH), y0 = Y(0).toFixed(1);
    if (M.sp) {
      var PS = decimate(xs, M.sp, a, b, X);
      if (PS.px.length) {
        var sl = pathOf(PS, Y);
        el('path', { d: sl + 'L' + PS.px[PS.px.length - 1].toFixed(1) + ' ' + y0 + 'L' + PS.px[0].toFixed(1) + ' ' + y0 + 'Z', fill: C.sp, 'fill-opacity': 0.42, stroke: 'none', 'clip-path': clip }, g);
        el('path', { d: sl, fill: 'none', stroke: C.spLine, 'stroke-width': Math.max(0.8, lw - 0.2), 'stroke-opacity': 0.85, 'stroke-linejoin': 'round', 'clip-path': clip, 'data-sp': '1' }, g);
      }
    }
    if (vsK === 50) washLines(g, Y, L, pw, true);
    var order = gs.filter(function (k) { return k !== grp; }).concat(gs.indexOf(grp) >= 0 ? [grp] : []);
    order.forEach(function (k) {
      var P = decimate(xs, M.g[k].v, a, b, X);
      if (P.px.length) el('path', { d: pathOf(P, Y), fill: 'none', stroke: GCOL[k], 'stroke-width': lw + (k === grp ? 0.45 : 0.05), 'stroke-opacity': k === 'all' ? 0.9 : 0.95, 'stroke-linejoin': 'round', 'clip-path': clip, 'data-g': k }, g);
    });
    var t1 = paneTitle(g, L + 7, 15, '% ABOVE THEIR ' + vsK + '-DAY AVERAGE');

    var gg = el('g', {}, svg);
    panelRect(gg, L, gTop, pw, gH);
    var gmin = GAP_LINE - 4, gmax = 5;
    gs.forEach(function (k) { var A = M.g[k].gap; for (i = vi.i0; i <= vi.i1; i++) if (A[i] != null) { gmin = Math.min(gmin, A[i]); gmax = Math.max(gmax, A[i]); } });
    var gpad = (gmax - gmin) * 0.06, Yg = lin(gmin - gpad, gmax + gpad, gTop + gH - 3, gTop + 22);
    var step = niceStep(gmax - gmin, narrow ? 3 : 4), yt = [];
    while (Math.abs(Yg(0) - Yg(step)) < 17) step *= 2;
    for (var v = Math.ceil((gmin - gpad) / step) * step; v <= gmax + gpad + 1e-9; v += step) yt.push(Math.round(v * 1000) / 1000);
    yTicks(gg, Yg, yt, L + pw, L, gapTick, 'right', gTop);
    timeGrid(gg, X, ticks, gTop, gTop + gH);
    var zy = Yg(0), clipG = clipFor(svg, L, gTop, pw, gH);
    el('line', { x1: L, x2: L + pw, y1: zy.toFixed(1), y2: zy.toFixed(1), stroke: C.muted, 'stroke-width': 1, 'stroke-opacity': 0.9 }, gg);
    var gl = Yg(GAP_LINE);
    el('line', { x1: L, x2: L + pw, y1: gl.toFixed(1), y2: gl.toFixed(1), stroke: DOT.peak, 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.8 }, gg);
    order.forEach(function (k) {
      var P = decimate(xs, M.g[k].gap, a, b, X);
      if (P.px.length) el('path', { d: pathOf(P, Yg), fill: 'none', stroke: GCOL[k], 'stroke-width': Math.max(0.9, lw - 0.1) + (k === grp ? 0.35 : 0), 'stroke-opacity': 0.95, 'stroke-linejoin': 'round', 'clip-path': clipG }, gg);
    });
    var t2 = paneTitle(gg, L + 7, gTop + 15, 'GAP VS THE S&P 500, POINTS');

    (function () {
      var lab = narrow ? GAP_LINE + ' pts' : GAP_LINE + ' pts: much weaker than the market', fs = narrow ? 11 : 11.5, w = textW(lab, fs) + 6;
      var spots = [{ x: L + 6, y: gl + 2 }, { x: L + 6, y: gl - fs - 6 }, { x: t2.x + t2.w + 8, y: gl - fs - 6 }];
      for (var q = 0; q < spots.length; q++) {
        var bx = { x: spots[q].x, y: spots[q].y, w: w, h: fs + 4 };
        if (bx.y < gTop + 2 || bx.y + bx.h > gTop + gH - 2 || bx.x + bx.w > L + pw - 2 || overlaps(bx, t2)) continue;
        el('rect', { x: bx.x.toFixed(1), y: bx.y.toFixed(1), width: bx.w.toFixed(1), height: bx.h, rx: 2, fill: C.panel, 'fill-opacity': 0.85 }, gg);
        tx(gg, bx.x + 3, bx.y + fs + 0.5, lab, { fill: '#E8C547', 'font-size': fs });
        return;
      }
    })();

    var nowG = el('g', {}, svg), snap = [], fs = narrow ? 11.5 : 12.5, used = [t1, t2];
    function lab(str, x, y, fill, gy0, gy1) {
      var w = textW(str, fs, 700), cands = [y - 9, y + fs + 9, y + 4];
      for (var c = 0; c < cands.length; c++) {
        var bx = { x: x - 8 - w - 2, y: cands[c] - fs, w: w + 4, h: fs + 4 };
        if (bx.y < gy0 + 2 || bx.y + bx.h > gy1 - 2 || bx.x < L + 2 || used.some(function (u) { return overlaps(u, bx); })) continue;
        used.push(bx); tx(nowG, x - 8, cands[c], str, withHalo({ fill: fill, 'font-size': fs, 'font-weight': 700, 'text-anchor': 'end' })); return;
      }
    }
    var lastI = n - 1, todayIn = xs[lastI] >= x0 && xs[lastI] <= x1, nx = X(xs[lastI]);
    if (todayIn) {
      var nowOrder = gs.filter(function (k) { return M.g[k].v[lastI] != null; })
        .sort(function (p, q) { return (q === grp) - (p === grp) || M.g[q].v[lastI] - M.g[p].v[lastI]; });
      nowOrder.forEach(function (k) { used.push(dotBox(nx, Y(M.g[k].v[lastI]), 5)); });
      var spv = M.sp ? M.sp[lastI] : null;
      if (spv != null) used.push(dotBox(nx, Y(spv), 5));
      nowOrder.forEach(function (k) {
        var A = M.g[k], ny = Y(A.v[lastI]);
        lab(gShort(k) + ' ' + pct0(A.v[lastI]), nx - 3, ny, GCOL[k], 0, tH);
        el('circle', { cx: nx.toFixed(1), cy: ny.toFixed(1), r: narrow ? 4 : 4.6, fill: GCOL[k], stroke: '#fff', 'stroke-width': 1.3 }, nowG);
        snap.push({ x: nx, y: ny, dn: xs[lastI] });
        if (A.gap[lastI] != null) {
          var gy = Yg(A.gap[lastI]);
          el('circle', { cx: nx.toFixed(1), cy: gy.toFixed(1), r: narrow ? 3.2 : 3.8, fill: GCOL[k], stroke: '#fff', 'stroke-width': 1.1 }, nowG);
          snap.push({ x: nx, y: gy, dn: xs[lastI] });
        }
      });
      if (spv != null) {
        var sy = Y(spv);
        el('circle', { cx: nx.toFixed(1), cy: sy.toFixed(1), r: narrow ? 3.4 : 4, fill: C.spl, stroke: C.bg, 'stroke-width': 1.3 }, nowG);
        lab('S&P 500 ' + pct0(spv), nx, sy, C.spl, 0, tH);
        snap.push({ x: nx, y: sy, dn: xs[lastI] });
      }
    }
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var j = dn == null ? lastI : bsearchLE(xs, dn);
      if (j < 0) j = 0;
      if (dn != null && xs[j] >= x0 && xs[j] <= x1) {
        var px = X(xs[j]);
        el('line', { x1: px, x2: px, y1: 0, y2: gTop + gH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (M.sp && M.sp[j] != null) el('circle', { cx: px, cy: Y(M.sp[j]), r: 3.6, fill: C.spl, stroke: C.bg, 'stroke-width': 1.4 }, cross);
        gs.forEach(function (k) {
          var A = M.g[k]; if (A.v[j] == null) return;
          el('circle', { cx: px, cy: Y(A.v[j]), r: 4.2, fill: GCOL[k], stroke: '#fff', 'stroke-width': 1.2 }, cross);
          if (A.gap[j] != null) el('circle', { cx: px, cy: Yg(A.gap[j]), r: 3.8, fill: GCOL[k], stroke: '#fff', 'stroke-width': 1.1 }, cross);
        });
      }
      readoutV(j, dn != null);
    }
    GEO.cv = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.cv);
  }
  function readoutV(j, picked) {
    var ro = $('roV'), M = prepVs(); clear(ro);
    var lv = isLive() && j === M.d.length - 1;
    ro.appendChild(span('d', fmtDay(M.d[j], true, true) + (lv ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    ro.appendChild(span('', ' · ' + vsK + '-day'));
    vsGroups().forEach(function (k) {
      var A = M.g[k];
      ro.appendChild(span('', ' · '));
      var nm = span('gn', gShort(k) + ' '); nm.style.color = GCOL[k]; ro.appendChild(nm);
      ro.appendChild(span('p', A.v[j] == null ? '–' : pct1(A.v[j])));
      if (A.gap[j] != null) ro.appendChild(span('gp', ' (' + gapWord1(A.gap[j]) + ')'));
    });
    ro.appendChild(span('', ' · S&P 500 '));
    ro.appendChild(span('sp', M.sp && M.sp[j] != null ? pct1(M.sp[j]) : '–'));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }


  function drawChart3(Wraw, tu, hFs) {
    var gm = geo1(Wraw), holder = $('chart3'), W = gm.W, narrow = gm.narrow, L = gm.L, pw = gm.pw;
    var spyH = narrow ? 96 : 160, gap = narrow ? 10 : 16, mH = narrow ? 260 : 360;
    if (hFs) { gap = hFs < 420 ? 8 : 14; var av = hFs - 24 - gap; spyH = Math.round(av * 0.28); mH = av - spyH; }
    var mTop = spyH + gap, H = mTop + mH + 24;
    var x0 = view.x0, x1 = view.x1, X = lin(x0, x1, L, L + pw), lw = lineWidth(x1 - x0, narrow);
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu), last = D.d.length - 1, todayIn = D.last >= x0 && D.last <= x1;
    var T1 = D.tf['1D'], keep = {};
    T1.wash.sig.forEach(function (i) { keep[i] = 1; });
    var spyY = spyPanel(svg, X, x0, x1, L, 0, pw, spyH, 12, ticks, keep);
    var g = el('g', {}, svg);
    panelRect(g, L, mTop, pw, mH);
    var Y = breadthY(mTop, mH, 8);
    yTicks(g, Y, breadthTicks(Y), L + pw, L, String, 'right', mTop);
    timeGrid(g, X, ticks, mTop, mTop + mH);
    if (!narrow) tx(g, 12, mTop + mH / 2, '% of stocks above their average', { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mTop + mH / 2) + ')' });
    var clip = clipFor(svg, L, mTop, pw, mH), a = Math.max(0, bsearchLE(D.d, x0)), b = Math.min(last, lowerBound(D.d, x1));
    var V = { 20: D.f20, 50: D.v, 100: D.f100, 200: D.t }, W8 = { 20: -0.25, 50: 0.25, 100: 0, 200: 0.05 };
    [20, 200, 100, 50].forEach(function (n) {
      var P = decimate(D.d, V[n], a, b, X);
      if (P.px.length) el('path', { d: pathOf(P, Y), fill: 'none', stroke: SPEED_C[n], 'stroke-width': Math.max(0.7, lw + W8[n]), 'stroke-opacity': n === 20 ? 0.85 : 0.95, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    });


    var rPk = narrow ? ((x1 - x0) > 2600 ? 3 : 4) : 4.5, rNow3 = narrow ? 4.5 : 5, cands = [], obst = [];
    if (todayIn && V[50][last] != null) obst.push(nowBox(X(D.last), Y(V[50][last]), rNow3));
    T1.wash.sig.forEach(function (i) {
      if (i === last || D.d[i] < x0 || D.d[i] > x1 || D.v[i] == null) return;
      var x = X(D.d[i]); if (x >= Math.max(L, rPk + 0.5) && x <= L + pw) cands.push({ dn: D.d[i], i: i, x: x, y: Y(D.v[i]) });
    });
    cands.sort(function (p, q) { return T1.wash.vr[p.i] - T1.wash.vr[q.i]; });
    var dots3 = thinDots(cands, rPk, obst, 2 * spyR(W) + 1.5), dotG3 = el('g', {}, svg);
    dots3.forEach(function (d) { peakDot(dotG3, d.x, d.y, rPk); });
    var lastSig3 = !!T1.sigOf[last], spyDays3 = dots3.map(function (d) { return d.dn; });
    if (lastSig3) spyDays3.push(D.last);
    spyDots(spyY, X, spyDays3, spyR(W), narrow ? 3.5 : 4, todayIn, L, pw, T1.open && lastSig3 ? D.last : null);
    var snap = [];
    if (todayIn) {
      var nx = X(D.last), nowG = el('g', {}, svg);
      [20, 200, 100, 50].forEach(function (n) {
        if (V[n][last] == null) return;
        var ny = Y(V[n][last]);
        if (n === 50) {
          nowDot(nowG, nx, ny, rNow3);
          if (T1.wash.active) washRing(nowG, nx, ny, rNow3, lastSig3 && T1.open);
        }
        else el('circle', { cx: nx.toFixed(1), cy: ny.toFixed(1), r: narrow ? 3.4 : 4, fill: SPEED_C[n], stroke: '#fff', 'stroke-width': 1.2 }, nowG);
        snap.push({ x: nx, y: ny, dn: D.last });
      });
    }
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var i = dn == null ? last : bsearchLE(D.d, dn);
      if (dn != null && D.d[i] >= x0 && D.d[i] <= x1) {
        var px = X(D.d[i]);
        el('line', { x1: px, x2: px, y1: 0, y2: mTop + mH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (D.spy[i] != null) el('circle', { cx: px, cy: spyY(D.spy[i]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
        [20, 200, 100, 50].forEach(function (n) { if (V[n][i] != null) el('circle', { cx: px, cy: Y(V[n][i]), r: n === 50 ? 4.2 : 3.6, fill: SPEED_C[n], stroke: '#fff', 'stroke-width': 1.1 }, cross); });
      }
      readout3(i, dn != null);
    }
    GEO.c3 = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover.c3);
  }
  function readout3(i, picked) {
    var ro = $('ro3'); clear(ro);
    var top = document.createElement('div'); top.className = 'rg-date';
    var isLast = i === D.d.length - 1;
    top.appendChild(span('d', fmtDay(D.d[i], true, true) + (isLast && isLive() ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    priceRo(top, i);
    var wt = washTag('1D', i);
    if (wt) top.appendChild(span('pk', ' · ' + wt));
    if (!picked) top.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
    ro.appendChild(top);
    var grid = document.createElement('div'); grid.className = 'rg';
    var V = { 20: D.f20, 50: D.v, 100: D.f100, 200: D.t };
    [20, 50, 100, 200].forEach(function (n) {
      var c = document.createElement('div'), v = V[n][i];
      var R = isLast ? rankOf(G.pnow['g' + n].r13, n === 50 ? G.pnow.g50.p13 : null) : rankOf(G.p13['g' + n][i]);
      c.appendChild(span('k', n + '-day'));
      var vs = span('v', pct0(v)); vs.style.color = SPEED_L[n]; c.appendChild(vs);
      c.appendChild(span('pc', ' ' + pctWord(R) + (R && !R.low ? ' pctl' : '')));
      if (n === 50) {
        var ep = episodeOf(D.tf['1D'], i);
        var so = ep === i && i === D.d.length - 1 && D.tf['1D'].open;
        c.appendChild(span('wn', ep == null ? '\u00a0' : so ? 'washout so far (day 1)' : 'in a washout (day ' + (i - ep + 1) + ')'));
      }
      c.appendChild(miniBar(R ? R.p : null));
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
    var changed = chip !== view.chip;
    view = D ? rangeView(chip) : { chip: chip, x0: 0, x1: 0, custom: false };
    store(KEY_R, chip);
    hover.c1 = hover.cv = hover.c3 = null;
    if (full) requestRender(); else renderViewUiChips();
    if (changed) emit('range', rangeKey());
  }
  function renderViewUiChips() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-range]'), function (b) { setAttr(b, 'aria-pressed', String(b.getAttribute('data-range') === view.chip)); });
  }








  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var HOLD_MS = 380;
  var lastTip = -1e9;
  var mainCtl = { view: function () { return view; }, set: setView, limits: spanLimits, clamp: clampView, keepRight: keepRight,
    atLatest: atLatest, pan: panView, zoom: zoomView, reset: resetView, cmd: zoomCmd, xs: function () { return D.d; }, last: function () { return D.last; } };
  function attachGestures(holder, key) {
    var ctl = mainCtl;
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
    function GG() { return GEO[key]; }
    function pxOf(clientX) { return (clientX - rect.left) * GG().W / rect.width; }
    function list() { return Object.keys(ptrs).map(function (k) { return ptrs[k]; }); }
    function canPan() { var v = ctl.view(); return v.x1 - v.x0 < ctl.limits().max - 1e-6; }
    function pick(clientX, clientY, kind) {
      var g = GG(); if (!g) return;
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
    function unpick() { var g = GG(); if (hover[key] != null && g) { hover[key] = null; g.set(null); } }
    function startPinch() {
      var p = list(), g = GG(), v = ctl.view(), mid = (pxOf(p[0].x) + pxOf(p[1].x)) / 2, s = v.x1 - v.x0;
      g0 = { view: v, dist: Math.max(24, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)),
        anchor: v.x0 + (mid - g.L) / g.pw * s, latest: ctl.atLatest(v) };
      mode = 'pinch'; holder.classList.add('dragging'); lastTap = null;
    }
    function startPan(p) { g0 = { view: ctl.view(), x: p.x }; mode = 'pan'; holder.classList.add('dragging'); lastTap = null; }
    holder.addEventListener('pointerdown', function (e) {
      if (!D || !GG()) return;
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
      if (!D || !GG()) return;
      var p = ptrs[e.pointerId];
      if (!p) {
        if (e.pointerType !== 'mouse') return;
        rect = holder.getBoundingClientRect();
        var hx = pxOf(e.clientX), g = GG();
        if (hx >= g.L && hx <= g.L + g.pw) pick(e.clientX, e.clientY, 'mouse'); else unpick();
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      var g1 = GG(), s;
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
      if (!D || !GG()) return;
      var g = GG(); rect = holder.getBoundingClientRect();
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
      if (!D || !GG()) return;
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
      GG().set(dn);
    });
  }






  var FS = { sr: null, key: null, nodes: [], y: 0, pushed: false, pendingBack: false, queued: null, queuedPtr: false, at: -1e9, back: 0, vw: 0, vh: 0, off: 0 };
  var FS_SLOTS = ['head', 'note', 'chips', 'ro', 'bar', 'chart', 'legend'];
  var FS_PARTS = { c1: ['daily', 'ro1', 'chart1', 'lg1'], cv: ['vsmkt', 'roV', 'chartV', 'lgV'], c3: ['speeds', 'ro3', 'chart3', 'lg4'] };
  function fsSlot(name) { return $('fs').querySelector('[data-fs="' + name + '"]'); }
  function fsHeight(holder) { return FS.key && holder.parentNode === fsSlot('chart') ? holder.clientHeight : null; }
  function fsParts(key) {
    var p = FS_PARTS[key], sec = $(p[0]);
    var names = { c1: G ? G.title : 'Breadth', cv: 'This crowd vs the market', c3: G ? G.title + ' at 4 speeds' : 'Breadth at 4 speeds' };
    return { label: names[key] + ', full screen', kicker: '', head: sec.querySelector('.card-head'), note: key === 'cv' ? $('vsK') : null,
      ro: $(p[1]), bar: sec.querySelector('.zoombar'), chart: $(p[2]), legend: $(p[3]), chips: $('ranges') };
  }
  function fsMinH(key) {
    var short = window.innerHeight <= 540;
    if (key === 'cv') return short ? 200 : 300;
    return short ? 180 : 240;
  }
  function fsSize() { if (FS.key) { var m = fsMinH(FS.key) + 'px'; if (fsSlot('chart').style.flexBasis !== m) fsSlot('chart').style.flexBasis = m; } }
  function fsDraw(nowDraw) {
    if (!FS.key || !D) return;
    if (nowDraw) { try { drawCharts(); } catch (e) { chartErr(e); } } else requestRender();
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
    if (!D || !full || FS.key) return;
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
    try { history.pushState({ aisbFs: key }, ''); FS.pushed = true; } catch (e) { FS.pushed = false; }
    document.body.style.top = -FS.y + 'px';
    document.documentElement.classList.add('fs-open');
    moves.forEach(function (m) { m.n.parentNode.insertBefore(m.ph, m.n); m.slot.appendChild(m.n); });
    var ov = $('fs');
    ov.setAttribute('aria-label', parts.label); ov.setAttribute('data-kind', key);
    $('fsKicker').textContent = parts.kicker; $('fsKicker').hidden = !parts.kicker;
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

    if (full && D) { try { drawCharts(); } catch (e) { chartErr(e); } }
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
    var c1 = $('chart1'), cv = $('chartV'), c3 = $('chart3'), w1 = c1.clientWidth, wv = cv.clientWidth, w3 = c3.clientWidth;
    var h1 = fsHeight(c1), hv = fsHeight(cv), h3 = fsHeight(c3);
    ['c1', 'cv', 'c3'].forEach(function (k) { if (hover[k] != null && (hover[k] < view.x0 || hover[k] > view.x1)) hover[k] = null; });

    var tu = FS.key === 'c1' ? tickUnit(geo1(w1).pw) : FS.key === 'cv' ? tickUnit(geoV(wv).pw) : FS.key === 'c3' ? tickUnit(geo1(w3).pw) :
      Math.max(tickUnit(geo1(w1).pw), tickUnit(geoV(wv).pw), tickUnit(geo1(w3).pw));
    if (!FS.key || FS.key === 'c1') drawChart1(w1, tu, h1);
    if (!FS.key || FS.key === 'cv') drawChartV(wv, tu, hv);
    if (!FS.key || FS.key === 'c3') drawChart3(w3, tu, h3);
    layoutGauge();
    renderViewUi();
  }
  function chartErr(e) { errWords(e); showFatal('The charts could not be drawn.'); }

  function sectionTry(id, fn) {
    var sec = $(id), note = sec && sec.querySelector('.sec-err');
    try { fn(); if (note) note.hidden = true; }
    catch (e) {
      errWords(e);
      if (!sec) return;
      if (!note) { note = document.createElement('p'); note.className = 'banner banner-warn sec-err'; sec.appendChild(note); }
      note.hidden = false; note.textContent = 'This section could not be drawn.';
    }
  }
  function renderAll() {
    if (!full) return;
    $('content').hidden = false;
    renderStatus();
    renderSelChips();
    try { renderText(); } catch (e) { errWords(e); showFatal('The numbers could not be shown.'); return; }
    sectionTry('vsmkt', renderVsText);
    sectionTry('speeds', renderSpeedsText);
    sectionTry('after', renderAfter);
    try { renderTables(); } catch (e) { errWords(e); }
    try { renderFoot(); } catch (e) { errWords(e); }
    try { drawCharts(); } catch (e) { chartErr(e); }
  }
  function requestRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      if (!full || !D) return;
      try { drawCharts(); } catch (e) { chartErr(e); }
    });
  }
  function showFatal(msg) {
    full = null; fullSha = null; G = null; D = null;
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'NO DATA';
    $('asof').textContent = 'Could not load the AI · semis · high-beta breadth numbers.';
    $('statusLine').textContent = ''; $('membersLine').textContent = '';
    var b = $('banners'); clear(b);
    b.appendChild(banner('bad', 'No numbers to show', msg + ' Nothing is shown rather than old or partial numbers. Try again in a few minutes.',
      { label: 'Try again', fn: function () { load(); } }));
  }




  function pubErr(msg) { var e = new Error(msg); e.pub = true; return e; }
  function errWords(e) { try { console.warn('ai semis breadth:', e); } catch (x) {  } return e && e.pub ? e.message : 'the data looked broken'; }
  function getJSON(name) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    var bust = Math.floor(Date.now() / 60000);
    function fail(e) { throw pubErr(timedOut || (e && e.name === 'AbortError') ? name + ' timed out' : 'network error fetching ' + name); }
    return fetch(BASE + name + '?m=' + bust, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
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
  function shaOf(m) { return m && m.files && m.files[FILE] ? m.files[FILE].sha256 || null : null; }
  var loading = false;

  function load() {
    if (loading) return; loading = true;
    getJSONRetry('manifest.json').then(null, function () { return null; }).then(function (man) {
      var sha = shaOf(man);
      return getJSONRetry(FILE).then(function (f) {
        if (!validate(f)) throw pubErr('the data looked broken');
        var changed = !full || f.built_utc !== full.built_utc || f.as_of.asof_utc !== full.as_of.asof_utc;
        fullSha = man && man.generated_utc === f.built_utc ? sha : null; loadedAt = now(); lastErr = null;
        if (!changed) { renderStatus(); return; }
        var prevFull = full;
        full = f; VSC = null;
        GROUPS = groupKeys(f); PRICES = priceKeys(f);
        if (f.meta.storage) { KEY_G = f.meta.storage.group || KEY_G; KEY_P = f.meta.storage.price || KEY_P; }

        if (!grpChosen && f.meta.default_group && GROUPS.indexOf(f.meta.default_group) >= 0) grp = f.meta.default_group;
        if (GROUPS.indexOf(grp) < 0) grp = GROUPS.indexOf('all') >= 0 ? 'all' : GROUPS[0];
        if (urlPrice && PRICES.indexOf(urlPrice) < 0) urlPrice = null;
        if (pickedPrice && PRICES.indexOf(pickedPrice) < 0) pickedPrice = null;
        pp = urlPrice || pickedPrice || groupDefaultPrice(grp);
        try { applySelection(); }
        catch (e) { full = prevFull; throw e; }
        renderAll();
        if (full) emit('data', full);
      });
    }).catch(function (e) {
      var w = errWords(e);
      if (!full) showFatal('Could not load the data (' + w + ').');
      else { lastErr = { at: now(), msg: w }; renderStatus(); }
    }).then(function () { loading = false; });
  }
  function poll() {
    if (document.hidden) return;
    if (!full) { load(); return; }
    getJSON('manifest.json').then(function (m) {
      var sha = shaOf(m);
      if (!sha || sha !== fullSha) load();
      else { lastErr = null; renderStatus(); }
    }).catch(function (e) { lastErr = { at: now(), msg: errWords(e) }; renderStatus(); });
  }




  function applySelection() {
    var hadView = !!D, wasLatest = hadView ? atLatest(view) : true;
    var nd = prepare(full, grp, pp);
    G = full.groups[grp]; D = nd;
    if (!hadView || !view.custom) view = rangeView(view.chip);
    else view = wasLatest ? toLatest(view, view.x0) : clampView(view);
  }


  function renderSelChips() {
    if (!full) return;
    var gb = $('groups'), pb = $('prices');
    var gSig = GROUPS.map(function (g) { var m = gMeta(g); return g + ':' + gShort(g) + ' ' + m.n_listed; }).join('|'), pSig = PRICES.join('|');
    if (gb.getAttribute('data-sig') !== gSig) {
      clear(gb); gb.setAttribute('data-sig', gSig);
      GROUPS.forEach(function (g) {
        var m = gMeta(g), b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-g', g);
        b.appendChild(span('gc-n', gShort(g))); b.appendChild(span('gc-c', m.n_listed != null ? ' ' + m.n_listed : ''));
        b.setAttribute('aria-label', (m.label || gShort(g)) + (m.n_listed != null ? ', ' + m.n_listed + ' stocks' : ''));
        gb.appendChild(b);
      });
    }
    if (pb.getAttribute('data-sig') !== pSig) {
      clear(pb); pb.setAttribute('data-sig', pSig);
      PRICES.forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-p', p); b.textContent = priceHead(p);
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
    var p0 = pp;
    grp = g; grpChosen = true; store(KEY_G, g);
    if (!urlPrice && !pickedPrice) pp = groupDefaultPrice(g);
    syncUrl();
    hover.c1 = hover.cv = hover.c3 = null;
    applySelection(); renderAll();
    emit('group', grp);
    if (pp !== p0) emit('price', pp);
  }
  function choosePrice(p) {
    if (!full || PRICES.indexOf(p) < 0) return;
    pickedPrice = p; urlPrice = null; store(KEY_P, p);
    if (p === pp) { syncUrl(); return; }
    pp = p; syncUrl();
    hover.c1 = hover.cv = hover.c3 = null;
    applySelection(); renderAll();
    emit('price', pp);
  }
  function chooseVsK(k) {
    if (k !== 50 && k !== 200) return;
    vsK = k; store(KEY_VK, String(k));
    hover.cv = null;
    if (!full) return;
    sectionTry('vsmkt', renderVsText);
    requestRender();
  }


  (function initRange() {
    view.chip = normRange(params.get('range')) || normRange(stored(KEY_R)) || '5Y';
    renderViewUiChips();
  })();
  Array.prototype.forEach.call(document.querySelectorAll('[data-range]'), function (b) {
    b.addEventListener('click', function () { chooseRange(b.getAttribute('data-range')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-z]'), function (b) {
    b.addEventListener('click', function () { zoomCmd(b.getAttribute('data-z')); });
  });
  $('groups').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-g]'); if (b) chooseGroup(b.getAttribute('data-g')); });
  $('prices').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-p]'); if (b) choosePrice(b.getAttribute('data-p')); });
  $('vsK').addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-vsk]'); if (b) chooseVsK(+b.getAttribute('data-vsk')); });
  if (HOVER) Array.prototype.forEach.call(document.querySelectorAll('[data-zoomhint]'), function (n) {
    n.textContent = 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click for full screen';
  });
  initFs();
  (function () {
    var t = document.querySelector('.tabs'), a = t && t.querySelector('[aria-current=page]');
    if (!a || t.scrollWidth <= t.clientWidth) return;
    var d = a.getBoundingClientRect().right - t.getBoundingClientRect().right;
    if (d > 0) t.scrollLeft += d;
  })();
  attachGestures($('chart1'), 'c1');
  attachGestures($('chartV'), 'cv');
  attachGestures($('chart3'), 'c3');
  if ('ResizeObserver' in window) {
    var lastW = 0;
    new ResizeObserver(function (ents) {
      var w = Math.round(ents[0].contentRect.width);
      if (w !== lastW) { lastW = w; requestRender(); }
    }).observe($('content'));
  } else window.addEventListener('resize', function () { requestRender(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  setInterval(function () { if (full) renderStatus(); }, TICK_MS);
  setInterval(poll, POLL_MS);
  load();
})();
