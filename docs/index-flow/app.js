


"use strict";
const LW = window.LightweightCharts;
const COL = { call: "#26a69a", put: "#ef5350", blue: "#3d7fe6", orange: "#c98317", purple: "#9d5bd6",
  grid: "#1f2330", line: "#2a2e39", txt: "#d1d4dc", sub: "#8a8e99", gray: "#787b86" };
const IVCOL = { d0: "#3d7fe6", w1: "#c98317", m1: "#9d5bd6" };
const PCOL = { SPY: "#3987e5", SPX: "#d95926", QQQ: "#199e70", NDX: "#c98500", IWM: "#d55181", RUT: "#9085e9" };
const FAM = { sp: { name: "S&P", etf: "SPY", idx: "SPX", c: "#3987e5" }, nq: { name: "Nasdaq", etf: "QQQ", idx: "NDX", c: "#c98500" },
  ru: { name: "Russell", etf: "IWM", idx: "RUT", c: "#9085e9" } };
const FAMOF = { SPY: "sp", SPX: "sp", SPYSPX: "sp", ES: "sp", QQQ: "nq", NDX: "nq", QQQNDX: "nq", NQ: "nq", IWM: "ru", RUT: "ru", IWMRUT: "ru", RTY: "ru" };
const TABS = [["S&P", [["SPY", "SPY"], ["SPX", "SPX"], ["SPYSPX", "SPY+SPX"], ["ES", "ES"]]],
  ["Nasdaq", [["QQQ", "QQQ"], ["NDX", "NDX"], ["QQQNDX", "QQQ+NDX"], ["NQ", "NQ"]]],
  ["Russell", [["IWM", "IWM"], ["RUT", "RUT"], ["IWMRUT", "IWM+RUT"], ["RTY", "RTY"]]], ["", [["TOTAL", "Total"]]]];
const FUTNAME = { ES: "E-mini S&P 500", NQ: "E-mini Nasdaq-100", RTY: "E-mini Russell 2000" };
const AGG_STEP = { SPX: 10, NDX: 50, RUT: 10 };
const MEGA = ["NVDA", "MSFT", "AAPL", "AMZN", "GOOGL", "META", "AVGO", "TSLA", "ORCL", "AMD", "MU", "PLTR", "TSM", "SMH", "SOXX", "EWY", "EWT"];
const ONCE = ["EWT"];
const isVix = () => !!(S.d && S.d.kind === "vix");
const isMega = (s_) => MEGA.includes(s_ || S.sym);
const S = { sym: "SPY", d: null, v: 0, at: null, gexMode: "net", flowB: "all", charts: {}, lines: [], live: null,
  mtfOn: false, bandsOn: false, gexOv: false, view: "5d15m", chart: null, chartTot: null, chartAt: 0,
  bandSel: {}, masSel: {}, bandSeries: {}, offBands: [], mtfLive: false, mtfPos: "tl", mtfPick: "SPY", mtf: null, host: null,
  lx: "simple", kpOn: true, fitKey: null };
const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const recall = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));


const fmtET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit",
  day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
function etOffset(ts) {
  const p = {}; for (const x of fmtET.formatToParts(new Date(ts * 1000))) p[x.type] = x.value;
  const h = p.hour === "24" ? 0 : +p.hour;
  return Math.round(Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second) / 1000 - ts);
}
const etT = (ts) => ts + etOffset(ts);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dlabel(iso, wd = true) { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(Date.UTC(y, m - 1, d));
  return (wd ? DAYS[dt.getUTCDay()] + " " : "") + MON[m - 1] + " " + d; }
