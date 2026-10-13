



(function () {
  'use strict';
  var URL_ = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/tet-radar-data/tet-radar/radar.json' : 'snap/radar.pub.json';
  var NS = 'http://www.w3.org/2000/svg';
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    fear: '#7E57C2', light: '#B39DDB', up: '#26A69A', down: '#EF5350', amber: '#F2B04B', scared: '#4FC3F7',
    greedy: '#FFB74D', ink2: '#B2B5BE', peak: '#FFD84D' };
  var CLS_COL = { up: C.up, dn: C.down, nt: C.muted, mu: C.muted, ink2: C.ink2, amber: C.amber, scared: C.scared, greedy: C.greedy };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var RUNG_WORD = { g: 'good timing', u: 'up-trend', o: 'overbought', a: 'arising', n: 'no trend', d: 'down-trend', x: 'down bounce' };
  var RANGES = { '3M': 63, '6M': 126, '1Y': 252, '2Y': Infinity };
  var RWORDS = { '3M': 'last 3 months', '6M': 'last 6 months', '1Y': 'last year', '2Y': 'last 2 years' };

  var D = null, LN = null, range = '2Y', hoverI = null, geo = null;
  var LATE_DAYS = 6;
  try { var sv = localStorage.getItem('radarRange'); if (sv && RANGES[sv]) range = sv; } catch (e) { }


  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function add(p) { for (var i = 1; i < arguments.length; i++) { var c = arguments[i]; if (c == null) continue; p.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } return p; }
  function md(p, s) {
    String(s || '').split('**').forEach(function (part, k) { if (part) add(p, k % 2 ? h('b', null, part) : part); });
    return p;
  }
  function s_(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function tx(g, x, y, s, a) { var t = s_('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
  function rchip(rung, text) { return h('span', 'rc rc-' + rung, text); }
  function cspan(cls, text, bold) { return h(bold ? 'b' : 'span', cls ? 'c-' + cls : null, text); }
  function warnIcon() {
    var svg = s_('svg', { viewBox: '0 0 12 12', class: 'warnico', 'aria-hidden': 'true' });
    s_('path', { d: 'M6 1 L11.2 10.6 L0.8 10.6 Z', fill: 'none', stroke: C.amber, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, svg);
    s_('rect', { x: 5.35, y: 4.3, width: 1.3, height: 3.4, fill: C.amber }, svg);
    s_('rect', { x: 5.35, y: 8.4, width: 1.3, height: 1.3, fill: C.amber }, svg);
    return svg;
  }
  function sinceNode(sn) {
    var sp = h('span', sn ? 'c-' + sn.cls : 'c-mu');
    if (!sn) return sp;
    if (sn.warn) sp.appendChild(warnIcon());
    sp.appendChild(document.createTextNode(sn.w + (sn.s ? ' ' + sn.s : '')));
    return sp;
  }
  function dlong(iso) { var p = iso.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
  function dshort(iso) { var p = iso.split('-'); return MON[+p[1] - 1] + ' ' + (+p[2]); }
  function signed(v, nd) { var s = Math.abs(v).toFixed(nd); if (+s === 0) return (0).toFixed(nd); return (v < 0 ? '−' : '+') + s; }
  function pct1(v) { return (v * 100).toFixed(1) + '%'; }


  function box(id, rows) {
    var b = clear($(id));
    rows.forEach(function (r) { add(b, add(h('div', 'box-row'), h('b', null, r.k), md(h('span'), r.v))); });
  }


  function ropeGlyph(g, w, hh) {
    var svg = s_('svg', { width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, 'aria-hidden': 'true' });
    var pad = 6, X = function (v) { return pad + (Math.max(-1, Math.min(1, v)) + 1) / 2 * (w - 2 * pad); }, y = hh / 2;
    s_('rect', { x: X(LN.tr[1]), y: 1, width: X(1) - X(LN.tr[1]), height: hh - 2, rx: 2, fill: C.up, 'fill-opacity': 0.14 }, svg);
    s_('rect', { x: X(-1), y: 1, width: X(LN.tr[0]) - X(-1), height: hh - 2, rx: 2, fill: C.down, 'fill-opacity': 0.12 }, svg);
    s_('line', { x1: X(-1), x2: X(1), y1: y, y2: y, stroke: '#3A3F4B', 'stroke-width': 1 }, svg);
    s_('line', { x1: X(0), x2: X(0), y1: y - 4, y2: y + 4, stroke: '#4A4F5C', 'stroke-width': 1 }, svg);
    if (!g) return svg;
    if (g.rope && g.c != null) {
      var rc = CLS_COL[g.rope] || C.ink2;
      s_('line', { x1: X(g.a), x2: X(g.c), y1: y, y2: y, stroke: rc, 'stroke-width': 2.2 }, svg);
      s_('line', { x1: X(g.c), x2: X(g.c), y1: y - 4, y2: y + 4, stroke: rc, 'stroke-width': 2.2 }, svg);
    }
    s_('circle', { cx: X(g.a), cy: y, r: 4, fill: C.bg, stroke: CLS_COL[g.ring] || C.muted, 'stroke-width': 2 }, svg);
    return svg;
  }
  function rangeBar(r) {
    var w = 230, hh = 40, pad = 8, y = 12;
    var X = function (v) { return pad + (v - r.lo) / ((r.hi - r.lo) || 1) * (w - 2 * pad); };
    var svg = s_('svg', { width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, role: 'img', 'aria-label': 'Two-year range: low ' + r.lo_s + ', high ' + r.hi_s });
    s_('rect', { x: pad, y: y - 4, width: w - 2 * pad, height: 8, rx: 4, fill: '#2F3441' }, svg);
    s_('line', { x1: X(r.med), x2: X(r.med), y1: y - 7, y2: y + 7, stroke: C.muted, 'stroke-width': 1.3 }, svg);
    s_('line', { x1: X(r.prev), x2: X(r.now), y1: y, y2: y, stroke: C.ink2, 'stroke-width': 2, 'stroke-dasharray': '2 2' }, svg);
    s_('circle', { cx: X(r.prev), cy: y, r: 3.8, fill: C.panel, stroke: C.ink2, 'stroke-width': 1.5 }, svg);
    s_('circle', { cx: X(r.now), cy: y, r: 5.4, fill: C.white, stroke: C.panel, 'stroke-width': 1.5 }, svg);
    tx(svg, pad, hh - 3, r.lo_s, { fill: C.muted, 'font-size': 12 });
    tx(svg, w - pad, hh - 3, r.hi_s, { fill: C.muted, 'font-size': 12, 'text-anchor': 'end' });
    var mx = Math.max(pad + 34, Math.min(w - pad - 34, X(r.med)));
    tx(svg, mx, hh - 3, 'median', { fill: C.muted, 'font-size': 12, 'text-anchor': 'middle' });
    return svg;
  }
  function dotsSvg(d) {
    var n = d.intact + d.weak + d.gone, per = 10, dd = 13, gap = 5, rows = Math.max(1, Math.ceil(n / per));
    var w = per * (dd + gap), hh = rows * (dd + gap);
    var svg = s_('svg', { width: w, height: hh, viewBox: '0 0 ' + w + ' ' + hh, role: 'img', 'aria-label': d.intact + ' rope intact, ' + d.weak + ' weaker, ' + d.gone + ' gone' });
    var k = 0;
    [['i', d.intact], ['w', d.weak], ['g', d.gone]].forEach(function (p) {
      for (var j = 0; j < p[1]; j++, k++) {
        var cx = (k % per) * (dd + gap) + dd / 2 + 1, cy = Math.floor(k / per) * (dd + gap) + dd / 2 + 1;
        if (p[0] === 'i') s_('circle', { cx: cx, cy: cy, r: dd / 2, fill: C.up }, svg);
        else if (p[0] === 'w') s_('circle', { cx: cx, cy: cy, r: dd / 2, fill: C.up, 'fill-opacity': 0.38 }, svg);
        else s_('circle', { cx: cx, cy: cy, r: dd / 2 - 1, fill: 'none', stroke: C.amber, 'stroke-width': 1.6 }, svg);
      }
    });
    return svg;
  }
  function weatherIcon(kind) {
    var svg = s_('svg', { viewBox: '0 0 96 74', 'aria-hidden': 'true' });
    function sun() {
      var g = s_('g', { stroke: C.amber, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      for (var k = 0; k < 8; k++) {
        var a = k * Math.PI / 4;
        s_('line', { x1: 30 + Math.cos(a) * 20, y1: 26 + Math.sin(a) * 20, x2: 30 + Math.cos(a) * 27, y2: 26 + Math.sin(a) * 27 }, g);
      }
      s_('circle', { cx: 30, cy: 26, r: 14, fill: C.amber }, svg);
    }
    function cloud(col) {
      var g = s_('g', { fill: col }, svg);
      s_('circle', { cx: 38, cy: 50, r: 15 }, g); s_('circle', { cx: 56, cy: 40, r: 19 }, g);
      s_('circle', { cx: 74, cy: 51, r: 14 }, g); s_('rect', { x: 36, y: 48, width: 40, height: 17, rx: 4 }, g);
    }
    if (kind === 'sun') sun();
    else if (kind === 'suncloud') { sun(); cloud('#d9dde3'); }
    else if (kind === 'cloud') cloud('#aeb4bd');
    else cloud('#8d939c');
    return svg;
  }


  function render1() {
    var s = D.s1;
    clear($('wxIcon')).appendChild(weatherIcon(s.icon));
    $('wxHead').textContent = s.head;
    $('wxSub').textContent = s.sub;
    $('wxKick').textContent = s.kicker;
    box('box1', [{ k: 'Right now', v: s.tldr },
      { k: 'How to read it', v: 'The author asks three questions, in this order. **Trend**: which way is each stock’s river flowing (judged on its last calm day)? **Mood**: is the crowd scared or excited today? **Timing**: calm-day trend minus mood, so an up-trend on a scared day scores high. The weather line sums up the first two for all S&P 500 stocks.' }]);
    var dials = clear($('dials'));
    s.dials.forEach(function (d) {
      var c = add(h('div', 'dial'), add(h('div', 'dh'), h('span', 'dq', d.q)), h('div', 'ask', d.ask),
        h('div', 'big' + (d.big_cls ? ' c-' + d.big_cls : ''), d.big), h('div', 'unit', d.unit));
      c.appendChild(d.range ? rangeBar(d.range) : dotsSvg(d.dots));
      d.lines.forEach(function (l) { c.appendChild(h('div', 'dl', l)); });
      dials.appendChild(c);
    });
    var ixs = clear($('ixs'));
    s.index.forEach(function (x) {
      var row = h('div', 'ix');
      add(row, add(h('div'), h('span', 'tk', x.sym), h('span', 'ds', x.desc)));
      add(row, add(h('div', 'c-chip'), rchip(x.rung, x.chip), x.was ? h('span', 'was', 'last week: ' + x.was) : null));
      add(row, add(h('div', 'c-glyph'), ropeGlyph(x.glyph, 170, 18), h('span', 'rope-cap', 'calm day ' + x.calm + (x.since && x.since.w !== 'same' ? ' · rope ' + x.since.w + ' ' + x.since.s : ''))));
      add(row, add(h('div', 'nums'), 'trend ', cspan(x.a_cls, x.a, true), ' → today ', cspan(x.c_cls, x.c, true), h('br'),
        'mood ', cspan(x.mood_cls, x.mood, true), ' · timing ', h('b', null, x.tim)));
      add(row, add(h('div', 'nx'), h('span', 'k', 'next: '), x.next));
      ixs.appendChild(row);
    });
    var ll = clear($('leadLine'));
    add(ll, h('span', 'lh', 'LEADERS'), h('span', 'muted', ' · vs S&P 500 + Nasdaq 100: '));
    s.leaders.forEach(function (g, k) {
      if (k) add(ll, h('span', 'muted', ' · '));
      add(ll, h('b', null, g.syms), ' ', h('span', 'c-' + ({ gt: 'up', up: 'up', ar: 'up', ob: 'greedy', nt: 'mu', dn: 'dn', ex: 'dn', wu: 'mu' }[g.rung]), g.word));
    });
    $('chSince').textContent = '· since ' + dshort(D.week_ago);
    var ch = clear($('changes'));
    s.changes.forEach(function (c) { add(ch, add(h('li'), h('span', 'dot bg-' + c.dot), add(h('span'), h('b', null, c.title), '  ' + c.text))); });
    var key = clear($('tileKey'));
    function ki(sw, label) { var k = h('span', 'ki'); k.appendChild(sw); k.appendChild(document.createTextNode(label)); key.appendChild(k); }
    function sw(style) { var e = h('i', 'sw'); e.setAttribute('style', style); return e; }
    ki(sw('background:' + C.up), 'good timing, rope intact');
    ki(sw('background:#1D6E66'), 'good timing, trend weaker since the calm day');
    ki(sw('border:2px solid ' + C.up), 'good timing, trend gone');
    ki(sw('width:0;height:0;border-radius:0;border-top:12px solid ' + C.amber + ';border-left:12px solid transparent'), 'rope warning: an extreme timing while the trend moved far since the calm day');
    ki(sw('width:8px;height:8px;border-radius:4px;background:' + C.light), 'the S&P-only setup gives another rung');
    ki(h('b', 'c-mu', '1.23'), 'grey number = no up-trend, timing does not apply');
    var tl = clear($('tiles'));
    s.tiles.forEach(function (g) {
      var grid = h('div', 'tgrid');
      g.tiles.forEach(function (t) {
        var cls = t.rung === 'gt' ? 'tl-gt-' + t.fill : 'tl-' + t.rung;
        var d = add(h('div', 'tl ' + cls), h('div', 'a', t.sym), h('div', 'b', t.word), h('div', 'c' + (t.tim_mu ? ' mu' : ''), t.tim));
        d.title = t.sym + ': ' + t.word + ', ' + t.tim;
        if (t.warn) d.appendChild(h('span', 'corner'));
        if (t.vd) d.appendChild(h('span', 'vd'));
        grid.appendChild(d);
      });
      add(tl, add(h('div', 'tgroup'), add(h('div', 'gl', g.name + ' '), h('span', null, '· ' + g.basis)), grid));
    });
    $('tilesNote').textContent = s.tiles_note;
  }


  function render2() {
    var s = D.s2, n = s.dates.length;
    var a = clear($('asof2'));
    add(a, h('span', 'chip chip-closed', 'DAILY'), h('span', null, s.n_ready + ' S&P 500 members on the author’s setup · ' + dlong(s.dates[0]) + ' to ' + dlong(s.dates[n - 1]) + ' close'));
    var tiles = clear($('tiles2'));
    s.tiles.forEach(function (t) { add(tiles, add(h('div'), h('span', 'k', t.k), h('span', 'v c-' + t.cls, t.v), h('span', 's', t.s))); });
    var lg = clear($('lg2'));
    function item(style, cls, t) { var sp = h('span', 'lg-i'); var e = h('span', cls); e.setAttribute('style', style); add(sp, e, t); lg.appendChild(sp); }
    item('border-color:' + C.text, 'lg-ln', 'SPY close');
    item('background:' + C.up, 'lg-sq', 'strip: SPY’s own rung (bright = good timing, green = up, grey = no trend or arising, red = down)');
    item('border-color:' + C.up, 'lg-ln', '% in an up-trend');
    item('border-color:' + C.down, 'lg-ln', '% in a down-trend');
    item('border-color:' + C.up, 'lg-dash', '2-year median up-trend share');
    item('background:' + C.up + ';opacity:.75', 'lg-sq', 'stocks at good timing');
    item('background:' + C.greedy, 'lg-sq', 'average mood above 0 (greedy)');
    item('background:' + C.scared, 'lg-sq', 'below 0 (scared)');
    box('box2', [{ k: 'Right now', v: s.tldr },
      { k: 'How to read it', v: 'Every day, each S&P 500 stock gets a trend verdict from its last calm day. **Green line** = share in an up-trend, **red line** = share in a down-trend; the space between is “no clear trend”. The strip under SPY is SPY’s own rung. Bars below: how many stocks sit at good timing, and the average mood of all members.' }]);
    $('ladSub').textContent = '· ' + s.n_ready + ' members, the author’s rungs first';
    var t = clear($('ladTable'));
    var hr = h('tr');
    ['Rung', 'Now', 'Share', '', '1 wk ago', '1 mo ago', 'Week'].forEach(function (x, k) { hr.appendChild(h('th', k === 0 ? 'l' : k === 3 ? 'l lbar-td' : null, x)); });
    add(t, add(h('thead'), hr));
    var tb = h('tbody'), maxShare = Math.max.apply(null, s.ladder.map(function (r) { return r.share; }));
    var BAR = { gt: C.up, up: C.up, ob: C.greedy, ar: C.up, nt: C.muted, dn: C.down, ex: C.down };
    s.ladder.forEach(function (r) {
      var bar = h('div', 'lbar'), i = h('i'); i.setAttribute('style', 'width:' + (r.share / maxShare * 100).toFixed(1) + '%;background:' + BAR[r.rung] + ';opacity:.8'); bar.appendChild(i);
      add(tb, add(h('tr'), add(h('td'), rchip(r.rung, r.chip), rchip(r.rung, r.short)), add(h('td'), h('b', null, String(r.now))), h('td', 'muted', r.share_s),
        add(h('td', 'l lbar-td'), bar), h('td', null, String(r.w1)), h('td', null, String(r.m1)), h('td', null, r.wk)));
    });
    t.appendChild(tb);
    $('notCounted').textContent = s.not_counted;
    var y = clear($('yard')), SH = { 1: 0.35, 2: 0.6, 3: 1 };
    s.yard.forEach(function (r) {
      var bar = h('div', 'bar'), i = h('i'); i.setAttribute('style', 'width:' + Math.min(100, r.v / 0.6 * 100).toFixed(1) + '%;background:' + C.up + ';opacity:' + SH[r.shade]); bar.appendChild(i);
      add(y, add(h('div', 'yd'), add(h('div', 'lab', r.lab + ' '), r.whose ? h('span', null, '(' + r.whose + ')') : null),
        add(h('div', 'vr'), bar, h('span', 'val', r.v_s)), h('div', 'md', '2-year median ' + r.med_s)));
    });
    $('yardNote').textContent = s.yard_note;
    renderRange();
  }
  function todayPct(k) {
    var t = (D.s2.tiles || [])[k === 'up' ? 0 : 1], s = D.s2[k];
    return t && t.v ? t.v : pct1(s[s.length - 1]);
  }
  function niceStep(span, px, minPx, steps) {
    for (var k = 0; k < steps.length; k++) if (steps[k] / span * px >= minPx) return steps[k];
    return steps[steps.length - 1];
  }
  function draw2() {
    var holder = $('chart2'); clear(holder);
    if (!D) return;
    var s = D.s2, n = s.dates.length, last = n - 1;
    var W = Math.max(300, Math.round(holder.clientWidth || 360)), narrow = W < 640;
    var L = narrow ? 36 : 48, R = narrow ? 50 : 76, pw = W - L - R, fs = narrow ? 10.5 : 11.5, ft = narrow ? 11 : 12.5;
    var hA = narrow ? 70 : 104, hB = narrow ? 150 : 200, hC = narrow ? 42 : 58, hD = narrow ? 58 : 78, tg = narrow ? 24 : 28;
    var yA0 = 18, yA1 = yA0 + hA, ySt = yA1 + 4, yB0 = ySt + 8 + tg, yB1 = yB0 + hB, yC0 = yB1 + tg, yC1 = yC0 + hC, yD0 = yC1 + tg, yD1 = yD0 + hD;
    var H = yD1 + 22;
    var cnt = Math.min(n, RANGES[range]), i0 = n - cnt;
    var X = function (i) { return L + (i - i0) / Math.max(1, cnt - 1) * pw; };
    var svg = s_('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, holder);
    [[yA0, yA1], [yB0, yB1], [yC0, yC1], [yD0, yD1]].forEach(function (p) { s_('rect', { x: L, y: p[0], width: pw, height: p[1] - p[0], fill: C.panel, rx: 3 }, svg); });

    var prev = null, every = cnt > 300 ? 3 : cnt > 140 ? 2 : 1, i;
    for (i = i0; i <= last; i++) {
      var p = s.dates[i].split('-'), mk = (+p[0]) * 12 + (+p[1] - 1);
      if (prev !== null && mk !== prev && mk % every === 0) {
        var x = X(i);
        [[yA0, yA1], [yB0, yB1], [yC0, yC1], [yD0, yD1]].forEach(function (q) { s_('line', { x1: x, x2: x, y1: q[0], y2: q[1], stroke: C.line, 'stroke-width': 1 }, svg); });
        if (x > L + 14 && x < L + pw - 14) tx(svg, x, H - 6, +p[1] === 1 ? p[0] : MON[+p[1] - 1], { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
      }
      prev = mk;
    }
    function title(y, t, sub) {
      var e = tx(svg, 0, y, t, { fill: C.text, 'font-size': ft, 'font-weight': 700 });
      if (sub) { var ts = s_('tspan', { fill: C.muted, 'font-weight': 400 }, e); ts.textContent = sub; }
    }

    var smin = Infinity, smax = -Infinity;
    for (i = i0; i <= last; i++) { smin = Math.min(smin, s.spy[i]); smax = Math.max(smax, s.spy[i]); }
    var sp = (smax - smin) * 0.08 || 1, s0 = smin - sp, s1 = smax + sp;
    var Ys = function (v) { return yA1 - 3 - (v - s0) / (s1 - s0) * (hA - 6); };
    title(12, 'SPY', narrow ? '' : '  · strip = SPY’s own rung');
    var dS = '';
    for (i = i0; i <= last; i++) dS += (i === i0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Ys(s.spy[i]).toFixed(1);
    s_('path', { d: dS, fill: 'none', stroke: C.text, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, svg);
    tx(svg, L - 5, Ys(smax) + 4, String(Math.round(smax)), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    tx(svg, L - 5, Ys(smin) + 4, String(Math.round(smin)), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    tx(svg, L + pw + 5, Ys(s.spy[last]) + 4, s.spy[last].toFixed(narrow ? 0 : 2), { fill: C.white, 'font-size': fs, 'font-weight': 700 });
    var bw = pw / Math.max(1, cnt - 1);
    var SC = { g: [C.up, 1], u: [C.up, 0.6], o: [C.up, 0.6], a: [C.muted, 0.35], n: [C.muted, 0.35], d: [C.down, 0.7], x: [C.down, 0.7] };
    var runStart = i0;
    for (i = i0 + 1; i <= last + 1; i++) {
      if (i <= last && s.spy_rung[i] === s.spy_rung[runStart]) continue;
      var c = SC[s.spy_rung[runStart]] || [C.line, 1];
      var xa = Math.max(L, X(runStart) - bw / 2), xb = Math.min(L + pw, X(i - 1) + bw / 2);
      s_('rect', { x: xa.toFixed(1), y: ySt, width: Math.max(0.8, xb - xa).toFixed(1), height: 7, fill: c[0], 'fill-opacity': c[1] }, svg);
      runStart = i;
    }

    var vmax = 0;
    for (i = i0; i <= last; i++) vmax = Math.max(vmax, s.up[i], s.down[i]);
    var top = Math.max(0.1, Math.ceil(vmax * 1.12 * 20) / 20), st = niceStep(top, hB - 10, narrow ? 24 : 30, [0.05, 0.1, 0.2]);
    var Yb = function (v) { return yB1 - v / top * (hB - 8); };
    title(yB0 - 8, narrow ? 'Up-trend vs down-trend' : 'Stocks in an up-trend vs a down-trend', narrow ? '' : '  · share of S&P 500 members');
    for (var g = st; g <= top + 1e-9; g += st) {
      s_('line', { x1: L, x2: L + pw, y1: Yb(g), y2: Yb(g), stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, Yb(g) + 4, Math.round(g * 100) + '%', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    tx(svg, L - 5, yB1 + 1, '0', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    s_('line', { x1: L, x2: L + pw, y1: Yb(s.up_med), y2: Yb(s.up_med), stroke: C.up, 'stroke-opacity': 0.55, 'stroke-width': 1, 'stroke-dasharray': '4 3' }, svg);
    [['down', C.down], ['up', C.up]].forEach(function (q) {
      var d = '', arr = s[q[0]];
      for (i = i0; i <= last; i++) d += (i === i0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Yb(arr[i]).toFixed(1);
      s_('path', { d: d, fill: 'none', stroke: q[1], 'stroke-width': narrow ? 1.6 : 1.9, 'stroke-linejoin': 'round' }, svg);
    });
    var yu = Yb(s.up[last]), yd = Yb(s.down[last]);
    if (Math.abs(yu - yd) < 28) { if (yu > yd) { yu += (28 - (yu - yd)) / 2; yd = yu - 28; } else { yd += (28 - (yd - yu)) / 2; yu = yd - 28; } }
    tx(svg, L + pw + 5, yu - 1, 'up', { fill: C.up, 'font-size': fs, 'font-weight': 700 });
    tx(svg, L + pw + 5, yu + 12, todayPct('up'), { fill: C.white, 'font-size': fs, 'font-weight': 700 });
    tx(svg, L + pw + 5, yd - 1, 'down', { fill: C.down, 'font-size': fs, 'font-weight': 700 });
    tx(svg, L + pw + 5, yd + 12, todayPct('down'), { fill: C.white, 'font-size': fs, 'font-weight': 700 });

    var cmax = 1;
    for (i = i0; i <= last; i++) cmax = Math.max(cmax, s.gt[i]);
    var Yc = function (v) { return yC1 - v / cmax * (hC - 6); };
    title(yC0 - 8, 'Stocks at good timing', narrow ? '' : '  · count per day');
    var bwid = Math.max(0.8, Math.min(6, bw * 0.8)), dC = '';
    for (i = i0; i <= last; i++) if (s.gt[i]) dC += 'M' + (X(i) - bwid / 2).toFixed(1) + ' ' + yC1 + 'V' + Yc(s.gt[i]).toFixed(1) + 'h' + bwid.toFixed(1) + 'V' + yC1 + 'Z';
    s_('path', { d: dC, fill: C.up, 'fill-opacity': 0.75 }, svg);
    tx(svg, L - 5, Yc(cmax) + 8, String(cmax), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    tx(svg, L - 5, yC1 + 1, '0', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    tx(svg, L + pw + 5, Math.min(yC1 - 2, Yc(s.gt[last]) + 4), String(s.gt[last]), { fill: C.white, 'font-size': fs, 'font-weight': 700 });

    var mm = 0.3;
    for (i = i0; i <= last; i++) mm = Math.max(mm, Math.abs(s.mood[i]));
    mm = Math.ceil(mm * 10) / 10;
    var Ym = function (v) { return yD0 + 3 + (mm - v) / (2 * mm) * (hD - 6); };
    title(yD0 - 8, 'Average mood', narrow ? '' : '  · of all members (orange = greedy, blue = scared)');
    s_('line', { x1: L, x2: L + pw, y1: Ym(0), y2: Ym(0), stroke: '#3A3F4B', 'stroke-width': 1 }, svg);
    var dPos = '', dNeg = '';
    for (i = i0; i <= last; i++) {
      var v = s.mood[i], y0 = Ym(0), y1 = Ym(v);
      var seg = 'M' + (X(i) - bwid / 2).toFixed(1) + ' ' + y0.toFixed(1) + 'V' + y1.toFixed(1) + 'h' + bwid.toFixed(1) + 'V' + y0.toFixed(1) + 'Z';
      if (v >= 0) dPos += seg; else dNeg += seg;
    }
    s_('path', { d: dPos, fill: C.greedy, 'fill-opacity': 0.8 }, svg);
    s_('path', { d: dNeg, fill: C.scared, 'fill-opacity': 0.75 }, svg);
    tx(svg, L - 5, Ym(mm) + 8, signed(mm, 1), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    tx(svg, L - 5, Ym(0) + 4, '0', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    tx(svg, L - 5, Ym(-mm), signed(-mm, 1), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    tx(svg, L + pw + 5, Ym(s.mood[last]) + 4, signed(s.mood[last], 2), { fill: s.mood[last] >= 0 ? C.greedy : C.scared, 'font-size': fs, 'font-weight': 700 });
    var cross = s_('g', {}, svg);
    geo = { L: L, pw: pw, i0: i0, cnt: cnt, X: X, Ys: Ys, Yb: Yb, cross: cross, top: yA0, bot: yD1 };
    setHover(hoverI);
  }
  function setHover(i) {
    if (!geo || !D) return;
    var s = D.s2, last = s.dates.length - 1;
    clear(geo.cross);
    if (i != null && (i < geo.i0 || i > last)) i = null;
    hoverI = i;
    var j = i == null ? last : i;
    if (i != null) {
      var px = geo.X(i);
      s_('line', { x1: px, x2: px, y1: geo.top, y2: geo.bot, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
      s_('circle', { cx: px, cy: geo.Ys(s.spy[i]), r: 3.4, fill: C.text, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
      s_('circle', { cx: px, cy: geo.Yb(s.up[i]), r: 3.6, fill: C.up, stroke: C.white, 'stroke-width': 1 }, geo.cross);
      s_('circle', { cx: px, cy: geo.Yb(s.down[i]), r: 3.6, fill: C.down, stroke: C.white, 'stroke-width': 1 }, geo.cross);
    }
    var ro = clear($('ro2'));
    add(ro, h('span', 'd', dlong(s.dates[j])), ' · SPY ' + s.spy[j].toFixed(2) + ' (' + (RUNG_WORD[s.spy_rung[j]] || '—') + ') · ',
      h('span', 'up', 'up ' + (j === last ? todayPct('up') : pct1(s.up[j]))), ' · ', h('span', 'down', 'down ' + (j === last ? todayPct('down') : pct1(s.down[j]))),
      ' · good timing ' + s.gt[j] + ' · mood ' + signed(s.mood[j], 2));
    if (i == null) ro.appendChild(h('span', 'muted', ' · tap or hover the chart for any day'));
  }
  function pickAt(ev) {
    if (!geo) return;
    var holder = $('chart2'), svg = holder.querySelector('svg');
    if (!svg) return;
    var r = holder.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width, x = (ev.clientX - r.left) * scale;
    var i = Math.round(geo.i0 + (x - geo.L) / geo.pw * (geo.cnt - 1));
    setHover(Math.max(geo.i0, Math.min(D.s2.dates.length - 1, i)));
  }
  function renderRange() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-br]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-br') === range)); });
    var t = document.querySelector('[data-bspan]'); if (t) t.textContent = RWORDS[range];
  }


  function th(text, cls) {
    var e = h('th', cls);
    String(text).split('\n').forEach(function (p, k) { if (k) e.appendChild(h('br')); e.appendChild(document.createTextNode(p)); });
    return e;
  }
  function nameCell(r) {
    var td = add(h('td'), h('span', 'tk', r.sym));
    if (r.young) td.appendChild(h('span', 'dag', ' †'));
    if (r.desc) td.appendChild(h('span', 'ds', r.desc));
    return td;
  }
  function mainTable(id, groups, checks) {
    var t = clear($(id)), hr = h('tr');
    var heads = ['Name', '1 wk'].concat(checks ? ['Check\nown', 'vs\nS&P', 'vs\nNDX'] : [])
      .concat(['Trend\ncalm day', 'Trend\ntoday', 'Since\ncalm day', 'Mood', 'Timing', 'Ladder', 'Last\nweek']);
    heads.forEach(function (x, k) { hr.appendChild(th(x, k === 0 || x === 'Ladder' || x.indexOf('Since') === 0 || x.indexOf('Last') === 0 ? 'l' : null)); });
    add(t, add(h('thead'), hr));
    var tb = h('tbody');
    groups.forEach(function (g) {
      var gtd = h('td'); gtd.colSpan = heads.length;
      add(gtd, add(h('span', 'gl', g.name + ' '), h('span', null, '· ' + g.basis)));
      add(tb, add(h('tr', 'gh'), gtd));
      g.rows.forEach(function (r) {
        var tr = add(h('tr'), nameCell(r), h('td', 'c-' + r.w1_cls, r.w1));
        if (checks) r.checks.forEach(function (c) { add(tr, add(h('td'), h('span', 'ck ck-' + c.cls, c.v))); });
        if (r.warming) {
          var w = h('td', 'wu', r.warming); w.colSpan = 5;
          add(tr, w, add(h('td', 'l'), rchip(r.rung, r.chip)), h('td', 'l muted', '—'));
        } else {
          add(tr, add(h('td'), cspan(r.a_cls, r.a, true)), add(h('td'), cspan(r.c_cls, r.c)), add(h('td', 'l'), sinceNode(r.since)),
            add(h('td'), cspan(r.mood_cls, r.mood)), add(h('td'), r.tim_cls === 'b' ? h('b', 'c-b', r.tim) : cspan(r.tim_cls, r.tim)),
            add(h('td', 'l'), rchip(r.rung, r.chip)), h('td', 'l c-ink2', r.was));
        }
        tb.appendChild(tr);
      });
    });
    t.appendChild(tb);
  }
  var ROW_HOW = 'TREND runs −1 to +1: clearly up = up-trend, clearly down = down-trend. **Calm day** = the trend judged on the last calm day (mood crossing 0); the ladder uses it. **Today** = where the trend is now. SINCE CALM DAY, in trend-vote steps: stronger / intact / weaker / gone (at or below 0) for an up-trend; deeper / easing / gone for a down-trend; building up / down when the calm day had no clear trend. MOOD −1 scared to +1 greedy. TIMING = calm-day trend − mood: bold = good timing, grey = no up-trend, so timing does not apply.';
  function render3() {
    var s = D.s3;
    box('box3', [{ k: 'Right now', v: s.tldr }, { k: 'How to read a row', v: ROW_HOW + ' Index ETFs: own trend only. Other ETFs: own trend and vs the S&P 500, the one closer to 0 counts (0 if they disagree).' }]);
    mainTable('etfTable', s.groups, false);
    add(clear($('etfNote')), h('span', 'c-amber', '† '), s.young_note, ' 1 wk = price change over the week. Last week = the rung a week ago, shown only when it changed.');
  }
  function render4() {
    var s = D.s4;
    box('box4', [{ k: 'Right now', v: s.tldr }, { k: 'How to read a row', v: 'Same columns as the ETF table, plus **today’s checks**: the stock’s own trend, its trend against the S&P 500 and against the Nasdaq 100. The check closest to 0 sets today’s trend (0 if they point opposite ways), so a stock must beat both indexes to count as an up-trend.' }]);
    mainTable('stkTable', s.groups, true);
    $('stkNote').textContent = s.note;
    var p = clear($('differ'));
    add(p, add(h('h3', 'sh sh-in', 'Where the two setups disagree '), h('span', 'q', '· the author’s setup vs the paper’s S&P-only setup')));
    if (!s.differ.length) add(p, h('p', 'small', 'None this week: both setups give the same rung for every stock we watch.'));
    s.differ.forEach(function (d) {
      add(p, add(h('div', 'dif'), h('span', 'tk', d.sym), add(h('div'), rchip(d.b.rung, d.b.chip), ' ' + d.b.text, h('span', 'vs', 'vs'),
        rchip(d.a.rung, d.a.chip), ' ' + d.a.text + ' (S&P-only)', add(h('div', 'small'), d.why))));
    });
  }


  var COLS = {
    tk: ['Name', 'l', function (r) { return add(h('td'), h('span', 'tk', r.sym)); }],
    close: ['Close', '', function (r) { return h('td', null, r.close); }],
    w1: ['1 wk', '', function (r) { return h('td', 'c-' + r.w1_cls, r.w1); }],
    a: ['Trend\ncalm day', '', function (r) { return add(h('td'), cspan(r.a_cls, r.a, true)); }],
    c: ['Trend\ntoday', '', function (r) { return add(h('td'), cspan(r.c_cls, r.c)); }],
    rope: ['Rope', 'l', function (r) { return add(h('td', 'l'), ropeGlyph(r.glyph, 96, 16)); }],
    since: ['Since\ncalm day', 'l', function (r) { return add(h('td', 'l'), sinceNode(r.since)); }],
    mood: ['Mood', '', function (r) { return add(h('td'), cspan(r.mood_cls, r.mood)); }],
    tim: ['Timing', '', function (r) { return add(h('td'), r.tim_cls === 'b' ? h('b', 'c-b', r.tim) : cspan(r.tim_cls, r.tim)); }],
    judged: ['Judged', '', function (r) { return h('td', 'muted', r.judged); }],
    chip: ['Ladder', 'l', function (r) { return add(h('td', 'l'), rchip(r.rung, r.chip)); }],
    was: ['Was', 'l', function (r) { return h('td', 'l muted', r.was); }],
    now: ['Now', 'l', function (r) { return h('td', 'l', r.now); }],
    sponly: ['S&P-only', 'l', function (r) { return h('td', 'l muted', r.sp_only); }]
  };
  function listTable(id, cols, rows, sections) {
    var t = clear($(id)), hr = h('tr');
    cols.forEach(function (k) { hr.appendChild(th(COLS[k][0], COLS[k][1] || null)); });
    add(t, add(h('thead'), hr));
    var tb = h('tbody');
    function addRows(rr) {
      if (!rr.length) { var e = h('td', 'muted', 'none'); e.colSpan = cols.length; add(tb, add(h('tr'), e)); }
      rr.forEach(function (r) { var tr = h('tr'); cols.forEach(function (k) { tr.appendChild(COLS[k][2](r)); }); tb.appendChild(tr); });
    }
    if (sections) sections.forEach(function (sec) {
      var gtd = h('td'); gtd.colSpan = cols.length;
      add(gtd, add(h('span', 'gl', sec.title + ' (' + sec.rows.length + ') '), h('span', null, '· ' + sec.sub)));
      add(tb, add(h('tr', 'gh gh-' + sec.key), gtd));
      addRows(sec.rows);
    });
    else addRows(rows);
    t.appendChild(tb);
  }
  function render5() {
    var s = D.s5;
    box('box5', [{ k: 'Right now', v: s.tldr },
      { k: 'How to read it', v: '**Good timing** is the author’s first rung: a stock in an up-trend on a scared day, so its timing (calm-day trend − mood) is high. The **rope** shows how far today’s trend moved since that calm day: intact = still there (the paper’s preferred case), weaker = faded, gone = today’s trend is at or below 0, so the up-trend verdict is stale. Judged = trading days since the calm day.' }]);
    listTable('gtTable', ['tk', 'close', 'w1', 'a', 'rope', 'c', 'since', 'mood', 'tim', 'judged'], null, s.sections);
    $('spLine').textContent = s.spline;
    $('newTitle').textContent = 'New in up-trend · this week (' + s.new.length + ')';
    $('leftTitle').textContent = 'Left the up-trend · this week (' + s.left.length + '), not a short';
    listTable('newTable', ['tk', 'was', 'a', 'mood', 'tim', 'w1'], s.new);
    listTable('leftTable', ['tk', 'now', 'a', 'sponly', 'w1'], s.left);
    $('newWas').textContent = s.new.length ? 'Confirmed on a calm day; ' + s.newin_was + '.' : '';
  }
  var LCOLS = { a: 'a', c: 'c', mood: 'mood', chip: 'chip', since: 'since', tim: 'tim', w1: 'w1' };
  function render6() {
    var s = D.s6;
    box('box6', [{ k: 'Right now', v: s.tldr },
      { k: 'How to read it', v: '**Strongest** = the very strongest calm-day trends (ours). **Overbought** = an up-trend while the crowd is very excited: the author trims, he doesn’t flee. **Arising** = today’s trend is clearly up but the calm-day trend is not yet: unconfirmed. **Bounce in a down-trend** = a down-trend on a greedy day: don’t chase, and it is not a short.' }]);
    var wrap = clear($('cards4'));
    s.cards.forEach(function (c, k) {
      var id = 'lc' + k, p = h('div', 'panel');
      add(p, add(h('div', 'lc-h'), add(h('h3', 'sh sh-in', c.title + ' '), h('span', 'q', '· ' + c.sub))));
      var tw = h('div', 'tbl-wrap'), tb = h('table', 'rt rt-sm'); tb.id = id; tw.appendChild(tb); p.appendChild(tw);
      if (c.more) p.appendChild(h('p', 'small', c.more));
      p.appendChild(h('p', 'small', c.spnote));
      wrap.appendChild(p);
      listTable(id, ['tk'].concat(c.cols.map(function (x) { return LCOLS[x]; })), c.rows);
    });
    $('listsNote').textContent = s.note + ' Each card shows the top 10.';
  }


  function drawMap() {
    var holder = clear($('map')), pts = D.s7.map;
    var size = 290, x0 = 50, y0 = 28, W = x0 + size + 16, H = y0 + size + 46;
    var X = function (v) { return x0 + (v + 1) / 2 * size; }, Y = function (v) { return y0 + (1 - v) / 2 * size; };
    var svg = s_('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'The author’s map: calm-day trend across, mood up, with six of our names' }, holder);
    var b0 = LN.tr[0], b1 = LN.tr[1], ti = LN.ti;
    s_('rect', { x: X(-1), y: Y(1), width: X(b0) - X(-1), height: size, fill: C.down, 'fill-opacity': 0.12 }, svg);
    s_('rect', { x: X(b0), y: Y(1), width: X(b1) - X(b0), height: size, fill: C.muted, 'fill-opacity': 0.08 }, svg);
    s_('rect', { x: X(b1), y: Y(1), width: X(1) - X(b1), height: size, fill: C.up, 'fill-opacity': 0.12 }, svg);
    s_('rect', { x: X(-1), y: Y(1), width: size, height: size, fill: 'none', stroke: '#4A4F5C', 'stroke-width': 1.2 }, svg);
    s_('line', { x1: X(-1), x2: X(1), y1: Y(0), y2: Y(0), stroke: '#4A4F5C', 'stroke-width': 1 }, svg);
    s_('line', { x1: X(0), x2: X(0), y1: Y(-1), y2: Y(1), stroke: '#3A3F4B', 'stroke-width': 1 }, svg);
    LN.mo.forEach(function (m) { s_('line', { x1: X(-1), x2: X(1), y1: Y(m), y2: Y(m), stroke: '#5A5F6B', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg); });

    s_('line', { x1: X(Math.max(-1, ti - 1)), y1: Y(Math.max(-1, -ti)), x2: X(1), y2: Y(1 - ti), stroke: C.up, 'stroke-width': 1.8 }, svg);
    s_('line', { x1: X(-1), y1: Y(ti - 1), x2: X(Math.min(1, 1 - ti)), y2: Y(Math.min(1, ti)), stroke: C.down, 'stroke-opacity': 0.55, 'stroke-width': 1.2 }, svg);
    function t(x, y, s, col, a) { var o = { fill: col, 'font-size': 12 }; for (var k in a) o[k] = a[k]; return tx(svg, x, y, s, o); }
    t(X(-2 / 3), y0 - 9, 'DOWN', C.down, { 'font-weight': 700, 'text-anchor': 'middle' });
    t(X(0), y0 - 9, 'NO TREND', C.ink2, { 'font-weight': 700, 'text-anchor': 'middle' });
    t(X(2 / 3), y0 - 9, 'UP', C.up, { 'font-weight': 700, 'text-anchor': 'middle' });
    t(X(0.96), Y(-0.93), 'good timing', C.up, { 'font-weight': 700, 'text-anchor': 'end' });
    t(X(-0.96), Y(0.9), 'bounce in a', C.down, { 'font-weight': 700 });
    t(X(-0.96), Y(0.9) + 14, 'down-trend', C.down, { 'font-weight': 700 });
    t(X(-0.97), Y(LN.mo[1]) - 4, 'greedy', C.greedy);
    t(X(-0.97), Y(LN.mo[0]) + 14, 'scared', C.scared);
    [[-1, '−1'], [0, '0'], [1, '+1']].forEach(function (p) {
      s_('line', { x1: X(p[0]), x2: X(p[0]), y1: Y(-1), y2: Y(-1) + 4, stroke: '#5A5F6B', 'stroke-width': 1 }, svg);
      t(X(p[0]), Y(-1) + 17, p[1], C.muted, { 'text-anchor': 'middle' });
    });
    [[1, '+1'], [0, '0'], [-1, '−1']].forEach(function (p) {
      s_('line', { x1: X(-1) - 4, x2: X(-1), y1: Y(p[0]), y2: Y(p[0]), stroke: '#5A5F6B', 'stroke-width': 1 }, svg);
      t(X(-1) - 6, Y(p[0]) + 4, p[1], C.muted, { 'text-anchor': 'end' });
    });
    t(X(0), Y(-1) + 36, 'TREND on the last calm day →', C.muted, { 'text-anchor': 'middle' });
    var my = Y(0), mt = t(13, my, 'MOOD →', C.muted, { 'text-anchor': 'middle' }); mt.setAttribute('transform', 'rotate(-90 13 ' + my + ')');
    var placed = [];
    pts.forEach(function (p) {
      var xa = X(p.a), ya = Y(p.e);
      if (p.rope && p.c != null) {
        var rc = CLS_COL[p.rope] || C.ink2;
        s_('line', { x1: xa, x2: X(p.c), y1: ya, y2: ya, stroke: rc, 'stroke-width': 2.2 }, svg);
        s_('line', { x1: X(p.c), x2: X(p.c), y1: ya - 4.5, y2: ya + 4.5, stroke: rc, 'stroke-width': 2.2 }, svg);
      }
      s_('circle', { cx: xa, cy: ya, r: 4.5, fill: C.bg, stroke: CLS_COL[p.ring] || C.muted, 'stroke-width': 2 }, svg);

      var ly = ya - 9, lx = Math.max(X(-1) + 18, Math.min(X(1) - 18, xa));
      if (ly < Y(1) + 12 || placed.some(function (q) { return Math.abs(q[0] - lx) < 40 && Math.abs(q[1] - ly) < 13; })) ly = ya + 20;
      placed.push([lx, ly]);
      t(lx, ly, p.sym, C.white, { 'font-weight': 700, 'text-anchor': 'middle', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
    });
  }
  function render7() {
    var s = D.s7;
    drawMap();
    $('mapSub').textContent = '· ' + s.map_sub;
    $('mapNote').textContent = s.map_note;
    var key = clear($('ropeKey'));
    [[C.up, 'stronger / building up'], [C.ink2, 'weaker'], [C.down, 'deeper / building down'], [C.amber, 'gone, or a rope warning']].forEach(function (k) {
      var sp = h('span', 'ki'), svg = s_('svg', { width: 26, height: 10, viewBox: '0 0 26 10', 'aria-hidden': 'true' });
      s_('line', { x1: 2, y1: 5, x2: 24, y2: 5, stroke: k[0], 'stroke-width': 2.2 }, svg);
      s_('line', { x1: 24, y1: 1, x2: 24, y2: 9, stroke: k[0], 'stroke-width': 2.2 }, svg);
      add(sp, svg, k[1]); key.appendChild(sp);
    });
    var terms = clear($('terms'));
    s.terms.forEach(function (t) { add(terms, add(h('div', 'term'), add(h('div', 'tt c-' + t.cls, t.t + ' '), h('span', null, '· ' + t.sub)), h('p', null, t.text))); });
    var rt = clear($('rules')), tb = h('tbody');
    add(rt, add(h('thead'), add(h('tr'), h('th', 'l', 'Rung'), h('th', 'l', 'Means'), h('th', 'l', 'Whose'))));
    s.rules.forEach(function (r) { add(tb, add(h('tr'), add(h('td'), rchip(r.rung, r.chip)), h('td', 'l', r.means), h('td', 'l muted', r.who))); });
    rt.appendChild(tb);
    var y = clear($('yard7'));
    s.yard.forEach(function (l) { y.appendChild(md(h('p', 'y7'), l)); });
    add(clear($('dataLine')), h('b', null, 'Data. '), s.data);
  }


  function validate(d) {
    if (!d || d.schema !== 2 || d.kind !== 'tet_radar') return false;
    var l = d.ln;
    if (!l || !Array.isArray(l.tr) || l.tr.length !== 2 || !Array.isArray(l.mo) || l.mo.length !== 2 || typeof l.ti !== 'number') return false;
    if (!['s1', 's2', 's3', 's4', 's5', 's6', 's7'].every(function (k) { return d[k]; })) return false;
    var b = d.s2, n = b.dates && b.dates.length;
    return n > 50 && [b.up, b.down, b.gt, b.mood, b.spy].every(function (a) { return Array.isArray(a) && a.length === n; }) &&
      typeof b.spy_rung === 'string' && b.spy_rung.length === n && d.s1.dials && d.s1.dials.length === 3;
  }
  function status() {
    var chip = $('chip'), p = D.asof.split('-'), age = (Date.now() - Date.UTC(+p[0], +p[1] - 1, +p[2])) / 864e5;
    var late = age > LATE_DAYS;
    chip.className = 'chip ' + (late ? 'chip-late' : 'chip-closed'); chip.textContent = late ? 'LATE' : 'DAILY';
    $('asof').textContent = 'TET Radar · ' + D.asof_label + ' close · week since ' + dshort(D.week_ago) + ' · built ' + D.built;
    $('statusLine').textContent = D.status + (late ? ' · the newest close is missing: this is the last one we have' : '');
  }
  function fail(msg) {
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'NO DATA';
    $('asof').textContent = msg;
  }

  var tabs = document.querySelector('nav.tabs'), cur = tabs && tabs.querySelector('[aria-current]');
  if (cur && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = cur.offsetLeft - (tabs.clientWidth - cur.offsetWidth) / 2;
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-br]');
    if (!b) return;
    range = b.getAttribute('data-br');
    try { localStorage.setItem('radarRange', range); } catch (e) { }
    hoverI = null; renderRange(); draw2();
  });
  var chart = $('chart2');
  chart.addEventListener('pointermove', pickAt);
  chart.addEventListener('pointerdown', pickAt);
  chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });

  var rt = null, lastW = -1;
  function onSize() { var cw = chart.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(draw2, 80); }
  if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart); else window.addEventListener('resize', onSize);

  fetch(URL_, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (d) {
    if (!validate(d)) throw new Error('bad data');
    D = d; LN = d.ln;
    status();
    document.documentElement.setAttribute('data-radar-asof', D.asof);
    $('content').hidden = false;
    var steps = [render1, render2, render3, render4, render5, render6, render7], errs = [];
    steps.forEach(function (f) { try { f(); } catch (e) { errs.push(f.name + ': ' + e.message); if (window.console) console.error(e); } });
    draw2();
    if (errs.length) add($('banners'), add(h('p', 'banner banner-warn'), h('b', null, 'Part of the radar could not be drawn.'), errs.join(' · ')));
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }).catch(function (e) {
    fail('The radar data could not be loaded (' + e.message + ').');
  });
})();
