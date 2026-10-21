"use strict";

const LW = window.LightweightCharts;
const COL = { buy: "#2fd27a", caution: "#ff9d5c", bg: "#151a23", grid: "#1c2230", text: "#a9b0bc", line: "#262d3b", up: "#26a69a", down: "#ef5350", y: "#f5c518",
  g: "#3ee08f", m: "#e056fd", low: "#4fc3f7", blue: "#5b8def", poc: "#f5a623", muted: "#6f7787" };
const RANGES = [["3m", "3M", 63], ["6m", "6M", 126], ["1y", "1Y", 252], ["2y", "2Y", 504], ["all", "All", 0]];
const UNITS = [["sh", "Shares"], ["usd", "Dollars"]];
const VPW = [["3m", "3M"], ["6m", "6M"], ["1y", "1Y"], ["off", "Off"]];
const VPNAME = { "3m": "3 months", "6m": "6 months", "1y": "12 months" };
const SIGNALS = ["yellow", "breakout", "capitulation", "lowvol"];
const SIGNAME = { yellow: "Yellow", breakout: "High-volume breakout", capitulation: "Capitulation", lowvol: "Low volume" };
const SIGK = { yellow: "y", breakout: "g", capitulation: "m", lowvol: "lo" };
const KNAME = { y: "Yellow", g: "High-volume breakout", m: "Capitulation", l: "Light volume", "": "Normal volume" };
const CTRL = { yellow: "other breakouts to a one-month high", breakout: "other breakouts to a one-month high",
  capitulation: "other sharp falls on lighter volume", lowvol: "every full session" };
const ERAS = [["recent", "2021-now"], ["prior", "2013-2020"]];
const MODES = [["simple", "Simple"], ["detail", "Detailed"]];
const S = { doc: null, mode: "simple", view: "all", range: "1y", unit: "sh", vp: "1y", fsym: "all", ftyp: "all", asym: "SPY", nsig: 40, charts: [] };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (v, dp) => v == null ? "—" : (Math.round(v * 10 ** dp) / 10 ** dp || 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const sgn = (v, dp = 1, suf = "") => v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), dp) + suf;
const cls = (v) => v == null ? "dim" : v > 0 ? "up" : v < 0 ? "down" : "dim";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dstr = (s, yr = true) => { const [y, m, d] = s.split("-").map(Number); return `${MON[m - 1]} ${d}` + (yr ? `, ${y}` : ""); };
const daysBetween = (a, b) => (new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 864e5;
const etTime = (epoch) => new Date(epoch * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
const SOFAR = `<span class="sofar">so far</span>`;
const LTZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } })();
const tzFmt = (epoch, tz) => new Date(epoch * 1000).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const yourTime = (epoch) => {
  if (!LTZ || epoch == null) return "";
  const a = tzFmt(epoch, LTZ);
  return a === tzFmt(epoch, "America/New_York") ? "" : ` (${a} your time)`;
};
const tk = (sym) => S.doc.tickers.find((x) => x.sym === sym);
const big = (v, dollars) => {
  if (v == null) return "—";
  const a = Math.abs(v), p = dollars ? "$" : "";
  if (a >= 1e9) return p + fmt(v / 1e9, a >= 1e11 ? 0 : 1) + "B";
  if (a >= 1e6) return p + fmt(v / 1e6, a >= 1e8 ? 0 : 1) + "M";
  if (a >= 1e3) return p + fmt(v / 1e3, 0) + "K";
  return p + fmt(v, 0);
};
const usd = () => S.unit === "usd";
const vol = (shares, price) => shares == null ? "—" : big(usd() ? shares * price : shares, usd());
const TIER = { L: "lo2", l: "lo1", h: "hi1", H: "hi2" };
const rvTier = (t) => TIER[t] || "";
const rvSpan = (rv, t) => rv == null ? `<span class="dim">—</span>` : `<span class="rv ${rvTier(t)}">${fmt(rv, 2)}×</span>`;
const kPill = (k) => `<span class="pill ${k || "n"}">${KNAME[k || ""]}</span>`;
const sigPill = (s, extra = "") => `<span class="pill ${SIGK[s]}">${SIGNAME[s]}${extra}</span>`;
const tagHtml = (tags) => (tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
const kFmt = (wk) => String(Math.floor(wk));
const kCell = (wk, late, fresh) => wk == null ? `<span class="dim">—</span>` :
  `<span class="${late ? "kl" : "dim2"}">${kFmt(wk)}</span>` + (late ? ` <span class="pill late">Late in the move</span>` : "") +
  (fresh ? ` <span class="pill fresh">First breakout out of a correction</span>` : "");
const sess = (n) => n === 0 ? "last session" : n === 1 ? "1 session ago" : `${n} sessions ago`;

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const syms = S.doc ? S.doc.tickers.map((x) => x.sym) : [];
  if (h.get("v") && (h.get("v") === "all" || syms.includes(h.get("v")))) S.view = h.get("v");
  if (RANGES.some(([k]) => k === h.get("r"))) S.range = h.get("r");
  if (UNITS.some(([k]) => k === h.get("u"))) S.unit = h.get("u");
  if (VPW.some(([k]) => k === h.get("p"))) S.vp = h.get("p");
  if (MODES.some(([k]) => k === h.get("m"))) S.mode = h.get("m");
  if (h.get("fs") && (h.get("fs") === "all" || syms.includes(h.get("fs")))) S.fsym = h.get("fs");
  if (h.get("ft") && (h.get("ft") === "all" || SIGNALS.includes(h.get("ft")))) S.ftyp = h.get("ft");
  if (h.get("a") && syms.includes(h.get("a"))) S.asym = h.get("a");
}
function writeHash() {
  history.replaceState(null, "", `#m=${S.mode}&v=${S.view}&r=${S.range}&u=${S.unit}&p=${S.vp}&fs=${S.fsym}&ft=${S.ftyp}&a=${S.asym}`);
}
function chips(el, items, cur, onPick) {
  el.innerHTML = items.map(([k, lab]) => `<button class="chip${k === cur ? " on" : ""}" data-k="${esc(k)}">${esc(lab)}</button>`).join(" ");
  el.querySelectorAll("button").forEach((b) => b.onclick = () => onPick(b.dataset.k));
}
function setView(v) {
  S.view = v;
  if (v !== "all") { S.fsym = v; S.asym = v; }
  writeHash(); render(false);
  const card = document.querySelector("#charts .card");
  (card || $("chartsh")).scrollIntoView({ behavior: "smooth" });
}
function controls() {
  chips($("modes"), MODES, S.mode, (k) => { S.mode = k; writeHash(); render(true); });
  $("vpwrap").style.display = S.mode === "simple" ? "none" : "";
  $("unitwrap").style.display = S.mode === "simple" ? "none" : "";
  chips($("views"), [["all", "All"]].concat(S.doc.tickers.map((x) => [x.sym, x.sym])), S.view, setView);
  chips($("ranges"), RANGES.map(([k, l]) => [k, l]), S.range, (k) => { S.range = k; writeHash(); controls(); applyRanges(); });
  chips($("units"), UNITS, S.unit, (k) => { S.unit = k; writeHash(); render(true); });
  chips($("vpw"), VPW, S.vp, (k) => { S.vp = k; writeHash(); render(true); });
}