const xlabel = (iso) => dlabel(iso, false) + (S.d && iso.slice(0, 4) !== S.d.session.slice(0, 4) ? " '" + iso.slice(2, 4) : "");
const px = (v, sym) => v == null ? "—" : (Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toFixed(2));
const sgn = (v, f) => (v > 0 ? "+" : v < 0 ? "−" : "") + f(Math.abs(v));
function money(v) { const a = Math.abs(v); const s = v < 0 ? "−" : "";
  return a >= 1e9 ? s + "$" + (a / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B" : a >= 1e6 ? s + "$" + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + "M" : a >= 1e3 ? s + "$" + (a / 1e3).toFixed(0) + "k" : s + "$" + a.toFixed(0); }
function ratio(c, p) {
  if (!(c > 0) || !(p > 0)) return c > 0 ? "all calls" : p > 0 ? "all puts" : "—";
  const r = c >= p ? c / p : p / c;
  return r < 1.05 ? "even" : `${r >= 10 ? r.toFixed(0) : r.toFixed(1)} to 1 ${c >= p ? "calls" : "puts"}`;
}
function count(v) { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(2) + "M" : a >= 1e3 ? (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + "k" : String(Math.round(v)); }
const isTotal = () => !!(S.d && S.d.kind === "total");
const isFut = () => !!(S.d && S.d.kind === "fut");
const isPair = () => !!(S.d && (S.d.kind === "pair" || S.d.kind === "spyspx" || isFut()));
const isCombo = () => !!(S.d && (S.d.kind === "total" || isPair()));
const fs = () => isFut() ? S.d.sym : isPair() ? (S.d.base || "SPX") : (S.d ? S.d.sym : "SPY");
const pname = () => isFut() ? S.d.sym : isPair() ? (S.d.etf || "SPY") + "+" + fs() : isTotal() ? "Total" : S.d.sym;
const kx = (k) => isTotal() ? sgn(k, (v) => v.toFixed(2)) + "%" : px(k, fs()).replace(".00", "");
const vfmtU = (v) => S.d && S.d.flow_unit === "$" ? money(v) : count(v);
const oneIn = (p) => p ? "1 in " + Math.max(1, Math.round(1 / p)) : "—";


function baseChart(el, opts = {}) {
  return LW.createChart(el, Object.assign({
    autoSize: true,
    layout: { background: { type: "solid", color: "#1a1e29" }, textColor: COL.sub, fontSize: 11,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif", attributionLogo: false },
    grid: { vertLines: { color: COL.grid }, horzLines: { color: COL.grid } },
    rightPriceScale: { borderColor: COL.line },
    timeScale: { borderColor: COL.line, timeVisible: true, secondsVisible: false, rightOffset: 1, fixLeftEdge: true, fixRightEdge: true },
    crosshair: { mode: LW.CrosshairMode.Normal },
    handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
  }, opts));
}

function ensureCharts() {
  if (S.charts.price) return;
  const pc = baseChart($("price"), { handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true } });
  S.charts.price = pc;
  S.charts.candles = pc.addSeries(LW.CandlestickSeries, { upColor: COL.call, downColor: COL.put, borderVisible: false,
    wickUpColor: COL.call, wickDownColor: COL.put, priceLineVisible: false });
  S.charts.spotLine = pc.addSeries(LW.LineSeries, { color: COL.txt, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
  S.charts.helper = pc.addSeries(LW.LineSeries, { color: "rgba(0,0,0,0)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false,
    crosshairMarkerVisible: false });
  const pctf = { type: "custom", formatter: (v) => sgn(v, (x) => x.toFixed(2)) + "%", minMove: 0.01 };
  S.charts.pSPY = pc.addSeries(LW.LineSeries, { color: FAM.sp.c, lineWidth: 2, priceFormat: pctf, priceLineVisible: false, title: "S&P (SPY)" });
  S.charts.pQQQ = pc.addSeries(LW.LineSeries, { color: FAM.nq.c, lineWidth: 2, priceFormat: pctf, priceLineVisible: false, title: "Nasdaq (QQQ)" });
  S.charts.pIWM = pc.addSeries(LW.LineSeries, { color: FAM.ru.c, lineWidth: 2, priceFormat: pctf, priceLineVisible: false, title: "Russell (IWM)" });
  const fc = baseChart($("flow"), { rightPriceScale: { borderColor: COL.line, scaleMargins: { top: 0.08, bottom: 0.08 } } });
  S.charts.flow = fc;
  const vfmt = { type: "custom", formatter: (v) => count(Math.abs(v)), minMove: 1 };
  S.charts.fc = fc.addSeries(LW.HistogramSeries, { color: COL.call, priceFormat: vfmt, priceLineVisible: false, lastValueVisible: false });
  S.charts.fp = fc.addSeries(LW.HistogramSeries, { color: COL.put, priceFormat: vfmt, priceLineVisible: false, lastValueVisible: false });
  const ic = baseChart($("iv"));
  S.charts.iv = ic;
  const pf = { type: "custom", formatter: (v) => v.toFixed(1) + "%", minMove: 0.01 };
  S.charts.ivs = {};
  for (const k of ["d0", "w1", "m1"]) S.charts.ivs[k] = ic.addSeries(LW.LineSeries, { color: IVCOL[k], lineWidth: 2, priceFormat: pf,
    pointMarkersVisible: true, pointMarkersRadius: 3, priceLineVisible: false });
  const sc = baseChart($("skew"));
  S.charts.skew = sc;
  S.charts.skews = sc.addSeries(LW.LineSeries, { color: COL.purple, lineWidth: 2, pointMarkersVisible: true, pointMarkersRadius: 3,
    priceFormat: { type: "custom", formatter: (v) => v.toFixed(2) + " pts", minMove: 0.01 }, priceLineVisible: false });
  S.charts.skews2 = sc.addSeries(LW.LineSeries, { color: COL.orange, lineWidth: 2, pointMarkersVisible: true, pointMarkersRadius: 3,
    priceFormat: { type: "custom", formatter: (v) => v.toFixed(2) + " pts", minMove: 0.01 }, priceLineVisible: false });
  S.charts.skews3 = sc.addSeries(LW.LineSeries, { color: COL.purple, lineWidth: 2, pointMarkersVisible: true, pointMarkersRadius: 3,
    priceFormat: { type: "custom", formatter: (v) => v.toFixed(2) + " pts", minMove: 0.01 }, priceLineVisible: false });
  pc.subscribeDblClick(() => setFull(!S.full));
  fc.subscribeCrosshairMove((p) => flowLegend(p));
  ic.subscribeCrosshairMove((p) => ivLegend(p));
}


async function getJSON(u) { return window.IFDATA.get(u); }

async function loadState() {
  try {
    const d = await getJSON("/api/state?s=" + S.sym + (S.at ? "&at=" + encodeURIComponent(S.at) : ""));
    S.d = d; S.v = d.v; S.live = d;
    render();
  } catch (e) {
    if (FUTNAME[S.sym] && !window.IFDATA.has(S.sym)) {
      S.sym = "SPY"; history.replaceState(null, "", "?s=SPY"); renderTabs(); return loadState(); }
    $("stxt").textContent = "no data yet (" + e.message + ")"; $("dot").className = "err";
  }
}

async function poll() {
  try {
    const l = await getJSON("/api/live?s=" + S.sym);
    S.live = l;
    if (!S.d || (l.versions && l.versions[S.sym] !== S.v)) return loadState();
    if (S.d && (l.in_session || (isFut() && l.fut_open)) && !S.d.replay_at && Date.now() - S.chartAt > 60000) loadChart();
    if (S.d) { renderHeader(); renderTiles(); }
  } catch (e) { $("dot").className = "err"; }
}

function memberPx(sym) {
  const L = S.live && S.live.live && S.live.live[sym];
  if (L && S.d.live_session && !S.d.replay_at && !(S.d.latest.ts && L.t < S.d.latest.ts)) return L.px;
  return (S.d.latest.spots || {})[sym];
}
function livePx() {
  if (!S.d || isTotal()) return null;
  const L = S.live && S.live.live && S.live.live[isPair() ? fs() : S.sym];
  if (!L) return null;
  if (!S.d.live_session || S.d.replay_at) return null;
  if (S.d.latest && S.d.latest.ts && L.t < S.d.latest.ts) return null;
  return L;
}


function render() {
  ensureCharts();
  document.body.classList.toggle("is-vix", isVix());
  document.body.classList.toggle("is-total", isTotal());
  document.body.classList.toggle("lx-simple", S.lx === "simple");
  $("lx").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.lx === S.lx));
  renderPlain();
  const ph = document.querySelector(".c-price h2");
  ph.textContent = isVix() ? "VIX chart, futures curve and bands" : isMega() ? `${S.sym}: price, expected move and gamma levels` :
    isFut() ? `${S.d.sym} futures with the ${S.d.etf}+${S.d.base} gamma levels (+ basis)` : "Price, expected move and gamma levels";
  $("pricetog").querySelectorAll("button").forEach((b) => { const na = (isVix() && b.dataset.t !== "bands") || (isTotal() && b.dataset.t === "kp");
    b.disabled = na; b.title = na ? "not for VIX (its options are priced off VIX futures)" : b.title; });
  document.querySelector(".c-skew h2").textContent = isVix() ? "VIX call vs put skew · last 10 sessions" : "Put skew · 1 month";
  if (isVix()) {
    renderHeader(); renderTilesVix(); renderPrice(); renderSkew(); renderStress(); renderCal(); renderFoot(); renderMega(); renderVix();
    $("gexov").getContext("2d").clearRect(0, 0, 9999, 9999); $("mtfbox").hidden = true; renderBandRow();
    autoFit(); loadChart(); return;
  }
  renderHeader(); renderTiles(); renderKP(); renderPrice(); renderGex(); renderFlow(); renderTop(); renderIV(); renderSkew();
  renderStress(); renderRecord(); renderCal(); renderFoot(); renderMega(); renderVix();
  autoFit();
  setTimeout(drawGexOv, 160); renderMtf(); renderBandRow();
  loadChart();
}
const fitKey = () => [(S.d && S.d.sym) || S.sym, S.view, S.d ? S.d.session : "", (S.d && S.d.replay_at) || "", S.lx].join("|");
function autoFit() { if (S.fitKey !== fitKey()) { requestAnimationFrame(fitAll); setTimeout(fitAll, 120); } }
function fitAll() { priceSpace(); for (const k of ["price", "flow", "iv", "skew"]) if (S.charts[k]) S.charts[k].timeScale().fitContent(); }
function autoPrice() { if (S.host) S.host.priceScale().applyOptions({ autoScale: true }); }
function priceSpace() {
  if (!S.charts.price || !S.d) return;
  const C0 = curChart();
  const n = isTotal() ? Math.max(...Object.values(S.chartTot || S.d.bars_by || { a: [] }).map((b) => (b.bars || b).length), 1)
    : Math.max(C0 ? C0.bars.length : (S.d.bars || []).length, S.d.series.length, 1);
  const piles = S.kpOn && !isTotal() && !isVix() && S.d.kp && !S.d.replay_at && (S.d.kp.piles || []).length;
  S.charts.price.timeScale().applyOptions(S.gexOv ? { fixRightEdge: false, rightOffset: Math.ceil(n * 0.45) }
    : piles ? { fixRightEdge: false, rightOffset: Math.max(6, Math.ceil(n * 0.24)) }
    : S.bandsOn && !isTotal() ? { fixRightEdge: false, rightOffset: Math.max(4, Math.ceil(n * 0.05)) }
    : { fixRightEdge: true, rightOffset: 1 });
}

function renderHeader() {
  const d = S.d; if (!d) return;
  const L = livePx(), last = d.latest;
  const p = isTotal() ? null : (L ? L.px : last.spot), pc = isFut() ? d.fut.prev_close : d.prev_close;
  const ch = $("px").querySelector(".chg");
  if (isTotal()) {
    $("px").querySelector(".last").innerHTML = ["SPY", "QQQ", "IWM"].map((s_) => { const v = memberPx(s_), c0 = (pc || {})[s_];
      const r = v && c0 ? (v / c0 - 1) * 100 : null;
      return `<span style="font-size:14px">${s_} ${px(v, s_)} <span class="${r >= 0 ? "up" : "dn"}" style="font-size:12px">${r != null ? sgn(r, (x) => x.toFixed(2)) + "%" : ""}</span></span>`; }).join(" &nbsp;");
    ch.textContent = "";
  } else $("px").querySelector(".last").textContent = (isPair() ? fs() + " " : "") + px(p, fs());
  if (pc && !isTotal()) { const c = p - pc; ch.className = "chg " + (c >= 0 ? "up" : "dn"); ch.textContent = sgn(c, (x) => px(x, fs())) + " (" + sgn(c / pc * 100, (x) => x.toFixed(2)) + "%)"; }
  const open = S.live && S.live.in_session;
  const dot = $("dot");
  let txt;
  if (isFut()) {
    dot.className = d.fut.open ? "live" : "closed";
    txt = `${d.sym} ${etDT(d.fut.last_ts)} ET (CME ${d.fut.open ? "trading" : "closed"}) · options map ${dlabel(d.session, false)} ${last.t} ET (Cboe)`;
  } else if (d.live_session && open) {
    const age = (Date.now() / 1000 - last.ts - etOffset(last.ts) * 0) / 60;
    dot.className = age > 50 ? "stale" : "live";
    txt = `Live · options as of ${last.t} ET (Cboe, ~15 min delayed) · ${d.n_snaps} snapshots today` +
      (L ? ` · price ${new Date(L.t * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} ET` : "");
  } else {
    dot.className = "closed";
    txt = `${dlabel(d.session)} · last options snapshot ${last.t} ET · ${d.n_snaps} snapshots` + (open ? " · today's data not in yet" : " · market closed");
  }
  $("stxt").textContent = txt;
  const sn = d.snap_times || [];
  $("snaps").innerHTML = sn.length > 1 && !isFut() ? `<span>Snapshots ${dlabel(d.session, false)}:</span>` + sn.map((t, i) =>
    `<button data-t="${t}" class="${(d.replay_at || sn[sn.length - 1]) === t ? "on" : ""}">${t}${i === sn.length - 1 ? " · latest" : ""}</button>`).join("") : "";
  $("snaps").querySelectorAll("button").forEach((x) => x.onclick = () => {
    const t = x.dataset.t; S.at = t === sn[sn.length - 1] ? null : t; loadState(); });
  const b = $("banner");
  if (d.replay_at) {
    b.hidden = false;
    b.innerHTML = `<b>Replay: ${dlabel(d.session)} at ${d.replay_at} ET.</b> Price, tiles, gamma, volume and vol panels show that snapshot; the other panels are current. Pick <b>latest</b> to return.`;
  } else if (!d.live_session) {
    const today = ((S.live && S.live.now) || "").slice(0, 10);
    b.hidden = false;
    const every = ONCE.includes(d.sym) ? "This one updates once a day, a session behind." : null;
    b.innerHTML = (d.missing && d.missing.length ? `<b>Not in yet: ${d.missing.join(", ")}</b> (their 15-minute pulls start with the next session). ` : "") +
      (today && d.next_session <= today ? `<b>No ${dlabel(today)} snapshot yet for ${esc(pname())}</b>; showing ${dlabel(d.session)}. ${every || "In the session this page updates about every 15 minutes."} ` :
        `<b>Showing ${dlabel(d.session)}</b>, the last session with data. ${every || `Updates every 15 minutes start <b>${dlabel(d.next_session)}</b> after the open.`} `);
  } else b.hidden = true;
  renderTabs();
  document.title = `${pname()}${p ? " " + px(p, fs()) : ""} · Index Flow`;
}

function tile(k, v, s, extra = "") { return `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div>${extra}<div class="s">${s}</div></div>`; }

function renderTiles() {
  const d = S.d; if (!d) return;
  if (isVix()) return renderTilesVix();
  if (isTotal()) return renderTilesTotal();
  if (isFut()) return renderTilesFut();
  const last = d.latest, L = livePx(), p = L ? L.px : last.spot, pc = d.prev_close, em = d.em && d.em.em;
  const f = (x) => px(x, fs());
  const out = [];
  if (em && pc) out.push(tile(`Expected move ${d.live_session && !d.replay_at ? "today" : dlabel(d.session, false)}`,
    `±${f(em)}<small>±${(em / pc * 100).toFixed(2)}%</small>`, `set by the straddle at ${esc(dlabel(d.em.at.slice(0, 10)))} ${esc(d.em.at.slice(11, 16))} ET` +
    (isPair() && last.ratio && last.ratio[d.etf || "SPY"] ? ` · ${d.etf || "SPY"} ≈ ±${(em / last.ratio[d.etf || "SPY"]).toFixed(2)}` : "")));
  else out.push(tile("Expected move", "—", "no straddle yet"));
  if (pc && p != null) {
    const mv = p - pc, used = em ? Math.abs(mv) / em * 100 : null;
    out.push(tile(last.closed ? "Close vs previous close" : `Move so far${d.replay_at ? " (" + last.t + ")" : ""}`,
      `${sgn(mv, f)}<small>${sgn(mv / pc * 100, (x) => x.toFixed(2))}%</small>`,
      used == null ? "no expected move for this session" : used > 100 ? `<span class="chip warn">${used.toFixed(0)}% of expected: outside the band</span>` : `${used.toFixed(0)}% of the expected move used`,
      used == null ? "" : `<div class="meter"><i class="${used > 100 ? "over" : ""}" style="width:${Math.min(100, used)}%"></i></div>`));
  } else out.push(tile("Move so far", "—", ""));
  if (!last.closed && last.em_rem) out.push(tile("Rest of today", `±${f(last.em_rem)}<small>±${(last.em_rem / p * 100).toFixed(2)}%</small>`,
    `same-day straddle at ${last.t} ET: what's still priced in`));
  else if (last.em_next) out.push(tile(`Next session`, `±${f(last.em_next)}<small>±${(last.em_next / p * 100).toFixed(2)}%</small>`,
    `${last.em_next_for ? dlabel(last.em_next_for) + ": " : ""}straddle at the close`));
  else out.push(tile("Rest of today", "—", ""));
  const lv = last.levels;
  if (lv && lv.flip) {
    const above = p >= lv.flip;
    out.push(tile(`Gamma position`, `${above ? "Above" : "Below"} flip<small>${f(lv.flip)}</small>`,
      `king ${f(lv.king)}${lv.tie ? " (near-tie with " + f(lv.runner) + ")" : ""}` +
      (isPair() && last.ratio && last.ratio[d.etf || "SPY"] ? ` · ${d.etf || "SPY"} ≈ flip ${(lv.flip / last.ratio[d.etf || "SPY"]).toFixed(2)}, king ${(lv.king / last.ratio[d.etf || "SPY"]).toFixed(2)}` : "")));
  } else out.push(tile("Gamma position", "—", ""));
  const w = d.weather;
  if (w && w.vix) out.push(tile(`VIX`, `${w.vix.toFixed(2)}<small>${esc(w.bucket || "")} bucket${(w.closes || []).includes("vix") ? " · last close" : ""}</small>`,
    `−2% day within 5 sessions: <b>${oneIn(w.p_2pct_5d)}</b> (all days ${oneIn(w.base_2pct_5d)})`));
  else out.push(tile("VIX", "—", "not in yet"));
  $("tiles").innerHTML = out.join("");
}

const etDT = (ts) => new Date(ts * 1000).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
function renderTilesFut() {
  const d = S.d, F = d.fut, lv = d.latest.levels || {}, f = (x) => px(x, F.sym), p = F.last, out = [];
  const ch = F.prev_close ? p - F.prev_close : null;
  out.push(tile(`${F.sym} · ${FUTNAME[F.sym]}`, `${f(p)}` + (ch != null ? `<small class="${ch >= 0 ? "up" : "dn"}">${sgn(ch, f)} (${sgn(ch / F.prev_close * 100, (x) => x.toFixed(2))}%)</small>` : ""),
    `${etDT(F.last_ts)} ET · change vs the previous day's close`));
  out.push(tile(`Basis vs ${F.base}`, `${sgn(F.basis, (x) => x.toFixed(2))}<small>pts</small>`,
    `${F.sym} − ${F.base} on their latest shared 5-minute closes, to ${etDT(F.basis_ts)} ET · every ${F.base} level + basis = ${F.sym}`));
  const em = d.em && d.em.em, c0 = d.prev_close;
  if (em && c0) { const used = Math.abs(p - c0) / em * 100;
    out.push(tile("Expected move", `±${f(em)}<small>${f(c0 - em)} – ${f(c0 + em)}</small>`,
      `${esc(d.em.src || "straddle")} around the ${F.base} close + basis (${f(c0)}) · ${used.toFixed(0)}% used`,
      `<div class="meter"><i class="${used > 100 ? "over" : ""}" style="width:${Math.min(100, used)}%"></i></div>`)); }
  else out.push(tile("Expected move", "—", ""));
  if (lv.flip) out.push(tile("Gamma position", `${p >= lv.flip ? "Above" : "Below"} flip<small>${f(lv.flip)}</small>`,
    `king ${f(lv.king)} · call wall ${f(lv.call_wall)} · put wall ${f(lv.put_wall)}`));
  else out.push(tile("Gamma position", "—", ""));
  out.push(tile("Overnight", F.on_hi != null ? `${f(F.on_lo)} – ${f(F.on_hi)}` : "—",
    F.on_hi != null ? `range from 18:00 ET to the cash open, ${dlabel(F.day, false)} session` + (lv.king != null ? ` · king ${F.on_lo <= lv.king && lv.king <= F.on_hi ? "inside" : "outside"} it` : "") : "starts 18:00 ET"));
  $("tiles").innerHTML = out.join("");
}


const GOLD = "#e0b341";
const xshort = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${MON[m - 1]} ${d}`; };
const fk = (k) => px(k, fs()).replace(".00", "");
const UNUSUAL = ["VOL", "BIG", "QE"];
const isUn = (p) => !!p.strong;
const TAGDEF = {
  MOVED: ["t-moved", (t, x) => `MOVED ${fk(t[1])} → ${fk(x.k)}`, "the king strike changed since the previous session's close"],
  STICKY: ["t-sticky", (t) => `STICKY ${t[1]}`, "the same king strike for this many sessions in a row"],
  FAR: ["t-far", (t) => `FAR ${t[1].toFixed(1)}σ`, "far from price for the implied vol of its expiry (σ = one standard move to that date)"],
  VOL: ["t-vol", (t) => `VOLUME PILE ${t[1]}× start-of-day OI` + (t[2] != null ? " (" + count(t[2]) + ")" : ""),
    "traded today: more contracts than the open interest it started the day with, and sizeable for the name"],
  BIG: ["t-big", () => "BIG", "far bigger than the name's typical big contract"],
  BIGC: ["t-big", () => "BIGGEST CALL PILE", "the call contract with the most open interest near the price"],
  BIGP: ["t-big", () => "BIGGEST PUT PILE", "the put contract with the most open interest near the price"],
  QE: ["t-qe", () => "QUARTER-END", "a big pile expiring on a quarter's last session"],
  KING: ["t-big", () => "KING CONTRACT", "the + king's main contract"],
  NKING: ["t-big", () => "− KING CONTRACT", "the − king's main contract"],
};
const tagH = (t, x) => { const d = TAGDEF[t[0]]; return d ? `<span class="tag ${d[0]}" title="${esc(d[2])}">${esc(d[1](t, x))}</span>` : ""; };
const pileName = (p, withSym) => `${withSym && p.sym ? p.sym + " " : ""}<span class="${p.side === "C" ? "cc" : "pp"}">${p.side}</span> ${kx(p.k).replace(/^\+|%$/g, "")} · ${xshort(p.exp)}`;
const pileTxt = (p, withSym) => `${withSym && p.sym ? p.sym + " " : ""}${p.side} ${String(p.k).replace(/\.0$/, "")} ${xshort(p.exp)}`;
function renderKP() {
  const d = S.d, K = d && d.kp, el = $("kp");
  if (!K || isVix() || isTotal()) { el.innerHTML = `<p class="note">No kings & piles for this page yet.</p>`; return; }
  const name = pname();
  const kpLive = d.live_session && S.live && S.live.in_session;
  $("kp-title").textContent = `Kings & piles · ${name}` + (d.replay_at ? ` · ${kpLive ? "latest" : "close"}` : "");
  $("kp-sub").textContent = (d.replay_at ? `as of the ${kpLive ? "latest" : "closing"} snapshot · ` : "") + `gamma per 1% move · expiries out to about 3 months` + (K.combined ? " · piles from each product's own page" : "");
  const king = (x, which) => {
    if (!x) return `<div class="king ${which}"><div class="k">${which === "pos" ? "+ King" : "− King"}</div><div class="v">—</div></div>`;
    const tags = (x.tags || []).map((t) => tagH(t, x)).join("");
    const hist = (x.hist || []).map((h, i, a) => `<i class="${i && h[1] !== a[i - 1][1] ? "mv" : ""}"><b>${h[1] != null ? fk(h[1]) : "—"}</b>${h[0].slice(5)}</i>`).join("");
    return `<div class="king ${which}"><div class="k">${which === "pos" ? "+ King · biggest call-side gamma" : "− King · biggest put-side gamma"}</div>` +
      `<div class="v">${fk(x.k)}<small>${x.exp ? xshort(x.exp) + " · " : ""}${money(Math.abs(x.g))} · ${(x.share * 100).toFixed(0)}% of all gamma</small></div>` +
      `<div class="r">${sgn(x.dist, (v) => v.toFixed(1))}% from price${x.sig != null ? ` · ${x.sig.toFixed(1)}σ to ${xshort(x.exp)}` : ""}` +
      `${x.prev != null && x.prev !== x.k ? ` · was ${fk(x.prev)}` : x.held > 1 ? ` · held ${x.held} sessions` : ""}</div>${tags}` +
      (hist ? `<div class="kspark">${hist}</div>` : "") + `</div>`;
  };
  const ps = K.piles || [], sym = isPair();
  const rows = ps.map((p) => `<tr${p.strong ? ' style="box-shadow:inset 3px 0 0 ' + GOLD + '"' : ""}><td>${pileName(p, sym)}</td><td class="r">${count(p.oi)}</td>` +
    `<td class="r">${count(p.vol)}</td><td class="r">${money(p.g)}</td><td class="r">${sgn(p.dist, (v) => v.toFixed(1))}%</td>` +
    `<td>${(p.tags || []).map((t) => tagH(t, p)).join("")}</td></tr>`).join("");
  el.innerHTML = `<div class="kings">${king(K.pos, "pos")}${king(K.neg, "neg")}</div>` + (rows ? `<div class="kpwrap"><table class="kptab"><thead><tr><th>Pile</th>` +
    `<th class="r">Open</th><th class="r">Traded today</th><th class="r">Gamma</th><th class="r">From price</th><th>Why it's listed</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>` : `<p class="note">No piles listed.</p>`);
}
function drawPiles(c, plotW, H) {
  const ps = (S.d.kp.piles || []).filter((p) => p.kc != null), lg = $("kp-legend");
  const ts = S.charts.price.timeScale(), dd = S.host.data();
  const lastX = dd.length ? ts.timeToCoordinate(dd[dd.length - 1].time) : null;
  const x0 = lastX != null && lastX < plotW * 0.9 ? Math.max(lastX + (S.bandsOn ? 44 : 10), plotW * 0.55) : plotW * 0.78;
  const mx = Math.max(...ps.map((p) => p.oi), 1), room = Math.max(24, (plotW - x0) * 0.3), off = [], marks = [];
  for (const p of ps) { const y = S.host.priceToCoordinate(p.kc); if (y == null || y < 6 || y > H - 32) off.push(p); else marks.push([y, p]); }
  marks.sort((a, b) => a[0] - b[0]);
  c.font = "600 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
  let lastY = -99;
  const kings = S.lines.map(([, l]) => S.host.priceToCoordinate(l.options().price)).filter((v) => v != null);
  for (const [y, p] of marks) {
    const len = Math.max(8, room * p.oi / mx), un = isUn(p);
    const onKing = kings.some((ky) => Math.abs(ky - y) < 7);
    c.fillStyle = p.side === "P" ? "rgba(239,83,80,.6)" : "rgba(38,166,154,.6)"; c.fillRect(x0, y - 4, len, 8);
    if (un) { c.strokeStyle = GOLD; c.lineWidth = 1.5; c.strokeRect(x0 - 0.5, y - 4.5, len + 1, 9); }
    if (onKing) { continue; }
    const ty = Math.max(y + 4, lastY + 13); lastY = ty;
    const f = (p.tags || []).find((t) => ["VOL", "QE", "BIG"].includes(t[0]));
    c.fillStyle = un ? GOLD : "#c3c6ce";
    c.fillText(`${pileTxt(p, isPair())} · ${count(p.oi)}` + (f ? " · " + TAGDEF[f[0]][1](f[0] === "VOL" ? f.slice(0, 2) : f, p).toLowerCase().replace(/ oi\b/, " OI") : ""), x0 + len + 6, ty);
  }
  lg.hidden = !off.length;
  lg.innerHTML = off.length ? `<span>piles off-screen:</span>` + off.map((p) => `<span style="${isUn(p) ? "color:" + GOLD : ""}">${pileTxt(p, isPair())} · ${count(p.oi)} (${sgn(p.dist, (v) => v.toFixed(1))}%)</span>`).join("") : "";
}


function dayCP(last) {
  const D = last.day || {};
  if (D.prem) return [D.prem.c || 0, D.prem.p || 0];
  const pb = D.premb || {};
  return [["d0", "wk", "lg"].reduce((a, k) => a + (pb["c" + k] || 0), 0), ["d0", "wk", "lg"].reduce((a, k) => a + (pb["p" + k] || 0), 0)];
}
function plainMega(d) {
  const all = ((d.mega && d.mega.names) || []).filter((x) => x.prev_close), newest = all.reduce((a, x) => x.session > a ? x.session : a, "");
  const N = all.filter((x) => x.session === newest);
  if (!N.length) return null;
  const up = N.filter((x) => x.spot >= x.prev_close).length;
  const sk = N.filter((x) => x.prem_c > 0 && x.prem_p > 0).map((x) => ({ s: x.sym, r: x.prem_c / x.prem_p, c: x.prem_c, p: x.prem_p }));
  const hi = sk.reduce((a, x) => (!a || x.r > a.r ? x : a), null), lo = sk.reduce((a, x) => (!a || x.r < a.r ? x : a), null);
  return `<b>Megacaps:</b> ${up} of ${N.length} up` + (hi ? ` · most call-heavy today <b>${hi.s}</b> (${ratio(hi.c, hi.p)})` : "") +
    (lo && lo !== hi ? ` · most put-heavy <b>${lo.s}</b> (${ratio(lo.c, lo.p)})` : "") + ".";
}
function plainVixLine(d) {
  const w = d.weather;
  return w && w.vix ? `<b>VIX:</b> ${w.vix.toFixed(2)} (${esc(w.bucket || "")})` + (w.ratio != null ? ` · VIX ÷ VIX3M ${w.ratio.toFixed(3)}, ` +
    (w.stress ? "<b class=\"dn\">stress zone</b>" : "normal") : "") + "." : null;
}
function renderPlain() {
  const d = S.d, out = [];
  if (!d || S.lx !== "simple") return;
  const last = d.latest || {}, lv = last.levels || {}, f = (x) => px(x, fs());
  if (isVix()) {
    const c = last.curve || [], v = d.vix || d, H = d.skew_hist || [];
    if (last.spot) out.push(`<b>VIX ${last.spot.toFixed(2)}</b>` + (d.prev_close ? ` (${sgn(last.spot - d.prev_close, (x) => x.toFixed(2))} today)` : "") +
      (c[0] && c[1] ? ` · futures curve ${c[1].fwd > c[0].fwd ? "in contango (calm)" : "<b class=\"dn\">in backwardation (stress)</b>"}: ${c.slice(0, 3).map((x) => x.fwd.toFixed(2)).join(" → ")}.` : "."));
    if (last.call_skew != null) { const days = [...new Set(H.map((r) => r.session))], back = days.length > 5 ? H.filter((r) => r.session === days[days.length - 6]).pop() : null;
      out.push(`<b>Call skew:</b> VIX calls cost ${sgn(last.call_skew, (x) => x.toFixed(1))} vol pts more than puts (30 days)` +
        (back ? `, ${sgn(last.call_skew - back.skew, (x) => x.toFixed(1))} vs 5 sessions ago` : "") + "."); }
    if (last.vol) out.push(`<b>Calls vs puts today:</b> <b class="${last.vol.c >= last.vol.p ? "up" : "dn"}">${ratio(last.vol.c, last.vol.p)}</b> by contracts (${count(last.vol.c)} vs ${count(last.vol.p)})` +
      (last.oi_c ? ` · held <b>${ratio(last.oi_c, last.oi_p)}</b>` : "") + ".");
    const vl = plainVixLine(d); if (vl) out.push(vl);
  } else if (isTotal()) {
    const [c, p] = dayCP(last);
    if (c + p) out.push(`<b>Calls vs puts today, all six:</b> <b class="${c >= p ? "up" : "dn"}">${ratio(c, p)}</b> by premium (${money(c)} vs ${money(p)}).`);
    const vl = plainVixLine(d); if (vl) out.push(vl);
    const m = plainMega(d); if (m) out.push(m);
  } else {
    const F = d.fut, Lp = livePx(), p = F ? F.last : Lp ? Lp.px : last.spot, em = d.em && d.em.em, c0 = d.prev_close;
    if (F) out.push(`<b>${d.sym} ${f(p)}</b>` + (F.prev_close ? ` (${sgn((p / F.prev_close - 1) * 100, (x) => x.toFixed(2))}% on the day)` : "") +
      ` · it trades ${sgn(F.basis, (x) => x.toFixed(2))} pts over ${F.base}, so every level here is the ${F.base} level + ${F.basis.toFixed(2)}.` +
      (F.on_hi != null ? ` Overnight range ${f(F.on_lo)} – ${f(F.on_hi)}.` : ""));
    if (em && c0) { const mv = p - c0, used = Math.abs(mv) / em * 100;
      out.push(`<b>Move:</b> ${sgn(mv / c0 * 100, (x) => x.toFixed(2))}% ${F ? `from the ${F.base} close + basis` : last.closed ? "on the day" : "so far"} = ` +
        `<b class="${used > 100 ? "dn" : ""}">${used.toFixed(0)}%</b> of the ±${f(em)} the options priced in${used > 100 ? " (outside the band)" : ""}.`); }
    if (lv.flip != null) out.push(`<b>Gamma:</b> ${p >= lv.flip ? "above" : "below"} the flip at ${f(lv.flip)} · biggest strike (king) ${f(lv.king)}` +
      (lv.call_wall != null ? ` · call wall ${f(lv.call_wall)} · put wall ${f(lv.put_wall)}` : "") + ".");
    const K = d.replay_at ? null : d.kp;
    if (K && K.pos) { const x = K.pos;
      out.push(`<b>King:</b> <b>${fk(x.k)}</b>${x.exp ? ` (${xshort(x.exp)} calls)` : ""}` +
        (x.prev != null && x.prev !== x.k ? `, moved from ${fk(x.prev)}` : x.held > 1 ? `, held ${x.held} sessions` : "") +
        ` · ${(x.share * 100).toFixed(0)}% of all gamma · ${Math.abs(x.dist).toFixed(1)}% ${x.dist >= 0 ? "above" : "below"} price` +
        (x.sig != null && (x.tags || []).some((t) => t[0] === "FAR") ? ` (${x.sig.toFixed(1)}σ, far)` : "") + "."); }
    const un = K && ((K.piles || []).find(isUn) || (K.piles || []).find((p) => (p.tags || []).some((t) => UNUSUAL.includes(t[0]))));
    if (un) { const tg = (c_) => (un.tags || []).find((t) => t[0] === c_);
      const why = tg("VOL") ? `, ${count(un.vol)} traded today = ${tg("VOL")[1]}× the open interest it started the day with` :
        tg("QE") ? ", expiring at quarter-end" : "";
      out.push(`<b>${un.strong ? "Unusual" : "Notable"} pile:</b> <b>${count(un.oi)} ${pileTxt(un, isPair())} ${un.side === "C" ? "calls" : "puts"}</b>${why} · ${Math.abs(un.dist).toFixed(1)}% ${un.dist >= 0 ? "above" : "below"} price.`); }
    const bp = K && (K.piles || []).find((p) => (p.tags || []).some((t) => t[0] === "BIGP"));
    if (bp && bp !== un) out.push(`<b>Biggest put pile:</b> ${count(bp.oi)} ${pileTxt(bp, isPair())} puts · ${Math.abs(bp.dist).toFixed(1)}% ${bp.dist >= 0 ? "above" : "below"} price.`);
    const [c, pu] = dayCP(last), D = last.day || {};
    if (c + pu) out.push(`<b>Calls vs puts today:</b> <b class="${c >= pu ? "up" : "dn"}">${ratio(c, pu)}</b> by premium (${money(c)} vs ${money(pu)})` +
      (D.oi_c ? ` · held <b>${ratio(D.oi_c, D.oi_p)}</b> (${count(D.oi_c)} vs ${count(D.oi_p)} open)` : "") + ".");
    if (!last.closed && last.em_rem) out.push(`<b>Rest of today:</b> options price ±${f(last.em_rem)} from here.`);
    else if (last.em_next) out.push(`<b>Next session:</b> the closing straddle prices ±${f(last.em_next)}.`);
    const vl = plainVixLine(d); if (vl) out.push(vl);
    const m = plainMega(d); if (m) out.push(m);
  }
  $("plain").innerHTML = out.map((x) => `<li>${x}</li>`).join("") || `<li>No data yet.</li>`;
}

function renderTilesTotal() {
  const d = S.d, last = d.latest, out = [];
  const dp = (last.day && last.day.premb) || {}, c = ["d0", "wk", "lg"].reduce((a, k) => a + (dp["c" + k] || 0), 0),
    pu = ["d0", "wk", "lg"].reduce((a, k) => a + (dp["p" + k] || 0), 0);
  out.push(tile(`Premium today, all six`, `${money(c + pu)}`,
    `calls ${money(c)} · puts ${money(pu)} · puts/calls ${c ? (pu / c).toFixed(2) : "—"}`));
  for (const [s_, name] of [["SPY", "S&P move"], ["QQQ", "Nasdaq move"], ["IWM", "Russell move"]]) {
    const em = (d.em || {})[s_], pc = (d.prev_close || {})[s_], v = memberPx(s_);
    if (em && em.em && pc && v) {
      const mv = (v / pc - 1) * 100, emp = em.em / pc * 100, used = Math.abs(mv) / emp * 100;
      out.push(tile(`${name} (${s_})`, `${sgn(mv, (x) => x.toFixed(2))}%<small>of ±${emp.toFixed(2)}%</small>`,
        used > 100 ? `<span class="chip warn">${used.toFixed(0)}%: outside the band</span>` : `${used.toFixed(0)}% of the expected move used`,
        `<div class="meter"><i class="${used > 100 ? "over" : ""}" style="width:${Math.min(100, used)}%"></i></div>`));
    } else out.push(tile(name, "—", ""));
  }
  const lv = last.levels || {}, sh = last.share || {};
  out.push(tile(`Gamma, all six`, lv.flip != null ? `${lv.flip <= 0 ? "Above" : "Below"} flip<small>${sgn(lv.flip, (x) => x.toFixed(2))}%</small>` : "—",
    `share: ` + Object.keys(PCOL).filter((k) => sh[k] != null).map((k) => `${k} ${(sh[k] * 100).toFixed(0)}%`).join(" · ")));
  $("tiles").innerHTML = out.join("");
}

function renderTilesVix() {
  const d = S.d, L = d.latest, c = L.curve || [], out = [];
  const chg = d.prev_close ? L.spot - d.prev_close : null;
  out.push(tile("VIX", `${L.spot.toFixed(2)}<small>${chg != null ? sgn(chg, (x) => x.toFixed(2)) : ""}</small>`, `as of ${L.t} ET (Cboe, ~15 min delayed)`));
  if (c[0]) { const prem = (c[0].fwd / L.spot - 1) * 100;
    out.push(tile("Front future vs spot", `${c[0].fwd.toFixed(2)}<small>${sgn(prem, (x) => x.toFixed(1))}%</small>`,
      prem >= 0 ? `contango: futures above spot (calm)` : `<span class="chip warn">backwardation: stress now</span>`)); }
  const w = d.weather;
  if (w && w.ratio != null) out.push(tile(`VIX ÷ VIX3M`, w.ratio.toFixed(3),
    w.stress ? `<span class="chip warn">stress zone</span>` : `normal`));
  out.push(tile("Call skew", L.call_skew != null ? sgn(L.call_skew, (x) => x.toFixed(1)) + "<small>vol pts</small>" : "—",
    `25-delta VIX calls vs puts, ${L.skew_days || 30} days out: higher = upside protection in demand`));
  out.push(tile("VIX options today", `${count(L.vol.c)}<small>calls</small>`, `${count(L.vol.p)} puts · premium ${money(L.prem.c)} / ${money(L.prem.p)}`));
  $("tiles").innerHTML = out.join("");
}

function clearLines() { for (const [s, l] of S.lines) { try { s.removePriceLine(l); } catch (e) {} } S.lines = []; }
function addLine(series, price, color, title, style = LW.LineStyle.Solid, width = 1) {
  if (price == null || !isFinite(price)) return;
  S.lines.push([series, series.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: true, title })]);
}


