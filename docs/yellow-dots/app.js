

'use strict';
const TFS = ['D', 'W', '2W', 'M'];
const WINS = [['1d', '1D'], ['1w', '1W'], ['2w', '2W'], ['1m', '1M']];
const DEF = { tf: 'all', now: 0, cut: 60, l: 'all', c: 'any', o: 'biz', od: -1, q: '', s: '' };
const S = Object.assign({}, DEF);
let B = null, M = null, built = null, VIEW = [];
const NAMES = {};
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PHONE = () => window.matchMedia('(max-width:900px)').matches;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = iso => { if (!iso) return '–'; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return MON[m - 1] + ' ' + d; };
const exd = e => { const y = 2000 + +e.slice(0, 2), m = +e.slice(2, 4), d = +e.slice(4, 6), cy = M ? +M.report_day.slice(0, 4) : y;
  return MON[m - 1] + ' ' + d + (y !== cy ? ` '${String(y).slice(2)}` : ''); };
function kf(v) {
  const a = Math.abs(v);
  const s = a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e5 ? (a / 1e3).toFixed(0) + 'k' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'k' : a >= 1e3 ? (a / 1e3).toFixed(2) + 'k' : a.toFixed(0);
  return (v < 0 ? '−' : '') + s;
}
const sg = v => (v >= 0 ? '+' : '−') + kf(Math.abs(v)).replace('−', '');
const cap = v => !v ? '' : v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e11 ? '$' + (v / 1e9).toFixed(0) + 'B' : '$' + (v / 1e9).toFixed(1) + 'B';
const pc = (v, d = 0) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d) + '%';
const bizCls = v => v >= 70 ? 'hi' : v >= 50 ? 'mid' : 'lo';


function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(DEF)) {
    if (!p.has(k)) { S[k] = DEF[k]; continue; }
    const v = p.get(k);
    S[k] = typeof DEF[k] === 'number' ? (Number.isFinite(+v) ? +v : DEF[k]) : v;
  }
  if (!['all', ...TFS].includes(S.tf)) S.tf = 'all';
  if (![50, 60, 70].includes(S.cut)) S.cut = 60;
  if (!['all', 'spx', 'ndx', 'rui', 'ai'].includes(S.l)) S.l = 'all';
  if (!['any', 'top10', 'build'].includes(S.c)) S.c = 'any';
  if (!Object.prototype.hasOwnProperty.call(SORTS, S.o)) S.o = 'biz';
  S.od = S.od === 1 ? 1 : -1; S.now = S.now ? 1 : 0;
  S.q = (S.q || '').toUpperCase().replace(/[^A-Z0-9.\- ]/g, '').slice(0, 24);
  S.s = (S.s || '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').slice(0, 12);
}
function hashStr() {
  const p = new URLSearchParams();
  for (const k of Object.keys(DEF)) if (S[k] !== DEF[k] && S[k] !== '') p.set(k, S[k]);
  const h = p.toString();
  return h ? '#' + h : location.pathname + location.search;
}
function writeHash() { history.replaceState(null, '', hashStr()); }
const cleanQ = v => (v || '').toUpperCase().replace(/[^A-Z0-9.\- ]/g, '').trim().slice(0, 24);
const isSoon = e => !!e && !!M && e >= M.report_day && (Date.parse(e) - Date.parse(M.report_day)) / 864e5 <= 7;
const oldPx = r => !!(r && r.pxd && M && M.px_prev && r.pxd < M.px_prev);
const STACKED = () => !PHONE() && window.matchMedia('(max-width:1499px)').matches;



const GH = /(^|\.)github\.io$/i.test(location.hostname);
const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/yellow-dots-data/yellow-dots/';
let BASE = GH ? RAW : 'snap/', MAN = null;
async function fetchJSON(url) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 10000);
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
  if (!m) { status('err', 'not published yet'); return false; }
  MAN = m;
  const b = await getJSON('yellow-dots.json');
  if (!b) { status('err', 'not published yet'); return false; }
  B = b; M = b.meta; built = m.sha256 + m.names_sha256;
  for (const k in NAMES) delete NAMES[k];
  return true;
}
function fmtBuilt() {
  const t = MAN && Date.parse(MAN.generated_utc);
  if (!t) return '–';
  const o = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return `${new Date(t).toLocaleString('en-US', Object.assign({ timeZone: 'America/New_York' }, o))} ET (${new Date(t).toLocaleString([], o)} your time)`;
}
function status(cls, txt) {
  const el = $('#status');
  el.querySelector('b').className = cls || '';
  el.querySelector('span').textContent = txt;
}


function pass(r) {
  if (r.biz < S.cut) return false;
  if (S.now && !r.now.length) return false;
  if (S.tf !== 'all' && !(r.now.includes(S.tf) || (!S.now && r.rec.includes(S.tf)))) return false;
  if (S.l === 'ai' ? !r.ai : S.l !== 'all' && !r.idx.includes(S.l)) return false;
  if (S.c === 'top10' && !r.top10) return false;
  if (S.c === 'build' && !(r.w1 && r.w1[2] === 'C')) return false;
  if (S.q && !(r.s.startsWith(S.q) || (r.n || '').toUpperCase().includes(S.q))) return false;
  return true;
}
const stripScore = r => WINS.reduce((a, [k]) => { const x = r.strip[k] || []; return a + ({ C: 1, P: -1 }[x[0]] || 0) + (x[1] ? (x[1][0] === 'C' ? 2 : -2) : 0); }, 0);
const SORTS = {
  s: [r => r.s, 1], dots: [r => r.now.length * 10 + r.rec.length, -1], biz: [r => r.biz, -1], cp: [r => r.sh, -1],
  b1w: [r => r.w1 ? (r.w1[0] - r.w1[1]) / Math.max(Math.abs(r.w1[0]) + Math.abs(r.w1[1]), 1) : null, -1], skew: [stripScore, -1],
  king: [r => r.kt && r.kt.pct != null ? r.kt.pct : null, -1], off: [r => r.off, 1],
};
function view() {
  const [f] = SORTS[S.o];
  const rows = B.rows.filter(pass);
  rows.sort((a, b) => {
    const x = f(a), y = f(b), nx = x == null, ny = y == null;
    const c = nx || ny ? (nx === ny ? 0 : nx ? 1 : -1) : (x < y ? -1 : x > y ? 1 : 0) * S.od;
    return c || b.biz - a.biz || (a.s < b.s ? -1 : 1);
  });
  return rows;
}


