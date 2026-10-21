'use strict';

function reachOf(lv) {
  const ps = [lv.king, lv.call_wall, lv.put_wall].filter(p => p != null);
  return Math.min(BAND_MAX, Math.max(BAND, ...ps.map(p => Math.abs(p / lv.spot - 1) + 0.002)));
}
function gexLabels(lv) {
  const n = COMPACT(), W = n ? '' : ' WALL', out = [];
  let king = n ? `KING ${fmtK(lv.king)}` : `KING ${fmtK(lv.king)} ${fmtM(lv.king_gex)}`;
  if (lv.call_wall === lv.king) king += n ? '·C' : ' · CALL WALL';
  if (lv.put_wall === lv.king) king += n ? '·P' : ' · PUT WALL';
  out.push([lv.king, king, C.king]);
  if (lv.call_wall != null && lv.call_wall !== lv.king && lv.call_wall === lv.put_wall) out.push([lv.call_wall, `CALL + PUT${W} ${fmtK(lv.call_wall)}`, C.call]);
  else {
    if (lv.call_wall != null && lv.call_wall !== lv.king) out.push([lv.call_wall, `CALL${W} ${fmtK(lv.call_wall)}`, C.call]);
    if (lv.put_wall != null && lv.put_wall !== lv.king) out.push([lv.put_wall, `PUT${W} ${fmtK(lv.put_wall)}`, C.put]);
  }
  if (lv.flip != null) out.push([lv.flip, `FLIP${n ? '' : ' est'} ${lv.flip.toFixed(2)}`, C.flip]);
  return out;
}
function renderGex() {
  const m = meta || state, lv = m.levels;
  const key = lv ? [lv.h, lv.king, lv.call_wall, lv.put_wall, lv.flip && lv.flip.toFixed(2), structKey].join('|') : 'none|' + structKey;
  if (key !== gexKey && candles) {
    gexKey = key;
    gexLines.forEach(l => candles.removePriceLine(l)); gexLines = [];
    if (lv) {
      const add = (p, color, style) => { if (p != null) gexLines.push(candles.createPriceLine({ price: p, color, lineWidth: 2, lineStyle: style, axisLabelVisible: true, title: '' })); };
      add(lv.king, C.king, 0);
      if (lv.call_wall !== lv.king) add(lv.call_wall, C.call, 0);
      if (lv.put_wall !== lv.king && lv.put_wall !== lv.call_wall) add(lv.put_wall, C.put, 0);
      add(lv.flip, C.flip, 2);
      const r = reachOf(lv), ps = [lv.king, lv.call_wall, lv.put_wall, lv.flip].filter(p => p != null && Math.abs(p / lv.spot - 1) < BAND_MAX);
      levelsRange = [Math.min(lv.spot * (1 - r), ...ps) - 0.3, Math.max(lv.spot * (1 + r), ...ps) + 0.3];
    } else levelsRange = null;
    sig = '';
  }
  const d = m.data, p = m.price, nowS = Date.now() / 1000;
  const row = (a, b, warn, color) => `<tr><td>${esc(a)}</td><td${warn ? ' class="warn"' : ''}${color ? ` style="color:${color}"` : ''}>${esc(b)}</td></tr>`;
  const collapsed = gexCollapsed();
  const summary = lv ? `${PHONE() ? '' : (lv.h || '3M') + ' · '}King ${fmtK(lv.king)} · Flip ${lv.flip != null ? lv.flip.toFixed(2) : '—'} · Net ${fmtM(lv.net)}` : m.kind === 'crypto' ? 'no options data for crypto yet' : m.has_chain === false ? 'no saved option chain' : 'waiting for data';
  const nm = esc(m.symbol || sym);
  let h = collapsed ? `<tr class="hd"><td>GEX ${nm} ▸</td><td>${esc(summary)}</td></tr>` :
    `<tr class="hd"><td>GEX ${nm} ▾</td><td>${gexBars === 'oi' ? 'bars: open interest (contracts)' : (m.published ? '$ per 1% move' : 'live · $ per 1% move')}</td></tr>`;
  const chip = (attr, v, on, label) => `<span class="chip${on ? ' on' : ''}" data-${attr}="${v}">${label}</span>`;
  h += `<tr class="chips"><td colspan="2" title="Expiries counted · bars as net or calls and puts apart">${GEX_H.map(x => chip('gh', x, x === gexH, x)).join('')}` +
       `<span class="sep"></span>${chip('gb', 'net', gexBars === 'net', 'Net')}${chip('gb', 'split', gexBars === 'split', PHONE() ? 'C·P' : 'Calls·Puts')}` +
       `${chip('gb', 'oi', gexBars === 'oi', 'OI')}</td></tr>`;
  if (lv) {
    h += row('Net GEX', fmtM(lv.net), false, lv.net >= 0 ? C.call : C.put);
    h += row('King node', `${fmtK(lv.king)}  ${fmtM(lv.king_gex)}`, false, C.king);
    if (lv.runner_up != null && Math.abs(lv.runner_up_gex) >= 0.95 * Math.abs(lv.king_gex)) h += row('', `near-tie: ${fmtK(lv.runner_up)}  ${fmtM(lv.runner_up_gex)}`, true);
    h += row('Call / Put wall', `${fmtK(lv.call_wall)} / ${fmtK(lv.put_wall)}`);
    h += row('Flip (est.)', lv.flip != null ? lv.flip.toFixed(2) : 'none within ±8%');
    if (lv.call_oi_wall != null || lv.put_oi_wall != null)
      h += row('OI wall C / P', `${fmtK(lv.call_oi_wall)} (${fmtN(lv.call_oi)}) / ${fmtK(lv.put_oi_wall)} (${fmtN(lv.put_oi)})`);
    if (lv.expiries) h += row('Expiries', `${lv.expiries} · last ${lv.last_expiry}`);
    if (m.market_open && lv.zdte_share >= 0.1) h += row('Expires today', `${Math.round(lv.zdte_share * 100)}% of gamma near price`, true);
  } else h += row('Levels', m.kind === 'crypto' ? 'no options data for crypto yet' : m.has_chain === false ? `no saved option chain for ${m.symbol || sym}` : 'waiting for data', true);
  if (d) {
    h += row('Positions', d.oi_settle + ' settle' + (d.oi_fresh ? '' : ` · ${d.oi_expected} not in yet`), !d.oi_fresh);
    h += row('Volatility', d.iv_asof, d.iv_age_h > 30);
  }
  const pt = p && p.time ? new Date(p.time * 1000).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }) + ' ET' : '—';
  const stale = m.market_open && p && p.time && nowS - p.time > 3 * (m.poll_s || 120) + 60;
  const fallback = p && p.source === 'last daily close';
  const pday = p && p.time ? new Date(p.time * 1000).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }) : '';
  if (m.published) h += row('Price', p && p.last ? `${p.last.toFixed(2)} · ${p.source === 'delayed' && pubOpen(m) ? 'delayed, ' + pt : pubDay(m.published.candle) + ' close'}` : '—');
  else h += row('Price', fallback ? `${p.last.toFixed(2)} · last close ${pday} (live feed down)` :
    `${p && p.last ? p.last.toFixed(2) : '—'} · ${m.market_open ? pt : 'market closed'}`, stale || fallback);
  h += row('Sign', 'assumed: calls +, puts −');
  $('gexb').innerHTML = h;
  $('gex').classList.toggle('min', collapsed);
  if (!collapsed) gexRows = $('gexb').rows.length;
}
let gexRows = 12;
const fmtN = n => (!n ? '0' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));

function gexTooTall() {
  const ph = chart && $('chart').style.display !== 'none' ? chart.panes()[0].getHeight() : 0;
  return ph > 0 && gexRows * (PHONE() ? 22 : 24) + 26 > 0.5 * ph;
}

function gexCollapsed() {
  try { const v = localStorage.getItem('gexdash.gexmin.' + tf); if (v != null) return v === '1'; } catch (e) {  }
  return !INTRADAY.has(tf) || gexTooTall();
}


const pubOpen = m => { const s = m && m.session, t = Date.now() / 1000; return !!(s && t >= s.open && t < s.close); };
const pubDay = ymd => (ymd ? new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : '');
const cadence = s => (!s ? '2 min' : s < 60 ? s + ' s' : Math.round(s / 60) + ' min');
const srcName = p => (!p ? '—' : p.source === 'delayed' ? 'delayed ~15 min' : p.source === 'close' ? 'daily close' : 'last close');

