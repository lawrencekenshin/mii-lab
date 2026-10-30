

(function () {
  'use strict';
  var DATA = null, LIVE = null, STATUS = null;
  var TF = '1D', TF_PER = { '1D': 1, '1W': 5, '2W': 10, '1M': 21 };
  var TF_WORD = { '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' };
  var SIDE = 'SPY', SER = { SPY: 'tot', QQQ: 'tot' }, RANGE = '2Y', ERA = {}, EPK = 'fear';
  var SIDE_LAB = { SPY: 'S&P 500 (SPY)', QQQ: 'Nasdaq 100 (QQQ)' };
  var RANGE_N = { '3M': 63, '6M': 126, '1Y': 252, '2Y': 504, '5Y': 1260, '10Y': 2520 };
  var RANGE_WORD = { '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year', '2Y': 'last 2 years', '5Y': 'last 5 years',
    '10Y': 'last 10 years', 'All': 'all history' };
  var C = { text: '#D1D4DC', muted: '#8A8E99', line: '#2A2E39', grid: 'rgba(42,46,57,.7)', pc: '#B39DDB', pcThin: 'rgba(179,157,219,.5)',
    pl: '#B98AF2', pk: '#FFD84D', calm: '#4DD0C4', up: '#26A69A', down: '#EF5350', px: '#D1D4DC', white: '#FFFFFF', bg: '#131722',
    hot: '#FF8A80', cold: '#80CBC4', zero: '#F48FB1', x: '#FFB74D',
    oi: { spx: '#B39DDB', tot: '#4FC3F7', eq: '#FFB74D', etp: '#80CBC4', idx: '#F48FB1', vix: '#9FA8DA' } };
  var ZCLS = ['cold', 'cool', '', 'warm', 'hot'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pd(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function fdate(s, withDow) { var d = pd(s); return (withDow ? DOW[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); }
  function fshort(s) { var d = pd(s); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function fmon(s) { var d = pd(s); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function f2(x) { return x == null ? '–' : x.toFixed(2); }
  function f3(x) { return x == null ? '–' : x.toFixed(3); }
  function ord(p) { if (p == null) return '–'; var n = Math.round(p); if (n >= 100) n = 99; var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function sgn(x, d) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d == null ? 1 : d); }
  function pct(x, d) { return x == null ? '–' : sgn(x * 100, d == null ? 1 : d) + '%'; }
  function pc0(x) { return x == null ? '–' : Math.round(x * 100) + '%'; }
  function fint(x) { return x == null ? '–' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? Math.round(x / 1e3) + 'k' : String(x); }


  var CACHE = {};
  function S(k) { return DATA.series[k]; }
  function full(k, name) {
    var key = k + '.' + name;
    if (CACHE[key]) return CACHE[key];
    var s = S(k), off = (name === 'oi' || name === 'oi_pct') ? s.oi_first : s.first, a = s[name], n = DATA.dates.length;
    var out = new Array(n);
    for (var i = 0; i < n; i++) { var j = i - off; out[i] = (off == null || j < 0 || !a || j >= a.length) ? null : a[j]; }
    CACHE[key] = out;
    return out;
  }
  function at(k, name, i) { return full(k, name)[i]; }
  function zoneOf(p) {
    if (p == null) return null;
    var cuts = DATA.ln;
    for (var z = 0; z < cuts.length; z++) if (p < cuts[z]) return z;
    return cuts.length;
  }
  function zword(z) { return z == null ? '–' : DATA.zones[z]; }
  function dz(k, z) { return z == null ? null : (S(k).flip ? DATA.zones.length - 1 - z : z); }
  function zw(k, z) { return zword(dz(k, z)); }
  function zc(k, z) { var d = dz(k, z); return d == null ? '' : ZCLS[d]; }
  function ctxLine(i) {
    var j = i; while (j > 0 && (DATA.ctx.dd[SIDE][j] == null || DATA.vix[j] == null)) j--;
    var dd = DATA.ctx.dd[SIDE][j], vp = DATA.ctx.vixp[j], v = DATA.vix[j];
    var vr = DATA.ctx.vr ? DATA.ctx.vr[j] : null;
    return SIDE + ' ' + (dd == null ? '–' : dd > -0.0005 ? 'at its 1-year high' : (Math.abs(dd) * 100).toFixed(1) + '% below its 1-year high') + ' · VIX ' + f2(v) + (vp != null ? ' (' + ord(vp) + ' percentile)' : '') +
      (vr != null ? ' · VIX÷VIX3M ' + vr.toFixed(2) + (vr >= 1 ? ' (inverted)' : '') : '') + (j !== i ? ' (' + fshort(DATA.dates[j]) + ')' : '');
  }
  function winWord() { return 'past sessions'; }
  function nowIdx(k) {
    var s = S(k);
    return s.sf != null && at(k, 'rl', s.sf) != null ? s.sf : s.last;
  }
  function sfLive(k) {
    var s = S(k), f = s.sf_info || {};
    return nowIdx(k) === s.sf && !f.closed && f.date === etNow().date;
  }
  function sfTag(k) {
    if (nowIdx(k) !== S(k).sf) return '';
    return '<span class="sf-tag">' + (sfLive(k) ? 'so far' : 'chains') + '</span>';
  }
  function lastIdx() { return DATA.dates.length - 1; }
  function serLast(k) { return S(k).last; }
  function pxArr() { return DATA.px[SIDE]; }
  function curSer() { return SER[SIDE]; }
  function normalize() {
    ['SPY', 'QQQ'].forEach(function (sd) {
      DATA.side[sd] = (DATA.side[sd] || []).filter(function (k) { return DATA.series[k] && DATA.odds[sd] && DATA.odds[sd][k]; });
      if (DATA.side[sd].indexOf(SER[sd]) < 0) SER[sd] = DATA.side[sd][0];
    });
  }


  function drawChart(el, spec) {
    var W = Math.max(280, el.clientWidth || 600), AX = spec.axisW || 46, PW = W - AX, top = 4, gap = 8;
    var a = spec.a, b = spec.b, cnt = Math.max(1, b - a);
    function X(i) { return (i - a) / cnt * (PW - 8) + 4; }
    var parts = [], y0 = top, paneNo = 0;
    spec.panes.forEach(function (pn) {
      var lo = Infinity, hi = -Infinity;
      if (pn.fixed) { lo = pn.fixed[0]; hi = pn.fixed[1]; }
      else {
        pn.items.forEach(function (it) {
          if (it.noScale) return;
          var arrs = it.t === 'range' ? [it.lo, it.hi] : (it.t === 'candles' ? [it.h, it.l] : (it.v ? [it.v] : []));
          arrs.forEach(function (arr) { for (var i = a; i <= b; i++) { var v = arr[i]; if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } } });
          if (it.t === 'hline' && it.scale) { lo = Math.min(lo, it.y); hi = Math.max(hi, it.y); }
        });
        if (!isFinite(lo)) { lo = 0; hi = 1; }
        var pad = (hi - lo) * (pn.pad == null ? 0.08 : pn.pad) || 0.05; lo -= pad; hi += pad;
        if (pn.floor != null) lo = Math.max(pn.floor, lo);
      }
      var h = pn.h, yt = y0, yb = y0 + h;
      function Y(v) { return yb - (v - lo) / (hi - lo) * h; }
      parts.push('<rect x="0" y="' + yt + '" width="' + PW + '" height="' + h + '" fill="rgba(30,34,45,.55)" rx="2"/>');
      var ticks = pn.ticks || niceTicks(lo, hi, h > 120 ? 5 : 3);
      ticks.forEach(function (t) {
        var yy = Y(t); if (yy < yt + 2 || yy > yb - 2) return;
        parts.push('<line x1="0" x2="' + PW + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="' + C.grid + '" stroke-width="1"/>');
        parts.push('<text x="' + (PW + 5) + '" y="' + (yy + 4).toFixed(1) + '" fill="' + C.muted + '" font-size="11">' + (pn.fmt ? pn.fmt(t) : t) + '</text>');
      });
      if (pn.label) parts.push('<text x="6" y="' + (yt + 13) + '" fill="' + C.muted + '" font-size="10.5" font-weight="700" letter-spacing=".05em">' + esc(pn.label) + '</text>');
      var cid = (el.id || 'c') + '-p' + paneNo++;
      parts.push('<clipPath id="' + cid + '"><rect x="0" y="' + (yt - 6) + '" width="' + PW + '" height="' + (h + 12) + '"/></clipPath><g clip-path="url(#' + cid + ')">');
      var edgeTags = [], labYs = [];
      pn.items.forEach(function (it) {
        if (it.t === 'mask') {

          var run0 = null;
          for (var q0 = a; q0 <= b + 1; q0++) {
            var on = q0 <= b && it.on[q0];
            if (on && run0 == null) run0 = q0;
            if (!on && run0 != null) {
              var xa = X(run0) - 0.5 * (PW - 8) / cnt, xb = X(q0 - 1) + 0.5 * (PW - 8) / cnt;
              parts.push('<rect x="' + Math.max(0, xa).toFixed(1) + '" y="' + yt + '" width="' + Math.max(1, xb - xa).toFixed(1) + '" height="' + h + '" fill="' + it.fill + '"/>');
              run0 = null;
            }
          }
        } else if (it.t === 'candles') {
          var bw = Math.max(1, Math.min(9, (PW - 8) / cnt * 0.62));
          for (var kc = a; kc <= b; kc++) {
            if (it.c[kc] == null || it.o[kc] == null) continue;
            var o = it.o[kc], cl = it.c[kc], up = cl >= o, col = up ? C.up : C.down, xx = X(kc);
            var gh = it.ghost != null && kc >= it.ghost;
            parts.push('<line x1="' + xx.toFixed(1) + '" x2="' + xx.toFixed(1) + '" y1="' + Y(it.h[kc]).toFixed(1) + '" y2="' + Y(it.l[kc]).toFixed(1) + '" stroke="' + col + '" stroke-width="1"' + (gh ? ' stroke-dasharray="2 2"' : '') + '/>');
            var yA = Y(Math.max(o, cl)), yB = Y(Math.min(o, cl));
            parts.push('<rect x="' + (xx - bw / 2).toFixed(1) + '" y="' + yA.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, yB - yA).toFixed(1) + '" fill="' + (gh ? 'none' : col) + '" stroke="' + col + '" stroke-width="' + (gh ? 1.2 : 0) + '"' + (gh ? ' stroke-dasharray="2 2"' : '') + '/>');
          }
        } else if (it.t === 'tri') {
          it.idx.forEach(function (i) {
            if (i < a || i > b || it.v[i] == null) return;
            var tx = X(i), ty = Y(it.v[i]), sz = it.r || 4.5, col = it.colors ? it.colors[i] || it.color : it.color;
            var pts = it.dir > 0 ? [tx - sz, ty + sz + 6, tx + sz, ty + sz + 6, tx, ty + 6 - sz * 0.5] : [tx - sz, ty - sz - 6, tx + sz, ty - sz - 6, tx, ty - 6 + sz * 0.5];
            parts.push('<polygon points="' + pts.map(function (q) { return q.toFixed(1); }).join(' ') + '" fill="' + col + '" stroke="' + C.bg + '" stroke-width="1"/>');
          });
        } else if (it.t === 'range') {
          var segs = [], cur = [];
          for (var q = a; q <= b; q++) {
            if (it.lo[q] == null || it.hi[q] == null) { if (cur.length) segs.push(cur); cur = []; continue; }
            cur.push(q);
          }
          if (cur.length) segs.push(cur);
          segs.forEach(function (sg) {
            var tp = sg.map(function (q, k) { return (k ? 'L' : 'M') + X(q).toFixed(1) + ' ' + Y(Math.min(hi, it.hi[q])).toFixed(1); }).join('');
            var bt = sg.slice().reverse().map(function (q) { return 'L' + X(q).toFixed(1) + ' ' + Y(Math.max(lo, it.lo[q])).toFixed(1); }).join('');
            parts.push('<path d="' + tp + bt + 'Z" fill="' + it.fill + '" stroke="none"/>');
          });
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
          var d = '', pen = false;
          for (var i = a; i <= b; i++) {
            var v = it.v[i]; if (v == null) { if (!it.join) pen = false; continue; }
            d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true;
          }
          if (it.fill && d) {
            var first = null, last = null;
            for (var i2 = a; i2 <= b; i2++) if (it.v[i2] != null) { if (first == null) first = i2; last = i2; }
            parts.push('<path d="' + d + 'L' + X(last).toFixed(1) + ' ' + yb + 'L' + X(first).toFixed(1) + ' ' + yb + 'Z" fill="' + it.fill + '" stroke="none"/>');
          }
          parts.push('<path d="' + d + '" fill="none" stroke="' + it.color + '" stroke-width="' + (it.w || 1.5) + '"' + (it.dash ? ' stroke-dasharray="' + it.dash + '"' : '') + ' stroke-linejoin="round" opacity="' + (it.op || 1) + '"/>');
          if (it.ghostFrom != null && it.ghostFrom <= b && it.ghostFrom - 1 >= a && it.v[it.ghostFrom] != null && it.v[it.ghostFrom - 1] != null) {
            var g0 = it.ghostFrom - 1, g1 = it.ghostFrom;
            parts.push('<line x1="' + X(g0).toFixed(1) + '" y1="' + Y(it.v[g0]).toFixed(1) + '" x2="' + X(g1).toFixed(1) + '" y2="' + Y(it.v[g1]).toFixed(1) + '" stroke="' + C.bg + '" stroke-width="' + ((it.w || 1.5) + 0.6) + '"/>');
            parts.push('<line x1="' + X(g0).toFixed(1) + '" y1="' + Y(it.v[g0]).toFixed(1) + '" x2="' + X(g1).toFixed(1) + '" y2="' + Y(it.v[g1]).toFixed(1) + '" stroke="' + it.color + '" stroke-width="' + (it.w || 1.5) + '" stroke-dasharray="2 3"/>');
          }
        } else if (it.t === 'dots') {
          it.idx.forEach(function (i) {
            if (i < a || i > b || it.v[i] == null) return;
            parts.push('<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(it.v[i]).toFixed(1) + '" r="' + (it.r || 3.5) + '" fill="' + it.color + '" stroke="' + C.bg + '" stroke-width="1.5"/>');
          });
        } else if (it.t === 'now') {
          var ni = it.i; if (ni < a || ni > b || it.v[ni] == null) return;
          var cx = X(ni).toFixed(1), cy = Y(it.v[ni]).toFixed(1);
          parts.push('<circle class="now-pulse" cx="' + cx + '" cy="' + cy + '" r="5" fill="rgba(179,157,219,.45)"/>');
          parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + (it.hollow ? 3.6 : 4) + '" fill="' + (it.hollow ? C.bg : '#F3EEFF') + '" stroke="#fff" stroke-width="1.5"/>');
        }
      });
      parts.push('</g>');
      edgeTags.forEach(function (t, ti) {
        var yy = t.up ? yt + 12 + ti * 12 : yb - 4 - ti * 12;
        parts.push('<text x="' + (PW - 4) + '" y="' + yy + '" fill="' + t.color + '" font-size="10.5" text-anchor="end" font-weight="600" opacity=".85">' + (t.up ? '↑ ' : '↓ ') + esc(t.txt) + '</text>');
      });
      y0 = yb + gap;
    });
    var H = y0 - gap + 20, labs = spec.labels ? spec.labels(a, b, PW) : xLabels(spec.dates, a, b, PW);
    (spec.vlines || []).forEach(function (vl) {
      if (vl.i < a || vl.i > b) return;
      parts.push('<line x1="' + X(vl.i).toFixed(1) + '" x2="' + X(vl.i).toFixed(1) + '" y1="' + top + '" y2="' + (y0 - gap) + '" stroke="' + vl.color + '" stroke-width="1" opacity="' + (vl.op || 0.3) + '"/>');
    });
    labs.forEach(function (L) {
      var x = X(L.i);
      parts.push('<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (H - 18) + '" y2="' + (H - 14) + '" stroke="' + C.muted + '"/>');
      parts.push('<text x="' + x.toFixed(1) + '" y="' + (H - 3) + '" fill="' + C.muted + '" font-size="11" text-anchor="middle">' + esc(L.t) + '</text>');
    });
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' + parts.join('') +
      '<line class="xh" x1="-10" x2="-10" y1="' + top + '" y2="' + (H - 18) + '" stroke="rgba(209,212,220,.45)" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect class="hit" x="0" y="0" width="' + PW + '" height="' + H + '" fill="transparent"/></svg>';
    var s = el.querySelector('svg'), xh = el.querySelector('.xh');
    function idxAt(ev) {
      var r = s.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
      var i = Math.round((px - 4) / (PW - 8) * cnt + a); return Math.max(a, Math.min(b, i));
    }
    function show(i) { xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); if (spec.onHover) spec.onHover(i); }
    function rest() { xh.setAttribute('x1', -10); xh.setAttribute('x2', -10); if (spec.onHover) spec.onHover(null); }
    s.addEventListener('pointermove', function (ev) { show(idxAt(ev)); });
    s.addEventListener('pointerdown', function (ev) { show(idxAt(ev)); });
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
    var span = (pd(dates[b]) - pd(dates[a])) / 864e5, out = [], maxN = Math.max(3, Math.floor(PW / 78));
    var mode = span > 365 * 3 ? 'y' : (span > 120 ? 'm' : 'd'), prevKey = null;
    for (var i = a; i <= b; i++) {
      var d = pd(dates[i]), key;
      if (mode === 'y') key = d.getUTCFullYear();
      else if (mode === 'm') key = d.getUTCFullYear() * 12 + d.getUTCMonth();
      else key = Math.floor((d.getTime() / 864e5 + 4) / 7);
      if (prevKey !== null && key !== prevKey) {
        out.push({ i: i, t: mode === 'y' ? String(d.getUTCFullYear()) : (mode === 'm' ? (d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()]) : MON[d.getUTCMonth()] + ' ' + d.getUTCDate()) });
      }
      prevKey = key;
    }
    var keep = Math.ceil(out.length / maxN);
    if (keep > 1) {
      if (mode === 'y') out = out.filter(function (L) { return (+L.t) % keep === 0; });
      else out = out.filter(function (L, k) { return k % keep === 0; });
    }
    return out;
  }
  function win(k) {
    var b = lastIdx(), first = k ? S(k).first : 0;
    var a = RANGE === 'All' ? first : Math.max(first, b - RANGE_N[RANGE] + 1);
    if (b - a < 20) a = Math.max(0, b - 20);
    return [a, b];
  }


  var KSRC = 'pc';



  function spellIdx(k, kind) {
    var map = {}, out = [];
    DATA.dates.forEach(function (d, i) { map[d] = i; });
    (DATA.events[k][kind] || []).forEach(function (e) { if (map[e.start] != null) out.push(map[e.start]); });
    return out;
  }


  function gauge(p, k) {
    var ZCOL = ['#2F6F69', '#3E5F5C', '#3A3F4B', '#8A5148', '#C0574F'], edges = [0].concat(DATA.ln).concat([100]), bands = [];
    if (k && S(k).flip) ZCOL = ZCOL.slice().reverse();
    for (var zb = 0; zb < edges.length - 1; zb++) bands.push([edges[zb], edges[zb + 1], ZCOL[Math.min(zb, ZCOL.length - 1)]]);
    var pn = Math.min(99.5, Math.max(0.5, p == null ? 50 : p));
    var lab = pn > 86 ? 'right:calc(' + (100 - pn) + '% - 6px)' : 'left:calc(' + pn + '% - 14px)';
    var g = '<div class="gauge" aria-hidden="true"><div class="g-labs"><span class="g-lab g-lab-now" style="' + lab + (pn > 86 ? ';left:auto' : '') + '">now ' + ord(p) + '</span></div><span class="g-bar">';
    bands.forEach(function (bd) { g += '<span class="g-band" style="left:' + bd[0] + '%;width:' + (bd[1] - bd[0]) + '%;background:' + bd[2] + '"></span>'; });
    g += '<span class="g-m g-m-now" style="left:' + pn + '%"></span></span><div class="g-ticks">';
    [0, 50, 100].forEach(function (t) { g += '<span class="g-t" style="left:calc(' + t + '% - ' + (t >= 100 ? 19 : t ? 6 : 0) + 'px)">' + t + '</span>'; });
    g += '</div><span class="g-cap">percentile among ' + winWord(curSer()) + (k && S(k).flip ? ' · red = fear (VIX calls in demand), teal = calm' : ' · teal = calm (few puts), red = fear (many puts)') + '</span></div>';
    return g;
  }
  function renderHero() {
    var k = curSer(), s = S(k), i = nowIdx(k), sfx = i === s.sf, live = sfx && sfLive(k), rl = at(k, 'rl', i), r1 = at(k, 'r1', i), p = at(k, 'pct', i), z = zoneOf(p);
    var prev = at(k, 'rl', s.last === i ? i - 1 : s.last), sfInfo = s.sf_info || {};
    document.querySelectorAll('[data-sername]').forEach(function (e) { e.textContent = s.short; });
    $('sub1').textContent = s.label + ' — ' + s.what;
    var h = '<div class="hero-num"><span class="hero-k">put/call' + (live ? ' so far' : '') + '</span> ' + f2(rl) + '</div>' +
      '<div class="hero-date">' + fdate(DATA.dates[i], true) + (sfx ? (live ? ' so far, from the 15-minute chains' + (sfInfo.t ? ' · as of ' + sfInfo.t + ' ET' : '')
        : sfInfo.closed ? ' close from the 15-minute chains (official numbers post later)' : ' last 15-minute chains snapshot' + (sfInfo.t ? ' (' + sfInfo.t + ' ET)' : '') + ' · official numbers post later') : ' close') + '</div>' +
      '<p class="hero-move">' + (live ? 'today so far' : 'that day alone') + ' <b>' + f2(r1) + '</b>' + (prev != null ? ' · put/call line ' + (sfx ? 'at the last official close ' : 'the session before ') + f2(prev) : '') + '</p>' +
      '<p class="hero-pct"><span class="hp-b">' + ord(p) + ' percentile</span> among ' + winWord(k) + '</p>' + gauge(p, k) +
      '<p class="hero-move">' + ctxLine(i) + '</p>';
    $('hero').innerHTML = h;
    if (p == null || rl == null) {
      $('zoneLine').innerHTML = '<span class="zw">No reading</span> — a session is missing from ' + s.short + "'s recent days (" + fdate(DATA.dates[i], true) + ')';
      return;
    }
    $('zoneLine').innerHTML = '<span class="zw ' + zc(k, z) + '">' + zw(k, z) + (live ? ' so far today' : sfx ? (sfInfo.closed ? ' at the chains close' : ' at the last chains snapshot') : '') + '</span> — ' + s.short + ' put/call ' + f2(rl) + ', ' +
      (p >= 50 ? 'more puts than on ' + Math.round(p) + '% of ' + winWord(k) : 'fewer puts than on ' + Math.round(100 - p) + '% of ' + winWord(k)) +
      ' <span class="zone-key">(usual range ' + f2(at(k, 'lo', i)) + ' to ' + f2(at(k, 'hi', i)) + ')</span>';
  }
  function fearSide(pct, flip) {
    return pct.map(function (v) { return v != null && (flip ? v <= DATA.ln2.lo : v >= DATA.ln2.hi); });
  }



  function view(k) {
    var s = S(k);
    if (TF === '1D') {
      var nowI = nowIdx(k), sfOn = nowI === s.sf, Pc = pxArr();
      var soI = DATA.so_far ? DATA.dates.indexOf(DATA.so_far) : -1, pxN = lastIdx();
      while (pxN > 0 && Pc[pxN] == null) pxN--;
      return { tf: '1D', dates: DATA.dates, n: DATA.dates.length, first: s.first, nowI: nowI, closedI: s.last,
        r: full(k, 'rl'), r1: full(k, 'r1'), pct: full(k, 'pct'), lo: full(k, 'lo'), hi: full(k, 'hi'),
        peaks: s.peaks || [], turns: s.turns || [], lows: (DATA.lows && DATA.lows[SIDE]) || [],
        c: pxArr(), o: null, kpc: { K: full(k, 'K'), D: full(k, 'D'), J: full(k, 'J'), up: s.kup || [], dn: s.kdn || [] }, kpx: DATA.kp[SIDE],
        pxGhost: soI >= 0 ? soI : null, pxNow: pxN, pxOpen: soI >= 0 && soI === pxN,
        rGhost: sfOn ? s.sf : null, r1Ghost: s.sf != null ? s.sf : null, rOpen: sfOn, sfLive: sfOn && sfLive(k),
        sfStale: sfOn && !sfLive(k) && !(s.sf_info || {}).closed, win: winWord(k), day: function (i) { return i; } };
    }
    var B = DATA.tf && DATA.tf[TF];
    if (!B) { TF = '1D'; return view(k); }
    var T = B.series[k], P0 = B.px[SIDE], n = B.d1.length, dmap = {};
    DATA.dates.forEach(function (d, i) { dmap[d] = i; });
    var t = T || { r: [], pct: [], lo: [], hi: [], K: [], D: [], J: [], up: [], dn: [], peaks: [], turns: [], first: n - 1, last: n - 1, open: false };
    return { tf: TF, dates: B.d1, d0: B.d0, n: n, first: t.first, nowI: t.last, closedI: t.open ? t.last - 1 : t.last,
      r: t.r, r1: null, pct: t.pct, lo: t.lo, hi: t.hi, peaks: t.peaks, turns: t.turns, lows: B.lows[SIDE] || [], kpc: t, kpx: P0,
      o: P0.o, h: P0.h, l: P0.l, c: P0.c, pxGhost: B.open_from != null ? B.open_from : (B.open ? n - 1 : null), pxNow: n - 1, pxOpen: B.open,
      rGhost: t.open ? t.last : null, rOpen: t.open, win: 'past ' + ({ '1W': 'weeks', '2W': '2-week periods', '1M': 'months' })[TF], day: function (j) { return dmap[B.d1[j]]; } };
  }
  function periodWord(V, j, cap) {
    if (V.tf === '1D') return fdate(V.dates[j], true);
    var d0 = V.d0[j];
    if (V.tf === '1W') return (cap ? 'Week of ' : 'the week of ') + fshort(d0) + ', ' + d0.slice(0, 4);
    if (V.tf === '2W') return (cap ? '2 weeks from ' : 'the 2 weeks from ') + fshort(d0) + ', ' + d0.slice(0, 4);
    return MON_LONG[+d0.slice(5, 7) - 1] + ' ' + d0.slice(0, 4);
  }
  var MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function renderMain() {
    var k = curSer(), s = S(k), V = view(k), per = TF_PER[TF], n = V.n;
    var b = n - 1, a = RANGE === 'All' ? V.first : Math.max(V.first, b - Math.ceil(RANGE_N[RANGE] / per) + 1);
    if (b - a < 12) a = Math.max(0, b - 12);
    var hiC = s.flip ? C.cold : C.hot, loC = s.flip ? C.hot : C.cold;
    document.querySelectorAll('#main [data-span]').forEach(function (e) {
      e.textContent = (RANGE === 'All' || a === V.first ? 'since ' + fmon(V.dates[V.first]) : RANGE_WORD[RANGE]) + (TF === '1D' ? '' : ' · ' + TF_WORD[TF]);
    });
    var KJ = KSRC === 'px' ? V.kpx : V.kpc;
    var tint = {};
    KJ.up.forEach(function (i) {
      var zd = dz(k, zoneOf(V.pct[i]));
      tint[i] = zd == null ? '#8A8F9E' : zd >= 3 ? C.up : zd <= 1 ? C.down : '#8A8F9E';
    });
    var kNow = KSRC === 'px' ? V.pxNow : V.nowI, kOpen = KSRC === 'px' ? V.pxOpen : V.rOpen;
    var kdjItems = [
      { t: 'hline', y: DATA.kz[0], color: C.muted, dash: '3 3', op: 0.7 }, { t: 'hline', y: DATA.kz[1], color: C.muted, dash: '3 3', op: 0.7 },
      { t: 'line', v: KJ.J, color: '#8A8F9E', w: 1, op: 0.8, ghostFrom: kOpen ? kNow : null },
      { t: 'line', v: KJ.K, color: '#4FC3F7', w: 1.5, ghostFrom: kOpen ? kNow : null }, { t: 'line', v: KJ.D, color: '#FFB74D', w: 1.5, ghostFrom: kOpen ? kNow : null }];
    if (KSRC === 'px') {
      kdjItems.push({ t: 'tri', idx: KJ.up, v: KJ.K, dir: 1, colors: tint, color: '#8A8F9E', r: 4 });
      kdjItems.push({ t: 'tri', idx: KJ.dn, v: KJ.K, dir: -1, color: 'rgba(138,143,158,.55)', r: 3 });
    } else {
      kdjItems.push({ t: 'tri', idx: KJ.up, v: KJ.K, dir: 1, color: s.flip ? C.up : C.down, r: 3.6 });
      kdjItems.push({ t: 'tri', idx: KJ.dn, v: KJ.K, dir: -1, color: s.flip ? C.down : C.up, r: 3.6 });
    }
    kdjItems.push({ t: 'now', i: kNow, v: KJ.K, hollow: kOpen });
    var priceItems = TF === '1D'
      ? [{ t: 'line', v: V.c, color: C.px, w: 1.3, ghostFrom: V.pxGhost }, { t: 'dots', idx: V.lows, v: V.c, color: C.calm, r: 3.4 }, { t: 'now', i: V.pxNow, v: V.c, hollow: V.pxOpen }]
      : [{ t: 'candles', o: V.o, h: V.h, l: V.l, c: V.c, ghost: V.pxGhost }, { t: 'dots', idx: V.lows, v: V.l, color: C.calm, r: 3.4 }, { t: 'now', i: V.pxNow, v: V.c, hollow: V.pxOpen }];
    var pcItems = [
      { t: 'mask', on: fearSide(V.pct, s.flip), fill: 'rgba(126,87,194,.20)' },
      { t: 'range', lo: V.lo, hi: V.hi, fill: 'rgba(126,87,194,.08)' },
      { t: 'line', v: V.hi, color: hiC, w: 1, dash: '3 3', op: 0.6 },
      { t: 'line', v: V.lo, color: loC, w: 1, dash: '3 3', op: 0.6 }];
    if (V.r1) pcItems.push({ t: 'line', v: V.r1, color: C.pcThin, w: 1, noScale: true, op: 0.6, ghostFrom: V.r1Ghost });
    pcItems.push({ t: 'line', v: V.r, color: C.pc, w: 1.9, ghostFrom: V.rGhost },
      { t: 'dots', idx: V.peaks, v: V.r, color: C.pk, r: 4 },
      { t: 'tri', idx: V.turns, v: V.r, dir: s.flip ? 1 : -1, color: C.white, r: 4.2 },
      { t: 'now', i: V.nowI, v: V.r, hollow: V.rOpen });
    drawChart($('c1'), {
      dates: V.dates, a: a, b: b,
      vlines: V.lows.map(function (i) { return { i: i, color: C.calm, op: 0.28 }; }),
      panes: [
        { h: 120, label: SIDE_LAB[SIDE] + (TF === '1D' ? '' : ' · ' + TF_WORD[TF].toUpperCase()), fmt: function (t) { return t >= 1000 ? (t / 1000).toFixed(1) + 'k' : t; }, items: priceItems },
        { h: 220, label: s.short + ' PUT/CALL' + (TF === '1D' ? '' : ' · EACH ' + ({ '1W': 'WEEK', '2W': '2 WEEKS', '1M': 'MONTH' })[TF]), fmt: function (t) { return t.toFixed(2); }, items: pcItems },
        { h: 70, label: 'PERCENTILE', fixed: [0, 100], ticks: [25, 50, 75], fmt: function (t) { return t; },
          items: [
            { t: 'hline', y: DATA.ln2.hi, color: hiC, dash: '4 3', op: 0.8 }, { t: 'hline', y: DATA.ln2.lo, color: loC, dash: '4 3', op: 0.8 },
            { t: 'line', v: V.pct, color: C.pl, w: 1.4, fill: 'rgba(126,87,194,.18)', ghostFrom: V.rGhost },
            { t: 'now', i: V.nowI, v: V.pct, hollow: V.rOpen }] },
        { h: 120, label: 'KDJ · ' + (KSRC === 'px' ? SIDE + ' PRICE' : s.short + ' PUT/CALL') + (TF === '1D' ? '' : ' · ' + TF_WORD[TF].toUpperCase()),
          fmt: function (t) { return Math.round(t); }, items: kdjItems }
      ],
      onHover: function (i) { readout1(i == null ? V.nowI : i, i == null, KJ, V); }
    });
    var unit = TF === '1D' ? '' : ({ '1W': 'week', '2W': '2-week period', '1M': 'month' })[TF];
    $('lg1').innerHTML = '<span class="lg-i"><span class="lg-px"></span>' + SIDE + (TF === '1D' ? '' : ' ' + unit + ' candles') + '</span><span class="lg-i"><span class="lg-calm"></span>' + SIDE + ' swing low' + (TF === '1D' ? '' : ' (in that ' + unit + ')') + ', with a line through every pane</span>' +
      '<span class="lg-i"><span class="lg-ln"></span>' + (TF === '1D' ? 'put/call line' : 'put/call of each ' + unit) + '</span>' + (TF === '1D' ? '<span class="lg-i"><span class="lg-ln thin"></span>that day</span>' : '') +
      '<span class="lg-i"><span class="lg-band"></span>' + (s.flip ? 'low end of its range (the fear side here)' : 'high end of its range (the fear side)') + '</span>' +
      '<span class="lg-i"><span class="lg-pk"></span>' + (s.flip ? 'low' : 'peak') + ' (hindsight: the ' + (s.flip ? 'lowest' : 'highest') + ' reading for weeks either side' + (TF === '1D' ? '' : ', in that ' + unit) + ')</span>' +
      '<span class="lg-i"><span class="lg-turn"></span>the day the turn is known (' + (s.flip ? 'well up off the low' : 'well off the high') + ')' + (TF === '1D' ? '' : ', in that ' + unit) + '</span>' +
      '<span class="lg-i"><span class="lg-k"></span>K</span><span class="lg-i"><span class="lg-d"></span>D</span><span class="lg-i"><span class="lg-j"></span>J</span>' +
      (KSRC === 'px' ? '<span class="lg-i"><span class="lg-tri g"></span>golden cross on a ' + DATA.zones[3] + ' or ' + DATA.zones[4] + ' day</span><span class="lg-i"><span class="lg-tri r"></span>golden cross on a ' + DATA.zones[1] + ' or ' + DATA.zones[0] + ' day</span><span class="lg-i"><span class="lg-tri n"></span>golden cross on a ' + DATA.zones[2] + ' day</span>'
        : '<span class="lg-i"><span class="lg-tri r"></span>K over D: puts rising</span><span class="lg-i"><span class="lg-tri g"></span>K under D: puts easing</span>') +
      '<span class="lg-i"><span class="lg-now"></span>now' + ((TF === '1D' ? V.sfLive : V.rOpen) || V.pxOpen ? ' (hollow + dotted = so far, as if it closed now)'
        : (TF === '1D' && V.rOpen ? ' (hollow + dotted = from the 15-minute chains; official numbers post later)' : '')) + '</span>';
    document.querySelectorAll('#kdjSrc button').forEach(function (x) {
      x.setAttribute('aria-pressed', x.getAttribute('data-k') === KSRC ? 'true' : 'false');
      if (x.getAttribute('data-k') === 'px') x.textContent = SIDE + ' price';
    });
    document.querySelectorAll('#tfs button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-tf') === TF ? 'true' : 'false'); });

    var tl = $('tfLine');
    if (TF === '1D') { tl.innerHTML = ''; tl.hidden = true; }
    else {
      var j = V.nowI, pj = V.pct[j], zj = zoneOf(pj);
      tl.hidden = false;
      tl.innerHTML = V.r[j] == null ? 'No ' + s.short + ' reading for ' + periodWord(V, j) + ' yet.'
        : '<b>' + periodWord(V, j, true) + (V.rOpen ? ' so far, as if it closed now' : '') + ':</b> ' + s.short + ' put/call ' + f2(V.r[j]) +
          ' · <span class="pc">' + ord(pj) + ' percentile</span> among ' + V.win + ' · <span class="zw ' + zc(k, zj) + '">' + zw(k, zj) + '</span>';
    }
  }
  function readout1(i, resting, KJ, V) {
    var k = curSer(), s0 = S(k), tags = [];
    V = V || view(k);
    var open = (V.tf === '1D' ? (V.sfLive && i === V.nowI) : (V.rOpen && i === V.nowI)) || (V.pxOpen && i === V.pxNow), r = V.r[i], p = V.pct[i], z = zoneOf(p), c = V.c[i];
    var chainsClose = V.tf === '1D' && V.rOpen && !V.sfLive && i === V.nowI, chainsSnap = chainsClose && V.sfStale;
    var prevC = null; for (var q = i - 1; q >= 0 && q >= i - 5; q--) if (V.c[q] != null) { prevC = V.c[q]; break; }
    var mv = prevC && c ? (c / prevC - 1) * 100 : null;
    if (V.lows.indexOf(i) >= 0) tags.push('<span class="cold">' + SIDE + ' swing low</span>');
    if (V.peaks.indexOf(i) >= 0) tags.push('<span class="pk">put/call ' + (s0.flip ? 'low' : 'peak') + '</span>');
    if (V.turns.indexOf(i) >= 0) tags.push('<b>turn known</b>');
    var kd = KJ && KJ.K[i] != null ? ' · KDJ ' + Math.round(KJ.K[i]) + ' / ' + Math.round(KJ.D[i]) + ' / ' + Math.round(KJ.J[i]) +
      (KJ.up.indexOf(i) >= 0 ? (KSRC === 'px' ? ' <span class="up">golden cross</span>' : ' K over D') : KJ.dn.indexOf(i) >= 0 ? ' K under D' : '') : '';
    var di = V.day(i);
    var h = '<span class="d">' + periodWord(V, i, true) + (open ? ' (so far)' : chainsSnap ? ' (last chains snapshot)' : chainsClose ? ' (chains close)' : '') + '</span>' +
      (r != null ? ' · put/call <span class="vx">' + f2(r) + '</span> · <span class="pc">' + ord(p) + ' percentile</span> <span class="' + zc(k, z) + '">' + zw(k, z) + '</span>' +
        (V.r1 && V.r1[i] != null ? ' · that day ' + f2(V.r1[i]) : '') : ' · no ' + s0.short + ' reading') +
      ' · ' + SIDE + ' ' + f2(c) + (mv != null ? ' <span class="' + (mv >= 0 ? 'up' : 'down') + '">' + sgn(mv, 2) + '%</span>' : '') +
      (di != null ? ' · <span class="muted">' + ctxLine(di).replace(SIDE + ' ', '') + '</span>' : '') +
      kd + (tags.length ? ' · ' + tags.join(' · ') : '') +
      (resting ? ' <span class="muted">· hover the chart for any ' + (V.tf === '1D' ? 'day' : ({ '1W': 'week', '2W': '2 weeks', '1M': 'month' })[V.tf]) + '</span>' : '');
    $('ro1').innerHTML = h;
  }


  function eraOf(k) { var e = S(k).eras; return ERA[k] && e.indexOf(ERA[k]) >= 0 ? ERA[k] : e[0]; }
  function renderOdds() {
    var k = curSer(), s = S(k), e = eraOf(k), rows = DATA.odds[SIDE][k][e], i = s.last, z = zoneOf(at(k, 'pct', i));
    var all = rows[rows.length - 1], me = z == null ? null : rows[z];
    $('eras').innerHTML = s.eras.map(function (x) { return '<button type="button" data-era="' + esc(x) + '" aria-pressed="' + (x === e) + '">' + esc(x) + '</button>'; }).join('');
    $('eras').querySelectorAll('button').forEach(function (bt) { bt.addEventListener('click', function () { ERA[k] = bt.getAttribute('data-era'); renderOdds(); }); });
    $('sub2').textContent = SIDE + ' after each zone of the ' + s.short + ' put/call, closed days ' + (e === '2021+' ? 'since Jan 2021' : 'since Jan 2013') + ', bought at the next close';
    function cmp(v, base, worse) { if (v == null || base == null) return ''; var d = v - base; if (Math.abs(d) < (worse ? 0.02 : 0.003)) return ''; return (worse ? d > 0 : d < 0) ? 'neg' : 'pos'; }
    var h = '<thead><tr><th>Zone</th><th>Days<span class="vs">spells</span></th><th class="wide-only">1 week</th><th>1 month</th><th class="wide-only">Up after 1 month</th><th>3 months</th><th class="wide-only">Up after 3 months</th><th>5% dip within a month</th><th class="wide-only">Worst close in a month</th><th>Each spell once<span class="vs">1 month · dipped 5%</span></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var isAll = r.z === 'all', nm = isAll ? 'Any day' : zw(k, r.z), rng = isAll || r.z !== z ? '' : 'today';
      h += '<tr class="' + (isAll ? 'all' : (r.z === z ? 'today' : '')) + '"><td><span class="zn ' + (isAll ? '' : (zc(k, r.z) ? 'zw ' + zc(k, r.z) : '')) + '">' + nm + '</span>' + (rng ? '<span class="vs">' + rng + '</span>' : '') + '</td>' +
        '<td>' + r.days + (isAll ? '' : '<span class="vs">' + r.ep + '</span>') + '</td>' +
        '<td class="wide-only ' + (isAll ? '' : cmp(r.f5, all.f5)) + '">' + pct(r.f5) + '</td>' +
        '<td class="' + (isAll ? '' : cmp(r.f21, all.f21)) + '">' + pct(r.f21) + '</td>' +
        '<td class="wide-only">' + pc0(r.up21) + '</td>' +
        '<td class="' + (isAll ? '' : cmp(r.f63, all.f63)) + '">' + pct(r.f63) + '</td>' +
        '<td class="wide-only">' + pc0(r.up63) + '</td>' +
        '<td class="' + (isAll ? '' : cmp(r.dip21, all.dip21, true)) + '">' + pc0(r.dip21) + '</td>' +
        '<td class="wide-only">' + pct(r.dd21) + '</td>' +
        '<td>' + (isAll ? '' : pct(r.ep_f21) + '<span class="vs">' + (r.ep_ndip ? r.ep_dips + ' of ' + r.ep_ndip : '–') + '</span>') + '</td></tr>';
    });
    $('oddsTbl').innerHTML = h + '</tbody>';
    var st = '<div class="as-k">Last close ' + fshort(DATA.dates[i]) + ' · ' + esc(s.short) + ' put/call ' + f2(at(k, 'rl', i)) + '</div><div class="as-v ' + zc(k, z) + '">' + zw(k, z) + '</div>' +
      '<p class="as-why">' + ord(at(k, 'pct', i)) + ' percentile among ' + winWord(k) + '. ' + ctxLine(i) + '. ' + (z == null ? 'No reading on the latest day.' : me && me.days ? 'Days in this zone (' + me.days + ' days, ' + me.ep + ' spells, ' + e + ') vs any day:' : 'No closed days in this zone yet for ' + e + '.') + '</p>';
    if (me && me.days) {
      st += '<div class="as-row"><span>' + SIDE + ' 1 month later</span><span>' + pct(me.f21) + ' <span class="muted">vs ' + pct(all.f21) + '</span></span></div>' +
        '<div class="as-row"><span>' + SIDE + ' 3 months later</span><span>' + pct(me.f63) + ' <span class="muted">vs ' + pct(all.f63) + '</span></span></div>' +
        '<div class="as-row"><span>5% dip within a month</span><span>' + pc0(me.dip21) + ' <span class="muted">vs ' + pc0(all.dip21) + '</span></span></div>' +
        '<div class="as-row"><span>Each spell once: dipped 5%</span><span>' + (me.ep_ndip ? me.ep_dips + ' of ' + me.ep_ndip + ' spells' : '–') + '</span></div>';
    }
    var se = DATA.setup && DATA.setup[SIDE] && DATA.setup[SIDE][e === '2013+' ? '2013+' : '2021+'];
    if (se) {
      st += '<p class="as-why" style="margin-top:10px">Days with today\'s price setup, any put/call (' + se.words.join(', ') + '; ' + se.days + ' days, ' + (e === '2013+' ? '2013+' : '2021+') + '):</p>' +
        '<div class="as-row"><span>' + SIDE + ' 1 month later</span><span>' + pct(se.f21) + '</span></div>' +
        '<div class="as-row"><span>' + SIDE + ' 3 months later</span><span>' + pct(se.f63) + '</span></div>' +
        '<div class="as-row"><span>5% dip within a month</span><span>' + pc0(se.dip21) + '</span></div>';
    }
    $('actState').innerHTML = st;
    $('oddsNote').textContent = 'Medians over days; the last column counts each spell once, from its first day. A spell = a run of days in the zone; a short break outside it does not start a new one. Green / red = better / worse than any day. Price setup = days whose last month\'s move, distance from the 1-year high and VIX percentile were like today\'s.';
  }


  function renderLive() {
    if (!LIVE || !LIVE.syms) { $('liveTiles').innerHTML = '<div class="empty">Today\'s path is not available yet.</div>'; $('c3').innerHTML = ''; return; }
    var order = SIDE === 'SPY' ? ['SPY', 'SPX', 'QQQ', 'NDX'] : ['QQQ', 'NDX', 'SPY', 'SPX'];
    var t = '';
    order.forEach(function (sym) {
      var v = LIVE.syms[sym];
      if (!v || !v.path || !v.path.length) { t += '<div class="tile off"><span class="tk">' + sym + '</span><span class="tv">–</span></div>'; return; }
      var last = v.path[v.path.length - 1], cp = sym === 'SPX' ? v.cp : null;
      var when = v.closed ? fshort(v.session) + ' close' : (v.live ? 'so far · ' + v.t + ' ET' : fshort(v.session) + ' ' + v.t + ' ET');
      t += '<div class="tile"><span class="tk">' + sym + ' · ' + when + '</span><span class="tv">' + f2(v.r) + '</span>' +
        (cp != null ? '<span class="tp">' + ord(cp) + '</span>' : '') +
        '<span class="ts">same-day expiries <b>' + f2(last.r0) + '</b> · later <b>' + f2(last.rx) + '</b></span>' +
        '<span class="ts">premium <b>' + f2(v.prem_r) + '</b> · ' + fint(last.v) + ' contracts</span></div>';
    });
    $('liveTiles').innerHTML = t;
    var newest = ''; Object.keys(LIVE.syms).forEach(function (sym) { var v = LIVE.syms[sym]; if (v && v.session > newest) newest = v.session; });
    var pair0 = SIDE === 'SPY' ? ['SPY', 'SPX'] : ['QQQ', 'NDX'], cols0 = [C.pc, C.x];
    var pair = [], cols = [], behindNote = [];
    pair0.forEach(function (sym, j) {
      var v = LIVE.syms[sym];
      if (v && v.session === newest && v.path && v.path.length) { pair.push(sym); cols.push(cols0[j]); }
      else behindNote.push(sym + (v && v.session ? ': last path ' + fshort(v.session) : ': no path'));
    });
    if (!pair.length) { $('c3').innerHTML = '<div class="empty">No path for ' + pair0.join(' or ') + ' yet.</div>'; $('lg3').innerHTML = ''; $('ro3').innerHTML = ''; return; }

    function mins(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]) - 570; }
    var hiM = 0;
    pair.forEach(function (sym) { var v = LIVE.syms[sym]; (v && v.path || []).forEach(function (r) { hiM = Math.max(hiM, mins(r.t)); }); });
    var N = Math.max(390, hiM) + 1, times = [];
    for (var m = 0; m < N; m++) { var hh = Math.floor((m + 570) / 60), mm = (m + 570) % 60; times.push(hh + ':' + (mm < 10 ? '0' : '') + mm); }
    function series(sym, key) { var out = new Array(N).fill(null), v = LIVE.syms[sym]; (v && v.path || []).forEach(function (r) { var j = mins(r.t); if (j >= 0 && j < N) out[j] = r[key]; }); return out; }
    function lastAt(arr, j) { for (var q = j; q >= 0; q--) if (arr[q] != null) return arr[q]; return null; }
    var items = [];
    pair.forEach(function (sym, j) {
      var r = series(sym, 'r'), r0 = series(sym, 'r0'), li = -1;
      r.forEach(function (x, q) { if (x != null) li = q; });
      items.push({ t: 'line', v: r, color: cols[j], w: 1.9, join: true });
      items.push({ t: 'line', v: r0, color: cols[j], w: 1.1, dash: '4 3', op: 0.75, join: true });
      if (li >= 0) items.push({ t: 'dots', idx: [li], v: r, color: cols[j], r: 3.4 });
    });
    var mdSym = pair.filter(function (x) { return x === 'SPX' && LIVE.syms[x] && LIVE.syms[x].md != null; })[0];
    if (mdSym) items.push({ t: 'hline', y: LIVE.syms[mdSym].md, color: C.muted, dash: '1 3', label: mdSym + ' median day ' + f2(LIVE.syms[mdSym].md) });
    drawChart($('c3'), {
      dates: times, a: 0, b: N - 1,
      labels: function () { var out = []; for (var m2 = 30; m2 < N; m2 += 60) { var h = Math.floor((m2 + 570) / 60); out.push({ i: m2, t: (h > 12 ? h - 12 : h) + (h >= 12 ? ' pm' : ' am') }); } return out; },
      panes: [{ h: 200, label: 'PUT/CALL SINCE THE OPEN', fmt: function (t) { return t.toFixed(2); }, items: items }],
      onHover: function (i) {
        var j = i == null ? N - 1 : i, h = '<span class="d">' + (i == null ? 'Latest' : times[j] + ' ET') + '</span>';
        pair.forEach(function (sym, n) { var a = lastAt(series(sym, 'r'), j), z = lastAt(series(sym, 'r0'), j); h += ' · <span style="color:' + cols[n] + ';font-weight:700">' + sym + ' ' + f2(a) + '</span> <span class="muted">same-day ' + f2(z) + '</span>'; });
        $('ro3').innerHTML = h + (i == null ? ' <span class="muted">· ' + fdate(newest, true) + (behindNote.length ? ' · ' + esc(behindNote.join(' · ')) : '') + ' · hover for any time</span>' : '');
      }
    });
    $('lg3').innerHTML = pair.map(function (sym, j) { return '<span class="lg-i"><span class="lg-ln" style="border-top-color:' + cols[j] + '"></span>' + sym + ' all expiries</span><span class="lg-i"><span class="lg-0" style="border-top-color:' + cols[j] + '"></span>' + sym + ' same-day expiries</span>'; }).join('') +
      '<span class="lg-i">tile % = rank of the ratio so far among SPX\'s past closed days</span>';
  }


  function spark(k) {
    var s = S(k), b = s.last, a = Math.max(s.first, b - 251), r = full(k, 'rl'), bl = full(k, 'lo'), bh = full(k, 'hi');
    var lo = Infinity, hi = -Infinity;
    for (var i = a; i <= b; i++) [r[i], bl[i], bh[i]].forEach(function (v) { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    if (!isFinite(lo)) return '';
    var W = 200, H = 34, pad = (hi - lo) * 0.08 || 0.01; lo -= pad; hi += pad;
    function X(i) { return (i - a) / Math.max(1, b - a) * (W - 4) + 2; }
    function Y(v) { return H - 2 - (v - lo) / (hi - lo) * (H - 4); }
    function path(arr, col, wd, dash) { var d = '', pen = false; for (var i = a; i <= b; i++) { if (arr[i] == null) { pen = false; continue; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(arr[i]).toFixed(1); pen = true; } return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + wd + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' + path(bh, S(k).flip ? C.cold : C.hot, 0.8, '2 2') + path(bl, S(k).flip ? C.hot : C.cold, 0.8, '2 2') + path(r, C.pc, 1.5) +
      '<circle cx="' + X(b).toFixed(1) + '" cy="' + Y(r[b]).toFixed(1) + '" r="2.4" fill="#fff"/></svg>';
  }
  function renderGauges() {
    var keys = DATA.side[SIDE].slice();
    Object.keys(DATA.series).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    $('gTiles').innerHTML = keys.map(function (k) {
      var s = S(k), i = nowIdx(k), p = at(k, 'pct', i), z = zoneOf(p);
      return '<button type="button" class="gtile" data-k="' + k + '" aria-pressed="' + (k === curSer()) + '"><span class="gk"><b>' + esc(s.short) + (sfTag(k) ? ' ' + sfTag(k) : '') + '</b><span>' + (i === s.sf ? 'chains' : 'Cboe') + ' · ' + fshort(DATA.dates[i]) + '</span></span>' +
        '<span class="gv">' + f2(at(k, 'rl', i)) + '<span class="tp">' + ord(p) + '</span></span> <span class="gz ' + (zc(k, z) || 'mid') + '">' + zw(k, z) + '</span>' +
        spark(k) + '<span class="gw">' + esc(s.what) + '</span></button>';
    }).join('');
    $('gTiles').querySelectorAll('.gtile').forEach(function (bt) {
      bt.addEventListener('click', function () {
        var k = bt.getAttribute('data-k');
        if (DATA.side[SIDE].indexOf(k) < 0) { setSide(SIDE === 'SPY' ? 'QQQ' : 'SPY', true); }
        setSer(k); renderAll(); $('main').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }


  function renderHeld() {
    var keys = ['spx', 'tot', 'eq', 'etp'].filter(function (k) { return S(k) && S(k).oi_first != null; });
    if (!keys.length) { $('c6').innerHTML = ''; return; }
    var first = S(keys[0]).oi_first, b = lastIdx(), w = win(null), a = Math.max(first, w[0]);
    if (b - a < 20) a = Math.max(first, b - 20);
    var t = keys.map(function (k) {
      var i = S(k).last;
      return '<div class="tile"><span class="tk" style="color:' + C.oi[k] + '">' + S(k).short + ' held</span><span class="tv" style="color:' + C.oi[k] + '">' + f2(at(k, 'oi', i)) + '</span><span class="tp">' + ord(at(k, 'oi_pct', i)) + '</span><span class="ts">puts open per call open</span></div>';
    });
    ['SPY', 'QQQ'].forEach(function (sym) {
      var v = LIVE && LIVE.syms && LIVE.syms[sym];
      if (v && v.oi_r) t.push('<div class="tile"><span class="tk">' + sym + ' held (chain)</span><span class="tv">' + f2(v.oi_r) + '</span><span class="ts">open interest from the ' + fshort(v.session) + ' chain</span></div>');
    });
    $('heldTiles').innerHTML = t.join('');
    var P = pxArr();
    drawChart($('c6'), {
      dates: DATA.dates, a: a, b: b,
      panes: [
        { h: 100, label: SIDE_LAB[SIDE], fmt: function (x) { return x >= 1000 ? (x / 1000).toFixed(1) + 'k' : x; }, items: [{ t: 'line', v: P, color: C.px, w: 1.3 }] },
        { h: 200, label: 'OPEN PUTS ÷ OPEN CALLS', fmt: function (x) { return x.toFixed(2); },
          items: keys.map(function (k) { return { t: 'line', v: full(k, 'oi'), color: C.oi[k], w: 1.7 }; }) }
      ],
      onHover: function (i) {
        var j = i == null ? b : i, h = '<span class="d">' + fdate(DATA.dates[j], true) + '</span>';
        keys.forEach(function (k) { h += ' · <span style="color:' + C.oi[k] + ';font-weight:600">' + S(k).short + ' ' + f2(at(k, 'oi', j)) + '</span>'; });
        $('ro6').innerHTML = h + (i == null ? ' <span class="muted">· hover for any day</span>' : '');
      }
    });
    $('lg6').innerHTML = keys.map(function (k) { return '<span class="lg-i"><span class="lg-ln" style="border-top-color:' + C.oi[k] + '"></span>' + S(k).label + '</span>'; }).join('') + '<span class="lg-i">tile % = rank among past sessions</span>';
  }


  function renderEps() {
    var k = curSer(), s = S(k), list = (DATA.events[k][EPK] || []).slice().reverse();
    $('sub7').textContent = s.short + ' put/call in its ' + (EPK === 'fear' ? DATA.zones[DATA.zones.length - 1] : DATA.zones[0]).toLowerCase() + ' zone' + (s.flip ? ', read the other way round: few VIX puts = VIX calls in demand' : '') + '. A new spell starts only after a long break outside the zone; outcomes from the close after its first day.';
    var lastD = DATA.dates[s.last];
    var h = '<thead><tr><th>First day</th><th>Last day</th><th>Days</th><th>SPY 1 month</th><th>SPY 3 months</th><th class="wide-only">SPY worst in a month</th><th>QQQ 1 month</th><th>QQQ 3 months</th><th class="wide-only">QQQ worst in a month</th></tr></thead><tbody>';
    if (!list.length) h += '<tr><td colspan="9">No spells yet.</td></tr>';
    list.forEach(function (e) {
      var open = !!e.open;
      function c(x) { return '<td class="' + (x == null ? '' : x >= 0 ? 'pos' : 'neg') + '">' + pct(x) + '</td>'; }
      h += '<tr class="' + (open ? 'open' : '') + '"><td>' + fdate(e.start) + '</td><td>' + fshort(e.end) + '</td><td>' + e.days + '</td>' + c(e.SPY.f21) + c(e.SPY.f63) +
        '<td class="wide-only">' + pct(e.SPY.dd21) + '</td>' + c(e.QQQ.f21) + c(e.QQQ.f63) + '<td class="wide-only">' + pct(e.QQQ.dd21) + '</td></tr>';
    });
    $('epTbl').innerHTML = h + '</tbody>';
  }


  function renderTable() {
    var keys = DATA.side[SIDE], b = lastIdx(), P = pxArr();
    var h = '<thead><tr><th>Day</th><th>' + SIDE + '</th>' + keys.map(function (k, j) { return '<th class="' + (j > 3 ? 'wide-only' : '') + '">' + S(k).short + '<span class="vs" style="display:block;font-weight:400">put/call · pct</span></th>'; }).join('') + '</tr></thead><tbody>';
    for (var i = b; i > b - 30 && i >= 0; i--) {
      var soP = DATA.so_far && DATA.dates[i] === DATA.so_far;
      h += '<tr><td>' + fdate(DATA.dates[i], true).replace(/, \d+$/, '') + '</td><td>' + f2(P[i]) + (soP ? ' <span class="sf-tag">so far</span>' : '') + '</td>' + keys.map(function (k, j) {
        var r = at(k, 'rl', i), p = at(k, 'pct', i), z = zoneOf(p);
        return '<td class="' + (j > 3 ? 'wide-only' : '') + '">' + (r == null ? '–' : f2(r) + ' <span class="' + (zc(k, z) || 'muted') + '">' + ord(p) + '</span>' + (i === S(k).sf ? ' ' + sfTag(k) : '')) + '</td>';
      }).join('') + '</tr>';
    }
    $('tbl').innerHTML = h + '</tbody>';
  }


  function renderSers() {
    var keys = DATA.side[SIDE];
    $('sers').innerHTML = keys.map(function (k) {
      var z = zoneOf(at(k, 'pct', nowIdx(k)));
      return '<button type="button" data-k="' + k + '" aria-pressed="' + (k === curSer()) + '" title="' + esc(S(k).label + ' — ' + S(k).what) + '"><span class="zd ' + zc(k, z) + '"></span>' + esc(S(k).short) + sfTag(k) + '</button>';
    }).join('');
    $('sers').querySelectorAll('button').forEach(function (bt) { bt.addEventListener('click', function () { setSer(bt.getAttribute('data-k')); renderAll(); }); });
  }


  var LAST_OK = Date.now();
  var ETZ = 'America/New_York';
  function etNow() {
    var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: ETZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + '-' + p.month + '-' + p.day, min: (+p.hour % 24) * 60 + (+p.minute), wd: p.weekday };
  }
  function phaseNow() {
    var e = etNow(), cal = (DATA && DATA.cal) || {}, shut = (cal.half || []).indexOf(e.date) >= 0 ? 780 : 960;
    if (e.wd === 'Sat' || e.wd === 'Sun' || (cal.off || []).indexOf(e.date) >= 0) return 'closed';
    return e.min >= 570 && e.min < shut ? 'regular' : 'closed';
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
  function liveSyms() { return LIVE && LIVE.syms ? LIVE.syms : {}; }
  function renderStatus() {
    var chip = $('chip'), built = new Date(DATA.built_utc), live = phaseNow() === 'regular', today = etNow().date;
    var L = liveSyms(), lt = L[SIDE];
    var pathAge = lt && lt.updated ? (Date.now() - new Date(lt.updated).getTime()) / 60000 : null;

    var behind = live && etNow().min >= 615 && (!lt || lt.session !== today || pathAge == null || pathAge > 55);
    var lost = (Date.now() - LAST_OK) / 60000 > 35;
    chip.className = 'chip ' + (lost ? 'chip-stale' : behind ? 'chip-late' : live ? 'chip-live' : 'chip-closed');
    chip.textContent = lost ? 'NO CONNECTION' : behind ? 'LATE' : live ? 'LIVE' : 'CLOSED';
    var A = DATA.asof || {};
    $('asof').innerHTML = 'Daily ratios to ' + fdate(A.cboe || DATA.dates[lastIdx()], true) + ' close' +
      (lt && lt.t ? ' · today\'s path ' + (lt.closed ? fshort(lt.session) + ' close' : lt.t + ' ET') : '');
    $('statusLine').innerHTML = '<span class="muted">Cboe posts each day\'s ratios in the evening ET; the path updates every 15 minutes in the session · updated ' + etLocal(built) +
      (behind ? ' · <b style="color:var(--amber)">today\'s path ' + (lt && lt.session === today ? 'is ' + Math.round(pathAge) + ' min old' : 'has not started for ' + fshort(today)) + '</b>' : '') +
      (lost ? ' · <b style="color:var(--amber)">no answer since ' + etLocal(new Date(LAST_OK)) + '</b>' : '') + '</span>';
  }


  var GH = /(^|\.)github\.io$/i.test(location.hostname);
  var RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/put-call-data/put-call/';
  var BASE = GH ? RAW : 'snap/';
  function getText(name) {
    function one(base) {
      return fetch(base + name, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('data ' + r.status); return r.text(); });
    }
    return one(BASE).catch(function (e) { if (BASE === RAW) throw e; BASE = RAW; return one(BASE); });
  }
  function getJson(name) { return getText(name).then(function (t) { return JSON.parse(t); }); }


  function prep(txt, man) {
    var doc = JSON.parse(txt);
    doc.sha = txt.length === man.bytes ? man.sha256 : null;
    doc.built_utc = doc.sha || !DATA ? man.generated_utc : DATA.built_utc;
    return doc;
  }
  function load() {
    return getJson('manifest.json').then(function (man) {
      return getText('put-call.json').then(function (txt) { return prep(txt, man); });
    });
  }

  function poll() {
    getJson('manifest.json').then(function (m) {
      LAST_OK = Date.now();
      if (DATA && m.sha256 && m.sha256 !== DATA.sha) {
        return getText('put-call.json').then(function (txt) {
          var y = window.scrollY; DATA = prep(txt, m); LIVE = DATA.live; CACHE = {}; normalize(); renderAll(); window.scrollTo(0, y);
        });
      }
      renderStatus();
    }).catch(function () { renderStatus(); });
  }


  function renderAll() {
    renderSers(); renderStatus(); renderHero(); renderMain(); renderOdds(); renderLive(); renderGauges(); renderHeld(); renderEps(); renderTable();
  }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {  } }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setUrl() {
    try {
      var u = new URL(location.href);
      u.searchParams.set('side', SIDE);
      u.searchParams.set('s', curSer());
      history.replaceState(null, '', u);
    } catch (e) {  }
  }
  function setSide(side, remember) {
    if (side !== 'SPY' && side !== 'QQQ') return;
    SIDE = side;
    document.querySelectorAll('#sides button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-side') === SIDE ? 'true' : 'false'); });
    if (remember) store('pcrSide', SIDE);
    setUrl();
  }
  function setSer(k) {
    if (!DATA.series[k] || DATA.side[SIDE].indexOf(k) < 0) return;
    SER[SIDE] = k;
    setUrl();
  }
  function init() {
    var q = {};
    try { var u = new URL(location.href); q.side = u.searchParams.get('side'); q.s = u.searchParams.get('s'); } catch (e) {  }
    var own = q.s ? ['SPY', 'QQQ'].filter(function (sd) { return DATA.side[sd].indexOf(q.s) >= 0; }) : [];
    var want = ((q.side || '') + '').toUpperCase();
    if (own.length === 1 && own[0] !== want) want = own[0];
    setSide(want || ((read('pcrSide') || 'SPY') + '').toUpperCase(), false);
    if (q.s) setSer(q.s);
    var r = read('pcrRange'); if (r && (RANGE_N[r] || r === 'All')) RANGE = r;
    var ks = read('pcrKdj'); if (ks === 'px' || ks === 'pc') KSRC = ks;
    var qt = null; try { qt = (new URL(location.href)).searchParams.get('tf'); } catch (e) {  }
    var tf = (qt || read('pcrTf') || '1D').toUpperCase(); if (TF_PER[tf] && (tf === '1D' || DATA.tf && DATA.tf[tf])) TF = tf;
    document.querySelectorAll('#ranges button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-range') === RANGE ? 'true' : 'false'); });
  }
  function wire() {
    document.querySelectorAll('#tfs button').forEach(function (bt) {
      bt.addEventListener('click', function () {
        TF = bt.getAttribute('data-tf');
        if (TF !== '1D' && !(DATA.tf && DATA.tf[TF])) TF = '1D';
        store('pcrTf', TF);
        try { var u = new URL(location.href); if (TF === '1D') u.searchParams.delete('tf'); else u.searchParams.set('tf', TF); history.replaceState(null, '', u); } catch (e) {  }
        renderMain();
      });
    });
    document.querySelectorAll('#kdjSrc button').forEach(function (bt) {
      bt.addEventListener('click', function () { KSRC = bt.getAttribute('data-k'); store('pcrKdj', KSRC); renderMain(); });
    });
    document.querySelectorAll('#ranges button').forEach(function (bt) {
      bt.addEventListener('click', function () {
        RANGE = bt.getAttribute('data-range'); store('pcrRange', RANGE);
        document.querySelectorAll('#ranges button').forEach(function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
        renderMain(); renderHeld();
      });
    });
    document.querySelectorAll('#sides button').forEach(function (bt) { bt.addEventListener('click', function () { setSide(bt.getAttribute('data-side'), true); renderAll(); }); });
    document.querySelectorAll('#epKinds button').forEach(function (bt) {
      bt.addEventListener('click', function () {
        EPK = bt.getAttribute('data-ep');
        document.querySelectorAll('#epKinds button').forEach(function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
        renderEps();
      });
    });
    var t = null, lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return; lastW = window.innerWidth;
      clearTimeout(t); t = setTimeout(function () { renderMain(); renderLive(); renderHeld(); }, 150);
    });
  }

  load().then(function (doc) {
    DATA = doc; LIVE = doc.live;
    normalize();
    $('content').hidden = false;
    init(); wire(); renderAll(); setInterval(poll, 300000); setInterval(renderStatus, 60000);
    if (location.hash.length > 1) { var tgt = document.getElementById(location.hash.slice(1)); if (tgt) setTimeout(function () { tgt.scrollIntoView(); }, 50); }
  }).catch(function (e) {
    $('chip').className = 'chip chip-error'; $('chip').textContent = 'ERROR';
    $('asof').textContent = 'Could not load the data (' + e.message + ').';
  });
})();
