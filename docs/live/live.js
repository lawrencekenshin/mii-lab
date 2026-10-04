
(function () {
  'use strict';


  var DEFAULT_BASE = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/live-data/live/';
  var POLL_MS = 5 * 60 * 1000;
  var TICK_MS = 30 * 1000;
  var FETCH_TIMEOUT_MS = 15000;
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: '#7E57C2', light: '#B39DDB' };
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
  var hover = { c1: null, c2: null };



  function arr(a, n) { return Array.isArray(a) && (n == null || a.length === n); }
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
      P.tf[k] = { s: t.s.map(dayNum), e: t.e.map(dayNum), v: t.v.map(function (x) { return x / 10; }) };
    });
    P.last = P.d[P.d.length - 1];



    TFS.forEach(function (k) {
      var w = d.view.tf[k], T = P.tf[k];
      T.r13 = w.r13; T.r21 = w.r21; T.lv = w.lv; T.mg = !!w.mg; T.peaks = w.pk; T.rp = w.rp;
    });
    d.view.hot.forEach(function (i) { P.hot[i] = 1; });
    P.hp = d.view.hp;
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
    var sessDn = dayNum(doc.live.session_date), L0 = doc.live, head;
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
    var L = doc.live, ml = (L.members_counted != null ? L.members_counted : '?') + ' of ' + (L.members_listed || '?') + ' S&P 500 members counted';
    var extra = [];
    if (L.short_history) extra.push(L.short_history + ' too new to score');
    if (L.stale_cache) extra.push(L.stale_cache + ' with stale data');
    if (L.no_bar_today) extra.push(L.no_bar_today + ' without a bar today');
    $('membersLine').textContent = ml + (extra.length ? ' (' + extra.join(', ') + ')' : '') + '.';

    ['asof1', 'asof2', 'asof3'].forEach(function (id) {
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
    zl.appendChild(span('', ' — ' + lat0(st['1D']) + ' of S&P 500 stocks are scared' +
      (cn ? ' at today’s close (preliminary).' : live ? ' (today so far).' : ' at the close.')));
    $('zoneKey').textContent = 'From fewest to most stocks scared: calm · normal · worried · fear · panic. Alarm line ' +
      Math.round(st['1D'].alarm) + '% = a high reading by the meter’s own history.';
    $('howTo').textContent = doc.text.how_to_read;
    $('rightNow').textContent = doc.text.right_now;
    $('whatChanges').textContent = doc.text.what_changes;

    $('tfClaim').textContent = 'Against its own history since 2013: ' + TFS.map(function (k) {
      var R = pctCandle(k, D.tf[k].v.length - 1);
      return { '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' }[k] + ' ' + pctWord(R.s13) + soFar(k, R) + ' (' + topWord(R.s13) + ')';
    }).join(', ') + '. Unfinished candles are ranked “so far”.';
    $('tfSub').textContent = 'Same rule — % of S&P 500 stocks scared — on daily, weekly, 2-week and monthly candles. ' +
      (cn ? 'Today’s closing candle counted (preliminary).' : live ? 'Today’s candle counted as if it closed now.' : 'Last candle counted as of the close of ' + fmtDay(sessDn, false, false) + '.');
    $('footRule').textContent = doc.view.foot;
    $('footData').textContent = 'Derived values only (shares of stocks, SPY close); no member prices are published. Prices about 15 minutes delayed during the session. Built ' +
      etAndTpe(doc.generated_epoch * 1000) + '. No cookies, no tracking.';
    renderLegends();
    renderTables();
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
    hp.appendChild(span('hp-b', pctWord(R.s13) + ' percentile')); hp.appendChild(document.createTextNode(' since 2013'));
    hp.appendChild(span('hp-sep', ' · ')); hp.appendChild(span('hp-2', pctWord(R.s21) + ' since 2021'));
    var pk = $('heroPeak'); clear(pk);
    var same = Pk.j === last, pdn = D.tf[k].e[Pk.j];
    var pkt = span('hp-rule', same ? 'today is the recent peak' : 'recent peak ' + pct1(Pk.x) + ' (' + fmtDay(pdn, false) + ') = ' + pctWord(Pk.s13) + (Pk.open ? ' so far' : ''));
    pkt.title = PEAK_TIP; pk.appendChild(pkt);
    pk.title = PEAK_TIP;

    var g = $('gauge1'); clear(g);
    g.setAttribute('aria-label', 'Percentile gauge since 2013: now ' + pctWord(R.s13) + (same ? '' : ', recent peak ' + pctWord(Pk.s13)));
    var labs = document.createElement('div'); labs.className = 'g-labs'; g.appendChild(labs);
    var bar = document.createElement('div'); bar.className = 'g-bar'; bandsInto(bar); g.appendChild(bar);
    var mk = function (cls, p) { var m = document.createElement('i'); m.className = 'g-m ' + cls; m.style.left = Math.max(0, Math.min(100, p)).toFixed(2) + '%'; bar.appendChild(m); return m; };
    if (!same && pPk != null) mk('g-m-pk' + (pNow != null && Math.abs(pPk - pNow) < 1.5 ? ' g-m-near' : ''), pPk);
    if (pNow != null) mk('g-m-now', pNow);
    if (!same && Pk.s13) labs.appendChild(span('g-lab g-lab-pk', fmtDay(pdn, false) + ' peak ' + pctWord(Pk.s13)));
    labs.appendChild(span('g-lab g-lab-now', same ? 'now = recent peak · ' + pctWord(R.s13) : 'now ' + pctWord(R.s13)));
    var tk = document.createElement('div'); tk.className = 'g-ticks'; g.appendChild(tk);
    GAUGE_TICKS.forEach(function (t) { var s = span('g-t', String(t)); s.setAttribute('data-t', t); tk.appendChild(s); });
    g.appendChild(span('g-cap', 'percentile since 2013 · deeper purple = rarer'));
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
    l1.appendChild(item('lg-pk', 'fear peak (a big daily spike, same day on SPY)'));
    l1.appendChild(item('lg-now', 'now'));
    l1.appendChild(item('lg-pl', '90th · 95th · 99th percentile of daily candles since 2013'));
    var l2 = $('lg2'); clear(l2);
    l2.appendChild(item('lg-pk', 'fear peak (the biggest spikes of each candle size)'));
    l2.appendChild(item('lg-now', 'now'));
    l2.appendChild(item('lg-pl', '90th · 95th · 99th percentile of each candle size since 2013'));
  }
  function renderTables() {
    var t = $('tfTable'); clear(t);
    var cap = document.createElement('caption'); cap.textContent = 'Latest candle on each size'; t.appendChild(cap);

    var cols = [['Candle', ''], ['Scared', ''], ['Stocks', 'w'], ['Alarm', ''], ['Percentile 2013+', ''], ['2021+', 'w'], ['Peak since 2013', 'w'],
      ['Candle dates', 'w'], ['Note', 'w']];
    var hr = t.insertRow();
    cols.forEach(function (c) { var th = document.createElement('th'); th.textContent = c[0]; if (c[1]) th.className = 'wide-only'; hr.appendChild(th); });
    TFS.forEach(function (k) {
      var s = doc.stats[k], r = t.insertRow(), R = pctCandle(k, D.tf[k].v.length - 1);
      [k + (s.open ? (k === '1D' && closedNow() ? ' · prelim.' : ' · so far') : ''), pct1(s.latest), s.below + ' of ' + s.n,
        pct1(s.alarm), pctWord(R.s13) + ' · ' + topWord(R.s13), pctWord(R.s21), pct1(s.peak_since_2013),
        s.start === s.end ? s.start : s.start + ' → ' + s.end, s.note].forEach(function (v, i) {
        var c = r.insertCell(); c.textContent = v; if (cols[i][1]) c.className = 'wide-only'; });
    });
    var dtb = $('dayTable'); clear(dtb);
    cap = document.createElement('caption'); cap.textContent = 'Last 15 days, daily candles'; dtb.appendChild(cap);
    hr = dtb.insertRow(); ['Day', 'Scared', 'Pctl 2013+', 'Counted', 'SPY'].forEach(function (h) { var th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
    for (var i = D.d.length - 1; i >= Math.max(0, D.d.length - 15); i--) {
      var r = dtb.insertRow(), tag = (i === D.d.length - 1 && doc.state === 'LIVE') ? (closedNow() ? ' (prelim.)' : ' (so far)') : '';
      [fmtDay(D.d[i], false, true) + tag, pct1(D.v[i]), pctWord(pctCandle('1D', i).s13), String(D.n[i]), D.spy[i] == null ? '–' : D.spy[i].toFixed(2)].forEach(function (v) { r.insertCell().textContent = v; });
    }
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
    tx(g, left + 8, top + 16, 'S&P 500 (SPY)', withHalo({ fill: C.text, 'font-size': ts }));
    Y.titleBox = { x: left + 6, y: top + 16 - ts - 1, w: textW('S&P 500 (SPY)', ts) + 4, h: ts + 5 };
    return Y;
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

    var T1 = D.tf['1D'], fpk = findPeaks(D.d, D.v, x0, x1), keep = {};
    T1.peaks.forEach(function (i) { keep[i] = 1; });
    fpk.forEach(function (p) { if (D.hot[p.i]) keep[p.i] = 1; });
    var spyY = spyPanel(svg, X, x0, x1, L, 0, pw, spyH, 12.5, ticks, keep);
    var g = el('g', {}, svg), st = doc.stats['1D'], todayIn = D.last >= x0 && D.last <= x1;
    panelRect(g, L, mTop, pw, mH);

    var vi = visIdx(D.d, x0, x1), vmax = 0;
    for (var i = vi.i0; i <= vi.i1; i++) vmax = Math.max(vmax, D.v[i]);
    if (todayIn) vmax = Math.max(vmax, st.latest);
    var ax = niceAxis(Math.max(vmax / (1 - (phone ? 40 : 28) / mH), st.alarm * 1.3), mH, narrow ? 30 : 36);
    var Y = lin(0, ax.top, mTop + mH, mTop);
    yTicks(g, Y, ax.ticks, L + pw, L, String, 'right', mTop);
    timeGrid(g, X, ticks, mTop, mTop + mH);
    if (!narrow) tx(g, 12, mTop + mH / 2, '% of stocks scared', { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + (mTop + mH / 2) + ')' });
    var clip = clipFor(svg, L, mTop, pw, mH);
    seriesPaths(g, X, Y, D.tf['1D'], x0, x1, clip, lineWidth(span, narrow), false, pw);
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
    ro.appendChild(span('', ' · SPY ' + (D.spy[i] == null ? '–' : D.spy[i].toFixed(2)) + ' '));
    var ch = spyChange(i);
    if (ch != null) ro.appendChild(span(ch >= 0 ? 'up' : 'down', (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(2) + '%'));
    if (dotDays[D.d[i]]) ro.appendChild(span('pk', ' · fear peak'));
    if (!picked) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
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
      var ax = niceAxis(Math.max(mx * 1.1, st.alarm * 1.3), panH, wide ? 30 : 24);
      var Y = lin(0, ax.top, y + panH, y + (wide ? 4 : 2));
      yTicks(g, Y, ax.ticks, L + pw, L, String, 'right', y);
      timeGrid(g, X, ticks, y, y + panH);
      var clip = clipFor(svg, L, y, pw, panH);
      var lw = k === '1D' ? lineWidth(span, true) : { '1W': 1.1, '2W': 1.3, '1M': 1.5 }[k];
      seriesPaths(g, X, Y, T, x0, x1, clip, lw, steps, pw);
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
        var cx = L + pw + RA + 14, cw = RC - 18, full = panH >= 150;
        var p1 = pctWord(R.s13) + ' percentile' + sf, tp = '(' + topWord(R.s13) + ')', one = textW(p1 + ' ' + tp, 13) <= cw;
        var rows = [[one ? p1 + ' ' + tp : p1, 13, C.text, 'p13'], [one ? 'since 2013' : tp + ' since 2013', 12, C.muted, 'b13'],
          [pctWord(R.s21) + ' since 2021', 11.5, C.muted, 'p21']];
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
          rows.forEach(function (r, i) { yy += i ? r[1] + 5 : 22; tx(g, cx, yy, r[0], { fill: r[2], 'font-size': r[1], 'data-th': r[3] }); });
          yy = wrapIn(yy + 17, pkw, 11.5, PK_TXT, 'pk');
          if (note) wrapIn(yy + 17, note, 11.5, C.muted);
        } else {
          var big = Math.max(18, Math.min(30, Math.round(panH * 0.3))), y2 = y + big + 2, bigW = textW(lat0(st), big, 700);
          tx(g, cx, y2, lat0(st), { fill: C.light, 'font-size': big, 'font-weight': 700 });
          var o13 = pctWord(R.s13), t13 = topWord(R.s13);
          var p13 = [o13 + ' percentile' + sf + ' (' + t13 + ')', o13 + ' percentile' + sf + ' since 2013', o13 + ' percentile' + sf, o13 + sf + ' (' + t13 + ')', o13 + sf, o13]
            .filter(function (s0) { return textW(s0, 12) <= cw; })[0] || o13;
          var roomRows = Math.floor((y + panH - 3 - y2) / 17);
          if (roomRows < 1) {
            var inl = [o13 + ' percentile' + sf, o13 + sf, o13].filter(function (s0) { return bigW + 8 + textW(s0, 12) <= cw; })[0];
            if (inl) tx(g, cx + bigW + 8, y2, inl, { fill: C.text, 'font-size': 12, 'data-th': 'p13' });
          }
          var short = [[p13, 12, C.text, 'p13'], [pctWord(R.s21) + ' since 2021', 11, C.muted, 'p21'], [pkw, 11, PK_TXT, 'pk'], [note, 11, C.muted]];
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
    var note = noteFor(k, st, live), r2 = 'since 2013 · ' + pctWord(R.s21) + ' since 2021';
    if (textW(r2, 11) > pw * 0.62) r2 = pctWord(R.s21) + ' since 2021';
    rows.push({ x: right, y: 33, s: r2, fill: C.muted, fs: 11, a: 'end', tag: 'p21' });
    var h = 42;
    if (note) {
      if (L + 2 + textW(note, 11) + 10 <= right - textW(r2, 11)) rows.push({ x: L + 2, y: 33, s: note, fill: C.muted, fs: 11 });
      else { rows.push({ x: L + 2, y: 47, s: note, fill: C.muted, fs: 11 }); h = 54; }
    }
    if (!noPeak) { rows.push({ x: L + 2, y: h + 5, s: peakWords(k), fill: PK_TXT, fs: 11, tag: 'pk' }); h += 13; }
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
    top.appendChild(span('', ' · SPY ' + (D.spy[di] == null ? '–' : D.spy[di].toFixed(2)) + ' '));
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
    try { localStorage.setItem('fearRange', chip); } catch (e) { }
    hover.c1 = hover.c2 = null;
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
    try { localStorage.setItem('fearKdjRange', chip); } catch (e) { }
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
    lg.appendChild(item('lg-pk', 'fear peak (same candle on SPY)'));
    lg.appendChild(item('lg-ln lg-k', 'K'));
    lg.appendChild(item('lg-ln lg-d', 'D'));
    lg.appendChild(item('lg-ln lg-j', 'J'));
    lg.appendChild(item('lg-tri lg-up', 'K crosses up = fear rising'));
    lg.appendChild(item('lg-tri lg-dn', 'K crosses down = fear easing'));
    lg.appendChild(item('lg-pl', '90/95/99th pct (2013+)'));
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
    var titleK = paneTitle(gK, L + 7, kTop + 13, 'KDJ OF FEAR');

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
      el('path', { d: triPath(x + dx, y, tri, up), fill: hollow ? C.bg : (up ? KC.up : KC.dn), stroke: hollow ? (up ? KC.up : KC.dn) : C.bg, 'stroke-width': hollow ? 1.5 : 0.8 }, gT);
      snap.push({ x: x + dx, y: y, dn: j }); crossShown.push({ i: j, dir: Q.cross[j], hollow: hollow, y: y, x: x + dx, r: tri });
    });
    crossShown.forEach(function (c) { obsK.push({ x: c.x - c.r - 1, y: c.y - c.r - 1, w: 2 * c.r + 2, h: 2 * c.r + 2 }); });
    obsK.push(titleK);
    var labK = kInsideLabels(gK, [100, 50, 0].map(function (t) { return { y: Yk(t), s: String(t) }; }), L, pw, obsK,
      anyHit([kLineHit(X, Yk, Q.K, a, b, 1.5), kLineHit(X, Yk, Q.D, a, b, 1.5)]), kTop, kTop + kH, true, rX);


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
    ro.appendChild(span('', ' · SPY ' + (Q.spy[j] == null ? '–' : Q.spy[j].toFixed(2))));
    var c = Q.cross[j];
    if (Q.peak[j]) ro.appendChild(span('pk', ' · fear peak'));
    if (c) ro.appendChild(span(c === 'up' ? 'down' : 'up', ' · ' + (c === 'up' ? '▲ K crossed above D' : '▼ K crossed below D') + (isLast && Q.open ? ' (if it closed now)' : '')));
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
    catch (e) { var er = $('kdjErr'); er.hidden = false; errWords(e); er.textContent = 'The KDJ section could not be drawn.'; }
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







  var FS = { sr: null, key: null, nodes: [], y: 0, pushed: false, pendingBack: false, queued: null, queuedPtr: false, at: -1e9, back: 0, vw: 0, vh: 0, off: 0 };
  var FS_SLOTS = ['head', 'note', 'chips', 'ro', 'bar', 'chart', 'legend'];
  function fsSlot(name) { return $('fs').querySelector('[data-fs="' + name + '"]'); }
  function fsHeight(holder) { return FS.key && holder.parentNode === fsSlot('chart') ? holder.clientHeight : null; }
  function fsParts(key) {
    if (key === 'c1' || key === 'c2') {
      var one = key === 'c1', sec = $(one ? 'daily' : 'tf');
      return { label: (one ? 'The fear meter' : 'The fear meter on 4 candle sizes') + ', full screen', kicker: '',
        head: sec.querySelector('.card-head'), ro: $(one ? 'ro1' : 'ro2'), bar: sec.querySelector('.zoombar'),
        chart: $(one ? 'chart1' : 'chart2'), legend: $(one ? 'lg1' : 'lg2'), chips: $('ranges') };
    }
    var k = key.slice(1), B = KB[k];
    return { label: K_NAME[k] + ' candles, fear meter KDJ, full screen', kicker: 'Fear meter · KDJ',
      head: B.root.querySelector('.kb-head'), note: B.note, ro: B.ro, bar: B.root.querySelector('.kb-bar'), chart: B.chart,
      legend: $('lg3'), chips: $('kranges') };
  }
  function fsMinH(key) {
    var short = window.innerHeight <= 540;
    if (key === 'c1') return short ? 180 : 220;
    if (key === 'c2') return fsSlot('chart').clientWidth >= 600 ? (short ? 204 : 260) : 470;
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
    var c1 = $('chart1'), c2 = $('chart2'), w1 = c1.clientWidth, w2 = c2.clientWidth, h1 = fsHeight(c1), h2 = fsHeight(c2);
    var keys = ['c1', 'c2'], skip2 = FS.key === 'c1';
    keys.forEach(function (k) { if (hover[k] != null && (hover[k] < view.x0 || hover[k] > view.x1)) hover[k] = null; });

    var tu = FS.key === 'c1' ? tickUnit(geo1(w1).pw) : FS.key === 'c2' ? tickUnit(geo2(w2).pw) : Math.max(tickUnit(geo1(w1).pw), tickUnit(geo2(w2).pw));

    drawChart1(w1, tu, FS.key === 'c1' ? null : geo2(w2).pw, h1);
    if (!skip2) drawChart2(w2, tu, h2);
    layoutGauge();
    renderViewUi();
  }
  function renderAll() {
    if (!doc) return;
    $('content').hidden = false;
    renderStatus(); renderText();
    try { drawCharts(); }
    catch (e) { errWords(e); showFatal('The charts could not be drawn.'); return; }
    try { renderKdjText(); } catch (e) { var er = $('kdjErr'); er.hidden = false; errWords(e); er.textContent = 'The KDJ section could not be drawn.'; }
    requestKdj('all'); drawKdjPending();
  }
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
    doc = null; D = null;
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'NO DATA';
    $('asof').textContent = 'Could not load the fear meter.';
    $('statusLine').textContent = ''; $('membersLine').textContent = '';
    var b = $('banners'); clear(b);
    if (preview) b.appendChild(banner('info', 'Preview data', 'Trying to read from ' + preview + ', not the live feed.'));
    b.appendChild(banner('bad', 'No numbers to show', msg + ' Nothing is shown rather than old or partial numbers. Try again in a few minutes.',
      { label: 'Try again', fn: function () { load(true); } }));
  }




  function pubErr(msg) { var e = new Error(msg); e.pub = true; return e; }
  function errWords(e) { try { console.warn('fear meter:', e); } catch (x) {  } return e && e.pub ? e.message : 'the data looked broken'; }
  function getJSON(name, url) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    var bust = Math.floor(Date.now() / 60000);
    return fetch((url || base + name) + '?m=' + bust, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw pubErr(name + ': HTTP ' + r.status);
        return r.json().catch(function () { throw pubErr(name + ' is not valid JSON'); });
      }, function (e) {
        clearTimeout(timer);
        throw pubErr(e && e.name === 'AbortError' ? name + ' timed out' : 'network error fetching ' + name);
      });
  }
  var loading = false;
  function load(initial) {
    if (loading) return; loading = true;
    getJSON('fear.json').then(function (d) {
      if (!validate(d)) throw pubErr('the data looked broken');
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
      var w = errWords(e);
      if (!doc) showFatal('Could not load the data (' + w + ').');
      else { lastErr = { at: now(), msg: w }; renderStatus(); }
    }).then(function () { loading = false; });
  }
  function poll() {
    if (document.hidden) return;
    if (!doc) { load(); return; }
    getJSON('manifest.json').then(function (m) {
      var changed = !m || m.generated_at !== doc.generated_epoch;
      if (changed) load();
      else { lastErr = null; renderStatus(); }
    }).catch(function (e) { lastErr = { at: now(), msg: errWords(e) }; renderStatus(); });
  }


  (function initRange() {
    var r = null;
    try { r = normRange(localStorage.getItem('fearRange')) || normRange(localStorage.getItem('fearWin')); } catch (e) { }
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
    try { r = normKRange(localStorage.getItem('fearKdjRange')); } catch (e) { }
    kChip = normKRange(params.get('krange')) || r || 'Auto';
    renderKChips();
  })();
  Array.prototype.forEach.call(document.querySelectorAll('[data-krange]'), function (b) {
    b.addEventListener('click', function () { chooseKRange(b.getAttribute('data-krange')); });
  });
  initFs();
  attachGestures($('chart1'), 'c1');
  attachGestures($('chart2'), 'c2');
  initKdjBlocks();
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