const VIEWS = [["today5m", "Today · 5m"], ["5d15m", "5 days · 15m"], ["1m1h", "1 month · 1H"], ["6mD", "6 months · D"]];
const TFS = ["5m", "15m", "30m", "1H", "2H", "4H", "D", "W", "2W", "M", "3M"];
const TFCOL = { "5m": "#00E5FF", "15m": "#26A69A", "30m": "#66BB6A", "1H": "#FF9800", "2H": "#F48FB1", "4H": "#FFEB3B", D: "#FFFFFF",
  W: "#2196F3", "2W": "#AB47BC", M: "#EF5350", "3M": "#4CAF50" };
const PRESETS = { Short: ["5m", "15m", "30m", "1H"], Medium: ["2H", "4H", "D"], Long: ["W", "2W", "M", "3M"], All: TFS, None: [] };
const VIEW_DEF = { today5m: { on: PRESETS.Short, mas: false, near: 0.012 }, "5d15m": { on: ["30m", "1H", "2H", "4H", "D"], mas: false, near: 0.03 },
  "1m1h": { on: ["2H", "4H", "D", "W"], mas: false, near: 0.06 }, "6mD": { on: ["D", "W", "2W", "M", "3M"], mas: true, near: 1 } };
const hexA = (c, a) => c + Math.round(a * 255).toString(16).padStart(2, "0");
function bandSel() {
  if (!S.bandSel[S.view]) { const r = recall("if.bands." + S.view);
    S.bandSel[S.view] = new Set(r != null ? r.split(",").filter(Boolean) : VIEW_DEF[S.view].on); }
  return S.bandSel[S.view];
}

