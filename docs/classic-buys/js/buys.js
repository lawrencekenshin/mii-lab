



(function () {
  let B = null;


  const GH = /(^|\.)github\.io$/i.test(location.hostname);
  const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/classic-buys-data/classic-buys/';
  let BASE = GH ? RAW : 'snap/', MAN = null;
  async function fetchJSON(url) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try { const r = await fetch(url, { cache: 'no-cache', signal: ctl.signal }); clearTimeout(t); return r; }
    catch (e) { clearTimeout(t); return null; }
  }
  async function getJSON(name, tries = 3) {
    for (let i = 0; i < tries; i++) {
      const v = name === 'manifest.json' || !MAN ? Date.now() + '' + i : (name.startsWith('names/') ? MAN.names_sha256 : MAN.sha256).slice(0, 12);
      let r = await fetchJSON(BASE + name + '?v=' + v);
      if ((!r || r.status === 404) && BASE !== RAW) { BASE = RAW; r = await fetchJSON(BASE + name + '?v=' + v); }
      if (r && r.ok) return await r.json();
      if (r && r.status === 404) return null;
    }
    throw new Error('no answer for ' + name);
  }
  async function loadBoard() {
    const m = await getJSON('manifest.json');
    if (!m) throw new Error('not published yet');
    MAN = m;
    const b = await getJSON('classic-buys.json');
    if (!b) throw new Error('not published yet');
    return b;
  }

  function nudgeTabs() {
    const t = document.querySelector('.sitehdr .tabs'), a = t && t.querySelector('[aria-current=page]');
    if (!a || t.scrollWidth <= t.clientWidth) return;
    const d = a.getBoundingClientRect().right - t.getBoundingClientRect().right;
    if (d > 0) t.scrollLeft += d;
  }

  function fmtBuilt() {
    const t = MAN && Date.parse(MAN.generated_utc);
    if (!t) return '–';
    const o = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    const et = new Date(t).toLocaleString('en-US', Object.assign({ timeZone: 'America/New_York' }, o)), me = new Date(t).toLocaleString([], o);
    return et === me ? et + ' ET' : `${et} ET (${me} your time)`;
  }
  const TFS = ['1D', '1W', '2W', '1M'];
  const BIG = ['1W', '2W', '1M'];
  const XP_TFS = ['1W', '2W', '1M', '1D'];
  const TFN = { '1D': 'Daily', '1W': 'Weekly', '2W': '2-week', '1M': 'Monthly' };
  const TFS1 = { '1D': 'D', '1W': 'W', '2W': '2W', '1M': 'M' };
  const UNIT = { '1D': ['day', 'days'], '1W': ['week', 'weeks'], '2W': ['2-week candle', '2-week candles'], '1M': ['month', 'months'] };
  const BACK = { '1D': ['session', 'sessions'], '1W': ['week', 'weeks'], '2W': ['candle', 'candles'], '1M': ['month', 'months'] };
  const THIS = { '1D': 'today', '1W': 'this week', '2W': 'this 2-week candle', '1M': 'this month' };
  const NEXT = { '1D': 'the next session', '1W': 'next week', '2W': 'the next 2-week candle', '1M': 'next month' };

  const IND = [['rsi', 'RSI', 'RSI'], ['macd', 'MACD', 'MACD'], ['stoch', 'StRSI', 'Stoch RSI'], ['kdj', 'KDJ', 'KDJ'],
    ['obv', 'OBV', 'OBV MACD'], ['wr', '%R', '%R / WMSR'], ['bb', '%B', 'BB %B']];
  const TIER_LABEL = { HOLY: 'Holy grail', GC: 'Golden cross', COIL_W: 'Weekly coil', COIL_2WM: '2W / M coil', DAILY: 'Daily', NONE: 'No signal' };
  const TABS = [
    { id: 'top', name: 'Top buys', sub: 'every name, best first', tier: null },
    { id: 'holy', name: 'Holy grail', sub: 'weekly, 2-week and monthly KDJ each crossing up or coiling', tier: 'HOLY' },
    { id: 'gc', name: 'W·2W·M golden crosses', short: 'Golden crosses', sub: 'KDJ golden cross on the weekly, 2-week or monthly', tier: 'GC' },
    { id: 'coilw', name: 'Weekly coils', sub: 'weekly K just under D and closing in', tier: 'COIL_W' },
    { id: 'coil2wm', name: '2W / M coils', sub: '2-week or monthly K just under D and closing in', tier: 'COIL_2WM' },
    { id: 'daily', name: 'Daily', sub: 'only the daily KDJ crossed up or coils', tier: 'DAILY' }
  ];
  const TAB_SW = { holy: 'var(--yellow)', gc: 'var(--up)', coilw: 'rgba(227,179,65,.6)', coil2wm: 'rgba(227,179,65,.35)', daily: 'var(--border2)' };
  const IDX = [['all', 'All'], ['spx', 'S&P 500'], ['ndx', 'Nasdaq-100'], ['watch', 'Watchlist'], ['fund', 'Funds']];
  const PAGE = 50;
  const CI = '../classic/?s=';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WINS = [['1d', '1D'], ['1w', '1W'], ['2w', '2W'], ['1m', '1M']];
  const GC_TFS = ['1W', '2W', '1M'];


  const pd = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const md = iso => { if (!iso) return '–'; const d = pd(iso.slice(0, 10)); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const dmd = iso => { const d = pd(iso); return DOW[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const yr = iso => pd(iso).getUTCFullYear();
  const money = p => p == null ? '—' : '$' + (p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : p >= 1 ? p.toFixed(2) : p.toFixed(3));

  const moneyX = p => p == null ? '—' : '$' + (p >= 1 ? p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toPrecision(4));
  const sgn = (v, d = 1) => { if (v == null) return '—'; const a = Math.abs(v).toFixed(d); return (+a === 0 ? '' : v > 0 ? '+' : '−') + a + '%'; };
  const num = (v, d = 1) => v == null ? '—' : (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  const pn = v => v > 0 ? 'pos' : v < 0 ? 'neg' : 'mut';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const plural = (k, u) => k + ' ' + u[k === 1 ? 0 : 1];

  const candleShort = (tf, iso) => {
    if (!iso) return '';
    if (tf === '1M') { const d = pd(iso); return MON[d.getUTCMonth()] + (yr(iso) !== yr(B.asof) ? " '" + String(yr(iso)).slice(2) : ''); }
    return (tf === '1W' ? 'wk ' : tf === '2W' ? '2wk ' : '') + md(iso);
  };
  const candleLong = (tf, iso) => {
    if (!iso) return '';
    if (tf === '1M') { const d = pd(iso); return MONTH[d.getUTCMonth()] + (yr(iso) !== yr(B.asof) ? ' ' + yr(iso) : ''); }
    if (tf === '1W') return 'week of ' + md(iso);
    if (tf === '2W') return '2 weeks from ' + md(iso);
    return dmd(iso);
  };
  const asifTag = '<span class="asifw">as if</span>';
  const whenShort = (tf, e, t) => e.ago === 0 && t.as_if ? THIS[tf].replace(' candle', '') + asifTag : candleShort(tf, e.date);
  const whenLong = (tf, e, t) => {
    if (e.ago === 0) return t.as_if ? THIS[tf] + asifTag : candleLong(tf, e.date) + (tf === '1D' ? '' : ' <span class="ew">(newest candle)</span>');
    return candleLong(tf, e.date) + ` <span class="ew">(${plural(e.ago, BACK[tf])} back)</span>`;
  };
  const panelDate = (tf, iso) => tf === '1W' ? 'week of ' + md(iso) : tf === '2W' ? 'from ' + md(iso) : candleLong(tf, iso);



  function kf(v) {
    const a = Math.abs(v);
    const s = a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e5 ? (a / 1e3).toFixed(0) + 'k' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'k' : a >= 1e3 ? (a / 1e3).toFixed(2) + 'k' : a.toFixed(0);
    return (v < 0 ? '−' : '') + s;
  }
  const sg = v => v == null ? '–' : (v >= 0 ? '+' : '−') + kf(Math.abs(v)).replace('−', '');
  const pc = (v, d = 0) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d) + '%';
  const exd = e => { const y = 2000 + +e.slice(0, 2), m = +e.slice(2, 4), d = +e.slice(4, 6), cy = yr(B.asof);
    return MON[m - 1] + ' ' + d + (y !== cy ? ` '${String(y).slice(2)}` : ''); };
  const bizCls = v => v >= 70 ? 'hi' : v >= 50 ? 'mid' : 'lo';
  const SH = () => B.share || {};
  const KN = () => (B.kings && B.kings.n) || 0;
  const share = c => c[0] / Math.max(c[0] + c[1], 1);
  function cpLab(c) {
    const sh = share(c), x = sh >= .5 ? c[0] / Math.max(c[1], 1) : c[1] / Math.max(c[0], 1), t = x >= 9.95 ? x.toFixed(0) : x.toFixed(1);
    return sh >= .55 ? `<b class="up">${t}× calls</b>` : sh <= .45 ? `<b class="dn">${t}× puts</b>` : `<b class="cpe">${t}× even</b>`;
  }
  function cpBar(c, cls = '') {
    const sh = share(c);
    return `<i class="cpb ${cls}"><b style="width:${(sh * 100).toFixed(1)}%"></b><em></em></i>`;
  }
  const badge10 = r => r.top10 ? '<span class="badge10 c" title="top 10% of stocks for calls share">TOP 10%</span>' : r.bot10 ? '<span class="badge10 p" title="bottom 10% of stocks for calls share">BTM 10%</span>' : '';
  function cpTip(r) {
    const c = r.cp;
    return `${kf(c[0])} calls vs ${kf(c[1])} puts open (${md(r.opt_settle)} settle${r.opt_stale ? ', an older book' : ''}), ${Math.round(share(c) * 100)}% calls` +
      (r.shp != null ? `, more call-heavy than ${Math.round(r.shp)}% of ${(SH().n || 0).toLocaleString()} stocks` : '');
  }
  function bizCell(v, wide) {
    return `<span class="bz ${bizCls(v)}${wide ? ' wide' : ''}"><i><b style="width:${v}%"></b></i><span class="num">${v}</span></span>`;
  }
  const listTag = (rk, lab = '1W') => rk ? `<span class="sktag ${rk[0] === 'C' ? 'c' : 'p'}" title="on Skew Tracker's ${lab} ${rk[0] === 'C' ? 'call' : 'put'} list, #${rk[1]} of ${rk[2]}">${rk[0] === 'C' ? 'Call' : 'Put'} list #${rk[1]}</span>` : '';
  function splitBar(nC, nP, cls = '') {
    const c = Math.max(nC || 0, 0), p = Math.max(nP || 0, 0);
    if (!c && !p) return `<i class="spb none ${cls}" title="no contracts added"></i>`;
    return `<i class="spb ${cls}"><b style="width:${(100 * c / (c + p)).toFixed(1)}%"></b><em></em></i>`;
  }
  function stripCell(r) {
    const st = r.strip || {};
    return '<span class="strip">' + WINS.map(([k, lab]) => {
      const [sd, rk] = st[k] || [];
      let cls = sd == null ? (rk ? (rk[0] === 'C' ? 'c' : 'p') : 'na') : ({ C: 'c', P: 'p' }[sd] || 'e');
      if (rk) cls += ' rk';
      const tip = sd == null && !rk ? `${lab}: no data` : `${lab}: ${({ C: 'more calls', P: 'more puts' }[sd] || 'no clear side')} opened` +
        (rk ? ` · #${rk[1]} on the ${lab} ${rk[0] === 'C' ? 'call' : 'put'} list` : '');
      return `<span class="sq ${cls}" title="${esc(tip)}">${lab}</span>`;
    }).join('') + '</span>';
  }
  const kpCls = v => v >= 80 ? 'hi' : v >= 50 ? 'mid' : 'lo';
  const ord = v => { const n = Math.round(v), t = n % 100; return n + (t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')); };
  const mUSD = v => (v < 0 ? '−' : '') + '$' + (Math.abs(v) / 1e6).toFixed(2) + 'M';

  const mapName = k => `${md(k.day)}${k.eve ? ' evening' : ''} map`;
  const KFRESH = () => (B.kings && B.kings.fresh_from) || null;
  const kingCur = k => !!(k && !k.stale);


  const offMap = (r, k) => k.d_map != null && k.d != null && pc(k.d, 1) !== pc(k.d_map, 1);
  function kingTip(r) {
    const k = r.king, n = k.neg, om = offMap(r, k);
    const mp = om ? ` (${pc(k.d_map, 1)} on the ${mapName(k)})` : '';
    return `King ${k.k} (${k.exp ? exd(k.exp) : '?'}${k.dte != null ? ', ' + k.dte + 'd' : ''}) ${k.d == null ? '' : pc(k.d, 1) + ' from the ' + money(r.close) + ' close' + mp}` +
      (k.sig != null ? `, ${k.sig.toFixed(2)}σ${om ? ' on the map' : ''}` : '') + (k.v != null ? ` · ${mUSD(k.v)}` : '') +
      (k.share != null ? ` · ${Math.round(k.share * 100)}% of the map` : '') + (k.dom != null ? `, ${k.dom.toFixed(1)}× the next strike` : '') +
      (k.held != null ? ` · same strike ${k.held} session${k.held === 1 ? '' : 's'}${k.since ? ' (since ' + md(k.since) + ')' : ''}` : '') +
      (k.pct != null ? ` · stronger than ${Math.round(k.pct)}% of ${KN().toLocaleString()} tracked names` : '') +
      (k.add != null ? ` · ${sg(k.add)} contracts at the king over the last week of settles${k.fresh != null ? ', ' + Math.round(k.fresh * 100) + '% new' : ''}` : '') +
      (n ? ` · put cluster ${n.k} (${n.d == null ? '?' : pc(n.d, 1)}) ${mUSD(n.v)}${k.outweigh ? ', bigger than the king' : ''}` : '') +
      (k.fl != null ? ` · flip ${k.fl}${k.fl_d != null ? ' (' + pc(k.fl_d, 1) + ')' : ''}` : '') +
      ` · ${mapName(k)}` + (k.stale ? `, an older map (before the ${md(KFRESH())} session): left out of Strong king, King above price and Building` : '');
  }
  function kingChips(k) {
    return (k.build && !k.stale ? `<span class="kchip fresh" title="fresh build: open interest piling up at the king contract over the last week of settles, with a large part of it new">FRESH</span>` : '') +
      (k.outweigh ? `<span class="kchip outw" title="the put-heavy cluster at ${k.neg.k} (${mUSD(k.neg.v)}) carries more gamma than the king (${mUSD(k.v)})">PUTS &gt; KING</span>` : '');
  }

  const flipTag = k => k.fl == null || k.fl_d == null ? '' :
    `<span class="ftag" title="gamma flip ${k.fl} (same map as the king): ${pc(k.fl_d, 1)} from the close">flip ${k.fl_d >= 0 ? '↑' : '↓'} ${k.fl}</span>`;
  function kingCell(r) {
    const k = r.king;
    if (!k) return '<span class="muted sm nok">no king</span>';
    const ch = kingChips(k), fl = flipTag(k), old = k.stale ? `<span class="asof">map ${md(k.day)}</span>` : '';
    return `<div class="kg${k.stale ? ' stale' : ''}" title="${esc(kingTip(r))}"><div class="kgt"><span class="lv k">${k.k} <small>${k.d == null ? '' : pc(k.d)}</small></span><span class="kh">${k.held != null ? 'held ' + k.held : ''}</span></div>` +
      (k.pct == null ? '' : `<div class="kgs"><i class="kpb ${kpCls(k.pct)}"><b style="width:${k.pct}%"></b></i><span class="kpn ${kpCls(k.pct)}">${ord(k.pct)}</span></div>`) +
      `<div class="kgc">${old}${k.exp ? `<span class="kex">${exd(k.exp)}</span>` : ''}${fl}${ch}</div></div>`;
  }
  const lvTxt = v => v == null ? '–' : String(+(+v).toFixed(2));
  const lvOf = (m, key) => { const v = m && m[key]; return v == null ? null : Array.isArray(v) ? v[0] : v; };
  function kingCard(r, L, loading) {
    const k = r.king;
    if (!k && loading) return '<div class="card2"><h4><span>King GEX</span><span class="muted">King GEX Tracker</span></h4><div class="muted sm">Loading…</div></div>';
    const walls = L ? ['Levels', `${L.res ? `call wall <b class="up">${lvTxt(lvOf(L, 'res'))}</b>` : 'no call wall'} · ${L.sup ? `put wall <b class="dn">${lvTxt(lvOf(L, 'sup'))}</b>` : 'no put wall'}` +
      `${L.air ? ` · air pocket <b>${lvTxt(lvOf(L, 'air'))}</b>` : ''} <span class="muted">(map ${md(L.d)}${L.eve ? ' evening' : ''}${L.stale ? ', stale' : ''})</span>`] : null;
    if (!k) {
      const body = L ? `The King GEX Tracker has no current king for this name (its newest map is stale or missing), so there is no strength reading. ` +
        `Newest map ${md(L.d)}${L.stale ? ' (stale)' : ''}: king <b>${lvTxt(lvOf(L, 'k'))}</b>${L.fl != null ? ` · flip <b>${lvTxt(L.fl)}</b>` : ''}` +
        `${L.res ? ` · call wall <b>${lvTxt(lvOf(L, 'res'))}</b>` : ''}${L.sup ? ` · put wall <b>${lvTxt(lvOf(L, 'sup'))}</b>` : ''}.` : 'No King GEX map for this name.';
      return `<div class="card2"><h4><span>King GEX</span><span class="muted">King GEX Tracker</span></h4><div class="txt">${body}</div></div>`;
    }
    const n = k.neg;
    const sig = k.sig != null ? k.sig.toFixed(2) + 'σ' : '';
    const onMap = offMap(r, k) ? ` <span class="muted">· ${pc(k.d_map, 1)} on the ${mapName(k)}${sig ? ', ' + sig : ''}</span>` : sig ? ` · ${sig} away` : '';
    const rows = [
      ['King', `<b>${k.k}</b> ${k.exp ? exd(k.exp) : ''}${k.dte != null ? ' (' + k.dte + 'd)' : ''} · <span class="${(k.d || 0) >= 0 ? 'up' : 'dn'}">${k.d == null ? '' : pc(k.d, 1)}</span> from the ${money(r.close)} close${onMap}`],
      ['Strength', k.pct == null ? '–' : `<span class="kgs inl"><i class="kpb ${kpCls(k.pct)}"><b style="width:${k.pct}%"></b></i><span class="kpn ${kpCls(k.pct)}">${ord(k.pct)}</span></span> of ${KN().toLocaleString()} names · ${k.v != null ? mUSD(k.v) : '–'} · ${k.share != null ? Math.round(k.share * 100) + '% of the map' : ''}${k.dom != null ? ', ' + k.dom.toFixed(1) + '× next' : ''}`],
      ['Held', k.held == null ? '–' : `${k.held} session${k.held === 1 ? '' : 's'} on this strike${k.since ? ' (since ' + md(k.since) + ')' : ''}${k.setup ? ' · ' + esc(k.setup.toLowerCase()) : ''}`],
      ['Build', k.add == null ? 'no history at the king contract' : `${sg(k.add)} contracts over the last week of settles${k.fresh != null ? ', ' + Math.round(k.fresh * 100) + '% new' : ''}${k.build && !k.stale ? ' <span class="kchip fresh">FRESH</span>' : ''}`],
      ['Put cluster', !n ? 'none on the map' : `<b>${n.k}</b> <span class="${(n.d || 0) >= 0 ? 'up' : 'dn'}">${n.d == null ? '' : pc(n.d, 1)}</span> · ${mUSD(n.v)}${k.outweigh ? ' <span class="kchip outw">BIGGER THAN THE KING</span>' : ' · smaller than the king'}`],
      ['Flip', k.fl == null ? 'none on the map' : `<b>${k.fl}</b> <span class="${(k.fl_d || 0) >= 0 ? 'up' : 'dn'}">${k.fl_d == null ? '' : pc(k.fl_d, 1)}</span> · ${(k.fl_d || 0) >= 0 ? 'above' : 'below'} the close`],
    ].concat(walls ? [walls] : []).map(([a, b]) => `<span class="kl">${a}</span><span>${b}</span>`).join('');
    const old = k.stale ? `<span class="asof" title="before the ${md(KFRESH())} session: greyed on the board, left out of Strong king, King above price and Building">an older map</span>` : '';
    return `<div class="card2${k.stale ? ' kstale' : ''}"><h4><span>King GEX</span><span class="muted">King GEX Tracker · map ${md(k.day)}${k.eve ? ' (evening)' : ''} ${old}</span></h4><div class="kcard">${rows}</div></div>`;
  }
  const BIZLAB = { rev_yoy: 'Revenue YoY', eps_yoy: 'EPS YoY', peg: 'PEG', fcf_growth: 'FCF growth', fcf_margin: 'FCF margin', rev_qoq: 'Revenue QoQ' };
  function bizCard(r, n) {
    if (!r.biz) return `<div class="card2"><h4><span>Business</span></h4><div class="muted sm">${r.kind === 'fund' ? 'Funds have no business score.' : 'No business score for this name.'}</div></div>`;
    const nb = (n && n.biz) || {}, m = {};
    (nb.m || []).forEach(x => { m[x[0]] = x; });
    const rows = ['rev_yoy', 'eps_yoy', 'peg', 'fcf_growth', 'fcf_margin', 'rev_qoq'].filter(k => m[k]).map(k => {
      const p = m[k][1];
      const val = k === 'peg' && nb.peg_note ? (nb.peg_note === 'loss' ? 'loss' : 'EPS falling') : '';
      return `<span>${BIZLAB[k]}</span><span class="num r">${val}</span><i class="pbar"><b class="${p == null ? 'lo' : bizCls(p)}" style="width:${p == null ? 0 : p}%"></b></i><span class="num r">${p == null ? '–' : Math.round(p)}</span>`;
    }).join('');
    const src = r.biz.src === 'skew' ? 'Skew Tracker' : '200W business score';
    const day = nb.day ? ' · ' + md(nb.day) : '';
    const body = n === undefined ? '<div class="muted sm">Loading…</div>' : rows ? `<div class="bzgrid">${rows}</div><div class="note">Each line = its percentile against the S&amp;P 500 + Nasdaq-100.</div>` : '<div class="muted sm">No breakdown for this name.</div>';
    return `<div class="card2"><h4><span>Business</span><span class="muted">${src}${day}</span>${bizCell(r.biz.score)}</h4>${body}</div>`;
  }



  const S = { tier: 'top', idx: 'all', sec: '', agree: 0, q: '', mode: 'asif', o: 'rank', od: 1, f: [], s: '' };
  const OPEN = new Set();
  let SHOW = PAGE;
  let AUTO = '';
  let ORDER = {}, RANK = {};
  let BYSYM = {};
  let LISTY = 0, STEPS = 0;
  const modes = () => (B && B.modes) || ['asif'];
  function q(o = {}) {
    const s = Object.assign({}, S, o), p = [];
    if (s.s) p.push('s=' + encodeURIComponent(s.s));
    if (s.tier !== 'top') p.push('tier=' + s.tier);
    if (s.idx !== 'all') p.push('idx=' + s.idx);
    if (s.sec) p.push('sec=' + encodeURIComponent(s.sec));
    if (+s.agree > 0) p.push('agree=' + s.agree);
    if (s.f && s.f.length) p.push('f=' + s.f.join(','));
    if (s.o && s.o !== 'rank') p.push('o=' + s.o);
    if (SORTS[s.o] && s.od !== SORTS[s.o][1]) p.push('od=' + s.od);
    if (s.q) p.push('q=' + encodeURIComponent(s.q));
    if (s.mode !== 'asif') p.push('mode=' + s.mode);
    return '#' + p.join('&');
  }
  function parseHash() {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    const t = p.get('tier'), i = p.get('idx'), m = p.get('mode'), sec = p.get('sec') || '';
    S.tier = TABS.some(x => x.id === t) ? t : 'top';
    S.idx = IDX.some(x => x[0] === i) ? i : 'all';
    S.mode = m === 'closed' && modes().includes('closed') ? 'closed' : 'asif';
    S.sec = sec && (ORDER[S.mode] || []).some(r => r.sector === sec) ? sec : '';
    S.agree = Math.max(0, Math.min(6, parseInt(p.get('agree'), 10) || 0));
    S.q = (p.get('q') || '').slice(0, 60);
    const f = (p.get('f') || '').split(',');
    S.f = CHIPS.map(c => c[0]).filter(id => f.includes(id));
    const o = p.get('o');
    S.o = Object.prototype.hasOwnProperty.call(SORTS, o) ? o : 'rank';
    const od = p.get('od');
    S.od = od === '1' ? 1 : od === '-1' ? -1 : SORTS[S.o][1];
    S.s = (p.get('s') || '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 12);
  }


  const go = o => `data-go="${esc(JSON.stringify(o))}" href="${q(o)}"`;
  function refreshHrefs() {
    document.querySelectorAll('a[data-go]').forEach(a => { try { a.setAttribute('href', q(JSON.parse(a.dataset.go))); } catch (e) {  } });
  }


  const M = r => r[S.mode] || r.asif;
  function prepare() {
    BYSYM = {};
    B.rows.forEach(r => { BYSYM[r.sym] = r; });
    modes().forEach(mode => {

      ORDER[mode] = B.rows.filter(r => r[mode]).sort((a, b) => a[mode].rank - b[mode].rank);
      RANK[mode] = {};
      ORDER[mode].forEach((r, i) => { RANK[mode][r.sym] = i + 1; });
    });
  }
  const inIdx = (r, idx) => idx === 'all' ? true : idx === 'spx' ? /SPX/.test(r.index || '') : idx === 'ndx' ? /NDX/.test(r.index || '')
    : idx === 'watch' ? r.index === 'WATCH' : r.kind === 'fund';
  function matcher() {
    const toks = S.q.trim().toUpperCase().split(/[\s,]+/).filter(Boolean);
    if (!toks.length) return null;
    return r => toks.some(t => r.sym.startsWith(t) || (t.length >= 3 && String(r.name || '').toUpperCase().includes(t)));
  }


  const hasFl = (r, id) => !!(r.fl && r.fl.includes(id));
  const CHIPS = [
    ['best', ['★ Best skew × classic', '★ Best'], r => !!M(r).best,
      'a Holy grail or W·2W·M golden-cross name with a high classic score, an open book among the most call-heavy of all stocks, and more calls than puts added last week'],
    ['biz60', 'Business 60+', r => hasFl(r, 'biz60'), 'business score 60 or more'],
    ['king70', 'Strong king', r => hasFl(r, 'king70'), 'a King GEX strength among the strongest of the tracked names (current maps)'],
    ['above', ['King above price', 'King above'], r => hasFl(r, 'above'), 'the king strike is above the close (current maps)'],
    ['calls', 'Calls leaning', r => hasFl(r, 'calls'), 'an open book among the most call-heavy of all stocks, or more calls than puts added last week'],
    ['build', 'Building', r => hasFl(r, 'build'), 'a FRESH king: open interest piling up at the king contract over the last week of settles, with a large part of it new (current maps)']
  ];

  const tilt = w => w && w.aC != null && w.aP != null ? (w.aC - w.aP) / Math.max(w.aC + w.aP, 1) : null;
  const SORTS = {
    rank: [r => RANK[S.mode][r.sym], 1], sym: [r => r.sym, 1], chg: [r => r.chg_1d_pct, -1], score: [r => M(r).score, -1],
    agree: [r => M(r).agree, -1], biz: [r => r.biz ? r.biz.score : null, -1], king: [r => kingCur(r.king) && r.king.pct != null ? r.king.pct : null, -1],
    cp: [r => r.sh, -1], w1d: [r => tilt(r.w && r.w['1d']), -1], w1w: [r => tilt(r.w && r.w['1w']), -1]
  };
  const SORT_OPTS = [['rank', 'Board order'], ['score', 'Score'], ['biz', 'Business'], ['king', 'King GEX strength'], ['cp', 'Calls share'],
    ['w1w', 'New calls, 1 week'], ['w1d', 'New calls, 1 day'], ['agree', 'Agreeing'], ['chg', 'Day change'], ['sym', 'Ticker']];
  function sorted(list) {
    if (S.o === 'rank' && S.od === 1) return list;
    const f = SORTS[S.o][0], rk = RANK[S.mode];
    return list.slice().sort((a, b) => {
      const x = f(a), y = f(b), nx = x == null, ny = y == null;
      const c = nx || ny ? (nx === ny ? 0 : nx ? 1 : -1) : (x < y ? -1 : x > y ? 1 : 0) * S.od;
      return c || rk[a.sym] - rk[b.sym];
    });
  }

  function baseRows(skip) {
    const mt = matcher(), ch = CHIPS.filter(c => S.f.includes(c[0]) && c[0] !== skip);
    return ORDER[S.mode].filter(r => inIdx(r, S.idx) && (!S.sec || r.sector === S.sec) && M(r).agree >= S.agree && (!mt || mt(r)) && ch.every(c => c[2](r)));
  }
  const tabOf = id => TABS.find(t => t.id === id);
  const inTab = (r, id) => { const t = tabOf(id); return !t.tier || M(r).tier === t.tier; };


  const cellCls = v => v === 2 ? 'v2' : v === 1 ? 'v1' : v === 0 ? 'v0' : v === -1 ? 'vm1' : v === 'coil' ? 'vcoil' : v === 'os' ? 'vos' : 'vna';
  const CELL_WORD = { v2: 'fresh buy signal', v1: 'bullish', v0: 'flat', vm1: 'bearish', vcoil: 'KDJ coil', vos: 'oversold', vna: 'n/a' };
  function heat(m) {
    let h = '<div class="hm"><span class="hh"></span>' + TFS.map(tf => `<span class="hh">${TFS1[tf]}</span>`).join('');
    IND.forEach(([k, lab, full]) => {
      h += `<span class="hl">${lab}</span>`;
      TFS.forEach(tf => {
        const t = m.tf[tf], c = cellCls(t && t.cells ? t.cells[k] : null);
        h += `<span class="hc ${c}" title="${TFN[tf]} ${full}: ${CELL_WORD[c]}"></span>`;
      });
    });
    return h + '</div>';
  }



  const flipOn = (tf, c) => c.on === 'next' ? NEXT[tf] : THIS[tf];
  const needsWords = c => c.reach === 'any' ? 'any close crosses' : c.reach === 'none' || c.needs == null ? 'no close crosses'
    : `needs ${moneyX(c.needs)} (${sgn(c.needs_pct)})`;
  function kdjWords(tf, t) {
    if (!t || !t.kdj) return '<span class="mut">n/a</span>';
    const k = t.kdj, g = k.gc, c = k.coil;
    const gcw = g ? `<span class="gc">GC ↑</span>${g.wash ? ' <span class="wash">washout</span>' : ''} · ${whenShort(tf, g, t)}` : '';
    const cw = c ? `<span class="cl">coil</span> · ${needsWords(c)}` : '';
    if (g && c) return gcw + ' · ' + cw;
    if (g || c) return gcw || cw;
    return k.state === 1 || (k.K != null && k.D != null && k.K > k.D) ? 'K above D' : 'K below D';
  }

  const CHART_ICON = '<svg viewBox="0 0 14 12" width="14" height="12" aria-hidden="true"><path d="M2.5 1.5v9M7 3v8M11.5 0.5v7" stroke="currentColor" stroke-width="1"/>' +
    '<rect x="1" y="3.5" width="3" height="4.5" fill="currentColor"/><rect x="5.5" y="5" width="3" height="4" fill="currentColor"/><rect x="10" y="1.5" width="3" height="4" fill="currentColor"/></svg>';
  const tagOf = r => r.kind === 'fund' ? 'FUND' : r.kind === 'dr' ? 'ADR' : r.index === 'WATCH' ? 'WATCH' : '';

  function winTip(k, w) {
    const W = ((B.options || {}).windows || {})[k] || {}, lab = k === '1d' ? 'last session' : 'last week';
    const span = W.frm ? ` (${W.frm === W.to ? md(W.frm) + ' settle' : md(W.frm) + '–' + md(W.to) + ' settles'})` : '';
    if (!w) return `${lab}: no new-position counts`;
    return `${lab}${span}: ${sg(w.aC)} calls, ${sg(w.aP)} puts added`;
  }
  function cpCell(r) {
    if (!r.cp) return '<span class="muted sm">no options data</span>';
    const w = r.w || {};
    const sp = (k, lab) => `<span class="cpm" title="${esc(winTip(k, w[k]))}"><span class="cpl">${lab}</span>${w[k] ? splitBar(w[k].aC, w[k].aP) : '<i class="spb na"></i>'}</span>`;
    return `<div class="cp${r.opt_stale ? ' stale' : ''}"><div class="cpt" title="${esc(cpTip(r))}">${cpLab(r.cp)}${r.opt_stale ? `<span class="asof">${md(r.opt_settle)}</span>` : ''}</div>` +
      `<span title="${esc(cpTip(r))}">${cpBar(r.cp)}</span><div class="cps">${sp('1d', '1D')}${sp('1w', '1W')}</div>${r.top10 || r.bot10 ? `<div class="b10">${badge10(r)}</div>` : ''}</div>`;
  }
  function gexCells(r) {
    const np = ` title="Open ${esc(r.sym)}: price chart, GEX levels and calls : puts"`;
    return `<div class="c-gex" data-np="${esc(r.sym)}"><div class="c-biz"${np}><div class="pk">Business</div>${r.biz ? `<div class="bzn ${bizCls(r.biz.score)}">${r.biz.score}</div>${bizCell(r.biz.score)}` : '<span class="muted">–</span>'}</div>` +
      `<div class="c-cp"><div class="pk">Calls : puts</div>${cpCell(r)}</div>` +
      `<div class="c-king${r.king ? '' : ' none'}"><div class="pk">King GEX</div>${kingCell(r)}<span class="gopen">open ›</span></div></div>`;
  }
  function rowHTML(r, rank) {
    const m = M(r), open = OPEN.has(r.sym), tg = tagOf(r);
    const link = `<a class="tk" href="${CI}${encodeURIComponent(r.sym)}" target="_blank" rel="noopener" title="Open ${esc(r.sym)} in Classic Indicators">${esc(r.sym)}</a>`;
    const px = `<span class="pxn"><span class="price">${money(r.close)}</span> <span class="${pn(r.chg_1d_pct)}">${sgn(r.chg_1d_pct)}</span></span>` +
      (r.last && r.last !== B.asof ? ` <span class="mut pxd" title="the newest close in for this name">${md(r.last)}</span>` : '');
    const npl = `<a class="npl" ${go({ s: r.sym })} title="Open ${esc(r.sym)}: price chart, GEX levels and calls : puts" aria-label="Open ${esc(r.sym)}: price chart, GEX levels and calls : puts">${CHART_ICON}</a>`;
    const stock = `<div class="c-stock stk"><div class="stx"><div class="l1">${link}${tg ? `<span class="itag">${tg}</span>` : ''}<span class="pxm"> &nbsp;${px}</span></div>` +
      `<div class="l2"><span class="nm" title="${esc(r.name || '')}">${esc(r.name || '')}</span>${r.sector ? `<span class="secx"><span class="sep">${r.name ? ' · ' : ''}</span>${esc(r.sector)}</span>` : ''}</div></div>${npl}</div>`;
    const sec = `<div class="c-sec"><div class="l1">${esc(r.sector || '—')}</div></div>`;
    const stale = r.last && r.last !== B.asof ? `<div class="l2 mut" title="the newest close in for this name">${md(r.last)} close</div>` : '';
    const close = `<div class="c-px"><div class="price">${money(r.close)}</div><div class="l2"><span class="${pn(r.chg_1d_pct)}">${sgn(r.chg_1d_pct)}</span></div>${stale}</div>`;
    const badge = `<span class="badge b-${m.tier}">${esc(m.tier_label || TIER_LABEL[m.tier] || m.tier)}</span>`;
    const score = `<div class="c-score"><div class="sc"><div class="sb"><i style="width:${Math.max(0, Math.min(100, m.score))}%"></i></div><span class="sn">${m.score}</span></div>${badge}</div>`;
    const kdj = `<div class="c-kdj"><div class="kd">${BIG.map(tf => `<span class="kt">${TFS1[tf]}</span><span class="kv">${kdjWords(tf, m.tf[tf])}</span>`).join('')}</div></div>`;
    const ag = `<div class="c-ag ag" title="${m.agree} of the 6 confirmations fresh on the weekly, 2-week or monthly; ${m.agree_d} on the daily">` +
      `<div class="an">${m.agree}<small>/6</small></div><div class="ad"><span class="phw">agreeing · </span>daily ${m.agree_d}</div></div>`;
    const hm = `<div class="c-heat">${heat(m)}</div>`;
    return `<div class="row cols${open ? ' open' : ''}" data-sym="${esc(r.sym)}" tabindex="0" aria-expanded="${open}">` +
      `<div class="rk">${rank}</div>${stock}${sec}${close}${score}${kdj}${ag}${hm}${gexCells(r)}</div>` + (open ? expandHTML(r, m) : '');
  }


  function events(tf, t) {
    const out = [], k = t.kdj || {};
    const li = (cls, html, ex) => out.push(`<li><span class="ed ${cls}"></span><span>${html}${ex ? `<span class="ex">${ex}</span>` : ''}</span></li>`);
    const g = k.gc;
    if (g) li('k', `<b>KDJ golden cross</b> (K over D)${g.wash ? ' out of a <span class="wash">washout</span>' : ''} · ${whenLong(tf, g, t)}`,
      g.K != null ? `K ${num(g.K)} · D ${num(g.D)} · J ${num(g.J)}` : '');
    if (k.coil) {
      const c = k.coil, on = flipOn(tf, c);
      li('c', `<b>KDJ coil</b>: K ${num(c.gap)} under D and closing · ` + (c.reach === 'any' ? `<b>any close</b> of ${on} crosses` : c.reach === 'none' || c.needs == null
        ? `no close of ${on} crosses` : `<b>needs ${moneyX(c.needs)}</b> (${sgn(c.needs_pct)}) at the close of ${on}` +
          (c.needs_pct != null && c.needs_pct <= 0 ? '; the close shown is above it' : '')));
    }
    const ev = (key, words, ex) => { const e = t[key] && t[key].ev; if (e) li('', `<b>${words}</b> · ${whenLong(tf, e, t)}`, ex(e)); };
    ev('rsi', 'RSI crossed above its MA', e => e.v != null ? `RSI ${num(e.v)} · MA ${num(e.ma)}` : '');
    ev('macd', 'MACD crossed above its signal', e => e.v != null ? `MACD ${num(e.v, Math.abs(e.v) >= 100 ? 1 : 2)}` : '');
    ev('stoch', 'Stoch RSI oversold cross', e => e.k != null ? `K ${num(e.k)} · D ${num(e.d)}` : '');
    const o = t.obv && t.obv.ev;
    if (o) li('', `<b>${o.kind === 'pivot' ? 'OBV MACD BUY dot' : 'OBV MACD channel flipped up'}</b>${o.kind === 'pivot' ? ' (confirmed pivot low)' : ''} · ${whenLong(tf, o, t)}`,
      o.dot_date ? `the dot sits on ${candleLong(tf, o.dot_date)}` : '');
    if (o && o.flip) li('', `<b>OBV MACD channel flipped up</b> · ${whenLong(tf, o.flip, t)}`, '');
    ev('wr', '%R / WMSR left oversold', e => e.v != null ? `%R ${num(e.v)}` : '');
    ev('bb', 'BB %B back inside the bands', e => e.v != null ? `%B ${num(e.v, 2)}` : '');
    if (!out.length) out.push('<li class="none">Nothing fresh on this timeframe.</li>');
    return out.join('');
  }
  function values(t) {
    const c = t.cells || {}, sw = k => `<span class="hc ${cellCls(c[k])}"></span>`;
    const k = t.kdj || {}, rs = t.rsi || {}, mc = t.macd || {}, st = t.stoch || {}, ob = t.obv || {}, wr = t.wr || {}, bb = t.bb || {};
    const d = Math.abs(mc.v || 0) >= 100 ? 1 : 2;
    const rows = [
      ['kdj', 'KDJ', `K ${num(k.K)} · D ${num(k.D)} · J ${num(k.J)}`],
      ['rsi', 'RSI', `${num(rs.v)} · MA ${num(rs.ma)}`],
      ['macd', 'MACD', `${num(mc.v, d)} · signal ${num(mc.signal, d)}`],
      ['stoch', 'Stoch RSI', `K ${num(st.k)} · D ${num(st.d)}`],
      ['obv', 'OBV MACD', ob.oc === 1 ? 'channel up' : ob.oc === -1 ? 'channel down' : 'flat'],
      ['wr', '%R / WMSR', num(wr.v)],
      ['bb', 'BB %B', num(bb.v, 2)]
    ];
    return '<div class="vals">' + rows.map(([key, lab, v]) => `<span class="vn">${sw(key)}${lab}</span><span class="vv">${v}</span>`).join('') + '</div>';
  }
  function tfPanel(tf, t) {
    if (!t) return `<div class="tfp na"><div class="ph"><span class="tn">${TFN[tf]}</span><span class="pt z">n/a</span></div>` +
      `<ul class="evl"><li class="none">Too few ${UNIT[tf][1]} of history for this timeframe.</li></ul></div>`;
    const td = panelDate(tf, t.t_last) + (t.as_if ? asifTag : '');
    return `<div class="tfp"><div class="ph"><span class="tn">${TFN[tf]}</span><span class="td">${td}</span>` +
      `</div><ul class="evl">${events(tf, t)}</ul>${values(t)}</div>`;
  }
  const scoreWords = m => `Score <b>${m.score}</b> of 100`;
  const tfGrid = m => `<div class="tfg">${XP_TFS.map(tf => tfPanel(tf, m.tf[tf])).join('')}</div>`;
  function expandHTML(r, m) {
    return `<div class="xp" data-for="${esc(r.sym)}"><div class="xh">` +
      `<span><b>${esc(r.name || r.sym)}</b> · ${esc(r.sector || '')}</span>` +
      `<span>Close <b>${money(r.close)}</b> <span class="${pn(r.chg_1d_pct)}">${sgn(r.chg_1d_pct)}</span> on the day${r.last && r.last !== B.asof ? ' (last close ' + md(r.last) + ')' : ''}</span>` +
      `<span>1 month <b class="${pn(r.chg_1m_pct)}">${sgn(r.chg_1m_pct)}</b></span>` +
      `<span>From the 52-week high <b>${sgn(r.from_52w_high_pct)}</b></span>` +
      `<span>${scoreWords(m)}</span>` +
      `<a class="xnp" ${go({ s: r.sym })}>Price chart, GEX levels and calls : puts ›</a>` +
      `<a href="${CI}${encodeURIComponent(r.sym)}" target="_blank" rel="noopener">Open ${esc(r.sym)} in Classic Indicators ›</a></div>` +
      tfGrid(m) + '</div>';
  }


  function mktCard(mk) {
    const cells = mk[S.mode] || mk.asif || {};
    const row = mk.chg_1d_pct != null ? mk : (B.rows || []).find(r => r.sym === mk.sym);
    const chg = row ? ` <span class="${pn(row.chg_1d_pct)}">${sgn(row.chg_1d_pct)}</span>` : '';
    let g = '<span></span>' + BIG.map(tf => `<span class="mt">${TFS1[tf]}</span>`).join('');
    [['kdj', 'KDJ'], ['rsi', 'RSI'], ['macd', 'MACD'], ['obv', 'OBV']].forEach(([k, lab]) => {
      g += `<span class="ml">${lab}</span>` + BIG.map(tf => {
        const c = cellCls(cells[tf] ? cells[tf][k] : null);
        return `<span class="hc ${c}" title="${mk.sym} ${TFN[tf]} ${lab}: ${CELL_WORD[c]}"></span>`;
      }).join('');
    });
    return `<div class="mk"><div class="mh"><a class="ms" href="${CI}${encodeURIComponent(mk.sym)}" target="_blank" rel="noopener">${esc(mk.sym)}</a>` +
      `<span class="mp">${money(mk.close)}${chg}</span></div><div class="mg">${g}</div></div>`;
  }
  function headHTML() {
    const asIf = S.mode === 'asif';
    const vl = `${md(B.asof)} close · ${asIf ? 'weekly, 2-week and monthly read as if closed' : 'closed candles only'}`;
    return `<div class="head"><div><h1>Classic Buys</h1><div class="vline">${vl}</div>
      <p class="lede">The S&P 500, the Nasdaq-100 and the watchlist ranked by how strongly the eight Classic Indicators point to a buy:
      <b>KDJ golden crosses on the weekly, 2-week and monthly</b> first (out of a washout counts most), then <b>KDJ coils</b>, then the daily.
      <span class="ph-hide">RSI, MACD, Stoch RSI, OBV MACD, %R / WMSR and BB %B are the confirmations. Beside them: the business score, the King GEX and the calls : puts book.</span></p></div>
      <div class="mkt">${(B.market || []).map(mktCard).join('')}</div></div>`;
  }
  function tiersHTML(base) {
    return '<div class="tiers">' + TABS.map(t => {
      const n = t.tier ? base.filter(r => M(r).tier === t.tier).length : base.length;
      const sw = TAB_SW[t.id] ? `<span class="sw" style="background:${TAB_SW[t.id]}"></span>` : '';
      return `<a class="tierbtn${S.tier === t.id ? ' on' : ''}" ${go({ tier: t.id })} data-tab="${t.id}"><div class="tn">${sw}<span class="t1">${t.short ? `<span class="full">${t.name}</span><span class="short">${t.short}</span>` : t.name}</span>` +
        `<span class="n">${n}</span></div><div class="t2">${t.sub}</div></a>`;
    }).join('') + '</div>';
  }
  const anyFilter = () => S.idx !== 'all' || S.sec || S.agree || S.q || S.f.length;
  function ctrlsHTML() {
    const secs = {};
    ORDER[S.mode].forEach(r => { if (r.sector) secs[r.sector] = (secs[r.sector] || 0) + 1; });
    const secOpts = Object.keys(secs).sort().map(s => `<option value="${esc(s)}"${s === S.sec ? ' selected' : ''}>${esc(s)} (${secs[s]})</option>`).join('');
    const agOpts = [0, 1, 2, 3, 4, 5, 6].map(k => `<option value="${k}"${k === S.agree ? ' selected' : ''}>${k === 6 ? 'All 6 agreeing' : k ? 'At least ' + k + ' agreeing' : 'Any agreement'}</option>`).join('');
    const hasClosed = modes().includes('closed');

    return `<div class="ctrls">
      <div class="seg mode"><span class="lbl">Read</span><a ${go({ mode: 'asif' })} class="${S.mode === 'asif' ? 'on' : ''}">As if closed</a>${hasClosed ? `<a ${go({ mode: 'closed' })} class="${S.mode === 'closed' ? 'on' : ''}">Closed candles</a>` : ''}</div>
      ${sortSel('sortp')}
      <div class="seg idx"><span class="lbl">Index</span>${IDX.map(([k, lab]) => `<a ${go({ idx: k })} class="${S.idx === k ? 'on' : ''}">${lab}</a>`).join('')}</div>
      <select class="sel${S.sec ? ' on' : ''}" id="sec" aria-label="Sector"><option value="">All sectors</option>${secOpts}</select>
      <select class="sel${S.agree ? ' on' : ''}" id="agree" aria-label="Agreeing confirmations">${agOpts}</select>
      <span class="grow"></span>
      <input class="find${S.q ? ' on' : ''}" id="find" type="search" placeholder="Search ticker or name" value="${esc(S.q)}" autocomplete="off" spellcheck="false" aria-label="Search ticker or name">
      <a class="clr" id="clr" ${go({ idx: 'all', sec: '', agree: 0, q: '', f: [] })}${anyFilter() ? '' : ' hidden'}>Clear filters</a>
    </div>`;
  }
  function chipsInner() {
    const tabRows = skip => baseRows(skip).filter(r => inTab(r, S.tier));
    return `<span class="lbl">Show only</span>` + CHIPS.map(([id, lab, f, tip]) => {
      const on = S.f.includes(id);
      const nf = CHIPS.map(c => c[0]).filter(x => x === id ? !on : S.f.includes(x));

      const to = id === 'best' && !on ? { f: nf, tier: 'top' } : { f: nf };

      const lb = Array.isArray(lab) ? `<span class="lf">${lab[0]}</span><span class="ls">${lab[1]}</span>` : lab;
      const n = (id === 'best' && !on ? baseRows(id) : tabRows(id)).filter(f).length;
      return `<a class="chip${id === 'best' ? ' best' : ''}${on ? ' on' : ''}" ${go(to)} data-chip="${id}" title="${esc(tip)}">${lb}<span class="cn">${n}</span></a>`;
    }).join('');
  }
  const sortSel = id => `<select class="sel sort${S.o !== 'rank' ? ' on' : ''}" id="${id}" aria-label="Sort by">` +
    SORT_OPTS.map(([k, lab]) => `<option value="${k}"${S.o === k ? ' selected' : ''}>${lab}</option>`).join('') + '</select>';
  function chipsHTML() {
    return `<div class="ctrls2"><div class="chips" id="chipsw">${chipsInner()}</div>${sortSel('sort')}</div>`;
  }
  function legendHTML() {
    return '<div class="legend">' + [['v2', 'fresh buy signal'], ['v1', 'bullish'], ['v0', 'flat'], ['vm1', 'bearish'], ['vcoil', 'KDJ coil'], ['vos', 'oversold'], ['vna', 'n/a']]
      .map(([c, w]) => `<span><span class="hc ${c}"></span>${w}</span>`).join('') + '</div>';
  }
  function howHTML() {
    const sh = SH();
    return `<details class="how" id="how"><summary>How the score and the columns work</summary><div class="hb">
      <p><b>Order of importance.</b> 1. KDJ golden crosses (K crossing above D) on the weekly, 2-week and monthly, most of all out of a
      <span class="wash">washout</span> (the KDJ deep in its oversold zone on the cross candle or the one before). 2. KDJ coils (K just under D
      and closing in): the weekly first, then the 2-week and monthly. 3. Daily crosses and coils last.</p>
      <p><b>Holy grail</b> = the weekly, 2-week and monthly KDJ each golden-crossing or coiling at the same time.</p>
      <p><b>As if closed</b> = the weekly, 2-week and monthly candles still forming are read as if they closed at the ${md(B.asof)} close.
      <b>Closed candles</b> = only finished candles count. The daily is the same in both.</p>
      <p><b>Fresh</b> = on one of the newest few candles of that timeframe (counting the as-if candle).</p>
      <p><b>Confirmations</b> (6): RSI crossing above its moving average · MACD crossing above its signal · Stoch RSI K crossing above D
      out of oversold · OBV MACD BUY dot (confirmed pivot low) or channel flip up · %R / WMSR leaving oversold (one confirmation: the two
      read the same) · BB %B back inside the bands.</p>
      <p><b>Score</b> = 0–100: golden crosses count most (more out of a washout and on the newest candle), then coils (the weekly coil
      most), then each fresh confirmation; the daily counts for less than the weekly, 2-week and monthly, and a holy grail adds a bonus.</p>
      <p><b>Tiers</b>, first match: Holy grail, Golden cross (weekly, 2-week or monthly), Weekly coil, 2W / M coil, Daily. Board order =
      tier, then score.</p>
      <p><b>Agree</b> = how many of the 6 confirmations are fresh on the weekly, 2-week or monthly; the daily count is shown beside it.
      <b>Needs $X</b> = the KDJ flip price: the lowest close at which K crosses above D, on the candle still forming (the as-if one,
      or the one after the newest closed candle) or, on the daily, at the next session; the % is from the close shown beside it.</p>
      <p><b>Heat map</b>: one row per indicator, one column per timeframe (D, W, 2W, M). A fresh buy signal fills the cell; otherwise
      bullish = each indicator leaning up (KDJ K above D, RSI above its MA, MACD above its signal, Stoch RSI K above D, OBV MACD
      channel up, %R / WMSR and BB %B on the strong side of their range). Oversold = %R / WMSR or BB %B in its oversold zone.</p>
      <p><b>Business</b> = the 200W business score, 0–100 (revenue and EPS growth, PEG, free-cash-flow growth and margin, revenue QoQ, each a
      percentile vs the S&P 500 + Nasdaq-100): teal 70+, gold 50–69.</p>
      <p><b>King GEX</b> (<a class="lnk" href="../king-gex/">King GEX Tracker</a>) = the strike with the most dollar gamma, its % from the
      close, its expiry and how many sessions it has held; the bar = its strength percentile among ${KN().toLocaleString()} tracked names.
      <b>FRESH</b> = open interest piling up at the king contract over the last week of settles, with a large part of it new.
      <b>PUTS &gt; KING</b> = the put-heavy cluster carries more gamma than the king. <b>Flip ↑ / ↓</b> = the gamma flip strike above /
      below the close.${KFRESH() ? ` A king from a map older than the ${md(KFRESH())} session is greyed with its map date.` : ''}</p>
      <p><b>Calls : puts</b> (<a class="lnk" href="../skew-tracker/">Skew Tracker</a>) = open contracts at every strike and expiry: the bar
      is the calls share. <b>1D / 1W</b> = contracts added in the last session / week, green = calls, red = puts, with the Skew
      Tracker's side read. <b>TOP 10% / BTM 10%</b> = among the most call-heavy / put-heavy tenth of ${(sh.n || 0).toLocaleString()}
      stocks with a current book.</p>
      <p><b>★ Best skew × classic</b> = a Holy grail or W·2W·M golden-cross name with a high classic score whose open book is among the
      most call-heavy of all stocks and whose last week leaned calls (more calls than puts added). Funds and stale books are left out.</p>
      <p><b>Show only</b>: Business 60+ · Strong king = among the strongest kings of the tracked names · King above price (the close) ·
      Strong king, King above price and Building count current maps only · Calls leaning = an open book among the most call-heavy of
      all stocks, or more calls than puts added last week · Building = a FRESH king. Click a column title (or pick from the sort list)
      to re-order; board order = tier, then score.</p>
    </div></details>`;
  }
  function theadHTML() {

    const so = (k, col, html) => {
      const on = S.o === k, ar = on && !(k === 'rank' && S.od === 1) ? `<span class="ar">${S.od < 0 ? ' ▼' : ' ▲'}</span>` : '';
      return `<div class="so${on ? ' sorted' : ''}" data-o="${k}" data-col="${col}">${html.replace(/(<small>|$)/, ar + '$1')}</div>`;
    };
    return `<div class="thead cols">${so('rank', 'rk', '#')}${so('sym', 'c-stock', 'Stock<small>ticker opens Classic Indicators</small>')}<div class="c-sec" data-col="c-sec">Sector</div>
      ${so('chg', 'c-px', 'Close<small>day change</small>')}${so('score', 'c-score', 'Score<small>0–100 · tier</small>')}
      <div data-col="c-kdj">KDJ · weekly / 2-week / monthly<small><span class="gc">GC ↑</span> golden cross · coil and the close that crosses</small></div>
      ${so('agree', 'c-ag', 'Agree<small>of 6</small>')}<div data-col="c-heat">Heat map<div class="hmh"><span></span><span>D</span><span>W</span><span>2W</span><span>M</span></div></div>
      ${so('biz', 'c-biz', 'Business<small>0–100</small>')}${so('cp', 'c-cp', 'Calls : puts<small>held · 1D / 1W added</small>')}${so('king', 'c-king', 'King GEX<small>strength vs all names</small>')}</div>`;
  }
  function listHTML(base) {
    const tab = tabOf(S.tier);
    const list = sorted(base.filter(r => inTab(r, S.tier)));
    const mt = matcher();
    if (mt && list.length === 1 && AUTO !== S.q + '|' + list[0].sym) { OPEN.add(list[0].sym); AUTO = S.q + '|' + list[0].sym; }
    let h = theadHTML();
    if (!list.length) {
      let alt = '';
      if (S.tier !== 'top' && base.length) {
        const r = base[0];
        alt = ` <a ${go({ tier: 'top' })}>Show ${base.length === 1 ? esc(r.sym) + ' (' + esc(M(r).tier_label || TIER_LABEL[M(r).tier]) + ')' : 'all ' + base.length + ' matches'} in Top buys ›</a>`;
      }
      return h + `<div class="empty">No names in ${esc(tab.name)} with these filters.${alt}</div>`;
    }
    list.slice(0, SHOW).forEach(r => { h += rowHTML(r, RANK[S.mode][r.sym]); });
    if (list.length > SHOW) {
      h += `<div class="more"><span>Showing ${SHOW} of ${list.length}</span><a href="#" data-more="${PAGE}">Show ${Math.min(PAGE, list.length - SHOW)} more ›</a>` +
        `<a href="#" data-more="all">Show all ${list.length} ›</a></div>`;
    }
    return h;
  }
  function footHTML() {
    const ex = (B.excluded || []).map(e => `${esc(e.sym)} (${esc(e.why)})`);
    const op = B.options || {}, bz = B.business || {};
    return `<div class="foot">Data: daily candles through the ${esc(B.asof_label || dmd(B.asof) + ' close')} · ${(B.n_names || B.rows.length).toLocaleString()} names
      (S&P 500, Nasdaq-100 and the watchlist; funds tagged FUND, ADRs ADR, watchlist-only names WATCH). The indicators are the ones on the
      <a class="lnk" href="../classic/">Classic Indicators</a> tab. A close shown with its date is the newest one in before the board's day.
      Options: <a class="lnk" href="../skew-tracker/">Skew Tracker</a>, ${md(op.latest)} settle${op.fresh_from ? ' (books from ' + md(op.fresh_from) + ' on count as current)' : ''}
      · King GEX: <a class="lnk" href="../king-gex/">King GEX Tracker</a> · business: the 200W business score${bz.day ? ', ' + md(bz.day) : ''}.
      ${ex.length ? 'Left out (leveraged, inverse or volatility products): ' + ex.join(', ') + '.' : ''}
      Updated ${fmtBuilt()}.</div>`;
  }
  function render() {
    if (S.s) { renderName(); return; }
    document.title = 'Classic Buys';
    const app = document.getElementById('app');
    const keepHow = document.getElementById('how') && document.getElementById('how').open;
    const base = baseRows();
    app.innerHTML = headHTML() + `<div id="tiersw">${tiersHTML(base)}</div>` + ctrlsHTML() + chipsHTML() + legendHTML() + howHTML() +
      `<div id="list">${listHTML(base)}</div>` + footHTML();
    if (keepHow) document.getElementById('how').open = true;
  }

  function renderDynamic() {
    const base = baseRows();
    document.getElementById('tiersw').innerHTML = tiersHTML(base);
    document.getElementById('list').innerHTML = listHTML(base);
    const cw = document.getElementById('chipsw');
    if (cw) cw.innerHTML = chipsInner();
    const clr = document.getElementById('clr');
    if (clr) clr.hidden = !anyFilter();
    const f = document.getElementById('find');
    if (f) f.classList.toggle('on', !!S.q);
    refreshHrefs();
  }



  const NAMES = {};
  let BYW = '1d';
  const LV = [
    ['air', 'Air pocket', '#8a8e99', ''], ['sup', 'Put wall', '#ef5350', ''], ['res', 'Call wall', '#26a69a', ''],
    ['fl', 'Flip', '#e8eaf0', '5 3'], ['k', 'King', '#f5d63d', '']];
  function loadName(sym) {
    return getJSON('names/' + encodeURIComponent(sym) + '.json', 2).then(d => { NAMES[sym] = d && d.s === sym ? d : null; })
      .catch(() => { NAMES[sym] = null; });
  }

  function latestMap(r, n) {
    const kg = (n && n.king) || {}, maps = (kg.days || []).concat(kg.prov ? [kg.prov] : []).filter(m => m && m.d);
    if (!maps.length) return null;
    const K = r.king;
    const hit = K ? maps.filter(m => m.kmap).pop() || maps.filter(m => m.d === K.day && !!m.eve === !!K.eve).pop() || maps.filter(m => m.d === K.day).pop() : null;
    return hit || maps.slice().sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0).pop();
  }
  const sideWord = s => s === 'C' ? '<b class="up">more calls</b>' : s === 'P' ? '<b class="dn">more puts</b>' : '<span class="muted">no clear side</span>';
  function winCard(r, k, lab) {
    const W = ((B.options || {}).windows || {})[k] || {}, w = r.w && r.w[k], st = (r.strip || {})[k] || [];
    const span = W.frm ? (W.frm === W.to ? md(W.frm) + ' settle' : md(W.frm) + '–' + md(W.to) + ' settles') : '';
    const head = `<h4><span>${lab}</span><span class="muted">contracts added · ${span}</span></h4>`;
    if (!w) return `<div class="card2 wc">${head}<div class="txt">${st[0] ? sideWord(st[0]) + ' opened; the contract counts start later than this window.' : 'No contract counts for this window.'}</div>${listTag(st[1], lab)}</div>`;
    const cov = w.cov && w.cov.length === 2 ? ` · ${w.cov[0]} of ${w.cov[1]} settle${w.cov[1] === 1 ? '' : 's'}` : '';
    return `<div class="card2 wc">${head}<div class="wn"><span class="up">${sg(w.aC)}</span><span class="muted">calls · puts added</span><span class="dn">${sg(w.aP)}</span></div>` +
      `${splitBar(w.aC, w.aP, 'wide')}<div class="txt ws">${sideWord(w.side)}${cov}</div>${listTag(st[1], lab)}</div>`;
  }
  function totalCard(r) {
    const c = r.cp;
    if (!c) return '<div class="card2 wc"><h4><span>Total</span></h4><div class="muted sm">No open book for this name.</div></div>';
    return `<div class="card2 wc"><h4><span>Total</span><span class="muted">open contracts · ${md(r.opt_settle)} settle${r.opt_stale ? ' (an older book)' : ''}</span></h4>
<div class="cpbig"><span class="r">${cpLab(c)}${badge10(r)}</span>${cpBar(c, 'wide')}</div>
<div class="txt"><b>${kf(c[0])}</b> calls vs <b>${kf(c[1])}</b> puts open, ${Math.round(share(c) * 100)}% calls${r.shp != null ? ` — more call-heavy than <b>${Math.round(r.shp)}%</b> of ${(SH().n || 0).toLocaleString()} stocks` : ''}.</div></div>`;
  }
  function moreWins(n) {
    const win = n && n.opt && n.opt.win;
    if (!win) return '';
    const parts = [['2w', '2 weeks'], ['1m', '1 month']].filter(([k]) => win[k]).map(([k, lab]) => {
      const w = win[k];
      return w.aC != null && w.aP != null ? `<span><b>${lab}</b> <span class="up">${sg(w.aC)} calls</span> · <span class="dn">${sg(w.aP)} puts</span> added · ${sideWord(w.side)}</span>`
        : `<span><b>${lab}</b> ${sideWord(w.side)} opened</span>`;
    });
    return parts.length ? `<div class="wmore">${parts.join('')}</div>` : '';
  }

  function cpSeries(n) {
    return ((n && n.opt && n.opt.series) || []).filter(e => e[1] != null && e[2] != null);
  }
  function optsSVG(sr, W) {
    if (sr.length < 3) return '';
    const H = 124, PL = 8, PR = W - 52, B0 = 8, B1 = H - 22, N = sr.length, step = (PR - PL) / N, x = j => PL + step * (j + .5);
    const mx = Math.max(1, ...sr.map(e => Math.max(e[1] || 0, e[2] || 0))), zm = (B0 + B1) / 2, hb = (B1 - B0) / 2;
    const s = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="oc">`];
    s.push(`<line x1="${PL}" x2="${PR}" y1="${zm}" y2="${zm}" stroke="#363a45"/><text x="${PR + 6}" y="${B0 + 8}" class="ax">calls</text><text x="${PR + 6}" y="${B1}" class="ax">puts</text>`);
    sr.forEach((e, j) => {
      const c = Math.max(e[1] || 0, 0), p = Math.max(e[2] || 0, 0), w = Math.max(step * .62, 1), tip = `${md(e[0])}: ${sg(e[1])} calls, ${sg(e[2])} puts added`;
      if (c) s.push(`<rect x="${(x(j) - w / 2).toFixed(1)}" y="${(zm - hb * c / mx).toFixed(1)}" width="${w.toFixed(1)}" height="${(hb * c / mx).toFixed(1)}" fill="#26a69a"><title>${tip}</title></rect>`);
      if (p) s.push(`<rect x="${(x(j) - w / 2).toFixed(1)}" y="${zm}" width="${w.toFixed(1)}" height="${(hb * p / mx).toFixed(1)}" fill="#c2484a"><title>${tip}</title></rect>`);
    });
    [[0, 'start', PL], [Math.floor((N - 1) / 2), 'middle'], [N - 1, 'end', PR]].forEach(([j, an, xx]) => s.push(`<text x="${(xx != null ? xx : x(j)).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="${an}">${md(sr[j][0])}</text>`));
    s.push('</svg>');
    return s.join('');
  }


  function byStrikeSVG(by, close, kingK, W) {
    const NMAX = W >= 460 ? 22 : 16;
    const rows = (by || []).filter(e => e && e[0] != null).slice().sort((a, b) => Math.abs(a[0] - close) - Math.abs(b[0] - close))
      .slice(0, NMAX).sort((a, b) => b[0] - a[0]);
    if (!rows.length) return '<div class="muted sm">No change by strike in this window.</div>';
    const RH = 15, PT = 20, H = PT + rows.length * RH + 6, CX = W / 2, SW = 50, VW = 44, half = Math.max(30, (W - SW) / 2 - VW);
    const mx = Math.max(1, ...rows.map(e => Math.max(Math.abs(e[1] || 0), Math.abs(e[2] || 0))));
    const s = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="bs">`,
      `<text x="${CX - SW / 2 - 4}" y="12" class="ax" text-anchor="end">← puts opened</text><text x="${CX + SW / 2 + 4}" y="12" class="ax">calls opened →</text>`];
    let priceDrawn = false;
    rows.forEach((e, i) => {
      const yy = PT + i * RH, [k, nC, nP] = e;
      if (!priceDrawn && k < close) {
        priceDrawn = true;
        const py = yy - 1;
        s.push(`<line x1="4" x2="${W - 4}" y1="${py}" y2="${py}" stroke="#d1d4dc" stroke-dasharray="3 3" opacity=".55"/><text x="${W - 4}" y="${py - 3}" class="ax" text-anchor="end" style="fill:#d1d4dc">price ${lvTxt(close)}</text>`);
      }
      const lc = Math.abs(nC || 0) / mx * half, lp = Math.abs(nP || 0) / mx * half, mid = yy + RH / 2;
      const isK = kingK != null && Math.abs(k - kingK) < 1e-9;
      s.push(`<g><title>Strike ${lvTxt(k)}: ${sg(nC)} calls, ${sg(nP)} puts (change in open contracts)${isK ? ' · the king strike' : ''}</title>` +
        `<rect x="0" y="${yy}" width="${W}" height="${RH}" fill="transparent"/>` +
        (lc ? `<rect x="${(CX + SW / 2).toFixed(1)}" y="${yy + 2}" width="${lc.toFixed(1)}" height="${RH - 4}" rx="1.5" fill="${(nC || 0) >= 0 ? '#26a69a' : '#4a4e5a'}"/>` : '') +
        (lp ? `<rect x="${(CX - SW / 2 - lp).toFixed(1)}" y="${yy + 2}" width="${lp.toFixed(1)}" height="${RH - 4}" rx="1.5" fill="${(nP || 0) >= 0 ? '#c2484a' : '#4a4e5a'}"/>` : '') +
        `<text x="${CX}" y="${mid + 3.5}" class="bk${isK ? ' kk' : ''}" text-anchor="middle">${lvTxt(k)}</text>` +
        (nC ? `<text x="${(CX + SW / 2 + lc + 4).toFixed(1)}" y="${mid + 3.5}" class="ax">${sg(nC)}</text>` : '') +
        (nP ? `<text x="${(CX - SW / 2 - lp - 4).toFixed(1)}" y="${mid + 3.5}" class="ax" text-anchor="end">${sg(nP)}</text>` : '') + '</g>');
    });
    s.push('</svg>');
    return s.join('');
  }



  function priceChart(box, r, n) {
    const W = Math.max(300, Math.min(1400, Math.round(box.clientWidth || 600)));
    const big = W >= 700, nb = big ? 252 : W >= 480 ? 189 : 126;
    const RAW = (n.bars || []).slice(-nb);
    const B1 = RAW.map(b => [b[0], b[1] == null ? b[4] : b[1], b[2] == null ? b[4] : b[2], b[3] == null ? b[4] : b[3], b[4]]), N = B1.length;
    if (N < 5) { box.innerHTML = '<div class="muted sm">No price history.</div>'; return; }
    const onScale = () => true;
    const L0 = latestMap(r, n), L = L0 && onScale(L0, B1[N - 1][4]) ? L0 : null;
    const H = big ? 440 : 340, PL = 6, TAGW = big ? 58 : 50, PR = W - TAGW - 4, EXT = L ? (big ? 54 : 32) : 4, PX = PR - EXT;
    const LH = 13, PT = 18, LANE0 = H - 22 - GC_TFS.length * LH, PB = LANE0 - 12;
    const step = (PX - PL) / N, x = j => PL + step * (j + .5), xE = PL + step * N;
    const idx = {}; B1.forEach((b, j) => { idx[b[0]] = j; });
    const jOf = d => { let k = null; for (let j = 0; j < N; j++) { if (B1[j][0] <= d) k = j; else break; } return k; };
    const kg = n.king || {}, byDay = {};
    (kg.days || []).forEach(m => { if (m && m.d && idx[m.d] != null && onScale(m, B1[idx[m.d]][4])) byDay[m.d] = m; });
    const hist = Object.keys(byDay).sort().map(d => byDay[d]);
    const mm = M(r), coils = [];
    BIG.forEach(tf => {
      const c = mm.tf[tf] && mm.tf[tf].kdj && mm.tf[tf].kdj.coil;
      if (c && c.needs != null && c.reach !== 'any' && c.reach !== 'none') {
        const same = coils.find(x0 => Math.abs(x0.v - c.needs) < 1e-9);
        if (same) same.tfs.push(TFS1[tf]); else coils.push({ v: c.needs, pct: c.needs_pct, tfs: [TFS1[tf]] });
      }
    });
    let lo = Math.min(...B1.map(b => b[3])), hi = Math.max(...B1.map(b => b[2]));
    const lo0 = lo, hi0 = hi;
    const cand = [];
    hist.concat(L ? [L] : []).forEach(m => LV.forEach(([k]) => { const v = lvOf(m, k); if (v != null) cand.push(v); }));
    coils.forEach(c => cand.push(c.v));
    cand.forEach(v => { if (v >= lo0 * .85 && v <= hi0 * 1.15) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    const pad = (hi - lo) * .05; lo -= pad; hi += pad;
    const y = v => PT + (hi - v) / (hi - lo) * (PB - PT);
    const inR = v => v >= lo && v <= hi;
    const s = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="ch"><defs><clipPath id="pclip"><rect x="${PL}" y="${PT}" width="${PR - PL}" height="${PB - PT}"/></clipPath></defs>`];

    const tags = [];
    if (L) LV.forEach(([k, lab, col]) => {
      const v = lvOf(L, k); if (v == null) return;
      tags.push({ v, k, lab, col, y: inR(v) ? y(v) : v > hi ? PT + 7 : PB - 7, out: inR(v) ? 0 : v > hi ? 1 : -1 });
    });
    coils.forEach(c => { if (inR(c.v)) tags.push({ v: c.v, k: 'coil', lab: c.tfs.join(' · ') + ' coil needs', col: '#e3b341', y: y(c.v), out: 0 }); });
    const PRI = { k: 0, fl: 1, coil: 2, res: 3, sup: 4, air: 5 };
    tags.sort((a, b) => a.y - b.y || PRI[a.k] - PRI[b.k]);
    for (let i = 1; i < tags.length; i++) tags[i].y = Math.max(tags[i].y, tags[i - 1].y + 14);
    if (tags.length && tags[tags.length - 1].y > PB) {
      tags[tags.length - 1].y = PB;
      for (let i = tags.length - 2; i >= 0; i--) tags[i].y = Math.min(tags[i].y, tags[i + 1].y - 14);
    }
    const rng = hi - lo; let st = Math.pow(10, Math.floor(Math.log10(rng / 5)));
    for (const m of [1, 2, 2.5, 5, 10]) if (rng / (st * m) <= (big ? 9 : 6)) { st *= m; break; }
    for (let v = Math.ceil(lo / st) * st; v <= hi; v += st) {
      const yy = y(v), clash = tags.some(t => Math.abs(t.y - yy) < 11);
      s.push(`<line x1="${PL}" x2="${PR}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#1f2430"/>` + (clash ? '' : `<text x="${PR + 6}" y="${(yy + 4).toFixed(1)}" class="ax">${+v.toFixed(6)}</text>`));
    }
    let lm = null;
    B1.forEach((b, j) => { const m = +b[0].slice(5, 7); if (m !== lm) { if (lm !== null && j > 2) s.push(`<text x="${x(j).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="middle">${MON[m - 1]}</text>`); lm = m; } });

    B1.forEach((b, j) => {
      const o = b[1], c = b[4], up = c >= o, col = up ? '#26a69a' : '#ef5350', y1 = y(Math.max(o, c)), y2 = y(Math.min(o, c));
      s.push(`<line x1="${x(j).toFixed(1)}" x2="${x(j).toFixed(1)}" y1="${y(b[2]).toFixed(1)}" y2="${y(b[3]).toFixed(1)}" stroke="${col}"/><rect x="${(x(j) - step * .36).toFixed(1)}" y="${y1.toFixed(1)}" width="${Math.max(step * .72, .8).toFixed(1)}" height="${Math.max(y2 - y1, .8).toFixed(1)}" fill="${col}"/>`);
    });

    s.push('<g clip-path="url(#pclip)">');
    LV.forEach(([k, lab, col, dash]) => {
      let p = '', ps = '', pv = '', prevJ = null, prevY = null, prevV = null;
      hist.forEach(m => {
        const v = lvOf(m, k), j = idx[m.d];
        if (v == null) { prevJ = null; return; }
        const x0 = (x(j) - step / 2).toFixed(1), x1 = (x(j) + step / 2).toFixed(1), yy = y(v).toFixed(1);

        if (prevJ === j - 1 && prevY !== yy && inR(prevV) && inR(v)) pv += `M${x0} ${prevY}L${x0} ${yy}`;
        if (m.stale) ps += `M${x0} ${yy}L${x1} ${yy}`; else p += `M${x0} ${yy}L${x1} ${yy}`;
        prevJ = j; prevY = yy; prevV = v;
      });
      const sw = k === 'k' ? 2 : 1.4, da = dash ? ` stroke-dasharray="${dash}"` : '';
      if (pv) s.push(`<path d="${pv}" fill="none" stroke="${col}" stroke-width="1"${da} opacity=".3"/>`);
      if (p) s.push(`<path d="${p}" fill="none" stroke="${col}" stroke-width="${sw}"${da} opacity=".9"/>`);
      if (ps) s.push(`<path d="${ps}" fill="none" stroke="${col}" stroke-width="${sw}"${da} opacity=".35"/>`);
    });

    coils.forEach(c => {
      if (!inR(c.v)) return;
      const yy = y(c.v).toFixed(1);
      s.push(`<line x1="${PL}" x2="${PR}" y1="${yy}" y2="${yy}" stroke="#e3b341" stroke-dasharray="6 4" stroke-width="1.2" opacity=".9"/>` +
        `<text x="${PL + 4}" y="${(+yy - 4).toFixed(1)}" class="lvl" fill="#e3b341">${c.tfs.join(' · ')} coil needs ${moneyX(c.v)}${c.pct != null ? ' (' + sgn(c.pct) + ')' : ''}</text>`);
    });
    s.push('</g>');

    if (L) {
      s.push(`<line x1="${xE + 1}" x2="${xE + 1}" y1="${PT}" y2="${PB}" stroke="#363a45" stroke-dasharray="2 3"/><text x="${((xE + PR) / 2).toFixed(1)}" y="${PT - 6}" class="ax" text-anchor="middle">${md(L.d)}${L.eve ? ' eve' : ''}</text>`);
      LV.forEach(([k, lab, col, dash]) => {
        const v = lvOf(L, k); if (v == null || !inR(v)) return;
        s.push(`<line x1="${xE + 2}" x2="${PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${col}" stroke-width="${k === 'k' ? 2 : 1.5}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
      });
    }
    tags.forEach(t => {
      const fg = t.k === 'k' || t.k === 'coil' || t.k === 'fl' ? '#131722' : '#fff';
      const txt = (t.out > 0 ? '↑ ' : t.out < 0 ? '↓ ' : '') + lvTxt(t.v);
      s.push(`<g><title>${esc(t.lab)} ${lvTxt(t.v)}${t.out ? ' (off the chart)' : ''}${L && t.k !== 'coil' ? ' · map ' + md(L.d) : ''}</title><rect x="${PR + 2}" y="${(t.y - 7).toFixed(1)}" width="${TAGW}" height="14" rx="2" fill="${t.col}"/>` +
        `<text x="${PR + 2 + TAGW / 2}" y="${(t.y + 3.6).toFixed(1)}" class="tg" fill="${fg}" text-anchor="middle">${txt}</text></g>`);
    });

    const first = B1[0][0];
    GC_TFS.forEach((tf, i) => {
      const yy = LANE0 + 6 + i * LH;
      s.push(`<line x1="${PL}" x2="${PX}" y1="${yy}" y2="${yy}" stroke="#1f2430"/><text x="${PR + 6}" y="${yy + 3.5}" class="gcl">${TFS1[tf]} GC</text>`);
      ((n.gc || {})[tf] || []).filter(g => g.e >= first && (S.mode === 'asif' || !g.dev)).forEach(g => {
        const j0 = Math.max(0, jOf(g.d) == null ? 0 : jOf(g.d)), j1 = jOf(g.e); if (j1 == null) return;
        const col = g.wash ? '#B39DDB' : '#4fd1c5';
        s.push(`<g><title>${TFN[tf]} KDJ golden cross · ${candleLong(tf, g.d)}${g.dev ? ' (as if closed)' : ''} · K ${num(g.K)} · D ${num(g.D)}${g.wash ? ' · out of a washout' : ''}</title>` +
          `<line x1="${(x(j0) - step * .4).toFixed(1)}" x2="${(x(j1) + step * .4).toFixed(1)}" y1="${yy}" y2="${yy}" stroke="${col}" stroke-width="2" opacity=".55"/>` +
          `<circle cx="${x(j1).toFixed(1)}" cy="${yy}" r="${g.dev ? 4.4 : 3.8}" fill="${g.dev ? '#131722' : col}" stroke="${g.dev ? col : 'none'}"${g.dev ? ' stroke-width="1.6" stroke-dasharray="2 1.5"' : ''}/></g>`);
      });
    });
    s.push(`<line x1="${PL}" x2="${PR}" y1="${PB + 4}" y2="${PB + 4}" stroke="#2a2e39"/>`);
    s.push(`<g class="hov"></g><rect class="hit" x="${PL}" y="${PT}" width="${PR - PL}" height="${PB - PT}" fill="transparent"/></svg>`);
    box.innerHTML = s.join('');

    const svg = box.querySelector('svg.ch'), g = svg.querySelector('.hov'), hit = svg.querySelector('.hit');
    const lvLine = m => {
      const a = [['k', 'King'], ['fl', 'Flip']].map(([k, l]) => lvOf(m, k) != null ? `${l} ${lvTxt(lvOf(m, k))}` : '').filter(Boolean).join(' · ');
      const b = [['res', 'Call wall'], ['sup', 'Put wall'], ['air', 'Air']].map(([k, l]) => lvOf(m, k) != null ? `${l} ${lvTxt(lvOf(m, k))}` : '').filter(Boolean).join(' · ');
      return [a, b].filter(Boolean);
    };
    const move = e => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      let xx, lines;
      if (p.x > xE && L) {
        xx = (xE + PR) / 2;
        lines = [`King GEX map ${md(L.d)}${L.eve ? ' (evening)' : ''}${L.stale ? ' · stale' : ''}`].concat(lvLine(L));
      } else {
        const j = Math.max(0, Math.min(N - 1, Math.floor((p.x - PL) / step))), b = B1[j], m = byDay[b[0]];
        xx = x(j);
        const rb = RAW[j];
        lines = [`${dmd(b[0])} · close ${lvTxt(b[4])}`, rb[2] == null ? 'close only' : `${rb[1] == null ? '' : 'O ' + lvTxt(rb[1]) + ' · '}H ${lvTxt(rb[2])} · L ${lvTxt(rb[3])}`].concat(m ? lvLine(m).map(t => t + (m.stale ? ' (stale)' : '')) : []);
      }
      const bw = Math.min(W - 12, 14 + 6.1 * Math.max(...lines.map(t => t.length))), bh = 8 + 14 * lines.length;
      const tx = xx > (PL + PR) / 2 ? Math.max(2, xx - bw - 8) : Math.min(W - bw - 2, xx + 8);
      g.innerHTML = `<line x1="${xx}" x2="${xx}" y1="${PT}" y2="${PB}" stroke="#787b86" stroke-dasharray="2 2"/><rect x="${tx}" y="${PT + 2}" width="${bw}" height="${bh}" rx="3" fill="#131722" stroke="#363a45"/>` +
        lines.map((t, i) => `<text x="${tx + 7}" y="${PT + 16 + i * 14}" class="ax"${i === 0 ? ' style="fill:#d1d4dc"' : ''}>${esc(t)}</text>`).join('');
    };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { g.innerHTML = ''; });
  }
  function legendLv(L, coils) {
    const it = (col, lab, dash) => `<span class="li"><i style="background:${dash ? 'transparent' : col};${dash ? `border-top:2px dashed ${col};height:0;` : ''}"></i>${lab}</span>`;
    return `<span class="lgd">${L ? it('#f5d63d', 'King') + it('#e8eaf0', 'Flip', 1) + it('#26a69a', 'Call wall') + it('#ef5350', 'Put wall') + it('#8a8e99', 'Air pocket') : ''}` +
      `${coils ? it('#e3b341', 'Coil needs', 1) : ''}<span class="li"><i class="dot" style="background:#4fd1c5"></i>KDJ golden cross</span><span class="li"><i class="dot" style="background:#B39DDB"></i>out of a washout</span></span>`;
  }
  function drawName(r, n) {
    const ch = document.getElementById('chbox');
    if (ch) priceChart(ch, r, n);
    const oc = document.getElementById('ocbox');
    if (oc) { const sr = cpSeries(n), w = Math.max(280, Math.round(oc.clientWidth || 500)); oc.innerHTML = sr.length >= 3 ? optsSVG(sr, w) : '<div class="muted sm">No contracts-added history for this name.</div>'; }
    drawBy(r, n);
  }
  function drawBy(r, n) {
    const bx = document.getElementById('bybox');
    if (!bx) return;
    const by = n.opt && n.opt.by;
    const k = by && by[BYW] ? BYW : by && by['1d'] ? '1d' : '1w';
    const w = Math.max(260, Math.round(bx.clientWidth || 400));
    bx.innerHTML = byStrikeSVG(by && by[k] ? by[k].by : [], r.close, r.king ? r.king.k : null, w);
    document.querySelectorAll('[data-byw]').forEach(a => a.classList.toggle('on', a.dataset.byw === k));
    const sub = document.getElementById('bysub');
    if (sub && by && by[k]) sub.textContent = `change in open contracts · ${md(by[k].frm)} → ${md(n.opt.settle)} settles`;
  }
  function nameHTML(r) {
    const n = NAMES[r.sym], m = M(r), tg = tagOf(r), sym = encodeURIComponent(r.sym), loading = n === undefined;
    const hasClosed = modes().includes('closed');
    const links = [[CI + sym, 'Classic Indicators'], ['../eagle-eye/?s=' + sym, 'Eagle Eye'], ['../king-gex/#s=' + sym, 'King GEX Tracker'],
      ['../skew-tracker/#o=' + sym, 'Skew Tracker']].concat(r.yd ? [['../yellow-dots/#s=' + sym, 'Yellow Dots × Business']] : [])
      .map(([h, t]) => `<a class="btn" href="${h}" target="_blank" rel="noopener">${t} ↗</a>`).join('');
    const badge = `<span class="badge b-${m.tier}">${esc(m.tier_label || TIER_LABEL[m.tier] || m.tier)}</span>`;
    const L = n ? latestMap(r, n) : null;
    const coils = BIG.some(tf => m.tf[tf] && m.tf[tf].kdj && m.tf[tf].kdj.coil && m.tf[tf].kdj.coil.needs != null);
    const hasOpt = !!(r.cp || r.w);
    const by = n && n.opt && n.opt.by;
    const top = `<div class="nptop"><a class="back" data-back="1" href="${q({ s: '' })}">← Board</a>` +
      `<div class="seg mode"><span class="lbl">Read</span><a ${go({ mode: 'asif' })} class="${S.mode === 'asif' ? 'on' : ''}">As if closed</a>${hasClosed ? `<a ${go({ mode: 'closed' })} class="${S.mode === 'closed' ? 'on' : ''}">Closed candles</a>` : ''}</div>` +
      `<span class="npr">#${RANK[S.mode][r.sym] || '–'} of ${ORDER[S.mode].length} on the board</span></div>`;
    const head = `<div class="nph"><div class="nph1"><span class="tk2">${esc(r.sym)}</span>${tg ? `<span class="itag">${tg}</span>` : ''}<span class="npn">${esc(r.name || '')}</span></div>` +
      `<div class="nph2">${[esc(r.sector || ''), r.index && r.index !== 'WATCH' ? esc(r.index.replace('SPX', 'S&P 500').replace('NDX', 'Nasdaq-100').replace('+', ' + ')) : 'Watchlist'].filter(Boolean).join(' · ')}</div>` +
      `<div class="nph3"><span><span class="price big">${money(r.close)}</span> <span class="${pn(r.chg_1d_pct)}">${sgn(r.chg_1d_pct)}</span> <span class="muted">${md(r.last || B.asof)} close</span></span>` +
      `<span>1 month <b class="${pn(r.chg_1m_pct)}">${sgn(r.chg_1m_pct)}</b></span><span>From the 52-week high <b>${sgn(r.from_52w_high_pct)}</b></span></div></div>`;
    const kbx = `<div class="npk"><div class="kbx"><div class="pk">Classic score</div><div class="sc"><div class="sb"><i style="width:${Math.max(0, Math.min(100, m.score))}%"></i></div><span class="sn">${m.score}</span></div><div class="kbs">${badge}</div><div class="kbs muted">${m.agree} of 6 confirmations agree · daily ${m.agree_d}</div></div>` +
      `<div class="kbx"><div class="pk">Business</div>${r.biz ? `<div class="bzrow"><span class="bzn ${bizCls(r.biz.score)}">${r.biz.score}</span>${bizCell(r.biz.score, true)}</div>` : `<div class="muted sm">${r.kind === 'fund' ? 'funds have no business score' : 'no business score'}</div>`}</div>` +
      `<div class="kbx kdx"><div class="pk">KDJ · weekly / 2-week / monthly</div><div class="kd">${BIG.map(tf => `<span class="kt">${TFS1[tf]}</span><span class="kv">${kdjWords(tf, m.tf[tf])}</span>`).join('')}</div></div></div>`;
    const chart = `<div class="card2 chc"><h4><span>Daily candles · King GEX levels by session</span>${legendLv(L, coils)}</h4><div class="chbox" id="chbox">${loading ? '<div class="muted sm ld">Loading…</div>' : n ? '' : '<div class="muted sm">No price history for this name.</div>'}</div></div>`;
    let opt;
    if (!hasOpt) opt = `<div class="card2"><div class="txt">No options data for ${esc(r.sym)}.</div></div>`;
    else {
      const ocCard = `<div class="card2"><h4><span>Contracts added by settle</span><span class="muted">calls up · puts down</span></h4><div id="ocbox">${loading ? '<div class="muted sm ld">Loading…</div>' : ''}</div></div>`;
      const byCard = by && (by['1d'] || by['1w']) ? `<div class="card2"><h4><span>Change by strike</span><span class="byt">${['1d', '1w'].filter(k => by[k]).map(k => `<a href="#" class="chip sm2${k === BYW ? ' on' : ''}" data-byw="${k}">${k.toUpperCase()}</a>`).join('')}</span></h4><div class="note bysub" id="bysub"></div><div id="bybox"></div></div>` : '';
      opt = `<div class="cp3">${winCard(r, '1d', '1 Day')}${winCard(r, '1w', '1 Week')}${totalCard(r)}</div>${moreWins(n)}<div class="${byCard ? 'two2' : 'one2'}">${ocCard}${byCard}</div>`;
    }
    const optHead = `<div class="npsec"><span>Calls : puts</span><span class="muted">1 Day · 1 Week · Total</span>${hasOpt ? stripCell(r) : ''}</div>`;
    const classic = `<div class="npsec"><span>Classic Indicators</span><span class="muted">${scoreWords(m)}</span></div>${tfGrid(m)}`;
    return `<div class="np" data-sym="${esc(r.sym)}">${top}${head}${kbx}<div class="links">${links}</div>` +
      `<div class="npg"><div class="npm">${chart}${optHead}${opt}</div><div class="nps">${kingCard(r, L, loading)}${bizCard(r, n)}</div></div>${classic}</div>`;
  }
  function renderName() {
    const app = document.getElementById('app');
    const r = BYSYM[S.s];
    if (!r) {
      document.title = S.s + ' · Classic Buys';
      app.innerHTML = `<div class="np"><div class="nptop"><a class="back" data-back="1" href="${q({ s: '' })}">← Board</a></div>` +
        `<div class="nph"><div class="nph1"><span class="tk2">${esc(S.s)}</span></div><p class="lede">${esc(S.s)} is not on the board.</p></div></div>`;
      return;
    }
    document.title = r.sym + ' · Classic Buys';
    app.innerHTML = nameHTML(r);
    const n = NAMES[r.sym];
    if (n === undefined) {
      const sym = r.sym;
      loadName(sym).then(() => { if (S.s === sym) renderName(); });
      return;
    }
    if (n) drawName(r, n);
  }
  function back() {
    if (STEPS === 1) { history.back(); return; }
    location.hash = q({ s: '' });
  }

  function route() {
    const prevS = S.s, key = () => JSON.stringify(Object.assign({}, S, { s: '' }));
    if (!prevS) LISTY = window.scrollY;
    const before = key();
    parseHash();
    if (key() !== before) SHOW = PAGE;
    if (S.s && !prevS) STEPS = 1; else if (S.s) STEPS++; else STEPS = 0;
    render();
    if (S.s && S.s !== prevS) window.scrollTo(0, 0);
    else if (!S.s && prevS) { const y0 = LISTY; window.scrollTo(0, y0); requestAnimationFrame(() => window.scrollTo(0, y0)); }
  }


  function vintage() {
    document.getElementById('vintage').innerHTML =
      `<span class="dot"></span><span>As of ${esc(B.asof_label || dmd(B.asof) + ' close')}</span><span class="long">· ${(B.n_names || B.rows.length).toLocaleString()} names · updated ${fmtBuilt()}</span>` +
      '<a class="fresh" id="fresh" href="#" hidden>new data · reload</a>';
  }
  function toggle(sym) {
    const a = document.activeElement, had = !!(a && a.matches && a.matches('.row[data-sym]') && a.dataset.sym === sym);
    OPEN.has(sym) ? OPEN.delete(sym) : OPEN.add(sym);
    const base = baseRows();
    document.getElementById('list').innerHTML = listHTML(base);
    refreshHrefs();
    if (had) {
      const r = document.querySelector('.row[data-sym="' + CSS.escape(sym) + '"]');
      if (r) r.focus({ preventScroll: true });
    }
  }
  function wire() {
    const app = document.getElementById('app');
    document.addEventListener('click', ev => {
      const a = ev.target.closest('a');
      if (a) {
        if (a.id === 'fresh') { ev.preventDefault(); location.reload(); return; }
        if (a.dataset.back) { ev.preventDefault(); back(); return; }
        if (a.dataset.byw) {
          ev.preventDefault();
          BYW = a.dataset.byw;
          const r = BYSYM[S.s], n = r && NAMES[r.sym];
          if (n) drawBy(r, n);
          return;
        }
        if (a.dataset.more) {
          ev.preventDefault();
          SHOW = a.dataset.more === 'all' ? 1e9 : SHOW + PAGE;
          document.getElementById('list').innerHTML = listHTML(baseRows());
          refreshHrefs();
        }
        return;
      }
      const th = ev.target.closest('.thead [data-o]');
      if (th) {
        const k = th.dataset.o;
        location.hash = q(S.o === k ? { od: -S.od } : { o: k, od: SORTS[k][1] });
        return;
      }
      const gx = ev.target.closest('.c-gex[data-np]');
      if (gx) { location.hash = q({ s: gx.dataset.np }); return; }
      if (ev.target.closest('.xp')) return;
      const row = ev.target.closest('.row[data-sym]');
      if (row && !String(window.getSelection ? window.getSelection() : '')) toggle(row.dataset.sym);
    });
    app.addEventListener('keydown', ev => {
      const row = ev.target.closest && ev.target.closest('.row[data-sym]');
      if (row && (ev.key === 'Enter' || ev.key === ' ') && ev.target === row) { ev.preventDefault(); toggle(row.dataset.sym); }
    });
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && S.s && !(ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName))) { ev.preventDefault(); back(); }
    });
    app.addEventListener('change', ev => {
      if (ev.target.id === 'sec') location.hash = q({ sec: ev.target.value });
      else if (ev.target.id === 'agree') location.hash = q({ agree: +ev.target.value });
      else if (ev.target.id === 'sort' || ev.target.id === 'sortp') location.hash = q({ o: ev.target.value, od: SORTS[ev.target.value][1] });
    });
    app.addEventListener('input', ev => {
      if (ev.target.id !== 'find') return;
      S.q = ev.target.value.slice(0, 60);
      SHOW = PAGE;
      history.replaceState(null, '', q() || location.pathname + location.search);
      renderDynamic();
    });
    window.addEventListener('hashchange', route);
    let rw = 0, rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const box = document.getElementById('chbox'), r = BYSYM[S.s], n = r && NAMES[r.sym];
        if (!box || !n || Math.abs(box.clientWidth - rw) < 24) return;
        rw = box.clientWidth; drawName(r, n);
      }, 150);
    });
    setInterval(() => {
      const was = MAN && MAN.sha256 + MAN.names_sha256;
      getJSON('manifest.json', 1).then(m => {
        if (m && was && m.sha256 + m.names_sha256 !== was) { const f = document.getElementById('fresh'); if (f) f.hidden = false; }
      }).catch(() => {});
    }, 5 * 60 * 1000);
  }
  try { history.scrollRestoration = 'manual'; } catch (e) {  }
  nudgeTabs();
  loadBoard().then(board => {
    B = board;
    prepare(); parseHash(); vintage(); wire(); render();
    if (S.s) window.scrollTo(0, 0);
  }).catch(err => {
    document.getElementById('app').innerHTML = `<div class="head"><div><h1>Classic Buys</h1><p class="lede">The board's data is not reachable right now (${esc(err.message)}).</p></div></div>`;
  });
})();
