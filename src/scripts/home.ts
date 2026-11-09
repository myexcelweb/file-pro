import { DEFAULT_TOOLS, normalizeTool, renderCard, renderChips as chipsHtml, searchText, sortTools, esc, type Tool } from "../lib/tools";

const CACHE_KEY = "filepro:tools:v1";
const RECENT_KEY = "filepro:recent:v1";
// SHA-256 of the admin keyword — the keyword itself never ships in the bundle.
const KEY_HASH = "90de13a7d912f3f9a692ab59ec3bb3a1076fd5f8a691235d208ab951dba9ca53";
const KEY_LEN = 13;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const grid = $<HTMLDivElement>("#tool-grid");
const search = $<HTMLInputElement>("#tool-search");
const chips = $<HTMLDivElement>("#tool-chips");
const empty = $<HTMLDivElement>("#tool-empty");
const count = $<HTMLSpanElement>("#tool-count");
const recentWrap = $<HTMLDivElement>("#tool-recent");
const status = $<HTMLSpanElement>("#tool-status");

// The list baked into the HTML at build time (from Firestore, or the built-in list).
function readEmbedded(): Tool[] {
  try {
    const arr = JSON.parse(document.getElementById("tool-data")?.textContent || "[]");
    if (Array.isArray(arr) && arr.length) return arr.map((t: any) => normalizeTool(t, t.id));
  } catch {}
  return DEFAULT_TOOLS;
}
let tools: Tool[] = readEmbedded();
let category = "All";
const index = new Map<string, string>(); // id -> search text

// ---------- data ---------------------------------------------------------
function readCache(): Tool[] | null {
  try {
    const arr = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return Array.isArray(arr) && arr.length ? arr.map((t) => normalizeTool(t, t.id)) : null;
  } catch { return null; }
}

function setTools(list: Tool[]) {
  tools = sortTools(list.filter((t) => t.visible));
  render();
}

function setStatus(text: string, tone: "live" | "warn" | "idle") {
  status.textContent = text;
  status.dataset.tone = tone;
}

// ---------- rendering ----------------------------------------------------
function render() {
  index.clear();
  tools.forEach((t) => index.set(t.id, searchText(t)));
  grid.innerHTML = tools.map(renderCard).join("");
  renderChips();
  renderRecent();
  applyFilter();
}

function renderChips() {
  if (category !== "All" && !tools.some((t) => t.category === category)) category = "All";
  chips.innerHTML = chipsHtml(tools, category);
}

function applyFilter() {
  const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let shown = 0;
  grid.querySelectorAll<HTMLElement>(".tool-card").forEach((card) => {
    const text = index.get(card.dataset.id!) ?? "";
    const ok = (category === "All" || card.dataset.category === category) && terms.every((w) => text.includes(w));
    card.hidden = !ok;
    if (ok) shown++;
  });
  empty.hidden = shown > 0;
  count.textContent = `${shown} of ${tools.length} tools`;
}

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function renderRecent() {
  const items = getRecent().map((id) => tools.find((t) => t.id === id)).filter(Boolean) as Tool[];
  recentWrap.hidden = items.length === 0;
  recentWrap.querySelector(".recent-list")!.innerHTML = items
    .map((t) => `<a class="recent-pill" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" data-open="${esc(t.id)}" style="--c:${t.color}"><i class="fa-solid ${t.icon}"></i>${esc(t.name)}</a>`)
    .join("");
}

function trackOpen(id: string) {
  const list = [id, ...getRecent().filter((x) => x !== id)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  setTimeout(renderRecent, 300);
}

// ---------- events -------------------------------------------------------
search.addEventListener("input", () => { applyFilter(); checkKeyword(search.value); });
search.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // Never auto-open a tool: just close the keyboard and bring the results into view.
    e.preventDefault();
    search.blur();
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (e.key === "Escape") {
    search.value = ""; applyFilter(); search.blur();
  }
});

chips.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".chip");
  if (!btn) return;
  category = btn.dataset.cat!;
  chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === btn)));
  applyFilter();
});

document.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("[data-open]");
  if (a) trackOpen(a.dataset.open!);
});

$<HTMLButtonElement>("#recent-clear").addEventListener("click", () => {
  localStorage.removeItem(RECENT_KEY);
  renderRecent();
});

// "/" or Ctrl/Cmd+K focuses search
document.addEventListener("keydown", (e) => {
  const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
  if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
    e.preventDefault();
    search.focus();
    search.select();
  }
});

// ---------- hidden admin trigger ------------------------------------------
let buffer = "";
let adminOpening = false;

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkKeyword(text: string) {
  if (text.length < KEY_LEN || !crypto?.subtle || adminOpening) return;
  if ((await sha256(text.slice(-KEY_LEN).toLowerCase())) !== KEY_HASH) return;
  adminOpening = true;
  buffer = "";
  if (search.value.length >= KEY_LEN) { search.value = ""; applyFilter(); search.blur(); }
  sessionStorage.setItem("filepro:admin", "1");
  try {
    const { openAdmin } = await import("./admin");
    openAdmin();
  } finally {
    adminOpening = false;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target === search) return; // handled by the input listener (works on mobile keyboards too)
  buffer = (buffer + e.key).slice(-KEY_LEN);
  checkKeyword(buffer);
});

// Re-open shortcut for the current tab session after unlocking once
if (sessionStorage.getItem("filepro:admin") === "1") {
  import("./admin").then(({ mountAdminButton }) => mountAdminButton());
}

// ---------- boot -----------------------------------------------------------
const cached = readCache();
if (cached) { setTools(cached); setStatus("Cached", "idle"); }
else { render(); setStatus("Connecting…", "idle"); }

let serverAnswered = false;
setTimeout(() => { if (!serverAnswered) setStatus(cached ? "Offline · cached" : "Offline", "warn"); }, 10000);

const startLive = () =>
  import("../lib/firebase")
    .then(({ watchTools }) =>
      watchTools(
        (list, meta) => {
          if (!meta.fromCache) serverAnswered = true;
          if (meta.fromCache && list.length === 0) return; // wait for the server's answer
          if (list.length === 0) {
            localStorage.removeItem(CACHE_KEY);
            setTools(DEFAULT_TOOLS);
            setStatus("Built-in list", "idle");
            return;
          }
          localStorage.setItem(CACHE_KEY, JSON.stringify(list));
          setTools(list);
          setStatus(meta.fromCache ? "Cached" : "Live", meta.fromCache ? "idle" : "live");
        },
        () => setStatus(cached ? "Offline · cached" : "Offline", "warn"),
      ),
    )
    .catch(() => setStatus("Offline", "warn"));

// Load Firebase after first paint
// Load Firebase only after the page has fully loaded and the browser is idle,
// so it never competes with the first paint (better Core Web Vitals).
const whenIdle = () =>
  "requestIdleCallback" in window ? (window as any).requestIdleCallback(startLive, { timeout: 3000 }) : setTimeout(startLive, 1000);
if (document.readyState === "complete") whenIdle();
else window.addEventListener("load", whenIdle, { once: true });