const pctS = (v, dp = 1) => v == null ? "—" : sgn(v, dp, "%");
function recLine(b) {
  if (!b || !b.n) return "no buy zone since 2013";
  return `<b>3 months later:</b> higher <b>${b.up3} of ${b.n3}</b> times · average ${pctS(b.avg3)}<br>
    <b>1 month later:</b> higher ${b.up1} of ${b.n1} · average ${pctS(b.avg1)}<br>
    <b>It usually fell further first:</b> typically ${pctS(b.dip_med)}, worst ${pctS(b.dip_worst)}`;
}
function renderBoard() {
  $("boardsub").innerHTML = `${S.doc.live ? `today ${SOFAR} · ${etTime(S.doc.live.t)} ET${yourTime(S.doc.live.t)}` : `as of the ${dstr(S.doc.asof)} close`} ·
    every number below is what happened after past signals of the same kind, since 2013`;
  $("boardcards").innerHTML = S.doc.tickers.map((x) => {
    const B = x.board, now = x.today ? x.today : null;
    if (!B) return "";
    const px = now ? `${fmt(now.c, 2)} <span class="${cls(now.chg)}">${sgn(now.chg, 2, "%")}</span> ${SOFAR}` : `${fmt(x.now.c, 2)} <span class="${cls(x.now.ret)}">${sgn(x.now.ret, 2, "%")}</span>`;
    const O = B.ordinary;
    let badge, body;
    if (B.state === "buy") {
      badge = `<span class="sig buy">▲ BUY ZONE</span>`;
      const since = B.zone_start && B.zone_c != null ? ` It began <b>${dstr(B.zone_start)}</b> at ${fmt(B.zone_c, 2)}; price is ${pctS(B.since)} since.` : "";
      body = `<p class="why">${B.grace ? `Weekly K is back out of the washed-out band (<b>${kFmt(B.wk)}</b>), but the zone stays open ${B.grace_left} more session${B.grace_left === 1 ? "" : "s"}.`
          : `Washed out: weekly K <b>${kFmt(B.wk)}</b>.`}${since}</p>
        <p class="rec">After the <b>${B.buy.n3}</b> earlier buy zones, counted from each zone's first day:<br>${recLine(B.buy)}</p>
        ${O ? `<p class="base">An ordinary day: higher 3 months later ${fmt(O.up3, 0)}% of the time · average ${pctS(O.avg3)} · typically dips ${pctS(O.dip_med)} first</p>` : ""}`;
    } else if (B.state === "caution") {
      const sp = x.summary.yellow_split, a = sp.recent.late, b = sp.prior.late, ba = sp.recent.base, bb = sp.prior.base;
      const m = (s) => s.m1.avg == null ? "—" : `${pctS(s.m1.avg)}, higher ${fmt(s.m1.up, 0)}%`;
      const nT = (s) => s.m1.n === 1 ? "1 time" : `${s.m1.n} times`;
      badge = `<span class="sig caution">▼ CAUTION · don't chase</span>`;
      body = `<p class="why">Yellow candles late in the move since <b>${dstr(B.caution.t)}</b> (weekly K ${kFmt(B.caution.wk)}): new highs on light volume after a long run.</p>
        <p class="rec"><b>A month after past ones:</b><br>2021–now: ${m(a)} (${nT(a)}) · ordinary day ${m(ba)}<br>2013–2020: ${m(b)} (${nT(b)}) · ordinary day ${m(bb)}</p>
        <p class="base">Not a sell: a month later prices were still higher ${a.m1.up != null ? fmt(a.m1.up, 0) + "%" : "—"} of the time (2021–now). Weekly K now ${kFmt(B.wk)}.</p>`;
    } else {
      const lastZ = (B.past || [])[0];
      badge = `<span class="sig none">○ NO SIGNAL</span>`;
      body = `<p class="why">Weekly K <b>${kFmt(B.wk)}</b>${B.late_now ? " (late in the move, but no yellow candle)" : ""}. ${B.capit ? "No buy or caution signal; see the capitulation below." : "Nothing to act on."} A buy zone opens when weekly K washes out.</p>
        <p class="rec">${lastZ ? `Last buy zone: <b>${dstr(lastZ.t)}</b>${lastZ.m3 != null ? ` → ${pctS(lastZ.m3)} 3 months later` : lastZ.m1 != null ? ` → ${pctS(lastZ.m1)} 1 month later` : ""}.` : ""}
          Past buy zones on ${x.sym}: higher 3 months later ${B.buy.up3} of ${B.buy.n3} times (average ${pctS(B.buy.avg3)}).</p>`;
      if (lastZ && lastZ.open) body = body.replace(/ → [^.]*\./, " (3 months not over yet).");
    }
    if (B.capit) {
      const cs = x.summary.capitulation, a = cs.recent, b = cs.prior;
      const w = (blk) => blk.w1.avg == null ? "—" : `1 week ${pctS(blk.w1.avg)}, 1 month ${blk.m1.avg == null ? "—" : pctS(blk.m1.avg)}`;
      const times = (blk) => blk.w1.n === 1 ? "1 time" : `${blk.w1.n} times`;
      const when = B.capit.live ? `today ${SOFAR} (on pace for ${fmt(B.capit.rv, 1)}× volume, ${pctS(B.capit.ret)})`
        : `<b>${dstr(B.capit.t)}</b>: ${pctS(B.capit.ret)} on ${fmt(B.capit.rv, 1)}× volume`;
      body += `<div class="capblk"><span class="sig cap">▼ CAPITULATION</span>
        <p class="why">${when}: heavy selling on very heavy volume.</p>
        <p class="rec"><b>After past ones</b> (vs other sharp falls on lighter volume):<br>
          2021–now: ${w(a.sig)} (${times(a.sig)}) · those falls ${w(a.ctrl)}<br>
          2013–2020: ${w(b.sig)} (${times(b.sig)}) · those falls ${w(b.ctrl)}</p></div>`;
    }
    return `<div class="bcard ${B.state}" data-k="${x.sym}"><div class="bhd"><span class="t">${x.sym}<span>${esc(x.name)}</span></span><span class="px num">${px}</span></div>
      ${badge}${body}</div>`;
  }).join("");
  $("boardcards").querySelectorAll(".bcard").forEach((c) => c.onclick = () => setView(c.dataset.k));
}


