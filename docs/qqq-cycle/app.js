"use strict";

const LW = window.LightweightCharts;
const COL = { bg: "#151a23", grid: "#1c2230", text: "#a9b0bc", line: "#262d3b", model: "#5b8def",
  past: "#d05b93", other: "#7d8597", otherHi: "#e8eaed", up: "#26a69a", down: "#ef5350", muted: "#6f7787",
  range80: "rgba(169,176,188,0.10)", range50: "rgba(169,176,188,0.16)", spread: "rgba(91,141,239,0.13)",
  ph: { 1: "#2d4a6b", 2: "#1f5c4f", 3: "#6b5a2a", 4: "#6b2f35" } };
const SHOWS = [["model", "Model line", COL.model], ["others", "Other cycles", COL.other], ["range", "Range", null],
  ["spread", "Analog spread", null]];
const RANGES = [["6m", "6M", 183], ["1y", "1Y", 365], ["2y", "2Y", 730]];
const PH_NAME = { 1: "Accumulation", 2: "Markup", 3: "Distribution", 4: "Markdown" };
const S = { doc: null, show: { model: true, others: true, range: true, spread: false },
  range: "1y", pick: null, past: "", wfm: "anchored", wfh: "63", series: {} };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (v, dp = 2) => v == null ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const sgn = (v, dp = 1, suf = "%") => v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), dp) + suf;
const cls = (v) => v == null ? "dim" : v > 0 ? "up" : v < 0 ? "down" : "dim";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dstr = (s, yr = false) => { if (!s) return "—"; const [y, m, d] = s.slice(0, 10).split("-").map(Number); return `${MON[m - 1]} ${d}` + (yr ? `, ${y}` : ""); };
const ystr = (s) => s ? s.slice(0, 4) : "—";
const addDays = (s, n) => { const t = new Date(s + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const speedTxt = (s) => (+s).toFixed(2).replace(/0+$/, "").replace(/\.$/, "") + "x";
const cycName = (c) => `${c.src === "Nasdaq-100" ? "Nasdaq-100" : "S&P 500"} · low ${dstr(c.low, true)}`;
const ln = (pts) => (pts || []).filter((p) => p[1] != null).map(([time, value]) => ({ time, value }));

const ET_TZ = "America/New_York";
const clock = (ms, tz, withDate) => new Date(ms).toLocaleString("en-US", Object.assign({ timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
  withDate ? { month: "short", day: "numeric" } : {}));
const etLocal = (ms, withDate) => { const et = clock(ms, ET_TZ, withDate), me = clock(ms, undefined, withDate); return `${et} ET` + (me !== et ? ` (${me} your time)` : ""); };

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (RANGES.some(([k]) => k === h.get("r"))) S.range = h.get("r");
  if (h.get("past")) S.past = h.get("past");
  for (const [k] of SHOWS) if (h.has(k)) S.show[k] = h.get(k) === "1";
}
function writeHash() {
  const h = new URLSearchParams();
  if (S.range !== "1y") h.set("r", S.range);
  if (S.past) h.set("past", S.past);
  history.replaceState(null, "", h.toString() ? "#" + h.toString() : location.pathname);
}


class Band {
  constructor(color) { this.color = color; this.data = []; this.views = [new BandView(this)]; }
  attached(p) { this.chart = p.chart; this.series = p.series; this.req = p.requestUpdate; }
  detached() {}
  updateAllViews() {}
  paneViews() { return this.views; }
  set(d) { this.data = d; this.req && this.req(); }
}
class BandView {
  constructor(b) { this.b = b; }
  zOrder() { return "bottom"; }
  renderer() {
    const b = this.b;
    return { draw(target) {
      if (!b.data.length || !b.chart) return;
      target.useBitmapCoordinateSpace((sc) => {
        const ctx = sc.context, ts = b.chart.timeScale(), pts = [];
        for (const [t, lo, hi] of b.data) {
          const x = ts.timeToCoordinate(t); if (x == null) continue;
          const y1 = b.series.priceToCoordinate(hi), y2 = b.series.priceToCoordinate(lo);
          if (y1 == null || y2 == null) continue;
          pts.push([x * sc.horizontalPixelRatio, y1 * sc.verticalPixelRatio, y2 * sc.verticalPixelRatio]);
        }
        if (pts.length < 2) return;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) ctx.lineTo(p[0], p[1]);
        for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][2]);
        ctx.closePath(); ctx.fillStyle = b.color; ctx.fill();
      });
    } };
  }
}
const zipBand = (lo, hi) => { const m = new Map(hi.map(([d, v]) => [d, v])); return lo.filter(([d]) => m.has(d)).map(([d, v]) => [d, v, m.get(d)]); };


