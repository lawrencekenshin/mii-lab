'use strict';
const LW = LightweightCharts;

const TFS = ['5m', '1H', '2H', '3H', '4H', '1D', '3D', '1W', '2W', '1M'].filter(t => !(window.EET_STATIC &&
  (t === '5m' || (window.EET_STATIC.tfs && !window.EET_STATIC.tfs.includes(t)))));
const TFNAME = { '5m': '5', '1H': '1h', '2H': '2h', '3H': '3h', '4H': '4h', '1D': 'D', '3D': '3D', '1W': 'W', '2W': '2W', '1M': 'M' };
const INTRADAY = new Set(['5m', '1H', '2H', '3H', '4H']);
const C = { up: '#26a69a', dn: '#ef5350', king: '#f5d63d', call: '#00e676', put: '#ff5252', flip: '#e0e3eb', warn: '#ff9800' };
const BAND = 0.015, BAND_MAX = 0.04, META_MS = 5000;
const STYLE = { solid: 0, dotted: 1, dashed: 2 };
const $ = id => document.getElementById(id);

const CLASSIC_PAGE = !!window.CLASSIC;
const PAGE_NAME = CLASSIC_PAGE ? 'Classic Indicators' : 'Eagle Eye Technicals';
if (CLASSIC_PAGE) document.body.classList.add('classic');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NARROW = () => window.innerWidth < 1200;
const paneWidth = () => (chart ? chart.timeScale().width() : window.innerWidth);
const COMPACT = () => paneWidth() < 900;
const PHONE = () => paneWidth() < 600;
const HISTW = () => (PHONE() ? 40 : Math.round(Math.min(170, Math.max(56, paneWidth() * 0.16))));
const fmtM = v => (v >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(v) / 1e6).toLocaleString('en-US') + 'M';
const fmtK = k => k == null ? '—' : (Math.round(k * 100) / 100).toString();

let sym = (() => {
  const u = new URLSearchParams(location.search).get('s');
  if (u) return u.trim().toUpperCase();
  if (window.EET_STATIC) return 'QQQ';
  try { return localStorage.getItem('gexdash.sym') || 'QQQ'; } catch (e) { return 'QQQ'; }
})();

const GEX_H = ['1M', '3M', '6M', '1Y+'];
let gexH = (() => { try { const v = localStorage.getItem('gexdash.gexh'); return GEX_H.includes(v) ? v : '3M'; } catch (e) { return '3M'; } })();
let gexBars = (() => { try { const v = localStorage.getItem('gexdash.gexbars'); return v === 'split' || v === 'oi' ? v : 'net'; } catch (e) { return 'net'; } })();

let tableLive = (() => { try { return localStorage.getItem('gexdash.tablelive') === '1'; } catch (e) { return false; } })();
const api = path => path + (path.includes('?') ? '&' : '?') + 's=' + encodeURIComponent(sym) + '&h=' + encodeURIComponent(gexH) +
  (tableLive ? '&live=1' : '') + (CLASSIC_PAGE && path.startsWith('/api/state') ? '&panes=classic' : '') +
  (vpAsk() && path.startsWith('/api/state') ? '&vp=1' + (vpRange !== 'vis' ? '&vpr=' + vpRange : '') : '');
let tf = (() => { try { return localStorage.getItem('gexdash.tf') || '1W'; } catch (e) { return '1W'; } })();
if (!TFS.includes(tf)) tf = '1W';
let meta = null, state = null, version = -1, loadedTf = null, lastOkPoll = 0, inflight = false;
let chart = null, dchart = null, candles = null, structKey = '', dseries = {}, oseries = {}, markersApi = null, guideLines = [], gexLines = [];
let nBars = 0, levelsRange = null, gexKey = '', topMargin = -1, sig = '';
let secRange = {}, secGuides = {}, lastCut = -1, cardRight = 0;


let secRight = {}, secCut = {}, cutKey = '';
const rightOf = s => (CLASSIC_PAGE && s && secRight[s.id] != null ? secRight[s.id] : cardRight);
let wantN = {}, dLen = 0, moreBusy = false;
let lastTimes = [], lastPt = [];




const VP_KEY = CLASSIC_PAGE ? 'vprofile_classic' : 'vprofile';
const VP_RANGES = [['vis', 'Visible'], ['3M', '3M'], ['6M', '6M'], ['1Y', '1Y'], ['YTD', 'YTD']];
const VP_RANGE_KEY = 'gexdash.vprange' + (CLASSIC_PAGE ? '.classic' : '');
let vpRange = (() => { try { const v = localStorage.getItem(VP_RANGE_KEY); return VP_RANGES.some(r => r[0] === v) ? v : 'vis'; } catch (e) { return 'vis'; } })();


const VP_LAYER = !window.EET_STATIC || !!window.EET_STATIC.vp;
const vpOn = () => VP_LAYER && layerOn(VP_KEY);



