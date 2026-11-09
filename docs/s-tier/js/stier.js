


'use strict';
(function () {
  const $ = (q, el) => (el || document).querySelector(q);
  const app = $('#app');
  const S = { board: null, days: {}, names: {}, tab: 'board', day: null, sym: null, tsort: ['tier', -1] };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const LEVEL = { S: 3, A: 2, B: 1 };


  const GH = /(^|\.)github\.io$/i.test(location.hostname);
  const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/s-tier-data/s-tier/';
  let BASE = GH ? RAW : 'snap/';
  async function fetchJSON(url) {
    for (let i = 0; i < 3; i++) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(url, { cache: 'no-cache', signal: ctl.signal });
        clearTimeout(t);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch (e) {
        clearTimeout(t);
        if (i === 2) throw e;
      }
    }
  }
  const getJSON = (name) => fetchJSON(BASE + name).catch((err) => { if (BASE === RAW) throw err; BASE = RAW; return fetchJSON(BASE + name); });


  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const d2 = (d) => { if (!d) return ''; const [, m, dd] = d.split('-').map(Number); return MON[m - 1] + ' ' + dd; };
  const pct = (x, n) => x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(n == null ? 0 : n) + '%';
  const pcls = (x) => x == null ? '' : x > 0 ? 'pos' : x < 0 ? 'neg' : '';
  const strike = (k) => k == null ? '—' : '$' + (Number.isInteger(k) ? k : k.toFixed(1));
  const expTxt = (e) => {
    if (!e) return '';
    const m = /^(\d\d)\/(\d\d)\/(\d\d)$/.exec(e);
    return m ? MON[+m[1] - 1] + ' ' + (+m[2]) + " '" + m[3] : e;
  };
  const STW = { GOLDEN: 'cross ↑', COIL: 'coil', UP: 'up', DOWN: 'down', DEATH: 'cross ↓' };
  const gradeWord = (g) => ({ pin: 'pinned at the price', near: 'close to the price', below: 'below the price', weak: 'not top grade' }[g] || g || '');
  const callWord = (t) => (S.board && S.board.calls && S.board.calls.words && S.board.calls.words[t]) || t || '';
  const tb = (t, lg) => t ? `<span class="tb ${t}${lg ? ' lg' : ''}">${t}</span>` : '';
  const tierName = (t) => t === 'B' ? 'Watch' : t + '-tier';
  const offHigh = (c) => { const v = (c.fallen || {}).dd; return v == null ? null : -v; };
  const tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip);
  const builtWords = () => {
    const b = S.board;
    if (!b || !b.built_utc) return '—';
    const d = new Date(b.built_utc), o = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    const et = d.toLocaleString('en-US', Object.assign({ timeZone: 'America/New_York' }, o)), me = d.toLocaleString('en-US', o);
    return et === me ? et + ' ET' : `${et} ET (${me} your time)`;
  };

  function route() {
    const h = location.hash.replace(/^#/, '');
    const parts = h.split('&');
    const kv = {};
    parts.slice(1).forEach((p) => { const [k, v] = p.split('='); kv[k] = decodeURIComponent(v || ''); });
    let tab = parts[0] || 'board', sym = null;
    if (tab.startsWith('s=')) { sym = decodeURIComponent(tab.slice(2)).toUpperCase(); tab = 'name'; }
    if (!['board', 'table', 'name'].includes(tab)) tab = 'board';
    S.day = S.board.days.includes(kv.d) ? kv.d : S.board.as_of;
    S.tab = tab; S.sym = sym;
  }
  const href = (tab, d, sym) => '#' + (sym ? 's=' + encodeURIComponent(sym) : tab) + (d && d !== S.board.as_of ? '&d=' + d : '');

  async function dayTiers(d) {
    if (d === S.board.as_of) return S.board.now;
    if (!S.days[d]) S.days[d] = await getJSON('days/' + d + '.json');
    return S.days[d].tiers;
  }
  function nameData(sym) {
    if (!S.names[sym]) S.names[sym] = getJSON('names/' + encodeURIComponent(sym) + '.json');
    return S.names[sym];
  }

  async function sinceFirst(sym, from) {
    try {
      const n = await nameData(sym);
      const p = n.path || [];
      const i = p.findIndex((r) => r[0] > from);
      if (i < 0) return null;
      return { from: p[i][0], to: p[p.length - 1][0], gain: 1 / (1 + p[i][3] / 100) - 1 };
    } catch (e) { return null; }
  }


  function chrome() {
    document.querySelectorAll('.ptab').forEach((a) => {
      a.classList.toggle('on', a.dataset.tab === S.tab || (S.tab === 'name' && a.dataset.tab === 'board'));
      a.href = href(a.dataset.tab, S.day);
    });
    const days = S.board.days, i = days.indexOf(S.day);
    const st = $('#stepper');
    st.innerHTML = `<button id="prev" title="Previous close" ${i <= 0 ? 'disabled' : ''}>◀</button><span class="sd">${d2(S.day)} close</span>` +
      `<button id="next" title="Next close" ${i >= days.length - 1 ? 'disabled' : ''}>▶</button>` +
      (S.day !== S.board.as_of ? '<span class="live" id="today">LATEST</span>' : '');
    const go = (d) => { location.hash = href(S.tab === 'name' ? 'board' : S.tab, d, S.tab === 'name' ? S.sym : null).slice(1); };
    $('#prev').onclick = () => i > 0 && go(days[i - 1]);
    $('#next').onclick = () => i < days.length - 1 && go(days[i + 1]);
    if ($('#today')) $('#today').onclick = () => go(S.board.as_of);
    const v = S.board.vintage || {};
    $('#vintage').innerHTML = S.day === S.board.as_of
      ? `<span class="dot${v.calls_lag || v.king !== v.kdj ? ' lag' : ''}"></span>${d2(v.kdj)} close · King ${d2(v.king)} · Calls ${d2(v.calls)} · updated ${esc(builtWords())}`
      : `<span class="dot lag"></span>Replay: the board as of the ${d2(S.day)} close`;
    const dl = $('#syms');
    if (!dl.childElementCount) dl.innerHTML = (S.board.history.rows || []).map((r) => `<option value="${esc(r.s)}">`).join('');
  }


  function needs(c) {
    const L = c.legs || {}, out = [];
    if (L.king === 'off') out.push('a far king node above the price');
    else if (L.king === 'half') out.push('the king node at the top grade');
    if (L.kdj !== 'full') out.push(c.kdj && c.kdj.washed ? 'the KDJ turn up' : 'a deep KDJ washout');
    if (L.calls === 'off') out.push('steady call buying (the Stealth top tier)');
    else if (L.calls === 'half') out.push('the calls to firm up to the Stealth top tier');
    return out;
  }

  function legs(c) {
    const L = c.legs || {}, k = c.king || {}, j = c.kdj || {}, ca = c.calls || {}, f = c.fallen || {};
    const st = j.st || {};
    const king = L.king !== 'off'
      ? { s1: `King ${strike(k.k)} · ${pct(k.dist)} above`, s2: [expTxt(k.exp), k.grade ? 'grade ' + k.grade : ''].filter(Boolean).join(' · ') }
      : { s1: k.k ? `King ${strike(k.k)} · ${gradeWord(k.grade)}` : 'No far king node', s2: k.k ? `${pct(k.dist)} · needs a top-grade node far above` : 'needs a top-grade node far above the price' };
    const kdj = {
      s1: j.turned && j.washed ? `Washed ${j.wmax}/4 → turned` : j.washed ? `Washed ${j.wmax}/4 · no turn yet` : j.turned ? 'Turned · no deep washout' : 'No washout',
      s2: ['1D', '1W', '2W', '1M'].map((t) => `${t} ${STW[st[t]] || '—'}`).join(' · '),
    };
    const calls = L.calls === 'full' ? { s1: 'Stealth top tier · steady call buying', s2: 'quiet, steady, call-heavy builds' }
      : L.calls === 'half' ? { s1: `Stealth: ${callWord(ca.tier)}`, s2: 'needs the Stealth top tier' } : { s1: 'No steady call build', s2: 'needs the Stealth top tier' };
    if (ca.settle && L.calls !== 'off') calls.s2 += ` · settle ${d2(ca.settle)}`;
    const fall = L.fallen === 'full' ? { s1: `${pct(-f.dd)} from the high`, s2: 'a big drop in a large company' }
      : { s1: f.dd != null ? `${pct(-f.dd)} from the high` : 'Drop unknown', s2: 'needs a big drop in a large company' };
    const mark = (s) => s === 'full' ? '✓' : s === 'half' ? '½' : '·';
    const sg = (cls, ic, icc, o) => `<div class="sg ${cls}" title="${esc(o.s1 + ' — ' + o.s2)}"><span class="ic ${icc}">${ic}</span><div style="min-width:0"><div class="s1">${esc(o.s1)}</div><div class="s2">${esc(o.s2)}</div></div><span class="ok">${mark(cls)}</span></div>`;
    return `<div class="sig">${sg(L.king, '♛', 'king', king)}${sg(L.kdj, 'K', 'kdj', kdj)}${sg(L.calls, '☎', 'calls', calls)}${sg(L.fallen, '↓', 'fall', fall)}</div>`;
  }

  function cardHTML(c, o) {
    o = o || {};
    const id = 'ch-' + c.s.replace(/[^A-Za-z0-9]/g, '_') + '-' + (o.key || '');
    const nd = needs(c);
    const need = nd.length && c.tier !== 'S' ? `<div class="need">To reach S it needs <b>${nd.map(esc).join('</b>, <b>')}</b>.</div>` : '';
    const dayTxt = o.asof ? d2(o.asof) + ' close' : c.ndays > 1 ? `day ${c.ndays} in ${c.tier === 'B' ? 'watch' : c.tier}` : (c.tier ? 'new on this close' : '');
    return `<div class="card ${c.tier || ''}${o.ghost ? ' ghost' : ''}" data-sym="${esc(c.s)}">
      <div class="ch">${tb(c.tier, true)}<div style="min-width:0"><div class="tk">${esc(c.s)}</div>
        <div class="nm">${esc(c.name || '')}${c.sec ? ' · ' + esc(c.sec) : ''}</div></div>
        <div class="px"><div class="p ${pcls(offHigh(c))}">${pct(offHigh(c))}</div><div class="p2">off the high · ${esc(dayTxt)}</div></div></div>
      <div class="since" data-since="${esc(c.s)}" data-from="${esc(o.since || '')}" data-level="${esc(o.level || '')}"></div>
      ${legs(c)}
      <div class="chart" id="${id}" data-sym="${esc(c.s)}" data-upto="${esc(o.upto || '')}" data-after="${o.after ? 1 : ''}"></div>
      ${need}
      <div class="cf">${c.biz != null ? `<span>Business ${esc(c.biz)}</span>` : ''}<span class="sp"></span><a href="${href('', S.day, c.s)}">Details →</a></div></div>`;
  }

  function bindCards(root) {
    root.querySelectorAll('.card').forEach((el) => {
      el.addEventListener('click', (e) => { if (e.target.closest('a')) return; location.hash = href('', S.day, el.dataset.sym).slice(1); });
    });
    root.querySelectorAll('.chart[data-sym]').forEach(async (el) => {
      try { drawChart(el, await nameData(el.dataset.sym), el.dataset.upto || S.day, { after: !!el.dataset.after }); }
      catch (e) { el.innerHTML = '<div class="empty">Chart unavailable</div>'; }
    });
    root.querySelectorAll('.since[data-from]').forEach(async (el) => {
      if (!el.dataset.from) { el.remove(); return; }
      const m = await sinceFirst(el.dataset.since, el.dataset.from);
      if (!m) { el.remove(); return; }
      el.innerHTML = (el.dataset.inline ? ' · ' : '') + `First ${esc(el.dataset.level)} day ${d2(el.dataset.from)} · from the next close (${d2(m.from)}): <b class="${pcls(m.gain)}">${pct(m.gain, 1)}</b> to ${d2(m.to)}`;
    });
  }


  function redrawCharts() {
    tip.style.display = 'none';
    app.querySelectorAll('.chart[data-sym]').forEach(async (el) => {
      try { drawChart(el, await nameData(el.dataset.sym), el.dataset.upto || S.day, { after: !!el.dataset.after }); } catch (e) {  }
    });
    const np = $('#ch-np');
    if (np && S.tab === 'name') nameData(S.sym).then((n) => drawChart(np, n, S.day, { big: true })).catch(() => {});
  }


  function drawChart(el, n, upto, o) {
    o = o || {};
    const W = Math.max(280, el.clientWidth), H = Math.max(120, el.clientHeight);
    const all = n.path || [];
    let iu = all.length - 1;
    while (iu > 0 && all[iu][0] > upto) iu--;
    const look = o.big ? 110 : 64;
    let rows, nAfter = 0;
    if (o.after && iu < all.length - 1) {
      nAfter = Math.min(all.length - 1 - iu, Math.round(look * 0.45));
      rows = all.slice(Math.max(0, iu - (look - nAfter) + 1), iu + 1 + nAfter);
    } else rows = all.slice(Math.max(0, iu - look + 1), iu + 1);
    if (rows.length < 2) { el.innerHTML = '<div class="empty">No price history</div>'; return; }
    const F = (v) => 1 + (v || 0) / 100;
    const ref = all[iu], cu = F(ref[3]);
    const rel = (v) => (F(v) / cu - 1) * 100;
    const days = n.days || {}, kn = n.kn || {};
    const kingAt = (r) => {
      const x = days[r[0]];
      if (x && x.k && x.kd != null) return { y: (F(r[3]) * (1 + x.kd) / cu - 1) * 100, k: x.k, strong: x.g === 'A' || x.g === 'B', g: x.g, kd: x.kd };
      if (!x && kn[r[0]] != null) return { y: rel(kn[r[0]]), strong: false, pre: true };
      return null;
    };
    const L = 8, R = 70, T = 16, B = 26, pw = W - L - R, ph = H - T - B;
    let lo = Infinity, hi = -Infinity;
    rows.forEach((r) => { lo = Math.min(lo, rel(r[2])); hi = Math.max(hi, rel(r[1])); });
    rows.forEach((r) => { const k = kingAt(r); if (k && k.y <= 65 && k.y >= -30) hi = Math.max(hi, k.y); });
    const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
    const X = (i) => L + (i / (rows.length - 1)) * pw;
    const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * ph;
    const cw = pw / Math.max(1, rows.length - 1);
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs><linearGradient id="ga${el.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa4bd" stop-opacity=".22"/><stop offset="1" stop-color="#9aa4bd" stop-opacity="0"/></linearGradient></defs>`;
    rows.forEach((r, i) => { const x = days[r[0]]; if (x && x.w >= 3) s += `<rect x="${X(i) - cw / 2}" y="${T}" width="${cw}" height="${ph}" fill="rgba(239,83,80,.12)"/>`; });
    let pm = null;
    rows.forEach((r, i) => { const m = r[0].slice(0, 7); if (m !== pm && i > 0) s += `<line x1="${X(i)}" y1="${T}" x2="${X(i)}" y2="${T + ph}" stroke="#2A2E39"/><text x="${X(i) + 3}" y="${H - 6}" fill="#5D606B" font-size="10.5">${MON[+r[0].slice(5, 7) - 1]}</text>`; pm = m; });
    let seg = null;
    const flush = () => { if (seg) { s += `<path d="${seg.d}" fill="none" stroke="#E3B341" stroke-width="${seg.strong ? 2.2 : 1.3}" stroke-dasharray="${seg.strong ? '' : '4 4'}" opacity="${seg.strong ? 1 : .55}"/>`; seg = null; } };
    rows.forEach((r, i) => {
      const k = kingAt(r);
      if (!k || k.y > hi || k.y < lo) { flush(); return; }
      const x0 = X(i) - cw / 2, x1 = X(i) + cw / 2, y = Y(k.y), key = (k.k || 'pre') + ':' + k.strong;
      if (seg && seg.key === key && Math.abs(seg.y - y) < 6) seg.d += ` L${x1},${y}`;
      else { flush(); seg = { key, strong: k.strong, y, d: `M${Math.max(L, x0)},${y} L${x1},${y}` }; }
    });
    flush();
    const pts = rows.map((r, i) => [X(i), Y(rel(r[3]))]);
    const nb = rows.length - nAfter;
    const line = (a) => a.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const main = pts.slice(0, nb);
    s += `<path d="${line(main)} L${main[main.length - 1][0]},${T + ph} L${main[0][0]},${T + ph} Z" fill="url(#ga${el.id})"/>`;
    s += `<path d="${line(main)}" fill="none" stroke="#D1D4DC" stroke-width="1.7"/>`;
    if (nAfter) {
      const aft = pts.slice(nb - 1);
      s += `<line x1="${aft[0][0]}" y1="${T}" x2="${aft[0][0]}" y2="${T + ph}" stroke="#E3B341" stroke-dasharray="2 3" opacity=".7"/>`;
      s += `<path d="${line(aft)}" fill="none" stroke="#26a69a" stroke-width="1.7" opacity=".9"/><text x="${aft[0][0] + 4}" y="${T + 11}" fill="#E3B341" font-size="10.5">after</text>`;
    }
    rows.forEach((r, i) => {
      const x = days[r[0]], pv = i > 0 ? days[rows[i - 1][0]] : null;
      if (x && x.tu && x.wr && pv && !pv.tu) { const y = Math.min(T + ph - 2, Y(rel(r[2])) + 12); s += `<path d="M${X(i)},${y - 7} l5,8 l-10,0 Z" fill="#26a69a"/>`; }
    });
    rows.forEach((r, i) => {
      const x = days[r[0]];
      if (!x) return;
      if (x.t) s += `<rect x="${X(i) - cw / 2 + .5}" y="3" width="${Math.max(1, cw - 1)}" height="7" rx="1.5" fill="${x.t === 'S' ? '#E3B341' : x.t === 'A' ? '#7E57C2' : '#5C7A99'}"/>`;
      if (x.ct === 'S') s += `<circle cx="${X(i)}" cy="${T + ph + 8}" r="3.2" fill="#4fc3f7"/>`;
      else if (x.ct) s += `<circle cx="${X(i)}" cy="${T + ph + 8}" r="3" fill="none" stroke="#4fc3f7" stroke-width="1.2"/>`;
    });
    const end = rows[rows.length - 1];
    const yP = Y(rel(end[3])) + 4;
    s += `<text x="${W - R + 6}" y="${yP}" fill="${nAfter ? '#26a69a' : '#F0F3FA'}" font-size="11.5" font-weight="700">${nAfter ? pct(rel(end[3]) / 100, 1) : d2(end[0])}</text>`;
    const lk = kingAt(ref) || [...rows].reverse().map(kingAt).find(Boolean);
    if (lk && lk.y <= hi && lk.y >= lo) {
      let yK = Math.max(T + 9, Y(lk.y) + 4);
      if (Math.abs(yK - yP) < 13) yK = yK <= yP ? yP - 13 : yP + 13;
      s += `<text x="${W - R + 6}" y="${Math.min(T + ph + 4, Math.max(T + 9, yK))}" fill="#E3B341" font-size="11.5" font-weight="700">♛ ${lk.k ? strike(lk.k) : pct(lk.y / 100)}</text>`;
    }
    s += `<rect x="${L}" y="0" width="${pw}" height="${H}" fill="transparent"/><line class="cur" x1="0" x2="0" y1="${T}" y2="${T + ph}" stroke="#787B86" stroke-width="1" opacity="0"/></svg>`;
    el.innerHTML = s;
    const svg = el.querySelector('svg'), cur = el.querySelector('.cur');
    svg.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect();
      const xs = (e.clientX - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(rows.length - 1, Math.round((xs - L) / Math.max(1, cw))));
      const b = rows[i], x = days[b[0]], k = kingAt(b);
      cur.setAttribute('x1', X(i)); cur.setAttribute('x2', X(i)); cur.setAttribute('opacity', '.8');
      tip.innerHTML = `<b>${d2(b[0])}</b> · ${pct(rel(b[3]) / 100, 1)} vs ${d2(ref[0])}` + (x && x.t ? ` · <b>${tierName(x.t)}</b>` : '') +
        (k && k.k ? `<br>King ${strike(k.k)} ${pct(k.kd)}${x && x.g ? ' · ' + esc(x.g) : ''}` : k && k.pre ? '<br>King (before this board started)' : '') +
        (x ? `<br>Washed ${x.w}/4${x.tu ? ' · turned' : ''} · calls ${x.ct ? esc(callWord(x.ct)) : '—'}` : '');
      tip.style.display = 'block';
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 12) + 'px';
      tip.style.top = (e.clientY + 14) + 'px';
    });
    svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; cur.setAttribute('opacity', '0'); });
  }


  async function renderBoard() {
    const d = S.day, t = await dayTiers(d);
    const cnt = S.board.counts.find((c) => c.d === d) || { S: 0, A: 0, B: 0 };
    const sDays = S.board.counts.filter((c) => c.S && c.d <= d).map((c) => c.d);
    const lastS = sDays.length ? sDays[sDays.length - 1] : null;
    const lastCards = lastS && !cnt.S ? (await dayTiers(lastS)).S : [];
    const spanOf = (sym, day) => {
      const sp = (S.board.last_s && S.board.last_s.spans) || {};
      const x = sp[sym];
      return x && x[0] <= day && x[1] >= day ? x : null;
    };
    let head;
    if (cnt.S) head = `<span class="g">${cnt.S} S-tier name${cnt.S > 1 ? 's' : ''}</span> on the ${d2(d)} close: ${t.S.map((c) => esc(c.s)).join(', ')}`;
    else if (cnt.A) head = `No S-tier on the ${d2(d)} close · ${cnt.A} A-tier`;
    else head = `No S-tier or A-tier on the ${d2(d)} close · ${cnt.B} on the watch list`;
    const cards0 = cnt.S ? t.S : lastCards;
    const c0 = cards0[0];
    const sp0 = c0 ? spanOf(c0.s, lastS) : null;
    const first0 = sp0 ? sp0[0] : (c0 ? c0.first : null);
    const lastTile = !lastS ? `<div class="tile last"><div><div class="lab">Last S-tier</div><div class="sub">None yet on this board</div></div></div>`
      : `<div class="tile last" data-go="${esc(lastS)}"><div><div class="lab">${tb('S')} ${cnt.S ? 'S-tier on this close' : 'Last S-tier'}: ${cards0.map((c) => esc(c.s)).join(', ')}</div>
        <div class="sub">${sp0 && sp0[0] !== sp0[1] ? `${d2(sp0[0])}–${d2(sp0[1])}` : d2(first0 || lastS)}<span class="since" data-since="${c0 ? esc(c0.s) : ''}" data-from="${esc(first0 || '')}" data-level="S" data-inline="1"></span>${cnt.S ? '' : ' · tap to replay that close'}</div></div>
        <span class="spk" data-sym="${c0 ? esc(c0.s) : ''}" data-from="${esc(first0 || lastS)}"></span></div>`;
    let h = `<section class="hero"><h1>${head}</h1>
      <p class="lede">S-tier is the MCD pattern: <b>a far king node above the price</b>, <b>a KDJ washout that has turned up</b>, <b>steady call buying</b> and <b>a big drop in a large company</b>, all on the same close. MCD had all four in early October, near its low.</p>
      ${d !== S.board.as_of ? `<div class="replay">Replaying the ${d2(d)} close.<a href="${href('board', S.board.as_of)}">Back to the latest</a></div>` : ''}
      <div class="tiles">
        <div class="tile s"><div class="big">${cnt.S}</div><div><div class="lab">${tb('S')} S-tier</div><div class="sub">all four signals</div></div></div>
        <div class="tile a"><div class="big">${cnt.A}</div><div><div class="lab">${tb('A')} A-tier</div><div class="sub">calls + KDJ turn + drop, no king needed</div></div></div>
        <div class="tile b"><div class="big">${cnt.B}</div><div><div class="lab">${tb('B')} Watch</div><div class="sub">has the king or the calls, one or two signals short</div></div></div>
        ${lastTile}
      </div>
      <div class="legs">
        <div class="leg"><span class="ic king">♛</span><div><div class="t1">Far king node</div><div class="t2">A big options magnet well above the price, the same strike held day after day</div></div></div>
        <div class="leg"><span class="ic kdj">K</span><div><div class="t1">KDJ washout, then a turn</div><div class="t2">Washed out across the daily, weekly, 2-week and monthly, then turning up</div></div></div>
        <div class="leg"><span class="ic calls">☎</span><div><div class="t1">Steady call buying</div><div class="t2">The Stealth Calls top tier: quiet, steady, call-heavy builds</div></div></div>
        <div class="leg"><span class="ic fall">↓</span><div><div class="t1">Fallen large company</div><div class="t2">A big drop from its 52-week high</div></div></div>
      </div></section>`;
    h += `<section class="sec"><div class="sech"><span class="st">${tb('S')} S-tier</span><span class="sd">all four on this close</span><span class="sn">${cnt.S}</span></div>`;
    if (t.S.length) h += `<div class="cards">${t.S.map((c) => cardHTML(c, { key: 's', since: c.first, level: 'S' })).join('')}</div>`;
    else if (lastCards.length) {
      h += `<div class="empty">None on the ${d2(d)} close. The most recent S-tier, as the board showed it on <b>${d2(lastS)}</b>, with what happened after:</div>`;
      h += `<div class="cards">${lastCards.map((c) => cardHTML(c, { key: 'last', ghost: true, upto: lastS, after: true, asof: lastS, since: c.first, level: 'S' })).join('')}</div>`;
    } else h += `<div class="empty">None on the ${d2(d)} close.</div>`;
    h += `</section><section class="sec"><div class="sech"><span class="st">${tb('A')} A-tier</span><span class="sd">steady calls + KDJ turn + drop</span><span class="sn">${cnt.A}</span></div>`;
    h += t.A.length ? `<div class="cards">${t.A.map((c) => cardHTML(c, { key: 'a', since: c.first, level: 'A' })).join('')}</div>` : `<div class="empty">None on the ${d2(d)} close.</div>`;
    h += `</section><section class="sec"><div class="sech"><span class="st">${tb('B')} Watch</span><span class="sd">washed out and fallen, with the king or the calls already there</span><span class="sn">${cnt.B}</span></div>`;
    h += t.B.length ? `<div class="cards md">${t.B.map((c) => cardHTML(c, { key: 'b' })).join('')}</div>` : `<div class="empty">None on the ${d2(d)} close.</div>`;
    h += `</section>` + historyHTML(d) + footHTML();
    app.innerHTML = h;
    bindCards(app);
    app.querySelectorAll('.tile.last[data-go]').forEach((el) => el.onclick = () => { location.hash = href('board', el.dataset.go).slice(1); });
    app.querySelectorAll('.spk[data-sym]').forEach(async (el) => {
      if (!el.dataset.sym) return;
      try {
        const n = await nameData(el.dataset.sym);
        const p = n.path || [], i0 = Math.max(0, p.findIndex((x) => x[0] >= el.dataset.from) - 20);
        const seg = p.slice(i0), vals = seg.map((x) => x[3]), w = 140, hh = 46;
        const lo = Math.min(...vals), hi = Math.max(...vals), iS = seg.findIndex((x) => x[0] >= el.dataset.from);
        const X = (i) => (i / (vals.length - 1)) * w, Y = (v) => hh - 3 - (v - lo) / ((hi - lo) || 1) * (hh - 6);
        el.innerHTML = `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><path d="${vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="#D1D4DC" stroke-width="1.5"/>` +
          (iS >= 0 ? `<circle cx="${X(iS)}" cy="${Y(vals[iS])}" r="4" fill="#E3B341"/>` : '') + `</svg>`;
      } catch (e) {  }
    });
    const hs = app.querySelector('.hist');
    if (hs) hs.scrollLeft = hs.scrollWidth;
    app.querySelectorAll('.hn[data-sym]').forEach((el) => el.onclick = () => { location.hash = href('', S.day, el.dataset.sym).slice(1); });
    app.querySelectorAll('.hc[data-d]').forEach((el) => el.onclick = () => { location.hash = href('board', el.dataset.d).slice(1); });
  }

  function historyHTML(sel) {
    const Hh = S.board.history;
    if (!Hh || !Hh.rows.length) return '';
    const days = Hh.days;
    let g = `<div class="hgrid" style="grid-template-columns: 74px repeat(${days.length}, minmax(14px, 1fr));"><div></div>` +
      days.map((d, i) => `<div class="hd">${i % 3 === 0 || d === sel ? d2(d).replace(' ', '&nbsp;') : ''}</div>`).join('');
    Hh.rows.forEach((r) => {
      g += `<div class="hn" data-sym="${esc(r.s)}">${tb(r.best)} ${esc(r.s)}</div>`;
      g += days.map((d) => { const t = r.days[d]; return `<div class="hc ${t || ''}${d === sel ? ' sel' : ''}" data-d="${d}" title="${esc(r.s)} · ${d2(d)}${t ? ' · ' + tierName(t) : ''}"></div>`; }).join('');
    });
    g += `</div>`;
    return `<section class="sec"><div class="sech"><span class="st">Tier history</span><span class="sd">every name that reached a tier in the last ${days.length} closes · tap a square to replay that close</span><span class="sn">${Hh.rows.length} names</span></div>
      <div class="hist">${g}</div><div class="hkey"><span><i style="background:#E3B341"></i>S</span><span><i style="background:#7E57C2"></i>A</span><span><i style="background:#5C7A99"></i>Watch</span>
      <span><i style="background:#1a1e29;border:1px solid #2A2E39"></i>no tier</span><span>Chart key: <b style="color:#E3B341">♛ gold line</b> = king strike (dashed when it isn't top grade) · red shading = deep KDJ washout · <b style="color:#26a69a">▲</b> = KDJ turn · <b style="color:#4fc3f7">●</b> = Stealth top tier (○ = other Stealth tiers) · top bar = tier · prices are % moves</span></div></section>`;
  }

  function footHTML() {
    return `<div class="foot">Updated ${esc(builtWords())} · ${esc(S.board.universe)} names (S&amp;P 500, Nasdaq-100, Russell 1000) · the KDJ lands after each US close; the king node and the calls fill in overnight (US Eastern). Prices are shown as % moves; king strikes are option strikes.</div>`;
  }


  async function renderTable() {
    const t = await dayTiers(S.day);
    const list = ['S', 'A', 'B'].flatMap((k) => t[k]);
    const [sk, sd] = S.tsort;
    const val = (c) => ({ tier: LEVEL[c.tier] || 0, s: c.s, king: c.king.dist == null ? -9 : c.king.dist, kdj: c.kdj.wmax, calls: c.legs.calls === 'full' ? 2 : c.legs.calls === 'half' ? 1 : 0, dd: (c.fallen || {}).dd || 0 })[sk];
    list.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sd || (LEVEL[b.tier] - LEVEL[a.tier]) || (a.s < b.s ? -1 : 1); });
    const th = (k, l) => `<th data-k="${k}">${l}${sk === k ? (sd < 0 ? ' ↓' : ' ↑') : ''}</th>`;
    app.innerHTML = `<section class="hero"><h1>Table · ${d2(S.day)} close</h1><p class="lede">Every name on a tier on this close, one row each. Click a header to sort; click a ticker for its chart.</p></section>
      <div class="tablewrap"><table class="t"><thead><tr>${th('tier', 'Tier')}${th('s', 'Name')}${th('king', 'King node')}${th('kdj', 'KDJ')}${th('calls', 'Calls')}${th('dd', 'Off high')}<th>Needs for S</th></tr></thead><tbody>` +
      (list.length ? list.map((c) => `<tr><td>${tb(c.tier)}</td><td class="k" data-sym="${esc(c.s)}">${esc(c.s)}</td>
        <td>${c.king.k ? strike(c.king.k) + ' ' + pct(c.king.dist) + (c.king.grade ? ' · ' + esc(c.king.grade) : '') : '—'}</td>
        <td>${c.kdj.wmax}/4${c.kdj.turned ? ' · turned' : ''}</td><td>${c.calls.tier ? 'Stealth: ' + esc(callWord(c.calls.tier)) : '—'}</td>
        <td>${pct(offHigh(c))}</td><td style="white-space:normal;color:#787B86">${needs(c).map(esc).join('; ') || '—'}</td></tr>`).join('')
        : `<tr><td colspan="7" class="empty">No names on a tier on this close.</td></tr>`) + `</tbody></table></div>` + footHTML();
    app.querySelectorAll('th[data-k]').forEach((el) => el.onclick = () => { const k = el.dataset.k; S.tsort = [k, S.tsort[0] === k ? -S.tsort[1] : -1]; renderTable(); });
    app.querySelectorAll('td.k[data-sym]').forEach((el) => el.onclick = () => { location.hash = href('', S.day, el.dataset.sym).slice(1); });
  }


  async function renderName() {
    const sym = S.sym;
    let n;
    try { n = await nameData(sym); } catch (e) {
      delete S.names[sym];
      app.innerHTML = `<section class="np"><a class="back" href="${href('board', S.day)}">← Board</a><h1 style="color:#F0F3FA">${esc(sym)}</h1><p class="lede">${esc(sym)} has not reached a tier on this board yet, so it has no page here.</p></section>`;
      return;
    }
    const ds = Object.keys(n.days).filter((d) => d <= S.day).sort();
    const cdDay = n.cards[S.day] ? S.day : ds.filter((d) => n.cards[d]).pop();
    const cd = cdDay ? n.cards[cdDay] : null;
    const nd = cd ? needs(cd) : [];
    const lk = (path, label) => `<a href="../${path}">${label}</a>`;
    app.innerHTML = `<section class="np"><a class="back" href="${href('board', S.day)}">← Board</a>
      <div class="ch" style="margin-top:10px">${tb(n.days[S.day] && n.days[S.day].t, true)}<div><div class="tk" style="font-size:28px">${esc(sym)}</div><div class="nm">${esc(n.name || '')}${n.sec ? ' · ' + esc(n.sec) : ''}</div></div></div>
      <div class="links">${lk('king-gex/#s=' + encodeURIComponent(sym), 'King GEX')}${lk('stealth-calls/#s=' + encodeURIComponent(sym), 'Stealth Calls')}${lk('perfect-bottom/#stock/' + encodeURIComponent(sym), 'Perfect Bottom')}${lk('eagle-eye/?s=' + encodeURIComponent(sym), 'Eagle Eye')}</div>
      ${cd ? `<div class="cards" style="margin-top:14px;grid-template-columns:minmax(0,1fr)"><div class="card ${cd.tier || ''}" style="cursor:default">${legs(cd)}<div class="chart" id="ch-np" style="height:340px"></div>
        <div class="since">Signals as of the ${d2(cdDay)} close${cdDay !== S.day ? ' (its last day on a tier)' : ''} · ${tierName(cd.tier)}</div>
        ${nd.length && cd.tier !== 'S' ? `<div class="need">To reach S it needs <b>${nd.map(esc).join('</b>, <b>')}</b>.</div>` : ''}</div></div>` : `<div class="chart" id="ch-np"></div>`}
      <div class="grid"><table><thead><tr><th></th>${ds.map((d) => `<th>${d2(d).replace(' ', '<br>')}</th>`).join('')}</tr></thead><tbody>
        <tr><td class="lab">Tier</td>${ds.map((d) => `<td>${n.days[d].t ? `<span class="dot ${n.days[d].t}"></span>` : ''}</td>`).join('')}</tr>
        <tr><td class="lab">King grade</td>${ds.map((d) => `<td>${n.days[d].g ? esc(n.days[d].g) : '—'}</td>`).join('')}</tr>
        <tr><td class="lab">King strike</td>${ds.map((d) => `<td>${n.days[d].k ? strike(n.days[d].k) : '—'}</td>`).join('')}</tr>
        <tr><td class="lab">Washed TFs</td>${ds.map((d) => `<td>${n.days[d].w}</td>`).join('')}</tr>
        <tr><td class="lab">KDJ turned</td>${ds.map((d) => `<td><span class="dot ${n.days[d].tu ? 'on' : ''}"></span></td>`).join('')}</tr>
        <tr><td class="lab">Calls</td>${ds.map((d) => `<td>${n.days[d].ct ? esc(n.days[d].ct === 'WATCH' ? 'Watch' : n.days[d].ct) : '—'}</td>`).join('')}</tr>
        <tr><td class="lab">Off high</td>${ds.map((d) => `<td>${n.days[d].dd != null ? Math.round(n.days[d].dd * 100) + '%' : '—'}</td>`).join('')}</tr>
      </tbody></table></div></section>` + footHTML();
    drawChart($('#ch-np'), n, S.day, { big: true });
  }


  let lastView = '';
  async function render() {
    route();
    chrome();
    tip.style.display = 'none';
    const view = S.tab + '|' + (S.sym || '');
    try {
      if (S.tab === 'table') await renderTable();
      else if (S.tab === 'name') await renderName();
      else await renderBoard();
    } catch (e) {
      app.innerHTML = `<p class="lede">Could not load this view (${esc(e.message || e)}). Reload to try again.</p>`;
    }
    if (S.tab !== 'name' || view !== lastView) window.scrollTo(0, 0);
    lastView = view;
  }

  async function boot() {
    try { S.board = await getJSON('board.json'); } catch (e) {
      app.innerHTML = `<p class="lede">The board could not be loaded (${esc(e.message || e)}). Reload to try again.</p>`;
      return;
    }
    $('#find').addEventListener('change', (e) => { const v = (e.target.value || '').trim().toUpperCase(); if (v) { location.hash = href('', S.day, v).slice(1); e.target.value = ''; } });
    window.addEventListener('hashchange', render);


    let rz, lastW = document.documentElement.clientWidth;
    window.addEventListener('resize', () => {
      const w = document.documentElement.clientWidth;
      if (w === lastW) return;
      lastW = w;
      clearTimeout(rz); rz = setTimeout(redrawCharts, 220);
    });
    window.addEventListener('scroll', () => { if (tip.style.display !== 'none') tip.style.display = 'none'; }, { passive: true });
    render();
  }
  boot();
})();