let chart, candles, bands = {};
function makeChart() {
  const el = $("chart");
  chart = LW.createChart(el, {
    autoSize: true,
    layout: { background: { type: "solid", color: COL.bg }, textColor: COL.text, fontSize: 11, panes: { separatorColor: COL.line } },
    grid: { vertLines: { color: COL.grid }, horzLines: { color: COL.grid } },
    rightPriceScale: { borderColor: COL.line, mode: LW.PriceScaleMode.Logarithmic, scaleMargins: { top: 0.06, bottom: 0.06 } },
    timeScale: { borderColor: COL.line, rightOffset: 4 },
    crosshair: { mode: LW.CrosshairMode.Normal },
    localization: { priceFormatter: (p) => fmt(p, 2) },
  });
  candles = chart.addSeries(LW.CandlestickSeries, { upColor: COL.up, downColor: COL.down, borderVisible: false,
    wickUpColor: COL.up, wickDownColor: COL.down, priceLineVisible: false, lastValueVisible: true });
  for (const [k, c] of [["r80", COL.range80], ["r50", COL.range50], ["spread", COL.spread]]) { bands[k] = new Band(c); candles.attachPrimitive(bands[k]); }
  chart.subscribeCrosshairMove(readout);

  for (const ev of ["pointerdown", "wheel", "touchstart"]) el.addEventListener(ev, () => { S.userMoved = true; }, { passive: true });
  let rt = null;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (S.doc && !S.userMoved) setRange(false); }, 120); }).observe(el);
}

function line(key, opts) {
  if (!S.series[key]) S.series[key] = chart.addSeries(LW.LineSeries, Object.assign({ lineWidth: 2, priceLineVisible: false,
    lastValueVisible: false, crosshairMarkerVisible: false }, opts));
  return S.series[key];
}

