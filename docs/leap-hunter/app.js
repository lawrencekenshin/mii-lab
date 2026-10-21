
let D = null, ROWS = [], BUILT = null;
const NAMES = {};
const app = document.getElementById('app'), tt = document.getElementById('tt');
const MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const fmtD = s => { const [, m, d] = s.split('-'); return MON[+m - 1] + ' ' + (+d); };
const n0 = x => Math.round(x).toLocaleString('en-US');
const pct = x => { const v = Math.round(x * 100); return (v > 0 ? '+' : v < 0 ? '−' : x >= 0 ? '+' : '') + Math.abs(v) + '%'; };
const usd = x => {
  if (x == null) return '–';
  const a = Math.abs(x);
  if (a >= 1e9) return '$' + (x / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return '$' + (x / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M';
  if (a >= 1e3) return '$' + Math.round(x / 1e3) + 'K';
  return '$' + Math.round(x);
};
const sgn = x => !x ? '<span class="dim">0</span>'
  : x > 0 ? `<span class="up">▲${n0(x)}</span>` : `<span class="down">▼${n0(-x)}</span>`;
const px = s => s >= 1000 ? n0(s) : s.toFixed(2);
const expLong = e => `${MON[+e.slice(2, 4) - 1]} ${+e.slice(4, 6)}, 20${e.slice(0, 2)}`;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const since = () => fmtD(D.base_settle);

const PERS = [['t', 'Today'], ['w', '1 week'], ['a', 'Total']];
let PER = 'a';
const pAdd = p => PER === 't' ? p.add1 : PER === 'w' ? p.add5 : p.add;
const pPer = p => (PER !== 'a' && p.per && p.per[PER]) || null;
const pScore = p => PER === 'a' ? p.score : (pPer(p) ? pPer(p).sc : 0);
const pFresh = p => PER === 'a' ? p.fresh : (pPer(p) ? pPer(p).fr : 0);
const pFb = p => !!(PER === 'a' ? p.fb : pPer(p) && pPer(p).fb);
const pMo = p => -((p.mo && p.mo[PER]) || 1e9);
const pNew = p => PER === 'a' ? p.tags.includes('NEW LINE') : !!(pPer(p) && pPer(p).new);
const inPer = p => PER === 'a' || (pAdd(p) != null && pAdd(p) > 0);
const PD = () => D.periods || {};
const perWord = r => PER === 't' ? (PD().t ? `on ${fmtD(PD().t.day)}` : 'today') : PER === 'w' ? (PD().w ? `since ${fmtD(PD().w.since)}` : 'in 5 sessions') : `since ${sinceOf(r)}`;
const perTitle = () => PER === 't' ? 'today' : PER === 'w' ? 'this week' : `since ${since()}`;
const sinceOf = r => r && r.since ? fmtD(r.since) : since();
const sgn5 = x => x == null ? '<span class="dim">–</span>' : sgn(x);
const compact = () => innerWidth <= 720;
const spk = x => '×' + (x >= 100 ? n0(x) : x.toFixed(x >= 10 ? 0 : 1));




const nxOf = p => p.nx || 1;
const pileChip = (r, p) => `<span class="pile num" data-bx="${esc(r.sym)}|${p.K}|${p.exp}">${p.K}C<span class="e">${nxOf(p) > 1 ? `· ${p.nx} expiries` : p.expl}</span></span>`;
const pileSub = p => nxOf(p) > 1 && p.bs != null ? `<span class="sub2">biggest ${p.expl} ${Math.round(p.bs * 100)}%</span>` : '';
const pileTxt = p => nxOf(p) > 1 ? `${p.K}C · ${p.nx} exp` : `${p.K}C ${p.expl}`;
const gxOf = p => (p.gx && p.gx[PER]) || null;
const gxTxt = g => g.map((x, i) => `${x[1]}%${i ? '' : ' in'} ${x[2]}`).join(', ');
const gxHtml = (r, p) => { const g = gxOf(p); return g ? `<span class="sub2 gx w2" data-tip="${esc(`Of the contracts added to the ${p.K}C pile ${perWord(r)}, ${g.map(x => `${x[1]}% went into ${x[2]}`).join(' and ')}; the biggest expiry, ${p.expl}, took under half. Hover the pile for every expiry.`)}">${g.map((x, i) => `<span class="b2">${esc(`${x[1]}%${i ? '' : ' in'} ${x[2]}`)}</span>`).join(', ')}</span>` : ''; };
const PEND = {};
function nameFile(sym) {
  if (NAMES[sym]) return Promise.resolve(NAMES[sym]);
  return PEND[sym] || (PEND[sym] = nameRes(sym)
    .then(res => res.ok ? res.json() : null).then(j => { if (j) NAMES[sym] = j; return j; }).catch(() => null)
    .finally(() => { delete PEND[sym]; }));
}
const pmc = x => x == null ? '<span class="dim">–</span>' : !x ? '<span class="dim">0</span>' : `<span class="${x > 0 ? 'up' : 'down'}">${pm(x)}</span>`;
const BXW = [['t', '1 day', 5], ['w', '1 week', 4], ['a', 'Total', 3]];
const bxWhen = (r, k) => k === 't' ? (PD().t ? `on ${fmtD(PD().t.day)}` : '') : k === 'w' ? (PD().w ? `since ${fmtD(PD().w.since)}` : '') : `since ${sinceOf(r)}`;
function bxTable(r, p, cls = 'bxt') {
  const j = BXW.find(w => w[0] === PER)[2], top = Math.max(0, ...p.bx.map(x => x[j] || 0));
  return `<table class="${cls} num"><thead><tr><th class="l">Expiry</th><th>Held</th>${BXW.map(w => `<th class="${w[0] === PER ? 'on' : ''}">${w[1]}</th>`).join('')}</tr></thead><tbody>
    ${p.bx.map((x, i) => `<tr><td class="l">${x[1]}${i === 0 && p.bx.length > 1 ? ' <span class="dim">biggest</span>' : ''}</td><td>${n0(x[2])}</td>
      ${BXW.map(w => `<td class="${w[0] === PER ? 'on' : ''}${w[2] === j && top > 0 && x[j] === top ? ' top' : ''}">${pmc(x[w[2]])}</td>`).join('')}</tr>`).join('')}
    <tr class="sum"><td class="l">Pile</td><td>${n0(p.oi)}</td>${BXW.map(w => `<td class="${w[0] === PER ? 'on' : ''}">${pmc([p.add1, p.add5, p.add][['t', 'w', 'a'].indexOf(w[0])])}</td>`).join('')}</tr></tbody></table>`;
}
function bxTip(r, p) {
  const n = p.bx.length;
  return `<div class="bxh">${p.K}C${n > 1 ? ` sums ${n} expiries, all 180+ days out` : ` ${p.expl}: one expiry`}</div>${bxTable(r, p)}
    <div class="bxf">1 day ${bxWhen(r, 't')} · 1 week ${bxWhen(r, 'w')} · Total ${bxWhen(r, 'a')}</div>`;
}

const LENSES = [
  { id: 'unusual', name: '★ Most unusual', key: p => pScore(p), flt: p => p.big || p.pin,
    def: () => 'Score blends new money, the pile’s size for the name, how far above the price it sits, how much it stands out from the strikes next to it, and LEAP length. Big piles only (a pinned name’s at any size).' },
  { id: 'fresh', name: 'New money', key: p => pFresh(p), flt: p => pAdd(p) > 0,
    def: () => `Contracts added to the pile ${PER === 'a' ? `since the ${since()} settle` : perWord()} × today’s option price.` },
  { id: 'moon', name: 'Moonshots', key: p => pMo(p), flt: p => p.away >= 0.5,
    def: () => 'Piles that need the stock up 50% or more, by $ in the pile (fresh money counts extra).' },
  { id: 'big', name: 'Biggest $', key: p => p.prem,
    def: () => 'Money sitting in the pile: contracts × option price × 100.' },
  { id: 'rel', name: 'Biggest for its size', key: p => p.padv || 0, flt: p => p.padv != null,
    def: () => '$ in the pile ÷ the stock’s average daily $ volume.' },
];
const UNI = [['all', 'All'], ['spx', 'S&P 500'], ['ndx', 'Nasdaq 100'], ['etf', 'ETFs']];
const TEN = [['6m', '6m+', 180], ['1y', '1y+ LEAPs', 365], ['2y', '2y+', 730]];
const DIS = [['15', '15%+', .15], ['30', '30%+', .30], ['50', '50%+', .50], ['100', '2× +', 1.0]];
const KEYS = { v: 'board', l: 'unusual', u: 'all', t: '6m', d: '15', p: 'a', q: '', s: '', k: '', o: '', oa: '', g: '1y', r: '6m' };


const pm = x => (x > 0 ? '+' : x < 0 ? '−' : '') + n0(Math.abs(x));
const cpR = (c, p) => !p ? (c ? Infinity : null) : c / p;
const r1 = (x, dp = 1) => x >= 100 || (x >= 10 && dp < 2) ? n0(x) : x.toFixed(x >= 10 ? 1 : dp);
const rTxt = (r, dp = 1) => r >= 1 ? `${r1(r, dp)} : 1` : `1 : ${r1(1 / r, dp)}`;
const cpTxt = (c, p, dp = 1) => { const r = cpR(c, p); return r == null ? '–' : r === Infinity ? 'calls only' : rTxt(r, dp); };
const cpCls = (c, p) => { const r = cpR(c, p); return r == null ? 'dim' : r >= 2 ? 'cpc' : r < 1 ? 'cpp' : ''; };

const cpAdd = (r, k) => { const s = r.cpf0 && r.cpf0[k]; return s && r.cp ? r.cp.map((v, i) => v - s[i]) : null; };
const flowTxt = (c, p, dp = 1) => c > 0 && p > 0 ? rTxt(c / p, dp) : c > 0 ? 'calls only' : p > 0 ? 'puts only' : c || p ? 'both down' : 'no change';
const flowCls = (c, p) => c > 0 && p > 0 ? cpCls(c, p) : c > 0 ? 'cpc' : p > 0 ? 'cpp' : 'dim';
const addWords = a => `${pm(a[0])} calls · ${pm(a[1])} puts`;

function splitBar(c, p, cls = 'mbar') {
  const cc = Math.max(c || 0, 0), pp = Math.max(p || 0, 0);
  if (!(cc + pp)) return `<span class="${cls} none"></span>`;
  const sh = cc / (cc + pp) * 100;
  return `<span class="${cls}">${cc ? `<i class="c" style="flex:${sh.toFixed(2)}"></i>` : ''}${pp ? `<i class="p" style="flex:${(100 - sh).toFixed(2)}"></i>` : ''}</span>`;
}
function cpCell(r) {
  if (!r.cp) return '<span class="dim">–</span>';
  const [c, p, cl, pl] = r.cp, a = cpAdd(r, PER), w = perWord(r);
  const tip = `Open on ${r.sym}, ${fmtD(r.csettle || D.settle)} settle: ${n0(c)} calls · ${n0(p)} puts (${cpTxt(c, p)}), all expiries`
    + ` · 180+ days: ${n0(cl)} calls · ${n0(pl)} puts (${cpTxt(cl, pl)})${a ? ` · Added ${w}: ${addWords(a)} (${flowTxt(a[0], a[1])}; bar: green = calls added, red = puts added)` : ''}`;
  return `<span class="${cpCls(c, p)}" data-tip="${esc(tip)}">${cpTxt(c, p)}</span>`
    + (a ? `<span class="cpadd" data-tip="${esc(tip)}">${splitBar(a[0], a[1])}<span class="sub2">added <span class="${flowCls(a[0], a[1])}">${flowTxt(a[0], a[1])}</span></span></span>` : '');
}

const bizRank = (r, b) => b[2] == null ? 'left out' : `rank ${b[2]}`;
const bizPart = (r, b) => b[1] == null ? (b[0] === 'PEG' && r.bizpeg ? `n/a (${r.bizpeg})` : 'n/a')
  : b[0] === 'PEG' ? b[1].toFixed(2) : `${b[1] > 0 ? '+' : b[1] < 0 ? '−' : ''}${Math.abs(b[1]) >= 100 ? n0(Math.abs(b[1])) : Math.abs(b[1]).toFixed(1)}%`;
const bizTip = r => r.biz == null ? `No business score on file for ${r.sym}${r.lists.includes('etf') ? ' (ETF)' : ''}.`
  : `Business score ${r.biz} of 100 (vs the S&P 500 + Nasdaq 100${bizDay(r) ? `, ${fmtD(bizDay(r))}` : ''})`
    + (r.bizm ? ' · ' + r.bizm.map(b => `${b[0]} ${bizPart(r, b)} (${bizRank(r, b)})`).join(' · ') : '') + '';
const bizDay = r => r.bizd || D.biz_day;
const bizMeter = (v, cls = '') => `<span class="bzmeter ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span>`;
const bizCell = r => r.biz == null ? `<span class="dim" data-tip="${esc(bizTip(r))}">–</span>`
  : `<span class="bzc" data-tip="${esc(bizTip(r))}">${bizMeter(r.biz)}<b class="num">${r.biz}</b></span>`;


const SORTS = [
  { id: 'name', th: 'Name', l: 1, asc: 1, key: x => x.r.sym },
  { id: 'price', th: 'Price', key: x => x.r.S },
  { id: 'pile', th: 'Pile', l: 1, key: x => x.p.dte, tip: 'Sort by the pile’s biggest expiry: longest-dated first' },
  { id: 'needs', th: 'Needs', key: x => x.p.away },
  { id: 'oi', th: 'Contracts', key: x => x.p.oi },
  { id: 'add5', th: 'Last 5', n: 1, key: x => x.p.add5, tip: 'Contracts added to the pile over the last 5 sessions' },
  { id: 'build', th: 'Build', m: 1, key: x => pAdd(x.p) == null ? null : pAdd(x.p) / Math.max(x.p.oi, 1), tip: 'Sort by contracts added as a share of the pile' },
  { id: 'prem', th: '$ in pile', key: x => x.p.prem },
  { id: 'spike', th: 'Stands out', m: 1, key: x => x.p.spike },
  { id: 'cp', th: 'Calls : puts', key: x => x.r.cp ? cpR(x.r.cp[0], x.r.cp[1]) : null,
    tip: 'Every call vs every put open on the name, all expiries (hover a cell for the 180+ day split). Below: calls added ÷ puts added in the Today / 1 week / Total window, with a bar (green = calls added, red = puts added).' },
  { id: 'tags', th: 'Tags', l: 1, key: x => tagRank(x.p), tip: 'Sort by tag: new lines and building piles first, unwinding and old piles last' },
  { id: 'score', th: 'Score', key: x => pScore(x.p) },
  { id: 'biz', th: 'Business', z: 1, key: x => x.r.biz, tip: 'Business score 0–100 (growth, cash flow, PEG vs the S&P 500 + Nasdaq 100). Shown beside the pile score; the lenses rank piles on their own score.' },
];
const tagRank = p => (pNew(p) ? 40 : 0) + (p.tags.includes('BUILDING') ? 30 : 0)
  + (p.tags.includes('2X+') ? 5 : 0) - (p.tags.includes('OLD PILE') ? 20 : 0) - (p.tags.includes('UNWINDING') ? 30 : 0);
function sortRows(rows, st) {
  const S = SORTS.find(s => s.id === st.o);
  if (!S) return rows;
  const dir = (S.asc ? 1 : -1) * (st.oa ? -1 : 1);
  return rows.map(x => [x, S.key(x)]).sort((a, b) => {
    const u = a[1], v = b[1];
    if (u == null || v == null) return (u == null) - (v == null);
    return (typeof u === 'string' ? u.localeCompare(v) : u === v ? 0 : u < v ? -1 : 1) * dir;
  }).map(x => x[0]);
}

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1)), st = {};
  for (const [k, def] of Object.entries(KEYS)) st[k] = h.get(k) || def;
  if (!LENSES.some(l => l.id === st.l)) st.l = 'unusual';
  if (!TEN.some(x => x[0] === st.t)) st.t = '6m';
  if (!DIS.some(x => x[0] === st.d)) st.d = '15';
  if (!PERS.some(x => x[0] === st.p)) st.p = 'a';
  PER = st.p;
  if (!UNI.some(x => x[0] === st.u)) st.u = 'all';
  if (!GXW.some(x => x[0] === st.g)) st.g = '1y';
  if (!PXR.some(x => x[0] === st.r)) st.r = '6m';
  return st;
}
function go(patch) {
  const st = Object.assign(readHash(), patch), h = new URLSearchParams();
  for (const [k, def] of Object.entries(KEYS)) if (st[k] && st[k] !== def) h.set(k, st[k]);
  location.hash = h.toString();
}

