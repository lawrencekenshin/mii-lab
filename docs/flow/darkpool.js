'use strict';




window.DP = (() => {
  const PUR = '#b388ff', PUR_D = '#7e57c2', HOT = '#ff40ff', LOWC = '#26c6da', TEAL = '#80cbc4', MUTE = '#9598a1';
  const FRAME = { color: '#ab47bc', fill: '#2a163a40' };
  const SFRAME = { color: '#29b6f6', fill: '#0f2a3a40' };
  const TFRAME = { color: '#26a69a', fill: '#0f2e2a40' };
  const cache = {};
  let cur = null, curSym = null, volTot = null, volOff = null, aligned = null, hover = null, pollT = null;
  const day = t => new Date(t * 1000).toISOString().slice(0, 10);
  const pctS = v => (v == null ? '—' : (100 * v).toFixed(v < 0.1 ? 1 : 0) + '%');
  const pct1 = v => (v == null ? '—' : (100 * v).toFixed(1) + '%');
  const r2 = v => (v == null ? '—' : v.toFixed(2));
  const shs = v => (v == null ? '—' : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(v));
  const md = s => { const d = new Date(s + 'T12:00:00Z'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); };

  async function get(s) {
    const c = cache[s];
    if (c && Date.now() - c.t < 300e3) return c.data;
    try {
      cache[s] = { t: Date.now(), data: await window.FLOW_STATIC.get(s) };
    } catch (e) {
      if (!c || !c.data || c.data.error) cache[s] = { t: Date.now(), data: { error: e.status === 404 ? `no flow data for ${s} on this page` : 'flow data unavailable' } };
    }
    return cache[s].data;
  }


  function align(times, bars, D) {
    const n = times.length, off = Array(n).fill(null), sh = Array(n).fill(null), fl = Array(n).fill(null), nd = Array(n).fill(0);
    const vol = new Map(bars.map(b => [b[0], b[5]]));
    let k = 0;
    D.d.forEach((ds, i) => {
      const ts = Date.parse(ds + 'T20:00:00Z') / 1000;
      while (k + 1 < n && times[k + 1] <= ts) k++;
      if (!n || times[k] > ts) return;
      if (tf === '1D' && day(times[k]) !== ds) return;
      off[k] = (off[k] || 0) + D.tot[i]; sh[k] = (sh[k] || 0) + D.sh[i]; nd[k]++;
      if (D.flags[i] && D.flags[i].length) fl[k] = (fl[k] || []).concat(D.flags[i]);
    });
    const v = times.map(t => vol.get(t) ?? null);
    const pct = off.map((o, i) => (o != null && v[i] ? Math.min(1, o / v[i]) : null));
    const sr = off.map((o, i) => (o ? sh[i] / o : null));
    if (tf !== '1D') {
      const U = new Map(((block(D) || {}).fl || []).map(r => [r[0], r[1]]));
      for (let i = 0; i < n; i++) fl[i] = U.get(day(times[i])) || null;
    }

    const ats = Array(n).fill(null), W = D.weekly && D.weekly.rows;
    if (W && W.length) {
      const wk = new Map(W.map(r => [r.w, r]));
      if (tf === '1D') times.forEach((t, i) => {
        const d = new Date(t * 1000), m = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5), r = wk.get(m.toISOString().slice(0, 10));
        if (r && r.ats_pct != null) ats[i] = r.ats_pct;
      });
      else {
        let j = 0; const acc = Array(n).fill(null).map(() => [0, 0]);
        W.forEach(r => {
          const ts = Date.parse(r.w + 'T20:00:00Z') / 1000;
          while (j + 1 < n && times[j + 1] <= ts) j++;
          if (!n || times[j] > ts || !r.vol) return;
          acc[j][0] += r.ats; acc[j][1] += r.vol;
        });
        acc.forEach((a, i) => { if (a[1]) ats[i] = a[0] / a[1]; });
      }
    }
    return { times, off, sh, fl, v, pct, sr, ats, nd };
  }
  const rollMean = (a, n) => a.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0, c = 0; for (let j = i - n + 1; j <= i; j++) if (a[j] != null) { s += a[j]; c++; }
    return c >= Math.ceil(n * 0.8) ? s / c : null;
  });
  const lastIdx = a => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return i; return -1; };


  const block = D => (D && D.tf && D.tf[tf]) || null;
  function gridAt(t, B) {
    if (!B || !B.n) return null;
    const ds = t.map(day), i1 = ds.lastIndexOf(B.t1);
    if (i1 >= 0) return i1 - (B.n - 1);
    const i0 = ds.indexOf(B.t0);
    return i0 >= 0 ? i0 : null;
  }
  function kdjLines(L, off, n) {
    const K = Array(n).fill(null), Dl = Array(n).fill(null), J = Array(n).fill(null);
    if (L && off != null) L.k.forEach((_, j) => { const i = off + L.i + j; if (i >= 0 && i < n) { K[i] = L.k[j]; Dl[i] = L.d[j]; J[i] = L.j[j]; } });
    return { K, D: Dl, J };
  }
  const SHAREW = { heavy: ['HEAVY', HOT], light: ['LIGHT', LOWC], normal: ['NORMAL', MUTE] };
  const SRW = { high: ['HIGH', HOT], low: ['LOW', LOWC], normal: ['NORMAL', MUTE] };
  const KDJW = { up: ['K CROSSED UP', '#d1d4dc'], down: ['K CROSSED DOWN', '#d1d4dc'], rising: ['RISING', '#d1d4dc'], falling: ['FALLING', '#d1d4dc'] };
  const word = (code, hot, cold) => (code === 'hot' ? hot : code === 'cold' ? cold : KDJW[code] || ['—', MUTE]);
  const median = a => { const xs = a.filter(x => x != null).sort((p, q) => p - q); return xs.length ? xs[Math.floor(xs.length / 2)] : null; };

  function makeSections(P, bars, D) {
    const A = aligned = align(P.t || [], bars, D);
    const per = { '1D': 252, '3D': 84, '1W': 52, '2W': 26, '1M': 12 }[tf] || 52;
    const yr = a => a.slice(Math.max(0, a.length - per));
    const pct = A.pct.map(x => (x == null ? null : 100 * x)), ats = A.ats.map(x => (x == null ? null : 100 * x));
    const pAvg = rollMean(pct, tf === '1D' ? 20 : 4), sr5 = rollMean(A.sr, 5);
    const pMed = median(yr(pct)), sMed = median(yr(A.sr)), aMed = median(yr(ats));
    const iP = lastIdx(pct), iS = lastIdx(A.sr), iA = lastIdx(ats);
    const WR = (D.weekly && D.weekly.rows || []).filter(r => r.ats_pct != null), lastW = WR.length ? WR[WR.length - 1].w : null;
    const ST = (block(D) || {}).state || {}, sNow = sr5[iS], sPct = ST.rank ?? null;
    const hot = f => f && f.some(x => x === 'heavy' || x === 'share_hi');
    const unit = tf === '1D' ? 'day' : 'candle';
    const shareState = SHAREW[ST.share] || ['—', MUTE];
    const srState = SRW[ST.sr] || ['—', MUTE];
    const maxP = Math.max(10, ...pct.filter(x => x != null)), srv = A.sr.filter(x => x != null);
    const sLo = srv.length ? Math.max(0, Math.min(...srv) - 0.04) : 0.2, sHi = srv.length ? Math.min(1, Math.max(...srv) + 0.04) : 0.9;
    const share = {
      id: 'dpshare', card: 'purple', frame: FRAME, frame_color: FRAME.color,
      title: 'DARK POOL · ' + shareState[0],
      title_parts: [{ text: 'DARK POOL', color: PUR }, { text: ' · ' + shareState[0], color: shareState[1] }],
      lines: [
        { text: `Off-exch ${pct1(pct[iP] / 100)} of vol`, color: PUR },
        { text: `${tf === '1D' ? '20-day' : '4-bar'} avg ${pct1(pAvg[iP] / 100)} · med ${pct1(pMed / 100)}`, color: '#d1d4dc' },
        { text: `Dark pools only ${pct1(ats[iA] / 100)}${lastW ? ' · wk of ' + md(lastW) : ''}`, color: TEAL },
      ],
      series: [
        { id: 'dp_pct', kind: 'histogram', color: PUR_D + '99', values: pct, colors: A.fl.map(f => (hot(f) ? HOT : null)) },
        { id: 'dp_avg', kind: 'line', color: PUR, width: 2, values: pAvg },
        { id: 'dp_ats', kind: 'line', color: TEAL, width: 1, style: 'dotted', values: ats },
      ],
      guides: pMed != null ? [{ value: pMed, label: 'med ' + Math.round(pMed) + '%', color: '#d1d4dc8c', style: 'dashed' }] : [],
      lane_tags: [{ text: '% OF VOLUME', color: '#d1d4dcb8' }],
      scale: { min: 0, max: Math.ceil(maxP * 1.1), auto: false }, layout: { height_px: 84 },
    };
    const srs = {
      id: 'dpsr', card: 'purple', frame: FRAME, frame_color: FRAME.color,
      title: 'DP SHORT RATIO · ' + srState[0],
      title_parts: [{ text: 'DP SHORT RATIO', color: PUR }, { text: ' · ' + srState[0], color: srState[1] }],
      lines: [
        { text: `${unit === 'day' ? 'Day' : 'Bar'} ${r2(A.sr[iS])} · 5-bar ${r2(sNow)}`, color: PUR },
        { text: `med ${r2(sMed)} · pctile ${sPct ?? '—'}`, color: '#d1d4dc' },
      ],
      series: [
        { id: 'dp_sr', kind: 'dots', color: PUR_D, width: 2, values: A.sr,
          colors: A.fl.map(f => (f && f.includes('sr_hi') ? HOT : f && f.includes('sr_lo') ? LOWC : null)) },
        { id: 'dp_sr5', kind: 'line', color: PUR, width: 2, values: sr5 },
      ],
      guides: [{ value: 0.5, label: null, color: '#d1d4dc5c', style: 'dotted' }].concat(sMed != null ? [{ value: sMed, label: 'med', color: '#d1d4dc8c', style: 'dashed' }] : []),
      lane_tags: [{ text: 'SHORT ÷ OFF-EXCH', color: '#d1d4dcb8' }],
      scale: { min: sLo, max: sHi, auto: false }, layout: { height_px: 84 },
    };
    return [share, srs];
  }



  function kdjSection(id, name, kk, code, now, card, frame, tag, hot, cold) {
    const js = kk.J.filter(v => v != null), lo = Math.min(0, ...js), hi = Math.max(100, ...js), pad = (hi - lo) * 0.04;
    const st = word(code, hot, cold);
    const nn = i => (now && now[i] != null ? now[i] : '—');
    return {
      id, card, frame, frame_color: frame.color,
      title: name + ' · ' + st[0],
      title_parts: [{ text: name, color: card === 'purple' ? PUR : '#d1d4dc' }, { text: ' · ' + st[0], color: st[1] }],
      lines: [{ text: `J ${nn(0)}`, color: '#e040fb' }, { text: `K ${nn(1)}`, color: '#ff9800' }, { text: `D ${nn(2)}`, color: '#23b2ce' }],
      series: [{ id: id + '_d', kind: 'line', color: '#23b2ce', width: 1, values: kk.D }, { id: id + '_k', kind: 'line', color: '#ff9800', width: 1, values: kk.K },
               { id: id + '_j', kind: 'line', color: '#e040fb', width: 1, values: kk.J }],
      guides: [{ value: 80, label: null, color: '#d1d4dc8c', style: 'dashed' }, { value: 50, label: null, color: '#d1d4dc5c', style: 'dotted' },
               { value: 20, label: null, color: '#d1d4dc8c', style: 'dashed' }],
      lane_tags: [{ text: tag, color: '#d1d4dcb8' }],
      scale: { min: lo - pad, max: hi + pad, auto: false }, layout: { height_px: 90 },
    };
  }


  function makeShortSections(P, bars, D) {
    const A = aligned = align(P.t || [], bars, D);
    const per = { '1D': 252, '3D': 84, '1W': 52, '2W': 26, '1M': 12 }[tf] || 52;
    const yr = a => a.slice(Math.max(0, a.length - per));
    const sMed = median(yr(A.sr)), sr5 = rollMean(A.sr, 5), iS = lastIdx(A.sr);
    const dev = A.sr.map(v => (v == null || sMed == null ? null : v - sMed));
    const amp = Math.max(0.05, ...dev.filter(v => v != null).map(Math.abs));
    const B = block(D), ST = (B || {}).state || {}, NOW = (B || {}).now || {}, nT = (P.t || []).length, gOff = gridAt(P.t || [], B);
    const sNow = sr5[iS], sPct = ST.rank ?? null, st = SRW[ST.sr] || ['—', MUTE];
    const hist = {
      id: 'dpsrh', card: 'purple', frame: FRAME, frame_color: FRAME.color,
      title: 'SHORT RATIO · ' + st[0],
      title_parts: [{ text: 'SHORT RATIO', color: PUR }, { text: ' · ' + st[0], color: st[1] }],
      lines: [{ text: `${tf === '1D' ? 'Day' : 'Bar'} ${r2(A.sr[iS])} · med ${r2(sMed)}`, color: PUR },
              { text: `5-${tf === '1D' ? 'day' : 'bar'} ${r2(sNow)} · pctile ${sPct ?? '—'}`, color: '#d1d4dc' }],
      series: [{ id: 'dp_dev', kind: 'histogram', color: '#5d606b', values: dev,
                 colors: dev.map((v, i) => (v == null ? null : (A.fl[i] || []).includes('sr_hi') ? HOT : (A.fl[i] || []).includes('sr_lo') ? LOWC : v > 0 ? PUR : '#5d606b')) }],
      guides: [{ value: 0, label: 'med ' + r2(sMed), color: '#d1d4dc8c', style: 'dashed' }],
      lane_tags: [{ text: 'SHORT ÷ OFF-EXCH, VS MEDIAN', color: '#d1d4dcb8' }],
      scale: { min: -amp * 1.1, max: amp * 1.1, auto: false }, layout: { height_px: 90 },
    };
    const kd = kdjSection('dpkdj', 'KDJ OF SHORT RATIO', kdjLines(B && B.sr, gOff, nT), ST.k_sr, NOW.sr, 'purple', FRAME, 'KDJ',
                          ['SHORTING HOT', HOT], ['SHORTING COLD', LOWC]);
    const out = [hist, kd];
    const S = D.si;
    if (S && S.d && S.d.length) {
      const ts = S.d.map(x => Date.parse(x + 'T20:00:00Z') / 1000);
      let j = -1; const v = [], chg = [], jj = [];
      (P.t || []).forEach(t => {
        while (j + 1 < ts.length && ts[j + 1] <= t + 86400) j++;
        const ok = j >= 0 && t >= ts[0] - 86400 * 20;
        v.push(ok ? S.sh[j] / 1e6 : null); chg.push(j > 0 ? S.sh[j] - S.sh[j - 1] : 0); jj.push(ok ? j : -1);
      });
      const n = S.sh.length - 1, ch = n > 0 ? S.sh[n] / S.sh[n - 1] - 1 : null, mx = Math.max(...v.filter(x => x != null));
      out.push({
        id: 'dpsi', card: 'purple', frame: FRAME, frame_color: FRAME.color,
        title: 'SHORT INTEREST · TWICE A MONTH',
        title_parts: [{ text: 'SHORT INTEREST', color: PUR }, { text: ' · TWICE A MONTH', color: MUTE }],
        lines: [{ text: `${shs(S.sh[n])} short · ${md(S.d[n])}`, color: PUR },
                { text: `${ch == null ? '' : (ch >= 0 ? '+' : '') + Math.round(100 * ch) + '% vs prior'} · ${S.dtc[n]} days to cover`, color: '#d1d4dc' }],
        series: [{ id: 'si_sh', kind: 'histogram', color: PUR_D + 'cc', values: v, colors: chg.map(c => (c > 0 ? PUR_D + 'cc' : '#5d606bcc')) }],
        guides: [], lane_tags: [{ text: 'SHARES SHORT (M)', color: '#d1d4dcb8' }],
        scale: { min: 0, max: mx * 1.15, auto: false }, layout: { height_px: 80 },
      });

      const sk = S.kdj || { k: [], d: [], j: [] }, step = a => jj.map(k => (k >= 0 && a[k] != null ? a[k] : null));
      out.push(kdjSection('dpsikdj', 'KDJ OF SHORT INTEREST', { K: step(sk.k), D: step(sk.d), J: step(sk.j) }, ST.k_si, NOW.si,
                          'purple', FRAME, 'KDJ OVER THE TWICE-MONTHLY REPORTS',
                          ['SHORTS AT THE TOP OF THEIR RECENT RANGE', HOT], ['SHORTS AT THE BOTTOM OF THEIR RECENT RANGE', LOWC]));
    }
    const shortGroup = out.map(s => (s.id === 'dpsi' || s.id === 'dpsikdj'
      ? Object.assign(s, { card: 'teal', frame: TFRAME, frame_color: TFRAME.color })
      : Object.assign(s, { card: 'cyan', frame: SFRAME, frame_color: SFRAME.color })));
    const dn = chipsSection(P) || [];
    const dpShare = makeSections(P, bars, D)[0];
    dpShare.layout = { height_px: 100 };
    const dpKdj = kdjSection('dpsharekdj', 'KDJ OF DARK POOL SHARE', kdjLines(B && B.share, gOff, nT), ST.k_share, NOW.share,
                             'purple', FRAME, 'KDJ OF OFF-EXCH %', ['TOP OF ITS RECENT RANGE', HOT], ['BOTTOM OF ITS RECENT RANGE', LOWC]);
    return [...dn, dpShare, dpKdj, ...shortGroup];
  }



  function chipsSection(P) {
    const DN = cur && cur.chips && cur.chips[tf], L = (DN && DN.last) || {};
    if (!DN) return null;
    const t = P.t || [], st = DN.d.map(x => Date.parse(x + 'T12:00:00Z') / 1000);
    const idx = []; let j = -1;
    t.forEach(x => {
      while (j + 1 < st.length && st[j + 1] <= x + 43200) j++;
      idx.push(j >= 0 && (tf !== '1D' || DN.d[j] === day(x)) ? j : -1);
    });
    const pick = a => idx.map(k => (k < 0 ? null : a[k]));
    const W = pick(DN.whale), R = pick(DN.retail), WM = pick(DN.whale_ma), RM = pick(DN.retail_ma);
    const full = R.map(r => (r == null ? null : 100)), flt = R.map(r => (r == null ? null : 100 - r));
    const turn = idx.map((k, i) => (k >= 0 && DN.turn[k] && (i === 0 || idx[i - 1] !== k) ? DN.turn[k] : 0));
    const dots = turn.map(v => (v ? 106 : null)), dotc = turn.map(v => (v > 0 ? '#00e676' : v < 0 ? '#ff1744' : null));
    const k = DN.d.length - 1, wl = DN.whale[k], rl = DN.retail[k];
    const wUp = DN.whale_ma[k] > DN.whale_ma[k - 1], rUp = DN.retail_ma[k] > DN.retail_ma[k - 1];
    const reg = wUp && !rUp ? ['WHALE ↑ RETAIL ↓', '#00e676'] : !wUp && rUp ? ['WHALE ↓ RETAIL ↑', '#ff1744'] : ['MIXED', MUTE];
    const zone = { surge: ' · SURGE', run: ' · RUN' }[L.zone] || '';
    const g = w => ({ high: 'High', moderate: 'Moderate', low: 'Low' }[w] || '');
    const chips = {
      id: 'dpchips', card: 'red', frame: { color: '#ef5350', fill: '#3a161640' }, frame_color: '#ef5350',
      title: 'WHALE vs RETAIL CHIPS · ' + reg[0],
      title_parts: [{ text: 'WHALE vs RETAIL CHIPS', color: '#d1d4dc' }, { text: ' · ' + reg[0], color: reg[1] }],
      lines: [{ text: `Whale ${wl == null ? '—' : wl.toFixed(1)}${zone}`, color: '#69f0ae' },
              { text: `Retail ${rl == null ? '—' : rl.toFixed(1)} · Floating ${wl == null ? '—' : (100 - wl - rl).toFixed(1)}`, color: '#ff5252' },
              { text: `Turn ${L.side > 0 ? 'BUY' : L.side < 0 ? 'SELL' : '—'} · ${L.age ?? '—'} bars ago${L.grade ? ' · ' + g(L.grade) : ''}`,
                color: L.side > 0 ? '#00e676' : '#ff1744' }],
      series: [
        { id: 'ch_r', kind: 'histogram', color: '#ff1744aa', values: full },
        { id: 'ch_f', kind: 'histogram', color: '#5d606bcc', values: flt },
        { id: 'ch_w', kind: 'histogram', color: '#00c853cc', values: W },
        { id: 'ch_wm', kind: 'line', color: '#b9f6ca', width: 1, values: WM },
        { id: 'ch_rm', kind: 'line', color: '#ffcdd2', width: 1, values: RM.map(v => (v == null ? null : 100 - v)) },
        { id: 'ch_side', kind: 'dots', color: '#00e676', width: 3, values: dots, colors: dotc },
      ],
      guides: [{ value: 50, label: null, color: '#d1d4dc8c', style: 'dashed' }, { value: 75, label: null, color: '#d1d4dc5c', style: 'dotted' }],
      lane_tags: [{ text: 'GREEN WHALE · GREY FLOATING · RED RETAIL · DOTS = TURNS', color: '#d1d4dcb8' }],
      scale: { min: 0, max: 112, auto: false }, layout: { height_px: 140 },
    };


    const bal = W.map((w, i) => (w == null || R[i] == null ? null : w - R[i]));
    const B = block(cur), kk = kdjLines(B && B.bal, gridAt(t, B), t.length), iK = lastIdx(kk.J);
    if (iK < 1) return [chips];
    const lo = Math.min(0, ...kk.J.filter(v => v != null)), hi = Math.max(100, ...kk.J.filter(v => v != null)), pad = (hi - lo) * 0.04;
    const kst = word(B.state.k_bal, ['WHALES GAINING', '#00e676'], ['RETAIL GAINING', '#ff1744']), nw = B.now.bal || [];
    const nn = v => (v == null ? '—' : v);
    const ckdj = {
      id: 'dpchipkdj', card: 'red', frame: { color: '#ef5350', fill: '#3a161640' }, frame_color: '#ef5350',
      title: 'KDJ OF CHIP BALANCE · ' + kst[0],
      title_parts: [{ text: 'KDJ OF CHIP BALANCE', color: '#d1d4dc' }, { text: ' · ' + kst[0], color: kst[1] }],
      lines: [{ text: `J ${nn(nw[0])}`, color: '#e040fb' }, { text: `K ${nn(nw[1])}`, color: '#ff9800' },
              { text: `D ${nn(nw[2])} · balance ${bal[lastIdx(bal)] >= 0 ? '+' : ''}${(bal[lastIdx(bal)] ?? 0).toFixed(0)}`, color: '#23b2ce' }],
      series: [{ id: 'ck_d', kind: 'line', color: '#23b2ce', width: 1, values: kk.D }, { id: 'ck_k', kind: 'line', color: '#ff9800', width: 1, values: kk.K },
               { id: 'ck_j', kind: 'line', color: '#e040fb', width: 1, values: kk.J }],
      guides: [{ value: 80, label: null, color: '#d1d4dc8c', style: 'dashed' }, { value: 50, label: null, color: '#d1d4dc5c', style: 'dotted' },
               { value: 20, label: null, color: '#d1d4dc8c', style: 'dashed' }],
      lane_tags: [{ text: 'KDJ OF WHALE − RETAIL', color: '#d1d4dcb8' }],
      scale: { min: lo - pad, max: hi + pad, auto: false }, layout: { height_px: 90 },
    };
    return [chips, ckdj];
  }


  async function inject(s, wantS, wantTf) {
    const D = await get(wantS);
    if (wantS !== sym || wantTf !== tf) return;
    cur = D; curSym = wantS; aligned = null;
    const P = s && s.di && s.di.panes;
    if (D && !D.error && P && P.t && P.t.length && !INTRADAY.has(wantTf)) {

      try { P.sections = (typeof SHORTVIEW !== 'undefined' && SHORTVIEW ? makeShortSections : makeSections)(P, s.di.bars || [], D).concat(P.sections || []); } catch (e) { console.error(e); }
      if (typeof DPVIEW !== 'undefined' && DPVIEW) P.notes = [];
    }
  }

  function build(ch) {
    volTot = ch.addSeries(LW.HistogramSeries, { priceScaleId: 'dpv', color: '#5d606b55', priceLineVisible: false, lastValueVisible: false,
      priceFormat: { type: 'volume' } }, 0);
    volOff = ch.addSeries(LW.HistogramSeries, { priceScaleId: 'dpv', color: PUR_D + 'c0', priceLineVisible: false, lastValueVisible: false,
      priceFormat: { type: 'volume' } }, 0);
    ch.priceScale('dpv').applyOptions({ scaleMargins: { top: 0.86, bottom: 0 }, visible: false });
    ch.subscribeCrosshairMove(p => setHover(p && p.time));
  }
  function buildD(dch) { dch.subscribeCrosshairMove(p => setHover(p && p.time)); }


  function setPrice(bars) {
    if (!volTot) return;
    const on = layerOn('dpvol') && cur && !cur.error && !INTRADAY.has(tf);
    volTot.applyOptions({ visible: !!on }); volOff.applyOptions({ visible: !!on });
    if (!on) { volTot.setData([]); volOff.setData([]); return; }
    const A = aligned && aligned.times.length === bars.length ? aligned : align(bars.map(b => b[0]), bars, cur);
    const idx = new Map(A.times.map((t, i) => [t, i]));
    volTot.setData(bars.map(b => (b[5] ? { time: b[0], value: b[5] } : { time: b[0] })));
    volOff.setData(bars.map(b => {
      const i = idx.get(b[0]), o = i == null ? null : A.off[i];
      if (o == null) return { time: b[0] };
      const f = A.fl[i];
      return { time: b[0], value: Math.min(o, b[5] || o), color: f && f.some(x => x === 'heavy' || x === 'share_hi') ? HOT : PUR_D + 'c0' };
    }));
  }

  function setHover(t) {
    hover = t || null;
    const el = document.getElementById('dpcur');
    if (!el) return;
    if (!hover || !aligned) { el.innerHTML = '<span class="muted">hover a candle for its dark-pool numbers</span>'; return; }
    const i = aligned.times.indexOf(hover);
    if (i < 0) return;
    const A = aligned, f = A.fl[i] || [];
    const tags = f.map(x => ({ heavy: 'heavy volume', share_hi: 'high share', sr_hi: 'high short ratio', sr_lo: 'low short ratio' }[x])).filter(Boolean);
    el.innerHTML = `<b>${md(day(hover))}</b>${tf !== '1D' ? ` <span class="muted">(${tf}, ${A.nd[i]} days)</span>` : ''} · ` +
      `off-exch <span style="color:${PUR}">${shs(A.off[i])}</span> = ${pct1(A.pct[i])} of ${shs(A.v[i])} · short ratio ${r2(A.sr[i])}` +
      (A.ats[i] != null ? ` · dark pools only ${pct1(A.ats[i])}` : '') +
      (tags.length ? ` · <span style="color:${HOT}">${[...new Set(tags)].join(', ')}</span>` : '');
  }

  function renderSide() {
    let el = document.getElementById('dpbox');
    if (!el) { el = document.createElement('div'); el.id = 'dpbox'; document.getElementById('side').appendChild(el); }
    if (!layerOn('dpbox')) { el.style.display = 'none'; return; }
    el.style.display = '';
    const D = cur;
    if (!D || curSym !== sym) { el.innerHTML = '<div class="tt"><span>DARK POOL</span><span class="muted">loading…</span></div>'; return; }
    if (D.error) { el.innerHTML = `<div class="tt"><span>DARK POOL</span></div><div class="muted">${esc(D.error)}</div>`; return; }
    const S = D.summary, W = D.weekly;
    let h = `<div class="tt"><span style="color:${PUR}">DARK POOL · FINRA</span><span class="muted">daily file ${md(S.last)}</span></div>`;
    const zs = z => (z == null ? '' : ` <span class="muted">z ${z >= 0 ? '+' : ''}${z.toFixed(1)}</span>`);
    h += `<div>Off-exchange <b style="color:${PUR}">${shs(S.tot)}</b> sh = <b>${pct1(S.pct)}</b> of volume <span class="muted">(1y med ${pct1(S.pct_med)}, 20d ${pct1(S.pct20)})</span>${zs(S.z_pct)}</div>`;
    h += `<div>Short ratio <b>${r2(S.sr)}</b> · 5-day ${r2(S.sr5)} <span class="muted">(1y med ${r2(S.sr_med)}, pctile ${S.sr5_pctile ?? '—'}, market ${r2(S.mkt_sr)})</span>${zs(S.z_sr)}</div>`;
    const fd = (S.flag_days || []).slice(-8).reverse();
    h += `<div class="sub">Unusual days, last 60 sessions${fd.length ? '' : ': <span class="muted">none</span>'}</div>`;
    if (fd.length) h += '<table class="dpt">' + fd.map(([d, f, tot, p, sr, c]) => {
      const tg = f.map(x => ({ heavy: 'heavy', share_hi: 'share↑', sr_hi: 'SR↑', sr_lo: 'SR↓' }[x])).join(' ');
      return `<tr><td>${md(d)}</td><td style="color:${HOT}">${tg}</td><td>${shs(tot)}</td><td>${pctS(p)}</td><td>SR ${r2(sr)}</td><td class="muted">${c != null ? '$' + c.toFixed(2) : ''}</td></tr>`;
    }).join('') + '</table>';
    if (W && W.rows && W.rows.length) {
      const r = W.rows[W.rows.length - 1], med = median(W.rows.slice(-52).map(x => x.ats_pct));
      h += `<div class="sub">Dark pools only (ATS) · week of ${md(r.w)} <span class="muted">(published ${r.pub ? md(r.pub) : '—'}, ${W.tier === 2 ? 'about 5 weeks' : 'about 3 weeks'} after the week)</span></div>`;
      h += `<div><b style="color:${TEAL}">${shs(r.ats)}</b> sh = <b>${pct1(r.ats_pct)}</b> of volume <span class="muted">(1y med ${pct1(med)})</span> · avg trade ${r.size ? Math.round(r.size) : '—'} sh</div>`;
      h += '<table class="dpt">' + W.venues.slice(0, 6).map(([n, s, x, u]) =>
        `<tr><td>${esc(String(n).replace(/^[A-Z0-9]{4} /, ''))}</td><td>${pctS(s)}</td><td style="color:${u > 0 ? HOT : u < 0 ? LOWC : '#b2b5be'}">${x != null ? x.toFixed(2) + '× usual' : ''}</td></tr>`).join('') + '</table>';
      h += `<div class="muted">venue share of dark-pool volume, last 4 published weeks vs the year before</div>`;
    } else h += `<div class="sub">Dark pools only (ATS) <span class="muted">no weekly data for this ticker yet</span></div>`;
    h += `<div id="dpcur" class="cur"></div>`;
    h += `<div class="muted dpnote">Off-exchange = dark pools + retail wholesalers. FINRA gives no buy/sell side; a high short ratio usually means market makers filling buyers, not bets against the stock.</div>`;
    el.innerHTML = h;
    setHover(hover);
  }
  return { inject, build, buildD, setPrice, renderSide };
})();
