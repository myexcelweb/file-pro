// Hidden admin panel. Built entirely from JS (no markup in the page HTML) and
// lazy-loaded only after the secret keyword is typed.
//
// Two full-screen views:
//   "list"   – all links with Edit / Hide / Delete / reorder
//   "editor" – add or edit one link, form on the left, live preview on the right
import { CATEGORIES, DEFAULT_TOOLS, esc, hostOf, normalizeTool, renderCard, sortTools, type Tool } from "../lib/tools";

type Fb = typeof import("../lib/firebase");
type View = "list" | "editor";
type Conn = "connecting" | "connected" | "offline" | "error" | "saving";

const ICONS = [
  "fa-link", "fa-globe", "fa-user", "fa-file-lines", "fa-file-pdf", "fa-file-excel", "fa-file-word", "fa-file-export",
  "fa-file-invoice-dollar", "fa-table", "fa-chart-line", "fa-chart-pie", "fa-gavel", "fa-scale-balanced",
  "fa-calendar-days", "fa-hourglass-half", "fa-clipboard-list", "fa-heading", "fa-image", "fa-camera",
  "fa-magnifying-glass", "fa-folder-open", "fa-cloud-arrow-up", "fa-cake-candles", "fa-calculator",
  "fa-database", "fa-users", "fa-building-columns", "fa-robot", "fa-wand-magic-sparkles", "fa-bolt", "fa-house",
];

