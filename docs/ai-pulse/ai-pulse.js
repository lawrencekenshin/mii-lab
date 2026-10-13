



(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    fear: '#7E57C2', light: '#B39DDB', amber: '#F2B04B', steady: '#4A4F5C' };
  var FONT = '-apple-system,BlinkMacSystemFont,"Roboto","Segoe UI","Helvetica Neue",Arial,sans-serif';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WDN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MINUS = '−', NDASH = '–';
  var RANGES = { '1Y': 12, '2Y': 24, '3Y': 36 };
  var SPAN_WORDS = { '1Y': 'last year', '2Y': 'last 2 years', '3Y': 'last 3 years' };
  var HOVER = !(window.matchMedia && window.matchMedia('(hover: none)').matches);
  var RECENT_DAYS = 45;


  var GROUPS = [
    { id: 'buyers', title: 'Who is spending', segs: ['capex', 'cloud', 'neocloud', 'software'] },
    { id: 'chips', title: 'Chips and the machines that make them', segs: ['gpu', 'custom', 'equipment'] },
    { id: 'memory', title: 'Memory and storage', segs: ['dram', 'nand'] },
    { id: 'hardware', title: 'Data-centre hardware', segs: ['network', 'servers', 'power'] },
    { id: 'trade', title: 'Chip and server trade', members: 'trade' }
  ];
  var ST = {
    accelerating: { cls: 'acc', chip: 'SPEEDING UP', word: 'speeding up', lane: 'Speeding up', rank: 0 },
    steady: { cls: 'std', chip: 'STEADY', word: 'steady', lane: 'Steady', rank: 1 },
    slowing: { cls: 'slw', chip: 'SLOWING', word: 'slowing', lane: 'Slowing', rank: 2 }
  };
  function stOf(s) { return s ? ST[String(s).toLowerCase()] || null : null; }

  var NOUN1 = { companies: 'company', clouds: 'cloud', forecasts: 'forecast', 'trade figures': 'trade figure',
    'companies and trade figures': 'company or trade figure' };


  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function span(cls, text) { return node('span', cls, text); }
  function add(parent) { for (var i = 1; i < arguments.length; i++) { var c = arguments[i]; if (c == null) continue; parent.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } return parent; }
  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { } return null; }
  function qs(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  function arw(cls, sm) { var a = span('arw ' + cls + (sm ? ' sm' : '')); a.setAttribute('aria-hidden', 'true'); return a; }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function numWord(n) { return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n); }
  function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }


  function absTxt(v) { var a = Math.abs(v); return a % 1 === 0 ? String(a) : a.toFixed(1); }
  function sgn(v) { return v < 0 ? MINUS : v > 0 ? '+' : ''; }
  function pctTxt(v) { return v == null || isNaN(v) ? NDASH : sgn(v) + absTxt(v) + '%'; }
  function ptsNum(v) { return v == null || isNaN(v) ? NDASH : sgn(v) + absTxt(v); }

  function ptsBox(v, cls) { return v === 0 && cls === 'acc' ? '+0' : v === 0 && cls === 'slw' ? MINUS + '0' : ptsNum(v); }
  function ptsUnit(v) { return v == null ? '' : v > 0 ? plural(v, 'point', 'points') + ' faster' : v < 0 ? plural(-v, 'point', 'points') + ' slower' : 'points'; }
  function ptsWords(v) {
    if (v == null || isNaN(v)) return 'no earlier reading';
    if (v === 0) return 'about as fast';
    var s = absTxt(v);
    return s + (s === '1' ? ' point' : ' points') + (v > 0 ? ' faster' : ' slower');
  }
  function lowerLabel(s) { return s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function growWords(v) { return v == null ? NDASH : (v < 0 ? 'shrinking ' : 'growing ') + absTxt(v) + '% a year'; }
  function changeWords(a, b) { return 'growth ' + pctTxt(a).replace(/^\+/, '') + ' → ' + pctTxt(b).replace(/^\+/, '') + ' a year'; }
  function priceWords(v) { return v == null ? NDASH : v === 0 ? 'even' : absTxt(v) + '% ' + (v > 0 ? 'ahead' : 'behind'); }
  function priceVs(v) { return v === 0 ? 'even with chip stocks' : priceWords(v) + (v > 0 ? ' of' : '') + ' chip stocks'; }


  function dn(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +(s.slice(8, 10) || 1)) / 864e5; }
  function dOf(n) { return new Date(n * 864e5); }
  function fmtN(n, yr, wd) { var d = dOf(n); return (wd ? WDN[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (yr ? ', ' + d.getUTCFullYear() : ''); }
  function fmtD(s, yr, wd) { return s ? fmtN(dn(s), yr, wd) : NDASH; }
  function fmtSpan(d0, d1) {
    if (!d0) return '';
    if (!d1 || d1 === d0) return fmtD(d0);
    var a = dOf(dn(d0)), b = dOf(dn(d1));
    return a.getUTCMonth() === b.getUTCMonth() ? MON[a.getUTCMonth()] + ' ' + a.getUTCDate() + NDASH + b.getUTCDate() : fmtD(d0) + ' ' + NDASH + ' ' + fmtD(d1);
  }
  function whenTxt(e) { return (e.est ? 'about ' : '') + fmtSpan(e.d0, e.d1); }
  function wdSpan(d0, d1) { var a = WDN[dOf(dn(d0)).getUTCDay()]; return !d1 || d1 === d0 ? a : a + NDASH + WDN[dOf(dn(d1)).getUTCDay()]; }
  var nowOverride = (function () { var v = qs('now'); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? dn(v) : null; })();
  function twToday() {
    if (nowOverride != null) return nowOverride;
    var t = new Date(Date.now() + 8 * 36e5); return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) / 864e5;
  }
  var ETF = (function () {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); } catch (e) { return null; }
  })();
  function builtEpoch(b) {
    var t = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/.test(b || '') ? Date.parse(b) : NaN;
    return isNaN(t) ? null : t;
  }
  function builtTxt(ms) {
    var d = new Date(ms), o = {};
    if (!ETF) return fmtN(Math.floor(ms / 864e5), false, true) + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' UTC';
    ETF.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return o.weekday + ' ' + o.month + ' ' + o.day + ', ' + o.hour + ':' + o.minute + ' ET';
  }
  function ago(ms) {
    var h = ms / 36e5;
    if (h < 1) return 'less than an hour ago';
    if (h < 36) return Math.round(h) + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }


  var NS = 'http://www.w3.org/2000/svg', uid = 0;
  var mctx = document.createElement('canvas').getContext('2d');
  function textW(str, size, weight) { mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; return mctx.measureText(str).width; }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function tx(parent, x, y, str, a) {
    a = a || {}; a.x = x; a.y = y; if (!a['font-family']) a['font-family'] = FONT;
    var t = el('text', a, parent); t.textContent = str; return t;
  }
  function lin(d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  }
  function tickStep(span0, px, minPx) {
    var steps = [1, 2, 2.5, 5], mag = Math.pow(10, Math.floor(Math.log10(Math.max(span0, 1e-9)))) / 10;
    for (var m = mag; m < 1e9; m *= 10) for (var i = 0; i < steps.length; i++) if (steps[i] * m / span0 * px >= minPx) return steps[i] * m;
    return span0;
  }
  function clipFor(svg, x, y, w, h) {
    var id = 'ap' + (++uid), defs = svg.querySelector('defs') || el('defs', {}, svg);
    var cp = el('clipPath', { id: id }, defs); el('rect', { x: x, y: y, width: w, height: h }, cp);
    return 'url(#' + id + ')';
  }
  function svgFor(holder, W, H) {
    var svg = holder.firstElementChild;
    if (!svg || svg.tagName.toLowerCase() !== 'svg') { clear(holder); svg = el('svg', {}, holder); } else clear(svg);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    return svg;
  }
  function fmtAxis(v) { var a = Math.abs(v), s = a >= 1000 ? (a / 1000) + 'k' : String(Math.round(a * 10) / 10); return (v < 0 ? MINUS : '') + s + '%'; }
  function nowDot(g, x, y, r) {
    el('circle', { cx: x, cy: y, r: r + 5, fill: C.light, 'fill-opacity': 0.16, stroke: C.light, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
    el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: C.light, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
    el('circle', { cx: x, cy: y, r: r, fill: '#F3EEFF', stroke: '#fff', 'stroke-width': 1.4 }, g);
  }
  function bsearchLE(arr, x) { var lo = 0, hi = arr.length - 1, ans = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; }


  var J = null, SEG = {}, ORDER = [], ASOF = 0, RANGE = '2Y', PANELS = [], lastW = 0, MV_OPEN = false;

  function validate(d) {
    if (!d || typeof d !== 'object') return 'the file is empty';
    if (!Array.isArray(d.segments) || !d.segments.length) return 'no parts in the file';
    if (!d.asof || !/^\d{4}-\d{2}-\d{2}$/.test(d.asof)) return 'no as-of date';
    for (var i = 0; i < d.segments.length; i++) {
      var s = d.segments[i];
      if (!s || !s.id || !s.name || !stOf(s.status) || !Array.isArray(s.trend) || !Array.isArray(s.members)) return 'part ' + (i + 1) + ' is incomplete';
    }
    return null;
  }
  function label(s) { return s.label || s.name; }
  function shortL(s) { return s.short || s.label || s.name; }
  function prepare() {
    ASOF = dn(J.asof);
    J.segments.forEach(function (s) {
      SEG[s.id] = s;
      s.T = s.trend.filter(function (p) { return p && p[1] != null; }).map(function (p) {
        return { d: p[0], t: dn(p[0]), g: p[1], a: p[2], b: p[3], st: p[4], n: p[5] };
      });
      s.TT = s.T.map(function (p) { return p.t; });
      s.members.forEach(function (m) {
        m.H = (m.hist || []).map(function (h) { return { d: h[0], t: dn(h[0]), per: h[1], g: h[2] }; });
        m.HT = m.H.map(function (h) { return h.t; });
      });
    });
    ORDER = J.segments.slice().sort(function (a, b) {
      var r = stOf(a.status).rank - stOf(b.status).rank;
      if (r) return r;
      return (b.accel_pp == null ? -1e9 : b.accel_pp) - (a.accel_pp == null ? -1e9 : a.accel_pp);
    });
  }
  function isPrice() { return false; }
  function counts() {
    var c = { acc: 0, std: 0, slw: 0, n: J.segments.length };
    J.segments.forEach(function (s) { c[stOf(s.status).cls]++; });
    return c;
  }
  function nounOf(s, n) { var p = s.noun || 'companies'; return n === 1 ? NOUN1[p] || 'company' : p; }
  function growLine(s) {
    if (isPrice(s)) return 'typical forecast: prices ' + (s.growth < 0 ? 'down ' : 'up ') + absTxt(s.growth) + '%';
    return (s.typical ? 'typical: ' : '') + growWords(s.growth);
  }

  function reasonTxt(s) {
    var b = s.breadth, k = stOf(s.status).cls; if (!b || b.n < 2) return '';
    var up = isPrice(s) ? ' higher' : ' faster', dn0 = isPrice(s) ? ' lower' : ' slower';
    if (k === 'std') return b.accelerating && b.slowing ? 'split: ' + b.accelerating + up + ', ' + b.slowing + dn0 : 'about the same pace';
    if (k === 'slw') return b.slowing + ' of ' + b.n + dn0;
    return b.accelerating + ' of ' + b.n + up;
  }


  function banner(kind, title, text, retry) {
    var b = node('div', 'banner banner-' + kind);
    add(b, node('b', '', title), text);
    if (retry) { var bt = node('button', '', 'Try again'); bt.type = 'button'; bt.addEventListener('click', function () { clear($('banners')); load(); }); b.appendChild(bt); }
    $('banners').appendChild(b);
  }
  function upcoming(from) {
    return (J.calendar || []).filter(function (e) { return e.d0 && dn(e.d1 || e.d0) >= from; })
      .sort(function (a, b) { return a.d0 < b.d0 ? -1 : a.d0 > b.d0 ? 1 : (a.d1 < b.d1 ? -1 : a.d1 > b.d1 ? 1 : 0); });
  }
  function watchOnly(e) { return !e.parts || !e.parts.length; }
  function calWhat(e) { return (e.what || '').replace(/\s*\(watch only; not in these numbers\)/i, ''); }
  function renderStatus() {
    var chip = $('chip'), be = builtEpoch(J.built), age = be != null ? Date.now() - be : null;
    var old = age != null && age > 10 * 864e5 && nowOverride == null;
    chip.className = 'chip ' + (old ? 'chip-late' : 'chip-closed');
    chip.textContent = old ? 'NOT UPDATED' : 'UPDATED';
    var asof = $('asof'); clear(asof);
    add(asof, 'Built ' + (be != null ? builtTxt(be) : NDASH) + (age != null && nowOverride == null ? ' (' + ago(age) + ')' : ''));
    var newest = J.segments.map(function (s) { return s.freshest; }).filter(function (f) { return f && f.date; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; })[0];
    var sl = $('statusLine'); clear(sl);
    if (newest) add(sl, node('b', '', 'Newest number: '), fmtD(newest.date) + ' · ' + newest.what);
    var nx = upcoming(twToday()).filter(function (e) { return !watchOnly(e) && dn(e.d0) >= twToday(); })[0];
    if (nx) add(sl, span('sep', '·'), node('b', '', 'Next: '), whenTxt(nx) + ' · ' + calWhat(nx));
    $('tagLine').textContent = J.tagline || '';
    if (old) banner('warn', 'These numbers are ' + Math.round(age / 864e5) + ' days old.', ' The page has not been rebuilt since ' + fmtD(J.asof, true) + '; newer releases in the calendar are not in it yet.');
  }


  function renderHero() {
    var c = counts(), ov = J.overview || {};
    $('lead1').textContent = ov.lead || '';
    $('lead2').textContent = ov.lead2 || '';
    $('heroV').textContent = c.acc + ' of ' + c.n;
    var dots = $('dots'); clear(dots);
    ORDER.forEach(function (s) { var i = node('i', stOf(s.status).cls); i.title = label(s) + ': ' + stOf(s.status).word; dots.appendChild(i); });
    dots.setAttribute('aria-label', c.acc + ' of ' + c.n + ' parts speeding up, ' + c.std + ' steady, ' + c.slw + ' slowing');
    var dl = $('dotLabs'); clear(dl);
    add(dl, span('acc', c.acc + ' speeding up'), span('std', c.std + ' steady'), span('slw', c.slw + ' slowing'));
    $('heroDate').textContent = 'Parts of the AI supply chain, as of ' + fmtD(J.asof, true, true);
    var k = $('key1'); clear(k);
    add(k, node('b', '', 'The big number'), ' on each part is how many points faster (+) or slower (' + MINUS + ') it is growing than three months ago: growing 30% a year then and 40% now is ',
      node('b', '', '+10'), '. ', node('b', '', 'Growth'), ' is the typical company in each part, not the industry total.');
    renderLanes();
  }
  function laneItem(s) {
    var so = stOf(s.status), a = node('a', 'it'); a.href = '#p-' + s.id;
    var left = node('div'); add(left, node('div', 'it-n', label(s)), node('div', 'it-w', s.what || ''));
    var v = node('div', 'it-v'); add(v, span('b', ptsBox(s.accel_pp, so.cls)), span('u', ptsUnit(s.accel_pp)));
    var g = node('div', 'it-g');
    add(g, span('gr', growLine(s)));
    var rs = reasonTxt(s); if (rs) g.appendChild(span('mx', rs));
    add(a, left, v, g);
    a.setAttribute('aria-label', label(s) + ': ' + so.word + '. ' + (s.lead || '') + ' ' + (s.lead_num || ''));
    return a;
  }
  function renderLanes() {
    var host = $('lanes'); clear(host);
    var by = { acc: [], std: [], slw: [] };
    ORDER.forEach(function (s) { by[stOf(s.status).cls].push(s); });
    [['acc', 'Speeding up'], ['std', 'Steady'], ['slw', 'Slowing']].forEach(function (L) {
      var lane = node('section', 'lane ' + L[0]), h = node('h3', 'lane-h'), list = by[L[0]];
      lane.setAttribute('aria-label', L[1] + ': ' + list.length);
      add(h, arw(L[0]), L[1], span('c', String(list.length)));
      lane.appendChild(h);
      if (list.length) {
        var ol = node('ol');
        list.forEach(function (s) { var li = node('li'); li.appendChild(laneItem(s)); ol.appendChild(li); });
        lane.appendChild(ol);
      } else {
        var e = node('p', 'lane-none');
        if (L[0] === 'slw') {
          var ts = (J.top_slowing || []).slice(0, 3).map(function (m) { return m.name; });
          add(e, node('b', '', 'None.'), ' No part is slowing as a whole.');
          if (ts.length) { add(e, ' The biggest single slowdowns (' + andList(ts) + ') are in '); var a = node('a', '', 'Biggest moves'); a.href = '#movers'; add(e, a, '.'); }
        } else add(e, node('b', '', 'None.'), L[0] === 'acc' ? ' No part is speeding up as a whole right now.' : ' No part is steady right now.');
        lane.appendChild(e);
      }
      host.appendChild(lane);
    });
  }
  function renderNowText() {
    var how = $('howTo'); clear(how);
    add(how, 'Each part is a small group of companies or trade figures. Growth compares sales with the same months a year earlier. ',
      span('w-acc', 'Purple'), ' = speeding up, ', span('w-std', 'grey'), ' = steady, ', span('w-slw', 'amber'), ' = slowing, the same everywhere on this page.');
    var rn = $('rightNow'); clear(rn);
    var acc = ORDER.filter(function (s) { return stOf(s.status).cls === 'acc'; }), slw = ORDER.filter(function (s) { return stOf(s.status).cls === 'slw'; });
    var p1 = span('box-p');
    if (acc.length) {
      add(p1, span('w-acc', 'Speeding up most: '));
      acc.slice(0, 3).forEach(function (s, i) { add(p1, (i ? ', ' : ''), node('b', '', shortL(s)), ' ' + ptsNum(s.accel_pp)); });
      add(p1, ' points.');
    } else add(p1, 'No part is speeding up as a whole.');
    rn.appendChild(p1);
    if (slw.length) {
      var p2 = span('box-p');
      add(p2, span('w-slw', 'Slowing most: '));
      slw.slice(0, 3).forEach(function (s, i) { add(p2, (i ? ', ' : ''), node('b', '', shortL(s)), ' ' + ptsNum(s.accel_pp)); });
      add(p2, ' points.');
      rn.appendChild(p2);
    }

    var q = { faster: [], slower: [], same: [] }, one = 0, plan = null;
    J.segments.forEach(function (s) {
      var g = s.guide; if (!g || !g.word) return;
      if (/plan/.test(g.basis || '')) { plan = g.word; return; }
      (g.word === 'faster' ? q.faster : g.word === 'slower' ? q.slower : q.same).push(s);
      if (g.n === 1) one++;
    });
    var nq = q.faster.length + q.slower.length + q.same.length;
    if (nq) {
      var p3 = span('box-p');
      add(p3, span('w-std', 'Companies’ own forecasts for next quarter: '), 'faster in ', node('b', '', q.faster.length + ' of ' + nq), ' parts, about the same in ' + q.same.length +
        ', slower in ' + q.slower.length + (q.slower.length ? ' (' + q.slower.map(function (s) { return lowerLabel(shortL(s)); }).join(', ') + ')' : '') + '.' +
        (one ? ' ' + cap(numWord(one)) + ' of these ' + plural(one, 'rests', 'rest') + ' on a single company.' : '') +
        (plan ? ' Big tech’s yearly spending plans were ' + (plan === 'faster' ? 'raised' : plan === 'slower' ? 'cut' : 'kept about the same') + '.' : ''));
      rn.appendChild(p3);
    }
    var odd = ORDER.filter(function (s) { var w = s.guide && s.guide.word, k = stOf(s.status).cls; return (k === 'acc' && w === 'slower') || (k === 'slw' && w === 'faster'); });
    if (odd.length) {
      var p4 = span('box-p');
      odd.forEach(function (s, i) {
        add(p4, (i ? ' ' : ''), node('b', '', shortL(s)), stOf(s.status).cls === 'acc' ? ' are speeding up now, but their own forecast for next quarter is slower.' : ' are slowing now, but their own forecast for next quarter is faster.');
      });
      rn.appendChild(p4);
    }
  }


  function heatColumns() {
    var months = RANGES[RANGE], k = months / 3, all = {};
    J.segments.forEach(function (s) { s.T.forEach(function (p) { all[p.d] = 1; }); });
    var qe = Object.keys(all).filter(function (d) { return /-(03-31|06-30|09-30|12-31)$/.test(d) && dn(d) < ASOF - RECENT_DAYS; }).sort();
    var cols = qe.slice(Math.max(0, qe.length - k)).map(function (d) { return { d: d, today: false }; });
    cols.push({ d: J.asof, today: true });
    return cols;
  }
  function heatCell(s, d) {
    var H = J.heat; if (!H || !H.cols || !H.rows) return undefined;
    var ci = -1, row = null, i;
    for (i = 0; i < H.cols.length; i++) if (H.cols[i].d === d) ci = i;
    for (i = 0; i < H.rows.length; i++) if (H.rows[i].id === s.id) row = H.rows[i];
    if (ci < 0 || !row) return undefined;
    var c = row.cells[ci];
    return c ? { st: c.status, g: c.growth, a: c.accel_pp, b: c.breadth } : null;
  }
  function cellAt(s, col) {
    var h = heatCell(s, col.d);
    if (h !== undefined) return h;
    if (col.today) return { st: s.status.toLowerCase(), g: s.growth, a: s.accel_pp, b: s.breadth ? s.breadth.share_accelerating : null };
    for (var k = 0; k < s.T.length; k++) if (s.T[k].d === col.d) return { st: s.T[k].st, g: s.T[k].g, a: s.T[k].a, b: s.T[k].b };
    return null;
  }
  function heatGeo(n) {
    var W = $('heatWrap').clientWidth || 358, sw, cw, k;
    if (W >= 720) {
      sw = Math.max(180, Math.min(232, Math.round(W * 0.2)));
      cw = Math.floor((W - sw) / n);
      if (cw > 104) cw = 104;
      if (cw < 54) { cw = 54; k = Math.floor((W - sw) / cw); cw = Math.floor((W - sw) / k); sw = W - k * cw; return { W: W, sw: sw, cw: cw, k: k, scroll: true }; }
      sw = W - n * cw;
      return { W: W, sw: sw, cw: cw, k: n, scroll: false };
    }

    sw = W < 360 ? 96 : 104;
    k = Math.max(2, Math.floor((W - sw) / 58));
    if (k >= n) { k = n; }
    cw = Math.floor((W - sw) / k);
    sw = W - k * cw;
    return { W: W, sw: sw, cw: cw, k: k, scroll: k < n };
  }
  function renderHeat() {
    var t = $('heat'); clear(t);
    var cols = heatColumns(), G = heatGeo(cols.length), sc = $('heatScroll');
    var cg = node('colgroup'), c0 = node('col', 'cs'); cg.appendChild(c0);
    cols.forEach(function () { cg.appendChild(node('col', 'cc')); });
    t.appendChild(cg);
    t.style.setProperty('--sw', G.sw + 'px'); t.style.setProperty('--cw', G.cw + 'px');
    t.style.width = (G.sw + cols.length * G.cw) + 'px';
    sc.style.scrollPaddingLeft = G.sw + 'px';
    var wide = G.W >= 720;
    var thead = node('thead'), hr = node('tr');
    var h0 = node('th', 'sg', ''); h0.scope = 'col'; hr.appendChild(h0);
    cols.forEach(function (c) {
      var th = node('th', 'c' + (c.today ? ' today' : '')); th.scope = 'col';
      if (c.today) add(th, 'TODAY', span('y', fmtD(c.d)));
      else { var d = dOf(dn(c.d)); add(th, MON[d.getUTCMonth()], span('y', String(d.getUTCFullYear()))); }
      hr.appendChild(th);
    });
    thead.appendChild(hr); t.appendChild(thead);
    var tb = node('tbody');
    ORDER.forEach(function (s) {
      var tr = node('tr'), th = node('th', 'sg'); th.scope = 'row';
      var a = node('a', '', wide ? label(s) : shortL(s)); a.href = '#p-' + s.id;
      if (s.what) a.title = s.what;
      th.appendChild(a);
      tr.appendChild(th);
      cols.forEach(function (c) {
        var v = cellAt(s, c), td = node('td', 'c' + (c.today ? ' today' : '')), box = node('div');
        td.appendChild(box);
        if (!v || !stOf(v.st)) { td.className += ' na'; box.textContent = NDASH; td.title = label(s) + ': no numbers yet'; tr.appendChild(td); return; }
        var so = stOf(v.st);
        td.className += ' ' + so.cls;
        box.textContent = ptsBox(v.a, so.cls);
        var when = c.today ? 'today' : MON[dOf(dn(c.d)).getUTCMonth()] + ' ' + dOf(dn(c.d)).getUTCFullYear();
        td.title = label(s) + ', ' + when + ': ' + so.word + '. ' + (isPrice(s) ? 'Typical price forecast ' + pctTxt(v.g) + ' on the quarter before' : 'Typical growth ' + absTxt(v.g) + '% a year') +
          ', ' + ptsWords(v.a) + ' than three months before' + (v.b != null ? '; ' + v.b + '% of its companies faster' : '') + '.';
        td.setAttribute('aria-label', td.title);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    var lg = $('heatLegend'); clear(lg);
    function li(sw, text) { var i = span('lg-i'); add(i, sw, text); return i; }
    add(lg, li(span('lg-sw acc'), 'speeding up'), li(span('lg-sw'), 'steady'), li(span('lg-sw slw'), 'slowing'),
      li(span('lg-today'), 'today'), li(null, 'number = points faster (+) or slower (' + MINUS + ') than three months before'));
    sc.scrollLeft = sc.scrollWidth;
    $('heatHint').classList.toggle('off', !G.scroll);

    var nToday = 0, nYear = null, yi = -1, best = 1e9, target = ASOF - 365;
    cols.forEach(function (c, i) { if (c.today) return; var dd = Math.abs(dn(c.d) - target); if (dd < best && dd <= 60) { best = dd; yi = i; } });
    ORDER.forEach(function (s) {
      var v = cellAt(s, cols[cols.length - 1]); if (v && stOf(v.st) && stOf(v.st).cls === 'acc') nToday++;
      if (yi >= 0) { var w = cellAt(s, cols[yi]); if (w && stOf(w.st) && stOf(w.st).cls === 'acc') nYear = (nYear || 0) + 1; else if (nYear == null) nYear = 0; }
    });
    var l3 = $('lead3'); clear(l3);
    add(l3, 'Each row is one part; each box is the end of a quarter. Today ' + nToday + ' of ' + ORDER.length + ' parts are purple (speeding up)' +
      (yi >= 0 ? '; in ' + MON[dOf(dn(cols[yi].d)).getUTCMonth()] + ' ' + dOf(dn(cols[yi].d)).getUTCFullYear() + ', ' + nYear + ' ' + plural(nYear, 'was', 'were') + '.' : '.'));
    $('heatOrder').textContent = 'Colour is the overall call for the part. It also needs most of the part’s companies moving the same way, and a few points count for more in a slow-growing part, so the same number can be purple in one box and grey in another.';
    placeRing();
  }
  function placeRing() {
    var ring = $('todayRing'), sc = $('heatScroll'), t = $('heat');
    var top = t.querySelector('thead th.today'), cells = t.querySelectorAll('td.today');
    if (!top || !cells.length) { ring.classList.remove('on'); return; }
    var r0 = sc.getBoundingClientRect(), a = top.getBoundingClientRect(), b = cells[cells.length - 1].getBoundingClientRect();
    ring.style.left = (a.left - r0.left + sc.scrollLeft) + 'px';
    ring.style.top = (a.top - r0.top - 2) + 'px';
    ring.style.width = a.width + 'px';
    ring.style.height = (b.bottom - a.top + 4) + 'px';
    ring.classList.add('on');
  }


  function renderMovers() {
    var N0 = window.innerWidth < 600 ? 4 : 6;
    function fill(list, id, cls) {
      var ol = $(id); clear(ol);
      (list || []).forEach(function (m, i) {
        var li = node('li'); if (i >= N0 && !MV_OPEN) li.hidden = true;
        var l = node('div'), n = node('div', 'mv-n', m.name);
        if (m.ticker && !/^\d/.test(m.ticker)) n.appendChild(span('tk', m.ticker));
        var s = node('div', 'mv-s'), sg = SEG[m.segment_id];
        var price = /quarter before/.test(m.measure || '');
        add(s, (sg ? shortL(sg) : m.segment_label || m.segment) + ' · ', span('gg', price ? 'forecast ' + pctTxt(m.growth_prev) + ' → ' + pctTxt(m.growth) : changeWords(m.growth_prev, m.growth)), ' · ', span('nw', m.period || ''));
        add(l, n, s);
        li.title = m.name + ': ' + m.period + ', public ' + fmtD(m.public, true);
        var v = node('div', 'mv-v ' + cls); add(v, span('b', ptsNum(m.accel_pp)), span('u', ptsUnit(m.accel_pp)));
        add(li, l, v); ol.appendChild(li);
      });
      if (!ol.firstChild) ol.appendChild(node('li', 'mv-s', 'None right now.'));
    }
    fill(J.top_accelerating, 'mvUp', 'fast');
    fill(J.top_slowing, 'mvDown', 'slow');
    var mx = Math.max((J.top_accelerating || []).length, (J.top_slowing || []).length), b = $('mvMore');
    b.hidden = !(mx > N0);
    b.textContent = MV_OPEN ? 'Show fewer' : 'Show all ' + mx + ' each';
    b.setAttribute('aria-expanded', MV_OPEN ? 'true' : 'false');
    $('lead4').textContent = 'Whole parts move slowly; single companies and trade figures can swing a lot. These changed most against three months earlier.';
  }


  function memLead(m) {
    if (m.growth == null) return m.market && m.market.rel_3m != null ? 'Share price only here: no sales figures are collected for it.' : 'No numbers yet.';
    var so = stOf(m.state), g = m.growth, base = (g < 0 ? 'Down ' : 'Up ') + absTxt(g) + '% on a year earlier';
    if (!so) return base + '; there is no earlier reading to compare with.';
    if (so.cls === 'acc') return base + ', ' + ptsWords(m.accel_pp) + ' than three months before.';
    if (so.cls === 'slw') return (g >= 0 ? 'Still up ' : 'Down ') + absTxt(g) + '% on a year earlier, but ' + ptsWords(m.accel_pp) + ' than three months before.';
    return base + ', about as fast as three months before.';
  }
  function nextFor(prefix) {
    var re = prefix === 'kr' ? /^Korea's/ : prefix === 'tw' ? /^Taiwan's/ : /^US import/;
    return upcoming(twToday()).filter(function (e) { return re.test(e.what || '') && (e.parts || []).indexOf('trade') >= 0; })[0] || null;
  }
  function fact(k, v, s, vcls) { var d = node('div', 'fx'); add(d, span('k', k), span('v' + (vcls ? ' ' + vcls : ''), v), s ? span('s', s) : null); return d; }
  function chartKey() {
    var lg = node('p', 'legend chart-key');
    function li(sw, text) { var i = span('lg-i'); add(i, sw, text); return i; }
    add(lg, node('b', 'ck-t', 'Reading the small charts:'), li(span('lg-ser'), 'growth, % a year, as known at the time'));
    var st = span('lg-strip'); add(st, node('i', 'acc'), node('i', ''), node('i', 'slw'));
    add(lg, li(st, 'speeding up · steady · slowing, then'), li(span('lg-now'), 'now'), li(null, (HOVER ? 'Point at' : 'Tap') + ' a chart for any month.'));
    return lg;
  }
  function buildGroups() {
    var host = $('groups'); clear(host); PANELS = [];
    var used = {}, cards = [];
    GROUPS.forEach(function (g) {
      var ids = g.members ? (SEG[g.members] ? [g.members] : []) : g.segs.filter(function (id) { return SEG[id]; });
      if (!ids.length) return;
      ids.forEach(function (id) { used[id] = 1; });
      cards.push({ id: g.id, title: g.title, segIds: ids, memberMode: !!g.members });
    });
    J.segments.forEach(function (s) { if (!used[s.id]) cards.push({ id: s.id, title: label(s), segIds: [s.id], memberMode: false }); });
    cards.forEach(function (cd, ci) {
      var sec = node('section', 'card grp'); sec.id = 'g-' + cd.id; sec.setAttribute('aria-labelledby', 'tg-' + cd.id);
      var head = node('div', 'card-head'), ct = node('div', 'card-title'), h2 = node('h2'); h2.id = 'tg-' + cd.id;
      var sp = span('tspan', SPAN_WORDS[RANGE]); sp.setAttribute('data-span', '');
      add(h2, cd.title, span('tsep', ' · '), sp);
      var lead = node('p', 'lead');
      ct.appendChild(h2); ct.appendChild(lead); head.appendChild(ct); sec.appendChild(head);
      if (ci === 0) sec.appendChild(chartKey());
      if (cd.memberMode) { tradeCard(SEG[cd.segIds[0]], sec, ct, lead); host.appendChild(sec); return; }
      var segs = cd.segIds.map(function (id) { return SEG[id]; });
      var grid = node('div', 'pgrid n' + segs.length); sec.appendChild(grid);
      lead.textContent = groupLead(segs);
      segs.forEach(function (s) { grid.appendChild(segPanel(s)); });
      host.appendChild(sec);
    });
  }

  function tradeCard(ts, sec, ct, lead) {
    var so = stOf(ts.status);
    lead.textContent = ts.lead || '';
    if (ts.lead_num) ct.appendChild(node('p', 'lead2', ts.lead_num));
    var ms = ts.members.filter(function (m) { return m.H.length; });
    var wrap = node('div', 'tl-wrap'); wrap.id = 'p-' + ts.id;
    var st = node('div', 'pn-st ' + so.cls); add(st, arw(so.cls, true), so.chip, span('tl-what', ts.what || ''));
    wrap.appendChild(st);
    var wb = weekBlock(ts.id); if (wb) wrap.appendChild(wb);
    var ol = node('ol', 'tl');
    ms.forEach(function (m) {
      var ms0 = stOf(m.state), li = node('li', ms0 ? ms0.cls : '');
      var nm = node('div', 'tl-n'); add(nm, m.name, span('tl-p', (m.period || '') + (m.size ? ' · ' + m.size : '')));
      var v = node('div', 'tl-v'); add(v, span('b', pctTxt(m.growth)), span('u', 'a year'));
      var w = node('div', 'tl-c'); add(w, ms0 ? arw(ms0.cls, true) : null, m.accel_pp == null ? 'no earlier reading' : ptsWords(m.accel_pp) + ' than 3 months ago');
      add(li, nm, v, w); ol.appendChild(li);
    });
    wrap.appendChild(ol);
    sec.appendChild(wrap);
    var d = node('details', 'more-charts'), sm = node('summary', '', 'Show the ' + ms.length + ' trade charts');
    d.appendChild(sm);
    var grid = node('div', 'pgrid n2');
    ms.forEach(function (m) { grid.appendChild(memberPanel(m, ts)); });
    d.appendChild(grid);
    d.addEventListener('toggle', function () { if (d.open) PANELS.forEach(function (P) { if (P.kind === 'm' && !P.geo) drawPanel(P); }); });
    sec.appendChild(d);
  }
  function groupLead(segs) {
    var by = { acc: [], std: [], slw: [] };
    segs.forEach(function (s) { by[stOf(s.status).cls].push(s); });
    var n = segs.length, names = function (l) { return andList(l.map(function (s) { return lowerLabel(shortL(s)); })); };
    if (n === 1) return label(segs[0]) + ' is ' + stOf(segs[0].status).word + '.';
    if (by.acc.length === n) return 'All ' + numWord(n) + ' parts here are speeding up.';
    if (by.std.length === n) return 'All ' + numWord(n) + ' parts here are steady.';
    if (by.slw.length === n) return 'All ' + numWord(n) + ' parts here are slowing.';
    var out = [];
    [['acc', 'speeding up'], ['std', 'steady'], ['slw', 'slowing']].forEach(function (k) {
      var l = by[k[0]]; if (!l.length) return;
      out.push(numWord(l.length) + (out.length ? '' : ' of these ' + numWord(n) + ' parts') + ' ' + plural(l.length, 'is', 'are') + ' ' + k[1] + ' (' + names(l) + ')');
    });
    if (!by.slw.length) out.push('none is slowing');
    return cap(out.join('; ')) + '.';
  }
  function panelShell(cls, stCls, stTxt) {
    var pn = node('article', 'pn ' + cls), st = node('div', 'pn-st');
    add(st, arw(stCls || 'std', true), stTxt);
    pn.appendChild(st);
    return pn;
  }
  function speedFact(s) {
    var b = s.breadth, priceOnly = s.members.filter(function (m) { return m.growth == null && m.market; }).length;
    if (b && b.n === 1) {
      var one = s.members.filter(function (m) { return m.growth != null; })[0], so1 = one && stOf(one.state);
      if (one && so1) return fact(one.name, so1.word, priceOnly ? priceOnly + ' more ' + plural(priceOnly, 'is', 'are') + ' share price only' : '', so1.cls === 'acc' ? 'faster' : so1.cls === 'slw' ? 'slower' : '');
    }
    var lab = isPrice(s) ? 'Forecasts higher' : s.noun === 'clouds' ? 'Clouds speeding up' : s.noun === 'trade figures' ? 'Trade figures speeding up' : s.noun === 'companies' ? 'Companies speeding up' : 'Speeding up';
    if (!b) return fact(lab, NDASH);
    var sub = (b.slowing ? b.slowing + (isPrice(s) ? ' lower' : ' slower') : 'none ' + (isPrice(s) ? 'lower' : 'slower')) +
      (priceOnly ? ' · ' + priceOnly + ' more ' + plural(priceOnly, 'is', 'are') + ' share price only' : '');
    return fact(lab, b.accelerating + ' of ' + b.n, sub);
  }
  function guideFact(s) {
    var g = s.guide;
    if (g && g.word) {
      if (/plan/.test(g.basis || '')) return fact('Yearly spending plans', g.word === 'faster' ? 'raised' : g.word === 'slower' ? 'cut' : 'about the same', g.n + ' ' + plural(g.n, 'company', 'companies') + '’ plans', g.word === 'faster' ? 'faster' : g.word === 'slower' ? 'slower' : '');
      return fact('Their own forecast', g.word, 'next quarter · ' + (g.n === 1 ? 'one company' : g.n + ' companies'), g.word === 'faster' ? 'faster' : g.word === 'slower' ? 'slower' : '');
    }
    return fact('Their own forecast', NDASH, 'none given');
  }
  function nextFact(nx) {
    if (nx && nx.d0) {
      var f = fact('Next update', whenTxt(nx), (nx.what || '').replace(/\s*\(monthly filings\)/, '')); f.className += ' nx';
      if (nx.then && nx.then.d0) add(f.querySelector('.s'), ' · then ' + nx.then.what.replace(/\s*\(.*?\)/g, '').replace(/ quarterly results.*$/, '') + ', ', span('nw', whenTxt(nx.then)));
      return f;
    }
    var f0 = fact('Next update', 'No fixed date', 'checked by hand'); f0.className += ' nx'; return f0;
  }
  function segPanel(s) {
    var so = stOf(s.status), pn = panelShell(so.cls, so.cls, so.chip); pn.id = 'p-' + s.id;
    var h = node('div', 'pn-h'), l = node('div');
    add(l, node('h3', 'pn-n', label(s)), node('div', 'pn-w', s.what || ''));
    var v = node('div', 'pn-v'); add(v, span('b', pctTxt(s.growth)), span('u', isPrice(s) ? 'on the quarter before' : 'a year' + (s.typical ? ', typical' : '')));
    add(h, l, v); pn.appendChild(h);
    var txt = node('div', 'pn-txt');
    txt.appendChild(node('p', 'pn-l', s.lead || ''));
    if (s.lead_num) txt.appendChild(node('p', 'pn-l2', s.lead_num));
    pn.appendChild(txt);
    var wb = weekBlock(s.id); if (wb) pn.appendChild(wb);
    var P = { kind: 's', s: s, pn: pn };
    P.ro = node('div', 'pn-ro'); pn.appendChild(P.ro);
    P.def = function () {
      var r = P.ro; clear(r);
      if (s.freshest && s.freshest.date) add(r, 'Newest: ', node('b', '', fmtD(s.freshest.date)), ' · ' + (s.freshest.what || '').replace(/, (3 months to|forecast for) .*$/, ''));
    };
    P.chart = node('div', 'chart'); P.chart.tabIndex = 0; P.chart.setAttribute('role', 'img');
    P.chart.setAttribute('aria-label', label(s) + ': growth as known at each month end. Left and right arrows step through the months.');
    pn.appendChild(P.chart);
    var f = node('div', 'pn-f');
    f.appendChild(speedFact(s));
    if (!isPrice(s)) f.appendChild(guideFact(s));
    f.appendChild(nextFact(s.next_update));
    pn.appendChild(f);
    pn.appendChild(memberList(s));
    PANELS.push(P);
    wireChart(P);
    return pn;
  }
  function memberPanel(m, s) {
    var so = stOf(m.state), pn = panelShell(so ? so.cls : '', so ? so.cls : 'std', so ? so.chip : 'NO CHANGE YET'); pn.id = 'p-' + m.id;
    var h = node('div', 'pn-h'), l = node('div');
    add(l, node('h3', 'pn-n', m.name), node('div', 'pn-w', 'Value against a year earlier' + (m.size ? ' · ' + m.size : '')));
    var v = node('div', 'pn-v'); add(v, span('b', pctTxt(m.growth)), span('u', 'a year'));
    add(h, l, v); pn.appendChild(h);
    pn.appendChild(node('p', 'pn-l', memLead(m)));
    var P = { kind: 'm', m: m, s: s, pn: pn };
    P.ro = node('div', 'pn-ro'); pn.appendChild(P.ro);
    P.def = function () { var r = P.ro; clear(r); if (m.public) add(r, 'Newest: ', node('b', '', fmtD(m.public)), ' · ' + (m.period || '')); };
    P.chart = node('div', 'chart'); P.chart.tabIndex = 0; P.chart.setAttribute('role', 'img');
    P.chart.setAttribute('aria-label', m.name + ': growth as known on each release. Left and right arrows step through the releases.');
    pn.appendChild(P.chart);
    var f = node('div', 'pn-f');
    f.appendChild(fact('Three months before', growWords(m.growth_prev)));
    f.appendChild(fact('Change', m.accel_pp == null ? NDASH : ptsNum(m.accel_pp) + ' ' + plural(Math.abs(m.accel_pp), 'point', 'points'), so ? so.word : '', so && so.cls === 'acc' ? 'faster' : so && so.cls === 'slw' ? 'slower' : ''));
    var nx = nextFor((m.id || '').slice(0, 2));
    f.appendChild(nx ? fact('Next update', whenTxt(nx), calWhat(nx)) : fact('Next update', NDASH));
    pn.appendChild(f);
    PANELS.push(P);
    wireChart(P);
    return pn;
  }
  function memberList(s) {
    var d = node('details', 'pn-m'), sm = node('summary');
    var co = s.members.filter(function (m) { return m.growth != null; }).length;
    var po = s.members.filter(function (m) { return m.growth == null && m.market; }).length;
    add(sm, add(span('sm-t'), (co === 1 ? 'The ' + nounOf(s, 1) : 'The ' + co + ' ' + nounOf(s, co)), po ? span('nw', ' (+' + po + ' price only)') : null));
    d.appendChild(sm);
    var ol = node('ol', 'ml');
    s.members.forEach(function (m) {
      var so = stOf(m.state), li = node('li');
      var a = so ? arw(so.cls, true) : span('arw sm std'), mid = node('div', 'mn');
      add(mid, m.name, m.ticker ? span('tk', m.ticker) : null, m.stale ? span('old', 'OLD') : null);
      var bits = [];
      if (m.growth == null) bits.push('share price only, no sales figures here');
      else bits.push((m.period || '') + (m.public ? ', public ' + fmtD(m.public) : ''));
      if (m.guide && m.guide.word) bits.push(/plan/.test(m.guide.period || '') ? 'spending plan ' + (m.guide.word === 'faster' ? 'raised' : m.guide.word === 'slower' ? 'cut' : 'about the same') : 'own forecast ' + m.guide.word);
      else if (m.guide && m.guide.text && /plan/.test(m.guide.period || '')) bits.push(m.guide.text.replace(/^(\d{4}) plan/, '$1 spending plan') + (m.guide.press_sourced ? ' (press report)' : ''));
      else if (m.plan_note && m.plan_note.text) bits.push(m.plan_note.text);
      if (m.market && m.market.rel_3m != null) bits.push('share price ' + priceVs(m.market.rel_3m));
      mid.appendChild(span('ms', bits.join(' · ')));
      var v = node('div', 'mv');
      if (m.growth == null) add(v, span('b', NDASH), span('s', 'no sales figures'));
      else add(v, span('b' + (so ? ' ' + so.cls : ''), m.accel_pp == null ? 'no change yet' : ptsNum(m.accel_pp) + ' ' + plural(Math.abs(m.accel_pp), 'point', 'points')), span('s', isPrice(s) ? 'prices ' + pctTxt(m.growth) + ' on the quarter before' : growWords(m.growth)));
      add(li, a, mid, v);
      ol.appendChild(li);
    });
    d.appendChild(ol);
    return d;
  }


  function view() {
    var months = RANGES[RANGE], x1 = ASOF, x0 = x1 - months * 30.4375;
    return { x0: x0, x1: x1 + Math.max(4, (x1 - x0) * 0.015) };
  }
  function seriesOf(P) {
    if (P.kind === 's') return { t: P.s.TT, v: P.s.T.map(function (p) { return p.g; }), st: P.s.T.map(function (p) { return p.st; }), a: P.s.T.map(function (p) { return p.a; }), per: null };
    return { t: P.m.HT, v: P.m.H.map(function (h) { return h.g; }), st: null, a: null, per: P.m.H.map(function (h) { return h.per; }) };
  }
  function timeTicks(x0, x1, X, R) {
    var span0 = x1 - x0, step = span0 < 500 ? 3 : 12, out = [], last = -1e9;
    var y0 = dOf(x0).getUTCFullYear(), y1 = dOf(x1).getUTCFullYear();
    for (var y = y0; y <= y1; y++) for (var m = 0; m < 12; m += step) {
      var t = Date.UTC(y, m, 1) / 864e5; if (t < x0 || t > x1) continue;
      var lab = m === 0 ? String(y) : MON[m], w = textW(lab, 11), x = X(t);
      var show = x - w / 2 > last + 10 && x + w / 2 <= R && x - w / 2 >= 0;
      if (show) last = x + w / 2;
      out.push({ dn: t, label: lab, show: show, major: m === 0 });
    }
    return out;
  }
  function drawPanel(P) {
    var Wraw = P.chart.clientWidth || P.chart.getBoundingClientRect().width;
    if (!(Wraw > 0)) return;
    var W = Math.max(240, Math.round(Wraw)), RA = 40, L = 0, pw = W - RA - L, plotH = W >= 480 ? 112 : 88;
    var stripH = P.kind === 's' ? 6 : 0, axH = 18, H = plotH + (stripH ? stripH + 4 : 0) + axH;
    var v = view(), x0 = v.x0, x1 = v.x1, X = lin(x0, x1, L, L + pw);
    var svg = svgFor(P.chart, W, H), ser = seriesOf(P), t = ser.t, vv = ser.v, n = t.length;
    var g = el('g', {}, svg), top = 6, bot = plotH;
    el('rect', { x: L, y: 0, width: pw, height: plotH, fill: '#191D28', rx: 4 }, g);
    var j0 = Math.max(0, bsearchLE(t, x0)), lo = 0, hi = 0, j;
    for (j = j0; j < n; j++) { lo = Math.min(lo, vv[j]); hi = Math.max(hi, vv[j]); }
    if (hi - lo < 1) hi = lo + 1;
    var spn = hi - lo, aLo = lo < 0 ? lo - spn * 0.08 : 0, aHi = hi + spn * 0.12;
    var Y = lin(aLo, aHi, bot - 2, top + 6);
    var step = tickStep(aHi - aLo, bot - top, 40), yt = [];
    for (var q = Math.ceil(aLo / step - 1e-9) * step; q <= aHi + 1e-9; q += step) yt.push(Math.round(q * 1000) / 1000);
    yt.forEach(function (q2) {
      var py = Y(q2); if (py < top + 4) return;
      el('line', { x1: L, x2: L + pw, y1: py, y2: py, stroke: q2 === 0 && aLo < 0 ? C.muted : C.line, 'stroke-width': 1, opacity: 0.8 }, g);
      tx(g, L + pw + 6, py + 3.5, fmtAxis(q2), { fill: C.muted, 'font-size': 10.5 });
    });
    var ticks = timeTicks(x0, x1, X, L + pw + RA);
    ticks.forEach(function (tk) {
      var px = X(tk.dn); if (px < L || px > L + pw) return;
      if (tk.major) el('line', { x1: px, x2: px, y1: 0, y2: plotH, stroke: C.line, 'stroke-width': 1, opacity: 0.9 }, g);
      if (tk.show) tx(g, px, H - 4, tk.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle', 'font-weight': tk.major ? 600 : 400 });
    });
    var clip = clipFor(svg, L, 0, pw, plotH), top2 = el('g', {}, svg), xEnd = X(ASOF);
    var has = n > 0 && t[n - 1] >= x0 - 400 && t[0] <= x1;
    if (has) {
      var path = '', yv;
      for (j = j0; j < n; j++) {
        var px2 = Math.max(L, X(t[j])); yv = Y(vv[j]);
        path += j === j0 ? 'M' + px2.toFixed(1) + ' ' + yv.toFixed(1) : 'H' + px2.toFixed(1) + 'V' + yv.toFixed(1);
      }
      path += 'H' + xEnd.toFixed(1);
      var yz = Y(Math.max(aLo, Math.min(aHi, 0))).toFixed(1);
      el('path', { d: path + 'V' + yz + 'H' + Math.max(L, X(t[j0])).toFixed(1) + 'Z', fill: C.fear, 'fill-opacity': 0.34, stroke: 'none', 'clip-path': clip }, g);
      el('path', { d: path, fill: 'none', stroke: C.light, 'stroke-width': 1.6, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
      if (xEnd >= L && xEnd <= L + pw + 1) nowDot(top2, xEnd, Y(vv[n - 1]), 3.8);
    } else tx(g, L + pw / 2, plotH / 2 + 4, 'no numbers in this window', { fill: C.muted, 'font-size': 11.5, 'text-anchor': 'middle' });
    if (stripH) {
      var sy = plotH + 4, sclip = clipFor(svg, L, sy, pw, stripH), sg = el('g', {}, svg);
      for (j = j0; j < n; j++) {
        var a2 = Math.max(L, X(t[j])), b2 = j + 1 < n ? X(t[j + 1]) : xEnd + 1, so = stOf(ser.st[j]);
        if (b2 < L || a2 > L + pw) continue;
        el('rect', { x: a2.toFixed(1), y: sy, width: Math.max(0.5, b2 - a2 - 0.6).toFixed(1), height: stripH, rx: 1, fill: so ? (so.cls === 'acc' ? C.fear : so.cls === 'slw' ? C.amber : C.steady) : C.bg, 'clip-path': sclip }, sg);
      }
    }
    P.cross = el('g', { 'pointer-events': 'none' }, svg);
    P.geo = { W: W, L: L, pw: pw, X: X, Y: Y, x0: x0, x1: x1, plotH: plotH, ser: ser };
    setPick(P, P.pick);
  }
  function setPick(P, j) {
    var G = P.geo; if (!G) return;
    clear(P.cross);
    if (j == null || j < 0) { P.pick = null; P.def(); return; }
    P.pick = j;
    var ser = G.ser, x = Math.max(G.L, G.X(ser.t[j])), xr = j + 1 < ser.t.length ? G.X(ser.t[j + 1]) : G.X(ASOF);
    var cx = Math.min(G.L + G.pw, (x + xr) / 2);
    el('line', { x1: cx, x2: cx, y1: 0, y2: G.plotH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, P.cross);
    el('circle', { cx: cx, cy: G.Y(ser.v[j]), r: 3.8, fill: C.light, stroke: '#fff', 'stroke-width': 1.2 }, P.cross);
    var r = P.ro; clear(r);
    if (P.kind === 's') {
      var so = stOf(ser.st[j]), isLast = j === ser.t.length - 1;
      add(r, node('b', '', isLast ? 'Now' : 'End of ' + MON[dOf(ser.t[j]).getUTCMonth()] + ' ' + dOf(ser.t[j]).getUTCFullYear()), ' · ' +
        (isPrice(P.s) ? 'price forecast ' + pctTxt(ser.v[j]) : growWords(ser.v[j])) + (ser.a[j] != null ? ', ' + (ser.a[j] === 0 ? 'about as fast as' : ptsWords(ser.a[j]) + ' than') + ' three months before' : '') + ' · ');
      if (so) r.appendChild(span(so.cls, so.word));
    } else {
      add(r, node('b', '', ser.per[j]), ' · ' + pctTxt(ser.v[j]) + ' on a year earlier · public ' + fmtD(P.m.H[j].d));
    }
  }
  function wireChart(P) {
    var ch = P.chart, down = false;
    function idxAt(e) {
      var G = P.geo; if (!G) return null;
      var svg = ch.querySelector('svg'); if (!svg) return null;
      var r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * (G.W / r.width);
      if (px < G.L || px > G.L + G.pw + 2) return null;
      var d = G.X.inv(Math.min(px, G.L + G.pw)), j = bsearchLE(G.ser.t, d);
      return j < 0 ? null : j;
    }
    ch.addEventListener('pointerdown', function (e) { down = true; setPick(P, idxAt(e)); });
    ch.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || down) setPick(P, idxAt(e)); });
    ch.addEventListener('pointerup', function () { down = false; });
    ch.addEventListener('pointercancel', function () { down = false; });
    ch.addEventListener('pointerleave', function (e) { down = false; if (e.pointerType === 'mouse') setPick(P, null); });
    ch.addEventListener('keydown', function (e) {
      var G = P.geo; if (!G) return;
      var n = G.ser.t.length, first = Math.max(0, bsearchLE(G.ser.t, G.x0)), cur = P.pick == null ? n - 1 : P.pick, nx = cur;
      if (e.key === 'ArrowLeft') nx = Math.max(first, cur - 1);
      else if (e.key === 'ArrowRight') nx = Math.min(n - 1, cur + 1);
      else if (e.key === 'Escape' || e.key === 'End') { e.preventDefault(); setPick(P, null); return; }
      else return;
      e.preventDefault(); setPick(P, nx);
    });
  }
  function drawAll() { PANELS.forEach(function (P) { P.pick = null; P.geo = null; drawPanel(P); }); }


  function renderCal() {
    var today = twToday(), list = upcoming(today);
    var partName = function (id) { return SEG[id] ? shortL(SEG[id]) : id; };
    function item(e) {
      var a = dn(e.d0), b = dn(e.d1 || e.d0), now = today >= a && today <= b, li = node('li', (now ? 'today' : '') + (watchOnly(e) ? ' watch' : ''));
      var lc = node('div'), dc = span('dchip');
      if (e.est) dc.appendChild(span('ab', 'about '));
      dc.appendChild(document.createTextNode(fmtSpan(e.d0, e.d1)));
      add(lc, dc, span('wd', now ? 'now' : wdSpan(e.d0, e.d1)));
      var rc = node('div'), w = node('div', 'w', calWhat(e));
      rc.appendChild(w);
      var nn = node('div', 'n');
      if (watchOnly(e)) nn.appendChild(span('watch', 'Watch only: not in these numbers'));
      else e.parts.forEach(function (p) { if (SEG[p]) nn.appendChild(span('tag', partName(p))); });
      rc.appendChild(nn);
      add(li, lc, rc); return li;
    }
    var phone = window.innerWidth < 600, horizon = phone ? 14 : 30;
    var soon = list.filter(function (e) { return dn(e.d0) <= today + horizon; }), later = list.slice(soon.length);
    var cols = [soon, later];
    $('calMore').hidden = !later.length;
    $('calMoreSum').textContent = 'Later releases (' + later.length + ')';
    [$('cal'), $('cal3')].forEach(function (ol, k) {
      clear(ol); var lastM = null;
      cols[k].forEach(function (e) {
        var m = dOf(dn(e.d0)), key = m.getUTCFullYear() * 12 + m.getUTCMonth();
        if (key !== lastM) { lastM = key; ol.appendChild(node('li', 'mh', MONTH[m.getUTCMonth()].toUpperCase() + ' ' + m.getUTCFullYear())); }
        ol.appendChild(item(e));
      });
    });
    $('lead9').textContent = 'A part only changes when new numbers come out. Here ' + (phone ? 'are the next two weeks' : 'is the next month') + ', in date order; later dates are folded below.';
    var nf = J.segments.filter(function (s) { return s.next_update && !s.next_update.d0 && s.next_update.what; });
    $('calNote').textContent = 'Taiwan items in Taiwan dates, Korea in Korea dates, US in US dates. “About” = the date is not confirmed yet.' +
      (nf.length ? ' ' + nf.map(function (s) { return label(s) + ': ' + s.next_update.what.replace(/^No fixed date[:.]?\s*/i, 'no fixed date; '); }).join(' ') : '');
  }


  function renderDetails() {
    var t = $('allTable'); clear(t);
    var thead = node('thead'), hr = node('tr');
    [['Company or trade figure', 'l'], ['Status', 'l'], ['Growth now', ''], ['3 months before', ''], ['Change, points', ''], ['Period', 'l'], ['Public', ''], ['Their own forecast or plan', 'l'], ['Share price vs chip stocks', '']]
      .forEach(function (h) { var th = node('th', h[1], h[0]); th.scope = 'col'; hr.appendChild(th); });
    thead.appendChild(hr); t.appendChild(thead);
    var tb = node('tbody');
    ORDER.forEach(function (s) {
      var so = stOf(s.status), gh = node('tr', 'gh'), td = node('td'); td.colSpan = 9;
      add(td, label(s), span('st ' + so.cls, so.chip));
      if (s.market && s.market.rel_3m != null) td.appendChild(span('gp', 'typical share price ' + priceVs(s.market.rel_3m)));
      gh.appendChild(td); tb.appendChild(gh);
      s.members.forEach(function (m) {
        var tr = node('tr'), ms = stOf(m.state);
        var c0 = node('td', 'l tw'); add(c0, m.name, m.ticker ? span('tk', ' ' + m.ticker) : null, m.stale ? span('old', 'OLD') : null); tr.appendChild(c0);
        tr.appendChild(node('td', 'l' + (ms ? ' ' + ms.cls : ''), ms ? ms.word : m.growth == null ? 'price only' : 'no change yet'));
        tr.appendChild(node('td', '', m.growth == null ? NDASH : pctTxt(m.growth)));
        tr.appendChild(node('td', '', m.growth_prev == null ? NDASH : pctTxt(m.growth_prev)));
        tr.appendChild(node('td', ms ? ms.cls : '', m.accel_pp == null ? NDASH : ptsNum(m.accel_pp)));
        tr.appendChild(node('td', 'l dw', [m.period, m.size].filter(Boolean).join(' · ') || NDASH));
        tr.appendChild(node('td', '', m.public ? fmtD(m.public) : NDASH));
        var g = m.guide, gtxt = NDASH;
        if (g) gtxt = [g.word, g.growth != null ? pctTxt(g.growth) + ' a year' : null, g.chg_pp != null ? ptsNum(g.chg_pp) + ' ' + plural(Math.abs(g.chg_pp), 'point', 'points') : null, (g.text || '') + (g.press_sourced ? ' (press report)' : ''), g.public ? 'public ' + fmtD(g.public) : null].filter(Boolean).join(' · ');
        else if (m.plan_note && m.plan_note.text) gtxt = m.plan_note.text + (m.plan_note.public ? ' · public ' + fmtD(m.plan_note.public) : '');
        tr.appendChild(node('td', 'l tw', gtxt));
        var mk = m.market;
        tr.appendChild(node('td', '', mk && mk.rel_3m != null ? priceWords(mk.rel_3m) : NDASH));
        tb.appendChild(tr);
      });
    });
    t.appendChild(tb);
    $('allHint').textContent = 'Growth is against the same months a year earlier. Change is in points against the reading three months earlier. Share price vs chip stocks is the last 3 months: price, not sales, and it counts in no status.';
    var gl = $('gapList'); clear(gl);
    (J.gaps || []).forEach(function (g) { gl.appendChild(node('li', '', g)); });
    var nb = $('notesBody'); clear(nb);
    var N = J.notes || {};
    [['Growth', N.growth], ['Their own forecasts', N.guide], ['Share prices', N.market], ['Dates', N.dates]].forEach(function (r) {
      if (!r[1]) return; var p = node('p'); add(p, node('b', '', r[0] + ': '), r[1]); nb.appendChild(p);
    });
    $('censusLine').textContent = N.census || '';
    $('footCensus').textContent = N.census || '';
    $('footTag').textContent = J.tagline || '';
  }



  var F = null, FSEG = {}, WK_OPEN = false, WK_FIRST = 5;
  var FST = { 'SPEEDING UP': { cls: 'acc', word: 'speeding up', rank: 0 }, 'SLOWING': { cls: 'slw', word: 'slowing', rank: 1 },
    'STEADY': { cls: 'std', word: 'steady', rank: 2 } };
  function fstOf(s) { return s ? FST[s] || null : null; }
  var ACLS = { up: 'acc', down: 'slw', flat: 'std' };
  var DIRW = { up: 'up', down: 'down', flat: 'no clear change', none: 'no reading yet' };
  var KINDS = [
    { k: 'market', name: 'Share prices', short: 'Prices', sub: 'vs chip stocks' },
    { k: 'money', name: 'Foreign buying', short: 'Foreign', sub: 'Taiwan stocks' },
    { k: 'hard', name: 'New figures', short: 'Figures', sub: 'exports, sales' },
    { k: 'attention', name: 'Interest', short: 'Interest', sub: 'reading, talk, search' }
  ];
  var CHG_KIND = { status: 'This week’s word', market: 'Share prices', attention: 'Interest', 'new figures': 'New figures',
    money: 'Foreign buying', hard: 'New figures' };
  function fa(dir, sm) { var a = span('fa ' + (ACLS[dir] || 'na') + (sm ? ' sm' : '')); a.setAttribute('aria-hidden', 'true'); return a; }
  function fbadge(fs) {
    var st = fstOf(fs.fast_status);
    return span('fb ' + (st ? st.cls : 'na'), st ? fs.fast_status : 'NOT ENOUGH YET');
  }
  function fastPrepare(d) {
    if (!d || !Array.isArray(d.segments) || !d.segments.length || !d.asof) return null;
    FSEG = {}; d.segments.forEach(function (s) { if (s && s.id) FSEG[s.id] = s; });
    return d;
  }
  function attDate() {
    var a = F.segments.map(function (s) { return s.readings && s.readings.attention && s.readings.attention.date; }).filter(Boolean).sort();
    return a.length ? a[a.length - 1] : null;
  }

  function readingLines(k, r) {
    var out = [];
    if (!r) return out;
    if (k === 'market' && r.vs_chips_1w != null)
      out.push('Against the big chip stocks: ' + pctTxt(r.vs_chips_1m) + ' this month, ' + pctTxt(r.vs_chips_3m) + ' over 3 months, ' + pctTxt(r.vs_chips_1w) + ' in the last week.');
    if (k === 'money') (r.items || []).forEach(function (it) {
      if (it.day_pct != null) out.push(it.what + ': ' + pctTxt(it.day_pct) + ' on ' + fmtD(it.date) + (it.week_pct != null ? ', ' + pctTxt(it.week_pct) + ' over the week' : '') + '.');
      else if (it.held_pct != null) out.push(it.what + ': ' + absTxt(it.held_pct) + '% on ' + fmtD(it.date) + (it.week_chg != null ? ' (' + ptsNum(it.week_chg) + ' points over the week)' : '') + '.');
    });
    if (k === 'money' && r.overseas_premium && r.overseas_premium.premium_pct != null) {
      var op = r.overseas_premium;
      out.push(op.what + ': ' + pctTxt(op.premium_pct) + ' (a month ago ' + pctTxt(op.last_month_pct) + ', two months ago ' + pctTxt(op.month_before_pct) + '). A price gap, shown for context only.');
    }
    if (k === 'hard') (r.items || []).forEach(function (it) {
      if (it.growth_pct != null) out.push(it.what + ': ' + pctTxt(it.growth_pct) + ' on a year earlier' + (it.prev_month_pct != null ? ' (the month before: ' + pctTxt(it.prev_month_pct) + ')' : '') + (it.public ? ', public ' + fmtD(it.public) : '') + '.');
      else if (it.filed != null) out.push(it.what + ': ' + it.filed + ' of ' + it.of + '.');
      else if (it.tracked != null) out.push(it.what + ': ' + it.tracked + ' prices followed since ' + fmtD(it.since) + '; they start to count on ' + fmtD(it.first_read) + '.');
    });
    if (k === 'attention' && r.interest != null && !(r.sources && r.sources.length))
      out.push('Interest ' + r.interest + ' out of 100 (100 = the most-read week of the past year)' + (r.vs_year_ago_pct != null ? ', ' + pctTxt(r.vs_year_ago_pct) + ' on a year ago' : '') + '.');
    if (k === 'attention') (r.usage || []).forEach(function (u) { if (u.vs_year_ago != null) out.push(u.what + ': ' + pctTxt(u.vs_year_ago) + ' on a year ago (' + fmtD(u.date) + ').'); });
    if (r.note) out.push(r.note);
    return out;
  }

  function sourceRows(list) {
    var ol = node('ol', 'src');
    var rank = function (x) { return x.not_in_yet ? 2 : x.context_only ? 1 : 0; };
    list.slice().sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (x) {
      var dir = x.arrow && x.arrow !== 'none' ? x.arrow : 'none';
      var li = node('li', x.not_in_yet ? 'later' : x.context_only ? 'ctx' : '');
      var b = node('div', 'src-b'), h = node('div', 'src-n');
      add(h, x.name || x.id, x.context_only ? span('src-tag', 'context') : null, x.not_in_yet ? span('src-tag', 'not in yet') : null,
        x.date && !x.not_in_yet ? span('src-d', fmtD(x.date)) : null);
      add(b, h, node('div', 'src-t', x.text || ''));
      add(li, fa(dir, true), b); ol.appendChild(li);
    });
    return ol;
  }
  function readingWhen(k, r) {
    if (!r) return '';
    if (k === 'market' && r.date) return 'As of the ' + fmtD(r.date) + ' close · daily';
    if (k === 'attention' && r.date) return 'Data to ' + fmtD(r.date) + ', public ' + fmtD(r.public) + ' · daily';
    return r.frequency ? cap(r.frequency) : '';
  }
  function weekDots(fs, cls) {
    var w = node('span', cls || 'wdots'), wk = fs.weeks || [];
    wk.forEach(function (p, i) {
      var st = fstOf(p[1]), d = node('i', (st ? st.cls : 'na') + (i === wk.length - 1 ? ' now' : ''));
      d.title = 'Week to ' + fmtD(p[0], true) + ': ' + (st ? st.word : 'not enough readings');
      w.appendChild(d);
    });
    w.setAttribute('role', 'img');
    var n = { acc: 0, slw: 0 }; wk.forEach(function (p) { var st = fstOf(p[1]); if (st && n[st.cls] != null) n[st.cls]++; });
    w.setAttribute('aria-label', 'Last ' + wk.length + ' weeks: ' + n.acc + ' speeding up, ' + n.slw + ' slowing, the rest steady');
    return w;
  }

  function weekBlock(id) {
    var fs = FSEG[id]; if (!fs || !fs.readings) return null;
    var st = fstOf(fs.fast_status), was = fstOf(fs.fast_status_last_week);
    var box = node('div', 'wk ' + (st ? st.cls : 'na'));
    var h = node('div', 'wk-h');
    add(h, span('wk-t', 'This week'), fbadge(fs));
    if (st && was && was !== st) h.appendChild(span('wk-was', 'was ' + was.word));
    box.appendChild(h);
    var chips = node('div', 'wk-chips'), line = node('div', 'wk-line'), sel = null;
    chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'This week’s readings for ' + (fs.label || fs.name));
    function showLead() {
      clear(line);
      line.appendChild(node('p', 'wk-l', fs.lead || ''));
      if (/other way/.test(fs.agreement || '')) line.appendChild(node('p', 'wk-ag', 'This week points the other way from the 3-month picture above.'));
      line.appendChild(node('p', 'wk-tap', (HOVER ? 'Click' : 'Tap') + ' a reading for its numbers and date.'));
    }
    function showOne(K, r, dir) {
      clear(line);
      var t = node('p', 'wk-l'); add(t, node('b', ACLS[dir] || '', K.name + ': ' + DIRW[dir] + '. '), r.text || ''); line.appendChild(t);
      if (K.k === 'attention' && r.sources && r.sources.length) line.appendChild(sourceRows(r.sources));
      readingLines(K.k, r).forEach(function (s) { line.appendChild(node('p', 'wk-n', s)); });
      var w = readingWhen(K.k, r); if (w) line.appendChild(node('p', 'wk-d', w));
    }
    KINDS.forEach(function (K) {
      var r = fs.readings[K.k] || {}, dir = r.arrow && r.arrow !== 'none' ? r.arrow : 'none';
      var b = node('button', 'wc ' + (ACLS[dir] || 'na')); b.type = 'button';
      add(b, fa(dir, true), span('wc-n', K.short));
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', K.name + ': ' + DIRW[dir]);
      b.addEventListener('click', function () {
        var on = sel !== b;
        if (sel) sel.setAttribute('aria-pressed', 'false');
        sel = on ? b : null;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) showOne(K, r, dir); else showLead();
      });
      chips.appendChild(b);
    });
    box.appendChild(chips);
    showLead();
    box.appendChild(line);
    if (fs.weeks && fs.weeks.length) {
      var wr = node('div', 'wk-weeks');
      add(wr, span('wk-wl', 'Last ' + fs.weeks.length + ' weeks'), weekDots(fs), span('wk-wn', 'now'));
      box.appendChild(wr);
    }
    return box;
  }
  function weekOrder() {
    var qi = {}; ORDER.forEach(function (s, i) { qi[s.id] = i; });
    return F.segments.slice().sort(function (a, b) {
      var ra = fstOf(a.fast_status), rb = fstOf(b.fast_status);
      var r = (ra ? ra.rank : 9) - (rb ? rb.rank : 9);
      return r || ((qi[a.id] == null ? 99 : qi[a.id]) - (qi[b.id] == null ? 99 : qi[b.id]));
    });
  }
  function renderWeek() {
    var sec = $('week');
    if (!F) { sec.hidden = true; return; }
    sec.hidden = false;
    var ov = F.overview || {};
    $('wkLead').textContent = ov.lead || '';
    $('wkSub').textContent = (F.notes && F.notes.what) || '';
    var pills = $('wkPills'); clear(pills);
    [['acc', ov.speeding_up, 'speeding up'], ['slw', ov.slowing, 'slowing'], ['std', ov.steady, 'steady'], ['na', ov.not_enough, 'not enough readings yet']].forEach(function (p) {
      if (p[1] == null || (p[0] === 'na' && !p[1])) return;
      var x = span('wp ' + p[0]); add(x, fa(p[0] === 'acc' ? 'up' : p[0] === 'slw' ? 'down' : p[0] === 'std' ? 'flat' : 'none'), span('wp-n', String(p[1])), span('wp-w', p[2]));
      pills.appendChild(x);
    });
    var ad = attDate(), fb = builtEpoch(F.built);
    $('wkAsof').textContent = 'Share prices to the ' + fmtD(F.market_through, false, true) + ' close' + (ad ? ' · reading interest to ' + fmtD(ad, false, true) : '') +
      (fb != null ? ' · built ' + builtTxt(fb) : '');
    $('wkTag').textContent = F.tagline || '';

    var g = $('wkGrid'); clear(g);
    var hd = node('div', 'wr wr-head');
    add(hd, span('wr-n', 'Part'), span('wr-q', '3-month picture'), span('wr-f', 'This week'));
    KINDS.forEach(function (K) { var c = span('wr-a'); add(c, span('wh-n', K.name), span('wh-s', K.sub)); hd.appendChild(c); });
    add(hd, span('wr-w', 'Last 13 weeks'));
    g.appendChild(hd);
    var phone = window.innerWidth < 860, rows = weekOrder(), shown = phone && !WK_OPEN ? WK_FIRST : rows.length;
    rows.forEach(function (fs, ri) {
      var qs0 = SEG[fs.id] ? stOf(SEG[fs.id].status) : null;
      var a = node('a', 'wr'); a.href = '#p-' + fs.id;
      if (ri >= shown) a.hidden = true;
      var nm = span('wr-n', fs.label || fs.name);
      var q = span('wr-q'); if (qs0) add(q, arw(qs0.cls, true), span('wr-qw', qs0.word)); else q.textContent = NDASH;
      var f = span('wr-f'); f.appendChild(fbadge(fs));
      add(a, nm, q, f);
      var aria = [(fs.label || fs.name) + '. 3-month picture: ' + (qs0 ? qs0.word : 'none') + '. This week: ' + (fstOf(fs.fast_status) ? fstOf(fs.fast_status).word : 'not enough readings yet') + '.'];
      KINDS.forEach(function (K) {
        var r = fs.readings[K.k] || {}, dir = r.arrow && r.arrow !== 'none' ? r.arrow : 'none';
        var c = span('wr-a ' + (ACLS[dir] || 'na')); add(c, fa(dir), span('wr-al', K.short));
        c.title = K.name + ': ' + DIRW[dir] + (r.text ? '. ' + r.text : '');
        a.appendChild(c);
        aria.push(K.name + ' ' + DIRW[dir] + '.');
      });
      var w = span('wr-w'); w.appendChild(weekDots(fs)); a.appendChild(w);
      a.setAttribute('aria-label', aria.join(' '));
      g.appendChild(a);
    });
    var mb = $('wkMore');
    mb.hidden = !(phone && rows.length > WK_FIRST);
    mb.textContent = WK_OPEN ? 'Show fewer' : 'Show all ' + rows.length + ' parts';
    mb.setAttribute('aria-expanded', WK_OPEN ? 'true' : 'false');
    var lg = $('wkLegend'); clear(lg);
    function li(sw, text) { var i = span('lg-i'); add(i, sw, text); return i; }
    add(lg, li(fa('up', true), 'up'), li(fa('flat', true), 'no clear change'), li(fa('down', true), 'down'), li(fa('none', true), 'no reading yet'),
      li(null, (HOVER ? 'Click' : 'Tap') + ' a row to jump to that part.'));

    var au = F.ai_use, ub = $('wkUse'); clear(ub);
    ub.hidden = !au;
    if (au) {
      var uh = node('div', 'use-h'); add(uh, fa(au.arrow && au.arrow !== 'none' ? au.arrow : 'none'), add(node('div'), node('h3', 'wk-ct2', 'Using AI this week'), node('p', 'use-l', au.text || '')));
      ub.appendChild(uh);
      var items = (au.items || []).filter(function (x) { return x.id !== 'disclosed'; });
      if (items.length) ub.appendChild(sourceRows(items));
      var dsc = (au.items || []).filter(function (x) { return x.id === 'disclosed'; })[0];
      if (dsc && dsc.numbers) {
        var said = node('div', 'said'); said.appendChild(node('div', 'said-h', 'What the companies last said'));
        var ul = node('ul', 'said-l');
        Object.keys(dsc.numbers).forEach(function (nm) {
          var v = dsc.numbers[nm]; if (!v) return;
          var li = node('li'); add(li, node('b', '', nm), ' ' + (v.value && v.value !== 'no level given' ? v.value + ' ' + v.what : (v.note || '')) +
            (v.previous ? ' (from ' + v.previous + ')' : '') + ', said ' + fmtD(v.said, true));
          ul.appendChild(li);
        });
        said.appendChild(ul); ub.appendChild(said);
      }
    }

    var ch = $('wkChg'); clear(ch);
    var rank = { status: 0, 'new figures': 1 };
    var list = (F.changed || []).slice().sort(function (x, y) { return (rank[x.kind] == null ? 2 : rank[x.kind]) - (rank[y.kind] == null ? 2 : rank[y.kind]); }).slice(0, 8);
    list.forEach(function (c) {
      var li0 = node('li', c.kind === 'status' ? 'wk-st' : '');
      var ic = c.dir === 'new' ? span('fa new sm') : fa(c.dir || 'flat', true);
      var body = node('div'); add(body, span('wc-k', CHG_KIND[c.kind] || cap(c.kind)), node('div', 'wc-t', c.text));
      add(li0, ic, body); ch.appendChild(li0);
    });
    if (!list.length) ch.appendChild(node('li', 'none', 'Nothing changed since last week.'));

    var mv = F.movers, host = $('wkMv'); clear(host);
    if (mv && (mv.up || mv.down)) {
      $('wkMvNote').textContent = 'Week to ' + fmtD(mv.to_date, false, true) + ', against the big chip stocks (they moved ' + pctTxt(mv.smh_1w_pct) + '). Share price, not business.';
      [['up', mv.up, 'Ahead of chip stocks', 'fast'], ['down', mv.down, 'Behind chip stocks', 'slow']].forEach(function (L) {
        var col = node('div', 'wm-col'), hh = node('h4', 'wm-h ' + L[0]); add(hh, fa(L[0], true), L[2]); col.appendChild(hh);
        var ol = node('ol', 'wm-list');
        (L[1] || []).forEach(function (m) {
          var li0 = node('li'), l = node('div'), n = node('div', 'mv-n', m.name);
          if (m.ticker && !/^\d/.test(m.ticker)) n.appendChild(span('tk', m.ticker));
          add(l, n, node('div', 'mv-s', (m.parts || []).join(', ')));
          var v = node('div', 'mv-v ' + L[3]); add(v, span('b', pctTxt(m.vs_chips_1w)));
          add(li0, l, v); ol.appendChild(li0);
        });
        col.appendChild(ol); host.appendChild(col);
      });
    } else $('wkMvNote').textContent = 'No price moves this week yet.';

    var nx = $('wkNext'); clear(nx);
    (F.coming_up || []).slice(0, 8).forEach(function (e) {
      var li0 = node('li'), dc = span('dchip');
      if (e.est) dc.appendChild(span('ab', 'about '));
      dc.appendChild(document.createTextNode(fmtD(e.date)));
      var lc = node('div'); add(lc, dc, span('wd', dn(e.date) === twToday() ? 'today' : WDN[dOf(dn(e.date)).getUTCDay()]));
      var body = node('div'); add(body, node('div', 'w', e.what || ''));
      var tags = node('div', 'n'); (e.parts || []).forEach(function (p) { if (SEG[p] || FSEG[p]) tags.appendChild(span('tag', SEG[p] ? shortL(SEG[p]) : FSEG[p].short || p)); });
      body.appendChild(tags);
      add(li0, lc, body); nx.appendChild(li0);
    });

    var how = $('wkHow'); clear(how);
    add(how, 'Each arrow is one quick reading for the part. ', span('w-acc', 'Purple ▲'), ' = up, ', span('w-std', 'grey'), ' = no clear change, ',
      span('w-slw', 'amber ▼'), ' = down, a dash = no reading yet. ', (F.notes && F.notes.status) || '');
    var mind = $('wkMind'); clear(mind);
    var N = F.notes || {};
    if (N.attention) mind.appendChild(span('box-p', N.attention));
    if (N.ai_use) mind.appendChild(span('box-p', N.ai_use));
    if (N.weeks) mind.appendChild(span('box-p', N.weeks));
  }

  function weekTeaser() {
    if (!F) return;
    var ov = F.overview || {}, by = { acc: [], slw: [] };
    weekOrder().forEach(function (fs) { var st = fstOf(fs.fast_status); if (st && by[st.cls]) by[st.cls].push(fs); });
    var p = span('box-p'), nm = function (l) { return andList(l.map(function (fs) { return lowerLabel(fs.short || fs.label); })); };
    add(p, span('w-std', 'This week, on the fast readings: '), node('b', '', (ov.speeding_up || 0) + ' speeding up'), by.acc.length ? ' (' + nm(by.acc) + ')' : '',
      ', ', node('b', '', (ov.slowing || 0) + ' slowing'), by.slw.length ? ' (' + nm(by.slw) + ')' : '', '. ');
    var a = node('a', '', 'See this week'); a.href = '#week'; add(p, a, '.');
    $('rightNow').appendChild(p);
  }


  function setRange(r, save) {
    if (!RANGES[r]) return;
    RANGE = r;
    Array.prototype.forEach.call(document.querySelectorAll('#ranges button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-range') === r ? 'true' : 'false'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-span]'), function (s) { s.textContent = SPAN_WORDS[r]; });
    if (save) store('aiPulseRange', r);
    if (!J) return;
    renderHeat();
    drawAll();
  }

  function renderAll() {
    $('content').hidden = false;
    renderStatus();
    var r0 = qs('range'); r0 = r0 && RANGES[r0.toUpperCase()] ? r0.toUpperCase() : store('aiPulseRange');
    if (RANGES[r0]) RANGE = r0;
    renderHero();
    renderNowText();
    weekTeaser();
    renderWeek();
    renderMovers();
    buildGroups();
    renderCal();
    renderDetails();
    setRange(RANGE, false);
    lastW = document.documentElement.clientWidth;
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  var SRC = /(^|\.)github\.io$/i.test(location.hostname) ?
    'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/ai-pulse-data/ai-pulse/ai-pulse.json' : 'snap/ai-pulse.pub.json';
  function load() {
    var chip = $('chip');
    chip.className = 'chip chip-wait'; chip.textContent = 'LOADING';


    fetch(SRC, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (pub) {
        if (!pub || pub.schema !== 2 || pub.kind !== 'ai-pulse') throw new Error('not the public AI Pulse file');
        var d = pub.quarterly, bad = validate(d); if (bad) throw new Error(bad);
        J = d; SEG = {}; prepare();
        try { F = fastPrepare(pub.fast); } catch (e) { F = null; }
        renderAll();
      })
      .catch(function (e) {
        chip.className = 'chip chip-error'; chip.textContent = 'ERROR';
        $('asof').textContent = 'The numbers did not load.';
        banner('bad', 'Couldn’t load the AI Pulse numbers.', ' ' + (e && e.message ? e.message : 'Unknown error') + '. Check the connection and try again.', true);
      });
  }


  Array.prototype.forEach.call(document.querySelectorAll('#ranges button'), function (b) {
    b.addEventListener('click', function () { setRange(b.getAttribute('data-range'), true); });
  });
  $('mvMore').addEventListener('click', function () { MV_OPEN = !MV_OPEN; renderMovers(); });
  $('wkMore').addEventListener('click', function () { WK_OPEN = !WK_OPEN; renderWeek(); if (!WK_OPEN) $('week').scrollIntoView(); });
  var rT = null;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      if (!J) return;
      var w = document.documentElement.clientWidth;
      if (w !== lastW) { lastW = w; renderHeat(); drawAll(); renderWeek(); } else placeRing();
    }, 120);
  });
  load();
})();
