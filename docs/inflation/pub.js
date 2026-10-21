





(function () {
  'use strict';
  var IL = window.ILCharts, SP = window.ILSimple, TR = window.ILTrack;
  var RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/inflation-data/inflation/inflation.json';
  var URL_ = location.hostname === 'lawrencekenshin.github.io' ? RAW : 'snap/inflation.json';
  var MODES = ['simple', 'track'];
  var MODE_KEY = 'inflation.public.mode';
  var REFRESH_MS = 10 * 60 * 1000;
  var S = { asset: 'SPY', h: 63, mode: 'simple' };
  var D = null, built = null, refreshers = [];

  var $ = function (id) { return document.getElementById(id); };
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }


  function readHash() {
    var q = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (q.get('asset') === 'SPY' || q.get('asset') === 'QQQ') S.asset = q.get('asset');
    if (q.get('h') === '63' || q.get('h') === '21') S.h = +q.get('h');
    var m = q.get('mode');
    if (m === 'full') m = 'simple';
    if (MODES.indexOf(m) >= 0) S.mode = m;
  }
  function storedMode() { try { var m = window.localStorage.getItem(MODE_KEY); return MODES.indexOf(m) >= 0 ? m : null; } catch (e) { return null; } }
  function saveMode(m) { try { window.localStorage.setItem(MODE_KEY, m); } catch (e) {  } }
  function writeHash() {
    var s = 'mode=' + S.mode + '&asset=' + S.asset + '&h=' + S.h;
    try { history.replaceState(null, '', '#' + s); } catch (e) { location.hash = s; }
  }
  function syncControls() {
    [['cAsset', S.asset], ['cWhen', String(S.h)], ['cMode', S.mode]].forEach(function (p) {
      Array.prototype.forEach.call($(p[0]).querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === p[1] ? 'true' : 'false'); });
    });
  }
  function bodyMode() {
    ['simple', 'full', 'track'].forEach(function (m) { document.body.classList.toggle('m-' + m, S.mode === m); });
  }
  function refreshAll() { refreshers.forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error(e); } }); cueAll(); }
  function bindControls() {
    function seg(id, key, conv) {
      $(id).addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var v = conv ? conv(b.getAttribute('data-v')) : b.getAttribute('data-v');
        if (S[key] === v) return; S[key] = v; writeHash(); syncControls(); refreshAll();
      });
    }
    seg('cAsset', 'asset'); seg('cWhen', 'h', Number);
    $('cMode').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var v = b.getAttribute('data-v'); saveMode(v);
      if (S.mode === v) return; S.mode = v; writeHash(); syncControls(); bodyMode(); window.scrollTo(0, 0); cueAll();
    });
    window.addEventListener('hashchange', function () { readHash(); syncControls(); bodyMode(); refreshAll(); });
  }


  var lastFocus = null;
  function openNote(id, title) {
    var n = (D && D.notes && D.notes[id]) || null, body = $('drBody');
    clear(body);
    var c = h('div', 'note hl');
    c.appendChild(h('h4', '', (n && n.title) || title || ''));
    c.appendChild(h('p', 'def', n && n.def ? n.def : 'No note for this card yet.'));
    body.appendChild(c);
    lastFocus = document.activeElement;
    $('drawer').hidden = false; $('scrim').hidden = false; document.documentElement.classList.add('dr-open');
    $('drClose').focus();
  }
  function closeNote() {
    $('drawer').hidden = true; $('scrim').hidden = true; document.documentElement.classList.remove('dr-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function bindDrawer() {
    $('drClose').addEventListener('click', closeNote);
    $('scrim').addEventListener('click', closeNote);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('drawer').hidden) closeNote(); });
  }


  function naChips(list) {
    if (!list || !list.length) return null;
    var row = h('div', 'na-row');
    list.forEach(function (u) {
      var c = h('div', 'na');
      var t = h('span'); t.appendChild(h('b', '', u.what)); if (u.why) t.appendChild(document.createTextNode(' · ' + u.why)); c.appendChild(t);
      if (u.needed) c.appendChild(h('span', 'na-n', u.needed));
      row.appendChild(c);
    });
    return row;
  }
  var ctx = {
    state: function () { return S; }, color: function (t) { return IL.color(t); }, now: function () { return Date.now(); },
    onRefresh: function (f) { refreshers.push(f); }, naChips: naChips,
    info: function (noteId, title) {
      var b = h('button', 'ib', 'ⓘ'); b.type = 'button'; b.setAttribute('aria-label', 'How ' + title + ' is worked out');
      b.title = 'How this is worked out'; b.addEventListener('click', function () { openNote(noteId, title); }); return b;
    }
  };


  function scrollCue(el) {
    if (!el || el._cue) return; el._cue = true;
    function upd() {
      var max = el.scrollWidth - el.clientWidth;
      el.classList.toggle('fade-r', max > 2 && el.scrollLeft < max - 2);
    }
    el.addEventListener('scroll', upd, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(upd).observe(el);
    upd(); el._cueUpd = upd;
  }
  function cueAll() { Array.prototype.forEach.call(document.querySelectorAll('.table-scroll'), function (e) { scrollCue(e); if (e._cueUpd) e._cueUpd(); }); }


  function bindHeights() {
    var gb = $('gbar'), top = document.querySelector('.top');
    function setH() {
      var th = top ? top.offsetHeight : 0;
      document.documentElement.style.setProperty('--top-h', th + 'px');
      document.documentElement.style.setProperty('--gbar-h', (th + gb.offsetHeight) + 'px');
    }
    setH(); if (window.ResizeObserver) { var ro = new ResizeObserver(setH); ro.observe(gb); if (top) ro.observe(top); }
  }


  function fail(why) {
    var s = $('sline'); s.className = 'sline bad';
    s.textContent = D ? 'Could not refresh (' + why + '); showing the numbers loaded earlier.' : 'Could not load the latest numbers (' + why + '). Try again in a minute.';
  }
  function render() {
    refreshers = [];
    var s = $('sline'); s.className = 'sline'; s.textContent = D.status_line || '';
    SP.mountTop($('forecast'), D.top, ctx);
    SP.mountSimple($('simple'), D.simple, ctx);
    TR.mountTrack($('track'), D.track, ctx);
    refreshAll();
  }
  function getJson(u) {
    return fetch(u, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    });
  }
  function load(first) {
    var p = getJson(URL_);
    if (URL_ !== RAW) p = p.catch(function () { return getJson(RAW); });
    return p.then(function (j) {
      if (!j || j.kind !== 'inflation' || j.schema !== 2) throw new Error('unexpected file');
      if (!first && j.built_utc === built) return;
      D = j; built = j.built_utc; render();
    }, function (e) { fail(String(e && e.message || e)); });
  }
  function boot() {
    S.mode = storedMode() || 'simple';
    readHash(); bodyMode(); bindControls(); bindDrawer(); bindHeights();
    writeHash(); syncControls();
    load(true).then(function () { window.ILPublic.ready = true; });
    setInterval(function () { if (!document.hidden) load(false); }, REFRESH_MS);
  }
  window.ILPublic = { ready: false };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