const MAK = ["50D", "100D", "200D", "200W"], XK = ["SMA10", "Ribbon", "BB"];
const MACOL = { "50D": "#4CAF50", "100D": "#FFEB3B", "200D": "#EF5350", "200W": "#2196F3", SMA10: "#FFFF00", Ribbon: "#00E676", BB: "#2962FF" };
const MALAB = { "50D": "50 day", "100D": "100 day", "200D": "200 day", "200W": "200 week", SMA10: "SMA 10", Ribbon: "Ribbon 10/20", BB: "Bollinger 20" };
const RIBCOL = { 1: "#00E676", "-1": "#FF0000", 0: "#8C8C8C" };
function maSel() {
  if (!S.masSel[S.view]) { const r = recall("if.ma." + S.view), old = recall("if.mas." + S.view);
    S.masSel[S.view] = new Set(r != null ? r.split(",").filter(Boolean) : old != null ? (old === "1" ? MAK : []) : VIEW_DEF[S.view].mas ? MAK : []); }
  return S.masSel[S.view];
}
const chartSym = () => !S.d ? "SPY" : isPair() ? fs() : S.d.sym;
async function loadChart() {
  if (!S.d) return;
  const until = S.d.replay_at ? "&until=" + S.d.latest.ts : "";
  const want = isTotal() ? ["SPY", "QQQ", "IWM"] : [chartSym()];
  try {
    const got = await Promise.all(want.map((s_) => getJSON(`/api/chart?s=${s_}&view=${S.view}${until}`)));
    if (isTotal()) { S.chartTot = { SPY: got[0], QQQ: got[1], IWM: got[2] }; S.chart = null; } else { S.chart = got[0]; S.chartTot = null; }
  } catch (e) { S.chart = null; S.chartTot = null; }
  S.chartAt = Date.now();
  const empty = isTotal() ? !S.chartTot : !(S.chart && S.chart.bars && S.chart.bars.length) || S.chart.filling;
  S.chartTry = empty ? (S.chartTry || 0) + 1 : 0;
  if (empty && S.chartTry <= 24) setTimeout(loadChart, 5000);
  renderPrice(); renderBandRow();
  if (S.fitKey !== fitKey()) { if (!empty && (isTotal() || curChart())) S.fitKey = fitKey(); requestAnimationFrame(fitAll); }
  setTimeout(drawGexOv, 80);
}
function curChart() { const c = S.chart; return c && c.sym === chartSym() && c.view === S.view ? c : null; }
const lastVal = (a) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i]; return null; };

