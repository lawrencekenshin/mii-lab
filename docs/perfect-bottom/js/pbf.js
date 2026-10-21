

(function () {
  const CH = window.PBFCharts;
  let P = null;
  const TFS = ['1D', '1W', '2W', '1M'];
  const LADDER = ['1D', '1W', '2W', '1M'];
  const TFN = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  const TFL = { '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' };
  const UNIT = { '1D': ['session', 'sessions'], '1W': ['week', 'weeks'], '2W': ['2-week candle', '2-week candles'], '1M': ['month', 'months'] };
  const RUNG = { 1: 'Not turned yet', 2: 'Daily turned', 3: 'Weekly turned', 4: '2-week turned', 5: 'Monthly turned' };
  const RUNG_SHORT = { 1: 'washed', 2: 'daily', 3: 'weekly', 4: '2-week', 5: 'monthly' };
  const RUNG_SUB = { 1: 'daily K still below D', 2: 'daily K crossed above D', 3: 'then the weekly', 4: 'then the 2-week', 5: 'then the monthly' };
  const GROUP_DESC = {
    1: 'The daily is still down.',
    2: 'The daily is up. The weekly is next.',
    3: 'The weekly is up. The 2-week is next.',
    4: 'The 2-week is up. The monthly is next.',
    5: 'The monthly is up. It crossed after the daily, weekly and 2-week; shorter ones can dip back.'
  };
  const CIRC = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤' };
  const TIER = {
    deep: { name: 'Perfect washout', rule: 'D in the basement on all four timeframes', short: 'Perfect' },
    broad: { name: 'Washed everywhere', rule: 'J below its floor or D in the basement on all four timeframes', short: 'Everywhere' }
  };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TOP_N = 6;
  const FULL_N = 40;
  const WATCH = [];
  const STOCK = {};


  const pd = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const md = iso => { const d = pd(iso); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const dmd = iso => { const d = pd(iso); return DOW[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const dow = iso => DOW[pd(iso).getUTCDay()];
  const mY = iso => { const d = pd(iso); return MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const myy = iso => { const d = pd(iso); return MON[d.getUTCMonth()] + " '" + String(d.getUTCFullYear()).slice(2); };
  const money = p => p == null ? '—' : '$' + (p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : p >= 1 ? p.toFixed(2) : p.toFixed(3));
  const kmoney = p => p == null ? '—' : (p >= 10 && Math.abs(p - Math.round(p)) < 0.005 ? '$' + Math.round(p).toLocaleString('en-US') : money(p));
  const cap = m => !m ? '' : m >= 1e12 ? '$' + (m / 1e12).toFixed(1) + 'T' : m >= 1e10 ? '$' + Math.round(m / 1e9) + 'B' : m >= 1e9 ? '$' + (m / 1e9).toFixed(1) + 'B' : '$' + Math.round(m / 1e6) + 'M';
  const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + '%';
  const pc = (v, d = 0) => v == null ? '—' : (100 * v).toFixed(d) + '%';
  const spc = (v, d = 1) => v == null ? '—' : sgn(100 * v, d);
  const num = (v, d = 1) => v == null ? '—' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const daysBetween = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
  const inDays = k => k === 0 ? 'same day as the close' : k === 1 ? 'in 1 day' : `in ${k} days`;
  const nextSession = iso => { const d = pd(iso); do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6); return d.toISOString().slice(0, 10); };
  const numSpan = (k, outline) => `<span class="num${outline ? ' o' : ''}">${k}</span>`;
  const fx = v => v == null ? '—' : (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + '×';
  const fx2 = v => v == null ? '—' : (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)) + '×';
  const kfmt = v => v == null ? '—' : (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v)));
  let DATA_DATE = null, NEXT = null;

  const futureSessions = () => { const f = ((P && P.next_sessions) || []).slice(0, 12); let d = f.length ? f[f.length - 1] : DATA_DATE; while (f.length < 12) { d = nextSession(d); f.push(d); } return f; };
  const maxd = (a, b) => (a && b ? (a > b ? a : b) : a || b);


  const S = { view: 'board', tier: 'deep', mode: 'asif', sym: 'MCD', win: '2021+', set: 'tier', sort: 'rank', all: false };
  const OPEN = new Set();
  const q = (o = {}) => {
    const t = o.tier || S.tier, m = o.mode || S.mode, view = o.view || (S.view === 'stock' ? 'board' : S.view);
    const parts = []; if (t === 'broad') parts.push('tier=broad'); if (m === 'conf') parts.push('mode=conf');
    if (view === 'full') {
      const set = o.set || (o.tier ? 'tier' : S.set), sort = o.sort || S.sort, all = o.all != null ? o.all : S.all;
      if (set !== 'tier') parts.push('set=' + set); if (sort !== 'rank') parts.push('sort=' + sort); if (all) parts.push('n=all');
    }
    return '#' + view + (parts.length ? '?' + parts.join('&') : '');
  };
  function parseHash() {
    const h = location.hash.replace(/^#/, '');
    const [path, qs] = h.split('?');
    const params = new URLSearchParams(qs || '');
    S.tier = params.get('tier') === 'broad' ? 'broad' : 'deep';
    S.mode = params.get('mode') === 'conf' ? 'conf' : 'asif';
    S.win = params.get('win') === '2013' ? '2013-2020' : '2021+';
    S.set = ['partial', 'all'].includes(params.get('set')) ? params.get('set') : 'tier';
    S.sort = ['stage', 'new', 'depth', 'calls'].includes(params.get('sort')) ? params.get('sort') : 'rank';
    S.all = params.get('n') === 'all';
    if (path.startsWith('stock/')) { S.view = 'stock'; S.sym = decodeURIComponent(path.slice(6)).toUpperCase(); }
    else if (path === 'full') S.view = 'full';
    else S.view = 'board';
  }
  function route(keepScroll) {
    parseHash();
    const app = document.getElementById('app');
    app.className = 'wrap' + (S.view === 'full' ? ' wide' : '');
    if (S.view === 'stock') {
      const sym = S.sym;
      if (STOCK[sym] === undefined && BY[sym]) {
        app.innerHTML = `<a class="crumb" href="${q({ view: 'board' })}">‹ Back to the board</a><p class="lede">Loading ${esc(sym)}…</p>`;
        STOCK[sym] = null;
        getJSON('stock/' + encodeURIComponent(sym) + '.json').then(d => { STOCK[sym] = d; }, () => { STOCK[sym] = false; })
          .then(() => { if (S.view === 'stock' && S.sym === sym) route(true); });
        if (!keepScroll) window.scrollTo(0, 0);
        return;
      }
      if (STOCK[sym] === null) return;
      try { app.innerHTML = renderStock(sym); endScroll(); } catch (err) {
        console.error(err);
        app.innerHTML = `<a class="crumb" href="${q({ view: 'board' })}">‹ Back to the board</a><p class="lede">${esc(sym)}'s stock page could not be drawn (${esc(err.message)}).</p>`;
      }
    }
    else {
      app.innerHTML = S.view === 'full' ? renderFull() : renderBoard();
      if (S.view === 'full') ftCue();
    }
    if (!keepScroll) window.scrollTo(0, 0);
  }

  const endScroll = () => document.querySelectorAll('.chartx[data-end]').forEach(el => { if (el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth; });

  function ftCue() {
    const w = document.querySelector('.ftwrap'); if (!w) return;
    const more = w.scrollWidth > w.clientWidth + 2, end = w.scrollLeft + w.clientWidth >= w.scrollWidth - 2;
    w.parentElement.classList.toggle('more', more && !end);
    const c = document.querySelector('.ftcue'); if (c) c.hidden = !more;
  }

  const GH = /(^|\.)github\.io$/i.test(location.hostname);
  const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/perfect-bottom-data/perfect-bottom/';
  let BASE = GH ? RAW : 'snap/';
  const fetchJSON = url => fetch(url, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const getJSON = name => fetchJSON(BASE + name).catch(err => { if (BASE === RAW) throw err; BASE = RAW; return fetchJSON(BASE + name); });

  const builtWords = () => {
    if (!P || !P.built_utc) return '—';
    const d = new Date(P.built_utc), o = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    const et = d.toLocaleString('en-US', Object.assign({ timeZone: 'America/New_York' }, o)), me = d.toLocaleString('en-US', o);
    return et === me ? et + ' ET' : `${et} ET (${me} your time)`;
  };


  const BY = {};


  const epOf = (n, tier) => tier === 'deep' ? n.ep.deep : (n.ep.broad || (n.ep.deep ? Object.assign({ via: 'deep' }, n.ep.deep) : null));
  const stageOf = (n, tier, mode) => { const e = epOf(n, tier); return e ? (mode === 'conf' ? e.sc : e.sa) : 0; };
  const inTier = tier => P.names.filter(n => epOf(n, tier)).sort((a, b) => a.rank - b.rank);
  const stageCountsOf = (tier, mode) => { const c = { S1: 0, S2: 0, S3: 0, S4: 0, S5: 0 }; inTier(tier).forEach(n => { c['S' + stageOf(n, tier, mode)]++; }); return c; };
  const upOf = (n, tf, mode) => mode === 'conf' ? n.tf[tf].uc : n.tf[tf].side === 1;
  const M = mode => mode === 'conf' ? { st: 'sc', us: 'uc', best: 'bc', bd: 'bdc', sl: 'slc', rungs: 'rc' } : { st: 'sa', us: 'ua', best: 'ba', bd: 'bda', sl: 'sla', rungs: 'ra' };
  const whenWord = by => by === 'next session' ? dmd(NEXT) : dmd(by);

  function yellow(n, tf) {
    const yd = n.yd; if (!yd) return '';
    const k = { '1D': 'D', '1W': 'W', '2W': '2W', '1M': 'M' }[tf];
    return (yd.now || []).includes(k) ? '<span class="yd" title="Washout yellow dot on the last finished candle"></span>'
      : (yd.recent || []).includes(k) ? '<span class="yd ring" title="Washout yellow dot 1-2 candles ago"></span>' : '';
  }
  function chips(n, mode) {
    return '<div class="chips">' + TFS.map(tf => {
      const t = n.tf[tf], up = upOf(n, tf, mode), asif = mode === 'asif' && up && !t.uc;
      return `<span class="chipw"><span class="chip${up ? ' up' : ''}${asif ? ' asif' : ''}">${tf}</span>${yellow(n, tf)}</span>`;
    }).join('') + '</div>';
  }
  function pctAway(p, tf) {
    if (p == null) return '';
    if (p > 0) return `needs ${sgn(p)}`;
    if (tf === '1D') return `a flat close crosses it (${sgn(p)})`;
    return p < 0 ? `holds at today's price (${Math.abs(p).toFixed(1)}% above)` : "at today's price";
  }
  function nextLine(nx, mode) {
    if (!nx) return null;
    const tfw = TFN[nx.tf];
    if (nx.pct == null) {
      if (/any close/.test(nx.note || '')) return `${tfw} crosses up at any close ${nx.by === 'next session' ? 'next session' : 'by ' + md(nx.by)}`;
      return `${tfw} can't cross on this candle`;
    }
    if (nx.tf === '1D') return `Daily needs <span class="price">≥ ${sgn(nx.pct)}</span> next session`;
    if (mode === 'conf') return `${tfw} confirms if ${dmd(nx.by)} closes ≥ <span class="price">${sgn(nx.pct)}</span>`;
    return `${tfw} needs <span class="price">≥ ${sgn(nx.pct)}</span> by ${md(nx.by)}`;
  }
  const confirmWords = nc => (!nc || nc.pct == null) ? '' : `${TFL[nc.tf]} confirms if ${dow(nc.by === 'next session' ? NEXT : nc.by)} ≥ ${sgn(nc.pct)}`;
  const kingDist = d => Math.abs(d) < 0.005 ? 'at the King' : (Math.abs(d) < 0.1 ? (Math.abs(d) * 100).toFixed(1) : Math.round(Math.abs(d) * 100)) + '%' + (d >= 0 ? ' above' : ' below');


  const CW = () => (P.calls && P.calls.words) || { stealth: {}, loud: {} };
  const cbLink = (board, sym) => `../${board}-calls/` + (sym ? '#s=' + encodeURIComponent(String(sym).replace(/-/g, '.')) : '');
  function badges(c, short, sym) {
    if (!c) return '';
    let h = '';
    if (c.st) h += `<a class="cbadge" href="${cbLink('stealth', sym)}" title="Stealth Calls: ${esc(CW().stealth[c.st] || c.st)}">Stealth ${c.st === 'WATCH' ? (short ? 'W' : 'watch') : c.st}</a>`;
    if (c.ld) h += `${h ? ' ' : ''}<a class="cbadge" href="${cbLink('loud', sym)}" title="Loud Calls: ${esc(CW().loud[c.ld] || c.ld)}">Loud ${c.ld}</a>`;
    return h;
  }
  function callsCell(n) {
    const c = n.c; if (!c || (!c.st && !c.ld)) return '';
    return `<div class="l3 cl">${badges(c, false, n.sym)}</div>`;
  }
  const badgesShort = (c, sym) => badges(c, true, sym);
  const callsSettle = () => P.calls ? md(P.calls.settle) : null;


  function turnWords(n, tier, mode) {
    const e = epOf(n, tier), k = M(mode), st = e[k.st], best = e[k.best];
    let l1, l2 = '';
    if (st <= 1) {
      l1 = best <= 1 ? '<span class="mut">Nothing crossed up yet</span>' : `<span class="mut">Turned up to ${CIRC[best]}, then slipped back</span>`;
      if (best > 1) l2 = `reached ${CIRC[best]} ${RUNG_SHORT[best]} ${md(e[k.bd])} · slipped back ${md(e[k.sl])}`;
    } else {
      const top = LADDER[st - 2], since = e[k.us][top];
      const asif = mode === 'asif' && !n.tf[top].uc;
      const down = TFS.filter(tf => !upOf(n, tf, mode));
      if (st === 5 && !down.length) l1 = `All four up · monthly ${md(since)}${asif ? ' <span class="asifw">as if</span>' : ''}`;
      else l1 = `${TFN[top]} crossed up ${md(since)}${asif ? ' <span class="asifw">as if</span>' : ''}`;
      if (down.length && st >= 3) {
        const below = down.filter(tf => LADDER.indexOf(tf) < st - 2).map(tf => TFL[tf]);
        if (below.length) l1 += ` · ${below.join(', ')} dipped`;
      }
      if (best > st) l2 = `had reached ${CIRC[best]} ${RUNG_SHORT[best]} ${md(e[k.bd])} · slipped back ${md(e[k.sl])}`;
    }
    return { l1, l2 };
  }
  function nextWords(n, tier, mode) {
    const e = epOf(n, tier), st = mode === 'conf' ? e.sc : e.sa;
    let n1 = '', n2 = '';
    if (mode === 'asif') {
      if (e.na) {
        n1 = nextLine(e.na, 'asif'); n2 = pctAway(e.na.pct, e.na.tf);
        if (e.nc && +String(e.nc.rung).replace('S', '') <= st && e.nc.pct != null) n2 += (n2 ? ' · ' : '') + confirmWords(e.nc);
      } else if (e.nc && e.nc.pct != null) {
        n1 = `${TFN[e.nc.tf]} confirms if ${dmd(e.nc.by)} ≥ <span class="price">${sgn(e.nc.pct)}</span>`; n2 = pctAway(e.nc.pct, e.nc.tf);
      } else {
        n1 = e.uc['1M'] ? `Monthly confirmed at the ${md(e.uc['1M'])} close` : 'Monthly up'; n2 = '';
      }
    } else {
      if (e.nc) { n1 = nextLine(e.nc, 'conf'); n2 = pctAway(e.nc.pct, e.nc.tf); }
      else { n1 = e.uc['1M'] ? `Monthly confirmed at the ${md(e.uc['1M'])} close` : 'Monthly up'; n2 = ''; }
    }
    return { n1, n2 };
  }

  function groupSortKey(n, tier, mode) {
    const e = epOf(n, tier), k = M(mode), st = e[k.st];
    if (st <= 1) return e.e1;
    return e[k.us][LADDER[st - 2]] || e.e1;
  }

  function rowHTML(n, tier, mode, idx) {
    const e = epOf(n, tier);
    const isNew = e.age === 0;
    const stock = `<div class="c-stock"><div class="l1"><a class="tk" href="#stock/${n.sym}">${n.sym}</a></div>` +
      `<div class="l2 wr">${esc(n.name || '')}${n.ind ? ' · ' + esc(n.ind) : ''}</div></div>`;
    const depth = n.depth == null ? '' : n.depth > -0.5 ? ' · at its high' : ` · ${Math.abs(n.depth).toFixed(0)}% off high`;
    const wash = `<div class="c-wash"><div class="l1 wr">Washed out ${md(e.e1)}${e.via ? ' <span class="mut">(perfect)</span>' : ''}${isNew ? '<span class="badge">NEW</span>' : ''}</div>` +
      `<div class="l2 wr">${isNew ? 'today' : e.age + ' session' + (e.age === 1 ? '' : 's') + ' ago'}${depth}</div></div>`;
    const tw = turnWords(n, tier, mode);
    const turn = `<div class="c-turn"><div class="l1 wr">${tw.l1}</div>${tw.l2 ? `<div class="l2 slip">${tw.l2}</div>` : ''}${chips(n, mode)}</div>`;
    const nw = nextWords(n, tier, mode);
    const next = `<div class="c-next"><div class="l1 wr">${nw.n1}</div><div class="l2 wr">${nw.n2}</div></div>`;
    const ret = e.ret == null ? 0 : e.ret;
    const fell = e.low && e.low.date !== e.e1 ? `fell ${sgn(e.low.pct)} first` : 'never closed lower';
    const since = `<div class="c-ret"><div class="retbig ${ret >= 0 ? 'pos' : 'neg'}">${sgn(ret)}</div>` +
      `<div class="l2 wr">${fell}</div></div>`;
    const ctx1 = n.biz != null ? `Business <b>${n.biz}</b>` : '';
    const ctx2 = n.king ? `<span class="king">♛ King ${kmoney(n.king.k)}</span> · ${kingDist(n.king.dist)}` : '';
    const ctx = `<div class="c-ctx ctx"><div class="l1 wr" style="font-weight:500;color:var(--muted)">${ctx1 || '—'}</div>${ctx2 ? `<div class="l2 wr">${ctx2}</div>` : ''}${callsCell(n)}</div>`;
    return `<div class="row cols${WATCH.includes(n.sym) ? ' hl' : ''}${idx >= 3 ? ' r4' : ''}">${stock}${wash}${turn}${next}${since}${ctx}</div>`;
  }

  function controls(view) {
    const tier = S.tier, mode = S.mode;
    return `<div class="ctrls">
      <div class="seg sm"><span class="lbl">Washout</span><a href="${q({ tier: 'deep', view })}" class="${tier === 'deep' && (view !== 'full' || S.set === 'tier') ? 'on' : ''}" title="${TIER.deep.rule}">Perfect washout <small>${inTier('deep').length}</small></a><a href="${q({ tier: 'broad', view })}" class="${tier === 'broad' && (view !== 'full' || S.set === 'tier') ? 'on' : ''}" title="${TIER.broad.rule}">Washed everywhere <small>${inTier('broad').length}</small></a></div>
      <div class="seg sm"><span class="lbl">Read</span><a href="${q({ mode: 'asif', view })}" class="${mode === 'asif' ? 'on' : ''}">As if closed today</a><a href="${q({ mode: 'conf', view })}" class="${mode === 'conf' ? 'on' : ''}">Confirmed at the close</a></div>
      <span class="ctrl-note">${TIER[tier].name} = ${TIER[tier].rule.replace(' timeframes', '')} · counts = washout started in the last 6 months</span>
      <div class="seg sm right"><a href="${q({ view: 'board' })}" class="${view === 'board' ? 'on' : ''}">Simple</a><a href="${q({ view: 'full' })}" class="${view === 'full' ? 'on' : ''}">Full table</a></div>
    </div>`;
  }


  function renderBoard() {
    const tier = S.tier, mode = S.mode;
    const list = inTier(tier);
    const sc = stageCountsOf(tier, mode);
    const newToday = list.filter(n => epOf(n, tier).age === 0 && n.fs[tier]).map(n => n.sym);
    const m = P.meter, mPct = Math.round(m.now * 100);
    const mWord = m.strong ? '<span class="word strong">STRONG</span>' : m.armed ? '<span class="word armed">ARMED</span>' : '<span class="word calm">QUIET</span>';
    let h = `<div class="head"><div>
        <h1>Which stocks are washed out on every timeframe — and which have started to turn?</h1>
        <p class="lede">Washed out = the KDJ is in the <b>basement</b> on the <b>daily, weekly, 2-week and monthly</b> candles on the same day.
        After that, the turn climbs a ladder from the short timeframe to the long one.<span class="ph-hide"> Week, 2-week and month are read as if the candle closed at the ${md(DATA_DATE)} price.</span></p>
      </div></div>`;
    h += controls('board');
    const turning = sc.S2 + sc.S3;
    h += `<div class="tiles">
      <div class="tile"><div class="big">${P.counts.full_stack_today[tier]}</div><div><div class="lab">washed out on all four right now</div>
        <div class="sub">${newToday.length} new today${newToday.length ? ': <b>' + newToday.slice(0, 5).join(', ') + '</b>' + (newToday.length > 5 ? ` + ${newToday.length - 5} more` : '') : ''}</div></div></div>
      <div class="tile"><div class="big">${turning}</div><div><div class="lab">turning up</div>
        <div class="sub"><b>${sc.S2}</b> daily crossed up · <b>${sc.S3}</b> weekly crossed up<br>${sc.S4 + sc.S5} further along (2-week or monthly)</div></div></div>
      <div class="tile meter"><div class="big">${mPct}<small>%</small></div><div><div class="lab">Market meter ${mWord}</div>
        <div class="sub">of stocks washed out<br>on the weekly KDJ</div></div>
        <div class="spark">${CH.sparkMeter(m.daily, { w: 300, h: 92 })}</div></div>
    </div>`;
    h += `<div class="ladderbar"><span class="ttl">The turn, step by step</span><span class="ttl2">${mode === 'conf' ? 'confirmed at the candle close' : 'as if the week, 2-week and month closed today'} · click a step to jump</span></div>`;
    h += '<div class="ladder">' + [1, 2, 3, 4, 5].map(k =>
      `<a class="rung" href="#g${k}" data-jump="g${k}">${numSpan(k)}<div><div class="rt">${RUNG[k]}</div><div class="rs">${RUNG_SUB[k]}</div></div><div class="rc">${sc['S' + k]}</div></a>`).join('') + '</div>';
    h += `<div class="thead cols"><div>Stock<small>name · industry</small></div><div>Washed out<small>the day all four hit the basement</small></div>
      <div>The turn so far<small><span class="kchip up">1W</span> up · <span class="kchip up asif">1W</span> as if · <span class="yd"></span> Washout dot · <span class="yd ring"></span> 1–2 ago</small></div><div>Next step<small>close needed for the next rung, from the last close</small></div>
      <div>Since the washout<small>from that day's close</small></div><div>Business · King<small>Stealth / Loud call boards${P.calls ? ' · ' + callsSettle() + ' settle' : ''}</small></div></div>`;
    [1, 2, 3, 4, 5].forEach(k => {
      const g = list.filter(n => stageOf(n, tier, mode) === k)
        .sort((a, b) => { const wa = WATCH.includes(a.sym), wb = WATCH.includes(b.sym); if (wa !== wb) return wa ? -1 : 1;
          const ka = groupSortKey(a, tier, mode), kb = groupSortKey(b, tier, mode); return ka < kb ? 1 : ka > kb ? -1 : a.rank - b.rank; });
      const open = OPEN.has(k);
      h += `<div class="ghead" id="g${k}">${numSpan(k)}<span class="gt">${RUNG[k]}</span><span class="gd">${GROUP_DESC[k]}</span>` +
        `<span class="gn">${g.length} stock${g.length === 1 ? '' : 's'} · newest step first${g.length > TOP_N ? `<a href="#" data-open="${k}">${open ? 'Show top ' + TOP_N + ' ‹' : 'Show all ' + g.length + ' ›'}</a>` : ''}</span></div>`;
      (open ? g : g.slice(0, TOP_N)).forEach((n, i) => { h += rowHTML(n, tier, mode, open ? 0 : i); });
    });
    h += `<div class="foot">Data: daily candles through the ${dmd(DATA_DATE)} close (${P.counts.universe_today.toLocaleString()} stocks with that close; ETFs left out).
      KDJ, Washout H and RSI on the daily, weekly, 2-week and monthly candles; the week, 2-week and month are read as if the candle closed at the last price. An episode starts on the first all-four day after a long quiet stretch without one;
      the ladder follows it for about six months and climbs on the first day if a rung is already up. Dates in “crossed up” = the start of the current run above D. Close needed = the move from the last close that crosses the next rung.
      Washout dots = the Washout indicator's yellow dot on finished candles, for all ${(P.ydots.n || 0).toLocaleString()} names with enough history.${tier === 'broad' ? ` Washed everywhere also lists the ${list.filter(n => epOf(n, 'broad').via).length} Perfect-washout episodes whose own Washed-everywhere window had run out (marked “perfect”; same ladder).` : ''}
      ${P.calls ? `Stealth / Loud = the name's tier on the <a class="lnk" href="../stealth-calls/">Stealth Calls</a> and <a class="lnk" href="../loud-calls/">Loud Calls</a> boards (${dmd(P.calls.settle)} settle).` : ''}
      Built ${builtWords()}.</div>`;
    return h;
  }


  function fullList() {
    const tier = S.tier, mode = S.mode;
    let list = S.set === 'partial' ? P.names.filter(n => n.tier === 'partial') : S.set === 'all' ? P.names.slice() : inTier(tier);
    const st = n => stageOf(n, tier, mode);
    const cbRank = n => (n.c ? (n.c.st ? 2 : 0) + (n.c.ld ? 1 : 0) : 0);
    const sorters = {
      rank: (a, b) => a.rank - b.rank,
      stage: (a, b) => st(b) - st(a) || a.rank - b.rank,
      new: (a, b) => { const ea = epOf(a, tier), eb = epOf(b, tier); const ka = ea ? ea.e1 : '', kb = eb ? eb.e1 : ''; return ka < kb ? 1 : ka > kb ? -1 : a.rank - b.rank; },
      depth: (a, b) => (a.depth == null ? 1e9 : a.depth) - (b.depth == null ? 1e9 : b.depth) || a.rank - b.rank,
      calls: (a, b) => cbRank(b) - cbRank(a) || a.rank - b.rank
    };
    return list.sort(sorters[S.sort] || sorters.rank);
  }
  function renderFull() {
    const tier = S.tier, mode = S.mode;
    const all = fullList();
    const list = S.all ? all : all.slice(0, FULL_N);
    let h = `<div class="head"><div><h1>Which stocks are washed out on every timeframe — and which have started to turn?</h1>
      <p class="lede" style="max-width:1300px">Full table: every number behind the board. Purple cells = that timeframe is washed (${tier === 'deep' ? 'D in the basement' : 'J below its floor or D in the basement'}).
      <span style="color:var(--kc)">K</span> · <span style="color:var(--dc)">D</span> · <span style="color:#9a9eab">J</span>, ▲ = K above D. As if closed at the ${md(DATA_DATE)} price.</p></div></div>`;
    h += controls('full');
    const chip = (o, on, label) => `<a class="fchip${on ? ' on' : ''}" href="${q(Object.assign({ view: 'full' }, o))}">${label}</a>`;
    h += `<div class="ftools"><span class="lbl">Also</span>
      ${chip({ set: 'partial', all: false }, S.set === 'partial', `Washed on 2–3 of 4<small>${P.counts.tiers.partial}</small>`)}
      ${chip({ set: 'all', all: false }, S.set === 'all', `All<small>${P.names.length.toLocaleString()}</small>`)}
      <span class="fnote">the sets overlap: every Perfect washout is also Washed everywhere</span>
      <span class="lbl" style="margin-left:18px">Sort</span>${chip({ sort: 'rank' }, S.sort === 'rank', 'Rank')}${chip({ sort: 'stage' }, S.sort === 'stage', 'Stage')}${chip({ sort: 'new' }, S.sort === 'new', 'Newest washout')}${chip({ sort: 'depth' }, S.sort === 'depth', 'Depth')}${P.calls ? chip({ sort: 'calls' }, S.sort === 'calls', 'Calls') : ''}
      <span style="margin-left:auto;color:var(--muted);font-size:13px">Showing ${list.length.toLocaleString()} of ${all.length.toLocaleString()}<span class="ftcue" hidden> · scroll → for more</span> · ${all.length > FULL_N ? `<a class="lnk" href="${q({ view: 'full', all: !S.all })}">${S.all ? 'Show ' + FULL_N : 'Show all'}</a> · ` : ''}<a class="lnk" href="#" data-csv="1">Download CSV</a></span></div>`;
    const wkey = tier === 'deep' ? 'wd' : 'wb';
    const cs = P.calls ? `BOARD · ${md(P.calls.settle)}` : 'BOARD';
    h += `<div class="ftouter"><div class="ftwrap"><table class="ft"><thead><tr class="grp"><th colspan="8"></th><th colspan="4" class="sep">KDJ · K D J</th><th colspan="4" class="sep">Washout H</th><th colspan="4" class="sep">RSI</th><th colspan="3" class="sep"></th><th class="sep">${cs}</th></tr>
      <tr><th class="l">#</th><th class="l">Stock</th><th class="l">As if</th><th class="l">Conf.</th><th class="l">Best</th><th class="l">Washout start</th><th>Since</th><th>From high</th>
      ${TFS.map((t, i) => `<th class="${i === 0 ? 'sep' : ''}">${t}</th>`).join('')}${TFS.map((t, i) => `<th class="${i === 0 ? 'sep' : ''}">${t}</th>`).join('')}${TFS.map((t, i) => `<th class="${i === 0 ? 'sep' : ''}">${t}</th>`).join('')}
      <th class="l sep">Next close needed</th><th>Biz</th><th class="l">King</th>
      <th class="l sep">Stealth / Loud</th></tr></thead><tbody>`;
    list.forEach(n => {
      const e = epOf(n, tier), k = M(mode);
      const kdj = TFS.map((tf, i) => {
        const t = n.tf[tf];
        return `<td class="${t[wkey] ? 'w' : ''}${i === 0 ? ' sep' : ''}">${t.side === 1 ? '<span class="tri">▲</span>' : ''}<span class="k">${num(t.K)}</span> <span class="d">${num(t.D)}</span> <span class="j">${num(t.J)}</span></td>`;
      }).join('');
      const H = TFS.map((tf, i) => `<td class="${i === 0 ? 'sep' : ''}">${num(n.tf[tf].H, 2)}</td>`).join('');
      const R = TFS.map((tf, i) => `<td class="${i === 0 ? 'sep' : ''}">${num(n.tf[tf].RSI, 1)}</td>`).join('');
      let stg, nxt;
      if (e) {
        const st = e[k.st], nx = mode === 'conf' ? e.nc : e.na;
        if (nx) nxt = nx.pct == null ? `${nx.tf} ${nx.note && /any/.test(nx.note) ? 'any close' : 'not this candle'}` : `${nx.tf} ≥ ${sgn(nx.pct)} <span class="muted">${nx.by === 'next session' ? md(NEXT) : md(nx.by)}</span>`;
        else {
          const down = TFS.filter(tf => !upOf(n, tf, mode));
          nxt = down.length ? `<span class="muted">1M up · ${down.join(', ')} down</span>` : '<span class="muted">all four up</span>';
        }
        const best = e[k.best] > st ? `${numSpan(e[k.best], true)} <span class="muted">${md(e[k.bd])}</span>` : '<span class="muted">—</span>';
        stg = `<td class="l"><span class="stg">${numSpan(e.sa)}</span></td><td class="l"><span class="stg">${numSpan(e.sc, true)}</span></td>
        <td class="l"><span class="stg">${best}</span></td>
        <td class="l">${md(e.e1)} <span class="muted">(${e.age})</span></td><td class="${e.ret >= 0 ? 'pos' : 'neg'}">${sgn(e.ret)}</td>`;
      } else {
        stg = `<td class="l muted" colspan="3">washed on ${n.wn} of 4 · ${(n.washed && n.washed.broad || []).join(' ')}</td><td class="l muted">—</td><td class="muted">—</td>`;
        nxt = '<span class="muted">—</span>';
      }
      const fh = n.depth == null ? '—' : n.depth > -0.5 ? 'at high' : sgn(n.depth, 0);
      const c = n.c;
      const ccells = `<td class="l sep">${badgesShort(c, n.sym) || '<span class="muted">—</span>'}</td>`;
      h += `<tr class="${WATCH.includes(n.sym) ? 'hl' : ''}"><td class="l muted">${n.rank}</td><td class="l"><a href="#stock/${n.sym}"><b style="color:var(--bright)">${n.sym}</b></a></td>
        ${stg}<td>${fh}</td>
        ${kdj}${H}${R}<td class="l sep">${nxt}</td><td>${n.biz == null ? '—' : n.biz}</td><td class="l">${n.king ? `<span class="king">♛ ${kmoney(n.king.k)}</span>` : '<span class="muted">—</span>'}</td>${ccells}</tr>`;
    });
    h += '</tbody></table></div></div>';
    h += `<div class="foot">Best = the highest rung reached in this episode when the name has since slipped back (date first reached). Next close needed = the close that crosses the next rung (${mode === 'conf' ? 'at the candle close' : 'as if the candle closed then'}).
      Stealth / Loud = the name's tier on the Stealth Calls / Loud Calls boards.</div>`;
    return h;
  }
  function downloadCSV() {
    const tier = S.tier, mode = S.mode, k = M(mode);
    const head = ['rank', 'sym', 'name', 'tier', 'stage_asif', 'stage_conf', 'washout_start', 'sessions_since', 'ret_since_pct', 'depth_pct',
      ...TFS.flatMap(t => ['K_' + t, 'D_' + t, 'J_' + t]), ...TFS.map(t => 'H_' + t), ...TFS.map(t => 'RSI_' + t),
      'next_tf', 'next_pct', 'next_by', 'biz', 'king', 'stealth', 'loud'];
    const rows = fullList().map(n => {
      const e = epOf(n, tier), nx = e ? (mode === 'conf' ? e.nc : e.na) : null, c = n.c || {};
      return [n.rank, n.sym, n.name || '', n.tier, e ? e.sa : '', e ? e.sc : '', e ? e.e1 : '', e ? e.age : '', e ? e.ret : '', n.depth,
        ...TFS.flatMap(t => [n.tf[t].K, n.tf[t].D, n.tf[t].J]), ...TFS.map(t => n.tf[t].H), ...TFS.map(t => n.tf[t].RSI),
        nx ? nx.tf : '', nx && nx.pct != null ? nx.pct : '', nx ? nx.by : '', n.biz, n.king ? n.king.k : '',
        c.st || '', c.ld || ''];
    });
    const csv = [head].concat(rows).map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `perfect-bottom-${S.set === 'tier' ? tier : S.set}-${DATA_DATE}.csv`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }


  function tfState(t) {
    if (t.side === 1) {
      if (t.cage === 0 && t.dev) return { up: true, pill: 'Just crossed ↑ · as if', t1: 'Crossed up on this candle, as if it closed today.' };
      if (t.cage === 0) return { up: true, pill: 'Just crossed ↑', t1: null };
      return { up: true, pill: 'Up', t1: null };
    }
    const base = t.D < 20 ? ', in the basement' : '';
    const w = t.setup || 'Down leg';
    const t1 = w.indexOf('Convergence ↑') === 0 ? `K squeezed just below D${base}.` : w === 'Converged' ? `K and D flat together${base}.`
      : w.indexOf('Just crossed ↓') === 0 ? `K just crossed below D${base}.` : w.indexOf('Convergence ↓') === 0 ? `K closing in on D from below${base}.` : `K below D and still falling${base}.`;
    return { up: false, pill: w === '—' ? 'Down' : w, t1 };
  }
  function renderStock(sym) {
    const n = BY[sym], det = STOCK[sym];
    if (n && det === false) return `<a class="crumb" href="${q({ view: 'board' })}">‹ Back to the board</a><p class="lede">${esc(sym)}'s stock page could not be loaded. Try again in a minute.</p>`;
    if (!n || !det) return `<a class="crumb" href="${q({ view: 'board' })}">‹ Back to the board</a><p class="lede">${esc(sym)} is not on today's board (it is not washed on two or more timeframes and has no washout in the last 6 months).</p>`;
    const tier = n.ep.deep ? 'deep' : n.ep.broad ? 'broad' : null, e = tier ? n.ep[tier] : null, eb = n.ep.broad;
    const dr = det.daily;
    let h = `<a class="crumb" href="${q({ view: 'board' })}">‹ Back to the board</a>`;
    h += `<div class="shead"><span class="tkbig">${sym}</span><span class="nm">${esc(n.name || '')}${n.ind ? ' · ' + esc(n.ind) : ''}</span>
      <div class="px"><div class="p">${n.depth == null ? '—' : sgn(n.depth)}</div><div class="s">from its 52-week closing high · ${dmd(DATA_DATE)} close</div></div></div>`;
    let tl, steps = '';
    if (e) {
      const k = M('asif'), st = e.sa, best = e.ba;
      const i1 = Math.max(0, dr.findIndex(r => r[0] >= e.e1));
      let lowI = dr[i1]; for (let i = i1; i < dr.length; i++) if (dr[i][2] < lowI[2]) lowI = dr[i];
      const lowC = e.low;
      const ebPill = eb && eb.e1 !== e.e1 ? `<span class="pill">Washed-everywhere episode began ${md(eb.e1)}${eb.ret != null ? ` (${sgn(eb.ret)} since)` : ''}</span>` : '';
      h += `<div class="pills"><span class="pill p">${TIER[tier].name} ${md(e.e1)}${e.ret != null ? ` · ${sgn(e.ret)} since` : ''}</span>
        <span class="pill p">${numSpan(e.sa)} ${RUNG[e.sa]} · as if closed today</span>
        <span class="pill">${numSpan(e.sc, true)} ${RUNG[e.sc]} · confirmed at the close</span>${ebPill}</div>`;
      const parts = [`All four timeframes hit the basement on <b>${dmd(e.e1)}</b>${tier === 'deep' ? ' (D in the basement on all four)' : ''}.`];
      if (st >= 2) {
        const stp = [];
        for (let r = 2; r <= st; r++) {
          const tf = LADDER[r - 2], dip = !e.ua[tf], d0 = e.ua[tf] || e.ra['S' + r], asif = !dip && !n.tf[tf].uc;
          stp.push(`the ${TFL[tf]} crossed up ${d0 < e.e1 ? 'just before it (still washed), on ' : 'on '}<b>${md(d0)}</b>${asif ? ' (as if)' : ''}${dip ? ' (it has dipped back since)' : ''}`);
        }
        parts.push('Since then ' + (stp.length > 1 ? stp.slice(0, -1).join(', ') + ' and ' + stp[stp.length - 1] : stp[0]) + '.');
        if (LADDER.slice(0, st - 1).some(tf => !n.tf[tf].uc)) parts.push('“As if” = the unfinished candle counted as closed at today\'s price.');
        const topTf = LADDER[st - 2];
        if (!n.tf[topTf].uc && e.nc && e.nc.pct != null && e.nc.tf === topTf) parts.push(`A <b>${dmd(e.nc.by)}</b> close at or above <b>${sgn(e.nc.pct)}</b> from the last close confirms the ${TFL[topTf]}.`);
      } else parts.push('The daily has not crossed back above D yet.');
      if (best > st) parts.push(`It had reached ${CIRC[best]} (${RUNG_SHORT[best]}) on <b>${md(e.bda)}</b>, then slipped back on <b>${md(e.sla)}</b>.`);
      if (e.na) parts.push(e.na.pct != null ? `Next: the ${TFL[e.na.tf]} needs <b>≥ ${sgn(e.na.pct)}</b> from the last close ${e.na.tf === '1D' ? `on ${dmd(NEXT)}` : 'by <b>' + dmd(e.na.by) + '</b>'}.` : `Next: the ${TFL[e.na.tf]} ${/any/.test(e.na.note || '') ? 'crosses at any close' : "can't cross on this candle"}.`);
      parts.push(lowC.date === e.e1 ? `It has not closed below the washout close since.` : `Lowest close since the washout: <b>${md(lowC.date)}</b> (${sgn(lowC.pct)}).`);
      h += `<p class="summary">${parts.join(' ')}</p>`;
      const future = futureSessions();
      const marks = [{ date: e.e1, num: '1', label: `${md(e.e1)} · washed out`, side: 'up' }];
      for (let r = 2; r <= st; r++) {
        const tf = LADDER[r - 2], dip = !e.ua[tf], d0 = maxd(e.ua[tf] || e.ra['S' + r], e.e1), asif = !dip && !n.tf[tf].uc;
        marks.push({ date: d0, num: String(r), label: `${md(d0)} · ${TFL[tf]} turned${asif ? ' (as if)' : dip ? ' (dipped since)' : ''}`, asif, side: r === 2 ? 'down' : 'up' });
      }
      if (best > st) {
        marks.push({ date: e.bda, num: String(best), muted: true, label: `had reached ${CIRC[best]} · ${md(e.bda)}` });
        marks.push({ date: e.sla, muted: true, label: `slipped back · ${md(e.sla)}` });
      }
      if (lowC && lowC.date !== e.e1) marks.push({ date: lowC.date, label: `lowest close ${sgn(lowC.pct)} · ${md(lowC.date)}`, side: 'down' });
      const trg = [];
      for (let r = st + 1; r <= 5; r++) {
        const tf = LADDER[r - 2], t = n.tf[tf];
        if (t.side === 1 || t.tpct == null) continue;
        const by = t.tby === 'next session' ? NEXT : t.tby;
        trg.push({ price: t.tpct, until: by, num: String(r), label: `${TFN[tf]} needs ≥ ${sgn(t.tpct)}`, sub: `by ${dmd(by)} · from the last close` });
      }
      const showEarly = eb && eb.e1 !== e.e1 && eb.e1 >= dr[0][0] && dr.findIndex(r => r[0] >= e.e1) - dr.findIndex(r => r[0] >= eb.e1) >= 20;
      let start = dr[Math.max(0, i1 - 25)][0];
      if (showEarly) { const j = Math.max(0, dr.findIndex(r => r[0] >= eb.e1) - 20); if (dr[j][0] < start) start = dr[j][0]; }
      tl = CH.ladderTimeline({
        rows: dr, washedB: det.washed_broad, washedD: det.washed_deep, start, future, w: 1500,
        early: showEarly ? { date: eb.e1, label: `${md(eb.e1)} · washed everywhere`, sub: 'J below its floor or D in the basement on all four' } : null,
        marks, triggers: trg,
        band: null
      });
      const stepBox = (r, cls, tag, line1, line2) => `<div class="step ${cls}"><div class="sh">${numSpan(r, cls === 'next' || cls === 'later' || cls === 'lost')}${r === 1 ? 'Washed out' : RUNG[r]}<span class="tag ${tag[0]}">${tag[1]}</span></div><div class="sd">${line1}${line2 ? `<br><span class="mut">${line2}</span>` : ''}</div></div>`;
      const sb = [stepBox(1, 'done', ['done', 'done'], `${md(e.e1)} · all four in the basement`, lowC.date === e.e1 ? 'never closed lower since' : `lowest close since: ${sgn(lowC.pct)} · ${md(lowC.date)}`)];
      for (let r = 2; r <= 5; r++) {
        const tf = LADDER[r - 2], t = n.tf[tf];
        if (r <= st) {
          const dip = !e.ua[tf], asif = !dip && !t.uc, d0 = maxd(e.ua[tf] || e.ra['S' + r], e.e1);
          const l2 = dip ? `${TFL[tf]} K has dipped back below D since` : asif ? (e.nc && e.nc.tf === tf && e.nc.pct != null ? `confirms if ${dmd(e.nc.by)} closes ≥ ${sgn(e.nc.pct)}`
              : t.side === 1 && t.tpct != null ? `confirms if ${dmd(t.tby === 'next session' ? NEXT : t.tby)} closes ≥ ${sgn(t.tpct)}` : 'confirms at the candle close')
            : r === 2 ? `intraday low since the washout ${sgn(100 * ((1 + lowI[2] / 100) / (1 + dr[i1][3] / 100) - 1))} · ${md(lowI[0])}` : `confirmed at the ${md(e.uc[tf] || d0)} close`;
          sb.push(stepBox(r, asif ? 'done asif' : 'done', asif ? ['asif', 'as if'] : ['done', 'done'], `${md(d0)} · ${TFL[tf]} K crossed above D`, l2));
        } else {
          const by = t.tby === 'next session' ? NEXT : t.tby;
          const need = t.side === 1 ? `${TFL[tf]} is already up` : t.tpct == null ? (/any/.test(t.tnote || '') ? 'crosses at any close' : "can't cross on this candle") : `needs ≥ ${sgn(t.tpct)} by ${dmd(by)}`;
          const l2 = t.side === 1 ? 'counts once the rungs below it are up' : t.tpct != null ? `${sgn(t.tpct)} from the ${md(DATA_DATE)} close` : '';
          if (r <= best) sb.push(stepBox(r, 'lost', ['lost', 'slipped'], need, `reached by ${md(e.bda)} · slipped back ${md(e.sla)}`));
          else sb.push(stepBox(r, r === st + 1 ? 'next' : 'later', r === st + 1 ? ['next', 'next'] : ['later', 'later'], need, l2));
        }
      }
      steps = `<div class="steps">${sb.join('')}</div>`;
      h += `<div class="card"><h2>The turn, step by step<small>daily closes as % from the last close · purple strip = days washed on all four</small></h2><div class="chartx tlx" data-end="1">${tl}</div>${steps}</div>`;
    } else {
      const wl = (n.washed && n.washed.broad) || [];
      h += `<div class="pills"><span class="pill">Washed on ${n.wn} of 4 · ${wl.map(t => TFL[t]).join(', ')}</span><span class="pill">no all-four day in the last 6 months</span></div>`;
      h += `<p class="summary">${esc(sym)} is washed (J below its floor or D in the basement) on <b>${wl.map(t => TFL[t]).join(', ')}</b> but not on all four timeframes at once, so no episode is open. The four panels below show where each timeframe stands.</p>`;
      const future = futureSessions();
      const trg = [];
      LADDER.forEach((tf, i) => { const t = n.tf[tf]; if (tf === '1D' || t.side === 1 || t.tpct == null) return; const by = t.tby === 'next session' ? NEXT : t.tby; trg.push({ price: t.tpct, until: by, num: String(i + 2), label: `${TFN[tf]} needs ≥ ${sgn(t.tpct)}`, sub: `by ${dmd(by)} · from the last close` }); });
      tl = CH.ladderTimeline({ rows: dr, washedB: det.washed_broad, washedD: det.washed_deep, start: dr[Math.max(0, dr.length - 130)][0], future, w: 1500, marks: [], triggers: trg.slice(0, 3), band: null });
      h += `<div class="card"><h2>Daily closes<small>last 6 months · purple strip = days washed on all four</small></h2><div class="chartx tlx" data-end="1">${tl}</div></div>`;
    }

    h += '<div class="panels">' + TFS.map(tf => {
      const t = n.tf[tf], b = det.blocks[tf], rows = b.rows, trig = det.triggers[tf];
      const stt = tfState(t);
      const flat = t.side === 1 ? null : ((det.flat || {})[tf] || null);
      const word = /stays golden/.test(trig.kind || '') ? 'keep above' : 'needs';
      let t1 = stt.t1;
      if (!t1) { const cd = rows[rows.length - 1 - t.cage]; t1 = !cd ? 'Crossed up earlier.' : t.cage === 0 ? `Crossed up on the ${md(cd[0])} candle.` : `Crossed up ${tf === '1D' ? md(cd[0]) : 'on the ' + md(cd[0]) + ' candle'} (${t.cage} ${UNIT[tf][t.cage === 1 ? 0 : 1]} ago).`; }
      const when = whenWord(trig.by);
      const t2 = trig.pct == null ? (trig.note ? (/any/.test(trig.note) ? 'Crosses up at any close.' : "No close can cross on this candle.") : '') : (word === 'keep above'
        ? (t.cage === 0 && t.dev ? `Confirms if ${when} closes ≥ ${sgn(trig.pct)} from the last close` : `Stays up if ${when} closes ≥ ${sgn(trig.pct)} from the last close`)
        : `Crosses up if ${when} closes ≥ ${sgn(trig.pct)} from the last close`);
      const t3 = flat ? (flat.n ? `If price stays flat: crosses in ${flat.n} more ${UNIT[tf][flat.n === 1 ? 0 : 1]}.` : 'If price stays flat: no cross within 12.') : '';
      const first = rows[0][0], fl0 = tf === '1D' ? md(first) : myy(first);
      const ll = tf === '1D' ? md(rows[rows.length - 1][0]) : { '1W': 'this week', '2W': 'this 2-wk', '1M': MON[pd(DATA_DATE).getUTCMonth()] }[tf];
      const svg = CH.tfPanel(rows, { developing: !!t.dev, trigger: { price: trig.pct, word }, flat, firstLabel: fl0, lastLabel: ll });
      return `<div class="tfp"><div class="ph"><span class="tn">${TFN[tf]}</span>${yellow(n, tf) ? `<span class="ydw">${yellow(n, tf)}</span>` : ''}<span class="st ${stt.up ? 'up' : 'dn'}">${stt.pill}</span></div>${svg}
        <div class="t1">${t1}</div><div class="t2">${t2 || '&nbsp;'}</div><div class="t3">${t3 || '&nbsp;'}</div></div>`;
    }).join('') + '</div>';
    h += `<div class="legend"><span><i style="width:18px;height:2px;background:var(--kc)"></i>K (fast)</span><span><i style="width:18px;height:2px;background:var(--dc)"></i>D (slow)</span>
      <span><i style="width:18px;height:1px;background:var(--jc)"></i>J</span><span><i style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:10px solid var(--up)"></i>golden cross</span>
      <span><i style="width:14px;height:14px;background:rgba(126,87,194,.4)"></i>this candle, as if it closed today</span><span><i style="width:12px;height:12px;border-radius:50%;border:2px solid var(--yellow)"></i>cross if price stays flat (dotted path)</span>
      <span><i style="width:18px;height:0;border-top:2px dashed var(--yellow)"></i>close needed</span><span><i style="width:14px;height:14px;background:rgba(126,87,194,.2)"></i>basement</span><span><span class="yd" style="margin:0 7px 0 0"></span>Washout dot (finished candle)</span></div>`;

    const ydw = tf => { const m = { '1D': 'D', '1W': 'W', '2W': '2W', '1M': 'M' }[tf], y = n.yd; if (!y) return '<span style="color:var(--dim)">n/a</span>'; return (y.now || []).includes(m) ? '<span class="yd"></span> last candle' : (y.recent || []).includes(m) ? '<span class="yd ring"></span> 1–2 candles ago' : '<span style="color:var(--dim)">—</span>'; };
    const wk = tier === 'broad' || !tier ? 'wb' : 'wd';
    h += `<div class="readout"><div class="card" style="margin-top:0"><h2>Readings<small>as if closed at the ${md(DATA_DATE)} price · purple = washed on that timeframe</small></h2>
      <table class="rt"><thead><tr><th class="l"></th>${TFS.map(tf => `<th>${TFN[tf]}</th>`).join('')}</tr></thead><tbody>
      <tr><td class="l">KDJ  K / D / J</td>${TFS.map(tf => { const t = n.tf[tf]; return `<td class="${t[wk] ? 'w' : ''}"><span style="color:var(--kc)">${num(t.K)}</span> / <span style="color:var(--dc)">${num(t.D)}</span> / <span style="color:#9a9eab">${num(t.J)}</span></td>`; }).join('')}</tr>
      <tr><td class="l">Washout H</td>${TFS.map(tf => `<td>${num(n.tf[tf].H, 2)}</td>`).join('')}</tr>
      <tr><td class="l">RSI</td>${TFS.map(tf => `<td>${num(n.tf[tf].RSI, 1)}</td>`).join('')}</tr>
      <tr><td class="l">Washout dot</td>${TFS.map(tf => `<td>${ydw(tf)}</td>`).join('')}</tr>
      <tr><td class="l">KDJ now</td>${TFS.map(tf => { const s = tfState(n.tf[tf]); return `<td>${s.up ? `<span class="chip up">${s.pill}</span>` : `<span style="color:var(--muted)">${s.pill}</span>`}</td>`; }).join('')}</tr>
      </tbody></table></div>
      <div class="facts">
        <div class="fact"><div class="fl">Depth</div><div class="fv">${n.depth == null ? '—' : sgn(n.depth)}</div><div class="fs">below its 52-week closing high</div></div>
        <div class="fact"><div class="fl">Business score</div><div class="fv">${n.biz == null ? '—' : n.biz}</div><div class="fs">200W business score, 0–100</div></div>
        <div class="fact"><div class="fl">King node</div>${n.king ? `<div class="fv"><span class="king">♛ ${kmoney(n.king.k)}</span></div><div class="fs">tier ${n.king.tier} · ${String(n.king.exp).replace(/^(\d+)\/(\d+)\/(\d+)$/, (m0, a, b, c) => MON[+a - 1] + ' ' + (+b) + " '" + c)} expiry · ${kingDist(n.king.dist)} the close</div>` : '<div class="fv">—</div><div class="fs">no King node in the yellow-dots file</div>'}</div>
        <div class="fact"><div class="fl">Call boards</div>${n.c ? `<div class="fv">${badges(n.c, false, n.sym)}</div><div class="fs">${[n.c.st ? 'Stealth Calls: ' + esc(CW().stealth[n.c.st] || n.c.st) : '', n.c.ld ? 'Loud Calls: ' + esc(CW().loud[n.c.ld] || n.c.ld) : ''].filter(Boolean).join(' · ')}${P.calls ? ` · ${md(P.calls.settle)} settle` : ''}</div>` : `<div class="fv">—</div><div class="fs">not on the Stealth Calls or Loud Calls boards${P.calls ? ` (${md(P.calls.settle)} settle)` : ''}</div>`}</div>
      </div></div>`;
    const ep = det.episodes;
    h += `<div class="history"><span class="hl2">${sym}'s washouts since 2004</span>
      ${ep.broad.length + ep.deep.length ? '' : '<span class="muted">none</span>'}
      ${ep.broad.map(x => `<span class="ep">${mY(x.date)}</span>`).join('')}
      ${ep.deep.map(x => `<span class="ep d">Perfect · ${mY(x.date)}</span>`).join('')}</div>`;
    return h;
  }


  function vintage() {
    const cs = P.calls ? `<span class="long">· call boards ${md(P.calls.settle)} settle</span>` : '';
    document.getElementById('vintage').innerHTML =
      `<span class="dot"></span><span>As of ${dmd(DATA_DATE)} close</span><span class="long">· week, 2-week and month read as if closed · ${P.counts.universe_today.toLocaleString()} stocks with that close</span>${cs}<a class="fresh" id="fresh" href="#" hidden>new data · reload</a>`;
  }
  function wire() {
    document.addEventListener('click', ev => {
      const a = ev.target.closest('a');
      if (!a) {
        const row = ev.target.closest('.row.cols'), tk = row && row.querySelector('.tk');
        if (tk && !String(window.getSelection ? window.getSelection() : '')) location.hash = '#stock/' + tk.textContent;
        return;
      }
      if (a.dataset.open) { ev.preventDefault(); const k = +a.dataset.open; OPEN.has(k) ? OPEN.delete(k) : OPEN.add(k); route(true); return; }
      if (a.dataset.csv) { ev.preventDefault(); downloadCSV(); return; }
      if (a.dataset.jump) { ev.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (a.id === 'fresh') { ev.preventDefault(); location.reload(); }
    });
    const inp = document.getElementById('find');
    if (inp) {
      const dl = document.getElementById('syms');
      dl.innerHTML = P.names.map(n => `<option value="${n.sym}">${esc(n.name || '')}</option>`).join('');
      const go = () => { const s = inp.value.trim().toUpperCase(); if (!s) return; if (BY[s]) { inp.value = ''; inp.blur(); location.hash = '#stock/' + s; } else { inp.classList.add('miss'); inp.title = s + ' is not on today\'s board'; setTimeout(() => inp.classList.remove('miss'), 1200); } };
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
      inp.addEventListener('change', go);
    }
    window.addEventListener('hashchange', () => route());
    window.addEventListener('resize', ftCue);
    document.addEventListener('scroll', ev => { if (ev.target.classList && ev.target.classList.contains('ftwrap')) ftCue(); }, true);
    setInterval(() => {
      getJSON('manifest.json').then(m => { if (m && m.sha256 && m.sha256 !== P.sha) { const f = document.getElementById('fresh'); if (f) f.hidden = false; } }).catch(() => {});
    }, 5 * 60 * 1000);
  }
  Promise.all([getJSON('manifest.json'), getJSON('board.json')]).then(([man, board]) => {
    P = board; P.sha = man.sha256;
    DATA_DATE = P.as_of; NEXT = (P.next_sessions && P.next_sessions[0]) || nextSession(DATA_DATE);
    P.names.forEach(n => { BY[n.sym] = n; });
    vintage(); wire(); route();
  }).catch(err => {
    document.getElementById('app').innerHTML = `<div class="head"><div><h1>Perfect Bottom Finder</h1><p class="lede">The board's data is not built yet (${esc(err.message)}).</p></div></div>`;
  });
})();
