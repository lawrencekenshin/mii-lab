'use strict';



const HS = ['1M', '3M', '6M', '1Y+'];
const LISTS = [['all', 'All'], ['spx', 'SPY'], ['ndx', 'QQQ'], ['wl', 'Watchlist 1'], ['ai', 'AI']];
const PERS = [['today', 'Today'], ['1W', '1W'], ['1M', '1M'], ['ALL', 'Total']];
const store = {
  get(k, d) { try { const v = localStorage.getItem('hunt.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hunt.' + k, JSON.stringify(v)); } catch (e) {  } },
};
const S = { v: 'board', h: store.get('h', '1Y+'), l: store.get('l', 'all'), near: store.get('near', true),
  sort: store.get('sort', ['sc', -1]), psort: store.get('psort', ['days', -1]), q: '', s: null, side: store.get('side', 'call'), per: 'today', d: null };
if (!HS.includes(S.h)) S.h = '1Y+';
if (S.side !== 'put') S.side = 'call';
let D = null, REC = null, PER = null, BUILD = null, STATUS = null;
const NAMES = {}, DAYB = {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const NARROW = () => window.innerWidth < 760;
const WIDE = () => window.innerWidth >= 1800, MID = () => window.innerWidth >= 1560;
const PUT = () => S.side === 'put';
const K = () => (PUT() ? 'p' : 'h');

const W = () => PUT()
  ? { stack: 'Put stack below', other: 'Calls above', levels: 'Levels below', added: 'Puts 1W', mine: 'put', theirs: 'call', where: 'below', there: 'above', pat: 'Reverse NXPI', addedLong: 'puts added' }
  : { stack: 'Stack above', other: 'Puts below', levels: 'Levels above', added: 'Calls 1W', mine: 'call', theirs: 'put', where: 'above', there: 'below', pat: 'NXPI pattern', addedLong: 'calls added' };


const fm = v => { if (v == null) return '–'; const a = Math.abs(v); if (a < 1000) return a < 1 ? '$0' : '<$1K';
  return (v < 0 ? '−' : '') + '$' + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M' : (a / 1e3).toFixed(0) + 'K'); };
const pc = (v, d = 0) => { if (v == null) return '–'; const t = Math.abs(v * 100).toFixed(d); return (+t === 0 ? '' : v >= 0 ? '+' : '−') + t + '%'; };
const kf = n => { const a = Math.abs(n); return (n < 0 ? '−' : '') + (a >= 1e4 ? (a / 1e3).toFixed(0) + 'k' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : String(a)); };
const sk = k => String(Math.round(k * 100) / 100);
const day = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–';
const dayW = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '–';
const expS = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(', ', " '") : '–';
const xS = x => x == null ? '–' : (x >= 49.9 ? '50+' : x.toFixed(x >= 10 ? 0 : 1)) + '×';
const comS = c => c == null ? '–' : (PUT() ? '−' : '+') + Math.abs(c * 100).toFixed(0) + '%';
const stackS = v => PUT() ? fm(-v) : fm(v);
const otherS = v => !v ? '$0' : PUT() ? fm(v) : fm(-v);


const LIVE = location.hostname === 'lawrencekenshin.github.io';
const BASE = LIVE ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/hunt-data/hunt/' : './data/';
let BUST = '';
async function getJSON(url) {
  const path = url === 'api/status' ? 'status.json' : url.replace(/^data\//, '');
  const q = path === 'status.json' ? '?t=' + Math.floor(Date.now() / 60000) : BUST;
  const r = await fetch(BASE + path + q, { cache: 'no-cache' });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.json();
}
async function loadBoard() {
  if (STATUS && STATUS.build) BUST = '?b=' + STATUS.build;
  D = await getJSON('data/hunt.json');
  BUILD = D.build;
  for (const k in NAMES) delete NAMES[k];
  REC = null; PER = null;
}
async function loadName(sym) { if (!NAMES[sym]) NAMES[sym] = await getJSON('data/names/' + encodeURIComponent(sym) + '.json'); return NAMES[sym]; }
async function loadRecord() { if (!REC) REC = await getJSON('data/record.json'); return REC; }
async function loadPeriods() { if (!PER) PER = await getJSON('data/periods.json'); return PER; }
async function loadDay(d) { if (!DAYB[d]) DAYB[d] = await getJSON('data/days/' + d + '.json'); return DAYB[d]; }
const pastDay = () => S.per === 'today' && S.d && S.d !== D.day;


function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  S.v = ['board', 'detail', 'record'].includes(p.get('v')) ? p.get('v') : 'board';
  if (HS.includes(p.get('h'))) S.h = p.get('h');
  if (p.get('l') && LISTS.some(l => l[0] === p.get('l'))) S.l = p.get('l');
  if (p.has('x')) S.side = p.get('x') === 'neg' ? 'put' : 'call';
  S.per = PERS.some(x => x[0] === p.get('per')) ? p.get('per') : 'today';
  S.d = /^\d{4}-\d\d-\d\d$/.test(p.get('d') || '') ? p.get('d') : null;
  S.s = (p.get('s') || '').toUpperCase() || null;
  if (S.s && S.v === 'board') S.v = 'detail';
}
function writeHash(push) {
  const p = new URLSearchParams();
  if (S.v !== 'board') p.set('v', S.v);
  if (S.v === 'detail' && S.s) p.set('s', S.s);
  p.set('h', S.h);
  p.set('x', PUT() ? 'neg' : 'pos');
  if (S.l !== 'all') p.set('l', S.l);
  if (S.per !== 'today') p.set('per', S.per);
  if (S.d) p.set('d', S.d);
  const h = '#' + p.toString();
  if (h !== location.hash) (push ? history.pushState : history.replaceState).call(history, null, '', h);
}
function go(changes, push = true) {
  const prevV = S.v;
  Object.assign(S, changes);
  store.set('h', S.h); store.set('l', S.l); store.set('near', S.near); store.set('sort', S.sort); store.set('psort', S.psort); store.set('side', S.side);
  writeHash(push);
  render(prevV !== S.v);
}
window.addEventListener('popstate', () => { readHash(); render(true); });


const hh = r => (r[K()] || {})[S.h];
const binsOf = r => ((r.h || {})[S.h] || {}).b || (hh(r) || {}).b;
const inList = r => S.l === 'all' || (r.l || []).includes(S.l);
const fr = r => { const f = hh(r) && hh(r).fr; return f && f[1] ? [f[0] - f[1], (f[0] - f[1]) / f[1]] : null; };
const isFresh = r => { const f = fr(r); return !!f && f[0] >= 1000 && f[1] >= 0.10; };

const cpOf = (r, H = S.h) => { const c = r.cp && r.cp[H]; return c && c[0] + c[1] > 0 ? c : null; };
const cpShare = c => c[0] / (c[0] + c[1]);
const cpWk = c => c[2] != null && c[2] + c[3] > 0 ? c[2] / (c[2] + c[3]) : null;
const SORTS = {
  sc: r => hh(r).sc, s: r => r.s, px: r => r.r20 ?? -9, up: r => hh(r).up, dn: r => hh(r).dn, x: r => hh(r).x,
  lv: r => hh(r).lv.length, com: r => hh(r).com, fr: r => (fr(r) || [-1e12])[0], biz: r => r.biz ?? -1,
  cp: r => { const c = cpOf(r); return c ? cpShare(c) : -1; },
  days: r => r.days ?? (hh(r).days || 0), ret: r => r.ret ?? -9, best: r => r.touched ? 1 : -Math.abs(r.best ?? 9),
};
const SORT = () => (S.per === 'today' || S.v !== 'board' ? S.sort : S.psort);
function sorted(rows) {
  const [k, dir] = SORT(), f = SORTS[k] || SORTS.sc;
  return rows.slice().sort((a, b) => { let x, y; try { x = f(a); y = f(b); } catch (e) { x = y = 0; }
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir || hh(b).sc - hh(a).sc || a.s.localeCompare(b.s); });
}
function srcRows() { return pastDay() ? (DAYB[S.d] || { rows: [] }).rows : D.rows; }
function groups() {
  const all = srcRows().filter(r => inList(r) && hh(r));
  const m = all.filter(r => hh(r).v === 'match'), n = all.filter(r => hh(r).v === 'near');
  return { all, m: sorted(m), n: sorted(n), byScore: m.slice().sort((a, b) => hh(b).sc - hh(a).sc) };
}
const matchQ = (r, q) => r.s.startsWith(q) || String(r.n || '').toUpperCase().includes(q);


function glyph(r, w = (WIDE() ? 210 : MID() ? 150 : 120), hgt = 46) {
  const all = binsOf(r), g = hh(r) || {};
  if (!all) return `<svg class="glyph" width="${w}" height="${hgt}"></svg>`;
  const [lo0, , bw] = D.bins, zeroAll = Math.round(-lo0 / bw), span = Math.round(0.9 / bw);
  const start = PUT() ? zeroAll - Math.round(0.6 / bw) : zeroAll - Math.round(0.3 / bw);
  const b = all.slice(Math.max(0, start), Math.max(0, start) + span), nb = b.length, step = w / nb, zero = zeroAll - start;
  const mx = Math.max(...b.map(Math.abs)) || 1;
  const base = PUT() ? Math.round(hgt * 0.36) : Math.round(hgt * 0.64), upRoom = base - 3, dnRoom = hgt - base - 3;
  const topBin = g.top ? Math.floor((g.top[0] / r.px - 1 - lo0) / bw + 1e-9) - start : -1;
  const x0 = zero * step, scale = Math.max(upRoom, dnRoom);
  let s = `<svg class="glyph" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><rect width="${w}" height="${hgt}" fill="#161a25" rx="3"/>` +
    (PUT() ? `<rect width="${x0}" height="${hgt}" fill="rgba(239,83,80,.06)"/>` : `<rect x="${x0}" width="${w - x0}" height="${hgt}" fill="rgba(38,166,154,.05)"/>`);
  b.forEach((v, i) => { if (!v) return;
    const room = v > 0 ? upRoom : dnRoom, hgtB = Math.max(1, Math.min(room, Math.abs(v) / mx * scale));
    const col = i === topBin ? '#f5d63d' : v < 0 ? (PUT() && i < zero ? '#ef5350' : '#a9403e') : (!PUT() && i >= zero ? '#26a69a' : '#1e6f67');
    s += `<rect x="${(i * step + 0.6).toFixed(1)}" y="${(v > 0 ? base - hgtB : base).toFixed(1)}" width="${(step - 1.2).toFixed(1)}" height="${hgtB.toFixed(1)}" fill="${col}"/>`; });
  return s + `<line x1="0" x2="${w}" y1="${base + .5}" y2="${base + .5}" stroke="#363a45"/><line x1="${x0}" x2="${x0}" y1="2" y2="${hgt - 2}" stroke="#2962ff" stroke-dasharray="2,2"/></svg>`;
}
function kdj(r) {
  if (!r.tf || !Object.keys(r.tf).length) return '<span class="muted">–</span>';
  return ['1W', '2W', '1M'].map(t => { const x = r.tf[t]; if (!x) return `<span class="kd">${t} –</span>`;
    const lab = { GOLDEN: 'GC', COIL: 'coil', UP: 'up', DOWN: 'dn' }[x[0]] || x[0].toLowerCase();
    return `<span class="kd ${x[0]}" title="${t} KDJ ${x[0]}${x[1] != null ? ', ' + x[1] + ' bars' : ''}${x[2] ? ', washout' : ''}">${t} ${lab}</span>`; }).join('');
}
function chips(r, max = (WIDE() ? 4 : MID() ? 3 : 2)) {
  const g = hh(r), tk = g.kt;
  return g.lv.slice(0, max).map(([k]) => `<span class="lv ${k === tk ? 'k' : PUT() ? 'neg' : ''}">${sk(k)} <small>${pc(k / r.px - 1)}</small></span>`).join('') +
    (g.lv.length > max ? `<span class="muted">+${g.lv.length - max}</span>` : '');
}
function freshCell(r) {
  const f = fr(r);
  if (!f) return '<span class="fresh n">n/a</span>';
  return `<span class="fresh ${isFresh(r) ? 'g' : 'n'}">${f[0] >= 0 ? '+' : '−'}${kf(Math.abs(f[0]))} <small>(${pc(f[1])})</small></span>`;
}
function daysCell(g) {
  if (!g || g.v !== 'match' || g.days == null) return '';
  if (g.new) return ' <span class="badge new">NEW</span>';
  return ` <span class="dys" title="on the list since ${day(g.since)}${g.since_start ? ' (when history starts)' : ''}">${g.days}d${g.since_start ? '+' : ''}</span>`;
}
function cpLab(c) {
  const sh = cpShare(c), x = sh >= 0.5 ? c[0] / Math.max(c[1], 1) : c[1] / Math.max(c[0], 1);
  const t = x >= 9.95 ? x.toFixed(0) : x.toFixed(1);
  return sh >= 0.55 ? `<b class="up">${t}× calls</b>` : sh <= 0.45 ? `<b class="dn">${t}× puts</b>` : `<b class="cpe">${t}× even</b>`;
}
function cpBar(c, cls = '') {
  const sh = cpShare(c), wk = cpWk(c);
  return `<i class="cpb ${cls}"><b style="width:${(sh * 100).toFixed(1)}%"></b><em></em>${wk == null ? '' : `<s style="left:${(wk * 100).toFixed(1)}%"></s>`}</i>`;
}
function cpMove(c, pre = '1W ') {
  const wk = cpWk(c);
  if (wk == null) return `<span class="cpw muted">${pre}n/a</span>`;
  const d = (cpShare(c) - wk) * 100;
  if (Math.abs(d) < 1) return `<span class="cpw muted">${pre}=</span>`;
  return `<span class="cpw ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}pt</span>`;
}
function cpTip(c, H = S.h, then = 'a week ago (same expiries)') {
  const wk = cpWk(c);
  return `${kf(c[0])} calls vs ${kf(c[1])} puts open (${H} expiries), ${Math.round(cpShare(c) * 100)}% calls` +
    (wk == null ? '' : ` · ${then} ${Math.round(wk * 100)}% calls: calls ${c[0] - c[2] >= 0 ? '+' : '−'}${kf(Math.abs(c[0] - c[2]))}, puts ${c[1] - c[3] >= 0 ? '+' : '−'}${kf(Math.abs(c[1] - c[3]))}`);
}
function cpCard(n) {
  const rows = (D.hs || ['1M', '3M', '6M', '1Y+']).map(H => { const c = cpOf(n, H); if (!c) return '';
    return `<span class="${H === S.h ? 'wh' : 'muted'}">${H}</span>${cpBar(c, 'wide')}<span class="r">${cpLab(c)}</span>${cpMove(c)}`; }).join('');
  if (!rows) return '';
  const c = cpOf(n), wk = c && cpWk(c);
  const adds = c && wk != null ? ` A week earlier (${day(n.wk_settle)}, same expiries) ${Math.round(wk * 100)}% calls: calls <b class="${c[0] >= c[2] ? 'up' : 'dn'}">${c[0] - c[2] >= 0 ? '+' : '−'}${kf(Math.abs(c[0] - c[2]))}</b>, puts <b class="${c[1] >= c[3] ? 'dn' : 'up'}">${c[1] - c[3] >= 0 ? '+' : '−'}${kf(Math.abs(c[1] - c[3]))}</b>.` : '';
  return `<div class="card2"><h4><span>Calls : puts</span><span>open contracts</span></h4><div class="cpg">${rows}</div>
    ${c ? `<div class="txt" style="margin-top:6px">${S.h}: <b>${kf(c[0])}</b> calls vs <b>${kf(c[1])}</b> puts open, ${Math.round(cpShare(c) * 100)}% calls.${adds}</div>` : ''}
    <div class="note" style="margin-top:4px">Green = calls' share, red = puts'. White tick = a week ago. Every strike counts (in the money too); one contract = 100 shares, whatever its price.</div></div>`;
}
function cpCell(r, per) {
  const c = cpOf(r);
  if (!c) return '<span class="muted">–</span>';
  return `<div class="cp" title="${per ? cpTip(c, S.h, 'on ' + day(r.first)) : cpTip(c)}"><div class="cpt">${cpLab(c)}${cpMove(c, per ? '' : '1W ')}</div>${cpBar(c)}</div>`;
}
const bizCls = v => v >= 70 ? 'hi' : v >= 50 ? 'mid' : 'lo';
function bizCell(r) {
  if (r.biz == null) return `<span class="muted bzna">${r.sec === 'Fund' ? 'fund' : '–'}</span>`;
  return `<span class="bz ${bizCls(r.biz)}" title="business score ${r.biz}/100 (not used for ranking)"><i><b style="width:${r.biz}%"></b></i><span class="num">${r.biz}</span></span>`;
}
const BIZLAB = { rev_yoy: 'Revenue YoY', eps_yoy: 'EPS YoY', peg: 'PEG', fcf_growth: 'FCF growth', fcf_margin: 'FCF margin', rev_qoq: 'Revenue QoQ' };
function bizCard(sym, n) {
  const b = n.bizm;
  if (!b) return `<div class="card2"><h4><span>Business</span><span class="muted">${n.sector === 'Fund' ? 'fund' : 'no score'}</span></h4><div class="note">${n.sector === 'Fund' ? 'Funds have no business score.' : 'Fewer than 4 of the 6 numbers are reported for this company.'}</div></div>`;
  const cls = bizCls(b.score), order = ['rev_yoy', 'eps_yoy', 'peg', 'fcf_growth', 'fcf_margin', 'rev_qoq'];
  const val = (k, v) => v == null ? (k === 'peg' && b.peg_note ? (b.peg_note === 'loss' ? 'loss' : 'EPS falling') : 'n/a') : k === 'peg' ? v.toFixed(2) : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
  const hasW = b.m.some(x => x[2] != null);
  const rows = order.map(k => b.m.find(x => x[0] === k)).filter(Boolean).map(([k, , w, v, p]) =>
    `<span>${BIZLAB[k]}</span><span class="num r">${val(k, v)}</span><i class="pbar"><b class="${p == null ? 'lo' : bizCls(p)}" style="width:${p ?? 0}%"></b></i><span class="num r">${p == null ? '–' : Math.round(p)}</span>${hasW ? `<span class="num r muted">${w}%</span>` : ''}`).join('');
  const cap = b.mcap ? (b.mcap >= 1e12 ? '$' + (b.mcap / 1e12).toFixed(2) + 'T' : '$' + (b.mcap / 1e9).toFixed(b.mcap >= 1e11 ? 0 : 1) + 'B') : null;
  return `<div class="card2"><h4><span>Business</span><span class="muted">shown, not used for ranking</span></h4>
    <div class="bzbig"><b class="bzt ${cls}">${b.score}</b><span class="muted">/100</span><span class="bz wide ${cls}"><i><b style="width:${b.score}%"></b></i></span><span class="muted">${cls === 'hi' ? 'strong' : cls === 'mid' ? 'middling' : 'weak'}</span></div>
    <div class="bzgrid${hasW ? '' : ' now'}"><span class="muted h">Number</span><span class="muted h r">Value</span><span class="muted h">vs S&amp;P + NDX</span><span class="muted h r">pctl</span>${hasW ? '<span class="muted h r">wt</span>' : ''}${rows}</div>
    <div class="note" style="margin-top:6px">${cap ? cap + ' market cap · ' : ''}${esc(n.sector || '')}. Each number is ranked against the S&amp;P 500 + Nasdaq-100 (0 = worst, 100 = best; for PEG lower is better); the score is their weighted mix.</div></div>`;
}
function scoreCell(v) { return `<span class="sc"><i><b style="width:${Math.max(0, Math.min(100, v || 0))}%"></b></i><span class="num">${(v || 0).toFixed(0)}</span></span>`; }


function duo(r, per) {
  const c = cpOf(r);
  let mv = '';
  if (c) { const wk = cpWk(c), d = wk == null ? null : (cpShare(c) - wk) * 100, when = per ? day(r.first) : '1W';
    mv = d == null ? `<span class="muted">${when} n/a</span>` : Math.abs(d) < 1 ? `<span class="muted">${when} =</span>`
      : `<span class="${d > 0 ? 'up' : 'dn'}">${when} ${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(0)}pt</span>`; }
  const cp = `<div class="pk"><div class="pkh"><span>Calls : puts</span>${c ? `<span>${Math.round(cpShare(c) * 100)}%<span class="cw"> calls</span></span>` : ''}</div>` +
    (c ? `<div class="pkv"><span>${cpLab(c)}</span>${mv}</div>${cpBar(c, 'wide')}` : '<div class="pkv"><span class="muted">n/a</span></div>') + '</div>';
  const b = r.biz, cls = b == null ? 'lo' : bizCls(b);
  const bz = `<div class="pk"><div class="pkh"><span>Business</span>${b == null ? '' : `<span class="bzt ${cls}">${cls === 'hi' ? 'strong' : cls === 'mid' ? 'middling' : 'weak'}</span>`}</div>` +
    `<div class="pkv">${b == null ? `<span class="muted">${r.sec === 'Fund' ? 'fund' : 'no score'}</span>` : `<span><b class="bzt ${cls}">${b}</b><span class="muted"> /100</span></span>`}</div>` +
    (b == null ? '' : `<span class="bz ${cls}"><i><b style="width:${b}%"></b></i></span>`) + '</div>';
  return `<div class="duo" title="${c ? cpTip(c, S.h, per ? 'on ' + day(r.first) : undefined) : ''}">${cp}${bz}</div>`;
}
const cardW = () => Math.max(200, Math.min(window.innerWidth - 22, 520));

const PSORT = [['sc', 'Score'], ['biz', 'Business'], ['cp', 'Calls share'], ['up', 'Stack'], ['x', '×'], ['days', 'Days on list']];
function sortBar() {
  const [k, d] = SORT();
  return `<div class="sortbar"><span class="muted">Sort</span><select id="sortsel">${PSORT.map(([v, t]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${t}</option>`).join('')}${PSORT.some(x => x[0] === k) ? '' : `<option value="${k}" selected>${k}</option>`}</select>
    <button class="chip" data-dir="1" title="flip the order">${d < 0 ? '▼ high first' : '▲ low first'}</button></div>`;
}


function renderBar() {
  const rows = D.rows;
  const counts = HS.map(H => rows.filter(r => inList(r) && (r[K()] || {})[H] && r[K()][H].v === 'match').length);
  const lc = { all: rows.length, ...D.lists };
  const st = STATUS || {};
  const ageH = (Date.now() - new Date(D.built).getTime()) / 3.6e6;
  const dot = st.ok === false ? 'err' : ageH > 30 ? 'stale' : '';
  const built = new Date(D.built).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  $('#bar').innerHTML = `<span id="brand">GEX HUNT</span>
    <button class="tab ${S.v !== 'record' ? 'on' : ''}" data-v="board">Board</button><button class="tab ${S.v === 'record' ? 'on' : ''}" data-v="record">Record</button>
    <button class="negtog ${PUT() ? 'on' : ''}" data-side="1" title="Switch to the reverse: a put-GEX stack below the price, few calls above"><i></i>Negative GEX</button>
    <span class="sep"></span>${HS.map((H, i) => `<button class="chip ${H === S.h ? 'on' : ''}" data-h="${H}" title="expiries counted">${H}<span class="c">${counts[i]}</span></button>`).join('')}
    <span class="sep"></span>${LISTS.map(([k, t]) => `<button class="chip ${k === S.l ? 'on' : ''}" data-l="${k}">${NARROW() && k === 'wl' ? 'WL1' : t}<span class="c">${lc[k] ?? ''}</span></button>`).join('')}
    <input id="q" placeholder="Find a ticker" spellcheck="false" autocomplete="off" value="${esc(S.q)}">
    <span id="status" title="${esc(st.error || '')}"><b class="${dot}"></b>${day(D.day)} close · OI ${day(D.settle)} settle · built ${built}${st.ok === false ? ' · last build FAILED' : ''}</span>`;
  document.body.classList.toggle('neg', PUT());
  const q = $('#q');
  q.addEventListener('input', () => { S.q = q.value.trim().toUpperCase();
    if (S.v === 'board') return renderMain();
    go({ v: 'board', s: null }); const q2 = $('#q'); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); });
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const r = D.rows.find(x => x.s === S.q) || D.rows.find(x => matchQ(x, S.q)); if (r) { S.q = ''; q.value = ''; go({ v: 'detail', s: r.s, d: null }); } }
    if (e.key === 'Escape') { S.q = ''; q.value = ''; renderMain(); }
  });
}
function viewBar() {
  const days = (D.saved_days || []).slice().reverse();
  if (!days.includes(D.day)) days.unshift(D.day);
  const sel = S.d || D.day;
  return `<div class="viewbar"><span class="muted">View</span>${PERS.map(([k, t]) => `<button class="chip ${k === S.per ? 'on' : ''}" data-per="${k}">${t}</button>`).join('')}
    ${S.per === 'today' ? `<span class="sep"></span><span class="muted">Day</span><select id="daysel">${days.map(d => `<option value="${d}" ${d === sel ? 'selected' : ''}>${dayW(d)}${d === D.day ? ' · latest' : ''}</option>`).join('')}</select>` : ''}
    ${S.per === 'today' ? `<span class="sep"></span><button class="tog ${S.near ? 'on' : ''}" data-near="1" title="names that pass every rule but one"><i></i>Near misses</button>` : ''}
    <span class="muted hist">History from ${day(D.history.first_day)} · ${(D.saved_days || []).length} saved days</span></div>`;
}
function wireViewBar() {
  const ds = $('#daysel');
  if (ds) ds.addEventListener('change', () => go({ d: ds.value === D.day ? null : ds.value }, false));
  const ss = $('#sortsel');
  if (ss) ss.addEventListener('change', () => { const nx = [ss.value, ss.value === 's' ? 1 : -1]; go(S.per === 'today' ? { sort: nx } : { psort: nx }, false); });
}


function ruleStrip() {
  const w = W();
  return `<div class="rule"><span class="t">${w.pat}</span>
    <span class="r">a ${w.mine} stack ${w.where} that <b>dwarfs</b> the ${w.theirs}s ${w.there}</span>
    <span class="r"><b>big</b> for the stock's trading</span>
    <span class="r"><b>two or more</b> levels, one <b>well ${w.where}</b> the price</span>
    <span class="r">centred <b>well ${w.where}</b> the price</span>
    <span class="r">no <b>big</b> ${w.theirs} bar ${w.there}</span>
    <span class="r">net GEX <b>${PUT() ? 'negative' : 'positive'}</b></span>
    ${PUT() ? `<span class="note" style="flex-basis:100%">The negative side is judged less strictly on lopsidedness than the call side: calls sit above the price almost everywhere, so an exact mirror finds almost nothing.</span>` : ''}</div>`;
}
function tiles(G) {
  const m = G.m, w = W(), past = pastDay();
  const newN = m.filter(r => hh(r).new).length;
  const left = past ? [] : (((D.history.left || {})[S.side] || {})[S.h] || []).filter(s => { const r = D.rows.find(x => x.s === s); return r && inList(r); });
  let ref;
  if (!PUT()) {
    const nx = srcRows().find(r => r.s === 'NXPI');
    if (nx && inList(nx) && hh(nx)) { const g = hh(nx), rk = G.byScore.indexOf(nx) + 1;
      ref = `<div class="tile lnk" data-s="NXPI"><div class="k">Reference · NXPI</div><div class="v num">${rk ? '#' + rk : g.v === 'near' ? 'near miss' : 'off'} <small>score ${g.sc.toFixed(0)}</small></div><div class="s">${fm(g.up)} above vs ${fm(g.dn)} below · ${xS(g.x)}</div></div>`;
    } else ref = `<div class="tile"><div class="k">Reference · NXPI</div><div class="v"><small>not on ${past ? 'that day' : 'this list'}</small></div></div>`;
  } else {
    const t = G.byScore[0];
    ref = t ? `<div class="tile lnk" data-s="${t.s}"><div class="k">Top put stack</div><div class="v num">${t.s} <small>score ${hh(t).sc.toFixed(0)}</small></div><div class="s">${fm(-hh(t).up)} below vs ${fm(hh(t).dn)} above · ${xS(hh(t).x)}</div></div>`
      : `<div class="tile"><div class="k">Top put stack</div><div class="v"><small>none</small></div></div>`;
  }
  const big = m.slice().sort((a, b) => hh(b).up - hh(a).up)[0];
  const frs = m.filter(r => fr(r)).sort((a, b) => fr(b)[0] - fr(a)[0])[0];
  const fl = D.counts[S.side][S.h].fails || {};
  return `<div class="tiles">
    <div class="tile"><div class="k">Matches · ${S.h}${past ? ' · ' + day(S.d) : ''}</div><div class="v num">${m.length} <small>of ${past ? 'saved' : G.all.length}</small></div><div class="s">${G.n.length} near misses${!past && D.history.days.length > 1 ? ` · <b>${newN}</b> new · <b>${left.length}</b> left` : ''}<br><b>${m.filter(r => (r.biz ?? 0) >= 70).length}</b> with business 70+${m.filter(r => (r.biz ?? 0) >= 70).length ? ': ' + m.filter(r => (r.biz ?? 0) >= 70).map(r => r.s).join(', ') : ''}</div></div>
    ${ref}
    <div class="tile ${big ? 'lnk' : ''}" ${big ? `data-s="${big.s}"` : ''}><div class="k">Biggest ${w.mine} stack</div><div class="v num">${big ? big.s + ` <small>${stackS(hh(big).up)}</small>` : '<small>–</small>'}</div><div class="s">${big ? (hh(big).rel * 100).toFixed(1) + "% of a day's $ volume" : ''}</div></div>
    <div class="tile ${frs ? 'lnk' : ''}" ${frs ? `data-s="${frs.s}"` : ''}><div class="k">Most ${w.addedLong} · 1 week</div><div class="v num">${frs ? frs.s + ` <small>${fr(frs)[0] >= 0 ? '+' : ''}${kf(fr(frs)[0])}</small>` : '<small>–</small>'}</div><div class="s">${frs ? `contracts at its levels (${pc(fr(frs)[1])})` : 'no week-ago snapshot'}</div></div>
    <div class="tile"><div class="k">Why names drop out · today</div><div class="s">${[['ratio', `${w.theirs}s ${w.there} too big`], ['rel', 'stack small for the stock'], ['negbar', `one big ${w.theirs} bar`], ['com', 'stack hugs the price']].map(([k, t]) => `<b class="num">${fl[k] || 0}</b> ${t}`).join('<br>')}</div></div>
  </div>` + (left.length ? `<div class="leftline">Left the list since ${day(D.history.days[D.history.days.length - 2])}: ${left.map(s => `<span class="lnk" data-s="${s}">${s}</span>`).join('')}</div>` : '');
}
function cols() {
  const w = W();
  return [['rk', '#', 0], ['s', 'Stock', 1], ['px', 'Price · 20d', 1, 'r'], ['b', `GEX by strike<br><span class="thsub">below ← price → above</span>`, 0],
    ['up', w.stack, 1, 'r'], ['dn', w.other, 1, 'r'], ['x', '×', 1, 'r'], ['lv', w.levels, 1], ['com', 'Centre', 1, 'r'],
    ['fr', w.added, 1, 'r'], ['cp', 'Calls : Puts', 1], ['tf', 'KDJ 1W · 2W · 1M', 0], ['biz', 'Business', 1], ['sc', 'Score', 1]];
}
function headRow(C) {
  const [sk0, sd] = SORT();
  return '<tr>' + C.map(([k, t, so, al]) => { const on = sk0 === k;
    return `<th class="${so ? 'sortable' : ''} ${on ? 'on' : ''} ${al || ''}" ${so ? `data-sort="${k}"` : ''}>${t}${on ? `<span class="ar">${sd < 0 ? '▼' : '▲'}</span>` : ''}</th>`; }).join('') + '</tr>';
}
function tableRow(r, i, kind) {
  const g = hh(r);
  const mid = kind === 'match'
    ? `<td>${chips(r)}</td><td class="r num">${comS(g.com)}</td><td class="r num">${freshCell(r)}</td>`
    : `<td class="why" colspan="3">${kind === 'near' ? '✕ ' : ''}${esc((g.why || []).join(' · ') || '—')}</td>`;
  return `<tr class="row ${kind}" data-s="${r.s}"><td class="rk">${kind === 'match' ? i + 1 : ''}</td>
    <td><div class="tk">${r.s}${kind === 'match' ? daysCell(g) : ''}</div><div class="nm">${esc(r.n || '')}</div></td>
    <td class="r num">${r.px.toFixed(2)}<br><span class="${(r.r20 || 0) >= 0 ? 'up' : 'dn'}" style="font-size:12px">${pc(r.r20, 1)}</span></td>
    <td>${glyph(r)}</td>
    <td class="r num"><span class="${PUT() ? 'dn' : 'wh'}">${stackS(g.up)}</span><br><span class="muted" style="font-size:11.5px">${((g.rel || 0) * 100).toFixed(1)}% of $vol</span></td>
    <td class="r num ${PUT() ? 'up' : 'dn'}">${otherS(g.dn)}</td><td class="r num wh">${xS(g.x)}</td>
    ${mid}<td>${cpCell(r)}</td><td>${kdj(r)}</td><td>${bizCell(r)}</td><td>${scoreCell(g.sc)}</td></tr>`;
}
function card(r, i, kind) {
  const g = hh(r), w = W();
  return `<div class="pcard ${kind}" data-s="${r.s}"><div class="r1"><span>${kind === 'match' ? `<span class="muted">${i + 1}</span> ` : ''}<b class="wh" style="font-size:15px">${r.s}</b> <span class="muted num" style="font-size:12px">${r.px.toFixed(2)} <span class="${(r.r20 || 0) >= 0 ? 'up' : 'dn'}">${pc(r.r20, 1)}</span></span>${kind === 'match' ? daysCell(g) : ''}</span>${scoreCell(g.sc)}</div>
    <div style="margin-top:5px">${glyph(r, cardW(), 40)}</div>
    <div class="r3 num"><span>stack <b class="${PUT() ? 'dn' : ''}">${stackS(g.up)}</b></span><span>${w.theirs}s <b class="${PUT() ? 'up' : 'dn'}">${otherS(g.dn)}</b></span><span><b>${xS(g.x)}</b></span><span>centre <b>${comS(g.com)}</b></span><span>${w.added} <b>${fr(r) ? pc(fr(r)[1]) : 'n/a'}</b></span></div>
    ${duo(r)}
    ${kind === 'match' ? `<div style="margin-top:4px">${chips(r, 5)}</div>` : `<div class="why">${kind === 'near' ? '✕ ' : ''}${esc((g.why || []).join(' · '))}</div>`}</div>`;
}
async function renderBoard() {
  if (pastDay() && !DAYB[S.d]) {
    $('#main').innerHTML = viewBar() + `<div class="empty">Loading ${dayW(S.d)}…</div>`; wireViewBar();
    try { await loadDay(S.d); } catch (e) { $('#main').innerHTML = viewBar() + `<div class="empty">No saved board for ${esc(S.d)}.</div>`; wireViewBar(); return; }
    if (S.v !== 'board' || S.per !== 'today') return;
  }
  const G = groups(), q = S.q, past = pastDay();
  let m = G.m, n = S.near ? G.n : [], other = [];
  if (q) {
    m = m.filter(r => matchQ(r, q)); n = G.n.filter(r => matchQ(r, q));
    if (!past) other = G.all.filter(r => !['match', 'near'].includes(hh(r).v) && matchQ(r, q)).sort((a, b) => (a.s === q ? -1 : 0) - (b.s === q ? -1 : 0) || a.s.localeCompare(b.s)).slice(0, 25);
  }
  const rank = r => G.m.indexOf(r);
  let h = viewBar();
  if (past) { const x = DAYB[S.d];
    h += `<div class="pastnote">Saved board for <b>${dayW(S.d)}</b> · close ${day(S.d)} · OI ${day(x.settle)} settle${String(x.source || '').startsWith('oiarchive') ? ' · rebuilt from saved open-interest snapshots' : ''}. Rows are as they were that day. Click a name to see today's chart with that day's levels dashed. <span class="lnk" data-d="">Back to latest →</span></div>`; }
  h += ruleStrip() + tiles(G);
  if (NARROW()) {
    h += sortBar() + m.map(r => card(r, rank(r), 'match')).join('');
    if (!m.length) h += `<div class="empty" style="padding:24px 12px">${q ? 'No match for “' + esc(q) + '”.' : 'No name matches every rule in this window' + (past ? ' that day.' : ' today.')}</div>`;
    if (n.length) h += `<div class="sect" style="padding:12px 10px 6px"><b>Near misses</b> · one rule off</div>` + n.map(r => card(r, 0, 'near')).join('');
    if (other.length) h += `<div class="sect" style="padding:12px 10px 6px"><b>Other names</b></div>` + other.map(r => card(r, 0, 'other')).join('');
  } else {
    const C = cols();
    h += `<div class="tw"><table class="hunt"><thead>${headRow(C)}</thead><tbody>` + m.map(r => tableRow(r, rank(r), 'match')).join('');
    if (!m.length) h += `<tr class="secrow"><td colspan="${C.length}" class="muted" style="padding:16px 8px">${q ? 'No match for “' + esc(q) + '”.' : 'No name matches every rule in this window' + (past ? ' that day.' : ' today.')}</td></tr>`;
    if (n.length) h += `<tr class="secrow"><td colspan="${C.length}"><div class="sect"><b>Near misses</b> · pass every rule but one, shown so the cut-offs can be argued with</div></td></tr>` + n.map(r => tableRow(r, 0, 'near')).join('');
    if (other.length) h += `<tr class="secrow"><td colspan="${C.length}"><div class="sect"><b>Other names</b> · why they are not on the list</div></td></tr>` + other.map(r => tableRow(r, 0, 'other')).join('');
    h += '</tbody></table></div>';
  }
  h += foot();
  $('#main').innerHTML = h;
  wireViewBar();
}
function foot() {
  return `<div class="foot">Bars are GEX by strike: net calls − puts per strike, $ per 1% move, priced at the close, every expiry in the ${S.h} window. Green = mostly call open interest, red = mostly puts (the usual convention; public open interest can't show whether dealers are long or short). "${W().added}" = ${W().mine} open interest at the stack's levels vs the settle a week earlier, same expiries still open. "Calls : Puts" = all open call vs put contracts in the window's expiries (every strike); the white tick and ▲/▼ = the call share a week earlier, same expiries. Rebuilt once a day from end-of-day options open interest. ${D.canonical ? '' : `<span class="am">This build already carries the ${day(D.settle)} settle (next-morning data) with the ${day(D.day)} close; saved days and the record use the evening build.</span>`} History starts ${day(D.history.first_day)}; days before the live build were rebuilt from saved open-interest snapshots. Untested as a signal: see Record.</div>`;
}


async function renderPeriod() {
  if (!PER) { $('#main').innerHTML = viewBar() + '<div class="empty">Loading…</div>'; wireViewBar(); }
  const P = await loadPeriods();
  if (S.v !== 'board' || S.per === 'today') return;
  const X = P.sides[S.side][S.h][S.per], w = W(), win = D.history.days.slice(-X.n);
  let rows = X.rows.filter(inList);
  if (S.q) rows = rows.filter(r => matchQ(r, S.q));
  rows = sorted(rows);
  const onN = rows.filter(r => r.on).length, touched = rows.filter(r => r.touched).length;
  const label = { '1W': 'last 5 sessions', '1M': 'last 21 sessions', ALL: 'all history' }[S.per];
  let h = viewBar() + `<div class="pastnote">${w.pat} · <b>${S.h}</b> · ${label}: <b>${X.n}</b> saved day${X.n === 1 ? '' : 's'}, ${dayW(X.start)} → ${dayW(X.end)}${X.n < ({ '1W': 5, '1M': 21 }[S.per] || 0) ? ` <span class="am">(history only goes back to ${day(D.history.first_day)}, so this window is short)</span>` : ''}. Ranked by days on the list. Each row shows the board as it was on its last day on the list, and what price did after its first day in the window.</div>`;
  h += `<div class="tiles t4">
    <div class="tile"><div class="k">Names on the list at some point</div><div class="v num">${rows.length}</div><div class="s">${onN} still on today · ${rows.length - onN} left</div></div>
    <div class="tile"><div class="k">On every day</div><div class="v num">${rows.filter(r => r.days === X.n).length}</div><div class="s">the persistent stacks</div></div>
    <div class="tile"><div class="k">Reached their first level</div><div class="v num">${touched} <small>of ${rows.length}</small></div><div class="s">a daily ${w.where === 'above' ? 'high' : 'low'} at or past it after the first day</div></div>
    <div class="tile"><div class="k">Median move since first day</div><div class="v num">${med(rows.map(r => r.ret).filter(x => x != null))}</div><div class="s">no controls here: see Record for the fair test</div></div></div>`;
  const C = [['rk', '#', 0], ['s', 'Stock', 1], ['days', 'Days on list', 1], ['st', 'Status', 0], ['b', 'GEX by strike<br><span class="thsub">last day on the list</span>', 0],
    ['up', w.stack, 1, 'r'], ['x', '×', 1, 'r'], ['lv', w.levels, 0], ['ret', 'Since first day', 1, 'r'], ['cp', 'Calls : Puts<br><span class="thsub">tick = first day</span>', 1], ['best', 'First level', 1], ['biz', 'Business', 1], ['sc', 'Score', 1]];
  if (NARROW()) {
    h += sortBar() + rows.map((r, i) => `<div class="pcard" data-s="${r.s}" data-d="${r.first}"><div class="r1"><span><span class="muted">${i + 1}</span> <b class="wh" style="font-size:15px">${r.s}</b> ${statusCell(r)}</span><span class="num">${dots(r, win)}</span></div>
      <div style="margin-top:5px">${glyph(r, cardW(), 40)}</div>
      <div class="r3 num"><span>on <b>${r.days} of ${X.n}</b></span><span>since ${day(r.first)} <b class="${(r.ret || 0) >= 0 ? 'up' : 'dn'}">${pc(r.ret, 1)}</b></span><span>first level <b>${sk(r.k1)}</b> ${bestCell(r)}</span></div>${duo(r, true)}</div>`).join('') ||
      `<div class="empty" style="padding:24px 12px">No name was on the list in this window.</div>`;
  } else {
    h += `<div class="tw"><table class="hunt"><thead>${headRow(C)}</thead><tbody>` + rows.map((r, i) => { const g = hh(r);
      return `<tr class="row match" data-s="${r.s}" data-d="${r.first}"><td class="rk">${i + 1}</td><td><div class="tk">${r.s}</div><div class="nm">${esc(r.n || '')}</div></td>
        <td class="num">${dots(r, win)}<div class="muted" style="font-size:11.5px">${r.days} of ${X.n} · first ${day(r.first)}</div></td><td>${statusCell(r)}</td>
        <td>${glyph(r)}</td><td class="r num"><span class="${PUT() ? 'dn' : 'wh'}">${stackS(g.up)}</span><br><span class="muted" style="font-size:11.5px">${day(r.last)}</span></td>
        <td class="r num wh">${xS(g.x)}</td><td>${chips(r)}</td>
        <td class="r num"><span class="${(r.ret || 0) >= 0 ? 'up' : 'dn'}">${pc(r.ret, 1)}</span><br><span class="muted" style="font-size:11.5px">${r.px0.toFixed(2)} → ${r.px_now != null ? r.px_now.toFixed(2) : '–'}</span></td>
        <td>${cpCell(r, true)}</td><td class="num">${sk(r.k1)} <span class="muted">${pc(r.d1)}</span><br>${bestCell(r)}</td><td>${bizCell(r)}</td><td>${scoreCell(g.sc)}</td></tr>`; }).join('') +
      (rows.length ? '' : `<tr class="secrow"><td colspan="${C.length}" class="muted" style="padding:16px 8px">No name was on the list in this window.</td></tr>`) + '</tbody></table></div>';
  }
  h += `<div class="foot">"Since first day" = the close on the first day in the window → the latest close. "First level" = the nearest level ${w.where} the price on that first day; touched means a daily ${w.where === 'above' ? 'high' : 'low'} reached it on a later session (s3 = the 3rd session after). "Calls : Puts" = today's open call vs put contracts in the window's expiries; the white tick and ▲/▼ = the split on the name's first day in the window (the expiries open then). Click a row for today's chart with the first day's levels dashed. These numbers have no controls and the windows overlap: a rally lifts every name. The Record tab compares each new entry with the options' own odds and with similar stocks that did not match.</div>`;
  $('#main').innerHTML = h;
  wireViewBar();
}
const med = v => { if (!v.length) return '–'; const s = v.slice().sort((a, b) => a - b), m = s.length >> 1; return pc(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2, 1); };
function dots(r, win) {
  const on = new Set(r.ds || []);
  return `<span class="dots" title="${win.map(d => day(d) + (on.has(d) ? ' ✓' : '')).join(' · ')}">${win.map(d => `<i class="${on.has(d) ? 'on' : ''}"></i>`).join('')}</span>`;
}
function statusCell(r) {
  if (r.on && r.days === 1 && r.first === D.day) return '<span class="badge new">NEW</span>';
  if (r.on) return '<span class="badge onl">ON LIST</span>';
  return `<span class="badge left">LEFT ${r.left ? day(r.left).toUpperCase() : ''}</span>`;
}
function bestCell(r) {
  if (r.touched) return `<span class="hit">✓ touched s${r.touched}</span>`;
  if (r.best == null) return '<span class="open">no sessions yet</span>';
  return `<span class="open">${Math.abs(r.best * 100).toFixed(1)}% short</span>`;
}


function niceStep(range, n = 8) {
  const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) || 10 * p;
}
function chartSVG(n, Wd, Hh, asof) {
  const g = n[K()][S.h], lv = n.lv[S.h], S0 = n.spot, O = n.ohlc.slice(-130), L = g.levels || [], put = PUT();
  const ks = L.map(l => l.k).concat(asof ? asof.lv.map(l => l[0]) : []);
  const lvHi = ks.length ? Math.max(...ks, S0) : S0, lvLo = ks.length ? Math.min(...ks, S0) : S0;
  const lo = Math.min(...O.map(r => r[3]), lvLo, S0 * 0.85) * (put ? 0.93 : 0.97), hi = Math.max(...O.map(r => r[2]), lvHi, S0 * 1.08) * (put ? 1.03 : 1.08);
  const narrow = Wd < 700, padR = 62, cw = Wd - padR, cx1 = cw * (narrow ? 0.42 : 0.52), bx0 = cx1 + 12, bx1 = cw - (narrow ? 120 : 215);
  const top = 8, bot = Hh - 26, y = p => top + (hi - p) / (hi - lo) * (bot - top);
  let s = `<svg width="${Wd}" height="${Hh}" viewBox="0 0 ${Wd} ${Hh}" style="display:block;font-variant-numeric:tabular-nums;font-family:inherit">`;
  const st = niceStep(hi - lo);
  for (let p = Math.ceil(lo / st) * st; p < hi; p += st) s += `<line x1="0" x2="${cw}" y1="${y(p)}" y2="${y(p)}" stroke="#1e2230"/><text x="${cw + 7}" y="${y(p) + 4}" fill="#787b86" font-size="11">${p.toFixed(st < 1 ? 2 : st < 10 ? 1 : 0)}</text>`;
  s += `<line x1="${cw}" x2="${cw}" y1="0" y2="${bot}" stroke="#2a2e39"/>`;
  if (g.up > 0 && L.length) {
    if (put) { const b = Math.min(...L.map(l => l.k)) * 0.98; s += `<rect x="0" y="${y(S0 * 0.98)}" width="${cw}" height="${Math.max(0, y(b) - y(S0 * 0.98))}" fill="rgba(239,83,80,.07)"/>`; }
    else { const t = Math.max(...L.map(l => l.k)) * 1.02; s += `<rect x="0" y="${y(t)}" width="${cw}" height="${Math.max(0, y(S0 * 1.02) - y(t))}" fill="rgba(38,166,154,.06)"/>`; }
  }
  const cwid = cx1 / O.length;
  O.forEach((r, i) => { const [, o, h, l, c] = r, x = i * cwid + cwid / 2, col = c >= o ? '#26a69a' : '#ef5350';
    s += `<line x1="${x}" x2="${x}" y1="${y(h)}" y2="${y(l)}" stroke="${col}"/><rect x="${x - cwid * 0.35}" y="${y(Math.max(o, c))}" width="${Math.max(1, cwid * 0.7)}" height="${Math.max(1, Math.abs(y(o) - y(c)))}" fill="${col}"/>`; });
  let lastM = -1, lastX = -99;
  O.forEach((r, i) => { const d = new Date(r[0] * 1000), mo = d.getUTCMonth(); if (mo !== lastM && d.getUTCDate() <= 7) { lastM = mo; if (i * cwid - lastX < 34) return; lastX = i * cwid; s += `<text x="${i * cwid}" y="${Hh - 8}" fill="#787b86" font-size="11">${d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</text>`; } });
  if (asof) {
    const ix = O.findIndex(r => new Date(r[0] * 1000).toISOString().slice(0, 10) === asof.day);
    if (ix >= 0) { const x = ix * cwid + cwid / 2; s += `<line x1="${x}" x2="${x}" y1="${top}" y2="${bot}" stroke="#b39ddb" stroke-dasharray="3,3"/><text x="${Math.max(2, x - 44)}" y="${bot - 28}" fill="#b39ddb" font-size="11">${day(asof.day)}</text>`; }
    asof.lv.forEach(([k]) => { if (k > lo && k < hi) s += `<line x1="0" x2="${cw}" y1="${y(k)}" y2="${y(k)}" stroke="#b39ddb" stroke-opacity=".7" stroke-dasharray="5,4"/><text x="4" y="${y(k) - 3}" fill="#b39ddb" font-size="10.5">${sk(k)} · ${day(asof.day)}</text>`; });
  }
  const bars = (n.bars[S.h] || []).filter(b => b[0] > lo && b[0] < hi), mx = Math.max(1, ...bars.map(b => Math.abs(b[1])));
  const kk = bars.map(b => b[0]).sort((a, b) => a - b); let gap = Infinity; for (let i = 1; i < kk.length; i++) gap = Math.min(gap, kk[i] - kk[i - 1]);
  const bh = Math.max(2, Math.min(14, isFinite(gap) ? (y(0) - y(gap)) * 0.75 : 6));
  const blen = v => Math.abs(v) / mx * (bx1 - bx0);
  bars.forEach(([k, net]) => { const len = blen(net); if (len < 0.5) return;
    s += `<rect x="${bx0}" y="${y(k) - bh / 2}" width="${len}" height="${bh}" fill="${net > 0 ? (!put && k === g.kt ? '#3fbfae' : '#26a69a') : (put && k === g.kt ? '#ff6f6c' : '#ef5350')}" opacity=".88"><title>${sk(k)}: ${fm(net)}</title></rect>`; });
  if (lv.king > lo && lv.king < hi) {
    s += `<line x1="0" x2="${cw}" y1="${y(lv.king)}" y2="${y(lv.king)}" stroke="#f5d63d" stroke-width="1.5"/><rect x="${cw + 2}" y="${y(lv.king) - 9}" width="${padR - 4}" height="18" fill="#f5d63d" rx="2"/><text x="${cw + 7}" y="${y(lv.king) + 4}" font-size="11" fill="#131722" font-weight="700">${lv.king.toFixed(2)}</text>`;
  }
  const wall = put ? lv.call_wall : lv.put_wall;
  if (wall && wall > lo && wall < hi) {
    const pb = bars.find(b => b[0] === wall), px = Math.min(cw - 98, bx0 + (pb ? blen(pb[1]) : 0) + 6), col = put ? '#26a69a' : '#ef5350';
    s += `<line x1="0" x2="${cw}" y1="${y(wall)}" y2="${y(wall)}" stroke="${col}" stroke-width="1.3"/><rect x="${px}" y="${y(wall) - 9}" width="92" height="18" rx="3" fill="${col}"/><text x="${px + 46}" y="${y(wall) + 4}" font-size="11" fill="#fff" text-anchor="middle" font-weight="600">${put ? 'CALL' : 'PUT'} WALL ${sk(wall)}</text>`;
  }
  s += `<line x1="0" x2="${cw}" y1="${y(S0)}" y2="${y(S0)}" stroke="#2962ff" stroke-dasharray="2,3"/><rect x="${cw + 2}" y="${y(S0) - 9}" width="${padR - 4}" height="18" fill="#2962ff" rx="2"/><text x="${cw + 7}" y="${y(S0) + 4}" font-size="11" fill="#fff">${S0.toFixed(2)}</text>`;
  L.forEach(d => { const yy = y(d.k), isK = d.k === lv.king;
    const t = `${isK ? 'KING ' : ''}${sk(d.k)} ${pc(d.k / S0 - 1)} · ${fm(d.gex)}${narrow ? '' : ' · ' + expS(d.exp)}`;
    const tw = t.length * 6.2 + 12, lx = Math.min(cw - tw - 6, bx0 + blen(d.gex) + 6);
    const fill = isK ? '#f5d63d' : put ? '#3a1d1f' : '#16302d', stroke = isK ? '#f5d63d' : put ? '#8a3b39' : '#2f6f66', tc = isK ? '#131722' : put ? '#f3a5a3' : '#9fe0d6';
    s += `<rect x="${lx}" y="${yy - 9}" width="${tw}" height="18" rx="3" fill="${fill}" stroke="${stroke}"/><text x="${lx + tw / 2}" y="${yy + 4}" font-size="11" fill="${tc}" text-anchor="middle" font-weight="${isK ? 700 : 500}">${t}</text>`; });
  const capA = put ? `CALLS ABOVE · ${g.dn ? fm(g.dn) : '$0'}${g.up > 0 ? `  →  the put stack is ${xS(g.x)} bigger` : ''}`
    : `${narrow ? 'STACK' : 'CALL STACK ABOVE'} · ${fm(g.up)} · ${L.length} level${L.length === 1 ? '' : 's'} · centre ${comS(g.com)}`;
  const capB = put ? `${narrow ? 'PUT STACK' : 'PUT STACK BELOW'} · ${fm(-g.up)} · ${L.length} level${L.length === 1 ? '' : 's'} · centre ${comS(g.com)}`
    : `PUTS BELOW · ${g.dn ? fm(g.dn) : '$0'}${g.up > 0 ? `  →  stack is ${xS(g.x)} bigger` : ''}`;
  s += `<text x="8" y="${top + 16}" fill="#7fd3c9" font-size="12.5" font-weight="600">${capA}</text>`;
  s += `<text x="8" y="${bot - 10}" fill="#e88a88" font-size="12.5" font-weight="600">${capB}</text>`;
  return s + '</svg>';
}
function verdictHead(r, g) {
  const G = groups(), rk = G.byScore.indexOf(r) + 1;
  if (g.v === 'match') return `<span class="kg">MATCH · score ${g.sc.toFixed(0)}${rk ? ` · #${rk} of ${G.m.length}` : ''}</span>`;
  if (g.v === 'near') return `<span class="am">NEAR MISS · score ${g.sc.toFixed(0)}</span>`;
  return `<span class="dn">NOT A MATCH · score ${g.sc.toFixed(0)}</span>`;
}
let ASOF = null;
async function renderDetail() {
  const sym = S.s, r = D.rows.find(x => x.s === sym);
  if (!r) { $('#main').innerHTML = `<div class="empty">${esc(sym)} is not in the GEX Hunt universe (no saved option chain or no daily history). <button class="btn g" data-v="board">← Board</button></div>`; return; }
  const G = groups(), w = W();
  const listRows = G.byScore.slice();
  const lst = `<div id="lst"><div class="h"><span>${G.m.length} ${PUT() ? 'negative ' : ''}matches · ${S.h}</span><span>score</span></div>` +
    (listRows.includes(r) ? '' : `<div class="grp">Selected</div>${lstItem(r, '')}<div class="grp">Matches</div>`) +
    listRows.map((x, i) => lstItem(x, i + 1)).join('') + '</div>';
  const prevSym = (($('#skFrame') || {}).dataset || {}).sym;
  if ($('#det #seekbox')) {
    $('#lst').outerHTML = lst; $('#cmain').innerHTML = `<div class="empty">Loading ${esc(sym)}…</div>`; $('#side').innerHTML = '';
    if (prevSym !== sym) $('#cbox').scrollTop = 0;
  } else {
    $('#main').innerHTML = `<div id="det">${lst}<div id="cbox"><div id="cmain"><div class="empty">Loading ${esc(sym)}…</div></div>${seekBox()}</div><div id="side"></div></div>`;
  }
  seekShow(sym);
  const selEl = $('#lst .it.sel'); if (selEl) selEl.scrollIntoView({ block: 'nearest' });
  let n;
  try { n = await loadName(sym); } catch (e) { $('#cmain').innerHTML = `<div class="empty">Could not load ${esc(sym)}: ${esc(e.message)}</div>`; return; }
  ASOF = null;
  if (S.d && S.d !== D.day) {
    try { const b = await loadDay(S.d), dr = b.rows.find(x => x.s === sym), e = dr && (dr[K()] || {})[S.h];
      if (e && e.lv) ASOF = { day: S.d, lv: e.lv, v: e.v, sc: e.sc, px: dr.px, up: e.up, dn: e.dn, x: e.x };
    } catch (e) {  }
  }
  if (S.s !== sym || S.v !== 'detail') return;
  const g = n[K()][S.h], lv = n.lv[S.h];
  if (!g) { $('#cmain').innerHTML = `<div class="empty">No ${S.h} data for ${esc(sym)}.</div>`; return; }
  $('#cmain').innerHTML = `<div id="chead"><span class="t"><b>${sym}</b> · ${esc(n.name || '')} · D</span>
    <span class="muted num">close ${n.spot.toFixed(2)} · <span class="${(n.ret20 || 0) >= 0 ? 'up' : 'dn'}">${pc(n.ret20, 1)} 20d</span> · GEX ${S.h} · King ${sk(lv.king)} · Flip ${lv.flip ? lv.flip.toFixed(1) : '—'} · Net ${fm(lv.net)}</span>
    <span style="margin-left:auto;display:flex;gap:6px"><button class="btn g" data-v="board">← Board</button></span></div>
    <div class="note" style="padding:0 4px 4px">${ASOF ? `<span class="asof">Dashed lines = the levels on ${dayW(ASOF.day)} (${ASOF.v === 'match' ? 'on the list' : 'near miss'}, price ${ASOF.px.toFixed(2)}). </span>` : ''}Price axis stretched to the whole stack. ${n.sector ? esc(n.sector) + ' · ' : ''}${(n.lists || []).map(l => ({ spx: 'S&P 500', ndx: 'Nasdaq-100', wl: 'Watchlist 1', ai: 'AI list' })[l]).filter(Boolean).join(' · ')}</div>
    <div id="chart"></div>`;
  drawChart(n);
  const ck = g.checks.map(([id, ok, t]) => `<span class="${ok ? 'y' : 'n'}">${ok ? '✓' : '✕'}</span><span>${esc(t)}</span>`).join('');
  const lt = (g.levels || []).map(d => { const dd = d.oi_wk != null && d.oi_all != null ? d.oi_all - d.oi_wk : null;
    return `<tr><td class="${d.k === g.kt ? 'kg' : ''}"><b>${sk(d.k)}</b></td><td>${pc(d.k / n.spot - 1)}</td><td>${d.sigma != null ? d.sigma.toFixed(1) + 'σ' : '–'}</td><td>${fm(d.gex)}</td><td>${kf(PUT() ? d.put_oi || 0 : d.call_oi || 0)}</td><td>${expS(d.exp)}</td><td class="${dd != null && dd >= 1000 ? 'up' : ''}">${dd == null ? 'n/a' : (dd >= 0 ? '+' : '−') + kf(Math.abs(dd))}</td></tr>`; }).join('');
  const P = g.pct || {}, pb = (lab, v) => `<div class="pb"><span>${lab}</span><i><b style="width:${(v || 0) * 100}%"></b></i><span class="num" style="text-align:right">${Math.round((v || 0) * 100)}th</span></div>`;
  const f = g.fr, dd = f && f[1] ? f[0] - f[1] : null, fresh = dd != null && dd >= 1000 && dd / f[1] >= 0.10;
  const grew = (g.levels || []).filter(d => d.oi_wk > 0 && d.oi_all - d.oi_wk >= 200 && (d.oi_all - d.oi_wk) / d.oi_wk >= 0.10);
  const exps = [...new Set((g.levels || []).map(d => d.exp && expS(d.exp).replace(/ \d+ /, ' ')).filter(Boolean))].join(' / ');
  let recTxt = '';
  try { const R = await loadRecord(); const es = (((R.sides[S.side] || {})[S.h] || {}).entries || []).filter(e => e.sym === sym);
    const e = es[es.length - 1];
    if (e) recTxt = `<div class="card2"><h4><span>Record</span><span>${e.censored ? 'not scored' : 'pre-registered'}</span></h4><div class="txt">Joined <b>${day(e.day)}</b>${e.censored ? ' (already on the list when history starts)' : ''} at ${e.spot.toFixed(2)} · first level <b>${sk(e.k1)}</b> (${pc(e.d1)}), biggest <b>${sk(e.kt)}</b> (${pc(e.dt)}).<br>${resTxt(e, '20', 'k1', 'First level, 20 sessions')}<br>${resTxt(e, '60', 'kt', 'Biggest level, 60 sessions')}</div></div>`;
  } catch (err) {  }
  $('#side').innerHTML = `
    ${ASOF ? `<div class="card2 asofcard"><h4><span class="asof">On ${dayW(ASOF.day)}</span><span>${ASOF.v === 'match' ? 'on the list' : 'near miss'} · score ${(ASOF.sc || 0).toFixed(0)}</span></h4><div class="txt">Price ${ASOF.px.toFixed(2)} → ${n.spot.toFixed(2)} now (<b class="${n.spot >= ASOF.px ? 'up' : 'dn'}">${pc(n.spot / ASOF.px - 1, 1)}</b>). Stack ${stackS(ASOF.up)} vs ${otherS(ASOF.dn)} (${xS(ASOF.x)}). Levels then: ${ASOF.lv.map(l => sk(l[0])).join(', ')} · now: ${(g.levels || []).map(d => sk(d.k)).join(', ') || 'none'}. <span class="lnk" data-d="">Clear</span></div></div>` : ''}
    <div class="card2"><h4><span>${g.v === 'match' ? 'Why ' + sym + ' is here' : 'Rules'}${PUT() ? ' · negative' : ''}</span>${verdictHead(r, g)}</h4><div class="ck">${ck}</div></div>
    ${bizCard(sym, n)}
    ${NARROW() ? cpCard(n) : ''}
    ${lt ? `<div class="card2"><h4><span>${w.levels}</span><span>OI ${day(n.oi_settle)} settle</span></h4><table class="lvt"><tr><th>Strike</th><th>Away</th><th>Reach</th><th>GEX</th><th>${PUT() ? 'Puts' : 'Calls'}</th><th>Main expiry</th><th>1W</th></tr>${lt}</table><div class="note" style="margin-top:6px">Reach = distance in the main expiry's own implied moves. 1W = ${w.addedLong} since the ${day(n.wk_settle)} settle (all open expiries).</div></div>` : ''}
    ${NARROW() ? '' : cpCard(n)}
    <div class="card2"><h4><span>${sym} vs all ${D.universe} names</span><span>percentile</span></h4>${pb(`Stack ÷ ${w.theirs}s ${w.there}`, P.x)}${pb('Stack vs $ volume', P.rel)}${pb('Stack size ($)', P.up)}${pb(`How far ${w.where}`, P.com)}${pb(`Share 10%+ ${w.where}`, P.far)}</div>
    ${(g.levels || []).length ? `<div class="card2"><h4><span>Is the stack new?</span><span class="${fresh ? 'up' : 'muted'}">${dd == null ? 'n/a' : fresh ? 'FRESH' : 'OLD'}</span></h4><div class="txt">${dd == null ? 'No snapshot from a week earlier.' : `${PUT() ? 'Puts' : 'Calls'} at the levels: <b>${kf(f[0])}</b> now vs ${kf(f[1])} on ${day(n.wk_settle)} (<b>${pc(dd / f[1])}</b>). `}<span class="muted">${dd == null ? '' : fresh ? `${PUT() ? 'Puts' : 'Calls'} are being added at the levels` : `Mostly ${exps} ${w.mine}s that were already there`}${grew.length ? '. Grew 10%+: ' + grew.map(d => sk(d.k) + ' (' + pc((d.oi_all - d.oi_wk) / d.oi_wk) + ')').join(', ') : ''}.${PUT() ? '' : ' In our earlier test of far call piles the one lead was calls <i>added</i> before a move, not old piles.'}</span></div></div>` : ''}
    ${g.v === 'match' && g.days != null ? `<div class="card2"><h4><span>On the list</span><span></span></h4><div class="txt">${g.new ? '<b>New today.</b>' : `<b>${g.days}</b> session${g.days === 1 ? '' : 's'}, since ${day(g.since)}${g.since_start ? ' (when history starts)' : ''}.`}</div></div>` : ''}
    ${recTxt}
    <div class="card2"><h4><span>Data</span><span></span></h4><div class="note">Option chain built ${new Date(n.build).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' })} ET · open interest ${day(n.oi_settle)} settle · price ${day(n.px_day)} close · ${lv.expiries} expiries to ${esc(lv.last_expiry || '')}.</div></div>`;
}


let SEEK_BASE = '../price-seeker/';
function seekBox() {
  return `<div id="seekbox"><div class="sk-h"><span class="k">Price Seeker</span><span class="muted">the far ${PUT() ? 'put' : 'call'} pile, its odds and the facts for this name</span></div>
    <div class="empty" id="skWait">Loading Price Seeker…</div><iframe id="skFrame" title="Price Seeker for this name" referrerpolicy="no-referrer"></iframe></div>`;
}
function seekShow(sym) {
  const f = $('#skFrame'); if (!f) return;
  const u = SEEK_BASE + '?embed=1#' + (PUT() ? 'v=puts&o=' : '') + encodeURIComponent(sym);
  const k = $('#seekbox .sk-h .muted'); if (k) k.textContent = `the far ${PUT() ? 'put' : 'call'} pile, its odds and the facts for this name`;
  if (f.dataset.u === u) return;
  if (!f.dataset.u) f.src = u;
  else { try { f.contentWindow.location.replace(u); } catch (e) { f.src = u; } }
  f.dataset.u = u; f.dataset.sym = sym;
}
window.addEventListener('message', e => {
  const f = $('#skFrame');
  if (!f || e.source !== f.contentWindow || !e.data || e.data.type !== 'ps-embed') return;
  const h = Math.max(0, Math.min(6000, Math.round(+e.data.h) || 0));
  f.style.height = h + 'px';
  const w = $('#skWait'); if (w && h > 40) w.remove();
});
function lstItem(x, i) {
  return `<div class="it ${x.s === S.s ? 'sel' : ''}" data-s="${x.s}"><span class="muted">${i}</span><span class="tk">${x.s}</span>${glyph(x, 110, 26)}<span class="s num">${hh(x).sc.toFixed(0)}</span></div>`;
}
function drawChart(n) {
  const box = $('#chart'); if (!box || !n[K()][S.h]) return;
  const Wd = Math.max(320, box.clientWidth - 4);
  const Hh = NARROW() ? 440 : Math.max(480, window.innerHeight - 95 - 130);
  box.innerHTML = chartSVG(n, Wd, Hh, ASOF && ASOF.lv ? ASOF : null);
}
function resTxt(e, n, t, label) {
  const r = e.res[n][t], odds = e.odds[n][t];
  const st = r[1] ? `<span class="hit">touched, session ${r[2]}</span>` : e.n_after >= +n ? '<span class="miss">not reached</span>' : `<span class="open">open (${e.n_after} of ${n} sessions)</span>`;
  return `${label}: ${st}${odds != null ? ` · options gave ${Math.round(odds * 100)}%` : ''}`;
}


async function renderRecord() {
  $('#main').innerHTML = '<div class="empty">Loading the record…</div>';
  const R = await loadRecord();
  if (S.v !== 'record') return;
  const X = (R.sides[S.side] || {})[S.h] || { entries: [], summary: {} }, sm = X.summary, w = W();
  const E = X.entries.filter(e => S.l === 'all' || ((D.rows.find(r => r.s === e.sym) || {}).l || []).includes(S.l));
  const tile = (k, v, s) => `<div class="tile"><div class="k">${k}</div><div class="v num">${v}</div><div class="s">${s}</div></div>`;
  const line = (n, t, lab) => { const z = (sm[n] || {})[t] || {}; if (!z.closed) return tile(lab, '<small>none closed yet</small>', `first results after ${n} sessions`);
    return tile(lab, `${z.hits} <small>of ${z.closed} touched</small>`, `options expected <b>${z.expected.toFixed(1)}</b> · matched stocks ${z.control_rate != null ? '<b>' + Math.round(z.control_rate * 100) + '%</b>' : 'n/a'} · fresh ${z.fresh_hits}/${z.fresh_closed}`); };
  const scored = E.filter(e => !e.censored).sort((a, b) => b.day.localeCompare(a.day) || a.sym.localeCompare(b.sym)), cen = E.filter(e => e.censored);
  const cell = (e, n, t) => { const r = e.res[n][t]; return r[1] ? `<span class="hit">✓ s${r[2]}</span>` : e.n_after >= +n ? '<span class="miss">✕</span>' : '<span class="open">open</span>'; };
  const ctrl = (e, n, t) => { if (!e.controls.length) return '<span class="open">–</span>';
    const hit = e.controls.filter(x => x.res[n][t][1]).length, done = e.n_after >= +n;
    return `<span class="${done ? '' : 'open'}" title="${e.controls.map(x => x.sym).join(', ')}">${hit} of ${e.controls.length}${done ? '' : ' so far'}</span>`; };
  const row = e => `<tr class="${e.censored ? 'cen' : ''}"><td>${day(e.day)}</td><td><b class="lnk" data-s="${e.sym}" data-d="${e.day}">${e.sym}</b></td><td class="num">${e.spot.toFixed(2)}</td>
    <td class="num">${sk(e.k1)} <span class="muted">${pc(e.d1)}</span></td><td class="num">${sk(e.kt)} <span class="muted">${pc(e.dt)}</span></td>
    <td class="num">${e.odds['20'].k1 != null ? Math.round(e.odds['20'].k1 * 100) + '%' : '–'}</td><td>${cell(e, '20', 'k1')}</td><td class="num">${ctrl(e, '20', 'k1')}</td>
    <td class="num">${e.odds['60'].kt != null ? Math.round(e.odds['60'].kt * 100) + '%' : '–'}</td><td>${cell(e, '60', 'kt')}</td><td class="num">${ctrl(e, '60', 'kt')}</td>
    <td>${e.fresh ? '<span class="up">fresh</span>' : e.fresh_known ? '<span class="muted">old</span>' : '<span class="muted">n/a</span>'}</td><td class="num">${e.res['20'].ret != null ? pc(e.res['20'].ret, 1) : '<span class="open">–</span>'}</td></tr>`;
  const head = `<tr><th>Joined</th><th>Stock</th><th>Price</th><th>First level</th><th>Biggest level</th><th>Odds 20s</th><th>First level · 20s</th><th>Matched · 20s</th><th>Odds 60s</th><th>Biggest · 60s</th><th>Matched · 60s</th><th>${PUT() ? 'Puts' : 'Calls'}</th><th>Return 20s</th></tr>`;
  $('#main').innerHTML = `<div class="rec-wrap"><h2>Track record · ${w.pat} · ${S.h}</h2>
    <div class="note" style="max-width:1100px">Pre-registered on Oct 7, before any result existed. Each name is logged on the first day it matches. Its targets are fixed that day: the first level ${w.where} and the biggest level ${w.where}. A touch is a daily ${PUT() ? 'low at or below' : 'high at or above'} the target, counted from the NEXT session, because open interest posts before the open. Each entry is compared with the options' own odds and with 3 stocks from the same day that did not match, picked for similar 60-day beta and 20-day return, using targets at the same % distances. Names already on the list on ${day(R.first_day)}, the first day of history, are not scored because their join date is unknown.${PUT() ? '' : " In an earlier test, far call piles hit no more often than matched stocks, so treat this as the test, not the edge."}</div>
    <div class="rec-tiles">${tile('Entries scored', `${sm.entries || 0} <small>+${sm.censored || 0} not scored</small>`, `${sm.open || 0} still inside their first 20 sessions`)}${line('20', 'k1', 'First level · 20 sessions')}${line('20', 'kt', 'Biggest level · 20 sessions')}${line('60', 'kt', 'Biggest level · 60 sessions')}</div>
    <table class="rec"><thead>${head}</thead><tbody>${scored.map(row).join('') || `<tr><td colspan="13" class="muted" style="padding:14px 6px">No new entries since history began.</td></tr>`}
    ${cen.length ? `<tr><td colspan="13" style="padding:16px 6px 6px" class="muted">ON THE LIST WHEN HISTORY STARTS (${day(R.first_day).toUpperCase()}) · NOT SCORED</td></tr>` + cen.map(row).join('') : ''}</tbody></table></div>`;
}


function renderMain() {
  if (S.v === 'detail' && S.s) return renderDetail();
  if (S.v === 'record') return renderRecord().catch(e => { $('#main').innerHTML = `<div class="empty">Record unavailable: ${esc(e.message)}</div>`; });
  if (S.per !== 'today') return renderPeriod().catch(e => { $('#main').innerHTML = `<div class="empty">Periods unavailable: ${esc(e.message)}</div>`; });
  renderBoard();
}
function render(top) {
  if (!D) return;
  renderBar();
  renderMain();
  if (top) window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-h],[data-l],[data-v],[data-near],[data-sort],[data-dir],[data-s],[data-side],[data-per],[data-d]');
  if (!t || t.tagName === 'A') return;
  if (t.dataset.side) return go({ side: PUT() ? 'call' : 'put' }, false);
  if (t.dataset.h) return go({ h: t.dataset.h }, false);
  if (t.dataset.l) return go({ l: t.dataset.l }, false);
  if (t.dataset.per) return go({ per: t.dataset.per, d: null }, false);
  if (t.dataset.v) return go({ v: t.dataset.v, s: t.dataset.v === 'detail' ? S.s : null, d: t.dataset.v === 'board' && S.v === 'detail' && S.per !== 'today' ? null : S.d });
  if (t.dataset.near) return go({ near: !S.near }, false);
  if (t.dataset.dir) { const [k, d] = SORT(); return go(S.per === 'today' ? { sort: [k, -d] } : { psort: [k, -d] }, false); }
  if (t.dataset.sort) { const k = t.dataset.sort, cur = SORT(), nx = [k, cur[0] === k ? -cur[1] : (k === 's' ? 1 : -1)];
    return go(S.per === 'today' ? { sort: nx } : { psort: nx }, false); }
  if (t.dataset.s) return go({ v: 'detail', s: t.dataset.s, d: t.dataset.d || (pastDay() ? S.d : null) });
  if (t.dataset.d !== undefined) return go({ d: t.dataset.d || null }, false);
});
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (S.v === 'detail') {
    if (e.key === 'Escape') return go({ v: 'board', s: null });
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') {
      const L = groups().byScore, i = L.findIndex(r => r.s === S.s), d = (e.key === 'ArrowDown' || e.key === 'j') ? 1 : -1;
      const nx = L[Math.max(0, Math.min(L.length - 1, i < 0 ? 0 : i + d))]; if (nx && nx.s !== S.s) { e.preventDefault(); go({ s: nx.s }, false); }
    }
  } else if (e.key.length === 1 && /[a-z]/i.test(e.key) && !e.metaKey && !e.ctrlKey) { const q = $('#q'); if (q) q.focus(); }
});
let rz = null, lastNarrow = NARROW();
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => {
  if (NARROW() !== lastNarrow) { lastNarrow = NARROW(); return render(); }
  if (S.v === 'detail' && NAMES[S.s]) drawChart(NAMES[S.s]); else if (S.v === 'board') renderMain(); }, 150); });

async function poll() {
  try {
    STATUS = await getJSON('api/status');
    if (STATUS.build && STATUS.build !== BUILD) { const y = window.scrollY; await loadBoard(); render(); window.scrollTo(0, y); }
    else if (D) renderBar();
  } catch (e) {  }
}
(async function init() {
  readHash();
  try { STATUS = await getJSON('api/status'); } catch (e) { STATUS = null; }
  try { await loadBoard(); } catch (e) { $('#main').innerHTML = `<div class="empty">Could not load the data (${esc(e.message)}). Try again in a minute.</div>`; return; }
  if (S.d === D.day) S.d = null;
  writeHash(false);
  render();
  setInterval(poll, 300000);
})();
