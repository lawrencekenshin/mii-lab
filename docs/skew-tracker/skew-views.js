

















(function () {
  'use strict';
  var SKT = window.SKT = window.SKT || {};

  var EXT = { bar: [], board: [], render: {}, offer: {}, preLine: null };
  var vErr = null, CLIP = 0;


  function el(t, c, x) { return SKT.ui.el(t, c, x); }
  function add(p, c) { return SKT.ui.add(p, c); }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function fmt() { return SKT.fmt; }
  function safe(fn, a) { try { return fn(a); } catch (e) { console.error('[skew] views', e); return null; } }
  function sides() { var s = SKT.S.side; return s === 'B' ? ['C', 'P'] : [s === 'P' ? 'P' : 'C']; }
  function sideWord(s) { return s === 'P' ? 'puts' : s === 'B' ? 'calls and puts' : 'calls'; }
  function sidePill(s) { return SKT.ui.pill(s === 'P' ? '▼ puts' : '▲ calls', s === 'P' ? 'red' : 'green'); }
  function win() { var w = SKT.S.w; return w === 'tape' ? '1d' : w; }
  function inL(sym) { return SKT.inList(sym, SKT.S.list); }
  function listLabel() {
    var l = SKT.S.list, it = (SKT.LISTS || []).filter(function (x) { return x.k === l; })[0];
    return l === 'all' || !it ? '' : it.label;
  }
  var ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': '\'', '&#x27;': '\'' };
  function nameOf(sym) { var r = SKT.row(sym); return r && r.nm ? String(r.nm).replace(/&(amp|lt|gt|quot|#39|#x27);/g, function (m) { return ENT[m]; }) : ''; }
  function rowW(sym, w) { var r = SKT.row(sym); return (r && r.w && r.w[w]) || null; }
  function open(sym, day) { var p = { open: sym }; if (day) p.day = day; SKT.go(p, { push: true }); }
  function symBtn(sym, opts) {
    opts = opts || {};
    var b = el('button', 'vx-sym' + (opts.cls ? ' ' + opts.cls : ''), sym);
    b.type = 'button';
    var t = opts.tip || nameOf(sym);
    if (t) SKT.ui.tip(b, t);
    b.addEventListener('click', function (e) { e.stopPropagation(); if (opts.on) opts.on(sym); else open(sym, opts.day); });
    return b;
  }
  function tk(sym, side, opts) {
    opts = opts || {};
    return symBtn(sym, { cls: 'vx-tk ' + (side === 'P' ? 'p' : 'c') + (opts.on ? ' on' : ''), tip: opts.tip, day: opts.day });
  }
  function stock(sym) {
    var w = el('span', 'vx-stk');
    w.appendChild(symBtn(sym));
    var nm = nameOf(sym);
    if (nm) w.appendChild(el('span', 'vx-nm', nm));
    return w;
  }
  function head(root, title, sub) {
    var h = el('div', 'vx-head');
    h.appendChild(el('h2', 'vx-h acc-h', title));
    if (sub) h.appendChild(el('p', 'sub vx-sub', sub));
    root.appendChild(h);
  }
  function tapeNote(root) {
    if (SKT.S.w !== 'tape') return;
    var p = SKT.D && SKT.D.periods && SKT.D.periods['1d'];
    root.appendChild(SKT.ui.note('Tape is traded, not settled: this view reads the settled windows, so it shows Today' +
      (p && p.to ? ' (' + fmt().day(p.to) + ')' : '') + '.', 'muted'));
  }
  function tile(label, big, sub, cls) {
    var t = el('div', 'vx-tile' + (cls ? ' ' + cls : ''));
    t.appendChild(el('div', 'vx-tl', label));
    add(t, typeof big === 'string' || typeof big === 'number' ? el('div', 'vx-tb', String(big)) : add(el('div', 'vx-tb'), big));
    if (sub) add(t, typeof sub === 'string' ? el('div', 'vx-ts', sub) : add(el('div', 'vx-ts'), sub));
    return t;
  }
  function section(title, count, cls, tipText) {
    var s = el('section', 'vx-sec' + (cls ? ' ' + cls : ''));
    var h = el('h3', 'vx-sh');
    add(h, title);
    if (count != null) h.appendChild(el('span', 'vx-n', ' · ' + (typeof count === 'number' ? count.toLocaleString('en-US') : count)));
    if (tipText) SKT.ui.tip(h, tipText);
    s.appendChild(h);
    return s;
  }
  function emptyLine(text) { return el('p', 'empty vx-empty', text); }

  function capped(parent, rows, n, make) {
    var shown = 0;
    function more(k) {
      rows.slice(shown, shown + k).forEach(function (r) { var x = make(r); if (x) parent.appendChild(x); });
      shown = Math.min(rows.length, shown + k);
    }
    more(n);
    if (rows.length > shown) {
      var b = el('button', 'linkbtn vx-more', 'Show all ' + rows.length.toLocaleString('en-US')); b.type = 'button';
      b.addEventListener('click', function () { b.remove(); more(rows.length); });
      parent.appendChild(b);
    }
  }
  function moveMark(d) {
    if (!isNum(d)) return null;
    return el('span', 'vx-mv ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'mut'), d > 0 ? '▲' + d : d < 0 ? '▼' + (-d) : '=');
  }
  function heldCell(sym, tick) {
    var r = SKT.row(sym), w = el('span', 'vx-held');
    if (!r || (!isNum(r.oC) && !isNum(r.oP))) { w.textContent = '–'; return w; }
    var c = r.oC || 0, p = r.oP || 0, lean = r.hlean === 'C' ? 'up' : r.hlean === 'P' ? 'down' : 'mut';
    w.appendChild(el('b', 'vx-ratio ' + lean, fmt().ratio(c, p)));
    w.appendChild(SKT.ui.splitBar(c, p, { w: 84, mid: true, tick: isNum(tick) ? tick : null, thin: !!r.thin }));
    SKT.ui.tip(w, fmt().k(c) + ' calls · ' + fmt().k(p) + ' puts open now (every strike and expiry)' +
      (isNum(tick) ? '. White tick = the call share on its first ranked day (' + fmt().pct(tick, 0) + ').' : ''));
    return w;
  }
  function heldShare(sym) { var r = SKT.row(sym); return r && (r.oC || r.oP) ? (r.oC || 0) / ((r.oC || 0) + (r.oP || 0)) : null; }
  function bizCell(sym) {
    var r = SKT.row(sym), w = el('span', 'vx-biz');
    var v = r ? r.biz : null;
    if (!isNum(v)) {
      var etf = r && r.ls && r.ls.indexOf('etf') >= 0;
      w.appendChild(el('span', 'mut', etf ? 'fund' : '–'));
      if (!etf) SKT.ui.tip(w, 'too few business numbers');
      return w;
    }
    var b = SKT.biz(v);
    w.appendChild(el('b', 'vx-bz b-' + b.band, String(Math.round(v))));
    w.appendChild(SKT.ui.meter(v, { w: 40 }));
    SKT.ui.tip(w, 'Business score ' + Math.round(v) + ' of 100: ' + b.word);
    return w;
  }


  function todOf(sym) { return typeof SKT.todayCP === 'function' ? SKT.todayCP(sym) : null; }
  function todShare(sym, side) {
    var t = todOf(sym);
    if (!t || t.share == null) return null;
    return side === 'P' ? 1 - t.share : t.share;
  }
  function todDay() { return SKT.D && SKT.D.latest ? fmt().dayShort(SKT.D.latest) : ''; }
  function todCell(sym, opts) {
    if (typeof SKT.todayCell === 'function') return SKT.todayCell(sym, opts);
    return el('span', 'mut', '–');
  }
  function todMini(sym) { return todCell(sym, { sub: false, label: 'Today', w: 56 }); }

  function todRatio(sym, opts) {
    opts = opts || {};
    var t = todOf(sym), w = el('span', 'vx-tdr' + (opts.cls ? ' ' + opts.cls : ''));
    if (!t) return null;
    if (opts.label !== false) w.appendChild(el('span', 'vx-tdk', (t.late ? fmt().dayShort(t.day) : opts.label || 'Today') + ' '));
    w.appendChild(el('b', t.late ? 'mut' : t.cls, t.txt));
    if (opts.tip !== false) SKT.ui.tip(w, t.tip);
    return w;
  }

  function todLegend(syms, lead) {
    var late = {}, f = fmt();
    syms.forEach(function (sym) { var t = todOf(sym); if (t && t.late) late[t.day] = 1; });
    var ds = Object.keys(late).sort();
    return el('p', 'src vx-tdsrc', lead + ' = calls : puts opened on the ' + todDay() + ' settle' +
      (ds.length ? '; muted = the ' + ds.map(function (d) { return f.dayShort(d); }).join(' / ') + ' reading while ' + todDay() + ' fills in' : '') + '.');
  }

  function tkTod(sym, side, opts) {
    opts = opts || {};
    var b = tk(sym, side, opts), t = todOf(sym);
    if (!t) return b;
    b.appendChild(el('span', 'vx-tkr ' + (t.late ? 'mut' : t.cls), t.txt));
    var head0 = opts.tip || nameOf(sym);
    SKT.ui.tip(b, (head0 ? head0 + ' · ' : '') + (t.late ? fmt().dayShort(t.day) : 'Today') + ' C : P ' + t.txt + '. ' + t.tip);
    return b;
  }



  function todCol(symOf, sideOf) {
    return { k: 'tod', label: 'Today C\u00a0:\u00a0P', sub: 'opened ' + todDay(), cls: 'vx-tdc',
      cardLabel: function (x) { var t = todOf(symOf(x)); return (t && t.late ? fmt().dayShort(t.day) : 'Today') + ' opened'; },
      tip: 'Calls : puts opened on the newest settle (' + todDay() + '), whatever the window; muted = the previous settle while the newest fills in',
      v: function (x) { return todShare(symOf(x), sideOf(x)); }, f: function (x) { return todCell(symOf(x), { w: 56, sub: false }); },
      cf: function (x) { return todCell(symOf(x), { w: 84 }); } };
  }

  function todLate(syms) { return syms.some(function (sym) { var t = todOf(sym); return !!(t && t.late); }); }

  function cpTxt(c, p) {
    c = +c || 0; p = +p || 0;
    if (c > 0 && p > 0) { var hi = Math.max(c, p), lo = Math.min(c, p); return fmt().ratio(c, p, hi / lo >= 10 ? 0 : 1); }
    return c > 0 ? 'calls only' : p > 0 ? 'puts only' : c || p ? 'both down' : 'no change';
  }
  function cpCls(c, p) { c = +c || 0; p = +p || 0; return c > 0 && p > 0 ? (c >= 2 * p ? 'up' : p >= 2 * c ? 'down' : '') : c > 0 ? 'up' : p > 0 ? 'down' : 'mut'; }
  function cpShare(c, p, side) { c = +c || 0; p = +p || 0; if (c + p <= 0) return null; return side === 'P' ? p / (c + p) : c / (c + p); }

  function cellsFor(sym, sessions, opts) {
    opts = opts || {};
    var r = SKT.row(sym), ses = (SKT.D && SKT.D.sessions) || [], idx = {};
    ses.forEach(function (x, i) { idx[x[0]] = i; });
    var cells = sessions.map(function (d) {
      var e = r && r.d && idx[d] != null ? r.d[idx[d]] : null, f = fmt();
      if (!e) return { l: null, day: d, tip: f.day(d) + ': no reading' };
      var lt = String(e[9] || ''), l = lt.indexOf('c') >= 0 ? 'c' : lt.indexOf('p') >= 0 ? 'p' : lt.indexOf('q') >= 0 ? 'q' :
        (e[4] > 0 ? 'c' : e[4] < 0 ? 'p' : 'q');
      return { l: l, t: e[6] === 'bought' ? 'B' : e[6] === 'sold' ? 'S' : '', pair: !!e[10], gold: lt.indexOf('g') >= 0, day: d,
        tip: f.day(d) + ': ' + f.sk(e[4]) + ' net (' + f.sk(e[2]) + ' calls · ' + f.sk(e[3]) + ' puts)' + (isNum(e[5]) ? ' · ' + f.spct(e[5]) + ' of its book' : '') };
    });
    return SKT.ui.dayCells(cells, { label: opts.label, onPick: function (d) { open(sym, d); }, cls: 'vx-dcs' });
  }
  function sessionsOf(w) {
    var D = SKT.D, p = D && D.periods && D.periods[w];
    if (!p) return [];
    return (D.sessions || []).map(function (x) { return x[0]; }).filter(function (d) { return d >= p.since && d <= p.to; });
  }


  function sortState() { return { k: SKT.S.so || '', dir: SKT.S.sd < 0 ? -1 : 1 }; }
  function onSort(k) {
    var S = SKT.S;
    if (!k) SKT.go({ so: '', sd: 1 });
    else if (k === S.so) SKT.go({ so: k, sd: S.sd < 0 ? 1 : -1 });
    else SKT.go({ so: k, sd: 1 });
  }
  function sortBy(rows, cols) {
    var st = sortState(), c = cols.filter(function (x) { return x.k && x.k === st.k && x.v; })[0];
    return c ? SKT.ui.sortRows(rows, c.v, st.dir) : rows;
  }


  function dual(cols, rows, opts) {
    opts = opts || {};
    var frag = el('div', 'vx-dual'), st = sortState();
    var list = sortBy(rows, cols);
    var hasSort = cols.some(function (c) { return c.k && c.k === st.k && c.v; });
    var hasTod = cols.some(function (c) { return c.k === 'tod' && c.cls === 'vx-tdc'; });
    var tbl = SKT.ui.table(cols, list, { sort: hasSort ? st : null, onSort: onSort, cls: 'vx-desk vx-tbl' + (hasTod ? ' vx-tdt' : ''), empty: opts.empty,
      rowCls: opts.rowCls });
    var ths = tbl.querySelectorAll('thead th');
    cols.forEach(function (c, i) { if (c.sub && ths[i]) ths[i].appendChild(el('small', 'vx-ths', c.sub)); });
    frag.appendChild(tbl);
    var cards = el('div', 'vx-cards');
    var sortable = cols.filter(function (c) { return c.k && c.v && c.sort !== false; });
    if (sortable.length > 1 && rows.length > 1) {
      var sb = el('div', 'vx-csort');
      var items = [{ k: '', label: opts.base || 'The ranking' }].concat(sortable.map(function (c) { return { k: c.k, label: c.label }; }));
      sb.appendChild(SKT.ui.select(items, hasSort ? st.k : '', function (k) { SKT.go({ so: k, sd: 1 }); }, { label: 'Sort', aria: 'Sort the cards' }));
      if (hasSort) {
        var fl = el('button', 'chip', st.dir < 0 ? '▲ low first' : '▼ high first'); fl.type = 'button';
        fl.addEventListener('click', function () { SKT.go({ sd: st.dir < 0 ? 1 : -1 }); });
        sb.appendChild(fl);
      }
      cards.appendChild(sb);
    }
    if (!list.length && opts.empty) cards.appendChild(emptyLine(opts.empty));
    capped(cards, list, opts.cardMax || 60, function (r) { return card(cols, r, opts); });
    frag.appendChild(cards);
    return frag;
  }
  function card(cols, r, opts) {
    var c = el('div', 'vx-card' + (opts.rowCls ? ' ' + (opts.rowCls(r) || '') : ''));
    var hd = el('div', 'vx-ch'), kv = el('div', 'vx-kv');
    cols.forEach(function (col) {
      if (col.card === 'skip') return;
      var v;
      try { v = col.cf ? col.cf(r) : col.f ? col.f(r) : col.v ? col.v(r) : null; } catch (e) { v = null; }
      if (v == null || v === '') return;
      if (col.card === 'head') { add(hd, typeof v === 'string' || typeof v === 'number' ? el('span', 'vx-chx', String(v)) : v); return; }
      if (col.card === 'wide') { add(c, add(el('div', 'vx-cw'), v)); return; }
      var kl = typeof col.cardLabel === 'function' ? col.cardLabel(r) : col.cardLabel;
      kv.appendChild(el('span', 'vx-k', kl || col.label));
      kv.appendChild(add(el('span', 'vx-v'), v));
    });
    c.insertBefore(hd, c.firstChild);
    if (kv.childNodes.length) c.appendChild(kv);
    return c;
  }


  function blockOk(b) { return !!b && typeof b === 'object' && (Array.isArray(b) ? b.length > 0 : Object.keys(b).length > 0); }
  function ensureViews() {
    if (SKT.VIEWS) return Promise.resolve(SKT.VIEWS);
    return SKT.loadViews().then(function (j) { vErr = null; return j; }, function (e) { vErr = (e && e.message) || 'error'; throw e; });
  }
  function refresh() {
    var S = SKT.S;
    if (!SKT.D || S.open) return;
    safe(bar);
    if (S.v) safe(function () { render(S.v, S.vp); });
  }
  var searchAsked = false, searchFail = false;
  function wantSearch() {
    if (SKT.SEARCH || searchAsked || !SKT.loadSearch) return;
    searchAsked = true;
    SKT.loadSearch().then(function () { searchAsked = false; searchFail = false; refresh(); },
      function () { searchFail = true; refresh();  });
  }
  SKT.on && SKT.on('data', function () { vErr = null; searchAsked = false; searchFail = false; });


  var DEFS = [
    { k: '', label: 'Board', short: 'Board', tip: 'The ranked list' },
    { k: 'changes', label: 'Changes', short: 'Changes', need: 'chg', tip: 'Who joined, left, moved or flipped side since the previous settle' },
    { k: 'days', label: 'Days ranked', short: 'Days', need: 'persist', tip: 'Every name ranked on any settle of the window, by how many settles it was ranked' },
    { k: 'crowds', label: 'Crowds', short: 'Crowds', need: 'crowds', tip: 'Sectors, industries and themes: how many members lean each way' },
    { k: 'map', label: 'Map', short: 'Map', tip: 'Every ranked name on one chart: how one-sided against how big for its own book' },
    { k: 'daily', label: 'Day by day', short: 'Daily', need: 'dbd', tip: 'The names whose leaning side opened most on each session' },
    { k: 'pre', label: 'Before the move', short: 'Before', need: 'pre', tip: 'Leaning one way on most of the last few sessions while the price stayed quiet' }
  ];
  function def(k) { return DEFS.filter(function (d) { return d.k === k; })[0] || null; }
  function offered(d) {
    if (!SKT.D) return false;
    if (d.k === '') return true;
    if (d.home) return !!(EXT.offer[d.k] && EXT.offer[d.k]());
    if (!d.need) return !!SKT.D.windows;
    if (!SKT.VIEWS) return !vErr;
    return blockOk(SKT.VIEWS[d.need]);
  }
  function pick(k) {
    var p = { v: k };
    if (SKT.S.dd) p.dd = '';
    if (k && !SKT.VIEWS && def(k) && def(k).need) ensureViews().then(null, function () {  });
    SKT.go(p);
  }
  function bar() {
    var box = SKT.$('viewBar');
    if (!box) return;
    box.textContent = '';
    if (!SKT.D) return;
    var S = SKT.S, items = [];
    DEFS.forEach(function (d) { if (offered(d)) items.push({ k: d.k, label: d.label, short: d.short, tip: d.tip }); });
    box.appendChild(SKT.ui.chips(items, S.v, pick, { cls: 'vx-bar', aria: 'Views' }));
    var cf = S.v ? null : crowd();
    if (cf) box.appendChild(cfChip(cf));
    EXT.bar.forEach(function (fn) { safe(fn, box); });
    EXT.board.forEach(function (fn) { safe(fn); });
  }


  var CF_KEY = 'sk.crowd', cfMemo = { key: null, val: null };
  function crowd() {
    var raw = SKT.store && SKT.store.sget(CF_KEY), o = null;
    if (!raw) return null;
    try { o = JSON.parse(raw); } catch (e) { return null; }
    if (!o || !/^(sec|ind|th):[a-z0-9-]+$/.test(String(o.id || ''))) return null;
    var D = SKT.D, key = o.id + '|' + (D ? D.generated : '') + '|' + (SKT.SEARCH ? 1 : 0);
    if (cfMemo.key === key) return cfMemo.val;
    var set = {}, n = 0;
    [D && D.rows, SKT.SEARCH && SKT.SEARCH.rows].forEach(function (rows) {
      if (!rows) return;
      Object.keys(rows).forEach(function (s) { var cw = rows[s] && rows[s].cw; if (cw && cw.indexOf(o.id) >= 0 && !set[s]) { set[s] = 1; n++; } });
    });
    cfMemo = { key: key, val: { id: o.id, label: String(o.label || o.id.replace(/^[a-z]+:/, '')), n: n, has: function (s) { return !!set[s]; } } };
    return cfMemo.val;
  }
  function setCrowd(c) {
    if (SKT.store) SKT.store.sset(CF_KEY, c ? JSON.stringify({ id: c.id, label: c.label }) : null);
    cfMemo.key = null;
  }
  function cfChip(cf) {
    var S = SKT.S, here = SKT.board && SKT.board.count ? SKT.board.count(S.w, S.side, S.list) : SKT.listOf(S.w, S.side, S.list).filter(cf.has).length;
    var w = el('span', 'vx-cf');
    w.appendChild(el('span', 'vx-cfk', 'Crowd'));
    w.appendChild(el('b', null, cf.label));
    w.appendChild(el('span', 'vx-cfn', here + ' on this list'));
    var x = el('button', 'vx-cfx', '×'); x.type = 'button';
    x.setAttribute('aria-label', 'Remove the crowd filter ' + cf.label);
    x.addEventListener('click', function () { setCrowd(null); SKT.go({}); });
    w.appendChild(x);
    SKT.ui.tip(w, 'The board shows only members of ' + cf.label + ' (for this visit). × removes the filter.');
    return w;
  }

  function render(v) {
    var box = SKT.$('view');
    if (!box || !SKT.D) return;
    box.textContent = '';
    var root = el('div', 'vx vx-' + (v || 'board'));
    box.appendChild(root);
    try { draw(v, root); } catch (e) { console.error('[skew] view ' + v, e); root.textContent = '–'; }
  }
  var RENDER = {};
  function draw(v, root) {
    var d = def(v);
    if (!d) return;
    if (d.home) { if (EXT.render[v]) EXT.render[v](root); return; }
    if (d.need && !SKT.VIEWS) { loading(root, v); return; }
    if (d.need && !blockOk(SKT.VIEWS[d.need])) {
      head(root, d.label, null);
      root.appendChild(SKT.ui.note('This build has no ' + d.label.toLowerCase() + ' data.', 'muted'));
      root.appendChild(backBtn());
      return;
    }
    RENDER[v](root, SKT.VIEWS || {});
  }
  function backBtn() {
    var b = el('button', 'linkbtn', '← Back to the board'); b.type = 'button';
    b.addEventListener('click', function () { SKT.go({ v: '' }); });
    return b;
  }
  function loading(root, v) {
    if (vErr) {
      root.appendChild(SKT.ui.note('Could not load the view data (' + vErr + ').', 'red'));
      var b = el('button', 'linkbtn', 'Try again'); b.type = 'button';
      b.addEventListener('click', function () { vErr = null; refresh(); });
      root.appendChild(b);
      root.appendChild(backBtn());
      return;
    }
    root.appendChild(el('p', 'empty', 'Loading…'));
    ensureViews().then(function () { if (SKT.S.v === v) refresh(); }, function () { if (SKT.S.v === v) refresh(); else safe(bar); });
  }


  RENDER.changes = function (root, V) {
    var S = SKT.S, f = fmt(), ui = SKT.ui, w = win(), ss = sides(), lst = listLabel();
    head(root, 'Changes since the last settle', 'Who joined ' + (w === '1d' ? 'today’s ' : 'the ' + SKT.winLabel(w).toLowerCase() + ' ') + sideWord(S.side) +
      ' list' + (lst ? ' (' + lst + ')' : '') + ', who left it and why, the biggest rank moves and who flipped side.');
    tapeNote(root);
    var c = V.chg && V.chg[w];
    if (!c || !V.prev) { root.appendChild(ui.note('No earlier settle to compare with on this window yet.', 'muted')); return; }
    root.appendChild(ui.note('Changes · ' + sideWord(S.side) + ' · ' + SKT.winLabel(w) + ' · ' + f.day(V.latest) + ' settle vs ' + f.day(V.prev), 'teal'));
    var J = [], LF = [], NJ = [], M = [], FL = [];
    ss.forEach(function (s) {
      ((c.joined || {})[s] || []).forEach(function (x) { if (x && inL(x[0])) J.push({ sym: x[0], r: x[1], s: s }); });
      ((c.left || {})[s] || []).forEach(function (x) { if (x && inL(x[0])) LF.push({ sym: x[0], pr: x[1], why: x[2], s: s }); });
      ((c.nj || {})[s] || []).forEach(function (x) { var sym = Array.isArray(x) ? x[0] : x; if (sym && inL(sym)) NJ.push({ sym: sym, s: s }); });
      ((c.moves || {})[s] || []).forEach(function (x) { if (x && inL(x[0])) M.push({ sym: x[0], pr: x[1], r: x[2], s: s, d: x[1] - x[2] }); });
    });
    (c.flipped || []).forEach(function (x) { if (x && inL(x[0]) && (ss.indexOf(x[1]) >= 0 || ss.indexOf(x[2]) >= 0)) FL.push({ sym: x[0], from: x[1], to: x[2] }); });
    J.sort(function (a, b) { return (a.r || 999) - (b.r || 999); });
    M.sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
    if (LF.concat(NJ).some(function (x) { return !SKT.row(x.sym); })) wantSearch();
    var both = ss.length > 1;

    var tiles = el('div', 'vx-tiles');
    tiles.appendChild(tile('Joined', '+' + J.length, 'new on the list since ' + f.dayShort(V.prev), 'up'));
    tiles.appendChild(tile('Left', '−' + LF.length, 'off the list now', 'down'));
    var bm = M[0];
    if (bm) {
      var bb = el('span', 'vx-bm'); bb.appendChild(symBtn(bm.sym)); bb.appendChild(el('span', null, ' #' + bm.pr + ' → #' + bm.r));
      tiles.appendChild(tile('Biggest rank move', bb, (bm.d > 0 ? '▲' + bm.d + ' places' : '▼' + (-bm.d) + ' places') + (both ? ' on ' + sideWord(bm.s) : '')));
    } else tiles.appendChild(tile('Biggest rank move', '–', 'no rank moved'));
    tiles.appendChild(tile('Flipped side', String(FL.length), FL.length ? FL.slice(0, 3).map(function (x) { return x.sym; }).join(' · ') : 'none'));
    root.appendChild(tiles);
    root.appendChild(todLegend(J.concat(LF, M, FL).map(function (x) { return x.sym; }), 'Today on each row'));
    var grid = el('div', 'vx-grid');

    var sj = section('Joined', J.length, 'vx-s-join', 'Ranked now, not on the list at the ' + f.dayShort(V.prev) + ' settle');
    if (!J.length) sj.appendChild(emptyLine('Nobody new.'));
    capped(sj, J, 40, function (x) {
      var li = el('div', 'vx-li');
      li.appendChild(el('span', 'vx-ok', '✓'));
      li.appendChild(el('span', 'vx-rk', isNum(x.r) ? '#' + x.r : ''));
      li.appendChild(stock(x.sym));
      if (both) li.appendChild(sidePill(x.s));
      li.appendChild(todMini(x.sym));
      return li;
    });
    grid.appendChild(sj);

    var sl = section('Left', LF.length, 'vx-s-left', 'On the list at the ' + f.dayShort(V.prev) + ' settle, not ranked now; the words say why now');
    if (!LF.length) sl.appendChild(emptyLine('Nobody left.'));
    capped(sl, LF, 40, function (x) {
      var li = el('div', 'vx-li vx-li2');
      li.appendChild(el('span', 'vx-no', '✕'));
      li.appendChild(el('span', 'vx-rk mut', isNum(x.pr) ? 'was #' + x.pr : ''));
      li.appendChild(stock(x.sym));
      if (both) li.appendChild(sidePill(x.s));
      li.appendChild(todMini(x.sym));
      if (x.why) li.appendChild(el('span', 'vx-why', x.why));
      return li;
    });
    grid.appendChild(sl);

    var sm = section('Still ranked · biggest moves', M.length, 'vx-s-move', 'Ranked on both settles: the largest changes of place');
    if (!M.length) sm.appendChild(emptyLine('No rank moved.'));
    M.forEach(function (x) {
      var li = el('div', 'vx-li');
      li.appendChild(moveMark(x.d));
      li.appendChild(stock(x.sym));
      if (both) li.appendChild(sidePill(x.s));
      li.appendChild(el('span', 'vx-rr', '#' + x.pr + ' → #' + x.r));
      li.appendChild(todMini(x.sym));
      sm.appendChild(li);
    });
    grid.appendChild(sm);

    var sf = section('Flipped side', FL.length, 'vx-s-flip', 'Ranked on one side at the previous settle and on the other side now');
    if (!FL.length) sf.appendChild(emptyLine('Nobody flipped.'));
    FL.forEach(function (x) {
      var li = el('div', 'vx-li');
      li.appendChild(stock(x.sym));
      var t = el('span', 'vx-rr');
      t.appendChild(el('span', x.from === 'P' ? 'down' : 'up', sideWord(x.from)));
      t.appendChild(document.createTextNode(' → '));
      t.appendChild(el('span', x.to === 'P' ? 'down' : 'up', sideWord(x.to)));
      li.appendChild(t);
      li.appendChild(todMini(x.sym));
      sf.appendChild(li);
    });
    grid.appendChild(sf);
    root.appendChild(grid);

    if (NJ.length) {
      var sn = section('Not judged today', NJ.length, 'vx-s-nj vx-wide', 'On the list at the previous settle, with no reading on the newest one yet');
      sn.appendChild(el('p', 'src', 'On the list at the ' + f.dayShort(V.prev) + ' settle with no reading on the newest settle yet (it may still be filling in), so not judged.'));
      sn.appendChild(todLegend(NJ.map(function (x) { return x.sym; }), 'The ratio on a chip'));
      var chips = el('div', 'vx-tks');
      capped(chips, NJ, 80, function (x) { return tkTod(x.sym, x.s); });
      sn.appendChild(chips);
      root.appendChild(sn);
    }
  };


  var SPANS = [['1w', '1 week'], ['1m', '1 month'], ['all', 'Total']];
  RENDER.days = function (root, V) {
    var S = SKT.S, f = fmt(), ui = SKT.ui, P = V.persist || {}, D = SKT.D, ss = sides();
    var avail = SPANS.filter(function (x) { return P[x[0]] && Array.isArray(P[x[0]].days) && P[x[0]].days.length; });
    if (!avail.length) { head(root, 'Days ranked', null); root.appendChild(ui.note('This build has no days-ranked data.', 'muted')); return; }
    var sp = avail.filter(function (x) { return x[0] === S.vp; })[0] || avail.filter(function (x) { return x[0] === S.w; })[0] || avail[0];
    var blk = P[sp[0]], days = blk.days, newest = days[days.length - 1];
    function entries(b, s) { return (b[s] || []).filter(function (e) { return e && inL(e[0]); }).map(function (e, i) { return { e: e, s: s, i: i }; }); }
    head(root, 'Days ranked', 'Every name ranked on any settle of the span, ordered by how many settles it was ranked. Each settle is read on its own ' +
      sp[1].toLowerCase() + ' list.');
    var items = avail.map(function (x) {
      var n = 0; ss.forEach(function (s) { n += entries(P[x[0]], s).length; });
      return { k: x[0], label: x[1], n: n };
    });
    root.appendChild(ui.chips(items, sp[0], function (k) { SKT.go({ vp: k }); }, { label: 'Span', cls: 'vx-vp' }));
    var per = D.periods && D.periods[sp[0]], short = per && isNum(per.n) && days.length < per.n;
    root.appendChild(ui.note('Days ranked · ' + sideWord(S.side) + ' · the ' + sp[1].toLowerCase() + ' span: ' + f.day(days[0]) + ' → ' + f.day(newest) +
      ', ' + days.length + ' settle' + (days.length === 1 ? '' : 's') +
      (short ? ' (' + days.length + ' of the window’s ' + per.n + ' sessions have a saved ranking, from ' + f.dayShort(days[0]) + ')' : ''), short ? 'amber' : 'purple'));
    var rows = [];
    ss.forEach(function (s) { rows = rows.concat(entries(blk, s)); });
    if (rows.some(function (x) { return !SKT.row(x.e[0]); })) wantSearch();
    var tdSyms = rows.map(function (x) { return x.e[0]; });
    if (todLate(tdSyms)) root.appendChild(todLegend(tdSyms, 'Today C : P'));
    var both = ss.length > 1;
    function cnt(x) { return (x.e[1] || []).reduce(function (a, b) { return a + (b ? 1 : 0); }, 0); }
    function status(x) {
      var last = x.e[3], first = x.e[2];
      if (first === newest) return ['NEW', 'gold', 3];
      if (last === newest) return ['RANKED', x.s === 'P' ? 'red' : 'green', 2];
      var i = days.indexOf(last), nx = i >= 0 && days[i + 1] ? days[i + 1] : null;
      return ['LEFT ' + (nx ? f.dayShort(nx).toUpperCase() : ''), 'muted', 1];
    }
    function since(x) {
      var r = SKT.row(x.e[0]), px0 = x.e[4], px = r ? r.px : null;
      return isNum(px0) && isNum(px) && px0 > 0 ? px / px0 - 1 : null;
    }
    var cols = [
      { k: '', label: '#', card: 'head', f: function (x) { return el('span', 'vx-rk', String(x.i + 1)); } },
      { k: 'stk', label: 'Stock', card: 'head', v: function (x) { return x.e[0]; }, f: function (x) { return stock(x.e[0]); } },
      { k: 'now', label: 'Now', card: 'head', v: function (x) { return status(x)[2]; }, f: function (x) { var st = status(x); return ui.pill(st[0], st[1]); } },
      both ? { k: 'sd', label: 'Side', card: 'head', v: function (x) { return x.s; }, f: function (x) { return sidePill(x.s); } } : null,
      { k: 'ds', label: 'Each settle', sort: false, card: 'wide', f: function (x) {
        var cells = days.map(function (d, i) {
          var on = !!(x.e[1] && x.e[1][i]);
          return { l: on ? (x.s === 'P' ? 'p' : 'c') : 'q', day: d, today: d === newest, tip: f.day(d) + (on ? ': ranked' : ': not ranked') };
        });
        return ui.dayCells(cells, { cls: 'vx-ds', onPick: function (d) { open(x.e[0], d); } });
      } },
      { k: 'n', label: 'Ranked', num: true, v: cnt, f: function (x) { return cnt(x) + ' of ' + days.length + (x.e[2] ? ' · first ' + f.dayShort(x.e[2]) : ''); } },
      { k: 'ret', label: 'Since its first day', num: true, v: since, f: function (x) {
        var r = SKT.row(x.e[0]), px0 = x.e[4], ch = since(x), w2 = el('span', 'vx-since');
        if (!isNum(px0)) return '–';
        w2.appendChild(el('span', 'mut', f.money(px0) + ' → ' + (r && isNum(r.px) ? f.money(r.px) : '–') + ' '));
        if (isNum(ch)) w2.appendChild(el('b', (x.s === 'P' ? ch < 0 : ch > 0) ? 'up' : ch === 0 ? 'mut' : 'down', f.spct(ch)));
        ui.tip(w2, 'Close on ' + f.day(x.e[2]) + ' (its first ranked day) → the latest close; green when the price moved with the ' + sideWord(x.s));
        return w2;
      } },
      { k: 'hit', label: 'Main strike', num: true, v: function (x) { return x.e[7] ? 1 : isNum(x.e[8]) ? -x.e[8] : null; }, f: function (x) {
        var mk = x.e[5], ex = x.e[6], w3 = el('span', 'vx-hit');
        if (!isNum(mk)) return '–';
        w3.appendChild(el('span', 'mut', f.strike(mk) + (x.s === 'P' ? 'P' : 'C') + (ex ? ' ' + f.exp(ex) : '') + ' · '));
        if (x.e[7]) w3.appendChild(el('b', 'up', '✓ touched ' + f.dayShort(x.e[7])));
        else if (isNum(x.e[8])) w3.appendChild(el('b', null, f.pct(x.e[8]) + ' short'));
        ui.tip(w3, 'The window’s main contract now (' + (x.s === 'P' ? 'Below ' : 'Above ') + f.strike(mk) + (ex ? ' by ' + f.exp(ex, ' ') : '') +
          '): touched = the price reached it at or after its first ranked day; short = how far it still has to go');
        return w3;
      } },
      todCol(function (x) { return x.e[0]; }, function (x) { return x.s; }),
      { k: 'held', label: 'Held calls : puts', num: true, v: function (x) { return heldShare(x.e[0]); }, f: function (x) { return heldCell(x.e[0], x.e[9]); } },
      { k: 'biz', label: 'Business', num: true, v: function (x) { var r = SKT.row(x.e[0]); return r ? r.biz : null; }, f: function (x) { return bizCell(x.e[0]); } }
    ].filter(Boolean);
    root.appendChild(dual(cols, rows, { empty: 'No name on this list was ranked in the span.', base: 'Days ranked' }));
  };


  var KINDS = [['sec', 'sector', 'Sectors'], ['ind', 'industry', 'Industries'], ['th', 'theme', 'Themes']];
  var WORD_CLS = { 'calls rising': 'cr', 'calls fading': 'cf', 'puts rising': 'pr', 'puts fading': 'pf' };
  var QD = { holder: null, list: [], w: '1w', sel: null, hov: null, pts: [], geo: null, ro: null, cross: null };
  var ABBR = { 'Consumer Discretionary': 'Discretionary', 'Consumer Staples': 'Staples', 'Communication Services': 'Comm services',
    'Information Technology': 'Tech', 'Health Care': 'Health care', 'Real Estate': 'Real estate' };
  function shortLabel(s) {
    s = String(s || '');
    if (ABBR[s]) return ABBR[s];
    if (s.length <= 18) return s;
    var cut = s.slice(0, 17), i = cut.lastIndexOf(' ');
    return (i > 8 ? cut.slice(0, i) : cut).replace(/[ &,]+$/, '') + '…';
  }


  var CT = { key: null, by: {} };
  function crowdToday(id) {
    var D = SKT.D, ready = !!SKT.SEARCH || searchFail, key = (D ? D.generated : '') + '|' + (SKT.SEARCH ? 1 : 0) + '|' + (searchFail ? 1 : 0);
    if (!ready) return undefined;
    if (CT.key !== key) {
      CT = { key: key, by: {} };
      var seen = {};
      [D && D.rows, SKT.SEARCH && SKT.SEARCH.rows].forEach(function (rows) {
        if (!rows) return;
        Object.keys(rows).forEach(function (sym) {
          var cw = rows[sym] && rows[sym].cw;
          if (seen[sym] || !Array.isArray(cw) || !cw.length) return;
          seen[sym] = 1;
          var t = todOf(sym);
          cw.forEach(function (cid) {
            var o = CT.by[cid] || (CT.by[cid] = { c: 0, p: 0, n: 0, lc: 0, lp: 0, ln: 0, lday: null, tot: 0 });
            o.tot++;
            if (!t) return;
            if (t.late) { o.lc += t.c; o.lp += t.p; o.ln++; if (!o.lday || t.day > o.lday) o.lday = t.day; }
            else { o.c += t.c; o.p += t.p; o.n++; }
          });
        });
      });
    }
    return CT.by[id] || null;
  }
  function crowdTodShare(c, side) {
    var o = crowdToday(c.id);
    if (!o) return null;
    return o.n ? cpShare(o.c, o.p, side) : o.ln ? cpShare(o.lc, o.lp, side) : null;
  }
  function crowdTodCell(c) {
    var f = fmt(), ui = SKT.ui, d = el('div', 'vx-c-tod'), o = crowdToday(c.id), L = SKT.D && SKT.D.latest;
    d.appendChild(el('span', 'vx-k', 'Today C : P'));
    if (o === undefined) { d.appendChild(el('span', 'mut', '…')); return d; }
    if (!o || (!o.n && !o.ln)) { d.appendChild(el('span', 'mut', '–')); ui.tip(d, f.day(L) + ': no member reading yet'); return d; }
    var late = !o.n, cc = late ? o.lc : o.c, pp = late ? o.lp : o.p, day = late ? o.lday : L;
    var v = el('span', 'vx-ctv');
    if (late) v.appendChild(el('span', 'vx-tdk', f.dayShort(day) + ' '));
    v.appendChild(el('b', late ? 'mut' : cpCls(cc, pp), cpTxt(cc, pp)));
    d.appendChild(v);
    d.appendChild(ui.splitBar(cc, pp, { w: 84, mid: true, thin: late }));
    d.appendChild(el('small', 'sub', f.sk(cc) + ' C · ' + f.sk(pp) + ' P'));
    if (late) d.appendChild(el('small', 'sub v2', f.dayShort(day) + ' · ' + f.dayShort(L) + ' not in yet'));
    else if (o.ln) d.appendChild(el('small', 'sub v2', o.n + ' of ' + (o.n + o.ln) + ' in'));
    if (late) d.classList.add('late');
    ui.tip(d, 'Calls : puts opened on the ' + f.day(day) + ' settle, summed over ' + (late ? o.ln : o.n) + ' of the ' + o.tot + ' members read: ' +
      f.sk(cc) + ' calls · ' + f.sk(pp) + ' puts, every expiry still open.' +
      (late ? ' ' + f.day(L) + ' has not landed for any member yet.' : o.ln ? ' ' + o.ln + ' more members have not landed yet and are left out.' : ''));
    return d;
  }
  RENDER.crowds = function (root, V) {
    var S = SKT.S, f = fmt(), ui = SKT.ui, w = win(), ss = sides(), all = (V.crowds || []).filter(Boolean);
    wantSearch();
    var avail = KINDS.filter(function (k) { return all.some(function (c) { return c.kind === k[1]; }); });
    head(root, 'Crowds', 'Sectors, industries and themes: how many members lean ' + (S.side === 'B' ? 'each way' : 'to ' + sideWord(S.side)) +
      ' on the ' + SKT.winLabel(w).toLowerCase() + ' window, and how big the crowd’s net build is against its combined book.');
    tapeNote(root);
    if (!avail.length) { root.appendChild(ui.note('This build has no crowd data.', 'muted')); return; }
    var kp = avail.filter(function (k) { return k[0] === S.vp; })[0] || avail[0];
    var ctl = el('div', 'vx-ctl');
    ctl.appendChild(ui.chips(avail.map(function (k) {
      return { k: k[0], label: k[2], n: all.filter(function (c) { return c.kind === k[1]; }).length };
    }), kp[0], function (k) { SKT.go({ vp: k }); }, { cls: 'vx-vp', aria: 'Crowd kind' }));
    ctl.appendChild(SKT.winSeg({ cls: 'vx-wseg' }));
    root.appendChild(ctl);
    var list = all.filter(function (c) { return c.kind === kp[1]; });
    function lean(c, s) { var a = c.lean && c.lean[w]; return a ? (a[s === 'P' ? 1 : 0] || 0) : 0; }
    function mem(c) { var n = 0; ss.forEach(function (s) { n += lean(c, s); }); return n; }

    var qwrap = el('div', 'vx-qwrap');
    var qbox = el('div', 'vx-sec vx-quad');
    qbox.appendChild(el('h3', 'vx-sh', 'Where each crowd stands · ' + SKT.winLabel(w)));
    var holder = el('div', 'vx-qh'); qbox.appendChild(holder);
    var ro = el('p', 'vx-ro'); qbox.appendChild(ro);
    qwrap.appendChild(qbox);
    var who = el('div', 'vx-sec vx-who');
    who.appendChild(el('h3', 'vx-sh', 'Who is where'));
    [['calls rising', 'Calls rising', 'cr'], ['calls fading', 'Calls fading', 'cf'], ['puts rising', 'Puts rising', 'pr'], ['puts fading', 'Puts fading', 'pf']].forEach(function (q) {
      var ws = list.filter(function (c) { return c.word && c.word[w] === q[0]; }).sort(function (a, b) { return ((a.rank || {})[w] || 99) - ((b.rank || {})[w] || 99); });
      var line = el('div', 'vx-wl');
      line.appendChild(el('span', 'vx-q q-' + q[2], q[1]));
      var names = el('span', 'vx-wn');
      if (!ws.length) names.appendChild(el('span', 'mut', 'none'));
      ws.forEach(function (c) {
        var b = el('button', 'vx-cl', c.label); b.type = 'button';
        b.addEventListener('click', function () { focusCrowd(c.id); });
        names.appendChild(b);
      });
      line.appendChild(names);
      who.appendChild(line);
    });
    var noLvl = list.filter(function (c) { return !(c.lvl && isNum(c.lvl[w])); }).length;
    who.appendChild(el('p', 'src', 'Across: the call share of the crowd’s ranked names (right = more of them lean calls). Up and down: that share’s change ' +
      'against a week earlier. Dot size = tracked members.' + (noLvl ? ' ' + noLvl + ' with no ranked member this window are not drawn.' : '')));
    qwrap.appendChild(who);
    root.appendChild(qwrap);
    QD.holder = holder; QD.list = list; QD.w = w; QD.ro = ro;
    if (QD.sel && !list.some(function (c) { return c.id === QD.sel; })) QD.sel = null;
    drawQuad();
    quadEvents(holder);

    var cols = [
      { k: '', label: '#', f: function (c) { return el('span', 'vx-rk', isNum((c.rank || {})[w]) ? '#' + c.rank[w] : '–'); } },
      { k: 'stk', label: 'Crowd', v: function (c) { return c.label; } },
      { k: 'mem', label: 'Members leaning', v: mem },
      { k: 'net', label: 'Crowd net', v: function (c) { var p = (c.pct || {})[w]; return isNum(p) ? (S.side === 'P' ? -p : p) : null; } },
      { k: 'shr', label: 'Share leaning', v: function (c) { var a = (c.share || {})[w]; if (!a) return null; var n = 0; ss.forEach(function (s) { n += a[s === 'P' ? 1 : 0] || 0; }); return n; } },
      { k: 'med', label: 'Median', tip: 'The middle member’s net build as a share of its own book', v: function (c) { var p = (c.med || {})[w]; return isNum(p) ? (S.side === 'P' ? -p : p) : null; } },
      { k: 'tod', label: 'Today C : P', tip: 'Calls : puts opened on the newest settle (' + todDay() + '), summed over the crowd’s members', v: function (c) { return crowdTodShare(c, S.side === 'P' ? 'P' : 'C'); } },
      { k: 'spk', label: 'Each session', tip: 'The crowd’s daily net as a share of its book, last 21 sessions', sort: false },
      { k: 'wd', label: 'Moving', sort: false }
    ];
    var st = sortState(), sorted = list.slice().sort(function (a, b) { return ((a.rank || {})[w] || 999) - ((b.rank || {})[w] || 999); });
    if (st.k && cols.some(function (c) { return c.k === st.k && c.v; })) sorted = sortBy(sorted, cols);
    var memSyms = [];
    sorted.forEach(function (c) { ss.forEach(function (s) { (((c.syms || {})[w] || {})[s] || []).forEach(function (sym) { if (inL(sym)) memSyms.push(sym); }); }); });
    var th = el('div', 'vx-ctl vx-ctl2');
    th.appendChild(el('h3', 'vx-sh', 'Crowds ranked · ' + SKT.winLabel(w)));
    th.appendChild(SKT.winSeg({ cls: 'vx-wseg' }));
    root.appendChild(th);
    root.appendChild(todLegend(memSyms, 'Today C : P (summed over each crowd’s members) and the ratio on a member chip'));
    var sec = el('div', 'vx-crowds');
    var crh = SKT.ui.hdrSort(cols, st.k, st.dir, onSort, { cls: 'vx-crh' }), ti = cols.map(function (c) { return c.k; }).indexOf('tod');
    if (ti >= 0 && crh.children[ti]) crh.children[ti].appendChild(el('small', 'vx-ths', 'opened ' + todDay()));
    sec.appendChild(crh);
    sorted.forEach(function (c) { sec.appendChild(crowdRow(c, w, ss)); });
    root.appendChild(sec);
  };
  function crowdRow(c, w, ss) {
    var f = fmt(), ui = SKT.ui, row = el('div', 'vx-crow');
    row.dataset.crowd = c.id;
    if (QD.sel === c.id) row.classList.add('sel');
    var rk = el('div', 'vx-c-rk');
    var r = (c.rank || {})[w], p0 = (c.prk || {})[w];
    rk.appendChild(el('b', null, isNum(r) ? '#' + r : '–'));
    if (isNum(r) && isNum(p0)) { var mv = moveMark(p0 - r); ui.tip(mv, 'Rank by the size of the crowd’s net build: #' + p0 + ' at the previous settle → #' + r + ' now'); rk.appendChild(mv); }
    row.appendChild(rk);
    var nm = el('div', 'vx-c-nm');
    nm.appendChild(el('b', null, c.label));
    nm.appendChild(el('span', 'mut', (isNum(c.n) ? c.n.toLocaleString('en-US') + ' tracked' : '') + (c.kind ? ' · ' + c.kind : '')));
    var go = el('button', 'linkbtn vx-cgo', 'Show on the board ›'); go.type = 'button';
    ui.tip(go, 'Filter the board to the members of ' + c.label + ' (for this visit; × on the chip removes it)');
    go.addEventListener('click', function () {
      setCrowd({ id: c.id, label: c.label });
      SKT.go({ v: '' });
    });
    nm.appendChild(go);
    row.appendChild(nm);
    var memb = el('div', 'vx-c-mem');
    ss.forEach(function (s) {
      var syms = ((c.syms || {})[w] || {})[s] || [], n = ((c.lean || {})[w] || [0, 0])[s === 'P' ? 1 : 0] || 0;
      var line = el('div', 'vx-c-ml');
      line.appendChild(el('span', 'vx-c-n ' + (s === 'P' ? 'down' : 'up'), n + ' ' + (s === 'P' ? 'put' : 'call') + (n === 1 ? '' : 's')));
      var shown = syms.filter(inL);
      shown.forEach(function (sym) { line.appendChild(tkTod(sym, s, { on: true })); });
      if (n > syms.length) line.appendChild(el('span', 'mut vx-c-more', '+' + (n - syms.length) + ' more'));
      if (!n) line.appendChild(el('span', 'mut', 'none ranked'));
      memb.appendChild(line);
    });
    row.appendChild(memb);
    function numCell(cls, label, v, tipText, signed) {
      var d = el('div', cls);
      d.appendChild(el('span', 'vx-k', label));
      var b = el('b', isNum(v) && signed ? (v > 0 ? 'up' : v < 0 ? 'down' : '') : '', isNum(v) ? (signed ? f.spct(v) : f.pct(v, 1)) : '–');
      d.appendChild(b);
      if (tipText) ui.tip(d, tipText);
      return d;
    }
    row.appendChild(numCell('vx-c-net', 'Crowd net', (c.pct || {})[w], 'Net calls minus net puts opened by the members over the window, as a share of their combined open interest', true));
    var shr = (c.share || {})[w], sh = el('div', 'vx-c-shr');
    sh.appendChild(el('span', 'vx-k', 'Share leaning'));
    ss.forEach(function (s) {
      var v = shr ? shr[s === 'P' ? 1 : 0] : null;
      sh.appendChild(el('b', s === 'P' ? 'down' : 'up', isNum(v) ? f.pct(v, 1) + (ss.length > 1 ? (s === 'P' ? ' P' : ' C') : '') : '–'));
    });
    ui.tip(sh, 'Share of the crowd’s tracked members ranked on ' + sideWord(ss.length > 1 ? 'B' : ss[0]) + ' in this window');
    row.appendChild(sh);
    row.appendChild(numCell('vx-c-med', 'Median member', (c.med || {})[w], 'The middle member’s net build as a share of its own book', true));
    row.appendChild(crowdTodCell(c));
    var sp = el('div', 'vx-c-spk');
    if (Array.isArray(c.spark) && c.spark.length) {
      sp.appendChild(ui.spark(c.spark, { w: 126, h: 26 }));
      ui.tip(sp, 'The crowd’s net as a share of its book on each of the last ' + c.spark.length + ' sessions (green = calls led, red = puts led)');
    }
    row.appendChild(sp);
    var wd = el('div', 'vx-c-wd'), word = (c.word || {})[w];
    if (word) wd.appendChild(el('span', 'vx-q q-' + (WORD_CLS[word] || ''), word));
    row.appendChild(wd);
    row.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      QD.sel = c.id; markQuad();
      Array.prototype.forEach.call(document.querySelectorAll('.vx-crow.sel'), function (n) { n.classList.remove('sel'); });
      row.classList.add('sel');
    });
    return row;
  }
  function focusCrowd(id) {
    QD.sel = id; markQuad();
    var n = null;
    Array.prototype.forEach.call(document.querySelectorAll('.vx-crow'), function (x) { x.classList.toggle('sel', x.dataset.crowd === id); if (x.dataset.crowd === id) n = x; });
    if (n) n.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function drawQuad() {
    var h = QD.holder;
    if (!h || !h.isConnected) return;
    var Wraw = h.clientWidth;
    if (!Wraw) return;
    var sv = SKT.svg, W = Math.max(260, Math.round(Wraw)), phone = W < 560;
    var H = phone ? Math.round(W * 0.92) : Math.round(Math.min(440, Math.max(300, W * 0.6)));
    var L = phone ? 38 : 50, R = 10, T = 18, B = phone ? 38 : 40, pw = W - L - R, ph = H - T - B, w = QD.w;
    var pts = [], ymax = 0.1, nmax = 1;
    QD.list.forEach(function (c) {
      var x = c.lvl && c.lvl[w], y = c.chg && c.chg[w];
      if (!isNum(x) || !isNum(y)) return;
      pts.push({ c: c, x: x, y: y });
      ymax = Math.max(ymax, Math.abs(y)); nmax = Math.max(nmax, c.n || 1);
    });
    ymax = Math.ceil(ymax * 1.18 * 20) / 20;
    var X = sv.scale(-0.035, 1.035, L, L + pw), Y = sv.scale(-ymax, ymax, T + ph, T);
    h.textContent = '';
    var s = sv.root(W, H, { 'class': 'vx-qsvg', role: 'img', 'aria-label': 'Crowd quadrant: call share across, its change up and down' });
    var mx = X(0.5), my = Y(0);
    sv.rect(mx, T, L + pw - mx, my - T, { 'class': 'qb q-cr' }, s);
    sv.rect(mx, my, L + pw - mx, T + ph - my, { 'class': 'qb q-cf' }, s);
    sv.rect(L, my, mx - L, T + ph - my, { 'class': 'qb q-pr' }, s);
    sv.rect(L, T, mx - L, my - T, { 'class': 'qb q-pf' }, s);
    sv.axis(s, { dir: 'x', min: -0.035, max: 1.035, from: L, to: L + pw, at: T + ph, values: [0, 0.25, 0.5, 0.75, 1], fmt: function (v) { return Math.round(v * 100) + '%'; }, grid: [T, T + ph] });
    sv.axis(s, { dir: 'y', min: -ymax, max: ymax, from: T + ph, to: T, at: L, ticks: phone ? 4 : 6, grid: [L, L + pw],
      fmt: function (v) { var t = Math.round(Math.abs(v) * 100); return (t === 0 ? '' : v > 0 ? '+' : '−') + t; } });
    sv.line(mx, T, mx, T + ph, { 'class': 'qmid' }, s);
    sv.line(L, my, L + pw, my, { 'class': 'qmid' }, s);
    var fs = 11, cw2 = function (t) { return sv.measure(t, '700 10.5px -apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif') + 8; };
    sv.text(L + pw - 6, T + fs + 3, 'CALLS RISING', { 'class': 'qlab q-cr', 'text-anchor': 'end' }, s);
    sv.text(L + pw - 6, T + ph - 6, 'CALLS FADING', { 'class': 'qlab q-cf', 'text-anchor': 'end' }, s);
    sv.text(L + 6, T + ph - 6, 'PUTS RISING', { 'class': 'qlab q-pr' }, s);
    sv.text(L + 6, T + fs + 3, 'PUTS FADING', { 'class': 'qlab q-pf' }, s);
    var corners = [{ x: L + pw - 6 - cw2('CALLS RISING'), y: T + 2, w: cw2('CALLS RISING'), h: fs + 4 }, { x: L + pw - 6 - cw2('CALLS FADING'), y: T + ph - fs - 8, w: cw2('CALLS FADING'), h: fs + 4 },
      { x: L + 2, y: T + ph - fs - 8, w: cw2('PUTS RISING'), h: fs + 4 }, { x: L + 2, y: T + 2, w: cw2('PUTS FADING'), h: fs + 4 }];
    sv.text(L + pw / 2, H - 6, phone ? 'call share of ranked names →' : 'call share of the crowd’s ranked names →', { 'class': 'qax', 'text-anchor': 'middle' }, s);
    if (!phone) sv.text(13, T + ph / 2, 'change vs a week earlier (pts)', { 'class': 'qax', 'text-anchor': 'middle', transform: 'rotate(-90 13 ' + (T + ph / 2) + ')' }, s);
    else sv.text(L, T - 6, '↑ change vs a week earlier (pts)', { 'class': 'qax' }, s);
    var g = sv.group({}, s), placed = corners.slice();
    pts.forEach(function (p) {
      p.qx = X(p.x); p.qy = Y(p.y);
      p.r = (phone ? 3 : 3.5) + Math.sqrt((p.c.n || 1) / nmax) * (phone ? 7 : 9);
    });
    pts.slice().sort(function (a, b) { return b.r - a.r; }).forEach(function (p) {
      var word = p.c.word && p.c.word[w];
      sv.el('circle', { cx: p.qx.toFixed(1), cy: p.qy.toFixed(1), r: p.r.toFixed(1), 'class': 'qd q-' + (WORD_CLS[word] || 'nn') }, g);
    });

    var lg = sv.group({ 'class': 'qlabs' }, s);
    pts.slice().sort(function (a, b) { return (b.c.n || 0) - (a.c.n || 0); }).forEach(function (p) {
      var t = shortLabel(p.c.label), tw = sv.measure(t, '600 ' + (phone ? 10.5 : 11.5) + 'px -apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif'), th = phone ? 12 : 13;
      var tries = [[p.qx + p.r + 3, p.qy - th / 2], [p.qx - p.r - 3 - tw, p.qy - th / 2], [p.qx - tw / 2, p.qy - p.r - 2 - th], [p.qx - tw / 2, p.qy + p.r + 2]];
      for (var i = 0; i < tries.length; i++) {
        var b = { x: tries[i][0], y: tries[i][1], w: tw, h: th };
        if (b.x < L + 2 || b.x + b.w > L + pw - 2 || b.y < T + 2 || b.y + b.h > T + ph - 2) continue;
        if (placed.some(function (o) { return b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y; })) continue;
        if (pts.some(function (o) { return o !== p && Math.abs(o.qx - (b.x + b.w / 2)) < b.w / 2 + o.r && Math.abs(o.qy - (b.y + b.h / 2)) < b.h / 2 + o.r * 0.6; })) continue;
        placed.push(b);
        sv.text(b.x, b.y + th - 2.5, t, { 'class': 'qtl' }, lg);
        return;
      }
    });
    QD.cross = sv.group({}, s);
    QD.pts = pts;
    QD.geo = { W: W, H: H };
    h.appendChild(s);
    markQuad();
  }
  function quadPick(cx, cy, mouse) {
    var g = QD.geo, h = QD.holder;
    if (!g || !h) return null;
    var rect = h.getBoundingClientRect(), k = g.W / (rect.width || g.W), x = (cx - rect.left) * k, y = (cy - rect.top) * k, best = null, bd = Infinity;
    QD.pts.forEach(function (p) { var d = Math.hypot(p.qx - x, p.qy - y) - p.r; if (d < bd) { bd = d; best = p; } });
    return bd <= (mouse ? 4 : 12) ? best : null;
  }
  function markQuad() {
    var cr = QD.cross;
    if (!cr) return;
    cr.textContent = '';
    var id = QD.hov || QD.sel, p = QD.pts.filter(function (q) { return q.c.id === id; })[0] || null;
    if (p) SKT.svg.el('circle', { cx: p.qx.toFixed(1), cy: p.qy.toFixed(1), r: (p.r + 4).toFixed(1), 'class': 'qsel' }, cr);
    var ro = QD.ro, f = fmt(), w = QD.w;
    if (!ro) return;
    ro.textContent = '';
    if (!p) {
      ro.appendChild(document.createTextNode(QD.pts.length + ' crowds drawn. ' + (hoverDev() ? 'Point at' : 'Tap') + ' a dot to read it here; ' +
        (hoverDev() ? 'click' : 'tap it again') + ' to find it in the list below.'));
      return;
    }
    var c = p.c, ln = (c.lean || {})[w] || [0, 0];
    ro.appendChild(el('b', 'vx-ro-n', c.label));
    ro.appendChild(document.createTextNode(' · ' + (isNum(c.n) ? c.n + ' tracked · ' : '') + (ln[0] || 0) + ' ranked on calls, ' + (ln[1] || 0) + ' on puts · ' +
      'call share of its ranked names ' + f.pct(p.x, 0) + ' · ' + (Math.round(Math.abs(p.y) * 100) === 0 ? '' : p.y > 0 ? '+' : '−') + Math.round(Math.abs(p.y) * 100) + ' pts vs a week earlier'));
    var word = (c.word || {})[w];
    if (word) { ro.appendChild(document.createTextNode(' · ')); ro.appendChild(el('span', 'vx-q q-' + (WORD_CLS[word] || ''), word)); }
    var o = crowdToday(c.id);
    if (o && (o.n || o.ln)) {
      var late = !o.n, cc = late ? o.lc : o.c, pp = late ? o.lp : o.p, t2 = el('span', 'vx-tdr');
      t2.appendChild(el('span', 'vx-tdk', (late ? f.dayShort(o.lday) : 'Today') + ' '));
      t2.appendChild(el('b', late ? 'mut' : cpCls(cc, pp), cpTxt(cc, pp)));
      t2.appendChild(el('span', 'mut', ' summed over ' + (late ? o.ln : o.n) + ' members'));
      ro.appendChild(document.createTextNode(' · '));
      ro.appendChild(t2);
    }
  }
  function hoverDev() { try { return matchMedia('(hover: hover)').matches; } catch (e) { return true; } }
  function quadEvents(h) {
    h.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var p = quadPick(e.clientX, e.clientY, true), id = p ? p.c.id : null;
      h.style.cursor = p ? 'pointer' : 'default';
      if (id !== QD.hov) { QD.hov = id; markQuad(); }
    });
    h.addEventListener('pointerleave', function () { if (QD.hov) { QD.hov = null; markQuad(); } });
    h.addEventListener('click', function (e) {
      var mouse = hoverDev(), p = quadPick(e.clientX, e.clientY, mouse);
      if (!p) { if (!mouse && QD.sel) { QD.sel = null; markQuad(); } return; }
      if (mouse || QD.sel === p.c.id) focusCrowd(p.c.id);
      else { QD.sel = p.c.id; markQuad(); }
    });
  }


  var GOLD_N = 10;
  var MP = { view: null, full: null, sel: null, hov: null, pts: [], geo: null, key: '', holder: null, ro: null, keyBox: null, zb: null, hint: null, cross: null, raf: false };
  function mapSide() { var vp = SKT.S.vp; return vp === 'C' || vp === 'P' ? vp : SKT.S.side; }
  function mapRows() {
    var w = win(), side = mapSide(), out = [], D = SKT.D;
    (side === 'B' ? ['C', 'P'] : [side]).forEach(function (s) {
      SKT.listOf(w, s, SKT.S.list).forEach(function (sym, i) {
        var r = D.rows && D.rows[sym], st = r && r.w && r.w[w];
        if (!st) return;
        var x = SKT.oneSided(st), y = Math.abs(st.pct);
        if (x == null || !isNum(y) || y <= 0) return;
        out.push({ sym: sym, s: s, i: i + 1, x: x, y: y, bk: r.bk, row: r, st: st, gold: i < GOLD_N });
      });
    });
    return out;
  }
  RENDER.map = function (root) {
    var S = SKT.S, ui = SKT.ui, w = win(), side = mapSide();
    head(root, 'Skew map', 'Each dot is a ranked name: further right = more one-sided, higher = a bigger net build against its own open interest (log scale). ' +
      'Dot size = its whole option book; gold = the top ' + GOLD_N + ' of the list.');
    tapeNote(root);
    var items = [
      { k: 'C', label: '▲ Calls', short: 'Calls', n: SKT.count(w, 'C', S.list), cls: 'c' },
      { k: 'P', label: '▼ Puts', short: 'Puts', n: SKT.count(w, 'P', S.list), cls: 'p' },
      { k: 'B', label: 'Both', n: SKT.count(w, 'C', S.list) + SKT.count(w, 'P', S.list) }
    ];
    var top = el('div', 'vx-mtop');
    top.appendChild(ui.seg(items, side, function (k) { if (k === 'B') SKT.go({ vp: '', side: 'B' }); else SKT.go({ vp: k }); }, { aria: 'Side on the map' }));
    var zb = el('div', 'vx-zb');
    [['out', '−', 'Zoom out'], ['in', '+', 'Zoom in'], ['reset', 'Reset', 'The whole map']].forEach(function (z) {
      var b = el('button', 'vx-zbtn' + (z[0] === 'reset' ? ' wide' : ''), z[1]); b.type = 'button';
      b.setAttribute('data-mz', z[0]); b.setAttribute('aria-label', z[2]);
      b.addEventListener('click', function () {
        var g = MP.geo; if (!g) return;
        if (z[0] === 'reset') mapSetView(null);
        else mapZoomAt(z[0] === 'in' ? 0.6 : 1 / 0.6, g.L + g.pw / 2, g.T + g.ph / 2);
      });
      zb.appendChild(b);
    });
    top.appendChild(zb);
    root.appendChild(top);
    var hint = el('p', 'vx-hint');
    root.appendChild(hint);
    var key = w + '|' + side + '|' + S.list + '|' + (SKT.D.generated || '');
    if (key !== MP.key) { MP.key = key; MP.view = null; MP.sel = null; MP.hov = null; }
    var holder = el('div', 'vx-mh');
    root.appendChild(holder);
    var ro = el('p', 'vx-ro');
    root.appendChild(ro);
    var keyBox = el('div', 'vx-mkey');
    root.appendChild(keyBox);
    var lg = el('p', 'vx-lg');
    [['c', 'leaning calls'], ['p', 'leaning puts'], ['g', 'the top ' + GOLD_N + ' of the list']].forEach(function (x) {
      if ((x[0] === 'c' && side === 'P') || (x[0] === 'p' && side === 'C')) return;
      var i = el('span', 'vx-lgi'); i.appendChild(el('i', 'vx-lgd ' + x[0])); i.appendChild(document.createTextNode(x[1])); lg.appendChild(i);
    });
    lg.appendChild(el('span', 'vx-lgi mut', 'bigger dot = bigger option book'));
    root.appendChild(lg);
    MP.holder = holder; MP.ro = ro; MP.keyBox = keyBox; MP.zb = zb; MP.hint = hint;
    drawMap();
    mapEvents(holder);
  };
  function mapClamp(v) {
    var F = MP.full;
    if (!F || !v) return null;
    var fx = F.x1 - F.x0, fy = F.y1 - F.y0;
    var kx = Math.max(0.04, Math.min(1, (v.x1 - v.x0) / fx)), ky = Math.max(0.04, Math.min(1, (v.y1 - v.y0) / fy));
    if (kx >= 0.999 && ky >= 0.999) return null;
    var cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2, sx = kx * fx, sy = ky * fy;
    var u = Math.max(0, Math.min(1 - kx, (cx - sx / 2 - F.x0) / fx)), q = Math.max(0, Math.min(1 - ky, (cy - sy / 2 - F.y0) / fy));
    var x0 = F.x0 + u * fx, y0 = F.y0 + q * fy;
    return { x0: x0, x1: x0 + sx, y0: y0, y1: y0 + sy };
  }
  function mapRequest() { if (MP.raf) return; MP.raf = true; requestAnimationFrame(function () { MP.raf = false; drawMap(); }); }
  function mapSetView(v) { MP.view = mapClamp(v); mapRequest(); }
  function mapZoomAt(f, px, py, from) {
    var g = MP.geo; if (!g) return;
    var V = from || MP.view || MP.full, ax = g.X.inv(px), ay = g.Y.inv(py);
    mapSetView({ x0: ax + (V.x0 - ax) * f, x1: ax + (V.x1 - ax) * f, y0: ay + (V.y0 - ay) * f, y1: ay + (V.y1 - ay) * f });
  }
  function mapPanBy(dx, dy, from) {
    var g = MP.geo, V = from || MP.view || MP.full; if (!g) return;
    var ddx = -dx * (V.x1 - V.x0) / g.pw, ddy = dy * (V.y1 - V.y0) / g.ph;
    mapSetView({ x0: V.x0 + ddx, x1: V.x1 + ddx, y0: V.y0 + ddy, y1: V.y1 + ddy });
  }
  function pctTick(v) { var p = v * 100; return (p >= 10 ? String(Math.round(p)) : p >= 1 ? String(+p.toFixed(1)) : String(+p.toFixed(2))) + '%'; }
  function drawMap() {
    var h = MP.holder;
    if (!h || !h.isConnected) return;
    var Wraw = h.clientWidth;
    if (!Wraw) return;
    var sv = SKT.svg, W = Math.max(260, Math.round(Wraw)), phone = W < 560;
    var H = phone ? Math.round(W * 1.02) : Math.round(Math.min(600, Math.max(380, W * 0.52)));
    var L = phone ? 40 : 58, R = phone ? 10 : 16, T = phone ? 22 : 14, B = phone ? 40 : 44, pw = W - L - R, ph = H - T - B;
    var rows = mapRows();
    h.textContent = '';
    if (!rows.length) { h.appendChild(emptyLine('No ranked name on this list to draw.')); MP.pts = []; MP.geo = null; mapMark(); return; }
    var xmin = 1, ymin = Infinity, ymax = 0, bmax = 1;
    rows.forEach(function (p) { xmin = Math.min(xmin, p.x); ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); bmax = Math.max(bmax, p.bk || 1); });
    MP.full = { x0: Math.max(0.5, Math.min(0.9, Math.floor((xmin - 0.03) * 20) / 20)), x1: 1.02, y0: Math.log10(ymin) - 0.15, y1: Math.log10(ymax) + 0.15 };
    MP.view = mapClamp(MP.view);
    var V = MP.view || MP.full, zoomed = !!MP.view;
    var X = sv.scale(V.x0, V.x1, L, L + pw), Y = sv.scale(V.y0, V.y1, T + ph, T);
    var s = sv.root(W, H, { 'class': 'vx-msvg', role: 'img', 'aria-label': 'Skew map: one-sided across, net as a share of its book up' });
    var cid = 'vxclip' + (++CLIP), defs = sv.el('defs', {}, s), cp = sv.el('clipPath', { id: cid }, defs);
    sv.rect(L - 9, T - 9, pw + 18, ph + 18, {}, cp);
    sv.rect(L, T, pw, ph, { 'class': 'vx-pane' }, s);

    var xs = sv.niceStep(V.x1 - V.x0, phone ? 4 : 7), lastX = -1e9;
    for (var xv = Math.ceil(V.x0 / xs - 1e-9) * xs; xv <= Math.min(1, V.x1) + 1e-9; xv += xs) {
      var px = X(xv);
      if (px < L - 0.5 || px > L + pw + 0.5) continue;
      sv.line(px, T, px, T + ph, { 'class': 'vx-grid' }, s);
      var lab = pctTick(Math.round(xv / xs) * xs), lw = sv.measure(lab);
      if (px - lw / 2 > lastX + 6) { sv.text(px, T + ph + 15, lab, { 'class': 'vx-tick', 'text-anchor': 'middle' }, s); lastX = px + lw / 2; }
    }

    var span = V.y1 - V.y0, ms = span < 0.8 ? [1, 1.5, 2, 3, 5, 7] : span < 2.2 ? [1, 2, 5] : [1, 3], lastY = 1e9, yv = [];
    for (var e = Math.floor(V.y0) - 1; e <= Math.ceil(V.y1); e++) ms.forEach(function (m) { var v = m * Math.pow(10, e), lv = Math.log10(v); if (lv >= V.y0 && lv <= V.y1) yv.push(v); });
    yv.sort(function (a, b) { return a - b; }).forEach(function (v) {
      var py = Y(Math.log10(v));
      sv.line(L, py, L + pw, py, { 'class': 'vx-grid' }, s);
      if (lastY - py >= 14) { sv.text(L - 6, py + 3.5, pctTick(v), { 'class': 'vx-tick', 'text-anchor': 'end' }, s); lastY = py; }
    });
    sv.text(L + pw / 2, H - 6, phone ? 'more one-sided →' : 'one-sided: share of the new contracts on the leaning side →', { 'class': 'vx-axw', 'text-anchor': 'middle' }, s);
    if (phone) sv.text(L, T - 8, '↑ net as a share of its book (log)', { 'class': 'vx-axw' }, s);
    else sv.text(15, T + ph / 2, 'net as a share of its own book (log) →', { 'class': 'vx-axw', 'text-anchor': 'middle', transform: 'rotate(-90 15 ' + (T + ph / 2) + ')' }, s);

    var dg = sv.group({ 'clip-path': 'url(#' + cid + ')' }, s), pts = [], rmin = phone ? 2.4 : 2.8, rmax = phone ? 8 : 11;
    rows.forEach(function (p) {
      p.qx = X(p.x); p.qy = Y(Math.log10(p.y)); p.dx = null; p.dy = null;
      p.r = rmin + Math.sqrt(Math.max(1, p.bk || 1) / bmax) * (rmax - rmin);
      if (p.gold) p.r = Math.max(p.r, phone ? 7 : 5.5);
      if (p.qx < L - 8 || p.qx > L + pw + 8 || p.qy < T - 8 || p.qy > T + ph + 8) return;
      pts.push(p);
    });
    pts.filter(function (p) { return !p.gold; }).sort(function (a, b) { return b.r - a.r; }).forEach(function (p) {
      sv.el('circle', { cx: p.qx.toFixed(1), cy: p.qy.toFixed(1), r: p.r.toFixed(1), 'class': 'vx-d ' + (p.s === 'P' ? 'p' : 'c') }, dg);
    });
    var golds = pts.filter(function (p) { return p.gold; }).sort(function (a, b) { return a.s === b.s ? a.i - b.i : a.s === 'C' ? -1 : 1; });
    golds.forEach(function (p, n) { p.no = n + 1; p.dx = p.qx; p.dy = p.qy; });

    if (phone) {
      var placedB = [];
      golds.forEach(function (p) {
        var free = function (x, y) { return placedB.every(function (q) { return Math.hypot(q.dx - x, q.dy - y) >= 2 * p.r; }); };
        if (!free(p.qx, p.qy)) {
          var dirs = [[-1, 1], [-1, -1], [-1, 0], [1, 1], [0, 1], [0, -1], [1, -1], [1, 0]], found = false;
          for (var k2 = 1; k2 <= 4 && !found; k2++) for (var di = 0; di < dirs.length && !found; di++) {
            var nrm = Math.hypot(dirs[di][0], dirs[di][1]), d0 = (2 * p.r + 2) * k2;
            var bx = p.qx + dirs[di][0] / nrm * d0, by = p.qy + dirs[di][1] / nrm * d0;
            if (bx < L + p.r || bx > L + pw - p.r || by < T + p.r || by > T + ph - p.r || !free(bx, by)) continue;
            p.dx = bx; p.dy = by; found = true;
          }
        }
        placedB.push(p);
      });
    }
    golds.slice().reverse().forEach(function (p) {
      if (p.dx !== p.qx || p.dy !== p.qy) {
        var ll = Math.hypot(p.dx - p.qx, p.dy - p.qy);
        sv.line(p.qx, p.qy, p.dx - (p.dx - p.qx) * p.r / ll, p.dy - (p.dy - p.qy) * p.r / ll, { 'class': 'vx-glead' }, dg);
        sv.el('circle', { cx: p.qx.toFixed(1), cy: p.qy.toFixed(1), r: 2.2, 'class': 'vx-gspot' }, dg);
      }
      sv.el('circle', { cx: p.dx.toFixed(1), cy: p.dy.toFixed(1), r: p.r.toFixed(1), 'class': 'vx-d g ' + (p.s === 'P' ? 'gp' : 'gc') }, dg);
      if (phone) sv.text(p.dx, p.dy + 3.3, String(p.no), { 'class': 'vx-gno', 'text-anchor': 'middle' }, dg);
    });

    if (!phone) {
      var lab2 = sv.group({}, s), placed = [];
      golds.forEach(function (p) {
        var t = p.sym, tw = sv.measure(t, '700 11.5px -apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif'), th = 13;
        var tries = [[p.qx + p.r + 4, p.qy - th / 2], [p.qx - p.r - 4 - tw, p.qy - th / 2], [p.qx - tw / 2, p.qy - p.r - 3 - th], [p.qx - tw / 2, p.qy + p.r + 3],
          [p.qx + p.r + 2, p.qy - p.r - th], [p.qx - p.r - 2 - tw, p.qy - p.r - th], [p.qx + p.r + 2, p.qy + p.r], [p.qx - p.r - 2 - tw, p.qy + p.r]];
        for (var i = 0; i < tries.length; i++) {
          var b = { x: tries[i][0], y: tries[i][1], w: tw, h: th };
          if (b.x < L + 2 || b.x + b.w > L + pw - 2 || b.y < T + 2 || b.y + b.h > T + ph - 2) continue;
          if (placed.some(function (o) { return b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y; })) continue;
          if (golds.some(function (o) { return o !== p && Math.abs(o.qx - (b.x + b.w / 2)) < b.w / 2 + o.r && Math.abs(o.qy - (b.y + b.h / 2)) < b.h / 2 + o.r; })) continue;
          placed.push(b);
          sv.text(b.x, b.y + th - 2.5, t, { 'class': 'vx-gl' }, lab2);
          return;
        }
      });
    }
    MP.cross = sv.group({}, s);
    MP.pts = pts;
    MP.geo = { W: W, H: H, L: L, T: T, pw: pw, ph: ph, X: X, Y: Y, phone: phone };
    h.appendChild(s);
    h.style.touchAction = zoomed ? 'none' : 'pan-y';
    if (MP.sel && !pts.some(function (p) { return p.sym + p.s === MP.sel; })) MP.sel = null;
    mapMark();

    if (MP.zb) Array.prototype.forEach.call(MP.zb.querySelectorAll('[data-mz]'), function (b) { var z = b.getAttribute('data-mz'); b.disabled = (z === 'reset' || z === 'out') && !zoomed; });
    if (MP.hint) MP.hint.textContent = zoomed ? 'Zoomed in · drag to move · Reset for the whole map' :
      (hoverDev() ? '+ or Ctrl-scroll to zoom into a crowded patch, then drag to move' : '+ to zoom into a crowded patch, then drag to move');

    var kb = MP.keyBox;
    if (kb) {
      kb.textContent = '';
      if (phone && golds.length) {
        kb.appendChild(el('span', 'mut', 'Gold dots: '));
        golds.forEach(function (p) {
          var b = el('button', 'vx-mk ' + (p.s === 'P' ? 'p' : 'c'), ''); b.type = 'button';
          b.appendChild(el('span', 'vx-mkn', String(p.no)));
          b.appendChild(document.createTextNode(' ' + p.sym));
          var t = todOf(p.sym);
          if (t) { b.appendChild(el('span', 'vx-tkr ' + (t.late ? 'mut' : t.cls), t.txt)); SKT.ui.tip(b, p.sym + ' · ' + (t.late ? fmt().dayShort(t.day) : 'Today') + ' C : P ' + t.txt + '. ' + t.tip); }
          b.setAttribute('aria-label', 'Gold dot ' + p.no + ': ' + p.sym + ', open it');
          b.addEventListener('click', function () { open(p.sym); });
          kb.appendChild(b);
        });
      }
    }
  }
  function dX(p) { return p.dx != null ? p.dx : p.qx; }
  function dY(p) { return p.dy != null ? p.dy : p.qy; }
  function mapPick(cx, cy, kind) {
    var g = MP.geo; if (!g || !MP.holder) return null;
    var rect = MP.holder.getBoundingClientRect(), k = g.W / (rect.width || g.W), x = (cx - rect.left) * k, y = (cy - rect.top) * k;
    var best = null, bd = Infinity, lim = (kind === 'mouse' ? 8 : 16) * k;
    MP.pts.forEach(function (p) { var d = Math.hypot(dX(p) - x, dY(p) - y) - p.r * 0.6 - (p.gold ? 2 : 0); if (d < bd) { bd = d; best = p; } });
    if (kind !== 'mouse' && MP.sel) {
      var sp = MP.pts.filter(function (p) { return p.sym + p.s === MP.sel; })[0];
      if (sp && Math.hypot(dX(sp) - x, dY(sp) - y) <= lim + sp.r) return sp;
    }
    return bd <= lim ? best : null;
  }
  function mapMark() {
    var cr = MP.cross;
    if (cr) cr.textContent = '';
    var id = MP.hov || MP.sel, p = MP.pts.filter(function (q) { return q.sym + q.s === id; })[0] || null;
    if (p && cr) SKT.svg.el('circle', { cx: dX(p).toFixed(1), cy: dY(p).toFixed(1), r: (p.r + 4).toFixed(1), 'class': 'vx-msel' }, cr);
    var ro = MP.ro, f = fmt();
    if (!ro) return;
    ro.textContent = '';
    if (!p) {
      ro.appendChild(el('b', null, MP.pts.length + ' names' + (MP.view ? ' in this zoomed view' : '') + '. '));
      ro.appendChild(document.createTextNode('Up and to the right = one-sided and big for its own book. ' +
        (hoverDev() ? 'Point at a dot to read it here, click to open the name.' : 'Tap a dot to read it here; tap it again to open the name.')));
      return;
    }
    var st = p.st, W2 = SKT.W(p.s);
    ro.appendChild(el('span', 'mut', '#' + p.i + ' '));
    ro.appendChild(el('b', 'vx-ro-n ' + (p.gold ? 'gold' : p.s === 'P' ? 'down' : 'up'), p.sym));
    var nm = nameOf(p.sym) ? ' ' + nameOf(p.sym) : '';
    ro.appendChild(document.createTextNode(nm + ' · ' + W2.lean + ' · ' + (SKT.oneWords(st, p.s, false) || 'one-sided ' + f.pct(p.x, 1)) + ' · net ' + f.sk(st.net) + ' = ' + f.pct(p.y, 1) +
      ' of its book · book ' + f.k(p.bk) + ' contracts '));
    var td = todRatio(p.sym);
    if (td) { ro.appendChild(document.createTextNode('· ')); ro.appendChild(td); ro.appendChild(document.createTextNode(' ')); }
    var b = el('button', 'linkbtn vx-ro-open', 'Open ' + p.sym + ' ›'); b.type = 'button';
    b.addEventListener('click', function () { open(p.sym); });
    ro.appendChild(b);
  }
  function mapEvents(h) {
    var ptrs = {}, mode = null, g0 = null, down = null, lastTap = 0;
    function svgXY(cx, cy) { var g = MP.geo, rect = h.getBoundingClientRect(), k = g.W / (rect.width || g.W); return { x: (cx - rect.left) * k, y: (cy - rect.top) * k, k: k }; }
    function list() { return Object.keys(ptrs).map(function (k) { return ptrs[k]; }); }
    h.addEventListener('pointerdown', function (e) {
      if (!MP.geo || (e.pointerType === 'mouse' && e.button !== 0)) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: Date.now(), type: e.pointerType };
      var n = Object.keys(ptrs).length;
      try { h.setPointerCapture(e.pointerId); } catch (er) {  }
      if (n === 1) { mode = 'pending'; down = ptrs[e.pointerId]; g0 = { view: MP.view || MP.full }; }
      else if (n === 2) {
        var q = list(), m = svgXY((q[0].x + q[1].x) / 2, (q[0].y + q[1].y) / 2);
        mode = 'pinch'; down = null; SKT.hold('map', true);
        g0 = { view: MP.view || MP.full, dist: Math.max(24, Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y)), mx: m.x, my: m.y };
      }
      if (e.pointerType === 'mouse') e.preventDefault();
    });
    h.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId];
      if (!p) {
        if (e.pointerType !== 'mouse') return;
        var hp = mapPick(e.clientX, e.clientY, 'mouse'), id = hp ? hp.sym + hp.s : null;
        h.style.cursor = hp ? 'pointer' : MP.view ? 'grab' : 'default';
        if (id !== MP.hov) { MP.hov = id; mapMark(); }
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      if (mode === 'pinch') {
        var q = list(); if (q.length < 2) return;
        mapZoomAt(g0.dist / Math.max(24, Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y)), g0.mx, g0.my, g0.view);
        return;
      }
      if (mode === 'pending') {
        var slop = p.type === 'mouse' ? 3 : 8;
        if (Math.abs(p.x - p.sx) < slop && Math.abs(p.y - p.sy) < slop) return;
        mode = MP.view ? 'pan' : 'none';
        if (mode === 'pan') { h.classList.add('dragging'); SKT.hold('map', true); }
      }
      if (mode === 'pan') { var k = svgXY(0, 0).k; mapPanBy((p.x - p.sx) * k, (p.y - p.sy) * k, g0.view); }
    });
    function end(e, cancelled) {
      var p = ptrs[e.pointerId]; if (!p) return;
      delete ptrs[e.pointerId];
      var n = Object.keys(ptrs).length;
      if (!cancelled && mode === 'pending' && down === p && Date.now() - p.t < 700) {
        var t = Date.now(), pk = mapPick(e.clientX, e.clientY, p.type);
        if (p.type !== 'mouse' && !pk && t - lastTap < 350) { lastTap = 0; if (MP.view) mapSetView(null); }
        else if (!pk) { lastTap = t; if (p.type !== 'mouse' && MP.sel) { MP.sel = null; mapMark(); } }
        else if (p.type === 'mouse' || MP.sel === pk.sym + pk.s) open(pk.sym);
        else { MP.sel = pk.sym + pk.s; mapMark(); }
      }
      if (n === 1 && mode === 'pinch') { var r = list()[0]; r.sx = r.x; r.sy = r.y; mode = MP.view ? 'pan' : 'none'; g0 = { view: MP.view || MP.full }; }
      else if (n === 0) { mode = null; down = null; h.classList.remove('dragging'); SKT.hold('map', false); }
    }
    h.addEventListener('pointerup', function (e) { end(e, false); });
    h.addEventListener('pointercancel', function (e) { end(e, true); });
    h.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs[e.pointerId] && MP.hov) { MP.hov = null; mapMark(); } });
    h.addEventListener('dblclick', function (e) { if (!mapPick(e.clientX, e.clientY, 'mouse') && MP.view) { e.preventDefault(); mapSetView(null); } });
    h.addEventListener('wheel', function (e) {
      if (!MP.geo || !(e.ctrlKey || e.metaKey || e.altKey)) return;
      var q = svgXY(e.clientX, e.clientY), dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      e.preventDefault();
      mapZoomAt(Math.max(0.55, Math.min(1.8, Math.exp(Math.max(-300, Math.min(300, dy)) * (e.ctrlKey ? 0.01 : 0.0015)))), q.x, q.y);
    }, { passive: false });
  }


  RENDER.daily = function (root, V) {
    var S = SKT.S, f = fmt(), ui = SKT.ui, D = SKT.D, dbd = V.dbd || {}, ss = sides(), w = S.w;
    head(root, 'Day by day', 'On each session of the window, the names whose leaning side opened the most against their own book' +
      (D.tape ? '; the tape is the newest column' : '') + '. A filled chip is ranked on the ' + SKT.winLabel(win()).toLowerCase() + ' window now.');
    var days = Array.isArray(dbd.days) ? dbd.days : [], p = D.periods && D.periods[w === 'tape' ? '1w' : w];
    var cols = [];
    days.forEach(function (d, i) {
      if (p && p.since && d < p.since) return;
      cols.push({ d: d, C: (dbd.C && dbd.C[i]) || [], P: (dbd.P && dbd.P[i]) || [] });
    });
    if (w === 'tape') root.appendChild(ui.note('Tape is traded, not settled: the columns show the last week of settles and the tape.', 'muted'));
    var ranked = {};
    ss.forEach(function (s) { (SKT.listOf(win(), s, 'all') || []).forEach(function (sym) { ranked[s + sym] = 1; }); });
    var ses = D.sessions || [], idx = {};
    ses.forEach(function (x, i) { idx[x[0]] = i; });
    function tipFor(sym, d) {
      var r = SKT.row(sym), e = r && r.d && idx[d] != null ? r.d[idx[d]] : null, nm = r && r.nm ? r.nm + ' · ' : '';
      if (!e) return nm + f.day(d);
      return nm + f.day(d) + ': ' + f.sk(e[2]) + ' calls · ' + f.sk(e[3]) + ' puts opened, net ' + f.sk(e[4]) + (isNum(e[5]) ? ' = ' + f.spct(e[5]) + ' of its book' : '');
    }
    var grid = el('div', 'vx-dbd');
    var lastSettle = cols.length ? cols[cols.length - 1].d : null;
    cols.forEach(function (c) {
      var col = el('div', 'vx-dcol');
      var hd = el('div', 'vx-dh');
      hd.appendChild(el('b', null, f.day(c.d)));
      if (c.d === lastSettle) hd.appendChild(el('span', 'vx-dl', 'latest settle'));
      col.appendChild(hd);
      var any = false;
      ss.forEach(function (s) {
        var syms = (c[s] || []).filter(inL);
        if (!syms.length) return;
        any = true;
        var line = el('div', 'vx-tks');
        syms.forEach(function (sym) { line.appendChild(tkTod(sym, s, { on: !!ranked[s + sym], tip: tipFor(sym, c.d), day: c.d })); });
        col.appendChild(line);
      });
      if (!any) col.appendChild(el('span', 'mut vx-dnone', '–'));
      grid.appendChild(col);
    });
    if (D.tape) {
      var tc = el('div', 'vx-dcol vx-tape');
      var th = el('div', 'vx-dh'); th.appendChild(el('b', null, 'Tape · ' + f.day(D.tape.T))); th.appendChild(el('span', 'vx-dl', 'traded, not settled'));
      tc.appendChild(th);
      var anyT = false;
      ss.forEach(function (s) {
        var syms = (D.tape[s] || []).filter(inL).slice(0, 8);
        if (!syms.length) return;
        anyT = true;
        var line = el('div', 'vx-tks');
        syms.forEach(function (sym) {
          var tr = D.tape.rows && D.tape.rows[sym], must = tr ? tr[s === 'P' ? 'fP' : 'fC'] : null;
          line.appendChild(tkTod(sym, s, { on: !!ranked[s + sym], tip: (nameOf(sym) ? nameOf(sym) + ' · ' : '') + 'traded ' + f.day(D.tape.T) +
            (isNum(must) ? ': ' + f.sk(must) + ' ' + (s === 'P' ? 'puts' : 'calls') + ' must be new' : '') }));
        });
        tc.appendChild(line);
      });
      if (!anyT) tc.appendChild(el('span', 'mut vx-dnone', '–'));
      grid.appendChild(tc);
    }
    if (!cols.length && !D.tape) { root.appendChild(ui.note('No sessions in this window yet.', 'muted')); return; }
    var shownSyms = [];
    Array.prototype.forEach.call(grid.querySelectorAll('.vx-tk'), function (b) { shownSyms.push(b.firstChild ? b.firstChild.nodeValue : ''); });
    if (shownSyms.some(function (sym) { return sym && !SKT.row(sym); })) wantSearch();
    root.appendChild(todLegend(shownSyms.filter(Boolean), 'The ratio on each chip (in every column)'));
    root.appendChild(grid);
  };


  var MISS = { 'days leaning': 'not enough days leaning', size: 'build still small', 'price moved': 'the price already moved', 'held share': 'held share not rising' };
  RENDER.pre = function (root, V) {
    var S = SKT.S, f = fmt(), ui = SKT.ui, P = V.pre || {}, ss = sides(), D = SKT.D;
    var title = S.side === 'B' ? 'Leaning one way on most of the last few sessions while the price stayed quiet' :
      'Leaning ' + sideWord(S.side) + ' on most of the last few sessions while the price stayed quiet';
    head(root, title, 'ON = every check passes; Almost = one check is missing (named on the row). Read on the 1 week window.');
    var line = EXT.preLine ? safe(EXT.preLine) : '';
    if (line) root.appendChild(el('p', 'src vx-preline', line));
    var preSyms = [];
    ss.forEach(function (s) { (P[s] || []).forEach(function (e) { if (e && inL(e[0])) preSyms.push(e[0]); }); });
    if (todLate(preSyms)) root.appendChild(todLegend(preSyms, 'Today C : P'));
    var ses = sessionsOf('1w');
    var any = false;
    ss.forEach(function (s) {
      var list = (P[s] || []).filter(function (e) { return e && inL(e[0]); });
      if (list.some(function (e) { return !SKT.row(e[0]); })) wantSearch();
      var on = list.filter(function (e) { return e[1] == null; }), al = list.filter(function (e) { return e[1] != null; });
      if (ss.length > 1) root.appendChild(el('h3', 'h3 ' + (s === 'P' ? 'down' : 'up'), 'Leaning ' + sideWord(s)));
      [[on, 'ON · every check passes', 'gold'], [al, 'Almost · one check missing', 'amber']].forEach(function (grp, gi) {
        var sec = section(grp[1], grp[0].length, 'vx-pre-' + (gi ? 'al' : 'on'));
        if (grp[0].length) any = true;
        var rows = grp[0].map(function (e, i) { return { sym: e[0], miss: e[1], s: s, i: i }; });
        var cols = [
          { k: 'stk', label: 'Stock', card: 'head', v: function (x) { return x.sym; }, f: function (x) { return stock(x.sym); } },
          gi ? { k: 'miss', label: 'Missing', card: 'head', v: function (x) { return x.miss; }, f: function (x) { return ui.pill(MISS[x.miss] || x.miss, 'amber'); } } : null,
          { k: 'rk', label: '1 week', v: function (x) { var st = rowW(x.sym, '1w'); return st && st.side === x.s && isNum(st.r) ? -st.r : null; }, f: function (x) {
            var st = rowW(x.sym, '1w');
            if (st && st.side === x.s && isNum(st.r)) return el('b', null, '#' + st.r);
            return el('span', 'mut', st && st.near ? 'near miss' : 'not ranked');
          } },
          { k: 'ds', label: 'Each session', sort: false, card: 'wide', f: function (x) { return ses.length ? cellsFor(x.sym, ses) : null; } },
          { k: 'net', label: 'Net · 1 week', num: true, v: function (x) { var st = rowW(x.sym, '1w'); return st && isNum(st.pct) ? Math.abs(st.pct) : null; }, f: function (x) {
            var st = rowW(x.sym, '1w');
            if (!st || !isNum(st.net)) return '–';
            var w2 = el('span'); w2.appendChild(el('b', st.net > 0 ? 'up' : st.net < 0 ? 'down' : '', f.sk(st.net)));
            if (isNum(st.pct)) w2.appendChild(el('span', 'mut', ' · ' + f.pct(Math.abs(st.pct)) + ' of its book'));
            return w2;
          } },
          { k: 'ret', label: 'Price · 1 week', num: true, v: function (x) { var st = rowW(x.sym, '1w'); return st && isNum(st.ret) ? Math.abs(st.ret) : null; }, f: function (x) {
            var st = rowW(x.sym, '1w'), r = SKT.row(x.sym);
            if (!r) return '–';
            var w3 = el('span');
            w3.appendChild(el('span', null, isNum(r.px) ? f.money(r.px) + ' ' : ''));
            if (st && isNum(st.ret)) w3.appendChild(el('span', 'mut', f.spct(st.ret)));
            return w3;
          } },
          todCol(function (x) { return x.sym; }, function (x) { return x.s; }),
          { k: 'held', label: 'Held calls : puts', num: true, v: function (x) { return heldShare(x.sym); }, f: function (x) { return heldCell(x.sym); } },
          { k: 'biz', label: 'Business', num: true, v: function (x) { var r = SKT.row(x.sym); return r ? r.biz : null; }, f: function (x) { return bizCell(x.sym); } }
        ].filter(Boolean);
        sec.appendChild(dual(cols, rows, { empty: gi ? 'None almost there.' : 'None on.', base: 'Engine order', cardMax: gi ? 20 : 40 }));
        root.appendChild(sec);
      });
    });
    if (!any && !D) root.appendChild(emptyLine('Nothing to show.'));
  };


  var rzT = null, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      if (MP.holder && MP.holder.isConnected) safe(drawMap);
      if (QD.holder && QD.holder.isConnected) safe(drawQuad);
    }, 150);
  });


  SKT.views = { render: render, bar: bar, crowd: crowd };
})();
