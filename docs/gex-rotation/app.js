

(function () {
  "use strict";
  var R = null, W = null, H = null, N = 0, G = [], NG = 0, cur = 0, gsel = -1, timer = null, TMAX = 50, PMIN = -10, PMAX = 10;
  var GS = [], onList = { c: [], p: [] }, rows = [], utiles = [], gchart = null, REC = null, view = "board", hold = "5";
  var LIVE = location.hostname === "lawrencekenshin.github.io";
  var BASE = LIVE ? "https://raw.githubusercontent.com/lawrencekenshin/mii-lab/gex-rotation-data/gex-rotation/" : "./snap/";
  var HUNT = "../gex-hunt/#v=detail";
  function $(q, el) { return (el || document).querySelector(q); }
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var NS = "http://www.w3.org/2000/svg";
  function sv(tag, a, txt) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function dob(d) { return new Date(d + "T12:00:00Z"); }
  function fD(d) { var x = dob(d); return MON[x.getUTCMonth()] + " " + x.getUTCDate(); }
  function fDW(d) { return WD[dob(d).getUTCDay()] + " " + fD(d); }
  function sg(v, dp) { if (v == null) return "—"; var a = Math.abs(v).toFixed(dp || 0); return (+a === 0 ? "" : v > 0 ? "+" : "−") + a; }
  function money(m) { return m >= 1000 ? "$" + (m / 1000).toFixed(2) + "B" : m >= 10 ? "$" + m.toFixed(0) + "M" : "$" + m.toFixed(1) + "M"; }
  var LAB = { buy: "BUY", watch_up: "WATCH UP", watch_out: "WATCH OUT", sell: "SELL" };
  var KIND = { sector: "sector", theme: "theme", fund: "funds" };
  function tilt(gi, d) { var v = W.tilt[gi][d]; return v == null ? 0 : v; }
  function cnt(gi, d) { return W.cnt[gi][d] || [0, 0, G[gi].n]; }
  function px(gi, d) { return R.px[gi][d]; }


  function load(keep) {
    return fetch(BASE + "gexrot.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        var wasLatest = !R || cur === N - 1, oldDay = R && R.days[cur];
        R = d; N = R.days.length; G = R.groups; NG = G.length;
        GS = G.map(function () { return {}; });
        Object.keys(R.mem).forEach(function (s) { R.mem[s][2].forEach(function (gi) { GS[gi][s] = 1; }); });
        var all = [].concat.apply([], R.px).filter(function (v) { return v != null; });
        PMIN = Math.floor(Math.min(0, Math.min.apply(null, all)) - 1); PMAX = Math.ceil(Math.max(0, Math.max.apply(null, all)) + 1);
        var hs = readHash();
        if (!keep) { H = R.hs.indexOf(hs.h) >= 0 ? hs.h : R.default_h; }
        else if (R.hs.indexOf(H) < 0) H = R.default_h;
        var di = keep ? (wasLatest ? N - 1 : R.days.indexOf(oldDay)) : (hs.d ? R.days.indexOf(hs.d) : -1);
        cur = di >= 0 ? di : N - 1;
        gsel = -1;
        var gid = keep ? (gselId || null) : hs.g;
        if (gid) gsel = G.map(function (g) { return g.id; }).indexOf(gid);
        gselId = gsel >= 0 ? G[gsel].id : null;
        if (!keep) view = hs.v === "rec" ? "rec" : "board";
        setWindow(H, true);
        ticks(); status();
        showView();
        setDay(cur, false);
      });
  }
  var gselId = null;
  function setWindow(nh, quiet) {
    H = nh; W = R.win[H];
    onList = { c: W.lists.map(function (L) { return set(L.c); }), p: W.lists.map(function (L) { return set(L.p); }) };
    TMAX = Math.max(10, 5 * Math.ceil(Math.max.apply(null, W.tilt.map(function (a) { return Math.max.apply(null, a.map(function (v) { return Math.abs(v || 0); })); })) / 5));
    var box = $("#wsw"); box.textContent = "";
    R.hs.forEach(function (x) { var b = h("button", x === H ? "on" : "", x); b.setAttribute("aria-pressed", x === H); b.addEventListener("click", function () { if (x !== H) { stop(); setWindow(x); } }); box.appendChild(b); });
    if (rows.length !== NG) buildTide();
    buildUnfold();
    if (gsel >= 0 && $("#gvHead").firstChild) buildGroup();
    if (!quiet) { setDay(cur, false); }
  }
  function set(L) { var o = {}; L.forEach(function (r) { o[r[0]] = r; }); return o; }


  function status(st) {
    var dot = $("#status b"), t = $("#stxt");
    var b = new Date(R.built), bt = isNaN(b) ? "" : " · built " + ("0" + b.getHours()).slice(-2) + ":" + ("0" + b.getMinutes()).slice(-2);
    t.textContent = fD(R.day) + " close · OI " + (R.settle ? fD(R.settle) : "?") + " settle" + bt;
    dot.className = st && st.ok === false ? "err" : "";
    dot.title = st && st.error ? st.error : "";
    var lb = $("#liveb"); lb.textContent = "";
    if (R.live) { var x = h("span", "badge live", "live board"); x.title = "the newest point is GEX Hunt's live board (newer than its last saved evening board)"; lb.appendChild(x); }
  }
  function poll() {
    fetch(BASE + "status.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
      if (R && st.built && st.built !== R.built) { REC = null; load(true).then(function () { status(st); }); }
      else if (R) status(st);
    }).catch(function () { var dot = $("#status b"); if (dot) dot.className = "stale"; });
  }


  function chip(r, side, extra) {
    var a = h("a", "chip " + side + " " + (r[1] ? "m" : "n") + (extra ? " " + extra : ""), r[0]);
    a.href = HUNT + "&s=" + encodeURIComponent(r[0]) + "&h=" + encodeURIComponent(H) + "&x=" + (side === "c" ? "pos" : "neg");
    a.target = "_blank"; a.rel = "noopener";
    var m = R.mem[r[0]];
    a.title = (m ? m[0] + " · " + m[1] + "\n" : "") + (side === "c" ? "Call list: " : "Put list: ") + (r[1] ? "match, score " + r[2] : "near miss") + " · stack " + money(r[3]);
    return a;
  }
  function rowChips(box, gi, side, k) {


    box.textContent = "";
    var L = W.lists[cur][side].filter(function (r) { return GS[gi][r[0]]; });
    var mirror = side === "p" && window.innerWidth >= 920;
    var els = L.slice(0, k).map(function (r) { return chip(r, side); });
    var more = h("span", "more");
    function lay() {
      box.textContent = "";
      var rest = L.slice(els.length);
      more.textContent = rest.length ? "+" + rest.length : "";
      more.title = rest.map(function (r) { return r[0]; }).join(" ");
      var seq = els.slice(); if (rest.length) seq.push(more);
      if (mirror) seq.reverse();
      seq.forEach(function (e) { box.appendChild(e); });
    }
    function wide() {
      var w = 0, kids = box.children;
      for (var i = 0; i < kids.length; i++) w += kids[i].offsetWidth + (i ? 4 : 0);
      return w > box.clientWidth + 1;
    }
    lay();
    while (els.length > 1 && wide()) { els.pop(); lay(); }
  }


  function tiles() {
    var box = $("#tiles"); box.textContent = "";
    var idx = G.map(function (g, i) { return i; }).filter(function (i) { return G[i].kind !== "fund" && W.tilt[i][cur] != null; });
    idx.sort(function (a, b) { return tilt(b, cur) - tilt(a, cur); });
    var top = idx.filter(function (i) { return tilt(i, cur) > 0; }).slice(0, 3);
    var bot = idx.filter(function (i) { return tilt(i, cur) < 0; }).slice(-3).reverse();
    tile(box, "c", "Calls stacking on", top, function (i) { var c = cnt(i, cur); return c[0] + " of " + c[2]; });
    tile(box, "p", "Puts stacking on", bot, function (i) { var c = cnt(i, cur); return c[1] + " of " + c[2]; });
    var t = h("div", "tile s"); t.appendChild(h("div", "lb", "Biggest shift, last 5 sessions"));
    if (cur >= 5) {
      var best = null;
      for (var i = 0; i < NG; i++) {
        if (G[i].kind === "fund" || W.tilt[i][cur] == null || W.tilt[i][cur - 5] == null) continue;
        var d = W.tilt[i][cur] - W.tilt[i][cur - 5]; if (!best || Math.abs(d) > Math.abs(best[1])) best = [i, d];
      }
      if (best) {
        var vv = h("div", "vv"), sp = h("span", null, G[best[0]].short); sp.appendChild(h("i", null, sg(best[1]) + " toward " + (best[1] > 0 ? "calls" : "puts"))); vv.appendChild(sp); t.appendChild(vv);
        t.appendChild(h("div", "ss", "tilt " + sg(W.tilt[best[0]][cur - 5]) + " on " + fD(R.days[cur - 5]) + " → " + sg(W.tilt[best[0]][cur]) + " on " + fD(R.days[cur])));
        sp.style.cursor = "pointer"; sp.addEventListener("click", function () { openGroup(best[0]); });
      }
    } else { t.appendChild(h("div", "ss", "needs 5 sessions")); }
    box.appendChild(t);
  }
  function tile(box, cls, lb, list, sub) {
    var t = h("div", "tile " + cls); t.appendChild(h("div", "lb", lb));
    var vv = h("div", "vv");
    if (!list.length) vv.appendChild(h("span", null, "none"));
    list.forEach(function (i) { var sp = h("span", null, G[i].short); sp.appendChild(h("i", null, sg(tilt(i, cur)))); sp.style.cursor = "pointer"; sp.addEventListener("click", function () { openGroup(i); }); vv.appendChild(sp); });
    t.appendChild(vv);
    t.appendChild(h("div", "ss", list.map(function (i) { return G[i].short + " " + sub(i); }).join(" · ")));
    box.appendChild(t);
  }


  function buildTide() {
    var box = $("#tide"); box.textContent = ""; rows = [];
    var hd = h("div", "trow hd");
    [["Signal", ""], ["Group", ""], ["← on the put list", "r"], ["GEX tilt · calls − puts, vs board", "m"], ["on the call list →", ""], ["5 sess.", "r"], ["Price vs board", "r"]].forEach(function (c) { hd.appendChild(h("div", c[1], c[0])); });
    box.appendChild(hd);
    var body = h("div", "tbody"); box.appendChild(body);
    for (var gi = 0; gi < NG; gi++) {
      var r = h("div", "trow"); r.dataset.g = gi;
      r.appendChild(h("div", "c-pill"));
      var gn = h("div", "gname"), nb = h("b", null, G[gi].short);
      nb.setAttribute("role", "link"); nb.tabIndex = 0;
      (function (i) { nb.addEventListener("click", function () { openGroup(i); }); nb.addEventListener("keydown", function (e) { if (e.key === "Enter") openGroup(i); }); })(gi);
      gn.appendChild(nb); gn.appendChild(h("span")); r.appendChild(gn);
      r.appendChild(h("div", "names l"));
      var trk = h("div", "trk"); ["mid", "bar", "ghost"].forEach(function (c) { trk.appendChild(h("i", c)); }); trk.appendChild(h("span", "val num")); r.appendChild(trk);
      r.appendChild(h("div", "names r"));
      r.appendChild(h("div", "d5 num"));
      var pc = h("div", "pxc num"); pc.appendChild(h("b")); pc.appendChild(h("span")); r.appendChild(pc);
      rows[gi] = r; body.appendChild(r);
    }
  }
  function fillRow(gi) {
    var r = rows[gi], v = tilt(gi, cur), v5 = cur >= 5 && W.tilt[gi][cur - 5] != null ? W.tilt[gi][cur - 5] : null, c = cnt(gi, cur);
    var pc = $(".c-pill", r); pc.textContent = ""; var lab = W.lab[gi][cur];
    var pl = h("span", "pill " + (lab || "none"), lab ? LAB[lab] : "—"); if (lab) pl.title = "Rotation Signals label on " + fD(R.days[cur]); pc.appendChild(pl);
    $(".gname span", r).textContent = KIND[G[gi].kind] + " · " + c[0] + " call · " + c[1] + " put of " + c[2];
    var trk = $(".trk", r), Wd = trk.clientWidth || 300, half = Wd / 2, maxb = Math.max(20, half - 38);
    var bw = Math.min(Math.abs(v), TMAX) / TMAX * maxb;
    var bar = $(".bar", trk); bar.className = "bar " + (v >= 0 ? "pos" : "neg");
    bar.style.left = (v >= 0 ? half : half - bw) + "px"; bar.style.width = bw + "px";
    var gh = $(".ghost", trk), ext = bw, pos = v >= 0;
    if (v5 == null) gh.style.display = "none";
    else {
      var g5 = Math.max(-TMAX, Math.min(TMAX, v5)) / TMAX * maxb;
      gh.style.display = ""; gh.style.left = (half + g5) + "px"; gh.title = "tilt " + sg(v5) + " on " + fD(R.days[cur - 5]);
      if ((g5 >= 0) === pos) ext = Math.max(ext, Math.abs(g5) + 6);
    }
    var val = $(".val", trk); val.textContent = W.tilt[gi][cur] == null ? "—" : sg(v);
    val.style.left = (pos ? half + ext + 6 : half - ext - 6) + "px"; val.style.transform = pos ? "none" : "translateX(-100%)";
    rowChips($(".names.l", r), gi, "p", 4); rowChips($(".names.r", r), gi, "c", 4);
    var d5 = $(".d5", r);
    if (v5 == null) { d5.textContent = "—"; d5.className = "d5 num z"; }
    else { var d = v - v5; d5.textContent = (Math.abs(d) < 0.5 ? "0" : (d > 0 ? "▲ " : "▼ ") + Math.abs(d).toFixed(0)); d5.className = "d5 num " + (Math.abs(d) < 0.5 ? "z" : d > 0 ? "up" : "dn"); d5.title = "tilt change over 5 sessions"; }
    var p = px(gi, cur), p5 = cur >= 5 ? px(gi, cur - 5) : null;
    $(".pxc b", r).textContent = p == null ? "—" : sg(p, 1) + "%";
    $(".pxc span", r).textContent = cur >= 5 && p != null && p5 != null ? "5d " + sg(p - p5, 1) : "since " + fD(R.base);
  }
  function updTide(animate) {
    var body = $("#tide .tbody");
    var order = G.map(function (g, i) { return i; }).sort(function (a, b) { return tilt(b, cur) - tilt(a, cur) || a - b; });
    var first = {};
    if (animate) rows.forEach(function (r, gi) { first[gi] = r.getBoundingClientRect().top; });
    order.forEach(function (gi) { body.appendChild(rows[gi]); });
    for (var gi = 0; gi < NG; gi++) fillRow(gi);
    if (!animate) return;
    rows.forEach(function (r, gi) { var dy = first[gi] - r.getBoundingClientRect().top; if (Math.abs(dy) > 1) { r.style.transition = "none"; r.style.transform = "translateY(" + dy + "px)"; r.style.zIndex = 2; } });
    requestAnimationFrame(function () { requestAnimationFrame(function () { rows.forEach(function (r) { if (r.style.transform) { r.style.transition = "transform .5s cubic-bezier(.2,.7,.2,1)"; r.style.transform = ""; setTimeout(function () { r.style.zIndex = ""; }, 520); } }); }); });
  }


  function fact(el, gi) {
    var t = W.turn[gi];
    el.textContent = "";
    function tx(s) { el.appendChild(document.createTextNode(s)); }
    if (!t) { tx("No big move vs the board since " + fD(R.base) + "."); return; }
    var up = t.dir > 0, mv = (up ? "+" : "−") + Math.abs(t.endv - t.pxv).toFixed(1) + " pts", side = up ? "calls" : "puts";
    if (t.px === R.base) tx("Price " + (up ? "up " : "down ") + mv + " from " + fD(R.base) + ". ");
    else { tx("Price " + (up ? "bottomed " : "peaked ")); el.appendChild(h("b", null, fD(t.px))); tx(", then " + mv + ". "); }
    if (t.state === "never") { tx("GEX never turned to " + side + "."); return; }
    if (t.state === "early") { tx("GEX was already on " + side + " (from "); el.appendChild(h("b", null, fD(t.gex))); tx(")."); return; }
    tx("GEX turned to " + side + " "); el.appendChild(h("b", null, fD(t.gex))); tx(", "); el.appendChild(h("span", "g", t.lag + (t.lag === 1 ? " session" : " sessions") + " later")); tx(".");
  }
  function drawChart(box, gi, big) {
    var old = $("svg", box); if (old) old.remove();
    var Wd = Math.max(200, box.clientWidth - (big ? 28 : 24)), Ht = big ? 300 : 166, L = big ? 38 : 30, RR = 40, top = 8,
        pH = big ? 172 : 80, gap = 18, bTop = top + pH + gap, bH = big ? 76 : 46, span = Wd - L - RR;
    function x(i) { return L + span * (i + 0.5) / N; }
    function yP(v) { return top + (PMAX - v) / (PMAX - PMIN) * pH; }
    var yB0 = bTop + bH / 2;
    function yB(v) { return yB0 - Math.max(-TMAX, Math.min(TMAX, v)) / TMAX * (bH / 2); }
    var s = sv("svg", { viewBox: "0 0 " + Wd + " " + Ht, width: Wd, height: Ht, role: "img", "aria-label": G[gi].short + ": price vs board and GEX tilt by day" });
    var ticks = big ? niceTicks() : [PMAX - 1, PMIN + 1];
    ticks.forEach(function (v) { if (v === 0) return; s.appendChild(sv("line", { x1: L, x2: Wd - RR, y1: yP(v), y2: yP(v), "class": "gl" })); s.appendChild(sv("text", { x: L - 5, y: yP(v) + 3, "text-anchor": "end", "class": "tk" }, (v > 0 ? "+" : "−") + Math.abs(v))); });
    s.appendChild(sv("line", { x1: L, x2: Wd - RR, y1: yP(0), y2: yP(0), "class": "zl" }));
    s.appendChild(sv("text", { x: L - 5, y: yP(0) + 3, "text-anchor": "end", "class": "tk" }, "0%"));
    s.appendChild(sv("line", { x1: L, x2: Wd - RR, y1: yB0, y2: yB0, "class": "zl" }));
    s.appendChild(sv("text", { x: L - 5, y: bTop + 7, "text-anchor": "end", "class": "tk" }, "calls"));
    s.appendChild(sv("text", { x: L - 5, y: bTop + bH - 1, "text-anchor": "end", "class": "tk" }, "puts"));

    var P = R.px[gi], d = "", segs = [], seg = [];
    P.forEach(function (v, i) { if (v == null) { if (seg.length) segs.push(seg); seg = []; } else seg.push(i); });
    if (seg.length) segs.push(seg);
    segs.forEach(function (sgm) {
      var p = sgm.map(function (i, k) { return (k ? "L" : "M") + x(i).toFixed(1) + "," + yP(P[i]).toFixed(1); }).join("");
      s.appendChild(sv("path", { d: p + "L" + x(sgm[sgm.length - 1]).toFixed(1) + "," + yP(0).toFixed(1) + "L" + x(sgm[0]).toFixed(1) + "," + yP(0).toFixed(1) + "Z", "class": "ar" }));
      d += p;
    });
    s.appendChild(sv("path", { d: d, "class": "pl" }));

    var bw = Math.max(2, Math.min(big ? 14 : 9, span / N - 3)), bars = [];
    W.tilt[gi].forEach(function (v, i) {
      if (v == null || Math.abs(v) < 0.5) { bars.push(null); return; }
      var y1 = yB(v), hg = Math.max(1.5, Math.abs(y1 - yB0));
      var b = sv("rect", { x: (x(i) - bw / 2).toFixed(1), y: (v > 0 ? yB0 - hg : yB0).toFixed(1), width: bw.toFixed(1), height: hg.toFixed(1), rx: 1.5, "class": v > 0 ? "bc" : "bp" });
      s.appendChild(b); bars.push(b);
    });

    var tr = W.turn[gi], yL = top + pH + gap / 2 + 1;
    if (tr) {
      var ip = tr.px === R.base ? -1 : R.days.indexOf(tr.px);
      if (ip >= 0 && P[ip] != null) s.appendChild(sv("circle", { cx: x(ip), cy: yP(P[ip]), r: 4, fill: "var(--px)", "class": "mk" }));
      var ig = tr.gex ? R.days.indexOf(tr.gex) : -1;
      if (ig >= 0 && tr.state === "late") {
        var xa = x(Math.max(ip, 0)), xb = x(ig);
        s.appendChild(sv("line", { x1: xa, x2: xb, y1: yL, y2: yL, "class": "lag" }));
        s.appendChild(sv("line", { x1: xa, x2: xa, y1: yL - 3, y2: yL + 3, "class": "lag" }));
        s.appendChild(sv("line", { x1: xb, x2: xb, y1: yL - 3, y2: yL + 3, "class": "lag" }));
        s.appendChild(sv("text", { x: (xa + xb) / 2, y: yL - 4, "text-anchor": "middle", "class": "lagt" }, tr.lag + " sess."));
      }
      if (ig >= 0 && tr.state !== "never" && W.tilt[gi][ig] != null) s.appendChild(sv("circle", { cx: x(ig), cy: yB(W.tilt[gi][ig]), r: 4, fill: tr.dir > 0 ? "var(--call)" : "var(--put)", "class": "mk" }));
    }

    var lp = lastIdx(P);
    if (lp >= 0) s.appendChild(sv("text", { x: x(N - 1) + 7, y: yP(P[lp]) + 3.5, "class": "tkr" }, sg(P[lp], 1)));
    var vt = W.tilt[gi][N - 1];
    if (vt != null) s.appendChild(sv("text", { x: x(N - 1) + 7, y: (Math.abs(vt) < 0.5 ? yB0 : yB(vt)) + 3.5, "class": "tkr" }, sg(vt)));

    var lastX = -1e9, lastLab = null, labs = [];
    R.days.forEach(function (dd, i) { if (i === 0 || i === N - 1 || dob(dd).getUTCDay() === 1) labs.push(i); });
    var minGap = big ? 46 : 64;
    labs.forEach(function (i) {
      var xi = x(i), isLast = i === N - 1;
      if (!isLast && xi - lastX < minGap) return;
      if (isLast && lastLab && xi - lastX < minGap + 4 && lastX > x(0)) lastLab.remove();
      lastLab = sv("text", { x: xi, y: Ht - 2, "text-anchor": i === 0 ? "start" : isLast ? "end" : "middle", "class": "tk" }, fD(R.days[i]));
      s.appendChild(lastLab);
      lastX = xi;
    });

    var cl = sv("line", { x1: x(cur), x2: x(cur), y1: top - 4, y2: bTop + bH + 3, "class": "cur" }); s.appendChild(cl);
    var hl = sv("line", { x1: 0, x2: 0, y1: top - 4, y2: bTop + bH + 3, "class": "hov", visibility: "hidden" }); s.appendChild(hl);
    var ov = sv("rect", { x: L - 4, y: 0, width: span + 8, height: bTop + bH + 6, fill: "transparent" });
    function at(e) { var rc = s.getBoundingClientRect(), sx = (e.clientX - rc.left) * Wd / rc.width; return Math.max(0, Math.min(N - 1, Math.round((sx - L) / span * N - 0.5))); }
    ov.addEventListener("pointermove", function (e) { var i = at(e); hl.setAttribute("x1", x(i)); hl.setAttribute("x2", x(i)); hl.setAttribute("visibility", "visible"); showTip(e, gi, i); });
    ov.addEventListener("pointerleave", function () { hl.setAttribute("visibility", "hidden"); hideTip(); });
    ov.addEventListener("click", function (e) { stop(); setDay(at(e), true); });
    s.appendChild(ov);
    box.appendChild(s);
    return { x: x, cl: cl, bars: bars, gi: gi };
  }
  function niceTicks() { var out = [], st = PMAX - PMIN > 30 ? 10 : 5; for (var v = Math.ceil(PMIN / st) * st; v <= PMAX; v += st) out.push(v); return out; }
  function lastIdx(P) { for (var i = P.length - 1; i >= 0; i--) if (P[i] != null) return i; return -1; }
  function moveChart(c) {
    if (!c) return;
    c.cl.setAttribute("x1", c.x(cur)); c.cl.setAttribute("x2", c.x(cur));
    c.bars.forEach(function (b, i) { if (b) b.setAttribute("class", (W.tilt[c.gi][i] > 0 ? "bc" : "bp") + (i > cur ? " bo" : "")); });
  }
  function buildUnfold() {
    var box = $("#ugrid"); box.textContent = ""; utiles = [];
    var ord = G.map(function (g, i) { return i; }).sort(function (a, b) {
      function sw(i) { var t = W.turn[i]; return t ? Math.abs(t.endv - t.pxv) : 0; }
      return (G[a].kind === "fund") - (G[b].kind === "fund") || sw(b) - sw(a) || a - b;
    });
    ord.forEach(function (gi) {
      var t = h("div", "ut"); t.dataset.g = gi;
      var t1 = h("div", "t1"), nb = h("b", "gl", G[gi].short);
      nb.addEventListener("click", function () { openGroup(gi); });
      t1.appendChild(nb); t1.appendChild(h("span", "kt " + G[gi].kind, KIND[G[gi].kind]));
      t1.appendChild(h("span", "pill")); t1.appendChild(h("span", "r num")); t.appendChild(t1);
      var t2 = h("div", "t2"); fact(t2, gi); t.appendChild(t2);
      box.appendChild(t); utiles.push(t);
    });
    if (boardVisible()) utiles.forEach(function (t) { t._c = drawChart(t, +t.dataset.g, false); });
  }
  function updUnfold() {
    utiles.forEach(function (t) {
      var gi = +t.dataset.g, lab = W.lab[gi][cur], pl = $(".pill", t);
      pl.className = "pill " + (lab || "none"); pl.textContent = lab ? LAB[lab] : ""; pl.style.display = lab ? "" : "none";
      var p = px(gi, cur); $(".r", t).textContent = p == null ? "" : sg(p, 1) + "% vs board";
      if (!t._c && boardVisible()) t._c = drawChart(t, gi, false);
      moveChart(t._c);
    });
  }
  var tip = $("#tip");
  function showTip(e, gi, i) {
    tip.textContent = "";
    tip.appendChild(h("div", "d", G[gi].short + " · " + fDW(R.days[i]) + (R.src[i] === "live" ? " · live board" : "")));
    function rw(key, val, lab) { var r = h("div", "rw"), k = h("i", "k"); k.style.background = key; r.appendChild(k); r.appendChild(h("b", "num", val)); r.appendChild(h("span", null, lab)); tip.appendChild(r); }
    var p = px(gi, i);
    rw("var(--px)", p == null ? "—" : sg(p, 1) + "%", "price vs board since " + fD(R.base));
    var v = W.tilt[gi][i], c = cnt(gi, i);
    rw(v != null && v < 0 ? "var(--put)" : "var(--call)", sg(v), "GEX tilt · " + c[0] + " call / " + c[1] + " put of " + c[2]);
    var lab = W.lab[gi][i]; if (lab) rw("transparent", LAB[lab], "Rotation Signals label");
    tip.style.display = "block";
    var tw = tip.offsetWidth, th = tip.offsetHeight, pxx = e.clientX + 14, py = e.clientY + 14;
    if (pxx + tw > window.innerWidth - 8) pxx = e.clientX - tw - 14;
    if (py + th > window.innerHeight - 8) py = e.clientY - th - 14;
    tip.style.left = Math.max(8, pxx) + "px"; tip.style.top = Math.max(8, py) + "px";
  }
  function hideTip() { tip.style.display = "none"; }


  function updMoves() {
    var box = $("#moves"); box.textContent = "";
    var d0 = Math.max(0, cur - 5);
    $("#movesSub").textContent = cur === 0 ? "first session shown" : fD(R.days[d0]) + " → " + fD(R.days[cur]) + " · " + (cur - d0) + " sessions · gold underline = came over from the other list";
    var c0 = onList.c[d0], c1 = onList.c[cur], p0 = onList.p[d0], p1 = onList.p[cur];
    function diff(a, b) { return Object.keys(a).filter(function (s) { return !b[s]; }); }
    col(box, "Joined the call list", "var(--call)", diff(c1, c0).map(function (s) { return [c1[s], p0[s] ? "flip" : ""]; }), "c", "", cur - d0);
    col(box, "Joined the put list", "var(--put)", diff(p1, p0).map(function (s) { return [p1[s], c0[s] ? "flip" : ""]; }), "p", "", cur - d0);
    col(box, "Left the call list", "#5d606b", diff(c0, c1).map(function (s) { return [c0[s], ""]; }), "c", "gone", cur - d0);
    col(box, "Left the put list", "#5d606b", diff(p0, p1).map(function (s) { return [p0[s], ""]; }), "p", "gone", cur - d0);
  }
  function col(box, title, color, items, side, extra, n) {
    var c = h("div", "mc"), h3 = h("h3"), sw = h("span", "sw"); sw.style.background = color; h3.appendChild(sw); h3.appendChild(document.createTextNode(title));
    h3.appendChild(h("i", null, items.length + (items.length === 1 ? " name" : " names"))); c.appendChild(h3);
    if (!items.length) { c.appendChild(h("div", "none", "none")); box.appendChild(c); return; }
    var by = {};
    items.forEach(function (it) { var tg = (R.mem[it[0][0]] || [0, "Other"])[1]; (by[tg] = by[tg] || []).push(it); });
    Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length || (a < b ? -1 : 1); }).forEach(function (tg) {
      var r = h("div", "mrow"), t = h("div", "tg", tg); t.appendChild(h("b", null, String(by[tg].length))); r.appendChild(t);
      var cs = h("div", "cs");
      by[tg].sort(function (a, b) { return b[0][1] - a[0][1] || b[0][3] - a[0][3]; }).forEach(function (it) {
        var ch = chip(it[0], side, [extra, it[1]].filter(Boolean).join(" "));
        if (it[1]) ch.title += "\nwas on the " + (side === "c" ? "put" : "call") + " list " + n + " sessions earlier";
        cs.appendChild(ch);
      });
      r.appendChild(cs); c.appendChild(r);
    });
    box.appendChild(c);
  }


  function daysOn(side, s, upto) { var n = 0; for (var d = 0; d <= upto; d++) if (onList[side][d][s]) n++; return n; }
  function updTops() {
    var box = $("#tops"); box.textContent = "";
    $("#topSub").textContent = "highest-scoring matches on " + fD(R.days[cur]) + " · days on the list out of the " + (cur + 1) + " sessions shown";
    [["c", "Call list · top matches"], ["p", "Put list · top matches"]].forEach(function (sd) {
      var side = sd[0], c = h("div", "lc"); c.appendChild(h("h3", null, sd[1]));
      var tb = h("table", "lt"), thead = h("thead"), tr = h("tr");
      [["#", "r"], ["Name", ""], ["", "nm"], ["Theme", ""], ["Score", "r"], ["Stack", "r"], ["On the list", ""]].forEach(function (x) { tr.appendChild(h("th", x[1], x[0])); });
      thead.appendChild(tr); tb.appendChild(thead);
      var body = h("tbody"), L = W.lists[cur][side].filter(function (r) { return r[1]; }).slice(0, 10);
      if (!L.length) { var e = h("tr"), td0 = h("td", "none", "no matches"); td0.colSpan = 7; e.appendChild(td0); body.appendChild(e); }
      L.forEach(function (r, k) {
        var row = h("tr"), dn = daysOn(side, r[0], cur);
        row.appendChild(h("td", "r num", String(k + 1)));
        var td1 = h("td"); td1.appendChild(chip(r, side)); row.appendChild(td1);
        row.appendChild(h("td", "nm", (R.mem[r[0]] || [r[0]])[0]));
        row.appendChild(h("td", null, (R.mem[r[0]] || [0, ""])[1]));
        row.appendChild(h("td", "r num", r[2].toFixed(1)));
        row.appendChild(h("td", "r num", money(r[3])));
        var td = h("td"), dl = h("span", "dl"), bar = h("i"), em = h("em"); em.style.width = (100 * dn / (cur + 1)).toFixed(0) + "%"; bar.appendChild(em); dl.appendChild(bar); dl.appendChild(h("span", "num", dn + "/" + (cur + 1))); td.appendChild(dl); row.appendChild(td);
        body.appendChild(row);
      });
      tb.appendChild(body); c.appendChild(tb); box.appendChild(c);
    });
  }


  function openGroup(gi) { stop(); gsel = gi; gselId = G[gi].id; writeHash(true); showView(); window.scrollTo(0, 0); }
  function closeGroup() { gsel = -1; gselId = null; writeHash(true); showView(); }
  function boardVisible() { return !document.body.classList.contains("g") && !document.body.classList.contains("rec"); }
  function setView(v) {
    if (v === view) return;
    stop(); view = v;
    if (v === "rec") { gsel = -1; gselId = null; }
    writeHash(true); showView(); window.scrollTo(0, 0);
    if (v === "board") setDay(cur, false);
  }
  function showView() {
    var rec = view === "rec";
    document.body.classList.toggle("rec", rec);
    [].forEach.call(document.querySelectorAll("#vtabs button"), function (b) { b.classList.toggle("on", b.dataset.v === view); });
    if (rec) { document.body.classList.remove("g"); renderRecord(); return; }
    var on = gsel >= 0;
    document.body.classList.toggle("g", on);
    if (on) { buildGroup(); updGroup(); }
    else { gchart = null; utiles.forEach(function (t) { if (!t._c) t._c = drawChart(t, +t.dataset.g, false); }); updUnfold(); updTide(false); }
  }
  function buildGroup() {
    var gi = gsel, hd = $("#gvHead"); hd.textContent = "";
    var b = h("button", "back", "← All groups"); b.addEventListener("click", closeGroup); hd.appendChild(b);
    hd.appendChild(h("h1", null, G[gi].name)); hd.appendChild(h("span", "kt " + G[gi].kind, KIND[G[gi].kind]));
    hd.appendChild(h("span", "pill")); if (G[gi].etf) hd.appendChild(h("span", "etf", G[gi].etf));
    var r = h("div", "r"); r.appendChild(h("b")); r.appendChild(h("span")); hd.appendChild(r);
    fact($("#gvFact"), gi);
    var box = $("#gvChart"); box.textContent = ""; gchart = drawChart(box, gi, true);
  }
  function updGroup() {
    var gi = gsel; if (gi < 0) return;
    var lab = W.lab[gi][cur], pl = $("#gvHead .pill");
    pl.className = "pill " + (lab || "none"); pl.textContent = lab ? LAB[lab] : ""; pl.style.display = lab ? "" : "none";
    var p = px(gi, cur), c = cnt(gi, cur);
    $("#gvHead .r b").textContent = p == null ? "—" : sg(p, 1) + "% vs board";
    $("#gvHead .r span").textContent = "tilt " + sg(W.tilt[gi][cur]) + " · " + c[0] + " call · " + c[1] + " put of " + c[2] + " on " + fD(R.days[cur]);
    moveChart(gchart);

    var seen = {};
    for (var d = 0; d < N; d++) ["c", "p"].forEach(function (sd) { W.lists[d][sd].forEach(function (r) { if (GS[gi][r[0]]) seen[r[0]] = 1; }); });
    var syms = Object.keys(seen).map(function (s) {
      var st = [], nc = 0, np = 0;
      for (var d = 0; d < N; d++) {
        var a = onList.c[d][s], q = onList.p[d][s];
        st.push(a ? (a[1] ? "cm" : "cn") : q ? (q[1] ? "pm" : "pn") : "");
        if (d <= cur) { if (a) nc++; if (q) np++; }
      }
      var now = onList.c[cur][s] ? ["c", onList.c[cur][s]] : onList.p[cur][s] ? ["p", onList.p[cur][s]] : null;
      return { s: s, st: st, nc: nc, np: np, now: now };
    });
    function rank(x) { return !x.now ? 4 : x.now[0] === "c" ? (x.now[1][1] ? 0 : 1) : (x.now[1][1] ? 2 : 3); }
    syms.sort(function (a, b) { return rank(a) - rank(b) || (b.now && a.now ? b.now[1][2] - a.now[1][2] : 0) || (b.nc + b.np) - (a.nc + a.np) || (a.s < b.s ? -1 : 1); });
    var sb = N - 1, sa = 0;
    if (window.innerWidth < 600 && N > 20) { sb = Math.min(N - 1, Math.max(cur + 4, 19)); sa = Math.max(0, sb - 19); }
    $("#gvSub").textContent = "one square per session, " + fD(R.days[sa]) + " → " + fD(R.days[sb]) + " · teal = call list, red = put list, light = near miss · white ring = " + fD(R.days[cur]);
    var tb = h("table", "mt"), thead = h("thead"), tr = h("tr");
    [["Name", ""], ["", "nm"], ["Theme", "tg"], ["Sessions on the lists", ""], ["Calls", "r"], ["Puts", "r"], ["On " + fD(R.days[cur]), ""]].forEach(function (x) { tr.appendChild(h("th", x[1], x[0])); });
    thead.appendChild(tr); tb.appendChild(thead);
    var body = h("tbody");
    syms.forEach(function (x) {
      var row = h("tr"), side = x.now ? x.now[0] : (x.nc >= x.np ? "c" : "p");
      var last = x.now ? x.now[1] : [x.s, 0, 0, 0];
      var td = h("td"), ch = chip(last, side, x.now ? "" : "gone");
      if (!x.now) ch.title = (R.mem[x.s] || [x.s])[0] + "\non neither list on " + fD(R.days[cur]);
      td.appendChild(ch); row.appendChild(td);
      row.appendChild(h("td", "nm", (R.mem[x.s] || [x.s])[0]));
      row.appendChild(h("td", "tg", (R.mem[x.s] || [0, ""])[1]));
      var tds = h("td"), strip = h("span", "strip");
      x.st.forEach(function (c, i) { if (i < sa || i > sb) return; var e = h("i", (c || "") + (i === cur ? " cur" : "") + (i > cur ? " fut" : "")); e.title = fD(R.days[i]) + ": " + ({ cm: "call match", cn: "call near miss", pm: "put match", pn: "put near miss" }[c] || "not listed"); strip.appendChild(e); });
      tds.appendChild(strip); row.appendChild(tds);
      row.appendChild(h("td", "r num", String(x.nc))); row.appendChild(h("td", "r num", String(x.np)));
      var nw = x.now ? (x.now[0] === "c" ? "call" : "put") + " · " + (x.now[1][1] ? "match " + x.now[1][2].toFixed(1) : "near miss") + " · " + money(x.now[1][3]) : "—";
      row.appendChild(h("td", "now " + (x.now ? x.now[0] : "z"), nw));
      body.appendChild(row);
    });
    if (!syms.length) { var e = h("tr"), td0 = h("td", "none", "no member was on either list in the sessions shown"); td0.colSpan = 7; e.appendChild(td0); body.appendChild(e); }
    tb.appendChild(body);
    var wrap = $("#gvTable"); wrap.textContent = ""; wrap.appendChild(tb);
    var never = (G[gi].n || 0) - syms.length;
    $("#gvFoot").textContent = never > 0 ? never + " other members were on neither list in these sessions." : "";
  }



  function pctl(v) { return v == null ? "—" : sg(100 * v, 1) + "%"; }
  function gshort(id) { var g = G.filter(function (x) { return x.id === id; })[0]; return g ? g.short : String(id || "").split(":").pop(); }
  function huntLink(s, side, extra) {
    var a = h("a", "chip " + side + " m" + (extra ? " " + extra : ""), s);
    a.href = HUNT + "&s=" + encodeURIComponent(s) + "&h=1Y%2B&x=" + (side === "c" ? "pos" : "neg");
    a.target = "_blank"; a.rel = "noopener"; a.title = (R && R.mem[s] ? R.mem[s][0] : s) + " · GEX Hunt chart";
    return a;
  }
  function renderRecord() {
    var box = $("#rview");
    if (!REC) {
      box.textContent = ""; box.appendChild(h("div", "empty", "Loading the record…"));
      fetch(BASE + "record.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) { REC = d; if (view === "rec") renderRecord(); })
        .catch(function (e) { box.textContent = ""; box.appendChild(h("div", "empty", "No record yet (" + e.message + ").")); });
      return;
    }
    box.textContent = "";
    box.appendChild(h("div", "q", "Do GEX Hunt’s top names beat look-alikes from here?"));
    var sub = h("div", "rsub");
    sub.textContent = "Each evening’s lists are frozen before they can be bought (entry at the next close), then scored after 5 and 10 sessions. Started with the " +
      fD(REC.rules.fwd_start) + " board · newest close " + (REC.newest_close ? fD(REC.newest_close) : "?") + ".";
    box.appendChild(sub);
    var sw = h("div", "hsw");
    ["5", "10"].forEach(function (k) { var b = h("button", k === hold ? "on" : "", k + " sessions"); b.addEventListener("click", function () { hold = k; renderRecord(); }); sw.appendChild(b); });
    box.appendChild(sw);
    var cards = h("div", "rcards");
    cards.appendChild(listCard("A", "Held through the drop", "The top call names by score that stayed on the call list through most of the last two weeks", "while their group was falling"));
    cards.appendChild(listCard("P", "Puts held through the rally", "The same rule on the put list · + = the put list was right", "while their group was rising"));
    cards.appendChild(bCard());
    box.appendChild(cards);
    if (REC.missed && REC.missed.length) box.appendChild(h("div", "rnote", "Not frozen (the data landed after the entry close): " + REC.missed.join(", ")));
    latestLists(box);
    pickLog(box);
  }
  function cardLine(c, a, b) { var r = h("div", "ln"); r.appendChild(h("span", null, a)); r.appendChild(h("b", "num", b)); c.appendChild(r); }
  function listCard(key, title, rule, dropLabel) {
    var S = REC.summary[key], x = S.all[hold], hx = REC.history[key].all[hold], c = h("div", "rcard");
    c.appendChild(h("h3", null, title)); c.appendChild(h("div", "rs", rule));
    var big = h("div", "big");
    if (x.closed) { big.textContent = pctl(x.vs_look); big.classList.add(x.vs_look >= 0 ? "pos" : "neg"); }
    else { big.textContent = "No closed picks yet"; big.classList.add("na"); }
    c.appendChild(big);
    c.appendChild(h("div", "rs", x.closed ? "vs look-alikes over " + hold + " sessions · " + x.closed + " closed picks" + (x.open ? " · " + x.open + " open" : "") :
      (x.open ? x.open + " open picks · so far " + pctl(x.open_vs_look) + " vs look-alikes" : "the first picks are bought at the next close")));
    cardLine(c, "vs own group", x.n_group ? pctl(x.vs_group) + " · beat " + x.beat_group + " of " + x.n_group : "—");
    cardLine(c, "vs look-alikes", x.n_look ? pctl(x.vs_look) + " · beat " + x.beat_look + " of " + x.n_look : "—");
    cardLine(c, "one vote per name", x.names ? pctl(x.per_name) + " · " + x.names_pos + " of " + x.names + " names" : "—");
    var L = S.all.level;
    cardLine(c, "first level reached (10 sessions)", L.closed ? L.hits + " of " + L.closed + " · options priced " + L.expected : "—");
    var dx = S.drop[hold];
    cardLine(c, dropLabel, dx.closed ? pctl(dx.vs_look) + " vs look-alikes · " + dx.closed + " picks" : "—");
    c.appendChild(h("div", "hist", "Month before the record (" + fD(REC.history.first) + "–" + fD(REC.history.last) + ", same rules, outside the record): " +
      hold + " sessions vs look-alikes " + pctl(hx.vs_look) + " (beat " + hx.beat_look + " of " + hx.n_look + "), one vote per name " + pctl(hx.per_name) +
      " (" + hx.names_pos + " of " + hx.names + " names)."));
    return c;
  }
  function bCard() {
    var x = REC.summary.B[hold], hx = REC.history.B[hold], c = h("div", "rcard");
    c.appendChild(h("h3", null, "Call-heavy names"));
    c.appendChild(h("div", "rs", "In each sector, the names with the most calls in their open contracts minus the names with the fewest"));
    var big = h("div", "big");
    if (x.closed) { big.textContent = pctl(x.ls); big.classList.add(x.ls >= 0 ? "pos" : "neg"); }
    else { big.textContent = "No closed days yet"; big.classList.add("na"); }
    c.appendChild(big);
    c.appendChild(h("div", "rs", x.closed ? "most minus fewest calls over " + hold + " sessions · " + x.closed + " days" : "scored from the first frozen day"));
    cardLine(c, "days positive", x.closed ? x.ls_pos + " of " + x.closed : "—");
    cardLine(c, "rank correlation, call share vs return", x.ic == null ? "—" : sg(x.ic, 3) + " · positive " + x.ic_pos + " of " + x.closed);
    c.appendChild(h("div", "hist", "Month before the record (" + fD(REC.history.first) + "–" + fD(REC.history.last) + ", same rules, outside the record): " +
      hold + " sessions " + pctl(hx.ls) + " (" + hx.ls_pos + " of " + hx.closed + " days), rank correlation " + (hx.ic == null ? "—" : sg(hx.ic, 3)) + "."));
    return c;
  }
  function latestLists(box) {
    var d = REC.days[0], sec = h("div", "sec"), hd = h("div", "h2");
    hd.appendChild(h("b", null, d ? "Latest lists · " + fD(d.day) + " board" : "No frozen lists yet"));
    if (d) {
      var any = (d.A || []).concat(d.P || [])[0], e = any && any.out && any.out.entry;
      hd.appendChild(h("span", null, e ? "bought at the " + fD(e) + " close" : "bought at the next close"));
    }
    sec.appendChild(hd);
    if (!d) { box.appendChild(sec); return; }
    var grid = h("div", "lgrid");
    grid.appendChild(pickTable("Calls held through the drop", d.A, "c"));
    grid.appendChild(pickTable("Puts held through the rally", d.P, "p"));
    sec.appendChild(grid);
    var bc = h("div", "lc bl"); bc.appendChild(h("h3", null, "Most vs fewest calls in open contracts, by sector"));
    if (!d.B) bc.appendChild(h("div", "none pad", "Waiting for that day’s open-interest snapshot (it lands the next evening, before the entry close)."));
    else {
      var tb = h("table", "lt"), tr = h("tr");
      [["Sector", ""], ["Most calls", ""], ["Fewest calls", ""]].forEach(function (x) { tr.appendChild(h("th", x[1], x[0])); });
      var th = h("thead"); th.appendChild(tr); tb.appendChild(th);
      var body = h("tbody"), o = d.B.out && d.B.out.h && d.B.out.h[hold];
      Object.keys(d.B.sectors).sort(function (a, b) { return gshort(a) < gshort(b) ? -1 : 1; }).forEach(function (g) {
        var x = d.B.sectors[g], row = h("tr");
        row.appendChild(h("td", null, gshort(g)));
        var t1 = h("td"), t2 = h("td");
        x.top.forEach(function (s) { t1.appendChild(huntLink(s, "c", "sm")); });
        x.bot.forEach(function (s) { t2.appendChild(huntLink(s, "p", "sm")); });
        row.appendChild(t1); row.appendChild(t2);
        body.appendChild(row);
      });
      tb.appendChild(body); var wrap = h("div", "tw"); wrap.appendChild(tb); bc.appendChild(wrap);
      if (o) bc.appendChild(h("div", "rnote pad", "All sectors so far: most minus fewest " + pctl(o.ls) + (o.closed ? "" : " (open)") + ", rank correlation " + (o.ic == null ? "—" : sg(o.ic, 3)) + "."));
    }
    sec.appendChild(bc);
    box.appendChild(sec);
  }
  function pickTable(title, picks, side) {
    var c = h("div", "lc"); c.appendChild(h("h3", null, title));
    if (!picks) { c.appendChild(h("div", "none pad", "not frozen")); return c; }
    if (!picks.length) { c.appendChild(h("div", "none pad", "no name met the rule that day")); return c; }
    var tb = h("table", "lt"), tr = h("tr");
    [["Name", ""], ["#", "r"], ["On list", "r"], ["Group, 5 sess.", ""], ["First level", ""], ["Look-alikes", "nm"], ["So far vs look-alikes", "r"]].forEach(function (x) { tr.appendChild(h("th", x[1], x[0])); });
    var th = h("thead"); th.appendChild(tr); tb.appendChild(th);
    var body = h("tbody");
    picks.forEach(function (p) {
      var row = h("tr"), t0 = h("td"); t0.appendChild(huntLink(p.s, side)); row.appendChild(t0);
      row.appendChild(h("td", "r num", String(p.rank)));
      row.appendChild(h("td", "r num", p.days_on + "/" + p.of));
      var tg = h("td"); tg.appendChild(document.createTextNode(gshort(p.group) + " " + pctl(p.g5)));
      if (p.drop) tg.appendChild(h("span", "badge drop", side === "c" ? "falling" : "rising"));
      row.appendChild(tg);
      var lv = p.out && p.out.level, lt = "—";
      if (p.k1 && p.spot) lt = p.k1 + " · " + sg(100 * (p.k1 / p.spot - 1), 1) + "%" + (lv ? " · odds " + Math.round(100 * lv.odds) + "%" : "") + (lv && lv.hit ? " · reached " + fD(lv.hit) : "");
      row.appendChild(h("td", lv && lv.hit ? "hit" : null, lt));
      row.appendChild(h("td", "nm muted", (p.look || []).join(" ")));
      var o = p.out && p.out.h && p.out.h[hold];
      row.appendChild(h("td", "r num" + (o && o.vs_look != null ? (o.vs_look >= 0 ? " pos" : " neg") : ""), o ? pctl(o.vs_look) + (o.closed ? "" : " open") : "not bought yet"));
      body.appendChild(row);
    });
    tb.appendChild(body); var wrap = h("div", "tw"); wrap.appendChild(tb); c.appendChild(wrap);
    return c;
  }
  function pickLog(box) {
    var rowsAll = [];
    REC.days.forEach(function (d) {
      [["A", "c", "calls"], ["P", "p", "puts"]].forEach(function (k) { (d[k[0]] || []).forEach(function (p) { rowsAll.push([d.day, k[1], k[2], p]); }); });
    });
    var sec = h("div", "sec"), hd = h("div", "h2");
    hd.appendChild(h("b", null, "Every frozen pick")); hd.appendChild(h("span", null, rowsAll.length + " picks · returns signed so + = the list was right"));
    sec.appendChild(hd);
    if (!rowsAll.length) { sec.appendChild(h("div", "none", "none yet")); box.appendChild(sec); return; }
    var c = h("div", "lc"), tb = h("table", "lt"), tr = h("tr");
    [["Board", ""], ["List", ""], ["Name", ""], ["5 sess. vs group", "r"], ["vs look-alikes", "r"], ["10 sess. vs group", "r"], ["vs look-alikes", "r"], ["First level", ""]].forEach(function (x) { tr.appendChild(h("th", x[1], x[0])); });
    var th = h("thead"); th.appendChild(tr); tb.appendChild(th);
    var body = h("tbody");
    rowsAll.forEach(function (x) {
      var p = x[3], row = h("tr");
      row.appendChild(h("td", "num", fD(x[0]))); row.appendChild(h("td", "muted", x[2]));
      var t = h("td"); t.appendChild(huntLink(p.s, x[1])); row.appendChild(t);
      ["5", "10"].forEach(function (k) {
        var o = p.out && p.out.h && p.out.h[k];
        ["vs_group", "vs_look"].forEach(function (f) {
          var v = o ? o[f] : null;
          row.appendChild(h("td", "r num" + (v == null ? " muted" : v >= 0 ? " pos" : " neg") + (o && !o.closed ? " open" : ""), o ? pctl(v) : "—"));
        });
      });
      var lv = p.out && p.out.level;
      row.appendChild(h("td", lv && lv.hit ? "hit" : "muted", !lv ? "—" : lv.hit ? "reached " + fD(lv.hit) : lv.closed ? "no" : "open"));
      body.appendChild(row);
    });
    tb.appendChild(body); var wrap = h("div", "tw"); wrap.appendChild(tb); c.appendChild(wrap); sec.appendChild(c);
    sec.appendChild(h("div", "rnote", "Open windows show the return so far (lighter). Look-alikes are frozen with each pick: a few names in the same sector, not on that list that day, that move and have moved most like it."));
    box.appendChild(sec);
  }


  var slider = $("#slider");
  function ticks() {
    var box = $("#rticks"); box.textContent = ""; var k = 0;
    R.days.forEach(function (d, i) {
      var pos = (N > 1 ? 100 * i / (N - 1) : 0) + "%", dot = h("i"); dot.style.left = pos; box.appendChild(dot);
      if (i === 0 || dob(d).getUTCDay() === 1) { var sp = h("span", k % 2 ? "wk2" : "", fD(d)); sp.style.left = pos; box.appendChild(sp); k++; }
    });
  }
  function setDay(i, animate) {
    cur = Math.max(0, Math.min(N - 1, i));
    slider.max = N - 1; slider.value = cur;
    var pc = N > 1 ? 100 * cur / (N - 1) : 100;
    slider.style.setProperty("--trk", "linear-gradient(90deg,#4c3f8f " + pc + "%,#2a2e39 " + pc + "%)");
    $("#dayB").textContent = fDW(R.days[cur]);
    $("#dayS").textContent = cur === N - 1 ? (R.src[cur] === "live" ? "live board" : "latest close") : (N - 1 - cur) + " sessions before latest";
    $("#tideH").textContent = "The tide · " + fD(R.days[cur]) + " close" + (R.src[cur] === "live" ? " (live board)" : "");
    if (gsel >= 0) updGroup();
    else { tiles(); updTide(animate); updUnfold(); updMoves(); updTops(); }
    writeHash(false);
  }
  function readHash() {
    var o = {}; (location.hash || "").replace(/^#/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    return o;
  }
  function writeHash(push) {
    var parts = [];
    if (view === "rec") parts.push("v=rec");
    else {
    if (H && R && H !== R.default_h) parts.push("h=" + encodeURIComponent(H));
    if (R && cur !== N - 1) parts.push("d=" + R.days[cur]);
    if (gsel >= 0) parts.push("g=" + encodeURIComponent(G[gsel].id));
    }
    var url = location.pathname + location.search + (parts.length ? "#" + parts.join("&") : "");
    try { if (push) history.pushState({ g: gsel >= 0 ? G[gsel].id : null }, "", url); else history.replaceState(history.state, "", url); } catch (e) {}
  }
  window.addEventListener("popstate", function () {
    if (!R) return;
    var o = readHash(), gi = o.g ? G.map(function (g) { return g.id; }).indexOf(o.g) : -1;
    view = o.v === "rec" ? "rec" : "board";
    gsel = view === "rec" ? -1 : gi; gselId = gsel >= 0 ? G[gsel].id : null;
    var nh = R.hs.indexOf(o.h) >= 0 ? o.h : R.default_h;
    if (nh !== H) setWindow(nh, true);
    var di = o.d ? R.days.indexOf(o.d) : N - 1;
    showView(); setDay(di >= 0 ? di : N - 1, false);
  });
  slider.addEventListener("input", function () { stop(); setDay(+slider.value, true); });
  $("#latest").addEventListener("click", function () { stop(); setDay(N - 1, true); });
  function stop() { if (timer) { clearInterval(timer); timer = null; } $("#play").classList.remove("on"); $("#play").innerHTML = "&#9654;"; }
  $("#play").addEventListener("click", function () {
    if (timer) { stop(); return; }
    if (cur >= N - 1) setDay(0, true);
    $("#play").classList.add("on"); $("#play").innerHTML = "&#10074;&#10074;";
    timer = setInterval(function () { if (cur >= N - 1) { stop(); return; } setDay(cur + 1, true); }, 900);
  });
  document.addEventListener("keydown", function (e) {
    if (!R || view === "rec" || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    if (e.key === "ArrowLeft") { stop(); setDay(cur - 1, true); } else if (e.key === "ArrowRight") { stop(); setDay(cur + 1, true); }
    else if (e.key === "Escape" && gsel >= 0) closeGroup();
  });
  var rt = null;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (!R) return;
      if (view === "rec") { utiles.forEach(function (t) { var o = $("svg", t); if (o) o.remove(); t._c = null; }); return; }
      if (gsel >= 0) {
        var box = $("#gvChart"); box.textContent = ""; gchart = drawChart(box, gsel, true); updGroup();
        utiles.forEach(function (t) { var o = $("svg", t); if (o) o.remove(); t._c = null; });
      }
      else { utiles.forEach(function (t) { t._c = drawChart(t, +t.dataset.g, false); }); updUnfold(); for (var gi = 0; gi < NG; gi++) fillRow(gi); }
    }, 150);
  });


  (function links() {
    [].forEach.call(document.querySelectorAll("#vtabs button"), function (b) { b.addEventListener("click", function () { setView(b.dataset.v); }); });
    var xl = $("#xl");
    [["Rotations", "../rotations/"], ["Signals", "../rotation-signals/"], ["GEX Hunt", "../gex-hunt/"]].forEach(function (x) { var a = h("a", null, x[0] + " ↗"); a.href = x[1]; a.target = "_blank"; a.rel = "noopener"; xl.appendChild(a); });
    var f = $("#foot");
    [["GEX tilt", "the share of a group’s names on GEX Hunt’s call list minus the share on its put list (matches and near misses), minus the same share for the whole board; in points. Teal = calls stacked, red = puts stacked. The same number as the Rotations board."],
     ["Lists", "GEX Hunt’s saved evening boards (each close priced with the previous OI settle); the newest point is its live board when that is newer."],
     ["Price vs board", "the group’s equal-weight return minus the board’s stocks, since the close before the first session shown."],
     ["Signal", "the Rotation Signals label (BUY · WATCH UP · WATCH OUT · SELL) for that close."],
     ["Turn dates", "price = the group’s high or low before its biggest move vs the board in the sessions shown, when that move is big enough; GEX = the first of a few sessions in a row with the tilt clearly on that side."]
    ].forEach(function (x) { var p = h("div"); p.appendChild(h("b", null, x[0] + ": ")); p.appendChild(document.createTextNode(x[1])); f.appendChild(p); });
  })();
  load(false).then(function () { setInterval(poll, 300000); })
    .catch(function (e) {
      var m = document.querySelector(".board"); m.textContent = ""; m.appendChild(h("div", "empty", "No data yet (" + e.message + "). The build runs every 5 minutes."));
      $("#stxt").textContent = "not built yet"; $("#status b").className = "err";
    });
})();