const vpAsk = () => vpOn() && !window.EET_STATIC;

function vpShort() {
  const vp = state.di.vp, bars = state.di.bars || [];
  if (vpRange === 'vis' || !vp || !bars.length) return false;
  const want = vpSpan(bars);
  return !!want && want[0] < (vp.from != null ? vp.from : bars[0][0]);
}
function vpEnsure() { if (vpAsk() && state && state.di && (!state.di.vp || vpShort())) loadState(true); }
const LAYERS = [
  { group: 'BMSB bands', key: 'bmsb_4H', label: '4H BMSB', sw: '#FFEB3B' },
  { group: 'BMSB bands', key: 'bmsb_D', label: 'Daily BMSB' },
  { group: 'BMSB bands', key: 'bmsb_W', label: 'Weekly BMSB' },
  { group: 'BMSB bands', key: 'bmsb_2W', label: '2-week BMSB' },
  { group: 'BMSB bands', key: 'bmsb_M', label: 'Monthly BMSB' },
  { group: 'BMSB bands', key: 'bmsb_3M', label: '3-month BMSB' },
  { group: 'Moving averages', key: 'ma50', label: '50 day', sw: '#4CAF50' },
  { group: 'Moving averages', key: 'ma100', label: '100 day', sw: '#FFEB3B' },
  { group: 'Moving averages', key: 'ma200', label: '200 day', sw: '#EF5350' },
  { group: 'Moving averages', key: 'ma200w', label: '200 week', sw: '#2196F3' },
  { group: 'Other', key: 'bb', label: 'Bollinger bands' },
  { group: 'Other', key: 'ribbon', label: 'Medium-term ribbon' },
  { group: 'Other', key: 'sma10', label: 'Price SMA 10', sw: '#FFFF00' },
  { group: 'Other', key: 'dots', label: 'Signal dots' },
  { group: 'Other', key: 'wodots', label: 'Washout yellow B dots', sw: '#ffd54f' },
  ...(window.EET_STATIC ? [] : [{ group: 'Other', key: 'woevents', label: 'Washout R / C / B+ / X / E markers', sw: '#42a5f5' }]),
  { group: 'Other', key: 'profile', label: 'Cost profile (blue levels)', sw: '#00A9E0' },
  { group: 'Other', key: 'candles4', label: 'Four-colour candles' },
  ...(VP_LAYER ? [{ group: 'Volume', key: VP_KEY, label: 'Volume profile (left)', sw: '#ffb74d' }] : []),
];


const PANES = CLASSIC_PAGE ? [
  { id: 'c_vol', label: 'Volume' },
  { id: 'c_rsi', label: 'RSI' }, { id: 'c_macd', label: 'MACD' }, { id: 'c_stochrsi', label: 'Stoch RSI' },
  { id: 'c_kdj', label: 'KDJ' }, { id: 'c_obvmacd', label: 'OBV MACD (pivot buy / sell)' }, { id: 'c_willr', label: 'Williams %R' },
  { id: 'c_bbpct', label: 'BB %B' }, { id: 'c_wmsr', label: 'WMSR' },
] : [
  { id: 'kdj', label: 'KDJ' }, { id: 'rsi', label: 'RSI' }, { id: 'macdv', label: 'MACD-V' },
  { id: 'bbwidth', label: 'BB Width' }, { id: 'h', label: 'H (Washout)' }, { id: 'hkdj', label: 'H-KDJ' },
];
const paneOn = id => layerState['pane_' + id] !== false;
const sideOn = () => layerState.side !== false;
function filterPanes(di) {
  const P = di && di.panes;
  if (!P) return;
  if (!P._all) P._all = P.sections || [];
  P.sections = P._all.filter(s => paneOn(s.id));
}
const diHidden = () => !!(state && state.di && state.di.panes && state.di.panes._all && !state.di.panes.sections.length);
function applySideVisibility() { document.body.classList.toggle('no-side', !sideOn()); }
let layerState = (() => { try { return JSON.parse(localStorage.getItem('gexdash.layers') || '{}'); } catch (e) { return {}; } })();
const DEFAULT_OFF = new Set(['woevents', ...(CLASSIC_PAGE ? [] : [VP_KEY])]);
const layerOn = key => (key in layerState ? layerState[key] !== false : !DEFAULT_OFF.has(key));
applySideVisibility();


const fitCandlesOnly = () => layerState.fitPrice !== false;
function layerOfLine(id) {
  const exact = LAYERS.find(L => L.key === id);
  if (exact) return exact.key;
  const m = LAYERS.filter(L => id.startsWith(L.key + '_') || (L.key === 'bb' && id.startsWith('bb_')) || (L.key === 'ribbon' && id.startsWith('ribbon')));
  return m.length ? m[0].key : null;
}
const lineOn = id => { const k = layerOfLine(id); return k ? layerOn(k) : true; };

