






(function () {
  'use strict';
  function start() {
    var sec = document.getElementById('kdjwash');
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
    var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
      blue: '#3987E5', light: '#8EC0FA', amb: '#F2B04B', strong: '#26A69A', grey: '#5D606B', ghost: '#B39DDB' };
    var TFS = ['1D', '1W', '2W', '1M'];
    var TFN = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
    var CANDLE = { '1D': 'day', '1W': 'week', '2W': '2-week candle', '1M': 'month' };
    var CANDLES = { '1D': 'days', '1W': 'weeks', '2W': '2-week candles', '1M': 'months' };
    var RANGES = { '2Y': 2, '5Y': 5, '10Y': 10, 'All': Infinity };
    var NS = 'http://www.w3.org/2000/svg';
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var RKEY = 'aisbKdjwashRange';

    var doc = null, u = null, P = null, tf = '1W', range = '5Y', hoverI = null, geo = null, DN = null, PX = null, OPX = null;
    try { var sv = localStorage.getItem(RKEY); if (sv && RANGES[sv]) range = sv; } catch (e) { }

    function $(id) { return document.getElementById(id); }
    function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
    function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
    function elh(tag, cls, text, parent) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; if (parent) parent.appendChild(n); return n; }
    function el(tag, attrs, parent) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }
    function tx(g, x, y, s, a) { var t = el('text', a || {}, g); t.setAttribute('x', x); t.setAttribute('y', y); t.textContent = s; return t; }
    function textW(s, fs) { return s.length * fs * 0.56; }
    function dnOf(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
    function dt(dn) { return new Date(dn * 864e5); }
    function dayS(s, opt) {
      var d = dt(dnOf(s)), r = MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
      if (opt && opt.dow) r = DOW[d.getUTCDay()] + ' ' + r;
      if (opt && opt.year) r += ', ' + d.getUTCFullYear();
      return r;
    }
    function monY(s) { var d = dt(dnOf(s)); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
    function p0(v) { return Math.round(v) + '%'; }
    function p1(v) { return v.toFixed(1) + '%'; }
    function sgn(v) { return v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%'; }
    function num(v) { return v == null ? '–' : v.toLocaleString('en-US'); }
    function pxS(v) { return v == null ? '–' : v.toFixed(2); }
    function priceName(p) { return (doc && doc.meta && doc.meta.price_head && doc.meta.price_head[p]) || p; }

    function priceWord(p) { return (doc && doc.meta && doc.meta.price_word && doc.meta.price_word[p]) || (p === 'BASKET' ? 'the basket' : p); }
    function priceSubj(p) { var w = priceWord(p); return w.charAt(0).toUpperCase() + w.slice(1); }
    function grp(k) { return doc.groups[k]; }
    function W_(k) { return grp(k).kdjwash; }
    function T() { return W_(u).tf[tf]; }
    function gmeta(k) { var m = null; (doc.meta.groups || []).forEach(function (g) { if (g.key === k) m = g; }); return m || { key: k, short: k, label: k }; }
    function order() { return (doc.meta.groups || []).map(function (g) { return g.key; }).filter(function (k) { return doc.groups[k] && doc.groups[k].kdjwash; }); }
    function yearOf(s) { return s ? s.slice(0, 4) : ''; }
    function candleName(s, which) {
      if (which === '1D') return dayS(s, { dow: true, year: true });
      if (which === '1M') { var d = dt(dnOf(s)); return MONL[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
      return (which === '2W' ? '2 weeks ending ' : 'Week ending ') + dayS(s, { dow: true, year: true });
    }
    function soFarWords(o, which) {
      var d = dt(dnOf(o.d));
      if (which === '1D') return 'Today so far (' + dayS(o.d, { dow: true }) + ')';
      if (which === '1M') return MON[d.getUTCMonth()] + ' so far (to ' + dayS(o.d, { dow: true }) + ')';
      return (which === '2W' ? 'This 2-week candle' : 'This week') + ' so far (to ' + dayS(o.d, { dow: true }) + ')';
    }

    function tierOf(t, i) {
      var v = t.s[i];
      if (t.armed) {
        if (!t.armed[i]) return { w: 'not armed', c: 'kt-none' };
        if (v >= t.ln[1]) return { w: 'STRONG', c: 'kt-strong' };
        if (v >= t.ln[0]) return { w: 'ARMED', c: 'kt-arm' };
        return { w: 'still armed (below ARM, above the disarm level)', c: 'kt-arm' };
      }
      if (v >= t.ln[1]) return { w: 'above the STRONG-level line', c: 'kt-strong' };
      if (v >= t.ln[0]) return { w: 'above the ARM-level line', c: 'kt-arm' };
      return { w: 'below the lines', c: 'kt-none' };
    }
    function cardTier(x) {
      var w = x.tf['1W'], st = w.state, v = w.last.s;
      if (!st.armed) return { w: 'not armed', c: 'kt-none' };
      if (v >= w.ln[1]) return { w: 'STRONG', c: 'kt-strong' };
      if (v >= w.ln[0]) return { w: 'ARMED', c: 'kt-arm' };
      return { w: 'ARMED · held', c: 'kt-arm' };
    }
    function ok(x) {
      if (!x || !x.tf || !Array.isArray(x.episodes) || !x.base || !x.now) return false;
      return TFS.every(function (f) {
        var t = x.tf[f], n = t && t.s && t.s.length;
        return n > 0 && ['ei', 'wn', 'n'].every(function (a) { return Array.isArray(t[a]) && t[a].length === n; }) &&
          Array.isArray(t.dots) && t.last && Array.isArray(t.ln) && t.ln.length >= 2 &&
          (f !== '1W' || (t.ln.length === 3 && Array.isArray(t.armed) && t.armed.length === n && t.state));
      });
    }


    if (!sec.getAttribute('aria-labelledby')) sec.setAttribute('aria-labelledby', 'tkw');
    sec.innerHTML =
      '<div class="card-head"><div class="card-title">' +
      '<h2 id="tkw">KDJ washout meter<span class="tsep"> · </span><span class="tspan" data-kwspan>last 5 years</span></h2>' +
      '<p class="sub" id="subKW">How many of each group’s stocks are maxed-out oversold on KDJ, with the weekly ARMED and STRONG levels.</p>' +
      '</div></div>' +
      '<p class="panel-asof" id="asofKW">Loading the KDJ washout meter…</p>' +
      '<p class="banner banner-warn" id="errKW" hidden></p>' +
      '<div id="bodyKW" hidden>' +
      '<div class="kw-cards" id="cardsKW" role="group" aria-label="Pick a group for the chart and the table"></div>' +
      '<div class="controls kw-controls">' +
      '<div class="seg kw-tf" role="group" aria-label="Candle size">' +
      '<button type="button" data-kwt="1D" aria-pressed="false">Daily</button><button type="button" data-kwt="1W" aria-pressed="true">Weekly</button>' +
      '<button type="button" data-kwt="2W" aria-pressed="false">2-week</button><button type="button" data-kwt="1M" aria-pressed="false">Monthly</button></div>' +
      '<div class="seg seg-range kw-range" role="group" aria-label="KDJ washout meter time window">' +
      '<button type="button" data-kwr="2Y" aria-pressed="false" aria-label="Last 2 years">2Y</button>' +
      '<button type="button" data-kwr="5Y" aria-pressed="true" aria-label="Last 5 years">5Y</button>' +
      '<button type="button" data-kwr="10Y" aria-pressed="false" aria-label="Last 10 years">10Y</button>' +
      '<button type="button" data-kwr="All" aria-pressed="false" aria-label="All data">All</button></div></div>' +
      '<div class="readout kw-ro" id="roKW" aria-live="polite"></div>' +
      '<div class="kw-chart" id="chartKW" role="img"></div>' +
      '<p class="legend" id="lgKW"></p>' +
      '<h3 class="kw-h3"><span id="kwEpHead">Every armed spell</span> · <span id="kwEpIdx"></span> · weekly</h3>' +
      '<p class="kw-cap" id="capKW"></p>' +
      '<div class="table-scroll"><table id="tableKW" class="kw-table"></table></div>' +
      '<div class="box">' +
      '<div class="box-row"><b>How to read it</b><span id="howKW"></span></div>' +
      '<div class="box-row"><b>Right now</b><span id="nowKW"></span></div></div>' +
      '<p class="kdj-honest" id="honestKW"></p>' +
      '</div>';


    function builtWords() {
      var b = new Date(doc.built_utc);
      return isNaN(b) ? '' : ' · built ' + MON[b.getMonth()] + ' ' + b.getDate() + ', ' + String(b.getHours()).padStart(2, '0') + ':' + String(b.getMinutes()).padStart(2, '0');
    }
    function renderAsof() {
      var a = $('asofKW'); clear(a);
      a.appendChild(span('chip chip-closed', 'WEEKLY'));
      var w = W_(u).tf['1W'], o = w.open;
      var s = 'Closed weeks to ' + dayS(w.last.d, { dow: true, year: true });
      if (o) s += ' · this week so far to ' + dayS(o.d, { dow: true });
      s += builtWords();
      a.appendChild(span('', s));
    }
    function renderCards() {
      var box = $('cardsKW'); clear(box);
      order().forEach(function (k) {
        var x = W_(k), w = x.tf['1W'], st = w.state, tr = cardTier(x), m = gmeta(k);
        var b = elh('button', 'kw-card', null, box); b.type = 'button'; b.setAttribute('data-kwi', k); b.setAttribute('aria-pressed', String(k === u));
        var h = elh('div', 'kw-ch', null, b);
        elh('b', '', m.short || m.label, h);
        elh('span', 'kw-tier ' + tr.c, tr.w, h);
        var nm = elh('div', 'kw-num', null, b);
        elh('span', 'kw-v ' + tr.c, p0(w.last.s), nm);
        var of = elh('span', 'kw-of', w.last.wn + ' of ' + num(w.last.n), nm);
        of.appendChild(span('kw-long', ' stocks'));
        elh('div', 'kw-l', 'week ending ' + dayS(w.last.d, { dow: true }), b);
        if (w.open) {
          var so = elh('div', 'kw-l kw-so', null, b);
          so.appendChild(span('kw-ring', ''));
          var sot = span('', 'so far');
          sot.appendChild(span('kw-long', ' this week'));
          sot.appendChild(document.createTextNode(' ' + p0(w.open.s)));
          so.appendChild(sot);
        }
        var l3;
        if (st.armed) {
          l3 = 'armed since week of ' + dayS(st.since);
          if (st.first_strong) l3 += ' · STRONG first ' + dayS(st.first_strong);
          else if (st.peak != null) l3 += ' · peak ' + p0(st.peak);
        } else {
          var ep = x.episodes[x.episodes.length - 1];
          l3 = ep ? 'last armed ' + monY(ep.d) + ' (peak ' + p0(ep.peak) + ')' : 'not armed since ' + yearOf(w.start);
        }
        elh('div', 'kw-l', l3, b);
        var r13 = w.last.rare13, since = ' of weeks since ' + yearOf(w.start);
        elh('div', 'kw-l kw-rare', r13 == null ? '' : r13 < 50 ? 'only ' + p0(r13) + since + ' read this high' : 'an ordinary reading (' + p0(r13) + since + ' read as high or higher)', b);

        var szl = elh('div', 'kw-l kw-sizes', null, b), nsz = 0;
        [['1D', 'Daily', 'D'], ['2W', '2-week', '2W'], ['1M', 'Monthly', 'M']].forEach(function (q) {
          var t = x.tf[q[0]];
          if (!t || !t.last) return;
          if (nsz++) szl.appendChild(document.createTextNode(' · '));
          szl.appendChild(span('kw-long', q[1] + ' '));
          szl.appendChild(span('kw-short', q[2] + ' '));
          szl.appendChild(document.createTextNode(p0(t.open ? t.open.s : t.last.s)));
          if (t.open) szl.appendChild(span('kw-long', ' so far'));
        });
        if (!nsz) b.removeChild(szl);
      });
    }


    function renderControls() {
      Array.prototype.forEach.call(sec.querySelectorAll('[data-kwi]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kwi') === u)); });
      Array.prototype.forEach.call(sec.querySelectorAll('[data-kwt]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kwt') === tf)); });
      Array.prototype.forEach.call(sec.querySelectorAll('[data-kwr]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kwr') === range)); });
      var t = sec.querySelector('[data-kwspan]');
      if (t) t.textContent = range === 'All' ? (doc && u ? 'since ' + yearOf(T().start) : 'all candles') : 'last ' + RANGES[range] + ' years';
      if (doc) {
        $('kwEpIdx').textContent = gmeta(u).short || gmeta(u).label;
        $('kwEpHead').textContent = 'Every armed spell since ' + yearOf(W_(u).tf['1W'].start);
      }
    }


    function niceStep(spn, px, minPx, steps) {
      for (var k = 0; k < steps.length; k++) if (steps[k] / spn * px >= minPx) return steps[k];
      return steps[steps.length - 1];
    }
    function setTf() {
      var t = T(), g = grp(u), pr = g.prices[P] || [];
      DN = t.ei.map(function (i) { return dnOf(doc.days[i]); });
      PX = t.ei.map(function (i) { var v = pr[i - g.start_i]; return v == null ? null : v; });
      OPX = t.open && t.open.ei != null ? (pr[t.open.ei - g.start_i] == null ? null : pr[t.open.ei - g.start_i]) : null;
    }
    function draw() {
      var holder = $('chartKW'); clear(holder);
      if (!doc) return;
      var t = T(), n = t.s.length, last = n - 1, o = t.open, label = gmeta(u).short || gmeta(u).label, pn = priceName(P);
      var W = Math.max(300, Math.round(holder.clientWidth || sec.clientWidth || 360)), narrow = W < 640;
      var L = narrow ? 36 : 46, R = narrow ? 12 : 16, pw = W - L - R;
      var sH = narrow ? 104 : 140, gap = narrow ? 10 : 14, fH = narrow ? 210 : 270, axH = 22;
      var H = sH + gap + fH + axH, fTop = sH + gap;
      var yrs = RANGES[range], i0 = 0;
      if (isFinite(yrs)) { var cut = DN[last] - yrs * 365.25; while (i0 < last && DN[i0] < cut) i0++; }
      var slots = last - i0 + 1 + (o ? 1 : 0);
      var X = function (i) { return L + (i - i0 + 0.5) / slots * pw; };
      var fs = narrow ? 10.5 : 11.5, fsT = narrow ? 10 : 11;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': label + ' washout meter with ' + pn + ' above' }, holder);
      var defs = el('defs', {}, svg);
      var cpS = el('clipPath', { id: 'kwclipS' }, defs); el('rect', { x: L, y: 0, width: pw, height: sH }, cpS);
      var cpF = el('clipPath', { id: 'kwclipF' }, defs); el('rect', { x: L, y: fTop, width: pw, height: fH }, cpF);
      el('rect', { x: L, y: 0, width: pw, height: sH, fill: C.panel, rx: 3 }, svg);
      el('rect', { x: L, y: fTop, width: pw, height: fH, fill: C.panel, rx: 3 }, svg);
      var cw = pw / slots, i;

      if (t.armed) {
        for (i = i0; i <= last; i++) {
          if (!t.armed[i] || (i > i0 && t.armed[i - 1])) continue;
          var j = i; while (j + 1 <= last && t.armed[j + 1]) j++;
          var xa = X(i) - cw / 2, wa = (j - i + 1) * cw;
          if (o && j === last) wa += cw;
          el('rect', { x: xa.toFixed(1), y: fTop, width: Math.max(1.5, wa).toFixed(1), height: fH, fill: C.amb, 'fill-opacity': 0.13 }, svg);
          el('rect', { x: xa.toFixed(1), y: 0, width: Math.max(1.5, wa).toFixed(1), height: sH, fill: C.amb, 'fill-opacity': 0.07 }, svg);
        }
      }

      var ticks = [], prev = null, span_ = DN[last] - DN[i0], every = narrow && span_ > 3000 ? 2 : 1;
      for (i = i0; i <= last; i++) {
        var dd = dt(DN[i]);
        if (span_ < 800) {
          var mk = dd.getUTCFullYear() * 12 + dd.getUTCMonth();
          if (prev !== null && mk !== prev && mk % (narrow ? 4 : 3) === 0) ticks.push({ i: i, s: dd.getUTCMonth() === 0 ? String(dd.getUTCFullYear()) : MON[dd.getUTCMonth()] });
          prev = mk;
        } else {
          var y = dd.getUTCFullYear();
          if (prev !== null && y !== prev && y % every === 0) ticks.push({ i: i, s: narrow && span_ > 3000 ? "'" + String(y).slice(2) : String(y) });
          prev = y;
        }
      }
      ticks.forEach(function (tk) {
        var xx = X(tk.i) - cw / 2;
        el('line', { x1: xx, x2: xx, y1: 0, y2: sH, stroke: C.line, 'stroke-width': 1 }, svg);
        el('line', { x1: xx, x2: xx, y1: fTop, y2: fTop + fH, stroke: C.line, 'stroke-width': 1 }, svg);
        tx(svg, xx, H - 6, tk.s, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
      });

      var pmin = Infinity, pmax = -Infinity;
      for (i = i0; i <= last; i++) if (PX[i] != null) { pmin = Math.min(pmin, PX[i]); pmax = Math.max(pmax, PX[i]); }
      if (o && OPX != null) { pmin = Math.min(pmin, OPX); pmax = Math.max(pmax, OPX); }
      if (!isFinite(pmin)) { pmin = 0; pmax = 1; }
      var ppad = Math.max((pmax - pmin) * 0.08, 0.5), q0 = pmin - ppad, q1 = pmax + ppad;
      var Ys = function (v) { return sH - 4 - (v - q0) / (q1 - q0) * (sH - 22); };
      var pst = niceStep(q1 - q0, sH - 22, narrow ? 18 : 26, [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000]);
      for (var pv = Math.ceil(q0 / pst) * pst; pv <= q1; pv += pst) {
        var py = Ys(pv); if (py < 16 || py > sH - 2) continue;
        el('line', { x1: L, x2: L + pw, y1: py, y2: py, stroke: C.line, 'stroke-width': 1 }, svg);
        tx(svg, L - 5, py + 3.5, String(Math.round(pv)), { fill: C.muted, 'font-size': fs, 'text-anchor': 'end' });
      }
      var dP = '', pen = false;
      for (i = i0; i <= last; i++) {
        if (PX[i] == null) { pen = false; continue; }
        dP += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Ys(PX[i]).toFixed(1); pen = true;
      }
      el('path', { d: dP, fill: 'none', stroke: C.text, 'stroke-width': narrow ? 1.1 : 1.3, 'stroke-linejoin': 'round', 'clip-path': 'url(#kwclipS)' }, svg);
      if (o && OPX != null && PX[last] != null)
        el('line', { x1: X(last), y1: Ys(PX[last]), x2: X(last + 1), y2: Ys(OPX), stroke: C.ghost, 'stroke-width': 1.3, 'stroke-dasharray': '2 2' }, svg);
      tx(svg, L + 7, 14, pn + ' · ' + TFN[tf].toLowerCase() + ' close', { fill: C.text, 'font-size': narrow ? 11 : 12 });

      var smax = 0, imax = i0;
      for (i = i0; i <= last; i++) if (t.s[i] > smax) { smax = t.s[i]; imax = i; }
      var top = Math.max(smax, o ? o.s : 0, t.ln[1] + 6) * 1.12;
      var Yf = function (v) { return fTop + fH - 4 - v / top * (fH - 26); };
      var fst = niceStep(top, fH - 26, 26, [5, 10, 20, 25]);
      for (var fv = 0; fv <= top + 1e-9; fv += fst) {
        var fy = Yf(fv); if (fy < fTop + 18) continue;
        el('line', { x1: L, x2: L + pw, y1: fy, y2: fy, stroke: C.line, 'stroke-width': 1 }, svg);
        tx(svg, L - 5, fy + 3.5, fv + '%', { fill: C.light, 'font-size': fs, 'text-anchor': 'end' });
      }
      var y0 = Yf(0), dA = 'M' + X(i0).toFixed(1) + ' ' + y0.toFixed(1), dL = '';
      for (i = i0; i <= last; i++) {
        var ax = X(i).toFixed(1), ay = Yf(t.s[i]).toFixed(1);
        dA += 'L' + ax + ' ' + ay; dL += (i === i0 ? 'M' : 'L') + ax + ' ' + ay;
      }
      dA += 'L' + X(last).toFixed(1) + ' ' + y0.toFixed(1) + 'Z';
      el('path', { d: dA, fill: C.blue, 'fill-opacity': 0.28, 'clip-path': 'url(#kwclipF)' }, svg);
      function hline(v, col, dash, wdt) {
        var yy = Yf(v);
        if (yy < fTop + 2 || yy > fTop + fH - 2) return;
        el('line', { x1: L, x2: L + pw, y1: yy.toFixed(1), y2: yy.toFixed(1), stroke: col, 'stroke-width': wdt, 'stroke-dasharray': dash }, svg);
      }
      if (tf === '1W') hline(t.ln[2], C.grey, '2 3', 1);
      hline(t.ln[1], C.strong, '6 4', 1.3);
      hline(t.ln[0], C.amb, '6 4', 1.3);
      el('path', { d: dL, fill: 'none', stroke: C.light, 'stroke-width': narrow ? 1.2 : 1.4, 'stroke-linejoin': 'round', 'clip-path': 'url(#kwclipF)' }, svg);
      tx(svg, L + 7, fTop + 15, label + ' · % washed out (' + TFN[tf].toLowerCase() + ' KDJ)', { fill: C.text, 'font-size': narrow ? 11 : 12 });

      var rD = narrow ? 3.4 : 4, shown = 0;
      t.dots.forEach(function (dtt) {
        if (dtt.i < i0 || dtt.i > last) return;
        shown++;
        var col = dtt.strong ? C.strong : C.amb, dx = X(dtt.i);
        el('circle', { cx: dx, cy: Yf(t.s[dtt.i]), r: rD, fill: col, stroke: C.bg, 'stroke-width': 1.2 }, svg);
        if (PX[dtt.i] != null) el('circle', { cx: dx, cy: Ys(PX[dtt.i]), r: rD - 0.6, fill: col, stroke: C.bg, 'stroke-width': 1.1 }, svg);
      });

      if (imax !== last && smax > 0) {
        var mx = X(imax), my = Yf(t.s[imax]), ms = monY(doc.days[t.ei[imax]]) + ' ' + p0(t.s[imax]), mw = textW(ms, fsT);
        var mlx = Math.max(L + 4 + mw / 2, Math.min(L + pw - 4 - mw / 2, mx));
        tx(svg, mlx, Math.max(fTop + 30, my - 9), ms, { fill: C.white, 'font-size': fsT, 'font-weight': 600, 'text-anchor': 'middle', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
      }

      var nx = X(last), ny = Yf(t.s[last]), rN = narrow ? 4.5 : 5.5;
      if (o) {
        var gx = X(last + 1), gy = Yf(o.s);
        el('rect', { x: (gx - cw / 2).toFixed(1), y: fTop, width: cw.toFixed(1), height: fH, fill: C.ghost, 'fill-opacity': 0.12 }, svg);
        el('line', { x1: nx, y1: ny, x2: gx, y2: gy, stroke: C.ghost, 'stroke-width': 1.4, 'stroke-dasharray': '2 2' }, svg);
        el('circle', { cx: gx, cy: gy, r: rN, fill: 'none', stroke: C.white, 'stroke-width': 1.8 }, svg);
        if (OPX != null) el('circle', { cx: gx, cy: Ys(OPX), r: rN - 1.5, fill: 'none', stroke: C.white, 'stroke-width': 1.4 }, svg);
        var gs = 'so far ' + p0(o.s);
        tx(svg, gx - rN - 4, Math.min(fTop + fH - 8, gy - rN - 5), gs, { fill: C.white, 'font-size': fsT + 0.5, 'font-weight': 700, 'text-anchor': 'end', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
      }
      el('circle', { cx: nx, cy: ny, r: rN + 3, fill: C.light, 'fill-opacity': 0.3 }, svg);
      el('circle', { cx: nx, cy: ny, r: rN, fill: '#EEF5FF', stroke: C.white, 'stroke-width': 1.5 }, svg);
      if (PX[last] != null) el('circle', { cx: nx, cy: Ys(PX[last]), r: rN - 1.5, fill: '#EEF5FF', stroke: C.white, 'stroke-width': 1.2 }, svg);
      var ls = (tf === '1M' ? MON[dt(DN[last]).getUTCMonth()] : dayS(doc.days[t.ei[last]])) + ' ' + p0(t.s[last]);
      tx(svg, nx - rN - 6, Math.min(fTop + fH - 8, ny + rN + 14), ls, { fill: C.white, 'font-size': fsT + 0.5, 'font-weight': 700, 'text-anchor': 'end', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
      var cross = el('g', {}, svg);
      geo = { L: L, pw: pw, i0: i0, slots: slots, last: last, X: X, Yf: Yf, Ys: Ys, cross: cross, fTop: fTop, fH: fH, shown: shown };
      setHover(hoverI);
    }
    function setHover(i) {
      if (!geo || !doc) return;
      var t = T(), o = t.open, last = geo.last, pn = priceName(P);
      clear(geo.cross);
      var maxI = last + (o ? 1 : 0);
      if (i != null && (i < geo.i0 || i > maxI)) i = null;
      hoverI = i;
      var j = i == null ? last : i, ghost = o && j === last + 1;
      var s = ghost ? o.s : t.s[j], px = ghost ? OPX : PX[j];
      if (i != null) {
        var hx = geo.X(i);
        el('line', { x1: hx, x2: hx, y1: 0, y2: geo.fTop + geo.fH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
        el('circle', { cx: hx, cy: geo.Yf(s), r: 4, fill: ghost ? 'none' : C.light, stroke: C.white, 'stroke-width': 1.2 }, geo.cross);
        if (px != null) el('circle', { cx: hx, cy: geo.Ys(px), r: 3.4, fill: C.text, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
      }
      var ro = $('roKW'); clear(ro);
      if (ghost) {
        ro.appendChild(span('d', soFarWords(o, tf)));
        ro.appendChild(span('', ' · '));
        ro.appendChild(span('vr', p1(o.s) + ' washed out'));
        ro.appendChild(span('', ' (' + o.wn + ' of ' + num(o.n) + ')'));
        ro.appendChild(span('m', ' · as if the ' + CANDLE[tf] + ' closed at the last close'));
      } else {
        var tr = tierOf(t, j);
        ro.appendChild(span('d', candleName(doc.days[t.ei[j]], tf)));
        ro.appendChild(span('', ' · '));
        ro.appendChild(span('vr', p1(t.s[j]) + ' washed out'));
        ro.appendChild(span('', ' (' + t.wn[j] + ' of ' + num(t.n[j]) + ') · '));
        ro.appendChild(span(tr.c, tr.w));
      }
      if (px != null) ro.appendChild(span('', ' · ' + pn + ' ' + pxS(px)));
      if (i == null) ro.appendChild(span('m', ' · tap or hover the chart for any ' + CANDLE[tf]));
    }
    function pickAt(ev) {
      if (!geo) return;
      var box = $('chartKW'), svg = box.querySelector('svg');
      if (!svg) return;
      var r = box.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width, xx = (ev.clientX - r.left) * scale;
      var i = Math.round(geo.i0 + (xx - geo.L) / geo.pw * geo.slots - 0.5);
      setHover(Math.max(geo.i0, Math.min(geo.last + (T().open ? 1 : 0), i)));
    }
    function renderLegend() {
      var lg = $('lgKW'); clear(lg);
      var t = T();
      function item(cls, s) { var it = span('lg-i', ''); it.appendChild(span(cls, '')); it.appendChild(document.createTextNode(s)); lg.appendChild(it); }
      item('lg-kwspy', priceName(P) + ' close');
      item('lg-kwm', '% washed out');
      if (tf === '1W') {
        item('lg-kwa', 'ARM level'); item('lg-kws', 'STRONG level'); item('lg-kwdis', 'disarm level'); item('lg-kwband', 'weeks the meter was armed');
        item('lg-kwda', 'spike above ARM'); item('lg-kwds', 'spike that reached STRONG');
      } else {
        item('lg-kwa', 'ARM-level line (as rare as ARM on the weekly)'); item('lg-kws', 'STRONG-level line (as rare as STRONG on the weekly)');
        item('lg-kwda', 'spike above the ARM-level line'); item('lg-kwds', 'spike that reached the STRONG-level line');
      }
      item('lg-now', 'last closed ' + CANDLE[tf]);
      if (t.open) item('lg-kwring', CANDLE[tf] + ' so far');
    }


    function renderTable() {
      var x = W_(u), eps = x.episodes.slice().reverse(), tb = $('tableKW'), pn = priceName(P); clear(tb);
      var hd = elh('thead', '', null, tb), hr = elh('tr', '', null, hd);
      [['Armed (week ending)', ''], ['Peak', ''], ['Weeks', 'wide-only'], ['Off 1-yr high', 'wide-only'], ['4 wk', 'wide-only'], ['13 wk', ''], ['26 wk', ''], ['Worst, next 13 wk', '']]
        .forEach(function (h) { elh('th', h[1], h[0], hr); });
      var bd = elh('tbody', '', null, tb);
      if (!eps.length) {
        var er = elh('tr', '', null, bd), ec = elh('td', '', 'No armed weekly spell since ' + yearOf(x.tf['1W'].start) + '.', er); ec.colSpan = 8;
      }
      eps.forEach(function (e) {
        var q = (e.p && e.p[P]) || {};
        var tr = elh('tr', e.running ? 'now' : '', null, bd);
        elh('td', '', dayS(e.d, { year: true }), tr);
        var pk = elh('td', '', null, tr);
        pk.appendChild(span(e.strong ? 'kt-strong' : 'kt-arm', p0(e.peak)));
        pk.appendChild(span('m', ' ' + dayS(e.peak_d)));
        elh('td', 'wide-only', e.running ? e.weeks + '+' : String(e.weeks), tr);
        elh('td', 'wide-only', sgn(q.off52), tr);
        elh('td', 'wide-only', q.r4 == null ? '…' : sgn(q.r4), tr);
        elh('td', '', q.r13 == null ? '…' : sgn(q.r13), tr);
        elh('td', '', q.r26 == null ? '…' : sgn(q.r26), tr);
        var wd = q.dip13 == null ? '…' : q.dip13 >= 0 ? 'none' : sgn(q.dip13);
        elh('td', '', wd + (e.dip_done ? '' : ' so far'), tr);
      });
      var b = x.base && x.base[P];
      if (b) {
        var bs = elh('tr', 'base', null, bd);
        elh('td', '', 'Any week since ' + yearOf(x.tf['1W'].start), bs);
        elh('td', '', '', bs); elh('td', 'wide-only', '', bs); elh('td', 'wide-only', '', bs); elh('td', 'wide-only', '', bs);
        elh('td', '', sgn(b.r13 && b.r13.med), bs); elh('td', '', sgn(b.r26 && b.r26.med), bs); elh('td', '', '', bs);
      }
      var cap = 'One row per spell the weekly meter was armed (from the week it armed until it disarmed), with ' + priceWord(P) +
        ' from that week’s close. A spell can hold more than one spike. Worst = lowest weekly close in the next 13 weeks against the arming week’s close.';
      if (b && b.r13 && b.r26) cap += ' Any week: ' + priceWord(P) + ' was up 13 weeks later ' + Math.round(b.r13.up) + '% of the time (median ' + sgn(b.r13.med) + ', ' + num(b.r13.n) +
        ' weeks), 26 weeks later ' + Math.round(b.r26.up) + '% (median ' + sgn(b.r26.med) + ').';
      $('capKW').textContent = cap;
    }


    function renderWords() {
      function line(k) {
        var x = W_(k), w = x.tf['1W'], tr = cardTier(x), m = gmeta(k), z = (m.short || m.label) + ' ' + p1(w.last.s) + ' (' + tr.w + ')';
        if (w.open) z += ', ' + p0(w.open.s) + ' so far this week';
        return z;
      }
      $('howKW').textContent = 'KDJ is a momentum gauge. A stock counts as washed out when its KDJ is pushed to the bottom of its range by a fast drop: as oversold as the gauge shows. ' +
        'Each week the meter counts the group’s washed-out stocks. Past its ARM level it arms, past a higher STRONG level it calls it STRONG, and it stays armed until the count falls back to its disarm level. ' +
        'Dots mark each separate spike above the ARM line (green if it reached STRONG); shaded weeks are when the meter was armed. The daily, 2-week and monthly views count the same thing on other candle sizes, ' +
        'with lines set to be as rare as the ARM and STRONG levels are on the weekly; the meter arms on the weekly only.';
      var x = W_(u), sw = x.tf['1W'], m = gmeta(u), nw = order().map(line).join('. ') + '. ';
      if (sw.state.armed) {
        nw += 'The ' + (m.short || m.label) + ' meter armed in the week ending ' + dayS(sw.state.since) + (sw.state.first_strong ? ' and first reached STRONG on ' + dayS(sw.state.first_strong) : '') +
          (sw.state.peak != null ? ' (peak ' + p1(sw.state.peak) + ')' : '') + '. ';
      }
      var nn = x.now && x.now[P];
      if (nn && nn.off52 != null) nw += priceSubj(P) + ' closed ' + dayS(nn.d, { dow: true }) + ' ' + (nn.off52 > -0.05 ? 'at' : Math.abs(nn.off52).toFixed(1) + '% below') + ' its 52-week high.';
      $('nowKW').textContent = nw;
      var st = x.tf[tf].start;
      $('honestKW').textContent = 'Counts today’s members back in time. A stock counts once it has enough closed candles, and each meter starts once half of today’s members have them (' +
        TFN[tf].toLowerCase() + ' ' + (gmeta(u).short || gmeta(u).label) + ' meter: ' + (st ? dayS(st, { year: true }) : '–') + '). ' +
        'The open candle is shown as if it closed at the last close. Rebuilt with every update of the page.';
    }
    function renderSub() {
      $('subKW').textContent = 'How many ' + (grp(u).words || 'stocks') + ' are maxed-out oversold on KDJ, on ' + TFN[tf].toLowerCase() +
        ' candles, with the weekly ARMED and STRONG levels. The cards pick the group.';
    }

    function drawAll() { if (!doc) return; renderControls(); setTf(); draw(); renderLegend(); renderSub(); try { renderWords(); } catch (e) { } }
    function renderAll() { renderAsof(); renderCards(); renderTable(); drawAll(); }
    function showErr(msg) {
      $('errKW').hidden = false; $('bodyKW').hidden = true; $('errKW').textContent = msg;
    }
    function load() {
      var d = A.data();
      if (!d || !d.groups) return;
      doc = d;
      var ks = order();
      if (!ks.length || !ks.every(function (k) { return ok(doc.groups[k].kdjwash); })) { showErr('The KDJ washout meter is not in this update of the data. The breadth charts are not affected.'); return; }
      if (!u || !doc.groups[u]) u = A.group();
      if (!doc.groups[u] || ks.indexOf(u) < 0) u = ks[0];
      P = A.price();
      $('errKW').hidden = true; $('bodyKW').hidden = false;
      hoverI = null;
      try { renderAll(); } catch (e) { showErr('The KDJ washout meter could not be drawn. The breadth charts are not affected.'); if (window.console) console.warn('kdjwash', e); }
    }

    sec.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-kwi],[data-kwt],[data-kwr]');
      if (!b || !doc) return;
      if (b.hasAttribute('data-kwi')) { u = b.getAttribute('data-kwi'); renderAsof(); renderTable(); }
      if (b.hasAttribute('data-kwt')) tf = b.getAttribute('data-kwt');
      if (b.hasAttribute('data-kwr')) { range = b.getAttribute('data-kwr'); try { localStorage.setItem(RKEY, range); } catch (e) { } }
      hoverI = null;
      try { drawAll(); } catch (e) { showErr('The KDJ washout meter could not be drawn. The breadth charts are not affected.'); }
    });
    var chart = $('chartKW');
    chart.addEventListener('pointermove', pickAt);
    chart.addEventListener('pointerdown', pickAt);
    chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });
    var rt = null, lastW = -1;
    function onSize() { var cw = chart.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(function () { try { drawAll(); } catch (e) { } }, 80); }
    if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart);
    else window.addEventListener('resize', onSize);

    renderControls();
    A.on('data', load);
    A.on('group', function (k) { if (!doc) return; u = k; hoverI = null; try { renderAll(); } catch (e) { } });
    A.on('price', function (p) { if (!doc) return; P = p; hoverI = null; try { renderTable(); drawAll(); } catch (e) { } });
  }
})();
