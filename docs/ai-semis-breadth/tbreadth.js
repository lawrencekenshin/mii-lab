




(function () {
  'use strict';
  function start() {
    var sec = document.getElementById('tbreadth');
    if (!sec) return;
    whenAISB(function (A) { init(sec, A); });
  }
  function whenAISB(fn) {
    var tries = 0;
    (function wait() {
      if (window.AISB && typeof window.AISB.on === 'function') { fn(window.AISB); return; }
      if (++tries > 600) return;
      setTimeout(wait, 50);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  function init(sec, A) {
    var NS = 'http://www.w3.org/2000/svg';
    var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
      up: '#26A69A', down: '#EF5350', amber: '#F2B04B', none: '#3A3F4B', px: '#4FC3F7', sp: '#FFFFFF' };
    var ZC = {
      vthin: ['#F2B04B', 0.15], thin: ['#F3D28F', 0.11], normal: ['#B39DDB', 0], broad: ['#7FD1C7', 0.11], vbroad: ['#26A69A', 0.15] };
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120, 'ALL': 0 };
    var doc = null, G = null, T = null, R = null, P = 'QQQ', hoverI = null, geo = null, lastW = -1;


    function $(id) { return document.getElementById(id); }
    function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
    function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
    function add(p) { for (var i = 1; i < arguments.length; i++) { var c = arguments[i]; if (c == null) continue; p.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } return p; }
    function md(p, s) { String(s || '').split('**').forEach(function (part, k) { if (part) add(p, k % 2 ? h('b', null, part) : part); }); return p; }
    function s_(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
    function tx(g, x, y, s, a) { var t = s_('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
    function pc(hv) { return (hv / 100).toFixed(1) + '%'; }
    function sgn(v, nd) { var s = Math.abs(v * 100).toFixed(nd == null ? 1 : nd); return (+s === 0 ? '' : v < 0 ? '−' : '+') + s + '%'; }
    function iso2n(s) { return +String(s).replace(/-/g, ''); }
    function ds(n) { var y = Math.floor(n / 10000), m = Math.floor(n / 100) % 100, d = n % 100; return MON[m - 1] + ' ' + d + ', ' + y; }
    function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
    function priceName(k) { return (doc && doc.meta && doc.meta.price_head && doc.meta.price_head[k]) || k; }

    function priceWord(k) { return (doc && doc.meta && doc.meta.price_word && doc.meta.price_word[k]) || (k === 'BASKET' ? 'the basket' : k); }
    function zoneOf(k) { for (var i = 0; i < T.zones.length; i++) if (T.zones[i].key === k) return T.zones[i]; return T.zones[0]; }
    function edges() { return [0].concat(T.ln, [1]); }
    function dayISO(j) { return doc.days[G.start_i + j]; }
    function spAt(j) { var r = doc.tb_ref; return r && r.up ? r.up[G.start_i + j] : null; }
    function pxAt(j) { var a = G.prices && G.prices[P]; return a ? a[j] : null; }


    sec.setAttribute('aria-labelledby', 'tbT');
    sec.innerHTML = '<div class="card-head"><div class="card-title">' +
      '<h2 id="tbT">Trend breadth<span class="tsep"> · </span><span class="tspan">how many stocks are climbing?</span></h2>' +
      '<p class="sub" id="tbSub"></p><p class="tbr-from" id="tbFrom"></p></div></div>' +
      '<p class="panel-asof" id="tbAsof"></p>' +
      '<div class="tb-hero"><div class="tb-now" id="tbNow"></div><div class="tb-pic" id="tbPic"></div></div>' +
      '<div class="box" id="tbBox"></div>' +
      '<h3 class="sh">The five zones <span class="q">· how often each happens</span></h3>' +
      '<div class="tb-zkey" id="tbZones"></div>' +
      '<div class="readout" id="tbRo" aria-live="polite"></div>' +
      '<div class="chart" id="tbChart" role="img"></div>' +
      '<p class="legend" id="tbLegend"></p>' +
      '<div class="tb-cases"><h3 class="sh">Times like now <span class="q" id="tbCasesQ"></span></h3>' +
      '<div class="tbl-wrap"><table class="rt tb-ct" id="tbCases"></table></div><p class="small" id="tbCasesNote"></p></div>' +
      '<p class="small" id="tbData"></p>';
    sec.hidden = true;


    function renderTop() {
      var n = T.now, t = T.text, z = zoneOf(n.zone), zc = ZC[z.key][0], sp = doc.tb_ref && doc.tb_ref.now;
      $('tbSub').textContent = t.sub;
      $('tbFrom').textContent = t.from;
      var asof = clear($('tbAsof'));
      add(asof, h('span', null, t.asof + ' · ' + n.n + ' of ' + G.n_listed + ' stocks with enough history for the check · since ' +
        dayISO(0).slice(0, 4) + ' · updated after each US close'));
      if (t.closed_only) add(asof, h('span', 'tb-closed', t.closed_only));

      var now = clear($('tbNow'));
      add(now, h('div', 'tb-k', t.k_now));
      var big = h('span', 'tb-big', n.up_s); big.style.color = zc;
      var zch = h('span', 'tb-zchip', z.label); zch.style.color = zc; zch.style.borderColor = zc;
      add(now, add(h('div', 'tb-bigrow'), big, zch));
      add(now, h('div', 'tb-unit', t.unit));
      add(now, add(h('div', 'tb-gauge'), gauge(sp)));
      var cmp = h('div', 'tb-cmp');
      var rk = function (s) { return 'today: ' + String(s).replace(/^near the middle \((.*)\)$/, '$1').replace(' on ', ' '); };
      [['1 month ago', pc(n.up_mo), ds(iso2n(n.mo)).replace(/, \d+$/, '')],
       ['Typical, 2 years', pc(n.med2), rk(n.rank2)],
       ['Typical, since ' + dayISO(0).slice(0, 4), pc(n.med13), rk(n.rank13)],
       sp ? ['S&P 500 stocks', sp.up_s, zoneOf(sp.zone).label.toLowerCase() + ' · TET Radar'] : null].forEach(function (r) {
        if (r) add(cmp, add(h('div'), h('span', 'k', r[0]), h('span', 'v', r[1]), h('span', 's', r[2])));
      });
      add(now, cmp);

      var pic = clear($('tbPic'));
      add(pic, h('div', 'tb-k', t.pic_title));
      add(pic, dots());
      var lg = h('div', 'lgd'), nu = Math.round(n.up / 100), nd = Math.round(n.down / 100);
      [[C.up, nu + ' climbing'], [C.none, (100 - nu - nd) + ' no clear trend'], [C.down, nd + ' sliding']].forEach(function (r) {
        var i = h('i'); i.style.background = r[0]; add(lg, add(h('span'), i, r[1]));
      });
      add(pic, lg);
      add(pic, h('p', null, t.pic_note));

      var bx = clear($('tbBox'));
      [['Right now', t.tldr], ['How to read it', t.how]].forEach(function (r) { add(bx, add(h('div', 'box-row'), h('b', null, r[0]), md(h('span'), r[1]))); });

      var zk = clear($('tbZones'));
      T.zones.forEach(function (q) {
        var c = ZC[q.key][0], el = h('div', q.key === z.key ? 'on' : null);
        el.style.borderTopColor = c;
        var lab = h('span', 'zl', q.label); lab.style.color = c;
        add(zk, add(el, lab, h('span', 'zs', Math.round(q.share13 * 100) + '% of days since ' + dayISO(0).slice(0, 4) + (q.key === z.key ? ' · now' : ''))));
      });
      renderCases();
      $('tbData').textContent = t.data;
    }
    function gaugeTop(sp) {
      var n = T.now, m = Math.max(n.up, n.up_mo, n.med13, sp ? sp.up : 0) / 10000;
      return m <= 0.48 ? 0.5 : 1;
    }
    function gauge(sp) {
      var W = 360, H = 60, pad = 8, top = gaugeTop(sp), pw = W - 2 * pad, y = 18, n = T.now, zc = ZC[n.zone][0], e = edges();
      var X = function (v) { return pad + Math.min(v, top) / top * pw; };
      var up = n.up / 10000, mo = n.up_mo / 10000, med = n.med13 / 10000;
      var svg = s_('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Gauge from 0 to ' + Math.round(top * 100) + '%: today ' + n.up_s + ', a month ago ' + pc(n.up_mo) + ', typical ' + pc(n.med13) + (sp ? ', S&P 500 stocks ' + sp.up_s : '') });
      T.zones.forEach(function (q, k) {
        s_('rect', { x: X(e[k]), y: y - 5, width: Math.max(0, X(Math.min(e[k + 1], top)) - X(e[k])), height: 10, fill: ZC[q.key][0], 'fill-opacity': q.key === 'normal' ? 0.28 : 0.55 }, svg);
      });
      s_('line', { x1: X(med), x2: X(med), y1: y - 9, y2: y + 9, stroke: C.text, 'stroke-width': 1.4 }, svg);
      if (sp) s_('line', { x1: X(sp.up / 10000), x2: X(sp.up / 10000), y1: y - 9, y2: y + 9, stroke: C.sp, 'stroke-width': 1.6, 'stroke-dasharray': '2 2' }, svg);
      s_('line', { x1: X(mo), x2: X(up), y1: y, y2: y, stroke: C.white, 'stroke-width': 1.6, 'stroke-dasharray': '2 2' }, svg);
      s_('circle', { cx: X(mo), cy: y, r: 4, fill: C.panel, stroke: C.white, 'stroke-width': 1.5 }, svg);
      s_('circle', { cx: X(up), cy: y, r: 6.5, fill: zc, stroke: C.white, 'stroke-width': 1.8 }, svg);
      tx(svg, X(up), y + 19, 'now', { fill: zc, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' });
      if (Math.abs(X(mo) - X(up)) >= 34) tx(svg, X(mo), y + 19, ds(iso2n(n.mo)).replace(/, \d+$/, ''), { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
      var step = top > 0.5 ? 0.2 : 0.1;
      for (var v = 0; v <= top + 1e-9; v += step) tx(svg, X(v), H - 3, Math.round(v * 100) + '%', { fill: C.muted, 'font-size': 11, 'text-anchor': v === 0 ? 'start' : v > top - 1e-9 ? 'end' : 'middle' });
      var spX = sp ? X(sp.up / 10000) : null, mX = X(med);
      if (spX != null && Math.abs(spX - mX) < 64) {
        var spLeft = spX <= mX;
        tx(svg, Math.min(spX, mX) - 2, y - 11, spLeft ? 'S&P 500' : 'typical', { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'end' });
        tx(svg, Math.max(spX, mX) + 2, y - 11, spLeft ? 'typical' : 'S&P 500', { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'start' });
      } else {
        tx(svg, mX, y - 11, 'typical', { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'middle' });
        if (spX != null) tx(svg, spX, y - 11, 'S&P 500', { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'middle' });
      }
      return svg;
    }
    function dots() {
      var n = T.now, nu = Math.round(n.up / 100), nd = Math.round(n.down / 100);
      var svg = s_('svg', { viewBox: '0 0 200 200', role: 'img', 'aria-label': nu + ' of 100 climbing, ' + nd + ' sliding, ' + (100 - nu - nd) + ' no clear trend' });
      for (var k = 0; k < 100; k++) {
        var r = Math.floor(k / 10), c = k % 10;
        var col = k < nu ? C.up : k >= 100 - nd ? C.down : C.none;
        s_('circle', { cx: 10 + c * 20, cy: 10 + r * 20, r: 7.2, fill: col, 'fill-opacity': col === C.none ? 1 : 0.95 }, svg);
      }
      return svg;
    }
    function renderCases() {
      var t = clear($('tbCases')), hr = h('tr'), pn = priceName(T.now.price);
      $('tbCasesQ').textContent = '· few of them climbing while ' + priceWord(T.now.price) + ' sat near its high';
      [['#', '#'], ['First day', 'Day'], ['Climbing', 'Climbing'], [pn + ' vs its\n1-year high', pn + ' vs\nits high'], [pn + ' 3 months\nlater', pn + ' 3 mo\nlater'], ['Biggest dip\non the way', 'Biggest\ndip']].forEach(function (x, k) {
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
      T.cases.forEach(function (c) {
        var tr = h('tr', c.open ? 'now' : null), pin = h('span', c.open ? 'pin pin-now' : 'pin', c.open ? 'now' : String(++k));
        var dn = iso2n(c.d), dcell = add(h('td'), h('span', 'dl', ds(dn)), h('span', 'dsh', MON[Math.floor(dn / 100) % 100 - 1] + ' ’' + String(Math.floor(dn / 10000)).slice(2)));
        add(tr, add(h('td', 'c'), pin), dcell, h('td', 'n', (c.up / 100).toFixed(2) + '%'), h('td', 'n', c.off > -0.0005 ? 'at the high' : sgn(c.off)));
        if (c.open) { var td = h('td', 'n mut', 'still open'); td.colSpan = 2; add(tr, td); }
        else add(tr, h('td', 'n ' + (c.r3m > 0 ? 'pos' : 'neg'), sgn(c.r3m)), c.dip3m > -0.0005 ? h('td', 'n mut', 'none') : h('td', 'n neg', sgn(c.dip3m)));
        tb.appendChild(tr);
      });
      if (!T.cases.length) { var tr0 = h('tr'), td0 = h('td', 'l mut', T.text.cases_none); td0.colSpan = 6; add(tb, add(tr0, td0)); }
      add(t, tb);
      $('tbCasesNote').textContent = T.text.cases_note;
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
    function window0(last) {
      var m = RANGE_MONTHS[A.range()];
      if (!m) return 0;
      var d = new Date(dayNum(dayISO(last)) * 864e5), y = d.getUTCFullYear(), mo = d.getUTCMonth() - m;
      var dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(), x0 = Date.UTC(y, mo, Math.min(d.getUTCDate(), dim)) / 864e5;
      for (var j = 0; j <= last; j++) if (dayNum(dayISO(j)) >= x0) return j;
      return 0;
    }
    function draw() {
      var holder = $('tbChart'); clear(holder);
      if (!T) return;
      var last = G.prices[P].length - 1, aI = T.asof_i;
      while (last > aI && pxAt(last) == null) last--;
      var W = Math.max(280, Math.round(holder.clientWidth || 360)), narrow = W < 640;
      var L = narrow ? 34 : 46, Rr = narrow ? 50 : 62, pw = W - L - Rr, fs = narrow ? 10.5 : 11.5;
      var T0 = 58, PH = narrow ? 250 : 340, H = T0 + PH + 24;
      var i0 = window0(last), cnt = last - i0 + 1;
      var X = function (i) { return L + (i - i0) / Math.max(1, cnt - 1) * pw; };
      var svg = s_('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, holder);
      s_('rect', { x: L, y: T0, width: pw, height: PH, fill: C.panel, rx: 3 }, svg);
      var i, j, vmax = 0;
      for (i = i0; i <= last; i++) { if (T.up[i] != null) vmax = Math.max(vmax, T.up[i]); if (spAt(i) != null) vmax = Math.max(vmax, spAt(i)); }
      var top = Math.max(0.45, Math.ceil((vmax / 10000 + 0.02) / 0.05) * 0.05);
      if (top > 0.95) top = 1;
      var Yb = function (v) { return T0 + PH - 4 - v / top * (PH - 8); };
      var zlab = [], e = edges();
      T.zones.forEach(function (q, k) {
        if (e[k] >= top) return;
        var ya = Yb(Math.min(e[k + 1], top)), yb = Yb(e[k]), zc = ZC[q.key];
        if (zc[1] > 0) s_('rect', { x: L, y: ya, width: pw, height: yb - ya, fill: zc[0], 'fill-opacity': zc[1] }, svg);
        zlab.push([Math.min(yb - 4, ya + 13), q.label.toLowerCase(), zc[0], yb - ya]);
      });
      var gstep = top > 0.6 ? 0.2 : 0.1;
      for (var g = gstep; g <= top + 1e-9; g += gstep) {
        s_('line', { x1: L, x2: L + pw, y1: Yb(g), y2: Yb(g), stroke: C.line, 'stroke-width': 1 }, svg);
        tx(svg, L - 5, Yb(g) + 4, Math.round(g * 100) + '%', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
      }
      tx(svg, L - 5, Yb(0) + 1, '0', { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });

      var span = cnt / 252, prevK = null, lastX = -1e9, minGap = narrow ? 34 : 44;
      for (i = i0; i <= last; i++) {
        var dn = iso2n(dayISO(i)), y = Math.floor(dn / 10000), m = Math.floor(dn / 100) % 100;
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

      var pmin = Infinity, pmax = -Infinity, Yp = null;
      for (i = i0; i <= last; i++) { var pv = pxAt(i); if (pv != null && pv > 0) { pmin = Math.min(pmin, pv); pmax = Math.max(pmax, pv); } }
      if (pmax > 0) {
        var lp0 = Math.log(pmin), lp1 = Math.log(pmax), pad = (lp1 - lp0) * 0.06 || 0.05;
        lp0 -= pad; lp1 += pad;
        var PP = PH * 0.70;
        Yp = function (v) { return T0 + 4 + (lp1 - Math.log(v)) / (lp1 - lp0) * (PP - 8); };
        var tagY = T.up[aI] != null ? Yb(T.up[aI] / 10000) : -1e9;
        logTicks(Math.exp(lp0), Math.exp(lp1), narrow ? 4 : 6).forEach(function (v) {
          var lab2 = v >= 100 ? String(Math.round(v)) : String(+v.toFixed(1));
          if (Math.abs(Yp(v) - tagY) < 14) return;
          tx(svg, L + pw + 5, Yp(v) + 4, lab2, { fill: C.muted, 'font-size': fs });
          s_('line', { x1: L + pw, x2: L + pw + 3, y1: Yp(v), y2: Yp(v), stroke: C.muted, 'stroke-width': 1 }, svg);
        });
        var dd = '', pen = false;
        for (i = i0; i <= last; i++) { var q = pxAt(i); if (q == null || q <= 0) { pen = false; continue; } dd += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yp(q).toFixed(1); pen = true; }
        s_('path', { d: dd, fill: 'none', stroke: C.px, 'stroke-opacity': 0.55, 'stroke-width': narrow ? 1.1 : 1.2, 'stroke-linejoin': 'round' }, svg);
      }

      var ds2 = '', pen2 = false;
      for (i = i0; i <= last; i++) { var s = spAt(i); if (s == null) { pen2 = false; continue; } ds2 += (pen2 ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yb(s / 10000).toFixed(1); pen2 = true; }
      if (ds2) s_('path', { d: ds2, fill: 'none', stroke: C.sp, 'stroke-opacity': 0.8, 'stroke-width': narrow ? 1.1 : 1.3, 'stroke-dasharray': '4 3', 'stroke-linejoin': 'round' }, svg);

      var runStart = null, zPrev = null;
      function flush(a, b) {
        var d2 = '', from = Math.max(i0, a - 1);
        while (from < a && T.up[from] == null) from++;
        for (j = from; j <= b; j++) d2 += (j === from ? 'M' : 'L') + X(j).toFixed(1) + ' ' + Yb(T.up[j] / 10000).toFixed(1);
        if (b + 1 <= last && T.up[b + 1] != null) d2 += 'L' + X(b + 1).toFixed(1) + ' ' + Yb(T.up[b + 1] / 10000).toFixed(1);
        s_('path', { d: d2, fill: 'none', stroke: ZC[T.zones[zPrev].key][0], 'stroke-width': narrow ? 1.9 : 2.3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      }
      for (i = i0; i <= last + 1; i++) {
        var zk = i <= last && T.up[i] != null ? T.z[i] : null;
        if (runStart !== null && zk !== zPrev) { flush(runStart, i - 1); runStart = null; }
        if (zk !== null && runStart === null) { runStart = i; zPrev = zk; }
      }
      zlab.forEach(function (z) {
        if (z[3] <= 13 || narrow) return;
        var t = tx(svg, L + 9, z[0], z[1], { fill: z[2], 'font-size': fs - 0.5, 'font-weight': 700 }), w = z[1].length * (fs - 0.5) * 0.56 + 8;
        var bg = s_('rect', { x: L + 5, y: z[0] - fs + 1, width: w, height: fs + 3, rx: 3, fill: C.bg, 'fill-opacity': 0.92 });
        svg.insertBefore(bg, t);
      });

      var k = 0, pins = [], rows = [[], []];
      T.cases.forEach(function (c) { var lab3 = c.open ? 'now' : String(++k); if (c.i >= i0 && c.i <= last) pins.push({ lab: lab3, ii: c.i, open: !!c.open, hw: c.open ? 15 : 8 }); });
      pins.sort(function (a, b) { return (b.open ? 1 : 0) - (a.open ? 1 : 0); });
      pins.forEach(function (p) {
        var px = X(p.ii), row = -1;
        for (var r = 0; r < 2 && row < 0; r++) if (rows[r].every(function (q) { return Math.abs(q[0] - px) >= q[1] + p.hw + 2; })) row = r;
        var cy = row === 1 ? T0 - 31 : T0 - 12;
        s_('line', { x1: px, x2: px, y1: row === -1 ? T0 : cy + 8, y2: Yb(T.up[p.ii] / 10000), stroke: C.amber, 'stroke-opacity': 0.55, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
        if (row === -1) return;
        rows[row].push([px, p.hw]);
        if (p.open) s_('rect', { x: px - p.hw, y: cy - 8, width: 2 * p.hw, height: 16, rx: 8, fill: C.amber }, svg);
        else s_('circle', { cx: px, cy: cy, r: 8, fill: C.bg, stroke: C.amber, 'stroke-width': 1.5 }, svg);
        tx(svg, px, cy + 4, p.lab, { fill: p.open ? C.bg : C.amber, 'font-size': p.open ? 10 : 10.5, 'font-weight': 700, 'text-anchor': 'middle' });
      });

      if (aI >= i0 && T.up[aI] != null) {
        var ylast = Yb(T.up[aI] / 10000), zc = ZC[T.zones[T.z[aI]].key][0];
        s_('circle', { cx: X(aI), cy: ylast, r: 4.5, fill: zc, stroke: C.bg, 'stroke-width': 1.5 }, svg);
        var vl = T.now.up_s, vw = Math.min(Rr - 3, vl.length * fs * 0.62 + 8);
        s_('rect', { x: L + pw + 2, y: ylast - 8.5, width: vw, height: 17, rx: 3, fill: zc }, svg);
        tx(svg, L + pw + 2 + vw / 2, ylast + 4, vl, { fill: C.bg, 'font-size': fs, 'font-weight': 800, 'text-anchor': 'middle' });
      }
      tx(svg, 0, T0 - 46, narrow ? '% climbing' : 'share climbing', { fill: C.muted, 'font-size': fs - 0.5 });
      if (Yp) tx(svg, W - 2, T0 - 46, priceName(P), { fill: C.px, 'font-size': fs - 0.5, 'font-weight': 700, 'text-anchor': 'end' });
      var cross = s_('g', {}, svg);
      geo = { L: L, pw: pw, i0: i0, cnt: cnt, last: last, X: X, Yb: Yb, Yp: Yp, cross: cross, top: T0, bot: T0 + PH, W: W };
      holder.setAttribute('aria-label', 'Share of ' + G.words + ' climbing, coloured by zone, with the S&P 500 dashed and ' + priceName(P) + ' on top');
      renderLegend(!!Yp);
      setHover(hoverI);
    }
    function renderLegend(hasPx) {
      var lg = clear($('tbLegend'));
      function item(col, text, dash) {
        var sv = s_('svg', { width: 18, height: 10, 'aria-hidden': 'true' });
        s_('line', { x1: 1, x2: 17, y1: 5, y2: 5, stroke: col, 'stroke-width': 2.2, 'stroke-dasharray': dash || null }, sv);
        var sp = h('span'); sp.appendChild(sv); add(sp, ' ' + text); lg.appendChild(sp);
      }
      item(ZC.vthin[0], 'share climbing: amber = thin or very thin'); item(ZC.normal[0], 'purple = normal'); item(ZC.vbroad[0], 'green = broad or very broad');
      if (doc.tb_ref) item(C.sp, 'S&P 500 stocks (TET Radar)', '4 3');
      if (hasPx) item(C.px, priceName(P) + ' close, right axis');
      item(C.amber, 'look-alike days (table below)', '2 3');
    }
    function nearestReading(i) {
      while (i > geo.i0 && T.up[i] == null) i--;
      return T.up[i] == null ? null : i;
    }
    function setHover(i) {
      if (!geo || !T) return;
      clear(geo.cross);
      if (i != null && (i < geo.i0 || i > geo.last)) i = null;
      hoverI = i;
      var j = i == null ? T.asof_i : i, jr = nearestReading(j);
      if (i != null) {
        var px = geo.X(i);
        s_('line', { x1: px, x2: px, y1: geo.top, y2: geo.bot, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
        if (geo.Yp && pxAt(i) != null) s_('circle', { cx: px, cy: geo.Yp(pxAt(i)), r: 3.4, fill: C.px, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
        if (spAt(i) != null) s_('circle', { cx: px, cy: geo.Yb(spAt(i) / 10000), r: 3, fill: C.sp, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
        if (T.up[i] != null) s_('circle', { cx: px, cy: geo.Yb(T.up[i] / 10000), r: 4, fill: ZC[T.zones[T.z[i]].key][0], stroke: C.white, 'stroke-width': 1.2 }, geo.cross);
      }
      var ro = clear($('tbRo'));
      add(ro, h('span', 'd', ds(iso2n(dayISO(j)))));
      if (jr === j) {
        var z = T.zones[T.z[j]], zs = h('span', 'z', z.label.toLowerCase()); zs.style.color = ZC[z.key][0];
        add(ro, ' · climbing ', h('b', null, j === T.asof_i ? T.now.up_s : pc(T.up[j])), ' (', zs, ') · sliding ' + (j === T.asof_i ? T.now.down_s : pc(T.dn[j])));
      } else add(ro, h('span', 'muted', ' · no reading yet (closed sessions only)'));
      var rf = doc.tb_ref;
      if (spAt(j) != null) add(ro, ' · S&P 500 stocks ' + (rf.now && dayISO(j) === rf.as_of ? rf.now.up_s : pc(spAt(j))));
      if (pxAt(j) != null) add(ro, ' · ' + priceName(P) + ' ' + pxAt(j).toFixed(2));
      if (i == null) ro.appendChild(h('span', 'muted', ' · tap or hover the chart for any day'));
    }
    function pickAt(ev) {
      if (!geo) return;
      var holder = $('tbChart'), svg = holder.querySelector('svg');
      if (!svg) return;
      var r = holder.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width, x = (ev.clientX - r.left) * scale;
      setHover(Math.max(geo.i0, Math.min(geo.last, Math.round(geo.i0 + (x - geo.L) / geo.pw * (geo.cnt - 1)))));
    }


    function pick() {
      doc = A.data();
      var g = A.group();
      G = doc && doc.groups ? doc.groups[g] : null;
      T = G && G.tb && G.tb.ok ? G.tb : null;
      P = A.price();
      if (!G || !G.prices || !G.prices[P]) P = G ? G.default_price : 'QQQ';
    }
    function render() {
      pick();
      hoverI = null;
      var ft = $('footTb');
      if (!T || !T.up || !T.zones) { sec.hidden = true; if (ft) ft.hidden = true; return; }
      sec.hidden = false;
      if (ft) ft.hidden = false;
      renderTop();
      lastW = -1;
      draw();
      lastW = $('tbChart').clientWidth;
    }
    function redraw() { if (!T) return; hoverI = null; try { pick(); if (T) draw(); } catch (e) { fail(e); } }
    function fail(e) {
      if (window.console) console.warn('tbreadth', e);
      var holder = $('tbChart'); if (holder) { clear(holder); holder.appendChild(h('p', 'small', 'This chart could not be drawn. The rest of the page is not affected.')); }
    }
    var chart = $('tbChart');
    chart.addEventListener('pointermove', pickAt);
    chart.addEventListener('pointerdown', pickAt);
    chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });
    var rt = null;
    function onSize() { var cw = chart.clientWidth; if (!T || cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(function () { try { draw(); } catch (e) { fail(e); } }, 80); }
    if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart); else window.addEventListener('resize', onSize);
    A.on('data', function () { try { render(); } catch (e) { fail(e); } });
    A.on('group', function () { try { render(); } catch (e) { fail(e); } });
    A.on('price', redraw);
    A.on('range', redraw);
  }
})();
