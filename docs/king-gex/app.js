"use strict";


const $ = (s, el = document) => el.querySelector(s);
const HOLI = new Set(["2026-09-07", "2026-11-26", "2026-12-25", "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26",
  "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24"]);
const ADVICE = { PINNED: "hold / sell premium, expect mean-reversion to the king", "AT FLIP": "wait, the regime decides here",
  SUPPORTED: "buy dips into the wall while above the flip", CAPPED: "trim into the wall; a breakout needs it to roll",
  UNSTABLE: "avoid or size small; moves get amplified both ways" };
const C = { king: "#f5d63d", flip: "#b2b5be", res: "#26a69a", sup: "#7fd8cc", air: "#ef5350", up: "#26a69a", dn: "#ef5350",
  sub: "#787b86", grid: "#252936", txt: "#d1d4dc", bg: "#1e222d", sel: "#2a2e39" };
const LEVELS = [["air", "Air pocket", "4 3"], ["sup", "Support", "1 3"], ["res", "Call wall", ""], ["flip", "Flip", "6 4"], ["king", "King", ""]];
const CHIPS = ["SPY", "QQQ", "IWM", "NVDA", "META", "ORCL"];
function openIn(sym) { return ""; }
function wireOpenIn() {}
const S = { idx: [], byS: {}, st: null, sym: null, doc: null, H: [], sel: -1, maps: {}, pend: {}, prof: "net",
  show: load("kt.show", { king: 1, flip: 1, res: 1, sup: 1, air: 1 }), gex: load("kt.gex", 1), lay: null,
  z: { t: null, p: null } };

function load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {  } }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function fm(v) {
  if (v == null) return "–";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  return s + "\u2060$" + (a >= 1e9 ? (a / 1e9).toFixed(2) + "B" : a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e3 ? (a / 1e3).toFixed(0) + "K" : a.toFixed(0));
}
function fk(k) { return k == null ? "–" : String(+(+k).toFixed(2)); }
function fp(x) { return x == null ? "–" : (+x).toFixed(2); }
function pc(x, d = 1) { return x == null || !isFinite(x) ? "–" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(d) + "%"; }
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function pd(s) { return new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))); }
function isoD(d) { return d.toISOString().slice(0, 10); }
function fday(s, dow = true) { const d = pd(s); return (dow ? DOW[d.getUTCDay()] + " " : "") + MON[d.getUTCMonth()] + " " + d.getUTCDate(); }
function e2d(e) { return pd("20" + e.slice(0, 2) + "-" + e.slice(2, 4) + "-" + e.slice(4, 6)); }
function fexp(e, curYear) {
  const d = e2d(e), y = d.getUTCFullYear();
  return MON[d.getUTCMonth()] + " " + d.getUTCDate() + (y !== (curYear || new Date().getUTCFullYear()) ? " '" + String(y).slice(2) : "");
}
function fexpShort(e) { const d = e2d(e); return (d.getUTCMonth() + 1) + "/" + d.getUTCDate() + (e.slice(0, 2) !== "26" ? "/" + e.slice(0, 2) : ""); }
function days(a, b) { return Math.round((b - a) / 864e5); }
function isSession(d) { const w = d.getUTCDay(); return w > 0 && w < 6 && !HOLI.has(isoD(d)); }
function nextSession(s) { const d = pd(s); do { d.setUTCDate(d.getUTCDate() + 1); } while (!isSession(d)); return isoD(d); }
function etFromUTC(ts) {
  if (!ts) return "";
  const d = new Date(ts.replace(" ", "T") + "Z");
  if (isNaN(d)) return "";
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  return f.format(d).replace(",", "") + " ET";
}
const LIVE = location.hostname === "lawrencekenshin.github.io";
const BASE = LIVE ? "https://raw.githubusercontent.com/lawrencekenshin/mii-lab/king-gex-data/king-gex/" : "./snap/";
let BUST = "";
function pubUrl(u) {
  if (u === "api/status") return BASE + "status.json?t=" + Math.floor(Date.now() / 60000);
  return BASE + u.replace(/^data\//, "") + BUST;
}
async function getJSON(u, tries = 3) {
  u = pubUrl(u);

  for (let i = 0; i < tries; i++) {
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 6000);
    try {
      const r = await fetch(i ? u + (u.includes("?") ? "&" : "?") + "r=" + Date.now() : u, { cache: "no-store", signal: ac.signal });
      if (!r.ok) { const e = new Error(u + " " + r.status); e.final = r.status === 404; throw e; }
      return await r.json();
    } catch (e) {
      if (e.final || i === tries - 1) throw e;
    } finally { clearTimeout(timer); }
  }
}


async function init() {
  try { const st0 = await getJSON("api/status"); BUST = "?b=" + Math.round(st0.built_ts || 0); } catch (e) { BUST = ""; }
  try {
    const ix = await getJSON("data/index.json");
    S.idx = ix.names || []; S.st = ix.status || null;
    S.idx.forEach(x => { S.byS[x.s] = x; });
  } catch (e) {
    $("#app").innerHTML = `<div class="empty">The tracker has not been built yet (${esc(e.message)}).</div>`;
    return;
  }
  status();
  chips();
  movedList();
  $("#topBtn").onclick = () => { location.hash = S.topHash || "v=top"; };
  $("#skewBtn").onclick = () => { location.hash = S.skewHash || "v=skew"; };
  $("#pileBtn").onclick = () => { location.hash = S.pileHash || "v=pile"; };
  wireSearch();
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", () => { clearTimeout(S.rz); S.rz = setTimeout(drawChart, 80); });
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
    else if (/^[a-zA-Z]$/.test(e.key)) { const q = $("#q"); q.focus(); q.value = ""; }
  });
  setInterval(refreshStatus, 300000);
  route();
}

function hashArgs() {
  const h = new URLSearchParams(location.hash.slice(1));
  return { s: (h.get("s") || "").toUpperCase(), d: h.get("d") || "", v: h.get("v") || "", l: h.get("l") || "", u: h.get("u") || "", h: h.get("h") || "",
    o: h.get("o") || "", od: +(h.get("od") || 0), x: h.get("x") || "", w: h.get("w") || "", c: h.get("c") || "", al: h.get("al") || "" };
}
function go(sym, d) { const h = "s=" + encodeURIComponent(sym) + (d ? "&d=" + d : ""); if (location.hash.slice(1) !== h) location.hash = h; else route(); }
async function route() {
  const a = hashArgs();
  const skew = a.v === "skew" || a.v === "pile", board = !skew && (a.v === "top" || (!a.s && !a.v));
  $("#topBtn").classList.toggle("on", board);
  $("#skewBtn").classList.toggle("on", a.v === "skew");
  $("#pileBtn").classList.toggle("on", a.v === "pile");
  if (board || skew) { document.querySelectorAll("#chips .chip").forEach(c => c.classList.remove("on")); return skew ? renderSkew(a, a.v === "pile" ? "pile" : "king") : renderTop(a); }
  const sym = S.byS[a.s] ? a.s : S.byS[load("kt.sym", "SPY")] ? load("kt.sym", "SPY") : (S.idx[0] || {}).s;
  if (!sym) { $("#app").innerHTML = `<div class="empty">No names built yet.</div>`; return; }
  if (sym !== S.sym) {
    S.sym = sym; S.doc = null; S.maps = {}; S.z = { t: null, p: null }; save("kt.sym", sym);
    $("#app").innerHTML = `<div class="empty">Loading ${esc(sym)}…</div>`;
    try { S.doc = await getJSON("data/names/" + encodeURIComponent(sym) + ".json"); } catch (e) {
      $("#app").innerHTML = `<div class="empty">${esc(sym)}: ${esc(e.message)}</div>`; return;
    }
    if (S.sym !== sym) return;
    S.H = S.doc.days.concat(S.doc.prov ? [S.doc.prov] : []);
    if (S.doc.latest && S.doc.latest.map) S.maps[S.doc.latest.key] = S.doc.latest.map;
  }
  const i = a.d ? S.H.findIndex(r => r.d === a.d) : -1;
  S.sel = i >= 0 ? i : S.H.length - 1;
  document.querySelectorAll("#chips .chip").forEach(c => c.classList.toggle("on", c.dataset.s === sym));
  document.title = sym + " · King GEX Tracker";
  render();
}
function followSel() {
  if (!S.z.t || !S.H.length) return;
  const i = slots().indexOf(S.H[S.sel].d), n = S.z.t[1] - S.z.t[0];
  if (i >= 0 && i < S.z.t[0]) S.z.t = [i, i + n];
  if (i > S.z.t[1]) S.z.t = [i - n, i];
}
function step(n) {
  if (!S.H.length) return;
  const i = Math.max(0, Math.min(S.H.length - 1, S.sel + n));
  if (i === S.sel) return;
  S.sel = i;
  followSel();
  history.replaceState(null, "", "#s=" + S.sym + (i === S.H.length - 1 ? "" : "&d=" + S.H[i].d));
  render();
}
function pick(i) { S.sel = i; followSel(); history.replaceState(null, "", "#s=" + S.sym + (i === S.H.length - 1 ? "" : "&d=" + S.H[i].d)); render(); }