function renderHead() {
  const m = meta || state, bars = (state && state.di && state.di.bars) || [];
  $('symname').textContent = m.name || m.symbol || sym;
  $('exch').textContent = (m.exchange ? ' · ' + m.exchange : '') + (m.kind === 'crypto' ? ' · times in UTC' : '');
  document.title = (m.symbol || sym) + ' · ' + PAGE_NAME;
  markTfs(m);
  if (bars.length) {
    const b = bars[bars.length - 1], p = m.price;
    const chg = p && p.prev_close && p.last ? p.last - p.prev_close : null;
    $('ohlc').innerHTML = `O${b[1].toFixed(2)} H${b[2].toFixed(2)} L${b[3].toFixed(2)} C${b[4].toFixed(2)} ` +
      (chg != null ? `<span class="${chg >= 0 ? 'up' : 'dn'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)} (${(chg / p.prev_close * 100).toFixed(2)}%)</span>` : '');
  }
  const d = m.data;
  const errs = Object.entries(Object.assign({}, m.errors || {}, (state && state.di && state.di.errors) || {}))
    .map(([k, v]) => `<span class="err">${esc(k)}: ${esc(v)}</span>`).join(' · ');
  const pubTxt = m.published ? ` · updated after each close${m.published.live ? ', this ticker every 15 min in the session (hourly charts after the close)' : ''}` : '';
  $('ind').innerHTML = `${CLASSIC_PAGE ? 'Classic Indicators · Volume, RSI, MACD, Stoch RSI, KDJ, OBV MACD, Williams %R, BB %B, WMSR + GEX' : 'Eagle Eye Technicals · Desktop Integrated + GEX'} · options: ${m.kind === 'crypto' ? 'none yet for crypto' : 'saved option chain ' + (d ? esc(d.build_et) : '—')} · price: ${esc(srcName(m.price))}${m.published ? pubTxt : ', every ' + cadence(m.poll_s)}` +
    ' · charts: <a class="credit" href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a>' +
    (errs ? '<br>' + errs : '');
  const ib = $('infobtn'); if (ib) ib.classList.toggle('err', !!errs);
}

const SMALLUI = () => window.matchMedia('(max-width: 700px), (max-height: 500px)').matches;
(function () {
  const t = document.querySelector('#head .t');
  if (t && !$('infobtn')) {
    const b = document.createElement('button');
    b.id = 'infobtn'; b.type = 'button'; b.textContent = 'ⓘ'; b.title = 'Data sources and notes';
    t.after(b);
    b.addEventListener('click', e => {
      e.stopPropagation();
      const on = document.body.classList.toggle('showinfo');
      try { localStorage.setItem('gexdash.info', on ? '1' : '0'); } catch (x) {  }
    });
    try { if (localStorage.getItem('gexdash.info') === '1') document.body.classList.add('showinfo'); } catch (x) {  }
  }
  const main = $('main');
  if (main && !$('pagefoot')) {
    const f = document.createElement('div');
    f.id = 'pagefoot';
    f.innerHTML = 'charts: <a class="credit" href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a>';
    main.after(f);
  }
  const bar = $('bar');
  if (bar && !$('fsexit')) {
    const x = document.createElement('button');
    x.id = 'fsexit'; x.type = 'button'; x.textContent = '✕'; x.title = 'Back to the full page (or double-tap the chart)';
    bar.appendChild(x);
    x.addEventListener('click', e => { e.stopPropagation(); setMaximized(null); });
  }
})();
function renderStatus() {
  const m = meta;
  if (!m) return;
  const p = m.price, nowS = Date.now() / 1000, pollAge = (Date.now() - lastOkPoll) / 1000;
  let cls = '', txt;
  if (m.published) {
    const pb = m.published, day = pubDay(pb.candle), open = pubOpen(m);
    const builtAge = nowS - (pb.built || 0), at = new Date((pb.built || 0) * 1000).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
    const okAge = (Date.now() - (window.EET_STATIC.lastOk ? window.EET_STATIC.lastOk() : lastOkPoll)) / 1000;
    if (okAge > 180) { cls = 'err'; txt = `could not refresh for ${Math.round(okAge / 60)} min · showing ${p && p.last ? p.last.toFixed(2) : 'the last copy'}`; }
    else if (p && p.source === 'delayed' && open) {
      cls = builtAge > 45 * 60 ? 'stale' : 'live';
      txt = `${p.last.toFixed(2)} · delayed ~15 min · updated ${at} ET`;
    } else if (p && p.source === 'delayed') { txt = `${p.last.toFixed(2)} · ${day} session, updated ${at} ET`; cls = ''; }
    else { txt = `as of the ${day} close${p && p.last ? ' · ' + p.last.toFixed(2) : ''}`; cls = builtAge > 4 * 86400 ? 'stale' : ''; }
    $('dot').className = cls; $('stxt').textContent = txt;
    return;
  }
  let short;
  if (pollAge > 30) { cls = 'err'; txt = `server unreachable for ${Math.round(pollAge)} s`; short = `offline ${Math.round(pollAge)} s`; }
  else if (!p || !p.last) { cls = 'stale'; txt = short = 'no price yet'; }
  else if (p.source === 'last daily close') {
    cls = 'stale';
    txt = m.errors && m.errors.live ? `live price unavailable (${m.errors.live}) · showing last close ${p.last.toFixed(2)}`
      : `waiting for the live price · showing last close ${p.last.toFixed(2)}`;
    short = `last close ${p.last.toFixed(2)}`;
  }
  else if (!m.market_open) { txt = `market closed · last ${p && p.last ? p.last.toFixed(2) : '—'}`; short = 'market closed'; }
  else {
    const age = p && p.time ? nowS - p.time : 1e9, ageTxt = age < 90 ? Math.max(0, Math.round(age)) + ' s' : Math.round(age / 60) + ' min';
    cls = age > 3 * (m.poll_s || 120) + 60 ? 'stale' : 'live';
    txt = `live · ${srcName(p)} · ${ageTxt} old · every ${cadence(m.poll_s)}` +
      (m.live_tickers > 1 ? ` · ${m.live_tickers} tickers live` : '');
    short = `live · ${ageTxt}`;
  }
  if (cls !== 'err' && m.errors && Object.keys(m.errors).some(k => k !== 'history')) cls = 'stale';
  $('dot').className = cls; $('stxt').textContent = SMALLUI() ? short : txt; $('status').title = txt;
}


function paneGeom() {
  const out = [{ top: 0, h: chart && $('chart').style.display !== 'none' ? chart.panes()[0].getHeight() : 0 }];
  if (dchart && $('dchart').style.display !== 'none') {
    let y = $('dchart').offsetTop;
    dchart.panes().forEach(p => { const h = p.getHeight(); out.push({ top: y, h }); y += h + 1; });
  }
  return out;
}
const partsHtml = (parts, fallback, color) => (parts && parts.length ? parts : [{ text: fallback, color }])
  .map(p => `<span style="color:${esc(p.color || color || '#d1d4dc')}">${esc(p.text)}</span>`).join('');
