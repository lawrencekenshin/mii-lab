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
const COARSE = () => window.matchMedia('(pointer: coarse)').matches;
let fsScrollY = 0;
function sizeFs() {
  if (maxPane === null) return;
  const top = $('main').getBoundingClientRect().top + window.scrollY;
  document.documentElement.style.setProperty('--fsh', Math.max(200, Math.round(window.innerHeight - top)) + 'px');
}
function setMaximized(mode) {
  const was = maxPane;
  if (was === null && mode !== null) fsScrollY = window.scrollY;
  maxPane = mode;
  document.body.classList.toggle('expanded', mode !== null);
  document.documentElement.classList.toggle('fs', mode !== null);
  $('gex').style.display = mode === 'di' ? 'none' : '';
  if (mode !== null) window.scrollTo(0, 0);
  sizeFs();
  if (chart) chart.applyOptions({ handleScroll: touchFor('price') });
  if (dchart) dchart.applyOptions({ handleScroll: touchFor('di') });
  applyLayout();
  const fs = document.documentElement.requestFullscreen && (!NARROW() || COARSE());
  if (mode !== null && fs && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  if (mode === null && document.fullscreenElement && !document.body.classList.contains('table-max')) document.exitFullscreen().catch(() => {});
  setTimeout(() => {
    sizeFs(); applyLayout(); sig = '';
    if (mode === null && was !== null) window.scrollTo(0, fsScrollY);
  }, 150);
}


function hookDblClick() {
  chart.subscribeDblClick(() => setMaximized(maxPane === null ? 'price' : null));
  dchart.subscribeDblClick(() => setMaximized(maxPane === null ? 'di' : null));
}
document.addEventListener('gesturestart', e => { if (maxPane !== null) e.preventDefault(); });
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
window.addEventListener('resize', () => { applySide(); sizeFs(); applyLayout(); });
applySide();






(function () {
  [['chart', () => chart], ['dchart', () => dchart]].forEach(([id, get]) => {
    const el = $(id); let pin = null, dragging = false;
    const geo = t => {
      const r = el.getBoundingClientRect();
      return { d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY), x: (t[0].clientX + t[1].clientX) / 2 - r.left };
    };
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 1) { dragging = false; pin = null; return; }
      const c = get();
      if (e.touches.length !== 2 || dragging || !c) { pin = null; return; }
      const g = geo(e.touches), ts = c.timeScale(), r = ts.getVisibleLogicalRange(), a = ts.coordinateToLogical(g.x);
      if (!r || a == null || g.d < 10) return;
      pin = { d: g.d, n: r.to - r.from, a, W: Math.max(1, ts.width()) };
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && !pin) { dragging = true; return; }
      const c = get();
      if (!pin || e.touches.length !== 2 || !c) return;
      const g = geo(e.touches);
      const n = Math.max(6, Math.min(pin.n * 40, pin.n * pin.d / Math.max(10, g.d)));
      const from = pin.a - n * Math.min(Math.max(g.x, 0), pin.W) / pin.W;
      c.timeScale().setVisibleLogicalRange({ from, to: from + n });
    }, { passive: true });
    el.addEventListener('touchend', e => { if (e.touches.length < 2) pin = null; }, { passive: true });
    el.addEventListener('touchcancel', () => { pin = null; }, { passive: true });
  });
})();






(function () {
  const el = $('chart'); let start = null;
  el.addEventListener('pointerdown', e => {
    const touch = e.pointerType === 'touch';
    if (touch && !e.isPrimary) { start = null; return; }
    if (!chart || e.button !== 0 || (touch && maxPane !== 'price')) return;
    const r = el.getBoundingClientRect();
    if (e.clientX - r.left > chart.timeScale().width()) return;
    const vr = candles.priceScale().getVisibleRange();
    if (!vr) return;
    start = { x: e.clientX, y: e.clientY, from: vr.from, to: vr.to, h: chart.panes()[0].getHeight(), moved: false, touch };
  }, true);
  window.addEventListener('pointermove', e => {
    if (!start) return;
    const dy = e.clientY - start.y;
    if (start.touch && !start.moved) {
      const dx = e.clientX - start.x;
      if (Math.hypot(dx, dy) < 10) return;
      if (Math.abs(dy) < 0.6 * Math.abs(dx)) { start = null; return; }
    }
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
