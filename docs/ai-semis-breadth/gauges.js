





(function () {
  'use strict';
  function start() {
    var sec = document.getElementById('gauges');
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
    var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF', light: '#8EC0FA' };
    var GC = { amber: '#E8A33D', yel: '#FFD84D', green: '#26A69A', orange: '#F0883E', red: '#EF5350', blue: '#3987E5', light: '#8EC0FA',
      bar: '#3A3F52', grey: '#8A8E99', ink: '#131722', dim: '#5D6270' };
    var CHIP_C = { amber: GC.amber, grey: GC.grey, green: GC.green, dim: GC.dim, yel: GC.yel, orange: GC.orange };
    var THR_C = { ARMED: GC.yel, FIRED: GC.green, IDLE: GC.grey };
    var FONT = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'sans-serif';
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var NS = 'http://www.w3.org/2000/svg';
    var HOVER = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
    var NA_DRAW = 'Not available in this build (the data looked broken).';
    var HZ = ['1', '3', '6'];

    var doc = null, G = null, gkey = null, DN = [], GZS = { thin: null, thrust: null }, GZW = 0, uid = 0, hz = '3', tz = '4M', FSX = false, fsY = 0;
    var TV = null, TG = null;


    var TZ = ['4M', '1Y', '3Y', '5Y', '10Y', 'All'], TZ_MO = { '1Y': 12, '3Y': 36, '5Y': 60, '10Y': 120, 'All': 0 };
    var TZ_WORD = { '4M': 'last 4 months', '1Y': 'last year', '3Y': 'last 3 years', '5Y': 'last 5 years', '10Y': 'last 10 years' };


    function $(id) { return document.getElementById(id); }
    function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
    function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = text; return s; }
    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    var mctx = document.createElement('canvas').getContext('2d');
    function textW(str, size, weight) { mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; return mctx.measureText(str).width; }
    function tx(parent, x, y, str, attrs) {
      var a = attrs || {}; a.x = x; a.y = y;
      if (!a['font-family']) a['font-family'] = FONT;
      var t = el('text', a, parent); t.textContent = str; return t;
    }
    var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
    function withHalo(a) { for (var k in HALO) a[k] = HALO[k]; return a; }
    function lin(d0, d1, r0, r1) {
      var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
      f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
      return f;
    }
    function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
    function dnDate(dn) { return new Date(dn * 864e5); }
    function fmtDay(dn, withYear, withWd) {
      var d = dnDate(dn);
      return (withWd ? WD[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (withYear ? ', ' + d.getUTCFullYear() : '');
    }
    function gzDay(iso, yr) { return fmtDay(dayNum(iso), !!yr); }
    function pct1(v) { return v.toFixed(1) + '%'; }
    function sgn(x, dp) { return x == null ? '–' : (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(dp == null ? 1 : dp) + '%'; }
    function bsearchLE(arr, x) { var lo = 0, hi = arr.length - 1, ans = -1; while (lo <= hi) { var m = (lo + hi) >> 1; if (arr[m] <= x) { ans = m; lo = m + 1; } else hi = m - 1; } return ans; }
    function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
    function gzNum(v) { return typeof v === 'number' && isFinite(v); }
    function decimate(xs, vs, i0, i1, X) {
      var px = [], pv = [], i;
      if (i1 < i0) return { px: px, pv: pv };
      if (i1 - i0 + 1 <= 2 * (Math.abs(X(xs[i1]) - X(xs[i0])) + 1)) {
        for (i = i0; i <= i1; i++) if (vs[i] != null) { px.push(X(xs[i])); pv.push(vs[i]); }
        return { px: px, pv: pv };
      }
      var col = null, a, lo, hi, z;
      function flush() {
        var ids = [a, lo, hi, z].sort(function (p, q) { return p - q; });
        for (var j = 0; j < ids.length; j++) if (j === 0 || ids[j] !== ids[j - 1]) { px.push(X(xs[ids[j]])); pv.push(vs[ids[j]]); }
      }
      for (i = i0; i <= i1; i++) {
        if (vs[i] == null) continue;
        var c = Math.floor(X(xs[i]));
        if (c !== col) { if (col !== null) flush(); col = c; a = lo = hi = z = i; }
        else { z = i; if (vs[i] < vs[lo]) lo = i; if (vs[i] > vs[hi]) hi = i; }
      }
      if (col !== null) flush();
      return { px: px, pv: pv };
    }
    function pathOf(P, Y) { var s = ''; for (var i = 0; i < P.px.length; i++) s += (i ? 'L' : 'M') + P.px[i].toFixed(1) + ' ' + Y(P.pv[i]).toFixed(1); return s; }
    function svgFor(holder, W, H) {
      var svg = holder.firstElementChild;
      if (!svg || svg.tagName.toLowerCase() !== 'svg') { clear(holder); svg = el('svg', {}, holder); }
      else clear(svg);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
      return svg;
    }
    function gzClip(svg, x, y, w, h) {
      var id = 'gzc' + (++uid), defs = svg.querySelector('defs') || el('defs', {}, svg);
      var cp = el('clipPath', { id: id }, defs); el('rect', { x: x, y: y, width: w, height: h }, cp);
      return 'url(#' + id + ')';
    }
    function yTicks(g, Y, ticks, xR, xL, fmt) {
      ticks.forEach(function (v) {
        var py = Y(v);
        el('line', { x1: xL, x2: xR, y1: py, y2: py, stroke: C.line, 'stroke-width': 1, opacity: 0.7 }, g);
        var lab = fmt(v);
        if (lab != null) tx(g, xL - 5, py + 3.5, lab, { fill: C.muted, 'font-size': 11, 'text-anchor': 'end' });
      });
    }
    function niceStep(span, target) {
      var raw = span / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), steps = [1, 2, 2.5, 5, 10];
      for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= raw) return steps[i] * mag;
      return 10 * mag;
    }
    function nowDot(g, x, y, r) {
      el('circle', { cx: x, cy: y, r: r + 5, fill: C.light, 'fill-opacity': 0.16, stroke: C.light, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
      el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: C.light, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
      el('circle', { cx: x, cy: y, r: r, fill: '#EEF5FF', stroke: '#fff', 'stroke-width': 1.4 }, g);
    }
    function nowBox(x, y, r) { return { x: x - r - 6, y: y - r - 6, w: 2 * r + 12, h: 2 * r + 12 }; }
    function priceName(P) { return (doc && doc.meta && doc.meta.price_head && doc.meta.price_head[P]) || P; }
    function priceWord(P) { return (doc && doc.meta && doc.meta.price_word && doc.meta.price_word[P]) || (P === 'BASKET' ? 'the basket' : P); }
    function dayOf(j) { return DN[G.start_i + j]; }


    function cardHtml(id, title, thrust) {
      var tzrow = thrust ? '<div class="gz-tzrow"><div class="seg gz-tz" data-g="tz" role="group" aria-label="Time window">' +
          TZ.map(function (k) { return '<button type="button" data-gzt="' + k + '" aria-pressed="' + (k === tz) + '">' + k + '</button>'; }).join('') +
          '</div><span class="zb-btns gz-zb"><button type="button" data-gzz="out" aria-label="Zoom out: a longer window">−</button>' +
          '<button type="button" data-gzz="in" aria-label="Zoom in: a shorter window">+</button></span></div>' : '';
      var fsbar = thrust ? '<div class="gz-fsbar"><p class="gz-fstitle" data-g="fstitle"></p>' +
          '<button type="button" class="gz-fsx" data-gzfs="close" aria-label="Close full screen">✕</button></div>' : '';
      var right = '<div class="gz-right">' + fsbar + '<p class="gz-ct" data-g="ct"></p>' + tzrow + '<div class="gz-ro" data-g="ro" aria-live="polite"></div>' +
        '<div class="gz-chart" data-g="chart" role="img"></div>' + (thrust ? '<p class="gz-fshint" data-g="fshint"></p>' : '') +
        (thrust ? '<p class="gz-ct gz-ct2" data-g="ct2"></p>' +
          '<div class="seg gz-hz" data-g="hz" role="group" aria-label="Months after each thrust">' +
          '<button type="button" data-gzh="1" aria-pressed="false">1 mo</button><button type="button" data-gzh="3" aria-pressed="true">3 mo</button>' +
          '<button type="button" data-gzh="6" aria-pressed="false">6 mo</button></div>' +
          '<div class="gz-ro" data-g="ro2" aria-live="polite"></div><div class="gz-chart" data-g="chart2" role="img"></div>' : '') + '</div>';
      var left = thrust
        ? '<div class="gz-left"><div class="gz-hero"><span class="gz-big" data-g="big"></span><span class="gz-unit" data-g="unit"></span></div>' +
          '<p class="gz-line" data-g="l1"></p><p class="gz-line" data-g="l2"></p>' +
          '<div class="gz-prog" aria-hidden="true"><div class="gz-pfill" data-g="pfill"></div></div>' +
          '<div class="gz-plabs"><span class="gz-parm" data-g="parm"></span><span class="gz-pfire" data-g="pfire"></span></div>' +
          '<p class="gz-states" data-g="states"></p></div>'
        : '<div class="gz-left"><div class="gz-hero"><span class="gz-big" data-g="big"></span><span class="gz-unit" data-g="unit"></span></div>' +
          '<p class="gz-line" data-g="l1"></p><p class="gz-line" data-g="l2"></p><p class="gz-cap" data-g="cap"></p>' +
          '<div class="gz-mini" data-g="mini" role="img"></div></div>';
      return '<article class="gz" id="' + id + '" aria-labelledby="' + id + 'T">' +
        '<div class="gz-head"><div class="gz-ttl"><h3 id="' + id + 'T">' + title + '</h3><p class="gz-sub" data-g="sub"></p></div>' +
        '<div class="gz-side"><span class="gz-chip" data-g="chip" hidden></span><span class="gz-tag" data-g="tag"></span></div></div>' +
        '<p class="gz-asof" data-g="asof"></p><p class="gz-na" data-g="na" hidden></p>' +
        '<div class="gz-body" data-g="body" hidden>' + left + right + '</div>' +
        '<div class="box gz-box" data-g="box" hidden><div class="box-row"><b>How to read it</b><span data-g="how"></span></div>' +
        '<div class="box-row"><b>Right now</b><span data-g="now"></span></div></div>' +
        '<p class="src gz-src" data-g="src" hidden></p></article>';
    }
    if (!sec.getAttribute('aria-labelledby')) sec.setAttribute('aria-labelledby', 'tg');
    sec.innerHTML = '<div class="card-head"><div class="card-title"><h2 id="tg">Risk gauges</h2>' +
      '<p class="sub" id="gzSecSub">Loading the gauges…</p></div></div>' +
      '<p class="banner banner-warn" id="gzErr" hidden></p>' +
      cardHtml('gzThin', 'Thin rally check', false) + cardHtml('gzThrust', 'Thrust tracker', true);

    function gzQ(card, k) { return $(card).querySelector('[data-g="' + k + '"]'); }


    function thrustFs(on, fromPop) {
      var right = $('gzThrust').querySelector('.gz-right');
      if (!right || on === FSX) return;
      FSX = on;
      if (on) {
        fsY = window.pageYOffset || 0;
        right.classList.add('gz-fs'); document.documentElement.classList.add('gz-fs-open');
        right.setAttribute('role', 'dialog'); right.setAttribute('aria-modal', 'true'); right.setAttribute('aria-label', 'Thrust tracker, full screen');
        try { history.pushState({ gzfs: 1 }, ''); } catch (e) { }
        var x = right.querySelector('[data-gzfs]'); if (x) { try { x.focus({ preventScroll: true }); } catch (e) { } }
      } else {
        right.classList.remove('gz-fs'); document.documentElement.classList.remove('gz-fs-open');
        right.removeAttribute('role'); right.removeAttribute('aria-modal'); right.removeAttribute('aria-label');
        if (!fromPop && history.state && history.state.gzfs) { try { history.back(); } catch (e) { } }
        window.scrollTo(0, fsY);
      }
      var S = GZS.thrust;
      if (S && S.ok) { try { thrustCt(S.T); } catch (e) { } }
      requestAnimationFrame(function () { var S2 = GZS.thrust; if (S2 && S2.ok) { try { drawThrustLine(S2.T); } catch (e) { } } });
    }
    (function () {



      var holder = $('gzThrust').querySelector('[data-g="chart"]'), lastType = 'mouse', lastTap = null, ptrs = {}, gs = null, rq = false, g0 = null;
      function curT() { var S = GZS.thrust; return S && S.ok ? S.T : null; }
      function redraw() {
        if (rq) return; rq = true;
        requestAnimationFrame(function () { rq = false; var T = curT(); if (T) { try { drawThrustLine(T); thrustCt(T); } catch (e) { } } });
      }
      function pxOf(cx) { var svg = holder.firstElementChild, r = svg && svg.getBoundingClientRect(); return r && r.width ? (cx - r.left) * TG.W / r.width : 0; }
      function setView(a, b) { var T = curT(); if (!T || !TG) return; TV = clampView(a, b, T); redraw(); }
      function zoomAround(px, f) {
        var fr = Math.max(0, Math.min(1, (px - TG.L) / TG.pw)), k = TG.a + fr * (TG.b - TG.a), s = (TG.b - TG.a) * f;
        setView(k - fr * s, k - fr * s + s);
      }
      function ids() { return Object.keys(ptrs); }
      holder.addEventListener('pointerdown', function (e) {
        lastType = e.pointerType;
        if ((e.pointerType === 'mouse' && e.button !== 0) || !TG) return;
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now() };
        var I = ids();
        if (I.length === 2) {
          var p = ptrs[I[0]], q = ptrs[I[1]], mid = pxOf((p.x + q.x) / 2), fr = Math.max(0, Math.min(1, (mid - TG.L) / TG.pw));
          gs = { mode: 'pinch', d0: Math.max(24, Math.hypot(p.x - q.x, p.y - q.y)), a: TG.a, b: TG.b, k: TG.a + fr * (TG.b - TG.a) };
        } else if (I.length === 1) gs = { mode: 'pending', a: TG.a, b: TG.b, sx: e.clientX, sy: e.clientY };
      });
      holder.addEventListener('pointermove', function (e) {
        var p = ptrs[e.pointerId];
        if (!p || !gs || !TG) return;
        p.x = e.clientX; p.y = e.clientY;
        var I = ids();
        if (gs.mode === 'pinch' && I.length >= 2) {
          var a1 = ptrs[I[0]], b1 = ptrs[I[1]], d = Math.max(24, Math.hypot(a1.x - b1.x, a1.y - b1.y));
          var s = (gs.b - gs.a) * gs.d0 / d, fr = Math.max(0, Math.min(1, (pxOf((a1.x + b1.x) / 2) - TG.L) / TG.pw));
          setView(gs.k - fr * s, gs.k - fr * s + s);
          return;
        }
        if (gs.mode === 'pending') {
          var dx = e.clientX - gs.sx, dy = e.clientY - gs.sy, slop = e.pointerType === 'mouse' ? 3 : 7;
          if (Math.abs(dx) < slop && Math.abs(dy) < slop) return;
          if (e.pointerType !== 'mouse' && Math.abs(dy) > Math.abs(dx)) { gs.mode = 'none'; return; }
          gs.mode = 'pan'; gs.px0 = pxOf(gs.sx); holder.classList.add('dragging');
          try { holder.setPointerCapture(e.pointerId); } catch (er) { }
        }
        if (gs.mode === 'pan') {
          var sh = (pxOf(e.clientX) - gs.px0) / TG.pw * (gs.b - gs.a);
          setView(gs.a - sh, gs.b - sh);
        }
      });
      function end(e, cancelled) {
        var p = ptrs[e.pointerId];
        if (!p) return;
        delete ptrs[e.pointerId];
        var I = ids();
        if (!cancelled && gs && gs.mode === 'pending' && e.pointerType !== 'mouse' && performance.now() - p.t < 600) {
          var t = performance.now();
          if (lastTap && t - lastTap.t < 350 && Math.abs(e.clientX - lastTap.x) < 30 && Math.abs(e.clientY - lastTap.y) < 30) { lastTap = null; thrustFs(!FSX); }
          else lastTap = { t: t, x: e.clientX, y: e.clientY };
        }
        if (I.length === 1 && gs && gs.mode === 'pinch' && TG) {
          var q = ptrs[I[0]];
          gs = { mode: 'pan', a: TG.a, b: TG.b, sx: q.x, sy: q.y, px0: pxOf(q.x) };
        } else if (!I.length) { gs = null; holder.classList.remove('dragging'); }
      }
      holder.addEventListener('pointerup', function (e) { end(e, false); });
      holder.addEventListener('pointercancel', function (e) { end(e, true); });

      holder.addEventListener('dblclick', function (e) { if (lastType === 'mouse') { e.preventDefault(); thrustFs(!FSX); } });
      holder.addEventListener('wheel', function (e) {
        if (!TG) return;
        var px = pxOf(e.clientX);
        if (px < TG.L || px > TG.L + TG.pw) return;
        var k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1, dx = e.deltaX * k, dy = e.deltaY * k;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          zoomAround(px, Math.exp(Math.max(-0.4, Math.min(0.4, dy * 0.01))));
        } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 1) {
          e.preventDefault();
          var sh = dx / TG.pw * (TG.b - TG.a);
          setView(TG.a + sh, TG.b + sh);
        }
      }, { passive: false });

      holder.addEventListener('gesturestart', function (e) { e.preventDefault(); if (TG && ids().length < 2) g0 = { a: TG.a, b: TG.b, px: pxOf(e.clientX) }; });
      holder.addEventListener('gesturechange', function (e) {
        e.preventDefault();
        if (!g0 || !TG || ids().length >= 2) return;
        var fr = Math.max(0, Math.min(1, (g0.px - TG.L) / TG.pw)), k = g0.a + fr * (g0.b - g0.a), s = (g0.b - g0.a) / Math.max(0.05, e.scale || 1);
        setView(k - fr * s, k - fr * s + s);
      });
      holder.addEventListener('gestureend', function (e) { e.preventDefault(); g0 = null; });
      document.addEventListener('keydown', function (e) { if (FSX && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); thrustFs(false); } });
      window.addEventListener('popstate', function () { if (FSX) thrustFs(false, true); });
      window.addEventListener('resize', function () {
        if (!FSX) return;
        requestAnimationFrame(function () { var S = GZS.thrust; if (S && S.ok) { try { drawThrustLine(S.T); } catch (e) { } } });
      });
    })();
    function gzText(card, k, s) { var n = gzQ(card, k); if (n) n.textContent = s == null ? '' : s; return n; }
    function gzTexts(card, X, keys) { keys.forEach(function (k) { gzText(card, k, X[k]); }); }
    function gzParts(node, parts) { clear(node); parts.forEach(function (p) { if (p && p[1]) node.appendChild(span(p[0], p[1])); }); }
    function gzChip(card, word, color) {
      var c = gzQ(card, 'chip'); c.textContent = word; c.style.background = color; c.style.color = color === GC.dim ? C.white : ''; c.hidden = false;
    }
    function gzShow(card, ok, msg) {
      ['body', 'box', 'src'].forEach(function (k) { var n = gzQ(card, k); if (n) n.hidden = !ok; });
      var na = gzQ(card, 'na'); na.hidden = ok; na.textContent = ok ? '' : msg;
      if (!ok) { gzQ(card, 'chip').hidden = true; gzText(card, 'asof', ''); }
    }
    function inRuns(runs, j) { for (var k = 0; k < runs.length; k++) if (j >= runs[k][0] && j <= runs[k][1]) return true; return false; }
    function gzPhone() { return !(window.matchMedia && matchMedia('(min-width: 900px)').matches); }
    function gzNearest(dn, i0, i1, vs) {
      var xs = DN, j = bsearchLE(xs, dn) - G.start_i;
      if (j < i0) j = i0; if (j > i1) j = i1;
      if (j < i1 && Math.abs(dayOf(j + 1) - dn) < Math.abs(dayOf(j) - dn)) j++;
      while (j > i0 && !gzNum(vs[j])) j--;
      return gzNum(vs[j]) ? j : null;
    }
    function gzYears(g, X, x0, x1, xmin, xmax, y, ph) {
      var y0 = dnDate(x0).getUTCFullYear(), y1 = dnDate(x1).getUTCFullYear(), ppy = (X(x1) - X(x0)) / Math.max(1, (x1 - x0) / 365.25);
      var steps = [1, 2, 3, 4, 5, 10], st = 10;
      for (var k = 0; k < steps.length; k++) { var w = textW(ph || steps[k] > 2 ? '’00' : '2000', 11) + 14; if (ppy * steps[k] >= w) { st = steps[k]; break; } }
      var short = ph || st > 2, lastR = -1e9;
      for (var yy = y0; yy <= y1; yy++) {
        if (yy % st) continue;
        var dn = Date.UTC(yy, 0, 1) / 864e5;
        if (dn < x0 - 10) continue;
        var x = X(Math.max(dn, x0)), lab = short ? '’' + String(yy).slice(2) : String(yy), lw = textW(lab, 11);
        if (x - lw / 2 < xmin - 6 || x + lw / 2 > xmax + 4 || x - lw / 2 < lastR + 6) continue;
        tx(g, x, y, lab, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' }); lastR = x + lw / 2;
      }
    }

    function gzHover(holder, ro, M) {
      holder._gz = M;
      gzParts(ro, M.rest());
      if (holder._gzOn) return;
      holder._gzOn = true;
      function at(ev) {
        var M = holder._gz, svg = holder.firstElementChild;
        if (!M || !svg) return;
        var r = svg.getBoundingClientRect(); if (!r.width) return;
        var j = M.pick((ev.clientX - r.left) * M.W / r.width);
        if (j == null) { reset(); return; }
        try { M.mark(j); gzParts(ro, M.text(j)); } catch (e) { reset(); }
      }
      function reset() { var M = holder._gz; if (!M) return; M.mark(null); gzParts(ro, M.rest()); }
      holder.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'mouse') at(ev); });
      holder.addEventListener('pointerdown', function (ev) { if (ev.pointerType !== 'mouse') at(ev); });
      holder.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') reset(); });
    }


    function thinText(T) {
      var c = 'gzThin';
      gzChip(c, T.state, CHIP_C[T.chip] || GC.grey);
      gzTexts(c, T, ['sub', 'asof', 'big', 'unit', 'l1', 'l2', 'cap', 'ct', 'how', 'now', 'src']);
      gzText(c, 'tag', priceName(T.price) + ' · since ' + dnDate(dayOf(0)).getUTCFullYear());
      gzQ(c, 'mini').setAttribute('aria-label', 'Share of days with ' + priceName(T.price) + ' near its 52-week high followed by a big drop, by breadth band, since 2013 and since 2021');
      gzQ(c, 'chart').setAttribute('aria-label', priceName(T.price) + ' since ' + dnDate(dayOf(0)).getUTCFullYear() + ' on a log scale with the start of each big drop and the thin-rally days');
    }
    function drawThinBars(T) {
      var holder = gzQ('gzThin', 'mini'), W = Math.max(240, Math.round(holder.clientWidth)), ph = gzPhone(), B = T.bars, cur = T.cur, near = !!T.near;
      var pv = function (b) { return gzNum(b.pct) ? b.pct : 0; };
      var hiP = Math.max(40, Math.max.apply(null, B.map(pv)) * 1.08), col = [GC.amber, GC.grey, GC.green], svg, g;
      var has21 = B.some(function (b) { return b.pct21 != null; });
      function barFill(k) { return k === cur && near ? col[Math.min(k, 2)] : GC.bar; }
      function lab(b) { return gzNum(b.pct) ? Math.round(b.pct) + '%' : '–'; }
      function since21(b) { return b.pct21 != null ? 'since 2021: ' + Math.round(b.pct21) + '%' : (b.days21 === 0 ? 'since 2021: no days' : ''); }
      if (ph) {
        var rowH = has21 ? 42 : 30, lw = 74, H = B.length * rowH + 4;
        svg = svgFor(holder, W, H); g = el('g', {}, svg);
        var tagW = textW('37%', 13, 700) + 6 + textW(near ? '← now' : '← breadth now', 11.5) + 4, bw = W - lw - 8 - tagW;
        B.forEach(function (b, k) {
          var y = 4 + k * rowH, w = Math.max(2, pv(b) / hiP * bw), on = k === cur;
          tx(g, lw, y + 16, b.label, { fill: on ? C.white : C.muted, 'font-size': 12, 'text-anchor': 'end', 'font-weight': on ? 600 : 400 });
          var r = el('rect', { x: lw + 8, y: y + 3, width: w.toFixed(1), height: 18, rx: 2, fill: barFill(k) }, g);
          if (on && !near) { r.setAttribute('stroke', col[Math.min(k, 2)]); r.setAttribute('stroke-dasharray', '3 3'); }
          tx(g, lw + 8 + w + 6, y + 17, lab(b), { fill: C.white, 'font-size': 13, 'font-weight': 700 });
          if (on) tx(g, lw + 8 + w + 6 + textW(lab(b), 13, 700) + 6, y + 17, near ? '← now' : '← breadth now', { fill: near ? col[Math.min(k, 2)] : C.muted, 'font-size': 11.5 });
          var s21 = since21(b); if (s21) tx(g, lw + 8, y + 35, s21, { fill: C.muted, 'font-size': 11 });
          var t = el('title', {}, r); t.textContent = b.tip || '';
        });
        return;
      }
      var H2 = has21 ? 166 : 150, base = H2 - (has21 ? 40 : 24), top = 34, slot = W / B.length, bwd = Math.min(92, slot - 26);
      svg = svgFor(holder, W, H2); g = el('g', {}, svg);
      B.forEach(function (b, k) {
        var cx = slot * (k + 0.5), h = Math.max(2, pv(b) / hiP * (base - top)), on = k === cur;
        var r = el('rect', { x: (cx - bwd / 2).toFixed(1), y: (base - h).toFixed(1), width: bwd.toFixed(1), height: h.toFixed(1), rx: 2, fill: barFill(k) }, g);
        if (on && !near) { r.setAttribute('stroke', col[Math.min(k, 2)]); r.setAttribute('stroke-dasharray', '3 3'); }
        var t = el('title', {}, r); t.textContent = b.tip || '';
        tx(g, cx, base - h - 6, lab(b), { fill: C.white, 'font-size': 15, 'font-weight': 700, 'text-anchor': 'middle' });
        if (on) tx(g, cx, base - h - 25, near ? 'now' : 'breadth now', { fill: near ? col[Math.min(k, 2)] : C.muted, 'font-size': 12, 'text-anchor': 'middle' });
        tx(g, cx, base + 17, b.label, { fill: on ? C.white : C.muted, 'font-size': 12.5, 'text-anchor': 'middle', 'font-weight': on ? 600 : 400 });
        var s21 = since21(b); if (s21) tx(g, cx, base + 33, s21, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
      });
    }
    function drawThinChart(T) {
      var holder = gzQ('gzThin', 'chart'), W = Math.max(260, Math.round(holder.clientWidth)), ph = W < 520;
      var q = G.prices[T.price], i0 = T.q_i0, i1 = T.q_i1, i;
      if (!q || i1 == null || i1 < 0 || i0 == null || i1 <= i0) {
        clear(holder); holder._gz = null;
        gzParts(gzQ('gzThin', 'ro'), [['m', priceName(T.price) + ' prices are missing in this update, so the chart is not drawn.']]);
        return;
      }
      var L = ph ? 32 : 42, R = 6, top = 8, plotH = ph ? 196 : 292, stripH = ph ? 8 : 12, stripY = top + plotH + 8, H = stripY + stripH + 22, pw = W - L - R;
      var lo = Infinity, hi = -Infinity;
      for (i = i0; i <= i1; i++) if (gzNum(q[i]) && q[i] > 0) { lo = Math.min(lo, q[i]); hi = Math.max(hi, q[i]); }
      var xs = []; for (i = 0; i < q.length; i++) xs.push(dayOf(i));
      var svg = svgFor(holder, W, H), g = el('g', {}, svg), X = lin(xs[i0], xs[i1], L, L + pw);
      var ly = lin(Math.log(lo * 0.92), Math.log(hi * 1.06), top + plotH, top), Y = function (v) { return ly(Math.log(v)); };
      var cand = ph ? [1, 3, 6, 10, 30, 60, 100, 300, 600, 1000, 3000, 6000, 10000]
        : [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 60, 80, 100, 150, 200, 300, 400, 600, 800, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 10000], yt = [], lastPy = Infinity;
      cand.forEach(function (v) { if (v < lo * 0.92 || v > hi * 1.06) return; var py = Y(v); if (lastPy - py >= (ph ? 34 : 30)) { yt.push(v); lastPy = py; } });
      yTicks(g, Y, yt, L + pw, L, function (v) { return String(v); });
      gzYears(g, X, xs[i0], xs[i1], L, L + pw, H - 6, ph);

      el('rect', { x: L, y: stripY, width: pw, height: stripH, fill: C.line, rx: 1 }, g);
      var px = [];
      T.runs.forEach(function (r) {
        var x0 = X(xs[r[0]]) - 0.6, x1 = X(xs[r[1]]) + 0.6;
        if (x1 - x0 < 1.6) { var mid = (x0 + x1) / 2; x0 = mid - 0.8; x1 = mid + 0.8; }
        var p = px[px.length - 1];
        if (p && x0 - p[1] < 1) p[1] = Math.max(p[1], x1); else px.push([x0, x1]);
      });
      px.forEach(function (p) { el('rect', { x: Math.max(L, p[0]).toFixed(1), y: stripY, width: Math.max(1.2, Math.min(L + pw, p[1]) - Math.max(L, p[0])).toFixed(1), height: stripH, fill: GC.amber }, g); });
      if (!ph) tx(g, L - 4, stripY + stripH - 1, 'thin', { fill: GC.amber, 'font-size': 11, 'text-anchor': 'end' });
      var clip = gzClip(svg, L, top - 6, pw + 6, plotH + 12);
      el('path', { d: pathOf(decimate(xs, q, i0, i1, X), Y), fill: 'none', stroke: C.text, 'stroke-width': ph ? 0.9 : 1.1, 'stroke-linejoin': 'round', 'clip-path': clip }, g);
      var dg = el('g', {}, g), rr = ph ? 2.7 : 3.6;
      T.drops.forEach(function (k) {
        if (k < i0 || k > i1 || !gzNum(q[k])) return;
        el('circle', { cx: X(xs[k]).toFixed(1), cy: Y(q[k]).toFixed(1), r: rr, fill: GC.red, stroke: C.panel, 'stroke-width': 1.2 }, dg);
      });
      if (gzNum(q[i1])) nowDot(g, X(xs[i1]), Y(q[i1]), ph ? 3.2 : 4);
      var cross = el('g', { 'pointer-events': 'none' }, svg);
      gzHover(holder, gzQ('gzThin', 'ro'), {
        W: W, cross: cross,
        pick: function (x) { return gzNearest(X.inv(x), i0, i1, q); },
        mark: function (j) {
          clear(cross); if (j == null) return;
          var x = X(xs[j]);
          el('line', { x1: x, x2: x, y1: top, y2: stripY + stripH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, cross);
          el('circle', { cx: x, cy: Y(q[j]), r: 3.4, fill: 'none', stroke: C.white, 'stroke-width': 1.5 }, cross);
        },
        text: function (j) { return thinRo(T, q, j); }, rest: function () { return thinRo(T, q, i1); }
      });
    }
    function thinRo(T, q, j) {
      var f = G.v.v200, p = [['d', fmtDay(dayOf(j), true)], ['', ' · ' + priceName(T.price) + ' '], ['v', gzNum(q[j]) ? q[j].toFixed(2) : '–']];
      if (gzNum(f[j])) {
        var off = T.off52 ? T.off52[j] : null;
        p.push(['', ' · ' + (f[j] / 100).toFixed(1) + '% above 200-day' + (off != null ? ' · ' + off.toFixed(1) + '% below 52-week high' : '')]);
      }
      if (inRuns(T.runs, j)) p.push(['a', ' · thin-rally day']);
      if (T.drops.indexOf(j) >= 0) p.push(['r', ' · start of a big drop']);
      return p;
    }


    function thrustText(T) {
      var c = 'gzThrust', col = THR_C[T.state] || GC.grey;
      gzChip(c, T.state + (T.provisional ? ' · SO FAR' : ''), CHIP_C[T.chip] || col);
      gzTexts(c, T, ['sub', 'asof', 'big', 'unit', 'l1', 'l2', 'now']);
      gzText(c, 'tag', priceName(T.price) + ' · since ' + dnDate(dayOf(0)).getUTCFullYear());
      var pf = gzQ(c, 'pfill'), fr = Math.max(0, Math.min(1, +T.progress || 0));
      pf.style.width = Math.max(1.2, fr * 100).toFixed(1) + '%';
      pf.style.background = col;
      gzText(c, 'parm', T.parm); gzText(c, 'pfire', T.pfire);
      gzParts(gzQ(c, 'states'), [['', 'States: '], [T.state === 'IDLE' ? 'on' : '', 'IDLE'], ['', '  ·  '], [T.state === 'ARMED' ? 'on' : '', 'ARMED (clock running)'],
        ['', '  ·  '], [T.state === 'FIRED' ? 'on' : '', 'FIRED (hit the fire line in time)']]);
      Array.prototype.forEach.call(gzQ(c, 'states').querySelectorAll('.on'), function (n) { n.style.color = T.state === 'IDLE' ? C.text : col; });
      gzTexts(c, T, ['ct2', 'how', 'src']);
      thrustCt(T);
      gzQ(c, 'chart2').setAttribute('aria-label', priceName(T.price) + ' return after each past thrust');
      renderHz();
    }
    function monY(dn) { var d = dnDate(dn); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
    function tzWord() {
      if (TV && TG && G) {
        var T0 = GZS.thrust && GZS.thrust.T, n0 = T0 ? T0.i_n : 0, a = Math.max(0, Math.ceil(TG.a)), b = Math.min(n0, Math.floor(TG.b));
        return monY(dayOf(a)) + ' – ' + monY(dayOf(Math.max(a, b)));
      }
      return tz === 'All' ? 'since ' + dnDate(dayOf(0)).getUTCFullYear() : TZ_WORD[tz];
    }

    function chipSpan(T) {
      var n = T.i_n, r = G.v.v50, iA = T.i_a;
      if (tz !== '4M') {
        var mo = TZ_MO[tz], de = dnDate(dayOf(n)), s0 = mo ? Date.UTC(de.getUTCFullYear(), de.getUTCMonth() - mo, de.getUTCDate()) / 864e5 : -1e9;
        for (iA = 0; iA < n && (dayOf(iA) < s0 || !gzNum(r[iA])); iA++);
      }
      return { a: iA, b: T.i_b + (T.i_b === n ? 0.5 : 0) };
    }

    function clampView(a, b, T) {
      var r = G.v.v50, lo = 0, hi = T.i_b + (T.i_b === T.i_n ? 0.5 : 0);
      while (lo < T.i_n && !gzNum(r[lo])) lo++;
      var s = Math.max(15, Math.min(hi - lo, b - a));
      if (a < lo) a = lo;
      b = a + s;
      if (b > hi) { b = hi; a = b - s; }
      return { a: a, b: b };
    }
    function thrustCt(T) {
      var w = tzWord(), touch = window.matchMedia && matchMedia('(hover: none)').matches;
      var zh = touch ? 'Pinch to zoom · drag sideways to move' : 'Pinch or ' + (/Mac|iP(hone|ad|od)/.test(navigator.platform || '') ? '⌘' : 'Ctrl') + '-scroll to zoom · drag to move';
      gzText('gzThrust', 'fshint', zh + ' · ' + (FSX ? (touch ? 'double-tap or ✕ to close' : 'double-click, ✕ or Esc to close')
        : (touch ? 'double-tap for full screen' : 'double-click for full screen')));
      gzText('gzThrust', 'fstitle', 'Thrust tracker · ' + (G.name || G.short || ''));
      gzText('gzThrust', 'ct', tz === '4M' ? T.ct : String(T.ct || '').replace('last 4 months', w));
      gzQ('gzThrust', 'chart').setAttribute('aria-label', G.words + ': percent above the 50-day average, the ' + w.replace(/^last /, 'last ') +
        ', with the arm and fire lines' + (tz === '4M' ? '' : ' and every past thrust'));
      Array.prototype.forEach.call(sec.querySelectorAll('[data-gzt]'), function (b) { b.setAttribute('aria-pressed', String(!TV && b.getAttribute('data-gzt') === tz)); });
      var k = TZ.indexOf(tz), zi = sec.querySelector('[data-gzz="in"]'), zo = sec.querySelector('[data-gzz="out"]');
      if (zi) zi.disabled = !TV && k <= 0;
      if (zo) zo.disabled = !TV && k >= TZ.length - 1;
    }
    function renderHz() {
      Array.prototype.forEach.call(sec.querySelectorAll('[data-gzh]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-gzh') === hz)); });
    }
    function thrustCal(T, i) { return i <= T.i_n ? doc.days[G.start_i + i] : T.axis[i - T.i_n - 1]; }
    function drawThrustLine(T) {
      var holder = gzQ('gzThrust', 'chart'), W = Math.max(260, Math.round(holder.clientWidth)), ph = W < 520;
      var L = 26, R = 6, sTop = 8, sH = ph ? 58 : 72, top = sTop + sH + 12, plotH = ph ? 150 : 168, H = top + plotH + 24, pw = W - L - R,
        r = G.v.v50, n = T.i_n, i, pr = (G.prices && G.prices[T.price]) || [];
      if (FSX) {
        var avail = Math.max(300, Math.round(window.innerHeight - holder.getBoundingClientRect().top - 40));
        sH = Math.round(avail * 0.3); top = sTop + sH + 14; plotH = Math.max(150, avail - top - 24); H = top + plotH + 24;
      }
      var lo = T.y[0], hi = T.y[1], lineY = {}, wide = tz !== '4M' || !!TV, tks = T.ticks;
      var vw = TV ? clampView(TV.a, TV.b, T) : chipSpan(T), va = vw.a, vb = vw.b;
      var iA = Math.max(0, Math.floor(va)), iB = Math.min(T.i_b, Math.ceil(vb)), iE = Math.min(n, iB);
      T.lines.forEach(function (o) { lineY[o[1]] = o[0]; });
      if (wide) {
        var mn = 1e9, mx = -1e9;
        for (i = iA; i <= iE; i++) if (gzNum(r[i])) { mn = Math.min(mn, r[i] / 100); mx = Math.max(mx, r[i] / 100); }
        T.lines.forEach(function (o) { mn = Math.min(mn, o[0]); mx = Math.max(mx, o[0]); });
        lo = Math.max(0, Math.floor((mn - 4) / 10) * 10); hi = Math.min(100, Math.ceil((mx + 4) / 10) * 10);
        tks = [0, 50, 100].filter(function (v) { return v >= lo && v <= hi; });
      }
      var svg = svgFor(holder, W, H), g = el('g', {}, svg), X = lin(va, vb, L, L + pw), Y = lin(lo, hi, top + plotH, top);
      TG = { W: W, L: L, pw: pw, a: va, b: vb };
      var gS = el('g', { 'clip-path': gzClip(svg, L, sTop, pw, sH) }, g), gP = el('g', { 'clip-path': gzClip(svg, L, top - 6, pw, plotH + 12) }, g);
      var lab = {}, yt = tks.slice();
      if (tks.length >= 2) tks.forEach(function (v) { lab[v] = 1; });
      T.lines.forEach(function (o) { yt.push(o[0]); });
      yt.sort(function (a, b) { return a - b; });
      yTicks(g, Y, yt, L + pw, L, function (v) { return lab[v] ? String(v) : null; });
      var pLo = 1e18, pHi = -1e18, PY = null;
      for (i = iA; i <= iE; i++) if (gzNum(pr[i]) && pr[i] > 0) { pLo = Math.min(pLo, pr[i]); pHi = Math.max(pHi, pr[i]); }
      el('rect', { x: L, y: sTop, width: pw, height: sH, fill: C.bg || '#131722', 'fill-opacity': 0.35 }, g);
      if (pHi > 0) {
        var lp0 = Math.log(pLo), lp1 = Math.log(pHi), pad = Math.max(0.02, (lp1 - lp0) * 0.08);
        PY = lin(lp0 - pad, lp1 + pad, sTop + sH, sTop);
        var pp = '', pg = true;
        for (i = iA; i <= iE; i++) {
          if (!gzNum(pr[i]) || pr[i] <= 0) { pg = true; continue; }
          pp += (pg ? 'M' : 'L') + X(i).toFixed(1) + ' ' + PY(Math.log(pr[i])).toFixed(1); pg = false;
        }
        el('path', { d: pp, fill: 'none', stroke: C.text || '#D1D4DC', 'stroke-width': wide ? 1 : 1.3, 'stroke-linejoin': 'round', 'stroke-opacity': 0.9 }, gS);
        tx(g, L + 4, sTop + 12, priceName(T.price) + (gzNum(pr[n]) ? ' · ' + (pr[n] >= 100 ? pr[n].toFixed(0) : pr[n].toFixed(2)) : ''),
          withHalo({ fill: C.muted, 'font-size': 11 }));
      }
      if (T.band) {
        var bA = T.band[0], bB = T.band[1];
        if (T.band[2] === 'armed') el('rect', { x: X(bA).toFixed(1), y: top, width: Math.max(1, X(bB) - X(bA)).toFixed(1), height: plotH, fill: GC.yel, 'fill-opacity': 0.09 }, gP);
        else el('rect', { x: X(bA).toFixed(1), y: top, width: Math.max(1, X(bB) - X(bA)).toFixed(1), height: plotH, fill: GC.green, 'fill-opacity': 0.07 }, gP);
      }
      var LINE = [['arm', GC.yel, 'arm line'], ['fire', GC.green, 'fire line']];
      LINE.forEach(function (o) {
        if (lineY[o[0]] == null) return;
        var y0 = Y(lineY[o[0]]);
        el('line', { x1: L, x2: L + pw, y1: y0, y2: y0, stroke: o[1], 'stroke-width': 1, 'stroke-dasharray': '5 4', 'stroke-opacity': 0.85 }, g);
      });

      var months = 0, ticks = [];
      for (i = iA + 1; i <= iB; i++) { var a = thrustCal(T, i), b = thrustCal(T, i - 1); if (a && b && a.slice(5, 7) !== b.slice(5, 7)) months++; }
      var mid = !ph && months > 0 && pw / Math.max(1, months) > 120, yrs = months > 20;
      for (i = iA + 1; i <= iB; i++) {
        var s = thrustCal(T, i), p = thrustCal(T, i - 1); if (!s || !p) continue;
        var dn = dayNum(s);
        if (yrs) { if (s.slice(0, 4) !== p.slice(0, 4)) ticks.push({ i: i, label: ph && months > 60 ? '’' + s.slice(2, 4) : s.slice(0, 4) }); continue; }
        if (s.slice(5, 7) !== p.slice(5, 7)) ticks.push({ i: i, label: mid ? fmtDay(dn, false) : MON[+s.slice(5, 7) - 1] });
        else if (mid && +s.slice(8, 10) >= 15 && +p.slice(8, 10) < 15) ticks.push({ i: i, label: fmtDay(dn, false) });
      }
      var lastR = -1e9;
      ticks.forEach(function (t) {
        var x = X(t.i), w = textW(t.label, 11);
        if (x - w / 2 < L - 4 || x + w / 2 > W || x - w / 2 < lastR + 8) return;
        el('line', { x1: x, x2: x, y1: top + plotH, y2: top + plotH + 4, stroke: C.muted, 'stroke-width': 1 }, g);
        tx(g, x, H - 5, t.label, { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' }); lastR = x + w / 2;
      });
      var path = '', gap = true;
      for (i = iA; i <= iE; i++) {
        if (!gzNum(r[i])) { gap = true; continue; }
        path += (gap ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(r[i] / 100).toFixed(1); gap = false;
      }
      var thin = wide && (vb - va) > 400;
      el('path', { d: path, fill: 'none', stroke: GC.blue, 'stroke-width': thin ? (ph ? 1.1 : 1.3) : (ph ? 1.6 : 1.8), 'stroke-linejoin': 'round' }, gP);
      var dots = T.thrusts.slice();
      if (wide) (T.events || []).forEach(function (e) { if (dots.indexOf(e.i) < 0) dots.push(e.i); });
      dots.forEach(function (t) {
        if (t < iA || t > iE) return;
        if (gzNum(r[t])) el('circle', { cx: X(t).toFixed(1), cy: Y(r[t] / 100).toFixed(1), r: wide ? 3.8 : 3.4, fill: GC.green, stroke: C.panel, 'stroke-width': 1.2 }, gP);
        if (PY && gzNum(pr[t]) && pr[t] > 0) el('circle', { cx: X(t).toFixed(1), cy: PY(Math.log(pr[t])).toFixed(1), r: wide ? 3.2 : 3, fill: GC.green, stroke: C.panel, 'stroke-width': 1.2 }, gS);
      });
      var nIn = n >= va - 0.01 && n <= vb + 0.01;
      var nb = nIn && gzNum(r[n]) ? nowBox(X(n), Y(r[n] / 100), ph ? 3.2 : 4) : { x: -99, y: -99, w: 0, h: 0 }, pts = [];
      for (i = iA; i <= iE; i++) if (gzNum(r[i])) pts.push([X(i), Y(r[i] / 100)]);
      function onLine(bx) {
        for (var k = 1; k < pts.length; k++) {
          var a0 = pts[k - 1], a1 = pts[k];
          if (Math.max(a0[0], a1[0]) < bx.x || Math.min(a0[0], a1[0]) > bx.x + bx.w) continue;
          if (Math.min(a0[1], a1[1]) <= bx.y + bx.h + 1 && Math.max(a0[1], a1[1]) >= bx.y - 1) return true;
        }
        return false;
      }
      [LINE[1], LINE[0]].forEach(function (o) {
        if (lineY[o[0]] == null) return;
        var w = textW(o[2], 11), y0 = Y(lineY[o[0]]), spots = [], k, best = null;
        if (T.state === 'ARMED' && !TV) spots.push([X(iB) - 4 - w, y0 - 4], [X(iB) - 4 - w, y0 + 13]);
        [0, 0.25, 0.5, 0.7].forEach(function (f) { var x = L + 6 + (pw - w - 12) * f; spots.push([x, y0 - 4], [x, y0 + 13]); });
        for (k = 0; k < spots.length && best == null; k++) {
          var bx = { x: spots[k][0] - 1, y: spots[k][1] - 10, w: w + 2, h: 13 };
          if (bx.y < top - 2 || bx.y + bx.h > top + plotH + 2 || bx.x + bx.w > L + pw) continue;
          if (!overlaps(bx, nb) && !onLine(bx)) best = spots[k];
        }
        best = best || spots[0];
        tx(g, best[0], best[1], o[2], withHalo({ fill: o[1], 'font-size': 11 }));
      });
      if (nIn && gzNum(r[n])) nowDot(g, X(n), Y(r[n] / 100), ph ? 3.2 : 4);
      if (nIn && PY && gzNum(pr[n]) && pr[n] > 0) nowDot(g, X(n), PY(Math.log(pr[n])), ph ? 2.8 : 3.4);
      var cross = el('g', { 'pointer-events': 'none' }, svg);
      gzHover(holder, gzQ('gzThrust', 'ro'), {
        W: W, cross: cross,
        pick: function (x) { var j = Math.round(X.inv(x)); return j < iA || j > iB ? null : j; },
        mark: function (j) {
          clear(cross); if (j == null) return;
          var x = X(j);
          el('line', { x1: x, x2: x, y1: sTop, y2: top + plotH, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, cross);
          if (j <= n && gzNum(r[j])) el('circle', { cx: x, cy: Y(r[j] / 100), r: 3.4, fill: 'none', stroke: C.white, 'stroke-width': 1.5 }, cross);
          if (PY && j <= n && gzNum(pr[j]) && pr[j] > 0) el('circle', { cx: x, cy: PY(Math.log(pr[j])), r: 3, fill: 'none', stroke: C.white, 'stroke-width': 1.4 }, cross);
        },
        text: function (j) { return thrustRo(T, j); }, rest: function () { return thrustRo(T, nIn ? n : iE); }
      });
    }
    function thrustRo(T, j) {
      var r = G.v.v50, s = thrustCal(T, j), p = [['d', s ? fmtDay(dayNum(s), true) : '–']];
      if (j > T.i_n) {
        p.push(['m', ' · no close yet']);
        if (T.state === 'ARMED' && j <= T.i_b) p.push(['y', ' · inside the window' + (j === T.i_b ? ' (last day)' : '')]);
        return p;
      }
      p.push(['', ' · above 50-day '], ['v', gzNum(r[j]) ? (r[j] / 100).toFixed(1) + '%' : '–']);
      var pj = G.prices && G.prices[T.price] ? G.prices[T.price][j] : null;
      if (gzNum(pj)) p.push(['', ' · ' + priceName(T.price) + ' ' + pj.toFixed(2)]);
      if (T.thrusts.indexOf(j) >= 0 || (T.events || []).some(function (e) { return e.i === j; })) p.push(['g', ' · thrust']);
      else if (T.soon.indexOf(j) >= 0) p.push(['m', ' · crossed the fire line, but too soon after the last thrust to count']);
      if (T.at_arm.indexOf(j) >= 0) p.push(['y', ' · at or under the arm line']);
      return p;
    }
    function hzWords(h) { return h === '1' ? '1 month' : h + ' months'; }
    function drawThrustPops(T) {
      var holder = gzQ('gzThrust', 'chart2'), W = Math.max(260, Math.round(holder.clientWidth)), ph = W < 520, key = 'r' + hz;
      var ev = T.events.map(function (e) { return { date: e.d, line: e.v, v: e[key], pend: !!e.pend }; });
      var med = T.median ? T.median[key] : null, nDone = ev.filter(function (e) { return e.v != null; }).length, P = priceName(T.price);
      var ro = gzQ('gzThrust', 'ro2');
      if (!ev.length) { clear(holder); holder._gz = null; gzParts(ro, [['m', 'No thrust since ' + dnDate(dayOf(0)).getUTCFullYear() + '.']]); return; }
      var L = 40, R = 6, top = 10, plotH = ph ? 118 : 136, H = top + plotH + 22, pw = W - L - R, m = ev.length;
      var vals = ev.filter(function (e) { return e.v != null; }).map(function (e) { return e.v; });
      var vmin = vals.length ? Math.min.apply(null, vals) : 0, vmax = vals.length ? Math.max.apply(null, vals) : 0;
      var lo = Math.min(-12, vmin - 3), hi = Math.max(32, vmax + 3);
      var svg = svgFor(holder, W, H), g = el('g', {}, svg), Y = lin(lo, hi, top + plotH, top), slot = pw / m;
      var st = niceStep(hi - lo, ph ? 4 : 5); st = Math.max(10, Math.round(st / 10) * 10);
      var yt = []; for (var v = Math.ceil(lo / st) * st; v <= hi; v += st) yt.push(v);
      yTicks(g, Y, yt, L + pw, L, function (v) { return v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v) + '%'; });
      el('line', { x1: L, x2: L + pw, y1: Y(0), y2: Y(0), stroke: C.muted, 'stroke-width': 1 }, g);
      if (med != null) el('line', { x1: L, x2: L + pw, y1: Y(med), y2: Y(med), stroke: GC.light, 'stroke-width': 1.1, 'stroke-dasharray': '4 3' }, g);
      var lw = textW('’26', 11) + 6, every = Math.max(1, Math.ceil(lw / slot));
      ev.forEach(function (e, k) {
        var x = L + slot * (k + 0.5), done = e.v != null, c = !done ? C.muted : e.v >= 0 ? GC.green : GC.red, vy = done ? Y(e.v) : Y(0);
        if (done) el('line', { x1: x, x2: x, y1: Y(0), y2: vy, stroke: c, 'stroke-width': 1.8, 'stroke-opacity': 0.85 }, g);
        var dot = el('circle', { cx: x, cy: vy, r: ph ? 3 : 3.4, fill: done ? c : C.panel, stroke: done ? C.panel : c, 'stroke-width': done ? 1.2 : 1.6 }, g);
        var t = el('title', {}, dot); t.textContent = e.date + ': ' + P + ' ' + (done ? sgn(e.v) + ' ' + hzWords(hz) + ' later' : hzWords(hz) + ' not over yet');
        if (k === m - 1 || (k % every === 0 && m - 1 - k >= every)) tx(g, x, H - 5, '’' + e.date.slice(2, 4), { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle' });
      });
      if (med != null) tx(g, L + 6, Y(med) - 5, 'typical ' + sgn(med, 0), withHalo({ fill: GC.light, 'font-size': 11.5 }));
      var cross = el('g', { 'pointer-events': 'none' }, svg);
      gzHover(holder, ro, {
        W: W, cross: cross,
        pick: function (x) { var k = Math.floor((x - L) / slot); return k < 0 || k >= m ? null : k; },
        mark: function (k) {
          clear(cross); if (k == null) return;
          var x = L + slot * (k + 0.5), e = ev[k];
          el('circle', { cx: x, cy: e.v != null ? Y(e.v) : Y(0), r: 6, fill: 'none', stroke: C.white, 'stroke-width': 1.4 }, cross);
        },
        text: function (k) {
          var e = ev[k];
          return [['d', gzDay(e.date, true)], ['', ' · fired at '], ['v', e.line == null ? '–' : pct1(e.line)], ['', ' · ' + P + ' ' + hzWords(hz) + ' later '],
            e.v == null ? ['m', 'not over yet'] : [e.v >= 0 ? 'g' : 'r', sgn(e.v)]];
        },
        rest: function () {
          return [['', 'Typical (median) '], ['v', med == null ? '–' : sgn(med, 0)], ['', ' ' + hzWords(hz) + ' after ' + nDone + ' thrust' + (nDone === 1 ? '' : 's')],
            ['m', HOVER ? ' · hover a thrust' : ' · tap a thrust']];
        }
      });
    }


    var CARDS = [['thin', 'gzThin', thinText, function (T) { drawThinBars(T); drawThinChart(T); }],
                 ['thrust', 'gzThrust', thrustText, function (T) { drawThrustLine(T); drawThrustPops(T); }]];
    function render() {
      doc = A.data(); gkey = A.group();
      var err = $('gzErr');
      if (!doc || !doc.groups || !doc.groups[gkey]) { err.hidden = true; return; }
      G = doc.groups[gkey];
      DN = doc.days.map(dayNum);
      err.hidden = true;
      $('gzSecSub').textContent = 'Two gauges on ' + G.words + ', read on ' + priceWord(G.default_price) +
        ' (the group’s own price): how broad the stocks are when the price is near its 52-week high, and whether the 50-day line just jumped from washed-out to strong.';
      var GS = G.gauges || {};
      CARDS.forEach(function (c) {
        var T = GS[c[0]];
        GZS[c[0]] = null;
        try {
          if (!T || !T.ok) { GZS[c[0]] = { ok: false }; gzShow(c[1], false, T && T.na ? T.na : NA_DRAW); return; }
          c[2](T); GZS[c[0]] = { ok: true, T: T }; gzShow(c[1], true);
        } catch (e) {
          GZS[c[0]] = { ok: false };
          gzShow(c[1], false, NA_DRAW);
          if (window.console) console.warn('gauges', e);
        }
      });
      draw();
    }
    function draw() {
      if (!doc || !G) return;
      GZW = Math.round(sec.clientWidth);
      CARDS.forEach(function (c) {
        var S = GZS[c[0]];
        if (!S || !S.ok) return;
        try { c[3](S.T); } catch (e) { S.ok = false; gzShow(c[1], false, NA_DRAW); if (window.console) console.warn('gauges', e); }
      });
    }
    sec.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('[data-gzfs]')) { thrustFs(false); return; }
      var t = ev.target.closest && (ev.target.closest('[data-gzt]') || ev.target.closest('[data-gzz]'));
      if (t && G) {
        var k = TZ.indexOf(tz), zin = t.getAttribute('data-gzz') === 'in';
        if (t.hasAttribute('data-gzt')) { tz = t.getAttribute('data-gzt'); TV = null; }
        else if (TV && TG) {
          var T1 = GZS.thrust && GZS.thrust.T, f = zin ? 1 / 1.6 : 1.6, s1 = (TG.b - TG.a) * f, hiB = T1 ? T1.i_b + (T1.i_b === T1.i_n ? 0.5 : 0) : TG.b;
          if (T1) TV = TG.b >= hiB - 0.6 ? clampView(TG.b - s1, TG.b, T1) : clampView((TG.a + TG.b) / 2 - s1 / 2, (TG.a + TG.b) / 2 + s1 / 2, T1);
        } else tz = TZ[Math.max(0, Math.min(TZ.length - 1, k + (zin ? -1 : 1)))];
        var S0 = GZS.thrust; if (S0 && S0.ok) { try { drawThrustLine(S0.T); thrustCt(S0.T); } catch (e) { } }
        return;
      }
      var b = ev.target.closest && ev.target.closest('[data-gzh]');
      if (!b || !G) return;
      hz = b.getAttribute('data-gzh');
      renderHz();
      var S = GZS.thrust; if (S && S.ok) { try { drawThrustPops(S.T); } catch (e) { } }
    });
    (function () {
      var raf = false;
      function req() {
        if (raf) return; raf = true;
        requestAnimationFrame(function () { raf = false; if (doc && Math.round(sec.clientWidth) !== GZW) { try { draw(); } catch (e) { } } });
      }
      if ('ResizeObserver' in window) new ResizeObserver(req).observe(sec); else window.addEventListener('resize', req);
    })();
    A.on('data', function () { try { render(); } catch (e) { showErr(e); } });
    A.on('group', function () { TV = null; try { render(); } catch (e) { showErr(e); } });
    function showErr(e) {
      var er = $('gzErr'); er.hidden = false; er.textContent = 'The risk gauges could not be drawn. The rest of the page is not affected.';
      if (window.console) console.warn('gauges', e);
    }
    if (HZ.indexOf(hz) < 0) hz = '3';
  }
})();