const woShown = m => m.shown && (m.kind === 'B' ? layerOn('wodots') : layerOn('woevents'));
function saveLayers() { try { localStorage.setItem('gexdash.layers', JSON.stringify(layerState)); } catch (e) {  } }
function applyLayers(keepView) {
  Object.entries(oseries).forEach(([id, ser]) => ser.applyOptions({ visible: lineOn(id) }));
  if (candles) candles.priceScale().applyOptions({ autoScale: true });
  applySideVisibility();

  const vp = keepView && chart && nBars ? chart.timeScale().getVisibleLogicalRange() : null;
  const vd = keepView && dchart && nBars ? dchart.timeScale().getVisibleLogicalRange() : null;
  if (state) render();
  if (vp || vd) progSet(() => {
    if (vp) chart.timeScale().setVisibleLogicalRange(vp);
    if (vd && dchart && !diHidden()) dchart.timeScale().setVisibleLogicalRange(vd);
  });
  applyLayout();
  sig = '';
}
function renderLayerPanel() {
  let html = '', grp = '';
  LAYERS.forEach(L => {
    if (L.group !== grp) { grp = L.group; html += `<div class="grp">${grp}</div>`; }
    html += `<label><input type="checkbox" data-k="${L.key}"${layerOn(L.key) ? ' checked' : ''}>` +
      (L.sw ? `<span class="sw" style="background:${L.sw}"></span>` : '') + `${L.label}</label>`;
    if (L.key === VP_KEY) html += `<div class="vpr" title="Candles the volume profile counts (fixed ranges end at the last candle)">` +
      VP_RANGES.map(([k, t]) => `<span data-vpr="${k}"${vpOn() && vpRange === k ? ' class="on"' : ''}>${t}</span>`).join('') +
      `<span data-vpr="off"${vpOn() ? '' : ' class="on"'}>Off</span></div>`;
  });
  html += `<div class="grp">Indicator panels</div>`;
  html += `<label><input type="checkbox" data-k="panes_all"${PANES.every(P => paneOn(P.id)) ? ' checked' : ''}><b>All panels</b></label>`;
  PANES.forEach(P => { html += `<label><input type="checkbox" data-k="pane_${P.id}"${paneOn(P.id) ? ' checked' : ''}>${P.label}</label>`; });
  html += `<label><input type="checkbox" data-k="side"${sideOn() ? ' checked' : ''}>Table &amp; washout box (right)</label>`;
  html += `<div class="grp">Scale</div><label><input type="checkbox" data-k="fitPrice"${fitCandlesOnly() ? ' checked' : ''}>Fit scale to candles only (far lines run off-screen)</label>`;
  html += `<label><input type="checkbox" data-k="lockAxes"${axesLocked() ? ' checked' : ''}>One time axis: indicators scroll &amp; zoom with the price chart</label>`;
  html += `<label${axesLocked() ? ' class="off"' : ''}><input type="checkbox" data-k="panLink"${layerState.panLink !== false ? ' checked' : ''}${axesLocked() ? ' disabled' : ''}>Unlocked: still drag them together (zoom stays separate)</label>`;
  html += `<div class="acts"><button data-act="all">All on</button><button data-act="none">Price only</button></div>`;
  $('layers').innerHTML = html;
}
$('layerbtn').addEventListener('click', e => { e.stopPropagation(); const p = $('layers'); p.hidden = !p.hidden; if (!p.hidden) renderLayerPanel(); });
$('layers').addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', () => { $('layers').hidden = true; });
$('layers').addEventListener('change', e => {
  const k = e.target.dataset.k; if (!k) return;
  if (k === 'panes_all') { PANES.forEach(P => { layerState['pane_' + P.id] = e.target.checked; }); saveLayers(); renderLayerPanel(); applyLayers(true); return; }
  layerState[k] = e.target.checked;
  if (k.startsWith('pane_')) { saveLayers(); renderLayerPanel(); applyLayers(true); return; }
  if (k === 'lockAxes') { saveLayers(); renderLayerPanel(); applyLayers(); if (e.target.checked) syncAxes('p'); return; }
  if (k === VP_KEY) { saveLayers(); renderLayerPanel(); applyLayers(); vpEnsure(); return; }
  saveLayers(); applyLayers();
});
$('layers').addEventListener('click', e => {
  const act = e.target.dataset && e.target.dataset.act; if (!act) return;
  LAYERS.forEach(L => { layerState[L.key] = act === 'all'; });
  if (act === 'none') layerState.candles4 = true;
  if (act === 'all') { PANES.forEach(P => { layerState['pane_' + P.id] = true; }); layerState.side = true; }
  saveLayers(); renderLayerPanel(); applyLayers(true); vpEnsure();
});
$('layers').addEventListener('click', e => {
  const v = e.target.dataset && e.target.dataset.vpr; if (!v) return;
  if (v === 'off') layerState[VP_KEY] = false;
  else {
    layerState[VP_KEY] = true; vpRange = v;
    try { localStorage.setItem(VP_RANGE_KEY, v); } catch (x) {  }
  }
  saveLayers(); renderLayerPanel(); applyLayers(); vpEnsure();
});


