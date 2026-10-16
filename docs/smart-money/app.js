"use strict";

const LW = window.LightweightCharts;
const COL = { bg: "#151a23", grid: "#1c2230", text: "#a9b0bc", line: "#262d3b", price: "#5b8def", flow: "#f5a623",
  k: "#e8eaed", d: "#f0b429", j: "#c678dd", up: "#26a69a", down: "#ef5350", muted: "#6f7787" };
const TFS = [["D", "Daily"], ["W", "Weekly"], ["2W", "2-week"], ["M", "Monthly"]];
const TFNAME = Object.fromEntries(TFS);
const RANGES = [["6m", "6M", 183], ["1y", "1Y", 365], ["2y", "2Y", 730], ["all", "All", 0]];
const TF_RANGE = { D: "6m", W: "1y", "2W": "all", M: "all" };
const UNIT = { D: ["session", "sessions"], W: ["week", "weeks"], "2W": ["2-week candle", "2-week candles"], M: ["month", "months"] };
const THIS = { D: "today", W: "this week", "2W": "these 2 weeks", M: "this month" };
const RECENT = { D: "Last month", W: "Last 10 weeks", "2W": "Last 3 months", M: "Last half year" };
const LAST = { D: "last session", W: "last week", "2W": "last 2 weeks", M: "last month" };
const thisLabel = (tf, open) => open ? THIS[tf] : LAST[tf];
const SHORT = { spx: "S&P 500", ndx: "Nasdaq-100", nya: "NYSE", dji: "Dow", rut: "Russell 2000", sox: "Semis" };
const S = { doc: null, view: "all", tf: "D", range: "6m", dtf: "D", fidx: "all", ftyp: "both", charts: [], built: null };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (v, dp) => v == null ? "—" : (Math.round(v * 10 ** dp) / 10 ** dp || 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const roundFmt = (dp) => dp ? { type: "price", precision: dp, minMove: 10 ** -dp }
  : { type: "custom", minMove: 1, formatter: (v) => String(Math.round(v) || 0) };
const fdp = (v) => Math.abs(v) >= 1000 ? 0 : 1;
const sgn = (v, dp = 1, suf = "") => v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), dp) + suf;
const cls = (v) => v == null ? "dim" : v > 0 ? "up" : v < 0 ? "down" : "dim";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dstr = (s, yr = true) => { const [y, m, d] = s.split("-").map(Number); return `${MON[m - 1]} ${d}` + (yr ? `, ${y}` : ""); };
const ago = (n, tf, open) => n === 0 ? thisLabel(tf, open) : `${n} ${UNIT[tf][n === 1 ? 0 : 1]} ago`;
const agoShort = (n, tf, open) => n === 0 ? thisLabel(tf, open) : tf === "D" ? `${n}d ago` : tf === "M" ? `${n}mo ago` : `${tf === "2W" ? 2 * n : n}w ago`;
const addDays = (s, n) => { const t = new Date(s + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const etTime = (epoch) => new Date(epoch * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
const SOFAR = `<span class="sofar">so far</span>`;
const idxOf = (key) => S.doc.indices.find((x) => x.key === key);

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("v")) S.view = h.get("v");
  if (TFS.some(([k]) => k === h.get("tf"))) S.tf = h.get("tf");
  S.range = RANGES.some(([k]) => k === h.get("r")) ? h.get("r") : TF_RANGE[S.tf];
  S.dtf = TFS.some(([k]) => k === h.get("dt")) ? h.get("dt") : S.tf;
  if (h.get("i")) S.fidx = h.get("i");
  if (["both", "bull", "bear"].includes(h.get("y"))) S.ftyp = h.get("y");
}
function writeHash() {
  history.replaceState(null, "", `#v=${S.view}&tf=${S.tf}&r=${S.range}&dt=${S.dtf}&i=${S.fidx}&y=${S.ftyp}`);
}
function chips(el, items, cur, onPick) {
  el.innerHTML = items.map(([k, lab]) => `<button class="chip${k === cur ? " on" : ""}" data-k="${esc(k)}">${esc(lab)}</button>`).join(" ");
  el.querySelectorAll("button").forEach((b) => b.onclick = () => onPick(b.dataset.k));
}
function setView(v) {
  S.view = v;
  if (v !== "all") { S.fidx = v; S.dtf = S.dtf || "D"; } else { S.fidx = "all"; S.dtf = S.tf; }
  writeHash(); render(); window.scrollTo({ top: 0 });
}
function controls() {
  chips($("views"), [["all", "All indices"]].concat(S.doc.indices.map((x) => [x.key, SHORT[x.key] || x.name])), S.view, setView);
  const all = S.view === "all";
  $("tfwrap").style.display = all ? "" : "none";
  $("rgwrap").style.display = all ? "" : "none";
  chips($("tfs"), TFS, S.tf, (k) => { S.tf = k; S.range = TF_RANGE[k]; S.dtf = k; writeHash(); render(); });
  chips($("ranges"), RANGES.map(([k, l]) => [k, l]), S.range, (k) => { S.range = k; writeHash(); controls(); applyRanges(); });
}


function recentPill(st) {
  if (st.pcr == null || st.dfr == null) return "";
  const pu = st.pcr > 0, fu = st.dfr > 0;
  const txt = pu && !fu ? "Price up, flow down" : !pu && fu ? "Flow up, price down" : pu ? "Both up" : "Both down";
  return `<span class="pill ${pu !== fu ? "hl" : pu ? "bull" : "bear"}">${txt}</span>`;
}
function divPill(dv, tf, withAgo = true) {
  if (!dv) return `<span class="dim">none</span>`;
  const b = dv.type === "bull";
  return `<span class="pill ${b ? "bull" : "bear"}">${b ? "Bullish" : "Bearish"}</span> ${dstr(dv.t)}` +
    (withAgo ? `<span class="sub2">${ago(dv.ago, tf)}</span>` : "");
}
function crossTxt(x, tf, short) {
  if (!x) return "";
  const what = x.type === "golden" ? "crossed up" : "crossed down";
  const when = short ? agoShort(x.ago, tf, x.open) : ago(x.ago, tf, x.open);
  return `${what} ${when}${x.open ? " (so far)" : ""}`;
}
function kdjCell(st, tf) {
  const rel = st.rel > 0 ? `<span class="up">K above D ▲</span>` : `<span class="down">K below D ▼</span>`;
  return `${rel} <span class="dim">K ${fmt(st.k, 0)} · D ${fmt(st.d, 0)} · J ${fmt(st.j, 0)}</span>${st.open ? " " + SOFAR : ""}` +
    `<span class="sub2">${crossTxt(st.cross, tf, false)}</span>`;
}
function stale(x) {
  return x.last !== S.doc.asof ? `<span class="sub2 down">data to ${dstr(x.last)}</span>` : "";
}
function nowRow(x, tf, label, key) {
  const st = x.tf[tf].state, pc = st.dc != null ? 100 * st.dc / (st.c - st.dc) : null;
  const so = st.open ? `<span class="sub2">${SOFAR} ${THIS[tf]}</span>` : "";
  return `<tr data-k="${key}"><td class="l nm">${label}</td>
    <td>${fmt(st.c, 2)}<span class="sub2 ${cls(pc)}">${sgn(pc, 2, "%")}</span></td>
    <td>${fmt(st.f, fdp(st.f))}<span class="sub2 ${cls(st.df)}">${sgn(st.df, fdp(st.df))}</span>${so}</td>
    <td class="l" data-h="${RECENT[tf]}">${recentPill(st)}<span class="sub2">price ${sgn(st.pcr, 1, "%")} · flow ${sgn(st.dfr, fdp(st.dfr))}</span></td>
    <td class="l">${kdjCell(st, tf)}</td>
    <td class="l">${divPill(st.div, tf)}</td></tr>`;
}
function renderMatrix() {
  const lv = S.doc.live;
  $("mtxsub").innerHTML = "KDJ of the flow line, and the flow's move inside the current candle" +
    (lv ? ` · today ${SOFAR} as of ${etTime(lv.t)} ET` : ` · data to the ${dstr(S.doc.asof)} close`);
  const head = `<tr><th class="l">Index</th>${TFS.map(([k, l]) => `<th class="l">${l}</th>`).join("")}</tr>`;
  const rows = S.doc.indices.map((x) => {
    const cells = TFS.map(([tf, l]) => {
      const st = x.tf[tf].state, up = st.rel > 0;
      const fresh = st.cross && st.cross.ago <= 1 ? (st.cross.type === "golden" ? " fresh-up" : " fresh-down") : "";
      return `<td class="l mcell${fresh}" data-h="${l}"><span class="${up ? "up" : "down"}">${up ? "▲" : "▼"} K ${fmt(st.k, 0)} · D ${fmt(st.d, 0)}</span>
        <span class="dim">J ${fmt(st.j, 0)}</span>${st.open ? " " + SOFAR : ""}
        <span class="sub2">flow <span class="${cls(st.df)}">${sgn(st.df, fdp(st.df))}</span> ${thisLabel(tf, st.open)} · ${crossTxt(st.cross, tf, true)}</span></td>`;
    }).join("");
    return `<tr data-k="${x.key}" class="${S.view === x.key ? "sel" : ""}"><td class="l nm">${esc(x.name)}${stale(x)}</td>${cells}</tr>`;
  }).join("");
  $("mtx").innerHTML = head + rows;
  $("mtx").querySelectorAll("tr[data-k]").forEach((r) => r.onclick = () => setView(r.dataset.k));
}
function renderNow() {
  const all = S.view === "all";
  const head = (first) => `<tr><th class="l">${first}</th><th>Close</th><th>Flow</th><th class="l">Recent</th><th class="l">KDJ of flow</th><th class="l">Latest divergence</th></tr>`;
  if (all) {
    $("nowtf").textContent = `${TFNAME[S.tf]} candles` + (S.doc.indices[0].tf[S.tf].open_last ? " · latest candle so far" : "");
    $("nowtab").innerHTML = head("Index") + S.doc.indices.map((x) => nowRow(x, S.tf, esc(x.name) + stale(x), x.key)).join("");
  } else {
    const x = idxOf(S.view);
    $("nowtf").textContent = `${x.name} · every candle size`;
    $("nowtab").innerHTML = head("Candles") + TFS.map(([tf, l]) => nowRow(x, tf, l, x.key + ":" + tf)).join("");
  }
  $("nowtab").querySelectorAll("tr[data-k]").forEach((r) => r.onclick = () => {
    const el = $("c-" + r.dataset.k.replace(":", "-"));
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
}


function disposeCharts() {
  S.charts.forEach((c) => c.chart.remove());
  S.charts = [];
  $("charts").innerHTML = "";
}
function lineOpts(color, width, extra) {
  return Object.assign({ color, lineWidth: width, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 3 }, extra || {});
}

function addLine(chart, pane, T, arr, color, width, extra, from) {
  const open = T.open_last, n = T.t.length;
  const pts = (a, b) => { const out = []; for (let i = a; i < b; i++) out.push(i < from || arr[i] == null ? { time: T.t[i] } : { time: T.t[i], value: arr[i] }); return out; };
  const showLast = !extra || extra.lastValueVisible !== false;
  const main = chart.addSeries(LW.LineSeries, lineOpts(color, width, Object.assign({}, extra, { lastValueVisible: showLast && !open })), pane);
  main.setData(pts(0, open ? n - 1 : n));
  if (open && n >= 2) {
    const so = chart.addSeries(LW.LineSeries, lineOpts(color, width, Object.assign({}, extra, {
      lineStyle: LW.LineStyle.Dashed, lastValueVisible: showLast, title: showLast ? "so far" : "",
      pointMarkersVisible: true, pointMarkersRadius: 2.5, autoscaleInfoProvider: extra && extra.autoscaleInfoProvider })), pane);
    so.setData(pts(n - 2, n).filter((p) => p.value != null));
  }
  return main;
}
function buildChart(x, tf, title, id) {
  const T = x.tf[tf], n = T.t.length;
  const hide = Math.max(0, T.k.findIndex((v) => v != null));
  const card = document.createElement("div");
  card.className = "card"; card.id = id;
  const st = T.state, pc = st.dc != null ? 100 * st.dc / (st.c - st.dc) : null;
  const lag = x.last !== S.doc.asof ? `<span class="down px">data to ${dstr(x.last)}</span>` : "";
  card.innerHTML = `<div class="hd"><span class="t">${title}</span>${lag}
      <span class="px num">${fmt(st.c, 2)} <span class="${cls(pc)}">${sgn(pc, 2, "%")}</span>${st.open ? " " + SOFAR : ""}</span>
      <span class="chips">${recentPill(st)} ${st.div ? divPill(st.div, tf, false) : ""}</span></div>
    <div class="chartbox"><div class="legend lg0"></div><div class="legend lg1"></div><div class="legend lg2"></div></div>`;
  $("charts").appendChild(card);
  const box = card.querySelector(".chartbox");
  const chart = LW.createChart(box, {
    autoSize: true,
    layout: { background: { type: "solid", color: COL.bg }, textColor: COL.text, fontSize: 11,
      panes: { separatorColor: COL.line, separatorHoverColor: "#323a4b", enableResize: false } },
    grid: { vertLines: { color: COL.grid }, horzLines: { color: COL.grid } },
    rightPriceScale: { borderColor: COL.line, minimumWidth: 70 },
    timeScale: { borderColor: COL.line, rightOffset: 4, minBarSpacing: 0.05 },
    crosshair: { mode: LW.CrosshairMode.Normal },
  });
  const dp = Math.max(...T.f.slice(-50).map(Math.abs)) >= 1000 ? 0 : 1;
  const pdp = T.c[n - 1] >= 1000 ? 0 : 2;
  const price = addLine(chart, 0, T, T.c, COL.price, 2, { priceFormat: roundFmt(pdp) }, 0);
  addLine(chart, 1, T, T.f, COL.flow, 2, { priceFormat: roundFmt(dp) }, 0);
  const kf = { priceFormat: roundFmt(0),
    autoscaleInfoProvider: () => ({ priceRange: { minValue: -10, maxValue: 110 } }) };
  const K = addLine(chart, 2, T, T.k, COL.k, 2, kf, hide);
  addLine(chart, 2, T, T.d, COL.d, 2, kf, hide);
  addLine(chart, 2, T, T.j, COL.j, 1, Object.assign({ lastValueVisible: false }, kf), hide);
  for (const [lvl, c] of [[80, "rgba(239,83,80,.55)"], [20, "rgba(38,166,154,.55)"]])
    K.createPriceLine({ price: lvl, color: c, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: false });

  LW.createSeriesMarkers(K, T.crosses.filter((c) => !c.open).map((c) => ({ time: c.t, position: "inBar", shape: "circle", size: 0.7,
    color: c.type === "golden" ? COL.up : COL.down })));
  const openX = T.crosses.filter((c) => c.open);
  if (openX.length) {
    const tail = chart.addSeries(LW.LineSeries, { color: "rgba(0,0,0,0)", lineVisible: false, priceLineVisible: false, lastValueVisible: false,
      crosshairMarkerVisible: false, autoscaleInfoProvider: () => null }, 2);
    tail.setData(openX.map((c) => ({ time: c.t, value: T.k[T.t.indexOf(c.t)] })));
    LW.createSeriesMarkers(tail, openX.map((c) => ({ time: c.t, position: "inBar", shape: "circle", size: 0.7, color: COL.muted })));
  }
  const pm = [], narrow = matchMedia("(max-width: 720px)").matches, longTf = tf === "2W" || tf === "M";
  for (const dv of T.divs) {
    const c = dv.type === "bull" ? COL.up : COL.down;
    const seg = { color: c, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      pointMarkersVisible: true, pointMarkersRadius: 2.5, autoscaleInfoProvider: () => null };
    if (dv.p1) {
      chart.addSeries(LW.LineSeries, seg, 0).setData([{ time: dv.p1, value: dv.c1 }, { time: dv.p2, value: dv.c2 }]);
      chart.addSeries(LW.LineSeries, seg, 1).setData([{ time: dv.p1, value: dv.f1 }, { time: dv.p2, value: dv.f2 }]);
    }
    pm.push({ time: dv.t, position: dv.type === "bull" ? "belowBar" : "aboveBar", color: c,
      shape: dv.type === "bull" ? "arrowUp" : "arrowDown", text: narrow || longTf ? "" : dv.type === "bull" ? "Bull div" : "Bear div", size: 1 });
  }
  LW.createSeriesMarkers(price, pm);
  if (tf === "2W" || tf === "M")
    chart.priceScale("right", 0).applyOptions({ mode: LW.PriceScaleMode.Logarithmic });
  const panes = chart.panes();
  [47, 28, 25].forEach((w, i) => panes[i] && panes[i].setStretchFactor(w));
  const lg = [".lg0", ".lg1", ".lg2"].map((s) => box.querySelector(s));
  const place = () => {
    const h = chart.panes().map((p) => p.getHeight());
    lg[0].style.top = "4px"; lg[1].style.top = (h[0] + 5) + "px"; lg[2].style.top = (h[0] + h[1] + 6) + "px";
  };
  requestAnimationFrame(() => requestAnimationFrame(place));
  const live = tf === "D" && T.open_last && (x.live || S.doc.live);
  const legend = (i) => {
    i = i == null || i < 0 || i > n - 1 ? n - 1 : i;
    const so = i === n - 1 && T.open_last;
    const when = so ? (live ? `today ${SOFAR} · ${etTime(live.t)} ET` : `${THIS[tf]} ${SOFAR} · to ${dstr(T.t[i], false)}`) : `<span class="dim">${dstr(T.t[i])}</span>`;
    const df = i > 0 ? T.f[i] - T.f[i - 1] : null;
    lg[0].innerHTML = `<b class="lp">Price</b> ${fmt(T.c[i], 2)} ${when}`;
    lg[1].innerHTML = `<b class="lf">Smart Money Flow</b> ${fmt(T.f[i], dp)} <span class="${cls(df)}">${sgn(df, dp)}</span>${so ? " " + SOFAR : ""}`;
    lg[2].innerHTML = i < hide ? `<b>KDJ</b> <span class="dim">warming up</span>` :
      `<b>KDJ</b> <span class="lk">K ${fmt(T.k[i], 0)}</span> <span class="ld">D ${fmt(T.d[i], 0)}</span> <span class="lj">J ${fmt(T.j[i], 0)}</span>${so ? " " + SOFAR : ""}`;
  };
  legend(null);
  const index = new Map(T.t.map((t, i) => [t, i]));
  chart.subscribeCrosshairMove((p) => legend(p && p.time ? index.get(typeof p.time === "string" ? p.time :
    `${p.time.year}-${String(p.time.month).padStart(2, "0")}-${String(p.time.day).padStart(2, "0")}`) : null));
  const rec = { key: x.key, tf, chart, n, t: T.t };
  chart.timeScale().subscribeVisibleLogicalRangeChange((r) => syncFrom(rec, r));
  new ResizeObserver(() => requestAnimationFrame(place)).observe(box);
  return rec;
}
function idxLE(ts, day) {
  let lo = 0, hi = ts.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (ts[m] <= day) { ans = m; lo = m + 1; } else hi = m - 1; }
  return ans;
}
function mapIdx(src, dst, x) {
  if (x >= src.n - 1) return dst.n - 1 + (x - (src.n - 1));
  const i = Math.max(0, Math.min(src.n - 1, Math.round(x)));
  return Math.max(0, idxLE(dst.t, src.t[i])) + (x - i);
}
function syncFrom(src, r) {
  if (!r || S.view !== "all") return;
  for (const c of S.charts) {
    if (c === src || c.tf !== src.tf) continue;
    const cur = c.chart.timeScale().getVisibleLogicalRange();
    const want = { from: mapIdx(src, c, r.from), to: mapIdx(src, c, r.to) };
    if (cur && Math.abs(cur.from - want.from) < 0.01 && Math.abs(cur.to - want.to) < 0.01) continue;
    c.chart.timeScale().setVisibleLogicalRange(want);
  }
}
function setRange(c, rangeKey, focus) {
  const ts = c.chart.timeScale(), last = c.t[c.n - 1];
  if (focus) {
    const to = addDays(focus.to, 60) < last ? addDays(focus.to, 60) : last;
    ts.setVisibleRange({ from: addDays(focus.from, -45), to });
    return;
  }
  const days = RANGES.find(([k]) => k === rangeKey)[2];
  if (!days) { ts.setVisibleLogicalRange({ from: -2, to: c.n + 3 }); return; }
  const i0 = c.t.findIndex((t) => t >= addDays(last, -days));
  ts.setVisibleLogicalRange({ from: Math.max(0, i0) - 0.5, to: c.n + 3 });
}
function applyRanges(focus) {
  if (!S.charts.length) return;
  if (S.view === "all") setRange(S.charts[0], S.range, focus);
  else S.charts.forEach((c) => setRange(c, TF_RANGE[c.tf], focus && focus.tf === c.tf ? focus : null));
}
function renderCharts(keep) {
  const saved = keep ? new Map(S.charts.map((c) => [c.key + ":" + c.tf, c.chart.timeScale().getVisibleLogicalRange()])) : null;
  disposeCharts();
  if (S.view === "all") {
    $("chartsh").innerHTML = `All indices <span class="h2s">${TFNAME[S.tf]} candles</span>`;
    for (const x of S.doc.indices) S.charts.push(buildChart(x, S.tf, esc(x.name), "c-" + x.key));
  } else {
    const x = idxOf(S.view);
    $("chartsh").innerHTML = `${esc(x.name)} <span class="h2s">every candle size</span>`;
    for (const [tf, l] of TFS) S.charts.push(buildChart(x, tf, l, `c-${x.key}-${tf}`));
  }
  applyRanges();
  if (saved) for (const c of S.charts) {
    const r = saved.get(c.key + ":" + c.tf);
    if (r) c.chart.timeScale().setVisibleLogicalRange(r);
  }
}


function avgCell(o) {
  if (!o || o.avg == null) return `<td class="dim">—</td>`;
  return `<td><span class="${cls(o.avg)}">${sgn(o.avg, 1, "%")}</span><span class="sub2">${fmt(o.up, 0)}% up${o.n != null ? " · " + o.n : ""}</span></td>`;
}
function renderDivs() {
  const tf = S.dtf, idx = S.doc.indices, all = S.view === "all";
  $("divtf").textContent = `${TFNAME[tf]} candles · ${dstr(S.doc.first)} to ${dstr(S.doc.asof)}`;
  chips($("fdtf"), TFS, tf, (k) => { S.dtf = k; writeHash(); renderDivs(); });
  $("fidxwrap").style.display = all ? "" : "none";
  chips($("fidx"), [["all", "All"]].concat(idx.map((x) => [x.key, SHORT[x.key] || x.name])), S.fidx, (k) => { S.fidx = k; writeHash(); renderDivs(); });
  chips($("ftyp"), [["both", "Both"], ["bull", "Bullish"], ["bear", "Bearish"]], S.ftyp, (k) => { S.ftyp = k; writeHash(); renderDivs(); });
  const want = all ? S.fidx : S.view;
  const pick = idx.filter((x) => want === "all" || x.key === want);
  const types = S.ftyp === "both" ? ["bull", "bear"] : [S.ftyp];
  let sum = `<tr><th class="l">Index</th><th class="l">After</th><th>Signals</th><th>1 month</th><th>3 months</th><th>6 months</th><th>Worst dip in 3M</th></tr>`;
  for (const x of pick) {
    const T = x.tf[tf], b = x.baseline;
    for (const ty of types) {
      const s = T.summary[ty];
      sum += `<tr><td class="l nm">${esc(x.name)}</td><td class="l"><span class="pill ${ty}">${ty === "bull" ? "Bullish" : "Bearish"}</span></td>
        <td>${s.n}</td>${avgCell(s.m1)}${avgCell(s.m3)}${avgCell(s.m6)}
        <td>${s.dip == null ? '<span class="dim">—</span>' : `<span class="${cls(s.dip)}">${sgn(s.dip, 1, "%")}</span>`}</td></tr>`;
    }
    sum += `<tr class="grp"><td class="l"></td><td class="l">Every day</td><td class="dim">${b.m1.n != null ? b.m1.n + " days" : "all days"}</td>${avgCell(b.m1)}${avgCell(b.m3)}${avgCell(b.m6)}<td></td></tr>`;
  }
  $("sumtab").innerHTML = sum;
  const rows = [];
  for (const x of pick) for (const dv of x.tf[tf].divs) if (types.includes(dv.type)) rows.push([x, dv]);
  rows.sort((a, b) => a[1].t < b[1].t ? 1 : a[1].t > b[1].t ? -1 : 0);
  const f = (v) => v == null ? `<td class="dim">open</td>` : `<td class="${cls(v)}">${sgn(v, 1, "%")}</td>`;
  const pairs = rows.some(([, dv]) => dv.p1);
  let html = `<tr><th class="l">Signal</th><th class="l">Index</th><th class="l">Type</th>${pairs ? `<th class="l">Between the ${S.ftyp === "bear" ? "highs" : S.ftyp === "bull" ? "lows" : "lows / highs"}</th>` : ""}
    <th>Close</th><th>1M</th><th>3M</th><th>6M</th><th>Worst dip 3M</th></tr>`;
  html += rows.map(([x, dv]) => {
    const dip = dv.fwd.dip != null ? `<td class="${cls(dv.fwd.dip)}">${sgn(dv.fwd.dip, 1, "%")}</td>` :
      dv.fwd.dip_so_far != null ? `<td class="dim">${sgn(dv.fwd.dip_so_far, 1, "%")} so far</td>` : `<td class="dim">open</td>`;
    const between = !pairs ? "" : `<td class="l">${dstr(dv.p1, false)} → ${dstr(dv.p2, false)}<span class="sub2">price ${sgn(100 * (dv.c2 / dv.c1 - 1), 1, "%")} · flow ${sgn(dv.f2 - dv.f1, fdp(dv.f2 - dv.f1))} between the ${dv.type === "bull" ? "lows" : "highs"}</span></td>`;
    return `<tr data-k="${x.key}" data-a="${dv.p1 || addDays(dv.t, -90)}" data-b="${dv.t}"><td class="l">${dstr(dv.t)}</td><td class="l nm">${esc(x.name)}</td>
      <td class="l"><span class="pill ${dv.type}">${dv.type === "bull" ? "Bullish" : "Bearish"}</span></td>
      ${between}
      <td>${fmt(dv.c, 2)}</td>${f(dv.fwd.m1)}${f(dv.fwd.m3)}${f(dv.fwd.m6)}${dip}</tr>`;
  }).join("") || `<tr><td class="l dim" colspan="${pairs ? 9 : 8}">No divergences on these candles.</td></tr>`;
  $("divtab").innerHTML = html;
  $("divtab").querySelectorAll("tr[data-k]").forEach((r) => r.onclick = () => {
    const focus = { from: r.dataset.a, to: r.dataset.b, tf };
    if (all) {
      if (S.tf !== tf) { S.tf = tf; S.range = TF_RANGE[tf]; writeHash(); controls(); renderNow(); renderCharts(); }
      applyRanges(focus);
      $("c-" + r.dataset.k).scrollIntoView({ behavior: "smooth" });
    } else {
      applyRanges(focus);
      $(`c-${r.dataset.k}-${tf}`).scrollIntoView({ behavior: "smooth" });
    }
  });
}


function render(keep) {
  if (S.view !== "all" && !idxOf(S.view)) S.view = "all";
  if (S.fidx !== "all" && !idxOf(S.fidx)) S.fidx = "all";
  controls();
  renderMatrix();
  renderNow();
  renderCharts(keep);
  renderDivs();
  $("first").textContent = dstr(S.doc.first);
}
function vintage() {
  const b = new Date(S.doc.built * 1000), lv = S.doc.live;
  $("vint").innerHTML = `Data to the ${dstr(S.doc.asof)} close` +
    (lv ? `<br>today ${SOFAR} as of ${etTime(lv.t)} ET` : "") +
    `<br>built ${b.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}` +
    "";
}

const GH = /(^|\.)github\.io$/i.test(location.hostname);
const RAW = "https://raw.githubusercontent.com/lawrencekenshin/mii-lab/smart-money-data/smart-money/";
let BASE = GH ? RAW : "snap/";
async function getJson(name) {
  let r = await fetch(BASE + name, { cache: "no-cache" }).catch(() => null);
  if ((!r || !r.ok) && BASE !== RAW) { BASE = RAW; r = await fetch(BASE + name, { cache: "no-cache" }).catch(() => null); }
  if (!r || !r.ok) throw new Error("data " + (r ? r.status : "offline"));
  return r.json();
}
async function load(keep) {
  const y = window.scrollY;
  try {
    S.man = await getJson("manifest.json");
    S.doc = await getJson("smart-money.json");
    S.doc.built = Date.parse(S.man.generated_utc) / 1000;
    S.doc.asof = S.doc.as_of;
    S.built = S.man.sha256;
    vintage();
    render(keep);
    if (keep) window.scrollTo({ top: y });
  } catch (e) {
    $("vint").innerHTML = `<span class="down">Couldn't load data (${esc(e.message)})</span>`;
  }
}
async function poll() {
  if (!S.doc) return load();
  try {
    const m = await getJson("manifest.json");
    if (m.sha256 && m.sha256 !== S.built) load(true);
  } catch (e) {  }
}
const ctlH = () => document.documentElement.style.setProperty("--ctl", document.querySelector(".controls").offsetHeight + "px");
new ResizeObserver(ctlH).observe(document.querySelector(".controls"));
readHash();
load();
setInterval(poll, 5 * 60 * 1000);
