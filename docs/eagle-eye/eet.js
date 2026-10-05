'use strict';



(function () {
  const LIVE_HOST = 'lawrencekenshin.github.io';
  const LIVE_BASE = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/eet-data/eet/';
  const BASE = location.hostname === LIVE_HOST ? LIVE_BASE : './data/';
  const LIST_MS = 60000, META_MS = 60000, KEEP_TF = 12;
  const fresh = new Map();
  const tfs = new Map();
  let lastOk = Date.now();

  function fail(msg, status) { return Object.assign(new Error(msg), { status }); }
  async function load(path) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(BASE + path, { cache: 'no-cache', signal: ctl.signal });
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
      const q = Math.pow(10, o.$d); let n = 0;
      return o.v.map(x => (x == null ? null : (n += x, n / q)));
    }
    if (Array.isArray(o.$rows)) {
      const cols = o.$rows.map(decode);
      return cols[0].map((_, i) => cols.map(c => c[i]));
    }
    const out = {};
    for (const k in o) out[k] = decode(o[k]);
    return out;
  }
  function cached(path, maxAge) {
    const hit = fresh.get(path);
    if (hit && hit.val && Date.now() - hit.at < maxAge) return Promise.resolve(hit.val);
    if (hit && hit.p) return hit.p;
    const p = load(path).then(val => { fresh.set(path, { at: Date.now(), val }); return val; },
      e => { if (hit && hit.val) { fresh.set(path, { at: hit.at, val: hit.val }); return hit.val; } fresh.delete(path); throw e; });
    fresh.set(path, Object.assign({}, hit, { p }));
    return p;
  }
  const manifest = () => cached('manifest.json', LIST_MS);
  const meta = sym => cached(encodeURIComponent(sym) + '/meta.json', META_MS);
  function frame(sym, tf, built) {
    const key = sym + '|' + tf + '|' + built;
    if (tfs.has(key)) return tfs.get(key);
    const p = load(encodeURIComponent(sym) + '/' + tf + '.json?v=' + built).then(decode);
    tfs.set(key, p);

    p.then(d => { if (d.built !== built) tfs.delete(key); }, () => tfs.delete(key));
    while (tfs.size > KEEP_TF) tfs.delete(tfs.keys().next().value);
    return p;
  }

  async function get(url) {
    const u = new URL(url, location.href), path = u.pathname, q = u.searchParams;
    const m0 = await manifest();
    if (path.endsWith('/api/symbols')) return { pinned: m0.pinned, symbols: m0.symbols };
    const sym = (q.get('s') || m0.pinned || 'QQQ').trim().toUpperCase(), h = q.get('h') || '3M';
    if (!m0.symbols.some(r => r[0] === sym)) throw fail(`${sym} is not on this page's list (${m0.symbols.length} tickers)`, 404);
    const mt = await meta(sym);
    const out = Object.assign({}, mt, { levels: (mt.levels_h || {})[h] || null });
    delete out.levels_h;
    if (path.endsWith('/api/meta')) return out;
    const tf = q.get('tf') || '1W';
    out.tf = tf;
    if (!(mt.tf_bars || {})[tf]) { out.di = { errors: {} }; return out; }
    const want = (mt.tf_built || {})[tf] || mt.version;
    const di = await frame(sym, tf, want);
    out.di = Object.assign({}, di, q.get('live') === '1' && di.table_live ? { table: di.table_live } : {});
    delete out.di.table_live;
    if (di.built && di.built !== want) out.version = -di.built;
    return out;
  }
  window.EET_STATIC = { get, lastOk: () => lastOk };
})();
