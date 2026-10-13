


(function () {
  'use strict';

  var RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/';
  var POLL_MS = 5 * 60 * 1000;
  var FETCH_TIMEOUT_MS = 12000;








  var DASHBOARDS = [
    { id: 'fear', live: true, name: 'Fear meter', url: 'live/',
      line: 'How scared is the crowd? The fear meter on four candle sizes, Fear vs the VIX and 4-hour fear.',
      when: 'Every 15 min in US hours, plus an evening update after the close',
      feed: { file: 'live-data/live/manifest.json', due: 180, live: 45,
        read: function (j) { return { day: j.as_of, ts: j.generated_utc, state: j.state }; } } },
    { id: 'breadth', live: true, name: 'Breadth', url: 'breadth/',
      line: 'How many stocks are above their 50- and 200-day lines, and is a washout running?',
      when: 'Every 15 min in US hours, plus an evening update after the close',
      feed: { file: 'live-data/live/manifest.json', due: 180, live: 45,
        read: function (j) {
          var b = (j.files && j.files['breadth.json']) || {};
          return { day: b.as_of || j.as_of, ts: b.generated_at || j.generated_utc, state: b.state || j.state };
        } } },
    { id: 'eagle-eye', live: true, name: 'Eagle Eye Technicals', url: 'eagle-eye/',
      line: 'Eagle Eye chart, GEX levels and signal panels for about 600 stocks, QQQ first.',
      when: 'QQQ, SPY and IWM every 15 min in US hours; every name after the close',
      feed: { file: 'eet-data/eet/manifest.json', due: 315, live: 50,
        read: function (j) {
          var q = (j.built && j.built[j.pinned || 'QQQ']) || [];
          return { day: q[1], ts: j.generated, state: j.mode };
        } } },
    { id: 'flow', live: true, name: 'Flow Dashboard', url: 'flow/',
      line: 'Are big holders, dark pools and short sellers leaning in or out?',
      when: 'After each close',
      feed: { file: 'flow-data/flow/manifest.json', due: 360,
        read: function (j) { return { day: j.asof, ts: j.built, state: 'CLOSED' }; } } },
    { id: 'gex-hunt', live: true, name: 'GEX Hunt', url: 'gex-hunt/',
      line: 'Which stocks have big call GEX stacked above and thin puts below?',
      when: 'After each close, once the new option data is in',
      feed: { file: 'hunt-data/hunt/status.json', due: 390,
        read: function (j) { return { day: j.day, ts: j.built, state: 'CLOSED' }; } } },
    { id: 'index-flow', live: true, name: 'Index Flow', url: 'index-flow/',
      line: 'What are SPY, QQQ and IWM options and gamma saying today?',
      when: 'Through the US session',
      feed: { file: 'index-flow-data/index-flow/status.json', due: 120, live: 60,
        read: function (j) { return { day: j.session, ts: j.built_utc, state: 'LIVE' }; } } },
    { id: 'sector-rotation', live: true, name: 'Sector Rotation', url: 'sector-rotation/',
      line: 'Which sectors is money rotating into, and which are scared or washed out?',
      when: 'After each close',
      feed: { file: 'sector-rotation-data/sector-rotation/sector-rotation.json', due: 390,
        read: function (j) { return { day: j.asof, ts: j.updated_utc, state: 'CLOSED' }; } } },
    { id: 'semis', live: true, name: 'Semis Tracking', url: 'semis/',
      line: 'Is the chip cycle speeding up? Taiwan, Korea, hardware data, signals and big-tech spending plans.',
      when: 'Every 15 min in US hours; Taiwan and Korea data on their release days',
      feed: { file: 'semis-data/semis/manifest.json', due: 225, live: 45,
        read: function (j) { return { day: j.as_of, ts: j.generated_utc, state: j.state }; } } },
    { id: 'seeker', live: true, name: 'Price Seeker', url: 'price-seeker/',
      line: 'Where are far call and put nodes pulling prices, and which ones hit?',
      when: 'Through the US session; each day saved after the close',
      feed: { file: 'seeker-data/seeker/changes.json', due: 285, live: 45,
        read: function (j) { return { day: j.prices_day, ts: j.generated, state: j.state }; },
        alt: { file: 'seeker-days/days/index.json',
          read: function (j) { var d = (j.days || [])[0] || {}; return { day: d.day, ts: d.generated, state: 'CLOSED' }; } } } },
    { id: 'king-gex', live: true, name: 'King GEX Tracker', url: 'king-gex/',
      line: 'Where is each stock’s biggest king node, and which kings rank strongest?',
      when: 'After each close',
      feed: { file: 'king-gex-data/king-gex/status.json', due: 720,
        read: function (j) { return { day: String(j.provisional || j.last_snapshot || '').slice(0, 10), ts: j.built_ts, state: 'CLOSED' }; } } },
    { id: 'skew', live: true, name: 'Skew Tracker', url: 'skew-tracker/',
      line: 'Which stocks are piling into calls or puts over 1 day to 1 month?',
      when: 'Through the day',
      feed: { file: 'skew-tracker-data/skew-tracker/skew.json', due: 690,
        read: function (j) { return { day: (j.tape && j.tape.T) || j.latest, ts: j.generated, state: 'CLOSED' }; } } },
    { id: 'loud', live: true, name: 'Loud Calls', url: 'loud-calls/',
      line: 'Which stocks had one big, loud day of call buying in the last 5 days?',
      when: 'After each close',
      feed: { file: 'call-boards-data/call-boards/status.json', due: 225,
        read: function (j) { return { day: j.price_day, ts: j.built, state: 'CLOSED' }; } } },
    { id: 'stealth', live: true, name: 'Stealth Calls', url: 'stealth-calls/',
      line: 'Who is quietly adding call bets day after day while the price stays calm?',
      when: 'After each close',
      feed: { file: 'call-boards-data/call-boards/status.json', due: 225,
        read: function (j) { return { day: j.price_day, ts: j.built, state: 'CLOSED' }; } } },
    { id: 'bull-washout', live: false, name: 'Bull Washout Hunter', url: 'bull-washout/',
      line: 'Which washed-out stocks are seeing a steady, spread-out build of call bets?',
      when: 'After each close', feed: null },
    { id: 'call-ladder', live: false, name: 'Call Ladder Hunter', url: 'call-ladder/',
      line: 'Who is building call ladders up the strikes, whatever the price is doing?',
      when: 'After each close', feed: null },
    { id: 'russell', live: true, name: 'Russell Unusual Options', url: 'russell-uoa/',
      line: 'Where are the unusual options bets in Russell 1000 and 2000 stocks?',
      when: 'After each close',
      feed: { file: 'russell-uoa-data/russell-uoa/meta.json', due: 720,
        read: function (j) { return { day: j.latest, ts: j.built, state: 'CLOSED' }; } } },
    { id: 'board', live: true, name: 'Market Board', url: 'market-board/',
      line: 'The whole market on one page: breadth, liquidity, cross-asset mood, risk and SPY ranges.',
      when: 'Once per session', feed: { file: 'market-board-data/market-board/board.json', due: 360 } },
    { id: 'tet-radar', live: true, name: 'TET Radar', url: 'tet-radar/',
      line: 'How many S&P 500 stocks trend up, and who has good timing?',
      when: 'After each close', feed: { file: 'tet-radar-data/tet-radar/radar.json', due: 150 } },
    { id: 'desmond', live: true, name: 'Desmond Panic & Demand', url: 'desmond/',
      line: 'Did selling hit a panic day, and has strong buying followed?',
      when: 'After each close; a live box every 15 min in US hours', feed: { file: 'desmond-data/desmond/desmond.json', due: 150 } },
    { id: 'boom', live: true, name: 'Boom tracker', url: 'boom/',
      line: 'Is tech in a boom, since when, and how close is its end?',
      when: 'After each close', feed: { file: 'boom-data/boom/boom.json', due: 90 } },
    { id: 'sornette', live: true, name: 'Sornette (bubble check)', url: 'sornette/',
      line: 'Do the bubble fits across 13 time-scales agree that prices are speeding toward a turning point? 8 markets.',
      when: 'After each close', feed: { file: 'turning-points-data/turning-points/sornette-status.json', due: 615 } },
    { id: 'turning-point', live: true, name: 'Turning Points', url: 'turning-points/',
      line: 'Do the academic turning-point models flag a top now?',
      when: 'After each close', feed: { file: 'turning-points-data/turning-points/svix-snapshot.json', due: 615 } },
    { id: 'ai-pulse', live: true, name: 'AI Pulse', url: 'ai-pulse/',
      line: 'Which of 16 AI supply-chain parts are speeding up, steady or slowing?',
      when: 'Hourly; company data as it is reported',
      feed: { file: 'ai-pulse-data/ai-pulse/ai-pulse.json',
        read: function (j) { return { ts: j.built_utc, state: 'CLOSED' }; } } },
    { id: 'inflation', live: true, name: 'Inflation Lab', url: 'inflation/',
      line: 'Where is inflation heading, and how do SPY and QQQ react to CPI?',
      when: 'After each close; release mornings',
      feed: { file: 'inflation-data/inflation/inflation.json', due: 285,
        read: function (j) { return { ts: j.built_utc, state: 'CLOSED' }; } } },
    { id: 'mii', live: true, name: 'MII Lab', url: 'mii/',
      line: 'Saved Market Intelligence Index: the score, market regimes and plain explanations.',
      when: 'A saved snapshot, not a live feed',
      snapshot: 'Data through Sep 29' }
  ];


  var HOLIDAYS = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'];
  var HALF_DAYS = ['2026-11-27', '2026-12-24', '2027-11-26'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;


  function dnum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function dstr(n) { return new Date(n * 864e5).toISOString().slice(0, 10); }
  function isSession(s) { var w = new Date(dnum(s) * 864e5).getUTCDay(); return w > 0 && w < 6 && HOLIDAYS.indexOf(s) < 0; }
  function prevSession(s) { var n = dnum(s); do { n -= 1; } while (!isSession(dstr(n))); return dstr(n); }
  function nextSession(s) { var n = dnum(s); do { n += 1; } while (!isSession(dstr(n))); return dstr(n); }

  var ETF = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  function etParts(ms) {
    var o = {};
    ETF.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { day: o.year + '-' + o.month + '-' + o.day, h: +o.hour % 24, m: +o.minute, s: +o.second };
  }

  function etTime(s, h, m) {
    var wall = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), h, m);
    var t = wall + 5 * 36e5;
    for (var i = 0; i < 2; i++) {
      var p = etParts(t);
      t += wall - Date.UTC(+p.day.slice(0, 4), +p.day.slice(5, 7) - 1, +p.day.slice(8, 10), p.h, p.m, p.s);
    }
    return t;
  }
  function openMs(s) { return etTime(s, 9, 30); }
  function closeMs(s) { return HALF_DAYS.indexOf(s) >= 0 ? etTime(s, 13, 0) : etTime(s, 16, 0); }
  function sessionOnOrBefore(s) { return isSession(s) ? s : prevSession(s); }

  function lastClosed(now) { var s = sessionOnOrBefore(etParts(now).day); while (closeMs(s) > now) s = prevSession(s); return s; }

  function required(now, due) { var s = sessionOnOrBefore(etParts(now).day); while (closeMs(s) + due * 6e4 > now) s = prevSession(s); return s; }
  function behind(asOf, req) { var n = 0, s = asOf; while (s < req && n < 400) { s = nextSession(s); n++; } return n; }
  function inSession(now, padMin) { var s = etParts(now).day; return isSession(s) && now >= openMs(s) && now <= closeMs(s) + (padMin || 0) * 6e4; }

  function fmtDay(s) { var d = new Date(dnum(s) * 864e5); return MON[d.getUTCMonth()] + '\u00a0' + d.getUTCDate(); }
  function fmtDayW(s) { var d = new Date(dnum(s) * 864e5); return WD[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + '\u00a0' + d.getUTCDate(); }
  function fmtEt(ms) { var p = etParts(ms); return (p.h < 10 ? '0' : '') + p.h + ':' + (p.m < 10 ? '0' : '') + p.m + '\u00a0ET'; }
  function toMs(ts) {
    if (ts == null || ts === '') return null;
    if (typeof ts === 'number') return ts > 1e11 ? ts : ts * 1000;
    var t = Date.parse(ts);
    return isNaN(t) ? null : t;
  }
  function pick(j, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = j, path = keys[i].split('.');
      for (var k = 0; k < path.length && v != null; k++) v = v[path[k]];
      if (v != null && v !== '') return v;
    }
    return null;
  }
  function readCommon(j) {
    return { day: pick(j, ['as_of', 'asof', 'session', 'report_day', 'built_for', 'day', 'prices_day', 'meta.session']),
      ts: pick(j, ['generated_utc', 'built_utc', 'generated', 'built', 'meta.generated_utc']), state: pick(j, ['state', 'mode']) };
  }


  var inflight = {};
  function getJSON(file) {
    if (inflight[file]) return inflight[file];
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    var p = fetch(RAW + file, { cache: 'no-cache', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(function () { clearTimeout(timer); delete inflight[file]; });
    inflight[file] = p;
    return p;
  }
  function readFeed(f) {
    return getJSON(f.file).then(function (j) {
      var r = (f.read || readCommon)(j) || {};
      if (!(typeof r.day === 'string' && DAY_RE.test(r.day)) && toMs(r.ts) == null) throw new Error('no date');
      return r;
    }).catch(function (e) { if (f.alt) return readFeed(f.alt); throw e; });
  }


  function judge(d, r, now) {
    var f = d.feed, day = typeof r.day === 'string' && DAY_RE.test(r.day) ? r.day : null, ts = toMs(r.ts);
    var state = String(r.state || '').toUpperCase(), liveState = state && state.indexOf('CLOS') < 0;
    var out = { level: 'ok', words: [] };
    if (day && liveState && ts && day === etParts(now).day && isSession(day) && ts >= openMs(day) - 30 * 6e4 && ts <= closeMs(day) + 60 * 6e4) {
      out.words = ['Live', ' · as of ', fmtEt(ts)];
    } else if (day) {
      out.words = ['Updated', ' ', fmtDay(day) + ' close'];
    } else {
      var p = etParts(ts);
      out.words = ['Updated', ' ', fmtDay(p.day) + ', ' + fmtEt(ts)];
    }
    if (day) {
      var n = behind(day, required(now, f.due || 360));
      if (n > 0) { out.level = 'late'; out.note = n === 1 ? '1 session behind' : n + ' sessions behind'; }
    }
    if (out.level === 'ok' && f.live && ts && inSession(now, 10)) {
      var ref = Math.max(ts, openMs(etParts(now).day));
      if (now - ref > f.live * 6e4) { out.level = 'late'; out.note = 'no update since ' + fmtEt(ts); }
    }
    return out;
  }


  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  var LEVEL_WORD = { ok: 'Up to date', late: 'Behind', none: 'Not checked' };
  var cards = {};
  var results = {};

  function setStatus(d) {
    var box = cards[d.id];
    if (!box) return;
    box.textContent = '';
    if (d.snapshot) { box.appendChild(el('span', null, d.snapshot)); return; }
    var res = results[d.id];
    var level = res && res.level ? res.level : 'none';
    var dot = el('span', 'dot' + (level === 'none' ? '' : ' ' + level));
    dot.setAttribute('role', 'img');
    dot.setAttribute('aria-label', LEVEL_WORD[level]);
    dot.title = LEVEL_WORD[level];
    box.appendChild(dot);
    var t = el('span');
    if (!d.feed) t.textContent = '';
    else if (!res) t.textContent = 'Checking…';
    else if (res.failed) t.textContent = 'Could not check just now';
    else {
      t.appendChild(document.createTextNode(res.words[0] + res.words[1]));
      t.appendChild(el('b', null, res.words[2]));
      if (res.note) t.appendChild(document.createTextNode(' · ' + res.note));
    }
    box.appendChild(t);
  }

  function card(d) {
    var a = el('article', 'card');
    a.id = 'd-' + d.id;
    a.appendChild(el('h2', 'c-name', d.name));
    a.appendChild(el('p', 'c-line', d.line));
    a.appendChild(el('p', 'c-when', d.when));
    var st = el('div', 'status');
    st.setAttribute('aria-live', 'polite');
    cards[d.id] = st;
    a.appendChild(st);
    var links = el('div', 'links');
    var open = el('a', 'btn', 'Open');
    open.href = d.url;
    open.setAttribute('aria-label', 'Open ' + d.name);
    links.appendChild(open);
    a.appendChild(links);
    return a;
  }

  function summary(now) {
    var s = $('sum');
    if (!s) return;
    s.textContent = '';
    var shown = DASHBOARDS.filter(function (d) { return d.live; });
    var a = el('span'); a.appendChild(el('b', null, String(shown.length))); a.appendChild(document.createTextNode(' dashboards')); s.appendChild(a);
    var open = inSession(now, 0);
    var b = el('span');
    if (open) { b.appendChild(document.createTextNode('US market open · ')); b.appendChild(el('b', null, fmtEt(now))); }
    else { b.appendChild(document.createTextNode('Latest US close ')); b.appendChild(el('b', null, fmtDayW(lastClosed(now)))); }
    s.appendChild(b);
  }

  function check() {
    var now = Date.now();
    summary(now);
    DASHBOARDS.forEach(function (d) {
      if (!d.live || !d.feed) return;
      readFeed(d.feed).then(function (r) { results[d.id] = judge(d, r, Date.now()); },
        function () { results[d.id] = { failed: true, level: 'none' }; })
        .then(function () { setStatus(d); });
    });
  }

  function render() {
    var grid = $('grid');
    grid.textContent = '';
    DASHBOARDS.forEach(function (d) { if (d.live) { grid.appendChild(card(d)); setStatus(d); } });
    if (location.hash) {
      var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) t.scrollIntoView({ block: 'start' });
    }
  }

  render();
  check();
  setInterval(function () { if (!document.hidden) check(); }, POLL_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
