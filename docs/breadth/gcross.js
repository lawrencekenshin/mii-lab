






(function () {
  'use strict';
  var sec = document.getElementById('gcross');
  if (!sec) return;
  sec.hidden = true;


  var DEFAULT_BASE = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/live-data/live/';
  var FILE = 'breadth.json';
  var POLL_MS = 5 * 60 * 1000;
  var FETCH_TIMEOUT_MS = 15000;
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    blue: '#3987E5', light: '#8EC0FA', orange: '#F0883E', gold: '#26A69A', dead: '#EF5350', yel: '#FFD84D' };
  var RANGES = { '1Y': 365, '3Y': 1096, 'All': Infinity };
  var RWORDS = { '1Y': 'last year', '3Y': 'last 3 years', 'All': 'since 2013' };
  var BASES = { '2021': 1, '2013': 1 };

  var CHIPS = { LIVE: ['LIVE', 'chip chip-live'], PRELIM: ['AFTER CLOSE', 'chip chip-after'], CLOSE: ['CLOSED', 'chip chip-closed'] };
  var MARKS = { g: 'big golden cross', w: 'big golden cross after a washout', d: 'big death cross' };
  var SHOW = 8;
  var NS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var HOVER = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var TAP = HOVER ? 'hover' : 'tap';

  var params = new URLSearchParams(location.search);
  var base = DEFAULT_BASE;
  function dataHostOk(u) {
    var h = u.hostname;
    if (u.protocol === 'https:' && h === 'raw.githubusercontent.com' && /^\/lawrencekenshin\//.test(u.pathname)) return true;
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h));
  }
  if (params.get('data')) {
    try {
      var u = new URL(params.get('data'), location.href);
      if (dataHostOk(u)) {
        var href = u.href.split('?')[0].split('#')[0];
        if (/\.json$/i.test(href)) href = href.replace(/[^/]*$/, '');
        if (!/\/$/.test(href)) href += '/';
        base = href;
      }
    } catch (e) {  }
  }


  var doc = null, G = null, DN = null, V50 = null, V200 = null, SPY = null;
  var range = '1Y', sumBase = '2021', hoverI = null, geo = null, loading = false, rendered = false, loads = 0, draws = 0;
  var seen = null, failed = false, fetches = 0;
  var showAll = { g: false, d: false };
  try {
    var sr = localStorage.getItem('gcrossRange'); if (sr && RANGES[sr]) range = sr;
    var sb = localStorage.getItem('gcrossBase'); if (sb && BASES[sb]) sumBase = sb;
  } catch (e) { }


  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
  function elh(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function tx(g, x, y, s, a) { var t = el('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
  function dnOf(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function dt(dn) { return new Date(dn * 864e5); }
  function day(dn, wd) { var d = dt(dn); return (wd ? WD[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); }
  function sgn1(x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(1); }
  function sgn0(x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x)); }
  function hund(v) { return v == null ? null : v / 100; }
  function isArr(a, n) { return Array.isArray(a) && (n == null || a.length === n); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function isStr(v) { return typeof v === 'string'; }
  function cellOk(c) { return isArr(c, 2) && isStr(c[0]) && isStr(c[1]); }
  function rowsOk(rows, k) { return isArr(rows) && rows.every(function (r) { return isArr(r, k) && r.every(cellOk); }); }
  function niceStep(span, px, minPx, steps) {
    for (var k = 0; k < steps.length; k++) if (steps[k] / span * px >= minPx) return steps[k];
    return steps[steps.length - 1];
  }
  function stateOf(s) { return s === 1 ? 'golden' : 'death'; }


  function runAt(i) {
    var S = G.seg, lo = 0, hi = S.length - 1, ans = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (S[m][0] <= i) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans >= 0 && S[ans][1] >= i ? S[ans] : null;
  }
  var markOf = {};
  function indexMarks() { markOf = {}; G.marks.forEach(function (m) { markOf[m[0]] = m[1]; }); }


  function validate(d) {
    if (!d || typeof d !== 'object') return 'broken';
    if ((d.schema !== 1 && d.schema !== 2) || d.kind !== 'breadth' || !d.view || d.view.v !== 1) return 'format';
    var x = d.daily, sp = d.view.sp;
    if (!x || !isArr(x.d) || x.d.length < 300) return 'broken';
    var n = x.d.length;
    if (!isArr(x.spy, n) || !sp || !isArr(sp.v50, n) || !isArr(sp.v200, n)) return 'broken';
    var g = d.view.gc;
    if (!g || typeof g !== 'object') return 'missing';
    if (g.ok !== true) return typeof g.na === 'string' ? 'na' : 'broken';
    var w = g.now;
    if (!w || (w.state !== 'golden' && w.state !== 'death') || !isStr(w.head) || !isStr(w.line) || !isStr(w.more) ||
      !isStr(w.asof) || !(w.since_i >= 0 && w.since_i < n) || !isNum(w.gap) || !isNum(w.stocks) || !CHIPS[w.chip] ||
      typeof w.open !== 'boolean' || typeof w.today !== 'boolean' || typeof w.big !== 'boolean' || typeof w.wash !== 'boolean') return 'broken';
    if (!isArr(g.seg) || !g.seg.length || !g.seg.every(function (r) { return isArr(r) && r.length >= 3 && r[0] >= 0 && r[1] >= r[0] && r[1] < n; })) return 'broken';
    if (!isArr(g.marks) || !g.marks.every(function (m) { return isArr(m, 2) && m[0] >= 0 && m[0] < n && MARKS[m[1]]; })) return 'broken';
    if (!rowsOk(g.rows_g, 7) || !rowsOk(g.rows_d, 7) || !g.sum || !rowsOk(g.sum['2021'], 6) || !rowsOk(g.sum['2013'], 6)) return 'broken';
    if (!isArr(g.idx) || !g.idx.every(function (o) { return o && isStr(o.name) && isStr(o.text) && isStr(o.asof) && (o.state === 'golden' || o.state === 'death'); })) return 'broken';
    if (!g.text || !isStr(g.text.eli5) || !isStr(g.text.how) || !isStr(g.text.src)) return 'broken';
    return null;
  }


  function renderAsof() {
    var a = $('asofGC'); clear(a);
    var ch = CHIPS[G.now.chip];
    a.appendChild(span(ch[1], ch[0]));
    a.appendChild(span('', G.now.asof));
  }
  function renderNow() {
    var w = G.now, box = $('nowGC'); clear(box);
    box.className = 'gc-now gc-' + w.state + (w.today ? ' gc-today' : '');
    var hd = elh('div', 'gc-hd', null, box);
    elh('span', 'gc-word', w.head, hd);
    if (!w.today && w.big) elh('span', 'gc-pill', 'Big cross', hd);
    if (!w.today && w.wash) elh('span', 'gc-pill gc-pill-w', 'After a washout', hd);
    elh('p', 'gc-line', w.line, box);
    elh('p', 'gc-more', w.more, box);

    var tl = $('tilesGC'); clear(tl);
    var tag = w.open ? 'so far today' : '50-day minus 200-day';
    function tile(k, v, s, cls) {
      var d = elh('div', null, null, tl);
      d.appendChild(span('k', k)); d.appendChild(span('v ' + cls, v)); d.appendChild(span('s', s));
    }
    var cls = w.gap > 0 ? 'gc-g' : w.gap < 0 ? 'gc-d' : '';
    tile('Gap in points', sgn1(w.gap / 100), tag, cls);
    tile('Gap in stocks', sgn0(w.stocks), tag, cls);
    var ix = $('idxGC'); clear(ix);
    G.idx.forEach(function (o) {
      var r = elh('div', 'gc-ix gc-' + (o.state === 'golden' ? 'golden' : 'death'), null, ix);
      r.appendChild(span('gc-dot', ''));
      var t = elh('div', 'gc-ixt', null, r);
      t.appendChild(span('gc-ixn', o.name));
      t.appendChild(span('gc-ixv', o.text));
      t.appendChild(span('gc-ixa', o.asof));
    });
    $('idxWrapGC').hidden = !G.idx.length;
  }
  function renderText() {
    var e = $('eli5GC'); clear(e);
    e.appendChild(elh('b', null, 'In one line'));
    e.appendChild(document.createTextNode(G.text.eli5));
    $('howGC').textContent = G.text.how;
    $('srcGC').textContent = G.text.src;
  }
  function renderLegend() {
    var lg = $('lgGC'); clear(lg);
    function item(cls, t) { var s = span('lg-i', ''); s.appendChild(span(cls, '')); s.appendChild(document.createTextNode(t)); lg.appendChild(s); }
    item('gc-lg-spy', 'SPY close');
    item('lg-b50', 'above 50-day');
    item('lg-b200', 'above 200-day');
    item('gc-lg-gold', 'blue on top (golden)');
    item('gc-lg-dead', 'orange on top (death)');
    item('gc-lg-tg', MARKS.g);
    item('gc-lg-tw', MARKS.w);
    item('gc-lg-td', MARKS.d);
    var last = G.seg[G.seg.length - 1];
    if (last.length > 3 && last[3] === 1) item('gc-lg-open gc-lg-open-' + stateOf(last[2]), 'today so far');
  }

  function head(th, wide, short) {
    var w = span(short == null ? 'gc-hk' : 'gc-hw', ''); wide.forEach(function (t) { w.appendChild(span('', t)); });
    th.appendChild(w);
    if (short == null) return;
    var n = span('gc-hn', ''); [].concat(short).forEach(function (t) { n.appendChild(span('', t)); });
    th.appendChild(n);
  }

  function fades() {
    Array.prototype.forEach.call(sec.querySelectorAll('.table-scroll'), function (b) {
      var more = b.scrollWidth - b.clientWidth - b.scrollLeft > 2;
      b.classList.toggle('gc-fade', more);
    });
  }


  function renderSum() {
    var rows = G.sum[sumBase] || [], t = $('sumGC'); clear(t);
    $('capGC').textContent = 'SPY after each kind of cross, ' + (sumBase === '2021' ? 'since 2021' : 'since 2013') + ': the middle (median) move and how many ended higher.';
    var hr = t.insertRow();
    [[[''], ''], [['How many'], ''], [['SPY 1 mo'], '1 mo'], [['3 mo'], '3 mo'], [['6 mo'], '6 mo'], [['Worst dip', '(3 mo)'], 'Dip']].forEach(function (h, i) {
      var th = document.createElement('th');
      if (i === 1) th.className = 'gc-ncol';
      if (i >= 2) head(th, h[0], h[1]); else th.textContent = h[0][0];
      hr.appendChild(th);
    });
    rows.forEach(function (cells, q) {
      var r = t.insertRow();
      if (q === rows.length - 1) r.className = 'gc-base';
      cells.forEach(function (c, i) {
        var td = r.insertCell(), s = String(c[0]), parts = s.split(' · ');
        td.className = (c[1] || '') + (i === 1 ? ' gc-ncol' : '');
        if (i >= 2 && parts.length === 2) { td.appendChild(span('gc-m', parts[0])); td.appendChild(span('gc-n', parts[1])); }
        else td.textContent = s;
        if (i === 0) td.appendChild(span('gc-n gc-nin', String(cells[1][0])));
      });
    });
    Array.prototype.forEach.call(sec.querySelectorAll('[data-gcb]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-gcb') === sumBase)); });
    fades();
  }



  function nowRow(kind) {
    var rows = kind === 'g' ? G.rows_g : G.rows_d;
    for (var q = 0; q < rows.length; q++) if (/\(now\)$/.test(rows[q][0][0])) return q;
    return -1;
  }
  function renderRows(kind) {
    var rows = kind === 'g' ? G.rows_g : G.rows_d, t = $(kind === 'g' ? 'tabG' : 'tabD'), all = showAll[kind];
    clear(t);
    var cols = [[['Cross day'], null], [kind === 'g' ? ['After a', 'washout'] : ['In a', 'washout'], null], [['SPY 1 mo'], '1 mo'],
      [['3 mo'], '3 mo'], [['6 mo'], '6 mo'], [['Worst dip', '(3 mo)'], 'Dip'], [['Flipped back', 'within a week'], ['Back in', 'a week?']]];
    var hr = t.insertRow();
    cols.forEach(function (h, i) {
      var th = document.createElement('th');
      th.className = i === 1 ? 'gc-c gc-scol' : i === 6 ? 'gc-c' : '';
      head(th, h[0], h[1]); hr.appendChild(th);
    });
    var nr = nowRow(kind), upto = all ? rows.length : Math.min(SHOW, rows.length);
    for (var q = 0; q < upto; q++) {
      var r = t.insertRow();
      if (q === nr) r.className = 'now';
      rows[q].forEach(function (c, i) {
        var td = r.insertCell(), s = String(c[0]), tail = i === 0 && / \(now\)$/.test(s);
        td.className = (c[1] || '') + (i === 1 ? ' gc-star gc-scol' : i === 6 ? ' gc-c' : i === 5 ? ' gc-dip' : i === 0 ? ' gc-day' : '');
        if (tail) {
          td.appendChild(span('gc-nw', s.slice(0, -6))); td.appendChild(document.createTextNode(' ')); td.appendChild(span('gc-nw', '(now)'));
        } else td.textContent = s;
        if (i === 0 && rows[q][1][0]) td.appendChild(span('gc-star gc-sin', ' ' + rows[q][1][0]));
      });
    }
    if (!rows.length) { var e = t.insertRow().insertCell(); e.colSpan = cols.length; e.textContent = '–'; }
    var b = $(kind === 'g' ? 'moreG' : 'moreD');
    b.hidden = rows.length <= SHOW;
    b.textContent = all ? 'Show the latest ' + SHOW : 'Show all ' + rows.length;
    b.setAttribute('aria-expanded', String(all));
    fades();
  }


  function draw() {
    var holder = $('chartGC'); clear(holder);
    if (!G) return;
    draws++;
    var n = DN.length, last = n - 1;
    var W = Math.max(300, Math.round(holder.clientWidth || sec.clientWidth || 360)), narrow = W < 640;
    var L = narrow ? 34 : 44, R = narrow ? 8 : 12, pw = W - L - R;
    var sH = narrow ? 92 : 124, gap = narrow ? 10 : 14, fH = narrow ? 196 : 250, axH = 22;
    var H = sH + gap + fH + axH, fTop = sH + gap;
    var days = RANGES[range], i0 = 0;
    if (isFinite(days)) { var cut = DN[last] - days; while (i0 < last && DN[i0] < cut) i0++; }
    var cnt = last - i0 + 1, half = 0.5 * pw / cnt;
    var X = function (i) { return L + (i - i0 + 0.5) / cnt * pw; };
    var fs = narrow ? 10.5 : 11.5, i;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': 'SPY above; the 50-day and 200-day breadth lines below, shaded green while blue is on top and red while orange is on top' }, holder);
    var defs = el('defs', {}, svg);
    var cpS = el('clipPath', { id: 'gcclipS' }, defs); el('rect', { x: L, y: 0, width: pw, height: sH }, cpS);
    var cpF = el('clipPath', { id: 'gcclipF' }, defs); el('rect', { x: L, y: fTop, width: pw, height: fH }, cpF);
    [['gcHatchG', C.gold], ['gcHatchD', C.dead]].forEach(function (p) {
      var pt = el('pattern', { id: p[0], patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: 'rotate(45)' }, defs);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: p[1], 'stroke-width': 2, 'stroke-opacity': 0.75 }, pt);
    });
    el('rect', { x: L, y: 0, width: pw, height: sH, fill: C.panel, rx: 3 }, svg);
    el('rect', { x: L, y: fTop, width: pw, height: fH, fill: C.panel, rx: 3 }, svg);


    var stepM = cnt < 400 ? (narrow ? 2 : 1) : cnt < 1000 ? (narrow ? 6 : 3) : (narrow ? 24 : 12), prev = null;
    for (i = i0; i <= last; i++) {
      var d = dt(DN[i]), mk = d.getUTCFullYear() * 12 + d.getUTCMonth();
      if (prev !== null && mk !== prev) {
        var mo = d.getUTCMonth(), y = d.getUTCFullYear(), on = stepM === 24 ? (mo === 0 && y % 2 === 0) : stepM === 12 ? mo === 0 : mo % stepM === 0;
        if (on) {
          var xt = X(i) - half, lab = mo === 0 ? (narrow && stepM >= 12 ? '’' + String(y).slice(2) : String(y)) : MON[mo];
          el('line', { x1: xt, x2: xt, y1: 0, y2: sH, stroke: C.line, 'stroke-width': 1 }, svg);
          el('line', { x1: xt, x2: xt, y1: fTop, y2: fTop + fH, stroke: C.line, 'stroke-width': 1 }, svg);
          tx(svg, xt, H - 6, lab, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
        }
      }
      prev = mk;
    }


    var smin = Infinity, smax = -Infinity;
    for (i = i0; i <= last; i++) if (SPY[i] != null) { smin = Math.min(smin, SPY[i]); smax = Math.max(smax, SPY[i]); }
    if (!(smax >= smin)) { smin = 0; smax = 1; }
    var spad = Math.max((smax - smin) * 0.08, 0.5), s0 = smin - spad, s1 = smax + spad;
    var Ys = function (v) { return sH - 4 - (v - s0) / (s1 - s0) * (sH - 22); };
    var sst = niceStep(s1 - s0, sH - 22, narrow ? 18 : 26, [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]);
    for (var sv = Math.ceil(s0 / sst) * sst; sv <= s1; sv += sst) {
      var sy = Ys(sv); if (sy < 16 || sy > sH - 2) continue;
      el('line', { x1: L, x2: L + pw, y1: sy, y2: sy, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, sy + 3.5, String(Math.round(sv)), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    var dS = '', pen = false;
    for (i = i0; i <= last; i++) {
      if (SPY[i] == null) { pen = false; continue; }
      dS += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Ys(SPY[i]).toFixed(1); pen = true;
    }
    el('path', { d: dS, fill: 'none', stroke: C.text, 'stroke-width': narrow ? 1.1 : 1.3, 'stroke-linejoin': 'round', 'clip-path': 'url(#gcclipS)' }, svg);
    tx(svg, L + 7, 14, 'S&P 500 (SPY) · daily close', { fill: C.text, 'font-size': narrow ? 11 : 12, stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });


    var bmin = Infinity, bmax = -Infinity;
    for (i = i0; i <= last; i++) {
      [V50[i], V200[i]].forEach(function (v) { if (v != null) { bmin = Math.min(bmin, v); bmax = Math.max(bmax, v); } });
    }
    if (!(bmax >= bmin)) { bmin = 0; bmax = 100; }
    var lo = Math.max(0, Math.floor((bmin - 3) / 10) * 10), hi = Math.min(100, Math.ceil((bmax + 3) / 10) * 10);
    if (hi - lo < 20) { hi = Math.min(100, lo + 20); lo = Math.max(0, hi - 20); }
    var Yf = function (v) { return fTop + fH - 4 - (v - lo) / (hi - lo) * (fH - 26); };
    var bst = niceStep(hi - lo, fH - 26, 24, [5, 10, 20, 25]);
    for (var bv = Math.ceil(lo / bst) * bst; bv <= hi + 1e-9; bv += bst) {
      var by = Yf(bv); if (by < fTop + 18 || by > fTop + fH - 2) continue;
      el('line', { x1: L, x2: L + pw, y1: by, y2: by, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, by + 3.5, bv + '%', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }


    var dA = '', parts = [], a = null;
    for (i = i0; i <= last + 1; i++) {
      var ok = i <= last && V50[i] != null && V200[i] != null;
      if (ok && a === null) a = i;
      if (!ok && a !== null) { parts.push([a, i - 1]); a = null; }
    }
    parts.forEach(function (p) {
      var j, s = '';
      for (j = p[0]; j <= p[1]; j++) s += (j === p[0] ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Yf(V50[j]).toFixed(1);
      for (j = p[1]; j >= p[0]; j--) s += 'L' + X(j).toFixed(1) + ' ' + Yf(V200[j]).toFixed(1);
      dA += s + 'Z';
    });
    var cpG = el('clipPath', { id: 'gcclipG' }, defs), cpD = el('clipPath', { id: 'gcclipD' }, defs);
    function band(cp, j0, j1) {
      var xa = Math.max(L, X(j0) - half), xb = Math.min(L + pw, X(j1) + half);
      if (xb > xa) el('rect', { x: xa.toFixed(2), y: fTop, width: (xb - xa).toFixed(2), height: fH }, cp);
    }
    var openRun = null;
    G.seg.forEach(function (r) {
      if (r[1] < i0) return;
      var j0 = Math.max(i0, r[0]), j1 = r[1], open = r.length > 3 && r[3] === 1, g = r[2] === 1;
      if (open) {
        openRun = r;
        if (j1 - 1 >= j0) band(g ? cpG : cpD, j0, j1 - 1);
      } else band(g ? cpG : cpD, j0, j1);
    });
    if (dA) {
      var gA = el('g', { 'clip-path': 'url(#gcclipF)' }, svg);
      el('path', { d: dA, fill: C.gold, 'fill-opacity': 0.32, 'clip-path': 'url(#gcclipG)' }, gA);
      el('path', { d: dA, fill: C.dead, 'fill-opacity': 0.32, 'clip-path': 'url(#gcclipD)' }, gA);
    }

    if (openRun && openRun[1] >= i0) {
      var og = openRun[2] === 1, ow = Math.max(2 * half, narrow ? 6 : 7);
      var ox = Math.min(L + pw - ow, Math.max(L, X(openRun[1]) - ow / 2));
      el('rect', { x: ox.toFixed(2), y: fTop + 1, width: ow.toFixed(2), height: fH - 2, fill: 'url(#' + (og ? 'gcHatchG' : 'gcHatchD') + ')',
        stroke: og ? C.gold : C.dead, 'stroke-width': 1, 'stroke-dasharray': '3 2', 'stroke-opacity': 0.9 }, svg);
    }

    function linePath(vs) {
      var s = '', p = false;
      for (var j = i0; j <= last; j++) {
        if (vs[j] == null) { p = false; continue; }
        s += (p ? 'L' : 'M') + X(j).toFixed(1) + ' ' + Yf(vs[j]).toFixed(1); p = true;
      }
      return s;
    }
    var lw = cnt > 1500 ? (narrow ? 0.9 : 1) : cnt > 500 ? (narrow ? 1.1 : 1.3) : (narrow ? 1.4 : 1.7);
    el('path', { d: linePath(V200), fill: 'none', stroke: C.orange, 'stroke-width': lw, 'stroke-opacity': 0.95, 'stroke-linejoin': 'round', 'clip-path': 'url(#gcclipF)' }, svg);
    el('path', { d: linePath(V50), fill: 'none', stroke: C.blue, 'stroke-width': lw + 0.2, 'stroke-linejoin': 'round', 'clip-path': 'url(#gcclipF)' }, svg);


    var ts = cnt > 1500 ? (narrow ? 3.4 : 4.2) : (narrow ? 4.4 : 5.4);
    function tri(gp, x, y, up, s, fill, stroke, dash) {
      var h = s * 0.9, dd = up ? 'M' + x + ' ' + (y - s) + 'L' + (x + s) + ' ' + (y + h) + 'L' + (x - s) + ' ' + (y + h) + 'Z'
        : 'M' + x + ' ' + (y + s) + 'L' + (x + s) + ' ' + (y - h) + 'L' + (x - s) + ' ' + (y - h) + 'Z';
      el('path', { d: dd, fill: fill, stroke: stroke, 'stroke-width': dash ? 1.6 : 1, 'stroke-dasharray': dash ? '2.5 1.5' : null, 'stroke-linejoin': 'round' }, gp);
    }
    function markAt(gp, j, k, dash) {
      var a5 = V50[j], a2 = V200[j];
      if (a5 == null || a2 == null) return;
      var golden = k !== 'd', y, sz = ts + (dash ? 1.8 : k === 'w' ? 3.4 : 0) + 1;
      var x = Math.min(L + pw - sz, Math.max(L + sz, X(j)));
      if (golden) y = Math.min(fTop + fH - ts - 3, Yf(Math.min(a5, a2)) + ts + 6);
      else y = Math.max(fTop + ts + 3, Yf(Math.max(a5, a2)) - ts - 6);
      if (dash) { tri(gp, x, y, golden, ts + 1.8, C.panel, golden ? C.gold : C.dead, true); return; }
      if (k === 'w') el('circle', { cx: x, cy: y + ts * 0.15, r: ts + (cnt > 1500 ? 2.4 : 3.4), fill: 'none', stroke: C.yel, 'stroke-width': cnt > 1500 ? 1.2 : 1.5 }, gp);
      tri(gp, x, y, golden, ts, golden ? C.gold : C.dead, C.bg, false);
    }
    var gM = el('g', {}, svg);
    G.marks.forEach(function (m) {
      if (m[0] < i0 || m[0] > last) return;
      markAt(gM, m[0], m[1], false);
      var xs = X(m[0]);
      el('line', { x1: xs, x2: xs, y1: sH - 10, y2: sH - 2, stroke: m[1] === 'd' ? C.dead : m[1] === 'w' ? C.yel : C.gold, 'stroke-width': 2, 'stroke-linecap': 'round' }, gM);
    });

    if (G.now.today && G.now.since_i === last) markAt(gM, last, G.now.state === 'golden' ? 'g' : 'd', true);


    var rN = narrow ? 3.6 : 4.2;
    if (V200[last] != null) el('circle', { cx: X(last), cy: Yf(V200[last]), r: rN - 0.4, fill: C.orange, stroke: C.white, 'stroke-width': 1.2 }, svg);
    if (V50[last] != null) el('circle', { cx: X(last), cy: Yf(V50[last]), r: rN, fill: C.blue, stroke: C.white, 'stroke-width': 1.2 }, svg);
    if (SPY[last] != null) el('circle', { cx: X(last), cy: Ys(SPY[last]), r: rN - 0.6, fill: '#EEF5FF', stroke: C.white, 'stroke-width': 1.1 }, svg);
    tx(svg, L + 7, fTop + 15, narrow ? 'S&P 500 stocks above their 50-day vs 200-day' : 'S&P 500 stocks above their 50-day (blue) vs 200-day (orange) average',
      { fill: C.text, 'font-size': narrow ? 11 : 12, stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
    var cross = el('g', {}, svg);
    geo = { L: L, pw: pw, i0: i0, cnt: cnt, X: X, Yf: Yf, Ys: Ys, cross: cross, fTop: fTop, fH: fH };
    setHover(hoverI);
  }


  function setHover(i) {
    if (!geo || !G) return;
    var last = DN.length - 1;
    clear(geo.cross);
    if (i != null && (i < geo.i0 || i > last)) i = null;
    hoverI = i;
    var j = i == null ? last : i;
    if (i != null) {
      var px = geo.X(i);
      el('line', { x1: px, x2: px, y1: 0, y2: geo.fTop + geo.fH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
      if (V200[i] != null) el('circle', { cx: px, cy: geo.Yf(V200[i]), r: 3.8, fill: C.orange, stroke: C.white, 'stroke-width': 1.1 }, geo.cross);
      if (V50[i] != null) el('circle', { cx: px, cy: geo.Yf(V50[i]), r: 4.5, fill: C.blue, stroke: C.white, 'stroke-width': 1.1 }, geo.cross);
      if (SPY[i] != null) el('circle', { cx: px, cy: geo.Ys(SPY[i]), r: 3.4, fill: C.text, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
    }
    var ro = $('roGC'); clear(ro);
    var run = runAt(j), openDay = j === last && G.now.open;
    function part(cls, text) { if (ro.firstChild) ro.appendChild(document.createTextNode(' · ')); ro.appendChild(span(cls + ' gc-v', text)); }
    part('d', day(DN[j], true) + (openDay ? ' (so far)' : ''));
    part('', 'SPY ' + (SPY[j] == null ? '–' : SPY[j].toFixed(2)));
    part('p', '50-day ' + (V50[j] == null ? '–' : V50[j].toFixed(1) + '%'));
    part('p2', '200-day ' + (V200[j] == null ? '–' : V200[j].toFixed(1) + '%'));
    if (run) part(run[2] === 1 ? 'up' : 'down', stateOf(run[2]) + (openDay ? ' so far' : ''));
    var mk = markOf[j];
    if (mk) part(mk === 'd' ? 'down' : mk === 'w' ? 'gc-y' : 'up', MARKS[mk]);
    if (i == null) ro.appendChild(span('muted', ' · ' + TAP + ' the chart for any day'));
  }
  function pickAt(ev) {
    if (!geo) return;
    var box = $('chartGC'), svg = box.querySelector('svg');
    if (!svg) return;
    var r = box.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width, x = (ev.clientX - r.left) * scale;
    var i = Math.round(geo.i0 + (x - geo.L) / geo.pw * geo.cnt - 0.5);
    setHover(Math.max(geo.i0, Math.min(DN.length - 1, i)));
  }


  function renderRange() {
    Array.prototype.forEach.call(sec.querySelectorAll('[data-gcr]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-gcr') === range)); });
    var t = sec.querySelector('[data-gcspan]'); if (t) t.textContent = RWORDS[range];
  }
  function renderAll() {
    sec.hidden = false;
    $('errGC').hidden = true; $('naGC').hidden = true; $('bodyGC').hidden = false; sec.classList.remove('gc-off');
    renderAsof(); renderNow(); renderLegend(); renderSum(); renderRows('g'); renderRows('d'); renderText(); renderRange();
    draw();
  }


  function showProblem(kind, d) {
    G = null; geo = null; rendered = false;
    clear($('chartGC'));
    sec.hidden = kind === 'missing';
    $('bodyGC').hidden = true; sec.classList.add('gc-off');
    clear($('asofGC'));
    if (kind === 'missing') return;
    if (kind === 'na') {
      $('errGC').hidden = true;
      var na = $('naGC'); na.hidden = false; na.textContent = d.view.gc.na;
      return;
    }
    $('naGC').hidden = true;
    var e = $('errGC'); e.hidden = false;
    e.textContent = 'The golden cross / death cross card could not be loaded. The breadth charts are not affected.';
  }


  function getJSON(name) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    var bust = Math.floor(Date.now() / 60000);
    return fetch(base + name + '?m=' + bust, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }, function (e) { clearTimeout(timer); throw e; });
  }
  function take(d) {
    doc = d; G = d.view.gc;
    DN = d.daily.d.map(dnOf); SPY = d.daily.spy;
    V50 = d.view.sp.v50.map(hund); V200 = d.view.sp.v200.map(hund);
    indexMarks();
    if (hoverI != null && hoverI >= DN.length) hoverI = null;
  }
  function load() {
    if (loading) return; loading = true; fetches++;
    getJSON(FILE).then(function (d) {
      failed = false;
      var ep = d && typeof d === 'object' ? d.generated_epoch : undefined;
      if (ep != null && ep === seen) return;
      seen = ep;
      var bad = validate(d);
      if (bad === 'missing' || bad === 'na') { showProblem(bad, d); return; }
      if (bad) {
        if (!rendered) showProblem(bad, d);
        return;
      }
      var prev = rendered ? doc : null;
      try {
        take(d); renderAll(); rendered = true; loads++;
      } catch (e) {
        try { if (!prev) throw e; take(prev); renderAll(); } catch (e2) { showProblem('broken', d); }
      }
    }).catch(function () {
      failed = true;
      if (!rendered) showProblem('fetch', null);
    }).then(function () { loading = false; });
  }
  function poll() {
    if (document.hidden) return;
    if (seen == null || failed) { load(); return; }
    getJSON('manifest.json').then(function (m) {
      var e = m && m.files && m.files[FILE];
      if (!e || e.generated_at !== seen) load();
    }).catch(function () {  });
  }


  sec.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-gcr],[data-gcb],[data-gcmore]');
    if (!b || !G) return;
    if (b.hasAttribute('data-gcr')) {
      range = b.getAttribute('data-gcr');
      try { localStorage.setItem('gcrossRange', range); } catch (e) { }
      hoverI = null; renderRange(); draw();
    } else if (b.hasAttribute('data-gcb')) {
      sumBase = b.getAttribute('data-gcb');
      try { localStorage.setItem('gcrossBase', sumBase); } catch (e) { }
      renderSum();
    } else {
      var k = b.getAttribute('data-gcmore');
      showAll[k] = !showAll[k]; renderRows(k);
    }
  });
  var chart = $('chartGC');
  chart.addEventListener('pointermove', pickAt);
  chart.addEventListener('pointerdown', pickAt);
  chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });

  var rt = null, lastW = -1;
  function onSize() { var cw = chart.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(function () { draw(); fades(); }, 80); }
  Array.prototype.forEach.call(sec.querySelectorAll('.table-scroll'), function (b) { b.addEventListener('scroll', fades, { passive: true }); });
  if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart);
  else window.addEventListener('resize', onSize);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  setInterval(poll, POLL_MS);
  renderRange();
  load();
})();
