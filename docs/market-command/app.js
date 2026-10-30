'use strict';
(function () {
  const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
  const TITLE = (HAS_DOM && document.title) || 'Market Command';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const M = '−', DASH = '–', NONE = '—';
  const SEP = ' <i class="sep">·</i> ';
  const REFRESH_MS = 5 * 60 * 1000;
  const STATES = ['on', 'mixed', 'off'];
  const LWORD = { on: 'RISK-ON', mixed: 'MIXED', off: 'RISK-OFF' };
  const TABS = ['buy', 'watch', 'avoid'];
  const TABWORD = { buy: 'Buy candidates', watch: 'Watch', avoid: 'Avoid' };
  const FAM = {
    momentum: ['Momentum', 'Momentum', 'bull'], kdj: ['KDJ', 'KDJ golden crosses', 'bull'],
    options: ['Options', 'Bullish options flow', 'bull'], trend: ['Uptrend', 'Trend (TET Radar)', 'bull'],
    rotation: ['Buy group', 'Rotation Signals BUY group', 'bull'], washout: ['Washout', 'Washout setup', 'setup'],
    options_bear: ['Put flow', 'Bearish options flow', 'bear'], trend_bear: ['Downtrend', 'Trend breaking down (TET Radar)', 'bear'],
    rotation_bear: ['Sell group', 'Rotation Signals SELL group', 'bear'],
  };
  const FAMORDER = ['momentum', 'kdj', 'options', 'trend', 'rotation', 'washout', 'options_bear', 'trend_bear', 'rotation_bear'];
  const SECSHORT = { 'sec:information-technology': 'Tech', 'sec:communication-services': 'Comm Services',
                     'sec:consumer-discretionary': 'Discretionary', 'sec:consumer-staples': 'Staples', 'sec:energy': 'Energy',
                     'sec:financials': 'Financials', 'sec:health-care': 'Health Care', 'sec:industrials': 'Industrials',
                     'sec:materials': 'Materials', 'sec:real-estate': 'Real Estate', 'sec:utilities': 'Utilities' };
  const THEMES = { 'th:ai': 'AI', 'th:semis': 'Semis', 'th:neocloud': 'Neocloud', 'th:hb': 'High beta' };
  const RLABS = [['buy', 'BUY', 'several signals long, none short'], ['watch_up', 'WATCH UP', 'turning up before a buy'],
                 ['watch_out', 'WATCH OUT', 'weakening before a sell'], ['sell', 'SELL', 'several signals short, none long']];
  const RWORD = { buy: 'BUY', watch_up: 'WATCH UP', watch_out: 'WATCH OUT', sell: 'SELL' };
  const RSIG = { calls: 'calls share', lean: 'lean', tilt: 'tilt', move: 'recent move', mom: 'momentum', trend: 'trend' };
  const GSHORT = { 'sec:information-technology': 'Info Tech', 'sec:communication-services': 'Comm Services',
                   'sec:consumer-discretionary': 'Discretionary', 'sec:consumer-staples': 'Staples' };
  const TILEGROUPS = [['stress', 'Stress'], ['breadth', 'Breadth'], ['flow', 'Flow'], ['macro', 'Macro']];
  const KINDWORD = { light: 'Light', pillar: 'Light', tile: 'Weather', forecast: 'Forecast', rotation: 'Rotation', names: 'Names' };
  const EVKIND = { macro: 'Macro', fed: 'Fed' };
  const SRCKIND = { tile: 'Weather', forecast: 'Forecasts', rotation: 'Rotation', names: 'Names' };
  const STWORD = { ok: 'current', behind: 'behind', stale: 'stale', missing: 'missing', error: 'error', held: 'held' };
  const TILESRC = { fear: 'fear', panic: 'desmond', putcall: 'put-call', washout: 'breadth', newlows: 'breadth',
                    trendbreadth: 'trend-breadth', dipline: 'dip-line', aisemis: 'ai-semis-breadth', 'smart-money': 'smart-money',
                    dealer: 'index-flow', crossasset: 'market-board', inflation: 'inflation', bitcoin: 'bitcoin', bubble: 'sornette' };
  const NAV = [['light', 'Light'], ['changes', 'Changes'], ['forecasts', 'Forecasts'], ['rotation', 'Rotation'],
               ['names', 'Names'], ['weather', 'Weather'], ['score', 'Scoreboard'], ['sources', 'Sources']];
  const NSORT = {
    s: ['Symbol', r => r.s, 1], n: ['Company', r => r.n, 1], sec: ['Sector / themes', r => secName(r), 1],
    fam: ['Families', r => (S.n === 'avoid' ? r.bear : r.bull), -1], boards: ['Boards', r => r.boards, -1],
    px: ['Price', r => r.px, -1], r5: ['5d', r => r.r5, -1], r20: ['20d', r => r.r20, -1], biz: ['Biz', r => r.biz, -1],
    king: ['King', r => (r.king ? r.king.dist : null), -1], since: ['Since', r => r.since, -1],
  };

  const S = { n: 'buy', k: null, d: 1, q: '', v: 'full' };
  let D = null, BUILT = null, STATUS = null, FORCE_W = null, FORCE_NARROW = null, LASTFETCH = 0, LASTNARROW = null, LASTNCARDS = null;
  const $ = s => (HAS_DOM ? document.querySelector(s) : null);
  const NARROW = () => (FORCE_NARROW != null ? FORCE_NARROW : FORCE_W ? FORCE_W < 760 : HAS_DOM ? window.innerWidth < 760 : false);
  const NCARDS = () => (FORCE_NARROW != null ? FORCE_NARROW : FORCE_W ? FORCE_W < 1260 : HAS_DOM ? window.innerWidth < 1260 : false);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ok = v => typeof v === 'number' && Number.isFinite(v);
  const str = v => typeof v === 'string' && v.trim() !== '';
  const arr = v => (Array.isArray(v) ? v : []);
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const fixed = (v, d) => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const isZero = t => +t.replace(/,/g, '') === 0;
  const num = (v, d = 2) => (ok(v) ? (v < 0 && !isZero(fixed(v, d)) ? M : '') + fixed(v, d) : DASH);
  const sgn = (v, d = 1) => { if (!ok(v)) return DASH; const t = fixed(v, d); return (isZero(t) ? '' : v > 0 ? '+' : M) + t; };
  const pcS = (share, d = 1) => (ok(share) ? sgn(share * 100, d) + '%' : DASH);
  const pcP = (pts, d = 1) => (ok(pts) ? sgn(pts, d) + '%' : DASH);
  const rpS = (lr, d = 1) => (ok(lr) ? pcS(Math.exp(lr) - 1, d) : DASH);
  const cc = v => (!ok(v) || Math.abs(v) < 5e-5 ? '' : v > 0 ? 'up' : 'dn');
  const px = v => (ok(v) ? num(v, Math.abs(v) >= 10000 ? 0 : 2) : DASH);
  const int = v => (ok(v) ? num(v, 0) : DASH);
  function chance(p) {
    if (!ok(p)) return DASH;
    const x = p * 100;
    if (x > 0 && x < 0.5) return 'under 1%';
    if (x < 100 && x > 99.5) return 'over 99%';
    return Math.round(x) + '%';
  }
  const share = (p, d = 0) => (ok(p) ? fixed(p * 100, d) + '%' : DASH);
  function isoDate(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? ''));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  function day(d) { const t = isoDate(d); return t ? `${MON[t.getUTCMonth()]} ${t.getUTCDate()}` : DASH; }
  function dayW(d) { const t = isoDate(d); return t ? `${DOW[t.getUTCDay()]} ${MON[t.getUTCMonth()]} ${t.getUTCDate()}` : DASH; }
  const year = d => { const t = isoDate(d); return t ? String(t.getUTCFullYear()) : ''; };
  function stampParts(s) {
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})\s*([A-Za-z]+)?/.exec(String(s ?? ''));
    return m ? { date: m[1], time: m[2], zone: m[3] || '' } : null;
  }
  function stamp(s, sameAs) {
    const p = stampParts(s);
    if (!p) return str(s) ? esc(s) : DASH;
    const o = stampParts(sameAs);
    return `${o && o.date === p.date ? '' : day(p.date) + ' '}${p.time}${p.zone ? ' ' + esc(p.zone) : ''}`;
  }
  function expTxt(e) {
    const s = String(e ?? '');
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return `${MON[+m[2] - 1]} ${+m[3]}`;
    m = /^(\d{2})(\d{2})(\d{2})$/.exec(s);
    if (m && +m[2] >= 1 && +m[2] <= 12) return `${MON[+m[2] - 1]} ${+m[3]}`;
    return esc(s);
  }
  const plural = (n, w, ws) => `${int(n)} ${n === 1 ? w : ws || w + 's'}`;
  const tipAttr = t => (str(t) ? ` title="${esc(t)}"` : '');
  const ext = (url, html, cls = '', tip = '') => (str(url)
    ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener"${tipAttr(tip)}>${html}</a>`
    : `<span class="${cls}"${tipAttr(tip)}>${html}</span>`);

  function setData(d) { D = d && typeof d === 'object' ? d : null; BUILT = D ? D.built : null; clean(); }
  const L = () => obj(D && D.light);
  const tiles = () => arr(D && D.tiles).filter(t => t && typeof t === 'object');
  const tickers = () => arr(obj(D && D.forecast).tickers).filter(t => t && typeof t === 'object');
  const N = () => obj(D && D.names);
  const bucket = b => arr(obj(N().buckets)[b]).filter(r => r && typeof r === 'object');
  const ROT = () => obj(D && D.rotation);
  const SB = () => obj(D && D.scoreboard);
  const sources = () => arr(D && D.sources).filter(s => s && typeof s === 'object');
  const lightState = () => (STATES.includes(L().state) ? L().state : null);
  const stateWord = st => LWORD[st] || DASH;
  const boardOf = id => arr(N().boards).find(b => b && b.id === id) || null;
  const srcName = s => (str(s.name) ? s.name : str(s.id) ? s.id : 'a source');
  const secName = r => SECSHORT[r.sec] || (str(r.sector) ? r.sector : '');
  const gName = g => GSHORT[g.id] || (str(g.name) ? g.name : String(g.id || ''));
  function clean() {
    if (!TABS.includes(S.n)) S.n = 'buy';
    if (S.k != null && !NSORT[S.k]) S.k = null;
    if (S.d !== 1 && S.d !== -1) S.d = 1;
    if (typeof S.q !== 'string') S.q = '';
    if (S.v !== 'simple') S.v = 'full';
  }

  function sparkSVG(series, o = {}) {
    const W = 300, H = o.h || 44, fwd = o.fwd || 0;
    const base = arr(series[0] && series[0].pts).filter(p => Array.isArray(p) && ok(p[1]));
    if (base.length < 2) return '';
    const ix = new Map(base.map((p, i) => [p[0], i]));
    const n = base.length, slots = n - 1 + fwd;
    const vals = [];
    const lines = series.map((s, k) => {
      const pts = k === 0 ? base.map((p, i) => [i, p[1]]) : arr(s.pts).filter(p => Array.isArray(p) && ok(p[1]) && ix.has(p[0])).map(p => [ix.get(p[0]), p[1]]);
      pts.forEach(p => vals.push(p[1]));
      return Object.assign({}, s, { pts });
    });
    arr(o.extra).forEach(v => { if (ok(v)) vals.push(v); });
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const span = hi - lo || Math.abs(hi) * 0.02 || 1;
    const guides = arr(o.lines).filter(g => ok(g.v) && g.v >= lo - span && g.v <= hi + span);
    guides.forEach(g => { lo = Math.min(lo, g.v); hi = Math.max(hi, g.v); });
    if (hi - lo < 1e-12) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.06;
    lo -= pad; hi += pad;
    const X = i => +(i / Math.max(1, slots) * W).toFixed(1), Y = v => +((hi - v) / (hi - lo) * H).toFixed(1);
    const ns = ' vector-effect="non-scaling-stroke"';
    let s = `<svg class="spark" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img"${o.label ? ` aria-label="${esc(o.label)}"` : ''}>`;
    if (o.tip) s += `<title>${esc(o.tip)}</title>`;
    for (const g of guides) s += `<line x1="0" x2="${W}" y1="${Y(g.v)}" y2="${Y(g.v)}" stroke="${g.color || '#4a4e5a'}" stroke-width="1" stroke-dasharray="3 3"${ns}/>`;
    if (o.cone) s += o.cone(X, Y, n - 1);
    for (let k = lines.length - 1; k >= 0; k--) {
      const ln = lines[k];
      if (ln.pts.length < 2) continue;
      s += `<polyline points="${ln.pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}" fill="none" stroke="${ln.color || '#d1d4dc'}" stroke-width="${ln.width || 1.5}"${ln.dash ? ` stroke-dasharray="${ln.dash}"` : ''} stroke-linejoin="round"${ns}/>`;
    }
    return s + '</svg>';
  }
  function sparkTip(pts, f) {
    const p = arr(pts).filter(q => Array.isArray(q) && ok(q[1]));
    if (p.length < 2) return '';
    const v = p.map(q => q[1]);
    return `${day(p[0][0])} to ${day(p[p.length - 1][0])} · low ${f(Math.min(...v))} · high ${f(Math.max(...v))}`;
  }
  function rangeBarSVG(close, b68, b90, lo, hi) {
    const W = 300, H = 16;
    if (!ok(lo) || !ok(hi) || hi <= lo) return '';
    const X = v => +Math.max(0, Math.min(W, (v - lo) / (hi - lo) * W)).toFixed(1);
    let s = `<svg class="rbar" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-hidden="true">` +
      `<rect x="0" y="6" width="${W}" height="4" fill="#232733"/>`;
    const band = (b, fill) => (ok(b.lo) && ok(b.hi) && b.hi > b.lo ? `<rect x="${X(b.lo)}" y="2" width="${+(X(b.hi) - X(b.lo)).toFixed(1)}" height="12" rx="2" fill="${fill}"/>` : '');
    s += band(b90, 'rgba(41,98,255,.30)') + band(b68, 'rgba(41,98,255,.68)');
    if (ok(close)) s += `<line x1="${X(close)}" x2="${X(close)}" y1="0" y2="${H}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    return s + '</svg>';
  }
  function meterSVG(p) {
    if (!ok(p)) return '';
    const x = Math.max(0, Math.min(100, p));
    return `<svg class="meter" viewBox="0 0 100 6" width="100%" height="6" preserveAspectRatio="none" aria-hidden="true">` +
      `<rect x="0" y="2" width="100" height="2" fill="#2a2e39"/><rect x="0" y="2" width="${x.toFixed(1)}" height="2" fill="#5d6a80"/>` +
      `<rect x="${Math.max(0, Math.min(98.5, x - 0.75)).toFixed(2)}" y="0" width="1.5" height="6" fill="#d1d4dc"/></svg>`;
  }

  function sourceCounts() {
    const c = { ok: 0, behind: 0, stale: 0, held: 0, missing: 0, error: 0, total: 0 };
    for (const s of sources()) { c.total++; if (c[s.status] != null) c[s.status]++; }
    return c;
  }
  function statusDot() {
    if (!D) return '';
    const age = (Date.now() - Date.parse(D.built)) / 36e5;
    const failed = STATUS && STATUS.ok === false;
    const waits = D.final !== true && ok(Date.parse(D.freeze_at)) && Date.now() < Date.parse(D.freeze_at) + 30 * 6e4;
    const cls = failed ? 'err' : ok(age) && age > 26 && !waits ? 'old' : '';
    const tip = failed ? 'the newest build did not finish; this is the copy before it'
      : !ok(age) ? 'build time unknown' : age > 26 && !waits ? `the newest data has not come in: this copy is ${Math.round(age)} hours old`
      : age < 1 ? 'updated in the last hour' : `updated ${Math.round(age)} hours ago`;
    return `<b class="dot ${cls}" title="${esc(tip)}"></b>`;
  }
  function barHTML() {
    const brand = `<span id="brand">MARKET COMMAND</span>`;
    if (!D) return brand;
    const fin = D.final === true;
    const fz = stampParts(D.freeze_at_et), bt = stampParts(D.built_et);
    const fzTxt = fz ? (bt && bt.date === fz.date ? `${fz.time} ${esc(fz.zone)}` : `${dayW(fz.date)} ${fz.time} ${esc(fz.zone)}`) : '09:25 ET';
    const badge = fin
      ? `<span class="badge fin" title="${esc(`the ${day(D.day)} calls are frozen${fz ? ` since ${day(fz.date)} ${fz.time} ${fz.zone}` : ''}; the scoreboard scores them`)}">final</span>`
      : `<span class="badge upd" title="${esc(`the ${day(D.day)} calls may still change as the after-close data comes in; they freeze at ${fz ? `${day(fz.date)} ${fz.time} ${fz.zone}` : '09:25 ET on the next session'}`)}">updating · final ${fzTxt}</span>`;
    const c = sourceCounts();
    const off = c.total - c.ok;
    const srcTip = sources().filter(s => s.status !== 'ok').map(s => `${srcName(s)}: ${STWORD[s.status] || 'unknown'}`).join(' · ');
    const srcl = c.total ? `<button class="srcl${off ? ' warn' : ''}" data-jump="sources"${tipAttr(srcTip)}>${c.ok} of ${c.total} sources current</button>` : '';
    return brand + viewSwitch() + `<span class="sess">${day(D.day)} close</span>` + badge +
      `<span class="built">${statusDot()}built ${stamp(D.built_et)}</span>` + srcl;
  }
  function navHTML() {
    return D ? `<nav class="nav" aria-label="Sections">${NAV.map(([id, w]) => `<button data-jump="${id}">${w}</button>`).join('')}` +
      `<button class="nsimple" data-view="simple">Simple view</button></nav>` : '';
  }
  function viewSwitch() {
    return `<span class="vsw" role="group" aria-label="View">${[['simple', 'Simple', 'the TL;DR in plain words'], ['full', 'Full', 'every number on the board']]
      .map(([v, w, tip]) => `<button data-view="${v}" class="${S.v === v ? 'on' : ''}" aria-pressed="${S.v === v}" title="${tip}">${w}</button>`).join('')}</span>`;
  }

  const pillarTone = p => (['good', 'warn', 'bad', 'neutral'].includes(p.tone) ? p.tone : 'neutral');
  function pillarValue(p) {
    if (!ok(p.value)) return p.id === 'trend' && ok(obj(p.detail).above200_pct) ? pcP(obj(p.detail).above200_pct) : DASH;
    if (p.fmt === 'ratio') return num(p.value, 3);
    if (p.fmt === 'pct') return num(p.value, 1) + '%';
    return px(p.value);
  }
  function distText(p) {
    const a = obj(p.detail).above200_pct;
    return p.id === 'trend' && ok(a) ? `${num(Math.abs(a), 1)}% ${a >= 0 ? 'above' : 'below'} the 200-day average` : '';
  }
  function pillarDetail(p) {
    const d = obj(p.detail);
    if (p.id === 'trend') return ok(d.sma50) || ok(d.sma200) ? `SPY ${px(d.close)} · 50-day ${px(d.sma50)} · 200-day ${px(d.sma200)}` : '';
    if (p.id === 'vol') return ok(d.vix) ? `VIX ${num(d.vix, 2)} ÷ VIX3M ${num(d.vix3m, 2)}${ok(d.ratio) ? ` = ${num(d.ratio, 3)}` : ''}` : '';
    if (p.id === 'breadth') return ok(d.a50) && ok(d.n50) ? `${int(d.a50)} of ${int(d.n50)} S&P 500 stocks above their 50-day average${ok(d.pct50) ? ` (${num(d.pct50, 1)}%)` : ''}` : '';
    return '';
  }
  function pillarHTML(p) {
    const tone = pillarTone(p);
    const f = p.fmt === 'ratio' ? (x => num(x, 3)) : p.fmt === 'pct' ? (x => num(x, 1) + '%') : px;
    const series = [{ pts: p.spark, color: '#d1d4dc', width: 1.5 }];
    if (arr(p.spark2).length) series.push({ pts: p.spark2, color: '#787b86', width: 1.2, dash: '4 3' });
    const spark = sparkSVG(series, { h: 46, label: `${p.name || p.id}, last six months`,
      tip: sparkTip(p.spark, f) + (p.id === 'trend' && arr(p.spark2).length ? ' · dashed: the 200-day average' : '') });
    const word = str(p.word) ? p.word : ok(p.value) ? DASH : 'not in yet';
    const det = pillarDetail(p), dist = distText(p);
    return `<div class="pillar tone-${tone}"><div class="ph"><span class="pn">${esc(p.name || p.id)}</span><span class="pw">${esc(word)}</span></div>` +
      `<div class="pv">${pillarValue(p)}</div>` + (dist ? `<div class="pd">${esc(dist)}</div>` : '') +
      (det ? `<div class="px muted">${esc(det)}</div>` : '') + (spark ? `<div class="psp">${spark}</div>` : '') + `</div>`;
  }
  function lightHistLine() {
    const st = lightState(), H = obj(L().history);
    if (!st) return '';
    const tipPart = era => {
      const e = obj(H[era]), a = obj(e[st]), all = obj(e.all);
      if (!ok(a.n)) return '';
      return `Since ${era}: ${plural(a.n, `${stateWord(st)} day`)} in ${plural(a.episodes, 'run')}; higher a week later ${share(a.up5)}, a month later ` +
        `${share(a.up21)}; average month ${pcS(a.mean21)}, middle ${pcS(a.med21)}. All ${int(all.n)} days: a week ${share(all.up5)}, a month ` +
        `${share(all.up21)}, average month ${pcS(all.mean21)}, middle ${pcS(all.med21)} (${plural(all.episodes, 'run')}).`;
    };
    for (const era of ['2021', '2013']) {
      const e = obj(H[era]), a = obj(e[st]), all = obj(e.all);
      if (ok(a.up21) && ok(all.up21)) {
        return `<div class="lhist" title="${esc([tipPart('2021'), tipPart('2013')].filter(Boolean).join('\n'))}">After ${stateWord(st)} days since ${era}, ` +
          `SPY was higher a month later <b>${share(a.up21)}</b> of the time (all days ${share(all.up21)}).</div>`;
      }
    }
    return '';
  }
  function heroHTML() {
    const l = L(), st = lightState();
    const pills = arr(l.pillars).filter(p => p && typeof p === 'object');
    let since = '';
    if (str(l.since)) since = l.since === (D && D.day) ? `new at the ${day(l.since)} close` : `since ${day(l.since)}`;
    const prev = st && STATES.includes(l.prev) && l.prev !== st ? `was ${stateWord(l.prev)} on ${day(D && D.prev)}` : '';
    const meta = [since ? esc(since) : '', prev ? `<span class="was">${esc(prev)}</span>` : ''].filter(Boolean).join(SEP);
    const flips = ok(l.flips_per_year) ? `The light changes about ${Math.round(l.flips_per_year)} times a year` : '';
    const asof = str(l.as_of) ? `as of the ${day(l.as_of)} close` : '';
    const word = st ? (str(l.word) ? l.word : stateWord(st)) : 'NO LIGHT YET';
    return `<section id="sec-light" class="hero"><div class="light ${st || 'none'}">` +
      `<div class="lp"><span class="lpill"><i></i>${esc(word)}</span><span class="lmeta">${meta}</span></div>` +
      `<div class="ltext">${esc(str(l.text) ? l.text : st ? '' : 'The risk light has no reading for this session.')}</div>` + lightHistLine() +
      ([flips, asof].filter(Boolean).length ? `<div class="lfoot muted">${[flips, asof].filter(Boolean).join(' · ')}</div>` : '') + `</div>` +
      (pills.length ? `<div class="pillars">${pills.map(pillarHTML).join('')}</div>` : '') + `</section>`;
  }

  function changesHTML() {
    const ch = arr(D && D.changes).filter(c => c && str(c.text));
    const head = `<div class="h2"><b>What changed</b><span>since the ${day(D && D.prev)} session · click one to jump to it</span></div>`;
    const jump = c => ({ light: 'light', pillar: 'light', tile: 'weather', forecast: 'forecasts', rotation: 'rotation', names: 'names' })[c.kind] || 'light';
    const body = ch.length
      ? `<div class="chgs">${ch.map(c => `<button class="chg ${['good', 'bad'].includes(c.tone) ? c.tone : 'neutral'}" data-jump="${jump(c)}"${str(c.ref) ? ` data-ref="${esc(c.ref)}"` : ''}>` +
          `<i>${esc(KINDWORD[c.kind] || c.kind)}</i>${esc(c.text)}</button>`).join('')}</div>`
      : `<div class="none">No changes since the ${day(D && D.prev)} session.</div>`;
    return `<section id="sec-changes">${head}${body}${comingHTML()}</section>`;
  }
  function comingHTML() {
    const ev = arr(D && D.coming).filter(e => e && str(e.what));
    const head = `<div class="h3" id="sec-coming">Coming up <span>next 5 sessions</span></div>`;
    if (!ev.length) return head + `<div class="none">Nothing scheduled on the calendars the board reads.</div>`;
    const today = stampParts(D.built_et);
    return head + `<div class="evs">` + ev.map(e => {
      const isToday = today && e.day === today.date && (e.kind === 'macro' || e.kind === 'fed');
      const syms = arr(e.syms).filter(str);
      return `<div class="ev"><span class="evt"><b>${esc(e.at_et)}</b></span>` +
        `<span class="evk ${esc(e.kind)}">${esc(EVKIND[e.kind] || e.kind)}</span>` +
        `<span class="evw">${isToday ? '<span class="tdy">today</span>' : ''}${esc(e.what)}${str(e.note) ? ` <span class="muted">· ${esc(e.note)}</span>` : ''}` +
        `${syms.map(s => ` <span class="sy">${esc(s)}</span>`).join('')}</span></div>`;
    }).join('') + `</div>`;
  }

  const HZ = [['5', 'Next week', 'week', 'this week'], ['21', 'Next month', 'month', 'within a month']];
  function bandOf(t, h, k) { return obj(obj(obj(obj(t.h)[h]).bands)[k]); }
  function coneFor(t) {
    const b5 = bandOf(t, '5', '90'), b21 = bandOf(t, '21', '90'), i5 = bandOf(t, '5', '68'), i21 = bandOf(t, '21', '68');
    const close = ok(t.close) ? t.close : null;
    if (!ok(close)) return null;
    return (X, Y, x0) => {
      const poly = (w, m, fill) => {
        const pts = [[x0, close]];
        if (ok(w.hi)) pts.push([x0 + 5, w.hi]);
        if (ok(m.hi)) pts.push([x0 + 21, m.hi]);
        if (ok(m.lo)) pts.push([x0 + 21, m.lo]);
        if (ok(w.lo)) pts.push([x0 + 5, w.lo]);
        return pts.length >= 3 ? `<polygon points="${pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}" fill="${fill}"/>` : '';
      };
      let s = poly(b5, b21, 'rgba(41,98,255,.16)') + poly(i5, i21, 'rgba(41,98,255,.34)');
      s += `<line x1="${X(x0)}" x2="${X(x0 + 21)}" y1="${Y(close)}" y2="${Y(close)}" stroke="#5d606b" stroke-width="1" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>`;
      return s;
    };
  }
  function oddsTip(o, h, st) {
    const nm = obj(o.normal), lk = obj(o.like);
    const later = h === '5' ? 'a week' : 'a month';
    return ['2021', '2013'].map(era => {
      const a = obj(nm[era]), b = obj(lk[era]);
      return `Since ${era}: higher ${later} later after ${share(a.p, 1)} of ${int(a.n)} days; on ${stateWord(st)} days ${share(b.p, 1)} of ${int(b.n)} (${plural(b.episodes, 'run')}).`;
    }).join('\n');
  }
  function fwdRange(f, unit) {
    f = obj(f);
    if (ok(f.n) && f.n > 0 && ok(f.cov)) return `forward ${Math.round(f.cov * f.n)} of ${plural(f.n, unit)}${ok(f.open) && f.open ? `, ${f.open} open` : ''}`;
    if (ok(f.open) && f.open > 0) return `forward ${f.open} open`;
    return D && D.fwd_start ? 'forward none closed yet' : 'forward record starts at the first freeze';
  }
  function trackHTML(t) {
    const tr = obj(t.track), R = obj(tr.ranges);
    const r5 = obj(obj(R['5'])['90']), r21 = obj(obj(R['21'])['90']);
    const since = year(tr.from) || '2014';
    const h5 = obj(r5.hist), h21 = obj(r21.hist), n5 = obj(r5.hist21), n21 = obj(r21.hist21);
    if (!ok(h5.cov) && !ok(h21.cov) && !ok(n5.cov) && !ok(obj(r5.fwd).n)) return '';
    const held = (a, b) => `${share(a.cov)} of weeks${ok(b.cov) ? ` and ${share(b.cov)} of months` : ''}`;
    const head = ok(n5.cov)
      ? `9-in-10 range held ${held(n5, n21)} since 2021${ok(h5.cov) ? ` (${share(h5.cov)} / ${share(h21.cov)} since ${since})` : ''}`
      : ok(h5.cov) ? `9-in-10 range held ${held(h5, h21)} since ${since}` : '9-in-10 range record';
    const tipR = h => {
      const r = obj(R[h]);
      return ['68', '90'].map(k => {
        const b = obj(r[k]), hi = obj(b.hist), h2 = obj(b.hist21), fw = obj(b.fwd);
        return `${k === '68' ? '2 in 3' : '9 in 10'} range: held ${share(hi.cov, 1)} of ${int(hi.n)} days since ${since}, ${share(h2.cov, 1)} of ${int(h2.n)} since 2021` +
          `; forward ${ok(fw.n) && fw.n ? `${share(fw.cov, 0)} of ${int(fw.n)}` : 'none closed'}${ok(fw.open) && fw.open ? `, ${fw.open} open` : ''}`;
      }).join('; ');
    };
    const T = obj(tr.tail), O = obj(tr.odds);
    const bs = v => (ok(v) ? v.toFixed(3) : DASH);
    const tipT = (k, w) => { const x = obj(obj(T[k]).hist), f = obj(obj(T[k]).fwd); return `${w}: ${bs(x.brier)} vs ${bs(x.brier_base)} normally (${int(x.n)} days)${ok(f.n) && f.n ? `, forward ${bs(f.brier)} vs ${bs(f.brier_base)} (${int(f.n)})` : ''}${ok(f.open) && f.open ? `, ${f.open} open` : ''}`; };
    const tipO = (h, w) => { const x = obj(obj(O[h]).hist), f = obj(obj(O[h]).fwd); return `${w}: ${bs(x.brier_like)} on days like today vs ${bs(x.brier_normal)} normally (${int(x.n)} days)${ok(f.n) && f.n ? `, forward ${bs(f.brier_like)} vs ${bs(f.brier_normal)} (${int(f.n)})` : ''}${ok(f.open) && f.open ? `, ${f.open} open` : ''}`; };
    const tip = `Week: ${tipR('5')}.\nMonth: ${tipR('21')}.\nChance scores, lower is better (the average squared miss): ` +
      `${tipT('day_drop', '2% down day')}; ${tipT('month_dip', '5% dip')}; ${tipO('5', 'higher in a week')}; ${tipO('21', 'higher in a month')}.`;
    return `<div class="ftr" title="${esc(tip)}">${esc(head)} · ${esc(fwdRange(r5.fwd, 'day'))}</div>`;
  }
  function horizonHTML(t, h, word, scale) {
    const H = obj(obj(t.h)[h]), b68 = bandOf(t, h, '68'), b90 = bandOf(t, h, '90');
    const move = ok(H.move) ? `typical move ±${fixed(H.move, 1)}%` : '';
    const row = (k, b) => `<div class="hzr"><span class="k">${k === '68' ? '2 in 3' : '9 in 10'}</span>` +
      (ok(b.lo) || ok(b.hi) || !ok(b.lo_pct) ? `<span class="num">${px(b.lo)} – ${px(b.hi)}</span>` +
      `<span class="muted num">${pcP(b.lo_pct)} / ${pcP(b.hi_pct)}</span>` : `<span class="num">${pcP(b.lo_pct)} / ${pcP(b.hi_pct)}</span>`) + `</div>`;
    const has = ok(b90.lo) || ok(b68.lo) || ok(b90.lo_pct) || ok(b68.lo_pct);
    return `<div class="hz"><div class="hzh"><b>${word}</b>${str(H.end) ? `<span class="muted">to ${dayW(H.end)}</span>` : ''}${move ? `<span class="hzs">${move}</span>` : ''}</div>` +
      (has ? rangeBarSVG(t.close, b68, b90, scale[0], scale[1]) + row('68', b68) + row('90', b90) : `<div class="none">No range today.</div>`) + `</div>`;
  }
  function tailHTML(t, k, label) {
    const x = obj(obj(t.tail)[k]), b = obj(x.base);
    const norm = ok(b['2021']) ? b['2021'] : b['2013'];
    const cls = ok(x.p) && ok(norm) ? (x.p > norm * 1.15 ? 'hi' : x.p < norm * 0.87 ? 'lo' : '') : '';
    const tip = `${str(x.rule) ? x.rule + '. ' : ''}Normally: ${share(b['2021'], 1)} of days since 2021, ${share(b['2013'], 1)} since 2013.`;
    return `<div class="odd" title="${esc(tip)}"><span>${label}:</span> <b class="${cls}">${chance(x.p)}</b> <span class="muted">(normally ${chance(norm)})</span></div>`;
  }
  function upOddsHTML(t, h, word) {
    const o = obj(obj(t.odds)[h]), nm = obj(o.normal), lk = obj(o.like);
    const st = STATES.includes(lk.state) ? lk.state : lightState();
    const n = obj(nm['2021']).p != null ? obj(nm['2021']) : obj(nm['2013']);
    const l = obj(lk['2021']).p != null ? obj(lk['2021']) : obj(lk['2013']);
    const cls = ok(l.p) && ok(n.p) ? (l.p - n.p >= 0.03 ? 'lo' : n.p - l.p >= 0.03 ? 'hi' : '') : '';
    return `<div class="odd" title="${esc(oddsTip(o, h, st))}"><span>Higher in a ${word}:</span> <b>${chance(n.p)}</b> <span class="muted">normally</span> · ` +
      `<b class="${cls}">${chance(l.p)}</b> <span class="muted">on days like today (${stateWord(st)})</span></div>`;
  }
  function tickerHTML(t) {
    const b5 = bandOf(t, '5', '90'), b21 = bandOf(t, '21', '90');
    const vals = [t.close, b5.lo, b5.hi, b21.lo, b21.hi, bandOf(t, '5', '68').lo, bandOf(t, '21', '68').hi].filter(ok);
    let scale = [null, null];
    if (vals.length >= 2) { const lo = Math.min(...vals), hi = Math.max(...vals), p = (hi - lo) * 0.04; scale = [lo - p, hi + p]; }
    const behind = str(t.day) && D && t.day !== D.day ? `<span class="tag warn">as of ${day(t.day)}</span>` : '';
    const cone = coneFor(t);
    const sp = sparkSVG([{ pts: t.spark, color: '#d1d4dc', width: 1.5 }], {
      h: 64, fwd: 21, extra: [b5.lo, b5.hi, b21.lo, b21.hi], cone: cone || undefined,
      label: `${t.s} last six months and the ranges ahead`, tip: sparkTip(t.spark, px) + ' · shaded: the week and month ranges' });
    return `<div class="fcard" id="fc-${esc(t.s)}"><div class="fh"><b class="fs">${esc(t.s)}</b><span class="fn">${esc(t.name)}</span>${behind}` +
      `${ok(t.close) || !str(t.day) ? `<span class="fc num">${px(t.close)}</span>` : ''}</div>` +
      (sp ? `<div class="fsp">${sp}</div>` : '') +
      `<div class="hzs2">${HZ.map(([h, w]) => horizonHTML(t, h, w, scale)).join('')}</div>` +
      `<div class="odds">${tailHTML(t, 'day_drop', 'Chance of a 2% down day this week')}${tailHTML(t, 'month_dip', 'Chance of a 5% drop within a month')}` +
      `${upOddsHTML(t, '5', 'week')}${upOddsHTML(t, '21', 'month')}</div>` +
      `<div class="ffoot">${trackHTML(t)}</div></div>`;
  }
  function forecastHTML() {
    const ts = tickers(), ab = obj(obj(D && D.forecast).about);
    const head = `<div class="h2"><b>Forecasts</b><span>from the ${day(D && D.day)} close · the inner band is set to hold 2 in 3 closes, the outer band 9 in 10 · hover for how often they held</span></div>`;
    const about = [['Ranges', ab.ranges], ['Chances', ab.tails], ['Higher', ab.odds]].filter(x => str(x[1]));
    return `<section id="sec-forecasts">${head}` +
      (ts.length ? `<div class="fgrid">${ts.map(tickerHTML).join('')}</div>` : `<div class="none">No forecasts in this build.</div>`) +
      (about.length ? `<div class="defs">${about.map(([k, v]) => `<div><b>${k}:</b> ${esc(v)}</div>`).join('')}</div>` : '') + `</section>`;
  }

  const rotUrl = () => null;
  function groupTip(g) {
    const sc = obj(g.sector);
    const sig = l => arr(l).map(x => RSIG[x] || x).join(', ');
    const parts = [`${g.name || g.id}${RWORD[g.label] ? ' · ' + RWORD[g.label] : ''}`];
    if (arr(g.longs).length) parts.push(`long on ${sig(g.longs)}`);
    if (arr(g.shorts).length) parts.push(`short on ${sig(g.shorts)}`);
    if (g.sector) parts.push(`sector board: ${[sc.quad ? `${sc.quad} on the rotation chart` : '', ok(sc.rank) ? `strength rank ${sc.rank} of 11` : '', sc.br ? `breadth ${sc.br}` : '', sc.fear ? `fear ${sc.fear}` : ''].filter(Boolean).join(', ')}`);
    return parts.join(' · ');
  }
  function groupChip(g, rday) {
    let when = '';
    if (g.prev && g.prev !== g.label && RWORD[g.prev]) when = `<span class="gs new">was ${RWORD[g.prev]}</span>`;
    else if (str(g.since)) when = g.since >= (rday || '9') ? `<span class="gs new">new</span>` : `<span class="gs">since ${day(g.since)}</span>`;
    const names = arr(g.names).filter(str);
    return ext(rotUrl(g), `<span class="gl"><span class="gn">${esc(gName(g))}</span>${str(g.etf) ? `<span class="etf">${esc(g.etf)}</span>` : ''}` +
      `${g.kind && g.kind !== 'sector' ? `<span class="kt ${esc(g.kind)}">${esc(g.kind)}</span>` : ''}${when}</span>` +
      (names.length ? `<span class="gm">${names.map(esc).join(' ')}</span>` : ''), 'gchip', groupTip(g));
  }
  function rotStatsLine(st) {
    st = obj(st);
    const h = obj(st.history), f = obj(st.forward);
    if (!ok(h.closed) && !ok(f.closed)) return '';
    const rec = (x, w) => (ok(x.closed) && x.closed ? `${w} ${plural(x.closed, 'trade')} closed, ${rpS(x.mean)} a trade, ${won(x.won, x.closed)}` : `${w} none closed`) +
      (ok(x.open) && x.open ? `, ${x.open} open` : '');
    return `${rec(h, 'history')} · ${rec(f, 'forward')}${ok(st.book_fwd) ? ` · forward book ${rpS(st.book_fwd)}` : ''}`;
  }
  function won(w, n) {
    if (!ok(w)) return '';
    if (w > 0 && w < 1 && !Number.isInteger(w)) return `won ${share(w)}`;
    return `won ${int(w)}${ok(n) ? ` of ${int(n)}` : ''}`;
  }
  function rotationHTML() {
    const R = ROT(), groups = arr(R.groups).filter(g => g && g.id);
    const bits = [R.day ? `${day(R.day)} close` : '', R.settle ? `options OI ${day(R.settle)} settle` : ''].filter(Boolean);
    const live = R.live === true ? '<span class="badge live">live</span>' : '';
    const stale = R.stale === true ? `<span class="tag warn">${R.as_of ? `as of ${day(R.as_of)}` : 'not in yet'}</span>` : '';
    const head = `<div class="h2"><b>Rotation</b><span>${esc(bits.join(' · ') || 'Rotation Signals')}${live}${stale}</span></div>`;
    if (!groups.length) return `<section id="sec-rotation">${head}<div class="none">No rotation labels in this build.</div></section>`;
    const cols = RLABS.map(([id, w, hint]) => {
      const gs = groups.filter(g => g.label === id);
      return `<div class="rcol ${id}"><div class="rch"><b>${w}</b><span class="n">${gs.length}</span><span class="hint">${hint}</span></div>` +
        (gs.length ? gs.map(g => groupChip(g, R.day)).join('') : `<div class="none">none today</div>`) + `</div>`;
    }).join('');
    const quiet = groups.filter(g => !RWORD[g.label]);
    const stats = rotStatsLine(R.stats);
    return `<section id="sec-rotation">${head}<div class="rcols">${cols}</div>` +
      (quiet.length ? `<div class="rnone"><span class="muted">No signal:</span> ${quiet.map(g => ext(rotUrl(g), esc(gName(g)), 'rq', groupTip(g))).join(SEP)}</div>` : '') +
      (stats ? `<div class="rstat muted" title="long every BUY group, short every SELL group, entered at the next close and held a week">Label trades: ${esc(stats)}</div>` : '') +
      `</section>`;
  }

  function famChips(r) {
    const fam = obj(r.fam);
    return FAMORDER.concat(Object.keys(fam).filter(f => !FAMORDER.includes(f))).filter(f => arr(fam[f]).length).map(f => {
      const side = (boardOf(arr(fam[f])[0]) || {}).side;
      const w = FAM[f] || [f, f, ['bull', 'bear', 'setup'].includes(side) ? side : 'setup'];
      const bs = arr(fam[f]).map(id => { const b = boardOf(id); return b && str(b.name) ? b.name : id; });
      return `<span class="fam ${w[2]}" title="${esc(`${w[1]}: ${bs.join(', ')}`)}">${esc(w[0])}</span>`;
    }).join('');
  }
  function themeTags(r) { return arr(r.themes).filter(str).map(t => `<span class="th">${esc(THEMES[t] || t.replace(/^th:/, ''))}</span>`).join(''); }
  function notesHTML(r) { return arr(r.notes).filter(n => n && str(n.text)).map(n => `<span class="note ${esc(n.kind)}" title="${esc(n.text)}">${esc(n.text)}</span>`).join(''); }
  function kingHTML(r, compact) {
    const k = r.king;
    if (!k || !ok(k.k)) return `<span class="muted">${DASH}</span>`;
    const exp = str(k.exp) || ok(k.exp) ? expTxt(k.exp) : '';
    return `<span class="num" title="${esc(`king strike ${num(k.k, Number.isInteger(k.k) ? 0 : 2)}, ${pcS(k.dist)} from the price${exp ? `, expiry ${exp}` : ''}`)}">` +
      `${num(k.k, Number.isInteger(k.k) ? 0 : 2)}</span> <span class="muted num">${pcS(k.dist)}${exp && !compact ? ' · ' + exp : ''}</span>`;
  }
  const famSplit = r => `${plural(ok(r.bull) ? r.bull : 0, 'bullish family', 'bullish families')} · ${plural(ok(r.bear) ? r.bear : 0, 'bearish family', 'bearish families')} · ${plural(ok(r.setup) ? r.setup : 0, 'washout setup')}`;
  function sinceHTML(r, compact) {
    if (compact && r.new === true) return `<span class="nb" title="${esc(`on this list since ${day(r.since)}`)}">new</span>`;
    return `${day(r.since)}${r.new === true ? ' <span class="nb">new</span>' : ''}`;
  }
  function whyTag(r) { return r.why === 'turning' || r.why === 'mixed' ? `<span class="why ${r.why}" title="${r.why === 'turning' ? 'a washout setup with bullish families and nothing bearish' : 'bullish families with a bearish one'}">${r.why}</span>` : ''; }
  function links(r) {
    const l = obj(r.links);
    return str(l.eagle) ? ext(l.eagle, 'EE', 'lk', 'Eagle Eye Technicals') : '';
  }
  const symLink = r => ext(obj(r.links).gex, esc(r.s), 'sym', str(obj(r.links).gex) ? `${r.n || r.s}: open its GEX Hunt chart` : (r.n || r.s));
  function rowText(r) {
    const fam = Object.keys(obj(r.fam)).map(f => (FAM[f] || [f, f])[0] + ' ' + (FAM[f] || [f, f])[1]).join(' ');
    return [r.s, r.n, r.sector, secName(r), arr(r.themes).map(t => THEMES[t] || t).join(' '), fam, arr(r.notes).map(n => n && n.text).join(' '), r.why].join(' ').toLowerCase();
  }
  function namesRows() {
    let rows = bucket(S.n);
    const q = S.q.trim().toLowerCase();
    if (q) rows = rows.filter(r => q.split(/\s+/).every(w => rowText(r).includes(w)));
    if (S.k && NSORT[S.k]) {
      const [, get, nat] = NSORT[S.k];
      const dir = nat * S.d;
      rows = rows.map((r, i) => [r, i]).sort((a, b) => {
        const x = get(a[0]), y = get(b[0]);
        const mx = x == null || x === '' || (typeof x === 'number' && !ok(x)), my = y == null || y === '' || (typeof y === 'number' && !ok(y));
        if (mx || my) return mx && my ? a[1] - b[1] : mx ? 1 : -1;
        const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return dir * c || a[1] - b[1];
      }).map(x => x[0]);
    }
    return rows;
  }
  function namesTabsHTML() {
    const c = obj(N().counts);
    return TABS.map(b => {
      const n = ok(c[b]) ? c[b] : bucket(b).length;
      const w = NARROW() ? { buy: 'Buy', watch: 'Watch', avoid: 'Avoid' }[b] : TABWORD[b];
      return `<button class="ntab ${b}${S.n === b ? ' on' : ''}" data-n="${b}" aria-pressed="${S.n === b}" title="${TABWORD[b]}">${w} <b>${int(n)}</b></button>`;
    }).join('');
  }
  function namesListHTML() {
    const rules = obj(N().rules), rows = namesRows(), all = bucket(S.n);
    const rule = str(rules[S.n]) ? `<div class="nrule"><b>${TABWORD[S.n]}:</b> ${esc(rules[S.n])}</div>` : '';
    if (!all.length) return rule + `<div class="none">No ${S.n === 'buy' ? 'buy candidates' : S.n === 'watch' ? 'names to watch' : 'names to avoid'} today.</div>`;
    if (!rows.length) return rule + `<div class="none">No ${TABWORD[S.n].toLowerCase()} match “${esc(S.q)}”.</div>`;
    const shown = rows.length < all.length ? `<div class="ncount muted">${rows.length} of ${all.length} shown</div>` : '';
    if (NCARDS()) {
      const opts = [['', 'Board order']].concat(Object.keys(NSORT).map(k => [k, NSORT[k][0]]));
      const sel = `<div class="sortbar"><span class="muted">Sort</span><select id="nsort">${opts.map(([k, t]) => `<option value="${k}"${(S.k || '') === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>` +
        (S.k ? `<button class="chip" data-flip="1">${S.d === 1 ? 'usual order' : 'reversed'}</button>` : '') + `</div>`;
      return rule + sel + shown + `<div class="ncards">` + rows.map(r => `<div class="ncard"><div class="r1">${symLink(r)}${whyTag(r)}<span class="co">${esc(r.n)}</span>` +
        `<span class="npx num">${px(r.px)}</span></div>` +
        `<div class="r2 num"><span>5d <b class="${cc(r.r5)}">${pcS(r.r5)}</b></span><span>20d <b class="${cc(r.r20)}">${pcS(r.r20)}</b></span>` +
        `<span>biz <b>${int(r.biz)}</b></span><span>king ${kingHTML(r)}</span></div>` +
        `<div class="r3">${famChips(r)}<span class="muted nbd" title="${esc(famSplit(r))}">${plural(r.boards, 'board')}</span></div>` +
        `<div class="r4"><span>${esc(secName(r)) || DASH}</span>${themeTags(r)}<span class="muted">since ${sinceHTML(r)}</span>${links(r)}</div>` +
        (notesHTML(r) ? `<div class="r5">${notesHTML(r)}</div>` : '') + `</div>`).join('') + `</div>`;
    }
    const th = (k, cls = '', tip = '') => {
      const on = S.k === k;
      return `<th class="sortable ${cls}${on ? ' on' : ''}" data-k="${k}"${tipAttr(tip)}>${NSORT[k][0]}${on ? `<span class="ar">${S.d === 1 ? '▼' : '▲'}</span>` : ''}</th>`;
    };
    return rule + shown + `<div class="tw"><table class="grid nt"><thead><tr>` + th('s') + th('n') + th('sec') +
      th('fam', '', 'a family votes once however many of its boards flag the name; hover a chip for its boards') +
      th('boards', 'r', 'board flags in all') + th('px', 'r') + th('r5', 'r', 'move over the last 5 sessions') + th('r20', 'r', 'move over the last 20 sessions') +
      th('biz', 'r', 'business score 0-100') + th('king', '', 'the biggest options strike, its distance and expiry') + `<th>Notes</th>` + th('since', '', 'first session of the current run in this list') +
      `</tr></thead><tbody>` + rows.map(r => `<tr><td class="symc">${symLink(r)}${links(r)}${whyTag(r)}</td><td class="co"${tipAttr(r.n)}><div class="cut">${esc(r.n)}</div></td>` +
        `<td class="sc"${tipAttr(r.sector)}>${esc(secName(r))}${themeTags(r)}</td><td class="fams"><div class="fw">${famChips(r)}</div></td>` +
        `<td class="r num" title="${esc(famSplit(r))}">${int(r.boards)}</td><td class="r num">${px(r.px)}</td>` +
        `<td class="r num ${cc(r.r5)}" title="${esc(`1 day ${pcS(r.r1)} · 5 days ${pcS(r.r5)} · 20 days ${pcS(r.r20)}`)}">${pcS(r.r5)}</td><td class="r num ${cc(r.r20)}">${pcS(r.r20)}</td>` +
        `<td class="r num">${int(r.biz)}</td><td class="kg">${kingHTML(r, true)}</td><td class="nts"><div class="nw">${notesHTML(r)}</div></td><td class="snc">${sinceHTML(r, true)}</td></tr>`).join('') +
      `</tbody></table></div>`;
  }
  function ruleTxt(b) {
    const r = str(b.rule) ? b.rule : '', m = /^([^:]{2,60}):\s*(.+)$/.exec(r);
    const nm = String(b.name || '').toLowerCase();
    return m && nm && (m[1].toLowerCase().startsWith(nm) || nm.startsWith(m[1].toLowerCase())) ? m[2] : r;
  }
  function boardsHTML() {
    const bs = arr(N().boards).filter(b => b && b.id), c = obj(N().counts);
    if (!bs.length) return '';
    const cols = [{ h: 'Board' }, { h: 'Family' }, { h: 'Flags', sub: 'what counts' }, { h: 'Today', cls: 'r' }, { h: 'As of' }];
    const rows = bs.map(b => {
      const w = FAM[b.family] || [str(b.family) ? b.family : 'other', '', b.side];
      return { cls: b.status === 'ok' ? '' : 'dim', cells: [
        `${dotFor(b.status)}${ext(b.url, esc(b.name || b.id), 'lnk')}`,
        `<span class="fam ${esc(['bull', 'bear', 'setup'].includes(b.side) ? b.side : w[2])}">${esc(w[0])}</span>`, esc(ruleTxt(b)), int(b.n),
        `${day(b.as_of)}${b.status !== 'ok' ? ` <span class="st ${esc(b.status)}"${ok(b.lag) ? ` title="${plural(b.lag, 'session')} behind the board's session"` : ''}>${esc(STWORD[b.status] || 'unknown')}</span>` : ''}`] };
    });
    return `<details class="boards"><summary>How the lists are made · ${int(c.boards_ok)} of ${int(c.boards_total)} boards voting</summary>` +
      `<div class="defs">Each board's flag belongs to one family, and a family votes once however many of its boards flag the name. ` +
      `A board votes while it is current or one step past its usual delay (the options boards normally run one settle behind); a stale board does not vote.</div>${smallTable(cols, rows, 'brd')}</details>`;
  }
  function namesHTML() {
    const c = obj(N().counts);
    const head = `<div class="h2"><b>Names</b><span>${ok(c.flagged) ? `${int(c.flagged)} names flagged by at least one board · ` : ''}` +
      `${ok(c.boards_total) ? `${int(c.boards_ok)} of ${int(c.boards_total)} boards voting · ` : ''}a symbol opens its GEX Hunt chart when GEX Hunt carries it</span></div>`;
    return `<section id="sec-names">${head}<div class="nbar"><div id="names-tabs" class="ntabs" role="group" aria-label="Lists">${namesTabsHTML()}</div>` +
      `<input id="nq" type="search" placeholder="Search symbol, company, sector, family" value="${esc(S.q)}" autocomplete="off" spellcheck="false" aria-label="Search the names"></div>` +
      `<div id="names-list">${namesListHTML()}</div>${boardsHTML()}</section>`;
  }

  function deltaTxt(t, v) {
    if (!ok(v)) return DASH;
    switch (t.fmt) {
      case 'pct': return `${sgn(v, 1)} pts`;
      case 'ratio': return sgn(v, 3);
      case 'int': return sgn(v, 0);
      case 'price': return sgn(v, Math.abs(v) >= 100 ? 0 : 2);
      case 'num': return sgn(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
      default: return sgn(v, Math.abs(v) >= 100 ? 0 : 1);
    }
  }
  function tileNum(fmt, v) {
    if (!ok(v)) return DASH;
    switch (fmt) {
      case 'pct': return num(v, 1) + '%';
      case 'ratio': return num(v, 3);
      case 'int': return int(v);
      case 'price': return px(v);
      default: return num(v, Math.abs(v) >= 1000 ? 0 : 2);
    }
  }
  const tileValue = t => (str(t.text) ? esc(t.text) : tileNum(t.fmt, t.value));
  const PANEL = { gold: 'Nasdaq vs gold', comm: 'Nasdaq vs commodities', usd: 'S&P 500 vs the dollar' };
  const dayY = d => (year(d) && D && year(d) !== year(D.day) ? `${day(d)} ${year(d)}` : day(d));
  const TILE_EXTRA = {
    fear: e => [ok(e.alarm) ? `alarm line ${num(e.alarm, 1)}%` : '', ok(e.counted) ? `${int(e.counted)} stocks counted` : ''],
    panic: e => [e.armed === true ? `armed${ok(e.age) ? `, day ${int(e.age)}` : ''}` : e.armed === false ? 'not armed' : '',
                 str(e.latest_panic) ? `last panic day ${dayY(e.latest_panic)}` : '', str(e.confirmed) ? `last demand confirmation ${dayY(e.confirmed)}` : ''],
    putcall: e => [ok(e.pct) ? `higher than ${Math.round(e.pct)}% of past readings` : '',
                   ok(obj(e.spx).ratio) ? `SPX ${num(e.spx.ratio, 2)}${str(e.spx.zone) ? ` (${e.spx.zone})` : ''}` : ''],
    washout: e => [e.on === true ? `washout day ${int(e.day)}${str(e.since) ? ` since ${day(e.since)}` : ''}` : '', str(e.thrust_line) ? e.thrust_line : '',
                   str(e.cross) ? `${e.cross} cross${ok(e.cross_run) ? `, ${plural(e.cross_run, 'day')}` : ''}${e.cross_big === true ? ' (a big one)' : ''}` : ''],
    newlows: e => [ok(e.n) && ok(e.e) ? `${int(e.n)} of ${int(e.e)} listings` : ''],
    trendbreadth: e => [ok(e.down) ? `${num(e.down, 1)}% in down-trends` : ''],
    dipline: e => [e.forming === true && str(e.week) ? `the week of ${day(e.week)} is still open` : ''],
    aisemis: e => Object.values(obj(e.groups)).filter(g => g && typeof g === 'object' && str(g.name) && ok(g.v50)).map(g =>
      `${g.name} ${num(g.v50, 1)}%${g.wash === true && ok(g.day) ? ` (washout day ${int(g.day)})` : ''}${str(g.thrust) && g.thrust !== 'IDLE' ? `, thrust ${g.thrust}` : ''}`),
    'smart-money': e => [str(e.cross) ? `${e.cross} cross ${day(e.cross_day)}` : '',
                      str(e.div) ? `last divergence ${({ bear: 'bearish', bull: 'bullish' })[e.div] || e.div} ${day(e.div_day)}` : ''],
    dealer: e => [ok(e.flip) ? `flip ${px(e.flip)}` : '', ok(e.king) ? `biggest strike ${num(e.king, 0)}` : '', ok(e.call_wall) ? `call wall ${num(e.call_wall, 0)}` : '',
                  ok(e.put_wall) ? `put wall ${num(e.put_wall, 0)}` : '', ok(e.net_bn) ? `net ${sgn(e.net_bn, 1)}B` : ''],
    crossasset: e => arr(e.panels).filter(p => p && str(p.trend)).map(p => `${PANEL[p.key] || String(p.title || p.key || '').replace(/\s*:\s*/, ' vs ')} ${p.trend}`),
    inflation: e => arr(e.rows).slice(1).filter(r => r && str(r.label) && str(r.big)).map(r => `${r.label} ${r.big}${str(r.word) ? ' ' + r.word.toLowerCase() : ''}`),
    bitcoin: e => [ok(e.day_pct) ? `${pcP(e.day_pct)} on the day` : '', ok(e.fear) ? `fear ${num(e.fear, 1)}%` : ''],
    bubble: e => ['SPY', 'QQQ', 'SMH'].filter(s => ok(obj(e[s]).of)).map(s => `${s} ${int(e[s].pos)}/${int(e[s].of)}`),
  };
  function extraHTML(t) {
    let parts = [];
    try { parts = (TILE_EXTRA[t.id] ? TILE_EXTRA[t.id](obj(t.extra)) : []).filter(str); } catch (e) { parts = []; }
    return parts.length ? `<div class="tx">${parts.map(esc).join(SEP)}</div>` : '';
  }
  function tileHTML(t) {
    const tone = ['good', 'bad', 'warn', 'calm', 'neutral'].includes(t.tone) ? t.tone : 'neutral';
    const has = str(t.text) || ok(t.value);
    const sp = sparkSVG([{ pts: t.spark, color: '#9598a1', width: 1.4 }], { h: 34, label: `${t.name}, last six months`,
      tip: sparkTip(t.spark, v => tileNum(t.fmt, v)) });
    const held = !has && (arr(D && D.sources).find(s => s && s.id === TILESRC[t.id]) || {}).status === 'held';
    let asof = has ? day(t.as_of) : held ? 'held' : 'missing';
    if (ok(t.lag) && t.lag > 0) asof += ` · ${plural(t.lag, 'session')} behind`;
    const pct = ok(t.pct) ? `<div class="tp" title="today's reading against every day of this source's own history since 2013">above ${Math.round(t.pct)}% of days since 2013${meterSVG(t.pct)}</div>` : '';
    const dd = ok(t.d1) || ok(t.d5) ? `<div class="tdl num">1 day ${deltaTxt(t, t.d1)} · 5 days ${deltaTxt(t, t.d5)}</div>` : '';
    return `<div class="tile tone-${tone}${t.stale === true ? ' stale' : ''}" id="tile-${esc(t.id)}"><div class="thd">${ext(t.url, `${esc(t.name || t.id)}${str(t.url) ? ' ↗' : ''}`, 'tn', str(t.url) ? 'open its public tab' : '')}` +
      `<span class="ta${t.stale === true ? ' warn' : ''}">${asof}</span></div>` +
      `<div class="tv"><b>${tileValue(t)}</b><span class="twd">${esc(str(t.word) ? t.word : has || held ? '' : 'not in yet')}</span></div>` +
      pct + dd + (sp ? `<div class="tsp">${sp}</div>` : '') + extraHTML(t) + (str(t.about) ? `<div class="tabt">${esc(t.about)}</div>` : '') + `</div>`;
  }
  function weatherHTML() {
    const ts = tiles();
    const head = `<div class="h2"><b>Weather</b><span>${ts.length} readings from the other boards · green supportive, red against, amber stress, blue-grey calm · names marked ↗ open their public tab</span></div>`;
    if (!ts.length) return `<section id="sec-weather">${head}<div class="none">No weather tiles in this build.</div></section>`;
    const known = TILEGROUPS.map(g => g[0]);
    const groups = TILEGROUPS.concat(ts.some(t => !known.includes(t.group)) ? [['other', 'Other']] : []);
    return `<section id="sec-weather">${head}` + groups.map(([g, w]) => {
      const list = ts.filter(t => (g === 'other' ? !known.includes(t.group) : t.group === g));
      return list.length ? `<div class="wg"><div class="h3">${w}</div><div class="tiles">${list.map(tileHTML).join('')}</div></div>` : '';
    }).join('') + `</section>`;
  }

  const plain = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  function smallTable(cols, rows, cls = '', collapse = false) {
    if (!rows.length) return '';
    if (NARROW()) {
      return `<div class="kvs ${cls}">` + rows.map(r => {
        const vals = r.cells.slice(1).map(plain);
        if (collapse && vals.length && vals.every(v => v.startsWith(NONE))) {
          const open = (vals.join(' ').match(/([\d,]+) open/) || [])[1];
          return `<div class="kv kv1 ${r.cls || ''}"><div class="kvh">${r.cells[0]} <span class="muted">${NONE} until a window closes${open ? ` · ${open} open` : ''}</span></div></div>`;
        }
        return `<div class="kv ${r.cls || ''}"><div class="kvh">${r.cells[0]}</div>` +
          cols.slice(1).map((c, i) => `<div class="kvr"><span>${c.h}${c.sub ? ` <i>${c.sub}</i>` : ''}</span><b>${r.cells[i + 1]}</b></div>`).join('') + `</div>`;
      }).join('') + `</div>`;
    }
    return `<div class="tw"><table class="grid sm ${cls}"><thead><tr>` + cols.map(c => `<th class="${c.cls || ''}"${tipAttr(c.tip)}>${c.h}${c.sub ? `<div class="thsub">${c.sub}</div>` : ''}</th>`).join('') +
      `</tr></thead><tbody>` + rows.map(r => `<tr class="${r.cls || ''}">` + r.cells.map((x, i) => `<td class="${(cols[i] || {}).cls || ''}">${x}</td>`).join('') + `</tr>`).join('') + `</tbody></table></div>`;
  }
  const fwdFrom = () => (D && D.fwd_start ? `forward from ${day(D.fwd_start)}` : 'forward from the first freeze');
  const openTxt = o => (ok(o) && o > 0 ? `<span class="muted"> · ${int(o)} open</span>` : '');
  function scoreLight() {
    const sb = obj(SB().light), H = obj(L().history);
    const cols = [{ h: 'Light' }, { h: 'Days', cls: 'r' }, { h: 'Higher a week later', cls: 'r' }, { h: 'Higher a month later', cls: 'r' },
                  { h: 'Average month', cls: 'r', tip: 'SPY move over the next month' }];
    const rows = [];
    for (const st of STATES) {
      const f = obj(sb[st]);
      const n5 = ok(f.n5) ? f.n5 : 0;
      rows.push({ cls: 'fwd', cells: [`<span class="lw ${st}">${stateWord(st)}</span> <span class="muted">forward</span>`,
        `${n5 ? int(n5) : NONE}${openTxt(f.open)}`,
        n5 ? `${share(f.up5)} <span class="muted">· ${pcS(f.mean5, 2)}</span>` : NONE,
        ok(f.n21) && f.n21 ? `${share(f.up21)} <span class="muted">of ${int(f.n21)}</span>` : NONE,
        ok(f.n21) && f.n21 ? pcS(f.mean21, 2) : NONE] });
      for (const era of ['2021', '2013']) {
        const h = obj(obj(H[era])[st]);
        if (!ok(h.n)) continue;
        rows.push({ cls: 'hist', cells: [`<span class="lw ${st}">${stateWord(st)}</span> <span class="muted">since ${era}</span>`,
          `${int(h.n)} <span class="muted">· ${plural(h.episodes, 'run')}</span>`,
          share(h.up5), share(h.up21), `${pcS(h.mean21, 2)} <span class="muted">· middle ${pcS(h.med21, 2)}</span>`] });
      }
    }
    return box('Risk light', `SPY after each kind of day · ${fwdFrom()}`, smallTable(cols, rows, 'sbl', true));
  }
  function covCell(c) {
    c = obj(c);
    if (!(ok(c.n) && c.n > 0)) return `${NONE}${openTxt(c.open)}`;
    return `${share(c.cov)} <span class="muted">of ${int(c.n)}</span>${openTxt(c.open)}`;
  }
  function scoreRanges() {
    const sf = obj(SB().forecast);
    const cols = [{ h: 'Ticker' }, { h: 'Week', sub: '2 in 3', cls: 'r' }, { h: 'Week', sub: '9 in 10', cls: 'r' },
                  { h: 'Month', sub: '2 in 3', cls: 'r' }, { h: 'Month', sub: '9 in 10', cls: 'r' }];
    const rows = [];
    for (const t of tickers()) {
      const f = obj(obj(sf[t.s]).ranges), R = obj(obj(t.track).ranges);
      rows.push({ cls: 'fwd', cells: [`<b>${esc(t.s)}</b> <span class="muted">forward</span>`, covCell(obj(f['5'])['68']), covCell(obj(f['5'])['90']),
        covCell(obj(f['21'])['68']), covCell(obj(f['21'])['90'])] });
      const hc = (h, k, key) => { const x = obj(obj(obj(R[h])[k])[key]); return ok(x.cov) ? `${share(x.cov, 1)} <span class="muted">of ${int(x.n)}</span>` : NONE; };
      rows.push({ cls: 'hist', cells: [`<b>${esc(t.s)}</b> <span class="muted">since ${year(obj(t.track).from) || '2014'}</span>`, hc('5', '68', 'hist'), hc('5', '90', 'hist'), hc('21', '68', 'hist'), hc('21', '90', 'hist')] });
      rows.push({ cls: 'hist', cells: [`<b>${esc(t.s)}</b> <span class="muted">since 2021</span>`, hc('5', '68', 'hist21'), hc('5', '90', 'hist21'), hc('21', '68', 'hist21'), hc('21', '90', 'hist21')] });
    }
    return box('Forecast ranges', `share of closes that landed inside the range (aim: 68% and 90%) · ${fwdFrom()}`, smallTable(cols, rows, 'sbr', true));
  }
  function briCell(a, b, n, open) {
    if (!(ok(n) && n > 0) || !ok(a) || !ok(b)) return `${NONE}${ok(open) && open > 0 ? `<div class="sub2">${int(open)} open</div>` : ''}`;
    return `<span class="${a < b ? 'up' : a > b ? 'dn' : ''}">${a.toFixed(3)}</span> <span class="muted">vs ${b.toFixed(3)}</span>` +
      `<div class="sub2">${plural(n, 'day')}${ok(open) && open > 0 ? ` · ${int(open)} open` : ''}</div>`;
  }
  function scoreChances() {
    const sf = obj(SB().forecast);
    const cols = [{ h: 'Ticker' }, { h: '2% down day', sub: 'model vs normal', cls: 'r' }, { h: '5% dip', sub: 'model vs normal', cls: 'r' },
                  { h: 'Higher in a week', sub: 'like today vs normal', cls: 'r' }, { h: 'Higher in a month', sub: 'like today vs normal', cls: 'r' }];
    const rows = [];
    for (const t of tickers()) {
      const f = obj(sf[t.s]), ft = obj(f.tail), fo = obj(f.odds), tr = obj(t.track), tt = obj(tr.tail), to = obj(tr.odds);
      const tf = k => obj(ft[k]), of = h => obj(fo[h]);
      rows.push({ cls: 'fwd', cells: [`<b>${esc(t.s)}</b> <span class="muted">forward</span>`,
        briCell(tf('day_drop').brier, tf('day_drop').brier_base, tf('day_drop').n, tf('day_drop').open),
        briCell(tf('month_dip').brier, tf('month_dip').brier_base, tf('month_dip').n, tf('month_dip').open),
        briCell(of('5').brier_like, of('5').brier_normal, of('5').n, obj(obj(to['5']).fwd).open),
        briCell(of('21').brier_like, of('21').brier_normal, of('21').n, obj(obj(to['21']).fwd).open)] });
      const th = k => obj(obj(tt[k]).hist), oh = h => obj(obj(to[h]).hist);
      rows.push({ cls: 'hist', cells: [`<b>${esc(t.s)}</b> <span class="muted">since ${year(tr.from) || '2014'}</span>`,
        briCell(th('day_drop').brier, th('day_drop').brier_base, th('day_drop').n), briCell(th('month_dip').brier, th('month_dip').brier_base, th('month_dip').n),
        briCell(oh('5').brier_like, oh('5').brier_normal, oh('5').n), briCell(oh('21').brier_like, oh('21').brier_normal, oh('21').n)] });
    }
    return box('Chance scores', `average squared miss of each chance, lower is better; green = beat the plain base rate · ${fwdFrom()}`, smallTable(cols, rows, 'sbc', true));
  }
  function scoreNames() {
    const sn = obj(SB().names);
    const cols = [{ h: 'List' }, { h: 'Days', cls: 'r' }, { h: 'Names', cls: 'r', tip: 'name entries scored' },
                  { h: 'Average vs SPY', cls: 'r' }, { h: 'Beat SPY', cls: 'r' }];
    const rows = [];
    for (const b of TABS) {
      for (const h of ['5', '21']) {
        const x = obj(obj(sn[b])[h]);
        const closed = ok(x.entries) && x.entries > 0;
        rows.push({ cls: 'fwd', cells: [`<span class="lw ${b}">${TABWORD[b]}</span> <span class="muted">${h === '5' ? 'a week' : 'a month'}</span>`, `${closed ? int(x.days) : NONE}${openTxt(x.open)}`,
          closed ? int(x.entries) : NONE, closed ? `<span class="${cc(x.mean)}">${pcS(x.mean, 2)}</span>` : NONE, closed ? share(x.won) : NONE] });
      }
    }
    return box('Names vs SPY', `${fwdFrom()} · entered at the next session's close`, smallTable(cols, rows, 'sbn', true));
  }
  function scoreRotation() {
    const sr = obj(SB().rotation), cols = [{ h: 'Labels' }, { h: 'Closed', cls: 'r' }, { h: 'Average trade', cls: 'r' }, { h: 'Won', cls: 'r' }, { h: 'Open', cls: 'r' }];
    const row = (w, x, cls) => {
      x = obj(x);
      const c = ok(x.closed) && x.closed > 0;
      return { cls, cells: [w, c ? int(x.closed) : NONE, c ? `<span class="${cc(x.mean)}">${rpS(x.mean, 2)}</span>` : NONE, c ? won(x.won, x.closed).replace(/^won /, '') : NONE, int(x.open)] };
    };
    const rows = [row('Forward', sr.forward, 'fwd'), row('History', sr.history, 'hist')];
    const book = ok(sr.book_fwd) ? ` · forward book ${rpS(sr.book_fwd)}` : '';
    return box('Rotation labels', `Rotation Signals' own record: long every BUY, short every SELL, held a week${book}`, smallTable(cols, rows, 'sbo'));
  }
  const box = (t, sub, inner) => `<div class="sbox"><div class="sbh"><b>${t}</b><span>${esc(sub)}</span></div>${inner || '<div class="none">Nothing yet.</div>'}</div>`;
  function scoreHTML() {
    const sb = SB();
    const fs = sb.fwd_start || (D && D.fwd_start);
    const frozen = ok(sb.frozen_days) ? ` · ${plural(sb.frozen_days, 'frozen day')}${ok(sb.late_days) && sb.late_days > 0 ? ` (${int(sb.late_days)} frozen late)` : ''}` : '';
    const head = `<div class="h2"><b>Scoreboard</b><span>${fs ? `forward record from ${day(fs)} · ${plural(ok(sb.closed_days) ? sb.closed_days : 0, 'closed day')}${frozen}` : 'the forward record starts with the first frozen day'}` +
      ` · ${NONE} until a window closes · history rows carry their era</span></div>`;
    return `<section id="sec-score">${head}<div class="sgrid">${scoreLight()}${scoreRanges()}${scoreChances()}${scoreNames()}${scoreRotation()}</div></section>`;
  }

  const dotFor = st => `<i class="sd ${esc(STWORD[st] ? st : 'missing')}" title="${esc(STWORD[st] || st || 'unknown')}"></i>`;
  const lagTxt = l => (!ok(l) ? DASH : l < 0 ? '<span class="muted" title="dated after the board\'s session">ahead</span>' : int(l));
  function sourcesHTML() {
    const ss = sources(), c = sourceCounts();
    const extra = ['behind', 'stale', 'held', 'missing', 'error'].filter(k => c[k]).map(k => `${c[k]} ${STWORD[k]}`).join(' · ');
    const head = `<div class="h2"><b>Sources</b><span>${c.ok} of ${c.total} current${extra ? ' · ' + extra : ''} · behind = one session late, normal in the hours after a close</span></div>`;
    if (!ss.length) return `<section id="sec-sources">${head}<div class="none">No sources listed in this build.</div></section>`;
    const stTag = s => (s.status !== 'ok' ? ` <span class="st ${esc(s.status)}">${esc(STWORD[s.status] || 'unknown')}</span>` : '');
    const nameHTML = s => `${dotFor(s.status)}${ext(s.url, esc(srcName(s)), 'lnk')}`;
    if (NARROW()) {
      const parts = Object.keys(SRCKIND).concat([...new Set(ss.map(s => s.kind))].filter(k => !SRCKIND[k]));
      return `<section id="sec-sources">${head}` + parts.map(k => {
        const list = ss.filter(s => s.kind === k);
        if (!list.length) return '';
        return `<div class="h3">${esc(SRCKIND[k] || k || 'Other')}</div><div class="srcs">` + list.map(s => `<div class="srow${s.status === 'ok' ? '' : ' dim'}">` +
          `<span class="sn">${nameHTML(s)}${stTag(s)}</span><span class="sa">${day(s.as_of)}${ok(s.lag) && s.lag < 0 ? ' · ahead' : ok(s.lag) && s.lag > 0 && s.status !== 'ok' ? ` · ${int(s.lag)} behind` : ''}</span>` +
          (str(s.note) ? `<div class="snote">${esc(s.note)}</div>` : '') + `</div>`).join('') + `</div>`;
      }).join('') + `</section>`;
    }
    const cols = [{ h: 'Source' }, { h: 'Part' }, { h: 'As of' }, { h: 'Lag', cls: 'r', tip: 'sessions behind the board\'s session' }, { h: 'Note' }];
    const rows = ss.map(s => ({ cls: s.status === 'ok' ? '' : 'dim', cells: [`${nameHTML(s)}${stTag(s)}`,
      esc(SRCKIND[s.kind] || s.kind), day(s.as_of), lagTxt(s.lag), str(s.note) ? `<span class="note2">${esc(s.note)}</span>` : ''] }));
    return `<section id="sec-sources">${head}${smallTable(cols, rows, 'src')}</section>`;
  }
  function footHTML() {
    return `<div class="foot"><b>Risk light</b>: trend, volatility and breadth each read up, flat or down; mostly up is RISK-ON, mostly down RISK-OFF. ` +
      `<b>Ranges</b>: the inner band is set to hold 2 in 3 closes at that horizon and the outer 9 in 10; each card's last line and the ` +
      `scoreboard show how often they held. <b>Chances</b>: "normally" is how often the event happened on any day since 2021. ` +
      `<b>Higher</b>: the share of past days that closed higher a week or a month later, on all days and on days with today's light. ` +
      `<b>Names</b>: each board flag belongs to one family and a family votes once; each list's rule is shown above it. <b>Final</b>: ` +
      `the session's calls freeze at 09:25 ET on the next session and are scored from then on (the scoreboard).` +
      `<br><b>Fear meter, trend breadth and TET Radar</b>: Trend Emotion Timing (TET) by Dr. Oliver Reiss (NAAIM 2025). This is an ` +
      `independent re-implementation, not affiliated with or endorsed by the author or NAAIM. <b>Panic &amp; Demand</b>: Paul F. Desmond's ` +
      `90% Days, from his 2002 Charles H. Dow Award paper, rebuilt independently from stock-level closes and volumes; not a Lowry product.` +
      `<br>Market Command · rules v${esc(D && D.rules)} · data v${esc(D && D.version)} · ${esc(D && D.day ? `${day(D.day)} close` : '')}` +
      ` · built ${stamp(D && D.built_et)} · a new copy comes out when its readings change, at most every 15 minutes; this page checks for one every 5 minutes</div>`;
  }

  const MOOD = { on: 'Mostly strong and calm', mixed: 'Mixed readings', off: 'Mostly weak and stressed' };
  const PLAIN = new Map([
    ['trend', { up: 'the S&P 500 is in an uptrend', sideways: 'the S&P 500 has no clear trend', down: 'the S&P 500 is in a downtrend' }],
    ['vol', { calm: 'the VIX shows no short-term stress', normal: 'the VIX shows a little short-term stress', stressed: 'the VIX shows short-term stress' }],
    ['breadth', { broad: 'most S&P 500 stocks are above their 50-day average', mixed: 'about half of S&P 500 stocks are above their 50-day average',
                  weak: 'most S&P 500 stocks are below their 50-day average' }]]);
  const RPLAIN = [['buy', 'Buy', 'several signals rank it near the top, none near the bottom'], ['watch_up', 'Warming up', 'could turn into a buy'],
                  ['watch_out', 'Cooling off', 'could turn into a sell'], ['sell', 'Sell', 'several signals rank it near the bottom, none near the top']];
  const NPLAIN = [['buy', 'Buy candidates', 'several kinds of signal say up, none say down'],
                  ['watch', 'Watch', 'beaten down with signals saying up and none down, or the signals disagree'],
                  ['avoid', 'Avoid', 'several kinds of signal say down, none say up']];
  const GPLAIN = [['good', 'Supportive'], ['bad', 'Against'], ['warn', 'Stress signs'], ['calm', 'Calm']];
  function plainList(parts) {
    const p = parts.filter(str);
    if (!p.length) return '';
    const s = p.length === 1 ? p[0] : `${p.slice(0, -1).join(', ')} and ${p[p.length - 1]}`;
    return s[0].toUpperCase() + s.slice(1) + '.';
  }
  const tlMore = (id, w, ref) => `<button class="tl-more" data-jump="${id}"${ref ? ` data-ref="${ref}"` : ''}>${w} ›</button>`;
  const tlCard = (id, title, body, foot) => `<section class="tl-card" id="tl-${id}"><div class="tl-h">${esc(title)}</div>${body}` +
    (foot ? `<div class="tl-ft">${foot}</div>` : '') + `</section>`;
  function tlLight() {
    const l = L(), st = lightState();
    const says = plainList(arr(l.pillars).filter(p => p && PLAIN.has(p.id)).map(p => (str(p.word) &&
      Object.prototype.hasOwnProperty.call(PLAIN.get(p.id), p.word) ? PLAIN.get(p.id)[p.word]
      : `the ${String(p.name || p.id).toLowerCase()} reading is not in yet`)))
      || (st && str(l.text) ? l.text : '');
    const big = says || (st ? '' : 'The risk light has no reading for this session.');
    let when = '';
    if (st && str(l.since)) {
      when = l.since === (D && D.day) ? `New at the ${day(l.since)} close${STATES.includes(l.prev) && l.prev !== st ? ` (was ${stateWord(l.prev)})` : ''}`
        : `${stateWord(st)} since ${day(l.since)}`;
    }
    if (st && str(l.as_of) && D && l.as_of !== D.day) when = [when, `as of the ${day(l.as_of)} close`].filter(Boolean).join(' · ');
    const ts = tiles().filter(t => str(t.word) || str(t.text));
    const gauges = GPLAIN.map(([tone, w]) => {
      const list = ts.filter(t => t.tone === tone);
      return list.length ? `<div class="tl-g ${tone}"><b>${w}</b> ${list.map(t => `<span class="tl-gi">${esc(t.name || t.id)} <i>${esc(str(t.word) ? t.word : t.text)}` +
        `${t.stale === true && str(t.as_of) ? ` (as of ${day(t.as_of)})` : ''}</i></span>`).join(' ')}</div>` : '';
    }).join('');
    const body = `<div class="tl-pr ${st || 'none'}"><span class="lpill"><i></i>${esc(st ? stateWord(st) : 'NO LIGHT YET')}</span>` +
      (st ? `<span class="tl-mood">${MOOD[st]}</span>` : '') + `</div>` + (big ? `<div class="tl-big">${esc(big)}</div>` : '') +
      (when ? `<div class="tl-meta">${esc(when)}</div>` : '') + lightHistLine() + (gauges ? `<div class="tl-gs">${gauges}</div>` : '');
    return tlCard('light', `The market at the ${day(D && D.day)} close`, body, tlMore('light', 'The light and its three pillars') + tlMore('weather', 'Every gauge'));
  }
  function tlForecast() {
    const ts = tickers();
    const end = ts.map(t => obj(obj(t.h)['5']).end).find(str);
    const title = `Likely closing ranges ${end ? 'on ' + dayW(end) : 'next week'}`;
    if (!ts.length) return tlCard('forecasts', title, `<div class="none">No forecasts in this build.</div>`);
    const r0 = v => (ok(v) ? num(v, Math.abs(v) >= 100 ? 0 : 2) : DASH);
    const rows = ts.map(t => {
      const b = bandOf(t, '5', '90'), x = obj(obj(t.tail).day_drop), usual = obj(x.base)['2021'];
      const held = obj(obj(obj(obj(obj(t.track).ranges)['5'])['90']).hist21).cov;
      const cls = ok(x.p) && ok(usual) ? (x.p > usual * 1.15 ? 'hi' : x.p < usual * 0.87 ? 'lo' : '') : '';
      const own = obj(obj(t.h)['5']).end;
      const lag = str(t.day) && D && t.day !== D.day ? `<i class="tl-lag">as of ${day(t.day)}${str(own) && own !== end ? ` · to ${dayW(own)}` : ''}</i>` : '';
      return `<div class="tl-fr"><b class="tl-fs">${esc(t.s)}</b>` +
        `<span class="tl-rg num">${ok(b.lo) && ok(b.hi) ? `${r0(b.lo)} – ${r0(b.hi)}` : ok(b.lo_pct) && ok(b.hi_pct) ? `${pcP(b.lo_pct)} to ${pcP(b.hi_pct)}` : DASH}` +
        `${ok(t.close) || !str(t.day) ? `<i>close ${r0(t.close)}</i>` : ''}${lag}</span>` +
        `<span class="tl-held num">${ok(held) && (ok(b.lo) || ok(b.lo_pct)) ? share(held) : DASH}</span>` +
        `<span class="tl-dd num"><b class="${cls}">${chance(x.p)}</b><i>usually ${chance(usual)}</i></span></div>`;
    }).join('');
    const body = `<div class="tl-big">Each range is set to catch the closing price 9 times out of 10.</div>` +
      `<div class="tl-fg"><div class="tl-fr tl-fhd"><span></span><span>Range</span><span>Right</span><span>2% drop day</span></div>${rows}</div>` +
      `<div class="tl-def">Right: how often ranges like these caught the close, counted every session since 2021. 2% drop day: the chance ` +
      `that at least one of the next 5 sessions closes 2% or more below the session before; usually: how often that happened since 2021.</div>`;
    return tlCard('forecasts', title, body, tlMore('forecasts', 'Ranges, chances and charts'));
  }
  function tlRotation() {
    const R = ROT(), groups = arr(R.groups).filter(g => g && g.id);
    const title = 'Where the money is moving';
    if (!groups.length) return tlCard('rotation', title, `<div class="none">No rotation labels in this build.</div>`);
    const fresh = g => (g.prev && g.prev !== g.label && RWORD[g.prev]) || (!g.prev && str(g.since) && g.since >= (R.day || '9'));
    const lag = R.stale === true ? `<div class="tl-meta">${str(R.as_of) ? `as of the ${day(R.as_of)} close` : 'not in yet'}</div>` : '';
    const rows = RPLAIN.map(([id, w, hint]) => {
      const gs = groups.filter(g => g.label === id);
      const chips = gs.length ? gs.map(g => ext(rotUrl(g), `${esc(gName(g))}${str(g.etf) ? ` <i>${esc(g.etf)}</i>` : ''}` +
        `${fresh(g) ? ' <b class="tl-new">new</b>' : ''}`, 'tl-chip', groupTip(g))).join(' ') : `<span class="muted">none</span>`;
      return `<div class="tl-rr ${id}"><div class="tl-rl"><b>${w}</b><span>${hint}</span></div><div class="tl-rc">${chips}</div></div>`;
    }).join('');
    return tlCard('rotation', title, lag + rows, tlMore('rotation', 'Rotation details'));
  }
  function topSector(list) {
    if (list.length < 5) return '';
    const n = {};
    list.forEach(r => { const s = secName(r); if (s) n[s] = (n[s] || 0) + 1; });
    const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] / list.length < 0.4) return '';
    return best[1] * 2 > list.length ? `mostly ${best[0]} (${best[1]} of ${list.length})` : `${best[1]} of ${list.length} are ${best[0]}`;
  }
  function tlNames() {
    const c = obj(N().counts);
    const rows = NPLAIN.map(([b, w, hint]) => {
      const list = bucket(b), n = ok(c[b]) ? c[b] : list.length;
      const fresh = list.filter(r => r.new === true);
      const notes = [topSector(list), fresh.length && fresh.length < list.length && fresh.length <= 8
        ? `new at the ${day(D && D.day)} close: ${fresh.map(r => r.s).join(', ')}` : ''].filter(Boolean);
      const chips = list.length ? list.map(r => ext(obj(r.links).gex, esc(r.s), 'tl-chip tl-sym', `${r.n || r.s}${secName(r) ? ' · ' + secName(r) : ''}`)).join(' ')
        : `<span class="muted">none</span>`;
      return `<div class="tl-nr ${b}"><div class="tl-nl"><b>${w} <span class="tl-n">${int(n)}</span></b><span>${hint}</span></div>` +
        `<div class="tl-nc">${chips}</div>${notes.length ? `<div class="tl-nn">${esc(notes.join(' · '))}</div>` : ''}` +
        (list.length ? tlMore('names', 'Details', b) : '') + `</div>`;
    }).join('');
    return tlCard('names', 'Stocks to look at', rows);
  }
  function tlChanges() {
    const all = arr(D && D.changes).filter(c => c && str(c.text)), ch = all.filter(c => c.kind !== 'forecast');
    const title = `What changed since ${day(D && D.prev)}`;
    if (!all.length) return tlCard('changes', title, `<div class="none">Nothing changed since the ${day(D && D.prev)} session.</div>`);
    const top = ch.slice(0, 5);
    const body = top.length ? `<div class="tl-cl">${top.map(c => {
      const tone = ['good', 'bad'].includes(c.tone) ? c.tone : 'neutral';
      return `<div class="tl-ci ${tone}"><i>${tone === 'good' ? '▲' : tone === 'bad' ? '▼' : '•'}</i><span>${esc(c.text)}</span></div>`;
    }).join('')}</div>` : `<div class="none">Only the forecast ranges and odds moved.</div>`;
    return tlCard('changes', title, body, all.length > top.length ? tlMore('changes', `All ${all.length} changes`) : '');
  }
  function tlComing() {
    const ev = arr(D && D.coming).filter(e => e && str(e.what) && (e.kind === 'macro' || e.kind === 'fed')).slice(0, 3);
    const today = stampParts(D && D.built_et);
    const calOut = sources().some(s => (s.id === 'inflation' || s.id === 'vix') && s.status !== 'ok' && s.status !== 'behind');
    const body = ev.length ? `<div class="tl-ev">${ev.map(e => `<div class="tl-ei"><b>${esc(e.what)}</b><span>` +
      `${today && e.day === today.date ? '<span class="tdy">today</span> ' : ''}${esc(e.at_et)}</span></div>`).join('')}</div>`
      : `<div class="none">${calOut ? 'No releases to show: an economic calendar is not in.' : 'No Fed decision, jobs report, CPI, PPI or PCE in the next 5 sessions.'}</div>`;
    return tlCard('coming', 'Coming up', body, tlMore('coming', 'Full calendar'));
  }
  function simpleHTML() {
    if (!D) return '<div class="empty">Loading…</div>';
    const foot = `<div class="tl-foot">From the ${day(D.day)} close · built ${stamp(D.built_et)} · <button class="tl-more" data-view="full">Full board ›</button></div>`;
    return `<div id="tl" class="tl">${tlLight()}${tlForecast()}${tlRotation()}${tlNames()}${tlChanges()}${tlComing()}${foot}</div>`;
  }

  const SECTIONS = { hero: heroHTML, changes: changesHTML, forecasts: forecastHTML, rotation: rotationHTML, names: namesHTML,
                     weather: weatherHTML, scoreboard: scoreHTML, sources: sourcesHTML, foot: footHTML };
  function mainHTML() {
    if (!D) return '<div class="empty">Loading…</div>';
    return Object.values(SECTIONS).map(f => f()).join('');
  }

  function hashOf(st = S) {
    const p = [];
    if (st.v === 'simple') p.push('v=s');
    if (st.n !== 'buy') p.push('n=' + st.n);
    if (st.k) p.push('k=' + st.k, 'd=' + st.d);
    return p.length ? '#' + p.join('&') : '';
  }
  function readHash(hs) {
    const p = new URLSearchParams(String(hs || '').replace(/^#/, ''));
    S.v = p.get('v') === 's' ? 'simple' : 'full';
    S.n = p.get('n') || 'buy';
    S.k = p.get('k') || null;
    S.d = p.get('d') === '-1' ? -1 : 1;
    clean();
  }
  function syncHash() {
    const h = hashOf();
    if (h !== location.hash) {
      try { history.replaceState(null, '', h || location.pathname + location.search); } catch (e) { location.hash = h; }
    }
  }
  function go(ch) {
    Object.assign(S, ch);
    clean();
    if (!HAS_DOM) return;
    syncHash();
    renderNames();
  }
  function setView(v, fromLink) {
    if (v !== 'simple' && v !== 'full') return;
    const was = S.v;
    S.v = v;
    clean();
    if (!HAS_DOM) return;
    syncHash();
    if (was !== S.v) {
      render(!fromLink);
      if (!fromLink) { const b = $(`.vsw [data-view="${S.v}"]`); if (b && b.focus) b.focus(); }
    }
  }

  function renderBar() {
    if (!HAS_DOM) return;
    $('#bar').innerHTML = barHTML();
    const nv = $('#nav');
    if (nv && D) { if (S.v === 'simple') { if (nv.firstChild) nv.innerHTML = ''; } else if (!nv.firstChild) nv.innerHTML = navHTML(); }
  }
  function renderNames() {
    if (!HAS_DOM || !D) return;
    const t = $('#names-tabs'), l = $('#names-list');
    if (t) t.innerHTML = namesTabsHTML();
    if (l) l.innerHTML = namesListHTML();
    LASTNCARDS = NCARDS();
  }
  function render(top) {
    if (!HAS_DOM) return;
    const q = $('#nq'), focused = q && document.activeElement === q, caret = focused ? q.selectionStart : null;
    const bd = $('details.boards'), open = !!(bd && bd.open), y = top ? 0 : window.scrollY;
    renderBar();
    $('#main').innerHTML = S.v === 'simple' ? simpleHTML() : mainHTML();
    document.title = D && D.light && LWORD[D.light.state] ? `${LWORD[D.light.state]} · ${TITLE}` : TITLE;
    LASTNARROW = NARROW();
    LASTNCARDS = NCARDS();
    if (open) { const b2 = $('details.boards'); if (b2) b2.open = true; }
    if (ok(y) && typeof window.scrollTo === 'function') window.scrollTo(0, y);
    if (focused) { const q2 = $('#nq'); if (q2) { q2.focus(); try { q2.setSelectionRange(caret, caret); } catch (e) {  } } }
  }
  const GH = HAS_DOM && /(^|\.)github\.io$/i.test(location.hostname);
  const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/market-command-data/market-command/';
  let BASE = GH ? RAW : 'snap/';
  async function fetchJSON(name) {
    const one = async base => {
      const r = await fetch(`${base}${name}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-cache' });
      if (!r.ok) throw new Error(`${name} ${r.status}`);
      return r.json();
    };
    try { return await one(BASE); } catch (e) {
      if (BASE === RAW) throw e;
      const j = await one(RAW);
      BASE = RAW;
      return j;
    }
  }
  async function refresh() {
    LASTFETCH = Date.now();
    try { STATUS = await fetchJSON('status.json'); } catch (e) { STATUS = null; }
    if (D && STATUS && STATUS.built && STATUS.built === BUILT) { renderBar(); return; }
    try {
      const d = await fetchJSON('market-command.json');
      if (!D || d.built !== BUILT) { setData(d); render(); return; }
    } catch (e) {
      if (!D) { $('#main').innerHTML = `<div class="empty">Market Command could not be loaded just now (${esc(e.message)}). The page tries again every 5 minutes.</div>`; return; }
    }
    renderBar();
  }
  function jump(id, ref) {
    if (S.v === 'simple') setView('full', true);
    if (id === 'names' && TABS.includes(ref)) go({ n: ref });
    const el = document.getElementById('sec-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function bind() {
    document.addEventListener('click', e => {
      const v = e.target.closest('[data-view]');
      if (v) { e.preventDefault(); setView(v.dataset.view); return; }
      const j = e.target.closest('[data-jump]');
      if (j) { e.preventDefault(); jump(j.dataset.jump, j.dataset.ref); return; }
      if (e.target.closest('a[href]')) return;
      const n = e.target.closest('[data-n]');
      if (n) { go({ n: n.dataset.n }); return; }
      const k = e.target.closest('th[data-k]');
      if (k) {
        const key = k.dataset.k;
        if (S.k === key) go({ d: -S.d }); else go({ k: key, d: 1 });
        return;
      }
      if (e.target.closest('[data-flip]')) go({ d: -S.d });
    });
    document.addEventListener('input', e => { if (e.target.id === 'nq') { S.q = e.target.value; renderNames(); } });
    document.addEventListener('change', e => { if (e.target.id === 'nsort') go({ k: e.target.value || null, d: 1 }); });
    window.addEventListener('hashchange', () => {
      const was = S.v;
      readHash(location.hash);
      if (S.v !== was) render(true); else renderNames();
    });
    let rz = null;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { if (NARROW() !== LASTNARROW) render(); else if (NCARDS() !== LASTNCARDS) renderNames(); }, 150);
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - LASTFETCH > REFRESH_MS) refresh(); });
  }
  function showTab() {
    const t = $('nav.tabs'), a = t && t.querySelector('[aria-current=page]');
    if (a && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, a.offsetLeft - t.offsetLeft - (t.clientWidth - a.offsetWidth) / 2);
  }
  async function boot() {
    showTab();
    readHash(location.hash);
    bind();
    await refresh();
    setInterval(refresh, REFRESH_MS);
  }

  const API = { setData, state: S, clean, setState(ch) { Object.assign(S, ch); clean(); }, setStatus(st) { STATUS = st; },
                setWidth(w, narrow) { FORCE_W = w; FORCE_NARROW = narrow == null ? null : !!narrow; },
                SECTIONS, barHTML, navHTML, mainHTML, heroHTML, pillarHTML, changesHTML, comingHTML, forecastHTML, tickerHTML, rotationHTML,
                namesHTML, namesListHTML, namesTabsHTML, namesRows, boardsHTML, weatherHTML, tileHTML, scoreHTML, sourcesHTML, footHTML, simpleHTML,
                sparkSVG, rangeBarSVG, meterSVG, readHash, hashOf, NSORT, TABS,
                fmt: { num, sgn, pcS, pcP, rpS, px, chance, share, day, dayW, stamp, expTxt, distText } };
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  if (HAS_DOM) boot();
})();
