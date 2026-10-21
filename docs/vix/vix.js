

(function () {
  'use strict';
  var DATA = null;
  var RANGE = '5Y', KRANGE = 'Auto';
  var PX = 'SPY';
  var PX_LAB = { SPY: 'S&P 500 (SPY)', QQQ: 'Nasdaq 100 (QQQ)' };
  function pxD(D) { return PX === 'QQQ' ? D.qqq : D.spy; }
  function pxB(B) { return PX === 'QQQ' ? B.q : B.s; }
  function ODDS() { return DATA.odds[PX] || DATA.odds; }
  var RANGE_N = { '1M': 21, '3M': 63, '6M': 126, '1Y': 252, '2Y': 504, '5Y': 1260, '10Y': 2520 };
  var RANGE_WORD = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year', '2Y': 'last 2 years',
    '5Y': 'last 5 years', '10Y': 'last 10 years', 'All': 'since 2004' };
  var KAUTO = { '1D': 120, '1W': 104, '2W': 78, '1M': 180 };
  var KMONTHS = { '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120 };
  var TF_WORD = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  var TF_UNIT = { '1D': 'day', '1W': 'week', '2W': '2 weeks', '1M': 'month' };
  var C = { text: '#D1D4DC', muted: '#8A8E99', line: '#2A2E39', grid: 'rgba(42,46,57,.7)', vix: '#B39DDB', fear: '#7E57C2',
    pl: '#B98AF2', pk: '#FFD84D', up: '#26A69A', down: '#EF5350', k: '#4FC3F7', d: '#FFB74D', j: '#8A8F9E', spy: '#D1D4DC',
    v3m: '#FFB74D', v9d: '#4FC3F7', vv: '#9FA8DA', white: '#FFFFFF', bg: '#131722' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pd(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function fdate(s, withDow) { var d = pd(s); return (withDow ? DOW[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); }
  function fmon(s) { var d = pd(s); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function f2(x) { return x == null ? '–' : x.toFixed(2); }
  function f1(x) { return x == null ? '–' : x.toFixed(1); }
  function f0(x) { return x == null ? '–' : Math.round(x).toString(); }
  function ord(p) { if (p == null) return '–'; var n = Math.round(p); if (n >= 100) n = 99; var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function sgn(x, d) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d == null ? 1 : d); }
  function pctChg(a, b) { return (a / b - 1) * 100; }


  function zoneOf() { return DATA.zone || { w: '–', cls: '' }; }



  function drawChart(el, spec) {
    var W = Math.max(280, el.clientWidth || 600), AX = spec.axisW || 46, PW = W - AX, top = 4, gap = 8;
    var a = spec.a, b = spec.b, cnt = Math.max(1, b - a);
    function X(i) { return (i - a) / cnt * (PW - 8) + 4; }
    var parts = [], y0 = top, paneGeo = [];
    spec.panes.forEach(function (pn, pi) {
      var lo = Infinity, hi = -Infinity;
      if (pn.fixed) { lo = pn.fixed[0]; hi = pn.fixed[1]; }
      else {
        pn.items.forEach(function (it) {
          if (it.noScale) return;
          if (it.t === 'bar') { lo = Math.min(lo, it.lo); hi = Math.max(hi, it.hi); return; }
          var arrs = it.t === 'candles' ? [it.h, it.l] : (it.t === 'range' ? [it.lo, it.hi] : (it.v ? [it.v] : []));
          arrs.forEach(function (arr) { for (var i = a; i <= b; i++) { var v = arr[i]; if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } } });
          if (it.t === 'hline' && it.scale) { lo = Math.min(lo, it.y); hi = Math.max(hi, it.y); }
        });
        if (!isFinite(lo)) { lo = 0; hi = 1; }
        var pad = (hi - lo) * (pn.pad == null ? 0.08 : pn.pad) || 1; lo -= pad; hi += pad;
        if (pn.floor != null) lo = Math.max(pn.floor, lo);
      }
      var h = pn.h, yt = y0, yb = y0 + h;
      function Y(v) { return yb - (v - lo) / (hi - lo) * h; }
      paneGeo.push({ Y: Y, yt: yt, yb: yb, lo: lo, hi: hi });

      parts.push('<rect x="0" y="' + yt + '" width="' + PW + '" height="' + h + '" fill="rgba(30,34,45,.55)" rx="2"/>');
      var ticks = niceTicks(lo, hi, h > 120 ? 5 : 3);
      ticks.forEach(function (t) {
        var yy = Y(t); if (yy < yt + 2 || yy > yb - 2) return;
        parts.push('<line x1="0" x2="' + PW + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="' + C.grid + '" stroke-width="1"/>');
        parts.push('<text x="' + (PW + 5) + '" y="' + (yy + 4).toFixed(1) + '" fill="' + C.muted + '" font-size="11">' + (pn.fmt ? pn.fmt(t) : t) + '</text>');
      });
      if (pn.label) parts.push('<text x="6" y="' + (yt + 13) + '" fill="' + C.muted + '" font-size="10.5" font-weight="700" letter-spacing=".05em">' + esc(pn.label) + '</text>');
      var edgeTags = [], labYs = [];
      pn.items.forEach(function (it) {
        if (it.t === 'band') {
          var ya = Y(Math.min(hi, Math.max(lo, it.y1))), yb2 = Y(Math.max(lo, Math.min(hi, it.y0)));
          if (yb2 - ya > 0.5) parts.push('<rect x="0" width="' + PW + '" y="' + ya.toFixed(1) + '" height="' + (yb2 - ya).toFixed(1) + '" fill="' + it.fill + '"/>');
        } else if (it.t === 'range') {

          var segs = [], cur = [];
          for (var q = a; q <= b; q++) {
            if (it.lo[q] == null || it.hi[q] == null) { if (cur.length) segs.push(cur); cur = []; continue; }
            cur.push(q);
          }
          if (cur.length) segs.push(cur);
          segs.forEach(function (sg) {
            var top = sg.map(function (q, k) { return (k ? 'L' : 'M') + X(q).toFixed(1) + ' ' + Y(Math.min(hi, it.hi[q])).toFixed(1); }).join('');
            var bot = sg.slice().reverse().map(function (q) { return 'L' + X(q).toFixed(1) + ' ' + Y(Math.max(lo, it.lo[q])).toFixed(1); }).join('');
            parts.push('<path d="' + top + bot + 'Z" fill="' + it.fill + '" stroke="none"/>');
          });
        } else if (it.t === 'bar') {

          if (it.i < a || it.i > b) return;
          var bx = X(it.i), bw2 = 5;
          parts.push('<rect x="' + (bx - bw2).toFixed(1) + '" y="' + Y(it.hi).toFixed(1) + '" width="' + (2 * bw2) + '" height="' + Math.max(1, Y(it.lo) - Y(it.hi)).toFixed(1) + '" fill="rgba(255,216,77,.22)" stroke="#FFD84D" stroke-width="1" rx="2"/>');
          if (it.lo2 != null) parts.push('<rect x="' + (bx - bw2 + 2).toFixed(1) + '" y="' + Y(it.hi2).toFixed(1) + '" width="' + (2 * bw2 - 4) + '" height="' + Math.max(1, Y(it.lo2) - Y(it.hi2)).toFixed(1) + '" fill="rgba(255,216,77,.55)" rx="1"/>');
          var lab = function (v) { return v >= 1000 ? Math.round(v).toLocaleString() : (v >= 100 ? Math.round(v) : v.toFixed(1)); };
          parts.push('<text x="' + (bx - bw2 - 3).toFixed(1) + '" y="' + (Y(it.hi) + 4).toFixed(1) + '" fill="#FFD84D" font-size="10.5" text-anchor="end" font-weight="700">' + lab(it.hi) + '</text>');
          parts.push('<text x="' + (bx - bw2 - 3).toFixed(1) + '" y="' + (Y(it.lo) + 4).toFixed(1) + '" fill="#FFD84D" font-size="10.5" text-anchor="end" font-weight="700">' + lab(it.lo) + '</text>');
        } else if (it.t === 'hline') {
          var yy = Y(it.y);
          if (yy < yt || yy > yb) { if (it.tag) edgeTags.push({ up: yy < yt, txt: it.tag, color: it.color }); return; }
          parts.push('<line x1="0" x2="' + PW + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="' + it.color + '" stroke-width="' + (it.w || 1) + '"' + (it.dash ? ' stroke-dasharray="' + it.dash + '"' : '') + ' opacity="' + (it.op || 1) + '"/>');
          if (it.label) {

            var clash = it.left || labYs.some(function (q) { return Math.abs(q - yy) < 12; });
            parts.push('<text x="' + (clash ? 40 : PW - 4) + '" y="' + (yy - 3).toFixed(1) + '" fill="' + it.color + '" font-size="10.5" text-anchor="' + (clash ? 'start' : 'end') + '" font-weight="600">' + esc(it.label) + '</text>');
            if (!clash) labYs.push(yy);
          }
        } else if (it.t === 'line') {
          var d = '', pen = false, area = '';
          for (var i = a; i <= b; i++) {
            var v = it.v[i]; if (v == null) { pen = false; continue; }
            var px = X(i).toFixed(1), py = Y(v).toFixed(1);
            d += (pen ? 'L' : 'M') + px + ' ' + py; pen = true;
          }
          if (it.fill && d) {
            var first = null, last = null;
            for (var i2 = a; i2 <= b; i2++) if (it.v[i2] != null) { if (first == null) first = i2; last = i2; }
            area = d + 'L' + X(last).toFixed(1) + ' ' + yb + 'L' + X(first).toFixed(1) + ' ' + yb + 'Z';
            parts.push('<path d="' + area + '" fill="' + it.fill + '" stroke="none"/>');
          }
          parts.push('<path d="' + d + '" fill="none" stroke="' + it.color + '" stroke-width="' + (it.w || 1.5) + '"' + (it.dash ? ' stroke-dasharray="' + it.dash + '"' : '') + ' stroke-linejoin="round" opacity="' + (it.op || 1) + '"/>');
          if (it.ghostFrom != null && it.ghostFrom <= b && it.ghostFrom - 1 >= a) {

            var g0 = it.ghostFrom - 1, g1 = it.ghostFrom;
            parts.push('<line x1="' + X(g0).toFixed(1) + '" y1="' + Y(it.v[g0]).toFixed(1) + '" x2="' + X(g1).toFixed(1) + '" y2="' + Y(it.v[g1]).toFixed(1) + '" stroke="' + C.bg + '" stroke-width="' + ((it.w || 1.5) + 0.6) + '"/>');
            parts.push('<line x1="' + X(g0).toFixed(1) + '" y1="' + Y(it.v[g0]).toFixed(1) + '" x2="' + X(g1).toFixed(1) + '" y2="' + Y(it.v[g1]).toFixed(1) + '" stroke="' + it.color + '" stroke-width="' + (it.w || 1.5) + '" stroke-dasharray="2 3"/>');
          }
        } else if (it.t === 'candles') {
          var bw = Math.max(1, Math.min(9, (PW - 8) / cnt * 0.62));
          for (var k = a; k <= b; k++) {
            if (it.c[k] == null) continue;
            var o = it.o[k], c = it.c[k], up = c >= o, col = up ? C.down : C.up, xx = X(k);
            var ghost = it.ghost != null && k >= it.ghost;
            parts.push('<line x1="' + xx.toFixed(1) + '" x2="' + xx.toFixed(1) + '" y1="' + Y(it.h[k]).toFixed(1) + '" y2="' + Y(it.l[k]).toFixed(1) + '" stroke="' + col + '" stroke-width="1"' + (ghost ? ' stroke-dasharray="2 2"' : '') + '/>');
            var yA = Y(Math.max(o, c)), yB = Y(Math.min(o, c));
            parts.push('<rect x="' + (xx - bw / 2).toFixed(1) + '" y="' + yA.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, yB - yA).toFixed(1) + '" fill="' + (ghost ? 'none' : col) + '" stroke="' + col + '" stroke-width="' + (ghost ? 1.2 : 0) + '"' + (ghost ? ' stroke-dasharray="2 2"' : '') + '/>');
          }
        } else if (it.t === 'dots') {
          it.idx.forEach(function (i) {
            if (i < a || i > b || it.v[i] == null) return;
            parts.push('<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(it.v[i]).toFixed(1) + '" r="' + (it.r || 3.5) + '" fill="' + it.color + '" stroke="' + C.bg + '" stroke-width="1.5"/>');
          });
        } else if (it.t === 'now') {
          var i = it.i; if (i < a || i > b || it.v[i] == null) return;
          var cx = X(i).toFixed(1), cy = Y(it.v[i]).toFixed(1);
          parts.push('<circle class="now-pulse" cx="' + cx + '" cy="' + cy + '" r="5" fill="rgba(179,157,219,.45)"/>');
          parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (it.hollow ? 3.6 : 4) + '" fill="' + (it.hollow ? C.bg : '#F3EEFF') + '" stroke="#fff" stroke-width="1.5"/>');
        } else if (it.t === 'tri') {
          it.idx.forEach(function (i) {
            if (i < a || i > b || it.v[i] == null) return;
            var x = X(i), y = Y(it.v[i]), s = 4.5;
            var pts = it.dir > 0 ? [x - s, y + s + 7, x + s, y + s + 7, x, y + 7 - s * 0.4] : [x - s, y - s - 7, x + s, y - s - 7, x, y - 7 + s * 0.4];
            parts.push('<polygon points="' + pts.map(function (q) { return q.toFixed(1); }).join(' ') + '" fill="' + it.color + '"/>');
          });
        }
      });
      edgeTags.forEach(function (t, ti) {
        var yy = t.up ? yt + 12 + ti * 12 : yb - 4 - ti * 12;
        parts.push('<text x="' + (PW - 4) + '" y="' + yy + '" fill="' + t.color + '" font-size="10.5" text-anchor="end" font-weight="600" opacity=".85">' + (t.up ? '↑ ' : '↓ ') + esc(t.txt) + '</text>');
      });
      y0 = yb + gap;
    });

    var H = y0 - gap + 20, labs = xLabels(spec.dates, a, b, PW);
    labs.forEach(function (L) {
      var x = X(L.i);
      parts.push('<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (H - 18) + '" y2="' + (H - 14) + '" stroke="' + C.muted + '"/>');
      parts.push('<text x="' + x.toFixed(1) + '" y="' + (H - 3) + '" fill="' + C.muted + '" font-size="11" text-anchor="middle">' + esc(L.t) + '</text>');
    });
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' + parts.join('') +
      '<line class="xh" x1="-10" x2="-10" y1="' + top + '" y2="' + (H - 18) + '" stroke="rgba(209,212,220,.45)" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect class="hit" x="0" y="0" width="' + PW + '" height="' + H + '" fill="transparent"/></svg>';
    el.innerHTML = svg;
    var s = el.querySelector('svg'), xh = el.querySelector('.xh');
    function at(ev) {
      var r = s.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
      var i = Math.round((px - 4) / (PW - 8) * cnt + a); return Math.max(a, Math.min(b, i));
    }
    function show(i) { xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); if (spec.onHover) spec.onHover(i); }
    function rest() { xh.setAttribute('x1', -10); xh.setAttribute('x2', -10); if (spec.onHover) spec.onHover(null); }
    s.addEventListener('pointermove', function (ev) { show(at(ev)); });
    s.addEventListener('pointerdown', function (ev) { show(at(ev)); });
    s.addEventListener('pointerleave', rest);
    rest();
  }

  function niceTicks(lo, hi, n) {
    var span = hi - lo; if (!(span > 0)) return [lo];
    var step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], t = Math.ceil(lo / step) * step;
    for (; t <= hi + 1e-9; t += step) out.push(+t.toFixed(6));
    return out;
  }

  function xLabels(dates, a, b, PW) {
    var span = (pd(dates[b]) - pd(dates[a])) / 864e5, out = [], maxN = Math.max(3, Math.floor(PW / 78)), lastX = -1e9;
    var mode = span > 365 * 3 ? 'y' : (span > 120 ? 'm' : 'd');
    var prevKey = null;
    for (var i = a; i <= b; i++) {
      var d = pd(dates[i]), key;
      if (mode === 'y') key = d.getUTCFullYear();
      else if (mode === 'm') key = d.getUTCFullYear() * 12 + d.getUTCMonth();
      else key = Math.floor((d.getTime() / 864e5 + 4) / 7);
      if (prevKey !== null && key !== prevKey) {
        var t = mode === 'y' ? String(d.getUTCFullYear()) : (mode === 'm' ? (d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()]) : MON[d.getUTCMonth()] + ' ' + d.getUTCDate());
        out.push({ i: i, t: t });
      }
      prevKey = key;
    }

    var keep = Math.ceil(out.length / maxN);
    if (keep > 1) {
      if (mode === 'y') { var step = keep; out = out.filter(function (L) { return (+L.t) % step === 0; }); }
      else out = out.filter(function (L, k) { return k % keep === 0; });
    }
    return out;
  }


  function dailyWindow() {
    var n = DATA.daily.d.length, b = n - 1;
    var a = RANGE === 'All' ? 0 : Math.max(0, n - RANGE_N[RANGE]);
    return [a, b];
  }
  function kWindow(tf) {
    var blk = DATA.tf[tf], n = blk.c.length, b = n - 1, a;
    if (KRANGE === 'Auto') a = Math.max(0, n - KAUTO[tf]);
    else if (KRANGE === 'All') a = 0;
    else {
      var end = pd(blk.d1[b]), start = new Date(end.getTime()); start.setUTCMonth(start.getUTCMonth() - KMONTHS[KRANGE]);
      a = 0; while (a < b && pd(blk.d1[a]) < start) a++;
      a = Math.min(a, Math.max(0, b - 11));
    }
    return [a, b];
  }


  function lastIdx() { return DATA.daily.d.length - 1; }
  function renderHero() {
    var D = DATA.daily, i = lastIdx(), v = D.c[i], prev = D.c[i - 1], p13 = D.p2013[i], p21 = D.p2021[i];
    var lab = DATA.open ? 'today so far' : 'last close';

    var pk = i; for (var j = Math.max(0, i - 29); j <= i; j++) if (D.c[j] > D.c[pk]) pk = j;
    var mv = pctChg(v, prev);
    var h = '<div class="hero-num"><span class="hero-k">' + lab + '</span> ' + f2(v) + '</div>' +
      '<div class="hero-date">' + fdate(D.d[i], true) + (DATA.open ? ' (so far)' : '') + '</div>' +
      '<p class="hero-move">' + (mv >= 0 ? '<span class="up">▲ ' : '<span class="down">▼ ') + sgn(mv) + '%</span> vs ' + f2(prev) + ' on ' + fdate(D.d[i - 1]).replace(/, \d+$/, '') + '</p>' +
      (DATA.fc && DATA.fc.cal_today ? '<p class="hero-cal">calendar-adjusted <b>' + sgn(DATA.fc.cal_today.adj) + '%</b>' + (DATA.open ? ' so far' : '') + ' (a ' + DATA.fc.cal_today.basis.replace('normal ', 'normal ') + ' is ' + sgn(DATA.fc.cal_today.normal) + '%)</p>' : '') +
      '<p class="hero-pct"><span class="hp-b">' + ord(p13) + ' percentile</span> since 2013 · <span class="hp-2">' + ord(p21) + ' since 2021</span></p>' +
      '<p class="hero-peak">recent peak ' + f2(D.c[pk]) + ' (' + fdate(D.d[pk]).replace(/, \d+$/, '') + ') = ' + ord(D.p2013[pk]) + '</p>' +
      gauge(p13, D.p2013[pk]);
    $('hero').innerHTML = h;
    var z = zoneOf(p13), L = DATA.lines['2013'].vix;
    $('zoneLine').innerHTML = '<span class="zw ' + z.cls + '">' + z.w + '</span> — VIX ' + f2(v) + ', ' + z.s + ' <span class="zone-key">(median since 2013 ' + f2(L['50']) + ' · 90th ' + f2(L['90']) + ' · 95th ' + f2(L['95']) + ' · 99th ' + f2(L['99']) + ')</span>';
  }

  function gauge(p, ppk) {
    var bands = [[0, 25, '#2B2440'], [25, 50, '#3A2E5C'], [50, 75, '#4E3A80'], [75, 90, '#6545A6'], [90, 95, '#7E57C2'], [95, 100, '#A280E0']];
    var g = '<div class="gauge" aria-hidden="true"><div class="g-labs">';
    var pn = Math.min(99.5, Math.max(0.5, p)), pp = Math.min(99.5, Math.max(0.5, ppk));
    var near = Math.abs(pn - pp) < 4;
    g += '<span class="g-lab g-lab-now" style="left:calc(' + pn + '% - 14px)">now ' + ord(p) + '</span>';
    if (!near) g += '<span class="g-lab g-lab-pk" style="left:calc(' + pp + '% - 14px)">peak ' + ord(ppk) + '</span>';
    g += '</div><span class="g-bar">';
    bands.forEach(function (bd) { g += '<span class="g-band" style="left:' + bd[0] + '%;width:' + (bd[1] - bd[0]) + '%;background:' + bd[2] + '"></span>'; });
    g += '<span class="g-m g-m-pk' + (near ? ' g-m-near' : '') + '" style="left:' + pp + '%"></span><span class="g-m g-m-now" style="left:' + pn + '%"></span></span>';
    g += '<div class="g-ticks">';
    [0, 25, 50, 75, 90, 99].forEach(function (t) { g += '<span class="g-t" style="left:calc(' + t + '% - ' + (t > 90 ? 12 : t ? 6 : 0) + 'px)">' + t + '</span>'; });
    g += '</div><span class="g-cap">percentile since 2013 · deeper purple = rarer</span></div>';
    return g;
  }

  function renderMain() {
    var D = DATA.daily, w = dailyWindow(), a = w[0], b = w[1], L = DATA.lines['2013'].vix;
    document.querySelectorAll('#vix [data-span], #ts [data-span]').forEach(function (e) { e.textContent = RANGE_WORD[RANGE]; });
    var ghost = DATA.open ? lastIdx() : null;
    drawChart($('c1'), {
      dates: D.d, a: a, b: b,
      panes: [
        { h: 120, label: PX_LAB[PX], fmt: function (t) { return t >= 1000 ? (t / 1000).toFixed(1) + 'k' : t; },
          items: [{ t: 'line', v: pxD(D), color: C.spy, w: 1.3, ghostFrom: ghost },
            { t: 'dots', idx: DATA.peaks, v: pxD(D), color: C.pk, r: 3.2 },
            { t: 'now', i: lastIdx(), v: pxD(D), hollow: DATA.open }] },
        { h: 230, label: 'VIX', floor: 0, fmt: function (t) { return t; },
          items: [
            { t: 'hline', y: L['50'], color: C.muted, dash: '1 3', label: 'median ' + f1(L['50']) },
            { t: 'hline', y: L['90'], color: C.pl, dash: '4 3', label: '90th · ' + f1(L['90']), tag: '90th ' + f1(L['90']), op: 0.8 },
            { t: 'hline', y: L['95'], color: C.pl, dash: '4 3', label: '95th · ' + f1(L['95']), tag: '95th ' + f1(L['95']), op: 0.9 },
            { t: 'hline', y: L['99'], color: '#D7B8FF', dash: '4 3', label: '99th · ' + f1(L['99']), tag: '99th ' + f1(L['99']) },
            { t: 'line', v: D.c, color: C.vix, w: 1.6, fill: 'rgba(126,87,194,.22)', ghostFrom: ghost },
            { t: 'dots', idx: DATA.peaks, v: D.c, color: C.pk, r: 3.6 },
            { t: 'now', i: lastIdx(), v: D.c, hollow: DATA.open }] }
      ],
      onHover: function (i) { readout1(i == null ? lastIdx() : i, i == null); }
    });
    $('lg1').innerHTML = '<span class="lg-i"><span class="lg-spy"></span>' + PX + '</span><span class="lg-i"><span class="lg-vix"></span>VIX close</span>' +
      '<span class="lg-i"><span class="lg-pl"></span>90th / 95th / 99th percentile since 2013</span><span class="lg-i"><span class="lg-pk"></span>spike peak</span>' +
      '<span class="lg-i"><span class="lg-now"></span>now</span>';
  }

  function readout1(i, resting) {
    var D = DATA.daily, so = DATA.open && i === lastIdx();
    var mv = i > 0 ? pctChg(D.c[i], D.c[i - 1]) : null, P = pxD(D), sm = i > 0 ? pctChg(P[i], P[i - 1]) : null;
    var h = '<span class="d">' + fdate(D.d[i], true) + (so ? ' (so far)' : '') + '</span> · VIX <span class="vx">' + f2(D.c[i]) + '</span>' +
      (mv != null ? ' <span class="' + (mv >= 0 ? 'hot' : 'cool') + '">' + sgn(mv) + '%</span>' : '') +
      ' · <span class="pc">' + ord(D.p2013[i]) + ' percentile</span> since 2013 (' + ord(D.p2021[i]) + ' since 2021)' +
      (D.v3m[i] != null ? ' · VIX3M <span class="r3">' + f2(D.v3m[i]) + '</span> · ratio <span class="rr">' + (D.ratio[i] != null ? D.ratio[i].toFixed(3) : '–') + '</span>' : '') +
      ' · ' + PX + ' ' + f2(P[i]) + (sm != null ? ' <span class="' + (sm >= 0 ? 'up' : 'down') + '">' + sgn(sm, 2) + '%</span>' : '') +
      (DATA.peaks.indexOf(i) >= 0 ? ' · <span class="pk">spike peak</span>' : '') +
      (resting ? ' <span class="muted">· hover the chart for any day</span>' : '');
    $('ro1').innerHTML = h;
  }


  var EMH = 5, VPT = 'm1', FCWIN = { em: 'Auto', vp: 'Auto' };
  var FC_AUTO = { 5: '6M', 21: '1Y', 63: '2Y', vp: '2Y' };
  function fcWindow(which, n) {
    var w = FCWIN[which] === 'Auto' ? (which === 'vp' ? FC_AUTO.vp : FC_AUTO[EMH]) : FCWIN[which];
    return w === 'All' ? 0 : Math.max(0, n - RANGE_N[w]);
  }
  var H_WORD = { 5: 'week', 21: 'month', 63: '3 months' }, H_NEXT = { 5: 'Next week', 21: 'Next month', 63: 'Next 3 months' };
  function px0(x) { return x == null ? '–' : (x >= 1000 ? Math.round(x).toLocaleString() : Math.round(x).toString()); }
  function pc1(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%'; }
  function pWhole(p) { return p == null ? '–' : (p < 1 ? p.toFixed(1) : Math.round(p)) + '%'; }
  function futureDates(last, m) {
    var out = [], d = pd(last);
    while (out.length < m) { d = new Date(d.getTime() + 864e5); var w = d.getUTCDay(); if (w && w < 6) out.push(d.toISOString().slice(0, 10)); }
    return out;
  }
  function sinceShort(d) { return fdate(d).replace(/, \d+$/, ''); }
  function lastClosedIdx() { return DATA.open ? lastIdx() - 1 : lastIdx(); }


  function codeShares(codes, i0, i1, keys) {
    var n = 0, c = {};
    keys.forEach(function (k) { c[k] = 0; });
    for (var i = Math.max(0, i0); i <= i1 && i < codes.length; i++) { var ch = codes.charAt(i); if (ch === '-') continue; n++; if (c[ch] != null) c[ch]++; }
    return { n: n, c: c };
  }
  function idxFrom(dateStr) { var D = DATA.daily.d, k = 0; while (k < D.length && D[k] < dateStr) k++; return k; }

  function relStrip(title, rows, fmtLab) {
    if (!rows || !rows.length) return '';
    var h = '<div class="rel"><h3>' + title + '</h3>';
    rows.forEach(function (r) {
      h += '<div class="rel-row"><span>' + fmtLab(r) + '<br><span style="font-size:10.5px">' + r[2].toLocaleString() + ' days</span></span>' +
        '<span class="rel-bars"><span class="rf" style="width:' + Math.min(100, r[3]) + '%"></span><span class="rh" style="width:' + Math.min(100, r[4]) + '%"></span></span>' +
        '<span class="rv">' + Math.round(r[4]) + '%</span></div>';
    });
    h += '<div class="rel-key"><span><i style="background:rgba(179,157,219,.85)"></i>what it said (average)</span><span><i style="background:rgba(242,176,75,.9)"></i>how often it happened</span></div></div>';
    return h;
  }

  function renderEM() {
    var FC = DATA.fc, B = FC.em[PX], h = EMH, now = B.now['h' + h], was = B.was ? B.was['h' + h] : null;
    var D = DATA.daily, n = D.d.length, P = pxD(D), so = DATA.open;
    document.querySelectorAll('#emTabs button').forEach(function (x) { x.setAttribute('aria-pressed', +x.getAttribute('data-h') === h ? 'true' : 'false'); });
    function rng(o, lv) { return [o.close * (1 + o.b[lv][0] / 100), o.close * (1 + o.b[lv][1] / 100)]; }
    var r90 = rng(now, '90'), r68 = rng(now, '68');
    var hd = '<div class="fc-head"><div class="fc-main"><div class="fc-k">' + H_NEXT[h] + ' · ' + PX + (so ? ' · if it closes here' : '') + '</div>' +
      '<div class="fc-range">' + px0(r90[0]) + ' – ' + px0(r90[1]) + '<span class="pc">' + pc1(now.b['90'][0]) + ' / ' + pc1(now.b['90'][1]) + '</span></div>' +
      '<p class="fc-line"><b>nine times in ten</b> · two times in three: <b>' + px0(r68[0]) + ' – ' + px0(r68[1]) + '</b></p>' +
      '<p class="fc-line">±' + now.move.toFixed(1) + '% is a normal ' + H_WORD[h] + ' right now</p>' +
      (was ? '<p class="fc-was">At the ' + sinceShort(D.d[n - 2]) + ' close: ' + px0(was.close * (1 + was.b['90'][0] / 100)) + ' – ' + px0(was.close * (1 + was.b['90'][1] / 100)) + ' (±' + was.move.toFixed(1) + '%)</p>' : '') +
      '</div><div class="fc-side">';
    if (h === 5) {
      hd += '<div class="fc-k">Chance of at least one −2% day in the next 5 sessions</div><div class="fc-big' + (B.now.p2 >= 15 ? ' hot' : '') + '">' + pWhole(B.now.p2) + '</div>' +
        (B.was ? '<p>was ' + pWhole(B.was.p2) + ' at the ' + sinceShort(D.d[n - 2]) + ' close' + (so ? ' · if it closes here' : '') + '</p>' : '');
    } else if (h === 21) {
      var F21 = B.facts['2021'], F13 = B.facts['2013'];
      hd += '<div class="fc-k">Base rates for a month</div>' +
        '<p>Next month\'s swing came in under what the ' + (PX === 'QQQ' ? 'VXN' : 'VIX') + ' priced on <b>' + Math.round(F21.rv_below_iv) + '%</b> of days since 2021 (' + Math.round(F13.rv_below_iv) + '% since 2013).</p>' +
        '<p>A month later ' + PX + ' closed 5%+ lower on <b>' + F21.m5.toFixed(1) + '%</b> of days since 2021 (' + F13.m5.toFixed(1) + '% since 2013); 7%+ lower on <b>' + F21.m7.toFixed(1) + '%</b> (' + F13.m7.toFixed(1) + '%).</p>';
    } else {
      hd += '<div class="fc-k">3 months</div><p>±' + now.move.toFixed(1) + '% is a normal quarter at today\'s ' + (B.now.from === 'QQQ' ? 'VXN' : 'VIX') + '. The 3-month range widens or narrows as the VIX moves.</p>';
    }
    hd += '</div></div>';
    $('emBody').innerHTML = hd;


    var band = B.band[h], out = B.out[h], fut = futureDates(D.d[n - 1], h), dates = D.d.concat(fut);
    var a = Math.max(fcWindow('em', n), idxFrom('2013-01-01') + h), b = n - 1 + h;
    var lo = [], hi = [], dB = [], dA = [];
    for (var j = Math.max(a, h); j < n; j++) {
      var i = j - h;
      if (band.lo90[i] == null || P[i] == null) continue;
      lo[j] = P[i] * (1 + band.lo90[i] / 100); hi[j] = P[i] * (1 + band.hi90[i] / 100);
      var ch = out.charAt(i);
      if (ch === '2') dB.push(j); else if (ch === '3') dA.push(j);
    }
    drawChart($('cEm'), {
      dates: dates, a: a, b: b,
      panes: [{ h: 230, label: PX_LAB[PX], fmt: function (t) { return t >= 1000 ? (t / 1000).toFixed(1) + 'k' : t; },
        items: [
          { t: 'range', lo: lo, hi: hi, fill: 'rgba(179,157,219,.20)' },
          { t: 'line', v: P, color: C.spy, w: 1.4, ghostFrom: so ? n - 1 : null },
          { t: 'dots', idx: dB, v: P, color: C.down, r: 3 },
          { t: 'dots', idx: dA, v: P, color: C.up, r: 3 },
          { t: 'bar', i: b, lo: r90[0], hi: r90[1], lo2: r68[0], hi2: r68[1] },
          { t: 'now', i: n - 1, v: P, hollow: so }] }],
      onHover: function (k) { emReadout(k == null ? n - 1 : k, k == null, lo, hi, out, h, dates); }
    });
    $('lgEm').innerHTML = '<span class="lg-i"><span class="lg-spy"></span>' + PX + '</span><span class="lg-i"><span class="lg-band"></span>nine-in-ten range made ' + (h === 63 ? '3 months' : 'a ' + H_WORD[h]) + ' before each date</span>' +
      '<span class="lg-i"><span class="lg-dotr"></span>finished below</span><span class="lg-i"><span class="lg-dotg"></span>finished above</span><span class="lg-i"><span class="lg-bar"></span>today\'s range for ' + sinceShort(fut[fut.length - 1]) + ' (two-in-three inside)</span>';

    var lastI = n - 1 - h, k0 = Math.max(0, a - h);
    var wv = codeShares(out, k0, lastI, ['0', '1', '2', '3']), s21 = codeShares(out, idxFrom('2021-01-01'), n, ['0', '1', '2', '3']), s13 = codeShares(out, idxFrom('2013-01-01'), n, ['0', '1', '2', '3']);
    function held(s) { return s.n ? Math.round(100 * (s.c['0'] + s.c['1']) / s.n) : null; }
    function below(s) { return s.n ? (100 * s.c['2'] / s.n).toFixed(1) : null; }
    function held68(s) { return s.n ? Math.round(100 * s.c['0'] / s.n) : null; }
    $('emTrack').innerHTML = (wv.n ? 'In view: the nine-in-ten range held <b>' + held(wv) + '%</b> of ' + (h === 63 ? '3-month spans' : H_WORD[h] + 's') + ' (' + wv.n.toLocaleString() + ' ranges); ' + PX + ' finished below it ' + below(wv) + '% of the time, two-in-three held ' + held68(wv) + '%. ' : '') +
      'Since 2021: held <b>' + held(s21) + '%</b>, below ' + below(s21) + '%. Since 2013: held <b>' + held(s13) + '%</b>, below ' + below(s13) + '%.';
    $('emRel').innerHTML = h === 5 ? relStrip('How the −2% day chance has scored since 2021', B.p2rel['2021'].filter(function (r) { return r[2] >= 30; }), function (r) { return r[1] > 100 ? 'said ' + r[0] + '%+' : 'said ' + r[0] + '–' + r[1] + '%'; }) : '';
  }

  function emReadout(k, resting, lo, hi, out, h, dates) {
    var D = DATA.daily, P = pxD(D), n = D.d.length;
    if (k >= n) {
      var B = DATA.fc.em[PX], o = B.now['h' + h];
      $('roEm').innerHTML = '<span class="d">' + fdate(dates[k], true) + '</span> · today\'s nine-in-ten range for ' + H_WORD[h] + ' ahead: <span class="vx">' + px0(o.close * (1 + o.b['90'][0] / 100)) + ' – ' + px0(o.close * (1 + o.b['90'][1] / 100)) + '</span>';
      return;
    }
    var ch = k - h >= 0 ? out.charAt(k - h) : '-';
    var res = ch === '2' ? ' · <span class="hot">finished below</span>' : ch === '3' ? ' · <span class="cool">finished above</span>' : (ch === '0' || ch === '1') ? ' · inside' : '';
    $('roEm').innerHTML = '<span class="d">' + fdate(D.d[k], true) + (DATA.open && k === n - 1 ? ' (so far)' : '') + '</span> · ' + PX + ' ' + f2(P[k]) +
      (lo[k] != null ? ' · range made ' + sinceShort(D.d[k - h]) + ': ' + px0(lo[k]) + ' – ' + px0(hi[k]) + res : '') +
      (resting ? ' <span class="muted">· hover for any day</span>' : '');
  }

  function renderVP() {
    var V = DATA.fc.vp, now = V.now, was = V.was, D = DATA.daily, n = D.d.length, so = DATA.open;
    document.querySelectorAll('#vpTabs button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-t') === VPT ? 'true' : 'false'); });
    var hd = '<div class="fc-head"><div class="fc-main"><div class="fc-k">In a month' + (so ? ' · if it closes here' : '') + '</div>' +
      '<div class="fc-range">' + now.m1[0].toFixed(1) + ' – ' + now.m1[1].toFixed(1) + '<span class="pc">8 times in 10</span></div>' +
      '<p class="fc-line">Chance the VIX is higher than today (' + now.vix.toFixed(2) + '): <b>' + Math.round(100 * now.p_up_m1) + '%</b></p>' +
      (was ? '<p class="fc-was">At the ' + sinceShort(D.d[n - 2]) + ' close (VIX ' + was.vix.toFixed(2) + '): ' + was.m1[0].toFixed(1) + ' – ' + was.m1[1].toFixed(1) + ', higher ' + Math.round(100 * was.p_up_m1) + '%</p>' : '') +
      '<div class="fc-chips"><span class="fc-chip">1 week: <b>' + now.w1[0].toFixed(1) + ' – ' + now.w1[1].toFixed(1) + '</b> · higher ' + Math.round(100 * now.p_up_w1) + '%</span>' +
      '<span class="fc-chip">1 month: <b>' + now.m1[0].toFixed(1) + ' – ' + now.m1[1].toFixed(1) + '</b> · higher ' + Math.round(100 * now.p_up_m1) + '%</span>' +
      '<span class="fc-chip">3 months: higher <b>' + Math.round(100 * now.p_up_q1) + '%</b></span></div></div>' +
      '<div class="fc-side"><div class="fc-k">Long-run level</div><div class="fc-big">' + now.long_run_level.toFixed(1) + '</div>' +
      '<p>The VIX drifts back toward about ' + now.long_run_level.toFixed(1) + '; half of any gap usually closes in ' + now.gap_half + '.</p></div></div>';
    $('vpBody').innerHTML = hd;
    var hz = VPT === 'm1' ? 21 : 5, q = V.q, out = V.out[VPT];
    var far = 21, fut = futureDates(D.d[n - 1], far), dates = D.d.concat(fut);
    var a = Math.max(fcWindow('vp', n), idxFrom('2008-01-01') + hz), b = n - 1 + far;
    var lo = [], hi = [], dB = [], dA = [];
    for (var j = Math.max(a, hz); j < n; j++) {
      var i = j - hz;
      if (q[VPT + 'lo'][i] == null) continue;
      lo[j] = q[VPT + 'lo'][i]; hi[j] = q[VPT + 'hi'][i];
      var ch = out.charAt(i);
      if (ch === 'b') dB.push(j); else if (ch === 'a') dA.push(j);
    }
    drawChart($('cVp'), {
      dates: dates, a: a, b: b,
      panes: [{ h: 230, label: 'VIX', floor: 0, fmt: function (t) { return t; },
        items: [
          { t: 'range', lo: lo, hi: hi, fill: 'rgba(179,157,219,.20)' },
          { t: 'hline', y: now.long_run_level, color: C.pk, dash: '5 4', label: 'long-run level ' + now.long_run_level.toFixed(1), op: 0.8, left: true },
          { t: 'line', v: D.c, color: C.vix, w: 1.5, ghostFrom: so ? n - 1 : null },
          { t: 'dots', idx: dA, v: D.c, color: C.down, r: 3 },
          { t: 'dots', idx: dB, v: D.c, color: C.up, r: 3 },
          { t: 'bar', i: n - 1 + 5, lo: now.w1[0], hi: now.w1[1] },
          { t: 'bar', i: n - 1 + 21, lo: now.m1[0], hi: now.m1[1] },
          { t: 'now', i: n - 1, v: D.c, hollow: so }] }],
      onHover: function (k) { vpReadout(k == null ? n - 1 : k, k == null, lo, hi, out, hz, dates); }
    });
    $('lgVp').innerHTML = '<span class="lg-i"><span class="lg-vix"></span>VIX</span><span class="lg-i"><span class="lg-band"></span>8-in-10 range made ' + (hz === 21 ? 'a month' : 'a week') + ' before each date</span>' +
      '<span class="lg-i"><span class="lg-dotr"></span>finished above</span><span class="lg-i"><span class="lg-dotg"></span>finished below</span><span class="lg-i"><span class="lg-bar"></span>today\'s 1-week and 1-month ranges</span><span class="lg-i"><span class="lg-flip"></span>long-run level</span>';
    var lastI = n - 1 - hz, k0 = Math.max(0, a - hz);
    var wv = codeShares(out, k0, lastI, ['i', 'b', 'a']), s21 = codeShares(out, idxFrom('2021-01-01'), n, ['i', 'b', 'a']), s13 = codeShares(out, idxFrom('2013-01-01'), n, ['i', 'b', 'a']);
    function ins(s) { return s.n ? Math.round(100 * s.c.i / s.n) : null; }
    $('vpTrack').innerHTML = (wv.n ? 'In view: the 8-in-10 range caught <b>' + ins(wv) + '%</b> (' + wv.n.toLocaleString() + ' ranges; above it ' + Math.round(100 * wv.c.a / wv.n) + '%, below ' + Math.round(100 * wv.c.b / wv.n) + '%). ' : '') +
      'Since 2021: <b>' + ins(s21) + '%</b>. Since 2013: <b>' + ins(s13) + '%</b>.';
    $('vpRel').innerHTML = relStrip('How the 1-month "higher than today" chance has scored since 2021', V.rel_m1['2021'].filter(function (r) { return r[2] >= 30; }), function (r) { return 'said ' + r[0] + '–' + Math.min(100, r[1]) + '%'; });
  }

  function vpReadout(k, resting, lo, hi, out, hz, dates) {
    var D = DATA.daily, n = D.d.length, V = DATA.fc.vp;
    if (k >= n) {
      var tag = k - (n - 1) >= 21 ? 'm1' : 'w1';
      $('roVp').innerHTML = '<span class="d">' + fdate(dates[k], true) + '</span> · today\'s 8-in-10 range' + (k - (n - 1) === 5 || k - (n - 1) === 21 ? '' : ' (nearest)') + ': <span class="vx">' + V.now[tag][0].toFixed(1) + ' – ' + V.now[tag][1].toFixed(1) + '</span>';
      return;
    }
    var ch = k - hz >= 0 ? out.charAt(k - hz) : '-';
    var res = ch === 'a' ? ' · <span class="hot">finished above</span>' : ch === 'b' ? ' · <span class="cool">finished below</span>' : ch === 'i' ? ' · inside' : '';
    $('roVp').innerHTML = '<span class="d">' + fdate(D.d[k], true) + (DATA.open && k === n - 1 ? ' (so far)' : '') + '</span> · VIX <span class="vx">' + f2(D.c[k]) + '</span>' +
      (lo[k] != null ? ' · range made ' + sinceShort(D.d[k - hz]) + ': ' + lo[k].toFixed(1) + ' – ' + hi[k].toFixed(1) + res : '') + (resting ? ' <span class="muted">· hover for any day</span>' : '');
  }

  var TAGW = { FOMC: ['Fed decision', 'mac'], CPI: ['CPI', 'mac'], NFP: ['Jobs report', 'mac'], OPEX: ['Monthly options expiry', ''], VIXEXP: ['VIX expiry', ''],
    PREHOL: ['Day before a holiday', 'hol'], POSTHOL: ['First day after a holiday', 'hol'] };
  function renderCal() {
    var FC = DATA.fc, rows = FC.cal, ph = FC.posthol;
    var h = '<div class="cal-wrap"><table class="cal-t"><thead><tr><th>Session</th><th>What</th><th><span class="t-long">Normal VIX move</span><span class="t-short">VIX move</span></th><th><span class="t-long">VIX falls</span><span class="t-short">Falls</span></th><th><span class="t-long">Typical SPY move</span><span class="t-short">SPY ±</span></th><th class="wide-only">Basis</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var hol = r.types.indexOf('PREHOL') >= 0 || r.types.indexOf('POSTHOL') >= 0;
      var what = r.types.length ? r.types.map(function (t, k) { var tw = TAGW[t] || [t, '']; return '<span class="tag ' + tw[1] + '">' + tw[0] + '</span>' + (r.time[k] && /ET/.test(r.time[k]) ? '<span class="muted cal-time">' + r.time[k] + '</span>' : ''); }).join('<br>') : '<span class="muted">next session</span>';
      if (r.detail.some(function (x) { return /early close/i.test(x); })) what += '<br><span class="muted">1 pm close</span>';
      h += '<tr' + (hol ? ' class="hol"' : '') + '><td>' + fdate(r.date, true).replace(/, \d+$/, '') + '</td><td>' + what + '</td>' +
        '<td class="' + (r.vix >= 1 ? 'up' : r.vix <= -1 ? 'dn' : '') + '">' + pc1(r.vix) + '</td><td>' + Math.round(r.down) + '%</td><td>±' + r.spy.toFixed(2) + '%</td><td class="wide-only muted">' + r.basis + '</td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<p class="track">After market holidays the VIX rose on <b>' + ph['2021'][0] + ' of ' + ph['2021'][1] + '</b> sessions since 2021 (' + Math.round(100 * ph['2021'][0] / ph['2021'][1]) + '%; ' + Math.round(100 * ph['2013'][0] / ph['2013'][1]) + '% since 2013); on an ordinary day it rises about ' + Math.round(ph['2021'][2]) + '% of the time. Holiday eves are the quietest sessions for SPY.</p>';
    $('calBody').innerHTML = h;
  }


  var OBASE = '2013';
  function pctTxt(x) { return x == null ? '–' : Math.round(x) + '%'; }
  function retTxt(x) { return x == null ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%'; }
  function riskCls(x, base) { if (x == null || base == null) return ''; return x >= base * 1.25 ? 'hi' : (x <= base * 0.8 ? 'lo' : ''); }
  function retCls(x, base) { if (x == null || base == null) return ''; return x >= base + 1 ? 'pos' : (x <= base - 1 ? 'neg' : ''); }

  function actState(O, B) {

    if (DATA.state) return DATA.state;
    var t = O.today, x = B.both.days >= 30 ? B.both : B.vix[t.vb], all = B.all;
    var hot = t.vb >= 5 || t.rb >= 5, warm = t.vb === 4 || t.rb === 4, calm = t.vb <= 1;
    var p2 = DATA.fc ? DATA.fc.em[PX].now.p2 : null;
    var nums = (p2 != null ? 'chance of a −2% ' + PX + ' day within a week ' + pWhole(p2) + ' (see "How far ' + PX + ' could move"); ' : '') +
      'a 5% dip within a month followed ' + pctTxt(x.S3) + ' of days like today (' + pctTxt(all.S3) + ' of all days); ' + PX + ' 3 months later ' + retTxt(x.med63) + ' median (' + retTxt(all.med63) + ').';
    if (hot) return { k: 'Stress band', v: 'Opportunity, but bumpy', cls: 'buy', why: 'The VIX is in its top band or the curve is inverted: ' + nums };
    if (warm) return { k: 'Turbulence band', v: 'Caution: rougher than usual', cls: 'caution', why: 'Not a stress reading yet: ' + nums };
    if (calm) return { k: 'Calm band', v: 'Calm: fear is cheap', cls: '', why: 'Big % jumps in the VIX are common from here but start from a low base: ' + nums };
    return { k: 'Normal band', v: 'Normal', cls: '', why: nums };
  }

  function renderAct() {
    var O = ODDS(), el = $('actBody');
    if (!O) { el.innerHTML = '<div class="act-wait">No odds table in this build.</div>'; return; }
    var B = O[OBASE], t = O.today, v = B.vix[t.vb], r = B.ratio[t.rb], both = B.both, all = B.all;
    var st = actState(O, B), D = DATA.daily, i = lastIdx();
    var h = '<div class="controls"><div class="seg" role="group" aria-label="History used" id="obase">' +
      '<button type="button" data-ob="2013" aria-pressed="' + (OBASE === '2013') + '">Since 2013</button><button type="button" data-ob="2021" aria-pressed="' + (OBASE === '2021') + '">Since 2021</button></div></div>';
    h += '<div class="act-grid"><div>';
    h += '<div class="act-state"><div class="as-k">' + esc(st.k) + ' · VIX ' + f2(D.c[i]) + ' (' + O.vlab[t.vb] + ' pct) · VIX÷VIX3M ' + D.ratio[i].toFixed(3) + '</div>' +
      '<div class="as-v ' + st.cls + '">' + esc(st.v) + '</div><p class="as-why">' + st.why + '</p></div>';
    var cols = [['Days like today', both, 'VIX ' + O.vlab[t.vb] + ' and ratio ' + O.rlab[t.rb]], ['VIX band', v, O.vlab[t.vb] + ' pct'], ['Curve band', r, 'ratio ' + O.rlab[t.rb]], ['All days', all, 'every day']];
    h += '<table class="odds"><thead><tr><th>Within the next…</th>' + cols.map(function (c) { return '<th>' + c[0] + '<span class="vs">' + esc(c[2]) + '</span></th>'; }).join('') + '</tr></thead><tbody>';
    function rowRisk(lab, key) {
      h += '<tr><td>' + lab + '</td>' + cols.map(function (c, k) { var x = c[1][key]; return '<td class="' + (k < 3 ? riskCls(x, all[key]) : '') + '">' + pctTxt(x) + '</td>'; }).join('') + '</tr>';
    }
    function rowRet(lab, hz) {
      h += '<tr><td>' + lab + '</td>' + cols.map(function (c, k) { var x = c[1]['med' + hz], u = c[1]['up' + hz]; return '<td class="' + (k < 3 ? retCls(x, all['med' + hz]) : '') + '">' + retTxt(x) + '<span class="vs">' + (u == null ? '' : Math.round(u) + '% up') + '</span></td>'; }).join('') + '</tr>';
    }
    rowRisk('month: VIX jumps 30%+', 'S1');
    if (D.c[i] < 20) rowRisk('month: VIX closes 25+', 'S2');
    rowRisk('month: ' + PX + ' dips 5%+', 'S3');
    rowRet('month: ' + PX + ' (median)', 21);
    rowRet('3 months: ' + PX + ' (median)', 63);
    rowRet('6 months: ' + PX + ' (median)', 126);
    h += '</tbody></table>';
    h += '<p class="act-note">Closed days ' + (OBASE === '2013' ? 'since 2013' : 'since 2021') + ' · days like today: ' + both.days + ' days in ' + both.episodes + ' separate stretches · VIX band ' + v.days + ' days · scored through ' + fdate(O.last_scored) + ' · bought at the next close · <span style="color:#FF8A80">red</span> = 25%+ more often than an average day, <span style="color:#80CBC4">teal</span> = 20%+ less often</p>';

    var dd = B.dd, tdb = O.today.db;
    h += '<h3 class="mini-h dd-h">By how far ' + PX + ' is below its 1-year high <span class="muted">· now ' + O.today.dd.toFixed(1) + '% off</span></h3>';
    h += '<table class="odds odds-dd"><thead><tr><th>Off the high</th><th>Dips 5%+<span class="vs">within a month</span></th><th>3 months<span class="vs">median · % up</span></th><th>Worst dip<span class="vs">in 3 months</span></th><th>12 months<span class="vs">median</span></th></tr></thead><tbody>';
    O.dlab.forEach(function (lab, k) {
      var x = dd[k], today = k === tdb;
      h += '<tr' + (today ? ' class="today"' : '') + '><td>' + lab + (today ? ' <b class="now-tag">now</b>' : '') + '<span class="vs">' + x.days + ' days · ' + x.episodes + ' stretches</span></td>' +
        '<td class="' + riskCls(x.S3, all.S3) + '">' + pctTxt(x.S3) + '</td>' +
        '<td class="' + retCls(x.med63, all.med63) + '">' + retTxt(x.med63) + '<span class="vs">' + (x.up63 == null ? '' : Math.round(x.up63) + '% up') + '</span></td>' +
        '<td>' + retTxt(x.dip63) + '</td><td>' + retTxt(x.med252) + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '</div><div><h3 class="mini-h">The trade-off by VIX band</h3><div class="chart" id="ladder"></div><p class="legend" id="lgLadder"></p></div></div>';
    el.innerHTML = h;
    el.querySelectorAll('#obase button').forEach(function (bt) {
      bt.addEventListener('click', function () { OBASE = bt.getAttribute('data-ob'); renderAct(); });
    });
    renderLadder();
  }

  function renderLadder() {
    var O = ODDS(), B = O[OBASE], el = $('ladder'), W = Math.max(260, el.clientWidth || 320);
    var rowH = 34, top = 22, H = top + O.vlab.length * rowH + 8, mid = Math.round(W * 0.5), lab = 74;
    var maxRisk = 60, maxRet = 20;
    var p = [];
    p.push('<text x="' + (mid - 6) + '" y="12" fill="' + C.down + '" font-size="11" font-weight="700" text-anchor="end">' + PX + ' dips 5%+ in a month</text>');
    p.push('<text x="' + (mid + 6) + '" y="12" fill="' + C.up + '" font-size="11" font-weight="700">' + PX + ' 3 months later</text>');
    O.vlab.forEach(function (L, k) {
      var row = B.vix[k], y = top + k * rowH, today = k === O.today.vb;
      if (today) p.push('<rect x="0" y="' + (y - 2) + '" width="' + W + '" height="' + (rowH - 2) + '" fill="rgba(126,87,194,.18)" stroke="' + C.fear + '" rx="4"/>');
      p.push('<text x="4" y="' + (y + 13) + '" fill="' + (today ? C.white : C.muted) + '" font-size="11" font-weight="' + (today ? 700 : 500) + '">' + esc(L) + '</text>');
      p.push('<text x="4" y="' + (y + 26) + '" fill="' + C.muted + '" font-size="10">' + (k === 0 ? 'VIX < ' + O.vcut[0].toFixed(1) : k === O.vlab.length - 1 ? 'VIX ≥ ' + O.vcut[k - 1].toFixed(1) : O.vcut[k - 1].toFixed(1) + '–' + O.vcut[k].toFixed(1)) + (today ? ' · today' : '') + '</text>');
      var rw = row.S3 == null ? 0 : Math.min(1, row.S3 / maxRisk) * (mid - lab - 10);
      var gw = row.med63 == null ? 0 : Math.min(1, Math.max(0, row.med63) / maxRet) * (W - mid - 40);
      p.push('<rect x="' + (mid - 4 - rw).toFixed(1) + '" y="' + (y + 6) + '" width="' + rw.toFixed(1) + '" height="16" fill="rgba(239,83,80,.75)" rx="2"/>');
      p.push('<text x="' + (mid - 8 - rw).toFixed(1) + '" y="' + (y + 18) + '" fill="' + C.text + '" font-size="11" text-anchor="end">' + pctTxt(row.S3) + '</text>');
      p.push('<rect x="' + (mid + 4) + '" y="' + (y + 6) + '" width="' + gw.toFixed(1) + '" height="16" fill="rgba(38,166,154,.75)" rx="2"/>');
      p.push('<text x="' + (mid + 8 + gw).toFixed(1) + '" y="' + (y + 18) + '" fill="' + C.text + '" font-size="11">' + retTxt(row.med63) + '</text>');
    });
    p.push('<line x1="' + mid + '" x2="' + mid + '" y1="' + (top - 4) + '" y2="' + (H - 4) + '" stroke="' + C.line + '"/>');
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + p.join('') + '</svg>';
    $('lgLadder').className = 'act-note'; $('lgLadder').innerHTML = 'Each row = closed days ' + (OBASE === '2013' ? 'since 2013' : 'since 2021') + ' with the VIX in that band (percentile of all days since 2013). Higher VIX: rougher next month, better next 3 months.';
  }


  function renderTS() {
    var D = DATA.daily, i = lastIdx(), r = D.ratio[i], rp = D.rp2013[i], w = dailyWindow(), a = w[0], b = w[1];
    var RL = DATA.lines['2013'].ratio, ghost = DATA.open ? i : null;
    var back = r >= 1;
    $('hero3').innerHTML = '<div class="hero-num small"><span class="hero-k">VIX ÷ VIX3M</span> ' + r.toFixed(3) + '</div>' +
      '<p class="hero-pct"><span class="hp-b">' + ord(rp) + ' percentile</span> since 2013 · ' + (back ? '<b style="color:var(--down)">backwardation</b>' : 'contango (normal)') + '</p>' +
      '<p class="hero-peak">VIX9D ÷ VIX ' + (D.r9[i] != null ? D.r9[i].toFixed(3) : '–') + ' · VVIX ' + f2(D.vvix[i]) + ' (' + ord(D.vvp2013[i]) + ')</p>';
    drawChart($('c3'), {
      dates: D.d, a: a, b: b,
      panes: [
        { h: 200, label: 'VIX ÷ VIX3M', fmt: function (t) { return t.toFixed(2); },
          items: [
            { t: 'band', y0: 1, y1: 9, fill: 'rgba(239,83,80,.10)' },
            { t: 'hline', y: 1, color: C.down, dash: '5 3', label: '1.00 backwardation', scale: true, w: 1.2 },
            { t: 'hline', y: RL['90'], color: C.pl, dash: '4 3', label: '90th · ' + RL['90'].toFixed(2), tag: '90th ' + RL['90'].toFixed(2), op: 0.8 },
            { t: 'hline', y: RL['10'], color: C.muted, dash: '1 3', label: '10th · ' + RL['10'].toFixed(2), tag: '10th ' + RL['10'].toFixed(2) },
            { t: 'line', v: D.ratio, color: C.vix, w: 1.6, ghostFrom: ghost },
            { t: 'now', i: i, v: D.ratio, hollow: DATA.open }] },
        { h: 100, label: 'VVIX', fmt: function (t) { return t; },
          items: [{ t: 'line', v: D.vvix, color: C.vv, w: 1.3, ghostFrom: ghost }, { t: 'now', i: i, v: D.vvix, hollow: DATA.open }] }
      ],
      onHover: function (j) { readout3(j == null ? i : j, j == null); }
    });
    $('lg3').innerHTML = '<span class="lg-i"><span class="lg-vix"></span>VIX ÷ VIX3M</span>' +
      '<span class="lg-i"><span class="lg-bk"></span>over 1.00 = backwardation</span><span class="lg-i"><span class="lg-vv"></span>VVIX (volatility of the VIX)</span>';
    renderCurve();
  }

  function readout3(i, resting) {
    var D = DATA.daily, so = DATA.open && i === lastIdx();
    $('ro3').innerHTML = '<span class="d">' + fdate(D.d[i], true) + (so ? ' (so far)' : '') + '</span> · ratio <span class="vx">' + (D.ratio[i] != null ? D.ratio[i].toFixed(3) : '–') + '</span> (' + ord(D.rp2013[i]) + ')' +
      ' · VIX9D ' + f2(D.v9d[i]) + ' · VIX ' + f2(D.c[i]) + ' · VIX3M <span class="r3">' + f2(D.v3m[i]) + '</span> · VIX6M ' + f2(D.v6m[i]) +
      ' · VVIX ' + f2(D.vvix[i]) + (resting ? ' <span class="muted">· hover for any day</span>' : '');
  }

  function renderCurve() {
    var cv = DATA.curve, el = $('curve'), W = Math.max(240, el.clientWidth || 280), H = 170, L = 8, R = 40, T = 10, B = 24;
    var all = cv.now.concat(cv.m1, cv.y1med).filter(function (x) { return x != null; });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
    function X(k) { return L + k * (W - L - R) / 3; } function Y(v) { return T + (hi - v) / (hi - lo) * (H - T - B); }
    var p = ['<rect x="0" y="0" width="' + (W - R + 6) + '" height="' + (H - B + 4) + '" fill="rgba(19,23,34,.5)" rx="3"/>'];
    niceTicks(lo, hi, 4).forEach(function (t) { var y = Y(t); if (y < T || y > H - B) return; p.push('<line x1="0" x2="' + (W - R + 6) + '" y1="' + y + '" y2="' + y + '" stroke="' + C.grid + '"/><text x="' + (W - R + 10) + '" y="' + (y + 4) + '" fill="' + C.muted + '" font-size="11">' + t + '</text>'); });
    function ln(vals, col, dash, w, dots) {
      var d = ''; vals.forEach(function (v, k) { if (v == null) return; d += (d ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1); });
      p.push('<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>');
      if (dots) vals.forEach(function (v, k) { if (v == null) return; p.push('<circle cx="' + X(k).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.5" fill="' + col + '" stroke="' + C.bg + '" stroke-width="1.5"/><text x="' + X(k).toFixed(1) + '" y="' + (Y(v) - 8).toFixed(1) + '" fill="' + col + '" font-size="11" font-weight="700" text-anchor="' + (k === 0 ? 'start' : k === 3 ? 'end' : 'middle') + '">' + v.toFixed(1) + '</text>'); });
    }
    ln(cv.y1med, C.muted, '1 3', 1.4, false);
    ln(cv.m1, C.v3m, '4 3', 1.4, false);
    ln(cv.now, C.vix, null, 2.2, true);
    cv.tenors.forEach(function (t, k) { p.push('<text x="' + X(k).toFixed(1) + '" y="' + (H - 6) + '" fill="' + C.muted + '" font-size="11" text-anchor="' + (k === 0 ? 'start' : k === 3 ? 'end' : 'middle') + '">' + (t === '30D' ? 'VIX' : 'VIX' + t) + '</text>'); });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + p.join('') + '</svg>';
    var up = cv.now[0] != null && cv.now[3] != null && cv.now[0] > cv.now[3];
    $('lgCurve').innerHTML = '<span class="lg-i"><span class="lg-vix"></span>' + (DATA.open ? 'today so far' : 'last close') + '</span><span class="lg-i"><span class="lg-ln" style="border-color:#FFB74D;border-top-style:dashed"></span>' + fdate(cv.m1_date).replace(/, \d+$/, '') + '</span>' +
      '<span class="lg-i"><span class="lg-alarm"></span>1-year median</span><span class="lg-i">' + (up ? 'front above back: stress now' : 'upward slope: normal') + '</span>';
  }


  function renderTiles() {
    var h = '';
    ['1D', '1W', '2W', '1M'].forEach(function (tf) {
      var B = DATA.tf[tf], n = B.c.length - 1, up = B.up;
      h += '<div class="tile"><span class="tk">' + tf + (B.open ? ' · so far' : ' · closed') + '</span><span class="tv">' + f2(B.c[n]) + '</span><span class="tp">' + ord(B.p2013[n]) + '</span>' +
        '<span class="tkdj">K ' + f0(B.K[n]) + ' D ' + f0(B.D[n]) + ' · ' + (up ? '<b class="r">▲ fear rising</b>' : '<b class="g">▼ fear easing</b>') + '</span></div>';
    });
    $('tiles').innerHTML = h;
    $('kdjSub2').innerHTML = 'Open candles are drawn as if they closed now (dotted outline). ' + (DATA.open ? 'Today is still trading.' : '');
  }

  function renderKBlocks() {
    var box = $('kblocks');
    if (!box.children.length) {
      box.innerHTML = ['1D', '1W', '2W', '1M'].map(function (tf) {
        return '<div class="kblock" data-k="' + tf + '"><div class="kb-head"><h3>' + TF_WORD[tf] + '</h3><span class="kb-val" data-kv></span></div>' +
          '<p class="kb-note" data-kn></p><div class="readout kb-ro" data-kro aria-live="polite"></div><p class="kb-win" data-kw></p><div class="chart kb-chart" data-kc></div></div>';
      }).join('');
    }
    ['1D', '1W', '2W', '1M'].forEach(function (tf) { renderKBlock(tf); });
    $('lg4').innerHTML = '<span class="lg-i"><span class="lg-cr"></span><span class="lg-cg"></span>VIX candle up / down</span><span class="lg-i"><span class="lg-pl"></span>90th / 95th / 99th since 2013</span>' +
      '<span class="lg-i"><span class="lg-flip"></span>flip level</span><span class="lg-i"><span class="lg-ln lg-k"></span>K</span><span class="lg-i"><span class="lg-ln lg-d"></span>D</span><span class="lg-i"><span class="lg-ln lg-j"></span>J</span>' +
      '<span class="lg-i"><span class="lg-tri lg-up"></span>K crosses above D: fear rising</span><span class="lg-i"><span class="lg-tri lg-dn"></span>K crosses below D: fear easing</span>' +
      '<span class="lg-i"><span class="lg-pk"></span>weekly roll-over (J turns down from its high zone)</span><span class="lg-i"><span class="lg-alarm"></span>J / D high zones (the VIX\'s own highest readings since 2004)</span>';
  }

  function renderKBlock(tf) {
    var B = DATA.tf[tf], el = document.querySelector('.kblock[data-k="' + tf + '"]'), n = B.c.length - 1, w = kWindow(tf), a = w[0], b = w[1];
    var L = B.lines2013, ghost = B.open ? n : null;
    el.querySelector('[data-kv]').innerHTML = 'VIX ' + f2(B.c[n]) + ' · ' + ord(B.p2013[n]) + ' · <span style="color:' + C.k + '">K ' + f0(B.K[n]) + '</span> <span style="color:' + C.d + '">D ' + f0(B.D[n]) + '</span> <span style="color:' + C.j + '">J ' + f0(B.J[n]) + '</span>';
    var since = 0; for (var q = n; q > 0; q--) { if ((B.K[q] > B.D[q]) !== (B.K[q - 1] > B.D[q - 1])) { since = n - q; break; } }
    el.querySelector('[data-kn]').innerHTML = (B.open ? 'this ' + TF_UNIT[tf] + ' so far, as if it closed now' : 'last closed ' + TF_UNIT[tf]) + ' · ' +
      (B.up ? '<b style="color:var(--down)">K above D: fear rising</b>' : '<b style="color:var(--up)">K below D: fear easing</b>') +
      ' (crossed ' + (since === 0 ? 'on this candle' : since + ' candle' + (since > 1 ? 's' : '') + ' ago') + ')' +
      (B.fl != null ? ' · flips to ' + (B.up ? 'easing below <b style="color:var(--pk)">' : 'rising above <b style="color:var(--pk)">') + f2(B.fl) + '</b>' : '') +
      (tf === '1W' ? rollNote(B, n) : '');
    el.querySelector('[data-kw]').textContent = (KRANGE === 'Auto' ? 'last ' + (b - a + 1) + ' ' + (tf === '1D' ? 'sessions' : TF_WORD[tf].toLowerCase() + ' candles') : fmon(B.d1[a]) + ' – ' + fmon(B.d1[b]));
    var hl = [
      { t: 'hline', y: L['90'], color: C.pl, dash: '4 3', label: '90th · ' + f1(L['90']), tag: '90th ' + f1(L['90']), op: 0.8 },
      { t: 'hline', y: L['95'], color: C.pl, dash: '4 3', label: '95th · ' + f1(L['95']), tag: '95th ' + f1(L['95']), op: 0.9 },
      { t: 'hline', y: L['99'], color: '#D7B8FF', dash: '4 3', label: '99th · ' + f1(L['99']), tag: '99th ' + f1(L['99']) }];
    if (B.fl != null) hl.push({ t: 'hline', y: B.fl, color: C.pk, dash: '5 3', label: 'flip ' + f2(B.fl), w: 1.3, scale: true });
    var sameN = function (arr) { return arr; };
    drawChart(el.querySelector('[data-kc]'), {
      dates: B.d1, a: a, b: b,
      panes: [
        { h: 84, label: PX, fmt: function (t) { return t >= 1000 ? (t / 1000).toFixed(1) + 'k' : t; },
          items: [{ t: 'line', v: pxB(B), color: C.spy, w: 1.3, ghostFrom: ghost }, { t: 'now', i: n, v: pxB(B), hollow: B.open }] },
        { h: 150, label: 'VIX', floor: 0, fmt: function (t) { return t; },
          items: hl.concat([{ t: 'candles', o: B.o, h: B.h, l: B.l, c: B.c, ghost: ghost }]) },
        { h: 120, label: 'KDJ OF VIX', fixed: [-20, 120], fmt: function (t) { return t; },
          items: [
            { t: 'band', y0: B.jz, y1: 120, fill: 'rgba(255,216,77,.05)' },
            { t: 'hline', y: B.jz, color: C.pk, dash: '1 3', label: 'J high zone · ' + f0(B.jz), op: 0.75 },
            { t: 'hline', y: B.dz, color: C.d, dash: '1 3', label: 'D high zone · ' + f0(B.dz), op: 0.6 },
            { t: 'line', v: B.J, color: C.j, w: 1, op: 0.75 },
            { t: 'line', v: B.D, color: C.d, w: 1.5, ghostFrom: ghost },
            { t: 'line', v: B.K, color: C.k, w: 1.5, ghostFrom: ghost },
            { t: 'tri', idx: B.xu, v: B.K, dir: 1, color: C.down },
            { t: 'tri', idx: B.xd, v: B.K, dir: -1, color: C.up }].concat(tf === '1W' ? [{ t: 'dots', idx: B.roll, v: B.J, color: C.pk, r: 4 }] : []) }
      ],
      onHover: function (i) { kReadout(tf, el, i == null ? n : i, i == null); }
    });
  }

  function rollNote(B, n) {
    var last = B.roll.length ? B.roll[B.roll.length - 1] : null;
    var hot = B.J[n] >= B.jz;
    return '<br><span style="color:var(--pk)">●</span> weekly roll-over = J turns down from its high zone (' + f0(B.jz) + '+)' +
      (last != null && last === n ? ' — <b style="color:var(--pk)">printing this week</b>' : '') +
      (hot ? ' · J is in its high zone now (' + f0(B.J[n]) + '): a lower J next week prints one' : '') +
      (last != null && last !== n ? ' · last one week to ' + fdate(B.d1[last]) : '');
  }

  function kReadout(tf, el, i, resting) {
    var B = DATA.tf[tf], so = B.open && i === B.c.length - 1;
    var when = tf === '1D' ? fdate(B.d1[i], true) : (tf === '1M' ? fmon(B.d1[i]) : 'to ' + fdate(B.d1[i]));
    var cross = B.xu.indexOf(i) >= 0 ? ' · <span class="hot">▲ K crossed above D</span>' : (B.xd.indexOf(i) >= 0 ? ' · <span class="cool">▼ K crossed below D</span>' : '');
    if (tf === '1W' && B.roll.indexOf(i) >= 0) cross += ' · <span class="pk">● weekly roll-over</span>';
    el.querySelector('[data-kro]').innerHTML = '<span class="d">' + when + (so ? ' (so far)' : '') + '</span> · VIX <span class="vx">' + f2(B.c[i]) + '</span> (high ' + f2(B.h[i]) + ') · ' +
      '<span class="pc">' + ord(B.p2013[i]) + '</span> · <span class="kk">K ' + f1(B.K[i]) + '</span> <span class="kd">D ' + f1(B.D[i]) + '</span> <span class="kj">J ' + f1(B.J[i]) + '</span>' + cross +
      ' · ' + PX + ' ' + f2(pxB(B)[i]) + (resting ? ' <span class="muted">· hover for any ' + TF_UNIT[tf] + '</span>' : '');
  }


  function renderTable() {
    var D = DATA.daily, K = DATA.tf['1D'], n = D.d.length, rows = [];
    rows.push('<caption>Daily closes, newest first' + (DATA.open ? ' (top row so far)' : '') + '</caption><thead><tr><th>Date</th><th>VIX</th><th>chg</th><th>%ile 2013+</th><th class="wide-only">VIX9D</th><th>VIX3M</th><th>ratio</th><th class="wide-only">VVIX</th><th>' + PX + '</th><th class="wide-only">K / D</th></tr></thead><tbody>');
    for (var i = n - 1; i >= Math.max(1, n - 30); i--) {
      var mv = pctChg(D.c[i], D.c[i - 1]);
      rows.push('<tr><td>' + fdate(D.d[i]).replace(/, \d+$/, '') + '</td><td>' + f2(D.c[i]) + '</td><td style="color:' + (mv >= 0 ? C.down : C.up) + '">' + sgn(mv) + '%</td><td>' + ord(D.p2013[i]) + '</td><td class="wide-only">' + f2(D.v9d[i]) + '</td><td>' + f2(D.v3m[i]) +
        '</td><td>' + (D.ratio[i] != null ? D.ratio[i].toFixed(3) : '–') + '</td><td class="wide-only">' + f2(D.vvix[i]) + '</td><td>' + f2(pxD(D)[i]) + '</td><td class="wide-only">' + f0(K.K[i]) + ' / ' + f0(K.D[i]) + '</td></tr>');
    }
    rows.push('</tbody>');
    $('tbl').innerHTML = rows.join('');
  }


  var ETZ = 'America/New_York';
  function etParts(t) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: ETZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(t).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function inSession(t) {
    var p = etParts(t), m = (+p.hour % 24) * 60 + +p.minute;
    return p.weekday !== 'Sat' && p.weekday !== 'Sun' && m >= 570 && m < 960;
  }
  function etAt(ds, hh, mm) {
    var q = ds.split('-'), g = Date.UTC(+q[0], +q[1] - 1, +q[2], hh + 5, mm), p = etParts(new Date(g));
    return new Date(g + (hh * 60 + mm - ((+p.hour % 24) * 60 + +p.minute)) * 60000);
  }
  function hmIn(t, tz) { return t.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }); }
  function etLocal(t) {
    var s = hmIn(t, ETZ) + ' ET';
    try {
      var z = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (z && z !== ETZ && hmIn(t, z) !== hmIn(t, ETZ)) s += ' · ' + hmIn(t, z) + ' your time';
    } catch (e) {  }
    return s;
  }
  function renderStatus() {
    var i = lastIdx(), d = DATA.daily.d[i];
    var chip = $('chip'), built = new Date(DATA.built_utc), age = (Date.now() - built.getTime()) / 60000;
    var session = inSession(new Date()), late = DATA.open && session && age > 40;
    chip.className = 'chip ' + (late ? 'chip-late' : DATA.open ? 'chip-live' : 'chip-closed');
    chip.textContent = late ? 'LATE' : DATA.open ? 'LIVE' : 'CLOSED';
    $('asof').innerHTML = fdate(d, true) + (DATA.open ? ' (so far)' : '') + ' · VIX ' + f2(DATA.daily.c[i]) + ' · updated ' + etLocal(built);
    var next = '';
    if (DATA.open && session) next = ' · updates about every 15 minutes in US hours';
    else if (DATA.open) next = ' · the close lands about ' + etLocal(etAt(d, 16, 30));
    $('statusLine').innerHTML = '<span class="muted">Daily closes, about 15 min delayed during the session' + next + ' · percentiles since 2013 and 2021' +
      (late ? ' · <b style="color:var(--amber)">no new data for ' + Math.round(age) + ' min</b>' : '') + '</span>';
  }


  var GH = /(^|\.)github\.io$/i.test(location.hostname);
  var RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/vix-data/vix/';
  var BASE = GH ? RAW : 'snap/';
  function getJson(name) {
    function one(base) {
      return fetch(base + name, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('data ' + r.status); return r.json(); });
    }
    return one(BASE).catch(function (e) { if (BASE === RAW) throw e; BASE = RAW; return one(BASE); });
  }
  function prep(doc, man) {
    doc.built_utc = man.generated_utc;
    doc.sha = man.sha256;
    var B = doc.tf['1D'], D = doc.daily;
    B.d1 = D.d; B.c = D.c; B.s = D.spy; B.q = D.qqq;
    return doc;
  }
  function load() {
    return getJson('manifest.json').then(function (man) {
      return getJson('vix.json').then(function (doc) { return prep(doc, man); });
    });
  }

  function poll() {
    getJson('manifest.json').then(function (m) {
      if (DATA && m.sha256 && m.sha256 !== DATA.sha) {
        return getJson('vix.json').then(function (doc) {
          var y = window.scrollY; DATA = prep(doc, m); renderAll(); window.scrollTo(0, y);
        });
      }
      renderStatus();
    }).catch(function () {  });
  }


  function renderAll() {
    renderStatus(); renderHero(); renderMain();
    if (DATA.fc) { renderEM(); renderVP(); renderCal(); }
    renderAct(); renderTS(); renderTiles(); renderKBlocks(); renderTable();
  }
  function setPx(px, remember) {
    if (px !== 'SPY' && px !== 'QQQ') return;
    PX = px;
    document.querySelectorAll('#pxs button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-px') === PX ? 'true' : 'false'); });
    document.querySelectorAll('[data-pxname]').forEach(function (e) { e.textContent = PX; });
    if (remember) { try { localStorage.setItem('vixPx', PX); } catch (e) {  } }
    try { var u = new URL(location.href); if (PX === 'SPY') u.searchParams.delete('px'); else u.searchParams.set('px', PX); history.replaceState(null, '', u); } catch (e) {  }
  }
  function initPx() {
    var want = null;
    try { want = (new URL(location.href)).searchParams.get('px'); } catch (e) {  }
    if (!want) { try { want = localStorage.getItem('vixPx'); } catch (e) {  } }
    setPx((want || 'SPY').toUpperCase(), false);
  }

  function wire() {
    document.querySelectorAll('#ranges button').forEach(function (bt) {
      bt.addEventListener('click', function () {
        RANGE = bt.getAttribute('data-range');
        document.querySelectorAll('#ranges button').forEach(function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
        renderMain(); renderTS();
      });
    });
    document.querySelectorAll('#emTabs button').forEach(function (bt) {
      bt.addEventListener('click', function () { EMH = +bt.getAttribute('data-h'); renderEM(); });
    });
    document.querySelectorAll('[data-win-for]').forEach(function (g) {
      var which = g.getAttribute('data-win-for');
      g.querySelectorAll('button').forEach(function (bt) {
        bt.addEventListener('click', function () {
          FCWIN[which] = bt.getAttribute('data-w');
          g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
          if (which === 'em') renderEM(); else renderVP();
        });
      });
    });
    document.querySelectorAll('#vpTabs button').forEach(function (bt) {
      bt.addEventListener('click', function () { VPT = bt.getAttribute('data-t'); renderVP(); });
    });
    document.querySelectorAll('#pxs button').forEach(function (bt) {
      bt.addEventListener('click', function () { setPx(bt.getAttribute('data-px'), true); renderAll(); });
    });
    document.querySelectorAll('#kranges button').forEach(function (bt) {
      bt.addEventListener('click', function () {
        KRANGE = bt.getAttribute('data-krange');
        document.querySelectorAll('#kranges button').forEach(function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
        renderKBlocks();
      });
    });
    var t = null, lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return; lastW = window.innerWidth;
      clearTimeout(t); t = setTimeout(function () { renderMain(); if (DATA.fc) { renderEM(); renderVP(); } renderLadder(); renderTS(); renderKBlocks(); }, 150);
    });
  }

  load()
    .then(function (doc) {
      DATA = doc;
      $('content').hidden = false;
      initPx(); wire(); renderAll(); setInterval(poll, 300000);

      if (location.hash.length > 1) { var tgt = document.getElementById(location.hash.slice(1)); if (tgt) setTimeout(function () { tgt.scrollIntoView(); }, 50); }
    })
    .catch(function (e) {
      $('chip').className = 'chip chip-error'; $('chip').textContent = 'ERROR';
      $('asof').textContent = 'Could not load the data (' + e.message + ').';
    });
})();