function syncBandSeries(C0) {
  const ch = S.charts, want = new Map(), sel = bandSel(), ms = maSel(), near = VIEW_DEF[S.view].near;
  S.offBands = [];
  if (S.bandsOn && C0 && C0.last) {


    let hi = -Infinity, lo = Infinity;
    for (const b of C0.bars) { if (b[2] > hi) hi = b[2]; if (b[3] < lo) lo = b[3]; }
    const pad = (hi - lo) / 2, isNear = (v) => near >= 1 || Math.abs(v / C0.last - 1) <= near || (v >= lo - pad && v <= hi + pad);
    for (const tf of TFS) {
      const bd = C0.bands[tf]; if (!bd || !sel.has(tf)) continue;
      const la = lastVal(bd.a), lb = lastVal(bd.b); if (la == null || lb == null) continue;
      if (!isNear(la) && !isNear(lb)) { S.offBands.push({ tf, lo: Math.min(la, lb), hi: Math.max(la, lb), color: TFCOL[tf] }); continue; }
      want.set(tf, bd);
    }
    for (const lab of MAK) {
      const m = (C0.mas || {})[lab]; if (!m || !ms.has(lab)) continue;
      const lv = lastVal(m.v); if (lv == null) continue;
      if (!isNear(lv)) { S.offBands.push({ tf: lab, lo: lv, hi: lv, color: MACOL[lab], ma: true }); continue; }
      want.set("ma:" + lab, { ma: true, color: MACOL[lab], v: m.v });
    }
    const X = C0.extras;
    if (X && ms.has("SMA10")) want.set("x:SMA10", { x: "line", color: MACOL.SMA10, v: X.sma10 });
    if (X && ms.has("Ribbon")) want.set("x:Ribbon", { x: "ribbon", f: X.rib_f, s: X.rib_s, st: X.rib_st });
    if (X && ms.has("BB")) want.set("x:BB", { x: "bb", u: X.bb_u, m: X.bb_m, l: X.bb_l });
  }
  for (const k of Object.keys(S.bandSeries)) if (!want.has(k)) {
    for (const x of S.bandSeries[k].list) { try { ch.price.removeSeries(x); } catch (e) {} }
    delete S.bandSeries[k];
  }
  const T = C0 ? C0.bars.map((b) => etT(b[0])) : [];
  const pts = (arr) => arr.map((v, i) => v == null ? null : { time: T[i], value: v }).filter(Boolean);
  for (const [k, bd] of want) {
    let e = S.bandSeries[k];
    const opt = (c, w, st) => ({ color: c, lineWidth: w, lineStyle: st || 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    if (!e) {
      const add = (o) => ch.price.addSeries(LW.LineSeries, o);
      e = bd.ma ? { list: [add(opt(bd.color, 2, 2))] }
        : bd.x === "line" ? { list: [add(opt(bd.color, 1))] }
        : bd.x === "ribbon" ? { list: [add(opt(RIBCOL[1], 1)), add(opt(RIBCOL[1], 1))] }
        : bd.x === "bb" ? { list: [add(opt("#2962FF", 1)), add(opt("#FF9800", 1)), add(opt("#2962FF", 1))] }
        : { list: [add(opt(bd.color, 2)), add(opt(hexA(bd.color, .7), 1))] };
      S.bandSeries[k] = e;
    }
    if (bd.ma || bd.x === "line") e.list[0].setData(pts(bd.v));
    else if (bd.x === "ribbon") {
      const cp = (arr) => arr.map((v, i) => v == null ? null : { time: T[i], value: v, color: hexA(RIBCOL[bd.st[i]], .85) }).filter(Boolean);
      e.list[0].setData(cp(bd.f)); e.list[1].setData(cp(bd.s));
    } else if (bd.x === "bb") { e.list[0].setData(pts(bd.u)); e.list[1].setData(pts(bd.m)); e.list[2].setData(pts(bd.l)); }
    else { e.list[0].setData(pts(bd.a)); e.list[1].setData(pts(bd.b)); }
    e.tf = k; e.bd = bd;
  }
}

function drawBandFills(c, plotW) {
  const lg = $("bands-legend");
  const C0 = curChart();
  if (!S.bandsOn || isTotal() || !C0) { lg.hidden = true; return; }
  const ts = S.charts.price.timeScale(), T = C0.bars.map((b) => etT(b[0]));
  const labels = [];
  for (const [k, e] of Object.entries(S.bandSeries)) {
    if (k.startsWith("x:")) {
      const bd = e.bd, s0 = e.list[0], X = (i) => ts.timeToCoordinate(T[i]);
      if (bd.x === "line") { const d_ = s0.data(); if (d_.length) { const p = d_[d_.length - 1];
        labels.push({ x: ts.timeToCoordinate(p.time), y: s0.priceToCoordinate(p.value), t: "SMA10", c: MACOL.SMA10 }); } continue; }
      const U = bd.x === "bb" ? bd.u : bd.f, D = bd.x === "bb" ? bd.l : bd.s;
      if (bd.x === "bb") {
        const A = [], B = [];
        U.forEach((v, i) => { if (v == null || D[i] == null) return; const x = X(i); if (x == null) return;
          A.push([x, s0.priceToCoordinate(v)]); B.push([x, s0.priceToCoordinate(D[i])]); });
        if (A.length < 2) continue;
        c.fillStyle = hexA("#2962FF", .08);
        c.beginPath(); c.moveTo(A[0][0], A[0][1]); A.forEach((p) => c.lineTo(p[0], p[1])); B.slice().reverse().forEach((p) => c.lineTo(p[0], p[1]));
        c.closePath(); c.fill(); continue;
      }
      for (let i = 0; i + 1 < U.length; i++) {
        if ([U[i], D[i], U[i + 1], D[i + 1]].some((v) => v == null)) continue;
        const x0 = X(i), x1 = X(i + 1); if (x0 == null || x1 == null) continue;
        c.fillStyle = hexA(RIBCOL[bd.st[i]], .3);
        c.beginPath(); c.moveTo(x0, s0.priceToCoordinate(U[i])); c.lineTo(x1, s0.priceToCoordinate(U[i + 1]));
        c.lineTo(x1, s0.priceToCoordinate(D[i + 1])); c.lineTo(x0, s0.priceToCoordinate(D[i])); c.closePath(); c.fill();
      }
      continue;
    }
    if (k.startsWith("ma:")) { const d_ = e.list[0].data(); if (d_.length) { const p = d_[d_.length - 1];
      labels.push({ x: ts.timeToCoordinate(p.time), y: e.list[0].priceToCoordinate(p.value), t: k.slice(3), c: e.bd.color }); } continue; }
    const A = [], B = [];
    e.bd.a.forEach((v, i) => { if (v == null || e.bd.b[i] == null) return; const x = ts.timeToCoordinate(T[i]); if (x == null) return;
      A.push([x, e.list[0].priceToCoordinate(v)]); B.push([x, e.list[0].priceToCoordinate(e.bd.b[i])]); });
    if (A.length < 2) continue;
    c.fillStyle = hexA(TFCOL[k], ["5m", "15m", "30m"].includes(k) ? .14 : .22);
    c.beginPath(); c.moveTo(A[0][0], A[0][1]); A.forEach((p) => c.lineTo(p[0], p[1])); B.slice().reverse().forEach((p) => c.lineTo(p[0], p[1]));
    c.closePath(); c.fill();
    const l = A[A.length - 1]; labels.push({ x: l[0], y: (l[1] + B[B.length - 1][1]) / 2, t: k, c: TFCOL[k] });
  }
  c.font = "700 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
  labels.sort((a, b) => a.y - b.y);
  let lastY = -99;
  for (const L of labels) { if (L.x == null || L.y == null || L.x > plotW - 14) continue;
    const y = Math.max(L.y + 4, lastY + 12); lastY = y; c.fillStyle = L.c; c.fillText(L.t, L.x + 6, y); }
  const fmtv = (v) => px(v, chartSym());
  const last = C0.last;
  lg.hidden = !S.offBands.length;
  lg.innerHTML = S.offBands.length ? `<span>off-screen on this view:</span>` + S.offBands.map((o) => { const dd = (o.hi / last - 1) * 100;
    return `<span><i style="background:${o.color}"></i>${esc(o.tf)}${o.ma ? "" : " band"} ${o.ma ? fmtv(o.lo) : fmtv(o.lo) + "–" + fmtv(o.hi)} ` +
      `<span class="${dd >= 0 ? "up" : "dn"}">${sgn(dd, (x) => x.toFixed(1))}%</span></span>`; }).join("") : "";
}

function renderBandRow() {
  const row = $("bandrow");
  document.querySelectorAll("#views button").forEach((b) => b.classList.toggle("on", b.dataset.v === S.view));
  if (!S.bandsOn) { row.hidden = true; return; }
  row.hidden = false;
  if (isTotal()) { row.innerHTML = `<span class="note">Bands are per product: open the SPY, QQQ or SPX tab (SPY+SPX uses SPX's).</span>`; return; }
  const C0 = curChart(), sel = bandSel(), have = new Set(Object.keys((C0 && C0.bands) || {}));
  const preset = Object.entries(PRESETS).find(([, v]) => v.filter((t) => have.has(t)).length === [...sel].filter((t) => have.has(t)).length &&
    v.filter((t) => have.has(t)).every((t) => sel.has(t)));
  row.innerHTML = `<span>Bands</span>` + TFS.map((tf) => `<button class="chip ${sel.has(tf) && have.has(tf) ? "on" : ""}" data-tf="${tf}" ${have.has(tf) ? "" : "disabled title=\"no history for this band on this view\""}>` +
      `<i style="background:${TFCOL[tf]}"></i>${tf}</button>`).join("") + `<span class="grpsep"></span>` +
    `<div class="seg">` + Object.keys(PRESETS).map((p) => `<button data-p="${p}" class="${preset && preset[0] === p ? "on" : ""}">${p}</button>`).join("") + `</div>` +
    `<span class="grpsep"></span><span>MAs</span>` + [...MAK, ...XK].map((k) => `<button class="chip ${maSel().has(k) ? "on" : ""}" data-ma="${k}">` +
      `<i style="background:${MACOL[k]}"></i>${MALAB[k]}</button>`).join("") +
    `<span class="sub" style="margin-left:auto">BMSB bands per timeframe, read as on the Eagle Eye tab (the previous closed bar)</span>`;
  const save = () => { store("if.bands." + S.view, [...bandSel()].join(",")); renderPrice(); renderBandRow(); drawGexOv(); };
  row.querySelectorAll("[data-tf]").forEach((b) => b.onclick = () => { const s_ = bandSel(); s_.has(b.dataset.tf) ? s_.delete(b.dataset.tf) : s_.add(b.dataset.tf); save(); });
  row.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => { S.bandSel[S.view] = new Set(PRESETS[b.dataset.p]); save(); });
  row.querySelectorAll("[data-ma]").forEach((b) => b.onclick = () => { const m = maSel(); m.has(b.dataset.ma) ? m.delete(b.dataset.ma) : m.add(b.dataset.ma);
    store("if.ma." + S.view, [...m].join(",")); save(); });
}

function renderPrice() {
  const d = S.d, ch = S.charts;
  clearLines();
  if (isTotal()) { syncBandSeries(null); return renderPriceTotal(); }
  ch.pSPY.setData([]); ch.pQQQ.setData([]); ch.pIWM.setData([]);
  const C0 = curChart(), intr = S.view !== "6mD";
  const raw = C0 ? C0.bars : (d.bars || []);
  const bars = raw.map((b) => ({ time: etT(b[0]), open: b[1], high: b[2], low: b[3], close: b[4] }));
  const pts = d.series.map((r) => ({ time: etT(r.ts), value: r.spot }));
  ch.candles.setData(bars);
  ch.spotLine.setData(bars.length ? [] : pts);
  ch.price.applyOptions({ timeScale: { timeVisible: intr } });
  const host = bars.length ? ch.candles : ch.spotLine;
  S.host = host;
  host.applyOptions({ autoscaleInfoProvider: (orig) => orig() });
  syncBandSeries(C0);
  const last = d.latest, lv = last.levels || {}, pc = d.prev_close, em = d.em && d.em.em;
  const leg = [], keep = [];
  if (isVix()) {
    if (pc) { addLine(host, pc, COL.gray, "prev close"); leg.push(["prev close", COL.gray, false]); keep.push(pc); }
    (last.curve || []).slice(0, 3).forEach((x, i) => { addLine(host, x.fwd, ["#c98500", "#d95926", "#9085e9"][i], `fut ${xlabel(x.exp)}`, LW.LineStyle.Dashed);
      keep.push(x.fwd); });
    if ((last.curve || []).length) leg.push(["VIX futures (from the options, by expiry)", "#c98500", true]);
  } else if (intr) {
    const pcl = isFut() ? `${d.fut.base} close` : "prev close";
    if (pc) { addLine(host, pc, COL.gray, pcl); leg.push([isFut() ? `${d.fut.base} close + basis` : "prev close", COL.gray, false]); keep.push(pc); }
    if (pc && em) { addLine(host, pc + em, COL.blue, "+EM", LW.LineStyle.Dashed, 2); addLine(host, pc - em, COL.blue, "−EM", LW.LineStyle.Dashed, 2);
      leg.push(["expected move (prev close ± straddle)", COL.blue, true]); keep.push(pc + em, pc - em); }
    if (!last.closed && last.em_rem) { const p0 = last.spot;
      addLine(host, p0 + last.em_rem, "#6f9ef0", "rest +", LW.LineStyle.Dotted); addLine(host, p0 - last.em_rem, "#6f9ef0", "rest −", LW.LineStyle.Dotted);
      leg.push(["rest of day (± same-day straddle)", "#6f9ef0", true]); }
    if (lv.king != null && !(S.kpOn && d.kp && !d.replay_at)) { addLine(host, lv.king, COL.purple, "king"); leg.push(["king (biggest net gamma)", COL.purple, false]); }
    if (lv.flip != null) { addLine(host, lv.flip, COL.orange, "flip", LW.LineStyle.Dashed); leg.push(["flip", COL.orange, true]); }
    if (lv.call_wall != null) { addLine(host, lv.call_wall, COL.call, "call wall"); leg.push(["call wall", COL.call, false]); }
    if (lv.put_wall != null && lv.put_wall !== lv.call_wall) { addLine(host, lv.put_wall, COL.put, "put wall"); leg.push(["put wall", COL.put, false]); }
    for (const v of [lv.king, lv.flip, lv.call_wall, lv.put_wall]) if (v != null && Math.abs(v / last.spot - 1) <= 0.012) keep.push(v);
  }
  if (S.kpOn && d.kp && !d.replay_at && !isVix() && !isTotal()) {
    const K = d.kp, pk = K.pos, nk = K.neg;
    if (pk) { addLine(host, pk.k, GOLD, `K+${pk.exp ? " " + xshort(pk.exp) : ""}`, LW.LineStyle.Solid, 2); leg.push(["+ king", GOLD, false]);
      if (Math.abs(pk.k / last.spot - 1) <= 0.012) keep.push(pk.k); }
    if (nk) { addLine(host, nk.k, COL.put, `K−${nk.exp ? " " + xshort(nk.exp) : ""}`, LW.LineStyle.Dashed, 2); leg.push(["− king", COL.put, true]);
      if (Math.abs(nk.k / last.spot - 1) <= 0.012) keep.push(nk.k); }
  }

  const T = bars.length ? bars : pts;
  ch.helper.setData(T.length && keep.length ? [{ time: T[0].time, value: Math.min(...keep) }, { time: T[T.length - 1].time, value: Math.max(...keep) }] : []);
  $("price-legend").innerHTML = leg.map(([t, c, dash]) => `<span><i class="${dash ? "dash" : ""}" style="background:${c};color:${c}"></i>${t}</span>`).join("") +
    `<span style="margin-left:auto">${C0 ? (VIEWS.find((v) => v[0] === S.view) || [, ""])[1] + " bars" + (chartSym() !== d.sym ? " · " + chartSym() : "") :
      bars.length ? "5-min bars" : "line = options-snapshot prices (bars not in yet)"}${intr ? "" : " · gamma levels show on the intraday views"}</span>`;
}

function renderPriceTotal() {
  const d = S.d, ch = S.charts, leg = [], today = S.view === "today5m";
  S.host = ch.pSPY;
  ch.candles.setData([]); ch.spotLine.setData([]); ch.helper.setData([]);
  let lo = 0, hi = 0;
  for (const s_ of ["SPY", "QQQ", "IWM"]) {
    const CT = S.chartTot && S.chartTot[s_];
    const bars = CT ? CT.bars : (((d.bars_by || {})[s_]) || []);
    const base = today ? (d.prev_close || {})[s_] : (bars.length ? bars[0][4] : null);
    const ser = s_ === "SPY" ? ch.pSPY : s_ === "QQQ" ? ch.pQQQ : ch.pIWM, fc = FAM[FAMOF[s_]].c;
    const pts = base ? bars.map((b) => ({ time: etT(b[0]), value: (b[4] / base - 1) * 100 })) : [];
    ser.setData(pts);
    for (const x of pts) { lo = Math.min(lo, x.value); hi = Math.max(hi, x.value); }
    const em = (d.em || {})[s_], pc = (d.prev_close || {})[s_];
    if (today && em && em.em && pc) { const e = em.em / pc * 100; lo = Math.min(lo, -e); hi = Math.max(hi, e);
      addLine(ser, e, fc, `+EM ${s_}`, LW.LineStyle.Dashed, 2); addLine(ser, -e, fc, `−EM ${s_}`, LW.LineStyle.Dashed, 2); }
    leg.push([`${FAM[FAMOF[s_]].name} (${s_}) % from ${today ? "previous close · dashed = its expected move" : "the view's first bar"}`, fc, false]);
  }
  addLine(ch.pSPY, 0, COL.gray, today ? "prev close" : "start");
  const lv = d.latest.levels || {};
  if (today && lv.flip != null && Math.abs(lv.flip) <= 1.5) { addLine(ch.pSPY, lv.flip, COL.orange, "flip (all)", LW.LineStyle.Dashed); lo = Math.min(lo, lv.flip); hi = Math.max(hi, lv.flip);
    leg.push(["combined flip, % from spot", COL.orange, true]); }
  const pad = (hi - lo) * 0.08 || 0.1;
  for (const ser of [ch.pSPY, ch.pQQQ, ch.pIWM]) ser.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: lo - pad, maxValue: hi + pad } }) });
  $("price-legend").innerHTML = leg.map(([t, c, dash]) => `<span><i class="${dash ? "dash" : ""}" style="background:${c};color:${c}"></i>${t}</span>`).join("") +
    `<span style="margin-left:auto">one axis: % change, so the three indexes compare directly</span>`;
}

function zoomBy(f) {
  const ts = S.charts.price.timeScale(), r = ts.getVisibleLogicalRange(); if (!r) return;
  const w = Math.max(8, (r.to - r.from) * f); ts.setVisibleLogicalRange({ from: r.to - w, to: r.to });
}


