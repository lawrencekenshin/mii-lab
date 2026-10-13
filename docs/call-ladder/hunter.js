'use strict';






const LADDER = window.BW_MODE === 'ladder';
const STEALTH = window.BW_MODE === 'stealth';
const LOUD = window.BW_MODE === 'loud';
const VIEWS = LADDER ? ['board', 'sectors', 'detail', 'record', 'outcomes'] : ['board', 'tide', 'detail', 'record', 'outcomes'];
const TABS = LADDER ? [['board', 'Board'], ['sectors', 'Sectors'], ['record', 'Record'], ['outcomes', 'Outcomes']]
  : [['board', 'Board'], ['tide', 'Sectors'], ['record', 'Record'], ['outcomes', 'Outcomes']];
const TIERS = LADDER ? [['list', 'Listed'], ['L', 'L ladder'], ['B', 'B building'], ['J', 'J rejected']]
  : [['list', 'Listed'], ['X', 'X ladder'], ['W', 'W building'], ['J', 'J rejected'], ['N', 'Near']];
const TORD = LADDER ? { L: 0, B: 1, J: 2 } : { X: 0, W: 1, J: 2, N: 3 };
const TNAME = LADDER ? { L: 'L', B: 'B', J: 'J' } : { X: 'X', W: 'W', J: 'J', N: 'Near' };
const TLONG = LADDER ? { L: 'Call ladder', B: 'Building', J: 'Rejected' } : { X: 'XLU-like ladder', W: 'Building', J: 'Rejected', N: 'Near' };
const LISTED = LADDER ? ['L', 'B'] : ['X', 'W'];
const CAP = LADDER ? {
  L: 'Call ladder: near-the-money calls built over several sessions across several expiries, in any price state.',
  B: 'A big or persistent call build that passes the ladder and call-selling gates but misses a shape gate (named in the row).',
  J: 'Big builds that do not look like a bullish ladder: one block vertical spread, one expiry, two contracts, possible call selling, conversions, deep in the money, puts built too.',
} : {
  X: 'XLU-like ladder: washed out, with near-the-money calls built over several sessions across several expiries.',
  W: 'A big build or a persistent one that passes the ladder and call-selling gates but misses a shape gate (named in the row).',
  N: 'The ladder is on, but the washout is one check short or just ended.',
  J: 'Big builds that do not look like a bullish ladder: one block vertical spread, one expiry, two contracts, possible call selling, conversions, deep in the money, puts built too.',
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('bw.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bw.' + k, JSON.stringify(v)); } catch (e) {  } },
};
const S = { v: 'board', s: null, q: '', d: null, tf: store.get('tf1', 'list'), sort: store.get('sort1', ['t', 1]),
  ph: store.get('ph', 'all'), grp: store.get('grp1', STEALTH ? 'S' : LADDER || LOUD ? 'L' : 'X'), lw: store.get('lw', '3'), gh: store.get('gh1', '1Y+'),
  og: store.get('og1', STEALTH ? 'S' : LADDER || LOUD ? 'L' : 'X'), of: 'all', osort: store.get('osort1', 'newest'), oph: store.get('oph1', 'all'), os: null,
  ps: store.get('ps1', 'all'), cat: store.get('cat1', 'all'), lv: 'all', ag: LOUD && store.get('ag1', false), le: null,
  ix: LOUD || STEALTH ? store.get('ix1', 'all') : 'all', lx: LOUD || STEALTH ? store.get('lx1', 'simple') : 'full', sk: LOUD ? store.get('sk1', 'L') : 'L',
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
const xf = x => x == null ? '–' : (x >= 99 ? '99+' : x >= 10 ? x.toFixed(0) : x.toFixed(1)) + '×';
const day = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '–';
const dayW = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '–';
const expS = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(', ', " '") : '–';
const yymm = e => e ? '20' + e.slice(0, 2) + '-' + e.slice(2, 4) + '-' + e.slice(4, 6) : null;
const px = v => v == null ? '–' : v >= 1000 ? v.toFixed(0) : v >= 100 ? v.toFixed(1) : v.toFixed(2);
const da = v => v == null ? '–' : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2);
const topTxt = pr => { if (pr == null) return ''; const t = (1 - pr) * 100;
  return pr >= 0.9 ? 'top ' + (t < 1 ? Math.max(0.1, t).toFixed(1) : Math.round(t)) + '%' : 'pctl ' + Math.round(pr * 100); };
const tb = (t, extra = '') => t ? `<span class="tb ${t}" title="${esc(TLONG[t])}">${TNAME[t]}</span>${extra}` : '<span class="tb none">–</span>';


const LIVE_SITE = location.hostname === 'lawrencekenshin.github.io';
const DATA_TAB = LADDER ? 'call-ladder' : 'bull-washout';
const BASE = LIVE_SITE ? `https://raw.githubusercontent.com/lawrencekenshin/mii-lab/${DATA_TAB}-data/${DATA_TAB}/` : './data/';
let BUST = '';
async function getJSON(url) {
  const path = url === 'api/status' ? 'status.json' : url.replace(/^data\//, '');
  const q = path === 'status.json' ? '?t=' + Math.floor(Date.now() / 60000) : BUST;
  const r = await fetch(BASE + path + q, { cache: 'no-cache' });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}
async function loadBoard() {
  if (STATUS && STATUS.build) BUST = '?b=' + STATUS.build;
  D = await getJSON('data/board.json');
  BUILD = D.build;
  for (const k in NAMES) delete NAMES[k];
  for (const k in DAYB) delete DAYB[k];
  TIDE = null; REC = null; OUTC = null; SECT = null;
}
async function loadName(s) { if (!NAMES[s]) NAMES[s] = await getJSON('data/names/' + encodeURIComponent(s) + '.json'); return NAMES[s]; }
async function loadGex(s) {
  const n = NAMES[s] || await loadName(s);
  return n.gx || { error: 'no saved option chain for this name' };
}
async function loadDay(d) { if (!DAYB[d]) DAYB[d] = await getJSON('data/days/' + d + '.json'); return DAYB[d]; }
async function loadTide() { if (!TIDE) TIDE = await getJSON('data/sectors.json'); return TIDE; }
async function loadRecord() { if (!REC) REC = await getJSON('data/record.json'); return REC; }
async function loadOutcomes() { if (!OUTC) OUTC = await getJSON('data/outcomes.json'); return OUTC; }
const pastDay = () => S.v === 'board' && S.d && S.d !== D.meta.settle;


function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  S.v = VIEWS.includes(p.get('v')) ? p.get('v') : 'board';
  S.s = (p.get('s') || '').toUpperCase() || null;
  if (S.s && S.v === 'board') S.v = 'detail';
  S.os = S.v === 'outcomes' ? S.s : null;
  if (S.v === 'outcomes' && OGRP.some(g => g[0] === p.get('g'))) S.og = p.get('g');
  if (S.v === 'outcomes') S.s = null;
  S.d = /^\d{4}-\d\d-\d\d$/.test(p.get('d') || '') ? p.get('d') : null;
  if ((LOUD || STEALTH) && IXS.some(x => x[0] === p.get('ix'))) S.ix = p.get('ix');
  if ((LOUD || STEALTH) && ['simple', 'full'].includes(p.get('lx'))) S.lx = p.get('lx');
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
  $('#bar').innerHTML = `<span id="brand">${LOUD ? (PUTSON() ? 'LOUD PUTS' : 'LOUD CALLS') : STEALTH ? 'STEALTH CALLS' : LADDER ? (NARROW() ? 'LADDER HUNTER' : 'CALL LADDER HUNTER') : NARROW() ? 'WASHOUT HUNTER' : 'BULL WASHOUT HUNTER'}</span>
    ${TABS.map(([k, t]) => `<button class="tab ${tabV === k ? 'on' : ''}" data-v="${k}">${NARROW() && k === 'case' ? 'XLU case' : t}</button>`).join('')}
    <input id="q" placeholder="${NARROW() ? 'Ticker' : 'Find a ticker'}" spellcheck="false" autocomplete="off" value="${esc(S.q)}">
    <span id="status" title="${esc(st.error || '')}"><b class="${dot}"></b>${NARROW() ? '' : 'Options '}${day(m.settle)} settle · ${day(m.price_day)} close · rules ${esc((D.rules.version || '').split(' ').slice(0, LADDER || STEALTH || LOUD ? 2 : 1).join(' '))} · built ${built}${st.ok === false ? ' · last build failed' : ''}</span>`;
  const q = $('#q');
  q.addEventListener('input', () => { S.q = q.value.trim().toUpperCase();
    if (S.v === 'board') return renderMain();
    go({ v: 'board', s: null }); const q2 = $('#q'); q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); });
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const r = D.rows.find(x => x.s === S.q) || D.rows.find(x => matchQ(x, S.q)); if (r) { S.q = ''; q.value = ''; go({ v: 'detail', s: r.s }); } }
    if (e.key === 'Escape') { S.q = ''; q.value = ''; renderMain(); }
  });
}
function vintage() {
  const m = D.meta;
  return `<div class="vint"><span>Options: <b>${dayW(m.settle)} settle</b> (${m.settle_names.toLocaleString()} names)</span>
    <span>Prices: <b>${dayW(m.price_day)} close</b></span>
    ${m.filling ? `<span class="filling">${day(m.newest_settle)} settle still filling (${(m.newest_names || 0).toLocaleString()} names so far): the board uses ${day(m.settle)}</span>` : ''}</div>`;
}
function head() {
  if (LADDER) return headL();
  const R = D.rules;
  const open = !NARROW() && store.get('rulesOpenD', true) || NARROW() && store.get('rulesOpen', false);
  return `<div class="head">${vintage()}
    <details class="rdet" ${open ? 'open' : ''}><summary>The rules (${esc(R.version)}) and the tiers</summary><div class="rules"><div class="r w"><b>1 · Washed out</b>${esc(R.washout)}</div>
      <div class="r a"><b>2 · XLU-like call ladder</b>${esc(R.ladder)}</div></div>
    <div class="tiersline">${tb('X')} washed out + XLU-like ladder · ${tb('W')} building: passes the ladder gates, misses one · ${tb('J')} rejected big builds · ${tb('N')} ladder, washout one check short or just ended. ${esc(R.score)}</div></details></div>`;
}


const matchQ = (r, q) => r.s.startsWith(q) || String(r.n || '').toUpperCase().includes(q);
const inTf = r => S.tf === 'list' ? LISTED.includes(r.t) : r.t === S.tf;
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
function viewBar() {
  const rows = srcRows(), c = t => rows.filter(r => t === 'list' ? LISTED.includes(r.t) : r.t === t).length;
  const days = (D.saved_days || []).slice().reverse();
  if (!days.includes(D.meta.settle)) days.unshift(D.meta.settle);
  return `<div class="viewbar"><span class="muted">Show</span>${TIERS.map(([k, t]) => `<button class="chip ${S.tf === k ? 'on' : ''}" data-tf="${k}">${t}<span class="c">${c(k)}</span></button>`).join('')}
${liveChips(rows)}
    <span class="sep"></span><span class="muted">Settle</span><select id="daysel">${days.map(d => `<option value="${d}" ${d === (S.d || D.meta.settle) ? 'selected' : ''}>${dayW(d)}${d === D.meta.settle ? ' · latest' : ''}</option>`).join('')}</select>
    <span class="muted hist">${(D.saved_days || []).length} saved settles from ${day((D.saved_days || [])[0])} · ${D.washed} names washed out of ${D.meta.universe.toLocaleString()}</span></div>`;
}
function dotsHTML(l, big) {
  const ds = (l && l.dots) || [];
  const pad = Math.max(0, 5 - ds.length);
  return `<span class="dots ${big ? 'big' : ''}" title="Last 5 settles: filled = among the biggest 1-session call builds of all names that settle (and mostly near the money), hollow = no, dash = too few open calls">${'<i class="na"></i>'.repeat(pad)}${ds.map(x => `<i class="${x === 1 ? 'on' : x === 0 ? '' : 'na'}"></i>`).join('')}</span>`;
}
function tiles(rows) {
  const n = t => rows.filter(r => r.t === t).length;
  const lnk = r => `<span class="lnk" data-s="${r.s}">${r.s}</span>`;
  const xs = rows.filter(r => r.t === 'X'), js = rows.filter(r => r.t === 'J');
  const per = rows.filter(r => L(r).per).sort((a, b) => L(b).per - L(a).per || (L(b).p3 || 0) - (L(a).p3 || 0))[0];
  const t0 = (D.sect_top || [])[0];
  const fresh = rows.filter(r => LISTED.includes(r.t) && r.new);
  const reasons = {}; js.forEach(r => (L(r).why || []).forEach(w => { reasons[w] = (reasons[w] || 0) + 1; }));
  const topR = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w, c]) => `${esc(w)} ${c}`).join(' · ');
  return `<div class="tiles">
    <div class="tile"><div class="k">On the list · ${day(pastDay() ? S.d : D.meta.settle)}</div><div class="v num">${n('X')} <small>X</small> · ${n('W')} <small>W</small></div><div class="s"><b>${n('N')}</b> near · <b>${js.length}</b> rejected big builds${!pastDay() && fresh.length ? `<br>new: ${fresh.slice(0, 6).map(lnk).join(' ')}` : ''}</div></div>
    <div class="tile"><div class="k">XLU-like ladder (X)</div><div class="v">${xs.length ? xs.slice(0, 4).map(r => `<span class="lnk" data-s="${r.s}">${r.s}</span>`).join(' ') : '<small>none</small>'}</div><div class="s">washed out + a call ladder built session after session</div></div>
    <div class="tile ${per ? 'lnk' : ''}" ${per ? `data-s="${per.s}"` : ''}><div class="k">Most persistent call build</div><div class="v num">${per ? `${per.s} ${dotsHTML(L(per), true)}` : '<small>–</small>'}</div><div class="s">${per ? `among the biggest builds on ${L(per).per} of the last ${L(per).np} settles · ${per.t ? TLONG[per.t] : 'not on the list'}` : ''}</div></div>
    <div class="tile lnk" data-v="tide"><div class="k">Sectors · most washed out</div><div class="v">${t0 ? `${t0.etf} <small>${esc(t0.label)}</small>` : '<small>–</small>'}</div><div class="s">${t0 ? `${t0.washed} of ${t0.n} members washed out${t0.cat === 'washed out' ? ' · the fund itself too' : ''}` : ''}</div></div>
    <div class="tile"><div class="k">Rejected big builds (J)</div><div class="v num">${js.length}</div><div class="s">${topR || 'none'}</div></div>
  </div>`;
}
function ticks(ok, cls = '') { return ok ? `<span class="ticks ${cls}">${ok.map(x => `<i class="${x ? 'on' : ''}"></i>`).join('')}</span>` : ''; }
function washCell(r) {
  if (r.dd == null) return `<span class="muted">${esc(r.stale || 'n/a')}</span>`;
  const path = r.wp === 'both' ? 'both paths' : r.wp === 'Wz' ? 'via Wz' : r.wp === 'v0' ? '' : r.wr ? 'washout just ended' : '';
  return `<span class="${r.wo ? 'wa' : ''}"><b>${pc(-r.dd)}</b></span> ${ticks(r.w)}<div class="cellsub">z20 <span class="${r.wp === 'Wz' || r.wp === 'both' ? 'wa' : ''}">${r.z20 != null ? r.z20.toFixed(1) : '–'}</span>${path ? ' · ' + path : ''}</div>`;
}
function b1Cell(r) {
  const l = r.l; if (!l || l.p1 == null) return '<span class="muted">–</span>';
  return `<span class="${l.f && l.f.mag1 ? 'kg' : l.top ? 'up' : ''}"><b>${pc(l.p1)}</b></span><div class="cellsub">${topTxt(l.pr)}</div>`;
}
function b3Cell(r) {
  const l = r.l; if (!l || l.p3 == null) return '<span class="muted">–</span>';
  return `<span class="${l.f && l.f.mag3 ? 'kg' : ''}"><b>${pc(l.p3)}</b></span><div class="cellsub">${kp(l.c3)} calls${l.s3 && l.s3 < 3 ? ` · ${l.s3}s` : ''}</div>`;
}
function daCell(r) { const l = r.l; if (!l) return '<span class="muted">–</span>';
  return `<span class="num">${da(l.da1)} <span class="muted">/</span> ${da(l.da3)}</span><div class="cellsub">1d / 3d</div>`; }
