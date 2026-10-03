



(function () {
  'use strict';


  var DEFAULT_BASE = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/live-data/live/';
  var FILE = 'breadth.json';
  var POLL_MS = 5 * 60 * 1000;
  var TICK_MS = 30 * 1000;
  var FETCH_TIMEOUT_MS = 15000;

  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: '#3987E5', light: '#8EC0FA', b200: '#F0883E', b200l: '#F7B57F' };
  var FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
  var TFS = ['1D', '1W', '2W', '1M'];
  var TF_NAME = { '1D': 'Daily candles', '1W': 'Weekly candles', '2W': '2-week candles', '1M': 'Monthly candles' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



  var WASH = 25, REARM = 50, RING_DEPTH = 5, RING_GAP = { '1D': 5, '1W': 2, '2W': 1, '1M': 1 };
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


  var HOLIDAYS = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'];
  var HALF_DAYS = ['2026-11-27', '2026-12-24', '2027-11-26'];
  var CAL_END = '2027-12-31';


  var params = new URLSearchParams(location.search);
  var base = DEFAULT_BASE, preview = null;
  var dataParam = params.get('data');

  function dataHostOk(u) {
    var h = u.hostname;
    if (u.protocol === 'https:' && h === 'raw.githubusercontent.com' && /^\/lawrencekenshin\//.test(u.pathname)) return true;
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h));
  }
  if (dataParam) {
    try {
      var u = new URL(dataParam, location.href);
      if (dataHostOk(u)) {
        var href = u.href.split('?')[0].split('#')[0];
        if (/\.json$/i.test(href)) href = href.replace(/[^/]*$/, '');
        if (!/\/$/.test(href)) href += '/';
        base = href; preview = u.host;
      }
    } catch (e) {  }
  }
  var nowOverride = null;
  if (params.get('now')) { var t0 = Date.parse(params.get('now')); if (!isNaN(t0)) nowOverride = t0 - Date.now(); }
  function now() { return Date.now() + (nowOverride || 0); }
  var winParam = params.get('win');

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


  var doc = null, D = null, loadedAt = 0, lastErr = null, uid = 0;
  var hover = { c1: null, c2: null, c3: null };


  function validate(d) {
    if (!d || typeof d !== 'object') return 'not JSON';
    if (d.schema !== 1 || d.kind !== 'breadth') return 'unknown schema ' + d.schema;
    var x = d.daily;
    if (!x || !Array.isArray(x.d) || x.d.length < 300) return 'daily series missing';
    var n = x.d.length;
    if (['a50', 'n50', 'a200', 'n200', 'a20', 'n20', 'a100', 'n100', 'spy'].some(function (k) { return !Array.isArray(x[k]) || x[k].length !== n; })) return 'daily arrays differ in length';
    for (var i = 1; i < 4; i++) {
      var t = d.tf && d.tf[TFS[i]];
      if (!t || !t.s || t.s.length < 10 || ['e', 'a50', 'n50', 'a200', 'n200'].some(function (k) { return !Array.isArray(t[k]) || t[k].length !== t.s.length; })) return TFS[i] + ' series missing';
    }
    for (i = 0; i < 4; i++) if (!d.candles || !d.candles[TFS[i]]) return 'candle notes missing';
    if (!(x.n50[n - 1] > 0)) return 'no members counted on the newest day';
    if (!d.live || !d.live.asof_utc || isNaN(Date.parse(d.live.asof_utc))) return 'as-of time missing';
    if (d.state !== 'LIVE' && d.state !== 'CLOSED') return 'unknown state ' + d.state;
    return null;
  }
  function share(a, n) { return n > 0 ? 100 * a / n : null; }
  function shares(A, N) { return A.map(function (a, i) { return share(a, N[i]); }); }
  function prepare(d) {
    var x = d.daily, P = { d: x.d.map(dayNum), spy: x.spy, tf: {} };
    P.v = shares(x.a50, x.n50); P.t = shares(x.a200, x.n200); P.n = x.n50;
    P.tf['1D'] = { s: P.d, e: P.d, v: P.v, t: P.t, a: x.a50, n: x.n50, a2: x.a200, n2: x.n200 };
    ['1W', '2W', '1M'].forEach(function (k) {
      var t = d.tf[k];
      P.tf[k] = { s: t.s.map(dayNum), e: t.e.map(dayNum), v: shares(t.a50, t.n50), t: shares(t.a200, t.n200), a: t.a50, n: t.n50, a2: t.a200, n2: t.n200 };
    });
    P.last = P.d[P.d.length - 1];

    d.stats = {};
    TFS.forEach(function (k) {
      var T = P.tf[k], j = T.v.length - 1, c = d.candles[k];
      d.stats[k] = { latest: T.v[j], latest0: Math.round(T.v[j]), latest200: T.t[j], open: !!c.open, note: c.note || '', name: c.name || TF_NAME[k],
        start: c.start, end: c.end, n: T.n[j], above: T.a[j], n2: T.n2[j], above2: T.a2[j], alarm: WASH };

      T.wash = washouts(T.v, k);
      T.peaks = T.wash.sig;
      T.ringOf = {}; T.wash.rings.forEach(function (r) { T.ringOf[r.k] = r.i; });
      T.sigOf = {}; T.wash.sig.forEach(function (i) { T.sigOf[i] = 1; });
    });
    P.kdj = prepareKdj(P);
    P.pct = pctPrepare(P, d, 'v');
    P.pct2 = pctPrepare(P, d, 't');
    P.stacks = prepareStacks(P, d);
    return P;
  }






  function washouts(v, k) {
    var sig = [], armed = true, i, j, n = v.length;
    for (i = 0; i < n; i++) {
      if (v[i] == null) continue;
      if (armed && v[i] <= WASH) { sig.push(i); armed = false; }
      else if (!armed && v[i] >= REARM) armed = true;
    }
    var rings = [], active = null, ends = {};
    sig.forEach(function (i0) {
      var end = n;
      for (j = i0 + 1; j < n; j++) if (v[j] >= REARM) { end = j; break; }
      var lo = i0;
      for (j = i0; j < end; j++) if (v[j] != null && v[j] < v[lo]) lo = j;
      ends[i0] = end;
      if (lo - i0 >= RING_GAP[k] && v[lo] <= v[i0] - RING_DEPTH) rings.push({ i: i0, k: lo });
      if (end === n) active = { i: i0, low: lo };
    });
    return { sig: sig, rings: rings, active: active, ends: ends };
  }

  function episodeOf(T, j) {
    var s = T.wash.sig, w = null;
    for (var q = 0; q < s.length && s[q] <= j; q++) w = s[q];
    return w != null && T.wash.ends[w] > j ? w : null;
  }







  var PCT_BASES = { s13: { from: '2013-01-01', word: 'since 2013', short: '2013+' }, s21: { from: '2021-01-01', word: 'since 2021', short: '2021+' } };


  var PCT_LOW = { '1D': { days: 30 }, '1W': { n: 6 }, '2W': { n: 4 }, '1M': { n: 3 } };
  var PCT_LOW_WORDS = 'Recent low = the lowest 50-day reading in the last 30 calendar days (daily), the last 6 weekly, 4 two-week or 3 monthly candles, the latest one included.';
  function tenths(x) { return Math.round(x * 10); }
  function upperBound(a, x) { var lo = 0, hi = a.length; while (lo < hi) { var m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; } return lo; }
  function ordinal(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
  function pctPrepare(P, d, key) {
    var out = {};
    TFS.forEach(function (k) {
      var T = P.tf[k], vs = T[key], n = vs.length, open = !!d.stats[k].open, closed = open ? n - 1 : n, o = { n: n, closed: closed, open: open, base: {}, key: key };
      Object.keys(PCT_BASES).forEach(function (b) {
        var first = lowerBound(T.e, dayNum(PCT_BASES[b].from)), vals = [];
        for (var j = first; j < closed; j++) if (vs[j] != null) vals.push(tenths(vs[j]));
        vals.sort(function (p, q) { return p - q; });
        o.base[b] = { first: first, sorted: vals };
      });
      out[k] = o;
    });
    return out;
  }


  function pctOf(k, j, x, b, key) {
    key = key || 'v';
    var o = (key === 't' ? D.pct2 : D.pct)[k], B = o.base[b], cnt = upperBound(B.sorted, tenths(x)), n = B.sorted.length, own = D.tf[k][key];
    if (j != null && j >= B.first && j < o.closed && own[j] != null) {
      n--; if (tenths(own[j]) <= tenths(x)) cnt--;
    }
    if (n <= 0 || x == null) return null;
    var p = 100 * cnt / n, r = Math.round(p), rec = cnt === n, low = cnt === 0;
    if (r >= 100 && !rec) r = 99;
    if (r <= 0 && !low) r = 1;
    return { p: p, r: r, cnt: cnt, n: n, record: rec, low: low, open: j != null && j >= o.closed, ord: low ? 'lowest' : ordinal(r) };
  }
  function candleVal(k, j, key) { return D.tf[k][key || 'v'][j]; }
  function pctCandle(k, j, key) { var x = candleVal(k, j, key); return { k: k, j: j, x: x, open: j >= D.pct[k].closed, s13: pctOf(k, j, x, 's13', key), s21: pctOf(k, j, x, 's21', key) }; }
  function recentLow(k) {
    var T = D.tf[k], last = T.v.length - 1, i0 = k === '1D' ? lowerBound(T.e, T.e[last] - (PCT_LOW[k].days - 1)) : Math.max(0, last + 1 - PCT_LOW[k].n), best = -1, bx = 0;
    for (var j = i0; j <= last; j++) { var x = T.v[j]; if (x == null) continue; if (best < 0 || x < bx) { best = j; bx = x; } }
    return pctCandle(k, best);
  }
  function pctWord(r) { return r ? (r.low ? 'lowest' : r.ord) : '–'; }

  function rankWord(r, base) {
    if (!r) return '';
    if (r.low) return 'lowest ' + PCT_BASES[base || 's13'].word;
    if (r.record) return 'highest ' + PCT_BASES[base || 's13'].word;
    return r.r <= 50 ? 'bottom ' + Math.max(1, r.r) + '%' : 'top ' + Math.max(1, 100 - r.r) + '%';
  }
  var PK_TXT = '#E8C547';
  var LOW_SPAN = { '1D': '30 days', '1W': '6 weeks', '2W': '4 candles', '1M': '3 months' };
  function lowWords(k) {
    var Pk = recentLow(k), T = D.tf[k];
    if (Pk.j === T.v.length - 1) return 'now = recent low (' + ('last ' + LOW_SPAN[k]).replace(/ /g, ' ') + ')';
    var when = k === '1D' ? fmtDay(T.e[Pk.j], false) : k === '1M' ? fmtMonYear(T.s[Pk.j]).slice(0, 3) : 'to ' + fmtDay(T.e[Pk.j], false);
    return 'recent low ' + pct1(Pk.x) + ' (' + when.replace(/ /g, ' ') + ') = ' + pctWord(Pk.s13);
  }


  function status() {
    var t = now(), asof = Date.parse(doc.live.asof_utc), age = t - asof, live = doc.live;
    var sess = dayNum(live.session_date || doc.as_of.session), s = { age: age, asof: asof };
    var calNote = sess >= dayNum(CAL_END) ? ' (The page calendar ends ' + CAL_END + '; extend it.)' : '';
    var refEt = live.refresh_et || '17:45', refTpe = live.refresh_tpe || '05:45';
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
        s.line = 'Market closed ' + (live.close_et || '16:00') + ' ET. These are the delayed-feed closing numbers (preliminary); final numbers come with the evening refresh ~' + refEt + ' ET · ' + refTpe + ' Taipei.';
      }
      else if (t < staleAt) { s.chip = 'LATE'; s.cls = 'late'; s.line = 'The evening close refresh (usually ~' + refEt + ' ET · ' + refTpe + ' Taipei) has not arrived yet. These are the preliminary delayed-feed closing numbers.'; }
      else { s.chip = 'STALE'; s.cls = 'stale'; s.line = 'These are the closing numbers of ' + fmtDay(sess, true, true) + ', and newer data should exist by now.'; s.expected = staleAt; }
      return s;
    }

    var nxt = nextSession(sess), firstTick = etEpoch(nxt, 9, 45), late2 = etEpoch(nxt, 10, 15), stale2 = etEpoch(nxt, 11, 0);
    if (t < late2) {
      s.chip = 'CLOSED'; s.cls = 'closed';
      s.line = 'Final close of ' + fmtDay(sess, true, true) + '. Next update after the open: ' + etAndTpe(firstTick) + '.' + calNote;
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
    var sessDn = dayNum(doc.live.session_date || doc.as_of.session), L0 = doc.live, head;
    if (doc.state === 'LIVE' && !L0.session_closed) {
      var pr = L0.prices_asof_utc ? Date.parse(L0.prices_asof_utc) : s.asof - 15 * 6e4;
      head = 'Today so far · prices ~' + hm(pr) + ' ET (15-min delayed) · built ' + hm(s.asof) + ' ET · ' + fmtTz(s.asof, 'Asia/Taipei', 'Taipei', false);
    } else if (doc.state === 'LIVE') {
      head = 'Close of ' + fmtDay(sessDn, false, true) + ' (preliminary) · built ' + etAndTpe(s.asof);
    } else {
      head = 'Close of ' + fmtDay(sessDn, false, true) + ' · built ' + etAndTpe(s.asof);
    }
    $('asof').textContent = head;
    $('statusLine').textContent = s.line;
    var L = doc.live, s1 = doc.stats['1D'], ml = (L.members_counted != null ? L.members_counted : '?') + ' of ' + (L.members_listed || '?') + ' S&P 500 members counted (' + s1.n2 + ' with 200 days of history)';
    var extra = [];
    if (L.short_history) extra.push(L.short_history + ' too new to score');
    if (L.stale_cache) extra.push(L.stale_cache + ' with stale data');
    if (L.no_bar_today) extra.push(L.no_bar_today + ' without a bar today');
    $('membersLine').textContent = ml + (extra.length ? ' (' + extra.join(', ') + ')' : '') + '.';

    ['asof1', 'asof2', 'asof3', 'asof4'].forEach(function (id) {
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
    if (nowOverride) b.appendChild(banner('info', 'Clock override', 'The page is pretending it is ' + etAndTpe(now()) + '.'));
    var calLeft = dayNum(CAL_END) - etDayNum(now());
    if (calLeft < 60) b.appendChild(banner('warn', 'Market calendar ends ' + CAL_END, 'After that the page assumes every weekday is a trading day, so the CLOSED / LATE labels can be wrong on holidays until the calendar is extended.'));
    if (s.cls === 'stale') {
      b.appendChild(banner('bad', 'These numbers are old', 'Last update ' + etAndTpe(s.asof) + ' (' + ago(s.age) + '). ' + s.line +
        ' Do not read them as current.'));
    }
    if (lastErr) b.appendChild(banner('warn', 'Refresh failed', 'Tried at ' + fmtTz(lastErr.at, 'Asia/Taipei', 'Taipei', false) + ' (' + lastErr.msg +
      '). The numbers below are still the ones from ' + etAndTpe(s.asof) + '.'));
  }
  function banner(kind, title, text, btn) {
    var d = document.createElement('div'); d.className = 'banner banner-' + kind;
    if (kind === 'bad') d.setAttribute('role', 'alert');
    var bt = document.createElement('b'); bt.textContent = title; d.appendChild(bt);
    d.appendChild(span('', text));
    if (btn) { var x = document.createElement('button'); x.type = 'button'; x.textContent = btn.label; x.addEventListener('click', btn.fn); d.appendChild(document.createElement('br')); d.appendChild(x); }
    return d;
  }



  var ZONES = [[WASH, 'washed out'], [40, 'weak'], [60, 'mixed'], [80, 'broad'], [1e9, 'very broad']];
  function zoneOf(v) { if (v <= WASH) return ZONES[0][1]; for (var i = 1; i < ZONES.length; i++) if (v < ZONES[i][0]) return ZONES[i][1]; return ZONES[ZONES.length - 1][1]; }
  function nowWords() { return closedNow() ? 'at today’s close (preliminary)' : doc.state === 'LIVE' ? 'today so far' : 'at the close'; }
  function spyOffHigh() { var s = doc.spy; return s && typeof s.pct_below_record === 'number' ? s.pct_below_record : null; }

  function washStateWords(k) {
    var T = D.tf[k], last = T.v.length - 1, A = T.wash.active, sig = T.wash.sig, unit = k === '1D' ? 'day' : 'candle';
    if (A) {
      var i = A.i, prevRe = null;
      for (var j = i - 1; j >= 0; j--) if (T.v[j] >= REARM) { prevRe = j; break; }
      var openSig = i === last && D.pct[k].open;
      return { active: true, i: i, open: openSig, low: A.low, n: last - i + 1, prevRe: prevRe,
        text: (openSig ? 'Would be a washout if it closed now: ' : 'In a washout since ' + fmtDay(T.e[i], true, k === '1D') + ' (' + unit + ' ' + (last - i + 1) + '): ') +
          'the 50-day line ' + (openSig ? 'is at ' : 'closed at ') + pct1(T.v[i]) + (prevRe != null ? ', after it had been back to 50%+ on ' + fmtDay(T.e[prevRe], true) : '') + '.' +
          (A.low !== i ? ' Lowest close since: ' + pct1(T.v[A.low]) + ' on ' + fmtDay(T.e[A.low], false) + (A.low === last && T === D.tf['1D'] && doc.state === 'LIVE' ? ' (today, so far)' : '') + '.' : '') +
          ' It re-arms once it closes back at 50% or more.' };
    }
    var lastSig = sig.length ? sig[sig.length - 1] : null;
    if (lastSig == null) return { active: false, text: 'No washout since ' + dnDate(T.s[0]).getUTCFullYear() + '. Armed: a close at or under 25% would be one.' };
    var re = T.wash.ends[lastSig];
    return { active: false, i: lastSig, text: 'No washout running. Armed: a close at or under 25% would be a new one. Last washout ' + fmtDay(T.e[lastSig], true) +
      ' (' + pct1(T.v[lastSig]) + '); back to 50% on ' + fmtDay(T.e[re], true) + '.' };
  }
  function renderText() {
    var st = doc.stats, live = doc.state === 'LIVE', s1 = st['1D'], sessDn = dayNum(doc.live.session_date || doc.as_of.session);
    var cn = closedNow();
    $('heroK').textContent = '50-day';
    $('heroV').textContent = pct0(s1.latest);
    $('heroV2').textContent = s1.latest200 == null ? '' : pct0(s1.latest200);
    $('heroV2k').textContent = s1.latest200 == null ? '' : '200-day';
    $('heroDate').textContent = (cn ? 'today’s close (prelim.) · ' : live ? 'today so far · ' : 'last close · ') + fmtDay(sessDn, true, true) +
      (live ? ' · as of ' + fmtTz(Date.parse(doc.live.asof_utc), 'America/New_York', 'ET', false) : '');
    renderHeroPct();
    var zl = $('zoneLine'); clear(zl);
    var word = zoneOf(s1.latest);
    zl.appendChild(span('zw', word.charAt(0).toUpperCase() + word.slice(1)));
    zl.appendChild(span('', ' — ' + pct1(s1.latest) + ' of S&P 500 stocks are above their 50-day average ' + nowWords() +
      (s1.latest200 == null ? '.' : '; ' + pct1(s1.latest200) + ' above their 200-day.')));
    var ws = washStateWords('1D'), wsn = $('washState'); clear(wsn);
    wsn.appendChild(span(ws.active ? 'ws-on' : '', ''));
    if (ws.active) { var b = document.createElement('b'); b.textContent = ws.open ? 'Washout so far. ' : 'Washout. '; wsn.appendChild(b); }
    wsn.appendChild(document.createTextNode(ws.text));
    $('zoneKey').textContent = 'Under 25% washed out · 25–40 weak · 40–60 mixed · 60–80 broad · 80+ very broad (50-day line).';
    $('howTo').textContent = 'Blue = the % of S&P 500 stocks above their 50-day average, orange = above their 200-day. Low = most stocks have been falling for weeks. ' +
      'Yellow dot = a washout: the blue line closes at or under 25% after it had been back to 50%. Hollow ring = the deepest close of that washout. The same days are dotted on SPY.';
    var R = pctCandle('1D', D.d.length - 1), off = spyOffHigh(), parts = [];
    parts.push((cn ? 'At today’s close (preliminary)' : live ? 'So far today' : 'At the close') + ', ' + pct1(s1.latest) + ' of stocks are above their 50-day average — ' +
      (R.s13 ? (R.s13.low ? 'the lowest reading since 2013' : R.s13.r <= 50 ? 'lower than ' + (100 - R.s13.r) + '% of days since 2013' : 'higher than ' + R.s13.r + '% of days since 2013') : '') +
      (s1.latest200 == null ? '.' : ' — and ' + pct1(s1.latest200) + ' above their 200-day.'));
    if (off != null) parts.push('SPY sits ' + (off < 0.05 ? 'at its record' : off.toFixed(1) + '% below its record') + '.');
    if (ws.active && off != null && off <= 5) parts.push('Most past washouts came after the index had already fallen; this one has it within 5% of its high (see “After past washouts”).');
    $('rightNow').textContent = parts.join(' ');
    renderStackText(cn, live, sessDn);
    $('footData').textContent = 'Derived values only (counts of stocks; SPY, QQQ and IWM closes); no member prices are published. Prices about 15 minutes delayed during the session. Built ' +
      etAndTpe(doc.generated_epoch * 1000) + '. No cookies, no tracking.';
    renderLegends();
    renderTables();
    renderAfter();
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
    var k = '1D', last = D.tf[k].v.length - 1, R = pctCandle(k, last), Pk = recentLow(k), R2 = pctCandle(k, last, 't');
    heroNow = R; heroPk = Pk;
    var hp = $('heroPct'); clear(hp);
    hp.appendChild(span('hp-b', pctWord(R.s13) + (R.s13 && R.s13.low ? '' : ' percentile'))); hp.appendChild(document.createTextNode(' since 2013'));
    hp.appendChild(span('hp-sep', ' · ')); hp.appendChild(span('hp-2', pctWord(R.s21) + ' since 2021'));
    if (R2.s13) { hp.appendChild(span('hp-sep', ' · ')); hp.appendChild(span('hp-2', '200-day ' + pctWord(R2.s13))); }
    var pk = $('heroPeak'); clear(pk);
    var same = Pk.j === last, pdn = D.tf[k].e[Pk.j];
    var pkt = span('hp-rule', same ? 'today is the recent low' : 'recent low ' + pct1(Pk.x) + ' (' + fmtDay(pdn, false) + ') = ' + pctWord(Pk.s13) + (Pk.open ? ' so far' : ''));
    pkt.title = PCT_LOW_WORDS; pk.appendChild(pkt);
    pk.title = PCT_LOW_WORDS;
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
    var W = g.clientWidth, key = W + '|' + (doc && doc.generated_epoch); if (!W || key === gaugeKey) return;
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
  function legendItem(cls, text) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(text)); return s; }
  function renderLegends() {
    var l1 = $('lg1'); clear(l1);
    l1.appendChild(legendItem('lg-b50', '% above 50-day average'));
    l1.appendChild(legendItem('lg-b200', '% above 200-day average'));
    l1.appendChild(legendItem('lg-pk', 'washout (closed ≤25% after ≥50%; same day on SPY)'));
    l1.appendChild(legendItem('lg-ring', 'deepest close of that washout'));
    l1.appendChild(legendItem('lg-now', 'now'));
    l1.appendChild(legendItem('lg-nowring', 'now, in a washout (dashed = so far)'));
    l1.appendChild(legendItem('lg-wash', 'washout line 25%'));
    l1.appendChild(legendItem('lg-rearm', 're-arm line 50%'));
    var l2 = $('lg2'); clear(l2);
    l2.appendChild(legendItem('lg-b50', '50-day'));
    l2.appendChild(legendItem('lg-b200', '200-day'));
    l2.appendChild(legendItem('lg-pk', 'washout (same rule on each index)'));
    l2.appendChild(legendItem('lg-ring', 'deepest close'));
    l2.appendChild(legendItem('lg-now', 'latest'));
    l2.appendChild(legendItem('lg-nowring', 'in a washout'));
    l2.appendChild(legendItem('lg-wash', 'washout line 25%'));
    l2.appendChild(legendItem('lg-rearm', 're-arm line 50%'));
    var l4 = $('lg4'); clear(l4);
    [20, 50, 100, 200].forEach(function (n) { var it = legendItem('lg-sp', n + '-day'); it.firstChild.style.borderTopColor = SPEED_C[n]; l4.appendChild(it); });
    l4.appendChild(legendItem('lg-pk', 'washout (50-day line only)'));
    l4.appendChild(legendItem('lg-ring', 'deepest close'));
    l4.appendChild(legendItem('lg-now', 'now'));
    l4.appendChild(legendItem('lg-nowring', 'in a washout'));
    l4.appendChild(legendItem('lg-wash', 'washout line 25%'));
    l4.appendChild(legendItem('lg-rearm', 're-arm line 50%'));
  }

  function renderStackText(cn, live, sessDn) {
    var I = D.stacks.idx, Sp = D.stacks.speeds, val = function (p, k) { var li = lastIdx(p.lines[k || 0].v); return li < 0 ? null : p.lines[k || 0].v[li]; };
    var now = cn ? 'at today’s close (preliminary)' : live ? 'today so far' : 'at the close of ' + fmtDay(sessDn, false, false);
    $('idxSub').textContent = 'The same 50-day and 200-day lines on each index’s own members. The S&P 500 is ' + (live ? 'live through the day' : 'as of the close') +
      '; the Nasdaq-100 and the Russell 2000 update after each close.';
    var parts = I.map(function (p) { var v = val(p); return p.name + ' ' + (v == null ? '–' : pct0(v)); });

    var jc = -1;
    for (var j0 = D.d.length - 1; j0 >= 0 && jc < 0; j0--) if (I.every(function (p) { return p.lines[0].v[j0] != null; })) jc = j0;
    var gapTxt = '';
    if (jc >= 0 && I.length >= 2) {
      var by = I.slice().sort(function (a, b) { return b.lines[0].v[jc] - a.lines[0].v[jc]; }), hi = by[0], lo = by[by.length - 1];
      var hv = hi.lines[0].v, lv = lo.lines[0].v, gap = hv[jc] - lv[jc];

      var first = lowerBound(D.d, dayNum('2013-01-01')), n = 0, below = 0;
      for (var j = first; j < D.d.length; j++) if (j !== jc && hv[j] != null && lv[j] != null) { n++; if (hv[j] - lv[j] < gap) below++; }
      gapTxt = ' Widest gap at the close of ' + fmtDay(D.d[jc], false) + ': ' + hi.name + ' over ' + lo.name + ' by ' + Math.round(gap) + ' points' +
        (n ? ', wider than on ' + Math.round(100 * below / n) + '% of days since 2013' : '') + '.';
    }
    var late = I.filter(function (p) { return lastIdx(p.lines[0].v) < D.d.length - 1; });
    var lateTxt = late.length ? ' (the S&P ' + (cn ? 'at today’s close, preliminary' : live ? 'today so far' : 'at the close of ' + fmtDay(D.last, false)) + '; ' +
      late.map(function (p) { return p.name + ' at the close of ' + fmtDay(D.d[lastIdx(p.lines[0].v)], false); }).join(', ') + ')' : '';
    $('idxNow').textContent = 'Above their 50-day average: ' + parts.join(' · ') + lateTxt + '.' + gapTxt;
    $('idxHow').textContent = 'When the big-company index (Nasdaq-100) stays far above the S&P 500 and the small caps (Russell 2000), a few large stocks are holding the index up while most stocks fall: a narrow market. ' +
      'When all three wash out together, the selling is everywhere. The washout rule was studied on the S&P 500 only; on the other two it is the same rule, untested.';
    var sp = Sp.map(function (p) { var li = lastIdx(p.lines[0].v), R = panelPct(p, li); return p.name + ' ' + pct0(val(p)) + ' (' + pctWord(R.s13) + ')'; });
    $('spNow').textContent = 'S&P 500 stocks above their average ' + now + ': ' + sp.join(' · ') + '. Percentiles since 2013; low = rare.';
    $('spHow').textContent = 'The 20-day line turns first (days), the 200-day last (months). All four low together = a broad, deep selloff; the 20-day turning up while the 200-day is still low = an early bounce inside a weak trend. ' +
      'Only the 50-day line carries washout dots: that is the rule the 2013+ study tested.';
  }
  function washCell(k) {
    var T = D.tf[k], A = T.wash.active;
    if (!A) return 'armed';
    return (A.i === T.v.length - 1 && D.pct[k].open ? 'so far' : 'since ' + fmtDay(T.e[A.i], false));
  }
  function renderTables() {
    var t = $('tfTable'); clear(t);
    var cap = document.createElement('caption'); cap.textContent = 'Latest readings (% of members above their average)'; t.appendChild(cap);
    var cols = [['Line', ''], ['Now', ''], ['Pctl 2013+', ''], ['2021+', 'w'], ['Washout', ''], ['Members', 'w'], ['As of', 'w']];
    var hr = t.insertRow();
    cols.forEach(function (c) { var th = document.createElement('th'); th.textContent = c[0]; if (c[1]) th.className = 'wide-only'; hr.appendChild(th); });
    function row(label, p, k, members) {
      var ln = p.lines[k], li = lastIdx(ln.v), r = t.insertRow(), S = k ? p.pct2 : p.pct, v = li < 0 ? null : ln.v[li];
      var R13 = seriesPct(S, li, v, 's13'), R21 = seriesPct(S, li, v, 's21');
      [label, v == null ? '–' : pct1(v) + (li === D.d.length - 1 && doc.state === 'LIVE' ? (closedNow() ? ' (prelim.)' : ' so far') : ''), pctWord(R13) + ' · ' + rankWord(R13), pctWord(R21),
        k === 0 && p.wash ? pWashState(p) : '', members, li < 0 ? '–' : fmtDay(D.d[li], true)].forEach(function (x, i) {
        var c = r.insertCell(); c.textContent = x; if (cols[i][1]) c.className = 'wide-only'; });
    }
    D.stacks.speeds.forEach(function (p) { row('S&P 500 · ' + p.name, p, 0, String(doc.live.members_listed)); });
    D.stacks.idx.forEach(function (p) {
      if (p.id === 'SPX') return;
      row(p.name + ' · 50-day', p, 0, String(p.listed));
      row(p.name + ' · 200-day', p, 1, String(p.listed));
    });
    var dtb = $('dayTable'); clear(dtb);
    cap = document.createElement('caption'); cap.textContent = 'Last 15 days, daily candles'; dtb.appendChild(cap);
    hr = dtb.insertRow(); ['Day', '20-day', '50-day', '100-day', '200-day', 'Pctl 2013+', 'Counted', 'SPY'].forEach(function (h) { var th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
    var T1 = D.tf['1D'];
    for (var i = D.d.length - 1; i >= Math.max(0, D.d.length - 15); i--) {
      var r = dtb.insertRow(), tag = (i === D.d.length - 1 && doc.state === 'LIVE') ? (closedNow() ? ' (prelim.)' : ' (so far)') : '';
      [fmtDay(D.d[i], false, true) + tag + (T1.sigOf[i] ? ' · washout' : ''), D.f20[i] == null ? '–' : pct1(D.f20[i]), pct1(D.v[i]), D.f100[i] == null ? '–' : pct1(D.f100[i]),
        D.t[i] == null ? '–' : pct1(D.t[i]), pctWord(pctCandle('1D', i).s13), String(D.n[i]),
        D.spy[i] == null ? '–' : D.spy[i].toFixed(2)].forEach(function (v) { r.insertCell().textContent = v; });
    }
  }




  var STUDY = { n: 23, done: 22, r63: 6.2, up63: 17, base63: 4.3, baseUp: 79, sameDrop: 6.4, p: 0.55, dip5: 11, baseDip5: 33,
    r126: 10.9, up126: 19, n126: 22, nearN: 13, nearUp63: 9, nearUp126: 12, nearDip5: 7, nearBaseDip5: 30, era21: { n: 10, done: 9, r63: 9.0, up: 6 } };
  var H1 = 21, H3 = 63, H6 = 126;
  function fwd(i, h) { var j = i + h; return j < D.spy.length && D.spy[i] != null && D.spy[j] != null ? (D.spy[j] / D.spy[i] - 1) * 100 : null; }
  function worst(i, h) {
    if (i + h >= D.spy.length || D.spy[i] == null) return null;
    var m = Infinity; for (var j = i + 1; j <= i + h; j++) if (D.spy[j] != null) m = Math.min(m, D.spy[j]);
    return (m / D.spy[i] - 1) * 100;
  }
  function offHigh(i) {
    var m = -Infinity; for (var j = Math.max(0, i - 251); j <= i; j++) if (D.spy[j] != null) m = Math.max(m, D.spy[j]);
    return D.spy[i] == null ? null : (D.spy[i] / m - 1) * 100;
  }
  function median(a) { if (!a.length) return null; var s = a.slice().sort(function (p, q) { return p - q; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function sgn(x, dp) { return x == null ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(dp == null ? 1 : dp) + '%'; }
  function renderAfter() {
    var T = D.tf['1D'], last = D.d.length - 1, base13 = lowerBound(D.d, dayNum('2013-01-01'));
    var rows = T.wash.sig.filter(function (i) { return i >= base13; }).map(function (i) {
      var end = T.wash.ends[i], lo = i;
      for (var j = i; j < Math.min(end, last + 1); j++) if (D.v[j] < D.v[lo]) lo = j;
      return { i: i, v: D.v[i], t: D.t[i], off: offHigh(i), lo: lo, r1: fwd(i, H1), r3: fwd(i, H3), r6: fwd(i, H6), dd: worst(i, H3), back: end <= last ? end - i : null };
    });

    var all3 = [], allDip = 0, allN = 0;
    for (var i = base13; i + H3 <= last; i++) { var r = fwd(i, H3), w = worst(i, H3); if (r == null || w == null) continue; all3.push(r); allN++; if (w <= -5) allDip++; }
    var done3 = rows.filter(function (o) { return o.r3 != null; }), done6 = rows.filter(function (o) { return o.r6 != null; });
    var m3 = median(done3.map(function (o) { return o.r3; })), up3 = done3.filter(function (o) { return o.r3 > 0; }).length;
    var m6 = median(done6.map(function (o) { return o.r6; })), up6 = done6.filter(function (o) { return o.r6 > 0; }).length;
    var dip = done3.filter(function (o) { return o.dd <= -5; }).length, b3 = median(all3), bUp = all3.filter(function (x) { return x > 0; }).length / Math.max(1, all3.length) * 100;
    var tiles = $('studyTiles'); clear(tiles);
    function tile(k, v, small, note, hl) {
      var t0 = document.createElement('div'); t0.className = 'tile' + (hl ? ' hl' : '');
      t0.appendChild(span('t-k', k));
      var vv = document.createElement('div'); vv.className = 't-v'; vv.textContent = v;
      if (small) { var sm = document.createElement('small'); sm.textContent = small; vv.appendChild(sm); }
      t0.appendChild(vv);
      if (note) { var nn = document.createElement('div'); nn.className = 't-n'; nn.textContent = note; t0.appendChild(nn); }
      tiles.appendChild(t0);
    }
    var ws = washStateWords('1D'), off = spyOffHigh(), near = ws.active && off != null && off <= 5;
    tile('Washouts since 2013 on this line', String(rows.length), rows.length && ws.active ? 'incl. the one now' : '',
      'The official S5FI had ' + STUDY.n + ' over the same years (it reads 1–2 points lower before 2025).');
    tile('SPY 3 months after (median)', sgn(m3), up3 + ' of ' + done3.length + ' up',
      'Any day since 2013: ' + sgn(b3) + ', up ' + Math.round(bUp) + '% of the time.');
    tile('SPY fell 5%+ first (within 3 months)', dip + ' of ' + done3.length, '',
      'Any day since 2013: ' + Math.round(allDip / Math.max(1, allN) * 100) + '%.');
    tile('The fair test (study)', sgn(STUDY.r63) + ' vs ' + sgn(STUDY.sameDrop), 'p ' + STUDY.p.toFixed(2),
      'Washouts vs days with the SAME S&P drop from its high: no edge beyond the drop itself.', true);
    tile('With the S&P within 5% of its high', STUDY.nearUp126 + ' of ' + STUDY.nearN, 'up at 6 months',
      'Up at 3 months ' + STUDY.nearUp63 + ' of ' + STUDY.nearN + '; ' + STUDY.nearDip5 + ' of ' + STUDY.nearN + ' fell 5%+ first (' + STUDY.nearBaseDip5 + '% normally).' + (near ? ' Today is one of these.' : ''), near);
    $('studyEli5').textContent = '';
    var e = $('studyEli5'), eb = document.createElement('b'); eb.textContent = 'ELI5'; e.appendChild(eb);
    e.appendChild(document.createTextNode('Washouts usually come after the market has already fallen. SPY was usually higher 3–6 months later, but days with the same drop did just as well, ' +
      'so the bounce comes from buying lower, not from breadth itself. Often it dipped another 5% first.' + (near ? ' This one came with the index near its high: past cases like it got there in 6 months, on a bumpier road.' : '')));
    var t = $('washTable'); clear(t);
    var cap = document.createElement('caption'); cap.textContent = 'Every daily washout since 2013 on this page’s line (SPY price, not total return)'; t.appendChild(cap);
    var cols = [['Washout day', ''], ['50-day', ''], ['200-day', 'w'], ['S&P off high', 'w'], ['Lowest close', 'w'], ['SPY 1 mo', 'w'], ['3 mo', ''], ['6 mo', ''], ['Worst dip 3 mo', 'w'], ['Back to 50%', 'w']];
    var hr = t.insertRow();
    cols.forEach(function (c) { var th = document.createElement('th'); th.textContent = c[0]; if (c[1]) th.className = 'wide-only'; hr.appendChild(th); });
    rows.slice().reverse().forEach(function (o) {
      var r = t.insertRow(), isNow = ws.active && ws.i === o.i;
      if (isNow) r.className = 'now';
      var cells = [[fmtDay(D.d[o.i], true, false) + (isNow ? ' (now)' : ''), ''], [pct1(o.v), ''], [o.t == null ? '–' : pct1(o.t), ''], [sgn(o.off), ''],
        [o.lo === o.i ? 'that day' : pct1(D.v[o.lo]) + ' · ' + fmtDay(D.d[o.lo], false), ''],
        [sgn(o.r1), o.r1 == null ? '' : o.r1 >= 0 ? 'up' : 'down'], [sgn(o.r3), o.r3 == null ? '' : o.r3 >= 0 ? 'up' : 'down'], [sgn(o.r6), o.r6 == null ? '' : o.r6 >= 0 ? 'up' : 'down'],
        [sgn(o.dd), ''], [o.back == null ? 'not yet' : o.back + ' days', '']];
      cells.forEach(function (c, i) { var td = r.insertCell(); td.textContent = c[0]; td.className = (cols[i][1] ? 'wide-only ' : '') + c[1]; });
    });
    var rs = t.insertRow(); rs.className = 'sum';
    [['Median', ''], ['', ''], ['', 'w'], ['', 'w'], ['', 'w'], [sgn(median(rows.filter(function (o) { return o.r1 != null; }).map(function (o) { return o.r1; }))), 'w'],
      [sgn(m3) + ' · ' + up3 + '/' + done3.length + ' up', ''], [sgn(m6) + ' · ' + up6 + '/' + done6.length + ' up', ''], [sgn(median(done3.map(function (o) { return o.dd; }))), 'w'], ['', 'w']]
      .forEach(function (c) { var td = rs.insertCell(); td.textContent = c[0]; if (c[1]) td.className = 'wide-only'; });
    $('studySrc').textContent = 'Table: this page’s 50-day line and SPY closes (price only), 21 / 63 / 126 sessions later; a horizon still in the future shows –. ' +
      'Study tiles: breadth_now 2026-10-01 study (official S5FI, SPY total return, 2013+, the same re-arm rule): ' + STUDY.n + ' washouts, 3-month median ' + sgn(STUDY.r63) +
      ' (' + STUDY.up63 + ' of ' + STUDY.done + ' up) vs ' + sgn(STUDY.base63) + ' any day; days with the same distance from the high did ' + sgn(STUDY.sameDrop) + ' (p ' + STUDY.p.toFixed(2) +
      '). 2021+ alone: ' + sgn(STUDY.era21.r63) + ', up ' + STUDY.era21.up + ' of ' + STUDY.era21.done + '. Few cases; describes, does not predict.';
  }




  var RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120, 'All': 0 };
  var RANGE_WORDS = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year',
    '2Y': 'last 2 years', '5Y': 'last 5 years', '10Y': 'last 10 years' };
  var MIN_SPAN = 14;
  var ZOOM_STEP = 1.6;
  var view = { chip: '5Y', x0: 0, x1: 0, custom: false }, renders = 0;

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
    if (!view.custom) return view.chip === 'All' ? 'all data since ' + dnDate(D.d[0]).getUTCFullYear() : RANGE_WORDS[view.chip];
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
    tx(g, left + 8, top + 16, 'S&P 500 (SPY)', withHalo({ fill: C.text, 'font-size': ts }));
    Y.titleBox = { x: left + 6, y: top + 16 - ts - 1, w: textW('S&P 500 (SPY)', ts) + 4, h: ts + 5 };
    return Y;
  }



  function spyR(W) { return W < 640 ? 2.4 : 3; }
  function spyDots(Y, X, days, r, rNow, todayIn, left, w, hollowDay) {
    var out = [], li = D.d.length - 1, now = todayIn && D.spy[li] != null ? { x: X(D.last), y: Y(D.spy[li]) } : null;
    out.under = [];
    days.forEach(function (dn) {
      var i = bsearchLE(D.d, dn); if (i < 0 || D.d[i] !== dn || D.spy[i] == null) return;
      var x = X(dn), y = Y(D.spy[i]);
      if (x < Math.max(left, r + 0.5) || x > left + w || overlaps(Y.titleBox, dotBox(x, y, r))) return;
      if (now && Math.hypot(x - now.x, y - now.y) < rNow + 5 + r) { out.under.push(dn); return; }
      if (dn === hollowDay) hollowDot(Y.dots, x, y, r); else peakDot(Y.dots, x, y, r);
      out.push(dn);
    });
    if (now) nowDot(Y.dots, now.x, now.y, rNow);
    return out;
  }


  function breadthPaths(g, X, Y, T, x0, x1, clip, lw, steps, plotW) {
    var n = T.v.length, dots = [], j;
    function stepLine(vs) {
      var line = '';
      for (j = Math.max(0, bsearchLE(T.s, x0)); j <= bsearchLE(T.s, x1); j++) {
        if (vs[j] == null) continue;
        var xs = X(T.s[j]), xe = j + 1 < n ? X(T.s[j + 1]) : Math.max(X(T.e[j]), xs + 2), y = Y(vs[j]).toFixed(1);
        line += (line ? 'L' : 'M') + xs.toFixed(1) + ' ' + y + 'L' + xe.toFixed(1) + ' ' + y;
      }
      return line;
    }
    function plain(vs) { return pathOf(decimate(T.e, vs, Math.max(0, bsearchLE(T.e, x0)), Math.min(n - 1, lowerBound(T.e, x1)), X), Y); }
    var l200 = steps ? stepLine(T.t) : plain(T.t), l50 = steps ? stepLine(T.v) : plain(T.v);
    if (!steps) {
      var vi = visIdx(T.e, x0, x1), inView = vi.i1 - vi.i0 + 1;
      if (inView > 0 && plotW / inView >= 9) for (j = vi.i0; j <= vi.i1; j++) dots.push(j);
    }
    if (l200) el('path', { d: l200, fill: 'none', stroke: C.b200, 'stroke-width': lw, 'stroke-opacity': 0.95, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    if (l50) el('path', { d: l50, fill: 'none', stroke: C.fear, 'stroke-width': lw + 0.2, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    dots.forEach(function (k) { if (T.v[k] != null) el('circle', { cx: X(T.e[k]).toFixed(1), cy: Y(T.v[k]).toFixed(1), r: 1.8, fill: C.light, 'fill-opacity': 0.55 }, g); });
  }
  function lineWidth(span, narrow) { return span > 2600 ? (narrow ? 0.8 : 1) : span > 420 ? (narrow ? 1 : 1.2) : span > 100 ? 1.4 : 1.7; }

  function breadthY(top, h, padTop) { return lin(0, 100, top + h - 3, top + (padTop == null ? 7 : padTop)); }
  function breadthTicks(Y) { return Math.abs(Y(0) - Y(25)) >= 20 ? [0, 25, 50, 75, 100] : [0, 50, 100]; }

  function washLines(g, Y, left, w) {
    var py = Y(WASH), pr = Y(REARM);
    el('line', { x1: left, x2: left + w, y1: pr, y2: pr, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '3 4', 'stroke-opacity': 0.8 }, g);
    el('line', { x1: left, x2: left + w, y1: py, y2: py, stroke: DOT.peak, 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.7 }, g);
  }


  function washLabel(g, Y, left, w, label, size, obstacles, top, bot) {
    var py = Y(WASH), lw = textW(label, size) + 6, h = size + 4;
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
  var dotDebug = {};
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function crossLayer(svg) { return el('g', { 'pointer-events': 'none' }, svg); }
  var GEO = { c1: null, c2: null, c3: null };


  function geo1(Wraw) { var W = Math.max(300, Math.round(Wraw)), narrow = W < 640, L = narrow ? 2 : 30; return { W: W, narrow: narrow, L: L, pw: W - L - (narrow ? 30 : 40) }; }
  function geo2(Wraw) { var W = Math.max(300, Math.round(Wraw)), wide = W >= (FS.key === 'c2' || FS.key === 'c3' ? 600 : 700), RC = wide ? 164 : 0; return { W: W, wide: wide, L: 2, RA: 30, RC: RC, pw: W - 2 - 30 - RC }; }


  function washRing(g, x, y, r, dashed) {
    el('circle', { cx: x, cy: y, r: r + 3.4, fill: 'none', stroke: C.bg, 'stroke-width': 3.6, 'stroke-opacity': 0.7 }, g);
    el('circle', { cx: x, cy: y, r: r + 3.4, fill: 'none', stroke: DOT.peak, 'stroke-width': 2, 'stroke-dasharray': dashed ? '3 2' : null }, g);
  }

  function episodeLow(T, i) { var lo = i; T.wash.rings.forEach(function (r) { if (r.i === i) lo = r.k; }); return lo; }
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
    var T1 = D.tf['1D'], last = D.d.length - 1, keep = {};
    T1.wash.sig.forEach(function (i) { keep[i] = 1; });
    var spyY = spyPanel(svg, X, x0, x1, L, 0, pw, spyH, 12.5, ticks, keep);
    var g = el('g', {}, svg), st = doc.stats['1D'], todayIn = D.last >= x0 && D.last <= x1, live = doc.state === 'LIVE';
    panelRect(g, L, mTop, pw, mH);
    var Y = breadthY(mTop, mH, 8);
    yTicks(g, Y, breadthTicks(Y), L + pw, L, String, 'right', mTop);
    timeGrid(g, X, ticks, mTop, mTop + mH);
    if (!narrow) tx(g, 12, mTop + mH / 2, '% of stocks above their average', { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mTop + mH / 2) + ')' });
    var clip = clipFor(svg, L, mTop, pw, mH);
    washLines(g, Y, L, pw);
    breadthPaths(g, X, Y, T1, x0, x1, clip, lineWidth(span, narrow), false, pw);
    var obstacles = [];
    var tx0 = X(D.last), ty = Y(st.latest), ty2 = st.latest200 == null ? null : Y(st.latest200);
    var rNow = narrow ? 5 : 6, rPk = narrow ? (span > 2600 ? 3 : 4) : 4.5, open1 = D.pct['1D'].open;
    if (todayIn) { obstacles.push(nowBox(tx0, ty, rNow)); if (ty2 != null) obstacles.push(nowBox(tx0, ty2, rNow - 1)); }


    var cands = [];
    T1.wash.sig.forEach(function (i) {
      if (i === last || D.d[i] < x0 || D.d[i] > x1) return;
      var x = X(D.d[i]); if (x >= Math.max(L, rPk + 0.5) && x <= L + pw) cands.push({ dn: D.d[i], i: i, v: D.v[i], x: x, y: Y(D.v[i]) });
    });
    cands.sort(function (a, b) { return a.v - b.v; });
    var minDx = (2 * spyR(W) + 1.5) * Math.max(1, pw / (pw2 || pw));
    var dots = thinDots(cands, rPk, obstacles.slice(), minDx);
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

    var labelled = [], placed = 0, maxLabels = phone ? 4 : narrow ? 5 : 9, long = span > 240;
    var eps = T1.wash.sig.map(function (i) { return { i: i, lo: episodeLow(T1, i) }; })
      .filter(function (e) { return e.lo !== last && D.d[e.lo] >= x0 && D.d[e.lo] <= x1; })
      .sort(function (a, b) { return D.v[a.lo] - D.v[b.lo]; });
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
      placed++; labelled.push(dn);
    });
    washLabel(lab, Y, L, pw, 'washout line 25%', narrow ? 11 : 11.5, obstacles, mTop, mTop + mH);
    var dotG = el('g', {}, svg);
    dotDays = {};
    rings.forEach(function (d) { ringDot(dotG, d.x, d.y, rPk); });
    dots.forEach(function (d) { dotDays[d.dn] = 1; peakDot(dotG, d.x, d.y, rPk); });
    var nowG = el('g', {}, svg), lastSig = !!T1.sigOf[last];
    if (todayIn) {
      if (ty2 != null) nowDot(nowG, tx0, ty2, rNow - 1, true);
      nowDot(nowG, tx0, ty, rNow);

      if (T1.wash.active) washRing(nowG, tx0, ty, rNow, lastSig && open1);
      if (lastSig) dotDays[D.last] = 1;
    }
    lastDaily = dots.map(function (d) { return d.dn; });
    var spyDays = lastDaily.slice(); if (lastSig) spyDays.push(D.last);
    var spyShown = spyDots(spyY, X, spyDays, spyR(W), narrow ? 3.5 : 4, todayIn, L, pw, open1 && lastSig ? D.last : null);
    dotDebug.c1 = { wash: lastDaily.map(isoOf), rings: rings.map(function (d) { return isoOf(d.dn); }), labelled: labelled.map(isoOf), spy: spyShown.map(isoOf),
      spyUnderNow: spyShown.under.map(isoOf), now: todayIn ? isoOf(D.last) : null, nowIsWashout: lastSig, nowRing: !!(todayIn && T1.wash.active) };
    timeAxis(svg, X, ticks, H - 4, 0, W);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var i = dn == null ? D.d.length - 1 : bsearchLE(D.d, dn);
      if (dn != null && D.d[i] >= x0 && D.d[i] <= x1) {
        var px = X(D.d[i]);
        el('line', { x1: px, x2: px, y1: 0, y2: mTop + mH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (D.spy[i] != null) el('circle', { cx: px, cy: spyY(D.spy[i]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
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
    if (T.sigOf[j]) return j === last && D.pct[k].open ? 'washout so far' : 'washout';
    if (T.ringOf[j] != null) return 'deepest close of the ' + fmtDay(T.e[T.ringOf[j]], false) + ' washout';
    var ep = episodeOf(T, j);
    return ep != null ? 'in a washout (' + (k === '1D' ? 'day ' : 'candle ') + (j - ep + 1) + ')' : '';
  }
  function readout1(i, picked) {
    var ro = $('ro1'); clear(ro);
    var isLast = i === D.d.length - 1, live = doc.state === 'LIVE' && isLast;
    ro.appendChild(span('d', fmtDay(D.d[i], true, true) + (live ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    ro.appendChild(span('', ' · 50-day '));
    ro.appendChild(span('p', pct1(D.v[i])));
    var R = pctCandle('1D', i), T = D.tf['1D'];
    ro.appendChild(span('', ' (' + T.a[i] + ' of ' + T.n[i] + ') · '));
    ro.appendChild(span('pc', pctWord(R.s13) + (R.s13 && R.s13.low ? '' : ' percentile') + soFar('1D', R)));
    if (D.t[i] != null) { ro.appendChild(span('', ' · 200-day ')); ro.appendChild(span('p2', pct1(D.t[i]))); }
    ro.appendChild(span('', ' · SPY ' + (D.spy[i] == null ? '–' : D.spy[i].toFixed(2)) + ' '));
    var ch = spyChange(i);
    if (ch != null) ro.appendChild(span(ch >= 0 ? 'up' : 'down', (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(2) + '%'));
    var wt = washTag('1D', i);
    if (wt) ro.appendChild(span('pk', ' · ' + wt));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }




  var SPEED_C = { 20: '#4DD0E1', 50: C.fear, 100: '#A99BFF', 200: C.b200 };
  var SPEED_L = { 20: '#A6EEF6', 50: C.light, 100: '#D2CAFF', 200: C.b200l };
  function lastIdx(v) { for (var i = v.length - 1; i >= 0; i--) if (v[i] != null) return i; return -1; }

  function seriesPct(S, j, x, b) {
    var B = S.base[b], cnt = upperBound(B.sorted, tenths(x)), n = B.sorted.length;
    if (j != null && j >= B.first && j < S.closed && S.v[j] != null) { n--; if (tenths(S.v[j]) <= tenths(x)) cnt--; }
    if (n <= 0 || x == null) return null;
    var p = 100 * cnt / n, r = Math.round(p), rec = cnt === n, low = cnt === 0;
    if (r >= 100 && !rec) r = 99;
    if (r <= 0 && !low) r = 1;
    return { p: p, r: r, cnt: cnt, n: n, record: rec, low: low, open: j != null && j >= S.closed, ord: low ? 'lowest' : ordinal(r) };
  }
  function seriesPrep(v, liveOpen, dates) {
    var n = v.length, li = lastIdx(v), closed = liveOpen && li === n - 1 ? n - 1 : n, S = { v: v, closed: closed, base: {} };
    Object.keys(PCT_BASES).forEach(function (b) {
      var first = lowerBound(dates, dayNum(PCT_BASES[b].from)), vals = [];
      for (var j = first; j < closed; j++) if (v[j] != null) vals.push(tenths(v[j]));
      vals.sort(function (p, q) { return p - q; });
      S.base[b] = { first: first, sorted: vals };
    });
    return S;
  }
  function panelPct(p, j) { var v = p.lines[0].v, S = p.pct; return { s13: seriesPct(S, j, v[j], 's13'), s21: seriesPct(S, j, v[j], 's21'), open: j >= S.closed }; }

  var IDX_ORDER = [['SPX', 'S&P 500', 'SPY'], ['NDX', 'Nasdaq-100', 'QQQ'], ['R2000', 'Russell 2000', 'IWM']];
  function prepareStacks(P, d) {
    var liveOpen = d.state === 'LIVE' && !!d.candles['1D'].open, T1 = P.tf['1D'];
    var out = { idx: [], speeds: [] };
    IDX_ORDER.forEach(function (o) {
      var key = o[0], v, t, wash, e = null;
      if (key === 'SPX') { v = P.v; t = P.t; wash = T1.wash; }
      else {
        e = d.idx && d.idx[key]; if (!e) return;
        v = e.f50.map(function (x) { return x == null ? null : x / 10; }); t = e.f200.map(function (x) { return x == null ? null : x / 10; });
        wash = washouts(v, '1D');
      }
      var spyOff = d.spy && typeof d.spy.pct_below_record === 'number' ? -d.spy.pct_below_record : null;
      var p = { id: key, name: o[1], etf: { sym: o[2], off: key === 'SPX' ? spyOff : e.etf_off_high },
        session: key === 'SPX' ? null : dayNum(e.session), listed: key === 'SPX' ? d.live.members_listed : e.listed,
        lines: [{ v: v, color: C.fear, light: C.light, w: 0.2, label: '50-day' }, { v: t, color: C.b200, light: C.b200l, w: 0, label: '200-day' }], wash: wash };
      p.sigOf = {}; p.wash.sig.forEach(function (i) { p.sigOf[i] = 1; });
      p.ringOf = {}; p.wash.rings.forEach(function (r) { p.ringOf[r.k] = r.i; });
      p.pct = seriesPrep(v, liveOpen && key === 'SPX', P.d); p.pct2 = seriesPrep(t, liveOpen && key === 'SPX', P.d);
      out.idx.push(p);
    });
    var f20 = shares(d.daily.a20, d.daily.n20), f100 = shares(d.daily.a100, d.daily.n100);
    [[20, f20], [50, P.v], [100, f100], [200, P.t]].forEach(function (o) {
      var p = { id: 'S' + o[0], name: o[0] + '-day', len: o[0], lines: [{ v: o[1], color: SPEED_C[o[0]], light: SPEED_L[o[0]], w: 0.2, label: o[0] + '-day' }],
        wash: o[0] === 50 ? T1.wash : null };
      p.sigOf = {}; p.ringOf = {};
      if (p.wash) { p.wash.sig.forEach(function (i) { p.sigOf[i] = 1; }); p.wash.rings.forEach(function (r) { p.ringOf[r.k] = r.i; }); }
      p.pct = seriesPrep(o[1], liveOpen, P.d);
      out.speeds.push(p);
    });
    P.f20 = f20; P.f100 = f100;
    return out;
  }
  function stackPanels(key) { return key === 'c2' ? D.stacks.idx : D.stacks.speeds; }

  function pWashTag(p, j) {
    if (!p.wash) return '';
    var last = lastIdx(p.lines[0].v);
    if (p.sigOf[j]) return j === last && p.pct.closed <= j ? 'washout so far' : 'washout';
    if (p.ringOf[j] != null) return 'deepest close of the ' + fmtDay(D.d[p.ringOf[j]], false) + ' washout';
    var s = p.wash.sig, w = null;
    for (var q = 0; q < s.length && s[q] <= j; q++) w = s[q];
    return w != null && p.wash.ends[w] > j ? 'in a washout (day ' + (j - w + 1) + ')' : '';
  }
  function pWashState(p) {
    if (!p.wash) return '';
    var A = p.wash.active, last = lastIdx(p.lines[0].v);
    if (!A) return 'no washout · armed';
    return 'washout ' + (A.i === last && p.pct.closed <= last ? 'so far' : 'since ' + fmtDay(D.d[A.i], false));
  }
  function pAsOf(p) {
    var li = lastIdx(p.lines[0].v);
    return li >= 0 && li < D.d.length - 1 ? 'close of ' + fmtDay(D.d[li], false) : '';
  }
  function pctWords(R, sf) { return pctWord(R) + (R && R.low ? '' : ' percentile') + (sf || ''); }
  function stackSoFar(p) { return p.pct.closed < p.lines[0].v.length && lastIdx(p.lines[0].v) === p.lines[0].v.length - 1 ? (closedNow() ? ' (prelim.)' : ' so far') : ''; }
  function stackHead(p, L, pw, RA) {
    var right = L + pw + RA, rows = [], li = lastIdx(p.lines[0].v), R = panelPct(p, li), sf = stackSoFar(p), main = p.lines[0];
    var big = li < 0 ? '–' : pct0(main.v[li]), vW = textW(big, 22, 700), nameR = L + 2 + textW(p.name, 14, 700) + 10, o = pctWord(R.s13), tp = rankWord(R.s13);
    rows.push({ x: L + 2, y: 15, s: p.name, fill: C.white, fs: 14, fw: 700 });
    rows.push({ x: right, y: 20, s: big, fill: main.light, fs: 22, fw: 700, a: 'end', tag: 'v' });
    var pw0 = R.s13 && R.s13.low ? '' : ' percentile', opts = [o + pw0 + sf + ' (' + tp + ')', o + sf + ' (' + tp + ')', o + pw0 + sf, o + sf, o], p13 = o;
    for (var i = 0; i < opts.length; i++) if (right - vW - 8 - textW(opts[i], 11.5) >= nameR) { p13 = opts[i]; break; }
    rows.push({ x: right - vW - 8, y: 19, s: p13, fill: C.text, fs: 11.5, a: 'end', tag: 'p13' });
    var r2 = [], t = p.lines[1];
    if (t && li >= 0 && t.v[li] != null) r2.push({ s: '200-day ' + pct0(t.v[li]), fill: C.b200l, fw: 700 });
    if (p.etf && p.etf.off != null) r2.push({ s: p.etf.sym + ' ' + (p.etf.off >= -0.05 ? 'at its high' : sgn(p.etf.off) + ' from high'), fill: C.muted });
    var asof = pAsOf(p);
    if (asof) r2.push({ s: asof, fill: C.muted });

    var wOf = function (a) { return a.reduce(function (t, q, k) { return t + textW(q.s, 11, q.fw || 400) + (k ? textW(' · ', 11) : 0); }, 0); };
    while (r2.length && right - wOf(r2) < L + 2) r2.pop();
    if (r2.length) {
      var parts = [];
      r2.forEach(function (q, k) { if (k) parts.push({ s: ' · ', fill: C.muted }); parts.push(q); });
      rows.push({ x: right, y: 34, parts: parts, fs: 11, a: 'end' });
    }
    var h = 40, ws = pWashState(p);
    if (ws && ws !== 'no washout · armed') { rows.push({ x: L + 2, y: h + 7, s: ws, fill: PK_TXT, fs: 11, tag: 'ws' }); h += 13; }
    return { h: h, rows: rows };
  }
  function drawStack(key, Wraw, tu, hFs) {
    var panelsAll = stackPanels(key), gm = geo2(Wraw), holder = $(key === 'c2' ? 'chart2' : 'chart3'), W = gm.W, wide = gm.wide;
    var L = gm.L, RA = gm.RA, RC = gm.RC, pw = gm.pw, N = panelsAll.length;
    var spyH = wide ? 110 : 84, gap = wide ? 16 : 10, panH = wide ? 150 : 112, live = doc.state === 'LIVE';
    var heads = {}, headSum = 0;
    panelsAll.forEach(function (p) { heads[p.id] = wide ? { h: 0 } : stackHead(p, L, pw, RA); headSum += heads[p.id].h; });
    if (hFs) {
      gap = wide ? (hFs < 300 ? 6 : hFs < 560 ? 8 : 14) : 8;
      var av2 = hFs - 24 - N * gap - headSum, short2 = wide && hFs < 300;
      spyH = Math.max(short2 ? 36 : 44, Math.round(av2 * 0.2)); panH = Math.max(short2 ? 30 : 40, Math.floor((av2 - spyH) / N));
      spyH = Math.max(spyH, av2 - N * panH);
    }
    var x0 = view.x0, x1 = view.x1, span = x1 - x0, X = lin(x0, x1, L, L + pw);
    var H = spyH + N * (gap + panH) + headSum + 24;
    var svg = svgFor(holder, W, H), ticks = timeTicks(x0, x1, X, 11, tu);
    var T1 = D.tf['1D'], last1 = D.d.length - 1, lastSig = !!T1.sigOf[last1], open1 = D.pct['1D'].open, todayIn = D.last >= x0 && D.last <= x1;
    var keep2 = {}; lastDaily.forEach(function (dn) { keep2[bsearchLE(D.d, dn)] = 1; });
    var spyY = spyPanel(svg, X, x0, x1, L, 0, pw, spyH, 12, ticks, keep2), snap = [];
    var spyDays = lastDaily.slice(); if (lastSig) spyDays.push(D.last);
    var spyShown = spyDots(spyY, X, spyDays, spyR(W), wide ? 4 : 3.5, todayIn, L, pw, open1 && lastSig ? D.last : null);
    spyShown.forEach(function (dn) { snap.push({ x: X(dn), y: spyY(D.spy[bsearchLE(D.d, dn)]), dn: dn }); });
    if (todayIn && D.spy[last1] != null) snap.push({ x: X(D.last), y: spyY(D.spy[last1]), dn: D.last });
    dotDebug[key] = { spy: spyShown.map(isoOf), panels: {} };
    var y = spyH, drawn = [];
    panelsAll.forEach(function (p) {
      var main = p.lines[0], li = lastIdx(main.v), R = panelPct(p, li), sf = stackSoFar(p);
      y += gap;
      var g = el('g', {}, svg);
      if (!wide) {
        heads[p.id].rows.forEach(function (r) {
          if (!r.parts) { tx(g, r.x, y + r.y, r.s, { fill: r.fill, 'font-size': r.fs, 'font-weight': r.fw || 400, 'text-anchor': r.a || 'start', 'data-th': r.tag || null }); return; }
          var te = el('text', { x: r.x, y: y + r.y, 'font-size': r.fs, 'font-family': FONT, 'text-anchor': r.a || 'start', 'data-th': 'r2' }, g);
          r.parts.forEach(function (q) { var ts = el('tspan', { fill: q.fill, 'font-weight': q.fw || 400 }, te); ts.textContent = q.s; });
        });
        y += heads[p.id].h;
      }
      panelRect(g, L, y, pw, panH);
      var Y = breadthY(y, panH, wide ? 6 : 4);
      yTicks(g, Y, breadthTicks(Y), L + pw, L, String, 'right', y);
      timeGrid(g, X, ticks, y, y + panH);
      var clip = clipFor(svg, L, y, pw, panH);
      if (p.wash) washLines(g, Y, L, pw);
      var lw = lineWidth(span, true), vi = visIdx(D.d, x0, x1);
      p.lines.slice().reverse().forEach(function (ln) {
        var P0 = decimate(D.d, ln.v, Math.max(0, bsearchLE(D.d, x0)), Math.min(D.d.length - 1, lowerBound(D.d, x1)), X);
        if (P0.px.length) el('path', { d: pathOf(P0, Y), fill: 'none', stroke: ln.color, 'stroke-width': lw + ln.w, 'stroke-opacity': ln === main ? 1 : 0.95, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
      });
      if (vi.i1 - vi.i0 + 1 > 0 && pw / (vi.i1 - vi.i0 + 1) >= 9) for (var j = vi.i0; j <= vi.i1; j++) if (main.v[j] != null) el('circle', { cx: X(D.d[j]).toFixed(1), cy: Y(main.v[j]).toFixed(1), r: 1.8, fill: main.light, 'fill-opacity': 0.55 }, g);
      var obs = [];
      if (wide) {
        tx(g, L + 8, y + 18, p.name, withHalo({ fill: C.white, 'font-size': 14, 'font-weight': 700 }));
        obs.push({ x: L + 6, y: y + 4, w: textW(p.name, 14, 700) + 4, h: 19 });
      }
      var rPk = wide ? 4 : 3.5, rNow = wide ? 5.5 : 4.5, lastIn = li >= 0 && D.d[li] >= x0 && D.d[li] <= x1;
      var nx = li >= 0 ? X(D.d[li]) : 0, ny = li >= 0 ? Y(main.v[li]) : 0;
      if (lastIn) obs.push(nowBox(nx, ny, rNow));
      var kept = [], rings = [];
      if (p.wash) {
        var cands = [];
        p.wash.sig.forEach(function (i) {
          if (i === li || D.d[i] < x0 || D.d[i] > x1) return;
          var px = X(D.d[i]); if (px >= Math.max(L, rPk + 0.5) && px <= L + pw) cands.push({ j: i, v: main.v[i], x: px, y: Y(main.v[i]) });
        });
        cands.sort(function (a, b) { return a.v - b.v; });
        kept = thinDots(cands, rPk, obs);
        p.wash.rings.forEach(function (r) {
          if (r.k === li || D.d[r.k] < x0 || D.d[r.k] > x1) return;
          var x = X(D.d[r.k]), yy = Y(main.v[r.k]);
          if (x < L + rPk + 2 || x > L + pw - rPk - 2) return;
          if (kept.some(function (d) { return Math.hypot(d.x - x, d.y - yy) < 2 * rPk + 2; })) return;
          rings.push({ j: r.k, x: x, y: yy });
        });
        rings.forEach(function (d) { ringDot(g, d.x, d.y, rPk); snap.push({ x: d.x, y: d.y, dn: D.d[d.j] }); });
        kept.forEach(function (d) { peakDot(g, d.x, d.y, rPk); snap.push({ x: d.x, y: d.y, dn: D.d[d.j] }); });
      }
      dotDebug[key].panels[p.id] = { wash: kept.map(function (d) { return isoOf(D.d[d.j]) + ' ' + f1(d.v); }).sort(), rings: rings.map(function (d) { return isoOf(D.d[d.j]); }).sort(),
        last: li >= 0 ? isoOf(D.d[li]) : null, active: !!(p.wash && p.wash.active) };
      if (lastIn) {
        var t2 = p.lines[1];
        if (t2 && t2.v[li] != null) nowDot(g, nx, Y(t2.v[li]), rNow - 1, true);
        nowDot(g, nx, ny, rNow); snap.push({ x: nx, y: ny, dn: D.d[li] });
        if (p.wash && p.wash.active) washRing(g, nx, ny, rNow, !!p.sigOf[li] && p.pct.closed <= li);
      }
      if (wide) {
        var cx = L + pw + RA + 14, cw = RC - 18, bot = y + panH - 4;
        var big = Math.min(30, Math.max(18, Math.round(panH * 0.2))), y2 = y + big + 4, bigS = li < 0 ? '–' : pct0(main.v[li]);
        tx(g, cx, y2, bigS, { fill: main.light, 'font-size': big, 'font-weight': 700, 'data-th': 'v' });
        var rowsR = [], asof = pAsOf(p);
        if (asof) rowsR.push([asof, 11.5, PK_TXT, 'asof']);
        if (p.lines[1] && li >= 0 && p.lines[1].v[li] != null) rowsR.push(['200-day ' + pct0(p.lines[1].v[li]), 12.5, C.b200l, 'v200', 700]);

        var p13 = [pctWords(R.s13, sf) + ' since 2013', pctWords(R.s13, sf), pctWord(R.s13) + sf + ' since 2013', pctWord(R.s13) + sf]
          .filter(function (t) { return textW(t, 12.5) <= cw; })[0] || pctWord(R.s13);
        rowsR.push([p13, 12.5, C.text, 'p13']);
        var ws = pWashState(p);
        if (ws) rowsR.push([ws, 11.5, p.wash && p.wash.active ? PK_TXT : C.muted, 'ws']);
        if (p.etf && p.etf.off != null) rowsR.push([p.etf.sym + ' ' + (p.etf.off >= -0.05 ? 'at its high' : sgn(p.etf.off) + ' from its high'), 11.5, C.muted, 'etf']);
        rowsR.push([pctWord(R.s21) + ' since 2021', 11.5, C.muted, 'p21']);
        rowsR.forEach(function (r) {
          if (y2 + r[1] + 5 > bot || textW(r[0], r[1], r[4] || 400) > cw) return;
          y2 += r[1] + 5;
          tx(g, cx, y2, r[0], { fill: r[2], 'font-size': r[1], 'font-weight': r[4] || 400, 'data-th': r[3] });
        });
      }
      drawn.push({ p: p, Y: Y, top: y, h: panH });
      y += panH;
    });
    timeAxis(svg, X, ticks, H - 4, 0, L + pw + RA);
    var cross = crossLayer(svg);
    function set(dn) {
      clear(cross);
      var di = dn == null ? D.d.length - 1 : bsearchLE(D.d, dn), show = dn != null && D.d[di] >= x0 && D.d[di] <= x1;
      if (show) {
        var x = X(D.d[di]);
        el('line', { x1: x, x2: x, y1: 0, y2: H - 22, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, cross);
        if (D.spy[di] != null) el('circle', { cx: x, cy: spyY(D.spy[di]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1.5 }, cross);
        drawn.forEach(function (q) {
          q.p.lines.slice().reverse().forEach(function (ln) {
            if (ln.v[di] != null) el('circle', { cx: x, cy: q.Y(ln.v[di]), r: ln === q.p.lines[0] ? 4 : 3.4, fill: ln.color, stroke: '#fff', 'stroke-width': 1.1 }, cross);
          });
        });
      }
      readoutStack(key, di, dn != null);
    }
    GEO[key] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
    set(hover[key]);
  }
  function soFar(k, R) { return !R.open ? '' : (k === '1D' && closedNow() ? ' (prelim.)' : ' so far'); }
  function readoutStack(key, di, picked) {
    var ro = $(key === 'c2' ? 'ro2' : 'ro3'); clear(ro);
    var top = document.createElement('div'); top.className = 'rg-date';
    var isLast = di === D.d.length - 1;
    top.appendChild(span('d', fmtDay(D.d[di], true, true) + (isLast && doc.state === 'LIVE' ? (closedNow() ? ' (close, prelim.)' : ' (so far)') : '')));
    top.appendChild(span('', ' · SPY ' + (D.spy[di] == null ? '–' : D.spy[di].toFixed(2)) + ' '));
    var ch = spyChange(di);
    if (ch != null) top.appendChild(span(ch >= 0 ? 'up' : 'down', (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(2) + '%'));
    if (!picked) top.appendChild(span('muted', ' · ' + TAP + ' a panel for any day'));
    ro.appendChild(top);
    var grid = document.createElement('div'); grid.className = 'rg';
    stackPanels(key).forEach(function (p) {

      var main = p.lines[0], li = lastIdx(main.v), j = !picked && main.v[di] == null && li >= 0 ? li : di;
      var c = document.createElement('div'), v = main.v[j], wt = pWashTag(p, j), di0 = di; di = j;
      c.appendChild(span('k', p.name + (wt === 'washout' || wt === 'washout so far' ? ' · ' + wt : '')));
      var vs = span('v', v == null ? '–' : pct0(v)); vs.style.color = main.light; c.appendChild(vs);
      if (p.lines[1] && p.lines[1].v[di] != null) c.appendChild(span('v2', pct0(p.lines[1].v[di])));
      var R = v == null ? null : seriesPct(p.pct, di, v, 's13');
      c.appendChild(span('pc', ' ' + pctWord(R)));
      var asOfT = di !== di0 ? 'close of ' + fmtDay(D.d[di], false) : '', tagT = wt && wt !== 'washout' && wt !== 'washout so far' ? wt : '';
      c.appendChild(span('s', v == null ? (di > li ? 'not yet (updates at the close)' : 'no reading') :
        (asOfT && tagT ? asOfT + ' · ' + tagT : asOfT || tagT || fmtDay(D.d[di], false))));
      c.appendChild(miniBar(R ? R.p : null));
      grid.appendChild(c);
      di = di0;
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
    try { localStorage.setItem('breadthRange', chip); } catch (e) { }
    hover.c1 = hover.c2 = hover.c3 = null;
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



  var KC = { k: '#4FC3F7', d: '#FFB74D', j: '#8A8F9E', yel: '#FFD84D', up: '#26A69A', dn: '#EF5350' };
  var K_NAME = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  var K_SHOW = { '1D': 90, '1W': 78, '2W': 52, '1M': 60 };
  var K_UNIT = { '1D': ['day', 'days'], '1W': ['week', 'weeks'], '2W': ['2-week candle', '2-week candles'], '1M': ['month', 'months'] };
  var K_NEXT = { '1D': 'next day', '1W': 'next week', '2W': 'next 2-week candle', '1M': 'next month' };
  var K_MIN = 12;





  function kdjStep(win, x, kp, dp) {
    var lo = x, hi = x;
    for (var i = 0; i < win.length; i++) { if (win[i] < lo) lo = win[i]; if (win[i] > hi) hi = win[i]; }
    var rsv = hi === lo ? 50 : (x - lo) / (hi - lo) * 100, k = (rsv + 2 * kp) / 3;
    return { k: k, d: (k + 2 * dp) / 3 };
  }
  function kdjSeries(v) {
    var n = v.length, K = new Array(n), Dd = new Array(n), J = new Array(n), k = 50, d = 50;
    for (var i = 0; i < n; i++) {
      var r = kdjStep(v.slice(Math.max(0, i - 8), i), v[i], k, d);
      k = r.k; d = r.d; K[i] = k; Dd[i] = d; J[i] = 3 * k - 2 * d;
    }
    return { K: K, D: Dd, J: J };
  }




  function flipLevel(v, Q, open) {
    var n = v.length, b = open ? n - 1 : n;
    if (b < 1) return null;
    var win = v.slice(Math.max(0, b - 8), b), kp = Q.K[b - 1], dp = Q.D[b - 1], rising = Q.K[n - 1] > Q.D[n - 1], lvl = null, flips = false;
    for (var i = 0; i <= 1000; i++) {
      var x = i / 10, r = kdjStep(win, x, kp, dp), up = r.k > r.d;
      if (up !== rising) flips = true;
      if (rising && up && lvl === null) lvl = x;
      if (!rising && !up) lvl = x;
    }
    return flips ? lvl : null;
  }
  function kdjCrosses(Q) {
    var c = {};
    for (var i = 1; i < Q.K.length; i++) {
      if (Q.K[i] > Q.D[i] && Q.K[i - 1] <= Q.D[i - 1]) c[i] = 'up';
      else if (Q.K[i] < Q.D[i] && Q.K[i - 1] >= Q.D[i - 1]) c[i] = 'down';
    }
    return c;
  }
  function kOpen(k) {
    var st = doc.stats[k];
    if (!st || !st.open) return false;
    return k !== '1D' || (!!doc.live.is_live && !doc.live.session_closed);
  }
  function prepareKdj(P) {
    var out = {};
    TFS.forEach(function (k) {
      var T = P.tf[k], n = T.v.length, Q = kdjSeries(T.v), idx = new Array(n), spy = new Array(n);
      for (var i = 0; i < n; i++) { idx[i] = i; var di = bsearchLE(P.d, T.e[i]); spy[i] = di >= 0 ? P.spy[di] : null; }
      Q.n = n; Q.idx = idx; Q.spy = spy; Q.open = kOpen(k); Q.cross = kdjCrosses(Q);
      Q.peak = {}; T.peaks.forEach(function (j) { Q.peak[j] = 1; });
      Q.rising = Q.K[n - 1] > Q.D[n - 1];
      Q.flip = flipLevel(T.v, Q, Q.open);
      out[k] = Q;
    });
    return out;
  }


  var KV = {}, KN = {}, KB = {}, kDebug = {}, kPending = {}, kRaf = false;
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



  var K_RANGES = ['Auto', '1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', 'All'];
  var kChip = 'Auto';
  function normKRange(s) {
    if (!s) return null;
    var u = String(s).trim().toUpperCase();
    if (u === 'AUTO') return 'Auto';
    return normRange(u);
  }
  function kChipCount(k, chip) {
    var n = KN[k], T = D.tf[k];
    if (chip === 'All') return n;
    if (!RANGE_MONTHS[chip]) return Math.min(n, K_SHOW[k]);
    return n - (bsearchLE(T.s, monthsBack(T.e[n - 1], RANGE_MONTHS[chip])) + 1);
  }
  function kChipShown(k) { return Math.min(KN[k], Math.max(K_MIN, kChipCount(k, kChip))); }
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
    var fk = FS.key && FS.key.charAt(0) === 'k' ? FS.key.slice(1) : null;
    var custom = fk ? !!(KV[fk] && KV[fk].custom) : TFS.some(function (k) { return KV[k] && KV[k].custom; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-krange]'), function (b) {
      var mine = b.getAttribute('data-krange') === kChip;
      setAttr(b, 'aria-pressed', String(mine && !(custom && D)));
      b.classList.toggle('base', mine && custom && !!D);
    });
  }
  function chooseKRange(chip) {
    kChip = chip;
    try { localStorage.setItem('breadthKdjRange', chip); } catch (e) { }
    if (D && D.kdj) TFS.forEach(function (k) { KV[k] = kDefault(k); hover['k' + k] = null; });
    renderKChips();
    if (D && D.kdj) requestKdj('all');
  }
  function kCtl(k) {
    return { view: function () { return KV[k]; }, set: function (nv) { return kSet(k, nv); }, limits: function () { return kLimits(k); },
      clamp: function (v) { return kClamp(k, v); }, keepRight: function (v) { return kKeepRight(k, v); }, atLatest: function (v) { return kAtLatest(k, v); },
      pan: function (v, dd) { return kPan(k, v, dd); }, zoom: function (v, c, f, st) { return kZoom(k, v, c, f, st); },
      reset: function () { kSet(k, kDefault(k)); }, cmd: function (z) { kCmd(k, z); },
      xs: function () { return D.kdj[k].idx; }, last: function () { return KN[k] - 1; } };
  }




  function kShift(oldS, newS) {
    if (!oldS || !oldS.length || !newS.length || oldS[0] === newS[0]) return 0;
    var j = newS.indexOf(oldS[0]); if (j >= 0) return j;
    j = oldS.indexOf(newS[0]); return j >= 0 ? -j : 0;
  }
  function kdjAfterLoad(prevN, prevS) {
    TFS.forEach(function (k) {
      var old = KV[k], wasLatest = old && prevN[k] ? (function () { var nn = KN[k]; KN[k] = prevN[k]; var r = kAtLatest(k, old); KN[k] = nn; return r; })() : true;
      var sh = prevS ? kShift(prevS[k], D.tf[k].s) : 0;
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
  function kTicks(T, i0, i1, X, fs, xmin, xmax, u0) {
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
        var d = dnDate(T.s[i]), lab = u === 'w' ? fmtDay(T.s[i], false) : u === 'm' ? (d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()]) : String(d.getUTCFullYear());
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
    var v = KV[k], T = D.tf[k], n = KN[k];
    if (!v.custom) {
      if (kChip === 'Auto') return 'last ' + Math.min(n, K_SHOW[k]) + ' ' + K_UNIT[k][1];
      var want = kChipCount(k, kChip), shown = kChipShown(k);
      if (want < shown) return 'last ' + shown + ' ' + K_UNIT[k][shown === 1 ? 0 : 1] + ' (shortest view)';
      if (kChip === 'All') return 'all ' + n + ' ' + K_UNIT[k][1] + ' since ' + dnDate(T.s[0]).getUTCFullYear();
      return RANGE_WORDS[kChip] + ' · ' + shown + ' ' + K_UNIT[k][shown === 1 ? 0 : 1];
    }
    var a = Math.max(0, Math.ceil(v.x0)), b = Math.min(n - 1, Math.floor(v.x1)), cnt = b - a + 1;
    var nb = function (str) { return str.replace(/ /g, ' '); };
    var da = T.s[a], db = T.e[b];
    var words = db - da > 150 ? (fmtMonYear(da) === fmtMonYear(db) ? nb(fmtMonYear(da)) : nb(fmtMonYear(da)) + ' – ' + nb(fmtMonYear(db)))
      : nb(fmtDay(da, dnDate(da).getUTCFullYear() !== dnDate(db).getUTCFullYear())) + ' – ' + nb(fmtDay(db, true));
    return words + ' · ' + cnt + ' ' + K_UNIT[k][cnt === 1 ? 0 : 1];
  }
  function f0(x) { return String(Math.round(x)); }
  function kFlipText(k, Q) {
    if (Q.flip == null) return null;
    var f = Q.flip.toFixed(1) + '%';

    if (Q.open && Q.cross[Q.n - 1]) return Q.rising ? 'no cross, stays weakening below ' + f : 'no cross, stays improving above ' + f;
    var t = Q.rising ? 'flips to weakening below ' + f : 'flips to improving above ' + f;
    return Q.open ? t : K_NEXT[k] + ' ' + t;
  }
  function kStateText(k, Q) {
    var n = Q.n, c = Q.cross[n - 1], s;
    if (c) s = (Q.open ? 'K would cross ' : 'K just crossed ') + (c === 'up' ? 'above D' : 'below D') + ': breadth ' + (c === 'up' ? 'improving' : 'weakening');
    else s = Q.rising ? 'K above D: breadth improving' : 'K below D: breadth weakening';
    if (Q.flip == null) s += ' · no breadth level (0–100%) ' + (Q.open ? 'before this candle closes' : 'on the ' + K_NEXT[k]) + ' flips it to ' + (Q.rising ? 'weakening' : 'improving');
    return s;
  }
  function kNote(k, st, Q) {
    var note = st.note || '';
    if (Q.open && !/as if/.test(note)) note += ', as if closed today';
    return note;
  }
  function renderKdjText() {
    var cn = closedNow(), live = doc.state === 'LIVE', sessDn = dayNum(doc.live.session_date || doc.as_of.session);
    $('kdjSub2').textContent = (cn ? 'Close of ' + fmtDay(sessDn, false, true) + ' (preliminary)' : live ? 'Today so far' : 'Close of ' + fmtDay(sessDn, false, true)) +
      ' · open candles drawn as if they closed today (dotted lines, hollow dots, shaded column)';
    TFS.forEach(function (k) {
      var B = KB[k], Q = D.kdj[k], st = doc.stats[k], n = Q.n;
      var R = pctCandle(k, n - 1);
      clear(B.val);
      B.val.appendChild(span('kv-a', '50-day ' + pct0(st.latest) + ' · ' + pctWord(R.s13)));
      B.val.appendChild(span('kv-b', ' · K ' + f0(Q.K[n - 1]) + ' D ' + f0(Q.D[n - 1]) + ' J ' + f0(Q.J[n - 1])));
      B.val.classList.toggle('ghost', Q.open);
      var T = D.tf[k];
      B.note.textContent = kNote(k, st, Q) + ' · ' + kStateText(k, Q) + (T.wash.active ? ' · washout ' + washCell(k) : '');
      B.note.classList.toggle('ghost', Q.open);
    });
    var lg = $('lg3'); clear(lg);
    lg.appendChild(legendItem('lg-bar', '50-day breadth %'));
    lg.appendChild(legendItem('lg-pk', 'washout on that candle size (same candle on SPY)'));
    lg.appendChild(legendItem('lg-wash', 'washout line 25%'));
    lg.appendChild(legendItem('lg-ln lg-k', 'K'));
    lg.appendChild(legendItem('lg-ln lg-d', 'D'));
    lg.appendChild(legendItem('lg-ln lg-j', 'J'));
    lg.appendChild(legendItem('lg-tri lg-up', 'K crosses up = breadth improving'));
    lg.appendChild(legendItem('lg-tri lg-dn', 'K crosses down = breadth weakening'));
    lg.appendChild(legendItem('lg-ghost', 'as if closed today (hollow = not final)'));
    lg.appendChild(legendItem('lg-flip', 'flip level: the breadth % where K would cross D'));
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
    var dbg = { k: k, n: n, open: open, x0: v.x0, x1: v.x1, ppc: ppc, L: L, pw: pw, spyH: spyH, fH: fH, kH: kH };


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
    var titleS = paneTitle(gS, L + 7, 14, 'SPY');
    var obsS = [titleS], spyNow = null;
    if (lastIn && Q.spy[last] != null) {
      var sx = X(last), sy = Ys(Q.spy[last]), rS = narrow ? 3.5 : 4;
      el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: rS, fill: open ? C.fear : '#F3EEFF', stroke: '#fff', 'stroke-width': 1.2 }, gS);
      spyNow = { x: sx, y: sy, r: rS }; var nowBoxS = dotBox(sx, sy, rS + 1); snap.push({ x: sx, y: sy, dn: last });

      var pl = '$' + Q.spy[last].toFixed(2), pfs = 12, pwid = textW(pl, pfs, 700), right = sx - rS - 6, best = null;
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
        dbg.priceBox = best.box; dbg.spyDot = { x: sx, y: sy, r: rS }; obsS.push(best.box);
      }
    }
    var dotObsS = obsS.slice();
    if (spyNow) obsS.push(nowBoxS);


    var gF = el('g', {}, svg);
    panelRect(gF, L, fTop, pw, fH);
    var Yf = lin(0, 100, fTop + fH, fTop + 16), ax = { top: 100, ticks: [0, 50, 100] };
    var flipIn = Q.flip != null, tagY = flipIn ? Yf(Q.flip) : null;
    kGridY(gF, Yf, ax.ticks.filter(function (t) { return Yf(t) > fTop + 6 && t > 0; }), L, pw);
    grid(gF, fTop, fH); shade(gF, fTop, fH);
    var clipF = clipFor(svg, L, fTop, pw, fH), bw = Math.max(1, ppc * 0.8), base0 = Yf(0);
    var gb = el('g', { 'clip-path': clipF }, gF);
    var bLast = Math.min(b, cut);
    if (ppc >= 2) {
      var dB = '';
      for (i = a; i <= bLast; i++) { if (T.v[i] == null) continue; var top0 = Yf(T.v[i]); dB += 'M' + (X(i) - bw / 2).toFixed(1) + ' ' + base0.toFixed(1) + 'V' + top0.toFixed(1) + 'h' + bw.toFixed(1) + 'V' + base0.toFixed(1) + 'Z'; }
      if (dB) el('path', { d: dB, fill: C.fear, 'fill-opacity': 0.62 }, gb);
    } else {
      var cols = {}, dC = '';
      for (i = a; i <= bLast; i++) { if (T.v[i] == null) continue; var cx = Math.floor(X(i)); if (!(cx in cols) || T.v[i] < cols[cx]) cols[cx] = T.v[i]; }
      Object.keys(cols).forEach(function (cx) { dC += 'M' + cx + ' ' + base0.toFixed(1) + 'V' + Yf(cols[cx]).toFixed(1) + 'h1V' + base0.toFixed(1) + 'Z'; });
      if (dC) el('path', { d: dC, fill: C.fear, 'fill-opacity': 0.62 }, gb);
    }
    if (open && b >= last) {
      var gx = X(last) - Math.max(bw, 3) / 2, gwid = Math.max(bw, 3), gy = Yf(T.v[last]);
      el('rect', { x: gx.toFixed(1), y: gy.toFixed(1), width: gwid.toFixed(1), height: Math.max(0.5, base0 - gy).toFixed(1), fill: C.light, 'fill-opacity': 0.35,
        stroke: C.light, 'stroke-width': 1.1, 'stroke-dasharray': '2 1.5' }, gb);
    }

    el('line', { x1: L, x2: L + pw, y1: Yf(REARM), y2: Yf(REARM), stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '3 4' }, gF);
    var ay = Yf(WASH);
    el('line', { x1: L, x2: L + pw, y1: ay, y2: ay, stroke: DOT.peak, 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.8 }, gF);

    function barHit(bx) {
      var hw = Math.max(bw, 3) / 2 + 1, j0 = Math.max(a, Math.floor(X.inv(bx.x - hw))), j1 = Math.min(b, Math.ceil(X.inv(bx.x + bx.w + hw)));
      for (var j = j0; j <= j1; j++) { var xj = X(j); if (xj + hw < bx.x || xj - hw > bx.x + bx.w) continue; if (T.v[j] != null && Yf(T.v[j]) < bx.y + bx.h + 1) return true; }
      return false;
    }
    var flipTxt = kFlipText(k, Q);
    var titleF = paneTitle(gF, L + 7, fTop + 13, '50-DAY BREADTH %', flipTxt, KC.yel);

    var alab = 'washout 25%', aw = textW(alab, 11) + 6;
    var abox = { x: L + 6, y: ay - 16, w: aw, h: 14 }, obsF = [titleF];
    if (overlaps(abox, titleF) || abox.y < fTop + 2) abox.y = ay + 2;
    var aShow = abox.y + abox.h <= fTop + fH - 1, gAl = el('g', {}, gF);
    if (aShow) obsF.push(abox);
    dbg.flipText = flipTxt;


    var gFl = el('g', {}, gF), gFd = el('g', {}, gF), cands = [], dotObs = [];
    pkIn.forEach(function (j) {
      var x = X(j); if (x < L + rPk + 0.5 || x > L + pw - rPk - 0.5) return;
      cands.push({ j: j, v: T.v[j], x: x, y: Math.max(fTop + rPk + 1.5, Yf(T.v[j])) });
    });
    cands.sort(function (p, q) { return p.v - q.v; });
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

    if (lastIn && T.sigOf[last]) {
      var lx = X(last), lyy = Math.max(fTop + rPk + 3, Yf(T.v[last]));
      el('circle', { cx: lx.toFixed(1), cy: lyy.toFixed(1), r: rPk + 1.5, fill: open ? C.bg : DOT.peak, stroke: DOT.peak, 'stroke-width': 1.8, 'stroke-dasharray': open ? '3 2' : null }, gFd);
      obsF.push(dotBox(lx, lyy, rPk + 2)); dotObs.push(dotBox(lx, lyy, rPk + 2));
    }


    if (Q.flip != null) {
      el('line', { x1: L, x2: L + pw, y1: tagY.toFixed(1), y2: tagY.toFixed(1), stroke: KC.yel, 'stroke-width': 1.3, 'stroke-dasharray': '5 3', 'stroke-opacity': 0.95 }, gFl);
      var tagT = Q.flip.toFixed(1), tw = textW(tagT, 11, 700) + 8;
      var tagR = { x: L + pw - tw - 1, y: tagY - 7.5, w: tw, h: 15 }, tagLft = { x: L + 1, y: tagY - 7.5, w: tw, h: 15 };
      var onObs = function (bx) { return obsF.some(function (o) { return overlaps(o, bx); }); };
      var onDot = function (bx) { return dotObs.some(function (o) { return overlaps(o, bx); }); };
      var tagB = !barHit(tagR) && !onObs(tagR) ? tagR : !onDot(tagLft) && !overlaps(tagLft, titleF) ? tagLft : tagR;
      if (aShow && tagB === tagLft && overlaps(abox, tagB)) {
        var aAlt = ay - 16 < fTop + 2 || overlaps({ x: abox.x, y: ay - 16, w: aw, h: 14 }, titleF) ? null : ay - 16, aY2 = abox.y === ay + 2 ? aAlt : ay + 2;
        var aC = [{ x: tagB.x + tw + 4, y: abox.y }, { x: abox.x, y: aY2 }, { x: tagB.x + tw + 4, y: aY2 }].filter(function (q) { return q.y != null; })
          .map(function (q) { return { x: q.x, y: q.y, w: aw, h: 14 }; })
          .filter(function (q) { return q.y >= fTop + 2 && q.y + q.h <= fTop + fH - 1 && !overlaps(q, titleF) && !overlaps(q, tagB) && !onDot(q); });
        if (aC.length) { abox.x = aC[0].x; abox.y = aC[0].y; } else aShow = false;
      }
      var gTag = el('g', {}, gF);
      el('rect', { x: tagB.x.toFixed(1), y: tagB.y.toFixed(1), width: tw.toFixed(1), height: 15, rx: 2, fill: KC.yel }, gTag);
      tx(gTag, tagB.x + tw / 2, tagY + 3.8, tagT, { fill: C.bg, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
      tagB.full = true; obsF.push(tagB);
      dbg.flipY = tagY; dbg.flipTag = tagT; dbg.flipSide = tagB === tagLft ? 'L' : 'R';
    }
    if (!aShow) obsF = obsF.filter(function (o) { return o !== abox; });
    if (aShow) {
      el('rect', { x: abox.x, y: abox.y, width: abox.w, height: abox.h, fill: C.panel, 'fill-opacity': 0.85 }, gAl);
      tx(gAl, abox.x + 3, abox.y + 11, alab, { fill: '#E8C547', 'font-size': 11 });
    }
    dbg.alarmBox = aShow ? { x: abox.x, y: abox.y, w: abox.w, h: abox.h } : null;
    var jl = function (j) { return isoOf(T.s[j]) + (T.s[j] !== T.e[j] ? '..' + isoOf(T.e[j]) : '') + ' ' + f1(T.v[j]); };
    var byJ = function (p, q) { return p - q; };
    dbg.peaks = { rule: pkIn.slice().sort(byJ).map(jl), wash: keptF.map(function (d) { return d.j; }).sort(byJ).map(jl), spy: spyPk.sort(byJ).map(jl),
      spyUnderNow: spyUnder.sort(byJ).map(jl), spyHidden: spyHidden.sort(byJ).map(jl), edgeCut: edgeCut.map(jl), r: rPk };

    var rX = open && lastIn && col.w <= 16 && col.x - 1 < L + pw - 2 ? col.x - 1 : null;
    var labS = kInsideLabels(gS, pt.ticks.map(function (t) { return { y: Ys(t), s: t.toFixed(pt.dec) }; }), L, pw, obsS, kLineHit(X, Ys, Q.spy, a, b, 2), 0, spyH, false, rX);
    var labF = kInsideLabels(gF, ax.ticks.filter(function (t) { return t > 0; }).map(function (t) { return { y: Yf(t), s: String(t) }; }), L, pw, obsF, barHit, fTop, fTop + fH, true, rX);


    var gK = el('g', {}, svg);
    panelRect(gK, L, kTop, pw, kH);
    var Yk = lin(-20, 120, kTop + kH, kTop);
    el('rect', { x: L, y: Yk(120), width: pw, height: Yk(80) - Yk(120), fill: KC.up, 'fill-opacity': 0.07 }, gK);
    el('rect', { x: L, y: Yk(20), width: pw, height: Yk(-20) - Yk(20), fill: KC.dn, 'fill-opacity': 0.07 }, gK);
    kGridY(gK, Yk, [0, 50, 100], L, pw);
    grid(gK, kTop, kH); shade(gK, kTop, kH);
    var clipK = clipFor(svg, L, kTop, pw, kH), lwK = ppc < 1 ? 1 : ppc < 2.5 ? 1.3 : narrow ? 1.6 : 1.9;
    kLine(gK, X, Yk, Q.idx, Q.J, a, b, cut, clipK, KC.j, ppc < 1 ? 0.7 : 1, ppc < 1 ? 0.4 : ppc < 2.5 ? 0.6 : 0.8, open, null, 1);
    kLine(gK, X, Yk, Q.idx, Q.K, a, b, cut, clipK, KC.k, lwK, 1, open);
    kLine(gK, X, Yk, Q.idx, Q.D, a, b, cut, clipK, KC.d, lwK, 1, open);
    var titleK = paneTitle(gK, L + 7, kTop + 13, 'KDJ OF 50-DAY BREADTH');

    var gG = el('g', {}, gK), gr = narrow ? 3.4 : 4, ghostY = {}, obsK = [];
    if (open && lastIn) {
      var gxx = X(last);
      [['J', KC.j], ['D', KC.d], ['K', KC.k]].forEach(function (s) {
        var val = Q[s[0]][last], yy = Math.max(kTop + gr + 1.5, Math.min(kTop + kH - gr - 1.5, Yk(val)));
        el('circle', { cx: gxx.toFixed(1), cy: yy.toFixed(1), r: gr, fill: C.bg, stroke: s[1], 'stroke-width': 1.7 }, gG);
        ghostY[s[0]] = yy; snap.push({ x: gxx, y: yy, dn: last }); obsK.push(dotBox(gxx, yy, gr + 1));
      });
      dbg.ghostDots = 3;
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
          cand = cand.filter(free).sort(function (p, q) { return Math.abs(p - y) - Math.abs(q - y); });
          if (cand.length) y = cand[0]; else dx = -(gr + tri + 2);
        }
      }
      if (overlaps(titleK, { x: x - tri, y: y - tri, w: 2 * tri, h: 2 * tri }) && !hollow) y = clampY(Math.max(y, titleK.y + titleK.h + tri + 1));
      keptX.push(x);
      el('path', { d: triPath(x + dx, y, tri, up), fill: hollow ? C.bg : (up ? KC.up : KC.dn), stroke: hollow ? (up ? KC.up : KC.dn) : C.bg, 'stroke-width': hollow ? 1.5 : 0.8 }, gT);
      snap.push({ x: x + dx, y: y, dn: j }); crossShown.push({ i: j, dir: Q.cross[j], hollow: hollow, y: y, x: x + dx, r: tri });
    });
    crossShown.forEach(function (c) { obsK.push({ x: c.x - c.r - 1, y: c.y - c.r - 1, w: 2 * c.r + 2, h: 2 * c.r + 2 }); });
    obsK.push(titleK);
    var labK = kInsideLabels(gK, [100, 50, 0].map(function (t) { return { y: Yk(t), s: String(t) }; }), L, pw, obsK,
      anyHit([kLineHit(X, Yk, Q.K, a, b, 1.5), kLineHit(X, Yk, Q.D, a, b, 1.5)]), kTop, kTop + kH, true, rX);
    dbg.yLabels = { spy: labS.map(function (o) { return o.s + o.side; }), fear: labF.map(function (o) { return o.s + o.side; }), kdj: labK.map(function (o) { return o.s + o.side; }) };
    dbg.crosses = crossShown.length; dbg.crossList = crossShown; dbg.crossOnLast = Q.cross[last] || null;


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
    dbg.ticks = ticks.map(function (t) { return t.label; }); dbg.H = H; dbg.W = W;
    kDebug[k] = dbg;
  }
  function kReadout(k, j, picked) {
    var B = KB[k], Q = D.kdj[k], T = D.tf[k], ro = B.ro, isLast = j === Q.n - 1;
    clear(ro);
    ro.appendChild(span('d', kRangeLabel(k, T, j, true) + (isLast && Q.open ? ' (so far)' : '')));
    ro.appendChild(span('', ' · 50-day '));
    ro.appendChild(span('p', isLast ? pct1(doc.stats[k].latest) : pct1(T.v[j])));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('pc', pctWord(pctCandle(k, j).s13)));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('kk', 'K ' + f0(Q.K[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kd', 'D ' + f0(Q.D[j])));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kj', 'J ' + f0(Q.J[j])));
    ro.appendChild(span('', ' · SPY ' + (Q.spy[j] == null ? '–' : Q.spy[j].toFixed(2))));
    var c = Q.cross[j];
    var wt = washTag(k, j); if (wt) ro.appendChild(span('pk', ' · ' + wt));
    if (c) ro.appendChild(span(c === 'up' ? 'up' : 'down', ' · ' + (c === 'up' ? '▲ K crossed above D' : '▼ K crossed below D') + (isLast && Q.open ? ' (if it closed now)' : '')));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' for any ' + K_UNIT[k][0]));
  }
  function requestKdj(k) {
    if (k === 'all') TFS.forEach(function (t) { kPending[t] = 1; }); else kPending[k] = 1;
    if (kRaf) return;
    kRaf = true;
    requestAnimationFrame(function () { kRaf = false; drawKdjPending(); });
  }
  function drawKdjPending() {
    if (!doc || !D || !D.kdj) return;
    var todo = Object.keys(kPending); kPending = {};
    try { todo.forEach(drawKdj); $('kdjErr').hidden = true; renderKChips(); }
    catch (e) { var er = $('kdjErr'); er.hidden = false; er.textContent = 'The KDJ section could not be drawn (' + e.message + ').'; }
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


  var GZ = {"cutoff":"2026-10-01","drops":["2015-08-21","2016-01-13","2018-02-08","2018-04-02","2018-10-24","2019-06-03","2020-02-27","2020-09-08","2021-03-08","2022-01-20","2023-10-26","2024-08-02","2025-03-10","2026-03-27","2026-07-29"],"generated":"2026-10-03","source":"edge_study (official TradingView breadth, Yahoo QQQ/IWM/SPY, VIX), 2013+","storms":{"breaks":10,"down":{"days":508,"rv":24.1,"vix":27.1},"excess_pct":20,"up":{"days":2930,"rv":12.5,"vix":16.1}},"thin":{"bands":[{"days":371,"drop_days":136,"hi":60.0,"label":"under 60%","lo":0,"pct":36.7},{"days":755,"drop_days":172,"hi":70.0,"label":"60-70%","lo":60.0,"pct":22.8},{"days":1322,"drop_days":107,"hi":100,"label":"over 70%","lo":70.0,"pct":8.1}],"bands_2021":[{"days":221,"drop_days":54,"hi":60.0,"label":"under 60%","lo":0,"pct":24.4},{"days":306,"drop_days":98,"hi":70.0,"label":"60-70%","lo":60.0,"pct":32.0},{"days":325,"drop_days":20,"hi":100,"label":"over 70%","lo":70.0,"pct":6.2}],"base_pct":17.0,"base_pct_2021":20.2,"broad_from":70.0,"days_known":2448,"drop_pct":-10.0,"near_pct":-5.0,"spans":[["2014-10-07","2014-10-07"],["2014-10-09","2014-10-09"],["2014-10-21","2014-10-23"],["2015-06-29","2015-07-10"],["2015-07-27","2015-07-28"],["2015-08-11","2015-08-14"],["2015-08-18","2015-08-19"],["2015-10-16","2015-10-20"],["2015-10-22","2015-10-30"],["2015-11-04","2015-11-30"],["2015-12-02","2016-01-05"],["2016-03-29","2016-04-08"],["2016-04-12","2016-04-25"],["2016-05-25","2016-05-26"],["2016-06-09","2016-06-10"],["2016-06-23","2016-06-23"],["2016-07-07","2016-07-08"],["2016-09-09","2016-09-09"],["2016-10-28","2016-10-28"],["2016-11-01","2016-11-04"],["2017-10-31","2017-10-31"],["2017-11-02","2017-11-02"],["2017-11-14","2017-11-14"],["2018-05-07","2018-05-09"],["2018-05-15","2018-05-15"],["2018-05-21","2018-05-21"],["2018-05-29","2018-05-31"],["2018-06-25","2018-07-05"],["2018-09-06","2018-09-06"],["2018-09-10","2018-09-17"],["2018-09-25","2018-09-25"],["2018-10-01","2018-10-03"],["2018-10-05","2018-10-09"],["2018-10-16","2018-10-17"],["2019-03-13","2019-03-14"],["2019-10-03","2019-10-03"],["2019-10-08","2019-10-08"],["2020-05-08","2020-05-11"],["2020-05-18","2020-05-19"],["2020-05-21","2020-05-22"],["2021-10-07","2021-10-07"],["2021-11-26","2021-12-02"],["2021-12-06","2021-12-10"],["2021-12-16","2021-12-17"],["2021-12-21","2021-12-22"],["2022-01-05","2022-01-06"],["2023-05-03","2023-05-03"],["2023-05-16","2023-05-16"],["2023-05-25","2023-05-25"],["2023-11-03","2023-11-06"],["2023-11-08","2023-11-09"],["2024-06-03","2024-06-03"],["2024-09-20","2024-09-23"],["2024-09-25","2024-09-25"],["2024-10-07","2024-10-08"],["2024-10-23","2024-10-24"],["2024-10-28","2024-10-28"],["2024-10-30","2024-11-05"],["2024-11-15","2024-11-15"],["2024-11-19","2024-11-20"],["2024-12-13","2024-12-31"],["2025-01-03","2025-01-08"],["2025-01-16","2025-01-16"],["2025-01-27","2025-01-27"],["2025-01-29","2025-01-29"],["2025-05-13","2025-05-13"],["2025-05-15","2025-05-15"],["2025-05-21","2025-05-22"],["2025-05-28","2025-06-03"],["2025-06-05","2025-06-05"],["2025-06-20","2025-06-20"],["2025-07-31","2025-08-07"],["2025-08-11","2025-08-11"],["2025-08-26","2025-08-26"],["2025-09-02","2025-09-03"],["2025-09-09","2025-09-10"],["2025-09-12","2025-09-25"],["2025-09-30","2025-10-01"],["2025-10-08","2025-10-20"],["2025-10-29","2025-11-14"],["2025-11-24","2025-12-04"],["2025-12-08","2025-12-16"],["2025-12-18","2025-12-19"],["2025-12-31","2026-01-05"],["2026-01-08","2026-01-08"],["2026-01-12","2026-01-26"],["2026-01-28","2026-02-04"],["2026-02-06","2026-02-11"],["2026-02-18","2026-02-20"],["2026-02-24","2026-03-02"],["2026-03-04","2026-03-05"],["2026-03-09","2026-03-11"],["2026-03-17","2026-03-17"],["2026-04-08","2026-05-26"],["2026-05-29","2026-06-04"],["2026-06-08","2026-06-08"],["2026-06-11","2026-06-22"],["2026-06-25","2026-06-25"],["2026-06-30","2026-06-30"],["2026-09-09","2026-09-14"],["2026-09-17","2026-10-01"]],"stretches":{"drop":5,"n":13,"rows":[{"days":5,"drop":false,"drop_days":0,"end":"2014-10-23","resolved":true,"start":"2014-10-07"},{"days":100,"drop":true,"drop_days":66,"end":"2016-11-04","resolved":true,"start":"2015-06-29"},{"days":3,"drop":false,"drop_days":0,"end":"2017-11-14","resolved":true,"start":"2017-10-31"},{"days":32,"drop":true,"drop_days":16,"end":"2018-10-17","resolved":true,"start":"2018-05-07"},{"days":2,"drop":false,"drop_days":0,"end":"2019-03-14","resolved":true,"start":"2019-03-13"},{"days":2,"drop":false,"drop_days":0,"end":"2019-10-08","resolved":true,"start":"2019-10-03"},{"days":6,"drop":false,"drop_days":0,"end":"2020-05-22","resolved":true,"start":"2020-05-08"},{"days":17,"drop":true,"drop_days":16,"end":"2022-01-06","resolved":true,"start":"2021-10-07"},{"days":3,"drop":false,"drop_days":0,"end":"2023-05-25","resolved":true,"start":"2023-05-03"},{"days":4,"drop":false,"drop_days":0,"end":"2023-11-09","resolved":true,"start":"2023-11-03"},{"days":1,"drop":false,"drop_days":0,"end":"2024-06-03","resolved":true,"start":"2024-06-03"},{"days":35,"drop":true,"drop_days":16,"end":"2025-01-29","resolved":true,"start":"2024-09-20"},{"days":176,"drop":true,"drop_days":22,"end":"2026-10-01","resolved":false,"start":"2025-05-13"}]},"thin_below":60.0,"window":63},"thrust":{"arm":25,"base_median":3.0,"base_since":"2013-10-14","base_up_pct":65.0,"edge_hi":5.0,"edge_lo":3.5,"events":[{"date":"2014-02-24","iwm63":-3.6,"r2fi":56.7},{"date":"2014-06-05","iwm63":1.5,"r2fi":57.6},{"date":"2014-10-28","iwm63":4.0,"r2fi":63.5},{"date":"2015-10-08","iwm63":-9.7,"r2fi":55.6},{"date":"2016-03-02","iwm63":9.5,"r2fi":60.1},{"date":"2016-11-09","iwm63":13.0,"r2fi":55.3},{"date":"2019-01-18","iwm63":5.6,"r2fi":57.0},{"date":"2019-09-10","iwm63":6.0,"r2fi":58.0},{"date":"2020-04-29","iwm63":10.6,"r2fi":69.5},{"date":"2020-10-07","iwm63":30.5,"r2fi":59.8},{"date":"2022-10-28","iwm63":5.0,"r2fi":61.5},{"date":"2023-11-14","iwm63":15.0,"r2fi":60.8},{"date":"2024-05-09","iwm63":0.6,"r2fi":56.1},{"date":"2025-05-12","iwm63":9.4,"r2fi":66.2},{"date":"2026-04-09","iwm63":13.3,"r2fi":57.6}],"fire":55,"median":6.0,"n":15,"rally_median":-0.4,"rearm":63,"up":13,"window":15}};





  var GC = { amber: '#E8A33D', yel: '#FFD84D', green: '#26A69A', orange: '#F0883E', red: '#EF5350', blue: '#3987E5', light: '#8EC0FA',
             bar: '#3A3F52', grey: '#8A8E99', ink: '#131722', dim: '#5D6270' };
  var GZS = { thin: null, thrust: null, storms: null };
  var GZW = 0;
  var gzUid = 0;
  function gzClip(svg, x, y, w, h) {
    var id = 'gzc' + (++gzUid), defs = svg.querySelector('defs') || el('defs', {}, svg);
    var cp = el('clipPath', { id: id }, defs); el('rect', { x: x, y: y, width: w, height: h }, cp);
    return 'url(#' + id + ')';
  }
  function gzNum(v) { return typeof v === 'number' && isFinite(v); }
  function gzLast(a, upto) { for (var i = upto == null ? a.length - 1 : upto; i >= 0; i--) if (gzNum(a[i])) return i; return -1; }
  function gzQ(card, k) { return $(card).querySelector('[data-g="' + k + '"]'); }
  function gzText(card, k, s) { var n = gzQ(card, k); if (n) n.textContent = s == null ? '' : s; return n; }
  function gzParts(node, parts) {
    clear(node);
    parts.forEach(function (p) { if (p && p[1]) node.appendChild(span(p[0], p[1])); });
  }
  function gzChip(card, word, color) {
    var c = gzQ(card, 'chip'); c.textContent = word; c.style.background = color; c.style.color = color === GC.dim ? C.white : ''; c.hidden = false;
  }
  function gzShow(card, ok, msg) {
    ['body', 'box', 'src'].forEach(function (k) { var n = gzQ(card, k); if (n) n.hidden = !ok; });
    var na = gzQ(card, 'na'); na.hidden = ok; na.textContent = ok ? '' : msg;
    if (!ok) { gzQ(card, 'chip').hidden = true; gzText(card, 'asof', ''); }
  }
  function gzDay(iso, yr) { return fmtDay(dayNum(iso), !!yr); }
  function gzOneIn(p) { return Math.max(1, Math.round(100 / p)); }
  function gzInt(v) { return Math.round(v).toLocaleString('en-US'); }
  function gzS(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function gzWord(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] || String(n); }
  function gzDates(list) {
    var one = list.every(function (s) { return s.slice(0, 4) === list[0].slice(0, 4); });
    var p = list.map(function (s) { return gzDay(s, !one); });
    var t = p.length > 1 ? p.slice(0, -1).join(', ') + ' and ' + p[p.length - 1] : p[0] || '';
    return one && p.length ? t + ', ' + list[0].slice(0, 4) : t;
  }

  function gzHigh52(q) {
    var n = q.length, out = new Array(n), dq = [], cnt = 0;
    for (var i = 0; i < n; i++) {
      if (gzNum(q[i])) { while (dq.length && q[dq[dq.length - 1]] <= q[i]) dq.pop(); dq.push(i); cnt++; }
      if (i >= 252 && gzNum(q[i - 252])) cnt--;
      while (dq.length && dq[0] <= i - 252) dq.shift();
      out[i] = cnt >= 126 && dq.length ? q[dq[0]] : null;
    }
    return out;
  }

  function gzCal() { return doc.daily.d.concat(Array.isArray(doc.sessions_ahead) ? doc.sessions_ahead : []); }
  function gzCalAt(cal, i) {
    if (i < cal.length) return cal[i];
    var dn = dayNum(cal[cal.length - 1]);
    for (var k = cal.length - 1; k < i; k++) dn = nextSession(dn);
    return isoOf(dn);
  }


  function gzInputs() {
    var n = doc.daily.d.length, I = doc.idx || {}, nd = I.NDX, r2 = I.R2000;
    function arr(a) { return Array.isArray(a) && a.length === n; }
    return {
      thin: !!(nd && arr(nd.f200) && arr(nd.etf_c) && gzLast(nd.f200) >= 0),
      thrust: !!(r2 && arr(r2.f50) && arr(r2.etf_c) && gzLast(r2.f50) >= 0 && Array.isArray(doc.sessions_ahead)),
      storms: arr(doc.daily.spy) && n >= 260
    };
  }


  var THIN_C = { 'THIN RALLY': GC.amber, 'MIXED': GC.grey, 'BROAD RALLY': GC.green, 'PULLBACK': GC.dim, 'NO QQQ PRICE': GC.dim };
  function thinState() {
    var nd = doc.idx.NDX, d = doc.daily.d, n = d.length, f = nd.f200, q = nd.etf_c, T = GZ.thin, cutDn = dayNum(GZ.cutoff), i;
    var nq = gzLast(f), lq = gzLast(q, nq), hi = gzHigh52(q);

    var noQ = lq < 0 || hi[lq] == null;
    var ndth = f[nq] / 10, offRaw = noQ ? null : (q[lq] / hi[lq] - 1) * 100, off = noQ ? null : f1(offRaw);
    var near = !noQ && offRaw > T.near_pct;

    var sp = T.spans.map(function (s) { return [dayNum(s[0]), dayNum(s[1])]; }), flag = new Array(n), si = 0;
    for (i = 0; i < n; i++) {
      var dn = D.d[i];
      if (i > nq) { flag[i] = false; continue; }
      if (dn <= cutDn) { while (si < sp.length && sp[si][1] < dn) si++; flag[i] = si < sp.length && sp[si][0] <= dn; }
      else flag[i] = gzNum(f[i]) && gzNum(q[i]) && hi[i] != null && f[i] < T.thin_below * 10 && (q[i] / hi[i] - 1) * 100 > T.near_pct;
    }
    var band = -1;
    T.bands.forEach(function (b, k) { if (ndth >= b.lo && (ndth < b.hi || (k === T.bands.length - 1 && ndth <= b.hi))) band = k; });
    var state = noQ ? 'NO QQQ PRICE' : !near ? 'PULLBACK' : ndth < T.thin_below ? 'THIN RALLY' : ndth < T.broad_from ? 'MIXED' : 'BROAD RALLY';
    var w0 = Math.max(0, nq - 251), on = 0, flagged = [];
    for (i = w0; i <= nq; i++) if (flag[i]) on++;
    for (i = 0; i <= nq; i++) if (flag[i]) flagged.push(i);

    var st0 = null, stN = 0;
    flagged.forEach(function (j, k) { if (k === 0 || j - flagged[k - 1] > T.window) { st0 = j; stN = 0; } stN++; });
    var stretchOn = !noQ && flagged.length > 0 && nq - flagged[flagged.length - 1] <= T.window;


    var drops = GZ.drops.slice(), lastD = drops.length ? dayNum(drops[drops.length - 1]) : null, armed = lastD == null, after = [];
    for (i = 0; i < n; i++) {
      if (!gzNum(q[i]) || hi[i] == null) continue;
      if (lastD != null && D.d[i] < lastD) continue;
      if (q[i] >= hi[i]) armed = true;
      else if (armed && (q[i] / hi[i] - 1) * 100 <= T.drop_pct) { if (D.d[i] > cutDn) after.push(d[i]); armed = false; }
    }
    var dropIdx = {};
    drops.concat(after).forEach(function (s) { var j = bsearchLE(D.d, dayNum(s)); if (j >= 0 && D.d[j] === dayNum(s)) dropIdx[j] = 1; });
    var stretch = null;
    if (stretchOn) {
      stretch = { start: d[st0], days: stN, sessions: nq - st0 + 1, drops: drops.concat(after).filter(function (s) { return s >= d[st0] && s <= d[nq]; }) };
    }
    return { ok: true, state: state, noQ: noQ, ndth: ndth, offHigh: off, near: near, band: band, nq: nq, lq: lq, asOf: nd.session || d[nq],
      flag: flag, hi: hi, q: q, f: f, on252: on, len252: nq - w0 + 1, flagged: flagged, stretch: stretch, dropsAfter: after, dropOpen: !armed, dropIdx: dropIdx };
  }
  function thinText(S) {
    var c = 'gzThin', T = GZ.thin, B = T.bands, B21 = T.bands_2021 || [], drop = Math.abs(T.drop_pct), nearW = Math.abs(T.near_pct);
    var atHigh = !S.noQ && S.offHigh >= -0.05, offW = S.noQ ? '' : atHigh ? 'at its 52-week high' : Math.abs(S.offHigh).toFixed(1) + '% below its 52-week high';
    gzChip(c, S.state, THIN_C[S.state]);
    gzText(c, 'sub', 'When QQQ is near its high but few Nasdaq-100 stocks are above their 200-day, a ' + drop + '% drop has followed more often');
    gzText(c, 'asof', 'as of the ' + gzDay(S.asOf) + ' close · Nasdaq-100 breadth and QQQ update after each close');
    gzText(c, 'big', pct1(S.ndth));
    gzText(c, 'unit', 'of Nasdaq-100 stocks above their 200-day');
    gzText(c, 'l1', S.noQ ? 'QQQ: prices missing in this update' : 'QQQ ' + offW + (S.near ? '' : ' (more than ' + nearW + '%: not a near-high day)'));
    gzText(c, 'l2', S.noQ ? 'Thin-rally days: not available without QQQ prices' : 'Thin-rally days: ' + S.on252 + ' of the last ' + S.len252 + ' sessions');
    gzText(c, 'cap', 'How often a day with QQQ near its high was followed by a ' + drop + '% drop within 3 months, by Nasdaq-100 breadth. Bars: 2013+' +
      (B21.length ? ' · small figures: since 2021' : '') + (gzNum(T.base_pct) ? ' · all near-high days: ' + Math.round(T.base_pct) + '%' : ''));
    gzText(c, 'ct', S.noQ ? '' : 'QQQ since ' + doc.daily.d[0].slice(0, 4) + ' (log scale) · red dot = QQQ first closed ' + drop + '% under its 52-week high · amber strip = thin-rally days');


    var rp = function (x) { return Math.round(x.pct) + '%'; }, how = 'Plain counts, not a forecast. When QQQ was near its high, a ' + drop +
      '% drop followed within 3 months on ' + rp(B[0]) + ' of days with breadth under ' + T.thin_below + '%, against ' + rp(B[B.length - 1]) +
      ' with breadth over ' + T.broad_from + '% (2013+).';
    if (B21.length === B.length) {
      var p21 = '(' + B21.map(rp).join(' / ') + ')', last21 = B21[B21.length - 1].pct;
      var broadBest = B21.every(function (x, k) { return k === B21.length - 1 || x.pct > last21; });
      var midWorst = B21.length === 3 && B21[1].pct > B21[0].pct && B21[1].pct > B21[2].pct;
      how += midWorst && broadBest ? ' Since 2021 the middle band did worst ' + p21 + ', so the steady part is that broad rallies rarely broke.' :
        broadBest ? ' Since 2021: ' + p21.slice(1, -1) + ', so the steady part is that broad rallies rarely broke.' : ' Since 2021: ' + p21.slice(1, -1) + '.';
    }
    gzText(c, 'how', how + ' ' + T.stretches.n + ' separate stretches, ' + T.stretches.drop + ' led to a drop. Context for sizing risk, not a sell signal.');
    var b = B[S.band] || null, bp = b ? Math.round(b.pct) + '%' : '–', b21 = B21[S.band] ? ' (' + Math.round(B21[S.band].pct) + '% since 2021)' : '', now;
    var breadthW = pct1(S.ndth) + ' of Nasdaq-100 stocks are above their 200-day';
    if (S.state === 'THIN RALLY') {
      now = 'QQQ is ' + offW + ' and only ' + breadthW + '.';
      if (S.stretch) {
        var sd = S.stretch.drops;
        now += ' This thin stretch began ' + gzDay(S.stretch.start, true) + ' and ' + (sd.length ? 'has already seen ' + gzWord(sd.length) + ' ' + drop + '% drop' +
          (sd.length === 1 ? '' : 's') + ' (' + gzDates(sd) + ').' : 'has not seen a ' + drop + '% drop yet.');
      }
    } else if (S.state === 'MIXED') now = 'QQQ is ' + offW + ' and ' + breadthW + ': the middle band, not a thin rally. A ' + drop +
      '% drop followed within 3 months on ' + bp + ' of days like this since 2013' + b21 + '.';
    else if (S.state === 'BROAD RALLY') now = 'QQQ is ' + offW + ' and ' + breadthW + ': a broad rally. A ' + drop +
      '% drop followed within 3 months on only ' + bp + ' of days like this since 2013' + b21 + '.';
    else if (S.state === 'PULLBACK') now = 'QQQ is ' + Math.abs(S.offHigh).toFixed(1) + '% below its 52-week high, more than the ' + nearW + '% these counts cover, so they do not apply today. ' +
      (S.dropsAfter.length && S.dropOpen ? 'It closed ' + drop + '% under that high on ' + gzDay(S.dropsAfter[S.dropsAfter.length - 1], true) + '; Nasdaq-100 breadth is ' + pct1(S.ndth) + '.' :
        'They come back once QQQ is within ' + nearW + '% of its high; Nasdaq-100 breadth is ' + pct1(S.ndth) + ' now.');
    else now = 'QQQ prices are missing in this update, so the card cannot tell if QQQ is near its high. Nasdaq-100 breadth is ' + pct1(S.ndth) +
      (b ? ' (the ' + b.label + ' band)' : '') + '.';
    gzText(c, 'now', now);
    gzText(c, 'src', 'Why counts, not a percentage: a fitted “chance of a drop” model, replayed day by day since 2016, was badly calibrated. ' +
      'The same check on the S&P 500 found nothing. Near the high means QQQ within ' + nearW + '% of its 52-week high (its highest close of the last 252 sessions). In the bars, a ' + drop +
      '% drop means QQQ traded at least ' + drop + '% under that day’s close at some point in the next 3 months (63 sessions). History: ' +
      'TradingView’s official Nasdaq-100 breadth (NDTH) to ' + gzDay(GZ.cutoff, true) + '; after it, our live count of today’s members. ' +
      'QQQ closes are split-adjusted, not dividend-adjusted.');
  }
  function drawThinBars(S) {
    var holder = gzQ('gzThin', 'mini'), W = Math.max(240, Math.round(holder.clientWidth)), ph = gzPhone(), B = GZ.thin.bands, cur = S.band;
    var hiP = Math.max(40, Math.max.apply(null, B.map(function (b) { return b.pct; })) * 1.08), col = [GC.amber, GC.grey, GC.green], svg, g;
    var B21 = GZ.thin.bands_2021 || [], drop = Math.abs(GZ.thin.drop_pct);
    function barFill(k) { return k === cur && S.near ? col[Math.min(k, 2)] : GC.bar; }
    function since21(k) { return B21[k] ? 'since 2021: ' + Math.round(B21[k].pct) + '%' : ''; }
    function tip(k) {
      var b = B[k], t = gzInt(b.days) + ' near-high days since 2013, ' + gzInt(b.drop_days) + ' followed by a ' + drop + '% drop';
      return B21[k] ? t + '; since 2021: ' + gzInt(B21[k].days) + ' days, ' + gzInt(B21[k].drop_days) + ' followed by one' : t;
    }
    if (ph) {
      var rowH = B21.length ? 42 : 30, lw = 74, H = B.length * rowH + 4;
      svg = svgFor(holder, W, H); g = el('g', {}, svg);
      var tagW = textW('37%', 13, 700) + 6 + textW(S.near ? '← now' : '← breadth now', 11.5) + 4, bw = W - lw - 8 - tagW;
      B.forEach(function (b, k) {
        var y = 4 + k * rowH, w = Math.max(2, b.pct / hiP * bw), on = k === cur;
        tx(g, lw, y + 16, b.label, { fill: on ? C.white : C.muted, 'font-size': 12, 'text-anchor': 'end', 'font-weight': on ? 600 : 400 });
        var r = el('rect', { x: lw + 8, y: y + 3, width: w.toFixed(1), height: 18, rx: 2, fill: barFill(k) }, g);
        if (on && !S.near) { r.setAttribute('stroke', col[Math.min(k, 2)]); r.setAttribute('stroke-dasharray', '3 3'); }
        tx(g, lw + 8 + w + 6, y + 17, Math.round(b.pct) + '%', { fill: C.white, 'font-size': 13, 'font-weight': 700 });
        if (on) tx(g, lw + 8 + w + 6 + textW(Math.round(b.pct) + '%', 13, 700) + 6, y + 17, S.near ? '← now' : '← breadth now', { fill: S.near ? col[Math.min(k, 2)] : C.muted, 'font-size': 11.5 });
        if (B21[k]) tx(g, lw + 8, y + 35, since21(k), { fill: C.muted, 'font-size': 11 });
        var t = el('title', {}, r); t.textContent = tip(k);
      });
      return;
    }
    var H2 = B21.length ? 166 : 150, base = H2 - (B21.length ? 40 : 24), top = 34, slot = W / B.length, bwd = Math.min(92, slot - 26);
    svg = svgFor(holder, W, H2); g = el('g', {}, svg);
    B.forEach(function (b, k) {
      var cx = slot * (k + 0.5), h = Math.max(2, b.pct / hiP * (base - top)), on = k === cur;
      var r = el('rect', { x: (cx - bwd / 2).toFixed(1), y: (base - h).toFixed(1), width: bwd.toFixed(1), height: h.toFixed(1), rx: 2, fill: barFill(k) }, g);
      if (on && !S.near) { r.setAttribute('stroke', col[Math.min(k, 2)]); r.setAttribute('stroke-dasharray', '3 3'); }
      var t = el('title', {}, r); t.textContent = tip(k);
      tx(g, cx, base - h - 6, Math.round(b.pct) + '%', { fill: C.white, 'font-size': 15, 'font-weight': 700, 'text-anchor': 'middle' });
      if (on) tx(g, cx, base - h - 25, S.near ? 'now' : 'breadth now', { fill: S.near ? col[Math.min(k, 2)] : C.muted, 'font-size': 12, 'text-anchor': 'middle' });
      tx(g, cx, base + 17, b.label, { fill: on ? C.white : C.muted, 'font-size': 12.5, 'text-anchor': 'middle', 'font-weight': on ? 600 : 400 });
      if (B21[k]) tx(g, cx, base + 33, since21(k), { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    });
  }
  function drawThinChart(S) {
    var holder = gzQ('gzThin', 'chart'), W = Math.max(260, Math.round(holder.clientWidth)), ph = W < 520;
    if (S.noQ) {
      clear(holder); holder._gz = null;
      gzParts(gzQ('gzThin', 'ro'), [['m', 'QQQ prices are missing in this update, so the QQQ chart is not drawn.']]);
      return;
    }
    var L = ph ? 32 : 42, R = 6, top = 8, plotH = ph ? 196 : 292, stripH = ph ? 8 : 12, stripY = top + plotH + 8, H = stripY + stripH + 22, pw = W - L - R;
    var q = S.q, i0 = 0, i1 = S.lq, i;
    while (i0 < i1 && !gzNum(q[i0])) i0++;
    var lo = Infinity, hi = -Infinity;
    for (i = i0; i <= i1; i++) if (gzNum(q[i])) { lo = Math.min(lo, q[i]); hi = Math.max(hi, q[i]); }
    var svg = svgFor(holder, W, H), g = el('g', {}, svg), X = lin(D.d[i0], D.d[i1], L, L + pw);
    var ly = lin(Math.log(lo * 0.92), Math.log(hi * 1.06), top + plotH, top), Y = function (v) { return ly(Math.log(v)); };
    var cand = ph ? [10, 30, 60, 100, 300, 600, 1000, 3000, 6000] : [5, 10, 15, 20, 30, 40, 60, 100, 150, 200, 300, 400, 600, 1000, 1500, 2000, 3000, 4000, 6000], yt = [], lastPy = Infinity;
    cand.forEach(function (v) { if (v < lo * 0.92 || v > hi * 1.06) return; var py = Y(v); if (lastPy - py >= (ph ? 34 : 30)) { yt.push(v); lastPy = py; } });
    yTicks(g, Y, yt, L + pw, L, function (v) { return String(v); }, 'left');
    gzYears(g, X, D.d[i0], D.d[i1], L, L + pw, H - 6, ph);

    el('rect', { x: L, y: stripY, width: pw, height: stripH, fill: C.line, rx: 1 }, g);
    var runs = [], a = null;
    for (i = i0; i <= S.nq + 1; i++) {
      var on = i <= S.nq && S.flag[i];
      if (on && a == null) a = i;
      if (!on && a != null) { runs.push([a, i - 1]); a = null; }
    }
    var px = [];
    runs.forEach(function (r) {
      var x0 = X(D.d[r[0]]) - 0.6, x1 = X(D.d[r[1]]) + 0.6;
      if (x1 - x0 < 1.6) { var mid = (x0 + x1) / 2; x0 = mid - 0.8; x1 = mid + 0.8; }
      var p = px[px.length - 1];
      if (p && x0 - p[1] < 1) p[1] = Math.max(p[1], x1); else px.push([x0, x1]);
    });
    px.forEach(function (p) { el('rect', { x: Math.max(L, p[0]).toFixed(1), y: stripY, width: Math.max(1.2, Math.min(L + pw, p[1]) - Math.max(L, p[0])).toFixed(1), height: stripH, fill: GC.amber }, g); });
    if (!ph) tx(g, L - 4, stripY + stripH - 1, 'thin', { fill: GC.amber, 'font-size': 11, 'text-anchor': 'end' });
    var clip = gzClip(svg, L, top - 6, pw + 6, plotH + 12);
    el('path', { d: pathOf(decimate(D.d, q, i0, i1, X), Y), fill: 'none', stroke: C.text, 'stroke-width': ph ? 0.9 : 1.1, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    var dg = el('g', {}, g), rr = ph ? 2.7 : 3.6;
    Object.keys(S.dropIdx).forEach(function (k) {
      k = +k; if (k < i0 || k > i1 || !gzNum(q[k])) return;
      el('circle', { cx: X(D.d[k]).toFixed(1), cy: Y(q[k]).toFixed(1), r: rr, fill: GC.red, stroke: C.panel, 'stroke-width': 1.2 }, dg);
    });
    nowDot(g, X(D.d[i1]), Y(q[i1]), ph ? 3.2 : 4);
    var cross = el('g', { 'pointer-events': 'none' }, svg);
    gzHover(holder, gzQ('gzThin', 'ro'), {
      W: W, i0: i0, i1: i1, cross: cross,
      pick: function (x) { return gzNearest(D.d, X.inv(x), i0, i1, q); },
      mark: function (j) {
        clear(cross); if (j == null) return;
        var x = X(D.d[j]);
        el('line', { x1: x, x2: x, y1: top, y2: stripY + stripH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, cross);
        el('circle', { cx: x, cy: Y(q[j]), r: 3.4, fill: 'none', stroke: C.white, 'stroke-width': 1.5 }, cross);
      },
      text: function (j) { return thinRo(S, j); }, rest: function () { return thinRo(S, i1); }
    });
  }
  function thinRo(S, j) {
    var p = [['d', fmtDay(D.d[j], true)], ['', ' · QQQ '], ['v', S.q[j].toFixed(2)]], cutDn = dayNum(GZ.cutoff);
    if (D.d[j] > cutDn && gzNum(S.f[j])) p.push(['', ' · ' + (S.f[j] / 10).toFixed(1) + '% above 200-day' +
      (S.hi[j] != null ? ' · ' + Math.abs((S.q[j] / S.hi[j] - 1) * 100).toFixed(1) + '% below 52-week high' : '')]);
    if (S.flag[j]) p.push(['a', ' · thin-rally day']);
    if (S.dropIdx[j]) p.push(['r', ' · first close ' + Math.abs(GZ.thin.drop_pct) + '% under its 52-week high']);
    return p;
  }


  var THR_C = { ARMED: GC.yel, FIRED: GC.green, IDLE: GC.grey };
  function thrustState() {
    var r2 = doc.idx.R2000, d = doc.daily.d, r = r2.f50, iw = r2.etf_c, Tz = GZ.thrust, cal = gzCal();
    var ARM = Tz.arm * 10, FIRE = Tz.fire * 10, WIN = Tz.window, RE = Tz.rearm, i, j, cnt = 0;
    var n = gzLast(r);
    for (i = 0; i <= n; i++) if (gzNum(r[i])) cnt++;
    if (cnt < WIN + 2) throw new Error('too few Russell 2000 readings');



    var crosses = [], thrusts = [], lastC = -1e9, prev = null;
    for (i = 0; i <= n; i++) {
      if (!gzNum(r[i])) continue;
      if (r[i] >= FIRE && prev != null && prev < FIRE) {
        var washed = false;
        for (j = Math.max(0, i - WIN); j < i; j++) if (gzNum(r[j]) && r[j] <= ARM) { washed = true; break; }
        if (washed) {
          crosses.push(i);
          if (i - lastC > RE) thrusts.push(i);
          lastC = i;
        }
      }
      prev = r[i];
    }
    var li = gzLast(iw, n), S = { ok: true, n: n, r: r, iw: iw, noIwm: gzLast(iw) < 0, cal: cal, value: r[n] / 10, asOf: d[n], crosses: crosses, thrusts: thrusts,
      lastCross: lastC, lastThrust: thrusts.length ? d[thrusts[thrusts.length - 1]] : null, firedOn: null, iwmSince: null, k: null };
    for (j = n; j >= 0; j--) if (gzNum(r[j]) && r[j] <= ARM) { S.lastLe25 = d[j]; break; }
    var e = thrusts.length ? thrusts[thrusts.length - 1] : null;
    if (e != null && n - e <= RE) {
      S.state = 'FIRED'; S.e = e; S.firedOn = d[e]; S.fireVal = r[e] / 10; S.windowEnd = gzCalAt(cal, e + RE);
      S.iwmSince = li >= e && gzNum(iw[e]) ? (iw[li] / iw[e] - 1) * 100 : null;
    } else {
      var k = -1;
      for (j = n; j >= Math.max(0, n - (WIN - 1)); j--) if (gzNum(r[j]) && r[j] <= ARM) { k = j; break; }
      if (k >= 0) {
        S.state = 'ARMED'; S.k = k; S.armDay = d[k]; S.deadline = gzCalAt(cal, k + WIN); S.sessionsLeft = k + WIN - n;
        if (n + 1 - lastC <= RE) S.blockedUntil = gzCalAt(cal, lastC + RE + 1);
      } else {
        S.state = 'IDLE';
        for (j = n - WIN; j >= Math.max(0, n - RE); j--) if (gzNum(r[j]) && r[j] <= ARM) { S.lapsedArm = d[j]; S.lapsedEnd = gzCalAt(cal, j + WIN); break; }
      }
    }

    var cutDn = dayNum(GZ.cutoff);
    S.live = thrusts.filter(function (t) { return D.d[t] > cutDn; }).map(function (t) {
      var end = gzLast(iw, Math.min(t + RE, li));
      return { date: d[t], r: r[t] / 10, iwm63: gzNum(iw[t]) && end >= t && gzNum(iw[end]) ? (iw[end] / iw[t] - 1) * 100 : null, pending: t + RE > li };
    });

    S.matched = Tz.events.filter(function (ev) {
      var a = bsearchLE(D.d, dayNum(ev.date));
      return thrusts.some(function (t) { return Math.abs(t - a) <= 5; });
    }).length;
    return S;
  }
  function thrustText(S) {
    var c = 'gzThrust', Tz = GZ.thrust, arm = Tz.arm, fire = Tz.fire;
    gzChip(c, S.state, THR_C[S.state]);
    gzText(c, 'sub', 'A thrust is when the share of Russell 2000 stocks above their 50-day jumps from ' + arm + '% or less to ' + fire + '% or more within ' + Tz.window + ' sessions');
    gzText(c, 'asof', 'as of the ' + gzDay(S.asOf) + ' close · Russell 2000 breadth and IWM update after each close');
    gzText(c, 'big', pct1(S.value));
    gzText(c, 'unit', 'of Russell 2000 stocks above their 50-day');
    var l1, l2, now;
    if (S.state === 'ARMED') {
      l1 = 'Needs ' + fire + '% at a close on or before ' + gzDay(S.deadline) + ' (' + gzS(S.sessionsLeft, 'session') + ' left).';
      l2 = 'Armed by the ' + gzDay(S.armDay) + ' close at or under ' + arm + '%.';
      now = 'Armed: the line closed at ' + pct1(S.value) + ' on ' + gzDay(S.asOf) +
        '. A close at ' + fire + '% or more by ' + gzDay(S.deadline) + ' would be a thrust; if not, the window lapses.';
      if (S.blockedUntil) now += ' A cross before ' + gzDay(S.blockedUntil) + ' would not count (within ' + Tz.rearm + ' sessions of the last one).';
    } else if (S.state === 'FIRED') {
      var iwmW = S.iwmSince != null ? sgn(S.iwmSince) : null, endW = gzDay(S.windowEnd, true);
      l1 = 'Fired on ' + gzDay(S.firedOn, true) + ' at ' + pct1(S.fireVal) + '.';
      l2 = iwmW != null ? 'IWM since then ' + iwmW + ' (the 3-month window ends ' + endW + ').' :
        'IWM since then: not available (' + (S.noIwm ? 'IWM prices missing in this update' : 'no IWM close on that day') + '; the 3-month window ends ' + endW + ').';
      now = 'Fired: the line went from ' + arm + '% or less to ' + pct1(S.fireVal) + ' on ' + gzDay(S.firedOn, true) + ', within ' + Tz.window + ' sessions. ' +
        (iwmW != null ? 'IWM is ' + iwmW + ' since; ' : 'IWM since: not available; ') +
        'the 3-month window ends ' + endW + '.';
    } else {
      l1 = 'Arms when the line closes at or under ' + arm + '%.';
      l2 = S.lapsedArm ? 'The last window (armed ' + gzDay(S.lapsedArm) + ') ended ' + gzDay(S.lapsedEnd) + ' without a thrust.' :
        S.lastThrust ? 'Last thrust on our line: ' + gzDay(S.lastThrust, true) + '.' : '';
      now = 'Idle: the line is at ' + pct1(S.value) + ', above the ' + arm + '% arm line, so no clock is running.' +
        (S.lapsedArm ? ' The last window lapsed on ' + gzDay(S.lapsedEnd) + ' without reaching ' + fire + '%.' : '');
    }
    gzText(c, 'l1', l1); gzText(c, 'l2', l2); gzText(c, 'now', now);
    var pf = gzQ(c, 'pfill'), fr = Math.max(0, Math.min(1, (S.value - arm) / (fire - arm)));
    pf.style.width = Math.max(1.2, fr * 100).toFixed(1) + '%';
    pf.style.background = THR_C[S.state];
    gzText(c, 'parm', arm + '%  armed'); gzText(c, 'pfire', 'fires  ' + fire + '%');
    gzParts(gzQ(c, 'states'), [['', 'States: '], [S.state === 'IDLE' ? 'on' : '', 'IDLE'], ['', '  ·  '], [S.state === 'ARMED' ? 'on' : '', 'ARMED (clock running)'],
      ['', '  ·  '], [S.state === 'FIRED' ? 'on' : '', 'FIRED (hit ' + fire + '% in time)']]);
    Array.prototype.forEach.call(gzQ(c, 'states').querySelectorAll('.on'), function (n) { n.style.color = S.state === 'IDLE' ? C.text : THR_C[S.state]; });
    gzText(c, 'ct', 'Russell 2000 % above 50-day, last 4 months' + (S.state === 'ARMED' ? ' · yellow band = the ' + Tz.window + '-session window' : ''));
    var baseW = gzNum(Tz.base_up_pct) ? ' (any 3 months since ' + (Tz.base_since || '2013').slice(0, 4) + ': ' + Math.round(Tz.base_up_pct) + '% up, typical ' + sgn(Tz.base_median, 0) + ')' : '';
    gzText(c, 'ct2', 'IWM over the 3 months after each past thrust · ' + Tz.up + ' of ' + Tz.n + ' up' + baseW + (S.live.some(function (e) { return e.iwm63 != null; }) ? ' · hollow = fired after ' + gzDay(GZ.cutoff, true) : ''));
    gzText(c, 'how', 'ARMED alone has meant nothing. FIRED is the part that mattered: after past thrusts IWM did about ' + Tz.edge_lo + ' to ' + Tz.edge_hi +
      ' points better over the next 3 months than after other bounces of the same size. Only ' + Tz.n + ' thrusts since 2013, and most of that gap comes from 2021 on, ' +
      'so treat it as a tilt, not a rule.');
    gzText(c, 'src', 'History: TradingView’s official Russell 2000 breadth line (R2FI), which gives the ' + Tz.n + ' thrusts in the lower chart. The live line is ' +
      'our own count of today’s members: usually within about 1 point of TradingView’s line since mid-2024, and it finds ' + S.matched + ' of the ' + Tz.n +
      ' past thrusts. So a close call at ' + arm + '% or ' + fire + '%, and with it the arm day or the deadline, can be a session off from TradingView’s chart. ' +
      'IWM closes: screener cache, split-adjusted.');
  }
  function drawThrustLine(S) {
    var holder = gzQ('gzThrust', 'chart'), W = Math.max(260, Math.round(holder.clientWidth)), ph = W < 520, Tz = GZ.thrust;
    var L = 26, R = 6, top = 8, plotH = ph ? 150 : 168, H = top + plotH + 24, pw = W - L - R, r = S.r, n = S.n, i;
    var iA = Math.max(0, n - 83), iB = S.state === 'ARMED' ? S.k + Tz.window : n;
    var lo = 100, hi = 0;
    for (i = iA; i <= n; i++) if (gzNum(r[i])) { lo = Math.min(lo, r[i] / 10); hi = Math.max(hi, r[i] / 10); }
    lo = Math.max(0, Math.min(Tz.arm - 10, lo - 5)); hi = Math.min(100, Math.max(Tz.fire + 12, hi + 6));
    var svg = svgFor(holder, W, H), g = el('g', {}, svg), X = lin(iA, iB + (iB === n ? 0.5 : 0), L, L + pw), Y = lin(lo, hi, top + plotH, top);
    var yt = [Tz.arm, Tz.fire]; if (hi >= 78) yt.push(75); if (lo <= 2) yt.unshift(0);
    yTicks(g, Y, yt, L + pw, L, function (v) { return String(v); }, 'left');
    if (S.state === 'ARMED') el('rect', { x: X(S.k).toFixed(1), y: top, width: (X(iB) - X(S.k)).toFixed(1), height: plotH, fill: GC.yel, 'fill-opacity': 0.09 }, g);
    if (S.state === 'FIRED' && S.e >= iA) el('rect', { x: X(S.e).toFixed(1), y: top, width: Math.max(1, X(Math.min(iB, S.e + Tz.rearm)) - X(S.e)).toFixed(1), height: plotH, fill: GC.green, 'fill-opacity': 0.07 }, g);
    [[Tz.arm, GC.yel, 'arm line'], [Tz.fire, GC.green, 'fire line']].forEach(function (o) {
      el('line', { x1: L, x2: L + pw, y1: Y(o[0]), y2: Y(o[0]), stroke: o[1], 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.85 }, g);
    });

    var cal = S.cal, months = 0, ticks = [];
    for (i = iA + 1; i <= iB; i++) { var a = gzCalAt(cal, i), b = gzCalAt(cal, i - 1); if (a.slice(5, 7) !== b.slice(5, 7)) months++; }
    var mid = !ph && months > 0 && pw / Math.max(1, months) > 120;
    for (i = iA + 1; i <= iB; i++) {
      var s = gzCalAt(cal, i), p = gzCalAt(cal, i - 1), dn = dayNum(s);
      if (s.slice(5, 7) !== p.slice(5, 7)) ticks.push({ i: i, label: mid ? fmtDay(dn, false) : MON[+s.slice(5, 7) - 1] });
      else if (mid && +s.slice(8, 10) >= 15 && +p.slice(8, 10) < 15) ticks.push({ i: i, label: fmtDay(dn, false) });
    }
    var lastR = -1e9;
    ticks.forEach(function (t) {
      var x = X(t.i), w = textW(t.label, 11);
      if (x - w / 2 < L - 4 || x + w / 2 > W || x - w / 2 < lastR + 8) return;
      el('line', { x1: x, x2: x, y1: top + plotH, y2: top + plotH + 4, stroke: C.muted, 'stroke-width': 1 }, g);
      tx(g, x, H - 5, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' }); lastR = x + w / 2;
    });
    var path = '', gap = true;
    for (i = iA; i <= n; i++) {
      if (!gzNum(r[i])) { gap = true; continue; }
      path += (gap ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(r[i] / 10).toFixed(1); gap = false;
    }
    el('path', { d: path, fill: 'none', stroke: GC.blue, 'stroke-width': ph ? 1.6 : 1.8, 'stroke-linejoin': 'round' }, g);
    S.thrusts.forEach(function (t) { if (t >= iA) el('circle', { cx: X(t).toFixed(1), cy: Y(r[t] / 10).toFixed(1), r: 3.4, fill: GC.green, stroke: C.panel, 'stroke-width': 1.2 }, g); });


    var nb = nowBox(X(n), Y(r[n] / 10), ph ? 3.2 : 4), pts = [];
    for (i = iA; i <= n; i++) if (gzNum(r[i])) pts.push([X(i), Y(r[i] / 10)]);
    function onLine(bx) {
      for (var k = 1; k < pts.length; k++) {
        var a0 = pts[k - 1], a1 = pts[k];
        if (Math.max(a0[0], a1[0]) < bx.x || Math.min(a0[0], a1[0]) > bx.x + bx.w) continue;
        if (Math.min(a0[1], a1[1]) <= bx.y + bx.h + 1 && Math.max(a0[1], a1[1]) >= bx.y - 1) return true;
      }
      return false;
    }
    [[Tz.fire, GC.green, 'fire line'], [Tz.arm, GC.yel, 'arm line']].forEach(function (o) {
      var w = textW(o[2], 11), y0 = Y(o[0]), spots = [], k, best = null;
      if (S.state === 'ARMED') spots.push([X(iB) - 4 - w, y0 - 4], [X(iB) - 4 - w, y0 + 13]);
      [0, 0.25, 0.5, 0.7].forEach(function (f) { var x = L + 6 + (pw - w - 12) * f; spots.push([x, y0 - 4], [x, y0 + 13]); });
      for (k = 0; k < spots.length && best == null; k++) {
        var bx = { x: spots[k][0] - 1, y: spots[k][1] - 10, w: w + 2, h: 13 };
        if (bx.y < top - 2 || bx.y + bx.h > top + plotH + 2 || bx.x + bx.w > L + pw) continue;
        if (!overlaps(bx, nb) && !onLine(bx)) best = spots[k];
      }
      best = best || spots[0];
      tx(g, best[0], best[1], o[2], withHalo({ fill: o[1], 'font-size': 11 }));
    });
    nowDot(g, X(n), Y(r[n] / 10), ph ? 3.2 : 4);
    var cross = el('g', { 'pointer-events': 'none' }, svg);
    gzHover(holder, gzQ('gzThrust', 'ro'), {
      W: W, cross: cross,
      pick: function (x) { var j = Math.round(X.inv(x)); return j < iA || j > iB ? null : j; },
      mark: function (j) {
        clear(cross); if (j == null) return;
        var x = X(j);
        el('line', { x1: x, x2: x, y1: top, y2: top + plotH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, cross);
        if (j <= n && gzNum(r[j])) el('circle', { cx: x, cy: Y(r[j] / 10), r: 3.4, fill: 'none', stroke: C.white, 'stroke-width': 1.5 }, cross);
      },
      text: function (j) { return thrustRo(S, j); }, rest: function () { return thrustRo(S, n); }
    });
  }
  function thrustRo(S, j) {
    var s = gzCalAt(S.cal, j), p = [['d', fmtDay(dayNum(s), true)]];
    if (j > S.n) {
      p.push(['m', ' · no close yet']);
      if (S.state === 'ARMED' && j <= S.k + GZ.thrust.window) p.push(['y', ' · inside the window' + (j === S.k + GZ.thrust.window ? ' (last day)' : '')]);
      return p;
    }
    p.push(['', ' · Russell 2000 above 50-day '], ['v', gzNum(S.r[j]) ? (S.r[j] / 10).toFixed(1) + '%' : '–']);
    if (S.thrusts.indexOf(j) >= 0) p.push(['g', ' · thrust']);
    else if (S.crosses.indexOf(j) >= 0) p.push(['m', ' · crossed ' + GZ.thrust.fire + '%, but too soon after the last thrust to count']);
    if (gzNum(S.r[j]) && S.r[j] <= GZ.thrust.arm * 10) p.push(['y', ' · at or under ' + GZ.thrust.arm + '%']);
    return p;
  }
  function drawThrustPops(S) {
    var holder = gzQ('gzThrust', 'chart2'), W = Math.max(260, Math.round(holder.clientWidth)), ph = W < 520, Tz = GZ.thrust;
    var ev = Tz.events.map(function (e) { return { date: e.date, r: e.r2fi, v: e.iwm63, pending: false, study: true }; });
    S.live.forEach(function (e) { if (e.iwm63 != null) ev.push({ date: e.date, r: e.r, v: e.iwm63, pending: e.pending, study: false }); });
    var L = 40, R = 6, top = 10, plotH = ph ? 118 : 136, H = top + plotH + 22, pw = W - L - R, m = ev.length;
    var vmin = Math.min.apply(null, ev.map(function (e) { return e.v; })), vmax = Math.max.apply(null, ev.map(function (e) { return e.v; }));
    var lo = Math.min(-12, vmin - 3), hi = Math.max(32, vmax + 3);
    var svg = svgFor(holder, W, H), g = el('g', {}, svg), Y = lin(lo, hi, top + plotH, top), slot = pw / m;
    var yt = []; for (var v = Math.ceil(lo / 10) * 10; v <= hi; v += 10) yt.push(v);
    yTicks(g, Y, yt, L + pw, L, function (v) { return v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v) + '%'; }, 'left');
    el('line', { x1: L, x2: L + pw, y1: Y(0), y2: Y(0), stroke: C.muted, 'stroke-width': 1 }, g);
    el('line', { x1: L, x2: L + pw, y1: Y(Tz.median), y2: Y(Tz.median), stroke: GC.light, 'stroke-width': 1.1, 'stroke-dasharray': '4 3' }, g);
    var lw = textW('’26', 11) + 6, every = Math.max(1, Math.ceil(lw / slot));
    ev.forEach(function (e, k) {
      var x = L + slot * (k + 0.5), c = e.v >= 0 ? GC.green : GC.red;

      el('line', { x1: x, x2: x, y1: Y(0), y2: Y(e.v), stroke: c, 'stroke-width': 1.8, 'stroke-opacity': 0.85, 'stroke-dasharray': e.pending ? '3 2' : null }, g);
      var dot = el('circle', { cx: x, cy: Y(e.v), r: ph ? 3 : 3.4, fill: e.study ? c : C.panel, stroke: e.study ? C.panel : c, 'stroke-width': e.study ? 1.2 : 1.6 }, g);
      var t = el('title', {}, dot); t.textContent = e.date + ': IWM ' + sgn(e.v) + (e.pending ? ' so far' : ' over the next 3 months');
      if (k === m - 1 || (k % every === 0 && m - 1 - k >= every)) tx(g, x, H - 5, '’' + e.date.slice(2, 4), { fill: e.study ? C.muted : C.text, 'font-size': 11, 'text-anchor': 'middle' });
    });
    tx(g, L + 6, Y(Tz.median) - 5, 'typical ' + sgn(Tz.median, 0), withHalo({ fill: GC.light, 'font-size': 11.5 }));
    var cross = el('g', { 'pointer-events': 'none' }, svg);
    gzHover(holder, gzQ('gzThrust', 'ro2'), {
      W: W, cross: cross,
      pick: function (x) { var k = Math.floor((x - L) / slot); return k < 0 || k >= m ? null : k; },
      mark: function (k) {
        clear(cross); if (k == null) return;
        var x = L + slot * (k + 0.5);
        el('circle', { cx: x, cy: Y(ev[k].v), r: 6, fill: 'none', stroke: C.white, 'stroke-width': 1.4 }, cross);
      },
      text: function (k) {
        var e = ev[k];
        return [['d', gzDay(e.date, true)], ['', ' · ' + (e.study ? 'TradingView ' : 'our line ')], ['v', pct1(e.r)], ['', ' · IWM ' + (e.pending ? 'so far ' : '3 months later ')],
          [e.v >= 0 ? 'g' : 'r', sgn(e.v)]];
      },
      rest: function () {
        return [['', 'Typical (median) '], ['v', sgn(Tz.median, 0)], ['', ' · ' + Tz.up + ' of ' + Tz.n + ' up' +
          (gzNum(Tz.base_up_pct) ? ' · any 3 months: ' + sgn(Tz.base_median, 0) + ', ' + Math.round(Tz.base_up_pct) + '% up' : '')], ['m', HOVER ? ' · hover a thrust' : ' · tap a thrust']];
      }
    });
  }


  function stormState() {

    var s = doc.daily.spy, d = doc.daily.d, n = s.length, sma = new Array(n), win = [], head = 0, sum = 0, i;
    for (i = 0; i < n; i++) {
      sma[i] = null;
      if (!gzNum(s[i])) continue;
      win.push(s[i]); sum += s[i];
      if (win.length - head > 200) sum -= win[head++];
      if (win.length - head === 200) sma[i] = sum / 200;
    }
    var li = gzLast(s);
    if (li < 0 || sma[li] == null) throw new Error('fewer than 200 SPY closes');
    var spy = s[li], m = sma[li], gap = (spy / m - 1) * 100, above = gap >= 0, since = null, prev = li;
    for (i = li - 1; i >= 0; i--) {
      if (!gzNum(s[i])) continue;
      if (sma[i] == null) break;
      if ((s[i] >= sma[i]) !== above) { since = prev; break; }
      prev = i;
    }


    var L = doc.live, today = !!(L && L.session_date && d[n - 1] === L.session_date && li === n - 1);
    var live = !!(L && L.is_live && !L.session_closed && today);
    return { ok: true, state: above ? 'CALM SIDE' : 'STORMY SIDE', spy: spy, sma200: m, gap: gap, flipPct: above ? (1 - m / spy) * 100 : (m / spy - 1) * 100,
      live: live, prelim: doc.state === 'LIVE' && !live && today, li: li, sma: sma, s: s, since: since };
  }
  function stormText(S) {
    var c = 'gzStorms', G = GZ.storms, up = S.gap >= 0, dl = D.d[S.li], prelim = S.prelim;
    gzChip(c, S.state, up ? GC.green : GC.orange);
    gzText(c, 'sub', 'SPY against its 200-day average · below it, the same VIX has come with bigger moves');
    gzText(c, 'asof', S.live ? 'so far today · as of ' + hm(Date.parse(doc.live.asof_utc)) + ' ET (prices ~15 min delayed)' :
      'as of the ' + fmtDay(dl, false) + ' close' + (prelim ? ' (preliminary)' : ''));
    gzText(c, 'big', sgn(S.gap));
    gzText(c, 'unit', 'SPY ' + (up ? 'above' : 'below') + ' its 200-day average');
    gzText(c, 'l1', up ? 'A fall of about ' + S.flipPct.toFixed(1) + '% would put it below.' : 'A rise of about ' + S.flipPct.toFixed(1) + '% would put it back above.');
    gzText(c, 'l2', 'SPY ' + S.spy.toFixed(2) + (S.live ? ' so far today' : '') + ' · 200-day ' + S.sma200.toFixed(2) + '. Says how rough, not which way.');
    gzText(c, 'cap', 'grey = what VIX expected · colour = how much SPY really moved the next month (2013+ averages, % a year). VIX usually guesses high.');
    gzText(c, 'ct', 'SPY, last 2 years · red = days SPY closed below its 200-day average');
    var v1 = function (x) { return x.toFixed(1); };
    gzText(c, 'how', 'VIX is the options market’s guess of how much stocks will move, and it usually guesses high. Above the 200-day, next month’s real moves came in ' +
      'well under it (' + v1(G.up.rv) + ' against ' + v1(G.up.vix) + '). Below it they came in only a little under (' + v1(G.down.rv) + ' against ' + v1(G.down.vix) +
      '): at the same VIX, moves below the line ran about ' + G.excess_pct + '% bigger. It does not call direction. Bumpier rides, not a sell signal.');
    var sinceW = S.since != null ? ' It has been ' + (up ? 'above' : 'below') + ' since ' + fmtDay(D.d[S.since], true) + '.' : '';
    gzText(c, 'now', up ? 'SPY is ' + Math.abs(S.gap).toFixed(1) + '% above its 200-day average: the calm side, where next month’s real moves have come in ' +
      'well under what VIX expected (' + v1(G.up.rv) + ' against ' + v1(G.up.vix) + ').' + sinceW :
      'SPY is ' + Math.abs(S.gap).toFixed(1) + '% below its 200-day average: the stormy side. Here next month’s real moves have come close to what VIX expected (' +
      v1(G.down.rv) + ' against ' + v1(G.down.vix) + '), about ' + G.excess_pct + '% bigger than at the same VIX above the line.' + sinceW);
    gzText(c, 'src', 'Study: SPY against its 200-day average, 2013+ (' + gzInt(G.up.days) + ' days above, ' + gzInt(G.down.days) + ' below). How much SPY really moved means ' +
      'its realised volatility over the next month, as a yearly rate, against VIX that day. The ' + G.excess_pct + '% compares days below and above the 200-day with VIX, ' +
      'the ratio of VIX to 3-month VIX, and the drawdown held equal. ' + (G.breaks ? 'In the ' + G.breaks + ' breaks since 2013, the' : 'Since 2013, the') +
      ' next 3 months’ returns were not reliably worse than after other days with the same drop and VIX, though the dips along the way were deeper. ' +
      'SPY closes: the page’s own screener cache' + (S.live ? ', with today’s delayed price as the last point.' : '.'));
  }
  function drawStormBars(S) {
    var holder = gzQ('gzStorms', 'mini'), W = Math.max(240, Math.round(holder.clientWidth)), G = GZ.storms, up = S.gap >= 0;
    var H = 150, base = H - 24, top = 30, hiV = Math.max(G.up.vix, G.up.rv, G.down.vix, G.down.rv) * 1.06;
    var svg = svgFor(holder, W, H), g = el('g', {}, svg), gw = W / 2, bw = Math.min(72, gw / 2 - 16);
    [['above 200-day', G.up, GC.blue, up], ['below 200-day', G.down, GC.orange, !up]].forEach(function (o, k) {
      var cx = gw * (k + 0.5), topB = base - Math.max(o[1].vix, o[1].rv) / hiV * (base - top);
      [[o[1].vix, GC.bar, C.muted, 'VIX expected'], [o[1].rv, o[2], C.white, 'SPY really moved, next month']].forEach(function (b, j) {
        var x = cx + (j ? 2 : -bw - 2), h = Math.max(2, b[0] / hiV * (base - top));
        var r = el('rect', { x: x.toFixed(1), y: (base - h).toFixed(1), width: bw.toFixed(1), height: h.toFixed(1), rx: 2, fill: b[1] }, g);
        var t = el('title', {}, r); t.textContent = o[0] + ': ' + b[3] + ' ' + b[0].toFixed(1) + ' (% a year)';
        tx(g, x + bw / 2, base - h - 6, b[0].toFixed(1), { fill: b[2], 'font-size': 13.5, 'font-weight': j ? 700 : 400, 'text-anchor': 'middle' });
      });
      tx(g, cx, base + 17, o[0], { fill: o[3] ? C.white : C.muted, 'font-size': 12.5, 'text-anchor': 'middle', 'font-weight': o[3] ? 600 : 400 });
      if (o[3]) tx(g, cx, Math.max(12, topB - 26), 'now', { fill: up ? GC.green : GC.orange, 'font-size': 12, 'text-anchor': 'middle' });
    });
  }
  function drawStormChart(S) {
    var holder = gzQ('gzStorms', 'chart'), W = Math.max(260, Math.round(holder.clientWidth)), ph = W < 520;
    var L = ph ? 34 : 40, R = 6, top = 8, plotH = ph ? 196 : 286, H = top + plotH + 24, pw = W - L - R, s = S.s, sma = S.sma, i1 = S.li, i0 = Math.max(0, i1 - 503), i;
    var lo = Infinity, hi = -Infinity;
    for (i = i0; i <= i1; i++) {
      if (gzNum(s[i])) { lo = Math.min(lo, s[i]); hi = Math.max(hi, s[i]); }
      if (sma[i] != null) { lo = Math.min(lo, sma[i]); hi = Math.max(hi, sma[i]); }
    }
    var pad = (hi - lo) * 0.06, svg = svgFor(holder, W, H), g = el('g', {}, svg), X = lin(D.d[i0], D.d[i1], L, L + pw), Y = lin(lo - pad, hi + pad, top + plotH, top);
    var step = niceStep(hi - lo, ph ? 4 : 6), yt = [];
    for (var v = Math.ceil((lo - pad) / step) * step; v <= hi + pad; v += step) yt.push(v);
    yTicks(g, Y, yt, L + pw, L, function (v) { return String(Math.round(v)); }, 'left');

    var a = null;
    for (i = i0; i <= i1 + 1; i++) {
      var below = i <= i1 && (gzNum(s[i]) ? sma[i] != null && s[i] < sma[i] : a != null);
      if (below && a == null) a = i;
      if (!below && a != null) {
        var xa = (a > i0 ? (X(D.d[a - 1]) + X(D.d[a])) / 2 : X(D.d[a])), xb = (i <= i1 ? (X(D.d[i - 1]) + X(D.d[i])) / 2 : X(D.d[i - 1]));
        el('rect', { x: xa.toFixed(1), y: top, width: Math.max(1.5, xb - xa).toFixed(1), height: plotH, fill: GC.red, 'fill-opacity': 0.16 }, g);
        a = null;
      }
    }

    var tk = [], d0 = dnDate(D.d[i0]), y = d0.getUTCFullYear(), mo = Math.floor(d0.getUTCMonth() / 3) * 3 + 3;
    for (; ; mo += 3) { if (mo >= 12) { y += Math.floor(mo / 12); mo %= 12; } var dn = Date.UTC(y, mo, 1) / 864e5; if (dn > D.d[i1]) break; tk.push({ dn: dn, label: MON[mo] + ' ’' + String(y).slice(2) }); }
    var qPx = pw * 91.3 / Math.max(1, D.d[i1] - D.d[i0]), every = Math.max(1, Math.ceil((textW('Oct ’26', 11) + 10) / qPx));
    tk.forEach(function (t, k) {
      if (k % every) return;
      var x = X(t.dn), w = textW(t.label, 11);
      if (x - w / 2 < L - 6 || x + w / 2 > W) return;
      el('line', { x1: x, x2: x, y1: top + plotH, y2: top + plotH + 4, stroke: C.muted, 'stroke-width': 1 }, g);
      tx(g, x, H - 5, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    });
    var clip = gzClip(svg, L, top - 6, pw + 6, plotH + 12);
    el('path', { d: pathOf(decimate(D.d, sma, i0, i1, X), Y), fill: 'none', stroke: GC.orange, 'stroke-width': ph ? 1.4 : 1.7, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    el('path', { d: pathOf(decimate(D.d, s, i0, i1, X), Y), fill: 'none', stroke: C.text, 'stroke-width': ph ? 1 : 1.2, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
    var j8 = Math.min(i1, i0 + Math.round((i1 - i0) * 0.06));
    if (sma[j8] != null) tx(g, X(D.d[j8]) + 2, Y(sma[j8]) + 16, '200-day', withHalo({ fill: GC.orange, 'font-size': 11.5 }));
    nowDot(g, X(D.d[i1]), Y(s[i1]), ph ? 3.2 : 4);
    var cross = el('g', { 'pointer-events': 'none' }, svg);
    gzHover(holder, gzQ('gzStorms', 'ro'), {
      W: W, cross: cross,
      pick: function (x) { return gzNearest(D.d, X.inv(x), i0, i1, s); },
      mark: function (j) {
        clear(cross); if (j == null) return;
        var x = X(D.d[j]);
        el('line', { x1: x, x2: x, y1: top, y2: top + plotH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, cross);
        el('circle', { cx: x, cy: Y(s[j]), r: 3.4, fill: 'none', stroke: C.white, 'stroke-width': 1.5 }, cross);
      },
      text: function (j) { return stormRo(S, j); }, rest: function () { return stormRo(S, i1); }
    });
  }
  function stormRo(S, j) {
    var p = [['d', fmtDay(D.d[j], true)], ['', ' · SPY '], ['v', S.s[j].toFixed(2)]];
    if (j === S.li && S.live) p.push(['m', ' (so far today)']);
    if (S.sma[j] != null) {
      var gp = (S.s[j] / S.sma[j] - 1) * 100;
      p.push(['', ' · 200-day '], ['o', S.sma[j].toFixed(2)], [gp >= 0 ? 'g' : 'r', ' · ' + sgn(gp) + (gp >= 0 ? ' above' : ' below')]);
    }
    return p;
  }


  function gzPhone() { return !(window.matchMedia && matchMedia('(min-width: 900px)').matches); }
  function gzNearest(xs, dn, i0, i1, vs) {
    var j = bsearchLE(xs, dn);
    if (j < i0) j = i0; if (j > i1) j = i1;
    if (j < i1 && Math.abs(xs[j + 1] - dn) < Math.abs(xs[j] - dn)) j++;
    while (j > i0 && !gzNum(vs[j])) j--;
    return gzNum(vs[j]) ? j : null;
  }
  function gzYears(g, X, x0, x1, xmin, xmax, y, ph) {
    var y0 = dnDate(x0).getUTCFullYear(), y1 = dnDate(x1).getUTCFullYear(), ppy = (X(x1) - X(x0)) / Math.max(1, (x1 - x0) / 365.25);
    var steps = [1, 2, 3, 4, 5, 10], st = 10;
    for (var k = 0; k < steps.length; k++) { var w = textW(ph || steps[k] > 2 ? '’00' : '2000', 11) + 14; if (ppy * steps[k] >= w) { st = steps[k]; break; } }
    var short = ph || st > 2, lastR = -1e9;
    for (var yy = y0; yy <= y1; yy++) {
      if (yy % st) continue;
      var dn = Date.UTC(yy, 0, 1) / 864e5;
      if (dn < x0 - 10) continue;
      var x = X(Math.max(dn, x0)), lab = short ? '’' + String(yy).slice(2) : String(yy), lw = textW(lab, 11);
      if (x - lw / 2 < xmin - 6 || x + lw / 2 > xmax + 4 || x - lw / 2 < lastR + 6) continue;
      tx(g, x, y, lab, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' }); lastR = x + lw / 2;
    }
  }

  function gzHover(holder, ro, M) {
    holder._gz = M;
    gzParts(ro, M.rest());
    if (holder._gzOn) return;
    holder._gzOn = true;
    function at(ev) {
      var M = holder._gz, svg = holder.firstElementChild;
      if (!M || !svg) return;
      var r = svg.getBoundingClientRect(); if (!r.width) return;
      var j = M.pick((ev.clientX - r.left) * M.W / r.width);
      if (j == null) { reset(); return; }
      try { M.mark(j); gzParts(ro, M.text(j)); } catch (e) { reset(); }
    }
    function reset() { var M = holder._gz; if (!M) return; M.mark(null); gzParts(ro, M.rest()); }
    holder.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'mouse') at(ev); });
    holder.addEventListener('pointerdown', function (ev) { if (ev.pointerType !== 'mouse') at(ev); });
    holder.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') reset(); });
  }


  var GZ_CARDS = [['thin', 'gzThin', thinState, thinText, function (S) { drawThinBars(S); drawThinChart(S); }],
                  ['thrust', 'gzThrust', thrustState, thrustText, function (S) { drawThrustLine(S); drawThrustPops(S); }],
                  ['storms', 'gzStorms', stormState, stormText, function (S) { drawStormBars(S); drawStormChart(S); }]];
  function renderGauges() {
    if (!$('gauges')) return;
    var ok = null;
    try { ok = gzInputs(); } catch (e) { ok = {}; }
    GZ_CARDS.forEach(function (c) {
      GZS[c[0]] = null;
      try {
        if (!ok[c[0]]) { GZS[c[0]] = { ok: false, state: 'NA' }; gzShow(c[1], false, 'Not available in this build (the numbers it needs are not in this data file yet).'); return; }
        var S = c[2](); c[3](S); GZS[c[0]] = S; gzShow(c[1], true);
      } catch (e) {
        GZS[c[0]] = { ok: false, state: 'NA', error: String(e && e.message || e) };
        gzShow(c[1], false, 'Not available in this build (' + (e && e.message || e) + ').');
      }
    });
    drawGauges();
  }
  function drawGauges() {
    var sec = $('gauges');
    if (!sec || !doc || $('content').hidden) return;
    GZW = Math.round(sec.clientWidth);
    if (!GZW) return;
    GZ_CARDS.forEach(function (c) {
      var S = GZS[c[0]];
      if (!S || !S.ok) return;
      try { c[4](S); } catch (e) { S.ok = false; S.drawError = String(e && e.message || e); gzShow(c[1], false, 'Not available in this build (' + S.drawError + ').'); }
    });
  }
  (function () {
    var sec = $('gauges'), raf = false;
    if (!sec) return;
    function req() {
      if (raf) return; raf = true;
      requestAnimationFrame(function () { raf = false; if (doc && Math.round(sec.clientWidth) !== GZW) { try { drawGauges(); } catch (e) { } } });
    }
    if ('ResizeObserver' in window) new ResizeObserver(req).observe(sec); else window.addEventListener('resize', req);
  })();

  try {
    Object.defineProperty(window, '__breadthGauges', { configurable: true, get: function () {
      if (!D) return null;
      var A = GZS.thin, B = GZS.thrust, S = GZS.storms, o = {};
      o.thin = !A || !A.state || A.state === 'NA' ? { state: 'NA', error: A && (A.error || A.drawError) || null } : { state: A.state, ndth: A.ndth, offHigh: A.offHigh,
        band: A.band, bandLabel: GZ.thin.bands[A.band] ? GZ.thin.bands[A.band].label : null, onLast252: A.on252, onShareLast252: f1(A.on252 / A.len252 * 100),
        lastFlagDates: A.flagged.slice(-10).map(function (i) { return doc.daily.d[i]; }), dropsAfterCutoff: A.dropsAfter.slice(), asOf: A.asOf,
        stretch: A.stretch, noQqq: !!A.noQ, drawError: A.drawError || null };
      o.thrust = !B || !B.state || B.state === 'NA' ? { state: 'NA', error: B && (B.error || B.drawError) || null } : { state: B.state, value: B.value, asOf: B.asOf,
        lastLe25: B.lastLe25 || null, armDay: B.armDay || null, deadline: B.deadline || null, sessionsLeft: B.sessionsLeft == null ? null : B.sessionsLeft, lastThrust: B.lastThrust,
        firedOn: B.firedOn, iwmSince: B.iwmSince == null ? null : f1(B.iwmSince), windowEnd: B.windowEnd || null, blockedUntil: B.blockedUntil || null,
        lapsed: B.lapsedArm ? { arm: B.lapsedArm, end: B.lapsedEnd } : null, thrusts: B.thrusts.map(function (i) { return doc.daily.d[i]; }),
        liveThrusts: B.live, matchedStudy: B.matched, noIwm: !!B.noIwm, drawError: B.drawError || null };
      o.storms = !S || !S.state || S.state === 'NA' ? { state: 'NA', error: S && (S.error || S.drawError) || null } : { state: S.state, spy: S.spy,
        sma200: Math.round(S.sma200 * 100) / 100, gap: Math.round(S.gap * 100) / 100, flipPct: Math.round(S.flipPct * 100) / 100, live: S.live,
        since: S.since != null ? doc.daily.d[S.since] : null, drawError: S.drawError || null };
      o.drawnAt = GZW;
      return JSON.parse(JSON.stringify(o));
    } });
  } catch (e) { }






  var FS = { sr: null, key: null, nodes: [], y: 0, pushed: false, pendingBack: false, queued: null, queuedPtr: false, at: -1e9, back: 0, vw: 0, vh: 0, off: 0 };
  var FS_SLOTS = ['head', 'note', 'chips', 'ro', 'bar', 'chart', 'legend'];
  function fsSlot(name) { return $('fs').querySelector('[data-fs="' + name + '"]'); }
  function fsHeight(holder) { return FS.key && holder.parentNode === fsSlot('chart') ? holder.clientHeight : null; }
  function fsParts(key) {
    if (key === 'c1' || key === 'c2' || key === 'c3') {
      var i = +key.charAt(1), sec = $(['', 'daily', 'idx', 'speeds'][i]);
      return { label: ['', 'Market breadth', 'Breadth across 3 indices', 'S&P 500 breadth at 4 speeds'][i] + ', full screen', kicker: '',
        head: sec.querySelector('.card-head'), ro: $(['', 'ro1', 'ro2', 'ro3'][i]), bar: sec.querySelector('.zoombar'),
        chart: $('chart' + i), legend: $(['', 'lg1', 'lg2', 'lg4'][i]), chips: $('ranges') };
    }
    var k = key.slice(1), B = KB[k];
    return { label: K_NAME[k] + ' candles, breadth KDJ, full screen', kicker: 'Breadth · KDJ',
      head: B.root.querySelector('.kb-head'), note: B.note, ro: B.ro, bar: B.root.querySelector('.kb-bar'), chart: B.chart,
      legend: $('lg3'), chips: $('kranges') };
  }
  function fsMinH(key) {
    var short = window.innerHeight <= 540;
    if (key === 'c1') return short ? 180 : 220;
    if (key === 'c2' || key === 'c3') return fsSlot('chart').clientWidth >= 600 ? (short ? 204 : 260) : 470;
    return short ? 176 : 236;
  }
  function fsSize() { if (FS.key) { var m = fsMinH(FS.key) + 'px'; if (fsSlot('chart').style.flexBasis !== m) fsSlot('chart').style.flexBasis = m; } }
  function fsDraw(now) {
    if (!FS.key || !D) return;
    if (FS.key.charAt(0) === 'c') { if (now) { try { drawCharts(); } catch (e) { showFatal('The charts could not be drawn (' + e.message + ').'); } } else requestRender(); }
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
    try { history.pushState({ breadthFs: key }, ''); FS.pushed = true; } catch (e) { FS.pushed = false; }
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
      try { drawCharts(); } catch (e) { showFatal('The charts could not be drawn (' + e.message + ').'); }
      TFS.forEach(function (k) { kPending[k] = 1; }); drawKdjPending();
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
    var c1 = $('chart1'), c2 = $('chart2'), c3 = $('chart3'), w1 = c1.clientWidth, w2 = c2.clientWidth, w3 = c3.clientWidth;
    var h1 = fsHeight(c1), h2 = fsHeight(c2), h3 = fsHeight(c3);
    ['c1', 'c2', 'c3'].forEach(function (k) { if (hover[k] != null && (hover[k] < view.x0 || hover[k] > view.x1)) hover[k] = null; });

    var tu = FS.key === 'c1' ? tickUnit(geo1(w1).pw) : FS.key === 'c2' ? tickUnit(geo2(w2).pw) : FS.key === 'c3' ? tickUnit(geo2(w3).pw) :
      Math.max(tickUnit(geo1(w1).pw), tickUnit(geo2(w2).pw), tickUnit(geo2(w3).pw));

    drawChart1(w1, tu, FS.key === 'c1' ? null : geo2(w2).pw, h1);
    if (!FS.key || FS.key === 'c2') drawStack('c2', w2, tu, h2);
    if (!FS.key || FS.key === 'c3') drawStack('c3', w3, tu, h3);
    layoutGauge();
    renderViewUi();
    renders++;
  }
  function renderAll() {
    if (!doc) return;
    $('content').hidden = false;
    renderStatus(); renderText();
    try { drawCharts(); }
    catch (e) { showFatal('The charts could not be drawn (' + e.message + ').'); return; }
    try { renderKdjText(); } catch (e) { var er = $('kdjErr'); er.hidden = false; er.textContent = 'The KDJ section could not be drawn (' + e.message + ').'; }
    requestKdj('all'); drawKdjPending();
    renderGauges();
  }
  function requestRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      if (!doc) return;
      try { drawCharts(); } catch (e) { showFatal('The charts could not be drawn (' + e.message + ').'); }
    });
  }

  function showFatal(msg) {
    doc = null; D = null;
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'NO DATA';
    $('asof').textContent = 'Could not load the breadth numbers.';
    $('statusLine').textContent = ''; $('membersLine').textContent = '';
    var b = $('banners'); clear(b);
    if (preview) b.appendChild(banner('info', 'Preview data', 'Trying to read from ' + preview + ', not the live feed.'));
    b.appendChild(banner('bad', 'No numbers to show', msg + ' Nothing is shown rather than old or partial numbers. Try again in a few minutes.',
      { label: 'Try again', fn: function () { load(true); } }));
  }


  function getJSON(name) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    var bust = Math.floor(Date.now() / 60000);
    return fetch(base + name + '?m=' + bust, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
        return r.json().catch(function () { throw new Error(name + ' is not valid JSON'); });
      }, function (e) {
        clearTimeout(timer);
        throw new Error(e && e.name === 'AbortError' ? name + ' timed out' : 'network error fetching ' + name);
      });
  }
  var loading = false;
  function load(initial) {
    if (loading) return; loading = true;
    getJSON(FILE).then(function (d) {
      var bad = validate(d);
      if (bad) throw new Error('the data looked broken: ' + bad);
      var changed = !doc || d.generated_epoch !== doc.generated_epoch;
      var hadView = !!D, wasLatest = hadView ? atLatest(view) : true, prevN = {}, prevS = {};
      TFS.forEach(function (k) { prevN[k] = KN[k]; prevS[k] = D && D.tf[k] ? D.tf[k].s : null; });
      doc = d; D = prepare(d); loadedAt = now(); lastErr = null;
      TFS.forEach(function (k) { KN[k] = D.kdj[k].n; });
      kdjAfterLoad(prevN, prevS);

      if (!hadView || !view.custom) view = rangeView(view.chip);
      else view = wasLatest ? toLatest(view, view.x0) : clampView(view);
      if (changed) renderAll(); else renderStatus();
    }).catch(function (e) {
      if (!doc) showFatal('Could not load the data (' + e.message + ').');
      else { lastErr = { at: now(), msg: e.message }; renderStatus(); }
    }).then(function () { loading = false; });
  }
  function poll() {
    if (document.hidden) return;
    if (!doc) { load(); return; }
    getJSON('manifest.json').then(function (m) {
      var e = m && m.files && m.files[FILE];
      if (!e || e.generated_at !== doc.generated_epoch) load();
      else { lastErr = null; renderStatus(); }
    }).catch(function (e) { lastErr = { at: now(), msg: e.message }; renderStatus(); });
  }


  (function initRange() {
    var r = null;
    try { r = normRange(localStorage.getItem('breadthRange')); } catch (e) { }
    r = normRange(params.get('range')) || normRange(winParam) || r || '5Y';
    view.chip = r;
    renderViewUiChips();
  })();
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
    var r = null;
    try { r = normKRange(localStorage.getItem('breadthKdjRange')); } catch (e) { }
    kChip = normKRange(params.get('krange')) || r || 'Auto';
    renderKChips();
  })();
  Array.prototype.forEach.call(document.querySelectorAll('[data-krange]'), function (b) {
    b.addEventListener('click', function () { chooseKRange(b.getAttribute('data-krange')); });
  });
  initFs();
  attachGestures($('chart1'), 'c1');
  attachGestures($('chart2'), 'c2');
  attachGestures($('chart3'), 'c3');
  initKdjBlocks();

  try {
    Object.defineProperty(window, '__breadthView', { configurable: true, get: function () {
      if (!D) return null;
      return { chip: view.chip, custom: view.custom, x0: view.x0, x1: view.x1, from: isoOf(Math.floor(view.x0)), to: isoOf(Math.floor(view.x1)),
        span: view.x1 - view.x0, atLatest: atLatest(view), latest: isoOf(D.last), first: isoOf(D.d[0]), limits: spanLimits(), renders: renders,
        title: spanWords() };
    } });
    Object.defineProperty(window, '__breadthFs', { configurable: true, get: function () {
      return { key: FS.key, y: FS.y, pushed: FS.pushed, pendingBack: FS.pendingBack, kchip: kChip };
    } });
    Object.defineProperty(window, '__breadthDots', { configurable: true, get: function () { return D ? JSON.parse(JSON.stringify(dotDebug)) : null; } });

    Object.defineProperty(window, '__breadthKdj', { configurable: true, get: function () {
      if (!D || !D.kdj) return null;
      var o = {};
      TFS.forEach(function (k) {
        var Q = D.kdj[k], n = Q.n, v = KV[k], B = KB[k];
        o[k] = { n: n, v50: D.tf[k].v[n - 1], K: Q.K[n - 1], D: Q.D[n - 1], J: Q.J[n - 1], open: Q.open, rising: Q.rising, flip: Q.flip,
          flipDir: Q.flip == null ? null : (Q.rising ? 'weakening' : 'improving'), crossLast: Q.cross[n - 1] || null,
          window: v ? { x0: v.x0, x1: v.x1, custom: v.custom, atLatest: kAtLatest(k, v), words: B.win.textContent, chip: kChip,
            cnt: Math.min(n - 1, Math.floor(v.x1)) - Math.max(0, Math.ceil(v.x0)) + 1, want: kChipCount(k, kChip), shown: kChipShown(k) } : null,
          shown: { header: B.val.textContent, note: B.note.textContent, readout: B.ro.textContent }, draw: kDebug[k] || null,
          recent: { K: Q.K.slice(-12), D: Q.D.slice(-12), J: Q.J.slice(-12) } };
      });
      return JSON.parse(JSON.stringify(o));
    } });

    Object.defineProperty(window, '__breadthWash', { configurable: true, get: function () {
      if (!D) return null;
      var o = {};
      TFS.forEach(function (k) {
        var T = D.tf[k], R = pctCandle(k, T.v.length - 1), R2 = pctCandle(k, T.v.length - 1, 't');
        o[k] = { n: T.v.length, latest: T.v[T.v.length - 1], latest200: T.t[T.t.length - 1], sig: T.wash.sig.map(function (i) { return isoOf(T.e[i]) + ' ' + f1(T.v[i]); }),
          rings: T.wash.rings.map(function (r) { return isoOf(T.e[r.i]) + '->' + isoOf(T.e[r.k]) + ' ' + f1(T.v[r.k]); }),
          active: T.wash.active ? { i: isoOf(T.e[T.wash.active.i]), low: isoOf(T.e[T.wash.active.low]) } : null,
          pct: { s13: R.s13, s21: R.s21, p200: R2.s13 }, open: D.pct[k].open };
      });
      return JSON.parse(JSON.stringify(o));
    } });
  } catch (e) { }
  if ('ResizeObserver' in window) {
    var lastW = 0;
    new ResizeObserver(function (ents) {
      var w = Math.round(ents[0].contentRect.width);
      if (w !== lastW) { lastW = w; requestRender(); requestKdj('all'); }
    }).observe($('content'));
  } else window.addEventListener('resize', function () { requestRender(); requestKdj('all'); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  setInterval(function () { if (doc) renderStatus(); }, TICK_MS);
  setInterval(poll, POLL_MS);
  load(true);
})();

