




(function () {
  'use strict';
  var sec = document.getElementById('h4');
  if (!sec) return;
  var URL_ = /(^|\.)github\.io$/i.test(location.hostname) ?
    'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/h4-data/h4/h4.json' : 'snap/h4.pub.json';

  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    fear: '#7E57C2', light: '#B39DDB', yel: '#FFD84D' };
  var PL = { 90: { c: '#A99CC8', op: 0.7, w: 1 }, 95: { c: '#B98AF2', op: 0.85, w: 1.15 }, 99: { c: '#D17BFF', op: 1, w: 1.4 } };
  var LEVELS = [90, 95, 99];
  var RANGES = { '1M': 42, '3M': 126, '6M': 252, 'All': Infinity };
  var RWORDS = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', 'All': 'all of it' };
  var NS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var V = null, range = '6M', hoverI = null, geo = null;
  try { var saved = localStorage.getItem('fear4hRange'); if (saved && RANGES[saved]) range = saved; } catch (e) { }

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
  function pct(t) { return (t / 10).toFixed(1) + '%'; }
  function pct0(t) { return Math.round(t / 10) + '%'; }
  function parts(c) { var d = new Date(Date.UTC(+c.slice(0, 4), +c.slice(5, 7) - 1, +c.slice(8, 10))); return { d: d, am: c.slice(11) === '09:30' }; }
  function dayStr(c, dow) { var p = parts(c), d = p.d; return (dow ? DOW[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function slot(c) { return parts(c).am ? '09:30–13:30' : '13:30–16:00'; }
  function short(c) { return dayStr(c) + ' ' + (parts(c).am ? 'am' : 'pm'); }
  function months(w) { var a = parts(w.c[0]).d, b = parts(w.c[w.n - 1]).d; return Math.max(1, Math.round((b - a) / (30.44 * 864e5))); }
  var ETF = (function () {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
    catch (e) { return null; }
  })();
  function builtEt(iso) { var b = new Date(iso); return isNaN(b) || !ETF ? '' : ETF.format(b) + ' ET'; }
  function rankText(r) { return r >= 100 ? 'the highest here' : ord(r) + ' percentile, top ' + Math.max(1, 100 - r) + '%'; }
  function textW(s, fs) { return s.length * fs * 0.56; }

  function validate(d) {
    if (!d || d.schema !== 2 || d.kind !== 'h4' || !d.view) return false;
    var w = d.view, n = w.n;
    function idx(o) { return o && typeof o.i === 'number' && o.i >= 0 && o.i < n; }
    return n > 100 && [w.c, w.f, w.r, w.spy].every(function (a) { return Array.isArray(a) && a.length === n; }) &&
      Array.isArray(w.lv) && w.lv.length === 3 && Array.isArray(w.pk) && !!w.now && typeof w.now.zone === 'string' &&
      idx(w.rec) && idx(w.max);
  }


  function renderText() {
    var w = V.view, n = w.n, last = n - 1, c = w.c[last], rec = w.rec.i;
    var asof = $('asofH4'); clear(asof);
    asof.appendChild(span('chip chip-closed', 'DAILY'));
    var bt = builtEt(V.built_utc);
    asof.appendChild(span('', 'Last candle ' + dayStr(c, true) + ', ' + slot(c) + ' ET · built ' + (bt ? bt + ' ' : '') +
      'from hourly bars · ' + V.n_names + ' names'));
    var tiles = $('tilesH4'); clear(tiles);
    function tile(k, v, s) { var d = document.createElement('div'); d.appendChild(span('k', k)); d.appendChild(span('v', v)); d.appendChild(span('s', s)); tiles.appendChild(d); }
    tile('Last 4H candle', pct(w.f[last]), ord(w.r[last]) + ' pct · ' + short(c));
    tile('Recent peak', pct(w.f[rec]), ord(w.r[rec]) + ' pct · ' + short(w.c[rec]));
    tile('90th · 95th', pct0(w.lv[0]) + ' · ' + pct0(w.lv[1]), 'high for 4H candles');
    tile('99th', pct0(w.lv[2]), 'rare (1 in 100)');
    $('howH4').textContent = '4-hour candles = two per trading day (09:30–13:30 and 13:30–16:00 ET), the same rule as the daily meter. ' +
      'Faster than daily but noisier: more spikes, and they fade quicker. Percentiles rank against the ' + n + ' candles of hourly history we have (about ' + months(w) + ' months); the daily meter goes back to 2013.';
    $('nowH4').textContent = 'Last candle (' + short(c) + '): ' + pct(w.f[last]) + ' scared = ' + w.now.zone + ', the ' + ord(w.r[last]) + ' percentile. ' +
      'Recent peak ' + pct(w.f[rec]) + ' on ' + short(w.c[rec]) + ' (' + rankText(w.r[rec]) + '). ' +
      'Highest ever here: ' + pct(w.f[w.max.i]) + ' on ' + short(w.c[w.max.i]) + ', ' + parts(w.c[w.max.i]).d.getUTCFullYear() + '.';
    var lg = $('lgH4'); clear(lg);
    function item(cls, t) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(t)); lg.appendChild(s); }
    item('lg-bar', '% of S&P 500 stocks scared, one bar per 4H candle');
    item('lg-pl', '90th · 95th · 99th percentile of the 4H history');
    item('lg-pk', 'fear peak (a big 4-hour spike, same candle on SPY)');
    item('lg-now', 'last candle');
  }


  function niceStep(span, px, minPx) {
    var steps = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500];
    for (var k = 0; k < steps.length; k++) if (steps[k] / span * px >= minPx) return steps[k];
    return steps[steps.length - 1];
  }
  function draw() {
    var holder = $('chartH4'); clear(holder);
    if (!V) return;
    var w = V.view, n = w.n, last = n - 1;
    var Wraw = holder.clientWidth || sec.clientWidth || 360, W = Math.max(300, Math.round(Wraw)), narrow = W < 640;
    var L = narrow ? 34 : 46, R = narrow ? 10 : 14, pw = W - L - R;
    var sH = narrow ? 96 : 136, gap = narrow ? 10 : 14, fH = narrow ? 210 : 290, axH = 22;
    var H = sH + gap + fH + axH, fTop = sH + gap;
    var cnt = Math.min(n, RANGES[range]), i0 = n - cnt, i1 = last;
    var X = function (i) { return L + (i - i0 + 0.5) / cnt * pw; };
    var fs = narrow ? 10.5 : 11.5;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'Fear meter on 4-hour candles with SPY above' }, holder);
    var defs = el('defs', {}, svg);
    var cp = el('clipPath', { id: 'h4clip' }, defs); el('rect', { x: L, y: fTop, width: pw, height: fH }, cp);
    var cs = el('clipPath', { id: 'h4clipS' }, defs); el('rect', { x: L, y: 0, width: pw, height: sH }, cs);

    el('rect', { x: L, y: 0, width: pw, height: sH, fill: C.panel, rx: 3 }, svg);
    el('rect', { x: L, y: fTop, width: pw, height: fH, fill: C.panel, rx: 3 }, svg);

    var ticks = [], i, prev = null;
    var weekly = cnt <= 70, every = cnt > 600 ? 3 : cnt > 300 ? 2 : 1;
    for (i = i0; i <= i1; i++) {
      var p = parts(w.c[i]), d = p.d;
      if (!p.am && i > i0 && w.c[i - 1].slice(0, 10) === w.c[i].slice(0, 10)) continue;
      if (weekly) {
        var key = Math.floor((d.getTime() / 864e5 + 3) / 7);
        if (prev !== null && key !== prev) ticks.push({ i: i, s: MON[d.getUTCMonth()] + ' ' + d.getUTCDate() });
        prev = key;
      } else {
        var mk = d.getUTCFullYear() * 12 + d.getUTCMonth();
        if (prev !== null && mk !== prev && mk % every === 0) ticks.push({ i: i, s: d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()] });
        prev = mk;
      }
    }
    ticks.forEach(function (t) {
      var x = X(t.i) - 0.5 * pw / cnt;
      el('line', { x1: x, x2: x, y1: 0, y2: sH, stroke: C.line, 'stroke-width': 1 }, svg);
      el('line', { x1: x, x2: x, y1: fTop, y2: fTop + fH, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, x, H - 6, t.s, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
    });

    var smin = Infinity, smax = -Infinity;
    for (i = i0; i <= i1; i++) { smin = Math.min(smin, w.spy[i]); smax = Math.max(smax, w.spy[i]); }
    smin /= 100; smax /= 100;
    var spad = Math.max((smax - smin) * 0.08, 0.5), s0 = smin - spad, s1 = smax + spad;
    var Ys = function (v) { return sH - 4 - (v - s0) / (s1 - s0) * (sH - 22); };
    var sst = niceStep(s1 - s0, sH - 22, narrow ? 18 : 26);
    for (var sv = Math.ceil(s0 / sst) * sst; sv <= s1; sv += sst) {
      var sy = Ys(sv); if (sy < 16 || sy > sH - 2) continue;
      el('line', { x1: L, x2: L + pw, y1: sy, y2: sy, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, sy + 3.5, String(Math.round(sv)), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    var dS = '';
    for (i = i0; i <= i1; i++) dS += (i === i0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Ys(w.spy[i] / 100).toFixed(1);
    el('path', { d: dS, fill: 'none', stroke: C.text, 'stroke-width': narrow ? 1.2 : 1.4, 'stroke-linejoin': 'round', 'clip-path': 'url(#h4clipS)' }, svg);
    tx(svg, L + 7, 14, 'S&P 500 (SPY) · 4-hour closes', { fill: C.text, 'font-size': narrow ? 11 : 12 });

    var vmax = 0;
    for (i = i0; i <= i1; i++) vmax = Math.max(vmax, w.f[i] / 10);
    var top = Math.max(vmax * 1.12, w.lv[1] / 10 * 1.1, 10), fst = niceStep(top, fH - 24, 28);
    top = Math.ceil(top / fst) * fst;
    var Yf = function (v) { return fTop + fH - (v / top) * (fH - 22); };
    for (var fv = 0; fv <= top + 1e-9; fv += fst) {
      var fy = Yf(fv);
      if (fv > 0) el('line', { x1: L, x2: L + pw, y1: fy, y2: fy, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, fy + 3.5, narrow ? String(fv) : fv + '%', { fill: C.light, 'font-size': fs, 'text-anchor': 'end' });
    }
    var bw = Math.max(1, Math.min(10, pw / cnt * 0.72)), dB = '';
    for (i = i0; i <= i1; i++) {
      var bx = X(i) - bw / 2, by = Yf(w.f[i] / 10);
      dB += 'M' + bx.toFixed(1) + ' ' + (fTop + fH) + 'V' + by.toFixed(1) + 'h' + bw.toFixed(1) + 'V' + (fTop + fH) + 'Z';
    }
    el('path', { d: dB, fill: C.fear, 'fill-opacity': 0.82, 'clip-path': 'url(#h4clip)' }, svg);
    tx(svg, L + 7, fTop + 15, '4-hour candles · % of stocks scared', { fill: C.text, 'font-size': narrow ? 11 : 12 });

    var fsT = narrow ? 10 : 11, above = [], tagBoxes = [];
    LEVELS.forEach(function (q, k) {
      var v = w.lv[k] / 10, s = ord(q) + ' ' + Math.round(v) + '%';
      if (v > top) { above.push(s); return; }
      var y = Yf(v);
      el('line', { x1: L, x2: L + pw, y1: y.toFixed(1), y2: y.toFixed(1), stroke: PL[q].c, 'stroke-opacity': PL[q].op, 'stroke-width': PL[q].w, 'stroke-dasharray': '6 4' }, svg);
      var tw = textW(s, fsT) + 8, tb = { x: L + pw - tw - 4, y: y - 7, w: tw, h: 14 };
      if (tagBoxes.some(function (o) { return Math.abs(o.y - tb.y) < 14; })) tb.y -= 14;
      tagBoxes.push(tb);
      el('rect', { x: tb.x, y: tb.y, width: tb.w, height: tb.h, rx: 2, fill: C.panel, 'fill-opacity': 0.9 }, svg);
      tx(svg, tb.x + tb.w / 2, tb.y + 10.6, s, { fill: PL[q].c, 'font-size': fsT, 'font-weight': 600, 'text-anchor': 'middle' });
    });
    if (above.length) {
      var as = '↑ ' + above.join(' · '), aw = textW(as, fsT) + 8;
      tx(svg, L + pw - aw / 2 - 4, fTop + 15, as, { fill: PL[99].c, 'font-size': fsT, 'font-weight': 600, 'text-anchor': 'middle' });
    }

    var rD = narrow ? 3 : 3.6, vis = w.pk.filter(function (k) { return k >= i0 && k <= i1 && k !== last; });
    var lab = {};
    if (vis.length) {
      var big = vis.reduce(function (a, b) { return w.f[b] > w.f[a] ? b : a; }, vis[0]);
      lab[big] = 1; lab[vis[vis.length - 1]] = 1;
    }
    vis.forEach(function (k) {
      var px = X(k), py = Math.max(fTop + 4, Yf(w.f[k] / 10) - rD - 1);
      el('circle', { cx: px, cy: py, r: rD, fill: C.yel, stroke: C.bg, 'stroke-width': 1.2 }, svg);
      el('circle', { cx: px, cy: Ys(w.spy[k] / 100), r: rD - 0.8, fill: C.yel, stroke: C.bg, 'stroke-width': 1 }, svg);
      if (lab[k]) {
        var ls = pct0(w.f[k]) + '  ' + short(w.c[k]), lw = textW(ls, fsT);
        var lx = Math.max(L + 4 + lw / 2, Math.min(L + pw - 4 - lw / 2, px));
        tx(svg, lx, Math.max(fTop + 28, py - 7), ls, { fill: C.white, 'font-size': fsT, 'font-weight': 600, 'text-anchor': 'middle', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
      }
    });

    var nx = X(last), ny = Yf(w.f[last] / 10), rN = narrow ? 4.5 : 5.5;
    el('circle', { cx: nx, cy: ny, r: rN + 3, fill: C.light, 'fill-opacity': 0.3 }, svg);
    el('circle', { cx: nx, cy: ny, r: rN, fill: '#F3EEFF', stroke: C.white, 'stroke-width': 1.5 }, svg);
    el('circle', { cx: nx, cy: Ys(w.spy[last] / 100), r: rN - 1.5, fill: '#F3EEFF', stroke: C.white, 'stroke-width': 1.2 }, svg);
    var ns = 'now ' + pct0(w.f[last]);
    tx(svg, nx - rN - 6, ny - rN - 4, ns, { fill: C.white, 'font-size': fsT + 0.5, 'font-weight': 700, 'text-anchor': 'end', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });

    var cross = el('g', {}, svg);
    geo = { L: L, pw: pw, i0: i0, cnt: cnt, X: X, Yf: Yf, Ys: Ys, cross: cross, sH: sH, fTop: fTop, fH: fH };
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
      el('circle', { cx: px, cy: geo.Yf(w.f[i] / 10), r: 4, fill: C.light, stroke: C.white, 'stroke-width': 1.1 }, geo.cross);
      el('circle', { cx: px, cy: geo.Ys(w.spy[i] / 100), r: 3.4, fill: C.text, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
    }
    var ro = $('roH4'); clear(ro);
    ro.appendChild(span('d', dayStr(w.c[j], true) + ', ' + slot(w.c[j]) + ' ET'));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('p', pct(w.f[j]) + ' scared'));
    ro.appendChild(span('', ' · '));
    ro.appendChild(span('pc', ord(w.r[j]) + ' percentile'));
    ro.appendChild(span('', (j === last ? ' · ' + w.now.zone : '') + ' · SPY ' + (w.spy[j] / 100).toFixed(2)));
    if (w.pk.indexOf(j) >= 0) ro.appendChild(span('pk', ' · fear peak'));
    if (i == null) ro.appendChild(span('muted', ' · tap or hover the chart for any candle'));
  }
  function pickAt(ev) {
    if (!geo) return;
    var r = $('chartH4').getBoundingClientRect(), svg = $('chartH4').querySelector('svg');
    if (!svg) return;
    var scale = svg.viewBox.baseVal.width / r.width, x = (ev.clientX - r.left) * scale;
    var i = Math.round(geo.i0 + (x - geo.L) / geo.pw * geo.cnt - 0.5);
    setHover(Math.max(geo.i0, Math.min(V.view.n - 1, i)));
  }


  function renderRange() {
    Array.prototype.forEach.call(sec.querySelectorAll('[data-h4r]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-h4r') === range)); });
    var t = sec.querySelector('[data-h4span]'); if (t) t.textContent = RWORDS[range];
  }
  sec.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-h4r]');
    if (!b) return;
    range = b.getAttribute('data-h4r');
    try { localStorage.setItem('fear4hRange', range); } catch (e) { }
    hoverI = null; renderRange(); draw();
  });
  var chart = $('chartH4');
  chart.addEventListener('pointermove', pickAt);
  chart.addEventListener('pointerdown', pickAt);
  chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });

  var rt = null, lastW = -1;
  function onSize() { var cw = chart.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(draw, 80); }
  if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart);
  else window.addEventListener('resize', onSize);


  renderRange();
  fetch(URL_, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (d) {
    if (!validate(d)) throw new Error('bad data');
    V = d;
    RWORDS.All = 'all ' + months(d.view) + ' months';
    $('errH4').hidden = true; $('bodyH4').hidden = false;
    renderRange(); renderText(); draw();
  }).catch(function () {
    $('errH4').hidden = false; $('bodyH4').hidden = true;
    $('errH4').textContent = 'The 4-hour data could not be loaded. The fear meter above and below is not affected.';
  });
})();
