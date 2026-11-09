// Shared tool model + renderer. Used at build time (SSR/SEO fallback) and in the browser.

export interface Tool {
  id: string;
  name: string;
  url: string;
  description: string;
  features: string[];
  icon: string; // Font Awesome class, e.g. "fa-file-pdf"
  color: string; // hex colour, e.g. "#ef4444"
  category: string;
  badge: string; // optional chip text, e.g. "Selected formats only"
  buttonLabel: string;
  featured: boolean;
  visible: boolean;
  order: number;
}

export const TOOL_FIELDS = [
  "name", "url", "description", "features", "icon", "color",
  "category", "badge", "buttonLabel", "featured", "visible", "order",
] as const;

export const CATEGORIES = [
  "Court & Reports",
  "Legal",
  "Excel & Data",
  "PDF & Documents",
  "Utilities",
];

/** Normalise any partial/untrusted object into a safe Tool. */
export function normalizeTool(raw: any, id = ""): Tool {
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const features = Array.isArray(raw?.features)
    ? raw.features.map((f: unknown) => str(f, 120)).filter(Boolean).slice(0, 12)
    : [];
  const color = /^#[0-9a-fA-F]{6}$/.test(raw?.color ?? "") ? raw.color : "#6366f1";
  const icon = /^fa-[a-z0-9-]+$/.test(raw?.icon ?? "") ? raw.icon : "fa-link";
  return {
    id: id || str(raw?.id, 64),
    name: str(raw?.name, 80) || "Untitled",
    url: safeUrl(raw?.url),
    description: str(raw?.description, 300),
    features,
    icon,
    color,
    category: str(raw?.category, 40) || "Utilities",
    badge: str(raw?.badge, 40),
    buttonLabel: str(raw?.buttonLabel, 40),
    featured: raw?.featured === true,
    visible: raw?.visible !== false,
    order: Number.isFinite(raw?.order) ? raw.order : 999,
  };
}