function ladCell(r) {
  const l = r.l; if (!l) return '<span class="muted">–</span>';
  const ok = l.okf || {};
  if ((r.t === 'J' || r.t === 'W' || r.t === 'B') && l.wk === '1') {
    return l.ne1 == null ? '<span class="muted">–</span>' : `<span class="${l.f && l.f.lad1 ? 'up' : 'dn'}">${l.ne1} exp</span> · <span class="${ok.t21 ? '' : 'dn'}">top-2 ${pu(l.t21)}</span><div class="cellsub">1 session</div>`; }
  if (l.ne == null) return '<span class="muted">–</span>';
  const okl = l.f && l.f.lad3;
  const warn = [ok.vs ? 'vertical spread' : '', ok.sell ? 'possible call selling' : ''].filter(Boolean).join(' · ');
  return `<span class="${okl ? 'up' : 'dn'}">${l.ne} exp</span> · <span class="${ok.t2 ? '' : 'dn'}">top-2 ${pu(l.t2)}</span>${warn ? `<div class="cellsub dn">${warn}</div>` : ''}`;
}
function cvpCell(r) {
  const l = r.l; if (!l || l.c3 == null) return '<span class="muted">–</span>';
  return `<span class="up">${kp(l.c3)}</span> <span class="muted">/</span> <span class="dn">${kp(l.put3)}</span><div class="cellsub">${l.cp != null ? (l.cp >= 99 ? 'puts flat or closing' : 'calls ' + l.cp.toFixed(1) + '× puts') : ''}</div>`;
}
function donCell(r) {
  if (!LISTED.includes(r.t) || r.don == null) return '';
  if (r.new) return '<span class="badge new">NEW</span>';
  return `<span class="dys" title="on the list since the ${day(r.since)} settle">${r.don}d</span>`;
}
function secCell(r) {
  const e = r.ind || r.etf;
  return `<div class="sec" title="${esc(r.sec || '')}${r.gics ? '' : r.sec ? ' (listed sector; no GICS map)' : ''}">${esc(r.sec || (r.k === 'etf' ? 'fund' : 'sector n/a'))}</div>${e ? `<div class="cellsub">${e}</div>` : ''}`;
}
function subLine(r) {
  const l = L(r);
  if (r.t === 'W') return `<div class="rsub am">misses: ${esc(l.gate || '')}</div>`;
  if (r.t === 'J') return `<div class="rsub dn">${esc((l.why || []).join(' · '))}</div>`;
  if (r.t === 'N') return `<div class="rsub muted">${r.wr ? 'the washout just ended' : 'the washout is one check short'}</div>`;
  return '';
}
function whyText(r) {
  const parts = [];
  if (r.why && r.why.length) parts.push('Washout: ' + (Array.isArray(r.why) ? r.why.join('; ') : r.why));
  if (r.wl) parts.push('Ladder: ' + r.wl);
  return parts.join(' · ') || '—';
}
const COLS = [['rk', '#', 0], ['t', 'Tier', 1], ['s', 'Stock', 1], ['sec', 'Sector', 1], ['r20', 'Price · 20d', 1, 'r'],
  ['dd', 'Washout<span class="thsub">under high · checks · z20</span>', 1], ['per', 'Persistence<span class="thsub">last 5 settles</span>', 1],
  ['p1', '1-day build<span class="thsub">% of open calls</span>', 1], ['p3', '3-day build', 1], ['da', 'Δ/ADV', 1],
  ['lad', 'Ladder<span class="thsub">expiries · top-2</span>', 1], ['cvp', 'Calls / puts<span class="thsub">added, 3 days</span>', 1],
  ['don', 'Days', 1]];