function frameGroups(secs) {
  const out = [];
  secs.forEach((s, k) => {
    const last = out[out.length - 1];
    if (last && s.card === 'red' && last.card === 'red') last.to = k;
    else out.push({ card: s.card, from: k, to: k, frame: s.frame || { color: s.frame_color } });
  });
  return out;
}
function renderCards() {
  const host = $('cards');
  const secs = (state && state.di && state.di.panes && state.di.panes.sections) || [];
  if (!chart || !secs.length) { host.innerHTML = ''; return; }
  const g = paneGeom(), w = dchart.timeScale().width(), pw = chart.timeScale().width();
  const firstDi = g.findIndex((pg, i) => i > 0 && pg.h >= 30);


  const fing = COARSE(), B = fing ? 32 : 22, btnTop = (pg, i) => (fing ? pg.top + pg.h - B - 8 : pg.top + (i === 0 ? 46 : 8));
  $('maxbtns').innerHTML = g.map((pg, i) => (pg.h < 30 || (i > 0 && i !== firstDi) ? '' :
    `<div class="maxbtn" data-i="${i}" title="${maxPane === null ? (i === 0 ? 'Expand the price chart' : 'Expand all the indicators') + ' (or double-click)' : 'Restore (or double-click / Esc)'}" ` +
    `style="top:${btnTop(pg, i)}px;left:${(i === 0 ? pw : w) - B - 8}px">${maxPane === null ? '⤢' : '⤡'}</div>`)).join('');
  if (g[0] && g[0].h >= 30)
    $('maxbtns').innerHTML += `<div class="maxbtn" data-act="reset" title="Reset the price chart view (Alt+R)" ` +
      `style="top:${btnTop(g[0], 0)}px;left:${pw - 2 * B - 14}px">⟲</div>`;
  const hsp = $('hsplit');
  if (maxPane === null && g[1]) { hsp.style.display = ''; hsp.style.top = ($('dchart').offsetTop - 7) + 'px'; hsp.style.width = '100%'; }
  else hsp.style.display = 'none';
  let html = '';
  const phone = PHONE();
  secs.forEach((s, k) => {
    const pg = g[k + 1]; if (!pg || pg.h < 40) return;
    const lines = (s.lines || []).filter((l, j) => !(j === 0 && l.text === s.title));
    let body;
    if (phone) {
      let vals = lines.filter(l => l.ghost != null || VAL_LINE.test(l.text)).slice(0, 3);
      if (!vals.length && CLASSIC_PAGE) vals = lines.slice(0, 1);
      body = vals.length ? `<div>${vals.map(l => partsHtml(l.parts, l.text, l.color)).join('<span class="muted"> · </span>')}</div>` : '';
    } else {
      const fit = Math.max(0, Math.floor((pg.h - 16) / 19.5) - 1);
      body = lines.slice(0, fit).map(l => `<div>${partsHtml(l.parts, l.text, l.color)}</div>`).join('');
    }
    html += `<div class="card${phone ? ' phone' : ''}" data-k="${k}" style="left:${phone ? 14 : 18}px;top:${pg.top + (phone ? 6 : 8)}px` +
      `${phone ? `;max-width:${w - 40}px` : ''}"><div class="ti">${partsHtml(s.title_parts, s.title, s.title_color)}</div>${body}</div>`;
  });
  if (maxPane === null) (state.di.panes.notes || []).forEach(n => {
    const last = g[g.length - 1];
    let top = n.anchor === 'above_cards' ? (g[1] ? g[1].top - 17 : 0) : last.top + last.h - 17;
    if (n.anchor === 'above_section') {
      const k = secs.findIndex(s => s.id === n.section);
      if (k < 0 || !g[k + 1] || g[k + 1].h < 40) return;
      top = g[k + 1].top - (k > 0 ? 22 : 17);
    }
    const parts = phone && n.parts && n.parts.length ? (n.phone_parts || n.parts.slice(-1)) : n.parts;
    html += `<div class="note" style="right:${dchart.priceScale('right').width() + 18}px;top:${top}px">${partsHtml(parts, n.text, n.color)}</div>`;
  });
  host.innerHTML = html;
  let right = 0;
  host.querySelectorAll('.card').forEach(c => {
    right = Math.max(right, c.offsetLeft + c.offsetWidth);
    if (phone) {
      const k = Number(c.dataset.k), pg = g[k + 1];
      const top = Math.min(0.6, (c.offsetHeight + 10) / Math.max(1, pg.h));
      try { dchart.priceScale('right', k).applyOptions({ scaleMargins: { top, bottom: bottomMargin(secs[k], pg.h) } }); } catch (e) {  }
    }
  });
  if (!phone && !cardMarginsReset) {
    secs.forEach((s, k) => { try { dchart.priceScale('right', k).applyOptions({ scaleMargins: { top: 0.08, bottom: 0.06 } }); } catch (e) {  } });
    cardMarginsReset = true;
  }
  if (phone) cardMarginsReset = false;
  if (!phone) {
    if (bandMargins.chart !== dchart) bandMargins = { chart: dchart };
    secs.forEach((s, k) => {
      const pg = g[k + 1], b = pg ? bottomMargin(s, pg.h) : 0.06;
      if (b === 0.06 || bandMargins[s.id] === b) return;
      bandMargins[s.id] = b;
      try { dchart.priceScale('right', k).applyOptions({ scaleMargins: { top: 0.08, bottom: b } }); } catch (e) {  }
    });
  } else bandMargins = {};
  const want = phone ? 0 : Math.min(right + 16, w * 0.7);
  if (CLASSIC_PAGE) {
    const nr = {};
    if (!phone) {
      secs.forEach(s => { nr[s.id] = 0; });
      host.querySelectorAll('.card').forEach(c => { const s = secs[Number(c.dataset.k)]; if (s) nr[s.id] = Math.min(c.offsetLeft + c.offsetWidth + 16, w * 0.7); });
    }
    const ka = Object.keys(nr), kb = Object.keys(secRight);
    if (ka.length !== kb.length || ka.some(id => !(id in secRight) || Math.abs(nr[id] - secRight[id]) > 2)) {
      secRight = nr; lastCut = -1;
      if (Math.abs(want - cardRight) <= 2) applyCut();
    }
  }
  if (Math.abs(want - cardRight) > 2) { cardRight = want; lastCut = -1; applyCut(); }
}
let cardMarginsReset = false;


const VAL_LINE = CLASSIC_PAGE ? /^%?[A-Z][A-Za-z0-9 -]{0,9}( \(\d+\))?[ ][+−-]?[0-9](?!.* [·/] )/ : /^[A-Z][A-Za-z0-9 -]{0,9}[ ][+−-]?[0-9]/;

const BAND_ROOM = 14;
const bottomMargin = (s, h) => (s && (s.series || []).some(x => x.kind === 'band') && h > 0 ? Math.round(Math.min(0.3, (BAND_ROOM + 4) / h) * 100) / 100 : 0.06);
let bandMargins = {};


$('ditb').addEventListener('click', e => {
  if (!e.target.closest('.modebtn')) return;
  tableLive = !tableLive;
  try { localStorage.setItem('gexdash.tablelive', tableLive ? '1' : '0'); } catch (x) {  }
  loadState(true);
});
function renderSide() {
  const t = state.di && state.di.table;
  if (t) {
    let h = '';
    if (t.groups && t.groups.length) {
      h += '<tr class="grp"><td></td>';
      let col = 0;
      t.groups.forEach(gr => {
        const a = gr.span[0], b = gr.span[1];
        if (a > col) h += `<td colspan="${a - col}"></td>`;
        h += `<td colspan="${b - a + 1}" style="color:${esc(gr.color)};border-bottom:3px solid ${esc(gr.color)}">${esc(gr.label)}</td>`;
        col = b + 1;
      });
      h += '</tr>';
    }
    (t.rows || []).forEach(r => {
      const mode = r.key === 'header';
      const tip = mode ? (r.label_tip || '') + '\n\nClick to switch to ' + (t.mode === 'LIVE' ? 'CLOSED' : 'LIVE') + '.' : (r.label_tip || '');
      h += `<tr><td class="rl${mode ? ' modebtn' : ''}"${r.label_color ? ` style="color:${esc(r.label_color)}"` : ''}${tip ? ` title="${esc(tip)}"` : ''}>${esc(r.label)}${mode ? ' ⇄' : ''}</td>`;
      (r.cells || []).forEach((c, j) => {
        const col = (t.columns || [])[j] || {};
        const cls = [(r.key === 'header' || r.key === 'closed') && col.highlight ? 'hl' : '', c.mark ? 'mk' : ''].join(' ').trim();
        h += `<td${cls ? ` class="${cls}"` : ''}${c.tip ? ` title="${esc(c.tip)}"` : ''} style="background:${esc(c.bg || 'transparent')};color:${esc(c.fg || '#d1d4dc')};${c.bold ? 'font-weight:700' : ''}">${esc(c.text)}</td>`;
      });
      h += '</tr>';
    });
    $('ditb').innerHTML = h;
    $('difoot').innerHTML = (t.footer || []).map(f => `<div style="color:${esc(f.color || '#b2b5be')}">${esc(f.text)}</div>`).join('');
  } else {
    $('ditb').innerHTML = `<tr><td class="muted">Desktop Integrated table: ${window.EET_STATIC && state && state.di && !state.di.bars ? 'no table for this timeframe' : 'waiting for data'}</td></tr>`;
    $('difoot').innerHTML = '';
  }
  const e = state.di && state.di.episode, ep = $('episode');
  if (e) {
    ep.style.display = '';
    ep.style.borderColor = e.frame_color || '#ef5350';
    ep.innerHTML = `<div class="tt"><span style="color:${esc(e.title_color || e.frame_color || '#ef5350')}">${esc(e.title)}</span><span class="muted">${esc(e.subtitle || '')}</span></div>` +
      (e.lines || []).map(l => `<div style="color:${esc(l.color || '#b2b5be')}">${esc(l.text)}</div>`).join('');
  } else ep.style.display = 'none';
}