export function safeUrl(u: unknown): string {
  if (typeof u !== "string") return "#";
  try {
    const parsed = new URL(u.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "#";
  } catch {
    return "#";
  }
}

export function hostOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function sortTools(list: Tool[]): Tool[] {
  return [...list].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function searchText(t: Tool): string {
  return [t.name, t.description, t.category, t.badge, hostOf(t.url), ...t.features].join(" ").toLowerCase();
}

/** Category filter buttons (used at build time and in the browser). */
export function renderChips(tools: Tool[], active = "All"): string {
  const cats = ["All", ...Array.from(new Set(tools.map((t) => t.category)))];
  return cats
    .map((c) => {
      const n = c === "All" ? tools.length : tools.filter((t) => t.category === c).length;
      return `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === active}">${esc(c)}<span>${n}</span></button>`;
    })
    .join("");
}

export function renderCard(t: Tool): string {
  const host = hostOf(t.url);
  const label = t.buttonLabel || `Open ${t.name}`;
  const features = t.features
    .map((f) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i><span>${esc(f)}</span></li>`)
    .join("");
  return `<article class="tool-card${t.featured ? " is-featured" : ""}" data-id="${esc(t.id)}" data-category="${esc(t.category)}" style="--c:${t.color}">
  <div class="tool-head">
    <div class="tool-icon"><i class="fa-solid ${t.icon}" aria-hidden="true"></i></div>
    <div class="tool-meta">
      <h3 class="tool-name">${esc(t.name)}</h3>
      <p class="tool-host">${esc(host)}</p>
    </div>
    ${t.featured ? `<span class="tool-star" title="Featured"><i class="fa-solid fa-star"></i></span>` : ""}
  </div>
  <div class="tool-tags">
    <span class="tag">${esc(t.category)}</span>${t.badge ? `<span class="tag tag-warn">${esc(t.badge)}</span>` : ""}
  </div>
  ${t.description ? `<p class="tool-desc">${esc(t.description)}</p>` : ""}
  ${features ? `<ul class="tool-features">${features}</ul>` : ""}
  <a class="tool-link" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" data-open="${esc(t.id)}">
    <span>${esc(label)}</span><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
  </a>
</article>`;
}

// ---------------------------------------------------------------------------
// Built-in list: shown before Firestore loads, used for SEO, and used to seed
// the Firestore "filepro" collection from the admin panel.
// ---------------------------------------------------------------------------
const raw: Omit<Tool, "id" | "visible" | "order">[] = [
  { name: "Report Hub (પત્રક)", url: "https://patrak.netlify.app/", icon: "fa-file-lines", color: "#6366f1", category: "Court & Reports", badge: "Selected formats only", buttonLabel: "Launch Report Hub", featured: true,
    description: "Monthly and quarterly statement preparation.", features: ["Generate monthly & quarterly reports", "Easy statement preparation", "Streamlined data processing", "User-friendly interface"] },
  { name: "PDF Document Editor Pro", url: "https://pdf-pro.netlify.app/", icon: "fa-file-pdf", color: "#ef4444", category: "PDF & Documents", badge: "", buttonLabel: "Launch PDF Editor", featured: false,
    description: "Edit, compress, merge and watermark PDFs.", features: ["AI-powered PDF editing", "Compression, merging, & watermarking", "Secure document processing"] },
  { name: "AI Image Background Studio", url: "https://bg-pro.streamlit.app/", icon: "fa-image", color: "#a855f7", category: "Utilities", badge: "", buttonLabel: "Launch Image Studio", featured: false,
    description: "Remove, replace and enhance image backgrounds.", features: ["AI-based background editing", "Remove, replace, and enhance", "Batch processing and 4K output"] },
  { name: "Excel Merger Pro", url: "https://xl-join.netlify.app/", icon: "fa-file-excel", color: "#22c55e", category: "Excel & Data", badge: "", buttonLabel: "Launch Excel Merger", featured: false,
    description: "Merge Excel files while keeping formulas and formatting.", features: ["Advanced Excel file merging", "Preserves formulas and formatting", "Fast, smart merge algorithms"] },
  { name: "Legal Calculator Suite", url: "https://advfee.netlify.app/", icon: "fa-gavel", color: "#ca8a04", category: "Legal", badge: "", buttonLabel: "Launch Calculator", featured: false,
    description: "Court, advocate and probate fee calculations.", features: ["Real-time legal fee calculations", "Court, advocate, and probate fees", "Updated fee structures"] },
  { name: "Calendar Pro", url: "https://calendar-pro.netlify.app/", icon: "fa-calendar-days", color: "#2563eb", category: "Legal", badge: "", buttonLabel: "Launch Calendar Pro", featured: false,
    description: "Gujarat court and government holiday calendar.", features: ["Tailored for advocates & judiciary staff", "Gujarat government employee holidays included", "Court schedules & legal calendar events", "Gujarat specific — always up to date"] },
  { name: "Age Calculator", url: "https://excel-age-calculator.netlify.app/", icon: "fa-cake-candles", color: "#ec4899", category: "Utilities", badge: "", buttonLabel: "Launch Age Calculator", featured: false,
    description: "Exact age in days, months and years.", features: ["Calculate age in days, months & years", "Supports any date format", "Excel-based age calculation", "Fast, simple & accurate results"] },
  { name: "Pending Case Tracker", url: "https://pending-as-on.netlify.app/", icon: "fa-hourglass-half", color: "#f43f5e", category: "Court & Reports", badge: "", buttonLabel: "Launch Case Tracker", featured: false,
    description: "Date-wise pending cases with auto disposal maths.", features: ["Date-wise pending case tracking", "Month-wise auto disposal calculation", "Quick overview of case status"] },
  { name: "Heading Pro", url: "https://heading-pro.netlify.app/", icon: "fa-heading", color: "#6366f1", category: "Excel & Data", badge: "", buttonLabel: "Launch Heading Pro", featured: false,
    description: "Group Excel rows by category with headings and serials.", features: ["Smart Excel data organizer", "Groups data by category automatically", "Adds headings & serial numbers", "Works fully offline - data stays private"] },
  { name: "Porbandar Voter List 2002", url: "https://porbandar-voter-list-2002.netlify.app/", icon: "fa-magnifying-glass", color: "#14b8a6", category: "Utilities", badge: "", buttonLabel: "Search Voter List", featured: false,
    description: "Search the 2002 Porbandar (Gujarat) voter list.", features: ["Search your name in 2002 voter list", "Enter details in Gujarati only", "EPIC numbers: enter last 6 digits only", "Porbandar (Gujarat) specific database"] },
  { name: "Real-Time File Transfer", url: "https://file-transfer-room.netlify.app/", icon: "fa-folder-open", color: "#f97316", category: "Utilities", badge: "", buttonLabel: "Launch File Transfer", featured: false,
    description: "Share files instantly with a 6-digit room code.", features: ["Share files instantly via a 6-digit room code", "Auto-deletes after 15 minutes — no storage", "Multiple files supported, up to 100 MB", "No registration required"] },
  { name: "Balance Sheets (Transfer) Report Generator", url: "https://case-transfer.netlify.app/", icon: "fa-file-invoice-dollar", color: "#0891b2", category: "Court & Reports", badge: "", buttonLabel: "Launch Report Generator", featured: false,
    description: "Balance sheet and category-wise reports from Excel.", features: ["Upload Excel files and map columns visually", "Auto-generate balance sheet and category-wise reports", "Case transfer processing with fast export support"] },
  { name: "Excel Pro Center", url: "https://xlreports.netlify.app/", icon: "fa-table", color: "#16a34a", category: "Excel & Data", badge: "Selected formats only", buttonLabel: "Launch Excel Tools", featured: false,
    description: "Clean, validate and convert Excel data in bulk.", features: ["Advanced Excel transformation hub", "Data cleaning, validation, and conversion", "Bulk operations and error detection"] },
  { name: "Analytics Dashboard", url: "https://yearwisedata.netlify.app/", icon: "fa-chart-line", color: "#3b82f6", category: "Excel & Data", badge: "Selected formats only", buttonLabel: "Launch Analytics", featured: false,
    description: "Year-wise interactive dashboards and reports.", features: ["Year-wise data analytics", "Interactive dashboards and reports", "Visual analytics with custom dates"] },
  { name: "Disposed List PDF to Excel", url: "https://dis-list-pdf-to-xl.netlify.app/", icon: "fa-file-export", color: "#65a30d", category: "Court & Reports", badge: "Selected formats only", buttonLabel: "Launch Disposed List Converter", featured: false,
    description: "Convert Disposed List PDFs into Excel.", features: ["Convert Disposed List PDF to Excel", "Specific PDF format support only", "Fast, simple & browser-based"] },
  { name: "Return Report Analyzer", url: "https://return-report.netlify.app/", icon: "fa-clipboard-list", color: "#10b981", category: "Court & Reports", badge: "Selected formats only", buttonLabel: "Launch Return Report", featured: false,
    description: "Return Report PDF to Excel with category analysis.", features: ["Return Report PDF to Excel", "PDF report & case category analysis", "Category-wise reports", "Browser-based with Excel export"] },
];

export const DEFAULT_TOOLS: Tool[] = raw.map((t, i) =>
  normalizeTool({ ...t, visible: true, order: (i + 1) * 10 }, `builtin-${i + 1}`),
);
