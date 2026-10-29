'use strict';






(function (root) {
  const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const M = '−', DASH = '–', SEP = ' <i class="sep">·</i> ';
  const REFRESH_MS = 5 * 60 * 1000;
  const TABLE_MIN = 900;
  const PHONE = 760;
  const PAGE = 100;
  const DEF = { w: '1w', l: 'top', u: 'all', f: '', q: '', o: '', od: 0, s: '' };
  const KEYS = ['w', 'l', 'u', 'f', 'q', 'o', 'od', 's'];
  const SYM_RX = /^[A-Z0-9][A-Z0-9-]{0,11}$/;

  const UTAG = [['spx', 'S&P'], ['ndx', 'NDX'], ['ai', 'AI']];

  const QBADGE = [['bought', 'bought'], ['spread', 'spread'], ['roll', 'roll'], ['onebig', 'one trade']];
  const QWORD = { bought: 'bought (ask-side buying)', sold: 'sold (call selling at the bid)', spread: 'looks like a spread',
                  roll: 'looks like a roll', itm: 'mostly deep in the money',
                  fresh: 'new money', unwinding: 'pile shrinking', onebig: 'one large trade', mixed: 'bought and sold both' };
  const LDEF = { top: 'by score',
                 size: "by the Skew Tracker's bet size: premium of the call contracts opened in the window; names off its " +
                   "call list follow by the largest money in another board's flag",
                 boards: 'by how many boards flag the name, then score',
                 skew: "by the name's place on the Skew Tracker's call list, then score",
                 new: 'by the first day any board flagged the name, newest first' };
  const SIZE_DEF = "premium of the call contracts opened in the window (Skew Tracker, OI-confirmed, at each option's closing mid)";

  const QPTS = { bought: 'bought (ask-side buying)', fresh: "flagged on its board's newest day", sold: 'sold (call selling)',
                 puts: 'put flags' };




  const PREM = { loud: ['Calls added', 'net, all its calls that session, at the closing mid'],
                 stealth: ['Calls added', 'net over its build, at the last close'],
                 ladder: ['Calls added', 'net, all its calls'],
                 leap: ['New money', 'added to the pile in the window'],
                 russell: ['Bull-side premium', 'traded that session (whole name, weighted by print side)'] };
  const PREM_PUT = { loud: ['Puts added', 'net, all its puts that session, at the closing mid'],
                     russell: ['Bear-side premium', 'traded that session (whole name, weighted by print side)'] };


  const STWORD = { ok: 'current', filling: 'filling', idle: 'idle', behind: 'behind', stale: 'stale', missing: 'missing', error: 'error' };
  const WARN = ['behind', 'stale', 'missing', 'error'];


  const AGE_OK = 36 * 60, AGE_OLD = 4 * 1440;
  const RETRY_MS = 30 * 1000;
  const MIX_MS = 60 * 1000;
  const CDN_MS = 5 * 60 * 1000;

  const SITE = 'https://lawrencekenshin.github.io/mii-lab/';
  const OPEN_IN = [['eagle-eye', '?s=', 'Eagle Eye Technicals', 'chart, GEX levels and the Desktop Integrated table'],
                   ['flow', '?s=', 'Flow Dashboard', 'whale / retail chips, dark pool and short interest'],
                   ['king-gex', '#s=', 'King GEX Tracker', 'king node, flip and walls for every saved session']];


  const GH = HAS_DOM && /(^|\.)github\.io$/i.test(location.hostname);
  const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/top-call-skews-data/top-call-skews/';
  const TITLE = (HAS_DOM && document.title) || 'Top Call Skews';

  const S = Object.assign({}, DEF);
  let D = null, STATUS = null, NOWMS = null, FORCE_W = null, LASTFETCH = 0, LASTMODE = null, SRC_OPEN = false, LIMIT = PAGE;
  let PENDING = null, RETRY = null;
  let HSTATE = null;
  let BASE = GH ? RAW : 'snap/', VER = '';
  let LOADING = false, TAKEN = 0, FROM = '';

  const IDX = {};
  const $ = s => (HAS_DOM ? document.querySelector(s) : null);


  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const unent = s => String(s == null ? '' : s).replace(/&(amp|lt|gt|quot|#39);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  const str = v => typeof v === 'string' && v.trim() !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const num = v => (ok(v) ? v : null);
  const t1 = x => x.toFixed(1).replace(/\.0$/, '');
  const grp = t => { const [i, f] = t.split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f != null ? '.' + f : ''); };
  const int = v => (ok(v) ? (v < 0 ? M : '') + grp(String(Math.round(Math.abs(v)))) : DASH);
  function kc(n) {
    if (!ok(n)) return DASH;
    const a = Math.abs(n), s = n < 0 ? M : '';
    if (a >= 9.995e7) return s + Math.round(a / 1e6) + 'M';
    if (a >= 999.5e3) return s + t1(a / 1e6) + 'M';
    if (a >= 99.95e3) return s + Math.round(a / 1e3) + 'k';
    if (a >= 999.5) return s + t1(a / 1e3) + 'k';
    return s + Math.round(a);
  }
  const kcs = n => (ok(n) && n > 0 ? '+' : '') + kc(n);
  function money(v) {
    if (!ok(v)) return DASH;
    const a = Math.abs(v), s = v < 0 ? M : '';
    const t = a >= 999.5e6 ? (a / 1e9).toFixed(2) + 'B' : a >= 99.95e6 ? Math.round(a / 1e6) + 'M'
      : a >= 9.995e6 ? (a / 1e6).toFixed(1) + 'M' : a >= 999.5e3 ? (a / 1e6).toFixed(2) + 'M'
        : a >= 999.5 ? Math.round(a / 1e3) + 'K' : String(Math.round(a));
    return s + '$' + t;
  }
  function usd(v) {
    if (!ok(v)) return DASH;
    const a = Math.abs(v), s = v < 0 ? M + '$' : '$';
    return s + (a >= 1e9 ? (a / 1e9).toFixed(1) + 'B' : a >= 1e8 ? Math.round(a / 1e6) + 'M' : a >= 1e5 ? (a / 1e6).toFixed(1) + 'M'
      : a >= 1e3 ? Math.round(a / 1e3) + 'K' : String(Math.round(a)));
  }
  function pcs(x, d = 1) {
    if (!ok(x)) return DASH;
    const t = Math.abs(x * 100).toFixed(d);
    return (+t === 0 ? '' : x > 0 ? '+' : M) + t + '%';
  }
  const pcu = (x, d = 1) => (ok(x) ? (x < 0 && +Math.abs(x * 100).toFixed(d) !== 0 ? M : '') + Math.abs(x * 100).toFixed(d) + '%' : DASH);
  const fk = k => (ok(k) ? String(+k.toFixed(2)) : DASH);
  const fpx = v => (ok(v) ? (v < 0 ? M : '') + grp(Math.abs(v).toFixed(Math.abs(v) < 1 ? 4 : 2)) : DASH);
  const ratio = x => (!ok(x) ? DASH : x >= 99 ? 'calls only' : (x >= 9.95 ? x.toFixed(0) : x.toFixed(1)) + '×');
  function isoDate(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d == null ? '' : d));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  function day(d) { const t = isoDate(d); return t ? `${MON[t.getUTCMonth()]} ${t.getUTCDate()}` : DASH; }
  const dayNum = d => { const t = isoDate(d); return t ? t.getTime() : null; };
  function baseYear() {
    const t = isoDate(obj(D && D.asof).settle) || isoDate(obj(D && D.asof).close);
    return t ? t.getUTCFullYear() : new Date(now()).getUTCFullYear();
  }
  function expTxt(e) {
    const t = isoDate(e);
    if (!t) return DASH;
    return day(e) + (t.getUTCFullYear() !== baseYear() ? ' ’' + String(t.getUTCFullYear()).slice(2) : '');
  }
  function spanTxt(a, b) {
    const x = isoDate(a), y = isoDate(b);
    if (!x && !y) return '';
    if (!x || !y || x.getTime() === y.getTime()) return day(x ? a : b);
    if (x.getUTCFullYear() === y.getUTCFullYear() && x.getUTCMonth() === y.getUTCMonth()) return `${MON[x.getUTCMonth()]} ${x.getUTCDate()}–${y.getUTCDate()}`;
    return `${day(a)} – ${day(b)}`;
  }
  function ago(min) {
    if (min < 1) return 'just now';
    if (min < 90) return `${Math.round(min)} minutes ago`;
    if (min < 48 * 60) return `${Math.round(min / 60)} hours ago`;
    return `${Math.round(min / 1440)} days ago`;
  }
  const chg = v => (ok(v) ? `<span class="${v > 0 ? 'up' : v < 0 ? 'dn' : ''}">${pcs(v)}</span>` : `<span class="muted">${DASH}</span>`);
  const famCls = id => 'f-' + String(id == null ? '' : id).toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const normSym = s => { const v = String(s == null ? '' : s).trim().toUpperCase().replace(/[./]/g, '-'); return SYM_RX.test(v) ? v : ''; };
  const qOf = fl => arr(obj(fl).q).filter(str);
  const isSold = fl => qOf(fl).includes('sold');
  const live = fl => !!fl && obj(fl).stale !== true;
  const goodRow = r => !!r && typeof r === 'object' && !Array.isArray(r) && str(r.s);
  const now = () => (NOWMS != null ? NOWMS : Date.now());
  const width = () => (FORCE_W != null ? FORCE_W : HAS_DOM ? window.innerWidth : 1280);
  const isTable = () => width() >= TABLE_MIN;
  const isPhone = () => width() < PHONE;
  const mode = () => (isPhone() ? 'phone' : isTable() ? 'table' : 'cards');


  function setData(d) { D = d && typeof d === 'object' && !Array.isArray(d) ? d : null; for (const k of Object.keys(IDX)) delete IDX[k]; clean(); }
  const fams = () => IDX.fams || (IDX.fams = arr(D && D.families).filter(f => f && str(f.id)));
  const wins = () => IDX.wins || (IDX.wins = arr(D && D.windows).filter(w => w && str(w.id)));
  const lenses = () => IDX.lens || (IDX.lens = (l => (l.length ? l : [{ id: 'top', label: 'Top' }]))(arr(D && D.lenses).filter(x => x && str(x.id))));
  const unis = () => IDX.unis || (IDX.unis = (u => (u.length ? u : [{ id: 'all', label: 'All' }]))(arr(D && D.unis).filter(x => x && str(x.id))));
  const rowsOf = w => arr(obj(D && D.rows)[w]);
  const nameOf = s => obj(obj(D && D.names)[s]);
  const famById = id => fams().find(f => f.id === id) || null;
  const winById = id => wins().find(w => w.id === id) || null;
  const lensById = id => lenses().find(l => l.id === id) || null;
  const uniById = id => unis().find(u => u.id === id) || null;
  function srcById(id) {
    if (!IDX.src) { IDX.src = {}; for (const x of arr(D && D.sources)) if (x && str(x.id)) IDX.src[x.id] = x; }
    return IDX.src[id] || null;
  }
  const srcAsOf = id => obj(srcById(id)).as_of || null;
  const srcName = id => { const x = srcById(id); return x ? x.name || x.id : str(id) ? id : 'its board'; };
  function bySym(w) {
    const k = 'sym:' + w;
    if (!IDX[k]) { IDX[k] = new Map(); for (const r of rowsOf(w)) if (goodRow(r) && !IDX[k].has(r.s)) IDX[k].set(r.s, r); }
    return IDX[k];
  }
  function cpOf(s) {
    const c = arr(nameOf(s).cp);
    return c.length === 4 && ok(c[0]) && ok(c[1]) && c[0] >= 0 && c[1] >= 0 && c[0] + c[1] > 0 ? c : null;
  }
  function kingOf(s) { const k = obj(nameOf(s).king); return ok(k.k) ? k : null; }

  const sinceOf = r => { const v = obj(D && D.firstever)[r.s], a = str(r.first) ? r.first : null; return str(v) ? (a && a < v ? a : v) : a; };

  const oldDay = n => { const c = obj(D && D.asof).close; return str(n.pday) && str(c) && n.pday !== c ? n.pday : null; };
  const partsOf = r => { const p = arr(r.p); return [0, 1, 2].map(i => (ok(p[i]) ? Math.round(p[i]) : 0)); };


  function clean() {
    S.q = String(S.q == null ? '' : S.q).slice(0, 40);
    S.od = S.od === 1 || S.od === -1 ? S.od : 0;
    S.s = normSym(S.s);
    if (!D) return;
    const w = wins().map(x => x.id), l = lenses().map(x => x.id), u = unis().map(x => x.id);
    if (!w.includes(S.w)) S.w = w.includes(DEF.w) ? DEF.w : (w[0] || DEF.w);
    if (!l.includes(S.l)) S.l = l.includes(DEF.l) ? DEF.l : l[0];
    if (!u.includes(S.u)) S.u = u.includes(DEF.u) ? DEF.u : u[0];
    if (S.f && !famById(S.f)) S.f = '';
    if (S.o && !COLS.some(c => c.k === S.o && c.v)) { S.o = ''; S.od = 0; }
    if (!S.o) S.od = 0;
  }
  function readHash(h) {
    let p;
    try { p = new URLSearchParams(String(h == null ? '' : h).replace(/^#/, '')); } catch (e) { p = new URLSearchParams(''); }
    const g = k => p.get(k) || '';
    Object.assign(S, { w: g('w') || DEF.w, l: g('l') || DEF.l, u: g('u') || DEF.u, f: g('f'), q: g('q'), o: g('o'),
                       od: +g('od') || 0, s: g('s') });
    clean();
  }
  function hashOf() {
    const out = [];
    for (const k of KEYS) {
      const v = S[k];
      if (v === DEF[k] || v === '' || v === 0 || v == null || (k === 'od' && !S.o)) continue;
      out.push(k + '=' + encodeURIComponent(String(v)));
    }
    return out.length ? '#' + out.join('&') : '';
  }
  function syncHash(push, state) {
    if (!HAS_DOM || !window.history) return;
    const url = location.pathname + location.search + hashOf();
    try {
      if (push) {


        history.replaceState(Object.assign({}, history.state, { base: 1 }), '', location.pathname + location.search + location.hash);
        history.pushState(state || {}, '', url);
        HSTATE = history.state;
      } else history.replaceState(history.state, '', url);
    } catch (e) {  }
  }



  const COLS = [
    { k: 'rk', h: '#', cls: 'c-rk', tip: 'the lens order' },
    { k: 'name', h: 'Name', cls: 'c-name', v: x => x.r.s, d: 1, tip: 'ticker, A to Z' },
    { k: 'score', h: 'Score', cls: 'c-sc', v: x => num(x.r.sc), d: -1, tip: 'score 0-100: OI skew + other boards + quality' },
    { k: 'boards', h: 'Boards', cls: 'c-boards', v: x => num(x.r.nf), d: -1, tip: 'how many boards flag the name' },
    { k: 'opened', h: 'Calls : puts opened', cls: 'c-op', v: x => openedOf(x.r).pct, d: -1,
      tip: "calls and puts opened in the window; sorts by the share of the name's book" },

    { k: 'size', h: 'Bet size', cls: 'c-op', sub: 1, v: x => num(x.r.size), d: -1, tip: "the Skew Tracker's bet size: " + SIZE_DEF },
    { k: 'book', h: 'Book calls : puts', cls: 'c-book', v: x => { const c = cpOf(x.r.s); return c ? c[0] / (c[0] + c[1]) : null; }, d: -1,
      tip: "calls' share of every open contract, white tick = a week ago (shown, not scored)" },
    { k: 'main', h: 'Main bet', cls: 'c-main', v: x => { const c = mainMoney(x.r); return c ? c.usd : null; }, d: -1,
      tip: 'the main call bet; sorts by the money opened in that contract' },
    { k: 'king', h: 'King', cls: 'c-king', v: x => { const k = kingOf(x.r.s); return k ? num(k.dist) : null; }, d: -1,
      tip: 'King GEX Tracker king strike and its distance from the price (shown, not scored)' },
    { k: 'biz', h: 'Business', cls: 'c-biz', v: x => num(nameOf(x.r.s).biz), d: -1, tip: 'business score 0-100 (shown, not scored)' },
    { k: 'price', h: 'Price', cls: 'c-px', v: x => num(nameOf(x.r.s).d1), d: -1, tip: 'close, 1-day and 20-day change; sorts by the 1-day change' },
    { k: 'since', h: 'Since', cls: 'c-since', v: x => dayNum(sinceOf(x.r)), d: -1, tip: 'the first day any board flagged the name, newest first' },
  ];
  const sortCol = () => (S.o ? COLS.find(c => c.k === S.o && c.v) || null : null);
  const range = n => Array.from({ length: n }, (_, i) => i);
  function lensOrder(w, l, n) {
    if (l === 'top') return range(n);
    const o = arr(obj(obj(D && D.orders)[w])[l]);
    if (!o.length) return range(n);
    const seen = new Set(), out = [];
    for (const i of o) if (Number.isInteger(i) && i >= 0 && i < n && !seen.has(i)) { seen.add(i); out.push(i); }
    for (let i = 0; i < n; i++) if (!seen.has(i)) out.push(i);
    return out;
  }
  const inUni = (s, u = S.u) => u === 'all' || arr(nameOf(s).u).includes(u);
  function matches(s, q) {
    const T = q.toUpperCase().replace(/[./]/g, '-');
    if (s.startsWith(T)) return true;
    return q.length >= 2 && unent(nameOf(s).n || '').toLowerCase().includes(q.toLowerCase());
  }
  function viewRows() {
    const rows = rowsOf(S.w), q = S.q.trim(), out = [];
    for (const i of lensOrder(S.w, S.l, rows.length)) {
      const r = rows[i];
      if (!goodRow(r) || !inUni(r.s) || (S.f && !obj(r.f)[S.f]) || (q && !matches(r.s, q))) continue;
      out.push({ r, rk: out.length + 1 });
    }
    const col = sortCol();
    if (col) {
      const dir = S.od || col.d;
      const val = new Map(out.map(x => [x, col.v(x)]));
      out.sort((a, b) => {
        const va = val.get(a), vb = val.get(b);
        if (va == null || vb == null) return va == null && vb == null ? a.rk - b.rk : va == null ? 1 : -1;
        return (va < vb ? -1 : va > vb ? 1 : 0) * (dir < 0 ? -1 : 1) || a.rk - b.rk;
      });
    }
    return out;
  }
  const countRows = (w, u, test) => rowsOf(w).reduce((n, r) => n + (goodRow(r) && inUni(r.s, u) && (!test || test(r)) ? 1 : 0), 0);



  const cpShare = c => c[0] / (c[0] + c[1]);
  const cpWk = c => (ok(c[2]) && ok(c[3]) && c[2] + c[3] > 0 ? c[2] / (c[2] + c[3]) : null);
  function cpLab(c) {
    const sh = cpShare(c), x = sh >= 0.5 ? c[0] / Math.max(c[1], 1) : c[1] / Math.max(c[0], 1), t = x >= 9.95 ? x.toFixed(0) : x.toFixed(1);
    return sh >= 0.55 ? `<b class="up">${t}× calls</b>` : sh <= 0.45 ? `<b class="dn">${t}× puts</b>` : `<b class="cpe">${t}× even</b>`;
  }
  function cpBar(c, cls = '') {
    const sh = cpShare(c), wk = cpWk(c);
    return `<i class="cpb ${cls}"><b style="width:${(sh * 100).toFixed(1)}%"></b><em></em>${wk == null ? '' : `<s style="left:${(wk * 100).toFixed(1)}%"></s>`}</i>`;
  }
  function cpMove(c) {
    const wk = cpWk(c);
    if (wk == null) return '<span class="cpw muted">1W n/a</span>';
    const d = (cpShare(c) - wk) * 100;
    if (Math.abs(d) < 1) return '<span class="cpw muted">1W =</span>';
    return `<span class="cpw ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}pt</span>`;
  }
  function cpTip(c) {
    const wk = cpWk(c);
    return `${kc(c[0])} calls vs ${kc(c[1])} puts open (every strike and expiry), ${Math.round(cpShare(c) * 100)}% calls` +
      (wk == null ? '' : ` · a week ago (same expiries) ${Math.round(wk * 100)}% calls: calls ${c[0] - c[2] >= 0 ? '+' : M}${kc(Math.abs(c[0] - c[2]))}, puts ${c[1] - c[3] >= 0 ? '+' : M}${kc(Math.abs(c[1] - c[3]))}`);
  }
  function cpCell(c) {
    if (!c) return `<span class="muted">${DASH}</span>`;
    return `<div class="cp" title="${esc(cpTip(c))}"><div class="cpt">${cpLab(c)}${cpMove(c)}</div>${cpBar(c)}</div>`;
  }

  const bizCls = v => (v >= 70 ? 'hi' : v >= 50 ? 'mid' : 'lo');
  function bizCell(n) {
    if (!ok(n.biz)) return `<span class="muted">${n.etf ? 'fund' : DASH}</span>`;
    const v = Math.max(0, Math.min(100, Math.round(n.biz)));
    return `<span class="bz ${bizCls(v)}" title="business score ${v}/100 (shown, not scored)"><i><b style="width:${v}%"></b></i><span class="num">${v}</span></span>`;
  }


  function partsBar(p, cls = '') {
    const sk = Math.max(0, p[0]), bd = Math.max(0, p[1]), q = p[2], pre = Math.min(100, sk + bd);
    let segs;
    if (q >= 0) segs = [['ps', sk], ['pbd', Math.min(bd, 100 - sk)], ['pq', Math.min(q, 100 - pre)]];
    else {
      const vis = Math.max(0, pre + q);
      segs = [['ps', Math.min(sk, vis)], ['pbd', Math.max(0, vis - sk)], ['pn', pre - vis]];
    }
    return `<i class="pb ${cls}">${segs.filter(s => s[1] > 0).map(([c, v]) => `<b class="${c}" style="width:${v}%"></b>`).join('')}<u></u></i>`;
  }
  function partsTip(p) {
    const add = [[p[0], 'OI skew'], [p[1], 'other boards'], [p[2], 'quality']].filter(x => x[0] > 0).map(x => x[1]).join(' + ');
    if (p[2] < 0) return add ? `${add} ${M} quality (sold or put flags)` : 'quality taken away (sold or put flags)';
    return add || 'nothing scored in this window';
  }
  function utags(n) {
    const u = arr(n.u);
    return UTAG.filter(t => u.includes(t[0])).map(t => `<span class="ut">${esc(t[1])}</span>`).join('') +
      (n.etf ? '<span class="ut etf">ETF</span>' : '');
  }


  const expired = d => obj(d).expd === true;
  function betTxt(d) {
    if (!ok(d.k)) return '';
    if (expired(d)) return `${fk(d.k)}C · expired${d.exp ? ' ' + expTxt(d.exp) : ''}`;
    return `${fk(d.k)}C${d.exp ? ' ' + expTxt(d.exp) : ''}${ok(d.away) ? ' (' + pcs(d.away) + ' vs price)' : ''}`;
  }
  const dteTxt = n => (n === 0 ? 'expires today' : `${n} ${n === 1 ? 'day' : 'days'} from today`);



  function dRows(d, fam, src, put) {
    d = obj(d);
    const out = [];
    if (ok(d.place)) out.push(['Place', '#' + d.place + (ok(d.of) ? ' of ' + d.of : '') + ' on its list']);
    if (str(d.tier) || ok(d.tier)) out.push(['Tier', String(d.tier)]);
    if (ok(d.score)) out.push(['Board score', t1(d.score)]);
    if (ok(d.cO) || ok(d.pO)) out.push(['Opened', `${ok(d.cO) ? kcs(d.cO) + ' calls' : ''}${ok(d.cO) && ok(d.pO) ? ' · ' : ''}${ok(d.pO) ? kcs(d.pO) + ' puts' : ''}`]);
    if (ok(d.pct)) out.push(['Share of book', pcu(d.pct) + " of the name's open contracts (net call lean)"]);
    if (ok(d.sk)) out.push(['One-sided', pcu(d.sk)]);
    if (ok(d.prem)) {
      const pw = arr((put ? PREM_PUT : PREM)[src]);
      out.push(fam === 'skew' ? ['Bet size', `${usd(d.prem)}: the premium of the ${put ? 'put' : 'call'} contracts opened in the window`]
        : pw.length ? [pw[0], money(d.prem) + ' ' + pw[1]] : ['Premium', money(d.prem)]);
    }
    if (ok(d.pile)) out.push(['Pile value', money(d.pile) + ' (the whole pile, not new money)']);
    if (ok(d.bs)) out.push(['Bought share', pcu(d.bs) + ' at the ask']);
    if (ok(d.k)) out.push(['Main contract', betTxt(d)]);
    else if (expired(d) && d.exp) out.push(['Expiry', 'expired ' + expTxt(d.exp)]);
    if (ok(d.dte) && !expired(d)) out.push(['Days to expiry', dteTxt(d.dte)]);
    if (ok(d.cp)) out.push(['Calls : puts', ratio(d.cp) + ' on this board']);
    if (str(d.why)) out.push(['Why', d.why]);
    return out;
  }
  function whenTxt(fl) {
    const a = fl.first, b = fl.last;
    let t = str(a) && str(b) && a !== b ? `flagged ${day(a)} – ${day(b)}` : str(b) || str(a) ? `flagged ${day(str(b) ? b : a)}` : '';
    if (ok(fl.n) && fl.n > 1) t += `${t ? ', ' : ''}${fl.n} days`;
    return t;
  }
  function flagTip(fm, fl, put) {
    const bits = [str(fl.lab) ? fl.lab : `${fm.label || fm.id}${fl.t != null ? ' ' + fl.t : ''}`];
    const d = dRows(fl.d, fm.id, fl.src, put).filter(x => x[0] !== 'Tier').map(x => `${x[0].toLowerCase()} ${x[1]}`);
    if (d.length) bits.push(d.join(', '));
    const w = whenTxt(fl);
    if (w) bits.push(w);
    const q = qOf(fl).filter(x => QWORD[x] && !(put && x === 'sold')).map(x => QWORD[x]);
    if (q.length) bits.push(q.join(', '));
    if (fl.stale) bits.push('board out of date: shown, not scored');
    else if (put) bits.push(isSold(fl) ? 'put side, tagged sold (put writing): shown, not counted' : 'put side: takes points away');
    if (fl.gone) bits.push('no longer on ' + srcName(fl.src));
    return bits.join(' · ');
  }
  function chip(fm, fl, put) {
    fl = obj(fl);
    const short = fm.short || fm.label || fm.id, t = fl.t == null ? '' : String(fl.t);
    const cls = `fc ${famCls(fm.id)}${put ? ' put' : ''}${isSold(fl) && !put ? ' sold' : ''}${fl.stale ? ' stale' : ''}`;
    const when = fl.stale ? (str(fl.last) ? fl.last : srcAsOf(fl.src)) : null;
    const body = put ? `▼ ${esc(short)}` : `<i></i>${esc(short)}${t ? ` <b>${esc(t)}</b>` : ''}`;
    return `<span class="${cls}" title="${esc(flagTip(fm, fl, put))}">${body}${when ? ` <em>${esc(day(when))}</em>` : ''}</span>`;
  }

  function famFlags(f) {
    f = obj(f);
    const out = fams().filter(fm => f[fm.id]).map(fm => [fm, f[fm.id]]);
    for (const k of Object.keys(f)) if (!famById(k) && f[k] && typeof f[k] === 'object') out.push([{ id: k, short: k, label: k }, f[k]]);
    return out;
  }
  function nfHTML(r, long) {
    if (!ok(r.nf)) return '';
    const cov = ok(r.cov) && r.cov >= r.nf ? r.cov : null;
    const tip = cov ? `${r.nf} of the ${cov} boards that see ${r.s} flag it (live flags, sold ones left out)` : `${r.nf} boards flag ${r.s} (live flags, sold ones left out)`;
    return `<span class="nfc" title="${esc(tip)}"><b>${r.nf}</b>${cov ? '/' + cov : ''}${long ? ' boards' : ''}</span>`;
  }
  function chipsHTML(r) {
    return famFlags(r.f).map(([fm, fl]) => chip(fm, fl, false)).join('') + famFlags(r.x).map(([fm, fl]) => chip(fm, fl, true)).join('');
  }


  function openedOf(r) {
    const f = obj(r.f), pick = fl => { const d = obj(obj(fl).d); return ok(d.cO) || ok(d.pO) ? { cO: num(d.cO), pO: num(d.pO), pct: num(d.pct), src: obj(fl).src } : null; };
    let got = pick(f.skew);
    for (const [fm, fl] of famFlags(f)) { if (got) break; got = pick(fl); }
    return got || { cO: null, pO: null, pct: null, src: null };
  }

  const sizeKey = () => S.l === 'size' || S.o === 'size';
  const PREM_ALT = r => `not on the Skew Tracker's call list: ${money(r.prem)}, the largest money put to work in another board's flag`;
  function sizeHTML(r, key) {

    if (!ok(r.size)) return key && ok(r.prem) ? `<div class="opa num" title="${esc(PREM_ALT(r))}">${usd(r.prem)}</div>` : '';
    return `<div class="op3 num${key ? ' key' : ''}" title="${esc(`Bet size ${usd(r.size)}: ${SIZE_DEF}`)}">${usd(r.size)} <span>opened</span></div>`;
  }
  function openedHTML(r, cls = '', noSize = false) {
    const o = openedOf(r), key = sizeKey(), sz = noSize ? '' : sizeHTML(r, key);
    if (o.cO == null && o.pO == null) return sz ? `<div class="opw ${cls}">${sz}</div>` : `<span class="muted">${DASH}</span>`;
    const c = o.cO || 0, p = o.pO || 0, src = srcById(o.src);
    const tip = `${kcs(c)} calls and ${kcs(p)} puts opened in the window${src ? ' (' + (src.name || src.id) + ')' : ''}` +
      (o.pct != null ? `: ${pcu(o.pct)} of the name's open contracts` : '');
    const bar = c >= 0 && p >= 0 && c + p > 0 ? cpBar([c, p, null, null], 'op') : '';
    return `<div class="opw ${cls}">${key ? sz : ''}<div class="op1 num" title="${esc(tip)}">${kcs(c)} <span class="muted">C</span> · ${kcs(p)} <span class="muted">P</span></div>` +
      `<div class="op2" title="${esc(tip)}">${bar}${o.pct != null ? `<span>${pcu(o.pct)} of book</span>` : ''}</div>${key ? '' : sz}</div>`;
  }
  function badgesHTML(q) {
    return QBADGE.filter(t => q.includes(t[0])).map(t => `<span class="qb ${t[0]}" title="${esc(QWORD[t[0]])}">${t[1]}</span>`).join('') +
      (q.includes('sold') ? `<span class="qb sold" title="${esc(QWORD.sold)}">sold</span>` : '');
  }



  function mainMoney(r) {
    const m = obj(r && r.main);
    if (!ok(m.k) || !ok(m.usd) || m.usd < 0) return null;
    if (m.how === 'open' && !(ok(m.rd) && m.rd <= 0)) return { how: 'open', usd: m.usd, oc: num(m.oc), rd: num(m.rd), ns: num(m.ns) };
    if (m.how === 'tape' && m.usd > 0) return { how: 'tape', usd: m.usd, oc: num(m.oc), rd: null, ns: null };
    return null;
  }
  function mainTip(r) {
    const m = obj(r.main), src = srcById(m.src), fm = famById(m.fam), c = mainMoney(r), bits = [];
    if (ok(m.k)) {
      bits.push(`main bet ${fk(m.k)}C${m.exp ? ' ' + expTxt(m.exp) : ''}` + (src || fm ? ` from ${src ? src.name || src.id : fm.label || fm.id}` : '') +
        (fm && src && fm.label && fm.label !== src.name ? ` (${fm.label})` : ''));
      if (ok(m.dte)) bits.push(dteTxt(m.dte));
      if (ok(m.away)) bits.push(pcs(m.away) + ' vs price');
    }

    const cts = (n, w) => (n > 0 ? `${int(n)} ${w}${n === 1 ? '' : 's'}` : '');
    if (c && c.how === 'tape') {
      bits.push(`${money(c.usd)}: ${cts(c.oc, 'new contract') || 'new contracts'} on this line after the close at its closing mid, not settled yet`);
    } else if (c) {
      bits.push(c.usd > 0 ? `${money(c.usd)} opened in this contract in the window${c.oc > 0 ? ': ' + cts(c.oc, 'contract') : ''} at each ` +
        "session's closing mid (the Skew Tracker's bet-size way)" : 'nothing opened in this contract in the window');
      if (c.rd != null && c.ns != null && c.rd < c.ns) bits.push(`chains on ${c.rd} of ${c.ns} sessions`);
    }


    if (ok(m.k) && str(m.bx) && m.bx !== m.exp) {
      bits.push(`the board's own main expiry is ${expTxt(m.bx)} (the most open interest at the ${fk(m.k)} strike); this expiry took the most money there in the window`);
    }
    return bits.join(' · ');
  }
  function mainHTML(r) {
    const m = obj(r.main), q = arr(r.q).filter(str), c = mainMoney(r);

    const l1 = ok(m.k) ? `<span class="mbk"><b>${fk(m.k)}C</b>${m.exp ? ' ' + expTxt(m.exp) : ''}</span>${ok(m.dte) && m.dte >= 0 ? ` <span class="mbd">${m.dte}d</span>` : ''}` +
      `${ok(m.away) ? ` <span class="mba">${pcs(m.away)}</span>` : ''}` : '';



    const part = c && c.how === 'open' && c.rd != null && c.ns != null && c.rd < c.ns ? `<span class="mbp">· ${c.rd}/${c.ns} days</span>` : '';
    const cm = !c ? '' : c.how === 'tape' ? `<span class="mbm">${money(c.usd)} <span>new after the close</span></span>`
      : (c.usd > 0 ? `<span class="mbm">${money(c.usd)} <span>opened</span></span>` : '<span class="mbm muted">no new money</span>') + part;
    const badges = badgesHTML(q);
    if (!l1 && !cm && !badges) return `<span class="muted">${DASH}</span>`;
    const tip = mainTip(r);
    return `<div class="mb"${tip ? ` title="${esc(tip)}"` : ''}>` +
      `<div class="mb1">${l1 || `<span class="muted">${DASH}</span>`}</div>${cm || badges ? `<div class="mb2">${cm}${badges}</div>` : ''}</div>`;
  }
  function kingTip(k) {
    return [`king strike ${fk(k.k)}`, ok(k.dist) ? pcs(k.dist) + ' from the price' : '', k.exp ? 'expiry ' + expTxt(k.exp) : '',
            ok(k.share) ? pcu(k.share) + ' of the GEX map' : '', ok(k.held) ? `held ${k.held} sessions` : '',
            k.pile ? 'inside the biggest call pile' : ''].filter(Boolean).join(' · ');
  }
  function kingHTML(s) {
    const k = kingOf(s);
    if (!k) return `<span class="muted">${DASH}</span>`;
    return `<div class="kw" title="${esc(kingTip(k))}"><div class="k1"><b class="kg">${fk(k.k)}</b>${ok(k.dist) ? ' ' + pcs(k.dist) : ''}</div>` +
      `<div class="k2">${k.exp ? expTxt(k.exp) : ''}${k.pile ? '<span class="pile">pile</span>' : ''}</div></div>`;
  }

  const pxTxt = n => { const od = oldDay(n); return `${fpx(n.px)}${od ? ` <span class="pdo">${esc(day(od))}</span>` : ''}${ok(n.d1) ? ' ' + chg(n.d1) : ''}`; };
  function priceTip(n) {
    const od = oldDay(n), close = obj(D && D.asof).close;
    return [`close${str(n.pday) ? ' ' + day(n.pday) : ''}: ${fpx(n.px)}`, ok(n.d1) ? '1-day ' + pcs(n.d1) : '', ok(n.r20) ? '20-day ' + pcs(n.r20) : '',
            od ? `the board's prices are the ${day(close)} close; this one is from ${day(od)}` : ''].filter(Boolean).join(' · ');
  }
  function priceHTML(n) {
    if (!ok(n.px)) return `<span class="muted">${DASH}</span>`;
    return `<div class="pw" title="${esc(priceTip(n))}"><div class="p1 num">${pxTxt(n)}</div><div class="p2 num"><span class="muted">20d</span> ${chg(n.r20)}</div></div>`;
  }
  function sinceHTML(r) {
    const fe = sinceOf(r), a = str(r.first) ? r.first : null, b = str(r.last) ? r.last : null, w = winById(S.w);
    const tip = `${fe ? 'first flagged ' + day(fe) + ' by any board, in any window' : ''}${a || b ? `${fe ? '; ' : ''}in the ${w ? w.label || w.id : S.w} window ${spanTxt(a, b)}` : ''}`;
    return `<div class="sw" title="${esc(tip)}"><div class="s1">${fe ? day(fe) : DASH}</div>${a || b ? `<div class="s2">${esc(spanTxt(a, b))}</div>` : ''}</div>`;
  }
  function nameHTML(r, n) {
    const co = unent(n.n || ''), sec = str(n.sec) ? n.sec : '', sub = [co, sec].filter(str);
    return `<div class="n1"><b class="tk">${esc(r.s)}</b>${utags(n)}</div>` +
      (sub.length ? `<div class="n2" title="${esc(sub.join(' · '))}">${sub.map(esc).join(' · ')}</div>` : '');
  }


  function barHTML() {
    const brand = '<span id="brand">TOP CALL SKEWS</span>';
    if (!D) return brand;
    const a = obj(D.asof);
    const sess = [str(a.settle) ? 'OI settle ' + day(a.settle) : '', str(a.close) ? 'prices ' + day(a.close) + ' close' : ''].filter(Boolean);
    return brand + (sess.length ? `<span class="sess">${sess.join(SEP)}</span>` : '') + builtHTML() + srcBtnHTML();
  }
  function builtHTML() {
    const t = Date.parse(D.built), age = ok(t) ? (now() - t) / 6e4 : null;
    const failed = !!(STATUS && STATUS.ok === false);
    const cls = failed || age == null || age >= AGE_OLD ? 'err' : age >= AGE_OK ? 'old' : '';
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/.exec(String(D.built_et || ''));
    const when = m ? `${age != null && age < 18 * 60 ? '' : day(m[1]) + ' '}${m[2]} ET` : ok(t) ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'time unknown';
    const tip = failed ? 'the last build failed; this is the build before it'
      : age == null ? 'build time unknown' : `built ${ago(age)}; this copy is rewritten when the boards' public files change`;
    return `<span class="built" title="${esc(tip)}"><i class="dot ${cls}"></i>built ${esc(when)}</span>`;
  }
  const srcList = () => arr(D && D.sources).filter(x => x && typeof x === 'object');
  const srcSt = x => (STWORD[x.status] ? x.status : 'missing');
  function srcSummary(list) {
    const n = {};
    for (const x of list) n[srcSt(x)] = (n[srcSt(x)] || 0) + 1;
    const bits = Object.keys(STWORD).filter(st => st !== 'ok' && n[st]).map(st => `${n[st]} ${STWORD[st]}`);
    return bits.length ? bits : ['all current'];
  }
  function srcBtnHTML() {
    const list = srcList(), bad = list.filter(x => WARN.includes(x.status));
    const tip = bad.length ? bad.map(x => `${x.name || x.id}: ${STWORD[x.status] || x.status}`).join(' · ') : `${list.length} sources: ${srcSummary(list).join(' · ')}`;
    return `<button class="srcb${bad.length ? ' warn' : ''}" data-src="1" title="${esc(tip)}">Sources${bad.length ? ` <b>${bad.length}</b>` : ''}</button>`;
  }
  function controlsHTML(part = 'all') {
    if (!D) return '';
    const winB = wins().map(w => `<button class="${w.id === S.w ? 'on' : ''}" data-w="${esc(w.id)}" title="${esc(spanTxt(w.frm, w.to))}">${esc(w.label || w.id)}<b>${countRows(w.id, S.u)}</b></button>`).join('');
    const lensB = lenses().map(l => `<button class="${l.id === S.l ? 'on' : ''}" data-l="${esc(l.id)}" title="${esc(LDEF[l.id] || '')}">${esc(l.label || l.id)}</button>`).join('');
    const uniC = unis().map(u => `<button class="chip${u.id === S.u ? ' on' : ''}" data-u="${esc(u.id)}">${esc(u.label || u.id)}<b>${countRows(S.w, u.id)}</b></button>`).join('');
    const famC = fams().map(f => {
      const n = countRows(S.w, S.u, r => !!obj(r.f)[f.id]);
      return `<button class="fl ${famCls(f.id)}${S.f === f.id ? ' on' : S.f ? ' off' : ''}${n ? '' : ' zero'}" data-f="${esc(f.id)}" ` +
        `title="${esc(`${f.label || f.id}: ${f.desc || ''}${S.f === f.id ? ' · click again to show every board' : ''}`)}" aria-pressed="${S.f === f.id}">` +
        `<i></i>${esc(f.short || f.label || f.id)}<b>${n}</b></button>`;
    }).join('');
    const top = `<div class="crow r1"><div class="seg" role="group" aria-label="Window">${winB}</div><div class="seg lens" role="group" aria-label="Lens">${lensB}</div></div>`;
    const rest = `<div class="crow r2"><div class="chips" role="group" aria-label="Universe">${uniC}</div>` +
      `<input id="q" type="search" placeholder="Ticker or company" autocomplete="off" spellcheck="false" aria-label="Search by ticker or company" value="${esc(S.q)}"></div>` +
      `<div class="crow r3" role="group" aria-label="Boards">${famC}</div>`;
    return part === 'top' ? top : part === 'rest' ? rest : top + rest;
  }
  function footHTML() {
    if (!D) return '';
    const d = obj(D.defs), fd = obj(d.families);
    const line = (k, t) => (str(t) ? `<p><b>${k}.</b> ${esc(t)}</p>` : '');
    const famL = fams().map(f => `<li><span class="fl2 ${famCls(f.id)}"><i></i>${esc(f.label || f.id)}</span> ${esc(fd[f.id] || f.desc || '')}</li>`).join('');
    return `<div class="foot">${line('Score', d.score)}${line('Sold', d.sold)}${line('Stale', d.stale)}${line('Main bet', d.main)}` +
      (famL ? `<ul class="fdefs">${famL}</ul>` : '') +
      '<p class="keys"><b>Score bar.</b> <i class="kk ps"></i>OI skew <i class="kk pbd"></i>other boards <i class="kk pq"></i>quality ' +
      '<i class="kk pn"></i>quality taken away (sold, put flags). <b>Chips.</b> One colour per board family; a hollow square is the ' +
      'family that shares its sister board’s colour (Tape with OI skew, Seeker with GEX Hunt). ' +
      'Dimmed with a date = that board is out of date; struck through in red = sold; ▼ red = the board flags puts.</p>' +
      `<p class="muted">Built ${esc(D.built_et || D.built || '')} from the boards' public files · checks for a new build every 5 minutes.</p></div>`;
  }


  function emptyText() {
    const w = winById(S.w), wl = w ? w.label || w.id : S.w, total = countRows(S.w, 'all');
    const ul = (uniById(S.u) || {}).label || S.u, fl = S.f ? ((famById(S.f) || {}).label || S.f) : '';
    if (!total) return `No board flags a call skew in the ${wl} window yet.`;
    if (!countRows(S.w, S.u)) return `No ${ul} names in the ${wl} window.`;
    if (S.f && !countRows(S.w, S.u, r => !!obj(r.f)[S.f])) return `${fl} flags no ${S.u === 'all' ? '' : ul + ' '}names in the ${wl} window.`;
    return `No names match “${S.q.trim()}” in the ${wl} window${S.u !== 'all' ? ' (' + ul + ')' : ''}${S.f ? ' flagged by ' + fl : ''}.`;
  }
  function headHTML(n, shown) {
    const w = winById(S.w), l = lensById(S.l), col = sortCol(), dir = col ? S.od || col.d : 0;
    const bits = [`<b>${n}</b> ${n === 1 ? 'name' : 'names'}${shown < n ? ` <span class="muted">(the first ${shown} shown)</span>` : ''}`];
    if (w) bits.push(`${esc(w.label || w.id)}${w.frm || w.to ? ` <span class="muted">${esc(spanTxt(w.frm, w.to))}</span>` : ''}`);
    if (l) bits.push(`<span class="muted">${esc(l.label || l.id)}: ${esc(LDEF[l.id] || '')}</span>`);
    if (col) bits.push(`sorted by <b>${esc(col.h)}</b> ${dir < 0 ? '▼' : '▲'} <button class="lk" data-o="rk">back to ${esc(l ? l.label : 'the lens')}</button>`);
    if (S.f || S.q) bits.push('<button class="lk" data-clear="1">show every name</button>');
    return `<div class="hl">${bits.join(SEP)}</div>`;
  }
  function rowHTML(x) {
    const r = x.r, n = nameOf(r.s), p = partsOf(r);
    return `<tr data-s="${esc(r.s)}" tabindex="0">` +
      `<td class="c-rk num">${x.rk}</td>` +
      `<td class="c-name">${nameHTML(r, n)}</td>` +
      `<td class="c-sc"><div class="scw" title="${esc(partsTip(p))}"><b class="scn num">${ok(r.sc) ? Math.round(r.sc) : DASH}</b>${partsBar(p)}</div></td>` +
      `<td class="c-boards">${nfHTML(r, false)}${chipsHTML(r)}</td>` +
      `<td class="c-op">${openedHTML(r)}</td>` +
      `<td class="c-book">${cpCell(cpOf(r.s))}</td>` +
      `<td class="c-main">${mainHTML(r)}</td>` +
      `<td class="c-king">${kingHTML(r.s)}</td>` +
      `<td class="c-biz">${bizCell(n)}</td>` +
      `<td class="c-px">${priceHTML(n)}</td>` +
      `<td class="c-since">${sinceHTML(r)}</td></tr>`;
  }
  function tableHTML(list) {
    const col = sortCol(), dir = col ? S.od || col.d : 0;
    const btn = c => {
      const on = col ? col.k === c.k : c.k === 'rk', ar = on && c.k !== 'rk' ? `<span class="ar">${dir < 0 ? '▼' : '▲'}</span>` : '';
      const cl = [c.sub ? 'sub' : '', on ? 'on' : ''].filter(Boolean).join(' ');
      return `<button${cl ? ` class="${cl}"` : ''} data-o="${c.k}" title="${esc(c.k === 'rk' ? 'back to the lens order' : 'sort by ' + c.tip)}">${esc(c.h)}${ar}</button>`;
    };
    const th = COLS.filter(c => !c.sub).map(c => {
      const mine = [c].concat(COLS.filter(x => x.sub && x.cls === c.cls)), act = col ? mine.find(x => x.k === col.k) : c.k === 'rk' ? c : null;
      const sorted = act && act.k !== 'rk';
      return `<th class="${c.cls}${act ? ' on' : ''}" scope="col" aria-sort="${sorted ? (dir < 0 ? 'descending' : 'ascending') : 'none'}">${mine.map(btn).join('')}</th>`;
    }).join('');
    return `<div class="tw"><table class="grid bt"><thead><tr>${th}</tr></thead><tbody>${list.map(rowHTML).join('')}</tbody></table></div>`;
  }
  function cardHTML(x) {
    const r = x.r, n = nameOf(r.s), p = partsOf(r), k = kingOf(r.s);
    const co = unent(n.n || '');
    const kg = k ? `<span title="${esc(kingTip(k))}">King <b class="kg">${fk(k.k)}</b> ${ok(k.dist) ? pcs(k.dist) : ''}${k.exp ? ' ' + expTxt(k.exp) : ''}${k.pile ? '<span class="pile">pile</span>' : ''}</span>` : '';
    const bz = ok(n.biz) ? `<span class="cbz">Business ${bizCell(n)}</span>` : n.etf ? '<span>fund</span>' : '';
    const od = oldDay(n);
    const px = ok(n.px) ? `<span title="${esc(priceTip(n))}"><b class="num">${fpx(n.px)}</b>${od ? ` <span class="pdo">${esc(day(od))}</span>` : ''}${ok(n.d1) ? ' ' + chg(n.d1) : ''} <span class="muted">20d</span> ${chg(n.r20)}</span>` : '';
    const ctx = [kg, bz, px].filter(Boolean), key = sizeKey();

    const sz = !key ? '' : ok(r.size) ? `<span class="csz num" title="${esc(`Bet size ${usd(r.size)}: ${SIZE_DEF}`)}">${usd(r.size)}</span>`
      : ok(r.prem) ? `<span class="csz alt num" title="${esc(PREM_ALT(r))}">${usd(r.prem)}</span>` : '';
    return `<div class="card" data-s="${esc(r.s)}" tabindex="0" role="button" aria-label="${esc(r.s + (co ? ', ' + co : '') + ', score ' + (ok(r.sc) ? Math.round(r.sc) : DASH))}">` +
      `<div class="c1"><span class="rk">${x.rk}</span><b class="tk">${esc(r.s)}</b>${utags(n)}<span class="co">${esc(co)}</span>${sz}` +
      `<span class="scb" title="${esc(partsTip(p))}">${ok(r.sc) ? Math.round(r.sc) : DASH}</span></div>` +
      `<div class="c2">${partsBar(p, 'wide')}</div>` +
      `<div class="c3">${nfHTML(r, true)}${chipsHTML(r)}</div>` +
      `<div class="c4"><div class="cl"><span class="cll">Opened</span>${openedHTML(r, 'flat', key)}</div>` +
      `<div class="cl"><span class="cll">Main bet</span>${mainHTML(r)}</div></div>` +
      (ctx.length ? `<div class="c5">${ctx.join('')}</div>` : '') + '</div>';
  }
  const cardsHTML = list => `<div class="cards">${list.map(cardHTML).join('')}</div>`;
  function moreHTML(n, shown) {
    if (shown >= n) return '';
    const next = Math.min(PAGE, n - shown);
    return `<div class="more"><button class="mbtn" data-more="${next}">Show ${next} more</button>` +
      `<button class="mbtn" data-more="all">Show all ${n}</button><span class="muted">${shown} of ${n} shown</span></div>`;
  }
  function boardHTML() {
    if (!D) return '<div class="empty">Loading…</div>';
    const list = viewRows(), shown = list.slice(0, Math.max(1, LIMIT));
    if (!list.length) return headHTML(0, 0) + `<div class="empty">${esc(emptyText())}</div>`;
    return headHTML(list.length, shown.length) + (isTable() ? tableHTML(shown) : cardsHTML(shown)) + moreHTML(list.length, shown.length);
  }



  const pqOf = r => arr(r.pq).filter(it => Array.isArray(it) && str(it[0]) && ok(it[1]));
  const famTxt = (fm, fl) => `${fm.short || fm.label || fm.id}${fl.t == null || fl.t === '' ? '' : ' ' + fl.t}`;
  function scoreWords(r) {


    const f = obj(r.f), x = obj(r.x), p = partsOf(r), out = [];
    const sg = v => (v > 0 ? '+ ' : v < 0 ? M + ' ' : '');
    const sk = f.skew ? obj(f.skew) : null;
    if (sk && live(sk)) out.push(`<b>OI skew</b>: ${esc(sk.lab || 'Skew ' + (sk.t || ''))}${isSold(sk) ? ' (tagged sold, which lowers this part)' : ''}`);
    else if (sk) out.push('<b>OI skew</b>: the Skew Tracker is out of date, so its flag is shown and not scored');
    else out.push("<b>OI skew</b>: not on the Skew Tracker's call list in this window");
    const add = famFlags(f).filter(([fm, fl]) => fm.id !== 'skew' && live(fl) && !isSold(fl));
    const soldB = famFlags(f).filter(([fm, fl]) => fm.id !== 'skew' && live(fl) && isSold(fl)).map(([fm, fl]) => esc(famTxt(fm, fl)));
    out.push(`<b>Other boards</b>${add.length ? ': ' + add.map(([fm, fl]) => esc(famTxt(fm, fl))).join(' · ') : ': no other board flags it (live, not sold)'}` +
      (soldB.length ? ` <span class="muted">· tagged sold, no board points: ${soldB.join(', ')}</span>` : ''));
    const pq = pqOf(r);
    out.push(`<b>Quality</b>${pq.length ? ': ' + pq.map(([k, v]) => `${sg(v)}${esc(QPTS[k] || k)}`).join(' · ')
      : p[2] > 0 ? ': adds to the score' : p[2] < 0 ? ': takes points away' : ': nothing added or taken away'}`);

    if (!pq.some(it => it[0] === 'sold')) {
      const ns = famFlags(f).filter(([fm, fl]) => live(fl) && isSold(fl))
        .map(([fm, fl]) => `${esc(famTxt(fm, fl))}${str(fl.last) ? ' on ' + day(fl.last) : ''}: call selling, shown, not counted`);
      if (ns.length) out.push(`<span class="muted">${ns.join(' · ')}</span>`);
    }
    const pw = famFlags(x).filter(([fm, fl]) => live(fl) && isSold(fl)).map(([fm, fl]) => `▼ ${esc(famTxt(fm, fl))}: put writing (tagged sold), shown, not counted`);
    if (pw.length) out.push(`<span class="muted">${pw.join(' · ')}</span>`);
    const stale = famFlags(f).filter(([fm, fl]) => !live(fl)).map(([fm, fl]) => `${esc(fm.label || fm.id)} (${esc(srcName(fl.src))}${str(fl.last) ? ', newest day ' + day(fl.last) : ''})`);
    if (stale.length) out.push(`<span class="muted">Shown, not scored (board out of date): ${stale.join(' · ')}</span>`);
    return out;
  }




  function boardLink(src, fl, sym, put) {
    fl = obj(fl);
    if (!src || fl.gone) return null;
    const own = str(fl.os) ? fl.os : String(sym || ''), tpl = put && str(src.plink) ? src.plink : str(src.link) ? src.link : null;
    let u = str(src.url) ? src.url : '';
    if (tpl) {
      const w = obj(src.wmap)[S.w], last = str(fl.last) ? fl.last : '';
      u = tpl.replace(/\{sym\}/g, encodeURIComponent(own)).replace(/\{dot\}/g, encodeURIComponent(own.replace(/-/g, '.')))
        .replace(/\{w\}/g, typeof w === 'string' ? w : '');
      u = last ? u.replace(/\{day\}/g, encodeURIComponent(last)) : u.replace(/([?&#])[^?&#=]*=\{day\}(&?)/g, (m, a, b) => (b ? a : '')).replace(/\{day\}/g, '');
    }
    return /^https?:\/\//i.test(u) ? u : null;
  }
  function flagCardHTML(fm, fl, put, sym) {
    fl = obj(fl);
    const src = srcById(fl.src), link = boardLink(src, fl, sym, put), when = whenTxt(fl), rows = dRows(fl.d, fm.id, fl.src, put);
    const qs = qOf(fl).filter(q => QWORD[q] && !(put && q === 'sold'));
    const bname = src ? src.name || src.id : fl.src || '';
    const note = fl.stale ? 'board out of date: not scored' : put && isSold(fl) ? 'tagged sold (put writing): not counted' : '';
    const tail = link ? `<a class="ext" href="${esc(link)}" target="_blank" rel="noopener">Open ${esc(bname)} ↗</a>`
      : fl.gone ? `<span class="gone">no longer on ${esc(bname || 'its board')}</span>` : bname ? `<span class="muted">${esc(bname)}</span>` : '';
    return `<div class="pf${put ? ' put' : ''}${fl.stale ? ' stale' : ''}"><div class="pf1">${chip(fm, fl, put)}<span class="pfl">${esc(fl.lab || '')}</span></div>` +
      (rows.length ? `<div class="kvs">${rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join('')}</div>` : '') +
      (qs.length ? `<div class="pfq">${qs.map(q => `<span class="qb ${q}">${esc(QWORD[q])}</span>`).join('')}</div>` : '') +
      `<div class="pf3"><span>${esc([when, note].filter(Boolean).join(' · '))}</span>${tail}</div></div>`;
  }
  function acrossHTML(sym) {
    const lines = wins().map(w => {
      const r = bySym(w.id).get(sym), d = r && obj(r.f).skew ? obj(obj(r.f).skew.d) : null;
      const lab = `<button class="aw${w.id === S.w ? ' on' : ''}" data-w="${esc(w.id)}" title="${esc(spanTxt(w.frm, w.to))}">${esc(w.label || w.id)}</button>`;
      if (!r) return `${lab}<span class="an">not flagged</span>`;
      if (!d || (!ok(d.cO) && !ok(d.pO))) return `${lab}<span class="an">not on the call list · score ${ok(r.sc) ? Math.round(r.sc) : DASH}</span>`;
      return `${lab}<span class="r num">${kcs(d.cO)}</span><span class="r num">${kcs(d.pO)}</span><span class="r num">${pcu(d.pct)}</span>`;
    });
    return `<div class="ag"><span></span><span class="h r">Calls opened</span><span class="h r">Puts opened</span><span class="h r">% of book</span>${lines.join('')}</div>`;
  }
  function openInHTML(sym) {
    const op = arr(nameOf(sym).op), tabs = OPEN_IN.filter(t => op.includes(t[0]));
    if (!tabs.length) return '';
    const dot = encodeURIComponent(sym.replace(/-/g, '.'));
    return `<div class="psec"><details class="menu"><summary>Open ${esc(sym)} in ▾</summary><div class="ml">` +
      tabs.map(([id, path, name, what]) => `<a href="${SITE}${id}/${path}${dot}" target="_blank" rel="noopener"><b>${name} ↗</b><span>${what}</span></a>`).join('') +
      '</div></details></div>';
  }
  function contextHTML(sym) {
    const c = cpOf(sym), k = kingOf(sym);
    const cp = '<div class="pk"><div class="pkh"><span>Book calls : puts</span>' + (c ? `<span>${Math.round(cpShare(c) * 100)}% calls</span>` : '') + '</div>' +
      (c ? `<div class="pkv"><span>${cpLab(c)}</span>${cpMove(c)}</div>${cpBar(c, 'wide')}<div class="pks">${kc(c[0])} calls · ${kc(c[1])} puts open; white tick = a week ago</div>`
        : '<div class="pkv muted">no open-interest data</div>') + '</div>';
    const kg = '<div class="pk"><div class="pkh"><span>King node</span>' + (k && k.pile ? '<span class="pile">pile</span>' : '') + '</div>' +
      (k ? `<div class="pkv"><span><b class="kg">${fk(k.k)}</b> ${ok(k.dist) ? pcs(k.dist) : ''}</span><span class="muted">${k.exp ? expTxt(k.exp) : ''}</span></div>` +
        `<div class="pks">${esc([ok(k.share) ? pcu(k.share) + ' of the GEX map' : '', ok(k.held) ? 'held ' + k.held + ' sessions' : ''].filter(Boolean).join(' · ') || 'King GEX Tracker')}</div>`
        : '<div class="pkv muted">no king node</div>') + '</div>';
    return `<div class="duo">${cp}${kg}</div>`;
  }
  function namePanelHTML(sym) {
    sym = normSym(sym);
    if (!D || !sym) return '';
    const n = nameOf(sym), r = bySym(S.w).get(sym) || null, w = winById(S.w), wl = w ? w.label || w.id : S.w;
    const elsewhere = wins().filter(x => x.id !== S.w && bySym(x.id).get(sym));
    const co = unent(n.n || '');
    const head = `<div class="phead"><div class="ph1"><b class="ptk">${esc(sym)}</b><span class="pco" title="${esc(co)}">${esc(co)}</span>` +
      '<button class="pclose" data-close="1" aria-label="Close" title="Close (Esc)">×</button></div>' +
      `<div class="ph2">${str(n.sec) ? `<span>${esc(n.sec)}</span>` : ''}${utags(n)}</div>` +
      `<div class="ph3">${ok(n.px) ? `<span title="${esc(priceTip(n))}"><b class="num">${fpx(n.px)}</b>${ok(n.d1) ? ' ' + chg(n.d1) : ''} <span class="muted">20d</span> ${chg(n.r20)}` +
        `${str(n.pday) ? ` <span class="${oldDay(n) ? 'pdo' : 'muted'}">close ${esc(day(n.pday))}</span>` : ''}</span>` : ''}` +
      `<span>Business ${bizCell(n)}</span></div></div>`;
    if (!r && !elsewhere.length && !Object.keys(n).length) return head + `<div class="psec"><div class="none">${esc(sym)} is not on the board in any window.</div></div>`;
    let body = '';
    if (r) {
      const p = partsOf(r), fx = famFlags(r.f), px = famFlags(r.x);

      const nf = ok(r.nf) ? r.nf : fx.filter(([fm, fl]) => live(fl) && !isSold(fl)).length, cov = ok(r.cov) && r.cov >= nf ? r.cov : null;
      const more = fx.length - nf, pn = px.filter(([fm, fl]) => live(fl) && !isSold(fl)).length, pp = pqOf(r).find(it => it[0] === 'puts');
      const calls = `${nf} ${nf === 1 ? 'board' : 'boards'}${cov ? ' of ' + cov + ' that see it' : ''}${more > 0 ? ` · ${more} more shown, not counted` : ''}`;
      const puts = `${pp && pp[1] ? 'takes points away' : 'no points taken away'}${px.length > pn ? ` · ${px.length - pn} shown, not counted` : ''}`;
      body += `<div class="psec"><div class="psh">Score <b>${ok(r.sc) ? Math.round(r.sc) : DASH}</b><span>of 100 · ${esc(wl)}</span></div>${partsBar(p, 'big')}` +
        `<ul class="pw2">${scoreWords(r).map(t => `<li>${t}</li>`).join('')}</ul></div>` +
        `<div class="psec"><div class="psh">Call side <span>${calls}</span></div>${fx.map(([fm, fl]) => flagCardHTML(fm, fl, false, sym)).join('')}</div>` +
        (px.length ? `<div class="psec"><div class="psh dn">Put side <span>${puts}</span></div>${px.map(([fm, fl]) => flagCardHTML(fm, fl, true, sym)).join('')}</div>` : '');
    } else {
      body += `<div class="psec"><div class="none">Not flagged in the ${esc(wl)} window.${elsewhere.length ? ' On the board in ' +
        elsewhere.map(x => `<button class="lk" data-w="${esc(x.id)}">${esc(x.label || x.id)}</button>`).join(', ') + '.' : ''}</div></div>`;
    }
    body += `<div class="psec"><div class="psh">Context <span>shown, not scored</span></div>${contextHTML(sym)}</div>` +
      `<div class="psec"><div class="psh">Across windows <span>OI skew flag (Skew Tracker)</span></div>${acrossHTML(sym)}</div>` +
      openInHTML(sym);
    return head + body;
  }


  function sourcesHTML() {
    if (!D) return '';
    const w = winById(S.w), wl = w ? w.label || w.id : S.w;
    const list = srcList();
    const rows = list.map(x => {
      const st = srcSt(x), fm = x.family ? famById(x.family) : null;
      const url = str(x.url) && /^https?:\/\//i.test(x.url) ? x.url : null;
      const name = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(x.name || x.id)} ↗</a>` : esc(x.name || x.id);
      const fam = fm ? `<span class="fl2 ${famCls(fm.id)}"><i></i>${esc(fm.short || fm.label || fm.id)}</span>` : x.family ? `<span class="fl2">${esc(x.family)}</span>` : '<span class="ctx">context</span>';
      const asof = str(x.as_of) ? `${x.as_of_kind === 'session' ? 'session' : 'OI settle'} ${day(x.as_of)}` : st === 'idle' ? 'nothing to read right now' : 'no date';
      const lag = ok(x.lag_now) && ok(x.lag) && x.lag_now > x.lag ? ` · ${x.lag_now} sessions behind the close (usually ${x.lag})` : '';
      const n = arr(obj(x.n)[S.w]);
      const cnt = x.family ? (n.length >= 2 ? `${int(n[0])} calls · ${int(n[1])} puts in ${esc(wl)}` : '') : 'shown, not scored';
      return `<div class="srow ${st}"><div class="sr1"><i class="sd ${st}"></i><span class="sn">${name}</span>${fam}<span class="st ${st}">${STWORD[st]}</span></div>` +
        `<div class="sr2"><span>${esc(asof + lag)}</span><span>${cnt}</span></div>${str(x.note) ? `<div class="sr3">${esc(x.note)}</div>` : ''}</div>`;
    });
    return '<div class="phead"><div class="ph1"><b class="ptk">Sources</b>' +
      `<span class="pco ssum">${esc([`${list.length} ${list.length === 1 ? 'source' : 'sources'}`].concat(srcSummary(list)).join(' · '))}</span>` +
      '<button class="pclose" data-close="1" aria-label="Close" title="Close (Esc)">×</button></div>' +
      `<div class="ph2"><span>Calls and puts flagged in the ${esc(wl)} window. Filling = its newest day is still coming in (scored); ` +
      'idle = nothing to read at this hour, by design; behind = one session late (scored); stale = more (shown, not scored).</span></div></div>' +
      `<div class="psec">${rows.join('') || '<div class="none">No sources in this build.</div>'}</div>`;
  }
  function panelHTML() {
    if (!D || !(S.s || SRC_OPEN)) return '';
    const label = SRC_OPEN ? 'Sources' : S.s;
    return `<div class="pback" data-close="1"></div><aside class="pdraw" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">` +
      (SRC_OPEN ? sourcesHTML() : namePanelHTML(S.s)) + '</aside>';
  }


  function measure() {
    const c = $('#ctl');
    if (c && document.documentElement && document.documentElement.style) document.documentElement.style.setProperty('--ctlh', (c.offsetHeight || 0) + 'px');
  }
  function revealOn() {
    if (typeof document.querySelectorAll !== 'function') return;
    for (const el of document.querySelectorAll('.seg.lens .on, .crow.r2 .chips .on, .crow.r3 .on')) {
      const row = el.parentElement;
      if (!row || row.scrollWidth <= row.clientWidth) continue;
      const rr = row.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (er.right > rr.right || er.left < rr.left) row.scrollLeft += er.left - rr.left - 24;
    }
  }
  function renderBar() { const b = $('#bar'); if (b) b.innerHTML = barHTML(); }
  function renderBoard() { const m = $('#main'); if (m) m.innerHTML = boardHTML(); }
  function renderPanel() {
    const el = $('#panel');
    if (!el) return;
    const open = !!(D && (S.s || SRC_OPEN));
    el.innerHTML = open ? panelHTML() : '';
    el.hidden = !open;
    if (document.body && document.body.classList) document.body.classList.toggle('popen', open);
    document.title = S.s && !SRC_OPEN ? `${S.s} · ${TITLE}` : TITLE;
    if (open) { const d = $('.pdraw'); if (d && d.focus) try { d.focus({ preventScroll: true }); } catch (e) {  } }
  }
  function render() {
    if (!HAS_DOM) return;
    const phone = isPhone();
    renderBar();
    const c = $('#ctl'), f = $('#flt'), ft = $('#foot');
    if (c) c.innerHTML = controlsHTML(phone ? 'top' : 'all');
    if (f) f.innerHTML = phone ? controlsHTML('rest') : '';
    renderBoard();
    if (ft) ft.innerHTML = footHTML();
    renderPanel();
    LASTMODE = mode();
    measure();
    if (phone) revealOn();
  }
  function toBoard() {
    const m = $('#main'), c = $('#ctl'), h = $('header.top');
    if (!m || typeof window.scrollTo !== 'function') return;
    const top = (m.offsetTop || 0) - (isPhone() ? 0 : (c && c.offsetHeight) || 0) - ((h && h.offsetHeight) || 0);
    if (window.scrollY > top) window.scrollTo(0, Math.max(0, top));
  }
  function go(ch) {
    const listChange = ['w', 'l', 'u', 'f', 'q'].some(k => k in ch && ch[k] !== S[k]);
    const sortChange = ['o', 'od'].some(k => k in ch && ch[k] !== S[k]);
    if (listChange) LIMIT = PAGE;
    Object.assign(S, ch);
    clean();
    syncHash();
    render();
    if ((listChange || sortChange) && !S.s) toBoard();
  }
  function sortBy(k) {
    if (k === 'rk') { go({ o: '', od: 0 }); return; }
    const c = COLS.find(x => x.k === k && x.v);
    if (!c) return;
    go(S.o === k ? { od: -(S.od || c.d) } : { o: k, od: c.d });
  }
  function openName(sym) {
    sym = normSym(sym);
    if (!sym) return;
    const push = !S.s && !SRC_OPEN;
    S.s = sym;
    SRC_OPEN = false;
    syncHash(push, { panel: 1 });
    renderPanel();
  }
  function openSources() {
    if (SRC_OPEN) return;
    const push = !S.s;
    SRC_OPEN = true;
    S.s = '';
    syncHash(push, { src: 1 });
    renderPanel();
  }
  function closePanel() {
    const st = window.history ? window.history.state : null;
    if (st && (st.panel || st.src)) { window.history.back(); return; }
    S.s = '';
    SRC_OPEN = false;
    syncHash();
    renderPanel();
    applyPending();
  }
  function onClick(e) {
    const t = e.target;
    if (!t || !t.closest || t.closest('a[href]') || t.closest('summary')) return;
    let el;
    if ((el = t.closest('[data-close]'))) { e.preventDefault(); closePanel(); return; }
    if ((el = t.closest('[data-src]'))) { openSources(); return; }
    if ((el = t.closest('[data-w]'))) { go({ w: el.dataset.w }); return; }
    if ((el = t.closest('[data-l]'))) { go({ l: el.dataset.l, o: '', od: 0 }); return; }
    if ((el = t.closest('[data-u]'))) { go({ u: el.dataset.u }); return; }
    if ((el = t.closest('[data-f]'))) { go({ f: S.f === el.dataset.f ? '' : el.dataset.f }); return; }
    if ((el = t.closest('[data-o]'))) { sortBy(el.dataset.o); return; }
    if ((el = t.closest('[data-clear]'))) { const q = $('#q'); if (q) q.value = ''; go({ f: '', q: '' }); return; }
    if ((el = t.closest('[data-more]'))) { LIMIT = el.dataset.more === 'all' ? Infinity : LIMIT + PAGE; renderBoard(); return; }
    if ((el = t.closest('[data-s]'))) openName(el.dataset.s);
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      if (S.s || SRC_OPEN) { e.preventDefault(); closePanel(); }
      return;
    }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.dataset && t.dataset.s && t.tagName !== 'A' && t.tagName !== 'BUTTON' && t.tagName !== 'INPUT') {
      e.preventDefault();
      openName(t.dataset.s);
    }
  }
  function onInput(e) {
    if (!e.target || e.target.id !== 'q') return;
    S.q = String(e.target.value || '').slice(0, 40);
    LIMIT = PAGE;
    syncHash();
    renderBoard();
  }
  const boardState = () => ({ w: S.w, l: S.l, u: S.u, f: S.f, q: S.q, o: S.o, od: S.od });
  function onPop() {
    const left = HSTATE, keep = S.s || SRC_OPEN ? boardState() : null;
    const st = (HSTATE = window.history ? window.history.state : null);
    readHash(location.hash);
    SRC_OPEN = !!(st && st.src);
    if (SRC_OPEN) S.s = '';


    if (keep && left && (left.panel || left.src) && st && st.base && !S.s && !SRC_OPEN) { Object.assign(S, keep); clean(); syncHash(); }
    if (PENDING && !busy()) useBuild(PENDING);
    else render();
  }
  function onHash() { if ((location.hash || '') !== hashOf()) onPop(); }


  const busy = () => !!(S.s || SRC_OPEN || (HAS_DOM && document.activeElement && document.activeElement.id === 'q'));
  function useBuild(d) {
    const y = window.scrollY;
    PENDING = null;
    setData(d);
    syncHash();
    render();
    if (y && typeof window.scrollTo === 'function') window.scrollTo(0, y);
  }
  function applyPending() { if (PENDING && !busy()) useBuild(PENDING); }
  async function getJSON(url, tries = 3) {




    for (let i = 0; i < tries; i++) {
      if (i) await new Promise(res => setTimeout(res, 2000 * i));
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let body = false, timer = ac ? setTimeout(() => ac.abort(), 8000) : null;
      try {
        const r = await fetch(i ? url + (url.includes('?') ? '&' : '?') + 'r=' + Date.now() : url, { cache: 'no-cache', signal: ac ? ac.signal : undefined });
        if (timer) clearTimeout(timer);
        if (!r.ok) { const err = new Error(`${url} ${r.status}`); err.status = r.status; err.final = r.status === 404; throw err; }
        body = true;
        timer = ac ? setTimeout(() => ac.abort(), 90 * 1000) : null;
        return await r.json();
      } catch (e) {
        if (e.final || i === tries - 1) {
          const err = e.status ? e : new Error(`${url}: ${e.message || e.name}`);
          err.why = e.status ? `the server answered ${e.status}` : e.name === 'AbortError' ? (body ? 'the download did not finish within 90 seconds' : 'no answer within 8 seconds')
            : e.name === 'SyntaxError' ? 'the file that came back could not be read' : body ? 'the connection broke off during the download' : 'no connection';
          throw err;
        }
      } finally { if (timer) clearTimeout(timer); }
    }
    throw new Error(url);
  }

  const whyNot = e => (e && str(e.why) ? e.why : 'the page could not draw it');




  async function getData(name) {
    try { return await getJSON(BASE + name); } catch (e) {
      if (BASE === RAW || !(e && e.status === 404)) throw e;
      BASE = RAW;
      return getJSON(BASE + name);
    }
  }


  async function refresh() {
    if (LOADING) return;
    LOADING = true;
    LASTFETCH = Date.now();
    if (RETRY) { clearTimeout(RETRY); RETRY = null; }
    BASE = GH ? RAW : 'snap/';

    const older = t => { const h = PENDING || D; return !!h && Date.parse(t) < Date.parse(h.built); };
    try {

      const mf = obj(await getData('manifest.json')), v = str(mf.sha256) ? mf.sha256.slice(0, 12) : '';
      if ((PENDING || D) && v && v === VER) { renderBar(); return; }




      const g = str(mf.generated_utc) ? mf.generated_utc : '';
      if (older(g) && (Date.now() - TAKEN < CDN_MS || (BASE === RAW && FROM === 'snap/'))) { renderBar(); return; }
      const q = v ? '?v=' + encodeURIComponent(v) : '';
      try { STATUS = await getData('status.json' + q); } catch (e) { STATUS = null; }
      const d = await getData('top-call-skews.json' + q), named = !g || obj(d).built === g;



      if (!named) RETRY = setTimeout(refresh, MIX_MS);
      if (!named && older(obj(d).built)) { renderBar(); return; }
      if (named) VER = v;
      if (!D || !d || d.built !== D.built) {
        TAKEN = Date.now(); FROM = BASE;
        if (D && d && busy()) PENDING = d;
        else { useBuild(d); return; }
      } else PENDING = null;
    } catch (e) {
      RETRY = setTimeout(refresh, RETRY_MS);
      if (!D) {
        const el = $('#main');
        if (el) el.innerHTML = `<div class="empty">Top Call Skews could not be loaded just now (${esc(whyNot(e))}). Trying again in 30 seconds.</div>`;
        return;
      }
    } finally { LOADING = false; }
    renderBar();
  }
  function bind() {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('input', onInput);

    document.addEventListener('focusout', e => { if (e.target && e.target.id === 'q' && PENDING) setTimeout(applyPending, 250); });
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    let rz = null;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { if (mode() !== LASTMODE) render(); else measure(); }, 120);
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - LASTFETCH > REFRESH_MS) refresh(); });
  }
  function showTab() {
    const t = $('nav.tabs'), a = t && t.querySelector('[aria-current=page]');
    if (a && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, a.offsetLeft - t.offsetLeft - (t.clientWidth - a.offsetWidth) / 2);
  }
  function boot() {
    showTab();
    readHash(location.hash);
    HSTATE = window.history ? window.history.state : null;
    bind();
    refresh();
    setInterval(refresh, REFRESH_MS);
    setInterval(renderBar, 60 * 1000);
  }

  const API = {
    setData, state: S, clean, readHash, hashOf, viewRows, COLS, DEF,
    setState(ch) { Object.assign(S, ch); clean(); },
    setStatus(st) { STATUS = st; }, setNow(ms) { NOWMS = ms; }, setWidth(w) { FORCE_W = w; }, setSources(on) { SRC_OPEN = !!on; },
    setLimit(n) { LIMIT = n == null ? PAGE : n; }, PAGE,
    barHTML, controlsHTML, boardHTML, tableHTML, cardsHTML, namePanelHTML, sourcesHTML, panelHTML, footHTML, scoreWords,
    chip, partsBar, cpBar, bizCell, openedOf, boardLink, sinceOf, srcSummary, dRows, mainHTML, priceHTML,
    fmt: { kc, kcs, money, usd, pcs, pcu, fk, fpx, day, expTxt, spanTxt, ratio, esc, unent, normSym },
  };
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  root.TopCallSkews = API;
  if (HAS_DOM && !root.TCS_NO_BOOT) boot();
})(typeof window !== 'undefined' ? window : globalThis);