function drawGhosts(c, g, paneW) {
  const P = state.di && state.di.panes;
  if (!P || !P.ghost || !P.ghost.on || !dchart) return;
  const ts = dchart.timeScale(), pt = P.t || [];
  const xAt = i => (i != null && pt[i] != null ? ts.timeToCoordinate(pt[i]) : null);
  const bs = ts.options().barSpacing;
  const GX = xAt(P.ghost.index);
  if (P.ghost.column_color && GX != null && g[1]) {
    const last = g[g.length - 1];
    c.fillStyle = P.ghost.column_color;
    c.fillRect(GX - Math.max(3, bs) / 2, g[1].top, Math.max(3, bs), last.top + last.h - g[1].top);
  }
  (P.sections || []).forEach((s, k) => {
    const pg = g[k + 1];
    if (!pg) return;
    c.save(); c.beginPath(); c.rect(0, pg.top, paneW, pg.h); c.clip();
    (s.series || []).forEach(x => {
      const gh = x.ghost, ser = dseries[s.id + '/' + x.id];
      if (!gh || !ser) return;
      const X = xAt(gh.index), Yr = ser.priceToCoordinate(gh.value);
      if (X == null || Yr == null) return;
      const Y = Yr + pg.top;
      if (x.kind === 'histogram') {
        const b0 = ser.priceToCoordinate(x.base || 0);
        if (b0 == null) return;
        const w = Math.max(2, bs * 0.6), y0 = b0 + pg.top;
        c.fillStyle = gh.color; c.fillRect(X - w / 2, Math.min(Y, y0), w, Math.max(1, Math.abs(Y - y0)));
        return;
      }
      const X0 = xAt(gh.from_index), Y0r = gh.from_value != null ? ser.priceToCoordinate(gh.from_value) : null;
      const Y0 = Y0r == null ? null : Y0r + pg.top;
      if (gh.fill && X0 != null && Y0 != null) {
        const zr = ser.priceToCoordinate(0);
        if (zr != null) {
          c.fillStyle = gh.fill; c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X, Y);
          c.lineTo(X, zr + pg.top); c.lineTo(X0, zr + pg.top); c.closePath(); c.fill();
        }
      }
      if (X0 != null && Y0 != null) {
        c.strokeStyle = gh.color; c.lineWidth = gh.width || 1;
        c.setLineDash(gh.style === 'dotted' ? [2, 3] : gh.style === 'dashed' ? [5, 4] : []);
        c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X, Y); c.stroke(); c.setLineDash([]);
      }
      if (gh.ring) {
        c.strokeStyle = gh.ring_color || gh.color; c.lineWidth = 1.3;
        c.beginPath(); c.arc(X, Y, 3.4, 0, Math.PI * 2); c.stroke();
      }
    });
    c.restore();
  });
}




