



(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            accent: '#7E57C2', light: '#B39DDB', zero: '#5D6170' };
  var FONT = '-apple-system,BlinkMacSystemFont,Roboto,"Segoe UI","Helvetica Neue",Arial,sans-serif';

  var CAT = ['#9575CD', '#c98500', '#199e70', '#3987e5', '#d55181'];
  var NEUTRAL = ['#A9ADBA', '#6B7080', '#8A8E99'];




  var BLUE = ['#2B62C0', '#6E9BEA', '#B5CDF6'];
  var PAL = {
    core_cpi: CAT[0], head_cpi: CAT[1], c_head_cpi: CAT[1], core_pce: CAT[2], head_pce: CAT[3],
    c_ann3: CAT[0], c_ann6: CAT[1], c_yoy: CAT[2], c_rev: CAT[0], c_first: CAT[0], c_gap: NEUTRAL[0], c_rev2: NEUTRAL[0],
    c_mct: '#E6E8EE', c_supply: BLUE[0], c_demand: BLUE[2], c_ambig: '#5D6170', c_total: '#E6E8EE',
    c_goods: BLUE[0], c_serv: BLUE[1], c_house: BLUE[2],
    c_nom: CAT[0], c_real: CAT[2], c_infl: CAT[1], c_y2: CAT[3], c_y10: CAT[0], c_be2: NEUTRAL[0],
    c_act: CAT[3], c_cred: CAT[3], c_model: CAT[0], c_bench: NEUTRAL[0], c_clev: CAT[4], c_actual: '#4A4F5E',
    c_ref: C.muted,
    m_main: CAT[0], m_comp: CAT[1], m_b1: '#B4B8C4', m_b2: '#868B98', m_b3: '#62677A',
    m_x1: CAT[2], m_x2: CAT[3], m_x3: '#E6E8EE'
  };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var BASIS = { latest_revised: 'latest revised', first_release: 'as first published',
    asof_vintage: 'as available at the time', reference_snapshot: 'fixed research snapshot',
    operational_adaptation: 'operational adaptation', model_forecast: 'current model forecast',
    descriptive_statistic: 'historical estimate', imported: 'imported',
    walkforward_forecast: 'past forecast (walk-forward)', observed_outcome: 'realized outcome',
    revision: 'latest minus first release', calibration_bin: 'observed rate by forecast group' };
  var uid = 0;

  function color(tok) {
    if (!tok) return CAT[0];
    if (tok.charAt(0) === '#') return tok;
    if (PAL[tok]) return PAL[tok];
    var m = /^c(\d+)$/.exec(tok);
    if (m) { var i = +m[1] - 1; return i < 4 ? CAT[i] : NEUTRAL[(i - 4) % NEUTRAL.length]; }
    return CAT[0];
  }


  var pcache = Object.create(null);
  function per(x) {
    var c = pcache[x]; if (c) return c;
    var m, t0 = NaN, t1 = NaN, lab = String(x);
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x))) { t0 = Date.UTC(+m[1], +m[2] - 1, +m[3]); t1 = t0 + 864e5; lab = MON[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1]; }
    else if ((m = /^(\d{4})-(\d{2})$/.exec(x))) { t0 = Date.UTC(+m[1], +m[2] - 1, 1); t1 = Date.UTC(+m[1], +m[2], 1); lab = MON[+m[2] - 1] + ' ' + m[1]; }
    else if ((m = /^(\d{4})Q([1-4])$/.exec(x))) { t0 = Date.UTC(+m[1], (+m[2] - 1) * 3, 1); t1 = Date.UTC(+m[1], +m[2] * 3, 1); lab = m[1] + ' Q' + m[2]; }
    else if ((m = /^(\d{4})$/.exec(x))) { t0 = Date.UTC(+m[1], 0, 1); t1 = Date.UTC(+m[1] + 1, 0, 1); lab = m[1]; }
    c = { t0: t0, t1: t1, tm: (t0 + t1) / 2, lab: lab };
    pcache[x] = c; return c;
  }
  function fmtDay(s) { if (!s) return ''; var p = per(String(s).slice(0, 10)); return p.lab; }


  function shortUnits(u) {
    var l = String(u || '').toLowerCase();
    if (!l) return '';
    if (l.indexOf('percentage point') === 0 || l === 'pp' || l.indexOf('pp ') === 0 || /(^|[\s,])pp$/.test(l)) return ' pp';
    if (l.indexOf('percent') === 0 || l.charAt(0) === '%') return '%';
    if (l.indexOf('index') === 0) return ' (index)';
    return '';
  }
  function decimalsFor(vals) {
    var n = 0, tenth = true, mx = 0;
    for (var i = 0; i < vals.length && n < 400; i++) {
      var v = vals[i]; if (v == null) continue; n++;
      if (Math.abs(v * 10 - Math.round(v * 10)) > 1e-6) tenth = false;
      mx = Math.max(mx, Math.abs(v));
    }
    if (n && tenth && mx < 100) return 1;
    if (mx >= 1000) return 0;
    if (mx >= 100) return 1;
    if (mx > 0 && mx < 0.1) return 3;
    return 2;
  }
  function fmtNum(v, d) {
    if (v == null || !isFinite(v)) return 'n/a';
    var s = Math.abs(v).toFixed(d);
    if (+s === 0) return (0).toFixed(d);
    return (v < 0 ? '−' : '') + s;
  }
  function fmtSigned(v, d) { return v == null ? 'n/a' : (v > 0 ? '+' : '') + fmtNum(v, d); }
  function niceStep(span, n) {
    if (!(span > 0)) return 1;
    var raw = span / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    var s = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return s * p;
  }
  function ticksFor(lo, hi, n) {
    var st = niceStep(hi - lo, n), out = [], a = Math.ceil(lo / st - 1e-9) * st;
    for (var v = a; v <= hi + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
    var d = Math.max(0, -Math.floor(Math.log10(st) + 1e-9)), q = st * Math.pow(10, d);
    if (Math.abs(q - Math.round(q)) > 1e-9) d++;
    return { ticks: out, dec: Math.min(d, 4) };
  }
  function timeTicks(t0, t1, px) {
    var maxT = Math.max(2, Math.floor(px / 74)), months = (t1 - t0) / (30.44 * 864e5);
    var steps = [1, 2, 3, 6, 12, 24, 60, 120, 240, 600], st = 600;
    for (var i = 0; i < steps.length; i++) if (months / steps[i] <= maxT) { st = steps[i]; break; }
    var d = new Date(t0), y = d.getUTCFullYear(), m = d.getUTCMonth(), out = [];
    if (st >= 12) { var ys = st / 12; y = Math.ceil((y + (m > 0 || d.getUTCDate() > 1 ? 1 : 0)) / ys) * ys; m = 0; }
    else { m = Math.ceil((m + (d.getUTCDate() > 1 ? 1 : 0)) / st) * st; }
    for (var k = 0; k < 400; k++) {
      var t = Date.UTC(y, m, 1); if (t > t1) break;
      if (t >= t0) out.push({ t: t, lab: st >= 12 ? String(new Date(t).getUTCFullYear()) :
        (new Date(t).getUTCMonth() === 0 ? String(new Date(t).getUTCFullYear()) : MON[new Date(t).getUTCMonth()]) });
      if (st >= 12) y += st / 12; else { m += st; }
    }
    return out;
  }


  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var a = { x: x, y: y, fill: C.muted, 'font-size': 11, 'font-family': FONT };
    for (var k in attrs || {}) a[k] = attrs[k];
    var t = el('text', a, parent); t.textContent = s; return t;
  }
  function textW(s, fs) { return String(s).length * fs * 0.56; }
  function fit(s, px, fs) { s = String(s); var n = Math.max(4, Math.floor(px / (fs * 0.56))); return s.length > n ? s.slice(0, n - 1) + '\u2026' : s; }
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }


  function prepSeries(s) {
    var pts = [], isN = s.freq === 'N';
    for (var i = 0; i < s.x.length; i++) {
      var y = s.y[i];
      if (isN) pts.push({ t0: s.x[i], t1: s.x[i], tm: s.x[i], y: y, i: i, lab: String(s.x[i]) });
      else { var p = per(s.x[i]); pts.push({ t0: p.t0, t1: p.t1, tm: s.freq === 'D' || s.freq === 'W' ? p.t0 : p.tm, y: y, i: i, lab: p.lab }); }
    }
    return pts;
  }
  function bsearch(pts, t) {
    var lo = 0, hi = pts.length - 1;
    if (hi < 0) return -1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (pts[m].tm <= t) lo = m; else hi = m; }
    return Math.abs(pts[lo].tm - t) <= Math.abs(pts[hi].tm - t) ? lo : hi;
  }


  function Chart(host, legendHost, spec, ctx) {
    this.id = 'c' + (++uid);
    this.host = host; this.legendHost = legendHost;
    this.hidden = {};
    (spec.series || []).forEach(function (s) { if (s.hidden) this.hidden[s.id] = true; }, this);
    this.spec = spec; this.ctx = ctx || {};
    this.plotted = [];
    this.tipEl = null;
    var self = this;
    this.lastW = 0;
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(function () {
        var w = self.host.clientWidth;
        if (w && Math.abs(w - self.lastW) > 2) self.render();
      });
      this.ro.observe(host);
    }
    host.tabIndex = 0;
    host.addEventListener('keydown', function (e) { self.onKey(e); });
    document.addEventListener('pointerdown', function (ev) { if (!self.host.contains(ev.target)) self.hideTip(); }, { passive: true });
    this.render();
  }
  Chart.prototype.update = function (spec, ctx) {
    var keep = this.hidden; this.spec = spec; this.ctx = ctx || this.ctx;
    this.hidden = {};
    (spec.series || []).forEach(function (s) { if (keep[s.id] || (s.hidden && !(s.id in keep))) this.hidden[s.id] = true; }, this);
    this.render();
  };
  Chart.prototype.destroy = function () { if (this.ro) this.ro.disconnect(); };
  Chart.prototype.render = function () {
    var w = this.host.clientWidth || 600; this.lastW = w;
    while (this.host.firstChild) this.host.removeChild(this.host.firstChild);
    this.tipEl = null; this.kbIdx = null; this.empty = null; this.host.classList.remove('chart-empty');
    var k = this.spec.kind;
    if (k === 'interval') this.drawInterval(w); else if (k === 'xy') this.drawXY(w); else this.drawTime(w);
    this.drawLegend();
  };




  function bandFill(kind, chartKind, col) {
    if (chartKind === 'xy') return kind === 'prediction_interval' ? { c: C.muted, o: 0.13 } : { c: col, o: 0.3 };
    return { c: col, o: 0.18 };
  }
  Chart.prototype.legendItems = function () {
    var self = this, spec = this.spec, out = [];
    if (spec.kind === 'interval') {
      var kinds = {}, anyPoint = false;
      (spec.rows || []).forEach(function (r) { if (r.interval) kinds[r.interval.label] = 1; else anyPoint = true; });
      Object.keys(kinds).forEach(function (lab) { out.push({ type: 'range', label: 'line = ' + lab, color: C.muted }); });
      out.push({ type: 'dot', label: Object.keys(kinds).length ? 'dot = point estimate' + (anyPoint ? ' (no line = no range)' : '') : 'dot = point estimate (no range)', color: C.muted });
      return out;
    }
    var series = spec.series || [];
    if (series.length > 1 || (spec.bands || []).length) {
      series.forEach(function (s) {
        out.push({ type: 'series', s: s, label: s.label, color: color(s.color), hidden: !!self.hidden[s.id],
          sw: s.style === 'bar' || s.style === 'stack' ? 'bar' : s.style === 'points' ? 'dot' : (s.style === 'dash' || s.style === 'ref') ? 'dash' : s.style === 'thin' ? 'thin' : '' });
      });
    }
    var seen = {};
    (spec.bands || []).forEach(function (bd) {
      var s = series.filter(function (x) { return x.id === bd.series_id; })[0];
      if (!s) return;
      var f = bandFill(bd.kind, spec.kind, color(s.color)), key = bd.label + '|' + f.c;
      if (seen[key]) return; seen[key] = 1;
      var many = (spec.bands || []).filter(function (b) { return b.label === bd.label; }).length > 1;
      out.push({ type: 'band', label: bd.label + (many && series.length > 1 ? ' · ' + s.label : ''), color: f.c, opacity: f.o, hidden: !!self.hidden[s.id] });
    });
    return out;
  };
  Chart.prototype.drawLegend = function () {
    var lh = this.legendHost; if (!lh) return;
    while (lh.firstChild) lh.removeChild(lh.firstChild);
    if (this.empty) { lh.hidden = true; return; }
    lh.hidden = false;
    var self = this;
    this.legendItems().forEach(function (it) {
      var b, sw;
      if (it.type === 'series') {
        b = h('button', 'lg'); b.type = 'button';
        b.setAttribute('aria-pressed', it.hidden ? 'false' : 'true');
        sw = h('span', 'lg-sw' + (it.sw ? ' ' + it.sw : ''));
        sw.style.background = it.color; sw.style.borderColor = it.color;
        b.appendChild(sw); b.appendChild(h('span', 'lg-t', it.label));
        b.title = (it.hidden ? 'Show ' : 'Hide ') + it.label;
        b.addEventListener('click', function () {
          if (self.hidden[it.s.id]) delete self.hidden[it.s.id]; else self.hidden[it.s.id] = true;
          self.render();
        });
      } else {
        b = h('span', 'lg lg-static');
        sw = h('span', 'lg-sw ' + (it.type === 'band' ? 'band' : it.type === 'dot' ? 'dot' : 'range'));
        sw.style.background = it.color;
        if (it.type === 'band') sw.style.opacity = String(Math.min(1, it.opacity * 2.6));
        if (it.type === 'range') { sw.style.background = 'transparent'; sw.style.borderColor = it.color; }
        b.appendChild(sw); b.appendChild(h('span', 'lg-t', it.label));
      }
      lh.appendChild(b);
    });
  };


  Chart.prototype.showTip = function (px, py, head, rows) {
    var t = this.tipEl;
    if (!t) { t = this.tipEl = h('div', 'tip'); t.setAttribute('role', 'status'); this.host.appendChild(t); }
    while (t.firstChild) t.removeChild(t.firstChild);
    t.appendChild(h('div', 't-d', head));
    rows.forEach(function (r) {
      var row = h('div', 't-r');
      var sw = h('span', 't-sw'); sw.style.background = r.color || C.muted; row.appendChild(sw);
      var body = h('div');
      var l1 = h('div'); l1.appendChild(h('span', '', r.label + ': ')); l1.appendChild(h('span', 't-v', r.value)); body.appendChild(l1);
      if (r.sub) body.appendChild(h('div', 't-s', r.sub));
      row.appendChild(body); t.appendChild(row);
    });
    t.hidden = false;
    var W = this.host.clientWidth, tw = t.offsetWidth, th = t.offsetHeight;
    var left = px + 14; if (left + tw > W) left = Math.max(0, px - tw - 14);
    var top = Math.max(0, py - th / 2); var H = this.host.clientHeight; if (top + th > H) top = Math.max(0, H - th);
    t.style.left = left + 'px'; t.style.top = top + 'px';
  };
  Chart.prototype.hideTip = function () { if (this.tipEl) this.tipEl.hidden = true; if (this.cross) this.cross.setAttribute('visibility', 'hidden'); };
  Chart.prototype.bindHover = function (svg, overlay, pick) {
    var self = this, touch = false;
    function at(ev) { var r = svg.getBoundingClientRect(); var sx = (self.vbW || r.width) / r.width; return { x: (ev.clientX - r.left) * sx, y: (ev.clientY - r.top) * sx, px: ev.clientX - r.left, py: ev.clientY - r.top }; }
    overlay.addEventListener('pointermove', function (ev) { var p = at(ev); pick(p); });
    overlay.addEventListener('pointerdown', function (ev) { touch = ev.pointerType !== 'mouse'; var p = at(ev); pick(p); });
    overlay.addEventListener('pointerleave', function () { if (!touch) self.hideTip(); });
  };
  Chart.prototype.onKey = function (e) {
    if (!this.kbPick || !this.kbN) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (this.kbIdx == null) this.kbIdx = this.kbN - 1; else this.kbIdx = Math.max(0, Math.min(this.kbN - 1, this.kbIdx + (e.key === 'ArrowRight' ? 1 : -1)));
      this.kbPick(this.kbIdx);
    } else if (e.key === 'Escape') { this.hideTip(); }
  };


  Chart.prototype.drawTime = function (W) {
    var spec = this.spec, ctx = this.ctx, self = this;
    var narrow = W < 480, H = Math.round(Math.max(200, Math.min(330, W * (narrow ? 0.62 : 0.42))));
    var all = (spec.series || []).map(function (s) { return { s: s, pts: prepSeries(s), col: color(s.color), style: s.style || (s.step ? 'step' : 'line') }; });
    var vis = all.filter(function (a) { return !self.hidden[a.s.id]; });
    var dmin = Infinity, dmax = -Infinity;
    all.forEach(function (a) { if (a.pts.length) { dmin = Math.min(dmin, a.pts[0].t0); dmax = Math.max(dmax, a.pts[a.pts.length - 1].t1); } });
    var x0 = ctx.range ? ctx.range[0] : dmin, x1 = ctx.range ? ctx.range[1] : dmax;
    if (!isFinite(x0) || !isFinite(x1) || x1 <= x0) { x0 = dmin; x1 = dmax; }

    var lo = Infinity, hi = -Infinity, inWin = 0;
    var bandsBy = {};
    (spec.bands || []).forEach(function (b) { (bandsBy[b.series_id] = bandsBy[b.series_id] || []).push(b); });
    var stackPos = {}, stackNeg = {};
    vis.forEach(function (a) {
      a.win = [];
      a.pts.forEach(function (p) { if (p.t1 > x0 && p.t0 < x1) a.win.push(p); });
      if (a.style === 'stack') {
        a.win.forEach(function (p) { if (p.y == null) return; var k = p.t0; if (p.y >= 0) stackPos[k] = (stackPos[k] || 0) + p.y; else stackNeg[k] = (stackNeg[k] || 0) + p.y; });
      } else {
        a.win.forEach(function (p) { if (p.y != null) { lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); inWin++; } });
      }
      (bandsBy[a.s.id] || []).forEach(function (b) {
        a.win.forEach(function (p) { var l = b.lo[p.i], u = b.hi[p.i]; if (l != null) lo = Math.min(lo, l); if (u != null) hi = Math.max(hi, u); });
      });
    });
    Object.keys(stackPos).forEach(function (k) { hi = Math.max(hi, stackPos[k]); lo = Math.min(lo, 0); inWin++; });
    Object.keys(stackNeg).forEach(function (k) { lo = Math.min(lo, stackNeg[k]); hi = Math.max(hi, 0); inWin++; });
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'font-family': FONT,
      'aria-label': spec.title + ' (' + spec.y_units + ')' });
    this.vbW = W;
    this.host.appendChild(svg);
    this.svg = svg;
    this.plotted = [];
    if (!inWin) {

      var anyAll = all.some(function (a) { return a.pts.some(function (p) { return p.y != null && p.t1 > x0 && p.t0 < x1; }); });
      if (!anyAll) {
        this.host.removeChild(svg); this.svg = null;
        var lastLab = isFinite(dmax) ? (function () { var l = null; all.forEach(function (a) { for (var q = a.pts.length - 1; q >= 0; q--) if (a.pts[q].y != null) { if (!l || a.pts[q].t1 > l.t1) l = a.pts[q]; break; } }); return l ? l.lab : null; })() : null;
        var srcs = {}; all.forEach(function (a) { (a.s.source || []).forEach(function (x) { srcs[x] = 1; }); });
        this.empty = lastLab ? spec.title + ': data end ' + lastLab + ', outside the ' + (ctx.rangeWords || 'selected range')
          : spec.title + ': no observations in the data' + (Object.keys(srcs).length ? ' (source ' + Object.keys(srcs).join(', ') + ')' : '');
        var chipEl = h('div', 'na chart-na'); chipEl.appendChild(h('span', '', this.empty));
        this.host.classList.add('chart-empty'); this.host.appendChild(chipEl);
        return;
      }
      txt(svg, W / 2, H / 2, 'All series with data in this range are hidden; use the legend to show them', { 'text-anchor': 'middle', 'font-size': 13 });
      return;
    }
    if (spec.zero_line) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }

    if (spec.y_min_span > 0 && hi - lo < spec.y_min_span) { var mid = (hi + lo) / 2; lo = Math.min(lo, mid - spec.y_min_span / 2); hi = Math.max(hi, mid + spec.y_min_span / 2); }
    if (lo === hi) { lo -= 1; hi += 1; }
    var pad = (hi - lo) * 0.06; lo -= (lo === 0 ? 0 : pad); hi += pad;
    var yt = ticksFor(lo, hi, narrow ? 4 : 5);
    lo = Math.min(lo, yt.ticks[0]); hi = Math.max(hi, yt.ticks[yt.ticks.length - 1]);
    var labW = 0; yt.ticks.forEach(function (v) { labW = Math.max(labW, textW(fmtNum(v, yt.dec), 11)); });
    var L = Math.ceil(labW) + 10, R = 12, T = 20, B = 24, pw = W - L - R, ph = H - T - B;
    var X = function (t) { return L + (t - x0) / (x1 - x0) * pw; };
    var Y = function (v) { return T + (hi - v) / (hi - lo) * ph; };

    var g = el('g', null, svg);
    yt.ticks.forEach(function (v) {
      el('line', { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: C.line, 'stroke-width': 1 }, g);
      txt(g, L - 6, Y(v) + 3.5, fmtNum(v, yt.dec), { 'text-anchor': 'end' });
    });
    txt(g, L, 11, fit(spec.y_units, W - L - 4, 11), { 'font-size': 11, fill: C.muted });
    timeTicks(x0, x1, pw).forEach(function (tk) {
      var x = X(tk.t); if (x < L - 1 || x > L + pw + 1) return;
      el('line', { x1: x, x2: x, y1: T + ph, y2: T + ph + 4, stroke: C.muted, 'stroke-width': 1 }, g);
      txt(g, x, H - 7, tk.lab, { 'text-anchor': 'middle' });
    });
    if (spec.zero_line && lo < 0 && hi > 0) el('line', { x1: L, x2: L + pw, y1: Y(0), y2: Y(0), stroke: C.zero, 'stroke-width': 1.2 }, g);
    var cid = this.id + 'clip';
    var defs = el('defs', null, svg); var cp = el('clipPath', { id: cid }, defs); el('rect', { x: L, y: T - 2, width: pw, height: ph + 4 }, cp);
    var plot = el('g', { 'clip-path': 'url(#' + cid + ')' }, svg);

    vis.forEach(function (a) {
      (bandsBy[a.s.id] || []).forEach(function (b) {
        var d = '', seg = [];
        function flush() { if (seg.length > 1) { d += 'M' + seg.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('L');
          for (var j = seg.length - 1; j >= 0; j--) d += 'L' + seg[j][0].toFixed(1) + ',' + seg[j][2].toFixed(1); d += 'Z'; } seg = []; }
        a.win.forEach(function (p) { var l = b.lo[p.i], u = b.hi[p.i]; if (l == null || u == null) { flush(); return; } seg.push([X(p.tm), Y(u), Y(l)]); });
        flush();
        if (d) el('path', { d: d, fill: a.col, 'fill-opacity': 0.18, stroke: 'none' }, plot);
      });
    });

    var stacks = vis.filter(function (a) { return a.style === 'stack'; });
    if (stacks.length) {
      var accP = {}, accN = {};
      stacks.forEach(function (a) {
        var d = '';
        a.win.forEach(function (p) {
          if (p.y == null || p.y === 0) return;
          var k = p.t0, base = p.y >= 0 ? (accP[k] || 0) : (accN[k] || 0), top = base + p.y;
          if (p.y >= 0) accP[k] = top; else accN[k] = top;
          var xa = X(p.t0), xb = X(p.t1), bw = Math.max(1, (xb - xa) * 0.82), xm = xa + (xb - xa - bw) / 2;
          var ya = Y(Math.max(base, top)), yb = Y(Math.min(base, top));
          var gap = (yb - ya) > 3 ? 0.6 : 0;
          d += 'M' + xm.toFixed(1) + ',' + (ya + gap).toFixed(1) + 'h' + bw.toFixed(2) + 'V' + (yb - gap).toFixed(1) + 'h' + (-bw).toFixed(2) + 'Z';
        });
        if (d) el('path', { d: d, fill: a.col, stroke: 'none' }, plot);
      });
    }

    var bars = vis.filter(function (a) { return a.style === 'bar'; });
    bars.forEach(function (a, bi) {
      var d = '', n = bars.length, span = null;
      if ((a.s.freq === 'D' || a.s.freq === 'W') && a.pts.length > 2) {
        var gaps = []; for (var q = 1; q < a.pts.length; q++) gaps.push(a.pts[q].t0 - a.pts[q - 1].t0);
        gaps.sort(function (u, v) { return u - v; }); span = gaps[gaps.length >> 1];
      }
      a.win.forEach(function (p) {
        if (p.y == null) return;
        var t1 = span ? p.t0 + span : p.t1, t0 = span ? p.t0 - span / 2 : p.t0; if (span) t1 = p.t0 + span / 2;
        var xa = X(t0), xb = X(t1), full = Math.max(1, (xb - xa) * 0.8), bw = Math.max(0.8, full / n), xm = xa + (xb - xa - full) / 2 + bi * bw;
        var y0 = Y(Math.max(0, Math.min(hi, p.y))), y1 = Y(Math.min(0, Math.max(lo, p.y)));
        if (!(lo <= 0)) { y0 = Y(p.y); y1 = Y(lo); }
        d += 'M' + xm.toFixed(1) + ',' + Math.min(y0, y1).toFixed(1) + 'h' + bw.toFixed(2) + 'V' + Math.max(y0, y1, Math.min(y0, y1) + 0.8).toFixed(1) + 'h' + (-bw).toFixed(2) + 'Z';
      });
      if (d) el('path', { d: d, fill: a.col, 'fill-opacity': a.s.color === 'c_actual' ? 1 : 0.9, stroke: 'none' }, plot);
    });

    vis.forEach(function (a) {
      if (a.style === 'bar' || a.style === 'stack') return;
      var pts = a.win, d = '', pen = false;
      if (a.style === 'points') {
        pts.forEach(function (p) { if (p.y != null) el('circle', { cx: X(p.tm), cy: Y(p.y), r: 3, fill: a.col, stroke: C.bg, 'stroke-width': 1 }, plot); });
        return;
      }
      var step = (a.style === 'step' || ((a.style === 'dash' || a.style === 'thin') && a.s.step)) && pts.length < pw * 1.5;
      var dense = pts.length > pw * 2;
      if (dense) {
        var cols = {}, order = [];
        pts.forEach(function (p) {
          if (p.y == null) { order.push(null); return; }
          var c = Math.round(X(p.tm)); var b = cols[c];
          if (!b) { b = cols[c] = { x: c, mn: p.y, mx: p.y, first: p.y, last: p.y }; order.push(b); }
          else { b.mn = Math.min(b.mn, p.y); b.mx = Math.max(b.mx, p.y); b.last = p.y; }
        });
        order.forEach(function (b) {
          if (!b) { pen = false; return; }
          d += (pen ? 'L' : 'M') + b.x + ',' + Y(b.first).toFixed(1) + 'L' + b.x + ',' + Y(b.mn).toFixed(1) + 'L' + b.x + ',' + Y(b.mx).toFixed(1) + 'L' + b.x + ',' + Y(b.last).toFixed(1);
          pen = true;
        });
      } else {
        pts.forEach(function (p, j) {
          if (p.y == null) { pen = false; return; }
          if (step) {
            var xa = X(p.t0), nx = (j + 1 < pts.length && pts[j + 1].y != null) ? X(pts[j + 1].t0) : X(p.t1);
            d += (pen ? 'L' + xa.toFixed(1) + ',' + Y(p.y).toFixed(1) : 'M' + xa.toFixed(1) + ',' + Y(p.y).toFixed(1)) + 'H' + nx.toFixed(1);
          } else d += (pen ? 'L' : 'M') + X(p.tm).toFixed(1) + ',' + Y(p.y).toFixed(1);
          pen = true;
        });
      }
      if (d) el('path', { d: d, fill: 'none', stroke: a.col, 'stroke-width': a.style === 'ref' ? 1 : a.style === 'thin' ? 1.1 : 2, 'stroke-linejoin': 'round',
        'stroke-opacity': a.style === 'thin' ? 0.85 : null, 'stroke-dasharray': a.style === 'dash' ? '5 3' : a.style === 'ref' ? '3 3' : null }, plot);
    });

    vis.forEach(function (a) {
      var bs = bandsBy[a.s.id] || [];
      a.win.forEach(function (p) {
        var r = { series: a.s.id, label: a.s.label, x: a.s.x[p.i], value: p.y, units: a.s.units, basis: a.s.basis,
          release_date: a.s.pub ? a.s.pub[p.i] : '' };
        bs.forEach(function (b, k) { r['band' + (k || '') + '_kind'] = b.kind; r['band' + (k || '') + '_level'] = b.level; r['band' + (k || '') + '_lo'] = b.lo[p.i]; r['band' + (k || '') + '_hi'] = b.hi[p.i]; });
        self.plotted.push(r);
      });
    });

    var cross = this.cross = el('g', { visibility: 'hidden' }, svg);
    var vline = el('line', { y1: T, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '3 3' }, cross);
    var dots = el('g', null, cross);
    var overlay = el('rect', { x: L, y: T, width: pw, height: ph, fill: 'transparent' }, svg);
    var anchor = vis.filter(function (a) { return a.win.length; }).sort(function (a, b) { return b.win.length - a.win.length; })[0];
    function pickT(t, px, py) {
      if (!anchor) return;
      var best = null;
      vis.forEach(function (a) {
        if (!a.win.length) return; var j = bsearch(a.win, t); var p = a.win[j];
        if (!best || Math.abs(p.tm - t) < Math.abs(best.tm - t)) best = p;
      });
      if (!best) return;
      var tt = best.tm, x = X(tt), rows = [];
      while (dots.firstChild) dots.removeChild(dots.firstChild);
      vline.setAttribute('x1', x); vline.setAttribute('x2', x);
      vis.forEach(function (a) {
        if (!a.win.length) return;
        var j = bsearch(a.win, tt), p = a.win[j];
        var tol = Math.max((p.t1 - p.t0) * 0.75, 4 * 864e5);
        if (Math.abs(p.tm - tt) > tol || p.y == null) return;
        var dec = a.dec != null ? a.dec : (a.dec = decimalsFor(a.s.y));
        var sub = [];
        if (best.lab !== p.lab) sub.push(p.lab);
        if (a.s.pub && a.s.pub[p.i]) sub.push((ctx.asOf && String(a.s.pub[p.i]).slice(0, 10) > String(ctx.asOf).slice(0, 10) ? 'release scheduled ' : 'released ') + fmtDay(a.s.pub[p.i]));
        sub.push(BASIS[a.s.basis] || a.s.basis);
        var su = shortUnits(a.s.units);
        (bandsBy[a.s.id] || []).forEach(function (b) { if (b.lo[p.i] != null) sub.push(b.label + ': ' + fmtNum(b.lo[p.i], dec) + su + ' to ' + fmtNum(b.hi[p.i], dec) + su); });
        rows.push({ color: a.col, label: a.s.label, value: fmtNum(p.y, dec) + shortUnits(a.s.units), sub: sub.join(' · ') });
        if (a.style !== 'bar' && a.style !== 'stack') el('circle', { cx: X(p.tm), cy: Y(p.y), r: 3.5, fill: a.col, stroke: C.bg, 'stroke-width': 1.5 }, dots);
      });
      cross.setAttribute('visibility', 'visible');
      var r = svg.getBoundingClientRect(), k = r.width / W;
      self.showTip(px != null ? px : x * k, py != null ? py : (T + ph / 3) * k, best.lab, rows);
    }
    this.bindHover(svg, overlay, function (p) { pickT(x0 + (p.x - L) / pw * (x1 - x0), p.px, p['py']); });
    if (anchor) { this.kbN = anchor.win.length; this.kbPick = function (i) { pickT(anchor.win[i].tm); }; }
  };


  Chart.prototype.drawXY = function (W) {
    var spec = this.spec, self = this;
    var narrow = W < 480, H = Math.round(Math.max(220, Math.min(340, W * (narrow ? 0.72 : 0.46))));
    var all = (spec.series || []).map(function (s) { return { s: s, col: color(s.color), style: s.style || 'line' }; });
    var vis = all.filter(function (a) { return !self.hidden[a.s.id]; });
    var bandsBy = {};
    (spec.bands || []).forEach(function (b) { (bandsBy[b.series_id] = bandsBy[b.series_id] || []).push(b); });
    var xl = Infinity, xh = -Infinity, yl = Infinity, yh = -Infinity;
    vis.forEach(function (a) {
      a.s.x.forEach(function (x, i) { var y = a.s.y[i]; if (y == null) return; if (a.style !== 'ref') { xl = Math.min(xl, x); xh = Math.max(xh, x); yl = Math.min(yl, y); yh = Math.max(yh, y); } });
      (bandsBy[a.s.id] || []).forEach(function (b) { b.lo.forEach(function (v) { if (v != null) yl = Math.min(yl, v); }); b.hi.forEach(function (v) { if (v != null) yh = Math.max(yh, v); }); });
    });
    if (spec.x_domain) { xl = spec.x_domain[0]; xh = spec.x_domain[1]; }
    if (spec.y_domain) { yl = Math.min(yl, spec.y_domain[0]); yh = Math.max(yh, spec.y_domain[1]); }
    var fixedY = !!spec.y_domain;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'font-family': FONT, 'aria-label': spec.title });
    this.vbW = W; this.host.appendChild(svg); this.svg = svg; this.plotted = [];
    if (!isFinite(xl) || !isFinite(yl)) { txt(svg, W / 2, H / 2, 'All series hidden', { 'text-anchor': 'middle', 'font-size': 13 }); return; }
    if (spec.zero_line) { yl = Math.min(yl, 0); yh = Math.max(yh, 0); }
    if (yl === yh) { yl -= 1; yh += 1; } if (xl === xh) { xl -= 1; xh += 1; }
    if (!fixedY) { var py = (yh - yl) * 0.06; yl -= py; yh += py; }
    if (!spec.x_domain) { var px = (xh - xl) * 0.03; xl -= px; xh += px; }
    var yt = ticksFor(yl, yh, narrow ? 4 : 6), xt = ticksFor(xl, xh, narrow ? 4 : 8);
    yl = Math.min(yl, yt.ticks[0]); yh = Math.max(yh, yt.ticks[yt.ticks.length - 1]);
    var labW = 0; yt.ticks.forEach(function (v) { labW = Math.max(labW, textW(fmtNum(v, yt.dec), 11)); });
    var L = Math.ceil(labW) + 10, R = 14, T = 20, B = 38, pw = W - L - R, ph = H - T - B;
    var X = function (v) { return L + (v - xl) / (xh - xl) * pw; }, Y = function (v) { return T + (yh - v) / (yh - yl) * ph; };
    var g = el('g', null, svg);
    yt.ticks.forEach(function (v) { el('line', { x1: L, x2: L + pw, y1: Y(v), y2: Y(v), stroke: C.line }, g); txt(g, L - 6, Y(v) + 3.5, fmtNum(v, yt.dec), { 'text-anchor': 'end' }); });
    xt.ticks.forEach(function (v) { if (v < xl - 1e-9 || v > xh + 1e-9) return; el('line', { x1: X(v), x2: X(v), y1: T + ph, y2: T + ph + 4, stroke: C.muted }, g); txt(g, X(v), T + ph + 15, (v > 0 && spec.x_signed ? '+' : '') + fmtNum(v, xt.dec), { 'text-anchor': 'middle' }); });
    txt(g, L, 11, fit(spec.y_units, W - L - 4, 11));
    txt(g, L + pw, H - 4, fit(spec.x_units, pw, 11), { 'text-anchor': 'end' });
    if (spec.zero_line && yl < 0 && yh > 0) el('line', { x1: L, x2: L + pw, y1: Y(0), y2: Y(0), stroke: C.zero, 'stroke-width': 1.2 }, g);
    if (spec.zero_line && xl < 0 && xh > 0) el('line', { x1: X(0), x2: X(0), y1: T, y2: T + ph, stroke: C.zero, 'stroke-width': 1 }, g);
    var cid = this.id + 'clip'; var defs = el('defs', null, svg); var cp = el('clipPath', { id: cid }, defs); el('rect', { x: L, y: T - 4, width: pw, height: ph + 8 }, cp);
    var plot = el('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    vis.forEach(function (a) {
      (bandsBy[a.s.id] || []).forEach(function (b, k) {
        var up = [], dn = [];
        a.s.x.forEach(function (x, i) { if (b.lo[i] != null && b.hi[i] != null) { up.push(X(x).toFixed(1) + ',' + Y(b.hi[i]).toFixed(1)); dn.push(X(x).toFixed(1) + ',' + Y(b.lo[i]).toFixed(1)); } });
        if (up.length > 1) el('path', { d: 'M' + up.join('L') + 'L' + dn.reverse().join('L') + 'Z', fill: b.kind === 'prediction_interval' ? C.muted : a.col,
          'fill-opacity': b.kind === 'prediction_interval' ? 0.13 : 0.3, stroke: 'none' }, plot);
      });
    });
    vis.forEach(function (a) {
      if (a.style === 'points') {
        a.s.x.forEach(function (x, i) { var y = a.s.y[i]; if (y != null) el('circle', { cx: X(x), cy: Y(y), r: a.s.r || 4, fill: a.col, 'fill-opacity': a.s.opacity || 0.85, stroke: C.bg, 'stroke-width': 1 }, plot); });
      } else {
        var d = '', pen = false;
        a.s.x.forEach(function (x, i) { var y = a.s.y[i]; if (y == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(y).toFixed(1); pen = true; });
        el('path', { d: d, fill: 'none', stroke: a.col, 'stroke-width': a.style === 'ref' ? 1 : 2.2, 'stroke-dasharray': a.style === 'ref' || a.style === 'dash' ? '4 3' : null }, plot);
      }
      var bs = bandsBy[a.s.id] || [];
      a.s.x.forEach(function (x, i) {
        var r = { series: a.s.id, label: a.s.label, x: x, value: a.s.y[i], x_units: spec.x_units, y_units: spec.y_units, basis: a.s.basis };
        if (a.s.meta) r[a.s.meta_label || 'note'] = a.s.meta[i] == null ? '' : a.s.meta[i];
        bs.forEach(function (b) { r[b.kind + '_lo'] = b.lo[i]; r[b.kind + '_hi'] = b.hi[i]; r[b.kind + '_level'] = b.level; });
        self.plotted.push(r);
      });
    });
    if (spec.marker != null && isFinite(spec.marker)) {
      var mx = X(spec.marker);
      el('line', { x1: mx, x2: mx, y1: T, y2: T + ph, stroke: C.white, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
      var mk = spec.marker_point;
      if (mk != null) el('circle', { cx: mx, cy: Y(mk), r: 5, fill: C.white, stroke: C.accent, 'stroke-width': 2 }, svg);
    }
    var cross = this.cross = el('g', { visibility: 'hidden' }, svg);
    var ring = el('circle', { r: 6, fill: 'none', stroke: C.white, 'stroke-width': 1.5 }, cross);
    var overlay = el('rect', { x: L, y: T, width: pw, height: ph, fill: 'transparent' }, svg);
    var cands = [];
    vis.forEach(function (a) { if (a.style === 'ref') return; a.s.x.forEach(function (x, i) { if (a.s.y[i] != null) cands.push({ a: a, i: i, x: x, y: a.s.y[i] }); }); });
    function pickC(c, px, pyy) {
      if (!c) return;
      ring.setAttribute('cx', X(c.x)); ring.setAttribute('cy', Y(c.y)); cross.setAttribute('visibility', 'visible');
      var a = c.a, sub = [BASIS[a.s.basis] || a.s.basis], su = shortUnits(a.s.units || spec.y_units);
      (bandsBy[a.s.id] || []).forEach(function (b) { if (b.lo[c.i] != null) sub.push(b.label + ': ' + fmtNum(b.lo[c.i], 2) + su + ' to ' + fmtNum(b.hi[c.i], 2) + su); });
      if (a.s.meta && a.s.meta[c.i]) sub.unshift(a.s.meta[c.i]);
      var r = svg.getBoundingClientRect(), k = r.width / W;
      self.showTip(px != null ? px : X(c.x) * k, pyy != null ? pyy : Y(c.y) * k, (spec.x_label || spec.x_units) + ': ' + (spec.x_signed && c.x > 0 ? '+' : '') + fmtNum(c.x, 2) + shortUnits(spec.x_units),
        [{ color: a.col, label: a.s.label, value: fmtNum(c.y, 2) + su, sub: sub.join(' · ') }]);
    }
    this.bindHover(svg, overlay, function (p) {
      var best = null, bd = Infinity;
      cands.forEach(function (c) { var dx = X(c.x) - p.x, dy = Y(c.y) - p.y, dd = dx * dx + dy * dy * (c.a.style === 'points' ? 1 : 0.15); if (dd < bd) { bd = dd; best = c; } });
      pickC(best, p.px, p['py']);
    });
    var line = cands.filter(function (c) { return c.a.style !== 'points'; });
    this.kbN = line.length; this.kbPick = function (i) { pickC(line[i]); };
  };


  Chart.prototype.drawInterval = function (W) {
    var spec = this.spec, self = this, rows = spec.rows || [];
    var narrow = W < 560;
    var lo = Infinity, hi = -Infinity;
    rows.forEach(function (r) { lo = Math.min(lo, r.value); hi = Math.max(hi, r.value); if (r.interval) { lo = Math.min(lo, r.interval.lo); hi = Math.max(hi, r.interval.hi); } });
    if (spec.zero_line) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (lo === hi) { lo -= 0.1; hi += 0.1; }
    var span = hi - lo;
    if (!(spec.zero_line && lo === 0)) lo -= span * 0.05;
    if (!(spec.zero_line && hi === 0)) hi += span * 0.05;

    var st0 = niceStep(hi - lo, narrow ? 4 : 6); lo = Math.floor(lo / st0 + 1e-9) * st0; hi = Math.ceil(hi / st0 - 1e-9) * st0;
    var xt = ticksFor(lo, hi, narrow ? 4 : 6); lo = Math.min(lo, xt.ticks[0]); hi = Math.max(hi, xt.ticks[xt.ticks.length - 1]);
    var labW = narrow ? 0 : Math.min(W * 0.42, 300), L = labW + (narrow ? 8 : 16), R = 56, T = 18;
    var rowH = narrow ? 40 : 28, grpH = 26;
    var y = T, layout = [], lastG = null;

    function wrapG(t) {
      var parts = String(t).split(' · '), lines = [];
      function words(txt, bold) {
        if (textW(txt, 12.5) <= W - 4) { lines.push({ t: txt, b: bold }); return; }
        var c = '';
        txt.split(' ').forEach(function (w) { var cand = c ? c + ' ' + w : w; if (c && textW(cand, 12.5) > W - 4) { lines.push({ t: c, b: bold }); c = w; } else c = cand; });
        if (c) lines.push({ t: c, b: bold });
      }
      words(parts[0], true);
      var cur = '';
      parts.slice(1).forEach(function (p) { var cand = cur ? cur + ' · ' + p : p; if (cur && textW(cand, 12.5) > W - 4) { words(cur, false); cur = p; } else cur = cand; });
      if (cur) {
        var last = lines[lines.length - 1];
        if (last && last.b && lines.length === 1 && textW(last.t + ' · ' + cur, 12.5) <= W - 4) last.tail = cur; else words(cur, false);
      }
      return lines;
    }
    rows.forEach(function (r) {
      if (r.group && r.group !== lastG) { var ls = wrapG(r.group); layout.push({ g: ls, y: y }); y += grpH + (ls.length - 1) * 16; lastG = r.group; }
      layout.push({ r: r, y: y }); y += rowH;
    });
    var H = y + 26, pw = W - L - R;
    var X = function (v) { return L + (v - lo) / (hi - lo) * pw; };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'font-family': FONT, 'aria-label': spec.title });
    this.vbW = W; this.host.appendChild(svg); this.svg = svg; this.plotted = [];
    var g = el('g', null, svg);
    txt(g, L, 11, fit(spec.y_units, W - L - 4, 11));
    xt.ticks.forEach(function (v) { el('line', { x1: X(v), x2: X(v), y1: T, y2: H - 22, stroke: C.line }, g); txt(g, X(v), H - 8, fmtNum(v, xt.dec), { 'text-anchor': 'middle' }); });
    if (spec.zero_line && lo < 0 && hi > 0) el('line', { x1: X(0), x2: X(0), y1: T, y2: H - 22, stroke: C.zero, 'stroke-width': 1.2 }, g);
    var hits = [];
    layout.forEach(function (it) {
      if (it.g) {
        it.g.forEach(function (ln, q) {
          var t = txt(g, 0, it.y + 17 + q * 16, fit(ln.t, W - 4, 12.5), { fill: ln.b ? C.white : C.text, 'font-size': ln.b ? 12.5 : 11.5, 'font-weight': ln.b ? 700 : 400 });
          if (ln.tail) { var ts = el('tspan', { fill: C.text, 'font-weight': 400, 'font-size': 11.5 }, t); ts.textContent = ' · ' + ln.tail; }
        });
        return;
      }
      var r = it.r, col = color(r.color), cy = it.y + (narrow ? 27 : rowH / 2);
      var lab = r.label;
      if (narrow) txt(g, 0, it.y + 12, fit(lab, W - 4, 11.5), { fill: C.text, 'font-size': 11.5 });
      else txt(g, 0, cy + 4, fit(lab, labW, 12), { fill: C.text, 'font-size': 12 });
      var dec = Math.abs(r.value) < 1 ? 2 : 1;
      if (r.interval) {
        el('line', { x1: X(r.interval.lo), x2: X(r.interval.hi), y1: cy, y2: cy, stroke: col, 'stroke-width': 3, 'stroke-opacity': 0.55, 'stroke-linecap': 'round' }, g);
        el('line', { x1: X(r.interval.lo), x2: X(r.interval.lo), y1: cy - 5, y2: cy + 5, stroke: col, 'stroke-width': 1.5 }, g);
        el('line', { x1: X(r.interval.hi), x2: X(r.interval.hi), y1: cy - 5, y2: cy + 5, stroke: col, 'stroke-width': 1.5 }, g);
      }
      el('circle', { cx: X(r.value), cy: cy, r: 5, fill: col, stroke: C.bg, 'stroke-width': 1.5 }, g);
      var fv = spec.signed === false ? fmtNum : fmtSigned;
      txt(g, W - 2, cy + 4, fv(r.value, dec) + shortUnits(r.units), { 'text-anchor': 'end', fill: C.white, 'font-size': 12, 'font-weight': 700 });
      hits.push({ r: r, y0: it.y, y1: it.y + rowH, cy: cy, col: col, dec: dec });
      self.plotted.push({ group: r.group || '', label: r.label, value: r.value, units: r.units, basis: r.basis,
        interval_kind: r.interval ? r.interval.kind : '', level: r.interval ? r.interval.level : '',
        lo: r.interval ? r.interval.lo : '', hi: r.interval ? r.interval.hi : '', note: r.note || '' });
    });
    var overlay = el('rect', { x: 0, y: T, width: W, height: H - T, fill: 'transparent' }, svg);
    function pickH(hh, px, py) {
      if (!hh) { self.hideTip(); return; }
      var r = hh.r, sub = [BASIS[r.basis] || r.basis], su = shortUnits(r.units);
      if (r.interval) sub.push(r.interval.label + ': ' + fmtNum(r.interval.lo, 2) + su + ' to ' + fmtNum(r.interval.hi, 2) + su);
      else sub.push('point estimate, no range');
      if (r.prob) sub.push('model ' + r.prob.model_id + ' · evidence: ' + String(r.prob.evidence).replace('_', ' ') + (r.prob.n_events != null ? ' · ' + r.prob.n_events + ' events in ' + r.prob.n + (r.prob.counts_basis ? ' (' + r.prob.counts_basis + ')' : '') : ''));
      if (r.note) sub.push(r.note);
      var rc = svg.getBoundingClientRect(), k = rc.width / W;
      self.showTip(px != null ? px : X(r.value) * k, py != null ? py : hh.cy * k, r.group || r.label, [{ color: hh.col, label: r.label, value: (spec.signed === false ? fmtNum : fmtSigned)(r.value, hh.dec) + shortUnits(r.units), sub: sub.join(' · ') }]);
    }
    this.bindHover(svg, overlay, function (p) { var hh = null; hits.forEach(function (x) { if (p.y >= x.y0 && p.y < x.y1) hh = x; }); pickH(hh, p.px, p['py']); });
    this.kbN = hits.length; this.kbPick = function (i) { pickH(hits[i]); };
  };


  function csvCell(v) { if (v == null) return ''; var s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  Chart.prototype.csv = function () {
    var rows = this.plotted; if (!rows.length) return '';
    var cols = []; rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    return cols.join(',') + '\n' + rows.map(function (r) { return cols.map(function (c) { return csvCell(r[c]); }).join(','); }).join('\n') + '\n';
  };
  Chart.prototype.png = function (title, sub, cb, foot) {
    if (!this.svg) { cb(null); return; }
    var W = +this.svg.getAttribute('width'), H = +this.svg.getAttribute('height'), head = 46;

    var items = this.legendItems().filter(function (it) { return !it.hidden; });
    var lay = [], lx = 4, ly = 0, rowH = 18;
    items.forEach(function (it) {
      var w = 22 + textW(it.label, 11.5) + 14;
      if (lx > 4 && lx + w > W - 4) { lx = 4; ly += rowH; }
      lay.push({ it: it, x: lx, y: ly }); lx += w;
    });
    var legH = items.length ? ly + rowH + 8 : 0;
    var footLines = [];
    if (foot) {
      if (foot.source) footLines.push('Source: ' + foot.source);
      var meta = [];
      if (foot.basis) meta.push('basis: ' + foot.basis);
      if (foot.snapshot) meta.push('snapshot ' + foot.snapshot);
      if (foot.built) meta.push('built ' + foot.built);
      if (meta.length) footLines.push(meta.join(' · '));
    }

    var wrapped = [];
    footLines.forEach(function (ln) {
      var words = ln.split(' '), cur = '';
      words.forEach(function (w) { var c = cur ? cur + ' ' + w : w; if (cur && textW(c, 10.5) > W - 8) { wrapped.push(cur); cur = w; } else cur = c; });
      if (cur) wrapped.push(cur);
    });
    var footH = wrapped.length ? wrapped.length * 14 + 6 : 0;
    var TH = H + head + legH + footH;
    var out = el('svg', { xmlns: NS, width: W, height: TH, viewBox: '0 0 ' + W + ' ' + TH, 'font-family': FONT });
    el('rect', { x: 0, y: 0, width: W, height: TH, fill: C.bg }, out);
    txt(out, 4, 18, title, { fill: C.white, 'font-size': 15, 'font-weight': 700 });
    txt(out, 4, 36, sub || '', { fill: C.muted, 'font-size': 11 });
    var gg = el('g', { transform: 'translate(0,' + head + ')' }, out);
    Array.prototype.forEach.call(this.svg.childNodes, function (n) { gg.appendChild(n.cloneNode(true)); });
    var cr = gg.querySelector('[visibility]'); if (cr) cr.setAttribute('visibility', 'hidden');
    var lg = el('g', { transform: 'translate(0,' + (head + H + 4) + ')' }, out);
    lay.forEach(function (l) {
      var it = l.it, cy = l.y + 9;
      if (it.type === 'band') el('rect', { x: l.x, y: cy - 5, width: 16, height: 10, rx: 2, fill: it.color, 'fill-opacity': Math.min(1, it.opacity * 2.6) }, lg);
      else if (it.type === 'dot' || it.sw === 'dot') el('circle', { cx: l.x + 8, cy: cy, r: 4.5, fill: it.color }, lg);
      else if (it.sw === 'bar') el('rect', { x: l.x + 3, y: cy - 5, width: 10, height: 10, rx: 2, fill: it.color }, lg);
      else if (it.type === 'range') {
        el('line', { x1: l.x, x2: l.x + 16, y1: cy, y2: cy, stroke: it.color, 'stroke-width': 3 }, lg);
      } else el('line', { x1: l.x, x2: l.x + 16, y1: cy, y2: cy, stroke: it.color, 'stroke-width': it.sw === 'thin' ? 1.2 : 2.5,
        'stroke-dasharray': it.sw === 'dash' ? '4 2' : null }, lg);
      txt(lg, l.x + 22, cy + 4, it.label, { fill: C.text, 'font-size': 11.5 });
    });
    wrapped.forEach(function (ln, q) { txt(out, 4, head + H + legH + 12 + q * 14, ln, { fill: C.muted, 'font-size': 10.5 }); });
    var xml = new XMLSerializer().serializeToString(out);
    var url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      var sc = 2, cv = document.createElement('canvas'); cv.width = W * sc; cv.height = TH * sc;
      var c2 = cv.getContext('2d'); c2.scale(sc, sc); c2.drawImage(img, 0, 0); URL.revokeObjectURL(url);
      cv.toBlob(function (b) { cb(b); }, 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  };

  window.ILCharts = { mount: function (host, legendHost, spec, ctx) { return new Chart(host, legendHost, spec, ctx); },
    color: color, per: per, fmtNum: fmtNum, fmtSigned: fmtSigned, fmtDay: fmtDay, shortUnits: shortUnits,
    decimalsFor: decimalsFor, BASIS: BASIS, MON: MON };
})();