function renderGex() {
  const d = S.d, el = $("gex"), last = d.latest, lv = last.levels || {};
  const syms = last.syms || null;
  let rows = (last.strikes || []).map((r) => ({ k: r[0], net: r[1], mass: r[2], d0: r[3], pm: r[4] || null, p0: r[5] || null }));
  if (rows.length > 72) {
    const step = AGG_STEP[isFut() ? S.d.base : fs()] || 2, off = isFut() ? S.d.fut.basis : 0, by = new Map();
    for (const r of rows) { const k = Math.round((r.k - off) / step) * step + off;
      const a = by.get(k) || { k, net: 0, mass: 0, d0: 0, pm: r.pm && r.pm.map(() => 0), p0: r.p0 && r.p0.map(() => 0) };
      a.net += r.net; a.mass += r.mass; a.d0 += r.d0;
      if (r.pm) r.pm.forEach((v, i) => { a.pm[i] += v; a.p0[i] += r.p0[i]; });
      by.set(k, a); }
    rows = [...by.values()].sort((a, b) => a.k - b.k);
  }
  const mode = S.gexMode, val = (r) => r[mode];
  const W = el.clientWidth || 400, H = el.clientHeight || 430, padL = 84, padR = 10, padT = 8, padB = 22;
  if (!rows.length) { el.innerHTML = `<p class="note">No gamma map for this snapshot.</p>`; return; }
  const hiK = rows[rows.length - 1].k, loK = rows[0].k;
  const y = (k) => padT + (hiK - k) / (hiK - loK || 1) * (H - padT - padB);
  const rh = Math.max(2, (H - padT - padB) / rows.length - 1.5);
  const mx = Math.max(...rows.map((r) => Math.abs(val(r)))) || 1;
  const diverge = mode === "net";
  const x0 = diverge ? padL + (W - padL - padR) / 2 : padL;
  const sx = (v) => (diverge ? (W - padL - padR) / 2 : (W - padL - padR)) * Math.abs(v) / mx;
  const color = (r) => mode === "net" ? (r.net >= 0 ? COL.call : COL.put) : mode === "mass" ? COL.blue : COL.orange;
  const special = new Map();
  const hs = rows.length > 1 ? Math.abs(rows[1].k - rows[0].k) / 2 : 0;
  const mark = (k, t) => { if (k == null || k < Math.min(loK, hiK) - hs || k > Math.max(loK, hiK) + hs) return; const near = rows.reduce((a, r) => Math.abs(r.k - k) < Math.abs(a.k - k) ? r : a, rows[0]); special.set(near.k, (special.get(near.k) ? special.get(near.k) + " · " : "") + t); };
  mark(lv.king, "K"); mark(lv.call_wall, "CW"); mark(lv.put_wall, "PW");
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Gamma by strike">`;
  s += `<line x1="${x0}" x2="${x0}" y1="${padT}" y2="${H - padB}" stroke="${COL.line}"/>`;
  const every = Math.max(1, Math.ceil(rows.length / 16));
  rows.forEach((r, i) => {
    const v = val(r), w = Math.max(v ? 1 : 0, sx(v)), yy = y(r.k) - rh / 2;
    const x = diverge && v < 0 ? x0 - w : x0;
    const parts = !diverge && syms && (mode === "mass" ? r.pm : r.p0);
    if (parts) {
      let xx = x0;
      parts.forEach((pv, j) => { const ww = sx(pv); if (ww < 0.5) return;
        s += `<rect data-i="${i}" x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" width="${Math.max(0.5, ww - 1).toFixed(1)}" height="${rh.toFixed(1)}" rx="1.5" fill="${PCOL[syms[j]]}"/>`;
        xx += ww; });
    } else
    s += `<rect data-i="${i}" x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${w.toFixed(1)}" height="${rh.toFixed(1)}" rx="1.5" fill="${color(r)}"/>`;
    if (special.has(r.k)) s += `<text class="hl" x="${padL - 6}" y="${(y(r.k) + 3.5).toFixed(1)}" text-anchor="end">${kx(r.k)}</text>` +
      `<text class="hl" x="4" y="${(y(r.k) + 3.5).toFixed(1)}" style="fill:${COL.purple}">${special.get(r.k)}</text>`;
    else if (i % every === 0 && ![...special.keys()].some((k) => Math.abs(y(k) - y(r.k)) < 11))
      s += `<text x="${padL - 6}" y="${(y(r.k) + 3.5).toFixed(1)}" text-anchor="end">${kx(r.k)}</text>`;
  });
  const lineAt = (k, c, t, dash) => { if (k == null || k < loK || k > hiK) return;
    s += `<line x1="${padL}" x2="${W - padR}" y1="${y(k).toFixed(1)}" y2="${y(k).toFixed(1)}" stroke="${c}" stroke-width="1.5" ${dash ? 'stroke-dasharray="5 4"' : ""}/>`;
    s += `<text x="${W - padR}" y="${(y(k) - 4).toFixed(1)}" text-anchor="end" style="fill:${c}">${t}</text>`; };
  const L = livePx(), spot = isTotal() ? 0 : (L ? L.px : last.spot);
  lineAt(spot, COL.txt, isTotal() ? "spot (each product's own)" : `spot ${px(spot, fs())}`, false);
  if (mode === "net") lineAt(lv.flip, COL.orange, `flip ${kx(lv.flip)}`, true);
  s += `<text x="${diverge ? x0 : padL}" y="${H - 6}" text-anchor="${diverge ? "middle" : "start"}">${diverge ? "← puts heavier · calls heavier →" : "$ hedged per 1% move →"}</text></svg>`;
  el.innerHTML = s;
  el.onmousemove = (e) => {
    const t = e.target; if (!t.dataset || t.dataset.i == null) return hideTip();
    const r = rows[+t.dataset.i];
    const split = syms && r.pm ? "<br>" + syms.map((s_, j) => `<span style="color:${PCOL[s_]}">■</span> ${s_} ${money(mode === "d0" ? r.p0[j] : r.pm[j])}`).join(" · ") : "";
    showTip(e, `<b>${kx(r.k)}</b><br>net ${money(r.net)} · all ${money(r.mass)}<br>0DTE ${money(r.d0)}${split}<br><span style="color:${COL.sub}">$ hedged per 1% move</span>`);
  };
  el.onmouseleave = hideTip;
  const labels = { net: "Net = call gamma minus put gamma.",
    mass: "All = every contract's gamma, unsigned: where hedging is heaviest.",
    d0: "0DTE = contracts expiring today only: where same-day hedging is heaviest." };
  const comboNote = isFut() ? `${d.etf} and ${d.base} strikes moved onto ${d.sym} by the basis (${sgn(d.fut.basis, (x) => x.toFixed(2))}). ` :
    isPair() ? `${d.etf} strikes converted to ${fs()} points (× ${((last.ratio || {})[d.etf] || 0).toFixed(3)}). ` :
    isTotal() ? "Rows = % from each product's own spot. " : "";
  const stackLeg = syms && mode !== "net" ? " Colours: " + syms.map((s_) => s_ + " " + ({ SPY: "blue", SPX: "orange", QQQ: "aqua", NDX: "amber", IWM: "magenta", RUT: "violet" })[s_]).join(", ") + "." : "";
  $("gexnote").textContent = comboNote + "K = king, CW / PW = call / put wall. " + labels[mode] + stackLeg + (last.closed && mode === "d0" ? " Today's contracts have expired." : "") +
    ` Snapshot ${last.t} ET.` + (lv.magnets ? ` Heaviest near spot: ${lv.magnets.map(kx).join(", ")}.` : "");
}


function winVol(w, side, b) { if (!w) return 0; if (b === "all") return ["d0", "wk", "lg"].reduce((a, k) => a + (w[side + k] || 0), 0); return w[side + b] || 0; }
function renderFlow() {
  const d = S.d, b = S.flowB;
  const rows = d.series.filter((r) => r.win);
  S.flowRows = rows;
  const uf = { type: "custom", formatter: (v) => vfmtU(Math.abs(v)), minMove: 1 };
  S.charts.fc.applyOptions({ priceFormat: uf }); S.charts.fp.applyOptions({ priceFormat: uf });
  S.charts.fc.setData(rows.map((r) => ({ time: etT(r.ts), value: winVol(r.win, "c", b) })));
  S.charts.fp.setData(rows.map((r) => ({ time: etT(r.ts), value: -winVol(r.win, "p", b) })));
  S.charts.flow.timeScale().fitContent();
  flowLegend(null);
}
function flowLegend(p) {
  const d = S.d; if (!d) return;
  const rows = S.flowRows || [];
  let r = rows[rows.length - 1];
  if (p && p.time) r = rows.find((x) => etT(x.ts) === p.time) || r;
  const dv = d.latest.day && (d.flow_unit === "$" ? d.latest.day.premb : d.latest.day.vol), b = S.flowB;
  const dc = winVol(dv, "c", b), dp = winVol(dv, "p", b);
  const win = r ? `${r.since}–${r.t}: calls <b>${vfmtU(winVol(r.win, "c", b))}</b> · puts <b>${vfmtU(winVol(r.win, "p", b))}</b>` : "first snapshot of the day: no window yet";
  $("flow-legend").innerHTML = `<span><i class="sq" style="background:${COL.call}"></i>calls (up)</span><span><i class="sq" style="background:${COL.put}"></i>puts (down)</span>` +
    `<span>${win}</span><span style="margin-left:auto">${d.flow_unit === "$" ? "premium, " : ""}day: calls ${vfmtU(dc)} · puts ${vfmtU(dp)} · put/call ${dc ? (dp / dc).toFixed(2) : "—"}</span>`;
}

function renderTop() {
  const d = S.d, w = d.latest.win;
  if (!w || !w.top || !w.top.length) { $("top").innerHTML = `<p class="note">Needs two snapshots of the same day.</p>`; return; }
  const sp = d.latest.spot, spots = d.latest.spots || {};
  let h = `<p class="sub">Contracts traded ${w.since}–${d.latest.t} ET, ranked by premium (volume × mid).</p>`;
  const cmb = isCombo();
  h += `<div style="overflow-x:auto"><table class="t"><tr><th>Expiry</th><th class="r">Strike</th><th></th><th class="r">Contracts</th>${cmb ? "" : '<th class="r">Mid</th>'}<th class="r">Premium</th><th class="r">vs OI</th></tr>`;
  for (const x of w.top) {
    const otm = ((x.k / (spots[x.sym] || sp) - 1) * 100);
    h += `<tr><td>${x.sym ? `<span class="chip" style="color:${PCOL[x.sym]}">${x.sym}</span> ` : ""}${xlabel(x.exp)}${x.root ? ' <span class="chip">AM</span>' : ""}</td><td class="r">${px(x.k, x.sym || fs()).replace(".00", "")}<span style="color:${COL.sub}"> ${sgn(otm, (v) => v.toFixed(1))}%</span></td>` +
      `<td><span class="side ${x.side}">${x.side.toUpperCase()}</span></td><td class="r">${count(x.dv)}</td>${cmb ? "" : `<td class="r">${x.px.toFixed(2)}</td>`}<td class="r">${money(x.prem)}</td>` +
      `<td class="r">${x.oi ? (x.dv / x.oi < 0.1 ? "<0.1×" : (x.dv / x.oi).toFixed(1) + "×") : "new"}</td></tr>`;
  }
  $("top").innerHTML = h + `</table></div>`;
}


function renderIV() {
  const d = S.d;
  if (isTotal()) {
    const ch = S.charts.ivs;
    const sr = { sp: ch.d0, nq: ch.w1, ru: ch.m1 };
    for (const [k, ser] of Object.entries(sr)) { ser.applyOptions({ color: FAM[k].c });
      ser.setData(d.series.filter((r) => r.iv && r.iv[k] != null).map((r) => ({ time: etT(r.ts), value: r.iv[k] }))); }
    S.charts.iv.timeScale().fitContent(); ivLegend(null); return;
  }
  S.charts.ivs.d0.applyOptions({ color: IVCOL.d0 }); S.charts.ivs.w1.applyOptions({ color: IVCOL.w1 }); S.charts.ivs.m1.applyOptions({ color: IVCOL.m1 });
  for (const k of ["d0", "w1", "m1"]) S.charts.ivs[k].setData(d.series.filter((r) => r.iv && r.iv[k] != null).map((r) => ({ time: etT(r.ts), value: r.iv[k] })));
  S.charts.iv.timeScale().fitContent();
  ivLegend(null);
}
function ivLegend(p) {
  const d = S.d; if (!d) return;
  if (isTotal()) {
    const last = d.series[d.series.length - 1] || {}; let row = last;
    if (p && p.time) row = d.series.find((x) => etT(x.ts) === p.time) || last;
    $("iv-legend").innerHTML = [["sp", "S&P 1-month (SPX)", FAM.sp.c], ["nq", "Nasdaq 1-month (NDX)", FAM.nq.c], ["ru", "Russell 1-month (RUT)", FAM.ru.c]].map(([k, n, c]) =>
      `<span><i style="background:${c}"></i>${n} <b>${row.iv && row.iv[k] != null ? row.iv[k].toFixed(1) + "%" : "—"}</b></span>`).join("") +
      `<span style="margin-left:auto">ATM implied vol, annualised</span>`;
    return;
  }
  const e = d.latest.iv_exp || {}, names = { d0: "same day", w1: "~1 week", m1: "~1 month" };
  const last = d.series[d.series.length - 1] || {};
  let row = last;
  if (p && p.time) row = d.series.find((x) => etT(x.ts) === p.time) || last;
  $("iv-legend").innerHTML = ["d0", "w1", "m1"].map((k) => {
    const v = row.iv && row.iv[k];
    return `<span><i style="background:${IVCOL[k]}"></i>${names[k]}${e[k] ? " (" + dlabel(e[k], false) + ")" : ""} <b>${v != null ? v.toFixed(1) + "%" : "—"}</b></span>`;
  }).join("") + `<span style="margin-left:auto">ATM implied vol, annualised</span>`;
}
function renderSkew() {
  const d = S.d;
  if (isVix()) {
    S.charts.skews.applyOptions({ color: COL.purple }); S.charts.skews2.setData([]); S.charts.skews3.setData([]);
    const H = (d.skew_hist || []).slice().sort((a, b) => a.ts - b.ts).filter((r, i, a) => !i || r.ts !== a[i - 1].ts);
    S.charts.skews.setData(H.map((r) => ({ time: etT(r.ts), value: r.skew })));
    S.charts.skew.timeScale().fitContent();
    const z = H[H.length - 1];
    if (!z) { $("skewnote").innerHTML = "No skew reading."; return; }
    const days = [...new Set(H.map((r) => r.session))], today = H.filter((r) => r.session === z.session);
    const back = days.length > 5 ? H.filter((r) => r.session === days[days.length - 6]).pop() : null;
    const chg = (a, lab) => a ? ` · ${sgn(z.skew - a.skew, (v) => v.toFixed(1))} ${lab}` : "";
    $("skewnote").innerHTML = `25-delta VIX calls <b>${z.c25 != null ? z.c25.toFixed(1) + "%" : "—"}</b> vs puts <b>${z.p25 != null ? z.p25.toFixed(1) + "%" : "—"}</b> ` +
      `implied vol, ${z.days || 30} days out: calls cost <b>${sgn(z.skew, (v) => v.toFixed(1))} vol pts</b> more` +
      chg(today.length > 1 ? today[0] : null, "today") + chg(back, "vs 5 sessions ago") +
      `. Rising = upside VIX calls (crash hedges) being bought.`;
    return;
  }
  if (isTotal()) {
    const L3 = ["sp", "nq", "ru"].map((k) => [k, d.series.filter((r) => r.rr25 && r.rr25[k] != null).map((r) => ({ time: etT(r.ts), value: r.rr25[k] }))]);
    const sers = [S.charts.skews, S.charts.skews2, S.charts.skews3];
    L3.forEach(([k, pts], i) => { sers[i].applyOptions({ color: FAM[k].c }); sers[i].setData(pts); });
    S.charts.skew.timeScale().fitContent();
    $("skewnote").innerHTML = L3.map(([k, pts]) => `<span style="color:${FAM[k].c}">■</span> ${FAM[k].name} <b>${pts.length ? pts[pts.length - 1].value.toFixed(2) : "—"} pts</b>`).join(" · ") +
      `: how much more 25-delta puts cost than calls, 1 month out.`;
    return;
  }
  S.charts.skews.applyOptions({ color: COL.purple }); S.charts.skews2.setData([]); S.charts.skews3.setData([]);
  const pts = d.series.filter((r) => r.rr25 != null).map((r) => ({ time: etT(r.ts), value: r.rr25 }));
  S.charts.skews.setData(pts);
  S.charts.skew.timeScale().fitContent();
  const a = pts[0], z = pts[pts.length - 1];
  $("skewnote").innerHTML = z ? `25-delta puts cost <b>${z.value.toFixed(2)} vol pts</b> more than 25-delta calls` +
    (a && pts.length > 1 ? ` (${sgn(z.value - a.value, (v) => v.toFixed(2))} today)` : "") + `. Rising while price is flat = protection being bought.` : "No skew reading.";
}