$('tfs').innerHTML = TFS.map(t => `<button data-tf="${t}">${t === '1D' ? 'D' : t === '1W' ? 'W' : t === '1M' ? 'M' : t}</button>`).join('');
$('tfs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setTf(b.dataset.tf); });
$('gex').addEventListener('click', e => {
  const ch = e.target.closest('[data-gh],[data-gb]');
  if (ch) {
    e.stopPropagation();
    if (ch.dataset.gh) { gexH = ch.dataset.gh; try { localStorage.setItem('gexdash.gexh', gexH); } catch (x) {  } refreshGex(); }
    else { gexBars = ch.dataset.gb; try { localStorage.setItem('gexdash.gexbars', gexBars); } catch (x) {  } }
    gexKey = ''; sig = ''; renderGex();
    return;
  }
  const next = !gexCollapsed();
  try { localStorage.setItem('gexdash.gexmin.' + tf, next ? '1' : '0'); } catch (e) {  }
  renderGex(); sig = '';
});
function setTf(t) {
  tf = t;
  try { localStorage.setItem('gexdash.tf', t); } catch (e) {  }
  document.querySelectorAll('#tfs button').forEach(b => b.classList.toggle('on', b.dataset.tf === t));
  $('tfname').textContent = TFNAME[t];
  loadState(true);
}




const TOUCH_SCROLL = { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false };

const TOUCH_FULL = Object.assign({}, TOUCH_SCROLL, { vertTouchDrag: true });
const touchFor = which => (maxPane === which ? TOUCH_FULL : TOUCH_SCROLL);



const scaleFor = which => (CLASSIC_PAGE && which === 'di' ? { pinch: false, mouseWheel: maxPane === 'di' } : { pinch: false });
const pageWheel = e => CLASSIC_PAGE && maxPane === null && Math.abs(e.deltaY) > Math.abs(e.deltaX);
function makeChart() {
  if (chart) chart.remove();
  if (dchart) dchart.remove();
  const base = (bs, ro) => ({
    autoSize: true,
    layout: { background: { type: 'solid', color: 'rgba(0,0,0,0)' }, textColor: '#b2b5be', fontSize: 11, attributionLogo: false,
              panes: { separatorColor: '#2a2e39', separatorHoverColor: '#363a45', enableResize: false } },
    grid: { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
    rightPriceScale: { borderColor: '#2a2e39' },
    timeScale: { borderColor: '#2a2e39', timeVisible: INTRADAY.has(tf), secondsVisible: false, barSpacing: bs, rightOffset: ro },
    crosshair: { mode: LW.CrosshairMode.Normal },
    handleScroll: touchFor('di'),
    handleScale: scaleFor('di'),
  });

  dchart = LW.createChart($('dchart'), base(7, 3));
  chart = LW.createChart($('chart'), {
    autoSize: true,
    layout: { background: { type: 'solid', color: 'rgba(0,0,0,0)' },
              textColor: '#b2b5be', fontSize: 11, attributionLogo: false,
              panes: { separatorColor: '#2a2e39', separatorHoverColor: '#363a45', enableResize: false } },
    grid: { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
    rightPriceScale: { borderColor: '#2a2e39' },
    timeScale: { borderColor: '#2a2e39', timeVisible: INTRADAY.has(tf), secondsVisible: false, barSpacing: 7 },
    crosshair: { mode: LW.CrosshairMode.Normal },
    handleScroll: touchFor('price'),
    handleScale: { pinch: false },
  });
  candles = chart.addSeries(LW.CandlestickSeries, {
    upColor: C.up, downColor: C.dn, borderVisible: false, wickUpColor: C.up, wickDownColor: C.dn,
    autoscaleInfoProvider: orig => {
      const r = orig();
      if (r && levelsRange && INTRADAY.has(tf)) {
        r.priceRange.minValue = Math.min(r.priceRange.minValue, levelsRange[0]);
        r.priceRange.maxValue = Math.max(r.priceRange.maxValue, levelsRange[1]);
      }
      const wm = state && state.di && state.di.episode && state.di.episode.raw && state.di.episode.raw.markers;
      const vr = wm && wm.length && chart ? chart.timeScale().getVisibleRange() : null;
      if (r && vr) for (const m of wm) {
        if (!woShown(m) || m.ts < vr.from || m.ts > vr.to) continue;
        r.priceRange.minValue = Math.min(r.priceRange.minValue, m.price);
        r.priceRange.maxValue = Math.max(r.priceRange.maxValue, m.price);
      }
      return r;
    },
  }, 0);
  dseries = {}; oseries = {}; guideLines = []; gexLines = []; markersApi = null; nBars = 0; gexKey = ''; topMargin = -1;
  chart.timeScale().subscribeVisibleLogicalRangeChange(r => { sig = ''; maybeLoadMore(r); });
  dchart.timeScale().subscribeVisibleLogicalRangeChange(r => { sig = ''; maybeLoadMore(r); });
  prevR.p = prevR.d = null; scaleSym = '';
  chart.timeScale().subscribeVisibleLogicalRangeChange(() => { if (leader() === 'p') syncAxes('p'); });
  dchart.timeScale().subscribeVisibleLogicalRangeChange(() => syncAxes(leader()));
  panLink();
  hookDblClick();
  linkCrosshairs();
}


const userAt = { p: 0, d: 0 }, prevR = { p: null, d: null };
let progMove = false, lastUser = 'p';
function watchUser(el, k) {
  el.addEventListener('pointerdown', () => { userAt[k] = Infinity; lastUser = k; }, true);
  const up = () => { if (userAt[k] === Infinity) userAt[k] = performance.now() + 1200; };
  el.addEventListener('pointerup', up, true); el.addEventListener('pointercancel', up, true); window.addEventListener('pointerup', up);
  el.addEventListener('wheel', e => { if (k === 'd' && pageWheel(e)) return; userAt[k] = performance.now() + 400; lastUser = k; }, { capture: true, passive: true });
}
watchUser($('chart'), 'p'); watchUser($('dchart'), 'd');

$('dchart').addEventListener('wheel', e => { if (pageWheel(e)) e.stopPropagation(); }, { capture: true, passive: true });



let xhairSrc = null;
[['chart', 'p'], ['dchart', 'd']].forEach(([el, k]) => {
  $(el).addEventListener('mouseenter', () => { xhairSrc = k; });
  $(el).addEventListener('mouseleave', () => {
    if (xhairSrc !== k) return;
    xhairSrc = null;
    const other = k === 'p' ? dchart : chart;
    if (other) other.clearCrosshairPosition();
  });
});
const XH_FULL = { horzLine: { visible: true, labelVisible: true } }, XH_VERT = { horzLine: { visible: false, labelVisible: false } };
function linkCrosshairs() {
  [['p', chart], ['d', dchart]].forEach(([k, src]) => src.subscribeCrosshairMove(prm => {
    if (xhairSrc !== k || !chart || !dchart) return;
    const dst = k === 'p' ? dchart : chart;
    const ser = k === 'p' ? Object.values(dseries)[0] : candles;
    src.applyOptions({ crosshair: XH_FULL });
    if (!prm || prm.time === undefined || !ser) { dst.clearCrosshairPosition(); return; }
    dst.applyOptions({ crosshair: XH_VERT });
    try { dst.setCrosshairPosition(0, prm.time, ser); } catch (e) { dst.clearCrosshairPosition(); }
  }));
}
function panLink() {
  [['p', chart, () => dchart], ['d', dchart, () => chart]].forEach(([k, src, other]) => src.timeScale().subscribeVisibleLogicalRangeChange(r => {
    const prev = prevR[k]; prevR[k] = r;
    if (!r || !prev || progMove || axesLocked() || layerState.panLink === false || performance.now() > userAt[k]) return;
    const w0 = prev.to - prev.from, w1 = r.to - r.from, shift = r.from - prev.from;
    if (Math.abs(w1 - w0) > 1e-3 * Math.max(1, w0) || !shift) return;
    const dst = other(), o = dst && dst.timeScale().getVisibleLogicalRange();
    if (o) dst.timeScale().setVisibleLogicalRange({ from: o.from + shift, to: o.to + shift });
  }));
}

function progSet(fn) {
  const was = progMove;
  progMove = true;
  try { fn(); } finally { progMove = was; }
  if (chart) prevR.p = chart.timeScale().getVisibleLogicalRange();
  if (dchart) prevR.d = dchart.timeScale().getVisibleLogicalRange();
}



const axesLocked = () => layerState.lockAxes !== false;
const leader = () => (lastUser === 'd' && performance.now() <= userAt.d ? 'd' : 'p');
function axisOffset() {
  const pt = (state && state.di && state.di.panes && state.di.panes.t) || [];
  if (!pt.length) return 0;
  const T = pt[pt.length - 1], a = chart.timeScale().timeToIndex(T), b = dchart.timeScale().timeToIndex(T);
  return a == null || b == null ? 0 : b - a;
}
let inSync = false;
function syncAxes(from) {
  if (inSync || !axesLocked() || !chart || !dchart || !nBars || diHidden()) return;


  const s = (from === 'd' ? dchart : chart).timeScale(), d = (from === 'd' ? chart : dchart).timeScale(), r = s.getVisibleLogicalRange();
  if (!r) return;
  const off = axisOffset() * (from === 'd' ? -1 : 1), want = { from: r.from + off, to: r.to + off }, cur = d.getVisibleLogicalRange();
  if (cur && Math.abs(cur.from - want.from) < 1e-3 && Math.abs(cur.to - want.to) < 1e-3) return;
  inSync = true;
  try { progSet(() => d.setVisibleLogicalRange(want)); } finally { inSync = false; }
}


let scaleSym = '';
function matchScaleWidths() {
  if (!chart || !dchart || !axesLocked() || maxPane !== null || diHidden()) return;
  if (scaleSym !== sym + tf) {
    scaleSym = sym + tf;
    [chart, dchart].forEach(c => c.applyOptions({ rightPriceScale: { minimumWidth: 0 } }));
    return;
  }
  const a = chart.priceScale('right').width(), b = dchart.priceScale('right').width();
  if (!a || !b || a === b) return;
  const w = Math.max(a, b);
  [chart, dchart].forEach(c => c.applyOptions({ rightPriceScale: { minimumWidth: w } }));
}

function structureOf(di) {
  const secs = (di.panes && di.panes.sections) || [];
  const lines = (di.price && di.price.lines) || [];
  return tf + '|' + secs.map(s => s.id + ':' + (s.series || []).map(x => x.id + x.kind).join(',')).join(';') +
    '|' + lines.map(l => l.id).join(',') + '|' + (di.price && di.price.markers && di.price.markers.length ? 'm' : '');
}

function buildSeries(di) {
  makeChart();
  ((di.price && di.price.lines) || []).forEach(l => {
    oseries[l.id] = chart.addSeries(LW.LineSeries, { color: l.color, lineWidth: l.width || 1, lineStyle: STYLE[l.style] || 0,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, title: '', visible: lineOn(l.id),
      autoscaleInfoProvider: orig => (fitCandlesOnly() || !lineOn(l.id) ? null : orig()) }, 0);
  });
  const secs = (di.panes && di.panes.sections) || [];
  secRange = {};
  secs.forEach((s, k) => {
    const pane = k;
    const fixed = s.scale && s.scale.min != null ? { priceRange: { minValue: s.scale.min, maxValue: s.scale.max } } : null;
    const drawn = (s.series || []).filter(x => x.kind !== 'band');
    if (!drawn.length && (s.series || []).length) dseries[s.id + '/_pane'] = dchart.addSeries(LW.LineSeries, { visible: false,
      priceLineVisible: false, lastValueVisible: false, autoscaleInfoProvider: () => secRange[s.id] || fixed }, pane);
    drawn.forEach(x => {
      const common = { priceLineVisible: false, lastValueVisible: false, title: '' };


      if (s.id === 'c_vol') common.priceFormat = { type: 'custom', minMove: 1e-4, formatter: fmtAxisVol };

      common.autoscaleInfoProvider = () => secRange[s.id] || fixed;
      let ser;
      if (x.kind === 'histogram') ser = dchart.addSeries(LW.HistogramSeries, Object.assign({ color: x.color || '#5d606b', base: x.base || 0 }, common), pane);
      else if (x.kind === 'area') ser = dchart.addSeries(LW.AreaSeries, Object.assign({ lineColor: x.color, topColor: (x.color || '#26c6da').slice(0, 7) + '80',
        bottomColor: (x.color || '#26c6da').slice(0, 7) + '10', lineWidth: x.width || 1 }, common), pane);
      else if (x.kind === 'dots') ser = dchart.addSeries(LW.LineSeries, Object.assign({ color: x.color, lineVisible: false,
        pointMarkersVisible: true, pointMarkersRadius: Math.max(1.5, (x.width || 2) * 0.9), crosshairMarkerVisible: false }, common), pane);
      else ser = dchart.addSeries(LW.LineSeries, Object.assign({ color: x.color, lineWidth: x.width || 1, lineStyle: STYLE[x.style] || 0,
        crosshairMarkerVisible: false }, common), pane);
      dseries[s.id + '/' + x.id] = ser;
    });
  });
  const hs = secs.map(s => (s.layout && s.layout.height_px) || 120), avg = hs.reduce((a, b) => a + b, 0) / Math.max(1, hs.length);
  paneFactors = hs.map(h => h / avg);
  applyPaneFactors();
  applyLayout();
  secs.forEach((s, k) => {
    try { dchart.priceScale('right', k).applyOptions({ textColor: 'rgba(0,0,0,0)', borderVisible: false, ticksVisible: false }); } catch (e) {  }
  });
}

function pts(times, values, colors) {
  const out = [];
  for (let i = 0; i < times.length; i++) {
    const v = values ? values[i] : null;
    if (v == null || !isFinite(v)) out.push({ time: times[i] });
    else if (colors && colors[i]) out.push({ time: times[i], value: v, color: colors[i] });
    else out.push({ time: times[i], value: v });
  }
  return out;
}


const fmtAxisVol = v => {
  const a = Math.abs(v), [d, u] = a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'K'] : [1, ''];
  return (v < 0 ? '−' : '') + Number((a / d).toPrecision(3)) + u;
};
const roundUp2 = x => { if (!(x > 0)) return 1; const e = Math.floor(Math.log10(x)) - 1, p = Math.pow(10, e); return Math.ceil(x / p) * p; };

const hostOf = s => {
  for (const x of s.series || []) { const r = dseries[s.id + '/' + x.id]; if (r) return r; }
  return dseries[s.id + '/_pane'];
};
function setGuides(s, list) {
  const host = hostOf(s);
  secGuides[s.id] = list.map(g => Object.assign({}, g, { ser: host }));
}

const fmtAmp = a => {
  const v = Number(a.toPrecision(2)), m = Math.abs(v), k = (x, u) => Number(x.toPrecision(3)) + u;
  return m >= 1e9 ? k(v / 1e9, 'B') : m >= 1e6 ? k(v / 1e6, 'M') : m >= 1e4 ? k(v / 1e3, 'K') : m > 0 && m < 1e-3 ? v.toPrecision(2) : String(Number(v.toFixed(4)));
};



function scaleByMode(s, lo, hi, amp) {
  const sc = s.scale, fixed = sc.min != null && sc.max != null ? { priceRange: { minValue: sc.min, maxValue: sc.max } } : null;
  if (sc.mode === 'widen') {
    const b0 = sc.base_min != null ? sc.base_min : sc.min, b1 = sc.base_max != null ? sc.base_max : sc.max;
    const a = Math.min(b0 != null ? b0 : lo, lo), b = Math.max(b1 != null ? b1 : hi, hi);
    secRange[s.id] = isFinite(a) && isFinite(b) && b > a ? { priceRange: { minValue: a - (b - a) * 0.04, maxValue: b + (b - a) * 0.04 } } : fixed;
    setGuides(s, s.guides || []);
  } else if (sc.mode === 'sym' && amp > 0) {
    const A = roundUp2(amp), t = fmtAmp(A), c0 = ((s.guides || [])[0] || {}).color;
    secRange[s.id] = { priceRange: { minValue: -1.1 * A, maxValue: 1.1 * A } };
    setGuides(s, [{ value: A, label: '+' + t, color: c0, style: 'dashed' }, { value: 0, label: '0', color: c0, style: 'dashed' },
                  { value: -A, label: '−' + t, color: c0, style: 'dashed' }]);
  } else {
    secRange[s.id] = fixed;
    setGuides(s, sc.mode === 'sym' ? (s.guides || []).filter(g => g.value === 0) : s.guides || []);
  }
}
function applyCut() {
  const P = state && state.di && state.di.panes, bars = state && state.di && state.di.bars;
  if (!P || !bars || !bars.length || !dchart) return;
  const ts = dchart.timeScale(), pt = P.t || [];
  const cutAt = x => { const lg = x ? ts.coordinateToLogical(x) : 0; return Math.max(0, Math.min(pt.length, Math.ceil(lg == null ? 0 : lg))); };
  const pi = cutAt(cardRight);
  const key = CLASSIC_PAGE ? (P.sections || []).map(s => cutAt(rightOf(s))).join(',') : '';
  if (pi === lastCut && key === cutKey) return;
  lastCut = pi; cutKey = key;
  (P.sections || []).forEach(s => {
    let lo = Infinity, hi = -Infinity, amp = 0;
    const si = CLASSIC_PAGE ? cutAt(rightOf(s)) : pi;
    secCut[s.id] = si;
    (s.series || []).forEach(x => {
      if (x.kind === 'band') return;
      const ser = dseries[s.id + '/' + x.id];
      const vals = (x.values || []).map((v, i) => (i >= si ? v : null));
      if (ser) ser.setData(pts(pt, vals, x.colors));
      vals.concat(x.ghost && x.ghost.value != null ? [x.ghost.value] : []).forEach(v => {
        if (v == null || !isFinite(v)) return;
        lo = Math.min(lo, v); hi = Math.max(hi, v); amp = Math.max(amp, Math.abs(v));
      });
    });
    if (s.scale && s.scale.mode) scaleByMode(s, lo, hi, amp);
    else if (s.id === 'kdj' && s.scale && s.scale.auto && isFinite(lo)) {
      const a = Math.min(0, lo), b = Math.max(100, hi), pad = (b - a) * 0.04;
      secRange[s.id] = { priceRange: { minValue: a - pad, maxValue: b + pad } };
      setGuides(s, s.guides || []);
    } else if (s.id === 'macdv' && s.scale && s.scale.auto && amp > 0) {
      const A = roundUp2(amp), g0 = (s.guides || [])[0] || {};
      secRange[s.id] = { priceRange: { minValue: -1.1 * A, maxValue: 1.1 * A } };
      setGuides(s, [{ value: A, label: '+' + A, color: g0.color, style: 'dashed' }, { value: 0, label: '0', color: g0.color, style: 'dashed' },
                    { value: -A, label: '−' + A, color: g0.color, style: 'dashed' }]);
    } else setGuides(s, s.guides || []);
  });
  sig = '';
}


function maybeLoadMore(r) {
  const di = state && state.di;
  if (!r || !di || moreBusy || inflight || r.from > 20) return;
  const have = di.window || (di.bars || []).length, total = di.total_bars || have;
  if (have >= total) return;
  moreBusy = true;
  wantN[tf] = Math.min(total, Math.max(have * 2, have + 500));
  loadState(true).finally(() => { moreBusy = false; });
}


function resetPriceView() {
  if (!chart) return;
  const ts = chart.timeScale(), bs = paneWidth() < 700 ? 4 : 7;
  const need = HISTW() + (PHONE() ? 82 : COMPACT() ? 110 : 250) + 20;
  progSet(() => {
    ts.applyOptions({ barSpacing: bs, rightOffset: Math.ceil(need / bs) });


    ts.scrollToPosition(Math.ceil(need / bs), false);
  });
  candles.priceScale().setAutoScale(true);
  topMargin = -1; sig = '';
}


function settleView() {
  const t0 = performance.now();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (userAt.p > t0 || userAt.d > t0 || !chart || !nBars) return;
    resetPriceView(); resetDiView();
  }));
}
function resetDiView() {
  if (!dchart) return;
  if (axesLocked()) { syncAxes('p'); sig = ''; return; }
  progSet(() => { dchart.timeScale().applyOptions({ barSpacing: paneWidth() < 700 ? 4 : 7, rightOffset: 3 }); dchart.timeScale().scrollToRealTime(); });
  sig = '';
}