const CSS = `
.fpa{position:fixed;inset:0;z-index:100;background:var(--bg);color:var(--text);display:flex;flex-direction:column;animation:fpa-in .15s ease-out}
@keyframes fpa-in{from{opacity:0;transform:scale(.99)}to{opacity:1;transform:none}}
.fpa-top{display:flex;align-items:center;gap:14px;padding:12px 24px;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap}
.fpa-top h2{font-weight:800;font-size:1.15rem;display:flex;align-items:center;gap:10px}
.fpa-top h2 i{color:#4f46e5}
.fpa-conn{display:flex;align-items:center;gap:10px;padding:7px 14px;border-radius:12px;font-size:.84rem;border:1px solid;margin-right:auto}
.fpa-conn b{font-weight:700}
.fpa-conn small{opacity:.8}
.fpa-conn .dot{width:10px;height:10px;border-radius:50%;flex:none;background:currentColor}
.fpa-conn[data-s=connected]{color:#047857;background:#ecfdf5;border-color:#a7f3d0}
.fpa-conn[data-s=connected] .dot{box-shadow:0 0 0 4px rgba(16,185,129,.25);animation:fpa-pulse 2s infinite}
.fpa-conn[data-s=saving]{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}
.fpa-conn[data-s=connecting]{color:#b45309;background:#fffbeb;border-color:#fde68a}
.fpa-conn[data-s=offline],.fpa-conn[data-s=error]{color:#b91c1c;background:#fef2f2;border-color:#fecaca}
.dark .fpa-conn{background:transparent!important}
@keyframes fpa-pulse{50%{box-shadow:0 0 0 7px rgba(16,185,129,0)}}
.fpa-spin{animation:fpa-rot 1s linear infinite}@keyframes fpa-rot{to{transform:rotate(360deg)}}
.fpa-bar{display:flex;align-items:center;gap:10px;padding:14px 24px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--surface)}
.fpa-bar h3{font-weight:800;font-size:1.2rem;margin-right:auto;display:flex;align-items:center;gap:10px;min-width:0}
.fpa-bar h3 span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fpa-search{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:0 12px;height:38px;background:var(--bg);margin-right:auto;min-width:220px;flex:0 1 340px}
.fpa-search input{flex:1;min-width:0;background:transparent;outline:none;font-size:.9rem;color:var(--text)}
.fpa-btn{display:inline-flex;align-items:center;gap:7px;font-size:.85rem;font-weight:600;height:38px;padding:0 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;transition:background .15s,border-color .15s;white-space:nowrap}
.fpa-btn:hover{background:var(--muted-bg)}
.fpa-btn:disabled{opacity:.5;cursor:not-allowed}
.fpa-btn.primary{background:#4f46e5;border-color:#4f46e5;color:#fff}.fpa-btn.primary:hover{background:#4338ca}
.fpa-btn.danger{color:#dc2626}.fpa-btn.danger:hover{background:rgba(220,38,38,.08);border-color:#fecaca}
.fpa-btn.sm{height:34px;padding:0 11px;font-size:.8rem}
.fpa-btn.icon{width:34px;height:34px;padding:0;justify-content:center}
.fpa-main{flex:1;overflow:auto}
.fpa-wrap{max-width:1200px;margin:0 auto;padding:20px 24px 40px}
.fpa-note{display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:.88rem;margin-bottom:16px;flex-wrap:wrap}
.dark .fpa-note{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:#fcd34d}
.fpa-note p{flex:1;min-width:240px}
.fpa-table{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.fpa-row{display:grid;grid-template-columns:auto 44px minmax(0,1fr) 150px 96px auto;align-items:center;gap:14px;padding:12px 16px;border-top:1px solid var(--border)}
.fpa-row:first-child{border-top:none}
.fpa-row:hover{background:color-mix(in srgb,var(--muted-bg) 60%,transparent)}
.fpa-row.head{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);background:var(--muted-bg)}
.fpa-row.off .ic,.fpa-row.off .tx{opacity:.45}
.fpa-row .ord{display:flex;flex-direction:column;gap:2px}
.fpa-row .ord .fpa-btn{width:28px;height:22px;font-size:.7rem}
.fpa-row .ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);font-size:1.1rem}
.fpa-row .tx{min-width:0}
.fpa-row .tx b{display:flex;align-items:center;gap:6px;font-size:.95rem}
.fpa-row .tx b i{color:#f59e0b;font-size:.75rem}
.fpa-row .tx a{display:block;color:var(--muted);font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fpa-row .tx a:hover{color:#4f46e5;text-decoration:underline}
.fpa-row .cat{font-size:.8rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fpa-pill{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:999px}
.fpa-pill.on{background:#ecfdf5;color:#047857}.fpa-pill.off{background:var(--muted-bg);color:var(--muted)}
.dark .fpa-pill.on{background:rgba(16,185,129,.15);color:#34d399}
.fpa-row .acts{display:flex;gap:6px;justify-content:flex-end}
@media (max-width:820px){
  .fpa-row{grid-template-columns:auto 40px minmax(0,1fr);row-gap:10px}
  .fpa-row.head{display:none}
  .fpa-row .cat,.fpa-row .vis{display:none}
  .fpa-row .acts{grid-column:1/-1;justify-content:flex-start}
}
.fpa-empty{padding:48px 24px;text-align:center;color:var(--muted)}
.fpa-empty i{font-size:2rem;margin-bottom:10px}
.fpa-editor{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,1fr);gap:28px;align-items:start}
@media (max-width:980px){.fpa-editor{grid-template-columns:1fr}}
.fpa-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px}
.fpa-card h4{font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:14px}
.fpa-card + .fpa-card{margin-top:16px}
.fpa-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:560px){.fpa-grid{grid-template-columns:1fr}}
.fpa-field{display:flex;flex-direction:column;gap:6px;font-size:.8rem;font-weight:600;color:var(--muted)}
.fpa-field.full{grid-column:1/-1}
.fpa-field input,.fpa-field textarea{font:inherit;font-size:.92rem;font-weight:400;color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:9px 11px;outline:none}
.fpa-field input:focus,.fpa-field textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}
.fpa-field input:invalid:not(:placeholder-shown){border-color:#f87171}
.fpa-field input[type=color]{padding:3px;height:42px;cursor:pointer}
.fpa-checks{display:flex;gap:22px;font-size:.92rem;flex-wrap:wrap}
.fpa-checks label{display:flex;align-items:center;gap:8px;cursor:pointer}
.fpa-checks input{width:16px;height:16px;accent-color:#4f46e5}
.fpa-icons{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.fpa-icons button{width:36px;height:36px;border-radius:9px;border:1px solid var(--border);background:var(--bg);color:var(--text);cursor:pointer}
.fpa-icons button:hover{border-color:#a5b4fc}
.fpa-icons button[aria-pressed=true]{border-color:#6366f1;color:#4f46e5;background:rgba(99,102,241,.12)}
.fpa-preview{position:sticky;top:20px}
.fpa-preview .stage{border:1px dashed var(--border);border-radius:14px;padding:22px;background:var(--bg)}
.fpa-preview .stage .tool-card{max-width:420px;margin:0 auto}
.fpa-preview .tool-card:hover{transform:none}
.fpa-preview .hint{font-size:.78rem;color:var(--muted);margin-top:10px;text-align:center}
.fpa-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:110;padding:11px 18px;border-radius:12px;background:#0f172a;color:#fff;font-size:.9rem;box-shadow:0 10px 30px rgba(0,0,0,.3);display:flex;gap:8px;align-items:center;max-width:90vw}
.fpa-toast.err{background:#b91c1c}
.fpa-fab{position:fixed;right:18px;bottom:18px;z-index:90;width:48px;height:48px;border-radius:50%;border:none;background:#4f46e5;color:#fff;box-shadow:0 10px 25px rgba(79,70,229,.4);cursor:pointer;font-size:1.05rem}
.fpa-fab:hover{background:#4338ca}
.fpa-pub{display:inline-flex;align-items:center;gap:7px}
.fpa-pub[data-s=pending]{border-color:#93c5fd;color:#1d4ed8;background:#eff6ff}
.fpa-pub[data-s=sent]{border-color:#a7f3d0;color:#047857}
.dark .fpa-pub[data-s=pending],.dark .fpa-pub[data-s=sent]{background:transparent}
`;

