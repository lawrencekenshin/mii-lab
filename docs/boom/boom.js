



(function () {
  'use strict';
  var URL_ = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/boom-data/boom/boom.json' : 'snap/boom.pub.json';
  var GOLD = '#FFD84D', TEAL = '#26A69A', AMBER = '#F2B04B', RED = '#EF5350', GREY = '#8A8E99', PURPLE = '#7E57C2';
  var B_COL = { N: TEAL, C: AMBER, P: GREY, O: '#2A2E39' };
  var B_WORD = { N: 'BOOM ON', C: 'COOLING', P: 'PAUSED', O: 'NO BOOM' };
  var BAND = { t: TEAL, a: AMBER, r: RED, p: GREY, v: PURPLE, g: GOLD };
  var TFS = [['D', 'Daily'], ['W', 'Weekly'], ['2W', '2-week'], ['M', 'Monthly']];
  var TF_NAME = { D: 'day', W: 'week', '2W': '2 weeks', M: 'month' }, TF_DAYS = { D: 1.45, W: 7, '2W': 14, M: 30.4 };
  var RANGES = [[1, '1Y'], [3, '3Y'], [5, '5Y'], [10, '10Y'], [0, 'All']];
  var DAY = 864e5;

  var D = null, sym = 'QQQ', range = 3, tf = 'W', showAll = false, hover = null, charts = [], lastW = 0, err = '';
  var q = new URLSearchParams(location.search);
  if (q.get('range') !== null && RANGES.some(function (r) { return r[0] === Number(q.get('range')); })) range = Number(q.get('range'));
  var qs = (q.get('sym') || '').toUpperCase();

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tms(d) { return Date.parse(d + 'T12:00:00Z'); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  var fDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  var fShort = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
  function day(d) { return fDay.format(tms(d)); }
  function short(d) { return fShort.format(tms(d)); }
  function sgn(v, u) { u = u || '%'; return v === null || v === undefined || !isFinite(v) ? '—' : (v < 0 ? '−' : '+') + Math.abs(Math.round(v * 100)) + u; }
  function px(v) { return v >= 10000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1000 ? v.toFixed(0) : v.toFixed(2); }
  function p0(v) { return (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%'; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }


  function prep(s) {
    if (s._t) return s;
    var t = tms(s.d0), T = [t], dates = [s.d0];
    for (var i = 0; i < s.dd.length; i++) { t += s.dd[i] * DAY; T.push(t); dates.push(iso(t)); }
    s._t = T; s._d = dates;
    var segs = [];
    for (i = 0; i < s.n; i++) if (!segs.length || segs[segs.length - 1].st !== s.st[i]) segs.push({ i: i, st: s.st[i] });
    s._segs = segs;
    return s;
  }
  function atIndex(s, t) {
    var lo = 0, hi = s.n - 1, a = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (s._t[m] <= t) { a = m; lo = m + 1; } else hi = m - 1; }
    return a;
  }

  function bars(s, k) {
    var x = s.tf[k], ix = k === 'D' ? null : x.ix, n = ix ? ix.length : s.n, out = [];
    for (var q2 = 0; q2 < n; q2++) {
      var i = ix ? ix[q2] : q2, partial = !!x.pe && q2 === n - 1;
      out.push({ i: i, t: partial ? tms(x.pe) : s._t[i], partial: partial });
    }
    return { rows: out, x: x };
  }


  function nice(lo, hi, n) {
    var span = hi - lo || 1, step = Math.pow(10, Math.floor(Math.log10(span / n))), ks = [1, 2, 2.5, 5, 10], m = 10 * step, out = [];
    for (var a = 0; a < ks.length; a++) if (span / (ks[a] * step) <= n) { m = ks[a] * step; break; }
    for (var v = Math.ceil(lo / m) * m; v <= hi + 1e-9; v += m) out.push(+v.toFixed(10));
    return out;
  }
  function logTicks(lo, hi) {
    var out = [];
    if (!(lo > 0) || !isFinite(hi)) return out;
    for (var e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) [1, 2, 5].forEach(function (m) { var v = m * Math.pow(10, e); if (v >= lo && v <= hi) out.push(v); });
    var step = Math.ceil(out.length / 6);
    return out.filter(function (_, i) { return (out.length - 1 - i) % step === 0; });
  }



  function chart(box, o) {
    var width = Math.max(280, Math.round(box.clientWidth || 900)), L = 8, R = 58, T = 14, B = 24, W = width - L - R, H = o.height - T - B;
    var t0 = o.start, t1 = Math.max(o.end, t0 + DAY);
    var X = function (t) { return L + (t - t0) / (t1 - t0) * W; };
    var vis = [];
    o.series.forEach(function (s) { s.pts.forEach(function (p) { if (p[1] !== null && isFinite(p[1]) && p[0] >= o.start && p[0] <= o.end) vis.push(p[1]); }); });
    var tf = o.log ? Math.log : function (v) { return v; }, rv = (o.rules || []).map(function (r) { return r.v; });
    var lo, hi;
    if (o.domain) { lo = o.domain[0]; hi = o.domain[1]; }
    else if (!vis.length) { lo = 0; hi = 1; }
    else {
      lo = Infinity; hi = -Infinity;
      vis.concat(rv).forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    }
    if (hi - lo < 1e-12) { hi += Math.abs(hi) * 0.05 || 1; lo -= Math.abs(lo) * 0.05 || 1; }
    if (!o.domain) { var pad = (tf(hi) - tf(lo)) * 0.06; lo = o.log ? Math.exp(tf(lo) - pad) : lo - pad; hi = o.log ? Math.exp(tf(hi) + pad) : hi + pad; }
    var Y = function (v) { return T + (1 - (tf(v) - tf(lo)) / (tf(hi) - tf(lo))) * H; };
    var clampY = function (v) { return Y(Math.max(lo, Math.min(hi, v))); };
    var ticks = o.log ? (lo > 0 && isFinite(hi) && hi / lo > 8 ? logTicks(lo, hi) : nice(lo, hi, 4).filter(function (v) { return v > 0; })) : nice(lo, hi, 4);
    var s = '<svg width="' + width + '" height="' + o.height + '" role="img">';
    ticks.forEach(function (v) {
      s += '<line x1="' + L + '" x2="' + (L + W) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="grid"/>' +
        '<text x="' + (L + W + 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" class="axis">' + esc(o.fmt(v)) + '</text>';
    });
    var y0 = new Date(o.start).getUTCFullYear(), y1 = new Date(o.end).getUTCFullYear(), years = [];
    for (var yr = y0 + 1; yr <= y1; yr++) years.push(Date.UTC(yr, 0, 1, 12));
    var ystep = Math.ceil(years.length / Math.max(1, Math.floor(W / 90)));
    years.forEach(function (t, i) {
      if (i % ystep) return;
      s += '<line x1="' + X(t).toFixed(1) + '" x2="' + X(t).toFixed(1) + '" y1="' + T + '" y2="' + (T + H) + '" class="grid faint"/>' +
        '<text x="' + (X(t) + 3).toFixed(1) + '" y="' + (o.height - 7) + '" class="axis">' + new Date(t).getUTCFullYear() + '</text>';
    });
    (o.spans || []).forEach(function (z) {
      if (z.b < o.start || z.a > o.end) return;
      var xa = X(Math.max(z.a, o.start)), xb = X(Math.min(z.b, o.end));
      s += '<rect x="' + xa.toFixed(1) + '" y="' + T + '" width="' + Math.max(0, xb - xa).toFixed(1) + '" height="' + H + '" fill="' + z.color + '" opacity="' + z.opacity + '"/>';
    });
    (o.rules || []).forEach(function (r) {
      if (r.v < lo || r.v > hi) return;
      s += '<line x1="' + L + '" x2="' + (L + W) + '" y1="' + Y(r.v).toFixed(1) + '" y2="' + Y(r.v).toFixed(1) + '" stroke="' + r.color + '" stroke-dasharray="' + (r.dash || '5 4') + '" stroke-width="1"/>' +
        (r.label ? '<text x="' + (L + 4) + '" y="' + (Y(r.v) - 4).toFixed(1) + '" class="rule" fill="' + r.color + '">' + esc(r.label) + '</text>' : '');
    });
    var zero = clampY(0);
    o.series.forEach(function (sr) {
      if (sr.kind === 'bars') {
        var bw = Math.max(1, Math.min(18, W * sr.barDays * DAY / (t1 - t0) * 0.72)), paths = {};
        sr.pts.forEach(function (p) {
          if (p[1] === null || !isFinite(p[1]) || p[0] < o.start || p[0] > o.end) return;
          var x = X(p[0]), y = clampY(p[1]), top = Math.min(y, zero), h = Math.max(1, Math.abs(y - zero)), c = p[2] || sr.color;
          if (sr.outline) s += '<rect x="' + (x - bw / 2 + 0.5).toFixed(1) + '" width="' + Math.max(1, bw - 1).toFixed(1) + '" y="' + top.toFixed(1) + '" height="' + h.toFixed(1) +
            '" fill="' + c + '" fill-opacity=".18" stroke="' + c + '" stroke-dasharray="3 2"/>';
          else (paths[c] = paths[c] || []).push('M' + (x - bw / 2).toFixed(1) + ',' + top.toFixed(1) + 'h' + bw.toFixed(1) + 'v' + h.toFixed(1) + 'h' + (-bw).toFixed(1) + 'Z');
        });
        Object.keys(paths).forEach(function (c) { s += '<path d="' + paths[c].join('') + '" fill="' + c + '" opacity=".9"/>'; });
      } else if (sr.kind === 'dots') {
        sr.pts.forEach(function (p) {
          if (p[1] === null || p[0] < o.start || p[0] > o.end) return;
          s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="4.5" fill="' + sr.color + '" stroke="#131722" stroke-width="1.5"/>';
        });
      } else {
        var d = '', pen = false;
        sr.pts.forEach(function (p) {
          if (p[0] < o.start || p[0] > o.end || p[1] === null || !isFinite(p[1])) { pen = false; return; }
          d += (pen ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + clampY(p[1]).toFixed(1); pen = true;
        });
        if (d) s += '<path d="' + d + '" fill="none" stroke="' + sr.color + '" stroke-width="' + (sr.width || 1.6) + '"' + (sr.dash ? ' stroke-dasharray="' + sr.dash + '"' : '') + ' stroke-linejoin="round"/>';
      }
    });
    var lastX = -1e9, row = 0;
    (o.markers || []).filter(function (m) { return m.t >= o.start && m.t <= o.end; }).sort(function (a, b) { return a.t - b.t; }).forEach(function (m) {
      var lx = Math.min(X(m.t) + 4, L + W - 80);
      if (m.label) { row = lx - lastX < 96 ? Math.min(row + 1, 3) : 0; lastX = lx; }
      s += '<line x1="' + X(m.t).toFixed(1) + '" x2="' + X(m.t).toFixed(1) + '" y1="' + T + '" y2="' + (T + H) + '" stroke="' + m.color + '" stroke-dasharray="2 4" opacity=".7"/>' +
        (m.value !== undefined ? '<circle cx="' + X(m.t).toFixed(1) + '" cy="' + Y(m.value).toFixed(1) + '" r="4" fill="' + m.color + '"/>' : '') +
        (m.label ? '<text x="' + lx.toFixed(1) + '" y="' + (T + 11 + row * 13) + '" class="rule" fill="' + m.color + '">' + esc(m.label) + '</text>' : '');
    });
    s += '<line class="crosshair" x1="0" x2="0" y1="' + T + '" y2="' + (T + H) + '" visibility="hidden"/></svg>';
    box.innerHTML = (o.label ? '<div class="chart-label">' + o.label + '</div>' : '') + s;
    var svg = box.querySelector('svg'), cross = svg.querySelector('.crosshair');
    var api = {
      cross: function (t) {
        if (t === null || t < o.start || t > o.end) { cross.setAttribute('visibility', 'hidden'); return; }
        cross.setAttribute('x1', X(t).toFixed(1)); cross.setAttribute('x2', X(t).toFixed(1)); cross.setAttribute('visibility', 'visible');
      }
    };
    var move = function (e) {
      var r = svg.getBoundingClientRect(), x = e.clientX - r.left;
      if (x < L || x > L + W) { setHover(null); return; }
      setHover(tms(iso(t0 + (x - L) / W * (t1 - t0))));
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', function () { setHover(null); });
    return api;
  }
  function ribbon(box, start, end, spans) {
    var width = Math.max(280, Math.round(box.clientWidth || 900)), L = 8, R = 58, W = width - L - R, t1 = Math.max(end, start + DAY);
    var X = function (t) { return L + (t - start) / (t1 - start) * W; }, s = '<svg width="' + width + '" height="10" role="img">';
    spans.forEach(function (z) {
      if (z.b < start || z.a > end) return;
      var xa = X(Math.max(z.a, start)), xb = X(Math.min(z.b, end));
      s += '<rect x="' + xa.toFixed(1) + '" y="0" width="' + Math.max(1, xb - xa).toFixed(1) + '" height="10" rx="2" fill="' + z.color + '" opacity=".95"/>';
    });
    box.innerHTML = s + '</svg>';
  }


  function setHover(t) {
    if (t === hover) return;
    hover = t;
    charts.forEach(function (c) { c.cross(t); });
    readout();
  }
  function readout() {
    var el = $('ro'); if (!el || !D) return;
    var s = D.sym[sym], i = hover === null ? -1 : atIndex(s, hover);
    if (i < 0) { el.innerHTML = '<b>' + day(s._d[s.n - 1]) + '</b> · hover any chart for a day'; return; }
    var st = s.st[i], m = s.m[i];
    el.innerHTML = '<b>' + day(s._d[i]) + '</b> · ' + esc(s.name) + ' ' + px(s.c[i]) + ' · <span style="color:' + (st === 'O' ? GREY : B_COL[st]) + '">' + B_WORD[st] + '</span>' +
      (m !== null ? (st !== 'O' ? ' · ' + p0(m / 1e4) + ' room before the end' : ' · needs +' + p0(-m / 1e4) + ' to start') : '');
  }


  function status() {
    var chip = $('chip');
    if (!D) { chip.className = 'chip chip-muted'; chip.textContent = err ? 'NO DATA' : 'LOADING'; return; }
    var now = Date.now(), behind = D.next.filter(function (x) { return Date.parse(x[1]) <= now; }).length;
    chip.className = 'chip ' + (behind === 0 ? 'chip-ok' : behind === 1 ? 'chip-warn' : 'chip-bad');
    chip.textContent = behind === 0 ? 'CURRENT' : behind === 1 ? 'UPDATES AFTER THE CLOSE' : 'STALE';
    $('asof').textContent = 'Prices: close of ' + day(D.asof);
    $('built').textContent = '· refreshes after each US close';
  }
  function rangeBar() {
    $('range').innerHTML = RANGES.map(function (r) { return '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (range === r[0]) + '">' + r[1] + '</button>'; }).join('');
  }
  function syncURL() {
    try { var u = new URL(location.href); u.searchParams.set('sym', sym); u.searchParams.set('range', String(range)); history.replaceState(null, '', u); } catch (e) {  }
  }
  function tiles() {
    return '<div class="strip-wrap"><div class="strip" role="group" aria-label="Tech series">' + D.order.map(function (k) {
      var s = D.sym[k], l = s.now, st = l.st;
      var sub = st !== 'O' ? p0(l.room) + ' room before it ends' : l.need !== null ? (l.need > 0 ? 'needs +' + p0(l.need) + ' to start' : 'price ready, waiting on strength') : '—';
      return '<button type="button" class="strip-i' + (st !== 'O' ? ' st-' + { N: 'on', C: 'cool', P: 'pause' }[st] : '') + '" data-sym="' + k + '" aria-pressed="' + (sym === k) + '">' +
        '<span class="strip-l">' + esc(s.label) + '<small>' + k + '</small></span><span class="strip-v" style="color:' + (st === 'O' ? GREY : B_COL[st]) + '">' + B_WORD[st] + '</span>' +
        '<span class="strip-s">' + sub + '</span></button>';
    }).join('') + '</div></div>';
  }
  function gauges(s) {
    var l = s.now, inBoom = l.st !== 'O', name = esc(s.name), start, end;
    if (inBoom) start = '<div class="gauge-big" style="color:' + TEAL + '">In one now</div><p class="gauge-t">It started ' + short(l.cur.s) + ', ' + plural(l.cur.mo, 'month') + ' ago.</p>';
    else {
      var chk = function (ok, label, note) { return '<li class="' + (ok ? 'ok' : '') + '">' + (ok ? '✓' : '✗') + ' ' + label + ' <span>' + note + '</span></li>'; };
      start = '<div class="gauge-big" style="color:' + (l.near ? GOLD : '#fff') + '">' + (l.need > 0 ? 'needs +' + p0(l.need) : 'price is ready') + '</div>' +
        '<div class="gbar"><i style="width:' + (100 * l.bar).toFixed(1) + '%;background:' + (l.near ? GOLD : PURPLE) + '"></i></div>' +
        '<ul class="checks">' +
        chk(l.lowOk, 'Well clear of its 52-week low', l.lowOk ? 'it is ' + p0(l.aboveLow) + ' above' : 'needs ' + px(l.lowNeed)) +
        chk(l.highOk, 'A new 52-week high', l.highOk ? 'yes' : 'needs ' + px(l.hiNeed) + ' (+' + p0(l.toHigh) + ')') +
        chk(l.rsOk, 'Beating the S&amp;P 500 over recent months', sgn(l.rs, ' pts')) + '</ul>' +
        '<p class="gauge-t">A boom starts the day all three are ✓.</p>';
    }
    if (inBoom) end = '<div class="gauge-big" style="color:' + BAND[l.rb] + '">' + p0(l.room) + ' room</div>' +
      '<div class="gbar track"><i class="dot" style="left:' + l.pos + '%"></i>' + (l.tick !== null ? '<i class="tick" style="left:' + l.tick + '%"></i>' : '') +
      '<span class="gl">ends ' + px(l.end) + '</span><span class="gr">high ' + px(l.peak) + '</span></div>' +
      '<p class="gauge-t">The boom <b>ends</b> if ' + name + ' closes below <b>' + px(l.end) + '</b> (its high is ' + px(l.peak) + '). ' +
      (l.st === 'P' ? 'It is <b>paused</b> now: under its 200-day average (' + px(l.sma) + ').' : 'It <b>pauses</b> below <b>' + px(l.sma) + '</b>, its 200-day average (' + p0(l.toPause) + ' away).') + '</p>';
    else end = '<div class="gauge-big muted-g">no boom to end</div><p class="gauge-t">' + (l.prev ? 'The last one ended ' + short(l.prev.e) +
      (l.prev.how === 'pause' ? ' after a long pause.' : ' after a big fall from its ' + short(l.prev.hd) + ' high.') : 'No boom in this history yet.') + '</p>';
    return '<div class="gauges"><div class="gauge"><p class="gauge-q">How close to a <b>new</b> boom?</p>' + start + '</div>' +
      '<div class="gauge"><p class="gauge-q">How close to the <b>end</b> of this boom?</p>' + end + '</div></div>';
  }
  function after(s) {
    var eps = s.eps.slice().reverse(), shown = showAll ? eps : eps.slice(0, 5);
    return '<div class="after"><div class="chart-label"><b class="pl-b">Past booms in ' + esc(s.name) + '</b> newest first · since ' + short(s.d0) + '</div>' +
      shown.map(function (e) {
        return '<div class="fact"><span><b style="' + (e.e ? '' : 'color:' + TEAL) + '">' + short(e.s) + ' → ' + (e.e ? short(e.e) : 'now') + '</b> · ' + plural(e.mo, 'month') + '</span><b>' +
          (e.e ? 'rose ' + sgn(e.g) + ', then <span style="color:' + RED + '">' + (e.how === 'drop' ? 'ended after a big drop' : 'ended after a long pause') + '</span>' :
            '<span style="color:' + TEAL + '">' + sgn(e.g) + ' so far, still going</span>') + '</b></div>';
      }).join('') +
      (eps.length > 5 ? '<button type="button" class="link" id="allEps">' + (showAll ? 'Show the last 5' : 'Show all ' + eps.length) + '</button>' : '') + '</div>';
  }
  function rules() {
    return '<div class="check"><p class="eyebrow" style="color:' + TEAL + '">THE RULES IN ONE LINE EACH</p>' +
      '<div class="check-row"><b class="st-on-pill">Starts</b><p>A new 52-week high, well clear of the year’s low, while beating the S&amp;P 500 over recent months.</p></div>' +
      '<div class="check-row"><b class="muted-pill">Pauses</b><p>Price dips under its 200-day average. The same boom carries on at the next new high.</p></div>' +
      '<div class="check-row"><b class="no">Ends</b><p>Price falls far enough below the boom’s high (or stays paused too long).</p></div></div>';
  }
  function render() {
    if (!D) return;
    var s = prep(D.sym[sym]), l = s.now, inBoom = l.st !== 'O', name = esc(s.name), last = s.n - 1;
    var first = s._t[0], cutoff = s._t[last], start = first;
    if (range) { var dd = new Date(cutoff); dd.setUTCFullYear(dd.getUTCFullYear() - range); start = Math.max(first, dd.getTime()); }
    var B = bars(s, tf), x = B.x, rows = B.rows, nowP = x.pe ? rows[rows.length - 1] : null, end = nowP ? nowP.t : cutoff;
    var h = '<div class="card-head"><div class="card-title"><p class="eyebrow" style="color:' + TEAL + '">BOOM TRACKER</p>' +
      '<h1>' + (inBoom ? name + ' is in a boom' + (l.st === 'P' ? ' (paused)' : '') : name + ' is not in a boom') + '</h1>' +
      '<p class="sub">' + (inBoom ? 'It started <b>' + short(l.cur.s) + '</b> and ' + (l.st === 'P' ? 'is paused' : 'is still going') + ': ' + sgn(l.cur.since) + ' since then.' :
        l.prev ? 'The last one ran ' + short(l.prev.s) + ' – ' + short(l.prev.e) + ' and rose ' + sgn(l.prev.g) + '.' : '') + '</p></div>' +
      '<div class="hero"><div class="hero-num" style="color:' + (l.st === 'O' ? GREY : B_COL[l.st]) + '">' + B_WORD[l.st] + '</div><div class="hero-date">' + name + ' ' + px(l.c) + ' · ' + short(l.d) + '</div></div></div>';
    h += tiles() + gauges(s) + '<div class="readout" id="ro"></div>';
    h += '<div class="chart-box" id="cPrice"></div><div class="ribbon" id="cRib"></div>';
    h += '<div class="controls tf-row"><div class="seg" role="group" aria-label="Chart timeframe" id="tfSeg">' +
      TFS.map(function (t) { return '<button type="button" data-tf="' + t[0] + '" aria-pressed="' + (tf === t[0]) + '">' + t[1] + '</button>'; }).join('') +
      '</div><span class="hint">one bar = one ' + TF_NAME[tf] + '</span></div>';
    h += '<div class="chart-box" id="cMeter"></div>';
    h += '<p class="legend boom-legend"><span style="color:' + TEAL + '">■</span> plenty of room <span style="color:' + AMBER + '">■</span> getting close to the end <span style="color:' + RED +
      '">■</span> very close to the end <span style="color:' + GREY + '">■</span> paused <span style="color:' + PURPLE + '">■</span> no boom <span style="color:' + GOLD + '">■</span> within reach of a new start</p>';
    h += '<div class="chart-box" id="cKdj"></div>' + after(s) + rules();
    $('boom').innerHTML = h;

    var segSpans = [], ribSpans = [];
    s._segs.forEach(function (g, k) {
      if (g.st === 'O') return;
      var a = s._t[g.i], b = k + 1 < s._segs.length ? s._t[s._segs[k + 1].i] : s._t[last];
      segSpans.push({ a: a, b: b, color: B_COL[g.st], opacity: g.st === 'P' ? 0.12 : 0.14 });
      ribSpans.push({ a: a, b: b, color: B_COL[g.st] });
    });
    var pricePts = [], smaPts = [];
    for (var i = 0; i < s.n; i++) { pricePts.push([s._t[i], s.c[i]]); smaPts.push([s._t[i], s.s[i]]); }
    var markers = s.ev.map(function (e) {
      var d = s._d[e[0]];
      return { t: s._t[e[0]], color: e[1] === 'E' ? RED : TEAL, label: (e[1] === 'S' ? 'BOOM STARTS ' : 'BOOM ENDS ') + short(d).replace(/, \d{4}$/, ''), value: s.c[e[0]] };
    });
    charts = [];
    charts.push(chart($('cPrice'), {
      start: start, end: end, height: 230, log: true, spans: segSpans, markers: markers,
      series: [{ kind: 'line', pts: smaPts, color: '#B39DDB', dash: '4 4', width: 1 }, { kind: 'line', pts: pricePts, color: '#FFFFFF', width: 1.4 }],
      fmt: function (v) { return v >= 10000 ? +(v / 1000).toFixed(1) + 'k' : v >= 1000 ? v.toFixed(0) : v.toFixed(v < 100 ? 1 : 0); },
      label: '<b class="pl-b">' + name + ' price</b> green = in a boom · amber = cooling · grey = paused · <span style="color:#B39DDB">dashed</span> = 200-day average'
    }));
    ribbon($('cRib'), start, end, ribSpans);

    var per = TF_NAME[tf], closed = [], partial = [];
    rows.forEach(function (r) {
      var m = s.m[r.i];
      if (m === null) return;
      (r.partial ? partial : closed).push([r.t, m / 1e4, BAND[s.b[r.i]]]);
    });
    charts.push(chart($('cMeter'), {
      start: start, end: end, height: 190, domain: [-0.35, 0.22],
      rules: [{ v: 0, label: '', color: '#D1D4DC', dash: '1 0' }, { v: D.ln[0], label: 'near the end', color: RED, dash: '2 4' }],
      series: [{ kind: 'bars', pts: closed, barDays: TF_DAYS[tf], color: TEAL }].concat(partial.length ? [{ kind: 'bars', pts: partial, barDays: TF_DAYS[tf], color: TEAL, outline: true }] : []),
      fmt: function (v) { return (v > 0 ? '+' : '') + Math.round(v * 100) + '%'; },
      label: '<b class="pl-b">Boom meter</b> <b>above the line</b> = in a boom: how far it can fall before the boom ends (tallest = right at the high) · <b>below the line</b> = no boom: how far it must rise to start one' +
        (nowP ? ' · dashed = this ' + (per === '2 weeks' ? '2-week bar' : per) + ' so far' : '')
    }));

    var v0 = x.v0, nk = x.k.length, nClosed = nk - (nowP ? 1 : 0), kP = [], dP = [], jP = [], kT = [], dT = [], up = [], dn = [];
    var tAt = function (qk) { return rows[v0 + qk].t; };
    for (var qk = 0; qk < nClosed; qk++) {
      var t = tAt(qk);
      kP.push([t, x.k[qk] / 10]); dP.push([t, x.d[qk] / 10]); jP.push([t, Math.max(-20, Math.min(120, x.j[qk] / 10))]);
    }
    if (nowP && nk >= 2) for (qk = nk - 2; qk < nk; qk++) { kT.push([tAt(qk), x.k[qk] / 10]); dT.push([tAt(qk), x.d[qk] / 10]); }
    x.up.forEach(function (qq) { up.push([tAt(qq), x.k[qq] / 10]); });
    x.dn.forEach(function (qq) { dn.push([tAt(qq), x.k[qq] / 10]); });
    charts.push(chart($('cKdj'), {
      start: start, end: end, height: 130, domain: [-20, 120],
      rules: [{ v: 80, label: '80', color: '#2A2E39' }, { v: 20, label: '20', color: '#2A2E39' }],
      series: [{ kind: 'line', pts: jP, color: PURPLE, width: 1.1 }, { kind: 'line', pts: dP, color: GOLD, width: 1.3 }, { kind: 'line', pts: kP, color: '#FFFFFF', width: 1.5 },
        { kind: 'line', pts: dT, color: GOLD, width: 1.3, dash: '3 3' }, { kind: 'line', pts: kT, color: '#FFFFFF', width: 1.5, dash: '3 3' }]
        .concat(tf === 'D' ? [] : [{ kind: 'dots', pts: up, color: TEAL }, { kind: 'dots', pts: dn, color: RED }]),
      fmt: function (v) { return v.toFixed(0); },
      label: '<b class="pl-b">Is the meter rising or falling?</b> KDJ of the boom meter · <span style="color:#fff">K</span> · <span style="color:' + GOLD + '">D</span> · <span style="color:' + PURPLE + '">J</span>' +
        (tf === 'D' ? ' · dots hidden on daily' : ' · <span style="color:' + TEAL + '">●</span> turning up (toward a boom / away from the end) · <span style="color:' + RED + '">●</span> turning down')
    }));
    charts.forEach(function (c) { c.cross(hover); });
    readout();
    lastW = window.innerWidth;
  }


  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b || !D) return;
    if (b.dataset.r !== undefined && b.parentNode.id === 'range') { range = Number(b.dataset.r); rangeBar(); syncURL(); render(); }
    else if (b.dataset.tf) { tf = b.dataset.tf; render(); }
    else if (b.dataset.sym) { sym = b.dataset.sym; hover = null; showAll = false; syncURL(); render(); }
    else if (b.id === 'allEps') { showAll = !showAll; render(); }
  });
  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (window.innerWidth !== lastW) render(); }, 150);
  });

  function getJSON(url, tries) {
    var ac = window.AbortController ? new AbortController() : null, timedOut = false;
    var t = ac ? setTimeout(function () { timedOut = true; ac.abort(); }, 30000) : null;
    return fetch(url, ac ? { cache: 'no-cache', signal: ac.signal } : { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) { clearTimeout(t); return j; }, function (e) {
      clearTimeout(t);
      if (timedOut) { if (tries > 1) return getJSON(url, tries - 1); throw new Error('timed out'); }
      throw e;
    });
  }
  function load() {
    getJSON(URL_, 3).then(function (j) {
      if (!j || j.kind !== 'boom' || j.schema !== 2) throw new Error('unexpected file');
      var keep = D && D.built_utc === j.built_utc;
      if (!D && qs && j.sym[qs]) sym = qs;
      if (!j.sym[sym]) sym = j.order[0];
      if (!keep) D = j;
      err = ''; $('err').innerHTML = '';
      status(); if (!keep) render();
      syncURL();
    }).catch(function (e) {
      err = String(e && e.message || e);
      status();
      $('err').innerHTML = '<div class="banner banner-bad"><b>Couldn’t load the prices</b>' + esc(err) + (D ? ' — showing the last copy this page loaded.' : '') + '</div>';
      if (!D) $('boom').innerHTML = '<h1>No data</h1>';
    });
  }
  rangeBar();
  load();
  setInterval(function () { load(); }, 15 * 60000);
  setInterval(function () { if (D) status(); }, 60000);
})();