const rollWords = p => (p.roll || []).map(x => `${fmtD(x.day)}: ${x.frm} lost ${n0(x.n)} the same session (a possible roll)`).join(' · ');
function tagsHtml(p) {
  const cls = { 'NEW LINE': 'new', 'BUILDING': 'bld', 'OLD PILE': 'old', 'UNWINDING': 'unw', '2X+': 'x2', 'NO BID': 'old', 'ROLL?': 'roll' };
  return p.tags.map(t => `<span class="tag ${cls[t] || ''}"${t === 'ROLL?' ? ` data-tip="${esc(rollWords(p))}"` : ''}>${t === '2X+' ? 'NEEDS 2×+' : t}</span>`).join('');
}
const rolledSub = p => '';
const listsHtml = r => r.lists.map(l => `<span class="lst">${{ spx: 'SPX', ndx: 'NDX', etf: 'ETF' }[l]}</span>`).join('')
  + (r.pin ? `<span class="lst" data-tip="Pinned: kept on the board whatever the size of its piles">PIN</span>` : '')
  + (r.cday ? `<span class="lst" data-tip="${esc(`Newest saved chain: the ${fmtD(r.cday)} close, open interest from the ${fmtD(r.csettle)} settle`)}">OI ${fmtD(r.csettle)}</span>` : '');

function passes(st, p) {
  const t = TEN.find(x => x[0] === st.t)[2], d = DIS.find(x => x[0] === st.d)[2];
  return p.dte >= t && p.away >= d && inPer(p);
}
function ranked(st) {
  const L = LENSES.find(l => l.id === st.l), q = st.q.toUpperCase(), out = [];
  for (const r of ROWS) {
    if (st.u !== 'all' && !r.lists.includes(st.u)) continue;
    if (q && !r.sym.startsWith(q)) continue;
    let best = null, bk = -Infinity;
    for (const p of r.piles) {
      if (!passes(st, p) || (L.flt && !L.flt(p))) continue;
      const k = L.key(p);
      if (k > bk) { bk = k; best = p; }
    }
    if (best) out.push({ r, p: best, k: bk });
  }
  out.sort((a, b) => b.k - a.k);
  return out;
}
function allPiles(st) {
  const out = [];
  for (const r of ROWS) {
    if (st.u !== 'all' && !r.lists.includes(st.u)) continue;
    for (const p of r.piles) if (passes(st, p)) out.push({ r, p });
  }
  return out;
}