let phaseSeries = null, markers = null;
function draw() {
  const d = S.doc;
  const bars = d.bars.map(([time, open, high, low, close]) => ({ time, open, high, low, close }));
  if (d.live) bars.push({ time: d.live.date, open: d.live.o, high: d.live.h, low: d.live.l, close: d.live.c,
    color: d.live.c >= d.live.o ? "rgba(38,166,154,.55)" : "rgba(239,83,80,.55)", wickColor: "#6f7787" });
  candles.setData(bars);
  const m = d.model;

  line("modelFit", { color: COL.model, lineWidth: 2, lineStyle: LW.LineStyle.Solid }).applyOptions({ visible: S.show.model && !!m });
  line("model", { color: COL.model, lineWidth: 2, lastValueVisible: true, title: "model" }).applyOptions({ visible: S.show.model && !!m });
  if (m) {
    S.series.modelFit.setData(ln(m.fit || []).map((p) => ({ ...p, color: "rgba(91,141,239,.5)" })));
    if (!S.fMarks) S.fMarks = LW.createSeriesMarkers(S.series.modelFit, []);
    const lk = (m.fit || []).find((p) => p[0] >= m.locked_on);
    S.fMarks.setMarkers(S.show.model && lk ? [{ time: lk[0], position: "belowBar", color: COL.model, shape: "circle", text: "locked" }] : []);
    S.series.model.setData(ln(m.path));
    if (!markers) markers = LW.createSeriesMarkers(S.series.model, []);
    const narrow = window.innerWidth < 560;
    markers.setMarkers(S.show.model ? (m.turns || []).slice(0, narrow ? 3 : 5).map((t) => ({ time: t.date, position: t.kind === "high" ? "aboveBar" : "belowBar",
      color: COL.model, shape: t.kind === "high" ? "arrowDown" : "arrowUp", text: narrow ? "" : `${t.kind} ${fmt(t.price, 0)}` })) : []);
  }

  (d.competing || []).slice(1).forEach((c, i) => {
    const hi = S.pick === i + 2;
    line("o" + i, { color: COL.other, lineWidth: 1, autoscaleInfoProvider: () => null }).applyOptions({ visible: S.show.others || hi,
      color: hi ? COL.otherHi : "rgba(125,133,151,.55)", lineWidth: hi ? 2 : 1, lastValueVisible: hi, title: hi ? `#${i + 2}` : "" });
    S.series["o" + i].setData(ln(c.path));
  });

  const sh = S.pick != null && String(S.pick).startsWith("s") ? d.shape[+S.pick.slice(1)] : null;
  line("shape", { color: COL.otherHi, lineWidth: 2, lineStyle: LW.LineStyle.Dotted, autoscaleInfoProvider: () => null }).applyOptions({ visible: !!sh });
  S.series.shape.setData(sh ? ln(sh.path) : []);

  bands.r80.set(S.show.range ? zipBand(d.range.p10, d.range.p90) : []);
  bands.r50.set(S.show.range ? zipBand(d.range.p25, d.range.p75) : []);
  bands.spread.set(S.show.spread && d.analog_bands ? zipBand(d.analog_bands.p10, d.analog_bands.p90) : []);
  line("spreadMed", { color: COL.model, lineWidth: 1, lineStyle: LW.LineStyle.Dashed }).applyOptions({ visible: S.show.spread });
  S.series.spreadMed.setData(d.analog_bands ? ln(d.analog_bands.p50) : []);

  const pf = pastForecast();
  line("past", { color: COL.past, lineWidth: 2, lineStyle: LW.LineStyle.Solid, title: "then" }).applyOptions({ visible: !!pf, lastValueVisible: !!pf });
  S.series.past.setData(pf ? ln([[pf.asof, closeOn(pf.asof)], ...pf.path]) : []);

  if (!phaseSeries) {

    phaseSeries = chart.addSeries(LW.HistogramSeries, { priceScaleId: "phase", priceLineVisible: false, lastValueVisible: false, base: 0 });
    chart.priceScale("phase").applyOptions({ mode: LW.PriceScaleMode.Normal, visible: false, scaleMargins: { top: 0.965, bottom: 0 } });
    candles.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.07 } });
  }
  const ph = [];
  for (const sp of d.phase.spans) for (const b of bars) if (b.time >= sp.start && b.time <= addDays(sp.end, 6)) ph.push({ time: b.time, value: 1, color: COL.ph[sp.stage] });
  const seen = new Set(); phaseSeries.setData(ph.filter((p) => !seen.has(p.time) && seen.add(p.time)).sort((a, b) => a.time < b.time ? -1 : 1));
  legend();
  setRange(false);
}

function closeOn(day) {
  const b = S.doc.bars.find((x) => x[0] === day); return b ? b[4] : null;
}
function pastForecast() {
  if (!S.past) return null;
  const [kind, day] = S.past.split(":");
  const src = kind === "live" ? S.doc.record.live : S.doc.record.backfill;
  return (src || []).find((r) => r.asof === day) || null;
}

function setRange(fromUser) {
  const d = S.doc, days = RANGES.find(([k]) => k === S.range)[2];
  const last = d.future[d.future.length - 1];
  const end = S.range === "6m" ? d.future[Math.min(d.future.length - 1, 84)] : last;
  const from = addDays(d.live ? d.live.date : d.asof, -days);
  const first = d.bars[0][0];
  chart.timeScale().setVisibleRange({ from: from < first ? first : from, to: end });
  if (fromUser) writeHash();
}

