










(function () {
  'use strict';
  function start() {
    var sec = document.getElementById('kdj'), psec = document.getElementById('pkdj');
    if (!sec && !psec) return;
    whenAISB(function (A) {
      if (sec) { try { initKdj(sec, A); } catch (e) { if (window.console) console.warn('bkdj', e); } }
      if (psec) { try { initPkdj(psec, A); } catch (e) { if (window.console) console.warn('pkdj', e); } }
    });
  }
  function whenAISB(fn) {
    var tries = 0;
    (function wait() {
      if (window.AISB && typeof window.AISB.on === 'function') { fn(window.AISB); return; }
      if (++tries > 600) return;
      setTimeout(wait, 50);
    })();
  }


  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    fear: '#3987E5', light: '#8EC0FA', b200: '#F0883E', b200l: '#F7B57F' };
  var FONT = (getComputedStyle(document.documentElement).getPropertyValue('--font') || '').trim() || 'sans-serif';
  var TFS = ['1D', '1W', '2W', '1M'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var NS = 'http://www.w3.org/2000/svg';
  var HOVER = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var TAP = HOVER ? 'hover' : 'tap';
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function div(cls, parent) { var d = document.createElement('div'); if (cls) d.className = cls; if (parent) parent.appendChild(d); return d; }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var mctx = document.createElement('canvas').getContext('2d');
  function textW(str, size, weight) { mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; return mctx.measureText(str).width; }
  function tx(parent, x, y, str, attrs) {
    var a = attrs || {}; a.x = x; a.y = y;
    if (!a['font-family']) a['font-family'] = FONT;
    var t = el('text', a, parent); t.textContent = str; return t;
  }
  function lin(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }
  function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function dnDate(dn) { return new Date(dn * 864e5); }
  function fmtDay(dn, withYear, withWd) {
    var d = dnDate(dn);
    return (withWd ? WD[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (withYear ? ', ' + d.getUTCFullYear() : '');
  }
  function fmtMonYear(dn) { var d = dnDate(dn); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function pct0(v) { return Math.round(v) + '%'; }
  function pct1(v) { return v.toFixed(1) + '%'; }
  function bsearchLE(arr, x) { var lo = 0, hi = arr.length - 1, ans = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; }
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function sameWindow(a, b) { return Math.abs(a.x0 - b.x0) < 1e-6 && Math.abs(a.x1 - b.x1) < 1e-6; }
  var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
  function withHalo(a) { for (var k in HALO) a[k] = HALO[k]; return a; }
  var etFmt = null;
  function etHm(iso) {
    var t = Date.parse(iso); if (isNaN(t)) return '';
    try {
      etFmt = etFmt || new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      return etFmt.format(new Date(t)) + ' ET';
    } catch (e) { return ''; }
  }
  function priceName(doc, p) { return (doc && doc.meta && doc.meta.price_head && doc.meta.price_head[p]) || p; }


  function initKdj(sec, A) {
    var KC = { k: '#4FC3F7', d: '#FFB74D', j: '#8A8F9E', yel: '#FFD84D', up: '#26A69A', dn: '#EF5350' };
    var K_NAME = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
    var K_SHOW = { '1D': 90, '1W': 78, '2W': 52, '1M': 60 };
    var K_UNIT = { '1D': ['day', 'days'], '1W': ['week', 'weeks'], '2W': ['2-week candle', '2-week candles'], '1M': ['month', 'months'] };
    var K_NEXT = { '1D': 'next day', '1W': 'next week', '2W': 'next 2-week candle', '1M': 'next month' };
    var K_MIN = 12, ZOOM_STEP = 1.6, HOLD_MS = 380;
    var GUIDE = { lo: 25, hi: 50 };
    var DOT = { peak: '#FFD84D', edge: C.bg };
    var RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120, 'All': 0 };
    var RANGE_WORDS = { '1M': 'last month', '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year', '2Y': 'last 2 years', '5Y': 'last 5 years', '10Y': 'last 10 years' };
    var K_RANGES = ['Auto', '1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', 'All'];
    var RKEY = 'aisbKdjRange';

    var doc = null, G = null, P = null, D = null, uid = 0;
    var KV = {}, KN = {}, KB = {}, kPending = {}, kRaf = false, HOV = {}, GEO = {}, kChip = 'Auto', lastTip = -1e9;

    function normKRange(s) {
      if (!s) return null;
      var u = String(s).trim().toUpperCase();
      if (u === 'AUTO') return 'Auto';
      if (u === 'ALL') return 'All';
      return RANGE_MONTHS.hasOwnProperty(u) ? u : null;
    }
    try { kChip = normKRange(new URLSearchParams(location.search).get('krange')) || normKRange(localStorage.getItem(RKEY)) || 'Auto'; } catch (e) { kChip = 'Auto'; }


    if (!sec.getAttribute('aria-labelledby')) sec.setAttribute('aria-labelledby', 't3');
    var blocks = TFS.map(function (k) {
      var nm = K_NAME[k], lo = nm.toLowerCase(), unit = k === '1D' ? 'days' : k === '1M' ? 'months' : k === '1W' ? 'weeks' : 'candles';
      return '<div class="kblock" data-k="' + k + '" aria-label="' + nm + ' candles">' +
        '<div class="kb-head"><h3>' + nm + '</h3><span class="kb-val" data-kv></span></div>' +
        '<p class="kb-note" data-kn></p><div class="readout kb-ro" data-kro aria-live="polite"></div>' +
        '<div class="zoombar kb-bar"><span class="kb-win" data-kw></span><span class="zb-btns">' +
        '<button type="button" data-kz="out" aria-label="Zoom out (' + lo + ')">−</button>' +
        '<button type="button" data-kz="in" aria-label="Zoom in (' + lo + ')">+</button>' +
        '<button type="button" data-kz="reset" aria-label="Back to the chosen range (' + lo + ')">Reset</button></span></div>' +
        '<div class="chart kb-chart" data-kc tabindex="0" role="group" aria-label="' + nm + ' candles: the price, 50-day breadth and its KDJ. Left and right arrows move through ' +
        unit + ', plus and minus zoom, 0 resets, F opens full screen."></div></div>';
    }).join('');
    var chips = K_RANGES.map(function (r) {
      var lab = r === 'Auto' ? 'Each block’s default window' : r === 'All' ? 'All data' : RANGE_WORDS[r].replace(/^last /, 'Last ');
      return '<button type="button" data-krange="' + r + '" aria-pressed="' + (r === 'Auto') + '" aria-label="' + lab + '">' + r + '</button>';
    }).join('');
    sec.innerHTML =
      '<div class="card-head"><div class="card-title"><h2 id="t3">Breadth · KDJ</h2>' +
      '<p class="sub" id="kdjSubT">The price · 50-day breadth · KDJ of the 50-day breadth, per candle size</p></div></div>' +
      '<div class="controls kdj-controls"><div class="seg seg-range seg-krange" role="group" aria-label="Time window for all four KDJ blocks" id="kranges">' + chips + '</div></div>' +
      '<p class="kdj-sub2" id="kdjSub2"></p><p class="panel-asof" id="asof3"></p>' +
      '<p class="kdj-hint"><span data-bkhint>Pinch to zoom · drag sideways to move · hold to read a day · double-tap for full screen</span> · pick a range for all four blocks, or zoom each block on its own</p>' +
      '<p class="banner banner-warn" id="kdjErr" hidden></p>' + blocks +
      '<p class="legend kdj-legend" id="lg3"></p>' +
      '<p class="kdj-honest" id="kdjHonest">KDJ of the breadth line describes its swing.</p>';
    if (HOVER) Array.prototype.forEach.call(sec.querySelectorAll('[data-bkhint]'), function (n) {
      n.textContent = 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click for full screen';
    });


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
    function validG(g) {
      if (!g || !g.bkdj || !g.v || !Array.isArray(g.v.v50) || !g.tf || !g.wash || !g.p13 || !g.pnow || !g.prices) return false;
      return TFS.every(function (k) {
        var R = g.bkdj[k], n = k === '1D' ? g.v.v50.length : (g.tf[k] && g.tf[k].ei && g.tf[k].ei.length);
        return R && n > 0 && Array.isArray(R.K) && R.K.length === n && R.D.length === n && R.J.length === n && Array.isArray(R.xu) && Array.isArray(R.xd) &&
          Array.isArray(g.wash[k]) && Array.isArray(k === '1D' ? g.p13.g50 : g.p13[k]);
      });
    }
    function prepare() {
      var DN = doc.days.map(dayNum), si = G.start_i, pr = G.prices[P] || [], out = { tf: {}, kdj: {} };
      TFS.forEach(function (k) {
        var T, n, ei;
        if (k === '1D') {
          n = G.v.v50.length; ei = []; for (var q = 0; q < n; q++) ei.push(q);
          var dd = ei.map(function (i) { return DN[si + i]; });
          T = { s: dd, e: dd, v: hund(G.v.v50), p13: G.p13.g50 };
        } else {
          var t = G.tf[k]; n = t.ei.length; ei = t.ei;
          T = { s: t.si.map(function (i) { return DN[si + i]; }), e: t.ei.map(function (i) { return DN[si + i]; }), v: hund(t.v50), p13: G.p13[k] };
        }
        var R = G.bkdj[k], ten = function (a) { return a.map(function (x) { return x == null ? null : x / 10; }); };
        T.open = !!R.op; T.closed = T.open ? n - 1 : n;
        T.wash = washOf(G.wash[k], n); T.peaks = T.wash.sig;
        T.ringOf = {}; T.wash.rings.forEach(function (r) { T.ringOf[r.k] = r.i; });
        T.sigOf = {}; T.wash.sig.forEach(function (i) { T.sigOf[i] = 1; });
        T.note = (doc.candles && doc.candles[k] && doc.candles[k].note) || '';
        var Q = { K: ten(R.K), D: ten(R.D), J: ten(R.J), n: n, idx: [], spy: [], open: !!R.op, cross: {}, rising: !!R.up, flip: typeof R.fl === 'number' ? R.fl : null };
        for (var i = 0; i < n; i++) { Q.idx.push(i); var pv = pr[ei[i]]; Q.spy.push(pv == null ? null : pv); }
        R.xu.forEach(function (j) { Q.cross[j] = 'up'; });
        R.xd.forEach(function (j) { Q.cross[j] = 'down'; });
        out.tf[k] = T; out.kdj[k] = Q;
      });
      return out;
    }


    function ordinal(n) { var t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
    function rankOf(r) { if (r == null) return null; return { r: r, low: r === 0, record: r === 100, ord: r === 0 ? 'lowest' : ordinal(r) }; }
    function pctCandle(k, j) {
      var T = D.tf[k], latest = k === '1D' && j === T.v.length - 1;
      return { s13: latest ? rankOf(G.pnow.g50.r13) : rankOf(T.p13[j]) };
    }
    function pctWord(r) { return r ? (r.low ? 'lowest' : r.ord) : '–'; }
    function episodeOf(T, j) {
      var s = T.wash.sig, w = null;
      for (var q = 0; q < s.length && s[q] <= j; q++) w = s[q];
      return w != null && T.wash.ends[w] > j ? w : null;
    }
    function washTag(k, j) {
      var T = D.tf[k], last = T.v.length - 1;
      if (T.sigOf[j]) return j === last && T.open ? 'washout so far' : 'washout';
      if (T.ringOf[j] != null) return 'deepest close of the ' + fmtDay(T.e[T.ringOf[j]], false) + ' washout';
      var ep = episodeOf(T, j);
      return ep != null ? 'in a washout (' + (k === '1D' ? 'day ' : 'candle ') + (j - ep + 1) + ')' : '';
    }
    function washCell(k) {
      var T = D.tf[k], Aw = T.wash.active;
      if (!Aw) return 'armed';
      return (Aw.i === T.v.length - 1 && T.open ? 'so far' : 'since ' + fmtDay(T.e[Aw.i], false));
    }
    function closedNow() { return doc.as_of && doc.as_of.state === 'LIVE' && !!(doc.live && doc.live.session_closed); }


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
    function pathOf(Pt, Y) { var s = ''; for (var i = 0; i < Pt.px.length; i++) s += (i ? 'L' : 'M') + Pt.px[i].toFixed(1) + ' ' + Y(Pt.pv[i]).toFixed(1); return s; }
    function panelRect(g, x, y, w, h) { el('rect', { x: x, y: y, width: w, height: h, fill: C.panel, stroke: C.line, 'stroke-width': 1 }, g); }
    function clipFor(svg, x, y, w, h) {
      var id = 'bkc' + (++uid), defs = svg.querySelector('defs') || el('defs', {}, svg);
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
    function peakDot(g, x, y, r) { el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, fill: DOT.peak, stroke: DOT.edge, 'stroke-width': r > 3 ? 1.6 : 1.3 }, g); }
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
    function crossLayer(svg) { return el('g', { 'pointer-events': 'none' }, svg); }
    function legendItem(cls, text) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(text)); return s; }
    function setAttr(n, k, v) { if (n.getAttribute(k) !== v) n.setAttribute(k, v); }
    function monthsBack(dn, m) {
      var d = dnDate(dn), y = d.getUTCFullYear(), mo = d.getUTCMonth() - m;
      var dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      return Date.UTC(y, mo, Math.min(d.getUTCDate(), dim)) / 864e5;
    }


    function kPad(spn) { return Math.max(0.9, spn * 0.02); }
    function kHi(k, spn) { return KN[k] - 1 + kPad(spn); }
    function kLatestSpan(k, x0) { var b = KN[k] - 1 - x0; return 0.9 >= 0.02 * (b + 0.9) ? b + 0.9 : b / 0.98; }
    function kLimits(k) { return { min: Math.min(K_MIN, kLatestSpan(k, -0.6)), max: kLatestSpan(k, -0.6) }; }
    function kClamp(k, v) {
      var lim = kLimits(k), x0 = v.x0, x1 = v.x1, spn = Math.max(lim.min, Math.min(lim.max, x1 - x0));
      if (Math.abs(spn - (x1 - x0)) > 1e-9) { var c = (x0 + x1) / 2; x0 = c - spn / 2; x1 = c + spn / 2; }
      var hi = kHi(k, spn);
      if (x1 > hi) { x0 -= x1 - hi; x1 = hi; }
      if (x0 < -0.6) { x1 += -0.6 - x0; x0 = -0.6; }
      return { chip: null, custom: v.custom, x0: x0, x1: x1 };
    }
    function kToLatest(k, v, x0) { return kClamp(k, { custom: v.custom, x0: x0, x1: x0 + kLatestSpan(k, x0) }); }
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
      var fk = FS.key;
      var custom = fk ? !!(KV[fk] && KV[fk].custom) : TFS.some(function (k) { return KV[k] && KV[k].custom; });
      Array.prototype.forEach.call(document.querySelectorAll('#kranges [data-krange]'), function (b) {
        var mine = b.getAttribute('data-krange') === kChip;
        setAttr(b, 'aria-pressed', String(mine && !(custom && D)));
        b.classList.toggle('base', mine && custom && !!D);
      });
    }
    function chooseKRange(chip) {
      kChip = chip;
      try { localStorage.setItem(RKEY, chip); } catch (e) { }
      if (D) TFS.forEach(function (k) { KV[k] = kDefault(k); HOV[k] = null; });
      renderKChips();
      if (D) requestKdj('all');
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
    function kdjAfterLoad(prevN, prevS, keep) {
      TFS.forEach(function (k) {
        var old = keep ? KV[k] : null, wasLatest = old && prevN[k] ? (function () { var nn = KN[k]; KN[k] = prevN[k]; var r = kAtLatest(k, old); KN[k] = nn; return r; })() : true;
        var sh = prevS ? kShift(prevS[k], D.tf[k].s) : 0;
        if (sh && old) {
          old = { custom: old.custom, x0: old.x0 + sh, x1: old.x1 + sh };
          if (HOV[k] != null) HOV[k] = HOV[k] + sh >= 0 ? HOV[k] + sh : null;
        }
        if (!old || !old.custom) KV[k] = kDefault(k);
        else KV[k] = wasLatest ? kToLatest(k, old, old.x0) : kClamp(k, old);
        if (!keep || (HOV[k] != null && HOV[k] > KN[k] - 1)) HOV[k] = null;
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
    function f0(x) { return x == null ? '–' : String(Math.round(x)); }
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
    function kNote(k, Q) {
      var note = D.tf[k].note || '';
      if (Q.open && !/as if/.test(note)) note += ', as if closed today';
      return note;
    }
    function renderKdjText() {
      var cn = closedNow(), live = doc.as_of && doc.as_of.state === 'LIVE', sessDn = dayNum((doc.live && doc.live.session_date) || doc.as_of.session), pn = priceName(doc, P);
      $('kdjSubT').textContent = pn + ' price · 50-day breadth of ' + (G.words || 'the group') + ' · KDJ of the 50-day breadth, per candle size';
      $('kdjSub2').textContent = (cn ? 'Close of ' + fmtDay(sessDn, false, true) + ' (preliminary)' : live ? 'Today so far' : 'Close of ' + fmtDay(sessDn, false, true)) +
        ' · open candles drawn as if they closed today (dotted lines, hollow dots, shaded column)';
      var a3 = $('asof3'); clear(a3);
      a3.appendChild(span('', live && !cn ? 'as of ' + etHm(doc.as_of.asof_utc) : 'close of ' + fmtDay(sessDn, false, true) + (live ? ' (preliminary)' : '')));
      TFS.forEach(function (k) {
        var B = KB[k], Q = D.kdj[k], T = D.tf[k], n = Q.n, R = pctCandle(k, n - 1);
        clear(B.val);
        B.val.appendChild(span('kv-a', '50-day ' + pct0(T.v[n - 1]) + ' · ' + pctWord(R.s13)));
        B.val.appendChild(span('kv-b', ' · K ' + f0(Q.K[n - 1]) + ' D ' + f0(Q.D[n - 1]) + ' J ' + f0(Q.J[n - 1])));
        B.val.classList.toggle('ghost', Q.open);
        B.note.textContent = kNote(k, Q) + ' · ' + kStateText(k, Q) + (T.wash.active ? ' · washout ' + washCell(k) : '');
        B.note.classList.toggle('ghost', Q.open);
      });
      var lg = $('lg3'); clear(lg);
      lg.appendChild(legendItem('lg-bar', '50-day breadth %'));
      lg.appendChild(legendItem('lg-pk', 'washout on that candle size (same candle on ' + pn + ')'));
      lg.appendChild(legendItem('lg-wash', 'washout line'));
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
      tx(g, x, y, str, withHalo({ fill: C.muted, 'font-size': 11, 'font-weight': 700, 'letter-spacing': '0.04em' }));
      var w = textW(str, 11, 700) + str.length * 0.44;
      if (extra) { tx(g, x + w + 8, y, extra, withHalo({ fill: extraFill, 'font-size': 11, 'font-weight': 600 })); w += 8 + textW(extra, 11, 600); }
      return { x: x - 2, y: y - 11, w: w + 4, h: 15 };
    }
    function kLine(g, X, Y, xs, vals, a, b, cut, clip, color, w, op, dotted, keep, dotW) {
      var Pt = decimate(xs, vals, a, Math.min(b, cut), X, keep);
      if (Pt.px.length) el('path', { d: pathOf(Pt, Y), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-opacity': op, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
      if (dotted && b >= cut + 1 && cut >= 0 && vals[cut] != null && vals[cut + 1] != null)
        el('line', { x1: X(cut).toFixed(1), y1: Y(vals[cut]).toFixed(1), x2: X(cut + 1).toFixed(1), y2: Y(vals[cut + 1]).toFixed(1), stroke: color, 'stroke-width': dotW || w,
          'stroke-opacity': op, 'stroke-dasharray': '1.6 2.2', 'stroke-linecap': 'round', 'clip-path': clip }, g);
      return Pt;
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
        el('rect', { x: pick.x.toFixed(1), y: pick.y.toFixed(1), width: pick.w.toFixed(1), height: pick.h, rx: 2, fill: C.panel, 'fill-opacity': 0.82 }, g);
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
    function fsHeight(holder) { return FS.key && holder.parentNode === fsSlot('chart') ? holder.clientHeight : null; }

    function drawKdj(k) {
      var B = KB[k], Q = D.kdj[k], T = D.tf[k], v = KV[k], n = Q.n, last = n - 1, pn = priceName(doc, P);
      var W = Math.max(300, Math.round(B.chart.clientWidth)), narrow = W < 640;
      var L = 1, pw = W - 2;
      var spyH = narrow ? Math.max(160, Math.min(200, Math.round(W * 0.5))) : 230, gp = narrow ? 8 : 10, fH = narrow ? 88 : 118, kH = narrow ? 132 : 172;
      var hFs = fsHeight(B.chart);
      if (hFs) { var avK = hFs - 20 - 2 * gp; spyH = Math.round(avK * 0.43); fH = Math.round(avK * 0.22); kH = avK - spyH - fH; }
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
        var gid = 'bkga' + (++uid), defs = svg.querySelector('defs') || el('defs', {}, svg), grd = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        el('stop', { offset: '0', 'stop-color': C.text, 'stop-opacity': 0.16 }, grd);
        el('stop', { offset: '1', 'stop-color': C.text, 'stop-opacity': 0.015 }, grd);
        el('path', { d: pathOf(PA, Ys) + 'L' + PA.px[PA.px.length - 1].toFixed(1) + ' ' + spyH + 'L' + PA.px[0].toFixed(1) + ' ' + spyH + 'Z', fill: 'url(#' + gid + ')', stroke: 'none', 'clip-path': clipS }, gS);
      }
      kLine(gS, X, Ys, Q.idx, Q.spy, a, b, cut, clipS, C.white, 2, 1, open, keepPk, narrow ? 1.3 : 1.5);
      var gSd = el('g', {}, gS);
      var titleS = paneTitle(gS, L + 7, 14, pn.toUpperCase());
      var obsS = [titleS], spyNow = null, nowBoxS = null;
      if (lastIn && Q.spy[last] != null) {
        var sx = X(last), sy = Ys(Q.spy[last]), rS = narrow ? 3.5 : 4;
        el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: rS, fill: open ? C.fear : '#F3EEFF', stroke: '#fff', 'stroke-width': 1.2 }, gS);
        spyNow = { x: sx, y: sy, r: rS }; nowBoxS = dotBox(sx, sy, rS + 1); snap.push({ x: sx, y: sy, dn: last });
        var pl = (P === 'BASKET' ? '' : '$') + Q.spy[last].toFixed(2), pfs = 12, pwid = textW(pl, pfs, 700), right = sx - rS - 6, best = null;
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
          pkIn.forEach(function (j) { if (Q.spy[j] == null) return; if (overlaps(box, dotBox(X(j), Ys(Q.spy[j]), rPk + 1))) hitsN += 6; });
          if (!best || hitsN < best.h) best = { base: base, h: hitsN, box: box };
        });
        if (best) { tx(gS, right, best.base, pl, withHalo({ fill: C.white, 'font-size': pfs, 'font-weight': 700, 'text-anchor': 'end' })); obsS.push(best.box); }
      }
      var dotObsS = obsS.slice();
      if (spyNow) obsS.push(nowBoxS);


      var gF = el('g', {}, svg);
      panelRect(gF, L, fTop, pw, fH);
      var Yf = lin(0, 100, fTop + fH, fTop + 16), axT = [0, 50, 100];
      var tagY = Q.flip != null ? Yf(Q.flip) : null;
      kGridY(gF, Yf, axT.filter(function (t) { return Yf(t) > fTop + 6 && t > 0; }), L, pw);
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
      if (open && b >= last && T.v[last] != null) {
        var gx = X(last) - Math.max(bw, 3) / 2, gwid = Math.max(bw, 3), gy = Yf(T.v[last]);
        el('rect', { x: gx.toFixed(1), y: gy.toFixed(1), width: gwid.toFixed(1), height: Math.max(0.5, base0 - gy).toFixed(1), fill: C.light, 'fill-opacity': 0.35,
          stroke: C.light, 'stroke-width': 1.1, 'stroke-dasharray': '2 1.5' }, gb);
      }
      el('line', { x1: L, x2: L + pw, y1: Yf(GUIDE.hi), y2: Yf(GUIDE.hi), stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '3 4' }, gF);
      var ay = Yf(GUIDE.lo);
      el('line', { x1: L, x2: L + pw, y1: ay, y2: ay, stroke: DOT.peak, 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.8 }, gF);
      function barHit(bx) {
        var hw = Math.max(bw, 3) / 2 + 1, j0 = Math.max(a, Math.floor(X.inv(bx.x - hw))), j1 = Math.min(b, Math.ceil(X.inv(bx.x + bx.w + hw)));
        for (var j = j0; j <= j1; j++) { var xj = X(j); if (xj + hw < bx.x || xj - hw > bx.x + bx.w) continue; if (T.v[j] != null && Yf(T.v[j]) < bx.y + bx.h + 1) return true; }
        return false;
      }

      var flipTxt = kFlipText(k, Q), tF = '50-DAY BREADTH %', room = pw - 14 - textW(tF, 11, 700) - tF.length * 0.44 - 8;
      if (flipTxt && textW(flipTxt, 11, 600) > room) {
        var fShort = flipTxt.replace(K_NEXT[k] + ' ', '').replace('flips to ', '').replace('no cross, ', '');
        flipTxt = textW(fShort, 11, 600) <= room ? fShort : fShort.replace(/^(stays )?(improving|weakening) /, function (m0, a, b) { return b === 'improving' ? '▲ ' : '▼ '; });
      }
      var titleF = paneTitle(gF, L + 7, fTop + 13, tF, flipTxt, KC.yel);
      var alab = 'washout line', aw = textW(alab, 11) + 6;
      var abox = { x: L + 6, y: ay - 16, w: aw, h: 14 }, obsF = [titleF];
      if (overlaps(abox, titleF) || abox.y < fTop + 2) abox.y = ay + 2;
      var aShow = abox.y + abox.h <= fTop + fH - 1, gAl = el('g', {}, gF);
      if (aShow) obsF.push(abox);
      var gFl = el('g', {}, gF), gFd = el('g', {}, gF), cands = [], dotObs = [];
      pkIn.forEach(function (j) {
        var x = X(j); if (x < L + rPk + 0.5 || x > L + pw - rPk - 0.5 || T.v[j] == null) return;
        cands.push({ j: j, v: T.v[j], x: x, y: Math.max(fTop + rPk + 1.5, Yf(T.v[j])) });
      });
      cands.sort(function (p, q) { return T.wash.vr[p.j] - T.wash.vr[q.j]; });
      var keptF = thinDots(cands, rPk, obsF), spyKept = [];
      keptF.forEach(function (d) {
        peakDot(gFd, d.x, d.y, rPk); obsF.push(dotBox(d.x, d.y, rPk)); dotObs.push(dotBox(d.x, d.y, rPk)); snap.push({ x: d.x, y: d.y, dn: d.j });
        if (Q.spy[d.j] == null) return;
        var y2 = Ys(Q.spy[d.j]), bx = dotBox(d.x, y2, rPk);
        if (dotObsS.some(function (o) { return overlaps(o, bx); }) || spyKept.some(function (o) { return Math.hypot(o.x - d.x, o.y - y2) < 2 * rPk + 0.5; })) return;
        spyKept.push({ x: d.x, y: y2, j: d.j });
      });
      spyKept.forEach(function (d) { peakDot(gSd, d.x, d.y, rPk); obsS.push(dotBox(d.x, d.y, rPk)); snap.push({ x: d.x, y: d.y, dn: d.j }); });
      if (lastIn && T.sigOf[last] && T.v[last] != null) {
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
      }
      if (!aShow) obsF = obsF.filter(function (o) { return o !== abox; });
      if (aShow) {
        el('rect', { x: abox.x, y: abox.y, width: abox.w, height: abox.h, fill: C.panel, 'fill-opacity': 0.85 }, gAl);
        tx(gAl, abox.x + 3, abox.y + 11, alab, { fill: '#E8C547', 'font-size': 11 });
      }
      var rX = open && lastIn && col.w <= 16 && col.x - 1 < L + pw - 2 ? col.x - 1 : null;
      kInsideLabels(gS, pt.ticks.map(function (t) { return { y: Ys(t), s: t.toFixed(pt.dec) }; }), L, pw, obsS, kLineHit(X, Ys, Q.spy, a, b, 2), 0, spyH, false, rX);
      kInsideLabels(gF, axT.filter(function (t) { return t > 0; }).map(function (t) { return { y: Yf(t), s: String(t) }; }), L, pw, obsF, barHit, fTop, fTop + fH, true, rX);


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
          var val = Q[s[0]][last]; if (val == null) return;
          var yy = Math.max(kTop + gr + 1.5, Math.min(kTop + kH - gr - 1.5, Yk(val)));
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
        if (Q.K[j] == null || Q.D[j] == null) return;
        var y = clampY(Yk((Q.K[j] + Q.D[j]) / 2)), up = Q.cross[j] === 'up', hollow = open && j === last, dx = 0;
        if (hollow && ghostY.K != null) {
          var gys = [ghostY.K, ghostY.D, ghostY.J].filter(function (q) { return q != null; }), need = gr + tri + 1.5;
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
        snap.push({ x: x + dx, y: y, dn: j }); crossShown.push({ i: j, y: y, x: x + dx, r: tri });
      });
      crossShown.forEach(function (c) { obsK.push({ x: c.x - c.r - 1, y: c.y - c.r - 1, w: 2 * c.r + 2, h: 2 * c.r + 2 }); });
      obsK.push(titleK);
      kInsideLabels(gK, [100, 50, 0].map(function (t) { return { y: Yk(t), s: String(t) }; }), L, pw, obsK,
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
          if (T.v[j] != null) el('circle', { cx: px, cy: Math.max(fTop + 3, Yf(T.v[j])), r: 3.6, fill: C.light, stroke: '#fff', 'stroke-width': 1.1 }, cross);
          [['K', KC.k], ['D', KC.d]].forEach(function (s) {
            if (Q[s[0]][j] == null) return;
            el('circle', { cx: px, cy: Math.max(kTop + 3, Math.min(kTop + kH - 3, Yk(Q[s[0]][j]))), r: 3.2, fill: s[1], stroke: C.bg, 'stroke-width': 1.2 }, cross);
          });
        }
        kReadout(k, j, ix != null);
      }
      GEO[k] = { W: W, L: L, pw: pw, X: X, set: set, snap: snap };
      if (HOV[k] != null && (HOV[k] < v.x0 - 0.5 || HOV[k] > v.x1 + 0.5)) HOV[k] = null;
      set(HOV[k]);
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
      ro.appendChild(span('', ' · 50-day '));
      ro.appendChild(span('p', T.v[j] == null ? '–' : pct1(T.v[j])));
      ro.appendChild(span('', ' · '));
      ro.appendChild(span('pc', pctWord(pctCandle(k, j).s13)));
      ro.appendChild(span('', ' · '));
      ro.appendChild(span('kk', 'K ' + f0(Q.K[j])));
      ro.appendChild(span('', ' '));
      ro.appendChild(span('kd', 'D ' + f0(Q.D[j])));
      ro.appendChild(span('', ' '));
      ro.appendChild(span('kj', 'J ' + f0(Q.J[j])));
      ro.appendChild(span('', ' · ' + priceName(doc, P) + ' ' + (Q.spy[j] == null ? '–' : Q.spy[j].toFixed(2))));
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
      if (!doc || !D) return;
      var todo = Object.keys(kPending); kPending = {};
      try { todo.forEach(drawKdj); $('kdjErr').hidden = true; renderKChips(); }
      catch (e) { var er = $('kdjErr'); er.hidden = false; er.textContent = 'The KDJ section could not be drawn.'; if (window.console) console.warn('bkdj', e); }
    }






    function attachGestures(holder, key, ctl) {
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
      function Gg() { return GEO[key]; }
      function pxOf(clientX) { return (clientX - rect.left) * Gg().W / rect.width; }
      function list() { return Object.keys(ptrs).map(function (k) { return ptrs[k]; }); }
      function canPan() { var v = ctl.view(); return v.x1 - v.x0 < ctl.limits().max - 1e-6; }
      function pick(clientX, clientY, kind) {
        var g = Gg(); if (!g) return;
        var xs = ctl.xs(), px = Math.max(g.L, Math.min(g.L + g.pw, pxOf(clientX))), dn = g.X.inv(px), i = bsearchLE(xs, dn);
        if (i < 0) i = 0;
        if (i + 1 < xs.length && Math.abs(xs[i + 1] - dn) < Math.abs(xs[i] - dn)) i++;
        var nL = xs.length - 1, onLast = i === nL && nL > 0 && Math.abs(dn - xs[nL]) <= (xs[nL] - xs[nL - 1]) / 2;
        if (clientY != null && g.snap && g.snap.length && !onLast) {
          var k = g.W / rect.width, sy = (clientY - rect.top) * k, rad = (kind === 'mouse' ? 7 : 14), best = rad;
          g.snap.forEach(function (s) { var d = Math.hypot(s.x - px, s.y - sy); if (d <= best) { best = d; i = bsearchLE(xs, s.dn); } });
        }
        HOV[key] = xs[i]; g.set(xs[i]);
      }
      function unpick() { var g = Gg(); if (HOV[key] != null && g) { HOV[key] = null; g.set(null); } }
      function startPinch() {
        var p = list(), g = Gg(), v = ctl.view(), mid = (pxOf(p[0].x) + pxOf(p[1].x)) / 2, s = v.x1 - v.x0;
        g0 = { view: v, dist: Math.max(24, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)), anchor: v.x0 + (mid - g.L) / g.pw * s, latest: ctl.atLatest(v) };
        mode = 'pinch'; holder.classList.add('dragging'); lastTap = null;
      }
      function startPan(p) { g0 = { view: ctl.view(), x: p.x }; mode = 'pan'; holder.classList.add('dragging'); lastTap = null; }
      holder.addEventListener('pointerdown', function (e) {
        if (!D || !Gg()) return;
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
        if (!D || !Gg()) return;
        var p = ptrs[e.pointerId];
        if (!p) {
          if (e.pointerType !== 'mouse') return;
          rect = holder.getBoundingClientRect();
          var hx = pxOf(e.clientX), g = Gg();
          if (hx >= g.L && hx <= g.L + g.pw) pick(e.clientX, e.clientY, 'mouse'); else unpick();
          return;
        }
        p.x = e.clientX; p.y = e.clientY;
        var g1 = Gg(), s;
        if (mode === 'pinch') {
          if (count < 2) return;
          var q = list(), lim = ctl.limits(), s0 = g0.view.x1 - g0.view.x0;
          var ns = Math.max(lim.min, Math.min(lim.max, s0 * g0.dist / Math.max(24, Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y))));
          var mid = (pxOf(q[0].x) + pxOf(q[1].x)) / 2, x0 = g0.anchor - (mid - g1.L) / g1.pw * ns;
          var nv = ctl.clamp({ custom: true, x0: x0, x1: x0 + ns });
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
        if (!D || !Gg()) return;
        var g = Gg(); rect = holder.getBoundingClientRect();
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
        if (!D || !Gg()) return;
        var k = e.key;
        if (k === '+' || k === '=') { e.preventDefault(); ctl.cmd('in'); return; }
        if (k === '-' || k === '_') { e.preventDefault(); ctl.cmd('out'); return; }
        if (k === '0' || k === 'Home') { e.preventDefault(); ctl.reset(); return; }
        if ((k === 'f' || k === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleFs(key); return; }
        if (k === 'Escape') { unpick(); return; }
        if (k !== 'ArrowLeft' && k !== 'ArrowRight') return;
        e.preventDefault();
        var xs = ctl.xs(), v = ctl.view(), i = bsearchLE(xs, HOV[key] == null ? ctl.last() : HOV[key]);
        i = Math.max(0, Math.min(xs.length - 1, i + (k === 'ArrowLeft' ? -1 : 1)));
        var dn = xs[i], s = v.x1 - v.x0;
        HOV[key] = dn;
        if (dn < v.x0) ctl.set(ctl.pan(v, dn - v.x0 - s * 0.1));
        else if (dn > v.x1) ctl.set(ctl.pan(v, dn - v.x1 + s * 0.1));
        Gg().set(dn);
      });
    }






    var FS = { sr: null, key: null, nodes: [], y: 0, pushed: false, pendingBack: false, queued: null, queuedPtr: false, at: -1e9, back: 0, vw: 0, vh: 0, off: 0 };
    var FS_SLOTS = ['head', 'note', 'chips', 'ro', 'bar', 'chart', 'legend'];
    var ov = document.createElement('div');
    ov.className = 'fs'; ov.id = 'bkFs'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Full screen chart');
    ov.innerHTML = '<div class="fs-in"><div class="fs-top"><div class="fs-headwrap"><p class="fs-kicker" data-bk="kicker">Breadth · KDJ</p>' +
      '<div class="fs-slot fs-head" data-fs="head"></div><p class="fs-status panel-asof" data-bk="status"></p></div>' +
      '<button type="button" class="fs-x" data-bk="close" aria-label="Close full screen">✕</button></div>' +
      '<div class="fs-slot" data-fs="note"></div><div class="fs-ctl"><div class="fs-slot fs-chips" data-fs="chips"></div><div class="fs-slot fs-bar" data-fs="bar"></div></div>' +
      '<div class="fs-slot" data-fs="ro"></div><div class="fs-chart" data-fs="chart"></div><div class="fs-slot" data-fs="legend"></div>' +
      '<p class="fs-hint" data-bk="hint"></p></div>';
    document.body.appendChild(ov);
    function fsSlot(name) { return ov.querySelector('[data-fs="' + name + '"]'); }
    function fsBk(name) { return ov.querySelector('[data-bk="' + name + '"]'); }
    function fsParts(k) {
      var B = KB[k];
      return { label: K_NAME[k] + ' candles, breadth KDJ, full screen', head: B.root.querySelector('.kb-head'), note: B.note, ro: B.ro,
        bar: B.root.querySelector('.kb-bar'), chart: B.chart, legend: $('lg3'), chips: $('kranges') };
    }
    function fsMinH() { return window.innerHeight <= 540 ? 176 : 236; }
    function fsSize() { if (FS.key) { var m = fsMinH() + 'px'; if (fsSlot('chart').style.flexBasis !== m) fsSlot('chart').style.flexBasis = m; } }
    function fsDraw(nowp) { if (!FS.key || !D) return; requestKdj(FS.key); if (nowp) drawKdjPending(); }
    function fsHint() {
      fsBk('hint').textContent = HOVER ? 'Pinch or ' + (IS_MAC ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move · double-click or Esc to close'
        : 'Pinch to zoom · drag sideways to move · tap to read · double-tap or ✕ to close';
    }
    function setInert(on) {
      ['.top', 'main', '.skip'].forEach(function (sel) {
        var n = document.querySelector(sel); if (!n) return;
        if ('inert' in n) n.inert = on;
        if (on) n.setAttribute('aria-hidden', 'true'); else n.removeAttribute('aria-hidden');
      });
    }
    function fsFocus(n, ptr) { if (!n) return; n.classList.toggle('ptr-focus', !!ptr); try { n.focus({ preventScroll: true }); } catch (e) { } }
    function fsStatus() {
      var st = fsBk('status'); clear(st);
      if (!doc) return;
      var live = doc.as_of && doc.as_of.state === 'LIVE', cn = closedNow(), sessDn = dayNum((doc.live && doc.live.session_date) || doc.as_of.session);
      st.appendChild(span('chip ' + (live && !cn ? 'chip-live' : 'chip-closed'), live && !cn ? 'LIVE' : 'CLOSED'));
      st.appendChild(span('', (G ? (G.short || G.name || '') + ' · ' : '') + (live && !cn ? 'as of ' + etHm(doc.as_of.asof_utc) : 'close of ' + fmtDay(sessDn, false, true) + (live ? ' (preliminary)' : ''))));
    }
    function openFs(key, ptr) {
      if (!D || !doc || FS.key) return;
      if (document.documentElement.classList.contains('fs-open')) return;
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
      try { history.pushState({ aisbKdjFs: key }, ''); FS.pushed = true; } catch (e) { FS.pushed = false; }
      document.body.style.top = -FS.y + 'px';
      document.documentElement.classList.add('fs-open');
      moves.forEach(function (m) { m.n.parentNode.insertBefore(m.ph, m.n); m.slot.appendChild(m.n); });
      ov.setAttribute('aria-label', parts.label); ov.setAttribute('data-kind', 'kdj');
      fsHint(); fsStatus();
      ov.hidden = false; ov.scrollTop = 0;
      setInert(true);
      fsSize(); renderKChips();
      fsDraw(true);
      fsFocus(parts.chart, ptr);
    }
    function closeFs(fromPop, ptr) {
      if (!FS.key) return;
      var key = FS.key, chart = fsParts(key).chart;
      FS.nodes.forEach(function (m) { if (m.ph.parentNode) m.ph.parentNode.replaceChild(m.n, m.ph); });
      FS.nodes = []; FS.key = null;
      ov.hidden = true; fsSlot('chart').style.flexBasis = '';
      setInert(false);
      if (doc && D) { TFS.forEach(function (k) { kPending[k] = 1; }); drawKdjPending(); }
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
    fsBk('close').addEventListener('click', function (e) { closeFs(false, e.detail > 0); });
    window.addEventListener('popstate', function () {
      if (FS.pendingBack) { fsBackDone(); return; }
      if (FS.key) { closeFs(true, true); requestAnimationFrame(function () { if (!FS.key && Math.abs((window.pageYOffset || 0) - FS.y) > 0.5) window.scrollTo(0, FS.y); fsScrollAuto(); }); }
    });
    document.addEventListener('keydown', function (e) {
      if (!FS.key) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFs(false); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(ov.querySelectorAll('button, [tabindex="0"], a[href]'), function (n) {
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


    TFS.forEach(function (k) {
      var root = sec.querySelector('.kblock[data-k="' + k + '"]');
      KB[k] = { root: root, val: root.querySelector('[data-kv]'), note: root.querySelector('[data-kn]'), ro: root.querySelector('[data-kro]'),
        win: root.querySelector('[data-kw]'), chart: root.querySelector('[data-kc]'), btns: Array.prototype.slice.call(root.querySelectorAll('[data-kz]')) };
      KB[k].btns.forEach(function (bt) { bt.addEventListener('click', function () { kCmd(k, bt.getAttribute('data-kz')); }); });
      attachGestures(KB[k].chart, k, kCtl(k));
    });
    Array.prototype.forEach.call(sec.querySelectorAll('[data-krange]'), function (b) {
      b.addEventListener('click', function () { chooseKRange(b.getAttribute('data-krange')); });
    });
    renderKChips();
    var lastW = 0;
    if ('ResizeObserver' in window) {
      new ResizeObserver(function (ents) {
        var w = Math.round(ents[0].contentRect.width);
        if (w !== lastW) { lastW = w; if (D) requestKdj('all'); }
      }).observe(sec);
    } else window.addEventListener('resize', function () { if (D) requestKdj('all'); });


    function load(what) {
      var d = A.data();
      if (!d || !d.groups) return;
      var g = d.groups[A.group()];
      if (!validG(g)) { var er = $('kdjErr'); er.hidden = false; er.textContent = 'The KDJ section is not in this update of the data.'; D = null; return; }
      var prevN = {}, prevS = {}, had = !!D;
      TFS.forEach(function (k) { prevN[k] = KN[k]; prevS[k] = D && D.tf[k] ? D.tf[k].s : null; });
      doc = d; G = g; P = A.price();
      try {
        D = prepare();
        TFS.forEach(function (k) { KN[k] = D.kdj[k].n; });
        if (what === 'price' && had) { TFS.forEach(function (k) { KV[k] = KV[k] ? kClamp(k, KV[k]) : kDefault(k); }); }
        else kdjAfterLoad(prevN, prevS, what === 'data' && had);
        $('kdjErr').hidden = true;
        renderKdjText();
        if (FS.key) fsStatus();
        requestKdj('all'); drawKdjPending();
      } catch (e) {
        var er2 = $('kdjErr'); er2.hidden = false; er2.textContent = 'The KDJ section could not be drawn.';
        if (window.console) console.warn('bkdj', e);
      }
    }
    A.on('data', function () { load('data'); });
    A.on('group', function () { load('group'); });
    A.on('price', function () { load('price'); });
  }


  function initPkdj(sec, A) {
    var PC = { K: '#4FC3F7', D: '#FFB74D', J: '#8A8F9E', up: '#26A69A', down: '#EF5350', yel: '#FFD84D', purple: '#7E57C2', plight: '#B39DDB', bar: '#4A5063' };
    var TFN = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
    var UNIT1 = { '1D': 'day', '1W': 'week', '2W': 'two-week candle', '1M': 'month' };
    var UNITS = { '1D': 'days', '1W': 'weeks', '2W': 'two-week candles', '1M': 'months' };
    var UABR = { '1D': 'd', '1W': 'wk', '1M': 'mo' };
    var OPEN = { '1D': 'day', '1W': 'week', '2W': '2-week candle', '1M': 'month' };
    var doc = null, G = null, sym = null, PN = {};

    function tx2(g, x, y, s, a) { var t = el('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
    function tW(s, fs) { return s.length * fs * 0.56; }
    function money(v) { return (sym === 'BASKET' ? '' : '$') + v.toFixed(2); }
    function moneyOf(s, v) { return (s === 'BASKET' ? '' : '$') + v.toFixed(2); }
    function pct(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%'; }
    function dayS(s) { var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))); return WD[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
    function units(tf, n) { return n + ' ' + (n === 1 ? UNIT1[tf] : UNITS[tf]); }
    function lastIdx(t) { return t.hist.c.length - 1; }
    function syms() { return ((doc.meta && doc.meta.prices) || ['QQQ', 'SMH', 'SPY', 'BASKET']).filter(function (s) { return G.pkdj && G.pkdj[s]; }); }
    function okSym(x) {
      return x && x.tf && Array.isArray(x.ln) && typeof x.ln[0] === 'number' && TFS.every(function (tf) {
        var t = x.tf[tf], h = t && t.hist;
        return h && h.c && h.c.length > 5 && ['d', 'lab', 'h', 'l', 'K', 'D', 'J'].every(function (k) { return Array.isArray(h[k]) && h[k].length === h.c.length; }) && Array.isArray(t.gc);
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
    function lines(tf, t) {
      var l1, l1b = '', l2 = '', tp = t.trig != null ? money(t.trig) + ' (' + pct(t.trig_pct) + ')' : '';
      if (t.state === 'GOLDEN') {
        l1 = t.now ? 'Golden cross on this candle so far (as if it closed today).' : 'Golden cross ' + units(tf, t.age) + ' ago' + (t.wash ? ', from the basement.' : '.');
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


    if (!sec.getAttribute('aria-labelledby')) sec.setAttribute('aria-labelledby', 'tik');
    sec.innerHTML =
      '<div class="card-head"><div class="card-title"><h2 id="tik"><span id="ikName">Price</span> · KDJ on 4 candle sizes</h2>' +
      '<p class="sub">The KDJ of the price itself, on daily, weekly, 2-week and monthly candles. Each open candle shows its numbers so far, drawn as if it closed at the last close (dotted lines, hollow dots, shaded column).</p></div></div>' +
      '<p class="panel-asof" id="asofIK">Loading the price KDJ…</p>' +
      '<p class="banner banner-warn" id="errIK" hidden></p>' +
      '<div id="bodyIK" hidden>' +
      '<div class="ik-grid-wrap"><div class="ik-grid" id="gridIK" role="table" aria-label="KDJ status of the four price strips on four candle sizes"></div></div>' +
      '<div class="controls ik-controls"><div class="seg ik-seg" id="segIK" role="group" aria-label="Price for the four charts"></div><span class="ik-close" id="closeIK"></span></div>' +
      '<div class="ik-panels" id="panelsIK"></div>' +
      '<p class="legend" id="lgIK"></p>' +
      '<div class="box"><div class="box-row"><b>How to read it</b><span id="howIK"></span></div>' +
      '<div class="box-row"><b>Right now</b><span id="nowIK"></span></div></div>' +
      '<p class="kdj-honest" id="honestIK"></p></div>';

    function nm(s) { return priceName(doc, s); }
    function renderSeg() {
      var box = $('segIK'); clear(box);
      syms().forEach(function (s) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-iks', s); b.setAttribute('aria-pressed', String(s === sym)); b.textContent = nm(s);
        box.appendChild(b);
      });
    }
    function renderGrid() {
      var g = $('gridIK'); clear(g);
      var hr = div('', g); hr.setAttribute('role', 'row'); hr.style.display = 'contents';
      var h0 = span('ik-h', ''); h0.setAttribute('role', 'columnheader'); hr.appendChild(h0);
      TFS.forEach(function (tf) { var h = span('ik-h', TFN[tf]); h.setAttribute('role', 'columnheader'); hr.appendChild(h); });
      syms().forEach(function (s) {
        var x = G.pkdj[s], row = div('', g); row.setAttribute('role', 'row'); row.style.display = 'contents';
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ik-sym'; b.setAttribute('data-iks', s);
        b.setAttribute('aria-pressed', String(s === sym)); b.setAttribute('role', 'rowheader');
        b.appendChild(document.createElement('b')).textContent = nm(s); b.appendChild(span('', moneyOf(s, x.close)));
        row.appendChild(b);
        TFS.forEach(function (tf) {
          var t = x.tf[tf], c = document.createElement('button'), ch = shortChip(t);
          c.type = 'button'; c.className = 'ik-c'; c.setAttribute('data-iks', s); c.setAttribute('role', 'cell');
          c.setAttribute('aria-label', nm(s) + ' ' + TFN[tf] + ': ' + chip(t).s + '.');
          c.appendChild(span('ik-chip ' + ch.c, ch.s));
          c.appendChild(span('ik-t', shortAge(tf, t)));
          if (t.trig != null) {
            var st = span('ik-t', '');
            st.appendChild(span('ik-tv', t.trig_dir === 'keep' ? 'flip ' : 'cross '));
            st.appendChild(document.createTextNode(pct(t.trig_pct)));
            c.appendChild(st);
          }
          row.appendChild(c);
        });
      });
    }
    function buildPanels() {
      var box = $('panelsIK'); clear(box); PN = {};
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
        PN[tf] = { p: p, ch: ch, ro: ro, sv: sv, w1: w1, w1b: w1b, w2: w2, w3: w3, geo: null, hover: null };
        sv.addEventListener('pointermove', function (ev) { pick(tf, ev); });
        sv.addEventListener('pointerdown', function (ev) { pick(tf, ev); });
        sv.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(tf, null); });
      });
    }
    function renderPanels() {
      var x = G.pkdj[sym];
      $('ikName').textContent = nm(sym);
      TFS.forEach(function (tf) {
        var t = x.tf[tf], Q = PN[tf], c = chip(t), w = lines(tf, t);
        Q.ch.className = 'ik-chip ' + c.c; Q.ch.textContent = c.s;
        Q.sv.setAttribute('aria-label', nm(sym) + ' ' + TFN[tf] + ' candles: price above, KDJ below. ' + c.s + '.');
        Q.w1.textContent = w.l1;
        Q.w1b.textContent = w.l1b; Q.w1b.hidden = !w.l1b;
        Q.w2.textContent = w.l2; Q.w2.hidden = !w.l2;
        Q.w3.textContent = t.dev ? 'This ' + OPEN[tf] + ' so far (' + t.hist.lab[lastIdx(t)] + '), shaded: read as if it closed at ' + dayS(x.day) + '’s close.'
          : 'Last candle closed (' + t.hist.lab[lastIdx(t)] + ').';
        Q.hover = null;
      });
      var cl = $('closeIK'); clear(cl);
      cl.appendChild(document.createTextNode(nm(sym) + ' · close ' + dayS(x.day) + ' '));
      cl.appendChild(document.createElement('b')).textContent = money(x.close);
      Array.prototype.forEach.call(sec.querySelectorAll('[data-iks]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-iks') === sym)); });
      drawAll();
    }
    function draw(tf) {
      var Q = PN[tf], holder = Q.sv; clear(holder);
      var x = G.pkdj[sym], t = x.tf[tf], h = t.hist, n = h.c.length, L = n - 1, dev = t.dev;
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
      if (dev) el('rect', { x: X(L) - slot / 2, y: top, width: slot, height: kTop + kH - top, fill: PC.purple, 'fill-opacity': 0.22 }, svg);
      var step = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].filter(function (s) { return (hi - lo) / s <= 4.5; })[0] || 5000;
      for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) {
        var y = Yp(v);
        el('line', { x1: lP, x2: lP + pw, y1: y, y2: y, stroke: C.line, 'stroke-width': 1 }, svg);
        tx2(svg, W - 2, y + 3.5, String(Math.round(v * 100) / 100), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
      }
      tx2(svg, lP, 11, 'PRICE', { fill: C.muted, 'font-size': fs - 1, 'font-weight': 700, 'letter-spacing': '.04em' });
      tx2(svg, lP + pw, 11, dev ? 'shaded = so far, as if closed today' : 'last candle closed', { fill: dev ? PC.plight : C.muted, 'font-size': fs - 0.5, 'font-weight': 600, 'text-anchor': 'end' });
      var bw = Math.max(1.6, Math.min(5, slot * 0.45));
      for (i = 0; i < n; i++) {
        var lst = i === L && dev;
        el('line', { x1: X(i), x2: X(i), y1: Yp(h.l[i]), y2: Yp(h.h[i]), stroke: lst ? PC.purple : PC.bar, 'stroke-width': lst ? bw + 1.5 : bw, 'stroke-opacity': lst ? 0.85 : 1 }, svg);
      }
      var cut = dev ? L - 1 : L, dC = '';
      for (i = 0; i <= cut; i++) dC += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yp(h.c[i]).toFixed(1);
      el('path', { d: dC, fill: 'none', stroke: C.white, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, svg);
      if (dev) {
        el('line', { x1: X(L - 1), y1: Yp(h.c[L - 1]), x2: X(L), y2: Yp(h.c[L]), stroke: C.white, 'stroke-width': 1.4, 'stroke-dasharray': '2 2' }, svg);
        el('circle', { cx: X(L), cy: Yp(h.c[L]), r: 3.6, fill: PC.purple, stroke: C.white, 'stroke-width': 1 }, svg);
      } else {
        el('circle', { cx: X(L), cy: Yp(h.c[L]), r: 3.2, fill: C.white, stroke: C.bg, 'stroke-width': 1 }, svg);
      }
      if (t.trig != null) {
        var yt = Yp(t.trig);
        el('line', { x1: lP, x2: lP + pw, y1: yt, y2: yt, stroke: PC.yel, 'stroke-width': 1.3, 'stroke-dasharray': '5 3' }, svg);
        var word = t.trig_dir === 'keep' ? 'keep above ' : 'needs ', ts = word + money(t.trig), tw = tW(ts, fs) + 6;
        var tx0 = lP + 2, ty = yt < top + 8 ? yt + 2 : yt - 6;
        el('rect', { x: tx0, y: ty - 4, width: tw, height: 12, fill: C.panel, 'fill-opacity': 0.92, rx: 2 }, svg);
        tx2(svg, tx0 + 3, ty + 5.5, ts, { fill: PC.yel, 'font-size': fs, 'font-weight': 700 });
      }
      tx2(svg, lP, kTop - 6, 'KDJ', { fill: C.muted, 'font-size': fs - 1, 'font-weight': 700, 'letter-spacing': '.04em' });
      var yb = Yk(x.ln[0]);
      el('rect', { x: lP, y: yb, width: pw, height: Yk(-25) - yb, fill: PC.down, 'fill-opacity': 0.07 }, svg);
      tx2(svg, lP + pw - 3, kTop + kH - 4, 'basement', { fill: C.muted, 'font-size': fs - 1, 'text-anchor': 'end' });
      [0, 50, 100].forEach(function (vv) {
        var yy = Yk(vv);
        el('line', { x1: lP, x2: lP + pw, y1: yy, y2: yy, stroke: C.line, 'stroke-width': 1 }, svg);
        tx2(svg, W - 2, yy + 3.5, String(vv), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
      });
      [['J', PC.J, 1, 0.75], ['K', PC.K, 1.8, 1], ['D', PC.D, 1.8, 1]].forEach(function (s) {
        var arr = h[s[0]], d = '';
        for (i = 0; i <= cut; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yk(arr[i]).toFixed(1);
        el('path', { d: d, fill: 'none', stroke: s[1], 'stroke-width': s[2], 'stroke-opacity': s[3], 'stroke-linejoin': 'round' }, svg);
        if (dev) el('line', { x1: X(L - 1), y1: Yk(arr[L - 1]), x2: X(L), y2: Yk(arr[L]), stroke: s[1], 'stroke-width': s[2], 'stroke-opacity': s[3], 'stroke-dasharray': '2 2' }, svg);
      });
      if (dev) [['J', PC.J, 2.4], ['D', PC.D, 3.2], ['K', PC.K, 3.2]].forEach(function (s) {
        if (h[s[0]][L] != null) el('circle', { cx: X(L), cy: Yk(h[s[0]][L]), r: s[2], fill: C.bg, stroke: s[1], 'stroke-width': 1.5 }, svg);
      });
      if (npj) {
        ['K', 'D'].forEach(function (k, j) {
          var d = 'M' + X(L).toFixed(1) + ' ' + Yk(h[k][L]).toFixed(1);
          proj.forEach(function (p, m) { d += 'L' + X(L + 1 + m).toFixed(1) + ' ' + Yk(p[j]).toFixed(1); });
          el('path', { d: d, fill: 'none', stroke: k === 'K' ? PC.K : PC.D, 'stroke-width': 1.5, 'stroke-dasharray': '1.5 2.5' }, svg);
        });
        if (t.flat_in && proj[t.flat_in - 1]) {
          var pj = proj[t.flat_in - 1], cx = X(L + t.flat_in), cy = Yk((pj[0] + pj[1]) / 2);
          el('circle', { cx: cx, cy: cy, r: 6, fill: 'none', stroke: PC.yel, 'stroke-width': 1.8 }, svg);
          tx2(svg, cx - 8, cy - 9, 'cross in ' + t.flat_in, { fill: PC.yel, 'font-size': fs - 0.5, 'font-weight': 700, 'text-anchor': 'end', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
        }
      }
      t.gc.forEach(function (gi) {
        if (gi < 0 || gi > L) return;
        var cx = X(gi), cy = Yk((h.K[gi] + h.D[gi]) / 2) + 7, s = 4.5;
        el('path', { d: 'M' + cx + ' ' + (cy - s) + 'L' + (cx + s) + ' ' + (cy + s * 0.8) + 'L' + (cx - s) + ' ' + (cy + s * 0.8) + 'Z', fill: PC.up, stroke: C.bg, 'stroke-width': 0.8 }, svg);
      });
      var first = h.d[0], fy = H - 3, md = new Date(Date.UTC(+first.slice(0, 4), +first.slice(5, 7) - 1, +first.slice(8, 10)));
      tx2(svg, lP, fy, MON[md.getUTCMonth()] + " '" + String(md.getUTCFullYear()).slice(2), { fill: C.muted, 'font-size': fs });
      var ll = tf === '1M' ? h.lab[L].slice(0, 3) : tf === '1D' ? h.lab[L].slice(4) : tf === '1W' ? h.lab[L].slice(6) : h.lab[L].split(' – ')[0];
      tx2(svg, Math.min(X(L), lP + pw - tW(ll, fs) / 2), fy, ll, { fill: dev ? PC.plight : C.muted, 'font-size': fs, 'text-anchor': 'middle' });
      var cross = el('g', {}, svg);
      Q.geo = { X: X, xl: xl, xr: xr, lP: lP, pw: pw, Yp: Yp, Yk: Yk, cross: cross, top: top, bottom: kTop + kH, n: n };
      setHover(tf, Q.hover);
    }
    function setHover(tf, i) {
      var Q = PN[tf], g = Q.geo; if (!g) return;
      var t = G.pkdj[sym].tf[tf], h = t.hist, L = h.c.length - 1;
      clear(g.cross);
      if (i != null && (i < 0 || i > L)) i = null;
      Q.hover = i;
      var j = i == null ? L : i;
      if (i != null) {
        el('line', { x1: g.X(i), x2: g.X(i), y1: g.top, y2: g.bottom, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, g.cross);
        el('circle', { cx: g.X(i), cy: g.Yk(h.K[i]), r: 3, fill: PC.K, stroke: C.bg, 'stroke-width': 1 }, g.cross);
        el('circle', { cx: g.X(i), cy: g.Yk(h.D[i]), r: 3, fill: PC.D, stroke: C.bg, 'stroke-width': 1 }, g.cross);
      }
      var ro = Q.ro; clear(ro);
      ro.appendChild(span('d', h.lab[j]));
      if (j === L && t.dev) ro.appendChild(span('ghost', ' (so far)'));
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
      var Q = PN[tf], g = Q.geo; if (!g) return;
      var svg = Q.sv.querySelector('svg'); if (!svg) return;
      var r = Q.sv.getBoundingClientRect(), xx = (ev.clientX - r.left) * svg.viewBox.baseVal.width / r.width;
      var i = Math.round(g.xl + (xx - g.lP) / g.pw * (g.xr - g.xl));
      setHover(tf, Math.max(0, Math.min(g.n - 1, i)));
    }
    function drawAll() { if (G && sym && G.pkdj[sym]) TFS.forEach(draw); }

    function renderText() {
      var asof = $('asofIK'); clear(asof);
      var live = doc.as_of && doc.as_of.state === 'LIVE';
      asof.appendChild(span('chip chip-closed', live ? 'LIVE' : 'DAILY'));
      var b = new Date(doc.built_utc), x0 = G.pkdj[syms()[0]];
      asof.appendChild(span('', 'Daily bars to ' + dayS(x0.day) + (live ? ' (so far)' : '') + ' · built ' +
        (isNaN(b) ? '' : MON[b.getMonth()] + ' ' + b.getDate() + ', ' + String(b.getHours()).padStart(2, '0') + ':' + String(b.getMinutes()).padStart(2, '0'))));
      var lg = $('lgIK'); clear(lg);
      function item(cls, t) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(t)); lg.appendChild(s); }
      item('lg-ln lg-k', 'K (fast)');
      item('lg-ln lg-d', 'D (slow)');
      item('lg-ln lg-j', 'J');
      item('lg-tri lg-up', 'golden cross (K crosses above D)');
      item('lg-asif', 'so far: the open candle, as if it closed today (hollow = not final)');
      item('lg-trig', 'trigger close');
      item('lg-proj', 'K/D path if price stays flat');
      $('howIK').textContent = 'K (blue) is the fast line, D (orange) the slow one, J (grey) the most jumpy. K above D = the swing on that candle size points UP; below = DOWN. ' +
        'A green ▲ is a golden cross: K crossing above D. Coiling = K just under D and closing in. The shaded bottom band is the basement, a washed-out swing. ' +
        'Open candles are drawn as if they closed at the last close, so they can still change. ' +
        'The yellow dashed line is the close that would flip K over D (or keep it there) on the date in the yellow words. ' +
        'Basket = the group’s equal-weight basket of its counted stocks (closes only, so its candles have no high or low). The grid rows pick the price for the four charts; the page’s price chip sets it too.';
      var parts = [];
      syms().forEach(function (s) {
        var y = G.pkdj[s], ups = TFS.filter(function (tf) { return y.tf[tf].state === 'GOLDEN' || y.tf[tf].state === 'UP'; });
        var fresh = TFS.filter(function (tf) { return y.tf[tf].state === 'GOLDEN'; });
        var coil = TFS.filter(function (tf) { return y.tf[tf].state === 'COIL'; });
        var w = nm(s) + ' (' + moneyOf(s, y.close) + '): ';
        w += ups.length === 4 ? 'K is above D on all four candle sizes. ' : ups.length === 0 ? 'K is below D on all four candle sizes. ' :
          'up on ' + ups.map(function (tf) { return TFN[tf].toLowerCase(); }).join(', ') + '; ' + (4 - ups.length) + ' still down. ';
        if (fresh.length) w += 'New golden crosses: ' + fresh.map(function (tf) { var t = y.tf[tf]; return TFN[tf].toLowerCase() + (t.now ? ' (this open candle)' : ' (' + units(tf, t.age) + ' ago)'); }).join(', ') + '. ';
        if (coil.length) w += 'Coiling: ' + coil.map(function (tf) { return TFN[tf].toLowerCase(); }).join(', ') + '. ';
        var near = TFS.filter(function (tf) { return y.tf[tf].trig != null; }).sort(function (a, c) { return Math.abs(y.tf[a].trig_pct) - Math.abs(y.tf[c].trig_pct); })[0];
        if (near) {
          var t = y.tf[near];
          w += 'Closest line: ' + TFN[near].toLowerCase() + (t.trig_dir === 'keep' ? ' flips back down below ' : ' crosses up at or above ') + moneyOf(s, t.trig) + ' on ' + t.trig_for + ' (' + pct(t.trig_pct) + ').';
        }
        parts.push(w);
      });
      $('nowIK').textContent = parts.join(' ');
      $('honestIK').textContent = 'Each trigger is plain arithmetic: the close that would put K above D, or keep it there. Rebuilt with every update of the page (this one: ' + dayS(x0.day) + ').';
    }

    function showErr(msg) { $('errIK').hidden = false; $('bodyIK').hidden = true; $('errIK').textContent = msg; clear($('asofIK')); }
    function render(keepSym) {
      doc = A.data();
      if (!doc || !doc.groups) return;
      G = doc.groups[A.group()] || null;
      if (!G || !G.pkdj) { showErr('The price KDJ is not in this update of the data. The breadth charts are not affected.'); return; }
      var list = syms().filter(function (s) { return okSym(G.pkdj[s]); });
      if (!list.length) { showErr('The price KDJ is not in this update of the data. The breadth charts are not affected.'); return; }
      if (!keepSym || list.indexOf(sym) < 0) sym = A.price();
      if (list.indexOf(sym) < 0) sym = list[0];
      $('errIK').hidden = true; $('bodyIK').hidden = false;
      try { if (!PN['1D']) buildPanels(); renderSeg(); renderText(); renderGrid(); renderPanels(); }
      catch (e) { showErr('The price KDJ could not be drawn. The breadth charts are not affected.'); if (window.console) console.warn('pkdj', e); }
    }
    sec.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-iks]');
      if (!b || !G) return;
      var s = b.getAttribute('data-iks');
      if (s === sym || !G.pkdj[s]) return;
      sym = s;
      renderPanels();
    });
    var rt = null, lastW = -1;
    function onSize() { var box = $('panelsIK'); var cw = box.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(function () { try { drawAll(); } catch (e) { } }, 80); }
    if (window.ResizeObserver) new ResizeObserver(onSize).observe($('panelsIK'));
    else window.addEventListener('resize', onSize);
    A.on('data', function () { render(true); });
    A.on('group', function () { render(false); });
    A.on('price', function () { render(false); });
  }


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