function renderStress() {
  const w = S.d.weather;
  if (!w) { $("stress").innerHTML = `<p class="note">VIX numbers not in yet.</p>`; return; }
  const key = S.sym === "QQQ" ? "QQQ" : "SPY";
  const rr = (k, h) => { const f = w[k] || {}; return f[h] && f[h].sd_pct != null ? `±${f[h].sd_pct.toFixed(2)}%` : "—"; };
  const r = (h) => isTotal() ? `S&P ${rr("SPY", h)} · Nasdaq ${rr("QQQ", h)}` : rr(key, h);
  const ratio = w.ratio, lv = (k) => w[k] != null ? w[k].toFixed(2) + ((w.closes || []).includes(k) ? ' <small class="cl">last close</small>' : "") : "—";
  $("stress").innerHTML = `<dl class="kv"><dt>VIX</dt><dd>${lv("vix")}</dd>` +
    `<dt>VXN (Nasdaq)</dt><dd>${lv("vxn")}</dd><dt>VIX3M</dt><dd>${lv("vix3m")}</dd>` +
    `<dt>VIX ÷ VIX3M</dt><dd>${ratio != null ? ratio.toFixed(3) : "—"} ${ratio != null && w.stress != null ? (w.stress ? '<span class="chip warn">stress zone</span>' : '<span class="chip good">normal</span>') : ""}</dd>` +
    `<dt>Typical move, 1 week</dt><dd>${r("5d")}</dd><dt>Typical move, 1 month</dt><dd>${r("21d")}</dd></dl>` +
    `<p class="note">VIX ${esc(w.bucket || "")}: a −2% day within 5 sessions ${oneIn(w.p_2pct_5d)}, a 5% drawdown within a month ${oneIn(w.p_dd5_21d)} ` +
    `(all days: ${oneIn(w.base_2pct_5d)} / ${oneIn(w.base_dd5_21d)}). ${isTotal() ? "Moves: SPY on VIX, QQQ on VXN" : `Moves are ${key}'s`}.</p>`;
}

function renderRecord() {
  if (isTotal()) {
    const R = S.d.record || {};
    $("rec").innerHTML = Object.keys(PCOL).filter((s_) => (R[s_] || []).length).map((s_) => { const rec = R[s_] || [], k = rec.filter((r) => r.inside).length;
      return `<div style="margin-bottom:10px"><b style="color:#fff">${s_}</b> <span class="sub">${k} of ${rec.length} inside</span><div class="dots" style="margin:4px 0">` +
        rec.map((r) => `<i class="${r.inside ? "in" : "out"}" data-t="${esc(s_ + " " + dlabel(r.session))}: moved ${r.used.toFixed(0)}% of ±${r.em.toFixed(2)}"></i>`).join("") + `</div></div>`; }).join("") +
      `<div class="legend"><span><i class="sq" style="background:var(--good)"></i>inside</span><span><i class="sq" style="background:var(--warn)"></i>outside</span></div>` +
      `<p class="note">Did each close land within the previous close's straddle? A fairly priced straddle lands inside about 6 days in 10.</p>`;
    $("rec").querySelectorAll(".dots i").forEach((x) => { x.onmousemove = (e) => showTip(e, esc(x.dataset.t)); x.onmouseleave = hideTip; });
    return;
  }
  const rec = S.d.record || [];
  if (!rec.length) { $("rec").innerHTML = `<p class="note">Builds up as sessions are stored.</p>`; return; }
  const n = rec.length, k = rec.filter((r) => r.inside).length;
  let h = `<div class="big">${k} of ${n} <small style="font-size:13px;color:${COL.sub};font-weight:500">closes inside the band</small></div>`;
  h += `<div class="dots">` + rec.map((r) => `<i class="${r.inside ? "in" : "out"}" data-t="${esc(dlabel(r.session))}: moved ${r.used.toFixed(0)}% of ±${r.em.toFixed(2)}"></i>`).join("") + `</div>`;
  h += `<div class="legend"><span><i class="sq" style="background:var(--good)"></i>inside</span><span><i class="sq" style="background:var(--warn)"></i>outside</span></div>`;
  h += `<p class="note">Each dot: did the close land within the previous close's straddle? A fairly priced straddle lands inside about 6 days in 10. Newest on the right.</p>`;
  $("rec").innerHTML = h;
  $("rec").querySelectorAll(".dots i").forEach((x) => { x.onmousemove = (e) => showTip(e, esc(x.dataset.t)); x.onmouseleave = hideTip; });
}

function renderCal() {
  const c = S.d.calendar || [];
  const today = (S.live && S.live.now || "").slice(0, 10);
  const nice = { cpi: "CPI", fomc_meeting: "FOMC meeting", fomc_statement: "FOMC decision", fomc_minutes: "FOMC minutes",
    employment_situation: "Jobs report", gdp: "GDP", pce: "PCE inflation", monthly_opex: "Monthly options expiry",
    index_options_last_trade: "SPX AM monthly last trade", vix_monthly_expiration: "VIX expiry", bond_market_holiday: "Bond market closed",
    quarter_end: "Quarter-end collar reset", election: "Election", market_holiday: "Market holiday", early_close: "Early close", nyse_early_close: "Early close" };
  $("cal").innerHTML = `<ul class="cal">` + c.slice(0, 12).map((e) => {
    const days = (Date.parse(e.date) - Date.parse(today)) / 864e5;
    return `<li class="${days >= 0 && days <= 3 ? "soon" : ""}"><span class="d">${dlabel(e.date)}</span><span class="tm">${esc(e.time || "")}</span>` +
      `<span class="l" title="${esc(e.label)}">${esc(nice[e.kind] || e.kind)}</span></li>`; }).join("") + `</ul>`;
}

function renderFoot() {
  const d = S.d;
  const combo = isFut() ? `<b>${d.sym}.</b> The ${d.etf}+${d.base} options book moved onto ${d.sym}: every ${d.base} level + the basis (${d.sym} − ${d.base}, ` +
    `on their latest shared 5-minute closes). Futures bars: CME, sessions 18:00–17:00 ET; intraday bands run from the 18:00 open. ` :
    isPair() ? `<b>${d.etf}+${fs()}.</b> One book in ${fs()} points: ${d.etf} strikes × (${fs()} ÷ ${d.etf}); dollar gamma adds across products; volume is premium in $ because the contracts differ in size. ` :
    isTotal() ? `<b>Total.</b> SPY, SPX, QQQ, NDX, IWM and RUT. Gamma rows are % from each product's own price; volume is premium in $. ` : "";
  $("foot").innerHTML = combo + `<b>Sources.</b> Options: Cboe delayed quotes (about 15 minutes behind), every 15 minutes in the session; this page refreshes after each pull and after the close. Open interest is the previous settle. Price: 5-minute bars (no live quote here; between bars the price is the options snapshot's). VIX odds and typical moves: our own volatility model. Net gamma = call gamma minus put gamma.`;
}


function drawGexOv() {
  const cv = $("gexov"), wrap = $("pricewrap");
  const W = wrap.clientWidth, H = wrap.clientHeight, dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; }
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  if (S.d && S.host && S.charts.price) drawBandFills(c, S.charts.price.timeScale().width());
  else $("bands-legend").hidden = true;
  if (S.kpOn && !S.gexOv && S.d && S.d.kp && !S.d.replay_at && S.host && S.charts.price && !isVix() && !isTotal()) drawPiles(c, S.charts.price.timeScale().width(), H);
  else $("kp-legend").hidden = true;
  if (!S.gexOv || !S.d || !S.host || !S.charts.price || isVix() || (isTotal() && S.view !== "today5m")) return;
  const d = S.d, last = d.latest, lv = last.levels || {}, syms = last.syms || null, mode = S.gexMode;
  const rows = (last.strikes || []).map((r) => ({ k: r[0], net: r[1], mass: r[2], d0: r[3], pm: r[4] || null, p0: r[5] || null }));
  if (!rows.length) return;
  let c0 = 0;
  if (isTotal()) { const pc = (d.prev_close || {}).SPY, sp = (last.spots || {}).SPY; c0 = pc && sp ? sp / pc - 1 : 0; }
  const axv = (k) => isTotal() ? ((1 + c0) * (1 + k / 100) - 1) * 100 : k;
  const val = (r) => mode === "net" ? r.net : mode === "mass" ? r.mass : r.d0;
  const mx = Math.max(...rows.map((r) => Math.abs(val(r)))) || 1;
  const plotW = S.charts.price.timeScale().width(), plotH = H - 26;
  const ts = S.charts.price.timeScale(), lr = ts.getVisibleLogicalRange();
  const lastX = (() => { const dd = S.host.data(); return dd.length ? ts.timeToCoordinate(dd[dd.length - 1].time) : null; })();
  const x0 = lastX != null && lastX < plotW * 0.8 ? Math.max(lastX + (S.bandsOn && !isTotal() ? 44 : 8), plotW * 0.5) : plotW * 0.70;
  const maxLen = Math.max(40, plotW - x0 - 12);
  const ys = rows.map((r) => S.host.priceToCoordinate(axv(r.k)));
  c.strokeStyle = "rgba(138,142,153,.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 0.5, 0); c.lineTo(x0 + 0.5, plotH); c.stroke();
  rows.forEach((r, i) => {
    const y = ys[i]; if (y == null || y < 0 || y > plotH) return;
    const nb = [ys[i - 1], ys[i + 1]].filter((v) => v != null).map((v) => Math.abs(v - y));
    const h = Math.max(1.5, Math.min(14, (nb.length ? Math.min(...nb) : 6) - 1));
    const v = val(r), len = maxLen * Math.abs(v) / mx;
    if (len < 0.5) return;
    const parts = mode !== "net" && syms && (mode === "mass" ? r.pm : r.p0);
    if (parts) { let xx = x0; parts.forEach((pv, j) => { const ww = maxLen * pv / mx; if (ww < 0.5) return;
        c.fillStyle = PCOL[syms[j]] + "b3"; c.fillRect(xx, y - h / 2, Math.max(0.5, ww - 1), h); xx += ww; }); return; }
    c.fillStyle = mode === "net" ? (v >= 0 ? "rgba(38,166,154,.7)" : "rgba(239,83,80,.7)") : mode === "mass" ? "rgba(61,127,230,.7)" : "rgba(201,131,23,.75)";
    c.fillRect(x0, y - h / 2, len, h);
  });
  const lab = `GEX · ${{ net: "Net", mass: "All", d0: "0DTE" }[mode]} · king ${kx(lv.king)} · flip ${lv.flip != null ? kx(lv.flip) : "—"} · ${last.t} ET`;
  c.font = "600 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
  const tw = c.measureText(lab).width;
  c.fillStyle = "rgba(19,23,34,.88)"; c.fillRect(plotW - tw - 18, 6, tw + 12, 20);
  c.strokeStyle = "#363a45"; c.strokeRect(plotW - tw - 18 + 0.5, 6.5, tw + 11, 19);
  c.fillStyle = "#d1d4dc"; c.fillText(lab, plotW - tw - 12, 20);
}

function mtfSym() { return isTotal() ? S.mtfPick : isMega() ? S.sym : FAM[FAMOF[S.sym] || "sp"].etf; }
async function loadMtf() {
  if (!S.mtfOn || !S.d || isVix()) return;
  const sym = mtfSym();
  try { S.mtf = await getJSON(`/api/mtf?s=${sym}&live=${S.mtfLive ? 1 : 0}`); }
  catch (e) { S.mtf = { sym, error: "Eagle Eye table not available (" + e.message + ")" }; }
  renderMtf();
}
function renderMtf() {
  const box = $("mtfbox");
  box.hidden = !S.mtfOn; if (!S.mtfOn) return;
  box.className = S.mtfPos === "bl" ? "bl" : "";
  const sym = mtfSym(), m = S.mtf && S.mtf.sym === sym ? S.mtf : null, t = m && m.table;
  const proxy = S.d && S.d.sym !== sym && !isTotal() ? ` (${FAM[FAMOF[S.sym] || "sp"].name} proxy)` : "";
  let h = `<div class="mh"><b>Eagle Eye MTF</b>${isTotal() ? "" : `<span>${sym}${proxy}</span>`}` +
    (isTotal() ? ["SPY", "QQQ", "IWM"].map((x) => `<button data-pick="${x}" class="${x === sym ? "on" : ""}">${x}</button>`).join("") : "") +
    `<span class="sp"></span><button data-pos="1" title="Move the table to the other corner">${S.mtfPos === "bl" ? "▲ top" : "▼ bottom"}</button></div>`;
  if (!m) h += `<div class="note">${S.mtf && S.mtf.error ? esc(S.mtf.error) : "loading…"}</div>`;
  else if (!t) h += `<div class="note">${esc(m.error || "no table")}</div>`;
  else {
    h += `<table id="mtftable"><tbody>`;
    if (t.groups && t.groups.length) {
      h += '<tr class="grp"><td></td>'; let col = 0;
      t.groups.forEach((gr) => { const a = gr.span[0], b = gr.span[1];
        if (a > col) h += `<td colspan="${a - col}"></td>`;
        h += `<td colspan="${b - a + 1}" style="color:${esc(gr.color)};border-bottom:3px solid ${esc(gr.color)}">${esc(gr.label)}</td>`; col = b + 1; });
      h += "</tr>";
    }
    (t.rows || []).forEach((r) => {
      if (r.key === "groups") return;
      const mode = r.key === "header";
      const tip = mode ? (r.label_tip || "") + "\n\nClick to switch to " + (t.mode === "LIVE" ? "CLOSED" : "LIVE") + "." : (r.label_tip || "");
      h += `<tr><td class="rl${mode ? " modebtn" : ""}"${r.label_color ? ` style="color:${esc(r.label_color)}"` : ""}${tip ? ` title="${esc(tip)}"` : ""}>${esc(r.label)}${mode ? " ⇄" : ""}</td>`;
      (r.cells || []).forEach((c, j) => { const col = (t.columns || [])[j] || {};
        const cls = [(r.key === "header" || r.key === "closed") && col.highlight ? "hl" : "", c.mark ? "mk" : ""].join(" ").trim();
        h += `<td${cls ? ` class="${cls}"` : ""}${c.tip ? ` title="${esc(c.tip)}"` : ""} style="background:${esc(c.bg || "transparent")};color:${esc(c.fg || "#d1d4dc")};${c.bold ? "font-weight:700" : ""}">${esc(c.text)}</td>`; });
      h += "</tr>";
    });
    h += `</tbody></table><div id="mtffoot">` + (t.footer || []).map((f) => `<div style="color:${esc(f.color || "#b2b5be")}">${esc(f.text)}</div>`).join("") + `</div>`;
    const e = m.episode;
    if (e) h += `<div id="mtfep" style="border-color:${esc(e.frame_color || "#ef5350")}"><div style="display:flex;justify-content:space-between;font-weight:700">` +
      `<span style="color:${esc(e.title_color || e.frame_color || "#ef5350")}">${esc(e.title)}</span><span style="color:${COL.sub}">${esc(e.subtitle || "")}</span></div>` +
      (e.lines || []).slice(0, 3).map((l) => `<div style="color:${esc(l.color || "#b2b5be")}">${esc(l.text)}</div>`).join("") + `</div>`;
  }
  box.innerHTML = h;
  box.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { S.mtfPick = b.dataset.pick; S.mtf = null; renderMtf(); loadMtf(); });
  const pos = box.querySelector("[data-pos]");
  if (pos) pos.onclick = () => { S.mtfPos = S.mtfPos === "bl" ? "tl" : "bl"; store("if.mtfpos", S.mtfPos); renderMtf(); };
  const mb = box.querySelector("td.modebtn");
  if (mb) mb.onclick = () => { S.mtfLive = !S.mtfLive; store("if.mtflive", S.mtfLive ? "1" : "0"); S.mtf = null; renderMtf(); loadMtf(); };
}
function syncToggles() {
  $("pricetog").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.t === "mtf" ? S.mtfOn : b.dataset.t === "bands" ? S.bandsOn :
    b.dataset.t === "kp" ? S.kpOn : S.gexOv));
}
$("pricetog").querySelectorAll("button").forEach((b) => b.onclick = () => {
  if (b.dataset.t === "mtf") { S.mtfOn = !S.mtfOn; store("if.mtf", S.mtfOn ? "1" : "0"); if (S.mtfOn && !S.mtf) loadMtf(); renderMtf(); }
  else if (b.dataset.t === "bands") { S.bandsOn = !S.bandsOn; store("if.bands", S.bandsOn ? "1" : "0"); renderPrice(); renderBandRow(); fitAll(); setTimeout(drawGexOv, 60); }
  else if (b.dataset.t === "kp") { S.kpOn = !S.kpOn; store("if.kp", S.kpOn ? "1" : "0"); renderPrice(); fitAll(); setTimeout(drawGexOv, 60); }
  else { S.gexOv = !S.gexOv; store("if.gexov", S.gexOv ? "1" : "0"); fitAll(); setTimeout(drawGexOv, 60); }
  syncToggles();
});
setInterval(() => { if (S.gexOv || S.bandsOn || S.kpOn) drawGexOv(); }, 1000);
setInterval(loadMtf, 180000);
if (window.ResizeObserver) new ResizeObserver(() => drawGexOv()).observe($("pricewrap"));

