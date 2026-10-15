






(function () {
  'use strict';
  var URL_ = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/tet-radar-data/tet-radar/trend_breadth.json' : '../tet-radar-preview/snap/trend_breadth.pub.json';
  var NS = 'http://www.w3.org/2000/svg';
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    light: '#B39DDB', up: '#26A69A', down: '#EF5350', amber: '#F2B04B', ink2: '#B2B5BE', none: '#3A3F4B' };
  var ZC = {
    vthin: ['#F2B04B', 0.15], thin: ['#F3D28F', 0.11], normal: ['#B39DDB', 0], broad: ['#7FD1C7', 0.11], vbroad: ['#26A69A', 0.15] };
  var PX = { spy: C.white, qqq: '#4FC3F7' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function builtTxt(s) {
    var t = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(s || '') ? new Date(s) : null, o = {};
    if (!t || isNaN(t)) return '';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(t).forEach(function (p) { o[p.type] = p.value; });
      return o.month + ' ' + o.day + ', ' + o.hour + ':' + o.minute + ' ET';
    } catch (e) {
      return MON[t.getUTCMonth()] + ' ' + t.getUTCDate() + ', ' + String(t.getUTCHours()).padStart(2, '0') + ':' + String(t.getUTCMinutes()).padStart(2, '0') + ' UTC';
    }
  }
  var RANGES = { '1Y': 252, '2Y': 504, '5Y': 1260, '10Y': 2520, 'All': Infinity };
  var OVS = ['SPY', 'QQQ', 'Both', 'Off'];
  var D = null, range = '5Y', ov = 'SPY', hoverI = null, geo = null;
  try { var a = localStorage.getItem('tbRange'), b = localStorage.getItem('tbOverlay'); if (a && RANGES[a]) range = a; if (b && OVS.indexOf(b) >= 0) ov = b; } catch (e) { }


  function $(id) { return document.getElementById(id); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function add(p) { for (var i = 1; i < arguments.length; i++) { var c = arguments[i]; if (c == null) continue; p.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } return p; }
  function md(p, s) { String(s || '').split('**').forEach(function (part, k) { if (part) add(p, k % 2 ? h('b', null, part) : part); }); return p; }
  function s_(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function tx(g, x, y, s, a) { var t = s_('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
  function pct1(v) { return (v * 100).toFixed(1) + '%'; }
  function sgn(v, nd) { var s = Math.abs(v * 100).toFixed(nd == null ? 1 : nd); return (+s === 0 ? '' : v < 0 ? '−' : '+') + s + '%'; }
  function ds(n) { var y = Math.floor(n / 10000), m = Math.floor(n / 100) % 100, d = n % 100; return MON[m - 1] + ' ' + d + ', ' + y; }
  function iso2n(s) { return +s.replace(/-/g, ''); }
  function zoneAt(i) { return D.zones[D.z[i]]; }
  function nowZone() { for (var i = 0; i < D.zones.length; i++) if (D.zones[i].key === D.now.zone) return D.zones[i]; return zoneAt(D.z.length - 1); }
  function edges() { return [0].concat(D.ln, [1]); }


  function renderTop() {
    var n = D.now, t = D.text, z = nowZone(), zc = ZC[z.key][0];
    $('tbSub').textContent = t.sub;
    $('tbAsof').textContent = D.asof_label + ' close · ' + D.now.n + ' S&P 500 stocks · ' + Math.round(D.d.length / 252) + ' years of history · updated after each US close' + (builtTxt(D.built) ? ' · built ' + builtTxt(D.built) : '');

    var now = clear($('tbNow'));
    add(now, h('div', 'tb-k', 'Stocks climbing right now'));
    var big = h('span', 'tb-big', n.up_s); big.style.color = zc;
    var zch = h('span', 'tb-zchip', z.label); zch.style.color = zc; zch.style.borderColor = zc;
    add(now, add(h('div', 'tb-bigrow'), big, zch));
    add(now, h('div', 'tb-unit', n.n_up + ' of ' + n.n + ' S&P 500 stocks climb on their own and beat both the S&P 500 and the Nasdaq 100'));
    add(now, add(h('div', 'tb-gauge'), gauge()));
    var cmp = h('div', 'tb-cmp');
    [['1 month ago', pct1(n.up_mo), ds(iso2n(n.mo)).replace(/, \d+$/, '')],
     ['Typical, 2 years', pct1(n.med2), 'today: ' + String(n.rank2).replace(/^near the middle \((.*)\)$/, '$1').replace(' on ', ' ')],
     ['Typical, since 2013', pct1(n.med13), 'today: ' + String(n.rank13).replace(/^near the middle \((.*)\)$/, '$1').replace(' on ', ' ')]].forEach(function (r) {
      add(cmp, add(h('div'), h('span', 'k', r[0]), h('span', 'v', r[1]), h('span', 's', r[2])));
    });
    add(now, cmp);

    var pic = clear($('tbPic'));
    add(pic, h('div', 'tb-k', 'If the S&P 500 were 100 stocks'));
    add(pic, dots());
    var lg = h('div', 'lgd');
    [[C.up, Math.round(n.up * 100) + ' climbing'], [C.none, (100 - Math.round(n.up * 100) - Math.round(n.down * 100)) + ' no clear trend'], [C.down, Math.round(n.down * 100) + ' sliding']].forEach(function (r) {
      var i = h('i'); i.style.background = r[0]; add(lg, add(h('span'), i, r[1]));
    });
    add(pic, lg);
    add(pic, h('p', null, 'The index can still rise when only a few climb: the biggest stocks weigh the most.'));

    var bx = clear($('tbBox'));
    [['Right now', t.tldr], ['How to read it', t.how]].forEach(function (r) { add(bx, add(h('div', 'box-row'), h('b', null, r[0]), md(h('span'), r[1]))); });

    var zk = clear($('tbZones'));
    D.zones.forEach(function (q) {
      var c = ZC[q.key][0], el = h('div', q.key === z.key ? 'on' : null);
      el.style.borderTopColor = c;
      var lab = h('span', 'zl', q.label); lab.style.color = c;
      add(zk, add(el, lab, h('span', 'zs', Math.round(q.share13 * 100) + '% of days since 2013' + (q.key === z.key ? ' · now' : ''))));
    });
    renderCases();

    $('tbData').textContent = String(t.data || '').replace("the radar's own daily numbers (the Market breadth chart below)", "the TET Radar tab's own daily numbers");
  }
  function gauge() {
    var W = 360, H = 60, pad = 8, top = 0.5, pw = W - 2 * pad, y = 18, n = D.now, zc = ZC[nowZone().key][0], e = edges();
    var X = function (v) { return pad + Math.min(v, top) / top * pw; };
    var svg = s_('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Gauge from 0 to 50%: today ' + n.up_s + ', a month ago ' + pct1(n.up_mo) + ', typical since 2013 ' + pct1(n.med13) });
    D.zones.forEach(function (q, k) {
      s_('rect', { x: X(e[k]), y: y - 5, width: Math.max(0, X(Math.min(e[k + 1], top)) - X(e[k])), height: 10, fill: ZC[q.key][0], 'fill-opacity': q.key === 'normal' ? 0.28 : 0.55 }, svg);
    });
    s_('line', { x1: X(n.med13), x2: X(n.med13), y1: y - 9, y2: y + 9, stroke: C.text, 'stroke-width': 1.4 }, svg);
    s_('line', { x1: X(n.up_mo), x2: X(n.up), y1: y, y2: y, stroke: C.white, 'stroke-width': 1.6, 'stroke-dasharray': '2 2' }, svg);
    s_('circle', { cx: X(n.up_mo), cy: y, r: 4, fill: C.panel, stroke: C.white, 'stroke-width': 1.5 }, svg);
    s_('circle', { cx: X(n.up), cy: y, r: 6.5, fill: zc, stroke: C.white, 'stroke-width': 1.8 }, svg);
    tx(svg, X(n.up), y + 19, 'now', { fill: zc, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
    if (Math.abs(X(n.up_mo) - X(n.up)) >= 34) tx(svg, X(n.up_mo), y + 19, ds(iso2n(n.mo)).replace(/, \d+$/, ''), { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
    [0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach(function (v) { tx(svg, X(v), H - 3, Math.round(v * 100) + '%', { fill: C.muted, 'font-size': 11, 'text-anchor': v === 0 ? 'start' : v === 0.5 ? 'end' : 'middle' }); });
    tx(svg, X(n.med13), y - 11, 'typical since 2013', { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'middle' });
    return svg;
  }
  function dots() {
    var n = D.now, nu = Math.round(n.up * 100), nd = Math.round(n.down * 100);
    var svg = s_('svg', { viewBox: '0 0 200 200', role: 'img', 'aria-label': nu + ' of 100 climbing, ' + nd + ' sliding, ' + (100 - nu - nd) + ' no clear trend' });
    for (var k = 0; k < 100; k++) {
      var r = Math.floor(k / 10), c = k % 10;
      var col = k < nu ? C.up : k >= 100 - nd ? C.down : C.none;
      s_('circle', { cx: 10 + c * 20, cy: 10 + r * 20, r: 7.2, fill: col, 'fill-opacity': col === C.none ? 1 : 0.95 }, svg);
    }
    return svg;
  }
  function renderCases() {
    var t = clear($('tbCases')), hr = h('tr');
    [['#', '#'], ['First day', 'Day'], ['Climbing', 'Climbing'], ['SPY vs its\n1-year high', 'SPY vs\nits high'], ['SPY 3 months\nlater', 'SPY 3 mo\nlater'], ['Biggest dip\non the way', 'Biggest\ndip']].forEach(function (x, k) {
      var th = h('th', k >= 2 ? 'n' : k === 0 ? 'c' : null);
      x.forEach(function (lab, v) {
        var sp = h('span', v ? 'dsh' : 'dl');
        lab.split('\n').forEach(function (p, j) { if (j) sp.appendChild(h('br')); sp.appendChild(document.createTextNode(p)); });
        th.appendChild(sp);
      });
      hr.appendChild(th);
    });
    add(t, add(h('thead'), hr));
    var tb = h('tbody'), k = 0;
    D.cases.forEach(function (c) {
      var tr = h('tr', c.open ? 'now' : null), pin = h('span', c.open ? 'pin pin-now' : 'pin', c.open ? 'now' : String(++k));
      var dn = iso2n(c.d), dcell = add(h('td'), h('span', 'dl', ds(dn)), h('span', 'dsh', MON[Math.floor(dn / 100) % 100 - 1] + ' ’' + String(Math.floor(dn / 10000)).slice(2)));
      add(tr, add(h('td', 'c'), pin), dcell, h('td', 'n', (c.up * 100).toFixed(2) + '%'), h('td', 'n', c.off > -0.0005 ? 'at the high' : sgn(c.off)));
      if (c.open) { var td = h('td', 'n mut', 'still open'); td.colSpan = 2; add(tr, td); }
      else add(tr, h('td', 'n ' + (c.r3m > 0 ? 'pos' : 'neg'), sgn(c.r3m)), c.dip3m > -0.0005 ? h('td', 'n mut', 'none') : h('td', 'n neg', sgn(c.dip3m)));
      tb.appendChild(tr);
    });
    add(t, tb);
    $('tbCasesNote').textContent = D.text.cases_note;
  }


  function logTicks(lo, hi, want) {
    var steps = [1, 2, 2.5, 5], best = null;
    for (var e = -2; e <= 5; e++) steps.forEach(function (m) {
      var st = m * Math.pow(10, e), a = Math.ceil(lo / st) * st, out = [];
      for (var v = a; v <= hi + 1e-9 && out.length < 40; v += st) out.push(v);
      if (out.length >= 2 && out.length <= want && (!best || out.length > best.length)) best = out;
    });
    if (!best) return [lo, hi];
    if (best.length > 3 && Math.log(hi / lo) > Math.log(3)) {
      var kept = [], lastY = -1e9;
      best.forEach(function (v) { var yy = Math.log(v); if (yy - lastY > Math.log(hi / lo) / (want + 1)) { kept.push(v); lastY = yy; } });
      best = kept;
    }
    return best;
  }
  function ratioTicks(lo, hi) {
    var out = [];
    if (hi / lo > 2.2) { [0.5, 1, 2, 5, 10, 20, 50, 100].forEach(function (v) { if (v >= lo && v <= hi) out.push(v); }); return out; }
    var st = [0.02, 0.05, 0.1, 0.2, 0.25, 0.5].filter(function (x) { return (hi - lo) / x <= 6; })[0] || 0.5;
    for (var v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(4));
    if (out.indexOf(1) < 0 && lo <= 1 && hi >= 1) out.push(1);
    return out;
  }
  function draw() {
    var holder = $('tbChart'); clear(holder);
    if (!D) return;
    var n = D.d.length, last = n - 1;
    var W = Math.max(300, Math.round(holder.clientWidth || 360)), narrow = W < 640;
    var L = narrow ? 34 : 46, R = narrow ? 50 : 62, pw = W - L - R, fs = narrow ? 10.5 : 11.5;
    var T0 = 58, PH = narrow ? 250 : 340, H = T0 + PH + 24;
    var cnt = Math.min(n, RANGES[range]), i0 = n - cnt;
    var X = function (i) { return L + (i - i0) / Math.max(1, cnt - 1) * pw; };
    var svg = s_('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, holder);
    s_('rect', { x: L, y: T0, width: pw, height: PH, fill: C.panel, rx: 3 }, svg);

    var vmax = 0, i;
    for (i = i0; i <= last; i++) vmax = Math.max(vmax, D.up[i]);
    var top = Math.max(0.45, Math.ceil((vmax + 0.02) / 0.05) * 0.05);
    var Yb = function (v) { return T0 + PH - 4 - v / top * (PH - 8); };
    var zlab = [], e = edges();
    D.zones.forEach(function (q, k) {
      var ya = Yb(Math.min(e[k + 1], top)), yb = Yb(e[k]), zc = ZC[q.key];
      if (zc[1] > 0) s_('rect', { x: L, y: ya, width: pw, height: yb - ya, fill: zc[0], 'fill-opacity': zc[1] }, svg);
      zlab.push([Math.min(yb - 4, ya + 13), q.label.toLowerCase(), zc[0], yb - ya]);
    });
    for (var g = 0.1; g <= top + 1e-9; g += 0.1) {
      s_('line', { x1: L, x2: L + pw, y1: Yb(g), y2: Yb(g), stroke: C.line, 'stroke-width': 1 }, svg);
      tx(svg, L - 5, Yb(g) + 4, Math.round(g * 100) + '%', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
    }
    tx(svg, L - 5, Yb(0) + 1, '0', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });

    var span = cnt / 252, prevK = null, lastX = -1e9, minGap = narrow ? 34 : 44;
    for (i = i0; i <= last; i++) {
      var dn = D.d[i], y = Math.floor(dn / 10000), m = Math.floor(dn / 100) % 100;
      var key = span > 2.5 ? y : y * 12 + m, x = X(i);
      if (prevK !== null && key !== prevK) {
        var lab = span > 2.5 ? String(y) : (m === 1 ? String(y) : MON[m - 1]);
        var every = span > 2.5 ? 1 : span > 1.2 ? 3 : 1;
        if (span > 2.5 || (m - 1) % every === 0) {
          s_('line', { x1: x, x2: x, y1: T0, y2: T0 + PH, stroke: C.line, 'stroke-width': 1 }, svg);
          if (x - lastX >= minGap && x > L + 12 && x < L + pw - 12) { tx(svg, x, H - 6, lab, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' }); lastX = x; }
        }
      }
      prevK = key;
    }

    var series = ov === 'Both' ? ['spy', 'qqq'] : ov === 'SPY' ? ['spy'] : ov === 'QQQ' ? ['qqq'] : [];
    var rebased = series.length > 1, Yp = null, pmin = Infinity, pmax = -Infinity;
    function pv(k, j) { return rebased ? D[k][j] / D[k][i0] : D[k][j]; }
    series.forEach(function (k) { for (i = i0; i <= last; i++) { var v = pv(k, i); pmin = Math.min(pmin, v); pmax = Math.max(pmax, v); } });
    if (series.length) {
      var lp0 = Math.log(pmin), lp1 = Math.log(pmax), pad = (lp1 - lp0) * 0.06 || 0.05;
      lp0 -= pad; lp1 += pad;
      var PP = PH * 0.70;
      Yp = function (v) { return T0 + 4 + (lp1 - Math.log(v)) / (lp1 - lp0) * (PP - 8); };
      var tagY = Yb(D.up[last]);
      (rebased ? ratioTicks(Math.exp(lp0), Math.exp(lp1)) : logTicks(Math.exp(lp0), Math.exp(lp1), narrow ? 4 : 6)).forEach(function (v) {
        var lab = rebased ? sgn(v - 1, 0) : (v >= 100 ? String(Math.round(v)) : String(+v.toFixed(1)));
        if (Math.abs(Yp(v) - tagY) < 14) return;
        tx(svg, L + pw + 5, Yp(v) + 4, lab, { fill: C.muted, 'font-size': fs });
        s_('line', { x1: L + pw, x2: L + pw + 3, y1: Yp(v), y2: Yp(v), stroke: C.muted, 'stroke-width': 1 }, svg);
      });
      series.forEach(function (k) {
        var dd = '';
        for (i = i0; i <= last; i++) dd += (i === i0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Yp(pv(k, i)).toFixed(1);
        s_('path', { d: dd, fill: 'none', stroke: PX[k], 'stroke-opacity': rebased ? 0.6 : 0.5, 'stroke-width': narrow ? 1.1 : 1.2, 'stroke-linejoin': 'round' }, svg);
      });
    }

    var runStart = i0, zPrev = zoneAt(i0).key;
    for (i = i0 + 1; i <= last + 1; i++) {
      var zk = i <= last ? zoneAt(i).key : null;
      if (zk === zPrev) continue;
      var dd2 = '', from = Math.max(i0, runStart - 1);
      for (var j = from; j <= i - 1; j++) dd2 += (j === from ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Yb(D.up[j]).toFixed(1);
      if (i <= last) dd2 += 'L' + X(i).toFixed(1) + ' ' + Yb(D.up[i]).toFixed(1);
      s_('path', { d: dd2, fill: 'none', stroke: ZC[zPrev][0], 'stroke-width': narrow ? 1.9 : 2.3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      runStart = i; zPrev = zk;
    }
    zlab.forEach(function (z) {
      if (z[3] <= 13 || narrow) return;
      var t = tx(svg, L + 9, z[0], z[1], { fill: z[2], 'font-size': fs - 0.5, 'font-weight': 700 }), w = z[1].length * (fs - 0.5) * 0.56 + 8;
      var bg = s_('rect', { x: L + 5, y: z[0] - fs + 1, width: w, height: fs + 3, rx: 3, fill: C.bg, 'fill-opacity': 0.92 });
      svg.insertBefore(bg, t);
    });

    var dIdx = {}; for (i = i0; i <= last; i++) dIdx[D.d[i]] = i;
    var k = 0, pins = [], rows = [[], []];
    D.cases.forEach(function (c) { var lab = c.open ? 'now' : String(++k), ii = dIdx[iso2n(c.d)]; if (ii != null) pins.push({ lab: lab, ii: ii, open: !!c.open, hw: c.open ? 15 : 8 }); });
    pins.sort(function (a, b) { return (b.open ? 1 : 0) - (a.open ? 1 : 0); });
    pins.forEach(function (p) {
      var px = X(p.ii), row = -1;
      for (var r = 0; r < 2 && row < 0; r++) if (rows[r].every(function (q) { return Math.abs(q[0] - px) >= q[1] + p.hw + 2; })) row = r;
      var cy = row === 1 ? T0 - 31 : T0 - 12;
      s_('line', { x1: px, x2: px, y1: row === -1 ? T0 : cy + 8, y2: Yb(D.up[p.ii]), stroke: C.amber, 'stroke-opacity': 0.55, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
      if (row === -1) return;
      rows[row].push([px, p.hw]);
      if (p.open) s_('rect', { x: px - p.hw, y: cy - 8, width: 2 * p.hw, height: 16, rx: 8, fill: C.amber }, svg);
      else s_('circle', { cx: px, cy: cy, r: 8, fill: C.bg, stroke: C.amber, 'stroke-width': 1.5 }, svg);
      tx(svg, px, cy + 4, p.lab, { fill: p.open ? C.bg : C.amber, 'font-size': p.open ? 10 : 10.5, 'font-weight': 700, 'text-anchor': 'middle' });
    });

    var ylast = Yb(D.up[last]);
    s_('circle', { cx: X(last), cy: ylast, r: 4.5, fill: ZC[zoneAt(last).key][0], stroke: C.bg, 'stroke-width': 1.5 }, svg);
    var vl = D.now.up_s, vw = Math.min(R - 3, vl.length * fs * 0.62 + 8);
    s_('rect', { x: L + pw + 2, y: ylast - 8.5, width: vw, height: 17, rx: 3, fill: ZC[zoneAt(last).key][0] }, svg);
    tx(svg, L + pw + 2 + vw / 2, ylast + 4, vl, { fill: C.bg, 'font-size': fs, 'font-weight': 800, 'text-anchor': 'middle' });
    tx(svg, 0, T0 - 46, narrow ? '% climbing' : 'share climbing', { fill: C.muted, 'font-size': fs - 0.5 });
    if (series.length) tx(svg, W - 2, T0 - 46, rebased ? '% move' : series[0].toUpperCase(), { fill: rebased ? C.muted : PX[series[0]], 'font-size': fs - 0.5, 'font-weight': rebased ? 400 : 700, 'text-anchor': 'end' });
    var cross = s_('g', {}, svg);
    geo = { L: L, pw: pw, i0: i0, cnt: cnt, X: X, Yb: Yb, Yp: Yp, pv: pv, series: series, cross: cross, top: T0, bot: T0 + PH };
    renderLegend(series, rebased);
    setHover(hoverI);
  }
  function renderLegend(series, rebased) {
    var lg = clear($('tbLegend'));
    function item(col, text, dash) {
      var sv = s_('svg', { width: 18, height: 10, 'aria-hidden': 'true' });
      s_('line', { x1: 1, x2: 17, y1: 5, y2: 5, stroke: col, 'stroke-width': 2.2, 'stroke-dasharray': dash || null }, sv);
      var sp = h('span'); sp.appendChild(sv); add(sp, ' ' + text); lg.appendChild(sp);
    }
    item(ZC.vthin[0], 'share climbing: amber = thin or very thin'); item(ZC.normal[0], 'purple = normal'); item(ZC.vbroad[0], 'green = broad or very broad');
    if (series.indexOf('spy') >= 0) item(PX.spy, 'SPY' + (rebased ? ' gain since the left edge' : ' close, right axis'));
    if (series.indexOf('qqq') >= 0) item(PX.qqq, 'QQQ' + (rebased ? ' gain since the left edge' : ' close, right axis'));
    item(C.amber, 'look-alike days (table below)', '2 3');
  }
  function setHover(i) {
    if (!geo || !D) return;
    var last = D.d.length - 1;
    clear(geo.cross);
    if (i != null && (i < geo.i0 || i > last)) i = null;
    hoverI = i;
    var j = i == null ? last : i, z = zoneAt(j);
    if (i != null) {
      var px = geo.X(i);
      s_('line', { x1: px, x2: px, y1: geo.top, y2: geo.bot, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
      geo.series.forEach(function (k) { s_('circle', { cx: px, cy: geo.Yp(geo.pv(k, i)), r: 3.4, fill: PX[k], stroke: C.bg, 'stroke-width': 1.2 }, geo.cross); });
      s_('circle', { cx: px, cy: geo.Yb(D.up[i]), r: 4, fill: ZC[z.key][0], stroke: C.white, 'stroke-width': 1.2 }, geo.cross);
    }
    var ro = clear($('tbRo')), zs = h('span', 'z', z.label.toLowerCase()); zs.style.color = ZC[z.key][0];
    add(ro, h('span', 'd', ds(D.d[j])), ' · climbing ', h('b', null, j === last ? D.now.up_s : pct1(D.up[j])), ' (', zs, ') · sliding ' + (j === last ? D.now.down_s : pct1(D.dn[j])) +
      (ov === 'Both' ? ' · since the left edge: SPY ' + sgn(geo.pv('spy', j) - 1) + ', QQQ ' + sgn(geo.pv('qqq', j) - 1)
        : ' · SPY ' + D.spy[j].toFixed(2) + ' · QQQ ' + D.qqq[j].toFixed(2)));
    if (i == null) ro.appendChild(h('span', 'muted', ' · tap or hover the chart for any day'));
  }
  function pickAt(ev) {
    if (!geo) return;
    var holder = $('tbChart'), svg = holder.querySelector('svg');
    if (!svg) return;
    var r = holder.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width, x = (ev.clientX - r.left) * scale;
    setHover(Math.max(geo.i0, Math.min(D.d.length - 1, Math.round(geo.i0 + (x - geo.L) / geo.pw * (geo.cnt - 1)))));
  }
  function renderButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tbr]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tbr') === range)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-tbo]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tbo') === ov)); });
  }


  var sec = $('tbreadth');
  if (!sec) return;
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-tbr],[data-tbo]');
    if (!b) return;
    if (b.hasAttribute('data-tbr')) { range = b.getAttribute('data-tbr'); try { localStorage.setItem('tbRange', range); } catch (e) { } }
    else { ov = b.getAttribute('data-tbo'); try { localStorage.setItem('tbOverlay', ov); } catch (e) { } }
    hoverI = null; renderButtons(); draw();
  });
  var chart = $('tbChart');
  chart.addEventListener('pointermove', pickAt);
  chart.addEventListener('pointerdown', pickAt);
  chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });
  var rt = null, lastW = -1;
  function onSize() { var cw = chart.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(draw, 80); }
  if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart); else window.addEventListener('resize', onSize);
  renderButtons();
  fetch(URL_, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) {
    var n = d && d.d && d.d.length;
    if (!d || d.schema !== 2 || d.kind !== 'tet_trend_breadth' || !(n > 300) || ![d.up, d.dn, d.spy, d.qqq, d.z].every(function (x) { return Array.isArray(x) && x.length === n; }) ||
        !Array.isArray(d.ln) || !Array.isArray(d.zones) || d.ln.length !== d.zones.length - 1 || !d.now || !d.now.up_s) throw new Error('bad data');
    D = d;
    renderTop(); draw();
    if (location.hash === '#tbreadth') sec.scrollIntoView();
  }).catch(function (e) {
    clear($('tbNow')).appendChild(h('p', 'small', 'Trend breadth could not be loaded (' + e.message + ').'));
  });
})();