let fb: Fb | null = null;
let root: HTMLDivElement | null = null;
let unsub: (() => void) | null = null;
let tools: Tool[] = [];
let loaded = false; // true once the server has answered at least once
let view: View = "list";
let editingId: string | null = null; // null = adding a new link
let dirty = false;
let busy = false;
let filter = "";
let conn: { s: Conn; msg?: string; at?: Date } = { s: "connecting" };

// ---------- search-engine publish (Netlify rebuild) ----------------------------
const PUBLISH_DELAY = 30; // seconds after the last change
let pubTimer: ReturnType<typeof setInterval> | null = null;
let pubLeft = 0; // seconds until auto-publish (0 = nothing pending)
let pubSentAt: Date | null = null;

function schedulePublish() {
  if (!fb?.BUILD_HOOK) return;
  pubLeft = PUBLISH_DELAY;
  if (!pubTimer) pubTimer = setInterval(() => { if (--pubLeft <= 0) publishNow(); else renderPublish(); }, 1000);
  renderPublish();
}

function publishNow(useBeacon = false) {
  if (pubTimer) { clearInterval(pubTimer); pubTimer = null; }
  pubLeft = 0;
  if (fb?.triggerRebuild(useBeacon)) {
    pubSentAt = new Date();
    if (!useBeacon) toast("Site rebuild started — search engines will see the changes in about 1–2 minutes");
  }
  renderPublish();
}

function renderPublish() {
  const b = root?.querySelector<HTMLButtonElement>('[data-ref="publish"]');
  if (!b) return;
  if (!fb?.BUILD_HOOK) {
    b.dataset.s = "off";
    b.disabled = true;
    b.title = "Set PUBLIC_NETLIFY_BUILD_HOOK in Netlify to rebuild the site automatically after changes (keeps Google's copy up to date).";
    b.innerHTML = '<i class="fa-brands fa-google"></i> Auto-publish: not set up';
    return;
  }
  b.disabled = false;
  if (pubLeft > 0) {
    b.dataset.s = "pending";
    b.title = "Changes are live for visitors. Click to rebuild the site for search engines now.";
    b.innerHTML = `<i class="fa-solid fa-clock"></i> Publishing for Google in ${pubLeft}s · Publish now`;
  } else {
    b.dataset.s = pubSentAt ? "sent" : "idle";
    b.title = "Rebuild the site so search engines see the current links";
    b.innerHTML = pubSentAt
      ? `<i class="fa-solid fa-circle-check"></i> Rebuild sent ${pubSentAt.toLocaleTimeString()}`
      : '<i class="fa-brands fa-google"></i> Publish for Google';
  }
}

// If the tab is closed with a publish still pending, send it anyway.
window.addEventListener("pagehide", () => { if (pubLeft > 0) publishNow(true); });

const sameUrl = (a: string, b: string) => a.replace(/\/+$/, "").toLowerCase() === b.replace(/\/+$/, "").toLowerCase();
const missingDefaults = () => DEFAULT_TOOLS.filter((d) => !tools.some((t) => sameUrl(t.url, d.url)));
const nextOrder = () => Math.max(0, ...tools.map((t) => t.order)) + 10;

function blank(): Tool {
  return { ...normalizeTool({ visible: true, color: "#6366f1", icon: "fa-link", category: CATEGORIES[0] }), name: "", url: "" };
}

