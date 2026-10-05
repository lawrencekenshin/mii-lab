'use strict';



let paneFactors = [], maxPane = null;
let priceShare = (() => { try { const v = parseFloat(localStorage.getItem('gexdash.priceShare')); return v > 0.08 && v < 0.92 ? v : 0.3; } catch (e) { return 0.3; } })();
function applyPaneFactors() {
  if (!dchart) return;
  dchart.panes().forEach((p, i) => p.setStretchFactor(paneFactors[i] || 1));
  sig = '';
}
function applyLayout() {
  const box = $('chartbox'), H = box.clientHeight;
  const noDi = typeof diHidden === 'function' && diHidden();
  const ph = maxPane === 'price' || noDi ? H : maxPane === 'di' ? 0 : Math.round(priceShare * Math.max(0, H - 6));
  box.style.setProperty('--ph', ph + 'px');
  $('chart').style.display = maxPane === 'di' ? 'none' : '';
  $('dchart').style.display = maxPane === 'price' || noDi ? 'none' : '';
  if (maxPane === 'di') $('dchart').style.top = '0px'; else $('dchart').style.top = '';
  sig = '';
}
function setMaximized(mode) {
  maxPane = mode;
  document.body.classList.toggle('expanded', mode !== null);
  $('gex').style.display = mode === 'di' ? 'none' : '';
  applyLayout();
  const fs = document.documentElement.requestFullscreen && !NARROW();
  if (mode !== null && fs && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  if (mode === null && document.fullscreenElement && !document.body.classList.contains('table-max')) document.exitFullscreen().catch(() => {});
  setTimeout(() => { applyLayout(); sig = ''; }, 150);
}
function paneAtY(y) {
  const ph = $('chart').style.display === 'none' ? 0 : $('chart').clientHeight;
  return y < ph ? 0 : 1;
}
$('chartbox').addEventListener('dblclick', e => {
  if (!chart || e.target.id === 'hsplit') return;
  const r = $('chartbox').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (maxPane !== null) { setMaximized(null); return; }
  const i = paneAtY(y);
  if (x > (i === 0 ? chart : dchart).timeScale().width()) return;
  if (i !== null) setMaximized(i === 0 ? 'price' : 'di');
});
$('maxbtns').addEventListener('click', e => {
  const b = e.target.closest('.maxbtn'); if (!b) return;
  e.stopPropagation();
  if (b.dataset.act === 'reset') { resetPriceView(); return; }
  setMaximized(maxPane === null ? (Number(b.dataset.i) === 0 ? 'price' : 'di') : null);
});


(function () {
  const hs = $('hsplit'); let dragging = false;
  hs.addEventListener('pointerdown', e => { dragging = true; hs.classList.add('drag'); hs.setPointerCapture(e.pointerId); e.preventDefault(); });
  hs.addEventListener('pointermove', e => {
    if (!dragging || !chart) return;
    const r = $('chartbox').getBoundingClientRect();
    priceShare = Math.min(0.88, Math.max(0.1, (e.clientY - r.top) / Math.max(1, r.height - 6)));
    applyLayout();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; hs.classList.remove('drag');
    try { localStorage.setItem('gexdash.priceShare', String(priceShare)); } catch (e) {  }
  };
  hs.addEventListener('pointerup', end); hs.addEventListener('pointercancel', end);
  hs.addEventListener('dblclick', e => { e.stopPropagation(); priceShare = 0.3; applyLayout(); try { localStorage.setItem('gexdash.priceShare', '0.3'); } catch (x) {  } });
})();


let sideW = (() => { try { const v = parseInt(localStorage.getItem('gexdash.sidew'), 10); return v >= 280 ? v : 460; } catch (e) { return 460; } })();
function applySide() {
  document.documentElement.style.setProperty('--sidew', sideW + 'px');
  const w = document.body.classList.contains('table-max') || NARROW() ? $('side').clientWidth : sideW;
  document.documentElement.style.setProperty('--tfs', Math.max(11, Math.min(30, w / 38)).toFixed(1) + 'px');
  sig = '';
}
(function () {
  const vs = $('vsplit'); let dragging = false;
  vs.addEventListener('pointerdown', e => { dragging = true; vs.classList.add('drag'); vs.setPointerCapture(e.pointerId); e.preventDefault(); });
  vs.addEventListener('pointermove', e => {
    if (!dragging) return;
    sideW = Math.round(Math.min(window.innerWidth * 0.75, Math.max(280, window.innerWidth - e.clientX - 3)));
    applySide();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; vs.classList.remove('drag');
    try { localStorage.setItem('gexdash.sidew', String(sideW)); } catch (e) {  }
  };
  vs.addEventListener('pointerup', end); vs.addEventListener('pointercancel', end);
})();
function setTableMax(on) {
  document.body.classList.toggle('table-max', on);
  $('sidemax').textContent = on ? '⤡' : '⤢';
  $('sidemax').title = on ? 'Restore (or double-click / Esc)' : 'Expand the table (or double-click it)';
  applySide();
  setTimeout(applySide, 60);
}
$('side').addEventListener('dblclick', () => setTableMax(!document.body.classList.contains('table-max')));
$('sidemax').addEventListener('click', e => { e.stopPropagation(); setTableMax(!document.body.classList.contains('table-max')); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.body.classList.contains('table-max')) setTableMax(false);
  else if (maxPane !== null) setMaximized(null);
});
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && maxPane !== null) setMaximized(null); });
window.addEventListener('resize', () => { applySide(); applyLayout(); });
applySide();




(function () {
  const el = $('chart'); let start = null;
  el.addEventListener('pointerdown', e => {
    if (!chart || e.button !== 0 || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    if (e.clientX - r.left > chart.timeScale().width()) return;
    const vr = candles.priceScale().getVisibleRange();
    if (!vr) return;
    start = { y: e.clientY, from: vr.from, to: vr.to, h: chart.panes()[0].getHeight(), moved: false };
  }, true);
  window.addEventListener('pointermove', e => {
    if (!start) return;
    const dy = e.clientY - start.y;
    if (!start.moved && Math.abs(dy) < 4) return;
    start.moved = true;
    const shift = dy * (start.to - start.from) / Math.max(1, start.h);
    candles.priceScale().setVisibleRange({ from: start.from + shift, to: start.to + shift });
    sig = '';
  });
  const end = () => { start = null; };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  document.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) { e.preventDefault(); resetPriceView(); }
  });
})();