let markerHits = [];
const PICTO = /\p{Extended_Pictographic}/u;
function drawClassic(c, cb, g, paneW) {
  markerHits = [];
  const P = state && state.di && state.di.panes;
  if (!P || !P.sections || !dchart) return;
  const ts = dchart.timeScale(), pt = P.t || [], bs = ts.options().barSpacing;
  const vr = ts.getVisibleLogicalRange();
  if (!vr) return;
  P.sections.forEach((s, k) => {
    const pg = g[k + 1], host = hostOf(s);
    if (!pg || pg.h < 20 || !host) return;
    const cut = Math.max(0, secCut[s.id] != null ? secCut[s.id] : lastCut);
    const i0 = Math.max(cut, Math.floor(vr.from) - 1), i1 = Math.min(pt.length - 1, Math.ceil(vr.to) + 1);
    if (s.band_fill) {
      const f = s.band_fill, ya = host.priceToCoordinate(f.from), yb = host.priceToCoordinate(f.to);
      if (ya != null && yb != null) {
        const top = Math.max(0, Math.min(ya, yb)), bot = Math.min(pg.h, Math.max(ya, yb)), x0 = Math.max(0, rightOf(s));
        if (bot > top && paneW > x0) { cb.fillStyle = f.color; cb.fillRect(x0, pg.top + top, paneW - x0, bot - top); }
      }
    }
    c.save(); c.beginPath(); c.rect(0, pg.top, paneW, pg.h); c.clip();
    (s.series || []).forEach(x => {
      if (x.kind !== 'band') return;
      const hh = x.height_px || 4, y = pg.top + pg.h - BAND_ROOM + 2, w = Math.max(1, bs), cols = x.colors || [];
      const xl = ts.logicalToCoordinate(cut);
      const bar = (X, col) => { const a = Math.max(X - w / 2, xl == null ? -Infinity : xl); if (X + w / 2 > a) { c.fillStyle = col; c.fillRect(a, y, X + w / 2 - a, hh); } };
      for (let i = i0; i <= i1; i++) {
        const X = cols[i] ? ts.logicalToCoordinate(i) : null;
        if (X != null) bar(X, cols[i]);
      }
      const gh = x.ghost;
      const GX = gh && gh.color && gh.index >= cut ? ts.logicalToCoordinate(gh.index) : null;
      if (GX != null) bar(GX, gh.color);
    });
    (s.markers || []).forEach(m => {
      if (m.i == null || m.i < cut || m.i >= pt.length) return;
      const X = ts.logicalToCoordinate(m.i);
      if (X == null || X < -12 || X > paneW + 12) return;
      const r = (m.size_px || 8) / 2, below = m.pos !== 'above';
      let Y = m.value != null ? host.priceToCoordinate(m.value) : null;
      if (Y == null) Y = below ? pg.h - BAND_ROOM - r - 2 : r + 4;
      Y += pg.top;
      c.fillStyle = m.color || '#d1d4dc';
      if (m.shape === 'circle') { c.beginPath(); c.arc(X, Y, r, 0, Math.PI * 2); c.fill(); }
      else if (m.shape === 'triangle_up' || m.shape === 'triangle_down') {
        const d = m.shape === 'triangle_up' ? 1 : -1;
        c.beginPath(); c.moveTo(X, Y - d * r); c.lineTo(X + r, Y + d * r * 0.8); c.lineTo(X - r, Y + d * r * 0.8); c.closePath(); c.fill();
      }
      if (m.text) {
        const big = PICTO.test(m.text), rr = m.shape === 'none' ? 0 : r, fs = big ? 12 : 10;
        c.font = `${fs}px -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
        c.fillStyle = m.text_color || m.color || '#d1d4dc';
        let band = 0;
        if (PHONE()) try { band = (dchart.priceScale('right', k).options().scaleMargins.top || 0) * pg.h - 2; } catch (e) {  }
        const lo = pg.top + Math.max(6, band), hi = pg.top + pg.h - 6, ty = below ? Y + rr + 2 : Y - rr - 2;
        if (below ? ty + fs <= hi : ty - fs >= lo) {
          c.textAlign = 'center'; c.textBaseline = below ? 'top' : 'bottom'; c.fillText(m.text, X, ty);
        } else {
          const tw = c.measureText(m.text).width, right = X + rr + 3 + tw <= paneW - 4;
          c.textAlign = right ? 'left' : 'right'; c.textBaseline = 'middle';
          c.fillText(m.text, right ? X + rr + 3 : X - rr - 3, Math.min(hi - fs / 2, Math.max(lo + fs / 2, Y)));
        }
      }
      if (m.tip || m.text) markerHits.push({ x: X, y: Y, r: Math.max(7, r + 3), tip: m.tip || m.text, color: m.color });
    });
    c.restore();
  });
}

$('chartbox').addEventListener('mousemove', e => {
  if (!markerHits.length && !vpDrawn) { const t = $('mtip'); if (t) t.hidden = true; return; }
  const r = $('chartbox').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = Infinity;

  markerHits.forEach(h => { const d = Math.hypot(h.x - x, h.y - y); if (d <= h.r && d <= bd) { bd = d; best = h; } });
  if (!best) best = vpTipAt(x, y);
  let t = $('mtip');
  if (!best) { if (t) t.hidden = true; return; }
  if (!t) { t = document.createElement('div'); t.id = 'mtip'; $('chartbox').appendChild(t); }
  t.textContent = best.tip; t.style.borderColor = best.color || '#363a45'; t.hidden = false;
  t.style.left = Math.min(x + 12, r.width - t.offsetWidth - 4) + 'px'; t.style.top = Math.max(0, y - 30) + 'px';
});
$('chartbox').addEventListener('mouseleave', () => { const t = $('mtip'); if (t) t.hidden = true; });








const VP_NAME = { vis: 'visible range', '3M': '3 months', '6M': '6 months', '1Y': '1 year', YTD: 'year to date' };
const VP_SRC = { '1D': 'daily', '1H': 'hourly', '5m': '5-minute' };
let vprof = null, vpKey = '', vpBase = '', vpDue = 0, vpTimer = 0, vpDrawn = null;
const fmtVol = v => (v >= 1e9 ? (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(Math.round(v)));
const fmtVp = v => (v >= 1e4 ? String(Math.round(v)) : v >= 1 ? v.toFixed(2) : String(Number(v.toPrecision(4))));


function vpSpan(bars) {
  const n = bars.length;
  if (vpRange === 'vis') {
    const vr = chart.timeScale().getVisibleLogicalRange();
    if (!vr) return null;
    const i0 = Math.max(0, Math.ceil(vr.from)), i1 = Math.min(n - 1, Math.floor(vr.to));
    return i0 > i1 ? null : [bars[i0][0], i1 + 1 < n ? bars[i1 + 1][0] : Infinity];
  }
  const d = new Date(bars[n - 1][0] * 1000);
  if (vpRange === 'YTD') return [Date.UTC(d.getUTCFullYear(), 0, 1) / 1000, Infinity];
  if (vpRange === '1Y') d.setUTCFullYear(d.getUTCFullYear() - 1); else d.setUTCMonth(d.getUTCMonth() - (vpRange === '6M' ? 6 : 3));
  return [d.getTime() / 1000, Infinity];
}
function vpCompute(rows, t0, t1, nb) {
  const sel = rows.filter(r => r[0] >= t0 && r[0] < t1 && r[2] != null && r[3] != null);
  if (!sel.length) return null;
  let lo = Infinity, hi = -Infinity;
  sel.forEach(r => { lo = Math.min(lo, r[3]); hi = Math.max(hi, r[2]); });
  if (!(hi > lo)) hi = lo + Math.max(1e-6, Math.abs(lo) * 1e-4);
  const step = (hi - lo) / nb, up = new Array(nb).fill(0), dn = new Array(nb).fill(0);
  const rowOf = p => Math.min(nb - 1, Math.max(0, Math.floor((p - lo) / step)));
  sel.forEach(r => {
    const v = r[5] || 0, l = r[3], h = r[2], arr = r[4] >= r[1] ? up : dn;
    if (!(v > 0)) return;
    if (!(h > l)) { arr[rowOf(l)] += v; return; }
    for (let k = rowOf(l), kb = rowOf(h); k <= kb; k++) {
      const ov = Math.min(h, lo + (k + 1) * step) - Math.max(l, lo + k * step);
      if (ov > 0) arr[k] += v * ov / (h - l);
    }
  });
  const vol = up.map((u, k) => u + dn[k]), tot = vol.reduce((a, b) => a + b, 0);
  const out = { lo, hi, step, nb, up, dn, vol, tot, n: sel.length, t0: sel[0][0] };
  if (!(tot > 0)) return out;
  let poc = 0;
  vol.forEach((v, k) => { if (v > vol[poc]) poc = k; });
  let a = poc, b = poc, acc = vol[poc];
  while (acc < 0.7 * tot && (a > 0 || b < nb - 1)) {
    const above = b < nb - 1 ? vol[b + 1] : -1, below = a > 0 ? vol[a - 1] : -1;
    if (above >= below) acc += vol[++b]; else acc += vol[--a];
  }
  return Object.assign(out, { poc, va: [a, b], pocP: lo + (poc + 0.5) * step, vah: lo + (b + 1) * step, val: lo + a * step, vmax: Math.max(...vol) });
}


function vpCurrent(di, paneH) {
  const bars = di.bars || [], src = di.vp && di.vp.rows ? di.vp : null, rows = src ? src.rows : bars;
  if (!bars.length || !rows.length) return null;
  const nb = Math.max(40, Math.min(140, Math.round(paneH / 5)));
  const base = [version, tf, sym, vpRange, nb, rows.length, rows[0][0], rows[rows.length - 1][0], rows[rows.length - 1][5]].join('|');
  const span = vpSpan(bars), key = base + '|' + (span ? span.join(',') : '-');
  if (key === vpKey) return vprof;
  const now = performance.now();
  if (base === vpBase && now < vpDue) {
    if (!vpTimer) vpTimer = setTimeout(() => { vpTimer = 0; sig = ''; }, vpDue - now + 5);
    return vprof;
  }
  vpKey = key; vpBase = base; vpDue = now + 150;
  vprof = span ? vpCompute(rows, span[0], span[1], nb) : null;
  if (vprof) vprof.src = src ? src.src : null;
  if (vprof && src && src.parts && src.parts.length > 1) {
    let i = 0;
    vprof.mix = src.parts.map(([s, n]) => {
      let k = 0;
      for (let j = i; j < i + n; j++) if (rows[j][0] >= span[0] && rows[j][0] < span[1]) k++;
      i += n; return [s, k];
    }).filter(m => m[1] > 0);
  }
  return vprof;
}

function vpNear(p) {
  const lv = (meta || state).levels;
  if (!lv || !(p > 0)) return null;
  const W = COMPACT() ? '' : ' WALL', both = lv.call_wall != null && lv.call_wall === lv.put_wall, ph = PHONE();

  const cand = [[lv.king, `KING ${fmtK(lv.king)}`, 'KING', C.king],
                [lv.call_wall !== lv.king ? lv.call_wall : null, both ? `CALL + PUT${W} ${fmtK(lv.call_wall)}` : `CALL${W} ${fmtK(lv.call_wall)}`, both ? 'CALL + PUT' : 'CALL', C.call],
                [lv.put_wall !== lv.king && !both ? lv.put_wall : null, `PUT${W} ${fmtK(lv.put_wall)}`, 'PUT', C.put],
                [lv.flip, `FLIP ${lv.flip != null ? lv.flip.toFixed(2) : ''}`, 'FLIP', C.flip]];
  let best = null;
  cand.forEach(([L, t, short, col]) => {
    if (L == null) return;
    const d = Math.abs(p / L - 1);
    if (d <= 0.0075 && (!best || d < best.d)) best = { d, t: ph ? short : t, col };
  });
  return best;
}
function drawVolumeProfile(cb, paneW, paneH, di) {
  vpDrawn = null;
  if (!vpOn() || !candles || paneH < 30) { vpNote(null); return; }
  const P = vpCurrent(di, paneH);
  vpNote(P);
  if (!P || !(P.tot > 0)) return;


  const room = vpRoom(cb, paneW), phone = PHONE(), y = p => candles.priceToCoordinate(p);
  const maxW = Math.max(0, Math.min(Math.max(room * (phone ? 0.15 : 0.18), phone ? 30 : 40), room - 6));
  for (let k = 0; k < P.nb && maxW >= 2; k++) {
    if (!(P.vol[k] > 0)) continue;
    const ya = y(P.lo + (k + 1) * P.step), yb = y(P.lo + k * P.step);
    if (ya == null || yb == null || yb < -2 || ya > paneH + 2) continue;
    const top = Math.min(ya, yb), hh = Math.abs(yb - ya), gap = hh >= 3 ? 1 : 0;
    const inVa = k >= P.va[0] && k <= P.va[1], wu = P.up[k] / P.vmax * maxW, wd = P.dn[k] / P.vmax * maxW;
    cb.fillStyle = inVa ? 'rgba(38,166,154,.55)' : 'rgba(38,166,154,.35)'; cb.fillRect(0, top + gap, wu, Math.max(0.6, hh - gap));
    cb.fillStyle = inVa ? 'rgba(239,83,80,.55)' : 'rgba(239,83,80,.35)'; cb.fillRect(wu, top + gap, wd, Math.max(0.6, hh - gap));
  }
  const lines = [['POC', P.pocP, 1.5, []], ['VAH', P.vah, 1, [4, 4]], ['VAL', P.val, 1, [4, 4]]];
  cb.save(); cb.strokeStyle = '#ffb74d';
  lines.forEach(([, p, w, dash]) => {
    const Y = y(p); if (Y == null || Y < -2 || Y > paneH + 2) return;
    cb.lineWidth = w; cb.setLineDash(dash); cb.beginPath(); cb.moveTo(0, Math.round(Y) + 0.5); cb.lineTo(paneW, Math.round(Y) + 0.5); cb.stroke();
  });
  cb.restore();
  vpDrawn = { P, maxW, room, paneH, labs: lines.map(([nm, p]) => ({ y: y(p), t: `${nm} ${fmtVp(p)}`, near: vpNear(p) })) };
}

function vpRoom(g2, paneW) {
  const lv = (meta || state).levels;
  if (lv) {
    g2.save(); g2.font = '600 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    const x0 = gexX0(g2, gexLabels(lv), paneW, HISTW()); g2.restore();
    return x0;
  }
  const a = chart.timeScale().logicalToCoordinate(nBars - 1 + 3);
  return Math.max(0, Math.min(paneW, a != null ? a : paneW));
}

function drawVpLabels(c, paneH) {
  if (!vpDrawn) return;
  c.save(); c.font = '600 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif'; c.textBaseline = 'middle';
  const labs = vpDrawn.labs.filter(l => l.y != null).map(l => Object.assign({}, l)).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 17) labs[i].y = labs[i - 1].y + 17;
  labs.forEach(l => {
    if (l.y < 8 || l.y > paneH - 8) return;
    const w1 = c.measureText(l.t).width;
    let t2 = l.near ? ' ≈ ' + l.near.t : '', w2 = t2 ? c.measureText(t2).width : 0;
    if (t2 && 14 + w1 + w2 > vpDrawn.room - 4) { t2 = ''; w2 = 0; }
    c.fillStyle = 'rgba(19,23,34,.5)'; c.beginPath();
    if (c.roundRect) c.roundRect(4, l.y - 8.5, w1 + w2 + 10, 17, 3); else c.rect(4, l.y - 8.5, w1 + w2 + 10, 17);
    c.fill();
    c.fillStyle = '#ffb74d'; c.fillText(l.t, 9, l.y + 0.5);
    if (t2) { c.fillStyle = l.near.col; c.fillText(t2, 9 + w1, l.y + 0.5); }
  });
  c.restore();
}

function vpTipAt(x, y) {
  const D = vpDrawn;
  if (!D || y < 0 || y > D.paneH || x > D.maxW + 6 || !candles) return null;
  const P = D.P, p = candles.coordinateToPrice(y);
  if (p == null) return null;
  const k = Math.floor((p - P.lo) / P.step);
  if (k < 0 || k >= P.nb || !(P.vol[k] > 0) || x > Math.max(10, P.vol[k] / P.vmax * D.maxW) + 6) return null;
  const pu = Math.round(P.up[k] / P.vol[k] * 100);
  const tag = k === P.poc ? ' · POC' : k >= P.va[0] && k <= P.va[1] ? ' · value area' : '';
  return { tip: `${fmtVp(P.lo + k * P.step)}–${fmtVp(P.lo + (k + 1) * P.step)} · ${fmtVol(P.vol[k])} · up ${pu}% / down ${100 - pu}%${tag}`, color: '#ffb74d' };
}

let vpNoteKey = null;
function vpNote(P) {
  let el = $('vpnote');
  if (!P && !vpOn()) { if (el && vpNoteKey !== '') { el.hidden = true; vpNoteKey = ''; } return; }
  if (!el) {
    el = document.createElement('span'); el.id = 'vpnote'; el.className = 'vpn';
    $('ind').before(el);
  }
  const m = meta || state, bars = (state && state.di && state.di.bars) || [];
  const last = m && m.price && m.price.last ? m.price.last : bars.length ? bars[bars.length - 1][4] : null;
  let rn = VP_NAME[vpRange];
  if (P && vpRange !== 'vis' && bars.length) {
    const want = vpSpan(bars);
    if (want && P.t0 - want[0] > 4 * 86400) rn += ' (from ' + new Date(P.t0 * 1000).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }) + ')';
  }
  let html, tipTxt = '';
  const small = SMALLUI(), lead = small ? rn[0].toUpperCase() + rn.slice(1) : 'Volume profile, ' + rn;
  if (!P) html = `<span class="muted">${esc(lead)}: no candles in view</span>`;
  else if (!(P.tot > 0)) html = `<span class="muted">${esc(lead)}: no volume in these candles</span>`;
  else {
    const where = last == null ? null : last > P.vah ? ['above value', C.up, `VAH ${fmtVp(P.vah)}`] : last < P.val ? ['below value', C.dn, `VAL ${fmtVp(P.val)}`]
      : ['inside value', '#ffb74d', small ? `${fmtVp(P.val)} – ${fmtVp(P.vah)}` : `VAL ${fmtVp(P.val)} – VAH ${fmtVp(P.vah)}`];
    html = `<span class="muted">${esc(lead)}: </span>` + (where ? `<span class="muted">${small ? '' : 'price '}</span><span style="color:${where[1]}">${where[0]}</span>` +
      `<span class="muted"> (${esc(where[2])}) · </span>` : '') + `<span style="color:#ffb74d">POC ${esc(fmtVp(P.pocP))}</span>`;
    const over = P.mix && P.mix.length > 1 ? P.mix.map(([s, k]) => `${k} ${VP_SRC[s]}`).join(' + ') : `${P.n} ${VP_SRC[P.src] || 'chart'}`;
    tipTxt = `Traded volume by price over ${over} candles (${fmtVol(P.tot)}); POC = the busiest price row, ` +
      `value area = the rows around it holding 70% of the volume`;
  }
  const key = html + tipTxt;
  if (key === vpNoteKey) return;
  vpNoteKey = key; el.innerHTML = html; el.title = tipTxt.replace(/\s+/g, ' '); el.hidden = false;
}



function gexX0(g2, labsRaw, paneW, histW) {
  const labW = Math.max(...labsRaw.map(l => g2.measureText(l[1]).width)) + 24;
  const anchor = chart.timeScale().logicalToCoordinate(nBars - 1 + 3);
  return Math.max(0, Math.min(anchor != null ? anchor : 1e9, paneW - histW - labW));
}


function chamfer(g2, x, y, w, h, r) {
  g2.beginPath(); g2.moveTo(x + r, y); g2.lineTo(x + w - r, y); g2.lineTo(x + w, y + r); g2.lineTo(x + w, y + h - r);
  g2.lineTo(x + w - r, y + h); g2.lineTo(x + r, y + h); g2.lineTo(x, y + h - r); g2.lineTo(x, y + r); g2.closePath();
}
function drawFrames(cb, c, g, paneW) {
  const P = state && state.di && state.di.panes;
  if (!P || !P.sections) return;
  const axisW = dchart.priceScale('right').width(), W = paneW + axisW;
  frameGroups(P.sections).forEach(fg => {
    const a = g[fg.from + 1], b = g[fg.to + 1];
    if (!a || !b || a.h < 40) return;
    const x = 6, y = a.top + 3, w = W - 12, h = b.top + b.h - a.top - 6, col = (fg.frame && fg.frame.color) || '#2962ff';
    if (fg.frame && fg.frame.fill) { cb.fillStyle = fg.frame.fill; chamfer(cb, x, y, w, h, 9); cb.fill(); }
    cb.save(); cb.strokeStyle = col; cb.lineWidth = 2; cb.shadowColor = col; cb.shadowBlur = 9;
    chamfer(cb, x, y, w, h, 9); cb.stroke(); cb.restore();
    for (let k = fg.from + 1; k <= fg.to; k++) {
      const d = g[k + 1]; if (!d) continue;
      cb.strokeStyle = col + '66'; cb.lineWidth = 1; cb.beginPath(); cb.moveTo(x + 24, d.top - 1); cb.lineTo(x + w - 24, d.top - 1); cb.stroke();
    }
  });
  c.save(); c.font = '11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif'; c.textAlign = 'right'; c.textBaseline = 'middle';
  P.sections.forEach((s, k) => {
    const pg = g[k + 1]; if (!pg || pg.h < 40) return;
    const shown = s.scale && s.scale.mode ? roomyLabels(secGuides[s.id] || [], pg.h) : null;
    (secGuides[s.id] || []).forEach(gd => {
      if (!gd.ser) return;
      const y = gd.ser.priceToCoordinate(gd.value);
      if (y == null || y < 4 || y > pg.h - 4) return;
      c.save(); c.strokeStyle = gd.color || '#d1d4dc8c'; c.lineWidth = 1;
      c.setLineDash(gd.style === 'dotted' ? [1, 3] : gd.style === 'solid' ? [] : [5, 5]);
      c.beginPath(); c.moveTo(Math.max(rightOf(s), 20), pg.top + y + 0.5); c.lineTo(W - (gd.label ? 52 : 24), pg.top + y + 0.5); c.stroke(); c.restore();
      if (gd.label && (!shown || shown.has(gd))) { c.fillStyle = '#b2b5bec0'; c.fillText(gd.label, W - 18, pg.top + y); }
    });
    (s.lane_tags || []).forEach(t => { c.fillStyle = t.color || '#d1d4dcb8'; c.fillText(t.text, W - 18, pg.top + 16); });
  });
  c.restore();
}


function roomyLabels(list, h) {
  const out = new Set(), ys = [];
  list.filter(gd => gd.label && gd.ser).sort((a, b) => (a.style === 'dotted') - (b.style === 'dotted')).forEach(gd => {
    const y = gd.ser.priceToCoordinate(gd.value);
    if (y == null || y < 4 || y > h - 4 || ys.some(v => Math.abs(v - y) < 11)) return;
    ys.push(y); out.add(gd);
  });
  return out;
}

const cv = $('overlay'), cu = $('under'), chartbox = $('chartbox');
function fitCanvas(el, w, h, dpr) {
  if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
    el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); el.style.width = w + 'px'; el.style.height = h + 'px';
  }
  const g = el.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); return g;
}
function draw() {
  requestAnimationFrame(draw);
  if (!chart || !state) return;
  matchScaleWidths();
  if (!nBars) {
    if (sig !== 'empty') {
      ['under', 'overlay'].forEach(id => { const c = $(id); c.getContext('2d').clearRect(0, 0, c.width, c.height); });
      $('cards').innerHTML = ''; $('maxbtns').innerHTML = ''; $('ohlc').innerHTML = ''; sig = 'empty';
      vpDrawn = null; if ($('vpnote')) { $('vpnote').hidden = true; vpNoteKey = ''; }
    }
    return;
  }
  const dpr = window.devicePixelRatio || 1, w = chartbox.clientWidth, h = chartbox.clientHeight;
  const ts = chart.timeScale(), paneW = ts.width(), g = paneGeom(), paneH = g[0] ? g[0].h : h;
  const vr = ts.getVisibleLogicalRange(), dvr = dchart ? dchart.timeScale().getVisibleLogicalRange() : null, dW = dchart ? dchart.timeScale().width() : paneW;
  const s = [w, h, dpr, paneW, dW, g.map(x => x.top + ':' + x.h).join(','), vr && vr.from.toFixed(2), vr && vr.to.toFixed(2),
             dvr && dvr.from.toFixed(2), dvr && dvr.to.toFixed(2),
             candles.priceToCoordinate(1000), candles.priceToCoordinate(500), version, gexKey,
             Object.values(dseries).map(sr => sr.priceToCoordinate(1)).join(',')].join('|');
  if (s === sig) return;
  sig = s;
  applyCut();
  const c = fitCanvas(cv, w, h, dpr), cb = fitCanvas(cu, w, h, dpr);
  c.save(); c.beginPath(); c.rect(0, 0, paneW, paneH); c.clip();
  cb.save(); cb.beginPath(); cb.rect(0, 0, paneW, paneH); cb.clip();
  const di = state.di || {};
  const i0 = Math.max(1, Math.floor(vr ? vr.from : 0) - 1);
  if (di.price && di.price.fills) {
    const lines = {}; (di.price.lines || []).forEach(l => { lines[l.id] = l.values; });
    di.price.fills.forEach(f => {
      const a = lines[f.between[0]], b = lines[f.between[1]];
      if (!a || !b) return;
      const i1 = Math.min(a.length - 1, Math.ceil(vr ? vr.to : a.length) + 1);
      for (let i = i0; i <= i1; i++) {
        const col = f.colors ? f.colors[i] : f.color;
        if (i === i0 && (!lineOn(f.between[0]) || !lineOn(f.between[1]))) break;
        if (!col || a[i] == null || b[i] == null || a[i - 1] == null || b[i - 1] == null) continue;
        const xa = ts.logicalToCoordinate(i - 1), xb = ts.logicalToCoordinate(i);
        if (xa == null || xb == null) continue;
        cb.fillStyle = col; cb.beginPath();
        cb.moveTo(xa, candles.priceToCoordinate(a[i - 1])); cb.lineTo(xb, candles.priceToCoordinate(a[i]));
        cb.lineTo(xb, candles.priceToCoordinate(b[i])); cb.lineTo(xa, candles.priceToCoordinate(b[i - 1]));
        cb.closePath(); cb.fill();
      }
    });
  }
  drawVolumeProfile(cb, paneW, paneH, di);
  if (di.price && di.price.markers && layerOn('dots')) {
    di.price.markers.forEach(m => {
      if (m.price == null || m.i < 0) return;
      const x = ts.logicalToCoordinate(m.i), y = candles.priceToCoordinate(m.price);
      if (x == null || y == null) return;
      const r = Math.max(1.5, (m.px || 8) / 2);
      c.fillStyle = m.color; c.beginPath(); c.arc(x, y - (m.dy_px || 0), r, 0, Math.PI * 2); c.fill();
    });
  }
  const wm = di.episode && di.episode.raw && di.episode.raw.markers;
  if (wm && (layerOn('wodots') || layerOn('woevents'))) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const m of wm) {
      if (!woShown(m) || m.ts == null) continue;
      const x = ts.timeToCoordinate(m.ts), y = candles.priceToCoordinate(m.price);
      if (x == null || y == null || y < -10 || y > paneH + 10) continue;
      const big = m.kind === 'C' || m.kind === 'B+', r = big ? 8 : 6.5;
      if (m.shape === 'xcross') {
        c.strokeStyle = m.color; c.lineWidth = 2; c.beginPath();
        c.moveTo(x - r * 0.7, y - r * 0.7); c.lineTo(x + r * 0.7, y + r * 0.7); c.moveTo(x + r * 0.7, y - r * 0.7); c.lineTo(x - r * 0.7, y + r * 0.7); c.stroke();
        c.fillStyle = m.color; c.font = '700 9px -apple-system, BlinkMacSystemFont, Roboto, sans-serif'; c.fillText('X', x, y - r - 6);
      } else {
        c.fillStyle = m.color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        if (m.kind !== 'B') {
          c.fillStyle = m.text_color || '#000'; c.font = `700 ${m.kind === 'B+' ? 7.5 : 8.5}px -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
          c.fillText(m.kind, x, y + 0.5);
        }
      }
    }
    c.restore();
  }
  const prof = di.price && di.price.profile;
  if (prof && prof.boxes && layerOn('profile')) prof.boxes.forEach(bx => {
    const x0 = ts.logicalToCoordinate(bx.x0_i), x1 = ts.logicalToCoordinate(bx.x1_i);
    const y0 = candles.priceToCoordinate(bx.y0), y1 = candles.priceToCoordinate(bx.y1);
    if ([x0, x1, y0, y1].some(v => v == null)) return;
    const X = Math.min(x0, x1), Y = Math.min(y0, y1), W = Math.abs(x1 - x0), Hh = Math.max(1, Math.abs(y1 - y0));
    c.fillStyle = bx.color || 'rgba(4,50,99,.35)'; c.fillRect(X, Y, W, Hh);
    if (bx.border) { c.strokeStyle = bx.border; c.lineWidth = 1; c.strokeRect(X, Y, W, Hh); }
  });
  if (prof && prof.lines && layerOn('profile')) prof.lines.forEach(L => {
    const y = candles.priceToCoordinate(L.y0);
    if (y == null || y < 0 || y > paneH) return;
    const xa = ts.logicalToCoordinate(L.x0_i), xb = ts.logicalToCoordinate(L.x1_i);
    const x0 = L.extend === 'left' || L.extend === 'both' ? 0 : (xa == null ? 0 : xa);
    const x1 = L.extend === 'right' || L.extend === 'both' ? paneW : (xb == null ? paneW : xb);
    c.strokeStyle = L.color || '#00A9E080'; c.lineWidth = L.width || 1;
    c.beginPath(); c.moveTo(x0, Math.round(y) + 0.5); c.lineTo(x1, Math.round(y) + 0.5); c.stroke();
  });
  const lv = (meta || state).levels;
  if (lv) {
    const histW = HISTW();
    c.font = '600 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    const labsRaw = gexLabels(lv);
    const x0 = gexX0(c, labsRaw, paneW, histW);

    const ci = gexBars === 'oi' ? 4 : 2;
    const split = gexBars !== 'net' && lv.strikes.length && lv.strikes[0].length > ci + 1;
    const vis = [];
    for (const st of lv.strikes) {
      const y = candles.priceToCoordinate(st[0]);
      if (y != null && y > -20 && y < paneH + 20) vis.push({ y, n: st[1], c: st[ci] || 0, p: st[ci + 1] || 0 });
    }

    const near = lv.strikes.filter(st => Math.abs(st[0] / lv.spot - 1) <= 0.05).map(st => st[0]);
    const steps = near.slice(1).map((k, i) => k - near[i]).filter(x => x > 0).sort((a, b) => a - b);
    const step = steps.length ? steps[Math.floor(steps.length / 2)] : lv.spot * 0.01;
    const y0s = candles.priceToCoordinate(lv.spot), y1s = candles.priceToCoordinate(lv.spot + step);
    const pxStep = y0s != null && y1s != null ? Math.abs(y0s - y1s) : 10;
    let bars = vis, hh = Math.max(1, Math.min(pxStep, 14) * 0.4);
    if (pxStep < 4) {
      const span = Math.ceil(4 / Math.max(pxStep, 0.01)) * step, m = new Map();
      for (const st of lv.strikes) {
        const key = Math.floor(st[0] / span + 1e-9), o = m.get(key) || { k: (key + 0.5) * span, n: 0, c: 0, p: 0 };
        o.n += st[1]; o.c += st[ci] || 0; o.p += st[ci + 1] || 0; m.set(key, o);
      }
      bars = [];
      for (const o of m.values()) {
        const y = candles.priceToCoordinate(o.k);
        if (y != null && y > -20 && y < paneH + 20) bars.push({ y, n: o.n, c: o.c, p: o.p });
      }
      hh = Math.max(1, Math.abs(candles.priceToCoordinate(lv.spot) - candles.priceToCoordinate(lv.spot + span)) * 0.4);
    }
    const mx = Math.max(1, ...bars.map(b => (split ? Math.max(b.c, b.p) : Math.abs(b.n))));
    for (const b of bars) {

      const wc = b.c / mx * histW, wp = b.p / mx * histW, wn = Math.abs(b.n) / mx * histW;
      if (split) {
        if (wc >= 1) { c.fillStyle = 'rgba(38,166,154,.8)'; c.fillRect(x0, b.y - hh, Math.max(2, wc), hh); }
        if (wp >= 1) { c.fillStyle = 'rgba(239,83,80,.8)'; c.fillRect(x0, b.y, Math.max(2, wp), hh); }
      } else if (wn >= 1) {
        c.fillStyle = b.n >= 0 ? 'rgba(38,166,154,.75)' : 'rgba(239,83,80,.75)';
        c.fillRect(x0, b.y - hh, Math.max(2, wn), hh * 2);
      }
    }
    const pTop = candles.coordinateToPrice(0), pBot = candles.coordinateToPrice(paneH);
    if (lv.strikes.length && pTop != null && pBot != null) {
      const kLo = lv.strikes[0][0], kHi = lv.strikes[lv.strikes.length - 1][0];
      c.fillStyle = '#787b86'; c.font = '11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif'; c.textBaseline = 'middle';
      if (pBot < kLo - lv.spot * 0.03) c.fillText(`no option strikes below ${fmtK(kLo)}`, x0, candles.priceToCoordinate(kLo) + 14);
      if (pTop > kHi + lv.spot * 0.03) c.fillText(`no option strikes above ${fmtK(kHi)}`, x0, candles.priceToCoordinate(kHi) - 14);
      c.font = '600 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
    }
    c.textBaseline = 'middle';
    const labs = labsRaw.map(l => ({ y: candles.priceToCoordinate(l[0]), t: l[1], col: l[2] })).filter(l => l.y != null).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 20) labs[i].y = labs[i - 1].y + 20;
    for (const l of labs) {
      const bw = c.measureText(l.t).width + 12, lx = Math.min(x0 + histW + 8, paneW - bw - 4);
      c.fillStyle = l.col; c.globalAlpha = 0.92; c.beginPath();
      if (c.roundRect) c.roundRect(lx, l.y - 9, bw, 18, 3); else c.rect(lx, l.y - 9, bw, 18);
      c.fill(); c.globalAlpha = 1; c.fillStyle = '#131722'; c.fillText(l.t, lx + 6, l.y + 0.5);
    }
  }
  drawVpLabels(c, paneH);
  c.restore(); cb.restore();
  drawFrames(cb, c, g, dW);
  drawGhosts(c, g, dW);
  drawClassic(c, cb, g, dW);
  $('gex').style.right = (chart.priceScale('right').width() + 10) + 'px';
  const want = Math.min(0.5, ($('gex').offsetHeight + 16) / Math.max(1, paneH));
  if (Math.abs(want - topMargin) > 0.01) { topMargin = want; candles.priceScale().applyOptions({ scaleMargins: { top: want, bottom: 0.06 } }); }
  renderCards();
}
requestAnimationFrame(draw);


