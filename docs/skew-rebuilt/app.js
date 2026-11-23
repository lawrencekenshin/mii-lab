
(() => {
"use strict";
const LIVE = "https://raw.githubusercontent.com/lawrencekenshin/mii-lab/skew-rebuilt-data/skew-rebuilt/";
const BASE = /(^|\.)github\.io$/.test(location.hostname) ? LIVE : "./snap/";
const WINS = [["1d", "1 day"], ["1w", "1 week"], ["2w", "2 weeks"], ["1m", "1 month"], ["all", "Total"]];
const UNIS = [["all", "All"], ["combo", "S&P + Nasdaq"], ["spx", "S&P 500"], ["ndx", "Nasdaq 100"], ["ai", "AI"], ["r1", "Russell 1000"], ["r2", "Russell 2000"], ["etf", "ETFs"]];
const VIEWS = [["rank", "Rankings"], ["chg", "Changes"], ["crowd", "Crowds"], ["days", "Day by day"]];
const KINDS = [["sector", "Sectors"], ["industry", "Industries"], ["theme", "Themes"]];
const TEN = ["inside a month", "one to six months", "six to twelve months", "over a year"];
const OTM = ["in the money", "near the money", "out of the money", "far out", "very far out"];
const KDJ = { gc: "golden cross", coil: "coiling", up: "rising", dn: "falling" };
const KTF = [["w", "Weekly"], ["w2", "2-week"], ["m", "Monthly"]];
const PST = { wash: "washed out", pull: "pullback", base: "basing", high: "near its high" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const S = { v: "rank", w: "1w", s: "C", u: "all", n: null, q: "", k: "sector", c: null };
let B = null, SR = null, SRP = null, GEN = null;
const $ = (q) => document.querySelector(q);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


const dparts = (iso) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
const dshort = (iso) => { if (!iso) return ""; const p = dparts(iso); return MON[p.m - 1] + " " + p.d; };
const dlong = (iso) => { if (!iso) return ""; const p = dparts(iso); return DOW[p.dow] + " " + MON[p.m - 1] + " " + p.d; };
const expfmt = (e) => { const y = 2000 + +e.slice(0, 2), m = +e.slice(2, 4), d = +e.slice(4, 6), ly = +B.latest.slice(0, 4); return MON[m - 1] + " " + d + (y !== ly ? " '" + String(y).slice(2) : ""); };
const pct = (x) => { const a = Math.abs(x) * 100; return a >= 999.5 ? "over 999%" : a >= 9.95 ? Math.round(a) + "%" : a.toFixed(1) + "%"; };
const spct = (x) => (x > 0 ? "+" : x < 0 ? "−" : "") + pct(x);
const price = (x) => (x >= 1000 ? x.toFixed(0) : x.toFixed(2));
const strike = (k) => "$" + (Number.isInteger(k) ? k : String(+k.toFixed(2)));
const sideWord = (s) => (s === "P" ? "puts" : "calls");
const winName = (w) => (WINS.find((x) => x[0] === w) || [w, w])[1];
const rowOf = (sym) => (B.rows[sym] || (SR && SR.rows[sym]) || null);
const inUni = (r, u) => u === "all" || (u === "combo" ? r.ls.includes("spx") || r.ls.includes("ndx") : r.ls.includes(u));
const ranked = (w, s, u) => ((B.windows[w] || {})[s] || []).filter((sym) => B.rows[sym] && inUni(B.rows[sym], u));


function split(cs, tall) {
  if (cs == null) return `<div class="split${tall ? " tall" : ""}"></div>`;
  const c = Math.round(cs * 100);
  return `<div class="split${tall ? " tall" : ""}"><i class="c" style="width:${c}%"></i><i class="p" style="width:${100 - c}%"></i></div>`;
}
function spark(r, big) {
  const W = 100, H = big ? 60 : 26, dp = r.dp, n = dp.length, mid = H / 2, bw = W / n;
  const mx = Math.max(1e-6, ...dp.map((x) => Math.abs(x || 0)));
  let out = "";
  const ri = B.days.findIndex((d) => d >= B.rebuilt.frm);
  if (big && ri >= 0) out += `<rect class="rebz" x="${(ri * bw).toFixed(2)}" y="0" width="${(W - ri * bw).toFixed(2)}" height="${H}"/>`;
  out += `<line class="ax" x1="0" x2="${W}" y1="${mid}" y2="${mid}"/>`;
  dp.forEach((x, i) => {
    const x0 = (i * bw + bw * 0.15).toFixed(2), wd = (bw * 0.7).toFixed(2);
    if (x == null) { out += `<rect class="nr" x="${x0}" y="${mid - 0.3}" width="${wd}" height="0.6"/>`; return; }
    const h = Math.max(0.8, (Math.abs(x) / mx) * (mid - 1));
    const tip = big ? `<title>${dlong(B.days[i])}: ${x === 0 ? "no lean" : pct(x) + " of open interest toward " + (x > 0 ? "calls" : "puts")}${r.dg === i ? " (its biggest day)" : ""}</title>` : "";
    out += `<rect class="${x > 0 ? "c" : x < 0 ? "p" : "q"}${r.dg === i ? " g" : ""}" x="${x0}" y="${(x >= 0 ? mid - h : mid).toFixed(2)}" width="${wd}" height="${h.toFixed(2)}">${tip}</rect>`;
  });
  return `<svg class="spk${big ? " big" : ""}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Lean of each of the last ${n} sessions">${out}</svg>`;
}
function line(vals, w, h) {
  const v = vals.map((x) => x || 0), mx = Math.max(1e-6, ...v.map(Math.abs)), n = v.length, mid = h / 2;
  const pts = v.map((x, i) => `${((i / Math.max(1, n - 1)) * w).toFixed(1)},${(mid - (x / mx) * (mid - 2)).toFixed(1)}`).join(" ");
  return `<svg class="spk" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Net lean, last ${n} sessions"><line class="ax" x1="0" x2="${w}" y1="${mid}" y2="${mid}"/><polyline points="${pts}" fill="none" stroke="${v[n - 1] >= 0 ? "var(--up)" : "var(--dn)"}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
}


function moveTag(a) {
  if (a.r == null) return "";
  if (a.pr == null) return `<span class="new">new</span>`;
  if (a.pr > a.r) return `<span class="up">▲${a.pr - a.r}</span>`;
  if (a.pr < a.r) return `<span class="dn">▼${a.r - a.pr}</span>`;
  return "";
}
function tiltText(a) { return a.side ? `${pct(a.pct)} of open interest toward ${sideWord(a.side)}` : "no lean"; }
function openText(a) { return a.cs == null ? "nothing opened" : a.side === "P" ? `${Math.round((1 - a.cs) * 100)}% puts` : `${Math.round(a.cs * 100)}% calls`; }
function whereText(a) {
  if (!a.mc) return "";
  return `${expfmt(a.mc[0])} ${strike(a.mc[2])} ${a.mc[1] === "P" ? "put" : "call"}`;
}
function tags(r) { return (r.ls.includes("ai") ? `<i class="tag ai">AI</i>` : "") + (r.ls.includes("etf") ? `<i class="tag">ETF</i>` : ""); }

function rowHtml(sym, i, mx) {
  const r = B.rows[sym], a = r.w[S.w] || { pct: 0 }, cls = a.side === "P" ? "p" : "c";
  const days = a.tilt ? `${a.side === "P" ? a.tilt[1] : a.tilt[0]} of ${a.cov ? a.cov[0] : "?"} days` : "";
  const px = r.px != null ? `<b>${price(r.px)}</b>${a.ret != null ? `<span class="${a.ret >= 0 ? "up" : "dn"}">${spct(a.ret)}</span>` : ""}` : `<span class="muted">–</span>`;
  const stay = a.t20n ? `top 20 on ${a.t20 || 0} of ${a.t20n}` : "";
  const run = a.str ? `${a.str}${a.strp ? "+" : ""} ${a.str === 1 ? "day" : "days"} running` : "";
  const hc = r.hc != null ? `<span class="v">${Math.round(r.hc * 100)}% calls</span>${split(r.hc)}` : `<span class="muted">–</span>`;
  const wh = a.mc ? `<span class="v">${esc(whereText(a))}</span><span class="s">${Math.round(a.mc[3] * 100)}% of it${a.tk ? " · most " + TEN[["m1", "m6", "y1", "y1p"].indexOf(a.tk)] : ""}</span>` : `<span class="muted">–</span>`;
  let h = `<div role="button" tabindex="0" class="rw${S.n === sym ? " open" : ""}" data-sym="${esc(sym)}" aria-expanded="${S.n === sym}">
    <span class="rk"><b>${i + 1}</b>${moveTag(a)}</span>
    <span class="nmc"><b>${esc(sym)}${tags(r)}</b><span>${esc(r.nm || "")}</span></span>
    <span class="pxc">${px}</span>
    <span class="cell c-tilt"><span class="lab">Tilt</span><span class="v ${cls}">${pct(a.pct)}</span> <span class="muted">of open interest</span>${a.steady ? `<i class="flag st">steady</i>` : ""}${a.big1 ? `<i class="flag">one big day</i>` : ""}<div class="tb"><i class="${cls}" style="width:${Math.min(100, (Math.abs(a.pct) / mx) * 100).toFixed(1)}%"></i></div><span class="s">${days}</span></span>
    <span class="cell c-open"><span class="lab">Opened</span><span class="v">${openText(a)}</span>${split(a.cs)}</span>
    <span class="cell c-held"><span class="lab">Held</span>${hc}</span>
    <span class="cell c-where"><span class="lab">Where</span>${wh}</span>
    <span class="cell c-stay"><span class="v">${stay}</span><span class="s">${run}</span></span>
    <span class="cell c-spark">${spark(r, false)}</span>
  </div>`;
  if (S.n === sym) h += detail(sym);
  return h;
}

function detail(sym) {
  const r = rowOf(sym);
  if (!r) return `<div class="det"><div class="top"><b>${esc(sym)}</b><span class="muted">${SR ? "is not a tracked name." : "Looking it up…"}</span><button class="x" data-sym="${esc(sym)}">Close</button></div></div>`;
  const a = r.w[S.w] || {};
  const strip = WINS.filter(([w]) => B.windows[w]).map(([w, lab]) => {
    const x = r.w[w];
    if (!x) return `<button class="wc${w === S.w ? " on" : ""}" data-go="w=${w}"><div class="t">${lab}</div><div class="p muted">–</div><div class="w">no reading</div></button>`;
    const state = x.r != null ? `ranked #${x.r} for ${sideWord(x.side)}` : x.why ? `not ranked: ${esc(x.why)}` : "not ranked";
    return `<button class="wc${w === S.w ? " on" : ""}" data-go="w=${w}"><div class="t">${lab}</div><div class="p ${x.side === "P" ? "dn" : x.side === "C" ? "up" : "muted"}">${x.side ? pct(x.pct) : "–"}</div><div class="w">${state}</div>${split(x.cs)}</button>`;
  }).join("");
  const n = r.dp.length;
  let where = "";
  if (a.mc || a.ten || a.otm || a.gx) {
    where = `<h3>Where it opened · ${winName(S.w)}</h3><div class="where">`;
    if (a.mc) where += `<div><span class="mc">${esc(whereText(a))}</span> <span class="muted">is the busiest contract: ${Math.round(a.mc[3] * 100)}% of the ${sideWord(a.side)} opened</span></div>`;
    if (a.gx && a.gx.length) where += `<div class="legend">By expiry: ${a.gx.map(([e, s]) => `<b>${expfmt(e)}</b> ${Math.round(s * 100)}%`).join(" · ")}</div>`;
    if (a.ten) where += `<div class="seg" role="img" aria-label="Share by time to expiry">${a.ten.map((x) => `<i style="width:${(x * 100).toFixed(0)}%"></i>`).join("")}</div><div class="legend">${a.ten.map((x, i) => (x >= 0.005 ? `<b>${Math.round(x * 100)}%</b> ${TEN[i]}` : "")).filter(Boolean).join(" · ")}</div>`;
    if (a.otm) where += `<div class="seg" role="img" aria-label="Share by distance from the price">${a.otm.map((x) => `<i style="width:${(x * 100).toFixed(0)}%"></i>`).join("")}</div><div class="legend">${a.otm.map((x, i) => (x >= 0.005 ? `<b>${Math.round(x * 100)}%</b> ${OTM[i]}` : "")).filter(Boolean).join(" · ")}</div>`;
    where += `</div>`;
  }
  const pills = [];
  if (r.hc != null) pills.push(`<span class="pill"><em>Held</em>${Math.round(r.hc * 100)}% calls</span>`);
  if (r.px != null) pills.push(`<span class="pill"><em>Price</em>${price(r.px)}</span>`);
  if (r.pxs && r.pxs.r20 != null) pills.push(`<span class="pill"><em>20 sessions</em>${spct(r.pxs.r20)}</span>`);
  if (r.pxs && r.pxs.dd != null) pills.push(`<span class="pill"><em>Below its high</em>${pct(r.pxs.dd)}</span>`);
  if (r.pst && PST[r.pst]) pills.push(`<span class="pill"><em>Price</em>${PST[r.pst]}</span>`);
  if (r.kdj) KTF.forEach(([k, lab]) => { const x = r.kdj[k]; if (x && KDJ[x[0]]) pills.push(`<span class="pill"><em>${lab} KDJ</em>${KDJ[x[0]]}${x[2] ? ", washed out" : ""}</span>`); });
  if (r.biz != null) pills.push(`<span class="pill"><em>Business</em>${r.biz} of 100</span>`);
  if (a.wc === 1) pills.push(`<span class="pill">with its crowd</span>`); else if (a.wc === 0) pills.push(`<span class="pill">alone in its crowd</span>`);
  if (a.bd && a.side) pills.push(`<span class="pill"><em>Biggest day</em>${dshort(a.bd)}</span>`);
  return `<div class="det" data-det="${esc(sym)}">
    <div class="top"><b>${esc(sym)}</b><span class="muted">${esc(r.nm || "")}${r.sec ? " · " + esc(r.sec) : ""}</span>
      <a href="../king-gex/#s=${encodeURIComponent(sym)}">GEX map on King GEX Tracker ↗</a>
      <button class="x" data-sym="${esc(sym)}">Close</button></div>
    <div class="wstrip">${strip}</div>
    <div class="dgrid">
      <div><h3>Lean of each session · share of open interest</h3>${spark(r, true)}<div class="axl"><span>${dshort(B.days[0])}</span><span>calls above the line, puts below</span><span>${dshort(B.days[n - 1])}</span></div></div>
      <div>${where}<div class="kv">${pills.join("")}</div></div>
    </div></div>`;
}


function controls(sides) {
  const wins = WINS.filter(([w]) => B.windows[w]).map(([w, lab]) => `<button class="chip${S.w === w ? " on" : ""}" data-go="w=${w}">${lab}</button>`).join("");
  if (!sides) return `<div class="ctl">${wins}</div>`;
  const sd = [["C", "Call skew", "c"], ["P", "Put skew", "p"]].map(([s, lab, c]) => `<button class="chip ${c}${S.s === s ? " on" : ""}" data-go="s=${s}">${lab}<span class="n">${ranked(S.w, s, S.u).length}</span></button>`).join("");
  const un = UNIS.map(([u, lab]) => { const k = ranked(S.w, S.s, u).length; return (u === "all" || k) ? `<button class="chip${S.u === u ? " on" : ""}" data-go="u=${u}">${lab}<span class="n">${k}</span></button>` : ""; }).join("");
  return `<div class="ctl">${wins}<span class="sep"></span>${sd}</div><div class="ctl">${un}</div>`;
}

function viewRank() {
  const W = B.windows[S.w], p = B.periods[S.w] || {};
  const callN = ranked(S.w, "C", S.u).length, putN = ranked(S.w, "P", S.u).length;
  const q = S.q.trim().toUpperCase();
  let list = ranked(S.w, S.s, S.u);
  const mx = Math.max(0.01, ...list.map((s) => Math.abs((B.rows[s].w[S.w] || {}).pct || 0)));
  const span = p.n === 1 ? `the ${dlong(p.to)} session` : `${p.n} sessions, ${dshort(p.since)} to ${dshort(p.to)}`;
  let h = `<h1>${S.s === "P" ? "Put skews" : "Call skews"} · ${winName(S.w)}</h1>
    <p class="sub">Names whose options opened mostly on one side over ${span}. Tilt is what opened on that side, net of what closed, as a share of the name's whole open interest.</p>
    ${controls(true)}`;
  if (!q) {
    const top = list.slice(0, 3).map((sym, i) => {
      const r = B.rows[sym], a = r.w[S.w] || {};
      return `<div role="button" tabindex="0" class="tile" data-sym="${esc(sym)}"><div class="hd"><span class="rk">#${i + 1}</span><span class="sy">${esc(sym)}</span><span class="nm">${esc(r.nm || "")}</span></div>
        <div class="pc ${a.side === "P" ? "dn" : "up"}">${pct(a.pct)}</div><div class="cap">of open interest toward ${sideWord(a.side)}</div>
        <div class="lab"><span>Opened</span><span>${openText(a)}</span></div>${split(a.cs)}
        <div class="lab"><span>Last ${r.dp.length} sessions</span><span>${a.mc ? esc(whereText(a)) : ""}</span></div>${spark(r, false)}</div>`;
    }).join("");
    h += `<div class="hero"><div class="lean"><div class="muted">Leaning names · ${S.u === "all" ? "all tracked" : esc((UNIS.find((x) => x[0] === S.u) || [])[1])}</div>
        <div class="big"><b class="up">${callN}</b><span>to calls</span><b class="dn">${putN}</b><span>to puts</span></div>${split(callN + putN ? callN / (callN + putN) : null, true)}
        <p class="now">${esc(W.now || "")}</p></div><div class="tiles">${top || `<div class="empty">No names on this list.</div>`}</div></div>`;
  } else {
    list = list.filter((s) => s.includes(q) || (B.rows[s].nm || "").toUpperCase().includes(q));
  }
  h += `<div class="rows"><div class="rh"><span>#</span><span>Name</span><span style="text-align:right">Price</span><span>Tilt</span><span>Opened</span><span class="h-held">Held now</span><span>Where</span><span class="h-stay">Staying power</span><span>Day by day</span></div>`;
  const all = ranked(S.w, S.s, S.u);
  h += list.map((sym) => rowHtml(sym, all.indexOf(sym), mx)).join("") || `<div class="empty">${q ? "No ranked name matches “" + esc(S.q.trim()) + "” on this list." : "No names on this list."}</div>`;
  h += `</div>`;
  if (q) h += searchBlock(q, new Set(all));
  else if (S.n && !all.includes(S.n)) h += `<h2>${esc(S.n)}</h2><div class="rows">${detail(S.n)}</div>`;
  return h + how();
}

function searchBlock(q, shown) {
  if (!SR) { loadSearch(); return `<h2>Other tracked names</h2><div class="empty">Looking…</div>`; }
  const hits = [];
  const add = (sym, r) => { if (!shown.has(sym) && (sym.includes(q) || (r.nm || "").toUpperCase().includes(q))) hits.push(sym); };
  Object.keys(B.rows).forEach((s) => add(s, B.rows[s]));
  Object.keys(SR.rows).forEach((s) => add(s, SR.rows[s]));
  hits.sort((a, b) => (a === q ? -1 : b === q ? 1 : a.startsWith(q) === b.startsWith(q) ? a.localeCompare(b) : a.startsWith(q) ? -1 : 1));
  if (!hits.length) return `<h2>Other tracked names</h2><div class="empty">Nothing else matches.</div>`;
  let h = `<h2>Other tracked names <span class="muted" style="font-weight:400">· not on this list</span></h2><div class="rows">`;
  hits.slice(0, 30).forEach((sym) => {
    const r = rowOf(sym), a = r.w[S.w] || {};
    const st = a.r != null ? `ranked #${a.r} for ${sideWord(a.side)}` : a.why ? `not ranked: ${esc(a.why)}` : a.side ? "not ranked" : "no reading";
    h += `<div role="button" tabindex="0" class="rw${S.n === sym ? " open" : ""}" data-sym="${esc(sym)}" style="grid-template-columns:54px minmax(120px,1.5fr) minmax(150px,1.6fr) minmax(96px,1fr) minmax(140px,2fr)">
      <span class="rk">–</span><span class="nmc"><b>${esc(sym)}${tags(r)}</b><span>${esc(r.nm || "")}</span></span>
      <span class="cell"><span class="v ${a.side === "P" ? "p" : a.side === "C" ? "c" : ""}">${a.side ? pct(a.pct) : "–"}</span> <span class="muted">${a.side ? "toward " + sideWord(a.side) : ""}</span></span>
      <span class="cell"><span class="v">${a.cs != null ? openText(a) : ""}</span>${split(a.cs)}</span><span class="cell"><span class="s">${st}</span></span></div>`;
    if (S.n === sym) h += detail(sym);
  });
  return h + `</div>`;
}

const chip = (sym, extra, side) => `<button class="nc ${side === "P" ? "p" : "c"}" data-sym="${esc(sym)}" data-open="1"><b>${esc(sym)}</b>${extra ? `<span>${extra}</span>` : ""}</button>`;

function viewChg() {
  const c = (B.views.chg || {})[S.w], prev = B.views.prev;
  let h = `<h1>Changes · ${winName(S.w)}</h1><p class="sub">What moved on the ${winName(S.w).toLowerCase()} lists between the ${dlong(prev)} settle and ${dlong(B.latest)}.</p>${controls(false)}`;
  if (!c) return h + `<div class="empty">No earlier list to compare with yet.</div>` + how();
  const box = (title, n, body) => `<div class="box"><h3>${title}<span>${n}</span></h3>${body || `<span class="none">None</span>`}</div>`;
  h += `<div class="cols">`;
  [["C", "calls"], ["P", "puts"]].forEach(([s, word]) => {
    const j = c.joined[s] || [], l = c.left[s] || [], m = c.moves[s] || [];
    h += box(`Joined the ${word} list`, j.length, j.map(([sym, r]) => chip(sym, "#" + r, s)).join(""));
    h += box(`Left the ${word} list`, l.length, l.map(([sym, pr, why]) => chip(sym, "was #" + pr + (why ? " · " + esc(why) : ""), s)).join(""));
    h += box(`Biggest moves, ${word}`, m.length, m.map(([sym, pr, r]) => chip(sym, `#${pr} → #${r}`, s)).join(""));
  });
  h += box("Flipped side", (c.flipped || []).length, (c.flipped || []).map(([sym, a, b]) => chip(sym, `${sideWord(a)} → ${sideWord(b)}`, b)).join(""));
  h += `</div>`;
  if (S.n) h += `<h2>${esc(S.n)}</h2><div class="rows">${detail(S.n)}</div>`;
  return h + how();
}

function viewCrowd() {
  const all = (B.views.crowds || []).filter((c) => c.kind === S.k);
  all.sort((a, b) => ((a.rank || {})[S.w] || 999) - ((b.rank || {})[S.w] || 999));
  let h = `<h1>Crowds · ${winName(S.w)}</h1><p class="sub">Whole sectors, industries and themes: how many members are on the call and put lists, and the group's net lean as a share of its combined open interest.</p>
    ${controls(false)}<div class="ctl">${KINDS.map(([k, lab]) => `<button class="chip${S.k === k ? " on" : ""}" data-go="k=${k}">${lab}</button>`).join("")}</div><div class="crowds">`;
  h += all.map((c) => {
    const ln = (c.lean || {})[S.w] || [0, 0], p = (c.pct || {})[S.w] || 0, word = (c.word || {})[S.w] || "", open = S.c === c.id;
    let mem = "";
    if (open) {
      const pick = (s) => ranked(S.w, s, "all").filter((sym) => (B.rows[sym].cw || []).includes(c.id));
      const cs = pick("C"), ps = pick("P");
      mem = `<div class="mem">${cs.map((s) => chip(s, "#" + B.rows[s].w[S.w].r, "C")).join("")}${ps.map((s) => chip(s, "#" + B.rows[s].w[S.w].r, "P")).join("")}${cs.length + ps.length ? "" : `<span class="none">No member is on a list in this window.</span>`}</div>`;
    }
    return `<div class="crowd${open ? " open" : ""}" role="button" tabindex="0" data-go="c=${open ? "" : esc(c.id)}">
      <div class="hd"><b>${esc(c.label)}</b><span>${c.n} names</span></div>
      <div class="pc ${p > 0 ? "up" : p < 0 ? "dn" : "muted"}">${spct(p)}</div><div class="cap">net lean toward ${p < 0 ? "puts" : "calls"}${word ? " · " + esc(word) : ""}</div>
      <div class="lab"><span>${ln[0]} on the calls list</span><span>${ln[1]} on puts</span></div>${split(ln[0] + ln[1] ? ln[0] / (ln[0] + ln[1]) : null)}
      <div class="lab"><span>Net lean, last ${(c.spark || []).length} sessions</span></div>${line(c.spark || [], 100, 26)}${mem}</div>`;
  }).join("") || `<div class="empty">No crowd of this kind has enough tracked members.</div>`;
  h += `</div>`;
  if (S.n) h += `<h2>${esc(S.n)}</h2><div class="rows">${detail(S.n)}</div>`;
  return h + how();
}

function viewDays() {
  const d = B.views.dbd || { days: [], C: [], P: [] };
  let h = `<h1>Day by day</h1><p class="sub">For each session, the names that opened the most on one side that day, as a share of their own open interest. Newest first.</p><div class="rows">`;
  for (let i = d.days.length - 1; i >= 0; i--) {
    const day = d.days[i], reb = day >= B.rebuilt.frm;
    h += `<div class="dayrow"><div class="d"><b>${dlong(day)}</b><span>${reb ? "rebuilt" : ""}</span></div>
      <div>${(d.C[i] || []).map((s) => chip(s, "", "C")).join("") || `<span class="none">No call lean</span>`}</div>
      <div>${(d.P[i] || []).map((s) => chip(s, "", "P")).join("") || `<span class="none">No put lean</span>`}</div></div>`;
  }
  h += `</div>`;
  if (S.n) h += `<h2>${esc(S.n)}</h2><div class="rows">${detail(S.n)}</div>`;
  return h + how();
}

function how() {
  const r = B.rebuilt;
  return `<details class="how"><summary>What this shows</summary>
    <p><b>The lists.</b> A name is ranked when what opened in its options leans clearly to one side, calls or puts, and that lean is large next to the name's own open interest. Names with opens on both sides, a thin option book, mostly deep-in-the-money opens or too little history are left out; the name panel says which.</p>
    <p><b>Tilt</b> is the contracts opened on the leaning side, net of what closed, as a share of all the open interest in the name. <b>Opened</b> is the calls' share of everything that opened. <b>Held now</b> is the calls' share of all open interest. <b>Where</b> is the single contract that took the most, and its share. <b>Staying power</b> counts recent settles the name spent near the top of its list and how many in a row it has been ranked.</p>
    <p><b>The data.</b> Open interest through ${dlong(B.latest)}. Since the ${dshort(r.frm)} settle it comes from the clearing house's daily open-interest file (the gold REBUILT tag), because the option-chain feed the full board used closed. Open interest is exact; this page shows shares, ranks and day counts, never contract counts. Premium, option volume, bought-or-sold reads and the trade tape need a chain feed and are not here. Prices show only for names with a publishable close (${B.priced[0]} of ${B.priced[1]} ranked names).</p>
    <p><a href="../skew-tracker/" style="color:#7aa7ff">The full Skew Tracker board</a> is frozen at the ${dshort(r.last_real)} settle, the last one from the chain feed.</p></details>`;
}


function render() {
  if (!B) return;
  if (!B.windows[S.w]) S.w = "1w";
  $("#views").innerHTML = VIEWS.map(([v, lab]) => `<button class="vt${S.v === v ? " on" : ""}" data-go="v=${v}">${lab}</button>`).join("");
  const rb = $("#reb");
  rb.hidden = false; rb.textContent = "REBUILT · OCC open interest"; rb.title = `Open interest from OCC since the ${dshort(B.rebuilt.frm)} settle. Shares and ranks only.`;
  $("#asof").innerHTML = `<i class="dot"></i>open interest through ${dlong(B.latest)}`;
  $("#main").innerHTML = S.v === "chg" ? viewChg() : S.v === "crowd" ? viewCrowd() : S.v === "days" ? viewDays() : viewRank();
  const h = Object.entries({ v: S.v, w: S.w, s: S.s, u: S.u, k: S.v === "crowd" ? S.k : null, n: S.n }).filter(([k, v]) => v && !(k === "v" && v === "rank") && !(k === "u" && v === "all")).map(([k, v]) => k + "=" + encodeURIComponent(v)).join("&");
  if (location.hash.slice(1) !== h) history.replaceState(null, "", h ? "#" + h : location.pathname + location.search);
}
function readHash() {
  Object.assign(S, { v: "rank", w: "1w", s: "C", u: "all", n: null, k: "sector", c: null });
  new URLSearchParams(location.hash.slice(1)).forEach((v, k) => { if (k in S && k !== "q") S[k] = v || null; });
  if (!VIEWS.some((x) => x[0] === S.v)) S.v = "rank";
  if (!WINS.some((x) => x[0] === S.w)) S.w = "1w";
  if (S.s !== "P") S.s = "C";
  if (!UNIS.some((x) => x[0] === S.u)) S.u = "all";
  if (!KINDS.some((x) => x[0] === S.k)) S.k = "sector";
  if (S.n) S.n = S.n.toUpperCase();
}
function go(arg) {
  const [k, v] = arg.split("=");
  S[k] = v || null;
  if (k === "v") { S.c = null; S.q = ""; $("#q").value = ""; }
  if (k === "k") S.c = null;
  render();
}
function openName(sym, forceOpen) {
  S.n = (S.n === sym && !forceOpen) ? null : sym;
  if (S.n && !B.rows[S.n] && !SR) loadSearch();
  render();
  if (S.n) { const el = document.querySelector(`[data-det="${CSS.escape(S.n)}"]`); if (el && forceOpen) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
}
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-go]"), n = e.target.closest("[data-sym]");
  if (n && (!g || n.contains(g) === false || g.contains(n))) { if (!e.target.closest("a")) { e.preventDefault(); openName(n.dataset.sym, n.dataset.open === "1"); } return; }
  if (g) { e.preventDefault(); go(g.dataset.go); }
});
document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[role=button]")) { e.preventDefault(); e.target.click(); } });
$("#q").addEventListener("input", (e) => { S.q = e.target.value; if (S.v !== "rank") S.v = "rank"; if (S.q.trim() && !SR) loadSearch(); render(); });
window.addEventListener("hashchange", () => { readHash(); render(); });

async function getJSON(name, tag) {
  const r = await fetch(BASE + name + "?g=" + encodeURIComponent(tag || Date.now()), { cache: "no-store" });
  if (!r.ok) throw new Error(name + " " + r.status);
  return r.json();
}
function loadSearch() {
  if (SRP) return SRP;
  SRP = getJSON("search.json", GEN).then((j) => { SR = j; render(); }).catch(() => { SRP = null; });
  return SRP;
}
async function load(first) {
  try {
    const st = await getJSON("status.json");
    if (!first && st.generated === GEN) return;
    const b = await getJSON("board.json", st.generated);
    B = b; GEN = b.generated; SR = null; SRP = null;
    if (S.n && !B.rows[S.n]) loadSearch();
    render();
  } catch (err) {
    if (first) $("#main").innerHTML = `<div class="empty">The data did not load. <button class="chip" id="retry">Try again</button></div>`;
  }
}
document.addEventListener("click", (e) => { if (e.target.id === "retry") load(true); });
readHash();
load(true);
setInterval(() => { if (!document.hidden) load(false); }, 300000);
})();
