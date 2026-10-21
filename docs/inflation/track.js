





(function (root) {
  'use strict';


  function tagsMatch(tags, st) {
    if (!tags) return true;
    if ('asset' in tags && tags.asset !== st.asset) return false;
    if ('horizon' in tags && +tags.horizon !== +st.h) return false;
    if ('measure' in tags && tags.measure !== st.measure) return false;
    return true;
  }
  function pickVariant(block, st) {
    var vs = (block && block.variants) || [];
    for (var i = 0; i < vs.length; i++) if (tagsMatch(vs[i].tags, st)) return vs[i];
    return null;
  }
  function openView(track, chosen) {
    if (chosen === 'live' || chosen === 'backtest') return chosen;
    return track && track.open === 'live' ? 'live' : 'backtest';
  }
  function lineText(o, nowMs) {
    if (!o) return null;
    var t = o.at_utc ? Date.parse(o.at_utc) : NaN;
    return (isFinite(t) && isFinite(nowMs) && nowMs >= t && o.after) ? o.after : o.text;
  }

  function trackMeasures(track) {
    var seen = {};
    ['backtest', 'live'].forEach(function (vn) {
      var V = (track && track.views && track.views[vn]) || {};
      (V.blocks || []).forEach(function (b) {
        if (b.id !== 'inflation') return;
        (b.variants || []).forEach(function (v) { if (v.tags && v.tags.measure) seen[v.tags.measure] = true; });
      });
    });
    return seen;
  }
  var api = { tagsMatch: tagsMatch, pickVariant: pickVariant, openView: openView, lineText: lineText, trackMeasures: trackMeasures };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }


  var NS = 'http://www.w3.org/2000/svg';
  var COL = { line: '#2A2E39', grid: '#22262F', muted: '#8A8E99', text: '#D1D4DC', white: '#FFFFFF', zero: '#5D6170',
    accent: '#7E57C2', light: '#B39DDB', up: '#26A69A', down: '#EF5350', amber: '#F2B04B', bg: '#131722' };
  var MEASURES = [['core_cpi', 'Core CPI'], ['cpi', 'CPI'], ['core_pce', 'Core PCE'], ['pce', 'PCE'], ['core_ppi', 'Core PPI'], ['ppi', 'PPI']];



  var OPTIONAL_MEASURES = { core_ppi: true, ppi: true };
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sv(name, attrs, parent) { var e = document.createElementNS(NS, name); for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fin(v) { return v !== null && v !== undefined && isFinite(v); }
  function sized(host, draw) {
    var lastW = 0;
    function go() { var w = host.clientWidth; if (!w || Math.abs(w - lastW) < 2) return; lastW = w; clear(host); draw(w); }
    if (window.ResizeObserver) new ResizeObserver(go).observe(host);
    requestAnimationFrame(go);
  }
  function niceTicks(lo, hi, n) {
    var span = hi - lo; if (!(span > 0)) return [lo];
    var step = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], t = Math.ceil(lo / step) * step;
    for (; t <= hi + step * 1e-6; t += step) out.push(Math.abs(t) < step * 1e-9 ? 0 : t);
    return out;
  }
  function tickText(v, step) { var dp = step >= 1 ? 0 : step >= 0.1 ? 1 : 2; return (v < 0 ? '−' : '') + Math.abs(v).toFixed(dp); }
  function yearOf(iso) { return +String(iso).slice(0, 4); }


  function readout(box) { var r = h('p', 'tr-read'); r.setAttribute('aria-live', 'polite'); box.appendChild(r); return r; }
  function legend(items) {
    var lg = h('div', 'tr-leg');
    items.forEach(function (it) { if (!it || !it[1]) return; var s = h('span', 'tr-lk'); s.appendChild(h('i', 'tr-sw ' + it[0])); s.appendChild(document.createTextNode(it[1])); lg.appendChild(s); });
    return lg;
  }

  function frame(svg, W, H, P, xs, lo, hi, units) {
    var t0 = Date.parse(xs[0]), t1 = Date.parse(xs[xs.length - 1]); if (!(t1 > t0)) { t0 -= 864e5 * 30; t1 += 864e5 * 30; }
    var X = function (iso) { return P.l + (W - P.l - P.r) * (Date.parse(iso) - t0) / (t1 - t0); };
    var Y = function (v) { return P.t + (H - P.t - P.b) * (1 - (v - lo) / (hi - lo)); };
    var ticks = niceTicks(lo, hi, H > 200 ? 5 : 4), step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
    ticks.forEach(function (v) {
      sv('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), stroke: v === 0 ? COL.zero : COL.grid, 'stroke-width': 1, 'stroke-dasharray': v === 0 ? '4 3' : null }, svg);
      var tx = sv('text', { x: P.l - 6, y: Y(v) + 3.5, 'text-anchor': 'end', fill: COL.muted, 'font-size': 10.5 }, svg); tx.textContent = tickText(v, step) + (units === '%' ? '%' : '');
    });
    var y0 = yearOf(xs[0]), y1 = yearOf(xs[xs.length - 1]), every = Math.max(1, Math.ceil((y1 - y0 + 1) / Math.max(2, Math.floor((W - P.l - P.r) / 52))));
    for (var y = y0; y <= y1 + 1; y++) {
      if ((y - y0) % every) continue;
      var iso = y + '-01-01', x = X(iso); if (x < P.l - 1 || x > W - P.r + 1) continue;
      sv('line', { x1: x, x2: x, y1: H - P.b, y2: H - P.b + 4, stroke: COL.muted, 'stroke-width': 1 }, svg);
      var tl = sv('text', { x: x, y: H - P.b + 15, 'text-anchor': 'middle', fill: COL.muted, 'font-size': 10.5 }, svg); tl.textContent = String(y);
    }
    return { X: X, Y: Y };
  }
  function hover(svg, host, W, H, P, xs, F, tips, out) {
    var guide = sv('line', { x1: 0, x2: 0, y1: P.t, y2: H - P.b, stroke: COL.light, 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' }, svg);
    var px = xs.map(function (x) { return F.X(x); });
    function at(ev) {
      var r = svg.getBoundingClientRect(), mx = (ev.clientX - r.left) * (W / r.width), best = 0, bd = Infinity;
      for (var i = 0; i < px.length; i++) { var d = Math.abs(px[i] - mx); if (d < bd) { bd = d; best = i; } }
      guide.setAttribute('x1', px[best]); guide.setAttribute('x2', px[best]); guide.setAttribute('visibility', 'visible');
      out.textContent = tips[best] || '';
    }
    svg.addEventListener('pointermove', at); svg.addEventListener('pointerdown', at);
    svg.addEventListener('pointerleave', function () { guide.setAttribute('visibility', 'hidden'); });
  }
  function bandChart(c) {
    var box = h('figure', 'tr-chart'); box.setAttribute('aria-label', c.label);
    box.appendChild(h('figcaption', 'tr-cap', c.label));
    var host = h('div', 'tr-svg'); box.appendChild(host);
    var hasBand = c.lo && c.hi, ins = c.inside;
    box.appendChild(legend([['sw-mid', c.mid_label], hasBand ? ['sw-band', c.band_label] : null,
      ins ? ['sw-in', c.actual_label + ': inside'] : ['sw-act', c.actual_label], ins ? ['sw-out', 'outside'] : null]));
    var out = readout(box); out.textContent = 'Point at or tap the chart to read one check.';
    sized(host, function (W) {
      var H = W < 520 ? 210 : 260, P = { l: 44, r: 10, t: 10, b: 24 };
      var vals = [].concat(c.mid, c.actual, hasBand ? c.lo : [], hasBand ? c.hi : []).filter(fin);
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      if (c.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      var pad = (hi - lo) * 0.06 || 0.5; lo -= pad; hi += pad;
      var svg = sv('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-hidden': 'true', class: 'tr-plot' }, host);
      var F = frame(svg, W, H, P, c.x, lo, hi, c.units);
      if (hasBand) {
        var up = '', dn = '';
        c.x.forEach(function (x, i) { if (fin(c.lo[i]) && fin(c.hi[i])) { up += (up ? 'L' : 'M') + F.X(x).toFixed(1) + ',' + F.Y(c.hi[i]).toFixed(1); } });
        for (var i = c.x.length - 1; i >= 0; i--) if (fin(c.lo[i]) && fin(c.hi[i])) dn += 'L' + F.X(c.x[i]).toFixed(1) + ',' + F.Y(c.lo[i]).toFixed(1);
        if (up) sv('path', { d: up + dn + 'Z', fill: COL.light, 'fill-opacity': 0.16, stroke: 'none' }, svg);
      }
      var d = '', pen = false;
      c.x.forEach(function (x, i) { if (!fin(c.mid[i])) { pen = false; return; } d += (pen ? 'L' : 'M') + F.X(x).toFixed(1) + ',' + F.Y(c.mid[i]).toFixed(1); pen = true; });
      sv('path', { d: d, fill: 'none', stroke: COL.accent, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, svg);
      var r = c.x.length > 80 ? 2.6 : 3.2;
      c.x.forEach(function (x, i) {
        if (!fin(c.actual[i])) return;
        var col = ins ? (ins[i] === true ? COL.up : ins[i] === false ? COL.down : COL.muted) : COL.light;
        sv('circle', { cx: F.X(x), cy: F.Y(c.actual[i]), r: r, fill: col, 'fill-opacity': 0.92, stroke: COL.bg, 'stroke-width': 0.8 }, svg);
      });
      hover(svg, host, W, H, P, c.x, F, c.tips, out);
    });
    return box;
  }
  function probChart(c) {
    var box = h('figure', 'tr-chart'); box.setAttribute('aria-label', c.label);
    box.appendChild(h('figcaption', 'tr-cap', c.label));
    var host = h('div', 'tr-svg'); box.appendChild(host);
    box.appendChild(legend([['sw-mid', c.mid_label], ['sw-out', c.hit_label], ['sw-no', c.miss_label]]));
    var out = readout(box); out.textContent = 'Point at or tap the chart to read one check.';
    sized(host, function (W) {
      var H = W < 520 ? 190 : 230, P = { l: 44, r: 10, t: 26, b: 24 };
      var mx = Math.max.apply(null, c.mid.filter(fin)); var hi = Math.max(20, Math.ceil((mx * 1.25) / 10) * 10);
      var svg = sv('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-hidden': 'true', class: 'tr-plot' }, host);
      var F = frame(svg, W, H, P, c.x, 0, hi, c.units);
      var d = '', pen = false;
      c.x.forEach(function (x, i) { if (!fin(c.mid[i])) { pen = false; return; } d += (pen ? 'L' : 'M') + F.X(x).toFixed(1) + ',' + F.Y(c.mid[i]).toFixed(1); pen = true; });
      sv('path', { d: d, fill: 'none', stroke: COL.accent, 'stroke-width': 1.8 }, svg);
      c.x.forEach(function (x, i) {
        if (c.hit[i]) sv('circle', { cx: F.X(x), cy: 12, r: 3.4, fill: COL.down }, svg);
        else sv('line', { x1: F.X(x), x2: F.X(x), y1: 9, y2: 15, stroke: COL.zero, 'stroke-width': 1.2 }, svg);
      });
      hover(svg, host, W, H, P, c.x, F, c.tips, out);
    });
    return box;
  }
  function calibChart(cal) {
    var box = h('figure', 'tr-calib'); box.setAttribute('aria-label', cal.label);
    box.appendChild(h('figcaption', 'tr-cap', cal.label));
    var host = h('div', 'tr-svg'); box.appendChild(host);
    var out = readout(box); out.textContent = cal.points.map(function (p) { return p.text; })[0] || '';
    sized(host, function (W) {
      W = Math.min(W, 300); var H = Math.round(W * 0.78), P = { l: 40, r: 10, t: 8, b: 30 };
      var mx = 0; cal.points.forEach(function (p) { mx = Math.max(mx, p.said, p.happened); });
      var hi = Math.max(50, Math.ceil(mx * 1.15 / 10) * 10), nmax = Math.max.apply(null, cal.points.map(function (p) { return p.n; }));
      var X = function (v) { return P.l + (W - P.l - P.r) * v / hi; }, Y = function (v) { return P.t + (H - P.t - P.b) * (1 - v / hi); };
      var svg = sv('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-hidden': 'true' }, host);
      niceTicks(0, hi, 4).forEach(function (v) {
        sv('line', { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), stroke: COL.grid }, svg);
        var a = sv('text', { x: P.l - 5, y: Y(v) + 3.5, 'text-anchor': 'end', fill: COL.muted, 'font-size': 10 }, svg); a.textContent = v + '%';
        var b = sv('text', { x: X(v), y: H - P.b + 13, 'text-anchor': 'middle', fill: COL.muted, 'font-size': 10 }, svg); b.textContent = v + '%';
      });
      sv('line', { x1: X(0), y1: Y(0), x2: X(hi), y2: Y(hi), stroke: COL.zero, 'stroke-dasharray': '4 3' }, svg);
      var xl = sv('text', { x: (P.l + W - P.r) / 2, y: H - 3, 'text-anchor': 'middle', fill: COL.muted, 'font-size': 10 }, svg); xl.textContent = 'said';
      var yl = sv('text', { x: 10, y: (P.t + H - P.b) / 2, 'text-anchor': 'middle', fill: COL.muted, 'font-size': 10, transform: 'rotate(-90 10 ' + ((P.t + H - P.b) / 2) + ')' }, svg); yl.textContent = 'happened';
      cal.points.forEach(function (p) {
        var c = sv('circle', { cx: X(p.said), cy: Y(p.happened), r: 3 + 9 * Math.sqrt(p.n / nmax), fill: COL.amber, 'fill-opacity': 0.75, stroke: COL.bg, 'stroke-width': 1 }, svg);
        var t = document.createElementNS(NS, 'title'); t.textContent = p.text; c.appendChild(t);
        c.addEventListener('pointerenter', function () { out.textContent = p.text; });
        c.addEventListener('pointerdown', function () { out.textContent = p.text; });
      });
    });
    return box;
  }
  function chart(c) { return !c ? null : c.type === 'prob' ? probChart(c) : bandChart(c); }


  function table(t, cls, caption) {
    var wrap = h('div', 'tr-tbl ' + (cls || ''));
    var tb = h('table'); if (caption) { var cp = h('caption', 'vh', caption); tb.appendChild(cp); }
    var thead = h('thead'), tr = h('tr'); t.cols.forEach(function (c) { tr.appendChild(h('th', c.key === 'ok' ? 'ok' : c.txt ? 'txt' : '', c.label)); }); thead.appendChild(tr); tb.appendChild(thead);
    var tbody = h('tbody');
    t.rows.forEach(function (r) {
      var row = h('tr');
      t.cols.forEach(function (c) {
        if (c.key === 'ok') {
          var v = r.ok, td = h('td', 'ok ' + (v === true ? 'yes' : v === false ? 'no' : ''), v === true ? '✓' : v === false ? '✗' : '');
          if (v === true || v === false) td.setAttribute('aria-label', v ? 'inside' : 'outside');
          row.appendChild(td);
        } else row.appendChild(h('td', c.txt ? 'txt' : '', r[c.key]));
      });
      tbody.appendChild(row);
    });
    tb.appendChild(tbody); wrap.appendChild(tb);
    return wrap;
  }


  function tile(block, v, ctx, onGo) {
    var t = v.tile, a = h('button', 'tr-tile'); a.type = 'button';
    a.setAttribute('aria-label', block.title + ': ' + t.label + ' ' + t.big + (t.small ? ', ' + t.small : ''));
    var hd = h('span', 'tr-tt'); hd.appendChild(h('b', '', block.title)); if (v.kicker) hd.appendChild(h('span', '', v.kicker)); a.appendChild(hd);
    a.appendChild(h('span', 'tr-tl', t.label));
    var big = h('span', 'tr-tb'); big.appendChild(h('span', 'tr-tn', t.big)); if (t.small) big.appendChild(h('small', '', t.small)); a.appendChild(big);
    if (t.lines && t.lines.length) { var ul = h('span', 'tr-tli'); t.lines.forEach(function (l) { ul.appendChild(h('span', '', l)); }); a.appendChild(ul); }
    if (t.windows && t.windows.length) {
      var w = h('span', 'tr-win');
      t.windows.forEach(function (x, i) { var s = h('span', 'tr-wi' + (i === 0 ? ' lead' : '')); s.appendChild(h('i', '', x.label)); s.appendChild(document.createTextNode(x.text)); w.appendChild(s); });
      a.appendChild(w);
    }
    a.addEventListener('click', onGo);
    return a;
  }

  function mountTrack(host, track, ctx) {
    clear(host);
    var st = { view: null, measure: 'core_cpi' };
    if (!track) { var na = ctx.naChips([{ what: 'Track record', why: 'the track record could not be read', needed: '' }]); if (na) host.appendChild(na); return; }
    var sec = h('section', 'tr'); sec.setAttribute('aria-labelledby', 'trTitle'); host.appendChild(sec);
    var head = h('div', 'tr-head');
    var ht = h('div', 'tr-ht'); var h2 = h('h2', '', track.title); h2.id = 'trTitle'; ht.appendChild(h2); ht.appendChild(ctx.info('track_overview', track.title)); head.appendChild(ht);
    var seg = h('div', 'seg tr-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Live or backtest'); seg.id = 'cTrackView';
    [['live', 'Live'], ['backtest', 'Backtest']].forEach(function (o) { var b = h('button', '', o[1]); b.type = 'button'; b.setAttribute('data-v', o[0]); b.addEventListener('click', function () { st.view = o[0]; paint(); }); seg.appendChild(b); });
    head.appendChild(seg); sec.appendChild(head);
    var defs = h('ul', 'tr-defs'); (track.defs || []).forEach(function (d) { defs.appendChild(h('li', '', d)); }); sec.appendChild(defs);
    var body = h('div', 'tr-body'); sec.appendChild(body);

    function paint() {
      var S = ctx.state(), view = openView(track, st.view), vs = { asset: S.asset, h: S.h, measure: st.measure };
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === view ? 'true' : 'false'); });
      clear(body);
      var V = track.views[view] || { blocks: [] };
      if (view === 'backtest' && track.live_line) body.appendChild(h('p', 'tr-line', lineText(track.live_line, ctx.now())));
      if (view === 'live') {
        if (V.empty) {
          var em = h('div', 'tr-empty'); em.appendChild(h('p', 'tr-et', V.empty.text));
          if (V.empty.items && V.empty.items.length) { var dl = h('dl', 'tr-el'); V.empty.items.forEach(function (it) { var d = h('div'); d.appendChild(h('dt', '', it.label)); d.appendChild(h('dd', '', lineText(it, ctx.now()))); dl.appendChild(d); }); em.appendChild(dl); }
          body.appendChild(em);
        }
        if (V.chain_ok === false) { var bad = ctx.naChips([{ what: 'Live checks', why: 'the saved forecasts could not be verified', needed: '' }]); if (bad) body.appendChild(bad); }
      }
      var blocks = V.blocks || [];
      if (blocks.length) {
        var tiles = h('div', 'tr-tiles n' + blocks.length);
        blocks.forEach(function (b) {
          var v = pickVariant(b, vs);
          if (!v) { var nt = h('div', 'tr-tile tr-tile-na'); nt.appendChild(h('span', 'tr-tt', b.title)); nt.appendChild(h('span', 'tr-tl', b.id === 'inflation' ? 'Nothing for this measure yet' : 'Nothing for this choice yet')); tiles.appendChild(nt); return; }
          tiles.appendChild(tile(b, v, ctx, function () { var t = document.getElementById('tr-' + b.id); if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); }));
        });
        body.appendChild(tiles);
      }
      blocks.forEach(function (b) {
        var s = h('section', 'tr-blk'); s.id = 'tr-' + b.id;
        var bh = h('div', 'tr-bh'); var hh = h('div', 'tr-bt'); hh.appendChild(h('h3', '', b.title)); hh.appendChild(ctx.info(b.note_id, b.title)); bh.appendChild(hh);
        if (b.id === 'inflation') {
          var inTrack = trackMeasures(track);
          var ms = h('div', 'seg tr-mseg'); ms.setAttribute('role', 'group'); ms.setAttribute('aria-label', 'Measure');
          MEASURES.forEach(function (m) {
            var has = (b.variants || []).some(function (v) { return v.tags && v.tags.measure === m[0]; });
            if (!has && OPTIONAL_MEASURES[m[0]] && !inTrack[m[0]]) return;
            var btn = h('button', '', m[1]); btn.type = 'button'; btn.setAttribute('data-v', m[0]); btn.disabled = !has;
            btn.setAttribute('aria-pressed', st.measure === m[0] ? 'true' : 'false');
            btn.addEventListener('click', function () { st.measure = m[0]; paint(); var t = document.getElementById('tr-inflation'); if (t) t.scrollIntoView({ block: 'start' }); });
            ms.appendChild(btn);
          });
          bh.appendChild(ms);
        }
        s.appendChild(bh);
        if (b.how) s.appendChild(h('p', 'tr-how', b.how));
        var v = pickVariant(b, vs);
        if (!v) {
          s.appendChild(h('p', 'tr-how', b.id === 'inflation' ? 'Nothing for this measure yet.' : 'Nothing for this choice yet.'));
        } else {
          var ch = chart(v.chart); if (ch) s.appendChild(ch);
          if (v.calib) s.appendChild(calibChart(v.calib));
          if (v.lines && v.lines.length) { var ul = h('ul', 'tr-li'); v.lines.forEach(function (l) { ul.appendChild(h('li', '', l)); }); s.appendChild(ul); }
          if (v.list && v.list.rows.length) {
            s.appendChild(h('h4', 'tr-h4', view === 'live' ? 'Each locked check (newest first)' : 'Each check (newest first)'));
            s.appendChild(table(v.list, 'tr-list', b.title + ' checks'));
          }
          if (v.by_year && v.by_year.rows.length) {
            var det = h('details', 'tr-year'); det.appendChild(h('summary', '', 'By year'));
            det.appendChild(table(v.by_year, 'tr-ytbl', b.title + ' by year')); s.appendChild(det);
          }
          var nv = ctx.naChips(v.unavailable || []); if (nv) s.appendChild(nv);
        }
        var nb = ctx.naChips(b.unavailable || []); if (nb) s.appendChild(nb);
        body.appendChild(s);
      });
      if (view === 'live' && V.models && V.models.rows.length) {
        var ms2 = h('section', 'tr-blk'); ms2.id = 'tr-models';
        ms2.appendChild(h('h3', '', V.models.label));
        ms2.appendChild(table(V.models, 'tr-list', V.models.label)); body.appendChild(ms2);
      }
      var nu = ctx.naChips(track.unavailable || []); if (nu) body.appendChild(nu);
    }
    paint(); ctx.onRefresh(paint);
  }

  root.ILTrack = { tagsMatch: tagsMatch, pickVariant: pickVariant, openView: openView, lineText: lineText, trackMeasures: trackMeasures, mountTrack: mountTrack };
})(typeof window !== 'undefined' ? window : this);