function injectCss() {
  if (document.getElementById("fpa-css")) return;
  const s = document.createElement("style");
  s.id = "fpa-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

function toast(msg: string, err = false) {
  document.querySelectorAll(".fpa-toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "fpa-toast" + (err ? " err" : "");
  t.innerHTML = `<i class="fa-solid ${err ? "fa-circle-exclamation" : "fa-circle-check"}"></i><span></span>`;
  t.querySelector("span")!.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 6000 : 2600);
}

async function run(label: string, fn: () => Promise<unknown>): Promise<boolean> {
  if (busy) return false;
  busy = true;
  setConn({ s: "saving" });
  root?.querySelectorAll<HTMLButtonElement>("button[data-busy]").forEach((b) => (b.disabled = true));
  try {
    await fn();
    toast(label);
    schedulePublish();
    return true;
  } catch (e: any) {
    const denied = String(e?.code || e?.message).includes("permission");
    toast(denied ? "Permission denied — publish the Firestore rules for /filepro" : `Error: ${e?.message || e}`, true);
    setConn({ s: "error", msg: denied ? "Write blocked by Firestore rules" : e?.message });
    return false;
  } finally {
    busy = false;
    root?.querySelectorAll<HTMLButtonElement>("button[data-busy]").forEach((b) => (b.disabled = false));
  }
}

// ---------- open / close -----------------------------------------------------
export function mountAdminButton() {
  injectCss();
  if (document.querySelector(".fpa-fab")) return;
  const b = document.createElement("button");
  b.className = "fpa-fab";
  b.title = "Admin";
  b.setAttribute("aria-label", "Open admin panel");
  b.innerHTML = '<i class="fa-solid fa-sliders"></i>';
  b.onclick = () => openAdmin();
  document.body.appendChild(b);
}

export async function openAdmin() {
  injectCss();
  mountAdminButton();
  if (root) return;
  view = "list";
  editingId = null;
  dirty = false;
  root = document.createElement("div");
  root.className = "fpa";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = `
    <div class="fpa-top">
      <h2><i class="fa-solid fa-sliders"></i> Link Manager</h2>
      <div class="fpa-conn" data-ref="conn"></div>
      <button class="fpa-btn fpa-pub" data-act="publish" data-ref="publish"></button>
      <button class="fpa-btn" data-act="lock" title="Lock: hide the admin button in this tab"><i class="fa-solid fa-lock"></i> Lock</button>
      <button class="fpa-btn" data-act="close" title="Close (Esc)"><i class="fa-solid fa-xmark"></i> Close</button>
      <input type="file" accept="application/json" data-ref="file" hidden>
    </div>
    <div data-ref="view" style="display:flex;flex-direction:column;flex:1;min-height:0"></div>`;
  document.body.appendChild(root);
  document.body.style.overflow = "hidden";
  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  document.addEventListener("keydown", onKey);
  ref<HTMLInputElement>("file").addEventListener("change", onImportFile);

  setConn({ s: "connecting" });
  render();

  const NO_DB = "No reply from Firestore. Create the database (Firebase console → Build → Firestore Database → Create database) and publish the rules.";
  setTimeout(() => { if (root && !loaded) { setConn({ s: "error", msg: NO_DB }); renderList(); } }, 10000);

  try {
    fb = await import("../lib/firebase");
    renderPublish();
    unsub = fb.watchTools(
      (list, meta) => {
        if (meta.fromCache && !loaded && list.length === 0) return; // wait for the server
        if (!meta.fromCache) loaded = true;
        tools = sortTools(list);
        if (busy || meta.pending) setConn({ s: "saving" });
        else if (meta.fromCache) setConn({ s: "offline", msg: "Showing cached data" });
        else setConn({ s: "connected", at: new Date() });
        if (view === "list") renderList();
      },
      (e) => { setConn({ s: "error", msg: e.message }); renderList(); },
    );
  } catch (e: any) {
    setConn({ s: "error", msg: "Firebase SDK failed to load" });
  }
}

function closeAdmin() {
  if (view === "editor" && dirty && !confirm("Discard unsaved changes?")) return;
  if (pubLeft > 0) publishNow();
  unsub?.(); unsub = null;
  loaded = false;
  root?.remove(); root = null;
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onKey);
}

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (view === "editor") backToList();
  else closeAdmin();
}

const ref = <T extends HTMLElement>(name: string) => root!.querySelector(`[data-ref="${name}"]`) as T;