function spark(v, w = 72, h = 22) {
  if (!v || v.length < 2) return '';
  const mx = Math.max(...v, 1), mn = Math.min(...v), lo = Math.max(0, mn - (mx - mn) * 0.15);
  const X = i => 1 + i * (w - 4) / (v.length - 1), Y = y => h - 2 - (y - lo) / Math.max(mx - lo, 1) * (h - 5);
  const pts = v.map((y, i) => `${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-label="open contracts by session">
    <polygon points="${X(0)},${h - 1} ${pts} ${X(v.length - 1)},${h - 1}" fill="#3987e5" fill-opacity=".18"/>
    <polyline points="${pts}" fill="none" stroke="#5598e7" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="${X(v.length - 1)}" cy="${Y(v[v.length - 1])}" r="2.4" fill="#86b6ef"/></svg>`;
}


const SHOW = 60;
function renderBoard(st) {
  const L = LENSES.find(l => l.id === st.l);
  const rows = ranked(st), ps = allPiles(st);
  const top = (arr, key, flt) => arr.filter(flt || (() => true)).sort((a, b) => key(b) - key(a))[0];
  const tU = top(ps, x => pScore(x.p), x => x.p.big);
  const tF = top(ps, x => pFresh(x.p));
  const tFar = top(ps, x => x.p.away, x => pFb(x.p));
  const newl = ps.filter(x => pNew(x.p) && x.p.big).sort((a, b) => b.p.prem - a.p.prem);
  const at = x => `data-s="${x.r.sym}" data-k="${x.p.K}|${x.p.exp}"`;
  const tile = (title, x, sub) => x ? `<div class="tile" ${at(x)}>
      <div class="t">${title}</div><div class="v">${x.r.sym} <span class="k">${x.p.K}C</span> <span class="dim" style="font-size:14px;font-weight:500">${nxOf(x.p) > 1 ? `${x.p.nx} expiries` : x.p.expl}</span></div>
      <div class="s">${sub(x)}</div></div>` : `<div class="tile"><div class="t">${title}</div><div class="v dim">–</div></div>`;
  const newTile = `<div class="tile" ${newl[0] ? at(newl[0]) : ''}>
      <div class="t">Brand-new lines ${perTitle()}</div><div class="v">${newl.length} <span class="dim" style="font-size:14px;font-weight:500">big piles</span></div>
      <div class="s">${newl.slice(0, 3).map(x => `${x.r.sym} ${pileTxt(x.p)}`).join(' · ') || '–'}</div></div>`;

  const head = `<header class="top"><div><h1>LEAP <span>Hunter</span></h1>
      <div class="sub">Far call piles on 6-month-plus options, 15%+ above the price</div></div>
      <div class="vint num">${n0(D.n_scanned)} names scanned · ${n0(D.n_names)} with far piles · ${n0(D.n_piles)} piles<br>
      Open interest from the ${fmtD(D.settle)} settle · prices at the ${fmtD(D.asof)} close · “added” = ${PER === 't' ? `contracts added by ${PD().t ? fmtD(PD().t.day) : 'the latest session'}’s trading` : PER === 'w' ? `since the ${PD().w ? fmtD(PD().w.since) : ''} settle (5 sessions)` : `since the ${since()} settle`}</div></header>`;
  const pers = `<div class="pers">${PERS.map(x => `<button class="per ${x[0] === PER ? 'on' : ''}" data-p="${x[0]}">${x[1]}</button>`).join('')}</div>`;
  const lenses = `<div class="lenses">${LENSES.map(l => `<button class="lens ${l.id === L.id ? 'on' : ''}" data-lens="${l.id}"><b>${l.name}</b></button>`).join('')}</div>
      <div class="def">${L.def()}</div>`;
  const chips = (lab, arr, cur, key) => `<div class="fg"><span class="lab">${lab}</span>${arr.map(a =>
    `<button class="chip ${a[0] === cur ? 'on' : ''}" data-${key}="${a[0]}">${a[1]}</button>`).join('')}</div>`;
  const filters = `<div class="filters">${chips('List', UNI, st.u, 'u')}${chips('Expiry', TEN, st.t, 't')}${chips('Above price', DIS, st.d, 'd')}
      <input class="search" id="q" placeholder="Find a ticker…" value="${esc(st.q)}" autocapitalize="characters" autocomplete="off"></div>`;
  const tiles = `<div class="tiles">
      ${tile(`Most unusual ${PER === 'a' ? 'now' : perTitle()}`, tU, x => `${pct(x.p.away)} away · ${sgn5(pAdd(x.p))} ${perWord(x.r)} · ${usd(x.p.prem)}`)}
      ${tile(`Biggest new money ${perTitle()}`, tF, x => `${sgn5(pAdd(x.p))} contracts ${perWord(x.r)} · ≈${usd(pFresh(x.p))} added`)}
      ${tile('Farthest big fresh bet', tFar, x => `needs ${pct(x.p.away)} · ${sgn5(pAdd(x.p))} contracts · ${usd(x.p.prem)}`)}
      ${newTile}</div>`;

  rows.forEach((x, i) => x.i = i + 1);
  const show = sortRows(rows, st).slice(0, SHOW);
  const tr = show.map(x => {
    const { r, p } = x;
    return `<tr ${at(x)}>
      <td class="rk num">${x.i}</td>
      <td class="l"><span class="sym">${r.sym}</span>${listsHtml(r)}<span class="nm">${esc(r.name || r.sector)}</span></td>
      <td class="num">${px(r.S)}</td>
      <td class="l">${pileChip(r, p)}${pileSub(p)}</td>
      <td class="num">${pct(p.away)}<span class="sub2 w2">${p.sig.toFixed(2)}σ&nbsp;· <span class="b2">${Math.round(p.pt * 100)}% odds</span></span></td>
      <td class="num">${n0(p.oi)}<span class="sub2 w2">${sgn5(pAdd(p))} <span class="b2">${perWord(r)}</span></span>${gxHtml(r, p)}${rolledSub(p)}</td>
      <td class="num hide-n">${sgn5(p.add5)}</td>
      <td class="hide-m">${spark(p.h)}</td>
      <td class="num">${usd(p.prem)}<span class="sub2 w2">${p.padv != null ? (p.padv * 100).toFixed(1) + '% <span class="b2">of day $vol</span>' : ''}</span></td>
      <td class="num hide-m">${spk(p.spike)}</td>
      <td class="num">${cpCell(r)}</td>
      <td class="l tags">${tagsHtml(p)}</td>
      <td class="num"><span class="bar"><i style="width:${Math.min(100, pScore(p))}%"></i></span>${Math.round(pScore(p))}</td>
      <td class="num bzcol">${bizCell(r)}</td></tr>`;
  }).join('');
  const arrow = s => st.o !== s.id ? '' : `<span class="ar">${(s.asc ? 1 : -1) * (st.oa ? -1 : 1) > 0 ? '▲' : '▼'}</span>`;
  const ths = `<th class="so ${st.o ? '' : 'on'}" data-o="" data-tip="Back to the lens order">#</th>` + SORTS.map(s =>
    `<th class="so${s.l ? ' l' : ''}${s.m ? ' hide-m' : ''}${s.n ? ' hide-n' : ''}${s.z ? ' bzcol' : ''}${st.o === s.id ? ' on' : ''}" data-o="${s.id}"${s.tip ? ` data-tip="${esc(s.tip)}"` : ''}>${s.th}${arrow(s)}</th>`).join('');
  const table = show.length ? `<div class="tscroll"><table class="board main"><thead><tr>${ths}</tr></thead><tbody>${tr}</tbody></table></div>`
    : `<div class="panel dim">No far pile matches these filters${st.q ? ` for “${esc(st.q)}”` : ''}.</div>`;
  const sortm = `<div class="sortm"><span class="lab">Sort</span><select id="so">
      <option value="">${esc(L.name)} order</option>${SORTS.map(s => `<option value="${s.id}"${st.o === s.id ? ' selected' : ''}>${s.th}${s.id === 'pile' ? ' (expiry)' : ''}</option>`).join('')}</select>
      ${st.o ? `<button class="chip" id="soa">${(SORTS.find(s => s.id === st.o) || {}).asc ? (st.oa ? 'Z→A' : 'A→Z') : (st.oa ? 'Lowest first' : 'Highest first')}</button>` : ''}</div>`;
  const cards = `<div class="cards">${sortm}${show.map(x => {
    const { r, p } = x;
    return `<div class="card" ${at(x)}>
      <div class="r1"><span><span class="dim num">${x.i}</span> <span class="sym">${r.sym}</span> <span class="dim num">${px(r.S)}</span></span>
        <span class="num"><span class="bar"><i style="width:${Math.min(100, pScore(p))}%"></i></span>${Math.round(pScore(p))}${r.biz != null ? ` <span class="bzk num">Biz ${r.biz}</span>` : ''}</span></div>
      <div class="r2 num">${pileChip(r, p)} needs ${pct(p.away)} · ${p.sig.toFixed(2)}σ · odds ${Math.round(p.pt * 100)}%</div>
      ${nxOf(p) > 1 && p.bs != null ? `<div class="r3 num">${p.nx} expiries summed · biggest ${p.expl} ${Math.round(p.bs * 100)}%</div>` : ''}
      <div class="r3 num">${n0(p.oi)} contracts · ${sgn5(pAdd(p))} ${perWord(r)}${gxOf(p) ? ` · <span class="gx">${gxTxt(gxOf(p))}</span>` : ''} · ${usd(p.prem)}</div>
      ${r.cp ? `<div class="r3 num">Calls : puts <span class="nw ${cpCls(r.cp[0], r.cp[1])}">${cpTxt(r.cp[0], r.cp[1])}</span>${cpAdd(r, PER) ? ` · added ${perWord(r)} <span class="nw">${splitBar(cpAdd(r, PER)[0], cpAdd(r, PER)[1], 'mbar il')} <span class="${flowCls(cpAdd(r, PER)[0], cpAdd(r, PER)[1])}">${flowTxt(cpAdd(r, PER)[0], cpAdd(r, PER)[1])}</span></span>` : ''}</div>` : ''}
      <div class="r3">${tagsHtml(p)}</div></div>`;
  }).join('')}</div>`;
  const foot = `<footer>Showing ${show.length} of ${rows.length} names on this view. Pile = all 180-day-plus call contracts at one strike, summed over every expiry: “60C · 7 expiries” spans 7 contract lines, “biggest Jan-28 36%” is the one holding the most, and hovering the pile lists each expiry’s contracts and its 1 day / 1 week / Total add. A gold line under the add (“76% in Jan-29”) means most of that window’s new contracts went into an expiry other than the biggest one.
      Needs = strike vs price; σ = that distance in the expiry’s own volatility over the time left; odds = the options’ own odds of the price touching the strike before expiry.
      Stands out = how many times bigger the pile is than the strikes next to it on the same expiry.
      Calls : puts = every call vs every put open on the name, all expiries; “added” = calls added ÷ puts added in the Today / 1 week / Total window, counting only series still open (expired weeklies are not closes); its bar is green for calls added, red for puts added (a side that fell shows as none).
      ROLL? = on the day the pile jumped, another call line on the same name traded and lost a similar number of contracts; shown for information, it doesn’t change new money or the score.
      Click a column header to sort (again to flip it); # keeps the rank on the lens. Built ${esc(builtTxt())}.</footer>`;
  app.innerHTML = head + pers + lenses + filters + tiles + table + cards + foot;

  app.querySelectorAll('[data-lens]').forEach(b => b.onclick = () => go({ l: b.dataset.lens, o: '', oa: '' }));
  app.querySelectorAll('th[data-o]').forEach(th => th.onclick = () => {
    const o = th.dataset.o;
    go(o && o === st.o ? { oa: st.oa ? '' : '1' } : { o, oa: '' });
  });
  const so = document.getElementById('so'), soa = document.getElementById('soa');
  so.onchange = () => go({ o: so.value, oa: '' });
  if (soa) soa.onclick = () => go({ oa: st.oa ? '' : '1' });
  for (const k of ['u', 't', 'd', 'p']) app.querySelectorAll(`[data-${k}]`).forEach(b => b.onclick = () => go({ [k]: b.dataset[k] }));
  app.querySelectorAll('[data-s]').forEach(el => el.onclick = () => go({ v: 'name', s: el.dataset.s, k: el.dataset.k }));
  const q = document.getElementById('q');
  q.onkeydown = e => { if (e.key === 'Enter') go({ q: q.value.trim().toUpperCase() }); };
  markOvf();
}
function markOvf() {
  app.querySelectorAll('.tscroll').forEach(b => {
    if (!b.querySelector('table.board.main')) return;
    const set = n => { for (let i = 1; i <= 5; i++) b.classList.toggle('f' + i, i <= n); }, fits = () => b.scrollWidth <= b.clientWidth + 1;
    let n = 0;
    set(0);
    while (b.clientWidth && !fits() && n < 5) set(++n);
    b.classList.toggle('ovf', !!b.clientWidth && !fits());
  });
}


const RAMP = ['#13294a', '#104281', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#b7d3f6'];
function heatSVG(r, p) {
  const ks = r.heat.k, ex = r.expl, z = r.heat.z, n = ks.length, m = ex.length;
  const rowH = Math.max(7, Math.min(17, 600 / n)), top = 30, left = 54, cw = Math.min(70, Math.max(44, 430 / m));
  const cmp = compact(), hw = left + cw * m, gap = cmp ? 0 : 22, pw = cmp ? 0 : 190, W = hw + gap + pw + (cmp ? 10 : 112), H = top + n * rowH + 26;
  const Y = i => top + (n - 1 - i) * rowH;
  let mx = 1; z.forEach(col => col.forEach(v => { if (v > mx) mx = v; }));
  const col = v => v <= 0 ? '#141a24' : RAMP[Math.min(RAMP.length - 1, Math.floor(Math.sqrt(v / mx) * (RAMP.length - 1) + 0.5))];
  const sum = ks.map((_, i) => z.reduce((a, c) => a + (c[i] || 0), 0)), smax = Math.max(...sum, 1);
  const pileI = ks.indexOf(p.K), kingI = ks.indexOf(r.king), mainJ = r.exps.indexOf(p.exp);
  let s = `<svg width="${W}" viewBox="0 0 ${W} ${H}" style="${cmp ? '' : 'max-width:100%;height:auto;'}display:block" role="img" aria-label="long-dated call open interest by strike and expiry">`;
  ex.forEach((e, j) => s += `<text x="${left + j * cw + cw / 2}" y="${top - 10}" fill="${j === mainJ ? '#ffd77a' : '#a9b0bc'}" font-size="11.5" text-anchor="middle" font-weight="${j === mainJ ? 650 : 400}">${e}</text>`);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const v = z[j][i] || 0;
    s += `<rect x="${left + j * cw + 1}" y="${Y(i) + 0.5}" width="${cw - 2}" height="${rowH - 1}" rx="1.5" fill="${col(v)}" data-tip="${ks[i]}C ${ex[j]} · ${n0(v)} contracts"/>`;
  }
  if (pileI >= 0) for (let j = 0; j < m; j++) {
    if (!(z[j][pileI] > 0)) continue;
    s += `<rect x="${left + j * cw + 1}" y="${Y(pileI) + 0.5}" width="${cw - 2}" height="${rowH - 1}" rx="1.5" fill="none" stroke="#f0b429" stroke-width="${j === mainJ ? 2.2 : 1}" pointer-events="none"/>`;
  }
  let yS = null;
  for (let i = 0; i < n - 1; i++) if (ks[i] <= r.S && r.S <= ks[i + 1]) yS = Y(i) + rowH / 2 - (r.S - ks[i]) / (ks[i + 1] - ks[i]) * rowH;
  if (yS == null) yS = r.S < ks[0] ? Y(0) + rowH : Y(n - 1);
  s += `<line x1="${left - 4}" x2="${hw + gap + pw}" y1="${yS}" y2="${yS}" stroke="#e8eaed" stroke-dasharray="4 3" stroke-width="1.2"/>`;
  const lab = [], used = [yS + 4];
  const put = (i, txt, colr, w) => { const y = Y(i) + rowH / 2 + 4; if (used.some(u => Math.abs(u - y) < 12)) return; used.push(y); lab.push(`<text x="${left - 7}" y="${y}" fill="${colr}" font-size="11" text-anchor="end" font-weight="${w}">${txt}</text>`); };
  lab.push(`<text x="${left - 7}" y="${yS + 4}" fill="#e8eaed" font-size="11" text-anchor="end" font-weight="650">${px(r.S)}</text>`);
  if (pileI >= 0) put(pileI, ks[pileI], '#ffd77a', 700);
  if (kingI >= 0 && kingI !== pileI) put(kingI, ks[kingI], '#e8eaed', 600);
  const every = Math.max(1, Math.ceil(13 / rowH));
  for (let i = 0; i < n; i += every) put(i, ks[i], '#6f7787', 400);
  s += lab.join('');
  const px0 = hw + gap;
  if (!cmp) s += `<text x="${px0}" y="${top - 10}" fill="#a9b0bc" font-size="11.5">All long-dated expiries</text>`;
  const topIdx = sum.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(x => x[1]);
  if (!cmp) sum.forEach((v, i) => {
    if (!v) return;
    const w = Math.max(2, v / smax * pw), isP = i === pileI;
    s += `<rect x="${px0}" y="${Y(i) + 1}" width="${w}" height="${Math.max(2, rowH - 2)}" rx="2" fill="${isP ? '#f0b429' : '#3987e5'}" fill-opacity="${isP ? 1 : .75}" data-tip="${ks[i]}C · ${n0(v)} contracts, all long-dated expiries"/>`;
    if (isP || topIdx.includes(i) || i === kingI)
      s += `<text x="${px0 + w + 5}" y="${Y(i) + rowH / 2 + 4}" fill="${isP ? '#ffd77a' : '#a9b0bc'}" font-size="11">${n0(v)}${i === kingI ? ' · king' : ''}</text>`;
  });
  s += `<text x="${left}" y="${H - 6}" fill="#6f7787" font-size="11">${cmp ? `Dashed = price ${px(r.S)} · gold = the pile · tap a cell` : `Dashed line = price ${px(r.S)} · gold outline = the pile (thick = its biggest expiry) · king = biggest call gamma strike`}</text>`;
  return s + '</svg>';
}

function buildSVG(p) {
  const h = p.hist, n = h.length, W = 560, H = 230, l = 58, rt = 12, t = 26, b = 26;
  const mx = Math.max(...h.map(x => x[1]), 1), bw = (W - l - rt) / Math.max(n, 1);
  const Y = v => t + (1 - v / mx) * (H - t - b);

  const bh = p.bx && p.bx.length > 1 && p.bxh && p.bxh.length === n ? p.bxh : null, lab = p.bx ? p.bx.map(x => x[1]) : [];
  const split = i => !bh || !i ? [] : bh[i].map((v, j) => [v - bh[i - 1][j], j]).filter(z => z[0]).sort((a, c) => Math.abs(c[0]) - Math.abs(a[0]));
  let s = `<svg width="${W}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;display:block" role="img" aria-label="pile open contracts by session">`;
  for (let g = 0; g <= 2; g++) {
    const v = mx * g / 2, y = Y(v);
    s += `<line x1="${l}" x2="${W - rt}" y1="${y}" y2="${y}" stroke="#232a38"/><text x="${l - 6}" y="${y + 4}" fill="#6f7787" font-size="10.5" text-anchor="end">${n0(v)}</text>`;
  }
  const jumps = h.map((x, i) => [i ? x[1] - h[i - 1][1] : 0, i]).sort((a, c) => c[0] - a[0]).slice(0, 2).filter(x => x[0] > 0.05 * mx).map(x => x[1]);
  const placed = [];
  h.forEach((x, i) => {
    const y = Y(x[1]), d = i ? x[1] - h[i - 1][1] : 0, sp = split(i), x0 = l + i * bw + 1, w = Math.max(1, bw - 2);
    const where = sp.length ? ` (${sp.slice(0, 3).map(z => `${lab[z[1]]} ${pm(z[0])}`).join(', ')}${sp.length > 3 ? ', …' : ''})` : '';
    const tip = `${fmtD(x[0])} · ${n0(x[1])} open${bh ? ` (${lab[0]} ${n0(bh[i][0])})` : ''} · ${d >= 0 ? '+' : ''}${n0(d)} vs prior${where} · ${n0(x[2])} traded`;
    if (bh) {
      const yb = Y(bh[i][0]);
      s += `<rect x="${x0}" y="${y}" width="${w}" height="${Math.max(0, H - b - y)}" rx="2" fill="#6da7ec" data-tip="${esc(tip)}"/>`
        + `<rect x="${x0}" y="${yb}" width="${w}" height="${Math.max(0, H - b - yb)}" rx="2" fill="#1c5cab" pointer-events="none"/>`;
    } else s += `<rect x="${x0}" y="${y}" width="${w}" height="${Math.max(0, H - b - y)}" rx="2" fill="#3987e5" data-tip="${esc(tip)}"/>`;
    const rl = (p.roll || []).find(z => z.shows === x[0]);
    if (jumps.includes(i) || rl) {
      const el = sp.length && sp[0][1] !== 0 && sp[0][0] >= 0.5 * d ? ` ${lab[sp[0][1]]}` : '';
      const txt = `+${n0(d)}${el}${rl ? ' roll?' : ''}`, tw = txt.length * 5.9, cx = l + i * bw + bw / 2;
      const anc = cx + tw / 2 > W - rt ? 'end' : cx - tw / 2 < l ? 'start' : 'middle', tx = anc === 'end' ? x0 + w : anc === 'start' ? x0 : cx;
      const x1 = anc === 'end' ? tx - tw : anc === 'start' ? tx : tx - tw / 2;
      let ty = y - 5;
      while (placed.some(z => x1 < z[1] && z[0] < x1 + tw && Math.abs(z[2] - ty) < 12)) ty -= 12;
      placed.push([x1, x1 + tw, ty]);
      s += `<text x="${tx}" y="${Math.max(10, ty)}" fill="${rl ? '#c4bcff' : '#26a69a'}" font-size="10.5" text-anchor="${anc}">${txt}</text>`;
    }
    if (i === 0 || i === n - 1 || (i % 3 === 0 && i < n - 2)) s += `<text x="${l + i * bw + bw / 2}" y="${H - 8}" fill="#6f7787" font-size="10.5" text-anchor="middle">${fmtD(x[0])}</text>`;
  });
  return s + '</svg>' + (bh ? `<div class="legend" style="margin:2px 0 0"><span><i style="background:#1c5cab"></i>${lab[0]} (biggest)</span><span><i style="background:#6da7ec"></i>the other ${p.bx.length - 1} expir${p.bx.length > 2 ? 'ies' : 'y'}</span></div>` : '');
}
function bxPanel(r, p) {
  if (!p.bx) return '';
  const n = p.bx.length, w = BXW.find(x => x[0] === PER), a = [p.add1, p.add5, p.add][['t', 'w', 'a'].indexOf(PER)], g = gxOf(p);
  const line = n < 2 ? `One expiry: this pile is the ${p.expl} ${p.K}C contract line.`
    : `The pile sums ${n} expiries at ${p.K}. ${w[1]} (${bxWhen(r, PER)}): ${a == null ? 'no session on file that far back' : `${pm(a)} contracts`}${g && a != null
      ? `; ${g.map((x, i) => `${x[1]}%${i ? '' : ' of the contracts added went'} into ${x[2]}`).join(' and ')}, while the biggest expiry, ${p.expl}, ${(v => v > 0 ? `got ${pm(v)}` : v < 0 ? `lost ${n0(-v)}` : 'was flat')(p.bx[0][w[2]])}` : ''}.`;
  return `<div class="bxsec"><div class="ph" style="margin:12px 0 4px"><b class="bxti">${p.K}C by expiry</b> ${line}</div>${bxTable(r, p, 'bxt wide')}</div>`;
}


const GXW = [['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['1y', '1Y+']];
const PXR = [['3m', '3M', 63], ['6m', '6M', 126], ['1y', '1Y', 252]];
const gUsd = v => v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + usd(Math.abs(v));
const kS = k => String(Math.round(k * 100) / 100);
const GC = { king: '#f5d63d', call: '#26a69a', put: '#ef5350', flip: '#c3c8d2', price: '#2962ff', pile: '#f0b429' };
function niceStep(range, n) {
  const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(x => x >= raw) || 10 * p;
}
function gexWin(r, st) {
  const want = (GXW.find(x => x[0] === st.g) || GXW[3])[1], H = (r.gex && r.gex.h) || {}, ord = GXW.map(x => x[1]), i = ord.indexOf(want);
  const pick = ord.slice(i).concat(ord.slice(0, i).reverse()).find(w => H[w]);
  return [pick || want, pick ? H[pick] : null, want];
}
const gxWidth = () => Math.round(Math.max(280, Math.min(1560, (app.clientWidth || 900) - (compact() ? 24 : 40) - 30)));
let GXLAST = {}, TXC = null;
function textW(t, bold) {
  try {
    if (!TXC) TXC = document.createElement('canvas').getContext('2d');
    TXC.font = `${bold ? 700 : 600} 11px ${getComputedStyle(document.body).fontFamily}`;
    return Math.ceil(TXC.measureText(t).width) + 16;
  } catch (e) { return t.length * 7 + 16; }
}
function gexSVG(r, p, st) {
  const all = (r.ohlc && r.ohlc.b) || [];
  GXLAST = {};
  if (!all.length) return '<div class="dim" style="padding:20px 0">No daily price history on file for this name.</div>';
  const [win, lv] = gexWin(r, st), S0 = r.gex ? r.gex.S : r.S, cmp = compact();
  const W = gxWidth(), H = cmp ? 390 : 480, padR = 62, cw = W - padR, narrow = W < 700;
  const cx1 = Math.round(cw * (narrow ? 0.56 : 0.54)), bx0 = cx1 + (narrow ? 8 : 14);
  const O = all.slice(-(PXR.find(x => x[0] === st.r) || PXR[1])[2]);


  const cLo = Math.min(...O.map(b => b[3]), S0), cHi = Math.max(...O.map(b => b[2]), S0);
  const room = Math.max(cHi - cLo, S0 * 0.02) / (0.55 * 1.11);
  let lo = cLo, hi = cHi;
  const cand = lv ? [lv.k, lv.cw, lv.pw, lv.f] : [];
  if (p && p.K <= S0 * 2) cand.push(p.K);
  if (lv) cand.push(...lv.big.pos.slice(0, 3).map(b => b[0]).filter(k => k <= S0 * 1.5), ...lv.big.neg.slice(0, 3).map(b => b[0]).filter(k => k >= S0 / 1.5));
  cand.forEach(k => { if (k != null && Math.max(hi, k) - Math.min(lo, k) <= room) { lo = Math.min(lo, k); hi = Math.max(hi, k); } });
  const span = (hi - lo) || S0 * 0.02; lo -= span * 0.05; hi += span * 0.06;
  const top = 8, bot = H - 24, y = v => top + (hi - v) / (hi - lo) * (bot - top), on = k => k != null && k > lo && k < hi;
  const pileOn = !!p && on(p.K), kOn = !!lv && on(lv.k);
  const lvOf = k => !lv || !p || p.K !== k ? null : k === lv.k ? 'k' : k === lv.cw ? 'cw' : k === lv.pw ? 'pw' : null;
  const pileAt = lvOf(p && p.K);


  const pileW = sh => !p ? '' : sh > 1 ? ' = PILE' : sh ? ` = PILE ${p.K}C` : ` = PILE ${p.K}C · ${n0(p.oi)}`;
  const wallW = (k, sh) => !lv ? '' : sh > 1 ? (k === lv.cw && k === lv.pw ? ' CW+PW' : k === lv.cw ? ' CW' : k === lv.pw ? ' PW' : '')
    : (k === lv.cw && k === lv.pw ? ' · CALL + PUT WALL' : k === lv.cw ? ' · CALL WALL' : k === lv.pw ? ' · PUT WALL' : '');
  const kTxt = sh => sh > 1 ? `K ${kS(lv.k)}` : sh ? `KING ${kS(lv.k)}` : `KING ${kS(lv.k)} ${pct(lv.k / S0 - 1)} · ${gUsd(lv.kg)}`;
  const cwTxt = sh => `${sh > 1 ? 'CW' : 'CALL WALL'} ${kS(lv.cw)}${lv.cw === lv.pw ? (sh > 1 ? '+PW' : ' + PUT') : ''}`;
  const pwTxt = sh => `${sh > 1 ? 'PW' : 'PUT WALL'} ${kS(lv.pw)}`;
  const pileTxt = sh => sh > 1 ? `PILE ${p.K}C` : sh ? `PILE ${p.K}C ${pct(p.away)}` : `PILE ${p.K}C ${pct(p.away)} · ${nxOf(p) > 1 ? `${p.nx} expiries` : p.expl} · ${n0(p.oi)}`;
  const ST = { king: { fill: GC.king, ink: '#131722', bold: 1 }, cw: { fill: '#16302d', ink: '#9fe0d6', stroke: '#2f6f66' },
    pw: { fill: '#3a1d1f', ink: '#f3a5a3', stroke: '#8a3b39' }, f: { fill: '#1b2130', ink: '#d6dae2', stroke: '#6f7787', dash: 1 },
    pile: { fill: '#2a2310', ink: '#ffd77a', stroke: GC.pile, dash: 1 } };
  const withPile = (st, on) => on ? Object.assign({}, st, { stroke: GC.pile, dash: 1 }) : st;
  const pills = [], pill = (v, txt, st) => pills.push(Object.assign({ v, txt }, st));
  if (lv) {
    if (kOn) pill(lv.k, sh => kTxt(sh) + wallW(lv.k, sh) + (pileAt === 'k' ? pileW(sh) : ''), withPile(ST.king, pileAt === 'k'));
    if (lv.cw != null && lv.cw !== lv.k && on(lv.cw)) pill(lv.cw, sh => cwTxt(sh) + (pileAt === 'cw' ? pileW(sh) : ''), withPile(ST.cw, pileAt === 'cw'));
    if (lv.pw != null && lv.pw !== lv.k && lv.pw !== lv.cw && on(lv.pw)) pill(lv.pw, sh => pwTxt(sh) + (pileAt === 'pw' ? pileW(sh) : ''), withPile(ST.pw, pileAt === 'pw'));
    if (on(lv.f)) pill(lv.f, sh => `${sh > 1 ? 'F' : 'FLIP'} ${kS(lv.f)}`, ST.f);
  }
  if (pileOn && !pileAt) pill(p.K, pileTxt, ST.pile);
  let ll = narrow ? 2 : 0;
  const fit = () => { pills.forEach(q => { q.t = q.txt(ll); q.w = textW(q.t, q.bold); }); return pills.every(q => cw - q.w - 6 >= bx0 + 120); };
  while (!fit() && ll < 2) ll++;
  GXLAST.short = ll === 2 && pills.length > 0;

  const bx1 = Math.max(bx0 + (narrow ? 50 : 120), Math.min(cw - (narrow ? 66 : 200), cw - 10 - Math.max(0, ...pills.map(q => q.w))));
  const spread = (L, g) => {
    L.forEach(q => q.y = Math.max(top + 9, Math.min(bot - 9, y(q.v)))); L.sort((a, b) => a.y - b.y);
    for (let i = 1; i < L.length; i++) if (L[i].y - L[i - 1].y < g) L[i].y = L[i - 1].y + g;
    const o = L.length ? L[L.length - 1].y - (bot - 9) : 0;
    if (o > 0) L.forEach(q => q.y = Math.max(top + 9, q.y - o));
  };
  let s = `<svg data-w="${W}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;display:block;font-variant-numeric:tabular-nums" role="img" aria-label="${esc(r.sym)} daily price with GEX levels">`;

  const tags = [];
  if (kOn) tags.push({ v: lv.k, t: kS(lv.k) + (pileAt === 'k' ? ' P' : ''), fill: GC.king, ink: '#131722', bold: 1 });
  if (pileOn && pileAt !== 'k') tags.push({ v: p.K, t: kS(p.K), fill: '#2a2310', ink: '#ffd77a', stroke: GC.pile });
  tags.push({ v: S0, t: px(S0), fill: GC.price, ink: '#fff' });
  spread(tags, 18);
  const stp = niceStep(hi - lo, cmp ? 6 : 9), fx = v => v.toFixed(stp < 0.1 ? 2 : stp < 1 ? (stp * 10 % 1 ? 2 : 1) : stp % 1 ? 1 : 0);
  for (let v = Math.ceil(lo / stp) * stp; v < hi; v += stp) {
    s += `<line x1="0" x2="${cw}" y1="${y(v)}" y2="${y(v)}" stroke="#1d2330"/>`;
    if (tags.every(t => Math.abs(t.y - y(v)) > 16)) s += `<text x="${cw + 7}" y="${y(v) + 4}" fill="#6f7787" font-size="11">${fx(v)}</text>`;
  }
  s += `<line x1="${cw}" x2="${cw}" y1="0" y2="${bot}" stroke="#262d3b"/><line x1="${bx0}" x2="${bx0}" y1="${top}" y2="${bot}" stroke="#262d3b"/>`;

  const cwid = cx1 / O.length, bw = Math.min(14, Math.max(1, cwid * 0.7));
  GXLAST.line = cwid < 1.4;
  if (GXLAST.line) s += `<polyline points="${O.map((b, i) => `${(i * cwid + cwid / 2).toFixed(1)},${y(b[4]).toFixed(1)}`).join(' ')}" fill="none" stroke="#d6dae2" stroke-width="1.4" stroke-linejoin="round"/>`;
  else O.forEach((b, i) => { const [, o, h, l, c] = b, x = i * cwid + cwid / 2, col = c >= o ? '#26a69a' : '#ef5350';
    s += `<line x1="${x}" x2="${x}" y1="${y(h)}" y2="${y(l)}" stroke="${col}"/><rect x="${x - bw / 2}" y="${y(Math.max(o, c))}" width="${bw}" height="${Math.max(1, Math.abs(y(o) - y(c)))}" fill="${col}"/>`; });
  let lastM = '', lastX = -99;
  O.forEach((b, i) => { const m = b[0].slice(0, 7); if (m === lastM) return; lastM = m;
    if (i === 0 && O.length > 30 && +b[0].slice(8) > 7) return;
    if (i * cwid - lastX < 36) return; lastX = i * cwid;
    s += `<text x="${i * cwid}" y="${H - 7}" fill="#6f7787" font-size="11">${MON[+b[0].slice(5, 7) - 1]}${b[0].slice(5, 7) === '01' ? ' ’' + b[0].slice(2, 4) : ''}</text>`; });
  O.forEach((b, i) => { const pc = i ? (b[4] / O[i - 1][4] - 1) * 100 : null;
    s += `<rect x="${i * cwid}" y="${top}" width="${cwid}" height="${bot - top}" fill="transparent" data-tip="${esc(`${fmtD(b[0])} ’${b[0].slice(2, 4)} · open ${px(b[1])} · high ${px(b[2])} · low ${px(b[3])} · close ${px(b[4])}${pc != null ? ` (${pc >= 0 ? '+' : '−'}${Math.abs(pc).toFixed(1)}%)` : ''}`)}"/>`; });

  const B = lv ? lv.b.filter(b => on(b[0])) : [];
  if (lv) lv.big.pos.concat(lv.big.neg).forEach(b => { if (on(b[0]) && !B.some(x => x[0] === b[0])) B.push([b[0], b[1], 0, 0]); });
  const mx = Math.max(1, ...B.map(b => Math.abs(b[1])));
  const kk = B.map(b => b[0]).sort((a, b) => a - b); let gap = Infinity; for (let i = 1; i < kk.length; i++) gap = Math.min(gap, kk[i] - kk[i - 1]);
  const gpx = isFinite(gap) ? y(0) - y(gap) : 12, bh = Math.max(1.5, Math.min(14, gpx * 0.75)), hh = Math.max(2, Math.min(gpx, 14));
  const blen = v => Math.abs(v) / mx * (bx1 - bx0);
  B.forEach(([k, n]) => { const len = blen(n), kg = lv && k === lv.k;
    if (len >= 0.5) s += `<rect x="${bx0}" y="${y(k) - bh / 2}" width="${len}" height="${bh}" fill="${n > 0 ? (kg ? '#3fbfae' : GC.call) : (kg ? '#ff6f6c' : GC.put)}" opacity=".88"/>`; });
  B.forEach(([k, n, c, pu]) => s += `<rect x="${bx0}" y="${y(k) - hh / 2}" width="${cw - bx0}" height="${hh}" fill="transparent" data-tip="${esc(`${kS(k)} strike (${pct(k / S0 - 1)}): net GEX ${gUsd(n)}${c || pu ? ` · calls ${gUsd(c)} · puts ${gUsd(-pu)}` : ''} · ${win} expiries · $ per 1% move`)}"/>`);

  const line = (v, col, w, dash) => { if (on(v)) s += `<line x1="0" x2="${cw}" y1="${y(v)}" y2="${y(v)}" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`; };
  GXLAST.pileLine = pileOn && !pileAt;
  if (GXLAST.pileLine) line(p.K, GC.pile, 1.3, '6 4');
  if (lv) {
    line(lv.f, GC.flip, 1, '3 3');
    if (lv.pw !== lv.k) line(lv.pw, GC.put, 1.2);
    if (lv.cw !== lv.k) line(lv.cw, GC.call, 1.2);
    line(lv.k, GC.king, 1.6);
  }
  s += `<line x1="0" x2="${cw}" y1="${y(S0)}" y2="${y(S0)}" stroke="${GC.price}" stroke-dasharray="2 3"/>`;
  spread(pills, 20);
  pills.forEach(q => { const x = q.bx = Math.max(4, cw - q.w - 6);
    if (Math.abs(q.y - y(q.v)) > 2) s += `<line x1="${x - 8}" x2="${x}" y1="${y(q.v)}" y2="${q.y}" stroke="${q.stroke || q.fill}"/>`;
    s += `<rect x="${x}" y="${q.y - 9}" width="${q.w}" height="18" rx="3" fill="${q.fill}"${q.stroke ? ` stroke="${q.stroke}"` : ''}${q.dash ? ' stroke-dasharray="3 2"' : ''}/><text x="${x + q.w / 2}" y="${q.y + 4}" font-size="11" fill="${q.ink}" text-anchor="middle" font-weight="${q.bold ? 700 : 600}">${esc(q.t)}</text>`; });
  tags.forEach(t => s += `<rect x="${cw + 2}" y="${t.y - 9}" width="${padR - 4}" height="18" rx="2" fill="${t.fill}"${t.stroke ? ` stroke="${t.stroke}"` : ''}/><text x="${cw + 7}" y="${t.y + 4}" font-size="11" fill="${t.ink}" font-weight="${t.bold ? 700 : 500}">${t.t}</text>`);


  const up = [], dn = [], off = (k, t, st) => { if (k != null && !on(k)) (k >= hi ? up : dn).push(Object.assign({ k, t: (k >= hi ? '▲ ' : '▼ ') + t, lvl: 1 }, st)); };
  if (lv) {
    const e = narrow ? 2 : 0;
    off(lv.k, kTxt(e) + wallW(lv.k, e) + (pileAt === 'k' ? pileW(e) : ''), withPile(ST.king, pileAt === 'k'));
    if (lv.cw !== lv.k) off(lv.cw, cwTxt(e) + (pileAt === 'cw' ? pileW(e) : ''), withPile(ST.cw, pileAt === 'cw'));
    if (lv.pw !== lv.k && lv.pw !== lv.cw) off(lv.pw, pwTxt(e) + (pileAt === 'pw' ? pileW(e) : ''), withPile(ST.pw, pileAt === 'pw'));
    off(lv.f, `${narrow ? 'F' : 'FLIP'} ${kS(lv.f)} ${pct(lv.f / S0 - 1)}`, ST.f);
  }
  if (p && !pileAt) off(p.K, narrow ? `PILE ${p.K}C ${pct(p.away)}` : `PILE ${p.K}C ${pct(p.away)} · ${n0(p.oi)} contracts`, ST.pile);
  if (lv && !narrow) {
    const used = new Set([lv.k, lv.cw, lv.pw, p && p.K]), bar = Math.abs(lv.kg) / 3;
    lv.big.pos.slice(0, 3).concat(lv.big.neg.slice(0, 3)).forEach(b => { if (!used.has(b[0]) && Math.abs(b[1]) >= bar)
      off(b[0], `${kS(b[0])} ${pct(b[0] / S0 - 1)} · ${gUsd(b[1])} GEX`, Object.assign({}, b[1] > 0 ? ST.cw : ST.pw, { dash: 1, lvl: 0 })); });
  }
  up.sort((a, b) => b.k - a.k); dn.sort((a, b) => a.k - b.k);

  const boxes = pills.map(q => [q.bx, q.y - 9, q.w, 18]), hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] + 2 && b[1] < a[1] + a[3] + 2;
  const place = (q, y0, dy) => { const w = textW(q.t, q.lvl), x = Math.max(4, cw - w - 6);
    for (let i = 0, yy = y0; i < 12 && yy >= 0 && yy <= bot - 18; i++, yy += dy) { const b = [x, yy, w, 18];
      if (boxes.some(o => hit(o, b))) continue;
      boxes.push(b);
      s += `<rect x="${x}" y="${yy}" width="${w}" height="18" rx="3" fill="${q.fill}"${q.stroke ? ` stroke="${q.stroke}"` : ''}${q.dash ? ' stroke-dasharray="3 2"' : ''}/><text x="${x + w / 2}" y="${yy + 13}" font-size="11" fill="${q.ink}" text-anchor="middle" font-weight="${q.bold ? 700 : 600}">${esc(q.t)}</text>`;
      return yy; }
    return null; };
  let yu = top + 2, yd = bot - 22;
  up.forEach(q => { const u = place(q, yu, 22); if (u != null) yu = u + 22; });
  dn.forEach(q => { const u = place(q, yd, -22); if (u != null) yd = u - 22; });
  return s + '</svg>';
}
function gexPanel(r, p, st) {
  const [win, lv, want] = gexWin(r, st), G = r.gex, S0 = G ? G.S : r.S, H = (G && G.h) || {}, nb = r.ohlc ? r.ohlc.b.length : 0;
  const seg = (lab, arr, cur, key, why) => `<span class="fg"><span class="lab">${lab}</span>${arr.map(a => { const no = why(a);
    return no ? `<button class="chip off" aria-disabled="true" data-tip="${esc(no)}">${a[1]}</button>`
      : `<button class="chip ${a[0] === cur ? 'on' : ''}" data-${key}="${a[0]}">${a[1]}</button>`; }).join('')}</span>`;
  const gNo = a => G && !H[a[1]] ? `${r.sym} has no option expiring inside ${a[1] === '1M' ? 'a month' : a[1]}` : '';
  const rNo = a => { const i = PXR.indexOf(a); return i > 0 && nb && nb <= PXR[i - 1][2] ? `${r.sym} has ${nb} sessions of history: ${PXR[i - 1][1]} already shows them all` : ''; };
  const rOn = rNo(PXR.find(x => x[0] === st.r) || PXR[1]) ? (PXR.filter(a => !rNo(a)).pop() || PXR[0])[0] : st.r;
  const sum = !G ? 'No GEX map for this name in this build.'
    : !lv ? `No expiries in the ${win} window.`
    : `${win !== want ? `<span class="dim">No ${r.sym} option expires inside ${want === '1M' ? 'a month' : want}: showing ${win}.</span> ` : ''}<b style="color:${GC.king}">King ${kS(lv.k)}</b> ${pct(lv.k / S0 - 1)} · ${gUsd(lv.kg)} · <span style="color:#9fe0d6">call wall ${lv.cw != null ? kS(lv.cw) : '–'}</span> · <span style="color:#f3a5a3">put wall ${lv.pw != null ? kS(lv.pw) : '–'}</span>
       · flip ${lv.f != null ? kS(lv.f) : 'none near the price'} · net ${gUsd(lv.n)} · ${lv.x} expir${lv.x === 1 ? 'y' : 'ies'} to ${esc(lv.le || '–')}`;
  const svg = gexSVG(r, p, st), narrow = !!GXLAST.short;
  const sw = (col, dash, lab) => `<span><svg width="18" height="8" style="vertical-align:0"><line x1="0" x2="18" y1="4" y2="4" stroke="${col}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ''}/></svg> ${lab}</span>`;
  return `<div class="panel gxsec"><div class="gxh"><h3>${r.sym} price and GEX levels</h3>
      <span class="gxc">${seg('GEX expiries', GXW, (GXW.find(x => x[1] === win) || [st.g])[0], 'g', gNo)}${seg('Price', PXR, rOn, 'r', rNo)}</span></div>
      <div class="ph">${sum}</div>
      <div class="gxchart">${svg}</div>
      ${!lv ? '' : `<div class="legend">${sw(GC.king, '', `${narrow ? 'K ' : ''}king (most net GEX)`)}${sw(GC.call, '', `${narrow ? 'CW ' : ''}call wall`)}${sw(GC.put, '', `${narrow ? 'PW ' : ''}put wall`)}${sw(GC.flip, '3 3', `${narrow ? 'F ' : ''}flip`)}${sw(GC.price, '2 3', 'price')}${GXLAST.pileLine ? sw(GC.pile, '6 4', `the ${p.K}C pile`) : ''}
        <span><i style="background:${GC.call}"></i><i style="background:${GC.put}"></i>net GEX at each strike, ${win} expiries ($ per 1% move)</span></div>`}
      <div class="ph" style="margin:6px 0 0">${G ? `Open interest from the ${fmtD(r.settle)} settle, priced at the ${fmtD(G.day)} close. ` : ''}${nb ? `Daily ${GXLAST.line ? 'closes' : 'candles'} to the ${fmtD(r.ohlc.b[nb - 1][0])} close. ` : ''}Worked out like GEX Hunt and Eagle Eye: king, walls and flip come from the strikes near the price; ▲ / ▼ tags mark levels, the pile and big strikes beyond the chart.</div></div>`;
}


const CP_ALL = '#d16ba5', CP_LONG = '#3987e5';
function flowBars(c, p) {
  const pos = Math.max(c, p, 0), neg = Math.max(-c, -p, 0), span = pos + neg || 1, z = neg / span * 100;
  const bar = (v, cls) => { const w = Math.abs(v) / span * 100; return v ? `<i class="${cls}" style="left:${(v >= 0 ? z : z - w).toFixed(2)}%;width:${Math.max(w, 1).toFixed(2)}%"></i>` : ''; };
  const row = (lab, v, cls) => `<div class="fr"><span class="fl">${lab}</span><span class="ft">${neg ? `<b style="left:${z.toFixed(2)}%"></b>` : ''}${bar(v, cls)}</span><span class="fv num">${pm(v)}</span></div>`;
  return `<div class="fbars">${row('Calls', c, 'c')}${row('Puts', p, 'p')}</div>`;
}
function cpCard(r, key, title, when) {
  const on = PER === key ? ' on' : '', a = cpAdd(r, key), was = r.cp0 && r.cp0[key];
  const head = `<div class="t">${title} <span class="w">${when}</span></div>`;
  if (!a) return `<div class="cpcard${on}">${head}<div class="v dim">–</div><div class="s">No session on file that far back for ${r.sym}.</div></div>`;
  const [c, p, cl, pl] = a;
  return `<div class="cpcard${on}">${head}
      <div class="v num"><span class="${flowCls(c, p)}">${flowTxt(c, p, 2)}</span> <span class="mv">calls : puts added</span></div>
      ${flowBars(c, p)}
      <div class="s num">180+ days <span class="${flowCls(cl, pl)}">${flowTxt(cl, pl, 2)}</span> <span class="dim">(${addWords([cl, pl])})</span></div>
      ${was ? `<div class="s num">Open ratio ${cpTxt(was[0], was[1], 2)} → ${cpTxt(r.cp[0], r.cp[1], 2)}</div>` : ''}</div>`;
}
function cpChart(r) {
  const h = r.cph || [], n = h.length;
  if (n < 2) return '';
  const A = h.map(x => x[2] ? x[1] / x[2] : null), G = h.map(x => x[4] ? x[3] / x[4] : null);
  const vals = A.concat(G).filter(v => v > 0 && isFinite(v));
  if (!vals.length) return '';
  const vmin = Math.min(...vals), vmax = Math.max(...vals);
  let lo = Math.log(vmin), hi = Math.log(vmax);
  const pad = Math.max((hi - lo) * 0.12, 0.03); lo -= pad; hi += pad;
  const cmp = compact(), W = Math.round(Math.max(300, Math.min(1300, (app.clientWidth || 900) - 34))), H = cmp ? 200 : 190;
  const l = cmp ? 48 : 58, rt = cmp ? 94 : 110, t = 26, b = 24, every = Math.max(1, Math.ceil(n * 46 / (W - l - rt)));
  const X = i => l + i * (W - l - rt) / (n - 1), Y = v => t + (1 - (Math.log(v) - lo) / (hi - lo)) * (H - t - b);
  let s = `<svg width="${W}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;display:block" role="img" aria-label="calls to puts ratio by session">`;
  const ticks = Y(vmin) - Y(vmax) > 12 ? [vmin, vmax] : [vmax];
  if (1 > Math.exp(lo) && 1 < Math.exp(hi) && ticks.every(v => Math.abs(Y(v) - Y(1)) > 12)) ticks.push(1);
  ticks.forEach(v => s += `<line x1="${l}" x2="${W - rt}" y1="${Y(v)}" y2="${Y(v)}" stroke="#232a38"${v === 1 ? ' stroke-dasharray="4 3"' : ''}/>
      <text x="${l - 6}" y="${Y(v) + 4}" fill="#6f7787" font-size="10.5" text-anchor="end">${v === 1 ? 'even' : rTxt(v, 2)}</text>`);
  const at = d => d ? h.findIndex(x => x[0] === d) : -1;
  [['w', '1 wk'], ['t', '1 day']].forEach(([k, lab]) => {
    const i = at(r.cp0d && r.cp0d[k]);
    if (i <= 0) return;
    s += `<line x1="${X(i)}" x2="${X(i)}" y1="${t - 4}" y2="${H - b}" stroke="#3a4253" stroke-dasharray="2 3"/>
      <text x="${X(i)}" y="${t - 9}" fill="#a9b0bc" font-size="10.5" text-anchor="middle">${lab}</text>`;
  });
  const path = v => { let d = '', pen = false; v.forEach((y, i) => { if (y == null || !(y > 0)) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)},${Y(y).toFixed(1)}`; pen = true; }); return d; };
  s += `<path d="${path(G)}" fill="none" stroke="${CP_LONG}" stroke-width="2" stroke-dasharray="5 3" stroke-linejoin="round"/>`;
  s += `<path d="${path(A)}" fill="none" stroke="${CP_ALL}" stroke-width="2" stroke-linejoin="round"/>`;
  const ends = [[A, CP_ALL, 'All'], [G, CP_LONG, '180d+']].filter(e => e[0][n - 1] > 0).map(e => ({ v: e[0][n - 1], col: e[1], lab: e[2], y: Y(e[0][n - 1]) }));
  if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 14) {
    const [u, d] = ends[0].y <= ends[1].y ? ends : [ends[1], ends[0]], m = (u.y + d.y) / 2;
    u.ly = m - 7; d.ly = m + 7;
  }
  ends.forEach(e => {
    s += `<circle cx="${X(n - 1)}" cy="${e.y}" r="4" fill="${e.col}" stroke="#151a23" stroke-width="2"/>`;
    s += `<text x="${X(n - 1) + 10}" y="${(e.ly ?? e.y) + 4}" fill="#e8eaed" font-size="11" font-weight="600">${rTxt(e.v, 2)} <tspan fill="#a9b0bc" font-weight="400">${e.lab}</tspan></text>`;
  });
  const bw = (W - l - rt) / (n - 1);
  h.forEach((x, i) => {
    if (i === 0 || i === n - 1 || (i % every === 0 && i < n - 2)) s += `<text x="${X(i)}" y="${H - 7}" fill="#6f7787" font-size="10.5" text-anchor="middle">${fmtD(x[0])}</text>`;
    s += `<rect class="hc" x="${X(i) - bw / 2}" y="${t}" width="${bw}" height="${H - t - b}" fill="transparent" data-tip="${esc(`After the ${fmtD(x[0])} close: all expiries ${cpTxt(x[1], x[2], 2)} · ${n0(x[1])} calls · ${n0(x[2])} puts | 180+ days ${cpTxt(x[3], x[4], 2)} · ${n0(x[3])} calls · ${n0(x[4])} puts`)}"/>`;
  });
  return s + '</svg>';
}
function bizPanel(r) {
  if (r.biz == null) return '';
  const parts = (r.bizm || []).map(b => {
    const out = b[2] == null;
    const tip = out ? `${b[0]}: no figure on file, so the score is worked out from the other parts`
      : `${b[0]}: ${bizPart(r, b)} · ranks ${b[2]} of 100 vs the S&P 500 + Nasdaq 100`;
    return `<div class="bzp${out ? ' out' : ''}" data-tip="${esc(tip)}">
      <div class="bzl">${esc(b[0])}</div><div class="bzv num">${esc(bizPart(r, b))}</div>
      ${out ? '<span class="bzmeter none"></span>' : bizMeter(b[2])}<div class="bzr num">${bizRank(r, b)}</div></div>`;
  }).join('');
  return `<div class="panel bzsec"><div class="bzh"><h3>Business score</h3><span class="bzbig num">${r.biz}<span class="dim">/100</span></span>${bizMeter(r.biz, 'big')}
      <span class="ph" style="margin:0">Ranked against the S&P 500 + Nasdaq 100${bizDay(r) ? ` · fundamentals from ${fmtD(bizDay(r))}` : ''}</span></div>
      ${parts ? `<div class="bzparts">${parts}</div>` : ''}</div>`;
}

function cpPanel(r) {
  if (!r.cp) return '';
  const P = PD(), c = r.cp, cards = cpCard(r, 't', '1 day', P.t ? `on ${fmtD(P.t.day)}` : '')
    + cpCard(r, 'w', '1 week', P.w ? `since ${fmtD(P.w.since)}` : '') + cpCard(r, 'a', 'Total', `since ${sinceOf(r)}`);
  const leg = `<div class="legend" style="margin:0 0 4px"><span><i style="background:${CP_ALL};height:3px"></i>All expiries</span>
      <span><i style="background:repeating-linear-gradient(90deg,${CP_LONG} 0 5px,transparent 5px 8px);height:3px"></i>180+ days</span></div>`;
  return `<div class="panel cpsec"><h3>Calls vs puts on ${r.sym}</h3>
      <div class="ph num">Open now: <b class="${cpCls(c[0], c[1])}">${cpTxt(c[0], c[1], 2)}</b> (${n0(c[0])} calls · ${n0(c[1])} puts, all expiries) · 180+ days <b class="${cpCls(c[2], c[3])}">${cpTxt(c[2], c[3], 2)}</b>.
        Each card = calls added ÷ puts added in that window, counting only series still open (expired weeklies are not closes).</div>
      <div class="cpcards">${cards}</div>
      <div class="cpchart"><div class="ph" style="margin:0">Open calls ÷ puts after each day’s close</div>${leg}${cpChart(r)}</div></div>`;
}

function openBtns() { return ''; }
async function renderName(st) {
  const back = `<a class="back" href="#" id="back">← Board</a>`;
  const bindBack = () => document.getElementById('back').onclick = e => { e.preventDefault(); go({ v: 'board', s: '', k: '' }); };
  if (!ROWS.some(x => x.sym === st.s)) {
    app.innerHTML = back + `<p class="dim">No far long-dated call pile on file for ${esc(st.s)} (big piles only, well above the price, six months or more out).</p>`;
    return bindBack();
  }
  let r = NAMES[st.s];
  if (!r) {
    app.innerHTML = back + `<div class="loading">Loading ${esc(st.s)}…</div>`; bindBack();
    let res = null;
    try { res = await nameRes(st.s); } catch (e) {  }
    if (readHash().s !== st.s) return;
    if (!res || !res.ok) {
      app.innerHTML = back + `<p class="dim">${res && res.status === 404 ? `${esc(st.s)} is no longer on the board (a newer build dropped it). Refreshing the board…`
        : `Could not load ${esc(st.s)}. Try again in a moment.`}</p>`;
      bindBack();
      if (res && res.status === 404) {
        try { await load(); } catch (e) {  }
        if (readHash().s !== st.s) return;
        if (!ROWS.some(x => x.sym === st.s)) return render();
        app.innerHTML = back + `<p class="dim">Could not load ${esc(st.s)}. Try again in a moment.</p>`;
        bindBack();
      }
      return;
    }
    r = NAMES[st.s] = await res.json();
  }
  let p = r.piles[0];
  if (st.k) { const [K, e] = st.k.split('|'); p = r.piles.find(x => String(x.K) === K && x.exp === e) || p; }
  const head = `<div class="dh"><span class="big">${r.sym}</span><span class="nm2">${esc(r.name)}${r.sector ? ' · ' + esc(r.sector) : ''}</span>${listsHtml(r)}
      <span class="px num">${px(r.S)}</span>
      <span class="bzbadge" data-tip="${esc(bizTip(r))}">Business ${r.biz != null ? `<b class="num">${r.biz}</b>${bizMeter(r.biz)}` : '<span class="dim">–</span>'}</span>
      <span class="kg num">Long-dated king (biggest call gamma strike, 180d+): <b style="color:#e8eaed">${r.king}</b> ${r.king_away != null ? pct(r.king_away) : ''}
      · calls : puts ${r.cp ? `<b class="${cpCls(r.cp[0], r.cp[1])}" data-tip="${esc(`${n0(r.cp[0])} calls · ${n0(r.cp[1])} puts open, all expiries`)}">${cpTxt(r.cp[0], r.cp[1])}</b>
        (180+ days <b class="${cpCls(r.cp[2], r.cp[3])}" data-tip="${esc(`${n0(r.cp[2])} calls · ${n0(r.cp[3])} puts open, 180+ days`)}">${cpTxt(r.cp[2], r.cp[3])}</b>)` : `${r.cp_long ?? '–'}× long-dated`}
      · ${n0(r.tot_oi)} long-dated call contracts above the price</span>${openBtns(r.sym)}</div>`;
  const chips = `<div class="pchips">${r.piles.slice(0, 6).map(q => `<button class="pchip ${q === p ? 'on' : ''}" data-k="${q.K}|${q.exp}">
      <b>${q.K}C</b> ${nxOf(q) > 1 ? `${q.nx} exp` : q.expl} · ${pct(q.away)} · ${usd(q.prem)} · score ${Math.round(q.score)}</button>`).join('')}
      ${r.piles.length > 6 ? `<span class="dim" style="align-self:center;font-size:12px">+${r.piles.length - 6} more in the table below</span>` : ''}</div>`;
  const dt = (t, v, s) => `<div class="tile" style="cursor:default"><div class="t">${t}</div><div class="v num">${v}</div><div class="s num">${s}</div></div>`;
  const tiles = `<div class="dtiles">
      ${nxOf(p) > 1 ? dt('Pile', `<span style="color:var(--pile)">${p.K}C</span> · ${p.nx} expiries`, `biggest ${expLong(p.exp)} (${Math.round(p.bs * 100)}%) · ${p.dte} days`)
        : dt('Pile', `<span style="color:var(--pile)">${p.K}C</span> ${p.expl}`, `${expLong(p.exp)} · ${p.dte} days left`)}
      ${dt('Needs', pct(p.away), `${p.sig.toFixed(2)}σ away`)}
      ${dt('Touch odds', Math.round(p.pt * 100) + '%', 'priced into the options')}
      ${dt('Contracts', n0(p.oi), `${sgn(p.add)} since ${sinceOf(r)} · ${sgn5(p.add5)} 1 wk · ${sgn5(p.add1)} today`)}
      ${dt('$ in pile', usd(p.prem), `${p.padv != null ? (p.padv * 100).toFixed(1) + '% of day $vol · ' : ''}${usd(p.mid * 100)} each`)}
      ${dt('Stands out', spk(p.spike), 'vs nearby strikes')}</div>`;
  const heat = `<div class="panel"><h3>Long-dated call open interest — strike × expiry</h3>
      <div class="ph">Open call contracts at each strike and expiry (180+ days). Brighter = more contracts.</div>
      <div class="tscroll">${heatSVG(r, p)}</div><div class="legend"><span><i style="background:#104281"></i>few</span><span><i style="background:#3987e5"></i></span><span><i style="background:#b7d3f6"></i>many</span>
      <span><i style="background:none;border:2px solid #f0b429"></i>the pile</span></div></div>`;
  const build = `<div class="panel"><h3>${p.K}C build-up</h3>
      <div class="ph">Open contracts going into each session, all 180+ day expiries at ${p.K}. ${sgn(p.add)} since ${sinceOf(r)}.</div>${buildSVG(p)}
      ${(p.roll || []).map(x => `<div class="rollnote"><span class="tag roll">ROLL?</span> ${fmtD(x.day)}: ${x.frm} lost ${n0(x.n)} contracts the same session this pile grew. A possible roll; it still counts as new money.</div>`).join('')}
      ${bxPanel(r, p)}</div>`;
  const table = `<div class="panel"><h3>Every far pile on ${r.sym}</h3><div class="ph">Click a row to switch the charts.</div>
      <div style="overflow-x:auto"><table class="board" style="border:0"><thead><tr><th class="l">Pile</th><th>Needs</th><th>Touch odds</th><th>Contracts</th><th>Added since ${sinceOf(r)}</th><th>Last 5</th><th>$ in pile</th><th class="hide-m">Stands out</th><th class="l">Tags</th><th>Score</th></tr></thead><tbody>
      ${r.piles.map(q => `<tr data-k="${q.K}|${q.exp}" ${q === p ? 'style="background:#2a2310"' : ''}><td class="l">${pileChip(r, q)}${pileSub(q)}</td>
        <td class="num">${pct(q.away)} <span class="dim">${q.sig.toFixed(2)}σ</span></td><td class="num">${Math.round(q.pt * 100)}%</td><td class="num">${n0(q.oi)}</td><td class="num">${sgn(q.add)}</td><td class="num">${sgn5(q.add5)}</td>
        <td class="num">${usd(q.prem)}</td><td class="num hide-m">${spk(q.spike)}</td><td class="l">${tagsHtml(q)}</td>
        <td class="num"><span class="bar"><i style="width:${Math.min(100, q.score)}%"></i></span>${Math.round(q.score)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  app.innerHTML = back + head + chips + tiles + gexPanel(r, p, st) + bizPanel(r) + cpPanel(r) + `<div class="grid2">${heat}${build}</div>` + table;
  bindBack();
  app.querySelectorAll('[data-k]').forEach(el => el.onclick = () => go({ k: el.dataset.k }));
  app.querySelectorAll('[data-g]').forEach(el => el.onclick = () => go({ g: el.dataset.g }));
  app.querySelectorAll('[data-r]').forEach(el => el.onclick = () => go({ r: el.dataset.r }));
}


let ttTimer = null;
function showTip(el, x, y) {
  tt.textContent = el.dataset.tip; tt.style.display = 'block';
  tt.style.left = Math.max(4, Math.min(x + 12, innerWidth - tt.offsetWidth - 8)) + 'px'; tt.style.top = (y + 14) + 'px';
}
let bxEl = null;
function showBx(el, x, y) {
  bxEl = el;
  const [sym, K, e] = el.dataset.bx.split('|'), r = NAMES[sym], p = r && r.piles.find(q => String(q.K) === K && q.exp === e);
  if (p && p.bx) tt.innerHTML = bxTip(r, p);
  else if (r) tt.textContent = `${K}C: no per-expiry rows for this pile in the current build.`;
  else {
    tt.textContent = `${K}C: loading its expiries…`;
    nameFile(sym).then(() => { if (bxEl === el && tt.style.display === 'block') showBx(el, x, y); });
  }
  tt.style.display = 'block';
  tt.style.left = Math.max(4, Math.min(x + 12, innerWidth - tt.offsetWidth - 8)) + 'px';
  tt.style.top = Math.max(4, Math.min(y + 14, innerHeight - tt.offsetHeight - 8)) + 'px';
}
document.addEventListener('mousemove', e => {
  if (ttTimer) return;
  const el = e.target.closest && e.target.closest('[data-bx],[data-tip]');
  if (!el) { tt.style.display = 'none'; bxEl = null; return; }
  if (el.dataset.bx && matchMedia('(hover: hover)').matches) return showBx(el, e.clientX, e.clientY);
  bxEl = null;
  if (el.dataset.tip) showTip(el, e.clientX, e.clientY); else tt.style.display = 'none';
});
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el || !matchMedia('(hover: none)').matches) return;
  showTip(el, e.clientX, e.clientY);
  clearTimeout(ttTimer); ttTimer = setTimeout(() => { tt.style.display = 'none'; ttTimer = null; }, 2500);
});

let lastView = '', lastCompact = compact();
function render() {
  if (!D) return;
  const st = readHash(), key = st.v + '|' + st.s;
  const fail = e => { app.innerHTML = `<a class="back" href="#">← Board</a><p class="dim">Something went wrong drawing this view (${esc(e && e.message)}).</p>`; };
  try { const p = (st.v === 'name' ? renderName : renderBoard)(st); if (p && p.catch) p.catch(fail); } catch (e) { fail(e); }
  if (key !== lastView) window.scrollTo(0, 0);
  lastView = key;
}
let rsT = null;
addEventListener('resize', () => {
  if (compact() !== lastCompact) { lastCompact = compact(); return render(); }
  clearTimeout(rsT);
  rsT = setTimeout(() => {
    markOvf();
    const g = app.querySelector('.gxchart svg');
    if (g && readHash().v === 'name' && (gxWidth() < +g.dataset.w || gxWidth() > +g.dataset.w + 30)) render();
  }, 200);
});

const GH = /(^|\.)github\.io$/i.test(location.hostname);
const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/leap-hunter-data/leap-hunter/';
let BASE = GH ? RAW : 'snap/', VER = '';
async function getJson(name) {
  let r = await fetch(BASE + name, { cache: 'no-cache' }).catch(() => null);
  if ((!r || !r.ok) && BASE !== RAW) { BASE = RAW; r = await fetch(BASE + name, { cache: 'no-cache' }).catch(() => null); }
  if (!r || !r.ok) throw new Error('data ' + (r ? r.status : 'offline'));
  return r.json();
}
const nameRes = sym => fetch(`${BASE}names/${encodeURIComponent(sym)}.json?v=${VER}`, { cache: 'no-cache' });
const builtTxt = () => {
  const t = Date.parse(D.built_utc);
  if (!isFinite(t)) return D.built || '';
  return `${D.built} (${new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} your time)`;
};
async function load() {
  const m = await getJson('manifest.json');
  VER = String(m.sha256 || '').slice(0, 12);
  const b = await getJson('leap-hunter.json?v=' + VER);
  D = b; ROWS = b.rows; BUILT = m.sha256;
  for (const r of ROWS) if (r.pin) r.piles.forEach(p => { p.pin = true; });
  for (const k of Object.keys(NAMES)) delete NAMES[k];
}
async function poll() {
  try {
    const m = await getJson('manifest.json');
    if (m.sha256 && m.sha256 !== BUILT) { await load(); render(); }
  } catch (e) {  }
}
addEventListener('hashchange', render);

document.querySelectorAll('a.skip').forEach(a => a.addEventListener('click', e => { e.preventDefault(); app.focus(); }));
(() => {
  const t = document.querySelector('.tabs'), a = t && t.querySelector('[aria-current=page]');
  if (!a || t.scrollWidth <= t.clientWidth) return;
  const d = a.getBoundingClientRect().right - t.getBoundingClientRect().right;
  if (d > 0) t.scrollLeft += d;
})();
app.innerHTML = '<div class="loading">Loading LEAP Hunter…</div>';
load().then(render).catch(() => { app.innerHTML = '<div class="loading">The board could not be loaded just now. This page retries every minute.</div>'; setTimeout(() => location.reload(), 60000); });
setInterval(poll, 10 * 60 * 1000);
