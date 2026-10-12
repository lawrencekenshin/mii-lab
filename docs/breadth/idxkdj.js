




(function () {
  'use strict';
  var sec = document.getElementById('idxkdj');
  if (!sec) return;
  var URL_ = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/idxkdj-data/idxkdj/idxkdj.json' : 'snap/idxkdj.pub.json';

  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    K: '#4FC3F7', D: '#FFB74D', J: '#8A8F9E', up: '#26A69A', down: '#EF5350', yel: '#FFD84D', purple: '#7E57C2', plight: '#B39DDB',
    bar: '#4A5063' };
  var TFS = ['1D', '1W', '2W', '1M'];
  var TFN = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  var UNIT1 = { '1D': 'day', '1W': 'week', '2W': 'two-week candle', '1M': 'month' };
  var UNITS = { '1D': 'days', '1W': 'weeks', '2W': 'two-week candles', '1M': 'months' };
  var UABR = { '1D': 'd', '1W': 'wk', '1M': 'mo' };
  var OPEN = { '1W': 'week', '2W': '2-week candle', '1M': 'month' };
  var NS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var V = null, sym = 'SPY', P = {};
  try { var saved = localStorage.getItem('idxkdjSym'); if (saved === 'SPY' || saved === 'QQQ') sym = saved; } catch (e) { }

  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function div(cls, parent) { var d = document.createElement('div'); if (cls) d.className = cls; if (parent) parent.appendChild(d); return d; }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function tx(g, x, y, s, a) { var t = el('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
  function textW(s, fs) { return s.length * fs * 0.56; }
  function usd(v) { return '$' + v.toFixed(2); }
  function pct(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%'; }
  function dayS(s) { var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))); return DOW[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function units(tf, n) { return n + ' ' + (n === 1 ? UNIT1[tf] : UNITS[tf]); }
  function lastIdx(t) { return t.hist.c.length - 1; }

  function validate(d) {
    if (!d || d.schema !== 2 || d.kind !== 'idxkdj' || !d.sym || !d.sym.SPY || !d.sym.QQQ || !Array.isArray(d.ln) || typeof d.ln[0] !== 'number') return false;
    return ['SPY', 'QQQ'].every(function (s) {
      var x = d.sym[s];
      return x.tf && TFS.every(function (tf) {
        var t = x.tf[tf], h = t && t.hist;
        return h && h.c.length > 5 && ['d', 'lab', 'h', 'l', 'K', 'D', 'J'].every(function (k) { return Array.isArray(h[k]) && h[k].length === h.c.length; }) && Array.isArray(t.gc);
      });
    });
  }


  function chip(t) {
    if (t.state === 'GOLDEN') return { s: t.now ? 'UP · crossing now' : 'UP · new cross', c: 's-golden' };
    if (t.state === 'COIL') return { s: 'COILING', c: 's-coil' };
    if (t.state === 'UP') return { s: 'UP', c: 's-up' };
    return { s: 'DOWN', c: 's-down' };
  }
  function shortChip(t) {
    if (t.state === 'GOLDEN') return { s: 'UP ▲', c: 's-golden' };
    if (t.state === 'COIL') return { s: 'COIL', c: 's-coil' };
    if (t.state === 'UP') return { s: 'UP', c: 's-up' };
    return { s: 'DOWN', c: 's-down' };
  }
  function shortAge(tf, t) {
    var ago = function (a) { return tf === '2W' ? '▲ ' + 2 * a + 'wk ago' : '▲ ' + a + UABR[tf] + ' ago'; };
    if (t.state === 'GOLDEN') return t.now ? '▲ now' : ago(t.age);
    if (t.state === 'UP') return t.age != null ? ago(t.age) : 'older ▲';
    if (t.state === 'COIL') return 'gap ' + t.gap.toFixed(1);
    return 'K below D';
  }
  function shortTrig(t) {
    if (t.trig == null) return '';
    return (t.trig_dir === 'keep' ? 'flip ' : 'cross ') + pct(t.trig_pct);
  }
  function lines(tf, t) {
    var l1, l1b = '', l2 = '', tp = t.trig != null ? usd(t.trig) + ' (' + pct(t.trig_pct) + ')' : '';
    if (t.state === 'GOLDEN') {
      l1 = t.now ? 'Golden cross on this candle (as if it closed today).' : 'Golden cross ' + units(tf, t.age) + ' ago' + (t.wash ? ', from the basement.' : '.');
      l2 = t.trig != null ? 'Stays up if ' + t.trig_for + ' closes ≥ ' + tp : (t.trig_note || '');
    } else if (t.state === 'COIL') {
      l1 = 'K squeezed just below D (coiling, gap ' + t.gap.toFixed(1) + ')' + (t.wash ? ', in the basement.' : '.');
      l2 = t.trig != null ? 'Golden cross needs ' + t.trig_for + ' close ≥ ' + tp : (t.trig_note || '');
    } else if (t.state === 'UP') {
      l1 = 'K above D from an older cross' + (t.age != null ? ' (' + units(tf, t.age) + ' ago).' : '.');
      l2 = t.trig != null ? 'Flips down if ' + t.trig_for + ' closes < ' + tp : '';
    } else {
      l1 = 'K below D, not squeezed yet.';
      l2 = t.trig != null ? 'Golden cross needs ' + t.trig_for + ' close ≥ ' + tp : (t.trig_note || '');
    }
    if (t.flat_in) l1b = 'If price stays flat: crosses in ' + units(tf, t.flat_in) + '.';
    return { l1: l1, l1b: l1b, l2: l2 };
  }


  function renderGrid() {
    var g = $('gridIK'); clear(g);
    var hr = div('', g); hr.setAttribute('role', 'row'); hr.style.display = 'contents';
    var h0 = span('ik-h', ''); h0.setAttribute('role', 'columnheader'); hr.appendChild(h0);
    TFS.forEach(function (tf) { var h = span('ik-h', TFN[tf]); h.setAttribute('role', 'columnheader'); hr.appendChild(h); });
    ['SPY', 'QQQ'].forEach(function (s) {
      var x = V.sym[s], row = div('', g); row.setAttribute('role', 'row'); row.style.display = 'contents';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ik-sym'; b.setAttribute('data-iks', s);
      b.setAttribute('aria-pressed', String(s === sym)); b.setAttribute('role', 'rowheader');
      b.appendChild(document.createElement('b')).textContent = s; b.appendChild(span('', usd(x.close)));
      row.appendChild(b);
      TFS.forEach(function (tf) {
        var t = x.tf[tf], c = document.createElement('button'), ch = shortChip(t);
        c.type = 'button'; c.className = 'ik-c'; c.setAttribute('data-iks', s); c.setAttribute('role', 'cell');
        c.setAttribute('aria-label', s + ' ' + TFN[tf] + ': ' + chip(t).s + '. ' + lines(tf, t).l2);
        c.appendChild(span('ik-chip ' + ch.c, ch.s));
        c.appendChild(span('ik-t', shortAge(tf, t)));
        var st = shortTrig(t); if (st) c.appendChild(span('ik-t', st));
        row.appendChild(c);
      });
    });
  }


  function buildPanels() {
    var box = $('panelsIK'); clear(box); P = {};
    TFS.forEach(function (tf) {
      var p = div('ik-p', box); p.setAttribute('data-iktf', tf);
      var ph = div('ik-ph', p), h3 = document.createElement('h3'); h3.textContent = TFN[tf]; ph.appendChild(h3);
      var ch = span('ik-chip', ''); ph.appendChild(ch);
      var ro = div('ik-ro', p); ro.setAttribute('aria-live', 'polite');
      var sv = div('ik-svg', p); sv.setAttribute('role', 'img');
      var w1 = document.createElement('p'); w1.className = 'ik-w'; p.appendChild(w1);
      var w1b = document.createElement('p'); w1b.className = 'ik-w'; p.appendChild(w1b);
      var w2 = document.createElement('p'); w2.className = 'ik-w trig'; p.appendChild(w2);
      var w3 = document.createElement('p'); w3.className = 'ik-w m'; p.appendChild(w3);
      P[tf] = { p: p, ch: ch, ro: ro, sv: sv, w1: w1, w1b: w1b, w2: w2, w3: w3, geo: null, hover: null };
      sv.addEventListener('pointermove', function (ev) { pick(tf, ev); });
      sv.addEventListener('pointerdown', function (ev) { pick(tf, ev); });
      sv.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(tf, null); });
    });
  }
  function renderPanels() {
    var x = V.sym[sym];
    TFS.forEach(function (tf) {
      var t = x.tf[tf], Q = P[tf], c = chip(t), w = lines(tf, t);
      Q.ch.className = 'ik-chip ' + c.c; Q.ch.textContent = c.s;
      Q.sv.setAttribute('aria-label', sym + ' ' + TFN[tf] + ' candles: price above, KDJ below. ' + c.s + '.');
      Q.w1.textContent = w.l1;
      Q.w1b.textContent = w.l1b; Q.w1b.hidden = !w.l1b;
      Q.w2.textContent = w.l2; Q.w2.hidden = !w.l2;
      Q.w3.textContent = t.dev ? 'Open ' + OPEN[tf] + ' (' + t.hist.lab[lastIdx(t)] + ') shaded: read as if it closed at ' + dayS(x.day) + '’s close.'
        : 'Last candle closed (' + t.hist.lab[lastIdx(t)] + ').';
      Q.hover = null;
    });
    $('closeIK').textContent = '';
    var cl = $('closeIK'); cl.appendChild(document.createTextNode(x.name + ' · close ' + dayS(x.day) + ' '));
    cl.appendChild(document.createElement('b')).textContent = usd(x.close);
    Array.prototype.forEach.call(sec.querySelectorAll('[data-iks]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-iks') === sym)); });
    drawAll();
  }

  function draw(tf) {
    var Q = P[tf], holder = Q.sv; clear(holder);
    var t = V.sym[sym].tf[tf], h = t.hist, n = h.c.length, L = n - 1, dev = t.dev;
    var W = Math.max(220, Math.round(holder.clientWidth || 300)), narrow = W < 300;
    var fs = narrow ? 10 : 10.5, lP = 2, rP = 38, pw = W - lP - rP;
    var top = 16, pH = narrow ? 92 : 104, gapH = 20, kH = narrow ? 92 : 100, axH = 16;
    var kTop = top + pH + gapH, H = kTop + kH + axH;
    var proj = t.proj || [], npj = proj.length;
    var xr = L + Math.max(npj, 1) + 1.1, xl = -0.6;
    var X = function (i) { return lP + (i - xl) / (xr - xl) * pw; };
    var slot = pw / (xr - xl);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, holder);

    var lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < n; i++) { lo = Math.min(lo, h.l[i]); hi = Math.max(hi, h.h[i]); }
    if (t.trig != null) { lo = Math.min(lo, t.trig); hi = Math.max(hi, t.trig); }
    var pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    var Yp = function (v) { return top + pH - (v - lo) / (hi - lo) * pH; };
    var Yk = function (v) { return kTop + kH - (Math.max(-25, Math.min(125, v)) + 25) / 150 * kH; };

    if (dev) el('rect', { x: X(L) - slot / 2, y: top, width: slot, height: kTop + kH - top, fill: C.purple, 'fill-opacity': 0.22 }, svg);

    var step = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500].filter(function (s) { return (hi - lo) / s <= 4.5; })[0] || 1000;
    for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      var y = Yp(v);
      el('line', { x1: lP, x2: lP + pw, y1: y, y2: y, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, W - 2, y + 3.5, String(Math.round(v * 100) / 100), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    tx(svg, lP, 11, 'PRICE', { fill: C.muted, 'font-size': fs - 1, 'font-weight': 700, 'letter-spacing': '.04em' });
    tx(svg, lP + pw, 11, dev ? 'shaded = as if closed today' : 'last candle closed', { fill: dev ? C.plight : C.muted, 'font-size': fs - 0.5, 'font-weight': 600, 'text-anchor': 'end' });

    var bw = Math.max(1.6, Math.min(5, slot * 0.45));
    for (i = 0; i < n; i++) {
      var last = i === L && dev;
      el('line', { x1: X(i), x2: X(i), y1: Yp(h.l[i]), y2: Yp(h.h[i]), stroke: last ? C.purple : C.bar, 'stroke-width': last ? bw + 1.5 : bw, 'stroke-opacity': last ? 0.85 : 1 }, svg);
    }
    var cut = dev ? L - 1 : L, dC = '';
    for (i = 0; i <= cut; i++) dC += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yp(h.c[i]).toFixed(1);
    el('path', { d: dC, fill: 'none', stroke: C.white, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, svg);
    if (dev) {
      el('line', { x1: X(L - 1), y1: Yp(h.c[L - 1]), x2: X(L), y2: Yp(h.c[L]), stroke: C.white, 'stroke-width': 1.4, 'stroke-dasharray': '2 2' }, svg);
      el('circle', { cx: X(L), cy: Yp(h.c[L]), r: 3.6, fill: C.purple, stroke: C.white, 'stroke-width': 1 }, svg);
    } else {
      el('circle', { cx: X(L), cy: Yp(h.c[L]), r: 3.2, fill: C.white, stroke: C.bg, 'stroke-width': 1 }, svg);
    }

    if (t.trig != null) {
      var yt = Yp(t.trig);
      el('line', { x1: lP, x2: lP + pw, y1: yt, y2: yt, stroke: C.yel, 'stroke-width': 1.3, 'stroke-dasharray': '5 3' }, svg);
      var word = t.trig_dir === 'keep' ? 'keep above ' : 'needs ', ts = word + usd(t.trig), tw = textW(ts, fs) + 6;
      var tx0 = lP + 2;
      var ty = yt < top + 8 ? yt + 2 : yt - 6;
      el('rect', { x: tx0, y: ty - 4, width: tw, height: 12, fill: C.panel, 'fill-opacity': 0.92, rx: 2 }, svg);
      tx(svg, tx0 + 3, ty + 5.5, ts, { fill: C.yel, 'font-size': fs, 'font-weight': 700 });
    }

    tx(svg, lP, kTop - 6, 'KDJ', { fill: C.muted, 'font-size': fs - 1, 'font-weight': 700, 'letter-spacing': '.04em' });
    var yb = Yk(V.ln[0]);
    el('rect', { x: lP, y: yb, width: pw, height: Yk(-25) - yb, fill: C.down, 'fill-opacity': 0.07 }, svg);
    tx(svg, lP + pw - 3, kTop + kH - 4, 'basement', { fill: C.muted, 'font-size': fs - 1, 'text-anchor': 'end' });
    [0, 50, 100].forEach(function (v) {
      var y = Yk(v);
      el('line', { x1: lP, x2: lP + pw, y1: y, y2: y, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, W - 2, y + 3.5, String(v), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    });
    [['J', C.J, 1, 0.75], ['K', C.K, 1.8, 1], ['D', C.D, 1.8, 1]].forEach(function (s) {
      var a = h[s[0]], d = '';
      for (i = 0; i <= cut; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yk(a[i]).toFixed(1);
      el('path', { d: d, fill: 'none', stroke: s[1], 'stroke-width': s[2], 'stroke-opacity': s[3], 'stroke-linejoin': 'round' }, svg);
      if (dev) el('line', { x1: X(L - 1), y1: Yk(a[L - 1]), x2: X(L), y2: Yk(a[L]), stroke: s[1], 'stroke-width': s[2], 'stroke-opacity': s[3], 'stroke-dasharray': '2 2' }, svg);
    });

    if (npj) {
      ['K', 'D'].forEach(function (k, j) {
        var d = 'M' + X(L).toFixed(1) + ' ' + Yk(h[k][L]).toFixed(1);
        proj.forEach(function (p, m) { d += 'L' + X(L + 1 + m).toFixed(1) + ' ' + Yk(p[j]).toFixed(1); });
        el('path', { d: d, fill: 'none', stroke: k === 'K' ? C.K : C.D, 'stroke-width': 1.5, 'stroke-dasharray': '1.5 2.5' }, svg);
      });
      if (t.flat_in) {
        var pj = proj[t.flat_in - 1], cx = X(L + t.flat_in), cy = Yk((pj[0] + pj[1]) / 2);
        el('circle', { cx: cx, cy: cy, r: 6, fill: 'none', stroke: C.yel, 'stroke-width': 1.8 }, svg);
        tx(svg, cx - 8, cy - 9, 'cross in ' + t.flat_in, { fill: C.yel, 'font-size': fs - 0.5, 'font-weight': 700, 'text-anchor': 'end', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
      }
    }

    t.gc.forEach(function (gi) {
      var cx = X(gi), cy = Yk((h.K[gi] + h.D[gi]) / 2) + 7, s = 4.5;
      el('path', { d: 'M' + cx + ' ' + (cy - s) + 'L' + (cx + s) + ' ' + (cy + s * 0.8) + 'L' + (cx - s) + ' ' + (cy + s * 0.8) + 'Z', fill: C.up, stroke: C.bg, 'stroke-width': 0.8 }, svg);
    });

    var first = h.d[0], fy = H - 3, md = new Date(Date.UTC(+first.slice(0, 4), +first.slice(5, 7) - 1, +first.slice(8, 10)));
    tx(svg, lP, fy, MON[md.getUTCMonth()] + " '" + String(md.getUTCFullYear()).slice(2), { fill: C.muted, 'font-size': fs });
    var ll = tf === '1M' ? h.lab[L].slice(0, 3) : tf === '1D' ? h.lab[L].slice(4) : tf === '1W' ? h.lab[L].slice(6) : h.lab[L].split(' – ')[0];
    tx(svg, Math.min(X(L), lP + pw - textW(ll, fs) / 2), fy, ll, { fill: dev ? C.plight : C.muted, 'font-size': fs, 'text-anchor': 'middle' });
    var cross = el('g', {}, svg);
    Q.geo = { X: X, xl: xl, xr: xr, lP: lP, pw: pw, Yp: Yp, Yk: Yk, cross: cross, top: top, bottom: kTop + kH, n: n };
    setHover(tf, Q.hover);
  }
  function setHover(tf, i) {
    var Q = P[tf], g = Q.geo; if (!g) return;
    var t = V.sym[sym].tf[tf], h = t.hist, L = h.c.length - 1;
    clear(g.cross);
    if (i != null && (i < 0 || i > L)) i = null;
    Q.hover = i;
    var j = i == null ? L : i;
    if (i != null) {
      el('line', { x1: g.X(i), x2: g.X(i), y1: g.top, y2: g.bottom, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, g.cross);
      el('circle', { cx: g.X(i), cy: g.Yk(h.K[i]), r: 3, fill: C.K, stroke: C.bg, 'stroke-width': 1 }, g.cross);
      el('circle', { cx: g.X(i), cy: g.Yk(h.D[i]), r: 3, fill: C.D, stroke: C.bg, 'stroke-width': 1 }, g.cross);
    }
    var ro = Q.ro; clear(ro);
    ro.appendChild(span('d', h.lab[j]));
    if (j === L && t.dev) ro.appendChild(span('ghost', ' (open, as if closed)'));
    ro.appendChild(span('', ' · close ' + h.c[j].toFixed(2) + ' · '));
    ro.appendChild(span('kk', 'K ' + h.K[j].toFixed(1)));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kd', 'D ' + h.D[j].toFixed(1)));
    ro.appendChild(span('', ' '));
    ro.appendChild(span('kj', 'J ' + h.J[j].toFixed(1)));
    if (t.gc.indexOf(j) >= 0) ro.appendChild(span('g', ' · golden cross'));
    if (i == null) ro.appendChild(span('m', ' · tap or hover for any candle'));
  }
  function pick(tf, ev) {
    var Q = P[tf], g = Q.geo; if (!g) return;
    var svg = Q.sv.querySelector('svg'); if (!svg) return;
    var r = Q.sv.getBoundingClientRect(), x = (ev.clientX - r.left) * svg.viewBox.baseVal.width / r.width;
    var i = Math.round(g.xl + (x - g.lP) / g.pw * (g.xr - g.xl));
    setHover(tf, Math.max(0, Math.min(g.n - 1, i)));
  }
  function drawAll() { if (V) TFS.forEach(draw); }


  function renderText() {
    var asof = $('asofIK'); clear(asof);
    asof.appendChild(span('chip chip-closed', 'DAILY'));
    var b = new Date(V.built_utc), x = V.sym.SPY;
    asof.appendChild(span('', 'Daily bars to ' + dayS(V.report_day) + ' · built ' +
      (isNaN(b) ? '' : MON[b.getMonth()] + ' ' + b.getDate() + ', ' + String(b.getHours()).padStart(2, '0') + ':' + String(b.getMinutes()).padStart(2, '0'))));
    var lg = $('lgIK'); clear(lg);
    function item(cls, t) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(t)); lg.appendChild(s); }
    item('lg-ln lg-k', 'K (fast)');
    item('lg-ln lg-d', 'D (slow)');
    item('lg-ln lg-j', 'J');
    item('lg-tri lg-up', 'golden cross (K crosses above D)');
    item('lg-asif', 'open candle, as if it closed today');
    item('lg-trig', 'trigger close');
    item('lg-proj', 'K/D path if price stays flat');
    $('howIK').textContent = 'K (blue) is the fast line, D (orange) the slow one, J (grey) the most jumpy. K above D = the swing on that candle size points UP; below = DOWN. ' +
      'A green ▲ is a golden cross: K crossing above D. Coiling = K just under D and closing in. The shaded bottom band is the basement, a washed-out swing. ' +
      'Weekly, 2-week and monthly candles are still open: the shaded candle is drawn as if it closed at the last close, so it can still change. ' +
      'The yellow dashed line is the close that would flip K over D (or keep it there) on the date in the yellow words. ' +
      'For a full chart of any ticker on one candle size, see the Eagle Eye tab.';
    var parts = [];
    ['SPY', 'QQQ'].forEach(function (s) {
      var y = V.sym[s], ups = TFS.filter(function (tf) { return y.tf[tf].state === 'GOLDEN' || y.tf[tf].state === 'UP'; });
      var fresh = TFS.filter(function (tf) { return y.tf[tf].state === 'GOLDEN'; });
      var coil = TFS.filter(function (tf) { return y.tf[tf].state === 'COIL'; });
      var w = s + ' (' + usd(y.close) + '): ';
      w += ups.length === 4 ? 'K is above D on all four candle sizes. ' : ups.length === 0 ? 'K is below D on all four candle sizes. ' :
        'up on ' + ups.map(function (tf) { return TFN[tf].toLowerCase(); }).join(', ') + '; ' + (4 - ups.length) + ' still down. ';
      if (fresh.length) w += 'New golden crosses: ' + fresh.map(function (tf) { var t = y.tf[tf]; return TFN[tf].toLowerCase() + (t.now ? ' (this open candle)' : ' (' + units(tf, t.age) + ' ago)'); }).join(', ') + '. ';
      if (coil.length) w += 'Coiling: ' + coil.map(function (tf) { return TFN[tf].toLowerCase(); }).join(', ') + '. ';
      var near = TFS.filter(function (tf) { return y.tf[tf].trig != null; }).sort(function (a, c) { return Math.abs(y.tf[a].trig_pct) - Math.abs(y.tf[c].trig_pct); })[0];
      if (near) {
        var t = y.tf[near];
        w += 'Closest line: ' + TFN[near].toLowerCase() + (t.trig_dir === 'keep' ? ' flips back down below ' : ' crosses up at or above ') + usd(t.trig) + ' on ' + t.trig_for + ' (' + pct(t.trig_pct) + ').';
      }
      parts.push(w);
    });
    $('nowIK').textContent = parts.join(' ');
    $('honestIK').textContent = 'Each trigger is plain arithmetic: the close that would put K above D, or keep it there. ' +
      'Rebuilt after each US close (this one: ' + dayS(V.report_day) + ').';
  }

  sec.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-iks]');
    if (!b || !V) return;
    var s = b.getAttribute('data-iks');
    if (s === sym) return;
    sym = s;
    try { localStorage.setItem('idxkdjSym', sym); } catch (e) { }
    renderPanels();
  });

  var rt = null, lastW = -1, box = $('panelsIK');
  function onSize() { var cw = box.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(drawAll, 80); }
  if (window.ResizeObserver) new ResizeObserver(onSize).observe(box);
  else window.addEventListener('resize', onSize);


  fetch(URL_, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (d) {
    if (!validate(d)) throw new Error('bad data');
    V = d;
    $('errIK').hidden = true; $('bodyIK').hidden = false;
    buildPanels(); renderText(); renderGrid(); renderPanels();
  }).catch(function (e) {
    $('errIK').hidden = false; $('bodyIK').hidden = true;
    $('errIK').textContent = 'The SPY & QQQ KDJ data could not be loaded. The breadth charts are not affected.';
    if (window.console) console.warn('idxkdj', e);
  });
})();
