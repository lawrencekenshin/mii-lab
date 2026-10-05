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
const srcName = p => (!p ? '—' : p.source === 'delayed' ? 'delayed ~15 min' : p.source === 'close' ? 'daily close' : p.source === 'finnhub' ? 'real-time feed' : p.source === 'bitstamp' ? 'Bitstamp (live)' : p.source === 'yahoo' ? 'Yahoo' : p.source === 'last daily close' ? 'last close' : (p.source || 'Yahoo'));

function renderHead() {
  const m = meta || state, bars = (state && state.di && state.di.bars) || [];
  $('symname').textContent = m.name || m.symbol || sym;
  $('exch').textContent = (m.exchange ? ' · ' + m.exchange : '') + (m.kind === 'crypto' ? ' · times in UTC' : '');
  document.title = (m.symbol || sym) + ' · Eagle Eye Technicals';
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
  $('ind').innerHTML = `Eagle Eye Technicals · Desktop Integrated + GEX · options: ${m.kind === 'crypto' ? 'none yet for crypto' : 'saved Cboe chain ' + (d ? esc(d.build_et) : '—')} · price: ${esc(srcName(m.price))}${m.published ? pubTxt : ', every ' + cadence(m.poll_s)}` +
    ' · estimates from public data, not a trading signal · charts: <a class="credit" href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a>' +
    (errs ? '<br>' + errs : '');
}
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
  if (pollAge > 30) { cls = 'err'; txt = `server unreachable for ${Math.round(pollAge)} s`; }
  else if (!p || !p.last) { cls = 'stale'; txt = 'no price yet'; }
  else if (p.source === 'last daily close') {
    cls = 'stale';
    txt = m.errors && m.errors.live ? `live price unavailable (${m.errors.live}) · showing last close ${p.last.toFixed(2)}`
      : `waiting for the live price · showing last close ${p.last.toFixed(2)}`;
  }
  else if (!m.market_open) txt = `market closed · last ${p && p.last ? p.last.toFixed(2) : '—'}`;
  else {
    const age = p && p.time ? nowS - p.time : 1e9;
    cls = age > 3 * (m.poll_s || 120) + 60 ? 'stale' : 'live';
    txt = `live · ${srcName(p)} · ${age < 90 ? Math.max(0, Math.round(age)) + ' s' : Math.round(age / 60) + ' min'} old · every ${cadence(m.poll_s)}` +
      (m.live_tickers > 1 ? ` · ${m.live_tickers} tickers live` : '');
  }
  if (cls !== 'err' && m.errors && Object.keys(m.errors).some(k => k !== 'history')) cls = 'stale';
  $('dot').className = cls; $('stxt').textContent = txt;
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
  $('maxbtns').innerHTML = g.map((pg, i) => (pg.h < 30 || (i > 0 && i !== firstDi) ? '' :
    `<div class="maxbtn" data-i="${i}" title="${maxPane === null ? (i === 0 ? 'Expand the price chart' : 'Expand all the indicators') + ' (or double-click)' : 'Restore (or double-click / Esc)'}" ` +
    `style="top:${pg.top + (i === 0 ? 46 : 8)}px;left:${(i === 0 ? pw : w) - 30}px">${maxPane === null ? '⤢' : '⤡'}</div>`)).join('');
  if (g[0] && g[0].h >= 30)
    $('maxbtns').innerHTML += `<div class="maxbtn" data-act="reset" title="Reset the price chart view (Alt+R)" ` +
      `style="top:46px;left:${pw - 58}px">⟲</div>`;
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
      const vals = lines.filter(l => l.ghost != null || /^[A-Z][A-Za-z0-9 -]{0,9}[ ][+−-]?[0-9]/.test(l.text)).slice(0, 3);
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
    const top = n.anchor === 'above_cards' ? (g[1] ? g[1].top - 17 : 0) : last.top + last.h - 17;
    const parts = phone && n.parts && n.parts.length ? n.parts.slice(-1) : n.parts;
    html += `<div class="note" style="right:${dchart.priceScale('right').width() + 18}px;top:${top}px">${partsHtml(parts, n.text, n.color)}</div>`;
  });
  host.innerHTML = html;
  let right = 0;
  host.querySelectorAll('.card').forEach(c => {
    right = Math.max(right, c.offsetLeft + c.offsetWidth);
    if (phone) {
      const k = Number(c.dataset.k), pg = g[k + 1];
      const top = Math.min(0.6, (c.offsetHeight + 10) / Math.max(1, pg.h));
      try { dchart.priceScale('right', k).applyOptions({ scaleMargins: { top, bottom: 0.06 } }); } catch (e) {  }
    }
  });
  if (!phone && !cardMarginsReset) {
    secs.forEach((s, k) => { try { dchart.priceScale('right', k).applyOptions({ scaleMargins: { top: 0.08, bottom: 0.06 } }); } catch (e) {  } });
    cardMarginsReset = true;
  }
  if (phone) cardMarginsReset = false;
  const want = phone ? 0 : Math.min(right + 16, w * 0.7);
  if (Math.abs(want - cardRight) > 2) { cardRight = want; lastCut = -1; applyCut(); }
}
let cardMarginsReset = false;


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
    (secGuides[s.id] || []).forEach(gd => {
      if (!gd.ser) return;
      const y = gd.ser.priceToCoordinate(gd.value);
      if (y == null || y < 4 || y > pg.h - 4) return;
      c.save(); c.strokeStyle = gd.color || '#d1d4dc8c'; c.lineWidth = 1;
      c.setLineDash(gd.style === 'dotted' ? [1, 3] : gd.style === 'solid' ? [] : [5, 5]);
      c.beginPath(); c.moveTo(Math.max(cardRight, 20), pg.top + y + 0.5); c.lineTo(W - (gd.label ? 52 : 24), pg.top + y + 0.5); c.stroke(); c.restore();
      if (gd.label) { c.fillStyle = '#b2b5bec0'; c.fillText(gd.label, W - 18, pg.top + y); }
    });
    (s.lane_tags || []).forEach(t => { c.fillStyle = t.color || '#d1d4dcb8'; c.fillText(t.text, W - 18, pg.top + 16); });
  });
  c.restore();
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
  if (!nBars) {
    if (sig !== 'empty') {
      ['under', 'overlay'].forEach(id => { const c = $(id); c.getContext('2d').clearRect(0, 0, c.width, c.height); });
      $('cards').innerHTML = ''; $('maxbtns').innerHTML = ''; $('ohlc').innerHTML = ''; sig = 'empty';
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
    const labW = Math.max(...labsRaw.map(l => c.measureText(l[1]).width)) + 24;
    const anchor = ts.logicalToCoordinate(nBars - 1 + 3);
    const x0 = Math.max(0, Math.min(anchor != null ? anchor : 1e9, paneW - histW - labW));

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
  c.restore(); cb.restore();
  drawFrames(cb, c, g, dW);
  drawGhosts(c, g, dW);
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
    const s = await getJSON(api('/api/state?tf=' + encodeURIComponent(want) + (wantN[want] ? '&n=' + wantN[want] : '')));
    lastOkPoll = Date.now();
    if (want !== tf || wantS !== sym) return;
    if (loadedTf !== tf) { structKey = ''; nBars = 0; }
    state = s; version = s.version; loadedTf = tf;
    if (!s.levels || !s.levels.h || s.levels.h === gexH) meta = s; else refreshGex();
    try { render(); } catch (e) { console.error(e); $('ind').innerHTML = `<span class="err">page error: ${esc(e.message)}</span>`; }
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