// ---------- connection banner ---------------------------------------------------
function setConn(next: typeof conn) {
  conn = { ...next, at: next.at ?? conn.at };
  const el = root && ref<HTMLDivElement>("conn");
  if (!el) return;
  el.dataset.s = conn.s;
  const time = conn.at ? conn.at.toLocaleTimeString() : "";
  const project = fb?.PROJECT_ID ?? "filepro-f4c5f";
  const map: Record<Conn, string> = {
    connecting: `<i class="fa-solid fa-circle-notch fpa-spin"></i><div><b>Connecting to Firebase…</b></div>`,
    connected: `<span class="dot"></span><div><b>Firebase connected</b> <small>· ${esc(project)} / filepro · ${tools.length} links · synced ${esc(time)}</small></div>`,
    saving: `<i class="fa-solid fa-cloud-arrow-up"></i><div><b>Saving to Firebase…</b></div>`,
    offline: `<i class="fa-solid fa-wifi"></i><div><b>Firebase offline</b> <small>· ${esc(conn.msg || "")} · changes will sync when back online</small></div>`,
    error: `<i class="fa-solid fa-triangle-exclamation"></i><div><b>Firebase error</b> <small>· ${esc(conn.msg || "unknown")}</small></div>`,
  };
  el.innerHTML = map[conn.s];
}

// ---------- views ----------------------------------------------------------------
function render() {
  if (view === "list") renderListView();
  else renderEditorView();
}

function renderListView() {
  ref("view").innerHTML = `
    <div class="fpa-bar">
      <label class="fpa-search"><i class="fa-solid fa-magnifying-glass" style="color:var(--muted)"></i>
        <input data-ref="filter" type="search" placeholder="Filter links…" value="${esc(filter)}"></label>
      <button class="fpa-btn" data-act="restore" data-busy title="Add any built-in links that are missing"><i class="fa-solid fa-rotate-left"></i> Restore built-in links</button>
      <button class="fpa-btn" data-act="export" title="Download a JSON backup"><i class="fa-solid fa-download"></i> Export</button>
      <button class="fpa-btn" data-act="import" data-busy title="Add links from a JSON backup"><i class="fa-solid fa-upload"></i> Import</button>
      <button class="fpa-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> Add link</button>
    </div>
    <div class="fpa-main"><div class="fpa-wrap" data-ref="list"></div></div>`;
  renderList();
}

