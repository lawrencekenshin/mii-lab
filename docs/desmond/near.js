




(function () {
  'use strict';
  var LW = window.LightweightCharts;
  var URL_NEAR = /(^|\.)github\.io$/i.test(location.hostname)
    ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/desmond-data/desmond/near.json' : 'snap/near.pub.json';
  var C = {red: '#E5534B', amber: '#F2B04B', green: '#2BA88F', gray: '#8A8E99', text: '#D1D4DC', ink2: '#B2B5BE',
           line: '#2A2E39', bg: '#131722', gold2: '#E3C26B'};
  var ROW = {lowest: 'Lowest line', lower: 'Lower line', near: 'Near-panic line (ours)', higher: 'Higher line', panic: 'Desmond\'s panic day'};
  var N = null, S = null, chart = null, spyS = null, range = '2026', K = null, P = null, Q = null;
  var $ = function (id) { return document.getElementById(id); };
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function nice(d) { if (!d) return '–'; var p = d.split('-'); return MO[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; }
  function sgn(x) { return x == null ? '–' : (x > 0 ? '+' : '') + x.toFixed(1) + '%'; }
  function narrow() { return window.matchMedia('(max-width: 719px)').matches; }

  var gotSnap = !!window.DESMOND, gotNear = false;
  if (gotSnap) S = window.DESMOND;
  document.addEventListener('desmond:ready', function () { S = window.DESMOND; gotSnap = true; go(); });
  fetch(URL_NEAR, {cache: 'no-cache'}).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { N = j && j.kind === 'desmond_near' && j.schema === 2 ? j : null; gotNear = true; go(); }).catch(function () {});
  function go() {
    if (!gotSnap || !gotNear || !N || !S) return;
    if (N.asof > S.asof) return;
    $('near').hidden = false;
    if (N.asof < S.asof) {
      $('nearIntro').insertAdjacentHTML('afterend', '<p class="small" style="color:var(--amber)">This section still shows ' +
        nice(N.asof) + '; the near-panic numbers were not rebuilt for the latest session.</p>');
    }
    var n = S.series.d.length;
    P = new Array(n); Q = new Array(n); K = new Array(n);
    for (var i = 0; i < n; i++) {
      P[i] = i < N.view.n && N.view.P[i] != null ? N.view.P[i] / 100 : null;
      Q[i] = i < N.view.n && N.view.Q[i] != null ? N.view.Q[i] / 100 : null;
      K[i] = 0;
    }
    N.marks.near.forEach(function (i) { if (i < n) K[i] = 1; });
    N.marks.panic.forEach(function (i) { if (i < n) K[i] = 2; });
    document.querySelectorAll('[data-nrange]').forEach(function (b) {
      b.addEventListener('click', function () {
        range = b.dataset.nrange;
        document.querySelectorAll('[data-nrange]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        applyRange();
      });
    });
    texts(); drawChart(); tables();
  }

  function texts() {
    $('nearIntro').innerHTML = '<b>Panic score</b> = the weaker of the day\'s two selling shares (down volume, down points). ' +
      'Desmond only counts a panic day at <b>90 or more</b> (red). This section adds a lower <b>near-panic line</b> (amber), rebuilt every evening. ' +
      'The near-panic line is our own rule, not Desmond\'s or Lowry\'s; their published work only draws the 90% line on the down side.';
    var L = N.latest, ex = (L.experiment || [])[0];
    $('nearAnswer').className = 'answer proxy';
    $('nearAnswer').innerHTML = '<b>Latest pullback: ' + nice(L.high) + ' → ' + nice(L.low) + ', SPY ' + L.depth.toFixed(1) + '%' + (L.open ? ' so far' : '') + '.</b> ' +
      'Highest panic score ' + (L.max_panic != null ? L.max_panic.toFixed(1) : '–') + ' on ' + nice(L.max_panic_day) + ': ' +
      (L.panic_days.length ? L.panic_days.length + ' panic day' + (L.panic_days.length > 1 ? 's' : '') + '. ' : 'no panic day. ') +
      (L.near_days.length ? 'Near panic on ' + L.near_days.map(nice).join(' and ') + '. ' : '') +
      (ex ? 'Had near-panic days opened Desmond\'s panic window, it would have opened ' + nice(ex.opened) + ' and ' +
        (ex.end === 'confirmed' ? 'confirmed demand on ' + nice(ex.end_session) : ex.end === 'expired' ? 'run out of time on ' + nice(ex.end_session) + ' with no demand confirmation' :
         'still be open') + '. ' : '') +
      (L.rebound_max_demand != null ? 'The strongest buying day of the rebound scored ' + L.rebound_max_demand.toFixed(1) + ' (' + nice(L.rebound_max_day) + ').' : '') +
      (L.panic_days.length ? '' : '<span class="q">A slow grind: lots of selling, but never the one-day stampede Desmond\'s method waits for.</span>');
  }

  function drawChart() {
    var el = $('nearChart'), D = S.series.d, spy = S.series.spy;
    chart = LW.createChart(el, {
      autoSize: true,
      layout: {background: {type: 'solid', color: C.bg}, textColor: C.ink2, fontSize: 11, attributionLogo: false,
               panes: {separatorColor: C.line, enableResize: true}},
      grid: {vertLines: {color: 'rgba(42,46,57,0.35)'}, horzLines: {color: 'rgba(42,46,57,0.35)'}},
      rightPriceScale: {borderColor: C.line}, timeScale: {borderColor: C.line, rightOffset: 4, minBarSpacing: 0.05},
      crosshair: {mode: LW.CrosshairMode.Normal}, handleScroll: {vertTouchDrag: false}
    });

    var band = chart.addSeries(LW.HistogramSeries, {priceScaleId: 'pb', priceLineVisible: false, lastValueVisible: false}, 0);
    band.priceScale().applyOptions({scaleMargins: {top: 0, bottom: 0}, visible: false});
    var bd = D.map(function (d) { return {time: d}; });
    N.swings.forEach(function (w) {
      for (var i = D.indexOf(w.high); i >= 0 && i <= D.indexOf(w.low); i++) bd[i] = {time: D[i], value: 1, color: 'rgba(138,142,153,0.13)'};
    });
    band.setData(bd);
    spyS = chart.addSeries(LW.LineSeries, {color: C.text, lineWidth: 1.5, priceLineVisible: false, title: 'SPY'}, 0);
    spyS.setData(D.map(function (d, i) { return spy[i] == null ? {time: d} : {time: d, value: spy[i]}; }));
    var mk = [];
    D.forEach(function (d, i) {
      if (K[i] === 2) mk.push({time: d, position: 'aboveBar', shape: 'arrowDown', color: C.red, text: narrow() ? '' : 'panic', size: 1});
      else if (K[i] === 1) mk.push({time: d, position: 'aboveBar', shape: 'circle', color: C.amber, text: narrow() ? '' : 'near', size: 0.8});
    });
    LW.createSeriesMarkers(spyS, mk);
    var ps = chart.addSeries(LW.HistogramSeries, {priceLineVisible: false, lastValueVisible: false, title: 'Panic score'}, 1);
    ps.setData(D.map(function (d, i) {
      if (P[i] == null) return {time: d};
      return {time: d, value: P[i], color: K[i] === 2 ? C.red : K[i] === 1 ? C.amber : 'rgba(138,142,153,0.45)'};
    }));
    ps.applyOptions({autoscaleInfoProvider: function () { return {priceRange: {minValue: 0, maxValue: 100}}; }});
    ps.priceScale().applyOptions({scaleMargins: {top: 0.06, bottom: 0}});
    ps.createPriceLine({price: N.ln.panic, color: C.red, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: false, title: narrow() ? '' : 'panic (Desmond)'});
    ps.createPriceLine({price: N.ln.near, color: C.amber, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: false, title: narrow() ? '' : 'near panic (ours)'});
    chart.panes()[0].setStretchFactor(2.2);
    chart.panes()[1].setStretchFactor(1);
    $('nearLegend').innerHTML = '<span><i class="lg-ln" style="border-color:' + C.text + '"></i>SPY close</span>' +
      '<span><i class="lg-sq" style="background:rgba(138,142,153,0.35)"></i>7%+ pullback (high → low)</span>' +
      '<span class="lg-mk" style="color:' + C.red + '">▼ panic day (Desmond)</span><span class="lg-mk" style="color:' + C.amber + '">● near panic (ours)</span>' +
      '<span><i class="lg-sq" style="background:' + C.gray + '"></i>Panic score (lower pane)</span>';
    chart.subscribeCrosshairMove(function (param) { readout(param && param.time ? key(param.time) : null); });
    applyRange();
    setTimeout(applyRange, 80);
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function (en) {
        var w = en[0].contentRect.width;
        if (lastW === 0 && w > 0) applyRange();
        lastW = w;
      }).observe(el);
    }
    readout(null);
  }
  function key(t) {
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return new Date(t * 1000).toISOString().slice(0, 10);
    return t.year + '-' + String(t.month).padStart(2, '0') + '-' + String(t.day).padStart(2, '0');
  }
  function applyRange() {
    var D = S.series.d, last = D[D.length - 1], from;
    if (range === 'all') { chart.timeScale().fitContent(); return; }
    from = range === '2026' ? '2025-12-01' : range === '2021' ? '2021-01-04' : (+last.slice(0, 4) - 3) + last.slice(4);
    chart.timeScale().setVisibleRange({from: from, to: last});
  }
  function readout(d) {
    var D = S.series.d, sr = S.series, i = d != null ? D.indexOf(d) : D.indexOf(N.asof);
    if (i < 0) return;
    var p = P[i], q = Q[i];
    var tag = p == null ? 'no data' : K[i] === 2 ? '<b style="color:' + C.red + '">panic day</b>' : K[i] === 1 ? '<b style="color:' + C.amber + '">near panic</b>' : 'ordinary';
    $('nearReadout').innerHTML = '<div class="row1"><span class="d">' + nice(D[i]) + '</span><span>SPY ' + (sr.spy[i] != null ? sr.spy[i].toFixed(2) : '–') + '</span>' +
      '<span>Panic score <b>' + (p == null ? '–' : p.toFixed(1)) + '</b> (down vol ' + (sr.dvol[i] != null ? sr.dvol[i].toFixed(1) : '–') + ', down pts ' + (sr.dpts[i] != null ? sr.dpts[i].toFixed(1) : '–') + ')</span>' +
      '<span>' + tag + '</span><span>Buying score ' + (q == null ? '–' : q.toFixed(1)) + '</span></div>';
  }

  function tables() {
    var hl = function (r) { return r === 'panic' ? 'hl90' : r === 'near' ? 'hl' : ''; };
    var h = '<thead><tr><th class="l">Line</th><th>Days a year<br>2021+</th><th>7%+ pullbacks caught<br>2021+</th><th>Its days outside<br>any pullback, 2021+</th>' +
      '<th>Pullbacks caught<br>2013–20</th><th>Days outside<br>2013–20</th><th>Pullbacks caught<br>1998–2012</th></tr></thead><tbody>';
    N.rows.forEach(function (r) {
      var c = N.catch[r], a = c['2021+'], b = c['2013-2020'], z = c['1998-2012'], ry = N.rarity[r]['2021+'];
      h += '<tr class="' + hl(r) + '"><td>' + ROW[r] + '</td>' +
        '<td>' + (ry.per_year != null ? ry.per_year.toFixed(0) : '–') + '</td><td>' + a.caught + ' of ' + a.pullbacks + '</td>' +
        '<td>' + a.days_outside_pullbacks + ' of ' + a.days + (a.days ? ' (' + Math.round(100 * a.days_outside_pullbacks / a.days) + '%)' : '') + '</td>' +
        '<td>' + b.caught + ' of ' + b.pullbacks + '</td><td>' + (b.days ? Math.round(100 * b.days_outside_pullbacks / b.days) + '%' : '–') + '</td>' +
        '<td>' + z.caught + ' of ' + z.pullbacks + '</td></tr>';
    });
    $('nearTrade').innerHTML = h + '</tbody>';
    $('nearTradeNote').textContent = 'Lower the line and it catches more pullbacks, but more of its days happen when nothing much follows. ' +
      '"Caught" = at least one day on or above the line between the swing high and a week after the low. "Outside" = days on or above the line that were not in any 7%+ pullback.';

    var yes = '<span class="yes">yes</span>', no = '<span class="no">no</span>';
    var s = '<thead><tr><th class="l">High → low</th><th>SPY</th><th>Highest panic score</th><th class="l">On</th><th>Panic days</th><th>Near panic or worse</th><th class="l">Caught by the panic line?</th><th class="l">By the near line?</th></tr></thead><tbody>';
    N.swings.filter(function (w) { return w.low >= '2021'; }).slice().reverse().forEach(function (w) {
      s += '<tr><td>' + nice(w.high) + ' → ' + nice(w.low) + '</td><td class="neg">' + w.depth.toFixed(1) + '%</td><td>' + (w.max_panic != null ? w.max_panic.toFixed(1) : '–') + '</td>' +
        '<td class="l">' + nice(w.max_panic_day) + '</td><td>' + w.n_panic + '</td><td>' + w.n_near + '</td>' +
        '<td class="l">' + (w.n_panic ? yes : no) + '</td><td class="l">' + (w.n_near ? yes : no) + '</td></tr>';
    });
    $('nearSwings').innerHTML = s + '</tbody>';

    var f = '<thead><tr><th class="l">Line</th><th>Clusters<br>2021+</th><th>SPY +20<br>(all days)</th><th>SPY +60<br>(all days)</th><th>Up after 60</th>' +
      '<th>Clusters<br>2013–20</th><th>SPY +20<br>(all days)</th><th>SPY +60<br>(all days)</th><th>Up after 60</th></tr></thead><tbody>';
    N.rows.forEach(function (r) {
      var a = N.follow[r]['2021+'], b = N.follow[r]['2013-2020'];
      f += '<tr class="' + hl(r) + '"><td>' + ROW[r] + '</td>' +
        '<td>' + a.clusters + '</td><td>' + sgn(a.med_20) + ' <span class="muted">(' + sgn(a.base_20) + ')</span></td><td>' + sgn(a.med_60) + ' <span class="muted">(' + sgn(a.base_60) + ')</span></td><td>' + a.up_60 + ' of ' + a.n_60 + '</td>' +
        '<td>' + b.clusters + '</td><td>' + sgn(b.med_20) + ' <span class="muted">(' + sgn(b.base_20) + ')</span></td><td>' + sgn(b.med_60) + ' <span class="muted">(' + sgn(b.base_60) + ')</span></td><td>' + b.up_60 + ' of ' + b.n_60 + '</td></tr>';
    });
    $('nearFollow').innerHTML = f + '</tbody>';
    var e = N.experiment['2021+'], e2 = N.experiment['2013-2020'];
    $('nearFoot').innerHTML = 'A cluster starts on a day on or above the line with none in the month before; moves are SPY close to close from that day\'s close. ' +
      '<br>If near-panic days also opened Desmond\'s panic window: 2021+ ' + e.episodes + ' windows, ' + e.confirmed + ' confirmed, SPY +60 median ' + sgn(e.med_60) + ' vs all days ' + sgn(e.base_60) +
      '; 2013–20 ' + e2.episodes + ' windows, ' + e2.confirmed + ' confirmed, ' + sgn(e2.med_60) + ' vs ' + sgn(e2.base_60) + '. Windows also stay open much longer, because near-panic days are common.';
  }
})();
