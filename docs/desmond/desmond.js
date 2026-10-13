




(function () {
  'use strict';
  var LW = window.LightweightCharts;
  var GH = /(^|\.)github\.io$/i.test(location.hostname);
  var BASE = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/desmond-data/desmond/';
  var URL_MAIN = GH ? BASE + 'desmond.json' : 'snap/desmond.pub.json';
  var URL_LIVE = GH ? BASE + 'live.json' : 'snap/live.pub.json';
  var C = {gold: '#B38618', gold2: '#E3C26B', cyan: '#1E9FC0', cyan2: '#7FD3E6', red: '#E5534B', green: '#2BA88F',
           amber: '#F2B04B', gray: '#8A8E99', text: '#D1D4DC', ink2: '#B2B5BE', line: '#2A2E39', bg: '#131722'};
  var RECENT = 30;
  var S = null, D = [], IDX = {}, mode = 'full', range = '3y', era = '2021';
  var chart = null, priceSeries = null, paneLabels = [];
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var f1 = function (x) { return x == null ? '–' : x.toFixed(1); };
  var f2 = function (x) { return x == null ? '–' : x.toFixed(2); };
  var pct = function (x) { return x == null ? '–' : x.toFixed(1) + '%'; };
  var sgn = function (x) { return x == null ? '–' : (x > 0 ? '+' : '') + x.toFixed(1) + '%'; };
  var cls = function (x) { return x == null ? '' : (x >= 0 ? 'pos' : 'neg'); };
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function nice(d, withDay) {
    if (!d) return '–';
    var p = d.split('-'), dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return (withDay ? WD[dt.getUTCDay()] + ' ' : '') + MO[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
  }
  function M() { return S.modes[mode]; }
  function isProxy() { return mode !== 'full'; }
  function lastIdx() { var t = M().state.through; return t && IDX[t] != null ? IDX[t] : D.length - 1; }
  function d90bit() { return isProxy() ? 16 : 1; }
  function u90bit() { return isProxy() ? 32 : 2; }
  function bit(i, b) { return (S.series.f[i] & b) !== 0; }
  function narrow() { return window.matchMedia('(max-width: 719px)').matches; }


  function scale(a, k) { return a.map(function (x) { return x == null ? null : x / k; }); }
  function rest(a) { return a.map(function (x) { return x == null ? null : (10000 - x) / 100; }); }
  function valid(p) {
    return p && p.kind === 'desmond' && p.schema === 2 && p.view && p.view.n > 1 && p.view.dd.length === p.view.n - 1 &&
      p.modes && p.modes.full && p.modes.proxy;
  }
  function decode(p) {
    var v = p.view, n = v.n, d = new Array(n), t = Date.UTC(+v.d0.slice(0, 4), +v.d0.slice(5, 7) - 1, +v.d0.slice(8, 10));
    d[0] = v.d0;
    for (var i = 1; i < n; i++) { t += v.dd[i - 1] * 864e5; d[i] = new Date(t).toISOString().slice(0, 10); }
    var st = new Array(n);
    for (var k = 0; k < n; k++) st[k] = 0;
    v.gap.forEach(function (g) { st[g[0]] = g[1]; });
    p.series = {d: d, spy: scale(v.spy, 100), uvol: scale(v.uvol, 100), upts: scale(v.upts, 100), dvol: rest(v.uvol),
                dpts: rest(v.upts), c: scale(v.c, 10), f: v.f, st: st, nl: v.nl, nm: v.nm, nu: v.nu, nd: v.nd,
                a_pg: scale(v.a_pg, 10), a_pl: scale(v.a_pl, 10), a_uv: scale(v.a_uv, 10), a_dv: scale(v.a_dv, 10),
                age: {full: v.age_f, proxy: v.age_p}};
    return p;
  }
  fetch(URL_MAIN, {cache: 'no-cache'}).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (p) {
    if (!valid(p)) throw new Error('unexpected file');
    init(decode(p));
  }).catch(function (e) {
    $('chip').className = 'chip chip-error'; $('chip').textContent = 'NO DATA';
    $('asof').textContent = 'The data could not be loaded (' + e.message + ').';
  });

  var LIVE = null;
  function pollLive() {
    fetch(URL_LIVE, {cache: 'no-cache'}).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { LIVE = j && j.kind === 'desmond_live' && j.schema === 2 ? j : null; renderLive(); })
      .catch(function () { LIVE = null; renderLive(); });
  }
  var READ = {full: {down90: '90% down day so far', up90: '90% up day so far', up80: '80% up day so far', none: 'no extreme so far'},
              proxy: {down90: '90% down-volume day so far', up90: '90% up-volume day so far', none: 'no volume extreme so far'}};
  function renderLive() {
    var el = $('live');
    if (!S || !LIVE || !LIVE.session || LIVE.session <= S.asof) { el.hidden = true; return; }
    var age = (Date.now() - Date.parse(LIVE.built_utc)) / 6e4;
    var P = isProxy(), stale = !(age < 40);
    var reading = READ[mode][LIVE.read[mode]] || '';
    var score = (!P && LIVE.ps != null) ? ' · panic score <b>' + LIVE.ps.toFixed(1) + '</b>' +
      (LIVE.tag === 'panic' ? ' (panic)' : LIVE.tag === 'near' ? ' <span class="warn">(near panic, our line)</span>' : '') : '';
    var w = (LIVE.would || {})[mode], would = '';
    if (w && w.t === 'confirmed') would = '<b>If the close holds: ' + (P ? 'volume recovery' : 'demand confirmed') + '</b> (day ' + w.age + ' of the panic window, ' + w.why.map(reasonName).join(' + ') + ').';
    else if (w) would = '<b>If the close holds: a panic window ' + (w.t === 'opened' ? 'opens' : 'restarts') + '.</b>';
    el.hidden = false;
    el.innerHTML = '<div class="lh"><span class="chip chip-amber">LIVE · SO FAR TODAY</span><b>' + nice(LIVE.session, true) + ' so far</b>' +
      '<span>' + esc(LIVE.asof_et) + ' ET · 15-min delayed</span>' + (stale ? '<span class="warn">not updated for ' + Math.round(age) + ' min</span>' : '') + '</div>' +
      '<div class="nums"><span>Up vol <b>' + pct(LIVE.uvol) + '</b> / down ' + pct(LIVE.dvol) + '</span>' +
      (P ? '' : '<span>Up pts <b>' + pct(LIVE.upts) + '</b> / down ' + pct(LIVE.dpts) + '</span>') +
      '<span>' + reading + score + '</span><span>' + LIVE.counted.toLocaleString() + ' of ' + LIVE.listed.toLocaleString() + ' stocks traded</span></div>' +
      (would ? '<div>' + would + '</div>' : '') +
      '<div class="muted">Today\'s numbers so far. The final reading replaces them after the close (about 17:45 ET).</div>';
  }

  function init(snap) {
    S = snap; D = S.series.d;
    D.forEach(function (d, i) { IDX[d] = i; });
    wire();
    renderAll();
    pollLive();
    setInterval(pollLive, 60000);
    window.DESMOND = S;
    document.dispatchEvent(new Event('desmond:ready'));
  }

  function wire() {
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { mode = b.dataset.mode; press('[data-mode]', b); renderAll(); });
    });
    document.querySelectorAll('[data-range]').forEach(function (b) {
      b.addEventListener('click', function () { range = b.dataset.range; press('[data-range]', b); applyRange(); setMarkers(); });
    });
    document.querySelectorAll('[data-era]').forEach(function (b) {
      b.addEventListener('click', function () { era = b.dataset.era; press('[data-era]', b); renderEpisodes(); });
    });
    ['tgAgree', 'tgAvg', 'tgBands'].forEach(function (id) { $(id).addEventListener('change', renderChart); });
    if (window.matchMedia('(max-width: 719px)').matches) $('tgAgree').checked = false;
  }
  function press(sel, el) { document.querySelectorAll(sel).forEach(function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); }); }

  function renderAll() { renderStatus(); renderLive(); renderChart(); renderEpisodes(); renderYears(); renderHow(); }


  function stocks() { return S.n_names.toLocaleString() + ' NYSE-listed stocks of the Russell 3000 (today\'s members)'; }
  function renderStatus() {
    var st = M().state, i = lastIdx(), sr = S.series;
    var chip = $('chip');
    var ageDays = (Date.now() - Date.parse(S.asof + 'T21:00:00Z')) / 864e5;
    if (ageDays > 4.5) { chip.className = 'chip chip-amber'; chip.textContent = 'STALE'; }
    else { chip.className = 'chip chip-ok'; chip.textContent = 'FINAL'; }
    var built = new Date(S.built_utc);
    var et = built.toLocaleString('en-US', {timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
    $('asof').textContent = 'Data through the ' + nice(S.asof, true) + ' close · built ' + et + ' ET';
    $('modeLine').innerHTML = isProxy()
      ? '<b style="color:var(--amber)">Volume only</b>: the same ' + S.n_names.toLocaleString() + ' stocks, volume shares only, points left out. It can never confirm a full Desmond day.'
      : 'Both shares must qualify: up volume <i>and</i> up points. Built from ' + stocks() + '.';


    var a = $('answer'), lc = st.last_conf, txt, klass = 'answer';
    var demandWord = isProxy() ? 'Volume recovery' : 'Demand confirmed';
    var d90 = isProxy() ? '90% down-volume day' : '90% down day';
    if (st.armed) {
      klass += ' armed';
      txt = '<b>Selling hit an extreme.</b> Panic window open since ' + nice(st.opened) + (st.n_panic > 1 ? ' (' + st.n_panic + ' panic days, a cluster)' : '') +
        '; latest ' + d90 + ' ' + nice(st.latest_panic) + '. Day <b>' + st.age + '</b> of the window. ' +
        'Waiting for demand: a 90% up day' + (isProxy() ? '' : ' or two 80% up days in a row') + '.';
    } else if (lc && IDX[lc.d] != null && i - IDX[lc.d] <= RECENT) {
      klass += ' confirmed';
      txt = '<b>' + demandWord + '</b> on ' + nice(lc.d) + ', day ' + lc.age + ' after the last panic day (' + lc.why.map(reasonName).join(' + ') + '). The window is used up; a new 90% down day is needed to open another.';
    } else {
      txt = '<b>No panic window open.</b> Last ' + d90 + ': ' + (st.latest_panic ? nice(st.latest_panic) + ' (' + (i - IDX[st.latest_panic]) + ' sessions ago)' : 'none in this history') +
        '. Last ' + demandWord.toLowerCase() + ': ' + (lc ? nice(lc.d) : 'none') + '.';
    }
    if (isProxy()) klass += ' proxy';
    a.className = klass;
    a.innerHTML = txt + '<span class="q">The two questions: has selling become extreme? Has strong demand appeared afterward?</span>';


    var uv = sr.uvol[i], up = sr.upts[i], cv = sr.c[i];
    var t = [];
    t.push(tile('Data date', nice(D[i], true), 'Final (end of day)'));
    t.push(tile('Up-volume share', pct(uv), 'Down ' + pct(sr.dvol[i]) + bar(uv, C.gold)));
    t.push(isProxy() ? tile('Up-points share', 'not used', 'Volume only leaves points out') :
      tile('Up-points share', pct(up), 'Down ' + pct(sr.dpts[i]) + bar(up, C.cyan)));
    t.push(isProxy() ? tile('Volume reading', bit(i, u90bit()) ? '90% up volume' : (bit(i, d90bit()) ? '90% down volume' : 'neither'), 'Today\'s volume share against the 90% rule') :
      tile('Agreement', bit(i, 8) ? 'Mixed' : f1(cv), bit(i, 8) ? 'Volume and points disagree' : 'How far volume and points agree, −100 to +100'));
    t.push(tile('Panic window', st.armed ? 'Open · day ' + st.age : 'None open', st.armed ? 'Opened ' + nice(st.opened) : 'No panic window open'));
    t.push(tile('Latest panic day', st.latest_panic ? nice(st.latest_panic) : 'none', st.latest_panic ? (i - IDX[st.latest_panic]) + ' sessions ago' : ''));
    t.push(tile('Latest ' + (isProxy() ? 'volume recovery' : 'confirmation'), lc ? nice(lc.d) : 'none', lc ? 'Day ' + lc.age + ' · ' + lc.why.map(reasonName).join(' + ') : ''));
    var nl = sr.nl[i], nm = sr.nm[i];
    t.push(tile('Coverage', (nl - nm).toLocaleString() + ' of ' + nl.toLocaleString(), nm + ' missing · ' + (S.series.st[i] ? 'INCOMPLETE' : 'complete')));
    $('tiles').innerHTML = t.join('');
  }
  function tile(k, v, s) { return '<div class="tile"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div><div class="s">' + (s || '') + '</div></div>'; }
  function bar(v, col) {
    if (v == null) return '';
    var L = S.ln.share;
    return '<div class="bar2"><div class="track"><div class="fill" style="width:' + Math.max(0, Math.min(100, v)) + '%;background:' + col + '"></div>' +
      [L.down90, L.up80, L.up90].map(function (x) { return '<div class="tick" style="left:' + x + '%"></div>'; }).join('') + '</div></div>';
  }
  function reasonName(r) { return r === 'up90' ? (isProxy() ? '90% up-volume day' : '90% up day') : r === 'up80_pair' ? 'two 80% up days' : r; }


  function renderChart() {
    var keep = chart ? chart.timeScale().getVisibleRange() : null;
    if (chart) { chart.remove(); chart = null; }
    paneLabels.forEach(function (el) { el.remove(); });
    paneLabels = [];
    var el = $('chart'), sr = S.series;
    var showAgree = $('tgAgree').checked, showAvg = $('tgAvg').checked, showBands = $('tgBands').checked;
    chart = LW.createChart(el, {
      autoSize: true,
      layout: {background: {type: 'solid', color: C.bg}, textColor: C.ink2, fontSize: 11, attributionLogo: false,
               panes: {separatorColor: C.line, separatorHoverColor: '#3a3f4b', enableResize: true}},
      grid: {vertLines: {color: 'rgba(42,46,57,0.35)'}, horzLines: {color: 'rgba(42,46,57,0.35)'}},
      rightPriceScale: {borderColor: C.line},
      timeScale: {borderColor: C.line, rightOffset: 4, minBarSpacing: 0.05},
      crosshair: {mode: LW.CrosshairMode.Normal},
      handleScroll: {vertTouchDrag: false}
    });
    var pane = 0, labels = [['Price · SPY', 0]];

    priceSeries = chart.addSeries(LW.LineSeries, {color: C.text, lineWidth: 1.5, priceLineVisible: false, title: 'SPY'}, 0);
    priceSeries.setData(D.map(function (d, i) { return sr.spy[i] == null ? {time: d} : {time: d, value: sr.spy[i]}; }));
    if (showBands) {
      var band = chart.addSeries(LW.HistogramSeries, {priceScaleId: 'band', priceLineVisible: false, lastValueVisible: false}, 0);
      band.priceScale().applyOptions({scaleMargins: {top: 0, bottom: 0}, visible: false});
      band.setData(bandData());
    }

    pane += 1; labels.push([isProxy() ? 'Up-volume share % (volume only uses this alone)' : 'Up-volume share (gold) · up-points share (cyan), %', pane]);
    var uvS = chart.addSeries(LW.LineSeries, {color: C.gold, lineWidth: 2, priceLineVisible: false, title: 'UVol'}, pane);
    uvS.setData(line(sr.uvol));
    var upS = null;
    if (!isProxy()) {
      upS = chart.addSeries(LW.LineSeries, {color: C.cyan, lineWidth: 2, priceLineVisible: false, title: 'UPts'}, pane);
      upS.setData(line(sr.upts));
    }
    var fixed = function () { return {priceRange: {minValue: 0, maxValue: 100}}; };
    uvS.applyOptions({autoscaleInfoProvider: fixed});
    uvS.priceScale().applyOptions({scaleMargins: {top: 0.06, bottom: 0.04}});
    if (upS) upS.applyOptions({autoscaleInfoProvider: fixed});
    var L = S.ln.share;
    [[L.up90, C.green, '90% up day'], [L.up80, C.gold2, '80% up day'], [L.even, C.gray, 'even'], [L.down90, C.red, '90% down day']].forEach(function (g) {
      uvS.createPriceLine({price: g[0], color: g[1], lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: !narrow() || g[0] !== L.even,
                           title: narrow() ? '' : g[2]});
    });

    if (showAgree && !isProxy()) {
      pane += 1; labels.push(['Agreement (our display, not Lowry\'s oscillator): how far volume and points agree', pane]);
      var ag = chart.addSeries(LW.HistogramSeries, {priceLineVisible: false, lastValueVisible: false, title: 'Agree'}, pane);
      ag.setData(D.map(function (d, i) {
        var v = sr.c[i];
        if (v == null) return {time: d};
        var col = bit(i, 2) ? C.green : bit(i, 4) ? 'rgba(43,168,143,0.55)' : bit(i, 1) ? C.red : 'rgba(138,142,153,0.55)';
        return {time: d, value: v, color: col};
      }));
      ag.applyOptions({autoscaleInfoProvider: function () { return {priceRange: {minValue: -100, maxValue: 100}}; }});
      var A = S.ln.agree;
      [[A.up90, C.green], [A.up80, C.gold2], [A.down90, C.red]].forEach(function (g) {
        ag.createPriceLine({price: g[0], color: g[1], lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: false, title: ''});
      });
    }

    if (showAvg) {
      if (!isProxy()) {
        pane += 1; labels.push(['30-day avg points gained (solid) / lost (dashed), $ points', pane]);
        chart.addSeries(LW.LineSeries, {color: C.cyan, lineWidth: 2, priceLineVisible: false, title: 'PG30'}, pane).setData(line(sr.a_pg));
        chart.addSeries(LW.LineSeries, {color: C.cyan2, lineWidth: 2, lineStyle: LW.LineStyle.Dashed, priceLineVisible: false, title: 'PL30'}, pane).setData(line(sr.a_pl));
      }
      pane += 1; labels.push(['30-day avg up volume (solid) / down volume (dashed), M shares', pane]);
      chart.addSeries(LW.LineSeries, {color: C.gold, lineWidth: 2, priceLineVisible: false, title: 'UV30'}, pane).setData(line(sr.a_uv));
      chart.addSeries(LW.LineSeries, {color: C.gold2, lineWidth: 2, lineStyle: LW.LineStyle.Dashed, priceLineVisible: false, title: 'DV30'}, pane).setData(line(sr.a_dv));
    }
    var panes = chart.panes();
    panes[0].setStretchFactor(3);
    for (var p = 1; p < panes.length; p++) panes[p].setStretchFactor(p === 1 ? 1.5 : 1);
    setMarkers();
    renderLegend(showAgree && !isProxy(), showAvg);
    chart.subscribeCrosshairMove(function (param) { readout(param && param.time ? timeKey(param.time) : null); });
    if (keep) chart.timeScale().setVisibleRange(keep); else applyRange();
    readout(null);
    requestAnimationFrame(function () { placePaneLabels(labels); });
    chart.timeScale().subscribeSizeChange && chart.timeScale().subscribeSizeChange(function () { placePaneLabels(labels); });
    $('chartNote').innerHTML = 'Markers: ▼ D90 = 90% down day · ▲ U90 = 90% up day · ● 2×U80 = second of two 80% up days · ■ ' +
      (isProxy() ? 'VOL RECOVERY = a 90% up-volume day inside the panic window' : 'DEMAND = demand confirmed after a panic day') +
      '. Bands: red = panic window open, green = ended by demand, amber = ran out of time, gray = data gap. ' +
      'Markers sit on the session that was measured; its data were final about 17:45 ET that evening.';
  }
  function line(arr) { return D.map(function (d, i) { return arr[i] == null ? {time: d} : {time: d, value: arr[i]}; }); }
  function timeKey(t) {
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return new Date(t * 1000).toISOString().slice(0, 10);
    return t.year + '-' + String(t.month).padStart(2, '0') + '-' + String(t.day).padStart(2, '0');
  }
  function bandData() {
    var col = {confirmed: 'rgba(43,168,143,0.13)', expired: 'rgba(242,176,75,0.11)', interrupted: 'rgba(138,142,153,0.16)', active: 'rgba(229,83,75,0.16)'};
    var out = D.map(function (d) { return {time: d}; });
    M().episodes.forEach(function (ep) {
      var a = IDX[ep.opened], b = ep.end_session ? IDX[ep.end_session] : lastIdx();
      if (a == null || b == null) return;
      for (var k = a; k <= b; k++) out[k] = {time: D[k], value: 1, color: col[ep.end] || col.active};
    });
    return out;
  }
  function setMarkers() {
    if (!priceSeries) return;
    var dense = range === 'all' || range === '2013' || narrow();
    var P = isProxy(), mk = [], byDay = {};
    M().events.forEach(function (e) { (byDay[e.d] = byDay[e.d] || []).push(e); });
    Object.keys(byDay).sort().forEach(function (d) {
      var types = {};
      byDay[d].forEach(function (e) { types[e.t] = e; });
      if (types.down90) mk.push({time: d, position: 'aboveBar', shape: 'arrowDown', color: C.red, text: dense ? '' : (P ? 'D90v' : 'D90'), size: 1});
      if (types.confirmed) {
        mk.push({time: d, position: 'belowBar', shape: 'square', color: P ? C.amber : C.green, size: 2, text: P ? 'VOL RECOVERY' : 'DEMAND'});
      } else if (types.up90) {
        mk.push({time: d, position: 'belowBar', shape: 'arrowUp', color: C.green, text: dense ? '' : (P ? 'U90v' : 'U90'), size: 1});
      } else if (types.pair80) {
        mk.push({time: d, position: 'belowBar', shape: 'circle', color: C.green, text: dense ? '' : '2×U80', size: 1});
      }
      if (types.expired) mk.push({time: d, position: 'aboveBar', shape: 'circle', color: C.amber, text: dense ? '' : 'ran out', size: 0.6});
      if (types.gap) mk.push({time: d, position: 'aboveBar', shape: 'circle', color: C.gray, text: dense ? '' : 'data gap', size: 0.6});
    });
    if (priceSeries._mk) priceSeries._mk.setMarkers(mk);
    else priceSeries._mk = LW.createSeriesMarkers(priceSeries, mk);
  }
  function applyRange() {
    if (!chart) return;
    var last = D[D.length - 1], from;
    if (range === 'all') { chart.timeScale().fitContent(); return; }
    if (range === '2013') from = '2013-01-02';
    else {
      var y = +last.slice(0, 4) - (range === '1y' ? 1 : 3);
      from = y + last.slice(4);
    }
    chart.timeScale().setVisibleRange({from: from, to: last});
  }
  function placePaneLabels(labels) {
    paneLabels.forEach(function (x) { x.remove(); });
    paneLabels = [];
    if (!chart) return;
    var panes = chart.panes(), y = 0, box = $('chart');
    var tops = panes.map(function (p) { var t = y; y += p.getHeight() + 1; return t; });
    labels.forEach(function (lb) {
      var div = document.createElement('div');
      div.className = 'pane-label';
      div.style.top = (tops[lb[1]] + 4) + 'px';
      div.textContent = lb[0];
      box.appendChild(div);
      paneLabels.push(div);
    });
  }
  function renderLegend(agree, avg) {
    var P = isProxy(), h = [];
    h.push('<span><i class="lg-ln" style="border-color:' + C.text + '"></i>SPY close</span>');
    h.push('<span><i class="lg-ln" style="border-color:' + C.gold + '"></i>Up-volume share</span>');
    if (!P) h.push('<span><i class="lg-ln" style="border-color:' + C.cyan + '"></i>Up-points share</span>');
    if (agree) h.push('<span><i class="lg-sq" style="background:' + C.green + '"></i><i class="lg-sq" style="background:' + C.red + '"></i>Agreement</span>');
    h.push('<span class="lg-mk" style="color:' + C.red + '">▼ ' + (P ? 'D90v' : 'D90') + '</span>');
    h.push('<span class="lg-mk" style="color:' + C.green + '">▲ ' + (P ? 'U90v' : 'U90') + '</span>');
    if (!P) h.push('<span class="lg-mk" style="color:' + C.green + '">● 2×U80</span>');
    h.push('<span class="lg-mk" style="color:' + (P ? C.amber : C.green) + '">■ ' + (P ? 'Volume recovery' : 'Demand confirmed') + '</span>');
    $('legend').innerHTML = h.join('');
  }
  function readout(d) {
    var i = d != null && IDX[d] != null ? IDX[d] : lastIdx();
    var sr = S.series, P = isProxy();
    var parts = ['<span class="d">' + nice(D[i], true) + '</span>',
      'SPY ' + f2(sr.spy[i]),
      'Up vol <b style="color:' + C.gold2 + '">' + pct(sr.uvol[i]) + '</b> / down ' + pct(sr.dvol[i])];
    if (!P) {
      parts.push('Up pts <b style="color:' + C.cyan2 + '">' + pct(sr.upts[i]) + '</b> / down ' + pct(sr.dpts[i]));
      parts.push(bit(i, 8) ? 'Agreement 0 · <b>volume and points disagree</b>' : 'Agreement ' + f1(sr.c[i]));
    }
    if (sr.st[i] && !(P && sr.uvol[i] != null)) parts.push('<b style="color:var(--amber)">' + esc(S.status[String(sr.st[i])] || 'data gap') + '</b>');
    var age = sr.age[mode][i];
    parts.push(age != null ? 'Panic window day ' + age : 'No panic window');
    parts.push((sr.nl[i] - sr.nm[i]).toLocaleString() + '/' + sr.nl[i].toLocaleString() + ' stocks (' + sr.nu[i] + ' up, ' + sr.nd[i] + ' down)');
    var evh = M().events.filter(function (e) { return e.d === D[i]; }).map(evText).filter(Boolean).join(' · ');
    $('readout').innerHTML = '<div class="row1">' + parts.map(function (p) { return '<span>' + p + '</span>'; }).join('') + '</div>' +
      (evh ? '<span class="ev">' + evh + '</span>' : '<span class="ev muted">No events this session.</span>');
  }
  function evText(e) {
    var P = isProxy();
    switch (e.t) {
      case 'down90': return tag(C.red, P ? 'D90v' : 'D90') + 'selling extreme';
      case 'up90': return tag(C.green, P ? 'U90v' : 'U90') + 'buying extreme';
      case 'pair80': return tag(C.green, '2×U80') + 'second 80% up day in a row';
      case 'opened': return 'panic window opened';
      case 'refreshed': return 'panic window restarted, panic day #' + e.n;
      case 'confirmed': return tag(P ? C.amber : C.green, P ? 'VOL RECOVERY' : 'DEMAND') + (P ? 'Volume recovery' : 'Demand confirmed') + ': day ' + e.age + ', ' + e.why.map(reasonName).join(' + ') +
        ', window opened ' + nice(e.since) + ' (' + e.n + ' panic day' + (e.n > 1 ? 's' : '') + ')';
      case 'expired': return tag(C.amber, 'RAN OUT') + 'no demand in time';
      case 'gap': return tag(C.gray, 'DATA GAP') + 'panic window interrupted (' + esc(e.why) + ')';
    }
    return '';
  }
  function tag(col, t) { return '<span class="tag" style="color:' + col + '">' + t + '</span>'; }


  function eraStart() { return era === 'all' ? '0000' : era === '2013' ? '2013-01-01' : '2021-01-01'; }
  function median(a) { a = a.filter(function (x) { return x != null; }).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function baseline(h, from) {
    var sp = S.series.spy, out = [], last = lastIdx();
    for (var i = 0; i + h <= last; i++) if (D[i] >= from && sp[i] != null && sp[i + h] != null) out.push(100 * (sp[i + h] / sp[i] - 1));
    return median(out);
  }
  function renderEpisodes() {
    var from = eraStart(), P = isProxy();
    var eps = M().episodes.filter(function (e) { return e.opened >= from; }).slice().reverse();
    var conf = eps.filter(function (e) { return e.end === 'confirmed'; });
    var nl = conf.filter(function (e) { return e.new_low_check_complete; });
    var nlYes = nl.filter(function (e) { return e.new_low_within_60; }).length;
    var s = [];
    s.push(tile('Panic episodes', eps.length, conf.length + ' confirmed · ' + eps.filter(function (e) { return e.end === 'expired'; }).length + ' ran out of time · ' +
      eps.filter(function (e) { return e.end === 'interrupted'; }).length + ' data gap'));
    s.push(tile('SPY 20 sessions after', sgn(median(conf.map(function (e) { return e.fwd_20; }))), 'median after confirmations · all days ' + sgn(baseline(20, from))));
    s.push(tile('SPY 60 sessions after', sgn(median(conf.map(function (e) { return e.fwd_60; }))), 'median after confirmations · all days ' + sgn(baseline(60, from))));
    s.push(tile('Lower low later', nl.length ? nlYes + ' of ' + nl.length : '–', 'SPY closed below the panic-window low within 60 sessions after confirming'));
    $('epSummary').innerHTML = s.join('');
    var head = '<thead><tr><th class="l">Opened</th><th>Panic days</th><th class="l">Ended</th><th class="l">Confirmed</th><th>Day</th><th class="l">Why</th>' +
      '<th>Up vol / pts at confirm</th><th>SPY +5</th><th>+10</th><th>+20</th><th>+60</th><th>Worst 20</th><th class="l">Lower low ≤60?</th></tr></thead>';
    var rows = eps.map(function (e) {
      var why = e.reasons ? e.reasons.map(reasonName).join(' + ') : '';
      var endName = e.end === 'confirmed' ? (P ? 'recovery' : 'demand') : e.end === 'interrupted' ? 'data gap' : e.end === 'expired' ? 'ran out' : e.end || 'open';
      return '<tr data-d="' + e.opened + '"><td>' + nice(e.opened) + '</td><td>' + e.n_panic + (e.n_panic > 1 ? ' ⧉' : '') + '</td>' +
        '<td class="l"><span class="end end-' + (e.end || 'active') + '">' + endName + '</span></td><td class="l">' + (e.confirmed ? nice(e.confirmed) : (e.end_session ? '<span class="muted">' + nice(e.end_session) + '</span>' : '–')) + '</td>' +
        '<td>' + (e.age != null ? e.age : '–') + '</td><td class="l">' + why + '</td>' +
        '<td>' + (e.uvol != null ? f1(e.uvol) + ' / ' + (P ? '–' : f1(e.upts)) : '–') + '</td>' +
        ['fwd_5', 'fwd_10', 'fwd_20', 'fwd_60', 'mae_20'].map(function (k) { return '<td class="' + cls(e[k]) + '">' + sgn(e[k]) + '</td>'; }).join('') +
        '<td class="l">' + (e.new_low_within_60 == null ? '–' : (e.new_low_within_60 ? 'yes' : 'no') + (e.new_low_check_complete ? '' : ' (so far)')) + '</td></tr>';
    });
    $('epTable').innerHTML = head + '<tbody>' + (rows.join('') || '<tr><td colspan="13">No episodes in this era.</td></tr>') + '</tbody>';
    $('epTable').querySelectorAll('tbody tr[data-d]').forEach(function (tr) {
      tr.addEventListener('click', function () { focusDate(tr.dataset.d); });
    });
    $('epNote').innerHTML = '⧉ = a cluster of two or more panic days. "Day" = the session of the panic window on which demand confirmed. ' +
      '"Worst 20" = lowest SPY close in the next 20 sessions vs the confirmation close. Click a row to jump the chart there.';
  }
  function focusDate(d) {
    var i = IDX[d];
    if (i == null || !chart) return;
    var a = D[Math.max(0, i - 40)], b = D[Math.min(D.length - 1, i + 80)];
    press('[data-range]', null); range = 'custom'; setMarkers();
    chart.timeScale().setVisibleRange({from: a, to: b});
    $('charts').scrollIntoView({behavior: 'smooth'});
    readout(d);
  }


  function renderYears() {
    var conf = {}, rec = {};
    S.modes.full.episodes.forEach(function (e) { if (e.confirmed) conf[e.confirmed.slice(0, 4)] = (conf[e.confirmed.slice(0, 4)] || 0) + 1; });
    S.modes.proxy.episodes.forEach(function (e) { if (e.confirmed) rec[e.confirmed.slice(0, 4)] = (rec[e.confirmed.slice(0, 4)] || 0) + 1; });
    var ys = Object.keys(S.by_year).sort().reverse();
    var h = '<thead><tr><th class="l">Year</th><th>Sessions</th><th>D90</th><th>U90</th><th>2×U80 runs</th><th>Demand confirmed</th>' +
      '<th>Volume-only D90v</th><th>Volume-only U90v</th><th>Volume recovery</th><th>No data</th></tr></thead><tbody>';
    ys.forEach(function (y) {
      var b = S.by_year[y];
      h += '<tr><td>' + y + '</td><td>' + b.sessions + '</td><td>' + b.down90 + '</td><td>' + b.up90 + '</td><td>' + b.pair_starts + '</td><td>' + (conf[y] || 0) +
        '</td><td>' + b.proxy_down90 + '</td><td>' + b.proxy_up90 + '</td><td>' + (rec[y] || 0) + '</td><td>' + (b.unavailable || '') + '</td></tr>';
    });
    $('yrTable').innerHTML = h + '</tbody>';
  }


  function renderHow() {
    $('howRules').innerHTML = '<h3>The rules</h3><ul>' +
      '<li><b>90% down day (D90)</b>: down-volume share ≥ 90% <i>and</i> down-points share ≥ 90%. Both must qualify; an average of the two never counts. <span class="prov prov-pub">PUBLISHED</span></li>' +
      '<li><b>90% up day (U90)</b>: up-volume share ≥ 90% and up-points share ≥ 90%. <span class="prov prov-pub">PUBLISHED</span></li>' +
      '<li><b>80% up day</b>: both upside shares ≥ 80%; two in a row (back-to-back exchange sessions) also count as demand. A 90% up day is also an 80% day. <span class="prov prov-int">INTERPRETED</span></li>' +
      '<li><b>Demand confirmed</b>: the first 90% up day or 80% pair inside the panic window that follows the latest 90% down day. One confirmation per episode; another 90% down day inside the window restarts it. <span class="prov prov-eng">ENGINEERING CHOICE</span></li>' +
      '<li><b>Window end and data gaps</b>: the window closes when about six weeks pass with no demand (the paper notes panic days often come that far apart); a missing or bad session closes it too, and a fresh 90% down day is needed. <span class="prov prov-eng">ENGINEERING CHOICE</span></li>' +
      '<li><b>Shares</b> = 100 × up ÷ (up + down). Unchanged stocks are left out. Points are dollar price changes per stock, summed (not % moves, not an index). <span class="prov prov-pub">PUBLISHED</span></li></ul>';
    $('howLabels').innerHTML = '<h3>Reading the panels</h3><ul>' +
      '<li><b>Component shares</b> (default panel): both lines on or above the top dashed line = U90; both on or below the bottom one = D90. The 80% line belongs only to the interpreted upside rule. Gaps = no data.</li>' +
      '<li><b>Agreement</b>: our own picture of how far volume and points agree, from −100 (all selling) to +100 (all buying), and 0 ("mixed") when they point opposite ways. ' +
      'Not the Lowry Intensity Oscillator (its formula is not published). The dashed lines mark where a 90% up day, an 80% up day and a 90% down day sit. <span class="prov prov-eng">DERIVED</span></li>' +
      '<li><b>30-day averages</b>: Lowry\'s published component averages (points gained / lost; up / down volume), each needing 30 straight valid sessions. Context only; they never change the daily flags. <span class="prov prov-pub">PUBLISHED</span></li>' +
      '<li><b>Volume only</b>: the same idea with volume alone (90% up or down volume), with its own history and labels; it can never confirm a Desmond day. <span class="prov prov-sub">PROXY</span></li>' +
      '<li><b>Timing</b>: a marker sits on the measured session. Its data are final about 17:45 ET that evening; nothing here was knowable at that day\'s close.</li></ul>';
    $('dataPanel').innerHTML = '<h3>Data</h3><dl class="kv">' +
      kv('Stocks', stocks() + '; earlier years include only stocks still listed today. Each stock joins on its second session in the data.') +
      kv('Inputs', 'daily close and whole-session share volume of each stock (consolidated volume)') +
      kv('Splits', 'undone, so each day keeps its real dollar weights; a split never counts as a gain or loss') +
      kv('Dividends', 'not adjusted: an ex-dividend drop counts as a price change') +
      kv('Coverage', 'a session counts only when nearly every listed stock has a bar; otherwise it is a data gap' +
         (S.partial ? ' (' + S.partial + ' in the history)' : ' (none in the history)')) +
      kv('Price chart', 'SPY close, split-adjusted, not dividend-adjusted') +
      kv('History', nice(S.first) + ' to ' + nice(S.asof)) + '</dl>';
    $('footData').textContent = 'End-of-day data, derived values only. Built ' + S.built_utc.replace('T', ' ').replace('Z', ' UTC') + '.';
  }
  function kv(k, v) { return '<dt>' + k + '</dt><dd>' + v + '</dd>'; }
})();
