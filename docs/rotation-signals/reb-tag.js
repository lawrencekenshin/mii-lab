

(function () {
  'use strict';
  var me = document.currentScript;
  if (!me) return;
  var base = location.hostname === 'lawrencekenshin.github.io' ? me.getAttribute('data-live') : './snap/';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fd(x) { return MON[+x.slice(5, 7) - 1] + ' ' + (+x.slice(8, 10)); }
  var tag = null;
  function place() {
    var b = document.getElementById('brand');
    if (!tag || !b || b.nextSibling === tag) return;
    b.parentNode.insertBefore(tag, b.nextSibling);
  }
  fetch(base + 'status.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (st) {
    var m = st && st.rebuilt;
    if (!m || !m.frm) return;
    tag = document.createElement('span');
    tag.id = 'rebtag';
    tag.textContent = 'REBUILT \u00b7 OCC open interest' + (m.vols ? ' \u00b7 vols ' + fd(m.vols) : '');
    tag.title = 'From the ' + fd(m.frm) + ' close on, this board rests on GEX Hunt maps rebuilt from OCC open interest and each ' +
      'contract\u2019s last stored implied vol' + (m.vols ? ' (' + fd(m.vols) + ')' : '') + '. Earlier days come from the live chain feed.';
    place();
    var bar = document.getElementById('bar');
    if (bar && window.MutationObserver) new MutationObserver(place).observe(bar, { childList: true });
  }).catch(function () {  });
})();