$("views").innerHTML = VIEWS.map(([k, t]) => `<button data-v="${k}">${t}</button>`).join("");
$("views").querySelectorAll("button").forEach((b) => b.onclick = () => { if (S.view === b.dataset.v) return;
  S.view = b.dataset.v; store("if.view", S.view); autoPrice(); renderBandRow(); loadChart(); });
$("zoom").querySelectorAll("button").forEach((b) => b.onclick = () => b.dataset.z === "fit" ? (autoPrice(), fitAll())
  : b.dataset.z === "fs" ? setFull(!S.full) : zoomBy(b.dataset.z === "in" ? 0.7 : 1 / 0.7));


(function vertDrag() {
  const el = $("price"); let y0 = null;
  el.addEventListener("pointerdown", (e) => { y0 = e.button === 0 ? e.clientY : null; });
  el.addEventListener("pointermove", (e) => {
    if (y0 == null || !(e.buttons & 1) || !S.host) return;
    if (Math.abs(e.clientY - y0) > 6 && S.host.priceScale().options().autoScale) S.host.priceScale().applyOptions({ autoScale: false });
  });
  window.addEventListener("pointerup", () => { y0 = null; });
})();


function setFull(on) {
  const card = document.querySelector(".c-price");
  S.full = on;
  card.classList.toggle("fs", on); document.body.classList.toggle("pfs", on);
  S.charts.price.applyOptions({ handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: on } });
  $("zoom").querySelector('[data-z="fs"]').textContent = on ? "⤡" : "⤢";
  if (on && card.requestFullscreen && !document.fullscreenElement) card.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  setTimeout(() => { fitAll(); drawGexOv(); }, 120);
}
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && S.full) setFull(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.full) setFull(false); });


function renderMega() {
  const m = S.d.mega, names = (m && m.names) || [];
  if (!names.length) { $("mega").innerHTML = `<p class="note">Megacap chains not in yet (they arrive with the 15-minute pulls).</p>`; return; }
  $("mega").innerHTML = names.map((x) => {
    const mv = x.prev_close ? (x.spot / x.prev_close - 1) * 100 : null;
    const used = x.em && x.prev_close ? Math.abs(x.spot - x.prev_close) / x.em * 100 : null;
    const c = x.prem_c || 0, p_ = x.prem_p || 0, tot = c + p_ || 1, oc = x.oi_c || 0, op = x.oi_p || 0;
    return `<div class="mc${x.kp && x.kp.hot ? " hot" : ""}" data-open="${x.sym}" title="Open ${x.sym}'s page: chart with bands, GEX overlay, kings and piles"><div class="h"><b>${x.sym} <span class="go">↗</span></b><span class="${mv >= 0 ? "up" : "dn"}">${mv != null ? sgn(mv, (v) => v.toFixed(2)) + "%" : ""}</span></div>` +
      `<div class="p">${px(x.spot, x.sym)} <span style="color:var(--sub)">· ${x.session !== S.d.session ? dlabel(x.session, false) + " " : ""}${x.t} ET</span></div>` +
      `<div class="pcbar" title="premium traded today: calls ${money(c)} · puts ${money(p_)}"><i style="width:${(c / tot * 100).toFixed(1)}%;background:var(--call)"></i><i style="flex:1;background:var(--put)"></i></div>` +
      `<div class="r"><span>today <b class="${c >= p_ ? "up" : "dn"}">${ratio(c, p_)}</b></span><span>${money(c)} / ${money(p_)}</span></div>` +
      (oc + op ? `<div class="pcbar" title="held = open interest, every expiry: calls ${count(oc)} · puts ${count(op)} contracts"><i style="width:${(oc / (oc + op) * 100).toFixed(1)}%;background:var(--call)"></i><i style="flex:1;background:var(--put)"></i></div>` +
        `<div class="r"><span>held <b class="${oc >= op ? "up" : "dn"}">${ratio(oc, op)}</b></span><span>${count(oc)} / ${count(op)}</span></div>` : "") +
      `<div class="r"><span>${used != null ? used.toFixed(0) + "% of EM" : "EM —"}</span><span>${x.flip != null ? (x.spot >= x.flip ? "above" : "below") + " flip" : ""}</span></div>` +
      (x.kp ? `<div class="kl">king <b>${px(x.kp.k).replace(".00", "")}</b>${x.kp.exp ? " " + xshort(x.kp.exp) : ""} · ${sgn(x.kp.dist, (v) => v.toFixed(1))}%` +
        (x.kp.pile ? `<br>pile ${pileTxt(x.kp.pile)} · ${count(x.kp.pile.oi)}` : "") +
        `<br>${(x.kp.tags || []).map((t) => tagH(t, x.kp)).join("")}${x.kp.pile ? (x.kp.pile.tags || []).filter((t) => UNUSUAL.includes(t[0])).map((t) => tagH(t, x.kp.pile)).join("") : ""}</div>` : "") + `</div>`;
  }).join("");
  $("mega").querySelectorAll("[data-open]").forEach((el) => el.onclick = () => openSym(el.dataset.open));
}
function renderVix() {
  const v = S.d.vix, L = v && v.latest;
  if (!L) { $("vix").innerHTML = `<p class="note">No VIX chain yet.</p>`; return; }
  const c = L.curve || [], c1 = c[0], c2 = c[1];
  const shape = c1 && c2 ? (c2.fwd > c1.fwd ? '<span class="chip good">contango · calm</span>' : '<span class="chip warn">backwardation · stress</span>') : "";
  const chg = L.prev_close ? L.spot - L.prev_close : null;
  const pc = L.vol.c ? (L.vol.p / L.vol.c) : null;
  $("vix").innerHTML = `<div class="vixgrid"><div><dl class="kv"><dt>VIX</dt><dd>${L.spot.toFixed(2)} ${chg != null ? `<span class="${chg >= 0 ? "dn" : "up"}">${sgn(chg, (x) => x.toFixed(2))}</span>` : ""}</dd>` +
    `<dt>Futures curve</dt><dd>${shape}</dd>` + c.slice(0, 4).map((x) => `<dt style="padding-left:10px">${xlabel(x.exp)}</dt><dd>${x.fwd.toFixed(2)}</dd>`).join("") +
    `<dt>Call skew (${L.skew_days || 30} days)</dt><dd>${L.call_skew != null ? sgn(L.call_skew, (x) => x.toFixed(1)) + " pts" : "—"}</dd>` +
    `<dt>Calls / puts traded</dt><dd>${count(L.vol.c)} / ${count(L.vol.p)} · ${ratio(L.vol.c, L.vol.p)}</dd>` +
    `<dt>Premium calls / puts</dt><dd>${money(L.prem.c)} / ${money(L.prem.p)} · ${ratio(L.prem.c, L.prem.p)}</dd>` +
    (L.oi_c ? `<dt>Held calls / puts</dt><dd>${count(L.oi_c)} / ${count(L.oi_p)} · ${ratio(L.oi_c, L.oi_p)}</dd>` : "") + `</dl>` +
    `<p class="note">Futures from put-call parity on the VIX chain. Busy VIX calls and a rising call skew = protection being bought; backwardation = stress now. ${L.t} ET.</p></div>` +
    `<div><p class="sub">Most-traded VIX calls today</p><table class="t"><tr><th>Expiry</th><th class="r">Strike</th><th class="r">Traded</th><th class="r">Open</th><th class="r">Mid</th></tr>` +
    (L.top_calls || []).map((x) => `<tr><td>${xlabel(x.exp)}</td><td class="r">${x.k}</td><td class="r">${count(x.v)}</td><td class="r">${count(x.oi)}</td><td class="r">${x.px.toFixed(2)}</td></tr>`).join("") +
    `</table></div></div>` + (isVix() ? "" : `<p class="note"><a href="?s=VIX" data-open="VIX" class="openlink">Open the VIX chart ↗</a></p>`);
  const ol = $("vix").querySelector("[data-open]");
  if (ol) ol.onclick = (e) => { e.preventDefault(); openSym("VIX"); };
}


const tipEl = $("tip");
function showTip(e, html) { tipEl.innerHTML = html; tipEl.hidden = false;
  const x = Math.min(window.innerWidth - tipEl.offsetWidth - 8, e.clientX + 14), y = Math.min(window.innerHeight - tipEl.offsetHeight - 8, e.clientY + 14);
  tipEl.style.left = x + "px"; tipEl.style.top = y + "px"; }
function hideTip() { tipEl.hidden = true; }

function renderTabs() {
  const extra = isMega() || S.sym === "VIX" ? `<span class="tsep"></span><span class="tg">Open</span><button data-s="${S.sym}" class="on">${S.sym}</button>` +
    `<button class="tclose" data-close="1" title="Back to ${S.back || "SPY"}">×</button>` : "";
  $("tabs").innerHTML = TABS.map(([g, items], i) => (i ? '<span class="tsep"></span>' : "") + (g ? `<span class="tg">${g}</span>` : "") +
    items.filter(([k]) => !FUTNAME[k] || window.IFDATA.has(k))
      .map(([k, t]) => `<button data-s="${k}" class="${k === S.sym ? "on" : ""}">${t}</button>`).join("")).join("") + extra;
  $("tabs").querySelectorAll("button[data-s]").forEach((b) => b.onclick = () => openSym(b.dataset.s));
  const x = $("tabs").querySelector("[data-close]");
  if (x) x.onclick = () => openSym(S.back || "SPY");
}
function openSym(sym) {
  if (S.sym === sym) return;
  if (!isMega(sym) && sym !== "VIX") S.back = sym; else if (!isMega() && S.sym !== "VIX") S.back = S.sym;
  S.sym = sym; S.at = null; S.mtf = null; autoPrice();
  history.replaceState(null, "", "?s=" + S.sym); try { localStorage.setItem("if.sym", S.sym); } catch (e) {}
  renderTabs(); loadState(); setTimeout(loadMtf, 50);
  if (isMega(sym) || sym === "VIX") window.scrollTo({ top: 0, behavior: "smooth" });
}
renderTabs();

$("gexmode").querySelectorAll("button").forEach((b) => b.onclick = () => { S.gexMode = b.dataset.m;
  $("gexmode").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); renderGex(); drawGexOv(); });
$("flowb").querySelectorAll("button").forEach((b) => b.onclick = () => { S.flowB = b.dataset.b;
  $("flowb").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); renderFlow(); });
window.addEventListener("resize", () => { if (S.d) renderGex(); });

(function init() {
  const qs = new URLSearchParams(location.search), q = qs.get("s");
  S.mtfOn = false;
  S.gexOv = qs.get("gexov") ? qs.get("gexov") === "1" : recall("if.gexov") === "1";
  S.bandsOn = qs.get("bands") ? qs.get("bands") === "1" : recall("if.bands") === "1";
  S.kpOn = qs.get("kp") ? qs.get("kp") === "1" : recall("if.kp") !== "0";
  const lx = qs.get("lx") || (location.hash.match(/lx=(\w+)/) || [])[1] || recall("if.lx");
  S.lx = lx === "full" ? "full" : "simple";
  $("lx").querySelectorAll("button").forEach((b) => b.onclick = () => { S.lx = b.dataset.lx; store("if.lx", S.lx); if (S.d) render(); });
  const vw = qs.get("view") || recall("if.view");
  if (VIEWS.some((v) => v[0] === vw)) S.view = vw;
  if (qs.get("on")) S.bandSel[S.view] = new Set(qs.get("on").split(","));
  if (qs.get("mas")) { const m = qs.get("mas"); S.masSel[S.view] = new Set(m === "1" ? MAK : m === "0" ? [] : m.split(",")); }
  S.mtfLive = recall("if.mtflive") === "1"; S.mtfPos = recall("if.mtfpos") === "bl" ? "bl" : "tl";
  syncToggles();
  if (["net", "mass", "d0"].includes(qs.get("g"))) { S.gexMode = qs.get("g");
    $("gexmode").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.m === S.gexMode)); }
  let saved = null; try { saved = localStorage.getItem("if.sym"); } catch (e) {}
  S.sym = (q || saved || "SPY").toUpperCase();
  if (!TABS.some(([, g]) => g.some(([k]) => k === S.sym)) && !isMega() && S.sym !== "VIX") S.sym = "SPY";
  renderTabs();
  loadState().then(() => { loadMtf(); if (qs.get("fs") === "1") setTimeout(() => setFull(true), 400); });
  setInterval(poll, 5000);
})();
