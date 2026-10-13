



(function () {
  'use strict';
  var RAW = null, LOADERR = null;
  var SR = null, S = {}, KEYS = [], MK = null, IND = false, U = null, LN = {};
  var DATA_URL = /(^|\.)github\.io$/i.test(location.hostname) ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/sector-rotation-data/sector-rotation/sector-rotation.json' : 'snap/sector-rotation.json';
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
    fear: '#7E57C2', light: '#B39DDB', up: '#26A69A', down: '#EF5350', amber: '#F2B04B', gold: '#FFD84D',
    b50: '#3987E5', b50l: '#8EC0FA', b200: '#F0883E', b200l: '#F7B57F', flip: '#B2B5BE', grid: '#262A35', faint: '#5D606B',
    nowCore: '#F3EEFF' };
  var QC = { Leading: '#26A69A', Weakening: '#F2B04B', Lagging: '#EF5350', Improving: '#3987E5' };
  var QL = { Leading: '#5CC9BE', Weakening: '#F2B04B', Lagging: '#F48A88', Improving: '#8EC0FA' };
  var QORDER = { Leading: 0, Weakening: 1, Improving: 2, Lagging: 3 };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var ST = { f: 'sectors', view: 'simple', s: null, sort: { col: 'rot', dir: 1 }, rrg: 'weekly', heat: 'rel' };
  var POLL_MS = 5 * 60 * 1000, RETRY_MS = 60 * 1000, TIMEOUT_MS = 8000, LABEL_N = 7, LABEL_MAX = 13;

  var ABBR = { software: 'Software', semiconductors: 'Semis', tech_hardware: 'Hardware', media_internet: 'Media', banks: 'Banks',
    insurance: 'Insurance', biopharma: 'Biopharma', healthcare_equip_svcs: 'HC Equip', energy: 'Energy', utilities: 'Utilities',
    real_estate: 'Real Est.', defense_aerospace: 'Defense', capital_goods: 'Cap Goods', transport: 'Transport', retail: 'Retail',
    consumer_finance: 'Cons Fin', capital_markets: 'Cap Mkts', chemicals: 'Chemicals', commercial_services: 'Comm Svcs',
    metals_mining: 'Metals', materials_other: 'Mat Other',
    staples: 'Staples', leisure_travel: 'Leisure', it_services: 'IT Svcs', autos: 'Autos', materials: 'Materials',
    diversified_financials: 'Div Fin', telecom: 'Telecom', food_beverage: 'Food & Bev' };
  var BLOCK_NAME = { fear: 'fear meter', breadth: 'breadth', rotation: 'rotation', gex_etf: 'fund options maps', gex_members: 'members\' gamma', industries: 'industry groups' };


  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dt(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fd(iso) { if (!iso) return '–'; var d = dt(iso); return MON[d.getMonth()] + ' ' + d.getDate(); }
  function fdw(iso) { if (!iso) return '–'; var d = dt(iso); return DOW[d.getDay()] + ' ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function pretty(t) { return String(t == null ? '' : t).replace(/\b(\d{4}-\d{2}-\d{2})\b/g, function (m) { return fd(m); }); }
  function n1(v) { return v == null ? '–' : (v < 0 ? '−' : '') + fx(v, 1); }
  function pct(v, d) { return v == null ? '–' : (v < 0 ? '−' : '') + fx(v, d == null ? 1 : d) + '%'; }
  function fx(v, d) { var m = Math.pow(10, d), a = Math.round(Math.abs(+v) * m + 1e-9) / m; return a.toFixed(d); }
  function sgn(v, d) { if (v == null) return '–'; d = d == null ? 1 : d; var a = fx(v, d); return (+a === 0 ? '' : v > 0 ? '+' : '−') + a; }
  function sgnPct(v, d) { return v == null ? '–' : sgn(v, d) + '%'; }
  function cls(v) { return v > 0 ? 'up' : v < 0 ? 'down' : ''; }
  function strike(v) { if (v == null) return '–'; var s = (+v).toFixed(2); return s.replace(/\.?0+$/, ''); }
  function usd(v) {
    if (v == null) return '–';
    var a = Math.abs(v), s = a >= 1e9 ? (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M' : a >= 1e3 ? (a / 1e3).toFixed(0) + 'K' : a.toFixed(0);
    return (v < 0 ? '−$' : '$') + s;
  }
  function ord(n) { if (n == null) return '–'; n = Math.round(n); var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function svgEl(W, H, inner, label) { return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label || '') + '">' + inner + '</svg>'; }
  function halo(col, size, weight) { return 'fill="' + col + '" font-size="' + size + '"' + (weight ? ' font-weight="' + weight + '"' : '') + ' paint-order="stroke" stroke="' + C.panel + '" stroke-width="3" stroke-linejoin="round"'; }
  function textW(s, size) { return String(s).length * size * 0.56; }
  function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function niceStep(span, n) { var raw = span / Math.max(1, n) || 1, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }
  function last(a) { return a[a.length - 1]; }
  function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + last(a); }
  function ZONE(z) { return '<span class="zone zone-' + z + '">' + z + '</span>'; }
  function QUAD(q) { return '<span class="quad q-' + q + '">' + q + '</span>'; }
  function quadOf(r, m) { return r >= 100 ? (m >= 100 ? 'Leading' : 'Weakening') : (m >= 100 ? 'Improving' : 'Lagging'); }
  function series(k, mode) { return mode === 'daily' ? S[k].rot.rrg_daily : S[k].rot.rrg; }

  function modeQuad(k, mode) { var r = S[k].rot; if (mode === 'weekly' && r.quad) return r.quad; if (mode === 'daily' && r.quad_daily) return r.quad_daily; var p = last(series(k, mode)); return quadOf(p[1], p[2]); }
  function modeQuadPrev(k, mode) { var r = S[k].rot; if (mode === 'weekly' && r.quad_prev) return r.quad_prev; var a = series(k, mode), p = a[Math.max(0, a.length - (mode === 'daily' ? 6 : 2))]; return quadOf(p[1], p[2]); }
  function setupCls(st) { return 'setup setup-' + String(st || '').replace(' ', ''); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {  } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function symA(sym, cl) { return '<span class="' + (cl || 'sym') + '">' + esc(sym) + '</span>'; }
  function oiBtn() { return ''; }


  function tk(s) { return IND ? (ABBR[s.key] || String(s.short || s.name).split(/[ &,]/)[0].slice(0, 10)) : s.etf; }
  function subName(s) { return IND ? s.fear.listed + ' members' : s.etf; }


  function bind() {
    var I = RAW.families && RAW.families.industries;
    IND = ST.f === 'industries' && !!I;
    SR = IND ? Object.assign({}, RAW, I, { market: Object.assign({}, RAW.market, I.market) }) : RAW;
    S = SR.sectors || {};
    KEYS = (SR.keys || []).filter(function (k) { var s = S[k]; return s && s.rot && s.fear && s.br && s.gm; });
    MK = SR.market;
    LN = RAW.ln || {};
    var n = KEYS.length;
    U = IND ? { one: 'group', many: 'groups', One: 'Group', all: 'All groups', board: 'Group board', bench: 'the S&amp;P 500 equal weight', benchS: 'S&amp;P EW', benchW: 'S&amp;P 500 equal weight', ofday: 'GROUP OF THE DAY', n: n, nmany: n + ' groups', funds: 'group funds' }
      : { one: 'sector', many: 'sectors', One: 'Sector', all: 'All sectors', board: 'Sector board', bench: 'the S&amp;P 500', benchS: 'S&amp;P', benchW: 'S&amp;P 500', ofday: 'SECTOR OF THE DAY', n: n, nmany: n + ' sectors', funds: 'sector funds' };
  }


  function rankMove(s) { if (s.rot.rank_prev == null) return ''; var d = s.rot.rank_prev - s.rot.rank; return d > 0 ? '<span class="mv up">▲' + d + '</span>' : d < 0 ? '<span class="mv down">▼' + (-d) + '</span>' : '<span class="mv muted">=</span>'; }
  function higherThan(fe) {
    if (fe.below === 0 || fe.now['1D'] === 0) return 'no member scared today';
    return 'higher than <b>' + Math.round(fe.pct_below.since2013) + '%</b> of days since 2013';
  }
  function brTag(br) {
    if (br.state === 'WASHOUT') return '<span class="tag tag-wash">WASHOUT</span>' + (br.wash_since ? ' since ' + fd(br.wash_since) : '');
    if (br.state === 'TURN') return '<span class="tag tag-turn">TURN</span>';
    if (br.state === 'BROAD') return '<span class="tag tag-broad">BROAD</span>';
    if (br.recovering) return '<span class="tag tag-rec">RECOVERING</span> · not turned yet';
    return '';
  }
  function kingRel(gx) {
    var k = strike(gx.king.strike), a = gx.king.pct_away;
    if (Math.abs(a) <= 0.3) return 'on the ' + k + ' king';
    if (a > 0 && a <= 2) return 'just under the ' + k + ' king';
    if (a < 0 && a >= -2) return 'just above the ' + k + ' king';
    return 'the ' + k + ' king ' + sgnPct(a) + ' away';
  }
  function setupWords(gx) {
    var k = strike(gx.king && gx.king.strike);
    if (gx.setup === 'PINNED') return 'pinned to its ' + k + ' king';
    if (gx.setup === 'AT FLIP') return 'at its ' + strike(gx.flip) + ' flip, ' + kingRel(gx);
    if (gx.setup === 'UNSTABLE') return 'short gamma under its ' + strike(gx.flip) + ' flip';
    if (gx.setup === 'SUPPORTED' && gx.put_support) return 'held up by support at ' + strike(gx.put_support.strike);
    if (gx.setup === 'CAPPED' && gx.call_wall) return 'capped by the ' + strike(gx.call_wall.strike) + ' call wall';
    return gx.regime;
  }
  function words(s) {
    var ro = s.rot, fe = s.fear, br = s.br, gx = s.gx, gm = s.gm, out = [];
    var q = { Leading: 'Leading', Weakening: 'Strong but fading', Lagging: 'Lagging', Improving: 'Improving' }[ro.quad];
    if (ro.quad !== ro.quad_prev) q += ' (new this week)';
    if (ro.rank === 1) q += ', strongest over 3 months';
    if (ro.rank === KEYS.length) q += ', weakest over 3 months';
    out.push(q);
    if (br.state === 'WASHOUT') out.push(br.now.d20 - br.now.d50 >= 50 ? 'washed-out breadth with a sharp 20-day bounce' : 'breadth washed out');
    else if (br.state === 'BROAD') out.push('broad breadth');
    else if (br.state === 'TURN') out.push('breadth just turned up');
    else if (br.recovering) out.push('breadth recovering');
    else out.push('mixed breadth');
    var most = KEYS.reduce(function (a, k) { return S[k].fear.now['1D'] > S[a].fear.now['1D'] ? k : a; }, KEYS[0]);
    if (s.key === most && fe.zone !== 'calm') out.push('<b>the most scared ' + U.one + '</b> (' + pct(fe.now['1D']) + ')');
    else if (fe.zone === 'calm' && fe.peak90 && fe.peak90.pct >= 70) out.push('calm again after ' + (/^(8|11|18)/.test(fx(fe.peak90.pct, 1)) ? 'an ' : 'a ') + pct(fe.peak90.pct) + ' fear spike');
    else out.push(fe.zone === 'calm' ? 'calm' : fe.zone === 'normal' ? 'some fear' : fe.zone);
    if (gx) out.push(setupWords(gx));
    else if (gm.pos_chg != null && gm.pos_chg <= -15) out.push('members in long gamma fell to ' + pct(gm.pos) + ' from ' + pct(gm.pos_prev));
    else out.push(pct(gm.pos) + ' of members in long gamma');
    var t = out.join(', ');
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }


  function readRoute() {
    var q = new URLSearchParams(location.search), h = location.hash.replace(/^#/, '');
    var f = q.get('f') || load('sr.f');
    ST.f = f === 'industries' ? 'industries' : 'sectors';
    if (q.get('f') && q.get('f') !== load('sr.f')) store('sr.f', ST.f);
    ST.view = q.get('view') === 'full' ? 'full' : 'simple';
    if (q.get('rrg') === 'daily') ST.rrg = 'daily';
    if (q.get('heat') && /^(rel|fear|br)$/.test(q.get('heat'))) ST.heat = q.get('heat');
    var s = q.get('s');
    if (!s && h) { var m = h.match(/^s=(\w+)/); s = m ? m[1] : h; }
    ST.s = s || null;
    if (RAW) { bind(); if (ST.s && KEYS.indexOf(ST.s) < 0) ST.s = null; }
  }
  function urlFor(s) {
    var q = new URLSearchParams(location.search);
    q.delete('s');
    if (ST.f === 'industries' || q.get('f')) q.set('f', ST.f);
    if (s) q.set('s', s);
    if (ST.view === 'full') q.set('view', 'full'); else q.delete('view');
    var t = q.toString();
    return location.pathname + (t ? '?' + t : '');
  }
  function go(s) {
    history.pushState(null, '', urlFor(s));
    readRoute(); render(); window.scrollTo(0, 0);
  }


  function getJSON(url) {
    function once() {
      var ctl = window.AbortController ? new AbortController() : null, done = false;
      var t = setTimeout(function () { if (ctl && !done) ctl.abort(); }, TIMEOUT_MS);
      return fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error(url + ' HTTP ' + r.status); return r.json(); })
        .then(function (j) { done = true; clearTimeout(t); return j; }, function (e) { done = true; clearTimeout(t); throw e; });
    }
    return once().catch(function () { return new Promise(function (res) { setTimeout(res, 1500); }).then(once); });
  }
  var timer = null, lastPoll = 0, inflight = false;
  function schedule() { clearTimeout(timer); timer = setTimeout(poll, RAW && !LOADERR ? POLL_MS : RETRY_MS); }
  function sig(p) { return p ? (p.updated_utc || '') + '|' + p.asof + '|' + JSON.stringify(p.blocks || {}) : ''; }
  function poll() {
    if (inflight) return;
    inflight = true; lastPoll = Date.now();
    getJSON(DATA_URL).then(function (p) {
      if (!p || typeof p !== 'object' || !p.sectors) throw new Error('no board in the data file');
      LOADERR = null;
      if (!RAW || sig(p) !== sig(RAW)) { RAW = p; readRoute(); render(); } else renderStatus();
    }).catch(function (e) {
      LOADERR = e;
      if (!RAW) renderError(); else renderStatus();
    }).then(function () { inflight = false; schedule(); });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - lastPoll > POLL_MS) poll(); });


  function chipFor() {
    return { text: 'CLOSE · ' + fdw(RAW.asof), cls: 'chip-closed' };
  }
  function newestSession() {
    return RAW.asof;
  }
  function bf(n) { var B = RAW.blocks || {}; return B[n] && B[n].built_for; }

  function oiSettles() {
    var u = {}; KEYS.forEach(function (k) { var g = S[k].gx; if (g && g.oi_settle) u[g.oi_settle] = 1; });
    var a = Object.keys(u).sort(); if (!a.length && SR.gex_oi_settle) a = [SR.gex_oi_settle];
    return a.length ? 'the ' + andList(a.map(fd)) + ' settle' + (a.length > 1 ? 's' : '') : '';
  }
  function vintageLine() {
    var B = RAW.blocks || {}, parts = [], full = [], base = bf('fear'), rotN = IND ? 'industries' : 'rotation';
    if (base && bf('breadth') === base && bf(rotN) === base) parts.push('Prices, fear and breadth: ' + fdw(base) + ' close');
    else {
      if (base && bf('breadth') === base) parts.push('Fear and breadth: ' + fdw(base) + ' close');
      else { if (base) parts.push('Fear: ' + fdw(base) + ' close'); if (bf('breadth')) parts.push('breadth: ' + fdw(bf('breadth')) + ' close'); }
      if (bf(rotN)) parts.push((IND ? 'group indexes to ' : 'fund prices to ') + fd(bf(rotN)));
    }
    var oi = oiSettles();
    if (bf('gex_etf')) parts.push('options maps: ' + fd(bf('gex_etf')) + ' close' + (oi ? ' with open interest from ' + oi : ''));
    if (bf('gex_members') && bf('gex_members') !== base) parts.push('members\' gamma: ' + fd(bf('gex_members')) + ' close');
    Object.keys(BLOCK_NAME).forEach(function (n) { if (B[n]) full.push(BLOCK_NAME[n] + ': ' + (B[n].built_for ? fdw(B[n].built_for) + ' close' : '–')); });
    return { text: parts.join(' · '), title: full.join('\n') };
  }
  function behindLine() {
    var B = RAW.blocks || {}, newest = newestSession(), late = [];
    Object.keys(BLOCK_NAME).forEach(function (n) { var b = B[n]; if (b && b.built_for && newest && b.built_for < newest) late.push(BLOCK_NAME[n] + ' from ' + fdw(b.built_for)); });
    if (!late.length) return '';
    return 'Data is behind: ' + late.join(', ') + ' · prices are from ' + fdw(newest) + '.';
  }
  function renderStatus() {
    document.querySelectorAll('.seg-view button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === ST.view)); });
    document.querySelectorAll('.seg-view').forEach(function (g) { g.hidden = !!ST.s; });
    var indOk = !!(RAW && RAW.families && RAW.families.industries);
    document.querySelectorAll('.seg-fam button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.f === (RAW ? (IND ? 'industries' : 'sectors') : ST.f)));
      if (b.dataset.f === 'industries') { b.disabled = RAW ? !indOk : false; b.title = RAW && !indOk ? 'Industry groups are not built yet' : ''; }
    });
    if (!RAW) return;
    var ch = chipFor(), chip = $('chip');
    chip.textContent = ch.text; chip.className = 'chip ' + ch.cls;
    var mapped = KEYS.reduce(function (a, k) { return a + S[k].fear.listed; }, 0), listed = MK.fear.listed;
    $('asof').textContent = IND ? KEYS.length + ' industry groups (12+ S&P members each) · ' + mapped + ' of ' + listed + ' S&P members in a group · equal-weight indexes'
      : 'The ' + KEYS.length + ' S&P 500 sectors · ' + mapped + ' of ' + listed + ' S&P members mapped to a sector · SPDR sector funds';
    var v = vintageLine(), vl = $('vintage');
    vl.textContent = v.text; vl.title = v.title;
    var bh = behindLine(), be = $('behind');
    be.textContent = bh; be.hidden = !bh;
  }
  function renderError() {
    var chip = $('chip'); chip.textContent = 'NO DATA YET'; chip.className = 'chip chip-closed';
    $('app').innerHTML = '<p class="loading">The board could not be loaded. Trying again every minute.</p>';
  }


  function byRankKeys() { return KEYS.slice().sort(function (a, b) { return S[a].rot.rank - S[b].rot.rank; }); }
  function rankKey(n) { return byRankKeys()[n - 1]; }
  function leadKey() { var b = byRankKeys(); return b.filter(function (k) { return S[k].rot.quad === 'Leading'; })[0] || b[0]; }
  function tilesHTML() {
    var byRank = byRankKeys();
    var leaders = byRank.filter(function (k) { return S[k].rot.quad === 'Leading'; });
    var lead = leadKey(), top1 = byRank[0];
    var scared = KEYS.slice().sort(function (a, b) { return S[b].fear.now['1D'] - S[a].fear.now['1D']; })[0];
    var weak = KEYS.slice().sort(function (a, b) { return S[a].br.now.d50 - S[b].br.now.d50; })[0];
    var nWash = KEYS.filter(function (k) { return S[k].br.state === 'WASHOUT'; }).length;
    var L = S[lead], F = S[scared], W = S[weak];
    var shortK = KEYS.filter(function (k) { return S[k].gx && S[k].gx.regime === 'short gamma'; });
    var shortEtf = shortK.map(function (k) { return S[k].etf; });
    var noMap = KEYS.filter(function (k) { return S[k].etf && !S[k].gx; }).map(function (k) { return S[k].etf; });
    var noFund = KEYS.filter(function (k) { return !S[k].etf; }).length;
    var inflow = KEYS.filter(function (k) { var r = S[k].rot; return r.quad !== r.quad_prev && (r.quad === 'Improving' || r.quad === 'Leading') && !(r.quad_prev === 'Leading' && r.quad === 'Improving'); })
      .sort(function (a, b) { return S[a].rot.rank - S[b].rot.rank; });
    var moves = {}; inflow.forEach(function (k) { moves[S[k].rot.quad_prev + ' → ' + S[k].rot.quad] = 1; });
    var cap = IND ? 3 : 5, inNames = inflow.slice(0, cap).map(function (k) { return tk(S[k]); }).join(', ') + (inflow.length > cap ? ' +' + (inflow.length - cap) + ' more' : '');
    var leadNote = (inflow.length ? 'Money moving in this week: <b>' + inNames + '</b>' + (IND ? '' : ' (' + Object.keys(moves).join(', ') + ')') + ' · ' : '') +
      (lead === top1 ? 'strongest of the ' + U.nmany + ' over 3 months' :
        (leaders.length === 1 ? 'the only one in Leading; ' : leaders.length ? leaders.length + ' ' + U.many + ' in Leading; ' : 'none in Leading; ') + S[top1].short + ' is #1 by 3-month strength, ' + S[top1].rot.quad.toLowerCase());
    var sc = F.fear.scared || [], scTxt = sc.slice(0, 6).join(', ') + (sc.length > 6 ? ' +' + (sc.length - 6) : '');
    var etfLong = SR.etf_long || [], etfWith = SR.etf_with_chain || [];
    return '<div class="tiles">' +
      '<div class="tile" data-go="' + lead + '"><div class="k">Leading now</div><div class="who">' + esc(L.short) + '<span class="etf">' + subName(L) + '</span></div>' +
      '<div class="v num ' + cls(L.rot.rs63) + '">' + sgnPct(L.rot.rs63) + '<small>vs ' + U.benchW + ' · 3 months</small></div>' +
      '<div class="s">' + leadNote + '</div></div>' +
      '<div class="tile" data-go="' + scared + '"><div class="k">Most scared</div><div class="who">' + esc(F.short) + '<span class="etf">' + subName(F) + '</span></div>' +
      '<div class="v num fearc">' + pct(F.fear.now['1D']) + ' ' + ZONE(F.fear.zone) + '</div>' +
      '<div class="s"><b>' + F.fear.below + ' of ' + F.fear.n + '</b> members scared' + (scTxt ? ': ' + scTxt : '') + ' · ' + higherThan(F.fear) + ' · its alarm line ' + n1(F.fear.alarm) + '</div></div>' +
      '<div class="tile" data-go="' + weak + '"><div class="k">Weakest breadth</div><div class="who">' + esc(W.short) + '<span class="etf">' + subName(W) + '</span></div>' +
      '<div class="v num" style="color:' + C.b50l + '">' + pct(W.br.now.d50) + '<small>above 50-day</small></div>' +
      '<div class="s">' + (brTag(W.br) ? brTag(W.br) + ' · ' : '') + pct(W.br.now.d200) + ' above 200-day · <b>' + nWash + ' of ' + KEYS.length + '</b> ' + U.many + ' in washout</div></div>' +
      '<div class="tile" data-go="' + (shortK[0] || '') + '"><div class="k">' + (IND ? 'Group funds' : 'Sector funds') + ' in long gamma</div><div class="who">' + etfLong.length + ' of ' + etfWith.length + '<span class="etf">with an options map</span></div>' +
      '<div class="v num">' + pct(MK.gm.pos) + '<small>of all S&amp;P members long gamma</small></div>' +
      '<div class="s">' + (shortEtf.length ? '<b>' + andList(shortEtf) + '</b> ' + (shortEtf.length === 1 ? 'is the only fund' : 'are') + ' in short gamma' : 'no fund in short gamma') +
      (noMap.length ? ' · no options map yet for ' + noMap.join(', ') : '') + (IND && noFund ? ' · ' + noFund + ' groups have no fund (members\' maps only)' : '') + '</div></div>' +
      '</div>' + sotdLine();
  }
  function sotdLine() {
    var f = SR.featured; if (!f || !S[f.key] || KEYS.indexOf(f.key) < 0) return '';
    var s = S[f.key];
    var why = (f.why || []).filter(function (w) { return w !== 'its fund has a full options map'; });
    if (s.gx && s.gx.setup === 'PINNED') why.push('pinned to its ' + strike(s.gx.king.strike) + ' king');
    return '<p class="sotd"><span class="lbl">' + U.ofday + '</span><a href="' + esc(urlFor(f.key)) + '" data-go="' + f.key + '">' + esc(s.short) + (s.etf ? ' (' + s.etf + ')' : '') + ' →</a> <span class="muted">' + why.join(' · ') + '</span></p>';
  }


  function rrgSVG(mode, W) {
    var narrow = W < 520, H = Math.round(narrow ? W * 1.0 : IND ? Math.min(W * 0.9, 700) : Math.min(W * 0.8, 610));
    var Lm = narrow ? 36 : 50, Rm = 12, Tm = 24, Bm = narrow ? 34 : 40, pw = W - Lm - Rm, ph = H - Tm - Bm;
    var tailN = mode === 'daily' ? 10 : 6, pts = {};
    KEYS.forEach(function (k) { pts[k] = series(k, mode).slice(-tailN); });
    var x0 = 99.6, x1 = 100.4, y0 = 99.6, y1 = 100.4;
    KEYS.forEach(function (k) { pts[k].forEach(function (p) { x0 = Math.min(x0, p[1]); x1 = Math.max(x1, p[1]); y0 = Math.min(y0, p[2]); y1 = Math.max(y1, p[2]); }); });
    var px_ = (x1 - x0) * 0.07, py_ = (y1 - y0) * 0.09; x0 -= px_; x1 += px_; y0 -= py_; y1 += py_;
    var dx = (x1 - x0) / 2, dy = (y1 - y0) / 2;
    var X = function (v) { return Lm + (v - x0) / (x1 - x0) * pw; }, Y = function (v) { return Tm + ph - (v - y0) / (y1 - y0) * ph; };
    var o = [], qlab = [], cx = X(100), cy = Y(100);
    [['Improving', Lm, Tm, cx - Lm, cy - Tm, 'start', Lm + 10, Tm + 20], ['Leading', cx, Tm, Lm + pw - cx, cy - Tm, 'end', Lm + pw - 10, Tm + 20],
      ['Lagging', Lm, cy, cx - Lm, Tm + ph - cy, 'start', Lm + 10, Tm + ph - 10], ['Weakening', cx, cy, Lm + pw - cx, Tm + ph - cy, 'end', Lm + pw - 10, Tm + ph - 10]]
      .forEach(function (q) {
        o.push('<rect x="' + q[1].toFixed(1) + '" y="' + q[2].toFixed(1) + '" width="' + q[3].toFixed(1) + '" height="' + q[4].toFixed(1) + '" fill="' + QC[q[0]] + '" fill-opacity="0.075"/>');
        qlab.push('<text x="' + q[6] + '" y="' + q[7] + '" text-anchor="' + q[5] + '" ' + halo(QL[q[0]], narrow ? 13 : 15, 700) + ' letter-spacing="0.04em">' + q[0].toUpperCase() + '</text>');
      });
    var sx = niceStep(2 * dx, narrow ? 4 : 6), sy = niceStep(2 * dy, narrow ? 4 : 6), v;
    for (v = Math.ceil(x0 / sx) * sx; v <= x1 + 1e-9; v += sx) {
      var gx = X(v);
      o.push('<line x1="' + gx.toFixed(1) + '" x2="' + gx.toFixed(1) + '" y1="' + Tm + '" y2="' + (Tm + ph) + '" stroke="' + C.grid + '" stroke-width="1"/>');
      o.push('<text x="' + gx.toFixed(1) + '" y="' + (Tm + ph + 15) + '" text-anchor="middle" fill="' + C.muted + '" font-size="11">' + (+v.toFixed(2)) + '</text>');
    }
    for (v = Math.ceil(y0 / sy) * sy; v <= y1 + 1e-9; v += sy) {
      var gy = Y(v);
      o.push('<line x1="' + Lm + '" x2="' + (Lm + pw) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '" stroke="' + C.grid + '" stroke-width="1"/>');
      o.push('<text x="' + (Lm - 6) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" fill="' + C.muted + '" font-size="11">' + (+v.toFixed(2)) + '</text>');
    }
    o.push('<line x1="' + cx.toFixed(1) + '" x2="' + cx.toFixed(1) + '" y1="' + Tm + '" y2="' + (Tm + ph) + '" stroke="#6B6F7B" stroke-width="1.2"/>');
    o.push('<line x1="' + Lm + '" x2="' + (Lm + pw) + '" y1="' + cy.toFixed(1) + '" y2="' + cy.toFixed(1) + '" stroke="#6B6F7B" stroke-width="1.2"/>');
    o.push(qlab.join(''));
    o.push('<text x="' + (Lm + pw) + '" y="' + (H - 4) + '" text-anchor="end" fill="' + C.text + '" font-size="12">Stronger than ' + (IND && narrow ? 'S&amp;P EW' : U.bench) + ' →</text>');
    o.push('<text x="' + Lm + '" y="' + (H - 4) + '" fill="' + C.muted + '" font-size="12">← weaker</text>');
    o.push('<text x="' + Lm + '" y="' + (Tm - 8) + '" fill="' + C.text + '" font-size="12">↑ Gaining strength</text>');
    var heads = KEYS.map(function (k) { var p = last(pts[k]); return { k: k, x: X(p[1]), y: Y(p[2]) }; }), r = narrow ? 5 : (IND ? 5.5 : 6.5);

    var show = {}, qnow = {};
    KEYS.forEach(function (k) { qnow[k] = modeQuad(k, mode); });
    if (IND) {
      var back = mode === 'daily' ? 5 : 1;
      KEYS.map(function (k) { var a = pts[k], p = last(a), q = a[Math.max(0, a.length - 1 - back)]; return { k: k, d: Math.hypot(X(p[1]) - X(q[1]), Y(p[2]) - Y(q[2])) }; })
        .sort(function (a, b) { return b.d - a.d; }).slice(0, LABEL_N).forEach(function (m) { show[m.k] = 1; });


      [SR.featured && SR.featured.key, rankKey(1), leadKey()].forEach(function (k) { if (k && S[k] && KEYS.indexOf(k) >= 0) show[k] = 1; });
      KEYS.forEach(function (k) { var q = qnow[k]; if ((q === 'Leading' || q === 'Lagging') && q !== modeQuadPrev(k, mode)) show[k] = 1; });
      var perQ = {}; KEYS.forEach(function (k) { (perQ[qnow[k]] = perQ[qnow[k]] || []).push(k); });
      Object.keys(perQ).forEach(function (q) { if (perQ[q].length === 1) show[perQ[q][0]] = 1; });
    } else KEYS.forEach(function (k) { show[k] = 1; });
    KEYS.forEach(function (k) {
      var a = pts[k], col = QC[qnow[k]], g = ['<g class="tail" data-tail="' + k + '">'];
      for (var i = 1; i < a.length; i++) {
        var lastSeg = i === a.length - 1;
        g.push('<line class="' + (lastSeg ? 'seg-last' : 'seg') + '" x1="' + X(a[i - 1][1]).toFixed(1) + '" y1="' + Y(a[i - 1][2]).toFixed(1) + '" x2="' + X(a[i][1]).toFixed(1) + '" y2="' + Y(a[i][2]).toFixed(1) + '" stroke="' + col + '" stroke-opacity="' + (lastSeg ? 0.7 : (IND ? 0.16 : 0.25)) + '" stroke-width="1" stroke-linecap="round"/>');
      }
      for (var j = 0; j < a.length - 1; j++) g.push('<circle class="node" cx="' + X(a[j][1]).toFixed(1) + '" cy="' + Y(a[j][2]).toFixed(1) + '" r="2.2" fill="' + col + '"/>');
      g.push('</g>'); o.push(g.join(''));
    });
    var boxes = heads.map(function (h) { return { x: h.x - r - 1, y: h.y - r - 1, w: 2 * r + 2, h: 2 * r + 2 }; });
    heads.sort(function (a, b) { return (show[b.k] || 0) - (show[a.k] || 0) || a.x - b.x; });
    var labels = [], nShown = 0;
    function place(h) {
      var t = tk(S[h.k]), fs = narrow ? 11.5 : 13, w = textW(t, fs) + 2, hh = fs;
      var cand = [[r + 4, fs * 0.36], [-r - 4 - w, fs * 0.36], [-w / 2, -r - 5], [-w / 2, r + fs + 2], [r + 3, -r - 1], [r + 3, r + fs - 2], [-r - 3 - w, -r - 1], [-r - 3 - w, r + fs - 2]];
      var pick = null, fit = null;
      for (var i = 0; i < cand.length && !pick; i++) {
        var b = { x: h.x + cand[i][0], y: h.y + cand[i][1] - hh + 2, w: w, h: hh };
        if (b.x < Lm + 2 || b.x + b.w > Lm + pw - 2 || b.y < Tm + 2 || b.y + b.h > Tm + ph - 2) continue;
        if (!fit) fit = { b: b, dx: cand[i][0], dy: cand[i][1] };
        if (boxes.some(function (o2) { return overlaps(o2, b); })) continue;
        pick = { b: b, dx: cand[i][0], dy: cand[i][1] };
      }
      return { t: t, fs: fs, pick: pick, fit: fit || { b: { x: h.x + r + 4, y: h.y - hh + 6, w: w, h: hh }, dx: r + 4, dy: fs * 0.36 } };
    }
    heads.filter(function (h) { return show[h.k]; }).forEach(function (h) {
      var p = place(h), pk = p.pick || p.fit;
      boxes.push(pk.b); nShown++;
      labels.push({ h: h, t: p.t, x: h.x + pk.dx, y: h.y + pk.dy, fs: p.fs, shown: true });
    });

    heads.filter(function (h) { return !show[h.k]; }).sort(function (a, b) { return Math.hypot(b.x - cx, b.y - cy) - Math.hypot(a.x - cx, a.y - cy); }).forEach(function (h) {
      var p = place(h), shown = !!p.pick && nShown < LABEL_MAX, pk = p.pick || p.fit;
      if (shown) { boxes.push(pk.b); nShown++; show[h.k] = 1; }
      labels.push({ h: h, t: p.t, x: h.x + pk.dx, y: h.y + pk.dy, fs: p.fs, shown: shown });
    });
    heads.forEach(function (h) {
      var s = S[h.k];
      o.push('<circle class="head" data-rk="' + h.k + '" cx="' + h.x.toFixed(1) + '" cy="' + h.y.toFixed(1) + '" r="' + r + '" fill="' + QC[qnow[h.k]] + '" stroke="' + C.white + '" stroke-width="1.5"/><circle class="hit" data-rk="' + h.k + '" cx="' + h.x.toFixed(1) + '" cy="' + h.y.toFixed(1) + '" r="' + (r + 9) + '" fill="transparent"><title>' + esc(s.name + (s.etf && !IND ? ' (' + s.etf + ')' : '') + ' · ' + qnow[h.k] + ' · #' + s.rot.rank + ' by 3-month strength') + '</title></circle>');
    });
    labels.sort(function (a, b) { return (b.shown ? 1 : 0) - (a.shown ? 1 : 0); });
    labels.forEach(function (l) { o.push('<text class="lab' + (l.shown ? '' : ' lab-h') + '" data-rk="' + l.h.k + '" x="' + l.x.toFixed(1) + '" y="' + l.y.toFixed(1) + '" ' + halo(C.white, l.fs, 700) + '>' + esc(l.t) + '</text>'); });
    return svgEl(W, H, o.join(''), 'Rotation map: each ' + U.one + ' by relative strength (right = stronger than ' + U.bench + ') and momentum (up = gaining)');
  }
  var HOT = { k: null, pinned: false };
  function setHot(k) {
    var svg = document.querySelector('#rrg svg'); if (!svg) return;
    svg.classList.toggle('has-hot', !!k);
    svg.querySelectorAll('g.tail').forEach(function (g) { g.classList.toggle('hot', g.getAttribute('data-tail') === k); });
    svg.querySelectorAll('.lab-h').forEach(function (t) { t.classList.toggle('show', t.getAttribute('data-rk') === k); });
    document.querySelectorAll('.moves [data-rk]').forEach(function (c) { c.classList.toggle('hot', c.getAttribute('data-rk') === k); });
  }
  function rotationHTML() {
    var mode = ST.rrg, qn = {}, qp = {};
    KEYS.forEach(function (k) { qn[k] = modeQuad(k, mode); qp[k] = modeQuadPrev(k, mode); });
    var byQ = { Leading: [], Weakening: [], Improving: [], Lagging: [] };
    var ordered = KEYS.slice().sort(function (a, b) { return S[a].rot.rank - S[b].rot.rank; });
    ordered.forEach(function (k) { byQ[qn[k]].push(k); });
    var li = ['Leading', 'Weakening', 'Improving', 'Lagging'].map(function (q) {
      var items = byQ[q].map(function (k) {
        var s = S[k], fresh = qn[k] !== qp[k];
        return '<span class="wi" data-rk="' + k + '">' + (fresh ? '<span class="gold" title="new in this corner">●</span> ' : '') + '<span class="tk">' + esc(tk(s)) + '</span> <span class="muted">#' + s.rot.rank + '</span></span>';
      }).join(' ');
      return '<li>' + QUAD(q) + '<span class="wis">' + (items || '<span class="muted">none</span>') + '</span></li>';
    }).join('');
    var fresh = KEYS.filter(function (k) { return qn[k] !== qp[k]; }).sort(function (a, b) { return S[a].rot.rank - S[b].rot.rank; });
    var when = mode === 'daily' ? 'in the last 5 sessions' : 'this week';
    var byMove = {}, moveOrder = [];
    fresh.forEach(function (k) { var mv = qp[k] + ' → ' + qn[k]; if (!byMove[mv]) { byMove[mv] = []; moveOrder.push(mv); } byMove[mv].push(esc(tk(S[k]))); });
    var freshTxt = !fresh.length ? '' : '<p class="board-note"><span class="gold">●</span> new ' + when + ': ' + (moveOrder.length === 1
      ? '<b>' + byMove[moveOrder[0]].join(', ') + '</b> moved ' + moveOrder[0]
      : moveOrder.map(function (mv) { return mv + ': <b>' + byMove[mv].join(', ') + '</b>'; }).join(' · ')) + '</p>';
    var mx = Math.max.apply(null, KEYS.map(function (k) { return Math.abs(S[k].rot.rs63 || 0); }).concat([0.01]));
    var ranks = '<h3 style="margin-top:16px">3-month return vs ' + U.bench + '</h3><div class="sbars' + (IND ? ' ind' : '') + '">' + ordered.map(function (k) {
      var s = S[k], v = s.rot.rs63, w = Math.abs(v || 0) / mx * 50;
      return '<span class="sb-k">#' + s.rot.rank + ' <b>' + esc(tk(s)) + '</b></span><span class="sb-bar"><i style="' + (v >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(1) + '%;background:' + (v >= 0 ? C.up : C.down) + '"></i><span class="sb-z"></span></span>' +
        '<span class="sb-v ' + cls(v) + '">' + sgnPct(v) + '</span><span class="sb-m">' + rankMove(s) + '</span>';
    }).join('') + '</div><p class="board-note muted" style="margin-top:4px">▲▼ = rank change since ' + fd(SR.rank_prev_date) + '</p>';
    var span = mode === 'daily' ? SR.rrg_days : SR.rrg_weeks, back = mode === 'daily' ? 10 : 6;
    var hint = (mode === 'daily' ? 'Daily points · ' : 'Weekly points · ') + fd(span[Math.max(0, span.length - back)]) + ' → ' + fd(last(span));
    var sub = IND ? 'Each industry group\'s equal-weight index against the equal-weight S&amp;P 500: right = stronger, up = gaining strength. Names on the biggest movers ' + (mode === 'daily' ? 'of the last 5 sessions' : 'of the week') + ', the leaders and the new corners; hover or tap any dot for its name and path.'
      : 'Each sector fund against the S&amp;P 500: right = stronger, up = gaining strength. Faint tails = the last ' + (mode === 'daily' ? '10 sessions' : '6 weeks') + '; hover or tap a dot for its full path.';
    return '<section class="card" id="rotation"><div class="card-head"><div class="card-title"><h2>Rotation map</h2><p class="sub">' + sub + '</p></div></div>' +
      '<div class="rot-grid"><div class="rrg-wrap"><div class="rrg-bar"><span class="hint">' + hint + '</span>' +
      '<div class="seg seg-sm" role="group" aria-label="Rotation map points"><button type="button" data-rrg="weekly" aria-pressed="' + (mode === 'weekly') + '">Weekly</button><button type="button" data-rrg="daily" aria-pressed="' + (mode === 'daily') + '">Daily</button></div></div>' +
      '<div class="rrg" id="rrg"></div></div>' +
      '<div class="side"><h3>Who is where' + (mode === 'daily' ? ' <span class="muted" style="font-weight:500">· daily map</span>' : '') + '</h3><ul class="moves' + (IND ? ' ind' : '') + '">' + li + '</ul>' + freshTxt + '<details class="more"' + (!IND && window.innerWidth >= 720 ? ' open' : '') + '><summary>3-month ranking and how to read the map</summary>' + ranks +
      '<div class="box"><div class="box-row"><b>How to read it</b><span>Right of 100 = the ' + U.one + '\'s strength against ' + U.bench + ' is above its own recent average (relative strength improving); above 100 = that reading is still rising. Hover or tap a dot to see its full tail. ' +
      (IND ? 'Groups' : 'Sectors') + ' tend to circle clockwise: Improving → Leading → Weakening → Lagging (' + SR.clockwise_pct + '% of corner changes since 2013 went that way).</span></div>' +
      '<div class="box-row"><b>Rank</b><span>#1 = the best 3-month return vs ' + U.bench + ' of the ' + U.nmany + '.</span></div></div></details>' +
      '</div></div></section>';
  }


  function sparkSVG(fe, w, h) {
    var d = fe.d.slice(-63).map(function (v) { return v == null ? 0 : v; }), mx = Math.max(fe.alarm * 1.15, Math.max.apply(null, d) * 1.08, 5), n = d.length;
    var X = function (i) { return 1 + i / Math.max(1, n - 1) * (w - 6); }, Y = function (v) { return h - 2 - v / mx * (h - 5); };
    var p = d.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
    var o = '<path d="' + p + 'L' + X(n - 1).toFixed(1) + ' ' + (h - 2) + 'L1 ' + (h - 2) + 'Z" fill="' + C.fear + '" fill-opacity="0.35"/>' +
      '<path d="' + p + '" fill="none" stroke="' + C.fear + '" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<line x1="1" x2="' + (w - 4) + '" y1="' + Y(fe.alarm).toFixed(1) + '" y2="' + Y(fe.alarm).toFixed(1) + '" stroke="' + C.muted + '" stroke-width="1" stroke-dasharray="3 2"/>';
    var mi = d.indexOf(Math.max.apply(null, d));
    if (d[mi] >= fe.alarm && mi < n - 1) o += '<circle cx="' + X(mi).toFixed(1) + '" cy="' + Y(d[mi]).toFixed(1) + '" r="2.4" fill="' + C.gold + '" stroke="' + C.bg + '" stroke-width="1"/>';
    o += '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(d[n - 1]).toFixed(1) + '" r="2.6" fill="' + C.nowCore + '" stroke="#fff" stroke-width="1"/>';
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' + o + '</svg>';
  }

  function ticks() { return (LN.wash != null ? '<span class="t25" style="left:' + LN.wash + '%"></span>' : '') + (LN.rearm != null ? '<span class="t50" style="left:' + LN.rearm + '%"></span>' : ''); }
  function bars(br) {
    return '<div class="bars"><span class="bl">50d</span><span class="hb"><i style="width:' + br.now.d50 + '%;background:' + C.b50 + '"></i>' + ticks() + '</span><span class="bv">' + pct(br.now.d50) + '</span>' +
      '<span class="bl">200d</span><span class="hb"><i style="width:' + br.now.d200 + '%;background:' + C.b200 + '"></i>' + ticks() + '</span><span class="bv">' + pct(br.now.d200) + '</span></div>';
  }
  function gamChip(gx) { return '<span class="gam ' + (gx.regime === 'long gamma' ? 'gam-long' : 'gam-short') + '">' + gx.regime + '</span>'; }
  function noMapTxt(s) {
    if (!s.etf) return '<span class="nofund" title="no fund tracks this group; members\' maps only">members only</span>';
    return '<span class="nofund" title="no saved option chain for ' + s.etf + ' yet">' + s.etf + ' map —</span>';
  }
  function staleTxt(gx) { return gx.stale ? ' <span class="amber" title="the newest chain for ' + gx.etf + ' is older than the session">map of ' + fd(gx.session) + '</span>' : ''; }
  function gamCell(s) {
    var gx = s.gx, gm = s.gm;
    var memLine = '<b>' + pct(gm.pos) + '</b> of members long gamma', was = gm.pos_chg != null && Math.abs(gm.pos_chg) >= 5 ? 'was ' + pct(gm.pos_prev) + ' on ' + fd(SR.gm_prev_session) : '';
    if (!gx) return '<div class="ln ln-main">' + memLine + '</div><div class="ln2">' + (was ? was + ' · ' : '') + noMapTxt(s) + '</div>';
    return '<div class="r1">' + (IND ? symA(gx.etf, 'etf-a') : '') + gamChip(gx) + (gx.setup ? '<span class="' + setupCls(gx.setup) + '">' + gx.setup + '</span>' : '') + '</div>' +
      '<div class="ln">king <b class="gold">' + strike(gx.king.strike) + '</b> <span class="muted">' + sgnPct(gx.king.pct_away) + ' away · flip ' + strike(gx.flip) + '</span>' + staleTxt(gx) + '</div>' +
      '<div class="ln2">' + memLine + '</div>';
  }
  var SORTS = {
    sec: function (s) { return s.short; }, rot: function (s) { return s.rot.rank; }, fear: function (s) { return -s.fear.now['1D']; },
    br: function (s) { return s.br.now.d50; }, gam: function (s) { return -(s.gm.pos == null ? -1 : s.gm.pos); }, words: function (s) { return QORDER[s.rot.quad] * 100 + s.rot.rank; }
  };
  function sortedKeys() {
    var f = SORTS[ST.sort.col] || SORTS.rot, d = ST.sort.dir;
    return KEYS.slice().sort(function (a, b) { var x = f(S[a]), y = f(S[b]); return (x < y ? -1 : x > y ? 1 : S[a].rot.rank - S[b].rot.rank) * d; });
  }
  function th(col, label) {
    var on = ST.sort.col === col;
    return '<th><button type="button" data-sort="' + col + '"' + (on ? ' aria-sort="' + (ST.sort.dir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' + label + '</button></th>';
  }
  function secLine(s) {
    var ro = s.rot;
    return IND ? s.fear.listed + ' members · 1M <span class="' + cls(ro.ret['1M']) + '">' + sgnPct(ro.ret['1M']) + '</span>'
      : symA(s.etf, 'etf-a') + ' ' + ro.close.toFixed(2) + ' · 1M <span class="' + cls(ro.ret['1M']) + '">' + sgnPct(ro.ret['1M']) + '</span>';
  }
  function boardHTML() {
    var rows = sortedKeys().map(function (k) {
      var s = S[k], ro = s.rot, fe = s.fear;
      return '<tr data-go="' + k + '">' +
        '<td class="c-sec"><div class="nm">' + esc(s.short) + '</div><div class="ln">' + secLine(s) + '</div></td>' +
        '<td class="c-rot"><div class="r1">' + QUAD(ro.quad) + '<span class="rk">#' + ro.rank + '</span>' + rankMove(s) + '</div><div class="ln"><span class="' + cls(ro.rs63) + '">' + sgnPct(ro.rs63) + '</span> vs ' + U.benchS + ' · 3 mo</div></td>' +
        '<td class="c-fear"><div class="r1"><span class="big num">' + pct(fe.now['1D']) + '</span>' + sparkSVG(fe, 96, 30) + ZONE(fe.zone) + '</div><div class="ln">' + higherThan(fe) + '</div></td>' +
        '<td class="c-br">' + bars(s.br) + '<div class="tg">' + brTag(s.br) + '</div></td>' +
        '<td class="c-gam">' + gamCell(s) + '</td>' +
        '<td class="c-words">' + words(s) + '</td></tr>';
    }).join('');
    var m = MK, nW = KEYS.filter(function (k) { return S[k].br.state === 'WASHOUT'; }).length;
    rows += '<tr class="mkt"><td class="c-sec"><div class="nm">' + esc(m.short) + '</div><div class="ln">' + (IND ? m.fear.listed + ' members' : symA('SPY', 'etf-a') + ' ' + m.close.toFixed(2)) + ' · 1M <span class="' + cls(m.ret['1M']) + '">' + sgnPct(m.ret['1M']) + '</span></div></td>' +
      '<td class="c-rot"><div class="ln">the yardstick</div></td>' +
      '<td class="c-fear"><div class="r1"><span class="big num">' + pct(m.fear.now['1D']) + '</span>' + sparkSVG(m.fear, 96, 30) + ZONE(m.fear.zone) + '</div><div class="ln">' + higherThan(m.fear) + '</div></td>' +
      '<td class="c-br">' + bars(m.br) + '<div class="tg">' + brTag(m.br) + '</div></td>' +
      '<td class="c-gam"><div class="ln"><b>' + pct(m.gm.pos) + '</b> of members long gamma</div><div class="ln2">' + m.gm.n_long + ' of ' + m.gm.n_with_flip + ' with a flip</div></td>' +
      '<td class="c-words">' + nW + ' of ' + KEYS.length + ' ' + U.many + ' washed out; market fear ' + m.fear.zone + ' (' + pct(m.fear.now['1D']) + ').</td></tr>';
    var cards = sortedKeys().map(function (k) {
      var s = S[k], ro = s.rot, fe = s.fear, gx = s.gx;
      return '<div class="scard" data-go="' + k + '"><div class="top1"><div class="nm">' + esc(s.short) + '<span>' + esc(subName(s)) + '</span></div><div class="rk">' + QUAD(ro.quad) + ' <b>#' + ro.rank + '</b> ' + rankMove(s) + '</div></div>' +
        '<div class="grid4"><div class="cell"><div class="k">Fear</div><div class="v"><b class="fearc" style="font-size:18px">' + pct(fe.now['1D']) + '</b> ' + ZONE(fe.zone) + '<br>' + sparkSVG(fe, 120, 26) + '</div></div>' +
        '<div class="cell c-br"><div class="k">Breadth</div>' + bars(s.br) + '<div class="tg" style="margin-top:4px">' + brTag(s.br) + '</div></div>' +
        '<div class="cell"><div class="k">Strength</div><div class="v">1M <span class="' + cls(ro.ret['1M']) + '">' + sgnPct(ro.ret['1M']) + '</span><br><span class="' + cls(ro.rs63) + '">' + sgnPct(ro.rs63) + '</span> vs ' + U.benchS + ' · 3 mo</div></div>' +
        '<div class="cell"><div class="k">Gamma' + (IND && gx ? ' · ' + gx.etf : '') + '</div><div class="v">' + (gx ? gamChip(gx) + (gx.setup ? ' <span class="' + setupCls(gx.setup) + '">' + gx.setup + '</span>' : '') + '<br>king <b class="gold">' + strike(gx.king.strike) + '</b> ' + sgnPct(gx.king.pct_away) + '<br><b>' + pct(s.gm.pos) + '</b> members long'
          : '<b>' + pct(s.gm.pos) + '</b> of members long gamma<br>' + noMapTxt(s)) + '</div></div></div>' +
        '<div class="words">' + words(s) + '</div></div>';
    }).join('');
    var title = IND ? 'Industry group board' : 'Sector board';
    return '<section class="card" id="board"><div class="card-head"><div class="card-title"><h2>' + title + '</h2><p class="sub">Sorted by 3-month strength vs ' + U.bench + '. <span class="wide-only">Click a header to sort, a row to open the ' + U.one + '.</span><span class="narrow-only">Tap a card to open the ' + U.one + '.</span></p></div></div>' +
      '<div class="board-wrap tbl-scroll"><table class="board"><colgroup><col style="width:12%"><col style="width:12.5%"><col style="width:20%"><col style="width:15.5%"><col style="width:18%"><col style="width:22%"></colgroup><thead><tr>' + th('sec', U.One) + th('rot', 'Rotation') + th('fear', 'Fear meter') + th('br', 'Breadth') + th('gam', 'Gamma') + th('words', 'In plain words') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="cards">' + cards + '</div>' +
      '<p class="legend"><span class="lg-i"><span class="lg-sw" style="background:' + C.fear + ';opacity:.7"></span>fear meter, last 3 months · dashed = the ' + U.one + '\'s own alarm line · <span class="gold">●</span> peak above it</span>' +
      '<span class="lg-i"><span class="lg-sw" style="background:' + C.b50 + '"></span>% above 50-day</span><span class="lg-i"><span class="lg-sw" style="background:' + C.b200 + '"></span>% above 200-day · ticks = the washout line and the re-arm line</span></p></section>';
  }


  function setupWords2(st) {
    var order = ['PINNED', 'AT FLIP', 'SUPPORTED', 'CAPPED', 'UNSTABLE'];
    st = st || {};
    var top = order.filter(function (k) { return st[k]; }).sort(function (a, b) { return (st[b] - st[a]) || (order.indexOf(a) - order.indexOf(b)); }).slice(0, 2);
    return '<span class="stw" title="' + order.map(function (k) { return k.toLowerCase() + ' ' + (st[k] || 0); }).join(' · ') + '">' + top.map(function (k, i) {
      return '<span class="' + (i ? 'sm' : 'st1') + '"><b' + (k === 'PINNED' ? ' class="gold"' : k === 'UNSTABLE' ? ' class="amber"' : '') + '>' + st[k] + '</b> ' + k.toLowerCase() + '</span>';
    }).join('') + '</span>';
  }
  function fullHTML() {
    var tf = ['1D', '1W', '2W', '1M'];
    function chipG(gx) { return '<span class="gam ' + (gx.regime === 'long gamma' ? 'gam-long' : 'gam-short') + '">' + gx.regime.replace(' gamma', '') + '</span>'; }
    function row(s, isM) {
      var ro = s.rot, fe = s.fear, br = s.br, gx = s.gx, gm = s.gm, ret = isM ? MK.ret : ro.ret, at = fe.alarm_tf || {};
      var fearTds = tf.map(function (t) { var v = fe.now[t], hi = at[t] != null && v >= at[t]; return '<td class="fv' + (hi ? ' hi' : '') + (t === '1D' ? ' sep' : '') + '" title="alarm ' + n1(at[t]) + '">' + n1(v) + '</td>'; }).join('');
      var state = isM ? (br.recovering ? '<span class="tag tag-rec" title="the market\'s breadth washout has not turned yet' + (br.wash_since ? ' (washout since ' + fd(br.wash_since) + ')' : '') + '">RECOVERING</span>' : '') :
        (br.state === 'WASHOUT' ? '<span class="tag tag-wash">WASHOUT</span>' : br.state === 'BROAD' ? '<span class="tag tag-broad">BROAD</span>' : br.state === 'TURN' ? '<span class="tag tag-turn">TURN</span>' :
          br.recovering ? '<span class="tag tag-rec">RECOVERING</span>' : '<span class="na">normal</span>');
      var et = isM ? (IND ? '' : 'SPY') : (IND ? '' : s.etf);
      var subl = fe.listed + ' members' + (IND ? '' : ' · ' + (isM ? MK.close : ro.close).toFixed(2));
      return '<tr' + (isM ? ' class="mkt"' : ' data-go="' + s.key + '"') + '>' +
        '<td class="l"><span class="nm">' + esc(s.short) + '</span>' + (et ? '<span class="et">' + et + '</span>' : '') + '<span class="sm">' + subl + '</span></td>' +
        '<td class="sep ' + cls(ret['1M']) + '">' + sgnPct(ret['1M']) + '</td><td class="' + cls(ret['3M']) + '">' + sgnPct(ret['3M']) + '</td>' +
        (isM ? '<td class="sep na">yardstick</td><td class="l na">–</td>' :
          '<td class="sep"><b style="color:#fff">#' + ro.rank + '</b> ' + rankMove(s) + '<span class="sm ' + cls(ro.rs63) + '">' + sgnPct(ro.rs63) + '</span></td><td class="l">' + QUAD(ro.quad) + '<span class="sm">daily: ' + ro.quad_daily + '</span></td>') +
        fearTds + '<td>' + (fe.below ? Math.round(fe.pct_below.since2013) + '%' : '<span class="na">–</span>') + '</td><td>' + n1(fe.peak90 && fe.peak90.pct) + '<span class="sm">' + fd(fe.peak90 && fe.peak90.date) + '</span></td>' +
        '<td class="sep">' + n1(br.now.d20) + '</td><td style="color:' + C.b50l + ';font-weight:600">' + n1(br.now.d50) + '</td><td>' + n1(br.now.d100) + '</td><td style="color:' + C.b200l + ';font-weight:600">' + n1(br.now.d200) + '</td>' +
        '<td>' + ord(br.pct_rank_d50 && br.pct_rank_d50.since2013) + '</td><td class="l">' + state + '</td>' +
        (gx ? '<td class="l sep">' + (IND ? '<b class="fx">' + gx.etf + '</b> ' : '') + chipG(gx) + '<span class="sm ' + setupCls(gx.setup) + '">' + (gx.setup || '–') + '</span></td>' +
          '<td class="gold">' + strike(gx.king.strike) + '<span class="sm">' + sgnPct(gx.king.pct_away) + '</span></td><td>' + strike(gx.flip) + '<span class="sm">' + sgnPct(gx.flip_pct_away) + '</span></td><td class="' + cls(gx.net_gex_usd) + '">' + usd(gx.net_gex_usd) + '</td>'
          : '<td class="l sep na">' + (isM ? '–' : s.etf ? s.etf + ' no map yet' : 'no fund') + '</td><td class="na">–</td><td class="na">–</td><td class="na">–</td>') +
        '<td style="color:#fff;font-weight:600">' + pct(gm.pos) + '<span class="sm">' + (gm.pos_chg == null ? gm.n_long + ' of ' + gm.n_with_flip : '<span class="' + cls(gm.pos_chg) + '">' + sgn(gm.pos_chg) + ' pts</span>') + '</span></td>' +
        '<td class="' + cls(gm.net) + '">' + usd(gm.net) + '</td><td class="l">' + setupWords2(gm.setups) + '</td></tr>';
    }
    var mk = { key: 'market', short: MK.short, etf: 'SPY', fear: MK.fear, br: MK.br, gm: MK.gm, gx: null, rot: null };
    var body = sortedKeys().map(function (k) { return row(S[k], false); }).join('') + row(mk, true);
    return '<section class="card" id="board"><div class="card-head"><div class="card-title"><h2>' + (IND ? 'Industry group board' : 'Sector board') + ' · full</h2><p class="sub">Every reading side by side. Purple cell = at or above the ' + U.one + '\'s own alarm line for that candle size. Click a row to open the ' + U.one + '.</p></div></div>' +
      '<div class="tbl-scroll"><table class="full"><thead><tr class="grp"><th class="l"></th><th colspan="2" class="sep">' + (IND ? 'Index' : 'Price') + '</th><th colspan="2" class="g-rot sep">Rotation</th><th colspan="6" class="g-fear sep">Fear meter · % scared</th><th colspan="6" class="g-br sep">Breadth · % above</th><th colspan="7" class="g-gam sep">Gamma · options map</th></tr>' +
      '<tr><th class="l">' + U.One + '</th><th class="sep">1M</th><th>3M</th><th class="sep">Rank</th><th class="l">Corner</th>' +
      '<th class="sep">1D</th><th>1W</th><th>2W</th><th>1M</th><th>Higher<br>than</th><th>90-day<br>peak</th>' +
      '<th class="sep">20d</th><th>50d</th><th>100d</th><th>200d</th><th>50d<br>pctile</th><th class="l">State</th>' +
      '<th class="l sep">Fund</th><th>King</th><th>Flip</th><th>Fund<br>net GEX</th><th>Members<br>long γ</th><th>Members<br>net GEX</th><th class="l">Top member<br>setups</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="legend">Top member setups = the two most common setups among the members\' options maps: pinned = sitting on a + king that expires soon · at flip = right at its flip · supported / capped = a + GEX wall just below / just above · unstable = below its flip (dealers short gamma).</p>' +
      '<p class="legend">Rank = by 3-month return vs ' + U.bench + ' (#1 best; ▲▼ = change since ' + fd(SR.rank_prev_date) + '), sub-line = that return · Higher than = share of days since 2013 with a lower daily fear reading · 50d pctile = percentile of the 50-day reading since 2013 · ' +
      'net GEX = dollars of dealer gamma per 1% move · members long γ sub-line = change in points since the ' + fd(SR.gm_prev_session) + ' maps</p></section>';
  }


  function heatHTML() {
    var order = sortedKeys(), weeks = SR.weeks, n = weeks.length, mode = ST.heat;
    function colour(v) {
      if (v == null) return C.panel;
      if (mode === 'rel') { var a = 0.1 + 0.8 * Math.min(1, Math.abs(v) / 10); return v >= 0 ? 'rgba(38,166,154,' + a.toFixed(2) + ')' : 'rgba(239,83,80,' + a.toFixed(2) + ')'; }
      if (mode === 'fear') return 'rgba(126,87,194,' + (0.05 + 0.9 * Math.min(1, v / 50)).toFixed(2) + ')';
      return 'rgba(57,135,229,' + (0.06 + 0.86 * Math.min(1, Math.max(0, v / 100))).toFixed(2) + ')';
    }
    function val(k, i) { var s = S[k]; return mode === 'rel' ? s.rot.heat[i] : mode === 'fear' ? s.fear.w[i] : s.br.w50[i]; }
    var o = ['<div class="heat' + (IND ? ' ind' : '') + '" style="--n:' + n + '"><div class="hl hcorner"></div>'];
    var pm = -1;
    weeks.forEach(function (w, i) { var m = dt(w).getMonth(), lab = i === n - 1 ? fd(w) : m !== pm ? MON[m] : ''; pm = m; o.push('<div class="hm' + (i === n - 1 ? ' now' : '') + '">' + lab + '</div>'); });
    order.forEach(function (k) {
      var s = S[k];
      o.push('<div class="hl" title="' + esc(s.name) + '"><b>' + esc(s.short) + '</b><span>' + esc(tk(s)) + '</span></div>');
      for (var i = 0; i < n; i++) {
        var v = val(k, i), now = i === n - 1;
        var txt = now && v != null ? (mode === 'rel' ? sgn(v) : n1(v)) : '';
        var dot = mode === 'br' && v != null && LN.wash != null && v <= LN.wash ? '<span class="wdot"></span>' : '';
        o.push('<div class="hc' + (now ? ' now' : '') + '" style="background:' + colour(v) + '" title="' + esc(s.short + ' · week of ' + fd(weeks[i]) + ': ' + (v == null ? 'n/a' : (mode === 'rel' ? sgnPct(v) : pct(v)))) + '">' + txt + dot + '</div>');
      }
    });
    o.push('</div>');
    function ramp(lo, grad, hi) { return '<span class="rampset"><span>' + lo + '</span><span class="ramp" style="background:' + grad + '"></span><span>' + hi + '</span></span>'; }
    var key = mode === 'rel' ? '<span class="hk-cap">4-week return vs ' + U.bench + '</span>' + ramp('−10%', 'linear-gradient(90deg,rgba(239,83,80,.9),rgba(239,83,80,.1) 49%,rgba(38,166,154,.1) 51%,rgba(38,166,154,.9))', '+10%')
      : mode === 'fear' ? '<span class="hk-cap">% of members scared on the weekly candle</span>' + ramp('0', 'linear-gradient(90deg,rgba(126,87,194,.05),rgba(126,87,194,.95))', '50%+')
        : '<span class="hk-cap">% of members above their 50-day on the week\'s last day</span>' + ramp('0', 'linear-gradient(90deg,rgba(57,135,229,.06),rgba(57,135,229,.92))', '100') +
          '<span class="lg-i"><span style="width:7px;height:7px;border-radius:50%;background:' + C.gold + ';display:inline-block"></span>in the washout zone</span>';
    return '<section class="card" id="heat"><div class="card-head"><div class="card-title"><h2>Rotation over time</h2><p class="sub">Last 26 weeks, one column per week. Outlined column = this week (to ' + fd(last(weeks)) + ').</p></div>' +
      '<div class="seg seg-sm" role="group" aria-label="Heat strip colour"><button type="button" data-heat="rel" aria-pressed="' + (mode === 'rel') + '">Return vs ' + U.benchS + '</button><button type="button" data-heat="fear" aria-pressed="' + (mode === 'fear') + '">Fear</button><button type="button" data-heat="br" aria-pressed="' + (mode === 'br') + '">Breadth</button></div></div>' +
      '<div class="heat-wrap">' + o.join('') + '</div><div class="heat-key">' + key + '</div></section>';
  }


  function findPeaks(v, minGap) {
    var n = v.length, out = [], lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), floor = lo + 0.35 * (hi - lo), N = 3, cand = [];
    for (var i = 0; i < n - 1; i++) {
      if (v[i] < floor || v[i] <= 0) continue;
      var ok = true;
      for (var j = Math.max(0, i - N); j <= Math.min(n - 1, i + N) && ok; j++) if (j !== i && (j < i ? v[j] >= v[i] : v[j] > v[i])) ok = false;
      if (ok) cand.push(i);
    }
    cand.sort(function (a, b) { return (v[b] - v[a]) || (b - a); });
    cand.forEach(function (c) { if (out.every(function (o) { return Math.abs(o - c) >= minGap; })) out.push(c); });
    return out;
  }

  function stackSVG(s, W, mapOnly) {
    var gx = s.gx, dates, px;
    if (mapOnly) { dates = gx.king_hist.map(function (r) { return r[0]; }); px = gx.king_hist.map(function (r) { return r[3]; }); }
    else { dates = SR.dates; px = s.rot.px; }
    var n = dates.length, narrow = W < 640, withMap = !!gx && (mapOnly || !IND);
    var L = narrow ? 6 : 10, R = narrow ? 46 : 62, pw = W - L - R;
    var X = function (i) { return L + (n > 1 ? i / (n - 1) : 0.5) * pw; };
    var P = mapOnly ? [{ k: 'px', h: narrow ? 230 : 290 }]
      : [{ k: 'px', h: IND ? (narrow ? 150 : 190) : (narrow ? 220 : 300) }, { k: 'fear', h: narrow ? 100 : 128 }, { k: 'br', h: narrow ? 100 : 128 }, { k: 'rs', h: narrow ? 78 : 96 }];
    var y = 6, gap = 30; P.forEach(function (p, i) { y += (i ? gap : 22); p.top = y; y += p.h; });
    var H = y + 26, o = [], cid = mapOnly ? 'cpm' : 'cpa';
    var ticks = [], lab = [];
    if (n >= 60) { for (var i = 1; i < n; i++) if (dt(dates[i]).getMonth() !== dt(dates[i - 1]).getMonth()) { ticks.push(i); lab.push(MON[dt(dates[i]).getMonth()]); } }
    else { var every = Math.max(1, Math.ceil(n / (narrow ? 4 : 7))); for (i = n - 1; i >= 0; i -= every) { ticks.unshift(i); lab.unshift(fd(dates[i])); } }
    P.forEach(function (p) { o.push('<rect x="' + L + '" y="' + p.top + '" width="' + pw + '" height="' + p.h + '" fill="#191D28" stroke="' + C.line + '"/>'); });
    ticks.forEach(function (i, j) {
      P.forEach(function (p) { o.push('<line x1="' + X(i).toFixed(1) + '" x2="' + X(i).toFixed(1) + '" y1="' + p.top + '" y2="' + (p.top + p.h) + '" stroke="' + C.grid + '"/>'); });
      o.push('<text x="' + Math.min(X(i), L + pw - 14).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" fill="' + C.muted + '" font-size="11.5">' + lab[j] + '</text>');
    });
    function yAxis(p, Y, vals, fmt, avoid) { vals.forEach(function (v) { var yy = Y(v); if (yy < p.top + 4 || yy > p.top + p.h - 2) return; if ((avoid || []).some(function (a) { return Math.abs(a - yy) < 19; })) { o.push('<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="' + C.grid + '" stroke-opacity="0.7"/>'); return; } o.push('<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="' + C.grid + '" stroke-opacity="0.7"/><text x="' + (L + pw + 6) + '" y="' + (yy + 4).toFixed(1) + '" fill="' + C.muted + '" font-size="11">' + fmt(v) + '</text>'); }); }
    function title(p, t, sub) { if (W < 600) sub = ''; o.push('<text x="' + (L + 2) + '" y="' + (p.top - 8) + '" fill="' + C.white + '" font-size="13" font-weight="700">' + t + (sub ? '<tspan fill="' + C.muted + '" font-weight="400" font-size="12">  ' + sub + '</tspan>' : '') + '</text>'); }
    function line(vals, Y, col, w, extra) { var d = ''; vals.forEach(function (v, i) { if (v == null) return; d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }); return d ? '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round" ' + (extra || '') + '/>' : ''; }
    var TQ = [];
    function tag(yy, txt, bg, fg, top, bot) { TQ.push({ y: yy, txt: txt, bg: bg, fg: fg, top: top, bot: bot }); }
    function flushTags() {
      TQ.sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < TQ.length; i++) { TQ[i].y = Math.max(TQ[i].top + 8, Math.min(TQ[i].bot - 8, TQ[i].y)); if (i && TQ[i].y - TQ[i - 1].y < 17) TQ[i].y = TQ[i - 1].y + 17; }
      for (i = TQ.length - 1; i >= 0; i--) { if (TQ[i].y > TQ[i].bot - 8) { TQ[i].y = TQ[i].bot - 8; if (i && TQ[i].y - TQ[i - 1].y < 17) TQ[i - 1].y = TQ[i].y - 17; } }
      TQ.forEach(function (t) { drawTag(t.y, t.txt, t.bg, t.fg); }); TQ = [];
    }
    function drawTag(yy, txt, bg, fg) { o.push('<rect x="' + (L + pw + 1) + '" y="' + (yy - 8).toFixed(1) + '" width="' + (R - 3) + '" height="16" rx="2" fill="' + bg + '"/><text x="' + (L + pw + 5) + '" y="' + (yy + 4).toFixed(1) + '" fill="' + fg + '" font-size="11" font-weight="700">' + txt + '</text>'); }
    function nowDot(cx, cy, bot) { if (bot != null) cy = Math.min(cy, bot - 4.5); o.push('<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="9" fill="' + C.light + '" fill-opacity="0.16" stroke="' + C.light + '" stroke-opacity="0.45"/><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="' + C.nowCore + '" stroke="#fff" stroke-width="1.4"/>'); }
    var di = {}; dates.forEach(function (d, i) { di[d] = i; });
    function fmtPx(v) { return v >= 1000 ? Math.round(v) + '' : v.toFixed(2); }


    var p = P[0], vals = px.filter(function (v) { return v != null; }), lv = [];
    var li = -1; for (var q = n - 1; q >= 0; q--) if (px[q] != null) { li = q; break; }
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (withMap) {
      var spot = gx.spot, near = function (v) { return v != null && Math.abs(v / spot - 1) <= 0.12; };
      lv = [['king', gx.king.strike, C.gold], ['flip', gx.flip, C.flip], ['call wall', gx.call_wall && gx.call_wall.strike, C.text], ['support', gx.put_support && gx.put_support.strike, C.b50l]].filter(function (l) { return near(l[1]); });
      lv.forEach(function (l) { lo = Math.min(lo, l[1]); hi = Math.max(hi, l[1]); });
      gx.king_hist.forEach(function (r) { if (di[r[0]] != null) { lo = Math.min(lo, r[1], r[2] == null ? r[1] : r[2]); hi = Math.max(hi, r[1], r[2] == null ? r[1] : r[2]); } });
    }
    var pad = (hi - lo) * 0.06 || hi * 0.01 || 1; lo -= pad; hi += pad;
    var Y = function (v) { return p.top + p.h - (v - lo) / (hi - lo) * p.h; };
    var st = niceStep(hi - lo, 5), yt = []; for (var v = Math.ceil(lo / st) * st; v <= hi; v += st) yt.push(+v.toFixed(4));
    yAxis(p, Y, yt, function (v) { return strike(v); }, (li >= 0 ? [Y(px[li])] : []).concat(lv.map(function (l) { return Y(l[1]); })));
    o.push('<clipPath id="' + cid + '"><rect x="' + L + '" y="' + p.top + '" width="' + pw + '" height="' + p.h + '"/></clipPath>');
    if (withMap) {
      var bs = gx.by_strike.filter(function (b) { return b[0] >= lo && b[0] <= hi; }), mx = Math.max.apply(null, bs.map(function (b) { return Math.abs(b[1]); }).concat([1]));
      var stepPx = bs.length > 1 ? Math.abs(Y(bs[0][0]) - Y(bs[1][0])) : 10, bh = Math.max(2, Math.min(11, stepPx - 1.5)), BL = pw * 0.15;
      o.push('<g clip-path="url(#' + cid + ')">');
      bs.forEach(function (b) {
        var len = Math.max(1, Math.abs(b[1]) / mx * BL), isK = b[0] === gx.king.strike;
        o.push('<rect x="' + (L + pw - len).toFixed(1) + '" y="' + (Y(b[0]) - bh / 2).toFixed(1) + '" width="' + len.toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="' + (isK ? C.gold : b[1] >= 0 ? C.up : C.down) + '" opacity="' + (isK ? 0.42 : 0.34) + '"/>');
      });
      o.push('</g>');
      if (!narrow) o.push('<text x="' + (L + pw) + '" y="' + (p.top - 8) + '" text-anchor="end" fill="' + C.muted + '" font-size="11.5">bars: net GEX by strike, ' + fd(gx.session) + ' map (right edge)</text>');
      lv.forEach(function (l) {
        var yy = Y(l[1]), dash = l[0] === 'flip' ? '6 4' : l[0] === 'king' ? '' : '2 3';
        o.push('<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="' + l[2] + '" stroke-width="' + (l[0] === 'king' ? 1.3 : 1.1) + '" stroke-opacity="' + (l[0] === 'king' ? 0.75 : 0.7) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>');
      });
      var groups = [];
      lv.forEach(function (l) { var g = groups.filter(function (g) { return Math.abs(g.v - l[1]) < 1e-9; })[0]; if (g) g.names.push(l[0]); else groups.push({ v: l[1], names: [l[0]], col: l[2] }); });
      groups.sort(function (a, b) { return b.v - a.v; });
      var lastY = -1e9;
      groups.forEach(function (g) {
        var yy = Y(g.v) - 4; if (yy - lastY < 13) yy = lastY + 13; lastY = yy;
        var t = g.names.join(' + ') + ' ' + strike(g.v);
        o.push('<text x="' + (L + pw * 0.85 - 8) + '" y="' + yy.toFixed(1) + '" text-anchor="end" ' + halo(g.col, 11.5, 700) + '>' + t + '</text>');
        tag(Y(g.v), strike(g.v), g.names[0] === 'king' ? C.gold : '#363A45', g.names[0] === 'king' ? '#131722' : C.text, p.top, p.top + p.h);
      });

      var hw = mapOnly ? Math.max(2.2, (n > 1 ? pw / (n - 1) : pw) / 2) : 2.2;
      var kd = '', prevI = null, prevK = null, kl = [];
      gx.king_hist.forEach(function (r) {
        var i = di[r[0]]; if (i == null) return;
        var xa = Math.max(L, X(i) - hw), xb = Math.min(L + pw, X(i) + hw), yy = Y(r[1]);
        kd += (prevI === null ? 'M' : 'L') + xa.toFixed(1) + ' ' + yy.toFixed(1) + 'L' + xb.toFixed(1) + ' ' + yy.toFixed(1);
        if (r[2] != null) o.push('<line x1="' + (X(i) - Math.min(hw * 0.7, 6)).toFixed(1) + '" x2="' + (X(i) + Math.min(hw * 0.7, 6)).toFixed(1) + '" y1="' + Y(r[2]).toFixed(1) + '" y2="' + Y(r[2]).toFixed(1) + '" stroke="' + C.flip + '" stroke-width="1.6"/>');
        if (prevK === null || r[1] !== prevK) kl.push([i, r[1]]);
        prevI = i; prevK = r[1];
      });
      o.push('<path d="' + kd + '" fill="none" stroke="' + C.gold + '" stroke-width="2.4" stroke-linejoin="round"/>');
      gx.king_hist.forEach(function (r) { var i = di[r[0]]; if (i != null) o.push('<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(r[1]).toFixed(1) + '" r="2.4" fill="' + C.gold + '" stroke="' + C.bg + '" stroke-width="0.8"/>'); });
      var shownX = -1e9;
      kl.forEach(function (k, j) { if (Math.abs(X(k[0]) - shownX) > textW(strike(k[1]), 11) + 8 && (shownX = X(k[0]))) o.push('<text x="' + Math.max(L + 12, Math.min(X(k[0]), L + pw - 10)).toFixed(1) + '" y="' + (Y(k[1]) - 7).toFixed(1) + '" text-anchor="middle" ' + halo(C.gold, 11, 700) + '>' + strike(k[1]) + '</text>'); });
    }
    o.push(line(px, Y, C.text, 1.5, 'clip-path="url(#' + cid + ')"'));
    if (li >= 0) { nowDot(X(li), Y(px[li])); tag(Y(px[li]), fmtPx(px[li]), C.white, '#131722', p.top, p.top + p.h); }
    flushTags();
    if (mapOnly) title(p, gx.etf + ' · options map, saved sessions', 'gold = king node per session, grey dashes = flip per session');
    else if (IND) title(p, 'Equal-weight index · ' + s.fear.listed + ' members', 'every member weighted the same; the index level is not a price');
    else title(p, s.etf + (gx ? ' · price with its options levels' : ' · price'), gx ? 'gold = king node per session, grey dashes = flip per session' : 'no options map yet for ' + s.etf);
    if (mapOnly) return svgEl(W, H, o.join(''), gx.etf + ' options map: close, king node and flip for each saved session, with net GEX by strike');


    p = P[1];
    var fe = s.fear, fv = fe.d.map(function (v) { return v == null ? 0 : v; }), fmax = Math.min(100, Math.max(fe.alarm * 1.25, Math.max.apply(null, fv) * 1.1, 10));
    var Yf = function (v) { return p.top + p.h - v / fmax * (p.h - 6); };
    yAxis(p, Yf, fmax > 60 ? [0, 25, 50, 75, 100] : fmax > 30 ? [0, 10, 20, 30, 40, 50] : [0, 5, 10, 15, 20, 25, 30], function (v) { return v + '%'; }, [Yf(last(fv))]);
    var fd2 = fv.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Yf(v).toFixed(1); }).join('');
    o.push('<path d="' + fd2 + 'L' + X(n - 1).toFixed(1) + ' ' + Yf(0).toFixed(1) + 'L' + X(0).toFixed(1) + ' ' + Yf(0).toFixed(1) + 'Z" fill="' + C.fear + '" fill-opacity="0.35"/>');
    o.push('<path d="' + fd2 + '" fill="none" stroke="' + C.fear + '" stroke-width="1.4" stroke-linejoin="round"/>');
    var ay = Yf(fe.alarm);
    o.push('<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + ay.toFixed(1) + '" y2="' + ay.toFixed(1) + '" stroke="' + C.muted + '" stroke-dasharray="4 3"/>');
    var at = 'alarm ' + n1(fe.alarm) + '%';
    o.push('<rect x="' + (L + 6) + '" y="' + (ay - 16).toFixed(1) + '" width="' + (textW(at, 11.5) + 6) + '" height="15" fill="' + C.panel + '"/><text x="' + (L + 9) + '" y="' + (ay - 5).toFixed(1) + '" fill="' + C.text + '" font-size="11.5">' + at + '</text>');
    var pk = findPeaks(fv, 7).slice(0, 6);
    pk.forEach(function (i, j) {
      o.push('<circle cx="' + X(i).toFixed(1) + '" cy="' + Yf(fv[i]).toFixed(1) + '" r="3.6" fill="' + C.gold + '" stroke="' + C.bg + '" stroke-width="1.4"/>');
      if (j === 0) { var right = X(i) < L + 150; o.push('<text x="' + (right ? X(i) + 7 : X(i) - 7).toFixed(1) + '" y="' + (Yf(fv[i]) + 4).toFixed(1) + '" text-anchor="' + (right ? 'start' : 'end') + '" ' + halo(C.gold, 12, 700) + '>' + n1(fv[i]) + '% · ' + fd(dates[i]) + '</text>'); }
    });
    nowDot(X(n - 1), Yf(last(fv)), p.top + p.h);
    tag(Yf(last(fv)), n1(last(fv)) + '%', C.fear, '#fff', p.top, p.top + p.h);
    flushTags();
    title(p, 'Fear meter', '% of ' + esc(s.short) + ' members scared each day · dashed = its alarm line · gold = fear peaks');


    p = P[2];
    var br = s.br, Yb = function (v) { return p.top + p.h - v / 100 * (p.h - 4) - 2; };
    yAxis(p, Yb, [0, 20, 40, 60, 80, 100], function (v) { return v + '%'; }, [Yb(last(br.d)[1]), Yb(last(br.d)[3])]);
    [LN.wash, LN.rearm].filter(function (v) { return v != null; }).forEach(function (v) { o.push('<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + Yb(v).toFixed(1) + '" y2="' + Yb(v).toFixed(1) + '" stroke="' + C.faint + '" stroke-dasharray="3 3"/>'); });
    o.push(line(br.d.map(function (r) { return r ? r[3] : null; }), Yb, C.b200, 1.6));
    o.push(line(br.d.map(function (r) { return r ? r[1] : null; }), Yb, C.b50, 1.9));
    (br.washouts || []).forEach(function (d) { var i = di[d]; if (i != null && br.d[i]) o.push('<circle cx="' + X(i).toFixed(1) + '" cy="' + Yb(br.d[i][1]).toFixed(1) + '" r="4" fill="' + C.gold + '" stroke="' + C.bg + '" stroke-width="1.4"/>'); });
    var b50 = last(br.d)[1], b200 = last(br.d)[3];
    tag(Yb(b50), n1(b50) + '%', C.b50, '#fff', p.top, p.top + p.h);
    tag(Yb(b200), n1(b200) + '%', C.b200, '#131722', p.top, p.top + p.h);
    flushTags();
    title(p, 'Breadth', '% of members above their 50-day (blue) and 200-day (orange) average · dashed = the washout and re-arm lines · gold = washout days');


    p = P[3];
    var bm = MK.px, rs = px.map(function (v, i) { return v == null || bm[i] == null ? null : v / bm[i] / (px[0] / bm[0]) * 100; });
    var rv = rs.filter(function (v) { return v != null; });
    var rlo = Math.min.apply(null, rv.concat([100])), rhi = Math.max.apply(null, rv.concat([100])), rp = (rhi - rlo) * 0.12 + 0.2; rlo -= rp; rhi += rp;
    var Yr = function (v) { return p.top + p.h - (v - rlo) / (rhi - rlo) * p.h; }, rst = niceStep(rhi - rlo, 3), rt = [];
    for (v = Math.ceil(rlo / rst) * rst; v <= rhi; v += rst) rt.push(+v.toFixed(3));
    yAxis(p, Yr, rt, function (v) { return (+v.toFixed(1)) + ''; });
    var y100 = Yr(100);
    o.push('<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + y100.toFixed(1) + '" y2="' + y100.toFixed(1) + '" stroke="' + C.muted + '" stroke-dasharray="4 3"/>');
    o.push(line(rs, Yr, C.text, 1.5));
    var vs6 = s.rot.vs['6M'], below = last(rv) < 100;
    o.push('<text x="' + (L + 10) + '" y="' + (below ? p.top + p.h - 10 : p.top + 18) + '" ' + halo(vs6 >= 0 ? C.up : C.down, 12.5, 700) + '>' + sgnPct(vs6) + (narrow ? ' vs ' + U.benchS + ' · 6 months' : ' vs ' + U.bench + ' over 6 months') + '</text>');
    title(p, 'Strength vs ' + U.bench, IND ? 'group index ÷ S&amp;P 500 equal-weight index, start of the window = 100' : s.etf + ' ÷ SPY, start of the window = 100');
    return svgEl(W, H, o.join(''), s.short + ': ' + (IND ? 'equal-weight index' : 'price with options levels') + ', fear meter, breadth and strength vs ' + U.bench.replace('&amp;', '&') + ' over the last 6 months');
  }
  function featuredWhy(s) {
    var why = SR.featured.why || [], fe = s.fear, br = s.br, gx = s.gx, gm = s.gm, ro = s.rot, L = [];
    function has(re) { return why.some(function (w) { return re.test(w); }); }
    var f = has(/fear spike that has fully cleared/) ? 'the fear meter hit <b>' + pct(fe.peak90.pct) + '</b> on ' + fd(fe.peak90.date) + ', back to <b>' + pct(fe.now['1D']) + '</b> now'
      : has(/fear near its own alarm line/) ? '<b>' + pct(fe.now['1D']) + '</b> against its own alarm line of ' + n1(fe.alarm)
        : pct(fe.now['1D']) + ' (' + fe.zone + '), 90-day peak ' + pct(fe.peak90 && fe.peak90.pct) + ' on ' + fd(fe.peak90 && fe.peak90.date);
    L.push(['Fear', f]);
    var b = br.state === 'WASHOUT' ? 'washout' + (br.wash_since ? ' since ' + fd(br.wash_since) : '') + ': ' + pct(br.now.d50) + ' above the 50-day, ' + pct(br.now.d200) + ' above the 200-day'
      : (brTag(br) ? brTag(br) + ' · ' : '') + pct(br.now.d50) + ' above the 50-day' + (br.state === 'TURN' && br.turn_last ? ' (TURN on ' + fd(br.turn_last) + ')' : '');
    if (has(/sharp 20-day bounce/)) b += ', but <b>' + pct(br.now.d20) + '</b> are back above the 20-day';
    L.push(['Breadth', b]);
    var half = KEYS.length / 2, up = ro.quad === 'Improving' || ro.quad === 'Leading', against = (ro.rank > half + 0.5 && up) || (ro.rank < half && !up);
    var r = '#' + ro.rank + ' of ' + KEYS.length + ' by 3-month strength (' + sgnPct(ro.rs63) + ' vs ' + U.bench + '), ' + (against ? 'yet' : 'and') + ' in <b>' + ro.quad + '</b>';
    if (has(/new corner on the rotation map/)) r += ' (new this week, from ' + ro.quad_prev + ')';
    if (has(/strongest momentum of the/)) r += ' with the <b>strongest momentum of all ' + KEYS.length + '</b> (' + last(ro.rrg)[2].toFixed(2) + ')';
    L.push(['Rotation', r]);
    var g = gx ? gx.etf + ' ' + setupWords(gx) + (gx.setup === 'AT FLIP' ? ' (king expiry ' + fd(gx.king.expiry) + ')' : ' (' + fd(gx.king.expiry) + ' expiry, ' + sgnPct(gx.king.pct_away) + ' away)') + ' in <b>' + gx.regime + '</b>' +
        (gx.setup === 'AT FLIP' || gx.setup === 'UNSTABLE' ? '' : ', flip ' + strike(gx.flip))
      : (s.etf ? 'no options map for ' + s.etf + '; ' : 'no fund for this group; ') + pct(gm.pos) + ' of members in long gamma';
    if (has(/members dropping out of long gamma/)) g += '; members in long gamma fell to ' + pct(gm.pos) + ' from ' + pct(gm.pos_prev);
    L.push(['Gamma', g]);
    return '<span class="lbl">' + U.ofday + '</span><ul class="why-list">' + L.map(function (x) { return '<li><b class="wl">' + x[0] + '</b><span>' + x[1] + '</span></li>'; }).join('') + '</ul>';
  }
  function kingStory(gx) {
    var steps = [], prev = null;
    gx.king_hist.forEach(function (r) { if (r[1] !== prev) { steps.push([r[0], r[1]]); prev = r[1]; } });
    var shown = steps.length <= 6 ? steps : steps.slice(-5);
    var tail = (shown.length < steps.length ? 'last ' + shown.length + ' changes: ' : '') + shown.map(function (st) { return '<b class="gold">' + strike(st[1]) + '</b> (' + fd(st[0]) + ')'; }).join(' → ');
    return tail + (gx.king_held_sessions ? ' · held ' + gx.king_held_sessions + ' session' + (gx.king_held_sessions > 1 ? 's' : '') + ' since ' + fd(gx.king_held_since) : '');
  }
  function gxTile(s, gx) {
    return '<div class="tile"><div class="k">Gamma · ' + symA(gx.etf, 'etf-a') + '</div><div class="v" style="font-size:18px">' + gamChip(gx) + (gx.setup ? '<span class="' + setupCls(gx.setup) + '" style="font-size:14px">' + gx.setup + '</span>' : '') + '</div>' +
      '<div class="lv"><span>king</span><b class="gold">' + strike(gx.king.strike) + ' · ' + fd(gx.king.expiry) + ' · ' + sgnPct(gx.king.pct_away) + '</b><span>flip</span><b>' + strike(gx.flip) + ' · ' + sgnPct(gx.flip_pct_away) + '</b>' +
      (gx.call_wall ? '<span>call wall</span><b>' + strike(gx.call_wall.strike) + ' · ' + sgnPct(gx.call_wall.pct_away) + '</b>' : '') +
      '<span>support</span><b>' + (!gx.put_support || Math.abs(gx.put_support.pct_away) > 12 ? 'none near' : strike(gx.put_support.strike) + ' · ' + sgnPct(gx.put_support.pct_away)) + '</b></div>' +
      '<div class="s muted" style="font-size:11.5px;margin-top:4px">% away from the chain close ' + (+gx.spot).toFixed(3).replace(/0$/, '') + staleTxt(gx) + '</div></div>';
  }
  function sectorHTML(k) {
    var s = S[k], ro = s.rot, fe = s.fear, br = s.br, gx = s.gx, gm = s.gm, isF = SR.featured && SR.featured.key === k, N = KEYS.length;
    var etfBit = s.etf ? '<span class="etf">' + (IND ? '<span class="muted" style="font-size:14px">options map </span>' : '') + symA(s.etf, 'etf-a') + oiBtn(s.etf, true) + '</span>' : '';
    var head = '<button type="button" class="back" data-go="">← ' + U.all + '</button>' +
      '<div class="sp-head"><h1>' + esc(s.name) + '</h1>' + etfBit + QUAD(ro.quad) + '</div>' +
      '<div class="why">' + (isF ? featuredWhy(s) : words(s)) + '</div>';
    var t1 = IND ? '<div class="tile"><div class="k">Equal-weight index</div><div class="v num ' + cls(ro.ret['1M']) + '">' + sgnPct(ro.ret['1M']) + '<small>1 month · ' + fe.listed + ' members</small></div><div class="s">3M <span class="' + cls(ro.ret['3M']) + '">' + sgnPct(ro.ret['3M']) + '</span> · 6M <span class="' + cls(ro.ret['6M']) + '">' + sgnPct(ro.ret['6M']) + '</span> · YTD <span class="' + cls(ro.ret.YTD) + '">' + sgnPct(ro.ret.YTD) + '</span></div></div>'
      : '<div class="tile"><div class="k">' + s.etf + ' price</div><div class="v num">' + ro.close.toFixed(2) + '</div><div class="s">1M <span class="' + cls(ro.ret['1M']) + '">' + sgnPct(ro.ret['1M']) + '</span> · 3M <span class="' + cls(ro.ret['3M']) + '">' + sgnPct(ro.ret['3M']) + '</span> · YTD <span class="' + cls(ro.ret.YTD) + '">' + sgnPct(ro.ret.YTD) + '</span></div></div>';
    var t2 = '<div class="tile"><div class="k">Rotation</div><div class="v num">#' + ro.rank + ' <small>of ' + N + '</small> ' + rankMove(s) + '</div><div class="s">' + QUAD(ro.quad) + ' <span class="' + cls(ro.rs63) + '">' + sgnPct(ro.rs63) + '</span> vs ' + U.benchS + ' over 3 months' + (ro.rank_prev != null ? ' · was #' + ro.rank_prev + ' on ' + fd(SR.rank_prev_date) : '') + '</div></div>';
    var t3 = '<div class="tile"><div class="k">Fear meter</div><div class="v num fearc">' + pct(fe.now['1D']) + ' ' + ZONE(fe.zone) + '</div><div class="s">' + fe.below + ' of ' + fe.n + ' scared · peak <b class="gold">' + pct(fe.peak90 && fe.peak90.pct) + '</b> on ' + fd(fe.peak90 && fe.peak90.date) + ' · alarm ' + n1(fe.alarm) + '</div></div>';
    var t4 = '<div class="tile"><div class="k">Breadth</div><div class="v num"><span style="color:' + C.b50l + '">' + pct(br.now.d50) + '</span><small>/</small><span style="color:' + C.b200l + '">' + pct(br.now.d200) + '</span></div><div class="s">above 50-day / 200-day · ' + (brTag(br) || 'no washout') + ' · ' + pct(br.now.d20) + ' above 20-day</div></div>';
    var t5 = gx ? gxTile(s, gx)
      : '<div class="tile"><div class="k">Gamma' + (IND && !s.etf ? ' · members' : '') + '</div><div class="v" style="font-size:18px"><span class="gam gam-none">' + (s.etf ? 'no options map yet for ' + s.etf : 'no fund for this group') + '</span></div><div class="s"><b>' + pct(gm.pos) + '</b> of members in long gamma (' + gm.n_long + ' of ' + gm.n_with_flip + ')</div></div>';
    var tiles = '<div class="sp-tiles">' + t1 + t2 + t3 + t4 + t5 + '</div>';
    var legendLv = '<span class="lg-i"><span class="lg-sw" style="background:' + C.gold + '"></span>king node</span><span class="lg-i"><span style="display:inline-block;width:16px;border-top:1.5px dashed ' + C.flip + '"></span>flip</span>' +
      '<span class="lg-i"><span style="display:inline-block;width:16px;border-top:1.5px dotted ' + C.text + '"></span>call wall</span><span class="lg-i"><span style="display:inline-block;width:16px;border-top:1.5px dotted ' + C.b50l + '"></span>support</span>' +
      '<span class="lg-i"><span class="lg-sw" style="background:' + C.up + ';opacity:.6"></span><span class="lg-sw" style="background:' + C.down + ';opacity:.6"></span>net GEX by strike (+ / −)</span>';
    var chart = '<section class="card"><div class="card-head"><div class="card-title"><h2>Last 6 months</h2><p class="sub">' + fd(SR.dates[0]) + ' – ' + fd(last(SR.dates)) + ' · one time axis for all four panes</p></div></div><div class="stack" id="stack"></div>' +
      '<p class="legend">' + (IND ? '' : legendLv) +
      '<span class="lg-i"><span class="lg-sw" style="background:' + C.fear + ';opacity:.7"></span>fear meter</span><span class="lg-i"><span class="lg-sw" style="background:' + C.b50 + '"></span>50-day</span><span class="lg-i"><span class="lg-sw" style="background:' + C.b200 + '"></span>200-day</span></p></section>';
    var mapCard = IND && gx ? '<section class="card"><div class="card-head"><div class="card-title"><h2>' + symA(gx.etf, 'etf-a') + ' options map</h2><p class="sub">The fund that trades this group: its close, king node and flip on each saved session (' + fd(gx.king_hist[0] && gx.king_hist[0][0]) + ' – ' + fd(gx.session) + '), with net GEX by strike from the ' + fd(gx.session) + ' chain.</p></div></div><div class="stack" id="mapc"></div><p class="legend">' + legendLv + '</p></section>' : '';
    var g1 = gx ? '<div class="tile" style="cursor:default"><div class="k">Options map in words · ' + gx.etf + '</div><div class="s">King path: ' + kingStory(gx) + '</div>' +
      '<div class="s">Dealers are in <b>' + gx.regime + '</b>: the close is ' + (gx.spot > gx.flip ? 'above' : 'below') + ' the ' + strike(gx.flip) + ' flip (' + sgnPct(gx.flip_pct_away) + ' away). Net GEX ' + usd(gx.net_gex_usd) + ' per 1% move.' +
      (gx.air && Math.abs(gx.air.pct_away) <= 12 ? ' Air pocket at ' + strike(gx.air.strike) + ' (' + sgnPct(gx.air.pct_away) + ').' : '') + '</div><div class="s muted">Chain: ' + fd(gx.session) + ' close · open interest from ' + fd(gx.oi_settle) + '</div></div>'
      : '<div class="tile" style="cursor:default"><div class="k">Options map' + (s.etf ? ' · ' + s.etf : '') + '</div><div class="s"><span class="gam gam-none">' + (s.etf ? 'no options map yet' : 'no fund for this group') + '</span></div><div class="s muted">' + (s.etf ? s.etf + ' has no saved option chain yet; ' : '') + 'the members\' maps below still apply.</div></div>';
    var hist = (gm.hist || []).filter(function (r) { return r[1] != null; }), hw = 220, hh = 40, spark = '';
    if (hist.length > 1) {
      var hmin = Math.min.apply(null, hist.map(function (r) { return r[1]; })), hmax = Math.max.apply(null, hist.map(function (r) { return r[1]; }));
      var hY = function (v) { return hh - 3 - (v - Math.min(hmin, 50)) / (Math.max(hmax, 100) - Math.min(hmin, 50)) * (hh - 6); }, hX = function (i) { return 2 + i / (hist.length - 1) * (hw - 8); };
      var hp = hist.map(function (r, i) { return (i ? 'L' : 'M') + hX(i).toFixed(1) + ' ' + hY(r[1]).toFixed(1); }).join('');
      spark = '<svg viewBox="0 0 ' + hw + ' ' + hh + '" width="' + hw + '" height="' + hh + '" aria-hidden="true"><line x1="2" x2="' + (hw - 6) + '" y1="' + hY(50).toFixed(1) + '" y2="' + hY(50).toFixed(1) + '" stroke="' + C.faint + '" stroke-dasharray="3 3"/><path d="' + hp + '" fill="none" stroke="' + C.text + '" stroke-width="1.5"/><circle cx="' + hX(hist.length - 1).toFixed(1) + '" cy="' + hY(last(hist)[1]).toFixed(1) + '" r="3" fill="' + C.nowCore + '" stroke="#fff"/></svg>' +
        '<div class="s muted">' + fd(hist[0][0]) + ' – ' + fd(last(hist)[0]) + ' · dashed = 50%</div>';
    }
    var tkg = gm.top_kings || [], ts = gm.turned_short || [], tl = gm.turned_long || [];
    var g2 = '<div class="tile" style="cursor:default"><div class="k">Members\' gamma</div><div class="v num" style="font-size:24px">' + pct(gm.pos) + '<small>long gamma · ' + gm.n_long + ' of ' + gm.n_with_flip + '</small></div>' + spark +
      (tkg.length ? '<div class="s">Biggest member kings: ' + tkg.map(function (t) { return symA(t.sym) + ' <span class="gold">' + strike(t.strike) + '</span> ' + usd(t.gex_usd); }).join(' · ') + '</div>' : '') +
      (ts.length || tl.length ? '<div class="s">Since ' + fd(SR.gm_prev_session) + ': ' + (tl.length ? 'turned long ' + tl.join(', ') : '') + (tl.length && ts.length ? ' · ' : '') + (ts.length ? 'turned short ' + ts.join(', ') : '') + '</div>' : '') + '</div>';
    var at = fe.alarm_tf || {};
    var g3 = '<div class="tile" style="cursor:default"><div class="k">Fear and breadth on every candle</div><div class="lv">' +
      ['1D', '1W', '2W', '1M'].map(function (t) { var nm = { '1D': 'daily', '1W': 'weekly', '2W': '2-week', '1M': 'monthly' }[t]; return '<span>fear ' + nm + '</span><b class="' + (at[t] != null && fe.now[t] >= at[t] ? 'fearc' : '') + '">' + pct(fe.now[t]) + ' <span class="muted" style="font-weight:400">alarm ' + n1(at[t]) + '</span></b>'; }).join('') +
      '<span>above 20 / 100-day</span><b>' + pct(br.now.d20) + ' / ' + pct(br.now.d100) + '</b><span>50-day percentile</span><b>' + ord(br.pct_rank_d50 && br.pct_rank_d50.since2013) + ' since 2013</b></div></div>';
    var mini = '<div class="tiles mini3' + (gx || s.etf ? '' : ' mini2') + '">' + (gx || s.etf ? g1 : '') + g2 + g3 + '</div>';

    var gmap = {}; (gm.members || []).forEach(function (m) { gmap[m.sym] = m; });
    var order = fe.order || [], mem = br.mem || {}, r1m = br.r1m || {}, inMeter = {}, scSet = {};
    order.forEach(function (x) { inMeter[x] = 1; });
    (fe.scared || []).forEach(function (x) { scSet[x] = 1; });
    var syms = order.concat(Object.keys(mem).filter(function (x) { return !inMeter[x]; }).sort());
    var rows = syms.map(function (sym) {
      var bm = mem[sym], m = gmap[sym], sc = !!scSet[sym], rr = r1m[sym];
      var ebar = !inMeter[sym] ? '<span class="no">short history</span>' : sc ? '' : '<span class="sc-no">not scared</span>';
      var yn = function (b) { return b == null ? '<span class="no">–</span>' : b ? '<span class="yes">yes</span>' : '<span class="no">no</span>'; };
      var gam = m ? (m.regime === 'no flip' || !m.regime ? '<span class="muted">no flip</span>' : m.regime === 'at flip' ? '<span class="gam gam-none" title="the close is right on the flip">at flip</span>' : '<span class="gam ' + (m.regime === 'long gamma' ? 'gam-long' : 'gam-short') + '">' + m.regime.replace(' gamma', '') + '</span>') : '<span class="no">no options map</span>';
      var king = m && m.king_strike != null ? '<span class="gold">' + strike(m.king_strike) + '</span> <span class="muted">' + fd(m.king_expiry) + ' · ' + sgnPct(m.king_pct_away) + '</span>' : '<span class="no">–</span>';
      return '<tr><td class="l"><span class="symw">' + symA(sym) + oiBtn(sym) + '</span></td><td class="' + cls(rr) + '">' + sgnPct(rr) + '</td><td>' + (sc ? '<span class="zone zone-normal" style="margin-right:8px">scared</span>' : '') + ebar + '</td><td class="c20">' + yn(bm && bm[0]) + '</td><td>' + yn(bm && bm[1]) + '</td><td>' + yn(bm && bm[3]) + '</td><td>' + gam + '</td><td>' + king + '</td><td>' + (m && m.setup ? '<span class="' + setupCls(m.setup) + '">' + m.setup + '</span>' : '<span class="no">–</span>') + '</td></tr>';
    }).join('');
    var memT = '<section class="card"><div class="card-head"><div class="card-title"><h2>Members</h2><p class="sub">' + syms.length + ' S&amp;P 500 members, most scared first. Scared = the member counts as scared on the daily candle (the Fear meter page\'s rule); gamma, king node and setup come from each member\'s own options map.</p></div></div>' +
      '<div class="tbl-scroll"><table class="mem"><thead><tr><th class="l">Member</th><th>1M</th><th><span class="t-l">Fear today</span><span class="t-s">Fear</span></th><th class="c20">Above 20-day</th><th><span class="t-l">Above 50-day</span><span class="t-s">50d</span></th><th><span class="t-l">Above 200-day</span><span class="t-s">200d</span></th><th>Gamma</th><th><span class="t-l">King node</span><span class="t-s">King</span></th><th>Setup</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
    return head + tiles + chart + mapCard + '<section class="card" style="border-top:0;margin-top:0;padding-top:0">' + mini + '</section>' + memT;
  }


  function footHTML() {
    var un = RAW.universe || {}, man = un.manual || [], listed = RAW.market.fear.listed;
    var mappedSec = RAW.keys.reduce(function (a, k) { return a + (RAW.sectors[k] && RAW.sectors[k].fear ? RAW.sectors[k].fear.listed : 0); }, 0);
    var I = RAW.families && RAW.families.industries;
    var p1 = '<p><b>Sectors</b> = the 11 GICS sectors of today\'s S&amp;P 500 members, each with its SPDR fund (XLK … XLRE). <b>Industries</b> = the industry groups with at least 12 S&amp;P members' + (I ? ' (' + I.keys.length + ' today)' : '') + '; a group\'s rotation line is the equal-weight index of its members (each member\'s daily return counted the same) against the equal-weight index of all S&amp;P members, with the same rotation-map maths as the sectors. ' +
      '<b>Fear meter</b> = % of the members scared on the daily candle (the same rule as the Fear meter page); its alarm line = a high reading by the ' + 'group\'s own history. ' +
      '<b>Breadth</b> = % of members above their 20/50/100/200-day average; washout = the 50-day line drops to a deeply washed-out level after it had recovered since the previous washout (the Breadth page\'s rule); TURN = breadth climbs back through its turn line after a washout; RECOVERING = after a washout, before the TURN. <b>Rotation</b> = strength against the benchmark (RS-Ratio) and its momentum (RS-Momentum), weekly, 100 = even. ' +
      '<b>Gamma</b> = the dealer options map: king node = the biggest single + strike × expiry, flip = where dealer gamma turns from − to +, long gamma = price above the flip. Group funds: Semiconductors SMH, Software IGV, Banks KRE, Energy XLE, Utilities XLU, Real Estate XLRE, Staples XLP; other groups show their members\' maps only.</p>';
    var mf = RAW.market.fear;
    var p2 = '<p>Counts: ' + listed + ' S&amp;P members, ' + mappedSec + ' of them with a sector' + ((un.unmapped || []).length ? ' (' + un.unmapped.join(', ') + ' not mapped yet, counted in the S&amp;P row only)' : '') +
      (I ? '; ' + I.keys.reduce(function (a, k) { return a + (I.sectors[k].fear ? I.sectors[k].fear.listed : 0); }, 0) + ' in one of the industry groups' : '') + '. Breadth counts every member; the fear meter counts the ' + mf.n + ' with enough price history' + ((mf.short_history || []).length ? ' (' + mf.short_history.join(', ') + ' are too new)' : '') + '.' +
      (man.length ? ' Mapped by hand (new S&amp;P names): ' + man.map(function (m) { var sec = RAW.sectors[m.sector]; return '<b>' + esc(m.sym) + '</b> → ' + esc(sec ? sec.short : m.sector) + (m.group ? ' / ' + esc(m.group) : ''); }).join(', ') + '.' : '') + '</p>';
    var base = bf('fear'), d = [];
    if (base) d.push('fear and breadth from the ' + fdw(base) + ' close' + (bf('breadth') && bf('breadth') !== base ? ' (breadth ' + fdw(bf('breadth')) + ')' : ''));
    d.push('fund prices are raw closes (split-adjusted, not dividend-adjusted)' + (bf('rotation') && bf('rotation') !== base ? ', to ' + fd(bf('rotation')) : ''));
    if (bf('industries') && bf('industries') !== base) d.push('industry groups from the ' + fdw(bf('industries')) + ' close');
    if (bf('gex_etf')) { var oi = oiSettles(); d.push('options maps from ' + fd(bf('gex_etf')) + ' chains' + (oi ? ' with open interest from ' + oi : '')); }
    if (bf('gex_members')) {
      d.push('members\' gamma from their ' + fd(bf('gex_members')) + ' close maps' +
        (RAW.gm_prev_session && RAW.gm_prev_session !== bf('gex_members') ? ', compared with the ' + fd(RAW.gm_prev_session) + ' maps' : ''));
    }
    var p3 = '<p>Data: ' + d.join('; ') + '. The board is rebuilt after each US close; the page checks for new data every 5 minutes.</p>';
    return p1 + p2 + p3;
  }


  var OI = { btn: null };
  function menuEl() {
    var m = $('oimenu');
    if (!m) { m = document.createElement('div'); m.id = 'oimenu'; m.className = 'oimenu'; m.setAttribute('role', 'menu'); m.hidden = true; document.body.appendChild(m); }
    return m;
  }
  function closeMenu() { var m = $('oimenu'); if (m) m.hidden = true; if (OI.btn) OI.btn.setAttribute('aria-expanded', 'false'); OI.btn = null; }
  function openMenu() { }


  function render() {
    if (!RAW) return;
    bind();
    if (ST.s && KEYS.indexOf(ST.s) < 0) ST.s = null;
    closeMenu();
    renderStatus();
    document.body.classList.toggle('is-full', ST.view === 'full' && !ST.s);
    document.title = ST.s ? S[ST.s].name + ' · Sector Rotation' : IND ? 'Industry groups · Sector Rotation' : 'Sector Rotation';
    var app = $('app');
    if (!KEYS.length) app.innerHTML = '<p class="loading">The ' + U.many + ' are still being built. This page checks again every 5 minutes.</p>';
    else if (ST.s) app.innerHTML = sectorHTML(ST.s);
    else app.innerHTML = '<section class="q"><h1>Where is money moving, and which ' + (IND ? 'industries' : 'sectors') + ' are scared?</h1><p class="sub">' +
      (IND ? 'The ' + KEYS.length + ' S&amp;P 500 industry groups side by side: strength against the equal-weight S&amp;P 500, the fear meter, breadth and the options maps of each group.'
        : 'The 11 S&amp;P 500 sectors side by side: strength against the S&amp;P 500, the fear meter, breadth and the options map of each sector.') + '</p>' + tilesHTML() + '</section>' +
      rotationHTML() + (ST.view === 'full' ? fullHTML() : boardHTML()) + heatHTML();
    $('foot').innerHTML = footHTML();
    noBreakHyphens($('app')); noBreakHyphens($('foot'));
    draw();
  }

  function noBreakHyphens(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      return /\S-\S/.test(n.nodeValue) && !n.parentNode.closest('svg,script,style,.nw') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    var list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(function (n) {
      var f = document.createElement('span'), re = /[^\s]*\S-\S[^\s]*/g, t = n.nodeValue, i = 0, m;
      while ((m = re.exec(t))) { if (m.index > i) f.appendChild(document.createTextNode(t.slice(i, m.index))); var sp = document.createElement('span'); sp.className = 'nw'; sp.textContent = m[0]; f.appendChild(sp); i = m.index + m[0].length; }
      if (i < t.length) f.appendChild(document.createTextNode(t.slice(i)));
      n.parentNode.replaceChild(f, n);
    });
  }
  function draw() {
    if (!RAW || !KEYS.length) return;
    var r = $('rrg'); if (r) r.innerHTML = rrgSVG(ST.rrg, Math.round(r.clientWidth || 700));
    var st = $('stack'); if (st && ST.s) st.innerHTML = stackSVG(S[ST.s], Math.round(st.clientWidth - 12 || 1200));
    var mc = $('mapc'); if (mc && ST.s && S[ST.s].gx) mc.innerHTML = stackSVG(S[ST.s], Math.round(mc.clientWidth - 12 || 1200), true);
    document.querySelectorAll('.heat-wrap').forEach(function (h) { h.scrollLeft = h.scrollWidth; });
    if (HOT.k) setHot(HOT.k);
  }

  document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('[data-rk]'); if (t && !HOT.pinned) { HOT.k = t.getAttribute('data-rk'); setHot(HOT.k); } });
  document.addEventListener('mouseout', function (e) { var t = e.target.closest && e.target.closest('[data-rk]'); if (t && !HOT.pinned) { HOT.k = null; setHot(null); } });
  document.addEventListener('click', function (e) {
    var menu = e.target.closest('#oimenu');
    if (menu) { if (e.target.closest('a')) setTimeout(closeMenu, 0); return; }
    var ob = e.target.closest('[data-oi]');
    if (ob) { e.preventDefault(); e.stopPropagation(); openMenu(ob); return; }
    if (OI.btn) closeMenu();
    if (e.target.closest('a[href]:not([data-go])')) return;
    var rk = e.target.closest('[data-rk]');
    if (rk) { var k = rk.getAttribute('data-rk'); if (HOT.pinned && HOT.k === k) { HOT.pinned = false; HOT.k = null; } else { HOT.pinned = true; HOT.k = k; } setHot(HOT.k); return; }
    if (HOT.pinned && e.target.closest('#rrg')) { HOT.pinned = false; HOT.k = null; setHot(null); }
    var t = e.target.closest('[data-f],[data-view],[data-sort],[data-rrg],[data-heat],[data-go]');
    if (!t || t.disabled) return;
    if (t.tagName === 'A') e.preventDefault();
    if (t.dataset.f) {
      var f = t.dataset.f === 'industries' ? 'industries' : 'sectors';
      if (f === ST.f && !ST.s) return;
      ST.f = f; store('sr.f', f); HOT.k = null; HOT.pinned = false;
      if (ST.sort.col !== 'rot' && !SORTS[ST.sort.col]) ST.sort = { col: 'rot', dir: 1 };
      var q0 = new URLSearchParams(location.search); q0.set('f', f); q0.delete('s');
      history.pushState(null, '', location.pathname + '?' + q0.toString());
      readRoute(); render(); return;
    }
    if (t.dataset.view) { ST.view = t.dataset.view; history.replaceState(null, '', urlFor(ST.s)); render(); return; }
    if (t.dataset.sort) { var c = t.dataset.sort; ST.sort = { col: c, dir: ST.sort.col === c ? -ST.sort.dir : 1 }; render(); return; }
    if (t.dataset.rrg) { ST.rrg = t.dataset.rrg; render(); return; }
    if (t.dataset.heat) { ST.heat = t.dataset.heat; render(); return; }
    if (t.dataset.go != null) { if (t.dataset.go === '' && !ST.s) return; go(t.dataset.go || null); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && OI.btn) { var b = OI.btn; closeMenu(); b.focus(); } });
  window.addEventListener('scroll', function () { if (OI.btn && Math.abs(window.scrollY - OI.y) > 40) closeMenu(); }, { passive: true });
  window.addEventListener('popstate', function () { readRoute(); render(); });
  var rt = null, lastW = window.innerWidth;
  window.addEventListener('resize', function () { if (window.innerWidth === lastW) return; lastW = window.innerWidth; closeMenu(); clearTimeout(rt); rt = setTimeout(draw, 120); });
  readRoute(); renderStatus(); poll();
  (function () { var t = document.querySelector('.tabs'), a = t && t.querySelector('[aria-current=page]'); if (a && t.scrollWidth > t.clientWidth) t.scrollLeft = a.offsetLeft + a.offsetWidth - t.clientWidth; })();
})();
