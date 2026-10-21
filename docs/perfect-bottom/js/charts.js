

(function () {
  const C = {
    bg: '#131722', panel: '#1E222D', panel2: '#191D28', grid: '#2A2E39', text: '#D1D4DC', muted: '#787B86', dim: '#5D606B',
    bright: '#F0F3FA', purple: '#7E57C2', purpleL: '#B39DDB', up: '#26a69a', red: '#ef5350', yellow: '#e3b341',
    kc: '#4fc3f7', dc: '#ffb74d', jc: '#6f7382', bar: '#4a5063'
  };
  const FONT = '-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lin = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0 || 1) * (r1 - r0);
  const f2 = v => (v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v >= 1 ? v.toFixed(2) : v.toFixed(3));
  const money = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) + '%';
  const pd = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const myy = iso => { const d = pd(iso); return MON[d.getUTCMonth()] + " '" + String(d.getUTCFullYear()).slice(2); };
  const mdd = iso => { const d = pd(iso); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); };
  const txt = (x, y, s, o = {}) => `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-size="${o.size || 12}" fill="${o.fill || C.muted}"` +
    ` font-weight="${o.weight || 400}" text-anchor="${o.anchor || 'start'}"${o.base ? ` dominant-baseline="${o.base}"` : ''}` +
    `${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.halo ? ` paint-order="stroke" stroke="${o.halo}" stroke-width="4" stroke-linejoin="round"` : ''}>${esc(s)}</text>`;
  const tw = (s, size = 12, bold = false) => String(s).length * size * (bold ? 0.6 : 0.55);
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  function niceTicks(lo, hi, n) {
    const span = hi - lo, raw = span / Math.max(n, 1), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }
  const svgOpen = (w, h, extra = '') => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;max-width:100%;height:auto;font-family:${FONT}" ${extra}>`;
  const tickFmt = v => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.abs(v) >= 10 ? String(Math.round(Math.abs(v))) : Math.abs(v).toFixed(1).replace(/\.0$/, '')) + '%';


  function sparkMeter(daily, o = {}) {
    const W = o.w || 290, H = o.h || 92;
    const pts = daily;
    const L = 4, R = W - 6, T = 18, B = H - 18;
    const ymax = 0.7;
    const x = lin(0, pts.length - 1, L, R), y = lin(0, ymax, B, T);
    let line = '', area = `M${x(0)},${B}`;
    pts.forEach((p, i) => { const q = x(i).toFixed(1) + ',' + y(p[1]).toFixed(1); line += (i ? 'L' : 'M') + q; area += 'L' + q; });
    area += `L${x(pts.length - 1)},${B}Z`;
    let pk = 0; pts.forEach((p, i) => { if (p[1] > pts[pk][1]) pk = i; });
    const last = pts[pts.length - 1];
    let s = svgOpen(W, H);
    s += `<defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.purple}" stop-opacity=".55"/><stop offset="1" stop-color="${C.purple}" stop-opacity=".05"/></linearGradient></defs>`;
    s += `<path d="${area}" fill="url(#mg)"/><path d="${line}" fill="none" stroke="${C.purple}" stroke-width="1.1"/>`;
    s += `<line x1="${L}" x2="${R}" y1="${y(0.2)}" y2="${y(0.2)}" stroke="${C.purpleL}" stroke-dasharray="4 3" stroke-width="1"/>`;
    s += `<rect x="${L}" y="${y(0.2) - 23}" width="46" height="15" rx="2" fill="${C.panel}" opacity=".85"/>`;
    s += txt(L + 2, y(0.2) - 11, 'armed', { size: 11, fill: C.purpleL, weight: 700 });
    const pkLab = `${(pts[pk][1] * 100).toFixed(1)}% ${mdd(pts[pk][0])} '${pts[pk][0].slice(2, 4)}`;
    s += txt(x(pk) + 6, y(pts[pk][1]) + 9, pkLab, { size: 11, fill: C.text, weight: 700 });
    s += `<circle cx="${x(pts.length - 1)}" cy="${y(last[1])}" r="4" fill="${C.bright}" stroke="${C.purple}" stroke-width="2"/>`;
    s += txt(x(pts.length - 1) - 7, y(last[1]) - 8, `${Math.round(last[1] * 100)}% now`, { size: 11, fill: C.bright, weight: 700, anchor: 'end' });
    s += txt(L, H - 3, myy(pts[0][0]), { size: 11 });
    s += txt(R, H - 3, 'daily readings', { size: 11, anchor: 'end' });
    return s + '</svg>';
  }


  function tfPanel(rows, o) {
    const W = 340, H = 316;
    const n = rows.length, dev = !!o.developing;
    const proj = o.flat ? o.flat.path.slice(0, Math.min(o.flat.n || 5, 6)) : [];
    const PL = 4, PR = W - 42;
    const xr = n - 1 + Math.max(proj.length, 1) + 0.9;
    const x = lin(-0.7, xr, PL, PR);
    const P0 = 20, P1 = 142, K0 = 172, K1 = 290;
    const hs = rows.map(r => r[1]), ls = rows.map(r => r[2]), cs = rows.map(r => r[3]);
    const trig = o.trigger && o.trigger.price;
    let lo = Math.min(...ls), hi = Math.max(...hs);
    if (trig) { lo = Math.min(lo, trig); hi = Math.max(hi, trig); }
    const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    const y = lin(lo, hi, P1, P0), ky = lin(-25, 125, K1, K0);
    let s = svgOpen(W, H);
    niceTicks(lo, hi, 3).forEach(v => {
      s += `<line x1="${PL}" x2="${PR}" y1="${y(v)}" y2="${y(v)}" stroke="${C.grid}" stroke-width="1"/>`;
      s += txt(PR + 6, y(v) + 4, tickFmt(v), { size: 11 });
    });
    [0, 50, 100].forEach(v => {
      s += `<line x1="${PL}" x2="${PR}" y1="${ky(v)}" y2="${ky(v)}" stroke="${C.grid}" stroke-width="1"/>`;
      s += txt(PR + 6, ky(v) + 4, v, { size: 11 });
    });
    s += `<rect x="${PL}" y="${ky(20)}" width="${PR - PL}" height="${ky(-25) - ky(20)}" fill="${C.purple}" opacity=".13"/>`;
    s += txt(x(n - 1.7), ky(-25) - 5, 'basement', { size: 11, anchor: 'end', fill: '#9a8cc0' });
    if (dev) {
      const xa = x(n - 1.5), xb = x(n - 0.5);
      s += `<rect x="${xa}" y="${P0 - 4}" width="${xb - xa}" height="${P1 - P0 + 8}" fill="${C.purple}" opacity=".22"/>`;
      s += `<rect x="${xa}" y="${K0}" width="${xb - xa}" height="${K1 - K0}" fill="${C.purple}" opacity=".22"/>`;
    }
    const bw = Math.max(2.4, Math.min(6, (x(1) - x(0)) * 0.42));
    rows.forEach((r, i) => {
      const last = dev && i === n - 1;
      s += `<line x1="${x(i)}" x2="${x(i)}" y1="${y(r[1])}" y2="${y(r[2])}" stroke="${last ? C.purple : C.bar}" stroke-width="${last ? bw + 2 : bw}" ${last ? 'opacity=".9"' : ''}/>`;
    });
    const cut = dev ? n - 1 : n;
    s += `<polyline fill="none" stroke="${C.bright}" stroke-width="1.6" points="${cs.slice(0, cut).map((c, i) => x(i).toFixed(1) + ',' + y(c).toFixed(1)).join(' ')}"/>`;
    if (dev) {
      s += `<line x1="${x(n - 2)}" y1="${y(cs[n - 2])}" x2="${x(n - 1)}" y2="${y(cs[n - 1])}" stroke="${C.bright}" stroke-width="1.6" stroke-dasharray="3 2"/>`;
      s += `<circle cx="${x(n - 1)}" cy="${y(cs[n - 1])}" r="4.6" fill="${C.purple}" stroke="${C.bright}" stroke-width="1.3"/>`;
    }

    if (trig) {
      const yt = y(trig);
      s += `<line x1="${PL}" x2="${PR}" y1="${yt}" y2="${yt}" stroke="${C.yellow}" stroke-width="1.4" stroke-dasharray="5 3"/>`;
      const lab = `${o.trigger.word} ${money(trig)}`;
      const lw = tw(lab, 11.5, true) + 12;
      const cands = [];
      [[PL + 2, 'L'], [PR - lw - 2, 'R']].forEach(([lx]) => { [yt - 18, yt + 3].forEach(ty => cands.push({ x: lx, y: ty, w: lw, h: 16 })); });
      const hits = b => {
        let k = 0;
        rows.forEach((r, i) => { const xi = x(i); if (xi >= b.x - 3 && xi <= b.x + b.w + 3) { const a = y(r[1]), z = y(r[2]); if (!(z < b.y - 1 || a > b.y + b.h + 1)) k++; } });
        return k;
      };
      let best = null, bk = 1e9;
      cands.forEach(b => { if (b.y < P0 - 2 || b.y + b.h > P1 + 6) return; const k = hits(b); if (k < bk) { bk = k; best = b; } });
      best = best || cands[0];
      s += `<rect x="${best.x}" y="${best.y}" width="${best.w}" height="${best.h}" rx="3" fill="${C.bg}" stroke="${C.yellow}" stroke-opacity=".35"/>`;
      s += txt(best.x + 6, best.y + 12, lab, { size: 11.5, fill: C.yellow, weight: 700 });
    }
    s += txt(PL, P0 - 8, 'PRICE', { size: 11, fill: C.muted, weight: 700, ls: '.06em' });
    if (dev) s += txt(PR, P0 - 8, 'shaded = as if closed today', { size: 11, fill: C.purpleL, weight: 600, anchor: 'end' });
    else s += txt(PR, P0 - 8, 'last candle is complete', { size: 11, fill: C.muted, anchor: 'end' });
    s += txt(PL, K0 - 8, 'KDJ', { size: 11, fill: C.muted, weight: 700, ls: '.06em' });
    const series = [[6, C.jc, 1.1, .8], [4, C.kc, 2, 1], [5, C.dc, 2, 1]];
    series.forEach(([ci, col, w, op]) => {
      const v = rows.map(r => Math.max(-25, Math.min(125, r[ci])));
      s += `<polyline fill="none" stroke="${col}" stroke-width="${w}" opacity="${op}" points="${v.slice(0, cut).map((q, i) => x(i).toFixed(1) + ',' + ky(q).toFixed(1)).join(' ')}"/>`;
      if (dev) s += `<line x1="${x(n - 2)}" y1="${ky(v[n - 2])}" x2="${x(n - 1)}" y2="${ky(v[n - 1])}" stroke="${col}" stroke-width="${w}" opacity="${op}" stroke-dasharray="3 2"/>`;
    });
    for (let i = 1; i < n; i++) {
      if (rows[i][4] > rows[i][5] && rows[i - 1][4] <= rows[i - 1][5]) {
        const yy = ky((rows[i][4] + rows[i][5]) / 2) + 9, xx = x(i);
        s += `<path d="M${xx - 5},${yy + 4} L${xx + 5},${yy + 4} L${xx},${yy - 5} Z" fill="${C.up}" stroke="${C.bg}" stroke-width="1"/>`;
      }
    }
    if (proj.length) {
      const kp = [[n - 1, rows[n - 1][4]]].concat(proj.map((p, j) => [n + j, p.K]));
      const dp = [[n - 1, rows[n - 1][5]]].concat(proj.map((p, j) => [n + j, p.D]));
      s += `<polyline fill="none" stroke="${C.kc}" stroke-width="1.6" stroke-dasharray="1.5 3" stroke-linecap="round" points="${kp.map(p => x(p[0]).toFixed(1) + ',' + ky(p[1]).toFixed(1)).join(' ')}"/>`;
      s += `<polyline fill="none" stroke="${C.dc}" stroke-width="1.6" stroke-dasharray="1.5 3" stroke-linecap="round" points="${dp.map(p => x(p[0]).toFixed(1) + ',' + ky(p[1]).toFixed(1)).join(' ')}"/>`;
      if (o.flat.n) {
        const inView = o.flat.n <= proj.length, jj = Math.min(o.flat.n, proj.length);
        const j = n - 1 + jj, p = proj[jj - 1], yy = ky((p.K + p.D) / 2);
        if (inView) s += `<circle cx="${x(j)}" cy="${yy}" r="7" fill="none" stroke="${C.yellow}" stroke-width="2"/>`;
        const cl = `cross in ${o.flat.n}`, cw2 = tw(cl, 11, true) + 8;
        s += `<rect x="${x(j) - cw2 - 2}" y="${yy - 25}" width="${cw2}" height="15" rx="3" fill="${C.panel}" opacity=".9"/>`;
        s += txt(x(j) - 6, yy - 14, cl, { size: 11, fill: C.yellow, weight: 700, anchor: 'end' });
      }
    }
    s += txt(PL, H - 6, o.firstLabel || '', { size: 11 });
    if (o.lastLabel) s += txt(x(n - 1), H - 6, o.lastLabel, { size: 11, anchor: 'middle', fill: dev ? C.purpleL : C.muted, weight: dev ? 600 : 400 });
    return s + '</svg>';
  }



  function ladderTimeline(o) {
    const W = o.w || 1500, H = 380;
    const i0 = Math.max(0, o.rows.findIndex(r => r[0] >= o.start));
    const rows = o.rows.slice(i0), wB = o.washedB.slice(i0), wD = o.washedD.slice(i0);
    const dates = rows.map(r => r[0]).concat(o.future);
    const n = rows.length, N = dates.length;
    const PL = 60, PR = W - 262, PT = 30, PB = 286;
    const x = lin(0, N - 1, PL, PR);
    const cs = rows.map(r => r[3]);
    let lo = Math.min(...cs), hi = Math.max(...cs, ...o.triggers.map(t => t.price));
    if (o.band) lo = Math.min(lo, o.band.mid);
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    if (o.band) { const need = 46, lo2 = o.band.mid - (hi - o.band.mid) * need / (PB - PT - need); lo = Math.min(lo, lo2); }
    const y = lin(lo, hi, PB, PT);
    const placed = [];
    let s = svgOpen(W, H);
    s += `<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.purple}" stop-opacity=".42"/><stop offset="1" stop-color="${C.purple}" stop-opacity=".03"/></linearGradient></defs>`;
    niceTicks(lo, hi, 5).forEach(v => {
      s += `<line x1="${PL}" x2="${PR}" y1="${y(v)}" y2="${y(v)}" stroke="${C.grid}"/>`;
      s += txt(PL - 8, y(v) + 4, tickFmt(v), { size: 11.5, anchor: 'end' });
    });
    s += `<rect x="${x(n - 1)}" y="${PT}" width="${PR - x(n - 1)}" height="${PB - PT}" fill="#ffffff" opacity=".025"/>`;


    const nextTop = { x: PR - 120, y: PT, w: 120, h: 16 };
    placed.push(nextTop);
    const nextW = tw(`next ${o.future.length} sessions`, 11) + 2;
    const nextAtTop = { x: PR - 6 - nextW, y: PT + 5, w: nextW, h: 8 }, nextAtBot = { x: PR - 6 - nextW, y: PB - 14, w: nextW, h: 8 };

    const ticks = []; let lastM = -1;
    dates.forEach((d, i) => { const m = pd(d).getUTCMonth(); if (m !== lastM) { lastM = m; ticks.push([i, m]); } });
    ticks.forEach(([i, m], k) => {
      const nx = k + 1 < ticks.length ? x(ticks[k + 1][0]) : PR + 60;
      s += `<line x1="${x(i)}" x2="${x(i)}" y1="${PB}" y2="${PB + 5}" stroke="${C.dim}"/>`;
      if (nx - x(i) >= 30) s += txt(x(i) + 3, PB + 18, MON[m], { size: 11.5 });
    });

    if (o.band) {
      const ib = Math.max(0, dates.indexOf(o.band.from)), xb = x(ib);
      const yq = y(o.band.hi), ym = y(o.band.mid);
      s += `<rect x="${xb}" y="${yq}" width="${PR - xb}" height="${ym - yq}" fill="${C.purple}" opacity=".10"/>`;
      s += `<line x1="${xb}" x2="${PR}" y1="${ym}" y2="${ym}" stroke="${C.purpleL}" stroke-width="1.4" stroke-dasharray="6 4"/>`;
      o._band = { xb, ym };
    }
    let line = '', area = `M${x(0)},${PB}`;
    cs.forEach((c, i) => { const p = x(i).toFixed(1) + ',' + y(c).toFixed(1); line += (i ? 'L' : 'M') + p; area += 'L' + p; });
    area += `L${x(n - 1)},${PB}Z`;
    s += `<path d="${area}" fill="url(#lg)"/><path d="${line}" fill="none" stroke="${C.purple}" stroke-width="2.4" stroke-linejoin="round"/>`;
    const vtx = cs.map((c, i) => [x(i), y(c)]);
    const linePts = [];
    cs.forEach((c, i) => {
      if (i) { const x0 = x(i - 1), y0 = y(cs[i - 1]), x1 = x(i), y1 = y(c), k = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2));
        for (let j = 1; j < k; j++) linePts.push([x0 + (x1 - x0) * j / k, y0 + (y1 - y0) * j / k]); }
      linePts.push([x(i), y(c)]);
    });
    const hitsLine = (b, strict) => (strict ? linePts : vtx).some(([px, py]) => px >= b.x - 2 && px <= b.x + b.w + 2 && py >= b.y - 3 && py <= b.y + b.h + 3);
    const free = b => b.y >= PT - 4 && b.y + b.h <= PB - 2 && b.x >= PL - 50 && b.x + b.w <= PR + 4 && !placed.some(p => overlap(p, b)) && !hitsLine(b);
    o.triggers.forEach(t => placed.push({ x: x(n - 1) + 8, y: y(t.price) - 3, w: PR - x(n - 1) - 8, h: 6 }));
    if (o._band) placed.push({ x: o._band.xb, y: o._band.ym - 3, w: PR - o._band.xb, h: 6, line: true });
    const tags = o.triggers.map(t => Object.assign({}, t, { yy: y(t.price) })).sort((a, b) => a.yy - b.yy);
    const gap = 44;
    tags.forEach((t, k) => { t.ty = Math.max(PT + 19, k ? Math.max(t.yy, tags[k - 1].ty + gap) : t.yy); });
    for (let k = tags.length - 1; k >= 0; k--) { if (tags[k].ty > PB - 19) tags[k].ty = PB - 19; if (k < tags.length - 1 && tags[k].ty > tags[k + 1].ty - gap) tags[k].ty = tags[k + 1].ty - gap; }
    tags.forEach(t => {
      const iu = dates.indexOf(t.until), xe = x(iu < 0 ? N - 1 : iu), yy = t.yy;
      s += `<line x1="${x(n - 1)}" x2="${xe}" y1="${yy}" y2="${yy}" stroke="${C.yellow}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
      s += `<polyline points="${xe},${yy} ${PR + 4},${yy} ${PR + 12},${t.ty}" fill="none" stroke="${C.yellow}" stroke-width="1" stroke-dasharray="1 3" opacity=".7"/>`;
      s += `<circle cx="${xe}" cy="${yy}" r="3.2" fill="${C.yellow}"/>`;
      s += `<rect x="${PR + 12}" y="${t.ty - 19}" width="240" height="38" rx="5" fill="${C.panel2}" stroke="${C.yellow}" stroke-opacity=".6"/>`;
      s += `<circle cx="${PR + 30}" cy="${t.ty}" r="10" fill="none" stroke="${C.purpleL}" stroke-width="2"/>` + txt(PR + 30, t.ty + 4.5, t.num || '', { size: 12, fill: C.purpleL, weight: 800, anchor: 'middle' });
      s += txt(PR + 48, t.ty - 3, t.label, { size: 12.5, fill: C.yellow, weight: 700 });
      s += txt(PR + 48, t.ty + 12, t.sub, { size: 11.5, fill: C.muted });
    });


    const labelCands = (xm, ym, lines, prefer) => {
      const w = Math.max(...lines.map(l => tw(l.s, l.size, l.weight >= 700))) + 8, h = lines.length * 16 + 2;
      const offs = prefer === 'down' ? [34, 58, 82, 106, -40, -64, -88, -112, -136] : [-40, -64, -88, -112, -136, 34, 58, 82, 106];
      const out = [];
      offs.forEach(dy => ['r', 'l'].forEach(side => {
        const cy = ym + dy;
        const b = { x: side === 'r' ? xm + 16 : xm - 16 - w, y: cy - h / 2, w, h };
        const circ = { x: xm - 12, y: cy - 12, w: 24, h: 24 };
        const lead = { x: xm - 1.5, y: Math.min(ym, cy) + 4, w: 3, h: Math.max(0, Math.abs(cy - ym) - 8) };
        const base = ((b.y < PT - 4 || b.y + b.h > PB - 2 || b.x < PL - 50 || b.x + b.w > PR + 4 || circ.y < PT - 6) ? 10 : 0)
          + (hitsLine(b, true) ? 2 : 0) + (hitsLine(circ) ? 1 : 0);
        out.push({ cy, b, side, boxes: [b, circ, lead], hard: [b, circ], soft: [lead], base });
      }));
      return out;
    };
    const items = [];
    if (o.early) {
      const ie = dates.indexOf(o.early.date);
      if (ie >= 0 && ie < n) {
        const xm = x(ie), ym = y(cs[ie]), L = [{ s: o.early.label, size: 13, weight: 700 }, { s: o.early.sub, size: 12, weight: 400 }];
        items.push({ kind: 'early', date: o.early.date, xm, ym, L, cands: labelCands(xm, ym, L, 'up') });
      }
    }
    o.marks.forEach(m => {
      const im = dates.indexOf(m.date); if (im < 0 || im >= n) return;
      const xm = x(im), ym = y(cs[im]);
      const L = [{ s: m.label, size: 12.5, weight: 700 }]; if (m.sub) L.push({ s: m.sub, size: 11.5, weight: 400 });
      items.push({ kind: 'mark', m, date: m.date, xm, ym, L, cands: labelCands(xm, ym, L, m.side || 'up') });
    });
    items.forEach(it => placed.push({ x: it.xm - 4, y: it.ym - 4, w: 8, h: 8 }));
    placed.push({ x: x(n - 1) - 6, y: y(cs[n - 1]) - 6, w: 12, h: 12 });
    let bandItem = null;
    if (o._band) {
      const { xb, ym } = o._band, l1 = o.band.label, l2 = o.band.sub;
      const bw = Math.max(tw(l1, 12.5, true), tw(l2, 11.5)) + 14, bh = 36, cands = [];
      for (const by of [ym + 5, ym - bh - 5, ym - bh - 40]) {
        for (let bx = PR - bw - 2; bx >= Math.max(PL + 2, xb - bw); bx -= 20) {
          const bb = { x: bx, y: by, w: bw, h: bh };
          cands.push({ band: true, b: bb, boxes: [bb], hard: [bb], soft: [], base: ((bb.y < PT || bb.y + bb.h > PB + 2 || bb.x + bb.w > PR) ? 10 : 0) + (hitsLine(bb, true) ? 2 : 0) });
        }
      }
      bandItem = { kind: 'band', date: '9999', l1, l2, cands };
    }
    const pen = (c, pl) => c.base + c.hard.reduce((t, bx) => t + pl.filter(p => overlap(p, bx) && !(p.line && c.band)).length * 3, 0)
      + c.soft.reduce((t, bx) => t + pl.filter(p => !p.lead && overlap(p, bx)).length * 3, 0);
    const solve = order => {
      const pl = placed.slice(); let total = 0; const pick = new Map();
      order.forEach(it => {
        let best = null, bp = 1e9;
        for (const c of it.cands) { const v = pen(c, pl); if (v < bp) { bp = v; best = c; } if (v === 0) break; }
        if (!best) return;
        best.boxes.forEach((bx, k) => pl.push(k === 2 ? Object.assign({ lead: true }, bx) : bx));
        total += bp; pick.set(it, best);
      });
      return { total, pick };
    };
    const desc = items.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), asc = desc.slice().reverse();
    const orders = [desc, asc];
    if (bandItem) orders.push([bandItem].concat(desc), [bandItem].concat(asc), desc.concat([bandItem]), asc.concat([bandItem]));
    let sol = null;
    orders.forEach(ord => {
      const full = bandItem && !ord.includes(bandItem) ? ord.concat([bandItem]) : ord;
      const r = solve(full); if (!sol || r.total < sol.total) sol = r;
    });


    const all = bandItem ? items.concat([bandItem]) : items;
    for (let round = 0; round < 3; round++) {
      let moved = false;
      all.forEach(it => {
        const cur = sol.pick.get(it); if (!cur) return;
        const others = placed.slice();
        sol.pick.forEach((c, j) => { if (j !== it) c.boxes.forEach((bx, k) => others.push(k === 2 ? Object.assign({ lead: true }, bx) : bx)); });
        let best = cur, bp = pen(cur, others);
        if (bp === 0) return;
        for (const c of it.cands) { const v = pen(c, others); if (v < bp) { bp = v; best = c; } }
        if (best !== cur) { sol.pick.set(it, best); moved = true; }
      });
      if (!moved) break;
    }
    let labs = '';
    if (bandItem && sol.pick.get(bandItem)) {
      const bb = sol.pick.get(bandItem).b;
      labs += `<rect x="${bb.x}" y="${bb.y}" width="${bb.w}" height="${bb.h}" rx="4" fill="${C.panel}" opacity=".92"/>`;
      labs += txt(bb.x + 7, bb.y + 14, bandItem.l1, { size: 12.5, fill: C.purpleL, weight: 700 });
      labs += txt(bb.x + 7, bb.y + 29, bandItem.l2, { size: 11.5, fill: C.muted });
    }
    items.forEach(it => {
      const p = sol.pick.get(it); if (!p) return;
      const { xm, ym, L } = it, up = p.cy < ym;
      const tx = p.side === 'r' ? p.b.x + 4 : p.b.x + p.b.w - 4, an = p.side === 'r' ? 'start' : 'end';
      if (it.kind === 'early') {
        s += `<line x1="${xm}" x2="${xm}" y1="${ym + (up ? -7 : 7)}" y2="${p.cy}" stroke="${C.purpleL}" stroke-width="1"/>`;
        s += `<circle cx="${xm}" cy="${ym}" r="5.5" fill="${C.bg}" stroke="${C.purpleL}" stroke-width="2"/>`;
        labs += txt(tx, p.b.y + 13, L[0].s, { size: 13, fill: C.bright, weight: 700, anchor: an, halo: C.panel });
        labs += txt(tx, p.b.y + 29, L[1].s, { size: 12, fill: C.muted, anchor: an, halo: C.panel });
        return;
      }
      const m = it.m;
      s += `<line x1="${xm}" x2="${xm}" y1="${ym}" y2="${p.cy + (up ? 11 : -11)}" stroke="${m.muted ? C.dim : C.purpleL}" stroke-width="1"/>`;
      s += `<circle cx="${xm}" cy="${ym}" r="3.2" fill="${m.muted ? C.muted : C.purpleL}"/>`;
      if (m.num) {
        const fill = m.muted ? C.panel : m.asif ? C.bg : C.purple, stroke = m.muted ? C.dim : m.asif ? C.purpleL : C.purple;
        s += `<circle cx="${xm}" cy="${p.cy}" r="11" fill="${fill}" stroke="${stroke}" stroke-width="2" ${m.asif ? 'stroke-dasharray="3 2"' : ''}/>`;
        s += txt(xm, p.cy + 4.5, m.num, { size: 12.5, fill: m.muted ? C.muted : '#fff', weight: 800, anchor: 'middle' });
      } else {
        s += `<rect x="${xm - 6}" y="${p.cy - 6}" width="12" height="12" rx="2" fill="${C.panel}" stroke="${C.text}" stroke-width="1.5"/>`;
      }
      labs += txt(tx, p.b.y + 13, L[0].s, { size: 12.5, fill: m.muted ? C.muted : C.bright, weight: 700, anchor: an, halo: C.panel });
      if (L[1]) labs += txt(tx, p.b.y + 29, L[1].s, { size: 11.5, fill: C.muted, anchor: an, halo: C.panel });
    });

    s += `<circle cx="${x(n - 1)}" cy="${y(cs[n - 1])}" r="5.5" fill="${C.bright}" stroke="${C.purple}" stroke-width="2.4"/>`;
    const used = placed.filter(b => b !== nextTop);
    sol.pick.forEach(c => c.hard.forEach(b => used.push(b)));
    const nextY = !used.some(b => overlap(b, nextAtTop)) ? PT + 13 : !used.some(b => overlap(b, nextAtBot)) ? PB - 6 : null;
    if (nextY != null) s += txt(PR - 6, nextY, `next ${o.future.length} sessions`, { size: 11, fill: C.dim, anchor: 'end' });
    s += labs;

    const RY = PB + 30;
    s += txt(PL - 8, RY + 9, 'all 4', { size: 11, anchor: 'end', fill: C.muted, weight: 700 });
    const cw = (x(1) - x(0));
    for (let i = 0; i < n; i++) {
      if (wB[i] === 15 || wD[i] === 15) s += `<rect x="${x(i) - cw / 2}" y="${RY}" width="${cw + 0.4}" height="12" fill="${C.purple}" opacity="${wD[i] === 15 ? 1 : .42}"/>`;
    }
    s += `<rect x="${PL}" y="${RY}" width="${PR - PL}" height="12" fill="none" stroke="${C.grid}"/>`;
    s += `<rect x="${PR + 12}" y="${RY + 1}" width="12" height="10" fill="${C.purple}" opacity=".42"/>` + txt(PR + 29, RY + 10, 'washed everywhere', { size: 11.5 });
    s += `<rect x="${PR + 12}" y="${RY + 18}" width="12" height="10" fill="${C.purple}"/>` + txt(PR + 29, RY + 27, 'perfect washout', { size: 11.5 });
    return s + '</svg>';
  }

  window.PBFCharts = { sparkMeter, tfPanel, ladderTimeline, C };
})();