function render() { progSet(renderBody); syncAxes(leader()); }
function renderBody() {
  const di = state.di || {};
  filterPanes(di);
  const bars = di.bars || [];
  const key = structureOf(di);
  if (key !== structKey || !chart) { structKey = key; buildSeries(di); }
  const first = nBars === 0, oldN = nBars, oldD = dLen;
  const prevP = first ? null : chart.timeScale().getVisibleLogicalRange();
  const prevD = first || !dLen ? null : dchart.timeScale().getVisibleLogicalRange();

  const shiftBy = (oldT, newT, r) => {
    if (!r || !oldT.length || !newT.length) return 0;
    const i = Math.max(0, Math.min(oldT.length - 1, Math.round(r.from))), j = newT.indexOf(oldT[i]);
    return j < 0 ? 0 : j - i;
  };
  const addP = first ? 0 : shiftBy(lastTimes, bars.map(b => b[0]), prevP);
  const addD = first ? 0 : shiftBy(lastPt, (di.panes && di.panes.t) || [], prevD);
  const cc = di.price && di.price.candles && di.price.candles.colors;
  candles.setData(bars.map((b, i) => {
    const d = { time: b[0], open: b[1], high: b[2], low: b[3], close: b[4] };
    if (cc && cc[i] && layerOn('candles4')) { d.color = cc[i]; d.wickColor = cc[i]; d.borderColor = cc[i]; }
    return d;
  }));
  nBars = bars.length;
  const times = bars.map(b => b[0]);
  if (di.price) {
    const pt = di.price.t || times;
    (di.price.lines || []).forEach(l => oseries[l.id] && oseries[l.id].setData(pts(pt, l.values)));
  }
  if (di.panes) { lastCut = -1; applyCut(); dLen = (di.panes.t || []).length; lastPt = di.panes.t || []; }
  lastTimes = bars.map(b => b[0]);
  if (first) { resetPriceView(); resetDiView(); settleView(); }
  else {

    progSet(() => {
      if (prevP && addP && (addP > 0 || prevP.to < oldN - 1)) chart.timeScale().setVisibleLogicalRange({ from: prevP.from + addP, to: prevP.to + addP });
      if (prevD && addD && (addD > 0 || prevD.to < oldD - 1)) dchart.timeScale().setVisibleLogicalRange({ from: prevD.from + addD, to: prevD.to + addD });
    });
  }
  const em = $('empty');
  if (!bars.length) {
    em.textContent = INTRADAY.has(tf)
      ? (window.EET_STATIC ? `No ${tf} candles for ${sym} on this page: no hourly history for this ticker. D and up work fully.`
        : `No ${tf} candles for ${sym} yet: there is no saved hourly history for this ticker, and live 5-minute candles only build while a page shows it during the session. Daily and up work fully.`)
      : `No ${tf} candles for ${sym}.`;
    em.hidden = false;
  } else em.hidden = true;
  sig = '';
  renderGex(); renderHead(); renderSide();
}
