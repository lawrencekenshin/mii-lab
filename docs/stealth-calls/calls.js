
'use strict';
const LADDER = window.BW_MODE === 'ladder';
const STEALTH = window.BW_MODE === 'stealth';
const LOUD = window.BW_MODE === 'loud';
const VIEWS = ['board', 'detail'];
const TABS = [];
const TIERS = LOUD ? [['list', 'Listed'], ['L', 'L loud buying'], ['C', 'C move day'], ['S', 'S spread'], ['X', 'X not buying']]
  : [['list', 'Listed'], ['S', 'S stealth'], ['Q', 'Q quiet but loud'], ['M', 'M moving'], ['WATCH', 'Watch']];
const TORD = LOUD ? { L: 0, C: 1, S: 2, X: 3 } : { S: 0, Q: 1, M: 2, WATCH: 3 };
const TNAME = LOUD ? { L: 'L', C: 'C', S: 'S', X: 'X' } : { S: 'S', Q: 'Q', M: 'M', WATCH: 'Watch' };
const TLONG = LOUD ? { L: 'Loud call buying', C: 'Loud on a move day', S: 'Loud spread', X: 'Loud, not buying' }
  : { S: 'Stealth build', Q: 'Quiet but loud', M: 'Price already moving', WATCH: 'Building toward it' };
const LISTED = LOUD ? ['L', 'C', 'S'] : ['S', 'Q', 'M', 'WATCH'];
const CAP = LOUD ? {
  L: 'Loud call buying: one session\'s call build among the market\'s very biggest that day, big in contracts and dollars, mostly prints above the mid, calls well ahead of puts, not a spread, on a session the price did not jump.',
  C: 'Loud on a move day: the same loud, bought build, but the price itself jumped that session — calls bought into news.',
  S: 'Loud spread: loud, big and bought, but most of the adds sit in equal-size call legs — a vertical spread caps the bet.',
  X: 'Loud, not buying: loud and big, but the prints lean to selling, puts were built too, the calls are deep in the money or paired with puts.',
} : {
  S: 'Stealth build: steady call building on most of the last 10 settles, never one big block, calls well ahead of puts, the price still quiet.',
  Q: 'Quiet but loud: everything else passes, but one session was very loud or held a big share of the adds — a visible block.',
  WATCH: 'Building toward it: steady on many of the settles, not yet enough, with the stealth and size checks passing.',
  M: 'Price already moving: the build passes, but the price already moved over the window or woke up.',
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('bw.' + window.BW_MODE + '.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bw.' + window.BW_MODE + '.' + k, JSON.stringify(v)); } catch (e) {   } },
};
const S = { v: 'board', s: null, q: '', d: null, tf: store.get('tf1', 'list'), sort: store.get('sort1', ['t', 1]),
  ph: store.get('ph', 'all'), grp: store.get('grp1', STEALTH ? 'S' : LADDER || LOUD ? 'L' : 'X'), lw: store.get('lw', '3'), gh: store.get('gh1', '1Y+'),
  og: store.get('og1', STEALTH ? 'S' : LADDER || LOUD ? 'L' : 'X'), of: 'all', osort: store.get('osort1', 'newest'), oph: store.get('oph1', 'all'), os: null,
  ps: store.get('ps1', 'all'), cat: store.get('cat1', 'all'), lv: 'all', ag: LOUD && store.get('ag1', false), le: null,
  ix: LOUD || STEALTH ? store.get('ix1', 'all') : 'all', lx: 'simple', sk: LOUD ? store.get('sk1', 'L') : 'L',
  sr: LOUD ? store.get('sr1', 'big') : STEALTH ? store.get('sr1', 'grp') : 'big',
  ld: STEALTH && !!store.get('ld1', false), cz: STEALTH || LOUD ? (window.innerWidth < 760 ? store.get('czm1', '1M') : store.get('cz1', '3M')) : '1Y',
  dw: STEALTH ? store.get('dw1', '1') : '1', cps: STEALTH ? store.get('cps1', 'heavy') : 'heavy', cpa: false,
  pm: LOUD ? store.get('pm1', 'calls') : 'calls', pk: LOUD ? store.get('pk1', 'B') : 'B' };
let D = null, TIDE = null, REC = null, OUTC = null, CASE = null, EVI = undefined, STATUS = null, BUILD = null, SECT = null;
const NAMES = {}, DAYB = {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const NARROW = () => window.innerWidth < 760;
const fm = v => { if (v == null) return '–'; const a = Math.abs(v); if (a < 1000) return a < 1 ? '$0' : '<$1K';
  return (v < 0 ? '−' : '') + '$' + (a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M' : (a / 1e3).toFixed(0) + 'K'); };
const pc = (v, d = 0) => { if (v == null || !isFinite(v)) return '–'; const t = Math.abs(v * 100).toFixed(d); return (+t === 0 ? '' : v >= 0 ? '+' : '−') + t + '%'; };
const pu = (v, d = 0) => v == null ? '–' : (Math.round(v * 100 * 10 ** d) / 10 ** d) + '%';
const kf = n => { if (n == null) return '–'; const a = Math.abs(n); return (n < 0 ? '−' : '') + (a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(0) + 'k' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : String(Math.round(a))); };
const kp = n => n == null ? '–' : (n > 0 ? '+' : '') + kf(n);
const day = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–';
const dayW = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '–';
const expS = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(', ', " '") : '–';
const yymm = e => e ? '20' + e.slice(0, 2) + '-' + e.slice(2, 4) + '-' + e.slice(4, 6) : null;
const px = v => v == null ? '–' : v >= 1000 ? v.toFixed(0) : v >= 100 ? v.toFixed(1) : v.toFixed(2);
const da = v => v == null ? '–' : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2);
const tb = (t, extra = '') => t ? `<span class="tb ${t}" title="${esc(TLONG[t])}">${TNAME[t]}</span>${extra}` : '<span class="tb none">–</span>';
const LIVE_HOST = location.hostname === 'lawrencekenshin.github.io';
const BASE = LIVE_HOST ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/call-boards-data/call-boards/' : './snap/';
let BUST = '';
const MDIR = LOUD ? 'loud/' : 'stealth/';
function pubPath(url) {
  if (url === 'api/status') return 'status.json';
  let m;
  if ((m = url.match(/^data\/loud\/(days|names)\/(.+)$/))) return 'loud/' + m[1] + '/' + m[2];
  if (url === 'data/loud.json') return 'loud/layer.json';
  if (url === 'data/puts.json') return 'loud/puts.json';
  if (url === 'data/lists.json') return 'stealth/lists.json';
  if ((m = url.match(/^data\/(.+)$/))) return MDIR + m[1];
  return url;
}
const hasPage = (s, b) => {
  const P = STATUS && STATUS.pages && STATUS.pages[b || (LOUD ? 'loud' : 'stealth')];
  return !Array.isArray(P) || P.includes(s);
};
async function getJSON(url) {
  const path = pubPath(url), q = path === 'status.json' ? '?t=' + Math.floor(Date.now() / 60000) : BUST;
  const r = await fetch(BASE + path + q, { cache: 'no-cache' });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}
let LISTSD;
function noPage(sym, board) {
  const r = (D.rows || []).find(x => x.s === sym);
  const why = r ? (r.why || '').split('; ').filter(Boolean).slice(0, 3).join(' · ') : '';
  return `<div class="empty"><b class="wh">${esc(sym)}</b> ${r ? `is not on the ${board} board right now${why ? ': ' + esc(why) : ''}.` : `is not in the ${board} universe (too few open calls, no options data on both settles, no fresh daily price, a leveraged product or too short a history).`} <button class="btn g" data-v="board">← Board</button></div>`;
}
function bigExp(ex, n) {
  return new Set(ex.slice().sort((a, b) => b[1] - a[1]).slice(0, n || 0).map(e => e[0]));
}
async function loadBoard() {
  if (STATUS && STATUS.build) BUST = '?b=' + STATUS.build;
  D = await getJSON('data/board.json');
  if (STEALTH) {
    if (LISTSD === undefined) { try { LISTSD = await getJSON('data/lists.json'); } catch (e) { LISTSD = null; } }
    const U = new Set(D.rows.map(r => r.s)), L = {};
    Object.entries(LISTSD || {}).forEach(([k, v]) => { L[k] = v ? Object.assign({}, v, { judged: v.syms.filter(x => U.has(x)).length }) : null; });
    D.lists = L;
  }
  BUILD = D.build;
  for (const k in NAMES) delete NAMES[k];
  TIDE = null; REC = null; OUTC = null; CASE = null; SECT = null;
  LOUDB = undefined; for (const k in LOUDD) delete LOUDD[k]; WLV = null;
}
async function loadName(s) {
  if (!NAMES[s]) { if (!hasPage(s)) throw new Error(s + ' has no page'); NAMES[s] = await getJSON('data/names/' + encodeURIComponent(s) + '.json'); }
  return NAMES[s];
}
const GEXC = {};
async function loadGex(s) {
  if (!GEXC[s]) { try { GEXC[s] = await getJSON('gex/' + encodeURIComponent(s) + '.json'); } catch (e) { GEXC[s] = { error: 'GEX levels are kept for the names on the boards' }; } }
  return GEXC[s];
}
async function loadDay(d) { if (!DAYB[d]) DAYB[d] = await getJSON('data/days/' + d + '.json'); return DAYB[d]; }
const pastDay = () => false;
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  S.v = VIEWS.includes(p.get('v')) ? p.get('v') : 'board';
  S.s = (p.get('s') || '').toUpperCase() || null;
  if (S.s && S.v === 'board') S.v = 'detail';
  S.d = null;
  if ((LOUD || STEALTH) && IXS.some(x => x[0] === p.get('ix'))) S.ix = p.get('ix');
  if (LOUD && SKS.some(x => x[0] === p.get('sk'))) S.sk = p.get('sk');
  if (LOUD && SRS.some(x => x[0] === p.get('sr'))) S.sr = p.get('sr');
  if (STEALTH && p.has('ld')) S.ld = p.get('ld') === '1';
  if (STEALTH && ['1', '5', '10', 'all'].includes(p.get('dw'))) S.dw = p.get('dw');
  if (LOUD && ['calls', 'puts'].includes(p.get('pm'))) S.pm = p.get('pm');
  if (LOUD && PKS.some(x => x[0] === p.get('pk'))) S.pk = p.get('pk');
}
function writeHash(push) {
  const p = new URLSearchParams();
  if (S.v !== 'board') p.set('v', S.v);
  if (S.v === 'detail' && S.s) p.set('s', S.s);
  if (S.v === 'outcomes' && S.os) p.set('s', S.os);
  if (S.v === 'outcomes') p.set('g', S.og);
  if (S.v === 'board' && S.d) p.set('d', S.d);
  if ((LOUD || STEALTH) && S.v === 'board' && S.ix !== 'all') p.set('ix', S.ix);
  if ((LOUD || STEALTH) && S.v === 'board' && S.lx === 'full') p.set('lx', 'full');
  if (LOUD && S.v === 'board' && S.lx !== 'full' && S.sk !== 'L') p.set('sk', S.sk);
  if (LOUD && S.v === 'board' && S.lx !== 'full' && S.sr !== 'big') p.set('sr', S.sr);
  if (STEALTH && S.v === 'board' && S.ld) p.set('ld', '1');
  if (STEALTH && S.v === 'board' && S.dw !== '1' && !S.d) p.set('dw', S.dw);
  if (LOUD && S.v === 'board' && S.lx !== 'full' && S.pm === 'puts') { p.set('pm', 'puts'); if (S.pk !== 'B') p.set('pk', S.pk); }
  const h = p.toString() ? '#' + p.toString() : '#';
  if (h !== (location.hash || '#')) (push ? history.pushState : history.replaceState).call(history, null, '', h);
}
function go(ch, push = true) {
  const prevV = S.v;
  Object.assign(S, ch);
  store.set('tf1', S.tf); store.set('sort1', S.sort); store.set('ph', S.ph); store.set('grp1', S.grp); store.set('lw', S.lw);
  store.set('og1', S.og); store.set('osort1', S.osort); store.set('oph1', S.oph);
  if (LADDER) store.set('ps1', S.ps);
  if (STEALTH) { store.set('cat1', S.cat); store.set('ld1', S.ld); store.set('lx1', S.lx); store.set('sr1', S.sr); store.set('dw1', S.dw); store.set('cps1', S.cps); store.set('ix1', S.ix); }
  if (LOUD) { store.set('cat1', S.cat); store.set('ag1', S.ag); store.set('ix1', S.ix); store.set('lx1', S.lx); store.set('sk1', S.sk); store.set('sr1', S.sr); store.set('pm1', S.pm); store.set('pk1', S.pk); }
  writeHash(push);
  render(prevV !== S.v);
}
window.addEventListener('popstate', () => { readHash(); render(true); });
function renderBar() {
  const st = STATUS || {}, m = D.meta;
  const ageH = (Date.now() - new Date(D.built).getTime()) / 3.6e6;
  const dot = st.ok === false ? 'err' : ageH > 30 ? 'stale' : '';
  const built = new Date(D.built).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const tabV = S.v === 'detail' ? 'board' : S.v;
  $('#bar').innerHTML = `<span id="brand">${LOUD ? (PUTSON() ? 'LOUD PUTS' : 'LOUD CALLS') : 'STEALTH CALLS'}</span>
    ${TABS.map(([k, t]) => `<button class="tab ${tabV === k ? 'on' : ''}" data-v="${k}">${t}</button>`).join('')}
    <input id="q" placeholder="${NARROW() ? 'Ticker' : 'Find a ticker'}" spellcheck="false" autocomplete="off" value="${esc(S.q)}">
    <span id="status" title="${esc(st.error || '')}"><b class="${dot}"></b>${NARROW() ? '' : 'Options '}${day(m.settle)} settle · ${day(m.price_day)} close · built ${built}${st.ok === false ? ' · last build failed' : ''}</span>`;
  const q = $('#q');
  q.addEventListener('input', () => { S.q = q.value.trim().toUpperCase();
    if (S.v === 'board') return renderMain();
    go({ v: 'board', s: null }); const q2 = $('#q'); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); });
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const r = D.rows.find(x => x.s === S.q) || D.rows.find(x => matchQ(x, S.q)); if (r) { S.q = ''; q.value = ''; go({ v: 'detail', s: r.s }); } }
    if (e.key === 'Escape') { S.q = ''; q.value = ''; renderMain(); }
  });
}
const matchQ = (r, q) => r.s.startsWith(q) || String(r.n || '').toUpperCase().includes(q);
const L = r => r.l || {};
const SORTS = {
  t: r => [TORD[r.t] ?? 9, r.rk || 999], s: r => r.s, dd: r => r.dd ?? -1, r20: r => r.r20 ?? 9, sec: r => r.sec || 'zz',
  per: r => (L(r).per ?? -1) * 10 + (L(r).p3 || 0), p1: r => L(r).p1 ?? -9, p3: r => L(r).p3 ?? -9, da: r => L(r).da3 ?? -1,
  lad: r => L(r).ne ?? -1, cvp: r => L(r).cp ?? -1, don: r => r.don ?? 0,
  td: r => (isMoving(r.s) ? 10 : 0) + ((LF(r.s) || {}).heavy ? 5 : 0) + ((LF(r.s) || {}).pct ?? -1),
};
function sorted(rows) {
  const [k, dir] = S.sort, f = SORTS[k] || SORTS.t;
  return rows.slice().sort((a, b) => { const x = f(a), y = f(b);
    if (Array.isArray(x)) return (x[0] - y[0] || x[1] - y[1]) * dir || a.s.localeCompare(b.s);
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir || (TORD[a.t] ?? 9) - (TORD[b.t] ?? 9) || (a.rk || 999) - (b.rk || 999) || a.s.localeCompare(b.s); });
}
function srcRows() { return pastDay() ? (DAYB[S.d] || { rows: [] }).rows : D.rows; }
async function renderBoard() { return LOUD ? renderBoardLd() : renderBoardS(); }
function wireBoard() {
  const rd = $('details.rdet');
  if (rd) rd.addEventListener('toggle', () => store.set(NARROW() ? 'rulesOpen' : 'rulesOpenD', rd.open));
  const ds = $('#daysel');
  if (ds) ds.addEventListener('change', () => go({ d: ds.value === D.meta.settle ? null : ds.value }, false));
  const ss = $('#sortsel');
  if (ss) ss.addEventListener('change', () => go({ sort: [ss.value, ss.value === 't' ? 1 : -1] }, false));
}
function niceStep(range, n = 6) {
  const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) || 10 * p;
}
const TCOL = { X: '#f5d63d', R: '#26a69a', W: '#5c9ded', J: '#ef5350', N: '#787b86', L: '#f5d63d', B: '#5c9ded',
  S: '#c5b3f0', Q: '#ff9800', M: '#5c9ded', WATCH: '#9598a1' };
const GEX_HS = ['1M', '3M', '6M', '1Y+'];
const gexH = n => { const g = n.gx; if (!g || g.error || !g.H || S.gh === 'off') return null;
  return g.H[S.gh] ? S.gh : ['1Y+', '6M', '3M', '1M'].find(h => g.H[h]) || null; };
