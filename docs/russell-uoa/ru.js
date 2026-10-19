





'use strict';
(function () {

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const isNum = v => typeof v === 'number' && isFinite(v);
  const debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const D = iso => new Date(iso + 'T00:00:00Z');
  const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 864e5);


  function money(v) {
    if (!isNum(v)) return '–';
    const s = v < 0 ? '−' : '';
    let a = Math.abs(v);
    if (a < 1000) return s + '$' + Math.round(a);
    const units = ['K', 'M', 'B', 'T'];
    let i = -1;
    while (a >= 999.5 && i < units.length - 1) { a /= 1000; i++; }
    return s + '$' + (a >= 99.95 ? Math.round(a) : a.toFixed(1).replace(/\.0$/, '')) + units[i];
  }
  const int = v => isNum(v) ? Math.round(v).toLocaleString('en-US') : '–';
  function compact(v) {
    if (!isNum(v)) return '–';
    const a = Math.abs(v);
    if (a < 10000) return Math.round(v).toLocaleString('en-US');
    if (a < 999500) return (v / 1e3).toFixed(a < 99950 ? 1 : 0).replace(/\.0$/, '') + 'K';
    return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  const pct = (v, d) => isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(d == null ? 1 : d) + '%' : '–';
  const ratio = v => isNum(v) ? (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1)) + '×' : '–';
  const px2 = v => isNum(v) ? v.toFixed(2) : '–';
  const strike = k => isNum(k) ? String(+k.toFixed(2)) : '–';
  const pm = v => isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('en-US') : '–';
  function expShort(iso, T) {
    if (!iso) return '–';
    const d = D(iso);
    const y = T ? D(T).getUTCFullYear() : new Date().getFullYear();
    return MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (d.getUTCFullYear() !== y ? " '" + String(d.getUTCFullYear()).slice(2) : '');
  }
  function dateLong(iso) { if (!iso) return '–'; const d = D(iso); return DOW[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  function dateFull(iso) { if (!iso) return '–'; const d = D(iso); return dateLong(iso) + ', ' + d.getUTCFullYear(); }
  function builtET(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(s || '');
    return m ? MON[+m[2] - 1] + ' ' + (+m[3]) + ' ' + m[4] + ':' + m[5] + ' ET' : (s || '–');
  }
  const signCls = v => isNum(v) ? (v > 0 ? 'up' : v < 0 ? 'dn' : '') : '';
  const IDXS = { R2000: 'R2K', R1000: 'R1K', ETF: 'ETF' };
  const ixb = idx => idx ? `<span class="ix ${esc(idx)}" title="${idx === 'ETF' ? 'The ETF itself' : idx === 'R2000' ? 'Russell 2000 member (IWM)' : 'Russell 1000 member (IWB)'}">${IDXS[idx] || esc(idx)}</span>` : '';
  const SIDEL = { A: 'Ask', B: 'Bid', M: 'Mid', U: '?' };
  const SIDET = {
    A: 'Last trade at or near the ask, near the close: likely bought.',
    B: 'Last trade at or near the bid, near the close: likely sold.',
    M: 'Last trade between bid and ask, near the close.',
    U: 'Unknown: no trade near the close (or no usable quote).'
  };
  const FLAGT = {
    S: 'Strict: large volume, far above the open interest before the day, and a large premium',
    G: 'Big: one of the largest premiums of the day',
    P: 'Spread: paired with another strike of the same expiry traded in matching size; premium is the net',
    D: 'Deep in the money: the strike is far in the money',
    O: 'Big trade inside existing open interest: a large premium, but the volume did not go past the open interest before the day'
  };
  const flagb = f => (f || '').split('').map(c => `<b class="fl ${c}" title="${esc(FLAGT[c] || c)}">${c}</b>`).join('');
  const STT = {
    OPENED: 'Open interest rose by a large part of the volume: mostly new positions.',
    CLOSED: 'Open interest fell by a large part of the volume: mostly positions closed.',
    MIXED: 'Open interest changed by less than that either way: unclear.',
    GONE: 'The next session\'s chain does not list this contract.',
    PENDING: 'The next session\'s chain is not in yet.',
    NODATA: 'No next-session chain was saved for this name, so this stays unknown.'
  };
  const STL = { NODATA: 'NO DATA' };

  const staleT = T => { const d = defaultT(); return !!(T && d && T < d); };
  const stOf = (r, T) => r.status === 'PENDING' && staleT(r._T || T) ? 'NODATA' : r.status;


  const TIER_ORDER = 'ALBCNJ';
  const TIER_UI = [['A', 'A'], ['L', 'L'], ['B', 'B'], ['C', 'C'], ['N', 'Other'], ['J', 'J']];
  const TIERN = { A: 'Informed look', L: 'A-like, buyer unconfirmed', B: 'Explained by earnings', C: 'Already moving', N: 'Other', J: 'Ambiguous' };
  const TIERT = {
    A: 'Tier A, informed look: big for the stock, mostly bought at the ask, one-sided, mostly short-dated out-of-the-money, the main contract short-dated, and no earnings known before its expiry (unknown is allowed and shown). The shape of informed buying before unscheduled news.',
    L: 'Tier L, A-like, buyer unconfirmed: passes every tier-A check except the bought share. The last trades came before the close, so who bought is unknown; little was sold at the bid.',
    B: 'Tier B, explained: an earnings date falls on or before the main contract\'s expiry, so this may simply be an earnings bet.',
    C: 'Tier C, already moving: the stock already moved a lot in the trade\'s direction for its usual daily swing, today or over the last week. The options may be chasing the move.',
    N: 'Other: passed the ambiguity, chasing and earnings checks but missed one or more tier-A checks (size, bought share, one-sidedness, short-dated out-of-the-money share, or a short-dated main contract), and is not tier L either.',
    J: 'Tier J, ambiguous: mostly sold at the bid, two-sided, mostly spreads, or mostly closed the next day.'
  };
  const tierb = t => t ? `<span class="tb ${esc(t)}" title="${esc(TIERT[t] || '')}">${t === 'N' ? 'Other' : esc(t)}</span>` : '';
  const SIDEN = { bull: 'Bullish', bear: 'Bearish' };

  function tierOf(v) {
    if (!v) return null;
    const s = String(v), t = s.slice(-1);
    if (TIER_ORDER.indexOf(t) < 0) return null;
    return { t, side: s[0] === '+' ? 'bull' : (s[0] === '−' || s[0] === '-') ? 'bear' : null };
  }
  const parseMain = m => { if (!m) return null; const p = String(m).split('|'); return p.length >= 3 ? { exp: p[0], cp: p[1], k: Number(p[2]) } : null; };
  const mainLabel = (m, T) => { const p = parseMain(m); return p ? `${expShort(p.exp, T)} <span class="cp ${esc(p.cp)}">${esc(p.cp)}</span> ${strike(p.k)}` : ''; };
  const sig = v => isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + 'σ' : '–';
  const pct0 = v => isNum(v) ? Math.round(v * 100) + '%' : '–';

  function earnInfo(r, T) {
    const m = parseMain(r.main);
    if (!r.earn) return { cls: 'unk', txt: 'earnings unknown', tip: 'No earnings date in the earnings source for this name. Tier A allows it, but treat it with care.' };
    if (m && r.earn > m.exp) return { cls: 'ok', txt: `no earnings before ${expShort(m.exp, T)} expiry`, tip: `Next earnings ${dateFull(r.earn)}: after the main contract expires.` };
    if (m) return { cls: 'ex', txt: `earnings ${expShort(r.earn, T)} (${r.earn === m.exp ? 'expiry day' : 'before expiry'})`, tip: `Next earnings ${dateFull(r.earn)}: on or before the main contract's expiry, so the trade may be an earnings bet (tier B).` };
    return { cls: '', txt: `earnings ${expShort(r.earn, T)}`, tip: `Next earnings ${dateFull(r.earn)}.` };
  }



  const WHY_DUP = /^(no earnings before |earnings unknown$|earnings [A-Z][a-z]{2} \d+|stock quiet \()/;
  const whyShown = r => r.why.filter(x => !WHY_DUP.test(x));
  const partsTip = r => 'Score ' + (isNum(r.score) ? r.score.toFixed(1) : '–') + ' of 100: size, conviction, footprint, unexplained and not chased together. The score only orders rows inside a tier.';





  const bizCls = v => v >= 70 ? 'hi' : v >= 50 ? 'mid' : 'lo';
  const bizWord = v => v >= 70 ? 'strong' : v >= 50 ? 'middling' : 'weak';
  const BIZ_TIP = 'Business score 0–100: revenue and EPS growth, free cash flow growth and margin, PEG and revenue QoQ, each ranked against the S&P 500 + Nasdaq-100. Shown, not used in the ranking.';
  const CP_HS = ['1M', '3M', '6M', '1Y+'];
  const cpOk = c => Array.isArray(c) && isNum(c[0]) && isNum(c[1]) && c[0] + c[1] > 0;
  const cpShare = c => c[0] / (c[0] + c[1]);
  const cpWk = c => isNum(c[2]) && isNum(c[3]) && c[2] + c[3] > 0 ? c[2] / (c[2] + c[3]) : null;
  const CP_THIN = 1000;
  const cpThin = c => c[0] + c[1] < CP_THIN;
  const kf = v => isNum(v) ? (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(Math.abs(v) >= 1e7 ? 0 : 1) + 'M' : Math.abs(v) >= 1e4 ? Math.round(v / 1e3) + 'K' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(Math.round(v))) : '–';
  function cpLab(c) {
    const sh = cpShare(c), x = sh >= 0.5 ? c[0] / Math.max(c[1], 1) : c[1] / Math.max(c[0], 1);
    const t = x >= 9.95 ? x.toFixed(0) : x.toFixed(1);
    return sh >= 0.55 ? `<b class="up">${t}× calls</b>` : sh <= 0.45 ? `<b class="dn">${t}× puts</b>` : `<b class="cpe">${t}× even</b>`;
  }
  function cpBar(c, cls) {
    const sh = cpShare(c), wk = cpWk(c);
    return `<i class="cpb ${cls || ''}"><b style="width:${(sh * 100).toFixed(1)}%"></b><em></em>${wk == null ? '' : `<s style="left:${(wk * 100).toFixed(1)}%"></s>`}</i>`;
  }
  function cpMove(c, pre) {
    pre = pre == null ? '1W ' : pre;
    const wk = cpWk(c);
    if (wk == null) return `<span class="cpw muted">${pre}n/a</span>`;
    const d = (cpShare(c) - wk) * 100;
    if (Math.abs(d) < 1) return `<span class="cpw muted">${pre}=</span>`;
    return `<span class="cpw ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}pt</span>`;
  }

  function cpTip(c, H, s, rs) {
    const wk = cpWk(c);
    return `${kf(c[0])} calls vs ${kf(c[1])} puts open (${H || '1Y+'} expiries${s ? ', ' + expShort(s, s) + ' settle' : ''}), ${Math.round(cpShare(c) * 100)}% calls` +
      (wk == null ? ' · no settle from a week earlier' : ` · a week earlier${rs ? ' (' + expShort(rs, rs) + ')' : ''}, same expiries: ${Math.round(wk * 100)}% calls; calls ${c[0] - c[2] >= 0 ? '+' : '−'}${kf(Math.abs(c[0] - c[2]))}, puts ${c[1] - c[3] >= 0 ? '+' : '−'}${kf(Math.abs(c[1] - c[3]))}`) +
      (cpThin(c) ? ' · thin: few contracts open' : '');
  }
  const cpNA = '<span class="muted" title="No open-interest count from a saved chain for this name yet.">–</span>';


  let AIN = new Map();
  const idxOK = (r, v) => !v || v === 'all' || (v === 'AI' ? AIN.has(r.sym) : r.idx === v);
  const AI_TIP = 'AI-themed stocks: curated Russell 1000 + Russell 2000 AI lists (semis, data-center power, compute, software, robotics, AI healthcare)';
  const aiTheme = sym => { const t = AIN.get(sym); return t ? t.replace(/^AI[- ](adjacent )?/i, '') : null; };
  function bizBar(v, cls2) {
    return `<span class="bz ${bizCls(v)}${cls2 ? ' ' + cls2 : ''}" title="${esc(BIZ_TIP)}"><i><b style="width:${Math.max(0, Math.min(100, v))}%"></b></i><span class="num">${v}</span></span>`;
  }

  function bizCell(v, idx) {
    if (isNum(v)) return bizBar(v);
    return idx === 'ETF' ? '<span class="muted bzna" title="Funds have no business score.">fund</span>' : '<span class="muted bzna" title="No business score: too few of the six numbers are reported, or the company is not covered.">–</span>';
  }

  function cpCell(c, s, rs) {
    if (!cpOk(c)) return cpNA;
    return `<div class="cpc${cpThin(c) ? ' thin' : ''}" title="${esc(cpTip(c, '1Y+', s, rs))}"><div class="cpt">${cpLab(c)}${cpMove(c, '')}</div>${cpBar(c)}</div>`;
  }

  function bizCpCell(x, s) {
    const b = isNum(x.biz) ? `<div class="bcl1">${bizBar(x.biz)}</div>` : `<div class="bcl1 muted bzna">${x.idx === 'ETF' ? 'fund' : 'no business score'}</div>`;
    const c = x.cp;
    const cp = cpOk(c) ? `<div class="bcl2${cpThin(c) ? ' thin' : ''}" title="${esc(cpTip(c, '1Y+', s))}">${cpBar(c)}<span class="cpt">${cpLab(c)}${cpMove(c)}</span></div>` : '<div class="bcl2 muted" title="No open-interest count from a saved chain for this name yet.">calls:puts –</div>';
    return b + cp;
  }

  function duo(x, s, n) {
    const c = cpOk(x.cp) ? x.cp : null;
    let mv = '';
    if (c) { const wk = cpWk(c), d = wk == null ? null : (cpShare(c) - wk) * 100;
      mv = d == null ? '<span class="muted">1W n/a</span>' : Math.abs(d) < 1 ? '<span class="muted">1W =</span>'
        : `<span class="${d > 0 ? 'up' : 'dn'}">1W ${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}pt</span>`; }
    const cp = `<div class="pk${c && cpThin(c) ? ' thin' : ''}${n ? ' span2' : ''}"><div class="pkh"><span>Total calls : puts</span>${c ? `<span>${Math.round(cpShare(c) * 100)}%<span class="cw"> calls</span></span>` : ''}</div>` +
      (c ? `<div class="pkv"><span>${cpLab(c)}</span>${mv}</div>${cpBar(c, 'wide')}` : '<div class="pkv"><span class="muted">n/a</span></div>') + '</div>';
    const b = x.biz, cls = isNum(b) ? bizCls(b) : 'lo';
    const bz = `<div class="pk"><div class="pkh"><span>Business</span>${isNum(b) ? `<span class="bzt ${cls}">${bizWord(b)}</span>` : ''}</div>` +
      `<div class="pkv">${isNum(b) ? `<span><b class="bzt ${cls}">${b}</b><span class="muted"> /100</span></span>` : `<span class="muted">${x.idx === 'ETF' ? 'fund' : 'no score'}</span>`}</div>` +
      (isNum(b) ? `<span class="bz ${cls}"><i><b style="width:${b}%"></b></i></span>` : '') + '</div>';
    const t = n ? (cpOk(x._tv) ? x._tv : null) : undefined;
    const tv = t === undefined ? '' : `<div class="pk${t && tvThin(t, n) ? ' thin' : ''}"${t ? ` title="${esc(tvTip(t, n))}"` : ''}><div class="pkh"><span>${tvLab(n)} traded</span>${t ? `<span>${Math.round(cpShare(t) * 100)}%<span class="cw"> calls</span></span>` : ''}</div>` +
      (t ? `<div class="pkv"><span>${cpLab(t)}</span><span class="muted">${kf(t[0] + t[1])}</span></div>${cpBar(t, 'wide')}` : '<div class="pkv"><span class="muted">n/a</span></div>') + '</div>';
    return `<div class="duo" title="${c ? esc(cpTip(c, '1Y+', s)) : ''}">${bz}${tv}${cp}</div>`;
  }

  async function fillBizCp(rows, T) {
    if (!rows.length || rows.every(r => r.biz !== undefined)) return;
    const nm = await loadNames(T).catch(() => null);
    for (const r of rows) {
      if (r.biz !== undefined) continue;
      const n = nm && nm.by.get(r.sym);
      r.biz = n && isNum(n.biz) ? n.biz : null;
      r.cp = n && n.cp !== undefined ? n.cp : null;
    }
  }





  const LIVE = location.hostname === 'lawrencekenshin.github.io';
  const BASE = LIVE ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/russell-uoa-data/russell-uoa/' : 'snap/';
  let BUST = '';
  const cache = new Map();
  function getJSON(path) {
    if (!cache.has(path)) {
      const q = path === 'meta.json' ? '?t=' + Math.floor(Date.now() / 60000) : BUST;
      const p = fetch(BASE + path + q, { cache: 'no-cache' }).then(r => {
        if (!r.ok) { const e = new Error(r.status === 404 ? 'not built yet' : 'HTTP ' + r.status); e.status = r.status; throw e; }
        return r.json();
      });
      cache.set(path, p);
      p.catch(() => cache.delete(path));
    }
    return cache.get(path);
  }
  const dayURL = (T, f) => 'day/' + T + '/' + f + '.json';
  const nameURL = s => 'name/' + encodeURIComponent(s) + '.json';
  function toObjs(t) {
    const cols = (t && t.cols) || [], rows = (t && t.rows) || [], n = cols.length, out = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) { const r = rows[i], o = { _r: r }; for (let j = 0; j < n; j++) o[cols[j]] = r[j]; out[i] = o; }
    return out;
  }
  let DS = {};
  const ds = T => DS[T] || (DS[T] = {});

  function loadNames(T) {
    const d = ds(T);
    if (!d.names) d.names = getJSON(dayURL(T, 'names')).then(t => {
      const rows = toObjs(t), by = new Map(), secs = new Set();
      for (const r of rows) {
        r.tot = (r.cprem || 0) + (r.pprem || 0);
        r._q = String(r.sym || '').toUpperCase(); r._n = norm(r.sym);
        by.set(r.sym, r);
        if (r.sector) secs.add(r.sector);
      }
      return { rows, by, sectors: Array.from(secs).sort() };
    });
    return d.names;
  }
  function loadContracts(T) {
    const d = ds(T);
    if (!d.contracts) d.contracts = Promise.all([getJSON(dayURL(T, 'contracts')), loadNames(T).catch(() => null)]).then(([t, nm]) => {
      const rows = toObjs(t), secs = new Set();
      for (const r of rows) {
        const f = r.flags || '';
        r._S = f.indexOf('S') >= 0; r._G = f.indexOf('G') >= 0; r._P = f.indexOf('P') >= 0; r._D = f.indexOf('D') >= 0; r._O = f.indexOf('O') >= 0;
        const n = nm && nm.by.get(r.sym);
        r._sec = (n && n.sector) || (r.idx === 'ETF' ? 'ETF' : '');
        if (r._sec) secs.add(r._sec);
        r._ek = (r.dte || 0) * 1e6 + (r.k || 0);
        r._q = String(r.sym || '').toUpperCase(); r._n = norm(r.sym);
        r._sd = 'ABMU'.indexOf(r.side);
      }
      return { rows, cols: t.cols || [], sectors: Array.from(secs).sort() };
    });
    return d.contracts;
  }


  function loadRank(T) {
    const d = ds(T);
    if (!d.rank) d.rank = getJSON(dayURL(T, 'rank')).then(t => prepRank(toObjs(t)));
    return d.rank;
  }
  function prepRank(rows) {
    rows.forEach((r, i) => {
      r._i = i; r._q = String(r.sym || '').toUpperCase(); r._n = norm(r.sym);
      r._to = TIER_ORDER.indexOf(r.tier); if (r._to < 0) r._to = 9;
      r.why = Array.isArray(r.why) ? r.why : r.why ? [String(r.why)] : [];
    });
    rows.sort((a, b) => (a.side === b.side ? 0 : a.side === 'bear' ? 1 : -1) || a._to - b._to || a._i - b._i);
    return { rows };
  }


  let META = null;
  const TABS = [['top', 'Top'], ['contracts', 'Contracts'], ['names', 'Names'], ['about', 'About']];
  const TAB_IDS = TABS.map(t => t[0]);
  const DEF = {
    top: { t: 'ALB', idx: '', q: '' },
    contracts: { p: 'strict', idx: '', cp: '', side: 'ABMU', minp: 0, minvoi: 0, dmin: '', dmax: '', omin: '', omax: '', sec: '', st: '', hs: 0, hd: 1, q: '', sort: 'prem', dir: 'd', pg: 1 },
    names: { act: 1, idx: '', sec: '', q: '', sort: 'tot', dir: 'd', pg: 1 }
  };
  const st = { route: 'top', sym: null, T: null, f: {}, back: '#/top', nsec: 'ua' };
  for (const k in DEF) st.f[k] = Object.assign({}, DEF[k]);



  const LX_KEY = 'ru.lx1', SX_KEY = 'ru.sx1';
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {  } };
  const SXDEF = { ix: 'all', sk: 'AL', sd: 'both', sr: 'score', so: 'desc', dw: '5' };
  let LX = lsGet(LX_KEY) === 'full' ? 'full' : 'simple';
  const SX = Object.assign({}, SXDEF);
  try { const v = JSON.parse(lsGet(SX_KEY) || '{}'); for (const k in SXDEF) if (v && typeof v[k] === 'string') SX[k] = v[k]; } catch (e) {  }
  const PER = 200;
  const GROUP_CAP = 50;

  function sessionOf(T) { return ((META && META.sessions) || []).find(s => s.T === T) || null; }
  function defaultT() { return (META && (META.default || META.latest)) || null; }
  function parseHash() {
    let h = location.hash.replace(/^#\/?/, '');
    if (h.indexOf('?') < 0 && h.indexOf('=') >= 0 && h.indexOf('/') < 0) h = '?' + h;
    const qi = h.indexOf('?');
    const path = qi < 0 ? h : h.slice(0, qi);
    const q = new URLSearchParams(qi < 0 ? '' : h.slice(qi + 1));
    const parts = path.split('/').filter(Boolean);
    let route = parts[0] || 'top', sym = null;
    if (route === 'name') {
      try { sym = decodeURIComponent(parts.slice(1).join('/') || '').toUpperCase().trim().replace(/[-\/]/g, '.'); } catch (e) { sym = ''; }
      if (!sym) route = 'names';
    } else if (TAB_IDS.indexOf(route) < 0) route = 'top';
    const d = q.get('d');
    st.T = d && sessionOf(d) ? d : defaultT();
    st.route = route; st.sym = sym;
    const lx = q.get('lx');
    if (lx === 'simple' || lx === 'full') { if (lx !== LX) { LX = lx; lsSet(LX_KEY, lx); } }
    if (route === 'top') {
      for (const k in SXDEF) { const v = q.get(k); if (v != null && sxValid(k, v)) SX[k] = v; }
      sxClean();
    }
    if (DEF[route]) {
      const f = Object.assign({}, DEF[route]);
      for (const k in f) {
        if (!q.has(k)) continue;
        const v = q.get(k);
        if (typeof DEF[route][k] === 'number') { const n = Number(v); if (isFinite(n)) f[k] = n; } else f[k] = v;
      }
      if (f.pg < 1) f.pg = 1;
      if (route === 'top') f.t = tierSet(f.t);
      st.f[route] = f;
    }
  }

  const tierSet = v => TIER_ORDER.split('').filter(c => String(v || '').toUpperCase().indexOf(c) >= 0).join('');
  function dq() { return st.T && st.T !== defaultT() ? 'd=' + st.T : ''; }
  function hashFor(route) {
    const q = new URLSearchParams();
    if (dq()) q.set('d', st.T);
    if (route === 'top' && LX === 'full') q.set('lx', 'full');
    if (route === 'top' && LX !== 'full' && !dq()) { for (const k in SXDEF) if (SX[k] !== SXDEF[k]) q.set(k, SX[k]); }
    else if (DEF[route]) { const f = st.f[route]; for (const k in DEF[route]) if (f[k] !== DEF[route][k]) q.set(k, f[k]); }
    const s = q.toString();
    return '#/' + route + (s ? '?' + s : '');
  }
  function nameHref(sym) { return '#/name/' + encodeURIComponent(sym) + (dq() ? '?' + dq() : ''); }
  function syncHash() {
    const h = st.route === 'name' ? nameHref(st.sym) : hashFor(st.route);
    if (st.route !== 'name') st.back = h;
    if (location.hash !== h) history.replaceState(null, '', h);
    renderTabs();
  }


  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(([id, label, short]) =>
      `<a class="tab${st.route === id ? ' on' : ''}" href="${hashFor(id)}">${short ? `<span class="lg">${label}</span><span class="sh">${short}</span>` : label}</a>`).join('');
  }
  function renderBar() {
    renderTabs();
    const sel = $('#sess');
    const opts = (META.sessions || []).map(s =>
      `<option value="${esc(s.T)}"${s.T === st.T ? ' selected' : ''}>${dateLong(s.T)}${s.status === 'partial' ? ' · partial' : ''}</option>`).join('');
    if (sel.innerHTML !== opts) sel.innerHTML = opts;
    sel.value = st.T;
    $('#built').textContent = 'updated ' + builtET(META.built);
    $('#built').title = 'When the data last changed (Eastern time). A session fills in as its option chains are saved after the close.';
  }
  function renderBanner() {
    const b = $('#banner');
    const s = sessionOf(st.T);
    if (!s || s.status !== 'partial') { b.innerHTML = ''; return; }
    const T = st.T, def = defaultT();

    const old = !!(def && T < def);
    const link = def && def !== T ? ` <a class="lnk" href="#" data-goto="${esc(def)}">Show the last complete session (${esc(dateLong(def))})</a>` : '';
    const txt = old ? `${esc(dateFull(T))} has whole-session chains for only some names, so this day stays incomplete.`
      : `${esc(dateFull(T))} is still filling in: chains have not arrived yet for every name, so counts will grow.`;
    b.innerHTML = `<div class="banner"><b>Partial session.</b> ${txt}${link}</div>`;
  }
  function goSession(T) {
    st.T = T;
    for (const k in st.f) st.f[k].pg = 1;
    location.hash = st.route === 'name' ? nameHref(st.sym) : hashFor(st.route);
  }


  function sortRows(rows, get, dir) {
    const m = dir === 'a' ? 1 : -1;
    const arr = rows.map(r => [get(r), r]);
    arr.sort((x, y) => {
      const a = x[0], b = y[0];
      const an = a == null || a === '' || (typeof a === 'number' && a !== a), bn = b == null || b === '' || (typeof b === 'number' && b !== b);
      if (an || bn) return an && bn ? 0 : an ? 1 : -1;
      return a < b ? -m : a > b ? m : 0;
    });
    return arr.map(x => x[1]);
  }
  function theadHTML(cols, f) {
    return '<thead><tr>' + cols.map(c => {
      const on = f && f.sort === c.k, sortable = f && c.get !== false;
      return `<th class="${c.cls || ''}${sortable ? ' sortable' : ''}${on ? ' on' : ''}"${sortable ? ` data-k="${c.k}"` : ''} title="${esc(c.tip || '')}">${c.h}${on ? `<span class="ar">${f.dir === 'a' ? '▲' : '▼'}</span>` : ''}</th>`;
    }).join('') + '</tr></thead>';
  }
  function rowsHTML(cols, rows, rowAttr) {
    let h = '';
    for (const r of rows) {
      h += rowAttr ? rowAttr(r) : '<tr>';
      for (const c of cols) h += `<td class="${c.cls || ''}">${c.cell(r)}</td>`;
      h += '</tr>';
    }
    return h;
  }
  function pagerHTML(total, pg) {
    const pages = Math.max(1, Math.ceil(total / PER));
    if (pages <= 1) return '';
    return `<button data-pg="${pg - 1}"${pg <= 1 ? ' disabled' : ''}>‹ Prev</button><span>Page ${pg} of ${pages}</span><button data-pg="${pg + 1}"${pg >= pages ? ' disabled' : ''}>Next ›</button>`;
  }
  function guideHTML(cols, extra) {
    return `<details class="guide"><summary>What the columns mean</summary><dl>${cols.filter(c => c.tip).map(c => `<dt>${c.h}</dt><dd>${esc(c.tip)}</dd>`).join('')}${extra || ''}</dl></details>`;
  }
  function colGetter(cols, k) { const c = cols.find(x => x.k === k); return c && c.get !== false ? (c.get || (r => r[c.k])) : null; }
  function optionList(pairs, cur) {
    let h = pairs.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('');
    if (!pairs.some(([v]) => String(v) === String(cur))) h += `<option value="${esc(cur)}" selected>${esc(cur)}</option>`;
    return h;
  }
  const seg = (k, cur, pairs) => `<div class="seg" data-seg="${k}">${pairs.map(([v, l, t]) => `<button data-v="${esc(v)}"${String(v) === String(cur) ? ' class="on"' : ''}${t ? ` title="${esc(t)}"` : ''}>${l}</button>`).join('')}</div>`;
  const tog = (k, on, label, tip) => `<button class="tog${on ? ' on' : ''}" data-tog="${k}"${tip ? ` title="${esc(tip)}"` : ''}><i></i>${label}</button>`;

  const norm = v => String(v == null ? '' : v).toUpperCase().replace(/[.\-\/\s]/g, '');
  function tokens(q) { return String(q || '').toUpperCase().split(/[\s,]+/).map(norm).filter(Boolean); }
  const symMatch = (toks, s) => { for (const t of toks) if (s.indexOf(t) === 0) return true; return false; };
  const numOr = (v, d) => { if (v === '' || v == null) return d; const n = Number(v); return isFinite(n) ? n : d; };



  function bindControls(root, tab, onChange) {
    const f = () => st.f[tab];
    const changed = (resetPage) => { if (resetPage !== false) f().pg = 1; syncHash(); onChange(); };
    root.addEventListener('click', e => {
      const sb = e.target.closest('[data-seg] button');
      if (sb) {
        const k = sb.parentNode.dataset.seg, def = DEF[tab][k];
        f()[k] = typeof def === 'number' ? Number(sb.dataset.v) : sb.dataset.v;
        $$('button', sb.parentNode).forEach(b => b.classList.toggle('on', b === sb));
        return changed();
      }
      const tg = e.target.closest('[data-tog]');
      if (tg) {
        const k = tg.dataset.tog;
        f()[k] = f()[k] ? 0 : 1;
        tg.classList.toggle('on', !!f()[k]);
        return changed();
      }
    });
    const deb = debounce(changed, 180);
    $$('[data-f]', root).forEach(el => {
      const k = el.dataset.f, isNumDef = typeof DEF[tab][k] === 'number';
      const read = () => { const v = el.value; f()[k] = isNumDef ? numOr(v, DEF[tab][k]) : (el.classList.contains('q') ? v.trim() : v); };
      if (el.tagName === 'SELECT') el.addEventListener('change', () => { read(); changed(); });
      else el.addEventListener('input', () => { read(); deb(); });
    });
  }
  function bindTable(container, tab, cols, onChange) {
    container.addEventListener('click', e => {
      const th = e.target.closest('th[data-k]');
      if (th) {
        const f = st.f[tab], k = th.dataset.k, c = cols.find(x => x.k === k);
        if (f.sort === k) f.dir = f.dir === 'a' ? 'd' : 'a'; else { f.sort = k; f.dir = (c && c.dir0) || 'd'; }
        f.pg = 1; syncHash(); onChange();
        return;
      }
      const tr = e.target.closest('tr[data-sym]');
      if (tr && !e.target.closest('a')) location.hash = nameHref(tr.dataset.sym);
    });
  }
  function bindPager(el, tab, onChange, scrollTo) {
    el.addEventListener('click', e => {
      const b = e.target.closest('button[data-pg]');
      if (!b || b.disabled) return;
      st.f[tab].pg = Number(b.dataset.pg); syncHash(); onChange();
      if (scrollTo) scrollTo.scrollIntoView({ block: 'start' });
    });
  }


  const TOP_CAP = 100;
  const MOVE_TIP = 'The session\'s close-to-close move in units of the stock\'s usual daily swing (σ), and the same over the last week. With the trade = up for bullish, down for bearish. A big move with the trade puts the row in tier C.';


  function rankRowHTML(r, T, num, opts) {
    opts = opts || {};
    const bear = r.side === 'bear', typ = bear ? 'puts' : 'calls';
    const e = earnInfo(r, T);
    const mv = isNum(r.mz) ? `<span class="mv${r.tier === 'C' ? ' chase2' : ''}" title="${esc(MOVE_TIP)}">${sig(r.mz)} today${isNum(r.z5) ? `, ${sig(r.z5)} 5d` : ''}</span>` : '';
    const kdj = r.kdj ? `<span class="kdj" title="KDJ confirm column (never in the score).">KDJ ${esc(r.kdj)}</span>`
      : '<span class="kdj none" title="No KDJ reading for this session.">KDJ —</span>';
    let opened;
    if (isNum(r.oshare)) opened = `<span title="Share of the premium (with a known next-day count) that the next session's chain confirmed as new positions.">opened <b>${pct0(r.oshare)}</b></span>`;
    else if (staleT(T)) opened = '<span class="dim" title="No next-session chain was saved for these contracts, so this stays unknown.">opened: no data</span>';
    else opened = '<span class="dim" title="The next session\'s chain is not in yet.">opened: pending</span>';
    const line2 = `<span title="Share of the ${typ} premium that printed at the ask near the close (likely bought).">bought <b>${pct0(r.bshare)}</b></span>${opened}${isNum(r.one) ? `<span title="This side's weighted premium as a share of both sides.">one-sided <b>${pct0(r.one)}</b></span>` : ''}`;
    const parts = '';
    return `<div class="rrow${opts.nolink ? ' static' : ''}"${opts.nolink ? '' : ` data-sym="${esc(r.sym)}" tabindex="0" role="link"`} aria-label="${esc(r.sym)} ${esc(SIDEN[r.side] || '')} tier ${esc(r.tier === 'N' ? 'Other' : r.tier)}">
      <div class="rn">${num != null ? num : ''}</div>
      <div class="rb">
        <div class="r1">${opts.nolink ? `<span class="tk">${esc(r.sym)}</span>` : `<a class="tk" href="${nameHref(r.sym)}">${esc(r.sym)}</a>`}${ixb(r.idx)}${tierb(r.tier)}<span class="sc" title="${esc(partsTip(r))}">${isNum(r.score) ? r.score.toFixed(1) : '<span class="dim">–</span>'}</span>${r.main ? `<span class="mc" title="Main contract: the largest-premium ${typ.slice(0, -1)} of this side${isNum(r.mdte) ? ', ' + r.mdte + ' days to expiry' : ''}">${mainLabel(r.main, T)}</span>` : ''}</div>
        <div class="r2">${line2}</div>
        <div class="r3"><span class="earn ${e.cls}" title="${esc(e.tip)}">${esc(e.txt)}</span>${mv}${kdj}</div>
        <div class="r4">${bizCpLine(r, T)}</div>
        ${(why => why.length ? `<ul class="why">${why.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '')(whyShown(r))}
        ${parts}
        ${cpOk(r.tv1) ? `<div class="tvl${tvThin(r.tv1, 1) ? ' thin' : ''}" title="${esc(tvTip(r.tv1, 1))}"><span class="tvh">Traded that day</span>${cpBar(r.tv1, 'mini')}${cpLab(r.tv1)}<span class="muted">${kf(r.tv1[0] + r.tv1[1])} contracts</span></div>` : ''}
        ${totalCp(r.cp)}
      </div>
      <div class="rprem"><b title="This side's weighted premium: bought ${typ} count in full, mid or unknown partly, sold not at all, plus part of the other type sold at the bid.">${money(r.prem)}</b><span class="cellsub">${typ}</span></div>
    </div>`;
  }





  let TV_FROM = null;
  const TV_COL = { 1: 'tv1', 5: 'tv5', 10: 'tv10', a: 'tv10' };
  const TV_THIN = { 1: 1000, 5: 3000, 10: 5000, a: 5000 };
  const tvLab = n => { const k = String(n); return k === '1' ? 'Today\'s' : k === '5' ? '1-week' : k === 'a' ? (TV_FROM ? 'Since ' + MON[D(TV_FROM).getUTCMonth()] + ' ' + D(TV_FROM).getUTCDate() : 'Total') : k + '-day'; };
  const tvThin = (c, n) => c[0] + c[1] < (TV_THIN[n] || 1000);
  const tvSpan = n => { const k = String(n); return k === '1' ? 'in the newest session' : k === '5' ? 'over the last 5 sessions (1 week)' : k === 'a' ? 'over every session on this board' + (TV_FROM ? ' (since ' + dayW(TV_FROM) + ')' : '') : 'over the last ' + k + ' sessions'; };
  const tvTip = (c, n) => `${kf(c[0])} calls vs ${kf(c[1])} puts traded ${tvSpan(n)} (every strike and expiry), ${Math.round(cpShare(c) * 100)}% calls` + (tvThin(c, n) ? ` · thin: under ${int(TV_THIN[n] || 1000)} contracts traded` : '') + '. Total calls : puts (last column) counts the contracts still open.';
  function tvCell(c, n) {
    if (!cpOk(c)) return '<span class="muted" title="No volume for this name in the days shown.">–</span>';
    return `<div class="cpc${tvThin(c, n) ? ' thin' : ''}" title="${esc(tvTip(c, n))}"><div class="cpt">${cpLab(c)}</div>${cpBar(c)}<div class="tcpn">${kf(c[0] + c[1])} traded</div></div>`;
  }


  function totalCp(c, s, compact) {
    const lab = compact ? '' : '<span>Total calls : puts</span>';
    if (!cpOk(c)) return `<div class="tcp none${compact ? ' cpt0' : ''}"><div class="tcph">${lab}<span class="muted">${compact ? '–' : 'no open-interest file yet'}</span></div></div>`;
    return `<div class="tcp${cpThin(c) ? ' thin' : ''}${compact ? ' cpt0' : ''}" title="${esc(cpTip(c, '1Y+', s))}"><div class="tcph">${lab}<span class="tcpl">${cpLab(c)}${cpMove(c)}</span></div>${cpBar(c, 'wide')}<div class="tcpn">${kf(c[0])} calls · ${kf(c[1])} puts${compact ? '' : ' · ' + Math.round(cpShare(c) * 100) + '% calls'}${cpThin(c) ? ' · thin' : ''}</div></div>`;
  }
  function bizCpLine(r) {
    const b = isNum(r.biz) ? `<span class="bzl" title="${esc(BIZ_TIP)}">business <b class="bzt ${bizCls(r.biz)}">${r.biz}</b><span class="bz ${bizCls(r.biz)} mini"><i><b style="width:${r.biz}%"></b></i></span></span>`
      : `<span class="bzl dim" title="${esc(BIZ_TIP)}">business ${r.idx === 'ETF' ? 'fund' : '–'}</span>`;
    const c = r.cp;
    const cp = cpOk(c) ? `<span class="cpl${cpThin(c) ? ' thin' : ''}" title="${esc(cpTip(c, '1Y+'))}">calls:puts ${cpBar(c, 'mini')}${cpLab(c)}${cpMove(c)}</span>`
      : '<span class="cpl dim" title="No open-interest count from a saved chain for this name yet.">calls:puts –</span>';
    return b;
  }
  function bindRankRows(el) {
    const go = row => { location.hash = nameHref(row.dataset.sym); };
    el.addEventListener('click', e => { const row = e.target.closest('.rrow[data-sym]'); if (row && !e.target.closest('a')) go(row); });
    el.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const row = e.target.closest('.rrow[data-sym]'); if (row && !e.target.closest('a')) go(row); });
  }
  async function viewTop(main, seq) {
    const T = st.T;
    let data;
    try { data = await loadRank(T); } catch (e) {
      if (seq !== renderSeq) return;
      if (e.status !== 404) throw e;
      main.innerHTML = `<div class="empty">No ranking for ${esc(dateFull(T))} yet. The other tabs still work.</div>`;
      return;
    }
    await fillBizCp(data.rows, T);
    if (seq !== renderSeq) return;
    const f = st.f.top;
    const full = { bull: false, bear: false };
    main.innerHTML = `
      <div class="viewbar">
        <div class="tchips" id="tchips" role="group" aria-label="Tiers shown"></div>
        ${seg('idx', f.idx, [['', 'All'], ['R2000', 'R2000', 'Russell 2000 members (IWM universe)'], ['R1000', 'R1000', 'Russell 1000 members (IWB universe)'], ['ETF', 'ETF', 'IWM and IWB themselves'], ['AI', 'AI stocks', AI_TIP]])}
        <input class="q" data-f="q" value="${esc(f.q)}" placeholder="Ticker…" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Ticker search">
        ${lxSwitch()}
      </div>
      <div class="topnote rankwhat"><b>What this ranks:</b> one session (${esc(dayW(T))}), bullish and bearish in separate lists, tier first (A, then L, then B …), then the score, with KDJ breaking near-ties. <span class="lnk wh" data-lx="simple">Simple</span> ranks the last 5 days together by score instead, so its order differs.</div>
      <div class="topnote">Ranked for direction trades: <b class="up">Bullish</b> = shares or calls, <b class="dn">Bearish</b> = puts or avoid. Tiers are pass/fail checks; the score only orders rows inside a tier; KDJ is a confirm column, never in the score. <a href="${hashFor('about')}">How it works</a></div>
      <div class="sumline" id="tsum"></div>
      <div class="top2" id="top2"></div>
      <details class="guide"><summary>How to read a row</summary><dl>
        <dt>#</dt><dd>Rank inside the list as filtered by tier and index (the ticker search keeps the numbers).</dd>
        <dt>Tier</dt><dd>${TIER_UI.map(([t, l]) => `<b>${esc(l)}</b> ${esc(TIERT[t])}`).join('<br>')}</dd>
        <dt>Score</dt><dd>0–100, from size (the premium against the stock's normal dollar trading, and in dollars), conviction (bought at the ask, opened the next day, one-sided), footprint (short-dated out-of-the-money share, new strikes, number of strikes, days in a row), unexplained (no earnings before expiry) and not chased (the stock has not already run).</dd>
        <dt>Contract</dt><dd>The main contract: the side's largest-premium call (bullish) or put (bearish).</dd>
        <dt>Premium</dt><dd>The side's weighted premium: bought in full, mid or unknown partly, sold not at all, plus part of the other type sold at the bid. A side needs a large weighted premium to get a row.</dd>
        <dt>Bought / opened</dt><dd>Share of the premium at the ask near the close; share the next session's chain confirmed as new positions ("pending" until it arrives).</dd>
        <dt>Earnings</dt><dd>Against the main contract's expiry. Earnings before expiry = tier B (may be an earnings bet).</dd>
        <dt>σ</dt><dd>${esc(MOVE_TIP)}</dd>
        <dt>KDJ</dt><dd>Fresh golden cross (GC↑, "wash" = from a washout), coil, or — per timeframe. It breaks ties inside a tier and never drives the rank.</dd>
        <dt>Business · calls:puts</dt><dd>${esc(BIZ_TIP)} Calls : puts = open call vs put contracts at every strike, every expiry (1Y+), from the newest chain settle; the white tick and ▲/▼ = the calls share a week earlier over the same expiries. Greyed = thin (few contracts). Neither number changes the tier or the order.</dd>
      </dl></details>`;
    const top2 = $('#top2', main);
    const update = () => {
      const fl = st.f.top, set = tierSet(fl.t), toks = tokens(fl.q);
      const base = data.rows.filter(r => idxOK(r, fl.idx));
      const cnt = {};
      for (const r of base) cnt[r.tier] = (cnt[r.tier] || 0) + 1;
      $('#tchips', main).innerHTML = TIER_UI.map(([t, l]) => `<button class="tchip${set.indexOf(t) >= 0 ? ' on' : ''}" data-tier="${t}" title="${esc(TIERT[t])}" aria-pressed="${set.indexOf(t) >= 0}"><span class="tb ${t}">${esc(l)}</span><span class="c">${int(cnt[t] || 0)}</span></button>`).join('');
      const nb = base.filter(r => r.side !== 'bear').length;
      $('#tsum', main).innerHTML = data.rows.length
        ? `<span><b>${int(base.length)}</b> ranked ${base.length === 1 ? 'row' : 'rows'}${fl.idx ? ' in ' + esc(fl.idx) : ''}: <b class="up">${int(nb)}</b> bullish, <b class="dn">${int(base.length - nb)}</b> bearish</span><span>showing ${set ? set.split('').map(t => t === 'N' ? 'Other' : t).join(' + ') : 'no tiers'}</span>`
        : '<span>No name reached the premium needed for a row on either side this session.</span>';
      let h = '';
      for (const side of ['bull', 'bear']) {
        const list = base.filter(r => (side === 'bear' ? r.side === 'bear' : r.side !== 'bear') && set.indexOf(r.tier) >= 0);
        list.forEach((r, i) => { r._rank = i + 1; });
        const shown = toks.length ? list.filter(r => symMatch(toks, r._n)) : list;
        const cap = full[side] ? shown.length : Math.min(shown.length, TOP_CAP);
        let body = '', lastT = null;
        for (let i = 0; i < cap; i++) {
          const r = shown[i];
          if (r.tier !== lastT) { lastT = r.tier; const n = shown.filter(x => x.tier === r.tier).length; body += `<div class="tg">${tierb(r.tier)} ${esc(TIERN[r.tier] || r.tier)} <span class="c">${int(n)}</span></div>`; }
          body += rankRowHTML(r, T, r._rank);
        }
        if (!shown.length) {
          const what = set ? `in ${set.split('').map(t => t === 'N' ? 'Other' : t).join(', ')}` : 'with no tier picked';
          body = `<div class="rempty">${toks.length && list.length ? `No ${side === 'bull' ? 'bullish' : 'bearish'} row matches “${esc(fl.q)}” ${what}.` : `No ${side === 'bull' ? 'bullish' : 'bearish'} rows ${what}${fl.idx ? ' for ' + esc(fl.idx) : ''} this session.`}${set.length < TIER_ORDER.length ? ' Add tiers above to see more.' : ''}</div>`;
        }
        if (shown.length > cap) body += `<div class="rmore"><button class="btn g" data-full="${side}">Show all ${int(shown.length)} (${int(shown.length - cap)} more)</button></div>`;
        h += `<section class="rlist"><div class="rlh ${side}"><span class="t">${side === 'bull' ? 'Bullish' : 'Bearish'}</span><span class="s">${side === 'bull' ? 'shares or calls' : 'puts or avoid'}</span><span class="s">${int(list.length)} ${list.length === 1 ? 'row' : 'rows'}${toks.length ? ` · ${int(shown.length)} match` : ''}</span></div>${body}</section>`;
      }
      top2.innerHTML = h;
    };
    bindControls(main, 'top', update);
    bindLx(main);
    bindRankRows(top2);
    main.addEventListener('click', e => {
      const c = e.target.closest('[data-tier]');
      if (c) {
        const fl = st.f.top, t = c.dataset.tier;
        fl.t = tierSet(fl.t.indexOf(t) >= 0 ? fl.t.replace(t, '') : fl.t + t);
        syncHash(); update(); return;
      }
      const m = e.target.closest('[data-full]');
      if (m) { full[m.dataset.full] = true; update(); }
    });
    update();
  }






  const SIMPLE = () => st.route === 'top' && LX !== 'full' && st.T === defaultT();
  const SXIX = [['R1000', 'Russell 1000', 'Russell 1000 members (the IWB universe)'], ['R2000', 'Russell 2000', 'Russell 2000 members (the IWM universe)'],
    ['ETF', 'ETFs', 'IWM and IWB themselves'], ['AI', 'AI stocks', AI_TIP], ['all', 'Total', 'Every Russell 1000 and 2000 member plus IWM and IWB']];
  const SXSK = [['AL', 'Top picks', 'Tier A (informed look) and tier L (the same, buyer unconfirmed): treat them as one group'],
    ['ALB', 'Plus earnings bets', 'Also tier B: the same kind of buying with earnings before the bet ends, so it may just be an earnings bet'],
    ['J', 'Filtered out', 'Tier J: big, but mostly sold, two-sided, mostly spreads or mostly closed the next day. Shown so you can see what was dropped']];
  const SXSD = [['both', 'Both', 'Bets on either side'], ['bull', 'Betting up', 'Calls bought (or puts sold): betting the stock goes up'],
    ['bear', 'Betting down', 'Puts bought (or calls sold): betting the stock goes down']];
  const SXSR = [['score', 'Strongest', 'Ranked by the signal score (0-100), across the days shown'],
    ['big', 'Biggest bet', 'Ranked by the $ on that side that day, across the days shown'],
    ['day', 'By day', 'Newest day first, ranked by the score inside each day'],
    ['tv', 'Traded C:P', 'Ranked by the calls share of contracts traded in the days shown (most call-heavy first); thin after the rest, none last'],
    ['cp', 'Total C:P', 'Ranked by the calls share of all open contracts (most call-heavy first); thin books after the rest, none last'],
    ['since', 'Since then', 'Ranked by the move from that day\'s close to the latest close (biggest gain first); the latest day has no move yet'],
    ['biz', 'Business', 'Ranked by the business score (0-100), best first; names without one last']];
  const SXSO = [['desc', 'High → low', 'Highest first (click a column header or this button to flip)'], ['asc', 'Low → high', 'Lowest first']];
  const SXDW = [['1', 'Today', 'Only the newest US session on the board. A session\'s options data lands after its close, so while the US market is open "today" is still the previous session'], ['5', '1 week', 'The 5 newest sessions (one trading week), one row per stock and side (its newest day)'],
    ['a', 'Total', 'Every session on this board, one row per stock and side (its newest day)']];
  const SXV = { ix: SXIX, sk: SXSK, sd: SXSD, sr: SXSR, so: SXSO, dw: SXDW };
  const sxValid = (k, v) => !!SXV[k] && SXV[k].some(x => x[0] === v);
  function sxClean() { for (const k in SXDEF) if (!sxValid(k, SX[k])) SX[k] = SXDEF[k]; }
  sxClean();
  const sxSave = () => lsSet(SX_KEY, JSON.stringify(SX));
  const lxSwitch = () => `<span class="lxsw" title="Simple: the latest picks in plain words. Full detail: every tier, column, older day and filter."><button class="${SIMPLE() ? 'on' : ''}" data-lx="simple">Simple</button><button class="${SIMPLE() ? '' : 'on'}" data-lx="full">Full detail</button></span>`;
  function setLx(v) {
    LX = v === 'full' ? 'full' : 'simple';
    lsSet(LX_KEY, LX);
    if (LX === 'simple') st.T = defaultT();
    st.route = 'top';
    const h = hashFor('top');
    window.scrollTo(0, 0);
    if (location.hash !== h) location.hash = h; else route();
  }
  function bindLx(el) {
    el.addEventListener('click', e => { const b = e.target.closest('[data-lx]'); if (b) { e.preventDefault(); setLx(b.dataset.lx); } });
  }


  function simpleRows(ranks, keep) {
    const by = new Map(), out = [];
    for (const k of ranks) {
      for (const r of k.rows) {
        if (!keep(r)) continue;
        const key = r.sym + '|' + r.side, g = by.get(key);
        if (g) { if (g.days.indexOf(k.T) < 0) g.days.push(k.T); continue; }
        const x = Object.assign({}, r, { T: k.T, days: [k.T] });
        by.set(key, x);
        out.push(x);
      }
    }
    for (const x of out) x.again = x.days.length;
    return out;
  }



  function simpleOrder(rows, sr, Ts, so) {
    const sc = x => isNum(x.score) ? x.score : -1, pr = x => isNum(x.prem) ? x.prem : -1;
    const tie = (a, b) => (a.sym < b.sym ? -1 : a.sym > b.sym ? 1 : 0) || (a.side === b.side ? 0 : a.side === 'bull' ? -1 : 1);
    const rest = (a, b) => sc(b) - sc(a) || pr(b) - pr(a) || tie(a, b);
    const asc = so === 'asc';


    const M = { score: x => isNum(x.score) ? x.score : null, big: x => isNum(x.prem) ? x.prem : null,
      biz: x => isNum(x.biz) ? x.biz : null, cp: x => cpOk(x.cp) ? cpShare(x.cp) : null, since: x => isNum(x._since) ? x._since : null,
      tv: x => cpOk(x._tv) ? cpShare(x._tv) : null };
    const by = key => (a, b) => {
      const va = M[key](a), vb = M[key](b);
      if (va == null || vb == null) return va == null && vb == null ? rest(a, b) : va == null ? 1 : -1;
      if (key === 'cp') { const ta = cpThin(a.cp), tb = cpThin(b.cp); if (ta !== tb) return ta ? 1 : -1; }
      if (key === 'tv') { const ta = !!a._tvthin, tb = !!b._tvthin; if (ta !== tb) return ta ? 1 : -1; }
      return (asc ? va - vb : vb - va) || rest(a, b);
    };
    const num = g => { g.forEach((x, i) => { x.rk = i + 1; x.of = g.length; }); return g; };
    if (sr === 'day') return Ts.map(T => ({ T, rows: num(rows.filter(x => x.T === T).sort(by('score'))) })).filter(g => g.rows.length);
    return rows.length ? [{ T: null, rows: num(rows.slice().sort(by(M[sr] ? sr : 'score'))) }] : [];
  }


  const KTF = { '1W': 'weekly', '2W': '2-week', '1M': 'monthly' };
  function kdjWords(s) {
    if (!s) return null;
    const gc = [], coil = [];
    let wash = false;
    for (const part of String(s).split('·')) {
      const m = /^(1W|2W|1M) (.+)$/.exec(part.trim());
      if (!m) continue;
      if (m[2].indexOf('GC') >= 0) { gc.push(KTF[m[1]]); if (m[2].indexOf('wash') >= 0) wash = true; }
      if (/\bcoil\b/.test(m[2])) coil.push(KTF[m[1]]);
    }
    if (gc.length) return gc.join(' + ') + ' golden cross' + (wash ? ' from a washout' : '');
    return coil.length ? coil.join(' + ') + ' coil' : null;
  }
  function etToday() {
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const g = t => (p.find(x => x.type === t) || {}).value;
      return g('year') + '-' + g('month') + '-' + g('day');
    } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  const dayW = iso => { if (!iso) return '–'; const d = D(iso); return DOW[d.getUTCDay()] + ', ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const pcS = v => isNum(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0) + '%' : '–';
  const pcU = v => isNum(v) ? Math.abs(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0) + '%' : '–';
  const pxS = v => isNum(v) ? '$' + pxG(v) : '–';
  const SXT = { A: 'Informed look', L: 'Buyer unconfirmed', B: 'Earnings bet', J: 'Filtered out', C: 'Already moving', N: 'Other' };

  const JWHY = [[/(\d+)% sold at the bid/, m => `${m[1]}% sold, not bought`], [/weighted: (puts|calls) sold/, m => `only ${m[1]} sold`],
    [/^two-sided: (\d+)%/, m => `two-sided: only ${m[1]}% one way`], [/^mostly spreads/, () => 'mostly spreads'],
    [/^mostly closed/, () => 'mostly closed the next day'], [/^few opened/, () => 'few opened the next day']];
  function jWhy(x) {
    const w = (x.why || [])[0];
    if (!w) return 'ambiguous';
    for (const [re, f] of JWHY) { const m = re.exec(w); if (m) return f(m); }
    return w;
  }
  function sig5(x) {
    const n = !isNum(x.score) ? 1 : x.score >= 70 ? 3 : x.score >= 60 ? 2 : 1, j = x.tier === 'J';
    return `<span class="sx-dots">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><span class="sx-w">${esc(SXT[x.tier] || x.tier)}</span>` +
      `<span class="sx-s${j ? ' sx-j' : ''}">${j ? esc(jWhy(x)) : isNum(x.score) ? 'score ' + Math.round(x.score) : ''}</span>`;
  }
  function bet5(x, ctx) {
    const m = parseMain(x.main);
    if (!m || !isNum(m.k)) return '<span class="muted">–</span>';
    const call = m.cp !== 'P', now = ctx.last(x.sym), n = daysBetween(ctx.today, m.exp);
    const left = n === 0 ? 'expires today' : `${n} day${n === 1 ? '' : 's'} left`;
    let sub;
    if (n < 0) sub = `expired ${n === -1 ? 'yesterday' : -n + ' days ago'}`;
    else if (!isNum(now) || now <= 0) sub = left;
    else {
      const need = call ? m.k / now - 1 : -(1 - m.k / now);
      const past = call ? now >= m.k : now <= m.k;
      sub = past ? `already ${pcU(call ? now / m.k - 1 : 1 - now / m.k)} ${call ? 'above' : 'below'} · ${left}`
        : `needs ${pcS(need)} ${n === 0 ? 'by today’s close' : 'in ' + n + ' day' + (n === 1 ? '' : 's')}`;
    }
    const d0 = isNum(x.spot) && x.spot > 0 ? m.k / x.spot - 1 : null;
    const tip = `The biggest ${call ? 'call' : 'put'} on this side: the ${expShort(m.exp, ctx.T0)} $${strike(m.k)} ${call ? 'call' : 'put'}.` +
      (isNum(d0) ? ` On ${dayW(x.T)} the strike was ${pcS(d0)} from the close${isNum(x.mdte) ? ` with ${x.mdte} days to go` : ''}.` : '') +
      ` "Needs" is measured from the latest close (${dayW(ctx.T0)}); days left from today.`;
    return `<span class="sx-w" title="${esc(tip)}">${call ? 'Above' : 'Below'} <b>$${strike(m.k)}</b> by <b>${expShort(m.exp, ctx.T0)}</b></span><span class="sx-s">${sub}</span>`;
  }
  function earn5(x, ctx) {
    if (x.idx === 'ETF') return '<span class="sx-e ok">Fund · no earnings</span>';
    if (!x.earn) return '<span class="sx-e unk" title="No earnings date in the earnings source for this name.">Earnings unknown</span>';
    const m = parseMain(x.main);
    if (m && x.earn > m.exp) return `<span class="sx-e ok" title="Next earnings ${esc(dateFull(x.earn))}, after the bet ends.">No earnings</span><span class="sx-s">before ${expShort(m.exp, ctx.T0)}</span>`;
    return `<span class="sx-e earn" title="Next earnings ${esc(dateFull(x.earn))}${m ? ', on or before the bet ends: it may just be an earnings bet' : ''}.">Earnings ${expShort(x.earn, ctx.T0)}</span>${m ? '<span class="sx-s">before the bet ends</span>' : ''}`;
  }
  function since5(x, ctx) {
    const now = ctx.last(x.sym), bear = x.side === 'bear';
    if (x.T === ctx.T0 || !isNum(now) || !isNum(x.spot) || x.spot <= 0) return `<b class="muted" title="${x.T === ctx.T0 ? 'This is the latest day: no move since yet.' : 'No close for that day.'}">–</b><span class="sx-s">now ${pxS(now)}</span>`;
    const v = now / x.spot - 1, good = bear ? v < 0 : v > 0;
    return `<b class="${v === 0 ? '' : good ? 'up' : 'dn'}" title="From the ${esc(dayW(x.T))} close (${pxS(x.spot)}) to the latest close (${esc(dayW(ctx.T0))}). Green = moving the bet's way.">${pcS(v)}</b><span class="sx-s">now ${pxS(now)}</span>`;
  }
  function tags5(x, ctx, when) {
    const t = [];
    if (when) t.push(`<span class="sx-tag wn${x.T === ctx.T0 ? ' now' : ''}">${x.T === ctx.T0 ? 'today' : esc(dayW(x.T))}</span>`);
    t.push(x.side === 'bear' ? '<span class="sx-tag dn">betting down</span>' : '<span class="sx-tag up">betting up</span>');
    if (x.tier === 'L') t.push('<span class="sx-tag l" title="The last trades came before the close, so who bought is unknown; little was sold at the bid.">buyer unconfirmed</span>');
    if (x.tier === 'B') t.push('<span class="sx-tag b" title="Earnings fall before the bet ends: it may just be an earnings bet.">earnings bet</span>');
    if (SX.ix === 'AI' && aiTheme(x.sym)) t.push(`<span class="sx-tag ai" title="${esc(AI_TIP)}">AI · ${esc(aiTheme(x.sym))}</span>`);
    const k = x.side !== 'bear' ? kdjWords(x.kdj) : null;
    if (k) t.push(`<span class="sx-tag k" title="KDJ ${esc(x.kdj)} (a confirm column; never in the score)">${esc(k)}</span>`);
    if ((x.again || 0) >= 2) t.push(`<span class="sx-tag ag" title="${esc(x.days.map(dayW).join(' · '))}">again ${x.again}× in ${ctx.Ts.length} days</span>`);
    return `<div class="sx-tags">${t.join('')}</div>`;
  }
  function row5(x, ctx, when) {
    const sec = ctx.sector(x.sym), typ = x.side === 'bear' ? 'puts' : 'calls';
    const nk = isNum(x.nk) ? `${x.nk} contract${x.nk === 1 ? '' : 's'}${isNum(x.nexp) ? ` · ${x.nexp} expir${x.nexp === 1 ? 'y' : 'ies'}` : ''}` : '';
    const srl = (SXSR.find(s => s[0] === SX.sr) || SXSR[0])[1].toLowerCase();
    return `<div class="sx-row ${esc(x.tier)}" data-sym="${esc(x.sym)}" tabindex="0" role="link" aria-label="${esc(x.sym)} ${x.side === 'bear' ? 'betting down' : 'betting up'}">` +
      `<div class="sx-rk${x.rk <= 3 ? ' top' : ''}" title="#${x.rk} of ${x.of} by ${esc(srl)}${SX.sr === 'day' ? ' that day' : ''}">${x.rk}</div>` +
      `<div class="sx-who"><div class="sx-l1"><b class="sx-tk">${esc(x.sym)}</b>${ixb(x.idx)}<span class="sx-nm">${esc(sec)}</span></div>${tags5(x, ctx, when)}</div>` +
      `<div class="sx-size num"><b class="sx-w" title="The $ on this side that day: ${typ} bought count in full, mid or unknown partly, sold not at all, plus part of the other type sold at the bid.">${money(x.prem)}</b><span class="sx-s" title="Different option contracts (strike and expiry) in this bet, and how many expiry dates.">${nk}</span></div>` +
      `<div class="sx-bet num">${bet5(x, ctx)}</div><div class="sx-sig" title="${esc(partsTip(x))}">${sig5(x)}</div>` +
      (NARROWSX() ? `<div class="sx-bc">${duo(x, null, ctx.nWin)}</div>`
        : `<div class="sx-biz">${isNum(x.biz) ? bizBar(x.biz) : `<span class="muted bzna">${x.idx === 'ETF' ? 'fund' : '–'}</span>`}</div><div class="sx-tv">${tvCell(x._tv, ctx.nWin)}</div>`) +
      `<div class="sx-earn">${earn5(x, ctx)}</div><div class="sx-since num">${since5(x, ctx)}</div>` +
      (NARROWSX() ? '' : `<div class="sx-cpx">${totalCp(x.cp, null, true)}</div>`) + '</div>';
  }
  async function loadSimple() {
    const Ts = (META.sessions || []).map(s => s.T);
    TV_FROM = Ts.length ? Ts[Ts.length - 1] : null;
    const ranks = await Promise.all(Ts.map(T => loadRank(T).then(d => ({ T, rows: d.rows }))
      .catch(e => { if (e.status === 404) return { T, rows: [], missing: true }; throw e; })));
    const nm0 = await loadNames(Ts[0]).catch(() => null);
    await Promise.all(ranks.map(k => fillBizCp(k.rows, k.T)));

    await Promise.all(ranks.map(async k => {
      if (!k.rows.length || k.rows.every(r => r.spot !== undefined)) return;
      const nm = await loadNames(k.T).catch(() => null);
      for (const r of k.rows) if (r.spot === undefined) { const n = nm && nm.by.get(r.sym); r.spot = n && isNum(n.spot) ? n.spot : null; }
    }));
    const last = new Map();
    for (const k of ranks) for (const r of k.rows) if (!last.has(r.sym) && isNum(r.spot)) last.set(r.sym, r.spot);
    const n0 = sym => { const n = nm0 && nm0.by.get(sym); return n && isNum(n.spot) ? n.spot : null; };
    return {
      Ts, ranks, T0: Ts[0], today: etToday(), partial: (sessionOf(Ts[0]) || {}).status === 'partial',
      last: sym => { const v = n0(sym); return v != null ? v : last.has(sym) ? last.get(sym) : null; },
      tvOf: (sym, k) => { const r = nm0 && nm0.by.get(sym); const v = r && r[TV_COL[k] || 'tv' + k]; return cpOk(v) ? v : null; },
      sector: sym => { const n = nm0 && nm0.by.get(sym); return (n && n.sector) || (n && n.idx === 'ETF' ? 'ETF' : ''); }
    };
  }
  function simpleHTML(ctx) {
    const tierOK = { AL: t => t === 'A' || t === 'L', ALB: t => t === 'A' || t === 'L' || t === 'B', J: t => t === 'J' };
    const inIx = (r, ix) => idxOK(r, ix), inSd = (r, sd) => sd === 'both' || r.side === sd;
    const keepFor = (sk, ix, sd) => r => tierOK[sk](r.tier) && inIx(r, ix) && inSd(r, sd);
    const wk = sxValid('dw', SX.dw) ? SX.dw : '5';
    const nOf = k => k === 'a' ? ctx.ranks.length : Math.max(1, Math.min(ctx.ranks.length, Number(k) || 5));
    const nWin = nOf(wk);
    const W = ctx.ranks.slice(0, nWin), TsW = ctx.Ts.slice(0, nWin);
    const W5 = ctx.ranks.slice(0, Math.min(5, ctx.ranks.length));
    const sinceOf = x => { const v = ctx.last(x.sym); return x.T === ctx.T0 || !isNum(v) || !isNum(x.spot) || x.spot <= 0 ? null : v / x.spot - 1; };
    const rows = simpleRows(W, keepFor(SX.sk, SX.ix, SX.sd));
    rows.forEach(x => { x._since = sinceOf(x); x._tv = ctx.tvOf(x.sym, wk); x._tvthin = x._tv ? tvThin(x._tv, wk) : false; });
    const picks = simpleRows(nWin === 1 ? W5 : W, keepFor('AL', SX.ix, 'both'));
    const now = simpleRows(W.slice(0, 1), keepFor('AL', SX.ix, 'both'));
    const big = simpleOrder(simpleRows(W, keepFor(SX.sk === 'J' ? 'AL' : SX.sk, SX.ix, SX.sd)), 'big', TsW).map(g => g.rows[0])[0];
    const cnt = (sk, ix, sd) => simpleRows(W, keepFor(sk, ix, sd)).length;
    const ixName = (SXIX.find(x => x[0] === SX.ix) || SXIX[SXIX.length - 1])[1];
    ctx.nWin = wk;
    const nDays = TsW.length, nPick = nWin === 1 ? W5.length : nDays, word = SX.sk === 'J' ? (n => 'filtered out') : (n => n === 1 ? 'pick' : 'picks');
    const oldest = TsW[TsW.length - 1];
    const winIn = wk === 'a' ? `since ${dayW(oldest)} (${nDays} sessions)` : nDays === 1 ? 'today' : wk === '5' ? `in the last week (${nDays} sessions)` : `in the last ${nDays} days`;
    const winShort = wk === 'a' ? `total since ${dayW(oldest)}` : nDays === 1 ? `today · ${dayW(ctx.T0)}` : wk === '5' ? '1 week' : `last ${nDays} days`;
    const missing = W.filter(k => k.missing).map(k => dayW(k.T));
    const chips = (k, list, count) => list.map(([v, t, tip]) => `<button class="chip${k === 'sk' && v === 'J' ? ' xk' : ''}${k === 'sr' ? ' sr' : ''}${k === 'ix' ? ' ixc' : ''}${SX[k] === v ? ' on' : ''}" data-sx="${k}" data-v="${v}" title="${esc(tip)}">${esc(t)}${count ? `<span class="c">${int(count(v))}</span>` : ''}</button>`).join('');
    let h = `<div class="sx">
      <div class="sx-top"><div class="sx-hrow"><div class="sx-h1">Who is placing unusual options bets in Russell stocks?</div>${lxSwitch()}</div>
        <div class="sx-lead">Each stock below had options buying that was <b>big for the stock</b>, <b>one-sided</b> and mostly <b>short-dated, out of the money</b>: the shape informed traders leave before news. Calls = betting up, puts = betting down.</div>
        <div class="sx-meta"><span class="muted">Options to ${esc(dayW(ctx.T0))}${ctx.partial ? ' (still filling in)' : ''} · prices to ${esc(dayW(ctx.T0))} close</span></div>
        <details class="sx-how"${ctx.howOpen ? ' open' : ''}><summary>How we pick</summary><ol>
          <li><b>Informed look (A)</b>: a big bet on one side for the size of the stock, mostly bought at the ask, nearly all the bets leaning the same way, mostly in short-dated out-of-the-money contracts, the biggest contract ending soon, and no earnings known before it ends.</li>
          <li><b>Buyer unconfirmed (L)</b>: passes every A check except who bought. The last trades came before the close, so we cannot tell; little was sold at the bid.</li>
          <li><b>Earnings bet (B)</b>: the same kind of buying, but earnings fall before the bet ends, so it may just be an earnings bet. Shown under “Plus earnings bets”.</li>
          <li><b>Left out</b>: two-sided, mostly spreads, mostly sold at the bid, or mostly closed the next day: these show under “Filtered out”. Also left out: stocks already moving a lot with the bet, and bets that miss a check above. A side needs a large weighted premium to be listed at all.</li></ol>
          <div class="muted">Who bought is read from the last trade against the closing quote, so A and L are shown as one group. The score (0–100) only orders the list.</div>
          <div class="muted" style="margin-top:6px"><b>Business</b> (0–100) scores the company's growth, cash flow and PEG; <b>Calls : Puts</b> counts every open call vs put contract (all strikes and expiries) with a white tick a week earlier. Both are shown for context and never change a pick or its signal score; “Rank by Business” only re-sorts the list.</div></details></div>
      <div class="viewbar ixbar"><span class="muted">List</span>${chips('ix', SXIX.slice(0, 3), v => cnt(SX.sk, v, SX.sd))}<span class="sep"></span>${chips('ix', SXIX.slice(3), v => cnt(SX.sk, v, SX.sd))}</div>
      <div class="sx-stats"><div><span class="sx-n">${int(now.length)}</span><span class="sx-k">top picks on ${esc(dayW(ctx.T0))}<br><small>today (the newest session)${ctx.partial ? ', still filling in' : ''}</small></span></div>
        <div><span class="sx-n">${int(picks.length)}</span><span class="sx-k">top picks ${nWin === 1 ? `in the last ${nPick} days` : winIn}${SX.ix !== 'all' ? `<br><small>${esc(ixName)}</small>` : ''}</span></div>
        <div class="lnk"${big ? ` data-sym="${esc(big.sym)}" role="link" tabindex="0"` : ''}><span class="sx-n">${big ? money(big.prem) : '–'}</span><span class="sx-k">biggest bet: <b class="wh">${big ? esc(big.sym) : '–'}</b><br><small>${big ? esc(dayW(big.T)) + ' · ' + (big.side === 'bear' ? 'betting down' : 'betting up') : ''}</small></span></div></div>
      <div class="sx-ctl"><div class="viewbar sx-kinds"><span class="muted">Show</span>${chips('sk', SXSK, v => cnt(v, SX.ix, SX.sd))}</div>
        <div class="viewbar sx-kinds"><span class="muted">Side</span>${chips('sd', SXSD, v => cnt(SX.sk, SX.ix, v))}</div>
        <div class="viewbar sx-kinds"><span class="muted">Days</span>${chips('dw', SXDW.map(x => x[0] === '1' ? ['1', `Today · ${dayW(ctx.T0)}`, x[2]] : x[0] === 'a' ? ['a', 'Total', `${x[2]}: since ${dayW(ctx.Ts[ctx.Ts.length - 1])}, ${ctx.Ts.length} sessions`] : x), v => simpleRows(ctx.ranks.slice(0, nOf(v)), keepFor(SX.sk, SX.ix, SX.sd)).length)}</div>
        <div class="viewbar sx-kinds"><span class="muted">Rank by</span>${chips('sr', SXSR)}<button class="chip sodir" data-sx="so" data-v="${SX.so === 'asc' ? 'desc' : 'asc'}" title="Flip the order (a column header click does the same)">${SX.so === 'asc' ? 'Low → high ↑' : 'High → low ↓'}</button></div></div>`;
    const hs = (key, label, sub, tip) => { const on = SX.sr === key, ar = on ? (SX.so === 'asc' ? ' ▲' : ' ▼') : '';
      return `<div class="hsort${on ? ' on' : ''}" data-sort="${key}" role="button" tabindex="0" title="${esc((tip ? tip + ' ' : '') + 'Click to sort high to low; click again for low to high.')}">${label}${ar}<span>${sub}</span></div>`; };
    if (!NARROWSX()) h += `<div class="sx-row sx-hd"><div>#</div><div>Stock</div>${hs('big', 'Bet size', '$ on that side that day')}<div>What they’re betting<span>the biggest contract, from the latest close</span></div>${hs('score', 'Signal', 'tier and score')}${hs('biz', '<span class="lab-l">Business</span><span class="lab-s">Biz</span>', 'score 0–100', BIZ_TIP)}${hs('tv', `${tvLab(wk)} calls : puts`, 'contracts traded')}<div>Earnings</div>${hs('since', 'Since then', 'from that day’s close')}${hs('cp', 'Total calls : puts', 'all open contracts')}</div>`;
    const groups = simpleOrder(rows, SX.sr, TsW, SX.so);
    if (rows.length) h += `<div class="sx-why"><b>What this ranks:</b> ${nDays === 1 ? `today only (${esc(dayW(ctx.T0))}, the newest session)` : `${wk === 'a' ? `every session since ${esc(dayW(oldest))} (${nDays})` : wk === '5' ? `the last week (${nDays} sessions)` : `the last ${nDays} days`} together, one row per stock and direction (its newest day)`}, ${SX.sr === 'day' ? 'newest day first, by score inside each day' : ({ big: 'by bet size', biz: 'by business score', cp: 'by calls share of all open contracts', tv: 'by calls share of contracts traded in the days shown', since: 'by the move since that day' })[SX.sr] || 'by score'}${SX.so === 'asc' ? ' (lowest first)' : ''}; bullish and bearish share one list${SX.sr === 'score' ? ', A and L are mixed and KDJ is not used' : ''}. <span class="lnk wh" data-lx="full">Full detail</span> ranks one day at a time, tier first, with bullish and bearish apart, so its order differs.</div>`;
    if (SX.sr === 'day') groups.forEach(g => {
      h += `<div class="sx-day"><b>${esc(dayW(g.T))}</b>${g.T === ctx.T0 ? '<span class="sx-latest">latest</span>' : ''}<span class="sx-cnt">${int(g.rows.length)} ${word(g.rows.length)}</span></div>${g.rows.map(x => row5(x, ctx, false)).join('')}`;
    });
    else if (groups.length) {
      const g = groups[0].rows;
      h += `<div class="sx-day"><b>Ranked by ${({ big: 'biggest bet', biz: 'business score', cp: 'total calls share (open contracts)', tv: 'traded calls share', since: 'move since then' })[SX.sr] || 'strongest signal'}${SX.so === 'asc' ? ', lowest first' : ''}</b><span class="sx-cnt">${int(g.length)} ${word(g.length)} · ${esc(winShort)}${SX.ix !== 'all' ? ' · ' + esc(ixName) : ''}</span></div>${g.map(x => row5(x, ctx, true)).join('')}`;
    }
    if (!rows.length) h += `<div class="empty small">Nothing here ${esc(winIn)}${SX.ix !== 'all' ? ' for ' + esc(ixName) : ''}${SX.sd !== 'both' ? ' ' + (SX.sd === 'bull' ? 'betting up' : 'betting down') : ''}.</div>`;
    if (missing.length) h += `<div class="ixnote">No ranking file yet for ${esc(missing.join(', '))}.</div>`;
    h += `<div class="sx-foot">Click a stock for its chart, the contracts and every check. <span class="lnk wh" data-lx="full">Full detail</span> has all the numbers, older days and filters.</div></div>`;
    return h;
  }
  const NARROWSX = () => window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  async function viewSimple(main, seq) {
    const ctx = await loadSimple();
    if (seq !== renderSeq) return;
    const draw = () => { const d = $('.sx-how', main); if (d) ctx.howOpen = d.open; main.innerHTML = simpleHTML(ctx); };
    bindLx(main);
    const open = el => { location.hash = nameHref(el.dataset.sym); };
    main.addEventListener('click', e => {
      const c = e.target.closest('[data-sx]');
      if (c) { if (SX[c.dataset.sx] !== c.dataset.v) { SX[c.dataset.sx] = c.dataset.v; if (c.dataset.sx === 'sr') SX.so = 'desc'; sxSave(); syncHash(); draw(); } return; }
      const hsrt = e.target.closest('[data-sort]');
      if (hsrt) { sortBy(hsrt.dataset.sort); return; }
      const r = e.target.closest('[data-sym]');
      if (r && !e.target.closest('a')) open(r);
    });
    const sortBy = k => { if (SX.sr === k) SX.so = SX.so === 'asc' ? 'desc' : 'asc'; else { SX.sr = k; SX.so = 'desc'; } sxSave(); syncHash(); draw(); };
    main.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const hk = e.target.closest('[data-sort]'); if (hk) { e.preventDefault(); sortBy(hk.dataset.sort); return; } if (e.key !== 'Enter') return; const r = e.target.closest('[data-sym]'); if (r) open(r); });
    let wasNarrow = NARROWSX();
    redrawName = () => { const n = NARROWSX(); if (n !== wasNarrow) { wasNarrow = n; draw(); } };
    draw();
  }


  const symCell = r => `<a class="tk" href="${nameHref(r.sym)}">${esc(r.sym)}</a>${ixb(r.idx)}`;
  function contractLabel(r, T) {
    return `${expShort(r.exp, T)} <span class="cp ${r.cp}">${r.cp}</span> ${strike(r.k)}${isNum(r.k2) ? '<span class="muted">/' + strike(r.k2) + '</span>' : ''}`;
  }
  function contractCols(T, withSym) {
    const cols = [
      { k: 'exp', h: 'Contract', get: r => r._ek, dir0: 'a', tip: 'Expiry date, C = call or P = put, and strike price. A second strike (60/65) means a spread: two strikes traded together in matching size.', cell: r => contractLabel(r, T) },
      { k: 'prem', h: 'Premium', cls: 'r', tip: 'Dollars traded: volume × price × 100. For a spread it is the net (dearer leg minus cheaper leg); the gross is shown underneath.', cell: r => `<b class="wh">${money(r.prem)}</b>${isNum(r.gross) ? `<div class="cellsub" title="Gross premium of the dearer leg">gross ${money(r.gross)}</div>` : ''}` },
      { k: 'side', h: 'Side', get: r => r._sd, dir0: 'a', tip: 'Where the last trade printed against the closing quote, only when it came near the close. Ask = likely bought, Bid = likely sold, Mid = in between, ? = unknown.', cell: r => `<span class="sd ${esc(r.side)}" title="${esc(SIDET[r.side] || '')}">${SIDEL[r.side] || esc(r.side)}</span>` },
      { k: 'dte', h: 'DTE', cls: 'r', dir0: 'a', tip: 'Calendar days from the trade date to expiry.', cell: r => int(r.dte) },
      { k: 'otm', h: 'OTM', cls: 'r', tip: 'How far the strike is from the stock price. Positive = out of the money (the stock must move that far to reach it); negative = already in the money.', cell: r => `<span class="${r._D ? 'am' : ''}">${pct(r.otm)}</span>` },
      { k: 'spot', h: 'Spot', cls: 'r c-spot', tip: 'The stock\'s closing price on the trade date.', cell: r => px2(r.spot) },
      { k: 'vol', h: 'Vol', cls: 'r', tip: 'Contracts traded that day (for a spread: the smaller leg).', cell: r => int(r.vol) },
      { k: 'oi', h: 'OI', cls: 'r', tip: 'Open interest before the day: contracts already open from earlier days.', cell: r => int(r.oi) },
      { k: 'voi', h: 'Vol/OI', cls: 'r', tip: 'Volume divided by the prior open interest. Above 1 means more traded today than was open before. "new" = nothing was open before.', cell: r => r.oi === 0 ? '<span class="kg" title="No open interest before the day">new</span>' : ratio(r.voi) },
      { k: 'px', h: 'Price', cls: 'r c-px', tip: 'Option price per share used for the premium: the mid quote when the last trade came near the close (or there was no trade price); otherwise the last trade.', cell: r => px2(r.px) },
      { k: 'bid', h: 'Bid × Ask', cls: 'r c-ba', tip: 'The closing quote.', cell: r => `${px2(r.bid)} × ${px2(r.ask)}` },
      { k: 'last', h: 'Last (ET)', cls: 'r c-last', tip: 'Last trade price and its time, Eastern.', cell: r => isNum(r.last) ? `${px2(r.last)} <span class="cellsub">${esc(r.ltt || '')}</span>` : '<span class="dim">–</span>' },
      { k: 'iv', h: 'IV', cls: 'r c-iv', tip: 'Implied volatility: the yearly move the option price implies.', cell: r => isNum(r.iv) ? Math.round(r.iv * 100) + '%' : '<span class="dim">–</span>' },
      { k: 'delta', h: 'Delta', cls: 'r c-dl', tip: 'Roughly the odds of finishing in the money, and how much the option moves for a $1 move in the stock.', cell: r => isNum(r.delta) ? r.delta.toFixed(2) : '<span class="dim">–</span>' },
      { k: 'flags', h: 'Flags', get: r => r.flags || '', dir0: 'a', tip: 'S = strict, G = big, P = spread, D = deep in the money, O = big trade inside existing open interest.', cell: r => flagb(r.flags) },
      { k: 'status', h: 'Next day', get: r => stOf(r, T) || '', dir0: 'a', tip: 'What the next session\'s chain says about open interest. OPENED = it rose by a large part of the volume (new positions). CLOSED = it fell by a large part. MIXED = in between. GONE = the contract is missing from the next chain. PENDING = the next chain is not in yet. NO DATA = it never arrived for this name (older sessions).', cell: r => { const s = stOf(r, T); return `<span class="stt ${esc(s)}" title="${esc(STT[s] || '')}">${esc(STL[s] || s || '–')}</span>${isNum(r.doi) ? ` <span class="cellsub" title="Change in open interest">${pm(r.doi)}</span>` : ''}`; } },
      { k: 'rp', h: 'Rank', cls: 'r', tip: 'Percentile of this premium among all of the day\'s rows (all names). 99 = top 1%.', cell: r => isNum(r.rp) ? r.rp : '–' },
      { k: 'rv', h: 'V/OI rank', cls: 'r c-rv', tip: 'Percentile of vol/OI among all of the day\'s rows.', cell: r => isNum(r.rv) ? r.rv : '–' }
    ];
    if (withSym) cols.unshift({ k: 'sym', h: 'Ticker', cls: 'stk', dir0: 'a', get: r => r._q, tip: 'The stock or ETF and its index (R2K = Russell 2000, R1K = Russell 1000). Tap for its page.', cell: symCell });
    return cols;
  }
  function contractPred(f) {
    const toks = tokens(f.q), minp = f.minp || 0, minvoi = f.minvoi || 0;
    const dmin = numOr(f.dmin, null), dmax = numOr(f.dmax, null), omin = numOr(f.omin, null), omax = numOr(f.omax, null);
    const sides = f.side || '';
    return r => {
      if (!idxOK(r, f.idx)) return false;
      if (f.cp && r.cp !== f.cp) return false;
      if (sides.indexOf(r.side) < 0) return false;
      if (minp && !(r.prem >= minp)) return false;
      if (minvoi && !(r.voi >= minvoi)) return false;
      if (dmin != null && !(r.dte >= dmin)) return false;
      if (dmax != null && !(r.dte <= dmax)) return false;
      if (omin != null && !(r.otm * 100 >= omin)) return false;
      if (omax != null && !(r.otm * 100 <= omax)) return false;
      if (f.sec && r._sec !== f.sec) return false;
      if (f.st && r.status !== f.st) return false;
      if (f.hs && r._P) return false;
      if (f.hd && r._D) return false;
      if (toks.length && !symMatch(toks, r._n)) return false;
      return true;
    };
  }
  function activeFilterCount(tab, skip) {
    const f = st.f[tab], d = DEF[tab];
    let n = 0;
    for (const k in d) if (skip.indexOf(k) < 0 && String(f[k]) !== String(d[k])) n++;
    return n;
  }
  function csvOf(cols, rows) {
    const q = v => { if (v == null) return ''; const s = String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return cols.join(',') + '\n' + rows.map(r => r._r.map(q).join(',')).join('\n') + '\n';
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const PREMS = [[0, 'Any'], [25000, '$25K+'], [50000, '$50K+'], [100000, '$100K+'], [250000, '$250K+'], [500000, '$500K+'], [1000000, '$1M+'], [5000000, '$5M+'], [10000000, '$10M+']];
  const VOIS = [[0, 'Any'], [1, '1×+'], [2, '2×+'], [3, '3×+'], [5, '5×+'], [10, '10×+'], [25, '25×+']];
  const STATUSES = [['', 'Any'], ['OPENED', 'Opened'], ['CLOSED', 'Closed'], ['MIXED', 'Mixed'], ['GONE', 'Gone'], ['PENDING', 'Pending']];

  async function viewContracts(main, seq) {
    const T = st.T;
    const data = await loadContracts(T);
    if (seq !== renderSeq) return;
    const f = st.f.contracts, cols = contractCols(T, true);
    main.innerHTML = `
      <div class="viewbar">
        <div class="presets" id="presets"></div>
        ${seg('cp', f.cp, [['', 'Both'], ['C', 'Calls'], ['P', 'Puts']])}
        ${seg('idx', f.idx, [['', 'All'], ['R2000', 'R2000', 'Russell 2000 members (IWM universe)'], ['R1000', 'R1000', 'Russell 1000 members (IWB universe)'], ['ETF', 'ETF', 'IWM and IWB themselves'], ['AI', 'AI stocks', AI_TIP]])}
        <input class="q" data-f="q" value="${esc(f.q)}" placeholder="Ticker…" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Ticker search">
        <button class="btn g ftog" id="ftog"></button>
      </div>
      <div class="fp" id="fp">
        <div class="fg" title="Where the last trade printed against the closing quote (near the close only)"><span class="lab">Side</span><span class="sdchips" id="sdchips">${'ABMU'.split('').map(c => `<button data-sd="${c}" class="${f.side.indexOf(c) >= 0 ? 'on' : ''}" title="${esc(SIDET[c])}">${c === 'U' ? 'Unknown' : SIDEL[c]}</button>`).join('')}</span></div>
        <label class="fg"><span class="lab">Min premium</span><select data-f="minp">${optionList(PREMS, f.minp)}</select></label>
        <label class="fg"><span class="lab">Min vol/OI</span><select data-f="minvoi">${optionList(VOIS, f.minvoi)}</select></label>
        <div class="fg"><span class="lab">DTE</span><input class="n" type="number" inputmode="numeric" data-f="dmin" value="${esc(f.dmin)}" placeholder="min" aria-label="Minimum days to expiry">–<input class="n" type="number" inputmode="numeric" data-f="dmax" value="${esc(f.dmax)}" placeholder="max" aria-label="Maximum days to expiry"></div>
        <div class="fg" title="Out of the money, in percent. Negative = in the money."><span class="lab">OTM %</span><input class="n" type="number" inputmode="decimal" data-f="omin" value="${esc(f.omin)}" placeholder="min" aria-label="Minimum percent out of the money">–<input class="n" type="number" inputmode="decimal" data-f="omax" value="${esc(f.omax)}" placeholder="max" aria-label="Maximum percent out of the money"></div>
        <label class="fg"><span class="lab">Sector</span><select data-f="sec">${optionList([['', 'All']].concat(data.sectors.map(s => [s, s])), f.sec)}</select></label>
        <label class="fg" title="${esc('What the next session\'s chain says about these trades')}"><span class="lab">Next day</span><select data-f="st">${optionList(STATUSES.map(([v, l]) => [v, v === 'PENDING' && staleT(T) ? 'No data' : l]), f.st)}</select></label>
        ${tog('hs', f.hs, 'Hide spreads', 'Hide rows paired as two-strike spreads')}
        ${tog('hd', f.hd, 'Hide deep ITM', 'Hide contracts far in the money (often stock replacement or dividend trades)')}
        <button class="btn g" id="creset" title="Back to the default view">Reset</button>
        <button class="btn" id="ccsv" title="Download every row that matches the current filter as a spreadsheet file">Download CSV</button>
      </div>
      <div class="sumline" id="csum"></div>
      <div class="tw" id="ctw"></div>
      <div class="pager" id="cpg"></div>
      ${guideHTML(cols, '<dt>Presets</dt><dd>Strict = flag S. Catch-all = every stored row (enough volume, more than the open interest before the day and a meaningful premium; plus big trades inside existing open interest). Biggest = flag G.</dd>')}`;
    let cur = [];
    const tw = $('#ctw', main), fp = $('#fp', main);
    const update = () => {
      const fl = st.f.contracts;
      const base = data.rows.filter(contractPred(fl));
      let ns = 0, ng = 0;
      for (const r of base) { if (r._S) ns++; if (r._G) ng++; }
      $('#presets', main).innerHTML = [['strict', 'Strict', ns, FLAGT.S], ['all', 'Catch-all', base.length, 'Every stored row'], ['big', 'Biggest', ng, FLAGT.G]]
        .map(([v, l, n, t]) => `<button class="chip${fl.p === v ? ' on' : ''}" data-preset="${v}" title="${esc(t)}">${l}<span class="c">${int(n)}</span></button>`).join('');
      const list = fl.p === 'strict' ? base.filter(r => r._S) : fl.p === 'big' ? base.filter(r => r._G) : base;
      const get = colGetter(cols, fl.sort) || colGetter(cols, 'prem');
      cur = sortRows(list, get, fl.dir);
      const pages = Math.max(1, Math.ceil(cur.length / PER));
      if (fl.pg > pages) fl.pg = pages;
      const page = cur.slice((fl.pg - 1) * PER, fl.pg * PER);
      let prem = 0, cprem = 0;
      const syms = new Set();
      for (const r of cur) { prem += r.prem || 0; if (r.cp === 'C') cprem += r.prem || 0; syms.add(r.sym); }
      $('#csum', main).innerHTML = cur.length
        ? `<span><b>${int(cur.length)}</b> ${cur.length === 1 ? 'row' : 'rows'}${pages > 1 ? ` (showing ${int((fl.pg - 1) * PER + 1)}–${int((fl.pg - 1) * PER + page.length)})` : ''}</span><span><b>${int(syms.size)}</b> ${syms.size === 1 ? 'name' : 'names'}</span><span><b>${money(prem)}</b> premium</span><span><b>${prem ? Math.round(100 * cprem / prem) : 0}%</b> calls</span>`
        : `<span>${data.rows.length ? 'No rows match these filters.' : 'No unusual contracts were stored for this session.'}</span>`;
      tw.innerHTML = cur.length ? `<table class="bw">${theadHTML(cols, fl)}<tbody>${rowsHTML(cols, page)}</tbody></table>` : '';
      $('#cpg', main).innerHTML = pagerHTML(cur.length, fl.pg);
      const n = activeFilterCount('contracts', ['p', 'cp', 'idx', 'q', 'sort', 'dir', 'pg']);
      $('#ftog', main).textContent = fp.classList.contains('open') ? 'Hide filters' : 'Filters' + (n ? ' (' + n + ')' : '');
      $$('#sdchips button', main).forEach(b => b.classList.toggle('on', fl.side.indexOf(b.dataset.sd) >= 0));
    };
    bindControls(main, 'contracts', update);
    bindTable(tw, 'contracts', cols, update);
    bindPager($('#cpg', main), 'contracts', update, tw);
    main.addEventListener('click', e => {
      const p = e.target.closest('[data-preset]');
      if (p) { st.f.contracts.p = p.dataset.preset; st.f.contracts.pg = 1; syncHash(); update(); return; }
      const sd = e.target.closest('[data-sd]');
      if (sd) {
        const fl = st.f.contracts, c = sd.dataset.sd;
        fl.side = fl.side.indexOf(c) >= 0 ? fl.side.replace(c, '') : 'ABMU'.split('').filter(x => x === c || fl.side.indexOf(x) >= 0).join('');
        fl.pg = 1; syncHash(); update(); return;
      }
    });
    $('#ftog', main).addEventListener('click', () => { fp.classList.toggle('open'); update(); });
    $('#creset', main).addEventListener('click', () => { st.f.contracts = Object.assign({}, DEF.contracts); syncHash(); route(); });
    $('#ccsv', main).addEventListener('click', () => download(`russell_uoa_${T}_${st.f.contracts.p}.csv`, csvOf(data.cols, cur)));
    update();
  }


  function nameCols(T) {
    return [
      { k: 'sym', h: 'Ticker', cls: 'stk', dir0: 'a', get: r => r._q, tip: 'The stock or ETF and its index. Tap a row for its page.', cell: r => `<a class="tk" href="${nameHref(r.sym)}">${esc(r.sym)}</a>${ixb(r.idx)}` },
      { k: 'tier', h: 'Tier', get: tierSortKey, dir0: 'a', tip: 'The name\'s better ranked side this session (see the Top tab), in the order A informed look, L buyer unconfirmed, B explained by earnings, C already moving, Other, J ambiguous. ▲ = bullish, ▼ = bearish. Blank = not ranked. Sorts in tier order, best first.', cell: r => tierCell(r.tier) },
      { k: 'score', h: 'Score', cls: 'r', tip: 'That ranked row\'s score (0–100). It orders rows inside a tier only.', cell: r => isNum(r.score) ? r.score.toFixed(1) : '<span class="dim">–</span>' },
      { k: 'biz', h: '<span class="hl">Business</span><span class="hs">Biz</span>', tip: BIZ_TIP + ' Green strong, amber middling, grey weak. Funds and companies reporting too few of the six numbers have none.', cell: r => bizCell(r.biz, r.idx) },
      { k: 'cpsh', h: 'Calls : Puts', get: r => cpOk(r.cp) ? cpShare(r.cp) : null, tip: 'Open call vs put contracts at every strike in every expiry (1Y+), from the newest chain settle up to this session. Green = the calls\' share; white tick and ▲/▼ = the share a week earlier over the same expiries. Greyed = thin (few contracts). Sorts by the calls share.', cell: r => cpCell(r.cp, r.cps) },
      { k: 'move', h: 'Move', cls: 'r', tip: 'Close-to-close change on the session.', cell: r => `<span class="${signCls(r.move)}">${pct(r.move)}</span>` },
      { k: 'n', h: 'Rows', cls: 'r', tip: 'Unusual contracts (all), with how many are strict (S) and big (G).', cell: r => r.n ? `${int(r.n)}${r.ns || r.ng ? `<div class="cellsub">${r.ns ? r.ns + ' S' : ''}${r.ns && r.ng ? ' · ' : ''}${r.ng ? r.ng + ' G' : ''}</div>` : ''}` : '<span class="dim">0</span>' },
      { k: 'cprem', h: 'Call $', cls: 'r', tip: 'Premium of the unusual call rows.', cell: r => r.cprem ? `<span class="up">${money(r.cprem)}</span>` : '<span class="dim">–</span>' },
      { k: 'pprem', h: 'Put $', cls: 'r', tip: 'Premium of the unusual put rows.', cell: r => r.pprem ? `<span class="dn">${money(r.pprem)}</span>` : '<span class="dim">–</span>' },
      { k: 'tot', h: 'Total $', cls: 'r', tip: 'Call plus put premium of the unusual rows.', cell: r => r.tot ? `<b class="wh">${money(r.tot)}</b>` : '<span class="dim">–</span>' },
      { k: 'cpremA', h: 'Calls @ask', cls: 'r c-cpA', tip: 'Call premium where the last trade was at the ask (likely bought).', cell: r => r.cpremA ? money(r.cpremA) : '<span class="dim">–</span>' },
      { k: 'ppremA', h: 'Puts @ask', cls: 'r c-ppA', tip: 'Put premium where the last trade was at the ask (likely bought).', cell: r => r.ppremA ? money(r.ppremA) : '<span class="dim">–</span>' },
      { k: 'nopen', h: 'Opened', cls: 'r', tip: 'Unusual rows the next session\'s chain confirmed as new positions.', cell: r => r.nopen ? int(r.nopen) : '<span class="dim">–</span>' },
      { k: 'top', h: 'Top contract', get: r => r.top || '', dir0: 'a', tip: 'The single largest-premium contract.', cell: r => { if (!r.top) return '<span class="dim">–</span>'; const p = String(r.top).split('|'); return `${expShort(p[0], T)} <span class="cp ${esc(p[1])}">${esc(p[1])}</span> ${esc(p[2])}`; } },
      { k: 'sector', h: 'Sector', cls: 'c-sec', dir0: 'a', tip: 'Sector from the Russell member list.', cell: r => `<div class="sec">${esc(r.sector || '–')}</div>` },
      { k: 'mcap', h: 'Mkt cap', cls: 'r', tip: 'Market capitalisation.', cell: r => money(r.mcap) },
      { k: 'spot', h: 'Spot', cls: 'r c-nsp', tip: 'Closing price on the session.', cell: r => px2(r.spot) },
      { k: 'adv', h: 'Avg $ vol', cls: 'r c-adv', tip: 'Average dollars of stock traded per day over the last month.', cell: r => money(r.adv) },
      { k: 'earn', h: 'Earnings', get: r => r.earn || '', dir0: 'a', tip: 'Next earnings date, when known.', cell: r => r.earn ? `${expShort(r.earn, T)} <span class="cellsub">${daysBetween(T, r.earn)}d</span>` : '<span class="dim">–</span>' }
    ];
  }

  function tierSortKey(r) { const t = tierOf(r.tier); return t ? TIER_ORDER.indexOf(t.t) * 1000 + (100 - (isNum(r.score) ? r.score : 0)) : null; }
  function tierCell(v) {
    const t = tierOf(v);
    if (!t) return '<span class="dim">–</span>';
    return `${tierb(t.t)}${t.side ? `<span class="tdir ${t.side === 'bull' ? 'up' : 'dn'}" title="${SIDEN[t.side]}">${t.side === 'bull' ? '▲' : '▼'}</span>` : ''}`;
  }
  const dots = (n, of) => { let h = '<span class="dots" title="' + (isNum(n) ? n : 0) + ' of ' + of + ' sessions">'; for (let i = 0; i < of; i++) h += `<i class="${i < (n || 0) ? 'on' : ''}"></i>`; return h + '</span>'; };

  async function viewNames(main, seq) {
    const T = st.T;
    const nm = await loadNames(T);
    if (seq !== renderSeq) return;
    const cols = nameCols(T), f = st.f.names;
    for (const r of nm.rows) r.act = !!r.n;
    main.innerHTML = `
      <div class="viewbar">
        ${seg('act', f.act, [[1, 'With unusual contracts', 'Names with unusual contracts this session'], [0, 'All names', 'Every member with a saved chain this session, even with no unusual contracts']])}
        ${seg('idx', f.idx, [['', 'All'], ['R2000', 'R2000'], ['R1000', 'R1000'], ['ETF', 'ETF'], ['AI', 'AI stocks', AI_TIP]])}
        <input class="q" data-f="q" value="${esc(f.q)}" placeholder="Ticker…" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Ticker search">
        <label class="fg"><span class="lab">Sector</span><select data-f="sec">${optionList([['', 'All']].concat(nm.sectors.map(s => [s, s])), f.sec)}</select></label>
      </div>
      <div class="sumline" id="nsum"></div>
      <div class="tw" id="ntw"></div>
      <div class="pager" id="npg"></div>
      ${guideHTML(cols)}`;
    const tw = $('#ntw', main);
    const update = () => {
      const fl = st.f.names, toks = tokens(fl.q);
      const list = nm.rows.filter(r => (!fl.act || r.act || (toks.length && symMatch(toks, r._n))) && idxOK(r, fl.idx) &&
        (!fl.sec || r.sector === fl.sec) && (!toks.length || symMatch(toks, r._n)));
      const get = colGetter(cols, fl.sort) || colGetter(cols, 'tot');
      const cur = sortRows(list, get, fl.dir);
      const pages = Math.max(1, Math.ceil(cur.length / PER));
      if (fl.pg > pages) fl.pg = pages;
      const page = cur.slice((fl.pg - 1) * PER, fl.pg * PER);
      let c = 0, p = 0;
      for (const r of cur) { c += r.cprem || 0; p += r.pprem || 0; }
      $('#nsum', main).innerHTML = cur.length
        ? `<span><b>${int(cur.length)}</b> ${cur.length === 1 ? 'name' : 'names'}</span><span>calls <b class="up">${money(c)}</b></span><span>puts <b class="dn">${money(p)}</b></span>${fl.act ? `<span class="muted">${int(nm.rows.length)} members with a saved chain this session</span>` : ''}`
        : '<span>No names match.</span>';
      tw.innerHTML = cur.length ? `<table class="bw">${theadHTML(cols, fl)}<tbody>${rowsHTML(cols, page, r => `<tr class="click" data-sym="${esc(r.sym)}">`)}</tbody></table>` : '';
      $('#npg', main).innerHTML = pagerHTML(cur.length, fl.pg);
    };
    bindControls(main, 'names', update);
    bindTable(tw, 'names', cols, update);
    bindPager($('#npg', main), 'names', update, tw);
    update();
  }


  function viewAbout(main) {
    main.innerHTML = `<div class="wrap">
      <h2>About this board</h2>
      <h3>What it covers</h3>
      <p class="txt">Every Russell 2000 member (the IWM universe), every Russell 1000 member (the IWB universe), and the IWM and IWB ETFs: about 1,700 names with a whole-session option chain saved after each close. Each session keeps a catch-all store of unusual contracts; the presets and filters on the Contracts tab narrow it down, the Top tab ranks them for direction trades.</p>
      <h3>What counts as unusual</h3>
      <ul class="txt">
        <li><b>Stored (catch-all)</b>: enough volume, more contracts traded than were open before the day, and a meaningful premium, not expiring the same day. Big trades inside existing open interest are stored too (flag O).</li>
        <li><b>S</b> strict: large volume, far above the open interest before the day, and a large premium.</li>
        <li><b>G</b> big: one of the largest premiums of the day.</li>
        <li><b>D</b> deep in the money: the strike is far in the money (often stock replacement or dividend trades, left out of the ranking).</li>
        <li><b>P</b> spread: another strike of the same expiry and type traded in matching size, unless both legs printed at the ask or both at the bid. The row keeps the dearer leg; premium = net.</li>
        <li><b>Side</b>: where the last trade printed against the closing quote, read only when that trade came near the close. Ask = likely bought, Bid = likely sold, Mid = between; otherwise unknown.</li>
        <li><b>Price</b>: the mid quote when the last trade came near the close (or there was no trade price); otherwise the last trade. Premium = volume × price × 100.</li>
        <li><b>Next day</b>: what the next session's chain says about open interest. OPENED when it rose by a large part of the volume (new positions), CLOSED when it fell by that much, MIXED in between, GONE when the contract is no longer listed. Until that chain is saved the row says Pending.</li>
      </ul>
      ${rankingAboutHTML()}
      <h3>Business score and Calls : Puts</h3>
      <p class="txt"><b>Business</b> (0–100) scores six numbers about the company (revenue growth year on year, EPS growth, PEG, free cash flow growth and margin, revenue growth quarter on quarter), each ranked against the S&amp;P 500 + Nasdaq-100. Funds (IWM, IWB) and companies that report too few of the six numbers have none. It is shown for context only: <b>it is not used in the ranking</b> or the tiers. Green = strong, amber = middling, grey = weak.</p>
      <p class="txt"><b>Calls : Puts</b> counts every open call contract against every open put contract, at all strikes, in the expiries of each window (1M, 3M, 6M and 1Y+ = all; the board shows 1Y+), from the newest chain settle saved for the name. "6.7× calls" means 6.7 calls open for every put; the white tick and ▲/▼ show the calls share a week earlier over the same expiries. One contract counts once whatever its price, and the split says nothing about who is long or short. A thin book is greyed. Also display only.</p>
      <h3>When each part lands</h3>
      <ul class="txt">
        <li><b>Unusual contracts</b>: once a name's whole-session chain is saved after the close. A session stays <i>partial</i> until chains are in for nearly as many names as the previous complete session had.</li>
        <li><b>Next-day status</b> (Opened / Closed / Mixed / Gone): with the next session's chain, which carries the settled open interest. Older days fill in after the fact.</li>
      </ul>
      <p class="txt muted">Updated ${esc(builtET(META.built))}</p>
    </div>`;
  }


  function rankingAboutHTML() {
    return `<h3>Ranking (Top tab)</h3>
      <div class="honest"><b>Why this shape</b>The one documented footprint of informed trading is short-dated out-of-the-money options bought to open before unscheduled news, which is rare. Tier A looks for exactly that.</div>
      <p class="txt" style="margin-top:10px">The Top tab ranks names for direction trades: <b>Bullish</b> (shares or calls) and <b>Bearish</b> (puts, or a reason to avoid). The rules were written down before any outcome was scored and are never tuned on outcomes.</p>
      <ul class="txt">
        <li><b>Which rows.</b> The session's unusual contracts, leaving out deep in-the-money ones. Bullish evidence: calls bought at the ask count in full, calls at mid or with an unknown side count partly, calls at the bid count not at all (they were sold), and puts sold at the bid add a little. Bearish evidence is the mirror image. A name gets a row on a side when that weighted premium is large enough. A spread counts at its net premium.</li>
        <li><b>Tiers are pass/fail checks, in this order</b> (the score only orders rows inside a tier):
          <ol>
            <li><b>J, ambiguous</b>: mostly sold at the bid, two-sided, mostly spreads, or mostly closed the next day.</li>
            <li><b>C, already moving</b>: the stock already moved a lot in the trade's direction for its usual daily swing, today or over the last week.</li>
            <li><b>B, explained</b>: an earnings date on or before the main contract's expiry.</li>
            <li><b>A, informed look</b>: a big premium for the stock, mostly bought at the ask, nearly all on this side, mostly in short-dated out-of-the-money contracts, and a short-dated main contract. An unknown earnings date is allowed and shown as "earnings unknown".</li>
            <li><b>L, A-like, buyer unconfirmed</b>: passes every A check except the bought share, and little was sold at the bid. The last trades came before the close, so who bought is unknown.</li>
            <li><b>Other</b>: passed J, C and B but missed one or more A checks, and is not L.</li>
          </ol></li>
        <li><b>Score (0–100)</b> mixes size (the premium against the stock's normal dollar trading, and in dollars), conviction (bought at the ask, opened the next day, one-sided), footprint (short-dated out-of-the-money share, new strikes, number of strikes, days in a row), unexplained (no earnings before the main expiry) and not chased (the stock has not already run with the trade).</li>
        <li><b>KDJ is a confirm column only</b> and never enters the score: a fresh weekly, 2-week or monthly golden cross ("wash" = from a washout) or coil breaks near-ties inside a tier.</li>
      </ul>`;
  }




  const pxG = v => v == null || !isFinite(v) ? '–' : v >= 1000 ? v.toFixed(0) : v >= 100 ? v.toFixed(1) : v.toFixed(2);
  function niceStep(range, n) {
    const raw = range / (n || 6), p = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) || 10 * p;
  }
  function priceSVG(bars, W, H) {
    const O = (bars || []).filter(b => b && isNum(b[1])), N = O.length;
    if (N < 2) return '<div class="empty small">No price history.</div>';
    const padL = 6, padR = 60, cw = W - padL - padR, step = cw / N, X = i => padL + (i + 0.5) * step;
    const pTop = 14, pBot = H - 24;
    const cs = O.map(r => r[1]), hs = O.map(r => isNum(r[2]) ? r[2] : r[1]), ls = O.map(r => isNum(r[3]) ? r[3] : r[1]);
    let lo = Math.min.apply(null, ls), hi = Math.max.apply(null, hs);
    if (hi - lo < hi * 1e-6) { hi += Math.max(0.01, hi * 0.01); lo -= Math.max(0.01, lo * 0.01); }
    const padY = (hi - lo) * 0.06; lo -= padY; hi += padY;
    const y = p => pTop + (hi - p) / (hi - lo) * (pBot - pTop);
    let s = `<svg class="gch" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${N}-day price" style="display:block;font-variant-numeric:tabular-nums;font-family:inherit">`;
    const gs = niceStep(hi - lo);
    for (let p = Math.ceil(lo / gs) * gs; p < hi; p += gs) s += `<line x1="${padL}" x2="${padL + cw}" y1="${y(p).toFixed(1)}" y2="${y(p).toFixed(1)}" stroke="#1e2230"/><text x="${padL + cw + 6}" y="${(y(p) + 4).toFixed(1)}" fill="#787b86" font-size="11">${p.toFixed(gs < 1 ? 2 : gs < 10 ? 1 : 0)}</text>`;
    s += `<line x1="${padL + cw}" x2="${padL + cw}" y1="${pTop}" y2="${pBot}" stroke="#2a2e39"/><line x1="${padL}" x2="${padL + cw}" y1="${pBot}" y2="${pBot}" stroke="#2a2e39"/>`;
    if (O.some(r => isNum(r[2]) && isNum(r[3]))) {
      const up = O.map((r, i) => `${X(i).toFixed(1)},${y(hs[i]).toFixed(1)}`).join(' '), dn = O.map((r, i) => `${X(N - 1 - i).toFixed(1)},${y(ls[N - 1 - i]).toFixed(1)}`).join(' ');
      s += `<polygon points="${up} ${dn}" fill="rgba(209,212,220,.10)"/>`;
    }
    s += `<polyline points="${O.map((r, i) => `${X(i).toFixed(1)},${y(cs[i]).toFixed(1)}`).join(' ')}" fill="none" stroke="#d1d4dc" stroke-width="1.4" stroke-linejoin="round"/>`;
    let lastM = -1, lastX = -99;
    O.forEach((r, i) => { const d = D(r[0]), mo = d.getUTCMonth(); if (mo !== lastM) { lastM = mo; if (X(i) - lastX < 34) return; lastX = X(i); s += `<line x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="${pBot}" y2="${pBot + 4}" stroke="#363a45"/><text x="${(X(i) + 2).toFixed(1)}" y="${H - 6}" fill="#787b86" font-size="11">${MON[mo]}</text>`; } });
    const lp = cs[N - 1];
    s += `<rect x="${padL + cw + 2}" y="${(y(lp) - 9).toFixed(1)}" width="${padR - 4}" height="18" fill="#2962ff" rx="2"/><text x="${padL + cw + 6}" y="${(y(lp) + 4).toFixed(1)}" font-size="11" fill="#fff">${pxG(lp)}</text>`;
    return s + '</svg>';
  }


  async function viewName(main, seq) {
    let sym = st.sym;
    const T = st.T;
    const nm = await loadNames(T).catch(() => null);
    let row = nm && nm.by.get(sym);
    if (nm && !row) {
      const n = norm(sym), alt = nm.rows.find(r => r._n === n);
      if (alt) { row = alt; sym = st.sym = alt.sym; }
    }
    const nf = await getJSON(nameURL(sym)).catch(e => ({ __err: e }));
    if (seq !== renderSeq) return;
    let rrows = null;
    const sT = !nf.__err && (nf.sessions || []).find(s => s.T === T);
    if (sT && Array.isArray(sT.rank)) rrows = prepRank(toObjs({ cols: nf.rank_cols || [], rows: sT.rank })).rows;
    else if (row) {
      try { rrows = (await loadRank(T)).rows.filter(r => r.sym === sym); } catch (e) { rrows = null; }
      if (seq !== renderSeq) return;
    }
    const back = `<a class="back" href="${esc(st.back)}">← Back</a>`;
    if (nf.__err && !row) {
      main.innerHTML = back + `<div class="empty">No data for ${esc(sym)}. It may not be a Russell member, or no whole-session option chain was saved for it in the sessions shown here.</div>`;
      return;
    }
    const info = nf.__err ? {} : nf;
    const idx = info.idx || (row && row.idx), sector = info.sector || (row && row.sector), mcap = isNum(info.mcap) ? info.mcap : row && row.mcap;
    const earn = (row && row.earn) || info.earn;
    const upToT = d => !T || d <= T;
    const bars = (info.bars || []).filter(b => upToT(b[0]));
    const bizD = info.biz || (row && isNum(row.biz) ? { score: row.biz, m: [] } : null);
    const sCp = (info.sessions || []).find(x => x.T === T);
    let cpD = sCp && sCp.cp !== undefined ? sCp.cp : null;
    if (!cpD && row && cpOk(row.cp)) cpD = { settle: row.cps, H: { '1Y+': row.cp } };
    let spot = row && row.spot, move = row && row.move;
    if (!isNum(spot) && bars.length) { spot = bars[bars.length - 1][1]; move = bars.length > 1 ? spot / bars[bars.length - 2][1] - 1 : null; }
    const all = info.sessions || [];
    const sessions = all.filter(s => upToT(s.T));
    const ccols = contractCols(T, false).map(c => Object.assign({}, c, { get: false }));
    const groups = [];
    let nUA = 0;
    for (const s of sessions) {
      const cr = toObjs({ cols: info.contract_cols || [], rows: s.contracts || [] });
      for (const r of cr) { r._T = s.T; const f = r.flags || ''; r._D = f.indexOf('D') >= 0; }
      if (cr.length) { groups.push({ T: s.T, rows: cr }); nUA += cr.length; }
    }
    main.innerHTML = `${back}
      <div class="nhead"><span class="t">${esc(sym)}</span>${ixb(idx)}<span class="px">${px2(spot)}</span><span class="${signCls(move)}">${pct(move)}</span></div>
      <div class="nmeta"><span>Sector <b>${esc(sector || '–')}</b></span><span>Market cap <b>${money(mcap)}</b></span><span>Earnings <b>${earn ? esc(dateFull(earn)) + (T ? ` (${daysBetween(T, earn)}d)` : '') : 'unknown'}</b></span><span>Session <b>${esc(dateLong(T))}</b></span>${row ? `<span>Avg $ vol <b>${money(row.adv)}</b></span>` : ''}</div>
      ${nf.__err ? `<div class="banner">No detail file for ${esc(sym)} yet (${esc(nf.__err.message)}). The numbers above come from the session's name list.</div>` : ''}
      ${rankBlockHTML(rrows, T, row)}
      <div class="charts one">
        <div class="card2 pcard"><h4><span>Price, ${bars.length} days to ${esc(expShort(T || (bars.length ? bars[bars.length - 1][0] : ''), T))}</span></h4><div id="pchart"></div></div>
      </div>
      <div class="bcgrid">${bizCardHTML(bizD, idx, mcap, sector)}${cpCardHTML(cpD, T)}</div>
      <div class="nsecbar"><span class="t">Unusual contracts <span class="c">${int(nUA)}</span></span><span class="muted">${sessions.length ? `${int(sessions.length)} ${sessions.length === 1 ? 'session' : 'sessions'} to ${esc(dateLong(sessions[0].T))}` : 'no sessions up to this date'}</span></div>
      <div id="nsec"></div>
      <div style="height:30px"></div>`;
    const secEl = $('#nsec', main);
    const bodyHTML = (g, full) => {
      const rows = full ? g.rows : g.rows.slice(0, GROUP_CAP);
      const more = g.rows.length - rows.length;
      return `<div class="tw"><table class="bw">${theadHTML(ccols, null)}<tbody>${rowsHTML(ccols, rows, null)}</tbody></table></div>` +
        (more > 0 ? `<button class="btn g more" data-more="1">Show all ${int(g.rows.length)} rows (${int(more)} more)</button>` : '');
    };
    const hasT = groups.some(g => g.T === T);
    const lead = !hasT ? `<div class="empty small" style="padding:10px 14px">No unusual contracts for ${esc(sym)} on ${esc(dateLong(T))}${groups.length ? '; earlier sessions below.' : ' or the sessions before it on this page.'}</div>` : '';
    secEl.innerHTML = lead + groups.map((g, i) => {
      let prem = 0; for (const r of g.rows) prem += r.prem || 0;
      const isT = g.T === T;
      return `<details class="sgrp" data-i="${i}"${isT ? ' open' : ''}><summary><b>${esc(dateFull(g.T))}</b> · ${int(g.rows.length)} ${g.rows.length === 1 ? 'row' : 'rows'} · ${money(prem)}${isT ? ' <span class="selb">selected session</span>' : ''}</summary><div class="gbody"></div></details>`;
    }).join('');
    $$('details.sgrp', secEl).forEach(d => {
      const fill = () => { const b = $('.gbody', d); if (d.open && !b.innerHTML) b.innerHTML = bodyHTML(groups[+d.dataset.i], false); };
      d.addEventListener('toggle', fill);
      fill();
    });
    const drawPrice = () => {
      const box = $('#pchart', main);
      if (!box || seq !== renderSeq) return;
      const W = Math.max(240, Math.floor(box.clientWidth || 600));
      box.innerHTML = priceSVG(bars, W, window.innerWidth <= 760 ? 260 : 340);
    };
    drawPrice();
    redrawName = drawPrice;
    main.addEventListener('click', e => {
      const m = e.target.closest('[data-more]');
      if (m) { const d = m.closest('details.sgrp'); if (d) $('.gbody', d).innerHTML = bodyHTML(groups[+d.dataset.i], true); }
    });
    if (rrows && rrows.length) loadRank(T).then(rk => {
      if (seq !== renderSeq) return;
      $$('.rpos', main).forEach(el => {
        const same = rk.rows.filter(x => x.side === el.dataset.side && x.tier === el.dataset.tier);
        const i = same.findIndex(x => x.sym === sym);
        if (i >= 0) el.textContent = `#${i + 1} of ${same.length} in ${el.dataset.tier === 'N' ? 'Other' : 'tier ' + el.dataset.tier}`;
      });
    }).catch(() => {});
  }


  const BIZLAB = { rev_yoy: 'Revenue YoY', eps_yoy: 'EPS YoY', peg: 'PEG', fcf_growth: 'FCF growth', fcf_margin: 'FCF margin', rev_qoq: 'Revenue QoQ' };
  const BIZORDER = ['rev_yoy', 'eps_yoy', 'peg', 'fcf_growth', 'fcf_margin', 'rev_qoq'];
  function bizCardHTML(b, idx, mcap, sector) {
    if (!b || !isNum(b.score)) return `<div class="card2 bzcard"><h4><span>Business</span><span class="muted">${idx === 'ETF' ? 'fund' : 'no score'}</span></h4><div class="note">${idx === 'ETF' ? 'Funds have no business score.' : 'No business score: too few of the six numbers are reported for this company, or it is not covered.'}</div></div>`;
    const cls = bizCls(b.score), m = Array.isArray(b.m) ? b.m : [];
    const val = (k, v) => v == null ? (k === 'peg' && b.peg_note ? (b.peg_note === 'loss' ? 'loss' : 'EPS falling') : 'n/a') : k === 'peg' ? v.toFixed(2) : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
    const rows = BIZORDER.map(k => m.find(x => x[0] === k)).filter(Boolean).map(([k, , , v, p]) =>
      `<span>${BIZLAB[k]}</span><span class="num r">${val(k, v)}</span><i class="pbar"><b class="${p == null ? 'lo' : bizCls(p)}" style="width:${p == null ? 0 : p}%"></b></i><span class="num r">${p == null ? '–' : Math.round(p)}</span>`).join('');
    return `<div class="card2 bzcard"><h4><span>Business</span><span class="muted">shown, not used for ranking</span></h4>
      <div class="bzbig"><b class="bzt ${cls}">${b.score}</b><span class="muted">/100</span><span class="bz wide ${cls}"><i><b style="width:${b.score}%"></b></i></span><span class="muted">${bizWord(b.score)}</span></div>
      ${rows ? `<div class="bzgrid now"><span class="muted h">Number</span><span class="muted h r">Value</span><span class="muted h">vs S&amp;P + NDX</span><span class="muted h r">pctl</span>${rows}</div>` : ''}
      <div class="note" style="margin-top:6px">${isNum(mcap) ? money(mcap) + ' market cap · ' : ''}${esc(sector || '')}${sector ? '. ' : ''}Each number is ranked against the S&amp;P 500 + Nasdaq-100 (0 = worst, 100 = best; for PEG lower is better, and a loss or falling EPS counts as the worst); the score is their mix.</div></div>`;
  }
  function cpCardHTML(d, T) {
    const H = (d && d.H) || {};
    const rows = CP_HS.map(h => { const c = H[h]; if (!cpOk(c)) return '';
      return `<span class="${h === '1Y+' ? 'wh' : 'muted'}">${h}</span><span class="${cpThin(c) ? 'thin' : ''}" title="${esc(cpTip(c, h, d.settle, d.ref_settle))}">${cpBar(c, 'wide')}</span><span class="r">${cpLab(c)}</span>${cpMove(c)}`; }).join('');
    const head = '<h4><span>Calls : puts</span><span>open contracts</span></h4>';
    if (!rows) return `<div class="card2 cpcard">${head}<div class="note">No open-interest count from a saved chain for this name up to ${esc(dateLong(T))}.</div></div>`;
    const c = cpOk(H['1Y+']) ? H['1Y+'] : null, wk = c && cpWk(c);
    const old = d.settle && T && daysBetween(d.settle, T) > 7;
    const adds = c && wk != null ? ` A week earlier (${esc(dateLong(d.ref_settle))}, same expiries) ${Math.round(wk * 100)}% calls: calls <b class="${c[0] >= c[2] ? 'up' : 'dn'}">${c[0] - c[2] >= 0 ? '+' : '−'}${kf(Math.abs(c[0] - c[2]))}</b>, puts <b class="${c[1] >= c[3] ? 'dn' : 'up'}">${c[1] - c[3] >= 0 ? '+' : '−'}${kf(Math.abs(c[1] - c[3]))}</b>.` : c ? ' No chain settle from a week earlier, so no week-ago tick.' : '';
    return `<div class="card2 cpcard">${head}<div class="cpg">${rows}</div>
      ${c ? `<div class="txt" style="margin-top:6px">1Y+: <b>${kf(c[0])}</b> calls vs <b>${kf(c[1])}</b> puts open, ${Math.round(cpShare(c) * 100)}% calls.${adds}</div>` : ''}
      <div class="note" style="margin-top:4px">Settle ${d.settle ? '<b class="' + (old ? 'am' : 'wh') + '">' + esc(dateLong(d.settle)) + '</b>' : '–'} from the saved chain${old ? ' (older than a week before the session)' : ''}${d.ref_settle ? ` · week-ago settle ${esc(dateLong(d.ref_settle))}` : ''}. Expiries after ${esc(dateLong(T))}: 1M, 3M, 6M and 1Y+ (all). Green = calls' share, red = puts'. White tick = a week ago. Every strike counts (in the money too); greyed = thin (few contracts).</div></div>`;
  }
  function rankBlockHTML(rrows, T, row) {
    if (rrows == null) return '';
    if (!rrows.length) return `<div class="nrank none">Not ranked on ${esc(dateLong(T))}: neither side reached the premium needed for a row. <a class="lnk" href="${hashFor('top')}">Top lists</a></div>`;
    return `<section class="nrank"><div class="rlh"><span class="t">Ranking · ${esc(dateLong(T))}</span><a class="s lnk" href="${hashFor('top')}">Top lists →</a></div>` +
      rrows.slice().sort((a, b) => a._to - b._to || (a.side === 'bear') - (b.side === 'bear')).map(r => `<div class="tg"><span class="${r.side === 'bear' ? 'dn' : 'up'}">${esc(SIDEN[r.side] || r.side)}</span> <span class="rpos" data-side="${esc(r.side)}" data-tier="${esc(r.tier)}">${esc(TIERN[r.tier] || '')}</span></div>` + rankRowHTML(r, T, null, { nolink: true })).join('') + '</section>';
  }


  let renderSeq = 0, lastRoute = null, redrawName = null;
  function freshMain() {

    const old = $('#main'), n = old.cloneNode(true);
    old.parentNode.replaceChild(n, old);
    return n;
  }
  async function route() {
    if (!META) return;
    parseHash();
    if (st.route !== 'name') st.back = hashFor(st.route);
    renderBar();
    renderBanner();
    redrawName = null;
    const seq = ++renderSeq, main = freshMain();
    const key = st.route + '|' + st.T + '|' + (st.sym || '') + '|' + (SIMPLE() ? 'simple' : 'full');
    if (key !== lastRoute) { main.innerHTML = '<div class="empty">Loading…</div>'; lastRoute = key; }
    try {
      if (st.route === 'top') await (SIMPLE() ? viewSimple(main, seq) : viewTop(main, seq));
      else if (st.route === 'contracts') await viewContracts(main, seq);
      else if (st.route === 'names') await viewNames(main, seq);
      else if (st.route === 'about') viewAbout(main);
      else if (st.route === 'name') await viewName(main, seq);
      if (seq === renderSeq) syncHash();
    } catch (e) {
      if (seq !== renderSeq) return;
      main.innerHTML = `<div class="empty">${e.status === 404 ? 'This part of the session is not built yet.' : 'Could not load: ' + esc(e.message)}</div>`;
      console.warn(e);
    }
  }
  const bustFor = m => { BUST = m && m.built ? '?b=' + encodeURIComponent(m.built) : ''; };
  async function boot() {
    try {
      META = await getJSON('meta.json');
      bustFor(META);
      try { const a = await getJSON('ai.json'); AIN = new Map(Object.entries((a && a.names) || {})); } catch (e) { AIN = new Map(); }
    } catch (e) {
      $('#main').innerHTML = `<div class="empty">${e.status === 404 ? 'Not published yet.' : 'Could not load the data: ' + esc(e.message)}</div>`;
      return;
    }
    if (!META.sessions || !META.sessions.length) { $('#main').innerHTML = '<div class="empty">No sessions yet.</div>'; return; }
    $('#sess').addEventListener('change', e => goSession(e.target.value));
    $('#banner').addEventListener('click', e => { const a = e.target.closest('[data-goto]'); if (a) { e.preventDefault(); goSession(a.dataset.goto); } });
    $('#upd').addEventListener('click', e => {
      if (!e.target.closest('a')) return;
      e.preventDefault();
      cache.clear(); DS = {}; $('#upd').innerHTML = '';
      getJSON('meta.json').then(m => { META = m; bustFor(m); lastRoute = null; route(); });
    });
    window.addEventListener('hashchange', () => route());
    window.addEventListener('resize', debounce(() => { if (redrawName) redrawName(); }, 150));
    route();

    setInterval(() => {
      fetch(BASE + 'meta.json?t=' + Math.floor(Date.now() / 60000), { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(m => {
        if (m && META && m.built !== META.built) $('#upd').innerHTML = `<a href="#">New data ${esc(builtET(m.built))} · refresh</a>`;
      }).catch(() => {});
    }, 300000);
  }
  boot();
})();
