




















(function () {
  'use strict';
  var SKT = window.SKT = window.SKT || {};
  var F = SKT.fmt, U = SKT.ui, el = U.el;
  var D = null, S = SKT.S;

  var WL = { '1d': '1D', '1w': '1W', '2w': '2W', '1m': '1M', all: 'Total', tape: 'Tape' };
  var STAT_W = ['1d', '1w', '2w', '1m', 'all'];
  var LIMIT = 50;
  var READW = { bought: 'Bought', sold: 'Sold', mixed: 'Mixed', unclear: 'Unclear' };
  var READ_RANK = { bought: 4, mixed: 3, unclear: 2, sold: 1 };
  var READ_TIP = {
    bought: 'Most of the new contracts last traded near the ask: buyers paid up.',
    sold: 'Most of the new contracts last traded near the bid: sellers opened them (call writing on the calls side, put selling on the puts side).',
    mixed: 'Late trades sat at both the bid and the ask.',
    unclear: 'Too few of the new contracts traded late in the day to tell.'
  };
  var TAGW = { a: 'last trade at the ask', b: 'last trade at the bid', m: 'last trade between bid and ask', e: 'no late trade' };
  var PST = { wash: 'washed out', pull: 'pullback', base: 'basing', high: 'at highs' };
  var KDJT = { gc: 'golden cross', coil: 'coiling', up: 'rising', dn: 'falling' };
  var KDJL = { gc: 'GC', coil: 'coil', up: 'up', dn: 'dn' };
  var SETUP_CLS = { PINNED: 'pin', SUPPORTED: 'sup', CAPPED: 'cap', UNSTABLE: 'uns', 'AT FLIP': 'flp' };
  var SETUP_ORD = { PINNED: 5, SUPPORTED: 4, CAPPED: 3, UNSTABLE: 2, 'AT FLIP': 1 };
  var LS_TAG = { spx: 'SPX', ndx: 'NDX', wl: 'WL', ai: 'AI', r1: 'R1K', r2: 'R2K', etf: 'ETF', pin: 'PIN' };
  var LOUD_C = { L: ['Loud buy', 'orange'], C: ['Loud buy, news day', 'blue'], S: ['Loud spread', 'gold'], X: ['Loud, not buying', 'muted'] };
  var LOUD_P = { B: ['Loud puts', 'orange'], M: ['Loud puts, move day', 'blue'], S: ['Loud put spread', 'gold'], O: ['Loud puts', 'muted'] };


  var H = {
    ext: function () { return null; },
    marks: null,
    live: null,
    tiles: null,
    strip: null,
    end: null,
    how: null,
    sub: null,
    narrow: [],
    test: {},
    kgBase: '../king-gex/',
    loudBase: '../loud-calls/',
    stealthBase: '../stealth-calls/'
  };


  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function $(id) { return document.getElementById(id); }
  function safe(label, fn) { try { fn(); } catch (e) { console.error('[skew board] ' + label, e); } }
  function sp(cls, t) { return el('span', cls, t); }
  function txt(p, s) { p.appendChild(document.createTextNode(s)); return p; }
  function pc0(x) { return isNum(x) ? Math.round(x * 1e2) + '%' : '–'; }
  function zTxt(z) { var t = Math.abs(z).toFixed(1); return (+t === 0 ? '' : z > 0 ? '+' : '−') + t; }
  function sideW(sd) { return sd === 'P' ? 'puts' : 'calls'; }
  function sI(sd) { return sd === 'P' ? 1 : 0; }
  function nDays(n) { return n + (n === 1 ? ' day' : ' days'); }
  function per(w) { return (D && D.periods && D.periods[w]) || {}; }
  function winOf(w) { return (D && D.windows && D.windows[w]) || null; }
  function sinceTxt(w) { var b = per(w).base || (winOf(w) || {}).frm; return w === 'tape' ? 'on ' + F.day(D.tape && D.tape.T) : b ? 'since ' + F.dayShort(b) : ''; }
  function wWord(w) { return SKT.winWord ? SKT.winWord(w) : ''; }
  function stop(e) { e.stopPropagation(); }
  function todayET() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function expISO(x) { x = String(x || ''); return /^\d{6}$/.test(x) ? '20' + x.slice(0, 2) + '-' + x.slice(2, 4) + '-' + x.slice(4, 6) : null; }
  function yymmdd(iso) { return iso ? iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10) : ''; }
  function dBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
  function addOf(st, sd) { return st ? (sd === 'P' ? st.aP : st.aC) : null; }
  function premOf(st, sd) { return st && st.prem ? st.prem[sI(sd)] : null; }
  function share(c, p) { c = +c || 0; p = +p || 0; return c + p > 0 ? c / (c + p) : null; }


  function oneOf(st) { return SKT.oneSided(st); }
  function leanDays(st, sd) { return st && st.tilt && st.cov && st.cov[0] ? st.tilt[sI(sd)] / st.cov[0] : null; }
  function cardMode() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (!w) return lastLayout === 'card';
    return w < SKT.BP.phone;
  }
  function wideMode() { var w = window.innerWidth || document.documentElement.clientWidth || 0; return w >= SKT.BP.wide; }
  function unent(s) {
    return String(s == null ? '' : s).replace(/&(amp|lt|gt|quot|#39|apos);/g, function (m, x) { return { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" }[x]; });
  }
  function aiShort(t) {
    var s = String(t || '');
    var m = /semis/i.test(s) ? 'semis' : /software/i.test(s) ? 'software' : /power/i.test(s) ? 'power' : /robot/i.test(s) ? 'robotics' :
      /compute|neocloud/i.test(s) ? 'compute' : /health/i.test(s) ? 'healthcare' : s.replace(/\bAI\b[-\s]*/i, '').split(/[\s,&]+/)[0].toLowerCase();
    return m || s;
  }
  function ov(e) { var x = null; try { x = H.ext(e.sym, e.w); } catch (err) { x = null; } return x || {}; }

  function h0Of(e) { var r = e.r || {}; if (r.cd && D && D.latest && r.cd < D.latest) return null; return (e.st && e.st.h0) || ov(e).h0 || null; }
  function ecOf(e) { return (e.st && e.st.ec) || ov(e).ec || null; }
  function ernOf(e) { return (e.r && e.r.ern) || ov(e).ern || null; }
  function v2Note(w) { var W = winOf(w); return W && W.v2 && isNum(W.v2[0]) && W.v2[0] < W.n && W.v2[1] ? 'from ' + F.dayShort(W.v2[1]) : ''; }
  function v2Tip(w) { return v2Note(w) ? ' Earlier sessions of this window have no contract detail.' : ''; }
  function go(patch, opts) { SKT.go(patch, opts); }
  function openName(sym, day) { var p = { open: sym }; if (day) p.day = day; go(p, { push: true }); }


  function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function qTokens(q) { return String(q || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean); }
  function matchQ(sym, r) {
    var toks = qTokens(S.q);
    if (!toks.length) return true;
    var ns = norm(sym), nm = r && r.nm ? unent(r.nm).toLowerCase() : '';
    return toks.some(function (t) {
      var nt = norm(t);
      if (nt && ns.indexOf(nt) === 0) return true;
      return t.length >= 3 && nm && nm.indexOf(t.toLowerCase()) >= 0;
    });
  }


  function kOnSide(e) { var kg = e.r && e.r.kg; return !!(kg && isNum(kg[1]) && (e.side === 'P' ? kg[1] < 0 : kg[1] > 0)); }
  var NARROW = [
    { k: 'new', label: 'New this window', tip: 'Not on this list at the previous settle', test: function (e) { return !!(e.st && e.st.r) && e.st.pr == null; } },
    { k: 'steady', label: 'Steady', multi: 1, tip: 'Leaned this way on most of the window\'s sessions', test: function (e) { return !!(e.st && e.st.steady); } },
    { k: 'big1', label: 'One big day', multi: 1, tip: 'Most of the window\'s build came on one session', test: function (e) { return !!(e.st && e.st.big1); } },
    { k: 'q', label: 'Quality', tip: 'Business score 70 or more (strong)', has: function (e) { return isNum(e.r && e.r.biz); }, test: function (e) { return SKT.biz(e.r && e.r.biz).band === 'hi'; } },
    { k: 'kside', label: 'King on the lean\'s side', tip: 'This board\'s king node sits above the price on a call build, below it on a put build', has: function (e) { return !!(e.r && e.r.kg); }, test: kOnSide },
    { k: 'nospr', label: 'No spread', tip: 'No matching pair of lines on one expiry', test: function (e) { return !(e.st && e.st.spr); } },
    { k: 'crowd', label: 'With the crowd', tip: 'Its industry (or theme) has other names on the same side of this window', has: function (e) { return e.st && e.st.wc != null; }, test: function (e) { return !!e.st && e.st.wc === 1; } },
    { k: 'alone', label: 'Alone', tip: 'The only name of its industry (or theme) on this side of the window', has: function (e) { return e.st && e.st.wc != null; }, test: function (e) { return !!e.st && e.st.wc === 0; } },
    { k: 'earn', label: 'Earnings before the bet', tip: 'The next earnings date falls before the main expiry', has: function (e) { return !!ecOf(e); }, test: function (e) { return ecOf(e) === 'earn'; } },
    { k: 'noearn', label: 'No earnings before the bet', tip: 'No earnings date before the main expiry', has: function (e) { return !!ecOf(e); }, test: function (e) { return ecOf(e) === 'none'; } },
    { k: 'rare', label: 'Rare for this stock', day1: 1, tip: 'Today\'s build is bigger than on almost all of this stock\'s own recorded days', test: function (e) { return !!(e.st && e.st.rare); } },
    { k: 'wash', label: 'Washed out', pst: 1, tip: 'Price state: washed out', test: function (e) { return !!e.r && e.r.pst === 'wash'; } },
    { k: 'pull', label: 'Pullback', pst: 1, tip: 'Price state: a pullback from the high', test: function (e) { return !!e.r && e.r.pst === 'pull'; } },
    { k: 'base', label: 'Basing', pst: 1, tip: 'Price state: basing well under the high', test: function (e) { return !!e.r && e.r.pst === 'base'; } },
    { k: 'high', label: 'At highs', pst: 1, tip: 'Price state: at or near the 52-week high', test: function (e) { return !!e.r && e.r.pst === 'high'; } }
  ];
  function narrowList() { return NARROW.concat(H.narrow || []); }
  function narrowTest(k, e) {
    var t = H.test[k];
    if (t) return !!t(e);
    for (var i = 0; i < NARROW.length; i++) if (NARROW[i].k === k) return !!NARROW[i].test(e);
    return true;
  }

  var offered = {};
  function computeOffered(w) {
    w = w || S.w;
    offered = {};
    if (!D || w === 'tape' || S.show === 'out') return;
    var base = baseEntries(w, 'B');
    narrowList().forEach(function (c) {
      if (c.multi && w === '1d') return;
      if (c.day1 && w !== '1d') return;
      if (c.pst) { if (base.some(function (e) { return e.r && e.r.pst; })) offered[c.k] = 1; return; }
      if (c.has && !base.some(c.has)) return;
      if (c.day1 && !base.some(c.test)) return;
      offered[c.k] = 1;
    });
  }



  function crowdF() { var c = null; try { c = SKT.views && SKT.views.crowd ? SKT.views.crowd() : null; } catch (err) { c = null; } return c; }
  function curF() { return { show: S.show, f: S.f, ten: S.ten, od: S.od, q: S.q, cf: crowdF() }; }
  function cfOk(sym) { var c = crowdF(); return !c || c.has(sym); }
  function baseEntries(w, side) {
    var out = [];
    (side === 'B' ? ['C', 'P'] : [side]).forEach(function (sd) {
      ((winOf(w) || {})[sd] || []).forEach(function (sym, i) {
        var r = SKT.row(sym);
        out.push({ sym: sym, side: sd, r: r, st: r && r.w ? r.w[w] || null : null, w: w, er: i + 1 });
      });
    });
    return out;
  }
  function entries(w, side, list, f) {
    f = f || curF();
    var out = [], sides = side === 'B' ? ['C', 'P'] : [side === 'P' ? 'P' : 'C'];
    sides.forEach(function (sd) {
      var src, whys = {};
      if (w === 'tape') src = (D.tape && D.tape[sd]) || [];
      else {
        var W = winOf(w) || {};
        if (f.show === 'out') {
          src = [];
          ((W.X && W.X[sd]) || []).forEach(function (x) { src.push(x[0]); whys[x[0]] = x[1]; });
        } else src = W[sd] || [];
      }
      var seen = {};
      src.forEach(function (sym, i) {
        if (seen[sym]) return;
        seen[sym] = 1;
        if (!SKT.inList(sym, list)) return;
        var r = SKT.row(sym), st = w !== 'tape' && r && r.w ? r.w[w] || null : null;
        var e = { sym: sym, side: sd, r: r, st: st, w: w, er: (st && st.r) || i + 1 };
        if (w === 'tape') e.tp = (D.tape.rows && D.tape.rows[sym]) || null;
        else if (f.show === 'out') { e.off = 1; e.why = whys[sym] || (st && st.why) || ''; }
        if (pass(e, f)) out.push(e);
      });
    });
    return out;
  }
  function pass(e, f) {
    if (f.cf && !f.cf.has(e.sym)) return false;
    if (f.q && !matchQ(e.sym, e.r)) return false;
    if (e.w === 'tape' || e.off) return true;
    var st = e.st || {};
    if (f.show === 'b' && st.bs !== 'bought') return false;
    if (f.show === 'm' && !(st.bs === 'mixed' || st.bs === 'unclear' || st.spr)) return false;
    if (f.show === 's' && st.bs !== 'sold') return false;
    if (f.ten && st.tk !== f.ten) return false;
    if (f.od && !(isNum(st.dk) && st.dk >= f.od)) return false;
    var ok = true;
    if (f.f) f.f.forEach(function (k) { if (ok && offered[k] && !narrowTest(k, e)) ok = false; });
    return ok;
  }
  function withF(patch) { var f = curF(); Object.keys(patch).forEach(function (k) { f[k] = patch[k]; }); return f; }
  function count(w, side, list) {
    if (!SKT.D) return 0;
    D = SKT.D; S = SKT.S;
    w = w || S.w;
    var keep = offered, n;
    computeOffered(w);
    try { n = entries(w, side || S.side, list || S.list).length; } finally { offered = keep; }
    return n;
  }


  var LENS = {
    skew: { l: 'Skew', simple: 'Skew' }, prem: { l: '$ opened', simple: 'Biggest $' }, rel: { l: 'For its size' }, far: { l: 'Far bets' },
    steady: { l: 'Steadiest', simple: 'Steadiest' }, day: { l: 'By day' }, sell: { l: 'Sellers' }, bz: { l: 'Business' }, grp: { l: 'By group', simple: 'By group' },
    kd: { l: 'King distance', king: 'kg' }, kz: { l: 'King size', king: 'kg' }, ks: { l: 'King strength', king: 'kt' }, sticky: { l: 'Sticky', king: 'kt' },
    kb: { l: 'Building at the king', king: 'kt' }, mag: { l: 'Far magnet', king: 'kt' }, pin: { l: 'Pinning', king: 'kt' },
    match: { l: 'Match', king: 'm' }, nmatch: { l: 'Negative-king match', king: 'mn' }, pmatch: { l: 'Pile match', king: 'pm' }
  };
  var BUILD_LENSES = ['skew', 'prem', 'rel', 'far', 'steady', 'day', 'sell', 'bz', 'grp'];
  var KING_LENSES = ['kd', 'kz', 'ks', 'sticky', 'kb', 'mag', 'pin', 'match', 'nmatch', 'pmatch'];
  function lensDef(lens, side) {
    var s = sideW(side === 'B' ? 'C' : side), w = S.w, since = sinceTxt(w);
    var t = {
      skew: 'Skew = net ' + s + ' opened as a share of each stock\'s own open interest, ' + (w === '1d' ? 'on the newest settle' : 'added up ' + since) + '; the most one-sided big builds first.',
      prem: '$ opened = new contracts on the lean side × the option\'s closing mid × 100, added up ' + since + '.',
      rel: 'For its size = the $ opened against one average day of the stock\'s own option $ trading over the window.',
      far: 'Far bets = how far from the price the new contracts sit, on average (with how many standard moves that is and the options\' own touch odds); smaller builds go last.',
      steady: 'Steadiest = the share of the window\'s sessions that leaned to ' + s + '.',
      day: 'By day = grouped by the session that took the biggest build of the window, newest first.',
      sell: 'Sellers = builds read as sold (sellers opened them) first, then by the share of new contracts that last traded at the bid.',
      bz: 'Business = the company\'s business score against the S&P 500 + Nasdaq-100 (display only; it never changes a rank).',
      grp: 'By group = steady one-sided builds, builds still forming, and builds that came mostly on one big day.',
      kd: 'King distance = room from the price to this board\'s king node in the direction of the lean; kings out of reach, then kings on the other side, follow.',
      kz: 'King size = gamma dollars per 1% move at this board\'s king node.',
      ks: 'King strength = King GEX\'s score for its king (the King GEX king).',
      sticky: 'Sticky = how many sessions the King GEX king has held its strike.',
      kb: 'Building at the king = contracts added at the King GEX king\'s contract over its recent settles.',
      mag: 'Far magnet = how many standard moves away the King GEX king sits on the lean\'s side, largest first; kings on the other side follow.',
      pin: 'Pinning = King GEX kings with a pinned setup first, then by the king\'s share of the gamma map.',
      match: 'Match = both high: its place on this list and its king\'s strength among every stock\'s kings (the King GEX Skew × King maths).',
      nmatch: 'Negative-king match = both high: its place on this list and its negative king\'s strength among every stock\'s negative kings.',
      pmatch: 'Pile match = both high: its place on this list and its pile\'s size among every stock\'s piles (the King GEX Skew × Pile maths).'
    };
    return t[lens] || '';
  }
  function lensKey(e, lens) {
    var st = e.st || {}, r = e.r || {}, kt = r.kt, kg = r.kg, sd = e.side;
    switch (lens) {
      case 'prem': return premOf(st, sd);
      case 'rel': return isNum(st.rel) ? st.rel : null;
      case 'far': return isNum(st.far) ? st.far : null;
      case 'steady': return leanDays(st, sd);
      case 'sell': return st.bsh && isNum(st.bsh[1]) ? st.bsh[1] : null;
      case 'bz': return isNum(r.biz) ? r.biz : null;
      case 'kd': return kg && isNum(kg[1]) ? (sd === 'P' ? -kg[1] : kg[1]) : null;
      case 'kz': return kg && isNum(kg[2]) ? kg[2] : null;
      case 'ks': return kt && isNum(kt.sc) ? kt.sc : null;
      case 'sticky': return kt && isNum(kt.h) ? kt.h : null;
      case 'kb': return kt && isNum(kt.ad) ? kt.ad : null;
      case 'mag': return kt && isNum(kt.sig) ? kt.sig : null;
      case 'pin': return kt && isNum(kt.share) ? kt.share : null;
      case 'match': return isNum(st.m) ? st.m : null;
      case 'nmatch': return isNum(st.mn) ? st.mn : null;
      case 'pmatch': return isNum(st.pm) ? st.pm : null;
    }
    return null;
  }
  function hasKing(e, lens) {
    var k = LENS[lens] && LENS[lens].king, r = e.r || {}, st = e.st || {};
    if (!k) return true;
    if (k === 'kg') return !!r.kg;
    if (k === 'kt') return !!r.kt && lensKey(e, lens) != null;
    return isNum(st[k]);
  }

  function lensGroup(e, lens) {
    var r = e.r || {}, st = e.st || {};
    if (lens === 'kd') { var v = lensKey(e, 'kd'); return v == null ? 3 : v <= 0 ? 2 : r.kg[6] ? 1 : 0; }
    if (lens === 'mag') { var kt = r.kt; return kt && isNum(kt.dist) && (e.side === 'P' ? kt.dist < 0 : kt.dist > 0) ? 0 : 1; }
    if (lens === 'pin') return r.kt && r.kt.st === 'PINNED' ? 0 : 1;
    if (lens === 'sell') return st.bs === 'sold' ? 0 : 1;
    return 0;
  }
  function skewKey(e) { return e.st && isNum(e.st.pct) ? Math.abs(e.st.pct) : null; }
  function byRank(a, b) { return (a.er - b.er) || (a.side < b.side ? -1 : a.side > b.side ? 1 : 0); }
  function sortByKey(rows, key, dir) {
    return rows.slice().sort(function (a, b) {
      var x = key(a), y = key(b), xn = x == null, yn = y == null;
      if (xn || yn) return xn && yn ? byRank(a, b) : xn ? 1 : -1;
      return ((y - x) * dir) || byRank(a, b);
    });
  }

  function tailTitle(lens) {
    var k = LENS[lens] && LENS[lens].king;
    if (lens === 'far') return ['Smaller builds', 'Builds too small for a distance reading'];
    if (k === 'kg') return ['No king node on this board', 'This board\'s GEX map has no king node for these names'];
    if (lens === 'kb') return ['Nothing added at the king', 'No contracts added at the King GEX king contract over its recent settles'];
    if (lens === 'ks') return ['No king strength', 'King GEX has no strength score for these names'];
    if (lens === 'sticky') return ['No king streak', 'King GEX has no held-sessions count for these names'];
    if (lens === 'mag') return ['No king distance in σ', 'King GEX has no σ distance for these names'];
    if (lens === 'pin') return ['No pin share', 'King GEX has no pin share for these names'];
    if (lens === 'match') return ['No match reading', 'No king match for these names'];
    if (lens === 'nmatch') return ['No negative-king match', 'No negative-king match for these names'];
    if (lens === 'pmatch') return ['No pile match', 'No pile match for these names'];
    if (k === 'kt') return ['No King GEX king', 'King GEX has no king for these names'];
    return ['No reading for this lens', 'No value for this lens on these names'];
  }

  function arrange(list, lens, dir, both) {
    var secs = [];
    var rankOrder = function (rows) { return both ? sortByKey(rows, skewKey, 1) : rows.slice().sort(byRank); };
    if (lens === 'day') {
      var by = {}, keys = [];
      list.forEach(function (e) { var d = (e.st && e.st.bd) || ''; if (!by[d]) { by[d] = []; keys.push(d); } by[d].push(e); });
      keys.sort(function (a, b) { return a === '' ? 1 : b === '' ? -1 : (a < b ? 1 : -1) * dir; });
      keys.forEach(function (d) {
        secs.push({ key: d, title: d ? F.day(d) + (d === D.latest ? ' · latest' : '') : 'no build day', tip: 'Names whose biggest build of the window came on this session', rows: rankOrder(by[d]) });
      });
    } else if (lens === 'grp') {
      var g = [[], [], []];
      list.forEach(function (e) { var st = e.st || {}; g[st.steady ? 0 : st.big1 ? 2 : 1].push(e); });
      var T = [['Steady one-sided', 'Leaned this way on most of the window\'s sessions'], ['Building toward it', 'Neither steady nor one big day yet'],
        ['One big day', 'Most of the window\'s build came on one session']];
      [0, 1, 2].forEach(function (i) { var rows = rankOrder(g[i]); if (dir < 0) rows.reverse(); secs.push({ key: 'g' + i, title: T[i][0], tip: T[i][1], rows: rows }); });
    } else if (lens === 'skew' || !LENS[lens]) {
      var rows = rankOrder(list);
      if (dir < 0) rows.reverse();
      secs.push({ key: 'main', rows: rows });
    } else {
      var main = [], tail = [];
      list.forEach(function (e) { (hasKing(e, lens) && (lens !== 'far' || lensKey(e, lens) != null) ? main : tail).push(e); });
      main.sort(function (a, b) {
        var ga = lensGroup(a, lens), gb = lensGroup(b, lens);
        if (ga !== gb) return ga - gb;
        var x = lensKey(a, lens), y = lensKey(b, lens);
        if (lens === 'kd' && ga === 2) { x = -Math.abs(x); y = -Math.abs(y); }
        var xn = x == null, yn = y == null;
        if (xn || yn) return xn && yn ? byRank(a, b) : xn ? 1 : -1;
        return ((y - x) * dir) || byRank(a, b);
      });
      secs.push({ key: 'main', rows: main });
      if (tail.length) { var tt = tailTitle(lens); secs.push({ key: 'tail', title: tt[0], tip: tt[1], rows: rankOrder(tail) }); }
    }
    var n = { C: 0, P: 0 };
    secs.forEach(function (s) { s.rows.forEach(function (e) { e.place = ++n[e.side]; }); });
    return secs.filter(function (s) { return s.rows.length; });
  }


  var SORT_NAMES = {
    px: 'price move', op: 'added ratio', net: 'net as a share of its book', build: 'contracts opened', bet: 'days to the bet', usd: '$ opened',
    str: 'strength', one: 'one-sided', read: 'read', days: 'days leaning', rk: 'windows ranked on', held: 'held call share', trd: 'traded ratio',
    z: 'vs its normal', king: 'king distance', biz: 'business', earn: 'next earnings', kdj: 'KDJ', stk: 'name A to Z', shr: 'vs shares',
    gly: 'distance of the build', kh: 'king held', setup: 'setup', pile: 'pile size', kvp: 'king vs price', why: 'strength', lv: 'the lens value',
    tnew: 'must be new', tbk: 'share of its book', tsh: 'their share', tbig: 'biggest contract', tpx: 'price'
  };
  function windowsRanked(r) { var n = 0; STAT_W.forEach(function (w) { var st = r && r.w && r.w[w]; if (st && st.r) n++; }); return n; }
  function kdjScore(r) {
    var k = r && r.kdj;
    if (!k) return null;
    var g = function (x) { return x && x[0] === 'gc' ? 1 : 0; };
    return g(k.w) * 4 + g(k.w2) * 2 + g(k.m);
  }
  function betDays(e) { var mc = e.st && e.st.mc, iso = mc && expISO(mc[0]); return iso ? dBetween(todayET(), iso) : null; }
  function colVal(e, k) {
    var st = e.st || {}, r = e.r || {}, sd = e.side, tp = e.tp, kg = r.kg, kt = r.kt;
    switch (k) {
      case 'stk': return e.sym;
      case 'px': return e.w === 'tape' ? (tp && isNum(tp.px) ? tp.px : null) : isNum(st.ret) ? st.ret : null;
      case 'tpx': return tp && isNum(tp.px) ? tp.px : null;
      case 'op': return share(addOf(st, sd), addOf(st, sd === 'P' ? 'C' : 'P'));
      case 'net': return isNum(st.pct) ? Math.abs(st.pct) : null;
      case 'build': return addOf(st, sd);
      case 'bet': var d = betDays(e); return d == null ? null : -d;
      case 'usd': return premOf(st, sd);
      case 'str': case 'why': return isNum(st.pc) ? st.pc : null;
      case 'one': return oneOf(st);
      case 'read': return st.bs ? READ_RANK[st.bs] || null : null;
      case 'days': return e.w === '1d' ? (isNum(st.z) ? st.z : null) : leanDays(st, sd);
      case 'rk': return windowsRanked(r);
      case 'held': return share(r.oC, r.oP);
      case 'trd': return st.tv ? share(st.tv[sI(sd)], st.tv[1 - sI(sd)]) : null;
      case 'z': return isNum(st.z) ? st.z : null;
      case 'king': return kg && isNum(kg[1]) ? (sd === 'P' ? -kg[1] : kg[1]) : null;
      case 'biz': return isNum(r.biz) ? r.biz : null;
      case 'earn': var er = ernOf(e); return er && er.n ? -Date.parse(er.n) : null;
      case 'kdj': return kdjScore(r);
      case 'shr': return isNum(st.shr) ? st.shr : null;
      case 'gly': return isNum(st.far) ? st.far : null;
      case 'kh': return kt && isNum(kt.h) ? kt.h : null;
      case 'setup': return kt && kt.st ? SETUP_ORD[kt.st] || 0 : null;
      case 'pile': return kt && kt.pl && isNum(kt.pl[3]) ? kt.pl[3] : null;
      case 'kvp': return kt && isNum(kt.dist) ? (sd === 'P' ? -kt.dist : kt.dist) : null;
      case 'lv': return lensKey(e, S.lens);
      case 'tnew': return tp ? (sd === 'P' ? tp.fP : tp.fC) : null;
      case 'tbk': return tp && tp.bk ? (sd === 'P' ? tp.fP : tp.fC) / tp.bk : null;
      case 'tsh': return tp ? share(sd === 'P' ? tp.fP : tp.fC, sd === 'P' ? tp.fC : tp.fP) : null;
      case 'tbig': var t0 = tp && tp.top && tp.top[sd] && tp.top[sd][0]; return t0 && isNum(t0[2]) ? t0[2] : null;
    }
    return null;
  }

  function colSort(rows, k, dir) {
    return rows.map(function (e, i) { return [e, colVal(e, k), i]; }).sort(function (a, b) {
      var ta = a[0].r && a[0].r.thin ? 1 : 0, tb = b[0].r && b[0].r.thin ? 1 : 0;
      var na = a[1] == null ? 2 : ta, nb = b[1] == null ? 2 : tb;
      if (na !== nb) return na - nb;
      if (na === 2) return a[2] - b[2];
      var c = typeof a[1] === 'string' ? String(a[1]).localeCompare(String(b[1])) : b[1] - a[1];
      return (c * dir) || (a[2] - b[2]);
    }).map(function (x) { return x[0]; });
  }
  function sortBy(k) {
    if (!k) go({ so: '' });
    else if (S.so === k) go({ sd: S.sd < 0 ? 1 : -1 });
    else go({ so: k, sd: 1 });
  }


  function sideCls(sd) { return sd === 'P' ? 'p' : 'c'; }
  function moveCls(ret, sd) { return !isNum(ret) || ret === 0 ? '' : (ret > 0) === (sd !== 'P') ? 'with' : 'against'; }
  function tagsOf(e) {
    var st = e.st || {}, r = e.r || {}, sd = e.side, out = [], w = e.w, W = winOf(w) || {};
    if (!e.st) return out;
    if (st.bd && w !== '1d') out.push({ t: st.bd === W.to ? 'today' : F.day(st.bd), tip: 'The biggest ' + sideW(sd) + ' day of the window' });
    if (st.bs === 'bought') out.push({ t: 'bought at the ask', cls: 'green', tip: READ_TIP.bought });
    else if (st.bs === 'sold') out.push({ t: 'sold: sellers opened them', cls: 'red', tip: READ_TIP.sold });
    else if (st.bs === 'mixed') out.push({ t: 'mixed', tip: READ_TIP.mixed });
    if (st.spr && st.spr.length >= 4) out.push({ t: 'a spread? ' + F.strike(st.spr[1]) + '/' + F.strike(st.spr[2]).replace('$', '') + ' ' + F.exp(st.spr[0]), cls: 'amber',
      tip: 'The biggest new lines came as a matching pair: ' + F.num(st.spr[3]) + ' each of the ' + F.exp(st.spr[0]) + ' ' + F.strike(st.spr[1]) + ' and ' + F.strike(st.spr[2]) + ' ' + sideW(sd) + '. That is the shape of a spread (one leg bought, one sold).' });
    if (st.csell) out.push({ t: 'possible call selling', cls: 'red', tip: 'Calls side, read as sold: stock owners writing calls is a common reason' });
    var joined = 0;
    readingsIn(e).forEach(function (x) { if (x[1] && x[1][0] > 1) joined = Math.max(joined, x[1][0]); });
    if (joined > 1) out.push({ t: 'joined ' + joined + ' sessions', tip: 'Some days between were never saved: ' + joined + ' sessions are folded into one reading' });
    if (isNum(st.t20) && st.t20 > 1 && isNum(st.t20n) && st.t20n > 1) out.push({ t: 'in the top 20 on ' + st.t20 + ' of ' + st.t20n + ' settles', tip: 'How often it sat in this list\'s top 20 on the last ' + st.t20n + ' settles' });
    if (isNum(st.nl) && st.nl > 0) out.push({ t: st.nl === 1 ? '1 brand-new line' : st.nl + ' brand-new lines', cls: 'blue', tip: 'Contracts on the lean side that barely existed at the window start' });
    if (isNum(st.bdm)) out.push({ t: (st.bs === 'bought' || st.bs === 'sold' ? st.bs + ' ' : '') + 'on a ' + F.spct(st.bdm) + ' day', cls: 'amber', tip: 'The biggest build day (' + F.day(st.bd) + ') came on a ' + F.spct(st.bdm) + ' move' });
    if (st.ivjf && st.mc) out.push({ t: 'IV up ' + Math.round(st.ivj) + ' pts at ' + F.exp(st.mc[0]), tip: F.exp(st.mc[0]) + ' implied volatility ' + (isNum(st.ivm) ? st.ivm.toFixed(1) + '%, ' : '') + (st.ivj >= 0 ? '+' : '') + st.ivj.toFixed(1) + ' points on the day' });
    if (st.rol && st.rol.length >= 3) out.push({ t: 'ROLL?', cls: 'purple', tip: F.exp(st.rol[0]) + ' ' + F.strike(st.rol[1]).replace('$', '') + (sd === 'P' ? 'P' : 'C') + ' lost ' + F.num(Math.abs(st.rol[2])) + ' the same session: the main line may be a roll' });
    if (st.rare) out.push({ t: 'rare for this stock', cls: 'gold', tip: 'Today\'s build is bigger than on almost all of this stock\'s own recorded days' });
    var fl = flipNote(e);
    if (fl) out.push(fl);
    if (sd === 'P') {
      if (r.ixf) out.push({ t: 'insurance? a whole-market fund', tip: 'Puts on a fund that tracks the whole market are often a hedge' });
      else if (st.ins) out.push({ t: 'insurance? after a ' + F.spct(r.pxs && r.pxs.r20, 0) + ' run in 20 days', tip: 'Puts after a strong run, with the price above both averages, are often a hedge' });
      else out.push({ t: 'drop bet', tip: 'Not a whole-market fund and not after a strong run' });
    }
    return out;
  }
  function flipNote(e) {
    if (!e.st || e.w === '1d' || e.w === 'tape') return null;
    var rd = readingsIn(e), last = rd.length ? rd[rd.length - 1] : null;
    if (!last || last[0] !== D.latest) return null;
    var L = String(last[1][9] || '');
    if (e.side === 'C' && L.indexOf('p') >= 0) return { t: 'today: flipped to puts', cls: 'red', tip: 'The newest session leaned to puts' };
    if (e.side === 'P' && L.indexOf('c') >= 0) return { t: 'today: flipped to calls', cls: 'green', tip: 'The newest session leaned to calls' };
    if (L.indexOf('q') >= 0) return { t: 'today: no longer leaning', tip: 'The newest session was quiet' };
    return null;
  }
  function winSessions(w, strip) {
    var ses = (D.sessions || []).map(function (x, i) { return [x[0], i]; });
    if (w === '1d' && strip) return ses.slice(-10);
    var p = per(w), W = winOf(w) || {}, a = p.since || W.frm, b = p.to || W.to;
    return ses.filter(function (x) { return (!a || x[0] >= a) && (!b || x[0] <= b); });
  }
  function readingsIn(e) {
    var d = (e.r && e.r.d) || [], out = [];
    winSessions(e.w, false).forEach(function (x) { if (d[x[1]]) out.push([x[0], d[x[1]]]); });
    return out;
  }
  function loudOf(e) {
    var r = e.r || {}, W = winOf(e.w) || {}, out = [];
    (r.ld || []).forEach(function (x) { if (x && x[4] === e.side && (!W.frm || x[1] >= W.frm) && (!W.to || x[1] <= W.to)) out.push(x); });
    return out;
  }
  function marksEl(e) {
    var box = el('div', 'bd-marks'), r = e.r || {};
    loudOf(e).slice(0, 1).forEach(function (x) {
      var T = (e.side === 'P' ? LOUD_P : LOUD_C)[x[0]] || ['Loud', 'muted'];
      var a = el('a', 'pill ' + T[1], T[0] + ' ' + F.dayShort(x[1]) + (isNum(x[2]) ? ' · ' + F.usd(x[2]) : '') + (x[3] > 0 ? ' · ' + (x[3] + 1) + 'x' : ''));
      a.href = H.loudBase + '#' + (e.side === 'P' ? 'pm=puts&' : '') + 's=' + encodeURIComponent(e.sym);
      a.target = '_blank'; a.rel = 'noopener';
      U.tip(a, (isNum(x[2]) ? F.usd(x[2]) + ' of premium' : '') + (isNum(x[5]) ? ' · ' + F.num(x[5]) + ' contracts' : '') + (isNum(x[6]) ? ' · ' + pc0(x[6]) + ' bought' : '') + ' (Loud ' + (e.side === 'P' ? 'Puts' : 'Calls') + ', ' + F.day(x[1]) + ')');
      a.addEventListener('click', stop);
      box.appendChild(a);
    });
    if (r.stl && r.stl[0] && e.side === 'C') {
      var s = el('a', 'pill gold', 'Steady build');
      s.href = H.stealthBase + '#s=' + encodeURIComponent(e.sym); s.target = '_blank'; s.rel = 'noopener';
      U.tip(s, 'On Stealth Calls (tier ' + r.stl[0] + ')' + (r.stl[1] ? ' since ' + F.day(r.stl[1]) : ''));
      s.addEventListener('click', stop);
      box.appendChild(s);
    }
    if (e.w !== 'tape' && D.tape && D.tape.rows && D.tape.rows[e.sym]) {
      var tp = D.tape.rows[e.sym], f = e.side === 'P' ? tp.fP : tp.fC;
      if (isNum(f) && f > 0) box.appendChild(U.pill('today: +' + F.k(f) + ' ' + sideW(e.side) + ' must be new', 'teal', 'Traded ' + F.day(D.tape.T) + ', not settled yet: more ' + sideW(e.side) + ' traded than were open that morning'));
    }
    if (H.marks) safe('home marks', function () { H.marks(e, box); });
    return box.childNodes.length ? box : null;
  }
  function ratioTxt(c, p) {
    c = +c || 0; p = +p || 0;
    var hi = Math.max(c, p), lo = Math.min(c, p);
    return F.ratio(c, p, lo > 0 && hi / lo >= 10 ? 0 : 1);
  }
  function heldParts(e) {
    var r = e.r || {}, c = r.oC, p = r.oP;
    if (!isNum(c) && !isNum(p)) return null;
    var now = share(c, p), h0 = h0Of(e), s0 = h0 ? share(h0[0], h0[1]) : null, mv = now != null && s0 != null ? Math.round((now - s0) * 1e2) : null;
    var tip = F.num(c) + ' calls · ' + F.num(p) + ' puts open now (every strike, expiries after ' + F.dayShort(r.cd || D.latest) + ').';
    if (s0 != null) tip += ' At the ' + F.dayShort(per(e.w).base) + ' settle, same expiries: ' + pc0(s0) + ' calls; calls ' + F.sk((c || 0) - h0[0]) + ', puts ' + F.sk((p || 0) - h0[1]) + '.';
    return { c: c, p: p, now: now, s0: s0, mv: mv, tip: tip, cls: r.hlean === 'C' ? 'up' : r.hlean === 'P' ? 'down' : 'mut', thin: !!r.thin };
  }
  function mvTxt(mv) { return mv == null ? '' : mv > 0 ? '▲' + mv + ' pt' : mv < 0 ? '▼' + Math.abs(mv) + ' pt' : '='; }
  function bizParts(r) {
    var v = r && r.biz, fund = r && (r.ls || []).indexOf('etf') >= 0;
    if (!isNum(v)) return { v: null, word: fund ? 'fund' : '–', tip: fund ? 'Funds have no business score' : 'too few business numbers' };
    var b = SKT.biz(v);
    return { v: v, word: b.word, band: b.band, tip: 'Business score ' + v + ' of 100: ' + b.word + ' vs the S&P 500 + Nasdaq-100 (display only)' };
  }
  function earnParts(e) {
    var ec = ecOf(e), er = ernOf(e), mc = e.st && e.st.mc;
    if (!ec && !er) return null;
    if (ec === 'earn') return { t: 'Earnings ' + (er && er.n ? F.dayShort(er.n) : ''), s: 'before the bet ends', cls: 'amber', tip: 'The next earnings date falls on or before the main expiry' };
    if (ec === 'none') return { t: 'No earnings', s: 'before ' + (mc ? F.exp(mc[0], ' ') : 'the bet ends'), cls: 'green', tip: 'The next earnings date comes after the main expiry' + (er && er.n ? ' (' + F.day(er.n) + ')' : '') };
    if (ec === 'fund' || (er && er.ty === 'fund')) return { t: 'Fund', s: 'no earnings', cls: 'muted', tip: 'Funds report no earnings' };
    if (ec === 'unk') return { t: 'Earnings unknown', s: '', cls: 'muted', tip: 'No earnings date on record' };
    if (er && er.n) return { t: 'Earnings ' + F.dayShort(er.n), s: '', cls: 'muted', tip: 'Next earnings ' + F.day(er.n) };
    return null;
  }
  function betParts(e) {
    var st = e.st, mc = st && st.mc;
    if (!mc) return null;
    var sd = mc[1] === 'P' ? 'P' : mc[1] === 'C' ? 'C' : e.side, W = SKT.W(sd), k = mc[2], px = e.r && e.r.px, iso = expISO(mc[0]);
    var l1 = W.bet(k, mc[0]), l2 = '', d = iso ? dBetween(todayET(), iso) : null;
    if (d != null && d < 0) l2 = 'expired ' + nDays(-d) + ' ago';
    else if (d === 0) l2 = 'expires today';
    else if (isNum(px) && px > 0 && isNum(k)) {
      var need = k / px - 1, calls = sd !== 'P';
      if (calls ? need <= 0 : need >= 0) l2 = 'already ' + F.pct(Math.abs(need), Math.abs(need) < 0.01 ? 1 : 0) + (calls ? ' above' : ' below') + (d != null ? ' · ' + nDays(d) + ' left' : '');
      else l2 = W.needs(need) + (d != null ? ' in ' + nDays(d) : '');
    } else if (d != null) l2 = nDays(d) + ' left';
    var add = addOf(st, sd);
    var tip = F.exp(mc[0]) + ' ' + F.strike(k) + ' ' + sideW(sd) + ': +' + F.k(mc[3]) + (isNum(add) ? ' of the ' + F.k(add) + ' ' + sideW(sd) + ' opened ' + sinceTxt(e.w) : '') + (isNum(mc[4]) ? ' (' + pc0(mc[4]) + ')' : '') + '.' + v2Tip(e.w);
    return { l1: l1, l2: l2, tip: tip };
  }
  function strengthTip(e) {
    var st = e.st || {};
    if (!isNum(st.pc)) return '';
    return 'Top ' + Math.max(1, 1e2 - st.pc) + '% of every name read ' + wWord(e.w) + ' by net as a share of its own book';
  }
  function kingParts(e) {
    var r = e.r || {}, kg = r.kg, kt = r.kt, kx = r.kx || {}, sd = e.side;
    if (!kg && !kt) return null;
    var o = { lines: [], tip: [] };
    if (kg) {
      o.k = F.strike(kg[0]).replace('$', ''); o.dist = kg[1]; o.onSide = kOnSide(e); o.far = !!kg[6];
      o.sub = (isNum(kg[2]) ? F.usd(kg[2]) : '') + (kg[4] ? ' · ' + F.exp(kg[4], ' ') : '');
      o.tip.push('King node ' + F.strike(kg[0]) + ' (this board\'s king node): the strike with the most call gamma, ' + F.spct(kg[1]) + ' from the ' + F.dayShort(kg[7]) + ' close of ' + F.money(kg[5]) + '; $' + F.k(kg[2]) + ' of gamma per 1% move, mostly ' + F.exp(kg[4]) + '.' + (kg[6] ? ' It sits too far away to act as a magnet.' : ''));
    }
    if (kt) {
      var same = kg && isNum(kt.k) && Math.abs(kt.k - kg[0]) < 1e-6;
      if (same) {
        var bits = [];
        if (kt.exp && String(kt.exp) !== String(kg[4])) bits.push(F.exp(kt.exp, ' '));
        if (isNum(kt.dte)) bits.push(nDays(kt.dte));
        if (isNum(kt.sig)) bits.push(kt.sig.toFixed(1) + 'σ');
        if (bits.length) o.lines.push({ t: bits.join(' · '), cls: 'kt' });
        if (isNum(kt.h)) o.held = 'held ' + kt.h + (kt.h === 1 ? ' session' : ' sessions');
      } else if (isNum(kt.k)) o.held = 'King GEX king ' + F.strike(kt.k).replace('$', '');
      if (kt.st) o.setup = kt.st;
      if (kt.pl && kt.pl.length >= 2) o.pile = 'pile ' + F.strike(kt.pl[0]).replace('$', '') + (kt.pl[1] !== kt.pl[0] ? '-' + F.strike(kt.pl[1]).replace('$', '') : '') + (kt.pl[7] ? ' · king inside' : '');
      if (isNum(kt.ad) && kt.ad) o.tip.push(F.sk(kt.ad) + ' added at the King GEX king contract over its recent settles');
    }
    var tipx = [];
    if (isNum(kx.fl)) tipx.push('flip ' + F.strike(kx.fl));
    if (isNum(kx.cw)) tipx.push('call wall ' + F.strike(kx.cw));
    if (isNum(kx.pw)) tipx.push('put wall ' + F.strike(kx.pw));
    if (isNum(kx.conc)) tipx.push('king share of the map ' + pc0(kx.conc));
    if (isNum(kx.dom)) tipx.push(kx.dom.toFixed(1) + '× the next strike');
    if (tipx.length) o.tip.push(tipx.join(' · '));
    if (sd === 'P') {
      var nk = r.ktn, tr = kx.tr;
      if (nk && isNum(nk.k)) o.neg = { t: 'negative king ' + F.strike(nk.k).replace('$', '') + (isNum(nk.dist) ? ' ' + F.spct(nk.dist, 0) : '') + (isNum(nk.v) ? ' · ' + F.usd(nk.v) : '') };
      else if (tr && isNum(tr[0])) o.neg = { t: 'negative king ' + F.strike(tr[0]).replace('$', '') + (isNum(tr[1]) ? ' · ' + F.usd(tr[1]) : '') };
      if (o.neg) o.neg.tip = (isNum(kx.trc) ? pc0(kx.trc) + ' of the map' : '') + (isNum(kx.trd) ? ' · ' + kx.trd.toFixed(1) + '× the next' : '');
    }
    return o;
  }


  function dash() { return sp('mut', '–'); }
  function sub(t, cls) { return el('small', 'sub' + (cls ? ' ' + cls : ''), t); }
  function cRank(e, ctx) {
    var c = el('div', 'bd-rk'), st = e.st || {};
    if (e.off || e.near || e.place == null) { c.appendChild(sp('rn mut', '–')); return c; }
    c.appendChild(sp('rn' + (e.place <= 3 ? ' top' : ''), String(e.place)));
    if (e.w !== 'tape') {
      if (ctx.lens === 'skew') {
        if (st.r && st.pr == null) { if (isNum(st.t20n) && st.t20n > 1) c.appendChild(sp('mv new', 'NEW')); }
        else if (isNum(st.pr) && st.pr > st.r) c.appendChild(sp('mv up', '▲' + (st.pr - st.r)));
        else if (isNum(st.pr) && st.pr < st.r) c.appendChild(sp('mv dn', '▼' + (st.r - st.pr)));
      } else if (st.r) c.appendChild(sp('mv sk', 'skew #' + st.r));
      if (isNum(st.str) && st.str > 1) c.appendChild(sp('streak', st.str + 'd' + (st.strp ? '+' : '')));
    }
    var tip = [];
    var tot = ((winOf(e.w) || {})[e.side] || []).length || (e.w === 'tape' && D.tape ? (D.tape[e.side] || []).length : 0);
    if (ctx.lens !== 'skew' && LENS[ctx.lens] && ctx.lens !== 'grp' && ctx.lens !== 'day') tip.push('#' + e.place + ' of ' + ctx.nSide[e.side] + ' by ' + LENS[ctx.lens].l.toLowerCase());
    else tip.push('#' + e.place + ' here' + (e.er && tot ? ' · #' + e.er + ' of all ' + tot : ''));
    if (isNum(st.str) && st.str > 0) tip.push('Ranked on ' + sideW(e.side) + ' for ' + st.str + (st.strp ? '+' : '') + (st.str === 1 ? ' settle' : ' settles in a row') + (st.strs ? ' since ' + F.dayShort(st.strs) : ''));
    if (isNum(st.t20) && isNum(st.t20n)) tip.push('top 20 on ' + st.t20 + ' of the last ' + st.t20n);
    U.tip(c, tip.join(' · '));
    return c;
  }

  var rowMenu = null;
  function closeRowMenu() { if (rowMenu) { if (rowMenu.parentNode) rowMenu.parentNode.removeChild(rowMenu); rowMenu = null; } }
  function rowMenuBtn(e) {
    var b = el('button', 'bd-oi', '▾'); b.type = 'button';
    b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-label', 'Open ' + e.sym + ' on another board');
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (U.hideTip) U.hideTip();
      var key = e.sym + '|' + e.side, was = rowMenu && rowMenu.getAttribute('data-k') === key;
      closeRowMenu();
      if (was || !SKT.name || !SKT.name.menu) return;
      var items = SKT.name.menu(e.sym, e.r, e.side === 'P');
      if (!items.length) return;
      var dd = U.dropdown(null, items, { cls: 'bd-oim' });
      dd.setAttribute('data-k', key);
      dd.addEventListener('click', function () { setTimeout(closeRowMenu, 0); });
      document.body.appendChild(dd);
      var r = b.getBoundingClientRect(), w = dd.offsetWidth, h = dd.offsetHeight;
      var top = r.bottom + 4 + h > innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4;
      dd.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
      dd.style.top = top + 'px';
      rowMenu = dd;
    });
    return b;
  }
  document.addEventListener('click', function (ev) { if (rowMenu && !rowMenu.contains(ev.target)) closeRowMenu(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeRowMenu(); });
  window.addEventListener('scroll', closeRowMenu, { passive: true, capture: true });
  window.addEventListener('resize', closeRowMenu);
  function cStock(e, ctx) {
    var c = el('div', 'bd-st'), r = e.r || {};
    var l1 = el('div', 'l1');
    l1.appendChild(el('b', 'tk', e.sym));
    var ls = (r.ls || []).slice();
    if (r.pin && ls.indexOf('pin') < 0) ls.push('pin');
    ls.forEach(function (t) { if (LS_TAG[t]) l1.appendChild(sp('lt' + (t === 'pin' ? ' pin' : ''), LS_TAG[t])); });
    if (r.cd) l1.appendChild(U.tip(sp('lt oi', 'OI ' + F.dayShort(r.cd)), 'option data from the ' + F.dayShort(r.cd) + ' settle'));
    if (ctx.both) l1.appendChild(sp('lean ' + sideCls(e.side), e.side === 'P' ? 'leaning puts' : 'leaning calls'));
    if (!ctx.simple && !ctx.card && !ctx.compact) l1.appendChild(rowMenuBtn(e));
    c.appendChild(l1);
    if (r.nm || r.ai) {
      var l2 = el('div', 'l2');
      if (r.nm) l2.appendChild(U.tip(sp('nm', unent(r.nm)), unent(r.nm)));
      if (r.ai && ls.indexOf('ai') >= 0) l2.appendChild(U.tip(sp('ai', 'AI · ' + aiShort(r.ai)), r.ai));
      c.appendChild(l2);
    }
    if (e.near || e.off) c.appendChild(el('div', 'why', (e.near ? '✕ ' : '') + (e.whyTxt || e.why || 'not ranked')));
    var tg = tagsOf(e).slice(0, ctx.card || ctx.compact ? 2 : 4);
    if (tg.length) {
      var tl = el('div', 'bd-tags');
      tg.forEach(function (t) { tl.appendChild(U.pill(t.t, t.cls || '', t.tip)); });
      c.appendChild(tl);
    }
    var mk = marksEl(e);
    if (mk) c.appendChild(mk);
    if (!ctx.simple && !ctx.card && !ctx.compact && !ctx.tape && e.st) { var rk = cRanked(e); rk.className = 'bd-rko rkx'; c.appendChild(rk); }
    return c;
  }
  function cPrice(e, ctx) {
    var c = el('div', 'bd-px'), r = e.r || {}, st = e.st || {};
    if (!isNum(r.px)) c.appendChild(dash()); else c.appendChild(el('b', 'v', F.money(r.px)));
    if (isNum(st.ret)) {
      var m = sp('ret ' + moveCls(st.ret, e.side), F.spct(st.ret));
      U.tip(m, 'Price move ' + sinceTxt(e.w) + (moveCls(st.ret, e.side) === 'with' ? ', with the ' + sideW(e.side) : ''));
      c.appendChild(m);
    }
    if (st.mv2) {
      var s20 = r.pxs && r.pxs.s20, n = (winOf(e.w) || {}).n || 1, sig = isNum(s20) && s20 > 0 && isNum(st.ret) ? Math.abs(st.ret) / (s20 * Math.sqrt(n)) : null;
      c.appendChild(U.pill('already moving', 'amber', (sig ? '+' + sig.toFixed(1) + 'σ' : 'A big move') + ' over ' + (WL[e.w] || e.w) + ' with the ' + sideW(e.side)));
    }
    if (e.w === 'all' && st.since) c.appendChild(U.tip(sub('since ' + F.dayShort(st.since)), 'joined the saved option chains on ' + F.dayShort(st.since) + ': its Total counts from then'));
    if (!ctx.simple && r.pst && PST[r.pst]) {
      var ps = el('div', 'pst');
      ps.appendChild(U.pill(PST[r.pst], 'muted', 'Price state from the distance to the 52-week high and the 20-session move'));
      var px = r.pxs || {}, bits = [];
      if (isNum(px.dd) && px.dd > 0) bits.push(pc0(px.dd) + ' under the high');
      if (px.a50 != null) bits.push('50d ' + (px.a50 ? '↑' : '↓'));
      if (px.a200 != null) bits.push('200d ' + (px.a200 ? '↑' : '↓'));
      if (bits.length) ps.appendChild(U.tip(sub(bits.join(' · ')), 'Under the 52-week high; ↑ = the close sits above its 50- / 200-session average'));
      c.appendChild(ps);
    }
    if (H.live) safe('live', function () { var lv = H.live(e); if (lv) c.appendChild(lv); });
    return c;
  }
  function cOpened(e) {
    var c = el('div', 'bd-op'), st = e.st;
    if (!st || (!isNum(st.aC) && !isNum(st.aP))) { c.appendChild(dash()); return c; }
    var lead = (st.aC || 0) > 0 && (st.aP || 0) > 0 ? 'added ' + ratioTxt(st.aC, st.aP) : ratioTxt(st.aC, st.aP);
    c.appendChild(el('b', 'v ' + ((st.aC || 0) >= (st.aP || 0) ? 'up' : 'down'), lead));
    c.appendChild(U.twoBar(st.aC, st.aP, { w: 72 }));
    c.appendChild(sub('+' + F.k(st.aC) + ' calls · +' + F.k(st.aP) + ' puts'));
    var tv = trdParts(e);
    if (tv) { var s = sub(tv.t, 'trd-sub' + (tv.thin ? ' thin' : '')); c.appendChild(s); }
    U.tip(c, 'Calls opened ' + sinceTxt(e.w) + ': ' + F.num(st.aC) + ' · puts ' + F.num(st.aP));
    return c;
  }
  function trdParts(e) {
    var st = e.st, tv = st && st.tv;
    if (!tv || !(tv[0] + tv[1] > 0)) return null;
    var t = tv[0] >= tv[1] ? (tv[1] ? (tv[0] / tv[1]).toFixed(1) + 'x calls' : 'calls only') : (tv[0] ? (tv[1] / tv[0]).toFixed(1) + 'x puts' : 'puts only');
    return { t: t + ' · ' + F.k(tv[0] + tv[1]) + ' traded', c: tv[0], p: tv[1], thin: !!st.tvt };
  }
  function cNet(e) {
    var c = el('div', 'bd-net'), st = e.st;
    if (!st || !isNum(st.net)) { c.appendChild(dash()); return c; }
    c.appendChild(el('b', 'v ' + (st.net >= 0 ? 'up' : 'down'), F.sk(st.net)));
    if (isNum(st.pct)) c.appendChild(sub(F.pct(Math.abs(st.pct)) + ' of book'));
    var gl = goldLine(st);
    if (gl) c.appendChild(gl);
    return c;
  }
  function goldLine(st) {
    var gx = st && st.gx;
    if (!gx || !gx.length) return null;
    var t = gx.length === 1 ? pc0(gx[0][1]) + ' in ' + F.exp(gx[0][0]) : pc0(gx[0][1]) + ' in ' + F.exp(gx[0][0]) + ', ' + pc0(gx[1][1]) + ' ' + F.exp(gx[1][0]);
    return el('div', 'gold-line', t);
  }
  function buildTip(e) {
    var st = e.st || {}, sd = e.side, add = addOf(st, sd), gx = st.gx || [], ten = st.ten;
    var s = 'Of the ' + sideW(sd) + ' opened ' + sinceTxt(e.w) + (isNum(add) ? ' (' + F.num(add) + ')' : '') + ', ';
    s += gx.length ? gx.map(function (x, i) { return i ? F.exp(x[0]) + ' took ' + pc0(x[1]) : pc0(x[1]) + ' went into ' + F.exp(x[0]); }).join('; ') + '.' : 'no single expiry took most of them.';
    if (ten && ten.length >= 4) s += ' By expiry: up to 1 month ' + pc0(ten[0]) + ' · 1-6 months ' + pc0(ten[1]) + ' · 6-12 months ' + pc0(ten[2]) + ' · 1 year+ ' + pc0(ten[3]) + '.';
    if (st.otm && st.otm.length) {
      var OTL = ['in the money', 'within 10%', '10-25% away', '25-50% away', '50%+ away'];
      s += ' By distance from the price: ' + st.otm.slice(0, 5).map(function (v, i) { return OTL[i] + ' ' + pc0(v); }).join(' · ') + '.';
    }
    return s + v2Tip(e.w);
  }
  function expTableHtml(rows, more, e) {
    var Lc = yymmdd(D.latest), esc = U.esc, aw = ['1d', '1w', '2w', '1m'].indexOf(e.w);
    rows = (rows || []).filter(function (x) { return String(x[0]) > Lc; });
    if (!rows.length) return null;
    var sum = [0, 0, 0, 0, 0];
    var h = '<table><tr><th>Expiry</th><th>Held now</th><th>1D</th><th>1W</th><th>2W</th><th>1M</th></tr>';
    rows.forEach(function (x) {
      h += '<tr><td>' + esc(F.exp(x[0])) + '</td><td>' + esc(F.k(x[1])) + '</td>';
      for (var i = 2; i < 6; i++) {
        var v = x[i];
        if (isNum(v)) sum[i - 1] += v;
        h += '<td' + (i - 2 === aw ? ' style="color:#ffd77a"' : '') + '>' + (isNum(v) ? esc(F.sk(v)) : '–') + '</td>';
      }
      if (isNum(x[1])) sum[0] += x[1];
      h += '</tr>';
    });
    h += '<tr><td><b>Sum</b></td><td>' + esc(F.k(sum[0])) + '</td>' + sum.slice(1).map(function (v, i) { return '<td' + (i === aw ? ' style="color:#ffd77a"' : '') + '>' + esc(F.sk(v)) + '</td>'; }).join('') + '</tr></table>';
    return '<b>' + esc(e.sym) + ' ' + sideW(e.side) + ' by expiry</b> (net change in open interest)' + h + (more ? '<div>+' + more + ' more expiries</div>' : '');
  }
  function cBuild(e) {
    var c = el('div', 'bd-bld'), st = e.st || {}, add = addOf(st, e.side);
    if (!isNum(add)) { c.appendChild(dash()); return c; }
    var chip = sp('bchip', '+' + F.k(add) + ' ' + sideW(e.side));
    if (isNum(st.nx)) chip.appendChild(sp('nx', ' · ' + st.nx + (st.nx === 1 ? ' expiry' : ' expiries')));
    c.appendChild(chip);
    if (isNum(st.nx)) c.appendChild(sub(st.nx + (st.nx === 1 ? ' expiry' : ' expiries'), 'nxs'));
    if (st.gx && st.gx[0]) c.appendChild(sub('biggest ' + F.exp(st.gx[0][0]) + ' ' + pc0(st.gx[0][1])));
    var v2 = v2Note(e.w);
    if (v2) c.appendChild(sub(v2, 'v2'));
    U.tip(chip, buildTip(e), function () {
      var xt = e.r && e.r.xt && e.r.xt[e.side];
      if (xt && xt.length) return expTableHtml(xt, 0, e);
      if (!e.r || !e.r.nf) return null;
      return SKT.nameFile(e.sym, { hover: true }).then(function (nf) {
        var x = nf && nf.exps && nf.exps[e.side];
        return x ? expTableHtml(x, nf.exps.more && nf.exps.more[e.side], e) : null;
      });
    });
    return c;
  }
  function cBet(e) {
    var c = el('div', 'bd-bet'), b = betParts(e);
    if (!b) { c.appendChild(dash()); return c; }
    var l1 = el('div', 'v');
    var m = /^(Above|Below) (\S+) by (.+)$/.exec(b.l1);
    if (m) { txt(l1, m[1] + ' '); l1.appendChild(el('b', null, m[2])); txt(l1, ' by '); l1.appendChild(el('b', null, m[3])); }
    else txt(l1, b.l1);
    c.appendChild(l1);
    if (b.l2) c.appendChild(sub(b.l2));
    var v2 = v2Note(e.w);
    if (v2) c.appendChild(sub(v2, 'v2'));
    U.tip(c, b.tip);
    return c;
  }
  function relDay(e) { var st = e.st || {}, n = (winOf(e.w) || {}).n || 1; return isNum(st.rel) ? st.rel * n : null; }
  function cUsd(e, ctx) {
    var c = el('div', 'bd-usd'), st = e.st || {}, v = premOf(st, e.side), o = premOf(st, e.side === 'P' ? 'C' : 'P');
    if (!isNum(v)) { c.appendChild(dash()); return c; }
    var l = el('div', 'v'); l.appendChild(el('b', null, F.usd(v)));
    if (isNum(o) && !ctx.simple) l.appendChild(sp('oth', ' ' + F.usd(o)));
    c.appendChild(l);
    if (ctx.simple) { var a = addOf(st, e.side); if (isNum(a)) c.appendChild(sub(F.k(a) + ' ' + sideW(e.side))); }
    var rd = relDay(e);
    if (rd != null) c.appendChild(sub(F.pct(rd) + ' of a day\'s $ trading'));
    if (!ctx.simple && isNum(st.shr)) { var dn = st.shr * ((winOf(e.w) || {}).n || 1); c.appendChild(sub('vs shares: ' + dn.toFixed(dn < 10 ? 1 : 0) + ' days of trading', 'shx')); }
    var v2 = v2Note(e.w);
    if (v2) c.appendChild(sub(v2, 'v2'));
    U.tip(c, 'Premium of the new contracts, at each option\'s closing mid' + (isNum(o) ? ' (other side ' + F.usd(o) + ')' : '') + '.' + v2Tip(e.w));
    return c;
  }
  function cStrength(e, ctx) {
    var c = el('div', 'bd-str'), st = e.st || {}, one = oneOf(st);
    if (!isNum(st.tier) && !isNum(st.pc) && one == null) { c.appendChild(dash()); return c; }
    var l = el('div', 'v');
    if (isNum(st.tier)) l.appendChild(U.dots(st.tier, { of: 3 }));
    if (isNum(st.pc)) l.appendChild(U.bar(st.pc, { w: ctx.simple ? 40 : 54, cls: 'sbar-g' }));
    c.appendChild(l);
    if (one != null) c.appendChild(sub(pc0(one) + ' one-sided'));
    var ow = SKT.oneWords(st, e.side, true), stt = strengthTip(e);
    U.tip(c, (stt ? stt + '. ' : '') + (ow ? 'One-sided: ' + ow + '.' : ''));
    return c;
  }
  function cRead(e) {
    var c = el('div', 'bd-rd'), st = e.st || {};
    if (e.near || e.off) { c.appendChild(el('span', 'why', (e.near ? '✕ ' : '') + (e.whyTxt || e.why || ''))); return c; }
    var l = el('div', 'v');
    if (st.bs) l.appendChild(U.pill(READW[st.bs] || st.bs, st.bs === 'bought' ? 'green' : st.bs === 'sold' ? 'red' : st.bs === 'mixed' ? 'amber' : 'muted', READ_TIP[st.bs]));
    if (st.spr) l.appendChild(U.pill('Spread?', 'amber', 'A matching pair of lines on one expiry: ' + F.exp(st.spr[0]) + ' ' + F.strike(st.spr[1]) + '/' + F.strike(st.spr[2]).replace('$', '')));
    if (!l.childNodes.length) l.appendChild(dash());
    c.appendChild(l);
    if (st.sps && (st.sps[0] > 0 || st.sps[1] > 0)) {
      c.appendChild(U.tip(sub(pc0(st.sps[0]) + ' of the adds in spreads · ' + pc0(st.sps[1]) + ' paired with ' + sideW(e.side === 'P' ? 'C' : 'P')),
        'Lines opened in matching pairs on one expiry (spreads), or matched with the other side (collars, risk reversals)'));
    }
    if (st.csell) c.appendChild(sub('possible call selling', 'red'));
    var dl = e.w === '1d' ? (isNum(st.z) ? 'vs its normal: z ' + zTxt(st.z) : '') : st.tilt && st.cov ? st.tilt[sI(e.side)] + ' of ' + st.cov[0] + ' days leaned ' + sideW(e.side) : '';
    if (dl) c.appendChild(sub(dl, 'dlx'));
    return c;
  }
  function dayCellsOf(e) {
    var d = (e.r && e.r.d) || [], ses = winSessions(e.w, true), last = D.latest;
    return ses.map(function (x) {
      var v = d[x[1]];
      if (!v) return { day: x[0], tip: F.day(x[0]) + ': no reading' };
      var L = String(v[9] || ''), l = L.indexOf('c') >= 0 ? 'c' : L.indexOf('p') >= 0 ? 'p' : L.indexOf('q') >= 0 ? 'q' : null;
      var tip = F.day(x[0]) + ': ' + F.sk(v[2]) + ' calls · ' + F.sk(v[3]) + ' puts opened · net ' + F.sk(v[4]) + (isNum(v[5]) ? ' (' + F.spct(v[5]) + ' of its book)' : '') +
        (v[6] && READW[v[6]] ? ' · ' + READW[v[6]].toLowerCase() : '') + (v[0] > 1 ? ' · joins ' + v[0] + ' sessions' : '') + (v[10] ? ' · a pair (spread?)' : '');
      return { l: l, t: v[6] === 'bought' ? 'B' : v[6] === 'sold' ? 'S' : '', pair: !!v[10], dot: L.indexOf('x') >= 0, gold: L.indexOf('g') >= 0, today: e.w === '1d' && x[0] === last, day: x[0], tip: tip };
    });
  }
  function cDays(e) {
    var c = el('div', 'bd-days'), st = e.st || {};
    if (e.near || e.off) { c.appendChild(el('span', 'why', (e.near ? '✕ ' : '') + (e.whyTxt || e.why || ''))); return c; }
    var cells = dayCellsOf(e);
    if (cells.length) c.appendChild(U.dayCells(cells, { cls: 'strip', onPick: function (d) { openName(e.sym, d); } }));
    var lab;
    if (e.w === '1d') {
      if (isNum(st.z)) lab = U.tip(el('span', 'dl', 'z ' + zTxt(st.z)), 'Today\'s build against this stock\'s own last ' + (st.nh || '') + ' days (0 = a usual day)');
    } else if (st.tilt && st.cov) lab = el('span', 'dl', st.tilt[sI(e.side)] + ' of ' + st.cov[0] + ' days');
    if (lab) c.appendChild(lab);
    if (!c.childNodes.length) c.appendChild(dash());
    return c;
  }
  function cRanked(e) {
    var r = e.r || {}, spec = [], tip = [];
    STAT_W.forEach(function (w) {
      if (w === 'all' && !winOf('all')) return;
      var st = r.w && r.w[w], lab = WL[w].replace('Total', 'T');
      if (!st) { spec.push({ label: lab, state: null }); tip.push('no reading on ' + WL[w]); return; }
      if (st.r) { spec.push({ label: lab, state: st.side === 'P' ? 'P' : 'C' }); tip.push('#' + st.r + ' ' + sideW(st.side) + ' on ' + WL[w]); }
      else { spec.push({ label: lab, state: '' }); tip.push('not ranked on ' + WL[w] + (st.why ? ' (' + st.why + ')' : '')); }
    });
    var d = U.dots(spec, { aria: tip.join(', ') });
    var c = el('div', 'bd-rko'); c.appendChild(d); U.tip(c, tip.join(', '));
    return c;
  }
  function cHeld(e, ctx) {
    var c = el('div', 'bd-held'), h = heldParts(e);
    if (!h) { c.appendChild(dash()); return c; }
    if (h.thin) c.classList.add('thin');
    var l = el('div', 'v'); l.appendChild(el('b', h.cls, ratioTxt(h.c, h.p)));
    if (h.mv != null) l.appendChild(sp('hmv ' + (h.mv > 0 ? 'up' : h.mv < 0 ? 'down' : 'mut'), mvTxt(h.mv)));
    c.appendChild(l);
    c.appendChild(U.splitBar(h.c, h.p, { w: ctx.simple ? 100 : 86, mid: true, tick: h.s0, thin: h.thin }));
    c.appendChild(sub(F.k(h.c) + ' C · ' + F.k(h.p) + ' P'));
    if (h.s0 != null && v2Note(e.w)) c.appendChild(sub(v2Note(e.w), 'v2'));
    U.tip(c, h.tip + (h.s0 != null ? v2Tip(e.w) : ''));
    return c;
  }
  function cTraded(e) {
    var c = el('div', 'bd-trd'), t = trdParts(e);
    if (!t) { c.appendChild(dash()); return c; }
    if (t.thin) c.classList.add('thin');
    c.appendChild(el('div', 'v', t.t));
    c.appendChild(U.splitBar(t.c, t.p, { w: 60, h: 4, thin: t.thin }));
    if (v2Note(e.w)) c.appendChild(sub(v2Note(e.w), 'v2'));
    U.tip(c, 'Contracts traded on expiries 2+ days out, summed over the window\'s sessions with an after-close chain: ' + F.num(t.c) + ' calls · ' + F.num(t.p) + ' puts' + (t.thin ? ' (few trades: a thin reading)' : ''));
    return c;
  }
  function cShares(e) {
    var c = el('div', 'bd-shr'), st = e.st || {}, n = (winOf(e.w) || {}).n || 1;
    if (!isNum(st.shr)) { c.appendChild(dash()); return c; }
    var v = st.shr * n;
    c.appendChild(el('div', 'v', v.toFixed(v < 10 ? 1 : 0) + ' days of trading'));
    var sh = st.sh && st.sh[sI(e.side)];
    if (isNum(sh)) c.appendChild(sub('like ' + F.k(sh) + ' shares'));
    U.tip(c, 'The new contracts move like ' + (isNum(sh) ? F.k(sh) : '–') + ' shares (delta × 100), against the stock\'s own share trading over the window');
    return c;
  }

  function glyphOf(gb, o) {
    var g = U.glyph(gb, { w: o.w, h: o.h, tip: o.tip });
    if (o.full) { var s = g.tagName && g.tagName.toLowerCase() === 'svg' ? g : g.querySelector && g.querySelector('svg'); if (s) { s.setAttribute('width', '100%'); s.setAttribute('preserveAspectRatio', 'none'); } }
    return g;
  }
  function cGlyph(e, ctx) {
    var c = el('div', 'bd-gly'), st = e.st || {};
    if (!st.gb) { c.appendChild(dash()); return c; }
    c.appendChild(glyphOf(st.gb, { w: 150, h: 26,
      tip: 'Where the ' + sideW(e.side) + ' opened ' + sinceTxt(e.w) + ' sit against the price: calls above the line, puts below, nearer strikes in the middle, out to ±60% at the ends; the biggest bin gold.' + v2Tip(e.w) }));
    if (v2Note(e.w)) c.appendChild(sub(v2Note(e.w), 'v2'));
    return c;
  }
  function cKing(e, ctx) {
    var c = el('div', 'bd-king'), k = kingParts(e);
    if (!k) { c.appendChild(dash()); U.tip(c, 'No king node: the option book is too thin for a gamma map'); return c; }
    var l = el('div', 'v');
    if (k.k) {
      l.appendChild(el('b', k.far ? 'mut' : null, k.k));
      if (isNum(k.dist)) l.appendChild(sp('kd ' + (k.dist >= 0 ? 'up' : 'down'), F.spct(k.dist)));
      if (k.onSide) l.appendChild(U.tip(sp('ok', '✓'), 'on the lean\'s side'));
    }
    c.appendChild(l);
    if (k.sub) c.appendChild(sub(k.sub));
    k.lines.forEach(function (x) { c.appendChild(sub(x.t, x.cls)); });
    if (k.held) c.appendChild(sub(k.held, 'kx'));
    if (k.setup || k.pile) {
      var ln = el('div', 'kx kline');
      if (k.setup) ln.appendChild(sp('setup s-' + (SETUP_CLS[k.setup] || 'x'), k.setup));
      if (k.pile) ln.appendChild(sp('pl', k.pile));
      c.appendChild(ln);
    }
    if (k.neg) c.appendChild(U.tip(sub(k.neg.t, 'neg'), k.neg.tip));
    var kj = e.r && e.r.kdj;
    if (kj && !ctx.simple && !ctx.compact && !ctx.tape) { var kx = el('div', 'kdjx'); kx.appendChild(kdjChip('1W', kj.w)); kx.appendChild(kdjChip('2W', kj.w2)); kx.appendChild(kdjChip('1M', kj.m)); c.appendChild(kx); }
    U.tip(c, k.tip.join(' · '));
    return c;
  }
  function cKHeld(e) {
    var c = el('div', 'bd-kh'), kt = e.r && e.r.kt;
    if (!kt || !isNum(kt.h)) { c.appendChild(dash()); return c; }
    c.appendChild(el('div', 'v', kt.h + (kt.h === 1 ? ' session' : ' sessions')));
    if (kt.hs) c.appendChild(sub('since ' + F.dayShort(kt.hs)));
    U.tip(c, 'How long the King GEX king (' + F.strike(kt.k) + ') has held its strike');
    return c;
  }
  function cSetup(e) {
    var c = el('div', 'bd-setup'), kt = e.r && e.r.kt;
    if (!kt || !kt.st) { c.appendChild(dash()); return c; }
    c.appendChild(sp('setup s-' + (SETUP_CLS[kt.st] || 'x'), kt.st));
    U.tip(c, 'King GEX setup of its king');
    return c;
  }
  function cPile(e) {
    var c = el('div', 'bd-pile'), kt = e.r && e.r.kt, pl = kt && kt.pl;
    if (!pl || pl.length < 2) { c.appendChild(dash()); return c; }
    c.appendChild(el('div', 'v', F.strike(pl[0]).replace('$', '') + (pl[1] !== pl[0] ? '-' + F.strike(pl[1]).replace('$', '') : '') + (pl[7] ? ' ✓' : '')));
    var bits = [];
    if (isNum(pl[3])) bits.push(F.usd(pl[3]));
    if (isNum(pl[4])) bits.push(pc0(pl[4]));
    if (pl[5]) bits.push(F.exp(pl[5]));
    if (bits.length) c.appendChild(sub(bits.join(' · ')));
    U.tip(c, 'A run of neighbouring strikes holding most of the call gamma (King GEX pile)' + (pl[7] ? '; the king sits inside it' : ''));
    return c;
  }
  function cKvp(e) {
    var c = el('div', 'bd-kvp'), kt = e.r && e.r.kt, s = kt && kt.sp;
    if (!s || s.length < 2) { c.appendChild(dash()); return c; }
    var W = 86, Hh = 26, ks = s.map(function (x) { return x[1]; }), ps = s.map(function (x) { return x[2]; });
    var all = ks.concat(ps).filter(isNum), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (hi === lo) { hi += 1; lo -= 1; }
    var sv = SKT.svg.root(W, Hh, { 'class': 'kvp', 'aria-hidden': 'true' }), n = s.length;
    var X = function (i) { return 1 + i / (n - 1) * (W - 2); }, Y = function (v) { return Hh - 2 - (v - lo) / (hi - lo) * (Hh - 4); };
    var dk = '', dp = '';
    s.forEach(function (x, i) {
      if (isNum(x[1])) dk += (dk ? 'H' + X(i).toFixed(1) + 'V' : 'M' + X(i).toFixed(1) + ' ') + Y(x[1]).toFixed(1);
      if (isNum(x[2])) dp += (dp ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x[2]).toFixed(1);
    });
    if (dk) SKT.svg.path(dk, { 'class': 'k' }, sv);
    if (dp) SKT.svg.path(dp, { 'class': 'p' }, sv);
    c.appendChild(sv);
    U.tip(c, 'King GEX king (gold steps) against the close (blue), last ' + n + ' sessions: ' + s.map(function (x) { return x[0] + ' ' + x[1]; }).join(' · '));
    return c;
  }
  function kdjChip(lab, x) {
    if (!x || !x[0]) return sp('kj na', lab + ' –');
    var ch = sp('kj k-' + x[0], lab + ' ' + (KDJL[x[0]] || x[0]));
    U.tip(ch, lab + ' KDJ ' + (KDJT[x[0]] || x[0]) + (isNum(x[1]) ? ', ' + x[1] + (x[1] === 1 ? ' bar' : ' bars') : '') + (x[2] ? ', from a washout' : ''));
    return ch;
  }
  function cKdj(e) {
    var c = el('div', 'bd-kdj'), k = e.r && e.r.kdj;
    if (!k) { c.appendChild(dash()); return c; }
    var l = el('div', 'v');
    l.appendChild(kdjChip('1W', k.w)); l.appendChild(kdjChip('2W', k.w2)); l.appendChild(kdjChip('1M', k.m));
    c.appendChild(l);
    if (e.side === 'C' && k.w && k.m && k.w[0] === 'gc' && k.m[0] === 'gc' && k.w[2] && k.m[2]) c.appendChild(sub('weekly + monthly golden cross from a washout', 'gold'));
    return c;
  }
  function cEarn(e) {
    var c = el('div', 'bd-earn'), p = earnParts(e);
    if (!p) { c.appendChild(dash()); return c; }
    c.appendChild(U.pill(p.t, p.cls, p.tip));
    if (p.s) c.appendChild(sub(p.s));
    return c;
  }
  function cWhy(e) {
    var c = el('div', 'bd-why'), st = e.st || {}, sd = e.side, why = e.why || st.why || '', ul = el('ul');
    if (!e.st) { c.appendChild(dash()); return c; }
    var ow = SKT.oneWords(st, sd, why === 'two-sided'), add = addOf(st, sd);
    var B = function (ok, t) { var li = el('li', ok ? 'ok' : 'no', (ok ? '✓ ' : '✕ ') + t); ul.appendChild(li); };
    if (ow) B(why !== 'two-sided', ow);
    if (isNum(st.pct)) B(why !== 'small vs its own book', 'net ' + F.spct(st.pct) + ' of its open interest');
    if (isNum(st.net)) B(why !== 'too few contracts', 'net ' + F.num(Math.abs(st.net)) + ' contracts');
    else if (isNum(add)) B(why !== 'too few contracts', F.num(add) + ' new ' + sideW(sd));
    if (st.cov) B(why !== 'not enough history yet', 'read on ' + st.cov[0] + ' of ' + st.cov[1] + ' sessions');
    B(!st.spr, st.spr ? 'a spread pair' : 'no spread pair');
    var known = ['two-sided', 'small vs its own book', 'too few contracts', 'not enough history yet', ''];
    if (known.indexOf(why) < 0 && ul.childNodes.length < 5) B(false, why);
    c.appendChild(ul);
    return c;
  }
  function cBiz(e, ctx) {
    var c = el('div', 'bd-biz'), b = bizParts(e.r);
    if (b.v == null) { c.appendChild(el('span', 'mut', b.word)); U.tip(c, b.tip); return c; }
    var l = el('div', 'v'); l.appendChild(el('b', 'b-' + b.band, String(b.v)));
    l.appendChild(U.meter(b.v, { w: 46 }));
    c.appendChild(l);
    c.appendChild(sub(b.word));
    U.tip(c, b.tip);
    return c;
  }
  function lensValTxt(e, lens) {
    var st = e.st || {}, r = e.r || {}, kt = r.kt, kg = r.kg, v = lensKey(e, lens);
    switch (lens) {
      case 'prem': return isNum(v) ? F.usd(v) : null;
      case 'rel': var rd = relDay(e); return rd == null ? null : F.pct(rd) + ' of a day';
      case 'far': return isNum(st.far) ? F.spct(e.side === 'P' ? -st.far : st.far, 0) + (isNum(st.fs) ? ' · ' + Math.abs(st.fs).toFixed(1) + 'σ' : '') + (isNum(st.tch) ? ' · ' + pc0(st.tch) + ' touch' : '') : null;
      case 'steady': return st.tilt && st.cov ? st.tilt[sI(e.side)] + ' of ' + st.cov[0] + ' days' : null;
      case 'day': return st.bd ? F.day(st.bd) : null;
      case 'sell': return (st.bs === 'sold' ? 'sold · ' : '') + (isNum(v) ? pc0(v) + ' at the bid' : '');
      case 'bz': return isNum(v) ? String(v) : null;
      case 'kd': return isNum(v) ? (Math.round(Math.abs(v) * 100) === 0 ? '' : v > 0 ? '+' : '−') + pc0(Math.abs(v)) + ' to ' + F.strike(kg[0]).replace('$', '') + (kg[6] ? ' (far)' : '') : null;
      case 'kz': return isNum(v) ? F.usd(v) + ' gamma' : null;
      case 'ks': return isNum(v) ? 'score ' + v.toFixed(1) : null;
      case 'sticky': return isNum(v) ? v + (v === 1 ? ' session' : ' sessions') : null;
      case 'kb': return isNum(v) ? F.sk(v) + ' added' : null;
      case 'mag': return isNum(v) ? v.toFixed(1) + 'σ' + (lensGroup(e, 'mag') ? ' (other side)' : '') : null;
      case 'pin': return kt ? (kt.st ? kt.st + ' · ' : '') + (isNum(kt.share) ? pc0(kt.share) + ' of the map' : '') : null;
      case 'match': case 'nmatch': case 'pmatch': return isNum(v) ? v.toFixed(1) : null;
    }
    return null;
  }
  function cLens(e, ctx) {
    var c = el('div', 'bd-lv'), t = lensValTxt(e, ctx.lens);
    c.appendChild(t ? el('b', null, t) : dash());
    return c;
  }

  function tF(e) { var tp = e.tp || {}; return e.side === 'P' ? tp.fP : tp.fC; }
  function cTPrice(e) { var c = el('div', 'bd-px'), tp = e.tp || {}; c.appendChild(isNum(tp.px) ? el('b', 'v', F.money(tp.px)) : dash()); return c; }
  function cTNew(e) {
    var c = el('div', 'bd-tn'), f = tF(e), tp = e.tp || {};
    if (!isNum(f)) { c.appendChild(dash()); return c; }
    c.appendChild(el('b', 'v ' + (e.side === 'P' ? 'down' : 'up'), '+' + F.k(f) + ' ' + sideW(e.side)));
    var o = e.side === 'P' ? tp.fC : tp.fP;
    if (isNum(o)) c.appendChild(sub('+' + F.k(o) + ' ' + sideW(e.side === 'P' ? 'C' : 'P')));
    U.tip(c, 'Where more contracts traded than were open that morning, the difference must be new');
    return c;
  }
  function cTBook(e) { var c = el('div', 'bd-tb'), f = tF(e), tp = e.tp || {}; c.appendChild(isNum(f) && tp.bk ? el('div', 'v', F.pct(f / tp.bk)) : dash()); if (tp.bk) c.appendChild(sub('of ' + F.k(tp.bk) + ' open')); return c; }
  function cTShare(e) {
    var c = el('div', 'bd-ts'), tp = e.tp || {}, f = tF(e), o = e.side === 'P' ? tp.fC : tp.fP, s = share(f, o);
    c.appendChild(s == null ? dash() : el('div', 'v', pc0(s)));
    if (s != null) c.appendChild(sub('of the new contracts'));
    return c;
  }
  function cTBig(e) {
    var c = el('div', 'bd-tbig'), tp = e.tp || {}, t = tp.top && tp.top[e.side] && tp.top[e.side][0];
    if (!t) { c.appendChild(dash()); return c; }
    c.appendChild(el('div', 'v', F.exp(t[0]) + ' ' + F.strike(t[1]) + (e.side === 'P' ? 'P' : 'C')));
    c.appendChild(sub('+' + F.k(t[2]) + ' new' + (t[5] && TAGW[t[5]] ? ' · ' + TAGW[t[5]] : '')));
    U.tip(c, F.k(t[3]) + ' traded against ' + F.k(t[4]) + ' open that morning');
    return c;
  }


  function C(k, cls, label, subl, cell, o) { var c = { k: k, cls: cls, label: label, sub: subl, cell: cell }; if (o) Object.keys(o).forEach(function (x) { c[x] = o[x]; }); return c; }
  function colsFor(ctx) {
    var hasEarn = ctx.hasEarn, lensCol = !ctx.simple && ctx.lens !== 'skew' && ctx.lens !== 'grp' && ctx.lens !== 'day' && LENS[ctx.lens];
    if (ctx.tape) {
      return [C('', 'c-rk', '#', '', cRank), C('stk', 'c-st', 'Stock', '', cStock), C('tpx', 'c-px', 'Price', 'close of that day', cTPrice),
        C('tnew', 'c-tn', 'Must be new', 'traded over the open', cTNew), C('tbk', 'c-tb', 'Of book', 'every open contract', cTBook),
        C('tsh', 'c-ts', 'Their share', 'of the new', cTShare), C('tbig', 'c-tbig', 'Biggest contract', 'and its last print', cTBig),
        C('held', 'c-held', 'Held C : P', 'open now', cHeld), C('king', 'c-king', 'King', 'this board\'s king node', cKing), C('biz', 'c-biz', 'Business', 'score', cBiz)];
    }
    if (ctx.compact) {
      return [C('', 'c-rk', '#', '', cRank), C('stk', 'c-st', 'Stock', '', cStock), C('usd', 'c-usd', 'Bet size', '$ opened', cUsd),
        C('bet', 'c-bet', 'Betting', 'main strike + date', cBet), C('str', 'c-str', 'One-sided', 'strength', cStrength),
        C('held', 'c-held', 'Held C : P', 'open now', cHeld), C('biz', 'c-biz', 'Business', 'score', cBiz)];
    }
    if (ctx.simple) {
      var s = [C('', 'c-rk', '#', '', cRank), C('stk', 'c-st', 'Stock', '', cStock), C('usd', 'c-usd', 'Bet size', '$ opened · contracts', cUsd),
        C('bet', 'c-bet', 'What they\'re betting', 'the main strike and date', cBet), C('str', 'c-str', 'How one-sided', 'vs every name read', cStrength),
        C('held', 'c-held', 'Calls : puts held', 'every open contract', cHeld), C('biz', 'c-biz', 'Business', 'score', cBiz)];
      if (hasEarn) s.push(C('earn', 'c-earn', 'Earnings', 'vs the main expiry', cEarn));
      s.push(C('px', 'c-px', 'Since then', 'price and move', cPrice));
      return s;
    }
    var f = [C('', 'c-rk', '#', '', cRank), C('stk', 'c-st', 'Stock', '', cStock)];
    if (lensCol) f.push(C('lv', 'c-lv', LENS[ctx.lens].l, 'the lens value', cLens));
    f.push(C('px', 'c-px', 'Price · since', 'close and move', cPrice), C('op', 'c-op', 'Opened C : P', 'added this window', cOpened),
      C('net', 'c-net', 'Net', 'of its book', cNet), C('build', 'c-bld', 'Build', 'lean side · expiries', cBuild),
      C('bet', 'c-bet', 'Betting', 'main strike + date', cBet), C('usd', 'c-usd', '$ opened', 'lean · other side', cUsd),
      C('str', 'c-str', 'Strength', 'vs every name read', cStrength), C('read', 'c-rd', 'Read', 'late prints', cRead),
      C('days', 'c-days hide6', ctx.w === '1d' ? 'vs its normal' : 'Days', ctx.w === '1d' ? 'last 10 · z' : 'each session', cDays),
      C('rk', 'c-rko hide4', 'Ranked on', 'windows', cRanked), C('held', 'c-held', 'Held C : P', 'open now', cHeld),
      C('trd', 'c-trd hide4', 'Traded', 'C : P this window', cTraded), C('shr', 'c-shr hide4', 'Vs shares', 'days of trading', cShares),
      C('gly', 'c-gly hide2', 'Where it went', '−60% … +60%', cGlyph), C('king', 'c-king', 'King', 'this board\'s king node', cKing),
      C('kh', 'c-kh hide2', 'King held', 'King GEX', cKHeld), C('setup', 'c-setup hide2', 'Setup', 'King GEX', cSetup),
      C('pile', 'c-pile hide2', 'Pile', 'King GEX', cPile), C('kvp', 'c-kvp hide2', 'King vs price', 'last 12', cKvp),
      C('kdj', 'c-kdj hide6', 'KDJ', '1W · 2W · 1M', cKdj));
    if (hasEarn) f.push(C('earn', 'c-earn', 'Earnings', 'vs the main expiry', cEarn));
    f.push(C('why', 'c-why hide2', 'Why it ranks', 'the checks', cWhy), C('biz', 'c-biz', 'Business', 'score', cBiz));
    return f;
  }
  function headRow(cols, onSort) {
    var tr = el('tr');
    cols.forEach(function (c) {
      var th = el('th', c.cls), on = (c.k || '') === (S.so || '');
      if (onSort) {
        var b = el('button', 'thb' + (on ? ' on' : ''));
        b.type = 'button';
        b.appendChild(sp('hl', c.label + (on && c.k ? (S.sd < 0 ? ' ▲' : ' ▼') : '')));
        if (c.sub) b.appendChild(sp('hs', c.sub));
        U.tip(b, c.k ? 'Sort by ' + (SORT_NAMES[c.k] || c.label.toLowerCase()) + (on ? ' (click again to flip)' : '') : 'Back to the ranking');
        b.addEventListener('click', function (ev) { ev.stopPropagation(); onSort(c.k || ''); });
        th.appendChild(b);
        if (on && c.k) th.setAttribute('aria-sort', S.sd < 0 ? 'ascending' : 'descending');
      } else { th.appendChild(sp('hl', c.label)); if (c.sub) th.appendChild(sp('hs', c.sub)); }
      tr.appendChild(th);
    });
    return tr;
  }
  function rowEl(e, cols, ctx) {
    var tr = el('tr', 'br' + (e.near ? ' near' : '') + (e.off ? ' off' : '') + (e.r && e.r.thin ? ' thin' : '') + (e.place != null && e.place <= 3 && !e.near && !e.off ? ' top3' : ''));
    tr.dataset.sym = e.sym; tr.tabIndex = 0;
    tr.setAttribute('aria-label', e.sym + (e.place != null && !e.near && !e.off ? ', #' + e.place : '') + ': open the name page');
    cols.forEach(function (c) {
      var td = el('td', c.cls);
      try { td.appendChild(c.cell(e, ctx)); } catch (err) { console.error('[skew board] cell ' + c.k, err); td.appendChild(dash()); }
      tr.appendChild(td);
    });
    return tr;
  }
  function cardEl(e, ctx) {
    var c = el('div', 'bd-card' + (e.near ? ' near' : '') + (e.off ? ' off' : '') + (e.r && e.r.thin ? ' thin' : '') + ' s-' + sideCls(e.side));
    c.dataset.sym = e.sym; c.tabIndex = 0;
    var cx = {}; Object.keys(ctx).forEach(function (k) { cx[k] = ctx[k]; }); cx.card = true;
    var st = e.st || {}, r = e.r || {};
    var top = el('div', 'cr1');
    top.appendChild(cRank(e, cx));
    var who = cStock(e, cx);
    var tagsN = who.querySelector('.bd-tags'), marksN = who.querySelector('.bd-marks');
    if (tagsN) who.removeChild(tagsN);
    if (marksN) who.removeChild(marksN);
    top.appendChild(who);
    var rt = el('div', 'cpx');
    if (e.w === 'tape') rt.appendChild(cTPrice(e));
    else {
      var pxl = el('div', 'v');
      if (isNum(r.px)) pxl.appendChild(el('b', null, F.money(r.px)));
      if (isNum(st.ret)) pxl.appendChild(sp('ret ' + moveCls(st.ret, e.side), ' ' + F.spct(st.ret)));
      rt.appendChild(pxl);
      if (isNum(st.pc)) { var sb = el('div', 'cstr'); if (isNum(st.tier)) sb.appendChild(U.dots(st.tier, { of: 3 })); sb.appendChild(U.bar(st.pc, { w: 40 })); U.tip(sb, strengthTip(e)); rt.appendChild(sb); }
      if (st.mv2) rt.appendChild(U.pill('already moving', 'amber'));
      if (H.live) safe('live', function () { var lv = H.live(e); if (lv) rt.appendChild(lv); });
    }
    top.appendChild(rt);
    c.appendChild(top);
    if (e.w === 'tape') {
      var tl = el('div', 'cl');
      tl.appendChild(cTNew(e)); tl.appendChild(cTBook(e)); tl.appendChild(cTShare(e));
      c.appendChild(tl);
      var tb = el('div', 'cl'); tb.appendChild(cTBig(e)); c.appendChild(tb);
    } else {
      var l2 = el('div', 'cl c2');
      var add = addOf(st, e.side);
      if (isNum(add)) { var bc = cBuild(e); l2.appendChild(bc); }
      var bp = betParts(e);
      if (bp) { var bt = el('div', 'cbet'); bt.appendChild(el('b', null, bp.l1)); if (bp.l2) bt.appendChild(sub(bp.l2)); U.tip(bt, bp.tip); l2.appendChild(bt); }
      if (l2.childNodes.length) c.appendChild(l2);
      if (e.st) {
        var bits = [];
        if (isNum(st.aC) || isNum(st.aP)) bits.push('+' + F.k(st.aC) + ' calls / +' + F.k(st.aP) + ' puts');
        if (isNum(st.pct)) bits.push(F.pct(Math.abs(st.pct), 0) + ' of its book');
        if (st.tilt && st.cov && e.w !== '1d') bits.push(st.tilt[sI(e.side)] + ' of ' + st.cov[0] + ' days');
        if (e.w === '1d' && isNum(st.z)) bits.push('z ' + zTxt(st.z));
        if (st.bs && st.bs !== 'unclear') bits.push(st.bs === 'bought' ? 'bought at the ask' : st.bs === 'sold' ? 'sold' : 'mixed');
        if (st.spr) bits.push('spread?');
        var prem = premOf(st, e.side);
        if (isNum(prem)) bits.push(F.usd(prem));
        if (bits.length) c.appendChild(el('div', 'cl c3', bits.join(' · ')));
        if (st.gb) { var g = el('div', 'cgly'); g.appendChild(glyphOf(st.gb, { w: 240, h: 30, full: true })); c.appendChild(g); }
      }
    }
    var duo = el('div', 'duo');
    var h = heldParts(e);
    if (h) {
      var bx = el('div', 'dbox' + (h.thin ? ' thin' : ''));
      var t = el('div', 'dt'); t.appendChild(sp('dk', 'Calls : puts held ')); t.appendChild(el('b', h.cls, ratioTxt(h.c, h.p)));
      if (h.mv != null) t.appendChild(sp('hmv ' + (h.mv > 0 ? 'up' : h.mv < 0 ? 'down' : 'mut'), ' · ' + (WL[e.w] || '') + ' ' + mvTxt(h.mv)));
      bx.appendChild(t);
      var sbw = el('div', 'sbw'); sbw.appendChild(U.splitBar(h.c, h.p, { mid: true, tick: h.s0, thin: h.thin, cls: 'wide' })); bx.appendChild(sbw);
      U.tip(bx, h.tip);
      duo.appendChild(bx);
    }
    var b = bizParts(r);
    var bz = el('div', 'dbox');
    var bt2 = el('div', 'dt'); bt2.appendChild(sp('dk', 'Business ')); bt2.appendChild(el('b', b.band ? 'b-' + b.band : 'mut', b.v == null ? b.word : b.v + ' ' + b.word));
    bz.appendChild(bt2);
    if (b.v != null) bz.appendChild(U.meter(b.v, { cls: 'wide' }));
    U.tip(bz, b.tip);
    duo.appendChild(bz);
    if (e.w === '1d') {
      var tv = trdParts(e);
      if (tv) { var tx = el('div', 'dbox' + (tv.thin ? ' thin' : '')); var t3 = el('div', 'dt'); t3.appendChild(sp('dk', 'Today traded ')); t3.appendChild(el('b', null, tv.t.split(' · ')[0])); tx.appendChild(t3); duo.appendChild(tx); }
    }
    c.appendChild(duo);
    if (e.w !== 'tape' && !ctx.simple) {
      var ex = el('div', 'cl cx');
      var k = kingParts(e);
      if (k && k.k) ex.appendChild(sp('ck', 'King ' + k.k + (isNum(k.dist) ? ' ' + F.spct(k.dist) : '') + (k.onSide ? ' ✓' : '')));
      if (r.kdj) { ex.appendChild(kdjChip('1W', r.kdj.w)); ex.appendChild(kdjChip('1M', r.kdj.m)); }
      var ep = earnParts(e);
      if (ep) ex.appendChild(U.pill(ep.t + (ep.s ? ' · ' + ep.s : ''), ep.cls, ep.tip));
      if (ex.childNodes.length) c.appendChild(ex);
    } else if (ctx.simple && e.w !== 'tape') {
      var ep2 = earnParts(e);
      if (ep2) { var ee = el('div', 'cl cx'); ee.appendChild(U.pill(ep2.t + (ep2.s ? ' · ' + ep2.s : ''), ep2.cls, ep2.tip)); c.appendChild(ee); }
    }
    var tg = tagsOf(e).slice(0, 2);
    if (tg.length) { var tl2 = el('div', 'bd-tags'); tg.forEach(function (x) { tl2.appendChild(U.pill(x.t, x.cls || '', x.tip)); }); c.appendChild(tl2); }
    if (marksN) c.appendChild(marksN);
    if (e.w !== 'tape' && e.st && !e.off) {
      var cells = dayCellsOf(e);
      if (cells.length) { var ds = el('div', 'cdays'); ds.appendChild(U.dayCells(cells, { onPick: function (d) { openName(e.sym, d); } })); c.appendChild(ds); }
    }
    return c;
  }


  var lastLayout = '';
  function ctxOf() {
    var simple = S.lx !== 'full', w = S.w;
    var ctx = { w: w, side: S.side, list: S.list, lens: S.lens, dir: S.dir, simple: simple, tape: w === 'tape', both: S.side === 'B', card: false, nSide: { C: 0, P: 0 } };
    return ctx;
  }
  function anyEarn(rows) { return rows.some(function (e) { return !!(ecOf(e) || ernOf(e)); }); }


  function renderHero() {
    var box = $('hero');
    if (!box) return;
    box.textContent = '';
    var w = S.w, W = winOf(w), list = S.list, tape = w === 'tape';
    var h1 = el('h1', 'bd-h1', SKT.W(S.side).h1);
    box.appendChild(h1);
    var now = tape && D.tape ? 'Traded ' + F.day(D.tape.T) + ', not settled yet: ' + F.num((D.tape.C || []).length) + ' names where calls must be new, ' + F.num((D.tape.P || []).length) + ' where puts must be new.' : W && W.now;
    if (now) box.appendChild(el('p', 'bd-now', now));

    var hf = withF({ show: '', f: new Set(), ten: '', od: 0, q: '', cf: null });
    var eC = entries(w, 'C', list, hf), eP = entries(w, 'P', list, hf);
    var big = el('div', 'bd-big');
    [['C', eC], ['P', eP]].forEach(function (x) {
      var b = el('button', 'bd-bn s-' + sideCls(x[0]) + (S.side === x[0] ? ' on' : ''));
      b.type = 'button';
      b.appendChild(el('b', 'n', F.num(x[1].length)));
      b.appendChild(el('span', 'k', tape ? (x[0] === 'C' ? 'with calls that must be new' : 'with puts that must be new') : SKT.W(x[0]).lean + (x[0] === 'C' ? ' · ' + (WL[w] || w) : '')));
      U.tip(b, 'Show the ' + (x[0] === 'C' ? 'call' : 'put') + ' list');
      b.addEventListener('click', function () { go({ side: x[0] }); });
      big.appendChild(b);
    });
    var pool = S.side === 'P' ? eP : S.side === 'C' ? eC : eC.concat(eP), top = null, tv = -1;
    pool.forEach(function (e) {
      var v = tape ? tF(e) : e.st && isNum(e.st.net) ? Math.abs(e.st.net) : null;
      if (isNum(v) && v > tv) { tv = v; top = e; }
    });
    if (top) {
      var bb = el('button', 'bd-bn x');
      bb.type = 'button';
      bb.appendChild(el('span', 'k', tape ? 'Biggest must-be-new' : 'Biggest build'));
      var line = el('span', 'bv');
      line.appendChild(el('b', null, top.sym));
      if (tape) txt(line, ' +' + F.k(tF(top)) + ' ' + sideW(top.side));
      else {
        var st = top.st, pr = premOf(st, top.side);
        txt(line, ' ' + F.sk(st.net).replace('−', '+') + ' ' + sideW(top.side) + (isNum(pr) ? ' · ' + F.usd(pr) : '') + (isNum(st.pct) ? ' · ' + F.pct(Math.abs(st.pct), 0) + ' of its book' : ''));
      }
      bb.appendChild(line);
      U.tip(bb, 'The shown name with the biggest net build; open its page');
      bb.addEventListener('click', function () { openName(top.sym); });
      big.appendChild(bb);
    }
    box.appendChild(big);
    var tiles = heroTiles(S.side === 'B' ? eC.concat(eP) : S.side === 'P' ? eP : eC);
    if (tiles.length) {
      var tb = el('div', 'bd-tiles');
      tiles.forEach(function (t, i) {
        var d = el('div', 'bd-tile' + (t.cls ? ' ' + t.cls : '') + (i >= 4 ? ' t-more' : '') + (t.on ? ' act' : ''));
        if (t.on) {
          d.setAttribute('role', 'button'); d.tabIndex = 0;
          d.addEventListener('click', t.on);
          d.addEventListener('keydown', function (ev) { if (ev.target === d && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); t.on(); } });
        }
        d.appendChild(el('span', 't', t.t));
        var v = el('span', 'v');
        if (t.v instanceof Node) v.appendChild(t.v); else v.textContent = t.v;
        d.appendChild(v);
        if (t.s) { var s = el('span', 's'); if (t.s instanceof Node) s.appendChild(t.s); else s.textContent = t.s; d.appendChild(s); }
        if (t.tip) U.tip(d, t.tip);
        tb.appendChild(d);
      });
      box.appendChild(tb);
    }
  }
  function symLinks(syms, max) {
    var s = el('span', 'tks');
    syms.slice(0, max).forEach(function (sym, i) {
      if (i) txt(s, ' · ');
      var b = el('button', 'tkb', sym); b.type = 'button';
      b.addEventListener('click', function (ev) { ev.stopPropagation(); openName(sym); });
      s.appendChild(b);
    });
    if (syms.length > max) txt(s, ' +' + (syms.length - max));
    return s;
  }
  function toggleF(k) { var f = new Set(S.f); if (f.has(k)) f.delete(k); else f.add(k); go({ f: f }); }
  function heroTiles(rows) {
    var out = [], w = S.w, W = winOf(w) || {};
    if (w !== 'tape') {
      var nw = rows.filter(function (e) { return e.st && e.st.r && e.st.pr == null; });
      out.push({ t: 'New this window', v: F.num(nw.length), s: nw.length ? symLinks(nw.map(function (e) { return e.sym; }), 4) : 'none', tip: 'Ranked now, not on the list at the previous settle. Click to filter.', on: function () { toggleF('new'); } });
      if (rows.some(function (e) { return e.st && e.st.nl != null; })) {
        var nl = rows.filter(function (e) { return e.st && e.st.nl > 0; }).sort(function (a, b) { return b.st.nl - a.st.nl; });
        var tot = nl.reduce(function (a, e) { return a + e.st.nl; }, 0);
        out.push({ t: 'Brand-new lines', v: F.num(tot), s: nl.length ? 'across ' + F.num(nl.length) + (nl.length === 1 ? ' name' : ' names') : 'none',
          tip: 'Contracts on the lean side that barely existed at the window start, added up over the shown names' + (nl.length ? ' (most: ' + nl.slice(0, 3).map(function (e) { return e.sym + ' ' + e.st.nl; }).join(', ') + ')' : '') });
      }
      var loud = rows.filter(function (e) { return loudOf(e).length; });
      if (rows.some(function (e) { return e.r && e.r.ld; }) || loud.length) out.push({ t: 'One-sided and loud', v: F.num(loud.length), s: loud.length ? symLinks(loud.map(function (e) { return e.sym; }), 4) : 'none', tip: 'Shown names with a Loud Calls / Loud Puts event of their side inside the window' });
      if (rows.some(function (e) { return e.r && isNum(e.r.biz); })) {
        var q = rows.filter(function (e) { return SKT.biz(e.r && e.r.biz).band === 'hi'; });
        out.push({ t: 'Business 70+', v: F.num(q.length), s: q.length ? symLinks(q.map(function (e) { return e.sym; }), 5) : 'none', tip: 'Shown names with a strong business score. Click to filter.', on: function () { toggleF('q'); } });
      }
      var wn = {};
      (S.side === 'B' ? ['C', 'P'] : [S.side]).forEach(function (sd) { var x = W.why_n && W.why_n[sd]; if (x) Object.keys(x).forEach(function (k) { wn[k] = (wn[k] || 0) + x[k]; }); });
      var wk = Object.keys(wn).sort(function (a, b) { return wn[b] - wn[a]; }).slice(0, 4);
      if (wk.length) out.push({ t: 'Why names drop out', v: wk[0], s: wk.map(function (k) { return k + ' ' + F.num(wn[k]); }).join(' · '), tip: 'Names read ' + wWord(w) + ' that did not rank, by the first check they missed (every list)' });
      if (H.tiles) safe('home tiles', function () { (H.tiles(rows) || []).forEach(function (t) { out.push(t); }); });
    }
    (D.pinned || []).forEach(function (sym) { var t = refTile(sym); if (t) out.push(t); });
    return out;
  }




  var REF_WHY = ['thin book', 'low-priced stock', 'no reading for this day', 'not enough history yet', 'no new positions', 'two-sided',
    'opens and net disagree', 'that side closed, not opened', 'too few contracts', 'small vs its own book', 'mostly a newly listed expiry',
    'mostly deep in the money', 'illiquid underlying', 'leveraged or inverse fund'];
  var REF_GATES = ['book', 'price', 'reading', 'history', 'none', 'two', 'disagree', 'closed', 'size', 'share', 'newexp', 'deep', 'illiquid', 'lev'];
  var refAsked = {};
  function refWhy(sym, w) {
    var nf = SKT.nameFileNow ? SKT.nameFileNow(sym) : undefined, key = sym + '|' + (D.generated || '');
    if (nf === undefined) {
      if (!refAsked[key]) {
        refAsked[key] = 1;
        setTimeout(function () { SKT.nameFile(sym).then(function (j) { if (j && !S.open && D === SKT.D) safe('hero', renderHero); }); }, 1500);
      }
      return null;
    }
    var ch = nf && nf.checks && nf.checks[w];
    if (!ch) return null;
    for (var i = 0; i < ch.length; i++) {
      if (ch[i] && !ch[i][1]) { var gi = REF_GATES.indexOf(ch[i][0]); return gi >= 0 ? REF_WHY[gi] : null; }
    }
    return null;
  }
  function refTile(sym) {
    var r = SKT.row(sym), w = S.w === 'tape' ? '1w' : S.w, st = r && r.w && r.w[w], v, s = '';
    var off = !(D.rows && D.rows[sym]) && !SKT.SEARCH;
    if (st && st.r) {
      v = '#' + st.r + ' ' + sideW(st.side) + ' ' + WL[w];
      var a = addOf(st, st.side), p = premOf(st, st.side);
      s = (isNum(a) ? '+' + F.k(a) + ' ' + sideW(st.side) : '') + (isNum(p) ? ' · ' + F.usd(p) : '');
    } else {
      var why = st && st.why ? st.why : off ? refWhy(sym, w) : null;
      v = 'not ranked';
      s = 'not ranked on ' + WL[w] + (why ? ': ' + why : st || off ? '' : ': no reading');
    }
    if (r && r.cd) s = (s ? s + ' · ' : '') + 'OI ' + F.dayShort(r.cd);
    var line = el('span'); line.appendChild(el('b', null, sym)); txt(line, ' · ' + v);
    return { t: 'Reference', v: line, s: s, cls: 'ref', tip: 'A name always tracked for reference; open its page', on: function () { openName(sym); } };
  }


  var leftOpen = '';
  function renderLeft() {
    var box = $('leftLine');
    if (!box) return;
    box.textContent = '';
    if (S.w === 'tape' || S.show === 'out') return;
    var W = winOf(S.w);
    if (!W) return;
    var line = el('div', 'bd-left'), sides = S.side === 'B' ? ['C', 'P'] : [S.side], items = [];
    sides.forEach(function (sd) { ((W.left && W.left[sd]) || []).forEach(function (x) { if (SKT.inList(x[0], S.list) && cfOk(x[0])) items.push([x[0], x[1], sd]); }); });
    var prev = (SKT.VIEWS && SKT.VIEWS.prev) || ((D.sessions || []).length > 1 ? D.sessions[D.sessions.length - 2][0] : null);
    if (items.length) {
      var p = el('p', 'lft');
      txt(p, 'Left the ' + (WL[S.w] || S.w) + ' ' + (S.side === 'B' ? '' : sideW(S.side) + ' ') + 'list' + (prev ? ' since ' + F.dayShort(prev) : '') + ': ');
      items.slice(0, 12).forEach(function (x, i) {
        if (i) txt(p, ' · ');
        var b = el('button', 'tkb', x[0]); b.type = 'button';
        U.tip(b, (S.side === 'B' ? (x[2] === 'C' ? 'calls: ' : 'puts: ') : '') + 'now: ' + x[1]);
        b.addEventListener('click', function () { openName(x[0]); });
        p.appendChild(b);
      });
      if (items.length > 12) txt(p, ' +' + (items.length - 12) + ' more');
      line.appendChild(p);
    }
    var btns = el('div', 'lb');
    var V = SKT.VIEWS, mvN = null, kmN = null;
    var nw = entries(S.w, S.side, S.list).filter(function (e) { return e.st && e.st.r && e.st.pr == null; });
    if (V && V.movers && V.movers[S.w]) { mvN = 0; sides.forEach(function (sd) { (V.movers[S.w][sd] || []).forEach(function (x) { if (SKT.inList(x[0], S.list)) mvN++; }); }); }
    if (V && V.kmv && V.kmv[S.w]) { kmN = 0; sides.forEach(function (sd) { (V.kmv[S.w][sd] || []).forEach(function (x) { if (SKT.inList(x[0], S.list)) kmN++; }); }); }
    if (!V) idleViews();
    var mb = el('button', 'bd-lbtn' + (leftOpen === 'mov' ? ' on' : ''), 'Movers' + (mvN != null ? ' · ' + F.num(mvN) : ''));
    mb.type = 'button'; mb.setAttribute('aria-expanded', leftOpen === 'mov' ? 'true' : 'false');
    U.tip(mb, 'Names new this window and the biggest climbers since the previous settle');
    mb.addEventListener('click', function () { leftOpen = leftOpen === 'mov' ? '' : 'mov'; needViews(); renderLeft(); });
    btns.appendChild(mb);
    var kb = el('button', 'bd-lbtn' + (leftOpen === 'kmv' ? ' on' : ''), 'King moved' + (kmN != null ? ' · ' + F.num(kmN) : ''));
    kb.type = 'button'; kb.setAttribute('aria-expanded', leftOpen === 'kmv' ? 'true' : 'false');
    U.tip(kb, 'The strike with the most call gamma moved since the previous settle (King GEX king when it has one, else this board\'s king node).');
    kb.addEventListener('click', function () { leftOpen = leftOpen === 'kmv' ? '' : 'kmv'; needViews(); renderLeft(); });
    btns.appendChild(kb);
    line.appendChild(btns);
    box.appendChild(line);
    if (leftOpen) box.appendChild(leftPanel(leftOpen, nw, sides));
  }
  var viewsBusy = false, viewsIdle = null;
  function idleViews() {
    var g = (D && D.generated) || 'x';
    if (SKT.VIEWS || viewsIdle === g) return;
    viewsIdle = g;
    var go2 = function () { needViews(); };
    if (window.requestIdleCallback) window.requestIdleCallback(go2, { timeout: 4000 }); else setTimeout(go2, 1500);
  }
  function needViews() {
    if (SKT.VIEWS || viewsBusy) return;
    viewsBusy = true;
    SKT.loadViews().then(function () { viewsBusy = false; if (!S.open) safe('left', renderLeft); }, function () { viewsBusy = false; if (!S.open) safe('left', renderLeft); });
  }
  function pillBtn(sym, label, tip) {
    var b = el('button', 'bd-pb'); b.type = 'button';
    b.appendChild(el('b', null, sym));
    if (label) txt(b, ' ' + label);
    if (tip) U.tip(b, tip);
    b.addEventListener('click', function () { openName(sym); });
    return b;
  }
  function leftPanel(kind, nw, sides) {
    var p = el('div', 'bd-panel'), V = SKT.VIEWS;
    if (kind === 'mov') {
      if (nw.length) {
        p.appendChild(el('div', 'ph', 'New this window · ' + nw.length));
        var g = el('div', 'pg');
        nw.forEach(function (e) { g.appendChild(pillBtn(e.sym, '#' + e.st.r, sideW(e.side) + ', ranked #' + e.st.r + ', not on the list at the previous settle')); });
        p.appendChild(g);
      }
      if (!V) { p.appendChild(el('p', 'mut', viewsBusy ? 'Loading the climbers…' : 'Climbers could not be loaded.')); return p; }
      var cl = [];
      sides.forEach(function (sd) { (((V.movers || {})[S.w] || {})[sd] || []).forEach(function (x) { if (x[1] != null && SKT.inList(x[0], S.list)) cl.push(x.concat([sd])); }); });
      p.appendChild(el('div', 'ph', 'Climbed since the previous settle · ' + cl.length));
      var g2 = el('div', 'pg');
      cl.forEach(function (x) { g2.appendChild(pillBtn(x[0], '#' + x[1] + ' → #' + x[2], sideW(x[3]) + ': #' + x[1] + ' at the previous settle, #' + x[2] + ' now')); });
      if (!cl.length) g2.appendChild(el('span', 'mut', 'none'));
      p.appendChild(g2);
      return p;
    }
    if (!V) { p.appendChild(el('p', 'mut', viewsBusy ? 'Loading…' : 'Could not be loaded.')); return p; }
    var km = [];
    sides.forEach(function (sd) { (((V.kmv || {})[S.w] || {})[sd] || []).forEach(function (x) { if (SKT.inList(x[0], S.list)) km.push(x); }); });
    p.appendChild(el('div', 'ph', 'King moved · ' + km.length));
    var g3 = el('div', 'pg');
    km.forEach(function (x) { g3.appendChild(pillBtn(x[0], F.strike(x[1]).replace('$', '') + ' → ' + F.strike(x[2]).replace('$', '') + (x[3] ? ' (' + F.dayShort(x[3]) + ')' : ''), 'King moved from ' + F.strike(x[1]) + ' to ' + F.strike(x[2]) + (x[3] ? ' on ' + F.day(x[3]) : ''))); });
    if (!km.length) g3.appendChild(el('span', 'mut', 'none'));
    p.appendChild(g3);
    return p;
  }


  function renderSide() {
    var box = $('sideRow');
    if (!box) return;
    box.textContent = '';
    var nC = entries(S.w, 'C', S.list).length, nP = entries(S.w, 'P', S.list).length;
    box.appendChild(U.seg([
      { k: 'C', label: '▲ Calls', short: '▲ Calls', n: nC, cls: 'c', tip: SKT.W('C').head },
      { k: 'P', label: '▼ Puts', short: '▼ Puts', n: nP, cls: 'p', tip: SKT.W('P').head },
      { k: 'B', label: 'Both', short: 'Both', n: nC + nP, tip: 'Calls and puts together, each with its own rank' }
    ], S.side, function (k) { go({ side: k }); }, { aria: 'Side', cls: 'bd-side' }));
  }
  function wlAvail() { return !!((D.lists && D.lists.wl) || (SKT.LAN && SKT.LAN.lists && SKT.LAN.lists.wl)); }
  function renderLists() {
    var box = $('listRow');
    if (!box) return;
    box.textContent = '';
    var groups = [['all', 'spx', 'ndx', 'combo', 'ai'], ['r1', 'r2', 'etf']];
    if (wlAvail()) groups[1].push('wl');
    var byK = {}; SKT.LISTS.forEach(function (x) { byK[x.k] = x; });
    groups.forEach(function (g, gi) {
      var items = g.map(function (k) {
        var x = byK[k] || { k: k, label: k }, n = entries(S.w, S.side, k).length;
        var avail = k === 'all' || (D.lists && D.lists[k]) || (k === 'wl' && wlAvail());
        var it = { k: k, label: x.label, short: x.short, n: avail ? (n || (S.list === k ? 0 : '–')) : '–', off: !avail || (!n && S.list !== k), tip: listTip(k) };
        return it;
      });
      box.appendChild(U.chips(items, S.list, function (k) { go({ list: k }); }, { aria: gi ? 'More lists' : 'List', cls: 'bd-lists' + (gi ? ' g2' : '') }));
    });
    var cov = D.lists_cov && D.lists_cov[S.list];
    if (S.list !== 'all' && cov && cov.length >= 3) {
      var lab = (byK[S.list] || {}).label || S.list;
      box.appendChild(el('p', 'bd-lnote', lab + ': ' + F.num(cov[1]) + ' of ' + F.num(cov[0]) + ' members tracked · ' + F.num(cov[2]) + ' with a chain on the ' + F.dayShort(D.latest) + ' settle'));
    }
  }
  function listTip(k) {
    var cov = D.lists_cov && D.lists_cov[k];
    var t = { all: 'Every tracked name', spx: 'S&P 500 members', ndx: 'Nasdaq-100 members', combo: 'S&P 500 + Nasdaq-100 together', ai: 'AI companies (the AI theme lists)',
      r1: 'Russell 1000 members', r2: 'Russell 2000 members', etf: 'Exchange-traded funds', wl: 'Watchlist 1' }[k] || k;
    return t + (cov ? ' · ' + F.num(cov[1]) + ' of ' + F.num(cov[0]) + ' tracked' : '');
  }


  function renderLens() {
    var box = $('lensRow');
    if (!box) return;
    var def = $('lensDef');
    Array.prototype.slice.call(box.childNodes).forEach(function (n) { if (n !== def) box.removeChild(n); });
    if (!def) { def = el('p', 'lensdef'); def.id = 'lensDef'; box.appendChild(def); }
    def.textContent = '';
    if (S.w === 'tape' || S.an) return;
    var simple = S.lx !== 'full', frag = document.createDocumentFragment();
    var pick = function (k) { if (k === S.lens) go({ dir: -S.dir }); else go({ lens: k, dir: 1 }); };
    var lab = function (k) { return (simple && LENS[k].simple) || LENS[k].l; };
    var arrow = function (k) { return k === S.lens && S.dir < 0 ? ' ▲' : ''; };
    if (cardMode()) {
      var keys = simple ? SKT.SIMPLE_LENSES : BUILD_LENSES.concat(KING_LENSES.filter(function (k) { return k !== 'nmatch' || S.side === 'P' || S.lens === k; }));
      var wrap = el('div', 'bd-lensp');
      wrap.appendChild(U.select(keys.map(function (k) { return { k: k, label: (KING_LENSES.indexOf(k) >= 0 ? 'King · ' : '') + lab(k) }; }), S.lens, function (v) { go({ lens: v, dir: 1 }); }, { label: 'Rank by', aria: 'Rank by' }));
      var fl = el('button', 'chip bd-flip', S.dir < 0 ? '▲ reversed' : '▼ in order'); fl.type = 'button';
      U.tip(fl, 'Flip the order');
      fl.addEventListener('click', function () { go({ dir: -S.dir }); });
      wrap.appendChild(fl);
      frag.appendChild(wrap);
    } else {
      var bl = simple ? SKT.SIMPLE_LENSES : BUILD_LENSES;
      frag.appendChild(U.chips(bl.map(function (k) { return { k: k, label: lab(k) + arrow(k), tip: lensDef(k, S.side) + (k === S.lens ? ' Click again to flip.' : '') }; }), S.lens, pick, { label: 'Rank by', aria: 'Rank by', cls: 'bd-lens' }));
      if (!simple) {
        var kl = KING_LENSES.filter(function (k) { return k !== 'nmatch' || S.side === 'P' || S.lens === k; });
        var kc = U.chips(kl.map(function (k) { return { k: k, label: LENS[k].l + arrow(k), tip: lensDef(k, S.side) + (k === S.lens ? ' Click again to flip.' : '') }; }), S.lens, pick, { label: 'King', aria: 'King lenses', cls: 'bd-lens king' });
        frag.appendChild(kc);
      }
    }
    box.insertBefore(frag, def);
    def.appendChild(document.createTextNode(lensDef(S.lens, S.side)));
    if (KING_LENSES.indexOf(S.lens) >= 0 || !simple) {
      var lk = el('span', 'bd-kglinks');
      txt(def, ' ');
      [['skew', '→ Skew × King on King GEX'], ['pile', '→ Skew × Pile']].forEach(function (x, i) {
        if (i) txt(lk, ' · ');
        var a = el('a', null, x[1]); a.href = H.kgBase + SKT.kgHash(x[0]); a.target = '_blank'; a.rel = 'noopener';
        lk.appendChild(a);
      });
      def.appendChild(lk);
    }
  }


  var drawerOpen = false;
  function renderShow() {
    var box = $('showRow');
    if (!box) return;
    box.textContent = '';
    if (S.w === 'tape' || S.an) return;
    var W = winOf(S.w) || {}, nOut = 0;
    (S.side === 'B' ? ['C', 'P'] : [S.side]).forEach(function (sd) { ((W.X && W.X[sd]) || []).forEach(function (x) { if (SKT.inList(x[0], S.list) && cfOk(x[0]) && matchQ(x[0], SKT.row(x[0]))) nOut++; }); });
    var cnt = function (show) { return entries(S.w, S.side, S.list, withF({ show: show })).length; };
    box.appendChild(U.chips([
      { k: '', label: 'All ranked', n: cnt(''), tip: 'Every ranked name' },
      { k: 'b', label: 'Bought', n: cnt('b'), tip: READ_TIP.bought },
      { k: 'm', label: 'Mixed & spreads', n: cnt('m'), tip: 'Read as mixed or unclear, or built as a spread' },
      { k: 's', label: 'Sold', n: cnt('s'), tip: 'Sellers opened them: call writing on the calls side, put selling on the puts side' },
      { k: 'out', label: 'Left out', n: nOut, tip: 'Big one-sided builds that did not rank, with the reason' }
    ], S.show, function (k) { go({ show: k }); }, { label: 'Show', aria: 'Show', cls: 'bd-show' }));
    if (S.show === 'out') return;
    var nItems = narrowItems();
    var active = (S.f ? Array.from(S.f).filter(function (k) { return offered[k]; }).length : 0) + (S.ten ? 1 : 0) + (S.od ? 1 : 0);
    if (cardMode()) {
      box.appendChild(U.drawer('Filters', function () {
        var f = document.createDocumentFragment();
        if (nItems.length) f.appendChild(U.chips(nItems, S.f, toggleNarrow, { aria: 'Narrow', cls: 'bd-narrow' }));
        f.appendChild(selectsEl());
        return f;
      }, { n: active, open: drawerOpen, onToggle: function (o) { drawerOpen = o; }, cls: 'bd-drawer' }));
    } else {
      if (nItems.length) box.appendChild(U.chips(nItems, S.f, toggleNarrow, { label: 'Narrow', aria: 'Narrow', cls: 'bd-narrow' }));
      box.appendChild(selectsEl());
    }
  }
  function toggleNarrow(k) { toggleF(k); }
  function narrowItems() {
    return narrowList().filter(function (c) { return offered[c.k] || (S.f && S.f.has(c.k)); }).map(function (c) {
      var f = new Set(S.f); f.add(c.k);
      var n = offered[c.k] ? entries(S.w, S.side, S.list, withF({ f: f })).length : 0;
      return { k: c.k, label: c.label, n: n, tip: c.tip, off: !offered[c.k] && !(S.f && S.f.has(c.k)) };
    });
  }
  function selectsEl() {
    var w = el('div', 'bd-sels');
    w.appendChild(U.select([{ k: '', label: 'Any' }, { k: 'm1', label: 'Up to 1 month' }, { k: 'm6', label: '1-6 months' }, { k: 'y1', label: '6-12 months' }, { k: 'y1p', label: '1 year+' }],
      S.ten, function (v) { go({ ten: v }); }, { label: 'Expiry', aria: 'Expiry of most new contracts' }));
    w.appendChild(U.select([{ k: '0', label: 'Any' }, { k: '10', label: '10%+' }, { k: '25', label: '25%+' }, { k: '50', label: '50%+' }],
      String(S.od || 0), function (v) { go({ od: +v }); }, { label: 'Distance', aria: 'Distance of most new contracts from the price' }));
    return w;
  }


  var SB = null;
  function searchHits(q) {
    var toks = qTokens(q);
    if (!toks.length) return [];
    var seen = {}, out = [];
    var add = function (sym, r) {
      if (seen[sym]) return;
      var ns = norm(sym), nm = r && r.nm ? unent(r.nm).toLowerCase() : '', best = 9;
      toks.forEach(function (t) {
        var nt = norm(t);
        if (nt && ns === nt) best = Math.min(best, 0);
        else if (nt && ns.indexOf(nt) === 0) best = Math.min(best, 1);
        else if (t.length >= 3 && nm.indexOf(t.toLowerCase()) >= 0) best = Math.min(best, 2);
      });
      if (best < 9) { seen[sym] = 1; out.push([best, sym, r]); }
    };
    Object.keys(D.rows || {}).forEach(function (s) { add(s, D.rows[s]); });
    if (SKT.SEARCH && SKT.SEARCH.rows) Object.keys(SKT.SEARCH.rows).forEach(function (s) { add(s, SKT.SEARCH.rows[s]); });
    out.sort(function (a, b) { return (a[0] - b[0]) || (a[1].length - b[1].length) || (a[1] < b[1] ? -1 : 1); });
    return out;
  }
  function statusTxt(sym, r) {
    var w = S.w === 'tape' ? '1w' : S.w, st = r && r.w && r.w[w];
    if (st && st.r) return '#' + st.r + ' ' + sideW(st.side) + ' ' + WL[w];
    return 'not ranked on ' + WL[w] + (st && st.why ? ': ' + st.why : st ? '' : ' (no reading)');
  }
  function searchBox() {
    if (SB) return SB;
    var wrap = el('div', 'bd-search'), input = el('input', 'bd-q'), dd = el('div', 'bd-sdd');
    input.type = 'search'; input.placeholder = 'Find a stock: ticker or name'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('autocapitalize', 'characters'); input.setAttribute('aria-label', 'Find a stock'); input.setAttribute('enterkeyhint', 'go');
    dd.hidden = true; dd.setAttribute('role', 'listbox');
    wrap.appendChild(input); wrap.appendChild(dd);
    var tmr = null, sel = -1, cur = [];
    function fill() {
      dd.textContent = '';
      cur = S.q ? searchHits(S.q).slice(0, 14) : [];
      if (!cur.length || document.activeElement !== input) { dd.hidden = true; return; }
      cur.forEach(function (h, i) {
        var b = el('button', 'sh' + (i === sel ? ' on' : '')); b.type = 'button'; b.setAttribute('role', 'option');
        b.appendChild(el('b', null, h[1]));
        b.appendChild(sp('nm', unent((h[2] && h[2].nm) || '')));
        b.appendChild(sp('st', statusTxt(h[1], h[2])));
        b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        b.addEventListener('click', function () { dd.hidden = true; openName(h[1]); });
        dd.appendChild(b);
      });
      dd.hidden = false;
    }
    SB = { wrap: wrap, input: input, fill: fill };
    input.addEventListener('input', function () {
      clearTimeout(tmr);
      if (!SKT.SEARCH) SKT.loadSearch().then(function () { if (S.q) { fill(); refreshList(); } }, function () {});
      tmr = setTimeout(function () { S.q = input.value.trim(); sel = -1; fill(); refreshList(); }, 120);
    });
    input.addEventListener('focus', fill);
    input.addEventListener('blur', function () { setTimeout(function () { dd.hidden = true; }, 150); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!cur.length) return;
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + cur.length) % cur.length;
        fill();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(tmr); S.q = input.value.trim();
        var hs = searchHits(S.q), q0 = norm(qTokens(S.q)[0] || ''), pickS = sel >= 0 && cur[sel] ? cur[sel][1] : null;
        if (!pickS) hs.some(function (h) { if (norm(h[1]) === q0) { pickS = h[1]; return true; } return false; });
        if (!pickS && hs.length) pickS = hs[0][1];
        if (pickS) { dd.hidden = true; openName(pickS); }
      } else if (e.key === 'Escape') {
        input.value = ''; S.q = ''; sel = -1; dd.hidden = true; refreshList();
      }
    });
    return SB;
  }
  function refreshList() { if (SKT.D && !S.open) { D = SKT.D; renderBoardOnly(); } }
  function renderSearch() {
    var box = $('searchRow');
    if (!box) return;
    var sb = searchBox();
    Array.prototype.slice.call(box.childNodes).forEach(function (n) { if (n !== sb.wrap) box.removeChild(n); });
    if (sb.wrap.parentNode !== box) box.insertBefore(sb.wrap, box.firstChild);
    if (document.activeElement !== sb.input && sb.input.value !== (S.q || '')) sb.input.value = S.q || '';
    var right = el('div', 'bd-sright');
    if (cardMode() && !S.an) {
      var opts = [{ k: '', label: 'Ranking' }];
      sortOptions().forEach(function (k) { opts.push({ k: k, label: SORT_NAMES[k] ? SORT_NAMES[k].charAt(0).toUpperCase() + SORT_NAMES[k].slice(1) : k }); });
      var ps = el('div', 'bd-psort');
      ps.appendChild(U.select(opts, S.so, function (v) { go({ so: v, sd: 1 }); }, { label: 'Sort', aria: 'Sort the cards' }));
      if (S.so) {
        var dc = el('button', 'chip bd-flip', S.sd < 0 ? '▲ low first' : '▼ high first'); dc.type = 'button';
        dc.addEventListener('click', function () { go({ sd: S.sd < 0 ? 1 : -1 }); });
        ps.appendChild(dc);
      }
      right.appendChild(ps);
    }
    if (S.w !== 'tape') {
      if (S.lx === 'full') {
        var an = el('button', 'chip bd-an' + (S.an ? ' on' : ''), 'All names'); an.type = 'button';
        an.setAttribute('aria-pressed', S.an ? 'true' : 'false');
        U.tip(an, 'Browse every tracked name, ranked or not (loads the full name list)');
        an.addEventListener('click', function () { go({ an: S.an ? '' : '1' }); });
        right.appendChild(an);
      }
      right.appendChild(U.seg([{ k: '', label: 'Simple' }, { k: 'full', label: 'Full detail' }], S.lx === 'full' ? 'full' : '', function (k) {
        if (k === 'full') go({ lx: 'full' });
        else go({ lx: '', an: '', lens: SKT.SIMPLE_LENSES.indexOf(S.lens) >= 0 ? S.lens : 'skew' });
      }, { aria: 'Detail', cls: 'bd-lx' }));
    }
    box.appendChild(right);
  }
  function sortOptions() {
    if (S.w === 'tape') return ['tnew', 'tbk', 'tsh', 'tbig', 'held', 'king', 'biz', 'tpx', 'stk'];
    var k = ['usd', 'bet', 'str', 'held', 'biz', 'px', 'net', 'build', 'op', 'one', 'read', 'days', 'rk', 'trd', 'king', 'kdj', 'earn', 'stk'];
    if (S.w === '1d') k.push('z');
    return k;
  }


  function renderListSub() {
    var p = $('listSub');
    if (!p) return;
    p.textContent = '';
    if (S.an) { p.textContent = 'Every tracked name, ranked or not, with its reading ' + wWord(S.w) + '.'; return; }
    if (S.w === 'tape') { p.textContent = 'Traded ' + F.day(D.tape && D.tape.T) + ', not settled yet: where more contracts traded than were open that morning, the difference must be new positions. The next settle replaces these leads.'; return; }
    var s = S.side === 'B' ? 'call- and put-leaning' : S.side === 'P' ? 'put-leaning' : 'call-leaning';
    var t = 'Ranked: ' + SKT.winLabel(S.w).toLowerCase().replace('total', 'every saved settle').replace('today', 'the newest settle') + ', ' + s + ' names, by net ' +
      (S.side === 'B' ? 'contracts' : sideW(S.side)) + ' opened as a share of each stock\'s own book; two-sided or small builds are left out.';
    if (H.sub) safe('home sub', function () { t += H.sub(); });
    p.textContent = t;
  }
  var howKey = null;
  function renderHow() {
    var d = $('how'), key = String(!!SKT.LAN) + '|' + (H.how ? 1 : 0);
    if (!d || howKey === key) return;
    var first = howKey === null, wasOpen = d.open;
    howKey = key;
    d.textContent = '';
    d.appendChild(el('summary', null, 'How we rank'));
    var b = el('div', 'fold-body bd-how'), ol = el('ol');
    ['One-sided on new contracts and on net: most of the new contracts went to one side, and the net (opened minus closed) leans the same way.',
      'Big against its own open interest: the net is a real share of every contract open on the stock, so a small name and a large one compete fairly.',
      'Needs most of the window\'s sessions: a name has to be read on most sessions of the window.',
      'Deep-in-the-money builds are left out: they behave like owning (or shorting) the stock.',
      'Leveraged and inverse funds are left out (still searchable, with the reason).',
      'Spreads are flagged: matching pairs of lines on one expiry are marked "a spread?".',
      'Read = where the late prints of the new contracts traded against the closing quote: near the ask reads as bought, near the bid as sold.'
    ].forEach(function (t) { ol.appendChild(el('li', null, t)); });
    b.appendChild(ol);
    if (H.how) safe('home how', function () { var x = H.how(); if (x) b.appendChild(x); });
    d.appendChild(b);
    d.open = first ? !cardMode() : wasOpen;
  }


  function listHead(box, ctx, shown, total) {
    var h = el('div', 'bd-lhead');
    var t = ctx.tape ? 'Traded ' + F.day(D.tape && D.tape.T) + ' · not settled yet' : ctx.simple ? SKT.W(S.side).head : (S.side === 'B' ? 'Calls and puts' : S.side === 'P' ? 'Leaning to puts' : 'Leaning to calls') + ' · ' + (WL[S.w] || S.w);
    h.appendChild(el('h2', 'acc-h', t));
    var meta = el('span', 'bd-lmeta', F.num(total) + (ctx.tape ? ' names' : S.show === 'out' ? ' left out' : ' ranked') + (total > shown ? ' · showing ' + F.num(shown) : '') + ' · ' + (S.w === 'tape' ? 'tape' : SKT.winLabel(S.w).toLowerCase()) + (S.w !== 'tape' && S.w !== '1d' ? ' ' + sinceTxt(S.w) : ''));
    h.appendChild(meta);
    box.appendChild(h);
    if (S.so) {
      var n = el('p', 'bd-snote');
      txt(n, 'Sorted by ' + (SORT_NAMES[S.so] || S.so) + ' ' + (S.sd < 0 ? '▲' : '▼') + ' · ');
      var b = el('button', 'linkbtn', 'back to the ranking'); b.type = 'button';
      b.addEventListener('click', function () { go({ so: '' }); });
      n.appendChild(b);
      box.appendChild(n);
    }
  }
  function renderList(ctx) {
    var box = $('list');
    if (!box) return;
    box.textContent = '';
    if (S.an) { renderBrowse(box, ctx); return; }
    var rows = entries(S.w, S.side, S.list), cm = cardMode(), wideBoth = ctx.both && wideMode() && !cm && !ctx.tape;
    ctx.hasEarn = anyEarn(rows);
    ctx.nSide = { C: 0, P: 0 };
    rows.forEach(function (e) { ctx.nSide[e.side]++; });
    var showAll = SKT.store.sget('sk.all') === '1', lim = showAll ? Infinity : LIMIT;
    var lens = ctx.tape ? 'skew' : ctx.lens;
    if (S.show === 'out') { rows.forEach(function (e) { e.whyTxt = e.why; }); lens = 'skew'; }
    listHead(box, ctx, wideBoth ? Math.min(ctx.nSide.C, lim) + Math.min(ctx.nSide.P, lim) : Math.min(rows.length, lim), rows.length);
    if (!rows.length) {
      var msg = S.q ? 'No name here matches “' + S.q + '”.' : S.show === 'out' ? 'Nothing was left out on this side.' : 'No name on this list leans this way ' + (S.w === 'tape' ? 'on the tape' : wWord(S.w)) + (S.f && S.f.size || S.ten || S.od || S.show ? ' with these filters.' : '.');
      box.appendChild(el('p', 'empty', msg));
      return;
    }
    if (S.show === 'out' && !SKT.SEARCH) needSearch();
    if (wideBoth) {
      var two = el('div', 'bd-two');
      ['C', 'P'].forEach(function (sd) {
        var part = rows.filter(function (e) { return e.side === sd; });
        var col = el('div', 'bd-half s-' + sideCls(sd));
        col.appendChild(el('h3', 'bd-hh ' + sideCls(sd), (sd === 'C' ? '▲ Leaning to calls · ' : '▼ Leaning to puts · ') + F.num(part.length)));
        var cx = {}; Object.keys(ctx).forEach(function (k) { cx[k] = ctx[k]; }); cx.both = false; cx.compact = true;
        drawSections(col, arrange(part, lens, ctx.dir, false), cx, lim, false);
        two.appendChild(col);
      });
      box.appendChild(two);
      if (!showAll && (ctx.nSide.C > lim || ctx.nSide.P > lim)) box.appendChild(showAllBtn(rows.length));
      return;
    }
    var used = drawSections(box, arrange(rows, lens, ctx.dir, ctx.both), ctx, lim, cm);
    if (!showAll && used < rows.length) box.appendChild(showAllBtn(rows.length));
  }
  function showAllBtn(n) {
    var b = el('button', 'bd-more', 'Show all ' + F.num(n)); b.type = 'button';
    b.addEventListener('click', function () { SKT.store.sset('sk.all', '1'); safe('list', function () { renderList(ctxOf()); markSoon(); }); });
    return b;
  }
  function drawSections(box, secs, ctx, lim, cm) {
    var used = 0, cols = cm ? null : colsFor(ctx);
    var multi = secs.length > 1 || (secs[0] && secs[0].title);
    var target, tb;
    if (!cm) {
      var sc = el('div', 'bd-scroll' + (ctx.tape ? ' tape' : ctx.compact ? ' compact' : ctx.simple ? ' simple' : ' full'));
      var t = el('table', 'bd-tbl');
      var th = el('thead'); th.appendChild(headRow(cols, sortBy)); t.appendChild(th);
      tb = el('tbody'); t.appendChild(tb);
      sc.appendChild(t); box.appendChild(sc);
    } else {
      target = el('div', 'bd-cards'); box.appendChild(target);
    }
    secs.forEach(function (s) {
      if (used >= lim) return;
      var rows = S.so ? colSort(s.rows, S.so, S.sd) : s.rows;
      if (multi && s.title) {
        if (cm) { var hd = el('div', 'bd-sec'); hd.appendChild(el('b', null, s.title)); hd.appendChild(sp('n', F.num(s.rows.length))); if (s.tip) U.tip(hd, s.tip); target.appendChild(hd); }
        else { var tr = el('tr', 'sec'), td = el('td'); td.colSpan = cols.length; td.appendChild(el('b', null, s.title)); td.appendChild(sp('n', ' · ' + F.num(s.rows.length))); if (s.tip) U.tip(td, s.tip); tr.appendChild(td); tb.appendChild(tr); }
      }
      rows.forEach(function (e) {
        if (used >= lim) return;
        used++;
        if (cm) target.appendChild(cardEl(e, ctx)); else tb.appendChild(rowEl(e, cols, ctx));
      });
    });
    return used;
  }

  var browsePage = 0;
  function renderBrowse(box, ctx) {
    var h = el('div', 'bd-lhead');
    h.appendChild(el('h2', 'acc-h', 'All tracked names · ' + (WL[S.w] || S.w)));
    var back = el('button', 'linkbtn', 'back to the ranked list'); back.type = 'button';
    back.addEventListener('click', function () { go({ an: '' }); });
    h.appendChild(back);
    box.appendChild(h);
    if (!SKT.SEARCH) { box.appendChild(el('p', 'empty', 'Loading every tracked name…')); needSearch(); }
    var pool = {}, list = [];
    var add = function (src) { Object.keys(src || {}).forEach(function (s) { if (pool[s]) return; pool[s] = 1; var r = src[s], st = r.w && r.w[S.w]; if (!SKT.inList(s, S.list) || !matchQ(s, r)) return; list.push({ sym: s, r: r, st: st || null, w: S.w, side: st && st.side === 'P' ? 'P' : 'C', off: !(st && st.r), why: st ? (st.r ? '' : st.why || 'not ranked') : 'no reading' }); }); };
    add(D.rows); if (SKT.SEARCH) add(SKT.SEARCH.rows);
    var cols = [
      { k: 'stk', label: 'Stock', v: function (e) { return e.sym; }, f: function (e) { var d = el('span'); d.appendChild(el('b', null, e.sym)); if (e.r.nm) { d.appendChild(document.createTextNode(' ')); d.appendChild(sp('mut', unent(e.r.nm))); } return d; } },
      { k: 'rk', label: 'On this window', v: function (e) { return e.st && e.st.r ? 1e4 - e.st.r : null; }, f: function (e) { return e.st && e.st.r ? '#' + e.st.r + ' ' + sideW(e.st.side) : e.why; } },
      { k: 'px', label: 'Price · since', num: true, v: function (e) { return e.st && isNum(e.st.ret) ? e.st.ret : null; }, f: function (e) { return F.money(e.r.px) + (e.st && isNum(e.st.ret) ? ' ' + F.spct(e.st.ret) : ''); } },
      { k: 'op', label: 'Opened C : P', num: true, v: function (e) { return e.st ? share(e.st.aC, e.st.aP) : null; }, f: function (e) { return e.st ? '+' + F.k(e.st.aC) + ' / +' + F.k(e.st.aP) : '–'; } },
      { k: 'net', label: 'Net · of book', num: true, v: function (e) { return colVal(e, 'net'); }, f: function (e) { return e.st && isNum(e.st.net) ? F.sk(e.st.net) + (isNum(e.st.pct) ? ' · ' + F.pct(Math.abs(e.st.pct)) : '') : '–'; } },
      { k: 'one', label: 'One-sided', num: true, v: function (e) { return oneOf(e.st); }, f: function (e) { return pc0(oneOf(e.st)); } },
      { k: 'usd', label: '$ opened', num: true, v: function (e) { return premOf(e.st, e.side); }, f: function (e) { return F.usd(premOf(e.st, e.side)); } },
      { k: 'read', label: 'Read', v: function (e) { return colVal(e, 'read'); }, f: function (e) { return e.st && e.st.bs ? READW[e.st.bs] || e.st.bs : '–'; } },
      { k: 'held', label: 'Held C : P', num: true, v: function (e) { return share(e.r.oC, e.r.oP); }, f: function (e) { return ratioTxt(e.r.oC, e.r.oP); } },
      { k: 'king', label: 'King', num: true, v: function (e) { return colVal(e, 'king'); }, f: function (e) { var kg = e.r.kg; return kg ? F.strike(kg[0]).replace('$', '') + ' ' + F.spct(kg[1]) : '–'; } },
      { k: 'biz', label: 'Business', num: true, v: function (e) { return isNum(e.r.biz) ? e.r.biz : null; }, f: function (e) { return isNum(e.r.biz) ? String(e.r.biz) : '–'; } }
    ];
    var k = S.so && cols.some(function (c) { return c.k === S.so; }) ? S.so : 'rk', dir = S.so ? S.sd : 1;
    var col = cols.filter(function (c) { return c.k === k; })[0];
    var sorted = U.sortRows(list, col.v, dir), pages = Math.max(1, Math.ceil(sorted.length / 200));
    if (browsePage >= pages) browsePage = 0;
    var page = sorted.slice(browsePage * 200, browsePage * 200 + 200);
    box.appendChild(el('p', 'bd-snote', F.num(sorted.length) + ' names · page ' + (browsePage + 1) + ' of ' + pages));
    box.appendChild(U.table(cols, page, { sort: { k: k, dir: dir }, onSort: sortBy, cls: 'bd-browse',
      onRow: function (e, tr) { tr.dataset.sym = e.sym; tr.tabIndex = 0; tr.classList.add('br'); } }));
    if (pages > 1) {
      var pg = el('div', 'bd-pager');
      for (var i = 0; i < pages; i++) (function (i) { var b = el('button', 'chip' + (i === browsePage ? ' on' : ''), String(i + 1)); b.type = 'button'; b.addEventListener('click', function () {
        browsePage = i;
        safe('browse', function () { renderList(ctxOf()); });
        var lb = $('list');
        if (lb && lb.getBoundingClientRect().top < 0) lb.scrollIntoView({ block: 'start' });
      }); pg.appendChild(b); })(i);
      box.appendChild(pg);
    }
  }
  var searchBusy = false;
  function needSearch() {
    if (SKT.SEARCH || searchBusy) return;
    searchBusy = true;
    SKT.loadSearch().then(function () { searchBusy = false; if (!S.open) refreshList(); }, function () { searchBusy = false; });
  }


  var secOpen = {};
  function sect(key, summary, count, build, opts) {
    opts = opts || {};
    var d = U.details(summary, build, { count: count, open: !!secOpen[key], cls: 'bd-end' + (opts.cls ? ' ' + opts.cls : ''), key: opts.store,
      onToggle: function (o) { secOpen[key] = o; if (o && opts.onOpen) opts.onOpen(); } });
    if (opts.store) secOpen[key] = d.open;
    return d;
  }
  function offRows(list, ctx, near) {
    var frag = el('div', 'bd-offlist');
    if (!list.length) { frag.appendChild(el('p', 'empty', 'None.')); return frag; }
    var cm = cardMode(), cx = {}; Object.keys(ctx).forEach(function (k) { cx[k] = ctx[k]; }); cx.both = false;
    if (cm) { list.forEach(function (e) { frag.appendChild(cardEl(e, cx)); }); return frag; }
    var cols = colsFor(cx), sc = el('div', 'bd-scroll' + (cx.simple ? ' simple' : ' full') + (near ? ' nearl' : '')), t = el('table', 'bd-tbl'), th = el('thead'), tb = el('tbody');
    th.appendChild(headRow(cols, null)); t.appendChild(th);
    list.forEach(function (e) { tb.appendChild(rowEl(e, cols, cx)); });
    t.appendChild(tb); sc.appendChild(t); frag.appendChild(sc);
    return frag;
  }
  function offEntry(sym, sd, why, near) {
    var r = SKT.row(sym), st = r && r.w ? r.w[S.w] || null : null;
    return { sym: sym, side: sd, r: r, st: st, w: S.w, er: 0, near: near ? 1 : 0, off: near ? 0 : 1, why: why || (st && st.why) || '' };
  }
  function renderEnd(ctx) {
    var box = $('endSections');
    if (!box) return;
    box.textContent = '';
    if (S.an) return;
    var sides = S.side === 'B' ? ['C', 'P'] : [S.side], W = winOf(S.w) || {};

    if (S.q) {
      var shownSet = {};
      entries(S.w, S.side, S.list).forEach(function (e) { shownSet[e.sym] = 1; });
      var oth = searchHits(S.q).filter(function (h) { return !shownSet[h[1]]; }).slice(0, 24);
      var sec = el('section', 'bd-endsec bd-other');
      sec.appendChild(el('h3', 'h3', 'Other names' + (oth.length ? ' · ' + oth.length : '')));
      if (!SKT.SEARCH) { needSearch(); sec.appendChild(el('p', 'mut', 'Searching every tracked name…')); }
      var lst = oth.map(function (h) {
        var r = h[2], w = S.w === 'tape' ? '1w' : S.w, st = r && r.w && r.w[w], sd = st && st.side === 'P' ? 'P' : 'C';
        var e = offEntry(h[1], sd, '', false); e.st = st || null; e.w = w;
        e.whyTxt = st && st.r ? 'Ranked #' + st.r + ' on ' + WL[w] + ' ' + sideW(st.side) + (S.list !== 'all' && !SKT.inList(h[1], S.list) ? ' (not in this list)' : '') : 'Not ranked on ' + WL[w] + ' ' + sideW(S.side === 'B' ? sd : S.side) + (st && st.why ? ': ' + st.why : st ? '' : ': no reading');
        return e;
      });
      if (lst.length) sec.appendChild(offRows(lst, ctx, false));
      else if (SKT.SEARCH) sec.appendChild(el('p', 'mut', 'No other tracked name matches.'));
      box.appendChild(sec);
    }
    if (S.w !== 'tape') {

      var near = [];
      sides.forEach(function (sd) { ((W.N && W.N[sd]) || []).forEach(function (sym) { if (SKT.inList(sym, S.list) && cfOk(sym) && matchQ(sym, SKT.row(sym))) near.push([sym, sd]); }); });
      if (near.length) {
        var on = SKT.store.get('sk.near') === '1';
        var ns = el('section', 'bd-endsec bd-near');
        var hb = el('div', 'bd-nhead');
        var tg = el('button', 'chip' + (on ? ' on' : ''), 'Near misses'); tg.type = 'button';
        tg.appendChild(sp('cn', F.num(near.length)));
        tg.setAttribute('aria-pressed', on ? 'true' : 'false');
        U.tip(tg, 'Names that pass every check but one');
        tg.addEventListener('click', function () { SKT.store.set('sk.near', on ? '0' : '1'); safe('end', function () { renderEnd(ctxOf()); }); });
        hb.appendChild(tg);
        hb.appendChild(sp('mut', 'Pass every check but one'));
        ns.appendChild(hb);
        if (on) {
          if (!SKT.SEARCH) { needSearch(); }
          ns.appendChild(offRows(near.map(function (x) { var e = offEntry(x[0], x[1], '', true); e.whyTxt = e.why || 'one check short'; return e; }), ctx, true));
        }
        box.appendChild(ns);
      }

      var lo = [];
      sides.forEach(function (sd) { ((W.X && W.X[sd]) || []).forEach(function (x) { if (SKT.inList(x[0], S.list) && cfOk(x[0]) && matchQ(x[0], SKT.row(x[0]))) lo.push([x[0], sd, x[1]]); }); });
      if (lo.length && S.show !== 'out') {
        box.appendChild(sect('lo', 'Big one-sided builds left out', lo.length, function () {
          var w = el('div');
          if (!SKT.SEARCH) { w.appendChild(el('p', 'mut', 'Loading their rows…')); }
          w.appendChild(offRows(lo.map(function (x) { var e = offEntry(x[0], x[1], x[2], false); e.whyTxt = x[2]; return e; }), ctx, false));
          return w;
        }, { onOpen: needSearch }));
      }

      var ranked = {};
      sides.forEach(function (sd) { (W[sd] || []).forEach(function (s) { ranked[s] = 1; }); });
      var loudPool = function () {
        var out = [], seen = {};
        var scan = function (src) {
          Object.keys(src || {}).forEach(function (s) {
            if (seen[s] || ranked[s]) return;
            var r = src[s];
            if (!SKT.inList(s, S.list) || !cfOk(s) || !matchQ(s, r)) return;
            sides.forEach(function (sd) {
              if (seen[s]) return;
              var hit = (r.ld || []).some(function (x) { return x && x[4] === sd && (!W.frm || x[1] >= W.frm) && (!W.to || x[1] <= W.to); }) || (sd === 'C' && r.stl && r.stl[0]);
              if (hit) { seen[s] = 1; var e = offEntry(s, sd, '', false); var st = r.w && r.w[S.w]; e.whyTxt = st && st.why ? st.why : st && st.r ? 'ranked on the other side' : 'no reading'; out.push(e); }
            });
          });
        };
        scan(D.rows); if (SKT.SEARCH) scan(SKT.SEARCH.rows);
        return out;
      };
      var lp = loudPool();
      if (lp.length || !SKT.SEARCH) box.appendChild(sect('loud', 'Loud, not one-sided here', SKT.SEARCH ? lp.length : null, function () {
        var w = el('div');
        if (!SKT.SEARCH) { w.appendChild(el('p', 'mut', 'Loading every tracked name…')); }
        w.appendChild(offRows(loudPool(), ctx, false));
        return w;
      }, { onOpen: needSearch }));

      if (D.tape) {
        var tC = (D.tape.C || []).filter(function (s) { return SKT.inList(s, S.list); }).length, tP = (D.tape.P || []).filter(function (s) { return SKT.inList(s, S.list); }).length;
        var ts = el('section', 'bd-endsec bd-tape');
        var tl = el('p');
        txt(tl, 'Traded ' + F.day(D.tape.T) + ', not settled yet · ' + F.num(tC) + ' calls / ' + F.num(tP) + ' puts · ');
        var tb = el('button', 'linkbtn', 'show'); tb.type = 'button';
        tb.addEventListener('click', function () { go({ w: 'tape' }); window.scrollTo(0, 0); });
        tl.appendChild(tb);
        U.tip(tl, 'Where more contracts traded than were open that morning, the difference must be new');
        ts.appendChild(tl);
        box.appendChild(ts);
      }

      var shown = entries(S.w, S.side, S.list);
      if (shown.length && S.show !== 'out') box.appendChild(sect('cps', 'Calls vs puts across the ' + F.num(shown.length) + ' names shown', null, function () { return cpsBody(shown); }, { store: 'sk.cps', cls: 'cps' }));
    }
    if (H.end) safe('home end', function () { H.end(box); });
  }
  function cpsBody(rows) {
    var w = el('div', 'bd-cps'), aC = 0, aP = 0, oC = 0, oP = 0, h0C = 0, h0P = 0, hnC = 0, hnP = 0, nh0 = 0;
    var items = rows.map(function (e) {
      var st = e.st || {}, r = e.r || {}, h0 = h0Of(e);
      aC += st.aC || 0; aP += st.aP || 0; oC += r.oC || 0; oP += r.oP || 0;
      if (h0) { h0C += h0[0] || 0; h0P += h0[1] || 0; hnC += r.oC || 0; hnP += r.oP || 0; nh0++; }
      var now = share(r.oC, r.oP), s0 = h0 ? share(h0[0], h0[1]) : null, ad = share(st.aC, st.aP);
      return { e: e, now: now, s0: s0, ad: ad, mv: now != null && s0 != null ? now - s0 : null };
    });
    var hero = el('div', 'cps-hero');
    hero.appendChild(el('b', null, 'added ' + ratioTxt(aC, aP)));
    txt(hero, ' · ');
    hero.appendChild(el('b', oC >= oP ? 'up' : 'down', 'held ' + ratioTxt(oC, oP)));
    w.appendChild(hero);
    var s0all = nh0 ? share(h0C, h0P) : null;
    var bar = el('div', 'cps-bar');
    bar.appendChild(U.splitBar(oC, oP, { mid: true, tick: s0all, h: 10, cls: 'wide' }));
    w.appendChild(bar);
    var nHeld = items.filter(function (x) { return x.now != null; }).length, part = s0all != null && nh0 < nHeld;
    w.appendChild(el('p', 'mut', F.num(oC) + ' calls · ' + F.num(oP) + ' puts held across these names' + (s0all != null ? '; the white tick is ' +
      (part ? 'the call share of the ' + F.num(nh0) + ' names settled on ' + F.dayShort(D.latest) + ' at the ' + F.dayShort(per(S.w).base) + ' settle (' + pc0(s0all) + '; ' + pc0(share(hnC, hnP)) + ' now)'
        : 'their call share at the ' + F.dayShort(per(S.w).base) + ' settle (' + pc0(s0all) + ')') : '') + '.'));
    var hasH = items.some(function (x) { return x.mv != null; });
    var list = hasH ? items.filter(function (x) { return x.mv != null; }).sort(function (a, b) { return Math.abs(b.mv) - Math.abs(a.mv); }) : items.filter(function (x) { return x.now != null; }).sort(function (a, b) { return (b.ad || 0) - (a.ad || 0); });
    var g = el('div', 'cps-rows');
    list.slice(0, 30).forEach(function (x) {
      var row = el('div', 'cps-row br'); row.dataset.sym = x.e.sym; row.tabIndex = 0;
      row.appendChild(el('b', 'tk', x.e.sym));
      var tr = el('div', 'track');
      var put = function (v, cls) { if (v == null) return; var d = el('i', cls); d.style.left = (Math.max(0, Math.min(1, v)) * 1e2).toFixed(1) + '%'; tr.appendChild(d); };
      if (hasH) {
        var a = Math.min(x.s0, x.now), b = Math.max(x.s0, x.now), seg = el('b', 'seg ' + (x.mv >= 0 ? 'up' : 'down'));
        seg.style.left = (a * 1e2).toFixed(1) + '%'; seg.style.width = ((b - a) * 1e2).toFixed(1) + '%'; tr.appendChild(seg);
        put(x.s0, 'd0'); put(x.now, 'd1 ' + (x.mv >= 0 ? 'up' : 'down'));
      } else { put(x.ad, 'da'); put(x.now, 'd1'); }
      tr.appendChild(el('span', 'mid'));
      row.appendChild(tr);
      row.appendChild(el('span', 'lab', hasH ? pc0(x.s0) + ' → ' + pc0(x.now) + ' ' + mvTxt(Math.round(x.mv * 1e2)) : 'added ' + pc0(x.ad) + ' calls · held ' + pc0(x.now)));
      g.appendChild(row);
    });
    w.appendChild(g);
    w.appendChild(el('p', 'mut', hasH ? 'Each row: the call share of the held book at the window start (hollow) and now (filled); sorted by the move.' : 'Each row: the call share of the window\'s added contracts (hollow) and of the held book now (filled).'));
    return w;
  }


  function markOvf() {
    Array.prototype.forEach.call(document.querySelectorAll('#list .bd-scroll, #endSections .bd-scroll'), function (b) {
      var set = function (n) { for (var i = 1; i <= 6; i++) b.classList.toggle('f' + i, i <= n); };
      var fits = function () { return b.scrollWidth <= b.clientWidth + 1; };
      var n = 0;
      set(0); b.classList.remove('ovf');
      while (b.clientWidth && !fits() && n < 6) set(++n);
      var o = !!b.clientWidth && !fits();
      b.classList.toggle('ovf', o);
      if (o) { var bz = b.querySelector('th.c-biz'); b.style.setProperty('--bzw', (bz ? bz.offsetWidth : 0) + 'px'); }
    });
  }
  var markT = null;
  function markSoon() { cancelAnimationFrame(markT); markT = requestAnimationFrame(function () { safe('fit', markOvf); }); }


  function renderBoardOnly() {
    var ctx = ctxOf();
    computeOffered();
    if (SKT.renderWin) SKT.renderWin();
    safe('side', renderSide);
    safe('lists', renderLists);
    safe('show', renderShow);
    safe('hero', renderHero);
    safe('left', renderLeft);
    if (!S.v) {
      safe('list', function () { renderList(ctx); });
      safe('end', function () { renderEnd(ctx); });
    }
    markSoon();
  }
  function render() {
    D = SKT.D; S = SKT.S;
    closeRowMenu();
    if (!D) return;
    lastLayout = cardMode() ? 'card' : wideMode() ? 'wide' : 'desk';
    computeOffered();
    var ctx = ctxOf();
    safe('hero', renderHero);
    safe('left', renderLeft);
    if (H.strip) safe('news strip', function () { H.strip($('newsStrip')); });
    safe('side', renderSide);
    safe('lists', renderLists);
    safe('lens', renderLens);
    safe('show', renderShow);
    safe('search', renderSearch);
    safe('listSub', renderListSub);
    if (!S.v) {
      safe('list', function () { renderList(ctx); });
      safe('end', function () { renderEnd(ctx); });
    }
    safe('how', renderHow);
    markSoon();
  }


  function wireOnce() {
    var openFrom = function (ev) {
      var t = ev.target;
      if (t.closest('a, button, input, select, summary, .dcells')) return;
      var n = t.closest('[data-sym]');
      if (!n || !n.dataset.sym) return;
      openName(n.dataset.sym);
    };
    ['list', 'endSections'].forEach(function (id) {
      var n = $(id);
      if (!n) return;
      n.addEventListener('click', openFrom);
      n.addEventListener('keydown', function (ev) {
        if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset && ev.target.dataset.sym && ev.target === ev.target.closest('[data-sym]')) { ev.preventDefault(); openName(ev.target.dataset.sym); }
      });
    });
    document.addEventListener('keydown', function (ev) {
      if (!SKT.D || !SB || S.open || S.v || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var t = ev.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if (/^[a-zA-Z]$/.test(ev.key)) SB.input.focus();
    });
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!SKT.D || S.open) return;
        var lay = cardMode() ? 'card' : wideMode() ? 'wide' : 'desk';
        if (lay !== lastLayout) render(); else markSoon();
      }, 150);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireOnce); else wireOnce();


  SKT.board = {
    render: render,
    row: function (sym, r, st, opts) {
      opts = opts || {}; D = SKT.D; S = SKT.S;
      var e = { sym: sym, r: r || SKT.row(sym), st: st || null, side: opts.side || (st && st.side === 'P' ? 'P' : 'C'), w: opts.w || S.w, er: st && st.r || 0, place: opts.place, near: opts.near ? 1 : 0, off: opts.off ? 1 : 0, why: opts.why || '' };
      var ctx = ctxOf(); ctx.simple = opts.cols ? opts.cols === 'simple' : ctx.simple; ctx.compact = opts.cols === 'compact'; ctx.both = false; ctx.nSide = { C: 1, P: 1 };
      return rowEl(e, colsFor(ctx), ctx);
    },
    card: function (sym, r, st, opts) {
      opts = opts || {}; D = SKT.D; S = SKT.S;
      var e = { sym: sym, r: r || SKT.row(sym), st: st || null, side: opts.side || (st && st.side === 'P' ? 'P' : 'C'), w: opts.w || S.w, er: st && st.r || 0, place: opts.place, near: opts.near ? 1 : 0, off: opts.off ? 1 : 0, why: opts.why || '' };
      var ctx = ctxOf(); ctx.both = false; ctx.nSide = { C: 1, P: 1 };
      return cardEl(e, ctx);
    },
    count: count
  };
})();