function legend() {
  const d = S.doc, m = d.model, pf = pastForecast();
  const it = (sw, txt) => `<span class="it">${sw}${txt}</span>`;
  const items = [];
  if (S.show.model && m) items.push(it(`<span class="sw" style="background:${COL.model}"></span>`, `Model line — ${esc(m.label)}, locked ${dstr(m.locked_on)}` +
    (m.fit_gap != null ? ` · since the low it sat ${fmt(m.fit_gap, 1)}% from price on average (dim = fitted to the past)` : "")));
  if (S.show.others) items.push(it(`<span class="sw" style="background:${COL.other}"></span>`, "Other cycles (#2–#10)"));
  if (S.pick != null) items.push(it(`<span class="sw" style="background:${COL.otherHi}"></span>`, "Picked from the table"));
  if (S.show.range) items.push(it(`<span class="box" style="background:rgba(169,176,188,.28)"></span>`, `Range from VXN ${fmt(d.vxn.value, 1)}: 50% / 80%`));
  if (S.show.spread) items.push(it(`<span class="box" style="background:rgba(91,141,239,.3)"></span>`, "Analog spread 10–90% (dashed = middle)"));
  if (pf) items.push(it(`<span class="sw" style="background:${COL.past}"></span>`, `Model line as of ${dstr(pf.asof, true)} (${esc(pf.label)})`));
  items.push(it(`<span class="box" style="background:${COL.ph[2]}"></span>`, "Phase strip: <span style='color:#7fe0d2'>Markup</span> · <span style='color:#f0c86a'>Distribution</span> · <span style='color:#f59a98'>Markdown</span> · <span style='color:#9fbcf6'>Accumulation</span>"));
  $("legend").innerHTML = items.join("");
}

function valAt(series, time) {
  if (!series || !series.options().visible) return null;
  const v = series.data().find((p) => p.time === time); return v ? v.value : null;
}
function readout(param) {
  const box = $("readout");
  if (!param || !param.time || param.point == null || param.point.x < 0) { box.style.display = "none"; return; }
  const t = param.time, d = S.doc;
  const rows = [];
  const cb = param.seriesData.get(candles);
  if (cb) rows.push(["QQQ" + (d.live && t === d.live.date ? " so far" : ""), fmt(cb.close)]);
  const mv = valAt(S.series.model, t) ?? valAt(S.series.modelFit, t);
  if (mv != null) rows.push(["Model line", fmt(mv)]);
  if (S.show.range) {
    const lo = d.range.p10.find((p) => p[0] === t), hi = d.range.p90.find((p) => p[0] === t);
    if (lo && hi) rows.push(["Range 80%", `${fmt(lo[1], 0)} – ${fmt(hi[1], 0)}`]);
  }
  const pv = valAt(S.series.past, t); if (pv != null) rows.push(["Model then", fmt(pv)]);
  if (S.pick != null) {
    const key = String(S.pick).startsWith("s") ? "shape" : "o" + (S.pick - 2);
    const ov = valAt(S.series[key], t); if (ov != null) rows.push([String(S.pick).startsWith("s") ? "Shape match" : `Cycle #${S.pick}`, fmt(ov)]);
  }
  if (!rows.length) { box.style.display = "none"; return; }
  box.innerHTML = `<div class="d">${dstr(t, true)}${t > (d.live ? d.live.date : d.asof) ? " · ahead" : ""}</div>` +
    rows.map(([a, b]) => `<div class="r"><span>${a}</span><span>${b}</span></div>`).join("");
  box.style.display = "block";
}


function controls() {
  $("shows").innerHTML = SHOWS.map(([k, label, c]) => `<button class="chip ${S.show[k] ? "on" : ""}" data-k="${k}">` +
    (c ? `<span class="sw" style="background:${c}"></span>` : "") + `${label}</button>`).join("");
  $("ranges").innerHTML = RANGES.map(([k, l]) => `<button class="chip ${S.range === k ? "on" : ""}" data-r="${k}">${l}</button>`).join("");
  const d = S.doc, opts = [`<option value="">None</option>`];
  if ((d.record.live || []).length) opts.push(`<optgroup label="Live (saved after each close)">` + d.record.live.slice().reverse()
    .map((r) => `<option value="live:${r.asof}">${dstr(r.asof, true)}</option>`).join("") + "</optgroup>");
  opts.push(`<optgroup label="Rebuilt (Fridays)">` + (d.record.backfill || []).slice().reverse()
    .map((r) => `<option value="bf:${r.asof}">${dstr(r.asof, true)}</option>`).join("") + "</optgroup>");
  $("pastsel").innerHTML = opts.join(""); $("pastsel").value = S.past;
}
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-k]");
  if (c) { S.show[c.dataset.k] = !S.show[c.dataset.k]; c.classList.toggle("on"); draw(); return; }
  const r = e.target.closest("[data-r]");
  if (r) { S.range = r.dataset.r; S.userMoved = false;
    document.querySelectorAll("[data-r]").forEach((x) => x.classList.toggle("on", x === r)); setRange(true); return; }
  const p = e.target.closest("tr[data-pick]");
  if (p) {
    const v = p.dataset.pick, val = /^s/.test(v) ? v : +v;
    S.pick = S.pick === val ? null : val;
    document.querySelectorAll("tr[data-pick]").forEach((x) => x.classList.toggle("sel", x.dataset.pick === String(S.pick)));
    draw(); $("chart").scrollIntoView({ behavior: "smooth", block: "center" }); return;
  }
  const f = e.target.closest("tr[data-past]");
  if (f) { S.past = S.past === f.dataset.past ? "" : f.dataset.past; $("pastsel").value = S.past; renderBackfill(); draw(); writeHash();
    $("chart").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  const w = e.target.closest("[data-wfm]");
  if (w) { S.wfm = w.dataset.wfm; renderWF(); return; }
  const h = e.target.closest("[data-wfh]");
  if (h) { S.wfh = h.dataset.wfh; renderWF(); }
});
$("pastsel").addEventListener("change", (e) => { S.past = e.target.value; renderBackfill(); draw(); writeHash(); });


