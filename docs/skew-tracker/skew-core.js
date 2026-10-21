



























































































































































(function () {
  'use strict';
  var SKT = window.SKT = window.SKT || {};
  SKT.V = '20261021b';
  SKT.LIVE_SITE = location.hostname === 'lawrencekenshin.github.io';
  SKT.BASE = SKT.LIVE_SITE ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/skew-tracker-data/skew-tracker/' : 'snap/';
  SKT.HOME = false;
  SKT.D = null; SKT.SEARCH = null; SKT.VIEWS = null; SKT.STATUS = null;
  SKT.LAN = null; SKT.LANST = null; SKT.LIVE = null;
  SKT.board = SKT.board || null; SKT.name = SKT.name || null; SKT.charts = SKT.charts || null; SKT.views = SKT.views || null;

  var POLL_MS = 10 * 60 * 1000;
  var hooks = { status: [], tick: [], start: [] };

  function $(id) { return document.getElementById(id); }
  SKT.$ = $;


  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {  } }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { if (v == null || v === '') sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {  } }
  SKT.store = { get: lget, set: lset, sget: sget, sset: sset };


  var subs = {};
  SKT.on = function (evt, fn) { (subs[evt] = subs[evt] || []).push(fn); };
  SKT.emit = function (evt, data) { (subs[evt] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error('[skew] ' + evt, e); } }); };


  SKT.WINS = ['1d', '1w', '2w', '1m', 'all', 'tape'];
  var WIN_TXT = {
    '1d': ['Today', 'Today', 'today'], '1w': ['1 week', '1W', 'this week'], '2w': ['2 weeks', '2W', 'these two weeks'],
    '1m': ['1 month', '1M', 'this month'], all: ['Total', 'Total', 'since the first saved settle'], tape: ['Tape', 'Tape', 'traded, not settled yet']
  };
  SKT.winLabel = function (w, short) { var t = WIN_TXT[w]; return t ? t[short ? 1 : 0] : String(w || ''); };
  SKT.winWord = function (w) {
    var D = SKT.D, p = D && D.periods && D.periods[w];
    if (w === 'all' && p && p.since) return 'since ' + dayShort(p.since);
    return WIN_TXT[w] ? WIN_TXT[w][2] : '';
  };
  SKT.LISTS = [
    { k: 'all', label: 'All', short: 'All' }, { k: 'spx', label: 'S&P 500', short: 'S&P' }, { k: 'ndx', label: 'Nasdaq 100', short: 'NDX' },
    { k: 'combo', label: 'Combined', short: 'Comb' }, { k: 'ai', label: 'AI companies', short: 'AI' }, { k: 'r1', label: 'Russell 1000', short: 'R1K' },
    { k: 'r2', label: 'Russell 2000', short: 'R2K' }, { k: 'etf', label: 'ETFs', short: 'ETF' }, { k: 'wl', label: 'Watchlist 1', short: 'WL' }
  ];
  SKT.LIST_KEYS = SKT.LISTS.map(function (x) { return x.k; });
  SKT.LENSES = ['skew', 'prem', 'rel', 'far', 'steady', 'day', 'sell', 'bz', 'grp', 'kd', 'kz', 'ks', 'sticky', 'kb', 'mag', 'pin', 'match', 'nmatch', 'pmatch'];
  SKT.SIMPLE_LENSES = ['skew', 'prem', 'steady', 'grp'];
  SKT.F_KEYS = ['new', 'steady', 'big1', 'q', 'kside', 'nospr', 'crowd', 'alone', 'earn', 'noearn', 'rare', 'wash', 'pull', 'base', 'high'];
  SKT.SORT_RX = /^[a-z][a-z0-9]{0,7}$/;
  var VIEW_KEYS = ['changes', 'days', 'crowds', 'map', 'daily', 'pre'];
  var VP_KEYS = { days: ['1w', '1m', 'all'], crowds: ['sec', 'ind', 'th'], map: ['C', 'P'] };
  var SYM_RX = /^[A-Z0-9][A-Z0-9.\-]{0,9}$/, ISO_RX = /^\d{4}-\d{2}-\d{2}$/, CON_RX = /^\d{6}[CP]\d+(\.\d+)?$/;
  SKT.BP = { narrow: 420, phone: 760, two: 1100, wide: 1360 };
  SKT.bp = function () { var w = window.innerWidth || document.documentElement.clientWidth || 1024; return w < 420 ? 'narrow' : w < 760 ? 'phone' : w < 1360 ? 'desk' : 'wide'; };

  SKT.biz = function (v) {
    if (typeof v !== 'number' || !isFinite(v)) return { band: '', word: '' };
    return v >= 70 ? { band: 'hi', word: 'strong' } : v >= 50 ? { band: 'mid', word: 'middling' } : { band: 'lo', word: 'weak' };
  };


  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  SKT.MON = MON; SKT.DOW = DOW;
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function sign(n) { return n > 0 ? '+' : n < 0 ? '−' : ''; }
  function k(n) {
    if (!isNum(n)) return '–';
    var a = Math.abs(n);
    if (a < 999.5) return String(Math.round(a));
    if (a < 99950) return (a / 1e3).toFixed(1) + 'k';
    if (a < 999500) return Math.round(a / 1e3) + 'k';
    if (a < 99.95e6) return (a / 1e6).toFixed(1) + 'M';
    return Math.round(a / 1e6) + 'M';
  }
  function sk(n) { return isNum(n) ? sign(Math.round(n)) + k(n) : '–'; }
  function pct(x, dp) { return isNum(x) ? (x * 100).toFixed(dp == null ? 1 : dp) + '%' : '–'; }
  function spct(x, dp) {
    if (!isNum(x)) return '–';
    var t = Math.abs(x * 100).toFixed(dp == null ? 1 : dp);
    return (+t === 0 ? '' : sign(x)) + t + '%';
  }
  function money(x) { return isNum(x) ? '$' + (Math.abs(x) >= 1000 ? Math.round(x).toLocaleString('en-US') : x.toFixed(2)) : '–'; }
  function usd(x) {
    if (!isNum(x)) return '–';
    var a = Math.abs(x), s = x < 0 ? '−$' : '$';
    if (a >= 1e9) return s + (a / 1e9).toFixed(1) + 'B';
    if (a >= 1e8) return s + Math.round(a / 1e6) + 'M';
    if (a >= 1e5) return s + (a / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return s + Math.round(a / 1e3) + 'K';
    return s + Math.round(a);
  }
  function isoDate(iso) { var p = String(iso).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function day(iso) { if (!iso || !ISO_RX.test(String(iso).slice(0, 10))) return '–'; var d = isoDate(String(iso).slice(0, 10)); return DOW[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function dayShort(iso) { if (!iso || !ISO_RX.test(String(iso).slice(0, 10))) return '–'; var d = isoDate(String(iso).slice(0, 10)); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function exp(e, sep) {
    e = String(e || '');
    if (!/^\d{6}$/.test(e)) return e || '–';
    var y = 2000 + +e.slice(0, 2), m = +e.slice(2, 4), d = +e.slice(4, 6);
    return MON[m - 1] + (sep == null ? '-' : sep) + d + (y !== new Date().getFullYear() ? ' ’' + String(y).slice(2) : '');
  }
  function strike(x) { return isNum(x) ? '$' + (Math.round(x * 100) / 100).toString() : '–'; }
  function ratio(c, p, dp) {
    c = isNum(c) ? c : 0; p = isNum(p) ? p : 0; dp = dp == null ? 1 : dp;
    if (c > 0 && p > 0) return c >= p ? (c / p).toFixed(dp) + ' : 1' : '1 : ' + (p / c).toFixed(dp);
    if (c > 0) return 'calls only';
    if (p > 0) return 'puts only';
    return '–';
  }
  function num(n) { return isNum(n) ? Math.round(n).toLocaleString('en-US') : '–'; }
  function zoned(iso, tz) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return null;
    try { return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }); } catch (e) { return null; }
  }
  function timeTaipei(iso) { var t = zoned(iso, 'Asia/Taipei'); return t ? t + ' Taipei' : '–'; }
  function timeLocal(iso) { var t = zoned(iso, undefined); return t || '–'; }
  function localDay(iso, short) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return '–';
    return (short ? '' : DOW[d.getDay()] + ' ') + MON[d.getMonth()] + ' ' + d.getDate();
  }
  function timeET(iso) { var t = zoned(iso, 'America/New_York'); return t ? t + ' ET' : '–'; }
  SKT.fmt = { k: k, sk: sk, pct: pct, spct: spct, money: money, usd: usd, day: day, dayShort: dayShort, exp: exp, strike: strike,
    ratio: ratio, num: num, timeTaipei: timeTaipei, timeLocal: timeLocal, timeET: timeET, time: timeLocal, localDay: localDay };


  var WT = {
    C: { opened: 'calls opened', dir: 'betting up', lean: 'leaning to calls', head: 'Who is building one-sided call bets?', side: 'calls', other: 'puts', word: 'Above' },
    P: { opened: 'puts opened', dir: 'betting down', lean: 'leaning to puts', head: 'Who is building one-sided put positions?', side: 'puts', other: 'calls', word: 'Below' }
  };
  var H1 = 'Who is piling into calls, or into puts?';
  SKT.W = function (side) {
    var b = WT[side === 'P' ? 'P' : 'C'], o = {};
    Object.keys(b).forEach(function (key) { o[key] = b[key]; });
    o.h1 = H1;
    if (side === 'B') { o.head = H1; o.lean = 'leaning one way'; }
    o.bet = function (kk, e) { return b.word + ' ' + strike(kk) + ' by ' + exp(e, ' '); };
    o.needs = function (frac) { return 'needs ' + spct(frac); };
    return o;
  };
  SKT.kgHash = function (view) {
    var S = SKT.S;
    return '#v=' + (view || 'skew') + '&w=' + (S.w === 'all' ? 'total' : S.w) + '&c=' + (S.side === 'P' ? 'P' : 'C') + '&u=total';
  };


  SKT.dataUrl = function (name) { return SKT.BASE + name; };












  var PROG = { got: 0, total: 0 };
  SKT.loadProgress = function () { return { got: PROG.got, total: PROG.total }; };
  SKT.getJSON = function (url, opts) {
    opts = opts || {};
    var q = opts.bust ? 'b=' + encodeURIComponent(opts.bust) : 't=' + Math.floor(Date.now() / 60000);
    var IDLE = opts.idle || 10000, NOPROG = opts.timeout || 60000, MAXTRY = 5, PROBE = 5000, WIN = 4000, STALL_B = 2048;
    var main = /skew\.json$/.test(url), canAbort = typeof AbortController === 'function';
    return new Promise(function (resolve, reject) {
      var settled = false, live = [], tries = 0, lastErr = null, tProg = Date.now(), iv = null;
      function finish(ok, v) {
        if (settled) return;
        settled = true;
        clearInterval(iv);
        live.forEach(function (a) { a.stop('done'); });
        live = [];
        if (ok) resolve(v); else reject(v);
      }
      function lead() { return live.reduce(function (b, a) { return !b || a.got > b.got ? a : b; }, null); }
      function smpAt(a, t) {
        for (var i = a.smp.length - 1; i >= 0; i--) if (a.smp[i][0] <= t) return a.smp[i];
        return a.smp[0];
      }
      function gotAt(a, t) { return smpAt(a, t)[1]; }
      function rate(a, now, span) {
        var s = smpAt(a, now - span), dt = now - s[0];
        return dt > 0 ? (a.got - s[1]) / dt : 0;
      }
      function attempt(n) {
        var ctl = canAbort ? new AbortController() : null, now = Date.now();
        var a = { why: null, got: 0, total: 0, t0: now, smp: [[now, 0]], best: 0, raced: false, opaque: !ctl,
          stop: function (w) { if (!a.why) a.why = w; if (ctl) ctl.abort(); } };
        var u = url + (url.indexOf('?') < 0 ? '?' : '&') + q + (n ? '&r=' + n : '');
        a.p = fetch(u, ctl ? { cache: 'no-store', signal: ctl.signal } : { cache: 'no-store' })
          .then(function (r) {
            if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
            if (!ctl || !r.body || !r.body.getReader || typeof TextDecoder !== 'function') { a.opaque = true; return r.json(); }
            a.total = +(r.headers.get('content-length') || 0) || 0;
            var rd = r.body.getReader(), dec = new TextDecoder('utf-8'), parts = [];
            var pump = function () {
              return rd.read().then(function (x) {
                if (x.done) { parts.push(dec.decode()); return JSON.parse(parts.join('')); }
                a.got += x.value.length;
                if (!a.why) tProg = Date.now();
                if (main && a.got >= PROG.got) { PROG.got = a.got; PROG.total = a.total; }
                parts.push(dec.decode(x.value, { stream: true }));
                return pump();
              });
            };
            return pump();
          })
          .then(null, function (e) { throw a.why && a.why !== 'done' ? new Error(a.why) : e; });
        return a;
      }
      function start() {
        if (settled || tries >= MAXTRY) return null;
        var a = attempt(tries++);
        live.push(a);
        a.p.then(function (j) { finish(true, j); }, function (e) {
          live = live.filter(function (x) { return x !== a; });
          if (settled) return;
          if (a.why !== 'lost') lastErr = e;
          if (live.length) return;
          if (a.why === 'stalled' && tries < MAXTRY) { start(); return; }
          finish(false, lastErr || e);
        });
        return a;
      }
      function sample() {
        if (settled) return;
        var now = Date.now();
        live.forEach(function (a) {
          a.smp.push([now, a.got]);
          while (a.smp.length > 2 && a.smp[1][0] <= now - IDLE) a.smp.shift();
          if (now - a.t0 >= WIN) a.best = Math.max(a.best, rate(a, now, WIN));
        });
        if (main) { var ld = lead(); if (ld) { PROG.got = ld.got; PROG.total = ld.total; } }
        if (live.some(function (a) { return a.opaque; })) { tProg = now; return; }
        if (now - tProg > NOPROG) { live.forEach(function (a) { a.stop('timed out'); }); finish(false, new Error('timed out')); return; }
        live.slice().forEach(function (a) {
          if (now - a.t0 >= IDLE && a.got - gotAt(a, now - IDLE) < STALL_B) a.stop('stalled');
        });
        live = live.filter(function (a) { return !a.why; });
        if (live.length === 1) {
          var f = live[0], r4 = rate(f, now, WIN);
          if (!f.raced && now - f.t0 >= 6000 && f.got > 0 && f.best > 0 && r4 < 0.15 * f.best && !(f.total && f.got >= f.total)) {
            f.raced = true;
            start();
          }
        } else if (live.length >= 2) {
          var a0 = live[0], b0 = live[live.length - 1];
          if (b0.got > a0.got) { a0.stop('lost'); return; }
          var dt = now - b0.t0;
          if (dt < PROBE) return;
          var ra = (a0.got - gotAt(a0, b0.t0)) / dt, rb = b0.got / dt, tot = a0.total || b0.total;
          var keepB = tot ? (rb > 0 && (tot - b0.got) / rb < (ra > 0 ? (tot - a0.got) / ra : Infinity)) : rb > 2 * ra;
          (keepB ? a0 : b0).stop('lost');
        }
      }
      if (main) { PROG.got = 0; PROG.total = 0; }
      start();
      if (canAbort) iv = setInterval(sample, 1000);
    });
  };
  function gen() { return (SKT.D && SKT.D.generated) || ''; }

  var ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };
  function unescNames(rows) {
    if (!rows || typeof rows !== 'object') return;
    Object.keys(rows).forEach(function (k) {
      var r = rows[k];
      if (r && typeof r.nm === 'string' && r.nm.indexOf('&') >= 0) r.nm = r.nm.replace(/&(amp|lt|gt|quot|#39|#x27);/g, function (m) { return ENT[m]; });
    });
  }
  var searchP = null, viewsP = null;
  SKT.loadSearch = function () {
    if (SKT.SEARCH) return Promise.resolve(SKT.SEARCH);
    if (!searchP) {
      var g = gen();
      searchP = SKT.getJSON(SKT.dataUrl('search.json'), { bust: g }).then(function (j) {
        if (!j || !j.rows) throw new Error('unexpected data');
        unescNames(j.rows);
        if (gen() === g) SKT.SEARCH = j;
        searchP = null;
        return j;
      }, function (e) { searchP = null; throw e; });
    }
    return searchP;
  };
  SKT.loadViews = function () {
    if (SKT.VIEWS) return Promise.resolve(SKT.VIEWS);
    if (!viewsP) {
      var g = gen();
      viewsP = SKT.getJSON(SKT.dataUrl('views.json'), { bust: g }).then(function (j) {
        if (!j || j.schema !== 3) throw new Error('unexpected data');
        if (gen() === g) SKT.VIEWS = j;
        viewsP = null;
        return j;
      }, function (e) { viewsP = null; throw e; });
    }
    return viewsP;
  };

  var NF = {}, NFL = {}, NFP = {};
  function fetchNF(sym) {
    if (sym in NF) return Promise.resolve(NF[sym]);
    if (NFP[sym]) return NFP[sym];
    var r = SKT.row(sym);
    if (r && !r.nf) return Promise.resolve(null);
    var tag = SKT.D && SKT.D.latest;
    NFP[sym] = SKT.getJSON(SKT.dataUrl('names/' + encodeURIComponent(sym) + '.json'), { bust: gen() })
      .then(function (j) { return j && j.s ? j : null; }, function () { return null; })
      .then(function (j) {
        delete NFP[sym];
        if (SKT.D && SKT.D.latest === tag) { NF[sym] = j; NFL[sym] = tag; }
        return j;
      });
    return NFP[sym];
  }
  var hov = { timer: null, cancel: null, busy: null };
  function hoverNF(sym) {
    if (hov.cancel) hov.cancel();
    clearTimeout(hov.timer);
    return new Promise(function (res) {
      hov.cancel = function () { res(null); };
      hov.timer = setTimeout(function () {
        hov.cancel = null;
        var run = function () {
          var p = fetchNF(sym);
          hov.busy = p.then(function () { hov.busy = null; }, function () { hov.busy = null; });
          p.then(res, function () { res(null); });
        };
        if (hov.busy) hov.busy.then(run); else run();
      }, 300);
    });
  }
  SKT.nameFile = function (sym, opts) {
    sym = String(sym || '').toUpperCase();
    if (!SYM_RX.test(sym)) return Promise.resolve(null);
    if (sym in NF) return Promise.resolve(NF[sym]);
    return opts && opts.hover ? hoverNF(sym) : fetchNF(sym);
  };
  SKT.nameFileNow = function (sym) { sym = String(sym || '').toUpperCase(); return sym in NF ? NF[sym] : undefined; };
  SKT.row = function (sym) { return (SKT.D && SKT.D.rows && SKT.D.rows[sym]) || (SKT.SEARCH && SKT.SEARCH.rows && SKT.SEARCH.rows[sym]) || null; };

  SKT.readings = function (r) {
    var out = [], ses = (SKT.D && SKT.D.sessions) || [];
    ((r && r.d) || []).forEach(function (e, i) { if (e && ses[i]) out.push([ses[i][0], e]); });
    return out;
  };



  SKT.addShare = function (st, sd) {
    if (!st) return null;
    var a = sd === 'P' ? st.aP : st.aC, b = sd === 'P' ? st.aC : st.aP;
    if (isNum(a) && isNum(b) && a >= 0 && b >= 0 && a + b > 0) return a / (a + b);
    return isNum(st.sk) ? (sd === 'P' ? 1 - st.sk : 1 + st.sk) / 2 : null;
  };
  SKT.oneSided = function (st) { var a = SKT.addShare(st, 'C'); return a == null ? null : Math.max(a, 1 - a); };
  SKT.netShare = function (st, sd) { return st && isNum(st.skn) ? (sd === 'P' ? 1 - st.skn : 1 + st.skn) / 2 : null; };


  function addRatio(c, p) {
    c = +c || 0; p = +p || 0;
    if (c > 0 && p > 0) { var hi = Math.max(c, p), lo = Math.min(c, p); return SKT.fmt.ratio(c, p, hi / lo >= 10 ? 0 : 1); }
    return c > 0 ? 'calls only' : p > 0 ? 'puts only' : c || p ? 'both down' : 'no change';
  }
  function addLean(c, p) { c = +c || 0; p = +p || 0; return c > 0 && p > 0 ? (c >= 2 * p ? 'up' : p >= 2 * c ? 'down' : '') : c > 0 ? 'up' : p > 0 ? 'down' : 'mut'; }
  SKT.todayCP = function (sym) {
    var D = SKT.D, r = SKT.row(sym), F = SKT.fmt;
    if (!D || !r) return null;
    var L = D.latest, ses = D.sessions || [], i = -1, j, x;
    for (j = ses.length - 1; j >= 0; j--) if (ses[j] && ses[j][0] === L) { i = j; break; }
    var at = function (k) { var y = k >= 0 ? (r.d || [])[k] : null; return y && (isNum(y[2]) || isNum(y[3])) ? y : null; };
    var w1 = r.w && r.w['1d'], c = null, p = null, day = L, late = false, joined = 1;
    if (w1 && (isNum(w1.aC) || isNum(w1.aP))) { c = w1.aC; p = w1.aP; x = at(i); if (x && x[0] > 1) joined = x[0]; }
    else if ((x = at(i))) { c = x[2]; p = x[3]; joined = x[0] || 1; }
    else if (i > 0 && (x = at(i - 1))) { c = x[2]; p = x[3]; day = ses[i - 1][0]; late = true; joined = x[0] || 1; }
    if (!isNum(c) && !isNum(p)) return null;
    c = +c || 0; p = +p || 0;
    var tip = 'Opened on the ' + F.day(day) + ' settle' + (late ? '' : ' (the newest)') + ': ' + F.sk(c) + ' calls · ' + F.sk(p) +
      ' puts, every expiry still open' + (joined > 1 ? '; this reading covers ' + joined + ' sessions (the days between were not saved)' : '') + '.';
    if (late) tip += ' ' + F.day(L) + ' has not landed for ' + sym + ' yet.';
    return { c: c, p: p, txt: addRatio(c, p), cls: addLean(c, p), day: day, late: late, joined: joined, tip: tip,
             share: c + p > 0 ? c / (c + p) : null };
  };


  SKT.todayCell = function (sym, opts) {
    opts = opts || {};
    var U = SKT.ui, F = SKT.fmt, t = SKT.todayCP(sym), w = U.el('span', 'sk-tod');
    if (!t) { w.appendChild(U.el('span', 'mut', '–')); U.tip(w, F.day(SKT.D && SKT.D.latest) + ': no reading for ' + sym + ' yet'); return w; }
    if (t.late) w.classList.add('late');
    var v = U.el('span', 'v');
    if (opts.label) v.appendChild(U.el('span', 'k', (t.late ? F.dayShort(t.day) : opts.label) + ' '));
    v.appendChild(U.el('b', t.late ? 'mut' : t.cls, t.txt));
    w.appendChild(v);
    w.appendChild(U.splitBar(t.c, t.p, { w: opts.w || 84, mid: true, thin: t.late }));
    if (opts.sub !== false) w.appendChild(U.el('small', 'sub', F.sk(t.c) + ' C · ' + F.sk(t.p) + ' P'));
    if (t.late) w.appendChild(U.el('small', 'sub v2', F.dayShort(t.day) + ' · ' + F.dayShort(SKT.D.latest) + ' not in yet'));
    U.tip(w, t.tip);
    return w;
  };
  SKT.oneWords = function (st, sd, net) {
    var a = SKT.addShare(st, sd), o = sd === 'P' ? 'C' : 'P', sw = function (x) { return x === 'P' ? 'puts' : 'calls'; };
    if (a == null) return '';
    var big = a >= 0.5 ? sd : o, t = Math.round(Math.max(a, 1 - a) * 100) + '% of new contracts are ' + sw(big);
    var n = net ? SKT.netShare(st, sd) : null;
    if (n != null) {
      var nb = n >= 0.5 ? sd : o, np = Math.round(Math.max(n, 1 - n) * 100) + '% of the net opens';
      t += nb === big ? ', ' + np : ', but ' + np + ' are ' + sw(nb);
    }
    return t;
  };
  var SETS = {}, SETS_FOR = null;
  function sets() {
    var D = SKT.D, key = (D ? D.generated : '') + '|' + (SKT.LAN ? SKT.LAN.generated : '');
    if (SETS_FOR === key) return SETS;
    SETS = {}; SETS_FOR = key;
    var src = (D && D.lists) || {};
    Object.keys(src).forEach(function (l) { var m = {}; (src[l] || []).forEach(function (s) { m[s] = 1; }); SETS[l] = m; });
    hooks.lists && hooks.lists(SETS);
    return SETS;
  }
  SKT.inList = function (sym, list) {
    list = list || SKT.S.list;
    if (list === 'all') return true;
    var m = sets()[list];
    return !!(m && m[sym]);
  };
  SKT.listOf = function (w, side, list) {
    var D = SKT.D;
    if (!D) return [];
    var src = w === 'tape' ? D.tape : D.windows && D.windows[w];
    if (!src) return [];
    var arr = side === 'B' ? (src.C || []).concat(src.P || []) : (src[side === 'P' ? 'P' : 'C'] || []);
    var seen = {};
    return arr.filter(function (s) { if (seen[s]) return false; seen[s] = 1; return SKT.inList(s, list); });
  };
  SKT.count = function (w, side, list) { return SKT.listOf(w, side, list).length; };


  function defaults() {
    return { w: '1d', side: 'C', list: 'all', lens: 'skew', dir: 1, so: '', sd: 1, show: '', f: new Set(), ten: '', od: 0, lx: '', an: '',
      v: '', vp: '', open: null, g: '1y', pr: '6m', cm: 'gex', cs: 'd', c: '', dd: '', day: '', q: '' };
  }
  var S = SKT.S = defaults();
  var lanPending = false;
  function okW(v) {
    if (['1d', '1w', '2w', '1m'].indexOf(v) >= 0) return true;
    var D = SKT.D;
    if (v === 'all') return !D || !!(D.periods && D.periods.all) || !!(D.windows && D.windows.all);
    if (v === 'tape') return !D || !!D.tape;
    return false;
  }
  function okL(v) {
    if (SKT.LIST_KEYS.indexOf(v) < 0) return false;
    if (v !== 'wl') return true;
    return !SKT.D || lanPending || !!(SKT.D.lists && SKT.D.lists.wl) || !!(SKT.LAN && SKT.LAN.lists && SKT.LAN.lists.wl);
  }
  function normalize() {
    var d = defaults();
    if (S.w === 'total') S.w = 'all';
    if (!okW(S.w)) S.w = d.w;
    if (['C', 'P', 'B'].indexOf(S.side) < 0) S.side = d.side;
    if (!okL(S.list)) S.list = d.list;
    if (SKT.LENSES.indexOf(S.lens) < 0) { S.lens = d.lens; S.dir = 1; }
    S.dir = S.dir < 0 ? -1 : 1;
    if (SKT.SIMPLE_LENSES.indexOf(S.lens) < 0) S.lx = 'full';
    if (!SKT.SORT_RX.test(S.so || '')) { S.so = ''; }
    S.sd = S.so && S.sd < 0 ? -1 : 1;
    if (['', 'b', 'm', 's', 'out'].indexOf(S.show) < 0) S.show = '';
    if (!(S.f instanceof Set)) S.f = new Set(Array.isArray(S.f) ? S.f : []);
    S.f.forEach(function (x) { if (SKT.F_KEYS.indexOf(x) < 0) S.f.delete(x); });
    if (['', 'm1', 'm6', 'y1', 'y1p'].indexOf(S.ten) < 0) S.ten = '';
    S.od = [10, 25, 50].indexOf(+S.od) >= 0 ? +S.od : 0;
    if (S.lx !== 'full') S.lx = '';
    S.an = S.an === '1' || S.an === 1 || S.an === true ? '1' : '';
    if (VIEW_KEYS.indexOf(S.v) < 0) S.v = '';
    S.vp = S.v && VP_KEYS[S.v] && VP_KEYS[S.v].indexOf(S.vp) >= 0 ? S.vp : '';
    S.open = S.open ? String(S.open).toUpperCase() : null;
    if (S.open && !SYM_RX.test(S.open)) S.open = null;
    if (['1y', '1m', '3m', '6m'].indexOf(S.g) < 0) S.g = d.g;
    if (['6m', '3m', '1m'].indexOf(S.pr) < 0) S.pr = d.pr;
    if (['gex', 'open'].indexOf(S.cm) < 0) S.cm = d.cm;
    if (['d', 'w', '2w', 'm'].indexOf(S.cs) < 0) S.cs = d.cs;
    if (!CON_RX.test(S.c || '')) S.c = '';
    if (!ISO_RX.test(S.day || '')) S.day = '';
    if (!SKT.HOME || !ISO_RX.test(S.dd || '')) S.dd = '';
    if (typeof S.q !== 'string') S.q = '';
  }
  var HASH_KEYS = ['w', 's', 'l', 'r', 'so', 'sd', 'x', 'f', 'k', 't', 'od', 'lx', 'an', 'v', 'vp', 'o', 'g', 'pr', 'cm', 'cs', 'c', 'day', 'dd'];

  function known(h) {
    return (h || '').replace(/^#/, '').split('&').filter(function (kv) {
      var i = kv.indexOf('='), key = i < 0 ? kv : kv.slice(0, i);
      return i < 0 ? /^[A-Z0-9][A-Z0-9.\-]{0,9}$/.test(key) : HASH_KEYS.indexOf(key) >= 0;
    }).length;
  }
  function applyHash(h) {
    h = (h || '').replace(/^#/, '');
    if (!h) return;
    h.split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('='), key = i < 0 ? kv : kv.slice(0, i), raw = i < 0 ? '' : kv.slice(i + 1), v;
      try { v = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch (e) { v = raw; }
      switch (key) {
        case 'w': S.w = v; break;
        case 's': S.side = v; break;
        case 'l': S.list = v; break;
        case 'r': S.lens = v.replace(/-$/, ''); S.dir = /-$/.test(v) ? -1 : 1; break;
        case 'so': S.so = v; break;
        case 'sd': S.sd = v === '-1' ? -1 : 1; break;
        case 'x': S.show = v; break;
        case 'f': S.f = new Set(v.split(',').filter(Boolean)); break;
        case 'k': if (v === 'side') S.f.add('kside'); break;
        case 't': S.ten = v; break;
        case 'od': S.od = +v; break;
        case 'lx': S.lx = v; break;
        case 'an': S.an = v; break;
        case 'v': S.v = v; break;
        case 'vp': S.vp = v; break;
        case 'o': S.open = v.toUpperCase(); break;
        case 'g': S.g = v; break;
        case 'pr': S.pr = v; break;
        case 'cm': S.cm = v; break;
        case 'cs': S.cs = v; break;
        case 'c': S.c = v.toUpperCase(); break;
        case 'day': S.day = v; break;
        case 'dd': S.dd = v; break;
        default:
          if (i < 0 && SYM_RX.test(key)) { S.open = key; S.q = key; }
      }
    });
  }
  function hashOf() {
    var p = [], d = defaults();
    function put(key, v) { p.push(key + '=' + encodeURIComponent(v).replace(/%2C/g, ',')); }
    if (S.w !== d.w) put('w', S.w);
    if (S.side !== d.side) put('s', S.side);
    if (S.list !== d.list) put('l', S.list);
    if (S.lens !== d.lens || S.dir < 0) put('r', S.lens + (S.dir < 0 ? '-' : ''));
    if (S.so) { put('so', S.so); if (S.sd < 0) put('sd', '-1'); }
    if (S.show) put('x', S.show);
    if (S.f.size) put('f', SKT.F_KEYS.filter(function (x) { return S.f.has(x); }).join(','));
    if (S.ten) put('t', S.ten);
    if (S.od) put('od', String(S.od));
    if (S.lx && SKT.SIMPLE_LENSES.indexOf(S.lens) >= 0) put('lx', S.lx);
    if (S.an) put('an', '1');
    if (S.v) put('v', S.v);
    if (S.vp) put('vp', S.vp);
    if (S.open) put('o', S.open);
    if (S.g !== d.g) put('g', S.g);
    if (S.pr !== d.pr) put('pr', S.pr);
    if (S.cm !== d.cm) put('cm', S.cm);
    if (S.cs !== d.cs) put('cs', S.cs);
    if (S.c) put('c', S.c);
    if (S.day) put('day', S.day);
    if (S.dd) put('dd', S.dd);
    return p.length ? '#' + p.join('&') : '';
  }
  var lastHash = null;
  function curState() { return history.state && typeof history.state === 'object' ? history.state : {}; }
  function withY(st) { var o = {}; Object.keys(st || {}).forEach(function (key) { o[key] = st[key]; }); o.y = window.scrollY || 0; return o; }
  function writeHash(push) {
    var h = hashOf(), url = location.pathname + location.search + h;
    try {
      if (push) {
        history.replaceState(withY(curState()), '', location.href);
        history.pushState({ skt: 'p', y: 0 }, '', url);
      } else if (h !== location.hash || (!h && location.href.indexOf('#') >= 0)) {
        history.replaceState(withY(curState()), '', url);
      }
    } catch (e) {  }
    lastHash = location.hash;
  }

  var KEEP = { w: 'sk.w', side: 'sk.side', list: 'sk.list', show: 'sk.show', lx: 'sk.lx', g: 'sk.g', pr: 'sk.pr', cm: 'sk.cm', cs: 'sk.cs' };
  function sortKey() { return 'sk.sort.' + (S.v || 'board'); }
  function loadSort() {
    S.so = ''; S.sd = 1;
    var raw = lget(sortKey());
    if (!raw) return;
    try { var a = JSON.parse(raw); if (Array.isArray(a) && SKT.SORT_RX.test(a[0] || '')) { S.so = a[0]; S.sd = a[1] < 0 ? -1 : 1; } } catch (e) {  }
  }
  function loadStorage() {
    Object.keys(KEEP).forEach(function (key) { var v = lget(KEEP[key]); if (v != null && v !== 'null') S[key] = v; });
    var ln = lget('sk.lens');
    if (ln && ln !== 'null') { S.lens = ln.replace(/-$/, ''); S.dir = /-$/.test(ln) ? -1 : 1; }
    loadSort();
  }
  function persist(patch) {
    Object.keys(KEEP).forEach(function (key) { if (key in patch) lset(KEEP[key], S[key] === defaults()[key] ? null : String(S[key])); });
    if ('lens' in patch || 'dir' in patch) lset('sk.lens', S.lens === 'skew' && S.dir > 0 ? null : S.lens + (S.dir < 0 ? '-' : ''));
    if ('so' in patch || 'sd' in patch || 'lens' in patch) lset(sortKey(), S.so ? JSON.stringify([S.so, S.sd]) : null);
  }

  SKT.go = function (patch, opts) {
    patch = patch || {}; opts = opts || {};
    var prev = { open: S.open, v: S.v, vp: S.vp, lens: S.lens };
    Object.keys(patch).forEach(function (key) {
      var v = patch[key];
      if (key === 'f') v = v instanceof Set ? new Set(v) : new Set(Array.isArray(v) ? v : []);
      S[key] = v;
    });
    if ('lens' in patch && patch.lens !== prev.lens && !('so' in patch)) { S.so = ''; S.sd = 1; }
    if ('v' in patch && patch.v !== prev.v && !('so' in patch)) loadSort();
    normalize();
    persist(patch);
    var closing = !!prev.open && !S.open, entering = !prev.open && !!S.open, viewChg = prev.v !== S.v;
    if (closing && curState().skt === 'p' && opts.push !== false) {
      try { history.back(); return; } catch (e) {  }
    }
    var push = opts.push === false ? false : opts.push === true ? !closing : (entering || viewChg);
    writeHash(push);
    if (entering) window.scrollTo(0, 0);
    SKT.emit('state', patch);
    if (prev.open !== S.open || viewChg || prev.vp !== S.vp) SKT.emit('route', { open: S.open, v: S.v });
    render();
  };
  function revalidate() { var h = hashOf(); normalize(); if (hashOf() !== h || h !== location.hash) writeHash(false); }
  function fromAddress(restoreY) {
    var d = defaults(), keepQ = S.q;
    Object.keys(d).forEach(function (key) { S[key] = d[key]; });
    S.q = keepQ;
    loadSort();
    applyHash(location.hash);
    normalize();
    if (hashOf() !== location.hash) writeHash(false);
    lastHash = location.hash;
    var wasOpen = render.lastOpen;
    render();
    SKT.emit('route', { open: S.open, v: S.v });
    if (restoreY != null) requestAnimationFrame(function () { window.scrollTo(0, restoreY); });
    else if (!wasOpen && S.open) window.scrollTo(0, 0);
  }
  function onAddress(e) {
    if (e.type === 'hashchange' && location.hash === lastHash) return;
    if (location.hash && !known(location.hash)) { writeHash(false); return; }
    var st = e.type === 'popstate' && e.state && typeof e.state === 'object' ? e.state : null;
    fromAddress(st && typeof st.y === 'number' ? st.y : null);
  }
  window.addEventListener('popstate', onAddress);
  window.addEventListener('hashchange', onAddress);
  var yT = null;
  window.addEventListener('scroll', function () {
    clearTimeout(yT);
    yT = setTimeout(function () { try { history.replaceState(withY(curState()), '', location.href); } catch (e) {  } }, 200);
  }, { passive: true });


  var holds = new Set(), pendingDoc = null;
  SKT.hold = function (key, on) {
    if (on) holds.add(key); else holds.delete(key);
    if (!holds.size && pendingDoc) renderStatus();
  };


  function safe(label, fn) { try { fn(); } catch (e) { console.error('[skew] ' + label, e); } }
  var mode = '';
  function setMode(m) {
    if (m === mode) return;
    var b = document.body;
    ['m-board', 'm-view', 'm-name', 'm-off'].forEach(function (c) { b.classList.toggle(c, c === 'm-' + m); });
    mode = m;
  }
  function render() {
    document.documentElement.classList.toggle('puts', S.side === 'P');
    renderStatus();
    if (!SKT.D) { setMode('off'); render.lastOpen = null; return; }
    safe('window chips', renderWin);
    var was = render.lastOpen;
    setMode(S.open ? 'name' : S.v ? 'view' : 'board');
    if (was && !S.open && SKT.name && SKT.name.close) safe('name.close', function () { SKT.name.close(); });
    if (!S.open && SKT.board && SKT.board.render) safe('board', function () { SKT.board.render(); });
    if (!S.open && SKT.views) {
      if (SKT.views.bar) safe('views.bar', function () { SKT.views.bar(); });
      if (S.v && SKT.views.render) safe('views', function () { SKT.views.render(S.v, S.vp); });
    }
    if (S.open && SKT.name && SKT.name.render) safe('name', function () { SKT.name.render(); });
    render.lastOpen = S.open;
    safe('footer', renderFoot);
    if (covFor !== SKT.D.generated) safe('coverage', renderCov);
  }
  render.lastOpen = null;
  SKT.render = render;
  SKT.renderWin = function () { if (SKT.D) safe('window chips', renderWin); };


  var failMsg = null, updating = false;
  function stateOf() {
    var st = SKT.STATUS, D = SKT.D;
    if (failMsg && !D) return retries > 1 ? 'error' : 'wait';
    if (updating) return 'updating';
    if (!st && !D) return 'wait';
    var s = (st && st.state) || 'daily', due = st && st.due ? Date.parse(st.due) : NaN;
    if (isFinite(due) ? Date.now() > due + 12 * 3.6e6 : (D && Date.now() - Date.parse(D.generated) > 36 * 3.6e6)) s = 'stale';
    if (CHIP[s] == null) s = 'daily';
    return s;
  }
  var CHIP = { daily: ['DAILY', 's-daily'], filling: ['FILLING IN', 's-fill'], stale: ['STALE', 's-stale'], error: ['ERROR', 's-error'],
    updating: ['UPDATING', 's-upd'], wait: ['LOADING', 's-wait'] };
  var CHIP_TIP = {
    daily: 'Every name of the newest settle is in.',
    filling: 'The newest settle is still coming in: more names land with each update, and ranks move until it is complete.',
    stale: 'The next settle is overdue: these numbers are from the last build that finished.',
    error: 'The last update did not finish; the numbers shown are from the build before it.',
    updating: 'The data is moving to a new version.',
    wait: ''
  };
  function fillTime() { var d = new Date(); d.setUTCHours(5, 30, 0, 0); return SKT.HOME ? '13:30 Taipei' : timeLocal(d.toISOString()); }

  function progTxt() { var p = PROG; return p.total > 0 && p.got > 0 && p.got < p.total ? ' ' + (p.got / 1e6).toFixed(1) + ' of ' + (p.total / 1e6).toFixed(1) + ' MB' : ''; }
  var progT = null;
  function progWatch() {
    if (progT) return;
    progT = setInterval(function () {
      var a = $('asof');
      if (SKT.D || !a) { clearInterval(progT); progT = null; return; }
      a.textContent = (failMsg || 'Fetching the latest numbers…') + progTxt();
    }, 1000);
  }
  function renderStatus() {
    var box = $('status');
    if (!box) return;
    var el = SKT.ui.el, D = SKT.D, st = SKT.STATUS || {}, s = stateOf();
    box.textContent = '';
    var row = el('div', 'status-row'), chip = el('span', 'schip ' + CHIP[s][1], CHIP[s][0]);
    chip.id = 'chip';
    if (CHIP_TIP[s]) SKT.ui.tip(chip, CHIP_TIP[s]);
    row.appendChild(chip);
    var asof = el('span', 'asof'); asof.id = 'asof';
    row.appendChild(asof);
    box.appendChild(row);
    if (s === 'updating') { asof.textContent = 'Moving to a new version; the numbers return within the hour.'; return; }
    if (!D) { asof.textContent = (failMsg || 'Fetching the latest numbers…') + progTxt(); progWatch(); return; }
    var L = D.latest, fullN = D.full_n || st.full_n, latN = D.latest_n, filling = s === 'filling';
    var bits = ['Open interest to the ' + day(L) + ' settle'];
    if (isNum(latN)) bits.push(filling && isNum(fullN) && fullN > latN ? num(latN) + ' of ' + num(fullN) + ' names so far' : num(latN) + ' names');
    bits.push('prices to the ' + dayShort(L) + ' close');
    var p = D.periods && D.periods[S.w];
    if (S.w === 'tape' && D.tape) bits.push('Tape = traded ' + day(D.tape.T) + ', not settled yet');
    else if (p && p.base) bits.push(SKT.winLabel(S.w) + ' = since the ' + dayShort(p.base) + ' settle');
    var g = D.generated || st.generated;
    if (g) {
      var sameDay = new Date(g).toDateString() === new Date().toDateString();
      bits.push('updated ' + (sameDay ? '' : localDay(g, true) + ' ') + SKT.fmt.time(g));
    }
    bits.forEach(function (b, i) { if (i) asof.appendChild(document.createTextNode(' · ')); asof.appendChild(el('span', 'seg-t', b)); });

    var last = (D.sessions || [])[D.sessions ? D.sessions.length - 1 : 0];
    if (last) {
      var cov = el('span', 'covchips');
      [['full detail', last[2]], ['net only', last[3]], ['joined', last[4]], ['searchable', D.search_n]].forEach(function (c) {
        if (!isNum(c[1])) return;
        var b = el('button', 'cchip', c[0] + ' ' + num(c[1])); b.type = 'button';
        SKT.ui.tip(b, 'Names on the ' + dayShort(last[0]) + ' settle by kind of reading; open Days on record');
        b.addEventListener('click', openCov);
        cov.appendChild(b);
      });
      row.appendChild(cov);
    }
    if (pendingDoc) {
      var nb = el('button', 'schip s-new', 'New build ' + SKT.fmt.time(pendingDoc.generated) + ' · refresh'); nb.type = 'button';
      nb.addEventListener('click', function () { var d = pendingDoc; pendingDoc = null; applyData(d); });
      row.appendChild(nb);
    }
    var notes = [];
    if (filling) {
      notes.push(dayShort(L) + ' settle still filling in: ' + (isNum(latN) ? num(latN) : '–') + (isNum(fullN) ? ' of ' + num(fullN) : '') +
        ' names; the rest usually land about ' + fillTime() + ' and ranks will move.');
    }
    if (D.next && D.next.n) notes.push(day(D.next.day) + ': ' + num(D.next.n) + ' names in so far; the rest arrive with the next update.');
    if (notes.length) box.appendChild(el('p', 'status-line', notes.join(' ')));
    hooks.status.forEach(function (fn) { safe('status line', function () { fn(box); }); });
  }
  function openCov() {
    var c = $('covBox');
    if (!c) return;
    c.open = true;
    c.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }



  function winCount(w) {
    if (SKT.board && SKT.board.count) { try { return SKT.board.count(w, S.side, S.list); } catch (e) { console.error('[skew] board.count', e); } }
    return SKT.count(w, S.side, S.list);
  }
  function renderWin() {
    var box = $('winChips'), D = SKT.D;
    if (!box) return;
    box.textContent = '';
    var items = [], per = D.periods || {};
    SKT.WINS.forEach(function (w) {
      var win = w === 'tape' ? D.tape : D.windows && D.windows[w];
      if (!win) return;
      var p = per[w] || {}, label = SKT.winLabel(w), tipT;
      if (w === '1d') { label += ' · ' + day(p.to || win.to); tipT = 'The newest settle: open interest after that session, posted the next trading day; it fills in by about ' + fillTime() + '.'; }
      else if (w === 'all') {
        label += ' · since ' + dayShort(p.since || win.frm);
        tipT = 'every saved settle since ' + day(p.since || win.frm) + ', ' + num(p.n || win.n) + ' sessions; day detail covers the newest ' + ((D.sessions || []).length || 25);
      } else if (w === 'tape') { label += ' · ' + day(win.T); tipT = 'Traded, not settled yet: where more contracts traded than were open that morning, the difference must be new'; }
      else tipT = num(p.n || win.n) + ' settles · ' + dayShort(p.since || win.frm) + ' → ' + dayShort(p.to || win.to);
      items.push({ k: w, label: label, short: SKT.winLabel(w, true), n: winCount(w), tip: tipT });
    });
    box.appendChild(SKT.ui.chips(items, S.w, function (w) { SKT.go({ w: w }); }, { cls: 'win', aria: 'Time frame' }));
  }


  var covFor = null;
  function renderCov() {
    var box = $('covBox'), D = SKT.D, el = SKT.ui.el;
    if (!box) return;
    covFor = D.generated;
    var open = box.open;
    box.textContent = '';
    box.appendChild(el('summary', null, 'Days on record'));
    var body = el('div', 'fold-body');
    body.appendChild(el('p', 'src', 'How many names each settle covers. Full detail = calls and puts read separately from saved option chains; ' +
      'net only = an older daily snapshot that kept the overall tilt but not each side; joined = two or three sessions folded together ' +
      'because the days between were never saved. Searchable = every other tracked name.'));
    var ses = (D.sessions || []).slice().reverse(), mx = 1;
    ses.forEach(function (x) { if (isNum(x[1])) mx = Math.max(mx, x[1]); });
    var cols = [
      { k: 'd', label: 'Day', f: function (x) { return day(x[0]); } },
      { k: 'n', label: 'Names', num: true, f: function (x) { return x[1] ? num(x[1]) : '–'; } },
      { k: 'c', label: 'Full detail', num: true, f: function (x) { return x[2] ? num(x[2]) : '–'; } },
      { k: 's', label: 'Net only', num: true, f: function (x) { return x[3] ? num(x[3]) : '–'; } },
      { k: 'j', label: 'Joined', num: true, f: function (x) { return x[4] ? num(x[4]) : '–'; } },
      { k: 'b', label: 'Chains · snapshots (joined underlined)', cls: 'covbar-c', f: function (x) {
        var b = el('span', 'covbar'), seg2 = function (cls, v) { if (v > 0) { var i = el('i', cls); i.style.width = (v / mx * 100).toFixed(2) + '%'; b.appendChild(i); } };
        seg2('ch', x[2] || 0); seg2('sn', x[3] || 0);
        if (x[4] > 0) { var jb = el('b', 'jn'); jb.style.width = (x[4] / mx * 100).toFixed(2) + '%'; b.appendChild(jb); }
        SKT.ui.tip(b, day(x[0]) + ': ' + num(x[2] || 0) + ' from chains (' + num(x[4] || 0) + ' joined) · ' + num(x[3] || 0) + ' from snapshots');
        return b;
      } }
    ];
    body.appendChild(SKT.ui.table(cols, ses, { cls: 'covtbl' }));
    box.appendChild(body);
    box.open = open;
  }


  function renderFoot() {
    var p = $('footDyn'), D = SKT.D;
    if (!p) return;
    var shown = SKT.board && SKT.board.count ? SKT.board.count(S.w, S.side, S.list) : SKT.count(S.w, S.side, S.list);
    var total = Object.keys(D.rows || {}).length + (D.search_n || 0);
    p.textContent = 'Showing ' + num(shown) + ' of ' + num(total) + ' names. Built ' + localDay(D.generated) + ' ' + SKT.fmt.time(D.generated) + '.';
  }


  function deriveStatus(D) {
    var filling = (isNum(D.latest_n) && isNum(D.full_n) && D.latest_n < 0.9 * D.full_n) || !!D.next;
    return { schema: 3, latest: D.latest, latest_n: D.latest_n, full_n: D.full_n, next: D.next, tape_T: D.tape ? D.tape.T : null,
      state: filling ? 'filling' : 'daily', due: null, generated: D.generated, derived: true };
  }
  function applyData(doc) {
    var first = !SKT.D, y = window.scrollY;
    if (SKT.D && SKT.D.latest !== doc.latest) SKT.VIEWS = null;
    if (SKT.VIEWS && SKT.VIEWS.latest !== doc.latest) SKT.VIEWS = null;
    if (SKT.SEARCH && SKT.SEARCH.generated !== doc.generated) SKT.SEARCH = null;
    searchP = null; viewsP = null;
    unescNames(doc.rows);
    SKT.D = doc;
    Object.keys(NF).forEach(function (s) { var r = SKT.row(s); if (NFL[s] !== doc.latest || (r && !r.nf)) { delete NF[s]; delete NFL[s]; } });
    var st0 = SKT.STATUS;
    if (!(st0 && !st0.derived && st0.generated === doc.generated)) {
      SKT.STATUS = deriveStatus(doc);
      if (st0 && !st0.derived && st0.latest === doc.latest && st0.due) SKT.STATUS.due = st0.due;
    }
    failMsg = null; updating = false; pendingDoc = null; retries = 0; clearTimeout(retryT);
    normalize();
    if (first) writeHash(false);
    SKT.emit('data', doc);
    render();
    if (!first) requestAnimationFrame(function () { window.scrollTo(0, y); });
  }
  function takeDoc(doc, st) {
    if (!doc || typeof doc !== 'object') throw new Error('unexpected data');
    if (doc.schema === 2 && !SKT.D) { updating = true; render(); return; }
    if (doc.schema !== 3 || !doc.windows || !doc.rows) throw new Error('unexpected data');
    if (st && st.schema === 3 && st.generated === doc.generated) SKT.STATUS = st;
    if (SKT.D && holds.size) { pendingDoc = doc; renderStatus(); return; }
    applyData(doc);
  }
  var retryT = null, retries = 0;
  function fail(e) {
    if (SKT.D) return;
    retries++;
    failMsg = retries > 1 ? 'Could not load the numbers (' + (e && e.message ? e.message : 'error') + '). Trying again shortly.'
      : 'Taking longer than usual; trying again…';
    render();
    clearTimeout(retryT);
    if (retries <= 6) retryT = setTimeout(tick, retries === 1 ? 0 : Math.min(60000, 5000 * (retries - 1)));
  }
  var lastTick = 0;
  function tick() {
    lastTick = Date.now();
    hooks.tick.forEach(function (fn) { safe('tick', fn); });
    var stP = SKT.getJSON(SKT.dataUrl('status.json')).then(function (j) { return j && j.schema === 3 ? j : null; }, function () { return null; });
    return stP.then(function (st) {
      if (st && SKT.D && st.generated === SKT.D.generated) { SKT.STATUS = st; renderStatus(); return; }
      if (st && pendingDoc && st.generated === pendingDoc.generated) {
        if (holds.size) renderStatus(); else { var pd = pendingDoc; pendingDoc = null; SKT.STATUS = st; applyData(pd); }
        return;
      }
      var opts = st ? { bust: st.generated } : null;
      return SKT.getJSON(SKT.dataUrl('skew.json'), opts).then(function (doc) {
        if (SKT.D && doc && doc.generated === SKT.D.generated) { if (st) SKT.STATUS = st; renderStatus(); return; }
        takeDoc(doc, st);
      });
    }).catch(fail);
  }
  SKT.tick = tick;

  SKT.start = function () {
    var cur = document.querySelector('.tab[aria-current=page]');
    if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) cur.parentNode.scrollLeft = cur.offsetLeft;
    try { history.scrollRestoration = 'manual'; } catch (e) {  }
    S = SKT.S;
    loadStorage();
    applyHash(location.hash);
    normalize();
    lastHash = location.hash;
    hooks.start.forEach(function (fn) { safe('start', fn); });
    var skip = document.querySelector('a.skip');
    if (skip) skip.addEventListener('click', function (e) {
      var t = $(S.open ? 'name' : S.v ? 'view' : 'list');
      if (!t) return;
      e.preventDefault();
      t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); t.scrollIntoView({ block: 'start' });
    });
    render();
    tick();
    setInterval(function () { if (!document.hidden) tick(); }, POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - lastTick >= POLL_MS) tick(); });
  };


  document.addEventListener('DOMContentLoaded', function () { SKT.start(); });
})();
