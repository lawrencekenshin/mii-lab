





(function () {
  'use strict';
  var sec = document.getElementById('capex');
  if (!sec) return;
  var URL_ = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/capex-data/capex/capex.json' : 'snap/capex.pub.json';

  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    fear: '#7E57C2', light: '#B39DDB', up: '#26A69A', down: '#EF5350', band: '#272B3A' };
  var CO = { META: { c: '#B39DDB', n: 'Meta' }, GOOGL: { c: '#F2B04B', n: 'Alphabet' }, AMZN: { c: '#4FC3F7', n: 'Amazon' },
    ORCL: { c: '#F48FB1', n: 'Oracle' }, MSFT: { c: '#D1D4DC', n: 'Microsoft' } };
  var RANGES = { All: '2013-01-01', '2021': '2021-01-01', '2024': '2024-01-01' };
  var RWORDS = { All: '2013 to now', '2021': 'since 2021', '2024': 'since 2024' };
  var QUAL = ['decrease', 'flat', 'increase', 'meaningful increase', 'notably larger growth'];
  var NS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var V = null, range = 'All', hover = null, geo = null;
  var sd = [], sc = [], qs = [];
  try { var saved = localStorage.getItem('capexRange'); if (saved && RANGES[saved]) range = saved; } catch (e) { }

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
  function textW(s, fs) { return s.length * fs * 0.56; }
  function dn(s) { return Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5); }
  function dd(n) { return new Date(n * 864e5); }
  function dstr(n, noYear) { var d = dd(n); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (noYear ? '' : ', ' + d.getUTCFullYear()); }
  function sstr(s, noYear) { return dstr(dn(s), noYear); }
  function num(v) { return String(Math.round(v * 10) / 10); }
  function money(lo, hi) { return lo == null ? '' : '$' + num(lo) + (hi != null && hi !== lo ? '–' + num(hi) : '') + 'B'; }
  function sp(v, nd) { if (v == null) return '–'; var r = Math.abs(v).toFixed(nd); return (+r === 0 ? '' : v > 0 ? '+' : '−') + r + '%'; }
  function prevYear(y) { return /^FY/.test(y) ? 'FY' + String(+y.slice(2) - 1).padStart(2, '0') : String(+y - 1); }
  function qName(q) { return q.slice(0, 4) + ' ' + q.slice(4); }

  function validate(d) {
    if (!d || d.schema !== 2 || d.kind !== 'capex') return false;
    var s = d.smh;
    return Array.isArray(d.lines) && d.lines.length > 5 && Array.isArray(d.quarters) && d.quarters.length > 20 &&
      Array.isArray(d.marks) && s && Array.isArray(s.d) && Array.isArray(s.c) && s.d.length === s.c.length && s.d.length > 500 &&
      Array.isArray(d.now) && d.now.length === 4 && d.stats && d.asof;
  }
  function prep() {
    var base = dn(V.smh.d0);
    sd = V.smh.d.map(function (x) { return base + x; });
    sc = V.smh.c.map(function (x) { return x / 100; });
    qs = V.quarters.map(function (q) { var y = +q.q.slice(0, 4), k = +q.q.slice(5); return Math.round(Date.UTC(y, (k - 1) * 3, 1) / 864e5); });
    V.lines.forEach(function (ln) { ln.pts.forEach(function (p) { p.t = dn(p.d); }); });
    V.marks.forEach(function (m) { m.t = dn(m.s); });
  }
  function smhAt(t) {
    var lo = 0, hi = sd.length - 1;
    if (t <= sd[0]) return 0;
    if (t >= sd[hi]) return hi;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (sd[m] <= t) lo = m; else hi = m; }
    return lo;
  }
  function quarterAt(t) { for (var i = qs.length - 1; i >= 0; i--) if (qs[i] <= t) return (i === qs.length - 1 && t >= qs[i] + 92) ? -1 : i; return 0; }
  function latestPoint() {
    var best = null;
    V.lines.forEach(function (ln, li) { ln.pts.forEach(function (p, pi) { if (!best || p.t >= best.p.t) best = { ln: ln, p: p, li: li, pi: pi }; }); });
    return best;
  }


  function srcWords(src) {
    return src === 'NEWS' ? 'said on the call only (news report)' : src === 'EDGAR-later' ? 'said on the call, quoted in a later filing' :
      src === '10-Q/10-K' ? 'in the 10-Q/10-K' : 'in the results release';
  }
  function kindWords(p) {
    return p.k === 'first' ? 'first plan' : p.k === 'raise' ? 'raised ' + sp(p.ch, 1) : p.k === 'cut' ? 'cut ' + sp(p.ch, 1) : 'repeated';
  }
  function evWords(e, kk) {
    var who = CO[e.t].n + ' ' + e.y, k = e.k || kk;
    if (e.ch == null) return who + ' wording ' + (k === 'raise' ? 'up' : 'down') + (e.q != null ? ' to “' + QUAL[e.q] + '”' : '');
    return who + ' ' + (k === 'raise' ? 'raised ' : 'cut ') + sp(e.ch, 1) + (e.lo != null ? ' to ' + money(e.lo, e.hi) : '');
  }

  function renderText() {
    var a = V.asof, s = V.stats;
    var asof = $('asofCx'); clear(asof);
    asof.appendChild(span('chip chip-closed', 'DAILY'));
    var b = new Date(V.built_utc);
    asof.appendChild(span('', 'Plans from SEC filings to ' + sstr(a.guides_last) + ' · SMH adjusted closes to ' + sstr(a.smh_last) +
      ' · built ' + (isNaN(b) ? '' : MON[b.getMonth()] + ' ' + b.getDate()) + '. SMH updates after each US close.'));

    var tiles = $('tilesCx'); clear(tiles);
    V.now.forEach(function (n) {
      var l = n.last, d = document.createElement('div');
      d.appendChild(span('k', n.name + ' ' + n.y));
      var v = span('v', (n.t === 'AMZN' ? '~' : '') + money(l.lo, l.hi)); v.style.color = CO[n.t].c; d.appendChild(v);
      d.appendChild(span('s', sp(l.g, 0) + ' vs ' + prevYear(n.y) + ' · ' + sstr(l.d, true) + (l.src === 'NEWS' ? ' call' : '')));
      tiles.appendChild(d);
    });

    $('howCx').textContent = 'Top (A): each line is one year’s capex plan, shown as % above the year before’s actual spending. ' +
      'The first dot is the first plan for that year; each later dot is an update, so a line going up = the plan was raised. ' +
      'Middle (B): how many plans were raised (green, up) or cut (red, down) in filings each quarter; raises minus cuts is the study’s revision score. ' +
      'The grey shade = only Meta put a number in its filings (to early 2023). Bottom (C): SMH on a log scale, with ▲ on the first trading day after a raise and ▼ after a cut.';

    var ul = document.createElement('ul'), nowEl = $('nowCx'); clear(nowEl);
    function li(parts) { var x = document.createElement('li'); parts.forEach(function (p) { x.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); }); ul.appendChild(x); }
    function bold(t) { var e = document.createElement('b'); e.textContent = t; return e; }
    V.now.forEach(function (n) {
      var steps = n.path.map(function (p) {
        var note = p.src === 'NEWS' ? ', call only, news report' : p.src === 'EDGAR-later' ? ', on the call, quoted in a later filing' : '';
        return money(p.lo, p.hi) + ' (' + sstr(p.d, true) + note + ')';
      });
      var label = n.name + ' ' + (n.t === 'ORCL' ? 'FY26 (Jun 2025–May 2026)' : n.y) + ': ';
      var tail = ' = ' + sp(n.last.g, 0) + ' vs ' + prevYear(n.y) + '’s actual $' + num(n.act) + 'B';
      if (n.t === 'META' || n.t === 'GOOGL') tail += ' (first plan ' + sp(n.first_g, 0) + ')';
      tail += '.';
      if (n.t === 'AMZN') {
        steps = ['about ' + money(n.path[0].lo, n.path[0].hi) + ' (' + sstr(n.path[0].d, true) + ', repeated ' + n.path.slice(1).map(function (p) { return sstr(p.d, true); }).join(', ') + ')'];
        var qa = n.qual_after[n.qual_after.length - 1];
        if (qa) tail += ' Its ' + sstr(qa.d, true) + ' 10-Q still says capex will “' + QUAL[qa.q] + '”.';
      }
      if (n.t === 'ORCL') {
        tail += ' The release called it unchanged from earlier guidance.';
        var o = V.orcl27[V.orcl27.length - 1];
        if (o) tail += ' Its ' + sstr(o.d, true) + ' 10-Q says FY27 will be higher than FY26 (no number).';
      }
      li([bold(label), steps.join(' → '), tail]);
    });
    var ms = V.msft[V.msft.length - 1];
    if (ms) li([bold('Microsoft: '), 'no comparable yearly number in its filings. Over ' + money(ms.lo, null) + ' for Jul–Sep 2026 (said on the ' + sstr(ms.d, true) + ' call, restated in a later filing).']);
    li([bold('Direction: '), 'the last cut anywhere was ' + CO[s.last_cut.t].n + ' ' + s.last_cut.y + ' to ' + money(s.last_cut.lo, s.last_cut.hi) + ' on ' + sstr(s.last_cut.d) +
      '. Since then: ' + s.since_raises + ' raises, ' + s.since_cuts + ' cuts in filings. Next big-tech results: ' + a.next_prints + '.']);
    nowEl.appendChild(ul);

    var mf = {}; s.mf_rows.forEach(function (r) { mf[r.y] = r; });
    function ex(y) { var r = mf[y]; return y + ' ' + sp(r.g, 0) + ' → SMH ' + sp(r.f12, 0); }
    var h = $('histCx'); clear(h);
    var u2 = document.createElement('ul');
    function li2(b, t) { var x = document.createElement('li'); x.appendChild(bold(b)); x.appendChild(document.createTextNode(t)); u2.appendChild(x); }
    li2('Next quarter: ', 'raises did not tell you where SMH went. After quarters with more raises than cuts, SMH averaged ' + sp(s.q_pos, 1) + ' the next quarter (' + s.q_npos +
      ' quarters); after more cuts ' + sp(s.q_neg, 1) + ' (' + s.q_nneg + '); after no change ' + sp(s.q_zero, 1) + ' (' + s.q_nzero + '). Rank correlation ' +
      (s.q_spearman < 0 ? '−' : '+') + Math.abs(s.q_spearman).toFixed(2) + ' (n=' + s.q_n + '): no link.');
    li2('On the day: ', 'SMH averaged ' + sp(s.raise_smh, 2) + ' on raise days (' + s.raise_n + ') and ' + sp(s.cut_smh, 2) + ' on cut days (' + s.cut_n +
      '), no different from other big-tech results days. The company’s own stock tended to go the other way: ' +
      sp(s.cut_stock, 1) + ' vs the S&P 500 after a cut (all Meta), ' + sp(s.raise_stock, 1) + ' after a raise.');
    li2('Meta’s first plan vs SMH over the next 12 months: ', 'the biggest plans came before weak SMH years (' + ex('2018') + ', ' + ex('2022') + '); small ones before strong years (' +
      ex('2023') + ', ' + ex('2024') + '). Rank correlation −' + Math.abs(s.mf_spearman).toFixed(2) + ' (n=' + s.mf_n + '). ' +
      '2026’s first plan was ' + sp(mf['2026'].g, 0) + '.');
    li2('Meta trimmed most years: ', 'before mid-2023 the filings show ' + s.pre_cuts + ' cuts and ' + s.pre_raises + ' raises, even in 2014–2018 when its actual capex grew fast. A cut was routine, not a warning.');
    h.appendChild(u2);
    $('honestCx').textContent = 'From the companies’ own SEC filings (results releases, 10-Q/10-K), 2013 to ' + sstr(a.guides_last) +
      '; 3 plans said only on calls come from news reports (hollow dots) and are not counted in B or C. Until 2023 only Meta put numbers in filings. ' +
      '“vs last year” uses reported purchases of property and equipment, so Meta’s figures run a few points high from 2021 (its plan includes finance leases).';

    var lg = $('lgCx'); clear(lg);
    function item(node, t) { var s2 = span('lg-i', ''); s2.appendChild(node); s2.appendChild(document.createTextNode(t)); lg.appendChild(s2); }
    function sw(c) { var x = span('cx-sw', ''); x.style.borderTopColor = c; x.appendChild(span('cx-swd', '')).style.background = c; return x; }
    ['META', 'GOOGL', 'AMZN', 'ORCL'].forEach(function (t) { item(sw(CO[t].c), CO[t].n); });
    item(span('cx-hol', ''), 'call only (news report)');
    item(span('cx-up', ''), 'raise');
    item(span('cx-dn', ''), 'cut');
    item(span('cx-band', ''), 'only Meta in filings');
    item(span('lg-now', ''), 'latest close');
  }


  function niceStep(spanV, px, minPx, steps) {
    steps = steps || [1, 2, 5, 10, 20, 25, 50, 100];
    for (var k = 0; k < steps.length; k++) if (steps[k] / spanV * px >= minPx) return steps[k];
    return steps[steps.length - 1];
  }
  function draw() {
    var holder = $('chartCx'); clear(holder);
    if (!V) return;
    var W = Math.max(300, Math.round(holder.clientWidth || sec.clientWidth || 360)), narrow = W < 640;
    var L = narrow ? 32 : 46, R = narrow ? 8 : 96, pw = W - L - R;
    var aH = narrow ? 230 : 300, bH = narrow ? 108 : 128, cH = narrow ? 180 : 236, gap = narrow ? 10 : 14, axH = 22;
    var aTop = 0, bTop = aH + gap, cTop = bTop + bH + gap, H = cTop + cH + axH;
    var last = sd.length - 1, x0 = dn(RANGES[range]), x1 = sd[last] + (range === 'All' ? 45 : range === '2021' ? 25 : 14);
    var X = function (t) { return L + (t - x0) / (x1 - x0) * pw; };
    var fs = narrow ? 10.5 : 11.5, fsT = narrow ? 11 : 12, fsL = narrow ? 10 : 11;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img',
      'aria-label': 'Three panels on one time axis: capex plan paths, raises and cuts per quarter, SMH with raise and cut days' }, holder);
    var defs = el('defs', {}, svg);
    [['cxA', aTop, aH], ['cxB', bTop, bH], ['cxC', cTop, cH]].forEach(function (c) {
      var cp = el('clipPath', { id: c[0] }, defs); el('rect', { x: L, y: c[1], width: pw, height: c[2] }, cp);
    });
    [[aTop, aH], [bTop, bH], [cTop, cH]].forEach(function (p) { el('rect', { x: L, y: p[0], width: pw, height: p[1], fill: C.panel, rx: 3 }, svg); });

    var bq = 0; while (bq < V.quarters.length && V.quarters[bq].cov === 'META') bq++;
    var bandEnd = bq ? X(bq < qs.length ? qs[bq] : qs[bq - 1] + 91) : L;
    if (bandEnd > L) {
      var bw0 = Math.min(bandEnd, L + pw) - L;
      el('rect', { x: L, y: bTop, width: bw0, height: bH, fill: C.band, 'clip-path': 'url(#cxB)' }, svg);
    }

    var y0 = dd(x0).getUTCFullYear(), y1 = dd(x1).getUTCFullYear(), pxYear = 365.25 / (x1 - x0) * pw;
    var every = pxYear < 20 ? 2 : 1, shortY = pxYear < 38;
    for (var yy = y0; yy <= y1 + 1; yy++) {
      [[yy + '-01-01', true], [yy + '-07-01', false]].forEach(function (tk) {
        var t = dn(tk[0]); if (t <= x0 || t >= x1) return;
        if (!tk[1] && pxYear < 120) return;
        var x = X(t);
        [[aTop, aH], [bTop, bH], [cTop, cH]].forEach(function (p) { el('line', { x1: x, x2: x, y1: p[0], y2: p[0] + p[1], stroke: C.line, 'stroke-width': 1 }, svg); });
        if (tk[1] && yy % every !== 0) return;
        var lab = tk[1] ? (shortY ? '’' + String(yy).slice(2) : String(yy)) : 'Jul';
        tx(svg, x, H - 6, lab, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
      });
    }
    var placed = [];
    function free(b) { return !placed.some(function (o) { return b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y; }); }
    function title(y, s) {
      var bg = el('rect', { x: L + 3, y: y + 3, width: 10, height: 17, rx: 2, fill: C.panel, 'fill-opacity': 0.88 }, svg);
      var t = tx(svg, L + 7, y + 15.5, s, { fill: C.text, 'font-size': fsT }), w = textW(s, fsT);
      try { var m = t.getComputedTextLength(); if (m > 0) w = m; } catch (e) { }
      bg.setAttribute('width', (w + 9).toFixed(1));
      placed.push({ x: L + 3, y: y + 3, w: w + 9, h: 17 });
    }


    var vis = [];
    V.lines.forEach(function (ln, li) { ln.pts.forEach(function (p, pi) { if (p.t >= x0 && p.t <= x1) vis.push({ ln: ln, p: p, li: li, pi: pi }); }); });
    var gmin = 0, gmax = 20;
    vis.forEach(function (v) { gmin = Math.min(gmin, v.p.g); gmax = Math.max(gmax, v.p.g); });
    var gsp = gmax - gmin, glo = gmin - gsp * 0.06, ghi = gmax + gsp * 0.12;
    var Ya = function (v) { return aTop + 26 + (ghi - v) / (ghi - glo) * (aH - 32); };
    var gst = niceStep(ghi - glo, aH - 32, narrow ? 26 : 32, [5, 10, 20, 25, 50]);
    for (var gv = Math.ceil(glo / gst) * gst; gv <= ghi; gv += gst) {
      var gy = Ya(gv); if (gy < aTop + 22) continue;
      el('line', { x1: L, x2: L + pw, y1: gy, y2: gy, stroke: gv === 0 ? C.muted : C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, gy + 3.5, (gv > 0 ? '+' : gv < 0 ? '−' : '') + Math.abs(gv) + (narrow ? '' : '%'), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    var gA = el('g', { 'clip-path': 'url(#cxA)' }, svg), rP = narrow ? 2.7 : 3.3;
    V.lines.forEach(function (ln) {
      var c = CO[ln.t].c, d = '';
      ln.pts.forEach(function (p, i) { d += (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Ya(p.g).toFixed(1); });
      if (ln.pts.length > 1) el('path', { d: d, fill: 'none', stroke: c, 'stroke-width': narrow ? 1.7 : 2.1, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, gA);
    });
    V.lines.forEach(function (ln) {
      var c = CO[ln.t].c;
      ln.pts.forEach(function (p) {
        var hol = p.src === 'NEWS';
        el('circle', { cx: X(p.t), cy: Ya(p.g), r: hol ? rP + 0.3 : rP, fill: hol ? C.panel : c, stroke: hol ? c : C.panel, 'stroke-width': hol ? 1.6 : 1.1 }, gA);
      });
    });
    title(aTop, narrow ? 'A · Plan vs last year’s actual, %' : 'A · Each year’s capex plan vs the year before’s actual spending, %');

    var ends = [];
    if (!narrow) {
      ['META', 'GOOGL', 'AMZN', 'ORCL'].forEach(function (t) {
        var lns = V.lines.filter(function (l) { return l.t === t; }), ln = lns[lns.length - 1], p = ln.pts[ln.pts.length - 1];
        if (p.t >= x0 && p.t <= x1) ends.push({ t: t, s: CO[t].n + ' ' + ln.y, x: X(p.t) + 7, y: Ya(p.g) + 4 });
      });
      ends.sort(function (a, b) { return a.y - b.y; });
      for (var e = 1; e < ends.length; e++) if (ends[e].y - ends[e - 1].y < 13) ends[e].y = ends[e - 1].y + 13;
      ends.forEach(function (o) {
        tx(svg, o.x, o.y, o.s, { fill: CO[o.t].c, 'font-size': fsL + 0.5, 'font-weight': 600, stroke: C.bg, 'stroke-width': 3, 'paint-order': 'stroke' });
        placed.push({ x: o.x, y: o.y - 10, w: textW(o.s, fsL + 0.5), h: 12 });
      });
    }

    V.lines.forEach(function (ln) {
      var p = ln.pts[0]; if (p.t < x0 || p.t > x1) return;
      var s = /^\d{4}$/.test(ln.y) ? '’' + ln.y.slice(2) : ln.y, w = textW(s, fsL) + 2, y = Ya(p.g);
      var x = Math.max(L + 2 + w / 2, Math.min(L + pw + (narrow ? 0 : R) - 2 - w / 2, X(p.t)));
      var tries = [y - rP - 4, y + rP + 11];
      for (var k = 0; k < tries.length; k++) {
        var b = { x: x - w / 2, y: tries[k] - 9, w: w, h: 11 };
        if (b.y < aTop + 2 || b.y + b.h > aTop + aH - 1) continue;
        if (!free(b)) continue;
        placed.push(b);
        tx(svg, x, tries[k], s, { fill: CO[ln.t].c, 'fill-opacity': 0.9, 'font-size': fsL, 'text-anchor': 'middle', stroke: C.panel, 'stroke-width': 2.5, 'paint-order': 'stroke' });
        break;
      }
    });


    var rmax = 1, cmax = 1;
    V.quarters.forEach(function (q) { rmax = Math.max(rmax, q.r); cmax = Math.max(cmax, q.c); });
    var blo = -cmax - 0.8, bhi = rmax + 0.25;
    var Yb = function (v) { return bTop + 24 + (bhi - v) / (bhi - blo) * (bH - 28); };
    for (var bv = Math.ceil(blo); bv <= Math.floor(bhi); bv++) {
      var by = Yb(bv);
      el('line', { x1: L, x2: L + pw, y1: by, y2: by, stroke: bv === 0 ? C.muted : C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, by + 3.5, (bv > 0 ? '+' : bv < 0 ? '−' : '') + Math.abs(bv), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    var gB = el('g', { 'clip-path': 'url(#cxB)' }, svg);
    V.quarters.forEach(function (q, i) {
      var s0 = qs[i], xm = X(s0 + 45), w = Math.max(2, Math.min(16, (X(s0 + 91) - X(s0)) * 0.56));
      if (q.r) el('rect', { x: xm - w / 2, y: Yb(q.r), width: w, height: Yb(0) - Yb(q.r), fill: C.up }, gB);
      if (q.c) el('rect', { x: xm - w / 2, y: Yb(0), width: w, height: Yb(-q.c) - Yb(0), fill: C.down }, gB);
    });
    if (bandEnd > L + 40) {
      var bs = narrow ? 'shaded: Meta only' : 'shaded: only Meta put a capex plan in its filings', bwid = Math.min(bandEnd, L + pw) - L;
      if (textW(bs, fsL) + 10 < bwid) tx(svg, L + bwid / 2, bTop + bH - 6, bs, { fill: C.muted, 'font-size': fsL, 'text-anchor': 'middle' });
    }
    title(bTop, narrow ? 'B · Raises (up) and cuts (down) per quarter' : 'B · Plans raised (up) or cut (down) in filings, per quarter · raises − cuts = the score');


    var i0 = smhAt(x0), i1 = last, smin = Infinity, smax = -Infinity, i;
    for (i = i0; i <= i1; i++) { smin = Math.min(smin, sc[i]); smax = Math.max(smax, sc[i]); }
    var llo = Math.log(smin / 1.08), lhi = Math.log(smax * 1.06);
    var Yc = function (v) { return cTop + 26 + (lhi - Math.log(v)) / (lhi - llo) * (cH - 32); };
    var lastTy = -Infinity, tgap = narrow ? 17 : 20;
    [1000, 800, 600, 400, 300, 200, 150, 100, 75, 50, 40, 30, 20, 15, 10].forEach(function (tv) {
      var ty = Yc(tv);
      if (ty < cTop + 22 || ty > cTop + cH - 4 || ty - lastTy < tgap) return;
      lastTy = ty;
      el('line', { x1: L, x2: L + pw, y1: ty, y2: ty, stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, ty + 3.5, String(tv), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    });
    var dS = '', st = Math.max(1, Math.floor((i1 - i0) / (pw * 2)));
    for (i = Math.max(0, i0 - 1); ; i = Math.min(i1, i + st)) {
      dS += (dS ? 'L' : 'M') + X(sd[i]).toFixed(1) + ' ' + Yc(sc[i]).toFixed(1);
      if (i >= i1) break;
    }
    var gC = el('g', { 'clip-path': 'url(#cxC)' }, svg);
    el('path', { d: dS, fill: 'none', stroke: C.text, 'stroke-width': narrow ? 1.2 : 1.4, 'stroke-linejoin': 'round' }, gC);
    var th = narrow ? 7 : 8, tw2 = narrow ? 4 : 4.6;
    V.marks.forEach(function (m) {
      if (m.t < x0 || m.t > x1) return;
      var x = X(m.t), y = Yc(m.px / 100), d;
      if (m.k === 'raise') d = 'M' + x + ' ' + (y + 3) + 'l' + tw2 + ' ' + th + 'h' + (-2 * tw2) + 'Z';
      else d = 'M' + x + ' ' + (y - 3) + 'l' + tw2 + ' ' + (-th) + 'h' + (-2 * tw2) + 'Z';
      el('path', { d: d, fill: m.k === 'raise' ? C.up : C.down, stroke: C.bg, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, gC);
    });
    var nx = X(sd[last]), ny = Yc(sc[last]), rN = narrow ? 4 : 5;
    el('circle', { cx: nx, cy: ny, r: rN + 3, fill: C.light, 'fill-opacity': 0.3 }, svg);
    el('circle', { cx: nx, cy: ny, r: rN, fill: '#F3EEFF', stroke: C.white, 'stroke-width': 1.4 }, svg);
    if (!narrow) tx(svg, nx + rN + 6, ny + 4, sc[last].toFixed(2), { fill: C.white, 'font-size': fsL + 0.5, 'font-weight': 700, stroke: C.bg, 'stroke-width': 3, 'paint-order': 'stroke' });
    title(cTop, narrow ? 'C · SMH, log scale · ▲ raise  ▼ cut' : 'C · SMH (adjusted, log scale) · ▲ first trading day after a raise · ▼ after a cut');

    var cross = el('g', { 'pointer-events': 'none' }, svg);
    geo = { L: L, pw: pw, x0: x0, x1: x1, X: X, Ya: Ya, Yb: Yb, Yc: Yc, aTop: aTop, aH: aH, bTop: bTop, bH: bH, cTop: cTop, cH: cH, gap: gap, cross: cross, vis: vis, W: W, narrow: narrow };
    setHover(hover);
  }


  function setHover(h) {
    if (!geo || !V) return;
    clear(geo.cross);
    hover = h;
    var last = sd.length - 1, t, pt = null, mk = null, panel = h ? h.panel : null;
    if (h) { t = h.t; pt = h.pt; mk = h.mk; }
    else { pt = latestPoint(); t = sd[last]; }
    var x = geo.X(t);
    if (h) {
      el('line', { x1: x, x2: x, y1: geo.aTop, y2: geo.cTop + geo.cH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
      var si = smhAt(t);
      el('circle', { cx: geo.X(sd[si]), cy: geo.Yc(sc[si]), r: 3.4, fill: C.text, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
    }
    if (pt && (h || (pt.p.t >= geo.x0))) {
      el('circle', { cx: geo.X(pt.p.t), cy: geo.Ya(pt.p.g), r: 6.5, fill: 'none', stroke: C.white, 'stroke-width': 1.5 }, geo.cross);
    }
    if (mk) el('circle', { cx: geo.X(mk.t), cy: geo.Yc(mk.px / 100) + (mk.k === 'raise' ? 7 : -7), r: 7.5, fill: 'none', stroke: C.white, 'stroke-width': 1.4 }, geo.cross);

    var ro = $('roCx'); clear(ro);
    function row() { var d = document.createElement('div'); d.className = 'cx-r'; ro.appendChild(d); return d; }
    function add(r, cls, s) { r.appendChild(span(cls, s)); }

    var r1 = row(), si2 = smhAt(t);
    add(r1, 'd', dstr(t));
    add(r1, '', ' · SMH ');
    add(r1, 'pc', sc[si2].toFixed(2));
    if (sd[si2] !== t) add(r1, 'muted', ' (close ' + dstr(sd[si2], true) + ')');
    if (!h) add(r1, 'muted', ' · tap or hover the chart for any date or dot');

    var r2 = row();
    if (pt) {
      var p = pt.p, ln = pt.ln, nm = CO[ln.t].n + ' ' + ln.y + ' plan';
      var b = span('p', nm + ' ' + money(p.lo, p.hi)); b.style.color = CO[ln.t].c; r2.appendChild(b);
      add(r2, '', ' · ' + kindWords(p) + ' · ' + sp(p.g, 0) + ' vs ' + prevYear(ln.y) + ' ($' + num(p.act) + 'B) · ' + srcWords(p.src) + ' · ' + sstr(p.d));
      if (p.f12 != null) add(r2, '', ' · SMH next 12 months ' + sp(p.f12, 0));
    } else if (mk) {
      add(r2, mk.k === 'raise' ? 'up' : 'down', (mk.k === 'raise' ? '▲ Raise' : '▼ Cut') + ' day ' + sstr(mk.s, true) + ': ');
      add(r2, '', mk.ev.map(function (e) { return evWords(e, mk.k); }).join('; ') + ' · SMH that day ' + sp(mk.smh0, 1) + ' · ' +
        mk.ev.map(function (e) { return e.t + ' vs S&P ' + sp(e.abn, 1); }).filter(function (s, k, arr) { return arr.indexOf(s) === k; }).join(', '));
    } else if (panel === 'B') {
      var qi0 = quarterAt(t), q0 = qi0 >= 0 ? V.quarters[qi0] : null;
      if (q0 && q0.ev.length) { add(r2, 'pc', 'In filings: '); add(r2, '', q0.ev.map(function (e) { return evWords(e); }).join(' · ')); }
      else add(r2, 'muted', 'No plan was raised or cut in filings this quarter.');
    } else add(r2, 'muted', panel === 'C' ? 'Move onto a ▲ or ▼ to see that raise or cut.' : 'Move onto a dot to see that plan.');

    var r3 = row(), qi = quarterAt(t);
    if (qi < 0) { add(r3, 'pc', qName(qName2(t))); add(r3, 'muted', ' · next big-tech results ' + V.asof.next_prints); }
    else {
      var q = V.quarters[qi], sc0 = q.r - q.c;
      add(r3, 'pc', qName(q.q));
      add(r3, '', ' · ' + q.r + (q.r === 1 ? ' raise, ' : ' raises, ') + q.c + (q.c === 1 ? ' cut' : ' cuts') + ' (score ' + (sc0 > 0 ? '+' : sc0 < 0 ? '−' : '') + Math.abs(sc0) + ')');
      if (q.nq != null) { add(r3, '', ' · SMH next quarter '); add(r3, q.nq >= 0 ? 'up' : 'down', sp(q.nq, 1)); }
      if (q.cov === 'META') add(r3, 'muted', ' · Meta only');
    }
  }
  function qName2(t) { var d = dd(t); return d.getUTCFullYear() + 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1); }
  function pickAt(ev) {
    if (!geo) return;
    var holder = $('chartCx'), svg = holder.querySelector('svg');
    if (!svg) return;
    var r = holder.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width;
    var x = (ev.clientX - r.left) * scale, y = (ev.clientY - r.top) * scale;
    var t = Math.round(geo.x0 + (x - geo.L) / geo.pw * (geo.x1 - geo.x0));
    t = Math.max(Math.max(geo.x0, sd[0]), Math.min(sd[sd.length - 1], t));
    var panel = y < geo.bTop - geo.gap / 2 ? 'A' : y < geo.cTop - geo.gap / 2 ? 'B' : 'C';
    var touch = ev.pointerType && ev.pointerType !== 'mouse', h = { t: t, panel: panel, pt: null, mk: null };
    if (panel === 'A') {
      var best = null, bd = (touch ? 30 : 22) * scale;
      geo.vis.forEach(function (v) { var dx = geo.X(v.p.t) - x, dy = geo.Ya(v.p.g) - y, d = Math.sqrt(dx * dx + dy * dy); if (d < bd) { bd = d; best = v; } });
      if (best) { h.pt = best; h.t = best.p.t; }
    } else if (panel === 'C') {
      var bm = null, bx = (touch ? 14 : 9) * scale;
      V.marks.forEach(function (m) { if (m.t < geo.x0) return; var d = Math.abs(geo.X(m.t) - x); if (d < bx) { bx = d; bm = m; } });
      if (bm) { h.mk = bm; h.t = bm.t; }
    }
    setHover(h);
  }


  function renderRange() {
    Array.prototype.forEach.call(sec.querySelectorAll('[data-cxr]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cxr') === range)); });
    var t = sec.querySelector('[data-cxspan]'); if (t) t.textContent = RWORDS[range];
  }
  sec.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-cxr]');
    if (!b) return;
    range = b.getAttribute('data-cxr');
    try { localStorage.setItem('capexRange', range); } catch (e) { }
    hover = null; renderRange(); draw();
  });
  var chart = $('chartCx');
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
    V = d; prep();
    $('errCx').hidden = true; $('bodyCx').hidden = false;
    renderText(); draw();
  }).catch(function (e) {
    $('errCx').hidden = false; $('bodyCx').hidden = true;
    $('errCx').textContent = 'The spending-plan data could not be loaded. The rest of the page is not affected.';
    if (window.console) console.warn('capex:', e);
  });
})();