function renderList() {
  if (!root || view !== "list") return;
  const list = ref<HTMLDivElement>("list");
  const restoreBtn = root.querySelector<HTMLButtonElement>('[data-act="restore"]');
  const missing = loaded ? missingDefaults() : [];
  if (restoreBtn) restoreBtn.hidden = !loaded || missing.length === 0;

  if (!loaded) {
    list.innerHTML = conn.s === "error"
      ? `<div class="fpa-empty"><i class="fa-solid fa-triangle-exclamation" style="color:#dc2626"></i><p><b>Can't load links from Firebase.</b></p><p style="max-width:560px;margin:8px auto 0">${esc(conn.msg || "")}</p><p style="margin-top:8px">Saving is disabled until Firebase connects, so nothing gets lost.</p></div>`
      : `<div class="fpa-empty"><i class="fa-solid fa-circle-notch fpa-spin"></i><p>Loading links from Firebase…</p></div>`;
    return;
  }

  const note = !tools.length
    ? `<div class="fpa-note"><i class="fa-solid fa-circle-info"></i><p><b>Firestore is empty.</b> The public site is showing the ${DEFAULT_TOOLS.length} built-in links. Copy them to Firestore to manage them here. (Adding a new link also copies them automatically.)</p>
       <button class="fpa-btn primary" data-act="restore" data-busy><i class="fa-solid fa-cloud-arrow-up"></i> Copy ${DEFAULT_TOOLS.length} built-in links</button></div>`
    : missing.length
      ? `<div class="fpa-note"><i class="fa-solid fa-circle-info"></i><p><b>${missing.length} built-in link${missing.length > 1 ? "s are" : " is"} not in Firestore</b>, so ${missing.length > 1 ? "they are" : "it is"} not shown on the site: ${missing.slice(0, 4).map((m) => esc(m.name)).join(", ")}${missing.length > 4 ? "…" : ""}</p>
         <button class="fpa-btn" data-act="restore" data-busy><i class="fa-solid fa-rotate-left"></i> Restore ${missing.length}</button></div>`
      : "";

  const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = tools.filter((t) => {
    const s = `${t.name} ${t.url} ${t.category} ${t.description}`.toLowerCase();
    return terms.every((w) => s.includes(w));
  });

  if (!tools.length) {
    list.innerHTML = note + `<div class="fpa-table"><div class="fpa-empty"><i class="fa-regular fa-folder-open"></i><p>No links in Firestore yet.</p></div></div>`;
    return;
  }

  const rows = shown
    .map((t) => {
      const i = tools.indexOf(t);
      return `
      <div class="fpa-row${t.visible ? "" : " off"}" data-id="${esc(t.id)}" style="--c:${t.color}">
        <div class="ord">
          <button type="button" class="fpa-btn" data-act="up" data-busy title="Move up" ${i === 0 || filter ? "disabled" : ""}><i class="fa-solid fa-chevron-up"></i></button>
          <button type="button" class="fpa-btn" data-act="down" data-busy title="Move down" ${i === tools.length - 1 || filter ? "disabled" : ""}><i class="fa-solid fa-chevron-down"></i></button>
        </div>
        <div class="ic"><i class="fa-solid ${t.icon}"></i></div>
        <div class="tx"><b>${esc(t.name)}${t.featured ? ' <i class="fa-solid fa-star" title="Featured"></i>' : ""}</b>
          <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(hostOf(t.url) || t.url)}</a></div>
        <div class="cat">${esc(t.category)}</div>
        <div class="vis"><span class="fpa-pill ${t.visible ? "on" : "off"}"><i class="fa-solid ${t.visible ? "fa-eye" : "fa-eye-slash"}"></i>${t.visible ? "Visible" : "Hidden"}</span></div>
        <div class="acts">
          <button type="button" class="fpa-btn sm primary" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>
          <button type="button" class="fpa-btn sm" data-act="toggle" data-busy title="${t.visible ? "Hide from the public site" : "Show on the public site"}"><i class="fa-solid ${t.visible ? "fa-eye-slash" : "fa-eye"}"></i> ${t.visible ? "Hide" : "Show"}</button>
          <button type="button" class="fpa-btn sm danger" data-act="delete" data-busy title="Delete permanently"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    })
    .join("");

  list.innerHTML =
    note +
    `<div class="fpa-table">
      <div class="fpa-row head"><div>Order</div><div></div><div>Link</div><div>Category</div><div>Status</div><div style="text-align:right">Actions</div></div>
      ${rows || `<div class="fpa-empty"><p>No links match “${esc(filter)}”.</p></div>`}
    </div>`;
}

function renderEditorView() {
  const t = editingId ? tools.find((x) => x.id === editingId) ?? blank() : blank();
  const isNew = !editingId;
  ref("view").innerHTML = `
    <div class="fpa-bar">
      <button class="fpa-btn" data-act="back"><i class="fa-solid fa-arrow-left"></i> Back to list</button>
      <h3><i class="fa-solid ${isNew ? "fa-plus" : "fa-pen"}" style="color:#4f46e5"></i><span>${isNew ? "Add new link" : `Edit: ${esc(t.name)}`}</span></h3>
      ${isNew ? "" : `<button class="fpa-btn danger" data-act="delete-current" data-busy><i class="fa-solid fa-trash"></i> Delete</button>`}
      <button class="fpa-btn" data-act="back">Cancel</button>
      <button class="fpa-btn primary" data-act="save" data-busy><i class="fa-solid fa-floppy-disk"></i> ${isNew ? "Add link" : "Save changes"}</button>
    </div>
    <div class="fpa-main"><div class="fpa-wrap">
      <form class="fpa-editor" data-ref="form" autocomplete="off" novalidate>
        <div>
          <div class="fpa-card">
            <h4>Basic details</h4>
            <div class="fpa-grid">
              <label class="fpa-field">Name *<input name="name" required maxlength="80" value="${esc(t.name)}" placeholder="e.g. PDF Editor Pro"></label>
              <label class="fpa-field">URL *<input name="url" type="url" required maxlength="500" value="${t.url === "#" ? "" : esc(t.url)}" placeholder="https://example.netlify.app/"></label>
              <label class="fpa-field full">Short description<input name="description" maxlength="300" value="${esc(t.description)}" placeholder="One line about what it does"></label>
              <label class="fpa-field full">Features (one per line, max 12)<textarea name="features" rows="5" placeholder="Fast and simple&#10;Works in the browser">${esc(t.features.join("\n"))}</textarea></label>
            </div>
          </div>
          <div class="fpa-card">
            <h4>Display</h4>
            <div class="fpa-grid">
              <label class="fpa-field">Category<input name="category" list="fpa-cats" maxlength="40" value="${esc(t.category)}"></label>
              <label class="fpa-field">Badge (optional)<input name="badge" maxlength="40" value="${esc(t.badge)}" placeholder="e.g. Selected formats only"></label>
              <label class="fpa-field">Button text<input name="buttonLabel" maxlength="40" value="${esc(t.buttonLabel)}" placeholder="Defaults to “Open &lt;name&gt;”"></label>
              <label class="fpa-field">Accent colour<input name="color" type="color" value="${t.color}"></label>
              <label class="fpa-field full">Icon<input name="icon" maxlength="40" value="${esc(t.icon)}" placeholder="fa-link">
                <div class="fpa-icons">${ICONS.map((i) => `<button type="button" data-icon="${i}" aria-pressed="${i === t.icon}" title="${i}"><i class="fa-solid ${i}"></i></button>`).join("")}</div>
              </label>
            </div>
          </div>
          <div class="fpa-card">
            <h4>Visibility</h4>
            <div class="fpa-checks">
              <label><input type="checkbox" name="visible" ${t.visible ? "checked" : ""}> Visible on public site</label>
              <label><input type="checkbox" name="featured" ${t.featured ? "checked" : ""}> Featured (star + highlighted)</label>
            </div>
          </div>
          <datalist id="fpa-cats">${Array.from(new Set([...CATEGORIES, ...tools.map((x) => x.category)])).map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        </div>
        <aside class="fpa-preview">
          <div class="fpa-card">
            <h4>Live preview</h4>
            <div class="stage" data-ref="preview"></div>
            <p class="hint">This is how the card will look on the public site.</p>
          </div>
        </aside>
      </form>
    </div></div>`;
  ref<HTMLFormElement>("form").onsubmit = (e) => { e.preventDefault(); save(); };
  dirty = false;
  updatePreview();
  ref<HTMLFormElement>("form").querySelector<HTMLInputElement>("[name=name]")?.focus();
}

function goEditor(id: string | null) {
  view = "editor";
  editingId = id;
  render();
}

function backToList() {
  if (dirty && !confirm("Discard unsaved changes?")) return;
  dirty = false;
  view = "list";
  editingId = null;
  render();
}

// ---------- editor helpers -------------------------------------------------------
function readForm(): Tool {
  const f = new FormData(ref<HTMLFormElement>("form"));
  const existing = tools.find((t) => t.id === editingId);
  return normalizeTool({
    name: f.get("name"),
    url: f.get("url"),
    description: f.get("description"),
    features: String(f.get("features") || "").split("\n"),
    category: f.get("category"),
    badge: f.get("badge"),
    buttonLabel: f.get("buttonLabel"),
    color: f.get("color"),
    icon: String(f.get("icon") || "").trim(),
    visible: f.get("visible") === "on",
    featured: f.get("featured") === "on",
    order: existing?.order ?? nextOrder(),
  }, editingId || "preview");
}

function updatePreview() {
  const t = readForm();
  ref("preview").innerHTML = renderCard(t);
  const iconVal = (ref<HTMLFormElement>("form").elements.namedItem("icon") as HTMLInputElement).value;
  root!.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.icon === iconVal)));
}

async function save() {
  if (!fb || !loaded) return toast("Still connecting to Firebase — try again in a moment", true);
  const form = ref<HTMLFormElement>("form");
  const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
  if (!name) { toast("Name is required", true); (form.elements.namedItem("name") as HTMLInputElement).focus(); return; }
  const t = readForm();
  if (t.url === "#") { toast("Enter a valid URL starting with https://", true); (form.elements.namedItem("url") as HTMLInputElement).focus(); return; }

  let ok: boolean;
  if (editingId) {
    ok = await run("Changes saved", () => fb!.updateTool(editingId!, t));
  } else if (tools.length === 0) {
    // Firestore is empty: the site is showing the built-in list. Copy it first so
    // adding one link never makes the other links disappear from the site.
    const withDefaults = [...DEFAULT_TOOLS, { ...t, order: Math.max(...DEFAULT_TOOLS.map((d) => d.order)) + 10 }];
    ok = await run(`Link added (and ${DEFAULT_TOOLS.length} built-in links copied to Firestore)`, () => fb!.importTools(withDefaults));
  } else {
    ok = await run("Link added", () => fb!.createTool(t));
  }
  if (ok) { dirty = false; backToList(); }
}

// ---------- events ---------------------------------------------------------------
function onInput(e: Event) {
  const el = e.target as HTMLElement;
  if (el.dataset.ref === "filter") {
    filter = (el as HTMLInputElement).value;
    renderList();
    const f = ref<HTMLInputElement>("filter");
    f.focus();
    f.setSelectionRange(f.value.length, f.value.length);
    return;
  }
  if (view === "editor" && el.closest("form")) { dirty = true; updatePreview(); }
}

function onClick(e: MouseEvent) {
  const el = e.target as HTMLElement;

  const iconBtn = el.closest<HTMLButtonElement>("[data-icon]");
  if (iconBtn) {
    (ref<HTMLFormElement>("form").elements.namedItem("icon") as HTMLInputElement).value = iconBtn.dataset.icon!;
    dirty = true;
    updatePreview();
    return;
  }

  const btn = el.closest<HTMLButtonElement>("[data-act]");
  if (!btn) return;
  const row = btn.closest<HTMLElement>(".fpa-row");
  const rowTool = row ? tools.find((t) => t.id === row.dataset.id) : undefined;
  const needFb = () => { if (!fb || !loaded) { toast("Still connecting to Firebase…", true); return false; } return true; };

  switch (btn.dataset.act) {
    case "close": closeAdmin(); break;
    case "publish": publishNow(); break;
    case "lock":
      if (view === "editor" && dirty && !confirm("Discard unsaved changes?")) break;
      dirty = false;
      sessionStorage.removeItem("filepro:admin");
      document.querySelector(".fpa-fab")?.remove();
      closeAdmin();
      break;
    case "new": goEditor(null); break;
    case "edit": if (rowTool) goEditor(rowTool.id); break;
    case "back": backToList(); break;
    case "save": save(); break;
    case "export": {
      const data = JSON.stringify((tools.length ? tools : DEFAULT_TOOLS).map(({ id, ...rest }) => rest), null, 2);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      a.download = `filepro-links-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      break;
    }
    case "import": ref<HTMLInputElement>("file").click(); break;
    case "restore": {
      if (!needFb()) break;
      const missing = missingDefaults();
      if (!missing.length) { toast("All built-in links are already in Firestore"); break; }
      if (tools.length && !confirm(`Add these ${missing.length} built-in links back?\n\n${missing.map((m) => "• " + m.name).join("\n")}`)) break;
      run(`Restored ${missing.length} built-in links`, () => fb!.importTools(missing));
      break;
    }
    case "up":
    case "down": {
      if (!rowTool || !needFb()) break;
      const i = tools.indexOf(rowTool);
      const j = btn.dataset.act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= tools.length) break;
      const next = [...tools];
      [next[i], next[j]] = [next[j], next[i]];
      run("Order saved", () => fb!.saveOrder(next));
      break;
    }
    case "toggle":
      if (rowTool && needFb()) run(rowTool.visible ? `“${rowTool.name}” hidden from site` : `“${rowTool.name}” shown on site`, () => fb!.updateTool(rowTool.id, { ...rowTool, visible: !rowTool.visible }));
      break;
    case "delete":
    case "delete-current": {
      const t = btn.dataset.act === "delete" ? rowTool : tools.find((x) => x.id === editingId);
      if (!t || !needFb()) break;
      if (!confirm(`Delete "${t.name}" permanently?\n\nTip: use "Hide" instead if you may need it again.`)) break;
      run("Deleted", () => fb!.removeTool(t.id)).then((ok) => {
        if (ok && view === "editor") { dirty = false; backToList(); }
      });
      break;
    }
  }
}

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !fb) return;
  try {
    const arr = JSON.parse(await file.text());
    if (!Array.isArray(arr) || !arr.length) throw new Error("File must contain a JSON array of links");
    if (arr.length > 400) throw new Error("Too many links in one file (max 400)");
    const base = nextOrder();
    const list = arr.map((x, i) => normalizeTool({ ...x, order: base + i * 10 })).filter((t) => t.url !== "#");
    if (!confirm(`Add ${list.length} links from "${file.name}"?`)) return;
    run(`Imported ${list.length} links`, () => fb!.importTools(list));
  } catch (err: any) {
    toast(err.message || "Invalid JSON file", true);
  }
}
