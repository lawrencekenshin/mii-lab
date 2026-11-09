



(function (root) {
  'use strict';
  const SORTS = [['d', 'Vs normal', 'Normal'], ['h', 'Last hour', 'Hour'], ['m', 'Money', 'Money'], ['l', 'Listed', 'Listed'],
                 ['n', 'Name', 'Name']];
  const KIND = {sector: 'sector', theme: 'theme', fund: 'funds', funds: 'funds'};
  const SHORT = {'Information Technology': 'Tech', 'Communication Services': 'Comm. services',
                 'Consumer Discretionary': 'Discretionary', 'Consumer Staples': 'Staples'};
  let G = 'd';
  const OPEN = new Set();
  let LAST = null;

  const ok = x => typeof x === 'number' && isFinite(x);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const mins = t => (typeof t === 'string' && /^\d\d:\d\d/.test(t) ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null);
  const pct = x => (ok(x) ? Math.round(x * 100) + '%' : '–');
  function pts(x) {
    if (!ok(x)) return '–';
    const v = Math.round(x * 100);
    return v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0';
  }
  const sgn = x => (ok(x) ? (Math.round(x * 100) > 0 ? 'up' : Math.round(x * 100) < 0 ? 'dn' : '') : '');
  function usd(n) {
    if (!ok(n)) return '–';
    const a = Math.abs(n);
    if (a >= 999.5e6) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (a >= 999.5e3) return '$' + (n / 1e6).toFixed(a >= 99.95e6 ? 0 : 1) + 'M';
    if (a >= 999.5) return '$' + (n / 1e3).toFixed(a >= 99.95e3 ? 0 : 1) + 'k';
    return '$' + Math.round(n);
  }
  function kc(n) {
    if (!ok(n)) return '–';
    const a = Math.abs(n);
    if (a >= 999.5e3) return (n / 1e6).toFixed(1) + 'M';
    if (a >= 99.95e3) return Math.round(n / 1e3) + 'k';
    if (a >= 999.5) return (n / 1e3).toFixed(1) + 'k';
    return String(Math.round(n));
  }
  const list = B => (B && B.groups && Array.isArray(B.groups.list) ? B.groups.list.filter(g => g && typeof g === 'object' && g.id) : []);
  const nameOf = g => String(g.name || g.id);


  const num = (x, dflt) => (ok(x) ? x : dflt);
  const hd = g => (g.h && ok(g.h.d) ? g.h.d : null);
  function sorted(L) {
    const byName = (a, b) => nameOf(a).localeCompare(nameOf(b));
    const nullsLast = f => (a, b) => {
      const x = f(a), y = f(b);
      if (x == null || y == null) return (x == null) - (y == null) || byName(a, b);
      return y - x || byName(a, b);
    };
    const cmp = {
      d: nullsLast(g => (ok(g.d) ? g.d : null)),
      h: nullsLast(hd),
      m: (a, b) => (num(b.mc, 0) + num(b.mp, 0)) - (num(a.mc, 0) + num(a.mp, 0)) || byName(a, b),
      l: (a, b) => (num(b.lc, 0) + num(b.lp, 0)) - (num(a.lc, 0) + num(a.lp, 0)) || (num(b.lc, 0) - num(b.lp, 0)) - (num(a.lc, 0) - num(a.lp, 0)) || byName(a, b),
      n: byName}[G] || byName;
    return L.slice().sort(cmp);
  }


  function headline(B, L, live) {
    const g = B.groups, by = {};
    for (const x of L) by[x.id] = x;
    const into = (g && g.into) || {};
    const names = ids => (Array.isArray(ids) ? ids : []).filter(id => by[id]).map(id => esc(nameOf(by[id]))).join(', ');
    const C = names(into.C), P = names(into.P), sep = '<i class="sep">·</i>';
    if (!g.ago) return live ? 'Last-hour rotation starts an hour into trading' : 'No last-hour reading for this session';
    if (!C && !P) return live ? 'No clear rotation in the last hour' : 'No clear rotation in the last hour of trading';
    if (live) return 'Rotating ' + (C ? `to calls this hour: <b class="up">${C}</b>` + (P ? `${sep}to puts: <b class="dn">${P}</b>` : '')
                                      : `to puts this hour: <b class="dn">${P}</b>`);
    return 'In the last hour of trading: ' + [C ? `to calls <b class="up">${C}</b>` : '', P ? `to puts <b class="dn">${P}</b>` : ''].filter(Boolean).join(sep);
  }
  function bar(g) {
    if (!ok(g.cs)) return '<div class="thbar none"></div>';
    const c = Math.max(0, Math.min(1, g.cs));
    const tick = ok(g.ncs) ? `<span class="tick" style="left:calc(${(Math.max(0, Math.min(1, g.ncs)) * 100).toFixed(1)}% - 1px)"></span>` : '';
    return `<div class="thbar" role="img" aria-label="${pct(c)} of new contracts are calls${ok(g.ncs) ? ', normal day ' + pct(g.ncs) : ''}">` +
      (c > 0 ? `<i class="c" style="width:${(c * 100).toFixed(1)}%"></i>` : '') + (c < 1 ? `<i class="p" style="width:${((1 - c) * 100).toFixed(1)}%"></i>` : '') +
      tick + '</div>';
  }
  function spark(g, B) {
    const marks = (B.groups && B.groups.marks) || [], sp = Array.isArray(g.spark) ? g.spark : [];
    const P = [];
    marks.forEach((t, k) => { const m = mins(t); if (m != null && ok(sp[k])) P.push([m, sp[k]]); });
    const tEnd = mins(B.groups.t);
    if (tEnd != null && ok(g.cs) && (!P.length || P[P.length - 1][0] < tEnd)) P.push([tEnd, g.cs]);
    if (!P.length) return '<span class="muted">–</span>';
    const W = 120, H = 30, t0 = 570, t1 = Math.max(960, tEnd || 0);
    const X = m => 2 + (Math.min(Math.max(m, t0), t1) - t0) / (t1 - t0) * (W - 4), Y = v => H - 2 - Math.max(0, Math.min(1, v)) * (H - 4);
    let pp = P.map(([m, v]) => [X(m), Y(v)]);
    if (pp.length === 1) pp = [[pp[0][0] - 2, pp[0][1]], [pp[0][0] + 2, pp[0][1]]];
    const f = n => n.toFixed(1);
    let s = `<svg class="thspk" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`;
    if (ok(g.ncs)) {
      const yb = Y(g.ncs), q = [];
      for (let k = 0; k < pp.length; k++) {
        if (k) {
          const [xa, ya] = pp[k - 1], [xb, yb2] = pp[k];
          if ((ya - yb) * (yb2 - yb) < 0) q.push([xa + (xb - xa) * (yb - ya) / (yb2 - ya), yb]);
        }
        q.push(pp[k]);
      }
      const area = clamp => `M${f(q[0][0])},${f(yb)}` + q.map(([x, y]) => `L${f(x)},${f(clamp(y))}`).join('') + `L${f(q[q.length - 1][0])},${f(yb)}Z`;
      s += `<path d="${area(y => Math.min(y, yb))}" fill="var(--up)" opacity=".28"/><path d="${area(y => Math.max(y, yb))}" fill="var(--dn)" opacity=".28"/>` +
        `<line x1="2" x2="${W - 2}" y1="${f(yb)}" y2="${f(yb)}" stroke="#8b8e99" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`;
    }
    s += `<path d="${pp.map(([x, y], k) => (k ? 'L' : 'M') + f(x) + ',' + f(y)).join('')}" fill="none" stroke="#d1d4dc" stroke-width="1.5" ` +
      `stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
    return s;
  }
  function chips(g, B) {
    const rows = (B && B.rows) || {}, top = g.top || {};
    const one = (s, sd) => {
      const r = rows[s], rk = r && Array.isArray(r.rk) && ok(r.rk[0]) ? `<small>${Math.round(r.rk[0])}</small>` : '';
      return `<button class="thc ${sd}" data-s="${esc(s)}" title="${esc((r && r.n) || s)}">${esc(s)}${rk}</button>`;
    };
    const C = (Array.isArray(top.C) ? top.C : []).filter(s => typeof s === 'string'), P = (Array.isArray(top.P) ? top.P : []).filter(s => typeof s === 'string');
    if (!C.length && !P.length) return '<span class="muted">none listed</span>';
    return (C.length ? `<span class="thk up" title="listed: opening calls">▲</span>${C.map(s => one(s, 'c')).join('')}` : '') +
      (P.length ? `<span class="thk dn" title="listed: opening puts">▼</span>${P.map(s => one(s, 'p')).join('')}` : '');
  }
  const listedTxt = g => `<span class="${num(g.lc, 0) ? 'up' : 'muted'}">▲${num(g.lc, 0)}</span> <span class="${num(g.lp, 0) ? 'dn' : 'muted'}">▼${num(g.lp, 0)}</span>`;
  const moneyTxt = g => `<span class="up">${usd(g.mc)}</span><span class="muted"> / </span><span class="dn">${usd(g.mp)}</span>`;
  function hourCell(g, B) {
    const h = g.h;
    if (!h || typeof h !== 'object') {
      const why = B.groups.ago ? `no name in this group was read both before ${B.groups.ago} ET and since` : 'starts an hour into trading';
      return `<td class="c-h fade" title="${why}">–</td>`;
    }
    const d = ok(h.d) ? h.d : null, s = sgn(d), arrow = s === 'up' ? '↑' : s === 'dn' ? '↓' : '→';
    const tip = `${num(h.n, 0)} names read before and after ${B.groups.ago} ET · in the hour about ${kc(h.c)} new calls, ${kc(h.p)} new puts`;
    return `<td class="c-h" title="${esc(tip)}"><span class="tarr ${s}">${d == null ? '–' : arrow + ' ' + pts(d)}</span>` +
      `<div class="tsub">${ok(h.cs) ? pct(h.cs) + '<span class="hide-s"> calls</span>' : '–'}</div></td>`;
  }
  function rowHTML(g, B, live) {
    const id = String(g.id), nm = nameOf(g), kind = KIND[g.kind] || '', open = OPEN.has(id);
    const thin = !!g.thin, tipThin = live ? 'few new contracts so far' : 'few new contracts';
    const short = SHORT[nm];
    const nameH = short ? `<span class="hide-s">${esc(nm)}</span><span class="show-s">${esc(short)}</span>` : esc(nm);
    const tag = kind && kind !== nm.toLowerCase() ? `<span class="tkind">${kind}</span>` : '';
    const cnt = `${num(g.n, 0)} of ${num(g.m, 0)} names`;
    const vs = ok(g.d) ? ` · <span class="${sgn(g.d)}">${pts(g.d)}<span class="hide-s"> vs normal</span></span>` : '';
    return `<tr class="thr${thin ? ' thin' : ''}${open ? ' open' : ''}" data-tx="${esc(id)}"${thin ? ` title="${tipThin}"` : ''}>` +
      `<td class="l c-g"><span class="tname">${nameH}</span><i class="tcar show-s" aria-hidden="true">›</i>${tag}` +
      `<div class="tsub hide-s" title="names with a reading today, of the group’s list">${cnt}</div></td>` +
      `<td class="l c-c">${bar(g)}<div class="tval"><b>${pct(g.cs)}</b><span class="hide-s"> calls</span>${vs}</div></td>` +
      hourCell(g, B) +
      `<td class="c-l">${listedTxt(g)}</td>` +
      `<td class="c-m">${moneyTxt(g)}</td>` +
      `<td class="c-s">${spark(g, B)}</td>` +
      `<td class="l c-n">${chips(g, B)}</td></tr>` +
      `<tr class="thx${thin ? ' thin' : ''}"><td colspan="4"><div class="thxi"><span>${listedTxt(g)} listed</span><span>${moneyTxt(g)} opened</span>` +
      `<span class="muted">${cnt}</span></div><div class="thxc">${chips(g, B)}</div></td></tr>`;
  }


  function html(B, o) {
    const L = list(B);
    LAST = {B, o: o || {}};
    if (!L.length) return '';
    const live = !!(o && o.live), g = B.groups;
    const th = (k, lab, cls) => `<th class="${cls}${G === k ? ' on' : ''}" data-tg="${k}">${lab}${G === k ? ' ▾' : ''}</th>`;
    const seg = SORTS.map(([k, lab, sh]) => `<button class="${G === k ? 'on' : ''}" data-tg="${k}"><span class="hide-s">${lab}</span><span class="show-s">${sh}</span></button>`).join('');
    const since = g.ago ? `since ${esc(g.ago)} ET (trade time)` : 'over the last hour of trades';
    return `<section class="sec wrap" id="themes"><div class="box thbox">` +
      `<div class="sh"><h2>Themes &amp; rotation</h2><span>calls vs puts opened ${live ? 'today' : 'in the session'} in each group of names, against the group’s normal day</span></div>` +
      `<div class="thhl">${headline(B, L, live)}</div>` +
      `<div class="thctl"><span class="muted hide-s">Sort</span><div class="seg" role="tablist">${seg}</div></div>` +
      `<div class="thtw"><table class="thm"><thead><tr>` +
      th('n', 'Group', 'l c-g') + th('d', 'Calls today', 'l c-c') + th('h', 'Last hour', 'c-h') + th('l', 'Listed', 'c-l') + th('m', 'Money', 'c-m') +
      '<th class="c-s">Through the day</th><th class="l c-n">Names</th></tr></thead><tbody>' +
      sorted(L).map(x => rowHTML(x, B, live)).join('') + '</tbody></table></div>' +
      `<div class="leg"><span>bar = share of today’s new contracts that are calls, white tick = the group’s normal day</span>` +
      `<span>last hour = the change in that share, ${since}, the same names at both ends</span>` +
      `<span>line = the share through the day, dashed = normal</span><span>faded = few new contracts${live ? ' so far' : ''}</span>` +
      `<span class="show-s">tap a row for its names</span></div></div></section>`;
  }


  function read(h) { const v = h && h.get ? h.get('g') : null; G = SORTS.some(s => s[0] === v) ? v : 'd'; }
  function write(h) { if (G !== 'd' && h && h.set) h.set('g', G); }
  function redraw() {
    if (!LAST || typeof document === 'undefined') return;
    const sec = document.getElementById('themes');
    if (sec) sec.outerHTML = html(LAST.B, LAST.o) || '';
  }
  function bind(hooks) {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    document.addEventListener('click', ev => {
      const t = ev.target && ev.target.closest ? ev.target.closest('[data-tg],[data-tx],[data-s]') : null;
      if (!t || t.hasAttribute('data-s')) return;
      if (t.hasAttribute('data-tg')) {
        const k = t.getAttribute('data-tg');
        if (!SORTS.some(s => s[0] === k)) return;
        G = k;
        if (hooks && hooks.state) hooks.state();
        redraw();
        return;
      }
      if (typeof matchMedia === 'function' && !matchMedia('(max-width:760px)').matches) return;
      const id = t.getAttribute('data-tx');
      if (OPEN.has(id)) OPEN.delete(id); else OPEN.add(id);
      t.classList.toggle('open', OPEN.has(id));
    });
  }

  const API = {html, read, write, bind, sortKey: () => G};
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  if (root) root.ISThemes = API;
})(typeof window !== 'undefined' ? window : null);
