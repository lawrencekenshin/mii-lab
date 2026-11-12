


(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const app = $('#app');
  const tip = $('#tip');


  const PUB = !!window.DMK_PUBLIC;
  const GH = /(^|\.)github\.io$/i.test(location.hostname);
  const DATA = PUB ? (GH ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/demark-hunter-data/demark-hunter/' : 'snap/') : 'data/';
  let HUB = '../';
  let B = null, SP = {}, REC = null;
  const BY = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {  } }
  };
  const S = {
    uni: 'all', perf: false, thin: true, open: {}, tsort: ['dv', -1], tf: 'W', rec: { sig: 'W-B9', era: '2021+' },
    lens: { B: 'w9', S: 'w9' }, rank: store.get('dmk.rank', 'td'), view: store.get('dmk.view', 'cards'), ladder: 'W',
    overlay: store.get('dmk.gex', '1') === '1'
  };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const COL = {
    buy: '#26a69a', buyL: '#6fd6cb', sell: '#ef5350', sellL: '#f28b88', gold: '#E3B341', goldL: '#F5D27A', purple: '#B39DDB',
    grid: '#232733', muted: '#787B86', dim: '#5D606B', off: '#2a2f3d', flip: '#A3A9B8', text: '#D1D4DC', bright: '#F0F3FA'
  };
  const SETUP = { PINNED: 'Pinned', SUPPORTED: 'Supported', CAPPED: 'Capped', 'AT FLIP': 'At the flip', UNSTABLE: 'Unstable' };


  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pd = iso => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; };
  const fd = iso => { if (!iso) return '—'; const p = pd(iso); return MON[p.m - 1] + ' ' + p.d; };
  const fdy = iso => { if (!iso) return '—'; const p = pd(iso); return MON[p.m - 1] + ' ' + p.d + ', ' + p.y; };
  const fmo = iso => { if (!iso) return '—'; const p = pd(iso); return MON[p.m - 1] + ' ' + p.y; };
  const pc = (x, d) => (x == null || !isFinite(x)) ? '—' : ((x >= 0 ? '+' : '−') + Math.abs(100 * x).toFixed(d == null ? 1 : d) + '%');
  const pcu = (x, d) => (x == null || !isFinite(x)) ? '—' : (Math.abs(100 * x).toFixed(d == null ? 1 : d) + '%');
  const cls = x => x == null ? '' : (x >= 0 ? 'pos' : 'neg');

  const money = x => x == null ? '—' : PUB ? pc(x - 1, Math.abs(x - 1) < 0.1 ? 1 : 0) :
    '$' + (x >= 1000 ? x.toLocaleString('en-US', { maximumFractionDigits: 0 }) : x.toFixed(x >= 1 ? 2 : 4));
  const cl = r => PUB ? 1 : r.close;
  const liq = r => PUB ? (r.lq || 0) : (r.dv || 0);
  const big = x => x == null ? '—' : (x >= 1e12 ? '$' + (x / 1e12).toFixed(1) + 'T' : x >= 1e9 ? '$' + (x / 1e9).toFixed(0) + 'B' : '$' + (x / 1e6).toFixed(0) + 'M');
  const strike = v => v == null ? '—' : '$' + (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(+(+v).toFixed(2)));
  const gusd = v => {
    if (v == null) return '—';
    const a = Math.abs(v), s = v < 0 ? '−$' : '$';
    return s + (a >= 1e9 ? (a / 1e9).toFixed(a >= 1e10 ? 0 : 1) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(0) + 'K' : a.toFixed(0));
  };
  const ago = (st, k) => (st && st[k]) ? st[k].ago : null;
  const between = (v, a, b) => v != null && v >= a && v <= b;
  const nextMonth = (y, m, k) => { const t = (m - 1) + k; return { y: y + Math.floor(t / 12), m: (t % 12) + 1 }; };
  const shortName = r => { const n = r.name || ''; return n.length > 26 ? n.slice(0, 25) + '…' : n; };

  const kn = x => {
    if (x == null) return '—';
    const a = Math.abs(x), s = x < 0 ? '−' : '+';
    return s + (a >= 1e6 ? (a / 1e6).toFixed(1) + 'M' : a >= 1e5 ? (a / 1e3).toFixed(0) + 'K' : a >= 1e3 ? (a / 1e3).toFixed(1) + 'K' : a.toFixed(0));
  };
  const fdx = iso => { if (!iso) return '—'; const p = pd(iso); return MON[p.m - 1] + ' ' + p.d + ' ’' + String(p.y).slice(2); };

  const mapDays = gm => {
    const sp = gm.span || [];
    if (!sp.length) return gm.session ? fd(gm.session) : '';
    if (sp[0] === sp[1]) return fd(sp[0]);
    const a = pd(sp[0]), b = pd(sp[1]);
    return fd(sp[0]) + '–' + (a.m === b.m ? b.d : fd(sp[1]));
  };

  async function getJSON(p) {
    const r = await fetch(p, { cache: 'no-cache' });
    if (!r.ok) throw new Error(p + ' → ' + r.status);
    return r.json();
  }


  async function load() {
    try {
      [B, SP] = await Promise.all([getJSON(DATA + 'board.json'), getJSON(DATA + 'sparks.json').catch(() => ({}))]);
    } catch (e) {
      app.innerHTML = '<p class="lede">The board is not built yet (' + esc(e.message) + ').</p>';
      return;
    }
    B.rows.forEach(r => { BY[r.sym] = r; });
    $('#syms').innerHTML = B.rows.map(r => '<option value="' + esc(r.sym) + '">' + esc(r.name || '') + '</option>').join('');
    vintage();
    route();
  }

  function vintage() {
    const wk = B.week || [];
    const wkOpen = wk[1] && wk[1] > B.asof;
    const v = $('#vintage');
    const gm = B.gex || {};
    v.innerHTML = '<span class="dot"></span><span>' + fdy(B.asof) + ' close' + (wkOpen ? ' · week of ' + fd(wk[0]) + ' still open' : '') +
      (gm.span || gm.session ? ' · GEX ' + mapDays(gm) : '') + '</span><a href="' + HUB + '">All dashboards</a>';
  }

  let lastTab = null, curBig = null;
  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    const q = {};
    h.split('&').forEach(kv => { const i = kv.indexOf('='); if (i > 0) q[kv.slice(0, i)] = kv.slice(i + 1); else if (kv) q.tab = kv; });
    const tab = q.s ? 'name' : ((PUB ? ['hunt', 'tops', 'table'] : ['hunt', 'tops', 'record', 'table']).includes(q.tab) ? q.tab : 'hunt');
    if (q.rk && RANKS.some(x => x[0] === q.rk) && q.rk !== S.rank) { S.rank = q.rk; store.set('dmk.rank', S.rank); }
    document.querySelectorAll('.tab').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    document.body.classList.toggle('tops', tab === 'tops');
    hideTip();
    if (!B) return;
    if (tab !== lastTab && tab !== 'name') window.scrollTo(0, 0);
    lastTab = tab;
    curBig = null;
    if (tab === 'name') return renderName(q.s.toUpperCase(), q.tf);
    if (tab === 'tops') return renderSide('S');
    if (tab === 'table') return renderTable();
    return renderSide('B');
  }
  window.addEventListener('hashchange', route);
  $('#find').addEventListener('change', e => {
    const s = e.target.value.trim().toUpperCase();
    if (BY[s]) { location.hash = 's=' + s; e.target.value = ''; e.target.blur(); }
  });
  $('#find').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const s = e.target.value.trim().toUpperCase(); if (BY[s]) { location.hash = 's=' + s; e.target.value = ''; } }
  });

  let lastW = document.documentElement.clientWidth, rsT = null;
  window.addEventListener('resize', () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      const w = document.documentElement.clientWidth;
      if (w === lastW) return;
      lastW = w;
      if (curBig && document.body.contains(curBig.el)) drawBig(curBig.el, curBig.ch, curBig.st, curBig.tf, curBig.G, curBig.close);
      else drawCards();
    }, 160);
  });


  function live(rows) { return rows.filter(r => r.last === B.asof); }
  function inUni(r) { return S.uni === 'all' || (r.u || []).includes(S.uni); }


  function liquid(r) {
    if (!S.thin) return true;
    let ok = !r.thin;
    return ok;
  }
  function uniCounts(list) {
    const c = { all: list.length };
    list.forEach(r => (r.u || []).forEach(u => { c[u] = (c[u] || 0) + 1; }));
    return c;
  }


  function K(side) {
    return side === 'B' ? { n: 'n', nl: 'nl', e9: 'b9', e13: 'b13', need: 'bneed', cdSide: 'B', word: 'down-count', badge: 'g', col: COL.buy, colL: COL.buyL }
      : { n: 's', nl: 'sl', e9: 's9', e13: 's13', need: 'sneed', cdSide: 'S', word: 'up-count', badge: 'r', col: COL.sell, colL: COL.sellL };
  }

  function score(r, side) {
    const k = K(side), w = r.W || {}, m = r.M || {};
    let s = 0;
    if (w[k.e9] && w[k.e9].perf && between(w[k.e9].ago, -1, 4)) s += 2;
    if (between(ago(m, k.e9), -1, 2)) s += 3; else if (m[k.nl] >= 7) s += 2; else if (m[k.nl] >= 5) s += 1;
    const cd = w.cd;
    if (cd && cd.side === k.cdSide) s += cd.nl >= 11 ? 1.5 : (cd.nl >= 8 ? 0.5 : 0);
    if (between(ago(w, k.e13), -1, 3)) s += 1.5;
    return s;
  }


  function gk(r, side) {
    const g = r.gx, gm = (B && B.gex) || {};
    if (!g) return null;
    if (side === 'B') return g.k == null ? null : { px: g.k, d: g.kd, x: g.kx, v: g.kv, s: g.ks, sr: g.kr, q: g.kq, r: g.kqr, p: g.kp, b: g.kb, bb: g.kbb, h: g.kh, n: gm.npos, neg: false, ca: g.ca, f: g.ko != null ? g.ko === 1 : g.kd > 0 };
    return g.n == null ? null : { px: g.n, d: g.nd, x: g.nx, v: g.nv, s: g.ns, sr: g.nr, q: g.nq, r: g.nqr, p: g.np, b: g.nb, bb: g.nbb, h: g.nh, n: gm.nneg, neg: true, ca: g.ca, f: g.no != null ? g.no === 1 : g.nd < 0 };
  }

  function gexKey(r, side) {
    const q = gk(r, side);
    if (!q) return -1;
    return (q.f ? 1000 : 0) + (q.q || 0);
  }


  let built = q => !!(q && q.bb);
  const cnt = (n, w) => kn(n) + ' ' + w + (Math.abs(n) === 1 ? '' : 's');
  function buildTxt(q, full) {
    const b = q.b, w = q.neg ? 'put' : 'call';
    if (!b) return '<span class="dim">' + (q.ca != null ? 'Options re-listed this week (split or strike adjustment): no build read' : 'No open-interest history for this name') + '</span>';
    const held = q.h >= 5 ? 'Held ' + q.h + ' sessions · ' : '';
    const nw = b[1] == null ? '' : ' · ' + pcu(b[1], 0) + ' new';
    if (built(q)) return '<b class="bld' + (q.neg ? ' n' : '') + '">Built ' + cnt(b[0], w) + ' this week</b>' + nw + (full ? ' · ' + gusd(b[2]) + ' of new GEX' : '');
    if (b[0] > 0) return held + cnt(b[0], w) + ' this week' + (held ? '' : nw);
    if (b[0] < 0) return held + '<span class="neg">' + cnt(b[0], w) + ' this week</span>';
    return held ? held + 'no new ' + w + 's' : 'No new ' + w + 's this week';
  }

  const PL = { size: 'Size', anchor: 'Anchor', reach: 'Reach', time: 'Time' };
  const plab = (k, q) => k === 'anchor' && q.p ? (q.p[4] === 'b' ? 'Built' : 'Held') : (PL[k] || k);
  function partsBox(q) {
    const keys = (B.gex || {}).parts || [];
    if (!q.p || !keys.length) return '';
    return '<div class="qs' + (q.neg ? ' n' : '') + '" title="GEX quality ' + (q.q == null ? '—' : q.q) + ' of 100">' + keys.map((k, i) => {
      const v = q.p[i], lab = plab(k, q);
      return '<span class="qr" title="' + esc(lab) + ' ' + (v == null ? '—' : v) + ' of 100"><em>' + esc(lab) + '</em><span class="qb"><i style="width:' + (v == null ? 0 : Math.max(5, Math.min(100, v))) + '%"></i></span></span>';
    }).join('') + '</div>';
  }

  function pk(r, side) {
    const p = (r.gx || {}).pl;
    if (!p) return null;
    return { lo: p[0], hi: p[1], v: p[2], r: p[3], q: p[4], d: p[5], x: p[6], sh: p[7], f: side === 'B' ? p[8] === 1 : p[8] === -1, n: (B.gex || {}).npile };
  }

  function sk(r, side) {
    const s = r.sk;
    if (!s) return null;
    const want = side === 'B' ? 'C' : 'P', sm = B.skew || {}, w = (sm.windows || {})[sm.main || '1w'] || {};
    return { side: s[0], r: s[0] === want ? s[1] : null, other: s[0] !== want && s[1] ? s[1] : null, nC: s[2], nP: s[3], pct: s[4], n: want === 'C' ? w.nC : w.nP, want: want, win: (sm.main || '1w').toUpperCase() };
  }
  const pileKey = (r, side) => { const p = pk(r, side); return p ? (p.f ? 2e5 : 1e5) - p.r : -1; };


  const SXP = {};
  function sxpTable(side) {
    if (SXP[side]) return SXP[side];
    const map = {}, j = side === 'B' ? 0 : 1;
    let n = (((B.gex || {}).nsxp) || [])[j] || 0;
    B.rows.forEach(r => { if (r.xr && r.xr[j]) map[r.sym] = [r.xr[j], null]; });
    return (SXP[side] = { map: map, n: n });
  }
  function xk(r, side) {
    const t = sxpTable(side), v = t.map[r.sym];
    return v ? { r: v[0], m: v[1], n: t.n } : null;
  }
  const sxpKey = (r, side) => { const x = xk(r, side); return x ? 1e5 - x.r : -1; };
  const skewKey = (r, side) => { const k = sk(r, side); return k && k.r ? 1e5 - k.r : -1; };
  const tdOrder = side => (a, b) => (score(b, side) - score(a, side)) || (liq(b) - liq(a));
  const byKey = (key, side) => (a, b) => (key(b, side) - key(a, side)) || (score(b, side) - score(a, side)) || (liq(b) - liq(a));
  const gxOrder = side => byKey(gexKey, side);
  const order = side => S.rank === 'gex' ? gxOrder(side) : S.rank === 'pile' ? byKey(pileKey, side) : S.rank === 'skew' ? byKey(skewKey, side)
    : S.rank === 'sxp' ? byKey(sxpKey, side) : tdOrder(side);
  const RANKS = [['td', 'DeMark'], ['gex', 'King GEX'], ['pile', 'Pile GEX'], ['skew', 'Skew'], ['sxp', 'Skew × Pile']];
  if (!RANKS.some(x => x[0] === S.rank)) S.rank = 'td';
  function rankWords(side) {
    if (S.rank === 'gex') return side === 'B' ? 'kings above the price first, then GEX quality' : 'negative kings under the price first, then GEX quality';
    if (S.rank === 'pile') return (side === 'B' ? 'GEX piles above the price first' : 'GEX piles under the price first') + ', then pile score (size × time to its main expiry)';
    if (S.rank === 'skew') return 'names on the ' + ((B.skew || {}).main || '1w').toUpperCase() + (side === 'B' ? ' call' : ' put') + '-skew list first, by place';
    if (S.rank === 'sxp') return 'names on the ' + ((B.skew || {}).main || '1w').toUpperCase() + (side === 'B' ? ' call' : ' put') + '-skew list that have a GEX pile first, by skew × pile';
    return 'strongest DeMark read first';
  }

  function sections(side, rows) {
    const k = K(side);
    const W = r => r.W || {}, M = r => r.M || {};
    const perfOK = (st) => !S.perf || (st[k.e9] && st[k.e9].perf);
    const out = [];
    const wNine = r => between(ago(W(r), k.e9), -1, 3);
    const mNine = r => between(ago(M(r), k.e9), -1, 2);
    out.push({ id: 'w9', short: 'Weekly 9', title: 'Weekly 9 — week ending ' + fd(lastWeekEnd()), badge: '9',
      desc: side === 'B' ? 'Nine weekly closes in a row below the close four weeks earlier, finished on the last completed week (moomoo’s 1–9 under the candles).'
        : 'Nine weekly closes in a row above the close four weeks earlier, finished on the last completed week.',
      rows: rows.filter(r => ago(W(r), k.e9) === 0 && perfOK(W(r))), ctx: 'w9' });
    out.push({ id: 'wform', short: 'Forming', title: 'Forming this week', badge: '9?', badgeCls: 'p',
      desc: 'Already 8 of 9 — the 9 prints if Friday’s close stays ' + (side === 'B' ? 'below' : 'above') + ' the trigger. Read as if the week closed today.',
      rows: rows.filter(r => ago(W(r), k.e9) === -1 && perfOK(W(r))), ctx: 'wform' });
    out.push({ id: 'stack', short: 'Stacked', title: 'Weekly + monthly stacked', badge: 'W+M',
      desc: side === 'B' ? 'A weekly 9 (or a weekly count of 7+) while the monthly count is 5+ or just made its own 9 — both timeframes exhausted together.'
        : 'A weekly up 9 (or 7+) while the monthly up-count is 5+ or just made its own 9.',
      rows: rows.filter(r => (wNine(r) || W(r)[k.nl] >= 7) && (M(r)[k.nl] >= 5 || mNine(r)) && (!S.perf || perfOK(W(r)) || perfOK(M(r)))), ctx: 'stack' });
    out.push({ id: 'm9', short: 'Monthly 9', title: 'Monthly 9s', badge: 'M9',
      desc: 'The same count on monthly bars: finished in the last three months, or forming in ' + MONL[pd(B.month[0]).m - 1] + ' (as if the month closed today).',
      rows: rows.filter(r => mNine(r) && perfOK(M(r))), ctx: 'm9' });
    out.push({ id: 'c13', short: '13s', title: '13s — DeMark’s countdown', badge: '13', badgeCls: 'y',
      desc: 'The second stage after a 9: thirteen closes ' + (side === 'B' ? 'at or below the low' : 'at or above the high') + ' two bars earlier. Recent 13s, and countdowns at 11–12 of 13.',
      rows: rows.filter(r => between(ago(W(r), k.e13), -1, 3) || between(ago(M(r), k.e13), -1, 2) ||
        [W(r).cd, M(r).cd].some(cd => cd && cd.side === k.cdSide && cd.nl >= 11)), ctx: 'c13' });
    out.push({ id: 'deck', short: 'On deck', title: 'On deck — weekly 7–8 of 9', badge: '8', badgeCls: 'o',
      desc: 'Counting now (as if the week closed today). The trigger is the close the next weekly candle has to beat.',
      rows: rows.filter(r => W(r)[k.nl] === 7 || W(r)[k.nl] === 8 || (W(r)[k.n] === 8 && W(r)[k.nl] === 0)), ctx: 'deck' });
    out.push({ id: 'mbuild', short: 'Monthly 6–8', title: 'Monthly building — 6–8 of 9', badge: 'M', badgeCls: 'o',
      desc: 'Monthly counts that could reach 9 within three month-ends, with the month-end closes they need.',
      rows: rows.filter(r => M(r)[k.nl] >= 6 && M(r)[k.nl] <= 8), ctx: 'mbuild' });
    out.push({ id: 'wrecent', short: 'Recent 9s', title: 'Weekly 9s, 2–4 weeks ago', badge: '9', badgeCls: 'o',
      desc: 'What they have done since the 9.',
      rows: rows.filter(r => between(ago(W(r), k.e9), 1, 3) && perfOK(W(r))), ctx: 'wrecent' });
    out.forEach(s => s.rows.sort(order(side)));
    return out;
  }

  function lastWeekEnd() {

    const wk = B.week;
    if (wk[1] <= B.asof) return wk[1];
    const p = pd(wk[0]);
    const d = new Date(Date.UTC(p.y, p.m - 1, p.d - 3));
    return d.toISOString().slice(0, 10);
  }



  function ringSVG(n, N, col, o) {
    o = o || {};
    const sz = o.size || 46, c = sz / 2, R = sz / 2 - 4.5, sw = o.sw || 4.6;
    const gap = N > 9 ? 0.07 : 0.11;
    let g = '';
    for (let i = 0; i < N; i++) {
      const a0 = -Math.PI / 2 + i * 2 * Math.PI / N + gap / 2, a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / N - gap / 2;
      const on = i < n;
      const ci = on ? ((o.last && i === n - 1) ? o.last : col) : COL.off;
      g += '<path d="M' + (c + R * Math.cos(a0)).toFixed(2) + ' ' + (c + R * Math.sin(a0)).toFixed(2) + 'A' + R + ' ' + R + ' 0 0 1 ' +
        (c + R * Math.cos(a1)).toFixed(2) + ' ' + (c + R * Math.sin(a1)).toFixed(2) + '" stroke="' + ci + '" stroke-width="' + sw + '" fill="none"' + (on && o.dim ? ' opacity=".45"' : '') + '/>';
    }
    if (o.glow) g = '<circle cx="' + c + '" cy="' + c + '" r="' + (R - 6) + '" fill="' + col + '" opacity=".16"/>' + g;
    g += '<text x="' + c + '" y="' + (c + 5.2) + '" text-anchor="middle" font-size="' + (o.fs || 15) + '" font-weight="800" fill="' + (o.tcol || COL.bright) + '">' + esc(o.txt == null ? n : o.txt) + '</text>';
    return '<svg class="ring" viewBox="0 0 ' + sz + ' ' + sz + '" width="' + sz + '" height="' + sz + '" aria-hidden="true">' + g + '</svg>';
  }
  const RS = 40;
  const ringBlock = (svg, lab, sub, c) => '<div class="rg' + (c ? ' ' + c : '') + '">' + svg + '<div class="rt"><div class="rl">' + lab + '</div><div class="rs">' + sub + '</div></div></div>';

  function countRing(st, side, tf) {
    const k = K(side), lab = tf === 'W' ? 'Weekly' : 'Monthly', rec = tf === 'W' ? 4 : 2;
    const z = { size: RS, fs: 14 };
    if (!st) return ringBlock(ringSVG(0, 9, k.col, Object.assign({ txt: '–', tcol: COL.dim }, z)), lab, 'no bars');
    const e9 = st[k.e9];
    if (e9 && e9.ago === -1) return ringBlock(ringSVG(9, 9, k.col, Object.assign({ last: COL.purple, txt: '9', tcol: COL.purple }, z)), lab, '9 forming', 'p');
    if (e9 && e9.ago >= 0 && e9.ago <= rec) {
      return ringBlock(ringSVG(9, 9, k.col, Object.assign({ txt: '9', tcol: k.colL, glow: true }, z)), lab, '9 · ' + (tf === 'W' ? fd(e9.d) : fmo(e9.d)) + (e9.perf ? ' <b class="ok">✓</b>' : ''), 'done');
    }
    const nl = st[k.nl] || 0, nc = st[k.n] || 0;
    if (nl > 0) {
      const n = Math.min(nl, 9), asif = st.dev && nl > nc;
      return ringBlock(ringSVG(n, 9, k.col, Object.assign({ last: asif ? COL.purple : null, txt: n + (nl > 9 ? '+' : '') }, z)), lab, n + ' of 9');
    }
    if (nc > 0) return ringBlock(ringSVG(Math.min(nc, 9), 9, k.col, Object.assign({ dim: true, txt: Math.min(nc, 9), tcol: COL.muted }, z)), lab, Math.min(nc, 9) + ' · resets', 'opp');
    const ok = side === 'B' ? (st.sl || 0) : (st.nl || 0);
    if (ok > 0) {
      const oc = side === 'B' ? COL.sell : COL.buy;
      return ringBlock(ringSVG(Math.min(ok, 9), 9, oc, Object.assign({ txt: Math.min(ok, 9), tcol: side === 'B' ? COL.sellL : COL.buyL, dim: true }, z)), lab, Math.min(ok, 9) + (side === 'B' ? ' up' : ' down'), 'opp');
    }
    return ringBlock(ringSVG(0, 9, k.col, Object.assign({ txt: '0', tcol: COL.dim }, z)), lab, 'no count');
  }

  function cdRing(r, side) {
    const k = K(side), w = r.W || {}, m = r.M || {};
    for (const [t, st, rec] of [['W', w, 3], ['M', m, 2]]) {
      const e = st[k.e13];
      if (e && e.ago >= -1 && e.ago <= rec) {
        return ringBlock(ringSVG(13, 13, COL.gold, { size: RS, txt: '13', tcol: COL.goldL, fs: 12, last: e.ago === -1 ? COL.purple : null, glow: e.ago >= 0 }),
          '13-count', t + ' 13 · ' + (e.ago === -1 ? 'forming' : (t === 'W' ? fd(e.d) : fmo(e.d))), 'y');
      }
    }
    const c = [['W', w.cd], ['M', m.cd]].filter(x => x[1] && x[1].side === k.cdSide && x[1].nl > 0).sort((a, b) => b[1].nl - a[1].nl)[0];
    if (!c) return '';
    const cd = c[1];
    return ringBlock(ringSVG(Math.min(cd.nl, 13), 13, COL.gold, { size: RS, txt: cd.nl, tcol: COL.goldL, fs: 13, dim: cd.nl < 8 }),
      '13-count', c[0] + ' ' + cd.nl + ' of 13' + (cd.defer ? ' +' : ''), 'y');
  }

  function dotStrip(N, on, asif, col) {
    let h = '<span class="dstrip' + (N > 9 ? ' x' : '') + '">';
    for (let i = 0; i < N; i++) h += '<i style="background:' + (i < on ? col : (i < on + asif ? COL.purple : COL.off)) + '"></i>';
    return h + '</span>';
  }

  function tier(rk, n) { if (!rk || !n) return ' c'; const p = rk / n; return p <= 0.1 ? '' : p <= 0.35 ? ' b' : ' c'; }

  function sbar(s, neg) {
    if (s == null) return '';
    return '<span class="sb' + (neg ? ' n' : '') + '" title="GEX quality ' + s + ' of 100"><i style="width:' + Math.max(4, Math.min(100, s)).toFixed(0) + '%"></i></span>';
  }

  function niceTicks(a, b, n) {
    const span = b - a, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= step0) || mag * 10;
    const out = [];
    for (let v = Math.ceil(a / step) * step; v <= b; v += step) out.push(+v.toFixed(10));
    return out;
  }
  const fmtTick = v => PUB ? pc(v - 1, Math.abs(v - 1) < 0.1 ? 1 : 0) :
    (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 10 ? v.toFixed(v % 1 ? 1 : 0) : v.toFixed(2));
  const fmtStrike = v => v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(+(+v).toFixed(2));


  function layoutTags(tags, lo, hi, gap) {
    tags.sort((a, b) => a.y - b.y);
    for (let i = 0; i < tags.length; i++) tags[i].y = Math.max(tags[i].y, lo, i ? tags[i - 1].y + gap : lo);
    for (let i = tags.length - 1; i >= 0; i--) tags[i].y = Math.min(tags[i].y, i < tags.length - 1 ? tags[i + 1].y - gap : hi);
    return tags;
  }


  let thinWords = 'Hides thinly traded names (watchlist names always show)';

  function renderSide(side) {
    const k = K(side);
    const all = live(B.rows).filter(liquid);
    const base = all.filter(inUni);
    const secs = sections(side, base);
    const g = id => secs.find(s => s.id === id);
    const cur = g(S.lens[side]) || g('w9');
    const mo = B.month;
    const nW9 = g('w9').rows.length, nForm = g('wform').rows.length, nM9 = g('m9').rows.length;
    const is13 = r => between(ago(r.W || {}, k.e13), -1, 3) || between(ago(r.M || {}, k.e13), -1, 2);
    const n13 = g('c13').rows.filter(is13).length, n13near = g('c13').rows.length - n13;
    const perfN = g('w9').rows.filter(r => r.W[k.e9].perf).length;
    const mDone = g('m9').rows.filter(r => r.M[k.e9].ago >= 0).length;
    const uc = uniCounts(all.filter(r => {
      const w = r.W || {}, m = r.M || {};
      return between(ago(w, k.e9), -1, 3) || between(ago(m, k.e9), -1, 2) || w[k.nl] >= 7;
    }));
    const c = side === 'B' ? 'g' : 'r';
    const lead = '<span class="' + c + '">' + nW9 + (nW9 === 1 ? ' name' : ' names') + '</span> just finished a weekly 9 ' + (side === 'B' ? 'down' : 'up') + '-count' +
      (nForm ? ' — <span class="' + c + '">' + nForm + ' more</span> are on track this week' : '');
    const examples = g('w9').rows.slice().sort((a, b) => liq(b) - liq(a)).slice(0, 5)
      .map(r => '<a href="#s=' + esc(r.sym) + '"><b>' + esc(r.sym) + '</b></a>').join(', ');
    let h = '<section class="hero2' + (side === 'S' ? ' tops' : '') + '">' +
      '<div class="eyebrow"><span>TD Sequential</span><span>Weekly + monthly</span><span>' + fdy(B.asof) + ' close</span><span>' + live(B.rows).length.toLocaleString() + ' names</span></div>' +
      '<h1>' + lead + '</h1>' +
      '<p class="lede">Tom DeMark’s count, the one moomoo draws as <b>TDS 9</b>: ' +
      (side === 'B' ? 'nine closes in a row <b>below</b> the close four bars earlier finish a down-count (“seller exhaustion”), numbered 1–9 under the candles.'
        : 'nine closes in a row <b>above</b> the close four bars earlier finish an up-count (“buyer exhaustion”), numbered 1–9 over the candles.') +
      ' The unfinished week and month are read as if they closed today.' + (examples ? ' Biggest weekly 9s: ' + examples + '.' : '') + '</p>' +
      '<div class="kpis">' +
      kpi(c, nW9, 'Weekly 9s · last week', dotStrip(9, 9, 0, k.col), '<b>' + perfN + '</b> perfected · week ending ' + fd(lastWeekEnd()), 'w9') +
      kpi('p', nForm, 'Forming this week', dotStrip(9, 8, 1, k.col), '9 if Friday holds ' + (side === 'B' ? 'below' : 'above') + ' the trigger', 'wform') +
      kpi('', nM9, 'Monthly 9s', dotStrip(9, 9, 0, k.colL), '<b>' + mDone + '</b> finished · <b>' + (nM9 - mDone) + '</b> forming in ' + MON[pd(mo[0]).m - 1], 'm9') +
      kpi('y', n13, '13s · countdown done', dotStrip(13, 13, 0, COL.gold), '<b>' + n13near + '</b> more at 11–12 of 13', 'c13') +
      '</div><div class="panels">' + ladderPanel(side, base) + breadthPanel(side) + leadersPanel(side, secs) + '</div></section>';
    h += '<div class="lensbar' + (side === 'S' ? ' tops' : '') + '" id="lensbar">' + secs.map(s => lensPill(s, side, s === cur)).join('') + '</div>';
    h += '<div class="ctrls' + (side === 'S' ? ' tops' : '') + '"><div class="seg" id="uni">' +
      ['all', 'spx', 'ndx', 'rui', 'iwm', 'etf', 'wl'].map(u => '<a data-u="' + u + '" class="' + (S.uni === u ? 'on' : '') + '">' +
        (u === 'all' ? 'All' : esc(B.unis[u])) + '<span class="n">' + (uc[u] || 0) + '</span></a>').join('') + '</div>' +
      '<div class="seg" id="view"><a data-v="cards" class="' + (S.view === 'cards' ? 'on' : '') + '">Cards</a><a data-v="list" class="' + (S.view === 'list' ? 'on' : '') + '">List</a></div>' +
      '<span class="tog' + (S.perf ? ' on' : '') + '" id="perf" title="Only 9s whose low (high on tops) undercut bars 6 and 7"><i></i>Perfected only</span>' +
      '<span class="tog' + (S.thin ? ' on' : '') + '" id="thin" title="' + thinWords + '"><i></i>Hide thin</span></div>';
    h += '<div class="ctrls rankrow' + (side === 'S' ? ' tops' : '') + '"><div class="seg" id="rank"><span class="sl">Rank by</span>' +
      RANKS.map(x => '<a data-r="' + x[0] + '" class="' + (S.rank === x[0] ? 'on' : '') + '">' + x[1] + '</a>').join('') + '</div>' +
      '<span class="rkw">' + esc(rankWords(side)) + '</span></div>';
    h += lensHTML(cur, side);
    h += defsHTML(side);
    app.innerHTML = h;

    const toLens = id => { S.lens[side] = id; renderSide(side); const el = $('#lensbar'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    app.querySelectorAll('#uni a').forEach(a => a.onclick = () => { S.uni = a.dataset.u; renderSide(side); });
    app.querySelectorAll('#rank a').forEach(a => a.onclick = () => { S.rank = a.dataset.r; store.set('dmk.rank', S.rank); renderSide(side); });
    const rkOn = app.querySelector('#rank a.on'), rkSeg = app.querySelector('#rank');
    if (rkOn && rkSeg && rkSeg.scrollWidth > rkSeg.clientWidth) rkSeg.scrollLeft = Math.max(0, rkOn.offsetLeft - 60);
    app.querySelectorAll('#view a').forEach(a => a.onclick = () => { S.view = a.dataset.v; store.set('dmk.view', S.view); renderSide(side); });
    app.querySelectorAll('#lensbar .lens').forEach(a => a.onclick = () => { S.lens[side] = a.dataset.l; renderSide(side); });
    app.querySelectorAll('.kpi[data-go]').forEach(t => t.onclick = () => toLens(t.dataset.go));
    app.querySelectorAll('#ladtf a').forEach(a => a.onclick = () => { S.ladder = a.dataset.t; renderSide(side); });
    app.querySelectorAll('.lad .lb').forEach(b => {
      const i = +b.dataset.i;
      b.onmousemove = ev => showTip(ev, '<b>' + b.dataset.n + (b.dataset.n === '1' ? ' name' : ' names') + '</b> at ' + (i === 9 ? '9 or more' : i + ' of 9') + '<br><span style="color:#787B86">' + (S.ladder === 'W' ? 'weekly' : 'monthly') + ' ' + K(side).word + ', as if the ' + (S.ladder === 'W' ? 'week' : 'month') + ' closed today</span>');
      b.onmouseleave = hideTip;
      const go = S.ladder === 'W' ? (i === 9 ? 'wform' : (i >= 7 ? 'deck' : null)) : (i === 9 ? 'm9' : (i >= 6 ? 'mbuild' : null));
      if (go) { b.style.cursor = 'pointer'; b.onclick = () => toLens(go); }
    });
    const rg = $('#rankgex');
    if (rg) rg.onclick = () => { S.rank = rg.dataset.r || 'gex'; store.set('dmk.rank', S.rank); toLens(S.lens[side]); };
    $('#perf').onclick = () => { S.perf = !S.perf; renderSide(side); };
    $('#thin').onclick = () => { S.thin = !S.thin; renderSide(side); };
    app.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { S.open[side + b.dataset.more] = true; renderSide(side); });
    app.querySelectorAll('.tfsw a').forEach(a => a.onclick = ev => {
      ev.stopPropagation();
      const cc = a.closest('.cc');
      cc.dataset.tf = a.dataset.t;
      cc.querySelectorAll('.tfsw a').forEach(x => x.classList.toggle('on', x === a));
      drawCard(cc);
    });
    app.querySelectorAll('[data-sym]').forEach(el => { if (!el.classList.contains('cc')) el.onclick = () => { location.hash = 's=' + el.dataset.sym; }; });
    drawCards();
  }

  function kpi(c, n, lab, vis, sub, go) {
    return '<div class="kpi ' + c + '" data-go="' + go + '"><div class="kl">' + lab + '</div><div class="kn">' + n + '</div>' + vis + '<div class="ks">' + sub + '</div></div>';
  }

  function ladderPanel(side, rows) {
    const tf = S.ladder, k = K(side);
    const cnt = new Array(10).fill(0);
    rows.forEach(r => { const st = r[tf]; if (!st) return; const v = st[k.nl] || 0; if (v > 0) cnt[Math.min(v, 9)]++; });
    const mx = Math.max(1, ...cnt.slice(1));
    const W = 420, H = 176, l = 4, rr = 4, t = 20, b = 22, gap = 9;
    const bw = (W - l - rr - gap * 8) / 9;
    let g = '';
    for (let i = 1; i <= 9; i++) {
      const x = l + (i - 1) * (bw + gap), hh = Math.max(3, cnt[i] / mx * (H - t - b)), y = H - b - hh;
      const col = i === 9 ? k.colL : k.col;
      g += '<g class="lb" data-i="' + i + '" data-n="' + cnt[i] + '"><rect x="' + x.toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + H + '" fill="transparent"/>' +
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="5" fill="' + col + '" opacity="' + (0.28 + 0.72 * i / 9).toFixed(2) + '"/>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" font-size="12" font-weight="700" fill="' + COL.text + '" text-anchor="middle">' + cnt[i] + '</text>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 5) + '" font-size="12.5" font-weight="800" fill="' + (i === 9 ? k.colL : COL.muted) + '" text-anchor="middle">' + (i === 9 ? '9+' : i) + '</text></g>';
    }
    return '<div class="panel ladder"><div class="ph"><b>Where every count stands</b>' +
      '<span class="seg sm" id="ladtf"><a data-t="W" class="' + (tf === 'W' ? 'on' : '') + '">Weekly</a><a data-t="M" class="' + (tf === 'M' ? 'on' : '') + '">Monthly</a></span></div>' +
      '<div class="ps">Names at each ' + k.word + ' step, as if the ' + (tf === 'W' ? 'week' : 'month') + ' closed today</div>' +
      '<svg class="lad" viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg>' +
      '<div class="lsum"><span><b>' + cnt[9] + '</b> at 9 or more</span><span><b>' + (tf === 'W' ? cnt[7] + cnt[8] : cnt[6] + cnt[7] + cnt[8]) + '</b> at ' + (tf === 'W' ? '7–8' : '6–8') + ', next in line</span>' +
      '<span><b>' + cnt.slice(1).reduce((a, b2) => a + b2, 0) + '</b> counting</span></div></div>';
  }

  function breadthPanel(side) {
    const br = B.breadth || [];
    const idx = side === 'B' ? 1 : 2;
    const lastBr = br.length ? br[br.length - 1] : null;
    const share = lastBr ? lastBr[idx] : null;
    const rank = lastBr ? br.filter(x => x[idx] < share).length / br.length : null;
    const pts = br.slice(-156);
    let svg = '';
    if (pts.length >= 10) {
      const W = 420, H = 78, mx = Math.max(...pts.map(p => p[idx])) || 1;
      const x = i => i / (pts.length - 1) * W, y = v => H - 3 - v / mx * (H - 8);
      let d = '';
      pts.forEach((p, i) => { d += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[idx]).toFixed(1); });
      const col = side === 'B' ? COL.buy : COL.sell;
      svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="brs"><defs><linearGradient id="brg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".45"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + d + 'L' + W + ' ' + H + 'L0 ' + H + 'Z" fill="url(#brg)"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
    }
    return '<div class="panel brp"><div class="ph"><b>How unusual last week was</b></div>' +
      '<div class="bv"><span class="kn">' + pcu(share, 1) + '</span><span class="bt">of all names finished a weekly ' + (side === 'B' ? 'down' : 'up') + ' 9' +
      (rank != null ? '<br>more than in <b>' + Math.round(rank * 100) + '%</b> of weeks since 2000' : '') + '</span></div>' + svg +
      '<div class="ps">Share of names finishing a weekly ' + (side === 'B' ? 'down' : 'up') + ' 9, last 3 years</div></div>';
  }

  function leadersPanel(side, secs) {
    const pool = new Map();
    ['w9', 'wform', 'stack', 'm9', 'c13'].forEach(id => ((secs.find(s => s.id === id) || {}).rows || []).forEach(r => pool.set(r.sym, r)));
    if (S.rank === 'pile') return pileLeaders(side, [...pool.values()]);
    if (S.rank === 'skew') return skewLeaders(side, [...pool.values()]);
    if (S.rank === 'sxp') return sxpLeaders(side, [...pool.values()]);
    const list = [...pool.values()].filter(r => { const q = gk(r, side); return q && q.f; })
      .sort((a, b) => gexKey(b, side) - gexKey(a, side)).slice(0, 5);
    const gm = B.gex || {};
    let h = '<div class="panel leaders' + (side === 'S' ? ' n' : '') + '"><div class="ph"><b>' + (side === 'B' ? 'Best King GEX above the 9s' : 'Best negative kings under the up 9s') + '</b>' +
      '<a class="lnk" id="rankgex" data-r="gex">Rank by King GEX →</a></div>' +
      '<div class="ps">GEX quality · # = place among ' + ((side === 'B' ? gm.npos : gm.nneg) || 0).toLocaleString() + ' current ' + (side === 'B' ? '' : '− ') + 'kings' + (gm.span ? ' · ' + mapDays(gm) + ' maps' : '') + '</div>';
    if (!list.length) return h + '<div class="empty">No King GEX read for these names today.</div></div>';
    h += '<div class="ldr">' + list.map(r => {
      const q = gk(r, side);
      return '<a class="li" data-sym="' + esc(r.sym) + '"><span class="rk' + (q.neg ? ' n' : '') + tier(q.r, q.n) + '">#' + (q.r || '—') + '</span>' +
        '<span class="lt"><b>' + esc(r.sym) + '</b><small>' + (built(q) ? '<em class="bld' + (q.neg ? ' n' : '') + '">built ' + kn(q.b[0]) + '</em> · ' : (q.h >= 10 ? '<em>held ' + q.h + '</em> · ' : '')) + esc(shortName(r)) + '</small></span>' +
        '<span class="lk">' + (q.neg ? '−K ' : 'K ') + strike(q.px) + '<i class="' + (q.d >= 0 ? 'pos' : 'neg') + '">' + (q.d >= 0 ? ' ▲' : ' ▼') + pcu(q.d) + '</i></span>' + sbar(q.q, q.neg) + '</a>';
    }).join('') + '</div>';
    return h + '</div>';
  }

  let pileSub = 'Pile = the band of strikes with the most positive GEX';
  function pileLeaders(side, pool) {
    const gm = B.gex || {};
    const list = pool.filter(r => { const p = pk(r, side); return p && p.f; }).sort((a, b) => pileKey(b, side) - pileKey(a, side)).slice(0, 5);
    let h = '<div class="panel leaders' + (side === 'S' ? ' n' : '') + '"><div class="ph"><b>' + (side === 'B' ? 'Top GEX piles above the 9s' : 'Top GEX piles under the up 9s') + '</b>' +
      '<a class="lnk" id="rankgex" data-r="pile">Rank by Pile GEX →</a></div>' +
      '<div class="ps">' + pileSub + ' · # = place among ' + (gm.npile || 0).toLocaleString() + ' current piles on size × time to expiry</div>';
    if (!list.length) return h + '<div class="empty">No GEX pile ' + (side === 'B' ? 'above' : 'under') + ' the price for these names today.</div></div>';
    return h + '<div class="ldr">' + list.map(r => {
      const p = pk(r, side);
      return '<a class="li" data-sym="' + esc(r.sym) + '"><span class="rk' + tier(p.r, p.n) + '">#' + p.r + '</span>' +
        '<span class="lt"><b>' + esc(r.sym) + '</b><small>' + gusd(p.v) + (p.sh != null ? ' · ' + pcu(p.sh, 0) + ' of the + map' : '') + '</small></span>' +
        '<span class="lk">' + band(p) + '<i class="' + cls(p.d) + '">' + (p.d >= 0 ? ' ▲' : ' ▼') + pcu(p.d) + '</i></span>' + sbar(p.q, false) + '</a>';
    }).join('') + '</div></div>';
  }

  function skewLeaders(side, pool) {
    const sm = B.skew || {}, want = side === 'B' ? 'call' : 'put';
    const list = pool.filter(r => { const k = sk(r, side); return k && k.r; }).sort((a, b) => skewKey(b, side) - skewKey(a, side)).slice(0, 5);
    const w = ((sm.windows || {})[sm.main || '1w']) || {};
    let h = '<div class="panel leaders' + (side === 'S' ? ' n' : '') + '"><div class="ph"><b>Strongest ' + want + ' skews among the ' + (side === 'B' ? '9s' : 'up 9s') + '</b>' +
      '<a class="lnk" id="rankgex" data-r="skew">Rank by Skew →</a></div>' +
      '<div class="ps">Skew Tracker ' + (sm.main || '1w').toUpperCase() + (w.frm ? ' · ' + fd(w.frm) + '–' + fd(w.to) : '') + ' · # = place on the ' + want + ' list of ' + ((side === 'B' ? w.nC : w.nP) || 0) + '</div>';
    if (!list.length) return h + '<div class="empty">None of these names is on the ' + (sm.main || '1w').toUpperCase() + ' ' + want + '-skew list.</div></div>';
    return h + '<div class="ldr">' + list.map(r => {
      const k = sk(r, side);
      return '<a class="li" data-sym="' + esc(r.sym) + '"><span class="rk' + (side === 'S' ? ' n' : '') + tier(k.r, k.n) + '">#' + k.r + '</span>' +
        '<span class="lt"><b>' + esc(r.sym) + '</b><small>' + esc(shortName(r)) + '</small></span>' +
        '<span class="lk">' + skewNet(k) + '</span>' + sbar(k.n ? 100 * (1 - (k.r - 1) / k.n) : null, side === 'S') + '</a>';
    }).join('') + '</div></div>';
  }

  function sxpWords(want) {
    let t = 'The ' + want + '-skew place and the pile place combined';
    return t;
  }
  function sxpLeaders(side, pool) {
    const want = side === 'B' ? 'call' : 'put', t = sxpTable(side);
    const list = pool.filter(r => xk(r, side)).sort((a, b) => sxpKey(b, side) - sxpKey(a, side)).slice(0, 5);
    let h = '<div class="panel leaders' + (side === 'S' ? ' n' : '') + '"><div class="ph"><b>Best skew × pile among the ' + (side === 'B' ? '9s' : 'up 9s') + '</b>' +
      '<a class="lnk" id="rankgex" data-r="sxp">Rank by Skew × Pile →</a></div>' +
      '<div class="ps">' + sxpWords(want) + ' · # = place among ' + t.n + ' listed names with a pile</div>';
    if (!list.length) return h + '<div class="empty">None of these names is on the ' + want + '-skew list with a GEX pile.</div></div>';
    return h + '<div class="ldr">' + list.map(r => {
      const x = xk(r, side), k = sk(r, side), p = pk(r, side);
      return '<a class="li" data-sym="' + esc(r.sym) + '"><span class="rk' + (side === 'S' ? ' n' : '') + tier(x.r, x.n) + '">#' + x.r + '</span>' +
        '<span class="lt"><b>' + esc(r.sym) + '</b><small>' + esc(shortName(r)) + '</small></span>' +
        '<span class="lk">Skew #' + k.r + ' · Pile #' + p.r + '</span>' + sbar(x.m, side === 'S') + '</a>';
    }).join('') + '</div></div>';
  }


  const band = p => Math.abs(p.hi - p.lo) < 1e-9 ? strike(p.lo) : strike(p.lo) + '–' + (p.hi >= 1000 ? strike(p.hi).slice(1) : String(+(+p.hi).toFixed(2)));

  const skewNet = (k, long) => kn(k.nC) + ' C / ' + kn(k.nP) + ' P' + (long && k.pct != null ? ' · ' + pc(k.pct, Math.abs(k.pct) < 0.1 ? 1 : 0) + ' of book' : '');

  function lensPill(s, side, on) {
    return '<a class="lens' + (on ? ' on' : '') + '" data-l="' + s.id + '"><span class="badge ' + (s.badgeCls || K(side).badge) + '">' + s.badge + '</span>' +
      '<span class="lt">' + esc(s.short) + '</span><span class="ln">' + s.rows.length + '</span></a>';
  }

  function lensHTML(s, side) {
    const cards = S.view === 'cards';
    const LIM = cards ? 12 : 48;
    const open = S.open[side + s.id];
    const rows = open ? s.rows : s.rows.slice(0, LIM);
    let h = '<section class="sec lensec" id="lens"><div class="lenshead"><div class="lh"><span class="badge ' + (s.badgeCls || K(side).badge) + '">' + s.badge + '</span><h2>' + esc(s.title) + '</h2>' +
      '<span class="lc">' + s.rows.length + (s.rows.length === 1 ? ' name' : ' names') + ' · ' + ({ td: 'DeMark order', gex: 'King GEX order', pile: 'Pile GEX order', skew: 'Skew order', sxp: 'Skew × Pile order' }[S.rank] || '') + '</span></div>' +
      '<p>' + esc(s.desc) + '</p></div>';
    if (!s.rows.length) h += '<div class="empty">Nothing here today' + (S.uni !== 'all' ? ' in ' + esc(B.unis[S.uni]) : '') + '.</div>';
    else if (cards) h += '<div class="cards">' + rows.map(r => cardHTML(r, s.ctx, side)).join('') + '</div>';
    else h += '<div class="rows">' + rows.map(r => rowHTML(r, s.ctx, side)).join('') + '</div>';
    if (!open && s.rows.length > LIM) h += '<div class="more"><button data-more="' + s.id + '">Show all ' + s.rows.length + '</button></div>';
    return h + '</section>';
  }


  function needLine(r, ctx, side) {
    const k = K(side), w = r.W || {}, m = r.M || {};
    const below = side === 'B';
    const word = below ? 'below' : 'above';
    if (ctx === 'wform' || (w[k.e9] && w[k.e9].ago === -1)) {
      const room = w.trig ? (below ? w.trig / cl(r) - 1 : 1 - w.trig / cl(r)) : null;
      if (PUB) return '<div class="need p">9 prints if Friday closes ' + word + ' <b>' + money(w.trig) + '</b> from today' + (room != null ? ' (' + pcu(room) + ' of room)' : '') + '</div>';
      return '<div class="need p">9 prints if Friday closes ' + word + ' <b>' + money(w.trig) + '</b> — now ' + money(r.close) +
        (room != null ? ' (' + pcu(room) + ' of room)' : '') + '</div>';
    }
    if (ctx === 'm9' && m[k.e9] && m[k.e9].ago === -1) {
      return '<div class="need p">Monthly 9 prints if ' + MONL[pd(B.month[0]).m - 1] + ' closes ' + word + ' <b>' + money(m.trig) + '</b>' + (PUB ? ' from today' : ' — now ' + money(r.close)) + '</div>';
    }
    if (ctx === 'mbuild') return monthNeeds(r, side);
    if (ctx === 'deck') {
      const n = w[k.nl] || 0;
      if (w[k.n] === 8 && n === 0) return '<div class="need">8 of 9 last week — needs Friday ' + (below ? '< ' : '> ') + '<b>' + money(w.trig) + '</b> to stay alive</div>';
      if (n === 8) return '<div class="need">9 next week if it closes ' + word + ' <b>' + money((w[k.need] || [])[1] || w.trig) + '</b></div>';
      if (n === 7) return '<div class="need">Friday ' + (below ? '< ' : '> ') + '<b>' + money(w.trig) + '</b> keeps the count going</div>';
    }
    const e = (ctx === 'm9' ? m : w)[k.e9];
    if (e && e.ago >= 0) {
      const since = cl(r) / e.px - 1;
      let t = 'Since the 9 (' + (ctx === 'm9' ? fmo(e.d) : fd(e.d)) + ' close' + (PUB ? '' : ' ' + money(e.px)) + '): <b class="' + cls(since) + '">' + pc(since) + '</b>';
      if (!e.perf && e.pl != null) t += ' · perfects on a ' + (below ? 'low ≤ ' : 'high ≥ ') + money(e.pl) + (PUB ? ' from today' : '');
      return '<div class="need">' + t + '</div>';
    }
    return '';
  }

  function monthNeeds(r, side) {
    const k = K(side), m = r.M || {};
    const need = m[k.need];
    if (!need || !need.length) return '';
    const p = pd(B.month[0]);
    const done = !m.dev;
    const parts = need.map((v, i) => { const q = nextMonth(p.y, p.m, i + (done ? 1 : 0)); return MON[q.m - 1] + ' ' + (side === 'B' ? '< ' : '> ') + money(v); });
    const last = nextMonth(p.y, p.m, need.length - 1 + (done ? 1 : 0));
    return '<div class="need">9 at the end of ' + MONL[last.m - 1] + ' if month-end closes go ' + parts.join(', ') + '</div>';
  }

  function gexLine(r, side) {
    const q = gk(r, side), g = r.gx;
    if (!q) {
      const none = g ? 'No ' + (side === 'B' ? '+' : '−') + ' king on the ' + fd(g.d) + ' map' : 'No King GEX read for this name';
      if (S.rank === 'pile' || S.rank === 'skew' || S.rank === 'sxp') {
        const line = pileSkewLine(r, side);
        return '<div class="gx none' + (line ? ' ext' : '') + '">' + rankPill(r, side, null) + '<div class="gb"><div class="g2">' + none + '</div>' + line + '</div></div>';
      }
      return '<div class="gx none"><span class="gxl">GEX</span><span>' + none + '</span></div>';
    }
    const up = q.d >= 0;
    const rank = rankPill(r, side, q);
    return '<div class="gx' + (q.neg ? ' n' : '') + (built(q) ? ' bd' : '') + '">' + rank +
      '<div class="gb"><div class="g1"><span class="gk">' + (q.neg ? '− King ' : 'King ') + '<b>' + strike(q.px) + '</b></span>' +
      '<i class="' + (up ? 'pos' : 'neg') + '">' + (up ? '▲ ' : '▼ ') + pcu(q.d) + '</i><span class="gm">' + fd(q.x) + ' · ' + gusd(q.v) + '</span></div>' +
      '<div class="g2 gbl">' + buildTxt(q) + '</div>' +
      '<div class="g2">' + (g.fl != null ? 'Flip ' + strike(g.fl) + ' <span class="' + cls(g.fd) + '">' + pc(g.fd) + '</span>' : 'No flip') +
      (g.set ? ' · ' + (SETUP[g.set] || esc(g.set)) : '') + '</div>' + pileSkewLine(r, side) + '</div>' +
      partsBox(q) + '</div>';
  }


  function rankPill(r, side, q) {
    const neg = side === 'S';
    if (S.rank === 'pile') {
      const p = pk(r, side);
      return '<span class="rk' + tier(p && p.r, p && p.n) + '" title="Pile GEX: place among ' + ((p && p.n) || 0).toLocaleString() + ' current piles">' + (p ? '#' + p.r + '<small>pile of ' + (p.n || 0).toLocaleString() + '</small>' : '—<small>no pile</small>') + '</span>';
    }
    if (S.rank === 'sxp') {
      const x = xk(r, side);
      return '<span class="rk' + (neg ? ' n' : '') + tier(x && x.r, x && x.n) + '" title="Skew × Pile (' + sxpWords(neg ? 'put' : 'call') + '): place among ' + sxpTable(side).n + ' listed names with a pile">' +
        (x ? '#' + x.r + '<small>skew × pile of ' + x.n + '</small>' : '—<small>not on both</small>') + '</span>';
    }
    if (S.rank === 'skew') {
      const k = sk(r, side);
      return '<span class="rk' + (neg ? ' n' : '') + tier(k && k.r, k && k.n) + '" title="Place on the Skew Tracker\'s ' + (k ? k.win : '1W') + (neg ? ' put' : ' call') + ' list">' + (k && k.r ? '#' + k.r + '<small>' + (neg ? 'put' : 'call') + ' skew of ' + (k.n || '—') + '</small>' : '—<small>not on the ' + (neg ? 'put' : 'call') + ' list</small>') + '</span>';
    }
    return '<span class="rk' + (q.neg ? ' n' : '') + tier(q.r, q.n) + '" title="GEX quality ' + (q.q == null ? '—' : q.q) + ' of 100: place among ' + (q.n ? q.n.toLocaleString() : '—') + ' current ' + (q.neg ? '− ' : '') + 'kings">' + (q.r ? '#' + q.r + '<small>of ' + (q.n ? q.n.toLocaleString() : '—') + '</small>' : '—') + '</span>';
  }


  function pileSkewLine(r, side) {
    const p = pk(r, side), k = sk(r, side), parts = [];
    if (p) parts.push('Pile <b>' + band(p) + '</b> <span class="' + cls(p.d) + '">' + pc(p.d, 0) + '</span> · ' + gusd(p.v) + ' <span class="dim">#' + p.r + '</span>');
    if (k && k.r) parts.push('<b class="' + (side === 'B' ? 'pos' : 'neg') + '">' + (side === 'B' ? 'Call' : 'Put') + ' skew #' + k.r + '</b> <span class="dim">' + k.win + '</span>');
    else if (k && k.other) parts.push('<span class="dim">' + (k.side === 'C' ? 'Call' : 'Put') + ' skew #' + k.other + ' ' + k.win + '</span>');
    else if (k && k.side === k.want) parts.push((side === 'B' ? 'Calls' : 'Puts') + ' leaning, unlisted');
    return parts.length ? '<div class="g2 gps">' + parts.join(' · ') + '</div>' : '';
  }

  function cardHTML(r, ctx, side) {
    const k = K(side), w = r.W || {}, m = r.M || {};
    const tf = (ctx === 'm9' || ctx === 'mbuild') ? 'M' : 'W';
    const hot = (w[k.e9] && w[k.e9].perf && between(w[k.e9].ago, -1, 1)) || between(ago(m, k.e9), -1, 1);
    let h = '<article class="card' + (hot ? ' hot' : '') + (side === 'S' ? ' sell' : '') + '" data-sym="' + esc(r.sym) + '">' +
      '<div class="ch"><div class="id"><div class="tk">' + esc(r.sym) + '</div><div class="nm">' + esc(r.name || '') + (r.grp ? ' · ' + esc(r.grp) : '') + '</div></div>' +
      '<div class="px">' + (PUB ? '<div class="p pp ' + cls(r.wchg) + '">' + pc(r.wchg) + '<small> wk</small></div><div class="p2">day <span class="' + cls(r.d1) + '">' + pc(r.d1) + '</span></div>'
        : '<div class="p">' + money(r.close) + '</div><div class="p2">wk <span class="' + cls(r.wchg) + '">' + pc(r.wchg) + '</span> · day <span class="' + cls(r.d1) + '">' + pc(r.d1) + '</span></div>') + '</div></div>' +
      '<div class="rings">' + countRing(r.W, side, 'W') + countRing(r.M, side, 'M') + cdRing(r, side) + '</div>';
    if ((SP[r.sym] || {}).W) {
      h += '<div class="cc" data-sym="' + esc(r.sym) + '" data-tf="' + tf + '" data-side="' + side + '"><div class="tfsw"><a data-t="W" class="' + (tf === 'W' ? 'on' : '') + '">Weekly</a><a data-t="M" class="' + (tf === 'M' ? 'on' : '') + '">Monthly</a></div><div class="ccv"></div></div>';
    }
    h += gexLine(r, side);
    h += needLine(r, ctx, side);
    const tdst = (w[k.e9] && w[k.e9].ago <= 4) ? w[k.e9].tdst : null;
    const foot = [];
    if (side === 'B' && r.off != null) foot.push('<b class="neg">' + pc(r.off, 0) + '</b> off 52w high');
    if (tdst != null) foot.push('TDST ' + (side === 'B' ? 'resistance' : 'support') + ' <b>' + money(tdst) + '</b>' + (PUB ? '' : ' (' + pc(tdst / r.close - 1, 0) + ')'));
    if (r.mcap) foot.push(big(r.mcap));
    if (r.ind) foot.push(esc(r.ind));
    if (foot.length) h += '<div class="cf">' + foot.map(x => '<span>' + x + '</span>').join('') + '</div>';
    return h + '</article>';
  }

  function rowHTML(r, ctx, side) {
    const k = K(side), st = (ctx === 'mbuild' || ctx === 'm9') ? (r.M || {}) : (r.W || {});
    const n = st[k.nl] || 0;
    let dots = '';
    for (let i = 1; i <= 9; i++) {
      const on = i <= Math.min(n, 9);
      const asif = on && st.dev && i === n && n > (st[k.n] || 0);
      dots += '<i class="' + (on ? (asif ? 'as' : (side === 'B' ? 'on' : 'onr')) : '') + '"></i>';
    }
    let tg = '';
    const lt = side === 'B' ? '< ' : '> ';
    const e9 = st[k.e9];
    if (ctx === 'deck') {
      if (st[k.n] === 8 && st[k.nl] === 0) tg = 'needs Fri ' + lt + money(st.trig);
      else if (st[k.nl] === 8) tg = '9 next week if ' + lt + money((st[k.need] || [])[1] || st.trig);
      else tg = 'Fri ' + lt + money(st.trig);
    } else if (ctx === 'mbuild') {
      const need = st[k.need] || [];
      tg = need.length ? (MON[pd(B.month[0]).m - 1] + ' ' + lt + money(need[0])) : '';
    } else if (ctx === 'wform') {
      tg = '9 if Fri ' + lt + money(st.trig);
    } else if (ctx === 'm9' && e9 && e9.ago === -1) {
      tg = '9 if ' + MON[pd(B.month[0]).m - 1] + ' ' + lt + money(st.trig);
    } else if (ctx === 'c13') {
      const cd = [r.W && r.W.cd, r.M && r.M.cd].filter(c => c && c.side === k.cdSide).sort((a, b) => b.nl - a.nl)[0];
      tg = cd ? '13-count ' + cd.nl + '/13' : '13 done';
    } else if (e9 && e9.ago >= 0) {
      const since = cl(r) / e9.px - 1;
      tg = '<span class="' + cls(since) + '">' + pc(since) + '</span> since ' + (ctx === 'm9' ? fmo(e9.d) : fd(e9.d));
    }
    const q = gk(r, side);
    if (S.rank === 'pile' || S.rank === 'skew' || S.rank === 'sxp') {
      const p = pk(r, side), k = sk(r, side), x = xk(r, side);
      const chip = S.rank === 'sxp' ? (x ? '<span class="gxs' + (side === 'S' ? ' n' : '') + tier(x.r, x.n) + '" title="Skew #' + k.r + ' · Pile #' + p.r + '">#' + x.r + ' s×p</span>' : '<span class="gxs none">—</span>')
        : S.rank === 'pile' ? (p ? '<span class="gxs' + tier(p.r, p.n) + '" title="Pile ' + band(p) + ', ' + gusd(p.v) + '">#' + p.r + ' pile <i class="' + cls(p.d) + '">' + (p.d >= 0 ? '▲' : '▼') + pcu(p.d, 0) + '</i></span>' : '<span class="gxs none">—</span>')
        : (k && k.r ? '<span class="gxs' + (side === 'S' ? ' n' : '') + tier(k.r, k.n) + '" title="' + skewNet(k, true) + '">#' + k.r + ' skew</span>' : '<span class="gxs none">—</span>');
      return '<div class="rw" data-sym="' + esc(r.sym) + '"><span class="tk">' + esc(r.sym) + '</span><span class="nm">' + esc(r.name || '') + '</span>' +
        '<span class="dots">' + dots + '</span><span class="tg">' + tg + '</span>' + chip + '</div>';
    }
    const gx = q ? '<span class="gxs' + (q.neg ? ' n' : '') + tier(q.r, q.n) + '" title="King ' + strike(q.px) + ', ' + pc(q.d) + ' from the close · GEX quality ' + (q.q == null ? '—' : q.q) + (q.b ? ' · ' + kn(q.b[0]) + ' contracts this week' : '') + '">' + (q.r ? '#' + q.r : '—') + ' <i class="' + cls(q.d) + '">' + (q.d >= 0 ? '▲' : '▼') + pcu(q.d, 0) + '</i>' + (built(q) ? ' <b class="bld' + (q.neg ? ' n' : '') + '">' + kn(q.b[0]) + '</b>' : '') + '</span>' : '<span class="gxs none">—</span>';
    return '<div class="rw" data-sym="' + esc(r.sym) + '"><span class="tk">' + esc(r.sym) + '</span><span class="nm">' + esc(r.name || '') + '</span>' +
      '<span class="dots">' + dots + '</span><span class="tg">' + tg + '</span>' + gx + '</div>';
  }


  function drawCards() {
    app.querySelectorAll('.cc').forEach(drawCard);
  }

  function drawCard(el) {
    const r = BY[el.dataset.sym], tf = el.dataset.tf, side = el.dataset.side;
    const sp = (SP[el.dataset.sym] || {})[tf];
    const box = el.querySelector('.ccv');
    if (!r || !box) return;
    if (!sp) { box.innerHTML = '<div class="nochart">No ' + (tf === 'W' ? 'weekly' : 'monthly') + ' bars</div>'; return; }
    const Wd = Math.max(220, Math.round(box.clientWidth || el.clientWidth || 360));
    box.innerHTML = miniChart(sp, r[tf], side, Wd, 156, r.gx);
  }

  function miniChart(sp, st, side, Wd, H, gx) {
    const k = K(side);
    const n0 = sp.c.length, lo0 = Math.max(0, n0 - 26);
    const c = sp.c.slice(lo0), h = sp.h.slice(lo0), l = sp.l.slice(lo0), num = sp.num.slice(lo0), cd = sp.cd.slice(lo0);
    const o = c.map((x, i) => i ? c[i - 1] : (lo0 ? sp.c[lo0 - 1] : sp.c0));
    const n = c.length;
    let mn = Math.min(...l), mx = Math.max(...h);
    const span0 = (mx - mn) || mx * 0.1 || 1;
    const trig = st && st.trig;
    const showTrig = st && st.dev && trig != null && ((st[k.nl] || 0) >= 1 || (st[k.n] || 0) >= 6);
    if (showTrig && trig < mx + span0 * 0.4 && trig > mn - span0 * 0.4) { mn = Math.min(mn, trig); mx = Math.max(mx, trig); }
    let lv = [];
    if (gx) {
      const at = (v, d) => PUB ? (d == null ? null : 1 + d) : v;
      if (side === 'B' && gx.k != null) lv.push({ v: at(gx.k, gx.kd), s: gx.k, lab: 'K', col: COL.gold, txt: '#1b1404', fill: true });
      if (side === 'S' && gx.n != null) lv.push({ v: at(gx.n, gx.nd), s: gx.n, lab: '−K', col: COL.sell, txt: '#fff', fill: true });
      if (gx.fl != null) lv.push({ v: at(gx.fl, gx.fd), s: gx.fl, lab: 'Flip', col: COL.flip, flip: true });
      lv = lv.filter(L => L.v != null);
    }
    const ext = span0 * 0.45;
    lv.forEach(L => { if (L.v <= mx + ext && L.v >= mn - ext) { mn = Math.min(mn, L.v); mx = Math.max(mx, L.v); } else L.edge = L.v > mx ? 'up' : 'down'; });
    const pad = (mx - mn) * 0.06 || 1;
    mn -= pad; mx += pad;
    const top = 14, bot = 15, gut = lv.length ? 60 : 6, plotW = Wd - gut;
    const y = v => top + (mx - v) / (mx - mn) * (H - top - bot);
    const bw = plotW / n, cw = Math.max(2, Math.min(10, bw * 0.62));
    let g = '';
    lv.forEach(L => {
      if (L.edge) return;
      const yy = y(L.v).toFixed(1);
      g += '<line x1="0" x2="' + plotW + '" y1="' + yy + '" y2="' + yy + '" stroke="' + L.col + '" stroke-width="' + (L.flip ? 1 : 1.3) + '" stroke-dasharray="' + (L.flip ? '2 3' : '6 3') + '" opacity="' + (L.flip ? .65 : .9) + '"/>';
    });
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * bw;
      const dev = st && st.dev && i === n - 1;
      const col = dev ? COL.purple : (c[i] >= o[i] ? COL.buy : COL.sell);
      g += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + y(h[i]).toFixed(1) + '" y2="' + y(l[i]).toFixed(1) + '" stroke="' + col + '" stroke-width="1"/>';
      const yt = y(Math.max(o[i], c[i])), yb = y(Math.min(o[i], c[i]));
      g += '<rect x="' + (x - cw / 2).toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + Math.max(1, yb - yt).toFixed(1) + '" rx="1" fill="' + col + '"' + (dev ? ' fill-opacity=".5" stroke="' + COL.purple + '"' : '') + '/>';
      const v = num[i];
      if (v) {
        const nine = Math.abs(v) === 9;
        const fs = nine ? 11 : 9;
        const yy = v < 0 ? y(l[i]) + fs + 1.5 : y(h[i]) - 3.5;
        const colN = v < 0 ? (nine ? COL.buyL : COL.buy) : (nine ? COL.sellL : COL.sell);
        if (nine) g += '<circle cx="' + x.toFixed(1) + '" cy="' + (yy - fs * 0.36).toFixed(1) + '" r="' + (fs * 0.74).toFixed(1) + '" fill="' + (v < 0 ? 'rgba(38,166,154,.25)' : 'rgba(239,83,80,.22)') + '" stroke="' + colN + '"/>';
        g += '<text x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" font-size="' + fs + '" font-weight="' + (nine ? 900 : 650) + '" fill="' + colN + '" text-anchor="middle"' + (dev ? ' opacity=".8"' : '') + '>' + Math.abs(v) + '</text>';
      }
      if (Math.abs(cd[i]) === 13) {
        const yy = cd[i] < 0 ? H - 2 : 10;
        g += '<text x="' + x.toFixed(1) + '" y="' + yy + '" font-size="9.5" font-weight="900" fill="' + COL.goldL + '" text-anchor="middle">13</text>';
      }
    }
    if (showTrig) {
      const yt = y(trig).toFixed(1);
      g += '<line x1="' + Math.max(0, (n - 5) * bw).toFixed(1) + '" x2="' + plotW + '" y1="' + yt + '" y2="' + yt + '" stroke="' + COL.gold + '" stroke-width="1" stroke-dasharray="3 3"/>';
    }
    if (lv.length) {
      const tags = lv.map(L => ({ y: L.edge ? (L.edge === 'up' ? top : H - bot) : y(L.v), L, lab: (L.edge ? (L.edge === 'up' ? '▲' : '▼') : '') + L.lab + ' ' + (PUB && L.s != null ? fmtStrike(L.s) : fmtTick(L.v)) }));
      layoutTags(tags, top + 2, H - bot - 2, 17);
      tags.forEach(T => {
        const L = T.L, tw = gut - 6, fs = Math.min(10, (tw - 6) / (T.lab.length * 0.6));
        g += '<rect x="' + (plotW + 4) + '" y="' + (T.y - 8).toFixed(1) + '" width="' + tw + '" height="16" rx="4" fill="' + (L.fill ? L.col : '#131722') + '" stroke="' + L.col + '"' + (L.flip ? ' stroke-opacity=".7"' : '') + '/>' +
          '<text x="' + (plotW + 4 + tw / 2) + '" y="' + (T.y + 3.6).toFixed(1) + '" font-size="' + fs.toFixed(1) + '" font-weight="800" fill="' + (L.fill ? L.txt : L.col) + '" text-anchor="middle">' + T.lab + '</text>';
      });
    }
    return '<svg viewBox="0 0 ' + Wd + ' ' + H + '" width="' + Wd + '" height="' + H + '">' + g + '</svg>';
  }


  async function renderName(sym, tf) {
    const r = BY[sym];
    if (!r) { app.innerHTML = '<span class="back" onclick="history.back()">← Back</span><p class="lede">No ' + esc(sym) + ' on the board.</p>'; return; }
    app.innerHTML = '<span class="back" id="back">← Back</span><p class="lede">Loading ' + esc(sym) + '…</p>';
    $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = 'hunt');
    let P;
    try { P = await getJSON(DATA + 'names/' + encodeURIComponent(sym) + '.json'); } catch (e) { app.innerHTML += '<p class="lede">' + esc(e.message) + '</p>'; return; }
    if (decodeURIComponent(location.hash).indexOf('s=' + sym) < 0) return;
    tf = (tf || S.tf || 'W').toUpperCase();
    if (!P.tf[tf]) tf = 'W';
    S.tf = tf;
    const G = P.gex || null;
    if (G && P.skew) G.skew = P.skew;
    let h = '<span class="back" id="back">← Back</span><div class="nhead"><div><div class="tk">' + esc(sym) + '</div><div class="nm">' + esc(r.name || '') +
      (r.grp ? ' · ' + esc(r.grp) : '') + (r.ind ? ' · ' + esc(r.ind) : '') + '</div></div>' +
      '<div class="px">' + (PUB ? '' : '<div class="p">' + money(r.close) + '</div>') + '<div class="nm">' + fdy(r.last) + ' · day <span class="' + cls(r.d1) + '">' + pc(r.d1) +
      '</span> · week <span class="' + cls(r.wchg) + '">' + pc(r.wchg) + '</span> · ' + pc(r.off, 0) + ' off 52-week high</div></div></div>';
    h += '<div class="state">' + ['W', 'M', 'D'].map(t => stateBox(t, P, t === tf)).join('') + '</div>';
    h += '<div class="bigchart"><div class="cbar"><span class="ct">' + { W: 'Weekly', M: 'Monthly', D: 'Daily' }[tf] + ' bars</span>' +
      (G && G.map && G.map.ks.length ? '<span class="tog' + (S.overlay ? ' on' : '') + '" id="ovl"><i></i>GEX overlay</span>' : '') + '</div><div id="big"></div></div>';
    h += '<div class="legend"><span><i style="background:#26a69a"></i>1–9 under a candle: down-count</span><span><i style="background:#ef5350"></i>1–9 over a candle: up-count</span>' +
      '<span><i style="background:#E3B341"></i>gold numbers: the 13-countdown</span><span><i style="background:#B39DDB"></i>purple: unfinished bar, read as if closed today</span>' +
      (G ? '<span><i class="ln" style="border-color:#E3B341"></i>King</span><span><i class="ln" style="border-color:#ef5350"></i>Negative king</span><span><i class="ln dot" style="border-color:#A3A9B8"></i>Flip</span>' +
        (G.map ? '<span><i style="background:linear-gradient(90deg,rgba(239,83,80,.5),rgba(38,166,154,.5))"></i>bars from the right: net GEX by strike</span>' : '') : '') + '</div>';
    h += G ? gexSection(G, r) : '<section class="sec gexsec"><div class="sech"><span class="st"><span class="badge y">GEX</span>King GEX levels</span></div><div class="empty">The King GEX Tracker has no current map for ' + esc(sym) + '.</div>' +
      (P.skew ? '<div class="gxg2 solo">' + skewTile({ skew: P.skew }) + '</div>' : '') + '</section>';
    h += historyHTML(P, tf, sym);
    app.innerHTML = h;
    $('#back').onclick = () => history.length > 1 ? history.back() : (location.hash = 'hunt');
    app.querySelectorAll('.sbox').forEach(b => b.onclick = () => { location.hash = 's=' + sym + '&tf=' + b.dataset.tf; });
    const ov = $('#ovl');
    if (ov) ov.onclick = () => { S.overlay = !S.overlay; store.set('dmk.gex', S.overlay ? '1' : '0'); ov.classList.toggle('on', S.overlay); drawBig(curBig.el, curBig.ch, curBig.st, curBig.tf, curBig.G, curBig.close); };
    curBig = { el: $('#big'), ch: P.tf[tf].chart, st: P.tf[tf].st, tf, G, close: cl(r) };
    drawBig(curBig.el, curBig.ch, curBig.st, tf, G, cl(r));
    window.scrollTo(0, 0);
  }

  function stateBox(t, P, on) {
    const lab = { W: 'Weekly', M: 'Monthly', D: 'Daily' }[t];
    const st = (P.tf[t] || {}).st || {};
    let v, s, ring;
    if (t === 'D') {
      const n = st.n || 0, u = st.s || 0;
      ring = ringSVG(Math.min(n || u, 9), 9, n ? COL.buy : COL.sell, { txt: Math.min(n || u, 9), size: 52 });
      v = n ? n + ' <small>down-count</small>' : u ? u + ' <small>up-count</small>' : '0';
      s = 'context only';
    } else {
      const nl = st.nl || 0, sl = st.sl || 0;
      const b9 = st.b9, s9 = st.s9;
      const e = (b9 && (!s9 || b9.ago <= s9.ago)) ? ['Down 9', b9, 'B'] : (s9 ? ['Up 9', s9, 'S'] : null);
      if (e && e[1].ago >= 0 && e[1].ago <= 1 && !nl && !sl) ring = ringSVG(9, 9, e[2] === 'B' ? COL.buy : COL.sell, { txt: '9', size: 52, glow: true });
      else ring = ringSVG(Math.min(nl || sl, 9), 9, nl ? COL.buy : COL.sell, { txt: Math.min(nl || sl, 9) + ((nl || sl) > 9 ? '+' : ''), size: 52, last: st.dev && (nl || sl) ? COL.purple : null });
      v = nl ? Math.min(nl, 9) + (nl > 9 ? '+' : '') + ' <small>of 9 down' + (st.dev ? ', as if closed' : '') + '</small>'
        : sl ? Math.min(sl, 9) + (sl > 9 ? '+' : '') + ' <small>of 9 up' + (st.dev ? ', as if closed' : '') + '</small>' : '0 <small>no count</small>';
      s = e ? e[0] + ' ' + (e[1].ago === -1 ? 'forming now' : (t === 'W' ? fd(e[1].d) : fmo(e[1].d))) + (e[1].perf ? ' · perfected' : '') : 'no 9 in the last ' + (t === 'W' ? '8 weeks' : '6 months');
      if (st.cd) s += ' · 13-count ' + st.cd.nl + '/13 ' + (st.cd.side === 'B' ? 'down' : 'up');
      if (st.dev && st.trig != null) s += ' · next bar vs ' + money(st.trig);
    }
    return '<div class="sbox' + (on ? ' on' : '') + '" data-tf="' + t + '">' + ring + '<div class="sx"><div class="t">' + lab + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div></div></div>';
  }

  function drawBig(el, ch, st, tf, G, close) {
    const n = ch.c.length;
    const Wd = Math.max(320, el.clientWidth), H = el.clientWidth < 600 ? 360 : 470;
    const padR = 92, top = 22, bot = 40, plotW = Wd - padR;
    let mn = Math.min(...ch.l), mx = Math.max(...ch.h);
    const lines = [];
    const last9 = ch.ev.filter(e => e.k === 'B9' || e.k === 'S9').pop();
    if (last9 && last9.tdst != null) lines.push({ y: last9.tdst, from: last9.j - 8, col: last9.k === 'B9' ? COL.buyL : COL.sellL, lab: 'TDST' });
    if (st && st.dev && st.trig != null) lines.push({ y: st.trig, from: n - 5, col: COL.gold, lab: 'next', dash: '4 3' });
    if (G) {
      const at = (v, d) => PUB ? (d == null ? null : 1 + d) : v;
      if (G.k != null && at(G.k, G.kd) != null) lines.push({ y: at(G.k, G.kd), s: G.k, from: 0, col: COL.gold, lab: 'King', dash: '8 4', w: 1.6, fill: true, txt: '#1b1404' });
      if (G.n != null && at(G.n, G.nd) != null) lines.push({ y: at(G.n, G.nd), s: G.n, from: 0, col: COL.sell, lab: '−King', dash: '8 4', w: 1.3 });
      if (G.fl != null && at(G.fl, G.fd) != null) lines.push({ y: at(G.fl, G.fd), s: G.fl, from: 0, col: COL.flip, lab: 'Flip', dash: '2 4', w: 1.2 });
    }
    lines.forEach(L => { if (L.y < mx * 1.35 && L.y > mn * 0.7) { mn = Math.min(mn, L.y); mx = Math.max(mx, L.y); } else L.edge = L.y > mx ? 'up' : 'down'; });
    const pad = (mx - mn) * 0.05;
    mn -= pad; mx += pad;
    const y = v => top + (mx - v) / (mx - mn) * (H - top - bot);
    const bw = plotW / (n + 1.5), cw = Math.max(1.5, bw * 0.64);
    const fs = Math.max(7, Math.min(12, bw * 0.9));
    let g = '';

    const tags = lines.map(L => ({ y: L.edge ? (L.edge === 'up' ? top + 9 : H - bot - 9) : y(L.y), L, lab: (L.edge ? (L.edge === 'up' ? '▲ ' : '▼ ') : '') + L.lab + ' ' + (PUB && L.s != null ? fmtStrike(L.s) : fmtTick(L.y)) }));
    layoutTags(tags, top + 9, H - bot - 9, 21);
    niceTicks(mn, mx, 9).forEach(t => {
      g += '<line x1="0" x2="' + plotW + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '" stroke="' + COL.grid + '"/>';
      if (!tags.some(T => Math.abs(T.y - y(t)) < 13)) g += '<text x="' + (plotW + 8) + '" y="' + (y(t) + 4).toFixed(1) + '" font-size="11" fill="' + COL.muted + '">' + fmtTick(t) + '</text>';
    });

    if (G && G.map && S.overlay) {
      const pts = G.map.ks.map((k, i) => [PUB ? (G.map.r || [])[i] : k, G.map.v[i], k]).filter(p => p[0] != null && p[0] >= mn && p[0] <= mx && p[1]);
      if (pts.length) {
        const mv = Math.max(...pts.map(p => Math.abs(p[1])));
        const ys = pts.map(p => y(p[0]));
        let step = 99;
        for (let i = 1; i < ys.length; i++) step = Math.min(step, Math.abs(ys[i] - ys[i - 1]) || 99);
        const bh = Math.max(3, Math.min(10, step * 0.8));
        pts.forEach((p, i) => {
          const len = Math.abs(p[1]) / mv * plotW * 0.34;
          const king = G.k != null && Math.abs(p[2] - G.k) < 1e-6;
          const col = king ? COL.gold : (p[1] >= 0 ? COL.buy : COL.sell);
          g += '<rect x="' + (plotW - len).toFixed(1) + '" y="' + (ys[i] - bh / 2).toFixed(1) + '" width="' + len.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '" opacity="' + (king ? .6 : .42) + '"/>';
        });
      }
    }
    let lastLab = '';
    for (let i = 0; i < n; i++) {
      const p = pd(ch.d[i]);
      const lab = tf === 'D' ? MON[p.m - 1] : (tf === 'W' ? MON[p.m - 1] + (p.m === 1 ? ' ' + p.y : '') : String(p.y));
      const key = tf === 'M' ? String(p.y) : p.y + '-' + p.m;
      if (key !== lastLab && (tf !== 'W' || p.m % 3 === 1 || n < 40) && (tf !== 'M' || p.y % 2 === 0)) {
        if (lastLab !== '') g += '<text x="' + ((i + 0.5) * bw).toFixed(1) + '" y="' + (H - 8) + '" font-size="11" fill="' + COL.muted + '" text-anchor="middle">' + lab + '</text>';
        lastLab = key;
      } else if (lastLab === '') lastLab = key;
    }
    lines.forEach(L => {
      if (L.edge) return;
      const x0 = Math.max(0, L.from) * bw, yy = y(L.y);
      g += '<line x1="' + x0.toFixed(1) + '" x2="' + plotW + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="' + L.col + '" stroke-dasharray="' + (L.dash || '6 4') + '" stroke-width="' + (L.w || 1.2) + '"/>';
    });
    tags.forEach(T => {
      const L = T.L, tw = padR - 6;
      g += '<rect x="' + (plotW + 3) + '" y="' + (T.y - 9.5).toFixed(1) + '" width="' + tw + '" height="19" rx="4.5" fill="' + (L.fill ? L.col : '#131722') + '" stroke="' + L.col + '"/>' +
        '<text x="' + (plotW + 3 + tw / 2) + '" y="' + (T.y + 4).toFixed(1) + '" font-size="10.5" font-weight="800" fill="' + (L.fill ? L.txt : L.col) + '" text-anchor="middle">' + T.lab + '</text>';
    });
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * bw, dev = !ch.done[i];
      const col = dev ? COL.purple : (ch.c[i] >= ch.o[i] ? COL.buy : COL.sell);
      g += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + y(ch.h[i]).toFixed(1) + '" y2="' + y(ch.l[i]).toFixed(1) + '" stroke="' + col + '"/>';
      const yt = y(Math.max(ch.o[i], ch.c[i])), yb = y(Math.min(ch.o[i], ch.c[i]));
      g += '<rect x="' + (x - cw / 2).toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + Math.max(1, yb - yt).toFixed(1) + '" fill="' + col + '"' + (dev ? ' fill-opacity=".5" stroke="' + COL.purple + '"' : '') + '/>';
      const v = ch.num[i];
      if (v) {
        const nine = Math.abs(v) === 9;
        const f = nine ? fs * 1.25 : fs;
        const yy = v < 0 ? y(ch.l[i]) + f + 2 : y(ch.h[i]) - 4;
        const colN = v < 0 ? (nine ? COL.buyL : COL.buy) : (nine ? COL.sellL : COL.sell);
        if (nine) g += '<circle cx="' + x.toFixed(1) + '" cy="' + (yy - f * 0.36).toFixed(1) + '" r="' + (f * 0.74).toFixed(1) + '" fill="' + (v < 0 ? 'rgba(38,166,154,.22)' : 'rgba(239,83,80,.2)') + '" stroke="' + colN + '"/>';
        g += '<text x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" font-size="' + f.toFixed(1) + '" font-weight="' + (nine ? 900 : 650) + '" fill="' + colN + '" text-anchor="middle">' + Math.abs(v) + '</text>';
      }
      const cv = ch.cd[i];
      if (cv || ch.cdf[i]) {
        const lab = cv ? Math.abs(cv) : '+';
        const t13 = Math.abs(cv) === 13;
        const below = cv ? cv < 0 : (ch.num[i] <= 0);
        const off = (v && ((v < 0) === below)) ? fs * 1.35 + 4 : 2;
        const yy = below ? y(ch.l[i]) + off + fs * (t13 ? 1.3 : 0.95) : y(ch.h[i]) - off - 3;
        g += '<text x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" font-size="' + (fs * (t13 ? 1.15 : 0.82)).toFixed(1) + '" font-weight="' + (t13 ? 900 : 600) + '" fill="' + (t13 ? COL.goldL : '#b8913a') + '" text-anchor="middle">' + lab + '</text>';
      }
    }
    g += '<rect id="hov" x="0" y="' + top + '" width="' + bw.toFixed(1) + '" height="' + (H - top - bot) + '" fill="rgba(255,255,255,.05)" style="display:none"/>';
    el.innerHTML = '<svg viewBox="0 0 ' + Wd + ' ' + H + '" width="' + Wd + '" height="' + H + '">' + g + '</svg>';
    const svg = el.querySelector('svg'), hov = el.querySelector('#hov');
    const move = ev => {
      const rc = svg.getBoundingClientRect();
      const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rc.left;
      const i = Math.floor(px / rc.width * Wd / bw);
      if (i < 0 || i >= n) return hideTip();
      hov.setAttribute('x', (i * bw).toFixed(1)); hov.style.display = '';
      const v = ch.num[i], cv = ch.cd[i];
      const lab = tf === 'W' ? 'Week ending ' + fdy(ch.d[i]) : tf === 'M' ? MONL[pd(ch.d[i]).m - 1] + ' ' + pd(ch.d[i]).y : fdy(ch.d[i]);
      showTip(ev, '<b>' + lab + (ch.done[i] ? '' : ' (so far)') + '</b><br>High ' + money(ch.h[i]) + ' · Low ' + money(ch.l[i]) + '<br>Close ' + money(ch.c[i]) +
        ' <span class="' + cls(ch.c[i] / ch.o[i] - 1) + '">' + pc(ch.c[i] / ch.o[i] - 1) + '</span>' +
        (v ? '<br>' + (v < 0 ? 'Down-count ' : 'Up-count ') + Math.abs(v) + ' of 9' : '') + (cv ? '<br>13-countdown ' + Math.abs(cv) + ' of 13' : '') +
        (ch.cdf[i] ? '<br>13 deferred (+)' : ''));
    };
    svg.addEventListener('mousemove', move);
    svg.addEventListener('touchstart', move, { passive: true });
    svg.addEventListener('mouseleave', () => { hov.style.display = 'none'; hideTip(); });
  }


  function gexSection(G, r) {
    const gm = B.gex || {};
    const R = G.ranks || {};
    const LN = [['strong|any', 'Strongest'], ['sticky|any', 'Sticky'], ['build|any', 'Building'], ['far|any', 'Far magnet'], ['pin|any', 'Pinning']];
    const chips = pre => LN.map(([key, lab]) => { const v = R[pre + key]; return v ? '<span class="chip ' + (pre ? 'r' : 'y') + '">' + (pre ? '− ' : '') + lab + ' <b>#' + v[0] + '</b><small> of ' + v[1] + '</small></span>' : ''; }).join('');
    let h = '<section class="sec gexsec"><div class="sech"><span class="st"><span class="badge y">GEX</span>King GEX levels</span>' +
      '<span class="sd">King GEX Tracker · ' + fdy(G.d) + ' map · $ = net gamma exposure per 1% move · % from the ' + fd(r.last) + ' close</span></div><div class="gxg">';
    h += qualityTile(G, gm) + '<div class="cl">' + chips('') + chips('neg:') + '</div></div>';
    if (G.k != null) {
      h += '<div class="gxt king"><div class="t">King · biggest + cell</div><div class="v">' + strike(G.k) + ' <i class="' + cls(G.kd) + '">' + (G.kd >= 0 ? '▲ ' : '▼ ') + pcu(G.kd) + '</i></div>' +
        '<div class="s">' + fdy(G.kx) + (G.kdte != null ? ' (' + G.kdte + ' days)' : '') + ' · <b>' + gusd(G.kv) + '</b>' + (G.kshare != null ? ' · ' + pcu(G.kshare, 0) + ' of the map' : '') +
        (G.kdom != null ? ' · ' + G.kdom.toFixed(1) + '× the next cell' : '') + (G.kh ? ' · held ' + G.kh + (G.kh === 1 ? ' session' : ' sessions') : '') + '</div>' + kingSpark(G) + '</div>';
    }
    if (G.n != null) {
      h += '<div class="gxt negk"><div class="t">Negative king · biggest − cell</div><div class="v">' + strike(G.n) + ' <i class="' + cls(G.nd) + '">' + (G.nd >= 0 ? '▲ ' : '▼ ') + pcu(G.nd) + '</i></div>' +
        '<div class="s">' + fdy(G.nx) + ' · <b>' + gusd(G.nv) + '</b>' + (G.nshare != null ? ' · ' + pcu(G.nshare, 0) + ' of the map' : '') + (G.ndom != null ? ' · ' + G.ndom.toFixed(1) + '× the next' : '') +
        (G.nh ? ' · held ' + G.nh + (G.nh === 1 ? ' session' : ' sessions') : '') + (G.nb ? ' · ' + cnt(G.nb[0], 'put') + ' this week' + (G.nb[0] > 0 && G.nb[1] != null ? ' (' + pcu(G.nb[1], 0) + ' new)' : '') : '') +
        (G.nqr ? '<br>GEX quality <b>#' + G.nqr + '</b> of ' + (gm.nneg || '—').toLocaleString() + ' − kings (' + G.nq + ' of 100)' : '') + '</div></div>';
    }
    let readWord = 'Map read';
    h += '<div class="gxt flip"><div class="t">Flip · zero gamma</div><div class="v">' + (G.fl != null ? strike(G.fl) + ' <i class="' + cls(G.fd) + '">' + pc(G.fd) + '</i>' : '<small>none</small>') + '</div>' +
      '<div class="s">' + (G.set ? readWord + ' <b>' + (SETUP[G.set] || esc(G.set)) + '</b>' : '') + (G.fl != null ? (G.set ? ' · ' : '') + 'price ' + ((PUB ? G.fd <= 0 : r.close >= G.fl) ? 'above' : 'below') + ' the flip' : '') +
      (G.res ? '<br>Call wall <b>' + strike(G.res[0]) + '</b>' : '') + (G.sup ? ' · put support <b>' + strike(G.sup[0]) + '</b>' : '') + (G.air ? ' · air pocket <b>' + strike(G.air[0]) + '</b>' : '') + '</div></div>';
    h += '</div>';
    h += '<div class="gxg2">' + pileTile(G, r) + skewTile(G) + '</div>';
    h += buildsHTML(G);
    if (G.lv && G.lv.length) h += levelsHTML(G, r);
    return h + '</section>';
  }

  function pileTile(G, r) {
    const p = G.pile;
    let h = '<div class="gxt pile"><div class="t">Pile · biggest + GEX band</div>';
    if (!p) return h + '<div class="v"><small>no pile on this map</small></div></div>';
    const c = p.c != null ? p.c : (p.lo + p.hi) / 2, d = PUB ? p.cd : (r.close ? c / r.close - 1 : null);
    return h + '<div class="v">' + band(p) + ' <i class="' + cls(d) + '">' + (d >= 0 ? '▲ ' : '▼ ') + pcu(d) + '</i></div>' +
      '<div class="s"><b>' + gusd(p.v) + '</b>' + (p.share != null ? ' · ' + pcu(p.share, 0) + ' of the + map' : '') + (p.n ? ' · ' + p.n + (p.n === 1 ? ' strike' : ' strikes') : '') +
      (p.ex ? ' · mostly ' + fdy(p.ex) + (p.exs != null ? ' (' + pcu(p.exs, 0) + ')' : '') : '') + (p.kin ? ' · the king sits inside it' : ' · the king sits outside it') +
      '<br>Pile rank <b>#' + p.rank + '</b> of ' + ((B.gex || {}).npile || '—').toLocaleString() + ' (' + p.q + ' of 100)' + (p.dte != null ? ' · ' + p.dte + ' days to its main expiry' : '') + '</div></div>';
  }

  function skewTile(G) {
    const k = G.skew, sm = B.skew || {};
    let h = '<div class="gxt skw"><div class="t">Skew · one-sided open interest</div>';
    if (!k) return h + '<div class="v"><small>no Skew Tracker read</small></div></div>';
    h += '<div class="skt">';
    ['1d', '1w', '2w', '1m'].forEach(w => {
      const x = k[w];
      if (!x) return;
      const wm = (sm.windows || {})[w] || {}, n = x[0] === 'C' ? wm.nC : wm.nP;
      const lab = x[1] ? '<b class="' + (x[0] === 'C' ? 'pos' : 'neg') + '">' + (x[0] === 'C' ? 'Calls' : 'Puts') + ' #' + x[1] + '</b><small> of ' + (n || '—') + '</small>'
        : (x[0] === 'C' ? 'Calls leaning' : x[0] === 'P' ? 'Puts leaning' : 'Two-sided') + '<small> · unlisted</small>';
      h += '<div class="skr' + (w === (sm.main || '1w') ? ' main' : '') + '"><span class="sw">' + w.toUpperCase() + '</span><span class="sl2">' + lab + '</span>' +
        '<span class="sn">' + kn(x[2]) + ' C / ' + kn(x[3]) + ' P</span><span class="sp ' + cls(x[4]) + '">' + pc(x[4], x[4] != null && Math.abs(x[4]) < 0.1 ? 1 : 0) + '</span></div>';
    });
    return h + '</div><div class="s">Net contracts opened over each window · tilt = net calls minus net puts against the whole book · Skew Tracker, settle ' + fd(sm.latest) + '</div></div>';
  }


  function partText(k, G) {
    const P = G.kparts || {};
    if (k === 'size') return (G.kshare != null ? pcu(G.kshare, 0) + ' of the map' : '—') + (G.kdom != null ? ' · ' + G.kdom.toFixed(1) + '× the next cell' : '') + ' · ' + gusd(G.kv);
    if (k === 'anchor') {
      const b = G.kb, x = G.kbx;
      const bt = !b ? (G.ca != null ? 'options re-listed this week (split or strike adjustment)' : 'no open-interest history')
        : (b[0] > 0 ? '<b>' + cnt(b[0], 'call') + '</b> this week' + (x ? ' (' + x[0].toLocaleString() + ' → ' + x[1].toLocaleString() + ')' : '') + (b[1] != null ? ' · ' + pcu(b[1], 0) + ' of them new' : '')
          : (b[0] < 0 ? cnt(b[0], 'call') + ' this week' : 'no new calls this week'));
      const ht = (G.kh || 0) + (G.kh === 1 ? ' session' : ' sessions') + ' on ' + strike(G.k) + (G.since ? ' since ' + fd(G.since) : '');
      return P.via === 'built' ? '<b>Built</b> · ' + bt + '<br>held ' + ht : '<b>Held</b> ' + ht + '<br>' + bt;
    }
    if (k === 'reach') {
      if (P.reach === 0 && G.ko === 0) return 'king at or under the price: nothing above to pull toward';
      let t = pc(G.kd) + ' from the close' + (P.sd != null ? ' · <b>' + P.sd.toFixed(2) + ' sd</b> of the move to ' + fd(G.kx) : '');
      return t;
    }
    if (k === 'time') {
      let t = '<b>' + (G.kdte != null ? G.kdte : '—') + '</b> days to ' + fdy(G.kx) + (P.time < 100 ? ' · counts less as expiry nears' : '');
      return t;
    }
    return '';
  }

  function qualityTile(G, gm) {
    if (G.k == null || G.kq == null) return '<div class="gxt rank"><div class="t">GEX quality</div><div class="v"><small>no + king to rank</small></div>';
    const P = G.kparts || {};
    let h = '<div class="gxt rank"><div class="t">GEX quality · + king</div><div class="v">#' + G.kqr + ' <small>of ' + (gm.npos || '—').toLocaleString() + '</small></div>' +
      '<div class="bigsb"><i style="width:' + Math.max(3, Math.min(100, G.kq)) + '%"></i></div><div class="sbl">Quality <b>' + G.kq + '</b> of 100</div>';
    if (!G.kparts) return h + '<div class="sbl" style="margin-top:8px">Blends the king’s size, how solid it is (held on its strike or opened this week), whether it sits above the price within reach, and the time it has left.</div>';
    h += '<div class="qrows">';
    (gm.parts || []).forEach(k => {
      const v = P[k], lab = k === 'anchor' ? (P.via === 'built' ? 'Built' : 'Held') : (PL[k] || k);
      h += '<div class="qrow"><span class="ql">' + esc(lab) + '</span><span class="qb"><i style="width:' + (v == null ? 0 : Math.max(4, Math.min(100, v))) + '%"></i></span>' +
        '<span class="qv">' + (v == null ? '—' : v) + '</span><span class="qt">' + partText(k, G) + '</span></div>';
    });
    return h + '</div>';
  }

  function buildsHTML(G) {
    const bd = G.build;
    if (!bd) return '';
    const rows = bd.top || [], t = bd.tot || {};
    const mx = Math.max(1, ...rows.map(x => Math.abs(x[5] || 0)));
    const same = (K, e, k, x) => k != null && Math.abs(K - k) < 1e-6 && e === x;
    let src = 'open interest opened this week, through the ' + fd(bd.settle) + ' settle, priced as GEX at the ' + fd(G.d) + ' map’s price · Cboe open interest';
    let none = 'No large new contract this week.';
    let h = '<div class="lvl blt"><div class="lvh"><h3>Built this week</h3><span class="d">' + src + '</span></div>' +
      '<div class="btot"><span>Calls opened above the price <b class="pos">' + kn(t.ncu) + '</b> · ' + gusd(t.cu) + ' of new GEX</span><span>Puts opened below <b class="neg">' + kn(t.npd) + '</b> · ' + gusd(t.pd) + '</span></div>';
    if (!rows.length) return h + '<div class="empty">' + none + '</div></div>';
    h += '<div class="brows"><div class="brh"><span>Contract</span><span>Added</span><span>Open now</span><span>New</span><span>New GEX</span><span>From price</span></div>';
    rows.forEach(x => {
      const cp = x[0], K = x[1], e = x[2], add = x[3], oi = x[4], nw = x[5], dd = x[6];
      const isK = cp === 'C' && same(K, e, G.k, G.kx), isN = cp === 'P' && same(K, e, G.n, G.nx);
      h += '<div class="brw' + (isK ? ' king' : '') + '"><span class="bc"><b>' + strike(K) + cp + '</b> ' + fdx(e) + (isK ? ' <em>King</em>' : (isN ? ' <em class="n">− King</em>' : '')) + '</span>' +
        '<span class="ba ' + (cp === 'C' ? 'pos' : 'neg') + '">' + kn(add) + '</span><span class="bo">' + (oi || 0).toLocaleString() + '</span><span class="bn">' + pcu(oi ? add / oi : null, 0) + '</span>' +
        '<span class="bg"><span class="bb"><i style="width:' + (Math.abs(nw) / mx * 100).toFixed(1) + '%;background:' + (isK ? COL.gold : (nw >= 0 ? COL.buy : COL.sell)) + '"></i></span><b class="' + (nw >= 0 ? 'pos' : 'neg') + '">' + gusd(nw) + '</b></span>' +
        '<span class="bp ' + cls(dd) + '">' + pc(dd) + '</span></div>';
    });
    return h + '</div></div>';
  }

  function kingSpark(G) {
    const s = (G.spark || []).filter(p => p[1] != null && p[2] != null);
    if (s.length < 3) return '';
    const W = 300, H = 64, l = 4, rr = 4, t = 8, b = 14;
    const vals = s.flatMap(p => [p[1], p[2]]);
    let mn = Math.min(...vals), mx = Math.max(...vals);
    const pad = (mx - mn) * 0.1 || mx * 0.02; mn -= pad; mx += pad;
    const x = i => l + i / (s.length - 1) * (W - l - rr), y = v => t + (mx - v) / (mx - mn) * (H - t - b);
    let dk = '', dp = '';
    s.forEach((p, i) => {
      dk += (i ? 'H' + x(i).toFixed(1) + 'V' : 'M' + x(i).toFixed(1) + ' ') + y(p[1]).toFixed(1);
      dp += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[2]).toFixed(1);
    });
    return '<div class="ks"><svg viewBox="0 0 ' + W + ' ' + H + '"><path d="' + dk + '" fill="none" stroke="' + COL.gold + '" stroke-width="2"/><path d="' + dp + '" fill="none" stroke="' + COL.text + '" stroke-width="1.4" opacity=".8"/>' +
      '<text x="' + l + '" y="' + (H - 2) + '" font-size="10" fill="' + COL.muted + '">' + esc(s[0][0]) + '</text><text x="' + (W - rr) + '" y="' + (H - 2) + '" font-size="10" fill="' + COL.muted + '" text-anchor="end">' + esc(s[s.length - 1][0]) + '</text></svg>' +
      '<div class="kl"><span style="color:#E3B341">━</span> king strike by session <span style="color:#D1D4DC">━</span> close</div></div>';
  }

  function levelsHTML(G, r) {
    const lv = G.lv.slice(0, 12);
    const mx = Math.max(...lv.map(x => Math.abs(x[1]))) || 1;
    const near = (a, b) => b != null && Math.abs(a - b) < 1e-6;
    const tags = s => {
      const t = [];
      if (near(s, G.k)) t.push('King');
      if (near(s, G.n)) t.push('− King');
      if (G.res && near(s, G.res[0])) t.push('Call wall');
      if (G.sup && near(s, G.sup[0])) t.push('Put support');
      if (G.air && near(s, G.air[0])) t.push('Air pocket');
      return t;
    };
    let h = '<div class="lvl"><div class="lvh"><h3>GEX levels ranked by size</h3><span class="d">the ' + lv.length + ' biggest strikes by net GEX on the ' + fd(G.d) + ' map, all expiries 2+ days out</span></div><div class="lvrows" style="--rows:' + Math.ceil(lv.length / 2) + '">';
    lv.forEach((x, i) => {
      const s = x[0], v = x[1], t = tags(s), pos = v >= 0;
      const col = near(s, G.k) ? COL.gold : (pos ? COL.buy : COL.sell);
      const dd = PUB ? (G.lvd || [])[i] : s / r.close - 1;
      h += '<div class="lvr' + (near(s, G.k) ? ' king' : '') + '"><span class="li">' + (i + 1) + '</span><span class="ls">' + strike(s) + '</span><span class="lp ' + cls(dd) + '">' + pc(dd) + '</span>' +
        '<span class="lb"><i style="width:' + (Math.abs(v) / mx * 100).toFixed(1) + '%;background:' + col + '"></i></span><span class="lv ' + (pos ? 'pos' : 'neg') + '">' + gusd(v) + '</span><span class="lt">' + t.join(' · ') + '</span></div>';
    });
    return h + '</div></div>';
  }

  function showTip(ev, html) {
    tip.innerHTML = html; tip.style.display = 'block';
    const x = ev.touches ? ev.touches[0].clientX : ev.clientX, yv = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const w = tip.offsetWidth;
    tip.style.left = Math.min(window.innerWidth - w - 8, x + 14) + 'px';
    tip.style.top = (yv + 16) + 'px';
  }
  function hideTip() { tip.style.display = 'none'; }
  window.addEventListener('scroll', hideTip, { passive: true });

  function historyHTML(P, tf, sym) {
    if (tf === 'D') return '';
    const hz = tf === 'W' ? ['4', '13', '26', '52'] : ['1', '3', '6', '12'];
    const u = tf === 'W' ? 'w' : 'm';
    const list = (P.hist[tf] || []).filter(e => e.k === 'B9' || e.k === 'S9' || e.k === 'B13' || e.k === 'S13').slice().reverse();
    if (!list.length) return '';
    const fw = !!(list[0] && list[0].f);
    const b9 = fw ? list.filter(e => e.k === 'B9' && e.f[hz[1]] != null) : [];
    const up = b9.filter(e => e.f[hz[1]] > 0).length;
    const med = b9.length ? b9.map(e => e.f[hz[1]]).sort((a, b) => a - b)[Math.floor(b9.length / 2)] : null;
    let h = '<section class="sec hist"><div class="sech"><span class="st">Every ' + (tf === 'W' ? 'weekly' : 'monthly') + ' 9 and 13 on ' + esc(sym) + '</span>' +
      '<span class="sd">' + (b9.length ? 'Down 9s: ' + hz[1] + u + ' later up in <b>' + up + ' of ' + b9.length + '</b>, middle result ' + pc(med) : '') + '</span></div>' +
      '<div class="tblwrap"><table class="t"><thead><tr><th>' + (tf === 'W' ? 'Week ending' : 'Month') + '</th><th>Signal</th><th class="n">' + (PUB ? 'Close vs today' : 'Close') + '</th>' +
      (fw ? hz.map(k => '<th class="n">' + k + u + ' later</th>').join('') + '<th class="n">' + (tf === 'W' ? 'Lowest / highest in 13w' : 'in 3m') + '</th>' : '') + '</tr></thead><tbody>';
    list.forEach(e => {
      const lab = { B9: 'Down 9' + (e.perf ? ' · perfected' : ''), S9: 'Up 9' + (e.perf ? ' · perfected' : ''), B13: 'Down 13', S13: 'Up 13' }[e.k];
      h += '<tr><td>' + (tf === 'W' ? fdy(e.d) : fmo(e.d)) + '</td><td><span class="chip ' + (e.k[0] === 'B' ? 'g' : 'r') + '">' + lab + '</span></td><td class="n">' + money(e.px) + '</td>' +
        (fw ? hz.map(k => '<td class="n ' + cls(e.f[k]) + '">' + pc(e.f[k]) + '</td>').join('') + '<td class="n ' + cls(e.x) + '">' + pc(e.x) + '</td>' : '') + '</tr>';
    });
    return h + '</tbody></table></div></section>';
  }




  function last9(st) {
    const e = st.b9 && (!st.s9 || st.b9.ago <= st.s9.ago) ? st.b9 : st.s9;
    return e ? -e.ago : null;
  }

  function renderTable() {
    const rows = live(B.rows).filter(inUni);
    const [key, dir] = S.tsort;
    const val = r => {
      const g = r.gx || {};
      switch (key) {
        case 'sym': return r.sym;
        case 'w': return (r.W || {}).nl || -(r.W || {}).sl || 0;
        case 'm': return (r.M || {}).nl || -(r.M || {}).sl || 0;
        case 'w9': return last9(r.W || {});
        case 'm9': return last9(r.M || {});
        case 'off': return r.off == null ? 0 : r.off;
        case 'wchg': return r.wchg == null ? 0 : r.wchg;
        case 'kr': return g.kqr ? -g.kqr : null;
        case 'kb': return g.kb ? g.kb[0] : null;
        case 'pl': return g.pl ? -g.pl[3] : null;
        case 'sk': return r.sk && r.sk[1] ? -r.sk[1] : null;
        case 'kd': return g.kd == null ? null : g.kd;
        case 'fd': return g.fd == null ? null : g.fd;
        default: return liq(r);
      }
    };
    rows.sort((a, b) => { const x = val(a), y = val(b); if (x == null || y == null) return (x == null) - (y == null); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
    const cnt = (st, side) => { if (!st) return '—'; const n = side === 'B' ? st.nl : st.sl; return n ? Math.min(n, 9) + (n > 9 ? '+' : '') : ''; };
    const cell = st => { if (!st) return '<td>—</td>'; if (st.nl) return '<td class="pos">' + cnt(st, 'B') + ' down</td>'; if (st.sl) return '<td class="neg">' + cnt(st, 'S') + ' up</td>'; return '<td style="color:#5D606B">0</td>'; };
    let h = '<section class="hero"><h1>Every name, every count</h1><p class="lede">Weekly and monthly counts as if the unfinished bar closed today, with each name’s King GEX read. Click a column to sort; click a row for the chart.</p></section>';
    h += '<div class="ctrls"><div class="seg" id="uni">' + ['all', 'spx', 'ndx', 'rui', 'iwm', 'etf', 'wl'].map(u => '<a data-u="' + u + '" class="' + (S.uni === u ? 'on' : '') + '">' + (u === 'all' ? 'All' : esc(B.unis[u])) + '</a>').join('') + '</div></div>';
    const th = (k, lab, n) => '<th class="' + (n ? 'n' : '') + '" data-k="' + k + '">' + lab + (key === k ? (dir < 0 ? ' ↓' : ' ↑') : '') + '</th>';
    h += '<div class="tblwrap"><table class="t"><thead><tr>' + th('sym', 'Ticker') + '<th>Name</th>' + th('w', 'Weekly') + th('m', 'Monthly') + th('w9', 'Last weekly 9') + th('m9', 'Last monthly 9') +
      '<th>13-count</th>' + th('kr', 'GEX rank', 1) + th('kd', 'King', 1) + th('kb', 'Built this week', 1) + th('pl', 'Pile', 1) + th('sk', 'Skew ' + ((B.skew || {}).main || '1w').toUpperCase(), 1) + th('fd', 'Flip', 1) + th('off', 'Off high', 1) + th('wchg', 'This week', 1) + th('dv', PUB ? 'Most traded' : '$ volume/day', 1) + '</tr></thead><tbody>';
    rows.slice(0, 600).forEach(r => {
      const w = r.W || {}, m = r.M || {}, g = r.gx || {};
      const e9 = (st, t) => { const e = st.b9 && (!st.s9 || st.b9.ago <= st.s9.ago) ? ['down', st.b9] : (st.s9 ? ['up', st.s9] : null); return e ? (e[1].ago === -1 ? 'forming (' + e[0] + ')' : (t === 'W' ? fd(e[1].d) : fmo(e[1].d)) + ' ' + e[0] + (e[1].perf ? ' ✓' : '')) : ''; };
      const cd = [w.cd, m.cd].map((c, i) => c ? (i ? 'M ' : 'W ') + c.nl + '/13 ' + (c.side === 'B' ? 'down' : 'up') : '').filter(Boolean).join(' · ');
      h += '<tr class="cl" data-sym="' + esc(r.sym) + '"><td><b>' + esc(r.sym) + '</b></td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">' + esc(r.name || '') + '</td>' + cell(w) + cell(m) +
        '<td>' + e9(w, 'W') + '</td><td>' + e9(m, 'M') + '</td><td>' + cd + '</td>' +
        '<td class="n">' + (g.kqr ? '<span class="rkt">#' + g.kqr + '</span>' : '<span style="color:#5D606B">—</span>') + '</td>' +
        '<td class="n">' + (g.k != null ? strike(g.k) + ' <span class="' + cls(g.kd) + '">' + pc(g.kd) + '</span>' : '') + '</td>' +
        '<td class="n">' + (g.kb ? '<span class="' + (built(gk(r, 'B')) ? 'bld' : (g.kb[0] < 0 ? 'neg' : '')) + '">' + kn(g.kb[0]) + '</span>' + (g.kb[0] > 0 && g.kb[1] != null ? ' <small>' + pcu(g.kb[1], 0) + ' new</small>' : '') : '') + '</td>' +
        '<td class="n">' + (g.pl ? '<span class="rkt">#' + g.pl[3] + '</span> ' + band({ lo: g.pl[0], hi: g.pl[1] }) + ' <span class="' + cls(g.pl[5]) + '">' + pc(g.pl[5], 0) + '</span>' : '') + '</td>' +
        '<td class="n">' + (r.sk && r.sk[1] ? '<b class="' + (r.sk[0] === 'C' ? 'pos' : 'neg') + '">' + (r.sk[0] === 'C' ? 'Calls' : 'Puts') + ' #' + r.sk[1] + '</b>' : '') + '</td>' +
        '<td class="n">' + (g.fl != null ? strike(g.fl) + ' <span class="' + cls(g.fd) + '">' + pc(g.fd) + '</span>' : '') + '</td>' +
        '<td class="n">' + pc(r.off, 0) + '</td><td class="n ' + cls(r.wchg) + '">' + pc(r.wchg) + '</td><td class="n">' + (PUB ? 'top ' + Math.max(1, Math.round(100 - (r.lq || 0))) + '%' : big(r.dv)) + '</td></tr>';
    });
    h += '</tbody></table></div>' + (rows.length > 600 ? '<div class="note">First 600 of ' + rows.length + ' by the current sort.</div>' : '');
    app.innerHTML = h;
    app.querySelectorAll('#uni a').forEach(a => a.onclick = () => { S.uni = a.dataset.u; renderTable(); });
    app.querySelectorAll('th[data-k]').forEach(t => t.onclick = () => { const k = t.dataset.k; S.tsort = [k, S.tsort[0] === k ? -S.tsort[1] : (k === 'sym' ? 1 : -1)]; renderTable(); });
    app.querySelectorAll('tr[data-sym]').forEach(tr => tr.onclick = () => { location.hash = 's=' + tr.dataset.sym; });
  }


  function defsHTML(side) {
    const gm = B.gex || {};
    return '<div class="defs">' +
      '<div class="def"><b>The 9 (TD Setup).</b> Each bar is compared with the close four bars earlier. ' + (side === 'B' ? 'Nine lower closes in a row print 1–9 under the candles' : 'Nine higher closes in a row print 1–9 over the candles') +
      '; one bar that fails resets the count. Like moomoo, counts that break before 9 disappear; the run still going on the newest bar is shown.</div>' +
      '<div class="def"><b>Perfected.</b> ' + (side === 'B' ? 'The low of bar 8 or 9 is at or under the lows of bars 6 and 7' : 'The high of bar 8 or 9 is at or over the highs of bars 6 and 7') +
      ' — the 9 is at the extreme of the run. <b>TDST</b> is the run’s ' + (side === 'B' ? 'highest true high: a close above it ends the down-trend read' : 'lowest true low: a close under it ends the up-trend read') + '.</div>' +
      '<div class="def"><b>The 13 (TD Countdown).</b> Starts at the 9: bars that close ' + (side === 'B' ? 'at or under the low' : 'at or over the high') + ' two bars earlier, not necessarily in a row. The 13th must also ' +
      (side === 'B' ? 'trade at or under' : 'trade at or over') + ' the close of countdown bar 8 (otherwise “+”, deferred). Cancelled by an opposite 9 or by trading past TDST.</div>' +
      gexDefs(side, gm) + '</div>';
  }


  function gexDefs(side, gm) {
    const nk = (side === 'B' ? gm.npos : gm.nneg), want = side === 'B' ? 'call' : 'put', win = ((B.skew || {}).main || '1w').toUpperCase();
    const head = '<div class="def"><b>King GEX.</b> From the King GEX Tracker' + (gm.span || gm.session ? ' (' + mapDays(gm) + ' maps)' : '') + ': the <b>king</b> is the biggest positive gamma cell (one strike and expiry, 2+ days out), the <b>negative king</b> the biggest negative one, the <b>flip</b> the zero-gamma price. ' +
      '<b>#</b> is the place in GEX quality among ' + (nk ? nk.toLocaleString() + ' current' : 'all') + (side === 'B' ? ' kings' : ' negative kings') + '. ';
    const tail = '“Rank by King GEX” puts ' + (side === 'B' ? 'kings above the price' : 'negative kings under the price') + ' first.</div>';
    let q = 'GEX quality blends the king’s <b>size</b> (its share of the map, against the next cell, against dollar volume and in plain dollars), how <b>solid</b> it is (sessions held on the strike, or how much of it was opened this week), whether it sits on the useful side of the price <b>within reach</b> of the move to expiry, and the <b>time</b> it has left. ';
    let pile = '<div class="def"><b>Pile GEX.</b> The King GEX Tracker’s pile: the narrow band of strikes that holds the most positive GEX across every expiry. Ranked among ' + (gm.npile ? gm.npile.toLocaleString() + ' current' : 'all') + ' piles on its size, discounted when its main expiry is close. “Rank by Pile GEX” puts piles ' + (side === 'B' ? 'above' : 'under') + ' the price first.</div>';
    let skew = '<div class="def"><b>Skew.</b> The Skew Tracker’s ' + win + ' ' + want + '-skew list: names whose net one-sided open-interest build is biggest against their own book. “Rank by Skew” puts listed names first, by place; the rest keep the DeMark order. <b>Skew × Pile</b> combines the skew place and the pile place, for listed names that have a GEX pile.</div>';
    return head + q + tail + pile + skew;
  }

  load();
})();