function headRow(cols = COLS) {
  const [k0, d0] = S.sort;
  return '<tr>' + cols.map(([k, t, so, al]) => { const on = k0 === k;
    return `<th class="c-${k} ${so ? 'sortable' : ''} ${on ? 'on' : ''} ${al || ''}" ${so ? `data-sort="${k}"` : ''}>${t}${on ? `<span class="ar">${d0 < 0 ? '▼' : '▲'}</span>` : ''}</th>`; }).join('') + '</tr>';
}
function tableRow(r, i, other) {
  if (other) return `<tr class="row other" data-s="${r.s}"><td class="rk"></td><td>${tb(r.t)}</td><td><div class="tk">${r.s}</div><div class="nm">${esc(r.n || '')}</div></td>
    <td class="c-sec">${secCell(r)}</td><td class="r num">${pxTd(r)}</td><td>${washCell(r)}</td><td class="why" colspan="${7 + (liveOn() ? 1 : 0)}">${esc(whyText(r))}</td></tr>`;
  return `<tr class="row ${r.t}" data-s="${r.s}"><td class="rk">${r.rk || i + 1}</td><td>${tb(r.t)}</td>
    <td><div class="tk">${r.s}</div><div class="nm">${esc(r.n || '')}</div>${subLine(r)}</td><td class="c-sec">${secCell(r)}</td>
    <td class="r num">${pxTd(r)}</td>
    <td>${washCell(r)}</td><td class="c-per">${dotsHTML(r.l)}</td><td>${b1Cell(r)}</td><td class="c-p3">${b3Cell(r)}</td><td class="c-da">${daCell(r)}</td>
    <td class="c-lad">${ladCell(r)}</td><td class="c-cvp">${cvpCell(r)}</td>${tdc(r)}<td class="c-don">${donCell(r)}</td></tr>`;
}
function card(r, i, other) {
  const l = r.l || {}, b = r.b;
  return `<div class="pcard ${other ? 'other' : r.t}" data-s="${r.s}"><div class="r1"><span>${!other ? `<span class="muted">${r.rk || i + 1}</span> ` : ''}${tb(r.t)} <b class="wh" style="font-size:15px">${r.s}</b> ${pxCard(r)} ${donCell(r)}</span>${dotsHTML(r.l)}</div>${cardLive(r)}
    <div class="r3 num"><span>under high <b class="${r.wo ? 'wa' : ''}">${r.dd != null ? pc(-r.dd) : '–'}</b> ${ticks(r.w)}</span><span>z20 <b>${r.z20 != null ? r.z20.toFixed(1) : '–'}</b></span>
      <span>1-day <b class="${l.f && l.f.mag1 ? 'kg' : ''}">${pc(l.p1)}</b> ${l.pr != null ? topTxt(l.pr) : ''}</span><span>3-day <b class="${l.f && l.f.mag3 ? 'kg' : ''}">${pc(l.p3)}</b></span>
      <span>Δ/ADV <b>${da(l.da3)}</b></span><span>ladder <b class="${l.f && l.f.lad3 ? 'up' : ''}">${l.ne != null ? l.ne + ' exp · ' + pu(l.t2) : '–'}</b></span></div>
    ${other ? `<div class="why">${esc(whyText(r))}</div>` : subLine(r)}</div>`;
}
function sectionHead(t, n, cols) {
  const inner = `<div class="sect tier-${t}"><b>${t === 'N' ? 'Near · ladder on, washout just short' : t + ' · ' + TLONG[t]}</b> <span class="muted">${n}</span><div class="cap">${esc(CAP[t])}</div></div>`;
  return cols ? `<tr class="secrow"><td colspan="${cols}">${inner}</td></tr>` : `<div class="psect">${inner}</div>`;
}
function jStrip(js, open, what) {
  if (!js.length) return '';
  const it = r => { const l = L(r);
    return `<div class="jrow" data-s="${r.s}"><b class="wh">${r.s}</b> <span class="muted">${esc(r.n || '')}</span><span class="jwhy">${esc((l.why || []).join(' · '))}</span><span class="muted num">1-day ${pc(l.p1)} ${topTxt(l.pr)} · 3-day ${pc(l.p3)} · ${l.wk === '1' ? (l.ne1 != null ? `1 session: ${l.ne1} exp, top-2 ${pu(l.t21)}` : '') : (l.ne != null ? `${l.s3 || 3} settles: ${l.ne} exp, top-2 ${pu(l.t2)}` : '')} · ${fm(l.wk === '1' ? l.prem1 : l.prem3)}</span></div>`; };
  return `<details class="jstrip" ${open ? 'open' : ''}><summary>Rejected big builds <span class="c">${js.length}</span> <span class="muted">· ${what || 'washed out with one of the biggest call builds, but not shaped like a ladder'}</span></summary><div class="cap">${esc(CAP.J)}</div>${js.map(it).join('')}</details>`;
}
async function renderBoard() {
  if (LOUD) return renderBoardLd();
  if (STEALTH) return renderBoardS();
  if (LADDER) return renderBoardL();
  if (pastDay() && !DAYB[S.d]) {
    $('#main').innerHTML = head() + `<div class="empty">Loading ${dayW(S.d)}…</div>`;
    try { await loadDay(S.d); } catch (e) { $('#main').innerHTML = head() + viewBar() + `<div class="empty">No saved board for ${esc(S.d)}.</div>`; return; }
    if (S.v !== 'board') return;
  }
  const rows = srcRows(), q = S.q, past = pastDay();
  const by = t => sorted(rows.filter(r => r.t === t && inLv(r) && (!q || matchQ(r, q))));
  const groups = S.tf === 'list' ? ['X', 'W', 'N'] : S.tf === 'J' ? [] : [S.tf];
  const js = by('J');
  let other = [];
  if (q) other = rows.filter(r => !r.t && matchQ(r, q)).sort((a, b) => (a.s === q ? -1 : 0) - (b.s === q ? -1 : 0) || a.s.localeCompare(b.s)).slice(0, 25);
  let h = head();
  if (past) { const x = DAYB[S.d];
    h += `<div class="pastnote">Saved board for the <b>${dayW(S.d)}</b> settle: prices to the ${day(S.d)} close, open interest to the ${day(S.d)} settle (${(x.n_chain || 0).toLocaleString()} names with chains) — what was knowable the next morning. Rules ${esc(x.rules || '')}. ${x.source === 'backfill' ? 'Rebuilt from the backfill.' : ''} Listed names only. <span class="lnk" data-d="">Back to latest →</span></div>`; }
  h += viewBar() + tiles(rows);
  const nAll = groups.reduce((a, t) => a + by(t).length, 0);
  if (NARROW()) {
    h += sortBar();
    groups.forEach(t => { const g = by(t); if (!g.length && S.tf === 'list' && t !== 'X') return;
      h += sectionHead(t, g.length) + (g.length ? g.map((r, i) => card(r, i)).join('') : `<div class="empty small">No name in this tier${past ? ' that day' : ' today'}.</div>`); });
    if (S.tf === 'J' || S.tf === 'list') h += `<div class="pwrap">${jStrip(js, S.tf === 'J')}</div>`;
    if (other.length) h += `<div class="psect"><div class="sect"><b>Other names</b> · why they are not on the list</div></div>` + other.map(r => card(r, 0, true)).join('');
  } else {
    const COLW = withTd(COLS), NC = COLW.length;
    h += `<div class="tw"><table class="bw"><thead>${headRow(COLW)}</thead><tbody>`;
    groups.forEach(t => { const g = by(t); if (!g.length && S.tf === 'list' && t !== 'X') return;
      h += sectionHead(t, g.length, NC) + (g.length ? g.map((r, i) => tableRow(r, i)).join('') : `<tr><td colspan="${NC}" class="muted" style="padding:10px 8px">No name in this tier${past ? ' that day' : ' today'}${S.lv !== 'all' && liveOn() ? ' with this filter' : ''}.</td></tr>`); });
    if (!nAll && q && S.tf !== 'J') h += `<tr><td colspan="${NC}" class="muted" style="padding:12px 8px">No listed name matches “${esc(q)}”.</td></tr>`;
    if (other.length) h += `<tr class="secrow"><td colspan="${NC}"><div class="sect"><b>Other names</b> · why they are not on the list</div></td></tr>` + other.map(r => tableRow(r, 0, true)).join('');
    h += '</tbody></table></div>';
    if (S.tf === 'J' || S.tf === 'list') h += `<div class="jwrap">${jStrip(js, S.tf === 'J')}</div>`;
  }
  h += foot();
  $('#main').innerHTML = h;
  wireBoard();
}
const PSORT = [['t', 'Tier, then rank'], ['per', 'Persistence'], ['p1', '1-day build'], ['p3', '3-day build'], ['dd', 'Under 52w high'], ['don', 'Days on list']];
function sortBar() {
  const [k, d] = S.sort, PS = LOUD ? PSORT_LD : STEALTH ? PSORT_S : LADDER ? PSORT_L : PSORT;
  return `<div class="sortbar"><span class="muted">Sort</span><select id="sortsel">${PS.map(([v, t]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${t}</option>`).join('')}${PS.some(x => x[0] === k) ? '' : `<option value="${k}" selected>${k}</option>`}</select>
    <button class="chip" data-dir="1">${(k === 't' ? d > 0 : d < 0) ? '▼ best first' : '▲ reversed'}</button></div>`;
}
function wireBoard() {
  const rd = $('details.rdet');
  if (rd) rd.addEventListener('toggle', () => store.set(NARROW() ? 'rulesOpen' : 'rulesOpenD', rd.open));
  const ds = $('#daysel');
  if (ds) ds.addEventListener('change', () => go({ d: ds.value === D.meta.settle ? null : ds.value }, false));
  const ss = $('#sortsel');
  if (ss) ss.addEventListener('change', () => go({ sort: [ss.value, ss.value === 't' ? 1 : -1] }, false));
}
function foot() {
  if (LADDER) return footL();
  return `<div class="foot">Washout from daily bars (${D.meta.stale} names with stale prices are left out). The contract-level ladder is computed from end-of-day option chains, each read at the open-interest settle it really carries, the same contract compared at both ends on expiries that are still open. "Top x%" ranks the 1-session call build (as % of the open calls) against every name with enough open calls that settle. Δ/ADV = delta-equivalent shares added ÷ 20-day average share volume. Last print vs the closing mid is used as a call-selling screen. Persistence, the 3-day window and the "settles" all start at the Sep 24 settle.</div>`;
}


function niceStep(range, n = 6) {
  const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) || 10 * p;
}
const TCOL = { X: '#f5d63d', W: '#5c9ded', J: '#ef5350', N: '#787b86', L: '#f5d63d', B: '#5c9ded' };

const GEX_HS = ['1M', '3M', '6M', '1Y+'];
const gexH = n => { const g = n.gx; if (!g || g.error || !g.H || S.gh === 'off') return null;
  return g.H[S.gh] ? S.gh : ['1Y+', '6M', '3M', '1M'].find(h => g.H[h]) || null; };
function gexBar(n) {
  const el = $('#gexbar'); if (!el) return;
  const g = n.gx;
  if (!g || g.error) { el.innerHTML = `<span class="lab">GEX</span><span class="muted">${esc(g ? g.error : 'not available')}</span>`; return; }
  const cur = gexH(n), L = cur ? g.H[cur].lv : null;
  el.innerHTML = `<span class="lab">GEX</span>${GEX_HS.filter(h => g.H[h]).map(h => `<button class="btn sm${h === cur ? ' on' : ''}" data-gh="${h}">${h}</button>`).join('')}<button class="btn sm${S.gh === 'off' ? ' on' : ''}" data-gh="off">off</button>
    <span class="muted">${g.src === 'hunt' ? 'GEX Hunt map' : 'from the saved chain'} · ${g.repriced ? `<span class="lvst">re-priced at the ${etHM(g.lt)} ET price ${px(g.spot)}</span> (open interest = ${day(g.settle)} settle)` : `OI ${day(g.settle)} settle · priced at the ${day(g.px_day)} close`}${L ? ` · King <b class="kg">${px(L.king)}</b> · net ${fm(L.net)}${L.flip ? ' · flip ' + px(L.flip) : ''}` : ''}${g.live_error ? ` <span class="am" title="${esc(g.live_error)}">· daily map (not re-priced)</span>` : ''}</span>`;
}

const czBars = () => 0;
const sigOf = () => null;
function chartSVG(n, W, H) {
  const O0 = n.ohlc || [], zb = czBars(), off = zb && O0.length > zb ? O0.length - zb : 0;
  const O = off ? O0.slice(off) : O0, N = O.length, WS = off ? (n.ws || []).slice(off) : (n.ws || []);
  if (!N) return '<div class="empty">No daily bars.</div>';
  const SG = sigOf(n);
  const gh = gexH(n), G = gh ? n.gx.H[gh] : null, narrowG = W < 700;
  const padL = 6, padR = 60, cw = W - padL - padR, cwP = G ? cw * (narrowG ? 0.55 : 0.62) : cw, step = cwP / N, X = i => padL + (i + 0.5) * step;
  const pTop = 22, pBot = H - 34, oBot = H - 22;
  const pBotP = SG && (SG.strip.length || SG.letters.length) ? pBot - (SG.letters.length ? 26 : 16) : pBot;
  const hs = O.map(r => r[1] ?? r[3]), ls = O.map(r => r[2] ?? r[3]), cs = O.map(r => r[3]);
  const wline = n.wline || null;
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
  if (wline && wline > lo && wline < hi) s += `<line x1="${padL}" x2="${padL + cw}" y1="${y(wline)}" y2="${y(wline)}" stroke="#4fa3f7" stroke-dasharray="5,4" stroke-opacity=".8"/><text x="${padL + cw - 4}" y="${y(wline) + (close2 && wline <= gl.k ? 13 : -4)}" fill="#4fa3f7" font-size="11" text-anchor="end" stroke="#131722" stroke-width="3" paint-order="stroke">washout line</text>`;
  if (gl && !G) s += `<line x1="${padL}" x2="${padL + cw}" y1="${y(gl.k)}" y2="${y(gl.k)}" stroke="#f5d63d" stroke-dasharray="3,3"/><text x="${padL + 4}" y="${y(gl.k) + (close2 && gl.k < wline ? 13 : -4)}" fill="#f5d63d" font-size="11" stroke="#131722" stroke-width="3" paint-order="stroke">call level ${px(gl.k)} (${pc(gl.k / cs[N - 1] - 1, 1)}, ${gl.H}${gl.exp ? ' · ' + expS(gl.exp) : ''})</text>`;
  let lastM = -1, lastX = -99;
  O.forEach((r, i) => { const d = new Date(r[0] + 'T12:00:00'), mo = d.getMonth(); if (mo !== lastM) { lastM = mo; if (X(i) - lastX < 34) return; lastX = X(i); s += `<line x1="${X(i)}" x2="${X(i)}" y1="${oBot}" y2="${oBot + 4}" stroke="#363a45"/><text x="${X(i) + 2}" y="${H - 6}" fill="#787b86" font-size="11">${d.toLocaleDateString('en-US', { month: 'short' })}</text>`; } });
  const ix = {}; O.forEach((r, i) => { ix[r[0]] = i; });
  if (Array.isArray(n.marks)) s += marksSVG(n.marks, ix, X, y, ls, hs, pTop, pBot);
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
  const tag = (k, txt, col, tc, dash) => {
    if (k == null || k <= lo || k >= hi) return '';
    const b = bars.find(r => r[0] === k), lx = Math.min(padL + cw - txt.length * 6.3 - 16, bx0 + (b ? blen(b[1]) : 0) + 6), tw = txt.length * 6.3 + 10;
    return `<line x1="${padL}" x2="${padL + cw}" y1="${y(k)}" y2="${y(k)}" stroke="${col}" stroke-width="1.2"${dash ? ' stroke-dasharray="4,3"' : ''} stroke-opacity=".85"/>` +
      `<rect x="${lx}" y="${y(k) - 9}" width="${tw}" height="18" rx="3" fill="${col}"/><text x="${lx + tw / 2}" y="${y(k) + 4}" font-size="11" fill="${tc}" text-anchor="middle" font-weight="700">${txt}</text>`;
  };
  if (L.put_wall != null && L.put_wall !== L.king) s += tag(L.put_wall, `PUT WALL ${px(L.put_wall)}`, '#ef5350', '#fff', true);
  if (L.call_wall != null && L.call_wall !== L.king) s += tag(L.call_wall, `CALL WALL ${px(L.call_wall)}`, '#26a69a', '#fff', true);
  s += tag(L.king, `KING ${px(L.king)} ${pc(L.king / S0 - 1, 1)}${narrow ? '' : ' · ' + fm(L.king_gex)}`, '#f5d63d', '#131722', false);
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
    if (step > 26 || i % 2 === rows.length % 2) s += `<text x="${(x0 + step / 2).toFixed(1)}" y="${H - 6}" fill="${lc}" font-size="10.5" text-anchor="middle">${day(d)}${m.P ? ` <tspan fill="${MCOL.P[m.P]}">${mGlyph('P', m.P)}</tspan>` : ''}${m.C ? ` <tspan fill="${MCOL.C[m.C]}">${mGlyph('C', m.C)}</tspan>` : ''}</text>`; });
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
    if (step > 26 || i % 2 === rows.length % 2) s += `<text x="${(x0 + step / 2).toFixed(1)}" y="${H - 6}" fill="${fl[d] && TCOL[fl[d]] ? TCOL[fl[d]] : '#787b86'}" font-size="10.5" text-anchor="middle">${day(d)}</text>`; });
  return s + '</svg>';
}
function checkGroup(title, chk, state) {
  const lab = state === 'full' ? '<span class="ok">passes</span>' : state === 'partial' ? '<span class="part">one check short</span>' : state === 'na' ? '<span class="no">no data</span>' : '<span class="no">fails</span>';
  return `<div class="hd"><span>${title}</span>${lab}</div>` + (chk || []).map(([id, ok, t]) => `<span class="${ok ? 'y' : 'n'}">${ok ? '✓' : '✕'}</span><span>${esc(t)}</span>`).join('');
}
function verdictTxt(n) {
  const t = n.t, l = n.l || {};
  if (t === 'X') return `Washed out, with an XLU-like call ladder (${l.path === '1' ? 'a one-session blast' : 'built over several settles'}).`;
  if (t === 'W') return `Washed out with a big call build that passes the ladder gates but misses: ${l.gate || '—'}.`;
  if (t === 'J') return `Washed out with a big call build that does not look like a ladder: ${(l.why || []).join(', ')}.`;
  if (t === 'N') return `XLU-like ladder, but not washed out now (${n.wr ? 'the washout just ended' : 'one check short'}).`;
  return 'Not on the list.';
}
function gateTable(n) {
  const lad = n.lad, l = n.l || {}, f = l.f || {};
  if (!lad) return '<div class="note">No contract-level chains for this name (the saved chains cover ~1,800 names from the Sep 24 settle).</div>';
  const a = lad['1'] || {}, b = lad['3'] || {}, sp = b.span || 3;
  const yn = (ok, t) => `<td class="${ok ? 'y' : 'n'}"><span>${ok ? '✓' : '✕'}</span> ${t}</td>`;
  const na = '<td class="muted">–</td>';
  const has = x => x && x.call_add != null && !x.drop;
  const ok = (x, k) => !!(x.ok || {})[k];
  const row = (lab, c1, c3) => `<tr><th>${lab}</th>${c1}${c3}</tr>`;
  const sz = (x, k, okk) => has(x) ? yn(okk, `${pc(x.call_add_pct)} of open calls${k === '1' ? ` <span class="muted">${topTxt(lad.pr)}</span>` : ''}<br><span class="muted">Δ/ADV ${da(x.delta_adv)} · ${kp(x.call_add)} · ${fm(x.prem_add)}</span>`) : na;
  const shp = (x, key, okk, txt) => has(x) && x[key] != null ? yn(ok(x, okk), txt(x[key])) : na;
  const cpw = v => v >= 99 ? 'puts flat / closing' : v.toFixed(1) + '× the puts';
  const bvol = x => has(x) ? (ok(x, 'few') ? yn(true, 'too few prints to judge') : ok(x, 'sell') ? yn(false, `possible call selling: ${pu(x.bought_share)} of prints above the mid`) : yn(true, 'no sign of call selling')) : na;
  return `<table class="gates"><tr><th></th><th>1 session<br><span class="muted">${a.S ? day(a.S) + '→' + day(a.E) : ''}</span></th><th>${sp} settle${sp === 1 ? '' : 's'}<br><span class="muted">${b.S ? day(b.S) + '→' + day(b.E) : ''}</span></th></tr>
    ${row('Size', sz(a, '1', f.mag1), sz(b, '3', f.mag3))}
    <tr><th>Persistence</th><td colspan="2" class="${l.P ? 'y' : 'n'}"><span>${l.P ? '✓' : '✕'}</span> ${dotsHTML(l)} among the biggest builds on ${l.per ?? 0} of the last ${l.np ?? 0} settles</td></tr>
    ${row('Near the money', shp(a, 'ntm_share', 'ntm', v => pu(v) + ' of new calls'), shp(b, 'ntm_share', 'ntm', v => pu(v) + ' of new calls'))}
    ${row('Calls vs puts', shp(a, 'cp_ratio', 'cp', cpw), shp(b, 'cp_ratio', 'cp', cpw))}
    ${row('Deep in the money', shp(a, 'deep_itm_share', 'deep', v => pu(v)), shp(b, 'deep_itm_share', 'deep', v => pu(v)))}
    ${row('Paired with puts', shp(a, 'paired_share', 'paired', v => pu(v)), shp(b, 'paired_share', 'paired', v => pu(v)))}
    ${row('Ladder', has(a) ? yn(f.lad1, `${a.n_expbig ?? '–'} expiries · top-2 ${pu(a.top2_share)}`) : na, has(b) ? yn(f.lad3, `${b.n_expbig ?? '–'} expiries · top-2 ${pu(b.top2_share)}`) : na)}
    ${row('Call-selling screen', bvol(a), bvol(b))}</table>
    <div class="note" style="margin-top:4px">Size = among the very biggest call builds of all names that settle, both in calls added and in delta against the stock's own trading, and big in contracts and dollars. FLOW = a big one-session build with the right shape and a ladder, or a big (or persistent) build over a few settles with the right shape and a ladder — and no sign of call selling. ${f.flow ? '<b class="kg">FLOW is on.</b>' : 'FLOW is off.'}</div>`;
}
function ladderCard(n) {
  const lad = n.lad; if (!lad) return '';
  const w = (S.lw === '1' ? lad['1'] : lad['3']) || lad['3'] || lad['1'];
  if (!w || w.drop) return `<div class="card2"><h4><span>Ladder</span><span></span></h4><div class="note">${w && w.drop ? 'Window dropped: ' + esc(w.drop) : 'No window.'}</div></div>`;
  const ok = w.ok || {}, on = new Set(w.exon || []);
  const tops = (w.top_c || []).filter(t => t[0] > 0).slice(0, 14).sort((x, y) => x[1].localeCompare(y[1]) || x[2] - y[2]);
  const exps = Object.entries(w.byexp || {}).filter(([e, v]) => v > 0).sort((x, y) => x[0].localeCompare(y[0]));
  const mx = Math.max(1, ...exps.map(x => x[1]));
  return `<div class="card2"><h4><span>Ladder · top call contracts</span><span class="lwsel"><button class="chip ${S.lw === '1' ? 'on' : ''}" data-lw="1">1 session</button><button class="chip ${S.lw !== '1' ? 'on' : ''}" data-lw="3">${lad['3'] ? lad['3'].span : 3} settles</button></span></h4>
    <div class="txt"><b>${w.n_expbig ?? '–'}</b> expir${w.n_expbig === 1 ? 'y holds' : 'ies hold'} a big share of the adds · two biggest contracts <b class="${ok.t2 === false ? 'dn' : ''}">${pu(w.top2_share)}</b> · half the adds in <b>${w.n50_c ?? '–'}</b> contract${w.n50_c === 1 ? '' : 's'} · equal-size vertical legs <b class="${ok.vert ? 'dn' : ''}">${pu(w.vert_share)}</b> · paired with puts <b class="${ok.paired === false ? 'dn' : ''}">${pu(w.paired_share)}</b></div>
    ${ok.sell ? `<div class="warn">Possible call selling: only ${pu(w.bought_share)} of the build contracts' prints were above the closing mid.</div>` : ''}
    <div class="exps">${exps.map(([e, v]) => `<div class="eb"><span>${expS(yymm(e))}</span><i><b style="width:${(v / mx * 100).toFixed(0)}%" class="${on.has(e) ? 'on' : ''}"></b></i><span class="num">${kf(v)}</span></div>`).join('')}</div>
    <div class="recw"><table class="lvt"><tr><th>Expiry</th><th>Strike</th><th>Away</th><th>Added</th><th>Open after</th><th>Δ</th></tr>${tops.map(t => `<tr><td>${expS(yymm(t[1]))}</td><td>${px(t[2])} C</td><td>${w.spot ? pc(t[2] / w.spot - 1) : ''}</td><td class="up">+${kf(t[0])}</td><td>${kf(t[3])}</td><td>${t[5] != null ? t[5].toFixed(2) : ''}</td></tr>`).join('')}</table></div>
    <div class="note" style="margin-top:6px">${day(w.S)} → ${day(w.E)} settle, contracts compared one by one on expiries that are still open. Calls ${kf(w.callsS)} open at the start, ${kp(w.call_add)} net (${pc(w.call_add_pct)}); puts ${kp(w.put_add)}. Sorted by expiry; the largest ${tops.length} additions.</div></div>`;
}
function noPage(sym) {
  const r0 = D.rows.find(x => x.s === sym);
  const what = LADDER ? 'Call Ladder' : 'Bull Washout';
  $('#main').innerHTML = r0 ? `<div class="empty"><b class="wh">${esc(sym)}</b> ${esc(r0.n || '')} is not on the list: ${esc(whyText(r0))}
      <div class="note" style="margin-top:8px">Name pages are published for the listed names (today and on the saved settles), the names they are compared with and the sector funds.</div>
      <p><button class="btn g" data-v="board">← Board</button></p></div>`
    : `<div class="empty">${esc(sym)} is not in the ${what} universe${LADDER ? ' (too few open calls at the window start, no saved option chain, no fresh daily price, a leveraged product or too short a history)' : ' (no current daily prices, a leveraged product, or too short a history)'}. <button class="btn g" data-v="board">← Board</button></div>`;
}
async function renderDetail() {
  if (LADDER) return renderDetailL();
  const sym = S.s;
  $('#main').innerHTML = `<div class="det"><div class="cbox"><div class="empty">Loading ${esc(sym)}…</div></div><div class="side"></div></div>`;
  const r0 = D.rows.find(x => x.s === sym);
  if (!r0 || !r0.pg) { noPage(sym); return; }
  let n;
  try { n = await loadName(sym); } catch (e) { noPage(sym); return; }
  if (S.s !== sym || S.v !== 'detail') return;
  $('.det .cbox').innerHTML = `<div class="chead"><span class="t"><b>${sym}</b> ${tb(n.t)} · ${esc(n.name || n.n || '')}</span>
    <span class="muted num">close ${px(n.px)} (${day(n.pd)}) · <span class="${(n.r20 || 0) >= 0 ? 'up' : 'dn'}">${pc(n.r20, 1)} 20d</span> · ${n.dd != null ? Math.round(n.dd * 100) + '% under the 52w high' : ''}</span>
    <span class="hbtns"><button class="btn g" data-v="board">← Board</button></span></div>
    <div class="legend"><span><i style="background:rgba(79,163,247,.35)"></i>washed-out days (either path)</span>${['X', 'W', 'J', 'N'].map(t => `<span><i style="background:${TCOL[t]}"></i>▲ ${TLONG[t]}</span>`).join('')}<span>${esc(n.sec || '')}${n.sub ? ' · ' + esc(n.sub) : ''}${n.ind || n.etf ? ' · ' + (n.ind || n.etf) : ''}</span></div>
    <div class="gexbar" id="gexbar"><span class="lab">GEX</span><span class="muted">loading the levels…</span></div>
    <div id="chart"></div><div id="oichart" style="margin-top:6px"></div>${seekBox(sym)}`;
  drawCharts(n);
  loadGex(sym).then(gx => { n.gx = gx; if (S.s !== sym || S.v !== 'detail') return; gexBar(n); drawCharts(n); });
  const W0 = n.wash || {};
  const wSt = n.wn == null ? 'na' : n.wo ? 'full' : n.nw ? 'partial' : 'no';
  const wchk = ((W0.checks || []).length ? W0.checks : [['x', false, n.stale || 'no price data']]).concat(W0.wz ? [['wz', W0.wz[0], 'or Wz: ' + W0.wz[1]]] : []);
  const ckW = checkGroup('1 · Washed out' + (n.wp ? ` · ${n.wp === 'both' ? 'both paths' : n.wp === 'Wz' ? 'via Wz' : 'path 1'}` : ''), wchk, wSt);
  const cx = n.ctx && n.ctx.m;
  const g = n.gex, gl = g && g.level;
  const fl = (n.flags || []).filter(f => TCOL[f[1]]);
  const bz = n.bizm;
  $('.det .side').innerHTML = `
    <div class="card2"><h4><span>${n.t ? 'Why ' + sym + ' is here' : 'The checks'}</span>${tb(n.t)}</h4><div class="txt" style="margin-bottom:6px">${verdictTxt(n)}${n.t && n.rk ? ` <span class="muted">#${n.rk} in its tier.</span>` : ''}</div>
      <div class="ck">${ckW}</div>
      <div class="ck" style="margin-top:6px"><div class="hd"><span>2 · XLU-like call ladder</span>${n.l && n.l.f && n.l.f.flow ? '<span class="ok">FLOW on</span>' : n.lad ? '<span class="no">off</span>' : '<span class="no">no data</span>'}</div></div>${gateTable(n)}</div>
    ${ladderCard(n)}
    ${cx ? `<div class="card2"><h4><span>Open interest · 5 settles</span><span>${day(cx.start)} → ${day(D.meta.settle)}</span></h4><div class="txt">Open calls ${kf(cx.c0)} → ${kf(cx.c1)} on the same expiries (${kp(cx.net)}); open puts ${kf(cx.p0)} → ${kf(cx.p1)} (${kp(cx.put)}).</div><div class="note" style="margin-top:4px">Counted on the expiries still open at both ends.</div></div>` : ''}
    ${gl || g ? `<div class="card2"><h4><span>Where the call money sits</span><span>GEX Hunt · ${day(g.settle)}</span></h4><div class="txt">${gl ? `Nearest big call level above the price: <b class="kg">${px(gl.k)}</b> (${pc(gl.k / n.px - 1, 1)}), ${gl.H} window${gl.exp ? ', main expiry ' + expS(gl.exp) : ''}.` : 'No big call level above the price.'} King: ${Object.entries(g.king || {}).map(([H, k]) => `${H} ${k != null ? px(k) : '–'}`).join(' · ')}.</div></div>` : ''}
    <div class="card2"><h4><span>Business</span><span></span></h4>${bz ? `<div class="txt"><b class="${bz.score >= 70 ? 'up' : bz.score >= 50 ? 'kg' : 'muted'}" style="font-size:20px">${bz.score}</b><span class="muted">/100</span> · ${(bz.m || []).map(m => `${esc(m[1])} ${m[3] == null ? 'n/a' : m[0] === 'peg' ? m[3].toFixed(2) : pc(m[3] / 100, 0)}`).join(' · ')}<div class="note">Each number ranked against the S&amp;P 500 + Nasdaq-100${bz.base === 0 ? ' (this stock is not in them)' : ''}.</div></div>` : `<div class="note">${n.k === 'etf' ? 'Funds have no business score.' : 'No score for this name (fewer than 4 of the 6 business numbers are published).'}</div>`}</div>
    <div class="card2"><h4><span>On the list</span><span></span></h4><div class="txt">${fl.length ? fl.map(f => `${tb(f[1])} ${day(f[0])}`).join(' &nbsp;') : 'Never on a saved settle.'}${n.don ? `<br>${n.new ? '<b>New on the latest settle.</b>' : `<b>${n.don}</b> settles in a row, since ${day(n.since)}.`}` : ''}${fl.some(f => OG_ALL.includes(f[1])) ? `<br><span class="lnk golink" data-os="${sym}">See how its flags turned out →</span>` : ''}</div></div>
    <div class="card2"><h4><span>Data</span><span></span></h4><div class="note">Prices to ${day(n.pd)}. Contract-level windows end at the ${day(D.meta.settle)} settle. ${!LADDER && n.k === 'etf' ? 'Funds are judged a little more gently on the washout.' : ''}</div></div>`;
}


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
  box.innerHTML = chartSVG(n, W, NARROW() ? 300 : Math.max(380, Math.min(520, window.innerHeight - 380)));
  const ob = $('#oichart'); if (ob) ob.innerHTML = Array.isArray(n.side) && n.side.length ? oiSideSVG(n, W, NARROW() ? 190 : 210) : oiSVG(n, W, NARROW() ? 150 : 170);
}


const CATCLS = c => c === 'washed out' ? 'wash' : '';
function tideCard(c) {
  const st = c.st || {};
  const src = c.src === 'proxy' ? `<span class="proxy">price = members' average (proxy, ${c.n_proxy} members)</span>` : c.stale ? `<span class="muted">fund price stale${c.price_last ? ' since ' + day(c.price_last) : ''}; too few members for a proxy</span>` : `<span class="muted">own price${c.price_last ? ' to ' + day(c.price_last) : ''}</span>`;
  const own = c.own && c.own.t ? ` · on the board: ${tb(c.own.t)}` : '';
  const wv = `<span class="${st.W ? 'wa' : 'muted'}">${st.W ? '✓ washed out' : '✕ not washed out'}</span>`;
  const wtxt = st.depth != null ? `<b class="${st.W ? 'wa' : ''}">${pc(st.depth)}</b> under the high · 20d ${pc(st.ret20, 1)} · RSI ${st.rsi != null ? Math.round(st.rsi) : '–'} · ${pc(st.dist_low, 1)} off the 20d low ${wv}` : st.W != null ? wv : '<span class="muted">washout not judged</span>';
  const ti = c.tiers || {};
  return `<div class="tcard ${CATCLS(c.cat)}"><div class="h"><span class="t lnk" data-s="${c.etf}">${c.etf} <span class="muted" style="font-weight:400;font-size:13px">${esc(c.label)}</span></span><span class="st ${CATCLS(c.cat)}">${esc(c.cat)}</span></div>
    <div class="row1">${src}${own}</div>
    <div class="row1"><span class="lab">Fund washout · ${day(c.day)}</span> ${wtxt}</div>
    <div class="cnts"><div><b>${c.n}</b><span>members</span></div><div><b class="${c.washed ? 'wa' : ''}">${c.washed}</b><span>washed out</span></div><div><b class="${ti.X ? 'kg' : ''}">${ti.X || 0}<span class="muted" style="font-size:12px"> +${ti.N || 0} near</span></b><span>X ladder</span></div><div><b>${(ti.W || 0) + (ti.J || 0)}</b><span>W / J builds</span></div></div>
    <div class="mem">${(c.top || []).map(m => `<span data-s="${m.s}">${m.t ? tb(m.t) : ''}${m.s} <span class="muted">${m.dd != null ? pc(-m.dd) : ''}</span></span>`).join('') || '<span class="muted" style="border:0;cursor:default">no member washed out</span>'}</div></div>`;
}
async function renderTide() {
  $('#main').innerHTML = `<div class="head">${vintage()}</div><div class="empty">Loading the sectors…</div>`;
  const T = await loadTide();
  if (S.v !== 'tide') return;
  $('#main').innerHTML = `<div class="head">${vintage()}<div class="tiersline" style="margin-top:8px">The sectors: is a whole sector fund washed out, and how many of its members are? Each card is a sector or industry fund judged on its own daily closes with the board's washout test for funds, plus its members (S&amp;P 500 + Nasdaq-100, GICS) with their board tier. Washed-out funds first.</div></div>
    <div class="tide">${(T.cards || []).map(tideCard).join('')}</div>
    <div class="foot">Fund prices are daily closes. A fund without a fresh price falls back to the equal-weight average of its members' daily moves (labelled proxy). Tap a fund or a member for its page.</div>`;
}


