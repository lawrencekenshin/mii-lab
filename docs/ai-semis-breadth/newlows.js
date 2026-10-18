






(function () {
  'use strict';
  function start() {
    var sec = document.getElementById('newlows');
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
      red: '#EF5350', px: '#8EC0FA', K: '#4FC3F7', D: '#FFB74D', J: '#8A8F9E', up: '#26A69A', ytxt: '#E8C547', hi: '#4DB6AC' };
    var TFS = ['1D', '1W', '2W', '1M'];
    var TFN = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
    var UNIT = { '1D': 'day', '1W': 'week', '2W': '2-week candle', '1M': 'month' };
    var UNITS = { '1D': 'days', '1W': 'weeks', '2W': '2-week candles', '1M': 'months' };
    var THIS = { '1D': 'today', '1W': 'this week', '2W': 'this 2-week candle', '1M': 'this month' };
    var RANGES = { '1Y': 1, '2Y': 2, '5Y': 5, '10Y': 10, 'All': Infinity };
    var RWORDS = { '1Y': 'last year', '2Y': 'last 2 years', '5Y': 'last 5 years', '10Y': 'last 10 years', 'All': 'since 2013' };
    var RDEF = { '1D': '2Y', '1W': '5Y', '2W': '5Y', '1M': 'All' };
    var NS = 'http://www.w3.org/2000/svg';
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    var doc = null, G = null, P = null, tf = '1D', R = { '1D': RDEF['1D'], '1W': RDEF['1W'], '2W': RDEF['2W'], '1M': RDEF['1M'] };
    var hoverI = null, geo = null, DN = null, XS = null, TT = null, PX = null;

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
    function monthS(s) { var d = dt(dnOf(s)); return MONL[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
    function num(v) { return v == null ? '–' : v.toLocaleString('en-US'); }
    function pxS(v) { return v == null ? '–' : v.toFixed(2); }

    function sinceWords(o, f, withN) {
      if (!o.since) return 'the most since 2013';
      var when = periodName(o.since.d, f, { year: true });
      if (o.since.prev) return o.since.n > o.n ? 'down from ' + num(o.since.n) + ' (' + when + ')' : 'same count as ' + when;
      return 'most since ' + when + (withN ? ' (' + num(o.since.n) + ')' : '');
    }
    function f1(v) { if (v == null) return '–'; var s = v.toFixed(1); return s === '-0.0' ? '0.0' : s; }
    function priceName(p) { return (doc && doc.meta && doc.meta.price_head && doc.meta.price_head[p]) || p; }
    function T() { return G.newlows[tf]; }
    function isOpenAt(t, i) { return !!t.open && i === t.n.length - 1; }
    function isoS(dn) { return dt(dn).toISOString().slice(0, 10); }
    function words() { return G.words || 'stocks'; }


    function periodName(s, which, opt) {
      opt = opt || {};
      if (which === '1D') return dayS(s, { dow: opt.dow, year: opt.year });
      if (which === '1M') return monthS(s);
      var dn = dnOf(s);
      if (which === '1W') return (opt.cap ? 'Week of ' : 'the week of ') + dayS(isoS(dn - (dt(dn).getUTCDay() + 6) % 7), { year: opt.year });
      var q0 = 4 + Math.floor((dn - 4) / 14) * 14;
      return (opt.cap ? '2 weeks to ' : 'the 2 weeks to ') + dayS(isoS(q0 + 11), { year: opt.year });
    }
    function candleName(i, which) { return periodName(TT[i], which, { dow: true, year: true, cap: true }); }
    function whenWords(t, which) {
      var L = t.n.length - 1, s = TT[L];
      if (isOpenAt(t, L)) return 'so far ' + THIS[which] + ' (through ' + dayS(s, { dow: true, year: true }) + ')';
      if (which === '1D') return 'on ' + dayS(s, { dow: true, year: true });
      return 'in ' + periodName(s, which, { year: true });
    }
    function shareWords(p, which) { return f1(p) + '% of the ' + words() + ' counted ' + (which === '1D' ? 'are at a new low' : 'hit a new low'); }
    function rankWords(r, which, since) {
      if (r == null) return '';
      if (r >= 99.95) return 'higher than every ' + UNIT[which] + ' since ' + since;
      return 'higher than ' + Math.round(r) + '% of ' + UNITS[which] + ' since ' + since;
    }
    function ok(N) {
      return N && TFS.every(function (f) {
        var t = N[f], n = t && Array.isArray(t.n) && t.n.length;
        return n > 20 && ['ei', 'e', 'pct', 'k', 'd', 'j'].every(function (a) { return Array.isArray(t[a]) && t[a].length === n; }) &&
          Array.isArray(t.x) && t.now && typeof t.now.n === 'number';
      });
    }


    if (!sec.getAttribute('aria-labelledby')) sec.setAttribute('aria-labelledby', 'tnl');
    sec.innerHTML =
      '<div class="card-head"><div class="card-title">' +
      '<h2 id="tnl">New 52-week lows<span class="tsep"> · </span><span class="tspan" data-nlspan>Daily · last 2 years</span></h2>' +
      '<p class="sub" id="subNL">How many of the group’s stocks hit a new 52-week low that day.</p></div>' +
      '<div class="seg nl-tf" id="tfNL" role="group" aria-label="Candle size" hidden>' +
      '<button type="button" data-nlt="1D" aria-pressed="true">Daily</button><button type="button" data-nlt="1W" aria-pressed="false">Weekly</button>' +
      '<button type="button" data-nlt="2W" aria-pressed="false">2-week</button><button type="button" data-nlt="1M" aria-pressed="false">Monthly</button></div></div>' +
      '<p class="panel-asof" id="asofNL">Loading the new-lows count…</p>' +
      '<p class="banner banner-warn" id="errNL" hidden></p>' +
      '<div id="bodyNL" hidden>' +
      '<div class="nl-now" id="nowNL" aria-live="polite"></div>' +
      '<div class="controls nl-controls"><div class="seg seg-range nl-range" role="group" aria-label="New lows time window">' +
      '<button type="button" data-nlr="1Y" aria-pressed="false" aria-label="Last year">1Y</button>' +
      '<button type="button" data-nlr="2Y" aria-pressed="true" aria-label="Last 2 years">2Y</button>' +
      '<button type="button" data-nlr="5Y" aria-pressed="false" aria-label="Last 5 years">5Y</button>' +
      '<button type="button" data-nlr="10Y" aria-pressed="false" aria-label="Last 10 years">10Y</button>' +
      '<button type="button" data-nlr="All" aria-pressed="false" aria-label="Since 2013">All</button></div></div>' +
      '<div class="readout nl-ro" id="roNL" aria-live="polite"></div>' +
      '<div class="nl-chart" id="chartNL" role="img"></div>' +
      '<p class="legend" id="lgNL"></p>' +
      '<div class="box"><div class="box-row"><b>How to read it</b><span id="howNL"></span></div>' +
      '<div class="box-row"><b>Right now</b><span id="rightNL"></span></div></div>' +
      '<p class="kdj-honest" id="defNL"></p>' +
      '</div>';


    function renderAsof() {
      var a = $('asofNL'); clear(a);
      a.appendChild(span('chip chip-closed', doc.as_of && doc.as_of.state === 'LIVE' ? 'LIVE' : 'DAILY'));
      var t1 = G.newlows['1D'], L = t1.n.length - 1, b = new Date(doc.built_utc);
      var s = 'Sessions to ' + dayS(doc.days[t1.ei[L]], { dow: true, year: true });
      if (isOpenAt(t1, L)) s += ' (so far)';
      if (!isNaN(b)) s += ' · built ' + MON[b.getMonth()] + ' ' + b.getDate() + ', ' + String(b.getHours()).padStart(2, '0') + ':' + String(b.getMinutes()).padStart(2, '0');
      s += ' · ' + num(t1.e[L]) + ' of ' + num(G.n_listed) + ' ' + words() + ' counted';
      a.appendChild(span('', s));
    }
    function renderNow() {
      var t = T(), o = t.now, box = $('nowNL'); clear(box);
      var row = elh('div', 'nl-num', null, box);
      elh('span', 'nl-v', num(o.n), row);
      elh('span', 'nl-on', whenWords(t, tf), row);
      var sub = elh('p', 'nl-sub', null, box), items = [];
      if (o.n === 0) items.push('no ' + words().replace(/ stocks$/, '') + ' stock at a new 52-week low' + (tf === '1D' ? ' that day' : ' in the ' + (tf === '2W' ? '2 weeks' : UNIT[tf])));
      else {
        items.push(sinceWords(o, tf, true));
        if (o.r13 != null) items.push(rankWords(o.r13, tf, 2013));
      }
      if (o.pct != null) items.push(shareWords(o.pct, tf));
      items.forEach(function (s, k) {
        if (k) { sub.appendChild(document.createTextNode(' ')); sub.appendChild(span('nl-dot', '·')); sub.appendChild(document.createTextNode(' ')); }
        sub.appendChild(span('nl-it', s));
      });
    }
    function shortWhen(t, f) {
      var L = t.n.length - 1, s = doc.days[t.ei[L]];
      if (isOpenAt(t, L)) return 'so far ' + THIS[f];
      if (f === '1D') return 'on ' + dayS(s, { dow: true });
      return 'in ' + periodName(s, f);
    }
    function renderWords() {
      var box = $('rightNL'); clear(box);
      TFS.forEach(function (f) {
        var t = G.newlows[f], o = t.now, L = t.n.length - 1, ln = span('nl-rn', '');
        ln.appendChild(span('nl-rk', TFN[f] + ': '));
        ln.appendChild(span('nl-rv', num(o.n)));
        var s = ' ' + shortWhen(t, f);
        if (o.pct != null) s += ' (' + f1(o.pct) + '% of ' + num(o.e) + ')';
        if (Array.isArray(t.nh) && t.nh[L] != null) s += ' · ' + num(t.nh[L]) + ' new high' + (t.nh[L] === 1 ? '' : 's');
        if (o.n > 0) {
          s += ' · ' + sinceWords(o, f, false);
          if (o.r13 != null) s += ' · ' + rankWords(o.r13, f, 2013) + (o.r21 != null ? ' (' + Math.round(o.r21) + '% since 2021)' : '');
        }
        s += ' · K ' + f1(t.k[L]) + ', D ' + f1(t.d[L]);
        if (f !== '1D' && t.x.length) {
          var c = t.x[t.x.length - 1];
          s += ' · last cross ' + (c[1] > 0 ? '▲ ' : '▼ ') + periodName(doc.days[t.ei[c[0]]], f, { year: true }) + (c[1] > 0 ? ' (building' : ' (easing') + (isOpenAt(t, c[0]) ? ', so far)' : ')');
        }
        ln.appendChild(document.createTextNode(s));
        box.appendChild(ln);
      });
      $('howNL').textContent = 'Red bars: how many ' + words() + ' made a new 52-week low that day; on weekly, 2-week and monthly candles, how many made at least one inside the candle (each stock counted once). ' +
        'Tall bars mark broad selling, when many stocks break down at once even if the price holds up. The readout also gives the mirror count: stocks at a new 52-week high. ' +
        'Yellow numbers tag the biggest bars in view; the red tag at the right edge is the latest count, and a faded bar is a candle still open. ' +
        'Below, the KDJ of the share at a new low: K over 80 = new lows running hot against the recent candles, under 20 = calm. A red ▲ under the pane = K crossed above D (new lows building); a green ▼ over it = K crossed below D (easing). ' +
        'The crosses are marked on weekly, 2-week and monthly candles only; the daily KDJ swings too fast.';
      var rule = (doc.meta && doc.meta.rules && doc.meta.rules.newlows) || '';
      $('defNL').textContent = (rule ? rule + ' ' : '') + 'Counts today’s ' + words() + ' back in time. Weekly candles are calendar weeks, 2-week candles run in fixed pairs of weeks, and the newest candle stays open until its last weekday has closed. ' +
        'Ranks use the share of stocks at a new low, against closed candles of the same size since 2013 (an open candle is ranked so far).';
    }


    function renderControls() {
      var range = R[tf];
      Array.prototype.forEach.call(sec.querySelectorAll('[data-nlt]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-nlt') === tf)); });
      Array.prototype.forEach.call(sec.querySelectorAll('[data-nlr]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-nlr') === range)); });
      var t = sec.querySelector('[data-nlspan]'); if (t) t.textContent = TFN[tf] + ' · ' + RWORDS[range];
      var sb = $('subNL');
      if (sb && G) sb.textContent = tf === '1D' ? 'How many ' + words() + ' hit a new 52-week low that day.'
        : 'How many ' + words() + ' hit a new 52-week low at some point in the ' + (tf === '2W' ? '2 weeks' : UNIT[tf]) + ' (each stock counted once).';
    }


    function niceStep(spn, px, minPx, steps) {
      for (var k = 0; k < steps.length; k++) if (steps[k] / spn * px >= minPx) return steps[k];
      return steps[steps.length - 1];
    }
    function draw() {
      var holder = $('chartNL'); clear(holder);
      if (!doc || !G) return;
      var t = T(), n = t.n.length, last = n - 1, open = !!t.open, marks = tf !== '1D', pn = priceName(P), nh = Array.isArray(t.nh) && t.nh.length === n ? t.nh : null;
      var W = Math.max(300, Math.round(holder.clientWidth || sec.clientWidth || 360)), narrow = W < 640;
      var Lp = 2, Rp = narrow ? 40 : 50, pw = W - Lp - Rp;
      var pH = narrow ? 86 : 124, g1 = narrow ? 8 : 10, hH = narrow ? 178 : 262, mk = marks ? (narrow ? 13 : 15) : 6, kH = narrow ? 112 : 150, axH = 20;
      var hTop = pH + g1, kTop = hTop + hH + mk, H = kTop + kH + mk + axH;
      var yrs = RANGES[R[tf]], i0 = 0;
      if (isFinite(yrs)) { var cut = DN[last] - yrs * 365.25; while (i0 < last && DN[i0] < cut) i0++; }
      var slots = last - i0 + 1, cw = pw / slots;
      var X = function (i) { return Lp + (i - i0 + 0.5) * cw; };
      var fs = narrow ? 10.5 : 11.5, fsT = narrow ? 10 : 11, i;
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': pn + ' on top, the new-lows count in the middle, its KDJ below' }, holder);
      var defs = el('defs', {}, svg);
      var cpP = el('clipPath', { id: 'nlclipP' }, defs); el('rect', { x: Lp, y: 0, width: pw, height: pH }, cpP);
      var cpH = el('clipPath', { id: 'nlclipH' }, defs); el('rect', { x: Lp, y: hTop, width: pw, height: hH }, cpH);
      var cpK = el('clipPath', { id: 'nlclipK' }, defs); el('rect', { x: Lp, y: kTop, width: pw, height: kH }, cpK);
      [[0, pH], [hTop, hH], [kTop, kH]].forEach(function (p) {
        el('rect', { x: Lp, y: p[0], width: pw, height: p[1], fill: C.panel, stroke: C.line, 'stroke-width': 1, rx: 3 }, svg);
      });
      var ticks = [], prev = null, span_ = DN[last] - DN[i0], every = narrow && span_ > 3000 ? 2 : 1;
      for (i = i0; i <= last; i++) {
        var dd = dt(DN[i]);
        if (span_ < 800) {
          var mkey = dd.getUTCFullYear() * 12 + dd.getUTCMonth();
          if (prev !== null && mkey !== prev && mkey % (narrow ? 4 : 3) === 0) ticks.push({ i: i, s: dd.getUTCMonth() === 0 ? String(dd.getUTCFullYear()) : MON[dd.getUTCMonth()] });
          prev = mkey;
        } else {
          var y = dd.getUTCFullYear();
          if (prev !== null && y !== prev && y % every === 0) ticks.push({ i: i, s: narrow && span_ > 3000 ? "'" + String(y).slice(2) : String(y) });
          prev = y;
        }
      }
      ticks.forEach(function (tk) {
        var xx = (X(tk.i) - cw / 2).toFixed(1);
        [[0, pH], [hTop, hH], [kTop, kH]].forEach(function (p) {
          el('line', { x1: xx, x2: xx, y1: p[0] + 1, y2: p[0] + p[1] - 1, stroke: C.line, 'stroke-width': 1 }, svg);
        });
        tx(svg, xx, H - 5, tk.s, { fill: C.muted, 'font-size': fs, 'text-anchor': 'middle' });
      });
      function paneLabel(x0, y0, s) {
        var w = textW(s, fsT + 0.5) + 8;
        el('rect', { x: x0, y: y0, width: w, height: 16, fill: C.panel, 'fill-opacity': 0.88, rx: 2 }, svg);
        tx(svg, x0 + 4, y0 + 12, s, { fill: C.muted, 'font-size': fsT + 0.5 });
        return { x0: x0, x1: x0 + w, y0: y0, y1: y0 + 16 };
      }

      var pmin = Infinity, pmax = -Infinity;
      for (i = i0; i <= last; i++) if (PX[i] != null) { pmin = Math.min(pmin, PX[i]); pmax = Math.max(pmax, PX[i]); }
      if (!isFinite(pmin)) { pmin = 0; pmax = 1; }
      var ppad = Math.max((pmax - pmin) * 0.08, 0.5), q0 = pmin - ppad, q1 = pmax + ppad;
      var Yp = function (v) { return pH - 5 - (v - q0) / (q1 - q0) * (pH - 26); };
      var pst = niceStep(q1 - q0, pH - 26, narrow ? 20 : 28, [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000]);
      for (var pv = Math.ceil(q0 / pst) * pst; pv <= q1; pv += pst) {
        var py = Yp(pv); if (py < 8 || py > pH - 3) continue;
        el('line', { x1: Lp, x2: Lp + pw, y1: py.toFixed(1), y2: py.toFixed(1), stroke: C.line, 'stroke-width': 1 }, svg);
        tx(svg, Lp + pw + 5, py + 3.5, num(Math.round(pv)), { fill: C.muted, 'font-size': fs });
      }
      var dP = '', pen = false;
      for (i = i0; i <= last; i++) {
        if (PX[i] == null) { pen = false; continue; }
        dP += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yp(PX[i]).toFixed(1); pen = true;
      }
      el('path', { d: dP, fill: 'none', stroke: C.px, 'stroke-width': narrow ? 1.2 : 1.4, 'stroke-linejoin': 'round', 'clip-path': 'url(#nlclipP)' }, svg);
      paneLabel(Lp + 4, 4, pn);

      var nmax = 0;
      for (i = i0; i <= last; i++) nmax = Math.max(nmax, t.n[i]);
      var top = Math.max(10, nmax * 1.03), hRoom = 36;
      var Yh = function (v) { return hTop + hH - (v / top) * (hH - hRoom); };
      var hst = niceStep(top, hH - hRoom, narrow ? 26 : 34, [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]);
      var tagY = Yh(t.n[last]), hticks = [];
      for (var hv = 0; hv <= top * 1.12; hv += hst) {
        var hy = Yh(hv); if (hy < hTop + 8) continue;
        if (hv > 0) el('line', { x1: Lp, x2: Lp + pw, y1: hy.toFixed(1), y2: hy.toFixed(1), stroke: C.line, 'stroke-width': 1 }, svg);
        hticks.push([hv, hy]);
      }
      var bw = cw >= 2 ? Math.min(cw * 0.78, cw - 0.6) : Math.max(cw, 1), dB = '', y0 = Yh(0);
      for (i = i0; i <= last; i++) {
        if (!t.n[i] || (open && i === last)) continue;
        var bx = X(i) - bw / 2, by = Yh(t.n[i]);
        dB += 'M' + bx.toFixed(2) + ' ' + y0.toFixed(1) + 'V' + by.toFixed(1) + 'h' + bw.toFixed(2) + 'V' + y0.toFixed(1) + 'Z';
      }
      el('path', { d: dB, fill: C.red, 'clip-path': 'url(#nlclipH)' }, svg);
      if (open && t.n[last]) {
        var ow = Math.max(bw, Math.min(cw, 3));
        el('rect', { x: (X(last) - ow / 2).toFixed(2), y: Yh(t.n[last]).toFixed(1), width: ow.toFixed(2), height: (y0 - Yh(t.n[last])).toFixed(1), fill: C.red, 'fill-opacity': 0.42, stroke: C.red, 'stroke-opacity': 0.8, 'stroke-width': cw > 4 ? 1 : 0 }, svg);
      }
      var hl = paneLabel(Lp + 4, hTop + 4, 'New 52-week lows');
      var maxTags = narrow ? 5 : 8, wing = Math.max(1, Math.ceil((narrow ? 23 : 31) / cw)), orderP = [];
      for (i = i0; i < last; i++) {
        if (!(t.n[i] > 0) || t.n[i] < nmax * 0.15) continue;
        var pk = true;
        for (var j2 = Math.max(i0, i - wing); j2 <= Math.min(last, i + wing) && pk; j2++) {
          if (j2 !== i && (t.n[j2] > t.n[i] || (t.n[j2] === t.n[i] && j2 > i))) pk = false;
        }
        if (pk) orderP.push(i);
      }
      orderP.sort(function (a, b) { return t.n[b] - t.n[a] || b - a; });
      var boxes = [hl], tags = 0, topTag = null, gapX = narrow ? 6 : 10;
      for (var q = 0; q < orderP.length && tags < maxTags; q++) {
        var pi = orderP[q], ts = num(t.n[pi]), tw = textW(ts, fsT);
        var tcx = Math.max(Lp + tw / 2 + 2, Math.min(Lp + pw - tw / 2 - 2, X(pi))), ty = Math.max(hTop + 11, Yh(t.n[pi]) - 4);
        var bxx = { x0: tcx - tw / 2 - gapX, x1: tcx + tw / 2 + gapX, y0: ty - fsT, y1: ty + 3 };
        if (boxes.some(function (o) { return bxx.x0 < o.x1 && bxx.x1 > o.x0 && bxx.y0 < o.y1 && bxx.y1 > o.y0; })) continue;
        tx(svg, tcx, ty, ts, { fill: C.ytxt, 'font-size': fsT, 'font-weight': 600, 'text-anchor': 'middle', stroke: C.panel, 'stroke-width': 3, 'paint-order': 'stroke' });
        boxes.push(bxx); tags++;
        if (topTag == null) topTag = t.n[pi];
      }
      hticks.forEach(function (h) {
        if (Math.abs(h[1] - tagY) < 11) return;
        tx(svg, Lp + pw + 5, h[1] + 3.5, num(h[0]), { fill: C.muted, 'font-size': fs });
      });
      var tagS = num(t.n[last]), tagW = textW(tagS, fs + 0.5) + 9, tagX = Lp + pw + 2;
      var tyc = Math.max(hTop + 9, Math.min(hTop + hH - 9, tagY));
      el('rect', { x: tagX, y: (tyc - 9).toFixed(1), width: tagW.toFixed(1), height: 18, rx: 3, fill: C.red }, svg);
      tx(svg, tagX + 4.5, tyc + 4, tagS, { fill: C.bg, 'font-size': fs + 0.5, 'font-weight': 700 });

      var Yk = function (v) { return kTop + kH - 4 - (v + 10) / 120 * (kH - 8); };
      el('rect', { x: Lp, y: Yk(20).toFixed(1), width: pw, height: (Yk(-10) - Yk(20) + 4).toFixed(1), fill: C.up, 'fill-opacity': 0.07, 'clip-path': 'url(#nlclipK)' }, svg);
      el('rect', { x: Lp, y: (Yk(110) - 4).toFixed(1), width: pw, height: (Yk(80) - Yk(110) + 4).toFixed(1), fill: C.red, 'fill-opacity': 0.07, 'clip-path': 'url(#nlclipK)' }, svg);
      [20, 80].forEach(function (v) {
        el('line', { x1: Lp, x2: Lp + pw, y1: Yk(v).toFixed(1), y2: Yk(v).toFixed(1), stroke: C.muted, 'stroke-width': 0.8, 'stroke-dasharray': '3 3', 'stroke-opacity': 0.8 }, svg);
      });
      [0, 20, 50, 80, 100].forEach(function (v) { tx(svg, Lp + pw + 5, Yk(v) + 3.5, String(v), { fill: C.muted, 'font-size': fs }); });
      [['j', C.J, narrow ? 0.9 : 1, 0.85], ['d', C.D, narrow ? 1.3 : 1.5, 1], ['k', C.K, narrow ? 1.4 : 1.6, 1]].forEach(function (s) {
        var a = t[s[0]], d = '', pn2 = false, endI = open ? last - 1 : last;
        for (i = i0; i <= endI; i++) {
          if (a[i] == null) { pn2 = false; continue; }
          d += (pn2 ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yk(a[i]).toFixed(1); pn2 = true;
        }
        el('path', { d: d, fill: 'none', stroke: s[1], 'stroke-width': s[2], 'stroke-opacity': s[3], 'stroke-linejoin': 'round', 'clip-path': 'url(#nlclipK)' }, svg);
        if (open && last - 1 >= i0 && a[last] != null && a[last - 1] != null)
          el('line', { x1: X(last - 1).toFixed(1), y1: Yk(a[last - 1]).toFixed(1), x2: X(last).toFixed(1), y2: Yk(a[last]).toFixed(1), stroke: s[1],
            'stroke-width': s[2], 'stroke-opacity': s[3], 'stroke-dasharray': '2 2', 'clip-path': 'url(#nlclipK)' }, svg);
      });
      if (open) [['j', C.J, 2.2], ['d', C.D, 3], ['k', C.K, 3]].forEach(function (s) {
        if (t[s[0]][last] != null) el('circle', { cx: X(last).toFixed(1), cy: Yk(t[s[0]][last]).toFixed(1), r: s[2], fill: C.bg, stroke: s[1], 'stroke-width': 1.5 }, svg);
      });
      paneLabel(Lp + 4, kTop + 4, narrow ? 'KDJ of the share' : 'KDJ of the share at a new low');
      var shownX = 0;
      if (marks) {
        var s3 = narrow ? 3.6 : 4.2, yUp = kTop + kH + mk / 2 + 0.5, yDn = kTop - mk / 2 - 0.5;
        t.x.forEach(function (c) {
          if (c[0] < i0 || c[0] > last) return;
          var cx = X(c[0]), op = isOpenAt(t, c[0]) ? 0.5 : 1;
          if (c[1] > 0) el('path', { d: 'M' + cx.toFixed(1) + ' ' + (yUp - s3).toFixed(1) + 'l' + s3 + ' ' + (s3 * 1.7).toFixed(1) + 'h' + (-2 * s3) + 'Z', fill: C.red, 'fill-opacity': op }, svg);
          else el('path', { d: 'M' + cx.toFixed(1) + ' ' + (yDn + s3).toFixed(1) + 'l' + s3 + ' ' + (-s3 * 1.7).toFixed(1) + 'h' + (-2 * s3) + 'Z', fill: C.up, 'fill-opacity': op }, svg);
          shownX++;
        });
      }
      var cross = el('g', {}, svg);
      geo = { Lp: Lp, pw: pw, i0: i0, slots: slots, last: last, X: X, Yp: Yp, Yh: Yh, Yk: Yk, cw: cw, bw: bw, cross: cross,
        hTop: hTop, hH: hH, kTop: kTop, kH: kH, pH: pH, tags: tags, topTag: topTag, crosses: shownX, W: W, H: H, nh: nh };
      setHover(hoverI);
    }
    function setHover(i) {
      if (!geo || !doc) return;
      var t = T(), last = geo.last;
      clear(geo.cross);
      if (i != null && (i < geo.i0 || i > last)) i = null;
      hoverI = i;
      var j = i == null ? last : i, op = isOpenAt(t, j);
      if (i != null) {
        var hx = geo.X(i);
        [[1, geo.pH - 1], [geo.hTop + 1, geo.hTop + geo.hH - 1], [geo.kTop + 1, geo.kTop + geo.kH - 1]].forEach(function (p) {
          el('line', { x1: hx, x2: hx, y1: p[0], y2: p[1], stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 2' }, geo.cross);
        });
        if (t.n[i]) {
          var w = Math.max(geo.bw + 2, 3), yb = geo.Yh(t.n[i]);
          el('rect', { x: hx - w / 2, y: yb - 1, width: w, height: geo.Yh(0) - yb + 1, fill: 'none', stroke: C.white, 'stroke-width': 1 }, geo.cross);
        }
        if (PX[i] != null) el('circle', { cx: hx, cy: geo.Yp(PX[i]), r: 3.4, fill: C.px, stroke: C.bg, 'stroke-width': 1.2 }, geo.cross);
        if (t.k[i] != null) el('circle', { cx: hx, cy: geo.Yk(Math.max(-10, Math.min(110, t.k[i]))), r: 3.2, fill: C.K, stroke: C.bg, 'stroke-width': 1 }, geo.cross);
        if (t.d[i] != null) el('circle', { cx: hx, cy: geo.Yk(Math.max(-10, Math.min(110, t.d[i]))), r: 3.2, fill: C.D, stroke: C.bg, 'stroke-width': 1 }, geo.cross);
      }
      var ro = $('roNL'); clear(ro);
      ro.appendChild(span('d', candleName(j, tf)));
      if (op) ro.appendChild(span('m', ' (so far)'));
      ro.appendChild(span('', ' · '));
      ro.appendChild(span(op ? 'op' : 'nv', num(t.n[j]) + (t.n[j] === 1 ? ' new low' : ' new lows')));
      ro.appendChild(span('', ' of ' + num(t.e[j]) + ' counted'));
      if (geo.nh && geo.nh[j] != null) ro.appendChild(span('nh', ' · ' + num(geo.nh[j]) + (geo.nh[j] === 1 ? ' new high' : ' new highs')));
      ro.appendChild(span('', ' · '));
      ro.appendChild(span('kk', 'K ' + f1(t.k[j])));
      ro.appendChild(span('', ' '));
      ro.appendChild(span('kd', 'D ' + f1(t.d[j])));
      ro.appendChild(span('', ' '));
      ro.appendChild(span('kj', 'J ' + f1(t.j[j])));
      var xc = tf !== '1D' && XS && XS[j];
      if (xc) ro.appendChild(span(xc > 0 ? 'xu' : 'xd', xc > 0 ? ' · ▲ K crossed above D' : ' · ▼ K crossed below D'));
      if (PX[j] != null) ro.appendChild(span('', ' · ' + priceName(P) + ' ' + pxS(PX[j])));
      if (i == null) ro.appendChild(span('m', ' · tap or hover the chart for any ' + UNIT[tf]));
    }
    function pickAt(ev) {
      if (!geo) return;
      var box = $('chartNL'), svg = box.querySelector('svg');
      if (!svg) return;
      var r = box.getBoundingClientRect(), scale = svg.viewBox.baseVal.width / r.width, xx = (ev.clientX - r.left) * scale;
      var i = Math.floor(geo.i0 + (xx - geo.Lp) / geo.cw);
      setHover(Math.max(geo.i0, Math.min(geo.last, i)));
    }
    function renderLegend() {
      var lg = $('lgNL'); clear(lg);
      var t = T();
      function item(cls, s, txt) { var it = span('lg-i', ''); it.appendChild(span(cls, txt || '')); it.appendChild(document.createTextNode(s)); lg.appendChild(it); }
      item('lg-nlpx', priceName(P));
      item('lg-nlbar', 'new lows');
      if (t.open) { item('lg-nlopen', UNIT[tf] + ' so far'); item('lg-nlghost', 'KDJ so far, as if it closed today (hollow = not final)'); }
      if (geo && geo.topTag != null) item('lg-nlpk', 'biggest bars in view', num(geo.topTag));
      item('lg-nltag', 'latest count', num(t.n[t.n.length - 1]));
      item('lg-ln lg-k', 'K');
      item('lg-ln lg-d', 'D');
      item('lg-ln lg-j', 'J');
      if (tf !== '1D') {
        item('lg-nlup', 'K crosses up = new lows building');
        item('lg-nldn', 'K crosses down = easing');
      }
    }

    function setTf() {
      var t = T(), pr = G.prices[P] || [];
      TT = t.ei.map(function (i) { return doc.days[i]; });
      DN = TT.map(dnOf);
      PX = t.ei.map(function (i) { var v = pr[i - G.start_i]; return v == null ? null : v; });
      XS = {};
      t.x.forEach(function (c) { XS[c[0]] = c[1]; });
    }
    function drawAll() { if (!doc || !G) return; renderControls(); setTf(); renderNow(); draw(); renderLegend(); }
    function showErr(msg) {
      $('errNL').hidden = false; $('bodyNL').hidden = true; $('tfNL').hidden = true; $('errNL').textContent = msg;
      clear($('asofNL'));
    }
    function render() {
      doc = A.data();
      if (!doc || !doc.groups) return;
      G = doc.groups[A.group()] || null;
      P = A.price();
      if (!G || !ok(G.newlows)) { G = null; showErr('The new-lows count is not in this update of the data. The breadth charts are not affected.'); return; }
      $('errNL').hidden = true; $('bodyNL').hidden = false; $('tfNL').hidden = false;
      hoverI = null;
      try { setTf(); renderAsof(); renderWords(); drawAll(); }
      catch (e) { showErr('The new-lows count could not be drawn. The breadth charts are not affected.'); if (window.console) console.warn('newlows', e); }
    }

    sec.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-nlt],[data-nlr]');
      if (!b || !G) return;
      if (b.hasAttribute('data-nlt')) tf = b.getAttribute('data-nlt');
      if (b.hasAttribute('data-nlr')) R[tf] = b.getAttribute('data-nlr');
      hoverI = null;
      try { drawAll(); } catch (e) { showErr('The new-lows count could not be drawn. The breadth charts are not affected.'); }
    });
    var chart = $('chartNL');
    chart.addEventListener('pointermove', pickAt);
    chart.addEventListener('pointerdown', pickAt);
    chart.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') setHover(null); });
    var rt = null, lastW = -1;
    function onSize() { var cw = chart.clientWidth; if (cw === lastW) return; lastW = cw; clearTimeout(rt); rt = setTimeout(function () { try { drawAll(); } catch (e) { } }, 80); }
    if (window.ResizeObserver) new ResizeObserver(onSize).observe(chart);
    else window.addEventListener('resize', onSize);

    renderControls();
    A.on('data', render);
    A.on('group', render);
    A.on('price', function (p) { if (!G) return; P = p; hoverI = null; try { drawAll(); } catch (e) { } });
  }
})();
