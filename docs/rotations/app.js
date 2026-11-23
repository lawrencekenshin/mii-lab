'use strict';




(function (root) {
  const HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
  const HS = ['1Y+', '6M', '3M'];
  const VIEWS = ['map', 'g', 'rec'];
  const KS = [['all', 'All'], ['sec', 'Sectors'], ['th', 'Themes']];
  const LIVE = HAS_DOM && location.hostname === 'lawrencekenshin.github.io';
  const BASE = LIVE ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/rotations-data/rotations/' : './snap/';
  const HUNT = '../gex-hunt/';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const M = '−';
  const QUAD = { lead_calls: ['Leading', 'calls stacked'], lag_calls: ['Lagging', 'calls stacked'],
                 lag_puts: ['Lagging', 'puts stacked'], lead_puts: ['Leading', 'puts stacked'] };
  const DIVW = { calls: 'calls stacked while lagging', puts: 'puts stacked while leading' };
  const SHORT = { 'sec:information-technology': 'Info Tech', 'sec:communication-services': 'Comm Services',
                  'sec:consumer-discretionary': 'Cons Disc', 'sec:consumer-staples': 'Cons Staples' };
  const KCOL = { sector: '#4f86f7', theme: '#b39dff', fund: '#a0a4ae' };
  const KMARK = { sector: '●', theme: '◆', fund: '■' };
  const SORTS = { tilt: 'tilt_rel', r20: 'rel20', r5: 'rel5', cp: 'cp' };
  const SORT_NAMES = [['tilt', 'Tilt'], ['r20', 'Move vs board 20d'], ['r5', 'Move vs board 5d'], ['cp', 'Calls share']];
  const MSORTS = [['list', 'On a list'], ['lean', 'Lean'], ['cp', 'Calls share'], ['r1', '1d'], ['r5', '5d'], ['r20', '20d']];

  const store = {
    get(k, d) { try { const v = root.localStorage.getItem('rot.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { root.localStorage.setItem('rot.' + k, JSON.stringify(v)); } catch (e) {  } },
  };
  const S = { v: 'map', id: null, h: store.get('h', '1Y+'), k: store.get('k', 'all'), sort: store.get('sort', 'tilt'),
              dir: store.get('dir', -1), msort: store.get('msort', 'list'), mdir: store.get('mdir', -1) };
  function clean() {
    if (!HS.includes(S.h)) S.h = '1Y+';
    if (!KS.some(k => k[0] === S.k)) S.k = 'all';
    if (!SORTS[S.sort]) S.sort = 'tilt';
    if (S.dir !== 1 && S.dir !== -1) S.dir = -1;
    if (!MSORTS.some(m => m[0] === S.msort)) S.msort = 'list';
    if (S.mdir !== 1 && S.mdir !== -1) S.mdir = -1;
    if (!VIEWS.includes(S.v)) S.v = 'map';
    if (S.v === 'g' && !S.id) S.v = 'map';
  }
  clean();

  let D = null, BUILT = null, STATUS = null, FORCE_W = null, FORCE_NARROW = null;
  const $ = s => HAS_DOM ? document.querySelector(s) : null;
  const NARROW = () => FORCE_NARROW != null ? FORCE_NARROW : HAS_DOM ? window.innerWidth < 760 : false;
  function boxW() {
    if (FORCE_W) return FORCE_W;
    const m = $('#main');
    const w = m && m.clientWidth ? m.clientWidth : HAS_DOM ? window.innerWidth : 1200;
    return Math.max(280, Math.min(w, 2400) - (NARROW() ? 20 : 28));
  }


  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const signed = (v, t) => (+t === 0 ? '' : v > 0 ? '+' : M) + t;
  const ok = v => v != null && Number.isFinite(v);
  const tp = (v, d = 1) => ok(v) ? signed(v, Math.abs(v * 100).toFixed(d)) : '–';
  const rp = (v, d = 1) => ok(v) ? signed(v, Math.abs((Math.exp(v) - 1) * 100).toFixed(d)) + '%' : '–';
  const pc = (v, d = 1) => ok(v) ? signed(v, Math.abs(v * 100).toFixed(d)) + '%' : '–';
  const shr = v => ok(v) ? Math.round(v * 100) + '%' : '–';
  const ln2 = v => ok(v) ? signed(v, Math.abs(v).toFixed(2)) : '–';
  const cc = v => !ok(v) || v === 0 ? '' : v > 0 ? 'up' : 'dn';
  const plain = v => ok(v) ? signed(v, Math.abs(v * 100).toFixed(1)) : '–';
  function arrow(v, d = 1, unit = '', tip = '') {
    const t0 = tip ? ` title="${esc(tip)}"` : '';
    if (!ok(v)) return `<span class="muted"${t0}>–</span>`;
    const t = Math.abs(v * 100).toFixed(d);
    if (+t === 0) return `<span class="muted"${t0}>=</span>`;
    return `<span class="${v > 0 ? 'up' : 'dn'}"${t0}>${v > 0 ? '▲' : '▼'}${t}${unit}</span>`;
  }
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
  const kindTag = k => `<span class="kt ${esc(k)}">${esc(k)}</span>`;
  const kindMark = k => `<span class="km ${esc(k)}">${KMARK[k] || '●'}</span>`;
  const quadText = q => QUAD[q] ? QUAD[q].join(' · ') : '–';
  const quadHTML = q => QUAD[q] ? `<span class="qd">${QUAD[q][0]} · <span class="${QUAD[q][1].startsWith('calls') ? 'up' : 'dn'}">${QUAD[q][1]}</span></span>` : '–';
  const dvPts = () => 8;
  const huntUrl = (s, neg) => `${HUNT}#v=detail&s=${encodeURIComponent(s)}&h=${encodeURIComponent(S.h)}&x=${neg ? 'neg' : 'pos'}`;
  const shortName = r => SHORT[r.id] || r.name;
  function niceStep(m, n) {
    const raw = m / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10) * p;
  }
  const tlab = (v, unit) => (v > 1e-9 ? '+' : v < -1e-9 ? M : '') + String(+Math.abs(v).toFixed(2)) + unit;
  const f1 = v => (Math.round(v * 10) / 10).toString();


  function setData(d) { D = d; BUILT = d && d.built; }
  const ser = (id, H = S.h) => ((D.series || {})[H] || {})[id] || [];
  const todayRows = (H = S.h) => (D.today || {})[H] || [];
  const inFilter = kind => S.k === 'all' || (S.k === 'sec' && kind === 'sector') || (S.k === 'th' && kind === 'theme');
  const rowsShown = () => todayRows().filter(r => inFilter(r.kind));
  const grp = id => (D.groups || []).find(g => g.id === id) || null;


  function move(id, key, H = S.h) {
    const s = ser(id, H);
    for (let i = s.length - 1; i >= 0; i--) if (ok(s[i][key])) return { v: s[i][key], day: s[i].day, old: i < s.length - 1 };
    return { v: null, day: null, old: false };
  }
  function moveHTML(id, key) {
    const m = move(id, key);
    if (!ok(m.v)) return '<span class="muted">–</span>';
    return `<span class="${cc(m.v)}${m.old ? ' old' : ''}"${m.old ? ` title="as of the ${day(m.day)} close"` : ''}>${rp(m.v)}</span>`;
  }
  function flipped(id, r) {
    const s = ser(id);
    const p = s.length > 1 ? s[s.length - 2] : null;
    return p && (p.tilt_rel > 0) !== (r.tilt_rel > 0) ? (r.tilt_rel > 0 ? 'calls' : 'puts') : null;
  }
  function divRun(id) {
    const s = ser(id);
    if (!s.length || !s[s.length - 1].div) return 0;
    let k = s.length - 1;
    while (k > 0 && s[k - 1].div === s[s.length - 1].div) k--;
    return s.length - k;
  }

  function cols() {
    const out = [];
    for (const p of D.points || []) {
      if (out.length && out[out.length - 1].day === p.day) out[out.length - 1] = p;
      else out.push(p);
    }
    return out;
  }
  function divRuns(s) {
    const runs = [];
    let cur = null;
    for (const p of s) {
      if (p.div && cur && cur.kind === p.div) { cur.end = p.day; cur.n++; continue; }
      if (cur) runs.push(cur);
      cur = p.div ? { kind: p.div, start: p.day, end: p.day, n: 1 } : null;
    }
    if (cur) runs.push(cur);
    return runs;
  }


  function hashOf(st = S) {
    const p = ['v=' + st.v];
    if (st.v === 'g') p.push('id=' + encodeURIComponent(st.id || '').replace(/%3A/gi, ':'));
    p.push('h=' + encodeURIComponent(st.h));
    if (st.v !== 'rec') p.push('k=' + st.k);
    return '#' + p.join('&');
  }
  function readHash(hs) {
    const p = new URLSearchParams(String(hs || '').replace(/^#/, ''));
    const v = p.get('v');
    S.v = VIEWS.includes(v) ? v : 'map';
    let h = p.get('h');
    if (h != null && /^1Y\s*$/.test(h)) h = '1Y+';
    if (HS.includes(h)) S.h = h;
    const k = p.get('k');
    if (KS.some(x => x[0] === k)) S.k = k;
    S.id = p.get('id');
    clean();
  }
  function go(ch, push) {
    Object.assign(S, ch);
    clean();
    store.set('h', S.h); store.set('k', S.k);
    if (!HAS_DOM) return;
    const h = hashOf();
    if (h !== location.hash) {
      try { history[push ? 'pushState' : 'replaceState'](null, '', h); } catch (e) { location.hash = h; }
    }
    render();
    if (push) window.scrollTo(0, 0);
  }


  function statusHTML() {
    if (!D) return '';
    const age = (Date.now() - Date.parse(D.built)) / 36e5;
    const err = STATUS && STATUS.ok === false;
    const cls = err ? 'err' : age > 26 ? 'stale' : '';
    const tip = `built ${stamp(D.built)}` + (err ? ` · the last build failed: ${STATUS.error || 'error'}` : '') +
      (D.live ? ` · the newest point is GEX Hunt's live board (${day(D.day)} close, OI ${day(D.settle)} settle), newer than the ${day(D.saved_day)} evening save`
              : ` · newest saved evening day ${day(D.saved_day)}`) + ` · history from ${day(D.first_day)}`;
    return `<span id="status" title="${esc(tip)}"><b class="${cls}"></b>${day(D.day)} close · OI ${day(D.settle)} settle${D.live ? '<span class="badge live">live</span>' : ''}</span>`;
  }
  function barHTML() {
    const tab = (v, t) => `<button class="tab ${S.v === v || (v === 'map' && S.v === 'g') ? 'on' : ''}" data-v="${v}">${t}</button>`;
    return `<span id="brand">ROTATIONS</span>` + tab('map', 'Map') + tab('rec', 'Record') + `<span class="sep"></span>` +
      `<span class="cg">${HS.map(h => `<button class="chip ${S.h === h ? 'on' : ''}" data-h="${esc(h)}">${h}</button>`).join('')}</span>` +
      (S.v === 'map' ? `<span class="sep"></span><span class="cg">` + KS.map(([k, t]) => `<button class="chip ${S.k === k ? 'on' : ''}" data-k="${k}">${t}</button>`).join('') + '</span>' : '') +
      statusHTML();
  }


  function shiftsHTML(rows) {
    const list = rows.filter(r => r.shift || r.div)
      .sort((a, b) => (!!b.div - !!a.div) || (Math.abs(b.chg1 || 0) - Math.abs(a.chg1 || 0)));
    if (!list.length) {
      if (S.k === 'all') return `<div class="noshift">No shifts on the ${day(D.day)} board</div>`;
      const other = todayRows().filter(r => !inFilter(r.kind) && (r.shift || r.div)).length;
      return `<div class="noshift">No shifts among ${S.k === 'sec' ? 'sectors' : 'themes'} on the ${day(D.day)} board${other ? ` · ${other} in other groups (<button class="lnk" data-k="all">show all</button>)` : ''}</div>`;
    }
    return `<div class="h2"><b>Shifts</b><span>a big one-session move in the tilt, a change of sign, or a divergence · ${day(D.day)}${D.live ? ' live' : ''} board</span></div>` +
      `<div class="shifts">${list.map(shiftCard).join('')}</div>`;
  }
  function shiftCard(r) {
    const fl = flipped(r.id, r), m20 = move(r.id, 'rel20'), run = divRun(r.id);
    let why = '';
    if (fl) why += `<div class="sw am">flipped to ${fl} stacked</div>`;
    else if (r.shift && ok(r.chg1)) why += `<div class="sw am">tilt ${r.chg1 > 0 ? 'up' : 'down'} ${Math.abs(r.chg1 * 100).toFixed(1)} pts in one session</div>`;
    if (r.div) why += `<div class="sw kg">${DIVW[r.div]} since ${day(r.div_since)}${run > 1 ? ` · ${run} sessions` : ''}</div>`;
    return `<div class="scard${r.div ? ' dv' : ''}" data-go="${esc(r.id)}" tabindex="0">` +
      `<div class="r1"><b>${esc(r.name)}</b>${kindTag(r.kind)}${r.shift ? '<span class="badge sh">shift</span>' : ''}</div>` +
      `<div class="r2"><span class="big ${cc(r.tilt_rel)}">${tp(r.tilt_rel)}</span><span class="muted wd">tilt</span>${arrow(r.chg1, 1, '', 'change in one session')}<span class="muted wd">1 session</span></div>` +
      why + `<div class="r4">20 sessions vs board <b class="${cc(m20.v)}${m20.old ? ' old' : ''}">${rp(m20.v)}</b></div></div>`;
  }




  function placeLabels(items, bounds, fixed) {
    const out = [], taken = (fixed || []).slice();
    const dots = items.map(it => [it.x - it.r, it.y - it.r, it.x + it.r, it.y + it.r]);
    const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    items.forEach((it, k) => {
      const g = it.r + 3, h = it.h || 12;
      const C = [[g, 4, 'start'], [-g, 4, 'end'], [0, -g - 3, 'middle'], [0, g + h - 1, 'middle'],
                 [g, -h + 3, 'start'], [g, h + 2, 'start'], [-g, -h + 3, 'end'], [-g, h + 2, 'end'],
                 [g + 10, 4, 'start'], [-g - 10, 4, 'end'], [0, -g - h - 4, 'middle'], [0, g + 2 * h + 2, 'middle']];
      let best = null;
      C.forEach(([dx, dy, a], ci) => {
        const tx = it.x + dx, ty = it.y + dy;
        const x0 = a === 'start' ? tx : a === 'end' ? tx - it.w : tx - it.w / 2;
        const b = [x0, ty - h + 3, x0 + it.w, ty + 3];
        let pen = ci * 0.5;
        if (b[0] < bounds[0] || b[2] > bounds[2] || b[1] < bounds[1] || b[3] > bounds[3]) pen += 5000;
        for (const t of taken) pen += ov(b, t) * 3;
        dots.forEach((d, j) => { if (j !== k) pen += ov(b, d) * 2; });
        if (!best || pen < best.pen) best = { pen, tx, ty, a, b };
      });
      taken.push(best.b);
      out.push({ x: best.tx, y: best.ty, anchor: best.a, box: best.b });
    });
    return out;
  }
  function markShape(kind, x, y, r, col, cls = 'mk') {
    const X = x.toFixed(1), Y = y.toFixed(1);
    if (kind === 'theme') { const q = r * 1.3;
      return `<path class="${cls}" d="M${X},${(y - q).toFixed(1)}L${(x + q).toFixed(1)},${Y}L${X},${(y + q).toFixed(1)}L${(x - q).toFixed(1)},${Y}Z" fill="${col}"/>`; }
    if (kind === 'fund') return `<rect class="${cls}" x="${(x - r * 0.9).toFixed(1)}" y="${(y - r * 0.9).toFixed(1)}" width="${(r * 1.8).toFixed(1)}" height="${(r * 1.8).toFixed(1)}" rx="1.5" fill="${col}"/>`;
    return `<circle class="${cls}" cx="${X}" cy="${Y}" r="${r}" fill="${col}"/>`;
  }
  function mapItems(rows) {
    const items = [], unplaced = [];
    for (const r of rows) {
      const m20 = move(r.id, 'rel20');
      if (!ok(m20.v) || !ok(r.tilt_rel)) { unplaced.push(r); continue; }
      const s = ser(r.id);
      const prev = s.slice(Math.max(0, s.length - 6), Math.max(0, s.length - 1))
        .filter(p => ok(p.rel20) && ok(p.tilt_rel)).map(p => ({ x: (Math.exp(p.rel20) - 1) * 100, y: p.tilt_rel * 100, day: p.day }));
      items.push({ r, m20, cur: { x: (Math.exp(m20.v) - 1) * 100, y: r.tilt_rel * 100 }, tail: prev });
    }

    items.sort((a, b) => ((b.r.div ? 2 : 0) + (b.r.shift ? 1 : 0)) - ((a.r.div ? 2 : 0) + (a.r.shift ? 1 : 0)) || a.cur.x - b.cur.x);
    return { items, unplaced };
  }
  function mapSVG(rows, W) {
    const narrow = W < 560, dv = dvPts();
    const HT = Math.round(Math.max(300, Math.min(560, W * (narrow ? 0.98 : 0.6))));
    const ML = narrow ? 34 : 44, MR = 10, MT = 10, MB = narrow ? 34 : 38;
    const X0 = ML, X1 = W - MR, Y0 = MT, Y1 = HT - MB;
    const { items } = mapItems(rows);
    let xm = 4, ym = Math.max(12, dv * 1.6);
    for (const it of items) for (const p of it.tail.concat([it.cur])) { xm = Math.max(xm, Math.abs(p.x) * 1.1); ym = Math.max(ym, Math.abs(p.y) * 1.1); }
    const sx = v => X0 + (v + xm) / (2 * xm) * (X1 - X0), sy = v => Y1 - (v + ym) / (2 * ym) * (Y1 - Y0);
    const zx = sx(0), zy = sy(0), dP = sy(dv), dN = sy(-dv);
    let s = `<svg class="map${narrow ? ' narrow' : ''}" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}" role="img" aria-label="Rotation map">`;

    s += `<rect class="dz" x="${X0}" y="${Y0}" width="${(zx - X0).toFixed(1)}" height="${Math.max(0, dP - Y0).toFixed(1)}"/>`;
    s += `<rect class="dz" x="${zx.toFixed(1)}" y="${dN.toFixed(1)}" width="${(X1 - zx).toFixed(1)}" height="${Math.max(0, Y1 - dN).toFixed(1)}"/>`;

    const xs = niceStep(xm, narrow ? 2 : 3), ys = niceStep(ym, narrow ? 2 : 3);
    for (let k = -Math.floor(xm / xs); k <= Math.floor(xm / xs); k++) {
      const t = k * xs, x = sx(t).toFixed(1);
      if (k) s += `<line class="grid" x1="${x}" x2="${x}" y1="${Y0}" y2="${Y1}"/>`;
      s += `<text class="tk" x="${x}" y="${Y1 + 14}" text-anchor="middle">${tlab(t, '%')}</text>`;
    }
    for (let k = -Math.floor(ym / ys); k <= Math.floor(ym / ys); k++) {
      const t = k * ys, y = sy(t).toFixed(1);
      if (k) s += `<line class="grid" x1="${X0}" x2="${X1}" y1="${y}" y2="${y}"/>`;
      s += `<text class="tk" x="${X0 - 5}" y="${(+y + 3.5).toFixed(1)}" text-anchor="end">${tlab(t, '')}</text>`;
    }
    s += `<line class="zero" x1="${zx.toFixed(1)}" x2="${zx.toFixed(1)}" y1="${Y0}" y2="${Y1}"/><line class="zero" x1="${X0}" x2="${X1}" y1="${zy.toFixed(1)}" y2="${zy.toFixed(1)}"/>`;
    s += `<line class="dl" x1="${X0}" x2="${X1}" y1="${dP.toFixed(1)}" y2="${dP.toFixed(1)}"/><line class="dl" x1="${X0}" x2="${X1}" y1="${dN.toFixed(1)}" y2="${dN.toFixed(1)}"/>`;
    s += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="none" stroke="#2a2e39"/>`;

    const qh = narrow ? 11 : 12, cw = narrow ? 5.2 : 6;
    const fixed = [];
    const ql = (x, y, anchor, a, b, zone) => {
      const w = (a.length + b.length + 3) * cw;
      const bx = anchor === 'end' ? x - w : x;
      fixed.push([bx, y - qh + 3, bx + w, y + 3]);
      let t = `<text class="ql" x="${x}" y="${y}" text-anchor="${anchor}">${a} · <tspan class="${b.startsWith('calls') ? 'qu' : 'qn'}">${b}</tspan></text>`;
      if (zone) {
        const zy2 = zone === 'below' ? y + qh + 1 : y - qh - 1;
        const zw = 15 * (narrow ? 4.8 : 5.4);
        fixed.push([anchor === 'end' ? x - zw : x, zy2 - qh + 3, anchor === 'end' ? x : x + zw, zy2 + 3]);
        t += `<text class="dzl" x="${x}" y="${zy2}" text-anchor="${anchor}">divergence zone</text>`;
      }
      return t;
    };
    s += ql(X1 - 6, Y0 + 14, 'end', 'Leading', 'calls stacked');
    s += ql(X0 + 6, Y0 + 14, 'start', 'Lagging', 'calls stacked', 'below');
    s += ql(X0 + 6, Y1 - 7, 'start', 'Lagging', 'puts stacked');
    s += ql(X1 - 6, Y1 - 7, 'end', 'Leading', 'puts stacked', 'above');

    s += `<text class="ax" x="${((X0 + X1) / 2).toFixed(1)}" y="${HT - 6}" text-anchor="middle">${narrow ? 'move vs the board, 20 sessions' : 'move vs the board over the last 20 sessions (lagging ← · → leading)'}</text>`;
    s += `<text class="ax" transform="translate(${narrow ? 10 : 12},${((Y0 + Y1) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${narrow ? 'tilt, pts' : 'tilt, pts (+ calls stacked · − puts stacked)'}</text>`;

    for (const it of items) {
      const col = KCOL[it.r.kind] || KCOL.sector, pts = it.tail.concat([it.cur]);
      if (pts.length > 1) s += `<polyline class="tl" stroke="${col}" points="${pts.map(p => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')}"/>`;
      it.tail.forEach((p, i) => { s += `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="1.8" fill="${col}" opacity="${(0.25 + 0.45 * (i + 1) / (it.tail.length + 1)).toFixed(2)}"/>`; });
    }

    const R = narrow ? 4.6 : 5.6;
    for (const it of items) {
      const r = it.r, x = sx(it.cur.x), y = sy(it.cur.y), col = KCOL[r.kind] || KCOL.sector;
      const tip = `${r.name} (${r.kind}, ${r.n} names) · tilt ${tp(r.tilt_rel)} pts` + (ok(r.chg1) ? ` (${plain(r.chg1)} in one session)` : '') +
        ` · ${r.c} on the call list, ${r.p} on the put list · 20 sessions vs board ${rp(it.m20.v)}${it.m20.old ? ` (as of ${day(it.m20.day)})` : ''}` +
        ` · ${quadText(r.quad)}` + (r.div ? ` · ${DIVW[r.div]} since ${day(r.div_since)}` : '') + (r.shift ? ' · shift today' : '');
      s += `<g class="dot" data-go="${esc(r.id)}" tabindex="0"><title>${esc(tip)}</title>` +
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R + 8}" fill="transparent"/>` +
        (r.div ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(R + 4.5).toFixed(1)}" fill="none" stroke="#f5d63d" stroke-width="1.7"/>` : '') +
        (r.shift ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(R + (r.div ? 8 : 4.5)).toFixed(1)}" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="2.5 2"/>` : '') +
        markShape(r.kind, x, y, R, col) + '</g>';
    }

    const fs = narrow ? 5.9 : 6.5;
    const lab = items.map(it => ({ x: sx(it.cur.x), y: sy(it.cur.y), r: R + (it.r.div || it.r.shift ? 5 : 1), w: shortName(it.r).length * fs + 4, h: 12 }));
    const pos = placeLabels(lab, [X0 + 1, Y0 + 1, X1 - 1, Y1 - 1], fixed);
    items.forEach((it, i) => {
      const p = pos[i];
      s += `<text class="lb${it.r.div ? ' dv' : it.r.shift ? ' sh' : ''}" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="${p.anchor}">${esc(shortName(it.r))}</text>`;
    });
    return s + '</svg>';
  }
  function mapLegend() {
    const g = (k) => `<svg width="12" height="12" viewBox="0 0 12 12">${markShape(k, 6, 6, 4, KCOL[k], 'x')}</svg>`;
    return `<div class="legend">${S.k !== 'th' ? `<span>${g('sector')}sector</span>` : ''}${S.k !== 'sec' ? `<span>${g('theme')}theme</span>` : ''}${S.k === 'all' ? `<span>${g('fund')}funds</span>` : ''}` +
      `<span><svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="#f5d63d" stroke-width="1.6"/></svg>in a divergence</span>` +
      `<span><svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="2.5 2"/></svg>shift today</span>` +
      `<span><svg width="22" height="8" viewBox="0 0 22 8"><line x1="0" x2="22" y1="4" y2="4" stroke="#8a7a2a" stroke-dasharray="4 3"/></svg>the divergence line</span>` +
      `<span><svg width="22" height="8" viewBox="0 0 22 8"><polyline points="1,6 8,3 14,5 21,2" fill="none" stroke="#8a8e99"/></svg>previous 5 sessions</span></div>`;
  }


  function heatCell(p, name) {
    if (!p) return '<td class="hc na"></td>';
    const a = Math.min(1, Math.abs(p.tilt_rel) / 0.3), al = (0.1 + 0.8 * a).toFixed(2);
    const bg = p.tilt_rel >= 0 ? `rgba(38,166,154,${al})` : `rgba(239,83,80,${al})`;
    const t = `${name} · ${day(p.day)}${p.src === 'live' ? ' live' : ''} · tilt ${tp(p.tilt_rel)} pts` + (ok(p.chg1) ? ` (${plain(p.chg1)} in one session)` : '') +
      ` · ${p.c} on the call list, ${p.p} on the put list of ${p.n} · lean ${ln2(p.lean_rel)} · calls share ${shr(p.cp)}` +
      ` · 20 sessions vs board ${rp(p.rel20)}` + (p.div ? ` · ${DIVW[p.div]}` : '') + (p.shift ? ' · shift' : '');
    return `<td class="hc${p.shift ? ' sh' : ''}" style="background:${bg}" title="${esc(t)}">${p.div ? '<i></i>' : ''}</td>`;
  }
  function heatHTML(rows) {
    const C = cols();
    const sorted = rows.slice().sort((a, b) => b.tilt_rel - a.tilt_rel);
    const months = [];
    C.forEach(p => { const m = p.day.slice(0, 7); if (months.length && months[months.length - 1].m === m) months[months.length - 1].n++; else months.push({ m, n: 1 }); });
    let h = `<div class="hs-wrap"><table class="heat"><thead><tr><th class="lab"></th>` +
      months.map(x => `<th class="mo" colspan="${x.n}">${x.n >= 2 ? MON[+x.m.slice(5) - 1] : ''}</th>`).join('') + `<th></th></tr>` +
      `<tr><th class="lab muted">${sorted.length} groups</th>` +
      C.map(p => `<th class="dd${p.src === 'live' ? ' lv' : ''}" title="${esc(`${day(p.day)} close${p.settle ? ` · OI ${day(p.settle)} settle` : ''}${p.src === 'live' ? " · GEX Hunt's live board" : ''}`)}">${p.src === 'live' ? 'live' : +p.day.slice(8)}</th>`).join('') +
      `<th class="nowh">now</th></tr></thead><tbody>`;
    for (const r of sorted) {
      const m = new Map(ser(r.id).map(p => [p.day, p]));
      h += `<tr><th class="lab" data-go="${esc(r.id)}" title="${esc(r.name)}">${kindMark(r.kind)}${esc(shortName(r))}</th>` +
        C.map(c => heatCell(m.get(c.day), r.name)).join('') + `<td class="now ${cc(r.tilt_rel)}">${tp(r.tilt_rel)}</td></tr>`;
    }
    return h + '</tbody></table></div>';
  }


  function sparkBars(vals, w = 92, h = 24) {
    const n = vals.length;
    if (!n) return '<span class="muted">–</span>';
    const mx = Math.max(0.1, ...vals.map(v => Math.abs(v || 0))), bw = w / n, mid = h / 2;
    let s = `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><line x1="0" x2="${w}" y1="${mid}" y2="${mid}" stroke="#363a45"/>`;
    vals.forEach((v, i) => {
      if (!ok(v)) return;
      const bh = Math.max(1, Math.abs(v) / mx * (mid - 1));
      s += `<rect x="${(i * bw + 0.4).toFixed(1)}" y="${(v >= 0 ? mid - bh : mid).toFixed(1)}" width="${Math.max(0.8, bw - 0.8).toFixed(1)}" height="${bh.toFixed(1)}" fill="${v >= 0 ? '#26a69a' : '#ef5350'}"/>`;
    });
    return s + '</svg>';
  }
  function sparkLine(vals, w = 92, h = 24) {
    const pts = vals.map((v, i) => [i, v]).filter(p => ok(p[1]));
    if (pts.length < 2) return '<span class="muted">–</span>';
    const lo = Math.min(0, ...pts.map(p => p[1])), hi = Math.max(0, ...pts.map(p => p[1])), rg = hi - lo || 1;
    const X = i => 1 + i / Math.max(1, vals.length - 1) * (w - 2), Y = v => h - 2 - (v - lo) / rg * (h - 4);
    const last = pts[pts.length - 1][1];
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><line x1="0" x2="${w}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="#363a45" stroke-dasharray="2 2"/>` +
      `<polyline points="${pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${last >= 0 ? '#26a69a' : '#ef5350'}" stroke-width="1.4"/></svg>`;
  }

  function priceOverSeries(id) {
    const s = ser(id), pm = new Map((D.price || {})[id] || []);
    const base = s.map(p => pm.get(p.day)).find(ok);
    if (!ok(base)) return [];
    return s.map(p => ok(pm.get(p.day)) ? Math.exp(pm.get(p.day) - base) - 1 : null);
  }
  function sortRows(rows) {
    const key = SORTS[S.sort];
    const val = r => key === 'rel20' || key === 'rel5' ? move(r.id, key).v : r[key];
    return rows.slice().sort((a, b) => {
      const x = val(a), y = val(b);
      if (!ok(x) && !ok(y)) return 0;
      if (!ok(x)) return 1;
      if (!ok(y)) return -1;
      return S.dir * (x - y);
    });
  }
  function divCell(r) {
    if (!r.div) return '<span class="muted">–</span>';
    const n = divRun(r.id);
    return `<span class="dvw">${DIVW[r.div]}</span><div class="sub2">since ${day(r.div_since)}${n > 1 ? ` · ${n} sessions` : ''}</div>`;
  }
  function tableHTML(rows) {
    const sorted = sortRows(rows), first = day(D.first_day);
    const th = (label, key, cls = '', tip = '') => {
      const [main, sub = ''] = label.split(/(?=<div class="thsub">)/);
      return key
        ? `<th class="sortable ${cls} ${S.sort === key ? 'on' : ''}" data-sort="${key}" title="${esc(tip)}">${main}${S.sort === key ? `<span class="ar">${S.dir < 0 ? '▼' : '▲'}</span>` : ''}${sub}</th>`
        : `<th class="${cls}" title="${esc(tip)}">${label}</th>`;
    };
    let h = `<div class="tw"><table class="grid"><thead><tr>` + th('Group') + th('Names', null, 'r', 'members with data') +
      th('Lists<div class="thsub">call / put</div>', null, 'r', 'names on the call list / on the put list') +
      th('Tilt', 'tilt', '', 'call-list share minus put-list share, minus the board’s, in points; change vs 1 and 5 sessions earlier') +
      th('Lean', null, 'r', 'median log ratio of the call GEX stack above to the put GEX stack below, minus the board’s') +
      th('Calls<div class="thsub">share · 1W</div>', 'cp', '', 'median share of open contracts that are calls; change over a week') +
      th('1d<div class="thsub">vs board</div>', null, 'r', 'move vs the board, last session') + th('5d<div class="thsub">vs board</div>', 'r5', 'r', 'move vs the board, last 5 sessions') +
      th('20d<div class="thsub">vs board</div>', 'r20', 'r', 'move vs the board, last 20 sessions') + th('Quadrant') + th('Divergence') +
      th(`Tilt<div class="thsub">since ${first}</div>`) + th(`Vs board<div class="thsub">since ${first}</div>`) + `</tr></thead><tbody>`;
    for (const r of sorted) {
      h += `<tr class="row" data-go="${esc(r.id)}">` +
        `<td><span class="gn">${esc(r.name)}</span>${kindTag(r.kind)}${r.shift ? '<span class="badge sh">shift</span>' : ''}</td>` +
        `<td class="r muted">${r.n}</td><td class="r"><span class="up">${r.c}</span> / <span class="dn">${r.p}</span></td>` +
        `<td><span class="tv ${cc(r.tilt_rel)}">${tp(r.tilt_rel)}</span><span class="chg">${arrow(r.chg1, 1, '', 'vs 1 session earlier')}${arrow(r.chg5, 1, '', 'vs 5 sessions earlier')}</span></td>` +
        `<td class="r ${cc(r.lean_rel)}">${ln2(r.lean_rel)}</td>` +
        `<td>${shr(r.cp)} <span class="chg">${arrow(r.cpc, 1, 'pt', 'change over a week')}</span></td>` +
        `<td class="r">${moveHTML(r.id, 'rel1')}</td><td class="r">${moveHTML(r.id, 'rel5')}</td><td class="r">${moveHTML(r.id, 'rel20')}</td>` +
        `<td>${quadHTML(r.quad)}</td><td>${divCell(r)}</td>` +
        `<td>${sparkBars(ser(r.id).map(p => p.tilt_rel))}</td><td>${sparkLine(priceOverSeries(r.id))}</td></tr>`;
    }
    return h + '</tbody></table></div>';
  }
  function cardsHTML(rows) {
    const sorted = sortRows(rows);
    let h = `<div class="sortbar"><span class="muted">Sort</span><select id="sortsel">` +
      SORT_NAMES.map(([k, t]) => `<option value="${k}" ${S.sort === k ? 'selected' : ''}>${t}</option>`).join('') + `</select>` +
      `<button class="chip" data-dir="1" title="flip the order">${S.dir < 0 ? 'high → low' : 'low → high'}</button></div>`;
    for (const r of sorted) {
      h += `<div class="pcard" data-go="${esc(r.id)}">` +
        `<div class="r1"><span><b class="wh" style="font-size:15px">${esc(r.name)}</b>${kindTag(r.kind)}${r.shift ? '<span class="badge sh">shift</span>' : ''}</span>` +
        `<span class="big ${cc(r.tilt_rel)}">${tp(r.tilt_rel)}</span></div>` +
        `<div class="r2">${quadHTML(r.quad)}<span class="chg">${arrow(r.chg1)} <span class="muted">1s</span> ${arrow(r.chg5)} <span class="muted">5s</span></span></div>` +
        `<div class="r3"><span>lists <b><span class="up">${r.c}</span> / <span class="dn">${r.p}</span></b> of ${r.n}</span><span>lean <b class="${cc(r.lean_rel)}">${ln2(r.lean_rel)}</b></span>` +
        `<span>calls <b>${shr(r.cp)}</b> ${arrow(r.cpc, 1, 'pt')}</span></div>` +
        `<div class="r3"><span>vs board 1d <b>${moveHTML(r.id, 'rel1')}</b></span><span>5d <b>${moveHTML(r.id, 'rel5')}</b></span><span>20d <b>${moveHTML(r.id, 'rel20')}</b></span></div>` +
        (r.div ? `<div class="r2">${divCell(r).replace('<div class="sub2">', ' <span class="sub2">').replace('</div>', '</span>')}</div>` : '') +
        `<div class="r5"><span>tilt ${sparkBars(ser(r.id).map(p => p.tilt_rel), 84, 22)}</span><span>vs board ${sparkLine(priceOverSeries(r.id), 84, 22)}</span></div></div>`;
    }
    return h;
  }


  function mapViewHTML() {
    const rows = rowsShown(), W = boxW(), narrow = NARROW();
    const side = W >= 1280;
    const mapW = side ? Math.floor((W - 16) * 0.55) : W;
    const { unplaced } = mapItems(rows);
    const kn = S.k === 'sec' ? 'sectors' : S.k === 'th' ? 'themes' : 'groups';
    let h = shiftsHTML(rows);
    h += `<div class="mapgrid"${side ? ` style="grid-template-columns:${mapW}px minmax(0,1fr)"` : ''}>` +
      `<div class="mapbox"><div class="h2"><b>Rotation map</b><span>${rows.length} ${kn} · ${S.h} · tails = previous 5 sessions · click a dot to open it</span></div>` +
      mapSVG(rows, mapW) + mapLegend() +
      (unplaced.length ? `<div class="unplaced">No 20-session move yet: ${unplaced.map(r => esc(r.name)).join(', ')}</div>` : '') + `</div>` +
      `<div class="heatbox"><div class="h2"><b>Tilt by day</b><span>green = calls stacked vs the board, red = puts stacked · dot = divergence · outline = shift</span></div>` +
      heatHTML(rows) + `</div></div>`;
    h += `<div class="h2"><b>Groups</b><span>${S.h} window · sorted by ${(SORT_NAMES.find(x => x[0] === S.sort) || SORT_NAMES[0])[1].toLowerCase()} · click a group to open it</span></div>`;
    h += narrow ? cardsHTML(rows) : tableHTML(rows);
    h += mapFoot();
    return h;
  }
  function mapFoot() {
    return `<div class="foot"><b>Tilt</b>: a group's share of names on GEX Hunt's call list (call-heavy GEX stack above the price, every rule or one rule off) minus its share on the put list, minus the same for the whole board, in points. + = calls stacked, − = puts stacked.<br>` +
      `<b>Lean</b>: across every member, the median log ratio of the call GEX stack above the price to the put GEX stack below it, minus the board's median. <b>Calls share</b>: median share of open contracts that are calls, and its change over a week.<br>` +
      `<b>Move vs board</b>: the group's equal-weight return minus the board's stocks over the last 1 / 5 / 20 sessions. The board is GEX Hunt's names; funds are left out of the baseline.<br>` +
      `<b>Divergence</b>: the tilt clearly on the calls side while the group lagged the board over 20 sessions (calls stacked while lagging), or clearly on the puts side while it led (puts stacked while leading). <b>Shift</b>: a big one-session move in the tilt, or a change of sign.<br>` +
      `<b>Windows</b>: 1Y+ / 6M / 3M are GEX Hunt's expiry windows. Positioning saved since ${day(D.first_day)}; ${D.live ? `the newest point is GEX Hunt's live board (OI ${day(D.settle)} settle).` : `newest saved day ${day(D.saved_day)}.`}</div>`;
  }


  function chartSVG(id, W) {
    const narrow = NARROW(), s0 = ser(id), pr = (D.price || {})[id] || [];
    const set = new Set(pr.map(p => p[0]));
    s0.forEach(p => set.add(p.day));
    const days = [...set].sort(), N = days.length;
    if (!N) return '<div class="empty">No history for this group yet.</div>';
    const ix = new Map(days.map((d, i) => [d, i]));
    const ML = 6, MR = narrow ? 44 : 52, T1 = 18, H1 = narrow ? 150 : 210, GAP = 30, H2 = narrow ? 96 : 124, XB = 22;
    const T2 = T1 + H1 + GAP, HT = T2 + H2 + XB, PW = W - ML - MR;
    const step = PW / N, X = i => ML + (i + 0.5) * step;

    const pv = pr.filter(p => ok(p[1])).map(p => [ix.get(p[0]), (Math.exp(p[1]) - 1) * 100]);
    let lo = Math.min(0, ...pv.map(p => p[1])), hi = Math.max(0, ...pv.map(p => p[1]));
    const pad = (hi - lo) * 0.08 || 1;
    lo -= pad; hi += pad;
    const Y1 = v => T1 + (hi - v) / (hi - lo) * H1;

    const dv = dvPts();
    const tm = Math.max(dv * 1.5, ...s0.map(p => Math.abs((p.tilt_rel || 0) * 100))) * 1.12;
    const Y2 = v => T2 + (tm - v) / (2 * tm) * H2;
    let s = `<svg class="gch" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}" role="img" aria-label="Tilt and move vs the board">`;

    if (s0.length) {
      const a = X(ix.get(s0[0].day)) - step / 2, b = X(ix.get(s0[s0.length - 1].day)) + step / 2;
      s += `<rect x="${a.toFixed(1)}" y="${T1}" width="${(b - a).toFixed(1)}" height="${T2 + H2 - T1}" fill="rgba(41,98,255,.045)"/>`;
      const lab = `${narrow ? 'saved' : 'positioning saved'} from ${day(s0[0].day)}`, lw = lab.length * 5.8;
      s += a + 4 + lw <= ML + PW ? `<text class="pt" x="${(a + 4).toFixed(1)}" y="${T2 - 8}">${lab}</text>`
                                 : `<text class="pt" x="${ML + PW - 4}" y="${T2 - 8}" text-anchor="end">${lab}</text>`;
    }

    for (const run of divRuns(s0)) {
      const a = X(ix.get(run.start)) - step / 2, b = X(ix.get(run.end)) + step / 2;
      s += `<g><title>${esc(`${DIVW[run.kind]} · ${day(run.start)}${run.n > 1 ? ' → ' + day(run.end) : ''} · ${run.n} session${run.n > 1 ? 's' : ''}`)}</title>` +
        `<rect x="${a.toFixed(1)}" y="${T1}" width="${(b - a).toFixed(1)}" height="${T2 + H2 - T1}" fill="rgba(245,214,61,.17)"/>` +
        `<rect x="${a.toFixed(1)}" y="${T1 - 4}" width="${(b - a).toFixed(1)}" height="3" fill="#f5d63d"/></g>`;
    }

    const ps = niceStep(Math.max(Math.abs(hi), Math.abs(lo)), narrow ? 2 : 3);
    for (let k = Math.ceil(lo / ps); k <= Math.floor(hi / ps); k++) {
      const t = k * ps, y = Y1(t).toFixed(1);
      s += `<line class="${k ? 'grid' : 'zero'}" x1="${ML}" x2="${ML + PW}" y1="${y}" y2="${y}"/><text class="tk" x="${ML + PW + 6}" y="${(+y + 3.5).toFixed(1)}">${tlab(t, '%')}</text>`;
    }
    const path = pv.filter(p => p[0] != null).map((p, k) => `${k ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y1(p[1]).toFixed(1)}`).join('');
    const lastP = pv.length ? pv[pv.length - 1] : null;
    if (path) s += `<path d="${path}" fill="none" stroke="#d1d4dc" stroke-width="1.6"/>`;
    if (lastP) {
      const y = Math.max(T1 + 8, Math.min(T1 + H1 - 8, Y1(lastP[1])));
      s += `<rect x="${ML + PW + 1}" y="${(y - 8).toFixed(1)}" width="${MR - 2}" height="16" rx="2" fill="${lastP[1] >= 0 ? '#26a69a' : '#ef5350'}"/>` +
        `<text class="lbl" x="${ML + PW + 4}" y="${(y + 3.8).toFixed(1)}">${tlab(Math.round(lastP[1] * 10) / 10, '%')}</text>`;
    }
    s += `<text class="pt" x="${ML + 4}" y="${T1 - 7}">vs board since ${day(days[0])}, %</text>`;

    const ts = niceStep(tm, 2);
    for (let k = -Math.floor(tm / ts); k <= Math.floor(tm / ts); k++) {
      const t = k * ts, y = Y2(t).toFixed(1);
      s += `<line class="${k ? 'grid' : 'zero'}" x1="${ML}" x2="${ML + PW}" y1="${y}" y2="${y}"/><text class="tk" x="${ML + PW + 6}" y="${(+y + 3.5).toFixed(1)}">${tlab(t, '')}</text>`;
    }
    s += `<line class="dl" x1="${ML}" x2="${ML + PW}" y1="${Y2(dv).toFixed(1)}" y2="${Y2(dv).toFixed(1)}"/><line class="dl" x1="${ML}" x2="${ML + PW}" y1="${Y2(-dv).toFixed(1)}" y2="${Y2(-dv).toFixed(1)}"/>`;
    s += `<text class="pt" x="${ML + 4}" y="${T2 + 12}">tilt, pts</text>`;
    const bw = Math.max(1, step * 0.68);
    for (const p of s0) {
      if (!ok(p.tilt_rel)) continue;
      const i = ix.get(p.day), v = p.tilt_rel * 100, y0 = Y2(0), y = Y2(v);
      const col = v >= 0 ? '#26a69a' : '#ef5350';
      s += `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Math.min(y, y0).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(y - y0)).toFixed(1)}" fill="${col}"${p.src === 'live' ? ' fill-opacity=".55" stroke="' + col + '" stroke-dasharray="2 1.5"' : ''}/>`;
      if (p.shift) {
        const up = (p.chg1 || 0) >= 0, cx = X(i), ty = T2 + H2 - 8;
        s += `<path d="${up ? `M${(cx - 4).toFixed(1)},${ty + 4}L${(cx + 4).toFixed(1)},${ty + 4}L${cx.toFixed(1)},${ty - 3}Z` : `M${(cx - 4).toFixed(1)},${ty - 3}L${(cx + 4).toFixed(1)},${ty - 3}L${cx.toFixed(1)},${ty + 4}Z`}" fill="${up ? '#7fd3c9' : '#ff8a87'}"/>`;
      }
    }

    const every = Math.max(1, Math.ceil(N / Math.max(1, PW / (narrow ? 58 : 66))));
    for (let i = N - 1; i >= 0; i -= every) {
      const p = s0.find(q => q.day === days[i]);
      s += `<text class="tk" x="${X(i).toFixed(1)}" y="${HT - 6}" text-anchor="${i === N - 1 ? 'end' : 'middle'}">${p && p.src === 'live' ? 'live' : day(days[i])}</text>`;
    }

    const sm = new Map(s0.map(p => [p.day, p])), pm = new Map(pv.map(([i, v]) => [days[i], v]));
    days.forEach((d, i) => {
      const p = sm.get(d), v = pm.get(d);
      const t = `${day(d)}${p && p.src === 'live' ? ' live' : ''}` + (ok(v) ? ` · vs board since ${day(days[0])} ${tlab(Math.round(v * 10) / 10, '%')}` : '') +
        (p ? ` · tilt ${tp(p.tilt_rel)} pts · ${p.c} call list / ${p.p} put list of ${p.n} · 20 sessions vs board ${rp(p.rel20)}` + (p.div ? ` · ${DIVW[p.div]}` : '') + (p.shift ? ' · shift' : '') : '');
      s += `<rect x="${(X(i) - step / 2).toFixed(1)}" y="${T1}" width="${step.toFixed(2)}" height="${T2 + H2 - T1}" fill="transparent"><title>${esc(t)}</title></rect>`;
    });
    return s + '</svg>';
  }
  function chartLegend(id) {
    const pr = (D.price || {})[id] || [];
    return `<div class="legend"><span><svg width="22" height="8" viewBox="0 0 22 8"><polyline points="1,6 8,3 14,5 21,2" fill="none" stroke="#d1d4dc" stroke-width="1.5"/></svg>group minus board since ${day(pr.length ? pr[0][0] : D.first_day)}</span>` +
      `<span><svg width="14" height="12" viewBox="0 0 14 12"><rect x="1" y="2" width="5" height="4" fill="#26a69a"/><rect x="8" y="6" width="5" height="5" fill="#ef5350"/></svg>tilt (+ calls stacked, − puts stacked)</span>` +
      `<span><svg width="14" height="12" viewBox="0 0 14 12"><rect x="0" y="0" width="14" height="12" fill="rgba(245,214,61,.25)"/><rect x="0" y="0" width="14" height="2" fill="#f5d63d"/></svg>divergence</span>` +
      `<span><svg width="20" height="10" viewBox="0 0 20 10"><path d="M1,8L7,8L4,2Z" fill="#7fd3c9"/><path d="M12,2L18,2L15,8Z" fill="#ff8a87"/></svg>shift</span>` +
      `<span><svg width="14" height="12" viewBox="0 0 14 12"><rect x="0" y="0" width="14" height="12" fill="rgba(41,98,255,.25)"/></svg>days with saved positioning</span>` +
      `<span><svg width="22" height="8" viewBox="0 0 22 8"><line x1="0" x2="22" y1="4" y2="4" stroke="#8a7a2a" stroke-dasharray="4 3"/></svg>the divergence line</span></div>`;
  }
  function tile(k, v, s1, s2, vcls = '') {
    return `<div class="tile"><div class="k">${k}</div><div class="v ${vcls}">${v}</div>${s1 ? `<div class="s">${s1}</div>` : ''}${s2 ? `<div class="s">${s2}</div>` : ''}</div>`;
  }
  function memberSortVal(x) {
    const w = x.w, m = x.m;
    switch (S.msort) {
      case 'lean': return w.lean;
      case 'cp': return w.cp;
      case 'r1': return m.r1;
      case 'r5': return m.r5;
      case 'r20': return m.r20;
      default: return null;
    }
  }
  function sortMembers(list) {
    if (S.msort === 'list') {
      const rk = x => x.w.c ? 0 : x.w.p ? 1 : 2;
      return list.slice().sort((a, b) => rk(a) - rk(b) || (ok(b.w.lean) ? b.w.lean : -1e9) - (ok(a.w.lean) ? a.w.lean : -1e9) || (a.s < b.s ? -1 : 1));
    }
    return list.slice().sort((a, b) => {
      const x = memberSortVal(a), y = memberSortVal(b);
      if (!ok(x) && !ok(y)) return a.s < b.s ? -1 : 1;
      if (!ok(x)) return 1;
      if (!ok(y)) return -1;
      return S.mdir * (x - y);
    });
  }
  function listBadges(w) {
    return (w.c ? '<span class="lb2 c">call list</span>' : '') + (w.p ? '<span class="lb2 p">put list</span>' : '') + (!w.c && !w.p ? '<span class="muted">–</span>' : '');
  }
  function membersHTML(id) {
    const syms = (D.group_members || {})[id] || [];
    const list = sortMembers(syms.map(s => ({ s, m: (D.members || {})[s] })).filter(x => x.m).map(x => Object.assign(x, { w: (x.m.w || {})[S.h] || {} })));
    if (!list.length) return '<div class="empty">No members with data.</div>';
    const link = (x, cls = 'tk') => `<a class="${cls}" href="${huntUrl(x.s, !!x.w.p)}" target="_blank" rel="noopener" title="open the ${esc(x.s)} GEX chart in GEX Hunt">${esc(x.s)}</a>`;
    const cpTxt = w => `${shr(w.cp)} <span class="chg">${arrow(w.cpc, 1, 'pt', 'change over a week')}</span>`;
    if (NARROW()) {
      let h = `<div class="sortbar"><span class="muted">Sort</span><select id="msortsel">` +
        MSORTS.map(([k, t]) => `<option value="${k}" ${S.msort === k ? 'selected' : ''}>${t}</option>`).join('') + `</select></div>`;
      for (const x of list) {
        h += `<div class="pcard" style="cursor:default"><div class="r1"><span>${link(x, 'ptk')} <span class="muted" style="font-size:12px">${esc(x.m.n)}</span></span><span>${listBadges(x.w)}</span></div>` +
          `<div class="r3"><span>${esc(x.m.sec || '–')}</span><span>lean <b class="${cc(x.w.lean)}">${ln2(x.w.lean)}</b></span><span>calls <b>${cpTxt(x.w)}</b></span></div>` +
          `<div class="r3"><span>1d <b class="${cc(x.m.r1)}">${pc(x.m.r1)}</b></span><span>5d <b class="${cc(x.m.r5)}">${pc(x.m.r5)}</b></span><span>20d <b class="${cc(x.m.r20)}">${pc(x.m.r20)}</b></span></div></div>`;
      }
      return h;
    }
    const th = (label, key, cls = '', tip = '') => key
      ? `<th class="sortable ${cls} ${S.msort === key ? 'on' : ''}" data-msort="${key}" title="${esc(tip)}">${label}${S.msort === key && key !== 'list' ? `<span class="ar">${S.mdir < 0 ? '▼' : '▲'}</span>` : ''}</th>`
      : `<th class="${cls}">${label}</th>`;
    let h = `<div class="tw"><table class="grid"><thead><tr>` + th('Symbol') + th('Name') + th('Sector') + th(`Lists · ${esc(S.h)}`, 'list', '', 'call list first, then put list') +
      th('Lean', 'lean', 'r', 'log ratio of the call GEX stack above to the put GEX stack below') + th('Calls share', 'cp', '', 'share of open contracts that are calls; change over a week') +
      th('1d', 'r1', 'r') + th('5d', 'r5', 'r') + th('20d', 'r20', 'r') + `</tr></thead><tbody>`;
    for (const x of list) {
      h += `<tr><td>${link(x)}</td><td class="nm">${esc(x.m.n)}</td><td class="muted">${esc(x.m.sec || '–')}</td><td>${listBadges(x.w)}</td>` +
        `<td class="r ${cc(x.w.lean)}">${ln2(x.w.lean)}</td><td>${cpTxt(x.w)}</td>` +
        `<td class="r ${cc(x.m.r1)}">${pc(x.m.r1)}</td><td class="r ${cc(x.m.r5)}">${pc(x.m.r5)}</td><td class="r ${cc(x.m.r20)}">${pc(x.m.r20)}</td></tr>`;
    }
    return h + '</tbody></table></div>';
  }
  function groupViewHTML(id) {
    const g = grp(id), back = `<a class="back" href="${hashOf(Object.assign({}, S, { v: 'map' }))}">← Map</a>`;
    if (!g) return `<div class="ghead">${back}</div><div class="empty">No group “${esc(id)}” on this board.</div>`;
    const r = todayRows().find(x => x.id === id);
    const win = HS.map(h => {
      const t = ((D.today || {})[h] || []).find(x => x.id === id);
      return `<button class="chip ${h === S.h ? 'on' : ''}" data-h="${esc(h)}" title="tilt in the ${esc(h)} window">${h}<b class="${cc(t && t.tilt_rel)}">${t ? tp(t.tilt_rel) : '–'}</b></button>`;
    }).join('');
    let h = `<div class="ghead">${back}<span class="gt">${esc(g.name)}</span>${kindTag(g.kind)}<span class="muted">${g.n} names</span>` +
      (r && r.shift ? '<span class="badge sh">shift</span>' : '') + (D.live ? '<span class="badge live">live</span>' : '') +
      `<span class="gw"><span class="muted">Tilt by window</span>${win}</span></div>`;
    if (!r) return h + `<div class="empty">No ${esc(S.h)} data for ${esc(g.name)} on the ${day(D.day)} board.</div>`;
    const m1 = move(id, 'rel1'), m5 = move(id, 'rel5'), m20 = move(id, 'rel20'), fl = flipped(id, r), run = divRun(id);
    h += `<div class="tiles">` +
      tile('Tilt', `<span class="${cc(r.tilt_rel)}">${tp(r.tilt_rel)}</span> <small>pts</small>`,
        `1 session ${arrow(r.chg1)} · 5 sessions ${arrow(r.chg5)}${fl ? ` · <span class="am">flipped to ${fl} stacked</span>` : ''}`,
        `<b class="up">${r.c}</b> on the call list · <b class="dn">${r.p}</b> on the put list of ${r.n}`) +
      tile('Lean', `<span class="${cc(r.lean_rel)}">${ln2(r.lean_rel)}</span>`, 'median log ratio of the call GEX stack above to the put GEX stack below, minus the board’s') +
      tile('Calls share', shr(r.cp), `1W ${arrow(r.cpc, 1, 'pt')}`, 'median share of open contracts that are calls') +
      tile('Move vs board · 20 sessions', `<span class="${cc(m20.v)}">${rp(m20.v)}</span>${m20.old ? ` <small>as of ${day(m20.day)}</small>` : ''}`,
        `1 session <b class="${cc(m1.v)}">${rp(m1.v)}</b> · 5 sessions <b class="${cc(m5.v)}">${rp(m5.v)}</b>`, 'equal-weight group return minus the board’s stocks') +
      tile('Quadrant', quadHTML(r.quad), r.div ? `<span class="kg">${DIVW[r.div]} since ${day(r.div_since)}${run > 1 ? ` · ${run} sessions` : ''}</span>` : 'no divergence',
        r.shift ? `<span class="am">shift on the ${day(r.day)} board</span>` : '', 'sm') + `</div>`;
    h += `<div class="chartbox">${chartSVG(id, boxW())}${chartLegend(id)}</div>`;
    const chips = (syms, neg) => syms.length ? syms.map(s => `<a class="lv${neg ? ' neg' : ''}" href="${huntUrl(s, neg)}" target="_blank" rel="noopener" title="${esc(((D.members || {})[s] || {}).n || s)}">${esc(s)}</a>`).join('') : '<span class="muted">none</span>';
    h += `<div class="h2"><b>Today's lists</b><span>${day(D.day)}${D.live ? ' live' : ''} board · ${esc(S.h)} · a name opens its GEX chart in GEX Hunt</span></div>` +
      `<div class="lists"><div class="row2"><span class="muted">call list · ${(r.calls || []).length}</span>${chips(r.calls || [], false)}</div>` +
      `<div class="row2"><span class="muted">put list · ${(r.puts || []).length}</span>${chips(r.puts || [], true)}</div></div>`;
    h += `<div class="h2"><b>Members</b><span>${((D.group_members || {})[id] || []).length} names with data · lists for the ${esc(S.h)} window · returns are each name's own</span></div>` + membersHTML(id);
    return h + `<div class="foot">Lean for a name: the log ratio of the call GEX stack above to the put GEX stack below in the ${esc(S.h)} window; + leans to calls. Calls share: share of open contracts that are calls, with its change over a week.</div>`;
  }


  function scoreTile(title, sc, note) {
    sc = sc || {};
    const line = n => {
      const x = sc[n] || {};
      return `<div class="s">next ${n} sessions: ${x.n ? `<b>${x.right} right of ${x.n}</b> · mean <b class="${cc(x.mean)}">${rp(x.mean)}</b>` : '<b>none closed yet</b>'}</div>`;
    };
    const e = sc.episodes || 0;
    return `<div class="tile"><div class="k">${title}</div><div class="v">${e} <small>episode${e === 1 ? '' : 's'}</small></div>${line('5')}${line('10')}${note ? `<div class="s">${note}</div>` : ''}</div>`;
  }
  function corrRow(label, v) {
    const w = ok(v) ? Math.min(1, Math.abs(v)) * 50 : 0;
    const bar = ok(v) ? `<b style="${v >= 0 ? 'left:50%' : `left:${(50 - w).toFixed(1)}%`};width:${w.toFixed(1)}%;background:${v >= 0 ? '#26a69a' : '#ef5350'}"></b>` : '';
    return `<span class="muted">${label}</span><i><em></em>${bar}</i><span class="r">${ln2(v)}</span>`;
  }
  function epRow(e) {
    const res = v => !ok(v) ? '<span class="open">open</span>' : `<span class="${v > 0 ? 'hit' : 'miss'}">${v > 0 ? '✓' : '✗'} ${rp(v)}</span>`;
    const g = grp(e.gid) || { kind: '' };
    const running = e.end === D.saved_day;
    if (NARROW()) {
      return `<div class="pcard" data-go="${esc(e.gid)}"><div class="r1"><span><b class="wh">${esc(e.name)}</b>${g.kind ? kindTag(g.kind) : ''}</span><span class="num">${day(e.start)}${e.days > 1 ? ' → ' + day(e.end) : ''}</span></div>` +
        `<div class="r2"><span class="dvw">${DIVW[e.kind] || esc(e.kind)}</span>${running ? '<span class="badge run">running</span>' : ''}</div>` +
        `<div class="r3"><span>${e.days} session${e.days > 1 ? 's' : ''}</span><span>tilt <b class="${cc(e.tilt0)}">${tp(e.tilt0)}</b></span><span>20d before <b class="${cc(e.past20)}">${rp(e.past20)}</b></span></div>` +
        `<div class="r3"><span>next 5 <b>${res(e.f5)}</b></span><span>next 10 <b>${res(e.f10)}</b></span></div></div>`;
    }
    return `<tr class="row" data-go="${esc(e.gid)}"><td><span class="gn">${esc(e.name)}</span>${g.kind ? kindTag(g.kind) : ''}</td>` +
      `<td class="dvw">${DIVW[e.kind] || esc(e.kind)}</td><td class="num">${day(e.start)}${e.days > 1 ? ' → ' + day(e.end) : ''}${running ? '<span class="badge run">running</span>' : ''}</td>` +
      `<td class="r">${e.days}</td><td class="r ${cc(e.tilt0)}">${tp(e.tilt0)}</td><td class="r ${cc(e.past20)}">${rp(e.past20)}</td>` +
      `<td class="r">${res(e.f5)}</td><td class="r">${res(e.f10)}</td></tr>`;
  }
  function recordViewHTML() {
    const R = (D.record || {})[S.h];
    if (!R) return `<div class="empty">No ${esc(S.h)} record yet.</div>`;
    const fs = day(D.fwd_start), A = R.agree || {}, T = R.track || {};
    let h = `<div class="rec-lead">Every <b>divergence episode</b> (a run of days where the tilt stood clearly against the 20-session move) in the <b>${esc(S.h)}</b> window, scored on the group's move vs the board over the next 5 and 10 sessions from its first day, signed the way the positioning points: + means the group moved the way the tilt pointed.</div>`;
    h += `<div class="tiles t4">` +
      scoreTile(`History · before ${fs}`, R.history, `episodes from ${day(D.first_day)} on: the days the rule came from`) +
      scoreTile(`Forward · from ${fs}`, R.forward, `episodes that start on or after ${fs}`) +
      `<div class="tile"><div class="k">Tilt agreed with the 20-session move</div><div class="v ${cc(A.mean)}">${rp(A.mean)} <small>next 5, signed</small></div>` +
      `<div class="s"><b>${A.right ?? 0} right of ${A.n ?? 0}</b> group-days</div><div class="s">days the tilt stood clearly on the same side as the 20-session move: the baseline for the divergences</div></div>` +
      `<div class="tile"><div class="k">How the tilt has tracked price</div><div class="cr">${corrRow('past 20 sessions', T.past20)}${corrRow('past 5 sessions', T.past5)}${corrRow('next 5 sessions', T.next5)}</div>` +
      `<div class="s">correlation of the tilt with the group's move vs the board · ${T.cells ?? 0} group-days</div></div></div>`;
    const eps = R.episodes || [], fw = eps.filter(e => e.fwd), hi = eps.filter(e => !e.fwd);
    h += `<div class="h2"><b>Episodes</b><span>${eps.length} in the ${esc(S.h)} window · newest first · click one to open the group</span></div>`;
    if (NARROW()) {
      const sec = (t, list, none) => `<div class="h2"><b style="font-size:12.5px">${t}</b><span>${list.length}</span></div>` + (list.length ? list.map(epRow).join('') : `<div class="pcard" style="cursor:default"><span class="muted">${none}</span></div>`);
      h += sec(`Forward · from ${fs}`, fw, `no episodes from ${fs} on yet`) + sec(`History · before ${fs}`, hi, 'no episodes');
    } else {
      const sec = (t, list, none) => `<tr class="secrow"><td colspan="8"><b>${t}</b> · ${list.length}</td></tr>` + (list.length ? list.map(epRow).join('') : `<tr class="none"><td colspan="8">${none}</td></tr>`);
      h += `<div class="tw"><table class="grid"><thead><tr><th>Group</th><th>Divergence</th><th>Start → end</th><th class="r">Days</th><th class="r">Tilt at start</th>` +
        `<th class="r">20d vs board at start</th><th class="r">Next 5 vs board</th><th class="r">Next 10 vs board</th></tr></thead><tbody>` +
        sec(`Forward · from ${fs}`, fw, `No episodes from ${fs} on yet.`) + sec(`History · before ${fs}`, hi, 'No episodes.') + `</tbody></table></div>`;
    }
    h += `<div class="foot"><b>Episode</b>: consecutive saved days with the same divergence, calls stacked while lagging (the tilt clearly on the calls side while the group trailed the board over 20 sessions) or puts stacked while leading (clearly on the puts side while it led). <b>Tilt at start</b> and <b>20d vs board at start</b> are the first day's numbers.<br>` +
      `<b>Next 5 / next 10</b>: the group's equal-weight return minus the board's over the 5 / 10 sessions after the first day, + when it moved the way the positioning pointed (up for calls stacked, down for puts stacked). ✓ = above zero; open = the window has not fully traded yet.<br>` +
      `<b>History</b> = episodes from ${day(D.first_day)} up to the day before ${fs}; <b>forward</b> = episodes starting on or after ${fs}. <b>Right of n</b> counts the episodes with a closed window that came out above zero; the mean is the average signed move.<br>` +
      `<b>Agreed baseline</b>: the same signed next-5 move on every saved day where the tilt stood clearly on the same side as the 20-session move. <b>Tracked price</b>: correlation of the tilt with the group's move vs the board over the past 20, the past 5 and the next 5 sessions, over every saved day and group.</div>`;
    return h;
  }


  function mainHTML() {
    if (!D) return '<div class="empty">Loading…</div>';
    if (S.v === 'g') return groupViewHTML(S.id);
    if (S.v === 'rec') return recordViewHTML();
    return mapViewHTML();
  }
  function titleOf() {
    if (S.v === 'g') { const g = D && grp(S.id); return (g ? g.name + ' · ' : '') + 'Rotations'; }
    return S.v === 'rec' ? 'Record · Rotations' : 'Rotations';
  }
  let LASTW = 0;
  function renderBar() { if (HAS_DOM) $('#bar').innerHTML = barHTML(); }
  function renderMain() {
    if (!HAS_DOM) return;
    $('#main').innerHTML = mainHTML();
    const hw = document.querySelector('.hs-wrap');
    if (hw) hw.scrollLeft = hw.scrollWidth;
    document.title = titleOf();
  }
  function render() { renderBar(); renderMain(); LASTW = HAS_DOM ? window.innerWidth : 0; }

  async function load() {
    const r = await fetch(BASE + 'rot.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('rot.json ' + r.status);
    setData(await r.json());
  }
  async function poll() {
    try {
      const r = await fetch(BASE + 'status.json', { cache: 'no-cache' });
      if (!r.ok) return;
      STATUS = await r.json();
      if (STATUS.built && STATUS.built !== BUILT) { await load(); render(); }
      else renderBar();
    } catch (e) {  }
  }
  function bind() {
    $('#bar').addEventListener('click', e => {
      const b = e.target.closest('[data-v],[data-h],[data-k]');
      if (!b) return;
      if (b.dataset.v) go({ v: b.dataset.v }, b.dataset.v !== S.v);
      else if (b.dataset.h) go({ h: b.dataset.h });
      else if (b.dataset.k) go({ k: b.dataset.k });
    });
    const main = $('#main');
    main.addEventListener('click', e => {
      if (e.target.closest('a[href]')) return;
      const so = e.target.closest('[data-sort]');
      if (so) {
        const k = so.dataset.sort;
        if (S.sort === k) S.dir = -S.dir; else { S.sort = k; S.dir = -1; }
        store.set('sort', S.sort); store.set('dir', S.dir); renderMain(); return;
      }
      const ms = e.target.closest('[data-msort]');
      if (ms) {
        const k = ms.dataset.msort;
        if (S.msort === k && k !== 'list') S.mdir = -S.mdir; else { S.msort = k; S.mdir = -1; }
        store.set('msort', S.msort); store.set('mdir', S.mdir); renderMain(); return;
      }
      if (e.target.closest('[data-dir]')) { S.dir = -S.dir; store.set('dir', S.dir); renderMain(); return; }
      const hb = e.target.closest('[data-h]');
      if (hb) { go({ h: hb.dataset.h }); return; }
      const kb = e.target.closest('[data-k]');
      if (kb) { go({ k: kb.dataset.k }); return; }
      const g = e.target.closest('[data-go]');
      if (g) go({ v: 'g', id: g.dataset.go }, true);
    });
    main.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const g = e.target.closest && e.target.closest('[data-go]');
      if (g && !e.target.closest('a[href]')) { e.preventDefault(); go({ v: 'g', id: g.dataset.go }, true); }
    });
    main.addEventListener('change', e => {
      if (e.target.id === 'sortsel') { S.sort = e.target.value; S.dir = -1; clean(); store.set('sort', S.sort); store.set('dir', S.dir); renderMain(); }
      if (e.target.id === 'msortsel') { S.msort = e.target.value; S.mdir = -1; clean(); store.set('msort', S.msort); store.set('mdir', S.mdir); renderMain(); }
    });
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
      $('#main').innerHTML = `<div class="empty">Rotations has not been built yet (${esc(e.message)}).</div>`;
      setInterval(poll, 300000);
      return;
    }
    const h = hashOf();
    if (h !== location.hash) { try { history.replaceState(null, '', h); } catch (e) {  } }
    render();
    setInterval(poll, 300000);
  }

  const API = { setData, state: S, clean, setWidth(w, narrow) { FORCE_W = w; FORCE_NARROW = narrow; }, setStatus(st) { STATUS = st; },
                barHTML, mainHTML, mapViewHTML, groupViewHTML, recordViewHTML, mapSVG, chartSVG, heatHTML, tableHTML, cardsHTML,
                shiftsHTML, membersHTML, placeLabels, mapItems, readHash, hashOf, cols, divRuns, move,
                fmt: { tp, rp, pc, shr, ln2, day, arrow, niceStep, tlab, f1 } };
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  root.Rotations = API;
  if (HAS_DOM && !root.ROT_NO_BOOT) boot();
})(typeof window !== 'undefined' ? window : globalThis);