async function renderRecord() {
  $('#main').innerHTML = '<div class="empty">Loading the record…</div>';
  const R = await loadRecord();
  if (S.v !== 'record') return;
  if (!R.groups[S.grp]) S.grp = STEALTH ? 'S' : LADDER || LOUD ? 'L' : 'X';
  const G = R.groups[S.grp] || { entries: [], summary: {} }, sm = (G.summary || {})[S.ph] || {};
  const E = G.entries.filter(e => S.ph === 'all' || e.phase === S.ph).slice().sort((a, b) => b.day.localeCompare(a.day) || a.sym.localeCompare(b.sym));
  const tile = (k, v, s) => `<div class="tile"><div class="k">${k}</div><div class="v num">${v}</div><div class="s">${s}</div></div>`;
  const hz = h => { const z = sm[String(h)] || {}; if (!z.closed) return tile(`+${h} sessions`, '<small>none closed yet</small>', `first results ${h} sessions after an entry`);
    const few = '';
    return tile(`+${h} sessions · ${z.closed} closed (${z.episodes} day${z.episodes === 1 ? '' : 's'})`, `${pc(z.mean, 1)} <small>mean</small>`,
      `vs controls <b>${z.x_ctrl ? pc(z.x_ctrl.mean, 1) : 'n/a'}</b> · vs SPY <b>${z.x_spy ? pc(z.x_spy.mean, 1) : 'n/a'}</b> · vs sector ${z.x_sec ? pc(z.x_sec.mean, 1) + ' (n ' + z.x_sec.n + ')' : 'n/a'}${few}`); };
  const pop = sm.pop || {};
  const cell = (o, h) => !o ? '<span class="open">pending</span>' : o[`r${h}`] == null ? `<span class="open">${o.n_after}/${h}</span>` : `<span class="${o[`r${h}`] >= 0 ? 'up' : 'dn'}">${pc(o[`r${h}`], 1)}</span>`;
  const xc = (e, h) => { const x = e.x_ctrl && e.x_ctrl[`r${h}`]; return x == null ? '<span class="open">–</span>' : `<span class="${x >= 0 ? 'hit' : 'miss'}">${pc(x, 1)}</span>`; };
  const row = e => { const o = e.o;
    return `<tr class="${e.censored ? 'cen' : ''}"><td>${day(e.day)}</td><td>${o ? day(o.entry_day) : '<span class="open">next close</span>'}</td><td><b class="lnk" data-s="${e.sym}">${e.sym}</b> ${tb(e.tier)}${(LADDER || STEALTH || LOUD) && e.ps ? ' ' + psPill(e.ps, true) : ''}</td><td class="num">${e.dd0 != null ? pc(-e.dd0) : '–'}</td><td class="num">${pc(e.r200, 1)}</td>
      <td class="num">${o ? px(o.entry) : '–'}</td><td class="num">${o ? `<span class="${o.now >= 0 ? 'up' : 'dn'}">${pc(o.now, 1)}</span>` : '–'}</td>
      <td class="num">${cell(o, 5)}</td><td class="num">${cell(o, 10)}</td><td class="num">${cell(o, 21)}</td>
      <td class="num">${e.x_spy && e.x_spy.now != null ? pc(e.x_spy.now, 1) : '–'}</td><td class="num">${e.x_sec && e.x_sec.now != null ? pc(e.x_sec.now, 1) + ' <span class="muted">' + e.bench + '</span>' : '<span class="muted">n/a</span>'}</td>
      <td class="num">${xc(e, 5)}</td><td class="num">${e.x_ctrl && e.x_ctrl.now != null ? `<span class="${e.x_ctrl.now >= 0 ? 'hit' : 'miss'}">${pc(e.x_ctrl.now, 1)}</span>` : '–'}</td>
      <td>${o && o.pop ? `<span class="hit">✓ s${o.pop}</span>` : o && o.n_after >= 21 ? '<span class="miss">✕</span>' : '<span class="open">open</span>'}</td><td class="num">${o && o.dd != null ? pc(o.dd, 1) : '–'}</td>
      <td class="muted" title="${LOUD ? 'matched on the 20-day return, the distance from the high and the session\'s own move (loud universe, no loud tier)' : STEALTH ? 'matched on the 20-day return, distance from the high and 30-day ATM IV (ladder data, no stealth tier)' : 'matched on depth + 20-day return' + (LADDER ? ' (ladder data, no tier; no washout needed)' : '')}">${e.controls.map(c => c.sym).join(', ') || '–'}</td><td class="muted">${esc(e.rules || '')}</td></tr>`; };
  const scored = E.filter(e => !e.censored), cen = E.filter(e => e.censored);
  const grpChips = LADDER || STEALTH || LOUD ? (LOUD ? [['L', 'L loud call buying', ''], ['C', 'C move day', ''], ['S', 'S spread', ''], ['X', 'X not buying', '']]
    : STEALTH ? [['S', 'S stealth build', ''], ['Q', 'Q quiet but loud', ''], ['M', 'M price moving', ''], ['WATCH', 'Watch', '']]
    : [['L', 'L call ladder', ''], ['B', 'B building', ''], ['J', 'J rejected', '']]).map(([k, t, c]) => `<button class="chip ${S.grp === k ? 'on' : ''}" data-grp="${k}">${t} <span class="c">${c}</span></button>`).join('')
    : `<button class="chip ${S.grp === 'X' ? 'on' : ''}" data-grp="X">X ladder</button><button class="chip ${S.grp === 'N' ? 'on' : ''}" data-grp="N">Near</button>`;
  $('#main').innerHTML = `<div class="rec-wrap"><h2>Track record · ${LADDER || STEALTH || LOUD ? TNAME[S.grp] + ' · ' + TLONG[S.grp] : S.grp === 'X' ? 'X · XLU-like ladder' : 'Near · ladder on, washout one check short'} · ${S.ph === 'all' ? 'all entries' : S.ph}</h2>
    <div class="viewbar" style="padding:4px 0 8px"><span class="muted">Tier</span>${grpChips}
      <span class="sep"></span><span class="muted">Phase</span>${[['all', 'All'], ['backfill', 'Backfill'], ['live', 'Live (from ' + day(R.live_from) + ' settle)']].map(([k, t]) => `<button class="chip ${S.ph === k ? 'on' : ''}" data-ph="${k}">${t}</button>`).join('')}</div>
    <div class="cap" style="max-width:1150px">${esc(LADDER || STEALTH || LOUD ? CAP[S.grp] : CAP[S.grp] || CAP.X)}</div>
    <div class="golink-row"><span class="lnk golink" data-v="outcomes">${STEALTH || LOUD ? 'Worked / didn\'t and Reached the main strike: see how each flag turned out, vs its peers and vs the options\' own odds →' : 'Worked / didn\'t: see how each flag turned out (+10% before −10%, vs its peers) →'}</span></div>
    ${LOUD ? recordNoteLd(R) : STEALTH ? recordNoteS(R) : LADDER ? recordNoteL(R) : `<div class="note" style="max-width:1150px">Pre-registered Oct 8 2026 (the rule version is noted on every entry): an entry is the first saved settle a name reaches the tier; open interest for settle D publishes the next morning, so the entry price is the <b>close of D+1</b>. Outcomes at +5/+10/+21 sessions and to the latest close, also minus SPY and minus the sector fund; <b>pop</b> = a daily high 10%+ over the entry within 21 sessions; worst drawdown within 21 sessions. Each entry is compared with <b>3 names washed out the same day with no tier</b>, matched on depth under the high and 20-day return. Summaries count only entries whose whole window has passed. Entries on settles before ${day(R.live_from)} are backfilled; live entries start at that settle. Names already on the list on the first saved settle (${day(R.first_day)}) have their own section.</div>`}
    <div class="rec-tiles">${tile('Entries', `${sm.entries || 0}`, `${sm.episodes || 0} distinct signal days · ${sm.censored || 0} on day one · ${sm.pending || 0} waiting for their entry close`)}${hz(5)}${hz(10)}${hz(21)}</div>
    <div class="note" style="margin:-4px 0 10px">Pop (+10% within 21 sessions): ${pop.closed ? `<b>${pop.hits} of ${pop.closed}</b> entries vs controls ${pop.ctrl_closed ? `<b>${pop.ctrl_hits} of ${pop.ctrl_closed}</b>` : 'n/a'} · mean worst drawdown ${pc(pop.dd_mean, 1)}` : 'no entry has had 21 sessions yet'}.</div>
    <div class="recw"><table class="rec"><thead><tr><th>Signal settle</th><th>Entry close</th><th>Name</th><th>Under high</th><th>20d</th><th>Entry</th><th>To now</th><th>+5</th><th>+10</th><th>+21</th><th>vs SPY now</th><th>vs sector now</th><th>vs controls +5</th><th>vs controls now</th><th>Pop</th><th>Worst dd</th><th>Controls</th><th>Rules</th></tr></thead>
    <tbody>${scored.map(row).join('') || '<tr><td colspan="18" class="muted" style="padding:14px 6px">No entries in this phase yet.</td></tr>'}
    ${cen.length ? `<tr><td colspan="18" style="padding:16px 6px 6px" class="muted">ON THE LIST FROM THE FIRST SAVED SETTLE (${day(R.first_day).toUpperCase()})</td></tr>` + cen.map(row).join('') : ''}</tbody></table></div></div>`;
}