const share = c => c[0] / Math.max(c[0] + c[1], 1);
const wk = c => c[2] == null || c[3] == null ? null : c[2] / Math.max(c[2] + c[3], 1);
function cpLab(c) {
  const sh = share(c), x = sh >= .5 ? c[0] / Math.max(c[1], 1) : c[1] / Math.max(c[0], 1), t = x >= 9.95 ? x.toFixed(0) : x.toFixed(1);
  return sh >= .55 ? `<b class="up">${t}× calls</b>` : sh <= .45 ? `<b class="dn">${t}× puts</b>` : `<b class="cpe">${t}× even</b>`;
}
function cpBar(c, cls = '') {
  const sh = share(c), w = wk(c);
  return `<i class="cpb ${cls}"><b style="width:${(sh * 100).toFixed(1)}%"></b><em></em>${w == null ? '' : `<s style="left:${(w * 100).toFixed(1)}%"></s>`}</i>`;
}
const badge = r => r.top10 ? '<span class="badge10 c" title="top 10% of stocks for calls share">TOP 10%</span>' : r.bot10 ? '<span class="badge10 p" title="bottom 10% of stocks for calls share">BTM 10%</span>' : '';
function cpTip(r) {
  const c = r.cp;
  return `${kf(c[0])} calls vs ${kf(c[1])} puts open (${md(r.asof)} settle${r.stale ? ', an older book' : ''}), ${Math.round(share(c) * 100)}% calls` +
    (r.shp != null ? `, more call-heavy than ${Math.round(r.shp)}% of ${M.share.n.toLocaleString()} stocks` : '');
}
function cpCell(r) {
  if (!r.cp) return '<span class="muted sm">no saved chain</span>';
  return `<div class="cp${r.stale ? ' stale' : ''}" title="${esc(cpTip(r))}"><div class="cpt">${cpLab(r.cp)}${r.stale ? `<span class="asof">${md(r.asof)}</span>` : ''}</div>${cpBar(r.cp)}${r.top10 || r.bot10 ? `<div class="b10">${badge(r)}</div>` : ''}</div>`;
}
function bizCell(v, wide) {
  return `<span class="bz ${bizCls(v)}${wide ? ' wide' : ''}"><i><b style="width:${v}%"></b></i><span class="num">${v}</span></span>`;
}
function dotsCell(r, big) {
  return `<span class="ydots${big ? ' big' : ''}">` + TFS.map(tf => {
    const cls = r.now.includes(tf) ? 'now' : r.rec.includes(tf) ? 'rec' : 'off';
    const tip = { now: 'dot on the last finished candle', rec: 'dot 1–2 candles ago', off: 'no dot' }[cls];
    return `<span class="yc ${cls}" title="${tf} ${tip}">${tf}<i></i></span>`;
  }).join('') + '</span>';
}
const listTag = rk => rk ? `<span class="sktag ${rk[0] === 'C' ? 'c' : 'p'}" title="on Skew Tracker's 1W ${rk[0] === 'C' ? 'call' : 'put'} list, #${rk[1]} of ${rk[2]}">${rk[0] === 'C' ? 'Call' : 'Put'} list #${rk[1]}</span>` : '';
function splitBar(nC, nP, cls = '') {
  const c = Math.max(nC || 0, 0), p = Math.max(nP || 0, 0);
  if (!c && !p) return `<i class="spb none ${cls}" title="no contracts added"></i>`;
  return `<i class="spb ${cls}"><b style="width:${(100 * c / (c + p)).toFixed(1)}%"></b><em></em></i>`;
}
function buildCell(r) {
  const rk = (r.strip['1w'] || [])[1];
  if (!r.w1) return rk ? listTag(rk) : '<span class="muted sm">–</span>';
  const [nC, nP, , have, need] = r.w1, W1 = M.windows['1w'] || {}, to = r.asof && r.asof < W1.to ? r.asof : W1.to;
  const span = `${md(W1.frm)}–${md(to)} settles${have != null && need != null && have < need ? `, ${have} of ${need}` : ''}`;
  return `<div class="bld" title="last week (${span}): ${sg(nC)} calls, ${sg(nP)} puts added">` +
    `<div class="bldt"><span class="up">${sg(nC)} C</span><span class="dn">${sg(nP)} P</span></div>` +
    `${splitBar(nC, nP)}${listTag(rk)}</div>`;
}
function stripCell(r) {
  return '<span class="strip">' + WINS.map(([k, lab]) => {
    const [sd, rk] = r.strip[k] || [];
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
function kingTip(r) {
  const k = r.kt, n = k.neg;
  return `King ${k.k} (${k.exp ? exd(k.exp) : '?'}${k.dte != null ? ', ' + k.dte + 'd' : ''}) ${k.d == null ? '' : pc(k.d, 1) + ' from price'}` +
    (k.sig != null ? `, ${k.sig.toFixed(2)}σ` : '') + (k.v != null ? ` · ${mUSD(k.v)}` : '') +
    (k.share != null ? ` · ${Math.round(k.share * 100)}% of the map` : '') + (k.dom != null ? `, ${k.dom.toFixed(1)}× the next strike` : '') +
    (k.held != null ? ` · same strike ${k.held} session${k.held === 1 ? '' : 's'}${k.since ? ' (since ' + md(k.since) + ')' : ''}` : '') +
    (k.pct != null ? ` · stronger than ${Math.round(k.pct)}% of ${M.king_n.toLocaleString()} tracked names` : '') +
    (k.add != null ? ` · ${sg(k.add)} contracts at the king over the last week of settles${k.fresh != null ? ', ' + Math.round(k.fresh * 100) + '% new' : ''}` : '') +
    (n ? ` · put cluster ${n.k} (${n.d == null ? '?' : pc(n.d, 1)}) ${mUSD(n.v)}${k.outweigh ? ', bigger than the king' : ''}` : '') +
    ` · map ${md(k.day)}`;
}
function kingChips(k) {
  return (k.build ? `<span class="kchip fresh" title="fresh build: open interest piling up at the king contract over the last week of settles, with a large part of it new">FRESH</span>` : '') +
    (k.outweigh ? `<span class="kchip outw" title="the put-heavy cluster at ${k.neg.k} (${mUSD(k.neg.v)}) carries more gamma than the king (${mUSD(k.v)})">PUTS &gt; KING</span>` : '');
}
function kingCell(r) {
  const k = r.kt;
  if (!k) return '<span class="muted" title="no current king on the King GEX Tracker">–</span>';
  const ch = kingChips(k);
  return `<div class="kg" title="${esc(kingTip(r))}"><div class="kgt"><span class="lv k">${k.k} <small>${k.d == null ? '' : pc(k.d)}</small></span><span class="kh">${k.held != null ? 'held ' + k.held : ''}</span></div>` +
    (k.pct == null ? '' : `<div class="kgs"><i class="kpb ${kpCls(k.pct)}"><b style="width:${k.pct}%"></b></i><span class="kpn ${kpCls(k.pct)}">${ord(k.pct)}</span></div>`) +
    (ch ? `<div class="kgc">${ch}</div>` : '') + '</div>';
}
function kingCard(r) {
  const k = r.kt;
  if (!k) return '';
  const n = k.neg;
  const rows = [
    ['King', `<b>${k.k}</b> ${k.exp ? exd(k.exp) : ''}${k.dte != null ? ' (' + k.dte + 'd)' : ''} · <span class="${(k.d || 0) >= 0 ? 'up' : 'dn'}">${k.d == null ? '' : pc(k.d, 1)}</span>${k.sig != null ? ' · ' + k.sig.toFixed(2) + 'σ away' : ''}`],
    ['Strength', k.pct == null ? '–' : `<span class="kgs inl"><i class="kpb ${kpCls(k.pct)}"><b style="width:${k.pct}%"></b></i><span class="kpn ${kpCls(k.pct)}">${ord(k.pct)}</span></span> of ${M.king_n.toLocaleString()} names · ${k.v != null ? mUSD(k.v) : '–'} · ${k.share != null ? Math.round(k.share * 100) + '% of the map' : ''}${k.dom != null ? ', ' + k.dom.toFixed(1) + '× next' : ''}`],
    ['Held', k.held == null ? '–' : `${k.held} session${k.held === 1 ? '' : 's'} on this strike${k.since ? ' (since ' + md(k.since) + ')' : ''}${k.setup ? ' · ' + esc(k.setup.toLowerCase()) : ''}`],
    ['Build', k.add == null ? 'no history at the king contract' : `${sg(k.add)} contracts over the last week of settles${k.fresh != null ? ', ' + Math.round(k.fresh * 100) + '% new' : ''}${k.build ? ' <span class="kchip fresh">FRESH</span>' : ''}`],
    ['Put cluster', !n ? 'none on the map' : `<b>${n.k}</b> <span class="${(n.d || 0) >= 0 ? 'up' : 'dn'}">${n.d == null ? '' : pc(n.d, 1)}</span> · ${mUSD(n.v)}${k.outweigh ? ' <span class="kchip outw">BIGGER THAN THE KING</span>' : ' · smaller than the king'}`],
  ].map(([a, b]) => `<span class="kl">${a}</span><span>${b}</span>`).join('');
  return `<div class="card2"><h4><span>King GEX</span><span class="muted">King GEX Tracker · map ${md(k.day)}${k.eve ? ' (evening build)' : ''}</span></h4><div class="kcard">${rows}</div></div>`;
}


const COLS = [['', null, ''], ['Name', 's', ''], ['Yellow dots<small>D · W · 2W · M</small>', 'dots', ''], ['Business', 'biz', ''],
  ['Calls : puts held<small>open contracts, all expiries</small>', 'cp', ''], ['New positions 1W<small>calls · puts added</small>', 'b1w', ''],
  ['Skew by window<small>green calls · red puts</small>', 'skew', ''], ['King GEX<small>strength vs all names</small>', 'king', ''], ['From high', 'off', 'r c-off']];
function renderBoard() {
  VIEW = view();
  const head = COLS.map(([t, k, cls]) => {
    const on = k && S.o === k;
    return `<th class="${cls}${on ? ' sorted' : ''}"${k ? ` data-o="${k}"` : ''}>${t.replace(/<small>/, (on ? (S.od < 0 ? ' ▼' : ' ▲') : '') + '<small>')}${!t.includes('<small>') && on ? (S.od < 0 ? ' ▼' : ' ▲') : ''}</th>`;
  }).join('');
  const rep = M.report_day;
  const body = VIEW.map((r, i) => {
    return `<tr data-s="${esc(r.s)}" class="${r.s === S.s ? 'sel' : ''}"><td class="muted">${i + 1}</td>
<td><div class="nm"><b>${esc(r.s)}</b></div><div class="sub" title="${esc([r.n, r.ind || r.sec].filter(Boolean).join(' · '))}">${esc([r.n, r.sec].filter(Boolean).join(' · '))}</div></td>
<td>${dotsCell(r)}</td><td>${bizCell(r.biz)}</td><td>${cpCell(r)}</td><td>${buildCell(r)}</td><td>${stripCell(r)}</td><td>${kingCell(r)}</td>
<td class="r num c-off ${oldPx(r) ? 'old' : (r.off || 0) < -0.3 ? 'dn' : ''}"${oldPx(r) ? ` title="from the ${md(r.pxd)} close"` : ''}>${r.off == null ? '–' : Math.round(r.off * 100) + '%'}${oldPx(r) ? `<span class="asof">${md(r.pxd)}</span>` : ''}</td></tr>`;
  }).join('');
  const cards = VIEW.map((r, i) => `<div class="pc${r.s === S.s ? ' sel' : ''}" data-s="${esc(r.s)}">
<div class="pr1"><span class="muted">${i + 1}</span> <b>${esc(r.s)}</b>${dotsCell(r)}</div>
<div class="sub">${esc([r.n, r.off == null ? '' : Math.round(r.off * 100) + '% from high' + (oldPx(r) ? ' (' + md(r.pxd) + ' close)' : '')].filter(Boolean).join(' · '))}</div>
<div class="duo"><div class="pbx"><div class="pk">Business</div><div class="bzn ${bizCls(r.biz)}">${r.biz}</div>${bizCell(r.biz, true)}</div>
<div class="pbx"><div class="pk">Calls : puts</div>${r.cp ? `<div class="cpt">${cpLab(r.cp)}</div>${cpBar(r.cp, 'wide')}${r.top10 || r.bot10 ? `<div style="margin-top:5px">${badge(r)}</div>` : ''}` : '<span class="muted sm">no saved chain</span>'}</div></div>
<div class="pr3">${stripCell(r)}<span class="sp"></span>${buildCell(r)}</div>${r.kt ? `<div class="pr4"><span class="pk">King</span>${kingCell(r)}</div>` : ''}</div>`).join('');
  $('#lst').innerHTML = VIEW.length ? `<table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><div class="cards">${cards}</div>`
    : `<table class="tbl"><thead><tr>${head}</tr></thead></table><div class="nores">No names match these filters.</div>`;
  renderTiles();
}
function renderTiles() {
  const v = VIEW, nNow = {}, nRec = {};
  TFS.forEach(tf => { nNow[tf] = v.filter(r => r.now.includes(tf)).length; nRec[tf] = v.filter(r => r.rec.includes(tf) && !r.now.includes(tf)).length; });
  const t10 = v.filter(r => r.top10).length, b10 = v.filter(r => r.bot10).length, noc = v.filter(r => !r.cp).length;
  const bc = v.filter(r => r.w1 && r.w1[2] === 'C').length, bp = v.filter(r => r.w1 && r.w1[2] === 'P').length;
  const onl = v.filter(r => Object.values(r.strip).some(x => x[1] && x[1][0] === 'C')).length;
  const sh = M.share, w = M.windows['1w'] || {}, bo = M.bar_of || {};
  const asofs = {}; v.forEach(r => { if (r.asof) asofs[r.asof] = (asofs[r.asof] || 0) + 1; });
  const settles = Object.keys(asofs).sort().reverse().map(d => `<b>${md(d)}</b>${Object.keys(asofs).length > 1 ? ' (' + asofs[d] + ')' : ''}`).join(' · ');
  const kd = {}; v.forEach(r => { if (r.kt && r.kt.day) kd[r.kt.day] = (kd[r.kt.day] || 0) + 1; });
  const kday = Object.keys(kd).sort((x, y) => kd[y] - kd[x] || (x < y ? 1 : -1))[0];
  const sortName = { biz: 'business', s: 'ticker', dots: 'dots', cp: 'calls share', b1w: 'last week’s calls tilt', skew: 'skew windows', king: 'king strength', off: 'from high' }[S.o];
  $('#tiles').innerHTML = `
<div class="tile"><div class="k">Yellow dots, business ${S.cut}+</div><div class="v">${v.length} <small>of ${M.n_dotted} with a dot</small></div>
 <div class="s"><b>${v.filter(r => r.biz >= 70).length}</b> at 70+ · sorted by ${sortName}<br>Kings 80th+: <b>${v.filter(r => r.kt && r.kt.pct >= 80).length}</b> · fresh <b>${v.filter(r => r.kt && r.kt.build).length}</b> · puts &gt; king <b>${v.filter(r => r.kt && r.kt.outweigh).length}</b></div></div>
<div class="tile"><div class="k">Dots on the last candle</div><div class="v tfv">${TFS.map(tf => `<span><em>${tf}</em> ${nNow[tf]}</span>`).join('')}</div>
 <div class="s">+ 1–2 candles ago: ${TFS.map(tf => `${tf} <b>${nRec[tf]}</b>`).join(' · ')}</div></div>
<div class="tile"><div class="k">Calls : puts held</div><div class="v"><span class="up">${t10}</span> <small>top 10% calls</small> · <span class="dn">${b10}</span> <small>bottom 10%</small></div>
 <div class="s">Top 10% = <b>${Math.round(sh.p90 * 100)}%+</b> calls, bottom = <b>${Math.round(sh.p10 * 100)}%</b> or less (${sh.n.toLocaleString()} stocks, median ${Math.round(sh.p50 * 100)}%)${noc ? ` · ${noc} with no saved chain` : ''}</div></div>
<div class="tile"><div class="k">New positions, last week</div><div class="v"><span class="up">${bc}</span> <small>more calls</small> · <span class="dn">${bp}</span> <small>more puts</small></div>
 <div class="s">${md(w.frm)}–${md(w.to)} settles · <b>${onl}</b> on a Skew Tracker call list</div></div>
<div class="tile"><div class="k">Data</div><div class="v sm2">${md(M.report_day)} close</div>
 <div class="s">Options ${settles || '–'} settle · business <b>${md(M.biz_day)}</b>${kday ? ` · kings <b>${md(kday)}</b>` : ''}<br>W ${md((bo.W || [])[0])}–${md((bo.W || [])[1])} · 2W ${md((bo['2W'] || [])[0])}–${md((bo['2W'] || [])[1])} · M ${(bo.M || [''])[1] ? MON[+bo.M[1].slice(5, 7) - 1] : '–'}</div></div>`;
}
function renderFoot() {
  const ex = M.excluded || [];
  $('#foot').innerHTML = `Names: the yellow-dots report for the ${md(M.report_day)} close (S&amp;P 500, Nasdaq-100 and Russell 1000 names with a dot on the last finished candle, plus AI-basket names dotted 1–2 candles ago), business score ${M.min_biz}+.` +
    (ex.length ? ` Mortgage REITs left out: ${ex.map(e => `${esc(e[0])}${e[1] != null ? ' ' + e[1] : ''}`).join(', ')}.` : '') +
    ` Calls : puts = open contracts at every strike and expiry, new positions = contracts added (Skew Tracker); king = King GEX Tracker. Updated ${fmtBuilt()}.`;
}
function syncChips() {
  document.querySelectorAll('#bar .grp').forEach(g => {
    const k = g.dataset.k;
    g.querySelectorAll('.chip[data-v]').forEach(c => c.classList.toggle('on', String(S[k]) === c.dataset.v));
  });
  const t = document.querySelector('.chip[data-t="now"]'); if (t) t.classList.toggle('on', !!S.now);
  const q = $('#q'); if (document.activeElement !== q) q.value = S.q;
}


function chartSVG(r, n) {
  const bars = (n.bars || []).map(b => [b[0], b[1] == null ? b[3] : b[1], b[2] == null ? b[3] : b[2], b[3]]);
  if (!bars || bars.length < 5) return '<div class="muted sm">no price history</div>';
  const W = 560, H = 340, PL = 8, PR = W - 58, PT = 14, LH = 13, LANE0 = H - 24 - 4 * LH, PB = LANE0 - 10;
  const N = bars.length - 1, B1 = bars.slice(1);
  let lo = Math.min(...B1.map(b => b[2])), hi = Math.max(...B1.map(b => b[1]));
  const lv = [];
  const K = r.kt ? { k: r.kt.k, n: r.kt.neg && r.kt.neg.k } : {};
  if (K.k != null) lv.push([K.k, 'king']);
  if (K.n != null) lv.push([K.n, 'neg']);
  lv.forEach(([v]) => { if (v >= lo * .85 && v <= hi * 1.15) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
  const pad = (hi - lo) * .06; lo -= pad * 1.5; hi += pad;
  const step = (PR - PL) / N, x = j => PL + step * (j + .5), y = v => PT + (hi - v) / (hi - lo) * (PB - PT);
  const s = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="ch">`];
  const rng = hi - lo; let st = Math.pow(10, Math.floor(Math.log10(rng / 5)));
  for (const m of [1, 2, 5, 10]) if (rng / (st * m) <= 6) { st *= m; break; }
  for (let v = Math.ceil(lo / st) * st; v <= hi; v += st)
    s.push(`<line x1="${PL}" x2="${PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#1f2430"/><text x="${PR + 6}" y="${(y(v) + 4).toFixed(1)}" class="ax">${+v.toFixed(6)}</text>`);
  let lm = null;
  B1.forEach((b, j) => { const m = +b[0].slice(5, 7); if (m !== lm) { if (lm !== null) s.push(`<text x="${x(j).toFixed(1)}" y="${H - 8}" class="ax" text-anchor="middle">${MON[m - 1]}</text>`); lm = m; } });
  const idx = {}; B1.forEach((b, j) => { idx[b[0]] = j; });
  const jOf = d => { let k = null; for (let j = 0; j < B1.length; j++) { if (B1[j][0] <= d) k = j; else break; } return k; };

  TFS.forEach(tf => (n.spans[tf] || []).filter(sp => sp[2] === 0).forEach(sp => {
    const j0 = Math.max(0, jOf(sp[0]) ?? 0), j1 = jOf(sp[1]); if (j1 == null) return;
    s.push(`<rect x="${(x(j0) - step / 2).toFixed(1)}" y="${PT}" width="${(step * (j1 - j0 + 1)).toFixed(1)}" height="${PB - PT}" fill="#e3b341" opacity=".08"/>`);
  }));
  B1.forEach((b, j) => {
    const p = bars[j][3], up = b[3] >= p, col = up ? '#26a69a' : '#ef5350', y1 = y(Math.max(p, b[3])), y2 = y(Math.min(p, b[3]));
    s.push(`<line x1="${x(j).toFixed(1)}" x2="${x(j).toFixed(1)}" y1="${y(b[1]).toFixed(1)}" y2="${y(b[2]).toFixed(1)}" stroke="${col}"/><rect x="${(x(j) - step * .36).toFixed(1)}" y="${y1.toFixed(1)}" width="${(step * .72).toFixed(1)}" height="${Math.max(y2 - y1, .8).toFixed(1)}" fill="${col}"/>`);
  });
  const last = B1[B1.length - 1][3];
  lv.forEach(([v, kind]) => {
    const col = kind === 'king' ? '#f5d63d' : '#ef5350', lab = (kind === 'king' ? 'King ' : '− king ') + v, d = v / last - 1;
    if (v >= lo && v <= hi) s.push(`<line x1="${PL}" x2="${PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="${col}" stroke-dasharray="5 3" stroke-width="1.2" opacity=".85"/><text x="${PL + 4}" y="${(y(v) - 4).toFixed(1)}" class="lvl" fill="${col}">${lab} · ${pc(d)}</text>`);
    else { const yy = v > hi ? PT + 2 : PB - 18;
      s.push(`<rect x="${PR - 150}" y="${yy}" width="146" height="17" rx="3" fill="#131722" stroke="${col}" stroke-opacity=".6"/><text x="${PR - 77}" y="${yy + 12.5}" class="lvl" fill="${col}" text-anchor="middle">${v > hi ? '↑' : '↓'} ${lab} · ${pc(d)}</text>`); }
  });

  const first = B1[0][0];
  TFS.forEach((tf, i) => {
    const yy = LANE0 + 6 + i * LH;
    s.push(`<line x1="${PL}" x2="${PR}" y1="${yy}" y2="${yy}" stroke="#1f2430"/><text x="${PR + 6}" y="${yy + 3.5}" class="ydl">${tf}</text>`);
    (n.spans[tf] || []).filter(sp => sp[1] >= first).forEach(sp => {
      const j0 = Math.max(0, jOf(sp[0]) ?? 0), j1 = jOf(sp[1]); if (j1 == null) return;
      s.push(`<line x1="${(x(j0) - step * .4).toFixed(1)}" x2="${(x(j1) + step * .4).toFixed(1)}" y1="${yy}" y2="${yy}" stroke="#e3b341" stroke-width="2" opacity=".55"/><circle cx="${x(j1).toFixed(1)}" cy="${yy}" r="${sp[2] === 0 ? 4.6 : 3.6}" fill="#e3b341"${sp[2] === 0 ? ' stroke="#fff" stroke-width="1"' : ''}><title>${tf} dot · ${md(sp[0])}${sp[0] !== sp[1] ? '–' + md(sp[1]) : ''}</title></circle>`);
    });
  });
  s.push(`<line x1="${PL}" x2="${PR}" y1="${PB + 4}" y2="${PB + 4}" stroke="#2a2e39"/>`);
  s.push(`<g class="hov"></g><rect class="hit" x="${PL}" y="${PT}" width="${PR - PL}" height="${PB - PT}" fill="transparent"/></svg>`);
  return s.join('');
}
function chartHover(el, n) {
  const svg = el.querySelector('svg.ch'); if (!svg) return;
  const B1 = n.bars.slice(1), W = 560, PL = 8, PR = W - 58, step = (PR - PL) / B1.length, g = svg.querySelector('.hov');
  svg.querySelector('.hit').addEventListener('mousemove', e => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const j = Math.max(0, Math.min(B1.length - 1, Math.floor((p.x - PL) / step))), b = B1[j], xx = PL + step * (j + .5);
    const tx = xx > (PL + PR) / 2 ? xx - 128 : xx + 8;
    g.innerHTML = `<line x1="${xx}" x2="${xx}" y1="14" y2="${340 - 24 - 52 - 10}" stroke="#787b86" stroke-dasharray="2 2"/><rect x="${tx}" y="16" width="120" height="34" rx="3" fill="#131722" stroke="#363a45"/><text x="${tx + 7}" y="30" class="ax" style="fill:#d1d4dc">${md(b[0])} · ${b[3]}</text><text x="${tx + 7}" y="44" class="ax">${b[1] == null ? 'close only' : 'H ' + b[1] + ' · L ' + b[2]}</text>`;
  });
  svg.querySelector('.hit').addEventListener('mouseleave', () => { g.innerHTML = ''; });
}
function optsSVG(n) {
  const sr = (n.series || []).filter(e => e[1] != null && e[2] != null);
  if (sr.length < 3) return '';
  const W = 560, H = 124, PL = 8, PR = W - 58, B0 = 8, B1 = H - 22, N = sr.length, step = (PR - PL) / N, x = j => PL + step * (j + .5);
  const mx = Math.max(1, ...sr.map(e => Math.max(e[1] || 0, e[2] || 0))), zm = (B0 + B1) / 2, hb = (B1 - B0) / 2;
  const s = [`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="oc">`];
  s.push(`<line x1="${PL}" x2="${PR}" y1="${zm}" y2="${zm}" stroke="#363a45"/><text x="${PR + 6}" y="${B0 + 8}" class="ax">calls</text><text x="${PR + 6}" y="${B1}" class="ax">puts</text>`);
  sr.forEach((e, j) => {
    const c = Math.max(e[1] || 0, 0), p = Math.max(e[2] || 0, 0), w = Math.max(step * .62, 1), tip = `${md(e[0])}: ${sg(e[1])} calls, ${sg(e[2])} puts added`;
    if (c) s.push(`<rect x="${(x(j) - w / 2).toFixed(1)}" y="${(zm - hb * c / mx).toFixed(1)}" width="${w.toFixed(1)}" height="${(hb * c / mx).toFixed(1)}" fill="#26a69a"><title>${tip}</title></rect>`);
    if (p) s.push(`<rect x="${(x(j) - w / 2).toFixed(1)}" y="${zm}" width="${w.toFixed(1)}" height="${(hb * p / mx).toFixed(1)}" fill="#c2484a"><title>${tip}</title></rect>`);
  });
  [0, Math.floor((N - 1) / 2), N - 1].forEach(j => s.push(`<text x="${x(j).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="middle">${md(sr[j][0])}</text>`));
  s.push('</svg>');
  return `<div class="card2"><h4><span>Contracts added by settle</span><span class="muted">calls up · puts down</span></h4>${s.join('')}</div>`;
}
function cpCard(r) {
  if (!r.cp) return `<div class="card2"><h4><span>Calls : puts held</span></h4><div class="muted sm">No saved option chain for this name.</div></div>`;
  const c = r.cp;
  return `<div class="card2"><h4><span>Calls : puts held</span><span class="muted">${md(r.asof)} settle</span></h4>
<div class="cpbig"><span class="r">${cpLab(c)}${badge(r)}</span>${cpBar(c, 'wide')}</div>
<div class="txt"><b>${kf(c[0])}</b> calls vs <b>${kf(c[1])}</b> puts open, ${Math.round(share(c) * 100)}% calls${r.shp != null ? ` — more call-heavy than <b>${Math.round(r.shp)}%</b> of ${M.share.n.toLocaleString()} stocks` : ''}.</div></div>`;
}
const BIZLAB = { rev_yoy: 'Revenue YoY', eps_yoy: 'EPS YoY', peg: 'PEG', fcf_growth: 'FCF growth', fcf_margin: 'FCF margin', rev_qoq: 'Revenue QoQ' };
function bizCard(r, n) {
  const m = {}; (n.bizm || []).forEach(x => { m[x[0]] = x; });
  const rows = ['rev_yoy', 'eps_yoy', 'peg', 'fcf_growth', 'fcf_margin', 'rev_qoq'].filter(k => m[k]).map(k => {
    const p = m[k][2];
    const val = k === 'peg' && n.peg_note ? (n.peg_note === 'loss' ? 'loss' : 'EPS falling') : '';
    return `<span>${BIZLAB[k]}</span><span class="num r">${val}</span><i class="pbar"><b class="${p == null ? 'lo' : bizCls(p)}" style="width:${p == null ? 0 : p}%"></b></i><span class="num r">${p == null ? '–' : Math.round(p)}</span>`;
  }).join('');
  return `<div class="card2"><h4><span>Business</span>${bizCell(r.biz)}</h4>${rows ? `<div class="bzgrid">${rows}</div><div class="note">Each line = its percentile against the S&amp;P 500 + Nasdaq-100.</div>` : '<div class="muted sm">No breakdown for this name.</div>'}</div>`;
}
function buildCard(n) {
  const rows = WINS.map(([k, lab]) => {
    const w = n.win[k], rk = (n.ranks || {})[k];
    if (!w) return `<span class="wl">${lab}</span><span class="muted sm" style="grid-column:span 4">${rk ? `#${rk[1]} on the ${lab} ${rk[0] === 'C' ? 'call' : 'put'} list` : 'not enough sessions'}</span>`;
    const side = w.side === 'C' ? '<span class="up">calls</span>' : w.side === 'P' ? '<span class="dn">puts</span>' : '<span class="muted">no clear side</span>';
    if (w.aC == null || w.aP == null) return `<span class="wl">${lab}</span><span class="muted sm" style="grid-column:span 3">contract counts start later than this window</span><span class="r sm">${side}${rk ? ` · ${rk[0] === 'C' ? 'call' : 'put'} list #${rk[1]}` : ''}</span>`;
    return `<span class="wl">${lab}</span><span class="num r up">${sg(w.aC)}</span>${splitBar(w.aC, w.aP, 'wide')}<span class="num dn">${sg(w.aP)}</span><span class="r sm">${side}${rk ? ` · ${rk[0] === 'C' ? 'call' : 'put'} list #${rk[1]}` : ''}</span>`;
  }).join('');
  const w1 = M.windows['1w'] || {}, m1 = M.windows['1m'] || {};
  return `<div class="card2"><h4><span>New positions by window</span><span class="muted">calls added · puts added</span></h4><div class="bgrid">${rows}</div>
<div class="note">1W = ${md(w1.frm)}–${md(w1.to)} settles · 1M from ${md(m1.frm)}. Added = contracts opened over the window's settles; the side is the Skew Tracker's read.</div></div>`;
}
function movesCard(n) {
  const mv = (n.moves || []).slice(0, 4);
  if (!mv.length) return '';
  const rows = mv.map(([d, ...ls]) => `<span class="d">${md(d)}</span><span class="ln">${ls.slice(0, 4).map(l =>
    `<span class="${l[3] < 0 ? 'x' : l[1] === 'C' ? 'c' : 'p'}">${exd(l[0])} ${l[2]}${l[1]} ${sg(l[3])}</span>`).join('')}</span>`).join('');
  return `<div class="card2"><h4><span>Biggest new positions</span><span class="muted">by settle · expiry strike side, net contracts</span></h4><div class="mv">${rows}</div></div>`;
}
const KDJLAB = { GOLDEN: 'GC', COIL: 'coil', UP: 'up', DOWN: 'dn' };
function kdjRow(r) {
  return TFS.map(t => { const st = r.kdj[t]; return `<span class="kd ${st || ''}" title="${t} KDJ ${st || 'n/a'}">${t} ${KDJLAB[st] || '–'}</span>`; }).join('');
}
async function renderDet() {
  const el = $('#det');
  let r = VIEW.find(x => x.s === S.s) || B.rows.find(x => x.s === S.s);
  if (!r && !PHONE()) r = VIEW[0];
  const inView = !!r && VIEW.includes(r);
  document.body.classList.toggle('det', !!(r && S.s && PHONE()));
  if (!r) { el.innerHTML = `<div class="empty">${S.s && !PHONE() ? esc(S.s) + ' is not on the board.' : 'Pick a name.'}</div>`; return; }
  const sym = r.s;
  if (!NAMES[sym]) {
    el.innerHTML = `<div class="dh"><div><span class="tk">${esc(sym)}</span></div></div><div class="empty">loading…</div>`;
    try { NAMES[sym] = await getJSON('names/' + encodeURIComponent(sym) + '.json'); } catch (e) { NAMES[sym] = null; }
    const now = VIEW.find(x => x.s === S.s) || B.rows.find(x => x.s === S.s) || (!PHONE() && VIEW[0]);
    if (!now || now.s !== sym) return;
  }
  const n = NAMES[sym];
  if (!n) { el.innerHTML = `<div class="empty">No page for ${esc(sym)}.</div>`; return; }
  el.innerHTML = `<span class="chip back" data-back="1">← Board</span>
<div class="dh"><div><span class="tk">${esc(sym)}</span> <span class="muted">${esc(r.n)}</span></div>
 <div class="px"><b>${r.px != null ? r.px.toFixed(2) : '–'}</b> <span class="muted">${md(r.pxd || M.report_day)} close</span>${r.off != null ? ` · <span class="dn">${Math.round(r.off * 100)}% from high</span>` : ''}</div></div>
<div class="dsub">${[esc(r.sec || ''), esc(r.theme || '')].filter(Boolean).join(' · ')}</div>${inView ? '' : '<div class="nf">Not in the current filter</div>'}
<div class="drow"><span class="gl">Yellow dots</span>${dotsCell(r, true)}<span class="gl" style="margin-left:14px">KDJ</span>${kdjRow(r)}</div>
<div class="card2 chc"><h4><span>Daily · 1 year</span><span class="muted">yellow = washout dot · lanes D / W / 2W / M</span></h4>${chartSVG(r, n)}</div>
${kingCard(r)}
<div class="two">${cpCard(r)}${bizCard(r, n)}</div>
${optsSVG(n)}
${buildCard(n)}
${movesCard(n)}
<div class="links"><a class="btn" href="../skew-tracker/#o=${encodeURIComponent(sym)}">Skew Tracker</a><a class="btn" href="../king-gex/#s=${encodeURIComponent(sym)}">King GEX Tracker</a><a class="btn" href="../eagle-eye/?s=${encodeURIComponent(sym)}">Eagle Eye</a><a class="btn" href="../flow/?s=${encodeURIComponent(sym)}">Flow</a></div>`;
  chartHover(el, n);
  if (PHONE()) window.scrollTo(0, 0);
  else if (wantScroll && STACKED()) { wantScroll = false; el.scrollIntoView({ block: 'start' }); }
}


let savedY = 0, pushed = false, wantScroll = false;
function render() { syncChips(); renderBoard(); renderFoot(); renderDet(); writeHash(); }
function markSel() { document.querySelectorAll('#lst [data-s]').forEach(x => x.classList.toggle('sel', x.dataset.s === S.s)); }
function pick(sym, fromKey) {
  if (PHONE()) {
    savedY = window.scrollY; S.s = sym; pushed = true;
    history.pushState(null, '', hashStr()); render(); return;
  }
  if (STACKED()) {
    const d = $('#det'), top = d.getBoundingClientRect().top;
    wantScroll = !fromKey || top > window.innerHeight || top < -d.offsetHeight + 80;
  }
  S.s = sym; markSel(); renderDet(); writeHash();
}
function back() {
  if (STACKED()) {
    const row = document.querySelector(`#lst tr[data-s="${CSS.escape(S.s)}"]`);
    if (row) row.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0);
    return;
  }
  if (pushed) { history.back(); return; }
  S.s = ''; render(); requestAnimationFrame(() => window.scrollTo(0, savedY));
}
function wire() {
  $('#bar').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    if (c.dataset.t === 'now') S.now = S.now ? 0 : 1;
    else { const g = c.closest('.grp'); if (!g) return; const k = g.dataset.k; S[k] = typeof DEF[k] === 'number' ? +c.dataset.v : c.dataset.v; }
    render();
  });
  let qt = null;
  $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { S.q = cleanQ(e.target.value); renderBoard(); renderDet(); writeHash(); }, 120); });
  $('#q').addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(qt); S.q = cleanQ(e.target.value); VIEW = view(); if (VIEW.length) { if (PHONE()) { renderBoard(); pick(VIEW[0].s); return; } S.s = VIEW[0].s; } render(); }
    if (e.key === 'Escape') { clearTimeout(qt); e.target.value = ''; S.q = ''; render(); }
  });
  $('#lst').addEventListener('click', e => {
    const th = e.target.closest('th[data-o]');
    if (th) { const k = th.dataset.o; if (S.o === k) S.od = -S.od; else { S.o = k; S.od = SORTS[k][1]; } renderBoard(); writeHash(); return; }
    const tr = e.target.closest('[data-s]'); if (tr) pick(tr.dataset.s);
  });
  $('#det').addEventListener('click', e => { if (e.target.closest('[data-back]')) back(); });
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || PHONE() || !VIEW.length || !['ArrowDown', 'ArrowUp', 'j', 'k'].includes(e.key)) return;
    e.preventDefault();
    const i = VIEW.findIndex(r => r.s === (S.s || VIEW[0].s)), j = Math.max(0, Math.min(VIEW.length - 1, i + (e.key === 'ArrowDown' || e.key === 'j' ? 1 : -1)));
    const row = document.querySelector(`#lst tr[data-s="${CSS.escape(VIEW[j].s)}"]`);
    pick(VIEW[j].s, true);
    if (row && !STACKED()) row.scrollIntoView({ block: 'nearest' });
  });
  window.addEventListener('hashchange', () => {
    readHash(); render();
    if (PHONE() && !S.s) { pushed = false; requestAnimationFrame(() => window.scrollTo(0, savedY)); }
  });
  let wasPhone = PHONE();
  window.addEventListener('resize', () => { if (PHONE() !== wasPhone) { wasPhone = PHONE(); renderDet(); } });
}
function stamp() {
  const days = (Date.now() - Date.parse(M.report_day + 'T20:00:00Z')) / 864e5;
  status(days > 4.5 ? 'stale' : '', `${md(M.report_day)} close`);
}
function safeRender() {
  try { render(); stamp(); } catch (e) { status('err', 'page error — reload'); console.error(e); }
}
async function poll() {
  try {
    const m = await getJSON('manifest.json', 1);
    if (m && (!B || m.sha256 + m.names_sha256 !== built) && await loadBoard()) safeRender();
    else if (M) stamp();
  } catch (e) { status('err', 'offline for a moment'); }
}
function nudgeTabs() {
  const t = document.querySelector('.tabs'), a = t && t.querySelector('[aria-current=page]');
  if (!a || t.scrollWidth <= t.clientWidth) return;
  const d = a.getBoundingClientRect().right - t.getBoundingClientRect().right;
  if (d > 0) t.scrollLeft += d;
}
(async function init() {
  readHash(); wire(); nudgeTabs();
  setInterval(poll, 5 * 60 * 1000);
  try { if (await loadBoard()) safeRender(); } catch (e) { status('err', 'data not reachable'); }
})();
