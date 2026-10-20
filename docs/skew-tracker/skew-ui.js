


(function () {
  'use strict';
  var SKT = window.SKT = window.SKT || {};
  var NS = 'http://www.w3.org/2000/svg';


  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function add(parent, child) {
    if (child == null || child === false) return parent;
    if (Array.isArray(child)) { child.forEach(function (c) { add(parent, c); }); return parent; }
    parent.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
    return parent;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v) { return typeof v === 'number' && isFinite(v); }
  var hoverDev = function () { try { return matchMedia('(hover: hover)').matches; } catch (e) { return true; } };


  var tt = null, ttTimer = null, ttFor = null, tipFns = new WeakMap();
  function ttEl() {
    if (!tt) { tt = el('div', 'tt'); tt.setAttribute('role', 'tooltip'); tt.hidden = true; document.body.appendChild(tt); }
    return tt;
  }
  function place(x, y) {
    var t = ttEl();
    t.style.left = Math.max(4, Math.min(x + 12, innerWidth - t.offsetWidth - 8)) + 'px';
    var top = y + 16;
    if (top + t.offsetHeight > innerHeight - 6) top = Math.max(4, y - t.offsetHeight - 10);
    t.style.top = top + 'px';
  }
  function hideTip() { if (tt) tt.hidden = true; ttFor = null; }
  function showTip(node, x, y, touch) {
    var t = ttEl(), fn = tipFns.get(node), html = node.getAttribute('data-tiph'), txt = node.getAttribute('data-tip');
    ttFor = node;
    if (fn && !touch) {
      var res;
      try { res = fn(node); } catch (e) { res = null; }
      if (res && typeof res.then === 'function') {
        t.textContent = txt || 'Loading…';
        res.then(function (h) { if (ttFor === node && !t.hidden && h) { t.innerHTML = h; place(x, y); } }, function () {});
      } else if (res) t.innerHTML = res;
      else if (txt) t.textContent = txt; else return hideTip();
    } else if (html && !touch) t.innerHTML = html;
    else if (txt) t.textContent = txt;
    else if (html) t.textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    else return hideTip();
    t.hidden = false;
    place(x, y);
  }
  function tipTarget(e) {
    var n = e.target && e.target.closest ? e.target.closest('[data-tip],[data-tiph],[data-tipf],[title]') : null;
    if (n && n.hasAttribute('title') && n.tagName !== 'svg') {
      if (!n.hasAttribute('data-tip')) n.setAttribute('data-tip', n.getAttribute('title'));
      n.removeAttribute('title');
    }
    return n;
  }
  document.addEventListener('mousemove', function (e) {
    if (ttTimer || !hoverDev()) return;
    var n = tipTarget(e);
    if (!n) return hideTip();
    if (n !== ttFor) showTip(n, e.clientX, e.clientY, false); else place(e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('click', function (e) {
    if (hoverDev()) { if (!ttTimer) hideTip(); return; }
    var n = tipTarget(e);
    if (!n) return;
    showTip(n, e.clientX, e.clientY, true);
    clearTimeout(ttTimer);
    ttTimer = setTimeout(function () { hideTip(); ttTimer = null; }, 2500);
  });
  document.addEventListener('scroll', function () { if (!ttTimer) hideTip(); }, { passive: true });
  function tip(node, text, html) {
    if (!node) return node;
    if (text != null && text !== '') node.setAttribute('data-tip', String(text));
    if (typeof html === 'function') { tipFns.set(node, html); node.setAttribute('data-tipf', ''); }
    else if (html) node.setAttribute('data-tiph', html);
    return node;
  }



  function chipBtn(it, on, cls) {
    var b = el('button', cls + (on ? ' on' : '') + (it.off ? ' off' : '') + (it.cls ? ' ' + it.cls : '') + (it.short ? ' has-s' : ''));
    b.type = 'button'; b.dataset.k = it.k == null ? '' : String(it.k);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (it.off) b.setAttribute('aria-disabled', 'true');
    add(b, el('span', 'cl', it.label));
    if (it.short) add(b, el('span', 'cs', it.short));
    if (it.n !== undefined && it.n !== null) add(b, el('span', 'cn', it.n === '' ? '' : (typeof it.n === 'number' ? it.n.toLocaleString('en-US') : String(it.n))));
    if (it.aria) b.setAttribute('aria-label', it.aria);
    if (it.tip) tip(b, it.tip);
    return b;
  }
  function chips(items, cur, onPick, opts) {
    opts = opts || {};
    var box = el('div', 'chips' + (opts.cls ? ' ' + opts.cls : ''));
    box.setAttribute('role', 'group');
    if (opts.aria || opts.label) box.setAttribute('aria-label', opts.aria || opts.label);
    if (opts.label) add(box, el('span', 'chips-lab', opts.label));
    (items || []).forEach(function (it) {
      if (!it) return;
      var on = cur instanceof Set ? cur.has(it.k) : cur === it.k;
      var b = chipBtn(it, on, 'chip');
      b.addEventListener('click', function () { if (!it.off && onPick) onPick(it.k, on); });
      box.appendChild(b);
    });
    return box;
  }
  function seg(items, cur, onPick, opts) {
    opts = opts || {};
    var box = el('div', 'segp' + (opts.cls ? ' ' + opts.cls : ''));
    box.setAttribute('role', 'group');
    if (opts.aria || opts.label) box.setAttribute('aria-label', opts.aria || opts.label);
    (items || []).forEach(function (it) {
      if (!it) return;
      var b = chipBtn(it, cur === it.k, 'sg');
      b.addEventListener('click', function () { if (!it.off && onPick) onPick(it.k); });
      box.appendChild(b);
    });
    return box;
  }
  function pill(text, cls, tipText) {
    var p = el('span', 'pill' + (cls ? ' ' + cls : ''), text);
    if (tipText) tip(p, tipText);
    return p;
  }

  function select(items, cur, onPick, opts) {
    opts = opts || {};
    var w = el('label', 'selw' + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.label) add(w, el('span', 'sel-lab', opts.label));
    var s = el('select', 'sel');
    if (opts.aria) s.setAttribute('aria-label', opts.aria);
    (items || []).forEach(function (it) {
      if (!it) return;
      var o = el('option', null, it.label); o.value = it.k == null ? '' : String(it.k);
      if (it.off) o.disabled = true;
      if (String(cur) === o.value) o.selected = true;
      s.appendChild(o);
    });
    s.addEventListener('change', function () { if (onPick) onPick(s.value); });
    w.appendChild(s);
    return w;
  }



  function drawer(label, content, opts) {
    opts = opts || {};
    var box = el('div', 'drawer' + (opts.cls ? ' ' + opts.cls : ''));
    var b = el('button', 'drawer-btn', label + (opts.n ? ' (' + opts.n + ')' : ''));
    b.type = 'button';
    var body = el('div', 'drawer-body');
    var open = !!opts.open;
    function fill() { body.textContent = ''; add(body, typeof content === 'function' ? content() : content); }
    function set(v) {
      open = v; b.setAttribute('aria-expanded', open ? 'true' : 'false'); body.hidden = !open;
      if (open) fill();
      if (opts.onToggle) opts.onToggle(open);
    }
    b.addEventListener('click', function () { set(!open); });
    box.appendChild(b); box.appendChild(body);
    set(open);
    return box;
  }


  var openDD = null;
  document.addEventListener('click', function (e) { if (openDD && !openDD.contains(e.target)) { openDD.classList.remove('open'); openDD = null; } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openDD) { openDD.classList.remove('open'); openDD = null; } });
  function dropdown(label, items, opts) {
    opts = opts || {};
    var box = el('div', 'dd' + (opts.align === 'right' ? ' dd-r' : '') + (opts.cls ? ' ' + opts.cls : '') + (label == null ? ' open dd-bare' : ''));
    var menu = el('div', 'dd-menu'); menu.setAttribute('role', 'menu');
    (items || []).forEach(function (it) {
      if (!it) return;
      var a = it.href ? el('a', 'dd-it') : el('button', 'dd-it');
      if (it.href) { a.href = it.href; if (it.target !== '') { a.target = it.target || '_blank'; a.rel = 'noopener'; } }
      else a.type = 'button';
      a.setAttribute('role', 'menuitem');
      add(a, el('span', 'dd-l', it.label));
      if (it.sub) add(a, el('span', 'dd-s', it.sub));
      if (it.tip) tip(a, it.tip);
      a.addEventListener('click', function (e) {
        if (it.on) { e.preventDefault(); it.on(it); }
        if (label != null) { box.classList.remove('open'); openDD = null; }
      });
      menu.appendChild(a);
    });
    if (label != null) {
      var b = el('button', 'dd-btn', label + ' ▾'); b.type = 'button'; b.setAttribute('aria-haspopup', 'menu');
      if (opts.tip) tip(b, opts.tip);
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var was = box.classList.contains('open');
        if (openDD && openDD !== box) openDD.classList.remove('open');
        box.classList.toggle('open', !was); openDD = was ? null : box;
      });
      box.appendChild(b);
    }
    box.appendChild(menu);
    return box;
  }


  function details(summary, content, opts) {
    opts = opts || {};
    var d = el('details', 'fold' + (opts.cls ? ' ' + opts.cls : ''));
    var s = el('summary');
    add(s, summary);
    if (opts.count != null) add(s, el('span', 'fold-n', ' · ' + (typeof opts.count === 'number' ? opts.count.toLocaleString('en-US') : opts.count)));
    d.appendChild(s);
    var body = el('div', 'fold-body'); d.appendChild(body);
    var built = false;
    function build() { if (built) return; built = true; add(body, typeof content === 'function' ? content() : content); }
    var stored = opts.key && SKT.store ? SKT.store.get(opts.key) : null;
    var open = stored === '1' ? true : stored === '0' ? false : !!opts.open;
    if (open) { d.open = true; build(); }
    d.addEventListener('toggle', function () {
      if (d.open) build();
      if (opts.key && SKT.store) SKT.store.set(opts.key, d.open ? '1' : '0');
      if (opts.onToggle) opts.onToggle(d.open);
    });
    return d;
  }




  function splitBar(c, p, opts) {
    opts = opts || {};
    var cc = Math.max(+c || 0, 0), pp = Math.max(+p || 0, 0);
    var b = el('span', 'sbar' + (opts.thin ? ' thin' : '') + (cc + pp ? '' : ' none') + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.w) b.style.width = opts.w + 'px';
    if (opts.h) b.style.height = opts.h + 'px';
    if (cc + pp) { var i = el('i', 'c'); i.style.width = (cc / (cc + pp) * 100).toFixed(2) + '%'; b.appendChild(i); }
    if (opts.mid) b.appendChild(el('b', 'mid'));
    if (num(opts.tick)) { var t = el('b', 'tick'); t.style.left = (clamp(opts.tick, 0, 1) * 100).toFixed(2) + '%'; b.appendChild(t); }
    b.setAttribute('aria-hidden', 'true');
    return b;
  }


  function twoBar(c, p, opts) {
    opts = opts || {};
    var mx = opts.max || Math.max(Math.abs(+c || 0), Math.abs(+p || 0)) || 1;
    var b = el('span', 'tbar' + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.w) b.style.width = opts.w + 'px';
    [['c', c], ['p', p]].forEach(function (x) {
      var v = +x[1] || 0, i = el('i', x[0] + (v < 0 ? ' neg' : v === 0 ? ' zero' : ''));
      i.style.width = (v > 0 ? clamp(v / mx, 0, 1) * 100 : 0).toFixed(2) + '%';
      b.appendChild(i);
    });
    b.setAttribute('aria-hidden', 'true');
    return b;
  }

  function bar(v, opts) {
    opts = opts || {};
    var b = el('span', 'hbar' + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.w) b.style.width = opts.w + 'px';
    if (num(v)) { var i = el('i'); i.style.width = clamp(opts.frac ? v * 100 : v, 0, 100).toFixed(1) + '%'; b.appendChild(i); }
    else b.classList.add('none');
    if (num(opts.tick)) { var t = el('b', 'tick'); t.style.left = clamp(opts.tick, 0, 100) + '%'; b.appendChild(t); }
    b.setAttribute('aria-hidden', 'true');
    return b;
  }

  function meter(v, opts) {
    opts = opts || {};
    var band = SKT.biz ? SKT.biz(v).band : '';
    var m = el('span', 'meter' + (band ? ' b-' + band : ' none') + (opts.big ? ' big' : '') + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.w) m.style.width = opts.w + 'px';
    if (num(v)) { var i = el('i'); i.style.width = clamp(v, 0, 100) + '%'; m.appendChild(i); }
    m.setAttribute('aria-hidden', 'true');
    return m;
  }




  function dayCells(cells, opts) {
    opts = opts || {};
    var box = el('span', 'dcells' + (opts.cls ? ' ' + opts.cls : ''));
    (cells || []).forEach(function (c) {
      c = c || {};
      var i = el('i', 'dc ' + (c.l === 'c' || c.l === 'p' || c.l === 'q' ? 'l' + c.l : 'na') + (c.pair ? ' pair' : '') + (c.gold ? ' gold' : '') +
        (c.today ? ' today' : '') + (c.dot ? ' dot' : ''), c.t || '');
      if (c.day) i.dataset.day = c.day;
      if (c.tip) tip(i, c.tip);
      if (opts.onPick && c.day) i.addEventListener('click', function (e) { e.stopPropagation(); opts.onPick(c.day); });
      box.appendChild(i);
    });
    if (opts.label) box.appendChild(el('span', 'dc-lab', opts.label));
    return box;
  }


  function dots(spec, opts) {
    opts = opts || {};
    var box;
    if (Array.isArray(spec)) {
      box = el('span', 'rdots' + (opts.cls ? ' ' + opts.cls : ''));
      spec.forEach(function (d) {
        var s = el('span', 'rd'), st = d.state;
        s.appendChild(el('i', st === 'C' ? 'c' : st === 'P' ? 'p' : st === '' ? 'o' : 'na'));
        if (d.label) s.appendChild(el('small', null, d.label));
        if (d.tip) tip(s, d.tip);
        box.appendChild(s);
      });
      if (opts.aria) box.setAttribute('aria-label', opts.aria);
      return box;
    }
    var n = +spec || 0, of = opts.of || 3;
    box = el('span', 'sdots' + (opts.cls ? ' ' + opts.cls : ''));
    for (var i = 0; i < of; i++) box.appendChild(el('i', i < n ? 'on' : null));
    box.setAttribute('aria-label', n + ' of ' + of);
    return box;
  }




  function spark(vals, opts) {
    opts = opts || {};
    var W = opts.w || 120, H = opts.h || 28, v = vals || [], n = v.length || 1;
    var s = svgRoot(W, H, { 'class': 'spk' + (opts.cls ? ' ' + opts.cls : ''), 'aria-hidden': 'true' });
    var mx = opts.max || 0;
    v.forEach(function (x) { if (num(x)) mx = Math.max(mx, Math.abs(x)); });
    if (!mx) mx = 1;
    if (opts.type === 'line') {
      var lo = Infinity, hi = -Infinity;
      v.forEach(function (x) { if (num(x)) { lo = Math.min(lo, x); hi = Math.max(hi, x); } });
      if (!isFinite(lo)) return s;
      if (hi === lo) { hi += 1; lo -= 1; }
      var d = '', pen = false;
      v.forEach(function (x, i) {
        if (!num(x)) { pen = false; return; }
        var px = n > 1 ? i / (n - 1) * (W - 2) + 1 : W / 2, py = H - 2 - (x - lo) / (hi - lo) * (H - 4);
        d += (pen ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1); pen = true;
      });
      svgPath(d, { 'class': 'ln' }, s);
      return s;
    }
    var mid = H / 2, bw = W / n;
    svgLine(0, mid, W, mid, { 'class': 'z' }, s);
    v.forEach(function (x, i) {
      var x0 = i * bw + 1, w = Math.max(1, bw - 2);
      if (!num(x)) { svgRect(x0, mid - 1, w, 2, { 'class': 'na' }, s); return; }
      var h = Math.max(1, Math.abs(x) / mx * (mid - 1));
      svgRect(x0, x >= 0 ? mid - h : mid, w, h, { 'class': x >= 0 ? 'bc' : 'bp' }, s);
    });
    return s;
  }



  function glyph(gb, opts) {
    opts = opts || {};
    if (!gb || gb.length < 48) return el('span', 'glyph none');
    var full = opts.w === '100%', W = (!full && +opts.w > 0) ? +opts.w : 180, H = +opts.h > 0 ? +opts.h : 32, mid = H / 2, bw = W / 24, mx = 0, at = -1;
    for (var j = 0; j < 48; j++) if ((+gb[j] || 0) > mx) { mx = +gb[j]; at = j; }
    var s = svgRoot(W, H, { 'class': 'glyph', 'aria-hidden': 'true' });
    if (full) { s.setAttribute('width', '100%'); s.setAttribute('preserveAspectRatio', 'none'); }
    svgLine(0, mid, W, mid, { 'class': 'z' }, s);
    for (var i = 0; i < 24; i++) {
      var c = +gb[i] || 0, p = +gb[24 + i] || 0, x0 = i * bw + 0.5, w = Math.max(1, bw - 1);
      if (c > 0) { var hc = Math.max(1, c / (mx || 99) * (mid - 1)); svgRect(x0, mid - hc, w, hc, { 'class': i === at ? 'g' : 'c' }, s); }
      if (p > 0) { var hp = Math.max(1, p / (mx || 99) * (mid - 1)); svgRect(x0, mid, w, hp, { 'class': 24 + i === at ? 'g' : 'p' }, s); }
    }
    svgLine(W / 2, 0, W / 2, H, { 'class': 'px' }, s);
    if (opts.tip) { var wrap = el('span', 'glyphw'); wrap.appendChild(s); tip(wrap, opts.tip); return wrap; }
    return s;
  }



  function sortRows(rows, get, dir) {
    dir = dir || 1;
    return rows.map(function (r, i) { return [r, get(r), i]; }).sort(function (a, b) {
      var x = a[1], y = b[1], xn = x == null || (typeof x === 'number' && isNaN(x)), yn = y == null || (typeof y === 'number' && isNaN(y));
      if (xn || yn) return xn && yn ? a[2] - b[2] : xn ? 1 : -1;
      var c = typeof x === 'string' || typeof y === 'string' ? String(x).localeCompare(String(y)) : y - x;
      return (c * dir) || (a[2] - b[2]);
    }).map(function (a) { return a[0]; });
  }


  function hdrSort(cols, cur, dir, onSort, opts) {
    opts = opts || {};
    var isTr = opts.tag === 'tr', row = el(isTr ? 'tr' : 'div', isTr ? null : 'hdr' + (opts.cls ? ' ' + opts.cls : ''));
    if (!isTr) row.setAttribute('role', 'row');
    (cols || []).forEach(function (c) {
      var cell = el(isTr ? 'th' : 'div', (c.cls || '') + (c.num ? ' n' : ''));
      if (!isTr) cell.setAttribute('role', 'columnheader');
      var on = (c.k || '') === (cur || '');
      if (c.sort === false || !onSort) { add(cell, c.label); if (c.tip) tip(cell, c.tip); }
      else {
        var b = el('button', 'thb' + (on ? ' on' : ''), c.label + (on && c.k ? (dir < 0 ? ' ▲' : ' ▼') : ''));
        b.type = 'button';
        if (c.tip) tip(b, c.tip);
        b.addEventListener('click', function (e) { e.stopPropagation(); onSort(c.k || ''); });
        cell.appendChild(b);
        if (on && c.k) cell.setAttribute('aria-sort', dir < 0 ? 'ascending' : 'descending');
      }
      row.appendChild(cell);
    });
    return row;
  }



  function table(cols, rows, opts) {
    opts = opts || {};
    var wrap = el('div', 'table-scroll' + (opts.cls ? ' ' + opts.cls : '')), t = el('table', 'tbl2');
    var th = el('thead');
    th.appendChild(hdrSort(cols, opts.sort ? opts.sort.k : null, opts.sort ? opts.sort.dir : 1, opts.onSort, { tag: 'tr' }));
    t.appendChild(th);
    var list = (rows || []).slice();
    if (opts.sort && opts.sort.k) {
      var col = cols.filter(function (c) { return c.k === opts.sort.k; })[0];
      if (col && col.v) list = sortRows(list, col.v, opts.sort.dir || 1);
    }
    if (opts.max) list = list.slice(0, opts.max);
    var tb = el('tbody');
    function cellOf(c, r, tag) {
      var td = el(tag || 'td', (c.cls || '') + (c.num ? ' n' : ''));
      var v;
      try { v = c.f ? c.f(r) : c.v ? c.v(r) : r[c.k]; } catch (e) { v = '–'; }
      add(td, v == null || v === '' ? '–' : v);
      return td;
    }
    list.forEach(function (r) {
      var tr = el('tr', opts.rowCls ? opts.rowCls(r) : null);
      cols.forEach(function (c) { tr.appendChild(cellOf(c, r)); });
      if (opts.onRow) opts.onRow(r, tr);
      tb.appendChild(tr);
    });
    if (!list.length && opts.empty) { var tr0 = el('tr'), td0 = el('td', 'empty', opts.empty); td0.colSpan = cols.length; tr0.appendChild(td0); tb.appendChild(tr0); }
    t.appendChild(tb);
    if (opts.sum) {
      var tf = el('tfoot'), trs = el('tr', 'sum');
      cols.forEach(function (c) { trs.appendChild(cellOf(c, opts.sum)); });
      tf.appendChild(trs); t.appendChild(tf);
    }
    wrap.appendChild(t);
    return wrap;
  }

  function note(text, kind) { return add(el('p', 'note' + (kind ? ' note-' + kind : '')), text); }


  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (a) { var v = attrs[a]; if (v != null && v !== false) e.setAttribute(a, v); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(w, h, attrs) {
    var a = { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return svgEl('svg', a);
  }
  function svgText(x, y, str, attrs, parent) { var t = svgEl('text', merge({ x: r1(x), y: r1(y) }, attrs), parent); t.textContent = str == null ? '' : String(str); return t; }
  function svgLine(x1, y1, x2, y2, attrs, parent) { return svgEl('line', merge({ x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2) }, attrs), parent); }
  function svgRect(x, y, w, h, attrs, parent) { return svgEl('rect', merge({ x: r1(x), y: r1(y), width: r1(Math.max(0, w)), height: r1(Math.max(0, h)) }, attrs), parent); }
  function svgPath(d, attrs, parent) { return svgEl('path', merge({ d: d }, attrs), parent); }
  function svgGroup(attrs, parent) { return svgEl('g', attrs, parent); }
  function merge(a, b) { Object.keys(b || {}).forEach(function (k) { a[k] = b[k]; }); return a; }
  function r1(v) { return Math.round(v * 10) / 10; }
  var mctx = null, mcache = {};

  function measure(str, font) {
    font = font || '11px -apple-system,BlinkMacSystemFont,Roboto,"Segoe UI",Arial,sans-serif';
    var key = font + '|' + str;
    if (mcache[key] != null) return mcache[key];
    if (!mctx) { try { mctx = document.createElement('canvas').getContext('2d'); } catch (e) { mctx = null; } }
    var w = mctx ? (mctx.font = font, mctx.measureText(String(str)).width) : String(str).length * 6.2;
    mcache[key] = w;
    return w;
  }

  function niceStep(span, n) {
    if (!(span > 0)) return 1;
    var raw = span / Math.max(1, n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  function scale(d0, d1, p0, p1, o) {
    var lg = o && o.log, a = lg ? Math.log(d0) : d0, b = lg ? Math.log(d1) : d1;
    var f = function (v) { var x = lg ? Math.log(Math.max(v, 1e-12)) : v; return b === a ? (p0 + p1) / 2 : p0 + (x - a) / (b - a) * (p1 - p0); };
    f.inv = function (px) { var x = a + (px - p0) / ((p1 - p0) || 1) * (b - a); return lg ? Math.exp(x) : x; };
    return f;
  }



  function axis(parent, o) {
    o = o || {};
    var g = svgGroup({ 'class': 'axis' + (o.cls ? ' ' + o.cls : '') }, parent), vals = o.values;
    if (!vals) {
      vals = [];
      if (o.log && o.min > 0) {
        for (var e = Math.floor(Math.log10(o.min)); e <= Math.ceil(Math.log10(o.max)); e++) [1, 2, 5].forEach(function (m) {
          var v = m * Math.pow(10, e); if (v >= o.min && v <= o.max) vals.push(v);
        });
      } else {
        var st = niceStep(o.max - o.min, o.ticks || 5), v0 = Math.ceil(o.min / st) * st;
        for (var v = v0; v <= o.max + st * 1e-9; v += st) vals.push(Math.round(v / st) * st);
      }
    }
    var sc = scale(o.min, o.max, o.from, o.to, { log: o.log }), fmt = o.fmt || function (x) { return String(x); };
    vals.forEach(function (v) {
      var p = sc(v);
      if (o.dir === 'x') {
        if (o.grid) svgLine(p, o.grid[0], p, o.grid[1], { 'class': 'grid' }, g);
        svgText(p, o.at + (o.side === 'top' ? -4 : 12), fmt(v), { 'text-anchor': 'middle' }, g);
      } else {
        if (o.grid) svgLine(o.grid[0], p, o.grid[1], p, { 'class': 'grid' }, g);
        svgText(o.at + (o.side === 'right' ? 4 : -4), p + 3.5, fmt(v), { 'text-anchor': o.side === 'right' ? 'start' : 'end' }, g);
      }
    });
    return vals;
  }

  SKT.ui = {
    el: el, add: add, esc: esc, tip: tip, hideTip: hideTip,
    chips: chips, seg: seg, pill: pill, select: select, drawer: drawer, dropdown: dropdown, details: details,
    splitBar: splitBar, twoBar: twoBar, dayCells: dayCells, dots: dots, spark: spark, glyph: glyph,
    bar: bar, meter: meter, hdrSort: hdrSort, table: table, note: note, sortRows: sortRows
  };
  SKT.svg = {
    el: svgEl, root: svgRoot, text: svgText, line: svgLine, rect: svgRect, path: svgPath, group: svgGroup,
    measure: measure, niceStep: niceStep, axis: axis, scale: scale
  };
})();