function cards() {
  const d = S.doc, m = d.model, ph = d.phase, a = d.anchor;
  const px = d.live ? d.live.c : d.bars[d.bars.length - 1][4];
  const prev = d.bars[d.bars.length - (d.live ? 1 : 2)][4];
  const comp = d.competing || [];
  const up3 = comp.filter((c) => c.m3 > 0).length;
  const med3 = comp.length ? comp.map((c) => c.m3).sort((x, y) => x - y)[Math.floor(comp.length / 2)] : null;
  const r21 = (k) => d.range[k][21] ? d.range[k][21][1] : null;
  const o1 = d.odds.rows.find((r) => r.h === 21);
  const turn = m && m.turns && m.turns[0];
  const C = [];
  C.push(`<div class="card"><div class="k">QQQ ${d.live ? `so far · ${d.live.t ? clock(d.live.t * 1000, ET_TZ) + " ET" : "today"}` : `close ${dstr(d.asof)}`}</div><div class="v">${fmt(px)}</div>
    <div class="s"><span class="${cls(px - prev)}">${sgn((px / prev - 1) * 100, 2)}</span> vs the ${dstr(d.live ? d.asof : d.bars[d.bars.length - 2][0])} close</div></div>`);
  C.push(`<div class="card"><div class="k">Cycle phase</div><div class="v"><span class="ph ph${ph.stage}">${ph.name}</span></div>
    <div class="s">since ${dstr(ph.since)} · long-term average ${fmt(ph.ma, 0)}, ${sgn(ph.slope, 1)} over the last month</div>
    ${a ? `<div class="s">Session ${a.sessions} since the ${dstr(a.date)} low (${fmt(a.price)}), ${sgn(a.rally)}</div>` : ""}</div>`);
  if (m) {
    C.push(`<div class="card"><div class="k">Model line</div><div class="v" style="font-size:16px">${m.src} ${ystr(m.low)} cycle</div>
      <div class="s">${speedTxt(m.stretch)} speed · ${speedTxt(m.beta)} size · fit ${fmt(m.corr, 2)}</div>
      <div class="row3"><div><span>1M</span> <b class="${cls(m.m1)}">${sgn(m.m1)}</b></div><div><span>3M</span> <b class="${cls(m.m3)}">${sgn(m.m3)}</b></div><div><span>6M</span> <b class="${cls(m.m6)}">${sgn(m.m6)}</b></div></div></div>`);
    C.push(`<div class="card"><div class="k">Next turns on the model line</div>${(m.turns || []).slice(0, 3).map((t) =>
      `<div class="s"><b class="${t.kind === "high" ? "down" : "up"}">${t.kind === "high" ? "High" : "Low"}</b> ~${fmt(t.price, 0)} · ${dstr(t.date)}</div>`).join("") || `<div class="s">No swing ahead</div>`}</div>`);
  }
  C.push(`<div class="card"><div class="k">Ten closest cycles</div><div class="v">${up3} of ${comp.length} up</div>
    <div class="s">at 3 months · middle ${sgn(med3)}</div></div>`);
  C.push(`<div class="card"><div class="k">1-month range · VXN ${fmt(d.vxn.value, 1)}</div><div class="v">${fmt(r21("p10"), 0)} – ${fmt(r21("p90"), 0)}</div>
    <div class="s">80% range by ${dstr(d.future[20])} · 50%: ${fmt(r21("p25"), 0)} – ${fmt(r21("p75"), 0)}</div></div>`);
  if (o1 && o1.all) C.push(`<div class="card"><div class="k">Within a month, at this VXN</div><div class="v">${o1.all.dd5}% <span style="font-size:13px;color:var(--text-2)">chance of a 5% dip</span></div>
    <div class="s">10% dip ${o1.all.dd10}% · 5% pop ${o1.all.ru5}% · up after a month ${o1.all.up}%</div></div>`);
  $("now").innerHTML = C.join("");
  $("vint").innerHTML = `Data to the ${dstr(d.asof, true)} close${d.live && d.live.t ? ` · today so far ${etLocal(d.live.t * 1000)}` : ""}<br>updated ${etLocal(Date.parse(S.man.generated_utc), true)}`;
}

