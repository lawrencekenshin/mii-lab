








(function () {
  'use strict';


  var LIVE_URL = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/seeker-data/seeker/seeker.json';
  var LIVE_HOST = 'lawrencekenshin.github.io';
  var POLL_FAST = 5 * 60 * 1000;
  var POLL_SLOW = 30 * 60 * 1000;
  var TICK_MS = 30 * 1000;
  var FETCH_TIMEOUT_MS = 15000;
  var C = { bg: '#131722', panel: '#1E222D', line: '#2A2E39', text: '#D1D4DC', muted: '#8A8E99', white: '#FFFFFF',
            fear: '#3987E5', light: '#8EC0FA', up: '#26A69A', down: '#EF5350', amber: '#F2B04B', gold: '#FFD84D' };
  var FONT = (getComputedStyle(document.documentElement).getPropertyValue('--font') || '').trim() || 'sans-serif';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var NY = 'America/New_York', TPE = 'Asia/Taipei';


  var HOLIDAYS = ['2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03',
    '2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24'];
  var HALF_DAYS = ['2026-11-27', '2026-12-24', '2027-11-26'];
  var CAL_END = '2027-12-31';

  var TIERS = ['AB', 'A', 'B', 'C'];
  var PREVIEW_PAGE = /\/price-seeker-preview\//.test(location.pathname);
  var mqRM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mqRM && mqRM.matches); }


  var SIDES = {
    calls: { key: 'calls', opt: 'call', opts: 'calls', Opts: 'Calls', dir: 'above', rise: 'rise', mv: 'up', gam: 'upside', sign: 1, ext: 'high',
      reach: 'trades at or above', seek: 'upward', other: 'puts', mostly: 'Mostly calls', bet: 'call bet', away: 'below',
      oldPile: 'Often a fund selling calls against shares it owns, not a bet on a jump.', noise: 'often covered calls; likely noise',
      sub: 'Big piles of call options parked far above the price, and whether the price is heading to them.',
      cv1: 'This is a watch list, not a buy signal. A big call pile far above the price is sometimes an informed bet, and often a hedge or a fund selling calls against shares it owns.',
      cv2: 'We assume dealers sold these calls (the usual case). Public data can’t show who holds which side, so every pile is an estimate.',
      king: '', noteC: 'Often covered-call writing', sig: 'buy',
      foot: 'Pile (the king node) = the strike where the biggest call bet in the stock’s option map sits, estimated from public open interest.' },
    puts: { key: 'puts', opt: 'put', opts: 'puts', Opts: 'Puts', dir: 'below', rise: 'fall', mv: 'down', gam: 'downside', sign: -1, ext: 'low',
      reach: 'trades at or below', seek: 'downward', other: 'calls', mostly: 'Mostly puts', bet: 'put bet', away: 'above',
      oldPile: 'Often a fund hedging shares it owns, or someone selling puts for income, not a bet on a drop.', noise: 'often hedges or put selling; likely noise',
      sub: 'Big piles of put options parked far below the price, and whether the price is heading down to them.',
      cv1: 'This is a watch list, not a sell signal. A big put pile far below the price is usually insurance (a fund hedging shares it owns) or someone selling puts for income. A bet on a drop is the minority.',
      cv2: 'We assume dealers sold these puts (the usual case). Public data can’t show who holds which side, so every pile is an estimate.',
      king: ' on the put side', noteC: 'Often hedges or put selling', sig: 'sell',
      foot: 'Pile (the put king node) = the strike where the biggest put bet in the stock’s option map sits, estimated from public open interest.' },
  };
  function SW() {
    var k = (typeof P !== 'undefined' && P && P.side) || (typeof S !== 'undefined' && S && S.side) || 'calls';
    return SIDES[k] || SIDES.calls;
  }
  var CALLOUTS = [], GROUP_TEXT = {};
  function sideCopy() {
    var w = SW();
    CALLOUTS = [
      ['Tier', 'A+B = price moving toward the pile AND ' + w.opts + ' being added. A = price moving toward the pile over the last 20 days. B = ' + w.opts + ' being added at the pile, in size. C = old pile; ' + w.noise + '.'],
      ['Price → pile and To go', 'The pile is the strike where options traders’ biggest ' + w.bet + ' sits (the king node' + w.king + '). To go = how far the price has to ' + w.rise + ' to reach it. The little bar under it: calls (green) against puts (red) across all of the stock’s options, written calls : puts. The line above the list says which: traded on the latest day, or, when you sort by them, traded over the past week or held. Volume counts contracts traded, bought or sold, so it shows activity, not direction.'],
      ['Trip', 'Start line = the price 20 days ago, flag = the pile. Green = how much of the trip is done. Red = the price went the other way.'],
      ['Last 60 days', 'The last 60 daily closes. The dashed amber line is the pile, so the gap you see is the distance left.'],
      ['Odds', 'The options’ own chance that the price trades at the pile at least once by the date shown. Priced by the market, not our forecast, and not tested. Different dates are not like-for-like.'],
      ['New ' + w.opts + ' + Held', w.Opts + ' added at the pile over the last few sessions (changes once a day). Held dots: was this the top strike in each of the last 10 sessions, oldest on the left.'],
      ['$ in ' + w.opts, 'What the ' + w.opts + ' at the pile were worth at the last saved option prices. It is money parked at that strike, bought or sold: public data can’t say which side. “vs daily trading” compares it with a normal day’s trading in the stock; “$ per day left” weights money on a shorter clock more.'],
      ['Business', 'A 0–100 business-quality score from reported growth, cash flow and valuation, scored against large US companies. Green = a high score. Funds, and companies outside the large-company list or without enough reported numbers, have no score (–).']
    ];
    GROUP_TEXT = {
      AB: '★ STRONGEST · price moving toward it AND ' + w.opts + ' being added',
      A: 'A · price moving toward it',
      B: 'B · ' + w.opts + ' being added',
      C: 'C · old piles: big, not growing, price not moving. ' + w.noise.charAt(0).toUpperCase() + w.noise.slice(1)
    };
    if (typeof RANKS !== 'undefined') {
      RANKS.bet.note = 'Ranked by $ in ' + w.opts + ': what the ' + w.opts + ' at the pile were worth at the last saved option prices. The most money parked at a far strike comes first.';
      RANKS.betadv.note = 'Ranked by $ in ' + w.opts + ' compared with a normal day’s trading in the stock. A big bet in a quiet stock ranks high.';
      RANKS.combo.note = 'All three combined: a blend of each name’s standing on $ in ' + w.opts + ', $ per day left and the business score. Names without a business score sit at the bottom.';
    }
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('pageSub', w.sub); set('cv1', w.cv1); set('cv2', w.cv2);
    set('hdBet', '$ in ' + w.opts); set('hdBetS', '$ ' + w.opts + ' · Biz'); set('hdNew', 'New ' + w.opts); set('rbBet', '$ in ' + w.opts);
    set('tierNote', 'Tier C = old piles. ' + w.noteC + '; likely noise. Shown so you can check them.');
    set('cvLine', 'Watch list, not a ' + w.sig + ' signal. Nothing here is tested yet.');
    set('cv3', 'Open interest is the previous session’s settle, so ' + w.opt + ' counts change once a day. Prices are about 15 minutes delayed. When the price moves we recompute which strike is the biggest pile, but new contracts only show up the next day.');
    set('optBet', 'Biggest bet ($ in ' + w.opts + ')');
    set('bxNot', 'Not a ' + w.sig + ' signal'); set('bx1', w.cv1); set('bx2', w.cv2);
    set('bx3', 'Open interest is the previous session’s settle, so ' + w.opt + ' counts change once a day. Prices are about 15 minutes delayed. When the price moves we recompute which strike is the biggest pile, but new contracts only show up the next day.');
    var ibN = document.querySelector('#lhead .c-new .ib'), ibB = document.querySelector('#lhead .c-bet .ib');
    if (ibN) ibN.setAttribute('aria-label', 'About new ' + w.opts + ' and held');
    if (ibB) ibB.setAttribute('aria-label', 'About $ in ' + w.opts);
    set('footPile', w.foot);
    var hn = document.querySelector('#lhead .c-new'); if (hn) hn.title = w.Opts + ' added at this strike over the last 1, 3 or 5 sessions. Changes once a day.';
    document.body.classList.toggle('side-puts', w.key !== 'calls');
  }
  sideCopy();


  var params = new URLSearchParams(location.search);
  var dataUrl = LIVE_URL, previewHost = null;

  function dataHostOk(u) {
    var h = u.hostname;
    if (u.protocol === 'https:' && h === 'raw.githubusercontent.com' && /^\/lawrencekenshin\//.test(u.pathname)) return true;
    if (u.origin === location.origin && /^https?:$/.test(u.protocol)) return true;
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h));
  }
  (function resolveData() {
    var dp = params.get('data');
    if (dp) {
      try {
        var u = new URL(dp, location.href);
        if (dataHostOk(u)) {
          var href = u.href.split('#')[0].split('?')[0];
          if (!/\.json$/i.test(href)) href = href.replace(/\/?$/, '/') + 'seeker.json';
          dataUrl = href; previewHost = u.host; return;
        }
      } catch (e) {  }
    }
    if (location.hostname !== LIVE_HOST && /^https?:$/.test(location.protocol)) {
      dataUrl = location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '') + 'seeker.json';
      previewHost = location.host;
    }
  })();
  var daysBase = dataUrl === LIVE_URL ? 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/seeker-days/days/' : dataUrl.replace(/[^/]*$/, '') + 'days/';
  var nowOverride = null;
  if (params.get('now')) { var t0 = Date.parse(params.get('now')); if (!isNaN(t0)) nowOverride = t0 - Date.now(); }
  function now() { return Date.now() + (nowOverride || 0); }


  var $ = function (id) { return document.getElementById(id); };
  function num(v) { return typeof v === 'number' && isFinite(v); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function span(cls, text) { var s = document.createElement('span'); if (cls) s.className = cls; if (text != null) s.textContent = text; return s; }
  function div(cls) { var d = document.createElement('div'); if (cls) d.className = cls; return d; }
  function para(cls, text) { var p = document.createElement('p'); if (cls) p.className = cls; if (text != null) p.textContent = text; return p; }
  function btn(cls, text) { var b = document.createElement('button'); b.type = 'button'; if (cls) b.className = cls; if (text != null) b.textContent = text; return b; }
  function add(parent) { for (var i = 1; i < arguments.length; i++) { var a = arguments[i]; if (a == null) continue; parent.appendChild(typeof a === 'string' ? document.createTextNode(a) : a); } return parent; }
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) {  } }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function safeId(s) { return String(s).replace(/[^A-Za-z0-9_-]/g, '_'); }


  function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; }
  function isoOf(dn) { return new Date(dn * 864e5).toISOString().slice(0, 10); }
  function dnDate(dn) { return new Date(dn * 864e5); }
  var fmtCache = {};
  function tzParts(epoch, tz) {
    var f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }));
    var o = {};
    f.formatToParts(new Date(epoch)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: o.weekday };
  }
  function tzOffsetMin(epoch, tz) {
    var e = Math.floor(epoch / 6e4) * 6e4, p = tzParts(e, tz);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - e) / 6e4);
  }
  function etEpoch(dn, h, m) {
    var wall = dn * 864e5 + h * 36e5 + m * 6e4, g = wall + 4 * 36e5;
    for (var i = 0; i < 3; i++) g = wall - tzOffsetMin(g, NY) * 6e4;
    return g;
  }
  function etDayNum(epoch) { var p = tzParts(epoch, NY); return Date.UTC(p.y, p.mo - 1, p.d) / 864e5; }
  function curYear() { return tzParts(now(), NY).y; }
  function hm12(epoch, tz) { var p = tzParts(epoch, tz), h = p.h % 12 || 12; return h + ':' + pad2(p.mi) + ' ' + (p.h < 12 ? 'am' : 'pm'); }
  function etHm(epoch) { return hm12(epoch, NY) + ' ET'; }
  function tpeHmWd(epoch) { return hm12(epoch, TPE) + ' ' + tzParts(epoch, TPE).wd + ' Taipei'; }
  function fullTz(epoch, tz, label) { var p = tzParts(epoch, tz); return p.wd + ' ' + MON[p.mo - 1] + ' ' + p.d + ', ' + hm12(epoch, tz) + ' ' + label; }
  function etAndTpe(epoch) { return fullTz(epoch, NY, 'ET') + ' · ' + fullTz(epoch, TPE, 'Taipei'); }
  function ago(ms) {
    var m = Math.round(ms / 6e4);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = m / 60;
    if (h < 36) return (h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)) + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }
  function monD(dn, noYear) { var d = dnDate(dn), s = MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); return noYear || d.getUTCFullYear() === curYear() ? s : s + ', ' + d.getUTCFullYear(); }
  function wmd(dn, noYear) { return WD[dnDate(dn).getUTCDay()] + ' ' + monD(dn, noYear); }
  function dS(s, noYear) { return typeof s === 'string' && s.length >= 10 ? monD(dayNum(s), noYear) : '–'; }
  function wS(s, noYear) { return typeof s === 'string' && s.length >= 10 ? wmd(dayNum(s), noYear) : '–'; }
  var HOL = {}, HALF = {};
  HOLIDAYS.forEach(function (s) { HOL[dayNum(s)] = 1; });
  HALF_DAYS.forEach(function (s) { HALF[dayNum(s)] = 1; });
  function isSession(dn) { var wd = (dn + 4) % 7; return wd >= 1 && wd <= 5 && !HOL[dn]; }
  function nextSession(dn) { var d = dn + 1; while (!isSession(d)) d++; return d; }
  function prevSession(dn) { var d = dn - 1; while (!isSession(d)) d--; return d; }
  function sessionsAfter(a, b) { var n = 0; for (var d = a + 1; d <= b; d++) if (isSession(d)) n++; return n; }
  function nthSessionFrom(dn, k) { var d = dn; while (!isSession(d)) d++; for (var i = 0; i < k; i++) d = nextSession(d); return d; }


  var NF2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var NFS = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  var NFI = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  function px(v) { return num(v) ? NF2.format(v) : '–'; }
  function strike(v) { return num(v) ? NFS.format(v) : '–'; }
  function int(v) { return num(v) ? NFI.format(v) : '–'; }
  function sgnInt(v) { return num(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + NFI.format(Math.abs(v)) : '–'; }

  function r0(f) { return (f < 0 ? -1 : 1) * Math.round(Math.abs(f) * 100 + 1e-7); }
  function r1(f) { return (f < 0 ? -1 : 1) * Math.round(Math.abs(f) * 1000 + 1e-6) / 10; }
  function p0(f) { return num(f) ? r0(f) + '%' : '–'; }
  function a1(f) { return num(f) ? Math.abs(r1(f)).toFixed(1) + '%' : '–'; }
  function sp0(f) { if (!num(f)) return '–'; var r = r0(f); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '%'; }
  function sp1(f) { if (!num(f)) return '–'; var r = r1(f); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1) + '%'; }
  function compactSigned(v) {
    if (!num(v)) return '–';
    var a = Math.abs(v), s = v < 0 ? '−' : '+', t;
    if (a < 1000) t = String(Math.round(a));
    else if (a < 1e4) t = (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    else if (a < 1e6) t = Math.round(a / 1e3) + 'k';
    else t = (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    return s + t;
  }
  function usd(v) {
    if (!num(v)) return '–';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v < 1000) return '$' + Math.round(v);
    return '$' + Math.round(v / 1e3) + 'k';
  }
  function ratioTxt(r) { return !num(r) ? '–' : r >= 10 ? String(Math.round(r)) : String(Math.round(r * 10) / 10); }
  function ownOi(n) { return n[SW().opt + '_oi']; }
  function othOi(n) { return n[SW().other.slice(0, -1) + '_oi']; }
  function sideExt(o) { return o['day_' + SW().ext]; }
  function cpRatioTxt(c, p) {
    if (!c && !p) return '–';
    if (!p) return 'all calls';
    if (!c) return 'all puts';
    return c >= p ? ratioTxt(c / p) + ' : 1' : '1 : ' + ratioTxt(p / c);
  }
  function volDayTxt(n) {
    var a = n.vol_asof || '';
    if (!a) return null;
    var t = a.slice(11, 16), full = t >= (HALF[dayNum(a.slice(0, 10))] ? '12:55' : '15:55');
    return dS(a.slice(0, 10)) + (full ? '' : ' so far (' + t + ' ET)');
  }
  function hasVol(n) { return num(n.vol_c) && num(n.vol_p) && n.vol_c + n.vol_p > 0; }
  function hasWeek(n) { return num(n.wk_c) && num(n.wk_p) && n.wk_c + n.wk_p > 0 && num(n.wk_n) && n.wk_n > 0; }
  function weekTxt(n) { return 'past ' + n.wk_n + (n.wk_n === 1 ? ' session' : ' sessions') + (n.wk_from ? ' (' + dS(n.wk_from) + (n.wk_to && n.wk_to !== n.wk_from ? '–' + dS(n.wk_to) : '') + ')' : ''); }
  function cpWin() { var rk = typeof S !== 'undefined' && RANKS[S.sort]; return rk && rk.cp || 'day'; }
  function cpBar(n, wide) {
    var win = cpWin();
    if (win === 'all') return num(n.chain_call_oi) && num(n.chain_put_oi) ?
      cpBarOf(n.chain_call_oi, n.chain_put_oi, wide, int(n.chain_call_oi) + ' calls and ' + int(n.chain_put_oi) + ' puts held across all of ' + n.sym + '’s options') : null;
    if (win === 'wk') return hasWeek(n) ?
      cpBarOf(n.wk_c, n.wk_p, wide, int(n.wk_c) + ' calls and ' + int(n.wk_p) + ' puts traded, ' + weekTxt(n) + ', all of ' + n.sym + '’s options') : null;
    if (!hasVol(n)) return null;
    var b = cpBarOf(n.vol_c, n.vol_p, wide, '');
    if (b) b.title = int(n.vol_c) + ' calls and ' + int(n.vol_p) + ' puts traded on ' + volDayTxt(n) + ' across all of ' + n.sym + '’s options (calls : puts ' + cpRatioTxt(n.vol_c, n.vol_p) + ')' +
      (hasWeek(n) ? '. ' + weekTxt(n).replace(/^p/, 'P') + ': ' + cpRatioTxt(n.wk_c, n.wk_p) : '');
    if (b) b.setAttribute('aria-label', b.title);
    return b;
  }
  function pileBar(n, wide) {
    if (!num(n.call_oi) || !num(n.put_oi)) return null;
    return cpBarOf(n.call_oi, n.put_oi, wide, int(n.call_oi) + ' calls and ' + int(n.put_oi) + ' puts held at the ' + strike(n.node) + ' pile');
  }
  function cpBarOf(c, p, wide, what) {
    var t = c + p;
    if (!t) return null;
    var w = span('cpb' + (wide ? ' cpb-wide' : ''), null), bar = span('cpb-bar', null);
    var ic = document.createElement('i'); ic.className = 'cpb-c'; ic.style.width = (c / t * 100).toFixed(1) + '%';
    var ip = document.createElement('i'); ip.className = 'cpb-p'; ip.style.width = (p / t * 100).toFixed(1) + '%';
    bar.appendChild(ic); bar.appendChild(ip); w.appendChild(bar);
    if (wide) { w.appendChild(span('cpb-k cpb-kc', 'calls')); w.appendChild(span('cpb-k cpb-kp', 'puts')); }
    else w.appendChild(span('cpb-t', cpRatioTxt(c, p)));
    w.title = what + ' (calls : puts ' + cpRatioTxt(c, p) + ')';
    w.setAttribute('role', 'img'); w.setAttribute('aria-label', w.title);
    return w;
  }
  function cpOf(n) {
    var own = ownOi(n), oth = othOi(n);
    return num(own) && num(oth) ? (oth > 0 ? own / oth : Infinity) : null;
  }
  function oneIn(o) { if (!num(o) || o <= 0) return 'almost none'; return o < 0.5 ? '1 in ' + Math.max(2, Math.round(1 / o)) : Math.round(o * 10) + ' in 10'; }
  function tierName(t) { return t === 'AB' ? 'A+B' : t; }


  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, typeof attrs[k] === 'number' ? +attrs[k].toFixed(2) : attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var HALO = { 'paint-order': 'stroke', stroke: C.panel, 'stroke-width': 3, 'stroke-linejoin': 'round' };
  function tx(parent, x, y, str, attrs, halo) {
    var a = attrs || {}; a.x = x; a.y = y;
    if (!a['font-family']) a['font-family'] = FONT;
    if (halo) for (var k in HALO) a[k] = halo === true ? HALO[k] : (k === 'stroke' ? halo : HALO[k]);
    var t = el('text', a, parent); t.textContent = str;
    return t;
  }
  function svgNode(W, H) { return el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, focusable: 'false' }); }
  function lin(d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / ((d1 - d0) || 1) * (r1 - r0); }; }
  var mctx = document.createElement('canvas').getContext('2d');
  function textW(str, size, weight) { if (!mctx) return str.length * size * 0.55; mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; return mctx.measureText(str).width; }
  function nowDot(g, x, y, r) {
    el('circle', { cx: x, cy: y, r: r + 5, fill: C.light, 'fill-opacity': 0.16, stroke: C.light, 'stroke-opacity': 0.45, 'stroke-width': 1 }, g);
    el('circle', { cx: x, cy: y, r: r + 2, fill: 'none', stroke: C.light, 'stroke-width': 1.5, 'class': 'now-pulse' }, g);
    el('circle', { cx: x, cy: y, r: r, fill: '#EEF5FF', stroke: '#fff', 'stroke-width': 1.4 }, g);
  }
  function nearest(xs, x) {
    if (!xs.length) return null;
    var lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] < x) lo = m; else hi = m; }
    return Math.abs(xs[lo] - x) <= Math.abs(xs[hi] - x) ? lo : hi;
  }
  function idxOnOrAfter(d, dn) { for (var i = 0; i < d.length; i++) if (d[i] >= dn) return i; return d.length - 1; }


  var P = null;
  var lastErr = null, fatal = null, loading = false, lastFetchAt = 0, pollTimer = null, uid = 0, bannerSig = '';
  var loadGen = 0;
  var rowRefs = {}, ghosts = {}, pendingOpen = null, helpBuilt = false, lastFocus = null, pop = null, popBtn = null;
  var GEO = { mode: geoNow(), spk: 0 };
  GEO.spk = spkW();
  var S = { tier: 'all', sort: 'best', q: '', cOpen: false, open: {}, closingAll: false, scoreBy: 'odds', clOpen: {}, hitOpen: {}, list: 'all', side: 'calls' };
  S.failBy = 'all'; S.failSort = 'size'; S.failAll = false; S.failOpen = {};
  S.chaseSym = 'TSM'; S.chaseParked = false;
  var HUNTS = { chase: { opt: 'optChase', left: 'left the hunt' } };
  function isHunt(k) { return !!(k && HUNTS[k]); }
  if (typeof HUNTS === 'object') HUNTS.fresh = { opt: 'optFresh', left: 'left the list' };
  if (typeof HUNTS === 'object') HUNTS.ewz = { opt: 'optEwz', left: 'left the hunt' };
  S.day = null; S.period = null;
  S.netOpen = false; S.netDir = null; S.netAll = false;

  var LISTS = {
    all: { label: 'Whole list', title: 'Every name we keep option chains for: the S&P 500, the Nasdaq-100 and the optionable names on Watchlist 1' },
    spx: { label: 'SPY list', title: 'S&P 500 members' },
    ndx: { label: 'QQQ list', title: 'Nasdaq-100 members' },
    ai: { label: 'AI companies', title: 'AI companies: chips, data-center power and build, AI compute and neoclouds, AI software, robotics. The same AI basket as the AI × KDJ alerts' },
    wl: { label: 'Watchlist 1', title: 'The OBV watchlist: hand-picked stocks and ETFs' }
  };
  function isList(k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(LISTS, k); }
  var RAW = null;
  var STORY = null;

  function geoNow() { var w = window.innerWidth || document.documentElement.clientWidth; return w >= 960 ? 'wide' : w >= 720 ? 'mid' : 'card'; }
  function spkW() { return GEO.mode === 'card' ? ((window.innerWidth || 375) < 360 ? 84 : 112) : 120; }
  function tripW() { return GEO.mode === 'card' ? 112 : 100; }


  function fmtErr(msg) { var e = new Error(msg); e.shown = true; return e; }
  function check(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw fmtErr('the data looked broken');
    if (!(d.version === 3 || (d.version === 2 && Array.isArray(d.idx)))) { var e = fmtErr('data format changed'); e.version = d.version; throw e; }
    if (!Array.isArray(d.names)) throw fmtErr('the data looked broken');
    if (typeof d.generated !== 'string' || isNaN(Date.parse(d.generated))) throw fmtErr('the data looked broken');
  }
  function normSeries(s) {
    if (!s) return null;
    var d = [], c = [];
    if (Array.isArray(s)) {
      s.forEach(function (p) { if (p && typeof p[0] === 'string' && num(p[1])) { d.push(dayNum(p[0])); c.push(p[1]); } });
    } else if (typeof s.start === 'string' && Array.isArray(s.c)) {
      var dn = dayNum(s.start); while (!isSession(dn)) dn++;
      s.c.forEach(function (v, i) {
        if (i) dn = nextSession(dn);
        if (num(v)) { d.push(dn); c.push(v); }
      });
    }
    return c.length >= 2 ? { d: d, c: c } : null;
  }

  function withToday(ser, day, price) {
    if (!ser || typeof day !== 'string' || !num(price)) return ser;
    var dn = dayNum(day), last = ser.d[ser.d.length - 1];
    if (dn === last) ser.c[ser.c.length - 1] = price;
    else if (dn > last) { ser.d.push(dn); ser.c.push(price); if (ser.c.length > 60) { ser.d.shift(); ser.c.shift(); } }
    return ser;
  }

  function viewName(n, pricesDay) {
    n._win = num(n.persist_window) && n.persist_window > 0 ? n.persist_window : (typeof n.held === 'string' ? n.held.length : null);
    n._persist = num(n.persist) ? (n._win ? Math.min(n.persist, n._win) : n.persist) : null;
    n._spk = withToday(normSeries(n.spark), n.price_day || pricesDay, n.price);
    n._trip = n.trip === 'above' ? { above: true } : num(n.trip) ? { t: n.trip } : null;
    var x = Array.isArray(n.nc) ? n.nc : null, ch = n.oi_chg && x ? n.oi_chg[x[0]] : null;
    n._nc = x && Array.isArray(ch) && num(ch[0]) && num(ch[1]) ? { w: String(x[0]), kind: x[1], chg: ch[0], pct: ch[1] } : null;
    return n;
  }
  var CP_MIN = { all: 5000, wk: 3000, day: 1000 };
  function skewOf(c, p, min) { return num(c) && num(p) && c + p >= min ? c / Math.max(p, 1) : null; }
  function prep(d, listKey, side) {
    var sideKey = 'calls', full = d;
    if (side === 'puts' && d.puts && Array.isArray(d.puts.names)) {
      sideKey = 'puts';
      var dp = Object.create(d);
      ['names', 'closing', 'record', 'idx', 'failed', 'oi_since'].forEach(function (k) { dp[k] = d.puts[k]; });
      dp.meta_case = null; d = dp;
    }
    var lists = {};
    if (d.lists && typeof d.lists === 'object') Object.keys(LISTS).forEach(function (k) {
      if (k !== 'all' && Array.isArray(d.lists[k])) { lists[k] = {}; d.lists[k].forEach(function (x) { if (typeof x === 'string') lists[k][x] = 1; }); }
    });
    var lk = listKey && Object.prototype.hasOwnProperty.call(lists, listKey) ? listKey : 'all';
    var inL = function (sym) { return lk === 'all' || !!lists[lk][sym]; };
    var allSyms = {}, listCounts = { all: 0 };
    Object.keys(lists).forEach(function (k) { listCounts[k] = 0; });
    (Array.isArray(d.names) ? d.names : []).forEach(function (n) {
      if (!n || typeof n.sym !== 'string') return;
      allSyms[n.sym] = 1; listCounts.all++;
      Object.keys(lists).forEach(function (k) { if (lists[k][n.sym]) listCounts[k]++; });
    });
    var names = d.names.filter(function (n) { return n && typeof n.sym === 'string' && inL(n.sym); });
    var by = {}, settles = [];
    names.forEach(function (n, i) {
      n._i = i;
      n._cpAll = skewOf(n.chain_call_oi, n.chain_put_oi, CP_MIN.all);
      n._cpWk = skewOf(n.wk_c, n.wk_p, CP_MIN.wk);
      n._cpDay = skewOf(n.vol_c, n.vol_p, CP_MIN.day);
      if (TIERS.indexOf(n.tier) < 0) n.tier = 'C';
      viewName(n, d.prices_day);
      by[n.sym] = n;
      if (n.oi_settle) settles.push(n.oi_settle);
    });

    var cmb = names.filter(function (n) { return num(n.combo); }).sort(function (a, b) { return a.combo - b.combo || a._i - b._i; });
    cmb.forEach(function (n, i) { n._comboRank = i + 1; n._comboN = cmb.length; });
    var closing = (Array.isArray(d.closing) ? d.closing : []).filter(function (c) { return c && typeof c.sym === 'string' && inL(c.sym); });
    closing.forEach(function (c) { c._spk = withToday(normSeries(c.spark), d.prices_day, c.price); c._touched = c.touched === true; });
    var rec = d.record && typeof d.record === 'object' ? d.record : {};
    var bl = rec.by_list && typeof rec.by_list === 'object' ? rec.by_list[lk] : null;
    if (lk !== 'all') {
      var r2 = Object.create(rec);
      ['tracked', 'reached', 'still_open', 'missed'].forEach(function (k) { r2[k] = bl && num(bl[k]) ? bl[k] : null; });
      if (Array.isArray(rec.misses)) r2.misses = rec.misses.filter(function (m) { return m && inL(m.sym); });
      rec = r2;
    }
    var hits = (Array.isArray(rec.hits) ? rec.hits : []).filter(function (h) { return h && typeof h.sym === 'string' && inL(h.sym); })
      .map(function (h, i) { h._i = i; h._path = normSeries(h.path); return h; });
    hits.sort(function (a, b) { return (b.reached || '').localeCompare(a.reached || '') || a._i - b._i; });
    var missed = num(rec.missed) ? rec.missed : (num(rec.tracked) && num(rec.reached) && num(rec.still_open) ? Math.max(0, rec.tracked - rec.reached - rec.still_open) : null);
    var byExp = (bl && Array.isArray(bl.by_exp) ? bl.by_exp : []).filter(function (x) { return x && typeof x.exp === 'string' && num(x.n); });
    var late = bl && Array.isArray(bl.late) && typeof bl.late[0] === 'string' && num(bl.late[1]) ? { cut: bl.late[0], n: bl.late[1] } : null;
    var counts = { AB: 0, A: 0, B: 0, C: 0 };
    names.forEach(function (n) { counts[n.tier]++; });
    var newest = d.oi_settle || (settles.length ? settles.slice().sort().pop() : null), older = {}, nOlder = 0;
    names.forEach(function (n) { if (newest && n.oi_settle && n.oi_settle < newest) { nOlder++; older[n.oi_settle] = (older[n.oi_settle] || 0) + 1; } });
    var idx = null;
    if (Array.isArray(d.idx)) {
      idx = {};
      d.idx.forEach(function (r) { if (Array.isArray(r) && typeof r[0] === 'string') idx[r[0].toUpperCase()] = r; });
    }
    return {
      doc: d, names: names, by: by, counts: counts, closing: closing, idx: idx, newest: newest, nOlder: nOlder,
      olderDates: Object.keys(older).sort(), hits: hits, missed: missed, missList: Array.isArray(rec.misses) ? rec.misses : null,
      byExp: byExp, late: late, board: rec.board && typeof rec.board === 'object' ? rec.board : null, rec: rec, meta: d.meta_case || null,
      oiStart: typeof d.oi_since === 'string' ? d.oi_since : null, gen: Date.parse(d.generated), comboN: cmb.length,
      universeAll: num(d.universe) ? d.universe : null,
      universe: lk === 'all' ? (num(d.universe) ? d.universe : null) : (idx ? Object.keys(idx).filter(inL).length : null),
      failed: (function () {
        var f = d.failed && typeof d.failed === 'object' ? d.failed : null;
        if (!f || !Array.isArray(f.names)) return null;
        return { names: f.names.filter(function (x) { return x && typeof x.sym === 'string' && inL(x.sym); }).map(function (x, i) { x._i = i; x._path = normSeries(x.path); return x; }),
          counts: (f.counts && (f.counts[lk] || f.counts.all)) || null, since: f.since || null };
      })(),
      net: (function () {
        var nb = d.net && Array.isArray(d.net.rows) ? d.net.rows : null;
        if (!nb) return null;
        return nb.filter(function (r) { return Array.isArray(r) && typeof r[0] === 'string' && num(r[2]) && inL(r[0]); })
          .map(function (r) { return { sym: r[0], price: r[1], net: r[2], ck: r[3], cd: r[4], pk: r[5], pd: r[6], score: r[7], onC: !!r[8], onP: !!r[9] }; });
      })(),
      hasPuts: !!(full.puts && Array.isArray(full.puts.names)), putsSince: full.puts ? full.puts.history_since : null,
      chase: (function () {
        var hn = full.chase;
        if (sideKey !== 'calls' || !hn || !Array.isArray(hn.names)) return null;
        var rows = hn.names.filter(function (r) { return r && typeof r.sym === 'string' && num(r.node) && num(r.price) && r.hunt && num(r.hunt.closed) && inL(r.sym); });
        rows.forEach(function (r, i) { r._i = i; if (TIERS.indexOf(r.tier) < 0) r.tier = 'C'; viewName(r, full.prices_day); });
        return { names: rows, checked: num(hn.checked) ? hn.checked : null };
      })(),
      fresh: (function () {
        var fr = full.fresh;
        if (sideKey !== 'calls' || !fr || !Array.isArray(fr.names)) return null;
        var rows = fr.names.filter(function (r) { return r && typeof r.sym === 'string' && num(r.node) && num(r.price) && r.fresh && num(r.fresh.growth) && num(r.fresh.added) && inL(r.sym); });
        rows.forEach(function (r, i) { r._i = i; if (TIERS.indexOf(r.tier) < 0) r.tier = 'C'; viewName(r, full.prices_day); });
        return { names: rows, checked: num(fr.checked) ? fr.checked : null };
      })(),
      ewz: (function () {
        var ez = full.ewz;
        if (sideKey !== 'calls' || !ez || !Array.isArray(ez.names)) return null;
        var rows = ez.names.filter(function (r) { return r && typeof r.sym === 'string' && num(r.node) && num(r.price) && r.ewz && num(r.ewz.added) && inL(r.sym); });
        rows.forEach(function (r, i) { r._i = i; if (TIERS.indexOf(r.tier) < 0) r.tier = 'C'; viewName(r, full.prices_day); });
        return { names: rows, checked: num(ez.checked) ? ez.checked : null };
      })(),
      tsm: sideKey === 'calls' && full.tsm_case && Array.isArray(full.tsm_case.cases) ?
        full.tsm_case.cases.filter(function (c) { return c && typeof c.sym === 'string' && num(c.node) && c.start && c.start.day && num(c.start.dist) && c.now && num(c.now.close); }) : null,
      cpHave: { day: names.some(hasVol), wk: names.some(hasWeek), all: names.some(function (n) { return num(n.chain_call_oi) && num(n.chain_put_oi); }) },
      list: lk, lists: lists, listCounts: listCounts, allSyms: allSyms, side: sideKey
    };
  }


  function status() {
    var t = now(), gen = P.gen, age = t - gen, s = { age: age, gen: gen };
    var pdn = P.doc.prices_day ? dayNum(P.doc.prices_day) : etDayNum(gen);
    if (gen - t > 10 * 6e4) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = 'The data says it was built ' + ago(gen - t).replace(' ago', '') + ' in the future: your clock or the feed clock is off.';
      return s;
    }
    if (P.doc.state === 'LIVE') {
      if (age <= 25 * 6e4) {
        var due = gen + 5 * 6e4;
        s.chip = 'LIVE'; s.cls = 'live';
        s.line = 'Updated ' + ago(age) + '. ' + (due > t ? 'Next update ~' + etHm(due) + '.' : 'Next update due any minute.');
      } else if (age <= 60 * 6e4) {
        s.chip = 'LATE'; s.cls = 'late';
        s.line = 'Expected an update by ' + etHm(gen + 25 * 6e4) + '; the last one is ' + Math.round(age / 6e4) + ' min old. Numbers below are from then.';
      } else {
        s.chip = 'STALE'; s.cls = 'stale';
        s.line = 'No update for ' + ago(age).replace(' ago', '') + ' during what should be a live session.';
      }
      return s;
    }

    var nxt = nextSession(pdn), late = etEpoch(nxt, 9, 55), stale = etEpoch(nxt, 11, 0);
    if (t < late) {
      s.chip = 'CLOSED'; s.cls = 'closed';
      s.line = 'Next price update after the open: ' + wmd(nxt) + ', 9:40 am ET · ' + tpeHmWd(etEpoch(nxt, 9, 40)) + '.';
    } else if (t < stale) {
      s.chip = 'LATE'; s.cls = 'late';
      s.line = 'The market has opened but the first live update hasn’t arrived. Numbers below are the close of ' + monD(pdn) + '.';
    } else {
      s.chip = 'STALE'; s.cls = 'stale';
      s.line = 'These are the closing numbers of ' + wmd(pdn) + ', and newer data should exist by now.';
    }
    return s;
  }
  function segText(parent, parts) { parts.forEach(function (p, i) { if (i) parent.appendChild(document.createTextNode(' · ')); parent.appendChild(span('seg-t', p)); }); }
  function renderStatus() {
    renderBanners();
    if (!P) return;
    var s = status(), d = P.doc;
    var chip = $('chip'); chip.className = 'chip chip-' + s.cls; chip.textContent = s.chip;
    var a = $('asof'); clear(a);
    var pdn = d.prices_day ? dayNum(d.prices_day) : etDayNum(P.gen);
    if (d.state === 'LIVE') {
      var pa = d.prices_asof && !isNaN(Date.parse(d.prices_asof)) ? Date.parse(d.prices_asof) : P.gen - 15 * 6e4;
      segText(a, [wmd(pdn), 'prices ' + etHm(pa) + ' (about 15 min delayed)', tpeHmWd(pa)]);
    } else {
      segText(a, ['Close of ' + wmd(pdn), 'built ' + etHm(P.gen), tpeHmWd(P.gen)]);
    }
    $('statusLine').textContent = s.line;
    var pl = $('pilesLine'); clear(pl);
    var older = '';
    if (P.nOlder) older = ' (' + P.nOlder + (P.nOlder === 1 ? ' name' : ' names') + ' still on ' + (P.olderDates.length === 1 ? dS(P.olderDates[0]) : 'older chains') + ')';
    segText(pl, ['Option piles: ' + (P.newest ? dS(P.newest) : '–') + ' settle' + older, 'open interest changes once a day',
      (P.universeAll != null ? int(P.universeAll) : '–') + ' names checked']);
    savedStatus();
  }
  function banner(kind, title, text, button, inline) {
    var d = document.createElement('div'); d.className = 'banner banner-' + kind;
    if (kind === 'bad') d.setAttribute('role', 'alert');
    if (title) { var b = document.createElement('b'); if (inline) b.className = 'inl'; b.textContent = title; d.appendChild(b); if (inline && text) d.appendChild(document.createTextNode(' ')); }
    if (text) d.appendChild(span('', text));
    if (button) { var x = btn('', button.label); x.addEventListener('click', button.fn); d.appendChild(document.createElement('br')); d.appendChild(x); }
    return d;
  }
  function renderBanners() {
    var list = [];
    if (previewHost) list.push(['info', 'Preview data:', 'numbers come from ' + previewHost + ', not the live feed.', null, true]);
    if (PREVIEW_PAGE) list.push(['info', 'PREVIEW:', 'not linked from the other pages yet.', null, true]);
    if (nowOverride) list.push(['info', 'Clock override:', 'the page is pretending it is ' + etAndTpe(now()) + '.', null, true]);
    if (dayNum(CAL_END) - etDayNum(now()) < 60) list.push(['warn', 'Market calendar ends ' + CAL_END, 'After that the page assumes every weekday is a trading day, so the CLOSED / LATE labels can be wrong on holidays until the calendar is extended.']);
    if (S.day) list.push(['saved', 'You’re looking at ' + wS(S.day) + (dayInfo(S.day) && dayInfo(S.day).rebuilt ? ' (rebuilt)' : '') + ',',
      'as it was at that day’s close: the same list, piles, odds and records' + (dayInfo(S.day) && dayInfo(S.day).rebuilt ? ', rebuilt from the option archive.' : ' the page showed then.'),
      { label: 'Back to today →', fn: function () { setDay(null); } }, true]);
    if (P) {
      var s = status();
      if (s.cls === 'stale' && !S.day) list.push(['bad', 'These numbers are old.', 'Last update ' + etAndTpe(P.gen) + ' (' + ago(s.age) + '). Don’t read them as current.', null, true]);
      if (lastErr) list.push(['warn', 'Refresh failed', 'at ' + hm12(lastErr.at, TPE) + ' ' + tzParts(lastErr.at, TPE).wd + ' Taipei (' + lastErr.msg + '). The numbers below are still from ' + fullTz(P.gen, NY, 'ET') + '.', null, true]);
      var pdn = P.doc.prices_day ? dayNum(P.doc.prices_day) : null;
      if (pdn && P.newest && dayNum(P.newest) < prevSession(pdn))
        list.push(['warn', 'Option piles are from ' + dS(P.newest) + ':', 'today’s open interest hasn’t arrived. Distances and odds still use the latest prices.', null, true]);
    }
    if (fatal) {
      if (fatal.version !== undefined) list.push(['bad', 'The data format changed.', 'This page needs an update.', null, true]);
      else list.push(['bad', 'Couldn’t load the data.', '(' + fatal.msg + ')', { label: 'Try again', fn: function () { load(true); } }, false]);
    }
    var sig = JSON.stringify(list.map(function (b) { return [b[0], b[1], b[2]]; }));
    if (sig === bannerSig) return;
    bannerSig = sig;
    var host = $('banners'); clear(host);
    list.forEach(function (b) { host.appendChild(banner(b[0], b[1], b[2], b[3], b[4])); });
  }


  function tileBtn(k, v, small, note, fn) {
    var b = btn('tile');
    b.appendChild(span('t-k', k));
    var tv = span('t-v', v); if (small) tv.appendChild(add(document.createElement('small'), small)); b.appendChild(tv);
    var tn = span('t-n', ''); (Array.isArray(note) ? note : [note]).forEach(function (x, i) { if (i) tn.appendChild(document.createElement('br')); tn.appendChild(document.createTextNode(x)); });
    b.appendChild(tn);
    if (fn) b.addEventListener('click', fn);
    return b;
  }
  function renderTiles() {
    var T = $('tiles'); clear(T);
    var c = P.counts, n = P.names.length;
    T.appendChild(tileBtn('ON THE LIST', String(n), P.universe != null ? 'of ' + int(P.universe) : null, (c.AB + c.A + c.B) + ' outside the old piles',
      function () { setTier('all'); scrollToEl($('filters')); }));

    var t2 = div('tile'), ab = P.names.filter(function (x) { return x.tier === 'AB'; });
    if (ab.length) t2.className += ' hl';
    t2.appendChild(span('t-k', 'STRONGEST (A+B)'));
    var v2 = span('t-v', null);
    if (ab.length) {
      var w = span('tk-wrap', null);
      ab.slice(0, 4).forEach(function (x) {
        var b = btn('tkb', x.sym); b.setAttribute('aria-label', 'Open ' + x.sym);
        b.addEventListener('click', function () { goToRow(x.sym, true); });
        w.appendChild(b);
      });
      if (ab.length > 4) w.appendChild(span('more-n', '+' + (ab.length - 4)));
      v2.appendChild(w);
    } else { v2.textContent = 'none today'; v2.className += ' tv-none'; }
    t2.appendChild(v2);
    t2.appendChild(span('t-n', ab.length ? 'price moving toward it AND ' + SW().opts + ' being added' : 'no name has both right now'));
    T.appendChild(t2);

    var big = P.names.filter(function (x) { return num(x.prem_usd); }).sort(function (a, b) { return b.prem_usd - a.prem_usd; }).slice(0, 3);
    var t5 = div('tile tile-bets'); t5.appendChild(span('t-k', 'BIGGEST BETS'));
    var v5 = span('t-v', null);
    if (big.length) {
      var w5 = span('tk-wrap', null);
      big.forEach(function (x) {
        var b = btn('tkb', null); b.appendChild(span('', x.sym)); b.appendChild(span('tkm', usd(x.prem_usd)));
        b.setAttribute('aria-label', 'Open ' + x.sym + ', ' + usd(x.prem_usd) + ' in ' + SW().opts);
        b.addEventListener('click', function () { if (S.sort !== 'bet') setSort('bet'); goToRow(x.sym, true); });
        w5.appendChild(b);
      });
      v5.appendChild(w5);
    } else { v5.textContent = '–'; v5.className += ' tv-none'; }
    t5.appendChild(v5);
    var n5 = span('t-n', '$ in ' + SW().opts + ' at the pile · ');
    var rb = btn('linkbtn', 'Rank all'); rb.addEventListener('click', function () { setSort('bet'); scrollToEl($('filters')); });
    n5.appendChild(rb); t5.appendChild(n5);

    var cl = P.closing, touched = cl.filter(function (x) { return x._touched; })[0], note3;
    var nT = cl.filter(function (x) { return x._touched; }).length;
    if (touched) note3 = touched.sym + ' touched ' + strike(touched.node) + ' today' + (nT > 1 ? ' (+' + (nT - 1) + ' more)' : '');
    else if (cl.length) { var nr = cl.slice().sort(function (a, b) { return a.dist - b.dist; })[0]; note3 = 'nearest: ' + nr.sym + ' ' + strike(nr.node) + ', ' + a1(nr.dist) + ' to go'; }
    else note3 = 'none right now';
    T.appendChild(tileBtn('CLOSING IN', String(cl.length), null, note3, function () { scrollToEl($('closing')); }));

    var rec = P.rec, h0 = P.hits[0], early = !P.board || P.board.early !== false;
    T.appendChild(tileBtn('REACHED SO FAR', num(rec.reached) ? String(rec.reached) : '–', num(rec.tracked) ? 'of ' + int(rec.tracked) + ' tracked' : null,
      [h0 ? 'latest: ' + h0.sym + ' ' + strike(h0.node) + ' · ' + dS(h0.reached) : 'latest: none yet', early ? 'too early to grade' : 'graded in the scoreboard'],
      function () { scrollToEl($('hits')); }));
    T.appendChild(t5);
  }


  function initFolds() {

    var cv = sget('ps.caveats'), st = sget('ps.story');
    setCaveat(cv !== 'closed');
    setStory(st !== 'closed');
    if (cv == null) sset('ps.caveats', 'closed');
    if (st == null) sset('ps.story', 'closed');
    $('cvTog').addEventListener('click', function () { var o = this.getAttribute('aria-expanded') !== 'true'; setCaveat(o); sset('ps.caveats', o ? 'open' : 'closed'); });
    $('storyTog').addEventListener('click', function () { var o = this.getAttribute('aria-expanded') !== 'true'; setStory(o); sset('ps.story', o ? 'open' : 'closed'); if (o && P) drawStory(); });
  }
  function setCaveat(open) {
    var b = $('cvTog'); b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.textContent = open ? 'Hide' : 'Read the 4 caveats';
    $('cvList').hidden = !open;
  }
  function setStory(open) {
    var b = $('storyTog'); b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.textContent = open ? 'Hide the story' : 'Show the story';
    $('storyBody').hidden = !open; $('storyFold').hidden = open;
    $('story').classList.toggle('folded', !open);
  }
  function storyIsOpen() { return $('storyTog').getAttribute('aria-expanded') === 'true'; }


  function renderStory() {
    var m = P.meta, sec = $('story');
    if (!m || !num(m.node) || !m.seen || !m.base || !m.spike || !m.peak) { sec.hidden = true; STORY = null; return; }
    sec.hidden = false;
    var sym = m.sym || 'META', node = m.node;
    var closes = normSeries(m.closes);
    function closeAt(dn) { if (!closes) return null; var i = closes.d.indexOf(dn); return i >= 0 ? closes.c[i] : null; }
    var baseDn = dayNum(m.base.day), seenDn = dayNum(m.seen.day), spikeDn = dayNum(m.spike.day), peakDn = dayNum(m.peak.day);
    var qdn = typeof m.q_day === 'string' ? dayNum(m.q_day) : null;
    var qv = num(m.q_close) ? m.q_close : (qdn != null ? closeAt(qdn) : null);
    var nw = m.now && m.now.day && num(m.now.close) ? { dn: dayNum(m.now.day), v: m.now.close } :
      (closes ? { dn: closes.d[closes.d.length - 1], v: closes.c[closes.c.length - 1] } : null);
    var seenDist = num(m.seen.dist) ? m.seen.dist : (num(m.seen.close) ? node / m.seen.close - 1 : null);
    $('storyFold').textContent = 'The ' + sym + ' pattern: a ' + strike(node) + ' call pile ' + p0(seenDist) + ' above the price on ' + dS(m.seen.day) + '; the price touched it ' + dS(m.spike.day) + '.';
    $('storyH').textContent = 'A big call pile ' + p0(seenDist) + ' above ' + sym + '’s price. Then the price went there.';
    var steps = [];
    steps.push({ dn: baseDn, v: m.base.close, place: -1, text: wS(m.base.day) + ' · ' + px(m.base.close) + '. A quiet start: ' + strike(node) + ' is ' + p0(node / m.base.close - 1) +
      ' above the price. (Our records start ' + dS(m.seen.day) + ', so we can’t say when the pile first appeared.)' });
    var t2 = wS(m.seen.day) + ' · ' + px(m.seen.close) + '. Our first day of records, and the ' + strike(node) + ' pile is already there: ' + sym + '’s biggest call pile, ' +
      p0(seenDist) + ' above the price, mostly January 2027 calls.';
    if (num(m.seen_odds)) t2 += ' The options gave it about a ' + p0(m.seen_odds) + ' chance (about ' + oneIn(m.seen_odds) + ') of a touch by its main expiry.';
    steps.push({ dn: seenDn, v: m.seen.close, place: 1, text: t2 });
    steps.push({ dn: qdn, v: qv, place: 1, text: (qdn != null ? wmd(qdn) : '–') + (qv != null ? ' · ' + px(qv) : '') + '. The pile has now held long enough: under this page’s rules, this is the day ' + sym + ' would have joined the list.' });
    var past = Math.round((m.spike.high - node) * 100) / 100;
    steps.push({ dn: spikeDn, v: m.spike.high, place: -1, high: true, text: wS(m.spike.day) + ' · high ' + px(m.spike.high) + '. Touched: ' + sym + ' traded $' + strike(past) + ' past the pile, ' +
      sessionsAfter(seenDn, spikeDn) + ' sessions after we first saw it.' });
    steps.push({ dn: peakDn, v: m.peak.close, place: -1, text: wS(m.peak.day) + ' · ' + px(m.peak.close) + '. It kept going: ' + p0(m.peak.close / m.base.close - 1) + ' above ' + dS(m.base.day) + '.' });
    if (nw) {
      var d6 = node / nw.v - 1;
      steps.push({ dn: nw.dn, v: nw.v, place: 1, now: true, text: 'Now · ' + wmd(nw.dn) + ' · ' + px(nw.v) + '. ' + (nw.v > node ? 'Above the pile.' :
        'Back under the pile, ' + a1(d6) + ' away' + (m.now_close === true ? ': too close to make today’s list.' : '.')) });
    } else {
      steps.push({ dn: P.doc.prices_day ? dayNum(P.doc.prices_day) : null, v: null, place: 1, now: true, text: 'Now · ' + wS(P.doc.prices_day) + '. Today’s ' + sym + ' close isn’t in this data file yet.' });
    }
    STORY = { m: m, sym: sym, node: node, closes: closes, steps: steps, seenDn: seenDn, active: STORY ? STORY.active : null };

    var ol = $('steps'); clear(ol);
    steps.forEach(function (st, i) {
      var li = document.createElement('li'), b = btn('', null);
      b.appendChild(span('sn', String(i + 1))); b.appendChild(span('st-t', st.text));
      b.addEventListener('click', function () { setStep(i); });
      li.appendChild(b); ol.appendChild(li);
      st.btn = b;
    });

    renderChecks();
    if (storyIsOpen()) drawStory();
    setStep(STORY.active, true);
  }
  function renderChecks() {
    var m = P.meta, host = $('checks'); clear(host);
    var ck = {};
    (Array.isArray(m.ck) ? m.ck : []).forEach(function (c) { if (Array.isArray(c) && typeof c[0] === 'string') ck[c[0]] = c; });
    var rows = [
      ['FAR', 'far', 'Far above the price',
        'Far enough that the price needs a real move to get there. A pile 3% away is just where the price already is.'],
      ['BIG', 'big', 'One of the biggest piles on the stock',
        'Gamma measures how strongly option bets react when the price moves. If one strike holds this much of it, it is THE pile on that stock, not one of many.'],
      ['STAYS PUT', 'persist', 'The top pile in most recent sessions',
        'A pile that is there one day and gone the next is noise. One that sits there for weeks is a position somebody is holding.'],
      ['MOSTLY CALLS', 'calls', 'Mostly calls at that strike',
        'Calls pay if the price goes up. A strike with lots of puts too is usually a hedged trade, not a one-way bet.'],
      ['REACHABLE', 'reach', 'Within reach by its main expiry',
        'A typical move is how far the options expect the price to swing by that date. 20% away with four months left is reachable; 20% away with one week left isn’t.']
    ];
    rows.forEach(function (r, i) {
      var c = ck[r[1]] || [], val = typeof c[1] === 'string' ? c[1] : null;
      var t = div('ck'), k = div('ck-k'), id = 'ckx' + i;
      k.appendChild(span('', r[0]));
      var ib = btn('ib', 'i'); ib.setAttribute('aria-expanded', 'false'); ib.setAttribute('aria-controls', id); ib.setAttribute('aria-label', 'What ' + r[0] + ' means');
      k.appendChild(ib); t.appendChild(k);
      t.appendChild(div('ck-r')).textContent = r[2];
      var v = div('ck-v');
      if (val == null) { v.textContent = '–'; v.title = 'Not in this data file yet'; }
      else { v.textContent = val + ' '; if (c[2] === true) v.appendChild(span('ok', '✓')); }
      t.appendChild(v);
      var x = para('ck-x', r[3]); x.id = id; x.hidden = true; t.appendChild(x);
      ib.addEventListener('click', function () { var o = ib.getAttribute('aria-expanded') !== 'true'; ib.setAttribute('aria-expanded', o ? 'true' : 'false'); x.hidden = !o; });
      host.appendChild(t);
    });
  }
  function storyRead(dn, v, isHigh) {
    var ro = $('storyRo'); clear(ro);
    if (dn == null) { ro.textContent = 'Tap a step, or touch the chart, to read a day.'; return; }
    ro.appendChild(span('d', wmd(dn)));
    if (v == null) return;
    ro.appendChild(document.createTextNode(' · ' + STORY.sym + ' ' + (isHigh ? 'high ' : '') + px(v)));
    if (dn >= STORY.seenDn) {
      var x = STORY.node / v - 1;
      ro.appendChild(document.createTextNode(' · pile ' + strike(STORY.node) + ' is ' + a1(x) + (x >= 0 ? ' above' : ' below')));
    }
  }
  function setStep(i, quiet) {
    if (!STORY) return;
    STORY.active = i;
    STORY.steps.forEach(function (st, k) { if (st.btn) { if (k === i) st.btn.setAttribute('aria-current', 'step'); else st.btn.removeAttribute('aria-current'); } });
    if (STORY.mark) STORY.mark(i == null ? null : STORY.steps[i]);
    if (i == null) storyRead(null);
    else { var st = STORY.steps[i]; storyRead(st.dn, st.v, st.high); }
    if (!quiet && i != null && GEO.mode !== 'card') {  }
  }
  function drawStory() {
    if (!STORY) return;
    var h = $('storyChart'); clear(h);
    var W = Math.max(280, Math.round(h.clientWidth || 300)), H = W < 520 ? 200 : 240;
    var m = STORY.m, steps = STORY.steps, closes = STORY.closes, node = STORY.node;
    var L = 8, Rr = 10, T = 32, B = 22, pw = W - L - Rr, ph = H - T - B;

    var first = closes ? closes.d[0] : (function () { var d = steps[0].dn; for (var i = 0; i < 4; i++) d = prevSession(d); return d; })();
    var last = closes ? closes.d[closes.d.length - 1] : first;
    steps.forEach(function (st) { if (st.dn != null && st.dn > last) last = st.dn; });
    var SS = []; for (var d = first; d <= last; d++) if (isSession(d)) SS.push(d);
    if (SS.length < 2) SS = [first, last + 1];
    function X(dn) { var i = nearest(SS, dn); return L + (i / (SS.length - 1)) * pw; }
    var vals = [m.base.close, m.peak.close, node, m.spike.high];
    if (closes) vals = vals.concat(closes.c);
    steps.forEach(function (st) { if (num(st.v)) vals.push(st.v); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.04; lo -= pd; hi += pd;
    var Y = lin(lo, hi, T + ph, T);
    var s = svgNode(W, H); h.appendChild(s);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', STORY.sym + ' chart in 6 steps. ' + steps.map(function (st, i) { return (i + 1) + ': ' + st.text; }).join(' '));
    var xSeen = X(STORY.seenDn), ySeen = Y(m.seen.close), yNode = Y(node);

    el('line', { x1: xSeen, x2: xSeen, y1: T - 6, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '1 3' }, s);
    tx(s, xSeen + 4, T + ph - 4, 'our records start', { fill: C.muted, 'font-size': 10.5 }, C.bg);

    el('line', { x1: xSeen, x2: L + pw, y1: yNode, y2: yNode, stroke: C.amber, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, s);
    var lab = strike(node) + ' pile (Jan 2027 calls)';
    if (xSeen - 8 - textW(lab, 11, 700) < L) lab = strike(node) + ' pile';
    tx(s, xSeen - 6, yNode + 4, lab, { fill: C.amber, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end' }, C.bg);

    el('path', { d: 'M' + (xSeen - 4) + ' ' + ySeen + 'H' + xSeen + 'V' + yNode + 'H' + (xSeen - 4), fill: 'none', stroke: C.amber, 'stroke-width': 1.6 }, s);
    var pct = num(m.seen.dist) ? m.seen.dist : node / m.seen.close - 1;
    tx(s, xSeen - 7, (ySeen + yNode) / 2 + 4, '+' + Math.round(pct * 100) + '%', { fill: C.amber, 'font-size': 12, 'font-weight': 700, 'text-anchor': 'end' }, C.bg);

    var xs = [], pts = [];
    if (closes) {
      var dl = '';
      closes.d.forEach(function (dn, i) { var x = X(dn), y = Y(closes.c[i]); dl += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); xs.push(x); pts.push({ dn: dn, v: closes.c[i] }); });
      el('path', { d: dl, fill: 'none', stroke: C.light, 'stroke-width': 2, 'stroke-linejoin': 'round' }, s);
    } else {
      steps.forEach(function (st) { if (st.dn != null && num(st.v)) { xs.push(X(st.dn)); pts.push({ dn: st.dn, v: st.v, high: st.high }); } });
      var ord = xs.map(function (x, i) { return i; }).sort(function (a, b) { return xs[a] - xs[b]; });
      xs = ord.map(function (i) { return xs[i]; }); pts = ord.map(function (i) { return pts[i]; });
      pts.forEach(function (p) { el('circle', { cx: X(p.dn), cy: Y(p.v), r: 2.5, fill: C.light }, s); });
    }

    el('circle', { cx: X(dayNum(m.spike.day)), cy: Y(m.spike.high), r: 4.5, fill: C.gold, stroke: C.bg, 'stroke-width': 1.6 }, s);

    var labs = [{ x: L, t: monD(first, true), a: 'start' }, { x: xSeen, t: monD(STORY.seenDn, true), a: 'middle' },
      { x: X(dayNum(m.spike.day)), t: monD(dayNum(m.spike.day), true), a: 'middle' }, { x: L + pw, t: monD(last, true), a: 'end' }];
    var kept = [];
    [0, 3, 1, 2].forEach(function (k) {
      var o = labs[k], w = textW(o.t, 11), x0 = o.a === 'start' ? o.x : o.a === 'end' ? o.x - w : o.x - w / 2;
      if (kept.some(function (q) { return x0 < q.x1 + 8 && x0 + w + 8 > q.x0; })) return;
      kept.push({ x0: x0, x1: x0 + w }); tx(s, o.x, H - 6, o.t, { fill: C.muted, 'font-size': 11, 'text-anchor': o.a });
    });

    var cross = el('g', { 'pointer-events': 'none' }, s);
    var marks = el('g', {}, s), circles = [];
    steps.forEach(function (st, i) {
      if (st.dn == null || !num(st.v)) { circles.push(null); return; }
      var x = X(st.dn), y = Y(st.v), cy = y + st.place * 18;
      if (cy - 11 < 2) cy = y + 18;
      if (cy + 11 > T + ph + 4) cy = y - 18;
      if (st.now) nowDot(marks, x, y, 3.5);
      var g = el('g', { 'class': 'stp', cursor: 'pointer' }, marks);
      el('line', { x1: x, x2: x, y1: y + st.place * 4, y2: cy - st.place * 11, stroke: C.light, 'stroke-width': 1, 'stroke-opacity': 0.5 }, g);
      var c = el('circle', { cx: x, cy: cy, r: 11, fill: C.bg, stroke: C.light, 'stroke-width': 1.5 }, g);
      var t = tx(g, x, cy + 4, String(i + 1), { fill: C.light, 'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'middle' });
      el('circle', { cx: x, cy: cy, r: 22, fill: 'transparent' }, g);
      g.addEventListener('click', function (e) { e.stopPropagation(); setStep(i); });
      circles.push({ c: c, t: t });
    });
    STORY.mark = function (st) {
      clear(cross);
      circles.forEach(function (o, k) { if (!o) return; var on = STORY.steps[k] === st; o.c.setAttribute('fill', on ? C.fear : C.bg); o.c.setAttribute('stroke', on ? C.fear : C.light); o.t.setAttribute('fill', on ? '#fff' : C.light); });
      if (st && st.dn != null) { var x = X(st.dn); el('line', { x1: x, x2: x, y1: T - 6, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross); }
    };
    attachReader(h, {
      xs: xs,
      show: function (i) {
        var p = pts[i]; clear(cross);
        var x = xs[i]; el('line', { x1: x, x2: x, y1: T - 6, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross);
        el('circle', { cx: x, cy: Y(p.v), r: 3.5, fill: '#fff', stroke: C.bg, 'stroke-width': 1.2 }, cross);
        storyRead(p.dn, p.v, p.high);
      },
      rest: function () { setStep(STORY.active, true); }
    });
    if (STORY.active != null) STORY.mark(steps[STORY.active]);
    if (!closes) h.appendChild(para('cap', 'Key days only: the daily line arrives with the next version of the data file.'));
  }


  var CHASE = null;
  var MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function chaseIsOpen() { return $('chaseTog').getAttribute('aria-expanded') === 'true'; }
  function setChaseFold(open) {
    var b = $('chaseTog'); b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.textContent = open ? 'Hide the story' : 'Show the story';
    $('chaseBody').hidden = !open; $('chaseFold').hidden = open;
    $('chase').classList.toggle('folded', !open);
  }
  function initChaseFold() {
    var st = sget('ps.chase');
    setChaseFold(st !== 'closed');
    if (st == null) sset('ps.chase', 'closed');
    $('chaseTog').addEventListener('click', function () { var o = this.getAttribute('aria-expanded') !== 'true'; setChaseFold(o); sset('ps.chase', o ? 'open' : 'closed'); if (o && P) drawChase(); });
    $('chaseHunt').addEventListener('click', function () {
      setSort('chase');
      var f = $('filters'); if (f && f.scrollIntoView) f.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    });
  }
  function inHunt(sym, kind) {
    kind = kind || S.sort;
    return !!(P && P.side === 'calls' && isHunt(kind) && P[kind] && P[kind].names.some(function (n) { return n.sym === sym; }));
  }
  function huntFor(sym) {
    if (isHunt(S.sort) && inHunt(sym, S.sort)) return S.sort;
    if (P && P.by[sym]) return null;
    var ks = Object.keys(HUNTS).filter(function (k) { return inHunt(sym, k); });
    return ks.length ? ks[0] : null;
  }
  function goToHuntRow(sym, kind) {
    kind = isHunt(kind) ? kind : 'chase';
    if (S.sort !== kind) { S.sort = kind; S.chaseParked = false; sset('ps.sort', kind); }
    if (S.q && sym.indexOf(S.q.trim().toUpperCase()) !== 0) { S.q = ''; $('q').value = ''; }
    renderCounts(); renderList();
    var r = rowRefs[sym]; if (!r) return false;
    if (!S.open[sym]) openRow(r, true); else setHash(sym);
    scrollToEl(r.art); flashRow(r);
    return true;
  }
  function huntUpdate(np, old) {
    var hb = {}, ob = {}, kind = S.sort;
    (np[kind] ? np[kind].names : []).forEach(function (n) { hb[n.sym] = n; });
    (old && old[kind] ? old[kind].names : []).forEach(function (n) { ob[n.sym] = 1; });
    var nNew = Object.keys(hb).filter(function (k) { return !ob[k]; }).length, nLeft = 0;
    Object.keys(rowRefs).forEach(function (sym) { if (rowRefs[sym].n._srch) return; if (hb[sym]) updateRow(rowRefs[sym], hb[sym]); else nLeft++; });
    renderChaseOpt(); renderChase(); renderListBar(); renderTiles(); renderCounts(); renderClosing(); renderHits(); renderScore(); renderRules(); renderFoot(); renderStatus();
    if (typeof renderNet === 'function') renderNet();
    if (typeof renderFailed === 'function') renderFailed();
    if (nNew || nLeft) {
      var b = $('updateBar'); clear(b); b.hidden = false;
      b.appendChild(span('', 'Updated ' + hm12(np.gen, NY) + ' ET · ' + nNew + ' new · ' + nLeft + ' ' + HUNTS[kind].left));
      var x = btn('btn', 'Re-sort'); x.addEventListener('click', function () { b.hidden = true; setStick(); renderList(); }); b.appendChild(x);
      setStick();
    }
  }
  function leaveHunt() { if (isHunt(S.sort)) { S.sort = 'best'; S.chaseParked = false; sset('ps.sort', 'best'); return true; } return false; }
  function closeOn(ser, dn) {
    if (!ser || dn == null) return null;
    var v = null; for (var i = 0; i < ser.d.length && ser.d[i] <= dn; i++) v = ser.c[i];
    return v;
  }
  function pileOn(c, dn) {
    var prev = null, next = null;
    (c.piles || []).forEach(function (p) { var d = dayNum(p[0]); if (d <= dn) prev = p; else if (!next) next = p; });
    if (!prev) return null;
    return dayNum(prev[0]) === dn || !next || next[1] === prev[1] ? prev[1] : null;
  }
  function chgTxt(ch) { return Math.round(Math.abs(ch) * 100) === 0 ? '0%' : (ch >= 0 ? '+' : '−') + p0(Math.abs(ch)); }
  function expMonth(s) { return typeof s === 'string' && s.length >= 10 ? MONTH_FULL[+s.slice(5, 7) - 1] : null; }
  function startText(c) {
    var st = c.start, k = strike(c.node), t;
    if (c.since_records) t = 'Already ' + c.sym + '’s top call pile when our records start';
    else if (c.unrecorded > 0) t = 'Between ' + dS(c.prev_day) + ' and ' + dS(st.day) + ' (no record in between) ' + k + ' becomes the top call pile';
    else t = k + ' becomes the top call pile';
    t += ', ' + p0(st.dist) + ' above the price' + (c.unrecorded > 0 ? ' on ' + dS(st.day) : '') + '.';
    if (c.opex) t += ' It is the week the ' + dS(c.opex) + ' options expire: near-term piles drop out of the map, so ' + k +
      (expMonth(c.main_exp) ? ', mostly ' + expMonth(c.main_exp) + ' calls,' : '') + ' was most likely there already rather than a new bet.';
    return t;
  }
  function pairText(c, o) {
    var who = c.sym === 'TSM' && o.sym === 'EWT' ? 'EWT, the Taiwan fund whose biggest holding is TSMC,' : c.sym === 'EWT' && o.sym === 'TSM' ? 'TSM (TSMC is the fund’s biggest holding)' : o.sym;
    var od = dayNum(o.start.day), cd = dayNum(c.start.day), exact = !(c.unrecorded > 0) && !(o.unrecorded > 0);
    var when = !exact ? (od >= cd ? ' shows the same pattern' : ' showed the same pattern') + ' by ' + dS(o.start.day) :
      od === cd ? ' does the same the same day' : od > cd ? ' does the same ' + sessionsAfter(cd, od) + (sessionsAfter(cd, od) === 1 ? ' session' : ' sessions') + ' later' :
      ' did the same ' + sessionsAfter(od, cd) + (sessionsAfter(od, cd) === 1 ? ' session' : ' sessions') + ' earlier';
    return who + when + ': ' + strike(o.node) + ' became its top call pile, ' + p0(o.start.dist) + ' above the price. Tap ' + o.sym + ' above to see it.';
  }
  function renderChaseOpt() {
    var calls = !!(P && P.side === 'calls');
    Object.keys(HUNTS).forEach(function (k) {
      var o = document.getElementById(HUNTS[k].opt), have = calls && !!P[k];
      if (o) { o.hidden = !have; o.disabled = !have; }
    });
    var pk = S.chaseParked === true ? 'chase' : S.chaseParked;
    if (isHunt(S.sort) && !(calls && P[S.sort])) { S.chaseParked = S.sort; S.sort = 'best'; }
    else if (isHunt(pk) && calls && P[pk]) { S.chaseParked = false; if (S.sort === 'best') S.sort = pk; }
  }
  function renderChase() {
    var sec = $('chase'), cs = P && P.tsm ? P.tsm : [];
    if (!cs.length) { sec.hidden = true; CHASE = null; return; }
    sec.hidden = false;
    var c = cs.filter(function (x) { return x.sym === S.chaseSym; })[0] || cs[0], lead = c === cs[0];
    S.chaseSym = c.sym;
    var seg = $('chaseSeg');
    if (seg.getAttribute('data-syms') !== cs.map(function (x) { return x.sym; }).join(',')) {
      clear(seg); seg.setAttribute('data-syms', cs.map(function (x) { return x.sym; }).join(','));
      cs.forEach(function (x) {
        var b = btn('', x.sym); b.setAttribute('data-sym', x.sym);
        b.addEventListener('click', function () { if (S.chaseSym === x.sym) return; S.chaseSym = x.sym; CHASE = null; renderChase(); });
        seg.appendChild(b);
      });
    }
    seg.hidden = cs.length < 2;
    Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sym') === c.sym ? 'true' : 'false'); });
    var o = cs.filter(function (x) { return x.sym !== c.sym; })[0] || null;
    var node = c.node, st0 = c.start, nw = c.now, closes = normSeries(c.closes), sdn = dayNum(st0.day);
    $('chaseFold').textContent = 'The ' + c.sym + ' pattern: a call pile ' + p0(st0.dist) + ' above the price became ' + c.sym + '’s top pile' + (c.unrecorded > 0 ? ' by ' : ' on ') + dS(st0.day) +
      (c.touch ? '; the price touched it ' + dS(c.touch.day) + '.' : '; the price has been closing the gap since.');
    $('chaseH').textContent = 'A big call pile ' + p0(st0.dist) + ' above ' + c.sym + '’s price became its top pile. ' + (c.touch ? 'The price went after it, and got there.' : 'Then the price started walking toward it.');
    var steps = [];
    var before = (c.piles || []).filter(function (p) { return p[0] < st0.day && p[1] !== node; });
    if (before.length && num(c.prev_k)) {
      var b0 = before[0][0], b1 = before[before.length - 1][0], bv = closeOn(closes, dayNum(b1)), same = before.every(function (p) { return p[1] === c.prev_k; });
      steps.push({ dn: dayNum(b1), v: bv, place: 1, text: (b0 === b1 ? wS(b0) : dS(b0) + '–' + dS(b1)) + ' · ' +
        (same ? 'The top call pile sits at ' + strike(c.prev_k) : 'The top call pile moves around, last at ' + strike(c.prev_k)) +
        (num(bv) ? ', ' + a1(c.prev_k / bv - 1) + (c.prev_k >= bv ? ' above' : ' below') + ' the price.' : '.') });
    }
    steps.push({ dn: sdn, v: num(st0.close) ? st0.close : st0.spot, place: -1, text: (c.unrecorded > 0 ? '' : wS(st0.day) + ' · ' + px(st0.spot) + '. ') + startText(c) });
    if (o && o.start) steps.push({ dn: dayNum(o.start.day), v: closeOn(closes, dayNum(o.start.day)), place: 1, text: wS(o.start.day) + ' · ' + pairText(c, o) });
    if (Array.isArray(c.oi) && c.oi.length >= 2 && num(c.oi[0][1]) && c.oi[0][1]) {
      var o0 = c.oi[0], o1 = c.oi[c.oi.length - 1], ch = o1[1] / o0[1] - 1;
      steps.push({ dn: dayNum(o1[0]), v: closeOn(closes, dayNum(o1[0])), place: -1, text: dS(o0[0]) + ' → ' + dS(o1[0]) + ' · Calls at ' + strike(node) + ' (expiries still open): ' + int(o0[1]) + ' → ' + int(o1[1]) +
        ' (' + chgTxt(ch) + '). ' + (ch >= 0.02 ? 'Traders kept adding.' : ch > -0.02 ? 'About the same: normal day-to-day churn.' : 'Fewer: some of these calls were closed or rolled.') });
    }
    if (c.touch) steps.push({ dn: dayNum(c.touch.day), v: c.touch.high, place: -1, high: true, text: wS(c.touch.day) + ' · high ' + px(c.touch.high) + '. Touched: ' + c.sym + ' reached the ' + strike(node) + ' pile, ' +
      sessionsAfter(sdn, dayNum(c.touch.day)) + ' sessions after it became the top pile.' });
    var rd = num(c.seen) && c.seen < c.held ? ' (we have a reading on ' + c.seen + ' of them)' : '';
    var held = c.left ? strike(node) + ' stopped being the top pile ' + dS(c.left) + ', after ' + c.held + ' sessions' + rd + '. ' : 'Still the top pile after ' + c.held + ' sessions' + rd + '; ';
    steps.push({ dn: dayNum(nw.day), v: nw.close, place: 1, now: true, text: 'Now · ' + wS(nw.day) + ' · ' + px(nw.close) + '. ' + held + (nw.close >= node ? 'the price is above the pile.' :
      a1(nw.dist) + ' away: the price has covered ' + p0(c.closed) + ' of the gap' + (c.touch ? '.' : '. Not reached yet.')) });
    steps = steps.map(function (s1, i) { s1._o = i; return s1; }).sort(function (a, b) { return (a.now ? 1 : 0) - (b.now ? 1 : 0) || a.dn - b.dn || a._o - b._o; });
    CHASE = { c: c, steps: steps, closes: closes, node: node, sdn: sdn, active: CHASE && CHASE.c && CHASE.c.sym === c.sym ? CHASE.active : null };
    var ol = $('chaseSteps'); clear(ol);
    steps.forEach(function (s1, i) {
      var li = document.createElement('li'), b = btn('', null);
      b.appendChild(span('sn', String(i + 1))); b.appendChild(span('st-t', s1.text));
      b.addEventListener('click', function () { setChaseStep(i); });
      li.appendChild(b); ol.appendChild(li); s1.btn = b;
    });
    renderChaseChecks(c);
    $('chaseNote').textContent = (lead ? 'We picked ' + c.sym + ' because it is the clearest example running now.' :
      'We show ' + c.sym + ' next to ' + cs[0].sym + (c.sym === 'EWT' ? ' because it is the Taiwan fund whose biggest holding is TSMC.' : ' because it is the same pattern on a related name.') + ' It is not the furthest along: the hunt ranks that.') +
      (c.touch ? '' : ' It hasn’t reached ' + strike(node) + ': a chase can stall, or the pile can move.') + ' Nothing here is tested yet.';
    var n = P.chase ? P.chase.names.length : 0;
    $('chaseHunt').textContent = 'Hunt this pattern: ' + (P.chase ? n + (n === 1 ? ' name matches' : ' names match') + (P.list === 'all' ? '' : ' on ' + LISTS[P.list].label) + ' today' : 'not in this file') + ' →';
    $('chaseHunt').disabled = !P.chase || P.side !== 'calls';
    if (chaseIsOpen()) drawChase();
    setChaseStep(CHASE.active);
  }
  function renderChaseChecks(c) {
    var host = $('chaseChecks'); clear(host);
    var ck = {}; (Array.isArray(c.ck) ? c.ck : []).forEach(function (x) { if (Array.isArray(x) && typeof x[0] === 'string') ck[x[0]] = x; });
    var since = Array.isArray(c.oi) && c.oi[0] ? dS(c.oi[0][0]) : 'our per-contract records started';
    [['FAR', 'far', 'Above the price when it became the top pile', 'How far above the price the pile sat on the day it became the stock’s top call pile. The top pile usually changes when a nearer pile expires, so this shows where the biggest bet sits, not when it was placed.'],
      ['STAYS PUT', 'held', 'Sessions as the top pile', 'Trading sessions it has been the top call pile since then. A day missing from our records counts as a gap, not a move.'],
      ['CLOSING IN', 'closing', 'Share of the gap closed', 'How much of the dollar gap on that day the price has covered since: 0% = no closer, 100% = at the pile.'],
      ['CALLS', 'calls', 'Calls at the pile, change', 'Open calls at that strike since ' + since + ', counting only expiries still open today, so options that simply expired don’t count as closed. A clear drop would mean traders are closing the bet; small moves either way are normal churn.']
    ].forEach(function (r, i) {
      var x = ck[r[1]] || [], val = typeof x[1] === 'string' ? x[1] : null;
      var t = div('ck'), k = div('ck-k'), id = 'chk' + i;
      k.appendChild(span('', r[0]));
      var ib = btn('ib', 'i'); ib.setAttribute('aria-expanded', 'false'); ib.setAttribute('aria-controls', id); ib.setAttribute('aria-label', 'What ' + r[0] + ' means');
      k.appendChild(ib); t.appendChild(k);
      t.appendChild(div('ck-r')).textContent = r[2];
      var v = div('ck-v');
      if (val == null) { v.textContent = '–'; v.title = 'Not in this data file yet'; }
      else { v.textContent = val + ' '; if (x[2] === true) v.appendChild(span('ok', '✓')); }
      t.appendChild(v);
      var p = para('ck-x', r[3]); p.id = id; p.hidden = true; t.appendChild(p);
      ib.addEventListener('click', function () { var op = ib.getAttribute('aria-expanded') !== 'true'; ib.setAttribute('aria-expanded', op ? 'true' : 'false'); p.hidden = !op; });
      host.appendChild(t);
    });
  }
  function chaseRead(dn, v, isHigh) {
    var ro = $('chaseRo'); clear(ro);
    if (dn == null) { ro.textContent = 'Tap a step, or touch the chart, to read a day.'; return; }
    ro.appendChild(span('d', wmd(dn)));
    if (v == null) return;
    ro.appendChild(document.createTextNode(' · ' + CHASE.c.sym + ' ' + (isHigh ? 'high ' : '') + px(v)));
    var k = pileOn(CHASE.c, dn);
    if (num(k)) { var x = k / v - 1; ro.appendChild(document.createTextNode(' · top call pile ' + strike(k) + (Math.abs(x) < 0.0005 ? ' at the price' : ', ' + a1(x) + (x >= 0 ? ' above' : ' below')))); }
    else ro.appendChild(document.createTextNode(' · no record of the top pile that day'));
  }
  function setChaseStep(i) {
    if (!CHASE) return;
    CHASE.active = i;
    CHASE.steps.forEach(function (s1, k) { if (s1.btn) { if (k === i) s1.btn.setAttribute('aria-current', 'step'); else s1.btn.removeAttribute('aria-current'); } });
    if (CHASE.mark) CHASE.mark(i == null ? null : CHASE.steps[i]);
    if (i == null) chaseRead(null); else { var s1 = CHASE.steps[i]; chaseRead(s1.dn, s1.v, s1.high); }
  }
  function drawChase() {
    if (!CHASE) return;
    var h = $('chaseChart'); clear(h);
    var c = CHASE.c, steps = CHASE.steps, closes = CHASE.closes, node = CHASE.node;
    h.setAttribute('aria-label', c.sym + ' chart: the top call pile and the price. Left and right arrows move through days.');
    if (!closes) { h.appendChild(para('cap', 'No daily closes in this file.')); return; }
    var W = Math.max(280, Math.round(h.clientWidth || 300)), H = W < 520 ? 210 : 240;
    var L = 8, Rr = 10, T = 32, B = 22, pw = W - L - Rr, ph = H - T - B;
    var first = closes.d[0], last = closes.d[closes.d.length - 1];
    var SS = []; for (var d = first; d <= last; d++) if (isSession(d)) SS.push(d);
    if (SS.length < 2) SS = [first, last + 1];
    function X(dn) { var i = nearest(SS, dn); return L + (i / (SS.length - 1)) * pw; }
    var piles = (c.piles || []).filter(function (p) { return num(p[1]); }).map(function (p) { return { dn: dayNum(p[0]), k: p[1] }; });
    var vals = closes.c.concat([node]);
    piles.forEach(function (p) { vals.push(p.k); });
    if (c.touch && num(c.touch.high)) vals.push(c.touch.high);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.05; lo -= pd; hi += pd;
    var Y = lin(lo, hi, T + ph, T);
    var s = svgNode(W, H); h.appendChild(s);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', c.sym + ' chart in ' + steps.length + ' steps. ' + steps.map(function (s1, i) { return (i + 1) + ': ' + s1.text; }).join(' '));


    var runs = [];
    piles.forEach(function (p) { var r = runs[runs.length - 1]; if (r && r.k === p.k) r.b = p.dn; else runs.push({ k: p.k, a: p.dn, b: p.dn }); });
    runs.forEach(function (r, i) {
      var nx = runs[i + 1], x0 = X(r.a), x1 = nx ? (sessionsAfter(r.b, nx.a) <= 1 ? X(nx.a) : X(r.b)) : L + pw, on = r.k === node;
      el('line', { x1: x0, x2: Math.max(x1, x0 + 2), y1: Y(r.k), y2: Y(r.k), stroke: on ? C.amber : C.muted, 'stroke-width': on ? 1.6 : 1.2, 'stroke-dasharray': on ? '6 4' : '3 3' }, s);
      if (!on) tx(s, x0 + 2, Y(r.k) - 5, strike(r.k), { fill: C.muted, 'font-size': 10.5 }, C.bg);
    });
    tx(s, L + pw - 2, Y(node) - 5, strike(node) + ' · pile', { fill: C.amber, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end' }, C.bg);

    var xs0 = X(CHASE.sdn), ys0 = Y(num(c.start.close) ? c.start.close : c.start.spot), yN = Y(node);
    el('line', { x1: xs0, x2: xs0, y1: T - 6, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '1 3' }, s);
    tx(s, xs0 + 4, T + 2, 'top pile', { fill: C.muted, 'font-size': 10.5 }, C.bg);
    el('path', { d: 'M' + (xs0 - 4) + ' ' + ys0 + 'H' + xs0 + 'V' + yN + 'H' + (xs0 - 4), fill: 'none', stroke: C.amber, 'stroke-width': 1.6 }, s);
    tx(s, xs0 - 7, (ys0 + yN) / 2 + 4, '+' + Math.round(c.start.dist * 100) + '%', { fill: C.amber, 'font-size': 12, 'font-weight': 700, 'text-anchor': 'end' }, C.bg);

    var xs = [], pts = [], dl = '';
    closes.d.forEach(function (dn, i) { var x = X(dn), y = Y(closes.c[i]); dl += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); xs.push(x); pts.push({ dn: dn, v: closes.c[i] }); });
    el('path', { d: dl, fill: 'none', stroke: C.light, 'stroke-width': 2, 'stroke-linejoin': 'round' }, s);
    if (c.touch && num(c.touch.high)) el('circle', { cx: X(dayNum(c.touch.day)), cy: Y(c.touch.high), r: 4.5, fill: C.gold, stroke: C.bg, 'stroke-width': 1.6 }, s);
    var labs = [{ x: L, t: monD(first, true), a: 'start' }, { x: L + pw, t: monD(last, true), a: 'end' }, { x: xs0, t: monD(CHASE.sdn, true), a: 'middle' }], kept = [];
    labs.forEach(function (o) {
      var w = textW(o.t, 11), x0 = o.a === 'start' ? o.x : o.a === 'end' ? o.x - w : o.x - w / 2;
      if (kept.some(function (q) { return x0 < q.x1 + 8 && x0 + w + 8 > q.x0; })) return;
      kept.push({ x0: x0, x1: x0 + w }); tx(s, o.x, H - 6, o.t, { fill: C.muted, 'font-size': 11, 'text-anchor': o.a });
    });

    var cross = el('g', { 'pointer-events': 'none' }, s), marks = el('g', {}, s), circles = [], placed = [];
    steps.forEach(function (s1, i) {
      if (s1.dn == null || !num(s1.v)) { circles.push(null); return; }
      var x = X(s1.dn), y = Y(s1.v), cy = y + s1.place * 18;
      if (cy - 11 < 2) cy = y + 18;
      if (cy + 11 > T + ph + 4) cy = y - 18;
      for (var t = 0; t < 4 && placed.some(function (q) { return Math.abs(q.x - x) < 24 && Math.abs(q.y - cy) < 24; }); t++) {
        var up = cy - 24, dn = cy + 24;
        cy = up - 11 >= 2 && !placed.some(function (q) { return Math.abs(q.x - x) < 24 && Math.abs(q.y - up) < 24; }) ? up : dn + 11 <= T + ph + 4 ? dn : up;
      }
      placed.push({ x: x, y: cy });
      if (s1.now) nowDot(marks, x, y, 3.5);
      var g = el('g', { 'class': 'stp', cursor: 'pointer' }, marks);
      el('line', { x1: x, x2: x, y1: y, y2: cy, stroke: C.light, 'stroke-width': 1, 'stroke-opacity': 0.5 }, g);
      var ci = el('circle', { cx: x, cy: cy, r: 11, fill: C.bg, stroke: C.light, 'stroke-width': 1.5 }, g);
      var tt = tx(g, x, cy + 4, String(i + 1), { fill: C.light, 'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'middle' });
      el('circle', { cx: x, cy: cy, r: 12, fill: 'transparent' }, g);
      g.addEventListener('click', function (e) { e.stopPropagation(); setChaseStep(i); });
      circles.push({ c: ci, t: tt });
    });
    CHASE.mark = function (s1) {
      clear(cross);
      circles.forEach(function (o2, k) { if (!o2) return; var on = CHASE.steps[k] === s1; o2.c.setAttribute('fill', on ? C.fear : C.bg); o2.c.setAttribute('stroke', on ? C.fear : C.light); o2.t.setAttribute('fill', on ? '#fff' : C.light); });
      if (s1 && s1.dn != null) { var x = X(s1.dn); el('line', { x1: x, x2: x, y1: T - 6, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross); }
    };
    attachReader(h, {
      xs: xs,
      show: function (i) {
        var p = pts[i]; clear(cross);
        el('line', { x1: xs[i], x2: xs[i], y1: T - 6, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross);
        el('circle', { cx: xs[i], cy: Y(p.v), r: 3.5, fill: '#fff', stroke: C.bg, 'stroke-width': 1.2 }, cross);
        chaseRead(p.dn, p.v);
      },
      rest: function () { setChaseStep(CHASE.active); }
    });
    if (CHASE.active != null) CHASE.mark(steps[CHASE.active]);
  }


  function huntWhy(n) {
    var h = n.hunt, ul = document.createElement('ul'); ul.className = 'why';
    [
      ['Far', p0(h.d0) + ' above the price when it became the top call pile (' + (h.since_records ? 'already the top pile when our records start, ' : '') + dS(h.start) + ')'],
      ['Stays put', h.held + ' sessions as the top pile' + (num(h.seen) && h.seen < h.held ? ' (we have a reading on ' + h.seen + ' of them)' : '')],
      ['Closing in', p0(h.closed) + ' of the gap closed since then'],
      ['Calls at the pile', num(h.oi0) && h.oi0 && num(h.oi_now) ? chgTxt(h.oi_now / h.oi0 - 1) + ' since ' + dS(h.oi0_day) + ' (expiries still open)' : 'not in our records yet']
    ].forEach(function (x) {
      var li = document.createElement('li');
      li.appendChild(span('ok', '✓'));
      li.appendChild(document.createTextNode(x[0] + ': ' + x[1]));
      ul.appendChild(li);
    });
    if (h.opex) { var li2 = document.createElement('li'); li2.className = 'mut'; li2.appendChild(document.createTextNode('It became the top pile in the ' + dS(h.opex) + ' expiry week, when near-term piles drop out of the map: it was most likely there already.')); ul.appendChild(li2); }
    return ul;
  }
  function renderHunt(host, kind) {
    kind = isHunt(kind) ? kind : 'chase';
    var Hn = P[kind], q = S.q.trim().toUpperCase(), ql = S.q.trim().toLowerCase();
    if (kind === 'chase') {
      $('rankNote').textContent = 'Hunting the TSM pattern across ' + (P.list === 'all' ? 'all ' + (Hn && num(Hn.checked) ? int(Hn.checked) + ' ' : '') + 'names with a call pile' : LISTS[P.list].label) +
        ': a big, mostly long-dated call pile that sat well above the price when it became the top pile, has stayed the top pile, and that the price has been closing in on without reaching it, while the calls there have not been cut back by much. Ranked by the share of the gap closed (the number before each name). Most are not on the best-match list: once the price gets close, a pile drops off it.';
    } else if (kind === 'fresh' && typeof freshNote === 'function') {
      $('rankNote').textContent = freshNote(Hn);
    } else if (kind === 'ewz' && typeof ewzNote === 'function') {
      $('rankNote').textContent = ewzNote(Hn);
    }
    $('rankNote').hidden = false;
    var rows = Hn ? Hn.names.filter(function (n) { return !q || n.sym.indexOf(q) === 0 || (ql.length >= 2 && typeof n.name === 'string' && (' ' + n.name.toLowerCase()).indexOf(' ' + ql) >= 0); }) : [];
    if (q && rows.length) $('rankNote').textContent += kind !== 'fresh' ? ' Showing your search only; the numbers are each name’s place in the hunt.' : ' Showing your search only; the numbers are each name’s place on this list.';
    if (!rows.length) {
      var what = kind === 'chase' ? 'shows the TSM pattern' : kind === 'ewz' ? 'shows the EWZ pattern' : 'has fresh calls arriving at its pile';
      host.appendChild(q ? emptyBox('No match starts with ' + q + '.') : P.list === 'all' ? emptyBox('No name ' + what + ' today.') :
        emptyBox('No name on ' + LISTS[P.list].label + ' ' + what + ' today.', 'Whole list', function () { setList('all'); }));
      return;
    }
    rows.forEach(function (n) { var r = addRow(host, n, null); r.c.stock.insertBefore(span('rk', String(n._i + 1)), r.c.stock.firstChild); });
    Object.keys(S.open).forEach(function (sym) { if (rowRefs[sym]) openRow(rowRefs[sym], false); });
  }


  function freshNote(Hn) {
    var n = Hn ? Hn.names.length : 0, on = Hn ? Hn.names.filter(function (x) { return x.listed; }).length : 0;
    return 'Fresh Calls AI Pile: AI companies' + (P.list === 'all' || P.list === 'ai' ? '' : ' on ' + LISTS[P.list].label) +
      ' whose biggest call pile is a big one, sits above the price (at any distance), and where open calls at that pile have grown clearly over the last few sessions' +
      (Hn && num(Hn.checked) ? ' (' + n + ' of the ' + int(Hn.checked) + ' AI companies with a big pile above the price)' : '') +
      '. Ranked by how fast the calls grew (the number before each name). In our first look, piles where new calls kept arriving were reached more often than piles that sat still, but on only a handful of names: a watch list, not a tested signal. ' +
      (n && on === 0 ? 'None of them is on the best-match list today.' : on === n && n ? 'All of them are on the best-match list too.' : on ? on + ' of them ' + (on === 1 ? 'is' : 'are') + ' on the best-match list too.' : '');
  }
  function freshWhy(n) {
    var f = n.fresh, ul = document.createElement('ul'); ul.className = 'why';
    [
      ['AI company', 'on the AI companies list'],
      ['Pile above the price', strike(n.node) + ' is ' + p0(n.dist) + ' above the price'],
      ['Big pile', p0(n.share) + ' of all the upside gamma on ' + n.sym + (num(n.gex_usd) ? ' (' + usd(n.gex_usd) + ' of gamma)' : '')],
      ['Fresh calls', '+' + int(f.added) + ' open calls at ' + strike(n.node) + ' (' + chgTxt(f.growth) + ')' +
        (f.from_day && f.to_day ? ' from ' + dS(f.from_day) + ' to ' + dS(f.to_day) : '') + (num(f.to_oi) ? ', ' + int(f.to_oi) + ' open now' : '')]
    ].forEach(function (x) {
      var li = document.createElement('li');
      li.appendChild(span('ok', '✓'));
      li.appendChild(document.createTextNode(x[0] + ': ' + x[1]));
      ul.appendChild(li);
    });
    var li2 = document.createElement('li'); li2.className = 'mut';
    li2.appendChild(document.createTextNode('New calls show interest, not direction: each one has a buyer and a seller. Not tested yet: an early read from a handful of names.'));
    ul.appendChild(li2);
    return ul;
  }


  function ewzNote(Hn) {
    var n = Hn ? Hn.names.length : 0, on = Hn ? Hn.names.filter(function (x) { return x.listed; }).length : 0,
      rolled = Hn ? Hn.names.filter(function (x) { return x.ewz && x.ewz.roll; }).length : 0;
    return 'Hunting the EWZ pattern across ' + (P.list === 'all' ? 'all ' + (Hn && num(Hn.checked) ? int(Hn.checked) + ' ' : '') + 'names' : LISTS[P.list].label + ' names') +
      ' with a big call pile far above the price and calls well above puts at it: fresh calls arriving at that pile over the last few sessions, however long it has been the top pile. The best-match list wants a pile that has stayed the top pile, which is why it left EWZ off. Rolled in = the top strike moved closer to the price while calls at the old top strike were cut, as EWZ’s did (45 to 43) before Brazil’s Oct 4 vote: ' +
      (rolled ? (rolled === 1 ? 'that one comes' : 'those come') + ' first, then the most calls added' : 'none today; ranked by the most calls added') +
      ' (the number before each name). One case so far: a hunt to watch, not a tested signal. ' +
      (n && on === 0 ? 'None of them is on the best-match list today.' : on === n && n ? 'All of them are on the best-match list too.' : on ? on + ' of them ' + (on === 1 ? 'is' : 'are') + ' on the best-match list too.' : '');
  }
  function ewzWhy(n) {
    var e = n.ewz, k = strike(n.node), ul = document.createElement('ul'); ul.className = 'why';
    var items = [
      ['Big pile far above', k + ' is ' + p0(n.dist) + ' above the price; ' + p0(n.share) + ' of all the upside gamma on ' + n.sym + (num(n.gex_usd) ? ' (' + usd(n.gex_usd) + ' of gamma)' : '')],
      ['Calls, not puts', int(n.call_oi) + ' calls against ' + int(n.put_oi) + ' puts at ' + k],
      ['Fresh calls', '+' + int(e.added) + ' open calls at ' + k + ' (' + chgTxt(e.growth) + ')' +
        (e.from_day && e.to_day ? ' from ' + dS(e.from_day) + ' to ' + dS(e.to_day) : '') + (num(e.to_oi) ? ', ' + int(e.to_oi) + ' open now' : '')]
    ];
    if (e.roll && num(e.roll.from_k) && num(e.roll.from_chg)) items.push(['Rolled in', 'the top strike moved from ' + strike(e.roll.from_k) + ' to ' + k +
      ', and calls at ' + strike(e.roll.from_k) + ' fell by ' + int(Math.abs(e.roll.from_chg)) + (e.roll.from_day && e.roll.to_day ? ' from ' + dS(e.roll.from_day) + ' to ' + dS(e.roll.to_day) : '')]);
    items.forEach(function (x) {
      var li = document.createElement('li');
      li.appendChild(span('ok', '✓'));
      li.appendChild(document.createTextNode(x[0] + ': ' + x[1]));
      ul.appendChild(li);
    });
    var li2 = document.createElement('li'); li2.className = 'mut';
    li2.appendChild(document.createTextNode('Named after EWZ: this setup came before Brazil’s first-round vote, and EWZ jumped about 11% the next morning toward its 43 pile. New calls show interest, not direction: each one has a buyer and a seller. One case so far, not tested.'));
    ul.appendChild(li2);
    return ul;
  }


  var DAYS = null, PERF = {}, perLoading = {}, perPend = null, perFail = false, perCache = { k: null, v: null }, dayDocs = {};
  var PER_LABEL = { '1w': 'Last 1 week', '2w': 'Last 2 weeks', '1m': 'Last 1 month', total: 'Everything saved' };
  function isDay(s) { return typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s); }
  function dayInfo(d) { return (DAYS || []).filter(function (e) { return e.day === d; })[0] || null; }
  var daysLoading = false, daysAt = 0, daysSig = null, daysTop = null;
  function loadDays() {
    if (daysLoading) return;
    daysLoading = true; daysAt = Date.now();
    getJSON(daysBase + 'index.json').then(function (ix) {
      daysLoading = false;
      var nd = ix && Array.isArray(ix.days) ? ix.days.filter(function (e) { return e && isDay(e.day); }) : null;
      var top = nd && nd.length ? nd.map(function (e) { return e.day; }).sort().pop() : null;
      DAYS = nd;
      if (daysTop && top && top !== daysTop) perRefresh();
      daysTop = top || daysTop;
      if (S.day && !dayInfo(S.day) && !perHasDay(S.day)) {
        if (!P) { S.day = null; loadGen++; dayFallbackHash(); renderDayBar(); load(true); return; }
        setDay(null); return;
      }
      renderDayBar();
      if (S.day && P) { bannerSig = ''; renderStatus(); }
    }, function () { daysLoading = false; if (!DAYS) renderDayBar(); });
  }
  function dayFallbackHash() {
    var o = S.period ? perPend : pendingOpen, b = baseHash();
    try { history.replaceState(null, '', location.pathname + location.search + (o ? (b ? b + '&o=' : '#') + encodeURIComponent(o) : b)); } catch (e) { }
  }
  function daysCheck(d) {
    if (S.day) return;
    var sig = (d.prices_day || '') + '|' + (d.state || '');
    if (!DAYS || sig !== daysSig || Date.now() - daysAt > 30 * 6e4) { daysSig = sig; loadDays(); }
  }
  function perRefresh() {
    var k = S.period, keep = k ? PERF[k] : null;
    PERF = {}; perCache = { k: null, v: null };
    if (keep) PERF[k] = keep;
    if (!k || !P) return;
    getJSON(daysBase + 'period_' + k + '.json').then(function (p) {
      if (!(p && p.calls && Array.isArray(p.calls.rows))) return;
      PERF[k] = p; perCache = { k: null, v: null };
      if (S.period === k && P) { renderPeriods(); renderCounts(); renderList(); }
    }, function () {  });
  }
  function renderDayBar() {
    var bar = $('dayBar'), have = !!(DAYS && DAYS.length);
    bar.hidden = !have;
    if (!have) return;
    var info = S.day ? dayInfo(S.day) : null;
    $('dayLbl').textContent = S.day ? wS(S.day) + (info && info.rebuilt ? ' (rebuilt)' : '') : 'today';
    $('dayBtn').classList.toggle('on', !!S.day);
    Array.prototype.forEach.call(document.querySelectorAll('#perSeg button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-per') === S.period ? 'true' : 'false'); });
  }
  function openDayMenu(open) {
    var m = $('dayMenu'), b = $('dayBtn');
    if (!open) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); return; }
    clear(m);
    m.appendChild(div('dp-h')).textContent = 'PICK A DAY';
    var items = [[null, 'Today', 'the live page']].concat((DAYS || []).map(function (e) { return [e.day, wS(e.day), e.rebuilt ? 'rebuilt from the option archive' : 'saved at the close']; }));
    items.forEach(function (x) {
      var it = btn('dp-i' + ((x[0] || null) === (S.day || null) ? ' sel' : ''), null);
      it.setAttribute('role', 'option'); it.setAttribute('aria-selected', (x[0] || null) === (S.day || null) ? 'true' : 'false');
      it.appendChild(span('', x[1])); it.appendChild(add(document.createElement('small'), x[2]));
      it.addEventListener('click', function () { openDayMenu(false); setDay(x[0]); });
      m.appendChild(it);
    });
    m.appendChild(para('dp-n', 'Each trading day is kept as the page looked after that day’s close, open interest settled overnight. Saving began Fri Oct 2; Sep 28 – Oct 1 were rebuilt from the option archive, close to but not exactly what the page showed.'));
    m.hidden = false; b.setAttribute('aria-expanded', 'true');
    var f = m.querySelector('.dp-i.sel') || m.querySelector('.dp-i'); if (f) f.focus();
  }
  function perHasDay(d) { return Object.keys(PERF).some(function (k) { return PERF[k] && (PERF[k].days || []).indexOf(d) >= 0; }); }
  function setDay(d, sym) {
    d = isDay(d) && (dayInfo(d) || perHasDay(d)) ? d : null;
    if (d === (S.day || null) && !sym) return;
    S.day = d;
    if (S.period) { S.period = null; perPend = null; $('periods').hidden = true; }
    closePop(); hideCheck(); ghosts = {}; $('updateBar').hidden = true; setStick();
    if (sym) pendingOpen = sym;
    P = null; RAW = null; fatal = { msg: 'loading' }; bannerSig = ''; loadGen++;
    try { history.replaceState(null, '', location.pathname + location.search + (sym ? symHash(sym) : baseHash())); } catch (e) { }
    renderDayBar();
    load(true);
    scrollToEl($('status'));
  }
  function savedStatus() {
    if (!S.day || !P) return;
    var info = dayInfo(S.day);
    var chip = $('chip'); chip.className = 'chip chip-saved'; chip.textContent = info && info.rebuilt ? 'REBUILT DAY' : 'SAVED DAY';
    var a = $('asof'); clear(a);
    segText(a, ['Close of ' + wS(S.day), info && info.rebuilt ? 'rebuilt from the option archive' : 'as the page looked that evening']);
    $('statusLine').textContent = 'Live updates are off while you look at a saved day.';
  }





  function withPeriod(k, fn) {
    if (PERF[k]) { fn(PERF[k]); return; }
    if (perLoading[k]) { perLoading[k].push(fn); return; }
    perLoading[k] = [fn];
    getJSON(daysBase + 'period_' + k + '.json').then(function (p) { return p && p.calls && Array.isArray(p.calls.rows) ? p : null; }, function () { return null; })
      .then(function (p) { if (p) PERF[k] = p; var f = perLoading[k]; delete perLoading[k]; f.forEach(function (g) { g(p); }); });
  }
  function perView() {
    var w = S.period && PERF[S.period];
    if (!w || !P) return null;
    var side = P.side === 'puts' ? 'puts' : 'calls', sd = w[side];
    if (!sd || !Array.isArray(sd.rows)) return null;
    var ck = S.period + '|' + side + '|' + P.list + '|' + (P.lists && P.list !== 'all' ? Object.keys(P.lists[P.list] || {}).length : 0);
    if (perCache.k === ck) return perCache.v;
    var rows = sd.rows.filter(function (n) { return n && typeof n.sym === 'string' && n.per && isDay(n.per.day) && inListNow(n.sym); });
    var by = {}, counts = { AB: 0, A: 0, B: 0, C: 0 };
    rows.forEach(function (n, i) {
      if (!n._pv) {
        if (TIERS.indexOf(n.tier) < 0) n.tier = 'C';
        n._cpAll = skewOf(n.chain_call_oi, n.chain_put_oi, CP_MIN.all); n._cpWk = skewOf(n.wk_c, n.wk_p, CP_MIN.wk); n._cpDay = skewOf(n.vol_c, n.vol_p, CP_MIN.day);
        viewName(n, n.per.day); n._pv = 1;
      }
      n._i = i; by[n.sym] = n; counts[n.tier]++;
    });
    perCache = { k: ck, v: { w: w, sd: sd, side: side, rows: rows, by: by, counts: counts, nd: (w.days || []).length, cut: num(sd.all) && sd.all > sd.rows.length } };
    return perCache.v;
  }
  function inListNow(sym) { return !P || P.list === 'all' || !!(P.lists && P.lists[P.list] && P.lists[P.list][sym]); }
  function setPeriod(k) { showPeriod(S.period === k ? null : k, null, true); }
  function showPeriod(k, sym, scroll) {
    k = PER_LABEL[k] ? k : null;
    if (k && typeof isHunt === 'function' && isHunt(S.sort)) { S.sort = 'best'; S.chaseParked = false; sset('ps.sort', 'best'); }
    S.period = k; perPend = sym || null; perFail = false;
    closePop(); hideCheck(); ghosts = {}; $('updateBar').hidden = true; setStick();
    renderDayBar();
    if (!k) { S.open = {}; $('periods').hidden = true; clearHash(); if (P) { renderCounts(); renderList(); } return; }
    if (!sym) clearHash();
    if (!PERF[k]) perMsg(k, 'Loading…');
    withPeriod(k, function (p) {
      if (S.period !== k) return;
      S.open = {};
      if (!p) {
        var o = perPend;
        S.period = null; perPend = null; renderDayBar(); clearHash();
        if ($('dayBar').hidden) { perFail = false; $('periods').hidden = true; }
        else {
          perFail = true;
          var b = document.querySelector('#perSeg button[data-per="' + k + '"]');
          perMsg(k, 'Couldn’t load it just now. Tap ' + (b ? b.textContent : 'the button') + ' again to try again.');
        }
        if (P) { renderCounts(); renderList(); if (o) openLinked(o); }
        else if (o) pendingOpen = o;
        return;
      }
      if (!P) return;
      renderPeriods(); renderCounts(); renderList();
      if (perPend) { var o = perPend; perPend = null; perLinkOpen(o); }
      else if (scroll) scrollToEl($('periods'));
    });
  }
  function perMsg(k, text) {
    $('periods').hidden = false; $('perH').textContent = PER_LABEL[k]; $('perSub').textContent = text;
    clear($('perTally')); clear($('perReached'));
  }
  function renderPeriods() {
    var sec = $('periods');
    if (!S.period) { if (!perFail) sec.hidden = true; return; }
    if (!PERF[S.period]) { if (!perLoading[S.period]) showPeriod(S.period, perPend, false); return; }
    var V = perView();
    if (!V) { sec.hidden = true; return; }
    var w = V.w, sd = V.sd, opt = V.side === 'puts' ? 'put' : 'call';
    sec.hidden = false;
    $('perH').textContent = PER_LABEL[S.period] + ' · ' + dS(w.start) + ' – ' + dS(w.end);
    var nr = (w.rebuilt || []).length;
    $('perSub').textContent = 'The table below is every name that was on the ' + opt + ' list on a saved day in this window' + (P.list !== 'all' ? ', within ' + LISTS[P.list].label : '') +
      ', each with its row from the last saved day it was on the list. ' + V.nd + ' saved ' + (V.nd === 1 ? 'day' : 'days') +
      (nr ? ', ' + nr + ' of them rebuilt from the option archive (close to, not exactly, what the page showed)' : '') + '.';
    var reached = (sd.reached || []).filter(function (r) { return r && inListNow(r.sym); }), ran = (sd.ran_out || []).filter(function (r) { return r && inListNow(r.sym); });
    var all = P.list === 'all' && sd.totals, tl = $('perTally'); clear(tl);
    [[all ? sd.totals.names : V.rows.length, 'On the list'], [all ? sd.totals.joined : V.rows.filter(function (n) { return n.per.joined; }).length, 'Joined'],
      [all ? sd.totals.left : V.rows.filter(function (n) { return n.per.left; }).length, 'Left'], [reached.length, 'Reached'], [ran.length, 'Ran out of time']].forEach(function (x) {
      var t = div('ft'); t.appendChild(span('ft-v', num(x[0]) ? String(x[0]) : '–')); t.appendChild(span('ft-k', x[1])); tl.appendChild(t);
    });
    var rc = $('perReached'); clear(rc);
    if (reached.length) rc.appendChild(document.createTextNode('Reached in this window: ' + reached.map(function (h) { return h.sym + ' ' + strike(h.node) + ' (' + dS(h.day) + ')'; }).join(', ') + '. '));
    if (ran.length) rc.appendChild(document.createTextNode('Ran out of time: ' + ran.map(function (m) { return m.sym + ' ' + strike(m.node) + ' (' + dS(m.main_exp) + ')'; }).join(', ') + '.'));
    if (V.cut) rc.appendChild(document.createTextNode(' The table shows the ' + sd.rows.length + ' longest stayers of ' + sd.all + '.'));
  }
  function perPills(n, pill) {
    var p = n.per, V = perView(), nd = V ? V.nd : null;
    if (num(nd)) pill(p.days + ' of ' + nd + (nd === 1 ? ' day' : ' days'), 'p-per', 'On the list on ' + p.days + ' of the ' + nd + ' saved days in this window.');
    if (p.joined) pill('Joined ' + dS(p.joined), 'p-new', 'Not on the list on the saved day before ' + wS(p.joined) + '.');
    if (p.left) pill('Left ' + dS(p.left), 'p-left', 'Not on the list from ' + wS(p.left) + '. This row is ' + wS(p.day) + ', its last day on it in this window.');
  }
  function perWhy(n) {
    var p = n.per, V = perView(), ul = document.createElement('ul'); ul.className = 'why per-why';
    var items = [
      ['In this window', 'on the list ' + p.days + ' of ' + (V ? V.nd : '–') + ' saved days' + (p.joined ? ', joined ' + wS(p.joined) : '') + (p.left ? ', left ' + wS(p.left) : '')],
      ['Price', num(p.p0) && num(p.p1) ? px(p.p0) + ' on ' + dS(p.first) + (p.first !== p.day ? ' → ' + px(p.p1) + ' on ' + dS(p.day) : '') : '–']
    ];
    if (num(p.gap) && p.first !== p.day) items.push(['Toward the pile', p.gap < 0 ? 'moved away from the ' + strike(p.node0) + ' pile (' + p0(-p.gap) + ' of the gap)' : p0(p.gap) + ' of the gap to the ' + strike(p.node0) + ' pile closed']);
    if (num(p.node0) && p.node0 !== n.node) items.push(['The pile moved', 'from ' + strike(p.node0) + ' to ' + strike(n.node)]);
    items.forEach(function (x) {
      var li = document.createElement('li');
      li.appendChild(span('pw', '•'));
      li.appendChild(document.createTextNode(x[0] + ': ' + x[1]));
      ul.appendChild(li);
    });
    var li2 = document.createElement('li'); li2.className = 'mut';
    li2.appendChild(document.createTextNode('On ' + wS(p.day) + ' it passed all five checks:'));
    ul.appendChild(li2);
    return ul;
  }
  function perHead(n) {
    var info = dayInfo(n.per.day), d = para('d-per', null);
    d.appendChild(document.createTextNode(n.sym + ' as the page showed it on ' + wS(n.per.day) + (info && info.rebuilt ? ' (rebuilt from the option archive)' : '') +
      (n.per.left ? ', its last day on the list in this window. ' : '. ')));
    var b = btn('linkbtn', 'Open ' + wS(n.per.day) + ' →');
    b.addEventListener('click', function () { setDay(n.per.day, n.sym); });
    d.appendChild(b);
    return d;
  }
  function perFull(r) {
    var n = r.n, d = n.per.day, side = P && P.side === 'puts' ? 'puts' : 'calls';
    clear(r.det); r.det.appendChild(para('src d-load', 'Loading ' + wS(d) + '…'));
    var got = dayDocs[d] ? Promise.resolve(dayDocs[d]) : getJSON(daysBase + d + '.json').then(function (doc) { dayDocs[d] = doc; return doc; });
    got.then(function (doc) {
      var sd = side === 'puts' ? (doc && doc.puts) || {} : doc || {};
      var full = (Array.isArray(sd.names) ? sd.names : []).filter(function (x) { return x && x.sym === n.sym; })[0];
      if (full) Object.keys(full).forEach(function (k) { if (!(k in n)) n[k] = full[k]; });
      n._settleRef = (doc && doc.oi_settle) || (Array.isArray(sd.names) ? sd.names.map(function (x) { return x && x.oi_settle; }).filter(Boolean).sort().pop() : null) || null;
      n._full = true;
    }, function () {  }).then(function () {
      if (rowRefs[n.sym] === r && S.open[n.sym]) buildDetail(r);
    });
  }
  function renderPeriodList(host) {
    var V = perView(), q = S.q.trim().toUpperCase(), ql = S.q.trim().toLowerCase(), rk = RANKS[S.sort], opt = V.side === 'puts' ? 'put' : 'call';
    var match = function (n) { return !q || n.sym.indexOf(q) === 0 || (ql.length >= 2 && typeof n.name === 'string' && (' ' + n.name.toLowerCase()).indexOf(' ' + ql) >= 0); };
    var rows = V.rows.filter(match);
    var note = PER_LABEL[S.period] + ', ' + opt + 's: ';
    if (S.sort === 'best') note += 'ranked by tier, then the days on the list, then how much of the gap to its pile the price closed. The number before each name is its place in this window.';
    else if (rk) note += rkNote(rk).charAt(0).toLowerCase() + rkNote(rk).slice(1) + ' Ranked within this window.';
    else note += 'sorted as on today’s table.';
    if (q) note += ' Showing your search only.';
    $('rankNote').textContent = note; $('rankNote').hidden = false;
    if (!rows.length) {
      host.appendChild(q ? emptyBox('No name in this window starts with ' + q + '.') : P.list === 'all' ? emptyBox('No name was on the list in this window.') :
        emptyBox('No name on ' + LISTS[P.list].label + ' was on the list in this window.', 'Whole list', function () { setList('all'); }));
      return;
    }
    function put(n, rank) { var r = addRow(host, n, null); if (rank) r.c.stock.insertBefore(span('rk', String(rank)), r.c.stock.firstChild); }
    if (S.sort === 'best') {
      TIERS.forEach(function (t) {
        var grp = rows.filter(function (n) { return n.tier === t; }), showRows = t !== 'C' || S.cOpen || !!q;
        if (!grp.length) return;
        host.appendChild(groupHead(t, grp.length, showRows));
        if (showRows) grp.forEach(function (n) { put(n, n._i + 1); });
      });
    } else {
      var rankOf = {}, hideC = !S.cOpen && !q && !rk, f = SORTS[S.sort] || SORTS.odds, nC = 0;
      if (rk) V.rows.filter(function (n) { return rkHas(rk, n); }).sort(function (a, b) { return SORTS[S.sort](a, b) || a._i - b._i; }).forEach(function (n, i) { rankOf[n.sym] = i + 1; });
      rows.filter(function (n) { if (hideC && n.tier === 'C') { nC++; return false; } return true; })
        .sort(function (a, b) { return f(a, b) || a._i - b._i; })
        .forEach(function (n) { put(n, rk ? rankOf[n.sym] : null); });
      if (nC) {
        var pc = para('c-hidden', nC + ' tier C names hidden (old piles). '), bc = btn('linkbtn', 'Show ' + nC);
        bc.addEventListener('click', function () { setCOpen(true); }); pc.appendChild(bc); host.appendChild(pc);
      }
    }
    Object.keys(S.open).forEach(function (sym) { if (rowRefs[sym]) openRow(rowRefs[sym], false); else delete S.open[sym]; });
    if (perPend) { var o = perPend; perPend = null; setTimeout(function () { perLinkOpen(o); }, 0); }
  }
  function perLinkOpen(o) {
    if (goToPerRow(o)) return;
    if (S.period) { S.period = null; perPend = null; S.open = {}; renderDayBar(); $('periods').hidden = true; clearHash(); renderCounts(); renderList(); }
    openLinked(o);
  }
  function goToPerRow(sym) {
    var V = perView(), n = V && V.by[sym];
    if (!n && V && P && P.list !== 'all' && V.sd.rows.some(function (x) { return x && x.sym === sym; })) {
      setList('all');
      V = perView(); n = V && V.by[sym];
    }
    if (!n) return false;
    if (S.q && !(sym.indexOf(S.q.trim().toUpperCase()) === 0)) { S.q = ''; $('q').value = ''; }
    if (n.tier === 'C' && !S.cOpen) { S.cOpen = true; sset('ps.cOpen', '1'); }
    renderList();
    var r = rowRefs[sym]; if (!r) return false;
    if (!S.open[sym]) openRow(r, true); else setHash(sym);
    scrollToEl(r.art); flashRow(r);
    return true;
  }
  function perUpdate() {
    renderSideBar(); renderNet(); renderFailed(); renderChaseOpt(); renderChase();
    renderListBar(); renderTiles(); renderCounts(); renderClosing(); renderHits(); renderScore(); renderRules(); renderFoot(); renderStatus(); renderPeriods();
    if ($('numbers').open) renderNumTable();
  }
  function initDays() {
    $('dayBtn').addEventListener('click', function (e) { e.stopPropagation(); openDayMenu($('dayMenu').hidden); });
    document.addEventListener('click', function (e) { if (!$('dayMenu').hidden && !$('dayBar').contains(e.target)) openDayMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('dayMenu').hidden) { openDayMenu(false); $('dayBtn').focus(); } });
    Array.prototype.forEach.call(document.querySelectorAll('#perSeg button'), function (b) { b.addEventListener('click', function () { setPeriod(b.getAttribute('data-per')); }); });
    $('perClose').addEventListener('click', function () { showPeriod(null); scrollToEl($('filters')); });
    loadDays();
  }



  function attachReader(holder, api) {
    holder._rd = api;
    if (holder._rdBound) return;
    holder._rdBound = true;
    var cur = null, holdT = null, holding = false, sx = 0, sy = 0, lastX = 0;
    function idx(clientX) {
      var r = holder._rd, svgE = holder.querySelector('svg');
      if (!r || !svgE || !r.xs.length) return null;
      var b = svgE.getBoundingClientRect(), w = +svgE.getAttribute('width') || b.width;
      return nearest(r.xs, (clientX - b.left) * (w / (b.width || 1)));
    }
    function show(i) { if (i == null || !holder._rd) return; cur = i; holder._rd.show(i); }
    holder.addEventListener('pointermove', function (e) {
      lastX = e.clientX;
      if (e.pointerType === 'mouse') { show(idx(e.clientX)); return; }
      if (holding) show(idx(e.clientX));
      else if (holdT && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) { clearTimeout(holdT); holdT = null; }
    });
    holder.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { cur = null; if (holder._rd) holder._rd.rest(); } });
    holder.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      sx = lastX = e.clientX; sy = e.clientY; clearTimeout(holdT);
      holdT = setTimeout(function () { holdT = null; holding = true; show(idx(lastX)); }, 220);
    });
    function end(e) {
      if (e.pointerType === 'mouse') return;
      if (holdT) { clearTimeout(holdT); holdT = null; if (e.type === 'pointerup') show(idx(e.clientX)); }
      holding = false;
    }
    holder.addEventListener('pointerup', end);
    holder.addEventListener('pointercancel', end);
    holder.addEventListener('touchmove', function (e) { if (holding) e.preventDefault(); }, { passive: false });
    holder.addEventListener('contextmenu', function (e) { if (holding || holdT) e.preventDefault(); });
    holder.addEventListener('keydown', function (e) {
      var r = holder._rd; if (!r || !r.xs.length) return;
      var n = r.xs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(cur == null ? n - 1 : Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)))); }
      else if (e.key === 'Home') { e.preventDefault(); show(0); }
      else if (e.key === 'End') { e.preventDefault(); show(n - 1); }
      else if (e.key === 'Escape' && cur != null) { e.stopPropagation(); cur = null; r.rest(); }
    });
  }


  function tierPill(t) {
    var w = SW();
    var titles = { AB: 'A+B: price moving toward the pile AND ' + w.opts + ' being added', A: 'A: price moving toward the pile',
      B: 'B: ' + w.opts + ' at the pile being added', C: 'C: old pile; ' + w.noise };
    var s = span('pill p-' + t, tierName(t)); s.title = titles[t] || ''; return s;
  }

  var BORDERS = { A: 1, Ao: 1, B: 1, Bo: 1, Bn: 1 };
  function borderTitle(n) {
    var b = n.border;
    if (b === 'A' || b === 'Ao') return (n.ret20 >= 0 ? 'Up ' : 'Down ') + a1(n.ret20) + ' in 20 days, just ' + (b === 'Ao' ? 'over' : 'under') + ' the bar for A.';
    var x = n._nc; if (!x) return 'Close to the bar for B.';
    if (b === 'Bn') return SW().Opts + ' up ' + p0(x.pct) + ', but just short on contracts for B.';
    return SW().Opts + ' ' + (x.pct >= 0 ? 'up ' : 'down ') + a1(x.pct) + ', just ' + (b === 'Bo' ? 'over' : 'under') + ' the bar for B.';
  }
  function fillPills(r) {
    var n = r.n, P0 = r.pills; clear(P0);
    function pill(t, cls, title) { var s = span('pill ' + cls, t); if (title) s.title = title; P0.appendChild(s); }
    if (n.new === true && !n.per) pill('NEW', 'p-new', 'New since the previous close’s list.');
    if (n._srch) pill('Not on the list', 'p-left', 'Not on today’s list. Open the row to see which check it misses.');
    if (n.per) perPills(n, pill);
    if (BORDERS[n.border] === 1) pill('Borderline', 'p-bord', borderTitle(n));
    if (num(n.fuse)) pill('Short fuse', 'p-fuse', 'The main expiry is ' + n.fuse + ' days away' + (num(n.main_share) ? ' (' + p0(n.main_share) + ' of these ' + SW().opts + ').' : '.'));
    if (n.touched === true) pill(n.per ? 'Touched ' + dS(n.per.day) : 'TOUCHED today', 'p-touch', 'The price traded at or ' + SW().dir + ' the pile ' + (n.per ? 'on ' + wS(n.per.day) : 'today') + ' (' + SW().ext + ' ' + px(sideExt(n)) + ').');
    if (n.puts_below) pill('Puts below too', 'p-other', 'A big put pile also sits ' + a1(n.puts_below.dist) + ' below the price, at ' + strike(n.puts_below.node) + ' (' + usd(n.puts_below.prem_usd) + ' in puts).');
    if (n.calls_above) pill('Calls above too', 'p-other', 'A big call pile also sits ' + a1(n.calls_above.dist) + ' above the price, at ' + strike(n.calls_above.node) + ' (' + usd(n.calls_above.prem_usd) + ' in calls).');
    if (r.leftAt) pill('Left the list ' + r.leftAt, 'p-left', r.leftWhy || '');
    P0.hidden = !P0.firstChild;
  }
  function fillPrice(r) {
    var n = r.n, c = r.c.price; clear(c);
    var p = span('px', px(n.price));
    if (num(n.prev_close) && num(n.price) && n.price !== n.prev_close) { p.className += n.price > n.prev_close ? ' dup' : ' ddn'; p.title = (n.per ? wS(n.per.day) : 'Today') + ' ' + sp1(n.price / n.prev_close - 1); }
    add(c, p, ' ', add(span('nd-w', null), span('ar', '→ '), span('nd', strike(n.node))));
    var cb = cpBar(n); if (cb) c.appendChild(cb);
  }
  function fillTogo(r) { r.c.togo.textContent = num(r.n.dist) ? sp1(r.n.dist * SW().sign) : '–'; }
  function tripSvg(t, W) {
    var H = 12, Z = 18, F = 7, x0 = Z, x1 = W - F;
    var s = svgNode(W, H);
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', t < 0 ? 'Trip: the price went the other way' : 'Trip: ' + Math.round(t * 100) + '% of the way');
    el('rect', { x: x0, y: 4, width: x1 - x0, height: 4, rx: 1, fill: C.line }, s);
    if (t > 0) el('rect', { x: x0, y: 3, width: Math.max(1.5, Math.min(1, t) * (x1 - x0)), height: 6, rx: 1, fill: C.up }, s);
    else if (t < 0) {
      var Ls = Math.min(1, -t) * (Z - 3);
      el('rect', { x: x0 - Ls, y: 3, width: Math.max(1.5, Ls), height: 6, rx: 1, fill: C.down }, s);
      if (-t >= 1) el('path', { d: 'M' + (x0 - Ls + 3.5) + ' 1.5L' + (x0 - Ls) + ' 6L' + (x0 - Ls + 3.5) + ' 10.5', stroke: C.down, fill: 'none', 'stroke-width': 1.4 }, s);
    }
    el('line', { x1: x0, x2: x0, y1: 1, y2: 11, stroke: C.text, 'stroke-width': 1.2 }, s);
    el('line', { x1: x1, x2: x1, y1: 0, y2: 12, stroke: C.amber, 'stroke-width': 1.4 }, s);
    el('path', { d: 'M' + x1 + ' 0L' + (x1 + F - 0.5) + ' 2.6L' + x1 + ' 5.2Z', fill: C.amber }, s);
    return s;
  }
  function fillTrip(r) {
    var c = r.c.trip, T = r.n._trip; clear(c);
    if (!T) { c.appendChild(span('mut', '–')); return; }
    if (T.above) { c.appendChild(span('tr-l', 'was ' + SW().dir + ' the pile 20 days ago')); return; }
    c.appendChild(tripSvg(T.t, tripW()));
    c.appendChild(span('tr-l' + (T.t < 0 ? ' dn' : ' upl'), T.t < 0 ? 'went the other way' : Math.round(Math.min(1, T.t) * 100) + '%'));
  }
  function sparkSvg(ser, node, W, H) {
    var s = svgNode(W, H); s.setAttribute('aria-hidden', 'true');
    if (!ser) return s;
    var c = ser.c, lo = Math.min(num(node) ? node : Infinity, Math.min.apply(null, c)), hi = Math.max(num(node) ? node : -Infinity, Math.max.apply(null, c));
    var pd = (hi - lo) * 0.06 || hi * 0.01; lo -= pd; hi += pd;
    var X = function (i) { return 1.5 + i / (c.length - 1) * (W - 5); }, Y = lin(lo, hi, H - 1.5, 1.5);
    if (num(node)) el('line', { x1: 0, x2: W, y1: Y(node), y2: Y(node), stroke: C.amber, 'stroke-width': 1, 'stroke-dasharray': '3 2' }, s);
    var d = ''; for (var i = 0; i < c.length; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(c[i]).toFixed(1);
    el('path', { d: d, fill: 'none', stroke: C.text, 'stroke-width': 1.25, 'stroke-linejoin': 'round' }, s);
    el('circle', { cx: X(c.length - 1), cy: Y(c[c.length - 1]), r: 1.6, fill: '#fff' }, s);
    return s;
  }
  function fillSpark(r) { clear(r.c.spark); r.c.spark.appendChild(sparkSvg(r.n._spk, r.n.node, spkW(), 28)); }
  function fillOdds(r) {
    var n = r.n, c = r.c.odds; clear(c);
    if (!num(n.odds)) { c.appendChild(span('mut', '–')); return; }
    var top = span('o-top', null);
    add(top, span('ov' + (n.odds >= 0.5 ? ' hi' : ''), p0(n.odds)), ' ', span('by', 'by ' + dS(n.main_exp, true)));
    c.appendChild(top);
    var bar = span('obar', null), f = document.createElement('i'); f.style.width = Math.round(Math.max(0, Math.min(1, n.odds)) * 100) + '%'; bar.appendChild(f); c.appendChild(bar);
  }
  function fillNew(r) {
    var x = r.n._nc, c = r.c.nc; clear(c); c.className = 'c-new';
    if (!x) { c.appendChild(span('mut', '–')); c.removeAttribute('title'); return; }
    var pt = sp0(x.pct), w = ' · ' + x.w + 's';
    c.className += x.kind === 'strong' ? ' strong' : x.kind === 'down' ? ' dnc' : ' mutc';
    c.appendChild(span('nc-long', x.kind === 'strong' ? compactSigned(x.chg) + ' ' + pt + w : (x.kind === 'flat' ? 'flat' : pt) + w));
    c.appendChild(span('nc-short', SW().opts + ' ' + (x.kind === 'flat' ? 'flat' : pt)));
    c.title = SW().Opts + ' added at this strike over the last ' + x.w + ' sessions. Changes once a day.';
  }
  function fillR20(r) { var v = r.n.ret20, c = r.c.r20; c.textContent = sp1(v); c.className = 'c-r20' + (num(v) ? (v >= 0 ? ' up' : ' down') : ''); }
  function heldDots(n) {
    var txt = n._persist == null ? null : n._persist + ' of last ' + n._win + ' sessions';
    var marks = typeof n.held === 'string' && /^[fhn]+$/.test(n.held) ? n.held.split('') : null;
    if (!marks) return span('held-t', n._persist == null ? '–' : n._persist + ' of ' + n._win);
    var box = span('held', null); box.setAttribute('role', 'img'); box.setAttribute('aria-label', 'Held: ' + (txt || '–')); if (txt) box.title = txt;
    marks.forEach(function (m) { var i = document.createElement('i'); i.className = 'h' + m; box.appendChild(i); });
    return box;
  }
  function fillHeld(r) { clear(r.c.held); r.c.held.appendChild(heldDots(r.n)); }
  function pctTxt(f) { var v = f * 100; return (v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%'; }
  function fillBet(r) {
    var n = r.n, c = r.c.bet; clear(c);
    var v, lab;
    if (S.sort === 'betadv') { v = num(n.prem_adv) ? pctTxt(n.prem_adv) : '–'; lab = 'of a day'; }
    else if (S.sort === 'betday') { v = num(n.per_day_usd) ? usd(n.per_day_usd) : '–'; lab = 'per day left'; }
    else { v = usd(n.prem_usd); lab = 'in ' + SW().opts; }
    c.appendChild(span('bv', v)); c.appendChild(span('bl', lab));
    var sc = num(n.score) ? Math.round(n.score) : null;
    c.appendChild(span('bz' + (sc == null ? ' none' : n.biz_hi === true ? ' hi' : ''), sc == null ? 'no score' : 'Biz ' + sc));
    c.title = '$ in ' + SW().opts + ' ' + usd(n.prem_usd) + (num(n.prem_adv) ? ' · ' + pctTxt(n.prem_adv) + ' of a normal day’s trading' : '') +
      (num(n.per_day_usd) ? ' · ' + usd(n.per_day_usd) + ' per day left' : '');
  }
  function fillBiz(r) {
    var n = r.n, c = r.c.biz; clear(c);
    c.appendChild(span('zph', 'Business '));
    if (!num(n.score)) {
      c.appendChild(span('zv none', '–')); c.title = 'No business score (funds and a few names have none).';
      return;
    }
    var sc = Math.max(0, Math.min(100, Math.round(n.score)));
    c.appendChild(span('zv' + (n.biz_hi === true ? ' hi' : ''), String(sc)));
    c.appendChild(span('zph', '/100'));
    var bar = span('zbar', null), i = document.createElement('i'); i.style.width = sc + '%'; bar.appendChild(i); c.appendChild(bar);
    c.title = 'Business score ' + sc + ' / 100' + (n.sector ? ' · ' + n.sector : '');
  }
  function fillAll(r) { fillPills(r); fillPrice(r); fillTogo(r); fillTrip(r); fillSpark(r); fillOdds(r); fillNew(r); fillBet(r); fillBiz(r); fillR20(r); fillHeld(r); }

  function buildRow(n, demo) {
    var art = document.createElement('article');
    art.className = 'row t' + n.tier; art.setAttribute('data-sym', n.sym);
    var sid = 'd-' + safeId(n.sym);
    var b = demo ? div('rsum') : btn('rsum', null);
    if (!demo) { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', sid); }
    var r = { art: art, b: b, n: n, c: {} };
    function cell(k, cls) { var s = span(cls, null); b.appendChild(s); r.c[k] = s; return s; }
    cell('tier', 'c-tier').appendChild(tierPill(n.tier));
    var st = cell('stock', 'c-stock'), tk = span('tk', n.sym);
    if (n.name) tk.title = n.name;
    st.appendChild(tk); r.pills = span('pills', null); st.appendChild(r.pills);
    cell('price', 'c-price'); cell('togo', 'c-togo'); cell('trip', 'c-trip'); cell('spark', 'c-spark');
    cell('odds', 'c-odds'); cell('nc', 'c-new'); cell('bet', 'c-bet'); cell('biz', 'c-biz'); cell('r20', 'c-r20'); cell('held', 'c-held');
    cell('chev', 'c-chev').textContent = '›';
    r.c.chev.setAttribute('aria-hidden', 'true');
    fillAll(r);
    art.appendChild(b);
    if (!demo) {
      var det = div('detail'); det.id = sid; det.hidden = true; art.appendChild(det); r.det = det;
      b.addEventListener('click', function () { toggleRow(n.sym); });
    }
    return r;
  }
  function addRow(host, n, ghost) {
    var r = buildRow(n);
    if (ghost) { r.leftAt = ghost.at; r.leftWhy = ghost.why; r.art.classList.add('left'); fillPills(r); }
    rowRefs[n.sym] = r; host.appendChild(r.art);
    return r;
  }


  var SORTS = {
    odds: function (a, b) { return (num(b.odds) ? b.odds : -1) - (num(a.odds) ? a.odds : -1); },
    near: function (a, b) { return (num(a.dist) ? a.dist : 9) - (num(b.dist) ? b.dist : 9); },
    far: function (a, b) { return (num(b.dist) ? b.dist : -9) - (num(a.dist) ? a.dist : -9); },
    size: function (a, b) { return (num(b.gex_usd) ? b.gex_usd : -1) - (num(a.gex_usd) ? a.gex_usd : -1); },
    'new': function (a, b) { return (b._nc ? b._nc.pct : -9) - (a._nc ? a._nc.pct : -9); },
    r20: function (a, b) { return (num(b.ret20) ? b.ret20 : -9) - (num(a.ret20) ? a.ret20 : -9); },
    newest: function (a, b) { return (b.first_seen || '').localeCompare(a.first_seen || ''); },
    az: function (a, b) { return a.sym.localeCompare(b.sym); }
  };

  var RANKS = {
    bet: { f: 'prem_usd', note: 'Ranked by $ in calls: what the calls at the pile were worth at the last saved option prices. The most money parked at a far strike comes first.' },
    betadv: { f: 'prem_adv', note: 'Ranked by $ in calls compared with a normal day’s trading in the stock. A big bet in a quiet stock ranks high.' },
    betday: { f: 'per_day_usd', note: 'Ranked by $ per day left: big money on a short clock comes first.' },
    biz: { f: 'score', note: 'Ranked by the business score: a 0–100 business-quality score from reported growth, cash flow and valuation. Funds, and companies outside the large-company list the score covers or without enough reported numbers, have no score and sit at the bottom.' },
    cpall: { f: '_cpAll', cp: 'all', note: 'Ranked by calls against puts held across all of the stock’s options (open contracts, every expiry). The most call-heavy name comes first. Names with very few open contracts sit at the bottom without a number.' },
    cpwk: { f: '_cpWk', cp: 'wk', note: 'Ranked by calls against puts traded over the past week (up to five sessions), all of the stock’s options. The most call-heavy trading comes first. Volume counts contracts traded, bought or sold, so it shows where the activity is, not which way it leans. Names with very little trading sit at the bottom without a number.' },
    cpday: { f: '_cpDay', cp: 'day', note: 'Ranked by calls against puts traded on the latest day, all of the stock’s options. The most call-heavy trading comes first. Volume counts contracts traded, bought or sold, so it shows where the activity is, not which way it leans. Names with very little trading sit at the bottom without a number.' },
    combo: { f: 'combo', asc: true, note: 'All three combined: a blend of each name’s standing on $ in calls, $ per day left and the business score. Names without a business score sit at the bottom.' }
  };
  SORTS.chase = function () { return 0; };
  SORTS.fresh = function () { return 0; };
  SORTS.ewz = function () { return 0; };
  Object.keys(RANKS).forEach(function (k) {
    var f = RANKS[k].f;
    SORTS[k] = RANKS[k].asc
      ? function (a, b) { return (num(a[f]) ? a[f] : 1e15) - (num(b[f]) ? b[f] : 1e15); }
      : function (a, b) { return (num(b[f]) ? b[f] : -1) - (num(a[f]) ? a[f] : -1); };
  });
  function rkHas(rk, n) { var v = rk.val ? rk.val(n) : n[rk.f]; return num(v) || (typeof v === 'string' && v !== ''); }
  function rkNote(rk) { return typeof rk.note === 'function' ? rk.note() : rk.note; }



  var COLS = {
    tier: { t: function () { return 'Tier'; }, v: function (n) { return { AB: 4, A: 3, B: 2, C: 1 }[n.tier] || null; } },
    stock: { t: function () { return 'Stock'; }, v: function (n) { return n.sym; }, text: true },
    price: { t: function () { return 'Price'; }, v: function (n) { return n.price; } },
    togo: { t: function () { return 'To go'; }, v: function (n) { return num(n.dist) ? n.dist * SW().sign : null; } },
    trip: { t: function () { return 'Trip'; }, v: function (n) { return n._trip && !n._trip.above && num(n._trip.t) ? n._trip.t : null; } },
    spark: { t: function () { return 'Last 60 days'; }, v: function (n) { var c = n._spk && n._spk.c; return c && c.length > 1 && c[0] > 0 ? c[c.length - 1] / c[0] - 1 : null; } },
    odds: { t: function () { return 'Odds'; }, v: function (n) { return n.odds; } },
    nc: { t: function () { return 'New ' + SW().opts; }, v: function (n) { return n._nc ? n._nc.pct : null; } },
    bet: { t: function () { return '$ in ' + SW().opts; }, v: function (n) { return n.prem_usd; } },
    biz: { t: function () { return 'Business'; }, v: function (n) { return n.score; } },
    r20: { t: function () { return '20 days'; }, v: function (n) { return n.ret20; } },
    held: { t: function () { return 'Held'; }, v: function (n) { return n._persist != null && n._win ? n._persist / n._win : null; } },
    cpday: { t: function () { return 'Calls : puts traded on the latest day'; }, s: 'Calls : puts, today', v: function (n) { return n._cpDay; }, cp: 'day' },
    cpwk: { t: function () { return 'Calls : puts traded over the past week'; }, s: 'Calls : puts, week', v: function (n) { return n._cpWk; }, cp: 'wk' },
    cpall: { t: function () { return 'Calls : puts held'; }, s: 'Calls : puts, held', v: function (n) { return n._cpAll; }, cp: 'all' }
  };
  Object.keys(COLS).forEach(function (c) {
    var C = COLS[c];
    [1, 2].forEach(function (step) {
      var k = 'col:' + c + ':' + step;
      SORTS[k] = function (a, b) {
        var x = C.v(a), y = C.v(b), hx = num(x) || (C.text && !!x), hy = num(y) || (C.text && !!y);
        if (!hx || !hy) return hx === hy ? 0 : hx ? -1 : 1;
        var r = C.text ? String(x).localeCompare(String(y)) : y - x;
        return step === 2 ? -r : r;
      };
      RANKS[k] = { val: C.v, cp: C.cp, col: c, step: step, note: function () {
        var t = C.t(), first = C.text ? 'A to Z' : 'highest first', second = C.text ? 'Z to A' : 'lowest first';
        return 'Sorted by ' + t + ', ' + (step === 1 ? first : second) + '. Click it again for ' + (step === 1 ? second : 'the ranking you had before') + '.' +
          (C.text ? '' : ' Names without a number for it sit at the bottom.');
      } };
    });
  });
  function colKey(s) { var m = /^col:([a-z0-9]+):([12])$/.exec(s || ''); return m && COLS[m[1]] ? { c: m[1], step: +m[2] } : null; }
  function colClick(c) {
    var cur = colKey(S.sort);
    if (cur && cur.c === c && cur.step === 1) { setSort('col:' + c + ':2'); return; }
    if (cur && cur.c === c && cur.step === 2) {
      var b = S.colBase && !colKey(S.colBase) && (SORTS[S.colBase] || S.colBase === 'best') ? S.colBase : 'best';
      var hk = typeof isHunt === 'function' && isHunt(b) ? b : null;
      var huntOk = !!hk && !S.period && !!(P && P.side === 'calls' && P[hk]);
      var park = !!hk && !huntOk && !S.period;
      if (hk && !huntOk) b = 'best';
      var rb = RANKS[b]; if (rb && rb.cp && !(P && P.cpHave && P.cpHave[rb.cp])) b = 'best';
      S.colBase = null; setSort(b); if (park) S.chaseParked = hk;
      return;
    }
    if (!cur) S.colBase = S.sort;
    setSort('col:' + c + ':1');
  }
  function renderColHeads() {
    var cur = colKey(S.sort);
    function stateTxt(C) { return C.text ? (cur.step === 1 ? 'A to Z' : 'Z to A') : (cur.step === 1 ? 'highest first' : 'lowest first'); }
    function mark(el, on, C) {
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      var a = el.querySelector('.hs-a'); if (a) a.textContent = on ? (cur.step === 1 ? '▼' : '▲') : '';
      var v = el.querySelector('.hs-s'); if (v) v.textContent = on ? ', sorted ' + stateTxt(C) : '';
    }
    Array.prototype.forEach.call(document.querySelectorAll('#lhead .hs'), function (b) {
      var c = b.getAttribute('data-col'), on = !!cur && cur.c === c;
      mark(b, on, COLS[c]);
      b.title = on && cur.step === 1 ? 'Click for ' + (COLS[c].text ? 'Z to A' : 'lowest first') : on ? 'Click to go back to the ranking you had' : 'Sort by ' + COLS[c].t() + ': click once for ' + (COLS[c].text ? 'A to Z' : 'highest first') + ', twice for ' + (COLS[c].text ? 'Z to A' : 'lowest first') + ', three times to go back';
    });
    var lg = $('cpLegend');
    if (lg) { var onL = !!cur && !!COLS[cur.c].cp; mark(lg, onL, COLS.cpday); lg.setAttribute('aria-label', 'Sort by calls : puts' + (onL ? ', sorted ' + stateTxt(COLS.cpday) : '')); }
    var o = $('optCol');
    if (o) {
      o.hidden = o.disabled = !cur;
      o.textContent = cur ? (COLS[cur.c].s || COLS[cur.c].t()) + (COLS[cur.c].text ? (cur.step === 1 ? ' A–Z' : ' Z–A') : (cur.step === 1 ? ' ↓' : ' ↑')) : '';
      if (cur) { o.value = S.sort; $('sort').value = S.sort; }
    }
  }
  function initCols() {
    $('rankNote').setAttribute('aria-live', 'polite');
    Array.prototype.forEach.call(document.querySelectorAll('#lhead [data-col]'), function (cell) {
      var b = btn('hs', null), c = cell.getAttribute('data-col');
      b.setAttribute('data-col', c);
      Array.prototype.slice.call(cell.childNodes).forEach(function (x) {
        if (x.nodeType === 1 && x.classList.contains('ib')) return;
        if (x.nodeType === 3) { var tx = x.textContent.trim(); cell.removeChild(x); if (tx) b.appendChild(document.createTextNode(tx)); return; }
        b.appendChild(x);
      });
      b.appendChild(span('hs-a', '')).setAttribute('aria-hidden', 'true');
      b.appendChild(span('vh hs-s', ''));
      cell.insertBefore(b, cell.firstChild);
      b.addEventListener('click', function () { colClick(c); });
    });
    var lg = $('cpLegend');
    if (lg) {
      lg.setAttribute('role', 'button'); lg.tabIndex = 0; lg.classList.add('cpl-sort');
      var lt = lg.querySelector('.cpl-t'); if (lt) { lt.id = 'cplT'; lg.setAttribute('aria-describedby', 'cplT'); }
      lg.appendChild(span('hs-a', '')).setAttribute('aria-hidden', 'true');
      lg.title = 'Sort by calls : puts: click once for highest first, twice for lowest first, three times to go back';
      var go = function () { colClick('cp' + cpWin()); };
      lg.addEventListener('click', go);
      lg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    }
  }
  function allRows() {
    var out = P.names.slice();
    Object.keys(ghosts).forEach(function (k) { if (!P.by[k]) out.push(ghosts[k].n); });
    return out;
  }
  function emptyBox(text, linkText, fn) {
    var d = div('empty'); d.appendChild(document.createTextNode(text));
    if (linkText) { d.appendChild(document.createTextNode(' ')); var b = btn('linkbtn', linkText); b.addEventListener('click', fn); d.appendChild(b); }
    return d;
  }
  function renderCounts() {
    var c = P ? P.counts : null;
    Array.prototype.forEach.call(document.querySelectorAll('#tierSeg [data-count]'), function (s) {
      var k = s.getAttribute('data-count');
      s.textContent = !c ? '–' : k === 'all' ? String(P.names.length) : String(c[k]);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#tierSeg button'), function (b) {
      var k = b.getAttribute('data-tier');
      b.setAttribute('aria-pressed', k === S.tier ? 'true' : 'false');
      if (c) b.setAttribute('aria-label', (k === 'all' ? 'All' : 'Tier ' + tierName(k)) + ', ' + (k === 'all' ? P.names.length : c[k]) + ((k === 'all' ? P.names.length : c[k]) === 1 ? ' name' : ' names'));
    });
    $('sort').value = S.sort;
    if (S.sort === 'new' && P && P.side === 'puts') $('sort').value = 'newputs';
    Array.prototype.forEach.call(document.querySelectorAll('#rankBar button[data-sort]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sort') === S.sort ? 'true' : 'false'); });
    renderColHeads();
  }
  var CP_LEGEND = {
    day: ['traded on the latest day across all of the stock’s options (2.6 : 1 = 2.6 calls traded for every put). Volume shows activity, not direction. Tap a row for the past week and the open interest.'],
    wk: ['traded over the past week across all of the stock’s options (2.6 : 1 = 2.6 calls traded for every put). Volume shows activity, not direction. Tap a row for the latest day and the open interest.'],
    all: ['held across all of the stock’s options (1.2 : 1 = 1.2 open calls for every open put). Tap a row for what traded on the latest day and over the past week.']
  };
  function renderCpOpts() {
    var have = (P && P.cpHave) || {}, any = false;
    [['optCpAll', 'all'], ['optCpWk', 'wk'], ['optCpDay', 'day']].forEach(function (x) {
      var o = document.getElementById(x[0]); if (o) { o.hidden = !have[x[1]]; o.disabled = !have[x[1]]; } any = any || !!have[x[1]];
    });
    var g = document.getElementById('optgCp'); if (g) g.hidden = !any;
    var rk = RANKS[S.sort]; if (rk && rk.cp && !have[rk.cp]) S.sort = 'best';
  }
  function renderLegend() {
    $('cpLegend').hidden = !(P && P.cpHave && P.cpHave[cpWin()]);
    var t = document.querySelector('#cpLegend .cpl-t'); if (!t) return;
    clear(t); t.appendChild(document.createTextNode('Bar under each pile: '));
    var c = document.createElement('b'); c.className = 'cpl-c'; c.textContent = 'calls'; t.appendChild(c);
    t.appendChild(document.createTextNode(' against '));
    var p = document.createElement('b'); p.className = 'cpl-p'; p.textContent = 'puts'; t.appendChild(p);
    t.appendChild(document.createTextNode(' ' + CP_LEGEND[cpWin()][0]));
  }
  function renderList() {
    closePop(); renderLegend();
    var host = $('rows'); clear(host); rowRefs = {};
    if (!P) return;
    $('tierNote').hidden = S.tier !== 'C';
    $('backBest').hidden = S.sort === 'best';
    var rk = RANKS[S.sort], rankOf = {};
    if (rk) {
      P.names.filter(function (n) { return rkHas(rk, n); }).sort(function (a, b) { return SORTS[S.sort](a, b) || a._i - b._i; })
        .forEach(function (n, i) { rankOf[n.sym] = i + 1; });
      var filt = S.tier !== 'all' || !!S.q.trim();
      var among = P.list === 'all' ? 'all ' + P.names.length : 'the ' + P.names.length + ' names on ' + LISTS[P.list].label;
      $('rankNote').textContent = rkNote(rk) + (filt ? ' Showing ' + (S.tier !== 'all' ? 'tier ' + tierName(S.tier) : 'your search') + ' only; the numbers are each name’s place among ' + among + '.' : ' All tiers are ranked together' + (P.list === 'all' ? '.' : ', within ' + LISTS[P.list].label + '.'));
    }
    $('rankNote').hidden = !rk;
    if (S.period && perView()) { $('tierSeg').hidden = true; $('tierNote').hidden = true; renderPeriodList(host); return; }
    $('tierSeg').hidden = isHunt(S.sort);
    if (isHunt(S.sort)) { $('tierNote').hidden = true; renderHunt(host, S.sort); return; }
    var rows = allRows();
    if (!rows.length) { host.appendChild(emptyBox('No name passes all five checks right now. That happens: we don’t lower the bar to fill the list.')); return; }
    if (S.tier !== 'all' && !P.counts[S.tier] && !rows.some(function (n) { return n.tier === S.tier; })) {
      host.appendChild(emptyBox('No tier ' + tierName(S.tier) + ' names today.', 'Show all', function () { setTier('all'); }));
      return;
    }
    var q = S.q.trim().toUpperCase(), ql = S.q.trim().toLowerCase();
    var match = function (n) {
      if (!q || n.sym.indexOf(q) === 0) return true;
      return ql.length >= 2 && typeof n.name === 'string' && (' ' + n.name.toLowerCase()).indexOf(' ' + ql) >= 0;
    };
    var tiers = S.tier === 'all' ? TIERS : [S.tier];
    var list = rows.filter(function (n) { return tiers.indexOf(n.tier) >= 0 && match(n); });
    if (q && !list.length) {
      host.appendChild(emptyBox('No name on today’s list starts with ' + q + '.', 'Check ' + q, function () { checkTicker(q); }));
      return;
    }
    if (S.sort === 'best') {
      tiers.forEach(function (t) {
        var grp = list.filter(function (n) { return n.tier === t; });
        var showRows = t !== 'C' || S.cOpen || S.tier === 'C' || !!q;
        if (!grp.length && !(t === 'C' && !q && P.counts.C)) return;
        host.appendChild(groupHead(t, q ? grp.length : P.counts[t], showRows));
        if (showRows) grp.forEach(function (n) { addRow(host, n, ghosts[n.sym] && !P.by[n.sym] ? ghosts[n.sym] : null); });
      });
    } else {
      var hideC = S.tier === 'all' && !S.cOpen && !q && !rk, f = SORTS[S.sort] || SORTS.odds;
      list.filter(function (n) { return !(hideC && n.tier === 'C'); })
        .sort(function (a, b) { return f(a, b) || (a._i || 0) - (b._i || 0); })
        .forEach(function (n, i) {
          var r = addRow(host, n, ghosts[n.sym] && !P.by[n.sym] ? ghosts[n.sym] : null);
          if (rk && rankOf[n.sym] && P.by[n.sym]) r.c.stock.insertBefore(span('rk', String(rankOf[n.sym])), r.c.stock.firstChild);
        });
      if (hideC && P.counts.C) {
        var p = para('c-hidden', P.counts.C + ' tier C names hidden (old piles). '), b = btn('linkbtn', 'Show ' + P.counts.C);
        b.addEventListener('click', function () { setCOpen(true); }); p.appendChild(b); host.appendChild(p);
      }
    }
    Object.keys(S.open).forEach(function (sym) { if (rowRefs[sym]) openRow(rowRefs[sym], false); else delete S.open[sym]; });
  }
  function groupHead(t, n, open) {
    var h = div('grp g' + t), tx0 = span('gtx', null);
    tx0.appendChild(tierPill(t)); tx0.appendChild(document.createTextNode(' ' + GROUP_TEXT[t] + ' '));
    tx0.appendChild(span('gn', '(' + n + ')'));
    h.appendChild(tx0);
    if (t === 'C' && S.tier !== 'C' && !S.q.trim()) {
      var b = btn('linkbtn', open ? 'Hide' : 'Show ' + n); b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.addEventListener('click', function () { setCOpen(!open); });
      h.appendChild(b);
    }
    return h;
  }
  function renderSideBar() {
    var bar = $('sideBar'), have = P && P.hasPuts;
    bar.hidden = !have;
    var onp = document.getElementById('optNewPuts'); if (onp) { onp.hidden = !have; onp.disabled = !have; }
    if (!have) return;
    Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-side') === P.side ? 'true' : 'false'); });
    var note = $('sideNote');
    note.hidden = P.side !== 'puts';
    if (P.side === 'puts') note.textContent = 'Put piles are usually insurance or put selling, not bets on a fall. Public data can’t tell which. We have each stock’s top put strike from ' +
      (P.putsSince ? dS(P.putsSince) : 'Sep 8') + ', but its size (share of downside gamma) only from ' + (P.rec && P.rec.since ? dS(P.rec.since) : 'Sep 28') + ', so the put record and “Didn’t work out” start there.';
  }
  function setSide(k, fromHash) {
    k = k === 'puts' ? 'puts' : 'calls';
    S.side = k; sset('ps.side', k);
    if (!RAW) { if (!fromHash) clearHash(); return; }
    closePop(); hideCheck(); ghosts = {}; $('updateBar').hidden = true; setStick();
    S.open = {}; S.clOpen = {}; S.hitOpen = {}; S.failOpen = {};
    P = prep(RAW, S.list, k);
    if (!fromHash) clearHash();
    sideCopy();
    if (helpBuilt) helpBuilt = false;
    renderAll();
  }






  var SRCH = { gen: null, rows: null, loading: null, failedAt: 0, triedGen: null, lastQ: '' };
  var searchUrl = dataUrl.replace(/[^/]*$/, 'search.json');
  function prepSrch(list, d) {
    var by = {}, out = [];
    (Array.isArray(list) ? list : []).forEach(function (n, i) {
      if (!n || typeof n.sym !== 'string' || !num(n.price) || !num(n.node) || by[n.sym]) return;
      n._srch = true; n._i = 1e5 + i;
      if (TIERS.indexOf(n.tier) < 0) n.tier = 'C';
      n._cpAll = skewOf(n.chain_call_oi, n.chain_put_oi, CP_MIN.all); n._cpWk = skewOf(n.wk_c, n.wk_p, CP_MIN.wk); n._cpDay = skewOf(n.vol_c, n.vol_p, CP_MIN.day);
      viewName(n, d.prices_day);
      by[n.sym] = n; out.push(n);
    });
    return { list: out, by: by };
  }
  function loadSearch(cb) {
    if (SRCH.loading) { if (cb) SRCH.loading.push(cb); return; }
    SRCH.loading = cb ? [cb] : [];
    getJSON(searchUrl).then(function (d) {
      if (!d || !Array.isArray(d.names)) throw new Error('shape');
      SRCH.gen = d.generated;
      SRCH.rows = { calls: prepSrch(d.names, d), puts: prepSrch(d.puts && d.puts.names, d) };
      return true;
    }).catch(function () { SRCH.failedAt = Date.now(); return false; }).then(function (ok) {
      var f = SRCH.loading; SRCH.loading = null;
      if (ok && S.q.trim() && P) renderList();
      f.forEach(function (g) { g(ok); });
    });
  }
  function srchRow(sym) { return SRCH.rows && P ? SRCH.rows[P.side === 'puts' ? 'puts' : 'calls'].by[sym] || null : null; }
  function searchOpen(sym) {
    if (S.day || !P) return false;
    if (!SRCH.rows) {
      if (Date.now() - SRCH.failedAt < 60e3) return false;
      loadSearch(function (ok) { if (ok && srchRow(sym)) searchOpen(sym); else checkTicker(sym, true); });
      return true;
    }
    if (!srchRow(sym)) return false;
    hideCheck();
    if (S.q.trim().toUpperCase() !== sym) { S.q = sym; $('q').value = sym; }
    renderList();
    var r = rowRefs[sym]; if (!r) return false;
    if (!S.open[sym]) openRow(r, true); else setHash(sym);
    scrollToEl(r.art); flashRow(r);
    return true;
  }
  function srchWhy(n) {
    var ix = P && P.idx ? P.idx[n.sym] : null, el = ix ? offChecks(n.sym, ix) : para('', n.sym + ' isn’t on today’s list.');
    el.classList.add('why'); el.classList.add('off-why');
    return el;
  }
  function renderSearchRows(keepOpen) {
    var host = $('rows'), raw = S.q.trim(), q = raw.toUpperCase(), ql = raw.toLowerCase();
    if (raw !== SRCH.lastQ) { SRCH.lastQ = raw; S.srchAll = false; }
    if (!q || !P || S.day) return;
    if (!SRCH.rows) {
      if (!SRCH.loading && Date.now() - SRCH.failedAt >= 60e3) loadSearch();
      if (SRCH.loading) host.appendChild(para('src srch-wait', 'Looking through the other names we track…'));
      return;
    }
    if (SRCH.gen !== P.doc.generated && SRCH.triedGen !== P.doc.generated && !SRCH.loading) { SRCH.triedGen = P.doc.generated; loadSearch(); }
    var pool = SRCH.rows[P.side === 'puts' ? 'puts' : 'calls'].list.concat(P.names);
    var seen = {}, hits = [];
    pool.forEach(function (n) {
      if (rowRefs[n.sym] || seen[n.sym]) return;
      var m = n.sym === q ? 0 : n.sym.indexOf(q) === 0 ? 1 : ql.length >= 2 && typeof n.name === 'string' && (' ' + n.name.toLowerCase()).indexOf(' ' + ql) >= 0 ? 2 : -1;
      if (m < 0) return;
      seen[n.sym] = 1; hits.push({ n: n, m: m });
    });
    if (!hits.length) return;
    hits.sort(function (a, b) { return a.m - b.m || a.n.sym.localeCompare(b.n.sym); });
    var emp = host.querySelector('.empty'); if (emp) host.removeChild(emp);
    var cap = S.srchAll ? hits.length : 12;
    var head = div('grp srch-h'), t = span('gtx', null);
    t.appendChild(document.createTextNode('Other names we track' + (S.period ? ', today' : '') + ' '));
    t.appendChild(span('gn', '(' + hits.length + ')'));
    head.appendChild(t); host.appendChild(head);
    hits.slice(0, cap).forEach(function (h) { addRow(host, h.n, null); });
    if (hits.length > cap) {
      var pm = para('c-hidden', (hits.length - cap) + ' more ' + (hits.length - cap === 1 ? 'match' : 'matches') + '. '), bm = btn('linkbtn', 'Show all ' + hits.length);
      bm.addEventListener('click', function () { S.srchAll = true; renderList(); }); pm.appendChild(bm); host.appendChild(pm);
    }
    (keepOpen || []).forEach(function (sym) { var r = rowRefs[sym]; if (r && !S.open[sym]) { S.open[sym] = 1; openRow(r, false); } });
  }
  var renderTable = renderList;
  renderList = function () { var keep = Object.keys(S.open); renderTable(); renderSearchRows(keep); };
  function renderListBar() {
    var bar = $('listBar'), have = P && Object.keys(P.lists || {}).length;
    bar.hidden = !have;
    if (!have) return;
    Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) {
      var k = b.getAttribute('data-list'), ok = k === 'all' || !!P.lists[k];
      b.hidden = !ok;
      b.setAttribute('aria-pressed', k === P.list ? 'true' : 'false');
      var c = b.querySelector('[data-lcount]'); if (c) c.textContent = ok && num(P.listCounts[k]) ? String(P.listCounts[k]) : '';
      b.title = LISTS[k].title + (ok && num(P.listCounts[k]) ? ': ' + P.listCounts[k] + ' on today’s list' : '');
    });
  }
  function openLinked(sym) {
    if (S.period) {
      var pw = PERF[S.period], psd = pw && pw[P && P.side === 'puts' ? 'puts' : 'calls'];
      if (!pw && perLoading[S.period]) { perPend = sym; return; }
      if (psd && Array.isArray(psd.rows) && psd.rows.some(function (x) { return x && x.sym === sym; })) { setTimeout(function () { perLinkOpen(sym); }, 0); return; }
      S.period = null; perPend = null; S.open = {}; renderDayBar(); $('periods').hidden = true; clearHash(); renderCounts(); renderList();
    }
    var hk = huntFor(sym);
    if (hk) { setTimeout(function () { goToHuntRow(sym, hk); }, 0); return; }
    if (P.by[sym]) { setTimeout(function () { goToRow(sym, false); }, 0); return; }
    if (P.list !== 'all' && P.allSyms[sym]) { setList('all'); setTimeout(function () { goToRow(sym, false); }, 0); return; }
    checkTicker(sym);
  }
  function setList(k) {
    if (!isList(k)) k = 'all';
    S.list = k; sset('ps.list', k);
    if (!RAW) { return; }
    closePop(); ghosts = {}; $('updateBar').hidden = true; setStick();
    P = prep(RAW, k, S.side);
    var huntKeep = {}; if (isHunt(S.sort) && P[S.sort]) P[S.sort].names.forEach(function (n) { huntKeep[n.sym] = 1; });
    Object.keys(S.open).forEach(function (sym) { if (!P.by[sym] && !(typeof huntKeep !== 'undefined' && huntKeep[sym])) delete S.open[sym]; });
    renderAll();
  }
  function setTier(k) {
    leaveHunt();
    S.tier = k; if (k === 'C') { S.cOpen = true; sset('ps.cOpen', '1'); } sset('ps.tier', k); renderCounts(); renderList(); }
  function setSort(k) {
    S.chaseParked = false;
    if (typeof isHunt === 'function' && isHunt(k) && S.period) { S.period = null; S.open = {}; perPend = null; renderDayBar(); $('periods').hidden = true; clearHash(); }
    S.sort = SORTS[k] || k === 'best' ? k : 'best'; sset('ps.sort', S.sort); renderCounts(); renderList();
  }
  function setCOpen(o) { S.cOpen = o; sset('ps.cOpen', o ? '1' : '0'); renderList(); }

  function toggleRow(sym) { var r = rowRefs[sym]; if (!r) return; if (S.open[sym]) closeRow(r, true); else openRow(r, true); }
  function openRow(r, user) {
    var sym = r.n.sym;
    if (user && GEO.mode === 'card') Object.keys(S.open).forEach(function (k) { if (k !== sym && rowRefs[k]) closeRow(rowRefs[k], false); });
    S.open[sym] = 1;
    r.art.classList.add('open'); r.b.setAttribute('aria-expanded', 'true'); r.det.hidden = false;
    if (r.n.per && !r.n._full) perFull(r); else
    buildDetail(r);
    if (user) { setHash(sym); if (GEO.mode === 'card') scrollToEl(r.art); }
  }
  function closeRow(r, user) {
    var sym = r.n.sym;
    delete S.open[sym];
    r.art.classList.remove('open'); r.b.setAttribute('aria-expanded', 'false'); r.det.hidden = true; clear(r.det); r.chart = null; r.gx = null;
    if (user && parseHash().o === sym) clearHash();
  }
  function scrollToEl(node) {
    if (!node) return;
    try { node.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { node.scrollIntoView(true); }
  }
  function flashRow(r) {
    if (reduced()) return;
    r.art.classList.remove('jump'); void r.art.offsetWidth; r.art.classList.add('jump');
    setTimeout(function () { r.art.classList.remove('jump'); }, 700);
  }
  function goToRow(sym, flash) {
    var n = P && P.by[sym]; if (!n) return false;
    var re = false;
    if (leaveHunt()) re = true;
    if (S.period) { S.period = null; perPend = null; renderDayBar(); $('periods').hidden = true; clearHash(); re = true; }
    if (S.tier !== 'all' && S.tier !== n.tier) { S.tier = 'all'; sset('ps.tier', 'all'); re = true; }
    if (n.tier === 'C' && !S.cOpen && S.tier !== 'C') { S.cOpen = true; sset('ps.cOpen', '1'); re = true; }
    if (S.q && n.sym.indexOf(S.q.trim().toUpperCase()) !== 0) { S.q = ''; $('q').value = ''; re = true; }
    if (re || !rowRefs[sym]) { renderCounts(); renderList(); }
    var r = rowRefs[sym]; if (!r) return false;
    if (!S.open[sym]) openRow(r, true); else setHash(sym);
    scrollToEl(r.art);
    if (flash) flashRow(r);
    return true;
  }


  function parseHash() {
    var h = ''; try { h = decodeURIComponent(location.hash.replace(/^#/, '')); } catch (e) { h = location.hash.replace(/^#/, ''); }
    if (!h) return {};
    if (h.indexOf('=') >= 0) { var o = {}; h.split('&').forEach(function (kv) { var p = kv.split('='); o[p[0]] = p[1]; }); return { t: o.t, s: o.s, l: o.l, v: o.v, d: o.d, p: o.p, o: o.o ? o.o.toUpperCase() : null }; }
    return /^[A-Za-z0-9.\-_]{1,12}$/.test(h) ? { o: h.toUpperCase() } : {};
  }
  function viewParts(sym) {
    var a = [];
    if (S.day) a.push('d=' + S.day);
    if (S.period && (!sym || (perView() && perView().by[sym]))) a.push('p=' + S.period);
    if ((P ? P.side : S.side) === 'puts') a.push('v=puts');
    if (sym && isHunt(S.sort) && inHunt(sym, S.sort)) a.push('s=' + S.sort);
    return a;
  }
  function symHash(sym) { var a = viewParts(sym); return '#' + (a.length ? a.join('&') + '&o=' : '') + encodeURIComponent(sym); }
  function baseHash() { var a = viewParts(null); return a.length ? '#' + a.join('&') : ''; }
  function setHash(sym) { try { history.replaceState(null, '', location.pathname + location.search + symHash(sym)); } catch (e) { } }
  function clearHash() { try { history.replaceState(null, '', location.pathname + location.search + baseHash()); } catch (e) { } }


  function kick(t) { return para('d-k', t); }
  function plainEnglish(n) {
    var w = SW(), sym = n.sym, k = '$' + strike(n.node), parts = [];
    var cp = cpOf(n), own = ownOi(n), oth = othOi(n);
    if (num(own) && num(oth))
      parts.push('Traders hold ' + int(own) + ' ' + w.opts + ' at ' + k + ' against ' + int(oth) + ' ' + w.other + ' (' + (cp === Infinity ? 'no ' + w.other : ratioTxt(cp) + ' to 1') + ').');
    if (num(n.share)) parts.push('That pile is ' + p0(n.share) + ' of all the ' + w.gam + ' gamma on ' + sym + (n._persist != null ? ', and it has been the top pile in ' + n._persist + ' of the last ' + n._win + ' sessions' : '') +
      (n.first_seen ? ' (first seen ' + dS(n.first_seen) + ').' : '.'));
    var x = n._nc;
    if (x) {
      if (x.kind === 'strong' || x.kind === 'up') parts.push(int(x.chg) + ' ' + w.opts + ' were added at ' + k + ' over the last ' + x.w + ' sessions (' + sp0(x.pct) + ').');
      else if (x.kind === 'flat') parts.push('Hardly any ' + w.opts + ' were added lately.');
      else parts.push(w.Opts + ' at ' + k + ' fell ' + p0(Math.abs(x.pct)) + ' over the last ' + x.w + ' sessions.');
    }
    if (num(n.ret20)) {
      var T = n._trip, trip = !T ? '' : T.above ? '; it was ' + w.dir + ' the pile 20 days ago' : T.t > 0 ? ', ' + Math.round(Math.min(1, T.t) * 100) + '% of the way there from where it was' : ', moving away from it';
      parts.push('The price is ' + (n.ret20 >= 0 ? 'up ' : 'down ') + a1(n.ret20) + ' in 20 days' + trip + '.');
    }
    if (num(n.odds)) parts.push('The options give about a ' + p0(n.odds) + ' chance (about ' + oneIn(n.odds) + ') that ' + sym + ' trades at ' + k + ' at least once by ' + wS(n.main_exp) + '.');
    return parts.join(' ');
  }

  function whyList(n) {
    if (n._srch) return srchWhy(n);
    if (n.hunt) return huntWhy(n);
    if (n.ewz) return ewzWhy(n);
    if (n.fresh) return freshWhy(n);
    var w = SW(), ul = document.createElement('ul'); ul.className = 'why';
    var cp = cpOf(n), mv = n.mv, share = n.share;
    [
      ['Far', a1(n.dist) + ' ' + w.dir],
      ['Big', p0(share) + ' of ' + w.gam + ' gamma' + (n.big_usd === true ? ' (' + usd(n.gex_usd) + ' of gamma)' : '')],
      ['Stays put', (n._persist != null ? n._persist : '–') + ' of ' + n._win + ' sessions'],
      [w.mostly, cp === Infinity ? 'no ' + w.other : ratioTxt(cp) + ' to 1'],
      ['Reachable', (num(mv) ? mv.toFixed(1) : '–') + ' typical moves']
    ].forEach(function (x) {
      var li = document.createElement('li');
      li.appendChild(span('ok', '✓'));
      li.appendChild(document.createTextNode(x[0] + ': ' + x[1]));
      ul.appendChild(li);
    });
    return ul;
  }

  function tierLine(n) {
    var p = para('d-tier', null);
    p.appendChild(document.createTextNode(typeof n.why === 'string' ? n.why : ''));
    if (num(n.fuse)) p.appendChild(span('amber', 'Short fuse: the main expiry, ' + wS(n.main_exp) + ', is ' + n.fuse + ' days away (' + p0(n.main_share) + ' of these ' + SW().opts + ').'));
    return p;
  }
  function factsGrid(n) {
    var dl = document.createElement('dl'); dl.className = 'facts';
    function row(k, v) { var dt = document.createElement('dt'); dt.textContent = k; var dd = document.createElement('dd'); if (typeof v === 'string') dd.textContent = v; else dd.appendChild(v); dl.appendChild(dt); dl.appendChild(dd); return dd; }
    var cp = cpOf(n);
    row('$ in ' + SW().opts + ' at the pile', usd(n.prem_usd) + (num(n.prem_adv) ? ' · ' + (n.prem_adv * 100).toFixed(1) + '% of a normal day’s trading (' + usd(n.adv_usd) + ')' : ''));
    if (num(n.per_day_usd)) row('$ per day left', usd(n.per_day_usd));
    row('Business score', num(n.score) ? Math.round(n.score) + ' / 100' + (n.sector ? ' · ' + n.sector : '') : 'none (funds and some companies have no score)');
    if (n._comboRank && P.by[n.sym]) row('All three combined', '#' + n._comboRank + ' of ' + n._comboN + ' names with all three');
    row('Pile size (gamma $)', usd(n.gex_usd));
    row('Share of ' + SW().gam + ' gamma', p0(n.share));
    var held = span('', (n._persist != null ? n._persist : '–') + ' of last ' + n._win + ' sessions ');
    held.appendChild(heldDots(n)); if (held.lastChild.className === 'held-t') held.removeChild(held.lastChild);
    row('Same pile for', held);
    row('First seen', wS(n.first_seen));
    var w = SW();
    if (hasVol(n)) {
      var vd = row('Traded on ' + volDayTxt(n), int(n.vol_c) + ' calls / ' + int(n.vol_p) + ' puts (' + cpRatioTxt(n.vol_c, n.vol_p) + ' calls : puts)');
      var vb = cpBarOf(n.vol_c, n.vol_p, true, int(n.vol_c) + ' calls and ' + int(n.vol_p) + ' puts traded on ' + volDayTxt(n)); if (vb && vd) vd.appendChild(vb);
      if (hasWeek(n)) {
        var wd = row('Traded, ' + weekTxt(n), int(n.wk_c) + ' calls / ' + int(n.wk_p) + ' puts (' + cpRatioTxt(n.wk_c, n.wk_p) + ' calls : puts)');
        var wb = cpBarOf(n.wk_c, n.wk_p, true, int(n.wk_c) + ' calls and ' + int(n.wk_p) + ' puts traded, ' + weekTxt(n)); if (wb && wd) wd.appendChild(wb);
      }
    }
    var cpd = row(w.Opts + ' / ' + w.other + ' held at the pile', int(ownOi(n)) + ' / ' + int(othOi(n)) + (cp == null ? '' : cp === Infinity ? ' (no ' + w.other + ')' : ' (' + ratioTxt(cp) + ' to 1)'));
    var cbw = pileBar(n, true); if (cbw && cpd) cpd.appendChild(cbw);
    if (num(n.chain_call_oi) && num(n.chain_put_oi) && (n.chain_call_oi + n.chain_put_oi) > 0) {
      var cc = n.chain_call_oi, cq = n.chain_put_oi;
      var chd = row('Held across all of ' + n.sym + '’s options', int(cc) + ' calls / ' + int(cq) + ' puts (' + cpRatioTxt(cc, cq) + ' calls : puts)');
      var chb = cpBarOf(cc, cq, true, int(cc) + ' calls and ' + int(cq) + ' puts across all of ' + n.sym + '’s options');
      if (chb && chd) chd.appendChild(chb);
    }
    var ch = n.oi_chg || {}, miss = false;
    var nc = ['1', '3', '5'].map(function (w) { var v = ch[w]; if (!Array.isArray(v) || !num(v[0])) { miss = true; return '–'; } return sgnInt(v[0]) + ' (' + sp0(v[1]) + ')'; }).join(' / ');
    var ncv = span('', nc);
    if (miss && typeof n.oi0 === 'string') ncv.appendChild(span('mut', 'collecting since ' + dS(n.oi0)));
    row('New ' + SW().opts + ' · 1 / 3 / 5 sessions', ncv);
    row('Main expiry', wS(n.main_exp) + (num(n.main_share) ? ' · ' + p0(n.main_share) + ' of these ' + SW().opts : ''));
    row('Typical moves away', num(n.mv) ? n.mv.toFixed(1) : '–');
    var r20 = span(num(n.ret20) ? (n.ret20 >= 0 ? 'up' : 'down') : '', sp1(n.ret20)); row('Last 20 trading days', r20);
    row('From 52-week closing high', sp1(n.off_high));
    var ref = n.per ? n._settleRef : P.newest;
    var old = n.oi_settle && ref && n.oi_settle < ref;
    row('Option settle', old ? span('amber', dS(n.oi_settle) + ' (older chain)') : dS(n.oi_settle));
    Array.prototype.forEach.call(dl.querySelectorAll('.cpb-wide'), function (b, i) {
      if (i) Array.prototype.forEach.call(b.querySelectorAll('.cpb-k'), function (k) { b.removeChild(k); });
    });
    return dl;
  }
  var XCOL = ['#3987E5', '#8EC0FA', '#2E6DB8', '#B9D8FB', '#5A9BE8'];
  function expiryBlock(n) {
    var mix = (Array.isArray(n.xmix) ? n.xmix : []).filter(function (e) { return Array.isArray(e) && typeof e[0] === 'string' && num(e[1]); }).slice(0, 5);
    if (!mix.length) return null;
    var w = div(''), bar = div('xbar');
    bar.setAttribute('role', 'img');
    var lab = mix.map(function (e) { return dS(e[0], true) + ' ' + p0(e[1]); }).join(' · ');
    bar.setAttribute('aria-label', lab);
    mix.forEach(function (e, i) { var s = document.createElement('i'); s.style.width = (Math.min(1, e[1]) * 100).toFixed(2) + '%'; s.style.background = XCOL[i % XCOL.length]; bar.appendChild(s); });
    w.appendChild(kick('Where the ' + SW().opts + ' at $' + strike(n.node) + ' expire'));
    w.appendChild(bar); w.appendChild(para('xlab', lab));
    return w;
  }
  function copyLink(sym, b) {
    var url = location.origin + location.pathname + location.search + symHash(sym);
    function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy link'; }, 1500); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) done(); } catch (e) {  }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
  }
  function buildDetail(r) {
    var n = r.n, det = r.det; clear(det);
    if (r.leftWhy) det.appendChild(para('d-left', 'Left the list at ' + r.leftAt + ' ET. ' + r.leftWhy));
    if (n.per) det.appendChild(perHead(n));
    if (typeof n.name === 'string' && n.name) det.appendChild(para('d-name', n.sym + ' · ' + n.name));
    det.appendChild(kick('In plain English'));
    det.appendChild(para('d-en', plainEnglish(n)));
    var grid = div('d-grid'), left = div('d-l'), right = div('d-r');
    grid.appendChild(left); grid.appendChild(right); det.appendChild(grid);
    var ro = div('readout d-ro'); ro.setAttribute('aria-live', 'polite'); left.appendChild(ro);
    var ch = div('chart d-chart'); ch.tabIndex = 0; ch.setAttribute('role', 'group');
    ch.setAttribute('aria-label', n.sym + ' runway chart. Left and right arrows move through days.');
    left.appendChild(ch);
    var cap = para('cap', captionFor(n)); left.appendChild(cap);
    right.appendChild(kick(n._srch ? 'Why it’s not on the list' : 'Why it’s here'));
    if (n.per) right.appendChild(perWhy(n));
    right.appendChild(whyList(n)); right.appendChild(tierLine(n));
    right.appendChild(kick('The facts')); right.appendChild(factsGrid(n));
    var xb = expiryBlock(n); if (xb) right.appendChild(xb);
    if (Array.isArray(n.related) && n.related.length) {
      right.appendChild(para('rel', 'Related piles: ' + n.related.filter(function (o) { return o && o.sym; }).map(function (o) { return o.sym + ' ' + strike(o.node) + ' (' + sp1(o.dist) + ')'; }).join(' · ')));
    }
    var links = div('links');
    var a = document.createElement('a'); a.className = 'btn'; a.textContent = 'Chart on Eagle Eye ->';
    a.href = '../eagle-eye/?s=' + encodeURIComponent(n.sym); a.target = '_blank'; a.rel = 'noopener noreferrer';
    var cb = btn('btn', 'Copy link'); cb.addEventListener('click', function () { copyLink(n.sym, cb); });
    links.appendChild(a); links.appendChild(cb); right.appendChild(links);
    r.chart = { holder: ch, ro: ro, n: n };
    drawRunway(r.chart);
    r.gx = gexBlock(n, left);
  }



  var HUNT_BASE = 'https://raw.githubusercontent.com/lawrencekenshin/mii-lab/hunt-data/hunt/', HUNT_PAGE = '../gex-hunt/';
  var GX_HS = ['1M', '3M', '6M', '1Y+'], HUNT = {};
  var gxH = (function () { var v = sget('ps.gxh'); return GX_HS.indexOf(v) >= 0 ? v : '1Y+'; })();
  function huntName(sym) {
    var c = HUNT[sym];
    if (c && now() - c.at < 30 * 60 * 1000) return c.p;
    var p = getJSON(HUNT_BASE + 'names/' + encodeURIComponent(sym) + '.json');
    HUNT[sym] = { p: p, at: now() };
    p.catch(function () { delete HUNT[sym]; });
    return p;
  }
  function gxUsd(v) {
    if (!num(v)) return '–';
    var a = Math.abs(v), s = v < 0 ? '−$' : '$';
    if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M';
    return a < 1000 ? s + '0' : s + Math.round(a / 1e3) + 'K';
  }
  function gxPc(v) { if (!num(v)) return '–'; var t = Math.abs(v * 100).toFixed(0); return (+t === 0 ? '' : v >= 0 ? '+' : '−') + t + '%'; }
  function gxExp(s) { return typeof s === 'string' && s.length >= 10 ? MON[+s.slice(5, 7) - 1] + ' ' + (+s.slice(8, 10)) + ' \'' + s.slice(2, 4) : ''; }
  function gexBlock(n, host) {
    var w = div('gx'), head = div('gx-head');
    head.appendChild(kick('GEX map'));
    var seg = div('seg gx-h');
    seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Expiries in the GEX map');
    GX_HS.forEach(function (h) { var b = btn('', h); b.setAttribute('data-h', h); b.setAttribute('aria-pressed', h === gxH ? 'true' : 'false'); seg.appendChild(b); });
    head.appendChild(seg); w.appendChild(head);
    var sub = para('gx-sub', ''); w.appendChild(sub);
    var box = div('chart gx-chart'); w.appendChild(box);
    var cap = para('cap', ''); w.appendChild(cap);
    var links = div('links gx-links'), a = document.createElement('a');
    a.className = 'btn'; a.textContent = 'Open in GEX Hunt ->'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    links.appendChild(a); w.appendChild(links);
    host.appendChild(w);
    var st = { holder: box, sub: sub, cap: cap, link: a, n: n, d: null, puts: SW().key !== 'calls' };
    gxLink(st);
    seg.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-h]') : null; if (!b || b.getAttribute('data-h') === gxH) return;
      gxH = b.getAttribute('data-h'); sset('ps.gxh', gxH);
      Array.prototype.forEach.call(document.querySelectorAll('.gx-h button'), function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-h') === gxH ? 'true' : 'false'); });
      Object.keys(S.open).forEach(function (k) { var r = rowRefs[k]; if (r && r.gx) drawGex(r.gx); });
    });
    box.appendChild(span('mut', 'Loading the GEX map…'));
    huntName(n.sym).then(function (d) {
      if (!box.isConnected) return;
      st.d = d; drawGex(st);
    }, function () {
      if (!box.isConnected) return;
      clear(box); box.appendChild(span('mut', 'No GEX map for ' + n.sym + ' right now.'));
    });
    return st;
  }
  function gxLink(st) { st.link.href = HUNT_PAGE + '#v=detail&s=' + encodeURIComponent(st.n.sym) + '&h=' + encodeURIComponent(gxH) + '&x=' + (st.puts ? 'neg' : 'pos'); }
  function drawGex(st) {
    var d = st.d, n = st.n, h = st.holder, put = st.puts; if (!d) return;
    clear(h); gxLink(st);
    var side = put ? d.p : d.h, g = side && side[gxH], lv = d.lv && d.lv[gxH];
    var O = Array.isArray(d.ohlc) ? d.ohlc.filter(function (r) { return Array.isArray(r) && num(r[2]) && num(r[3]); }) : [];
    if (!g || !lv || !O.length || !num(d.spot) || !d.bars) {
      h.appendChild(span('mut', 'No ' + gxH + ' GEX map for ' + n.sym + '.')); st.sub.textContent = ''; st.cap.textContent = ''; return;
    }
    st.sub.textContent = 'GEX ' + gxH + ' · King ' + strike(lv.king) + ' · Flip ' + (num(lv.flip) ? lv.flip.toFixed(1) : '—') + ' · Net ' + gxUsd(lv.net) + ' · close ' + px(d.spot) + ' on ' + dS(d.px_day);
    var Wd = Math.max(240, Math.round(h.clientWidth || 600)), narrow = Wd < 700, Hh = GEO.mode === 'card' ? 420 : 470;
    var S0 = d.spot, L = (g.levels || []).filter(function (l) { return l && num(l.k) && num(l.gex); });
    O = O.slice(Wd < 420 ? -60 : narrow ? -90 : -130);
    var pile = num(n.node) ? n.node : null;
    var ks = L.map(function (l) { return l.k; }); if (pile !== null) ks.push(pile);
    var lvHi = Math.max.apply(null, ks.concat([S0])), lvLo = Math.min.apply(null, ks.concat([S0]));
    var lo = Math.min(Math.min.apply(null, O.map(function (r) { return r[3]; })), lvLo, S0 * 0.85) * (put ? 0.93 : 0.97);
    var hi = Math.max(Math.max.apply(null, O.map(function (r) { return r[2]; })), lvHi, S0 * 1.08) * (put ? 1.03 : 1.08);
    var padR = Math.max(58, Math.ceil(textW(hi.toFixed(2), 11, 700)) + 14), cw = Wd - padR;
    var cx1 = cw * (narrow ? 0.38 : 0.50), bx0 = cx1 + 12, bx1 = cw - (narrow ? Math.min(110, cw * 0.28) : 215);
    var top = 8, bot = Hh - 24, CS = 22, Y = lin(lo, hi, bot - CS, top + CS);
    var s = svgNode(Wd, Hh); h.appendChild(s);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', n.sym + ' GEX map, ' + gxH + ' expiries: net GEX at each strike beside the last ' + O.length + ' daily candles. King ' + strike(lv.king) + (pile !== null ? ', pile ' + strike(pile) : '') + '.');
    var ax = { fill: C.muted, 'font-size': 11 };
    var raw = (hi - lo) / 8, p10 = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var stp = [1, 2, 2.5, 5, 10].map(function (m) { return m * p10; }).filter(function (v) { return v >= raw; })[0] || 10 * p10;
    for (var p = Math.ceil(lo / stp) * stp; p < hi; p += stp) {
      el('line', { x1: 0, x2: cw, y1: Y(p), y2: Y(p), stroke: C.line, 'stroke-opacity': 0.7 }, s);
      if (Math.abs(Y(p) - Y(S0)) > 12 && !(num(lv.king) && Math.abs(Y(p) - Y(lv.king)) <= 12))
        tx(s, cw + 7, Y(p) + 4, p.toFixed(stp < 1 ? 2 : stp < 10 ? 1 : 0), ax);
    }
    el('line', { x1: cw, x2: cw, y1: 0, y2: bot, stroke: C.line }, s);
    if (g.up > 0 && L.length) {
      if (put) { var b0 = Math.min.apply(null, L.map(function (l) { return l.k; })) * 0.98; el('rect', { x: 0, y: Y(S0 * 0.98), width: cw, height: Math.max(0, Y(b0) - Y(S0 * 0.98)), fill: C.down, 'fill-opacity': 0.07 }, s); }
      else { var t0 = Math.max.apply(null, L.map(function (l) { return l.k; })) * 1.02; el('rect', { x: 0, y: Y(t0), width: cw, height: Math.max(0, Y(S0 * 1.02) - Y(t0)), fill: C.up, 'fill-opacity': 0.06 }, s); }
    }
    var cwid = cx1 / O.length;
    O.forEach(function (r, i) {
      var o = r[1], c = r[4], x = i * cwid + cwid / 2, col = c >= o ? C.up : C.down;
      el('line', { x1: x, x2: x, y1: Y(r[2]), y2: Y(r[3]), stroke: col }, s);
      if (num(o) && num(c)) el('rect', { x: x - cwid * 0.35, y: Y(Math.max(o, c)), width: Math.max(1, cwid * 0.7), height: Math.max(1, Math.abs(Y(o) - Y(c))), fill: col }, s);
    });
    var lastM = -1, lastX = -99;
    O.forEach(function (r, i) {
      var dt = new Date(r[0] * 1000), mo = dt.getUTCMonth();
      if (mo !== lastM && dt.getUTCDate() <= 7) { lastM = mo; if (i * cwid - lastX < 34) return; lastX = i * cwid; tx(s, i * cwid, Hh - 7, MON[mo], ax); }
    });
    var bars = (d.bars[gxH] || []).filter(function (b) { return Array.isArray(b) && num(b[0]) && num(b[1]) && b[0] > lo && b[0] < hi; });
    var mx = Math.max.apply(null, [1].concat(bars.map(function (b) { return Math.abs(b[1]); })));
    var kk = bars.map(function (b) { return b[0]; }).sort(function (a, b) { return a - b; }), gap = Infinity;
    for (var i = 1; i < kk.length; i++) gap = Math.min(gap, kk[i] - kk[i - 1]);
    var bh = Math.max(2, Math.min(14, isFinite(gap) ? (Y(0) - Y(gap)) * 0.75 : 6));
    function blen(v) { return Math.abs(v) / mx * (bx1 - bx0); }
    bars.forEach(function (b) {
      var k = b[0], net = b[1], len = blen(net); if (len < 0.5) return;
      var hot = k === g.kt && (put ? net < 0 : net > 0);
      var rc = el('rect', { x: bx0, y: Y(k) - bh / 2, width: len, height: bh, fill: net > 0 ? (hot ? '#3FBFAE' : C.up) : (hot ? '#FF6F6C' : C.down), opacity: 0.88 }, s);
      el('title', {}, rc).textContent = strike(k) + ': ' + gxUsd(net);
    });
    if (num(lv.king) && lv.king > lo && lv.king < hi) {
      el('line', { x1: 0, x2: cw, y1: Y(lv.king), y2: Y(lv.king), stroke: C.gold, 'stroke-width': 1.5 }, s);
      el('rect', { x: cw + 2, y: Y(lv.king) - 9, width: padR - 4, height: 18, fill: C.gold, rx: 2 }, s);
      tx(s, cw + 6, Y(lv.king) + 4, lv.king.toFixed(2), { fill: C.bg, 'font-size': 11, 'font-weight': 700 });
    }
    var wall = put ? lv.call_wall : lv.put_wall;
    if (num(wall) && wall > lo && wall < hi) {
      var pb = bars.filter(function (b) { return b[0] === wall; })[0], wc = put ? C.up : C.down, wt = (put ? 'CALL' : 'PUT') + ' WALL ' + strike(wall);
      var ww = textW(wt, 11, 600) + 14, wx = Math.max(bx0, Math.min(cw - ww - 6, bx0 + (pb ? blen(pb[1]) : 0) + 6));
      el('line', { x1: 0, x2: cw, y1: Y(wall), y2: Y(wall), stroke: wc, 'stroke-width': 1.3 }, s);
      el('rect', { x: wx, y: Y(wall) - 9, width: ww, height: 18, rx: 3, fill: wc }, s);
      tx(s, wx + ww / 2, Y(wall) + 4, wt, { fill: '#fff', 'font-size': 11, 'text-anchor': 'middle', 'font-weight': 600 });
    }
    el('line', { x1: 0, x2: cw, y1: Y(S0), y2: Y(S0), stroke: C.fear, 'stroke-dasharray': '2 3' }, s);
    el('rect', { x: cw + 2, y: Y(S0) - 9, width: padR - 4, height: 18, fill: C.fear, rx: 2 }, s);
    tx(s, cw + 6, Y(S0) + 4, S0.toFixed(2), { fill: '#fff', 'font-size': 11 });
    var showExp = Wd >= 560, pileOn = false;
    L.forEach(function (dl) {
      var yy = Y(dl.k), isK = dl.k === lv.king, isP = pile !== null && Math.abs(dl.k - pile) < 1e-6;
      if (isP) pileOn = true;
      var t = (isK ? 'KING ' : '') + (isP ? 'PILE ' : '') + strike(dl.k) + ' ' + gxPc(dl.k / S0 - 1) + ' · ' + gxUsd(dl.gex) + (showExp && dl.exp ? ' · ' + gxExp(dl.exp) : '');
      var tw = textW(t, 11, isK || isP ? 700 : 500) + 14, lx = Math.max(0, Math.min(cw - tw - 6, bx0 + blen(dl.gex) + 6));
      var fill = isK ? C.gold : put ? '#3A1D1F' : '#16302D', stroke = isP ? C.amber : isK ? C.gold : put ? '#8A3B39' : '#2F6F66', tc = isK ? C.bg : isP ? C.amber : put ? '#F3A5A3' : '#9FE0D6';
      el('rect', { x: lx, y: yy - 9, width: tw, height: 18, rx: 3, fill: fill, stroke: stroke, 'stroke-width': isP ? 2 : 1 }, s);
      tx(s, lx + tw / 2, yy + 4, t, { fill: tc, 'font-size': 11, 'text-anchor': 'middle', 'font-weight': isK || isP ? 700 : 500 });
    });
    if (pile !== null && !pileOn && pile > lo && pile < hi) {
      el('line', { x1: 0, x2: cw, y1: Y(pile), y2: Y(pile), stroke: C.amber, 'stroke-width': 1.3, 'stroke-dasharray': '6 4' }, s);
      tx(s, bx0 + 4, Y(pile) - 5, strike(pile) + ' · pile', { fill: C.amber, 'font-size': 11, 'font-weight': 700 }, true);
    }
    var nl = L.length + ' level' + (L.length === 1 ? '' : 's'), com = num(g.com) ? Math.abs(g.com * 100).toFixed(0) + '%' : '–';
    var stk = gxUsd(Math.abs(g.up || 0)), oth = g.dn ? gxUsd(Math.abs(g.dn)) : '$0';
    var xx = num(g.x) && g.up > 0 ? (g.x >= 49.9 ? '50+' : g.x.toFixed(g.x >= 10 ? 0 : 1)) + '×' : null;
    function fit(c) { for (var j = 0; j < c.length; j++) if (textW(c[j], 12.5, 600) <= cw - 16) return c[j]; return c[c.length - 1]; }
    var capStack = fit([(put ? 'PUT STACK BELOW' : 'CALL STACK ABOVE') + ' · ' + stk + ' · ' + nl + ' · centre ' + (put ? '−' : '+') + com,
      (put ? 'PUT STACK' : 'STACK') + ' · ' + stk + ' · ' + nl + ' · centre ' + (put ? '−' : '+') + com, (put ? 'PUT STACK' : 'STACK') + ' · ' + stk + ' · centre ' + (put ? '−' : '+') + com, (put ? 'PUT STACK' : 'STACK') + ' · ' + stk]);
    var capOther = fit([(put ? 'CALLS ABOVE' : 'PUTS BELOW') + ' · ' + oth + (xx ? '  →  ' + (put ? 'the put stack' : 'stack') + ' is ' + xx + (g.x >= 1 ? ' bigger' : ' the ' + (put ? 'calls' : 'puts')) : ''),
      (put ? 'CALLS ABOVE' : 'PUTS BELOW') + ' · ' + oth + (xx ? ' · stack ' + xx : ''), (put ? 'CALLS ABOVE' : 'PUTS BELOW') + ' · ' + oth]);
    tx(s, 8, top + 15, put ? capOther : capStack, { fill: '#7FD3C9', 'font-size': 12.5, 'font-weight': 600 }, true);
    tx(s, 8, bot - 6, put ? capStack : capOther, { fill: '#E88A88', 'font-size': 12.5, 'font-weight': 600 }, true);
    var pday = n.per && n.per.day ? n.per.day : S.day;
    st.cap.textContent = 'Bars = net GEX at each strike at the ' + dS(d.px_day) + ' close, open interest ' + dS(d.oi_settle) + ' settle: the same map as the GEX Hunt tab, updated once a day after the close (green = more call gamma, red = more put gamma). ' +
      (pile === null ? '' : 'The amber-outlined ' + strike(pile) + ' is this page’s pile' + (pday && pday !== d.px_day ? ' on ' + wS(pday) + ', drawn on the latest map. ' :
        lv.king === pile ? ', and it is also the king. ' : '. It is measured on the live price with this page’s own rules, so the biggest bar can sit at another strike. '));
  }
  function captionFor(n) {
    var by = wS(n.main_exp), od = p0(n.odds);
    var s = 'Shaded fan = where the price usually is by ' + by + ' (about one typical move up or down). ';
    var where = { 'in': 'inside the fan', edge: 'just outside the fan', out: 'outside the fan' }[n.fan_pos];
    return where ? s + 'The pile is ' + where + ', so the odds are ' + od + '.' : s;
  }
  function runwayRead(ch, dn, v, fan) {
    var ro = ch.ro, n = ch.n; clear(ro);
    ro.appendChild(span('d', monD(dn)));
    if (fan) { ro.appendChild(document.createTextNode(' · usual range about ' + px(fan.lo) + ' to ' + px(fan.hi) + ' · pile ' + strike(n.node))); return; }
    var x = num(n.node) && v ? n.node / v - 1 : null;
    ro.appendChild(document.createTextNode(' · ' + px(v) + (x == null ? '' : ' · ' + a1(x) + (x >= 0 ? ' under the pile' : ' above the pile'))));
  }
  function drawRunway(ch) {
    var n = ch.n, h = ch.holder; clear(h);
    var ser = n._spk;
    if (!ser) { h.appendChild(span('mut', 'No daily closes in this file.')); return; }
    var W = Math.max(260, Math.round(h.clientWidth || 300)), H = GEO.mode === 'card' ? 200 : 220;
    var L = 4, Rr = 6, T = 16, B = 20, pw = W - L - Rr, ph = H - T - B, hw = pw * 0.65, fw = pw - hw;
    var c = ser.c, d = ser.d, N = c.length, today = d[N - 1];
    var exp = n.main_exp ? dayNum(n.main_exp) : null, spanD = exp && exp > today ? exp - today : null;
    var p0v = num(n.price) ? n.price : c[N - 1], fan = [], k;

    var fh = Array.isArray(n.fan) && Array.isArray(n.fan[0]) && Array.isArray(n.fan[1]) ? n.fan : null, nf = fh ? Math.min(fh[0].length, fh[1].length) : 0;
    if (spanD && nf) {
      fan.push({ dn: today, hi: p0v, lo: p0v });
      for (k = 1; k <= nf; k++) fan.push({ dn: today + spanD * k / nf, hi: fh[0][k - 1], lo: fh[1][k - 1] });
    }
    var lo = Math.min(Math.min.apply(null, c), num(n.node) ? n.node : Infinity), hi = Math.max(Math.max.apply(null, c), num(n.node) ? n.node : -Infinity), rng = (hi - lo) || hi * 0.05;
    if (fan.length) { var fe = fan[fan.length - 1]; lo = Math.min(lo, Math.max(fe.lo, lo - rng * 0.35)); hi = Math.max(hi, Math.min(fe.hi, hi + rng * 0.35)); }
    var pd = (hi - lo) * 0.06; lo -= pd; hi += pd;
    var Y = lin(lo, hi, T + ph, T);
    function XH(i) { return L + (N > 1 ? i / (N - 1) : 1) * hw; }
    function XF(dn) { return L + hw + (spanD ? (dn - today) / spanD : 0) * fw; }
    var s = svgNode(W, H); h.appendChild(s);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', n.sym + ': the last ' + N + ' closes, the pile at ' + strike(n.node) + (fan.length ? ', and where the price usually is by ' + wS(n.main_exp) : '') + '.');
    var cid = 'rc' + (++uid), defs = el('defs', {}, s), cpth = el('clipPath', { id: cid }, defs);
    el('rect', { x: L, y: T, width: pw, height: ph }, cpth);
    var g = el('g', { 'clip-path': 'url(#' + cid + ')' }, s);
    if (fan.length) {
      var dp = 'M' + XF(today).toFixed(1) + ' ' + Y(p0v).toFixed(1);
      fan.forEach(function (f) { dp += 'L' + XF(f.dn).toFixed(1) + ' ' + Y(f.hi).toFixed(1); });
      for (var j = fan.length - 1; j >= 0; j--) dp += 'L' + XF(fan[j].dn).toFixed(1) + ' ' + Y(fan[j].lo).toFixed(1);
      el('path', { d: dp + 'Z', fill: C.fear, 'fill-opacity': 0.14 }, g);
      tx(s, XF(today + spanD * 0.7), Math.min(T + ph - 4, Math.max(T + 10, Y(p0v) + 4)), 'about', { fill: C.muted, 'font-size': 11, 'text-anchor': 'middle', 'font-style': 'italic' });
    }
    if (num(n.off_high) && n.off_high < -0.001 && num(n.price)) {
      var h52 = n.price / (1 + n.off_high);
      if (h52 > lo && h52 < hi) {
        el('line', { x1: L, x2: L + hw, y1: Y(h52), y2: Y(h52), stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '1 3' }, g);
        tx(s, L + 2, Y(h52) - 3, '52-wk high', { fill: C.muted, 'font-size': 10.5 }, true);
      }
    }
    if (n.first_seen) {
      var fsd = dayNum(n.first_seen);
      if (fsd >= d[0] && fsd <= today) {
        var xf = XH(idxOnOrAfter(d, fsd));
        el('line', { x1: xf, x2: xf, y1: T, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '1 3' }, s);
        var yfs = num(n.node) && Y(n.node) - T < 18 ? Y(n.node) + 14 : T + 9;
        tx(s, xf + 3, yfs, 'first seen', { fill: C.muted, 'font-size': 10.5 }, true);
      }
    }
    var xt = XH(N - 1);
    el('line', { x1: xt, x2: xt, y1: T, y2: T + ph, stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, s);
    if (num(n.node)) {
      var yn = Y(n.node);
      el('line', { x1: L, x2: L + pw, y1: yn, y2: yn, stroke: C.amber, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, s);
      tx(s, L + pw - 2, yn - 5, strike(n.node) + ' · pile', { fill: C.amber, 'font-size': 11.5, 'font-weight': 700, 'text-anchor': 'end' }, true);
    }
    var dl = ''; for (var i = 0; i < N; i++) dl += (i ? 'L' : 'M') + XH(i).toFixed(1) + ' ' + Y(c[i]).toFixed(1);
    el('path', { d: dl, fill: 'none', stroke: C.light, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, g);
    el('circle', { cx: xt, cy: Y(c[N - 1]), r: 3.5, fill: '#fff', stroke: C.panel, 'stroke-width': 1.5 }, s);

    var labs = [{ x: xt, t: monD(today, true) + (n.per || S.day ? '' : ' today'), a: 'middle', w: 0 }];
    if (spanD) labs.push({ x: L + pw, t: monD(exp, true), a: 'end' });
    labs.push({ x: L, t: monD(d[0], true), a: 'start' });
    var kept = [];
    labs.forEach(function (o) {
      var w = textW(o.t, 11), x0 = o.a === 'start' ? o.x : o.a === 'end' ? o.x - w : o.x - w / 2;
      if (o.a === 'middle') { x0 = Math.max(L, Math.min(L + pw - w, x0)); }
      if (kept.some(function (q) { return x0 < q.x1 + 6 && x0 + w + 6 > q.x0; })) return;
      kept.push({ x0: x0, x1: x0 + w }); tx(s, x0, H - 5, o.t, { fill: C.muted, 'font-size': 11 });
    });
    var cross = el('g', { 'pointer-events': 'none' }, s), xs = [];
    for (i = 0; i < N; i++) xs.push(XH(i));
    for (k = 1; k < fan.length; k++) xs.push(XF(fan[k].dn));
    function rest() { clear(cross); runwayRead(ch, today, c[N - 1]); }
    attachReader(h, {
      xs: xs,
      show: function (ix) {
        clear(cross);
        var x = xs[ix];
        el('line', { x1: x, x2: x, y1: T, y2: T + ph, stroke: C.white, 'stroke-width': 1, 'stroke-opacity': 0.35 }, cross);
        if (ix < N) { el('circle', { cx: x, cy: Y(c[ix]), r: 3.5, fill: '#fff', stroke: C.bg, 'stroke-width': 1.2 }, cross); runwayRead(ch, d[ix], c[ix]); }
        else { var f = fan[ix - N + 1]; runwayRead(ch, Math.round(f.dn), null, f); }
      },
      rest: rest
    });
    rest();
  }
  function miniChart(holder, ser, o) {
    clear(holder);
    if (!ser) { holder.appendChild(span('mut', 'No daily closes in this file.')); return; }
    var W = Math.max(240, Math.round(holder.clientWidth || 300)), H = o.H, L = 4, Rr = 6, T = 12, B = 18, pw = W - L - Rr, ph = H - T - B;
    var c = ser.c, d = ser.d, N = c.length, vals = c.slice();
    if (num(o.node)) vals.push(o.node);
    if (o.hit && num(o.hit.v)) vals.push(o.hit.v);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pd = (hi - lo) * 0.08 || hi * 0.02; lo -= pd; hi += pd;
    var X = function (i) { return L + (N > 1 ? i / (N - 1) : 0) * pw; }, Y = lin(lo, hi, T + ph, T);
    var s = svgNode(W, H); holder.appendChild(s);
    s.setAttribute('role', 'img'); s.setAttribute('aria-label', o.label || 'Price line with the pile');
    if (num(o.node)) {
      el('line', { x1: L, x2: L + pw, y1: Y(o.node), y2: Y(o.node), stroke: C.amber, 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }, s);
      tx(s, L + pw - 2, Y(o.node) - 4, strike(o.node) + ' · pile', { fill: C.amber, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end' }, true);
    }
    var dl = ''; for (var i = 0; i < N; i++) dl += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(c[i]).toFixed(1);
    el('path', { d: dl, fill: 'none', stroke: C.light, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, s);
    if (o.seen != null && o.seen >= d[0] && o.seen <= d[N - 1]) { var si = idxOnOrAfter(d, o.seen); el('circle', { cx: X(si), cy: Y(num(o.seenV) ? o.seenV : c[si]), r: 4, fill: C.bg, stroke: C.light, 'stroke-width': 1.8 }, s); }
    if (o.hit && o.hit.dn != null && o.hit.dn >= d[0] && o.hit.dn <= d[N - 1]) { var hi2 = idxOnOrAfter(d, o.hit.dn); el('circle', { cx: X(hi2), cy: Y(num(o.hit.v) ? o.hit.v : c[hi2]), r: 4.5, fill: C.gold, stroke: C.bg, 'stroke-width': 1.5 }, s); }
    if (o.today) el('circle', { cx: X(N - 1), cy: Y(c[N - 1]), r: 3, fill: '#fff' }, s);
    tx(s, L, H - 4, monD(d[0], true), { fill: C.muted, 'font-size': 10.5 });
    tx(s, L + pw, H - 4, monD(d[N - 1], true), { fill: C.muted, 'font-size': 10.5, 'text-anchor': 'end' });
  }


  var CHECK_ORDER = ['far', 'big', 'persist', 'calls', 'reach'];
  function hideCheck() { var c = $('checkCard'); c.hidden = true; clear(c); }


  function offChecks(sym, ix) {
    var w = SW(), fail = ix[1], node = ix[2], dist = ix[3], share = ix[4], val = ix[5];
    if (fail === 'below' || fail === 'above') return para('', sym + '’s biggest ' + w.opt + ' pile is at or ' + w.away + ' the price, so there’s nothing to seek ' + w.seek + '.');
    if (fail === 'nopile') return para('', sym + ' has no strike where ' + w.opts + ' outweigh ' + w.other + ' today, so there’s no ' + w.opt + ' pile to seek.');
    if (fail === 'nochain') return para('', sym + ' has no usable option chain or price history today, so it can’t be checked.');
    var ul = document.createElement('ul'), fi = CHECK_ORDER.indexOf(fail);
    var PASS = {
      far: '✓ Far: its biggest ' + w.opt + ' pile (' + strike(node) + ') is ' + a1(dist) + ' ' + w.dir + ' the price.',
      big: '✓ Big: the pile holds ' + p0(share) + ' of ' + w.gam + ' gamma.',
      persist: '✓ Stays put.', calls: '✓ ' + w.mostly + '.', reach: '✓ Reachable.'
    };
    var FAIL = {
      far: '✗ Far: its biggest ' + w.opt + ' pile (' + strike(node) + ') is only ' + a1(dist) + ' ' + w.dir + ' the price: not far enough.',
      big: '✗ Big: the pile holds ' + p0(share) + ' of ' + w.gam + ' gamma: not big enough.',
      persist: '✗ Stays put: the top strike was the same in only ' + (num(val) ? val : '–') + ' of the last 10 sessions: hasn’t stayed put.',
      calls: '✗ ' + w.mostly + ': ' + (num(val) ? ratioTxt(val) : '–') + ' ' + w.opts + ' per ' + w.other.replace(/s$/, '') + ' at that strike: not ' + w.mostly.toLowerCase() + '.',
      reach: '✗ Reachable: ' + (num(val) ? val.toFixed(1) : '–') + ' typical moves away: out of reach.'
    };
    var LABEL = { far: 'Far', big: 'Big', persist: 'Stays put', calls: w.mostly, reach: 'Reachable' };
    CHECK_ORDER.forEach(function (k, i) {
      var li = document.createElement('li');
      if (fi < 0 || i < fi) li.textContent = PASS[k];
      else if (i === fi) { li.className = 'first-fail'; li.textContent = FAIL[k]; }
      else li.textContent = '– ' + LABEL[k] + ': not evaluated.';
      ul.appendChild(li);
    });
    return ul;
  }
  function checkTicker(raw, noSearch) {
    var sym = String(raw || '').trim().toUpperCase();
    if (!sym || !P) return;
    if (P.by[sym]) { hideCheck(); goToRow(sym, true); return; }
    if (!noSearch && searchOpen(sym)) return;
    var card = $('checkCard'); clear(card); card.hidden = false;
    if (P.list !== 'all' && P.allSyms[sym]) {
      var h0 = div('cc-h'), x0 = btn('x-btn', '✕'); x0.setAttribute('aria-label', 'Close the check'); x0.addEventListener('click', hideCheck);
      h0.appendChild(add(document.createElement('b'), sym + ' is on today’s whole list, but not in ' + LISTS[P.list].label + '.')); h0.appendChild(x0); card.appendChild(h0);
      var go = btn('btn', 'Show it on the whole list'); go.addEventListener('click', function () { hideCheck(); setList('all'); goToRow(sym, true); });
      card.appendChild(go); return;
    }
    var ix = P.idx ? P.idx[sym] : null, inCl = P.closing.filter(function (c) { return c.sym === sym; })[0];
    var hit = P.hits.filter(function (h) { return h.sym === sym; })[0];
    var head = div('cc-h'), x = btn('x-btn', '✕'); x.setAttribute('aria-label', 'Close the check'); x.addEventListener('click', hideCheck);
    var w = SW();
    if (P.idx && !ix && !inCl && !hit) {
      var onL = ['wl', 'spx', 'ndx'].filter(function (k) { return P.lists[k] && P.lists[k][sym]; })[0];
      head.appendChild(span('', onL
        ? sym + ' is on ' + LISTS[onL].label + ', but we don’t keep an option chain for it' + (onL === 'wl' ? ' (the sweep leaves out leveraged and inverse funds, crypto and the VIX, and some names have no usable chain).' : ' (no usable chain today).')
        : 'We don’t keep option chains for ' + sym + '. We track ' + (P.universeAll != null ? int(P.universeAll) : 'about 590') + ' names: the S&P 500, the Nasdaq-100 and the optionable names on Watchlist 1.'));
      head.appendChild(x); card.appendChild(head); return;
    }
    head.appendChild(add(document.createElement('b'), sym + ' isn’t on today’s list.')); head.appendChild(x); card.appendChild(head);
    if (ix) card.appendChild(offChecks(sym, ix));
    else if (!P.idx) card.appendChild(para('mut', 'The 5-check detail for names off the list comes with the next version of the data file.'));
    if (inCl || hit) {
      var lk = para('cc-links', null);
      if (inCl) { var b1 = btn('linkbtn', 'It’s in Closing in.'); b1.addEventListener('click', function () { goToClosing(sym); }); lk.appendChild(b1); }
      if (hit) { if (inCl) lk.appendChild(document.createTextNode(' ')); var b2 = btn('linkbtn', 'Its pile ' + strike(hit.node) + ' was reached on ' + dS(hit.reached) + '.'); b2.addEventListener('click', function () { goToHit(sym); }); lk.appendChild(b2); }
      card.appendChild(lk);
    }
  }
  function goToClosing(sym) {
    var list = sortedClosing(), i = list.map(function (c) { return c.sym; }).indexOf(sym);
    if (i >= 5 && !S.closingAll) { S.closingAll = true; renderClosing(); }
    S.clOpen[sym] = 1; renderClosing();
    var node = document.querySelector('#closingRows .cl[data-sym="' + cssEsc(sym) + '"]');
    scrollToEl(node || $('closing'));
  }
  function goToHit(sym) {
    var node = document.querySelector('#hitRows .hl[data-sym="' + cssEsc(sym) + '"]');
    scrollToEl(node || $('hits'));
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }


  function sortedClosing() {
    return P.closing.slice().sort(function (a, b) { return (b._touched ? 1 : 0) - (a._touched ? 1 : 0) || (num(a.dist) ? a.dist : 9) - (num(b.dist) ? b.dist : 9); });
  }
  function renderClosing() {
    var sec = $('closing'); sec.hidden = false;
    var list = sortedClosing(), host = $('closingRows'); clear(host);
    $('closingH').textContent = 'Closing in (' + list.length + ')';
    if (!list.length) host.appendChild(para('src', 'None right now.'));
    (S.closingAll ? list : list.slice(0, 5)).forEach(function (c) { host.appendChild(closingRow(c)); });
    var more = $('closingMore');
    more.hidden = list.length <= 5;
    more.textContent = S.closingAll ? 'Show fewer' : 'Show all ' + list.length;
    more.setAttribute('aria-expanded', S.closingAll ? 'true' : 'false');
    Object.keys(S.clOpen).forEach(function (k) { var w = host.querySelector('.cl[data-sym="' + cssEsc(k) + '"]'); if (w && w._draw) w._draw(); });
  }
  function closingRow(c) {
    var w = div('cl' + (c._touched ? ' touched' : '')), id = 'cl-' + safeId(c.sym);
    w.setAttribute('data-sym', c.sym);
    var b = btn('cl-sum', null); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
    var t = span('cl-txt', null);
    var sep = function () { return span('sep', ' · '); };
    add(t, span('tk', c.sym), sep(), span('', px(c.price) + ' → ' + strike(c.node)), sep());
    var ext = sideExt(c);
    if (c._touched) add(t, span('', 'TOUCHED today' + (num(ext) ? ' · ' + SW().ext + ' ' + px(ext) : '') + '. ' +
      (P.doc.state === 'LIVE' ? 'Counts as a hit once the close confirms it.' : 'It joins Recent hits at the next record update.')));
    else {
      add(t, span('togo', a1(c.dist) + ' to go'), sep(), span('seen', 'first seen ' + dS(c.first_seen) + ' at ' + px(c.spot_first) + ' (' + a1(c.dist_first) + ' away)'));
      if (num(c.way)) add(t, sep(), span('', p0(c.way) + ' of the way'));
    }
    b.appendChild(t);
    var sp = span('cl-sp', null); sp.appendChild(sparkSvg(c._spk, c.node, 128, 28)); b.appendChild(sp);
    var ch = span('c-chev', '›'); ch.setAttribute('aria-hidden', 'true'); b.appendChild(ch);
    w.appendChild(b);
    var det = div('cl-det'); det.id = id; det.hidden = true; w.appendChild(det);
    w._draw = function () {
      w.classList.add('open'); b.setAttribute('aria-expanded', 'true'); det.hidden = false;
      miniChart(det, c._spk, { H: 120, node: c.node, seen: c.first_seen ? dayNum(c.first_seen) : null, seenV: c.spot_first, today: true, label: c.sym + ': the last closes and the pile at ' + strike(c.node) });
    };
    b.addEventListener('click', function () {
      if (S.clOpen[c.sym]) { delete S.clOpen[c.sym]; w.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); det.hidden = true; clear(det); }
      else { S.clOpen[c.sym] = 1; w._draw(); }
    });
    return w;
  }


  function netDir() { return S.netDir || (P && P.side === 'puts' ? 'neg' : 'pos'); }
  function openNetName(x) {
    if (P.by[x.sym]) { goToRow(x.sym, true); return; }
    var other = P.side === 'puts' ? 'calls' : 'puts';
    if (typeof setSide === 'function' && ((other === 'puts' && x.onP) || (other === 'calls' && x.onC))) { setSide(other); setTimeout(function () { goToRow(x.sym, true); }, 0); return; }
    checkTicker(x.sym); scrollToEl($('filters'));
  }
  function renderNet() {
    var sec = $('netTop'), rows = P.net;
    sec.hidden = !rows; $('netJump').hidden = !rows;
    if (!rows) return;
    var open = S.netOpen, tog = $('netTog');
    tog.textContent = open ? 'Hide' : 'Show'; tog.setAttribute('aria-expanded', open ? 'true' : 'false');
    $('netBody').hidden = !open;
    if (!open) return;
    var dir = netDir();
    Array.prototype.forEach.call(document.querySelectorAll('#netSeg button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-nd') === dir ? 'true' : 'false'); });
    var list = rows.filter(function (x) { return dir === 'pos' ? x.net > 0 : x.net < 0; })
      .sort(function (a, b) { return dir === 'pos' ? b.net - a.net : a.net - b.net; });
    var host = $('netRows'); clear(host);
    if (!list.length) { host.appendChild(para('src', 'No name on this list has ' + (dir === 'pos' ? 'positive' : 'negative') + ' net GEX today.')); }
    var top = list.length ? Math.abs(list[0].net) : 1, cap = S.netAll ? list.length : 25;
    list.slice(0, cap).forEach(function (x, i) {
      var w = div('nt'), b = btn('nt-sum', null);
      b.setAttribute('aria-label', x.sym + ', net GEX ' + (x.net < 0 ? 'minus ' : '') + usd(Math.abs(x.net)));
      var l1 = span('nt-1', null);
      add(l1, span('rk', String(i + 1)), span('tk', x.sym), span('nt-v ' + (x.net < 0 ? 'neg' : 'pos'), (x.net < 0 ? '−' : '+') + usd(Math.abs(x.net))));
      if (x.onC) l1.appendChild(span('pill p-a', 'Calls list'));
      if (x.onP) l1.appendChild(span('pill p-down', 'Puts list'));
      var bar = span('nt-bar ' + (x.net < 0 ? 'neg' : 'pos'), null), bi = document.createElement('i'); bi.style.width = Math.max(2, Math.round(Math.abs(x.net) / top * 100)) + '%'; bar.appendChild(bi);
      var l2 = span('nt-2', px(x.price) +
        (num(x.ck) ? ' · biggest call pile ' + strike(x.ck) + (num(x.cd) ? ' (' + sp1(x.cd) + ')' : '') : '') +
        (num(x.pk) ? ' · biggest put pile ' + strike(x.pk) + (num(x.pd) ? ' (' + sp1(-x.pd) + ')' : '') : '') +
        (num(x.score) ? ' · biz ' + Math.round(x.score) : ''));
      b.appendChild(l1); b.appendChild(bar); b.appendChild(l2);
      var ch = span('c-chev', '›'); ch.setAttribute('aria-hidden', 'true'); b.appendChild(ch);
      b.addEventListener('click', function () { openNetName(x); });
      w.appendChild(b); host.appendChild(w);
    });
    var more = $('netMore');
    more.hidden = list.length <= 25;
    more.textContent = S.netAll ? 'Show fewer' : 'Show all ' + list.length;
    more.setAttribute('aria-expanded', S.netAll ? 'true' : 'false');
  }


  var FAIL_SORTS = {
    size: function (a, b) { return (b.gex0 || 0) - (a.gex0 || 0); },
    biz: function (a, b) { return (num(b.score) ? b.score : -1) - (num(a.score) ? a.score : -1); },
    closest: function (a, b) { return (num(b.closest) ? b.closest : -1) - (num(a.closest) ? a.closest : -1); },
    newest: function (a, b) { return (b.first_seen || '').localeCompare(a.first_seen || ''); }
  };
  function outcomeText(f) {
    if (f.outcome === 'expired') return 'Ran out of time' + (f.main_exp ? ' · expired ' + dS(f.main_exp) : '');
    if (f.outcome === 'left') return 'Pile gone ' + (f.left_day ? dS(f.left_day) : 'today') + (num(f.left_to) ? ' · the top strike moved to ' + strike(f.left_to) : '') +
      (f.exp_known === false ? ' · expiry not on record' : '');
    return 'Wrong way · now ' + a1(f.now_dist) + ' away (was ' + a1(f.dist0) + ')';
  }
  function failedRow(f) {
    var key = f.sym + '@' + f.node, w = div('cl fl'), id = 'fl-' + safeId(f.sym + '-' + f.node);
    var b = btn('cl-sum', null); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
    var t = span('cl-txt', null), sep = function () { return span('sep', ' · '); };
    add(t, span('tk', f.sym), sep(), span('', strike(f.node) + ' pile'), sep(), span('fo fo-' + f.outcome, outcomeText(f)));
    var t2 = span('fl-meta', 'tracked from ' + dS(f.first_seen) + ' at ' + px(f.spot0) + ', ' + a1(f.dist0) + ' away');
    if (num(f.closest)) add(t2, span('sep', ' · '), span('', 'closest: ' + p0(f.closest) + ' of the way'));
    if (num(f.gex0)) add(t2, span('sep', ' · '), span('', usd(f.gex0) + ' of gamma'));
    if (num(f.score)) add(t2, span('sep', ' · '), span('', 'biz ' + Math.round(f.score)));
    t.appendChild(document.createElement('br')); t.appendChild(t2);
    var pills = span('pills', null);
    if (f.made_list) { var p1 = span('pill p-bord', 'Best match'); p1.title = 'Was a best match when we tracked it.'; pills.appendChild(p1); }
    if (f.big_bet) { var p2 = span('pill p-new', 'Big bet'); p2.title = usd(f.gex0) + ' of gamma when first seen.'; pills.appendChild(p2); }
    if (pills.firstChild) { t.appendChild(document.createTextNode(' ')); t.appendChild(pills); }
    b.appendChild(t);
    var ch = span('c-chev', '›'); ch.setAttribute('aria-hidden', 'true'); b.appendChild(ch);
    w.appendChild(b);
    var det = div('cl-det'); det.id = id; det.hidden = true; w.appendChild(det);
    var draw = w._draw = function () {
      w.classList.add('open'); b.setAttribute('aria-expanded', 'true'); det.hidden = false;
      miniChart(det, f._path, { H: 110, node: f.node, seen: f.first_seen ? dayNum(f.first_seen) : null, seenV: f.spot0, today: true,
        label: f.sym + ': closes from first seen, and the pile at ' + strike(f.node) });
    };
    b.addEventListener('click', function () {
      if (S.failOpen[key]) { delete S.failOpen[key]; w.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); det.hidden = true; clear(det); }
      else { S.failOpen[key] = 1; draw(); }
    });
    if (S.failOpen[key]) setTimeout(draw, 0);
    return w;
  }
  function renderFailed() {
    var sec = $('failed'), F = P.failed;
    sec.hidden = !F;
    if (!F) return;
    var cc = F.counts || {}, c = (cc.all && typeof cc.all === 'object') ? (cc[S.failBy] || cc.all) : cc;
    $('failedSub').textContent = 'Best matches and big bets (the largest piles) since ' + dS(F.since || P.rec.since) +
      ' that the price hasn’t reached: the pile went away first, its main expiry passed first, or the price is now further from it than when we first saw it. Most piles haven’t resolved yet, so “wrong way” can still turn around. A pile that went away or ran out of time leaves this list 20 sessions later; the counts above keep every one. There is no “all three combined” filter here: that needs option prices, which we have only kept since Sep 28.';
    var tl = $('failedTally'); clear(tl);
    [['worked', 'Worked', 'reached the pile'], ['left', 'Pile gone', 'the pile went away first'], ['expired', 'Ran out of time', 'main expiry passed first'],
      ['wrong_way', 'Wrong way', 'further away now'], ['working', 'Still working', 'closer than at first']].forEach(function (x) {
      var t = div('ft ft-' + x[0]); t.appendChild(span('ft-v', num(c[x[0]]) ? String(c[x[0]]) : '–')); t.appendChild(span('ft-k', x[1])); t.title = x[2]; tl.appendChild(t);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#failSeg button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fb') === S.failBy ? 'true' : 'false'); });
    $('failSort').value = S.failSort;
    var list = F.names.filter(function (f) { return S.failBy === 'all' || (S.failBy === 'list' ? !!f.made_list : !!f.big_bet); })
      .sort(function (a, b) { return FAIL_SORTS[S.failSort](a, b) || a._i - b._i; });
    var host = $('failedRows'); clear(host);
    if (!list.length) host.appendChild(para('src', 'Nothing here for this view.'));
    var cap = S.failAll ? list.length : 25;
    list.slice(0, cap).forEach(function (f) { host.appendChild(failedRow(f)); });
    var more = $('failedMore');
    more.hidden = list.length <= 25;
    more.textContent = S.failAll ? 'Show fewer' : 'Show all ' + list.length;
    more.setAttribute('aria-expanded', S.failAll ? 'true' : 'false');
  }


  function onListFirst(h) {
    if (!('q_day' in h)) return '–';
    return h.q_day ? 'Yes, from ' + dS(h.q_day) : 'No: reached before it passed all 5 checks';
  }
  function renderHits() {
    $('hits').hidden = false;
    var rec = P.rec;
    $('hitsCount').textContent = 'Counting since ' + dS(rec.since) + ': ' + (num(rec.tracked) ? int(rec.tracked) : '–') + ' far piles tracked, ' + (num(rec.reached) ? int(rec.reached) : '–') +
      ' reached, ' + (num(rec.still_open) ? int(rec.still_open) : '–') + ' still open, ' + (P.missed != null ? int(P.missed) : '–') + ' ran out of time.';
    var host = $('hitRows'); clear(host);
    if (!P.hits.length) host.appendChild(para('src', 'No far pile has been reached yet.'));
    P.hits.forEach(function (h) {
      var w = div('hl'), canOpen = !!h._path, sum = canOpen ? btn('hl-sum', null) : div('hl-sum');
      w.setAttribute('data-sym', h.sym);
      var first = onListFirst(h);
      add(sum, span('h-stk tk', h.sym), span('h-pile', strike(h.node)),
        add(span('h-seen', null), span('hk', 'first seen '), dS(h.first_seen) + ' · ' + px(h.spot) + ' (' + a1(h.dist) + ' away)'),
        add(span('h-reach', null), span('hk', 'reached '), dS(h.reached) + (num(h[SW().ext]) ? ' · ' + SW().ext + ' ' + px(h[SW().ext]) : '') + (num(h.sessions) ? ' · ' + h.sessions + ' sessions' : '')),
        add(span('h-first' + (/^Yes/.test(first) ? ' yes' : ''), null), span('hk', 'On the list first? '), first));
      var ch = span('c-chev', canOpen ? '›' : ''); ch.setAttribute('aria-hidden', 'true'); sum.appendChild(ch);
      w.appendChild(sum);
      if (canOpen) {
        var det = div('hl-det'), id = 'hl-' + safeId(h.sym) + '-' + safeId(h.node); det.id = id; det.hidden = true; w.appendChild(det);
        sum.setAttribute('aria-expanded', 'false'); sum.setAttribute('aria-controls', id);
        var key = h.sym + '|' + h.node;
        var draw = function () {
          w.classList.add('open'); sum.setAttribute('aria-expanded', 'true'); det.hidden = false;
          var hd = h.reached ? dayNum(h.reached) : null;
          miniChart(det, h._path, { H: 90, node: h.node, seen: h.first_seen ? dayNum(h.first_seen) : null, seenV: h.spot, hit: { dn: hd, v: h[SW().ext] }, label: h.sym + ': from first seen to the touch of ' + strike(h.node) });
        };
        sum.addEventListener('click', function () {
          if (S.hitOpen[key]) { delete S.hitOpen[key]; w.classList.remove('open'); sum.setAttribute('aria-expanded', 'false'); det.hidden = true; clear(det); }
          else { S.hitOpen[key] = 1; draw(); }
        });
        if (S.hitOpen[key]) setTimeout(draw, 0);
      }
      host.appendChild(w);
    });

    var ms = P.missList || [], n = P.missed != null ? P.missed : ms.length;
    $('missesH').textContent = 'Ran out of time (' + n + ')';
    var mh = $('missRows'); clear(mh);
    if (!ms.length) mh.appendChild(para('src', 'None yet. That isn’t good news: the first main expiries are ' + firstExpWords() + ', and most piles expire in December or January.'));
    ms.forEach(function (m) {
      mh.appendChild(para('miss', m.sym + ' · pile ' + strike(m.node) + ' · first seen ' + dS(m.first_seen) + ' · odds then ' + (num(m.q_odds) ? p0(m.q_odds) : '–') +
        ' · main expiry ' + dS(m.main_exp) + ' passed · got ' + (num(m.closest) ? p0(m.closest) + ' of the way' : 'no closer than at first')));
    });
  }
  function firstExpWords() { var e = P.byExp && P.byExp[0]; return e ? dS(e.exp) : 'Oct 16'; }


  function renderScore() {
    $('score').hidden = false;
    var rec = P.rec, bd = P.board || {};
    var hitsQ = P.hits.filter(function (h) { return 'q_day' in h; }), k = hitsQ.length === P.hits.length && P.hits.length ? P.hits.filter(function (h) { return !!h.q_day; }).length : null;
    var T = $('scoreTiles'); clear(T);
    function tile(kk, v, small, note) {
      var t = div('tile'); t.appendChild(span('t-k', kk));
      var tv = span('t-v', v); if (small) tv.appendChild(add(document.createElement('small'), small)); t.appendChild(tv);
      if (note) t.appendChild(span('t-n', note));
      T.appendChild(t);
    }
    tile('REACHED', num(rec.reached) ? int(rec.reached) : '–');
    tile('STILL OPEN', num(rec.still_open) ? int(rec.still_open) : '–');
    tile('RAN OUT OF TIME', P.missed != null ? int(P.missed) : '–');
    tile('ON THE LIST FIRST', k != null ? String(k) : '–', 'of ' + (num(rec.reached) ? int(rec.reached) : '–'), 'the others were reached before they could pass all 5 checks');

    var cal = $('cal'); clear(cal);
    cal.appendChild(para('cal-t', 'When the piles on today’s list resolve'));
    var rows = P.byExp.slice(0, 4).map(function (e) { return { t: dS(e.exp, true), n: e.n }; });
    var later = P.byExp.slice(4).reduce(function (a, e) { return a + e.n; }, 0);
    if (P.byExp.length > 4) rows.push({ t: 'later', n: later });
    var mx = Math.max.apply(null, rows.map(function (r) { return r.n; }).concat([1]));
    if (!rows.length) cal.appendChild(para('src', 'No piles on today’s list.'));
    rows.forEach(function (r) {
      var row = div('cal-row'); row.appendChild(span('', r.t));
      var bw = span('', null), bar = span('cal-bar', null); bar.style.width = (r.n / mx * 100).toFixed(1) + '%'; bw.appendChild(bar); row.appendChild(bw);
      row.appendChild(span('cal-n', String(r.n))); cal.appendChild(row);
    });

    var N = P.names.length, lt = P.late;
    $('earlyBias').textContent = 'Too early to grade. Hits can come any day, but a miss only counts when the expiry passes' +
      (lt ? ', and ' + lt.n + ' of the ' + N + ' piles on today’s list expire ' + dS(lt.cut) + ' or later' : '') + '. So for months the record will look better than it really is.';
    var ts = typeof bd.start === 'string' ? dayNum(bd.start) : null;
    $('testBox').textContent = 'The test, written down Sat Oct 3, 2026: from ' + (ts ? wmd(ts) : 'Mon Oct 5') + ' on, every pile that joins the list is scored against the odds it had that day. ' +
      'Once enough piles have resolved, we compare how many were reached with what the odds said, overall and by tier. Piles from before ' + (ts ? monD(ts) : 'Oct 5') + ' are shown above but not scored.';
    var closed = num(bd.closed) ? bd.closed : 0, need = num(bd.need) && bd.need > 0 ? bd.need : null;
    $('progT').textContent = 'Scored so far: ' + closed + ' of the ' + (need != null ? need : '–') + ' we need';
    var pg = $('prog'); pg.setAttribute('aria-valuemax', need != null ? String(need) : ''); pg.setAttribute('aria-valuenow', String(closed));
    pg.setAttribute('aria-label', 'Scored so far: ' + closed + ' of ' + (need != null ? need : '–'));
    pg.firstChild.style.width = (need ? Math.min(100, closed / need * 100) : 0).toFixed(1) + '%';
    renderScoreTable();
  }
  function renderScoreTable() {
    var bd = P.board || {}, early = bd.early !== false;
    Array.prototype.forEach.call(document.querySelectorAll('#scoreSeg button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sv') === S.scoreBy ? 'true' : 'false'); });
    var tb = $('scoreTable'); clear(tb); tb.classList.toggle('greyed', early);
    var cap = tb.createCaption(); cap.textContent = early ? 'Greyed until enough piles have resolved. Raw counts only.' : 'Odds said = how many the odds expected to be reached.';
    var hr = tb.createTHead().insertRow();
    [S.scoreBy === 'odds' ? 'Odds when listed' : 'Tier', 'Resolved', 'Reached', 'Odds said', 'Verdict'].forEach(function (h, i) { var th = document.createElement('th'); th.textContent = h; if (i === 4) th.className = 'vd'; hr.appendChild(th); });
    var body = tb.createTBody();

    (Array.isArray(bd[S.scoreBy === 'odds' ? 'odds' : 'tier']) ? bd[S.scoreBy === 'odds' ? 'odds' : 'tier'] : []).forEach(function (r) {
      if (!Array.isArray(r)) return;
      var tr = body.insertRow();
      [String(r[0]), String(num(r[1]) ? r[1] : 0), String(num(r[2]) ? r[2] : 0), num(r[3]) ? r[3].toFixed(1) : '–', typeof r[4] === 'string' ? r[4] : '–'].forEach(function (v, i) {
        var td = tr.insertCell(); td.textContent = v; if (i === 4) td.className = 'vd';
      });
    });
  }


  function renderRules() {
    var b = $('rulesBody'); clear(b);
    function h3(t) { var h = document.createElement('h3'); h.textContent = t; b.appendChild(h); }
    function ul(items) { var u = document.createElement('ul'); items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; u.appendChild(li); }); b.appendChild(u); }
    h3('The 5 checks (a pile must pass all five)');
    var w = SW();
    ul(['Far: well ' + w.dir + ' the price.',
      'Big: one of the biggest piles on the stock.',
      'Stays put: the top pile in most recent sessions.',
      w.mostly + ': far more ' + w.opts + ' than ' + w.other + ' at that strike.',
      'Reachable: within the range the options expect by its main expiry.']);
    h3('The 4 tiers (set by the engine, explained here)');
    ul(['A+B: both A and B.',
      'A: price moving toward the pile over the last 20 days.',
      'B: ' + w.opts + ' at the pile growing fast, in size.',
      'C: passes the 5 checks but is neither A nor B: an old pile.',
      'Borderline: close to the bar for A or B.',
      'Short fuse: the main expiry is only a few weeks away.']);
  }
  var NUM_COLS = [
    ['Stock', function (n) { return n.sym; }, 0],
    ['Tier', function (n) { return tierName(n.tier); }, 0],
    ['Price', function (n) { return n.price; }, 0, px],
    ['Pile', function (n) { return n.node; }, 0, strike],
    ['To go %', function (n) { return num(n.dist) ? n.dist * 100 : null; }, 0, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['Odds %', function (n) { return num(n.odds) ? n.odds * 100 : null; }, 0, function (v) { return num(v) ? Math.round(v) + '' : '–'; }],
    ['By', function (n) { return n.main_exp || ''; }, 0, function (v) { return dS(v); }],
    ['Typical moves', function (n) { return n.mv; }, 1, function (v) { return num(v) ? v.toFixed(2) : '–'; }],
    ['Pile $M', function (n) { return num(n.gex_usd) ? n.gex_usd / 1e6 : null; }, 1, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['Share %', function (n) { return num(n.share) ? n.share * 100 : null; }, 1, function (v) { return num(v) ? Math.round(v) + '' : '–'; }],
    ['Held', function (n) { return n._persist; }, 1, function (v, n) { return v == null ? '–' : v + ' of ' + n._win; }],
    ['First seen', function (n) { return n.first_seen || ''; }, 1, function (v) { return dS(v); }],
    ['Calls', function (n) { return n.call_oi; }, 1, int],
    ['Puts', function (n) { return n.put_oi; }, 1, int],
    [function () { return 'New ' + SW().opts + ' % (window)'; }, function (n) { return n._nc ? n._nc.pct * 100 : null; }, 1, function (v, n) { return n._nc ? sp0(n._nc.pct) + ' (' + n._nc.w + 's)' : '–'; }],
    ['20d %', function (n) { return num(n.ret20) ? n.ret20 * 100 : null; }, 1, function (v) { return num(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) : '–'; }],
    ['From 52w high %', function (n) { return num(n.off_high) ? n.off_high * 100 : null; }, 1, function (v) { return num(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) : '–'; }],
    ['Settle', function (n) { return n.oi_settle || ''; }, 1, function (v) { return dS(v); }],
    [function () { return '$ in ' + SW().opts + ' $M'; }, function (n) { return num(n.prem_usd) ? n.prem_usd / 1e6 : null; }, 0, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['vs day %', function (n) { return num(n.prem_adv) ? n.prem_adv * 100 : null; }, 1, function (v) { return num(v) ? v.toFixed(1) : '–'; }],
    ['$/day left $M', function (n) { return num(n.per_day_usd) ? n.per_day_usd / 1e6 : null; }, 1, function (v) { return num(v) ? v.toFixed(2) : '–'; }],
    ['Business', function (n) { return n.score; }, 0, function (v) { return num(v) ? Math.round(v) + '' : '–'; }],
    ['All three #', function (n) { return n._comboRank || null; }, 1, function (v) { return v ? '#' + v : '–'; }, 'asc']
  ];
  function colName(c) { return typeof c[0] === 'function' ? c[0]() : c[0]; }
  var numSort = { col: -1, dir: 1 };
  function renderNumTable() {
    var tb = $('numTable'); clear(tb);
    if (!P) return;
    var hr = tb.createTHead().insertRow();
    NUM_COLS.forEach(function (c, i) {
      var th = document.createElement('th'); th.scope = 'col'; if (c[2]) th.className = 'wide-only';
      if (numSort.col === i) th.setAttribute('aria-sort', numSort.dir > 0 ? 'ascending' : 'descending');
      var b = btn('', colName(c)); b.addEventListener('click', function () { numSort = { col: i, dir: numSort.col === i ? -numSort.dir : (i < 2 || i === 6 || i === 11 || NUM_COLS[i][4] === 'asc' ? 1 : -1) }; renderNumTable(); });
      th.appendChild(b); hr.appendChild(th);
    });
    var rows = P.names.slice();
    if (numSort.col >= 0) {
      var g = NUM_COLS[numSort.col][1];
      rows.sort(function (a, b) {
        var x = g(a), y = g(b);
        if (x == null || x === '') return 1; if (y == null || y === '') return -1;
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * numSort.dir || a._i - b._i;
      });
    }
    var body = tb.createTBody();
    rows.forEach(function (n) {
      var tr = body.insertRow();
      NUM_COLS.forEach(function (c, i) {
        var td = tr.insertCell(), v = c[1](n);
        td.textContent = c[3] ? c[3](v, n) : (v == null ? '–' : String(v));
        if (c[2]) td.className = 'wide-only';
        if (i === 0) td.className = 'tk-c';
      });
    });
  }
  function csvCell(v) { var s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function downloadCsv() {
    if (!P) return;
    var lines = [NUM_COLS.map(function (c) { return csvCell(colName(c)); }).join(',')];
    P.names.forEach(function (n) {
      lines.push(NUM_COLS.map(function (c, i) {
        var v = c[1](n);
        if (i === 14) return csvCell(n._nc ? (n._nc.pct * 100).toFixed(1) + ' (' + n._nc.w + ')' : '');
        if (i === 10) return csvCell(n._persist == null ? '' : n._persist + '/' + n._win);
        return csvCell(typeof v === 'number' ? +v.toFixed(4) : v);
      }).join(','));
    });
    var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'price-seeker-' + (P.doc.prices_day || 'today') + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function renderFoot() {
    $('footRec').textContent = 'Pile records start ' + dS(P.rec.since) + '; open-interest history starts ' + (P.oiStart ? dS(P.oiStart) : '–') + '.';
    $('footData').textContent = 'Derived from delayed public options data (previous-session open interest) and ~15-minute delayed prices' +
      (P.doc.price_source ? ' (' + P.doc.price_source + ')' : '') + '. Only computed values are shown, not quotes.';
  }


  function demoName() {
    if (P && P.names) {
      var full = P.names.filter(function (x) { return num(x.score) && num(x.prem_usd) && x._trip && x._spk && x._nc; });
      var pick = full.filter(function (x) { return x.tier === 'AB'; })[0] || full.filter(function (x) { return x.tier === 'A'; })[0] || full[0];
      if (pick) return pick;
      if (P.by && P.by.DRAM) return P.by.DRAM;
    }
    var c = [], v = 64.4;
    for (var i = 0; i < 60; i++) { v += Math.sin(i / 5) * 0.55 - 0.05; c.push(Math.round(v * 100) / 100); }
    c[59] = 61.78;
    var n = { sym: 'DRAM', tier: 'AB', price: 61.78, prev_close: 62.03, node: 70, dist: 0.1331, odds: 0.2327, main_exp: '2026-10-16', ret20: 0.0991, prem_usd: 43567074,
      oi_chg: { '3': [46181, 0.298] }, nc: ['3', 'strong'], persist: 10, persist_window: 10, held: 'ffffffffff', spark: { start: '2026-07-09', c: c },
      trip: P && P.side === 'puts' ? 'above' : 0.40393 };
    return viewName(n, null);
  }
  function buildHelp() {
    var demo = $('helpDemo'); clear(demo); demo.className = 'demo';
    var savedP = P;
    if (!P) P = { doc: {}, newest: null };
    var r = buildRow(demoName(), true);
    P = savedP;
    [['tier', 1], ['price', 2], ['trip', 3], ['spark', 4], ['odds', 5], ['nc', 6], ['bet', 7], ['biz', 8]].forEach(function (o) { var b = span('cn', String(o[1])); b.setAttribute('aria-hidden', 'true'); r.c[o[0]].insertBefore(b, r.c[o[0]].firstChild); });
    demo.appendChild(r.art);
    var ol = $('helpList'); clear(ol);
    CALLOUTS.forEach(function (c, i) {
      var li = document.createElement('li'); li.appendChild(span('cn', String(i + 1)));
      var t = span('', null); t.appendChild(add(document.createElement('b'), c[0] + ': ')); t.appendChild(document.createTextNode(c[1])); li.appendChild(t);
      ol.appendChild(li);
    });
    helpBuilt = true;
  }
  function openHelp() {
    closePop();
    if (!helpBuilt || (P && P.names && !helpBuilt.real)) { buildHelp(); helpBuilt = { real: !!(P && P.names) }; }
    lastFocus = document.activeElement;
    $('help').hidden = false; document.documentElement.classList.add('dlg-open');
    $('helpClose').focus();
  }
  function closeHelp() {
    $('help').hidden = true; document.documentElement.classList.remove('dlg-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (e) { return !e.disabled && e.offsetParent !== null; });
  }
  function togglePop(b) {
    if (popBtn === b) { closePop(true); return; }
    closePop();
    var k = +b.getAttribute('data-pop'), list = $('list');
    pop = div('pop'); pop.id = 'colpop'; pop.setAttribute('role', 'note');
    pop.appendChild(add(document.createElement('b'), CALLOUTS[k - 1][0] + ': ')); pop.appendChild(document.createTextNode(CALLOUTS[k - 1][1]));
    if (k === 7 && GEO.mode === 'mid') {
      pop.appendChild(document.createElement('br')); pop.appendChild(add(document.createElement('b'), CALLOUTS[7][0] + ': ')); pop.appendChild(document.createTextNode(CALLOUTS[7][1]));
    }
    list.appendChild(pop);
    var lr = list.getBoundingClientRect(), br = b.getBoundingClientRect(), pw = pop.offsetWidth;
    pop.style.left = Math.max(0, Math.min(lr.width - pw, br.left - lr.left - 20)) + 'px';
    pop.style.top = (br.bottom - lr.top + 8) + 'px';
    b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-describedby', 'colpop'); popBtn = b;
  }
  function closePop(refocus) {
    if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
    if (popBtn) { popBtn.setAttribute('aria-expanded', 'false'); popBtn.removeAttribute('aria-describedby'); if (refocus) popBtn.focus(); }
    pop = null; popBtn = null;
  }


  function flashCell(node) {
    if (reduced() || !node) return;
    node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash');
    setTimeout(function () { node.classList.remove('flash'); }, 650);
  }
  function whyLeft(sym, np) {
    var c = np.closing.filter(function (x) { return x.sym === sym; })[0];
    if (c) return 'Now ' + a1(c.dist) + ' away: moved to Closing in.';
    var ix = np.idx ? np.idx[sym] : null, w = SW();
    if (ix) {
      var f = ix[1], v = ix[5];
      if (f === 'nopile') return 'It has no strike where ' + w.opts + ' outweigh ' + w.other + ' today.';
      if (f === 'below' || f === 'above') return sym + '’s biggest ' + w.opt + ' pile is at or ' + w.away + ' the price, so there’s nothing to seek ' + w.seek + '.';
      if (f === 'far') return 'Its biggest ' + w.opt + ' pile (' + strike(ix[2]) + ') is only ' + a1(ix[3]) + ' ' + w.dir + ' the price: not far enough.';
      if (f === 'big') return 'The pile holds ' + p0(ix[4]) + ' of ' + w.gam + ' gamma: not big enough.';
      if (f === 'persist') return 'The top strike was the same in only ' + (num(v) ? v : '–') + ' of the last 10 sessions: hasn’t stayed put.';
      if (f === 'calls') return (num(v) ? ratioTxt(v) : '–') + ' ' + w.opts + ' per ' + w.other.replace(/s$/, '') + ' at that strike: not ' + w.mostly.toLowerCase() + '.';
      if (f === 'reach') return (num(v) ? v.toFixed(1) : '–') + ' typical moves away: out of reach.';
    }
    return 'It no longer passes all 5 checks.';
  }
  function updateRow(r, nn) {
    var before = { price: r.c.price.textContent, togo: r.c.togo.textContent, trip: r.c.trip.textContent, odds: r.c.odds.textContent, r20: r.c.r20.textContent };
    r.n = nn; fillAll(r);
    Object.keys(before).forEach(function (k) { if (r.c[k].textContent !== before[k]) flashCell(r.c[k]); });
    if (S.open[nn.sym]) {
      var anchor = r.chart ? r.chart.holder : r.art, top = anchor.getBoundingClientRect().top;
      buildDetail(r);
      var a2 = r.chart ? r.chart.holder : r.art, dy = a2.getBoundingClientRect().top - top;
      if (Math.abs(dy) > 0.5) window.scrollBy(0, dy);
    }
  }
  function applyUpdate(np, viaVisible) {
    var old = P;
    P = np;
    if (old && old.side !== np.side) {
      closePop(); hideCheck(); ghosts = {}; $('updateBar').hidden = true; setStick();
      S.open = {}; S.clOpen = {}; S.hitOpen = {}; S.failOpen = {}; clearHash();
      if (helpBuilt) helpBuilt = false;
      renderAll(); return;
    }
    if (S.period) { perUpdate(); return; }
    if (isHunt(S.sort)) {
      if (!Object.keys(S.open).length && viaVisible) { ghosts = {}; $('updateBar').hidden = true; setStick(); renderAll(); return; }
      if (!Object.keys(S.open).length) { renderAll(); return; }
      huntUpdate(np, old); return;
    }
    if (!Object.keys(S.open).length && viaVisible) { ghosts = {}; $('updateBar').hidden = true; setStick(); renderAll(); return; }
    var t = hm12(np.gen, NY), nNew = 0;
    np.names.forEach(function (n) { if (!old.by[n.sym]) nNew++; });
    Object.keys(rowRefs).forEach(function (sym) {
      var r = rowRefs[sym], nn = np.by[sym];
      if (r.n._srch) return;
      if (nn) { if (r.leftAt) { r.leftAt = null; r.leftWhy = null; r.art.classList.remove('left'); delete ghosts[sym]; } updateRow(r, nn); }
      else if (!r.leftAt) {
        r.leftAt = t; r.leftWhy = whyLeft(sym, np); ghosts[sym] = { n: r.n, at: t, why: r.leftWhy };
        r.art.classList.add('left'); fillPills(r);
        if (S.open[sym]) buildDetail(r);
      }
    });
    renderSideBar();
    renderNet();
    renderFailed();
    renderChaseOpt(); renderChase();
    renderListBar(); renderTiles(); renderCounts(); renderClosing(); renderHits(); renderScore(); renderRules(); renderFoot(); renderStatus();
    if ($('numbers').open) renderNumTable();
    var nLeft = Object.keys(ghosts).filter(function (k) { return !np.by[k]; }).length;
    if (nNew || nLeft) showUpdateBar(t, nNew, nLeft);
  }
  function showUpdateBar(t, nNew, nLeft) {
    var b = $('updateBar'); clear(b); b.hidden = false;
    b.appendChild(span('', 'Updated ' + t + ' ET · ' + nNew + ' new · ' + nLeft + ' left the list'));
    var x = btn('btn', 'Re-sort');
    x.addEventListener('click', function () { ghosts = {}; b.hidden = true; setStick(); renderList(); });
    b.appendChild(x);
    setStick();
  }
  function setStick() {
    var b = $('updateBar');
    document.documentElement.style.setProperty('--stick', (58 + (b.hidden ? 0 : b.offsetHeight + 6)) + 'px');
  }


  function renderAll() {
    $('content').hidden = false;
    sideCopy();
    renderSideBar();
    renderNet();
    renderFailed();
    renderChaseOpt(); renderChase();
    renderDayBar(); renderPeriods();
    renderCpOpts(); renderListBar(); renderStatus(); renderTiles(); renderStory(); renderCounts(); renderList(); renderClosing(); renderHits(); renderScore(); renderRules(); renderFoot();
    if ($('numbers').open) renderNumTable();
    if (helpBuilt && !helpBuilt.real) helpBuilt = false;
    if (pendingOpen) { var o = pendingOpen; pendingOpen = null; openLinked(o); }
  }
  function showFatal(e) {
    P = null; rowRefs = {}; ghosts = {};
    fatal = e;
    $('content').hidden = true;
    var chip = $('chip'); chip.className = 'chip chip-error'; chip.textContent = 'ERROR';
    $('asof').textContent = e.version !== undefined ? 'The data format changed.' : 'No numbers to show.';
    $('statusLine').textContent = ''; $('pilesLine').textContent = '';
    bannerSig = ''; renderBanners();
  }


  function getJSON(src) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, FETCH_TIMEOUT_MS);
    src = src || dataUrl;
    if (src === dataUrl && S.day) src = daysBase + S.day + '.json';
    var url = src + (src.indexOf('?') < 0 ? '?' : '&') + 't=' + Math.floor(Date.now() / 60000);
    return fetch(url, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw fmtErr('HTTP ' + r.status);
        return r.json().catch(function () { throw fmtErr('the file is not valid JSON'); });
      }, function (e) {
        clearTimeout(timer);
        throw fmtErr(e && e.name === 'AbortError' ? 'timed out after 15 s' : 'network error');
      });
  }
  function load(initial, viaVisible) {
    if (loading) return;
    loading = true; lastFetchAt = Date.now();
    var gen = loadGen;
    if (initial && fatal) { var chip = $('chip'); chip.className = 'chip chip-wait'; chip.textContent = 'LOADING'; $('asof').textContent = 'Fetching the latest numbers…'; }
    getJSON().then(function (d) {
      if (gen !== loadGen) return;
      check(d);
      RAW = d;
      var np = prep(d, S.list, S.side);
      lastErr = null;
      if (!P) { fatal = null; bannerSig = ''; P = np; renderAll(); }
      else if (np.doc.generated === P.doc.generated) renderStatus();
      else applyUpdate(np, viaVisible);
      daysCheck(d);
    }).catch(function (e) {
      if (gen !== loadGen) return;
      if (S.day && !P) { S.day = null; loadGen++; dayFallbackHash(); renderDayBar(); return; }
      var msg = e && e.shown ? e.message : 'the data looked broken';
      if (!P) showFatal(e && e.version !== undefined ? { version: e.version } : { msg: msg });
      else { lastErr = { at: now(), msg: msg }; renderStatus(); }
    }).then(function () {
      loading = false;
      if (gen !== loadGen) { load(true); return; }
      schedule();
    });
  }
  function pollDelay() {
    var t = now(), p = tzParts(t, NY), dn = Date.UTC(p.y, p.mo - 1, p.d) / 864e5, mins = p.h * 60 + p.mi;
    return isSession(dn) && mins >= 570 && mins <= 990 ? POLL_FAST : POLL_SLOW;
  }
  function schedule() { clearTimeout(pollTimer); if (S.day) return; if (!document.hidden) pollTimer = setTimeout(function () { load(false, false); }, pollDelay()); }


  (function initState() {
    var t = sget('ps.tier'), s = sget('ps.sort'), c = sget('ps.cOpen'), li = sget('ps.list');
    var sd = sget('ps.side');
    if (sd === 'puts' || sd === 'calls') S.side = sd;
    if (isList(li)) S.list = li;
    S.netOpen = sget('ps.net') === '1';
    if (t && (t === 'all' || TIERS.indexOf(t) >= 0)) S.tier = t;
    if (s && (s === 'best' || SORTS[s])) S.sort = s;
    S.cOpen = c === '1';
    var h = parseHash();
    if (isDay(h.d)) S.day = h.d;
    if (PER_LABEL[h.p]) S.period = h.p;
    if (h.t && (h.t === 'all' || TIERS.indexOf(h.t) >= 0)) S.tier = h.t;
    if (h.s && (h.s === 'best' || SORTS[h.s])) S.sort = h.s;
    if (isList(h.l)) S.list = h.l;
    if (h.v === 'puts' || h.v === 'calls') S.side = h.v;
    if (h.o && !h.v) S.side = 'calls';
    if (h.o) pendingOpen = h.o;
    if (S.period) { perPend = h.o || null; pendingOpen = null; if (typeof isHunt === 'function' && isHunt(S.sort)) S.sort = 'best'; }
    if (S.tier === 'C') S.cOpen = true;
  })();
  initFolds();
  initChaseFold();
  initDays();
  initCols();
  renderCounts();
  renderBanners();
  Array.prototype.forEach.call(document.querySelectorAll('#tierSeg button'), function (b) { b.addEventListener('click', function () { setTier(b.getAttribute('data-tier')); }); });
  $('sort').addEventListener('change', function () {
    var v = this.value;
    if (v === 'newputs' || (v === 'new' && P && P.side === 'puts')) {
      var sd = v === 'newputs' ? 'puts' : 'calls';
      if (!P || P.side !== sd) setSide(sd);
      setSort('new');
      return;
    }
    setSort(v);
  });
  Array.prototype.forEach.call(document.querySelectorAll('#rankBar button[data-sort]'), function (b) { b.addEventListener('click', function () { setSort(b.getAttribute('data-sort')); }); });
  Array.prototype.forEach.call(document.querySelectorAll('#listBar button'), function (b) { b.addEventListener('click', function () { setList(b.getAttribute('data-list')); }); });
  Array.prototype.forEach.call(document.querySelectorAll('#sideBar button'), function (b) { b.addEventListener('click', function () { setSide(b.getAttribute('data-side')); }); });
  Array.prototype.forEach.call(document.querySelectorAll('#failSeg button'), function (b) { b.addEventListener('click', function () { S.failBy = b.getAttribute('data-fb'); if (P) renderFailed(); }); });
  $('failSort').addEventListener('change', function () { S.failSort = FAIL_SORTS[this.value] ? this.value : 'size'; if (P) renderFailed(); });
  $('failedMore').addEventListener('click', function () { S.failAll = !S.failAll; if (P) renderFailed(); });
  $('netTog').addEventListener('click', function () { S.netOpen = !S.netOpen; sset('ps.net', S.netOpen ? '1' : '0'); if (P) renderNet(); });
  $('netJump').addEventListener('click', function () { S.netOpen = true; sset('ps.net', '1'); if (P) renderNet(); scrollToEl($('netTop')); });
  Array.prototype.forEach.call(document.querySelectorAll('#netSeg button'), function (b) { b.addEventListener('click', function () { S.netDir = b.getAttribute('data-nd'); if (P) renderNet(); }); });
  $('netMore').addEventListener('click', function () { S.netAll = !S.netAll; if (P) renderNet(); if (!S.netAll) scrollToEl($('netTop')); });
  $('backBestBtn').addEventListener('click', function () { setSort('best'); });
  var q = $('q');
  q.addEventListener('input', function () { S.q = q.value; hideCheck(); renderList(); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); checkTicker(q.value); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (q.value) { q.value = ''; S.q = ''; hideCheck(); renderList(); } else q.blur(); }
  });
  $('helpBtn').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('help').addEventListener('click', function (e) { if (e.target === $('help')) closeHelp(); });
  $('help').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeHelp(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables($('help')); if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  Array.prototype.forEach.call(document.querySelectorAll('#lhead .ib'), function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); togglePop(b); }); });
  document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target) && e.target !== popBtn) closePop(); });
  document.addEventListener('keydown', function (e) {
    if (!$('help').hidden) return;
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); q.focus(); return; }
    if (e.key === 'Escape') {
      if (pop) { closePop(true); return; }
      var art = t && t.closest ? t.closest('.row') : null;
      if (art && art.classList.contains('open')) { var r = rowRefs[art.getAttribute('data-sym')]; if (r) { closeRow(r, true); r.b.focus(); } }
    }
  });
  $('closingMore').addEventListener('click', function () { S.closingAll = !S.closingAll; renderClosing(); if (!S.closingAll) scrollToEl($('closing')); });
  Array.prototype.forEach.call(document.querySelectorAll('#scoreSeg button'), function (b) { b.addEventListener('click', function () { S.scoreBy = b.getAttribute('data-sv'); if (P) renderScoreTable(); }); });
  $('numbers').addEventListener('toggle', function () { if (this.open) renderNumTable(); });
  $('csvBtn').addEventListener('click', downloadCsv);
  window.addEventListener('hashchange', function () {
    var raw = location.hash.replace(/^#/, '');
    if (raw && document.getElementById(raw)) return;
    var h = parseHash(); if (!P) return;
    var want = null;
    want = h.v === 'puts' || h.v === 'calls' ? h.v : (h.o ? 'calls' : null);
    var hp = PER_LABEL[h.p] ? h.p : null;
    if ((h.d || null) !== (S.day || null)) {
      if (want) { S.side = want; sset('ps.side', want); }
      setDay(h.d || null, hp ? null : h.o || null);
      if (hp) showPeriod(hp, h.o || null, false);
      return;
    }
    if (hp !== (S.period || null)) {
      if (want && want !== P.side) setSide(want, true);
      showPeriod(hp, hp ? h.o || null : null, false);
      if (!hp && h.o) openLinked(h.o);
      return;
    }
    if (want && want !== P.side) setSide(want, true);
    if (h.o) openLinked(h.o);
  });
  var skipA = document.querySelector('a.skip');
  if (skipA) skipA.addEventListener('click', function (e) { e.preventDefault(); var l = $('list'); try { l.focus({ preventScroll: true }); } catch (x) { l.focus(); } scrollToEl(l); });
  var rsT = null;
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(onResize, 140); });
  function onResize() {
    var g = geoNow(); var mode0 = GEO.mode; GEO.mode = g; var sw = spkW();
    closePop();
    if (P && (g !== mode0 || sw !== GEO.spk)) { GEO.spk = sw; renderList(); }
    else if (P) Object.keys(S.open).forEach(function (k) { var r = rowRefs[k]; if (r && r.chart) drawRunway(r.chart); if (r && r.gx) drawGex(r.gx); });
    GEO.spk = sw;
    if (P && STORY && storyIsOpen()) drawStory();
    if (P && CHASE && chaseIsOpen()) drawChase();
    if (P) {
      Array.prototype.forEach.call(document.querySelectorAll('#closingRows .cl.open'), function (w) { if (w._draw) w._draw(); });
      Array.prototype.forEach.call(document.querySelectorAll('#hitRows .hl.open .hl-sum'), function (b) { b.click(); b.click(); });
      Array.prototype.forEach.call(document.querySelectorAll('#failedRows .cl.open'), function (w) { if (w._draw) w._draw(); });
    }
    setStick();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(pollTimer); return; }
    if (Date.now() - lastFetchAt > 30 * 1000) load(false, true); else schedule();
  });
  setInterval(function () { if (P) renderStatus(); else renderBanners(); }, TICK_MS);

  load(true);
})();
