


(function () {
  'use strict';
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    fear: '#7E57C2', light: '#B39DDB', yel: '#FFD84D', up: '#26A69A', down: '#EF5350', blue: '#4FC3F7', orange: '#FFB74D', grey: '#A9ADBA' };
  var NS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MINUS = '−';
  var D = null;


  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function h(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function add(parent, cls, text) { return h('span', cls, text, parent); }
  function txt(parent, s) { parent.appendChild(document.createTextNode(s)); }
  function bold(parent, s) { return h('b', null, s, parent); }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function tx(g, x, y, s, a) { var t = el('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
  function textW(s, fs) { return String(s).length * fs * 0.56; }
  function ord(n) { var m = n % 100; return n + (m >= 11 && m <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); }
  function pctile(p) { return p < 1 ? '1-yr low' : ord(Math.round(p)) + ' pct'; }
  function pctile6(p) { return p < 1 ? '6-mo low' : ord(Math.round(p)) + ' pct'; }
  function sgn(x, d) { var s = Math.abs(x).toFixed(d == null ? 1 : d); return (x > 0 ? '+' : x < 0 ? MINUS : '') + s; }
  function P(x) { return Math.round(x * 100) + '%'; }
  function num(x, d) { return Number(x).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function dd(iso) { return new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))); }
  function fd(iso, dow) { var d = dd(iso); return (dow ? DOW[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function chg(v) { return v === 0 ? 'unchanged' : sgn(v, 0); }
  function niceStep(span, px, minPx) {
    var steps = [0.01, 0.02, 0.025, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
    for (var k = 0; k < steps.length; k++) if (steps[k] / span * px >= minPx) return steps[k];
    return steps[steps.length - 1];
  }
  function stateClass(s) {
    s = String(s).toUpperCase();
    if (s === 'NARROW' || s === 'TIGHTENING' || s === 'RISK-OFF') return 's-bad';
    if (s === 'BROAD' || s === 'EASING' || s === 'RISK-ON') return 's-good';
    return 's-mid';
  }
  function asofLine(id, ok, words) {
    var n = $(id); clear(n);
    add(n, 'chip ' + (ok ? 'chip-closed' : 'chip-stale'), ok ? 'CLOSE' : 'STALE');
    add(n, '', words);
  }
  function svgFor(holder, W, H, label) {
    clear(holder);
    return el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': label }, holder);
  }
  function widthOf(holder) { return Math.max(280, Math.round(holder.clientWidth || 340)); }

  function hover(holder, getGeo, fn) {
    function pick(ev) {
      var g = getGeo(), svg = holder.querySelector('svg');
      if (!g || !svg) return;
      var r = holder.getBoundingClientRect(), x = (ev.clientX - r.left) * (svg.viewBox.baseVal.width / r.width);
      var i = Math.round((x - g.L) / g.pw * (g.n - 1));
      fn(Math.max(0, Math.min(g.n - 1, i)));
    }
    holder.addEventListener('pointermove', pick);
    holder.addEventListener('pointerdown', pick);
    holder.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') fn(null); });
  }
  function legendItem(lg, swCls, swStyle, words) {
    var s = add(lg, 'lg-i', ''); var sw = add(s, swCls, ''); if (swStyle) sw.setAttribute('style', swStyle); txt(s, words);
  }
  function monthTicks(dates, X, every) {
    var out = [], prev = null;
    for (var i = 0; i < dates.length; i++) {
      var d = dd(dates[i]), mk = d.getUTCFullYear() * 12 + d.getUTCMonth();
      if (prev !== null && mk !== prev && mk % (every || 1) === 0) out.push({ i: i, s: d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()] });
      prev = mk;
    }
    return out;
  }

  function validate(d) {
    if (!d || d.schema !== 2 || d.kind !== 'market-board' || !d.ln) return false;
    var b = d.breadth, l = d.liquidity, r = d.regime, w = d.weather, f = d.forecast;
    return !!(b && Array.isArray(b.comps) && b.comps.length === 5 && Array.isArray(b.hist) && b.hist.length > 10 &&
      l && l.series && Array.isArray(l.series.d) && l.series.d.length > 10 && ['comp', 'nl', 'hy', 'usd'].every(function (k) { return l.series[k].length === l.series.d.length; }) &&
      (r === null || (r && Array.isArray(r.panels) && r.panels.length === 3 && r.panels.every(function (p) { return p.r.length === p.w.length && p.m.length === p.w.length && p.cells.length === 5; }))) &&
      w && w.spy && w.qqq && w.storm && f && f.ranges && f.ranges['20'] && Array.isArray(f.higher));
  }


  var ETF = (function () {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { return null; }
  })();
  function etStamp(b) {
    if (!ETF) return MON[b.getUTCMonth()] + ' ' + b.getUTCDate() + ', ' + String(b.getUTCHours()).padStart(2, '0') + ':' + String(b.getUTCMinutes()).padStart(2, '0') + ' UTC';
    var o = {};
    ETF.formatToParts(b).forEach(function (p) { o[p.type] = p.value; });
    return o.month + ' ' + o.day + ', ' + o.hour + ':' + o.minute + ' ET';
  }
  function renderStatus() {
    var chip = $('chip'), b = new Date(D.built_utc), age = (Date.now() - dd(D.session).getTime()) / 864e5;
    var old = age > 5, when = isNaN(b) ? '' : etStamp(b);
    chip.className = 'chip ' + (old ? 'chip-stale' : 'chip-closed');
    chip.textContent = old ? 'OLD DATA' : 'CLOSE';
    chip.title = 'Rebuilt after each US close.';
    $('asof').textContent = 'After the close of ' + fd(D.session, true) + (when ? ' · updated ' + when : '');
    var NAMES = { breadth: 'breadth', liquidity: 'liquidity', regime: 'cross-asset', weather: 'risk weather' };
    var stale = ['breadth', 'liquidity', 'regime', 'weather'].filter(function (k) { return D[k] && !D[k].fresh; }).map(function (k) { return NAMES[k]; });
    if (D.forecast.stale) stale.push('SPY chances');
    $('statusLine').textContent = stale.length ? 'Behind: ' + stale.join(', ') + '. Those parts show older numbers.' :
      'All parts are from the same close. The board is rebuilt after each US close.';
    var fb = $('footBuilt');
    if (fb) fb.textContent = 'Rebuilt after each US close' + (when ? ' (last rebuilt ' + when + ').' : '.');
  }
  function renderTiles() {
    var t = $('tiles'); clear(t);
    function tile(href, k, v, of, st, s) {
      var a = h('a', null, null, t); a.href = href;
      add(a, 'k', k);
      var vv = add(a, 'v', v); if (of) add(vv, 'of', of);
      if (st) add(a, 'st ' + stateClass(st), st.toUpperCase());
      add(a, 's', s);
    }
    var b = D.breadth, l = D.liquidity, r = D.regime, w = D.weather, f = D.forecast;
    var up20 = f.higher.filter(function (x) { return x.h === 20; })[0];
    tile('#breadth', 'Breadth', String(b.score), '/10', b.state, 'how many stocks join in');
    tile('#liquidity', 'Liquidity', String(l.score), '/10', l.state, 'easier or tighter money');
    if (r) tile('#regime', 'Cross-asset', r.comp + '%', '', r.state === 'MIXED' ? 'Mixed' : r.state, 'stocks vs gold, commodities, dollar');
    tile('#weather', 'Risk weather', '±' + w.spy.m1.toFixed(1) + '%', '', null, 'SPY usual month move · VIX ' + w.vix.toFixed(1));
    tile('#spy', 'SPY chances', up20 ? P(up20.p) : '–', '', null, 'higher in 1 month (normal)');

    Array.prototype.forEach.call(t.querySelectorAll('.st'), function (n) {
      n.style.color = n.classList.contains('s-bad') ? '#F49A98' : n.classList.contains('s-good') ? '#7FD8CF' : C.text;
    });
  }

  function scoreRow(id, big, of, state, deltaParts) {
    var n = $(id); clear(n);
    var b = add(n, 'big', big); add(b, 'of', of);
    add(n, 'state ' + stateClass(state), String(state).toUpperCase());
    var d = add(n, 'delta', '');
    deltaParts.forEach(function (p, k) { if (k) h('br', null, null, d); bold(d, p[0]); txt(d, ' ' + p[1]); });
  }
  function pbar(parent, pct, pctAgo) {
    var b = add(parent, 'pbar', '');
    add(b, 'tr', '');
    var f = add(b, 'fi', ''); f.style.width = Math.max(1.5, Math.min(100, pct)) + '%';
    [33.33, 66.67].forEach(function (q) { var k = add(b, 'tk', ''); k.style.left = q + '%'; });
    if (pctAgo != null) { var a = add(b, 'ago', ''); a.style.left = Math.max(2, Math.min(98, pctAgo)) + '%'; }
    var dt = add(b, 'dt', ''); dt.style.left = Math.max(2, Math.min(98, pct)) + '%';
    b.setAttribute('aria-hidden', 'true');
    return b;
  }


  var BMEAN = {
    pct_above_20d: 'stocks above their 20-day average',
    net_new_highs_10d: 'stocks at 1-year highs minus 1-year lows, 10-day average',
    rsp_vs_spy_5d: 'the average stock vs SPY, last 5 days',
    iwm_vs_spy_20d: 'small companies vs SPY, last 20 days',
    qqqe_vs_qqq_5d: 'the average Nasdaq-100 stock vs QQQ, last 5 days'
  };
  var BPHRASE = { pct_above_20d: 'stocks above their 20-day average', net_new_highs_10d: 'new highs minus new lows',
    rsp_vs_spy_5d: 'the average stock vs SPY', iwm_vs_spy_20d: 'small caps vs SPY', qqqe_vs_qqq_5d: 'the average Nasdaq-100 stock vs QQQ' };
  function bval(c) {
    if (c.unit === '%') return c.v.toFixed(1) + '%';
    if (c.unit === 'pp') return sgn(c.v, 2) + ' pts';
    return sgn(c.v, 1);
  }
  function renderBreadth() {
    var b = D.breadth;
    scoreRow('bScore', String(b.score), '/10', b.state, [[chg(b.score - b.prev), 'vs the day before'], [chg(b.score - b.prev5), 'vs 5 sessions ago (' + fd(b.prev5_date) + ')']]);
    asofLine('bAsof', b.fresh, fd(b.asof, true) + ' close · ' + b.n + ' S&P 500 stocks');
    var g = $('bGauges'); clear(g);
    b.comps.forEach(function (c) {
      var row = h('div', 'gr', null, g); row.setAttribute('role', 'listitem');
      var n = add(row, 'gn', c.name); h('small', null, BMEAN[c.id] || '', n);
      var v = add(row, 'gv', bval(c));
      pbar(row, c.pct, c.pct5);
      var p = add(row, 'gp', pctile(c.pct)); h('small', null, 'of its last year', p);
      var s = add(row, 'gs', String(c.pts)); h('small', null, '/2', s);
      row.setAttribute('aria-label', c.name + ': ' + bval(c) + ', ' + pctile(c.pct) + ' of its last year, ' + c.pts + ' of 2 points');
      v.title = 'last year: low ' + c.lo + ', middle ' + c.med + ', high ' + c.hi;
    });
    var ctx = $('bCtx'); clear(ctx);
    txt(ctx, 'Not scored, for context: ');
    var CT = { pct_above_50d: 'above 50-day', pct_above_200d: 'above 200-day' };
    b.ctx.forEach(function (c, k) { if (k) txt(ctx, ' · '); txt(ctx, (CT[c.id] || c.id) + ' '); bold(ctx, c.v.toFixed(1) + '%'); txt(ctx, ' (' + pctile(c.pct) + ')'); });
    var lg = $('bLg'); clear(lg);
    legendItem(lg, 'lg-ln', 'border-color:' + C.light, 'breadth score (0–10), one step per session');
    legendItem(lg, 'lg-sw', 'background:rgba(38,166,154,.22)', 'broad');
    legendItem(lg, 'lg-sw', 'background:rgba(239,83,80,.18)', 'narrow');
    legendItem(lg, 'lg-sw', 'background:#fff;width:9px;height:9px;border-radius:50%', 'gauges: today');
    legendItem(lg, 'lg-sw', 'background:transparent;border:1.5px solid ' + C.muted + ';width:8px;height:8px;border-radius:50%', '5 sessions ago');
    $('bHow').textContent = 'Five gauges of how many stocks are joining in. Each is ranked against its own last year and earns 0, 1 or 2 points: ' +
      'the higher it ranks, the more points. The five add up to a score out of 10: low = narrow (a few big stocks carry the index), middle = mixed, high = broad.';
    var low = b.comps.slice().sort(function (a, c) { return a.pct - c.pct; });
    var nBottom = b.comps.filter(function (c) { return c.pts === 0; }).length;
    var a20 = b.comps.filter(function (c) { return c.id === 'pct_above_20d'; })[0];
    var s = b.score + ' of 10 = ' + b.state.toLowerCase() + '. ' + nBottom + ' of 5 gauges score no points today. ';
    if (a20) s += a20.v.toFixed(0) + '% of stocks are above their 20-day average (' + pctile(a20.pct) + '). ';
    s += 'Weakest: ' + (BPHRASE[low[0].id] || low[0].name) + ' (' + bval(low[0]) + ', ' + pctile(low[0].pct) + ') and ' + (BPHRASE[low[1].id] || low[1].name) + ' (' + bval(low[1]) + ', ' + pctile(low[1].pct) + '). ';
    s += 'The score was ' + b.prev + ' the session before and ' + b.prev5 + ' five sessions ago.';
    if (b.score === 0) s += ' At 0 the score cannot fall further, so watch the gauges themselves.';
    $('bNow').textContent = s;
  }
  var bGeo = null, bHover = null;
  function drawBreadth() {
    var holder = $('bChart'), hs = D.breadth.hist, n = hs.length;
    var W = widthOf(holder), narrow = W < 640;
    var L = narrow ? 24 : 30, R = narrow ? 50 : 64, T = 8, ph = narrow ? 120 : 140, axH = 20, H = T + ph + axH, pw = W - L - R;
    var svg = svgFor(holder, W, H, 'Breadth score, last ' + n + ' sessions');
    var X = function (i) { return L + i / (n - 1) * pw; }, Y = function (v) { return T + ph - v / 10 * ph; };
    var fs = narrow ? 10.5 : 11.5;
    el('rect', { x: L, y: T, width: pw, height: ph, fill: C.panel, rx: 3 }, svg);
    var bb = D.ln.b;
    el('rect', { x: L, y: Y(10), width: pw, height: Y(bb[1]) - Y(10), fill: 'rgba(38,166,154,.10)' }, svg);
    el('rect', { x: L, y: Y(bb[0]), width: pw, height: Y(0) - Y(bb[0]), fill: 'rgba(239,83,80,.09)' }, svg);
    [0, 5, 10].forEach(function (v) {
      if (v > 0 && v < 10) el('line', { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: C.line }, svg);
      tx(svg, L - 5, Y(v) + 3.5, String(v), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    });
    tx(svg, L + pw + 6, Y((bb[1] + 10) / 2) + 4, 'broad', { fill: '#7FD8CF', 'font-size': fs });
    tx(svg, L + pw + 6, Y((bb[0] + bb[1]) / 2) + 4, 'mixed', { fill: C.muted, 'font-size': fs });
    tx(svg, L + pw + 6, Y(bb[0] / 2) + 4, 'narrow', { fill: '#F49A98', 'font-size': fs });
    monthTicks(hs.map(function (x) { return x[0]; })).forEach(function (t) {
      el('line', { x1: X(t.i), x2: X(t.i), y1: T, y2: T + ph, stroke: C.line }, svg);
      tx(svg, X(t.i), H - 5, t.s, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
    });
    var d = '';
    for (var i = 0; i < n; i++) d += (i ? 'H' + X(i).toFixed(1) + 'V' : 'M' + X(0).toFixed(1) + ' ') + Y(hs[i][1]).toFixed(1);
    el('path', { d: d, fill: 'none', stroke: C.light, 'stroke-width': narrow ? 2 : 2.3, 'stroke-linejoin': 'round' }, svg);
    var lx = X(n - 1), ly = Y(hs[n - 1][1]);
    el('circle', { cx: lx, cy: ly, r: 7.5, fill: C.light, 'fill-opacity': 0.3 }, svg);
    el('circle', { cx: lx, cy: ly, r: 4.5, fill: '#F3EEFF', stroke: C.white, 'stroke-width': 1.5 }, svg);
    var recent = Math.max.apply(null, hs.slice(-8).map(function (x) { return x[1]; }));
    tx(svg, lx - 4, Math.max(T + 12, Y(recent) - 8), 'now ' + hs[n - 1][1], { fill: C.white, 'font-size': fs + 0.5, 'font-weight': 700, 'text-anchor': 'end', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
    bGeo = { L: L, pw: pw, n: n, X: X, Y: Y, T: T, ph: ph, g: el('g', {}, svg) };
    setBHover(bHover);
  }
  function setBHover(i) {
    if (!bGeo) return;
    bHover = i; clear(bGeo.g);
    var hs = D.breadth.hist, j = i == null ? hs.length - 1 : i, v = hs[j][1];
    if (i != null) {
      el('line', { x1: bGeo.X(i), x2: bGeo.X(i), y1: bGeo.T, y2: bGeo.T + bGeo.ph, stroke: C.muted, 'stroke-dasharray': '2 2' }, bGeo.g);
      el('circle', { cx: bGeo.X(i), cy: bGeo.Y(v), r: 4, fill: C.light, stroke: C.white, 'stroke-width': 1.1 }, bGeo.g);
    }
    var ro = $('bRo'); clear(ro);
    add(ro, 'd', fd(hs[j][0], true)); add(ro, 'sep', ' · '); add(ro, 'p', 'score ' + v + '/10'); add(ro, 'sep', ' · ');
    add(ro, '', v < D.ln.b[0] ? 'narrow' : v < D.ln.b[1] ? 'mixed' : 'broad');
    if (i == null) add(ro, 'muted', ' · tap or hover the chart for any day');
  }


  var LS = [
    { k: 'comp', name: 'Composite', col: C.light, w: 2.6, cls: 'c1' },
    { k: 'nl', name: 'Net liquidity', col: C.blue, w: 1.5, cls: 'c2' },
    { k: 'hy', name: 'HY spread (turned)', col: C.orange, w: 1.5, cls: 'c3' },
    { k: 'usd', name: 'Dollar (turned)', col: C.grey, w: 1.5, cls: 'c4', dash: '5 3' }
  ];
  function renderLiquidity() {
    var l = D.liquidity;
    scoreRow('lScore', String(l.score), '/10', l.state, [[sgn(l.score - l.wk_score, 0).replace(/^0$/, 'unchanged'), 'vs a week ago'], ['composite ' + Math.round(l.comp), '(was ' + Math.round(l.wk_comp) + ')']]);
    asofLine('lAsof', l.fresh, 'Dated ' + fd(l.asof, true) + ' · net liquidity and the spread carry their ' + fd(l.nl.date) + ' print, the dollar its ' + fd(l.usd.date) + ' reading (normal publication lags)');
    var g = $('lGauges'); clear(g);
    function row(name, meaning, v, vsmall, pct, pctWk) {
      var r = h('div', 'gr', null, g); r.setAttribute('role', 'listitem');
      var n = add(r, 'gn', name); h('small', null, meaning, n);
      var vv = add(r, 'gv', v); if (vsmall) h('small', null, vsmall, vv);
      pbar(r, pct, null);
      var p = add(r, 'gp', pctile6(pct)); h('small', null, 'of 6 months', p);
      var s = add(r, 'gs', sgn(Math.round(pct - pctWk), 0).replace(/^0$/, '0')); h('small', null, ' wk', s);
      r.setAttribute('aria-label', name + ': ' + v + ', ' + pctile6(pct) + ' of its last 6 months, ' + sgn(Math.round(pct - pctWk), 0) + ' in a week');
    }
    row('Fed net liquidity', 'Fed balance sheet − Treasury cash − reverse repo · higher = easier', '$' + num(l.nl.v) + 'bn', fd(l.nl.date), l.nl.pct, l.nl.pct_wk);
    row('High-yield credit spread', 'extra yield on junk bonds · lower = easier (bar turned around) · rank only', 'rank only', fd(l.hy.date), l.hy.pct, l.hy.pct_wk);
    row('US dollar', 'the Fed’s broad dollar index · weaker = easier (bar turned around) · rank only', 'rank only', fd(l.usd.date), l.usd.pct, l.usd.pct_wk);
    var lg = $('lLg'); clear(lg);
    LS.forEach(function (s) { legendItem(lg, s.dash ? 'lg-dash' : 'lg-ln', 'border-color:' + s.col + (s.k === 'comp' ? ';border-top-width:3px' : ''), s.name); });
    legendItem(lg, 'lg-dash', 'border-color:' + C.muted, 'tightening / easing lines');
    $('lHow').textContent = 'Three money gauges, each ranked 0–100 against its own last 6 months and turned so higher = easier money. ' +
      'The composite is their average and the score is the composite out of 10: low = tightening, middle = neutral, high = easing (the dashed lines). ' +
      'Gauge column: where it ranks now, and how many points it moved in a week.';
    function side(p) { return p < 20 ? 'near the tight end of its 6 months' : p < 40 ? 'on the tight side' : p < 60 ? 'mid-pack' : p < 80 ? 'on the easy side' : 'near the easy end of its 6 months'; }
    var c1 = l.nl.chg_1w || {}, s = l.score + ' of 10 = ' + l.state.toLowerCase() + ', ' + (l.score > l.wk_score ? 'up from ' : l.score < l.wk_score ? 'down from ' : 'same as ') + l.wk_score + ' a week ago. ';
    s += 'Net liquidity is ' + side(l.nl.pct) + ' (' + pctile6(l.nl.pct) + '), the credit spread ' + side(l.hy.pct) + ' (' + pctile6(l.hy.pct) + ') and the dollar ' + side(l.usd.pct) + ' (' + pctile6(l.usd.pct) + ').';
    if (c1.nl != null) s += ' It ' + (c1.nl < 0 ? 'fell $' : 'rose $') + Math.abs(c1.nl).toFixed(1) + 'bn in the week to ' + fd(l.nl.chg_1w_dates[1]) +
      (c1.tga != null && Math.abs(c1.tga) > Math.abs(c1.fed || 0) ? ', mostly because the Treasury’s cash account ' + (c1.tga > 0 ? 'grew $' : 'shrank $') + Math.abs(c1.tga).toFixed(1) + 'bn' : '') + '.';
    $('lNow').textContent = s;
  }
  var lGeo = null, lHover = null;
  function drawLiquidity() {
    var holder = $('lChart'), S = D.liquidity.series, n = S.d.length;
    var W = widthOf(holder), narrow = W < 640;
    var L = narrow ? 26 : 32, R = narrow ? 30 : 128, T = 8, ph = narrow ? 170 : 220, axH = 20, H = T + ph + axH, pw = W - L - R;
    var svg = svgFor(holder, W, H, 'Liquidity percentiles, last ' + n + ' sessions');
    var X = function (i) { return L + i / (n - 1) * pw; }, Y = function (v) { return T + ph - v / 100 * ph; };
    var fs = narrow ? 10.5 : 11.5;
    el('rect', { x: L, y: T, width: pw, height: ph, fill: C.panel, rx: 3 }, svg);
    [0, 25, 50, 75, 100].forEach(function (v) {
      if (v > 0 && v < 100) el('line', { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: C.line }, svg);
      tx(svg, L - 5, Y(v) + 3.5, String(v), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    });
    D.ln.l.forEach(function (v) { el('line', { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: C.muted, 'stroke-dasharray': '4 4', 'stroke-opacity': 0.7 }, svg); });
    monthTicks(S.d).forEach(function (t) {
      el('line', { x1: X(t.i), x2: X(t.i), y1: T, y2: T + ph, stroke: C.line }, svg);
      tx(svg, X(t.i), H - 5, t.s, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
    });
    var labs = [];
    LS.slice().reverse().forEach(function (s) {
      var d = '', a = S[s.k], last = null;
      for (var i = 0; i < n; i++) { if (a[i] == null) continue; d += (last == null ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(a[i]).toFixed(1); last = i; }
      el('path', { d: d, fill: 'none', stroke: s.col, 'stroke-width': narrow ? s.w * 0.9 : s.w, 'stroke-linejoin': 'round', 'stroke-dasharray': s.dash || null }, svg);
      if (last != null) labs.push({ y: Y(a[last]), v: a[last], s: s });
    });
    labs.sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < labs.length; k++) labs[k].y = Math.max(labs[k].y, labs[k - 1].y + (narrow ? 12 : 15));
    var over = labs.length ? labs[labs.length - 1].y - (T + ph - 2) : 0;
    if (over > 0) labs.forEach(function (o) { o.y -= over; });
    labs.forEach(function (o) {
      var t = tx(svg, L + pw + 6, o.y + 4, '', { 'font-size': narrow ? 10.5 : 11.5, fill: C.text });
      if (!narrow) { var a = el('tspan', { fill: o.s.col }, t); a.textContent = '● '; var b = el('tspan', {}, t); b.textContent = o.s.name + ' '; }
      var c = el('tspan', { fill: narrow ? o.s.col : C.white, 'font-weight': 700 }, t); c.textContent = Math.round(o.v);
    });
    lGeo = { L: L, pw: pw, n: n, X: X, Y: Y, T: T, ph: ph, g: el('g', {}, svg) };
    setLHover(lHover);
  }
  function setLHover(i) {
    if (!lGeo) return;
    lHover = i; clear(lGeo.g);
    var S = D.liquidity.series, j = i == null ? S.d.length - 1 : i;
    if (i != null) {
      el('line', { x1: lGeo.X(i), x2: lGeo.X(i), y1: lGeo.T, y2: lGeo.T + lGeo.ph, stroke: C.muted, 'stroke-dasharray': '2 2' }, lGeo.g);
      LS.forEach(function (s) { var v = S[s.k][i]; if (v != null) el('circle', { cx: lGeo.X(i), cy: lGeo.Y(v), r: s.k === 'comp' ? 4 : 3, fill: s.col, stroke: C.bg, 'stroke-width': 1 }, lGeo.g); });
    }
    var ro = $('lRo'); clear(ro);
    function part(cls, words) { var r = add(ro, 'rs', ''); add(r, cls, words); return r; }
    add(ro, 'd', fd(S.d[j], true)); add(ro, 'sep', ' · ');
    part('c1', 'composite ' + (S.comp[j] == null ? '–' : Math.round(S.comp[j]))); add(ro, 'sep', ' · ');
    var a = part('c2', 'net liquidity ' + Math.round(S.nl[j])); if (S.nl_bn[j] != null) txt(a, ' ($' + num(S.nl_bn[j]) + 'bn)'); add(ro, 'sep', ' · ');
    part('c3', 'HY ' + (S.hy[j] == null ? '–' : Math.round(S.hy[j]))); add(ro, 'sep', ' · ');
    part('c4', 'dollar ' + (S.usd[j] == null ? '–' : Math.round(S.usd[j])));
    if (S.carried[j] && S.carried[j].length) add(ro, 'muted', ' · ' + S.carried[j].map(function (k) { return k === 'nl' ? 'net liquidity' : k === 'hy' ? 'HY' : 'dollar'; }).join(' + ') + ' = earlier reading');
    if (i == null) add(ro, 'muted', ' · tap or hover for any day');
  }


  var CELL = { 'GC now': 'gc', 'Break out': 'bo', 'DC now': 'dc', 'Break down': 'bd', 'Convergence ↑': 'cu', 'Convergence ↓': 'cd' };
  var PAIRWORD = { gold: 'gold', comm: 'commodities', usd: 'the dollar' };
  var TFW = { '4H': '4-hour', '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' };
  function renderRegime() {
    var r = D.regime;
    $('regime').hidden = !r;
    if (!r) return;
    var off = D.ln.x[0], on = D.ln.x[1];
    var g = $('rGauge'); clear(g);
    var b = add(g, 'big', r.comp + '%');
    b.style.color = r.state === 'RISK-ON' ? C.up : r.state === 'RISK-OFF' ? C.down : C.light;
    add(g, 'state ' + stateClass(r.state), r.state);
    var bar = add(g, 'rgb', ''); bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', 'Risk-on share ' + r.comp + '% on a 0 to 100 scale');
    var z0 = add(bar, 'z z0', ''); z0.style.width = off + '%';
    var z1 = add(bar, 'z z1', ''); z1.style.left = off + '%'; z1.style.width = (on - off) + '%';
    var z2 = add(bar, 'z z2', ''); z2.style.width = (100 - on) + '%';
    var m = add(bar, 'm', ''); m.style.left = r.comp + '%';
    add(bar, 'lab l0', 'risk-off');
    var lm = add(bar, 'lab', 'mixed'); lm.style.left = (off + on) / 2 + '%';
    add(bar, 'lab l2', 'risk-on');
    asofLine('rAsof', r.fresh, 'Week ' + (r.week || '').replace(/^\d{4}-W/, '') + ' so far · through the ' + fd(r.asof, true) + ' close · weekly lines, 5 candle sizes for KDJ (the newest week, 2-week and month are still forming) · ETF closes without dividends');
    var wrap = $('rPairs'); clear(wrap);
    r.panels.forEach(function (p, k) {
      var box = h('div', 'pair', null, wrap); box.id = 'pair-' + p.key;
      var hd = h('div', 'pair-h', null, box);
      h('h3', null, p.title, hd);
      var tc = add(hd, 'tchips', '');
      add(tc, 'tchip ' + (p.trend === 'RISK-ON' ? 'on' : 'off'), 'TREND ' + (p.trend === 'RISK-ON' ? 'ON' : 'OFF'));
      add(tc, 'tchip', 'KDJ ' + p.kbull + '/' + p.kavail);
      h('p', 'pair-sub', p.pair.replace(' / ', ' ÷ ') + ' · weekly closes and their trend average', box);
      h('div', 'pair-ro', null, box).id = 'pro-' + k;
      var ch = h('div', 'chart', null, box); ch.id = 'pch-' + k; ch.setAttribute('role', 'img');
      ch.setAttribute('aria-label', p.title + ' ratio, weekly, with its average and the most-traded level');
      var cells = h('div', 'cells', null, box);
      p.cells.forEach(function (c) {
        var cl = CELL[c.setup] || '';
        var d = h('div', 'cell ' + cl + (c.stale ? ' na' : ''), null, cells);
        h('div', 'ct', c.tf, d);
        h('div', 'cs', c.stale ? 'n/a' : String(c.setup || '—').replace('Convergence', 'Conv'), d);
        h('div', 'ck', c.K == null ? 'no data' : 'K ' + Math.round(c.K) + ' · ' + (c.cross || '') + ' ' + (c.age != null ? c.age : ''), d);
        d.title = (TFW[c.tf] || c.tf) + ' candles: ' + (c.setup || 'no setup') + (c.K != null ? ' · K ' + c.K.toFixed(1) : '') +
          (c.cross ? ' · last ' + (c.cross === 'GC' ? 'golden' : 'death') + ' cross ' + c.age + ' candles ago' : '') + (c.dev ? ' · candle still forming' : '');
      });
      hover(ch, function () { return pGeo[k]; }, function (i) { setPHover(k, i); });
    });
    var lg = $('rLg'); clear(lg);
    legendItem(lg, 'lg-ln', 'border-color:' + C.text, 'ratio (weekly close)');
    legendItem(lg, 'lg-ln', 'border-color:' + C.light, 'its average (the trend line)');
    legendItem(lg, 'lg-dash', 'border-color:' + C.orange, 'POC = most-traded level');
    legendItem(lg, 'lg-sw', 'background:rgba(138,142,153,.35)', 'volume at each level');
    legendItem(lg, 'lg-sw', 'background:rgba(38,166,154,.4)', 'bullish KDJ setup');
    legendItem(lg, 'lg-sw', 'background:rgba(239,83,80,.4)', 'bearish');
    $('rHow').textContent = 'Three ratios: the Nasdaq-100 against gold (QQQ ÷ GLD) and against commodities (QQQ ÷ DBC), and the S&P 500 against the dollar (SPY ÷ UUP). ' +
      'A rising line = stocks leading = risk-on. Each ratio is read two ways: is it above its trend average, and how many of its five candle sizes (4-hour to monthly) show a bullish KDJ setup. ' +
      'The percentage is the share of bullish readings across the three: high = risk-on, low = risk-off, in between = mixed. ' +
      'Cells: GC/DC = golden/death cross of the KDJ lines, the number = how many candles ago; K = the KDJ’s fast line (0–100).';
    var parts = r.panels.map(function (p) {
      var lead = p.dev >= 0;
      return (lead ? 'lead ' : 'lag ') + PAIRWORD[p.key] + ' (' + Math.abs(p.dev).toFixed(1) + '% ' + (lead ? 'above' : 'below') + ' the average, KDJ ' + p.kbull + ' of ' + p.kavail + ' bullish)';
    });
    var near = r.state === 'MIXED' ? (on - r.comp <= 3 ? ', just short of risk-on' : r.comp - off <= 3 ? ', just above risk-off' : '') : '';
    $('rNow').textContent = r.comp + '% = ' + r.state.toLowerCase() + near + '. Stocks ' + parts.join('; ') + '.';
  }
  var pGeo = [], pHover = [null, null, null];
  function drawRegime() {
    if (!D.regime) return;
    D.regime.panels.forEach(function (p, k) {
      var holder = $('pch-' + k); if (!holder) return;
      var W = widthOf(holder), narrow = W < 420;
      var n = p.r.length, L = narrow ? 34 : 38, R = 6, T = 6, ph = narrow ? 150 : 165, axH = 18, H = T + ph + axH, pw = W - L - R;
      var svg = svgFor(holder, W, H, p.title + ' weekly ratio');
      var vals = p.r.concat(p.m).filter(function (v) { return v != null; }).concat([p.poc]);
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var llo = Math.log(lo), lhi = Math.log(hi), pad = (lhi - llo) * 0.07; llo -= pad; lhi += pad;
      var X = function (i) { return L + i / (n - 1) * pw; }, Y = function (v) { return T + ph - (Math.log(v) - llo) / (lhi - llo) * ph; };
      var fs = narrow ? 10 : 10.5;
      el('rect', { x: L, y: T, width: pw, height: ph, fill: '#171B26', rx: 3 }, svg);

      var st = niceStep(hi - lo, ph, 34);
      for (var v = Math.ceil(Math.exp(llo) / st) * st; v <= Math.exp(lhi); v += st) {
        var y = Y(v); if (y < T + 6 || y > T + ph - 4) continue;
        el('line', { x1: L, x2: L + pw, y1: y, y2: y, stroke: C.line }, svg);
        var dec = st >= 1 ? (st % 1 ? 1 : 0) : ((st * 10) % 1 > 1e-9 ? 2 : 1);
        tx(svg, L - 4, y + 3.5, v.toFixed(dec), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
      }

      var pf = p.prof, NB = pf.bins.length, PW = Math.min(56, pw * 0.22);
      for (var b = 0; b < NB; b++) {
        var f = pf.bins[b]; if (!(f > 0.004)) continue;
        var y0 = Y(pf.lo + (b + 1) / NB * (pf.hi - pf.lo)), y1 = Y(pf.lo + b / NB * (pf.hi - pf.lo));
        el('rect', { x: L + pw - PW * f, y: y0, width: PW * f, height: Math.max(1, y1 - y0 - 1), rx: 1,
          fill: b === pf.poc ? C.orange : C.muted, 'fill-opacity': b === pf.poc ? 0.45 : 0.22 }, svg);
      }

      var dates = p.w;
      monthTicks(dates, X, 3).forEach(function (t) {
        el('line', { x1: X(t.i), x2: X(t.i), y1: T, y2: T + ph, stroke: C.line }, svg);
        tx(svg, X(t.i), H - 4, t.s, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
      });

      var py = Y(p.poc);
      el('line', { x1: L, x2: L + pw, y1: py, y2: py, stroke: C.orange, 'stroke-width': 1, 'stroke-dasharray': '4 4', 'stroke-opacity': 0.85 }, svg);
      var pl = 'POC ' + p.poc.toFixed(p.poc < 10 ? 2 : 1);
      tx(svg, L + 4, py - 4 < T + 10 ? py + 12 : py - 4, pl, { fill: C.orange, 'font-size': fs, 'font-weight': 600, stroke: '#171B26', 'stroke-width': 3, 'paint-order': 'stroke' });
      function line(a, col, w) {
        var d = '', on = false;
        for (var i = 0; i < n; i++) { if (a[i] == null) { on = false; continue; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(a[i]).toFixed(1); on = true; }
        el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linejoin': 'round' }, svg);
      }
      line(p.m, C.light, narrow ? 1.6 : 1.8);
      line(p.r, C.text, narrow ? 1.5 : 1.7);
      el('circle', { cx: X(n - 1), cy: Y(p.r[n - 1]), r: 4, fill: '#F3EEFF', stroke: C.bg, 'stroke-width': 1.5 }, svg);
      pGeo[k] = { L: L, pw: pw, n: n, X: X, Y: Y, T: T, ph: ph, g: el('g', {}, svg) };
      setPHover(k, pHover[k]);
    });
  }
  function setPHover(k, i) {
    var g = pGeo[k], p = D.regime.panels[k]; if (!g) return;
    pHover[k] = i; clear(g.g);
    var n = p.r.length, j = i == null ? n - 1 : i;
    if (i != null) {
      el('line', { x1: g.X(i), x2: g.X(i), y1: g.T, y2: g.T + g.ph, stroke: C.muted, 'stroke-dasharray': '2 2' }, g.g);
      el('circle', { cx: g.X(i), cy: g.Y(p.r[i]), r: 3.5, fill: C.text, stroke: C.bg, 'stroke-width': 1 }, g.g);
    }
    var ro = $('pro-' + k); clear(ro);
    var dev = (p.r[j] / p.m[j] - 1) * 100, dp = p.r[j] < 10 ? 4 : 3;
    add(ro, '', (j === n - 1 ? 'This week so far' : 'Week to ' + fd(p.w[j])) + ': ratio ');
    bold(ro, p.r[j].toFixed(dp)); txt(ro, ' · avg '); bold(ro, p.m[j].toFixed(dp)); txt(ro, ' · ');
    add(ro, dev >= 0 ? 'up' : 'down', sgn(dev, 1) + '%');
  }


  function rangeBar(parent, o) {
    var holder = h('div', 'chart', null, parent);
    holder.setAttribute('role', 'img'); holder.setAttribute('aria-label', o.aria);
    holder._draw = function () {
      var W = widthOf(holder), fs = W < 420 ? 11 : 11.5, H = 62, yy = 22, bh = 16, M = 4;
      var svg = svgFor(holder, W, H, o.aria);
      var Xr = function (p) { return M + (Math.log(p / o.close) + o.dom) / (2 * o.dom) * (W - 2 * M); };
      el('line', { x1: M, x2: W - M, y1: yy + bh / 2, y2: yy + bh / 2, stroke: C.line, 'stroke-width': 2 }, svg);
      el('rect', { x: Xr(o.outer[0]), y: yy, width: Xr(o.outer[1]) - Xr(o.outer[0]), height: bh, rx: 4, fill: 'rgba(126,87,194,.38)' }, svg);
      el('rect', { x: Xr(o.inner[0]), y: yy, width: Xr(o.inner[1]) - Xr(o.inner[0]), height: bh, rx: 4, fill: C.fear }, svg);
      if (o.mid != null) el('line', { x1: Xr(o.mid), x2: Xr(o.mid), y1: yy + 2, y2: yy + bh - 2, stroke: C.light, 'stroke-width': 2 }, svg);
      var cx = Xr(o.close);
      el('circle', { cx: cx, cy: yy + bh / 2, r: 6.5, fill: '#fff', stroke: C.bg, 'stroke-width': 2.5 }, svg);
      var ct = num(o.close, 0), cw = textW(ct, fs + 1);
      tx(svg, Math.max(M + cw / 2, Math.min(W - M - cw / 2, cx)), yy - 7, ct, { fill: C.white, 'font-size': fs + 1, 'font-weight': 700, 'text-anchor': 'middle' });
      var ol = num(o.outer[0], 0), or = num(o.outer[1], 0);
      var xl = Xr(o.outer[0]) - 5, xr = Xr(o.outer[1]) + 5;
      if (xl - textW(ol, fs) >= 0) tx(svg, xl, yy + 12, ol, { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
      else tx(svg, Xr(o.outer[0]), yy + bh + 15, ol, { fill: C.muted, 'font-size': fs, 'text-anchor': 'start' });
      if (xr + textW(or, fs) <= W) tx(svg, xr, yy + 12, or, { fill: C.muted, 'font-size': fs });
      else tx(svg, Xr(o.outer[1]), yy + bh + 15, or, { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
      var il = num(o.inner[0], 0), ir = num(o.inner[1], 0), xa = Xr(o.inner[0]), xb = Xr(o.inner[1]);
      if (xb - xa > textW(il, fs) + textW(ir, fs) + 8) {
        tx(svg, xa, yy + bh + 15, il, { fill: C.text, 'font-size': fs, 'font-weight': 600, 'text-anchor': 'middle' });
        tx(svg, xb, yy + bh + 15, ir, { fill: C.text, 'font-size': fs, 'font-weight': 600, 'text-anchor': 'middle' });
      }
    };
    return holder;
  }
  var bars = [];
  function renderWeather() {
    var w = D.weather;
    asofLine('wAsof', w.fresh, fd(w.asof, true) + ' close · VIX ' + w.vix.toFixed(2) + ' (' + w.bucket.replace('-', '–') + ' = normal weather)');
    var R = $('wRanges'); clear(R);
    var dom = Math.max.apply(null, [w.spy, w.qqq].map(function (t) { return Math.max(Math.abs(Math.log(t.r1920[0] / t.close)), Math.abs(Math.log(t.r1920[1] / t.close))); })) * 1.32;
    [['SPY', w.spy], ['QQQ', w.qqq]].forEach(function (x) {
      var t = x[1], row = h('div', 'rbar-row', null, R);
      var hd = h('div', 'rbar-h', null, row); bold(hd, x[0]); add(hd, 'muted', 'closed ' + num(t.close, 2));
      bars.push(rangeBar(row, { close: t.close, inner: t.r23, outer: t.r1920, dom: dom,
        aria: x[0] + ' in a month: ' + num(t.r23[0]) + ' to ' + num(t.r23[1]) + ' two times in 3, ' + num(t.r1920[0]) + ' to ' + num(t.r1920[1]) + ' 19 times in 20' }));
      h('p', 'rbar-sub', 'usually ±' + t.m1.toFixed(1) + '% (≈$' + Math.round(t.m1_usd) + ') in a month · ±' + t.w1.toFixed(1) + '% in a week', row);
    });
    var lg = $('wLg'); clear(lg);
    legendItem(lg, 'lg-sw', 'background:' + C.fear, '2 times in 3');
    legendItem(lg, 'lg-sw', 'background:rgba(126,87,194,.38)', '19 times in 20');
    legendItem(lg, 'lg-sw', 'background:#fff;width:10px;height:10px;border-radius:50%', 'last close');
    var st = $('wStorm'); clear(st);
    ['SPY', 'QQQ'].forEach(function (tk) {
      var s = w.storm[tk];
      [['−2% day this week', s.p2d, s.one2d], ['5% slide this month', s.pdd, s.onedd]].forEach(function (r, k) {
        var row = h('div', 'st-row', null, st);
        add(row, 'tkr', k ? '' : tk); add(row, 'what', r[0]);
        var o = add(row, 'odd', ''); bold(o, P(r[1])); txt(o, ' · 1 in ' + r[2]);
        var dots = add(row, 'dots', ''); dots.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < Math.min(r[2], 14); i++) h('i', i ? null : 'f', null, dots);
      });
    });
    var sp = w.storm.SPY, qq = w.storm.QQQ;
    $('wStormNote').textContent = 'What actually happened on past days with the VIX at ' + w.bucket.replace('-', '–') + ', 2013–2026. On any day: SPY ' + P(sp.base2d) + ' and ' + P(sp.basedd) +
      ', QQQ ' + P(qq.base2d) + ' and ' + P(qq.basedd) + '.';
    var dg = $('wDir'); clear(dg);
    var inStress = w.stress === true;
    var g = h('div', 'dirg', null, dg); g.setAttribute('role', 'img'); g.setAttribute('aria-label', 'VIX divided by VIX3M: ' + w.ratio.toFixed(2) + (inStress ? ', in the stress zone' : ', in the calm zone'));
    var at = inStress ? 75 : 25;
    var za = add(g, 'z za', ''); za.style.width = 'calc(50% - 1px)';
    var zb = add(g, 'z zb', ''); zb.style.width = 'calc(50% - 1px)';
    var ar = add(g, 'ar', ''); ar.style.left = at + '%';
    var av = add(g, 'av', w.ratio.toFixed(2)); av.style.left = at + '%';
    var l0 = add(g, 'zl', 'calm'); l0.style.left = '0';
    var l1 = add(g, 'zl', 'stress'); l1.style.left = '50%';
    var p = h('p', 'dir-txt', null, dg);
    txt(p, 'VIX ÷ VIX3M (short-term fear over 3-month fear) = ' + w.ratio.toFixed(2) + ': ');
    bold(p, inStress ? 'stress zone' : 'calm zone');
    txt(p, '. Usual odds: SPY ends a month higher '); bold(p, Math.round(w.up_spy) + '%'); txt(p, ' of the time, QQQ '); bold(p, Math.round(w.up_qqq) + '%'); txt(p, ' (2013–2026).');
    $('wHow').textContent = 'The bars show where SPY and QQQ usually close a month from now, given today’s fear level (the VIX and its Nasdaq cousin). ' +
      'Bright = where the close lands 2 times in 3; faint = 19 times in 20. They are symmetric on purpose: they size the move, not its direction. ' +
      'Storm odds = how often a −2% day or a 5% slide really happened on past days with a similar VIX.';
    var s = 'VIX ' + w.vix.toFixed(1) + ' (' + w.bucket.replace('-', '–') + '). SPY usually moves ±' + w.spy.m1.toFixed(1) + '% (about $' + Math.round(w.spy.m1_usd) + ') in a month: ' +
      num(w.spy.r23[0]) + '–' + num(w.spy.r23[1]) + ' two times in 3. QQQ swings wider: ±' + w.qqq.m1.toFixed(1) + '%. ' +
      'A −2% SPY day this week: ' + P(sp.p2d) + ' (1 in ' + sp.one2d + '), ' + (sp.p2d < sp.base2d ? 'below' : 'above') + ' the ' + P(sp.base2d) + ' of any day.';
    $('wNow').textContent = s;
  }


  function probRow(parent, words, p, fillCls, tick, sub) {
    var r = h('div', 'pr', null, parent);
    add(r, 'pw', words);
    var b = add(r, 'pb', ''); b.setAttribute('aria-hidden', 'true');
    var f = add(b, 'f ' + fillCls, ''); f.style.width = Math.max(2, Math.min(100, p * 100)) + '%';
    if (tick != null) { var n = add(b, 'n', ''); n.style.left = Math.max(1, Math.min(99, tick * 100)) + '%'; }
    add(r, 'pp t-' + fillCls.replace('f-', ''), P(p));
    add(r, 'ps', sub);
    r.setAttribute('aria-label', words + ': ' + P(p) + '. ' + sub);
  }
  function renderSpy() {
    var f = D.forecast, rg = f.ranges;
    asofLine('sAsof', !f.stale, fd(f.asof, true) + ' close');
    var hd = $('sHead'); clear(hd);
    bold(hd, 'SPY'); txt(hd, ' closed '); bold(hd, num(f.close, 2)); txt(hd, ' · VIX ' + f.vix.toFixed(2) + ' · 90% zone: ');
    bold(hd, num(rg['1'].q05) + '–' + num(rg['1'].q95)); txt(hd, ' tomorrow, '); bold(hd, num(rg['20'].q05) + '–' + num(rg['20'].q95)); txt(hd, ' in a month.');
    var hi = $('sHigher'); clear(hi);
    f.higher.forEach(function (x) { probRow(hi, x.words, x.p, 'f-grey', null, 'normal since 1975 · last 5 years: ' + P(x.n5)); });
    $('sHigherNote').textContent = 'The usual rates: how often the S&P 500 ended higher over that many days.';
    var R = $('sRanges'); clear(R);
    var keys = [['1', 'Tomorrow'], ['5', 'In a week'], ['20', 'In a month']];
    var dom = Math.max(Math.abs(Math.log(rg['20'].q05 / f.close)), Math.abs(Math.log(rg['20'].q95 / f.close))) * 1.3;
    keys.forEach(function (k) {
      var q = rg[k[0]], row = h('div', 'rbar-row', null, R);
      var t = h('div', 'rbar-h', null, row); bold(t, k[1]);
      bars.push(rangeBar(row, { close: f.close, inner: [q.q25, q.q75], outer: [q.q05, q.q95], mid: q.q50, dom: dom,
        aria: k[1] + ': half the time ' + num(q.q25) + ' to ' + num(q.q75) + ', 9 times in 10 ' + num(q.q05) + ' to ' + num(q.q95) }));
      h('p', 'rbar-sub', 'half the time ' + num(q.q25) + '–' + num(q.q75) + ' · 9 times in 10 ' + num(q.q05) + '–' + num(q.q95) + ' · middle ' + num(q.q50), row);
    });
    var lg = $('sLg'); clear(lg);
    legendItem(lg, 'lg-sw', 'background:' + C.fear, 'half the time (50%)');
    legendItem(lg, 'lg-sw', 'background:rgba(126,87,194,.38)', '9 times in 10 (90%)');
    legendItem(lg, 'lg-ln', 'border-color:' + C.light + ';width:3px;height:12px;border-top:0;border-left:2px solid ' + C.light, 'middle');
    legendItem(lg, 'lg-sw', 'background:#fff;width:10px;height:10px;border-radius:50%', 'last close');
    $('sRangeNote').textContent = 'Past S&P 500 moves over the same number of days, sized to today’s VIX. Where the close ends, not a touch along the way.';
    var bu = f.bumpy;
    $('sBumpyH').textContent = 'How bumpy? (' + bu.word + ' right now)';
    var bb = $('sBumpy'); clear(bb);
    bu.rows.forEach(function (x) { probRow(bb, x.words, x.p, 'f-pur', x.normal, 'normal: ' + P(x.normal)); });
    var top = bu.rows[0];
    $('sBumpyNote').textContent = 'White tick = normal.';
    var sg = f.signal, sb = $('sSig'); clear(sb);
    if (sg.on) {
      $('sSigH').textContent = 'Washout signal is ON: about 1 in ' + sg.one_in + ' S&P 500 stocks beaten down (' + Math.round(sg.share * 100) + '%)';
      probRow(sb, 'up over the next 3 months', sg.up13, 'f-up', sg.up13_normal, 'normal: ' + P(sg.up13_normal) + ' · past weeks with ' + sg.band + ' beaten down (typical +' + sg.med13 + '%, vs +' + sg.med13_normal + '%)');
      probRow(sb, 'another 5%+ dip first', sg.dip, 'f-down', null, 'when it turned on ' + sg.where + ', like now (' + sg.dip_n + ' past times)');
      $('sSigNote').textContent = 'Beaten down = a stock’s weekly KDJ in its washed-out zone (week ending ' + fd(sg.week) + '); on since ' + fd(sg.since) + '.';
    } else {
      $('sSigH').textContent = 'Washout signal is off';
      h('p', 'fb-note', 'Not enough S&P 500 stocks are beaten down right now (' + Math.round((sg.share || 0) * 100) + '%) for a washout reading.', sb);
      $('sSigNote').textContent = '';
    }
    var up = f.higher[f.higher.length - 1];
    var s = 'Direction: normal odds (' + P(up.p) + ' higher in a month). The ride looks ' + bu.word + ': ' + P(top.p) + ' chance of a big 3-day swing vs ' + P(top.normal) + ' normally.';
    if (sg.on) s += ' The washout signal is on: ' + P(sg.up13) + ' up over 3 months vs ' + P(sg.up13_normal) + ' normally, and a ' + P(sg.dip) + ' chance of another 5% dip first.';
    $('sNow').textContent = s;
  }


  function drawAll() {
    if (!D) return;
    drawBreadth(); drawLiquidity(); drawRegime();
    bars.forEach(function (b) { b._draw(); });
  }
  hover($('bChart'), function () { return bGeo; }, setBHover);
  hover($('lChart'), function () { return lGeo; }, setLHover);
  var rt = null, lastW = -1, content = $('content');
  function onSize() { var cw = content.clientWidth; if (cw === lastW || !cw) return; lastW = cw; clearTimeout(rt); rt = setTimeout(drawAll, 80); }
  if (window.ResizeObserver) new ResizeObserver(onSize).observe(content);
  else window.addEventListener('resize', onSize);


  (function () {
    var nav = document.querySelector('.tabs'), cur = nav && nav.querySelector('[aria-current=page]');
    if (nav && cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft + cur.offsetWidth - nav.clientWidth;
  })();


  var SRC = /(^|\.)github\.io$/i.test(location.hostname) ?
    'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/market-board-data/market-board/board.json' : 'snap/board.pub.json';
  fetch(SRC, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (d) {
    if (!validate(d)) throw new Error('bad data');
    D = d;
    renderStatus(); renderTiles(); renderBreadth(); renderLiquidity(); renderRegime(); renderWeather(); renderSpy();
    content.hidden = false;
    onSize(); drawAll();
  }).catch(function (e) {
    var c = $('chip'); c.className = 'chip chip-error'; c.textContent = 'ERROR';
    $('asof').textContent = 'The board data could not be loaded.';
    var b = $('banners'); clear(b);
    var n = h('div', 'banner banner-bad', null, b); bold(n, 'No data'); txt(n, 'The board file is missing or not in the expected shape (' + (e && e.message || 'error') + ').');
  });
})();