function paceBar(p, t) {
  if (p == null) return "";
  const w = Math.min(100, 100 * p / 2.5);
  return `<span class="bar"><i style="width:${w}%;background:${t === "l" || t === "L" ? COL.low : t === "h" || t === "H" ? COL.poc : COL.blue}"></i><b style="left:${100 / 2.5}%"></b></span>`;
}
function watchPills(T) {
  const out = [];
  if (T.flags.includes("yellow")) out.push(sigPill("yellow", " if it closes here"));
  if (T.flags.includes("breakout")) out.push(sigPill("breakout", " pace"));
  if (T.flags.includes("capitulation")) out.push(sigPill("capitulation", " pace"));
  if (T.flags.includes("lowvol")) out.push(sigPill("lowvol", ": lowest in a year on pace"));
  return out.join("") || `<span class="dim">—</span>`;
}
function marketOpen() {
  const cal = S.doc.today_cal, now = etParts();
  if (S.doc.live) return true;
  if (!cal || cal.day !== now.day) return marketOpenNow();
  const [ch, cm] = cal.close.split(":").map(Number);
  return cal.session && now.m >= 570 && now.m < ch * 60 + cm;
}
function etParts() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
  return { day: `${p.year}-${p.month}-${p.day}`, m: (+p.hour % 24) * 60 + +p.minute };
}
function marketOpenNow() {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
  const m = (+p.hour % 24) * 60 + +p.minute;
  return !["Sat", "Sun"].includes(p.weekday) && m >= 570 && m < 960;
}
function renderToday() {
  const lv = S.doc.live;
  if (lv) {
    $("todayh").firstChild.textContent = "Today so far ";
    $("todaysub").innerHTML = `${dstr(lv.day)} · as of ${etTime(lv.t)} ET${yourTime(lv.t)} · pace = volume against recent sessions at the same time of day`;
    const head = `<tr><th class="l">Ticker</th><th>Price</th><th>Breakout level</th><th>Volume ${SOFAR}</th><th>Usual by now</th>
      <th class="l">Pace</th><th>On pace for</th><th class="l">Weekly K</th><th class="l">Watch</th></tr>`;
    $("todaytab").innerHTML = head + S.doc.tickers.map((x) => {
      const T = x.today;
      if (!T) return `<tr data-k="${x.sym}"><td class="l nm">${x.sym}<span class="sub2">${esc(x.name)}</span></td><td colspan="8" class="l dim">no live data</td></tr>`;
      const d = 100 * (T.c / T.hi20 - 1);
      return `<tr data-k="${x.sym}"><td class="l nm">${x.sym}<span class="sub2">${esc(x.name)}</span></td>
        <td data-h="Price">${fmt(T.c, 2)}<span class="sub2 ${cls(T.chg)}">${sgn(T.chg, 2, "%")}</span></td>
        <td data-h="Breakout level">${fmt(T.hi20, 2)}<span class="sub2 ${T.above ? "up" : "dim"}">${T.above ? "above by " + fmt(d, 2) + "%" : fmt(-d, 2) + "% below"}</span></td>
        <td data-h="Volume so far">${vol(T.vol, T.c)}</td><td class="dim" data-h="Usual by now">${vol(T.usual, T.c)}</td>
        <td class="l" data-h="Pace">${rvSpan(T.pace, T.pt)}${paceBar(T.pace, T.pt)}</td>
        <td data-h="On pace for">${vol(T.proj, T.c)}<span class="sub2">${fmt(T.day_pace, 2)}× average${T.half ? " · half day (1 pm close)" : ""}</span></td>
        <td class="l wide" data-h="Weekly K">${kCell(T.wk, T.late, T.fresh)}</td>
        <td class="l wide" data-h="Watch">${watchPills(T)}</td></tr>`;
    }).join("");
  } else {
    const open = marketOpen();
    const why = S.doc.live_paused ? "live data paused for now"
      : "live volume not in yet (the pace table starts a few minutes after the open)";
    const cal = S.doc.today_cal, stale = cal && S.doc.asof < cal.expected;
    $("todayh").firstChild.textContent = open ? "Today " : "Next session ";
    $("todaysub").innerHTML = (open ? `US market open · ${why} · ` : "US market closed · ") +
      (stale ? `<span class="down">levels from the ${dstr(S.doc.asof)} close; the ${dstr(cal.expected)} session is not in yet</span>`
             : `data to the ${dstr(S.doc.asof)} close`) + (open ? "" : " · the pace table starts a few minutes after the open");
    const head = `<tr><th class="l">Ticker</th><th>Last close</th><th>Breakout level</th>
      <th>Yellow if under</th><th>High-volume if over</th><th>Year's lowest</th><th class="l">Weekly K</th></tr>`;
    $("todaytab").innerHTML = head + S.doc.tickers.map((x) => {
      const n = x.now, d = 100 * (n.next_hi / n.c - 1);
      const lag = x.last !== S.doc.asof ? `<span class="sub2 down">data to ${dstr(x.last)}</span>` : "";
      return `<tr data-k="${x.sym}"><td class="l nm">${x.sym}<span class="sub2">${esc(x.name)}</span>${lag}</td>
        <td data-h="Last close">${fmt(n.c, 2)}</td>
        <td data-h="Breakout level">${fmt(n.next_hi, 2)}<span class="sub2">${d > 0 ? "+" + fmt(d, 2) + "% away" : "at or below the close"}</span></td>
        <td data-h="Yellow if under"><span class="rv lo1">${vol(n.yel_under, n.c)}</span></td>
        <td data-h="High-volume if over"><span class="rv hi1">${vol(n.hv_over, n.c)}</span></td>
        <td data-h="Year's lowest">${vol(n.low_bar, n.c)}<span class="sub2">less = low-volume signal</span></td>
        <td class="l wide" data-h="Weekly K">${kCell(n.wk, n.late, false)}</td></tr>`;
    }).join("");
  }
  $("todaytab").querySelectorAll("tr[data-k]").forEach((r) => r.onclick = () => setView(r.dataset.k));
}


