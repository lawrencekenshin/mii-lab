


(function () {
  "use strict";
  const GH = location.hostname === "lawrencekenshin.github.io";
  const BASE = GH ? "https://raw.githubusercontent.com/lawrencekenshin/mii-lab/index-flow-data/index-flow/" : "snap/";
  const STATUS_MS = 120000;
  let status = null, statusAt = 0, statusP = null;
  const memo = new Map();
  async function raw(path, bust) {
    const r = await fetch(BASE + path + "?b=" + encodeURIComponent(bust), { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }
  function getStatus() {
    if (status && Date.now() - statusAt < STATUS_MS) return Promise.resolve(status);
    if (!statusP) statusP = raw("status.json", Math.floor(Date.now() / 60000)).then((s) => { status = s; statusAt = Date.now(); return s; },
      (e) => { if (status) { statusAt = Date.now() - STATUS_MS / 2; return status; } throw e; }).finally(() => { statusP = null; });
    return statusP;
  }
  function file(path, st) {
    const v = (st.files && st.files[path]) || st.v, k = path + "@" + v;
    if (!memo.has(k)) { const p = raw(path, v); memo.set(k, p); p.catch(() => memo.delete(k)); }
    return memo.get(k);
  }
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  function nowET() { const p = {}; for (const x of fmt.formatToParts(new Date())) p[x.type] = x.value;
    return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}:${p.second}`; }
  function live(st) {
    const t = Date.now() / 1000;
    return { now: nowET(), in_session: (st.sessions || []).some((s) => s[1] <= t && t <= s[2]), fut_open: false, live: {},
      versions: Object.assign({}, st.versions) };
  }
  async function get(u) {
    const url = new URL(u, location.href), p = url.pathname, q = url.searchParams, s = (q.get("s") || "SPY").toUpperCase();
    const st = await getStatus();
    if (p.endsWith("/api/live")) return live(st);
    if (p.endsWith("/api/state")) {
      if (!(st.pages || []).includes(s)) throw new Error("not on this page");
      const [d, mega, vix] = await Promise.all([file(s + ".json", st), file("MEGA.json", st).catch(() => null),
        file("VIX.json", st).catch(() => null)]);
      return Object.assign({}, d, live(st), { mega, vix, v: st.versions[s] });
    }
    if (p.endsWith("/api/chart")) {
      const v = q.get("view") || "5d15m";
      if (!(st.charts || []).includes(s + "." + v)) throw new Error("no chart");
      return file("chart/" + s + "." + v + ".json", st);
    }
    throw new Error("not on this page");
  }
  window.IFDATA = { get };
  function showTab() {
    const t = document.querySelector(".top .tab[aria-current=page]"), row = t && t.parentNode;
    if (!row || row.scrollWidth <= row.clientWidth) return;
    const r0 = row.getBoundingClientRect().left - row.scrollLeft, at = (el) => el.getBoundingClientRect().left - r0;
    const need = at(t) + t.offsetWidth + 8 - row.clientWidth;
    if (need > 0) {
      const edge = Array.from(row.querySelectorAll(".tab"), at).find((x) => x >= need - 0.5);
      row.scrollLeft = edge != null ? edge : need;
    }
    const fade = () => row.classList.toggle("cut-l", row.scrollLeft > 0.5);
    fade(); row.addEventListener("scroll", fade, { passive: true });
  }
  if (document.readyState === "complete") showTab(); else window.addEventListener("load", showTab);
})();