const OGRP = LADDER ? [['L', 'Call ladder'], ['B', 'Building'], ['J', 'Rejected builds'], ['all', 'All']]
  : [['X', 'XLU-like ladder'], ['N', 'Near'], ['all', 'All']];
const OG_ALL = LADDER ? ['L', 'B', 'J'] : ['X', 'N'];
const OUTS = [['worked', 'Worked'], ['fell', 'Kept falling'], ['flat', 'Went nowhere'], ['open', 'Still working']];
const OUTN = Object.fromEntries(OUTS);
const OSORT = [['newest', 'Newest'], ['best', 'Best high'], ['worst', 'Worst low'], ['now', 'Now']];
const OCAP = LADDER ? {
  L: 'The pattern: a call ladder in any price state.',
  B: 'Building: a big or persistent build that passes the ladder and call-selling gates but misses a shape gate.',
  J: 'Rejected builds: big call builds that failed the ladder or call-selling gates (spreads, one expiry, call selling…).',
  all: 'Every group together (a name can be in more than one group).',
} : {
  X: 'The pattern: washed out + an XLU-like call ladder.',
  N: 'Near: the ladder is on but the washout is one check short or just ended.',
  all: 'Every group together (a name can be in more than one group).',
};
const OST = { open: {}, all: false, hall: false };
const okey = e => e.g + ':' + e.sym + ':' + e.day;
const opill = (o, cls = '') => {
  if (!o) return `<span class="opill wait ${cls}">Waiting for the entry close</span>`;
  if (o.out === 'worked') return `<span class="opill worked ${cls}">Worked</span>`;
  if (o.out === 'fell') return `<span class="opill fell ${cls}">Kept falling</span>`;
  if (o.out === 'flat') return `<span class="opill flat ${cls}">Went nowhere</span>`;
  return `<span class="opill open ${cls}">Still working</span>`;
};
const owhen = (o, N = 21) => {
  if (!o) return '';
  if (o.out === 'worked' || o.out === 'fell') return `${day(o.on)} · after ${o.n} session${o.n === 1 ? '' : 's'}`;
  if (o.out === 'flat') return `${N} sessions to ${day(o.on)}`;
  if (!o.n) return `entry close just in · 0 of ${N} sessions`;
  return `${o.sub === 'down' ? 'down' : 'up'} so far · ${o.n} of ${N} sessions`;
};
const sgn = (v, d = 1) => v == null ? '<span class="muted">–</span>' : `<span class="${v >= 0 ? 'up' : 'dn'}">${pc(v, d)}</span>`;
function oEntries(O) {
  const gs = S.og === 'all' ? OG_ALL : [S.og];
  return gs.flatMap(g => ((O.groups[g] || {}).entries || [])).filter(e => S.oph === 'all' || e.phase === S.oph);
}
function oTally(O) {
  const gs = S.og === 'all' ? OG_ALL : [S.og];
  const z = { worked: 0, fell: 0, flat: 0, open: 0, up: 0, down: 0, entries: 0, resolved: 0, censored: 0, pending: 0, days: 0,
    peers: { worked: 0, fell: 0, flat: 0, open: 0, all: 0, resolved: 0 } };
  gs.forEach(g => { const t = (((O.groups[g] || {}).tally) || {})[S.oph]; if (!t) return;
    for (const k in z) if (k !== 'peers') z[k] += t[k] || 0;
    for (const k in z.peers) z.peers[k] += (t.peers || {})[k] || 0; });
  return z;
}
function oTiles(t, d1) {
  const tile = (k, lab, cls) => {
    const n = t[k], sh = (k !== 'open' && t.resolved ? ((LADDER || STEALTH || LOUD) && t.resolved < 10 ? `of ${t.resolved} resolved` : `${pu(n / t.resolved)} of ${t.resolved} resolved`) : k === 'open' ? `${t.up} up so far · ${t.down} down so far` : 'none resolved yet')
      + (d1[k] ? ` <span class="d1n" title="on the list from the first saved settle">+${d1[k]} day one</span>` : '');
    const p = t.peers, pv = k === 'open' ? `peers ${p.open} of ${p.all}` : `peers ${p[k]} of ${p.resolved}${p.resolved ? ` (${pu(p[k] / p.resolved)})` : ''}`;
    return `<button class="ot ot-${cls} ${S.of === k ? 'on' : ''}" data-of="${k}" title="Show only: ${lab}"><span class="ot-v num">${n}</span><span class="ot-k">${lab}</span><span class="ot-s">${sh}</span><span class="ot-p">${pv}</span></button>`;
  };
  return `<div class="otally">${tile('worked', 'Worked', 'worked')}${tile('fell', 'Kept falling', 'fell')}${tile('flat', 'Went nowhere', 'flat')}${tile('open', 'Still working', 'open')}</div>`;
}
function oRow(e, O) {
  const o = e.oc, k = okey(e), open = !!OST.open[k];
  return `<div class="orow ${e.censored ? 'cen' : ''} ${open ? 'open' : ''}"><button class="or-sum" data-ok="${esc(k)}" aria-expanded="${open}">
    <span class="c nm"><b class="tk">${e.sym}</b> ${tb(e.tier)}${LADDER && e.ps ? ' ' + psPill(e.ps, true) : ''}${STEALTH || LOUD ? ' ' + catPill(e, true) : ''}${e.censored ? ' <span class="day1" title="On the list from the first saved settle">day one</span>' : ''}${e.phase === 'backfill' ? '' : ' <span class="livetag">live</span>'}<span class="onm">${esc(e.name || '')}</span></span>
    <span class="c fd"><i>flagged</i>${day(e.day)}</span>
    <span class="c en"><i>entry</i>${e.entry != null ? `${px(e.entry)} <span class="muted">${day(e.entry_day)}</span>` : '<span class="muted">next close</span>'}</span>
    <span class="c oc">${opill(o)}<span class="ow">${owhen(o, O.rule.n)}</span>${STEALTH || LOUD ? tkLine(e) : ''}</span>
    <span class="c bs num"><i>best</i>${o ? sgn(o.best) : '–'}</span><span class="c ws num"><i>worst</i>${o ? sgn(o.worst) : '–'}</span>
    <span class="c nw num"><i>now</i>${o ? sgn(o.now) : '–'}</span><span class="c sp num"><i>vs SPY</i>${sgn(e.x_spy)}</span>
    <span class="c-chev" aria-hidden="true">›</span></button>
    ${open ? `<div class="or-det"><div class="ochart" data-ock="${esc(k)}"></div>${oPeers(e)}</div>` : ''}</div>`;
}
function oPeers(e) {
  const cs = e.controls || [];
  const ctl = cs.length ? cs.map(c => `<span class="lnk" data-s="${c.sym}">${c.sym}</span> ${c.oc ? `${opill(c.oc, 'sm')} <span class="muted">${c.oc.out === 'open' ? owhen(c.oc) : c.oc.out === 'flat' ? '' : 'after ' + c.oc.n}</span>` : '<span class="muted">no prices</span>'}`).join(' &nbsp;·&nbsp; ') : '<span class="muted">no matched peer that day</span>';
  return `<div class="note opeers">Peers (${LOUD ? 'same day, loud universe, no loud tier, nearest on 20-day return + distance from the high + the session\'s own move' : STEALTH ? 'same day, ladder data, no stealth tier, nearest on 20-day return + distance from the high + 30-day ATM IV' : LADDER ? 'same day, ladder data, no tier — no washout needed — nearest on 20-day return + distance from the high' : 'washed out the same day, no tier, nearest on depth + 20-day return'}): ${ctl}. ${STEALTH || LOUD ? tkPeers(e) : ''}<span class="lnk wh" data-s="${e.sym}">Open ${e.sym} →</span></div>`;
}
function miniOutcome(el, e, O) {
  const P = O.paths[e.sym] || [], W = Math.max(260, Math.min(820, el.clientWidth || 300)), H = NARROW() ? 140 : 160;
  if (!P.length || e.entry == null) { el.innerHTML = '<div class="note">No daily bars to draw.</div>'; return; }
  const fi = P.findIndex(b => b[0] >= e.day), i0 = Math.max(0, (fi < 0 ? P.length : fi) - O.rule.before), B = P.slice(i0);
  const N = B.length, ei = B.findIndex(b => b[0] === e.entry_day), en = e.entry, o = e.oc;
  const L = 6, R = 76, T = 10, Bm = 18, pw = W - L - R, ph = H - T - Bm, X = i => L + (N > 1 ? i / (N - 1) : 0.5) * pw;
  const vals = B.flatMap(b => [b[1] ?? b[3], b[2] ?? b[3]]).concat([en * 1.1, en * 0.9], (STEALTH || LOUD) && e.tk && e.tk.K && e.tk.K < en * 1.6 ? [e.tk.K] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals); const pd = (hi - lo) * 0.08; lo -= pd; hi += pd;
  const Y = v => T + (hi - v) / (hi - lo) * ph;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(e.sym)} from 10 sessions before the flag to today" style="display:block;font-family:inherit;font-variant-numeric:tabular-nums">`;
  if (ei >= 0) { const x0 = X(ei), x1 = X(Math.min(N - 1, ei + O.rule.n));
    s += `<rect x="${x0.toFixed(1)}" y="${T}" width="${Math.max(1, x1 - x0).toFixed(1)}" height="${ph}" fill="rgba(79,163,247,.08)"/>`;
    if (ei + O.rule.n > N - 1) s += `<text x="${(x1 - 4).toFixed(1)}" y="${T + 11}" fill="#5d606b" font-size="10.5" text-anchor="end">window open</text>`; }
  const hl = (v, col, lab) => `<line x1="${L}" x2="${L + pw}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${col}" stroke-dasharray="5,4" stroke-opacity=".85"/><text x="${L + pw + 5}" y="${(Y(v) + 4).toFixed(1)}" fill="${col}" font-size="11">${lab}</text>`;
  s += hl(en * 1.1, '#26a69a', '+10% ' + px(en * 1.1)) + hl(en * 0.9, '#ef5350', '−10% ' + px(en * 0.9));
  s += `<line x1="${L}" x2="${L + pw}" y1="${Y(en).toFixed(1)}" y2="${Y(en).toFixed(1)}" stroke="#787b86" stroke-opacity=".45"/>`;
  if (B[0][1] != null) { const up = B.map((b, i) => `${X(i).toFixed(1)},${Y(b[1] ?? b[3]).toFixed(1)}`).join(' '), dn = B.map((b, i) => [i, b]).reverse().map(([i, b]) => `${X(i).toFixed(1)},${Y(b[2] ?? b[3]).toFixed(1)}`).join(' ');
    s += `<polygon points="${up} ${dn}" fill="rgba(209,212,220,.10)"/>`; }
  s += `<polyline points="${B.map((b, i) => `${X(i).toFixed(1)},${Y(b[3]).toFixed(1)}`).join(' ')}" fill="none" stroke="#d1d4dc" stroke-width="1.5" stroke-linejoin="round"/>`;
  if (fi >= 0) { const xf = X(fi - i0); s += `<line x1="${xf.toFixed(1)}" x2="${xf.toFixed(1)}" y1="${T}" y2="${T + ph}" stroke="${TCOL[e.tier] || '#787b86'}" stroke-dasharray="2,3"/><text x="${(xf + 3).toFixed(1)}" y="${T + ph - 3}" fill="${TCOL[e.tier] || '#787b86'}" font-size="10.5">flag</text>`; }
  if (ei >= 0) s += `<circle cx="${X(ei).toFixed(1)}" cy="${Y(en).toFixed(1)}" r="4" fill="#131722" stroke="#fff" stroke-width="1.8"><title>entry ${px(en)} (${day(e.entry_day)} close)</title></circle>`;
  if (o && o.on && o.out !== 'open') { const ri = B.findIndex(b => b[0] === o.on);
    if (ri >= 0) { const b = B[ri], v = o.out === 'worked' ? (b[1] ?? b[3]) : b[3], col = o.out === 'worked' ? '#26a69a' : o.out === 'fell' ? '#ef5350' : '#ff9800';
      s += `<circle cx="${X(ri).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4.5" fill="${col}" stroke="#131722" stroke-width="1.5"><title>${OUTN[o.out]}: ${day(o.on)}</title></circle>`; } }
  s += `<circle cx="${X(N - 1).toFixed(1)}" cy="${Y(B[N - 1][3]).toFixed(1)}" r="2.6" fill="#fff"/>`;
  if (STEALTH || LOUD) s += tkOverlay(e, B, X, Y, L, pw, T, ph, lo, hi);
  s += `<text x="${L}" y="${H - 4}" fill="#787b86" font-size="10.5">${day(B[0][0])}</text><text x="${L + pw}" y="${H - 4}" fill="#787b86" font-size="10.5" text-anchor="end">${day(B[N - 1][0])}</text>`;
  el.innerHTML = s + '</svg>';
}
function oHistory() { return ''; }
async function renderOutcomes() {
  if (!OUTC) $('#main').innerHTML = '<div class="empty">Loading the outcomes…</div>';
  const O = OUTC || await loadOutcomes();
  if (S.v !== 'outcomes') return;
  if (!OGRP.some(g => g[0] === S.og)) S.og = STEALTH ? 'S' : LADDER || LOUD ? 'L' : 'X';
  const all = oEntries(O), t = oTally(O);
  const cnt = g => (g === 'all' ? OG_ALL : [g]).reduce((a, x) => a + (((O.groups[x] || {}).entries) || []).filter(e => S.oph === 'all' || e.phase === S.oph).length, 0);
  let list = all.filter(e => (S.of === 'all' || (e.oc && e.oc.out === S.of)) && (!S.os || e.sym === S.os));
  const F = { newest: (a, b) => b.day.localeCompare(a.day) || a.sym.localeCompare(b.sym),
    best: (a, b) => ((b.oc || {}).best ?? -9) - ((a.oc || {}).best ?? -9), worst: (a, b) => ((a.oc || {}).worst ?? 9) - ((b.oc || {}).worst ?? 9),
    now: (a, b) => ((b.oc || {}).now ?? -9) - ((a.oc || {}).now ?? -9) };
  list = list.sort((a, b) => (F[S.osort] || F.newest)(a, b) || F.newest(a, b));
  const cap = OST.all ? list.length : 25;
  const fc = k => all.filter(e => (!S.os || e.sym === S.os) && (k === 'all' || (e.oc && e.oc.out === k))).length;
  const ruleTxt = `<b>Worked</b> = the price traded <b class="up">10%+ above the entry</b> (the close the morning after the flag became known) within 21 sessions, before any close <b class="dn">10%+ below it</b>. <b>Kept falling</b> = that close came first (both in one session counts as kept falling). <b>Went nowhere</b> = neither in 21 sessions. <b>Still working</b> = the 21 sessions are not over. Each flag is set against 3 ${LOUD ? 'names from the same day in the loud universe with no loud tier, nearest on 20-day return, distance from the high and the session\'s own move' : STEALTH ? 'names with ladder data the same day and no stealth tier, nearest on 20-day return, distance from the high and 30-day ATM IV' : LADDER ? 'names with ladder data the same day and no tier (no washout needed), nearest on 20-day return and distance from the high' : 'names washed out the same day with no tier'} (its peers), judged the same way.${STEALTH || LOUD ? ' <b>Reached the main strike</b> = a daily high at or above the strike with the most call adds, before its expiry; scored against the options\' own touch odds at entry and against the peers given the same relative target and deadline.' : ''}`;
  const phaseTxt = `Rule written down Oct 8 2026 before any outcome was looked at. Flags on settles before ${day(O.live_from)} are backfilled; live flags start at the ${day(O.live_from)} settle. Names already on the list on the first saved settle (${day(O.first_day)}) are marked day one.`;
  const hdr = NARROW()
    ? `<div class="orule"><b>Worked</b> = <b class="up">+10%</b> high before a <b class="dn">−10%</b> close, within 21 sessions of the entry.</div>
       <details class="rdet orx"><summary>How it's judged · backfill vs live</summary><div class="orule" style="margin-top:6px">${ruleTxt}</div><div class="note" style="margin:6px 0 2px">${phaseTxt}</div></details>`
    : `<div class="orule">${ruleTxt}</div><div class="note" style="margin:6px 0 2px">${phaseTxt}</div>`;
  $('#main').innerHTML = `<div class="oc-wrap"><h2>Worked / didn't <span class="muted" style="font-size:13px;font-weight:400">· how each flag turned out</span></h2>
    ${hdr}
    <div class="viewbar ovb"><span class="muted">Group</span>${OGRP.map(([k, l]) => `<button class="chip ${S.og === k ? 'on' : ''}" data-og="${k}">${l}<span class="c">${cnt(k)}</span></button>`).join('')}
      <span class="sep"></span><span class="muted">Phase</span>${[['all', 'All'], ['backfill', 'Backfill'], ['live', 'Live']].map(([k, l]) => `<button class="chip ${S.oph === k ? 'on' : ''}" data-oph="${k}">${l}</button>`).join('')}</div>
    <div class="cap ${LOUD ? (S.og !== 'L' && S.og !== 'all' ? 'trk' : '') : S.og === 'N' || S.og === 'J' || S.og === 'B' || (STEALTH && S.og !== 'S' && S.og !== 'all') ? 'trk' : ''}">${esc(OCAP[S.og])}</div>
    ${oTiles(t, Object.fromEntries(OUTS.map(([k]) => [k, all.filter(e => e.censored && e.oc && e.oc.out === k).length])))}${STEALTH || LOUD ? tkTiles(O) : ''}
    <div class="note">${t.entries} entr${t.entries === 1 ? 'y' : 'ies'} on ${t.days} signal day${t.days === 1 ? '' : 's'} (${S.oph === 'all' ? 'all phases' : S.oph === 'live' ? 'live only' : 'backfill only'}) · ${t.censored} on day one · ${t.pending} waiting for the entry close. Shares use resolved entries only.</div>
    <div class="ol-bar"><div class="seg" role="group" aria-label="Which outcomes">${[['all', 'All']].concat(OUTS).map(([k, l]) => `<button data-of="${k}" aria-pressed="${S.of === k}">${l} <span class="c">${fc(k)}</span></button>`).join('')}</div>
      <label class="osort"><span class="muted">Sort</span><select id="osortsel">${OSORT.map(([k, l]) => `<option value="${k}" ${S.osort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${S.os ? `<span class="chip on" data-os="">${esc(S.os)} only ✕</span>` : ''}</div>
    <div class="olist"><div class="ohead"><span class="c nm">Name</span><span class="c fd">Flagged</span><span class="c en">Entry</span><span class="c oc">Outcome</span><span class="c bs">Best</span><span class="c ws">Worst</span><span class="c nw">Now</span><span class="c sp">vs SPY</span><span></span></div>
      ${list.slice(0, cap).map(e => oRow(e, O)).join('') || `<div class="empty small">Nothing here for this view${S.os ? ` (${esc(S.os)} has no entry in this group)` : ''}.</div>`}</div>
    ${list.length > 25 ? `<p class="more"><button class="linkbtn" data-omore="1">${OST.all ? 'Show fewer' : 'Show all ' + list.length}</button></p>` : ''}
    <div class="note" style="margin-top:6px">Best = the highest high, worst = the lowest low, from the entry to the day it resolved (or to date). Now = the latest close vs the entry; vs SPY = that minus SPY over the same days. Tap a row for its chart: 10 sessions before the flag to today, the 21-session window shaded, the entry ○, the ±10% lines and the day it resolved ●.</div>
    ${oHistory(O.history)}</div>`;
  const ss = $('#osortsel'); if (ss) ss.addEventListener('change', () => go({ osort: ss.value }, false));
  const hl = $('details.hlist'); if (hl) hl.addEventListener('toggle', () => { OST.hopen = hl.open; });
  document.querySelectorAll('.ochart').forEach(el => { const e = list.find(x => okey(x) === el.dataset.ock); if (e) miniOutcome(el, e, O); });
}
function outcomesClick(t) {
  if (t.dataset.og) { OST.all = false; return go({ og: t.dataset.og, of: 'all' }, false); }
  if (t.dataset.oph) return go({ oph: t.dataset.oph }, false);
  if (t.dataset.of) { OST.all = false; return go({ of: S.of === t.dataset.of && t.classList.contains('ot') ? 'all' : t.dataset.of }, false); }
  if (t.dataset.omore) { OST.all = !OST.all; return renderMain(); }
  if (t.dataset.ohall) { OST.hall = !OST.hall; OST.hopen = true; const y = window.scrollY; renderMain(); window.scrollTo(0, y); return; }
  if (t.dataset.ok) { const k = t.dataset.ok; if (OST.open[k]) delete OST.open[k]; else OST.open[k] = 1;
    const y = window.scrollY; renderMain(); window.scrollTo(0, y); }
}




const PSTATES = [['all', 'All states'], ['wash', 'Washed out'], ['pull', 'Pullback'], ['base', 'Basing'], ['high', 'At highs'], ['other', 'Other']];
const PSW = { wash: 'Washed out', pull: 'Pullback', base: 'Basing', high: 'At highs', other: 'Other' };
const PSORD = { wash: 0, pull: 1, base: 2, high: 3, other: 4 };
const psPill = (ps, sm) => ps ? `<span class="ps ${ps}${sm ? ' sm' : ''}" title="Price state: ${PSW[ps]}">${PSW[ps]}</span>` : '';
const PSORT_L = [['t', 'Tier, then rank'], ['per', 'Persistence'], ['p1', '1-day build'], ['p3', '3-day build'], ['ps', 'Price state'],
  ['r20', '20-day return'], ['biz', 'Business score'], ['don', 'Days on list']];
if (LADDER) Object.assign(SORTS, { ps: r => (PSORD[r.ps] ?? 9) * 10 + (r.dd || 0), biz: r => r.biz ?? -1, r60: r => r.r60 ?? -9 });
const COLS_L = [['rk', '#', 0], ['t', 'Tier', 1], ['s', 'Stock', 1], ['sec', 'Sector', 1], ['r20', 'Price · 20d', 1, 'r'],
  ['ps', 'Price state<span class="thsub">under high · 60d · 50/200-day</span>', 1], ['per', 'Persistence<span class="thsub">last 5 settles</span>', 1],
  ['p1', '1-day build<span class="thsub">% of open calls</span>', 1], ['p3', '3-day build', 1], ['da', 'Δ/ADV', 1],
  ['lad', 'Ladder<span class="thsub">expiries · top-2</span>', 1], ['cvp', 'Calls / puts<span class="thsub">added, 3 days</span>', 1],
  ['biz', 'Business', 1], ['don', 'Days', 1]];
function headL() {
  const R = D.rules;
  const open = !NARROW() && store.get('rulesOpenD', true) || NARROW() && store.get('rulesOpen', false);
  return `<div class="head">${vintage()}
    <div class="lstrip"><b>What a call ladder is:</b> near-the-money calls built over several sessions across several expiries, not piled into one or two contracts, and no sign of call selling — in any price state, no washout needed.</div>
    <details class="rdet" ${open ? 'open' : ''}><summary>The rules (${esc(R.version)}) and the tiers</summary><div class="rules"><div class="r a"><b>1 · Call ladder</b>${esc(R.ladder)}</div>
      <div class="r w"><b>2 · Price state</b>${esc(R.state)}</div></div>
    <div class="tiersline">${tb('L')} call ladder on, any price state · ${tb('B')} building: passes the ladder gates, misses one · ${tb('J')} rejected big builds. ${esc(R.score)}</div></details></div>`;
}
function viewBarL() {
  const rows = srcRows();
  const inT = (r, t) => t === 'list' ? LISTED.includes(r.t) : r.t === t;
  const c = t => rows.filter(r => inT(r, t) && (S.ps === 'all' || r.ps === S.ps)).length;
  const cp = k => rows.filter(r => inT(r, S.tf) && (k === 'all' || r.ps === k)).length;
  const days = (D.saved_days || []).slice().reverse();
  if (!days.includes(D.meta.settle)) days.unshift(D.meta.settle);
  return `<div class="viewbar"><span class="muted">Show</span>${TIERS.map(([k, t]) => `<button class="chip ${S.tf === k ? 'on' : ''}" data-tf="${k}">${t}<span class="c">${c(k)}</span></button>`).join('')}
${liveChips(rows)}
    <span class="sep"></span><span class="muted">Settle</span><select id="daysel">${days.map(d => `<option value="${d}" ${d === (S.d || D.meta.settle) ? 'selected' : ''}>${dayW(d)}${d === D.meta.settle ? ' · latest' : ''}</option>`).join('')}</select>
    <span class="muted hist">${(D.saved_days || []).length} saved settles from ${day((D.saved_days || [])[0])} · ${D.meta.universe.toLocaleString()} names with ladder data</span></div>
    <div class="viewbar psbar"><span class="muted">Price state</span>${PSTATES.map(([k, t]) => `<button class="chip ${S.ps === k ? 'on' : ''}" data-pst="${k}">${k === 'all' ? t : `<i class="psd ${k}"></i>${t}`}<span class="c">${cp(k)}</span></button>`).join('')}</div>`;
}
function tilesL(rows) {
  const by = t => rows.filter(r => r.t === t);
  const Ls = by('L'), Bs = by('B'), Js = by('J');
  const lnk = r => `<span class="lnk" data-s="${r.s}">${r.s}</span>`;
  const per = rows.filter(r => r.t && L(r).per).sort((a, b) => L(b).per - L(a).per || (L(b).p3 || 0) - (L(a).p3 || 0))[0];
  const fresh = rows.filter(r => LISTED.includes(r.t) && r.new);
  const reasons = {}; Js.forEach(r => (L(r).why || []).forEach(w => { reasons[w] = (reasons[w] || 0) + 1; }));
  const topR = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w, c]) => `${esc(w)} ${c}`).join(' · ');
  const mix = {}; rows.filter(r => LISTED.includes(r.t)).forEach(r => { mix[r.ps] = (mix[r.ps] || 0) + 1; });
  const st = D.states || {}, all = Object.values(st).reduce((a, x) => a + x.all, 0);
  const stLine = pastDay() ? 'L and B names that day' : `of ${all.toLocaleString()} names with ladder data: ${PSTATES.slice(1).filter(([k]) => st[k]).map(([k, t]) => `${(st[k].all).toLocaleString()} ${t.toLowerCase()}`).join(' · ')}`;
  return `<div class="tiles ltiles">
    <div class="tile"><div class="k">Call ladders · ${day(pastDay() ? S.d : D.meta.settle)}</div><div class="v wrapv">${Ls.length ? Ls.slice(0, 4).map(lnk).join(' ') + (Ls.length > 4 ? ` <small>+${Ls.length - 4}</small>` : '') : '<small>none</small>'}</div><div class="s"><b>${Ls.length}</b> L${per ? `<br>most persistent build: ${lnk(per)} ${tb(per.t)} ${dotsHTML(L(per))}` : ''}</div></div>
    <div class="tile"><div class="k">Building (B)</div><div class="v num">${Bs.length}</div><div class="s">${Bs.length ? Bs.slice(0, 5).map(lnk).join(' ') + ' · each misses one shape gate' : 'none'}</div></div>
    <div class="tile"><div class="k">Rejected big builds (J)</div><div class="v num">${Js.length}</div><div class="s">${topR || 'none'}</div></div>
    <div class="tile"><div class="k">New today</div><div class="v wrapv">${!pastDay() && fresh.length ? fresh.slice(0, 5).map(lnk).join(' ') : '<small>none</small>'}</div><div class="s">${pastDay() ? 'shown for the latest settle' : 'L or B for the first settle in a row'}</div></div>
    <div class="tile"><div class="k">Price states · L + B</div><div class="v psmix">${PSTATES.slice(1).filter(([k]) => mix[k]).map(([k]) => `<span class="pm">${psPill(k, true)} <b>${mix[k]}</b></span>`).join('') || '<small>–</small>'}</div><div class="s">${stLine}</div></div>
  </div>`;
}
function psCell(r) {
  if (r.dd == null) return `<span class="muted">${esc(r.stale || 'n/a')}</span>`;
  const ma = (v, n) => v == null ? '' : `<span class="${v >= 0 ? 'up' : 'dn'}" title="close ${pc(v, 1)} vs the ${n}-day average">${v >= 0 ? '▲' : '▼'}${n}</span>`;
  return `${psPill(r.ps)} <b class="num">${pc(-r.dd)}</b><div class="cellsub">60d <span class="${(r.r60 || 0) >= 0 ? 'up' : 'dn'}">${pc(r.r60)}</span> · ${ma(r.a50, 50)} ${ma(r.a200, 200)}</div>`;
}
function bizCell(r) {
  if (r.biz == null) return `<span class="muted">${r.k === 'etf' ? 'fund' : '–'}</span>`;
  return `<b class="${r.biz >= 70 ? 'up' : r.biz >= 50 ? 'kg' : 'muted'}">${r.biz}</b><span class="muted">/100</span>`;
}
function subLineL(r) {
  const l = L(r);
  if (r.t === 'L') return '';
  if (r.t === 'B') return `<div class="rsub am">misses: ${esc(l.gate || '')}</div>`;
  if (r.t === 'J') return `<div class="rsub dn">${esc((l.why || []).join(' · '))}</div>`;
  return '';
}
function tableRowL(r, i, other) {
  const p = `<td class="r num">${pxTd(r)}</td>`;
  if (other) return `<tr class="row other" data-s="${r.s}"><td class="rk"></td><td>${tb(r.t)}</td><td><div class="tk">${r.s}</div><div class="nm">${esc(r.n || '')}</div></td>
    <td class="c-sec">${secCell(r)}</td>${p}<td>${psCell(r)}</td><td class="why" colspan="${COLS_L.length - 6 + (liveOn() ? 1 : 0)}">${esc(whyText(r))}</td></tr>`;
  return `<tr class="row ${r.t}" data-s="${r.s}"><td class="rk">${r.rk || i + 1}</td><td>${tb(r.t)}</td>
    <td><div class="tk">${r.s}</div><div class="nm">${esc(r.n || '')}</div>${subLineL(r)}</td><td class="c-sec">${secCell(r)}</td>${p}
    <td>${psCell(r)}</td><td class="c-per">${dotsHTML(r.l)}</td><td>${b1Cell(r)}</td><td class="c-p3">${b3Cell(r)}</td><td class="c-da">${daCell(r)}</td>
    <td class="c-lad">${ladCell(r)}</td><td class="c-cvp">${cvpCell(r)}</td><td class="c-biz">${bizCell(r)}</td>${tdc(r)}<td class="c-don">${donCell(r)}</td></tr>`;
}
function cardL(r, i, other) {
  const l = r.l || {}, b = r.b;
  const ma = (v, n) => v == null ? '' : `${v >= 0 ? 'above' : 'below'} ${n}d`;
  return `<div class="pcard ${other ? 'other' : r.t}" data-s="${r.s}"><div class="r1"><span>${!other ? `<span class="muted">${r.rk || i + 1}</span> ` : ''}${tb(r.t)} <b class="wh" style="font-size:15px">${r.s}</b> ${pxCard(r)} ${donCell(r)}</span>${dotsHTML(r.l)}</div>${cardLive(r)}
    <div class="r2">${psPill(r.ps)} <span class="muted num">${r.dd != null ? pc(-r.dd) + ' under the high' : ''}${r.r60 != null ? ' · 60d ' + pc(r.r60) : ''}${r.a50 != null ? ' · ' + [ma(r.a50, 50), ma(r.a200, 200)].filter(Boolean).join(', ') : ''}</span></div>
    <div class="r3 num"><span>1-day <b class="${l.f && l.f.mag1 ? 'kg' : ''}">${pc(l.p1)}</b> ${l.pr != null ? topTxt(l.pr) : ''}</span><span>3-day <b class="${l.f && l.f.mag3 ? 'kg' : ''}">${pc(l.p3)}</b></span>
      <span>Δ/ADV <b>${da(l.da3)}</b></span><span>ladder <b class="${l.f && l.f.lad3 ? 'up' : ''}">${l.ne != null ? l.ne + ' exp · ' + pu(l.t2) : '–'}</b></span>
      <span>calls <b class="up">${kp(l.c3)}</b> / puts <b class="dn">${kp(l.put3)}</b></span>${r.biz != null ? `<span>business <b>${r.biz}</b></span>` : ''}</div>
    ${other ? `<div class="why">${esc(whyText(r))}</div>` : subLineL(r)}</div>`;
}
async function renderBoardL() {
  if (pastDay() && !DAYB[S.d]) {
    $('#main').innerHTML = head() + `<div class="empty">Loading ${dayW(S.d)}…</div>`;
    try { await loadDay(S.d); } catch (e) { $('#main').innerHTML = head() + viewBarL() + `<div class="empty">No saved board for ${esc(S.d)}.</div>`; return; }
    if (S.v !== 'board') return;
  }
  const rows = srcRows(), q = S.q, past = pastDay();
  const inP = r => S.ps === 'all' || r.ps === S.ps;
  const by = t => sorted(rows.filter(r => r.t === t && inP(r) && inLv(r) && (!q || matchQ(r, q))));
  const groups = S.tf === 'list' ? ['L', 'B'] : S.tf === 'J' ? [] : [S.tf];
  const js = by('J');
  const none = `No name in this tier${S.ps !== 'all' ? ' in this price state' : ''}${past ? ' that day' : ' today'}.`;
  let other = [];
  if (q) other = rows.filter(r => !r.t && matchQ(r, q)).sort((a, b) => (a.s === q ? -1 : 0) - (b.s === q ? -1 : 0) || a.s.localeCompare(b.s)).slice(0, 25);
  let h = head();
  if (past) { const x = DAYB[S.d];
    h += `<div class="pastnote">Saved board for the <b>${dayW(S.d)}</b> settle: prices to the ${day(S.d)} close, open interest to the ${day(S.d)} settle (${(x.n_chain || 0).toLocaleString()} names with chains) — what was knowable the next morning. Rules ${esc(x.rules || '')}. ${x.source === 'backfill' ? 'Rebuilt from the backfill.' : ''} Listed names only. <span class="lnk" data-d="">Back to latest →</span></div>`; }
  h += viewBarL() + tilesL(rows);
  const nAll = groups.reduce((a, t) => a + by(t).length, 0);
  const jWhat = 'one of the biggest call builds, in any price state, but not shaped like a ladder';
  if (NARROW()) {
    h += sortBar();
    groups.forEach(t => { const g = by(t); if (!g.length && S.tf === 'list' && t !== 'L') return;
      h += sectionHead(t, g.length) + (g.length ? g.map((r, i) => cardL(r, i)).join('') : `<div class="empty small">${none}</div>`); });
    if (S.tf === 'J' || S.tf === 'list') h += `<div class="pwrap">${jStrip(js, S.tf === 'J', jWhat)}</div>`;
    if (other.length) h += `<div class="psect"><div class="sect"><b>Other names</b> · why they are not on the list</div></div>` + other.map(r => cardL(r, 0, true)).join('');
  } else {
    const COLW = withTd(COLS_L), n = COLW.length;
    h += `<div class="tw"><table class="bw lad"><thead>${headRow(COLW)}</thead><tbody>`;
    groups.forEach(t => { const g = by(t); if (!g.length && S.tf === 'list' && t !== 'L') return;
      h += sectionHead(t, g.length, n) + (g.length ? g.map((r, i) => tableRowL(r, i)).join('') : `<tr><td colspan="${n}" class="muted" style="padding:10px 8px">${none}</td></tr>`); });
    if (!nAll && q && S.tf !== 'J') h += `<tr><td colspan="${n}" class="muted" style="padding:12px 8px">No listed name matches “${esc(q)}”.</td></tr>`;
    if (other.length) h += `<tr class="secrow"><td colspan="${n}"><div class="sect"><b>Other names</b> · why they are not on the list</div></td></tr>` + other.map(r => tableRowL(r, 0, true)).join('');
    h += '</tbody></table></div>';
    if (S.tf === 'J' || S.tf === 'list') h += `<div class="jwrap">${jStrip(js, S.tf === 'J', jWhat)}</div>`;
  }
  h += foot();
  $('#main').innerHTML = h;
  wireBoard();
}
function footL() {
  return `<div class="foot">The universe is every name with contract-level option data and enough open calls at the start of the window, a fresh daily price, not a leveraged or inverse product (${D.meta.universe.toLocaleString()} names on the ${day(D.meta.settle)} settle). The contract-level ladder is computed from end-of-day option chains, each read at the open-interest settle it really carries, the same contract compared at both ends on expiries that are still open. "Top x%" ranks the 1-session call build (as % of the open calls) against every name with enough open calls that settle. Δ/ADV = delta-equivalent shares added ÷ 20-day average share volume. Price states come from daily bars (52-week high from daily highs). Persistence, the 3-day window and the "settles" all start at the Sep 24 settle. The washout version of this pattern is the Bull Washout tab.</div>`;
}
function verdictL(n) {
  const t = n.t, l = n.l || {};
  if (t === 'L') return `A call ladder is being built (${l.path === '1' ? 'a one-session blast' : 'over several settles'}). Price state: ${PSW[n.ps] || '–'}.`;
  if (t === 'B') return `A big call build that passes the ladder gates but misses: ${l.gate || '—'}.`;
  if (t === 'J') return `A big call build that does not look like a ladder: ${(l.why || []).join(', ')}.`;
  return 'Not on the list' + (n.wl ? ` — ${n.wl}.` : '.');
}
function psCard(n) {
  const dd = n.dd, r = n.r20;
  if (dd == null) return '<div class="card2"><h4><span>Price state</span></h4><div class="note">No price state (no fresh daily bars).</div></div>';
  const wc = ((n.wash || {}).checks || []).filter(c => c[1]).length;
  const it = (k, t) => `<span class="${k === n.ps ? 'y' : 'n0'}">${k === n.ps ? '✓' : '·'}</span><span${k === n.ps ? ' class="cur"' : ''}><b>${PSW[k]}</b> — ${t}</span>`;
  const wtxt = n.wo ? `washed out (${n.wp === 'both' ? 'both paths' : n.wp === 'Wz' ? 'via Wz, the low-volatility path' : 'path 1'}) under the washout board's rule` : `the washout board's rule: ${wc} of 3 checks, z20 ${n.z20 != null ? n.z20.toFixed(1) : '–'} (not washed out)`;
  const ma = (v, k) => v == null ? `${k}-day average: not enough history` : `${pc(v, 1)} vs the ${k}-day average (${v >= 0 ? 'above' : 'below'})`;
  return `<div class="card2"><h4><span>Price state</span>${psPill(n.ps)}</h4>
    <div class="txt" style="margin-bottom:4px"><b>${Math.round(dd * 100)}%</b> under the 52-week high${n.hi ? ` (${px(n.hi)})` : ''} · 20-day <b class="${(r || 0) >= 0 ? 'up' : 'dn'}">${pc(r, 1)}</b> · 60-day <b class="${(n.r60 || 0) >= 0 ? 'up' : 'dn'}">${pc(n.r60, 1)}</b></div>
    <div class="ck pst">${it('wash', wtxt)}${it('high', 'close to the 52-week high')}${it('pull', 'a moderate dip under the high, with the 20-day return flat or falling')}${it('base', 'well under the high, with a flat 20 days')}${it('other', 'none of the above')}</div>
    <div class="note" style="margin-top:6px">First match wins, top to bottom. ${ma(n.a50, 50)}; ${ma(n.a200, 200)}.</div></div>`;
}
async function renderDetailL() {
  const sym = S.s;
  $('#main').innerHTML = `<div class="det"><div class="cbox"><div class="empty">Loading ${esc(sym)}…</div></div><div class="side"></div></div>`;
  const r0 = D.rows.find(x => x.s === sym);
  if (!r0 || !r0.pg) { noPage(sym); return; }
  let n;
  try { n = await loadName(sym); } catch (e) { noPage(sym); return; }
  if (S.s !== sym || S.v !== 'detail') return;
  $('.det .cbox').innerHTML = `<div class="chead"><span class="t"><b>${sym}</b> ${tb(n.t)} ${psPill(n.ps)} · ${esc(n.name || n.n || '')}</span>
    <span class="muted num">close ${px(n.px)} (${day(n.pd)}) · <span class="${(n.r20 || 0) >= 0 ? 'up' : 'dn'}">${pc(n.r20, 1)} 20d</span> · ${n.dd != null ? Math.round(n.dd * 100) + '% under the 52w high' : ''}</span>
    <span class="hbtns"><button class="btn g" data-v="board">← Board</button></span></div>
    <div class="legend"><span><i style="background:rgba(79,163,247,.35)"></i>washed-out days</span>${['L', 'B', 'J'].map(t => `<span><i style="background:${TCOL[t]}"></i>▲ ${TLONG[t]}</span>`).join('')}<span>${esc(n.sec || '')}${n.sub ? ' · ' + esc(n.sub) : ''}${n.ind || n.etf ? ' · ' + (n.ind || n.etf) : ''}</span></div>
    <div class="gexbar" id="gexbar"><span class="lab">GEX</span><span class="muted">loading the levels…</span></div>
    <div id="chart"></div><div id="oichart" style="margin-top:6px"></div>${seekBox(sym)}`;
  drawCharts(n);
  loadGex(sym).then(gx => { n.gx = gx; if (S.s !== sym || S.v !== 'detail') return; gexBar(n); drawCharts(n); });
  const cx = n.ctx && n.ctx.m;
  const g = n.gex, gl = g && g.level;
  const fl = (n.flags || []).filter(f => TCOL[f[1]]);
  const bz = n.bizm;
  $('.det .side').innerHTML = `
    <div class="card2"><h4><span>${n.t ? 'Why ' + sym + ' is here' : 'The checks'}</span>${tb(n.t)}</h4><div class="txt" style="margin-bottom:6px">${esc(verdictL(n))}${n.t && n.rk ? ` <span class="muted">#${n.rk} in its tier.</span>` : ''}</div>
      <div class="ck"><div class="hd"><span>1 · Call ladder</span>${n.l && n.l.f && n.l.f.flow ? '<span class="ok">FLOW on</span>' : n.lad ? '<span class="no">off</span>' : '<span class="no">no data</span>'}</div></div>${gateTable(n)}</div>
    ${psCard(n)}
    ${ladderCard(n)}
    ${cx ? `<div class="card2"><h4><span>Open interest · 5 settles</span><span>${day(cx.start)} → ${day(D.meta.settle)}</span></h4><div class="txt">Open calls ${kf(cx.c0)} → ${kf(cx.c1)} on the same expiries (${kp(cx.net)}); open puts ${kf(cx.p0)} → ${kf(cx.p1)} (${kp(cx.put)}).</div><div class="note" style="margin-top:4px">Counted on the expiries still open at both ends.</div></div>` : ''}
    ${gl || g ? `<div class="card2"><h4><span>Where the call money sits</span><span>GEX Hunt · ${day(g.settle)}</span></h4><div class="txt">${gl ? `Nearest big call level above the price: <b class="kg">${px(gl.k)}</b> (${pc(gl.k / n.px - 1, 1)}), ${gl.H} window${gl.exp ? ', main expiry ' + expS(gl.exp) : ''}.` : 'No big call level above the price.'} King: ${Object.entries(g.king || {}).map(([H, k]) => `${H} ${k != null ? px(k) : '–'}`).join(' · ')}.</div></div>` : ''}
    <div class="card2"><h4><span>Business</span><span></span></h4>${bz ? `<div class="txt"><b class="${bz.score >= 70 ? 'up' : bz.score >= 50 ? 'kg' : 'muted'}" style="font-size:20px">${bz.score}</b><span class="muted">/100</span> · ${(bz.m || []).map(m => `${esc(m[1])} ${m[3] == null ? 'n/a' : m[0] === 'peg' ? m[3].toFixed(2) : pc(m[3] / 100, 0)}`).join(' · ')}<div class="note">Each number ranked against the S&amp;P 500 + Nasdaq-100${bz.base === 0 ? ' (this stock is not in them)' : ''}.</div></div>` : `<div class="note">${n.k === 'etf' ? 'Funds have no business score.' : 'No score for this name (fewer than 4 of the 6 business numbers are published).'}</div>`}</div>
    <div class="card2"><h4><span>On the list</span><span></span></h4><div class="txt">${fl.length ? fl.map(f => `${tb(f[1])} ${day(f[0])}`).join(' &nbsp;') : 'Never on a saved settle.'}${n.don ? `<br>${n.new ? '<b>New on the latest settle.</b>' : `<b>${n.don}</b> settles in a row, since ${day(n.since)}.`}` : ''}${fl.some(f => OG_ALL.includes(f[1])) ? `<br><span class="lnk golink" data-os="${sym}">See how its flags turned out →</span>` : ''}</div></div>
    <div class="card2"><h4><span>Data</span><span></span></h4><div class="note">Prices to ${day(n.pd)}. Contract-level windows end at the ${day(D.meta.settle)} settle. ${!LADDER && n.k === 'etf' ? 'Funds are judged a little more gently on the washout.' : ''}</div></div>`;
}
function recordNoteL(R) {
  return `<div class="note" style="max-width:1150px">Pre-registered Oct 8 2026, before any outcome was computed: an entry is the first saved settle a name reaches the tier; open interest for settle D publishes the next morning, so the entry price is the <b>close of D+1</b>. Outcomes at +5/+10/+21 sessions and to the latest close, also minus SPY and minus the sector fund; <b>pop</b> = a daily high 10%+ over the entry within 21 sessions; worst drawdown within 21 sessions. Each entry is compared with <b>3 names from the same day that have ladder data and no tier</b> (no washout needed), matched on the 20-day return and the distance from the 52-week high, same kind (stock / fund). Summaries count only entries whose whole window has passed. Settles before ${day(R.live_from)} are backfilled; live entries start at that settle. Names already on the list on the first saved settle (${day(R.first_day)}) have their own section. L is the pattern; B and J are listed alongside.</div>`;
}
async function loadSectors() { if (!SECT) SECT = await getJSON('data/sectors.json'); return SECT; }
async function renderSectors() {
  if (LOUD) return renderSectorsLd();
  if (STEALTH) return renderSectorsS();
  $('#main').innerHTML = `<div class="head">${vintage()}</div><div class="empty">Loading the sectors…</div>`;
  const X = await loadSectors();
  if (S.v !== 'sectors') return;
  const gs = X.sectors || [];
  const chip = (m, t) => `<span class="schip" data-s="${m.s}">${tb(t)} <b>${m.s}</b> ${psPill(m.ps, true)}</span>`;
  const fund = g => { const f = g.fund; if (!f) return `<span class="muted">${g.key === 'FUNDS' ? 'the funds themselves' : g.listed ? 'listed sector · no fund' : 'no sector fund'}</span>`;
    return `<span class="lnk wh" data-s="${g.etf}"><b>${g.etf}</b></span> ${f.ps ? psPill(f.ps, true) : '<span class="muted">price stale</span>'}${f.t ? ' ' + tb(f.t) : ''}<div class="cellsub">${f.dd != null ? Math.round(f.dd * 100) + '% under the high · 20d ' + pc(f.r20, 1) : ''}</div>`; };
  const tot = t => gs.reduce((a, g) => a + g[t].length, 0);
  const intro = `<div class="tiersline" style="margin-top:8px">Where the call ladders are: today's <b>L</b> (call ladder) and <b>B</b> (building) names by GICS sector (Nasdaq-100-only names through their ICB sector), with the sector fund's own price state (same test as the board) and its own tier if it has one. Names outside the GICS map are grouped by their listed sector when one of them has an L, B or J. No washout needed anywhere.</div>`;
  let body;
  if (NARROW()) {
    body = `<div class="scards">${gs.map(g => `<div class="scard"><div class="h"><b>${esc(g.label)}</b><span class="muted num">${g.L.length} L · ${g.B.length} B · ${g.J} J · ${g.n} names</span></div>
      <div class="sf">${fund(g)}</div>${g.L.length || g.B.length ? `<div class="mem">${g.L.map(m => chip(m, 'L')).join('')}${g.B.map(m => chip(m, 'B')).join('')}</div>` : ''}</div>`).join('')}</div>`;
  } else {
    body = `<div class="tw"><table class="bw sect-t"><thead><tr><th>Sector</th><th>Sector fund · its own state</th><th>Call ladders (L) <span class="thsub">${tot('L')} today</span></th><th>Building (B) <span class="thsub">${tot('B')} today</span></th><th class="r">J</th><th class="r">Names <span class="thsub">with ladder data</span></th></tr></thead><tbody>
      ${gs.map(g => `<tr><td><b class="wh">${esc(g.label)}</b></td><td>${fund(g)}</td><td class="wrap">${g.L.map(m => chip(m, 'L')).join('') || '<span class="muted">–</span>'}</td><td class="wrap">${g.B.map(m => chip(m, 'B')).join('') || '<span class="muted">–</span>'}</td><td class="r num">${g.J || '<span class="muted">0</span>'}</td><td class="r num">${g.n.toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`;
  }
  $('#main').innerHTML = `<div class="head">${vintage()}${intro}</div>${body}<div class="foot">Sector = the GICS sector of S&amp;P 500 + Nasdaq-100 members; funds are one group; other names go by their listed sector. Tap a name for its page.</div>`;
}




const ETF_ = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });
const etHM = t => t ? ETF_.format(new Date(t * 1000)).replace(/^24:/, '00:') : '–';
const liveOn = () => false;
const LP = () => null, LD = () => null, LF = () => null;
const isMoving = () => false;