function sinceTxt(t, since, sinceUsd) {
  const old = (s) => s === null || (s && daysBetween(s, t) > 365);
  const one = (s, lab) => s === null ? `${lab}: lowest on record` : `${lab}: lowest since ${dstr(s)}`;
  const parts = [];
  if (old(since)) parts.push(one(since, "shares"));
  if (old(sinceUsd)) parts.push(one(sinceUsd, "dollars"));
  return parts;
}
function zoneTxt(x) {
  const p = x.vp[S.vp === "off" ? "6m" : S.vp];
  if (!p) return `<span class="dim">—</span>`;
  const c = x.today ? x.today.c : x.now.c;
  const inside = p.zones.find((z) => z.lo < c && c < z.hi), below = p.zones.filter((z) => z.hi <= c).pop(), above = p.zones.find((z) => z.lo >= c);
  if (inside) return `<span class="pill zone">in a low-volume zone ${fmt(inside.lo, 2)}–${fmt(inside.hi, 2)}</span>`;
  const out = [];
  if (below) out.push(`zone below ${fmt(below.lo, 2)}–${fmt(below.hi, 2)} <span class="dim">(${sgn(100 * (below.hi / c - 1), 1, "%")})</span>`);
  if (above) out.push(`zone above ${fmt(above.lo, 2)}–${fmt(above.hi, 2)} <span class="dim">(${sgn(100 * (above.lo / c - 1), 1, "%")})</span>`);
  return (out.join("<br>") || `<span class="dim">no low-volume zone</span>`) + `<span class="sub2">busiest price ${fmt(p.poc, 2)}</span>`;
}
function renderNow() {
  $("nowsub").innerHTML = `${dstr(S.doc.asof)} · volume against its average of the past month`;
  const head = `<tr><th class="l">Ticker</th><th>Close</th><th>Volume</th><th class="l">Candle</th><th class="l">Weekly K</th><th class="l">Signals, last month</th>
    <th class="l">Volume record</th><th class="l">Volume by price (${VPNAME[S.vp === "off" ? "6m" : S.vp]})</th><th class="l">Tags</th></tr>`;
  $("nowtab").innerHTML = head + S.doc.tickers.map((x) => {
    const n = x.now;
    const sig = SIGNALS.map((s) => n.latest[s] && n.latest[s].ago < 20 ? sigPill(s, ` · ${n.latest[s].ago === 0 ? "last session" : n.latest[s].ago + "d ago"}`) : "").join("");
    const rec = n.full === false ? [] : sinceTxt(n.t, n.since, n.since_usd);
    const lag = x.last !== S.doc.asof ? `<span class="sub2 down">data to ${dstr(x.last)}</span>` : "";
    return `<tr data-k="${x.sym}" class="${S.view === x.sym ? "sel" : ""}"><td class="l nm">${x.sym}<span class="sub2">${esc(x.name)}</span>${lag}</td>
      <td data-h="Close">${fmt(n.c, 2)}<span class="sub2 ${cls(n.ret)}">${sgn(n.ret, 2, "%")}</span></td>
      <td data-h="Volume">${vol(n.v, n.c)}<span class="sub2">${rvSpan(n.rv, n.rt)}</span></td>
      <td class="l" data-h="Candle">${kPill(n.k)}</td>
      <td class="l wide" data-h="Weekly K">${kCell(n.wk, n.late, n.fresh)}</td>
      <td class="l wrapc wide" data-h="Signals, last month">${sig || `<span class="dim">none</span>`}</td>
      <td class="l wide" data-h="Volume record">${rec.length ? rec.join("<br>") : `<span class="dim">—</span>`}</td>
      <td class="l wide" data-h="Volume by price">${zoneTxt(x)}</td>
      <td class="l wrapc wide" data-h="Tags">${tagHtml(n.tags) || `<span class="dim">—</span>`}</td></tr>`;
  }).join("");
  $("nowtab").querySelectorAll("tr[data-k]").forEach((r) => r.onclick = () => setView(r.dataset.k));
}


