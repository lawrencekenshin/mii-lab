








(function () {
  'use strict';
  var SKT = window.SKT = window.SKT || {};


  var WINS = ['1d', '1w', '2w', '1m', 'all'];
  var GW = [['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['1y', '1Y+']];
  var PRS = [['1m', '1M', 21], ['3m', '3M', 63], ['6m', '6M', 130]];
  var CSZ = [['d', 'Daily'], ['w', 'Weekly'], ['2w', '2W'], ['m', 'Monthly']];
  var LAYERS = [['candles', 'Candles'], ['bars', 'GEX bars'], ['king', 'King'], ['walls', 'Walls'], ['flip', 'Flip'], ['far', 'Far strikes'],
    ['path', 'King path'], ['main', 'Main bet'], ['top', 'Top strikes'], ['marks', 'Marks'], ['ribbon', 'Ribbon'], ['earn', 'Earnings']];
  var TABS = [['build', 'Build'], ['cp', 'Calls vs puts'], ['levels', 'Levels'], ['biz', 'Business'], ['days', 'Days']];
  var LIST_TAG = [['spx', 'SPX'], ['ndx', 'NDX'], ['wl', 'WL'], ['ai', 'AI'], ['r1', 'R1K'], ['r2', 'R2K'], ['etf', 'ETF'], ['pin', 'PIN']];
  var TAGW = { a: 'last trades at the ask', b: 'last trades at the bid', m: 'last trades between bid and ask', e: 'no late trade' };
  var TAGS = { a: 'at the ask', b: 'at the bid', m: 'mid', e: 'no late trade' };
  var READW = { bought: 'bought at the ask', sold: 'sold: sellers opened them', mixed: 'mixed', unclear: 'unclear' };
  var READS = { bought: 'Bought', sold: 'Sold', mixed: 'Mixed', unclear: 'Unclear' };
  var FLAGS = [['N', 'NEW LINE', 'a line that barely existed at the window start'], ['B', 'BUILDING', 'grew a lot since the window start'],
    ['C', 'CUT', 'cut back since the window start'], ['G', 'BIG', 'one of its biggest lines'], ['F', 'FAR', 'far from the price'],
    ['Q', 'QE', 'a quarter-end expiry'], ['K', 'KING', 'the king node’s contract'], ['R', 'ROLL?', 'another line on this side closed about as many the same session']];
  var PCTL = ['net as a share of its book', 'one-sided', 'contracts added', '$ opened', 'book size'];
  var BUCKETS = [['1M', 'up to 1 month'], ['3M', '1-3 months'], ['6M', '3-12 months'], ['1Y+', '1 year+']];
  var LOUD_C = [['L', 'Loud buy', 'orange'], ['C', 'Loud buy on a move day', 'blue'], ['S', 'Loud spread', 'gold'], ['X', 'Loud, not buying', 'muted']];
  var LOUD_P = [['B', 'Loud put buying', 'red'], ['M', 'Loud puts on a move day', 'blue'], ['S', 'Loud put spread', 'gold'], ['O', 'Loud puts, other', 'muted']];
  var STEALTH = [['S', 'Steady build'], ['Q', 'Steady build (quiet)'], ['M', 'Steady build (mixed)']];
  var SETUP = [['PINNED', 'pinned'], ['SUPPORTED', 'supported'], ['CAPPED', 'capped'], ['UNSTABLE', 'unstable'], ['AT FLIP', 'atflip']];
  var EE_TF = { '1d': '1D', '1w': '1W', '2w': '2W', '1m': '1M', all: '1M', tape: '1D' };


  function enc(s) { return encodeURIComponent(s); }
  var LINK = {
    eagle: function (s) { return '../eagle-eye/?s=' + enc(s); },
    flow: function (s) { return '../flow/?s=' + enc(s); },
    kgt: function (s) { return '../king-gex/#s=' + enc(s); },
    kgv: function (v) { return '../king-gex/' + SKT.kgHash(v); },
    hunt: function (s) { return '../gex-hunt/#v=detail&s=' + enc(s); },
    leap: null,
    loud: function (s, puts) { return '../loud-calls/#' + (puts ? 'pm=puts&' : '') + 's=' + enc(s); },
    stealth: function (s) { return '../stealth-calls/#s=' + enc(s); },
    seek: function (s) { return '../price-seeker/#' + enc(s); }
  };
  var LINK_X = [];
  var SEEK_BASE = '../price-seeker/';

  var H = {
    ext: null,
    extKey: function () { return ''; },
    ctx: [],
    secs: [],
    flagNum: function () { return ''; },
    gateNeed: function () { return ''; },
    vintage: function () { return ''; },
    chartCtl: function () { return null; },
    headLive: function () { return null; }
  };


  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function el(t, c, x) { if (Array.isArray(x)) { var e = SKT.ui.el(t, c); SKT.ui.add(e, x); return e; } return SKT.ui.el(t, c, x); }
  function add(p, c) { return SKT.ui.add(p, c); }
  function F() { return SKT.fmt; }
  function tip(n, t, h) { return SKT.ui.tip(n, t, h); }
  function kS(k) { return isNum(k) ? String(Math.round(k * 100) / 100) : '–'; }
  function sg(x, t) { return +t === 0 ? '' : x > 0 ? '+' : x < 0 ? '−' : ''; }
  function pc(x, dp) { if (!isNum(x)) return '–'; var a = Math.abs(x) * 100, t = dp != null ? a.toFixed(dp) : a < 10 ? a.toFixed(1) : String(Math.round(a)); return sg(x, t) + t + '%'; }
  function pt(x) { if (!isNum(x)) return ''; var v = Math.round(x * 100); return v > 0 ? '▲' + v + ' pt' : v < 0 ? '▼' + (-v) + ' pt' : '±0 pt'; }
  function rat(c, p) {
    c = isNum(c) ? c : 0; p = isNum(p) ? p : 0;
    var f = function (x) { return x >= 10 ? String(Math.round(x)) : x.toFixed(1); };
    if (c > 0 && p > 0) return c >= p ? f(c / p) + ' : 1' : '1 : ' + f(p / c);
    return c > 0 ? 'calls only' : p > 0 ? 'puts only' : '–';
  }
  function share(c, p) { return isNum(c) && isNum(p) && c + p > 0 ? c / (c + p) : null; }
  function addTxt(c, p) {
    c = +c || 0; p = +p || 0;
    if (c > 0 && p > 0) return rat(c, p);
    return c > 0 ? 'calls only' : p > 0 ? 'puts only' : c || p ? 'both down' : 'no change';
  }
  function addCls(c, p) { c = +c || 0; p = +p || 0; return c > 0 && p > 0 ? (c >= 2 * p ? 'up' : p >= 2 * c ? 'down' : '') : c > 0 ? 'up' : p > 0 ? 'down' : 'mut'; }
  function heldCls(c, p) { var s = share(c, p); return s == null ? 'mut' : s >= 0.6 ? 'up' : s <= 0.4 ? 'down' : ''; }
  function sideW(side, plural) { return side === 'P' ? (plural === false ? 'put' : 'puts') : (plural === false ? 'call' : 'calls'); }
  function winShort(w) { return SKT.winLabel(w, true); }
  function per(w) { return (SKT.D && SKT.D.periods && SKT.D.periods[w]) || {}; }
  function sinceW(w) { var p = per(w); return w === '1d' ? 'on ' + F().dayShort(p.to || p.since) : p.base ? 'since ' + F().dayShort(p.base) : ''; }
  function conKey(exp, cp, k) { return String(exp) + cp + kS(k); }
  function parseCon(c) { var m = /^(\d{6})([CP])(\d+(?:\.\d+)?)$/.exec(c || ''); return m ? { exp: m[1], cp: m[2], k: +m[3] } : null; }
  function section(cls, title, sub) {
    var s = el('section', 'nv-panel' + (cls ? ' ' + cls : ''));
    if (title) {
      var h = el('div', 'nv-ph3');
      add(h, el('h3', null, title));
      if (sub) add(h, typeof sub === 'string' ? el('span', 'nv-phr', sub) : sub);
      s.appendChild(h);
    }
    return s;
  }
  function p(cls, txt) { return el('p', cls, txt); }
  function safe(label, fn) { try { return fn(); } catch (e) { console.error('[skew] name ' + label, e); return null; } }
  function store() { return SKT.store; }


  var M = {
    nf: {}, nfFor: {}, nfP: {},
    ext: {}, extFor: {}, extP: {},
    extra: null,
    viewsFail: '', searchFail: '',
    liveMap: false,
    openDays: {},
    drawn: null,
    seek: null,
    layers: null
  };
  function loadLayers() {
    var off = {};
    try { var a = JSON.parse(store().get('sk.layers') || '[]'); if (Array.isArray(a)) a.forEach(function (k) { off[k] = 1; }); } catch (e) {  }
    var o = {};
    LAYERS.forEach(function (l) { o[l[0]] = !off[l[0]]; });
    return o;
  }
  function saveLayers() {
    var off = LAYERS.filter(function (l) { return M.layers[l[0]] === false; }).map(function (l) { return l[0]; });
    store().set('sk.layers', off.length ? JSON.stringify(off) : null);
  }
  function tabNow() { var t = store().get('sk.ntab'); return TABS.some(function (x) { return x[0] === t; }) ? t : 'build'; }

  function genKey() { return (SKT.D && SKT.D.generated) || ''; }
  function nfState(sym, r) {
    var key = genKey();
    if (M.nfFor[sym] === key) return { done: true, nf: M.nf[sym] };
    if (!r || !r.nf) return { done: true, nf: null };
    if (!M.nfP[sym]) {
      M.nfP[sym] = SKT.nameFile(sym).then(function (j) { return j; }, function () { return null; }).then(function (j) {
        delete M.nfP[sym];
        M.nf[sym] = j; M.nfFor[sym] = key;
        if (SKT.S.open === sym) render();
      });
    }
    return { done: false, nf: M.nf[sym] || null };
  }
  function extState(sym) {
    if (!H.ext) return { done: true, ext: {} };
    var key = H.extKey();
    if (M.extFor[sym] === key) return { done: true, ext: M.ext[sym] || {} };
    if (!M.extP[sym]) {
      M.extP[sym] = H.ext(sym).then(function (x) { return x || {}; }, function () { return {}; }).then(function (x) {
        delete M.extP[sym];
        M.ext[sym] = x; M.extFor[sym] = key;
        if (SKT.S.open === sym) render();
      });
    }
    return { done: false, ext: M.ext[sym] || {} };
  }
  function views() {
    var V = SKT.VIEWS;
    if (V) return V;
    if (M.viewsFail !== genKey()) {
      SKT.loadViews().then(function () { if (SKT.S.open) render(); }, function () { M.viewsFail = genKey(); });
    }
    return null;
  }


  function makeCtx(sym, r) {
    var S = SKT.S, w = S.w === 'tape' ? '1d' : S.w;
    var st = (r.w && r.w[w]) || null;
    var lean = st && (st.side === 'C' || st.side === 'P') ? st.side : S.side === 'P' ? 'P' : 'C';
    var n = nfState(sym, r), x = extState(sym);
    var c = { sym: sym, r: r, w: w, st: st || {}, has: !!st, lean: lean, puts: lean === 'P', nf: n.nf, nfDone: n.done, ext: x.ext, extDone: x.done,
      ern: r.ern || null, nowPx: null, D: SKT.D, tape: SKT.D && SKT.D.tape && S.w === 'tape' ? SKT.D.tape.rows && SKT.D.tape.rows[sym] : null };
    c.h0 = function (ww) { var s2 = r.w && r.w[ww]; return (s2 && s2.h0) || null; };
    c.cph = (c.nf && c.nf.cph) || c.ext.cph || null;
    c.cpb = (c.nf && c.nf.cpb) || c.ext.cpb || null;
    H.ctx.forEach(function (fn) { safe('ctx', function () { fn(c); }); });
    return c;
  }
  function leanAdds(st, lean) { return lean === 'P' ? st.aP : st.aC; }
  function lsTags(r) { return (r.ls || []).map(function (t) { var m = LIST_TAG.filter(function (x) { return x[0] === t; })[0]; return m ? m[1] : null; }).filter(Boolean); }
  function isFund(r) { return (r.ls || []).indexOf('etf') >= 0; }


  function secHead(c) {
    var r = c.r, st = c.st, box = el('div', 'nv-head');
    var bar = el('div', 'nv-bar');
    var back = el('button', 'linkbtn nv-back', '← Board'); back.type = 'button';
    back.addEventListener('click', function () { SKT.go({ open: null }); });
    bar.appendChild(back);
    var hint = el('span', 'nv-keys', 'j / k step through the list · Esc back');
    bar.appendChild(hint);
    box.appendChild(bar);
    var t = el('div', 'nv-title');
    add(t, el('span', 'nv-sym', c.sym));
    var nm = [r.nm, r.sec].filter(Boolean).join(' · ');
    if (nm) add(t, el('span', 'nv-nm', nm));
    var chips = el('span', 'nv-lchips');
    lsTags(r).forEach(function (x) { add(chips, el('span', 'lchip' + (x === 'PIN' ? ' pin' : ''), x)); });
    if (r.cd) add(chips, tip(el('span', 'lchip oi', 'OI ' + F().dayShort(r.cd)), 'option data from the ' + F().dayShort(r.cd) + ' settle'));
    if (r.ai) add(chips, el('span', 'nv-ai', 'AI · ' + String(r.ai).replace(/^AI\s*/i, '')));
    if (chips.childNodes.length) add(t, chips);
    box.appendChild(t);
    var l2 = el('div', 'nv-h2');
    if (isNum(r.px)) {
      var pxs = el('span', 'nv-px', F().money(r.px));
      if (isNum(st.ret)) add(pxs, [' ', el('span', st.ret >= 0 ? 'up' : 'down', F().spct(st.ret) + ' ' + winShort(c.w))]);
      add(l2, pxs);
    }
    var live = H.headLive(c);
    if (live) add(l2, live);
    var bz = el('span', 'nv-bizb');
    if (isNum(r.biz)) { var b = SKT.biz(r.biz); add(bz, ['Business ', el('b', null, String(r.biz)), ' ', SKT.ui.meter(r.biz), ' ', el('span', 'mut', b.word)]); }
    else if (isFund(r)) add(bz, ['Business ', el('span', 'mut', 'fund')]);
    else { add(bz, ['Business ', el('span', 'mut', '–')]); tip(bz, 'too few business numbers'); }
    add(l2, bz);
    box.appendChild(l2);
    var kg = r.kg;
    if (kg && isNum(kg[0])) {
      var kl = el('p', 'nv-kline');
      add(kl, [el('b', 'gold', 'King node ' + kS(kg[0])), ' ' + pc(kg[1]) + (isNum(kg[2]) ? ' · ' + F().usd(kg[2]) + ' gamma' : '') + (kg[4] ? ' · ' + F().exp(kg[4], ' ') : '')]);
      tip(kl, 'This board’s king node: the strike with the most call gamma (gamma dollars per 1% move), from the chain priced at the ' + F().dayShort(kg[7]) + ' close');
      box.appendChild(kl);
    }
    if (isNum(r.oC) || isNum(r.oP)) {
      var hl = el('p', 'nv-hline'), last = c.cph && c.cph.length ? c.cph[c.cph.length - 1] : null;
      add(hl, ['Open now ', el('b', heldCls(r.oC, r.oP), rat(r.oC, r.oP)), ' calls : puts']);
      if (last && isNum(last[3]) && isNum(last[4]) && last[3] + last[4] > 0) add(hl, [' (180+ days ', el('b', heldCls(last[3], last[4]), rat(last[3], last[4])), ')']);
      tip(hl, F().num(r.oC) + ' calls · ' + F().num(r.oP) + ' puts open now (every strike, expiries after the settle)');
      box.appendChild(hl);
    }
    if (c.tape) box.appendChild(tapeLine(c));
    box.appendChild(rankBlock(c));
    var dc = dataCard(c);
    if (dc) box.appendChild(dc);
    return box;
  }
  function tapeLine(c) {
    var t = c.tape, T = SKT.D.tape, side = (t.fC || 0) >= (t.fP || 0) ? 'C' : 'P', top = t.top && t.top[side] && t.top[side][0];
    var s = 'Traded ' + F().day(T.T) + ', not settled yet: ' + F().sk(side === 'C' ? t.fC : t.fP) + ' ' + sideW(side) + ' must be new';
    if (top) s += ' · biggest ' + F().exp(top[0]) + ' $' + kS(top[1]) + side + ' ' + F().sk(top[2]);
    return p('nv-tape', s);
  }
  function rankBlock(c) {
    var r = c.r, st = c.st, b = el('div', 'nv-rank'), D = c.D, w = c.w;
    var one = el('p', 'nv-r1');
    if (st.r) {
      var n = ((D.windows[w] || {})[c.lean] || []).length;
      add(one, [el('b', 'gold', '#' + st.r), ' of ' + F().num(n) + ' ' + (c.lean === 'P' ? 'put' : 'call') + '-leaning · ' + SKT.winLabel(w)]);
      if (st.str) add(one, ' · ' + st.str + (st.strp ? '+' : '') + ' settle' + (st.str === 1 ? '' : 's') + ' in a row');
      if (st.pr === undefined || st.pr === null) { if (st.t20n > 1) add(one, [' ', SKT.ui.pill('NEW', 'gold')]); }
      else if (st.pr !== st.r) add(one, [' ', el('span', st.pr > st.r ? 'up' : 'down', st.pr > st.r ? '▲' + (st.pr - st.r) : '▼' + (st.r - st.pr))]);
    } else if (c.has) {
      add(one, [el('b', st.near ? 'amber' : 'down', st.near ? 'Near miss' : 'Not ranked'), ' on ' + winShort(w) + ' ' + sideW(c.lean) + (st.why ? ': ' + st.why : '')]);
    } else add(one, [el('b', 'mut', 'No reading'), ' on ' + winShort(w)]);
    b.appendChild(one);
    var others = [];
    WINS.forEach(function (x) {
      if (x === w || !D.windows[x]) return;
      var s = r.w && r.w[x];
      if (!s) { others.push(winShort(x) + ' no reading'); return; }
      if (s.r) others.push('#' + s.r + ' on ' + winShort(x) + (s.side && s.side !== c.lean ? ' ' + sideW(s.side) : ''));
      else others.push(winShort(x) + ' not ranked' + (s.why ? ': ' + s.why : ''));
    });
    if (others.length) b.appendChild(p('nv-r2', others.join(' · ')));
    return b;
  }
  function dataCard(c) {
    var r = c.r, nf = c.nf, st = c.st, bits = [];
    var L = (nf && nf.L) || r.cd || (c.D && c.D.latest);
    if (L) bits.push('Open interest ' + F().dayShort(L) + ' settle');
    if (nf && nf.b) bits.push('chain built ' + F().dayShort(nf.b.slice(0, 10)) + ' ' + nf.b.slice(11, 16) + ' ET');

    var Lx = c.D && c.D.latest, pxd = null, ob = nf && nf.ohlc && nf.ohlc.length ? nf.ohlc[nf.ohlc.length - 1] : null;
    if (isNum(r.px)) pxd = ob && isNum(ob[4]) && Math.abs(ob[4] - r.px) < 0.005 && (!Lx || ob[0] <= Lx) ? ob[0] : Lx;
    if (pxd) bits.push('price ' + F().dayShort(pxd) + ' close');
    if (st.cov) bits.push(st.cov[0] + ' of ' + st.cov[1] + ' sessions read');
    var pr = per(c.w), joined = 0;
    (r.d || []).forEach(function (x, i) { var s = c.D.sessions[i]; if (x && s && x[0] > 1 && s[0] >= (pr.since || '') && s[0] <= (pr.to || '9')) joined++; });
    if (joined) bits.push(joined + ' joined day' + (joined === 1 ? '' : 's'));
    if (c.w === 'all' && st.since) bits.push('Total counts from ' + F().dayShort(st.since));
    return bits.length ? p('nv-data', bits.join(' · ')) : null;
  }



  function openItems(sym, r, puts, withMain) {
    r = r || {};
    var tf = EE_TF[SKT.S.w] || '1W', items = [];
    if (withMain) {
      if (r.eel) items.push({ label: 'Eagle Eye', sub: sym, href: LINK.eagle(sym, tf) });
      items.push({ label: 'Flow Dashboard', sub: sym, href: LINK.flow(sym, tf) });
    }
    items.push({ label: 'King GEX Tracker', sub: sym, href: LINK.kgt(sym) },
      { label: 'GEX Hunt', sub: sym, href: LINK.hunt(sym) },
      LINK.leap ? { label: 'LEAP Hunter', sub: sym, href: LINK.leap(sym) } : null,
      { label: puts ? 'Loud Puts' : 'Loud Calls', sub: sym, href: LINK.loud(sym, puts) },
      { label: 'Stealth Calls', sub: sym, href: LINK.stealth(sym) },
      r.sk ? { label: 'Price Seeker', sub: sym, href: LINK.seek(sym) } : null,
      { label: 'Skew × King', sub: 'King GEX', href: LINK.kgv('skew') },
      { label: 'Skew × Pile', sub: 'King GEX', href: LINK.kgv('pile') });
    LINK_X.forEach(function (x) { items.push({ label: x.label, sub: x.sub || sym, href: x.href(sym) }); });
    return items.filter(Boolean);
  }
  function secOpen(c) {
    var sym = c.sym, r = c.r, box = el('div', 'nv-open'), tf = EE_TF[SKT.S.w] || '1W';
    function btn(label, href, t) { var a = el('a', 'obtn', label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; if (t) tip(a, t); return a; }
    if (r.eel) box.appendChild(btn('Eagle Eye ↗', LINK.eagle(sym, tf), sym + ' on Eagle Eye: chart, GEX levels and the technicals table'));
    box.appendChild(btn('Flow Dashboard ↗', LINK.flow(sym, tf), sym + ' on the Flow Dashboard'));
    box.appendChild(SKT.ui.dropdown('Open in', openItems(sym, r, c.puts, false), { align: 'right', cls: 'nv-dd' }));
    return box;
  }


  function tile(t, v, s, cls, tipT) {
    var d = el('div', 'nv-tile' + (cls ? ' ' + cls : ''));
    add(d, el('div', 'nv-tt', t));
    var vv = el('div', 'nv-tv');
    add(vv, v);
    d.appendChild(vv);
    if (s) { var ss = el('div', 'nv-ts'); add(ss, s); d.appendChild(ss); }
    if (tipT) tip(d, tipT);
    return d;
  }
  function secTiles(c) {
    var r = c.r, st = c.st, lean = c.lean, w = c.w, box = el('div', 'nv-tiles'), side = sideW(lean);
    if (!c.has) return null;
    var la = leanAdds(st, lean);
    var sub = el('span');
    ['1m', '2w', '1w', '1d'].forEach(function (x, i) {
      var s2 = r.w && r.w[x];
      if (!s2) return;
      if (sub.childNodes.length) add(sub, ' · ');
      add(sub, el('span', x === w ? 'gold' : null, F().sk(leanAdds(s2, lean)) + ' ' + winShort(x)));
    });
    box.appendChild(tile('Opened · ' + side, el('span', lean === 'P' ? 'down' : 'up', F().sk(la)), sub, null, side + ' opened ' + sinceW(w) + ', counting series still open'));
    var prem = st.prem ? st.prem[lean === 'P' ? 1 : 0] : null, n = (per(w).n || 1);
    var relP = isNum(st.rel) ? st.rel * n * 100 : null;
    if (isNum(prem)) box.appendChild(tile('$ opened', F().usd(prem), relP != null ? (relP < 0.1 ? relP.toFixed(2) : relP.toFixed(1)) + '% of a day’s $ trading' : 'premium of the new contracts', null,
      'The new ' + side + ' × each option’s closing mid × 100, added up ' + sinceW(w)));
    var fdist = isNum(st.far) ? (lean === 'P' ? -st.far : st.far) : null, fword = fdist != null && fdist < 0 ? 'below' : 'above';
    if (fdist != null) box.appendChild(tile('Where', F().spct(fdist, Math.abs(fdist) < 0.1 ? 1 : 0), isNum(st.fs) ? 'about ' + Math.abs(st.fs).toFixed(1) + 'σ ' + fword : fword + ' the price', null,
      'How far the new ' + side + ' sit from the price, weighted by size; σ = in the options’ own implied moves'));
    if (isNum(st.tch)) box.appendChild(tile('Touch odds', 'about ' + Math.round(st.tch * 100) + '%', 'priced into the options', null,
      'the chance the price reaches that distance before expiry, from the options’ own implied volatility'));
    if (isNum(st.pct)) box.appendChild(tile('Of book', F().pct(Math.abs(st.pct), 1), 'of its open interest', null, 'Net ' + side + ' opened as a share of every option contract open on the stock'));
    var held = lean === 'P' ? r.oP : r.oC, fr = isNum(la) && isNum(held) && held > 0 ? la / held : null, bits = [];
    if (fr != null) bits.push(side + ' opened ' + SKT.winWord(w) + ' = ' + Math.round(fr * 100) + '% of all open ' + side);
    var ti = st.tilt ? st.tilt[lean === 'P' ? 1 : 0] : null;
    if (isNum(ti) && st.cov && w !== '1d') bits.push(ti + ' of ' + st.cov[0] + ' days leaned ' + side);
    var z1 = r.w && r.w['1d'];
    if (w === '1d' && z1 && isNum(z1.z)) {
      box.appendChild(tile('Is this new?', 'z ' + sg(z1.z, Math.abs(z1.z).toFixed(1)) + Math.abs(z1.z).toFixed(1), ['vs its normal'].concat(bits).join(' · '), null,
        'Today’s build against this stock’s own last ' + (z1.nh || '') + ' days (0 = a usual day)'));
    } else if (bits.length) box.appendChild(tile('Is this new?', fr != null ? Math.round(fr * 100) + '% of open ' + side : bits[0], bits.join('; '), null, 'How much of what is open now came in this window, and on how many of its days'));
    return box.childNodes.length ? box : null;
  }


  function gexPick(Hm, g) {
    if (!Hm) return null;
    var want = { '1y': '1Y+', '1m': '1M', '3m': '3M', '6m': '6M' }[g] || '1Y+', order = [want, '1Y+', '6M', '3M', '1M'];
    for (var i = 0; i < order.length; i++) if (Hm[order[i]] && Hm[order[i]].lv) return { key: order[i], want: want, d: Hm[order[i]] };
    return null;
  }
  function topAdded(win, w) {
    var T = (win && win.top) || [], ix = { '1d': 4, '1w': 5, '2w': 6, '1m': 7 }[w];
    return T.map(function (t) {
      var d = ix != null ? t[ix] : (t[9] > 0 && isNum(t[10]) ? Math.round(t[10] / (t[9] * 100)) : t[7]);
      return { exp: t[0], cp: t[1], k: t[2], held: t[3], d: d, away: t[8], mid: t[9], usd: t[10], tag: t[11], flags: t[12] || '' };
    }).filter(function (q) { return isNum(q.d) && q.d > 0; }).sort(function (a, b) { return b.d - a.d; });
  }
  function dayInfo(c) {
    var out = {}, r = c.r, ses = (c.D && c.D.sessions) || [];
    (r.d || []).forEach(function (x, i) {
      if (!x || !ses[i]) return;
      out[ses[i][0]] = { l: String(x[9] || '').replace(/[xi]/g, ''), pct: x[5], read: x[6], pair: !!x[10], net: x[4], aC: x[2], aP: x[3] };
    });
    ((c.nf && c.nf.days) || []).forEach(function (d) {
      if (!d || d.length < 10 || d[9] == null) return;
      var o = out[d[0]] || (out[d[0]] = {});
      o.l = d[9];
    });
    Object.keys(out).forEach(function (d) {
      var o = out[d];
      if (!isNum(o.net)) { o.tip = F().dayShort(d) + (o.l && o.l.indexOf('q') >= 0 ? ': quiet' : ''); return; }
      o.tip = F().dayShort(d) + ': ' + F().k(Math.abs(o.net)) + ' ' + (o.net >= 0 ? 'calls' : 'puts') + ' net · ' + F().pct(Math.abs(o.pct || 0), 1) + ' of its book' +
        (o.read && READW[o.read] && o.read !== 'unclear' ? ' · ' + (o.read === 'bought' ? 'last trades at the ask' : o.read === 'sold' ? 'last trades at the bid' : 'mixed') : '') + (o.pair ? ' · a spread pair' : '');
    });
    return out;
  }
  function chartOpts(c) {
    var r = c.r, st = c.st, nf = c.nf, S = SKT.S, w = c.w, pr = per(w), win = nf && nf.win && nf.win[w];
    var kt = r.kt, kpath = null;
    if (kt && kt.sp && kt.sp.length) kpath = kt.sp.map(function (q) { return [SKT.chartsUtil.isoOf(q[0], kt.d), q[1]]; }).filter(function (q) { return q[0]; });
    var mc = st.mc && isNum(st.mc[2]) ? { exp: st.mc[0], cp: st.mc[1], k: st.mc[2], frm: pr.since } : null;
    var top = topAdded(win, w), hl = null, pc0 = parseCon(S.c);
    if (pc0) {
      var hit = top.filter(function (q) { return q.exp === pc0.exp && q.cp === pc0.cp && q.k === pc0.k; })[0];
      hl = { k: pc0.k, cp: pc0.cp, exp: pc0.exp, label: kS(pc0.k) + pc0.cp + ' ' + F().exp(pc0.exp) + (hit ? ' · ' + F().sk(hit.d) : '') };
    }
    var dedup = {}, top5 = [];
    top.forEach(function (q) { if (!dedup[q.k + q.cp] && top5.length < 5) { dedup[q.k + q.cp] = 1; top5.push(q); } });
    return {
      sym: c.sym, side: c.lean, g: S.g, pr: S.pr, cs: S.cs, layers: M.layers, kgK: r.kg ? r.kg[0] : null, kpath: kpath, mc: mc, top: top5,
      win: win, winStart: pr.since, winLabel: SKT.winLabel(w), base: pr.base, hl: hl,
      extraLines: M.extra && M.extra.sym === c.sym ? M.extra.lines : null, day: S.day, dayInfo: dayInfo(c), ern: c.ern,
      farBars: c.ext.farBars || null, liveMap: M.liveMap && c.ext.live ? c.ext.live : null, nowPx: c.nowPx
    };
  }
  function secChart(c, afters) {
    var nf = c.nf, r = c.r, S = SKT.S, w = c.w, sym = c.sym;
    var box = section('nv-chartp', sym + ' price and GEX levels');
    var gx = nf && nf.gex, Hm = M.liveMap && c.ext.live ? c.ext.live.H : gx && gx.H, pick = gexPick(Hm, S.g);
    var ctl = el('div', 'nv-ctl');
    var gItems = GW.map(function (g) {
      var no = gx && !(Hm && Hm[g[1]] && Hm[g[1]].lv);
      return { k: g[0], label: g[1], off: !gx || no, tip: !gx ? 'no GEX map for this name' : no ? sym + ' has no option expiring inside ' + (g[1] === '1M' ? 'a month' : g[1] === '1Y+' ? 'the year' : g[1]) : g[1] + ' expiries' };
    });
    ctl.appendChild(SKT.ui.chips(gItems, pick ? (GW.filter(function (g) { return g[1] === pick.key; })[0] || [S.g])[0] : S.g, function (k) { SKT.go({ g: k }); }, { label: 'GEX', cls: 'nv-sm' }));
    var nb = nf && nf.ohlc ? nf.ohlc.length : 0;
    var pItems = PRS.map(function (x, i) { var no = i > 0 && nb && nb <= PRS[i - 1][2]; return { k: x[0], label: x[1], off: no, tip: no ? sym + ' has ' + nb + ' sessions of price history: ' + PRS[i - 1][1] + ' already shows them all' : null }; });
    ctl.appendChild(SKT.ui.chips(pItems, S.pr, function (k) { SKT.go({ pr: k }); }, { label: 'Price', cls: 'nv-sm' }));
    box.appendChild(ctl);
    var ctl2 = el('div', 'nv-ctl');
    ctl2.appendChild(SKT.ui.seg([{ k: 'gex', label: 'GEX' }, { k: 'open', label: 'Opened', tip: 'contracts opened by strike over the window' }], S.cm, function (k) { SKT.go({ cm: k }); }, { cls: 'nv-seg', aria: 'Right pane' }));
    ctl2.appendChild(SKT.ui.chips(CSZ.map(function (x) { return { k: x[0], label: x[1] }; }), S.cs, function (k) { SKT.go({ cs: k }); }, { label: 'Candles', cls: 'nv-sm' }));
    var lc = H.chartCtl(c);
    if (lc) ctl2.appendChild(lc);
    box.appendChild(ctl2);
    if (!nf) { box.appendChild(p('nv-wait', c.nfDone ? 'No chart for this name in this build.' : 'Loading ' + sym + '…')); return box; }

    var win = nf.win && nf.win[w], top = topAdded(win, w).slice(0, 6);
    if (top.length) {
      var chipsRow = el('div', 'nv-cchips');
      var spot = gx ? gx.spot : r.px;
      top.forEach(function (q, i) {
        var key = conKey(q.exp, q.cp, q.k), on = S.c === key;
        var b = el('button', 'nv-cchip' + (on ? ' on' : '') + (i === 0 ? ' one' : '') + (q.cp === 'P' ? ' p' : ' c'));
        b.type = 'button';
        add(b, [el('b', null, F().exp(q.exp) + ' $' + kS(q.k) + q.cp), ' ' + F().sk(q.d), el('span', 'nv-cx', (isNum(spot) && spot ? ' · ' + pc(q.k / spot - 1) : '') + (isNum(q.usd) && q.usd > 0 ? ' · ' + F().usd(q.usd) : ''))]);
        tip(b, (on ? 'Clear the highlight' : 'Highlight this strike on the chart') + ': ' + F().exp(q.exp, ' ') + ' $' + kS(q.k) + (q.cp === 'P' ? ' puts' : ' calls') + ', ' + F().sk(q.d) + ' ' + sinceW(w) + ', ' + F().num(q.held) + ' open now');
        b.addEventListener('click', function () { SKT.go({ c: on ? '' : key }); });
        chipsRow.appendChild(b);
      });
      box.appendChild(chipsRow);
    }

    var lv = pick && pick.d.lv, spot0 = (M.liveMap && c.ext.live && c.ext.live.px) || (gx && gx.spot) || r.px;
    var sum = el('p', 'nv-sum');
    if (!gx) add(sum, el('span', 'mut', 'No GEX map for this name in this build.'));
    else if (lv) {
      if (pick.key !== pick.want) add(sum, el('span', 'mut', 'No ' + sym + ' option expires inside ' + (pick.want === '1M' ? 'a month' : pick.want) + ': showing ' + pick.key + '. '));
      add(sum, [el('span', 'mut', 'GEX map ' + pick.key + ': '), el('b', 'gold', 'King ' + kS(lv.king)), ' ' + pc(lv.king / spot0 - 1) + ' · ' + F().usd(lv.king_gex) + ' · ',
        el('span', 'cw', 'call wall ' + kS(lv.call_wall)), ' · ', el('span', 'pw', 'put wall ' + kS(lv.put_wall)),
        ' · flip ' + (isNum(lv.flip) ? kS(lv.flip) : 'none near the price') + ' · net ' + F().usd(lv.net) + ' · ' + (lv.n_exp || '–') + ' expir' + (lv.n_exp === 1 ? 'y' : 'ies') + (lv.last_exp ? ' to ' + longDay(lv.last_exp) : '')]);
      if (!(pick.d.bars || []).length) add(sum, el('span', 'mut', ' · strike bars for this window are left out of this file'));
    }
    box.appendChild(sum);
    var cbox = el('div', 'nv-cbox'), sbox = el('div', 'nv-sbox');
    box.appendChild(cbox);
    var leg = el('div', 'nv-legend');
    box.appendChild(leg);
    box.appendChild(el('div', 'nv-subh', 'Opened per session, by where the new contracts last traded'));
    box.appendChild(sbox);
    var leg2 = el('div', 'nv-legend');
    box.appendChild(leg2);

    var lay = el('div', 'nv-layers');
    add(lay, el('span', 'chips-lab', 'Layers'));
    LAYERS.forEach(function (l) {
      var b = el('button', 'nv-lay' + (M.layers[l[0]] !== false ? ' on' : ''), l[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', M.layers[l[0]] !== false ? 'true' : 'false');
      b.addEventListener('click', function () {
        M.layers[l[0]] = M.layers[l[0]] === false;
        saveLayers();
        b.classList.toggle('on', M.layers[l[0]] !== false);
        b.setAttribute('aria-pressed', M.layers[l[0]] !== false ? 'true' : 'false');
        if (M.draw) M.draw();
      });
      lay.appendChild(b);
    });
    box.appendChild(lay);
    var vint = el('p', 'nv-vint');
    var vb = [];
    if (gx) vb.push((M.liveMap && c.ext.live ? 'Live map re-priced at ' + F().money(c.ext.live.px) + ' (' + F().timeET(c.ext.live.asof) + ') from ' : 'GEX from ') + 'the ' + F().dayShort(gx.settle) + ' settle' + (M.liveMap && c.ext.live ? '' : ', priced at the ' + F().dayShort(gx.px_day) + ' close') + H.vintage(c));
    if (nb) vb.push('Daily prices to the ' + F().dayShort(nf.ohlc[nb - 1][0]) + ' close');
    if (win && win.from && per(w).base && win.from > per(w).base) vb.push('the ' + winShort(w) + ' changes count from the ' + F().dayShort(win.from) + ' settle (the oldest saved chain)');
    vint.textContent = vb.join(' · ') + (vb.length ? '. ' : '') + 'King, walls and flip come from the GEX map; ▲ / ▼ tags mark levels and big strikes beyond the chart.';
    box.appendChild(vint);

    var opts = chartOpts(c), crowd = crowdLine(c);
    M.draw = function () {
      opts.layers = M.layers;
      opts.onDraw = function (geo) {
        safe('legend', function () { legend(leg, geo, c, opts); legend2(leg2, c, crowd, geo); });
        if (sbox._nvRedraw && sbox.firstChild) sbox._nvRedraw();
      };
      if (S.cm === 'open') SKT.charts.opened(cbox, nf, opts); else SKT.charts.gex(cbox, nf, opts);
      SKT.charts.sessionBars(sbox, nf, { geoEl: cbox, side: c.lean, closes: c.ext.closes || null, crowd: crowd, dayInfo: opts.dayInfo });
    };
    afters.push(function () { M.draw(); });
    return box;
  }
  function longDay(iso) { if (!iso) return ''; var d = String(iso); return SKT.MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10)) + ' ' + d.slice(0, 4); }
  function sw(col, dash, label, w) {
    var s = el('span', 'lg');
    var svg = SKT.svg.root(18, 8, { 'aria-hidden': 'true' });
    SKT.svg.line(0, 4, 18, 4, { stroke: col, 'stroke-width': w || 2, 'stroke-dasharray': dash || null }, svg);
    s.appendChild(svg); add(s, ' ' + label);
    return s;
  }
  function swatch(col, label, cls) { var s = el('span', 'lg'); var i = el('i', 'sw' + (cls ? ' ' + cls : '')); i.style.background = col; s.appendChild(i); add(s, label); return s; }
  function legend(box, geo, c, o) {
    box.textContent = '';
    if (!geo) return;
    var L = M.layers, sh = geo.short, open = SKT.S.cm === 'open';
    if (geo.lv) {
      if (L.king !== false) box.appendChild(sw('#F5D63D', '', (sh ? 'K ' : '') + 'GEX map king (most net GEX)'));

      if (L.walls !== false) { box.appendChild(sw('#26A69A', '6 3', (sh ? 'CW ' : '') + 'call wall')); box.appendChild(sw('#EF5350', '6 3', (sh ? 'PW ' : '') + 'put wall')); }
      if (L.flip !== false) box.appendChild(sw('#9aa0ab', '3 3', (sh ? 'F ' : '') + 'flip'));
    }
    if (L.king !== false && isNum(o.kgK) && (!geo.lv || o.kgK !== geo.lv.king)) box.appendChild(sw('#FFD84D', '4 3', (sh ? 'KN ' : '') + 'king node (this board)', 1.4));
    box.appendChild(sw('#2962FF', '2 3', 'price'));
    if (o.mc && L.main !== false) box.appendChild(sw(c.puts ? '#EF5350' : '#C5B3F0', '6 4', 'main bet (from the window start)'));
    if (o.kpath && L.path !== false) box.appendChild(sw('#F5D63D', '1 3', 'King GEX king, last 12 sessions', 1.6));
    if (o.extraLines && o.extraLines.length) box.appendChild(sw(o.extraLines[0].color || '#9b7fe0', '5 4', 'saved day’s top strikes'));
    if (!open && geo.nBars) {
      var s = el('span', 'lg');
      add(s, [el('i', 'sw', null), el('i', 'sw', null)]);
      s.childNodes[0].style.background = '#26A69A'; s.childNodes[1].style.background = '#EF5350';
      add(s, 'net GEX at each strike, ' + geo.win + ' expiries ($ per 1% move)');
      box.appendChild(s);
      box.appendChild(swatch('#8ff5e6', 'bright inner part = opened ' + sinceW(c.w), 'thin'));
    }
    if (open) {
      box.appendChild(el('span', 'lg', '← puts · calls →'));
      box.appendChild(swatch('#2c6e66', 'held at the window start'));
      box.appendChild(swatch('#46e3cf', 'opened'));
      box.appendChild(swatch('transparent', 'dashed = closed', 'dash'));
    }
    if (L.marks !== false) box.appendChild(el('span', 'lg', '▲ call-build day · ▼ put-build day (solid = bought, hollow = sold, gold = a spread pair)'));
    if (L.ribbon !== false) box.appendChild(el('span', 'lg', 'ribbon: green calls led, red puts led, outline quiet; stronger colour = bigger share of its book'));
    if (geo.closeOnly || geo.line) box.appendChild(el('span', 'lg', geo.line ? 'closes drawn as a line (sessions too narrow for candles)' : 'a line where a session has only its close'));
    if (geo.hlBars) box.appendChild(el('span', 'lg', 'high-low bar with a close tick where the open is missing'));
    if (c.ern && (c.ern.l || c.ern.n) && L.earn !== false) box.appendChild(el('span', 'lg amber', 'E = earnings' + (c.ern.n ? ' · next ' + F().dayShort(c.ern.n) : '')));
  }
  function legend2(box, c, crowd, geo) {
    box.textContent = '';
    box.appendChild(el('span', 'lg', '↑ calls opened · ↓ puts opened'));
    box.appendChild(swatch('#26A69A', 'at the ask'));
    var st = el('span', 'lg'), i = el('i', 'sw stripe');
    st.appendChild(i); add(st, 'at the bid'); box.appendChild(st);
    box.appendChild(swatch('#5d6474', 'between bid and ask, or no late trade'));
    box.appendChild(el('span', 'lg', '● gold = its biggest day'));
    if (crowd) box.appendChild(sw('#F2B04B', '4 3', crowd.label + ' (crowd net %, own scale)'));
    if (c.ext.closes) box.appendChild(el('span', 'lg', 'dashed outline = contracts closed'));
    var nd = ((c.nf && c.nf.days) || []).filter(function (d) { return d && d.length > 1; }).length;
    if (geo && nd && geo.n > nd * 2.5 && SKT.S.pr !== '1m' && SKT.S.cs === 'd') {
      var b = el('button', 'linkbtn nv-widen', 'Price 1M widens these sessions');
      b.type = 'button';
      b.addEventListener('click', function () { SKT.go({ pr: '1m' }); });
      box.appendChild(b);
    }
  }
  function crowdLine(c) {
    var V = views(), cw = c.r.cw || [];
    if (!V || !V.crowds) return null;
    var id = cw.filter(function (x) { return /^ind:/.test(x); })[0];
    var cr = id && V.crowds.filter(function (x) { return x.id === id; })[0];
    if (!cr || !cr.spark || !cr.spark.length) return null;
    var ses = (c.D.sessions || []).map(function (s) { return s[0]; }), n = cr.spark.length, dates = ses.slice(-n);
    if (dates.length < n) return null;
    return { label: cr.label, pts: cr.spark.map(function (v, i) { return [dates[i], v]; }) };
  }


  function seekBox() {
    if (M.seek) return M.seek;
    var wrap = el('section', 'nv-panel nv-seek');
    var h = el('div', 'nv-seekh');
    add(h, [el('span', 'k', 'Price Seeker'), el('span', 'mut nv-seekw', 'the far call pile, its odds and the facts for this name')]);
    var wait = el('p', 'nv-wait', 'Loading Price Seeker…');
    var fr = el('iframe', 'nv-seekf');
    fr.title = 'Price Seeker for this name';
    fr.setAttribute('referrerpolicy', 'no-referrer');
    var out = el('p', 'mut nv-seekout', 'Outside Price Seeker’s list.');
    add(wrap, [h, wait, fr, out]);
    M.seek = { wrap: wrap, h: h, wait: wait, fr: fr, out: out, url: '' };
    return M.seek;
  }
  function seekShow(c) {
    var s = seekBox();
    s.wrap.hidden = !c.nf;
    var inList = !!c.r.sk;
    s.out.hidden = inList;
    s.fr.hidden = !inList;
    s.wait.hidden = !inList || s.wait.dataset.done === '1';
    s.h.querySelector('.nv-seekw').textContent = 'the far ' + (c.puts ? 'put' : 'call') + ' pile, its odds and the facts for this name';
    if (!inList || !c.nf) return;
    var u = SEEK_BASE + '?embed=1#' + (c.puts ? 'v=puts&o=' : '') + enc(c.sym);
    if (s.url === u) return;
    if (!s.url) s.fr.src = u;
    else { try { s.fr.contentWindow.location.replace(u); } catch (e) { s.fr.src = u; } }
    s.url = u;
  }
  window.addEventListener('message', function (e) {
    var s = M.seek;
    if (!s || e.source !== s.fr.contentWindow || !e.data || e.data.type !== 'ps-embed') return;
    var h = Math.max(0, Math.min(6000, Math.round(+e.data.h) || 0));
    s.fr.style.height = h + 'px';
    if (h > 40) { s.wait.hidden = true; s.wait.dataset.done = '1'; }
  });


  function flowBars(cv, pv) {
    var pos = Math.max(cv, pv, 0), neg = Math.max(-cv, -pv, 0), span = pos + neg || 1, z = neg / span * 100;
    var box = el('div', 'fbars');
    [['Calls', cv, 'c'], ['Puts', pv, 'p']].forEach(function (x) {
      var row = el('div', 'fr'), tr = el('span', 'ft'), v = x[1], wd = Math.abs(v) / span * 100;
      if (neg) { var zb = el('b'); zb.style.left = z.toFixed(2) + '%'; tr.appendChild(zb); }
      if (v) { var i = el('i', x[2]); i.style.left = (v >= 0 ? z : z - wd).toFixed(2) + '%'; i.style.width = Math.max(wd, 1).toFixed(2) + '%'; tr.appendChild(i); }
      add(row, [el('span', 'fl', x[0]), tr, el('span', 'fv', F().sk(v))]);
      box.appendChild(row);
    });
    return box;
  }
  function heldStart(c, w) {
    var b = c.cpb && c.cpb[w];
    if (b) {
      var s = [0, 0, 0, 0], ok = false;
      Object.keys(b).forEach(function (k) { var x = b[k]; if (x && isNum(x[2]) && isNum(x[3])) { ok = true; s[0] += x[2]; s[1] += x[3]; } if (x) { s[2] += x[0] || 0; s[3] += x[1] || 0; } });
      if (ok) return s;
    }
    var old = c.r.cd && c.D && c.D.latest && c.r.cd < c.D.latest;
    var h0 = old ? null : c.h0(w);
    if (h0 && isNum(c.r.oC)) return [h0[0], h0[1], c.r.oC, c.r.oP];
    return null;
  }
  function secCP(c) {
    var r = c.r, D = c.D, any = WINS.some(function (w) { return r.w && r.w[w] && (isNum(r.w[w].aC) || isNum(r.w[w].aP)); });
    if (!any && !isNum(r.oC)) return null;
    var box = section('nv-cvp', 'Calls vs puts on ' + c.sym);
    var hd = el('p', 'nv-ph');
    add(hd, ['Open now ', el('b', heldCls(r.oC, r.oP), rat(r.oC, r.oP)), ' (calls · puts, all expiries)']);
    var last = c.cph && c.cph.length ? c.cph[c.cph.length - 1] : null;
    if (last && isNum(last[3]) && isNum(last[4]) && last[3] + last[4] > 0) add(hd, [' · 180+ days ', el('b', heldCls(last[3], last[4]), rat(last[3], last[4]))]);
    box.appendChild(hd);
    var hs = heldStart(c, c.w);
    if (hs) {
      var l2 = el('p', 'nv-ph');
      add(l2, ['Held at the start (' + winShort(c.w) + ') ', el('b', null, rat(hs[0], hs[1])), ' → now ', el('b', null, rat(hs[2], hs[3]))]);
      box.appendChild(l2);
    }
    var cards = el('div', 'nv-cards');
    WINS.forEach(function (w) {
      var s = r.w && r.w[w];
      if (!s || !D.windows[w] || (!isNum(s.aC) && !isNum(s.aP))) return;
      var cd = el('div', 'nv-card' + (w === c.w ? ' on' : ''));
      add(cd, el('div', 'nv-ct', [SKT.winLabel(w).toUpperCase() + ' ', el('span', 'w', sinceW(w))]));
      var v = el('div', 'nv-cv');
      add(v, [el('span', addCls(s.aC, s.aP), addTxt(s.aC, s.aP)), ' ', el('span', 'mv', 'calls : puts added')]);
      cd.appendChild(v);
      cd.appendChild(flowBars(s.aC || 0, s.aP || 0));
      if (s.t180) {
        var t = el('div', 'nv-cs');
        add(t, ['180+ days added ', el('span', addCls(s.t180[0], s.t180[1]), addTxt(s.t180[0], s.t180[1])), el('span', 'mut', ' (' + F().sk(s.t180[0]) + ' · ' + F().sk(s.t180[1]) + ')')]);
        tip(t, 'Opened on expiries more than 183 days out');
        cd.appendChild(t);
      }
      var hz = heldStart(c, w);
      if (hz) {
        var a0 = share(hz[0], hz[1]), a1 = share(hz[2], hz[3]);
        if (a0 != null && a1 != null) cd.appendChild(p('nv-cs', 'held calls share ' + pt(a1 - a0) + ' ' + sinceW(w)));
      }
      cards.appendChild(cd);
    });
    box.appendChild(cards);
    if (c.cph && c.cph.length > 1) {
      box.appendChild(el('div', 'nv-subh', 'Open calls ÷ puts after each close'));
      var lg = el('div', 'nv-legend');
      add(lg, [sw('#D16BA5', '', 'all expiries'), sw('#3987E5', '5 3', '180+ days')]);
      box.appendChild(lg);
      var rb = el('div', 'nv-rbox');
      box.appendChild(rb);
      var guides = [];
      if (per('1w').base) guides.push({ d: per('1w').base, label: '1W' });
      if (per('1m').base) guides.push({ d: per('1m').base, label: '1M' });
      box._after = function () { SKT.charts.ratio(rb, c.cph, { guides: guides }); };
    }
    var b = c.cpb && c.cpb[c.w];
    if (b) {
      box.appendChild(el('div', 'nv-subh', 'Held by expiry · ' + winShort(c.w) + ' start → now'));
      var g = el('div', 'nv-bk');
      BUCKETS.forEach(function (bk) {
        var x = b[bk[0]];
        if (!x || !(x[0] + x[1] > 0)) return;
        var s0 = share(x[2], x[3]), s1 = share(x[0], x[1]);
        var row = el('div', 'nv-bkr');
        add(row, [el('span', 'nv-bkl', bk[1]), el('span', 'nv-bkv ' + heldCls(x[0], x[1]), rat(x[0], x[1])), SKT.ui.splitBar(x[0], x[1], { w: 110, tick: s0, mid: true }),
          el('span', 'nv-bkm', s0 != null && s1 != null ? pt(s1 - s0) : '')]);
        tip(row, bk[1] + ': ' + F().num(x[0]) + ' calls · ' + F().num(x[1]) + ' puts now' + (isNum(x[2]) ? '; at the window start ' + F().num(x[2]) + ' · ' + F().num(x[3]) : ''));
        g.appendChild(row);
      });
      if (g.childNodes.length) box.appendChild(g);
    }
    return box;
  }


  function secWhere(c) {
    var nf = c.nf, ex = nf && nf.exps;
    if (!ex || (!(ex.C || []).length && !(ex.P || []).length)) return null;
    var st = c.st, w = c.w, lean = c.lean, box = section('nv-where', 'Where the build went', sinceW(w));
    var col = { '1d': 2, '1w': 3, '2w': 4, '1m': 5 }[w], la = leanAdds(st, lean), side = sideW(lean);
    var parts = [];
    if (st.gx && st.gx.length) {
      parts.push('Of the ' + F().k(la) + ' ' + side + ' opened ' + sinceW(w) + ', ' + st.gx.map(function (g, i) { return i ? F().exp(g[0]) + ' took ' + Math.round(g[1] * 100) + '%' : Math.round(g[1] * 100) + '% went into ' + F().exp(g[0]); }).join('; ') + '.');
    } else if (col != null) {
      var arr = (ex[lean] || []).map(function (x) { return [x[0], x[col]]; }).filter(function (x) { return isNum(x[1]) && x[1] > 0; });
      var tot = arr.reduce(function (a, x) { return a + x[1]; }, 0);
      arr.sort(function (a, b) { return b[1] - a[1]; });
      if (tot > 0 && arr.length) {
        parts.push('Of the ' + F().k(la > 0 ? la : tot) + ' ' + side + ' opened ' + sinceW(w) + ', ' + Math.round(arr[0][1] / tot * 100) + '% went into ' + F().exp(arr[0][0]) +
          (arr[1] ? '; ' + F().exp(arr[1][0]) + ' took ' + Math.round(arr[1][1] / tot * 100) + '%' : '') + '.');
      }
    }
    var top = topAdded(nf.win && nf.win[w], w).filter(function (q) { return q.cp === lean; });
    if (isNum(la) && la > 0 && top.length) {
      var cum = 0, n = 0;
      for (var i = 0; i < top.length; i++) { cum += top[i].d; n++; if (cum >= la / 2) break; }
      if (cum >= la / 2) parts.push('Half the adds sit in ' + (n === 1 ? 'one contract' : n + ' contracts') + '.');
    }
    if (parts.length) box.appendChild(p('nv-txt', parts.join(' ')));
    [lean, lean === 'P' ? 'C' : 'P'].forEach(function (sd) {
      var rows = (ex[sd] || []).slice(0, 10);
      if (!rows.length) return;
      var cols = [{ k: 'e', label: (sd === 'P' ? 'Puts' : 'Calls') + ' · expiry', f: function (x) { return F().exp(x[0]); } },
        { k: 'h', label: 'Held now', num: true, f: function (x) { return x[1] == null ? '–' : F().num(x[1]); } }];
      [['1d', 2], ['1w', 3], ['2w', 4], ['1m', 5]].forEach(function (q) {
        cols.push({ k: q[0], label: winShort(q[0]), num: true, cls: q[0] === w ? 'nv-on' : '', f: function (x) { var v = x[q[1]]; return v == null ? '–' : el('span', v > 0 ? 'up' : v < 0 ? 'down' : 'mut', F().sk(v)); } });
      });
      var sum = [null, null, null, null, null, null];
      rows.forEach(function (x) { for (var j = 1; j < 6; j++) if (isNum(x[j])) sum[j] = (sum[j] || 0) + x[j]; });
      sum[0] = 'Sum';
      cols[0].f = (function (f0) { return function (x) { return x[0] === 'Sum' ? 'Sum' : f0(x); }; })(cols[0].f);
      box.appendChild(SKT.ui.table(cols, rows, { sum: sum, cls: 'nv-tbl' }));
      var more = ex.more && ex.more[sd];
      if (more) box.appendChild(p('nv-more', '+' + more + ' more expir' + (more === 1 ? 'y' : 'ies')));
    });
    if (w === 'all') box.appendChild(p('nv-more', 'Total is not split by expiry; the columns show the shorter windows.'));
    return box;
  }


  function flagEls(flags) {
    var s = el('span', 'nv-flags');
    String(flags || '').split('').forEach(function (f) {
      if (f === 'S') return;
      var d = FLAGS.filter(function (x) { return x[0] === f; })[0];
      if (!d) return;
      s.appendChild(tip(el('span', 'nv-flag f-' + f, d[1]), d[2] + H.flagNum(f)));
    });
    return s;
  }
  function secLines(c) {
    var nf = c.nf, w = c.w, win = nf && nf.win && nf.win[w];
    var T = ((win && win.top) || []).slice(0, 15);
    if (!T.length) return null;
    var box = section('nv-lines', 'Every new line', 'top ' + T.length + ' contracts · ' + sinceW(w));
    var cur = SKT.S.c, colW = { '1d': 4, '1w': 5, '2w': 6, '1m': 7 }[w];
    var cols = [
      { k: 'c', label: 'Contract', f: function (t) {
        var s = el('span', 'nv-con' + ((t[12] || '').indexOf('S') >= 0 ? ' strong' : ''));
        add(s, [el('span', 'nv-cp ' + (t[1] === 'P' ? 'p' : 'c'), t[1]), ' ' + kS(t[2]) + ' ', el('span', 'mut', F().exp(t[0]))]);
        if ((t[12] || '').indexOf('S') >= 0) tip(s, 'a strong line: two of new, building and big');
        return s;
      } },
      { k: 'a', label: 'Away', num: true, f: function (t) { return pc(t[8], 0); } },
      { k: 'h', label: 'Held', num: true, f: function (t) { return F().num(t[3]); } }
    ];
    [['1d', 4], ['1w', 5], ['2w', 6], ['1m', 7]].forEach(function (q) {
      cols.push({ k: q[0], label: winShort(q[0]), num: true, cls: q[1] === colW ? 'nv-on' : '', f: function (t) { var v = t[q[1]]; return v == null ? '–' : el('span', v > 0 ? 'up' : v < 0 ? 'down' : 'mut', F().sk(v)); } });
    });
    cols.push({ k: 'm', label: 'Mid', num: true, f: function (t) { return isNum(t[9]) ? t[9].toFixed(2) : '–'; } });
    cols.push({ k: 'u', label: '$ opened', num: true, f: function (t) { return isNum(t[10]) && t[10] > 0 ? F().usd(t[10]) : '–'; } });
    cols.push({ k: 'p', label: 'Last print', f: function (t) { return t[11] ? tip(el('span', 'mut', TAGS[t[11]] || t[11]), TAGW[t[11]] || '') : '–'; } });
    cols.push({ k: 't', label: 'Tags', f: function (t) { return flagEls(t[12]); } });
    var tb = SKT.ui.table(cols, T, {
      cls: 'nv-tbl nv-click',
      rowCls: function (t) { return conKey(t[0], t[1], t[2]) === cur ? 'hl' : ''; },
      onRow: function (t, tr) {
        var key = conKey(t[0], t[1], t[2]);
        tr.tabIndex = 0;
        tip(tr, key === cur ? 'Clear the highlight on the chart' : 'Highlight ' + kS(t[2]) + t[1] + ' ' + F().exp(t[0]) + ' on the chart');
        var go = function () { SKT.go({ c: key === cur ? '' : key }); };
        tr.addEventListener('click', go);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      }
    });
    box.appendChild(tb);
    var lg = el('p', 'nv-more');
    add(lg, 'Tags: ');
    FLAGS.forEach(function (f, i) { if (i) add(lg, ' · '); add(lg, [el('b', null, f[1]), ' ' + f[2] + H.flagNum(f[0])]); });
    add(lg, '. A gold outline marks a strong line.');
    box.appendChild(lg);
    return box;
  }


  function secSince(c) {
    var nf = c.nf;
    if (!nf) return null;
    var chg = nf.chg || {}, kc = nf.kchg, lines = chg.lines || [], cp = chg.cp || c.ext.cpchg || null;
    var by1 = nf.win && nf.win['1d'] && nf.win['1d'].by;
    if (!lines.length && !kc && !chg.px && !cp) return null;
    var from = nf.win && nf.win['1d'] && nf.win['1d'].from, L = nf.L;
    var box = section('nv-since', 'Since the last settle', from ? F().dayShort(from) + ' → ' + F().dayShort(L) : null);
    var spot = chg.px ? chg.px[1] : c.r.px, parts = [], groups = {}, order = [];
    lines.forEach(function (x) {
      var key = x[1] + (x[3] > 0 ? 'o' : 'c') + (isNum(spot) && x[2] >= spot ? 'a' : 'b');
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(x);
    });
    order.forEach(function (key) {
      var g = groups[key], first = g[0];
      var head = (key[0] === 'P' ? 'puts' : 'calls') + ' were ' + (key[1] === 'o' ? 'opened' : 'closed') + ' ' + (key[2] === 'a' ? 'above' : 'below') + ' the price: ';
      head += g.map(function (x, i) { return F().sk(x[3]) + ' at ' + kS(x[2]) + (i === 0 ? ' (' + F().exp(x[0], ' ') + (x[4] && TAGW[x[4]] ? ', ' + TAGW[x[4]] : '') + ')' : ''); }).join(', ');
      parts.push(head);
      void first;
    });
    var txt = parts.length ? parts.join('; ') + '.' : 'No line moved by a few hundred contracts or more.';
    txt = txt.charAt(0).toUpperCase() + txt.slice(1);
    if (cp && cp[0] && cp[1]) txt += ' The book went ' + rat(cp[0][0], cp[0][1]) + ' → ' + rat(cp[1][0], cp[1][1]) + ' calls : puts.';
    if (kc && isNum(kc.k0) && isNum(kc.k1)) txt += ' The king node moved ' + kS(kc.k0) + ' → ' + kS(kc.k1) + '.';
    if (chg.px && isNum(chg.px[0]) && isNum(chg.px[1])) txt += ' The price went ' + chg.px[0].toFixed(2) + ' → ' + chg.px[1].toFixed(2) + ' (' + pc(chg.px[1] / chg.px[0] - 1) + ').';
    box.appendChild(p('nv-txt', txt));
    var rows = [];
    if (cp && cp[0] && cp[1]) {
      rows.push(['Calls held', F().num(cp[0][0]), F().num(cp[1][0]), F().sk(cp[1][0] - cp[0][0])]);
      rows.push(['Puts held', F().num(cp[0][1]), F().num(cp[1][1]), F().sk(cp[1][1] - cp[0][1])]);
      rows.push(['Calls − puts', F().sk(cp[0][0] - cp[0][1]), F().sk(cp[1][0] - cp[1][1]), F().sk((cp[1][0] - cp[1][1]) - (cp[0][0] - cp[0][1]))]);
    }
    if (kc && isNum(kc.k0)) rows.push(['King node', kS(kc.k0), kS(kc.k1), kc.k1 === kc.k0 ? 'same' : 'moved']);
    if (chg.px && isNum(chg.px[0])) rows.push(['Price', chg.px[0].toFixed(2), chg.px[1].toFixed(2), pc(chg.px[1] / chg.px[0] - 1)]);
    if (rows.length) {
      box.appendChild(SKT.ui.table([{ k: 0, label: '' }, { k: 1, label: from ? F().dayShort(from) : 'before', num: true }, { k: 2, label: L ? F().dayShort(L) : 'now', num: true }, { k: 3, label: 'change', num: true }],
        rows, { cls: 'nv-tbl' }));
    }
    if (by1 && by1.length && isNum(spot)) {
      box.appendChild(el('div', 'nv-subh', 'Change by strike'));
      var mb = el('div', 'nv-mini');
      box.appendChild(mb);
      box._after = function () { SKT.charts.byStrike(mb, by1, { spot: spot }); };
    }
    if (lines.length) {
      box.appendChild(SKT.ui.table([
        { k: 'c', label: 'Contract', f: function (x) { var s = el('span'); add(s, [el('span', 'nv-cp ' + (x[1] === 'P' ? 'p' : 'c'), x[1]), ' ' + kS(x[2]) + ' ', el('span', 'mut', F().exp(x[0]))]); return s; } },
        { k: 'd', label: 'Change', num: true, f: function (x) { return el('span', x[3] > 0 ? 'up' : 'down', F().sk(x[3])); } },
        { k: 't', label: 'Last print', f: function (x) { return x[4] ? TAGS[x[4]] || x[4] : '–'; } }
      ], lines, { cls: 'nv-tbl' }));
    }
    return box;
  }



  var GATES = [
    ['book', function (v) { return F().num(v) + ' contracts open on the stock'; }],
    ['price', function (v) { return F().money(v) + ' share price'; }],
    ['reading', function (v) { return v ? 'read on this settle' : 'no reading for this settle'; }],
    ['history', function (v, c) { return c.st.cov ? 'read on ' + c.st.cov[0] + ' of ' + c.st.cov[1] + ' sessions' : 'read on ' + Math.round(v * 100) + '% of the sessions'; }],
    ['none', function (v) { return F().num(v) + ' new contracts'; }],

    ['two', function (v, c) { return SKT.oneWords(c.st, c.lean, true) || (isNum(v) ? 'at least ' + Math.round((1 + Math.abs(v)) / 2 * 100) + '% one-sided on new contracts and on the net opens' : 'one-sided on new contracts and on the net opens'); }],
    ['disagree', function (v) { return v ? 'net and new contracts point different ways' : 'net and new contracts agree'; }],
    ['closed', function (v, c, ok) { return isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + F().num(Math.abs(v)) + ' ' + sideW(c.lean) + ' net' : ok ? 'that side opened, not closed' : 'that side closed, not opened'; }],
    ['size', function (v) { return 'net ' + F().num(Math.abs(v)) + ' contracts'; }],
    ['share', function (v, c) { return 'net ' + F().spct(c.lean === 'P' ? -Math.abs(v) : Math.abs(v)) + ' of its open interest'; }],
    ['newexp', function (v, c, ok) { return isNum(v) ? Math.round(v * 100) + '% in newly listed expiries' : ok ? 'not mostly a newly listed expiry' : 'mostly a newly listed expiry'; }],
    ['deep', function (v, c, ok) { return isNum(v) ? Math.round(v * 100) + '% deep in the money' : ok ? 'not mostly deep in the money' : 'mostly deep in the money'; }],
    ['illiquid', function (v, c, ok) { return isNum(v) ? F().usd(v) + ' traded a day' : ok ? 'liquid underlying' : 'illiquid underlying'; }],
    ['lev', function (v) { return v ? 'a leveraged or inverse fund' : 'not a leveraged or inverse fund'; }]
  ];

  function gateWord(id, v, c, ok) { for (var i = 0; i < GATES.length; i++) if (GATES[i][0] === id) return GATES[i][1](isNum(v) ? v : null, c, ok); return id; }
  function ordinal(n) { var v = n % 100; return n + (v >= 11 && v <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'); }
  function secWhy(c) {
    var nf = c.nf, st = c.st, w = c.w, ch = nf && nf.checks && nf.checks[w];
    if (!ch && !c.has) return null;
    var box = section('nv-why', 'Why it ranks');
    var head = el('p', 'nv-whyh'), D = c.D;
    if (st.r) add(head, el('b', 'gold', 'RANKED #' + st.r + ' of ' + (((D.windows[w] || {})[c.lean]) || []).length + ' · ' + sideW(c.lean) + ' · ' + winShort(w)));
    else if (st.near) add(head, [el('b', 'amber', 'NEAR MISS'), st.why ? ' · ' + st.why : '']);
    else add(head, [el('b', 'down', 'NOT RANKED'), st.why ? ' · ' + st.why : '']);
    box.appendChild(head);
    if (ch && ch.length) {
      var ul = el('div', 'nv-chk'), xv = (c.ext && c.ext.chk && c.ext.chk[w]) || [];
      var xval = function (id) { for (var i = 0; i < xv.length; i++) if (xv[i] && xv[i][0] === id) return xv[i][1]; return null; };
      ch.forEach(function (g) {
        var ok = !!g[1], row = el('div', 'nv-ck' + (ok ? '' : ' no')), v = g[2] != null ? g[2] : xval(g[0]);
        add(row, [el('span', ok ? 'y' : 'n', ok ? '✓' : '✕'), el('span', null, gateWord(g[0], v, c, ok) + (ok ? '' : ' ' + (H.gateNeed(g[0], c) || '(short of the rule)')))]);
        ul.appendChild(row);
      });
      box.appendChild(ul);
    }
    var pp = nf && nf.pctl && nf.pctl[w];
    if (pp) {
      box.appendChild(el('div', 'nv-subh', c.sym + ' against every name read ' + SKT.winWord(w) + ' · percentile'));
      pp.forEach(function (v, i) {
        if (!PCTL[i]) return;
        var row = el('div', 'nv-pb');
        add(row, [el('span', null, PCTL[i]), SKT.ui.bar(v, { w: 120, cls: 'blue' }), el('span', 'num', isNum(v) ? ordinal(Math.round(v)) : '–')]);
        box.appendChild(row);
      });
    }
    return box;
  }


  function bizVal(m, peg) {
    var key = m[0], v = m[3];
    if (!isNum(v)) return key === 'peg' && peg ? 'n/a (' + peg + ')' : 'n/a';
    if (key === 'peg') return v.toFixed(2);
    if (key === 'fcf_margin') return v.toFixed(1) + '%';
    var t = Math.abs(v).toFixed(Math.abs(v) >= 100 ? 0 : 1);
    return sg(v, t) + t + '%';
  }
  function secBiz(c) {
    var b = c.nf && c.nf.biz, r = c.r;
    if (!b && !isNum(r.biz) && !isFund(r)) return null;
    var box = section('nv-biz', 'Business score');
    if (!b || !isNum(b.score)) {
      box.appendChild(p('nv-txt', isFund(r) ? 'Funds have no business score.' : 'Too few business numbers on file for a score.'));
      return box;
    }
    var hd = el('div', 'nv-bizh'), bd = SKT.biz(b.score);
    add(hd, [el('span', 'nv-bizbig', [String(b.score), el('span', 'mut', '/100')]), SKT.ui.meter(b.score, { big: true }), el('span', 'nv-ph', bd.word + ' vs the S&P 500 + Nasdaq-100' + (b.d ? ' · fundamentals from ' + F().dayShort(b.d) : '') + ' · display only, never part of the ranking')]);
    box.appendChild(hd);
    var parts = el('div', 'nv-bizp'), wts = c.ext.wts;
    (b.m || []).forEach(function (m, i) {
      var out = !isNum(m[4]), d = el('div', 'nv-bzp' + (out ? ' out' : ''));
      var wt = wts && isNum(wts[i]) ? wts[i] : null, bt = out ? 0 : Math.min(99, Math.round(m[4]));
      add(d, [el('div', 'nv-bzl', [m[1], wt != null ? el('span', 'mut', ' ' + wt + '%') : '']), el('div', 'nv-bzv', bizVal(m, b.peg)), SKT.ui.meter(out ? null : m[4]),
        el('div', 'nv-bzr', out ? 'left out' : !isNum(m[3]) ? 'counted as better than ' + bt + '%' : 'better than ' + bt + '% of the base')]);
      tip(d, out ? m[1] + ': no figure on file, so it is left out of the score' : m[1] + ': ' + bizVal(m, b.peg) + (isNum(m[3]) ? ', better than ' : ', counted in the score as better than ') + bt + '% of the S&P 500 + Nasdaq-100');
      parts.appendChild(d);
    });
    box.appendChild(parts);
    if (isNum(c.ext.mcap)) box.appendChild(p('nv-more', 'Market cap ' + F().usd(c.ext.mcap)));
    return box;
  }


  function lt(title, v, s, cls, t) { return tile(title, v, s, 'nv-lt' + (cls ? ' ' + cls : ''), t); }
  function secLevels(c) {
    var r = c.r, kg = r.kg, kx = r.kx, kt = r.kt, ktn = r.ktn, gx = c.nf && c.nf.gex;
    if (!kg && !kx && !kt && !ktn && !gx) return null;
    var box = section('nv-levels', 'Levels'), g = el('div', 'nv-ltiles'), spot = r.px;
    if (kg && isNum(kg[0])) {
      var moved = c.nf && c.nf.kchg && isNum(c.nf.kchg.k0) && c.nf.kchg.k0 !== kg[0] ? 'moved from ' + kS(c.nf.kchg.k0) : null;
      var held = c.nf && c.nf.khist ? (function () { var h = c.nf.khist, n = 0; for (var i = h.length - 1; i >= 0 && h[i][1] === kg[0]; i--) n++; return n; })() : 0;
      g.appendChild(lt('King node (this board)', el('span', 'gold', kS(kg[0]) + ' ' + F().spct(kg[1])),
        [F().usd(kg[2]) + (kg[4] ? ' · ' + F().exp(kg[4]) : ''), kx && isNum(kx.conc) ? ' · ' + Math.round(kx.conc * 100) + '% of the map' : '', kx && isNum(kx.dom) ? ' · ' + kx.dom.toFixed(1) + '× next' : '',
          moved ? ' · ' + moved : held > 1 ? ' · held ' + held + ' sessions' : ''].join(''), null, 'The strike with the most call gamma on this board’s chain (gamma dollars per 1% move)'));
    }
    if (kt && isNum(kt.k)) {
      g.appendChild(lt('King GEX king', el('span', 'gold', kS(kt.k) + ' ' + F().spct(kt.dist)),
        [F().usd(kt.v), kt.exp ? ' · ' + F().exp(kt.exp) : '', isNum(kt.dte) ? ' · ' + kt.dte + ' days' : '', isNum(kt.sig) ? ' · ' + kt.sig.toFixed(1) + 'σ' : '',
          isNum(kt.h) ? ' · held ' + kt.h + ' session' + (kt.h === 1 ? '' : 's') : '', isNum(kt.share) ? ' · ' + Math.round(kt.share * 100) + '% of the map' : '', isNum(kt.dom) ? ' · ' + kt.dom.toFixed(1) + '× next' : ''].join(''),
        null, 'The King GEX Tracker’s positive king for this name' + (kt.d ? ', as of ' + F().dayShort(kt.d) : '')));
    }
    if (kx && isNum(kx.fl)) {
      var above = isNum(spot) ? spot >= kx.fl : null;
      g.appendChild(lt('Flip (this board)', kS(kx.fl) + ' ' + (isNum(spot) ? F().spct(kx.fl / spot - 1) : ''), above == null ? '' : above ? 'price above it: net long gamma' : 'price below it: net short gamma', null,
        'Where the map’s net gamma changes sign (this board’s chain)'));
    }
    if (kx && (isNum(kx.cw) || isNum(kx.pw))) {
      var rel = function (k) { return isNum(spot) && spot ? k / spot - 1 : null; }, aw = function (k) { var d = rel(k); return d == null ? '' : d >= 0 ? 'above' : 'below'; };
      if (isNum(kx.cw)) g.appendChild(lt('Call wall (this board)', el('span', 'cw', kS(kx.cw) + ' ' + (rel(kx.cw) != null ? F().spct(rel(kx.cw)) : '')), 'the biggest call strike' + (aw(kx.cw) ? ' ' + aw(kx.cw) + ' the price' : ''), null,
        'This board’s chain (the chart’s walls come from the GEX map)'));
      if (isNum(kx.pw)) g.appendChild(lt('Put wall (this board)', el('span', 'pw', kS(kx.pw) + ' ' + (rel(kx.pw) != null ? F().spct(rel(kx.pw)) : '')), 'support' + (aw(kx.pw) ? ' ' + aw(kx.pw) + ' the price' : '') + (isNum(kx.air) ? ' · air pocket to ' + kS(kx.air) : ''), null,
        'This board’s chain (the chart’s walls come from the GEX map)'));
    }
    if (kt && kt.st) {
      var sc = SETUP.filter(function (x) { return x[0] === kt.st; })[0];
      g.appendChild(lt('Setup (King GEX)', el('span', 'nv-setup s-' + (sc ? sc[1] : 'x'), kt.st), isNum(kt.sc) ? 'king strength ' + Math.round(kt.sc) : '', null, 'King GEX’s setup tag for the king'));
    }
    if (kt && kt.pl && kt.pl.length >= 8) {
      var pl = kt.pl;
      g.appendChild(lt('Pile (King GEX)', kS(pl[0]) + (pl[1] !== pl[0] ? '-' + kS(pl[1]) : ''), [F().usd(pl[3]), isNum(pl[4]) ? ' · ' + Math.round(pl[4] * 100) + '% of the map' : '', pl[5] ? ' · mostly ' + F().exp(pl[5]) : '', pl[7] ? ' · king inside ✓' : ''].join(''), null,
        'A run of neighbouring strikes holding most of the call gamma'));
    }
    if (ktn && isNum(ktn.k)) g.appendChild(lt('Negative king (King GEX)', el('span', 'down', kS(ktn.k) + ' ' + F().spct(ktn.dist)), F().usd(ktn.v) + (ktn.exp ? ' · ' + F().exp(ktn.exp) : '') + (isNum(ktn.sig) ? ' · ' + ktn.sig.toFixed(1) + 'σ' : ''), null, 'The strike with the most negative gamma (King GEX)'));
    else if (kx && kx.tr) g.appendChild(lt('Negative king (this board)', el('span', 'down', kS(kx.tr[0]) + ' ' + (isNum(spot) ? F().spct(kx.tr[0] / spot - 1) : '')), F().usd(kx.tr[1]) + (kx.tr[2] ? ' · ' + F().exp(kx.tr[2]) : '') + (isNum(kx.trc) ? ' · ' + Math.round(kx.trc * 100) + '% of the map' : '') + (isNum(kx.trd) ? ' · ' + kx.trd.toFixed(1) + '× next' : ''), null, 'The strike with the most negative gamma on this board’s chain'));
    box.appendChild(g);
    if (gx && gx.H) {
      var bits = [];
      GW.forEach(function (x) { var h = gx.H[x[1]]; if (h && h.lv && isNum(h.lv.king)) bits.push(x[1] + ' ' + kS(h.lv.king)); });
      if (bits.length) box.appendChild(p('nv-more', 'King by GEX window (GEX map): ' + bits.join(' · ')));
    }
    return g.childNodes.length ? box : null;
  }
  function secLoud(c) {
    var r = c.r, ld = r.ld || [], stl = r.stl;
    if (!ld.length && !stl) return null;
    var box = section('nv-loud', 'On Loud Calls / Stealth'), list = el('div', 'nv-loudl');
    ld.forEach(function (e) {
      var T = e[4] === 'P' ? LOUD_P : LOUD_C, d = T.filter(function (x) { return x[0] === e[0]; })[0] || [e[0], 'Loud', 'muted'];
      var a = el('a', 'nv-loudi');
      a.href = LINK.loud(c.sym, e[4] === 'P'); a.target = '_blank'; a.rel = 'noopener';
      add(a, [SKT.ui.pill(d[1] + ' ' + F().dayShort(e[1]), d[2]), ' ' + F().usd(e[2]) + (e[3] > 1 ? ' · ' + e[3] + 'x' : '') + (isNum(e[5]) ? ' · ' + F().k(e[5]) + ' ' + sideW(e[4]) : '') + (isNum(e[6]) ? ' · ' + Math.round(e[6] * 100) + '% bought' : '')]);
      list.appendChild(a);
    });
    if (stl) {
      var s = STEALTH.filter(function (x) { return x[0] === stl[0]; })[0];
      var a2 = el('a', 'nv-loudi');
      a2.href = LINK.stealth(c.sym); a2.target = '_blank'; a2.rel = 'noopener';
      add(a2, [SKT.ui.pill(s ? s[1] : 'Steady build', 'gold'), stl[1] ? ' since ' + F().dayShort(stl[1]) : '']);
      list.appendChild(a2);
    }
    box.appendChild(list);
    return box;
  }


  function secIV(c) {
    var nf = c.nf, ivt = nf && nf.ivt, st = c.st;
    if (!ivt || ivt.length < 2) return null;
    var box = section('nv-iv', 'Implied volatility by expiry'), mc = st.mc, iv30 = nf.iv30;
    var line = [];
    if (mc && isNum(st.ivm)) line.push(F().exp(mc[0]) + ' IV ' + st.ivm.toFixed(0) + '%' + (isNum(st.ivj) ? ' · ' + sg(st.ivj, Math.abs(st.ivj).toFixed(1)) + Math.abs(st.ivj).toFixed(1) + ' pts on the day' : ''));
    if (iv30 && isNum(iv30[0])) line.push('30-day IV ' + iv30[0].toFixed(0) + '%' + (isNum(iv30[1]) ? ' (' + sg(iv30[1], Math.abs(iv30[1]).toFixed(1)) + Math.abs(iv30[1]).toFixed(1) + ')' : ''));
    if (nf.ivb && isNum(nf.ivb[1])) line.push('bump +' + nf.ivb[1].toFixed(1) + ' vol pts at ' + F().exp(nf.ivb[0]));
    if (line.length) box.appendChild(p('nv-txt', line.join(' · ')));
    var ib = el('div', 'nv-ivbox');
    box.appendChild(ib);
    box.appendChild(p('nv-more', 'At-the-money implied volatility at the ' + F().dayShort(nf.L) + ' settle; gold = the main bet’s expiry, dashed = 30-day IV.'));
    box._after = function () { SKT.charts.iv(ib, ivt, { L: nf.L, mcExp: mc ? mc[0] : null, iv30: iv30 ? iv30[0] : null, bump: nf.ivb }); };
    return box;
  }


  function secDaily(c) {
    var r = c.r, nf = c.nf, D = c.D, ses = D.sessions || [];
    if (!(r.d || []).some(Boolean)) return null;
    var box = section('nv-daily', 'Day by day');
    var V = views(), r1 = V && V.r1d, pr = per(c.w), kx = r.kx, fl = kx && isNum(kx.fl) ? kx.fl : null;
    var closes = {}, kings = {}, tops = {};
    ((nf && nf.ohlc) || []).forEach(function (b) { closes[b[0]] = b[4]; });
    ((nf && nf.khist) || []).forEach(function (h) { kings[h[0]] = h[1]; });
    ((nf && nf.days) || []).forEach(function (d) { if (d && d.length > 8) tops[d[0]] = [d[7], d[8]]; });
    var nets = (r.d || []).slice(-21).map(function (x) { return x ? x[4] : null; });
    var hdr = el('div', 'nv-dhdr');
    add(hdr, [el('span', 'mut', 'Net per session, last 21'), SKT.ui.spark(nets, { w: 150, h: 24 })]);
    box.appendChild(hdr);
    var rows = [];
    for (var i = ses.length - 1; i >= 0; i--) rows.push({ d: ses[i][0], x: (r.d || [])[i] || null, i: i });
    var prevClose = function (j) { for (var q = j - 1; q >= 0; q--) { var cc = closes[ses[q][0]]; if (isNum(cc)) return cc; } return null; };
    var prevKing = function (j) { for (var q = j - 1; q >= 0; q--) { var kk = kings[ses[q][0]]; if (isNum(kk)) return kk; } return null; };
    var cols = [
      { k: 'd', label: 'Day', f: function (o) { var s = el('span', null, F().day(o.d)); if (c.ext.ndays && c.ext.ndays[o.d]) add(s, [' ', tip(el('i', 'nv-ndot'), 'News on this day: see the News card')]); return s; } },
      { k: 'px', label: 'Close', num: true, f: function (o) { var v = closes[o.d]; return isNum(v) ? v.toFixed(2) : '–'; } },
      { k: 'c', label: 'Calls opened', num: true, f: function (o) { return o.x ? F().sk(o.x[2]) : '–'; } },
      { k: 'p', label: 'Puts opened', num: true, f: function (o) { return o.x ? F().sk(o.x[3]) : '–'; } },
      { k: 'n', label: 'Net', num: true, f: function (o) { return o.x ? el('span', o.x[4] >= 0 ? 'up' : 'down', F().sk(o.x[4])) : '–'; } },
      { k: 'b', label: 'Of book', num: true, f: function (o) { return o.x && isNum(o.x[5]) ? pc(o.x[5]) : '–'; } },
      { k: 'r', label: 'Read', f: function (o) { return o.x && o.x[6] ? READS[o.x[6]] || o.x[6] : '–'; } },
      { k: 't', label: 'Traded C : P', num: true, f: function (o) { return o.x && isNum(o.x[7]) && isNum(o.x[8]) && o.x[7] + o.x[8] > 0 ? rat(o.x[7], o.x[8]) : '–'; } },
      { k: 'k', label: 'King', num: true, f: function (o) { var v = kings[o.d]; return isNum(v) ? kS(v) : '–'; } }
    ];
    if (r1 && r1.days) {
      var idx = {};
      r1.days.forEach(function (d, j) { idx[d] = j; });
      var sC = (r1.C || {})[c.sym] || '', sP = (r1.P || {})[c.sym] || '';
      cols.push({ k: 'rk', label: 'Ranked', f: function (o) {
        var j = idx[o.d];
        if (j == null) return '–';
        if (sC.charAt(j) === '1') return tip(el('span', 'up', '✓'), 'on that settle’s 1D calls list');
        if (sP.charAt(j) === '1') return tip(el('span', 'down', '✓'), 'on that settle’s 1D puts list');
        return '';
      } });
    }
    cols.push({ k: 'w', label: 'What changed', f: function (o) {
      var bits = [], k1 = kings[o.d], k0 = prevKing(o.i);
      if (isNum(k1) && isNum(k0) && k1 !== k0) bits.push('king ' + kS(k0) + ' → ' + kS(k1));
      var c1 = closes[o.d], c0 = prevClose(o.i);
      if (fl != null && isNum(c1) && isNum(c0)) { if (c0 < fl && c1 >= fl) bits.push('crossed above flip'); else if (c0 > fl && c1 <= fl) bits.push('crossed below flip'); }
      return bits.join(' · ');
    } });
    cols.push({ k: 'no', label: 'Note', f: function (o) {
      var x = o.x, notes = [];
      if (!x) return '';
      if (x[0] > 1) notes.push('joins ' + x[0] + ' sessions');
      if (x[1] === 's') notes.push('net only');
      if (String(x[9] || '').indexOf('x') >= 0) notes.push('rise exceeds the day’s trading');
      if (String(x[9] || '').indexOf('i') >= 0) notes.push('mostly deep in the money');
      if (x[10]) notes.push('pair at ' + F().strike(x[10][1]) + ' / ' + F().strike(x[10][2]) + ' (spread?)');
      return el('span', 'mut', notes.join(' · '));
    } });
    var day = SKT.S.day;
    var tb = SKT.ui.table(cols, rows, {
      cls: 'nv-tbl nv-click nv-dtbl',
      rowCls: function (o) { return (o.d >= (pr.since || '9') && o.d <= (pr.to || '')) ? (o.d === day ? 'inwin hl' : 'inwin') : o.d === day ? 'hl' : ''; },
      onRow: function (o, tr) {
        var t = tops[o.d];
        if (!t || (!(t[0] || []).length && !(t[1] || []).length)) return;
        tr.tabIndex = 0;
        tip(tr, 'Show the day’s top new contracts');
        var toggle = function () {
          var nx = tr.nextSibling;
          if (nx && nx.classList && nx.classList.contains('nv-dx')) { nx.parentNode.removeChild(nx); delete M.openDays[o.d]; return; }
          var dr = el('tr', 'nv-dx'), td = el('td');
          td.colSpan = cols.length;
          var bits = [];
          [['calls', t[0], 'C'], ['puts', t[1], 'P']].forEach(function (q) {
            if (!q[1] || !q[1].length) return;
            bits.push('Top ' + q[0] + ' opened: ' + q[1].map(function (z) { return F().exp(z[0]) + ' $' + kS(z[1]) + q[2] + ' ' + F().sk(z[2]); }).join(' · '));
          });
          td.textContent = bits.join('; ');
          dr.appendChild(td);
          tr.parentNode.insertBefore(dr, tr.nextSibling);
          M.openDays[o.d] = 1;
        };
        tr.addEventListener('click', toggle);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') toggle(); });
        if (M.openDays[o.d]) setTimeout(toggle, 0);
      }
    });
    box.appendChild(tb);
    box.appendChild(p('nv-more', 'Shaded rows = the ' + winShort(c.w) + ' window. King = this board’s king node on the chain priced at that close. Click a row for its top new contracts.'));
    return box;
  }


  function stepList() { var S = SKT.S; return SKT.listOf(S.w, S.side, S.list); }
  function renderList(box, sym) {
    box.textContent = '';
    var S = SKT.S, syms = stepList(), w = S.w === 'tape' ? '1d' : S.w;
    var h = el('div', 'nv-lh');
    add(h, [el('span', null, F().num(syms.length) + ' ' + (S.side === 'P' ? 'put' : S.side === 'B' ? '' : 'call') + (S.side === 'B' ? 'ranked' : '-leaning') + ' · ' + winShort(S.w)), el('span', 'mut', 'of book')]);
    box.appendChild(h);
    function item(s, i) {
      var r = SKT.row(s) || {}, st = (r.w && r.w[w]) || {};
      var b = el('button', 'nv-li' + (s === sym ? ' sel' : ''));
      b.type = 'button';
      add(b, [el('span', 'mut nv-lr', i ? String(i) : ''), el('span', 'nv-lt', s)]);
      var gl = SKT.ui.glyph(st.gb, { w: 92, h: 22 });
      b.appendChild(gl);
      add(b, el('span', 'nv-lv ' + (st.side === 'P' ? 'down' : 'up'), isNum(st.pct) ? F().pct(Math.abs(st.pct), 1) : ''));
      b.addEventListener('click', function () { if (s !== SKT.S.open) SKT.go({ open: s, day: '', c: '' }, { push: false }); });
      return b;
    }
    if (syms.indexOf(sym) < 0) {
      box.appendChild(el('div', 'nv-lg', 'Selected'));
      box.appendChild(item(sym, 0));
      box.appendChild(el('div', 'nv-lg', 'The list'));
    }
    syms.forEach(function (s, i) { box.appendChild(item(s, i + 1)); });
    var sel = box.querySelector('.nv-li.sel');
    if (sel) requestAnimationFrame(function () {
      var bt = sel.offsetTop, bh = sel.offsetHeight;
      if (bt < box.scrollTop + 30 || bt + bh > box.scrollTop + box.clientHeight - 10) box.scrollTop = bt - box.clientHeight / 2;
    });
  }
  document.addEventListener('keydown', function (e) {
    var S = SKT.S;
    if (!S || !S.open || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (e.key === 'Escape') {
      if (document.querySelector('.dd.open:not(.dd-bare)')) return;
      e.preventDefault(); SKT.go({ open: null }); return;
    }
    var dir = e.key === 'j' || e.key === 'ArrowDown' ? 1 : e.key === 'k' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    var L = stepList();
    if (!L.length) return;
    var i = L.indexOf(S.open), nx = i < 0 ? L[0] : L[Math.max(0, Math.min(L.length - 1, i + dir))];
    e.preventDefault();
    if (nx && nx !== S.open) SKT.go({ open: nx, day: '', c: '' }, { push: false });
  }, true);


  function secNoFile(c) {
    var st = c.st, w = c.w, box = section('nv-nofile');
    var t = el('p', 'nv-nft');
    add(t, [el('b', null, 'No chart for ' + c.sym), st.r ? ' · ranked #' + st.r + ' ' + sideW(c.lean) + ' on ' + winShort(w) : ' · not ranked on ' + winShort(w) + ' ' + sideW(c.lean) + (c.has && st.why ? ': ' + st.why : c.has ? '' : ': no reading')]);
    box.appendChild(t);
    box.appendChild(p('nv-txt', 'The chart and the contract tables are kept for the names ranked on the newest settle (any window, either side) and the pinned ones; ' + c.sym + ' is not among them in this build.'));
    var b = el('div', 'nv-open');
    function btn(label, href) { var a = el('a', 'obtn', label); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; }
    if (c.r.eel) b.appendChild(btn('Eagle Eye ↗', LINK.eagle(c.sym, EE_TF[SKT.S.w] || '1W')));
    b.appendChild(btn('King GEX ↗', LINK.kgt(c.sym)));
    box.appendChild(b);
    return box;
  }


  var SPECS = [
    { key: 'cp', tab: 'cp', po: 1, at: 7, fn: secCP },
    { key: 'where', tab: 'build', po: 1, at: 8, fn: secWhere },
    { key: 'since', tab: 'build', po: 3, at: 9, fn: secSince },
    { key: 'why', tab: 'build', po: 4, at: 10, fn: secWhy },
    { key: 'levels', tab: 'levels', po: 1, at: 11, fn: secLevels },
    { key: 'loud', tab: 'levels', po: 2, at: 11.5, fn: secLoud },
    { key: 'biz', tab: 'biz', po: 1, at: 12, fn: secBiz },
    { key: 'iv', tab: 'levels', po: 3, at: 13, fn: secIV },
    { key: 'lines', tab: 'build', po: 2, at: 15, fn: secLines },
    { key: 'daily', tab: 'days', po: 1, at: 16, fn: secDaily }
  ];
  function skeleton(box) {
    var nv = box.querySelector(':scope > .nv');
    if (nv) return nv;
    box.textContent = '';
    nv = el('div', 'nv');
    var list = el('aside', 'nv-list'); list.setAttribute('aria-label', 'The ranked list');
    var cc = el('div', 'nv-c'), top = el('div', 'nv-top'), slot = el('div', 'nv-seekslot'), low = el('div', 'nv-low');
    var rr = el('div', 'nv-r'), tabs = el('div', 'nv-tabs'), secs = el('div', 'nv-secs'), mv = el('div', 'nv-mv');
    tabs.setAttribute('role', 'tablist');
    add(cc, [top, slot, low, mv]); add(rr, [tabs, secs]); add(nv, [list, cc, rr]);
    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(function () { if (Date.now() - BAL.at < 4000 || window.scrollY < 300) balanceSoon(); });
      ro.observe(top); ro.observe(slot); ro.observe(secs); ro.observe(mv);
    }
    slot.appendChild(seekBox().wrap);
    box.appendChild(nv);
    return nv;
  }
  function setTab(nv, t) {
    store().set('sk.ntab', t === 'build' ? null : t);
    Array.prototype.forEach.call(nv.querySelectorAll('.nv-tab'), function (b) { var on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    Array.prototype.forEach.call(nv.querySelectorAll('.nv-secs > .nv-panel'), function (s) { s.classList.toggle('tab-on', s.dataset.tab === t); });
    SKT.charts.redraw();
  }




  var BAL = { t: null, at: 0, n: 0 };
  function balanceSoon() { clearTimeout(BAL.t); BAL.t = setTimeout(function () { safe('balance', balance); }, 120); }
  function balance() {
    var nv = document.querySelector('#name > .nv');
    if (!nv || !SKT.S.open) return;
    var cc = nv.querySelector('.nv-c'), rr = nv.querySelector('.nv-r'), secs = rr && rr.querySelector('.nv-secs'), mv = nv.querySelector('.nv-mv');
    if (!cc || !secs || !mv) return;
    var kids = function (x) { return Array.prototype.slice.call(x.children); };
    var panels = kids(secs).concat(kids(mv)).sort(function (a, b) { return (+a.dataset.at || 0) - (+b.dataset.at || 0); });
    var wide = (window.innerWidth || 0) >= SKT.BP.two && getComputedStyle(rr).display !== 'none';
    if (!wide) {
      if (mv.children.length) { panels.forEach(function (n) { secs.appendChild(n); }); setTab(nv, tabNow()); }
      return;
    }
    var n = panels.length, k0 = secs.children.length;
    if (n < 2 || BAL.n > 6) return;
    var hs = panels.map(function (x) { return x.getBoundingClientRect().height; }), GAP = 10, MVT = 12;
    var fixed = cc.getBoundingClientRect().height - (mv.children.length ? mv.getBoundingClientRect().height + MVT : 0);
    var sum = function (a, b) { var t = 0; for (var i = a; i < b; i++) t += hs[i]; return t + Math.max(0, b - a - 1) * GAP; };
    var cost = function (k) { return Math.max(sum(0, k), fixed + (k < n ? MVT + sum(k, n) : 0)); };
    var best = n;
    for (var k = n - 1; k >= 1; k--) if (cost(k) < cost(best)) best = k;
    if (best === k0 || cost(k0) - cost(best) < 120) return;
    BAL.n++;
    panels.forEach(function (x, i) { (i < best ? secs : mv).appendChild(x); });
    SKT.charts.redraw();
  }
  window.addEventListener('resize', balanceSoon);
  function render() {
    var box = document.getElementById('name'), S = SKT.S, sym = S.open;
    if (!box || !sym || !SKT.D) return;
    if (!M.layers) M.layers = loadLayers();
    var nv = skeleton(box), top = nv.querySelector('.nv-top'), low = nv.querySelector('.nv-low'), secs = nv.querySelector('.nv-r > .nv-secs'), tabs = nv.querySelector('.nv-tabs');
    var mvb = nv.querySelector('.nv-mv');
    if (mvb) mvb.textContent = '';
    BAL.at = Date.now(); BAL.n = 0;
    var list = nv.querySelector('.nv-list');
    if (M.drawn !== sym) { M.openDays = {}; M.liveMap = false; M.drawn = sym; }
    SKT.ui.hideTip();
    var r = SKT.row(sym);
    if (!r && !SKT.SEARCH && M.searchFail !== genKey()) {
      SKT.loadSearch().then(function () { if (SKT.S.open === sym) render(); }, function () { M.searchFail = genKey(); if (SKT.S.open === sym) render(); });
      top.textContent = ''; low.textContent = ''; secs.textContent = ''; tabs.textContent = '';
      top.appendChild(backOnly(sym, 'Loading ' + sym + '…'));
      nv.classList.add('nofile');
      seekShow({ nf: null, r: {}, sym: sym, puts: false });
      safe('list', function () { renderList(list, sym); });
      return;
    }
    if (!r) {
      top.textContent = ''; low.textContent = ''; secs.textContent = ''; tabs.textContent = '';
      top.appendChild(backOnly(sym, M.searchFail === genKey() ? 'Could not load the name list; try again shortly.' : sym + ' is not among the tracked names.'));
      nv.classList.add('nofile');
      seekShow({ nf: null, r: {}, sym: sym, puts: false });
      safe('list', function () { renderList(list, sym); });
      return;
    }
    var c = makeCtx(sym, r), afters = [];
    nv.classList.toggle('nofile', !c.nf && c.nfDone);
    nv.classList.toggle('puts', c.puts);
    top.textContent = '';
    [function () { return secHead(c); }, function () { return secOpen(c); }, function () { return secTiles(c); }].forEach(function (fn, i) {
      var n = safe('top ' + i, fn);
      if (n) top.appendChild(n);
    });
    low.textContent = ''; secs.textContent = ''; tabs.textContent = '';
    safe('list', function () { renderList(list, sym); });
    if (!c.nf && c.nfDone) {
      var nfb = safe('nofile', function () { return secNoFile(c); });
      if (nfb) low.appendChild(nfb);
      H.secs.forEach(function (sp) { if (sp.nofile) { var x = safe(sp.key, function () { return sp.fn(c); }); if (x) low.appendChild(x); } });
      seekShow(c);
      return;
    }
    var ch = safe('chart', function () { return secChart(c, afters); });
    if (ch) top.appendChild(ch);
    seekShow(c);
    if (!c.nf) { afters.forEach(function (f) { safe('draw', f); }); return; }
    var specs = SPECS.concat(H.secs).slice().sort(function (a, b) { return a.at - b.at; });
    var tabOn = {};
    specs.forEach(function (sp) {
      var n = safe(sp.key, function () { return sp.fn(c); });
      if (!n) return;
      n.dataset.tab = sp.tab;
      n.dataset.at = sp.at;
      n.style.setProperty('--po', sp.po);
      tabOn[sp.tab] = 1;
      secs.appendChild(n);
      if (n._after) afters.push(n._after);
    });
    var cur = tabNow();
    if (!tabOn[cur]) cur = TABS.filter(function (t) { return tabOn[t[0]]; }).map(function (t) { return t[0]; })[0] || 'build';
    TABS.forEach(function (t) {
      if (!tabOn[t[0]]) return;
      var b = el('button', 'nv-tab', t[1]);
      b.type = 'button'; b.dataset.t = t[0]; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { setTab(nv, t[0]); });
      tabs.appendChild(b);
    });
    setTab(nv, cur);
    afters.forEach(function (f) { safe('draw', f); });
    balanceSoon();
  }
  function backOnly(sym, text) {
    var d = el('div', 'nv-head');
    var back = el('button', 'linkbtn nv-back', '← Board'); back.type = 'button';
    back.addEventListener('click', function () { SKT.go({ open: null }); });
    add(d, [el('div', 'nv-bar', [back]), el('div', 'nv-title', [el('span', 'nv-sym', sym)]), p('nv-wait', text)]);
    return d;
  }

  SKT.name = {
    open: function (sym, opts) {
      opts = opts || {};
      sym = String(sym || '').toUpperCase();
      M.extra = opts.extraLines && opts.extraLines.length ? { sym: sym, lines: opts.extraLines } : null;
      SKT.go({ open: sym, day: opts.day || '', c: '' }, { push: true });
    },
    close: function () {
      M.extra = null; M.liveMap = false; M.drawn = null;
      if (SKT.hold) SKT.hold('chart', false);
      if (SKT.ui && SKT.ui.hideTip) SKT.ui.hideTip();
    },
    render: render,
    menu: function (sym, r, puts) { return openItems(String(sym || '').toUpperCase(), r || SKT.row(sym), !!puts, true); }
  };

})();