function renderCycles() {
  const d = S.doc, comp = d.competing || [];
  $("cycsub").textContent = d.anchor ? `path since the ${dstr(d.anchor.date, true)} low (${d.anchor.sessions} sessions) vs the path after every past cycle low · click a row to draw it` : "";
  const head = `<thead><tr><th>#</th><th class="l">Past cycle</th><th class="l">Matched stretch</th><th>Speed</th><th>Size</th><th>Fit</th><th>Next 1M</th><th>3M</th><th>6M</th></tr></thead>`;
  $("cyctab").innerHTML = head + "<tbody>" + comp.map((c, i) => `<tr data-pick="${i === 0 ? "" : i + 1}" class="${S.pick === i + 1 ? "sel" : ""}">
    <td>${i === 0 ? `<span class="swc" style="background:${COL.model}"></span>1` : i + 1}</td><td class="l">${cycName(c)}${i === 0 ? ` <span class="pill">today's best</span>` : ""}</td>
    <td class="l">${dstr(c.low, true)} → ${dstr(c.src_end, true)}<span class="sub2">then to ${dstr(c.src_fwd_end, true)}</span></td>
    <td>${speedTxt(c.stretch)}</td><td>${speedTxt(c.beta)}</td><td>${fmt(c.corr, 3)}</td>
    <td class="${cls(c.m1)}">${sgn(c.m1)}</td><td class="${cls(c.m3)}">${sgn(c.m3)}</td><td class="${cls(c.m6)}">${sgn(c.m6)}</td></tr>`).join("") + "</tbody>";
  const sh = d.shape || [];
  $("shapetab").innerHTML = `<thead><tr><th>#</th><th class="l">Nasdaq-100 stretch</th><th>Size</th><th>Fit</th><th>Next 1M</th><th>3M</th><th>6M</th></tr></thead><tbody>` +
    sh.map((s, i) => `<tr data-pick="s${i}" class="${S.pick === "s" + i ? "sel" : ""}"><td>${i + 1}</td><td class="l">${dstr(s.start, true)} → ${dstr(s.end, true)}</td>
    <td>${speedTxt(s.beta)}</td><td>${fmt(s.corr, 3)}</td><td class="${cls(s.m1)}">${sgn(s.m1)}</td><td class="${cls(s.m3)}">${sgn(s.m3)}</td><td class="${cls(s.m6)}">${sgn(s.m6)}</td></tr>`).join("") + "</tbody>";
}

function renderOdds() {
  const o = S.doc.odds;
  $("oddsub").textContent = `every session with VXN close to today's ${fmt(o.vxn, 1)}, and what QQQ did next`;
  const cell = (x, k) => x ? `${x[k]}${k === "med" ? "%" : "%"}` : "—";
  $("oddtab").innerHTML = `<thead><tr><th class="l">Within</th><th class="l">Period</th><th>Sessions</th><th>Up at the end</th><th>Middle move</th><th>5% dip</th><th>10% dip</th><th>5% pop</th></tr></thead><tbody>` +
    o.rows.map((r) => [["2013 → now", r.all], ["2021 → now", r.recent]].map(([nm, x], j) =>
      `<tr><td class="l">${j ? "" : r.label}</td><td class="l">${nm}</td><td>${x ? x.n : "—"}</td><td>${cell(x, "up")}</td>
      <td class="${x ? cls(x.med) : ""}">${x ? sgn(x.med) : "—"}</td><td>${cell(x, "dd5")}</td><td>${cell(x, "dd10")}</td><td>${cell(x, "ru5")}</td></tr>`).join("")).join("") + "</tbody>";
}

function renderBackfill() {
  const bf = S.doc.record.backfill || [];
  const scored = bf.filter((r) => r.m1_real != null);
  const right = scored.filter((r) => Math.sign(r.m1_model) === Math.sign(r.m1_real)).length;
  const upw = scored.filter((r) => r.m1_real > 0).length;
  const g = bf.filter((r) => r.gap != null && r.flat_gap != null);
  const avg = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  $("bfstats").innerHTML = `
    <div class="stat"><div class="k">1-month direction right</div><div class="v">${right} of ${scored.length}</div><div class="s">"always up" would have had ${upw}</div></div>
    <div class="stat"><div class="k">Average gap, line vs price</div><div class="v">${fmt(avg(g.map((r) => r.gap)), 1)}%</div><div class="s">a flat line at that day's close: ${fmt(avg(g.map((r) => r.flat_gap)), 1)}%</div></div>
    <div class="stat"><div class="k">Day-to-day moves in step</div><div class="v">${fmt(avg(g.filter((r) => r.move_corr != null).map((r) => r.move_corr)), 2)}</div><div class="s">correlation of daily moves, 0 = none</div></div>`;
  $("bftab").innerHTML = `<thead><tr><th class="l">As of</th><th class="l">Model line then</th><th>Fit</th><th>Said 1M</th><th>Real 1M</th><th>Gap</th><th>Flat-line gap</th></tr></thead><tbody>` +
    bf.slice().reverse().map((r) => `<tr data-past="bf:${r.asof}" class="${S.past === "bf:" + r.asof ? "sel" : ""}"><td class="l">${dstr(r.asof, true)}</td><td class="l">${esc(r.label)}</td><td>${fmt(r.corr, 3)}</td>
    <td class="${cls(r.m1_model)}">${sgn(r.m1_model)}</td><td class="${cls(r.m1_real)}">${sgn(r.m1_real)}</td>
    <td>${r.gap == null ? "—" : fmt(r.gap, 1) + "%"}</td><td class="dim">${r.flat_gap == null ? "—" : fmt(r.flat_gap, 1) + "%"}</td></tr>`).join("") + "</tbody>";
  const lv = S.doc.record.live || [];
  $("livetab").innerHTML = `<thead><tr><th class="l">Saved after</th><th class="l">Model line</th><th>Sessions since</th><th>Line moved</th><th>QQQ moved</th><th>Gap</th><th>Flat-line gap</th></tr></thead><tbody>` +
    (lv.length ? lv.slice().reverse().map((r) => { const s = r.score || {}; return `<tr data-past="live:${r.asof}" class="${S.past === "live:" + r.asof ? "sel" : ""}"><td class="l">${dstr(r.asof, true)}</td><td class="l">${esc(r.label)}</td>
      <td>${s.n || 0}</td><td class="${cls(s.model_move)}">${sgn(s.model_move)}</td><td class="${cls(s.real_move)}">${sgn(s.real_move)}</td>
      <td>${s.gap == null ? "—" : fmt(s.gap, 1) + "%"}</td><td class="dim">${s.flat_gap == null ? "—" : fmt(s.flat_gap, 1) + "%"}</td></tr>`; }).join("")
      : `<tr><td class="l dim" colspan="7">The first one is saved after the next close.</td></tr>`) + "</tbody>";
}

function renderWF() {
  const w = S.doc.record.walkforward;
  if (!w) { $("wftab").innerHTML = `<tbody><tr><td class="l dim">Not built yet.</td></tr></tbody>`; return; }
  $("wfsub").textContent = `a test every week, each using only data known that day · last run ${dstr(w.built, true)}`;
  $("wfmeth").innerHTML = [["anchored", "Model line (cycle low)"], ["window", "Recent shape"]].map(([k, l]) => `<button class="chip ${S.wfm === k ? "on" : ""}" data-wfm="${k}">${l}</button>`).join("");
  $("wfh").innerHTML = [["21", "1M"], ["63", "3M"], ["126", "6M"]].map(([k, l]) => `<button class="chip ${S.wfh === k ? "on" : ""}" data-wfh="${k}">${l}</button>`).join("");
  const rows = (w[S.wfm] || {})[S.wfh] || [];
  $("wftab").innerHTML = `<thead><tr><th class="l">Period</th><th>Tests</th><th>Direction right</th><th>"Always up"</th><th>After "up" calls</th><th>After "down" calls</th>
    <th>Avg miss</th><th>Drift miss</th><th>Inside 80% spread</th><th>Path tracking, best match</th><th>…random match</th></tr></thead><tbody>` +
    rows.map((r) => `<tr><td class="l">${r.era}</td><td>${r.n}<span class="sub2">~${r.independent} separate</span></td><td>${fmt(r.hit, 0)}%</td><td>${fmt(r.always_up, 0)}%</td>
    <td class="${cls(r.after_up)}">${sgn(r.after_up)}</td><td class="${cls(r.after_down)}">${sgn(r.after_down)}<span class="sub2">${r.n_down} calls</span></td>
    <td>${fmt(r.miss, 1)}%</td><td class="dim">${fmt(r.miss_drift, 1)}%</td><td>${fmt(r.in80, 0)}%</td><td>${fmt(r.track_top, 2)}</td><td class="dim">${fmt(r.track_random, 2)}</td></tr>`).join("") + "</tbody>";
  const vx = w.vxn || [];
  const hs = [...new Set(vx.map((x) => x.h))];
  const eras = ["2021-now", "2023-now", "2013-2020"];
  $("vxtab").innerHTML = `<thead><tr><th class="l">Horizon</th>${eras.map((e) => `<th>${e}: in 80%</th><th>in 50%</th>`).join("")}</tr></thead><tbody>` +
    hs.map((h) => `<tr><td class="l">${({ 5: "1 week", 21: "1 month", 63: "3 months", 126: "6 months" })[h] || h + " sessions"}</td>${eras.map((e) => { const x = vx.find((y) => y.h === h && y.era === e); return x ? `<td>${fmt(x.in80, 0)}%</td><td class="dim">${fmt(x.in50, 0)}%</td>` : "<td>—</td><td>—</td>"; }).join("")}</tr>`).join("") + "</tbody>";
  const sw = S.doc.switches || [];
  $("swtab").innerHTML = `<thead><tr><th class="l">Date</th><th class="l">Why</th><th class="l">From</th><th class="l">To</th></tr></thead><tbody>` +
    sw.slice().reverse().map((s) => `<tr><td class="l">${dstr(s.date, true)}</td><td class="l">${esc(s.reason)}</td><td class="l dim">${esc(s.old || "—")}</td><td class="l">${esc(s.new || "—")}</td></tr>`).join("") + "</tbody>";
}



const GH = /(^|\.)github\.io$/i.test(location.hostname);
const RAW = "https://raw.githubusercontent.com/lawrencekenshin/mii-lab/qqq-cycle-data/qqq-cycle/";
let BASE = GH ? RAW : "snap/";
async function getJson(name) {
  let r = await fetch(BASE + name, { cache: "no-cache" }).catch(() => null);
  if ((!r || !r.ok) && BASE !== RAW) { BASE = RAW; r = await fetch(BASE + name, { cache: "no-cache" }).catch(() => null); }
  if (!r || !r.ok) throw new Error("data " + (r ? r.status : "offline"));
  return r.json();
}
async function load() {
  let man, doc;
  try { man = await getJson("manifest.json"); doc = await getJson("qqq-cycle.json"); }
  catch (e) { if (!S.doc) $("vint").textContent = "Data not available right now"; return; }
  S.man = man; S.doc = doc; S.doc.asof = S.doc.as_of;
  readHash();
  if (!chart) makeChart();
  controls(); cards(); renderCycles(); renderOdds(); renderBackfill(); renderWF();
  draw();
  const anchor = location.hash.slice(1);
  if (!S.jumped && /^(now|cycles|odds|record)$/.test(anchor)) {
    S.jumped = true; setTimeout(() => $(anchor).scrollIntoView({ block: "start" }), 80);
  }
}
load();
setInterval(async () => {
  try { const m = await getJson("manifest.json");
    if (S.man && m.sha256 && m.sha256 !== S.man.sha256) load(); } catch (e) {  }
}, 300000);
