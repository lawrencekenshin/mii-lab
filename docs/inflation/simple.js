





(function (root) {
  'use strict';


  function resolveMode(hash, stored) {
    var m = /(?:^|[#&])mode=(simple|full|track)(?:&|$)/.exec(String(hash || ''));
    if (m) return m[1];
    if (stored === 'simple' || stored === 'full' || stored === 'track') return stored;
    return 'simple';
  }
  function etDateKey(ms) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }
  function countdownWords(atIso, nowMs) {
    var t = Date.parse(atIso);
    if (!isFinite(t) || !isFinite(nowMs)) return null;
    if (t <= nowMs) return 'released';
    var a = etDateKey(t), b = etDateKey(nowMs);
    var d = Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 864e5);
    return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days';
  }
  function tagsMatch(tags, st) {
    if (!tags) return true;
    if ('asset' in tags && tags.asset !== st.asset) return false;
    if ('horizon' in tags && +tags.horizon !== +st.h) return false;
    return true;
  }
  function pickVariant(card, st) {
    var vs = (card && card.variants) || [];
    for (var i = 0; i < vs.length; i++) if (vs[i].tags && tagsMatch(vs[i].tags, st)) return vs[i];
    for (var j = 0; j < vs.length; j++) if (!vs[j].tags) return vs[j];
    return null;
  }


  function timedText(o, nowMs) {
    if (!o) return null;
    var t = o.at_utc ? Date.parse(o.at_utc) : NaN;
    return (isFinite(t) && isFinite(nowMs) && nowMs >= t && o.after) ? o.after : o.text;
  }

  function nextUpText(list, done, nowMs) {
    for (var i = 0; i < (list || []).length; i++) {
      var t = Date.parse(list[i].at_utc);
      if (isFinite(t) && t > nowMs) return list[i].text + ' (' + countdownWords(list[i].at_utc, nowMs) + ').';
    }
    return done || null;
  }



  function staggerRows(xs, gap) {
    var rows = [], last = [-Infinity, -Infinity];
    (xs || []).forEach(function (x) {
      var r = x - last[0] >= gap ? 0 : (x - last[1] >= gap ? 1 : 0);
      rows.push(r); last[r] = x;
    });
    return rows;
  }

  var api = { resolveMode: resolveMode, countdownWords: countdownWords, etDateKey: etDateKey, pickVariant: pickVariant, tagsMatch: tagsMatch,
    timedText: timedText, nextUpText: nextUpText, staggerRows: staggerRows };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }


  var NS = 'http://www.w3.org/2000/svg';
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sv(name, attrs, parent) { var e = document.createElementNS(NS, name); for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function lines(arr, cls) { var ul = h('ul', cls); (arr || []).forEach(function (t) { ul.appendChild(h('li', '', t)); }); return ul; }
  var COL = { line: '#2A2E39', muted: '#8A8E99', text: '#D1D4DC', white: '#FFFFFF', zero: '#5D6170', accent: '#7E57C2', light: '#B39DDB' };


  function sized(host, draw) {
    var lastW = 0;
    function go() { var w = host.clientWidth; if (!w || Math.abs(w - lastW) < 2) return; lastW = w; clear(host); draw(w); }
    if (window.ResizeObserver) new ResizeObserver(go).observe(host);
    requestAnimationFrame(go);
    return function () { lastW = 0; go(); };
  }

  function finite(y) { return y !== null && y !== undefined && isFinite(y); }

  function gapPath(ys, X, Y) {
    var d = '', pen = false;
    ys.forEach(function (y, i) {
      if (!finite(y)) { pen = false; return; }
      d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(y).toFixed(1); pen = true;
    });
    return d;
  }
  function spark(v, color) {
    var box = h('figure', 'viz viz-spark'); box.setAttribute('aria-label', v.label + ': ' + v.span + (v.gap_text ? ' (' + v.gap_text + ')' : '') + ', latest ' + v.last_text);
    var host = h('div', 'viz-svg'); box.appendChild(host);
    var cap = h('figcaption', 'viz-cap'); cap.appendChild(h('span', '', v.span)); cap.appendChild(h('b', '', 'latest ' + v.last_text));
    if (v.gap_text) cap.appendChild(h('span', 'viz-gap', v.gap_text));
    box.appendChild(cap);
    sized(host, function (W) {
      var H = 56, P = 5, ys = v.y, n = ys.length, fin = ys.filter(finite);
      var lo = Math.min.apply(null, fin), hi = Math.max.apply(null, fin);
      if (v.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      if (hi - lo < 1e-9) { hi += 0.5; lo -= 0.5; }
      var X = function (i) { return P + (W - 2 * P - 6) * (n > 1 ? i / (n - 1) : 0); };
      var Y = function (y) { return P + (H - 2 * P) * (1 - (y - lo) / (hi - lo)); };
      var svg = sv('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-hidden': 'true' }, host);
      if (v.zero && lo < 0 && hi > 0) sv('line', { x1: P, x2: W - P, y1: Y(0), y2: Y(0), stroke: COL.zero, 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg);
      sv('path', { d: gapPath(ys, X, Y), fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      ys.forEach(function (y, i) {
        if (finite(y) && !finite(ys[i - 1]) && !finite(ys[i + 1]) && i !== n - 1) sv('circle', { cx: X(i), cy: Y(y), r: 2, fill: color }, svg);
      });
      var last = n - 1; while (last > 0 && !finite(ys[last])) last--;
      sv('circle', { cx: X(last), cy: Y(ys[last]), r: 3.5, fill: color, stroke: '#131722', 'stroke-width': 1.5 }, svg);
    });
    return box;
  }

  function stack(v, color) {
    var box = h('figure', 'viz viz-stack'); box.setAttribute('aria-label', v.label);
    var head = h('figcaption', 'viz-cap'); head.appendChild(h('span', '', v.label)); head.appendChild(h('b', '', '= ' + v.total_text)); box.appendChild(head);
    var bar = h('div', 'stk'); box.appendChild(bar);
    var tot = v.parts.reduce(function (a, p) { return a + Math.abs(p.value); }, 0) || 1;
    var key = h('div', 'stk-key'); box.appendChild(key);
    v.parts.forEach(function (p) {
      var seg = h('span', 'stk-seg'); seg.style.flexGrow = String(Math.abs(p.value) / tot); seg.style.background = color(p.color);
      seg.title = p.label + ' ' + p.text; bar.appendChild(seg);
      var k = h('span', 'stk-k'); var sw = h('i', 'sw'); sw.style.background = color(p.color); k.appendChild(sw);
      k.appendChild(document.createTextNode(p.label + ' ')); k.appendChild(h('b', '', p.text)); key.appendChild(k);
    });
    return box;
  }

  function bars(v, color) {
    var box = h('figure', 'viz viz-bars'); box.setAttribute('aria-label', v.label);
    box.appendChild(h('figcaption', 'viz-cap', v.label));
    var mx = Math.max.apply(null, v.items.map(function (i) { return Math.abs(i.value); })) || 1;
    v.items.forEach(function (it) {
      var r = h('div', 'br' + (it.best ? ' best' : ''));
      r.appendChild(h('span', 'br-l', it.label));
      var tr = h('span', 'br-t'); var b = h('i', 'br-b'); b.style.width = (100 * Math.abs(it.value) / mx).toFixed(1) + '%'; b.style.background = color(it.color); tr.appendChild(b); r.appendChild(tr);
      r.appendChild(h('span', 'br-v', it.text));
      box.appendChild(r);
    });
    return box;
  }

  function range(v) {
    var hasBand = v.band_lo != null && v.band_hi != null;
    var zone = hasBand ? v.band_text : v.ref_text;
    var box = h('figure', 'viz viz-range'); box.setAttribute('aria-label', v.label + ': ' + v.point_text + (zone ? ', ' + zone : ''));
    var host = h('div', 'viz-svg'); box.appendChild(host);
    if (zone || v.lo_text) {
      var cap = h('figcaption', 'viz-cap'); cap.appendChild(h('span', '', v.label));
      var keys = h('span', 'rg-keys');
      if (zone) { var r = h('span', 'rg-ref'); r.appendChild(h('i', 'sw sw-ref')); r.appendChild(document.createTextNode(zone)); keys.appendChild(r); }
      if (v.lo_text && v.lo != null && v.hi != null) { var q = h('span', 'rg-ref'); q.appendChild(h('i', 'sw sw-avg')); q.appendChild(document.createTextNode(v.lo_text)); keys.appendChild(q); }
      cap.appendChild(keys); box.appendChild(cap);
    }
    sized(host, function (W) {
      var H = 58, P = 10, cy = 34;
      var ext = Math.max(Math.abs(v.point), Math.abs(v.lo || 0), Math.abs(v.hi || 0), v.ref || 0,
        hasBand ? Math.abs(v.band_lo) : 0, hasBand ? Math.abs(v.band_hi) : 0) * 1.15 || 1;
      var X = function (x) { return P + (W - 2 * P) * (x + ext) / (2 * ext); };
      var svg = sv('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, host);
      if (hasBand) sv('rect', { x: X(v.band_lo), y: cy - 10, width: X(v.band_hi) - X(v.band_lo), height: 20, rx: 3, fill: COL.muted, 'fill-opacity': 0.18 }, svg);
      else if (v.ref != null) sv('rect', { x: X(-v.ref), y: cy - 10, width: X(v.ref) - X(-v.ref), height: 20, rx: 3, fill: COL.muted, 'fill-opacity': 0.14 }, svg);
      sv('line', { x1: P, x2: W - P, y1: cy, y2: cy, stroke: COL.line, 'stroke-width': 1 }, svg);
      sv('line', { x1: X(0), x2: X(0), y1: cy - 14, y2: cy + 14, stroke: COL.zero, 'stroke-width': 1 }, svg);
      var t0 = sv('text', { x: X(0), y: H - 1, 'text-anchor': 'middle', fill: COL.muted, 'font-size': 10.5 }, svg); t0.textContent = '0%';
      if (v.lo != null && v.hi != null) sv('line', { x1: X(v.lo), x2: X(v.hi), y1: cy, y2: cy, stroke: COL.light, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-opacity': 0.75 }, svg);
      sv('circle', { cx: X(v.point), cy: cy, r: 6, fill: COL.white, stroke: COL.accent, 'stroke-width': 2.5 }, svg);
      var tp = sv('text', { x: Math.min(W - 24, Math.max(24, X(v.point))), y: cy - 15, 'text-anchor': 'middle', fill: COL.white, 'font-size': 12, 'font-weight': 700 }, svg); tp.textContent = v.point_text;
    });
    return box;
  }

  function timeline(v, color) {
    var box = h('figure', 'viz viz-tl'); box.setAttribute('aria-label', v.label);
    var host = h('div', 'viz-svg'); box.appendChild(host);
    sized(host, function (W) {
      var P = 26, ts = v.items.map(function (i) { return Date.parse(i.at_utc); });
      var t0 = ts[0], t1 = ts[ts.length - 1];
      var X = function (t) { return P + (W - 2 * P) * (t1 > t0 ? (t - t0) / (t1 - t0) : 0.5); };


      var rows = staggerRows(ts.map(X), 46), two = rows.indexOf(1) >= 0, cy = two ? 44 : 30, H = two ? 92 : 62;
      var svg = sv('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true' }, host);
      sv('line', { x1: P, x2: W - P, y1: cy, y2: cy, stroke: COL.line, 'stroke-width': 2 }, svg);
      v.items.forEach(function (it, i) {
        var x = X(ts[i]), c = color(it.label === 'CPI' ? 'core_cpi' : it.label === 'PPI' ? 'core_ppi' : 'core_pce');
        sv('circle', { cx: x, cy: cy, r: 6, fill: c, stroke: '#131722', 'stroke-width': 2 }, svg);
        var a = sv('text', { x: x, y: cy - 12 - 15 * rows[i], 'text-anchor': 'middle', fill: COL.white, 'font-size': 11.5, 'font-weight': 700 }, svg); a.textContent = it.label;
        var b = sv('text', { x: x, y: cy + 24 + 15 * rows[i], 'text-anchor': 'middle', fill: COL.text, 'font-size': 10.5 }, svg); b.textContent = it.text;
      });
    });
    return box;
  }

  function visual(v, ctx, tint) {
    if (!v) return null;
    if (v.type === 'spark') return spark(v, ctx.color(tint || v.color));
    if (v.type === 'stack') return stack(v, ctx.color);
    if (v.type === 'bars') return bars(v, ctx.color);
    if (v.type === 'range') return range(v);
    if (v.type === 'timeline') return timeline(v, ctx.color);
    return null;
  }

  function countdownEl(text, at, ctx) {
    var s = h('span', 'cd', (at && countdownWords(at, ctx.now())) || text || '');
    return s;
  }


  function shell(card, cls, ctx, tag) {
    var art = h('article', cls); art.id = 'card-' + card.id;
    var hd = h('header', cls.split(' ')[0] + '-h');
    hd.appendChild(h(tag || 'h3', '', card.title));
    hd.appendChild(ctx.info(card.note_id, card.title));
    art.appendChild(hd);
    var body = h('div', 'cbody'); art.appendChild(body);
    return { art: art, body: body };
  }
  function naInto(list, el, ctx) { var r = ctx.naChips(list); if (r) el.appendChild(r); }


  function topCard(card, ctx) {
    var sh = shell(card, 'fcard', ctx);
    function paint() {
      var st = ctx.state(), body = sh.body; clear(body);
      var v = pickVariant(card, st);
      if (!v) { naInto(card.unavailable, body, ctx); return; }
      var k = h('p', 'fc-k');
      if (v.kicker) k.appendChild(h('b', '', v.kicker));
      if (v.when) {
        k.appendChild(document.createTextNode(' · ' + v.when.text + ' · '));
        k.appendChild(countdownEl(v.when.countdown, v.when.at_utc, ctx));
      }
      if (k.childNodes.length) body.appendChild(k);
      var rows = h('div', 'fc-rows n' + (v.rows || []).length);
      (v.rows || []).forEach(function (r) {
        var d = h('div', 'fc-row');
        d.appendChild(h('div', 'fc-l', r.label));
        var big = h('div', 'fc-v'); big.appendChild(h('span', 'fc-n', r.big)); if (r.small) big.appendChild(h('small', '', r.small));
        if (r.tip) { big.title = r.tip; big.setAttribute('aria-label', r.big + ' (' + r.tip + ')'); }
        d.appendChild(big);
        if (r.lines && r.lines.length) d.appendChild(lines(r.lines, 'fc-li'));
        if (r.note) d.appendChild(h('p', 'fc-note', r.note));
        rows.appendChild(d);
      });
      body.appendChild(rows);
      if (v.lines && v.lines.length) body.appendChild(lines(v.lines, 'fc-lines'));
      var foot = (v.lock ? [timedText(v.lock, ctx.now())] : []).concat(v.foot || []);
      if (foot.length) body.appendChild(lines(foot, 'fc-foot' + (v.lock ? '' : ' nolock')));
      var how = v.how || card.how; if (how) body.appendChild(h('p', 'fc-how', how));
      naInto((v.unavailable || []).concat(card.unavailable || []), body, ctx);
    }
    paint(); ctx.onRefresh(paint);
    return sh.art;
  }

  function mountTop(host, top, ctx) {
    clear(host);
    var hd = h('div', 'fc-head'); hd.appendChild(h('h2', '', (top && top.title) || 'The forecast')); host.appendChild(hd);
    if (!top) { naInto([{ what: 'The forecast', why: 'the forecast could not be read', needed: '' }], host, ctx); return; }
    var g = h('div', 'fc-grid'); host.appendChild(g);
    (top.cards || []).forEach(function (c) { g.appendChild(topCard(c, ctx)); });
    naInto(top.unavailable, host, ctx);
  }


  var WIDE = { s_inflation_now: 1, s_trust: 1, s_coming: 1 };
  function simpleCard(card, ctx) {
    var sh = shell(card, 'scard' + (WIDE[card.id] ? ' wide' : ''), ctx);
    var choice = {};
    function paint() {
      var st = ctx.state(), body = sh.body; clear(body);
      var v = pickVariant(card, st);
      if (!v) { naInto(card.unavailable, body, ctx); return; }
      var hl = v.next_up ? (nextUpText(v.next_up, v.next_up_done, ctx.now()) || v.headline) : v.headline;
      if (hl) body.appendChild(h('p', 'sc-hl', hl));
      if (v.lines && v.lines.length) body.appendChild(lines(v.lines, 'sc-li'));
      if (v.rows && v.rows.length) {
        var g = h('div', 'sc-rows');
        v.rows.forEach(function (r) {
          var d = h('div', 'sc-row');
          var top = h('div', 'sc-rt'); top.appendChild(h('span', 'sc-rl', r.label));
          if (r.word) top.appendChild(h('span', 'tw tw-' + (r.word_kind || 'flat'), r.word));
          d.appendChild(top);
          var big = h('div', 'sc-big'); big.appendChild(h('span', '', r.big)); if (r.small) big.appendChild(h('small', '', r.small)); d.appendChild(big);
          var vis = visual(r.visual, ctx); if (vis) d.appendChild(vis);
          if (r.text) d.appendChild(h('p', 'sc-rx', r.text));
          g.appendChild(d);
        });
        body.appendChild(g);
      }
      var side = null;
      if (v.list && v.list.length) {
        var dl = h('dl', 'sc-list');
        v.list.forEach(function (it) {
          var d = h('div');
          d.appendChild(h('dt', '', it.label));
          var dd = h('dd', '', it.text);
          if (it.at_utc || it.countdown) { dd.appendChild(document.createTextNode(' · ')); dd.appendChild(countdownEl(it.countdown, it.at_utc, ctx)); }
          d.appendChild(dd); dl.appendChild(d);
        });
        side = dl;
      }
      if (v.choices && v.choices.length) {
        var key = (v.tags && v.tags.asset) || '_';
        if (!choice[key] || !v.choices.some(function (c) { return c.id === choice[key]; })) choice[key] = v.default_choice;
        var seg = h('div', 'seg sc-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Surprise');
        var out = h('div', 'sc-choice');
        v.choices.forEach(function (c) {
          var b = h('button', '', c.label); b.type = 'button'; b.setAttribute('data-v', c.id);
          b.setAttribute('aria-pressed', c.id === choice[key] ? 'true' : 'false');
          b.addEventListener('click', function () { choice[key] = c.id; paint(); });
          seg.appendChild(b);
        });
        body.appendChild(seg);
        var c = v.choices.filter(function (x) { return x.id === choice[key]; })[0];
        if (c) {
          var big = h('div', 'sc-big'); big.appendChild(h('span', '', c.big)); big.appendChild(h('small', '', c.small || 'that day')); out.appendChild(big);
          out.appendChild(lines(c.lines, 'sc-li'));
          var vis2 = visual(c.visual, ctx); if (vis2) out.appendChild(vis2);
        }
        body.appendChild(out);
      }
      var vis3 = visual(v.visual, ctx);
      if (side && vis3) { var two = h('div', 'sc-two'); two.appendChild(vis3); two.appendChild(side); body.appendChild(two); }
      else { if (vis3) body.appendChild(vis3); if (side) body.appendChild(side); }
      var how = v.how || card.how; if (how) body.appendChild(h('p', 'sc-how', how));
      naInto((v.unavailable || []).concat(card.unavailable || []), body, ctx);
    }
    paint(); ctx.onRefresh(paint);
    return sh.art;
  }

  function mountSimple(host, simple, ctx) {
    clear(host);
    if (!simple) { naInto([{ what: 'Simple view', why: 'the Simple view could not be read', needed: '' }], host, ctx); return; }
    var g = h('div', 'sc-grid'); host.appendChild(g);
    (simple.cards || []).forEach(function (c) { g.appendChild(simpleCard(c, ctx)); });
    naInto(simple.unavailable, host, ctx);
  }

  root.ILSimple = { resolveMode: resolveMode, countdownWords: countdownWords, etDateKey: etDateKey, pickVariant: pickVariant,
    tagsMatch: tagsMatch, timedText: timedText, nextUpText: nextUpText, mountTop: mountTop, mountSimple: mountSimple };
})(typeof window !== 'undefined' ? window : this);
