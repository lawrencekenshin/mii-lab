




(function () {
  'use strict';
  var sec = document.getElementById('vixts');
  if (!sec) return;
  var URL_ = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/vixts-data/vixts/vixts.json' : 'snap/vixts.pub.json';

  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    blue: '#3987E5', light: '#8EC0FA', red: '#EF5350', amber: '#FFB74D', yel: '#FFD84D', grey: '#5D606B' };
  var RANGES = { '1Y': 365, '5Y': 1826, 'All': Infinity };
  var RWORDS = { '1Y': 'last year', '5Y': 'last 5 years', 'All': 'since Sep 2009' };
  var NS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var ORDW = ['calmest', '2nd-calmest', 'middle', '2nd-highest', 'highest'];

  var V = null, DN = null, range = '5Y', hoverI = null, geo = null;
  try { var saved = localStorage.getItem('vixtsRange'); if (saved && RANGES[saved]) range = saved; } catch (e) { }

  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function tx(g, x, y, s, a) { var t = el('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
  function ord(n) { var m = n % 100; return n + (m >= 11 && m <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); }
  function textW(s, fs) { return s.length * fs * 0.56; }
  function dnOf(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function dt(dn) { return new Date(dn * 864e5); }
  function day(dn, opt) {
    var d = dt(dn), s = MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
    if (opt && opt.dow) s = DOW[d.getUTCDay()] + ' ' + s;
    if (opt && opt.year) s += ', ' + d.getUTCFullYear();
    return s;
  }
  function dayS(s, opt) { return day(dnOf(s), opt); }
  function r2(x) { return x.toFixed(2); }
  function r3(x) { return x.toFixed(3); }
  function sgn(x, dp) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(dp == null ? 1 : dp); }
  function ratio(i) { return V.view.r[i] / 1000; }

  var ZWORD = { calm: 'calm', uneasy: 'uneasy (top fifth, still below 1)', panic: 'panic' };
  var ZCLS = { calm: 'calm', uneasy: 'hot', panic: 'panic' };
  function zoneOf(k) { return { k: k, w: ZWORD[k] || k, cls: ZCLS[k] || 'calm' }; }
  function zoneAt(i) { return zoneOf(V.zones[V.view.z[i]]); }

  function validate(d) {
    if (!d || d.schema !== 2 || d.kind !== 'vixts' || !d.view || !d.now || !d.study || !d.stats) return false;
    var w = d.view, n = w.n;
    return n > 500 && Array.isArray(w.dd) && w.dd.length === n - 1 && [w.r, w.p, w.spy, w.g, w.z].every(function (a) { return Array.isArray(a) && a.length === n; }) &&
      Array.isArray(d.ln) && d.ln.length === 4 && Array.isArray(d.zones) && d.zones.length === 3 && ZWORD[d.now.zone] &&
      d.study.q21 && d.study.q21.mean.length === 5 && d.study.q09.mean.length === 5 && d.study.y2008 && typeof d.study.thru === 'string';
  }


  function renderText() {
    var w = V.view, last = w.n - 1, now = V.now, st = V.study, S = V.stats, z = zoneOf(now.zone), thru = st.thru;
    var asof = $('asofVX'); clear(asof);
    asof.appendChild(span('chip chip-closed', 'DAILY'));
    var b = new Date(V.built_utc);
    asof.appendChild(span('', 'Daily closes to ' + dayS(now.d, { dow: true, year: true }) + ' · built ' +
      (isNaN(b) ? '' : MON[b.getMonth()] + ' ' + b.getDate() + ', ' + String(b.getHours()).padStart(2, '0') + ':' + String(b.getMinutes()).padStart(2, '0'))));
    $('numVX').textContent = r2(now.r);
    var zn = $('zoneVX'); zn.className = 'vx-zone ' + z.cls; zn.textContent = z.k === 'uneasy' ? 'uneasy' : z.k;
    var mean = $('meanVX'); clear(mean);
    if (now.r < 1) {
      mean.appendChild(document.createTextNode('Below 1: the 3-month VIX (' + r2(now.v3) + ') is above the 1-month VIX (' + r2(now.vix) + '). '));
      mean.appendChild(span('', 'Traders price more fear later than now. That is the normal, calm state.'));
    } else {
      mean.appendChild(document.createTextNode('Above 1: the 1-month VIX (' + r2(now.vix) + ') is above the 3-month VIX (' + r2(now.v3) + '). '));
      mean.appendChild(span('', 'Near-term fear is higher than longer-term fear. That is panic.'));
    }
    var pl = document.createElement('b'); pl.textContent = ' ' + ord(now.p) + ' percentile since 2009';
    mean.appendChild(document.createElement('br'));
    mean.appendChild(document.createTextNode('Today ranks'));
    mean.appendChild(pl);
    mean.appendChild(document.createTextNode(': higher than ' + now.p + '% of days, lower than ' + (100 - now.p) + '%.'));
    var tiles = $('tilesVX'); clear(tiles);
    function tile(k, v, s) { var d = document.createElement('div'); d.appendChild(span('k', k)); d.appendChild(span('v', v)); d.appendChild(span('s', s)); tiles.appendChild(d); }
    tile('VIX ÷ VIX3M', r3(now.r), dayS(now.d, { dow: true }) + ' close');
    tile('Percentile', ord(now.p), 'of days since Sep 2009');
    tile('VIX · VIX3M', r2(now.vix) + ' · ' + r2(now.v3), '1-month · 3-month');
    tile('Study group', now.g + ' of 5', ORDW[now.g - 1] + ' fifth');
    var lg = $('lgVX'); clear(lg);
    function item(cls, t) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(t)); lg.appendChild(s); }
    item('lg-spy', 'SPY close');
    item('lg-ratio', 'VIX ÷ VIX3M, daily');
    item('lg-one', '1.0 = panic line');
    item('lg-hot', 'above 1 (panic)');
    item('lg-q5', 'where the top fifth starts (since 2021)');
    item('lg-pk', 'highest in view');
    item('lg-now', 'last close');

    var q = st.q21, q9 = st.q09;
    $('capVX').textContent = 'A fixed study through ' + thru + ': SPY over the 13 weeks after each week, by where the ratio was that week. ' +
      'Weeks are split into five equal groups (calm → panic) within each period. Blue = 2021 → ' + thru + ', grey = 2009–12. Shaded = today’s group.';
    $('howVX').textContent = 'The VIX is the market’s price for S&P 500 swings over the next month; VIX3M is the same for the next 3 months. ' +
      'Normally the 3-month number is higher, so the ratio sits below 1 (8 days in 10 since 2009: ' + r2(S.p10) + ' to ' + r2(S.p90) + '). When fear arrives fast, the 1-month VIX jumps past the 3-month and the ratio goes above 1. ' +
      'Since Sep 2009 that happened on ' + Math.round(S.above_share) + '% of days. The chart’s red line is 1.0; the dashed line is where the study’s top fifth starts.';
    var nw = 'Ratio ' + r3(now.r) + ' on ' + dayS(now.d) + ' = ' + z.w + ', the ' + ord(now.p) + ' percentile since 2009 and group ' + now.g + ' of 5 (' + ORDW[now.g - 1] + '). ' +
      'A week ago (' + dayS(now.wk_d) + ') it was ' + r3(now.wk_r) + '. ';
    nw += 'In the study, weeks in this group were followed by SPY ' + sgn(q.mean[now.g - 1]) + '% on average over 13 weeks (up ' + Math.round(q.up[now.g - 1]) + '% of the time) since 2021, ' +
      'against ' + sgn(q.all) + '% for all weeks' + (q.mean[now.g - 1] < q.all ? ': no fear boost now. ' : ': a fear tilt in SPY’s favour. ');
    if (S.last_above) nw += 'Last time above 1: ' + dayS(S.last_above, { year: true }) + ' (' + r2(S.last_above_r) + '). ';
    nw += 'Last 12 months: from ' + r2(S.y_min_r) + ' (' + dayS(S.y_min_d, { year: true }) + ') to ' + r2(S.y_max_r) + ' (' + dayS(S.y_max_d, { year: true }) + ').';
    $('nowVX').textContent = nw;
    var e = st.eras;
    $('studyVX').textContent = 'Of ' + st.n_signals + ' likely leaders tested the same way in a fixed study (weekly, 2009 → ' + thru + '), VIX ÷ VIX3M was the steadiest. ' +
      'A higher ratio (more near-term panic) lined up with better SPY returns over the next 13 weeks in all four eras (correlation ' +
      sgn(e['2009–12'], 2) + ', ' + sgn(e['2013–19'], 2) + ', ' + sgn(e['2020–22'], 2) + ', ' + sgn(e['2023–26'], 2) + '). ' +
      'Trained only on the past, it explained ' + st.oos15.toFixed(1) + '% of next-quarter moves from 2015 and ' + st.oos21.toFixed(1) + '% from 2021: small, but the only fear signal that held up out of sample. ' +
      'The panic fifth was followed by ' + sgn(q.mean[4]) + '% since 2021 (up ' + Math.round(q.up[4]) + '%) and ' + sgn(q9.mean[4]) + '% in 2009–12; the calm fifth by ' +
      sgn(q.mean[0]) + '% and ' + sgn(q9.mean[0]) + '%.';
    var cz = st.y2008;
    $('honestVX').textContent = '2008, before VIX3M existed (it starts in Sep 2009): a high VIX kept flashing fear while SPY kept falling. In the study, the weeks with the VIX at its panic highs ' +
      'were followed by a median ' + sgn(cz.hi_med) + '% over 13 weeks (up only ' + cz.hi_up + '% of the time), and the first big VIX spike (' + cz.spike_when + ') by ' +
      sgn(cz.spike) + '%. Rebuilt after each US close (this one: ' + dayS(now.d) + ').';
  }


  function drawMeter() {
    var holder = $('meterVX'); clear(holder);
    var W = Math.max(280, Math.round(holder.clientWidth || 340)), narrow = W < 460;
    var edges = V.ln, now = V.now.r, cur = V.now.g;
    var lo = 0.70, hi = 1.15, L = 4, R = 4, pw = W - L - R, H = 90, by = 42, bh = 16, fs = narrow ? 10.5 : 11.5;
    var X = function (v) { return L + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * pw; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Today ' + r2(now) + ', group ' + cur + ' of 5' }, holder);
    tx(svg, L, 12, 'Today among the study’s five groups (since 2021)', { fill: C.muted, 'font-size': fs });
    var bounds = [lo].concat(edges).concat([hi]);
    var fills = ['#253A5C', '#2D4A78', '#355C96', '#8A6A2E', '#A0472F'];
    for (var k = 0; k < 5; k++) {
      var x0 = X(bounds[k]), x1 = X(bounds[k + 1]), isCur = k + 1 === cur;
      el('rect', { x: x0 + 0.5, y: by, width: Math.max(1, x1 - x0 - 1), height: bh, fill: fills[k], rx: k === 0 || k === 4 ? 3 : 0, stroke: isCur ? C.white : 'none', 'stroke-width': isCur ? 1.2 : 0 }, svg);
      if (x1 - x0 > 12) tx(svg, (x0 + x1) / 2, by + bh / 2 + 4, String(k + 1), { fill: C.white, 'font-size': fs, 'font-weight': 700, 'text-anchor': 'middle' });
    }

    var x1v = X(1);
    el('line', { x1: x1v, x2: x1v, y1: by - 6, y2: by + bh + 6, stroke: C.red, 'stroke-width': 2 }, svg);

    [0.8, 0.9, 1.0, 1.1].forEach(function (v) {
      tx(svg, X(v), by + bh + 18, v.toFixed(1), { fill: v === 1 ? C.red : C.muted, 'font-size': fs, 'font-weight': v === 1 ? 700 : 400, 'text-anchor': 'middle' });
    });
    tx(svg, L, by + bh + 18, 'calm', { fill: C.light, 'font-size': fs, 'text-anchor': 'start' });
    tx(svg, L + pw, by + bh + 18, 'panic', { fill: C.red, 'font-size': fs, 'text-anchor': 'end' });

    var xn = X(now);
    el('rect', { x: xn - 1.5, y: by - 7, width: 3, height: bh + 14, fill: C.white, rx: 1, stroke: C.bg, 'stroke-width': 1 }, svg);
    var s = 'today ' + r2(now), tw = textW(s, fs + 0.5);
    var tx0 = Math.max(L + tw / 2, Math.min(L + pw - tw / 2, xn));
    tx(svg, tx0, by - 10, s, { fill: C.white, 'font-size': fs + 0.5, 'font-weight': 700, 'text-anchor': 'middle' });
  }


  function niceStep(span, px, minPx, steps) {
    for (var k = 0; k < steps.length; k++) if (steps[k] / span * px >= minPx) return steps[k];
    return steps[steps.length - 1];
  }
  function draw() {
    var holder = $('chartVX'); clear(holder);
    if (!V) return;
    var w = V.view, n = w.n, last = n - 1;
    var W = Math.max(300, Math.round(holder.clientWidth || sec.clientWidth || 360)), narrow = W < 640;
    var L = narrow ? 36 : 46, R = narrow ? 10 : 14, pw = W - L - R;
    var sH = narrow ? 96 : 130, gap = narrow ? 10 : 14, fH = narrow ? 200 : 260, axH = 22;
    var H = sH + gap + fH + axH, fTop = sH + gap;
    var days = RANGES[range], i0 = 0;
    if (isFinite(days)) { var cut = DN[last] - days; while (i0 < last && DN[i0] < cut) i0++; }
    var cnt = last - i0 + 1;
    var X = function (i) { return L + (i - i0 + 0.5) / cnt * pw; };
    var fs = narrow ? 10.5 : 11.5;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'VIX divided by VIX3M with SPY above' }, holder);
    var defs = el('defs', {}, svg);
    var cpS = el('clipPath', { id: 'vxclipS' }, defs); el('rect', { x: L, y: 0, width: pw, height: sH }, cpS);
    var cpF = el('clipPath', { id: 'vxclipF' }, defs); el('rect', { x: L, y: fTop, width: pw, height: fH }, cpF);
    el('rect', { x: L, y: 0, width: pw, height: sH, fill: C.panel, rx: 3 }, svg);
    el('rect', { x: L, y: fTop, width: pw, height: fH, fill: C.panel, rx: 3 }, svg);

    var ticks = [], i, prev = null, monthly = cnt < 400, every = (!monthly && narrow && cnt > 1500) ? 2 : 1;
    for (i = i0; i <= last; i++) {
      var d = dt(DN[i]);
      if (monthly) {
        var mk = d.getUTCFullYear() * 12 + d.getUTCMonth();
        if (prev !== null && mk !== prev && (!narrow || mk % 2 === 0)) ticks.push({ i: i, s: d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()] });
        prev = mk;
      } else {
        var y = d.getUTCFullYear();
        if (prev !== null && y !== prev && y % every === 0) ticks.push({ i: i, s: narrow && cnt > 1500 ? "'" + String(y).slice(2) : String(y) });
        prev = y;
      }
    }
    ticks.forEach(function (t) {
      var x = X(t.i) - 0.5 * pw / cnt;
      el('line', { x1: x, x2: x, y1: 0, y2: sH, stroke: C.line, 'stroke-width': 1 }, svg);
      el('line', { x1: x, x2: x, y1: fTop, y2: fTop + fH, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, x, H - 6, t.s, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
    });

    var smin = Infinity, smax = -Infinity;
    for (i = i0; i <= last; i++) { smin = Math.min(smin, w.spy[i]); smax = Math.max(smax, w.spy[i]); }
    smin /= 100; smax /= 100;
    var spad = Math.max((smax - smin) * 0.08, 0.5), s0 = smin - spad, s1 = smax + spad;
    var Ys = function (v) { return sH - 4 - (v - s0) / (s1 - s0) * (sH - 22); };
    var sst = niceStep(s1 - s0, sH - 22, narrow ? 18 : 26, [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]);
    for (var sv = Math.ceil(s0 / sst) * sst; sv <= s1; sv += sst) {
      var sy = Ys(sv); if (sy < 16 || sy > sH - 2) continue;
      el('line', { x1: L, x2: L + pw, y1: sy, y2: sy, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, sy + 3.5, String(Math.round(sv)), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    var dS = '';
    for (i = i0; i <= last; i++) dS += (i === i0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Ys(w.spy[i] / 100).toFixed(1);
    el('path', { d: dS, fill: 'none', stroke: C.text, 'stroke-width': narrow ? 1.1 : 1.3, 'stroke-linejoin': 'round', 'clip-path': 'url(#vxclipS)' }, svg);
    tx(svg, L + 7, 14, 'S&P 500 (SPY) · daily close', { fill: C.text, 'font-size': narrow ? 11 : 12 });

    var rmin = Infinity, rmax = -Infinity, imax = i0;
    for (i = i0; i <= last; i++) { var rv = ratio(i); if (rv < rmin) rmin = rv; if (rv > rmax) { rmax = rv; imax = i; } }
    var q5 = V.ln[3];
    var lo = Math.min(rmin, 0.8), hi = Math.max(rmax, 1.04);
    var pad = (hi - lo) * 0.06; lo -= pad; hi += pad * 2.2;
    var Yf = function (v) { return fTop + fH - 4 - (v - lo) / (hi - lo) * (fH - 26); };
    var fst = niceStep(hi - lo, fH - 26, 26, [0.02, 0.05, 0.1, 0.2, 0.25, 0.5]);
    for (var fv = Math.ceil(lo / fst) * fst; fv <= hi + 1e-9; fv += fst) {
      var fy = Yf(fv); if (fy < fTop + 18 || fy > fTop + fH - 2) continue;
      el('line', { x1: L, x2: L + pw, y1: fy, y2: fy, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, fy + 3.5, fv.toFixed(fst < 0.1 ? 2 : 1), { fill: C.light, 'font-size': fs, 'text-anchor': 'end' });
    }
    var y1 = Yf(1);

    var cpP = el('clipPath', { id: 'vxclipP' }, defs); el('rect', { x: L, y: fTop, width: pw, height: Math.max(0, y1 - fTop) }, cpP);
    var dA = 'M' + X(i0).toFixed(1) + ' ' + y1.toFixed(1), dR = '';
    for (i = i0; i <= last; i++) {
      var px = X(i).toFixed(1), py = Yf(ratio(i)).toFixed(1);
      dA += 'L' + px + ' ' + py; dR += (i === i0 ? 'M' : 'L') + px + ' ' + py;
    }
    dA += 'L' + X(last).toFixed(1) + ' ' + y1.toFixed(1) + 'Z';
    var gA = el('g', { 'clip-path': 'url(#vxclipF)' }, svg);
    el('path', { d: dA, fill: C.red, 'fill-opacity': 0.35, 'clip-path': 'url(#vxclipP)' }, gA);

    var fsT = narrow ? 10 : 11, tags = [];
    function hline(v, col, dash, wdt, s) {
      var y = Yf(v);
      if (y < fTop + 2 || y > fTop + fH - 2) return;
      el('line', { x1: L, x2: L + pw, y1: y.toFixed(1), y2: y.toFixed(1), stroke: col, 'stroke-width': wdt, 'stroke-dasharray': dash }, svg);
      var tw = textW(s, fsT) + 8, tb = { x: L + pw - tw - 4, y: y - 7, w: tw, h: 14, s: s, col: col };
      if (tags.some(function (o) { return Math.abs(o.y - tb.y) < 15; })) tb.y += 15;
      tags.push(tb);
    }
    function drawTags() {
      tags.forEach(function (tb) {
        el('rect', { x: tb.x, y: tb.y, width: tb.w, height: tb.h, rx: 2, fill: C.panel, 'fill-opacity': 0.92 }, svg);
        tx(svg, tb.x + tb.w / 2, tb.y + 10.6, tb.s, { fill: tb.col, 'font-size': fsT, 'font-weight': 600, 'text-anchor': 'middle' });
      });
    }
    hline(1, C.red, null, 1.4, '1.0 panic line');
    hline(q5, C.amber, '6 4', 1.1, 'top fifth');
    el('path', { d: dR, fill: 'none', stroke: C.light, 'stroke-width': narrow ? 1.1 : 1.3, 'stroke-linejoin': 'round', 'clip-path': 'url(#vxclipF)' }, svg);
    drawTags();
    tx(svg, L + 7, fTop + 15, 'VIX ÷ VIX3M · daily', { fill: C.text, 'font-size': narrow ? 11 : 12 });

    if (imax !== last) {
      var mx = X(imax), my = Yf(ratio(imax));
      el('circle', { cx: mx, cy: my, r: narrow ? 3.2 : 3.8, fill: C.yel, stroke: C.bg, 'stroke-width': 1.2 }, svg);
      var ms = r2(ratio(imax)) + '  ' + day(DN[imax], { year: true }), mw = textW(ms, fsT);
      var mlx = Math.max(L + 4 + mw / 2, Math.min(L + pw - 4 - mw / 2, mx));
      tx(svg, mlx, Math.max(fTop + 30, my - 8), ms, { fill: C.white, 'font-size': fsT, 'font-weight': 600, 'text-anchor': 'middle', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
    }

    var nx = X(last), ny = Yf(ratio(last)), rN = narrow ? 4.5 : 5.5;
    el('circle', { cx: nx, cy: ny, r: rN + 3, fill: C.light, 'fill-opacity': 0.3 }, svg);
    el('circle', { cx: nx, cy: ny, r: rN, fill: '#EEF5FF', stroke: C.white, 'stroke-width': 1.5 }, svg);
    el('circle', { cx: nx, cy: Ys(w.spy[last] / 100), r: rN - 1.5, fill: '#EEF5FF', stroke: C.white, 'stroke-width': 1.2 }, svg);
    tx(svg, nx - rN - 6, ny + rN + 13, 'now ' + r2(ratio(last)), { fill: C.white, 'font-size': fsT + 0.5, 'font-weight': 700, 'text-anchor': 'end', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
    var cross = el('g', {}, svg);
    geo = { L: L, pw: pw, i0: i0, cnt: cnt, X: X, Yf: Yf, Ys: Ys, cross: cross, fTop: fTop, fH: fH };
    setHover(hoverI);
  }
  function setHover(i) {
    if (!geo || !V) return;
    var w = V.view, last = w.n - 1;
    clear(geo.cross);
    if (i != null && (i < geo.i0 || i > last)) i = null;
    hoverI = i;
    var j = i == null ? last : i;
    if (i != null) {
      var px = geo.X(i);
      el('line', { x1: px, x2: px, y1: 0, y2: geo.fTop + geo.fH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
      el('circle', { cx: px, cy: geo.Yf(ratio(i)), r: 4, fill: C.light, stroke: C.white, 'stroke-width': 1.1 }, geo.cross);
      el('circle', { cx: px, cy: geo.Ys(w.spy[i] / 100), r: 3.4, fill: C.text, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
    }
    var ro = $('roVX'); clear(ro);
    var rj = ratio(j), z = zoneAt(j);
    ro.appendChild(span('d', day(DN[j], { dow: true, year: true })));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('vr', 'ratio ' + r3(rj)));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('pc', ord(w.p[j]) + ' percentile'));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span(z.k === 'panic' ? 'vz-panic' : '', z.k + ' (group ' + w.g[j] + ')'));
    ro.appendChild(span('', ' · SPY ' + (w.spy[j] / 100).toFixed(2)));
    if (i == null) ro.appendChild(span('muted', ' · tap or hover the chart for any day'));
  }
  function pickAt(ev) {
    if (!geo) return;
    var box = $('chartVX'), svg = box.querySelector('svg');
    if (!svg) return;
    var r = box.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width, x = (ev.clientX - r.left) * scale;
    var i = Math.round(geo.i0 + (x - geo.L) / geo.pw * geo.cnt - 0.5);
    setHover(Math.max(geo.i0, Math.min(V.view.n - 1, i)));
  }


  function drawBars() {
    var holder = $('barsVX'); clear(holder);
    var W = Math.max(290, Math.round(holder.clientWidth || 340)), narrow = W < 560;
    var st = V.study, q = st.q21, q9 = st.q09, cur = V.now.g;
    var L = 4, R = 4, pw = W - L - R, top = 22, ch = narrow ? 120 : 140, H = top + ch + 46, fs = narrow ? 10 : 11.5;
    var vmax = Math.max.apply(null, q.mean.concat(q9.mean)) * 1.15, vmin = Math.min(0, Math.min.apply(null, q.mean.concat(q9.mean)));
    var Y = function (v) { return top + ch - (v - vmin) / (vmax - vmin) * ch; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'SPY over the next 13 weeks by group' }, holder);
    var gw = pw / 5, bw = Math.min(narrow ? 22 : 34, gw * 0.34);

    el('rect', { x: L + (cur - 1) * gw + 2, y: 2, width: gw - 4, height: top + ch + 40, fill: C.light, 'fill-opacity': 0.09, rx: 6 }, svg);
    tx(svg, L + (cur - 0.5) * gw, 13, 'today', { fill: C.light, 'font-size': fs, 'font-weight': 700, 'text-anchor': 'middle' });

    var ya = Y(q.all);
    el('line', { x1: L, x2: L + pw, y1: ya, y2: ya, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    el('line', { x1: L, x2: L + pw, y1: Y(0), y2: Y(0), stroke: C.line, 'stroke-width': 1 }, svg);
    for (var k = 0; k < 5; k++) {
      var cx = L + (k + 0.5) * gw;
      [[q.mean[k], C.blue, -1], [q9.mean[k], C.grey, 1]].forEach(function (b) {
        var x = cx + (b[2] < 0 ? -bw - 1.5 : 1.5), y = Y(Math.max(0, b[0])), h = Math.abs(Y(b[0]) - Y(0));
        el('rect', { x: x, y: y, width: bw, height: Math.max(1, h), fill: b[1], rx: 2 }, svg);
        var s = sgn(b[0]) + (narrow ? '' : '%');
        tx(svg, x + bw / 2, (b[0] >= 0 ? y : y + h + 11) - 4, s, { fill: b[2] < 0 ? C.white : C.muted, 'font-size': fs, 'font-weight': b[2] < 0 ? 700 : 400, 'text-anchor': 'middle', stroke: C.bg, 'stroke-width': 3, 'paint-order': 'stroke' });
      });
      var lab = k === 0 ? '1 calm' : k === 4 ? '5 panic' : String(k + 1);
      tx(svg, cx, top + ch + 16, lab, { fill: k === 4 ? C.red : k === 0 ? C.light : C.text, 'font-size': fs + 0.5, 'font-weight': 600, 'text-anchor': 'middle' });
      tx(svg, cx, top + ch + 32, 'up ' + Math.round(q.up[k]) + '%', { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
    }
    var as = 'all weeks ' + sgn(q.all) + '%';
    tx(svg, L + 2, ya - 4, as, { fill: C.muted, 'font-size': fs, 'text-anchor': 'start', stroke: C.bg, 'stroke-width': 3, 'paint-order': 'stroke' });
  }
  function renderBarsLegend() {
    var p = $('lgBarsVX'); clear(p);
    function item(cls, t) { var s = span('lg-i', ''); if (cls) s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(t)); p.appendChild(s); }
    item('lg-b21', '2021 → ' + V.study.thru + ' (labels = average %)');
    item('lg-b09', '2009–12');
    item('lg-rearm', 'all weeks since 2021');
    item('', 'up % = share of 13-week stretches that ended higher (since 2021)');
  }

  function drawAll() { if (!V) return; drawMeter(); draw(); drawBars(); }


  function renderRange() {
    Array.prototype.forEach.call(sec.querySelectorAll('[data-vxr]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-vxr') === range)); });
    var t = sec.querySelector('[data-vxspan]'); if (t) t.textContent = RWORDS[range];
  }
  sec.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-vxr]');
    if (!b) return;
    range = b.getAttribute('data-vxr');
    try { localStorage.setItem('vixtsRange', range); } catch (e) { }
    hoverI = null; renderRange(); draw();
  });
  var chart = $('chartVX');
  chart.addEventListener('pointermove', pickAt);
  chart.addEventListener('pointerdown', pickAt);
  chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });

  var rt = null, lastW = -1;
  function onSize() { var cw = chart.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(drawAll, 80); }
  if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart);
  else window.addEventListener('resize', onSize);


  renderRange();
  fetch(URL_, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (d) {
    if (!validate(d)) throw new Error('bad data');
    V = d;
    DN = new Array(d.view.n); DN[0] = dnOf(d.view.d0);
    for (var i = 1; i < d.view.n; i++) DN[i] = DN[i - 1] + d.view.dd[i - 1];
    $('errVX').hidden = true; $('bodyVX').hidden = false;
    renderText(); renderBarsLegend(); drawAll();
  }).catch(function () {
    $('errVX').hidden = false; $('bodyVX').hidden = true;
    $('errVX').textContent = 'The VIX ÷ VIX3M data could not be loaded. The breadth charts are not affected.';
  });
})();