async function getJSON(url) {
  if (window.EET_STATIC) return window.EET_STATIC.get(url);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctl.signal });
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try { msg = (await r.json()).error || msg; } catch (e) {  }
      throw Object.assign(new Error(msg), { status: r.status });
    }
    return await r.json();
  } finally { clearTimeout(timer); }
}

async function refreshGex() {
  const wantS = sym, wantH = gexH;
  try {
    const m = await getJSON(api('/api/meta'));
    if (wantS !== sym || wantH !== gexH) return;
    meta = m; gexKey = ''; sig = ''; renderGex(); renderHead();
  } catch (e) {  }
}
async function loadState(force) {
  if (inflight && !force) return;
  inflight = true;
  const want = tf, wantS = sym;
  try {
    const url = api('/api/state?tf=' + encodeURIComponent(want) + (wantN[want] ? '&n=' + wantN[want] : ''));
    const s = await getJSON(url);
    lastOkPoll = Date.now();
    if (want !== tf || wantS !== sym) return;
    if (loadedTf !== tf) { structKey = ''; nBars = 0; }
    state = s; version = s.version; loadedTf = tf;
    if (!s.levels || !s.levels.h || s.levels.h === gexH) meta = s; else refreshGex();
    try { render(); } catch (e) { console.error(e); $('ind').innerHTML = `<span class="err">page error: ${esc(e.message)}</span>`; }

    if (!url.includes('&vp=1') || (vpRange !== 'vis' && !url.includes('&vpr=' + vpRange))) vpEnsure();
  } catch (e) {
    if (wantS !== sym) return;
    $('ind').innerHTML = e.status === 404 ? `<span class="err">${esc(e.message)} · pick another ticker</span>`
      : `<span class="err">could not load data (${esc(e.message)}) · retrying</span>`;
    if (!meta) { $('dot').className = 'err'; $('stxt').textContent = e.status === 404 ? `${sym}: not available` : 'could not load'; }
  } finally { inflight = false; renderStatus(); }
}
async function pollMeta() {
  try {
    const wantS = sym, m = await getJSON(api('/api/meta'));
    lastOkPoll = Date.now();
    if (wantS !== sym) throw new Error('ticker changed');
    if (m.levels && m.levels.h && m.levels.h !== gexH) throw new Error('window changed');
    meta = m;
    if (m.version !== version || loadedTf !== tf) await loadState();
    else if (state) { renderGex(); renderHead(); }
  } catch (e) {  }
  renderStatus();
  setTimeout(pollMeta, META_MS);
}
window.addEventListener('resize', () => { sig = ''; });
setTf(tf);
setTimeout(pollMeta, META_MS);