const pdOff = r => r.pd && r.pd !== (pastDay() ? S.d : D.meta.price_day) ? r.pd : null;
function pxTd(r) { const o = pdOff(r); return `${px(r.px)}<br><span class="${(r.r20 || 0) >= 0 ? 'up' : 'dn'}" style="font-size:12px">${pc(r.r20, 1)}</span>${o ? `<div class="cellsub">${day(o)} close</div>` : ''}`; }
function pxCard(r) { const o = pdOff(r); return `<span class="muted num" style="font-size:12px">${px(r.px)} <span class="${(r.r20 || 0) >= 0 ? 'up' : 'dn'}">${pc(r.r20, 1)} 20d</span>${o ? ' · ' + day(o) + ' close' : ''}</span>`; }
const tdc = () => '', cardLive = () => '', liveChips = () => '', liveVint = () => '', liveHead = () => '';
const withTd = cols => cols;
const inLv = () => true;


function renderMain() {
  const fail = e => { $('#main').innerHTML = `<div class="empty">Could not load this view: ${esc(e.message)}</div>`; };
  if (S.v === 'detail' && S.s) return renderDetail().catch(fail);
  if (S.v === 'sectors') return renderSectors().catch(fail);
  if (S.v === 'tide') return renderTide().catch(fail);
  if (S.v === 'record') return renderRecord().catch(fail);
  if (S.v === 'outcomes') return renderOutcomes().catch(fail);
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
  if (t.dataset.os !== undefined) { OST.all = false; return go({ v: 'outcomes', s: null, os: t.dataset.os || null, of: 'all', og: t.dataset.os ? 'all' : S.og }, S.v !== 'outcomes'); }
  if (t.dataset.og || t.dataset.oph || t.dataset.of || t.dataset.omore || t.dataset.ohall || t.dataset.ok) return outcomesClick(t);
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
    if (STATUS.build && STATUS.build !== BUILD) { const y = window.scrollY; await loadBoard(); render(); window.scrollTo(0, y); }
    else if (D) renderBar();
  } catch (e) {  }
}
(async function init() {
  const cur = document.querySelector('.tabs a[aria-current]');
  if (cur) { const nav = cur.parentNode, d = cur.getBoundingClientRect().right - nav.getBoundingClientRect().right;
    if (d > 0) nav.scrollLeft += d + 8; }
  readHash();
  try { STATUS = await getJSON('api/status'); } catch (e) { STATUS = null; }
  try { await loadBoard(); } catch (e) { $('#main').innerHTML = `<div class="empty">Could not load the data (${esc(e.message)}). Try again in a minute.</div>`; return; }
  if (S.d === D.meta.settle) S.d = null;
  if (!TIERS.some(x => x[0] === S.tf)) S.tf = 'list';
  if (LADDER && !PSTATES.some(x => x[0] === S.ps)) S.ps = 'all';
  if (!OGRP.some(g => g[0] === S.og)) S.og = LADDER ? 'L' : 'X';
  if (!LADDER && !['X', 'N'].includes(S.grp)) S.grp = 'X';
  writeHash(false);
  render();
  setInterval(poll, 300000);
})();
