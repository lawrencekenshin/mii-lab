












(function () {
  'use strict';
  var SKT = window.SKT = window.SKT || {};
  var COL = {
    up: '#26A69A', down: '#EF5350', upHi: '#3fbfae', downHi: '#ff6f6c', upLite: '#8ff5e6', downLite: '#ffb0ae',
    king: '#F5D63D', gold: '#FFD84D', price: '#2962FF', light: '#8EC0FA', lilac: '#C5B3F0', pink: '#D16BA5', b180: '#3987E5',
    amber: '#F2B04B', purple: '#9b7fe0', grid: '#1d2330', axis: '#262d3b', mut: '#6f7787', text: '#d6dae2', bg: '#131722',
    flip: '#9aa0ab', grey: '#5d6474'
  };

  var ST = {
    king: { fill: COL.king, ink: '#131722', bold: 1 },
    kn: { fill: '#2a2310', ink: '#ffd77a', stroke: COL.gold },
    cw: { fill: '#16302d', ink: '#9fe0d6', stroke: '#2f6f66' },
    pw: { fill: '#3a1d1f', ink: '#f3a5a3', stroke: '#8a3b39' },
    flip: { fill: '#1b2130', ink: '#d6dae2', stroke: '#6f7787', dash: 1 },
    betC: { fill: '#1f1a2e', ink: '#d9cdf7', stroke: COL.lilac, dash: 1 },
    betP: { fill: '#2c1517', ink: '#ff9d9b', stroke: COL.down, dash: 1 },
    hl: { fill: '#0b0e14', ink: '#ffffff', stroke: '#ffffff' },
    xl: { fill: '#1d1630', ink: '#c4b2f2', stroke: COL.purple, dash: 1 },
    bigC: { fill: '#131722', ink: '#9fe0d6', stroke: '#2f6f66', dash: 1 },
    bigP: { fill: '#131722', ink: '#f3a5a3', stroke: '#8a3b39', dash: 1 },
    one: { fill: '#3a3311', ink: COL.king, stroke: COL.king, dash: 1 },
    oneEdge: { fill: COL.king, ink: '#131722', stroke: COL.king, bold: 1 }
  };
  var PH = 16, GAP = 17;
  var uid = 0;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fam() { try { return getComputedStyle(document.body).fontFamily || 'sans-serif'; } catch (e) { return 'sans-serif'; } }
  function tw(t, bold) { return Math.ceil(SKT.svg.measure(t, (bold ? '700 ' : '600 ') + '11px ' + fam())) + 14; }
  function kS(k) { return isNum(k) ? String(Math.round(k * 100) / 100) : '–'; }
  function pc(x) { if (!isNum(x)) return ''; var a = Math.abs(x) * 100, t = a < 10 ? a.toFixed(1) : String(Math.round(a)); return (+t === 0 ? '' : x > 0 ? '+' : x < 0 ? '−' : '') + t + '%'; }
  function usd(v) { return SKT.fmt.usd(v); }
  function fx(v, st) { return v.toFixed(st < 0.1 ? 2 : st < 1 ? (Math.round(st * 10) % 10 ? 2 : 1) : st % 1 ? 1 : 0); }
  function msg(el, text) { var p = SKT.ui.el('p', 'nv-chartmsg', text); el.appendChild(p); return null; }
  function isoOf(md, ref) {
    var y = +String(ref || '').slice(0, 4), m = +String(md).slice(0, 2);
    if (!y || !m) return null;
    if (m > +String(ref).slice(5, 7)) y -= 1;
    return y + '-' + String(md).slice(0, 5);
  }
  SKT.chartsUtil = { isoOf: isoOf, kS: kS, pc: pc };


  var REG = [];
  function reg(el, fn) {
    for (var i = REG.length - 1; i >= 0; i--) if (REG[i].el === el || !document.body.contains(REG[i].el)) REG.splice(i, 1);
    var e = { el: el, fn: fn, w: 0 };
    REG.push(e);
    el._nvRedraw = function () { return run(e, true); };
    return run(e, true);
  }
  function run(e, force) {
    var w = Math.floor(e.el.clientWidth || 0);
    if (!w) { e.w = 0; return null; }
    if (!force && e.w && w <= e.w && w > e.w - 1) return null;
    if (!force && e.w && w > e.w && w <= e.w + 30) return null;
    e.w = w;
    try { return e.fn(w); } catch (err) { console.error('[skew] chart', err); e.el.textContent = '–'; return null; }
  }
  function redraw() {
    for (var i = REG.length - 1; i >= 0; i--) if (!document.body.contains(REG[i].el)) REG.splice(i, 1);
    REG.slice().forEach(function (e) { run(e, false); });
  }
  var rT = null;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(redraw, 150); });
  function holdOn(svg) {
    svg.addEventListener('mouseenter', function () { if (SKT.hold) SKT.hold('chart', true); });
    svg.addEventListener('mouseleave', function () { if (SKT.hold) SKT.hold('chart', false); });
  }


  function weekKey(iso) {
    var d = new Date(iso + 'T00:00:00Z'), wd = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - wd);
    return d.toISOString().slice(0, 10);
  }
  function aggregate(raw, cs) {
    var out = [], key = null, cur = null;
    raw.forEach(function (b) {
      var d = b[0], k;
      if (cs === 'w') k = weekKey(d);
      else if (cs === '2w') { var wk = weekKey(d), n = Math.floor(Date.parse(wk + 'T00:00:00Z') / (14 * 864e5)); k = 'b' + n; }
      else if (cs === 'm') k = d.slice(0, 7);
      else k = d;
      if (k !== key) { key = k; cur = { d: d, d1: d, o: b[1], h: b[2], l: b[3], c: b[4], days: [d] }; out.push(cur); return; }
      cur.d1 = d; cur.days.push(d);
      if (cur.o == null && b[1] != null && cur.days.length === 1) cur.o = b[1];
      cur.h = b[2] == null ? cur.h : cur.h == null ? b[2] : Math.max(cur.h, b[2]);
      cur.l = b[3] == null ? cur.l : cur.l == null ? b[3] : Math.min(cur.l, b[3]);
      if (b[4] != null) cur.c = b[4];
    });
    return out;
  }
  function pickH(H, g) {
    if (!H) return null;
    var want = { '1y': '1Y+', '1m': '1M', '3m': '3M', '6m': '6M' }[g] || '1Y+';
    var order = [want, '1Y+', '6M', '3M', '1M'];
    for (var i = 0; i < order.length; i++) if (H[order[i]] && H[order[i]].lv) return { key: order[i], want: want, d: H[order[i]] };
    return null;
  }


  function pill(svg, x, y, w, t, st) {
    var g = SKT.svg.group({ 'class': 'nv-pill' }, svg);
    SKT.svg.rect(x, y - PH / 2, w, PH, { rx: 3, fill: st.fill, stroke: st.stroke || null, 'stroke-dasharray': st.dash ? '3 2' : null }, g);
    SKT.svg.text(x + w / 2, y + 4, t, { 'font-size': 11, fill: st.ink, 'text-anchor': 'middle', 'font-weight': st.bold ? 700 : 600 }, g);
    return g;
  }
  function spread(L, gap, y0, y1) {
    L.forEach(function (q) { q.y = clamp(q.y0, y0, y1); });
    L.sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < L.length; i++) if (L[i].y - L[i - 1].y < gap) L[i].y = L[i - 1].y + gap;
    if (L.length && L[L.length - 1].y > y1) {
      L[L.length - 1].y = y1;
      for (var j = L.length - 2; j >= 0; j--) if (L[j + 1].y - L[j].y < gap) L[j].y = L[j + 1].y - gap;
    }
  }
  function hit(a, b) { return a[0] < b[0] + b[2] + 3 && b[0] < a[0] + a[2] + 3 && Math.abs((a[1] + a[3] / 2) - (b[1] + b[3] / 2)) < GAP; }
  function defs(svg) { return SKT.svg.el('defs', {}, svg); }
  function stripes(svg, d, id, col) {
    var p = SKT.svg.el('pattern', { id: id, width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
    SKT.svg.rect(0, 0, 4, 4, { fill: col, opacity: 0.25 }, p);
    SKT.svg.line(0, 0, 0, 4, { stroke: col, 'stroke-width': 2.2 }, p);
    return 'url(#' + id + ')';
  }







  function pricePane(el, nf, o, W) {
    var svgH = SKT.svg, L = o.layers || {};
    function lay(k) { return L[k] !== false; }
    el.textContent = '';
    var all = (nf && nf.ohlc) || [];
    if (!all.length) return msg(el, 'No daily price history on file for this name.');
    var phone = o.phone != null ? o.phone : innerWidth < 760, H = phone ? 390 : 480;
    var nPr = { '1m': 21, '3m': 63 }[o.pr] || 9999, raw = all.slice(-nPr), B = aggregate(raw, o.cs);
    if (!B.length) return msg(el, 'No daily price history on file for this name.');
    var gex = nf.gex || null, mapH = o.liveMap ? o.liveMap.H : gex && gex.H, pick = pickH(mapH, o.g);
    var G = pick ? pick.d : null, lv = G ? G.lv : null, puts = o.side === 'P', open = o.mode === 'open';
    var lastC = null;
    for (var li = raw.length - 1; li >= 0 && lastC == null; li--) if (isNum(raw[li][4])) lastC = raw[li][4];
    var S0 = (o.liveMap && o.liveMap.px) || (gex && gex.spot) || lastC;
    var padR = 62, cw = W - padR, narrow = W < 700;
    var cx1 = Math.round(cw * (narrow ? 0.55 : 0.62)), bx0 = cx1 + (narrow ? 8 : 12);
    var top = 8, bot = H - 30;

    var cLo = Infinity, cHi = -Infinity;
    B.forEach(function (b) {
      var lo = isNum(b.l) ? b.l : b.c, hi = isNum(b.h) ? b.h : b.c;
      if (isNum(lo)) cLo = Math.min(cLo, lo);
      if (isNum(hi)) cHi = Math.max(cHi, hi);
    });
    if (isNum(S0)) { cLo = Math.min(cLo, S0); cHi = Math.max(cHi, S0); }
    if (!isFinite(cLo)) return msg(el, 'No daily price history on file for this name.');
    var lv0 = [];
    function addLv(k, kind, on) { if (isNum(k) && k > 0 && on !== false) lv0.push({ k: k, kind: kind }); }
    if (lv) {
      addLv(lv.king, 'king', lay('king'));
      addLv(lv.call_wall, 'cw', lay('walls'));
      addLv(lv.put_wall, 'pw', lay('walls'));
      addLv(lv.flip, 'flip', lay('flip'));
    }
    if (isNum(o.kgK) && !(lv && o.kgK === lv.king)) addLv(o.kgK, 'kn', lay('king'));
    if (o.mc && isNum(o.mc.k)) addLv(o.mc.k, 'bet', lay('main'));
    if (o.hl && isNum(o.hl.k)) addLv(o.hl.k, 'hl', true);
    (o.extraLines || []).forEach(function (x, i) { if (x && isNum(+x.k)) lv0.push({ k: +x.k, kind: 'xl', i: i }); });
    var lo = cLo, hi = cHi;
    lv0.forEach(function (q) { if (isNum(S0) && q.k >= 0.7 * S0 && q.k <= 1.4 * S0) { lo = Math.min(lo, q.k); hi = Math.max(hi, q.k); } });
    if (o.nowPx && isNum(o.nowPx.px)) { lo = Math.min(lo, o.nowPx.px); hi = Math.max(hi, o.nowPx.px); }
    var by = (o.win && o.win.by) || [];
    if (open && isNum(S0)) {
      by.slice().sort(function (a, b) { return (Math.abs(b[1]) + Math.abs(b[2])) - (Math.abs(a[1]) + Math.abs(a[2])); }).slice(0, 5)
        .forEach(function (b) { if (b[0] >= 0.7 * S0 && b[0] <= 1.4 * S0) { lo = Math.min(lo, b[0]); hi = Math.max(hi, b[0]); } });
    }
    var span = (hi - lo) || (S0 || 1) * 0.02;
    lo -= span * 0.05; hi += span * 0.06;
    function y(v) { return top + (hi - v) / (hi - lo) * (bot - top); }
    function onY(k) { return isNum(k) && k > lo && k < hi; }

    var svg = svgH.root(W, H, { 'class': 'nv-chart', role: 'img', 'aria-label': (o.sym || '') + ' daily price with GEX levels' });
    svg.style.display = 'block'; svg.style.maxWidth = '100%';
    var df = defs(svg), cid = 'nvc' + (++uid);
    var cp = svgH.el('clipPath', { id: cid }, df);
    svgH.rect(0, top - 2, cx1, bot - top + 4, {}, cp);


    var tags = [];
    if (lv && onY(lv.king) && lay('king')) tags.push({ y0: y(lv.king), t: kS(lv.king), fill: COL.king, ink: '#131722', bold: 1 });
    if (isNum(o.kgK) && onY(o.kgK) && lay('king') && !(lv && o.kgK === lv.king)) tags.push({ y0: y(o.kgK), t: kS(o.kgK), fill: '#2a2310', ink: '#ffd77a', stroke: COL.gold });
    if (isNum(S0)) tags.push({ y0: y(S0), t: S0 >= 1000 ? Math.round(S0).toString() : S0.toFixed(2), fill: COL.price, ink: '#fff' });
    if (o.nowPx && isNum(o.nowPx.px)) tags.push({ y0: y(o.nowPx.px), t: o.nowPx.px.toFixed(2), fill: '#0b0e14', ink: o.nowPx.stale ? COL.mut : COL.light, stroke: o.nowPx.stale ? COL.mut : COL.light });
    spread(tags, 18, top + 9, bot - 9);
    var stp = svgH.niceStep(hi - lo, phone ? 6 : 9);
    for (var v = Math.ceil(lo / stp) * stp; v < hi; v += stp) {
      svgH.line(0, y(v), cw, y(v), { stroke: COL.grid }, svg);
      if (tags.every(function (t) { return Math.abs(t.y - y(v)) > 15; })) svgH.text(cw + 7, y(v) + 4, fx(v, stp), { fill: COL.mut, 'font-size': 11 }, svg);
    }
    svgH.line(cw, 0, cw, bot, { stroke: COL.axis }, svg);
    svgH.line(bx0, top, bx0, bot, { stroke: COL.axis }, svg);


    var n = B.length, cwid = cx1 / n, bw = Math.min(14, Math.max(1, cwid * 0.7)), lineMode = cwid < 1.4 || !lay('candles');
    var pos = {};
    B.forEach(function (b, i) {
      var k = b.days.length;
      b.days.forEach(function (d, j) { pos[d] = { x: i * cwid + (j + 0.5) * cwid / k, w: cwid / k, i: i }; });
      b.x = i * cwid + cwid / 2;
    });
    function xOf(iso) {
      if (!iso) return null;
      if (pos[iso]) return pos[iso];
      if (iso < B[0].d || iso > B[n - 1].d1) return null;
      for (var i = 0; i < n; i++) if (iso >= B[i].d && iso <= B[i].d1) return { x: B[i].x, w: cwid, i: i };
      return null;
    }
    var cg = svgH.group({ 'clip-path': 'url(#' + cid + ')' }, svg);
    var txtBoxes = [];
    function tbox(x, yBase, t, px) { var w = Math.ceil(SKT.svg.measure(t, px + 'px ' + fam())); txtBoxes.push([x, yBase - px, w, px + 2]); }

    var ws = xOf(o.winStart);
    if (ws) {
      svgH.line(ws.x - ws.w / 2, top, ws.x - ws.w / 2, bot, { stroke: '#3a4253', 'stroke-dasharray': '2 3' }, cg);
      if (o.winLabel) { svgH.text(ws.x - ws.w / 2 + 3, bot - 4, o.winLabel + ' →', { fill: COL.mut, 'font-size': 10 }, cg); tbox(ws.x - ws.w / 2 + 3, bot - 4, o.winLabel + ' →', 10); }
    }
    var hd = xOf(o.day);
    if (hd) svgH.rect(hd.x - Math.max(3, hd.w) / 2, top, Math.max(3, hd.w), bot - top, { fill: 'rgba(255,255,255,.07)', stroke: 'rgba(255,255,255,.35)', 'stroke-dasharray': '2 2' }, cg);

    if (o.ern && lay('earn')) {
      [o.ern.l, o.ern.n].forEach(function (d) {
        var p = xOf(d);
        if (!p) return;
        svgH.line(p.x, top, p.x, bot, { stroke: COL.amber, 'stroke-dasharray': '1 3', 'stroke-width': 1.2 }, cg);
        svgH.text(p.x + 3, top + 26, 'E', { fill: COL.amber, 'font-size': 11, 'font-weight': 700, 'data-tip': 'Earnings ' + SKT.fmt.day(d) }, cg);
      });
      if (o.ern.n && o.ern.n > B[n - 1].d1) {
        var et = 'next earnings ' + SKT.fmt.dayShort(o.ern.n) + ' →';
        if (SKT.svg.measure(et, '11px ' + fam()) > cx1 - 10) et = 'E ' + SKT.fmt.dayShort(o.ern.n) + ' →';
        svgH.text(cx1 - 4, top + 10, et, { fill: COL.amber, 'font-size': 11, 'text-anchor': 'end' }, cg);
        tbox(cx1 - 4 - Math.ceil(SKT.svg.measure(et, '11px ' + fam())), top + 10, et, 11);
      }
    }

    if (lineMode) {
      var pts = B.filter(function (b) { return isNum(b.c); }).map(function (b) { return b.x.toFixed(1) + ',' + y(b.c).toFixed(1); });
      svgH.el('polyline', { points: pts.join(' '), fill: 'none', stroke: COL.text, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, cg);
    } else {
      var run0 = [];
      var flush = function () {
        if (run0.length) {
          svgH.el('polyline', { points: run0.join(' '), fill: 'none', stroke: COL.text, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, cg);
          run0 = [];
        }
      };
      B.forEach(function (b, i) {
        if (!isNum(b.c)) { flush(); return; }
        var x = b.x;
        if (!isNum(b.h) || !isNum(b.l)) {
          if (!run0.length && i > 0 && isNum(B[i - 1].c)) run0.push(B[i - 1].x.toFixed(1) + ',' + y(B[i - 1].c).toFixed(1));
          run0.push(x.toFixed(1) + ',' + y(b.c).toFixed(1));
          return;
        }
        if (run0.length) { run0.push(x.toFixed(1) + ',' + y(b.c).toFixed(1)); flush(); }
        var prev = i > 0 ? B[i - 1].c : null;
        if (!isNum(b.o)) {
          var colH = isNum(prev) && b.c < prev ? COL.down : COL.up;
          svgH.line(x, y(b.h), x, y(b.l), { stroke: colH, 'stroke-width': Math.max(1, Math.min(2, bw / 3)) }, cg);
          svgH.line(x, y(b.c), x + Math.max(2, bw / 2), y(b.c), { stroke: colH, 'stroke-width': 1.2 }, cg);
          return;
        }
        var col = b.c >= b.o ? COL.up : COL.down;
        svgH.line(x, y(b.h), x, y(b.l), { stroke: col }, cg);
        svgH.rect(x - bw / 2, y(Math.max(b.o, b.c)), bw, Math.max(1, Math.abs(y(b.o) - y(b.c))), { fill: col }, cg);
      });
      flush();
    }

    if (o.kpath && o.kpath.length && lay('path')) {
      var dd = '', pen = false, lastP = null;
      o.kpath.forEach(function (q) {
        var p = xOf(q[0]);
        if (!p || !isNum(q[1])) return;
        var X = p.x - p.w / 2, Y = y(q[1]);
        if (!pen) { dd += 'M' + X.toFixed(1) + ' ' + Y.toFixed(1); pen = true; }
        else dd += 'H' + X.toFixed(1) + 'V' + Y.toFixed(1);
        lastP = p;
      });
      if (pen && lastP) {
        dd += 'H' + cx1.toFixed(1);
        svgH.path(dd, { fill: 'none', stroke: COL.king, 'stroke-width': 1.5, 'stroke-dasharray': '1 3', 'stroke-linecap': 'round', opacity: 0.9 }, cg);
      }
    }

    var DI = o.dayInfo || {};
    if (lay('marks')) {
      var lastX = { c: -99, p: -99 }, stack = { c: 0, p: 0 };
      Object.keys(DI).sort().forEach(function (d) {
        var inf = DI[d], p = xOf(d), side = inf.l && inf.l.indexOf('c') >= 0 ? 'c' : inf.l && inf.l.indexOf('p') >= 0 ? 'p' : null;
        if (!p || !side) return;
        var b = B[p.i], lowV = isNum(b.l) ? b.l : b.c, highV = isNum(b.h) ? b.h : b.c;
        if (!isNum(lowV) || !isNum(highV)) return;
        stack[side] = p.x - lastX[side] < 11 ? stack[side] + 1 : 0;
        lastX[side] = p.x;
        var s = 3.6, yy = side === 'c' ? y(lowV) + 7 + stack[side] * 8 : y(highV) - 7 - stack[side] * 8;
        var dpath = side === 'c' ? 'M' + (p.x - s) + ' ' + (yy + s) + 'L' + (p.x + s) + ' ' + (yy + s) + 'L' + p.x + ' ' + (yy - s) + 'Z'
          : 'M' + (p.x - s) + ' ' + (yy - s) + 'L' + (p.x + s) + ' ' + (yy - s) + 'L' + p.x + ' ' + (yy + s) + 'Z';
        var col = inf.pair ? COL.gold : side === 'c' ? COL.up : COL.down, sold = inf.read === 'sold', bought = inf.read === 'bought';
        svgH.path(dpath, { fill: sold ? 'none' : col, 'fill-opacity': bought || inf.pair ? 1 : 0.55, stroke: col, 'stroke-width': 1.1, 'data-tip': inf.tip || null }, cg);
      });
    }

    function hline(k, col, w, dash, x0) { if (onY(k)) svgH.line(x0 || 0, y(k), cw, y(k), { stroke: col, 'stroke-width': w, 'stroke-dasharray': dash || null }, svg); }
    (o.extraLines || []).forEach(function (x) { if (x && isNum(+x.k)) hline(+x.k, x.color || COL.purple, 1.2, x.dash === false ? null : (x.dash || '5 4')); });
    if (lv) {
      if (lay('flip')) hline(lv.flip, COL.flip, 1, '3 3');
      if (lay('walls')) {
        if (lv.put_wall !== lv.king) hline(lv.put_wall, COL.down, 1.2, '6 3');
        if (lv.call_wall !== lv.king) hline(lv.call_wall, COL.up, 1.2, '6 3');
      }
    }
    if (isNum(o.kgK) && lay('king') && !(lv && o.kgK === lv.king)) hline(o.kgK, COL.gold, 1, '4 3');
    var betX0 = 0;
    if (o.mc && lay('main')) { var bp = xOf(o.mc.frm); betX0 = bp ? bp.x - bp.w / 2 : 0; hline(o.mc.k, puts ? COL.down : COL.lilac, 1.4, '6 4', betX0); }
    if (lv && lay('king')) hline(lv.king, COL.king, 1.6);
    if (o.hl) hline(o.hl.k, '#ffffff', 1.4, '2 2');
    if (isNum(S0)) svgH.line(0, y(S0), cw, y(S0), { stroke: COL.price, 'stroke-dasharray': '2 3' }, svg);
    if (o.nowPx && isNum(o.nowPx.px) && onY(o.nowPx.px)) {
      var ny = y(o.nowPx.px), ncol = o.nowPx.stale ? COL.mut : COL.light;
      svgH.line(0, ny, cw, ny, { stroke: ncol, 'stroke-dasharray': '1 2', 'stroke-width': 1.3 }, svg);
      svgH.text(4, ny - 4, o.nowPx.label || '', { fill: ncol, 'font-size': 11 }, svg);
      if (o.nowPx.label) tbox(4, ny - 4, o.nowPx.label, 11);
    }


    var pills = [];
    function addPill(k, txt, st, kind) { if (onY(k)) pills.push({ k: k, y0: y(k), txt: txt, st: st, kind: kind }); }
    if (lv && lay('king') && onY(lv.king)) {
      var kw = function (sh) {
        var s = '';
        if (lay('walls') && lv.call_wall === lv.king) s += sh > 1 ? '+CW' : sh ? ' · CW' : ' · CALL WALL';
        if (lay('walls') && lv.put_wall === lv.king) s += sh > 1 ? '+PW' : sh ? ' · PW' : ' · PUT WALL';
        return s;
      };
      addPill(lv.king, function (sh) { return (sh > 1 ? 'K ' + kS(lv.king) : sh ? 'KING ' + kS(lv.king) : 'KING ' + kS(lv.king) + ' ' + pc(lv.king / S0 - 1) + ' · ' + usd(lv.king_gex)) + kw(sh); }, ST.king, 'king');
    }
    if (lv && lay('walls')) {
      var both = lv.call_wall != null && lv.call_wall === lv.put_wall;
      if (lv.call_wall != null && lv.call_wall !== lv.king) addPill(lv.call_wall, function (sh) { return (sh > 1 ? 'CW' : 'CALL WALL') + (both ? (sh > 1 ? '+PW' : ' + PUT') : '') + ' ' + kS(lv.call_wall) + (sh ? '' : ' ' + pc(lv.call_wall / S0 - 1)); }, ST.cw, 'cw');
      if (lv.put_wall != null && lv.put_wall !== lv.king && !both) addPill(lv.put_wall, function (sh) { return (sh > 1 ? 'PW' : 'PUT WALL') + ' ' + kS(lv.put_wall) + (sh ? '' : ' ' + pc(lv.put_wall / S0 - 1)); }, ST.pw, 'pw');
    }
    if (lv && lay('flip') && isNum(lv.flip)) addPill(lv.flip, function (sh) { return (sh > 1 ? 'F ' : 'FLIP ') + kS(lv.flip) + (sh ? '' : ' ' + pc(lv.flip / S0 - 1)); }, ST.flip, 'flip');
    if (isNum(o.kgK) && lay('king') && !(lv && o.kgK === lv.king)) addPill(o.kgK, function (sh) { return sh > 1 ? 'KN ' + kS(o.kgK) : sh ? 'KING NODE ' + kS(o.kgK) : 'KING NODE (THIS BOARD) ' + kS(o.kgK) + ' ' + pc(o.kgK / S0 - 1); }, ST.kn, 'kn');
    if (o.mc && lay('main')) {
      var mk = kS(o.mc.k) + o.mc.cp;
      addPill(o.mc.k, function (sh) { return sh > 1 ? mk : sh ? 'main bet ' + mk : 'main bet $' + mk + ' · ' + SKT.fmt.exp(o.mc.exp, ' ') + ' (' + pc(o.mc.k / S0 - 1) + ')'; }, puts ? ST.betP : ST.betC, 'bet');
    }
    if (o.hl) addPill(o.hl.k, function (sh) { return sh > 1 ? kS(o.hl.k) + o.hl.cp : sh ? kS(o.hl.k) + o.hl.cp + ' ' + SKT.fmt.exp(o.hl.exp) : o.hl.label; }, ST.hl, 'hl');
    (o.extraLines || []).forEach(function (x) {
      if (!x || !isNum(+x.k)) return;
      var st = { fill: ST.xl.fill, ink: ST.xl.ink, stroke: x.color || ST.xl.stroke, dash: 1 }, lab = String(x.label || kS(+x.k));
      addPill(+x.k, function (sh) { return sh > 1 ? kS(+x.k) : sh ? (lab.length > 18 ? lab.slice(0, 17) + '…' : lab) : lab; }, st, 'xl');
    });
    var minBars = narrow ? 50 : W < 1000 ? 80 : 120, ll = narrow ? 2 : 0;
    function fit() { pills.forEach(function (q) { q.t = q.txt(ll); q.w = tw(q.t, q.st.bold); }); return pills.every(function (q) { return cw - q.w - 6 >= bx0 + minBars; }); }
    while (!fit() && ll < 2) ll++;
    var maxW = 0;
    pills.forEach(function (q) { maxW = Math.max(maxW, q.w); });
    var bx1 = Math.max(bx0 + (narrow ? 40 : 100), Math.min(cw - (narrow ? 50 : 150), cw - 10 - maxW));


    var boxes = txtBoxes.slice(), tipCand = [];
    var bars = [];
    if (!open && G && lay('bars')) {
      bars = (G.bars || []).slice();
      if (lay('far') && o.farBars && o.farBars[pick.key]) o.farBars[pick.key].forEach(function (b) { if (!bars.some(function (x) { return x[0] === b[0]; })) bars.push(b); });
      var bigAll = ((G.big && G.big.pos) || []).concat((G.big && G.big.neg) || []);
      bigAll.forEach(function (b) { if (!bars.some(function (x) { return x[0] === b[0]; })) bars.push([b[0], b[1], null, null]); });
      bars = bars.filter(function (b) { return onY(b[0]) && isNum(b[1]); });
    }
    var rowsK = open ? by.filter(function (b) { return onY(b[0]); }).map(function (b) { return b[0]; }) : bars.map(function (b) { return b[0]; });
    rowsK.sort(function (a, b) { return a - b; });
    var gap = Infinity;
    for (var gi = 1; gi < rowsK.length; gi++) if (rowsK[gi] > rowsK[gi - 1]) gap = Math.min(gap, rowsK[gi] - rowsK[gi - 1]);
    var gpx = isFinite(gap) ? y(0) - y(gap) : 12, bh = Math.max(1.5, Math.min(14, gpx * 0.75)), hh = Math.max(3, Math.min(gpx, 14));
    var blenOf = function () { return 0; };
    var byK = {};
    by.forEach(function (b) { byK[b[0]] = b; });
    if (!open && bars.length) {
      var mx = 1;
      bars.forEach(function (b) { mx = Math.max(mx, Math.abs(b[1])); });
      blenOf = function (vv) { return Math.abs(vv) / mx * (bx1 - bx0); };
      var negKing = G.big && G.big.neg && G.big.neg[0] ? G.big.neg[0][0] : null;
      bars.forEach(function (b) {
        var k = b[0], net = b[1], len = blenOf(net), isK = lv && k === lv.king, isN = k === negKing;
        if (len < 0.5) return;
        svgH.rect(bx0, y(k) - bh / 2, len, bh, { fill: net > 0 ? (isK ? COL.upHi : COL.up) : (isN ? COL.downHi : COL.down), opacity: isK || isN ? 1 : 0.8 }, svg);
        var w0 = byK[k];
        if (w0) {
          var dX = net > 0 ? w0[1] : w0[2], o0 = net > 0 ? w0[3] : w0[4];
          if (isNum(dX) && dX > 0) {
            var f = clamp(dX / ((o0 || 0) + dX), 0, 1);
            if (f * len >= 1) svgH.rect(bx0, y(k) - bh / 4, f * len, bh / 2, { fill: net > 0 ? COL.upLite : COL.downLite }, svg);
          }
        }
      });
      bars.forEach(function (b) {
        var k = b[0], w0 = byK[k], tip = kS(k) + ' strike (' + pc(k / S0 - 1) + '): net GEX ' + usd(b[1]) +
          (isNum(b[2]) ? ' · calls ' + usd(b[2]) + ' · puts ' + usd(-b[3]) : '') + ' · ' + pick.key + ' expiries ($ per 1% move)';
        if (w0) tip += ' · opened ' + (o.winLabel || 'in the window') + ': calls ' + SKT.fmt.sk(w0[1]) + ', puts ' + SKT.fmt.sk(w0[2]);
        svgH.rect(bx0, y(k) - hh / 2, cw - bx0, hh, { fill: 'transparent', 'data-tip': tip }, svg);
      });
    }
    if (open) {
      var mid = (bx0 + bx1) / 2, half = (bx1 - bx0) / 2 - 2, om = 1;
      var BY = by.filter(function (b) { return onY(b[0]); });
      BY.forEach(function (b) { om = Math.max(om, b[3] || 0, (b[3] || 0) + (b[1] || 0), b[4] || 0, (b[4] || 0) + (b[2] || 0)); });
      var sc = function (vv) { return Math.max(0, vv) / om * half; };
      svgH.line(mid, top, mid, bot, { stroke: '#3a4253' }, svg);
      BY.forEach(function (b) {
        var k = b[0], yy = y(k) - bh / 2;
        [['c', b[1], b[3], 1], ['p', b[2], b[4], -1]].forEach(function (s) {
          var d = s[1] || 0, o0 = s[2] || 0, dir = s[3], base = Math.min(o0, o0 + d), now = o0 + d;
          var baseCol = s[0] === 'c' ? '#2c6e66' : '#7a3533', hiCol = s[0] === 'c' ? '#46e3cf' : '#ff7d7a';
          var xA = function (vv) { return dir > 0 ? mid : mid - sc(vv); };
          if (base > 0) svgH.rect(xA(base), yy, sc(base), bh, { fill: baseCol }, svg);
          if (d > 0) svgH.rect(dir > 0 ? mid + sc(o0) : mid - sc(now), yy, Math.max(1, sc(now) - sc(o0)), bh, { fill: hiCol }, svg);
          else if (d < 0) svgH.rect(dir > 0 ? mid + sc(now) : mid - sc(o0), yy, Math.max(1, sc(o0) - sc(now)), bh, { fill: 'none', stroke: baseCol, 'stroke-dasharray': '2 2' }, svg);
        });
        var t = kS(k) + ' strike (' + pc(k / S0 - 1) + '): calls ' + SKT.fmt.sk(b[1]) + ' (' + SKT.fmt.num(b[3]) + ' at the window start → ' + SKT.fmt.num((b[3] || 0) + (b[1] || 0)) +
          ') · puts ' + SKT.fmt.sk(b[2]) + ' (' + SKT.fmt.num(b[4]) + ' → ' + SKT.fmt.num((b[4] || 0) + (b[2] || 0)) + ')';
        svgH.rect(bx0, y(k) - hh / 2, cw - bx0, hh, { fill: 'transparent', 'data-tip': t }, svg);
      });
      var capF = '600 10.5px ' + fam(), room = cw - bx0 - 6;
      var cap = 'OPENED ' + (o.winLabel || '').toUpperCase() + (o.win && o.win.from ? ' · FROM ' + SKT.fmt.dayShort(o.win.from).toUpperCase() : '');
      if (SKT.svg.measure(cap, capF) > room) cap = 'OPENED ' + (o.winLabel || '').toUpperCase();
      var ws = { '1d': '1D', '1w': '1W', '2w': '2W', '1m': '1M', all: 'TOTAL' }[SKT.S.w];
      if (SKT.svg.measure(cap, capF) > room && ws) cap = 'OPENED ' + ws;
      if (SKT.svg.measure(cap, capF) > room) cap = 'OPENED';
      svgH.text(bx0 + 2, top + 11, cap, { fill: COL.mut, 'font-size': 10.5, 'font-weight': 600 }, svg);
      if (!BY.length) svgH.text(mid, (top + bot) / 2, 'no strike changes in range', { fill: COL.mut, 'font-size': 11, 'text-anchor': 'middle' }, svg);
    }


    spread(pills, GAP, top + PH / 2 + 1, bot - PH / 2 - 1);
    pills.forEach(function (q) {
      var x = Math.max(4, cw - q.w - 6);
      q.x = x;
      if (Math.abs(q.y - q.y0) > 2) svgH.line(x - 8, q.y0, x, q.y, { stroke: q.st.stroke || q.st.fill }, svg);
      pill(svg, x, q.y, q.w, q.t, q.st);
      boxes.push([x, q.y - PH / 2, q.w, PH]);
    });

    tags.forEach(function (t) {
      svgH.rect(cw + 2, t.y - 9, padR - 4, 18, { rx: 2, fill: t.fill, stroke: t.stroke || null }, svg);
      svgH.text(cw + 7, t.y + 4, t.t, { 'font-size': 11, fill: t.ink, 'font-weight': t.bold ? 700 : 500 }, svg);
    });

    var lvK = {};
    lv0.forEach(function (q) { lvK[q.k] = 1; });
    var shown = {};
    function tipTag(k, t, st, net, tShort) {
      if (!onY(k) || shown[k]) return;
      var w = tw(t, st.bold);
      if (bx0 + 4 + w > cw - 2 && tShort) { t = tShort; w = tw(t, st.bold); }
      if (bx0 + 4 + w > cw - 2) return;
      var yy = y(k), x = clamp(bx0 + blenOf(net || 0) + 6, bx0 + 4, cw - w - 6);
      var box = [x, yy - PH / 2, w, PH];
      if (boxes.some(function (bb) { return hit(bb, box); })) return;
      boxes.push(box); shown[k] = 1;
      pill(svg, x, yy, w, t, st);
    }
    var netAt = {};
    bars.forEach(function (b) { netAt[b[0]] = b[1]; });
    if (!open && lay('top') && o.top) {
      o.top.forEach(function (q, i) {
        if (lvK[q.k] && i) return;
        var t = SKT.fmt.sk(q.d) + ' ' + kS(q.k) + q.cp + (narrow ? '' : ' ' + SKT.fmt.exp(q.exp));
        tipTag(q.k, t, i === 0 ? ST.one : q.cp === 'P' ? ST.bigP : ST.bigC, netAt[q.k], SKT.fmt.sk(q.d) + ' ' + kS(q.k) + q.cp);
      });
    }
    var BIG = G && G.big ? (puts ? G.big.neg : G.big.pos) || [] : [];
    if (!open && lay('far') && BIG.length) {
      BIG.forEach(function (b) {
        var k = b[0];
        if (lvK[k] || (lv && k === lv.king)) return;
        var t = kS(k) + ' ' + pc(k / S0 - 1) + ' · ' + usd(b[1]) + ' · #' + b[2];
        tipTag(k, t, b[2] === 1 ? ST.one : puts ? ST.bigP : ST.bigC, b[1], kS(k) + ' · #' + b[2]);
      });
    }

    var up = [], dn = [];
    function off(k, t, st) { if (isNum(k) && !onY(k)) (k >= hi ? up : dn).push({ k: k, t: (k >= hi ? '▲ ' : '▼ ') + t, st: st }); }
    var e2 = narrow ? 2 : 0;
    if (lv && lay('king')) off(lv.king, e2 ? 'K ' + kS(lv.king) + ' ' + pc(lv.king / S0 - 1) : 'KING ' + kS(lv.king) + ' ' + pc(lv.king / S0 - 1) + ' · ' + usd(lv.king_gex), ST.king);
    if (lv && lay('walls')) {
      if (lv.call_wall !== lv.king) off(lv.call_wall, (e2 ? 'CW ' : 'CALL WALL ') + kS(lv.call_wall) + ' ' + pc(lv.call_wall / S0 - 1), ST.cw);
      if (lv.put_wall !== lv.king && lv.put_wall !== lv.call_wall) off(lv.put_wall, (e2 ? 'PW ' : 'PUT WALL ') + kS(lv.put_wall) + ' ' + pc(lv.put_wall / S0 - 1), ST.pw);
    }
    if (lv && lay('flip')) off(lv.flip, (e2 ? 'F ' : 'FLIP ') + kS(lv.flip) + ' ' + pc(lv.flip / S0 - 1), ST.flip);
    if (isNum(o.kgK) && lay('king') && !(lv && o.kgK === lv.king)) off(o.kgK, (e2 ? 'KN ' : 'KING NODE (THIS BOARD) ') + kS(o.kgK) + ' ' + pc(o.kgK / S0 - 1), ST.kn);
    if (o.mc && lay('main')) off(o.mc.k, 'main bet $' + kS(o.mc.k) + o.mc.cp + ' · ' + SKT.fmt.exp(o.mc.exp, ' ') + ' (' + pc(o.mc.k / S0 - 1) + ')', puts ? ST.betP : ST.betC);
    if (o.hl) off(o.hl.k, o.hl.label, ST.hl);
    (o.extraLines || []).forEach(function (x) { if (x && isNum(+x.k)) off(+x.k, String(x.label || kS(+x.k)), { fill: ST.xl.fill, ink: ST.xl.ink, stroke: x.color || ST.xl.stroke, dash: 1 }); });
    if (lay('far') && isNum(S0)) {
      BIG.forEach(function (b) {
        var k = b[0];
        if (lvK[k] || k < S0 * 0.5 || k > S0 * 2) return;
        off(k, kS(k) + ' ' + pc(k / S0 - 1) + ' · ' + usd(b[1]) + ' · #' + b[2] + (narrow ? '' : ' ' + (puts ? 'put' : 'call') + ' strike'), b[2] === 1 ? ST.oneEdge : puts ? ST.bigP : ST.bigC);
      });
    }
    up.sort(function (a, b) { return b.k - a.k; });
    dn.sort(function (a, b) { return a.k - b.k; });
    function place(q, y0, dy) {
      var w = tw(q.t, q.st.bold), x = Math.max(4, Math.min(bx0, cw - 6 - w));
      for (var i = 0, yy = y0; i < 14 && yy >= top && yy <= bot - PH; i++, yy += dy) {
        var box = [x, yy, w, PH];
        if (boxes.some(function (bb) { return hit(bb, box); })) continue;
        boxes.push(box);
        pill(svg, x, yy + PH / 2, w, q.t, q.st);
        return yy;
      }
      return null;
    }
    var yu = top + (open ? 16 : 2), yd = bot - PH - 2;
    up.forEach(function (q) { var u = place(q, yu, 20); if (u != null) yu = u + 20; });
    dn.forEach(function (q) { var u = place(q, yd, -20); if (u != null) yd = u - 20; });


    if (lay('ribbon')) {
      var mxp = 0;
      Object.keys(DI).forEach(function (d) { if (isNum(DI[d].pct)) mxp = Math.max(mxp, Math.abs(DI[d].pct)); });
      Object.keys(DI).forEach(function (d) {
        var p = xOf(d), inf = DI[d];
        if (!p) return;
        var l = inf.l || '', c = l.indexOf('c') >= 0 ? COL.up : l.indexOf('p') >= 0 ? COL.down : null;
        var x0 = p.x - p.w / 2 + (p.w > 3 ? 0.5 : 0), w = Math.max(1, p.w - (p.w > 3 ? 1 : 0));
        if (c) svgH.rect(x0, bot + 3, w, 7, { fill: c, opacity: isNum(inf.pct) && mxp ? 0.35 + 0.65 * Math.min(1, Math.abs(inf.pct) / mxp) : 0.8, stroke: l.indexOf('g') >= 0 ? COL.gold : null, 'stroke-width': 1.2 }, svg);
        else if (l.indexOf('q') >= 0) svgH.rect(x0, bot + 3, w, 7, { fill: 'none', stroke: COL.mut, 'stroke-width': 0.8 }, svg);
        else svgH.rect(x0, bot + 6, w, 1.5, { fill: '#363c4a' }, svg);
      });
    }
    var lastM = '', lastX2 = -99;
    B.forEach(function (b, i) {
      var m = b.d.slice(0, 7);
      if (m === lastM) return;
      lastM = m;
      if (i === 0 && n > 30 && +b.d.slice(8) > 7 && o.cs === 'd') return;
      if (i * cwid - lastX2 < 36) return;
      lastX2 = i * cwid;
      svgH.text(i * cwid, H - 6, SKT.MON[+b.d.slice(5, 7) - 1] + (b.d.slice(5, 7) === '01' ? ' ’' + b.d.slice(2, 4) : ''), { fill: COL.mut, 'font-size': 11 }, svg);
    });
    B.forEach(function (b, i) {
      var prev = i ? B[i - 1].c : null, chg = isNum(prev) && isNum(b.c) && prev ? b.c / prev - 1 : null;
      var label = b.d === b.d1 ? SKT.fmt.day(b.d) : SKT.fmt.dayShort(b.d) + ' → ' + SKT.fmt.dayShort(b.d1);
      var t = label + (isNum(b.o) ? ' · open ' + b.o.toFixed(2) : '') + (isNum(b.h) ? ' · high ' + b.h.toFixed(2) : '') + (isNum(b.l) ? ' · low ' + b.l.toFixed(2) : '') +
        (isNum(b.c) ? ' · close ' + b.c.toFixed(2) : '') + (chg != null ? ' (' + pc(chg) + ')' : '');
      b.days.forEach(function (d) { if (DI[d] && DI[d].tip) t += ' | ' + DI[d].tip; });
      svgH.rect(i * cwid, top, cwid, bot + 10 - top, { fill: 'transparent', 'data-tip': t }, svg);
    });
    holdOn(svg);
    el.appendChild(svg);
    var geo = { W: W, H: H, cw: cw, cx1: cx1, padR: padR, xOf: xOf, cwid: cwid, n: n, from: B[0].d, to: B[n - 1].d1, short: ll === 2 && pills.length > 0,
      line: lineMode, closeOnly: B.some(function (b) { return isNum(b.c) && (!isNum(b.h) || !isNum(b.l)); }), hlBars: B.some(function (b) { return !isNum(b.o) && isNum(b.h); }),
      win: pick ? pick.key : null, want: pick ? pick.want : null, lv: lv, spot: S0, nBars: bars.length, pills: pills.length };
    el._geo = geo;
    return geo;
  }

  function gex(el, nf, opts) {
    opts = opts || {};
    var o = Object.assign({}, opts, { mode: 'gex' });
    return reg(el, function (w) { var g = pricePane(el, nf, o, w); if (o.onDraw) o.onDraw(g); return g; });
  }
  function opened(el, nf, opts) {
    opts = opts || {};
    var o = Object.assign({}, opts, { mode: 'open' });
    return reg(el, function (w) { var g = pricePane(el, nf, o, w); if (o.onDraw) o.onDraw(g); return g; });
  }



  function sessionBarsDraw(el, nf, o, Wbox) {
    var svgH = SKT.svg;
    el.textContent = '';
    var geo = o.geoEl && o.geoEl._geo;
    var days = ((nf && nf.days) || []).filter(function (d) { return d && d.length > 1; });
    if (!geo || !days.length) return msg(el, days.length ? '' : 'No session detail on file.');
    var phone = o.phone != null ? o.phone : innerWidth < 760, H = phone ? 190 : 210, W = geo.W, cw = geo.cw;
    var top = 14, bot = H - 16, mid = (top + bot) / 2, half = (bot - top) / 2 - 2;
    var svg = svgH.root(W, H, { 'class': 'nv-chart nv-sess', role: 'img', 'aria-label': 'contracts opened per session by where they last traded' });
    svg.style.display = 'block'; svg.style.maxWidth = '100%';
    var df = defs(svg), idc = 'nvsc' + (++uid), idp = 'nvsp' + uid;
    var fc = stripes(svg, df, idc, COL.up), fp = stripes(svg, df, idp, COL.down);
    var mx = 1, CL = o.closes || {};
    days.forEach(function (d) {
      mx = Math.max(mx, d[1] || 0, d[2] || 0);
      var c = CL[d[0]];
      if (c) mx = Math.max(mx, c[0] || 0, c[1] || 0);
    });
    var sc = function (v) { return Math.max(0, v || 0) / mx * half; };
    svgH.line(0, mid, cw, mid, { stroke: '#3a4253' }, svg);
    svgH.line(cw, 0, cw, H, { stroke: COL.axis }, svg);
    svgH.text(cw + 7, top + 4, '+' + SKT.fmt.k(mx), { fill: COL.mut, 'font-size': 10.5 }, svg);
    svgH.text(cw + 7, mid + 4, '0', { fill: COL.mut, 'font-size': 10.5 }, svg);
    svgH.text(cw + 7, bot + 2, '−' + SKT.fmt.k(mx), { fill: COL.mut, 'font-size': 10.5 }, svg);
    var lean = o.side === 'P' ? 'P' : 'C', drawn = [];
    days.forEach(function (d) {
      var p = geo.xOf(d[0]);
      if (!p) return;
      var w = Math.max(1, Math.min(14, p.w * 0.72)), x0 = p.x - w / 2;
      var tgC = d[5] || [0, 0, 0, d[1] || 0], tgP = d[6] || [0, 0, 0, d[2] || 0];
      var yy = mid;
      [[tgC[0], COL.up], [tgC[1], fc], [(tgC[2] || 0) + (tgC[3] || 0), COL.grey]].forEach(function (s) { var h = sc(s[0]); if (h > 0) { svgH.rect(x0, yy - h, w, h, { fill: s[1] }, svg); yy -= h; } });
      var yc = yy; yy = mid;
      [[tgP[0], COL.down], [tgP[1], fp], [(tgP[2] || 0) + (tgP[3] || 0), COL.grey]].forEach(function (s) { var h = sc(s[0]); if (h > 0) { svgH.rect(x0, yy, w, h, { fill: s[1] }, svg); yy += h; } });
      var yp = yy, cl = CL[d[0]];
      if (cl) {
        var wc = Math.max(1, w * 0.5);
        if (cl[0] > 0) svgH.rect(p.x - wc / 2, mid, wc, sc(cl[0]), { fill: 'none', stroke: COL.up, 'stroke-width': 0.8, 'stroke-dasharray': '2 1.5' }, svg);
        if (cl[1] > 0) svgH.rect(p.x - wc / 2, mid - sc(cl[1]), wc, sc(cl[1]), { fill: 'none', stroke: COL.down, 'stroke-width': 0.8, 'stroke-dasharray': '2 1.5' }, svg);
      }
      var L = d[9] || '';
      if (L.indexOf('g') >= 0) svgH.el('circle', { cx: p.x, cy: (lean === 'P' ? yp + 5 : yc - 5), r: 2.8, fill: COL.gold }, svg);
      drawn.push({ d: d, p: p, yc: yc, yp: yp });
      var sumC = d[1] || 0, ask = tgC[0] || 0, top0 = (d[7] || [])[0], top1 = (d[8] || [])[0];
      var t = 'After the ' + SKT.fmt.dayShort(d[0]) + ' close: ' + SKT.fmt.sk(sumC) + ' calls opened' + (sumC > 0 ? ' (' + Math.round(ask / sumC * 100) + '% at the ask)' : '') +
        ' · ' + SKT.fmt.sk(d[2] || 0) + ' puts' + (d[2] > 0 ? ' (' + Math.round((tgP[0] || 0) / d[2] * 100) + '% at the ask)' : '') +
        (top0 ? ' · top call: ' + SKT.fmt.exp(top0[0]) + ' ' + kS(top0[1]) + 'C ' + SKT.fmt.sk(top0[2]) : '') +
        (top1 ? ' · top put: ' + SKT.fmt.exp(top1[0]) + ' ' + kS(top1[1]) + 'P ' + SKT.fmt.sk(top1[2]) : '') +
        (cl ? ' · closed ' + SKT.fmt.k(cl[0]) + ' calls, ' + SKT.fmt.k(cl[1]) + ' puts' : '');
      svgH.rect(p.x - p.w / 2, top, p.w, bot - top, { fill: 'transparent', 'data-tip': t }, svg);
    });

    var li = lean === 'P' ? 2 : 1, ti = lean === 'P' ? 8 : 7;
    var big = drawn.slice().sort(function (a, b) { return (b.d[li] || 0) - (a.d[li] || 0); }).slice(0, 2);
    var used = [];
    big.forEach(function (q) {
      var tp = (q.d[ti] || [])[0];
      if (!tp || !(q.d[li] > 0) || !isNum(tp[2])) return;
      var t = SKT.fmt.sk(tp[2]) + ' ' + SKT.fmt.exp(tp[0]) + ' $' + kS(tp[1]) + lean, w = SKT.svg.measure(t, '600 10.5px ' + fam()) + 4;
      var x = clamp(q.p.x - w / 2, 2, cw - w - 2), yy = lean === 'P' ? Math.min(H - 4, q.yp + 13) : Math.max(11, q.yc - 4);
      if (used.some(function (u) { return Math.abs(u[1] - yy) < 12 && x < u[0] + u[2] && u[0] < x + w; })) yy += lean === 'P' ? -26 : 13;
      used.push([x, yy, w]);
      svgH.text(x, yy, t, { fill: lean === 'P' ? '#ffb0ae' : '#9fe0d6', 'font-size': 10.5, 'font-weight': 600,
        'data-tip': 'After the ' + SKT.fmt.dayShort(q.d[0]) + ' close: top ' + SKT.fmt.exp(tp[0]) + ' $' + kS(tp[1]) + lean + ' ' + SKT.fmt.sk(tp[2]) + ' of the ' + SKT.fmt.sk(q.d[li]) + ' ' + (lean === 'P' ? 'puts' : 'calls') + ' opened that day' }, svg);
    });

    if (o.crowd && o.crowd.pts && o.crowd.pts.length > 1) {
      var cm = 0;
      o.crowd.pts.forEach(function (q) { if (isNum(q[1])) cm = Math.max(cm, Math.abs(q[1])); });
      if (cm > 0) {
        var dd = '', pen = false, last = null;
        o.crowd.pts.forEach(function (q) {
          var p = geo.xOf(q[0]);
          if (!p || !isNum(q[1])) { pen = false; return; }
          var Y = mid - q[1] / cm * half * 0.9;
          dd += (pen ? 'L' : 'M') + p.x.toFixed(1) + ' ' + Y.toFixed(1); pen = true; last = [p.x, Y];
        });
        if (dd) {
          svgH.path(dd, { fill: 'none', stroke: COL.amber, 'stroke-width': 1.3, 'stroke-dasharray': '4 3', 'data-tip': o.crowd.label + ': the crowd’s daily net as a share of its combined open interest (own scale)' }, svg);
          if (last) svgH.el('circle', { cx: last[0], cy: last[1], r: 2.5, fill: COL.amber }, svg);
        }
      }
    }
    holdOn(svg);
    el.appendChild(svg);
    return { W: W };
  }
  function sessionBars(el, nf, opts) {
    opts = opts || {};
    return reg(el, function (w) { return sessionBarsDraw(el, nf, opts, w); });
  }



  function ratioDraw(el, h, o, W) {
    var svgH = SKT.svg;
    el.textContent = '';
    h = (h || []).filter(function (x) { return x && x[0]; });
    var n = h.length;
    if (n < 2) return msg(el, 'Not enough settles on file for this chart yet.');
    var A = h.map(function (x) { return x[2] > 0 && x[1] > 0 ? x[1] / x[2] : null; });
    var G = h.map(function (x) { return x[4] > 0 && x[3] > 0 ? x[3] / x[4] : null; });
    var vals = A.concat(G).filter(function (v) { return v > 0 && isFinite(v); });
    if (!vals.length) return msg(el, 'Not enough settles on file for this chart yet.');
    var vmin = Math.min.apply(null, vals), vmax = Math.max.apply(null, vals);
    var lo = Math.log(Math.min(vmin, 1)), hi = Math.log(Math.max(vmax, 1)), pad = Math.max((hi - lo) * 0.12, 0.03);
    lo -= pad; hi += pad;
    var H = o.h || 190, l = 50, rt = 92, t = 24, b = 22;
    var X = function (i) { return l + i * (W - l - rt) / (n - 1); }, Y = function (v) { return t + (1 - (Math.log(v) - lo) / (hi - lo)) * (H - t - b); };
    function rTxt(r) { return r >= 1 ? r.toFixed(r >= 10 ? 0 : 2) + ' : 1' : '1 : ' + (1 / r).toFixed(1 / r >= 10 ? 0 : 2); }
    var svg = svgH.root(W, H, { 'class': 'nv-chart', role: 'img', 'aria-label': 'open calls to puts after each close' });
    svg.style.display = 'block'; svg.style.maxWidth = '100%';
    var ticks = [vmax];
    if (Y(vmin) - Y(vmax) > 14) ticks.push(vmin);
    if (ticks.every(function (v) { return Math.abs(Y(v) - Y(1)) > 12; })) ticks.push(1);
    ticks.forEach(function (v) {
      svgH.line(l, Y(v), W - rt, Y(v), { stroke: '#232a38', 'stroke-dasharray': v === 1 ? '4 3' : null }, svg);
      svgH.text(l - 6, Y(v) + 4, v === 1 ? 'even' : rTxt(v), { fill: COL.mut, 'font-size': 10.5, 'text-anchor': 'end' }, svg);
    });
    (o.guides || []).forEach(function (g) {
      var i = -1;
      h.forEach(function (x, j) { if (x[0] <= g.d) i = j; });
      if (i <= 0 || i >= n - 1) return;
      svgH.line(X(i), t - 4, X(i), H - b, { stroke: '#3a4253', 'stroke-dasharray': '2 3' }, svg);
      svgH.text(X(i), t - 9, g.label, { fill: '#a9b0bc', 'font-size': 10.5, 'text-anchor': 'middle' }, svg);
    });
    function path(v) { var d = '', pen = false; v.forEach(function (yv, i) { if (!(yv > 0)) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(yv).toFixed(1); pen = true; }); return d; }
    svgH.path(path(G), { fill: 'none', stroke: COL.b180, 'stroke-width': 2, 'stroke-dasharray': '5 3', 'stroke-linejoin': 'round' }, svg);
    svgH.path(path(A), { fill: 'none', stroke: COL.pink, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    var ends = [[A, COL.pink, 'all'], [G, COL.b180, '180d+']].filter(function (e) { return e[0][n - 1] > 0; })
      .map(function (e) { return { v: e[0][n - 1], col: e[1], lab: e[2], y: Y(e[0][n - 1]) }; });
    if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 14) {
      var u = ends[0].y <= ends[1].y ? ends[0] : ends[1], d2 = u === ends[0] ? ends[1] : ends[0], m = (u.y + d2.y) / 2;
      u.ly = m - 7; d2.ly = m + 7;
    }
    ends.forEach(function (e) {
      svgH.el('circle', { cx: X(n - 1), cy: e.y, r: 4, fill: e.col, stroke: '#151a23', 'stroke-width': 2 }, svg);
      var tx = svgH.text(X(n - 1) + 9, (e.ly != null ? e.ly : e.y) + 4, rTxt(e.v) + ' ', { fill: '#e8eaed', 'font-size': 11, 'font-weight': 600 }, svg);
      var ts = svgH.el('tspan', { fill: '#a9b0bc', 'font-weight': 400 }, tx); ts.textContent = e.lab;
    });
    var every = Math.max(1, Math.ceil(n * 46 / (W - l - rt))), bw = (W - l - rt) / (n - 1), lastLX = -1e9, endX = X(n - 1);
    h.forEach(function (x, i) {
      var xx = X(i);
      if (i === n - 1 || ((i === 0 || i % every === 0) && xx - lastLX >= 46 && endX - xx >= 46)) {
        svgH.text(xx, H - 6, SKT.fmt.dayShort(x[0]), { fill: COL.mut, 'font-size': 10.5, 'text-anchor': 'middle' }, svg);
        lastLX = xx;
      }
      var tip = 'After the ' + SKT.fmt.dayShort(x[0]) + ' close: ' + SKT.fmt.num(x[1]) + ' calls · ' + SKT.fmt.num(x[2]) + ' puts (' + SKT.fmt.ratio(x[1], x[2], 2) + ')' +
        (isNum(x[3]) && isNum(x[4]) && x[3] + x[4] > 0 ? ' | 180+ days ' + SKT.fmt.num(x[3]) + ' · ' + SKT.fmt.num(x[4]) + ' (' + SKT.fmt.ratio(x[3], x[4], 2) + ')' : '');
      svgH.rect(X(i) - bw / 2, t, bw, H - t - b, { fill: 'transparent', 'data-tip': tip }, svg);
    });
    holdOn(svg);
    el.appendChild(svg);
    return { W: W };
  }
  function ratio(el, cph, opts) { opts = opts || {}; return reg(el, function (w) { return ratioDraw(el, cph, opts, w); }); }



  function ivDraw(el, ivt, o, W) {
    var svgH = SKT.svg;
    el.textContent = '';
    var P = (ivt || []).filter(function (x) { return x && /^\d{6}$/.test(x[0]) && isNum(x[1]); });
    if (P.length < 2) return msg(el, P.length ? '' : 'No implied volatility on file.');
    var L0 = Date.parse((o.L || '') + 'T00:00:00Z') || Date.now();
    var dte = P.map(function (x) { return Math.max(1, (Date.parse('20' + x[0].slice(0, 2) + '-' + x[0].slice(2, 4) + '-' + x[0].slice(4, 6) + 'T00:00:00Z') - L0) / 864e5); });
    var H = 150, l = 34, r = 12, t = 14, b = 22;
    var x0 = Math.log(dte[0] + 7), x1 = Math.log(dte[dte.length - 1] + 7);
    var X = function (i) { return x1 === x0 ? (l + W - r) / 2 : l + (Math.log(dte[i] + 7) - x0) / (x1 - x0) * (W - l - r); };
    var vs = P.map(function (x) { return x[1]; });
    if (isNum(o.iv30)) vs.push(o.iv30);
    var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), pad = Math.max((hi - lo) * 0.15, 1.5);
    lo -= pad; hi += pad;
    var Y = function (v) { return t + (hi - v) / (hi - lo) * (H - t - b); };
    var svg = svgH.root(W, H, { 'class': 'nv-chart', role: 'img', 'aria-label': 'implied volatility by expiry' });
    svg.style.display = 'block'; svg.style.maxWidth = '100%';
    svgH.axis(svg, { dir: 'y', min: lo, max: hi, from: Y(lo), to: Y(hi), at: l, ticks: 3, grid: [l, W - r], fmt: function (v) { return Math.round(v) + '%'; } });
    if (isNum(o.iv30)) {
      svgH.line(l, Y(o.iv30), W - r, Y(o.iv30), { stroke: COL.light, 'stroke-dasharray': '4 3', opacity: 0.8 }, svg);
      svgH.text(W - r, Y(o.iv30) - 4, '30-day IV ' + o.iv30.toFixed(1) + '%', { fill: COL.light, 'font-size': 10.5, 'text-anchor': 'end' }, svg);
    }
    var d = P.map(function (x, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x[1]).toFixed(1); }).join('');
    svgH.path(d, { fill: 'none', stroke: COL.text, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, svg);
    var labs = [];

    var tight = P.length > 0 && (W - l - r) / P.length < 62;
    var ivLab = function (e) { var t = SKT.fmt.exp(e); return / ’\d\d$/.test(t) && tight ? t.replace(/-\d\d(?= ’)/, '') : t; };
    P.forEach(function (x, i) {
      var isM = x[0] === o.mcExp, isB = o.bump && o.bump[0] === x[0];
      svgH.el('circle', { cx: X(i), cy: Y(x[1]), r: isM ? 4.5 : 2.5, fill: isM ? COL.gold : '#a9b0bc', stroke: isB ? COL.amber : null, 'stroke-width': isB ? 2 : null }, svg);
      labs.push({ i: i, x: X(i), t: ivLab(x[0], i), m: isM });
      svgH.rect(X(i) - 6, t, 12, H - t - b, { fill: 'transparent', 'data-tip': SKT.fmt.exp(x[0], ' ') + ': at-the-money IV ' + x[1].toFixed(1) + '%' + (isM ? ' · the main bet’s expiry' : '') }, svg);
    });

    var fnt = '10px ' + fam(), boxes = [];
    labs.forEach(function (q) { q.w = SKT.svg.measure(q.t, fnt) + 6; q.cx = clamp(q.x, l + q.w / 2, W - r - q.w / 2); });
    var order = labs.filter(function (q) { return q.m; }).concat(labs.filter(function (q, j) { return !q.m && (j === 0 || j === labs.length - 1); }), labs.filter(function (q, j) { return !q.m && j > 0 && j < labs.length - 1; }));
    order.forEach(function (q) {
      var a = q.cx - q.w / 2, b = q.cx + q.w / 2;
      if (boxes.some(function (bb) { return a < bb[1] && bb[0] < b; })) return;
      boxes.push([a, b]);
      svgH.text(q.cx, H - 6, q.t, { fill: q.m ? COL.gold : COL.mut, 'font-size': 10, 'text-anchor': 'middle' }, svg);
    });
    el.appendChild(svg);
    return { W: W };
  }
  function iv(el, ivt, opts) { opts = opts || {}; return reg(el, function (w) { return ivDraw(el, ivt, opts, w); }); }



  function ribbonDraw(el, days, o, W) {
    var svgH = SKT.svg;
    el.textContent = '';
    days = days || [];
    if (!days.length) return null;
    var H = o.h || 12, n = days.length, w = W / n, mx = 0, P = o.pct || {};
    Object.keys(P).forEach(function (d) { if (isNum(P[d])) mx = Math.max(mx, Math.abs(P[d])); });
    var svg = svgH.root(W, H, { 'class': 'nv-ribbon', 'aria-hidden': 'true' });
    svg.style.display = 'block'; svg.style.maxWidth = '100%';
    days.forEach(function (d, i) {
      var l = (d && d[9]) || '', c = l.indexOf('c') >= 0 ? COL.up : l.indexOf('p') >= 0 ? COL.down : null, pp = P[d[0]];
      var x = i * w + 0.5, ww = Math.max(1, w - 1);
      if (c) svgH.rect(x, 1, ww, H - 2, { fill: c, opacity: isNum(pp) && mx ? 0.35 + 0.65 * Math.min(1, Math.abs(pp) / mx) : 0.8, stroke: l.indexOf('g') >= 0 ? COL.gold : null, 'stroke-width': 1.2, 'data-tip': SKT.fmt.day(d[0]) }, svg);
      else if (l.indexOf('q') >= 0) svgH.rect(x, 1, ww, H - 2, { fill: 'none', stroke: COL.mut, 'stroke-width': 0.8, 'data-tip': SKT.fmt.day(d[0]) + ': quiet' }, svg);
      else svgH.rect(x, H / 2 - 1, ww, 2, { fill: '#363c4a' }, svg);
      if (o.day && d[0] === o.day) svgH.rect(x - 0.5, 0, ww + 1, H, { fill: 'none', stroke: '#fff', 'stroke-width': 1 }, svg);
    });
    el.appendChild(svg);
    return { W: W };
  }
  function ribbon(el, days, opts) { opts = opts || {}; return reg(el, function (w) { return ribbonDraw(el, days, opts, w); }); }



  function byStrikeDraw(el, by, o, W) {
    var svgH = SKT.svg, S0 = o.spot;
    el.textContent = '';
    var X = (by || []).filter(function (b) { return isNum(S0) && b[0] >= S0 * 0.75 && b[0] <= S0 * 1.35 && (b[1] || b[2]); });
    if (!X.length) return msg(el, 'No strike moved within the chart range.');
    var mx = 1, lo = S0, hi = S0;
    X.forEach(function (b) { mx = Math.max(mx, Math.abs(b[1] || 0), Math.abs(b[2] || 0)); lo = Math.min(lo, b[0]); hi = Math.max(hi, b[0]); });
    var rowH = Math.max(10, Math.min(16, 260 / X.length)), H = Math.max(110, Math.min(300, X.length * rowH + 34)), top = 8, bot = H - 20;
    var span = (hi - lo) || S0 * 0.02;
    var y = function (k) { return top + (hi + span * 0.04 - k) / (span * 1.08) * (bot - top); };
    var l = 40, cx = l + (W - l) / 2, half = (W - l) / 2 - 6;
    var ks = X.map(function (b) { return b[0]; }).sort(function (a, b) { return a - b; }), gap = Infinity;
    for (var i = 1; i < ks.length; i++) if (ks[i] > ks[i - 1]) gap = Math.min(gap, ks[i] - ks[i - 1]);
    var bh = Math.max(2, Math.min(7, (isFinite(gap) ? y(0) - y(gap) : 10) * 0.42));
    var svg = svgH.root(W, H, { 'class': 'nv-chart', role: 'img', 'aria-label': 'open interest change by strike' });
    svg.style.display = 'block'; svg.style.maxWidth = '100%';
    var st = svgH.niceStep(span, 5);
    for (var t = Math.ceil(lo / st) * st; t <= hi; t += st) {
      svgH.line(l, y(t), W, y(t), { stroke: COL.grid }, svg);
      svgH.text(l - 5, y(t) + 3.5, fx(t, st), { fill: COL.mut, 'font-size': 10.5, 'text-anchor': 'end' }, svg);
    }
    svgH.line(cx, top, cx, bot, { stroke: '#4a4f5c' }, svg);
    svgH.line(l, y(S0), W, y(S0), { stroke: COL.price, 'stroke-dasharray': '2 3' }, svg);
    svgH.text(W - 2, y(S0) - 3, 'price ' + S0.toFixed(2), { fill: COL.light, 'font-size': 10.5, 'text-anchor': 'end' }, svg);
    X.forEach(function (b) {
      [[b[1], -bh, COL.up], [b[2], 0, COL.down]].forEach(function (s) {
        var v = s[0] || 0;
        if (!v) return;
        var len = Math.max(1, Math.abs(v) / mx * half);
        svgH.rect(v > 0 ? cx : cx - len, y(b[0]) + s[1], len, bh, { fill: s[2], opacity: 0.9 }, svg);
      });
      svgH.rect(l, y(b[0]) - bh - 1, W - l, bh * 2 + 2, { fill: 'transparent', 'data-tip': kS(b[0]) + ' (' + pc(b[0] / S0 - 1) + '): calls ' + SKT.fmt.sk(b[1]) + ' · puts ' + SKT.fmt.sk(b[2]) }, svg);
    });
    svgH.text(cx - 6, H - 5, '← closed', { fill: COL.mut, 'font-size': 10.5, 'text-anchor': 'end' }, svg);
    svgH.text(cx + 6, H - 5, 'opened →', { fill: COL.mut, 'font-size': 10.5 }, svg);
    el.appendChild(svg);
    return { W: W };
  }
  function byStrike(el, by, opts) { opts = opts || {}; return reg(el, function (w) { return byStrikeDraw(el, by, opts, w); }); }

  SKT.charts = { gex: gex, opened: opened, sessionBars: sessionBars, ratio: ratio, iv: iv, ribbon: ribbon, redraw: redraw, byStrike: byStrike };

})();
