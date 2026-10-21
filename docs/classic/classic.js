'use strict';




window.CLASSIC = true;
(function () {
  const LIVE_HOST = 'lawrencekenshin.github.io';
  const RAW = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/';
  const onSite = location.hostname === LIVE_HOST;
  const BASE = onSite ? RAW + 'eet-data/eet/' : './data/';
  const CLS = onSite ? RAW + 'classic-data/classic/' : './snap/';
  const TFS = ['1D', '1W', '2W', '1M'];
  const LIST_MS = 60000, META_MS = 60000, KEEP_TF = 12, KEEP_VP = 4;
  const fresh = new Map();
  const tfs = new Map(), cls = new Map(), vps = new Map();
  let lastOk = Date.now();

  function fail(msg, status) { return Object.assign(new Error(msg), { status }); }
  const day = ymd => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  async function load(url) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(url, { cache: 'no-cache', signal: ctl.signal });
      if (!r.ok) throw fail(r.status === 404 ? 'not published' : 'HTTP ' + r.status, r.status);
      const j = await r.json();
      lastOk = Date.now();
      return j;
    } finally { clearTimeout(timer); }
  }


  function decode(o) {
    if (Array.isArray(o)) return o.map(decode);
    if (!o || typeof o !== 'object') return o;
    if ('$d' in o && Array.isArray(o.v)) {
      const d = o.$d, q = Math.pow(10, Math.abs(d)); let n = 0;
      return o.v.map(x => (x == null ? null : (n += x, d >= 0 ? n / q : n * q)));
    }
    if (Array.isArray(o.$c) && Array.isArray(o.i)) return o.i.map(k => (k == null ? null : o.$c[k]));
    if (Array.isArray(o.$o) && Array.isArray(o.r)) return o.r.map(r => { const m = {}; o.$o.forEach((k, j) => { m[k] = decode(r[j]); }); return m; });
    if (Array.isArray(o.$rows)) {
      const cols = o.$rows.map(decode);
      return cols[0].map((_, i) => cols.map(c => c[i]));
    }
    const out = {};
    for (const k in o) out[k] = decode(o[k]);
    return out;
  }
  function cached(url, maxAge) {
    const hit = fresh.get(url);
    if (hit && hit.val && Date.now() - hit.at < maxAge) return Promise.resolve(hit.val);
    if (hit && hit.p) return hit.p;
    const p = load(url).then(val => { fresh.set(url, { at: Date.now(), val }); return val; },
      e => { if (hit && hit.val) { fresh.set(url, { at: hit.at, val: hit.val }); return hit.val; } fresh.delete(url); throw e; });
    fresh.set(url, Object.assign({}, hit, { p }));
    return p;
  }
  const manifest = () => cached(BASE + 'manifest.json', LIST_MS);
  const meta = sym => cached(BASE + encodeURIComponent(sym) + '/meta.json', META_MS);

  const clsList = () => cached(CLS + 'manifest.json', LIST_MS).then(m => m.built || {}, () => ({}));
  function keep(map, key, p, n) {
    map.set(key, p);
    p.catch(() => map.delete(key));
    while (map.size > n) map.delete(map.keys().next().value);
    return p;
  }
  function frame(sym, tf, built) {
    const key = sym + '|' + tf + '|' + built;
    if (tfs.has(key)) return tfs.get(key);
    const p = load(BASE + encodeURIComponent(sym) + '/' + tf + '.json?v=' + built).then(decode);
    p.then(d => { if (d.built !== built) tfs.delete(key); }, () => {});
    return keep(tfs, key, p, KEEP_TF);
  }
  function panels(sym, tf, built) {
    const key = sym + '|' + tf + '|' + built;
    if (cls.has(key)) return cls.get(key);
    const p = load(CLS + encodeURIComponent(sym) + '/' + tf + '.json?v=' + built).then(decode);
    p.then(d => { if (d.built !== built) cls.delete(key); }, () => {});
    return keep(cls, key, p, KEEP_TF);
  }
  function profile(sym, built) {
    const key = sym + '|' + built;
    if (vps.has(key)) return vps.get(key);
    const p = load(CLS + encodeURIComponent(sym) + '/vp.json?v=' + built).then(decode);
    return keep(vps, key, p, KEEP_VP);
  }


  function vpRows(vp, bars, tf) {
    if (!vp || !Array.isArray(vp.rows) || !bars || !bars.length) return null;
    const t0 = bars[0][0], t1 = tf === '1D' ? bars[bars.length - 1][0] : Infinity;
    return { src: vp.src || '1D', rows: vp.rows.filter(r => r[0] >= t0 && r[0] <= t1) };
  }

  async function get(url) {
    const u = new URL(url, location.href), path = u.pathname, q = u.searchParams;
    const [m0, cl] = await Promise.all([manifest(), clsList()]);
    if (path.endsWith('/api/symbols')) return { pinned: m0.pinned, symbols: m0.symbols };
    const sym = (q.get('s') || m0.pinned || 'QQQ').trim().toUpperCase(), h = q.get('h') || '3M';
    if (!m0.symbols.some(r => r[0] === sym)) throw fail(`${sym} is not on this page's list (${m0.symbols.length} tickers)`, 404);
    const mt = await meta(sym), cb = cl[sym];
    const out = Object.assign({}, mt, { levels: (mt.levels_h || {})[h] || null });
    delete out.levels_h;

    if (mt.published) out.published = Object.assign({}, mt.published, { live: false });
    out.version = mt.version + ':' + (cb ? cb[0] : 0);
    if (path.endsWith('/api/meta')) return out;
    const tf = q.get('tf') || '1W';
    out.tf = tf;
    if (!(mt.tf_bars || {})[tf]) { out.di = { errors: {} }; return out; }
    const want = (mt.tf_built || {})[tf] || mt.version;
    const has = cb && (cb[2] || TFS).includes(tf);
    const [di, cf, vp] = await Promise.all([frame(sym, tf, want),
      has ? panels(sym, tf, cb[0]).catch(() => null) : null, has ? profile(sym, cb[0]).catch(() => null) : null]);
    out.di = Object.assign({}, di, q.get('live') === '1' && di.table_live ? { table: di.table_live } : {});
    delete out.di.table_live;
    out.di.errors = Object.assign({}, di.errors || {});
    if (cf && cf.panes) out.di.panes = cf.panes;
    else {
      out.di.panes = { t: [], sections: [], notes: [], ghost: null };
      out.di.errors.panels = 'no classic panels for ' + sym + (cb ? ' on this timeframe' : ' yet');
    }


    const pc = cf && cf.panes ? cf.candle || (cb && cb[1]) : null, cc = mt.published && mt.published.candle;
    const pt = out.di.panes.t || [], bars = out.di.bars || [];
    const behind = pt.length ? bars.filter(b => b[0] > pt[pt.length - 1]).length : 0;
    if (pc && cc && pc !== cc) out.di.errors.panels = 'through the ' + day(pc) + ' close';
    else if (behind) out.di.errors.panels = behind + (behind > 1 ? ' candles' : ' candle') + ' behind the chart';
    const rows = vpRows(vp, out.di.bars, tf);
    if (rows) out.di.vp = rows;
    if (di.built && di.built !== want) out.version = -di.built;
    else if (cf && cb && cf.built !== cb[0]) out.version += ':old';
    return out;
  }
  window.EET_STATIC = { get, lastOk: () => lastOk, tfs: TFS, vp: true };

  const t = document.querySelector('nav.tabs'), a = t && t.querySelector('[aria-current=page]');
  if (a && t.scrollWidth > t.clientWidth) t.scrollLeft = a.offsetLeft - (t.clientWidth - a.offsetWidth) / 2;
})();
