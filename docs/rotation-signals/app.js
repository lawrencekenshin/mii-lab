'use strict';




(function (root) {
  const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
  const HS = ['1Y+', '6M', '3M'];
  const VIEWS = ['sig', 'g', 't'];
  const LIVE = HAS_DOM && location.hostname === 'lawrencekenshin.github.io';
  const BASE = LIVE ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/rotation-signals-data/rotation-signals/' : './snap/';
  const ROT = '../rotations/';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const M = '−';

  const GSHORT = { 'sec:information-technology': 'Info Tech', 'sec:communication-services': 'Comm Svcs',
                   'sec:consumer-discretionary': 'Cons Disc', 'sec:consumer-staples': 'Cons Staples' };
  const SSHORT = { calls1w: 'Calls 1W', lean: 'Lean', tilt: 'Tilt', move5: '5-day', mom20: '20-day', trend: 'Trend', consensus: 'Consensus' };
  const PSHORT = { calls1w: 'Calls', move5: '5d', mom20: '20d' };

  const PAL = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
  const FALLBACK = '#a0a4ae';

  const LABS = [['buy', 'BUY', 'several signals long, none short'], ['watch_up', 'WATCH UP', 'turning up before a buy'],
                ['watch_out', 'WATCH OUT', 'weakening before a sell'], ['sell', 'SELL', 'several signals short, none long']];
  const LWORD = { buy: 'BUY', watch_up: 'WATCH UP', watch_out: 'WATCH OUT', sell: 'SELL' };
  const LAB = 'labels', LABCOL = '#ffffff';
  const LAB_ABOUT = 'long every BUY group, short every SELL group';

  const RW = { calls1w: 'calls share', lean: 'lean', tilt: 'tilt', move5: '5-day', mom20: '20-day', trend: 'trend' };
  const HUNT = '../gex-hunt/';


  const PERIODS = ['today', '1w', '1m', 'all'];
  const PN = { '1w': 5, '1m': 21 };
  const PWORD = { today: 'Today', '1w': '1 week', '1m': '1 month', all: 'Total' };
  const PBTN = { '1w': '1W', '1m': '1M', all: 'Total' };
  const LLET = { buy: 'B', watch_up: 'WU', watch_out: 'WO', sell: 'S' };

  const store = {
    get(k, d) { try { const v = root.localStorage.getItem('rsig.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { root.localStorage.setItem('rsig.' + k, JSON.stringify(v)); } catch (e) {  } },
  };

  const S = { v: 'sig', id: null, p: 'today', h: store.get('h', '1Y+'), s: store.get('s', null), rs: store.get('rs', 'consensus'),
              rd: store.get('rd', 1), hide: store.get('hide', []) };

  let D = null, BUILT = null, STATUS = null, FORCE_W = null, FORCE_NARROW = null, EQ = null, CAL = null;
  const $ = s => HAS_DOM ? document.querySelector(s) : null;
  const NARROW = () => FORCE_NARROW != null ? FORCE_NARROW : HAS_DOM ? window.innerWidth < 760 : false;
  function boxW() {
    if (FORCE_W) return FORCE_W;
    const m = $('#main');
    const w = m && m.clientWidth ? m.clientWidth : HAS_DOM ? window.innerWidth : 1200;
    return Math.max(280, Math.min(w, 2400) - (NARROW() ? 20 : 28));
  }


  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ok = v => v != null && Number.isFinite(v);
  const signed = (v, t) => (+t === 0 ? '' : v > 0 ? '+' : M) + t;
  const rp = (v, d = 1) => ok(v) ? signed(v, Math.abs((Math.exp(v) - 1) * 100).toFixed(d)) + '%' : '–';
  const pc = (v, d = 1) => ok(v) ? signed(v, Math.abs(v * 100).toFixed(d)) + '%' : '–';
  const pts = (v, d = 1) => ok(v) ? signed(v, Math.abs(v * 100).toFixed(d)) : '–';
  const cc = v => !ok(v) || Math.abs(v) < 5e-5 ? '' : v > 0 ? 'up' : 'dn';
  function day(d) {
    if (!d) return '–';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    return m ? `${MON[+m[2] - 1]} ${+m[3]}` : String(d);
  }
  function stamp(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '–';
    return `${MON[d.getMonth()]} ${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function niceStep(m, n) {
    const raw = m / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10) * p;
  }
  const tlab = (v, unit) => (v > 1e-9 ? '+' : v < -1e-9 ? M : '') + String(+Math.abs(v).toFixed(2)) + unit;
  const kindTag = k => k ? `<span class="kt ${esc(k)}">${esc(k)}</span>` : '';
  function nextWeekday(d) {
    const t = new Date(d + 'T00:00:00Z');
    if (isNaN(t)) return null;
    do t.setUTCDate(t.getUTCDate() + 1); while (t.getUTCDay() === 0 || t.getUTCDay() === 6);
    return t.toISOString().slice(0, 10);
  }


  function setData(d) { D = d; BUILT = d && d.built; CAL = null; EQ = null; clean(); }
  const sigs = () => (D && D.signals) || [];
  const sig = id => sigs().find(s => s.id === id) || null;
  const sigColor = id => { if (id === LAB) return LABCOL; const i = sigs().findIndex(s => s.id === id); return i >= 0 && i < PAL.length ? PAL[i] : FALLBACK; };
  const sShort = id => id === LAB ? 'Labels' : SSHORT[id] || (sig(id) || {}).name || id;
  const sName = id => id === LAB ? 'Signal labels' : (sig(id) || {}).name || id;
  const sAbout = id => id === LAB ? LAB_ABOUT : (sig(id) || {}).about || '';
  const voters = () => sigs().filter(s => s.id !== 'consensus');
  const win = (H = S.h) => (D && D.windows && D.windows[H]) || null;

  const anyLab = () => !!(D && D.windows && Object.values(D.windows).some(w => w && w.labels));
  const labW = (Wn = win()) => (Wn && Wn.labels) || null;
  const labCards = () => { const c = ((win() || {}).today || {}).labels; return Array.isArray(c) ? c : null; };
  const labOf = id => (labCards() || []).find(c => c.id === id) || null;

  const lineIds = () => (anyLab() ? [LAB] : []).concat(sigs().map(s => s.id));
  const bookOf = (sid, Wn = win()) => (sid === LAB ? (labW(Wn) || {}).book : ((Wn || {}).book || {})[sid]) || [];
  const statsOf = (sid, Wn = win()) => (sid === LAB ? (labW(Wn) || {}).stats : ((Wn || {}).stats || {})[sid]) || {};
  const tradesOf = (sid, Wn = win()) => (sid === LAB ? (labW(Wn) || {}).trades : ((Wn || {}).trades || {})[sid]) || [];
  const grp = id => ((D && D.groups) || []).find(g => g.id === id) || null;
  const gName = id => (grp(id) || {}).name || id;
  const gShort = id => GSHORT[id] || gName(id);
  const today = () => (win() || {}).today || null;
  const rows = () => (today() || {}).rows || [];
  const row = id => rows().find(r => r.id === id) || null;
  const K = () => 3;
  const HOLD = () => 5;

  const nRanked = sid => {
    const rk = rows().map(r => (r.r || {})[sid]).filter(ok);
    return rk.length ? Math.max(rk.length, ...rk) : ((D && D.groups) || []).length || 16;
  };
  const hidden = id => Array.isArray(S.hide) && S.hide.includes(id);

  function calendar() {
    if (CAL) return CAL;
    const set = new Set();
    Object.values((D && D.price) || {}).forEach(a => (a || []).forEach(p => set.add(p[0])));
    CAL = [...set].sort();
    return CAL;
  }

  function valText(sid, v) {
    if (!ok(v)) return 'no value';
    switch (sid) {
      case 'calls1w': return `calls share ${pts(v)} pts in a week`;
      case 'lean': return `lean ${signed(v, Math.abs(v).toFixed(2))} vs board`;
      case 'tilt': return `tilt ${pts(v)} pts vs board`;
      case 'move5': return `${rp(v)} vs board in 5 sessions`;
      case 'mom20': return `${rp(v)} vs board in 20 sessions`;
      case 'trend': {
        if (Math.abs(v) < 1) return `no fresh cross (the short average is ${pts(v * 100, 2)} pts ${v >= 0 ? 'above' : 'below'} the long one)`;
        const age = 10 - Math.floor(Math.abs(v));
        return `crossed ${v > 0 ? 'up' : 'down'} ${age === 0 ? 'today' : age + (age === 1 ? ' session' : ' sessions') + ' ago'}`;
      }
      case 'consensus': return `average rank ${(-v).toFixed(1)}`;
      default: return String(v);
    }
  }

  function clean() {
    if (!HS.includes(S.h)) S.h = '1Y+';
    if (!VIEWS.includes(S.v)) S.v = 'sig';
    if (!PERIODS.includes(S.p)) S.p = 'today';
    if (S.v === 'g' && !S.id) S.v = 'sig';
    if (S.rd !== 1 && S.rd !== -1) S.rd = 1;
    if (!Array.isArray(S.hide)) S.hide = [];
    if (D) {
      const ids = sigs().map(s => s.id), lids = lineIds();
      if (!lids.includes(S.s)) S.s = lids[0] || null;
      if (!ids.includes(S.rs) && S.rs !== 'lv' && S.rs !== 'sv') S.rs = ids.includes('consensus') ? 'consensus' : ids[0] || 'lv';
      S.hide = S.hide.filter(x => lids.includes(x));
      if (D.windows && !D.windows[S.h]) S.h = (D.hs || HS).find(h => D.windows[h]) || S.h;
    }
  }
  clean();


  function hashOf(st = S) {
    const p = ['v=' + st.v];
    if (st.v === 'g') p.push('id=' + encodeURIComponent(st.id || '').replace(/%3A/gi, ':'));
    if (st.v === 't' && st.s) p.push('s=' + encodeURIComponent(st.s));
    p.push('h=' + encodeURIComponent(st.h));
    p.push('p=' + (PERIODS.includes(st.p) ? st.p : 'today'));
    return '#' + p.join('&');
  }
  function readHash(hs) {
    const p = new URLSearchParams(String(hs || '').replace(/^#/, ''));
    const v = p.get('v');
    S.v = VIEWS.includes(v) ? v : 'sig';
    let pp = String(p.get('p') || '').toLowerCase();
    if (pp === 'total') pp = 'all';
    S.p = PERIODS.includes(pp) ? pp : 'today';
    let h = p.get('h');
    if (h != null && /^1Y\s*$/.test(h)) h = '1Y+';
    if (HS.includes(h)) S.h = h;
    S.id = p.get('id');
    if (p.get('s')) S.s = p.get('s');
    clean();
  }
  function go(ch, push) {
    Object.assign(S, ch);
    clean();
    store.set('h', S.h);
    if (S.s) store.set('s', S.s);
    if (!HAS_DOM) return;
    const h = hashOf();
    if (h !== location.hash) {
      try { history[push ? 'pushState' : 'replaceState'](null, '', h); } catch (e) { location.hash = h; }
    }
    render();
    if (push) window.scrollTo(0, 0);
  }
  const rotUrl = id => `${ROT}#v=g&id=${encodeURIComponent(id).replace(/%3A/gi, ':')}&h=${encodeURIComponent(S.h)}`;
  const huntUrl = (s, neg) => `${HUNT}#v=detail&s=${encodeURIComponent(s)}&h=${encodeURIComponent(S.h)}&x=${neg ? 'neg' : 'pos'}`;


  function statusHTML() {
    if (!D) return '';
    const age = (Date.now() - Date.parse(D.built)) / 36e5;
    const err = STATUS && STATUS.ok === false;
    const cls = err ? 'err' : age > 26 ? 'stale' : '';
    const tip = `built ${stamp(D.built)}` + (err ? ` · the last build failed: ${STATUS.error || 'error'}` : '') +
      (D.live ? ` · the newest point is GEX Hunt's live board (${day(D.day)} close, OI ${day(D.settle)} settle)` : ` · newest saved day ${day(D.day)}`);
    return `<span id="status" title="${esc(tip)}"><b class="${cls}"></b>${day(D.day)} close · OI ${day(D.settle)} settle${D.live ? '<span class="badge live">live</span>' : ''}</span>`;
  }
  function barHTML() {
    const tab = (v, t) => `<button class="tab ${S.v === v || (v === 'sig' && S.v === 'g') ? 'on' : ''}" data-v="${v}">${t}</button>`;
    return `<span id="brand">ROTATION SIGNALS</span>` + tab('sig', 'Signals') + tab('t', 'Trades') + `<span class="sep"></span>` +
      `<span class="cg">${HS.map(h => `<button class="chip ${S.h === h ? 'on' : ''}" data-h="${esc(h)}">${h}</button>`).join('')}</span>` +
      `<span class="sep"></span>` + periodBtnsHTML() + statusHTML();
  }

  function periodBtnsHTML() {
    const btn = (p, inner, tip) => {
      const on = S.v === 'sig' && S.p === p;
      return `<button class="pb${on ? ' on' : ''}" data-p="${p}" aria-pressed="${on}" title="${esc(tip)}">${inner}</button>`;
    };
    const live = !!(D && D.live);
    const today = !D ? 'Today' : live ? `<i class="pd"></i>Today<span class="lv">live</span>` : `Today<span class="pdd"> · ${day(D.day)} close</span>`;
    const tip = !D ? "today's signals" : live ? `today's signals from GEX Hunt's live board (${day(D.day)} close)` : `today's signals: the ${day(D.day)} close`;
    return `<span class="pg" role="group" aria-label="Period">` + btn('today', today, tip) +
      btn('1w', PBTN['1w'], `the last ${PN['1w']} saved signal days`) + btn('1m', PBTN['1m'], `the last ${PN['1m']} saved signal days`) +
      btn('all', PBTN.all, 'every saved signal day') + `</span>`;
  }


  const sw = id => `<i class="sw${id === LAB ? ' lab' : ''}" style="background:${sigColor(id)}"></i>`;
  const chip = (id, side) => `<span class="gc ${side}" data-go="${esc(id)}" title="${esc(gName(id))}">${esc(gShort(id))}</span>`;
  const chips = (ids, side) => (ids || []).length ? ids.map(id => chip(id, side)).join('') : '<span class="muted">–</span>';

  function rankCell(r, sid, extra = '') {
    const rk = (r.r || {})[sid], pr = (r.rp || {})[sid], n = nRanked(sid), k = K();
    if (!ok(rk)) return `<span class="rkc na" title="${esc(`${r.name} · ${sName(sid)}: no rank`)}">–</span>`;
    const A = [0.85, 0.6, 0.38];
    let cls = '', bg = '';
    const a = i => A[Math.max(0, Math.min(A.length - 1, i))];
    if (rk <= k) { cls = ' t'; bg = `rgba(38,166,154,${a(rk - 1)})`; }
    else if (rk > n - k) { cls = ' b'; bg = `rgba(239,83,80,${a(n - rk)})`; }
    const mv = ok(pr) ? pr - rk : 0;
    const arrow = mv >= 3 ? '<i class="mv up">▲</i>' : mv <= -3 ? '<i class="mv dn">▼</i>' : '';
    const tip = `${r.name} · ${sName(sid)} rank ${rk} of ${n}` + (ok(pr) ? ` (${pr} on ${day((today() || {}).prev)})` : '') + ` · ${valText(sid, (r.v || {})[sid])}`;
    return `<span class="rkc${cls}${extra}"${bg ? ` style="background:${bg}"` : ''} title="${esc(tip)}">${rk}${arrow}</span>`;
  }
  function votesHTML(list, side) {
    const n = voters().length, c = (list || []).length;
    const tip = c ? `in the ${side === 'l' ? 'long' : 'short'} picks of: ${list.map(sName).join(', ')}` : `in no signal's ${side === 'l' ? 'long' : 'short'} picks`;
    let p = '';
    for (let i = 0; i < n; i++) p += `<i class="${i < c ? 'on' : ''}"></i>`;
    return `<span class="vt" title="${esc(tip)}"><b class="${c ? (side === 'l' ? 'up' : 'dn') : 'muted'}">${c}</b><span class="pips ${side}">${p}</span></span>`;
  }
  function sparkLine(vals, w = 96, h = 24, col = null) {
    const pts0 = vals.map((v, i) => [i, v]).filter(p => ok(p[1]));
    if (pts0.length < 2) return '<span class="muted">–</span>';
    const lo = Math.min(0, ...pts0.map(p => p[1])), hi = Math.max(0, ...pts0.map(p => p[1])), rg = hi - lo || 1;
    const X = i => 1 + i / Math.max(1, vals.length - 1) * (w - 2), Y = v => h - 2 - (v - lo) / rg * (h - 4);
    const last = pts0[pts0.length - 1][1];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><line x1="0" x2="${w}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="#363a45" stroke-dasharray="2 2"/>` +
      `<polyline points="${pts0.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${col || (last >= 0 ? '#26a69a' : '#ef5350')}" stroke-width="1.4"/></svg>`;
  }

  function priceLine(id) {
    const pr = ((D && D.price) || {})[id] || [];
    const base = (pr.find(p => ok(p[1])) || [])[1];
    return ok(base) ? pr.map(p => ok(p[1]) ? Math.exp(p[1] - base) - 1 : null) : [];
  }

  function bookSpark(sid, w = 112, h = 28) {
    const b = bookOf(sid);
    if (b.length < 1) return '<span class="muted">–</span>';
    return bookLine([[null, 0]].concat(b.map(p => [p[0], ok(p[2]) ? (Math.exp(p[2]) - 1) : null])), sigColor(sid), w, h);
  }

  function bookLine(pv, col, w, h) {
    const fs = D.fwd_start || '9999';
    const vals = pv.map(p => p[1]).filter(ok);
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), rg = hi - lo || 1;
    const X = i => 1 + i / Math.max(1, pv.length - 1) * (w - 2), Y = v => h - 2 - (v - lo) / rg * (h - 4);
    const nh = pv.filter(p => p[0] == null || p[0] <= fs).length;
    const seg = (a, z) => pv.slice(a, z).map((p, i) => ok(p[1]) ? `${X(a + i).toFixed(1)},${Y(p[1]).toFixed(1)}` : '').filter(Boolean).join(' ');
    let s = `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><line x1="0" x2="${w}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="#363a45" stroke-dasharray="2 2"/>`;
    if (nh > 1) s += `<polyline points="${seg(0, nh)}" fill="none" stroke="${col}" stroke-width="1.5" opacity=".42"/>`;
    if (nh < pv.length) s += `<polyline points="${seg(Math.max(0, nh - 1), pv.length)}" fill="none" stroke="${col}" stroke-width="1.8"/>`;
    return s + '</svg>';
  }
  function recHTML(st, fwd) {
    st = st || {};
    if (!st.closed) {
      if (fwd) return `<span class="muted">starts ${day(D.fwd_start)}</span>${st.open ? `<div class="sub2">${st.open} open</div>` : ''}`;
      return `<span class="muted">none closed</span>${st.open ? `<div class="sub2">${st.open} open</div>` : ''}`;
    }
    return `<span class="bn ${cc(st.mean)}">${rp(st.mean)}</span><span class="unit">per trade</span><div class="sub2">won ${st.won} of ${st.closed}</div>`;
  }


  const lwHTML = (l, tip = '') => l && LWORD[l] ? `<span class="lw ${l}"${tip ? ` title="${esc(tip)}"` : ''}>${LWORD[l]}</span>` : '<span class="muted">–</span>';
  const rw = ids => (ids || []).map(x => RW[x] || sShort(x)).join(', ');

  function reasonOf(c) {
    const L = c.longs || [], Sh = c.shorts || [], n = voters().length || 6;
    const also = (list, side) => list.length ? ` · also ${side}: ${rw(list)}` : '';
    const cnt = (list, side) => list.length ? ` · ${list.length} ${side}: ${rw(list)}` : '';
    switch (c.label) {
      case 'buy': return `${L.length} of ${n} signals long: ${rw(L)}`;
      case 'sell': return `${Sh.length} of ${n} signals short: ${rw(Sh)}`;
      case 'watch_up':
        if (Sh.length) return `the quicker signals are turning up · ${L.length} long: ${rw(L)}` + cnt(Sh, 'short');
        return `${L.length} of ${n} signals long, none short: ${rw(L)}`;
      case 'watch_out':
        if (!L.length && Sh.length) return `${Sh.length} of ${n} signals short, none long: ${rw(Sh)}`;
        return [L.length ? `${L.length} long: ${rw(L)}` : '', Sh.length ? `${Sh.length} short: ${rw(Sh)}` : ''].filter(Boolean).join(' · ');
      default:
        if (!L.length && !Sh.length) return "in no signal's picks";
        return [L.length ? `${L.length} long: ${rw(L)}` : '', Sh.length ? `${Sh.length} short: ${rw(Sh)}` : ''].filter(Boolean).join(' · ');
    }
  }

  function whenHTML(c) {
    const T = today() || {};
    if (c.prev && c.prev !== c.label && LWORD[c.prev]) return `<span class="nb new">was ${LWORD[c.prev]}</span>`;
    if (!c.since) return '';
    if (c.since >= (T.day || '')) return `<span class="nb new">new today</span>`;
    return `<span class="nb">since ${day(c.since)}</span>`;
  }
  const isNeg = l => l === 'sell' || l === 'watch_out';

  function nameChip(m, neg) {
    const mk = (m.c ? '<i class="cm c">C</i>' : '') + (m.p ? '<i class="cm p">P</i>' : '');
    const tip = `${m.n || m.s} · 20-day ${pc(m.r20)} · 5-day ${pc(m.r5)}` + (m.c ? " · on GEX Hunt's call list" : '') +
      (m.p ? " · on GEX Hunt's put list" : '') + ' · open its GEX Hunt chart';
    return `<a class="nmc" href="${esc(huntUrl(m.s, neg))}" target="_blank" rel="noopener" title="${esc(tip)}"><b>${esc(m.s)}</b>` +
      `<span class="${cc(m.r20)}">${pc(m.r20)}</span>${mk}</a>`;
  }
  const namesHTML = c => (c.names || []).length ? `<div class="nms">${c.names.filter(m => m && m.s).map(m => nameChip(m, isNeg(c.label))).join('')}</div>` : '';
  const etfHTML = c => c.etf ? `<span class="etf" title="${esc(`ETF that tracks ${c.name || gName(c.id)}`)}">${esc(c.etf)}</span>` : '';

  function labOrder(list) {
    const k = c => isNeg(c.label) ? (c.shorts || []).length - (c.longs || []).length : (c.longs || []).length - (c.shorts || []).length;
    return list.map((c, i) => [c, i]).sort((a, b) => k(b[0]) - k(a[0]) || a[1] - b[1]).map(x => x[0]);
  }
  const labGroups = l => labOrder((labCards() || []).filter(c => c.label === l)).map(c => c.id);
  function labelCard(c) {
    return `<div class="scard" data-go="${esc(c.id)}" tabindex="0" title="${esc(`${c.name || gName(c.id)} · ${LWORD[c.label]} · click for the group`)}">` +
      `<div class="sh"><span class="nm">${esc(c.name || gName(c.id))}</span>${etfHTML(c)}${whenHTML(c)}</div>` +
      `<div class="why">${esc(reasonOf(c))}</div>${namesHTML(c)}</div>`;
  }
  function todayLabelsHTML() {
    const T = today() || {}, cards = labCards();
    const when = `${day(T.day)}${T.live ? ' live' : ' close'}`;
    const carried = (T.carried || []).map(sShort);
    let h = `<div class="h2 lh"><b>Today's signals</b><span>${when}${T.live ? '<span class="badge live">live</span>' : ''}` +
      `${carried.length ? ` · ${esc(carried.join(', '))} from ${day(T.prev)} (today's close not in yet)` : ''} · click a group · names open GEX Hunt</span></div>`;
    if (!cards) return h + `<div class="lnone">No labels for ${esc(S.h)} yet.</div>`;
    h += `<div class="sigp">` + LABS.map(([id, word, hint]) => {
      const list = labOrder(cards.filter(c => c.label === id));
      return `<div class="scol ${id}"><div class="sch"><b>${word}</b><span class="n">${list.length}</span><span class="hint">${hint}</span></div>` +
        (list.length ? list.map(labelCard).join('') : `<div class="none">none today</div>`) + `</div>`;
    }).join('') + `</div>`;
    return h + labelChangesHTML();
  }

  function labelChangesHTML() {
    const T = today() || {}, cards = labCards();
    if (!cards) return '';
    if (!T.prev) return `<div class="lchg"><span class="muted">Changes: no earlier day</span></div>`;
    const lw = l => l && LWORD[l] ? lwHTML(l) : '<span class="muted">no label</span>';
    const parts = cards.filter(c => (c.label || null) !== (c.prev || null)).map(c => {
      const g = `<span class="cg2" data-go="${esc(c.id)}">${esc(c.name || gName(c.id))}</span>`;
      return c.prev ? `<span class="ci">${g} ${lw(c.prev)} → ${lw(c.label)}</span>` : `<span class="ci">${g} new ${lw(c.label)}</span>`;
    });
    return `<div class="lchg"><span class="muted">Changes since ${day(T.prev)}</span>` +
      (parts.length ? parts.join('<span class="dot">·</span>') : '<span class="nc">no changes</span>') + `</div>`;
  }


  function scoreHTML() {
    const Wn = win(), T = today() || {}, fs = day(D.fwd_start);
    const P = T.picks || {};
    const labRow = !!(labW() || labCards());
    if (NARROW()) {
      const rec = (x, fwd) => !x || !x.closed ? `<b class="muted" style="font-weight:400">${fwd ? 'starts ' + fs : 'none closed'}</b>`
        : `<b class="${cc(x.mean)}">${rp(x.mean)}</b> per trade · won ${x.won} of ${x.closed}`;
      const card = (id, name, about, long, short, extra) => {
        const st = statsOf(id);
        return `<div class="pcard go${extra}" data-sig="${esc(id)}" title="${esc(about)}">` +
          `<div class="r1"><span class="sname">${sw(id)}${esc(name)}</span><span class="big ${cc(st.book_total)}">${rp(st.book_total)}</span></div>` +
          `<div class="r2"><span class="muted">Long</span>${chips(long, 'l')}</div>` +
          `<div class="r2"><span class="muted">Short</span>${chips(short, 's')}</div>` +
          `<div class="r3"><span>Forward ${rec(st.forward, true)}</span></div>` +
          `<div class="r3"><span>History ${rec(st.history, false)}</span><span style="margin-left:auto">${bookSpark(id, 96, 24)}</span></div></div>`;
      };
      return (labRow ? card(LAB, sName(LAB), LAB_ABOUT, labGroups('buy'), labGroups('sell'), ' lab') : '') +
        sigs().map(s => { const pk = P[s.id] || {}; return card(s.id, s.name, s.about, pk.long, pk.short, ''); }).join('');
    }
    let h = `<div class="tw"><table class="grid"><thead><tr><th>Signal</th>` +
      `<th>Long<div class="thsub">top picks today</div></th><th>Short<div class="thsub">bottom picks today</div></th>` +
      `<th>Forward<div class="thsub">from ${fs}</div></th><th>History<div class="thsub">before ${fs}</div></th>` +
      `<th>Book<div class="thsub">cumulative</div></th></tr></thead><tbody>`;
    if (labRow) {
      const st = statsOf(LAB);
      h += `<tr class="row lab" data-sig="${LAB}"><td title="${esc(LAB_ABOUT)}"><span class="sname">${sw(LAB)}${esc(sName(LAB))}</span><div class="sub2">long every BUY, short every SELL</div></td>` +
        `<td class="chips">${chips(labGroups('buy'), 'l')}</td><td class="chips">${chips(labGroups('sell'), 's')}</td>` +
        `<td>${recHTML(st.forward, true)}</td><td>${recHTML(st.history, false)}</td>` +
        `<td><span class="bk"><span class="bn ${cc(st.book_total)}">${rp(st.book_total)}</span>${bookSpark(LAB)}</span></td></tr>`;
    }
    for (const s of sigs()) {
      const st = (Wn.stats || {})[s.id] || {}, pk = P[s.id] || {};
      h += `<tr class="row" data-sig="${esc(s.id)}"><td title="${esc(s.about)}"><span class="sname">${sw(s.id)}${esc(s.name)}</span></td>` +
        `<td class="chips">${chips(pk.long, 'l')}</td><td class="chips">${chips(pk.short, 's')}</td>` +
        `<td>${recHTML(st.forward, true)}</td><td>${recHTML(st.history, false)}</td>` +
        `<td><span class="bk"><span class="bn ${cc(st.book_total)}">${rp(st.book_total)}</span>${bookSpark(s.id)}</span></td></tr>`;
    }
    return h + '</tbody></table></div>';
  }


  function eqModel() {
    const Wn = win(), fs = D.fwd_start;

    const ids = sigs().map(s => s.id).concat(labW(Wn) ? [LAB] : []);
    const set = new Set();
    ids.forEach(id => bookOf(id, Wn).forEach(p => set.add(p[0])));
    const days = [...set].sort();
    if (!days.length) return null;
    const cal = calendar(), i0 = cal.indexOf(days[0]);
    if (i0 > 0) days.unshift(cal[i0 - 1]);
    const nData = days.length;
    for (let k = 0; fs && days[days.length - 1] < fs && k < 15; k++) {
      const nx = nextWeekday(days[days.length - 1]);
      if (!nx) break;
      days.push(nx);
    }
    const ix = new Map(days.map((d, i) => [d, i]));
    const ser = ids.map(id => {
      const v = new Array(days.length).fill(null), b = bookOf(id, Wn);
      b.forEach(p => { const i = ix.get(p[0]); if (i != null && ok(p[2])) v[i] = (Math.exp(p[2]) - 1) * 100; });
      if (b.length) { const i = ix.get(b[0][0]); if (i > 0 && v[i - 1] == null) v[i - 1] = 0; }
      return { id, col: sigColor(id), vals: v };
    });
    let ixFs = -1;
    if (fs) days.forEach((d, i) => { if (d <= fs) ixFs = i; });
    return { days, nData, ser, ixFs };
  }
  function eqSVG(W) {
    const md = eqModel();
    if (!md) { EQ = null; return '<div class="empty" style="padding:30px">No trades yet.</div>'; }
    const narrow = NARROW() || W < 560, { days, ser, ixFs } = md, N = days.length;
    const ML = narrow ? 38 : 46, MR = narrow ? 8 : 116, MT = 22, MB = 24, HT = narrow ? 240 : 330;
    const X0 = ML, X1 = W - MR, Y0 = MT, Y1 = HT - MB, PW = X1 - X0, step = PW / N;
    const X = i => X0 + (i + 0.5) * step;
    const vis = ser.filter(s => !hidden(s.id));
    let lo = 0, hi = 0;
    vis.forEach(s => s.vals.forEach(v => { if (ok(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
    if (hi - lo < 2) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.08;
    lo -= pad; hi += pad;
    const Y = v => Y0 + (hi - v) / (hi - lo) * (Y1 - Y0);
    let s = `<svg class="eq" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}" role="img" aria-label="Each signal's book, cumulative return">`;

    const fx = ixFs >= 0 ? X(ixFs) : null;
    if (fx != null) {
      s += `<rect x="${X0}" y="${Y0}" width="${(fx - X0).toFixed(1)}" height="${Y1 - Y0}" fill="rgba(41,98,255,.06)"/>`;
      if (fx - X0 > 70) s += `<text class="pt" x="${X0 + 4}" y="${Y0 - 8}">history</text>`;
    }

    const ys = niceStep(Math.max(Math.abs(hi), Math.abs(lo)), narrow ? 2 : 3);
    for (let k = Math.ceil(lo / ys); k <= Math.floor(hi / ys); k++) {
      const t = k * ys, y = Y(t).toFixed(1);
      s += `<line class="${k ? 'grid' : 'zero'}" x1="${X0}" x2="${X1}" y1="${y}" y2="${y}"/><text class="tk" x="${X0 - 6}" y="${(+y + 3.5).toFixed(1)}" text-anchor="end">${tlab(t, '%')}</text>`;
    }
    if (fx != null) {
      s += `<line class="fm" x1="${fx.toFixed(1)}" x2="${fx.toFixed(1)}" y1="${Y0 - 4}" y2="${Y1}"/>`;
      const lab = 'forward record →', lw = lab.length * 6.3;
      s += fx + 5 + lw <= W - 2 ? `<text class="fl" x="${(fx + 5).toFixed(1)}" y="${Y0 - 8}">${lab}</text>`
                                : `<text class="fl" x="${(fx - 5).toFixed(1)}" y="${Y0 - 8}" text-anchor="end">${lab}</text>`;
    }

    const ends = [];
    for (const sr of vis) {
      let d = '', pen = false, last = -1;
      sr.vals.forEach((v, i) => {
        if (!ok(v)) { pen = false; return; }
        d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
        pen = true; last = i;
      });
      if (d) s += `<path d="${d}" fill="none" stroke="${sr.col}" stroke-width="${sr.id === LAB ? 3.2 : 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (last >= 0) ends.push({ id: sr.id, col: sr.col, i: last, v: sr.vals[last], y: Y(sr.vals[last]) });
    }

    if (!narrow && ends.length) {
      const gap = 14, top = Y0 + 6, bot = Y1 - 4;
      ends.sort((a, b) => a.y - b.y);
      ends.forEach((e, i) => { e.ly = Math.max(e.y, top, i ? ends[i - 1].ly + gap : -Infinity); });
      const n = ends.length;
      if (ends[n - 1].ly > bot) {
        ends[n - 1].ly = bot;
        for (let i = n - 2; i >= 0; i--) ends[i].ly = Math.min(ends[i].ly, ends[i + 1].ly - gap);
      }
      for (const e of ends) {
        const x = X(e.i) + 6, ly = e.ly + 4;
        s += `<line x1="${(X(e.i) + 2).toFixed(1)}" x2="${(x + 6).toFixed(1)}" y1="${e.y.toFixed(1)}" y2="${(ly - 4).toFixed(1)}" stroke="${e.col}" stroke-width="1.5"/>` +
          `<text class="el" x="${(x + 9).toFixed(1)}" y="${ly.toFixed(1)}">${esc(sShort(e.id))} <tspan class="el v">${esc(tlab(Math.round(e.v * 10) / 10, '%'))}</tspan></text>`;
      }
    }

    const every = Math.max(1, Math.ceil(N / Math.max(1, PW / (narrow ? 56 : 64))));
    const labeled = new Set();
    for (let i = md.nData - 1; i >= 0; i -= every) labeled.add(i);
    for (let i = md.nData - 1 + every; i < N; i += every) labeled.add(i);
    for (const i of labeled) {
      const anchor = i === N - 1 ? 'end' : i === 0 ? 'start' : 'middle';
      s += `<text class="tk" x="${(anchor === 'end' ? Math.min(X(i) + step / 2, X1) : X(i)).toFixed(1)}" y="${HT - 7}" text-anchor="${anchor}">${day(days[i])}</text>`;
    }
    s += `<g class="eqhov"></g><rect class="eqhit" x="${X0}" y="${Y0}" width="${PW.toFixed(1)}" height="${Y1 - Y0}" fill="transparent"/>`;
    EQ = { W, X0, X1, Y0, Y1, step, days, ser, ixFs, lo, hi, nData: md.nData };
    return s + '</svg>';
  }

  function eqHover(i) {
    if (!EQ || i < 0 || i >= EQ.days.length) return null;
    const vis = EQ.ser.filter(s => !hidden(s.id) && ok(s.vals[i]));
    if (!vis.length) return null;
    const x = EQ.X0 + (i + 0.5) * EQ.step, Y = v => EQ.Y0 + (EQ.hi - v) / (EQ.hi - EQ.lo) * (EQ.Y1 - EQ.Y0);
    let svg = `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${EQ.Y0}" y2="${EQ.Y1}" stroke="#787b86" stroke-width="1"/>`;
    vis.forEach(s => { svg += `<circle cx="${x.toFixed(1)}" cy="${Y(s.vals[i]).toFixed(1)}" r="4" fill="${s.col}" stroke="#131722" stroke-width="2"/>`; });
    const fwd = EQ.ixFs >= 0 ? i > EQ.ixFs : true;
    const html = `<div class="td">${day(EQ.days[i])}<span>${fwd ? 'forward' : 'history'}</span></div>` +
      vis.slice().sort((a, b) => b.vals[i] - a.vals[i]).map(s =>
        `<div class="tr">${sw(s.id)}<span>${esc(sShort(s.id))}</span><b class="${cc(s.vals[i] / 100)}">${tlab(Math.round(s.vals[i] * 10) / 10, '%')}</b></div>`).join('');
    return { svg, html, x };
  }
  function legendHTML() {
    const ids = (labW() ? [LAB] : []).concat(sigs().map(s => s.id));
    return `<div class="lgd">` + ids.map(id => {
      const t = statsOf(id).book_total;
      return `<button class="lg${id === LAB ? ' lab' : ''}${hidden(id) ? ' off' : ''}" data-hide="${esc(id)}" title="${esc(`${sName(id)}: ${sAbout(id)} · click to ${hidden(id) ? 'show' : 'hide'}`)}">${sw(id)}<span>${esc(sShort(id))}</span><b class="${cc(t)}">${rp(t)}</b></button>`;
    }).join('') + `</div>`;
  }


  function sortVal(r, key) { return key === 'lv' ? (r.longs || []).length : key === 'sv' ? (r.shorts || []).length : (r.r || {})[key]; }
  function sortedRows() {
    const key = S.rs, vote = key === 'lv' || key === 'sv';
    const nat = vote ? -1 : 1;
    const tie = (a, b) => ((a.r || {}).consensus ?? 99) - ((b.r || {}).consensus ?? 99) || (a.name < b.name ? -1 : 1);
    return rows().slice().sort((a, b) => {
      const x = sortVal(a, key), y = sortVal(b, key);
      if (!ok(x) && !ok(y)) return tie(a, b);
      if (!ok(x)) return 1;
      if (!ok(y)) return -1;
      return nat * S.rd * (x - y) || tie(a, b);
    });
  }
  function rankHTML() {
    const list = sortedRows(), n = voters().length, hasLab = !!labCards();
    const labCell = id => { const c = labOf(id); return c && LWORD[c.label] ? lwHTML(c.label, reasonOf(c)) : '<span class="muted">–</span>'; };
    if (NARROW()) {
      const opts = sigs().map(s => [s.id, s.name]).concat([['lv', 'Long votes'], ['sv', 'Short votes']]);
      let h = `<div class="sortbar"><span class="muted">Sort</span><select id="rsortsel">` +
        opts.map(([k, t]) => `<option value="${esc(k)}" ${S.rs === k ? 'selected' : ''}>${esc(t)}</option>`).join('') + `</select>` +
        `<button class="chip" data-rflip="1">${S.rd === 1 ? 'best first' : 'worst first'}</button></div>`;
      for (const r of list) {
        const g = grp(r.id) || {};
        const c = hasLab ? labOf(r.id) : null;
        h += `<div class="pcard go" data-go="${esc(r.id)}"><div class="r1"><span><b class="wh" style="font-size:15px">${esc(r.name)}</b>${kindTag(g.kind)}</span>` +
          `<span class="r1r">${c && LWORD[c.label] ? lwHTML(c.label, reasonOf(c)) : ''}${sparkLine(priceLine(r.id), 78, 22)}</span></div>` +
          `<div class="pills">${sigs().map((s, i, a) => `<span class="pill${i === a.length - 1 && a.length % 4 === 3 ? ' wide' : ''}" title="${esc(s.name)}"><span>${esc(PSHORT[s.id] || sShort(s.id))}</span>${rankCell(r, s.id)}</span>`).join('')}</div>` +
          `<div class="r3"><span>long votes ${votesHTML(r.longs, 'l')}</span><span>short votes ${votesHTML(r.shorts, 's')}</span></div></div>`;
      }
      return h;
    }
    const th = (label, key, cls = '', tip = '') => {
      const on = S.rs === key;
      return `<th class="sortable ${cls} ${on ? 'on' : ''}" data-rs="${esc(key)}" title="${esc(tip)}">${label}${on ? `<span class="ar">${S.rd === 1 ? '▼' : '▲'}</span>` : ''}</th>`;
    };
    let h = `<div class="tw"><table class="grid"><thead><tr><th>Group</th>` + (hasLab ? `<th>Label<div class="thsub">today</div></th>` : '') +
      sigs().map(s => th(esc(sShort(s.id)), s.id, 'c', `${s.name}: ${s.about} · click to sort`)).join('') +
      th(`Long votes<div class="thsub">of ${n} signals</div>`, 'lv', '', `how many of the ${n} signals (consensus aside) have it in their long picks`) +
      th(`Short votes<div class="thsub">of ${n} signals</div>`, 'sv', '', `how many of the ${n} signals (consensus aside) have it in their short picks`) +
      `<th>Vs board<div class="thsub">since ${day((((D.price || {})[list[0] && list[0].id] || [])[0] || [])[0])}</div></th></tr></thead><tbody>`;
    for (const r of list) {
      const g = grp(r.id) || {};
      h += `<tr class="row" data-go="${esc(r.id)}"><td><span class="gn">${esc(r.name)}</span>${kindTag(g.kind)}</td>` + (hasLab ? `<td class="lc">${labCell(r.id)}</td>` : '') +
        sigs().map(s => `<td class="rk">${rankCell(r, s.id)}</td>`).join('') +
        `<td>${votesHTML(r.longs, 'l')}</td><td>${votesHTML(r.shorts, 's')}</td><td>${sparkLine(priceLine(r.id))}</td></tr>`;
    }
    return h + `</tbody></table></div>`;
  }


  function changesHTML() {
    const Wn = win(), T = today() || {};
    const out = [];
    for (const s of sigs()) {
      const cur = (T.picks || {})[s.id], prv = ((Wn.picks || {})[s.id] || {})[T.prev];
      let body;
      if (!cur) body = '<span class="nc">no picks</span>';
      else if (!prv || T.prev === T.day && !T.live) body = '<span class="nc">no earlier day</span>';
      else {
        const part = (label, a, b, side) => {
          const inn = a.filter(x => !b.includes(x)), gone = b.filter(x => !a.includes(x));
          if (!inn.length && !gone.length) return '';
          return `<span class="cp"><span class="muted">${label}</span>${inn.map(id => `<span class="gc ${side}" data-go="${esc(id)}" title="${esc(gName(id) + ' in')}">+ ${esc(gShort(id))}</span>`).join('')}` +
            `${gone.map(id => `<span class="gc out" data-go="${esc(id)}" title="${esc(gName(id) + ' out')}">${esc(gShort(id))}</span>`).join('')}</span>`;
        };
        body = part('Long', cur.long || [], prv.long || [], 'l') + part('Short', cur.short || [], prv.short || [], 's');
        if (!body) body = '<span class="nc">no change</span>';
      }
      out.push(`<div class="cl"><span class="cn" title="${esc(s.about)}">${sw(s.id)}${esc(s.name)}</span>${body}</div>`);
    }
    return `<div class="chl">${out.join('')}</div>`;
  }


  function signalsViewHTML() {
    if (S.p !== 'today') return periodViewHTML();
    const Wn = win();
    if (!Wn) return `<div class="empty">No ${esc(S.h)} data yet.</div>`;
    const T = today() || {}, W = boxW(), fs = day(D.fwd_start);
    const when = `${day(T.day)}${T.live ? ' live' : ' close'}`;
    let h = todayLabelsHTML();
    h += `<div class="h2"><b>Scoreboard</b><span>${when} · long the top few, short the bottom few · click a signal for its trades</span></div>` + scoreHTML();
    h += `<div class="h2"><b>Books</b><span>each signal's open trades added up · ${esc(S.h)} · shaded = history, before ${fs}</span></div>` +
      `<div class="eqbox">${eqSVG(W)}<div class="eqtip"></div>${legendHTML()}</div>`;
    h += `<div class="h2"><b>Rankings</b><span>rank 1 = most bullish of ${rows().length} · ${when} · ▲▼ a big move in rank since ${day(T.prev)} · click a group</span></div>` + rankHTML();
    h += `<div class="h2"><b>Changed today</b><span>picks that came in (+) or went out vs ${day(T.prev)}</span></div>` + changesHTML();
    return h + footHTML();
  }
  function footHTML() {
    const fs = day(D.fwd_start), k = K(), hold = HOLD(), nv = voters().length;
    return `<div class="foot"><b>Labels</b> come from today's picks of the ${nv} signals (consensus aside): ` +
      `<b>BUY</b> several signals pick the group long and none short · <b>WATCH UP</b> a couple pick it long and none short, or the quicker signals are turning up · ` +
      `<b>WATCH OUT</b> long picks with a quicker signal turned down, a couple of short picks and none long, or the quicker signals turning down · <b>SELL</b> several short picks, none long. ` +
      `<b>Names</b> are the group's strongest 20-day members off GEX Hunt's put list for BUY / WATCH UP (C = on its call list, first) and the weakest off its call list for SELL / WATCH OUT (P = on its put list, first); ` +
      `<b>Signal labels</b> goes long every BUY and short every SELL, equal weight, entered and held like the signals.<br>` +
      `<b>The trade</b>, the same for every signal: each signal day, long the top few groups and short the bottom few, equal weight, entered at the next session's close and held a week (Trend cross takes only groups with a fresh cross, so a side can hold fewer or none; an empty side is flat). Returns are group minus the board. ` +
      `<b>Book</b>: a signal's open trades, an equal slice each, added up day by day. <b>Forward</b>: trades signalled from ${fs} on. <b>History</b>: trades before ${fs}, the days the signals were picked from. ` +
      `<b>Rank</b>: 1 = most bullish. <b>Votes</b>: how many of the ${voters().length} signals (consensus aside) have the group in their long or short picks.<br>` +
      sigs().map(s => `<b>${esc(s.name)}</b>: ${esc(s.about)}.`).join(' ') +
      `<br><b>1Y+ / 6M / 3M</b>: GEX Hunt's expiry windows; the price signals (5-day, 20-day, trend) are the same in each.` +
      `<br><b>Today / 1W / 1M / Total</b>: Today shows the newest point (live while GEX Hunt's board is live), and 1W, 1M and Total ` +
      `show the last ${PN['1w']}, the last ${PN['1m']} or every saved signal day of the window: each day's labels, the trades signalled on those days, ` +
      `and each book and each group's move vs the board from the first day's close to the last day's.</div>`;
  }



  function periodOf(p = S.p, Wn = win()) {
    const all = (((Wn || {}).days) || []).slice().sort();
    const want = p === 'all' ? all.length : PN[p] || all.length;
    const days = want ? all.slice(-want) : [];
    return { p, days, n: days.length, first: days[0] || null, last: days[days.length - 1] || null,
             short: p !== 'all' && all.length < want, start: all[0] || null };
  }

  function relMove(id, a, b) {
    if (!a || !b || a >= b) return null;
    const pr = ((D && D.price) || {})[id] || [];
    const va = (pr.find(p => p[0] === a) || [])[1], vb = (pr.find(p => p[0] === b) || [])[1];
    return ok(va) && ok(vb) ? Math.exp(vb - va) - 1 : null;
  }


  function periodLabelRows(P) {
    const L = labW();
    if (!L) return null;
    const ld = L.days || {}, out = [];
    for (const g of (D && D.groups) || []) {
      const seq = P.days.map(d => { const l = (ld[d] || {})[g.id]; return LWORD[l] ? l : null; });
      if (!seq.some(Boolean)) continue;
      const n = { buy: 0, watch_up: 0, watch_out: 0, sell: 0 };
      seq.forEach(l => { if (l) n[l]++; });
      const c = labOf(g.id);
      out.push({ id: g.id, name: g.name || g.id, kind: g.kind, seq, n, now: c && LWORD[c.label] ? c.label : null, move: relMove(g.id, P.first, P.last) });
    }
    return out.sort((a, b) => (b.n.buy - b.n.sell) - (a.n.buy - a.n.sell) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }


  function periodStats(sid, P, Wn = win()) {
    const tr = P.first ? tradesOf(sid, Wn).filter(t => t.day >= P.first && t.day <= P.last) : [];
    const c = tr.filter(t => t.closed && ok(t.ret));
    const bk = P.first ? bookOf(sid, Wn).filter(p => p[0] > P.first && p[0] <= P.last && ok(p[1])) : [];
    let acc = 0;
    const pts = bk.map(p => [p[0], (acc += p[1])]);
    return { n: tr.length, closed: c.length, won: c.filter(t => t.ret > 0).length, open: tr.filter(t => !t.closed).length,
             mean: c.length ? c.reduce((a, t) => a + t.ret, 0) / c.length : null, book: pts.length ? acc : null, pts, trades: tr };
  }
  function periodSpark(sid, st, P, w = 112, h = 28) {
    if (!st.pts.length) return '<span class="muted">–</span>';
    return bookLine([[P.first, 0]].concat(st.pts.map(p => [p[0], Math.exp(p[1]) - 1])), sigColor(sid), w, h);
  }
  const spanTxt = P => `${day(P.first)} → ${day(P.last)}`;
  function periodHeadHTML(P) {
    const sub = (P.short && P.start ? [`history starts ${day(P.start)}`] : []).concat([`${S.h} window`]);
    return `<div class="ph"><b>${PWORD[P.p]}:</b> <span class="pr">${P.n ? `${spanTxt(P)} · ${P.n} session${P.n === 1 ? '' : 's'}` : 'no saved days yet'}</span> ` +
      `<span class="ps">${esc(sub.join(' · '))}</span></div>`;
  }

  const squaresHTML = (r, P) => `<span class="lsq">` + r.seq.map((l, i) =>
    `<i class="${l || 'nl'}" title="${esc(`${day(P.days[i])} · ${l ? LWORD[l] : 'no label'}`)}"></i>`).join('') + `</span>`;
  const countsHTML = n => `<span class="lcn" title="${esc(LABS.map(([id, w]) => `${n[id]} ${w} day${n[id] === 1 ? '' : 's'}`).join(' · '))}">` +
    LABS.map(([id]) => `<b class="${id}">${LLET[id]}</b> ${n[id]}`).join('<span class="dot"> · </span>') + `</span>`;
  function periodLabelsHTML(P) {
    const rs = periodLabelRows(P), T = today() || {}, sp = spanTxt(P);
    let h = `<div class="h2 lh"><b>Labels over the period</b><span>one square per saved day, oldest first · most BUY days over SELL days first · click a group</span></div>`;
    if (!rs) return h + `<div class="lnone">No labels for ${esc(S.h)} yet.</div>`;
    if (!rs.length) return h + `<div class="lnone">No group had a label from ${sp}.</div>`;
    h += `<div class="sqkey">${LABS.map(([id, w]) => `<span><i class="${id}"></i>${w}</span>`).join('')}<span><i class="nl"></i>no label</span></div>`;
    const mv = r => `<b class="${cc(r.move)}">${pc(r.move)}</b>`;
    const tip = r => `${r.name} · vs board ${pc(r.move)} from ${sp} · click for the group`;
    if (NARROW()) {
      return h + rs.map(r => `<div class="pcard go plc" data-go="${esc(r.id)}" tabindex="0" title="${esc(tip(r))}">` +
        `<div class="r1"><span><b class="wh" style="font-size:15px">${esc(r.name)}</b>${kindTag(r.kind)}</span><span class="r1r"><span class="muted">vs board</span>${mv(r)}</span></div>` +
        squaresHTML(r, P) +
        `<div class="r3">${countsHTML(r.n)}<span style="margin-left:auto">today ${lwHTML(r.now)}</span></div></div>`).join('');
    }
    h += `<div class="tw"><table class="grid pl"><thead><tr><th>Group</th><th>By day<div class="thsub">${sp}</div></th>` +
      `<th>Days<div class="thsub">BUY · WATCH UP · WATCH OUT · SELL</div></th><th>Today<div class="thsub">${day(T.day)}${T.live ? ' live' : ' close'}</div></th>` +
      `<th class="r">Vs board<div class="thsub">${sp}</div></th></tr></thead><tbody>`;
    for (const r of rs) {
      h += `<tr class="row" data-go="${esc(r.id)}" title="${esc(tip(r))}"><td><span class="gn">${esc(r.name)}</span>${kindTag(r.kind)}</td>` +
        `<td class="sqc">${squaresHTML(r, P)}</td><td>${countsHTML(r.n)}</td><td>${lwHTML(r.now)}</td><td class="r mvc">${mv(r)}</td></tr>`;
    }
    return h + `</tbody></table></div>`;
  }

  function periodScoreHTML(P) {
    const sp = spanTxt(P), ids = (labW() ? [LAB] : []).concat(sigs().map(s => s.id));
    const sgn = st => st.n ? `<span class="bn">${st.n}</span><span class="unit">trade${st.n === 1 ? '' : 's'}</span><div class="sub2">${st.open ? `${st.open} open` : 'none open'}</div>`
      : '<span class="muted">none</span>';
    const cls = st => st.closed ? `<span class="bn ${cc(st.mean)}">${rp(st.mean)}</span><span class="unit">per trade</span><div class="sub2">won ${st.won} of ${st.closed}</div>`
      : '<span class="muted">none closed</span>';
    if (NARROW()) {
      return ids.map(id => {
        const st = periodStats(id, P);
        return `<div class="pcard go${id === LAB ? ' lab' : ''}" data-sig="${esc(id)}" title="${esc(sAbout(id))}">` +
          `<div class="r1"><span class="sname">${sw(id)}${esc(sName(id))}</span><span class="big ${cc(st.book)}">${rp(st.book)}</span></div>` +
          `<div class="r3"><span>Signalled <b>${st.n}</b>${st.n ? ` · ${st.open} open` : ''}</span></div>` +
          `<div class="r3"><span>Closed ${st.closed ? `<b class="${cc(st.mean)}">${rp(st.mean)}</b> per trade · won ${st.won} of ${st.closed}` : '<b class="muted" style="font-weight:400">none</b>'}</span>` +
          `<span style="margin-left:auto">${periodSpark(id, st, P, 96, 24)}</span></div></div>`;
      }).join('');
    }
    let h = `<div class="tw"><table class="grid"><thead><tr><th>Signal</th><th>Signalled<div class="thsub">trades from ${sp}</div></th>` +
      `<th>Closed<div class="thsub">of those trades</div></th><th>Book<div class="thsub">${sp}</div></th></tr></thead><tbody>`;
    for (const id of ids) {
      const st = periodStats(id, P), L = id === LAB;
      h += `<tr class="row${L ? ' lab' : ''}" data-sig="${esc(id)}"><td title="${esc(sAbout(id))}"><span class="sname">${sw(id)}${esc(sName(id))}</span>` +
        `${L ? '<div class="sub2">long every BUY, short every SELL</div>' : ''}</td><td>${sgn(st)}</td><td>${cls(st)}</td>` +
        `<td><span class="bk"><span class="bn ${cc(st.book)}">${rp(st.book)}</span>${periodSpark(id, st, P)}</span></td></tr>`;
    }
    return h + '</tbody></table></div>';
  }

  function periodTradesHTML(P) {
    const sp = spanTxt(P);
    const head = n => `<div class="h2"><b>Label trades in the period</b><span>${n == null ? '' : `${n} · `}long every BUY, short every SELL · signalled ${sp} · newest first · a day with no BUY or SELL is not traded</span></div>`;
    if (!labW()) return head(null) + `<div class="lnone">No labels for ${esc(S.h)} yet.</div>`;
    const list = periodStats(LAB, P).trades.slice().reverse();
    if (!list.length) return head(0) + `<div class="lnone">No label trades signalled from ${sp}.</div>`;
    if (NARROW()) {
      return head(list.length) + list.map(t => `<div class="pcard"><div class="r1"><span class="num"><b class="wh">${day(t.day)}</b></span><span>${retHTML(t)}</span></div>` +
        `<div class="r2"><span class="muted">Long</span>${chips(t.long, 'l')}</div><div class="r2"><span class="muted">Short</span>${chips(t.short, 's')}</div></div>`).join('');
    }
    return head(list.length) + `<div class="tw"><table class="grid"><thead><tr><th>Signal day</th><th>Long</th><th>Short</th><th class="r">Long minus short</th></tr></thead><tbody>` +
      list.map(t => `<tr><td class="num"><b class="wh">${day(t.day)}</b></td><td class="chips">${chips(t.long, 'l')}</td><td class="chips">${chips(t.short, 's')}</td>` +
        `<td class="r">${retHTML(t)}</td></tr>`).join('') + `</tbody></table></div>`;
  }
  function periodViewHTML() {
    if (!win()) return `<div class="empty">No ${esc(S.h)} data yet.</div>`;
    const P = periodOf();
    if (!P.n) return periodHeadHTML(P) + `<div class="empty">No saved ${esc(S.h)} days yet.</div>` + footHTML();
    return periodHeadHTML(P) + periodLabelsHTML(P) +
      `<div class="h2"><b>Signals over the period</b><span>trades signalled ${spanTxt(P)} · book = each line's open trades added up from the ${day(P.first)} close to the ${day(P.last)} close · click a signal for its trades</span></div>` +
      periodScoreHTML(P) + periodTradesHTML(P) + footHTML();
  }


  function multSVG(sid, pts0, w, h) {
    const n = Math.max(2, ((D && D.groups) || []).length || 16), k = K();
    const ML = 18, MR = 6, MT = 4, MB = 15, PW = w - ML - MR, PH = h - MT - MB;
    const N = pts0.length, step = PW / Math.max(1, N), X = i => ML + (i + 0.5) * step;
    const Y = r => MT + (r - 0.5) / n * PH;
    let s = `<svg class="mch" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(sName(sid))} rank by day">`;
    s += `<rect x="${ML}" y="${MT}" width="${PW}" height="${(k / n * PH).toFixed(1)}" fill="rgba(38,166,154,.12)"/>` +
      `<rect x="${ML}" y="${(MT + (n - k) / n * PH).toFixed(1)}" width="${PW}" height="${(k / n * PH).toFixed(1)}" fill="rgba(239,83,80,.12)"/>`;
    s += `<text class="tk" x="${ML - 4}" y="${(Y(1) + 3.5).toFixed(1)}" text-anchor="end">1</text><text class="tk" x="${ML - 4}" y="${(Y(n) + 3.5).toFixed(1)}" text-anchor="end">${n}</text>`;
    const col = sigColor(sid);
    let d = '', pen = false, last = -1;
    pts0.forEach((p, i) => {
      if (!ok(p[1])) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[1]).toFixed(1)}`;
      pen = true; last = i;
    });
    if (d) s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>`;
    pts0.forEach((p, i) => { if (ok(p[1])) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${i === last ? 3.2 : 1.7}" fill="${col}"/>`; });
    if (N) {
      s += `<text class="tk" x="${ML}" y="${h - 3}">${day(pts0[0][0])}</text><text class="tk" x="${w - MR}" y="${h - 3}" text-anchor="end">${day(pts0[N - 1][0])}</text>`;
      pts0.forEach((p, i) => {
        s += `<rect x="${(X(i) - step / 2).toFixed(1)}" y="${MT}" width="${step.toFixed(2)}" height="${PH}" fill="transparent"><title>${esc(`${day(p[0])} · ${sName(sid)} ${ok(p[1]) ? `rank ${p[1]} of ${n}` : 'no rank'}`)}</title></rect>`;
      });
    }
    return s + '</svg>';
  }
  function priceSVG(id, W) {
    const narrow = NARROW(), pr = ((D.price || {})[id] || []).filter(p => ok(p[1]));
    if (pr.length < 2) return '<div class="empty" style="padding:24px">No price line for this group yet.</div>';
    const days = pr.map(p => p[0]), N = days.length, base = pr[0][1];
    const pv = pr.map(p => (Math.exp(p[1] - base) - 1) * 100);
    const ML = 6, MR = narrow ? 46 : 54, T1 = 18, H1 = narrow ? 150 : 200, XB = 22, HT = T1 + H1 + XB, PW = W - ML - MR;
    const step = PW / N, X = i => ML + (i + 0.5) * step;
    let lo = Math.min(0, ...pv), hi = Math.max(0, ...pv);
    const pad = (hi - lo) * 0.08 || 1;
    lo -= pad; hi += pad;
    const Y = v => T1 + (hi - v) / (hi - lo) * H1;
    let s = `<svg class="gch" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}" role="img" aria-label="Group vs the board">`;
    const sd = (win() || {}).days || [];
    const ia = sd.length ? days.findIndex(d => d >= sd[0]) : -1;
    let ib = -1;
    if (sd.length) days.forEach((d, i) => { if (d <= sd[sd.length - 1]) ib = i; });
    if (ia >= 0 && ib >= ia) {
      const a = X(ia) - step / 2, b = X(ib) + step / 2;
      s += `<rect x="${a.toFixed(1)}" y="${T1}" width="${(b - a).toFixed(1)}" height="${H1}" fill="rgba(41,98,255,.07)"/>`;
      const lab = `signal days from ${day(sd[0])}`, lw = lab.length * 5.8;
      s += a + 4 + lw <= ML + PW ? `<text class="pt" x="${(a + 4).toFixed(1)}" y="${T1 + H1 - 7}">${lab}</text>`
                                 : `<text class="pt" x="${ML + PW - 4}" y="${T1 + H1 - 7}" text-anchor="end">${lab}</text>`;
    }
    const fsI = D.fwd_start ? days.indexOf(D.fwd_start) : -1;
    if (fsI >= 0) s += `<line class="fm" x1="${X(fsI).toFixed(1)}" x2="${X(fsI).toFixed(1)}" y1="${T1}" y2="${T1 + H1}"/>`;
    const ps = niceStep(Math.max(Math.abs(hi), Math.abs(lo)), narrow ? 2 : 3);
    for (let k = Math.ceil(lo / ps); k <= Math.floor(hi / ps); k++) {
      const t = k * ps, y = Y(t).toFixed(1);
      s += `<line class="${k ? 'grid' : 'zero'}" x1="${ML}" x2="${ML + PW}" y1="${y}" y2="${y}"/><text class="tk" x="${ML + PW + 6}" y="${(+y + 3.5).toFixed(1)}">${tlab(t, '%')}</text>`;
    }
    s += `<path d="${pv.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')}" fill="none" stroke="#d1d4dc" stroke-width="1.7"/>`;
    const lv = pv[N - 1], ly = Math.max(T1 + 8, Math.min(T1 + H1 - 8, Y(lv)));
    s += `<rect x="${ML + PW + 1}" y="${(ly - 8).toFixed(1)}" width="${MR - 2}" height="16" rx="2" fill="${lv >= 0 ? '#26a69a' : '#ef5350'}"/>` +
      `<text class="lbl" x="${ML + PW + 4}" y="${(ly + 3.8).toFixed(1)}">${tlab(Math.round(lv * 10) / 10, '%')}</text>`;
    s += `<text class="pt" x="${ML + 4}" y="${T1 - 6}">vs board since ${day(days[0])}, %</text>`;
    const every = Math.max(1, Math.ceil(N / Math.max(1, PW / (narrow ? 58 : 66))));
    for (let i = N - 1; i >= 0; i -= every) s += `<text class="tk" x="${X(i).toFixed(1)}" y="${HT - 6}" text-anchor="${i === N - 1 ? 'end' : 'middle'}">${day(days[i])}</text>`;
    pv.forEach((v, i) => {
      s += `<rect x="${(X(i) - step / 2).toFixed(1)}" y="${T1}" width="${step.toFixed(2)}" height="${H1}" fill="transparent"><title>${esc(`${day(days[i])} · vs board since ${day(days[0])} ${tlab(Math.round(v * 10) / 10, '%')}`)}</title></rect>`;
    });
    return s + '</svg>';
  }
  function groupViewHTML(id) {
    const g = grp(id), back = `<a class="back" href="${hashOf(Object.assign({}, S, { v: 'sig' }))}">← Signals</a>`;
    if (!g) return `<div class="ghead">${back}</div><div class="empty">No group “${esc(id)}” on this board.</div>`;
    const Wn = win(), r = row(id), T = today() || {};
    let h = `<div class="ghead">${back}<span class="gt">${esc(g.name)}</span>${kindTag(g.kind)}${T.live ? '<span class="badge live">live</span>' : ''}` +
      `<a class="ext" href="${esc(rotUrl(id))}" target="_blank" rel="noopener">Open in Rotations ↗</a></div>`;
    if (!Wn || !r) return h + `<div class="empty">No ${esc(S.h)} data for ${esc(g.name)} yet.</div>`;
    const c = labOf(id);
    if (c) {
      h += c.label && LWORD[c.label]
        ? `<div class="glab ${c.label}"><div class="gl1">${lwHTML(c.label)}${etfHTML(c)}${whenHTML(c)}</div><div class="why">${esc(reasonOf(c))}</div>${namesHTML(c)}</div>`
        : `<div class="glab"><div class="gl1"><span class="nl">No label today</span>${etfHTML(c)}</div><div class="why">${esc(reasonOf(c))}</div></div>`;
    }
    h += `<div class="rps">${sigs().map(s => `<span class="rpill" title="${esc(s.about)}">${sw(s.id)}${esc(sShort(s.id))}${rankCell(r, s.id)}</span>`).join('')}</div>`;
    const vl = (r.longs || []).map(sShort).join(', '), vs = (r.shorts || []).map(sShort).join(', ');
    h += `<div class="gvotes"><span>Long votes <b class="${(r.longs || []).length ? 'up' : ''}">${(r.longs || []).length}</b>${vl ? ` · ${esc(vl)}` : ''}</span>` +
      `<span>Short votes <b class="${(r.shorts || []).length ? 'dn' : ''}">${(r.shorts || []).length}</b>${vs ? ` · ${esc(vs)}` : ''}</span></div>`;
    const W = boxW(), cols = W >= 1000 ? 4 : W >= 640 ? 3 : 2, gap = NARROW() ? 8 : 12;
    const cw = Math.floor((W - gap * (cols - 1)) / cols), iw = cw - 18;
    const rk = (Wn.ranks || {})[id] || {};
    h += `<div class="h2"><b>Rank by day</b><span>${(Wn.days || []).length} signal days · ${esc(S.h)} · 1 at the top · green = a signal's long picks, red = its short picks</span></div>` +
      `<div class="mults" style="grid-template-columns:repeat(${cols}, minmax(0, 1fr))">` +
      sigs().map(s => `<div class="mult"><div class="mh">${sw(s.id)}<span title="${esc(s.about)}">${esc(s.name)}</span>${rankCell(r, s.id)}</div>${multSVG(s.id, rk[s.id] || [], iw, NARROW() ? 84 : 96)}</div>`).join('') + `</div>`;
    h += `<div class="h2"><b>Vs board</b><span>the group's relative price line · shaded = signal days</span></div>` +
      `<div class="chartbox">${priceSVG(id, W)}</div>`;
    return h + `<div class="foot"><b>Rank</b>: 1 = most bullish of ${rows().length}; the top few are a signal's longs, the bottom few its shorts. <b>Vs board</b>: the group's equal-weight return minus the board's, from GEX Hunt's names.</div>`;
  }


  function tile(k, v, s1, s2, vcls = '') {
    return `<div class="tile"><div class="k">${k}</div><div class="v ${vcls}">${v}</div>${s1 ? `<div class="s">${s1}</div>` : ''}${s2 ? `<div class="s">${s2}</div>` : ''}</div>`;
  }
  function retHTML(t) {
    const hold = HOLD();
    if (t.closed) return `<span class="ret ${ok(t.ret) && t.ret > 0 ? 'hit' : 'miss'}">${ok(t.ret) && t.ret > 0 ? '✓' : '✗'} ${rp(t.ret)}</span>`;
    return `<span class="ret ${cc(t.ret)}">${ok(t.ret) ? rp(t.ret) : ''}</span> <span class="open">open · ${t.n || 0} ${t.n === 1 ? 'session' : 'sessions'} in</span>`;
  }
  function tradesViewHTML() {
    const Wn = win();
    if (!Wn) return `<div class="empty">No ${esc(S.h)} data yet.</div>`;
    const sid = S.s, st = statsOf(sid), fs = day(D.fwd_start), hold = HOLD(), isLab = sid === LAB;
    const list = tradesOf(sid).slice().reverse();
    let h = `<div class="sel">${lineIds().map(id => `<button class="chip${id === LAB ? ' lab' : ''} ${id === sid ? 'on' : ''}" data-s="${esc(id)}" title="${esc(sAbout(id))}">${sw(id)}${esc(sName(id))}</button>`).join('')}</div>`;
    const F = st.forward || {}, Hs = st.history || {};
    const open = list.filter(t => !t.closed).length;
    const recTile = (title, x, none) => x.closed
      ? tile(title, `<span class="${cc(x.mean)}">${rp(x.mean)}</span> <small>per trade</small>`, `won <b>${x.won} of ${x.closed}</b> closed`,
          `best <b class="${cc(x.best)}">${rp(x.best)}</b> · worst <b class="${cc(x.worst)}">${rp(x.worst)}</b>`)
      : tile(title, none, x.open ? `<b>${x.open}</b> open` : '', '', 'sm');
    h += `<div class="tiles">` +
      recTile(`Forward · from ${fs}`, F, `starts ${fs}`) +
      recTile(`History · before ${fs}`, Hs, 'none closed') +
      tile('Book · cumulative', `<span class="${cc(st.book_total)}">${rp(st.book_total)}</span>`,
        ok(st.book_fwd) ? `since ${fs} <b class="${cc(st.book_fwd)}">${rp(st.book_fwd)}</b>` : `forward from ${fs}`, `its open trades, an equal slice each`) +
      tile('Open now', `${open} <small>trade${open === 1 ? '' : 's'}</small>`, `entered at the next close, held a week`) + `</div>`;
    h += `<div class="h2"><b>${esc(sName(sid))}</b><span>${esc(sAbout(sid))} · ${list.length} trades · ${esc(S.h)} · newest first</span></div>`;
    const fw = list.filter(t => t.fwd), hi = list.filter(t => !t.fwd);
    if (NARROW()) {
      const card = t => `<div class="pcard"><div class="r1"><span class="num"><b class="wh">${day(t.day)}</b></span><span>${retHTML(t)}</span></div>` +
        `<div class="r2"><span class="muted">Long</span>${chips(t.long, 'l')}</div><div class="r2"><span class="muted">Short</span>${chips(t.short, 's')}</div></div>`;
      const sec = (t, l, none) => `<div class="h2"><b style="font-size:13px">${t}</b><span>${l.length}</span></div>` + (l.length ? l.map(card).join('') : `<div class="pcard"><span class="muted">${none}</span></div>`);
      h += sec(`Forward · from ${fs}`, fw, `No trades from ${fs} on yet.`) + sec(`History · before ${fs}`, hi, 'No trades.');
    } else {
      const tr = t => `<tr><td class="num"><b class="wh">${day(t.day)}</b></td><td class="chips">${chips(t.long, 'l')}</td><td class="chips">${chips(t.short, 's')}</td>` +
        `<td class="r">${retHTML(t)}</td></tr>`;
      const sec = (t, l, none) => `<tr class="secrow"><td colspan="4"><b>${t}</b> · ${l.length}</td></tr>` + (l.length ? l.map(tr).join('') : `<tr class="none"><td colspan="4">${none}</td></tr>`);
      h += `<div class="tw"><table class="grid"><thead><tr><th>Signal day</th><th>Long</th><th>Short</th><th class="r">Long minus short</th></tr></thead><tbody>` +
        sec(`Forward · from ${fs}`, fw, `No trades from ${fs} on yet.`) + sec(`History · before ${fs}`, hi, 'No trades.') + `</tbody></table></div>`;
    }
    const rule = isLab ? 'long every BUY group and short every SELL group, equal weight per side (an empty side is flat)'
                       : `long its top few groups and short its bottom few, equal weight`;
    return h + `<div class="foot"><b>Trade</b>: on the signal day, ${rule}, entered at the next session's close and held a week. ` +
      `<b>Long minus short</b>: the longs' move vs the board minus the shorts'. ✓ = closed above zero, ✗ = closed at or below zero; open = still inside its holding week (sessions traded so far).</div>`;
  }


  function mainHTML() {
    if (!D) return '<div class="empty">Loading…</div>';
    if (S.v === 'g') return groupViewHTML(S.id);
    if (S.v === 't') return tradesViewHTML();
    return signalsViewHTML();
  }
  function titleOf() {
    if (S.v === 'g') { const g = D && grp(S.id); return (g ? g.name + ' · ' : '') + 'Rotation Signals'; }
    if (S.v === 't') return 'Trades · Rotation Signals';
    return S.p !== 'today' ? `${PWORD[S.p]} · Rotation Signals` : 'Rotation Signals';
  }
  let LASTW = 0;
  function renderBar() { if (HAS_DOM) $('#bar').innerHTML = barHTML(); }
  function renderMain() {
    if (!HAS_DOM) return;
    $('#main').innerHTML = mainHTML();
    document.title = titleOf();
  }
  function render() { renderBar(); renderMain(); LASTW = HAS_DOM ? window.innerWidth : 0; }

  async function load() {
    const r = await fetch(BASE + 'sig.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('sig.json ' + r.status);
    setData(await r.json());
  }
  async function poll() {
    try {
      const r = await fetch(BASE + 'status.json', { cache: 'no-cache' });
      if (!r.ok) return;
      STATUS = await r.json();
      if (STATUS.built && STATUS.built !== BUILT) { await load(); render(); }
      else if (D) renderBar();
    } catch (e) {  }
  }

  function hover(e) {
    const svg = e.target.closest && e.target.closest('svg.eq');
    if (!svg) { if (e.type === 'pointerdown') unhover(); return; }
    const box = svg.parentNode, tip = box && box.querySelector('.eqtip'), g = svg.querySelector('.eqhov');
    if (!EQ || !tip || !g) return;
    const rc = svg.getBoundingClientRect(), sc = rc.width / EQ.W || 1;
    const x = (e.clientX - rc.left) / sc;
    const i = Math.floor((x - EQ.X0) / EQ.step);
    const hv = x >= EQ.X0 && x <= EQ.X1 ? eqHover(i) : null;
    if (!hv) { unhover(); return; }
    g.innerHTML = hv.svg;
    tip.innerHTML = hv.html;
    tip.style.display = 'block';
    const br = box.getBoundingClientRect(), tw = tip.offsetWidth, px = rc.left - br.left + hv.x * sc;
    let left = px + 14;
    if (left + tw > br.width - 4) left = Math.max(4, px - 14 - tw);
    tip.style.left = left + 'px';
    tip.style.top = Math.max(0, (rc.top - br.top) + EQ.Y0 * sc + 4) + 'px';
  }
  function unhover() {
    const g = document.querySelector('svg.eq .eqhov'), tip = document.querySelector('.eqtip');
    if (g) g.innerHTML = '';
    if (tip) tip.style.display = 'none';
  }
  function bind() {
    $('#bar').addEventListener('click', e => {
      const b = e.target.closest('[data-v],[data-h],[data-p]');
      if (!b) return;
      if (b.dataset.v) go({ v: b.dataset.v }, b.dataset.v !== S.v);
      else if (b.dataset.h) go({ h: b.dataset.h });
      else if (b.dataset.p) go({ v: 'sig', p: b.dataset.p }, b.dataset.p !== S.p || S.v !== 'sig');
    });
    const main = $('#main');
    main.addEventListener('click', e => {
      if (e.target.closest('a[href]')) return;
      const rs = e.target.closest('[data-rs]');
      if (rs) {
        const k = rs.dataset.rs;
        if (S.rs === k) S.rd = -S.rd; else { S.rs = k; S.rd = 1; }
        store.set('rs', S.rs); store.set('rd', S.rd); renderMain(); return;
      }
      if (e.target.closest('[data-rflip]')) { S.rd = -S.rd; store.set('rd', S.rd); renderMain(); return; }
      const hd = e.target.closest('[data-hide]');
      if (hd) {
        const id = hd.dataset.hide;
        S.hide = hidden(id) ? S.hide.filter(x => x !== id) : S.hide.concat([id]);
        if ((labW() ? [LAB] : []).concat(sigs().map(s => s.id)).every(hidden)) S.hide = [];
        store.set('hide', S.hide); renderMain(); return;
      }
      const sb = e.target.closest('[data-s]');
      if (sb) { go({ s: sb.dataset.s }); return; }
      const g = e.target.closest('[data-go]');
      if (g) { go({ v: 'g', id: g.dataset.go }, true); return; }
      const sg = e.target.closest('[data-sig]');
      if (sg) go({ v: 't', s: sg.dataset.sig }, true);
    });
    main.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const g = e.target.closest && e.target.closest('[data-go]');
      if (g && !e.target.closest('a[href]')) { e.preventDefault(); go({ v: 'g', id: g.dataset.go }, true); }
    });
    main.addEventListener('change', e => {
      if (e.target.id === 'rsortsel') { S.rs = e.target.value; S.rd = 1; clean(); store.set('rs', S.rs); store.set('rd', S.rd); renderMain(); }
    });
    main.addEventListener('pointermove', hover);
    main.addEventListener('pointerdown', hover);
    main.addEventListener('pointerleave', unhover);
    main.addEventListener('pointerout', e => { if (e.target.closest && e.target.closest('svg.eq') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('svg.eq'))) unhover(); });
    const onNav = () => { readHash(location.hash); render(); };
    window.addEventListener('popstate', onNav);
    window.addEventListener('hashchange', onNav);
    let rz = null;
    window.addEventListener('resize', () => {
      if (window.innerWidth === LASTW) return;
      clearTimeout(rz); rz = setTimeout(render, 150);
    });
  }
  async function boot() {
    readHash(location.hash);
    bind();
    try { await load(); }
    catch (e) {
      $('#main').innerHTML = `<div class="empty">Rotation Signals has not been built yet (${esc(e.message)}).</div>`;
      setInterval(poll, 300000);
      return;
    }
    readHash(location.hash);
    const h = hashOf();
    if (h !== location.hash) { try { history.replaceState(null, '', h); } catch (e) {  } }
    render();
    setInterval(poll, 300000);
  }

  const API = { setData, state: S, clean, setWidth(w, narrow) { FORCE_W = w; FORCE_NARROW = narrow; }, setStatus(st) { STATUS = st; },
                barHTML, mainHTML, signalsViewHTML, groupViewHTML, tradesViewHTML, scoreHTML, eqSVG, eqHover, eqModel, legendHTML,
                rankHTML, sortedRows, changesHTML, multSVG, priceSVG, readHash, hashOf, rotUrl, huntUrl, titleOf,
                todayLabelsHTML, labelChangesHTML, reasonOf, labOf, lineIds, footHTML,
                periodViewHTML, periodOf, periodLabelRows, periodStats, periodLabelsHTML, periodScoreHTML, periodTradesHTML, relMove,
                periodBtnsHTML, PERIODS,
                fmt: { rp, pc, pts, day, niceStep, tlab, valText } };
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  root.RotationSignals = API;
  if (HAS_DOM && !root.RSIG_NO_BOOT) boot();
})(typeof window !== 'undefined' ? window : globalThis);