function candleColor(k, up, alpha = 1) {
  const a = (hex) => alpha === 1 ? hex : hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
  const dir = up ? COL.up : COL.down;
  if (k === "y") return { color: a(COL.y), borderColor: a(COL.y), wickColor: a(COL.y) };
  if (k === "g") return { color: a(COL.g), borderColor: a("#ffffff"), wickColor: a("#ffffff") };
  if (k === "m") return { color: a(COL.m), borderColor: a(COL.m), wickColor: a(COL.m) };
  if (k === "l") return { color: COL.bg, borderColor: a(dir), wickColor: a(dir) };
  return { color: a(dir), borderColor: a(dir), wickColor: a(dir) };
}
function volColor(k, up, faded) {
  const base = k === "y" ? COL.y : k === "g" ? COL.g : k === "m" ? COL.m : up ? COL.up : COL.down;
  const al = faded ? 0.35 : k === "l" ? 0.32 : k ? 0.85 : 0.55;
  return base + Math.round(al * 255).toString(16).padStart(2, "0");
}
function disposeCharts() {
  S.charts.forEach((c) => { c.dead = true; c.chart.remove(); });
  S.charts = [];
  $("charts").innerHTML = "";
}
function seriesData(x) {
  const C = x.chart, n = C.t.length, f = usd() && S.mode !== "simple", simple = S.mode === "simple";
  const cs = [], vs = [], av = [], lo = [], hi = [];
  for (let i = 0; i < n; i++) {
    const up = C.c[i] >= C.o[i];
    const sk = simple ? (C.k[i] === "m" ? "m" : "") : C.k[i];
    cs.push(Object.assign({ time: C.t[i], open: C.o[i], high: C.h[i], low: C.l[i], close: C.c[i] }, candleColor(sk, up)));
    const m = f ? C.c[i] : 1;
    vs.push({ time: C.t[i], value: C.v[i] * m, color: simple && sk !== "m" ? "rgba(111,119,135,.45)" : volColor(sk, up) });
    if (C.a[i] != null) {
      av.push({ time: C.t[i], value: C.a[i] * m });
    }
  }
  const T = x.today;
  if (T && T.day > C.t[n - 1]) {
    const up = T.c >= T.o, m = f ? T.c : 1;
    const tk_ = simple ? (T.k === "m" ? "m" : "") : T.k;
    cs.push(Object.assign({ time: T.day, open: T.o, high: T.h, low: T.l, close: T.c }, candleColor(tk_, up, 0.55)));
    vs.push({ time: T.day, value: T.vol * m, color: simple && tk_ !== "m" ? "rgba(111,119,135,.3)" : volColor(tk_, up, true) });
  }
  return { cs, vs, av, lo, hi };
}
function buildChart(x, multi) {
  const C = x.chart, n0 = C.t.length;
  const card = document.createElement("div");
  card.className = "card"; card.id = "c-" + x.sym;
  const T = x.today, nw = x.now;
  const px = T ? `${fmt(T.c, 2)} <span class="${cls(T.chg)}">${sgn(T.chg, 2, "%")}</span> ${SOFAR}` :
    `${fmt(nw.c, 2)} <span class="${cls(nw.ret)}">${sgn(nw.ret, 2, "%")}</span>`;
  const bs = x.board ? x.board.state : "none";
  const recent = S.mode === "simple"
    ? (bs === "buy" ? `<span class="sig buy small">▲ BUY ZONE</span>` : bs === "caution" ? `<span class="sig caution small">▼ CAUTION</span>` : `<span class="sig none small">○ NO SIGNAL</span>`) +
      (x.board && x.board.capit ? ` <span class="sig cap small">▼ CAPITULATION</span>` : "")
    : SIGNALS.filter((s) => nw.latest[s] && nw.latest[s].ago <= 10).map((s) => sigPill(s, nw.latest[s].ago ? ` ${nw.latest[s].ago}d ago` : "")).join("");
  card.innerHTML = `<div class="hd"><span class="t">${esc(x.name)}<span>${x.sym}</span></span><span class="px num">${px}</span>
      <span class="chips">${recent}</span></div>
    <div class="chartbox"><canvas class="vpcanvas"></canvas><div class="legend lg0"></div><div class="legend lg1"></div></div>`;
  $("charts").appendChild(card);
  const box = card.querySelector(".chartbox");
  const chart = LW.createChart(box, {
    autoSize: true,
    layout: { background: { type: "solid", color: COL.bg }, textColor: COL.text, fontSize: 11,
      panes: { separatorColor: COL.line, separatorHoverColor: "#323a4b", enableResize: false } },
    grid: { vertLines: { color: COL.grid }, horzLines: { color: COL.grid } },
    rightPriceScale: { borderColor: COL.line, minimumWidth: 66 },
    timeScale: { borderColor: COL.line, rightOffset: 4, minBarSpacing: 0.05 },
    crosshair: { mode: LW.CrosshairMode.Normal },
  });
  const D = seriesData(x);
  const n = D.cs.length;
  const price = chart.addSeries(LW.CandlestickSeries, { priceLineVisible: false, lastValueVisible: true, borderVisible: true,
    upColor: COL.up, downColor: COL.down, priceFormat: { type: "price", precision: 2, minMove: 0.01 } }, 0);
  price.setData(D.cs);
  const vf = { type: "custom", minMove: 1, formatter: (v) => big(v, usd()) };
  const vs = chart.addSeries(LW.HistogramSeries, { priceFormat: vf, priceLineVisible: false, lastValueVisible: false, base: 0 }, 1);
  vs.setData(D.vs);
  const ln = (color, width, style, scale) => chart.addSeries(LW.LineSeries, { color, lineWidth: width, lineStyle: style, priceFormat: vf,
    priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    autoscaleInfoProvider: scale ? undefined : () => null }, 1);
  ln("rgba(232,234,237,.6)", 1, LW.LineStyle.Solid, true).setData(D.av);
  const simple = S.mode === "simple";
  if (!simple) {
    LW.createSeriesMarkers(vs, C.low.map((t) => ({ time: t, position: "aboveBar", shape: "circle", color: COL.low, size: 0.5 })));
  }
  const pm = [];
  const Bd = x.board || {};
  if (simple) {
    const pos = new Map(C.t.map((t, i) => [t, i]));
    const marks = (list, gap, make) => {
      let lastI = -1e9;
      for (const t of list || []) {
        const i = pos.get(t);
        if (i == null) continue;
        if (i - lastI > gap) pm.push(make(t));
        lastI = i;
      }
    };
    marks(Bd.zone_starts, 15, (t) => ({ time: t, position: "belowBar", shape: "arrowUp", color: COL.buy, text: multi ? "" : "Buy zone", size: multi ? 1 : 1.3 }));
    marks(Bd.late_yellows, 5, (t) => ({ time: t, position: "aboveBar", shape: "arrowDown", color: COL.caution, text: multi ? "" : "Caution", size: multi ? 0.9 : 1.1 }));
    pm.sort((a, b) => a.time < b.time ? -1 : a.time > b.time ? 1 : 0);
  } else for (let i = 0; i < n0; i++)
    if (C.k[i] === "g") pm.push({ time: C.t[i], position: "belowBar", shape: "arrowUp", color: COL.g, text: multi ? "" : "HV", size: multi ? 0.8 : 1 });
  if (T && T.day > C.t[n0 - 1]) {
    if (!simple && T.k === "g") pm.push({ time: T.day, position: "belowBar", shape: "arrowUp", color: COL.g, text: multi ? "" : "HV", size: multi ? 0.8 : 1 });
    pm.push({ time: T.day, position: "aboveBar", shape: "arrowDown", color: "#ffe17a", text: "so far", size: 0.6 });
  }
  if (pm.length) LW.createSeriesMarkers(price, pm);
  const panes = chart.panes();
  [63, 37].forEach((w, i) => panes[i] && panes[i].setStretchFactor(w));
  const lg = [".lg0", ".lg1"].map((s) => box.querySelector(s));
  const place = () => { const h = chart.panes().map((p) => p.getHeight()); lg[0].style.top = "4px"; lg[1].style.top = (h[0] + 5) + "px"; };
  requestAnimationFrame(() => requestAnimationFrame(place));
  const times = D.cs.map((c) => c.time);
  const legend = (i) => {
    i = i == null || i < 0 || i > n - 1 ? n - 1 : i;
    const so = T && i === n - 1 && T.day > C.t[n0 - 1];
    const c = D.cs[i], prev = i > 0 ? D.cs[i - 1].close : null, chg = prev ? 100 * (c.close / prev - 1) : null;
    const k = so ? T.k : C.k[i], rv = so ? T.pace : C.a[i] ? C.v[i] / C.a[i] : null;
    const rt = so ? T.pt : C.rt[i], kb = so ? T.kb : C.kb[i];
    const when = so ? `today ${SOFAR} · ${etTime(T.t)} ET` : `<span class="dim">${dstr(times[i])}</span>`;
    lg[0].innerHTML = `${when} &nbsp;O <b>${fmt(c.open, 2)}</b> H <b>${fmt(c.high, 2)}</b> L <b>${fmt(c.low, 2)}</b> C <b>${fmt(c.close, 2)}</b> <span class="${cls(chg)}">${sgn(chg, 2, "%")}</span>`;
    const isLow = !so && C.low.includes(times[i]);
    const wk = so ? T.wk : (C.wk ? C.wk[i] : null);
    lg[1].innerHTML = S.mode === "simple" ? `Volume <b>${big(D.vs[i].value, false)}</b> ${rvSpan(rv, rt)}${so ? " pace" : ""}` +
      (k === "m" ? ` · <span style="color:${COL.m}">capitulation</span>` : "") +
      (wk != null ? ` · weekly K <span class="${kb === "b" ? "kb" : kb === "l" ? "kl" : ""}">${kFmt(wk)}</span>` : "") :
      `Volume <b>${big(D.vs[i].value, usd())}</b> ${rvSpan(rv, rt)}${so ? " pace" : ""} · ${KNAME[k || ""]}${isLow ? ` · <span style="color:${COL.low}">lowest in a year</span>` : ""}` +
      (wk != null ? ` · weekly K <span class="${kb === "l" ? "kl" : ""}">${kFmt(wk)}</span>` : "");
  };
  legend(null);
  const index = new Map(times.map((t, i) => [t, i]));
  chart.subscribeCrosshairMove((p) => legend(p && p.time ? index.get(typeof p.time === "string" ? p.time :
    `${p.time.year}-${String(p.time.month).padStart(2, "0")}-${String(p.time.day).padStart(2, "0")}`) : null));
  const zset = new Set((x.board && x.board.zone_days) || []);
  const rec = { sym: x.sym, chart, price, n, t: times, box, canvas: box.querySelector(".vpcanvas"),
    vp: simple || S.vp === "off" ? null : x.vp[S.vp], multi, simple,
    zone: simple ? times.map((t, i) => zset.has(t) || (T && i === n - 1 && T.day === t && x.board.state === "buy" && x.board.live) ? 1 : 0) : null };
  chart.timeScale().subscribeVisibleLogicalRangeChange((r) => syncFrom(rec, r));
  new ResizeObserver(() => requestAnimationFrame(place)).observe(box);
  watchVP(rec);
  return rec;
}


