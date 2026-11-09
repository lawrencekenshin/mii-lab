


(() => {
  'use strict';


  const GH = /(^|\.)github\.io$/i.test(location.hostname);
  const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/intraday-skews-data/intraday-skews/';
  const BOARD_RE = /^board-[0-9a-f]{12}\.json$/;


  const POLL_LIVE_MS = 2 * 60 * 1000, POLL_MS = 5 * 60 * 1000, RETRY_MS = 30 * 1000;


  const LIVE_MIN = 45, FRESH_MIN = 25, OLD_MIN = 90;
  const UNIS = [['all', 'All'], ['spx', 'S&P 500'], ['ndx', 'Nasdaq 100'], ['ai', 'AI'], ['etf', 'ETFs & indexes']];
  const SHORT = {rank: 'Rank', one: 'One-sided', bets: 'Bets', pace: 'Vs normal', build: 'Building'};
  const LENSES = [
    ['rank', 'Rank', 'the 0-100 score from six parts: how one-sided, size against its open interest, money, pace against its normal day, how long it has held, and where its biggest-money contract last printed'],
    ['one', 'Most one-sided', 'new contracts on the heavy side as a share of the name’s open interest, weighted by how one-sided'],
    ['bets', 'Biggest bets', 'money behind the new contracts, at each contract’s mid'],
    ['pace', 'Vs normal', 'new contracts so far against what the name normally opens by this time of day'],
    ['build', 'Building now', 'new contracts added since the name’s previous reading today']];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SHOW = 12;
  const TAG = {a: 'last print near the ask', b: 'last print near the bid', m: 'last print between bid and ask'};
  const SIDEW = {C: 'calls', P: 'puts'};
  const KIND = {i: 'wide reading', e: 'after-close reading', w: 'all-day reading', f: 'all-day reading', u: 'overnight reading', s: 're-read'};
  const S = {d: '', u: 'all', l: 'rank', s: '', v: 'board', m: 'C', h: false, q: '', all: {C: false, P: false}, sort: 'rk', sd: -1};

  const RK_PARTS = ['One-sided', 'Size vs its open interest', 'Money behind it', 'Vs its normal day', 'How long it has held',
                    'Last print (ask, mid or bid)'];
  let LIVE = null, B = null;
  const DAYDOC = {};
  let MAP = [], TL = null, PX = null;


  let BASE = GH ? RAW : 'snap/', MAN = null, BOARD = '', LOADING = false, POLL = null, WAS = null;
  const fmtMin = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const ok = x => typeof x === 'number' && isFinite(x);
  const other = side => (side === 'C' ? 'P' : 'C');


  function kc(n) {
    if (!ok(n)) return '–';
    const a = Math.abs(n);
    if (a >= 999.5e3) return (n / 1e6).toFixed(1) + 'M';
    if (a >= 99.95e3) return Math.round(n / 1e3) + 'k';
    if (a >= 999.5) return (n / 1e3).toFixed(1) + 'k';
    return String(Math.round(n));
  }
  function usd(n) {
    if (!ok(n)) return '–';
    const a = Math.abs(n);
    if (a >= 999.5e6) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (a >= 999.5e3) return '$' + (n / 1e6).toFixed(a >= 99.95e6 ? 0 : 1) + 'M';
    if (a >= 999.5) return '$' + (n / 1e3).toFixed(a >= 99.95e3 ? 0 : 1) + 'k';
    return '$' + Math.round(n);
  }
  const pc = (x, d) => (ok(x) ? (x * 100).toFixed(d || 0) + '%' : '–');
  function pcBook(x) {
    if (!ok(x)) return '–';
    return x >= 0.1 ? Math.round(x * 100) + '%' : x >= 0.01 ? (x * 100).toFixed(1) + '%' : (x * 100).toFixed(2) + '%';
  }
  function chgOf(r) { return ok(r.px) && ok(r.pc) && r.pc ? (r.px / r.pc - 1) * 100 : null; }
  function chg(r) {
    const c = chgOf(r);
    return c == null ? '' : `<span class="${c >= 0 ? 'up' : 'dn'}">${c >= 0 ? '+' : ''}${c.toFixed(1)}%</span>`;
  }
  const fpx = x => (!ok(x) ? '–' : x >= 1000 ? x.toFixed(0) : x.toFixed(2));
  function expTxt(e) {
    if (!e || e.length !== 6) return e || '';
    const yy = +e.slice(0, 2), mm = +e.slice(2, 4), dd = +e.slice(4, 6), cy = B ? +B.T.slice(2, 4) : yy;
    return `${MON[mm - 1]} ${dd}${yy !== cy ? " ’" + String(yy).padStart(2, '0') : ''}`;
  }
  const kTxt = k => (ok(k) ? String(Math.round(k * 100) / 100) : String(k));
  function dayTxt(T) { const d = new Date(T + 'T12:00:00'); return `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`; }
  const mins = hhmm => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
  function etNow() {
    const s = new Date().toLocaleString('en-US', {timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit'});
    return s.replace(/^24/, '00');
  }
  const lineTxt = (l, side) => `${expTxt(l[0])} ${kTxt(l[1])}${side}`;
  const paceTxt = x => (!ok(x) ? '' : x >= 10 ? Math.round(x) + '×' : x.toFixed(1) + '×');


  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    S.d = /^\d{4}-\d{2}-\d{2}$/.test(h.get('d') || '') ? h.get('d') : '';
    S.u = UNIS.some(u => u[0] === h.get('u')) ? h.get('u') : 'all';
    S.l = LENSES.some(l => l[0] === h.get('l')) ? h.get('l') : 'rank';
    S.s = (h.get('s') || '').toUpperCase().replace(/[^A-Z0-9.\-_]/g, '');
    S.v = h.get('v') === 'table' ? 'table' : 'board';
    S.m = h.get('m') === 'P' ? 'P' : 'C';
    S.h = h.get('h') === '1';
    if (window.ISThemes) ISThemes.read(h);
  }
  function writeHash() {
    const h = new URLSearchParams();
    if (S.d) h.set('d', S.d);
    if (S.u !== 'all') h.set('u', S.u);
    if (S.l !== 'rank') h.set('l', S.l);
    if (S.v !== 'board') h.set('v', S.v);
    if (S.m !== 'C') h.set('m', S.m);
    if (S.h) h.set('h', '1');
    if (window.ISThemes) ISThemes.write(h);
    if (S.s) h.set('s', S.s);
    const s = h.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname + location.search);
  }





  const SUBTLE = typeof crypto !== 'undefined' && crypto && crypto.subtle && typeof TextDecoder !== 'undefined' ? crypto.subtle : null;
  async function sha12(buf) {
    try { return Array.from(new Uint8Array(await SUBTLE.digest('SHA-256', buf)).slice(0, 6), x => x.toString(16).padStart(2, '0')).join(''); }
    catch (e) { return null; }
  }
  async function getJSON(url, tries = 3, sha = '') {





    for (let i = 0; i < tries; i++) {
      if (i) await new Promise(res => setTimeout(res, 2000 * i));
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let body = false, timer = ac ? setTimeout(() => ac.abort(), 8000) : null;
      try {
        const r = await fetch(i ? url + (url.includes('?') ? '&' : '?') + 'r=' + Date.now() : url, {cache: 'no-cache', signal: ac ? ac.signal : undefined});
        if (timer) clearTimeout(timer);
        if (!r.ok) { const err = new Error(`${url} ${r.status}`); err.status = r.status; err.final = r.status === 404; throw err; }
        body = true;
        timer = ac ? setTimeout(() => ac.abort(), 90 * 1000) : null;
        if (!sha) return await r.json();
        if (!SUBTLE) return {doc: await r.json(), same: true};
        const buf = await r.arrayBuffer(), got = await sha12(buf);
        return {doc: JSON.parse(new TextDecoder().decode(buf)), same: got === null || got === sha};
      } catch (e) {
        if (e.final || i === tries - 1) {
          const err = e.status ? e : new Error(`${url}: ${e.message || e.name}`);
          err.why = e.status ? `the server answered ${e.status}` : e.name === 'AbortError' ? (body ? 'the download did not finish within 90 seconds' : 'no answer within 8 seconds')
            : e.name === 'SyntaxError' ? 'the file that came back could not be read' : body ? 'the connection broke off during the download' : 'no connection';
          throw err;
        }
      } finally { if (timer) clearTimeout(timer); }
    }
    throw new Error(url);
  }

  const whyNot = e => (e && typeof e.why === 'string' && e.why ? e.why : 'the page could not draw it');
  const unreadable = what => Object.assign(new Error(what), {why: 'the file that came back could not be read'});



  async function getData(name, sha) {
    try { return await getJSON(BASE + name, 3, sha); } catch (e) {
      if (BASE === RAW || !(e && e.status === 404)) throw e;
      BASE = RAW;
      return getJSON(BASE + name, 3, sha);
    }
  }
  const ETD = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'});
  function etDay() {
    const p = {};
    for (const x of ETD.formatToParts(new Date())) p[x.type] = x.value;
    return `${p.year}-${p.month}-${p.day}`;
  }
  const ageMin = d => (d && d.at ? (Date.now() - Date.parse(d.at)) / 60000 : Infinity);


  const isLive = () => !!(B && B === LIVE && B.live && B.phase === 'open' && B.T === etDay() && ageMin(B) < LIVE_MIN);
  const notOlder = (a, b) => !(Date.parse(a) < Date.parse(b));

  const kept = d => !!(DAYDOC[d] && MAN && MAN.days && DAYDOC[d].v === MAN.days[d]);
  function schedule(ms) {
    if (POLL) clearTimeout(POLL);
    const open = !!(LIVE && LIVE.T === etDay() && LIVE.phase === 'open' && !document.hidden);
    POLL = setTimeout(refresh, ms != null ? ms : open ? POLL_LIVE_MS : POLL_MS);
  }







  async function refresh() {
    if (LOADING) return;
    LOADING = true;
    let failed = false;
    BASE = GH ? RAW : 'snap/';
    try {
      const mf = await getData('manifest.json');
      if (!mf || typeof mf !== 'object' || !BOARD_RE.test(String(mf.board))) throw unreadable('manifest.json');
      if (LIVE && !notOlder(mf.at, LIVE.at)) return;
      let fresh = false;
      if (!LIVE || mf.board !== BOARD) {
        const doc = await getData(mf.board).catch(e => { if (e && e.status === 404) e.gone = true; throw e; });
        if (!doc || typeof doc !== 'object' || !doc.rows || !doc.T) throw unreadable(mf.board);
        if (LIVE && !notOlder(doc.at, LIVE.at)) return;
        LIVE = doc; BOARD = mf.board; fresh = true;
      }
      MAN = mf;


      if (fresh || (S.d && !kept(S.d))) await pick();
      else renderBar();
    } catch (e) {
      const gone = !!(e && e.gone);
      failed = !(gone && LIVE);
      if (!LIVE) $('#main').innerHTML = gone ? '<div class="empty">The board is updating just now. Trying again in 30 seconds.</div>'
        : `<div class="empty">Intraday Skews could not be loaded just now (${esc(whyNot(e))}). Trying again in 30 seconds.</div>`;
    } finally {
      LOADING = false;
      schedule(failed ? RETRY_MS : null);
    }
  }
  async function pick() {
    const want = S.d;
    if (want && LIVE && want !== LIVE.T) {
      const v = MAN && MAN.days ? MAN.days[want] : null;
      let doc = kept(want) ? DAYDOC[want].doc : null;
      if (!doc && v) {
        let got = null;
        try { got = await getData(`days/${want}.json?v=${encodeURIComponent(v)}`, v); } catch (e) { got = null; }
        if (S.d !== want) return;
        doc = got && got.doc;


        if (doc && typeof doc === 'object' && doc.T === want && doc.rows) { if (got.same) DAYDOC[want] = {v, doc}; }
        else doc = B && B !== LIVE && B.T === want ? B : null;
      }
      B = doc || LIVE;
      if (!doc) S.d = '';
    } else {
      B = LIVE;
      if (S.d && LIVE && S.d === LIVE.T) S.d = '';
    }
    render();
  }


  const R = s => (B && B.rows ? (B.rows[s] || (B.xrows && B.xrows[s]) || null) : null);
  function inU(s, u) {
    const r = R(s);
    u = u || S.u;
    if (!r) return false;
    if (u === 'all') return true;
    if (u === 'etf') return r.ty === 'etf' || r.ty === 'index' || (r.u || []).includes('etf');
    return (r.u || []).includes(u);
  }
  function match(s) {
    if (!S.q) return true;
    const q = S.q.toUpperCase(), r = R(s);
    return s.includes(q) || (r && (r.n || '').toUpperCase().includes(q));
  }
  const isHeld = s => { const r = R(s); return !!(r && r.held && r.held.st === 'held'); };
  const hasHeld = () => !!(B && B.held);
  let RANKED = null;
  const hasRank = () => { if (RANKED === null || RANKED[0] !== B) RANKED = [B, !!(B && B.rows && Object.values(B.rows).some(r => r.rk))]; return RANKED[1]; };
  const heldOnly = () => S.h && hasHeld();
  const listed = (side, u) => (B[side] || []).filter(s => inU(s, u) && match(s));
  function heldBadge(r) {
    const h = r && r.held;
    if (!h || !h.st) return '';
    if (h.st === 'held') return `<span class="hb held ${r.side === 'C' ? 'c' : 'p'}" title="On the list on the same side since ${esc(h.since)} ET: ${h.n} readings, ${h.span} min">Held since ${esc(h.since)} · ${h.n} readings</span>`;
    if (h.st === 'new') return `<span class="hb new" title="On the list since ${esc(h.since)} ET, not long enough to count as held yet${h.first && h.first !== h.since ? '; it was also on the list earlier today, from ' + esc(h.first) + ' ET' : ''}">New since ${esc(h.since)}</span>`;
    return `<span class="hb first" title="On the list at its only reading so far">First reading ${esc(h.since)}</span>`;
  }
  function heldWords(r) {
    const h = r && r.held;
    if (!h) return '';
    if (h.st === 'held') return `On the list since ${esc(h.since)} ET · ${h.n} readings in a row (${h.span} min)`;
    if (h.st === 'new') return `On the list since ${esc(h.since)} ET, not long enough to count as held yet${h.first && h.first !== h.since ? '; it was also on the list earlier today, from ' + esc(h.first) + ' ET' : ''}`;
    if (h.st === 'first') return `On the list at its only reading so far (${esc(h.since)} ET)`;
    if (h.was) return `Not on the list now; it was on the ${h.was === 'C' ? 'call' : 'put'} side ${h.was_from === h.was_to ? 'at ' + esc(h.was_from) : 'from ' + esc(h.was_from) + ' to ' + esc(h.was_to)} ET`;
    return '';
  }
  function lensVal(s, side) {
    const r = R(s);
    if (!r) return null;
    if (S.l === 'bets') return r['p' + side];
    if (S.l === 'pace') return r.xn;
    if (S.l === 'build') return r.d && r.side === side ? r.d[0] : null;
    if (S.l === 'rank') return hasRank() ? (r.rk ? r.rk[0] : null) : r.sc;
    return r.sc;
  }
  function lensTxt(s, side) {
    const r = R(s), v = lensVal(s, side);
    if (!ok(v)) return '–';
    if (S.l === 'bets') return usd(v);
    if (S.l === 'pace') return paceTxt(v) + ' normal';
    if (S.l === 'build') return '+' + kc(v) + ' since ' + r.d[1];
    if (S.l === 'rank') return hasRank() ? String(Math.round(v)) : pcBook(r['f' + side] / r.bk) + ' of OI';
    return pcBook(r['f' + side] / r.bk) + ' of OI';
  }
  function lensShort(s, side) {
    return lensTxt(s, side).replace(/ since \d\d:\d\d$/, '').replace(/ normal$/, '').replace(/ of OI$/, '');
  }
  function listOf(side) {
    let syms;
    if (S.l === 'build') {
      syms = Object.keys(B.rows).filter(s => {
        const r = B.rows[s], w = r.why || [];
        return r.side === side && r.d && r.d[0] > 0 && r.sh >= 0.6 && !w.includes('book') && !w.includes('price');
      });
    } else syms = (B[side] || []).slice();
    syms = syms.filter(s => inU(s) && match(s) && (!heldOnly() || isHeld(s)));
    if (S.l !== 'one') {
      const v = s => { const x = lensVal(s, side); return ok(x) ? x : -1; };
      syms.sort((a, b) => v(b) - v(a));
    }
    return syms;
  }


  function sessLabel() {
    if (!B) return '';
    if (B !== LIVE) return `<span class="sess"><b>${dayTxt(B.T)}</b> · saved board</span>`;
    if (isLive()) return `<span class="sess"><b>Today</b> · ${dayTxt(B.T)}</span>`;
    if (B.phase === 'open') return `<span class="sess"><b>${dayTxt(B.T)}</b> · during the session</span>`;
    return `<span class="sess"><b>${dayTxt(B.T)}</b> · session closed</span>`;
  }
  function builtLabel() {
    if (!B) return '';
    const at = B.at ? B.at.slice(11, 16) : '', age = ageMin(B);


    const open = B === LIVE && B.phase === 'open' && B.T === etDay();
    const cls = !open ? 'dot off' : age < FRESH_MIN ? 'dot pulse' : age < OLD_MIN ? 'dot old' : 'dot off';
    const tt = B.trades ? `trades to ${B.trades[1]} ET` : '';
    const day = B.at && B.at.slice(0, 10) !== B.T ? `${MON[+B.at.slice(5, 7) - 1]} ${+B.at.slice(8, 10)} ` : '';
    const when = !at ? '' : isLive() ? ` · updated ${at} ET` : B === LIVE ? ` · as of ${day}${at} ET` : '';
    const tip = (B === LIVE ? `Built ${day + at} ET; ` : '') + 'option chains run about 15 min behind the tape';
    return `<span class="built" title="${esc(tip)}"><i class="${cls}"></i>${tt}${when}</span>`;
  }
  function renderBar() {

    const onBranch = d => !!LIVE && (d === LIVE.T || !!(MAN && MAN.days && Object.prototype.hasOwnProperty.call(MAN.days, d)));
    const days = ((LIVE && LIVE.days) || []).filter(onBranch);
    const opts = days.map(d => `<option value="${d}"${(S.d || (LIVE && LIVE.T)) === d ? ' selected' : ''}>${dayTxt(d)}${LIVE && d === LIVE.T ? (LIVE.phase === 'open' && LIVE.T === etDay() ? ' (today)' : ' (latest)') : ''}</option>`).join('');
    $('#bar').innerHTML = `<span class="ttl">Intraday Skews</span>` +
      sessLabel() + builtLabel() + (days.length > 1 ? `<select id="day" aria-label="Session">${opts}</select>` : '');
  }
  function renderCtl() {
    if (!B) { $('#ctl').innerHTML = ''; return; }
    const cnt = u => listed('C', u).length + listed('P', u).length;
    const uni = UNIS.map(([k, lab]) => `<button class="chip${S.u === k ? ' on' : ''}" data-u="${k}">${lab}<b>${cnt(k)}</b></button>`).join('');
    const lens = LENSES.map(([k, lab, tip]) => `<button class="${S.l === k ? 'on' : ''}" data-l="${k}" title="${esc(tip)}"><span class="hide-s">${lab}</span><span class="show-s">${SHORT[k]}</span></button>`).join('');
    const q = $('#q'), had = q && document.activeElement === q;
    $('#ctl').innerHTML = `<div class="crow"><div class="chips">${uni}</div>` +
      `<input id="q" type="search" placeholder="Find a ticker or company" value="${esc(S.q)}" autocomplete="off" spellcheck="false"></div>` +
      `<div class="crow"><div class="seg" role="tablist">${lens}</div>` +
      (hasHeld() ? `<button class="vbtn${S.h ? ' on' : ''}" data-h="1" title="Only skews that have stayed one-sided across several readings">${S.h ? '✓ ' : ''}Held only</button>` : '') +
      `<button class="vbtn${S.v === 'table' ? ' on' : ''}" data-v="${S.v === 'table' ? 'board' : 'table'}">${S.v === 'table' ? 'Back to the board' : 'Table'}</button></div>`;
    if (had) { const n = $('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    ctlH();
  }
  function ctlH() {
    const c = $('#ctl'), de = document.documentElement;
    if (c && de && de.style && de.style.setProperty) de.style.setProperty('--ctlh', (c.offsetHeight || 0) + 'px');
  }


  function lean(u) {
    let c = 0, p = 0, nc = 0, nf = 0;
    const etf = u === 'etf';
    for (const [s, r] of Object.entries(B.rows)) {
      if (!inU(s, u)) continue;
      const isEtf = r.ty === 'etf' || r.ty === 'index';
      if (isEtf !== etf) continue;
      c += r.fC; p += r.fP;
      if (r.base && ok(r.base.fcs) && r.base.F) { nc += r.base.F * r.base.fcs; nf += r.base.F; }
    }
    return {c, p, cs: c + p ? c / (c + p) : null, ncs: nf ? nc / nf : null};
  }
  function bestBet(list, side) {

    let best = null;
    for (const s of list) {
      const r = R(s), fund = r.ty === 'etf' || r.ty === 'index';
      if ((S.u === 'etf') !== fund) continue;
      if (!best || r['p' + side] > R(best)['p' + side]) best = s;
    }
    return best;
  }
  function moneyLine(r, side) { return (r.mx && r.mx[side]) || (r.top[side] || [])[0] || null; }
  function chipsHTML(list) {
    return list.length ? `<div class="tchips">${list.slice(0, 4).map(s => `<button data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
  }
  function heroHTML() {
    const C = listed('C'), P = listed('P'), nc = C.length, np = P.length;
    const hc = C.filter(isHeld).length, hp = P.filter(isHeld).length;
    const kick = isLive() ? `Today so far · trades to ${B.trades ? B.trades[1] : '–'} ET`
      : B.phase === 'open' ? `${dayTxt(B.T)} · trades to ${B.trades ? B.trades[1] : '–'} ET` : `${dayTxt(B.T)} · whole session`;
    let hl;
    if (!nc && !np) hl = 'No name is opening one side of its book yet';
    else if (nc >= 1.5 * np && nc - np >= 3) hl = `<span class="up">Calls</span> lead: ${nc} names opening calls, ${np} opening puts`;
    else if (np >= 1.5 * nc && np - nc >= 3) hl = `<span class="dn">Puts</span> lead: ${np} names opening puts, ${nc} opening calls`;
    else hl = `Even split: ${nc} names opening calls, ${np} opening puts`;

    const rkOf = s => (R(s) && R(s).rk ? R(s).rk[0] : null);
    const best = list => list.slice().sort((a, b) => (rkOf(b) ?? -1) - (rkOf(a) ?? -1))[0];
    const key = s => (s ? (rkOf(s) != null ? [2, rkOf(s)] : [isHeld(s) ? 1 : 0, R(s).sc]) : [-1, -1]);
    const c0 = best(C), p0 = best(P), kc_ = key(c0), kp_ = key(p0);
    let sub = '';
    if (c0 || p0) {
      const side = (kc_[0] > kp_[0] || (kc_[0] === kp_[0] && kc_[1] >= kp_[1])) ? 'C' : 'P', s = side === 'C' ? c0 : p0, r = R(s), top = (r.top[side] || [])[0];
      const hw = isHeld(s) ? `, held since ${esc(r.held.since)} (${r.held.n} readings)` : '';
      const lead = rkOf(s) != null ? `Top ranked (${Math.round(rkOf(s))} of 100)` : `Most one-sided${isHeld(s) ? ' and lasting' : ''}`;
      sub = `${lead}: <button class="tk" data-s="${esc(s)}">${esc(s)}</button>${r.n ? ` (${esc(r.n)})` : ''} — <b>${kc(r['f' + side])} new ${SIDEW[side]}</b>, ` +
        `${pc(r.sh)} on one side, <b>${pcBook(r['f' + side] / r.bk)}</b> of its open interest, ${usd(r['p' + side])} behind them${hw}` +
        (top ? `; the main line is ${lineTxt(top, side)} (${kc(top[2])} new).` : '.');
    }
    const bc = bestBet(C, 'C'), bp = bestBet(P, 'P');
    const betTile = (s, side) => {
      if (!s) return `<div class="tile"><div class="tl"><i class="sw ${side.toLowerCase()}"></i>Biggest ${side === 'C' ? 'call' : 'put'} bet</div><div class="tv">–</div><div class="ts">none listed</div></div>`;
      const r = R(s), top = moneyLine(r, side);
      return `<div class="tile" role="button" tabindex="0" data-s="${esc(s)}"><div class="tl"><i class="sw ${side.toLowerCase()}"></i>Biggest ${side === 'C' ? 'call' : 'put'} bet${S.u === 'etf' ? '' : ' · single names'}</div>` +
        `<div class="tv">${esc(s)}<small>${usd(r['p' + side])}</small></div>` +
        `<div class="ts">${kc(r['f' + side])} new ${SIDEW[side]}${top ? ` · most money in <b>${lineTxt(top, side)}</b> (${usd(top[2] * top[5] * 100)})` : ''}</div></div>`;
    };
    let hot = null;
    for (const s of C.concat(P)) { const r = R(s); if (ok(r.xn) && (!hot || r.xn > R(hot).xn)) hot = s; }
    const hotTile = hot ? (() => {
      const r = R(hot);
      return `<div class="tile" role="button" tabindex="0" data-s="${esc(hot)}"><div class="tl"><i class="sw ${r.side.toLowerCase()}"></i>Most unusual vs its normal</div>` +
        `<div class="tv">${esc(hot)}<small>${paceTxt(r.xn)}</small></div><div class="ts">${kc(r['f' + r.side])} new ${SIDEW[r.side]} vs a normal day’s ${kc(Math.max(r.base.F * (r.side === 'C' ? r.base.fcs : 1 - r.base.fcs), 0))} (whole day)</div></div>`;
    })() : `<div class="tile"><div class="tl">Most unusual vs its normal</div><div class="tv">–</div><div class="ts">needs more saved sessions</div></div>`;
    const L = lean(S.u === 'etf' ? 'etf' : S.u);
    const lw = S.u === 'etf' ? 'ETFs and indexes' : 'Single names';
    const leanTile = L.cs == null ? `<div class="tile"><div class="tl">${lw}: calls vs puts opened</div><div class="tv">–</div></div>` :
      `<div class="tile wide"><div class="tl">${lw}: calls vs puts opened</div><div class="tv">${pc(L.cs)}<small>calls</small></div>` +
      `<div class="lean"><div class="lb"><i style="width:${L.cs * 100}%;background:var(--up)"></i><i style="width:${(1 - L.cs) * 100}%;background:var(--dn)"></i>` +
      (L.ncs != null ? `<span class="tick" style="left:calc(${L.ncs * 100}% - 1px)" title="normal day ${pc(L.ncs)} calls"></span>` : '') + '</div>' +
      `<div class="lr"><span><b>${kc(L.c)}</b> new calls</span><span>normal day ${pc(L.ncs)} (white tick)</span><span><b>${kc(L.p)}</b> new puts</span></div></div></div>`;
    return `<section class="hero wrap"><div class="head"><div><div class="kick">${esc(kick)}</div><h1 class="hl">${hl}</h1></div><div class="hsub">${sub}</div></div>` +
      `<div class="tiles">` +
      `<div class="tile" role="button" tabindex="0" data-m="C" data-jump="1"><div class="tl"><i class="sw c"></i>Names opening calls</div><div class="tv up">${nc}${hasHeld() ? `<small>${hc} held</small>` : ''}</div>${chipsHTML(C)}</div>` +
      `<div class="tile" role="button" tabindex="0" data-m="P" data-jump="1"><div class="tl"><i class="sw p"></i>Names opening puts</div><div class="tv dn">${np}${hasHeld() ? `<small>${hp} held</small>` : ''}</div>${chipsHTML(P)}</div>` +
      leanTile + betTile(bc, 'C') + betTile(bp, 'P') + hotTile + '</div></section>';
  }


  function readsHTML() {
    const reads = (B.src && B.src.reads) || [];
    const flow = (B.src && B.src.flow) || {};
    const liveOpen = isLive();
    const parts = [];
    const own = (B.src && B.src.own) || {};
    if (flow.n) parts.push(`<span><b>${flow.n} names</b> read all session</span>`);
    if (own.n) parts.push(`<span><b>${own.n.toLocaleString()} names</b> re-read ${(own.reads || 0).toLocaleString()} times through the session</span>`);
    for (const r of reads) parts.push(`<span><b>${r.n.toLocaleString()} names</b> ${r.close ? 'at the close' : 'at ' + r.t[1] + ' ET'} (${esc(KIND[r.k] || r.k)})</span>`);
    const hasMid = reads.some(r => r.k === 'i' && !r.close), hasClose = reads.some(r => r.close);
    if (liveOpen) {
      const now = etNow();
      const busy = own.t && mins(now) - mins(own.t) < 40;
      if (busy) parts.push('<span>updating now</span>');
      else if (!hasMid && now < '12:00') parts.push('<span>next: a wide reading late in the morning</span>');
      else if (!hasClose) parts.push('<span>next: wide readings at and after the close</span>');
    }
    return `<section class="reads wrap" id="readsbox"><div class="rh"><span>Readings:</span>${parts.join('<i class="sep">·</i>')}</div><svg id="readsvg" aria-hidden="true"></svg></section>`;
  }

  function tcsHTML() {
    const xr = B.xrows || {}, X = B.X || {}, names = Object.keys(xr);
    if (!names.length && !(B.xw > 0)) return '';
    const score = s => (xr[s].rk ? xr[s].rk[0] : -1);
    const bySc = l => (l || []).filter(s => xr[s]).sort((a, b) => score(b) - score(a));
    const C = bySc(X.C), P = bySc(X.P), on = new Set(C.concat(P));
    const heavy = s => xr[s]['f' + xr[s].side] || 0;
    const rest = names.filter(s => !on.has(s)).sort((a, b) => heavy(b) - heavy(a));
    const chip = (s, sd) => `<button class="xc ${sd}" data-s="${esc(s)}">${esc(s)}${xr[s].rk ? `<small>${Math.round(xr[s].rk[0])}</small>` : ''}</button>`;
    const line = (lab, l, sd) => l.length ? `<div class="xl"><span class="xk">${lab}</span>${l.map(s => chip(s, sd)).join('')}</div>` : '';

    const wn = B.xw || names.length, show = names.length ? `${names.length} trading enough to show` : 'none trading enough to show yet';
    const read = ok(B.xread) ? (B.xread ? `${B.xread} read so far, ${show}` : 'none read yet')
      : names.length ? `${names.length} with a reading so far` : 'none with a reading yet';
    return `<section class="xtcs wrap"><div class="xh"><b>Top Call Skews names</b><span>${wn} watched · ${read} · ` +
      `kept out of this board’s counts, tilt, map and lists until the after-close reading (they were picked for their call builds)</span></div>` +
      line(`Opening calls ${C.length}`, C, 'c') + line(`Opening puts ${P.length}`, P, 'p') +
      (rest.length ? line(on.size ? 'Also read' : 'Read so far, none one-sided yet', rest, 'o') : '') + '</section>';
  }
  function drawReads() {
    const svg = $('#readsvg');
    if (!svg) return;
    const W = svg.clientWidth || 900, H = 64, x0 = 10, x1 = W - Math.min(110, W * 0.14), xa = W - 8;
    const X = m => x0 + (Math.min(Math.max(m, 570), 960) - 570) / 390 * (x1 - x0);



    const em = c => (/[0-9]/.test(c) ? 0.6 : /[ .:,·]/.test(c) ? 0.28 : /[fijlrt]/.test(c) ? 0.3 : /[mw]/.test(c) ? 0.8 : /[A-Z]/.test(c) ? 0.66 : 0.52);
    const tw = (s, bold) => [...s].reduce((a, c) => a + em(c), 0) * (bold ? 12 : 11), fit = (x, w) => Math.max(w / 2 + 1, Math.min(W - w / 2 - 1, x));
    const acw = tw('after close'), acx = Math.min((x1 + 6 + xa) / 2, xa - acw / 2);
    let g = `<line class="ax" x1="${x0}" x2="${x1}" y1="34" y2="34"/><rect x="${x1 + 6}" y="28" width="${xa - x1 - 6}" height="12" rx="3" fill="#20242f"/>` +
      `<text x="${acx.toFixed(1)}" y="58" text-anchor="middle">after close</text>`;
    for (let h = 10; h <= 16; h++) {
      const x = X(h * 60), lab = `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`, lx = fit(x, tw(lab));
      g += `<line x1="${x}" x2="${x}" y1="30" y2="38" stroke="#3a3f4c"/>`;
      if (lx + tw(lab) / 2 + 4 <= acx - acw / 2) g += `<text x="${lx.toFixed(1)}" y="58" text-anchor="middle">${lab}</text>`;
    }
    const ft = new Set();
    for (const r of Object.values(B.rows)) for (const p of r.pts || []) if (p[7] === 'f' || p[7] === 'w') ft.add(p[0]);
    for (const t of ft) g += `<line x1="${X(mins(t))}" x2="${X(mins(t))}" y1="29" y2="39" stroke="#4f8fe0" stroke-width="1.5" opacity=".7"/>`;
    const bins = ((B.src && B.src.own && B.src.own.bins) || []);
    const bmax = Math.max(1, ...bins.map(b => b[1])), bw = Math.max(2, (x1 - x0) / 78 - 1);
    for (const [t, c] of bins) {
      const h = 2 + 10 * c / bmax;
      g += `<rect x="${(X(mins(t)) + 0.5).toFixed(1)}" y="41" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1" fill="#9c7cff" opacity=".55"><title>${t} ET · ${c} chains re-read</title></rect>`;
    }
    const reads = (B.src && B.src.reads) || [];
    const top = [], clear = (l, r) => top.every(p => r + 6 <= p[0] || l - 6 >= p[1]);
    let nowG = '';
    if (isLive()) {
      const now = etNow(), nx = X(mins(now)), lab = `now ${now}`, lx = fit(nx, tw(lab));
      top.push([lx - tw(lab) / 2, lx + tw(lab) / 2]);
      nowG = `<line x1="${nx}" x2="${nx}" y1="22" y2="44" stroke="#fff" stroke-width="1.5"/><text x="${lx.toFixed(1)}" y="16" text-anchor="middle" style="fill:#fff">${lab}</text>`;
      if (!reads.some(r => r.k === 'i' && !r.close) && now < '12:00') nowG += `<circle cx="${X(665)}" cy="34" r="6" fill="none" stroke="#9c7cff" stroke-dasharray="2 2"/>`;
      if (!reads.some(r => r.close)) nowG += `<circle cx="${X(970)}" cy="34" r="6" fill="none" stroke="#9c7cff" stroke-dasharray="2 2"/>`;
    }
    let afterN = 0;
    for (const r of reads) {
      const after = r.k === 'u' || r.k === 'e';
      const cx = after ? x1 + 6 + 12 + (afterN++) * 16 : X(mins(r.t[1]));
      const rad = Math.max(5, Math.min(9, 3 + Math.sqrt(r.n) / 6));
      g += `<circle cx="${cx}" cy="34" r="${rad}" fill="#9c7cff" stroke="var(--pan2)" stroke-width="2"><title>${r.n} names · ${esc(KIND[r.k] || r.k)} · trades to ${r.t[2]} ET</title></circle>`;
      if (after) continue;
      const lab = `${r.close ? 'close' : r.t[1]} · ${r.n.toLocaleString()} names`, w = tw(lab, true), lx = fit(cx, w);
      if (clear(lx - w / 2, lx + w / 2)) { g += `<text class="lbl" x="${lx.toFixed(1)}" y="16" text-anchor="middle">${lab}</text>`; top.push([lx - w / 2, lx + w / 2]); }
    }
    g += nowG;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = g;
  }


  function mapPoints() {
    const pts = [];
    for (const [s, r] of Object.entries(B.rows)) {
      if (!inU(s) || !match(s)) continue;
      const tot = r.fC + r.fP, w = r.why || [];
      if (tot < 100 || w.includes('book') || w.includes('price')) continue;
      const y = r['f' + r.side] / r.bk;
      if (!(y > 0)) continue;
      if (heldOnly() && !w.length && !isHeld(s)) continue;
      pts.push({s, r, x: r.fC / tot, y, m: r['p' + r.side] || 0, c: w.length ? 'o' : r.side, held: isHeld(s) || !hasHeld()});
    }
    return pts;
  }
  function drawMap() {
    const svg = $('#mapsvg');
    if (!svg) return;
    const W = svg.clientWidth || 700, H = Math.round(Math.max(300, Math.min(440, W * 0.56)));
    const pl = 46, pr = 14, pt = 16, pb = 36, iw = W - pl - pr, ih = H - pt - pb;
    const LO = Math.log10(0.0005), HI = Math.log10(0.6);
    const X = x => pl + x * iw;
    const Y = y => pt + (1 - (Math.log10(Math.min(Math.max(y, 0.0005), 0.6)) - LO) / (HI - LO)) * ih;
    const pts = mapPoints();
    const mMax = Math.max(1, ...pts.map(p => p.m));
    let g = `<rect x="${X(0.85)}" y="${pt}" width="${X(1) - X(0.85)}" height="${ih}" fill="var(--upw)"/>` +
      `<rect x="${X(0)}" y="${pt}" width="${X(0.15) - X(0)}" height="${ih}" fill="var(--dnw)"/>`;
    for (const [v, lab] of [[0.001, '0.1%'], [0.01, '1%'], [0.1, '10%']]) g += `<line class="ax" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${lab}</text>`;
    const narrow = W < 560;
    for (const [v, lab] of [[0, 'all puts'], [0.15, ''], [0.5, 'even'], [0.85, ''], [1, 'all calls']]) {
      const show = !!lab && (!narrow || v === 0 || v === 0.5 || v === 1);
      g += `<line class="ax" x1="${X(v)}" x2="${X(v)}" y1="${pt}" y2="${pt + ih}"/>` +
        (show ? `<text x="${X(v)}" y="${H - 18}" text-anchor="${v === 0 ? 'start' : v === 1 ? 'end' : 'middle'}">${lab}</text>` : '');
    }
    g += `<text x="${pl + iw / 2}" y="${H - 3}" text-anchor="middle">share of today’s new contracts that are calls</text>`;
    g += `<text x="12" y="${pt + ih / 2}" text-anchor="middle" transform="rotate(-90 12 ${pt + ih / 2})">heavy side, % of open interest</text>`;
    const order = pts.slice().sort((a, b) => (a.c === 'o') - (b.c === 'o') || b.m - a.m).reverse();
    MAP = [];
    for (const p of order) {
      const cx = X(p.x), cy = Y(p.y), rr = p.c === 'o' ? 2.5 + 4 * Math.sqrt(p.m / mMax) : 4 + 10 * Math.sqrt(p.m / mMax);
      const fill = p.c === 'C' ? 'var(--up)' : p.c === 'P' ? 'var(--dn)' : '#5d606b';
      if (p.c !== 'o' && !p.held)
        g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr.toFixed(1)}" fill="${fill}" fill-opacity="0.16" stroke="${fill}" stroke-width="2"/>`;
      else
        g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr.toFixed(1)}" fill="${fill}" fill-opacity="${p.c === 'o' ? 0.55 : 0.9}" stroke="var(--pan)" stroke-width="${p.c === 'o' ? 1 : 2}"/>`;
      MAP.push({s: p.s, cx, cy, rr, p});
    }
    const placed = [];
    const lab = pts.filter(p => p.c !== 'o').sort((a, b) => (b.held - a.held) || (b.r.sc - a.r.sc));
    let nC = 0, nP = 0;
    for (const p of lab) {
      if (p.c === 'C' ? nC >= 7 : nP >= 7) continue;
      const cx = X(p.x), cy = Y(p.y), rr = 4 + 10 * Math.sqrt(p.m / mMax), w = p.s.length * 7.2 + 4, h = 13;
      const right = p.x < 0.5;
      const bx = right ? cx + rr + 3 : cx - rr - 3 - w, by = cy - h / 2;
      if (bx < pl || bx + w > W - pr) continue;
      if (placed.some(q => bx < q[0] + q[2] && bx + w > q[0] && by < q[1] + q[3] && by + h > q[1])) continue;
      placed.push([bx, by, w, h]);
      g += `<text class="lbl" x="${right ? bx : bx + w}" y="${cy + 4}" text-anchor="${right ? 'start' : 'end'}">${esc(p.s)}</text>`;
      if (p.c === 'C') nC++; else nP++;
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = H + 'px';
    svg.innerHTML = g;
  }
  function mapHit(ev) {
    const svg = $('#mapsvg');
    if (!svg || !MAP.length) return null;
    const b = svg.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top;
    let best = null, bd = 1e9;
    for (const m of MAP) { const d = Math.hypot(m.cx - x, m.cy - y) - m.rr; if (d < bd) { bd = d; best = m; } }
    return bd <= 8 ? best : null;
  }
  function rowTip(s) {
    const r = R(s);
    if (!r) return '';
    const side = r.side, top = (r.top[side] || [])[0];
    return `<div class="tt">${esc(s)} <span class="muted">${esc(r.n || '')}</span></div>` +
      `<div><b>${pc(r.fC / Math.max(1, r.fC + r.fP))}</b> of new contracts are calls</div>` +
      `<div>new calls <b>${kc(r.fC)}</b> · new puts <b>${kc(r.fP)}</b></div>` +
      `<div>heavy side <b>${pcBook(r['f' + side] / r.bk)}</b> of open interest · <b>${usd(r['p' + side])}</b></div>` +
      (ok(r.xn) ? `<div>${paceTxt(r.xn)} its normal pace</div>` : '') +
      (top ? `<div>main line ${lineTxt(top, side)} · ${kc(top[2])} new</div>` : '') +
      ((r.why || []).length ? `<div class="muted">not listed: ${esc(whyTxt(r).join(', '))}</div>` : '') +
      (heldWords(r) ? `<div>${heldWords(r)}</div>` : '') +
      `<div class="muted">reading ${r.t} ET (${esc(KIND[r.k] || r.k)})</div>`;
  }


  function drawBars() {
    const svg = $('#barsvg');
    if (!svg) return;
    const W = svg.clientWidth || 500, narrow = W < 520, n = narrow ? 7 : 10;
    const byVal = side => listOf(side).filter(s => ok(lensVal(s, side))).sort((a, b) => lensVal(b, side) - lensVal(a, side)).slice(0, n);
    const C = byVal('C'), P = byVal('P');
    const rows = Math.max(C.length, P.length, 1);

    const txt = (s, side) => (narrow ? lensShort(s, side) : lensTxt(s, side));
    const lw = (s, side) => s.length * 7.6 + String(txt(s, side)).length * 6.1 + 14;
    const maxw = Math.max(80, ...C.map(s => lw(s, 'C')), ...P.map(s => lw(s, 'P')));
    const note = (C.length || P.length) && hasHeld(), foot = narrow && note ? 16 : 0;
    const rh = 28, top = 26, H = top + rows * rh + 6 + foot, mid = W / 2, room = Math.max(40, mid - maxw - 4);
    const vals = C.map(s => lensVal(s, 'C')).concat(P.map(s => lensVal(s, 'P'))).filter(ok);
    const vmax = Math.max(1e-9, ...vals);
    let g = `<text x="${mid - 8}" y="14" text-anchor="end" class="lbl">← opening puts</text><text x="${mid + 8}" y="14" class="lbl">opening calls →</text>` +
      `<line class="ax" x1="${mid}" x2="${mid}" y1="${top - 6}" y2="${H}"/>`;
    const bar = (side, s, i) => {
      const v = lensVal(s, side);
      if (!ok(v)) return '';
      const w = Math.max(3, v / vmax * room), y = top + i * rh + 6, h = 14, rr = Math.min(4, w / 2);
      const x = side === 'C' ? mid + 1 : mid - 1 - w;
      const d = side === 'C'
        ? `M${x},${y}h${w - rr}a${rr},${rr} 0 0 1 ${rr},${rr}v${h - 2 * rr}a${rr},${rr} 0 0 1 -${rr},${rr}h-${w - rr}z`
        : `M${x + w},${y}h-${w - rr}a${rr},${rr} 0 0 0 -${rr},${rr}v${h - 2 * rr}a${rr},${rr} 0 0 0 ${rr},${rr}h${w - rr}z`;
      const tx = side === 'C' ? x + w + 6 : x - 6, an = side === 'C' ? 'start' : 'end';
      return `<g class="hit" data-s="${esc(s)}"><rect x="${side === 'C' ? mid : 0}" y="${y - 6}" width="${mid}" height="${rh}" fill="transparent"/>` +
        `<path d="${d}" fill="${side === 'C' ? 'var(--up)' : 'var(--dn)'}"${hasHeld() && !isHeld(s) ? ' fill-opacity="0.45"' : ''}/>` +
        `<text x="${tx}" y="${y + 11}" text-anchor="${an}"><tspan class="lbl">${esc(s)}</tspan> ${esc(txt(s, side))}</text></g>`;
    };
    C.forEach((s, i) => { g += bar('C', s, i); });
    P.forEach((s, i) => { g += bar('P', s, i); });
    if (!C.length && !P.length) g += `<text x="${mid}" y="${top + 16}" text-anchor="middle">nothing on this lens yet</text>`;
    else if (note) g += `<text x="${W - 4}" y="${narrow ? H - 4 : 14}" text-anchor="end">faded = not held yet</text>`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = H + 'px';
    svg.innerHTML = g;
  }


  function sparkSVG(r, side) {
    const pts = r.pts;
    if (!pts || pts.length < 2) return '';
    const W = 240, H = 30, xs = pts.map(p => mins(p[0])), t0 = 570, t1 = Math.max(960, ...xs);
    const ix = side === 'C' ? 1 : 2, jx = side === 'C' ? 2 : 1;
    const ymax = Math.max(1, ...pts.map(p => Math.max(p[1], p[2])));
    const X = m => 2 + (m - t0) / (t1 - t0) * (W - 4), Y = v => H - 3 - v / ymax * (H - 7);
    const line = k => pts.map((p, i) => `${i ? 'L' : 'M'}${X(mins(p[0])).toFixed(1)},${Y(p[k]).toFixed(1)}`).join('');
    const col = side === 'C' ? 'var(--up)' : 'var(--dn)', oc = side === 'C' ? 'var(--dn)' : 'var(--up)';
    const last = pts[pts.length - 1];
    return `<svg class="spk" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">` +
      `<path d="${line(jx)}" fill="none" stroke="${oc}" stroke-width="1.5" opacity=".45" vector-effect="non-scaling-stroke"/>` +
      `<path d="${line(ix)}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/>` +
      `<circle cx="${X(mins(last[0]))}" cy="${Y(last[ix])}" r="2.5" fill="${col}"/></svg>`;
  }
  function splitBar(r, wide) {
    const tot = r.fC + r.fP, cs = tot ? r.fC / tot : 0.5;
    const a = cs > 0 ? `<i class="c" style="flex:${cs.toFixed(4)}"></i>` : '', b = cs < 1 ? `<i class="p" style="flex:${(1 - cs).toFixed(4)}"></i>` : '';
    return `<div class="split${wide ? ' wide' : ''}" role="img" aria-label="${pc(cs)} of new contracts are calls">${a}${b}</div>`;
  }
  function cardHTML(s, side, i) {
    const r = R(s), h = r['f' + side], top = S.l === 'bets' ? moneyLine(r, side) : (r.top[side] || [])[0];
    const kv = [`<span><b>${usd(r['p' + side])}</b> behind them</span>`];
    if (ok(r.xn)) kv.push(`<span class="${r.xn >= 3 ? 'hot' : ''}"><b>${paceTxt(r.xn)}</b> normal pace</span>`);
    if (r.d && r.side === side && r.d[0] > 0) kv.push(`<span><b>+${kc(r.d[0])}</b> since ${r.d[1]}</span>`);
    const ml = top ? `<div class="ml">${S.l === 'bets' ? 'Most money' : 'Main line'} <b>${lineTxt(top, side)}</b> · ${kc(top[2])} new · traded ${kc(top[3])} vs ${kc(top[4])} open · $${top[5]}${top[6] ? ' · ' + TAG[top[6]] : ''}</div>` : '';
    const pill = r.rk ? `#${i + 1} \u00b7 <b>${Math.round(r.rk[0])}</b>` : `#${i + 1}`;
    return `<div class="card" data-s="${esc(s)}" tabindex="0" role="button"><span class="rk" title="${r.rk ? 'Rank score ' + r.rk[0] + ' of 100' : ''}">${pill}</span>` +
      `<div class="ch"><span class="tk">${esc(s)}</span><span class="co" title="${esc(r.n || '')}">${esc(r.n || '')}</span></div>` +
      `<div class="pxl"><span class="num">${fpx(r.px)}</span>${chg(r)}<span class="muted">reading ${r.t} ET</span></div>` +
      (heldBadge(r) ? `<div class="hbl">${heldBadge(r)}</div>` : '') +
      splitBar(r) +
      `<div class="big"><b>${kc(h)}</b><span class="w">new ${SIDEW[side]}</span><span class="m">${pc(r.sh)} one side · ${pcBook(h / r.bk)} of open interest</span></div>` +
      `<div class="kv">${kv.join('')}</div>${ml}${sparkSVG(r, side)}</div>`;
  }
  function colHTML(side) {
    const list = listOf(side), lim = S.all[side] ? list.length : SHOW;
    const nh = list.filter(isHeld).length;
    const head = `<div class="colh"><i class="sw ${side.toLowerCase()}"></i>Opening ${SIDEW[side]}<span class="n">${list.length} ${list.length === 1 ? 'name' : 'names'}${S.l === 'one' && !heldOnly() && hasHeld() ? ` · ${nh} held first` : ''} · ${esc(LENSES.find(l => l[0] === S.l)[1].toLowerCase())}</span></div>`;
    const body = list.length ? `<div class="cards">${list.slice(0, lim).map((s, i) => cardHTML(s, side, i)).join('')}</div>` +
      (list.length > lim ? `<button class="more" data-more="${side}">Show all ${list.length}</button>` : '')
      : `<div class="none">${heldOnly() && listed(side).length ? `${listed(side).length} ${listed(side).length === 1 ? 'name is' : 'names are'} on the list, none held yet.`
          : S.l === 'build' ? 'No name has two readings with new ' + SIDEW[side] + ' added yet.' : 'No name passes the one-sided rule on this side yet.'}</div>`;
    return `<div class="col${S.m !== side ? ' hid' : ''}" id="col${side}">${head}${body}</div>`;
  }


  const TCOLS = [['s', 'Name', 'l'], ['rk', 'Score'], ['side', 'Side', 'l'], ['hs', 'Held since', 'l'], ['hn', 'In a row'], ['sh', 'One side'], ['h', 'New contracts'],
    ['ob', '% of OI'], ['usd', 'Money'], ['xn', 'Vs normal'], ['dd', 'Added'], ['ml', 'Main line', 'l'], ['px', 'Price'], ['chg', 'Today'], ['t', 'Reading']];
  function tval(s, k) {
    const r = R(s), side = r.side;
    switch (k) {
      case 's': return s;
      case 'rk': return hasRank() ? (r.rk ? r.rk[0] : -1) : r.sc;
      case 'side': return side;
      case 'hs': return isHeld(s) ? r.held.since : r.held && r.held.st ? 'zy' + r.held.since : 'zz';
      case 'hn': return r.held && r.held.st ? (r.held.n || 0) : 0;
      case 'sh': return r.sh;
      case 'h': return r['f' + side];
      case 'ob': return r['f' + side] / r.bk;
      case 'usd': return r['p' + side];
      case 'xn': return ok(r.xn) ? r.xn : -1;
      case 'dd': return r.d ? r.d[0] : -1e12;
      case 'ml': { const t = (r.top[side] || [])[0]; return t ? t[2] : 0; }
      case 'px': return r.px || 0;
      case 'chg': { const c = chgOf(r); return c == null ? -1e9 : c; }
      case 't': return r.t;
      default: return r.sc;
    }
  }
  function tableHTML() {
    const syms = listOf('C').concat(listOf('P'));
    const k = S.sort, d = S.sd;
    syms.sort((a, b) => { const x = tval(a, k), y = tval(b, k); return (x > y ? 1 : x < y ? -1 : 0) * d; });
    const th = TCOLS.map(([key, lab, l]) => `<th class="${l ? 'l' : ''}${S.sort === key ? ' on' : ''}" data-k="${key}">${lab}${S.sort === key ? (S.sd < 0 ? ' ▾' : ' ▴') : ''}</th>`).join('');
    const tr = syms.map(s => {
      const r = R(s), side = r.side, top = (r.top[side] || [])[0];
      return `<tr data-s="${esc(s)}"><td class="l"><span class="tk">${esc(s)}</span> <span class="muted">${esc((r.n || '').slice(0, 26))}</span></td>` +
        `<td class="num"><b>${r.rk ? Math.round(r.rk[0]) : '\u2013'}</b></td>` +
        `<td class="l ${side === 'C' ? 'up' : 'dn'}">${SIDEW[side]}</td>` +
        `<td class="l">${!r.held || !r.held.st ? '<span class="muted">' + (r.held && r.held.was ? 'off · was ' + SIDEW[r.held.was] : '–') + '</span>'
          : isHeld(s) ? esc(r.held.since) : r.held.st === 'new' ? '<span class="muted">new ' + esc(r.held.since) + '</span>' : '<span class="muted">first</span>'}</td>` +
        `<td class="num">${r.held && r.held.n ? r.held.n : '–'}</td><td class="num">${pc(r.sh)}</td><td class="num">${kc(r['f' + side])}</td>` +
        `<td class="num">${pcBook(r['f' + side] / r.bk)}</td><td class="num">${usd(r['p' + side])}</td><td class="num">${ok(r.xn) ? paceTxt(r.xn) : '–'}</td>` +
        `<td class="num">${r.d && r.d[0] ? (r.d[0] > 0 ? '+' : '') + kc(r.d[0]) + ' since ' + r.d[1] : '–'}</td>` +
        `<td class="l">${top ? lineTxt(top, side) + ' · ' + kc(top[2]) : '–'}</td><td class="num">${fpx(r.px)}</td><td class="num">${chg(r)}</td><td class="num">${r.t}</td></tr>`;
    }).join('');
    return `<section class="sec wrap"><div class="sh"><h2>Every listed name</h2><span>${syms.length} names · click a header to sort</span></div>` +
      `<div class="tbl"><table><thead><tr>${th}</tr></thead><tbody>${tr || '<tr><td class="l" colspan="15">No listed names.</td></tr>'}</tbody></table></div></section>`;
  }


  function footHTML() {
    if (!B) return '';
    const src = B.src || {}, bd = src.base_days;
    return `<p><b>What this shows.</b> Option contracts traded today that must be new positions: volume above the open interest each contract carried into the session. ` +
      `A name is listed when enough new contracts sit on one side and that side holds nearly all of them, on names with a deep enough option book, price and stock volume: ` +
      `the Skew Tracker’s Tape rule, run during the session. The shortest-dated contracts are left out.</p>` +
      `<p><b>Money</b> = what the new contracts cost at each contract’s mid. <b>Vs normal</b> = new contracts so far against what the name normally opens by this time of day. ` +
      `<b>Normal day</b> = the name’s recent whole sessions${bd ? ` (${dayTxt(bd[0])} to ${dayTxt(bd[1])})` : ''}. <b>Main line</b> = the contract with the most new contracts on that side. ` +
      `<b>Rank score</b> = 0\u2013100 from six parts: how one-sided, new contracts against open interest, money, pace against a normal day, how long it has held, and where its biggest-money contract last printed. ` +
      `<b>Held</b> = on the list on the same side at several readings in a row (holding is part of the score).</p>` +
      `<p><b>Data.</b> Delayed option chains (about 15 min behind), read through the session: wide readings late morning, at the close and after it, and this board’s own re-reads in between. ` +
      `Top Call Skews names the wide readings miss are read too, and kept in their own strip until the after-close reading. ` +
      `Open interest: the ${dayTxt(B.settle)} settle. Prices: each chain’s own.</p>`;
  }


  function whyTxt(r) {
    const W = {book: 'open interest too small', price: 'share price too low', illiquid: 'stock volume too thin', size: 'too few new contracts on the heavy side',
      mixed: `${pc(r.sh)} one side, not one-sided enough`, deep: 'mostly struck deep in the money'};
    return (r.why || []).map(w => W[w] || w);
  }
  function curveAt(hhmm) {
    const c = B.curve;
    if (!c) return null;
    const t = mins(hhmm), mk = c.marks, fr = c.frac;
    if (t <= mk[0]) return fr[0] || 0.01;
    if (t >= mk[mk.length - 1]) return 1;
    for (let i = 1; i < mk.length; i++) if (t <= mk[i]) return Math.max(0.01, fr[i - 1] + (fr[i] - fr[i - 1]) * (t - mk[i - 1]) / (mk[i] - mk[i - 1]));
    return 1;
  }
  function timelineHTML(r) {
    const pts = r.pts;
    if (!pts || pts.length < 2) {
      const how = {u: 'Read once, after the close.', s: 'Re-read through the session, more often near the lists.',
        i: 'Read at the wide readings, and between them when active.', e: 'Read at the wide readings, and between them when active.',
        f: 'Read all session.', w: 'Read all session.'}[r.k] || '';
      return `<div class="none">One reading of ${esc(r.n ? r.n : 'this name')} so far (${r.t} ET, ${esc(KIND[r.k] || r.k)}). ${how}</div>`;
    }
    return `<svg id="tlsvg" style="height:210px" aria-label="New contracts through the day"></svg>` +
      `<div class="leg"><span><i class="c"></i>new calls</span><span><i class="p"></i>new puts</span>${r.base && r.base.n >= 8 ? `<span><i class="o"></i>normal pace (${SIDEW[r.side]})</span>` : ''}<span>shaded = on the list</span></div>`;
  }
  function drawTimeline(r) {
    const svg = $('#tlsvg');
    TL = null;
    if (!svg || !r || !r.pts || r.pts.length < 2) return;
    const W = svg.clientWidth || 500, H = 210, pl = 44, pr = 64, pt = 12, pb = 24, iw = W - pl - pr, ih = H - pt - pb;
    const pts = r.pts, side = r.side;
    const nh = r.base && r.base.n >= 8 && ok(r.base.fcs) ? Math.max(r.base.F * (side === 'C' ? r.base.fcs : 1 - r.base.fcs), 100) : null;
    const lastT = Math.min(960, Math.max(...pts.map(p => mins(p[0]))));
    const normAt = t => (nh ? nh * (curveAt(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')) || 0) : 0);
    const ymax = Math.max(10, ...pts.map(p => Math.max(p[1], p[2])), nh ? normAt(lastT) : 0) * 1.08;
    const X = m => pl + (Math.min(Math.max(m, 570), 960) - 570) / 390 * iw, Y = v => pt + (1 - v / ymax) * ih;
    let g = '';
    for (let i = 0; i < pts.length; i++) {
      const f = pts[i][8];
      if (!f) continue;
      const xa = X(mins(pts[i][0])), xb = i + 1 < pts.length ? X(mins(pts[i + 1][0])) : Math.min(pl + iw, xa + 6);
      g += `<rect x="${xa.toFixed(1)}" y="${pt}" width="${Math.max(2, xb - xa).toFixed(1)}" height="${ih}" fill="${f === 'C' ? 'var(--upw)' : 'var(--dnw)'}"/>`;
    }
    for (const f of [0.25, 0.5, 0.75, 1]) g += `<line class="ax" x1="${pl}" x2="${pl + iw}" y1="${Y(ymax / 1.08 * f)}" y2="${Y(ymax / 1.08 * f)}"/><text x="${pl - 6}" y="${Y(ymax / 1.08 * f) + 4}" text-anchor="end">${kc(ymax / 1.08 * f)}</text>`;
    for (let h = 10; h <= 16; h += 2) g += `<text x="${X(h * 60)}" y="${H - 6}" text-anchor="middle">${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}</text>`;
    if (nh) {
      let d = '';
      for (let t = 570; t <= lastT; t += 5) d += `${d ? 'L' : 'M'}${X(t).toFixed(1)},${Y(normAt(t)).toFixed(1)}`;
      g += `<path d="${d}" fill="none" stroke="#7d818c" stroke-width="1.5"/>`;
    }
    const path = k => pts.map((p, i) => `${i ? 'L' : 'M'}${X(mins(p[0])).toFixed(1)},${Y(p[k]).toFixed(1)}`).join('');
    g += `<path d="${path(2)}" fill="none" stroke="var(--dn)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    g += `<path d="${path(1)}" fill="none" stroke="var(--up)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const p of pts) {
      g += `<circle cx="${X(mins(p[0]))}" cy="${Y(p[2])}" r="${p[7] === 'f' || p[7] === 'w' ? 2.5 : 4}" fill="var(--dn)" stroke="#181c27" stroke-width="2"/>`;
      g += `<circle cx="${X(mins(p[0]))}" cy="${Y(p[1])}" r="${p[7] === 'f' || p[7] === 'w' ? 2.5 : 4}" fill="var(--up)" stroke="#181c27" stroke-width="2"/>`;
    }
    const L = pts[pts.length - 1], lx = X(mins(L[0])) + 8;
    let yc = Y(L[1]), yp = Y(L[2]);
    if (Math.abs(yc - yp) < 13) { if (yc <= yp) { yc -= 7; yp += 7; } else { yc += 7; yp -= 7; } }
    g += `<text x="${lx}" y="${yc + 4}" style="fill:#e6e8ee">${kc(L[1])} calls</text><text x="${lx}" y="${yp + 4}" style="fill:#e6e8ee">${kc(L[2])} puts</text>`;
    g += `<line id="tlx" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" stroke="#fff" stroke-width="1" opacity="0"/>`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = g;
    TL = {r, X, pts, inv: x => 570 + (x - pl) / iw * 390};
  }
  function throughHTML(r) {
    return `<div class="tday"><div class="tbox"><div class="ct">New contracts (cumulative)</div>${timelineHTML(r)}</div></div>`;
  }
  function hideCross() {
    for (const id of ['#tlx', '#pxx']) { const l = $(id); if (l) l.setAttribute('opacity', 0); }
  }
  function syncHover(ev, which) {
    const svg = $(which === 'px' ? '#pxsvg' : '#tlsvg'), st = which === 'px' ? PX : TL;
    if (!svg || !st) { hideCross(); untip(); return; }
    const b = svg.getBoundingClientRect(), m = Math.round(st.inv(ev.clientX - b.left));
    if (m < 570 || m > 960) { hideCross(); untip(); return; }
    const put = (id, S_) => { const l = $(id); if (l && S_) { const x = S_.X(m).toFixed(1); l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('opacity', 0.4); } };
    put('#pxx', PX); put('#tlx', TL);
    let html = `<div class="tt">${fmtMin(m)} ET</div>`;
    if (PX && PX.bars.length) {
      const c = PX.priceAt(m);
      html += c == null ? `<div class="muted">${m < PX.bars[0][0] ? 'before the first bar' : 'no price yet at this time'}</div>`
        : `<div>price <b>${c.toFixed(PX.dec)}</b>${ok(PX.prev) && PX.prev ? ` (${c >= PX.prev ? '+' : ''}${((c / PX.prev - 1) * 100).toFixed(1)}% on the day)` : ''}</div>`;
    }
    if (TL) {
      let p = null;
      for (const q of TL.pts) if (mins(q[0]) <= m) p = q;
      html += p ? `<div>new calls <b>${kc(p[1])}</b> \u00b7 puts <b>${kc(p[2])}</b></div><div class="muted">as of the ${p[0]} reading${p[8] ? ' \u00b7 on the list' : ''}</div>`
        : `<div class="muted">no reading yet at this time</div>`;
    }
    tip(html, ev.clientX, ev.clientY);
  }
  function linesTable(r, side) {
    const ls = r.top[side] || [];
    if (!ls.length) return `<div class="none">No ${SIDEW[side]} traded above their open interest.</div>`;
    return `<div class="tblw"><table class="lines"><thead><tr><th class="l">Contract</th><th>New</th><th>Traded</th><th class="hide-s">Open</th><th class="hide-s">Mid</th><th>Money</th><th class="l">Last print</th></tr></thead><tbody>` +
      ls.map(l => `<tr><td class="l"><b>${lineTxt(l, side)}</b></td><td class="num">${kc(l[2])}</td><td class="num">${kc(l[3])}</td><td class="num hide-s">${kc(l[4])}</td>` +
        `<td class="num hide-s">${l[5]}</td><td class="num">${usd(l[2] * l[5] * 100)}</td><td class="l muted">${l[6] ? {a: 'near the ask', b: 'near the bid', m: 'mid'}[l[6]] : '–'}</td></tr>`).join('') +
      `</tbody></table></div>`;
  }
  function panelHTML(s) {
    const r = R(s);
    const head = (inner) => `<div class="ph"><div class="ph1"><span class="tk">${esc(s)}</span><span class="co">${esc(r ? r.n : '')}</span>` +
      `<button class="pclose" data-close="1" aria-label="Close">×</button></div>${inner}</div>`;
    if (!r) return head('') + `<div class="psec"><div class="none">${esc(s)} has no reading on ${dayTxt(B.T)} (or traded too few contracts).</div></div>`;
    const side = r.side, tot = r.fC + r.fP;
    const tags = (r.u || []).map(u => ({spx: 'S&P 500', ndx: 'Nasdaq 100', ai: 'AI', etf: 'ETF'}[u])).filter(Boolean);
    const h2 = `<div class="ph2"><b class="num">${fpx(r.px)}</b>${chg(r)}<span>reading ${r.t} ET · ${esc(KIND[r.k] || r.k)}</span>${tags.map(t => `<span class="utag">${t}</span>`).join('')}</div>`;
    const listedNow = !(r.why || []).length;
    const apart = !!(B.xrows && B.xrows[s] && !(B.rows && B.rows[s]));
    const stat = sd => `<div class="stat"><div class="sl"><i class="sw ${sd.toLowerCase()}"></i>New ${SIDEW[sd]}</div><div class="sv">${kc(r['f' + sd])}</div>` +
      `<div class="ss">${pcBook(r['f' + sd] / Math.max(1, r.bk))} of open interest · ${usd(r['p' + sd])}<br>traded ${kc(r['v' + sd])} · ${kc(r['n' + sd])} of the new in the next 2 weeks</div></div>`;
    const b = r.base;
    const normal = b && b.n >= 8
      ? `<div class="kv"><span>Normal whole day: <b>${kc(b.F)}</b> new contracts, <b>${pc(b.fcs)}</b> calls</span><span>traded <b>${kc(b.V)}</b>, ${pc(b.cs)} calls</span>` +
        '</div>' +
        (ok(r.xn) ? `<div class="big" style="margin-top:8px"><b>${paceTxt(r.xn)}</b><span class="w">its normal pace on the ${SIDEW[side]} side</span><span class="m">by ${r.t} ET</span></div>` : '')
      : `<div class="none">Not enough saved sessions for ${esc(s)} yet, so no normal day.</div>`;
    const rkVals = r.rk ? (() => {
      const h = r.held || {}, mx = (r.mx && r.mx[side]) || (r.top[side] || [])[0], tag = mx && mx[6];
      return [`${r.sh >= 0.995 && r.sh < 1 ? pc(r.sh, 1) : pc(r.sh)} one side`, `${pcBook(r['f' + side] / r.bk)} of open interest`, usd(r['p' + side]),
              ok(r.xn) ? paceTxt(r.xn) + ' its normal pace' : 'no normal day yet',
              h.st === 'held' || h.st === 'new' ? `${h.span} min ${apart ? 'passing the rule' : 'on the list'}` : h.st === 'first' ? 'one reading so far' : 'not on the list',
              (mx ? `${lineTxt(mx, side)}: ` : '') + (tag === 'a' ? 'last print near the ask' : tag === 'b' ? 'last print near the bid' : tag === 'm' ? 'last print mid' : 'no print side')];
    })() : null;

    const frac = x => Math.max(0, Math.min(1, ok(x) ? x : 0));
    const rankSec = r.rk ? `<div class="psec"><div class="psh">Score <b>${Math.round(r.rk[0])}</b><span>of 100 \u00b7 each part, from none to full</span></div>` +
      `<table class="lines rkt"><tbody>${RK_PARTS.map((lab, i) => `<tr><td class="l">${lab}</td><td class="l muted">${esc(rkVals[i])}</td>` +
        `<td class="bar"><i style="width:${(frac(r.rk[i + 1]) * 100).toFixed(0)}%"></i></td></tr>`).join('')}</tbody></table></div>` : '';
    const rule = listedNow
      ? (apart
        ? `<div class="kv"><span class="${side === 'C' ? 'up' : 'dn'}"><b>Passes the ${side === 'C' ? 'call' : 'put'} rule</b></span><span>${kc(r['f' + side])} new ${SIDEW[side]}, ${pc(r.sh)} one side · a Top Call Skews name, kept off this board’s lists until the after-close reading</span></div>`
        : `<div class="kv"><span class="${side === 'C' ? 'up' : 'dn'}"><b>On the ${side === 'C' ? 'call' : 'put'} list</b></span><span>${kc(r['f' + side])} new ${SIDEW[side]}, ${pc(r.sh)} one side</span></div>`)
      : `<div class="why">${apart ? 'Fails the rule' : 'Not listed'}: ${esc(whyTxt(r).join(' · '))}</div>`;
    return head(h2) +
      `<div class="psec"><div class="psh">${isLive() ? 'Today so far' : esc(dayTxt(B.T))} <span>${pc(tot ? r.fC / tot : null)} of ${kc(tot)} new contracts are calls</span></div>${splitBar(r, true)}<div class="duo" style="margin-top:10px">${stat('C')}${stat('P')}</div><div style="margin-top:8px">${rule}</div>${heldWords(r) ? `<div class="kv" style="margin-top:6px"><span>${heldWords(r)}</span></div>` : ''}</div>` +
      `<div class="psec"><div class="psh">Through the day <span>new contracts through the day \u00b7 hover for each reading</span></div>${throughHTML(r)}</div>` +
      rankSec +
      `<div class="psec"><div class="psh">Biggest new ${SIDEW[side]} <span>contracts that traded above their open interest</span></div>${linesTable(r, side)}</div>` +
      `<div class="psec"><div class="psh">Biggest new ${SIDEW[other(side)]}</div>${linesTable(r, other(side))}</div>` +
      `<div class="psec"><div class="psh">Against its normal day</div>${normal}</div>`;
  }
  function openPanel(s) {
    S.s = s;
    writeHash();
    const p = $('#panel');
    p.innerHTML = panelHTML(s);
    p.hidden = false;
    $('#scrim').hidden = false;
    document.body.classList.add('popen');
    drawTimeline(R(s));
  }
  function closePanel() {
    S.s = '';
    writeHash();
    $('#panel').hidden = true;
    $('#scrim').hidden = true;
    document.body.classList.remove('popen');
    untip();
  }


  const TIP = $('#tip');
  function tip(html, x, y) {
    TIP.innerHTML = html;
    TIP.hidden = false;
    const w = TIP.offsetWidth, h = TIP.offsetHeight;
    let L = x + 14, T = y + 14;
    if (L + w > innerWidth - 8) L = x - w - 14;
    if (T + h > innerHeight - 8) T = y - h - 14;
    TIP.style.left = Math.max(8, L) + 'px';
    TIP.style.top = Math.max(8, T) + 'px';
  }
  function untip() { TIP.hidden = true; }


  function mainHTML() {
    if (!B.n) return `<div class="empty">No option readings for ${dayTxt(B.T)} yet. The first readings land shortly after the open.</div>`;
    if (S.v === 'table') return heroHTML() + tcsHTML() + tableHTML();
    const nC = listOf('C').length, nP = listOf('P').length;
    const lensTip = LENSES.find(l => l[0] === S.l)[2];
    return heroHTML() + readsHTML() + tcsHTML() +
      (window.ISThemes ? ISThemes.html(B, {live: isLive()}) : '') +
      `<section class="sec wrap grid2"><div class="box"><div class="sh"><h2>Skew map</h2><span>every name opening new contracts · dot size = money on the heavy side</span></div>` +
      `<svg id="mapsvg" role="img" aria-label="Skew map"></svg><div class="leg"><span><i class="c"></i>listed: opening calls</span><span><i class="p"></i>listed: opening puts</span><span><i class="o"></i>other names</span>${hasHeld() ? '<span>solid = held · ring = not held yet</span>' : ''}<span>shaded = one-sided enough to list</span></div></div>` +
      `<div class="box"><div class="sh"><h2>${esc(LENSES.find(l => l[0] === S.l)[1])}</h2><span>${esc(lensTip)}</span></div><svg id="barsvg" role="img" aria-label="Top names each side"></svg></div></section>` +
      `<section class="sec wrap"><div class="seg show-s" style="margin-bottom:10px"><button class="${S.m === 'C' ? 'on' : ''}" data-m="C">Calls<b>${nC}</b></button><button class="${S.m === 'P' ? 'on' : ''}" data-m="P">Puts<b>${nP}</b></button></div>` +
      `<div class="cols">${colHTML('C')}${colHTML('P')}</div></section>`;
  }
  function drawCharts() { drawReads(); drawMap(); drawBars(); }
  function render() {
    renderBar();
    renderCtl();
    if (!B) return;
    $('#main').innerHTML = mainHTML();
    $('#foot').innerHTML = footHTML();
    drawCharts();
    if (S.s) openPanel(S.s); else if (!$('#panel').hidden) closePanel();
  }


  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-close],[data-u],[data-l],[data-v],[data-h],[data-m],[data-more],[data-k],[data-s]');
    if (!t) return;
    if (t.dataset.close) return closePanel();
    if (t.dataset.u) { S.u = t.dataset.u; S.all = {C: false, P: false}; writeHash(); return render(); }
    if (t.dataset.l) { S.l = t.dataset.l; S.all = {C: false, P: false}; writeHash(); return render(); }
    if (t.dataset.v) { S.v = t.dataset.v; writeHash(); return render(); }
    if (t.dataset.h) { S.h = !S.h; S.all = {C: false, P: false}; writeHash(); return render(); }
    if (t.dataset.more) { S.all[t.dataset.more] = true; return render(); }
    if (t.dataset.k) { if (S.sort === t.dataset.k) S.sd = -S.sd; else { S.sort = t.dataset.k; S.sd = t.dataset.k === 'hs' ? 1 : -1; } return render(); }
    if (t.dataset.m && !t.dataset.s) {
      S.m = t.dataset.m;
      writeHash();
      if (t.dataset.jump) { render(); const c = $('#col' + S.m); if (c) c.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
      return render();
    }
    if (t.dataset.s) return openPanel(t.dataset.s);
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !$('#panel').hidden) closePanel();
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.getAttribute && ev.target.getAttribute('role') === 'button') { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener('input', ev => {
    if (ev.target.id !== 'q') return;
    S.q = ev.target.value.trim();
    clearTimeout(document.__qt);
    document.__qt = setTimeout(() => { S.all = {C: false, P: false}; render(); }, 180);
  });
  document.addEventListener('change', async ev => {
    if (ev.target.id !== 'day') return;
    S.d = ev.target.value === (LIVE && LIVE.T) ? '' : ev.target.value;
    writeHash();
    await pick();
  });
  $('#scrim').addEventListener('click', closePanel);
  document.addEventListener('mousemove', ev => {
    if (ev.target.closest && ev.target.closest('#mapsvg')) {
      const m = mapHit(ev);
      document.body.style.cursor = m ? 'pointer' : '';
      return m ? tip(rowTip(m.s), ev.clientX, ev.clientY) : untip();
    }
    if (ev.target.closest && ev.target.closest('#tlsvg')) return syncHover(ev, 'tl');
    if (ev.target.closest && ev.target.closest('#pxsvg')) return syncHover(ev, 'px');
    const g = ev.target.closest && ev.target.closest('#barsvg [data-s]');
    if (g) return tip(rowTip(g.dataset.s), ev.clientX, ev.clientY);
    if (!TIP.hidden) { untip(); hideCross(); }
    document.body.style.cursor = '';
  });
  document.addEventListener('click', ev => {
    if (ev.target.closest && ev.target.closest('#mapsvg')) { const m = mapHit(ev); if (m) openPanel(m.s); }
  });
  let rz = null;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => {
    ctlH();
    if (B && S.v === 'board') drawCharts();
    if (S.s) drawTimeline(R(S.s));
  }, 150); });
  addEventListener('hashchange', async () => { const d0 = S.d; readHash(); if (S.d !== d0) await pick(); else render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

  if (window.ISThemes) ISThemes.bind({state: writeHash});
  function showTab() {
    const t = $('nav.tabs'), a = t && t.querySelector('[aria-current=page]');
    if (a && t.scrollWidth > t.clientWidth) t.scrollLeft = Math.max(0, a.offsetLeft - t.offsetLeft - (t.clientWidth - a.offsetWidth) / 2);
  }
  showTab();
  readHash();
  refresh();


  setInterval(() => {
    if (!B) return;
    const live = isLive();
    if (WAS !== null && live !== WAS) render();
    else if (B === LIVE && B.phase === 'open') { renderBar(); drawReads(); }
    WAS = live;
  }, 30000);
})();
