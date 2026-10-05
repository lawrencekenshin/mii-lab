'use strict';

let SYMLIST = [], symTs = 0, symHits = [], symSel = 0;

let symLoading = null;
function loadSymbols() {
  if (SYMLIST.length && Date.now() - symTs < 600000) return Promise.resolve();
  if (!symLoading) {
    symLoading = (window.EET_STATIC ? window.EET_STATIC.get('/api/symbols') : fetch('/api/symbols', { cache: 'no-store' }).then(r => r.json()))
      .then(r => { SYMLIST = r.symbols || []; symTs = Date.now(); })
      .catch(() => {  })
      .finally(() => { symLoading = null; });
  }
  return symLoading;
}
function symMatches(q) {
  q = q.trim().toUpperCase();
  if (!q) return SYMLIST.slice(0, 80);
  const a = [], b = [], c = [];
  for (const [s, n] of SYMLIST) {
    if (s === q) a.push([s, n]);
    else if (s.startsWith(q) || s.replace('.', '').startsWith(q)) b.push([s, n]);
    else if (q.length >= 2 && n && n.toUpperCase().includes(q)) c.push([s, n]);
  }
  return a.concat(b, c).slice(0, 80);
}
function renderSymList() {
  const L = $('symlist'), q = $('symin').value.trim();
  symHits = symMatches(q);
  if (!symHits.length) {
    L.innerHTML = `<div class="none">${esc(q.toUpperCase())}: ${window.EET_STATIC ? `not on this page's list of ${SYMLIST.length} tickers` : `not one of the ${SYMLIST.length} tickers with a saved option chain`}</div>`;
  } else {
    symSel = Math.max(0, Math.min(symSel, symHits.length - 1));
    L.innerHTML = symHits.map(([s, n], i) => `<div data-s="${esc(s)}"${i === symSel ? ' class="on"' : ''}><b>${esc(s)}</b><span>${esc(n)}</span></div>`).join('');
  }
  L.hidden = false;
}
function closeSymList() { $('symlist').hidden = true; $('symin').value = sym; }
function pickSym(s) { closeSymList(); $('symin').blur(); setSym(s, true); }

function setSym(s, push) {
  s = String(s || '').trim().toUpperCase();
  $('symin').value = s || sym;
  if (!s || (s === sym && state)) return;
  sym = s;
  try { localStorage.setItem('gexdash.sym', s); } catch (e) {  }
  const u = new URL(location.href);
  u.searchParams.set('s', s);
  if (push) history.pushState({ s }, '', u); else history.replaceState({ s }, '', u);
  document.title = s + ' · Eagle Eye Technicals';

  state = null; meta = null; version = -1; loadedTf = null; wantN = {}; structKey = ''; nBars = 0; dLen = 0;
  lastTimes = []; lastPt = []; gexKey = ''; levelsRange = null;
  $('gexb').innerHTML = ''; $('ditb').innerHTML = ''; $('difoot').innerHTML = ''; $('cards').innerHTML = '';
  $('episode').style.display = 'none'; $('empty').hidden = true;
  $('symname').textContent = s; $('exch').textContent = ''; $('ohlc').innerHTML = '';
  $('dot').className = ''; $('stxt').textContent = `loading ${s}…`;
  if (chart) makeChart();
  ['under', 'overlay'].forEach(id => { const c = $(id); c.getContext('2d').clearRect(0, 0, c.width, c.height); });
  $('maxbtns').innerHTML = ''; sig = '';
  loadState(true);
}


function markTfs(m) {
  const tb = (m && m.tf_bars) || {};
  document.querySelectorAll('#tfs button').forEach(b => {
    const t = b.dataset.tf, n = tb[t], thin = n != null && n < 60;
    b.classList.toggle('thin', thin);
    b.title = !thin ? '' : (n ? `only ${n} ${t} candles for ${m.symbol} so far` : `no ${t} candles for ${m.symbol} yet`) +
      (INTRADAY.has(t) ? (window.EET_STATIC ? ': no hourly history for this ticker' : ': no saved hourly history for this ticker; live candles build while a page shows it') : '');
  });
}

$('symin').value = sym;
$('symin').addEventListener('focus', () => { $('symin').select(); symSel = 0; loadSymbols().then(renderSymList); });
$('symin').addEventListener('input', () => { symSel = 0; renderSymList(); if (!SYMLIST.length) loadSymbols().then(renderSymList); });
$('symin').addEventListener('blur', () => setTimeout(closeSymList, 150));
$('symin').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    symSel += e.key === 'ArrowDown' ? 1 : -1;
    renderSymList();
    const on = $('symlist').querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const q = $('symin').value.trim().toUpperCase();
    if (!SYMLIST.length && symLoading) { symLoading.then(() => $('symin').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))); return; }
    const exact = SYMLIST.find(([s]) => s === q);
    if (exact) pickSym(exact[0]);
    else if (symHits.length) pickSym(symHits[symSel][0]);
    else if (q && !SYMLIST.length) pickSym(q);
  } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSymList(); $('symin').blur(); }
});
$('symlist').addEventListener('mousedown', e => {
  const d = e.target.closest('[data-s]'); if (!d) return;
  e.preventDefault(); pickSym(d.dataset.s);
});

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || !/^[a-zA-Z]$/.test(e.key)) return;
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
  e.preventDefault();
  $('symin').focus();
  $('symin').value = e.key.toUpperCase();
  symSel = 0; loadSymbols().then(renderSymList);
});
window.addEventListener('popstate', () => {
  const s = new URLSearchParams(location.search).get('s');
  if (s) setSym(s, false);
});
history.replaceState({ s: sym }, '', (() => { const u = new URL(location.href); u.searchParams.set('s', sym); return u; })());
document.title = sym + ' · Eagle Eye Technicals';
loadSymbols();