function gexBar(n) {
  const el = $('#gexbar'); if (!el) return;
  const g = n.gx;
  if (!g || g.error) { el.innerHTML = `<span class="lab">GEX</span><span class="muted">${esc(g ? g.error : 'not available')}</span>`; return; }
  const cur = gexH(n), L = cur ? g.H[cur].lv : null;
  el.innerHTML = `<span class="lab">GEX</span>${GEX_HS.filter(h => g.H[h]).map(h => `<button class="btn sm${h === cur ? ' on' : ''}" data-gh="${h}">${h}</button>`).join('')}<button class="btn sm${S.gh === 'off' ? ' on' : ''}" data-gh="off">off</button>
    <span class="muted">${g.src === 'hunt' ? 'GEX Hunt map' : 'from end-of-day open interest'} · ${g.repriced ? `<span class="lvst">re-priced at the ${etHM(g.lt)} ET price ${px(g.spot)}</span> (open interest = ${day(g.settle)} settle)` : `OI ${day(g.settle)} settle · priced at the ${day(g.px_day)} close`}${L ? ` · King <b class="kg">${px(L.king)}</b> · net ${fm(L.net)}${L.flip ? ' · flip ' + px(L.flip) : ''}` : ''}${g.live_error ? ` <span class="am" title="${esc(g.live_error)}">· daily map (not re-priced)</span>` : ''}</span>`;
}
const CZ = [['1M', 22], ['3M', 64], ['6M', 128], ['1Y', 0]];
const czBars = () => (STEALTH || LOUD) ? ((CZ.find(z => z[0] === S.cz) || CZ[1])[1] || 0) : 0;
const czChips = () => `<span class="czsel" title="How much price history the chart shows"><span class="lab">Chart</span>${CZ.map(([k]) => `<button class="chip ${S.cz === k ? 'on' : ''}" data-cz="${k}">${k}</button>`).join('')}</span>`;
const STLET = { S: 'S', Q: 'Q', M: 'M', WATCH: 'W' };
const LNM = {};
async function loadLoudName(s) {
  if (!(s in LNM) && !hasPage(s, 'loud')) LNM[s] = null;
  if (!(s in LNM)) {
    try { const n = await getJSON('data/loud/names/' + encodeURIComponent(s) + '.json');
      LNM[s] = { s, marks: n.marks || [], hist: (n.loud || []).filter(e => e && e.E).map(e => Object.assign({ E: e.E, t: e.t }, e.x || {})), pev: n.pev || [] }; }
    catch (e) { LNM[s] = null; }
  }
  return LNM[s];
}
function sigOf(n) {
  if (!(STEALTH || LOUD)) return null;
  const st = n.st || {}, x = n.x || {}, E = st.earn || n.earn || {};
  const lm = LOUD ? (!Array.isArray(n.marks) ? null : { marks: n.marks, hist: (n.loud || []).filter(e => e && e.E).map(e => Object.assign({ E: e.E, t: e.t }, e.x || {})), pev: n.pev || [] })
    : n.lmk || null;
  return { strip: Array.isArray(st.strip) ? st.strip : [], letters: STEALTH ? (n.flags || []).filter(f => STLET[f[1]]) : [], lm,
    bet: x.mk && x.mx ? { k: x.mk, e: x.mx, from: STEALTH ? (st.S || x.S) : (n.e || x.S) } : null,
    earn: { l: E.l || null, n: E.n || n.ced || null } };
}
function sigDet(lm) {
  const d = {};
  ((lm && lm.hist) || []).forEach(h => { d[h.E + '|C'] = `${fm(h.prem)} of calls in one session (${kfL(h.ca)} contracts, ${pctL(h.cap)} of the open calls), ${topL(h.loud)} of the market${h.bs != null ? `, ${pctL(h.bs)} of prints above the mid` : ''}${h.mk ? `; main bet $${kS(h.mk)}C ${dayY(h.mx)}` : ''}; the price ${pcL(h.move)} that day`; });
  ((lm && lm.pev) || []).forEach(p => { d[p.E + '|P'] = `${fm(p.prem)} of puts in one session (${kfL(p.pa)} contracts${p.pap != null ? `, ${pctL(p.pap)} of the open puts` : ''})${p.pr != null ? `, ${topL(p.pr)} of the market` : ''}${p.pmx ? `; main put $${kS(p.pmx[1])}P ${dayY(yymm(p.pmx[0]))}` : ''}`; });
  return d;
}
function sigLegend(n) {
  const G = sigOf(n); if (!G) return '';
  const k = [];
  if (G.strip.length) k.push('<span><i style="background:#26a69a"></i>steady build day</span><span><i style="background:#ff9800"></i>very loud day</span>');
  if (G.letters.length) k.push(`<span>${['S', 'Q', 'M', 'WATCH'].map(t => `<b style="color:${TCOL[t]}">${STLET[t]}</b>`).join(' ')} stealth tier that settle</span>`);
  if (STEALTH && G.lm && G.lm.marks.length) { const has = sd => G.lm.marks.some(m => m[1] === sd);
    k.push(`<span>${has('C') ? '<b style="color:#ff8a50">▲</b> loud calls' : ''}${has('C') && has('P') ? ' · ' : ''}${has('P') ? '<b style="color:#ff6b8a">▼</b> loud puts' : ''} <span class="muted">(hollow = selling lean, gold = spread, blue = move day)</span></span>`); }
  if (G.bet) k.push('<span><i class="mbl"></i>main bet</span>');
  if (G.earn.l || G.earn.n) k.push('<span><b style="color:#ffb74d">E</b> earnings</span>');
  return k.join('');
}
function sigSVG(G, ix, X, y, step, padL, cwP, pTop, pBot, pBotP, lo, hi, S0, O) {
  let s = '';
  const firstI = d => { if (!d) return null; if (ix[d] != null) return ix[d]; const k = O.findIndex(r => r[0] >= d); return k < 0 ? null : k; };
  if (G.earn.l && ix[G.earn.l] != null) { const ex = X(ix[G.earn.l]);
    s += `<line x1="${ex.toFixed(1)}" x2="${ex.toFixed(1)}" y1="${pTop}" y2="${pBotP}" stroke="#ffb74d" stroke-opacity=".55" stroke-dasharray="2,3"/><text x="${ex.toFixed(1)}" y="${pTop - 6}" fill="#ffb74d" font-size="10.5" font-weight="700" text-anchor="middle">E<title>Earnings ${day(G.earn.l)}</title></text>`; }
  if (G.earn.n && G.earn.n > (O[O.length - 1] || [''])[0]) {
    s += `<text x="${(padL + cwP - 4).toFixed(1)}" y="${pTop - 6}" fill="#ffb74d" font-size="10.5" text-anchor="end">next earnings ${day(G.earn.n)} →<title>Next earnings ${day(G.earn.n)}</title></text>`; }
  if (G.bet) { const b = G.bet, i0 = firstI(b.from), xa = i0 == null ? padL : X(i0) - step / 2, xb = padL + cwP, d = S0 ? b.k / S0 - 1 : null;
    const lab = cwP < 420 ? `main bet $${kS(b.k)}C` : `main bet $${kS(b.k)}C · ${dayY(b.e)}${d != null ? ' (' + pcL(d) + ')' : ''}`;
    if (b.k >= lo && b.k <= hi) {
      const yb = y(b.k);
      s += `<line x1="${xa.toFixed(1)}" x2="${xb.toFixed(1)}" y1="${yb.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="#c5b3f0" stroke-width="1.3" stroke-dasharray="6,4"><title>The strike with the most calls added (${STEALTH ? 'over the build window' : 'that loud day'}): $${kS(b.k)} by ${dayY(b.e)}</title></line>` +
        `<text x="${(xb - 6).toFixed(1)}" y="${(yb - 5).toFixed(1)}" fill="#c5b3f0" font-size="11" text-anchor="end" stroke="#131722" stroke-width="3" paint-order="stroke">${lab}</text>`;
    } else s += `<text x="${(xb - 4).toFixed(1)}" y="${b.k > hi ? pTop + 12 : pBotP - 4}" fill="#c5b3f0" font-size="11" text-anchor="end" stroke="#131722" stroke-width="3" paint-order="stroke">${b.k > hi ? '↑' : '↓'} ${lab}</text>`; }
  const cellW = Math.max(3, Math.min(10, step * 0.78)), yr = pBot - 10;
  const CC = { t: ['#26a69a', 'a steady build day'], b: ['#ff9800', 'a very loud day'], o: [null, 'not a steady day'], x: [null, 'not judged that settle (too few open calls or no data)'] };
  const cells = G.strip.filter(c => ix[c[0]] != null);
  if (cells.length) {
    const x0 = X(ix[cells[0][0]]) - cellW / 2 - 2, x1 = X(ix[cells[cells.length - 1][0]]) + cellW / 2 + 2;
    s += `<line x1="${x0.toFixed(1)}" x2="${x1.toFixed(1)}" y1="${pBot - 1.5}" y2="${pBot - 1.5}" stroke="#5a4a8a" stroke-width="1.2"><title>The steady-build window: one cell per settle</title></line>`;
    if (x0 > padL + 70) s += `<text x="${(x0 - 4).toFixed(1)}" y="${yr + 7}" fill="#787b86" font-size="10" text-anchor="end">calls built</text>`;
    cells.forEach(([d, c, pr, p1, c1]) => { const cx = X(ix[d]), [col, w] = CC[c] || CC.x;
      const t = `<title>${day(d)} settle: ${w}${p1 != null ? ` · calls added ${pc(p1, 1)} of the open calls (${kp(c1)})` : ''}${pr != null ? ` · louder than ${Math.round(pr * 100)}% of the market` : ''}</title>`;
      s += c === 'x' ? `<rect x="${(cx - cellW / 2).toFixed(1)}" y="${yr + 3}" width="${cellW.toFixed(1)}" height="1.5" fill="#4a4f5c">${t}</rect>`
        : `<rect x="${(cx - cellW / 2).toFixed(1)}" y="${yr}" width="${cellW.toFixed(1)}" height="7" rx="1.5" ${col ? `fill="${col}"` : 'fill="none" stroke="#4a4f5c" stroke-width="1.2"'}>${t}</rect>`; });
  }
  G.letters.forEach(([d, t]) => { const i = ix[d]; if (i == null) return;
    s += `<text x="${X(i).toFixed(1)}" y="${yr - 4}" fill="${TCOL[t]}" font-size="9.5" font-weight="700" text-anchor="middle">${STLET[t]}<title>${day(d)} settle: ${TLONG[t]}</title></text>`; });
  return s;
}
function chartSVG(n, W, H) {
  const O0 = n.ohlc || [], zb = czBars(), off = zb && O0.length > zb ? O0.length - zb : 0;
  const O = off ? O0.slice(off) : O0, N = O.length, WS = [];
  if (!N) return '<div class="empty">No daily bars.</div>';
  const SG = sigOf(n);
  const gh = gexH(n), G = gh ? n.gx.H[gh] : null, narrowG = W < 700;
  const padL = 6, padR = 60, cw = W - padL - padR, cwP = G ? cw * (narrowG ? 0.55 : 0.62) : cw, step = cwP / N, X = i => padL + (i + 0.5) * step;
  const pTop = 22, pBot = H - 30, oTop = pBot, oBot = H - 22;
  const pBotP = SG && (SG.strip.length || SG.letters.length) ? pBot - (SG.letters.length ? 26 : 16) : pBot;
  const hs = O.map(r => r[1] ?? r[3]), ls = O.map(r => r[2] ?? r[3]), cs = O.map(r => r[3]);
  const wline = null;
  const gl = n.gex && n.gex.level && n.gex.level.k <= cs[N - 1] * 1.3 ? n.gex.level : null;
  let lo = Math.min(...ls), hi = Math.max(...hs);
  if (wline && wline < hi * 1.02 && wline > lo * 0.9) { lo = Math.min(lo, wline); hi = Math.max(hi, wline); }
  if (gl && !G) hi = Math.max(hi, gl.k);
  const LPV = LP(n.s);
  if (LPV) { lo = Math.min(lo, LPV[0]); hi = Math.max(hi, LPV[0]); }
  const S0 = G && n.gx.repriced ? n.gx.spot : cs[N - 1];
  if (G) {
    const L = G.lv, pos = G.bars.filter(b => b[1] > 0 && b[0] > S0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(b => b[0]);
    const neg = G.bars.filter(b => b[1] < 0 && b[0] < S0).sort((a, b) => a[1] - b[1]).slice(0, 2).map(b => b[0]);
    [L.king, L.call_wall, L.put_wall, ...pos, ...neg].filter(k => k != null && k >= S0 * 0.7 && k <= S0 * 1.4)
      .forEach(k => { lo = Math.min(lo, k); hi = Math.max(hi, k); });
  }
  if (SG && SG.bet && SG.bet.k >= S0 * 0.7 && SG.bet.k <= S0 * 1.4) { lo = Math.min(lo, SG.bet.k); hi = Math.max(hi, SG.bet.k); }
  const padY = (hi - lo) * 0.06; lo -= padY; hi += padY;
  const y = p => pTop + (hi - p) / (hi - lo) * (pBotP - pTop);
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;font-variant-numeric:tabular-nums;font-family:inherit">`;
  WS.forEach((k, i) => { if (k === 3) s += `<rect x="${(X(i) - step / 2).toFixed(1)}" y="${pTop}" width="${(step + 0.4).toFixed(1)}" height="${pBot - pTop}" fill="rgba(79,163,247,.13)"/>`; });
  const st = niceStep(hi - lo);
  for (let p = Math.ceil(lo / st) * st; p < hi; p += st) s += `<line x1="${padL}" x2="${padL + cw}" y1="${y(p)}" y2="${y(p)}" stroke="#1e2230"/><text x="${padL + cw + 6}" y="${y(p) + 4}" fill="#787b86" font-size="11">${p.toFixed(st < 1 ? 2 : st < 10 ? 1 : 0)}</text>`;
  s += `<line x1="${padL + cw}" x2="${padL + cw}" y1="${pTop}" y2="${oBot}" stroke="#2a2e39"/>`;
  if (O[0][1] != null) {
    const up = O.map((r, i) => `${X(i).toFixed(1)},${y(hs[i]).toFixed(1)}`).join(' '), dn = O.map((r, i) => `${X(N - 1 - i).toFixed(1)},${y(ls[N - 1 - i]).toFixed(1)}`).join(' ');
    s += `<polygon points="${up} ${dn}" fill="rgba(209,212,220,.10)"/>`;
  }
  s += `<polyline points="${O.map((r, i) => `${X(i).toFixed(1)},${y(cs[i]).toFixed(1)}`).join(' ')}" fill="none" stroke="#d1d4dc" stroke-width="1.4"/>`;
  const close2 = wline && gl && Math.abs(y(wline) - y(gl.k)) < 14;
  if (gl && !G) s += `<line x1="${padL}" x2="${padL + cw}" y1="${y(gl.k)}" y2="${y(gl.k)}" stroke="#f5d63d" stroke-dasharray="3,3"/><text x="${padL + 4}" y="${y(gl.k) + (close2 && gl.k < wline ? 13 : -4)}" fill="#f5d63d" font-size="11" stroke="#131722" stroke-width="3" paint-order="stroke">call level ${px(gl.k)} (${pc(gl.k / cs[N - 1] - 1, 1)}, ${gl.H}${gl.exp ? ' · ' + expS(gl.exp) : ''})</text>`;
  let lastM = -1, lastX = -99;
  O.forEach((r, i) => { const d = new Date(r[0] + 'T12:00:00'), mo = d.getMonth(); if (mo !== lastM) { lastM = mo; if (X(i) - lastX < 34) return; lastX = X(i); s += `<line x1="${X(i)}" x2="${X(i)}" y1="${oBot}" y2="${oBot + 4}" stroke="#363a45"/><text x="${X(i) + 2}" y="${H - 6}" fill="#787b86" font-size="11">${d.toLocaleDateString('en-US', { month: 'short' })}</text>`; } });
  const ix = {}; O.forEach((r, i) => { ix[r[0]] = i; });
  if (SG) s += sigSVG(SG, ix, X, y, step, padL, cwP, pTop, pBot, pBotP, lo, hi, S0, O);
  if (SG && SG.lm) s += marksSVG(SG.lm.marks, ix, X, y, ls, hs, pTop, pBotP, sigDet(SG.lm));
  else if (Array.isArray(n.marks)) s += marksSVG(n.marks, ix, X, y, ls, hs, pTop, pBot);
  else if (!(SG && SG.letters.length)) (n.flags || []).forEach(([d, t]) => { const i = ix[d]; if (i == null || !TCOL[t]) return;
    const yy = Math.min(pBotP - 4, y(ls[i]) + 12);
    s += `<path d="M${X(i)},${yy - 7} l5,8 h-10 z" fill="${TCOL[t]}"><title>${day(d)} settle: ${TLONG[t]}</title></path>`; });
  if (G) s += gexLayer(G, gh, y, lo, hi, padL, cw, cwP, pTop, pBot, S0, narrowG, n.gmix && n.gmix.H ? n.gmix.H[gh] : null);
  const lp = cs[N - 1];
  s += `<rect x="${padL + cw + 2}" y="${y(lp) - 9}" width="${padR - 4}" height="18" fill="#2962ff" rx="2"/><text x="${padL + cw + 6}" y="${y(lp) + 4}" font-size="11" fill="#fff">${px(lp)}</text>`;
  if (LPV) {
    const yl = y(LPV[0]), yt = Math.abs(yl - y(lp)) < 18 ? y(lp) + (yl >= y(lp) ? 18 : -18) : yl, xe = padL + (G ? cwP : cw) - 4;
    s += `<line x1="${padL}" x2="${padL + cw}" y1="${yl.toFixed(1)}" y2="${yl.toFixed(1)}" stroke="#ff9800" stroke-dasharray="2,3"/>` +
      `<rect x="${padL + cw + 2}" y="${(yt - 9).toFixed(1)}" width="${padR - 4}" height="18" fill="#ff9800" rx="2"/><text x="${padL + cw + 6}" y="${(yt + 4).toFixed(1)}" font-size="11" fill="#131722" font-weight="700">${px(LPV[0])}</text>` +
      `<text x="${xe}" y="${(yl + (yl < pTop + 16 ? 14 : -5)).toFixed(1)}" fill="#ff9800" font-size="11" text-anchor="end" stroke="#131722" stroke-width="3" paint-order="stroke">live ${etHM(LPV[4])} ET${LPV[1] != null ? ' ' + pc(LPV[1], 1) : ''}${LPV[5] ? ' (stale)' : ''}</text>`;
  }
  return s + '</svg>';
}
function gexLayer(G, gh, y, lo, hi, padL, cw, cwP, pTop, pBot, S0, narrow, mix) {
  const L = G.lv, bx0 = padL + cwP + 10, bx1 = padL + cw - (narrow ? 58 : 150);
  const bars = G.bars.filter(b => b[0] > lo && b[0] < hi && b[1] !== 0);
  const mx = Math.max(1, ...bars.map(b => Math.abs(b[1])));
  const kk = bars.map(b => b[0]).sort((a, b) => a - b); let gap = Infinity;
  for (let i = 1; i < kk.length; i++) gap = Math.min(gap, kk[i] - kk[i - 1]);
  const bh = Math.max(2, Math.min(14, isFinite(gap) ? (y(0) - y(gap)) * 0.75 : 6)), blen = v => Math.abs(v) / mx * (bx1 - bx0);
  let s = `<line x1="${padL + cwP + 4}" x2="${padL + cwP + 4}" y1="${pTop}" y2="${pBot}" stroke="#2a2e39"/>`;
  s += `<text x="${bx0}" y="${pTop - 6}" fill="#787b86" font-size="11">${narrow ? 'GEX ' + gh : 'Net GEX by strike · ' + gh + ' · $ per 1% move'}</text>`;
  if (mix) s += MIX_DEFS;
  bars.forEach(([k, net, c, p]) => { const len = blen(net); if (len < 0.5) return;
    const king = k === L.king, sd = net > 0 ? 'C' : 'P', m = mix ? (mix[String(k)] || {})[sd] : null;
    const tip = `<title>${px(k)} (${pc(k / S0 - 1, 1)}): net ${fm(net)} · calls ${fm(c)} · puts ${fm(-Math.abs(p))}${m ? ' · ' + (sd === 'C' ? 'calls' : 'puts') + ': ' + mixTxt(m) : ''}</title>`;
    if (!m) { s += `<rect x="${bx0}" y="${(y(k) - bh / 2).toFixed(1)}" width="${len.toFixed(1)}" height="${bh.toFixed(1)}" fill="${net > 0 ? (king ? '#3fbfae' : '#26a69a') : '#ef5350'}" opacity=".88">${tip}</rect>`; return; }
    const col = MIXCOL[sd], tot = MIXORD.reduce((a, q) => a + (m[q] || 0), 0) || 1;
    let x0 = bx0;
    MIXORD.forEach(q => { const w = len * (m[q] || 0) / tot; if (w < 0.3) return;
      s += `<rect x="${x0.toFixed(1)}" y="${(y(k) - bh / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col[q]}">${tip}</rect>`; x0 += w; }); });
  const used = [];
  const tag = (k, txt, col, tc, dash) => {
    if (k == null || k <= lo || k >= hi) return '';
    const b = bars.find(r => r[0] === k), lx = Math.min(padL + cw - txt.length * 6.3 - 16, bx0 + (b ? blen(b[1]) : 0) + 6), tw = txt.length * 6.3 + 10;
    let ty = y(k);
    for (let i = 0; i < 6; i++) { const u = used.find(v => Math.abs(v - ty) < 19); if (u == null) break; ty = u + (ty >= u ? 19 : -19); }
    used.push(ty);
    return `<line x1="${padL}" x2="${padL + cw}" y1="${y(k)}" y2="${y(k)}" stroke="${col}" stroke-width="1.2"${dash ? ' stroke-dasharray="4,3"' : ''} stroke-opacity=".85"/>` +
      `<rect x="${lx}" y="${ty - 9}" width="${tw}" height="18" rx="3" fill="${col}"/><text x="${lx + tw / 2}" y="${ty + 4}" font-size="11" fill="${tc}" text-anchor="middle" font-weight="700">${txt}</text>`;
  };
  const kingT = tag(L.king, `KING ${px(L.king)} ${pc(L.king / S0 - 1, 1)}${narrow ? '' : ' · ' + fm(L.king_gex)}`, '#f5d63d', '#131722', false);
  if (L.put_wall != null && L.put_wall !== L.king) s += tag(L.put_wall, `PUT WALL ${px(L.put_wall)}`, '#ef5350', '#fff', true);
  if (L.call_wall != null && L.call_wall !== L.king) s += tag(L.call_wall, `CALL WALL ${px(L.call_wall)}`, '#26a69a', '#fff', true);
  s += kingT;
  return s;
}
const MCOL = { C: { buy: '#ff8a50', sell: '#ff8a50', spread: '#d6c26a', move: '#5c9ded', other: '#ef5350' },
  P: { buy: '#ff6b8a', sell: '#ff6b8a', spread: '#d6c26a', move: '#5c9ded', other: '#9598a1', unclear: '#9598a1' } };
const MHOL = { sell: 1, unclear: 1 };
const MWORD = { C: { buy: 'Loud call buying', sell: 'Loud call selling (lean)', spread: 'Loud call spread', move: 'Loud calls on a move day',
  other: 'Loud calls, other (puts too / deep / paired)' }, P: { buy: 'Loud put buying (lean)', sell: 'Loud put selling (lean)',
  spread: 'Loud put spread', move: 'Loud puts on a move day', other: 'Loud puts, other (calls too / deep / paired)', unclear: 'Loud puts, side unclear' } };
const mGlyph = (sd, m) => sd === 'C' ? (MHOL[m] ? '△' : '▲') : (MHOL[m] ? '▽' : '▼');
const MIXORD = ['b', 's', 'sp', 'u', 'before'];
const MIXCOL = { C: { b: '#26a69a', s: 'url(#mxC)', sp: '#d6c26a', u: '#4a4f5c', before: '#1d4a45' },
  P: { b: '#ef5350', s: 'url(#mxP)', sp: '#d6c26a', u: '#4a4f5c', before: '#5a2626' } };
const MIXWORD = { b: 'bought lean', s: 'sold lean', sp: 'spread legs', u: 'no quote', before: 'opened before our data' };
const MIX_DEFS = '<defs><pattern id="mxC" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#123c38"/><rect width="2.2" height="5" fill="#26a69a"/></pattern><pattern id="mxP" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#3d1a1a"/><rect width="2.2" height="5" fill="#ef5350"/></pattern></defs>';
const mixTxt = m => { const t = MIXORD.reduce((a, q) => a + (m[q] || 0), 0) || 1; return MIXORD.filter(q => m[q] / t >= 0.005).map(q => `${MIXWORD[q]} ${Math.round(100 * m[q] / t)}%`).join(' · '); };
function marksSVG(marks, ix, X, y, ls, hs, pTop, pBot, det) {
  let s = '';
  const last = { C: [-99, 0], P: [-99, 0] };
  marks.slice().sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).forEach(([d, sd, m]) => {
    const i = ix[d], col = (MCOL[sd] || {})[m]; if (i == null || !col) return;
    const x = X(i), L = last[sd], lvl = x - L[0] < 11 ? Math.min(3, L[1] + 1) : 0; last[sd] = [x, lvl];
    const paint = MHOL[m] ? `fill="#131722" stroke="${col}" stroke-width="1.7"` : `fill="${col}"`;
    const t = `<title>${day(d)} settle: ${MWORD[sd][m]}${det && det[d + '|' + sd] ? ' — ' + det[d + '|' + sd] : ''}</title>`;
    if (sd === 'C') { const yy = Math.min(pBot - 4, y(ls[i]) + 13 + lvl * 10);
      s += `<path d="M${x.toFixed(1)},${(yy - 8).toFixed(1)} l5.5,9 h-11 z" ${paint}>${t}</path>`; }
    else { const yy = Math.max(pTop + 6, y(hs[i]) - 13 - lvl * 10);
      s += `<path d="M${x.toFixed(1)},${(yy + 8).toFixed(1)} l5.5,-9 h-11 z" ${paint}>${t}</path>`; } });
  return s;
}
function legendSides() {
  const it = (sd, m) => `<span><i class="${MHOL[m] ? 'ho' : ''}" style="${MHOL[m] ? 'border-color' : 'background'}:${MCOL[sd][m]}"></i>${mGlyph(sd, m)} ${MWORD[sd][m].replace(' (lean)', '')}</span>`;
  return `<span class="lg">CALLS ▲</span>${['buy', 'sell', 'spread', 'move', 'other'].map(m => it('C', m)).join('')}` +
    `<span class="lg">PUTS ▼</span>${['buy', 'sell', 'spread', 'move', 'other'].map(m => it('P', m)).join('')}`;
}
function oiSideSVG(n, W, H) {
  const rows = (n.side || []).slice(-14);
  if (!rows.length) return oiSVG(n, W, H);
  const narrow = W < 600;
  const padL = 6, padR = 60, cw = W - padL - padR, step = cw / rows.length, top = 36, bot = H - 22, mid = top + (bot - top) * 0.68;
  const tot = a => a[2] + a[3] + a[4] + a[5];
  const mx = Math.max(1, ...rows.map(r => Math.max(tot(r[1]), tot(r[2])))), mc = Math.max(1, ...rows.map(r => Math.max(r[1][1], r[2][1])));
  const sc = Math.max(mx, mc * (mid - top) / (bot - mid)), hh = v => v / sc * (mid - top);
  const mk = {}; (n.marks || []).forEach(([d, sd, m]) => { (mk[d] = mk[d] || {})[sd] = m; });
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;font-variant-numeric:tabular-nums;font-family:inherit">
    <defs><pattern id="hC" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#123c38"/><rect width="2.2" height="5" fill="#26a69a"/></pattern>
    <pattern id="hP" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#3d1a1a"/><rect width="2.2" height="5" fill="#ef5350"/></pattern></defs>
    <text x="${padL}" y="14" fill="#787b86" font-size="11">${narrow ? 'OI added per settle by side (lean)' : 'Open interest added each settle — green calls, red puts — split by side: <tspan fill="#d1d4dc">solid = bought lean</tspan> · <tspan fill="#d1d4dc">striped = sold lean</tspan> · <tspan fill="#d6c26a">gold = spread legs</tspan> · grey = no quote · below the line = closed'}</text>
    ${narrow ? '<text x="' + padL + '" y="28" fill="#5d606b" font-size="10.5">solid bought · striped sold · gold spread · below = closed</text>' : ''}
    <line x1="${padL}" x2="${padL + cw}" y1="${mid}" y2="${mid}" stroke="#363a45"/>
    <text x="${padL + cw + 6}" y="${top + 8}" fill="#787b86" font-size="10.5">+${kf(sc)}</text><text x="${padL + cw + 6}" y="${bot}" fill="#787b86" font-size="10.5">−${kf(sc * (bot - mid) / (mid - top))}</text>`;
  const stack = (x, bw, a, solid, hatch, closedCol, lab, d) => {
    let yb = mid, out = '';
    [[2, '#d6c26a', 'spread legs'], [3, solid, 'bought lean'], [4, `url(#${hatch})`, 'sold lean'], [5, '#4a4f5c', 'no quote']].forEach(([k, col, nm]) => {
      const h = hh(a[k]); if (h < 0.4) return; yb -= h;
      out += `<rect x="${x.toFixed(1)}" y="${yb.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"><title>${day(d)} settle · ${lab} ${nm}: ${kf(a[k])}</title></rect>`; });
    if (a[1] > 0) out += `<rect x="${x.toFixed(1)}" y="${mid}" width="${bw.toFixed(1)}" height="${Math.max(0.5, hh(a[1])).toFixed(1)}" fill="${closedCol}" opacity=".75"><title>${day(d)} settle · ${lab} closed: ${kf(a[1])}</title></rect>`;
    const bs = a[3] + a[4];
    if (bs > 0 && hh(tot(a)) > 13 && bw >= 14) out += `<text x="${(x + bw / 2).toFixed(1)}" y="${(mid - hh(tot(a)) - 4).toFixed(1)}" fill="#9598a1" font-size="9.5" text-anchor="middle">${Math.round(a[3] / bs * 100)}/${Math.round(a[4] / bs * 100)}</text>`;
    return out; };
  rows.forEach(([d, C, P], i) => { const x0 = padL + i * step, bw = Math.max(2, step * 0.3);
    s += stack(x0 + step * 0.16, bw, C, '#26a69a', 'hC', '#1e6f67', 'calls', d);
    s += stack(x0 + step * 0.54, bw, P, '#ef5350', 'hP', '#8a3b39', 'puts', d);
    const m = mk[d] || {}, lc = m.C ? MCOL.C[m.C] : m.P ? MCOL.P[m.P] : '#787b86';
    if ((rows.length - 1 - i) % Math.max(1, Math.ceil((W < 600 ? 54 : 40) / step)) === 0 && x0 + step / 2 >= (W < 600 ? 28 : 0)) s += `<text x="${(x0 + step / 2).toFixed(1)}" y="${H - 6}" fill="${lc}" font-size="10.5" text-anchor="middle">${day(d)}${m.P ? ` <tspan fill="${MCOL.P[m.P]}">${mGlyph('P', m.P)}</tspan>` : ''}${m.C ? ` <tspan fill="${MCOL.C[m.C]}">${mGlyph('C', m.C)}</tspan>` : ''}</text>`; });
  return s + '</svg>';
}
function oiSVG(n, W, H) {
  const rows = (n.oi || []).slice(-14);
  if (!rows.length) return '<div class="note" style="padding:8px 0">No contract-level option data for this name (the saved chains start Sep 24 and cover ~1,800 names).</div>';
  const padL = 6, padR = 60, cw = W - padL - padR, step = cw / rows.length, top = 26, bot = H - 22, mid = (top + bot) / 2;
  const mx = Math.max(1, ...rows.map(r => Math.max(Math.abs(r[1]), Math.abs(r[2]))));
  const hh = v => Math.abs(v) / mx * (bot - top) / 2;
  const fl = {}; (n.flags || []).forEach(([d, t]) => { fl[d] = t; });
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;font-variant-numeric:tabular-nums;font-family:inherit">
    <text x="${padL}" y="14" fill="#787b86" font-size="11">${W < 600 ? 'OI added per settle · green calls, red puts' : 'Open interest added each settle, same expiries (green = calls, red = puts; below the line = closed)'}</text>
    <line x1="${padL}" x2="${padL + cw}" y1="${mid}" y2="${mid}" stroke="#363a45"/>
    <text x="${padL + cw + 6}" y="${top + 8}" fill="#787b86" font-size="10.5">+${kf(mx)}</text><text x="${padL + cw + 6}" y="${bot}" fill="#787b86" font-size="10.5">−${kf(mx)}</text>`;
  rows.forEach((r, i) => { const x0 = padL + i * step, bw = Math.max(2, step * 0.34);
    const [d, c, p] = r;
    s += `<rect x="${(x0 + step * 0.14).toFixed(1)}" y="${(c >= 0 ? mid - hh(c) : mid).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, hh(c)).toFixed(1)}" fill="${c >= 0 ? '#26a69a' : '#1e6f67'}"><title>${day(d)} settle: calls ${c >= 0 ? '+' : ''}${kf(c)} (added ${kf(r[3])})</title></rect>`;
    s += `<rect x="${(x0 + step * 0.52).toFixed(1)}" y="${(p >= 0 ? mid - hh(p) : mid).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0.5, hh(p)).toFixed(1)}" fill="${p >= 0 ? '#ef5350' : '#8a3b39'}"><title>${day(d)} settle: puts ${p >= 0 ? '+' : ''}${kf(p)} (added ${kf(r[4])})</title></rect>`;
    if ((rows.length - 1 - i) % Math.max(1, Math.ceil((W < 600 ? 54 : 40) / step)) === 0 && x0 + step / 2 >= (W < 600 ? 28 : 0)) s += `<text x="${(x0 + step / 2).toFixed(1)}" y="${H - 6}" fill="${fl[d] && TCOL[fl[d]] ? TCOL[fl[d]] : '#787b86'}" font-size="10.5" text-anchor="middle">${day(d)}</text>`; });
  return s + '</svg>';
}
async function renderDetail() { return LOUD ? renderDetailLd() : renderDetailS(); }
let SEEK_BASE = '../price-seeker/';
function seekBox(sym) {
  return `<div id="seekbox"><div class="sk-h"><span class="k">Price Seeker</span><span class="muted">the far call pile, its odds and the facts for this name</span></div>
    <div class="empty" id="skWait">Loading Price Seeker…</div><iframe id="skFrame" title="Price Seeker for ${esc(sym)}" referrerpolicy="no-referrer" src="${SEEK_BASE}?embed=1#${encodeURIComponent(sym)}"></iframe></div>`;
}
window.addEventListener('message', e => {
  const f = $('#skFrame');
  if (!f || e.source !== f.contentWindow || !e.data || e.data.type !== 'ps-embed') return;
  const h = Math.max(0, Math.min(6000, Math.round(+e.data.h) || 0));
  f.style.height = h + 'px';
  const w = $('#skWait'); if (w && h > 40) w.remove();
});
function drawCharts(n) {
  const box = $('#chart'); if (!box) return;
  const W = Math.max(280, box.clientWidth - 2);
  box.innerHTML = chartSVG(n, W, NARROW() ? 300 : Math.max(380, Math.min(500, window.innerHeight - 380)));
  const ob = $('#oichart'); if (ob) ob.innerHTML = Array.isArray(n.side) && n.side.length ? oiSideSVG(n, W, NARROW() ? 190 : 210) : oiSVG(n, W, NARROW() ? 150 : 170);
}
const CATS = [['all', 'All'], ['none', 'No earnings before expiry'], ['earn', 'Earnings before expiry'], ['unk', 'Unknown']];
const CATORD = { none: 0, unk: 1, earn: 2 };
const SX = r => (r && r.x) || {};
function catPill(r, sm) {
  if (!r || !r.cat) return '';
  const c = sm ? ' sm' : '';
  if (r.cat === 'earn') return `<span class="catp earn${c}" title="Next earnings ${day(r.ced)}: before the main expiry — a known catalyst">Earnings ${day(r.ced)}</span>`;
  if (r.cat === 'none') return `<span class="catp none${c}" title="${r.fund ? 'A fund: no earnings' : 'No earnings date before the main expiry' + (r.ced ? ' (next: ' + day(r.ced) + ')' : '')} — unexplained by earnings">${r.fund ? 'Fund · no earnings' : sm ? 'No earnings' : 'No earnings before expiry'}</span>`;
  return `<span class="catp unk${c}" title="No earnings date known">${sm ? 'Unknown' : 'Catalyst unknown'}</span>`;
}
function stripHTML(x, big) {
  const cs = (x.cells || '').split('');
  const pad = Math.max(0, 10 - cs.length);
  const cls = { b: 'b', t: 'on', o: '', x: 'na' };
  return `<span class="pstrip ${big ? 'big' : ''}" title="One cell per settle, oldest first (${cs.length} of 10): green = a steady build day, orange = a very loud day, hollow = not a steady day, dash = not judged (too few open calls or no data)">${'<i class="pad"></i>'.repeat(pad)}${cs.map(c => `<i class="${cls[c] ?? 'na'}"></i>`).join('')}</span>`;
}
if (STEALTH) Object.assign(SORTS, { per: r => (SX(r).ntop || 0) / Math.max(1, SX(r).n || 1), cap: r => SX(r).cap ?? -9, prem: r => SX(r).prem ?? -1,
  da: r => SX(r).da ?? -1, on: r => SX(r).on ?? -1, mx: r => SX(r).mdist ?? 9, ivb: r => SX(r).ivb ?? -99, cvp: r => SX(r).cp ?? -1,
  move: r => SX(r).move ?? 9, cat: r => CATORD[r.cat] ?? 1, biz: r => r.biz ?? -1 });
const heldTxt = h => h && h.c && h.p ? (h.c >= h.p ? `${(h.c / h.p).toFixed(1)} : 1` : `1 : ${(h.p / h.c).toFixed(1)}`) : null;
const fails1 = r => (r.why || '').split('; ').filter(Boolean);
async function renderBoardS() {
  if (SLD() && LOUDB === undefined) { await loadLoud(null); if (S.v !== 'board') return; }
  if (winOn() && winDays().some(d => d !== D.meta.settle && (D.saved_days || []).includes(d) && !DAYB[d] || SLD() && LOUDB && !(LOUDB.lookback || []).includes(d) && (LOUDB.saved_days || []).includes(d) && !(d in LOUDD))) {
    $('#main').innerHTML = `<div class="empty">Loading the last ${esc(dwName().toLowerCase())}…</div>`;
    await loadWindow(); if (S.v !== 'board') return;
  }
  return renderSimpleS();
}
function verdictS(n) {
  const x = n.x || {};
  const why = (n.why || '').split('; ').filter(Boolean);
  if (n.t === 'S') return `A stealth build: steady call building on ${x.ntop} of the last ${x.n} settles, no single big block, calls ${x.cp >= 99 ? 'with puts flat or closing' : (x.cp || 0).toFixed(1) + '× the puts'}, the price ${pc(x.move, 1)} over the window.`;
  if (n.t === 'Q') return `Quiet but loud: the build passes, but ${why.join('; ')}.`;
  if (n.t === 'M') return `Price already moving: the build passes, but ${why.join('; ')}.`;
  if (n.t === 'WATCH') return `Building toward it: ${why.join('; ')}.`;
  return 'Not on the list' + (why.length ? ` — ${why.join('; ')}.` : '.');
}
function gateListS(n) {
  const x = n.x || {}, g = n.g || {};
  const it = (ok, t) => `<span class="${ok ? 'y' : 'n'}">${ok ? '✓' : '✕'}</span><span>${t}</span>`;
  const hd = (t, ok) => `<div class="hd"><span>${t}</span>${ok ? '<span class="ok">passes</span>' : '<span class="no">fails</span>'}</div>`;
  if (!g.judged) return `<div class="ck">${hd('Not judged', false)}${it(false, esc(n.why || 'not enough history'))}</div>`;
  const blast = (x.cells || '').indexOf('b');
  const stl = g.noblast && g.onesess && g.spread && g.notsold && g.cp && g.deep && g.paired;
  return `<div class="ck">${hd('1 · Steady', g.persist)}${it(g.persist, `a steady day on <b>${x.ntop}</b> of ${x.n} settles ${stripHTML(x)}`)}
    ${hd('2 · Stealth', stl)}${it(g.noblast, g.noblast ? 'no very loud day on any settle' : `one very loud day (settle ${blast + 1} of ${x.n})`)}
    ${it(g.onesess, `biggest session ${pu(x.one)} of the calls added`)}
    ${it(g.spread, `${x.ne ?? '–'} expiries with a real share of the adds · two biggest contracts ${pu(x.t2)}`)}
    ${it(g.notsold, x.bs == null ? 'too few prints to judge call selling' : `${pu(x.bs)} of the build's prints above the mid`)}
    ${it(g.cp, `calls added ${x.cp != null ? (x.cp >= 99 ? 'with puts flat or closing' : x.cp.toFixed(1) + '× the puts') : '–'}`)}
    ${it(g.deep, `${pu(x.deep)} deep in the money`)}${it(g.paired, `${pu(x.paired)} paired with puts (conversions / straddles)`)}
    ${hd('3 · Size', g.size)}${it(g.size, `${kp(x.ca)} calls · ${fm(x.prem)} premium · Δ/ADV ${da(x.da)}`)}
    ${hd('4 · Quiet price', g.move && g.rv)}${it(g.move, `price ${pc(x.move, 1)} since the ${day(x.S)} settle`)}
    ${it(g.rv, `short-term volatility ${x.rv != null ? x.rv.toFixed(2) + '×' : 'n/a'} its usual level`)}</div>`;
}
function ivtSVG(st, x, W, H) {
  const pts = Object.entries(st.ivt || {}).filter(([e, v]) => v != null).map(([e, v]) => [yymm(e), v]).sort((a, b) => a[0].localeCompare(b[0]));
  if (pts.length < 2) return '<div class="note">Not enough expiries with an at-the-money IV.</div>';
  const L = 6, R = 46, T = 14, B = 20, pw = W - L - R, ph = H - T - B, N = pts.length;
  const vs = pts.map(p => p[1]).concat(st.iv30 ? [st.iv30] : []);
  let lo = Math.min(...vs), hi = Math.max(...vs); const pd = Math.max(0.01, (hi - lo) * 0.12); lo -= pd; hi += pd;
  const Xi = i => L + (N > 1 ? i / (N - 1) : 0.5) * pw, Y = v => T + (hi - v) / (hi - lo) * ph;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="At-the-money implied volatility by expiry" style="display:block;font-family:inherit;font-variant-numeric:tabular-nums">`;
  const st5 = niceStep(hi - lo, 4);
  for (let v = Math.ceil(lo / st5) * st5; v < hi; v += st5) s += `<line x1="${L}" x2="${L + pw}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#1e2230"/><text x="${L + pw + 5}" y="${(Y(v) + 4).toFixed(1)}" fill="#787b86" font-size="10.5">${Math.round(v * 100)}%</text>`;
  if (st.iv30) s += `<line x1="${L}" x2="${L + pw}" y1="${Y(st.iv30).toFixed(1)}" y2="${Y(st.iv30).toFixed(1)}" stroke="#787b86" stroke-dasharray="3,3"/><text x="${L + pw - 2}" y="${(Y(st.iv30) - 4).toFixed(1)}" fill="#787b86" font-size="10.5" text-anchor="end" stroke="#1e222d" stroke-width="3" paint-order="stroke">30-day ${Math.round(st.iv30 * 100)}%</text>`;
  s += `<polyline points="${pts.map((p, i) => `${Xi(i).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="#c5b3f0" stroke-width="1.6"/>`;
  pts.forEach((p, i) => { const main = p[0] === x.mx;
    s += `<circle cx="${Xi(i).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${main ? 5 : 2.4}" fill="${main ? '#f5d63d' : '#c5b3f0'}"${main ? ' stroke="#131722" stroke-width="1.5"' : ''}><title>${expS(p[0])}: ATM IV ${pu(p[1], 1)}${main ? ' (main expiry)' : ''}</title></circle>`;
    if (main) s += `<text x="${Math.min(L + pw - 4, Math.max(L + 30, Xi(i))).toFixed(1)}" y="${(Y(p[1]) - 9).toFixed(1)}" fill="#f5d63d" font-size="11" text-anchor="middle" stroke="#131722" stroke-width="3" paint-order="stroke">main ${pu(p[1], 1)}</text>`; });
  const every = Math.max(1, Math.ceil(N / Math.max(2, Math.floor(pw / 62))));
  const mi = pts.findIndex(p => p[0] === x.mx);
  pts.forEach((p, i) => { if ((i % every === 0 && (mi < 0 || i === mi || Math.abs(Xi(i) - Xi(mi)) >= 40)) || p[0] === x.mx) s += `<text x="${Xi(i).toFixed(1)}" y="${H - 5}" fill="${p[0] === x.mx ? '#f5d63d' : '#787b86'}" font-size="10" text-anchor="${i === 0 ? 'start' : i === N - 1 ? 'end' : 'middle'}">${expS(p[0]).replace(/ '\d\d$/, '')}</text>`; });
  return s + '</svg>';
}
function stealthCard(n) {
  const st = n.st || {}, x = n.x || {};
  const strip = st.strip || [];
  const cellW = { b: '<span class="am">very loud</span>', t: '<span class="up">steady</span>', o: 'not steady', x: '<span class="muted">not judged</span>' };
  const rows = strip.slice().reverse().map(([s, c, pr, p1, c1]) => `<tr><td>${day(s)}</td><td>${cellW[c] || c}</td><td>${pr != null ? 'louder than ' + Math.round(pr * 100) + '%' : '–'}</td><td>${pc(p1, 1)}</td><td>${kp(c1)}</td></tr>`).join('');
  const W = Math.min(380, Math.max(260, (($('.det .side') || {}).clientWidth || 400) - 50));
  const ced = n.cat === 'earn' ? `next earnings <b class="am">${day(n.ced)}</b>, before the ${expS(x.mx)} main expiry — a known catalyst`
    : n.cat === 'none' ? (n.fund ? 'a fund: no earnings' : `no earnings before the ${expS(x.mx)} main expiry${n.ced ? ` (next: ${day(n.ced)})` : ''} — unexplained by earnings`)
    : 'no earnings date known — catalyst unknown';
  const mt = (st.mtop || []).map(([k, a]) => `${px(k)}C +${kf(a)}`).join(' · ');
  return `<div class="card2"><h4><span>Stealth · the build settle by settle</span>${catPill(n, true)}</h4>
    <div class="txt">${stripHTML(x, true)} <b>${x.ntop}</b> of ${x.n} settles steady${x.nblast ? ` · <span class="am">${x.nblast} very loud</span>` : ''} · biggest session ${pu(x.one)} of the adds</div>
    <div class="recw" style="margin-top:6px"><table class="lvt"><tr><th>Settle</th><th>Day</th><th>Rank</th><th>1-session</th><th>Calls added</th></tr>${rows}</table></div>
    <div class="txt" style="margin-top:8px">Window ${day(st.S)} → ${day(st.E)} settle: ${kp(x.ca)} calls (${pc(x.cap)} of the ${kf(st.callsS)} open at the start), ${fm(x.prem)}; puts ${kp(x.put)}.
      ${x.mx ? `<br>Main expiry <b class="kg">${expS(x.mx)}</b> (${pu(x.mshare)} of the adds), main strike <b class="kg">${px(x.mk)} C</b>${x.spot ? ` (${pc(x.mdist, 1)} from ${px(x.spot)})` : ''}.${mt ? ` <span class="muted">Top strikes there: ${mt}.</span>` : ''}` : ''}
      <br>Out of the money ${pu(x.otm)} · in near-dated expiries ${pu(x.near)} · both ${pu(x.on)}.
      ${heldTxt(heldOf(n)) ? (h => `<br>All options held: <b>${kf(h.c)}</b> calls · <b>${kf(h.p)}</b> puts = <b class="${h.c >= h.p ? 'up' : 'dn'}">${heldTxt(h)}</b> calls to puts${heldTxt({ c: h.c0, p: h.p0 }) ? ` (was ${heldTxt({ c: h.c0, p: h.p0 })} on ${day(st.S)})` : ''}.`)(heldOf(n)) : ''}
      <br>Catalyst: ${ced}.</div>
    <h4 style="margin-top:10px"><span>IV by expiry · at the money</span><span>${x.ivb != null ? `bump ${x.ivb > 0 ? '+' : ''}${x.ivb.toFixed(1)} vol pts` : ''}</span></h4>
    ${ivtSVG(st, x, W, 150)}
    <div class="note" style="margin-top:4px">From the chain carrying the ${day(st.E)} settle (traded ${day(st.iv_day)}). IV bump = the main expiry's ATM IV minus its neighbours' average: a bump means the options price an event around that date.</div></div>`;
}
function windowCard(n) {
  const st = n.st || {}, x = n.x || {};
  if (st.drop) return `<div class="card2"><h4><span>Window · top call contracts</span></h4><div class="note">Window dropped: ${esc(st.drop)}.</div></div>`;
  const tops = (st.top_c || []).filter(t => t[0] > 0).slice(0, 14).sort((a, b) => a[1].localeCompare(b[1]) || a[2] - b[2]);
  const exps = Object.entries(st.byexp || {}).filter(([e, v]) => v > 0).sort((a, b) => a[0].localeCompare(b[0]));
  const mx = Math.max(1, ...exps.map(e => e[1])), big = bigExp(exps, x.ne);
  return `<div class="card2"><h4><span>Window · top call contracts</span><span>${day(st.S)} → ${day(st.E)}</span></h4>
    <div class="exps">${exps.map(([e, v]) => `<div class="eb"><span class="${yymm(e) === x.mx ? 'kg' : ''}">${expS(yymm(e))}</span><i><b style="width:${(v / mx * 100).toFixed(0)}%" class="${big.has(e) ? 'on' : ''}"></b></i><span class="num">${kf(v)}</span></div>`).join('')}</div>
    <div class="recw"><table class="lvt"><tr><th>Expiry</th><th>Strike</th><th>Away</th><th>Added</th><th>Open after</th><th>Δ</th></tr>${tops.map(t => `<tr><td>${expS(yymm(t[1]))}</td><td>${px(t[2])} C</td><td>${st.spot ? pc(t[2] / st.spot - 1) : ''}</td><td class="up">+${kf(t[0])}</td><td>${kf(t[3])}</td><td>${t[5] != null ? t[5].toFixed(2) : ''}</td></tr>`).join('')}</table></div>
    <div class="note" style="margin-top:6px">The same contract compared at the ${day(st.S)} and ${day(st.E)} settles (expiries still open at both settles); sorted by expiry, the largest ${tops.length} additions. Gold = the main expiry.</div></div>`;
}
async function renderDetailS() {
  const sym = S.s;
  $('#main').innerHTML = `<div class="det"><div class="cbox"><div class="empty">Loading ${esc(sym)}…</div></div><div class="side"></div></div>`;
  let n;
  if (SLD()) await loadLoud(null);
  try { n = await loadName(sym); } catch (e) {
    $('#main').innerHTML = noPage(sym, 'Stealth Calls') + `${(LOUDB && LOUDB.by[sym]) ? `<div class="empty" style="padding-top:0"><a class="btn" href="${ldUrl(sym)}">${SPK}Open in Loud Calls</a></div>` : ''}`; return; }
  if (S.s !== sym || S.v !== 'detail') return;
  $('.det .cbox').innerHTML = `<div class="chead"><span class="t"><b>${sym}</b> ${tb(n.t)} ${catPill(n, true)} · ${esc(n.name || n.n || '')}</span>
    <span class="muted num">close ${px(n.px)} (${day(n.pd)}) · <span class="${(n.r20 || 0) >= 0 ? 'up' : 'dn'}">${pc(n.r20, 1)} 20d</span> · ${n.dd != null ? Math.round(n.dd * 100) + '% under the 52w high' : ''}</span>
    <span class="hbtns"><button class="btn g" data-v="board">← Board</button></span></div>
    <div class="legend" id="siglegend">${czChips()}${sigLegend(n)}<span>${esc(n.sec || '')}${n.sub ? ' · ' + esc(n.sub) : ''}${n.ind || n.etf ? ' · ' + (n.ind || n.etf) : ''}</span></div>
    <div class="gexbar" id="gexbar"><span class="lab">GEX</span><span class="muted">loading the levels…</span></div>
    <div id="chart"></div><div id="oichart" style="margin-top:6px"></div>${seekBox(sym)}`;
  drawCharts(n);
  loadGex(sym).then(gx => { n.gx = gx; if (S.s !== sym || S.v !== 'detail') return; gexBar(n); drawCharts(n); refreshToday(n); });
  loadLoudName(sym).then(lm => { if (!lm || S.s !== sym || S.v !== 'detail') return; n.lmk = lm; drawCharts(n);
    const lg = $('#siglegend'); if (lg) lg.innerHTML = `${czChips()}${sigLegend(n)}<span>${esc(n.sec || '')}${n.sub ? ' · ' + esc(n.sub) : ''}${n.ind || n.etf ? ' · ' + (n.ind || n.etf) : ''}</span>`; });
  const g = n.gex, gl = g && g.level;
  const fl = (n.flags || []).filter(f => TCOL[f[1]]);
  const bz = n.bizm;
  $('.det .side').innerHTML = (NARROW() ? '' : todayCard(n)) + `
    <div class="card2"><h4><span>${n.t ? 'Why ' + sym + ' is here' : 'The checks'}</span>${tb(n.t)}</h4><div class="txt" style="margin-bottom:6px">${esc(verdictS(n))}${n.t && n.rk ? ` <span class="muted">#${n.rk} in its tier.</span>` : ''}</div>${gateListS(n)}</div>
    ${SLD() ? ldCard(n) : ''}
    ${stealthCard(n)}
    ${windowCard(n)}
    ${gl || g ? `<div class="card2"><h4><span>Where the call money sits</span><span>GEX Hunt · ${day(g.settle)}</span></h4><div class="txt">${gl ? `Nearest big call level above the price: <b class="kg">${px(gl.k)}</b> (${pc(gl.k / n.px - 1, 1)}), ${gl.H} window${gl.exp ? ', main expiry ' + expS(gl.exp) : ''}.` : 'No big call level above the price.'} King: ${Object.entries(g.king || {}).map(([H, k]) => `${H} ${k != null ? px(k) : '–'}`).join(' · ')}.</div></div>` : ''}
    <div class="card2"><h4><span>Business</span><span></span></h4>${bz ? `<div class="txt"><b class="${bz.score >= 70 ? 'up' : bz.score >= 50 ? 'kg' : 'muted'}" style="font-size:20px">${bz.score}</b><span class="muted">/100</span> · ${(bz.m || []).map(m => `${esc(m[1])} ${m[3] == null ? 'n/a' : m[0] === 'peg' ? m[3].toFixed(2) : pc(m[3] / 100, 0)}`).join(' · ')}<div class="note">Each number ranked against the S&amp;P 500 + Nasdaq-100${bz.base === 0 ? ' (this stock is not in them)' : ''}.</div></div>` : `<div class="note">${n.k === 'etf' ? 'Funds have no business score.' : 'No score for this name (fewer than 4 of the 6 business numbers are published).'}</div>`}</div>
    <div class="card2"><h4><span>On the list</span><span></span></h4><div class="txt">${fl.length ? fl.map(f => `${tb(f[1])} ${day(f[0])}`).join(' &nbsp;') : 'Never on a saved settle.'}${n.don ? `<br>${n.new ? '<b>New on the latest settle.</b>' : `<b>${n.don}</b> settles in a row, since ${day(n.since)}.`}` : ''}</div></div>
    <div class="card2"><h4><span>Data</span><span></span></h4><div class="note">Prices to ${day(n.pd)}. Window ${day((n.st || {}).S)} → ${day((n.st || {}).E)} settle; each settle's 1-session build ranked against every name we can judge.${(n.st || {}).earn && (n.st.earn.n || n.st.earn.l) ? ` Earnings: next ${day(n.st.earn.n)}, last ${day(n.st.earn.l)}.` : ''}</div></div>`;
}
let LOUDB;
const LOUDD = {};
const LDTF = ['SL', 'LD'];
const LDLIST = ['L', 'C', 'S'];
const LDLONG = { L: 'Loud call buying', C: 'Loud on a move day (likely news)', S: 'Loud spread (a capped bet)', X: 'Loud, not buying' };
const LDWORD = { L: 'Loud buy', C: 'Loud buy, news day', S: 'Loud spread', X: 'Loud, not buying' };
const SLD = () => STEALTH && !!S.ld;
const LDSECT = {};
const SPK = '<svg class="spk" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6H4.6L8.2 3V13L4.6 10H2Z"/><path d="M10.6 5.6Q12.4 8 10.6 10.4" fill="none" stroke-width="1.6"/><path d="M12.6 3.8Q15.4 8 12.6 12.2" fill="none" stroke-width="1.6"/></svg>';
if (STEALTH) {
  Object.assign(TNAME, { SL: 'S+L', LD: 'Loud' });
  Object.assign(TLONG, { SL: 'Steady + loud: left off the stealth list for being loud', LD: 'Loud only: one loud day (Loud Calls board)' });
  Object.assign(LDSECT, { SL: 'Steady + loud · left off for being loud', LD: 'Loud only · one loud day' });
  Object.assign(CAP, {
    SL: 'Steady call buying the stealth rules leave out because it got loud: steady on many of the last 10 settles, big enough, calls well ahead of the puts, no sign of call selling — but one session was very loud or held a big share of the adds. (Q names, where everything else passes, stay in Q.) The note under each name says why it is loud and what else it misses.',
    LD: 'One loud day, from the Loud Calls board: one session\'s call build among the market\'s very biggest, big and mostly bought — L loud buying, C the same on a big move day, S a spread. Names already shown above carry the loud mark in their own row instead.',
  });
}
async function loadLoud(d) {
  const k = d || '';
  if (k ? k in LOUDD : LOUDB !== undefined) return k ? LOUDD[k] : LOUDB;
  let v = null;
  try { v = await getJSON(k ? 'data/loud/days/' + k + '.json' : 'data/loud.json'); } catch (e) { v = null; }
  if (v) { v.by = {}; (v.rows || []).forEach(r => { v.by[r.s] = r; }); }
  if (k) LOUDD[k] = v; else LOUDB = v;
  return v;
}
function ixBarS() {
  const raw = poolS(true), cnt = k => raw.filter(x => inIx(x[1], k) && (S.tf === 'list' || x[0] === S.tf) && (S.cat === 'all' || x[1].cat === S.cat)).length;
  const btn = ([k, t]) => { const [m, j] = ixInfo(k), off = k !== 'all' && m == null;
    const tip = off ? 'Member list not available' : k === 'all' ? `Every name in the universe: ${(j || 0).toLocaleString()}` : `${(j || 0).toLocaleString()} of ${(m || 0).toLocaleString()} members in the universe`;
    return `<button class="chip ix${S.ix === k ? ' on' : ''}" data-ix="${k}" ${off ? 'disabled' : ''} title="${tip}">${esc(t)}<span class="c">${off ? '–' : cnt(k)}</span></button>${IXGAP[k] ? '<span class="sep"></span>' : ''}`; };
  return `<div class="viewbar sx-kinds ixbar"><span class="muted">List</span>${IXS.map(btn).join('')}</div>${ixNoteS()}`;
}
function ixNoteS() {
  if (S.ix === 'all') return '';
  const [m, j] = ixInfo(S.ix), U = (D.meta.universe || D.rows.length).toLocaleString();
  if (m == null) return `<div class="ixnote am">${esc(ixName(S.ix))}: the member list could not be read — showing nothing for it.</div>`;
  const miss = m - j;
  return `<div class="ixnote"><b>${esc(ixName(S.ix))}</b>: <b class="wh">${j.toLocaleString()}</b> of ${m.toLocaleString()} members are in the Stealth Calls universe (${day(D.meta.settle)} settle)${miss > 0 ? ` · the other ${miss.toLocaleString()} have no options data, too few open calls or too little history` : ''}.${S.ix === 'r2k' ? ' <span class="am">Most Russell 2000 names have too little options trading to judge.</span>' : ''}${S.q ? ' <span class="am">A search looks past the list.</span>' : ''} <span class="muted">The list only narrows the view — the ranking is still against all ${U} names.</span></div>`;
}
const DWS = [['1', 'Today'], ['5', '5 days'], ['10', '10 days'], ['all', 'Total']];
let WLV = null;
const winOn = () => STEALTH && S.dw !== '1' && !pastDay();
const stDays = () => { const a = (D.saved_days || []).slice(); if (!a.includes(D.meta.settle)) a.push(D.meta.settle); return a.sort(); };
function winDays() {
  const L = SLD() && LOUDB ? LOUDB.saved_days || [] : [];
  const all = [...new Set([...stDays(), ...L])].filter(d => d <= D.meta.settle).sort();
  return S.dw === 'all' ? all : all.slice(-(+S.dw || 1));
}
const dwName = () => (DWS.find(x => x[0] === S.dw) || DWS[0])[1];
const dwWhen = () => S.dw === '1' ? `on ${dayW(D.meta.settle)}` : S.dw === 'all' ? `since ${day(winDays()[0])}` : `in the last ${S.dw} days`;
const dwKept = () => { const W = winDays(), f = stDays()[0]; return W.length && W[0] < f ? ` · the stealth list is kept from ${day(f)}` : ''; };
const dwChips = () => `<span class="muted">Dates</span>${DWS.map(([k, t]) => `<button class="chip dw ${S.dw === k ? 'on' : ''}" data-dw="${k}" title="${k === '1' ? 'The latest settle' : k === 'all' ? 'Every saved settle' : 'Any of the last ' + k + ' settles'}">${t}</button>`).join('')}`;
async function loadWindow() {
  if (!winOn()) return;
  const W = winDays(), sd = new Set(D.saved_days || []);
  await Promise.all(W.filter(d => d !== D.meta.settle && sd.has(d) && !DAYB[d]).map(d => loadDay(d).catch(() => null)));
  if (SLD()) { if (LOUDB === undefined) await loadLoud(null);
    const lb = new Set((LOUDB && LOUDB.lookback) || []);
    await Promise.all(W.filter(d => !lb.has(d) && (LOUDB && (LOUDB.saved_days || []).includes(d))).map(d => loadLoud(d))); }
}
function loudWin() {
  if (!LOUDB) return LOUDB;
  const key = S.dw + '|' + winDays().join(',');
  if (WLV && WLV.key === key && WLV.B === LOUDB) return WLV;
  const mk = rows => { const by = {}; rows.forEach(r => { by[r.s] = r; }); return by; };
  let v;
  if (S.dw === '1') { const rows = LOUDB.rows.filter(r => r.ago === 0); v = Object.assign({}, LOUDB, { rows, by: mk(rows) }); }
  else if (S.dw === '5') v = LOUDB;
  else {
    const W = winDays(), lb = LOUDB.lookback || [], TLC = { L: 'L', C: 'C', S: 'S', X: 'x' }, M = {};
    W.forEach((d, i) => { const k = lb.indexOf(d);
      if (k >= 0) LOUDB.rows.forEach(r => { const c = r.tl ? r.tl[k] : (r.e === d ? TLC[r.t] : '.'); if (!c || c === '.') return;
        const m = M[r.s] || (M[r.s] = { cells: {}, row: null }); m.cells[i] = c; if (!m.row || r.e >= m.row.e) m.row = r; });
      else { const X = LOUDD[d]; (X && X.rows || []).forEach(r => { if (!r.t) return;
        const m = M[r.s] || (M[r.s] = { cells: {}, row: null }); m.cells[i] = TLC[r.t] || 'x'; if (!m.row || d > m.row.e) m.row = Object.assign({}, r, { e: d }); }); } });
    const rows = Object.values(M).map(m => { const tl = W.map((d, i) => m.cells[i] || '.').join('');
      const newest = m.row.e, ago = W.length - 1 - W.indexOf(newest);
      return Object.assign({}, m.row, { tl, again: tl.replace(/\./g, '').length, ago: ago >= 0 ? ago : m.row.ago }); });
    v = Object.assign({}, LOUDB, { lookback: W, rows, by: mk(rows) });
  }
  WLV = Object.assign({ key, B: LOUDB }, v);
  return WLV;
}
const curLoud = () => pastDay() ? LOUDD[S.d] : STEALTH && S.v === 'board' ? loudWin() : LOUDB;
function stealthWin() {
  const W = winDays(), sd = new Set(stDays()), cur = {}, M = {};
  D.rows.forEach(r => { cur[r.s] = r; });
  W.forEach(d => { if (!sd.has(d)) return;
    const rows = d === D.meta.settle ? D.rows : (DAYB[d] || { rows: [] }).rows;
    rows.forEach(r => { if (!LISTED.includes(r.t)) return;
      const m = M[r.s] || (M[r.s] = { days: {}, last: null, row: null }); m.days[d] = r.t; if (!m.last || d > m.last) { m.last = d; m.row = r; } }); });
  const out = Object.values(M).map(m => {
    const best = LISTED.slice().sort((a, b) => TORD[a] - TORD[b]).find(t => Object.values(m.days).includes(t));
    const c = cur[m.row.s], now = c && LISTED.includes(c.t) ? c : null;
    return [best, Object.assign({}, now || m.row, { t: best, _wd: m.days, _last: m.last, _now: c ? c.t || null : null, _nowWhy: c && !c.t ? c.why : null,
      _nd: Object.keys(m.days).length, _past: !now })];
  });
  LISTED.forEach(t => out.filter(x => x[0] === t).sort((a, b) => b[1]._nd - a[1]._nd || (a[1]._past - b[1]._past) || (SX(b[1]).prem || 0) - (SX(a[1]).prem || 0) || a[1].s.localeCompare(b[1].s))
    .forEach((x, i) => { x[1].rk = i + 1; }));
  return out;
}
function winStrip(r) {
  if (!r._wd) return '';
  const W = winDays(), sd = new Set(stDays());
  return `<span class="tls wst" title="On the stealth list ${r._nd} of ${W.filter(d => sd.has(d)).length} saved settles in the window, oldest first">${W.map(d => { const t = r._wd[d];
    return !sd.has(d) ? `<i class="nd" title="${day(d)}: no stealth board saved"></i>` : t ? `<i class="t-${t}" title="${day(d)}: ${TLONG[t]}">${STLET[t]}</i>` : `<i class="n" title="${day(d)}: not on the list"></i>`; }).join('')}</span>`;
}
function winNote(r) {
  if (!r._wd) return '';
  if (r._now && r._now !== r.t) return `today: ${TLONG[r._now].toLowerCase()}`;
  if (!r._now) return `off the list today${r._nowWhy ? ' — ' + (whyS({ why: r._nowWhy })[0] || '') : ''} · numbers from ${day(r._last)}`;
  return '';
}
const ldOf = s => { const L = SLD() && curLoud(); return (L && L.by[s]) || null; };
let LOUD_TAB = '../loud-calls/';
const ldUrl = s => `${LOUD_TAB}#s=${encodeURIComponent(s)}`;
let SLC = null;
function steadyLoud() {
  if (SLC && SLC.D === D) return SLC.rows;
  const per = r => (SX(r).ntop || 0) / Math.max(1, SX(r).n || 1);
  const rows = D.rows.filter(r => { const g = r.g;
    return !r.t && g && (g.persist || g.watch) && g.size && g.notsold !== 0 && g.cp && g.deep && g.paired && (g.noblast === 0 || g.onesess === 0); })
    .sort((a, b) => per(b) - per(a) || (SX(b).prem || 0) - (SX(a).prem || 0) || a.s.localeCompare(b.s))
    .map((r, i) => Object.assign({}, r, { t: 'SL', rk: i + 1 }));
  SLC = { D, rows };
  return rows;
}
function poolS(raw) {
  const P = poolAll();
  return raw || S.ix === 'all' || S.q ? P : P.filter(x => inIx(x[1], S.ix));
}
function poolAll() {
  const rows = srcRows(), out = winOn() ? stealthWin() : rows.filter(r => LISTED.includes(r.t)).map(r => [r.t, r]);
  if (!SLD()) return out;
  const seen = new Set(out.map(x => x[1].s));
  if (!pastDay()) steadyLoud().forEach(r => { out.push(['SL', r]); seen.add(r.s); });
  const L = curLoud();
  if (L) L.rows.filter(r => LDLIST.includes(r.t) && !seen.has(r.s))
    .sort((a, b) => LDLIST.indexOf(a.t) - LDLIST.indexOf(b.t) || (SX(b).prem || 0) - (SX(a).prem || 0) || a.s.localeCompare(b.s))
    .forEach((r, i) => out.push(['LD', Object.assign({}, r, { lt: r.t, rk: i + 1 })]));
  return out;
}
const tbL = t => `<span class="tb ldb ${t}" title="${esc(LDLONG[t] || '')}">${SPK}${t}</span>`;
function ldMark(s, sm) {
  const r = ldOf(s); if (!r) return '';
  const x = r.x || {}, L = curLoud();
  const tip = `Loud Calls board, ${day(r.e)} settle: ${LDLONG[r.t]} — ${fm(x.prem)} of calls added in one session, ${kfL(x.ca)} contracts, ${topL(x.loud)} of the market${x.bs != null ? ', ' + pctL(x.bs) + ' of prints above the mid' : ''}${(r.again || 0) >= 2 ? `; loud ${r.again}× in the last ${(L.lookback || []).length} settles` : ''}.`;
  return `<span class="ldm ${r.t}" title="${esc(tip)}">${SPK}${sm ? LDWORD[r.t].replace(', news day', '') : LDWORD[r.t]} ${day(r.e)}${r.t !== 'X' ? ' · ' + fm(x.prem) : ''}${(r.again || 0) >= 2 ? ` · ${r.again}×` : ''}</span>`;
}
function ldTape(r) {
  if (!r.tl) return `<span class="tls"><i class="${r.lt}">${r.lt}</i></span>`;
  const lb = (curLoud() || {}).lookback || [], W = { L: 'loud call buying', C: 'loud on a move day', S: 'loud spread', x: 'loud, not buying', '.': 'nothing loud' };
  return `<span class="tls" title="The Loud Calls board's last ${r.tl.length} settles, oldest first">${r.tl.split('').map((c, i) => `<i class="${c === '.' ? 'n' : c}" title="${lb[i] ? day(lb[i]) + ': ' : ''}${W[c] || c}">${c === '.' ? '' : c === 'x' ? '×' : c}</i>`).join('')}</span>`;
}
function ldSwitch() {
  return `<span class="muted">View</span><span class="lxsw ldsw" title="Stealth + Loud also shows the call building the stealth rules leave out for being loud"><button class="${SLD() ? '' : 'on'}" data-ld="0">Stealth only</button><button class="${SLD() ? 'on' : ''}" data-ld="1">${SPK}Stealth + Loud</button></span><span class="sep"></span>`;
}
function ldCard(n) {
  const r = ldOf(n.s), sl = !pastDay() && steadyLoud().some(x => x.s === n.s);
  if (!r && !sl) return '';
  let h = '';
  if (sl) h += `<div class="txt" style="margin-bottom:6px"><span class="tb SL">S+L</span> <b>Steady + loud</b>: steady call building on ${SX(n).ntop} of ${SX(n).n} settles, left off the stealth list because a session was loud.</div>`;
  if (r) { const x = r.x || {};
    h += `<div class="txt">${tbL(r.t)} <b>${LDLONG[r.t]}</b> on the ${day(r.e)} settle: <b class="wh">${fm(x.prem)}</b> of calls added in one session — ${kfL(x.ca)} contracts, ${pctL(x.cap)} of the calls open the day before, ${topL(x.loud)} of the market that day${x.bv ? `; ${pctL(x.bs)} of ${kfL(x.bv)} prints above the mid` : ''}${x.cp != null ? `; calls ${x.cp >= 99 ? 'with puts flat or closing' : x.cp.toFixed(1) + '× the puts'}` : ''}.${x.mx ? ` Main bet <b class="kg">$${kS(x.mk)}C ${dayY(x.mx)}</b> (${pcL(x.mdist)} away, ${x.mdte} days out).` : ''} The price moved ${pcL(x.move)} that day${x.since != null ? `, ${pcL(x.since)} since` : ''}.${r.t === 'X' && r.why ? ` <span class="am">${esc(fails1(r).slice(0, 2).join('; '))}.</span>` : ''}</div>
      ${r.tl ? `<div class="txt" style="margin-top:6px">${ldTape(Object.assign({ lt: r.t }, r))} <span class="muted">last ${r.tl.length} settles</span></div>` : ''}`; }
  return `<div class="card2 ldcard"><h4><span>${SPK}Loud calls</span>${r ? `<a class="lnk" href="${ldUrl(n.s)}" target="_blank" rel="noopener">Open in Loud Calls ↗</a>` : ''}</h4>${h}</div>`;
}
const SGRP = [['S', 'Stealth builds', 'The pattern: steady, quiet call building that passes every check'],
  ['WATCH', 'Building toward it', 'Steady on many of the days, not yet enough — the other checks pass'],
  ['Q', 'Quiet but loud', 'Passes everything except one big day'], ['M', 'Price already moving', 'The build passes, but the price already moved or woke up'],
  ['SL', 'Steady + loud', 'Steady call buying left off the stealth list because one day got loud'],
  ['LD', 'Loud only', 'One loud day of call buying, from the Loud Calls board']];
const SGORD = ['S', 'Q', 'M', 'WATCH', 'SL', 'LD'];
const SRS_S = [['grp', 'By group', 'Stealth builds first, then the other groups — each in the board\'s own order'],
  ['big', 'Biggest bet', 'Ranked by the $ of calls added, every group together'],
  ['steady', 'Steadiest', 'Ranked by how many of the last 10 days were steady days, then $']];
const heldOf = r => { const x = SX(r), h = x.held;
  return h ? { c: h[2], p: h[3], c0: h[0], p0: h[1] } : { c: x.callsE, p: x.putsE, c0: x.callsS, p0: x.putsS }; };
const perS = r => r.lt ? null : (SX(r).ntop || 0) / Math.max(1, SX(r).n || 1);
const grpOf = r => r.lt ? 'LD' : r.t;
const WHYS = [[/one very loud day/, () => 'one very loud day'], [/one session held (\d+)%/, m => `one day held ${m[1]}% of it`],
  [/steady on (\d+) of (\d+) settles/, m => `steady on ${m[1]} of ${m[2]} days`], [/price moved ([+−-]?\d+%)/, m => `price already moved ${m[1]}`],
  [/volatility up|short-term volatility/, () => 'price waking up'], [/not spread out/, () => 'mostly one expiry'], [/calls added (\S+)× puts|puts built too/, () => 'puts built too']];
const whyS = r => fails1(r).map(f => { for (const [re, fn] of WHYS) { const m = f.match(re); if (m) return fn(m); } return f; });
function tagsS(r, x, showGrp) {
  const t = [], g = grpOf(r);
  if (showGrp) t.push(`<span class="sx-tag g ${g}">${(SGRP.find(z => z[0] === g) || [0, g])[1]}</span>`);
  if (g === 'Q' || g === 'M' || g === 'SL') { let w = whyS(r); if (g === 'SL') w = w.sort((a, b) => /loud day|held/.test(b) - /loud day|held/.test(a)); if (w[0]) t.push(`<span class="sx-tag x">${esc(w[0])}</span>`); }
  if (g === 'WATCH' && !r._wd) { const w = whyS(r); if (w[0]) t.push(`<span class="sx-tag wn">${esc(w[0])}</span>`); }
  if (r._wd) { t.push(winStrip(r)); const wn = winNote(r); if (wn) t.push(`<span class="sx-tag ${r._now ? 'wn' : 'x'}">${esc(wn)}</span>`); }
  if (g === 'LD') { if (r.lt === 'C') t.push(`<span class="sx-tag c">bought on a ${pcL(x.move)} day — likely news</span>`); if (r.lt === 'S') t.push('<span class="sx-tag s">a spread — a capped bet</span>'); }
  const m = !r.lt && ldMark(r.s, true);
  return t.length || m ? `<div class="sx-tags">${t.join('')}${m || ''}</div>` : '';
}
function betS(r, x) {
  if (!x.mx) return '<span class="muted">–</span>';
  const p = LP(r.s), now = p ? p[0] : r.px, d = x.mk && now ? x.mk / now - 1 : null;
  const n = Math.round((Date.parse(x.mx) - Date.parse(etDay())) / 864e5), dd = n === 0 ? 'today' : `${n} day${n === 1 ? '' : 's'}`;
  const sub = n < 0 ? `expired ${n === -1 ? 'yesterday' : -n + ' days ago'}` : d == null ? `${n === 0 ? 'expires today' : dd + ' left'}`
    : d > 0 ? `needs ${pcL(d)} ${n === 0 ? 'by today’s close' : 'in ' + dd}` : `already ${pctL(-d)} above · ${n === 0 ? 'expires today' : dd + ' left'}`;
  return `<span class="sx-w" title="${pctL(x.mshare)} of the new calls are in the ${dayY(x.mx)} expiry; its most-bought strike is $${kS(x.mk)}.">Above <b>$${kS(x.mk)}</b> by <b>${dayY(x.mx)}</b></span><span class="sx-s">${sub}</span>`;
}
function steadyS(r, x) {
  if (r.lt) return `${ldTape(r)}<span class="sx-s">loud on ${day(r.e)} · ${topL(x.loud)}</span>`;
  return `${stripHTML(x)}<span class="sx-s">${x.ntop ?? '–'} of ${x.n ?? '–'} days steady${x.nblast ? ` · <span class="am">${x.nblast} very loud</span>` : ''}</span>`;
}
function earnS(r, x) {
  if (r.fund) return '<span class="sx-e ok">Fund · no earnings</span>';
  if (r.cat === 'earn') return `<span class="sx-e earn">Earnings ${day(r.ced)}</span><span class="sx-s">before the bet ends</span>`;
  if (r.cat === 'none') return `<span class="sx-e ok">No earnings</span><span class="sx-s">before ${x.mx ? dayY(x.mx) : 'expiry'}</span>`;
  return '<span class="sx-e unk">Earnings unknown</span>';
}
const mvS = r => { const x = SX(r), p = LP(r.s);
  if (r.lt) { const c0 = r.px != null && x.since != null ? r.px / (1 + x.since) : null; return p && c0 ? p[0] / c0 - 1 : x.since; }
  const d = LD(r.s), ds = (d && d.s) || {}; return ds.mv ?? x.move; };
function pxS(r, x) {
  const p = LP(r.s), v = mvS(r);
  return `<b class="${(v || 0) >= 0 ? 'up' : 'dn'}">${pcL(v)}</b><span class="sx-s">${r.lt ? 'since ' + day(r.e) : 'since ' + day(x.S)} · ${p ? 'live ' + px(p[0]) : 'now ' + px(r.px)}</span>`;
}
const SSCOLS = {
  stock: { name: 'stock', v: r => r.s, txt: 1, first: 1, hi: 'Z to A', lo: 'A to Z' },
  size: { name: 'bet size', v: r => SX(r).prem },
  bet: { name: 'the move the bet needs', v: r => { const x = SX(r), n = nowPx5(r); return x.mk && n ? x.mk / n - 1 : null; }, first: 1, hi: 'farthest first', lo: 'closest first' },
  steady: { name: 'how steady', v: perS },
  held: { name: 'calls vs puts held', v: r => { const h = heldOf(r); return h.c && h.p ? h.c / h.p : null; } },
  biz: { name: 'business score', v: r => r.biz },
  earn: { name: 'earnings date', v: r => r.ced ? Date.parse(r.ced) : null, first: 1, hi: 'latest first', lo: 'soonest first' },
  move: { name: 'price move', v: mvS },
};
const byBigS = (a, b) => (SX(b).prem || 0) - (SX(a).prem || 0) || a.s.localeCompare(b.s);
const bySteadyS = (a, b) => (perS(b) ?? -1) - (perS(a) ?? -1) || byBigS(a, b);
function rowS5(r, i, n, showGrp) {
  const x = SX(r), rk = i + 1, LDr = !!r.lt;
  return `<div class="sx-row ${grpOf(r)}${r._past ? ' past' : ''}" data-s="${r.s}"><div class="sx-rk${rk <= 3 ? ' top' : ''}" title="#${rk} of ${n}">${rk}</div><div class="sx-who"><div class="sx-l1"><b class="sx-tk">${r.s}</b>${r.new && !LDr && !r._past ? '<span class="badge new">NEW</span>' : ''}<span class="sx-nm">${esc(r.n || '')}</span></div>${tagsS(r, x, showGrp)}</div>
    <div class="sx-size num"><b class="sx-w">${fm(x.prem)}</b><span class="sx-s">${kfL(x.ca)} calls ${LDr ? 'in 1 day' : `in ${x.n || 10} days`}</span></div>
    <div class="sx-bet num">${betS(r, x)}</div><div class="sx-loud">${steadyS(r, x)}</div>
    <div class="sx-held num" title="Every call and put open (all expiries): ${LDr ? 'at the loud settle vs the settle before' : 'at the board settle vs the window\'s first settle'}. ${x.cp != null ? 'The calls added were ' + (x.cp >= 99 ? 'with puts flat or closing' : x.cp.toFixed(1) + '× the puts added') + '.' : ''}">${spHeld({ held: heldOf(r) }, false, LDr ? 'the day before' : 'on ' + day(x.S))}</div><div class="sx-biz">${spBiz(r)}</div>
    <div class="sx-earn">${earnS(r, x)}</div><div class="sx-since num">${pxS(r, x)}</div></div>`;
}
function renderSimpleS() {
  const q = S.q, m = D.meta, P = poolS();
  const okG = g => S.tf === 'list' || g === S.tf;
  const keep = r => (S.cat === 'all' || r.cat === S.cat) && inLv(r);
  const rows = (q ? P.filter(x => matchQ(x[1], q)) : P.filter(x => okG(x[0]) && keep(x[1]))).map(x => x[1]);
  const Ss = P.filter(x => x[0] === 'S').map(x => x[1]), unexp = Ss.filter(r => r.cat === 'none');
  const big = P.filter(x => x[0] !== 'LD').map(x => x[1]).sort(byBigS)[0];
  const cnt = k => P.filter(x => (k === 'list' || x[0] === k) && (S.cat === 'all' || x[1].cat === S.cat)).length;
  const sk = SLD() ? SGRP : SGRP.filter(g => !LDTF.includes(g[0]));
  let h = `<div class="sx stl">
    <div class="sx-top"><div class="sx-hrow"><div class="sx-h1">Who is quietly building call bets?</div>${lxSwitch()}</div>
      <div class="sx-lead">Each stock below has been adding calls <b>day after day</b> — among the market's steadiest call builders on most of the last 10 days — <b>never in one big splash</b>, with <b>calls well ahead of puts</b> and the price still quiet.</div>
      <div class="sx-meta"><span class="muted">Options to ${dayW(m.settle)} · prices to ${dayW(m.price_day)} close</span></div>
      <details class="sx-how"><summary>How we pick</summary><ol>
        <li><b>Steady</b> — on most of the last 10 days, the new calls rank among the biggest of all ${(m.universe || 0).toLocaleString()} stocks we can judge (compared with the calls already open).</li>
        <li><b>Stealthy</b> — never one very loud day, no single day holding much of it, spread over several expiries, calls well ahead of the puts, not selling, not deep in the money, not paired with puts.</li>
        <li><b>Big enough</b> — enough calls and premium over the window to matter.</li>
        <li><b>Quiet price</b> — close to where the window started, no volatility pick-up.</li></ol>
        <div class="muted">Building toward it = steady on many of the days, not yet enough. Quiet but loud = passes everything except one big day. Calls vs puts = every call and put open on the stock, now vs when the window started.</div></details></div>
    <div class="viewbar sx-kinds sx-ldsw">${ldSwitch().replace(/<span class="sep"><\/span>$/, '')}<span class="muted sx-ldnote">${SLD() ? 'also showing call building that got loud' : 'add the loud call building the stealth rules leave out'}</span></div>
    <div class="viewbar sx-kinds sx-dates">${dwChips()}<span class="muted sx-ldnote">${S.dw === '1' ? `the ${dayW(m.settle)} settle` : `${winDays().length} settles · ${day(winDays()[0])} → ${day(m.settle)}${dwKept()}`}</span></div>
    ${ixBarS()}
    <div class="sx-stats"><div><span class="sx-n">${Ss.length}</span><span class="sx-k">stealth builds ${dwWhen()}<br><small>${S.ix !== 'all' ? esc(ixName(S.ix)) : 'the pattern'}</small></span></div>
      <div><span class="sx-n">${unexp.length}</span><span class="sx-k">of them with no earnings before the bet ends<br><small>unexplained</small></span></div>
      <div class="lnk" ${big ? `data-s="${big.s}"` : ''}><span class="sx-n">${big ? fm(SX(big).prem) : '–'}</span><span class="sx-k">biggest build: <b class="wh">${big ? big.s : '–'}</b><br><small>${big ? (SGRP.find(g => g[0] === grpOf(big)) || [0, ''])[1].toLowerCase() : ''}</small></span></div></div>
    <div class="sx-ctl"><div class="viewbar sx-kinds"><span class="muted">Show</span><button class="chip ${S.tf === 'list' ? 'on' : ''}" data-tf="list" title="Every group on this board">Everything<span class="c">${cnt('list')}</span></button>${sk.map(([k, t, tip]) => `<button class="chip ${S.tf === k ? 'on' : ''}${LDTF.includes(k) ? ' ldc' : ''}" data-tf="${k}" title="${esc(tip)}">${LDTF.includes(k) ? SPK : ''}${t}<span class="c">${cnt(k)}</span></button>`).join('')}</div>
      <div class="viewbar sx-kinds"><span class="muted">Rank by</span>${SRS_S.map(([k, t, tip]) => `<button class="chip sr ${S.sr === k ? 'on' : ''}" data-sr="${k}" title="${esc(tip)}">${t}</button>`).join('')}</div></div>`;
  if (q) h += `<div class="ixnote">Search “${esc(q)}” — every listed name that matches, any group.</div>`;
  const HS = hdrSort(SSCOLS, 'sss');
  if (!NARROW()) h += `<div class="sx-row sx-hd">${HS.th('rank', '#')}${HS.th('stock', 'Stock')}${HS.th('size', 'Bet size', 'calls added, $')}${HS.th('bet', 'What they’re betting', 'the most-bought strike and date, from today')}${HS.th('steady', 'How steady', 'last 10 days')}${HS.th('held', 'Calls vs puts', 'all options held')}${HS.th('biz', 'Business', 'score')}${HS.th('earn', 'Earnings')}${HS.th('move', 'Price', 'since the build began')}</div>`;
  else h += `<div class="sx-msort"><span class="muted">Sort</span>${['rank', 'size', 'steady', 'held', 'biz', 'move'].map(c => `<button class="chip ${(c === 'rank' ? !HS.on : HS.col === c) ? 'on' : ''}" data-hs="${c}">${{ rank: 'Ranked', size: 'Bet size', steady: 'Steady', held: 'Calls:puts', biz: 'Business', move: 'Price' }[c]}${HS.col === c ? (HS.dir < 0 ? ' ▼' : ' ▲') : ''}</button>`).join('')}</div>`;
  const grpName = g => (SGRP.find(z => z[0] === g) || [0, g])[1];
  const shown = [];
  if (S.sr === 'grp' && !q) SGORD.filter(g => okG(g) && (g !== 'SL' && g !== 'LD' || SLD())).forEach(g => {
    const base = rows.filter(r => grpOf(r) === g).sort((a, b) => (a.rk || 999) - (b.rk || 999) || a.s.localeCompare(b.s));
    const gr = HS.on ? base.slice().sort(HS.cmp(() => 0)) : base;
    shown.push(...gr);
    if (!gr.length && S.tf === 'list' && g !== 'S') return;
    h += `<div class="sx-day sgrp ${g}"><b>${LDTF.includes(g) ? SPK : ''}${grpName(g)}</b>${g === 'S' ? '<span class="sx-latest">the pattern</span>' : ''}${g === 'SL' && S.dw !== '1' ? '<span class="sx-latest dwt">today only</span>' : ''}<span class="sx-cnt">${gr.length} · ${esc((SGRP.find(z => z[0] === g) || [0, 0, ''])[2])}${S.dw !== '1' && g !== 'SL' ? ' · ' + esc(dwWhen()) : ''}</span></div>`
      + (gr.length ? gr.map((r, i) => rowS5(r, i, gr.length)).join('') : `<div class="empty small">${g === 'S' ? 'No stealth build on this settle' + (S.cat !== 'all' ? ' with this catalyst' : '') + '.' : 'None.'}</div>`);
  });
  else if (rows.length) { const g = rows.slice().sort(HS.cmp(S.sr === 'steady' ? bySteadyS : byBigS)); shown.push(...g);
    h += `<div class="sx-day"><b>${HS.label() || (S.sr === 'steady' ? 'Ranked by how steady' : q ? 'Matches' : 'Ranked by biggest bet')}</b><span class="sx-cnt">${g.length} name${g.length === 1 ? '' : 's'}${S.tf !== 'list' ? ' · ' + esc(grpName(S.tf)) : ''}</span></div>${g.map((r, i) => rowS5(r, i, g.length, true)).join('')}`; }
  if (!rows.length) h += `<div class="empty small">${q ? `No listed name matches “${esc(q)}”.` : 'Nothing here on this settle.'}</div>`;
  if (q) { const pooled = new Set(P.map(x => x[1].s)), other = D.rows.filter(r => !r.t && !pooled.has(r.s) && matchQ(r, q)).slice(0, 12);
    if (other.length) h += `<div class="ixnote">Not on the list: ${other.map(r => `<span class="lnk wh" data-s="${r.s}">${r.s}</span>`).join(' · ')} — open one to see why.</div>`; }
  h += skewSect(shown);
  h += `<div class="sx-foot">Click a stock for its chart, the contracts and every check. Rebuilt after each close from end-of-day options open interest.</div></div>`;
  $('#main').innerHTML = h;
  wireBoard();
  $('#main').onclick = ev => { const b = ev.target.closest('[data-hs]'); if (!b) return; ev.stopPropagation(); HS.click(b.dataset.hs); renderSimpleS(); };
}
const CPSS = [['heavy', 'Most calls-heavy'], ['shift', 'Biggest shift to calls'], ['rank', 'Ranking order']];
const CPS_N = 30;
const shareOf = (c, p) => c != null && p != null && c + p > 0 ? c / (c + p) : null;
const ratioTxt = (c, p) => heldTxt({ c, p }) || '–';
function dumbRow(label, sub, h, cls, tip, ds) {
  const now = shareOf(h.c, h.p), was = shareOf(h.c0, h.p0);
  if (now == null) return '';
  const L = v => (v * 100).toFixed(1) + '%', lo = was == null ? now : Math.min(now, was), hi = was == null ? now : Math.max(now, was);
  const dir = was == null || ratioTxt(h.c, h.p) === ratioTxt(h.c0, h.p0) ? '' : now > was ? 'up' : 'dn';
  return `<div class="cps-row ${cls || ''}"${ds ? ` data-s="${ds}"` : ''} title="${esc(tip)}"><div class="cps-lab">${label}${sub ? `<span>${sub}</span>` : ''}</div>
    <div class="cps-trk"><i class="mid"></i>${was != null ? `<i class="bar" style="left:${L(lo)};width:${((hi - lo) * 100).toFixed(1)}%"></i><i class="was" style="left:${L(was)}"></i>` : ''}<i class="now ${now >= 0.5 ? 'c' : 'p'}" style="left:${L(now)}"></i></div>
    <div class="cps-val"><b>${ratioTxt(h.c, h.p)}</b>${was != null ? `<span class="${dir}">${dir === 'up' ? '▲' : dir === 'dn' ? '▼' : '·'} was ${ratioTxt(h.c0, h.p0)}</span>` : '<span>no earlier read</span>'}</div></div>`;
}
function skewSect(shown) {
  const rows = shown.filter(r => { const h = heldOf(r); return h.c && h.p; });
  const miss = shown.length - rows.length;
  if (!rows.length) return shown.length ? `<div class="cps"><div class="cps-h">Total calls vs puts</div><div class="ixnote">None of these ${shown.length} names carries the calls / puts held numbers (saved before Oct 10).</div></div>` : '';
  const sum = (f) => rows.reduce((a, r) => a + (f(heldOf(r)) || 0), 0);
  const both = rows.filter(r => { const h = heldOf(r); return h.c0 && h.p0; });
  const T = { c: sum(h => h.c), p: sum(h => h.p), c0: both.reduce((a, r) => a + heldOf(r).c0, 0), p0: both.reduce((a, r) => a + heldOf(r).p0, 0) };
  const sh = shareOf(T.c, T.p), sh0 = shareOf(T.c0, T.p0);
  const ratios = rows.map(r => { const h = heldOf(r); return h.c / h.p; }).sort((a, b) => a - b), med = ratios[Math.floor(ratios.length / 2)];
  const nC = rows.filter(r => { const h = heldOf(r); return h.c >= h.p; }).length;
  const mv = both.map(r => { const h = heldOf(r); return shareOf(h.c, h.p) - shareOf(h.c0, h.p0); });
  const toC = mv.filter(v => v > 0.005).length, toP = mv.filter(v => v < -0.005).length;
  const big = rows.slice().sort((a, b) => heldOf(b).c - heldOf(a).c)[0], bigH = heldOf(big);
  let h = `<div class="cps"><div class="cps-h">Total calls vs puts <span class="muted">· every call and put held on the ${rows.length} name${rows.length === 1 ? '' : 's'} above${miss ? ` (${miss} without the numbers, saved before Oct 10)` : ''}</span></div>
    <div class="cps-top"><div class="cps-hero"><span class="cps-n">${ratioTxt(T.c, T.p)}</span><span class="cps-k">calls ${sh >= 0.5 ? 'for every put' : 'to puts'}<br><small>${sh0 != null ? `was ${ratioTxt(T.c0, T.p0)} when the builds began` : ''}</small></span></div>
      <div class="cps-split" title="${kf(T.c)} calls and ${kf(T.p)} puts held, all expiries"><div class="cps-bar"><i class="c" style="width:${(sh * 100).toFixed(1)}%"></i><i class="p" style="width:${((1 - sh) * 100).toFixed(1)}%"></i>${sh0 != null ? `<u style="left:${(sh0 * 100).toFixed(1)}%" title="where it was when the builds began: ${(sh0 * 100).toFixed(0)}% calls"></u>` : ''}</div>
        <div class="cps-leg"><span><i class="c"></i><b>${kf(T.c)}</b> calls · ${(sh * 100).toFixed(0)}%</span><span><b>${kf(T.p)}</b> puts · ${((1 - sh) * 100).toFixed(0)}%<i class="p"></i></span></div></div>
      <div class="cps-facts"><div><b>${nC}</b> of ${rows.length} hold more calls than puts</div><div><b>${toC}</b> moved toward calls · <b>${toP}</b> toward puts</div><div>typical name <b>${med >= 1 ? med.toFixed(1) + ' : 1' : '1 : ' + (1 / med).toFixed(1)}</b></div></div></div>
    <div class="cps-note">Contracts add up across names, so the biggest books weigh most (${big.s} alone holds ${kf(bigH.c)} calls). The tick on the bar and the hollow dots below = when each build began (Loud only: the day before its loud day).</div>`;
  const G = SGORD.map(g => [g, rows.filter(r => grpOf(r) === g)]).filter(x => x[1].length);
  if (G.length > 1) {
    h += `<div class="cps-sub">By group</div><div class="cps-axis grp"><i></i><div><span>all puts</span><span>even</span><span>all calls</span></div><i></i></div>`;
    G.forEach(([g, rs]) => { const hh = { c: 0, p: 0, c0: 0, p0: 0 }; let n0 = 0;
      rs.forEach(r => { const x = heldOf(r); hh.c += x.c; hh.p += x.p; if (x.c0 && x.p0) { hh.c0 += x.c0; hh.p0 += x.p0; n0++; } });
      if (!n0) { hh.c0 = null; hh.p0 = null; }
      const nm = (SGRP.find(z => z[0] === g) || [0, g])[1];
      h += dumbRow(`${LDTF.includes(g) ? SPK : ''}${esc(nm)}`, `${rs.length}`, hh, 'grp g-' + g, `${nm}: ${kf(hh.c)} calls · ${kf(hh.p)} puts held`); });
  }
  const order = S.cps === 'shift' ? rows.slice().sort((a, b) => { const d = r => { const x = heldOf(r), w = shareOf(x.c0, x.p0); return w == null ? -9 : shareOf(x.c, x.p) - w; }; return d(b) - d(a); })
    : S.cps === 'rank' ? rows : rows.slice().sort((a, b) => shareOf(heldOf(b).c, heldOf(b).p) - shareOf(heldOf(a).c, heldOf(a).p));
  const lim = S.cpa ? order : order.slice(0, CPS_N);
  h += `<div class="cps-sub">By name <span class="cps-sort">${CPSS.map(([k, t]) => `<button class="chip ${S.cps === k ? 'on' : ''}" data-cps="${k}">${t}</button>`).join('')}</span></div>
    <div class="cps-axis"><i></i><div><span>all puts</span><span>even</span><span>all calls</span></div><i></i></div>
    ${lim.map(r => { const x = heldOf(r); return dumbRow(r.s, '', x, 'nm', `${r.s}: ${kf(x.c)} calls · ${kf(x.p)} puts held now${x.c0 && x.p0 ? ` · ${kf(x.c0)} / ${kf(x.p0)} ${r.lt ? 'the day before its loud day' : 'when the build began'}` : ''}`, r.s); }).join('')}
    ${order.length > CPS_N ? `<div class="cps-more"><span class="lnk" data-cpa="1">${S.cpa ? 'Show the first ' + CPS_N : `Show all ${order.length}`}</span> <span class="muted">${S.cpa ? '' : `· showing ${CPS_N} of ${order.length}`}</span></div>` : ''}
    <div class="cps-key"><span><i class="was"></i>when the build began</span><span><i class="now c"></i>now, more calls</span><span><i class="now p"></i>now, more puts</span></div></div>`;
  return h;
}
if (LOUD) {
  document.documentElement.classList.add('loud');
  Object.keys(TCOL).forEach(k => { delete TCOL[k]; });
  Object.assign(TCOL, { L: '#ff8a50', C: '#5c9ded', S: '#d6c26a', X: '#ef5350' });
  Object.assign(SORTS, { t: r => [(TORD[r.t] ?? 9) * 100 + (r.ago ?? 99), r.rk || 999], ago: r => -(r.ago ?? 99) * 10 - (TORD[r.t] ?? 9),
    prem: r => SX(r).prem ?? -1, ca: r => SX(r).ca ?? -1, cap: r => SX(r).cap ?? -9, da: r => SX(r).da ?? -9, loud: r => SX(r).loud ?? -1,
    bs: r => SX(r).bs ?? -1, mx: r => -(SX(r).mdte ?? 1e4), t1: r => SX(r).t1 ?? -1, move: r => SX(r).move ?? -9, since: r => SX(r).since ?? -9,
    cat: r => -(CATORD[r.cat] ?? 1), tl: r => (r.again ?? 0) * 100 - (r.ago ?? 9) });
}
const dP = a => a === 0 ? 0 : a < 0.1 ? 2 : a < 10 ? 1 : 0;
const pctL = v => v == null || !isFinite(v) ? '–' : (Math.abs(v) * 100).toFixed(dP(Math.abs(v) * 100)) + '%';
const pcL = v => v == null || !isFinite(v) ? '–' : pc(v, dP(Math.abs(v) * 100));
const kfL = n => { if (n == null) return '–'; const a = Math.abs(n);
  return (n < 0 ? '−' : '') + (a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'k' : String(Math.round(a))); };
const kS = k => k == null ? '–' : String(+(+k).toFixed(2));
const dayY = d => { const y = ((D && D.meta && D.meta.settle) || '').slice(0, 4); return d && y && d.slice(0, 4) !== y ? expS(d) : day(d); };
const topL = pr => { if (pr == null) return '–'; if (pr >= 0.99995) return 'the loudest'; const t = (1 - pr) * 100;
  return 'top ' + (t < 0.1 ? t.toFixed(2) : t < 10 ? t.toFixed(1) : Math.round(t)) + '%'; };
function tlStrip(tl, big) {
  if (!tl) return '<span class="muted">–</span>';
  const lb = (D.meta || {}).lookback || [];
  const W = { L: 'loud call buying', C: 'loud on a move day', S: 'loud spread', x: 'loud, not buying', '.': 'nothing loud' };
  return `<span class="tls${big ? ' big' : ''}" title="The last ${tl.length} settles, oldest first${lb.length ? ` (${day(lb[0])} → ${day(lb[lb.length - 1])})` : ''}: L loud call buying · C on a move day · S a spread · × loud, not buying · empty = nothing loud">${tl.split('').map((c, i) => `<i class="${c === '.' ? 'n' : c}" title="${lb[i] ? day(lb[i]) + ': ' : ''}${W[c] || c}">${c === '.' ? '' : c === 'x' ? '×' : c}</i>`).join('')}</span>`;
}
const inCatLd = r => S.cat === 'all' || r.cat === S.cat;
const inAgLd = r => !S.ag || pastDay() || (r.again || 0) >= 2;
const IXS = [['spx', 'S&P 500', ['spx']], ['ndx', 'Nasdaq-100', ['ndx']], ['core', 'S&P + NDX', ['spx', 'ndx']],
  ['r1k', 'Russell 1000', ['r1k']], ['r2k', 'Russell 2000', ['r2k']], ['all', 'Total', []]];
const IXGAP = { core: 1, r2k: 1 };
const ixName = k => (IXS.find(x => x[0] === k) || [0, ''])[1];
let IXC = null;
function ixSet(k) {
  if (!IXC || IXC.D !== D) IXC = { D };
  if (k === 'all') return null;
  if (k in IXC) return IXC[k];
  const L = D.lists || {}, parts = (IXS.find(x => x[0] === k) || [0, 0, []])[2];
  if (!parts.length || parts.some(p => !L[p])) return (IXC[k] = undefined);
  return (IXC[k] = new Set(parts.flatMap(p => L[p].syms)));
}
const inIx = (r, k) => { const st = ixSet(k); return st === null || (!!st && st.has(r.s)); };
const inIxLd = r => inIx(r, S.ix);
function ixInfo(k) {
  if (k === 'all') return [null, (D.meta || {}).universe];
  const st = ixSet(k); if (!st) return [null, null];
  const parts = IXS.find(x => x[0] === k)[2], L = D.lists;
  if (parts.length === 1) return [L[k].members, L[k].judged];
  return [st.size, D.rows.filter(r => st.has(r.s)).length];
}
function ixNote(short) {
  if (S.ix === 'all') return '';
  const [m, j] = ixInfo(S.ix);
  if (short && m != null) return `<div class="ixnote"><b class="wh">${j.toLocaleString()}</b> of ${m.toLocaleString()} ${esc(ixName(S.ix))} names have enough option data to judge.${S.ix === 'r2k' ? ' <span class="am">Most small caps have too little options trading to judge.</span>' : ''}</div>`;
  if (m == null) return `<div class="ixnote am">${esc(ixName(S.ix))}: the member list could not be read on this build — showing nothing for it.</div>`;
  const miss = m - j;
  return `<div class="ixnote"><b>${esc(ixName(S.ix))}</b>: <b class="wh">${j.toLocaleString()}</b> of ${m.toLocaleString()} members judged on the ${day(D.meta.settle)} settle${miss > 0 ? ` · the other ${miss.toLocaleString()} have no options data, too few open calls, or too little price history` : ''}.${S.ix === 'r2k' ? ' <span class="am">Most Russell 2000 names have too little options trading to judge.</span>' : ''} <span class="muted">The list only narrows the view — “loud” is still ranked against all ${(D.meta.universe || 0).toLocaleString()} names.</span></div>`;
}
function ixBarLd(kind, rows0) {
  const rows = rows0 || srcRows(), inT = (r, t) => t === 'list' ? LISTED.includes(r.t) : r.t === t;
  const ok = kind || (r => inT(r, S.tf) && inCatLd(r) && inAgLd(r));
  const cnt = k => rows.filter(r => ok(r) && inIx(r, k)).length;
  return `<div class="viewbar ixbar"><span class="muted">List</span>${IXS.map(([k, t]) => { const [m, j] = ixInfo(k), off = k !== 'all' && m == null;
    const tip = off ? 'Member list not available on this build' : k === 'all' ? `Every name judged: ${(j || 0).toLocaleString()}` : `${(j || 0).toLocaleString()} of ${(m || 0).toLocaleString()} members judged`;
    return `<button class="chip ix${S.ix === k ? ' on' : ''}" data-ix="${k}" ${off ? 'disabled' : ''} title="${tip}">${esc(t)}<span class="c">${off ? '–' : cnt(k)}</span></button>${IXGAP[k] ? '<span class="sep"></span>' : ''}`; }).join('')}${kind ? '' : pmSwitch() + lxSwitch()}</div>${ixNote(!!kind)}`;
}
const PUTSON = () => LOUD && S.pm === 'puts' && S.lx !== 'full' && S.v === 'board' && !pastDay();
const pmSwitch = () => `<span class="pmsw"><button class="calls ${PUTSON() ? '' : 'on'}" data-pm="calls" title="Loud call buying: bets on a rise">▲ Loud Calls</button><button class="puts ${PUTSON() ? 'on' : ''}" data-pm="puts" title="Loud put buying: bets on a drop, or insurance">▼ Loud Puts</button></span>`;
const lxSwitch = () => '';
const SKS = [['L', 'Loud buying', 'The pattern: loud, big and bought, on a day the price did not jump'],
  ['LCS', 'Plus news days & spreads', 'Also the same buying on a big move day (likely news) and capped bets (spreads)'],
  ['X', 'Loud, not buying', 'Loud and big, but it looks like selling, hedging or a trade']];
const skOK = r => S.sk === 'X' ? r.t === 'X' : S.sk === 'LCS' ? LISTED.includes(r.t) : r.t === 'L';
const SRS = [['big', 'Biggest bet', 'Ranked by the $ of calls bought that day (the board\'s own order), across the last 5 days'],
  ['loud', 'Loudest', 'Ranked by how loud the day was against every stock (the loudest first)'],
  ['day', 'By day', 'Newest day first, ranked by $ inside each day']];
const byBig5 = (a, b) => (SX(b).prem || 0) - (SX(a).prem || 0) || (SX(b).ca || 0) - (SX(a).ca || 0) || a.s.localeCompare(b.s);
const byLoud5 = (a, b) => (SX(b).loud ?? -1) - (SX(a).loud ?? -1) || byBig5(a, b);
const when5 = r => r.e === D.meta.settle ? 'latest day' : dayW(r.e);
const WHY5 = [[/^possible call selling/, 'probably selling — most trades were below the middle price'],
  [/^puts built too/, 'puts were bought too — looks like a hedge'], [/^vertical spread/, 'a spread — calls bought and sold together'],
  [/^deep in the money/, 'deep in-the-money calls — like owning the stock'], [/^conversion/, 'paired with puts — a trade, not a bet'],
  [/^too few prints/, 'too few trades to tell who bought'], [/^too small/, 'too small'], [/^not loud enough/, 'not loud enough']];
const why5 = r => fails1(r).map(f => (WHY5.find(([re]) => re.test(f)) || [0, f])[1]);
function loud5(x) {
  const v = x.loud;
  if (v == null) return '<span class="muted">–</span>';
  const t = (1 - v) * 100, n = t <= 0.25 ? 3 : t <= 1 ? 2 : 1;
  return `<span class="sx-dots" title="Louder than ${(100 - t).toFixed(t < 0.1 ? 2 : 1)}% of the ${(D.meta.universe || 0).toLocaleString()} stocks judged that day">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><span class="sx-w">${['Loud', 'Very loud', 'Extremely loud'][n - 1]}</span><span class="sx-s">${topL(v)} that day</span>`;
}
function bet5(r, x) {
  if (!x.mx) return '<span class="muted">–</span>';
  const p = LP(r.s), now = p ? p[0] : r.px, d = x.mk && now ? x.mk / now - 1 : null;
  const n = Math.round((Date.parse(x.mx) - Date.parse(etDay())) / 864e5), dd = n === 0 ? 'today' : `${n} day${n === 1 ? '' : 's'}`;
  const sub = n < 0 ? `expired ${n === -1 ? 'yesterday' : -n + ' days ago'}` : d == null ? `${n === 0 ? 'expires today' : dd + ' left'}`
    : r.t === 'X' ? `${d > 0 ? pcL(d) + ' away' : pctL(-d) + ' below the price'} · ${n === 0 ? 'expires today' : dd + ' left'}`
    : d > 0 ? `needs ${pcL(d)} ${n === 0 ? 'by today’s close' : 'in ' + dd}` : `already ${pctL(-d)} above · ${n === 0 ? 'expires today' : dd + ' left'}`;
  return `<span class="sx-w" title="${pctL(x.mshare)} of the new calls are in the ${dayY(x.mx)} expiry; its most-bought strike is $${kS(x.mk)}. On the loud day it was ${pcL(x.mdist)} away with ${x.mdte} days to go.">Above <b>$${kS(x.mk)}</b> by <b>${dayY(x.mx)}</b></span><span class="sx-s">${sub}</span>`;
}
function earn5(r, x) {
  if (r.fund) return `<span class="sx-e ok">Fund · no earnings</span>`;
  if (r.cat === 'earn') return `<span class="sx-e earn">Earnings ${day(r.ced)}</span><span class="sx-s">${r.t === 'X' ? 'before that expiry' : 'before the bet ends'}</span>`;
  if (r.cat === 'none') return `<span class="sx-e ok">No earnings</span><span class="sx-s">before ${x.mx ? dayY(x.mx) : 'expiry'}</span>`;
  return `<span class="sx-e unk">Earnings unknown</span>`;
}
function since5(r, x) {
  const p = LP(r.s), c0 = r.px != null && x.since != null ? r.px / (1 + x.since) : null;
  const v = p && c0 ? p[0] / c0 - 1 : x.since;
  return `<b class="${(v || 0) >= 0 ? 'up' : 'dn'}">${pcL(v)}</b><span class="sx-s">${p ? 'live ' + px(p[0]) : 'now ' + px(r.px)}</span>`;
}
function tags5(r, x, when) {
  const t = [];
  if (when) t.push(`<span class="sx-tag wn${r.e === D.meta.settle ? ' now' : ''}">${when5(r)}</span>`);
  if (r.t === 'C') t.push(`<span class="sx-tag c">bought on a ${pcL(x.move)} day — likely news</span>`);
  if (r.t === 'S') t.push('<span class="sx-tag s">a spread — a capped bet</span>');
  if (r.t === 'X') t.push(`<span class="sx-tag x">${esc(why5(r)[0] || 'does not look like buying')}</span>`);
  if ((r.again || 0) >= 2) t.push(`<span class="sx-tag ag">loud ${r.again}× in 5 days</span>`);
  return t.length ? `<div class="sx-tags">${t.join('')}</div>` : '';
}
function hdrSort(cols, key) {
  let st = store.get(key, null);
  if (st && !cols[st[0]]) st = null;
  const cmp = base => {
    if (!st) return base;
    const c = cols[st[0]], d = st[1];
    return (a, b) => { const va = c.v(a), vb = c.v(b);
      if (va == null && vb == null) return base(a, b);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (c.txt ? d * String(va).localeCompare(String(vb)) : d * (va - vb)) || base(a, b); };
  };
  const th = (col, label, sub) => { const on = st && st[0] === col;
    return `<div class="hsort${on ? ' on' : ''}" data-hs="${col}" title="${col === 'rank' ? 'Back to the normal order' : 'Sort by this column (click again to flip)'}">${label}${on ? `<b class="hs-ar">${st[1] < 0 ? '▼' : '▲'}</b>` : ''}${sub ? `<span>${sub}</span>` : ''}</div>`; };
  const click = col => { if (col === 'rank' || !cols[col]) st = null;
    else st = st && st[0] === col ? [col, -st[1]] : [col, cols[col].first || -1];
    store.set(key, st); };
  const label = () => st ? `Sorted by ${cols[st[0]].name} · ${st[1] < 0 ? (cols[st[0]].hi || 'highest first') : (cols[st[0]].lo || 'lowest first')}` : null;
  return { cmp, th, click, label, on: !!st, col: st ? st[0] : null, dir: st ? st[1] : 0 };
}
const nowPx5 = r => { const p = LP(r.s); return p ? p[0] : r.px; };
const SXCOLS = {
  stock: { name: 'stock', v: r => r.s, txt: 1, first: 1, hi: 'Z to A', lo: 'A to Z' },
  size: { name: 'bet size', v: r => SX(r).prem },
  bet: { name: 'the move the bet needs', v: r => { const x = SX(r), n = nowPx5(r); return x.mk && n ? x.mk / n - 1 : null; },
    first: 1, hi: 'farthest first', lo: 'closest first' },
  loud: { name: 'how loud', v: r => SX(r).loud },
  held: { name: 'calls vs puts held', v: r => { const x = SX(r); return x.callsE && x.putsE ? x.callsE / x.putsE : null; } },
  biz: { name: 'business score', v: r => r.biz },
  earn: { name: 'earnings date', v: r => r.ced ? Date.parse(r.ced) : null, first: 1, hi: 'latest first', lo: 'soonest first' },
  since: { name: 'since then', v: r => { const x = SX(r), p = LP(r.s), c0 = r.px != null && x.since != null ? r.px / (1 + x.since) : null;
    return p && c0 ? p[0] / c0 - 1 : x.since; } },
};
function row5(r, i, n, when) {
  const x = SX(r), rk = i + 1;
  return `<div class="sx-row ${r.t}" data-s="${r.s}"><div class="sx-rk${rk <= 3 ? ' top' : ''}" title="#${rk} of ${n} by ${esc((SRS.find(x => x[0] === S.sr) || SRS[0])[1].toLowerCase())}${S.sr === 'day' ? ' that day' : ''}">${rk}</div><div class="sx-who"><div class="sx-l1"><b class="sx-tk">${r.s}</b>${r.new && r.ago === 0 ? '<span class="badge new">NEW</span>' : ''}<span class="sx-nm">${esc(r.n || '')}</span></div>${tags5(r, x, when)}</div>
    <div class="sx-size num"><b class="sx-w">${fm(x.prem)}</b><span class="sx-s">${kfL(x.ca)} calls</span></div>
    <div class="sx-bet num">${bet5(r, x)}</div><div class="sx-loud">${loud5(x)}</div>
    <div class="sx-held num">${spHeld({ held: { c: x.callsE, p: x.putsE, c0: x.callsS, p0: x.putsS } }, false, 'the day before')}</div><div class="sx-biz">${spBiz(r)}</div>
    <div class="sx-earn">${earn5(r, x)}</div><div class="sx-since num">${since5(r, x)}</div></div>`;
}
let PUTS = null;
async function loadPuts() {
  if (PUTS && PUTS.build === D.build) return PUTS;
  try { PUTS = await getJSON('data/puts.json'); } catch (e) { PUTS = { build: D.build, rows: [], err: e.message }; }
  return PUTS;
}
const PLISTED = ['buy', 'move', 'spread', 'unclear'];
const PKS = [['B', 'Put buying', 'Loud, big puts, mostly bought (a lean), on a day the price did not jump: each says drop bet or insurance'],
  ['D', 'Drop bets only', 'Put buying that does not look like insurance: not a whole-market fund, no big run-up first'],
  ['BMS', 'Plus news days & spreads', 'Also loud puts on a big move day (likely news), put spreads (capped bets) and builds with too few trades to tell'],
  ['X', 'Loud, not buying', 'Loud put builds that look like put SELLING (a bullish lean) or come with calls, deep in the money or paired']];
const pkOK = (r, k = S.pk) => k === 'X' ? r.mark === 'sell' || r.mark === 'other' : k === 'BMS' ? PLISTED.includes(r.mark)
  : k === 'D' ? r.mark === 'buy' && !r.ins : r.mark === 'buy';
const PX = r => r.x || {};
const byBigP = (a, b) => (PX(b).prem || 0) - (PX(a).prem || 0) || (PX(b).pa || 0) - (PX(a).pa || 0) || a.s.localeCompare(b.s);
const byLoudP = (a, b) => (PX(b).pr ?? -1) - (PX(a).pr ?? -1) || byBigP(a, b);
const PWHY = [[/^calls built too/, 'calls built too — looks like a collar or a trade, not a bet'], [/^deep in the money/, 'deep in-the-money puts — like shorting the stock'],
  [/^paired/, 'paired with calls — a collar, risk reversal or conversion']];
function loudP(r) {
  const v = PX(r).pr, nb = (PUTS.base || {})[r.e];
  if (v == null) return '<span class="muted">–</span>';
  const t = (1 - v) * 100, n = t <= 0.25 ? 3 : t <= 1 ? 2 : 1;
  return `<span class="sx-dots" title="Louder than ${(100 - t).toFixed(t < 0.1 ? 2 : 1)}% of the ${(nb || 0).toLocaleString()} stocks with enough open puts to judge that day">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><span class="sx-w">${['Loud', 'Very loud', 'Extremely loud'][n - 1]}</span><span class="sx-s">${topL(v)} that day</span>`;
}
function betP(r) {
  const x = PX(r);
  if (!x.mx || x.mk == null) return '<span class="muted">–</span>';
  const p = LP(r.s), now = p ? p[0] : r.px, d = now ? x.mk / now - 1 : null, nx = r.mark === 'sell' || r.mark === 'other';
  const n = Math.round((Date.parse(x.mx) - Date.parse(etDay())) / 864e5), dd = n === 0 ? 'today' : `${n} day${n === 1 ? '' : 's'}`;
  const left = n === 0 ? 'expires today' : dd + ' left';
  const sub = n < 0 ? `expired ${n === -1 ? 'yesterday' : -n + ' days ago'}` : d == null ? left
    : nx ? `${pcL(d)} from the price · ${left}` : d < 0 ? `needs ${pcL(d)} ${n === 0 ? 'by today’s close' : 'in ' + dd}` : `price already ${pctL(d)} below it · ${left}`;
  return `<span class="sx-w" title="${pctL(x.mshare)} of the new puts are in the ${dayY(x.mx)} expiry; its most-added strike is $${kS(x.mk)}. On the loud day it was ${pcL(x.mdist)} from the price with ${x.mdte} days to go.">Below <b>$${kS(x.mk)}</b> by <b>${dayY(x.mx)}</b></span><span class="sx-s">${sub}</span>`;
}
function earnP(r) {
  const x = PX(r), nx = r.mark === 'sell' || r.mark === 'other';
  if (r.fund) return `<span class="sx-e ok">Fund · no earnings</span>`;
  if (r.cat === 'earn') return `<span class="sx-e earn">Earnings ${day(r.ced)}</span><span class="sx-s">${nx ? 'before that expiry' : 'before the bet ends'}</span>`;
  if (r.cat === 'none') return `<span class="sx-e ok">No earnings</span><span class="sx-s">before ${x.mx ? dayY(x.mx) : 'expiry'}</span>`;
  return `<span class="sx-e unk">Earnings unknown</span>`;
}
function tagsP(r, when) {
  const x = PX(r), t = [];
  if (when) t.push(`<span class="sx-tag wn${r.e === D.meta.settle ? ' now' : ''}">${r.e === D.meta.settle ? 'latest day' : dayW(r.e)}</span>`);
  if (['buy', 'move', 'unclear'].includes(r.mark)) t.push(r.ins === 'index' ? '<span class="sx-tag ins" title="Puts on a whole-market fund are mostly portfolio insurance">insurance? — a whole-market fund</span>'
    : r.ins === 'run' ? `<span class="sx-tag ins" title="After a big run-up, puts are often bought to protect the gain">insurance? — after a run-up</span>`
    : '<span class="sx-tag drop" title="Not an index fund and no big run-up first: reads as a bet on a drop (a lean)">drop bet</span>');
  if (r.mark === 'move') t.push(`<span class="sx-tag c">bought on a ${pcL(x.move)} day — likely news</span>`);
  if (r.mark === 'spread') t.push('<span class="sx-tag s">a put spread — a capped bet</span>');
  if (r.mark === 'unclear') t.push('<span class="sx-tag s">too few trades to tell who bought</span>');
  if (r.mark === 'sell') t.push('<span class="sx-tag x">probably selling puts — a bullish lean</span>');
  if (r.mark === 'other') t.push(`<span class="sx-tag x">${esc(((r.fails || [])[0] && (PWHY.find(([re]) => re.test(r.fails[0])) || [0, r.fails[0]])[1]) || 'does not look like buying')}</span>`);
  if ((r.again || 0) >= 2) t.push(`<span class="sx-tag ag">loud ${r.again}× in 5 days</span>`);
  return t.length ? `<div class="sx-tags">${t.join('')}</div>` : '';
}
const PUCOLS = {
  stock: SXCOLS.stock, size: { name: 'bet size', v: r => PX(r).prem },
  bet: { name: 'the drop the bet needs', v: r => { const x = PX(r), n = nowPx5(r); return x.mk != null && n ? -(x.mk / n - 1) : null; },
    first: 1, hi: 'farthest first', lo: 'closest first' },
  loud: { name: 'how loud', v: r => PX(r).pr },
  held: { name: 'calls vs puts held', v: r => { const x = PX(r); return x.callsE && x.putsE ? x.callsE / x.putsE : null; } },
  biz: SXCOLS.biz, earn: SXCOLS.earn,
  since: { name: 'since then', v: r => { const x = PX(r), p = LP(r.s), c0 = r.px != null && x.since != null ? r.px / (1 + x.since) : null;
    return p && c0 ? p[0] / c0 - 1 : x.since; } },
};
function rowP(r, i, n, when) {
  const x = PX(r), rk = i + 1, nx = r.mark === 'sell' || r.mark === 'other';
  return `<div class="sx-row P ${nx ? 'X' : ''}" data-s="${r.s}"><div class="sx-rk${rk <= 3 ? ' top' : ''}" title="#${rk} of ${n}">${rk}</div><div class="sx-who"><div class="sx-l1"><b class="sx-tk">${r.s}</b>${r.new && r.ago === 0 ? '<span class="badge new">NEW</span>' : ''}<span class="sx-nm">${esc(r.n || '')}</span></div>${tagsP(r, when)}</div>
    <div class="sx-size num"><b class="sx-w">${fm(x.prem)}</b><span class="sx-s">${kfL(x.pa)} puts${x.ca > 0 ? ` · ${kfL(x.ca)} calls` : ''}</span></div>
    <div class="sx-bet num">${betP(r)}</div><div class="sx-loud">${loudP(r)}</div>
    <div class="sx-held num">${spHeld({ held: { c: x.callsE, p: x.putsE, c0: x.callsS, p0: x.putsS } }, false, 'the day before')}</div><div class="sx-biz">${spBiz(r)}</div>
    <div class="sx-earn">${earnP(r)}</div><div class="sx-since num">${since5(r, x)}</div></div>`;
}
async function renderPutsLd() {
  await loadPuts();
  if (!PUTSON() || S.v !== 'board') return;
  const q = S.q, m = D.meta, all = PUTS.rows || [], lb = PUTS.lookback || m.lookback || [];
  const rows = q ? all.filter(r => matchQ(r, q)) : all.filter(r => pkOK(r) && inIxLd(r) && inLv(r));
  const Bs = all.filter(r => r.mark === 'buy' && inIxLd(r)), now = Bs.filter(r => r.ago === 0), drops = Bs.filter(r => !r.ins);
  const big = all.filter(r => (S.pk === 'BMS' ? PLISTED.includes(r.mark) : r.mark === 'buy') && inIxLd(r)).sort(byBigP)[0];
  const nK = k => all.filter(r => pkOK(r, k) && inIxLd(r)).length;
  let h = `<div class="sx puts">
    <div class="sx-top"><div class="sx-mode">${pmSwitch()}</div><div class="sx-hrow"><div class="sx-h1">Who is making big, loud put bets?</div></div>
      <div class="sx-lead">Each stock below had <b>one day</b> of put buying that was <b>loud</b> (among the very biggest put builds in the market that day), <b>big</b> and <b>bought</b>. Puts pay if the price <b>falls</b> — but many puts are <b>insurance</b>, not a bet, so every row says which it looks like.</div>
      <div class="sx-meta"><span class="muted">Options to ${dayW(m.settle)} · prices to ${dayW(m.price_day)} close</span></div>
      <details class="sx-how"><summary>How we pick</summary><ol>
        <li><b>Loud</b> — that day's new puts rank among the very biggest of the ~${((PUTS.base || {})[m.settle] || 0).toLocaleString()} stocks with enough open puts to judge (new puts vs the puts already open).</li>
        <li><b>Big</b> — a large number of contracts and a large amount of premium.</li>
        <li><b>One-sided</b> — far more new puts than calls, not deep in the money, not paired with calls (that would be a collar or a trade).</li>
        <li><b>Bought</b> — most trades above the middle price (read from closing prices). Under half = probably <b>selling</b> puts, a bullish lean.</li></ol>
        <div class="muted"><b>Drop bet or insurance?</b> Puts on a whole-market fund (SPY, QQQ, IWM…) and puts after a big run-up with the price above its long-term averages usually protect a position — those say “insurance?”. The rest say “drop bet”. A loud put day on a big move is listed as a news day; spreads are capped bets.</div></details></div>
    ${ixBarLd(r => pkOK(r), all)}
    <div class="sx-stats"><div><span class="sx-n">${now.length}</span><span class="sx-k">loud put buys on ${dayW(m.settle)}<br><small>the latest day</small></span></div>
      <div><span class="sx-n">${Bs.length}</span><span class="sx-k">loud put buys in the last ${lb.length} days<br><small>${drops.length} look like drop bets${S.ix !== 'all' ? ' · ' + esc(ixName(S.ix)) : ''}</small></span></div>
      <div class="lnk" ${big ? `data-s="${big.s}"` : ''}><span class="sx-n">${big ? fm(PX(big).prem) : '–'}</span><span class="sx-k">biggest put bet: <b class="wh">${big ? big.s : '–'}</b><br><small>${big ? day(big.e) : ''}</small></span></div></div>
    <div class="sx-ctl"><div class="viewbar sx-kinds"><span class="muted">Show</span>${PKS.map(([k, t, tip]) => `<button class="chip ${S.pk === k ? 'on' : ''}${k === 'X' ? ' xk' : ''}" data-pk="${k}" title="${esc(tip)}">${t}<span class="c">${nK(k)}</span></button>`).join('')}</div>
      <div class="viewbar sx-kinds"><span class="muted">Rank by</span>${SRS.map(([k, t, tip]) => `<button class="chip sr ${S.sr === k ? 'on' : ''}" data-sr="${k}" title="${esc(tip.replace('calls', 'puts'))}">${t}</button>`).join('')}</div></div>`;
  if (q) h += `<div class="ixnote">Search “${esc(q)}” — every loud put name that matches, any list.</div>`;
  const xv = S.pk === 'X' && !q, HS = hdrSort(PUCOLS, 'spu');
  if (!NARROW()) h += `<div class="sx-row sx-hd">${HS.th('rank', '#')}${HS.th('stock', 'Stock')}${HS.th('size', xv ? 'Size' : 'Bet size', xv ? 'puts added that day' : 'puts bought that day')}${HS.th('bet', xv ? 'Main strike and date' : 'What they’re betting', xv ? 'from today' : 'the most-bought put strike and date, from today')}${HS.th('loud', 'How loud', 'vs every stock that day')}${HS.th('held', 'Calls vs puts', 'all options held')}${HS.th('biz', 'Business', 'score')}${HS.th('earn', 'Earnings')}${HS.th('since', 'Since then', "from that day's close")}</div>`;
  else h += `<div class="sx-msort"><span class="muted">Sort</span>${['rank', 'size', 'loud', 'held', 'biz', 'since'].map(c => `<button class="chip ${(c === 'rank' ? !HS.on : HS.col === c) ? 'on' : ''}" data-hs="${c}">${{ rank: 'Ranked', size: 'Bet size', loud: 'Loud', held: 'Calls:puts', biz: 'Business', since: 'Since' }[c]}${HS.col === c ? (HS.dir < 0 ? ' ▼' : ' ▲') : ''}</button>`).join('')}</div>`;
  const days = [...new Set(rows.map(r => r.e))].sort().reverse(), nmF = n => xv ? 'loud, not buying' : n === 1 ? 'loud put buy' : 'loud put buys';
  if (S.sr === 'day') days.forEach(d => {
    const g = rows.filter(r => r.e === d).sort(HS.cmp(byBigP));
    h += `<div class="sx-day"><b>${dayW(d)}</b>${d === m.settle ? '<span class="sx-latest">latest</span>' : ''}<span class="sx-cnt">${g.length} ${nmF(g.length)}</span></div>${g.map((r, i) => rowP(r, i, g.length)).join('')}`;
  });
  else if (rows.length) { const g = rows.slice().sort(HS.cmp(S.sr === 'loud' ? byLoudP : byBigP));
    h += `<div class="sx-day"><b>${HS.label() || `Ranked by ${S.sr === 'loud' ? 'how loud' : 'biggest bet'}`}</b><span class="sx-cnt">${g.length} ${nmF(g.length)} · last ${lb.length} days${S.ix !== 'all' ? ' · ' + esc(ixName(S.ix)) : ''}</span></div>${g.map((r, i) => rowP(r, i, g.length, true)).join('')}`; }
  if (!days.length) h += `<div class="empty small">${PUTS.err ? 'No Loud Puts build yet.' : q ? `No loud put name matches “${esc(q)}”.` : `No ${S.pk === 'X' ? 'loud put builds that look like selling' : S.pk === 'D' ? 'drop bets' : 'loud put buying'} in the last ${lb.length} days${S.ix !== 'all' ? ' for ' + esc(ixName(S.ix)) : ''}.${S.pk === 'B' || S.pk === 'D' ? ' Try “Plus news days & spreads”.' : ''}`}</div>`;
  h += `<div class="sx-foot">Click a stock for its chart: ▼ marks its loud put days, and a card lists them. Rebuilt after each close from end-of-day options open interest.</div></div>`;
  $('#main').innerHTML = h;
  wireBoard();
  $('#main').onclick = ev => { const b = ev.target.closest('[data-hs]'); if (!b) return; ev.stopPropagation(); HS.click(b.dataset.hs); renderPutsLd(); };
}
function renderSimpleLd() {
  const q = S.q, lb = D.meta.lookback || [], m = D.meta;
  const rows = q ? D.rows.filter(r => r.t && matchQ(r, q)) : D.rows.filter(r => skOK(r) && inIxLd(r) && inLv(r));
  const Ls = D.rows.filter(r => r.t === 'L' && inIxLd(r)), now = Ls.filter(r => r.ago === 0);
  const big = D.rows.filter(r => (S.sk === 'LCS' ? LISTED.includes(r.t) : r.t === 'L') && inIxLd(r)).sort(byBig5)[0];
  const nK = k => D.rows.filter(r => (k === 'X' ? r.t === 'X' : k === 'LCS' ? LISTED.includes(r.t) : r.t === 'L') && inIxLd(r)).length;
  let h = `<div class="sx">
    <div class="sx-top"><div class="sx-mode">${pmSwitch()}</div><div class="sx-hrow"><div class="sx-h1">Who is making big, loud call bets?</div>${lxSwitch()}</div>
      <div class="sx-lead">Each stock below had <b>one day</b> of call buying that was <b>loud</b> (among the very biggest call builds in the market that day), <b>big</b> and <b>bought</b> — not sold, hedged or capped.</div>
      <div class="sx-meta"><span class="muted">Options to ${dayW(m.settle)} · prices to ${dayW(m.price_day)} close</span></div>
      <details class="sx-how"><summary>How we pick</summary><ol>
        <li><b>Loud</b> — that day's new calls rank among the very biggest of all ${(m.universe || 0).toLocaleString()} stocks we can judge (compared with the calls already open, or with a normal day's share volume).</li>
        <li><b>Big</b> — a large number of contracts and a large amount of premium.</li>
        <li><b>Bought</b> — most trades above the middle price, far more new calls than puts, not deep in the money, not paired with puts.</li>
        <li><b>Not a spread</b> — not mostly calls bought and sold together.</li></ol>
        <div class="muted">The same buying on a day the price jumped is listed as a news day. Who bought is a lean read from closing prices.</div></details></div>
    ${ixBarLd(skOK)}
    <div class="sx-stats"><div><span class="sx-n">${now.length}</span><span class="sx-k">loud buys on ${dayW(m.settle)}<br><small>the latest day</small></span></div>
      <div><span class="sx-n">${Ls.length}</span><span class="sx-k">loud buys in the last ${lb.length} days${S.ix !== 'all' ? `<br><small>${esc(ixName(S.ix))}</small>` : ''}</span></div>
      <div class="lnk" ${big ? `data-s="${big.s}"` : ''}><span class="sx-n">${big ? fm(SX(big).prem) : '–'}</span><span class="sx-k">biggest bet: <b class="wh">${big ? big.s : '–'}</b><br><small>${big ? day(big.e) : ''}</small></span></div></div>
    <div class="sx-ctl"><div class="viewbar sx-kinds"><span class="muted">Show</span>${SKS.map(([k, t, tip]) => `<button class="chip ${S.sk === k ? 'on' : ''}${k === 'X' ? ' xk' : ''}" data-sk="${k}" title="${esc(tip)}">${t}<span class="c">${nK(k)}</span></button>`).join('')}</div>
      <div class="viewbar sx-kinds"><span class="muted">Rank by</span>${SRS.map(([k, t, tip]) => `<button class="chip sr ${S.sr === k ? 'on' : ''}" data-sr="${k}" title="${esc(tip)}">${t}</button>`).join('')}</div></div>`;
  if (q) h += `<div class="ixnote">Search “${esc(q)}” — every loud name that matches, any list.</div>`;
  const xv = S.sk === 'X' && !q;
  const HS = hdrSort(SXCOLS, 'sxs');
  if (!NARROW()) h += `<div class="sx-row sx-hd">${HS.th('rank', '#')}${HS.th('stock', 'Stock')}${HS.th('size', xv ? 'Size' : 'Bet size', xv ? 'calls added that day' : 'calls bought that day')}${HS.th('bet', xv ? 'Main strike and date' : 'What they’re betting', xv ? 'from today' : 'the most-bought strike and date, from today')}${HS.th('loud', 'How loud', 'vs every stock that day')}${HS.th('held', 'Calls vs puts', 'all options held')}${HS.th('biz', 'Business', 'score')}${HS.th('earn', 'Earnings')}${HS.th('since', 'Since then', "from that day's close")}</div>`;
  else h += `<div class="sx-msort"><span class="muted">Sort</span>${['rank', 'size', 'loud', 'held', 'biz', 'since'].map(c => `<button class="chip ${(c === 'rank' ? !HS.on : HS.col === c) ? 'on' : ''}" data-hs="${c}">${{ rank: 'Ranked', size: 'Bet size', loud: 'Loud', held: 'Calls:puts', biz: 'Business', since: 'Since' }[c]}${HS.col === c ? (HS.dir < 0 ? ' ▼' : ' ▲') : ''}</button>`).join('')}</div>`;
  const days = [...new Set(rows.map(r => r.e))].sort().reverse(), nmF = n => S.sk === 'X' && !q ? 'loud, not buying' : n === 1 ? 'loud buy' : 'loud buys';
  if (S.sr === 'day') days.forEach(d => {
    const g = rows.filter(r => r.e === d).sort(HS.cmp(byBig5));
    h += `<div class="sx-day"><b>${dayW(d)}</b>${d === m.settle ? '<span class="sx-latest">latest</span>' : ''}<span class="sx-cnt">${g.length} ${nmF(g.length)}</span></div>${g.map((r, i) => row5(r, i, g.length)).join('')}`;
  });
  else if (rows.length) { const g = rows.slice().sort(HS.cmp(S.sr === 'loud' ? byLoud5 : byBig5));
    h += `<div class="sx-day"><b>${HS.label() || `Ranked by ${S.sr === 'loud' ? 'how loud' : 'biggest bet'}`}</b><span class="sx-cnt">${g.length} ${nmF(g.length)} · last ${lb.length} days${S.ix !== 'all' ? ' · ' + esc(ixName(S.ix)) : ''}</span></div>${g.map((r, i) => row5(r, i, g.length, true)).join('')}`; }
  if (!days.length) h += `<div class="empty small">${q ? `No loud name matches “${esc(q)}”.` : `Nothing here in the last ${lb.length} days${S.ix !== 'all' ? ' for ' + esc(ixName(S.ix)) : ''}.`}</div>`;
  if (q) { const other = D.rows.filter(r => !r.t && matchQ(r, q)).slice(0, 12);
    if (other.length) h += `<div class="ixnote">Not loud in the last ${lb.length} days: ${other.map(r => `<span class="lnk wh" data-s="${r.s}">${r.s}</span>`).join(' · ')} — open one to see why.</div>`; }
  h += `<div class="sx-foot">Click a stock for its chart, the contracts and every check. Rebuilt after each close from end-of-day options open interest.</div></div>`;
  $('#main').innerHTML = h;
  wireBoard();
  $('#main').onclick = ev => { const b = ev.target.closest('[data-hs]'); if (!b) return; ev.stopPropagation(); HS.click(b.dataset.hs); renderSimpleLd(); };
}
async function renderBoardLd() {
  if (PUTSON()) return renderPutsLd();
  return renderSimpleLd();
}
function loudEv(n) {
  const L = Array.isArray(n.loud) ? n.loud : [];
  const want = (S.le && S.le[0] === n.s && S.le[1]) || n.e || D.meta.settle;
  const e = L.find(z => z.E === want);
  if (e) return { E: e.E, t: e.t || null, x: e.x || {}, why: e.why || '', g: e.E === n.e ? n.g || e.g || null : e.g || null, shown: e.E === n.e };
  return { E: n.e || D.meta.settle, t: n.t, x: n.x || {}, why: n.why || '', g: n.g || null, shown: true };
}
function gatesLd(ev) {
  const G = Object.fromEntries(Object.entries(ev.g || {}).map(([k, v]) => [k, !!v]));
  if (!('loud' in G)) G.loud = G.loud_pct || G.loud_adv;
  G.clean = G.bought && G.cp && G.deep && G.paired;
  return G;
}
function gateListLd(ev) {
  const x = ev.x || {}, G = gatesLd(ev);
  const it = (ok, t) => `<span class="${ok ? 'y' : 'n'}">${ok ? '✓' : '✕'}</span><span>${t}</span>`;
  const hd = (t, ok, lab) => `<div class="hd"><span>${t}</span>${lab || (ok ? '<span class="ok">passes</span>' : '<span class="no">fails</span>')}</div>`;
  if (x.ca == null && x.cap == null) return `<div class="ck">${hd('Not judged', false)}${it(false, esc(ev.why || 'no one-session build for this settle'))}</div>`;
  const cpT = x.cp == null ? '–' : x.cp >= 99 ? 'with puts flat or closing' : `<b>${x.cp.toFixed(1)}×</b> the puts`;
  return `<div class="ck">${hd('1 · Loud · among the market\'s very biggest builds that day', G.loud)}
    ${it(G.loud_pct, `calls added <b>${pctL(x.cap)}</b> of the open calls — ${topL(x.pr)}`)}
    ${it(G.loud_adv, `delta shares <b>${pctL(x.da)}</b> of a day's share volume — ${topL(x.prd)}`)}
    ${hd('2 · Big', G.size)}${it(G.size, `<b>${kfL(x.ca)}</b> calls added · <b>${fm(x.prem)}</b> premium at the close mid`)}
    ${hd('3 · Bought, not a hedge', G.clean)}${it(G.bought, x.bv ? `<b>${pctL(x.bs)}</b> of ${kfL(x.bv)} prints above the mid` : 'no prints to judge')}
    ${it(G.cp, `calls added ${cpT}`)}
    ${it(G.deep, `<b>${pctL(x.deep)}</b> deep in the money`)}
    ${it(G.paired, `<b>${pctL(x.paired)}</b> paired with puts <span class="muted">(conversions / straddles)</span>`)}
    ${hd('4 · Not a spread', G.nospread)}${it(G.nospread, `<b>${pu(x.vs)}</b> of the adds in equal-size call legs`)}
    ${hd('Move day · splits L from C', null, G.moveday ? '<span class="part">a move day</span>' : '<span class="muted">not a move day</span>')}
    <span class="${G.moveday ? 'mvy' : 'n0'}">${G.moveday ? '●' : '·'}</span><span>the session moved <b class="${(x.move || 0) >= 0 ? 'up' : 'dn'}">${pcL(x.move)}</b>${G.moveday ? ' — a big move for this stock' : ''}</span></div>`;
}
function verdictLd(n) {
  const x = n.x || {}, f = fails1(n), when = n.ago == null ? '' : n.ago === 0 ? ' on the latest settle' : ` ${n.ago} settle${n.ago === 1 ? '' : 's'} ago (${day(n.e)})`;
  if (n.t === 'L') return `Loud call buying${when}: one session's call build among the market's very biggest, big, mostly bought, calls well ahead of puts, not a spread, and the price did not jump that session (${pcL(x.move)}).`;
  if (n.t === 'C') return `Loud on a move day${when}: the same loud, bought build, but the price moved ${pcL(x.move)} that session — calls bought into a move (a news day).`;
  if (n.t === 'S') return `Loud spread${when}: loud, big and bought, but ${f[0] || 'a vertical'} — a capped bet.`;
  if (n.t === 'X') return `Loud, not buying${when}: loud and big, but ${f.join('; ') || 'it does not look like buying'}.`;
  return `Not loud on any of the last ${((D.meta || {}).lookback || []).length || 5} settles` + (f.length ? ` — on the latest: ${f.join('; ')}.` : '.');
}
function loudSentence(ev) {
  const x = ev.x || {};
  if (x.ca == null) return '';
  const cp = x.cp == null ? '' : x.cp >= 99 ? '; calls added with puts flat or closing' : `; calls ${x.cp.toFixed(1)}× the puts`;
  return `<b class="wh">${fm(x.prem)}</b> of calls added in one session (to the ${day(ev.E)} settle): ${kfL(x.ca)} contracts, ${pctL(x.cap)} of the calls open the session before — ${topL(x.loud)} of the market that settle; ${x.bv ? `${pctL(x.bs)} of ${kfL(x.bv)} prints above the mid` : 'no prints to judge'}${cp}. ${x.mx ? `Mostly the <b>${dayY(x.mx)}</b> expiry (${pctL(x.mshare)} of the adds), main strike <b class="kg">$${kS(x.mk)}C</b>, ${x.spot ? `${pcL(x.mdist)} from ${px(x.spot)}, ` : ''}${x.mdte} days out. ` : ''}The price moved ${pcL(x.move)} that session${gatesLd(ev).moveday ? ' — a move day' : ''}${x.since != null ? `, ${pcL(x.since)} since` : ''}.`;
}
function contractsLd(x) {
  const T = (x.top || []).filter(t => t[0] > 0);
  if (!T.length) return '<div class="note">No contract list for this settle.</div>';
  return `<div class="recw"><table class="lvt ctab"><tr><th>Expiry</th><th>Strike</th><th>Away</th><th>Added</th><th title="Open interest after the settle">Open</th><th class="cm">Mid</th><th class="cd">Δ</th><th>$</th></tr>${T.map(t => {
    const main = t[1] === x.mx && t[2] === x.mk, usd = t[4] != null ? t[0] * t[4] * 100 : null;
    return `<tr class="${main ? 'mainr' : ''}"><td>${dayY(t[1])}</td><td>${kS(t[2])} C</td><td>${x.spot ? pcL(t[2] / x.spot - 1) : ''}</td><td class="up">+${kfL(t[0])}</td><td>${kfL(t[3])}</td><td class="cm">${t[4] != null ? t[4].toFixed(2) : '–'}</td><td class="cd">${t[5] != null ? t[5].toFixed(2) : ''}</td><td>${fm(usd)}</td></tr>`; }).join('')}</table></div>`;
}
function expBarsLd(x) {
  const ex = Object.entries(x.byexp || {}).filter(([e, v]) => v > 0);
  if (!ex.length) return '';
  const gross = ex.reduce((a, e) => a + e[1], 0) || 1, keep = ex.filter(([e, v]) => v >= 0.02 * gross || e === x.mx).sort((a, b) => a[0].localeCompare(b[0]));
  const rest = ex.filter(([e, v]) => v < 0.02 * gross && e !== x.mx), mx = Math.max(1, ...keep.map(e => e[1])), big = bigExp(ex, x.ne);
  return `<div class="exps">${keep.map(([e, v]) => `<div class="eb"><span class="${e === x.mx ? 'kg' : ''}">${dayY(e)}</span><i><b style="width:${(v / mx * 100).toFixed(0)}%" class="${big.has(e) ? 'on' : ''}"></b></i><span class="num">${kfL(v)}</span></div>`).join('')}</div>${rest.length ? `<div class="note">+ ${rest.length} more expir${rest.length === 1 ? 'y' : 'ies'} with a small share of the adds each (${kfL(rest.reduce((a, e) => a + e[1], 0))} contracts together).</div>` : ''}`;
}
function sessCardLd(n, ev) {
  const x = ev.x || {};
  if (x.ca == null) return '';
  const ls = D.meta.ladder_settles || [], prev = ls[ls.indexOf(ev.E) - 1];
  const iv = x.ivm != null ? `At-the-money IV at the main expiry <b>${pu(x.ivm, 1)}</b>${x.ivj != null ? ` (<span class="${x.ivj >= 0 ? 'up' : 'dn'}">${x.ivj > 0 ? '+' : x.ivj < 0 ? '−' : ''}${Math.abs(x.ivj).toFixed(1)} vol pts</span> since the settle before)` : ''}${x.iv30 != null ? ` · 30-day ${pu(x.iv30, 1)}` : ''}.`
    : '<span class="muted">IV at the main expiry: not known for this settle.</span>';
  const ced = !ev.shown ? `<span class="muted">shown for the ${day(n.e)} event</span>` : n.cat === 'earn' ? `next earnings <b class="am">${day(n.ced)}</b>, before the ${dayY(x.mx)} main expiry — a known catalyst`
    : n.cat === 'none' ? (n.fund ? 'a fund: no earnings' : `no earnings before the ${dayY(x.mx)} main expiry${n.ced ? ` (next: ${day(n.ced)})` : ''} — not explained by earnings`)
    : 'no earnings date known — catalyst unknown';
  const nT = (x.top || []).filter(t => t[0] > 0).length;
  return `<div class="card2"><h4><span>The session's calls · ${day(ev.E)}</span>${ev.shown ? catPill(n, true) : ''}</h4>
    ${contractsLd(x)}
    <div class="note" style="margin-top:4px">The ${nT} contracts with the most calls added${prev ? ` from the ${day(prev)} to the ${day(ev.E)} settle` : ''} (net, same contract at both settles); $ = contracts × the closing mid × 100. Gold = the main strike.</div>
    <h4 style="margin-top:10px"><span>Calls added by expiry</span><span>${x.ne != null ? x.ne + ' expir' + (x.ne === 1 ? 'y' : 'ies') + ' with a real share of the adds' : ''}</span></h4>
    ${expBarsLd(x)}
    <div class="txt" style="margin-top:6px">${iv}<br>Far out of the money ${pctL(x.far)} · near the money ${pctL(x.ntm)} · in near-dated expiries ${pctL(x.near)}${x.newx ? ` · in new expiries ${pctL(x.newx)}` : ''}.<br>Catalyst: ${ced}.</div></div>`;
}
function histCardLd(n, ev) {
  const L = (Array.isArray(n.loud) ? n.loud : []).slice().reverse();
  if (!L.length) return '';
  const row = e => { const x = e.x || {};
    return `<tr class="${e.E === ev.E ? 'sel' : ''}${e.t ? '' : ' q'}" data-le="${e.E}" title="Show the ${day(e.E)} settle's build and checks"><td>${day(e.E)}</td><td>${e.t ? tb(e.t) : '<span class="muted">–</span>'}</td><td>${fm(x.prem)}</td><td>${pctL(x.cap)}</td><td>${topL(x.loud)}</td><td class="lb">${pctL(x.bs)}</td><td>${x.mx ? dayY(x.mx) + ' ' + kS(x.mk) + 'C' : '–'}</td></tr>`; };
  return `<div class="card2"><h4><span>Loud history</span>${n.tl ? tlStrip(n.tl, true) : ''}</h4>
    <div class="txt">${n.again != null && n.tl ? `Loud (L, C or S) on <b>${n.again}</b> of the last ${n.tl.length} settles. ` : ''}Tap a settle to see its build and checks above.</div>
    <div class="recw" style="margin-top:6px"><table class="lvt lhist"><tr><th>Settle</th><th>Tier</th><th>$</th><th>% open</th><th title="Loudness: the louder of the two ranks that settle">Rank</th><th class="lb">Bought</th><th>Main bet</th></tr>${L.map(row).join('')}</table></div>
    <div class="note" style="margin-top:4px">Every settle with contract history${(D.meta.ladder_settles || [])[0] ? ` (from ${day(D.meta.ladder_settles[0])})` : ''}, newest first, each judged on its own one-session build. A dash = not loud, too small or not judged that settle.</div></div>`;
}
function sidesCardLd(n) {
  const rows = Array.isArray(n.side) ? n.side.slice().reverse() : [];
  if (!rows.length) return '';
  const mk = {}; (n.marks || []).forEach(([d, sd, m]) => { (mk[d] = mk[d] || []).push([sd, m]); });
  const g = (sd, m) => `<span style="color:${MCOL[sd][m]}" title="${MWORD[sd][m]}">${mGlyph(sd, m)}</span>`;
  const tr = ([d, C, P]) => `<tr class="${mk[d] ? 'hl' : ''}"><td>${day(d)}</td><td class="zb">${kf(C[3])}</td><td class="zs">${kf(C[4])}</td><td class="zsp">${kf(C[2])}</td><td class="zpb">${kf(P[3])}</td><td class="zps">${kf(P[4])}</td><td class="zsp">${kf(P[2])}</td><td class="mk">${(mk[d] || []).map(([sd, m]) => g(sd, m)).join(' ')}</td></tr>`;
  const pev = (n.pev || []).map(e => { const t = e.pmx; const away = t && e.spot ? t[1] / e.spot - 1 : null;
    return `<div class="pev">${g('P', e.mark)} <b>${day(e.E)}</b> · ${MWORD.P[e.mark]}: <b>${kf(e.pa)}</b> puts, ${fm(e.prem)}, ${topL(e.pr)} of the market${t ? ` · main ${dayY(yymm(t[0]))} ${kS(t[1])}P (${pc(away, 1)})` : ''}${e.bv ? ` · ${pctL(e.bs)} of ${kf(e.bv)} prints over the mid` : ''}${e.fails && e.fails.length ? ` · <span class="muted">${esc(e.fails.join('; '))}</span>` : ''}</div>`; }).join('');
  return `<div class="card2"><h4><span>Calls &amp; puts by side</span><span></span></h4>
    ${pev ? `<div class="txt" style="margin-bottom:6px">${pev}</div>` : `<div class="note" style="margin-bottom:6px">No loud put build on these settles.</div>`}
    <div class="recw"><table class="lvt sidet"><tr><th>Settle</th><th>Calls<br>bought</th><th>Calls<br>sold</th><th>Call<br>spread</th><th>Puts<br>bought</th><th>Puts<br>sold</th><th>Put<br>spread</th><th></th></tr>${rows.map(tr).join('')}</table></div>
    <div class="note" style="margin-top:4px">Contracts added each settle (the same contract at the settle before, expiries still open at both settles). An add counts as <span class="zsp">spread</span> when it pairs with an equal-size leg on the same expiry, otherwise as bought / sold by the contract's last trade vs the closing mid (a lean). Put markers use the Loud rules on the put side.</div></div>`;
}
function sideLd(n) {
  const side = $('.det .side'); if (!side) return;
  const sym = n.s, ev = loudEv(n), g = n.gex, gl = g && g.level, bz = n.bizm;
  const fl = (n.flags || []).filter(f => TCOL[f[1]]);
  const head = ev.shown ? `${esc(verdictLd(n))}${n.t && n.rk ? ` <span class="muted">#${n.rk} in its tier that settle.</span>` : ''}`
    : `The ${day(ev.E)} settle: <b>${ev.t ? TLONG[ev.t] : 'not loud'}</b>${ev.why ? ' — ' + esc(ev.why) : ''}. <span class="lnk golink" data-le="${n.e || D.meta.settle}">Back to the ${day(n.e || D.meta.settle)} event →</span>`;
  side.innerHTML = (NARROW() ? '' : todayCard(n)) + `
    <div class="card2"><h4><span>${ev.shown ? (n.t ? 'Why ' + sym + ' is here' : 'The checks') : 'Loud · ' + day(ev.E) + ' settle'}</span>${tb(ev.t)}</h4><div class="txt" style="margin-bottom:6px">${head}</div>
      <div class="txt lsent">${loudSentence(ev)}</div>${gateListLd(ev)}</div>
    ${sessCardLd(n, ev)}
    ${histCardLd(n, ev)}
    ${sidesCardLd(n)}
    ${gl || g ? `<div class="card2"><h4><span>Where the call money sits</span><span>GEX Hunt · ${day(g.settle)}</span></h4><div class="txt">${gl ? `Nearest big call level above the price: <b class="kg">${px(gl.k)}</b> (${pc(gl.k / n.px - 1, 1)}), ${gl.H} window${gl.exp ? ', main expiry ' + expS(gl.exp) : ''}.` : 'No big call level above the price.'} King: ${Object.entries(g.king || {}).map(([H, k]) => `${H} ${k != null ? px(k) : '–'}`).join(' · ')}.</div></div>` : ''}
    <div class="card2"><h4><span>Business</span><span></span></h4>${bz ? `<div class="txt"><b class="${bz.score >= 70 ? 'up' : bz.score >= 50 ? 'kg' : 'muted'}" style="font-size:20px">${bz.score}</b><span class="muted">/100</span> · ${(bz.m || []).map(m => `${esc(m[1])} ${m[3] == null ? 'n/a' : m[0] === 'peg' ? m[3].toFixed(2) : pc(m[3] / 100, 0)}`).join(' · ')}<div class="note">Each number ranked against the S&amp;P 500 + Nasdaq-100${bz.base === 0 ? ' (this stock is not in them)' : ''}.</div></div>` : `<div class="note">${n.k === 'etf' ? 'Funds have no business score.' : 'No score for this name (fewer than 4 of the 6 business numbers are published).'}</div>`}</div>
    <div class="card2"><h4><span>On the board</span><span></span></h4><div class="txt">${fl.length ? fl.map(f => `${tb(f[1])} ${day(f[0])}`).join(' &nbsp;') : 'Never loud on a saved settle.'}</div></div>
    <div class="card2"><h4><span>Data</span><span></span></h4><div class="note">Prices to ${day(n.pd)}. Each settle's build compares the same call contracts at the settle before and at that one (expiries still open at both settles).${n.ced ? ` Next earnings ${day(n.ced)}.` : ''}</div></div>`;
}
async function renderDetailLd() {
  const sym = S.s;
  $('#main').innerHTML = `<div class="det"><div class="cbox"><div class="empty">Loading ${esc(sym)}…</div></div><div class="side"></div></div>`;
  let n;
  try { n = await loadName(sym); } catch (e) {
    $('#main').innerHTML = noPage(sym, 'Loud Calls'); return; }
  if (S.s !== sym || S.v !== 'detail') return;
  if (!S.le || S.le[0] !== sym) S.le = [sym, null];
  if (Array.isArray(n.loud)) n.flags = n.loud.filter(e => e.t).map(e => [e.E, e.t]);
  $('.det .cbox').innerHTML = `<div class="chead"><span class="t"><b>${sym}</b> ${tb(n.t)} ${catPill(n, true)} · ${esc(n.name || n.n || '')}</span>
    <span class="muted num">close ${px(n.px)} (${day(n.pd)}) · <span class="${(n.r20 || 0) >= 0 ? 'up' : 'dn'}">${pc(n.r20, 1)} 20d</span> · ${n.dd != null ? Math.round(n.dd * 100) + '% under the 52w high' : ''}</span>
    <span class="hbtns"><button class="btn g" data-v="board">← Board</button></span></div>
    <div class="legend">${czChips()}${sigLegend(n)}${Array.isArray(n.marks) ? legendSides() : ['L', 'C', 'S', 'X'].map(t => `<span><i style="background:${TCOL[t]}"></i>▲ ${TLONG[t]}</span>`).join('')}<span>${esc(n.sec || '')}${n.sub ? ' · ' + esc(n.sub) : ''}${n.ind || n.etf ? ' · ' + (n.ind || n.etf) : ''}</span></div>
    ${Array.isArray(n.marks) ? `<div class="sidenote"><b>Spread</b> is a shape test on the open-interest change (equal-size legs on one expiry). <b>Buying / selling</b> is a lean from each contract's last trade vs the closing mid, read the same way as “Bought” on this board.</div>` : ''}
    <div class="gexbar" id="gexbar"><span class="lab">GEX</span><span class="muted">loading the levels…</span></div>
    <div id="chart"></div><div id="oichart" style="margin-top:6px"></div>${seekBox(sym)}`;
  drawCharts(n);
  loadGex(sym).then(gx => { n.gx = gx; if (S.s !== sym || S.v !== 'detail') return; gexBar(n); drawCharts(n); });
  sideLd(n);
}
function spHeld(r, full, before = 'before the streak') {
  const h = r.held || {}; if (!h.c || !h.p) return '<span class="muted">–</span>';
  const q = (c, p) => c >= p ? `${(c / p).toFixed(1)} : 1` : `1 : ${(p / c).toFixed(1)}`, sh = h.c / (h.c + h.p);
  const was = h.c0 && h.p0 ? `was ${q(h.c0, h.p0)} ${before}` : '';
  return `<span class="sp-w"><b>${q(h.c, h.p)}</b> calls to puts</span><span class="cpbar"><i style="width:${(100 * sh).toFixed(1)}%"></i></span><span class="sp-s">${full ? `${kf(h.c)} calls · ${kf(h.p)} puts held · ` : ''}${was}</span>`;
}
function spBiz(r) {
  if (r.k === 'etf') return '<span class="sp-w muted">Fund</span><span class="sp-s">no business score</span>';
  if (r.biz == null) return '<span class="sp-w muted">No score</span><span class="sp-s">too few business numbers</span>';
  const c = r.biz >= 70 ? 'up' : r.biz >= 50 ? 'kg' : 'muted';
  return `<span class="sp-w"><b class="${c}" style="font-size:16px">${r.biz}</b><span class="muted">/100</span></span><span class="sp-s">${r.biz >= 70 ? 'strong' : r.biz >= 50 ? 'middling' : 'weak'} vs S&amp;P 500 + NDX</span>`;
}
const etDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const etHM = () => '–';
const LP = () => null, LD = () => null, LF = () => null, isMoving = () => false;
async function loadLive() { return null; }
async function pollLive() { return null; }
const withTd = cols => cols, inLv = () => true;
function refreshToday() { return null; }
function todayCard() { return '<div id="todaycard"></div>'; }
function renderMain() {
  const fail = e => { $('#main').innerHTML = `<div class="empty">Could not load this view: ${esc(e.message)}</div>`; };
  if (S.v === 'detail' && S.s) return renderDetail().catch(fail);
  renderBoard().catch(fail);
}
function render(top) {
  if (!D) return;
  renderBar();
  renderMain();
  if (top) window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-v],[data-tf],[data-sort],[data-dir],[data-s],[data-d],[data-ph],[data-grp],[data-lw],[data-gh],[data-og],[data-oph],[data-of],[data-omore],[data-ohall],[data-ok],[data-os],[data-pst],[data-cat],[data-lv],[data-ag],[data-le],[data-ix],[data-lx],[data-sk],[data-sr],[data-ld],[data-cz],[data-dw],[data-cps],[data-cpa],[data-pm],[data-pk]');
  if (!t || t.tagName === 'A') return;
  if (t.dataset.le) { if (S.s) { S.le = [S.s, t.dataset.le]; const n = NAMES[S.s]; if (n) sideLd(n); } return; }
  if (t.dataset.ag) return go({ ag: !S.ag }, false);
  if (t.dataset.ix) { if (t.disabled) return; return go({ ix: t.dataset.ix }, false); }
  if (t.dataset.lx) return go({ lx: t.dataset.lx, d: t.dataset.lx === 'simple' ? null : S.d }, false);
  if (t.dataset.sk) return go({ sk: t.dataset.sk }, false);
  if (t.dataset.sr) return go({ sr: t.dataset.sr }, false);
  if (t.dataset.dw) return go({ dw: t.dataset.dw, d: null }, false);
  if (t.dataset.cps) return go({ cps: t.dataset.cps }, false);
  if (t.dataset.cpa) { S.cpa = !S.cpa; return renderMain(); }
  if (t.dataset.cz) { S.cz = t.dataset.cz; store.set(NARROW() ? 'czm1' : 'cz1', S.cz); document.querySelectorAll('[data-cz]').forEach(b => b.classList.toggle('on', b.dataset.cz === S.cz));
    const n = NAMES[S.s]; if (n) drawCharts(n); return; }
  if (t.dataset.ld !== undefined) { const on = t.dataset.ld === '1'; return go({ ld: on, tf: !on && LDTF.includes(S.tf) ? 'list' : S.tf }, false); }
  if (t.dataset.pm) return go({ pm: t.dataset.pm, lx: 'simple', d: null }, false);
  if (t.dataset.pk) return go({ pk: t.dataset.pk }, false);
  if (t.dataset.gh) { S.gh = t.dataset.gh; store.set('gh1', S.gh); const n = NAMES[S.s]; if (n) { gexBar(n); drawCharts(n); } return; }
  if (t.dataset.tf) return go({ tf: t.dataset.tf }, false);
  if (t.dataset.pst) return go({ ps: t.dataset.pst }, false);
  if (t.dataset.cat) return go({ cat: t.dataset.cat }, false);
  if (t.dataset.lv) return go({ lv: S.lv === t.dataset.lv ? 'all' : t.dataset.lv }, false);
  if (t.dataset.ph) return go({ ph: t.dataset.ph }, false);
  if (t.dataset.grp) return go({ grp: t.dataset.grp }, false);
  if (t.dataset.lw) { e.stopPropagation(); return go({ lw: t.dataset.lw }, false); }
  if (t.dataset.v) return go({ v: t.dataset.v, s: null, os: null });
  if (t.dataset.dir) { const [k, d] = S.sort; return go({ sort: [k, -d] }, false); }
  if (t.dataset.sort) { const k = t.dataset.sort, cur = S.sort, nx = [k, cur[0] === k ? -cur[1] : (k === 's' || k === 't' || k === 'r20' || k === 'sec' || k === 'ps' || (STEALTH && (k === 'cat' || k === 'mx')) ? 1 : -1)]; return go({ sort: nx }, false); }
  if (t.dataset.s) return go({ v: 'detail', s: t.dataset.s });
  if (t.dataset.d !== undefined) return go({ d: t.dataset.d || null }, false);
});
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (S.v === 'detail' && e.key === 'Escape') return go({ v: 'board', s: null });
  if (S.v === 'detail' && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k')) {
    const Lst = sorted(D.rows.filter(r => r.t)), i = Lst.findIndex(r => r.s === S.s), d = (e.key === 'ArrowDown' || e.key === 'j') ? 1 : -1;
    const nx = Lst[Math.max(0, Math.min(Lst.length - 1, i < 0 ? 0 : i + d))]; if (nx && nx.s !== S.s) { e.preventDefault(); go({ s: nx.s }, false); }
    return;
  }
  if (S.v !== 'detail' && e.key.length === 1 && /[a-z]/i.test(e.key) && !e.metaKey && !e.ctrlKey) { const q = $('#q'); if (q) q.focus(); }
});
let rz = null, lastNarrow = NARROW();
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => {
  if (NARROW() !== lastNarrow) { lastNarrow = NARROW(); return render(); }
  if (S.v === 'detail' && NAMES[S.s]) drawCharts(NAMES[S.s]); else if (S.v === 'case') renderMain(); }, 150); });
async function poll() {
  try {
    STATUS = await getJSON('api/status');
    const sb = ((LOUD ? STATUS.loud : STATUS.stealth) || STATUS).build;
    if (sb && sb !== BUILD) { const y = window.scrollY; await loadBoard(); render(); window.scrollTo(0, y); }
    else if (D) renderBar();
  } catch (e) {   }
}
(async function init() {
  readHash();
  try { STATUS = await getJSON('api/status'); } catch (e) { STATUS = null; }
  try { await loadBoard(); } catch (e) { $('#main').innerHTML = `<div class="empty">Could not load the ${LOUD ? 'Loud Calls' : 'Stealth Calls'} data (${esc(e.message)}). Try again in a minute.</div>`; return; }
  await loadLive();
  if (S.d === D.meta.settle) S.d = null;
  if (!TIERS.some(x => x[0] === S.tf) && !(STEALTH && S.ld && LDTF.includes(S.tf))) S.tf = 'list';
  if (LADDER) document.title = 'Call Ladder Hunter';
  if (STEALTH) { if (!CATS.some(x => x[0] === S.cat)) S.cat = 'all'; if (S.ld) await loadLoud(S.d);
    if (!['simple', 'full'].includes(S.lx)) S.lx = 'simple'; if (!SRS_S.some(x => x[0] === S.sr)) S.sr = 'grp';
    if (!DWS.some(x => x[0] === S.dw)) S.dw = '1'; if (!IXS.some(x => x[0] === S.ix)) S.ix = 'all'; }
  if (LOUD) { if (!CATS.some(x => x[0] === S.cat)) S.cat = 'all'; if (!IXS.some(x => x[0] === S.ix)) S.ix = 'all';
    if (!['simple', 'full'].includes(S.lx)) S.lx = 'simple'; if (!SKS.some(x => x[0] === S.sk)) S.sk = 'L'; if (!SRS.some(x => x[0] === S.sr)) S.sr = 'big';
    if (!['calls', 'puts'].includes(S.pm)) S.pm = 'calls'; if (!PKS.some(x => x[0] === S.pk)) S.pk = 'B'; }
  writeHash(false);
  render();
  setInterval(poll, 300000);
  setInterval(pollLive, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollLive(); });
})();
(function () { const t = document.querySelector('nav.tabs'), a = t && t.querySelector('[aria-current=page]'); if (a && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, a.offsetLeft - t.offsetLeft - (t.clientWidth - a.offsetWidth) / 2); })();