function chips() {
  $("#chips").innerHTML = CHIPS.filter(s => S.byS[s]).map(s => `<button class="chip" data-s="${s}">${s}</button>`).join("");
  $("#chips").onclick = e => { const b = e.target.closest(".chip"); if (b) go(b.dataset.s); };
}
function wireSearch() {
  const q = $("#q"), L = $("#qlist");
  let hits = [], on = 0;
  const show = () => {
    const t = q.value.trim().toUpperCase();
    if (!t) { L.hidden = true; return; }
    const a = S.idx.filter(x => x.s.startsWith(t)), b = S.idx.filter(x => !x.s.startsWith(t) && (x.n || "").toUpperCase().includes(t));
    hits = a.sort((x, y) => x.s.length - y.s.length || (x.s < y.s ? -1 : 1)).concat(b).slice(0, 14); on = 0;
    L.innerHTML = hits.length ? hits.map((x, i) => `<div data-i="${i}" class="${i === on ? "on" : ""}"><b>${esc(x.s)}</b><span>${esc(x.n || "")}</span></div>`).join("")
      : `<div class="muted" style="cursor:default">No match among ${S.idx.length} names</div>`;
    L.hidden = false;
  };
  const choose = i => { const x = hits[i]; if (!x) return; L.hidden = true; q.value = ""; q.blur(); go(x.s); };
  q.addEventListener("input", show);
  q.addEventListener("keydown", e => {
    if (e.key === "Enter") { choose(on); e.preventDefault(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      on = Math.max(0, Math.min(hits.length - 1, on + (e.key === "ArrowDown" ? 1 : -1)));
      L.querySelectorAll("div[data-i]").forEach(d => d.classList.toggle("on", +d.dataset.i === on)); e.preventDefault();
    } else if (e.key === "Escape") { L.hidden = true; q.value = ""; q.blur(); }
  });
  L.addEventListener("mousedown", e => { const d = e.target.closest("div[data-i]"); if (d) { e.preventDefault(); choose(+d.dataset.i); } });
  q.addEventListener("blur", () => setTimeout(() => { L.hidden = true; }, 150));
}
function movedList() {
  const newest = S.idx.reduce((m, x) => x.d > m ? x.d : m, "");
  const mv = S.idx.filter(x => x.mv != null && x.d === newest && !x.st).sort((a, b) => b.kv - a.kv);
  const btn = $("#movedBtn");
  if (!mv.length) { btn.hidden = true; return; }
  btn.hidden = false;
  btn.textContent = `King moved · ${mv.length}`;
  btn.title = `Names whose king node is on a different strike than the session before (${fday(newest)})`;
  const box = $("#moved");
  box.innerHTML = `<div class="t">King moved on ${fday(newest)} vs the session before — biggest kings first (${mv.length} names)</div><div class="list">` +
    mv.map(x => `<span class="m" data-s="${esc(x.s)}"><b>${esc(x.s)}</b><span class="muted">${fk(x.mv)} →</span> <span class="kg">${fk(x.k)}</span></span>`).join("") + "</div>";
  btn.onclick = () => { box.hidden = !box.hidden; btn.classList.toggle("on", !box.hidden); };
  box.onclick = e => { const m = e.target.closest(".m"); if (m) { go(m.dataset.s); } };
}
function status() {
  const st = S.st || {};
  const age = st.built_ts ? (Date.now() / 1000 - st.built_ts) / 3600 : null;
  $("#status b").className = !st.ok ? "err" : age != null && age > 36 ? "stale" : "";
  const prov = st.provisional ? ` · ${fday(st.provisional.slice(0, 10), false)} evening build` : "";
  $("#status span").textContent = st.ok ? `map ${st.last_snapshot ? fday(st.last_snapshot, false) : "–"}${prov} · built ${st.built || ""}` : "build failed";
}
async function refreshStatus() {
  try {
    const st = await getJSON("api/status");
    if (S.st && st.built_ts && st.built_ts !== S.st.built_ts) {
      $("#status span").textContent = "New data — reload the page";
      $("#status b").className = "stale";
      return;
    }
  } catch (e) { $("#status b").className = "err"; }
}


const LENS = [
  { k: "strong", lab: "Strongest", col: "score",
    def: "The unusual-king score: how much of the map the king holds, how far it towers over the next cell, and how big it is for the stock's trading and against its own recent sessions." },
  { k: "sticky", lab: "Sticky", col: "held",
    def: "Sessions in a row with the king on the same strike (any expiry), holding a real share of the map. Longest first, then the bigger share." },
  { k: "build", lab: "Building", col: "oi",
    def: "Open interest piling up at the king contract over the last week of settles, with a large part of it new. Ranked by the new GEX against the stock's $ volume." },
  { k: "far", lab: "Far magnets", col: "away",
    def: "Well away from the price but still within reach by its own expiry, with a big share of the map. Ranked by share × dominance." },
  { k: "pin", lab: "Pinning", col: "share",
    def: "Right at the price and expiring within days — the PINNED zone. Ranked by share of the map." },
];
const NEG = {
  strong: { def: "The negative-king score: how much of the map the biggest − cell holds, how far it towers over the next − cell, and how big it is for the stock's trading and against its own recent sessions." },
  sticky: { def: "Sessions in a row with the negative king on the same strike (any expiry), holding a real share of the map. Longest first, then the bigger share." },
  build: { def: "Open interest piling up at the negative-king contract over the last week of settles, with a large part of it new. Ranked by the new GEX against the stock's $ volume." },
  far: { lab: "Far pockets", def: "A big short-gamma cell well away from the price but still within reach by its own expiry: if price gets there, moves tend to speed up. Ranked by share × dominance." },
  pin: { lab: "Close by", def: "Right at the price and expiring within days — short gamma where moves get amplified. Ranked by share of the map." },
};
const UNIV = [["combo", "Combined", "S&P 500 + Nasdaq-100 + watchlist"], ["spx", "S&P 500", "S&P 500 members"], ["ndx", "QQQ", "Nasdaq-100 members"],
  ["wl", "Watchlist", "Watchlist 1"], ["ai", "AI Companies", "the AI companies list"],
  ["iwb", "IWB", "Russell 1000 members with saved chains"],
  ["iwm", "IWM", "Russell 2000 members with enough options trading"],
  ["total", "Total", "every name on the tracker"]].map(([k, lab, tip]) => [k, lab, r => (r.uni || ["total"]).includes(k), tip]);
const HOR = [["any", "Any expiry", () => true], ["near", "≤ 2 weeks", r => r.dte <= 14], ["far", "2 weeks +", r => r.dte > 14]];
const TOPN = 30;
const SETUP_ORD = { PINNED: 0, "AT FLIP": 1, SUPPORTED: 2, CAPPED: 3, UNSTABLE: 4 };

const COLS = [
  ["rk", "#", "", r => r._rk, 1, "back to the ranking's own order"],
  ["name", "Name", "l", r => r.s, 1, "ticker A–Z"],
  ["px", "Price", "", r => r.px, -1, "share price"],
  ["king", "King", "l", r => r.dte, 1, "days to the king's expiry (strikes can't be compared across names)"],
  ["away", "Away", "", r => r.dist, -1, "distance from the price; click again for the furthest below"],
  ["gex", "GEX", "", r => Math.abs(r.v), -1, "the king's GEX per 1% move (size, either sign)"],
  ["share", "Share", "", r => r.share, -1, "the king's share of the whole map"],
  ["next", "× next", "", r => r.dom, -1, "how many times bigger than the next + cell"],
  ["move", "King vs price · 12 sessions", "l", r => r._mv, -1, "the price move over these 12 sessions"],
  ["held", "Held", "", r => r.held, -1, "sessions in a row on the same strike"],
  ["oi", "OI added 5d", "", r => r.add, -1, "contracts added at the king over the last 5 settles"],
  ["cp", "Calls : puts", "l", r => r.cp && r.cp[0] + r.cp[1] > 0 ? cpShare(r.cp) : null, -1, "calls' share of all open contracts (shown, not used for ranking)"],
  ["biz", "Business", "l", r => r.biz, -1, "the business score, 0–100 (shown, not used for ranking)"],
  ["setup", "Setup", "l", r => r.setup ? SETUP_ORD[r.setup] : 9, 1, "PINNED → AT FLIP → SUPPORTED → CAPPED → UNSTABLE"],
  ["score", "Score", "", r => r.score, -1, "the unusual-king score (the Strongest ranking)"],
];

const kf = n => { const a = Math.abs(n); return (n < 0 ? "−" : "") + (a >= 1e6 ? (a / 1e6).toFixed(1) + "M" : a >= 1e4 ? (a / 1e3).toFixed(0) + "k" : a >= 1e3 ? (a / 1e3).toFixed(1) + "k" : String(a)); };
const cpShare = c => c[0] / (c[0] + c[1]);
const cpWk = c => c[2] != null && c[2] + c[3] > 0 ? c[2] / (c[2] + c[3]) : null;
function cpLab(c) {
  const sh = cpShare(c), x = sh >= 0.5 ? c[0] / Math.max(c[1], 1) : c[1] / Math.max(c[0], 1), t = x >= 9.95 ? x.toFixed(0) : x.toFixed(1);
  return sh >= 0.55 ? `<b class="up">${t}× calls</b>` : sh <= 0.45 ? `<b class="dn">${t}× puts</b>` : `<b class="cpe">${t}× even</b>`;
}
function cpBar(c, cls = "") {
  const sh = cpShare(c), wk = cpWk(c);
  return `<i class="cpb ${cls}"><b style="width:${(sh * 100).toFixed(1)}%"></b><em></em>${wk == null ? "" : `<s style="left:${(wk * 100).toFixed(1)}%"></s>`}</i>`;
}
function cpMove(c, pre = "1W ") {
  const wk = cpWk(c);
  if (wk == null) return `<span class="cpw muted">${pre}n/a</span>`;
  const d = (cpShare(c) - wk) * 100;
  if (Math.abs(d) < 1) return `<span class="cpw muted">${pre}=</span>`;
  return `<span class="cpw ${d > 0 ? "up" : "dn"}">${d > 0 ? "▲" : "▼"}${Math.abs(d).toFixed(0)}pt</span>`;
}
function cpTip(c, r) {
  const wk = cpWk(c);
  return `${kf(c[0])} calls vs ${kf(c[1])} puts open (every strike and expiry), ${Math.round(cpShare(c) * 100)}% calls` +
    (wk == null ? "" : ` · ${r.settle5 ? fday(r.settle5, false) : "a week ago"} (same expiries) ${Math.round(wk * 100)}% calls: calls ${c[0] - c[2] >= 0 ? "+" : "−"}${kf(Math.abs(c[0] - c[2]))}, puts ${c[1] - c[3] >= 0 ? "+" : "−"}${kf(Math.abs(c[1] - c[3]))}`);
}
function cpCell(r) {
  const c = r.cp;
  if (!c || c[0] + c[1] <= 0) return '<span class="muted">–</span>';
  return `<div class="cp" title="${esc(cpTip(c, r))}"><div class="cpt">${cpLab(c)}${cpMove(c)}</div>${cpBar(c)}</div>`;
}
const bizCls = v => v >= 70 ? "hi" : v >= 50 ? "mid" : "lo";
function bizCell(r) {
  if (r.biz == null) return `<span class="muted">${r.typ === "etf" ? "fund" : "–"}</span>`;
  return `<span class="bz ${bizCls(r.biz)}" title="business score ${r.biz}/100 (shown, not used for ranking)"><i><b style="width:${r.biz}%"></b></i><span class="num">${r.biz}</span></span>`;
}
function duo(r) {
  const c = r.cp && r.cp[0] + r.cp[1] > 0 ? r.cp : null, b = r.biz, cls = b == null ? "lo" : bizCls(b);
  const cp = `<div class="pk"><div class="pkh"><span>Calls : puts</span>${c ? `<span>${Math.round(cpShare(c) * 100)}% calls</span>` : ""}</div>` +
    (c ? `<div class="pkv"><span>${cpLab(c)}</span>${cpMove(c)}</div>${cpBar(c, "wide")}` : '<div class="pkv"><span class="muted">n/a</span></div>') + "</div>";
  const bz = `<div class="pk"><div class="pkh"><span>Business</span>${b == null ? "" : `<span class="bzt ${cls}">${cls === "hi" ? "strong" : cls === "mid" ? "middling" : "weak"}</span>`}</div>` +
    `<div class="pkv">${b == null ? `<span class="muted">${r.typ === "etf" ? "fund" : "no score"}</span>` : `<span><b class="bzt ${cls}">${b}</b><span class="muted"> /100</span></span>`}</div>` +
    (b == null ? "" : `<span class="bz ${cls}"><i><b style="width:${b}%"></b></i></span>`) + "</div>";
  return `<div class="duo">${cp}${bz}</div>`;
}

function cpHistCard(doc) {
  const h = doc.cp;
  if (!h || h.c + h.p <= 0) return `<div class="card2"><h4><span>Calls : puts</span></h4><div class="muted">No open-interest data for ${esc(doc.sym)}.</div></div>`;
  const sh = h.c / (h.c + h.p), now = [h.c, h.p];
  const line = (lab, b) => {
    if (!b) return `<span class="muted">${lab}</span><span class="muted">no data that far back</span><span></span><span></span>`;
    const c = [h.c, h.p, b[1], b[2]], wk = cpWk(c), d = wk == null ? null : (sh - wk) * 100;
    const tip = `${fday(b[0], false)} settle (expiries still open now): ${kf(b[1])} calls vs ${kf(b[2])} puts, ${wk == null ? "–" : Math.round(wk * 100) + "% calls"} · since then calls ${h.c - b[1] >= 0 ? "+" : "−"}${kf(Math.abs(h.c - b[1]))}, puts ${h.p - b[2] >= 0 ? "+" : "−"}${kf(Math.abs(h.p - b[2]))}`;
    return `<span title="${esc(tip)}">${lab} <span class="muted">${fday(b[0], false)}</span></span>${cpBar(c, "wide")}<span class="r">${wk == null ? "–" : Math.round(wk * 100) + "%"}</span>` +
      `<span class="r ${d == null || Math.abs(d) < 1 ? "muted" : d > 0 ? "up" : "dn"}">${d == null ? "" : Math.abs(d) < 1 ? "=" : (d > 0 ? "▲" : "▼") + Math.abs(d).toFixed(0) + "pt"}</span>`;
  };
  return `<div class="card2"><h4><span>Calls : puts</span><span class="muted">open contracts · every strike and expiry · ${fday(h.settle, false)} settle</span></h4>
    <div class="cpnow">${cpBar(now.concat([null, null]), "wide big")}<div class="cpnl">${cpLab(now)}<span class="muted">${kf(h.c)} calls vs ${kf(h.p)} puts · ${Math.round(sh * 100)}% calls</span></div></div>
    <div class="cpg"><span class="muted h">vs</span><span class="muted h">calls' share now · white tick = then</span><span class="muted h r">then</span><span class="muted h r">change</span>
      ${line("1 day", h.back["1"])}${line("5 days", h.back["5"])}${line("10 days", h.back["10"])}</div>
    <div class="cnote">Green = calls' share, red = puts'. A look-back counts only the expiries still open today. One contract = 100 shares, whatever its price.</div></div>`;
}
const BIZLAB = { rev_yoy: "Revenue YoY", eps_yoy: "EPS YoY", peg: "PEG", fcf_growth: "FCF growth", fcf_margin: "FCF margin", rev_qoq: "Revenue QoQ" };
function bizCard(doc) {
  const b = doc.biz;
  if (!b) return `<div class="card2"><h4><span>Business</span><span class="muted">${doc.fund ? "fund" : "no score"}</span></h4>
    <div class="cnote">${doc.fund ? "Funds have no business score." : "Fewer than 4 of the 6 numbers are reported for this company."}</div></div>`;
  const cls = bizCls(b.score), order = ["rev_yoy", "eps_yoy", "peg", "fcf_growth", "fcf_margin", "rev_qoq"];
  const val = (k, v) => v == null ? (k === "peg" && b.peg_note ? (b.peg_note === "loss" ? "loss" : "EPS falling") : "n/a") : k === "peg" ? (+v).toFixed(2) : (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%";
  const rows = order.map(k => (b.m || []).find(x => x[0] === k)).filter(Boolean).map(([k, , w, v, p]) =>
    `<span>${BIZLAB[k]}</span><span class="num r">${val(k, v)}</span><i class="pbar"><b class="${p == null ? "lo" : bizCls(p)}" style="width:${p ?? 0}%"></b></i><span class="num r">${p == null ? "–" : Math.round(p)}</span>`).join("");
  const cap = b.mcap ? (b.mcap >= 1e12 ? "$" + (b.mcap / 1e12).toFixed(2) + "T" : "$" + (b.mcap / 1e9).toFixed(b.mcap >= 1e11 ? 0 : 1) + "B") : null;
  return `<div class="card2"><h4><span>Business</span><span class="muted">shown, not used for ranking</span></h4>
    <div class="bzbig"><b class="bzt ${cls}">${b.score}</b><span class="muted">/100</span><span class="bz wide ${cls}"><i><b style="width:${b.score}%"></b></i></span><span class="bzt ${cls}">${cls === "hi" ? "strong" : cls === "mid" ? "middling" : "weak"}</span></div>
    <div class="bzgrid"><span class="muted h">Number</span><span class="muted h r">Value</span><span class="muted h">vs S&amp;P + NDX</span><span class="muted h r">pctl</span>${rows}</div>
    <div class="cnote">${cap ? cap + " market cap · " : ""}each number ranked against the S&amp;P 500 + Nasdaq-100 (0 = worst, 100 = best; lower PEG is better); the score combines all six.</div></div>`;
}
function sortRows(list, col, dir) {
  const f = col[3];
  return list.slice().sort((a, b) => {
    const x = f(a), y = f(b);
    if (x == null || y == null) return x == null ? (y == null ? a._rk - b._rk : 1) : -1;
    const c = typeof x === "string" ? x.localeCompare(y) : x - y;
    return c ? c * dir : a._rk - b._rk;
  });
}

async function renderTop(a) {
  const want = location.hash;
  if (!S.top) {
    $("#app").innerHTML = `<div class="empty">Loading the rankings…</div>`;
    try { S.top = await getJSON("data/top.json"); } catch (e) { if (location.hash === want) $("#app").innerHTML = `<div class="empty">Rankings not built yet (${esc(e.message)}).</div>`; return; }
    if (location.hash !== want) return;
  }
  a = Object.assign({}, a, { h: HOR.some(x => x[0] === a.h) ? a.h : "" });
  const neg = a.x === "neg", side = neg ? "&x=neg" : "";
  const lab = l => (neg && NEG[l.k].lab) || l.lab, ldef = l => neg ? NEG[l.k].def : l.def, kc = neg ? "kn" : "kg";
  document.title = (neg ? "Top negative kings" : "Top kings") + " · King GEX Tracker";

  const hDef = l => a.h || (l.k === "pin" ? "any" : "far");
  const lens = LENS.find(l => l.k === a.l) || LENS[0], u = UNIV.find(x => x[0] === a.u) || UNIV[0], h = HOR.find(x => x[0] === hDef(lens)) || HOR[0];
  S.topHash = location.hash.slice(1) || "v=top";
  const rows = (neg ? S.top.nrows : S.top.rows) || [], bk = neg ? "nby" : "by";
  const bySym = S.top[bk] || (S.top[bk] = Object.fromEntries(rows.map(r => [r.s, r])));
  const order = (l, hh, uu) => (S.top.orders[(neg ? "neg:" : "") + l.k + "|" + hh] || []).map(x => bySym[x]).filter(r => r && uu[2](r));
  const list = order(lens, h[0], u);
  list.forEach((r, i) => {
    r._rk = i + 1;
    const sp = (r.spark || []).filter(p => p[2] != null);
    r._mv = sp.length >= 2 ? sp[sp.length - 1][2] / sp[0][2] - 1 : null;
  });

  const col = COLS.find(c => c[0] === a.o && c[0] !== "rk"), dir = col ? (a.od === 1 || a.od === -1 ? a.od : col[4]) : 1;
  const top = S.topAll ? list : list.slice(0, TOPN), shown = col ? sortRows(top, col, dir) : top;
  const keep = col ? `&o=${col[0]}&od=${dir}` : "";
  const link = (l, uu, hh, k = "", sd = side) => `#v=top&l=${l}&u=${uu}${hh ? "&h=" + hh : ""}${sd}${k}`;
  const sideSw = `<span class="side"><a class="${neg ? "" : "on"}" href="${link(lens.k, u[0], a.h, "", "")}">+ Kings</a><a class="${neg ? "on neg" : ""}" href="${link(lens.k, u[0], a.h, "", "&x=neg")}">− Kings</a></span>`;
  const tabs = LENS.map(l => `<a class="lens ${l === lens ? "on" : ""}" href="${link(l.k, u[0], a.h)}">${lab(l)}<span class="c">${order(l, hDef(l), u).length}</span></a>`).join("");
  const uc = UNIV.map(x => `<a class="chip ${x === u ? "on" : ""}" href="${link(lens.k, x[0], a.h, keep)}" title="${esc(x[3])}">${x[1]}<span class="c">${order(lens, h[0], x).length}</span></a>`).join("");
  const hc = HOR.map(x => `<a class="chip ${x === h ? "on" : ""}" href="${link(lens.k, u[0], x[0], keep)}">${x[1]}</a>`).join("");
  const sortNote = col ? `<span class="sortnote">Sorted by <b>${esc(col[1])}</b> ${dir < 0 ? "▼" : "▲"} · <a href="${link(lens.k, u[0], a.h)}">back to the ${esc(lab(lens))} ranking</a></span>` : "";
  const th = c => {
    const on = col ? col[0] === c[0] : c[0] === "rk", ar = on ? `<span class="ar">${c[0] === "rk" ? "" : dir < 0 ? "▼" : "▲"}</span>` : "";
    return `<th class="sortable ${c[2]}${hl(c[0])}${on && c[0] !== "rk" ? " on" : ""}" data-o="${c[0]}" title="Sort by ${esc(c[5])}">${esc(c[1])}${ar}</th>`;
  };
  const sel = `<span class="psort">Sort <select id="tsort">${COLS.map(c => `<option value="${c[0]}" ${(col ? col[0] : "rk") === c[0] ? "selected" : ""}>${c[0] === "rk" ? esc(lab(lens)) + " ranking" : esc(c[1])}</option>`).join("")}</select>` +
    (col ? `<button id="tflip" class="chip" title="Flip the order">${dir < 0 ? "▼" : "▲"}</button>` : "") + `</span>`;
  const hl = c => c === lens.col ? " hl" : "";
  const ds = {}; rows.forEach(r => { ds[r.d + "|" + r.src] = (ds[r.d + "|" + r.src] || 0) + 1; });
  const [dd, src] = Object.entries(ds).sort((x, y) => y[1] - x[1])[0][0].split("|");
  const when = `${fday(dd)} close` + (src !== "bot" ? ` · evening build (open interest from the ${fday(S.top.settles[S.top.settles.length - 1], false)} settle)` : " · the daily map");
  const trs = shown.map((r, i) => `<tr data-s="${esc(r.s)}">
      <td class="rk">${r._rk}</td><td class="l"><b class="tk">${esc(r.s)}</b><div class="nm">${esc(r.n || "")}</div></td>
      <td>${fp(r.px)}</td>
      <td class="l"><b class="${kc}">${fk(r.k)}</b> <span class="muted">${fexp(r.exp)}</span><div class="sm">${r.dte} days</div></td>
      <td class="${hl("away")}">${pc(r.dist)}<div class="sm">${r.sig != null ? r.sig.toFixed(1) + "σ" : ""}</div></td>
      <td>${fm(r.v)}</td><td class="${hl("share")}">${((r.share || 0) * 100).toFixed(0)}%</td><td>${(r.dom || 0) >= 99 ? (neg ? "only −" : "only +") : (r.dom || 0).toFixed(1) + "×"}</td>
      <td class="l sp"><div class="spw">${spark(r.spark, 120, 28, neg ? C.dn : C.king)}<span class="sm ${r._mv > 0 ? "up" : r._mv < 0 ? "dn" : ""}">${r._mv == null ? "" : pc(r._mv)}</span></div></td>
      <td class="${hl("held")}">${r.held}<div class="sm">since ${fday(r.since, false)}</div></td>
      <td class="${hl("oi")}">${r.add == null ? "<span class='muted'>–</span>" : (r.add >= 0 ? "+" : "−") + Math.abs(r.add).toLocaleString()}<div class="sm">${r.fresh != null && r.add > 0 ? Math.round(r.fresh * 100) + "% new" : ""}</div></td>
      <td class="l">${cpCell(r)}</td><td class="l">${bizCell(r)}</td>
      <td class="l">${r.setup ? `<span class="tag ${r.setup.replace(" ", "")}">${r.setup}</span>` : ""}</td>
      <td class="${hl("score")}">${r.score != null ? r.score.toFixed(0) : ""}</td></tr>`).join("");
  const cards = shown.map((r, i) => `<div class="kc" data-s="${esc(r.s)}"><div class="r1"><span class="rk">${r._rk}</span><b class="tk">${esc(r.s)}</b><span class="muted">${fp(r.px)}</span>
      <span class="kgv"><b class="${kc}">${fk(r.k)}</b> ${fexp(r.exp)}</span></div>
      <div class="r2"><span>${pc(r.dist)}${r.sig != null ? " · " + r.sig.toFixed(1) + "σ" : ""}</span><span>${fm(r.v)} · ${((r.share || 0) * 100).toFixed(0)}% of map</span>
      <span>held ${r.held}</span>${r.add != null && r.add > 0 ? `<span>+${r.add.toLocaleString()} OI</span>` : ""}${r.setup ? `<span class="tag ${r.setup.replace(" ", "")}">${r.setup}</span>` : ""}</div>
      <div class="r3">${spark(r.spark, 300, 30, neg ? C.dn : C.king)}<span class="lm ${neg ? "dn" : ""}">${lensVal(lens, r)}</span></div>${duo(r)}</div>`).join("");
  $("#app").innerHTML = `<div class="tophead"><span class="t">${neg ? "Top negative king nodes" : "Top king nodes"}</span>${sideSw}<span class="muted">${when} · ${list.length} of ${rows.length} names · click a name to open its tracker</span></div>
    <div class="lenses">${tabs}</div><div class="ldef">${esc(ldef(lens))}</div>
    <div class="filters">${uc}<span class="sep"></span>${hc}${sortNote}${sel}</div>
    ${list.length ? `<div class="tw"><table class="hist topt"><thead><tr>${COLS.map(th).join("")}</tr></thead>
      <tbody>${trs}</tbody></table></div><div class="cards">${cards}</div>` : `<div class="empty">No names fit ${esc(lab(lens))} with these filters.${lens.k === "pin" && h[0] === "far" ? ` ${esc(lab(lens))} kings expire within days — pick Any expiry or ≤ 2 weeks.` : ""}</div>`}
    ${list.length > TOPN ? `<div class="more"><button id="moreBtn" class="nav">${S.topAll ? `Show top ${TOPN}` : `Show all ${list.length}`}</button></div>` : ""}`;
  const open = e => { const t = e.target.closest("[data-s]"); if (t) { S.backTop = S.topHash; go(t.dataset.s); } };
  $("#app").querySelectorAll("tbody, .cards").forEach(el => { el.onclick = open; });
  if ($("#moreBtn")) $("#moreBtn").onclick = () => { S.topAll = !S.topAll; renderTop(a); };
  const sortBy = (k, d) => {
    const h2 = link(lens.k, u[0], a.h, k === "rk" ? "" : `&o=${k}&od=${d}`);
    history.replaceState(null, "", h2);
    renderTop(hashArgs());
  };
  const thead = $("#app thead");
  if (thead) thead.onclick = e => {
    const t = e.target.closest("th[data-o]"); if (!t) return;
    const c = COLS.find(x => x[0] === t.dataset.o);
    sortBy(c[0], col && col[0] === c[0] ? -dir : c[4]);
  };
  $("#tsort").onchange = e => { const c = COLS.find(x => x[0] === e.target.value); sortBy(c[0], c[4]); };
  if ($("#tflip")) $("#tflip").onclick = () => sortBy(col[0], -dir);
}
function lensVal(l, r) {
  if (l.k === "strong") return `score ${r.score.toFixed(0)}`;
  if (l.k === "sticky") return `${r.held} sessions on ${fk(r.k)}`;
  if (l.k === "build") return `+${(r.add || 0).toLocaleString()} contracts · ${Math.round((r.fresh || 0) * 100)}% new`;
  if (l.k === "far") return `${pc(r.dist)} · ${r.sig.toFixed(1)}σ`;
  return `${((r.share || 0) * 100).toFixed(0)}% of map · ${r.dte}d`;
}


const SKWIN = [["1d", "1 day"], ["1w", "1 week"], ["2w", "2 weeks"], ["1m", "1 month"], ["tape", "Tape"]];
const SIDEW = { C: "calls", P: "puts" };
const skAligned = (r, c) => c === "C" ? r.dist > 0 : r.dist < 0;
const SKCOLS = [
  ["rk", "#", "", r => r._rk, 1, "back to the match order"],
  ["name", "Name", "l", r => r.s, 1, "ticker A–Z"],
  ["px", "Price", "", r => r.px, -1, "share price"],
  ["skew", "Skew", "l", r => r._pct, -1, "the tilt: calls minus puts opened (each net of closes), as a share of the name's open interest"],
  ["opened", "Opened", "l", r => r._one, -1, "the heavy side's share of all contracts opened"],
  ["srank", "Skew rank", "", r => r._sp, 1, "place on the Skew Tracker's list"],
  ["king", "King", "l", r => r.dte, 1, "days to the king's expiry (strikes can't be compared across names)"],
  ["away", "Away", "", r => r.dist, -1, "distance from the price; click again for the furthest below"],
  ["share", "Share", "", r => r.share, -1, "the king's share of the whole map"],
  ["held", "Held", "", r => r.held, -1, "sessions in a row on the same strike"],
  ["kscore", "King score", "", r => r.score, -1, "the unusual-king score (the Strongest ranking)"],
  ["cp", "Calls : puts", "l", r => r.cp && r.cp[0] + r.cp[1] > 0 ? cpShare(r.cp) : null, -1, "calls' share of all open contracts"],
  ["biz", "Business", "l", r => r.biz, -1, "the business score, 0–100"],
  ["match", "Match", "", r => r._m, -1, "skew rank and king score together"],
];
function skWhen(sk, w) {
  if (w === "tape") return sk.tape ? `${fday(sk.tape.T)} tape` : "";
  const x = sk.windows[w];
  return x ? `${x.n} settle${x.n > 1 ? "s" : ""} ${fday(x.frm, false)}${x.n > 1 ? " → " + fday(x.to, false) : ""}` : "";
}
function skDef(sk, w, c, neg, pile) {
  const side = SIDEW[c], kn = neg ? "− king (the biggest dealers-short cell on the map)" : "+ king (the biggest + cell on the map)";
  const what = w === "tape"
    ? `Names where most of the contracts that must be new on ${sk.tape ? fday(sk.tape.T) : "the newest session"} (volume above the open interest before it) were ${side} — read before that session's open interest settles.`
    : `Names the Skew Tracker ranks as opening mostly ${side} over ${skWhen(sk, w)}: calls minus puts opened (each net of closes) as a share of the name's own open interest, with the opens one-sided too.`;
  if (pile) return `${what} Each is paired with its biggest positive-GEX pile on this tracker: the narrow band of strikes holding the most positive net GEX (calls + puts at each strike, every expiry a few days out or more). Match = the place on the skew list and the pile's size against the stock's daily $ volume as percentiles, combined so both have to be high.`;
  return `${what} Each is paired with its ${kn} on this tracker. Match = the place on the skew list and the king's score (the Strongest ranking) as percentiles, combined so both have to be high.`;
}
function skewCell(r, c) {
  const w = r._sw, side = SIDEW[c];
  if (!w) return '<span class="muted">–</span>';
  if (r._tape) {
    const n = w[c === "C" ? "fC" : "fP"], top = ((w.top || {})[c] || []).slice(0, 3);
    const tip = top.map(t => `${fexp(t[0])} ${fk(t[1])}${c}: ${t[3].toLocaleString()} traded vs ${t[4].toLocaleString()} open → ${t[2].toLocaleString()} must be new`).join("\n");
    return `<div title="${esc(tip)}"><b class="${c === "C" ? "up" : "dn"}">+${kf(n)} ${side}</b> <span class="sm">must be new</span><div class="sm">${Math.round(r._pct * 100)}% of open interest</div></div>`;
  }
  const days = w.cov ? w.cov[0] : 1, lean = w.tilt ? w.tilt[c === "C" ? 0 : 1] : null;
  const sg = n => (n >= 0 ? "+" : "−") + kf(Math.abs(n)), hv = c === "C" ? w.nC : w.nP, ov = c === "C" ? w.nP : w.nC;
  const tags = [];
  if (w.bs === "bought" || w.bs === "sold" || w.bs === "mixed")
    tags.push(`<span class="tag bs ${w.bs}" title="Where the opened contracts last printed: at the ask = bought, at the bid = sold">${side} ${w.bs}</span>`);
  if (w.spr) tags.push(`<span class="tag spr" title="${esc(`${fexp(w.spr[0])} ${fk(w.spr[1])} / ${fk(w.spr[2])}${c}: two lines of near-equal size (${kf(w.spr[3])} contracts) make up most of the opens`)}">spread?</span>`);
  const tip = (hv != null ? `Opened net of closes: calls ${sg(w.nC)}, puts ${sg(w.nP)}. ` : "") +
    `Calls − puts = ${sg(w.net)} contracts, ${Math.round(r._pct * 100)}% of the name's open interest` +
    (days > 1 && lean != null ? ` · leaning to ${side} on ${lean} of the ${days} days with a reading` : "");
  return `<div title="${esc(tip)}">` + (hv != null
      ? `<b class="${c === "C" ? "up" : "dn"}">${sg(hv)} ${side}</b> <span class="sm">${sg(ov)} ${c === "C" ? "puts" : "calls"}</span>`
      : `<b class="${c === "C" ? "up" : "dn"}">${sg(Math.abs(w.net))}</b> <span class="sm">net toward ${side}</span>`) +
    `<div class="sm">tilt ${Math.round(r._pct * 100)}% of open interest${days > 1 && lean != null ? ` · ${lean} of ${days} days` : ""}</div>` +
    (tags.length ? `<div class="tgs">${tags.join("")}</div>` : "") + "</div>";
}
function openedCell(r, c) {
  const w = r._sw;
  if (!w) return '<span class="muted">–</span>';
  const a = r._tape ? [w.fC, w.fP] : [w.aC, w.aP];
  if (!(a[0] + a[1] > 0)) return '<span class="muted">–</span>';
  const tip = r._tape ? `${kf(w.fC)} calls vs ${kf(w.fP)} puts must be new (${kf(w.vC)} calls / ${kf(w.vP)} puts traded)`
    : `${kf(w.aC)} calls vs ${kf(w.aP)} puts opened · ${kf(w.cC || 0)} calls / ${kf(w.cP || 0)} puts closed`;
  return `<div class="cp" title="${esc(tip)}"><div class="cpt"><b class="${c === "C" ? "up" : "dn"}">${Math.round(r._one * 100)}% ${SIDEW[c]}</b></div>${cpBar(a.concat([null, null]))}</div>`;
}
function srankCell(r) {
  const w = r._sw || {}, N = r._sn;
  let mv = "";
  if (!r._tape && w.t20n > 1) mv = w.pr == null ? ' <span class="sm am">new</span>'
    : w.pr > r._sp ? ` <span class="sm up">▲${w.pr - r._sp}</span>` : w.pr < r._sp ? ` <span class="sm dn">▼${r._sp - w.pr}</span>` : "";
  const sub = !r._tape && w.t20n ? `top 20 on ${w.t20} of ${w.t20n}` : `of ${N}`;
  return `#${r._sp}${mv}<div class="sm" title="${!r._tape && w.t20n ? `Days in the Skew Tracker's top 20 over its last ${w.t20n} settles` : ""}">${sub}</div>`;
}

const PILECOLS = [
  ["pile", "Pile", "l", r => r.dte, 1, "days to the expiry holding most of the pile"],
  ["away", "Away", "", r => r.dist, -1, "the pile's centre vs the price; click again for the furthest below"],
  ["pgex", "Pile GEX", "", r => r.pile.v, -1, "the pile's GEX per 1% move"],
  ["pvol", "vs $ volume", "", r => r.pile.x, -1, "the pile's GEX against the stock's daily $ volume"],
  ["pshare", "Share", "", r => r.pile.share, -1, "the pile's share of all positive GEX on the map"],
  ["kin", "King", "l", r => r.pile.kin ? 0 : 1, 1, "king inside the pile first"],
];
const pileCols = () => SKCOLS.slice(0, 6).concat(PILECOLS, SKCOLS.slice(11));
function pileRange(p) { return p.lo === p.hi ? fk(p.lo) : `${fk(p.lo)}–${fk(p.hi)}`; }
async function renderSkew(a, mode = "king") {
  const want = location.hash;
  if (!S.top || !S.skew) {
    $("#app").innerHTML = `<div class="empty">Loading the skew rankings…</div>`;
    try {
      const [t, s] = await Promise.all([S.top || getJSON("data/top.json"), S.skew || getJSON("data/skew.json")]);
      S.top = t; S.skew = s;
    } catch (e) { if (location.hash === want) $("#app").innerHTML = `<div class="empty">Skew rankings not built yet (${esc(e.message)}).</div>`; return; }
    if (location.hash !== want) return;
  }
  a = Object.assign({}, a, { x: a.x === "pos" || a.x === "neg" ? a.x : "" });
  const sk = S.skew, pile = mode === "pile", V = pile ? "pile" : "skew", COLS_ = pile ? pileCols() : SKCOLS;
  const c = a.c === "P" ? "P" : "C", neg = !pile && (a.x ? a.x === "neg" : c === "P");
  const w = SKWIN.some(x => x[0] === a.w) && (a.w !== "tape" || sk.tape) ? a.w : "1w";
  const u = UNIV.find(x => x[0] === a.u) || UNIV[0], h = HOR.find(x => x[0] === a.h) || HOR[0], al = a.al === "1";
  document.title = (pile ? "Skew × Pile" : "Skew × King") + " · King GEX Tracker";
  S[V + "Hash"] = location.hash.slice(1) || "v=" + V;
  const krows = (neg ? S.top.nrows : S.top.rows) || [];
  const by = ng => S.top[ng ? "nby" : "by"] || (S.top[ng ? "nby" : "by"] = Object.fromEntries(((ng ? S.top.nrows : S.top.rows) || []).map(r => [r.s, r])));
  const N = (ww, cc) => ww === "tape" ? (sk.tape ? sk.tape["n" + cc] : 0) : (sk.windows[ww] || {})["n" + cc] || 0;
  const order = (ww, cc, uu, hh, aa, ng = neg) => (sk.orders[(pile ? "pile" : ng ? "neg" : "pos") + "|" + ww + "|" + cc] || []).map(([s, m, sp]) => {
    const k = by(ng)[s], sw = (sk.rows[s] || {})[ww];
    if (!k || !sw || (pile && !k.pile)) return null;
    const tape = ww === "tape", one = tape ? [sw.fC, sw.fP] : [sw.aC, sw.aP], heavy = one[cc === "C" ? 0 : 1];
    return Object.assign({}, k, pile ? { dist: k.pile.dist, dte: k.pile.dte, _kd: k.dist } : {}, { _m: m, _sp: sp, _sn: N(ww, cc), _sw: sw, _tape: tape,
      _pct: tape ? (sw.bk ? heavy / sw.bk : null) : Math.abs(sw.pct), _one: one[0] + one[1] > 0 ? heavy / (one[0] + one[1]) : null });
  }).filter(r => r && uu[2](r) && hh[2](r) && (!aa || skAligned(r, cc)));
  const list = order(w, c, u, h, al);
  list.forEach((r, i) => { r._rk = i + 1; });
  const col = COLS_.find(x => x[0] === a.o && x[0] !== "rk"), dir = col ? (a.od === 1 || a.od === -1 ? a.od : col[4]) : 1;
  const top = S.skAll ? list : list.slice(0, TOPN), shown = col ? sortRows(top, col, dir) : top;
  const keep = col ? `&o=${col[0]}&od=${dir}` : "";
  const link = (o = {}) => {
    const p = Object.assign({ w, c, x: pile ? "" : a.x, u: u[0], h: h[0], al: al ? "1" : "" }, o);
    return "#v=" + V + "&w=" + p.w + "&c=" + p.c + (p.x ? "&x=" + p.x : "") + "&u=" + p.u + (p.h !== "any" ? "&h=" + p.h : "") + (p.al ? "&al=1" : "") + (p.k || "");
  };
  const cnt = (ww, cc, uu = u, hh = h, aa = al, ng = neg) => order(ww, cc, uu, hh, aa, ng).length;

  const sideSw = `<span class="side"><a class="${c === "C" ? "on call" : ""}" href="${link({ c: "C", x: "" })}">Call skew<span class="c">${cnt(w, "C", u, h, al, false)}</span></a>` +
    `<a class="${c === "P" ? "on put" : ""}" href="${link({ c: "P", x: "" })}">Put skew<span class="c">${cnt(w, "P", u, h, al, !pile)}</span></a></span>`;
  const kingSw = pile ? "" : `<span class="side"><a class="${neg ? "" : "on"}" href="${link({ x: "pos", k: keep })}">+ Kings</a><a class="${neg ? "on neg" : ""}" href="${link({ x: "neg", k: keep })}">− Kings</a></span>`;
  const tabs = SKWIN.filter(x => x[0] !== "tape" || sk.tape).map(x => `<a class="lens ${x[0] === w ? "on" : ""}" href="${link({ w: x[0], k: keep })}" title="${esc(skWhen(sk, x[0]))}">${x[0] === "tape" ? esc(fday(sk.tape.T)) + " tape" : x[1]}<span class="c">${cnt(x[0], c)}</span></a>`).join("");
  const uc = UNIV.map(x => `<a class="chip ${x === u ? "on" : ""}" href="${link({ u: x[0], k: keep })}" title="${esc(x[3])}">${x[1]}<span class="c">${cnt(w, c, x)}</span></a>`).join("");
  const hc = HOR.map(x => `<a class="chip ${x === h ? "on" : ""}" href="${link({ h: x[0], k: keep })}" title="${pile ? "by the expiry holding most of the pile" : "by the king's expiry"}">${x[1]}</a>`).join("");
  const what = pile ? "Pile" : "King";
  const alc = `<a class="chip ${al ? "on" : ""}" href="${link({ al: al ? "" : "1", k: keep })}" title="${c === "C" ? `Calls: the ${what.toLowerCase()} above the price` : `Puts: the ${what.toLowerCase()} below the price`}">${what} on the skew's side<span class="c">${cnt(w, c, u, h, true)}</span></a>`;
  const sortNote = col ? `<span class="sortnote">Sorted by <b>${esc(col[1])}</b> ${dir < 0 ? "▼" : "▲"} · <a href="${link()}">back to the match order</a></span>` : "";
  const hl = k => k === "match" ? " hl" : "";
  const th = x => {
    const on = col ? col[0] === x[0] : x[0] === "rk", ar = on ? `<span class="ar">${x[0] === "rk" ? "" : dir < 0 ? "▼" : "▲"}</span>` : "";
    return `<th class="sortable ${x[2]}${hl(x[0])}${on && x[0] !== "rk" ? " on" : ""}" data-o="${x[0]}" title="Sort by ${esc(x[5])}">${esc(x[1])}${ar}</th>`;
  };
  const sel = `<span class="psort">Sort <select id="tsort">${COLS_.map(x => `<option value="${x[0]}" ${(col ? col[0] : "rk") === x[0] ? "selected" : ""}>${x[0] === "rk" ? "Match order" : esc(x[1])}</option>`).join("")}</select>` +
    (col ? `<button id="tflip" class="chip" title="Flip the order">${dir < 0 ? "▼" : "▲"}</button>` : "") + `</span>`;
  const ds = {}; (list.length ? list : krows).forEach(r => { ds[r.d + "|" + r.src] = (ds[r.d + "|" + r.src] || 0) + 1; });
  const [dd, src] = (Object.entries(ds).sort((x, y) => y[1] - x[1])[0] || ["|"])[0].split("|");
  const kWhen = dd ? `${pile ? "piles" : "kings"} ${fday(dd)} close${src !== "bot" ? " (evening build)" : ""}` : "";
  const kc = neg ? "kn" : "kg", all = (sk.orders[(pile ? "pile" : neg ? "neg" : "pos") + "|" + w + "|" + c] || []).length;
  const ali = r => skAligned(r, c) ? `<div class="sm al">${c === "C" ? "above ✓" : "below ✓"}</div>` : `<div class="sm">${!pile && r.sig != null ? r.sig.toFixed(1) + "σ" : ""}</div>`;
  const kingTds = r => `<td class="l"><b class="${kc}">${fk(r.k)}</b> <span class="muted">${fexp(r.exp)}</span><div class="sm">${r.dte} days</div></td>
      <td>${pc(r.dist)}${ali(r)}</td><td>${((r.share || 0) * 100).toFixed(0)}%</td>
      <td>${r.held}<div class="sm">since ${fday(r.since, false)}</div></td><td>${r.score != null ? r.score.toFixed(0) : ""}</td>`;
  const pileTds = r => { const p = r.pile; return `<td class="l" title="${esc(`${p.n} strike${p.n > 1 ? "s" : ""} with positive net GEX between ${fk(p.lo)} and ${fk(p.hi)}, centre ${fk(p.c)}`)}"><b class="kg">${pileRange(p)}</b>` +
      `${p.ex ? ` <span class="muted">${fexp(p.ex)}</span><div class="sm">${p.dte} days · ${Math.round((p.exs || 0) * 100)}% of the pile</div>` : ""}</td>
      <td>${pc(r.dist)}${ali(r)}</td><td>${fm(p.v)}</td><td>${(p.x * 100).toFixed(1)}%</td><td>${Math.round(p.share * 100)}%</td>
      <td class="l"><b class="kg">${fk(r.k)}</b> <span class="muted">${fexp(r.exp)}</span><div class="sm ${p.kin ? "al" : ""}">${p.kin ? "in the pile ✓" : "outside · " + pc(r._kd)}</div></td>`; };
  const trs = shown.map(r => `<tr data-s="${esc(r.s)}">
      <td class="rk">${r._rk}</td><td class="l"><b class="tk">${esc(r.s)}</b><div class="nm">${esc(r.n || "")}</div></td>
      <td>${fp(r.px)}</td><td class="l">${skewCell(r, c)}</td><td class="l">${openedCell(r, c)}</td><td>${srankCell(r)}</td>
      ${pile ? pileTds(r) : kingTds(r)}
      <td class="l">${cpCell(r)}</td><td class="l">${bizCell(r)}</td><td class="hl"><b>${r._m.toFixed(0)}</b></td></tr>`).join("");
  const cards = shown.map(r => `<div class="kc" data-s="${esc(r.s)}"><div class="r1"><span class="rk">${r._rk}</span><b class="tk">${esc(r.s)}</b><span class="muted">${fp(r.px)}</span>
      <span class="kgv">${pile ? `<b class="kg">${pileRange(r.pile)}</b> ${r.pile.ex ? fexp(r.pile.ex) : ""}` : `<b class="${kc}">${fk(r.k)}</b> ${fexp(r.exp)}`}</span></div>
      <div class="r2 skr">${skewCell(r, c)}<span class="sk2">#${r._sp} on the list</span></div>
      <div class="r2">${pile
        ? `<span>pile ${pc(r.dist)}${skAligned(r, c) ? ` <b class="up">✓</b>` : ""}</span><span>${fm(r.pile.v)}</span><span>${(r.pile.x * 100).toFixed(1)}% of $ vol</span><span>${Math.round(r.pile.share * 100)}% of + GEX</span><span>king ${r.pile.kin ? "in it" : "outside"}</span>`
        : `<span>king ${pc(r.dist)}${skAligned(r, c) ? ` <b class="up">✓</b>` : ""}</span><span>${((r.share || 0) * 100).toFixed(0)}% of map</span><span>held ${r.held}</span><span>score ${r.score != null ? r.score.toFixed(0) : "–"}</span>`}
      <span class="lm">match ${r._m.toFixed(0)}</span></div>${duo(r)}</div>`).join("");
  $("#app").innerHTML = `<div class="tophead"><span class="t">${pile ? "Skew × Pile" : "Skew × King"}</span>${sideSw}${kingSw}<span class="muted">skew ${esc(skWhen(sk, w))} · ${esc(kWhen)} · ${list.length} of ${N(w, c)} on the Skew Tracker list${all < N(w, c) ? ` (${N(w, c) - all} with no current ${pile ? "pile" : "king"})` : ""} · click a name to open its tracker</span></div>
    <div class="lenses">${tabs}</div><div class="ldef">${esc(skDef(sk, w, c, neg, pile))}</div>
    <div class="filters">${uc}<span class="sep"></span>${hc}<span class="sep"></span>${alc}${sortNote}${sel}</div>
    ${list.length ? `<div class="tw"><table class="hist topt skt"><thead><tr>${COLS_.map(th).join("")}</tr></thead>
      <tbody>${trs}</tbody></table></div><div class="cards">${cards}</div>` : `<div class="empty">No names fit these filters.</div>`}
    ${list.length > TOPN ? `<div class="more"><button id="moreBtn" class="nav">${S.skAll ? `Show top ${TOPN}` : `Show all ${list.length}`}</button></div>` : ""}`;
  const open = e => { const t = e.target.closest("[data-s]"); if (t) { S.backTop = S[V + "Hash"]; go(t.dataset.s); } };
  $("#app").querySelectorAll("tbody, .cards").forEach(el => { el.onclick = open; });
  if ($("#moreBtn")) $("#moreBtn").onclick = () => { S.skAll = !S.skAll; renderSkew(a, mode); };
  const sortBy = (k, d) => {
    history.replaceState(null, "", link({ k: k === "rk" ? "" : `&o=${k}&od=${d}` }));
    renderSkew(hashArgs(), mode);
  };
  const thead = $("#app thead");
  if (thead) thead.onclick = e => {
    const t = e.target.closest("th[data-o]"); if (!t) return;
    const x = COLS_.find(y => y[0] === t.dataset.o);
    sortBy(x[0], col && col[0] === x[0] ? -dir : x[4]);
  };
  $("#tsort").onchange = e => { const x = COLS_.find(y => y[0] === e.target.value); sortBy(x[0], x[4]); };
  if ($("#tflip")) $("#tflip").onclick = () => sortBy(col[0], -dir);
}
function spark(sp, W = 120, Hh = 28, col = C.king) {
  const pts = (sp || []).filter(p => p[1] != null || p[2] != null);
  if (pts.length < 2) return "";
  const vals = pts.flatMap(p => [p[1], p[2]]).filter(v => v != null), lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || hi * 0.01 || 1;
  const n = sp.length, x = i => 2 + i * (W - 6) / (n - 1), y = v => Hh - 3 - (v - lo) / span * (Hh - 6);
  let price = "", king = "", pi = -1;
  sp.forEach((p, i) => {
    if (p[2] != null) price += (price ? " L" : "M") + x(i).toFixed(1) + "," + y(p[2]).toFixed(1);
    if (p[1] != null) {
      const yy = y(p[1]).toFixed(1);
      king += (pi === i - 1 && king ? ` L${x(i).toFixed(1)},${king.split(",").pop()} L${x(i).toFixed(1)},${yy}` : `${king ? " M" : "M"}${x(i).toFixed(1)},${yy}`);
      pi = i;
    }
  });
  const last = sp[n - 1];
  return `<svg class="spk" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><path d="${price}" fill="none" stroke="#787b86" stroke-width="1.2"/>` +
    `<path d="${king}" fill="none" stroke="${col}" stroke-width="1.8"/>` + (last && last[1] != null ? `<circle cx="${x(n - 1).toFixed(1)}" cy="${y(last[1]).toFixed(1)}" r="2.4" fill="${col}"/>` : "") + `</svg>`;
}


function lvl(r, key) {
  if (!r) return null;
  if (key === "king") return r.k ? r.k[0] : null;
  if (key === "flip") return r.fl;
  const v = r[key];
  return v ? v[0] : null;
}
function mapKey(r) { return r.src === "eve" ? r.d + "-eve" : r.src === "ext" ? r.d + "-ext" : r.d; }
function prevFresh(i) { for (let j = i - 1; j >= 0; j--) if (!S.H[j].stale && S.H[j].k) return S.H[j]; return null; }
function heldInfo(i) {
  const r = S.H[i]; if (!r || !r.k) return null;
  let n = 0, first = r.d;
  for (let j = i; j >= 0; j--) { const x = S.H[j]; if (x.stale) continue; if (!x.k || x.k[0] !== r.k[0]) break; n++; first = x.d; }
  return { n, first };
}
function partialMap(r) {
  const cells = r.cells || [], top = r.top || [];
  const ks = [...new Set(cells.map(c => c[1]).concat(top.map(t => t[0])))].sort((a, b) => a - b);
  const exps = [...new Set(cells.map(c => c[0]))].sort();
  const ki = new Map(ks.map((k, i) => [k, i])), ei = new Map(exps.map((e, i) => [e, i]));
  const net = new Map(top.map(t => [t[0], t[1]]));
  return { partial: true, d: r.d, src: r.src, spot: r.sp || r.c, ks, exps, cells: cells.map(c => [ki.get(c[1]), ei.get(c[0]), c[2]]),
    net: ks.map(k => net.has(k) ? net.get(k) : null), king: r.k, tr: r.tr, fl: r.fl, res: r.res, sup: r.sup, air: r.air, tot: r.tot, today: nextSession(r.d) };
}
function curMap() {
  const r = S.H[S.sel]; if (!r) return null;
  const key = mapKey(r);
  if (S.doc.maps.includes(key)) {
    if (S.maps[key]) return S.maps[key];
    if (!S.pend[key]) {
      const sym = S.sym;
      S.pend[key] = getJSON(`data/maps/${key}/${encodeURIComponent(sym)}.json`).then(m => {
        if (S.sym === sym) { S.maps[key] = m; drawChart(); }
      }).catch(() => { if (S.sym === sym) { S.maps[key] = partialMap(r); drawChart(); } }).finally(() => { delete S.pend[key]; });
    }
    return { loading: true, ...partialMap(r) };
  }
  if (!r.cells && !(r.top || []).length) return null;
  return partialMap(r);
}
function sigma(r, today) {
  if (!r || !r.k || !r.iv) return null;
  const S0 = r.sp || r.c, T = days(pd(today || nextSession(r.d)), e2d(r.k[1])) / 365;
  if (!S0 || T <= 0) return null;
  return Math.log(r.k[0] / S0) / (r.iv * Math.sqrt(T));
}


function render() {
  const r = S.H[S.sel], doc = S.doc;
  if (!r) { $("#app").innerHTML = `<div class="empty">${esc(S.sym)}: no saved sessions.</div>`; return; }
  const last = S.sel === S.H.length - 1, p = prevFresh(S.sel);
  const px = r.c, chg = p && p.c ? r.c / p.c - 1 : null;
  const back = S.backTop ? `<a class="back" href="#${esc(S.backTop)}">← ${S.backTop.startsWith("v=skew") ? "Skew × King" : S.backTop.startsWith("v=pile") ? "Skew × Pile" : "Top kings"}</a>` : "";
  const head = `<div id="head">${back}<span class="tk">${esc(doc.sym)}</span><span class="nm">${esc(doc.name || "")}</span>
    <span class="px num">${fp(px)}</span><span class="ch num ${chg > 0 ? "up" : chg < 0 ? "dn" : "muted"}">${chg == null ? "" : pc(chg, 2)}</span>
    <span class="muted">${fday(r.d)} close${last ? "" : " · <b style='color:#ff9800'>past session</b>"}</span>${openIn(doc.sym)}</div>`;
  $("#app").innerHTML = head + `<div class="when">${whenLine(r)}</div>` + tiles(r, p) + `<div class="cards2">${cpHistCard(doc)}${bizCard(doc)}</div>` +
    `<div id="chart"><div class="top"><span class="ttl">King node by session → map of the selected day</span>
      <button id="gexBtn" class="tg ${S.gex ? "on" : ""}" title="Net GEX by strike for the selected day, drawn on the price chart"><svg width="13" height="11" viewBox="0 0 13 11"><rect x="5" y="0" width="8" height="2.4" fill="#26a69a"/><rect x="1" y="4.3" width="12" height="2.4" fill="#f5d63d"/><rect x="7" y="8.6" width="6" height="2.4" fill="#ef5350"/></svg>GEX overlay</button>${legend()}
      ${zoomBar()}<span class="seg" id="profSeg"><button data-m="net" class="${S.prof === "net" ? "on" : ""}">Net</button><button data-m="cp" class="${S.prof === "cp" ? "on" : ""}">Calls · Puts</button></span></div>
      <div id="svgwrap"><div id="tip"></div></div>
      <div class="daybar"><button class="nav" id="prevD" ${S.sel === 0 ? "disabled" : ""}>◀</button><button class="nav" id="nextD" ${last ? "disabled" : ""}>▶</button>
      <span class="lbl">${fday(r.d)} · <b>${r.src === "bot" ? "the daily map" : "evening build"}</b></span><span class="note" id="mapNote"></span>
      <span class="zhint">scroll = zoom price · shift+scroll = zoom sessions · drag = move · double-click = reset</span>
      ${last ? "" : `<button class="nav" id="lastD">Latest ▶▶</button>`}</div></div>` +
    table() + how();
  wireOpenIn();
  $("#prevD").onclick = () => step(-1);
  $("#nextD").onclick = () => step(1);
  if ($("#lastD")) $("#lastD").onclick = () => pick(S.H.length - 1);
  $("#chart .top").onclick = e => {
    const gb = e.target.closest("#gexBtn");
    if (gb) { S.gex = S.gex ? 0 : 1; save("kt.gex", S.gex); gb.classList.toggle("on", !!S.gex); drawChart(); return; }
    const lg = e.target.closest(".lg");
    if (lg) { S.show[lg.dataset.k] = S.show[lg.dataset.k] ? 0 : 1; save("kt.show", S.show); lg.classList.toggle("off", !S.show[lg.dataset.k]); drawChart(); }
    const zr = e.target.closest("#zoomc [data-r]");
    if (zr) { setRange(zr.dataset.r); return; }
    if (e.target.closest("#zIn")) { const r0 = S.H[S.sel]; zoomPrice(0.75, r0.sp || r0.c || (S.lay.lo + S.lay.hi) / 2); return; }
    if (e.target.closest("#zOut")) { const r0 = S.H[S.sel]; zoomPrice(1 / 0.75, r0.sp || r0.c || (S.lay.lo + S.lay.hi) / 2); return; }
    if (e.target.closest("#zReset")) { S.z = { t: null, p: null }; redraw(); return; }
    const b = e.target.closest("#profSeg button");
    if (b) { S.prof = b.dataset.m; document.querySelectorAll("#profSeg button").forEach(x => x.classList.toggle("on", x === b)); drawChart(); }
  };
  $("#hist tbody").onclick = e => { const tr = e.target.closest("tr[data-i]"); if (tr) pick(+tr.dataset.i); };
  drawChart();
  zoomUI();
}

function whenLine(r) {
  const parts = [];
  if (r.src === "ext") {
    parts.push(`<b>Evening build</b>: priced at the ${fday(r.d, false)} close with open interest from the previous settle. ${esc(S.doc.sym)} is outside the daily scan, so this is rebuilt from saved end-of-day chains (Russell 1000 / 2000 members), the same maths, from Sep 25.`);
  } else if (r.src === "eve") {
    const pv = S.H.length > 1 ? S.H[S.H.length - 2].d : null;
    parts.push(`<b>Evening build</b>: priced at the ${fday(r.d, false)} close, but open interest is still the ${pv ? fday(pv, false) : "previous"} settle ` +
      `(new open interest posts before the next open). The daily map for ${fday(r.d, false)} replaces this at ~07:45 ET on ${fday(nextSession(r.d))}.`);
  } else {
    const m = S.maps[mapKey(r)];
    const built = "";
    const pre = r.sp && r.c && Math.abs(r.sp / r.c - 1) > 0.0005;
    parts.push(`<b>The daily map</b> for the ${fday(r.d, false)} session: ` + (pre ? `priced at ${fp(r.sp)} (the pre-market print the map used then, not the ${fp(r.c)} close)`
      : "official close") + ` + ${fday(r.d, false)} open interest` + (built ? ` · chain built ${esc(built)}` : "") + ".");
  }
  if (r.stale) parts.push(`<span class="warn">Stale chain on this day: the option chain had not been rebuilt for this name, so open interest is a settle older than the rest of that day's maps.</span>`);
  return parts.join(" ");
}

function tiles(r, p) {
  const px = r.sp || r.c, k = r.k, hi = heldInfo(S.sel);
  const sg = sigma(r, (S.maps[mapKey(r)] || {}).today);
  let held = "";
  if (hi && hi.n > 1) held = `Same strike for <b>${hi.n}</b> sessions (since ${fday(hi.first, false)})`;
  else if (p && p.k && k && p.k[0] !== k[0]) held = `Moved from <b>${fk(p.k[0])}</b> (${fexp(p.k[1])}) on ${fday(r.d, false)}`;
  else if (p && p.k && k && p.k[1] !== k[1]) held = `Same strike, rolled from ${fexp(p.k[1])}`;
  else held = "First session on file";
  const kd = k && px ? k[0] / px - 1 : null;
  const king = k ? `<div class="tile king wide"><div class="k"><i style="background:${C.king}"></i>King node</div>
    <div class="v num kg">${fk(k[0])} <small>${fexp(k[1])}</small></div>
    <div class="s num">${fm(k[2])} · ${pc(kd)} from price${sg != null ? ` · ${Math.abs(sg).toFixed(1)}σ by expiry` : ""}<br>${held}<br>
    ${r.conc != null ? `${(r.conc * 100).toFixed(0)}% of the map · ${r.dom >= 99 ? "only + cell" : (r.dom || 0).toFixed(1) + "× the next"}` : ""}</div></div>`
    : `<div class="tile"><div class="k">King node</div><div class="v muted">none</div></div>`;
  const longG = (r.nas || 0) > 0;
  const fl = r.fl, fd = fl && px ? fl / px - 1 : null;
  const flip = `<div class="tile"><div class="k"><i style="background:${C.flip}"></i>Flip</div>
    <div class="v num">${fl ? fk(fl) : "<small>none in range</small>"} ${fd != null ? `<small>${pc(fd)}</small>` : ""}</div>
    <div class="s">${longG ? `<b class="up">Long gamma</b> — price ${fl ? "above the flip" : "in + territory"}: dealers sell rips and buy dips, moves tend to shrink`
      : `<b class="dn">Short gamma</b> — price ${fl ? "below the flip" : "in − territory"}: dealers chase moves, swings get bigger both ways`}</div></div>`;
  const wall = (lab, col, v, what) => `<div class="tile"><div class="k"><i style="background:${col}"></i>${lab}</div>
    <div class="v num">${v ? fk(v[0]) + ` <small>${pc(v[0] / px - 1)}</small>` : "<small>none</small>"}</div>
    <div class="s">${v ? fm(v[1]) + " · " : ""}${what}</div></div>`;
  const res = wall("Call wall above", C.res, r.res, "biggest + strike above the price, all expiries added up");
  const below = `<div class="tile"><div class="k"><i style="background:${C.sup}"></i>Below the price</div>
    <div class="v num">${r.sup ? fk(r.sup[0]) + ` <small>${pc(r.sup[0] / px - 1)} support</small>` : "<small>no + wall below</small>"}</div>
    <div class="s">${r.sup ? fm(r.sup[1]) + " + wall · " : ""}${r.air ? `<b style="color:${C.air}">air pocket ${fk(r.air[0])}</b> (${pc(r.air[0] / px - 1)}, ${fm(r.air[1])}): moves speed up there` : "no − pocket below"}</div></div>`;
  const st = r.setup;
  const setup = `<div class="tile"><div class="k">Setup</div>
    <div class="v">${st ? `<span class="tag ${st.replace(" ", "")}" style="font-size:15px;padding:2px 8px">${st}</span>` : "<small>none</small>"}</div>
    <div class="s">${st ? esc(ADVICE[st] || "") : "nothing close to the price, not at the flip"}</div></div>`;
  return `<div class="tiles">${king}${flip}${res}${below}${setup}</div>`;
}

function legend() {
  return LEVELS.slice().reverse().map(([k, lab, dash]) => {
    const col = C[k];
    return `<button class="lg ${S.show[k] ? "" : "off"}" data-k="${k}"><i style="border-color:${col};${dash ? "border-top-style:dashed" : ""}${k === "king" ? ";border-top-width:3px" : ""}"></i>${lab}</button>`;
  }).join("");
}

function table() {
  const rows = [];
  for (let i = S.H.length - 1; i >= 0; i--) {
    const r = S.H[i], p = prevFresh(i), px = r.sp || r.c;
    const chg = p && p.c ? r.c / p.c - 1 : null;
    const notes = [];
    if (r.src === "eve") notes.push(`<span class="tag eve">evening build</span>`);
    if (r.stale) notes.push("stale chain");
    if (p && p.k && r.k && !r.stale) {
      if (p.k[0] !== r.k[0]) notes.push(`<span class="moved">king ${fk(p.k[0])} → ${fk(r.k[0])}</span>`);
      else if (p.k[1] !== r.k[1]) notes.push(`rolled to ${fexp(r.k[1])}`);
      if (p.fl && r.fl) {
        const a = p.c >= p.fl, b = r.c >= r.fl;
        if (a !== b) notes.push(b ? "crossed above flip" : "fell below flip");
      }
    }
    const g = (r.nas || 0) > 0;
    rows.push(`<tr data-i="${i}" class="${i === S.sel ? "sel" : ""} ${r.stale ? "stale" : ""}">
      <td class="l">${fday(r.d)}</td><td>${fp(r.c)}</td><td class="${chg > 0 ? "up" : chg < 0 ? "dn" : ""}">${chg == null ? "" : pc(chg, 1)}</td>
      <td class="kc">${r.k ? fk(r.k[0]) : "–"}</td><td class="l muted">${r.k ? fexp(r.k[1]) : ""}</td><td>${r.k ? fm(r.k[2]) : ""}</td>
      <td>${r.k && px ? pc(r.k[0] / px - 1) : ""}</td><td>${r.conc != null ? (r.conc * 100).toFixed(0) + "%" : ""}</td>
      <td>${fk(r.fl)}</td><td class="${g ? "up" : "dn"}">${g ? "long" : "short"}</td>
      <td>${r.res ? fk(r.res[0]) : "–"}</td><td>${r.sup ? fk(r.sup[0]) : "–"}</td><td style="color:${C.air}">${r.air ? fk(r.air[0]) : "–"}</td>
      <td class="l">${r.setup ? `<span class="tag ${r.setup.replace(" ", "")}">${r.setup}</span>` : ""}</td><td class="l">${notes.join(" · ")}</td></tr>`);
  }
  return `<div class="sec">Every saved session <small>newest first · click a row to load that day's map</small></div>
    <div class="tw"><table class="hist" id="hist"><thead><tr><th class="l">Session</th><th>Close</th><th>Chg</th><th>King</th><th class="l">Expiry</th>
    <th>GEX</th><th>Away</th><th>Share</th><th>Flip</th><th>Gamma</th><th>Call wall</th><th>Support</th><th>Air</th><th class="l">Setup</th><th class="l">What changed</th></tr></thead>
    <tbody>${rows.join("")}</tbody></table></div>`;
}

function how() {
  return `<div class="how">
    <p><b>King node</b> = the single biggest + cell on the map (one strike, one expiry, leaving out contracts about to expire), exactly as the daily GEX scan reports it. The gold line steps from session to session; the dot size is how big the king was that day.</p>
    <p><b>Flip</b> = the price where dealers' total gamma turns from − to +. Above it the market tends to calm down and drift toward big + strikes; below it, moves get amplified.
    <b>Call wall</b> / <b>support</b> = the biggest + strike above / at or below the price, with every expiry added up. <b>Air pocket</b> = the most − strike below the price.</p>
    <p><b>The map</b> shows GEX per 1% move for every strike × expiry (green +, red −; brighter = bigger). The gold box is the king. The right-hand bars add each strike up across expiries.
    The newest ${S.doc && S.doc.maps.length > 1 ? S.doc.maps.length + " sessions have" : "session has"} the full map; earlier sessions show the 12 biggest strikes, added up across expiries.</p>
    <p>Built from end-of-day option chains: open interest updated once a day, Black-Scholes gamma at the official close. Calls count +, puts −.</p></div>`;
}


function niceTicks(lo, hi, n) {
  const span = hi - lo, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const st = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(+v.toFixed(6));
  return out;
}
function slots() {
  const a = S.H[0].d, b = S.H[S.H.length - 1].d, out = [];
  const d = pd(a);
  while (isoD(d) <= b) { if (isSession(d)) out.push(isoD(d)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
function visSlots() {
  const all = slots();
  if (!S.z.t) return all;
  const a = Math.max(0, Math.min(S.z.t[0], all.length - 1)), b = Math.max(a, Math.min(S.z.t[1], all.length - 1));
  return all.slice(a, b + 1);
}
function domain(map) {



  if (S.z.p) return S.z.p;
  const vis = new Set(visSlots()), rows = S.H.filter(r => vis.has(r.d));
  const last = S.H[S.H.length - 1], ref = last.c || last.sp, v = [];
  (rows.length ? rows : S.H).forEach(r => {
    [r.c, r.hi, r.lo].forEach(x => { if (x) v.push(x); });
    LEVELS.forEach(([k]) => {
      const x = lvl(r, k), lim = k === "king" ? 0.25 : 0.10;
      if (S.show[k] && x && Math.abs(x / ref - 1) <= lim) v.push(x);
    });
  });
  if (map && map.spot) v.push(map.spot);
  let lo = Math.min(...v), hi = Math.max(...v);
  const pad = (hi - lo) * 0.06 || hi * 0.02;
  return [lo - pad, hi + pad];
}

function drawChart() {
  const wrap = $("#svgwrap"); if (!wrap || !S.H.length) return;
  const W = wrap.clientWidth, phone = W < 760;
  if (W < 240) return;
  const map = curMap();
  const [lo, hi] = domain(map);
  const hgt = phone ? 250 : Math.max(380, Math.min(620, Math.round(window.innerHeight * 0.56)));
  const top = 30, bot = 26, axW = 56, gap = 8;
  let L;
  if (!phone) {
    const wP = Math.max(110, Math.min(190, Math.round(W * 0.13))), wM = Math.max(220, Math.min(560, Math.round(W * 0.31)));
    const wH = W - axW - wM - wP - gap * 2 - 8;
    L = { H: hgt, rows: [{ y0: top, y1: hgt - bot, hist: [8, 8 + wH], axis: [8 + wH, 8 + wH + axW], map: [8 + wH + axW + gap, 8 + wH + axW + gap + wM], prof: [W - wP - 2, W - 4] }] };
  } else {
    const h2 = 330;
    L = { H: hgt + h2 + 10, rows: [{ y0: top, y1: hgt - bot, hist: [6, W - axW], axis: [W - axW, W] },
      { y0: hgt + 10 + top, y1: hgt + 10 + h2 - 8, axis: [W - axW, W], map: [6, Math.round((W - axW) * 0.66)], prof: [Math.round((W - axW) * 0.66) + 6, W - axW - 4] }] };
  }
  S.lay = { L, lo, hi, map };
  const yOf = row => v => row.y1 - (v - lo) / (hi - lo) * (row.y1 - row.y0);
  const out = [];
  out.push(`<svg id="kt" viewBox="0 0 ${W} ${L.H}" height="${L.H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,BlinkMacSystemFont,Roboto,sans-serif" font-size="11">`);
  out.push(`<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#2a2e39" stroke-width="2"/></pattern>`);
  L.rows.forEach((row, ri) => {
    ["hist", "map", "prof"].forEach(k => { if (row[k]) out.push(`<clipPath id="cp${ri}${k}"><rect x="${row[k][0]}" y="${row[y0key(k)]}" width="${row[k][1] - row[k][0]}" height="${row.y1 - row[y0key(k)]}"/></clipPath>`); });
  });
  out.push(`</defs>`);
  L.rows.forEach((row, ri) => {
    const y = yOf(row), ticks = niceTicks(lo, hi, phone ? 5 : 7);
    const x0 = Math.min(...["hist", "map"].filter(k => row[k]).map(k => row[k][0])), x1 = row.prof ? row.prof[1] : row.axis[0];
    ticks.forEach(t => {
      const yy = y(t).toFixed(1);
      out.push(`<line x1="${x0}" x2="${x1}" y1="${yy}" y2="${yy}" stroke="${C.grid}" stroke-width="1"/>`);
      out.push(`<text x="${row.axis[0] + axW / 2}" y="${+yy + 4}" fill="${C.sub}" text-anchor="middle">${fk(t)}</text>`);
    });
    if (row.hist) out.push(histPane(row, ri, y));
    if (row.map) out.push(mapPane(row, ri, y, map));
    if (row.prof) out.push(profPane(row, ri, y, map));
    out.push(axisTags(row, y, map));
    out.push(`<g id="xh${ri}" style="display:none"><line class="xl" x1="${x0}" x2="${x1}" stroke="#9598a1" stroke-width="1" stroke-dasharray="3 3"/><rect class="xr" x="${row.axis[0] + 2}" width="${axW - 4}" height="16" rx="2" fill="#4c525e"/><text class="xt" x="${row.axis[0] + axW / 2}" fill="#fff" text-anchor="middle"></text></g>`);
  });
  out.push(`</svg>`);
  const tip = $("#tip");
  wrap.innerHTML = out.join("");
  wrap.appendChild(tip);
  wireChart(wrap);
  const note = $("#mapNote");
  if (note) {
    const r = S.H[S.sel];
    note.className = "note" + (map && map.partial && !map.loading ? " warn" : "");
    note.textContent = !map ? "no map saved for this day" : map.loading ? "loading the full map…"
      : map.partial ? "This day shows the 12 biggest strikes (the full map covers the newest sessions)"
      : `${map.exps.length} expiries × ${map.ks.length} strikes` + (r.src === "eve" ? " · open interest from the previous settle" : "");
  }
}
function y0key() { return "y0"; }

function histPane(row, ri, y) {
  const [xa, xb] = row.hist, sl = visSlots(), n = sl.length, w = (xb - xa) / n, at = new Map(sl.map((d, i) => [d, i]));
  const xc = i => xa + (i + 0.5) * w;
  const o = [`<g clip-path="url(#cp${ri}hist)">`];
  const si = at.get(S.H[S.sel].d);
  if (si != null) o.push(`<rect x="${(xa + si * w).toFixed(1)}" y="${row.y0}" width="${w.toFixed(1)}" height="${row.y1 - row.y0}" fill="${C.sel}" opacity=".7"/>`);
  const have = new Set(S.H.map(r => r.d));
  sl.forEach((d, i) => { if (!have.has(d)) o.push(`<rect x="${(xa + i * w).toFixed(1)}" y="${row.y0}" width="${w.toFixed(1)}" height="${row.y1 - row.y0}" fill="url(#hatch)" opacity=".8"/>`); });

  const gmap = S.lay.map;
  if (S.gex && gmap) {
    const net = strikeNet(gmap), kk = gmap.king ? gmap.king[0] : null, L = (xb - xa) * 0.32;
    const vis = gmap.ks.map((k, i) => i).filter(i => net[i] && gmap.ks[i] >= S.lay.lo && gmap.ks[i] <= S.lay.hi);
    const mx = Math.max(1, ...vis.map(i => Math.abs(net[i])));
    vis.forEach(i => {
      const [ya, yb] = rowBounds(gmap.ks, y, i), h = Math.max(1, Math.min(10, yb - ya - (yb - ya > 4 ? 1 : 0))), yc = y(gmap.ks[i]);
      const len = Math.max(1, Math.abs(net[i]) / mx * L), isK = gmap.ks[i] === kk;
      o.push(`<rect x="${(xb - len).toFixed(1)}" y="${(yc - h / 2).toFixed(1)}" width="${len.toFixed(1)}" height="${h.toFixed(1)}" fill="${isK ? C.king : net[i] >= 0 ? C.up : C.dn}" opacity="${isK ? 0.38 : 0.3}"/>`);
    });
    if (vis.length) o.push(`<text x="${xb - 4}" y="${row.y1 - 5}" fill="${C.sub}" font-size="10" text-anchor="end">GEX by strike · ${fday(gmap.d || S.H[S.sel].d, false)} map${gmap.partial ? " (12 biggest strikes)" : ""}</text>`);
  }

  const edge = [];
  LEVELS.forEach(([k, , dash]) => {
    if (!S.show[k]) return;
    let d = "", prevI = -2;
    S.H.forEach(r => {
      const v = lvl(r, k), i = at.get(r.d);
      if (v == null || i == null) { prevI = -2; return; }
      if (v < S.lay.lo || v > S.lay.hi) { if (k === "king") edge.push([i, v]); prevI = -2; return; }
      const yy = y(v).toFixed(1), xl = (xa + i * w + w * 0.08).toFixed(1), xr = (xa + (i + 1) * w - w * 0.08).toFixed(1);

      d += k === "king" && prevI === i - 1 ? ` L${xl},${yy} L${xr},${yy}` : ` M${xl},${yy} L${xr},${yy}`;
      prevI = i;
    });
    if (d) o.push(`<path d="${d}" fill="none" stroke="${C[k]}" stroke-width="${k === "king" ? 2.4 : 1.5}" ${dash ? `stroke-dasharray="${dash}"` : ""} stroke-linejoin="round" opacity="${k === "king" ? 1 : 0.9}"/>`);
  });

  let prev = null;
  const bw = Math.max(3, Math.min(14, w * 0.46));
  S.H.forEach(r => {
    const i = at.get(r.d); if (i == null || !r.c) return;
    const up = prev == null || r.c >= prev, col = r.stale ? "#5d606b" : up ? C.up : C.dn, cx = xc(i);
    if (r.hi && r.lo && r.hi >= r.lo) o.push(`<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${y(r.hi).toFixed(1)}" y2="${y(r.lo).toFixed(1)}" stroke="${col}" stroke-width="1.2"/>`);
    const ya = y(prev == null ? r.c : Math.max(prev, r.c)), yb = y(prev == null ? r.c : Math.min(prev, r.c));
    o.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${ya.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1.5, yb - ya).toFixed(1)}" fill="${col}"/>`);
    prev = r.c;
  });

  if (S.show.king) {
    const mx = Math.max(...S.H.map(r => r.k ? r.k[2] : 0)) || 1;
    let pk = null;
    S.H.forEach(r => {
      const i = at.get(r.d); if (i == null || !r.k) return;
      if (r.k[0] < S.lay.lo || r.k[0] > S.lay.hi) { if (!r.stale) pk = r.k[0]; return; }
      const cx = xc(i), cy = y(r.k[0]), rad = Math.min(2.2 + 5 * Math.sqrt(Math.max(0, r.k[2]) / mx), Math.max(2, w * 0.42));
      o.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="${r.src === "eve" || r.stale ? C.bg : C.king}" stroke="${C.king}" stroke-width="${r.src === "eve" || r.stale ? 1.5 : 1}" ${r.src === "eve" ? 'stroke-dasharray="2 2"' : ""}/>`);
      if (pk != null && pk !== r.k[0] && !r.stale) o.push(`<text x="${cx.toFixed(1)}" y="${(cy - rad - 4).toFixed(1)}" fill="${C.king}" text-anchor="middle" font-size="10.5" font-weight="600" paint-order="stroke" stroke="${C.bg}" stroke-width="3">${fk(r.k[0])}</text>`);
      if (!r.stale) pk = r.k[0];
    });
  }
  o.push(`</g>`);
  edge.forEach(([i, v], j) => {
    if (j > 0 && edge[j - 1][0] === i - 1 && edge[j - 1][1] === v) return;
    const upE = v > S.lay.hi, yy = upE ? row.y0 + 10 : row.y1 - 4;
    o.push(`<text x="${xc(i).toFixed(1)}" y="${yy}" fill="${C.king}" text-anchor="middle" font-size="10" font-weight="600">${upE ? "▲" : "▼"}${fk(v)}</text>`);
  });

  const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((xb - xa) / 64))));
  let lastLab = -99;
  sl.forEach((d, i) => {
    const mon = pd(d).getUTCDay() === 1 || i === 0;
    if ((every <= 5 ? mon : i % every === 0) && i - lastLab >= Math.max(3, every / 2)) {
      o.push(`<text x="${Math.max(xa + 20, xc(i)).toFixed(1)}" y="${row.y1 + 16}" fill="${C.sub}" text-anchor="middle">${fday(d, false)}</text>`);
      lastLab = i;
    }
  });
  if (S.H[S.H.length - 1].src === "eve") {
    const i = at.get(S.H[S.H.length - 1].d);
    o.push(`<text x="${xc(i).toFixed(1)}" y="${row.y0 - 6}" fill="#ff9800" text-anchor="middle" font-size="10">eve</text>`);
  }
  o.push(`<text x="${xa + 2}" y="${row.y0 - 10}" fill="${C.sub}" font-size="11">Levels on each saved session</text>`);
  return o.join("");
}

function rowBounds(ks, y, i) {
  const k = ks[i], up = i < ks.length - 1 ? (ks[i + 1] - k) / 2 : (i > 0 ? (k - ks[i - 1]) / 2 : k * 0.005);
  const dn = i > 0 ? (k - ks[i - 1]) / 2 : up;
  return [y(k + up), y(k - dn)];
}

function mapPane(row, ri, y, map) {
  const [xa, xb] = row.map, o = [];
  o.push(`<rect x="${xa}" y="${row.y0}" width="${xb - xa}" height="${row.y1 - row.y0}" fill="#191d28"/>`);
  if (!map) { o.push(`<text x="${(xa + xb) / 2}" y="${(row.y0 + row.y1) / 2}" fill="${C.sub}" text-anchor="middle">No map saved for this day</text>`); return o.join(""); }
  const ne = map.exps.length, cw = (xb - xa) / Math.max(1, ne);
  const vis = map.ks.map((k, i) => ({ k, i })).filter(x => x.k >= S.lay.lo && x.k <= S.lay.hi);
  const visSet = new Set(vis.map(x => x.i));
  const above = map.ks.filter(k => k > S.lay.hi).length, below = map.ks.filter(k => k < S.lay.lo).length;
  const mx = Math.max(1, ...map.cells.filter(c => visSet.has(c[0])).map(c => Math.abs(c[2])));
  o.push(`<g clip-path="url(#cp${ri}map)">`);
  map.cells.forEach(c => {
    if (!visSet.has(c[0])) return;
    const [ya, yb] = rowBounds(map.ks, y, c[0]), v = c[2], t = Math.sqrt(Math.abs(v) / mx);
    const h = Math.max(1, yb - ya - (yb - ya > 4 ? 1 : 0));
    o.push(`<rect x="${(xa + c[1] * cw + 0.5).toFixed(1)}" y="${ya.toFixed(1)}" width="${Math.max(1, cw - 1).toFixed(1)}" height="${h.toFixed(1)}" fill="${v >= 0 ? C.up : C.dn}" fill-opacity="${(0.1 + 0.9 * t).toFixed(2)}"/>`);
  });
  if (map.king) {
    const ki = map.ks.indexOf(map.king[0]), ei = map.exps.indexOf(map.king[1]);
    if (ki >= 0 && ei >= 0 && visSet.has(ki)) {
      const [ya, yb] = rowBounds(map.ks, y, ki);
      o.push(`<rect x="${(xa + ei * cw - 0.5).toFixed(1)}" y="${(ya - 1).toFixed(1)}" width="${(cw + 1).toFixed(1)}" height="${Math.max(4, yb - ya + 2).toFixed(1)}" fill="none" stroke="${C.king}" stroke-width="2" rx="1.5"/>`);
    }
  }
  if (map.tr) {
    const ki = map.ks.indexOf(map.tr[0]), ei = map.exps.indexOf(map.tr[1]);
    if (ki >= 0 && ei >= 0 && visSet.has(ki)) {
      const [ya, yb] = rowBounds(map.ks, y, ki);
      o.push(`<rect x="${(xa + ei * cw - 0.5).toFixed(1)}" y="${(ya - 1).toFixed(1)}" width="${(cw + 1).toFixed(1)}" height="${Math.max(4, yb - ya + 2).toFixed(1)}" fill="none" stroke="#ff6e6a" stroke-width="2" stroke-dasharray="3 2" rx="1.5"/>`);
    }
  }
  if (map.spot) o.push(`<line x1="${xa}" x2="${xb}" y1="${y(map.spot).toFixed(1)}" y2="${y(map.spot).toFixed(1)}" stroke="#fff" stroke-width="1" opacity=".75"/>`);
  if (map.fl && S.show.flip) o.push(`<line x1="${xa}" x2="${xb}" y1="${y(map.fl).toFixed(1)}" y2="${y(map.fl).toFixed(1)}" stroke="${C.flip}" stroke-width="1.2" stroke-dasharray="6 4"/>`);
  o.push(`</g>`);


  const kx = map.king ? map.exps.indexOf(map.king[1]) : -1, placed = [], half = e => fexpShort(e).length * 2.9 + 4;
  if (kx >= 0) placed.push([xa + (kx + 0.5) * cw, half(map.exps[kx])]);
  map.exps.forEach((e, i) => {
    const cx = xa + (i + 0.5) * cw, isK = i === kx, h = half(e);
    if (!isK && placed.some(([p, ph]) => Math.abs(p - cx) < ph + h)) return;
    if (!isK) placed.push([cx, h]);
    o.push(`<text x="${Math.max(xa + 16, Math.min(xb - 16, cx)).toFixed(1)}" y="${row.y0 - 6}" fill="${isK ? C.king : C.sub}" font-size="10" text-anchor="middle" ${isK ? 'font-weight="600"' : ""}>${fexpShort(e)}</text>`);
  });
  if (above) o.push(`<text x="${xb - 4}" y="${row.y0 + 12}" fill="${C.sub}" font-size="10" text-anchor="end">↑ ${above} more strikes</text>`);
  if (below) o.push(`<text x="${xb - 4}" y="${row.y1 - 5}" fill="${C.sub}" font-size="10" text-anchor="end">↓ ${below} more strikes</text>`);
  if (map.loading) o.push(`<text x="${(xa + xb) / 2}" y="${row.y0 + 16}" fill="${C.sub}" text-anchor="middle">loading the full map…</text>`);
  else if (map.partial) o.push(`<text x="${xa + 4}" y="${row.y1 - 5}" fill="#ff9800" font-size="10">12 biggest strikes only</text>`);
  o.push(`<text x="${xa}" y="${row.y0 - 18}" fill="${C.sub}" font-size="11">Map · ${fday(map.d || S.H[S.sel].d, false)} · strike × expiry</text>`);
  return o.join("");
}

function strikeNet(map) {
  if (map.ca) return map.ks.map((k, i) => (map.ca[i] || 0) + (map.pu[i] || 0));
  if (map.net) return map.net;
  return map.ks.map(() => null);
}
function profPane(row, ri, y, map) {
  const [xa, xb] = row.prof, o = [];
  if (!map) return "";
  const cp = S.prof === "cp" && map.ca, net = strikeNet(map);
  const vis = map.ks.map((k, i) => i).filter(i => map.ks[i] >= S.lay.lo && map.ks[i] <= S.lay.hi);
  const vals = cp ? vis.flatMap(i => [map.ca[i] || 0, map.pu[i] || 0]) : vis.map(i => net[i] || 0);
  const mx = Math.max(1, ...vals.map(Math.abs));
  const mid = cp ? (xa + xb) / 2 : (xa + xb) / 2, half = (xb - xa) / 2 - 2;
  o.push(`<g clip-path="url(#cp${ri}prof)">`);
  o.push(`<line x1="${mid}" x2="${mid}" y1="${row.y0}" y2="${row.y1}" stroke="#363a45"/>`);
  const bar = (i, v, col) => {
    if (!v) return;
    const [ya, yb] = rowBounds(map.ks, y, i), h = Math.max(1, Math.min(12, yb - ya - (yb - ya > 4 ? 1 : 0))), yc = y(map.ks[i]);
    const len = Math.abs(v) / mx * half, x = v >= 0 ? mid : mid - len;
    o.push(`<rect x="${x.toFixed(1)}" y="${(yc - h / 2).toFixed(1)}" width="${Math.max(0.8, len).toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>`);
  };
  const kk = map.king ? map.king[0] : null;
  vis.forEach(i => {
    if (cp) { bar(i, map.ca[i], map.ks[i] === kk ? C.king : C.up); bar(i, map.pu[i], C.dn); }
    else bar(i, net[i], map.ks[i] === kk ? C.king : (net[i] || 0) >= 0 ? C.up : C.dn);
  });
  if (map.spot) o.push(`<line x1="${xa}" x2="${xb}" y1="${y(map.spot).toFixed(1)}" y2="${y(map.spot).toFixed(1)}" stroke="#fff" stroke-width="1" opacity=".75"/>`);
  o.push(`</g>`);

  const big = vis.filter(i => net[i] != null).sort((a, b) => Math.abs(net[b]) - Math.abs(net[a])).slice(0, 3);
  big.forEach(i => {
    const v = net[i], yc = y(map.ks[i]);
    o.push(`<text x="${v >= 0 ? xb - 2 : xa + 2}" y="${(yc - 4).toFixed(1)}" fill="${map.ks[i] === kk ? C.king : C.txt}" font-size="10" text-anchor="${v >= 0 ? "end" : "start"}" paint-order="stroke" stroke="${C.bg}" stroke-width="3">${fk(map.ks[i])} ${fm(v)}</text>`);
  });
  o.push(`<text x="${xa}" y="${row.y0 - 18}" fill="${C.sub}" font-size="11">${cp ? "Calls · Puts" : "Net"} by strike</text>`);
  return o.join("");
}

function axisTags(row, y, map) {
  const r = S.H[S.sel], ax = row.axis[0], w = row.axis[1] - row.axis[0], tags = [];
  const add = (v, txt, bg, fg) => {
    if (v == null) return;
    if (v > S.lay.hi) tags.push({ y: row.y0 + 8, txt: "▲" + txt, bg, fg, edge: 1 });
    else if (v < S.lay.lo) tags.push({ y: row.y1 - 8, txt: "▼" + txt, bg, fg, edge: -1 });
    else tags.push({ y: y(v), txt, bg, fg });
  };
  add(r.sp || r.c, fp(r.sp || r.c), "#fff", "#131722");
  if (S.show.king && r.k) add(r.k[0], fk(r.k[0]), C.king, "#131722");
  if (S.show.flip) add(r.fl, fk(r.fl), C.flip, "#131722");
  if (S.show.res && r.res) add(r.res[0], fk(r.res[0]), C.res, "#fff");
  if (S.show.sup && r.sup) add(r.sup[0], fk(r.sup[0]), C.sup, "#131722");
  if (S.show.air && r.air) add(r.air[0], fk(r.air[0]), C.air, "#fff");
  for (let i = tags.length - 1; i > 0; i--) {
    const j = tags.findIndex(t => t.txt === tags[i].txt);
    if (j < i) tags.splice(i, 1);
  }
  tags.sort((a, b) => a.y - b.y);
  for (let i = 1; i < tags.length; i++) if (tags[i].y - tags[i - 1].y < 15) tags[i].y = tags[i - 1].y + 15;
  const over = tags.length ? tags[tags.length - 1].y - (row.y1 - 8) : 0;
  if (over > 0) for (let i = tags.length - 1; i >= 0; i--) { const lim = i === tags.length - 1 ? row.y1 - 8 : tags[i + 1].y - 15; if (tags[i].y > lim) tags[i].y = lim; }
  return tags.map(t => `<rect x="${ax + 2}" y="${(t.y - 8).toFixed(1)}" width="${w - 4}" height="16" rx="2" fill="${t.bg}"/><text x="${ax + w / 2}" y="${(t.y + 4).toFixed(1)}" fill="${t.fg}" text-anchor="middle" font-weight="600">${t.txt}</text>`).join("");
}


const MIN_SESSIONS = 5;
function redraw() { if (!S.raf) S.raf = requestAnimationFrame(() => { S.raf = 0; drawChart(); zoomUI(); }); }
function zoomPrice(f, at) {
  const { lo, hi } = S.lay, ref = (S.H[S.H.length - 1] || {}).c || (lo + hi) / 2;
  let span = Math.max(ref * 0.004, Math.min(ref * 1.2, (hi - lo) * f));
  const k = (at - lo) / (hi - lo || 1);
  S.z.p = [at - span * k, at - span * k + span];
  redraw();
}
function panPrice(d) { const { lo, hi } = S.lay; S.z.p = [lo + d, hi + d]; redraw(); }
function zoomTime(f, atFrac = 1) {
  const all = slots(), N = all.length, [a, b] = S.z.t || [0, N - 1], n = b - a + 1;
  const m = Math.max(Math.min(MIN_SESSIONS, N), Math.min(N, Math.round(n * f)));
  if (m >= N) { S.z.t = null; S.z.p = null; redraw(); return; }
  const anchor = a + atFrac * (n - 1);
  let a2 = Math.round(anchor - atFrac * (m - 1));
  a2 = Math.max(0, Math.min(N - m, a2));
  S.z.t = [a2, a2 + m - 1];
  S.z.p = null;
  redraw();
}
function panTime(d) {
  if (!S.z.t) return;
  const N = slots().length, n = S.z.t[1] - S.z.t[0];
  const a = Math.max(0, Math.min(N - 1 - n, S.z.t[0] + Math.round(d)));
  if (a !== S.z.t[0]) { S.z.t = [a, a + n]; redraw(); }
}
function setRange(k) {
  const N = slots().length, n = { all: N, "1m": 21, "2w": 10 }[k];
  S.z = { t: n >= N ? null : [N - n, N - 1], p: null };
  redraw();
}
function zoomUI() {
  const N = S.H.length ? slots().length : 0, t = S.z.t;
  const cur = !t ? "all" : t[1] === N - 1 && t[1] - t[0] + 1 === 21 ? "1m" : t[1] === N - 1 && t[1] - t[0] + 1 === 10 ? "2w" : "";
  document.querySelectorAll("#zoomc [data-r]").forEach(b => b.classList.toggle("on", b.dataset.r === cur));
  const rb = $("#zReset"); if (rb) rb.classList.toggle("hot", !!(S.z.t || S.z.p));
}
function zoomBar() {
  return `<span id="zoomc"><span class="zl">Range</span><button data-r="all">All</button><button data-r="1m">1M</button><button data-r="2w">2W</button>
    <span class="zl">Zoom</span><button id="zOut" title="Zoom out (price scale)">−</button><button id="zIn" title="Zoom in (price scale)">+</button><button id="zReset" title="Back to the full view (or double-click the chart)">Reset</button></span>`;
}


function wireChart(wrap) {
  const svg = $("#kt", wrap), tip = $("#tip", wrap);
  if (!svg) return;
  const pt = e => { const b = svg.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const within = (v, a) => a && v >= a[0] && v <= a[1];
  const hide = () => { tip.style.display = "none"; S.lay.L.rows.forEach((_, i) => { const g = $("#xh" + i, svg); if (g) g.style.display = "none"; }); };
  const where = (x, yy) => {
    for (let ri = 0; ri < S.lay.L.rows.length; ri++) {
      const row = S.lay.L.rows[ri];
      if (yy < row.y0 - 24 || yy > row.y1 + 22) continue;
      for (const k of ["hist", "map", "prof", "axis"]) if (within(x, row[k])) return { ri, row, k };
    }
    return null;
  };
  svg.addEventListener("mousemove", e => {
    const [x, yy] = pt(e), w = where(x, yy);
    if (!w || yy < w.row.y0 || yy > w.row.y1) { hide(); return; }
    const { lo, hi } = S.lay, price = lo + (w.row.y1 - yy) / (w.row.y1 - w.row.y0) * (hi - lo);
    S.lay.L.rows.forEach((row, i) => {
      const g = $("#xh" + i, svg); if (!g) return;
      if (i !== w.ri) { g.style.display = "none"; return; }
      g.style.display = "";
      $(".xl", g).setAttribute("y1", yy); $(".xl", g).setAttribute("y2", yy);
      $(".xr", g).setAttribute("y", yy - 8); $(".xt", g).setAttribute("y", yy + 4); $(".xt", g).textContent = fp(price);
    });
    const html = tipText(w, x, yy, price);
    if (!html) { tip.style.display = "none"; return; }
    tip.innerHTML = html; tip.style.display = "block";
    const W = wrap.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(4, Math.min(W - tw - 4, x + 14 + tw > W ? x - tw - 14 : x + 14)) + "px";
    tip.style.top = Math.max(4, yy - th - 10) + "px";
  });
  svg.addEventListener("mouseleave", hide);
  const priceAt = (row, yy) => S.lay.lo + (row.y1 - yy) / (row.y1 - row.y0) * (S.lay.hi - S.lay.lo);

  svg.addEventListener("wheel", e => {
    const [x, yy] = pt(e), w = where(x, yy);
    if (!w || yy < w.row.y0 || yy > w.row.y1 + 20) return;
    e.preventDefault();
    const sw = w.row.hist ? (w.row.hist[1] - w.row.hist[0]) / visSlots().length : 20;
    if (e.shiftKey) {
      const dd = e.deltaY || e.deltaX, frac = w.k === "hist" ? (x - w.row.hist[0]) / (w.row.hist[1] - w.row.hist[0]) : 1;
      zoomTime(Math.exp(dd * 0.003), Math.max(0, Math.min(1, frac)));
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) panTime(e.deltaX / sw);
    else zoomPrice(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), priceAt(w.row, Math.min(yy, w.row.y1)));
  }, { passive: false });

  svg.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    const [x, yy] = pt(e), w = where(x, yy);
    if (!w || yy < w.row.y0 || yy > w.row.y1) return;
    e.preventDefault();
    const st = { x: e.clientX, y: e.clientY, lo: S.lay.lo, hi: S.lay.hi, t: S.z.t ? S.z.t.slice() : null, row: w.row, k: w.k,
                 sw: w.row.hist ? (w.row.hist[1] - w.row.hist[0]) / visSlots().length : 0, moved: false };
    S.dragged = false;
    const mv = ev => {
      const dx = ev.clientX - st.x, dy = ev.clientY - st.y;
      if (!st.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      st.moved = S.dragged = true;
      document.body.classList.add("dragging");
      const d = dy / (st.row.y1 - st.row.y0) * (st.hi - st.lo);
      S.z.p = [st.lo + d, st.hi + d];
      if (st.t && st.k === "hist" && st.sw) {
        const N = slots().length, n = st.t[1] - st.t[0], a = Math.max(0, Math.min(N - 1 - n, st.t[0] - Math.round(dx / st.sw)));
        S.z.t = [a, a + n];
      }
      redraw();
    };
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); document.body.classList.remove("dragging"); };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
  });
  svg.addEventListener("dblclick", e => { e.preventDefault(); S.z = { t: null, p: null }; redraw(); });
  svg.addEventListener("click", e => {
    if (S.dragged) { S.dragged = false; return; }
    const [x, yy] = pt(e), w = where(x, yy);
    if (!w || w.k !== "hist") return;
    const r = histRowAt(w.row, x);
    if (r) pick(S.H.indexOf(r));
  });
}
function histRowAt(row, x) {
  const sl = visSlots(), w = (row.hist[1] - row.hist[0]) / sl.length, i = Math.floor((x - row.hist[0]) / w), d = sl[i];
  return S.H.find(r => r.d === d) || null;
}
function tipText(w, x, yy, price) {
  const map = S.lay.map;
  if (w.k === "hist") {
    const sl = visSlots(), sw = (w.row.hist[1] - w.row.hist[0]) / sl.length, d = sl[Math.floor((x - w.row.hist[0]) / sw)];
    const r = S.H.find(q => q.d === d);
    if (!r) return d ? `<b>${fday(d)}</b><br><span class="muted">no snapshot saved for this session</span>` : "";
    const px = r.sp || r.c;
    return `<b>${fday(r.d)}</b>${r.src === "eve" ? ' <span class="am">evening build</span>' : ""}${r.stale ? ' <span class="muted">stale chain</span>' : ""}<br>
      Close <b>${fp(r.c)}</b>${r.hi ? ` <span class="muted">(${fp(r.lo)}–${fp(r.hi)})</span>` : ""}<br>
      <span class="kg">King ${r.k ? `<b class="kg">${fk(r.k[0])}</b> ${fexp(r.k[1])} · ${fm(r.k[2])} · ${pc(r.k[0] / px - 1)}` : "–"}</span><br>
      Flip ${fk(r.fl)} · ${(r.nas || 0) > 0 ? '<span class="up">long gamma</span>' : '<span class="dn">short gamma</span>'}<br>
      Call wall ${r.res ? fk(r.res[0]) : "–"} · Support ${r.sup ? fk(r.sup[0]) : "–"} · <span class="dn">Air ${r.air ? fk(r.air[0]) : "–"}</span>
      ${r.setup ? `<br>Setup <b>${r.setup}</b>` : ""}${gexAt(price)}<br><span class="muted">click to load this day's map</span>`;
  }
  if (!map) return "";
  const ki = nearestStrike(map, price);
  if (ki < 0) return "";
  const k = map.ks[ki], net = strikeNet(map)[ki], tot = map.tot || 1;
  if (w.k === "map") {
    const cw = (w.row.map[1] - w.row.map[0]) / Math.max(1, map.exps.length), ei = Math.floor((x - w.row.map[0]) / cw), e = map.exps[ei];
    if (!e) return "";
    const c = map.cells.find(q => q[0] === ki && q[1] === ei), v = c ? c[2] : 0;
    const isK = map.king && map.king[0] === k && map.king[1] === e, isT = map.tr && map.tr[0] === k && map.tr[1] === e;
    return `<b>${fk(k)}</b> · ${fexp(e)}${isK ? ' <b class="kg">KING</b>' : ""}${isT ? ' <b class="dn">NEGATIVE KING</b>' : ""}<br>
      GEX <b class="${v >= 0 ? "up" : "dn"}">${fm(v)}</b> per 1% move${v ? ` · ${(Math.abs(v) / tot * 100).toFixed(1)}% of the map` : ""}<br>
      <span class="muted">${days(pd(map.today || nextSession(map.d)), e2d(e))} days to expiry · ${pc(k / map.spot - 1)} from price</span>`;
  }
  if (w.k === "prof") {
    return `<b>${fk(k)}</b> · all expiries<br>Net <b class="${(net || 0) >= 0 ? "up" : "dn"}">${fm(net)}</b>` +
      (map.ca ? `<br><span class="up">Calls ${fm(map.ca[ki])}</span> · <span class="dn">Puts ${fm(map.pu[ki])}</span><br><span class="muted">OI ${(map.oc[ki] || 0).toLocaleString()} calls · ${(map.op[ki] || 0).toLocaleString()} puts</span>` : "") +
      `<br><span class="muted">${pc(k / map.spot - 1)} from price</span>`;
  }
  return "";
}
function gexAt(price) {
  const map = S.lay.map;
  if (!S.gex || !map) return "";
  const ki = nearestStrike(map, price);
  if (ki < 0) return "";
  const v = strikeNet(map)[ki];
  return v == null ? "" : `<br>GEX at ${fk(map.ks[ki])}: <b class="${v >= 0 ? "up" : "dn"}">${fm(v)}</b> <span class="muted">(${fday(map.d || S.H[S.sel].d, false)} map)</span>`;
}
function nearestStrike(map, price) {
  let best = -1, bd = Infinity;
  map.ks.forEach((k, i) => { const d = Math.abs(k - price); if (d < bd) { bd = d; best = i; } });
  if (best < 0) return -1;
  const sp = map.ks.length > 1 ? Math.min(...map.ks.slice(1).map((k, i) => k - map.ks[i])) : map.ks[0] * 0.02;
  return bd <= Math.max(sp, (S.lay.hi - S.lay.lo) * 0.01) * 1.5 ? best : -1;
}

init();
