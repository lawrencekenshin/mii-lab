




(function () {
  'use strict';

  var WINS = { '1d': 'one day', '1w': 'one week', '2w': 'two weeks', '1m': 'one month' };
  var WLAB = { '1d': '1D', '1w': '1W', '2w': '2W', '1m': '1M' };
  var LISTS = { all: 'Whole list', spx: 'S&P 500', ndx: 'Nasdaq 100', wl: 'Watchlist 1', ai: 'AI companies' };
  var READ = { bought: 'Bought', sold: 'Sold', mixed: 'Mixed', unclear: 'Unclear' };
  var READ_TIP = {
    bought: 'Most of the new contracts last traded near the asking price: buyers paid up.',
    sold: 'Most of the new contracts last traded near the bid: sellers opened them (for calls, often stock owners writing calls).',
    mixed: 'Late trades sat at both the bid and the ask.',
    unclear: 'Too few of the new contracts traded late in the day to tell.'
  };

  var S = { w: '1d', side: 'C', list: 'all', q: '', open: null, rank: 'skew', dir: 1, kside: false };
  var RANKS = { skew: 'Skew', kd: 'King distance', kz: 'King size', bz: 'Business' };

  var RANK_NOTE = {
    kd: ['Sorted by room to the king node in the direction of the lean (up for calls, down for puts): the most room first. Kings too far away to act as a magnet (greyed) come after.',
         'Sorted by room to the king node in the direction of the lean: the nearest first. Kings too far away to act as a magnet, then kings on the other side of the price, come after.'],
    kz: ['Sorted by the size of the king node (gamma dollars per 1% move): the biggest first.',
         'Sorted by the size of the king node: the smallest first.'],
    bz: ['Sorted by business score: the highest first.', 'Sorted by business score: the lowest first.'],
    skew: ['', 'Skew ranking, reversed: the least one-sided of the ranked names first.']
  };
  var D = null, SEARCH = null, searchLoading = false, LISTSET = {};

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {  } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }


  function k(n) {
    if (n == null || isNaN(n)) return '–';
    var a = Math.abs(n), s;
    if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    else if (a >= 1e4) s = (a / 1e3).toFixed(1) + 'k';
    else s = Math.round(a).toLocaleString('en-US');
    return s;
  }
  function sk(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + k(n); }
  function pct(x, dp) { if (x == null || isNaN(x)) return '–'; return (x * 100).toFixed(dp == null ? 1 : dp) + '%'; }
  function spct(x) { if (x == null || isNaN(x)) return '–'; return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(1) + '%'; }
  function money(x) { if (x == null) return '–'; return '$' + (x >= 1000 ? Math.round(x).toLocaleString('en-US') : x.toFixed(2)); }
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(iso, withDow) {
    if (!iso) return '–';
    var p = iso.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return (withDow === false ? '' : DOW[d.getUTCDay()] + ' ') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
  }
  function expLabel(yymmdd) {
    var y = 2000 + +yymmdd.slice(0, 2), m = +yymmdd.slice(2, 4), d = +yymmdd.slice(4, 6);
    return MON[m - 1] + ' ' + d + (y !== new Date().getFullYear() ? ' ’' + String(y).slice(2) : '');
  }
  function strike(x) { return '$' + (Math.round(x * 100) / 100).toString(); }
  function sideWord(s, plural) { return s === 'C' ? (plural ? 'calls' : 'call') : (plural ? 'puts' : 'put'); }
  function SPREAD_TIP(x, side) {
    return 'The biggest new lines came as a matching pair: ' + k(x[3]) + ' each of the ' + expLabel(x[0]) + ' ' + strike(x[1]) + ' and ' +
      strike(x[2]) + ' ' + sideWord(side, true) + '. That is the shape of a spread, one leg bought and one sold, so it is less one-sided than the count suggests.';
  }
  var TAGW = { a: 'last trade at the ask', b: 'last trade at the bid', m: 'last trade between bid and ask', e: 'no late trade' };


  var LIVE = location.hostname === 'lawrencekenshin.github.io';
  var BASE = LIVE ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/skew-tracker-data/skew-tracker/' : 'snap/';
  function dataUrl(name) { return BASE + name; }

  function readings(r) {
    var out = [], ses = (D && D.sessions) || [];
    (r.d || []).forEach(function (e, i) { if (e && ses[i]) out.push([ses[i][0], e]); });
    return out;
  }
  function getJSON(url) {
    return fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  function rowFor(sym) { return (D && D.rows[sym]) || (SEARCH && SEARCH.rows[sym]) || null; }
  function inList(sym) { return S.list === 'all' || !!(LISTSET[S.list] && LISTSET[S.list][sym]); }
  function matchQ(sym, r) {
    if (!S.q) return true;
    var q = S.q.toUpperCase();
    if (sym.indexOf(q) === 0) return true;
    return !!(r && r.nm && r.nm.toUpperCase().indexOf(q) >= 0);
  }


  function readHash() {
    var h = location.hash.replace(/^#/, ''), m;
    if (!h) return;
    h.split('&').forEach(function (kv) {
      var p = kv.split('='), key = p[0], v = decodeURIComponent(p[1] || '');
      if (key === 'w' && WINS[v]) S.w = v;
      else if (key === 's' && (v === 'C' || v === 'P')) S.side = v;
      else if (key === 'l' && LISTS[v]) S.list = v;
      else if (key === 'o' && /^[A-Z0-9.\-]{1,10}$/.test(v)) S.open = v;
      else if (key === 'r' && RANKS[v.replace(/-$/, '')]) { S.rank = v.replace(/-$/, ''); S.dir = /-$/.test(v) ? -1 : 1; }
      else if (key === 'k' && v === 'side') S.kside = true;
      else if (!p[1] && /^[A-Z0-9.\-]{1,10}$/.test(key)) { S.open = key; S.q = key; }
    });
    m = m;
  }
  function writeHash() {
    var parts = [];
    if (S.w !== '1d') parts.push('w=' + S.w);
    if (S.side !== 'C') parts.push('s=' + S.side);
    if (S.list !== 'all') parts.push('l=' + S.list);
    if (S.rank !== 'skew' || S.dir !== 1) parts.push('r=' + S.rank + (S.dir < 0 ? '-' : ''));
    if (S.kside) parts.push('k=side');
    if (S.open) parts.push('o=' + encodeURIComponent(S.open));
    var h = parts.length ? '#' + parts.join('&') : '';
    if (h !== location.hash) history.replaceState(null, '', location.pathname + location.search + h);
  }


  function renderStatus() {
    var chip = $('chip'), asof = $('asof'), line = $('statusLine');
    var gen = new Date(D.generated), ageH = (Date.now() - gen.getTime()) / 3.6e6;
    chip.className = 'chip ' + (ageH > 36 ? 'chip-stale' : 'chip-closed');
    chip.textContent = ageH > 36 ? 'STALE' : 'DAILY';
    asof.textContent = 'New positions through the ' + day(D.latest) + ' close · ' + (D.latest_n || 0).toLocaleString('en-US') +
      ' stocks · updated ' + gen.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    var bits = [];
    if (D.next && D.next.n) bits.push(day(D.next.day) + ': ' + D.next.n.toLocaleString('en-US') + ' stocks in so far; the rest arrive with the next update.');
    if (D.tape) bits.push(day(D.tape.T) + ' trading is in the “traded but not settled” section below.');
    line.textContent = bits.join(' ');
  }


  function ranked(win, side) {
    return ((D.windows[win] || {})[side] || []).filter(function (s) { return inList(s); });
  }
  function renderTiles() {
    var box = $('tiles'); box.textContent = '';
    var c = ranked(S.w, 'C'), p = ranked(S.w, 'P');
    function tile(cls, kTxt, vTxt, nTxt) {
      var t = el('div', 'tile ' + cls); t.appendChild(el('span', 't-k', kTxt));
      var v = el('span', 't-v'); v.textContent = vTxt; t.appendChild(v);
      if (nTxt) t.appendChild(el('span', 't-n', nTxt));
      box.appendChild(t); return t;
    }
    var w = D.windows[S.w] || {};
    var span = w.n === 1 ? day(w.to) : day(w.frm, false) + ' – ' + day(w.to, false);
    tile('t-c', 'Leaning to calls', String(c.length), span);
    tile('t-p', 'Leaning to puts', String(p.length), LISTS[S.list]);
    var top = (S.side === 'C' ? c : p).slice(0, 3);
    var t = tile(S.side === 'C' ? 't-c' : 't-p', 'Most one-sided ' + sideWord(S.side, true) + ' · ' + WLAB[S.w], '', null);
    var v = t.querySelector('.t-v'); v.className = 't-v tks';
    if (!top.length) v.textContent = 'none';
    top.forEach(function (sym) {
      var b = el('button', 'tk', sym); b.type = 'button';
      b.addEventListener('click', function () { openRow(sym, true); });
      v.appendChild(b);
    });
    var tot = 0; top.forEach(function (sym) { var st = (rowFor(sym).w || {})[S.w]; if (st) tot += Math.abs(st.net); });
    if (top.length) t.appendChild(el('span', 't-n', sk(S.side === 'C' ? tot : -tot) + ' contracts net between them'));
  }


  function spark(r) {
    var ser = (r.d || []).slice(-21), W = 132, H = 30, n = ser.length || 1, bw = W / n;
    var mx = 0;
    ser.forEach(function (x) { if (x && x[5] != null) mx = Math.max(mx, Math.abs(x[5])); });
    if (!mx) mx = 1;
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'spark'); svg.setAttribute('aria-hidden', 'true');
    var mid = H / 2, z = document.createElementNS(ns, 'line');
    z.setAttribute('x1', 0); z.setAttribute('x2', W); z.setAttribute('y1', mid); z.setAttribute('y2', mid); z.setAttribute('class', 'z');
    svg.appendChild(z);
    ser.forEach(function (x, i) {
      var rc = document.createElementNS(ns, 'rect'), x0 = i * bw + 1, w = Math.max(1, bw - 2);
      if (!x || x[5] == null) {
        rc.setAttribute('x', x0); rc.setAttribute('y', mid - 1); rc.setAttribute('width', w); rc.setAttribute('height', 2); rc.setAttribute('class', 'na');
      } else {
        var h = Math.max(1, Math.abs(x[5]) / mx * (mid - 1));
        rc.setAttribute('x', x0); rc.setAttribute('width', w); rc.setAttribute('height', h);
        rc.setAttribute('y', x[5] >= 0 ? mid - h : mid); rc.setAttribute('class', x[5] >= 0 ? 'bc' : 'bp');
      }
      svg.appendChild(rc);
    });
    return svg;
  }


  function bookCell(oC, oP) {
    var c = el('div', 'c-tot');
    if (!oC && !oP) { c.textContent = '–'; return c; }
    var tot = (oC || 0) + (oP || 0), callsHeavy = (oC || 0) >= (oP || 0);
    var txt = !oP ? 'all calls' : !oC ? 'all puts' : callsHeavy ? (oC / oP).toFixed(1) + ' : 1' : '1 : ' + (oP / oC).toFixed(1);
    c.appendChild(el('b', callsHeavy ? 'up' : 'down', txt));
    var bar = el('div', 'bar bar-sm'), ic = el('i', 'bc'), ip = el('i', 'bp');
    ic.style.width = (oC / tot * 100) + '%'; ip.style.width = (oP / tot * 100) + '%';
    bar.appendChild(ic); bar.appendChild(ip); c.appendChild(bar);
    c.appendChild(el('small', null, k(oC) + ' C · ' + k(oP) + ' P'));
    c.title = 'Open now across every expiry: ' + (oC || 0).toLocaleString('en-US') + ' calls and ' + (oP || 0).toLocaleString('en-US') + ' puts.';
    return c;
  }
  function kingCell(kg) {
    var c = el('div', 'c-kg');
    if (!kg) { c.textContent = '–'; c.title = 'No king node: the option book is too thin for a gamma map.'; return c; }
    var b = el('b', kg[6] ? 'mut' : null, strike(kg[0]).replace('$', ''));
    c.appendChild(b);
    c.appendChild(el('span', 'kd ' + (kg[1] >= 0 ? 'up' : 'down'), spct(kg[1])));
    c.appendChild(el('small', null, '$' + k(kg[2]) + ' · ' + MON[+kg[4].slice(2, 4) - 1] + ' ' + (+kg[4].slice(4, 6))));
    c.title = 'King node ' + strike(kg[0]) + ': the strike with the most call gamma, ' + spct(kg[1]) + ' from the ' + day(kg[7]) +
      ' close of ' + money(kg[5]) + '. $' + k(kg[2]) + ' of gamma per 1% move, mostly ' + expLabel(kg[4]) + ' contracts.' +
      (kg[6] ? ' It sits too far away to act as a magnet.' : '');
    return c;
  }
  function bizCell(biz) {
    var c = el('div', 'c-bz');
    if (biz == null) { c.textContent = '–'; c.title = 'Not scored (a fund, or outside the business-score report).'; return c; }
    c.appendChild(el('b', biz >= 70 ? 'up' : biz < 40 ? 'mut' : null, String(biz)));
    var bar = el('div', 'bar bar-sm bz'), i = el('i', biz >= 70 ? 'bc' : 'bg'); i.style.width = Math.max(2, Math.min(100, biz)) + '%';
    bar.appendChild(i); c.appendChild(bar);
    c.title = 'Business score ' + biz + ' of 100.';
    return c;
  }
  function bookText(oC, oP) {
    if (!oC && !oP) return null;
    return 'Total ' + (!oP ? 'all calls' : !oC ? 'all puts' : oC >= oP ? (oC / oP).toFixed(1) + ' : 1 calls' : '1 : ' + (oP / oC).toFixed(1) + ' puts');
  }

  function header() {
    var h = el('div', 'tr th'); h.setAttribute('role', 'row');
    var SORTABLE = { 'c-kg': 'kd', 'c-bz': 'bz', 'c-net': 'skew' };
    ['#', 'Stock', 'Price · move', 'Calls : puts opened', 'Net · of its book', 'One-sided', 'Read', S.w === '1d' ? 'vs its normal' : 'Days leaning', 'Each day, last 21', 'Total calls : puts', 'King node', 'Business'].forEach(function (t, i) {
      var cls = ['c-r', 'c-s', 'c-px', 'c-op', 'c-net', 'c-one', 'c-rd', 'c-days', 'c-sp', 'c-tot', 'c-kg', 'c-bz'][i];
      var c = el('div', cls); c.setAttribute('role', 'columnheader');
      var key = SORTABLE[cls];
      if (key) {
        var b = el('button', 'thb' + (S.rank === key ? ' on' : ''), t + (S.rank === key ? (S.dir > 0 ? ' ▼' : ' ▲') : ''));
        b.type = 'button'; b.title = 'Rank by ' + RANKS[key] + (S.rank === key ? ' (click again to flip)' : '');
        b.addEventListener('click', function (e) { e.stopPropagation(); setRank(key); });
        c.appendChild(b);
      } else c.textContent = t;
      h.appendChild(c);
    });
    return h;
  }

  function line(sym, r, st, place) {
    var row = el('div', 'tr'); row.setAttribute('role', 'row'); row.tabIndex = 0; row.dataset.sym = sym;
    row.setAttribute('aria-expanded', S.open === sym ? 'true' : 'false');
    var side = st.side || S.side;

    var cr = el('div', 'c-r');
    if (place) {
      cr.appendChild(document.createTextNode(String(place)));
      cr.appendChild(el('span', 'chg sk', st.r ? 'skew #' + st.r : 'not ranked'));
    } else if (st.r) {
      cr.appendChild(document.createTextNode('#' + st.r));
      var ch = null;
      if (st.pr == null && st.t20n > 1) ch = el('span', 'chg new', 'NEW');
      else if (st.pr && st.pr > st.r) ch = el('span', 'chg up', '▲' + (st.pr - st.r));
      else if (st.pr && st.pr < st.r) ch = el('span', 'chg dn', '▼' + (st.r - st.pr));
      if (ch) cr.appendChild(ch);
    } else cr.textContent = '–';
    row.appendChild(cr);

    var cs = el('div', 'c-s'); cs.appendChild(el('b', null, sym)); cs.appendChild(el('span', 'nm', r.nm || ''));
    row.appendChild(cs);

    var cp = el('div', 'c-px'); cp.appendChild(document.createTextNode(money(r.px)));
    if (st.ret != null) { var rt = el('span', 'ret ' + (st.ret >= 0 ? 'up' : 'down'), spct(st.ret)); cp.appendChild(rt); }
    row.appendChild(cp);

    var co = el('div', 'c-op'), bar = el('div', 'bar'), tot = (st.aC || 0) + (st.aP || 0);
    var ic = el('i', 'bc'), ip = el('i', 'bp');
    ic.style.width = (tot ? st.aC / tot * 100 : 0) + '%'; ip.style.width = (tot ? st.aP / tot * 100 : 0) + '%';
    bar.appendChild(ic); bar.appendChild(ip); co.appendChild(bar);
    co.appendChild(el('span', 'nums', '+' + k(st.aC) + ' calls · +' + k(st.aP) + ' puts'));
    row.appendChild(co);

    var cn = el('div', 'c-net'), nb = el('b', st.net >= 0 ? 'up' : 'down', sk(st.net));
    cn.appendChild(nb); cn.appendChild(el('small', null, pct(Math.abs(st.pct)) + ' of book'));
    row.appendChild(cn);

    var one = st.skn != null ? st.skn : st.sk;
    row.appendChild(el('div', 'c-one', one != null ? Math.round(Math.abs(one) * 100) + '%' : '–'));

    var rd = el('div', 'c-rd');
    if (st.bs) { var pl = el('span', 'pill ' + st.bs, READ[st.bs]); pl.title = READ_TIP[st.bs]; rd.appendChild(pl); }
    if (st.spr) { var sp = el('span', 'pill flag', 'Spread?'); sp.title = SPREAD_TIP(st.spr, side); rd.appendChild(sp); }
    if (!st.bs && !st.spr) rd.textContent = '–';
    row.appendChild(rd);

    var dn = st.tilt ? (side === 'C' ? st.tilt[0] : st.tilt[1]) : null;
    row.appendChild(el('div', 'c-days', st.cov && st.cov[1] > 1 ? (dn + ' of ' + st.cov[0]) : (st.z != null ? 'z ' + (st.z > 0 ? '+' : '') + st.z : '–')));

    var spc = el('div', 'c-sp'); spc.appendChild(spark(r)); row.appendChild(spc);

    row.appendChild(bookCell(r.oC, r.oP));
    row.appendChild(kingCell(r.kg));
    row.appendChild(bizCell(r.biz));

    var meta = el('div', 'c-meta');
    meta.appendChild(el('span', null, money(r.px) + (st.ret != null ? ' ' + spct(st.ret) : '')));
    meta.appendChild(el('span', null, Math.round(Math.abs(one || 0) * 100) + '% one-sided'));
    if (st.bs) meta.appendChild(el('span', 'pill ' + st.bs, READ[st.bs]));
    if (st.spr) meta.appendChild(el('span', 'pill flag', 'Spread?'));
    if (st.cov && st.cov[1] > 1) meta.appendChild(el('span', null, dn + ' of ' + st.cov[0] + ' days'));
    var bt = bookText(r.oC, r.oP); if (bt) meta.appendChild(el('span', r.oC >= r.oP ? 'up' : 'down', bt));
    if (r.kg) meta.appendChild(el('span', null, 'King ' + strike(r.kg[0]).replace('$', '') + ' (' + spct(r.kg[1]) + ')'));
    if (r.biz != null) meta.appendChild(el('span', r.biz >= 70 ? 'up' : null, 'Business ' + r.biz));
    row.appendChild(meta);
    row.addEventListener('click', function (e) { if (e.target.closest('.det')) return; toggle(sym); });
    row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(sym); } });
    return row;
  }


  function kingOnSide(r, side) { return !!(r && r.kg && (side === 'C' ? r.kg[1] > 0 : r.kg[1] < 0)); }
  function rankKey(r, side) {
    if (!r) return null;
    if (S.rank === 'kd') return r.kg ? (side === 'C' ? r.kg[1] : -r.kg[1]) : null;
    if (S.rank === 'kz') return r.kg ? r.kg[2] : null;
    if (S.rank === 'bz') return r.biz;
    return null;
  }

  function arrange(syms, getRow, side) {
    var out = syms.slice();
    if (S.kside) out = out.filter(function (s) { return kingOnSide(getRow(s), side); });
    if (S.rank === 'skew') return S.dir < 0 ? out.reverse() : out;
    var pos = {}; syms.forEach(function (s, i) { pos[s] = i; });


    var grp = function (s, k) {
      if (k == null) return 3;
      if (S.rank !== 'kd') return 0;
      if (k <= 0) return 2;
      var r = getRow(s); return r && r.kg && r.kg[6] ? 1 : 0;
    };
    out.sort(function (a, b) {
      var ka = rankKey(getRow(a), side), kb = rankKey(getRow(b), side), ga = grp(a, ka), gb = grp(b, kb);
      if (ga !== gb) return ga - gb;
      if (ga === 2) return Math.abs(ka) - Math.abs(kb) || pos[a] - pos[b];
      if (ka == null && kb == null) return pos[a] - pos[b];
      if (ka == null) return 1;
      if (kb == null) return -1;
      if (ka === kb) return pos[a] - pos[b];
      return S.dir > 0 ? kb - ka : ka - kb;
    });
    return out;
  }

  function renderList() {
    var w = D.windows[S.w] || {}, tbl = $('tbl'); tbl.textContent = '';
    $('listH').textContent = (S.side === 'C' ? 'Leaning to calls' : 'Leaning to puts') + ' · ' + WLAB[S.w];
    var span = w.n === 1 ? 'new positions on ' + day(w.to) : 'new positions added up from ' + day(w.frm) + ' to ' + day(w.to) + ' (' + w.n + ' sessions)';
    var thin = w.n > 1 && w.covok != null && D.latest_n && w.covok < 0.8 * D.latest_n
      ? ' Only ' + w.covok.toLocaleString('en-US') + ' of ' + D.latest_n.toLocaleString('en-US') + ' stocks have enough days on record for ' + WINS[S.w] + ' yet; the rest join as days are added.' : '';
    var how = S.rank === 'skew' && S.dir > 0 ? '' : ' ' + RANK_NOTE[S.rank][S.dir > 0 ? 0 : 1];
    var flt = S.kside ? ' Showing only names whose king node sits ' + (S.side === 'C' ? 'above' : 'below') + ' the price.' : '';
    $('listSub').textContent = 'Ranked by how much of each stock\'s own options the one-sided build adds up to · ' + span + '.' + how + flt + thin;
    var base = ((w[S.side]) || []).filter(function (s) { return inList(s) && matchQ(s, D.rows[s]); });
    var syms = arrange(base, function (s) { return D.rows[s]; }, S.side);
    tbl.appendChild(header());
    syms.forEach(function (sym, i) {
      var r = D.rows[sym], st = r && r.w && r.w[S.w];
      if (!st) return;
      tbl.appendChild(line(sym, r, st, S.rank === 'skew' && S.dir > 0 ? null : i + 1));
      if (S.open === sym) tbl.appendChild(detail(sym, r));
    });
    var empty = $('empty');
    if (!syms.length) {
      empty.hidden = false;
      empty.textContent = S.q ? 'No ranked stock matches “' + S.q + '” here.' : S.kside && base.length
        ? 'None of the ' + base.length + ' ranked names here has its king node ' + (S.side === 'C' ? 'above' : 'below') + ' the price.'
        : 'No stock in ' + LISTS[S.list] + ' leans this way over ' + WINS[S.w] + '.';
    } else empty.hidden = true;
    renderOthers(syms);
  }


  function renderOthers(shown) {
    var box = $('others'), tbl = $('tblOthers');
    if (!S.q) { box.hidden = true; return; }
    if (!SEARCH && !searchLoading) {
      searchLoading = true;
      getJSON(dataUrl('search.json') + '?b=' + encodeURIComponent(D.generated || '')).then(function (j) { SEARCH = j; searchLoading = false; renderList(); })
        .catch(function () { searchLoading = false; });
    }
    var seen = {}; shown.forEach(function (s) { seen[s] = 1; });
    var pool = [];
    Object.keys(D.rows).forEach(function (s) { if (!seen[s] && matchQ(s, D.rows[s])) pool.push(s); });
    if (SEARCH) Object.keys(SEARCH.rows).forEach(function (s) { if (!seen[s] && matchQ(s, SEARCH.rows[s])) pool.push(s); });
    pool.sort(function (a, b) { var q = S.q.toUpperCase(); return (a === q ? -1 : b === q ? 1 : 0) || a.localeCompare(b); });
    pool = pool.slice(0, 24);
    tbl.textContent = '';
    if (!pool.length) { box.hidden = !searchLoading; if (searchLoading) tbl.appendChild(el('p', 'empty', 'Searching every tracked stock…')); return; }
    box.hidden = false;
    pool.forEach(function (sym) {
      var r = rowFor(sym), st = (r.w || {})[S.w];
      if (!st) { st = { aC: 0, aP: 0, net: 0, pct: 0, why: 'no reading for this time frame' }; }
      var ln = line(sym, r, st);
      var why = ln.querySelector('.c-days');
      if (st.why) { why.textContent = ''; why.appendChild(el('span', 'why', st.why)); }
      tbl.appendChild(ln);
      if (S.open === sym) tbl.appendChild(detail(sym, r));
    });
  }

  function toggle(sym) { S.open = S.open === sym ? null : sym; store('sk.open', null); writeHash(); renderList(); renderTape(); }
  function openRow(sym, scroll) {
    S.open = sym; writeHash(); renderList(); renderTape();
    if (scroll) { var n = document.querySelector('.tr[data-sym="' + sym + '"]'); if (n) n.scrollIntoView({ block: 'center' }); }
  }


  function detail(sym, r) {
    var box = el('div', 'det'); box.setAttribute('role', 'region'); box.setAttribute('aria-label', sym + ' detail');
    var close = el('button', 'linkbtn close', 'Close'); close.type = 'button';
    close.addEventListener('click', function () { toggle(sym); });
    box.appendChild(close);
    box.appendChild(el('h3', null, sym + (r.nm ? ' · ' + r.nm : '') + ' · ' + money(r.px)));
    if (r.bk) {
      var ratio = r.oC && r.oP ? (r.oC >= r.oP ? (r.oC / r.oP).toFixed(2) + ' calls per put' : (r.oP / r.oC).toFixed(2) + ' puts per call') : '';
      box.appendChild(el('p', 'mut', 'Open now: ' + k(r.oC) + ' calls and ' + k(r.oP) + ' puts' + (ratio ? ' (' + ratio + ')' : '') + '.'));
    }
    if (r.kg) {
      var kgp = el('p', null);
      kgp.appendChild(el('b', null, 'King node ' + strike(r.kg[0]) + ' '));
      kgp.appendChild(document.createTextNode(spct(r.kg[1]) + ' from the ' + day(r.kg[7]) + ' close of ' + money(r.kg[5]) + ' · $' + k(r.kg[2]) +
        ' of gamma per 1% move, mostly ' + expLabel(r.kg[4]) + ' contracts' + (r.kg[6] ? ' · too far away to act as a magnet' : '') + '.'));
      box.appendChild(kgp);
    }
    if (r.biz != null) box.appendChild(el('p', 'mut', 'Business score ' + r.biz + ' of 100' + (r.sec ? ' · ' + r.sec : '') + '.'));
    var wins = el('div', 'wins');
    ['1d', '1w', '2w', '1m'].forEach(function (key) {
      var st = (r.w || {})[key], s = el('span');
      s.appendChild(el('b', null, WLAB[key] + ' '));
      if (!st) s.appendChild(document.createTextNode('no reading'));
      else if (st.r) s.appendChild(document.createTextNode('#' + st.r + ' ' + (st.side === 'C' ? 'calls' : 'puts') + ' · ' + sk(st.net) + ' (' + pct(Math.abs(st.pct)) + ')'));
      else s.appendChild(document.createTextNode((st.why || 'not ranked') + (st.net ? ' · ' + sk(st.net) : '')));
      wins.appendChild(s);
    });
    box.appendChild(wins);
    var st1 = (r.w || {})['1d'];
    if (st1 && st1.z != null && st1.nh) box.appendChild(el('p', 'mut', 'Latest day vs this stock\'s own last ' + st1.nh + ' days: ' + (st1.z > 0 ? '+' : '') + st1.z + ' (typical range is about −2 to +2).'));
    if (r.drop) box.appendChild(el('p', 'amber', 'Some recent days could not be measured: ' + r.drop.join(', ') + '.'));


    var rows = readings(r).slice(-12).reverse();
    if (rows.length) {
      var sc = el('div', 'table-scroll'), t = el('table'), th = el('thead'), tr = el('tr');
      ['Day', 'Calls opened', 'Puts opened', 'Net', 'Of book', 'Read', 'Traded C : P', 'Note'].forEach(function (h, i) {
        var c = el('th', i ? 'n' : null, h); tr.appendChild(c);
      });
      th.appendChild(tr); t.appendChild(th);
      var tb = el('tbody');
      rows.forEach(function (de) {
        var x = de[1], trr = el('tr');
        trr.appendChild(el('td', null, day(de[0])));
        trr.appendChild(el('td', 'n', '+' + k(x[2])));
        trr.appendChild(el('td', 'n', '+' + k(x[3])));
        var nt = el('td', 'n ' + (x[4] >= 0 ? 'up' : 'down'), sk(x[4])); trr.appendChild(nt);
        trr.appendChild(el('td', 'n', x[5] != null ? spct(x[5]) : '–'));
        trr.appendChild(el('td', 'n', x[6] ? READ[x[6]] : '–'));
        var tv = (x[7] != null && x[8] != null && (x[7] + x[8]) > 0) ? (x[8] ? (x[7] / x[8]).toFixed(1) + ' : 1' : 'all calls') : '–';
        trr.appendChild(el('td', 'n', tv));
        var notes = [];
        if (x[0] > 1) notes.push('joins ' + x[0] + ' sessions');
        if (x[1] === 's') notes.push('net only');
        if ((x[9] || '').indexOf('x') >= 0) notes.push('rise exceeds the day\'s trading');
        if ((x[9] || '').indexOf('i') >= 0) notes.push('mostly deep in the money');
        if (x[10]) notes.push('pair at ' + strike(x[10][1]) + ' / ' + strike(x[10][2]) + ' (spread?)');
        trr.appendChild(el('td', 'n mut', notes.join(' · ')));
        tb.appendChild(trr);
      });
      t.appendChild(tb); sc.appendChild(t); box.appendChild(sc);
    }

    if (r.mv && r.mv.length) {
      box.appendChild(el('p', null, 'Biggest open-interest changes, latest days:'));
      var ul = el('ul', 'mv');
      r.mv.slice(0, 3).forEach(function (m) {
        var li = el('li'); li.appendChild(el('b', null, day(m[0]) + ': '));
        var parts = m.slice(1).map(function (c) {
          return expLabel(c[0]) + ' ' + strike(c[2]) + ' ' + sideWord(c[1]) + ' ' + sk(c[3]) + (c[4] ? ' (' + TAGW[c[4]] + ')' : '');
        });
        li.appendChild(document.createTextNode(parts.join(' · ')));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    return box;
  }


  function renderTape() {
    var card = $('tapeCard'), T = D.tape;
    if (!T) { card.hidden = true; return; }
    card.hidden = false;
    $('tapeH').textContent = 'Traded ' + day(T.T) + ', not settled yet';
    $('tapeSub').textContent = 'Where more ' + sideWord(S.side, true) + ' traded than were open that morning, the difference must be new positions. These are leads; the settled numbers replace them with the next update.';
    var tbl = $('tblTape'); tbl.textContent = '';
    var syms = arrange((T[S.side] || []).filter(function (s) { return inList(s) && matchQ(s, T.rows[s] || rowFor(s)); }),
      function (s) { return rowFor(s); }, S.side);
    var h = el('div', 'tr th');
    ['#', 'Stock', 'Price', 'Must be new', 'Of book', 'Their share', '', 'Biggest', '', 'Total calls : puts', 'King node', 'Business'].forEach(function (t, i) {
      h.appendChild(el('div', ['c-r', 'c-s', 'c-px', 'c-op', 'c-net', 'c-one', 'c-rd', 'c-days', 'c-sp', 'c-tot', 'c-kg', 'c-bz'][i], t));
    });
    tbl.appendChild(h);
    syms.forEach(function (sym, i) {
      var t = T.rows[sym], r = rowFor(sym) || {};
      var row = el('div', 'tr'); row.dataset.sym = sym; row.tabIndex = 0;
      row.appendChild(el('div', 'c-r', '#' + (i + 1)));
      var cs = el('div', 'c-s'); cs.appendChild(el('b', null, sym)); cs.appendChild(el('span', 'nm', r.nm || '')); row.appendChild(cs);
      row.appendChild(el('div', 'c-px', money(t.px)));
      var heavy = S.side === 'C' ? t.fC : t.fP, other = S.side === 'C' ? t.fP : t.fC;
      var co = el('div', 'c-op'), bar = el('div', 'bar'), tot = t.fC + t.fP;
      var ic = el('i', 'bc'), ip = el('i', 'bp'); ic.style.width = (tot ? t.fC / tot * 100 : 0) + '%'; ip.style.width = (tot ? t.fP / tot * 100 : 0) + '%';
      bar.appendChild(ic); bar.appendChild(ip); co.appendChild(bar);
      co.appendChild(el('span', 'nums', k(heavy) + ' ' + sideWord(S.side, true) + ' · ' + k(other) + ' ' + sideWord(S.side === 'C' ? 'P' : 'C', true)));
      row.appendChild(co);
      var cn = el('div', 'c-net'); cn.appendChild(el('b', S.side === 'C' ? 'up' : 'down', k(heavy)));
      cn.appendChild(el('small', null, pct(heavy / t.bk) + ' of book')); row.appendChild(cn);
      row.appendChild(el('div', 'c-one', Math.round(heavy / tot * 100) + '%'));
      row.appendChild(el('div', 'c-rd', ''));
      var big = (t.top && t.top[S.side] || [])[0];
      row.appendChild(el('div', 'c-days', big ? expLabel(big[0]) + ' ' + strike(big[1]) : ''));
      row.appendChild(el('div', 'c-sp', big && big[5] ? TAGW[big[5]] : ''));
      row.appendChild(bookCell(r.oC, r.oP));
      row.appendChild(kingCell(r.kg));
      row.appendChild(bizCell(r.biz));
      var meta = el('div', 'c-meta');
      if (big) meta.appendChild(el('span', null, 'Biggest: ' + expLabel(big[0]) + ' ' + strike(big[1]) + ' ' + sideWord(S.side) + ', ' + k(big[3]) + ' traded vs ' + k(big[4]) + ' open'));
      row.appendChild(meta);
      tbl.appendChild(row);
    });
    $('tapeEmpty').hidden = !!syms.length;
    $('tapeEmpty').textContent = 'Nothing in ' + LISTS[S.list] + ' clears the bar on this side.';
  }


  function renderCoverage() {
    var tb = $('covTbl').querySelector('tbody'); tb.textContent = '';
    (D.sessions || []).slice().reverse().forEach(function (x) {
      var tr = el('tr');
      tr.appendChild(el('td', null, day(x[0])));
      [x[1], x[2], x[3], x[4]].forEach(function (v) { tr.appendChild(el('td', null, v ? v.toLocaleString('en-US') : '–')); });
      tb.appendChild(tr);
    });
  }


  function setRank(key) {
    if (S.rank === key) S.dir = -S.dir; else { S.rank = key; S.dir = 1; }
    store('sk.rank', S.rank + (S.dir < 0 ? '-' : ''));
    renderAll();
  }
  function syncControls() {
    Array.prototype.forEach.call($('rankSeg').querySelectorAll('button'), function (b) {
      var on = b.dataset.r === S.rank;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = RANKS[b.dataset.r] + (on && S.rank !== 'skew' ? (S.dir > 0 ? ' ▼' : ' ▲') : (on && S.dir < 0 ? ' ▲' : ''));
    });
    $('kSide').setAttribute('aria-pressed', S.kside ? 'true' : 'false');
    $('kSide').textContent = 'King ' + (S.side === 'C' ? 'above' : 'below') + ' the price';
    Array.prototype.forEach.call($('winSeg').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.w === S.w ? 'true' : 'false'); });
    Array.prototype.forEach.call($('sideSeg').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.dataset.s === S.side ? 'true' : 'false'); });
    $('listSel').value = S.list;
    if ($('q').value !== S.q) $('q').value = S.q;
  }
  function renderAll() { syncControls(); renderTiles(); renderList(); renderTape(); writeHash(); }

  function wire() {
    $('winSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; S.w = b.dataset.w; store('sk.w', S.w); renderAll(); });
    $('sideSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; S.side = b.dataset.s; renderAll(); });
    $('listSel').addEventListener('change', function () { S.list = this.value; store('sk.list', S.list); renderAll(); });
    $('rankSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setRank(b.dataset.r); });
    $('kSide').addEventListener('click', function () { S.kside = !S.kside; store('sk.kside', S.kside ? '1' : null); renderAll(); });
    var tmr = null;
    $('q').addEventListener('input', function () {
      var v = this.value.trim(); clearTimeout(tmr);
      tmr = setTimeout(function () { S.q = v; renderList(); renderTape(); }, 120);
    });
    window.addEventListener('hashchange', function () { readHash(); renderAll(); });
  }

  function fail(msg) {
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'ERROR';
    $('asof').textContent = msg;
  }

  function start() {
    var cur = document.querySelector('.tab[aria-current=page]');
    if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) cur.parentNode.scrollLeft = cur.offsetLeft;
    var w = load('sk.w'), l = load('sk.list'), rk = load('sk.rank');
    if (w && WINS[w]) S.w = w;
    if (l && LISTS[l]) S.list = l;
    if (rk && RANKS[rk.replace(/-$/, '')]) { S.rank = rk.replace(/-$/, ''); S.dir = /-$/.test(rk) ? -1 : 1; }
    if (load('sk.kside') === '1') S.kside = true;
    readHash();
    wire();
    getJSON(dataUrl('skew.json')).then(function (j) {
      if (!j || j.schema !== 2 || !j.windows || !j.rows) throw new Error('unexpected data');
      D = j;
      Object.keys(D.lists || {}).forEach(function (key) {
        LISTSET[key] = {}; (D.lists[key] || []).forEach(function (s) { LISTSET[key][s] = 1; });
      });
      renderStatus(); renderCoverage(); renderAll();
      if (S.open) {
        if (!D.rows[S.open]) { S.q = S.open; renderAll(); }
        var n = document.querySelector('.tr[data-sym="' + S.open + '"]'); if (n) n.scrollIntoView({ block: 'center' });
      }
    }).catch(function (e) { fail('Could not load the numbers (' + e.message + ').'); });
  }

  start();
})();