function watchVP(rec) {
  let last = "";
  const tick = () => {
    if (rec.dead) return;
    const p = rec.vp, lr = rec.chart.timeScale().getVisibleLogicalRange();
    const key = p ? [rec.price.priceToCoordinate(p.lo), rec.price.priceToCoordinate(p.lo + p.step * p.vol.length),
      rec.chart.timeScale().width(), rec.box.clientWidth, rec.box.clientHeight, rec.chart.panes()[0].getHeight()].join()
      : rec.zone ? [lr ? lr.from.toFixed(2) : "", lr ? lr.to.toFixed(2) : "", rec.box.clientWidth, rec.box.clientHeight].join() : "off";
    if (key !== last) { last = key; drawVP(rec); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function drawVP(rec) {
  const cv = rec.canvas, dpr = window.devicePixelRatio || 1;
  const W = rec.box.clientWidth, H = rec.box.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = W + "px"; cv.style.height = H + "px";
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (rec.zone) {
    const ts = rec.chart.timeScale(), ph0 = rec.chart.panes()[0].getHeight(), pw = ts.width();
    const lr = ts.getVisibleLogicalRange();
    if (lr) {
      const w = Math.max(1, pw / Math.max(1, lr.to - lr.from));
      ctx.fillStyle = "rgba(47,210,122,0.10)";
      for (let i = Math.max(0, Math.floor(lr.from)); i <= Math.min(rec.n - 1, Math.ceil(lr.to)); i++) {
        if (!rec.zone[i]) continue;
        const xc = ts.logicalToCoordinate(i);
        if (xc == null) continue;
        ctx.fillRect(Math.max(0, xc - w / 2), 0, Math.min(w + 0.5, pw), ph0);
      }
    }
  }
  const p = rec.vp;
  if (!p) return;
  const plotW = rec.chart.timeScale().width(), ph = rec.chart.panes()[0].getHeight();
  const y = (v) => rec.price.priceToCoordinate(v);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, plotW, ph); ctx.clip();
  ctx.font = "10.5px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif";
  for (const z of p.zones) {
    const y1 = y(z.hi), y2 = y(z.lo);
    if (y1 == null || y2 == null) continue;
    ctx.fillStyle = "rgba(79,195,247,0.075)";
    ctx.fillRect(0, y1, plotW, y2 - y1);
    ctx.fillStyle = "rgba(79,195,247,0.35)";
    ctx.fillRect(0, y1, plotW, 1); ctx.fillRect(0, y2 - 1, plotW, 1);
    if (y2 - y1 > 14 && !rec.multi) { ctx.fillStyle = "rgba(159,224,255,0.75)"; ctx.fillText(`low-volume zone ${fmt(z.lo, 2)}–${fmt(z.hi, 2)}`, 8, y1 + 13); }
  }
  const maxV = Math.max(...p.vol), len = plotW * (rec.multi ? 0.2 : 0.17);
  const vaLo = p.val, vaHi = p.vah;
  for (let k = 0; k < p.vol.length; k++) {
    const lo = p.lo + k * p.step, hi = lo + p.step;
    const yt = y(hi), yb = y(lo);
    if (yt == null || yb == null || p.vol[k] <= 0) continue;
    const w = len * p.vol[k] / maxV, mid = (lo + hi) / 2;
    const isPoc = mid >= p.poc - p.step / 2 && mid < p.poc + p.step / 2;
    ctx.fillStyle = isPoc ? "rgba(245,166,35,0.75)" : mid >= vaLo && mid <= vaHi ? "rgba(91,141,239,0.42)" : "rgba(91,141,239,0.2)";
    ctx.fillRect(plotW - w, yt + 0.5, w, Math.max(1, yb - yt - 1));
  }
  const yp = y(p.poc);
  if (yp != null) {
    ctx.strokeStyle = "rgba(245,166,35,0.55)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, Math.round(yp) + 0.5); ctx.lineTo(plotW, Math.round(yp) + 0.5); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}
function idxLE(ts, day) {
  let lo = 0, hi = ts.length - 1, ans = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (ts[m] <= day) { ans = m; lo = m + 1; } else hi = m - 1; }
  return ans;
}
function mapIdx(src, dst, x) {
  const a = src.t[src.n - 1] < dst.t[dst.n - 1] ? src.t[src.n - 1] : dst.t[dst.n - 1];
  const is = idxLE(src.t, a), id = idxLE(dst.t, a);
  if (x >= is) return id + (x - is);
  const i = Math.max(0, Math.round(x));
  return Math.max(0, idxLE(dst.t, src.t[i])) + (x - i);
}
function syncFrom(src, r) {
  if (!r || S.view !== "all" || S.syncing) return;
  S.syncing = true;
  for (const c of S.charts) {
    if (c === src || c.dead) continue;
    c.chart.timeScale().setVisibleLogicalRange({ from: mapIdx(src, c, r.from), to: mapIdx(src, c, r.to) });
  }
  S.syncing = false;
}
function applyRanges() {
  const bars = RANGES.find(([k]) => k === S.range)[2];
  for (const c of S.charts) {
    const ts = c.chart.timeScale();
    ts.setVisibleLogicalRange({ from: bars ? Math.max(0, c.n - bars) - 0.5 : -2, to: c.n + 3 });
  }
}
function renderCharts(keep) {
  const saved = keep ? new Map(S.charts.map((c) => {
    const r = c.chart.timeScale().getVisibleLogicalRange();
    return [c.sym, r && { from: r.from - c.n, to: r.to - c.n }];
  })) : null;
  disposeCharts();
  const multi = S.view === "all";
  $("charts").className = multi ? "multi" : "";
  const what = S.mode === "simple" ? "daily candles · green = buy zone · orange ▼ = caution · magenta = capitulation · volume underneath"
    : `daily candles coloured by volume · volume underneath · volume by price on the right (${S.vp === "off" ? "off" : VPNAME[S.vp]})`;
  $("chartsh").innerHTML = multi ? `Charts <span class="h2s">${what}</span>` : `${esc(tk(S.view).name)} · ${S.view} <span class="h2s">${what}</span>`;
  const list = multi ? S.doc.tickers : [tk(S.view)];
  S.charts = list.map((x) => buildChart(x, multi));
  applyRanges();
  if (saved) for (const c of S.charts) { const r = saved.get(c.sym); if (r) c.chart.timeScale().setVisibleLogicalRange({ from: c.n + r.from, to: c.n + r.to }); }
  if (S.mode === "simple") {
    $("key").innerHTML = `<span><span style="color:${COL.buy}">▲</span> Buy zone starts (weekly K washed out)</span>
      <span><span class="sw" style="background:rgba(47,210,122,.35)"></span> days in the buy zone</span>
      <span><span style="color:${COL.caution}">▼</span> Caution: a yellow candle late in the move</span>
      <span><span class="sw m"></span> Capitulation: a sharp fall on very heavy volume</span>
      <span class="dim">Switch "Chart" to Detailed for the volume colours and volume by price</span>`;
    return;
  }
  $("key").innerHTML = `<span><span class="sw y"></span> Yellow: breakout on light volume</span><span><span class="sw g"></span> <span style="color:${COL.g}">▲</span> High-volume breakout</span>
    <span><span class="sw m"></span> Capitulation</span><span><span class="sw l"></span> Light volume</span><span><span class="dot"></span> Lowest volume in a year</span>
    <span><span style="color:#e8eaed">—</span> average volume (past month)</span>
    <span><span style="color:${COL.poc}">┈</span> busiest price · <span style="color:${COL.low}">▒</span> low-volume zone</span>`;
}


function renderVP() {
  const w = S.vp === "off" ? "6m" : S.vp;
  $("vpsub").innerHTML = `last ${VPNAME[w]} of intraday bars`;
  const head = `<tr><th class="l">Ticker</th><th>Price</th><th>Busiest price</th><th>Most volume between</th><th class="l">Low-volume zones (thin = % of the busiest price)</th></tr>`;
  $("vptab").innerHTML = head + S.doc.tickers.map((x) => {
    const p = x.vp[w];
    if (!p) return "";
    const c = x.today ? x.today.c : x.now.c;
    const zs = p.zones.map((z) => {
      const where = z.lo < c && c < z.hi ? "price inside" : z.hi <= c ? sgn(100 * (z.hi / c - 1), 1, "%") : sgn(100 * (z.lo / c - 1), 1, "%");
      return `<span class="pill zone">${fmt(z.lo, 2)}–${fmt(z.hi, 2)} <span class="dim">· ${where} · ${fmt(z.depth, 0)}%</span></span>`;
    }).join(" ");
    return `<tr><td class="l nm">${x.sym}<span class="sub2">${dstr(p.first)} – ${dstr(p.last)}</span></td><td>${fmt(c, 2)}${x.today ? `<span class="sub2">${SOFAR}</span>` : ""}</td>
      <td>${fmt(p.poc, 2)}<span class="sub2 ${cls(c - p.poc)}">${sgn(100 * (c / p.poc - 1), 1, "%")} from price</span></td>
      <td>${fmt(p.val, 2)} – ${fmt(p.vah, 2)}</td><td class="l wrapc">${zs || `<span class="dim">none</span>`}</td></tr>`;
  }).join("");
}


function rvCell(v, t) { return `<td class="c-${rvTier(t)}">${rvSpan(v, t)}</td>`; }
function renderMarket() {
  const M = S.doc.market;
  if (!M) { $("mkttab").innerHTML = ""; return; }
  const head = `<tr><th class="l">Session</th><th>SPY shares</th><th>SPY dollars</th><th>SPY + VOO + IVV</th><th>All US stocks</th>
    <th>QQQ</th><th>IWM</th><th>DIA</th><th class="l">Tags</th></tr>`;
  $("mkttab").innerHTML = head + M.rows.map((r) => {
    const us = r.us_since && (r.us_since === "start" || daysBetween(r.us_since, r.t) > 90)
      ? `<span class="sub2">lowest since ${r.us_since === "start" ? dstr(M.nyse_first) : dstr(r.us_since)}</span>` : "";
    return `<tr><td class="l">${dstr(r.t)}${r.low ? ` <span class="dot" title="SPY's lowest volume in a year"></span>` : ""}</td>
      ${rvCell(r.spy, r.rt.spy)}${rvCell(r.spy_usd, r.rt.spy_usd)}${rvCell(r.trio, r.rt.trio)}
      <td class="c-${rvTier(r.rt.us)}">${rvSpan(r.us, r.rt.us)}<span class="sub2">${big(r.us_shares)} shares</span>${us}</td>
      ${rvCell(r.qqq, r.rt.qqq)}${rvCell(r.iwm, r.rt.iwm)}${rvCell(r.dia, r.rt.dia)}<td class="l wrapc">${tagHtml(r.tags)}</td></tr>`;
  }).join("");
}


function fwdCell(v) { return `<td class="${cls(v)}">${v == null ? `<span class="dim">—</span>` : sgn(v, 1, "%")}</td>`; }
function renderSignals() {
  chips($("fsym"), [["all", "All"]].concat(S.doc.tickers.map((x) => [x.sym, x.sym])), S.fsym, (k) => { S.fsym = k; S.nsig = 40; writeHash(); renderSignals(); });
  chips($("ftyp"), [["all", "All"]].concat(SIGNALS.map((s) => [s, SIGNAME[s]])), S.ftyp, (k) => { S.ftyp = k; S.nsig = 40; writeHash(); renderSignals(); });
  const rows = [];
  for (const x of S.doc.tickers) {
    if (S.fsym !== "all" && x.sym !== S.fsym) continue;
    for (const s of x.signals) if (S.ftyp === "all" || s.types.includes(S.ftyp)) rows.push([x, s]);
  }
  const order = new Map(S.doc.tickers.map((x, i) => [x.sym, i]));
  rows.sort((a, b) => a[1].t < b[1].t ? 1 : a[1].t > b[1].t ? -1 : order.get(a[0].sym) - order.get(b[0].sym));
  $("sigsub").innerHTML = `${fmt(rows.length, 0)} since 2013 · newest first`;
  const head = `<tr><th class="l">Date</th><th class="l">Ticker</th><th class="l">Signal</th><th class="l">Weekly K</th><th>Close</th><th>Volume</th>
    <th class="l">Lowest since</th><th class="l">Tags</th><th>1 week</th><th>1 month</th><th>3 months</th><th>Worst in a month</th><th>High held 2 weeks</th></tr>`;
  $("sigtab").innerHTML = head + rows.slice(0, S.nsig).map(([x, s]) => {
    const since = s.types.includes("lowvol") ? sinceTxt(s.t, s.since, s.since_usd) : [];
    const brk = s.types.includes("yellow") || s.types.includes("breakout");
    const held = brk && s.fwd.held != null ? (s.fwd.held ? `<span class="down">held</span>` : `<span class="up">taken out</span>`) : `<span class="dim">—</span>`;
    return `<tr><td class="l">${dstr(s.t)}</td><td class="l nm">${x.sym}</td><td class="l">${s.types.map((t) => sigPill(t)).join("")}</td>
      <td class="l">${kCell(s.wk, s.late, s.fresh)}</td>
      <td>${fmt(s.c, 2)}<span class="sub2 ${cls(s.ret)}">${sgn(s.ret, 2, "%")}</span></td>
      <td>${vol(s.v, s.c)}<span class="sub2">${rvSpan(s.rv, s.rt)}</span></td>
      <td class="l">${since.length ? since.join("<br>") : `<span class="dim">—</span>`}</td>
      <td class="l wrapc">${tagHtml(s.tags) || `<span class="dim">—</span>`}</td>
      ${fwdCell(s.fwd.w1)}${fwdCell(s.fwd.m1)}${fwdCell(s.fwd.m3)}${fwdCell(s.fwd.dip)}<td>${held}</td></tr>`;
  }).join("");
  $("moreb").style.display = rows.length > S.nsig ? "" : "none";
  $("moreb").onclick = () => { S.nsig += 60; renderSignals(); };
}


function statCells(b, withHeld) {
  const h = (k) => b[k].avg == null ? `<td class="dim">—</td><td class="dim">—</td>` :
    `<td class="${cls(b[k].avg)}">${sgn(b[k].avg, 2, "%")}</td><td>${fmt(b[k].up, 0)}%</td>`;
  return `<td>${fmt(b.n, 0)}</td>${h("w1")}${h("m1")}${h("m3")}<td class="${cls(b.dip)}">${sgn(b.dip, 2, "%")}</td>` +
    `<td>${withHeld && b.held != null ? fmt(b.held, 0) + "%" : `<span class="dim">—</span>`}</td>`;
}
function renderAfter() {
  chips($("asym"), S.doc.tickers.map((x) => [x.sym, x.sym]), S.asym, (k) => { S.asym = k; writeHash(); renderAfter(); });
  const x = tk(S.asym);
  $("aftsub").innerHTML = `${esc(x.name)} · ${x.sym} · one signal per cluster`;
  const head = `<tr><th class="l">Signal</th><th class="l">Period</th><th>Cases</th><th>1 week</th><th>% up</th><th>1 month</th><th>% up</th>
    <th>3 months</th><th>% up</th><th>Worst in a month</th><th>High held 2 weeks</th></tr>`;
  const body = SIGNALS.map((s) => {
    const br = s === "yellow" || s === "breakout";
    const rows = ERAS.map(([k, lab]) => {
      const e = x.summary[s][k];
      let html = `<tr><td class="l">${sigPill(s)}</td><td class="l">${lab.replace("-now", " – now").replace("-", " – ")}</td>${statCells(e.sig, br)}</tr>
        <tr class="ctrl"><td class="l">compared with</td><td class="l">${esc(CTRL[s])}</td>${statCells(e.ctrl, br)}</tr>`;
      const sp = s === "yellow" && x.summary.yellow_split ? x.summary.yellow_split[k] : null;
      if (sp) html += `<tr class="split"><td class="l">· <span class="pill late">Late in the move</span></td><td class="l">yellows late in the move</td>${statCells(sp.late, true)}</tr>
        <tr class="split"><td class="l">· not late in the move</td><td class="l">the other yellows</td>${statCells(sp.early, true)}</tr>
        <tr class="split"><td class="l">· <span class="pill fresh">First breakout out of a correction</span></td><td class="l">yellows</td>${statCells(sp.fresh, true)}</tr>
        <tr class="ctrl"><td class="l">an ordinary day</td><td class="l">every full session</td>${statCells(sp.base, false)}</tr>`;
      return html;
    }).join("");
    return rows;
  }).join("");
  $("afttab").innerHTML = head + body;
}


function renderForward() {
  const R = S.doc.forward;
  $("fwdsec").style.display = R ? "" : "none";
  if (!R) return;
  $("fwdsub").innerHTML = `yellow candles from ${dstr(R.start)}, each logged with its weekly K once the next session has closed, then never
    re-scored · one per cluster in the counts · the late-in-the-move rule was fixed on Oct 17, 2026` +
    (R.stuck ? ` · <span class="down">the record could not be read in the latest build; not updated</span>` : "");
  const cell = (b) => b.avg == null ? `<td class="dim">—</td><td class="dim">—</td>` :
    `<td class="${cls(b.avg)}">${sgn(b.avg, 2, "%")}<span class="sub2">${b.n} so far</span></td><td>${fmt(b.up, 0)}%</td>`;
  const head = `<tr><th class="l">Group</th><th>Clusters</th><th>1 week</th><th>% up</th><th>1 month</th><th>% up</th></tr>`;
  $("fwdsum").innerHTML = head +
    `<tr><td class="l"><span class="pill late">Late in the move</span></td><td>${R.late.n}</td>${cell(R.late.w1)}${cell(R.late.m1)}</tr>` +
    `<tr><td class="l">Not late in the move</td><td>${R.early.n}</td>${cell(R.early.w1)}${cell(R.early.m1)}</tr>`;
  if (!R.rows.length) {
    $("fwdtab").innerHTML = `<tr><td class="l dim">No yellow candles since ${dstr(R.start)} yet.</td></tr>`;
    return;
  }
  const h2 = `<tr><th class="l">Date</th><th class="l">Ticker</th><th class="l">Weekly K</th><th>Close</th><th>Volume</th><th>1 week</th><th>1 month</th></tr>`;
  $("fwdtab").innerHTML = h2 + R.rows.map((e) => `<tr class="${e.dropped ? "dropped" : ""}"><td class="l">${dstr(e.t)}${
      e.dropped ? `<span class="sub2">no longer a yellow after a data fix</span>` : e.repeat ? `<span class="sub2">same cluster as the one before</span>` : ""}</td>
    <td class="l nm">${e.sym}</td><td class="l">${kCell(e.wk, e.late, e.fresh)}</td><td>${fmt(e.c, 2)}</td><td>${rvSpan(e.rv, e.rt)}</td>${fwdCell(e.w1)}${fwdCell(e.m1)}</tr>`).join("");
}


function vintage() {
  const d = S.doc;
  const built = new Date(d.built * 1000).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  $("vint").innerHTML = (d.live ? `Today ${SOFAR} as of ${etTime(d.live.t)} ET${yourTime(d.live.t)}<br>` : "") +
    `Closed sessions to ${dstr(d.asof)}<br>built ${built} ET${yourTime(d.built)}`;
  $("err").innerHTML = "";
}
function render(keep) {
  const syms = S.doc.tickers.map((x) => x.sym);
  if (S.view !== "all" && !syms.includes(S.view)) S.view = "all";
  if (S.fsym !== "all" && !syms.includes(S.fsym)) S.fsym = "all";
  if (!syms.includes(S.asym)) S.asym = syms[0];
  controls(); vintage(); renderBoard(); renderToday(); renderNow(); renderCharts(keep); renderVP(); renderMarket(); renderSignals(); renderAfter(); renderForward();
  ctlH();
}

const GH = /(^|\.)github\.io$/i.test(location.hostname);
const RAW = "https://raw.githubusercontent.com/lawrencekenshin/mii-lab/volume-signals-data/volume-signals/";
let BASE = GH ? RAW : "snap/";
async function getJson(name) {
  let r = await fetch(BASE + name, { cache: "no-cache" }).catch(() => null);
  if ((!r || !r.ok) && BASE !== RAW) { BASE = RAW; r = await fetch(BASE + name, { cache: "no-cache" }).catch(() => null); }
  if (!r || !r.ok) throw new Error("data " + (r ? r.status : "offline"));
  return r.json();
}
async function load(keep) {
  if (S.loading) return;
  S.loading = true;
  try {
    const man = await getJson("manifest.json");
    const doc = await getJson("volume-signals.json");
    doc.built = Date.parse(man.generated_utc) / 1000;
    doc.asof = doc.as_of;
    S.doc = doc;
    S.sha = man.sha256;
    if (!keep) readHash();
    render(keep);
    const anchor = location.hash.slice(1);
    if (!keep && /^[a-z]+$/.test(anchor) && $(anchor)) requestAnimationFrame(() => $(anchor).scrollIntoView());
  } catch (e) {
    $("err").innerHTML = `<div class="err">Could not load the data: ${esc(e.message)}</div>`;
  } finally {
    S.loading = false;
  }
}
async function poll() {
  try {
    if (!S.doc) load(false);
    else {
      const m = await getJson("manifest.json");
      if (m.sha256 && m.sha256 !== S.sha) load(true);
    }
  } catch (e) {  }
  setTimeout(poll, S.doc ? 5 * 60 * 1000 : 30 * 1000);
}
const ctlH = () => document.documentElement.style.setProperty("--ctl", $("ctl").offsetHeight + "px");
window.addEventListener("resize", ctlH);
document.querySelectorAll(".jump a").forEach((a) => a.onclick = (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
  e.preventDefault();
  const el = $(a.getAttribute("href").slice(1));
  if (el) el.scrollIntoView({ behavior: "smooth" });
});
load(false);
setTimeout(poll, 30 * 1000);
