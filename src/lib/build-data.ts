// BUILD-TIME ONLY: fetch the link list from Firestore's public REST API so the
// generated HTML (what Google indexes) contains the same links as the live site.
// Falls back to the built-in list if Firestore is empty or unreachable, so a
// build never fails because of Firebase.
import { DEFAULT_TOOLS, normalizeTool, sortTools, type Tool } from "./tools";

const PROJECT_ID = "filepro-f4c5f";
const URL_ =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/filepro?pageSize=300`;

// Firestore REST returns typed values: { stringValue: "x" }, { arrayValue: { values: [...] } }, ...
function fromValue(v: any): unknown {
  if (!v || typeof v !== "object") return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(fromValue);
  if ("mapValue" in v) return fromFields(v.mapValue.fields ?? {});
  return undefined;
}

function fromFields(fields: Record<string, any>) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromValue(v)]));
}

let cache: Promise<{ tools: Tool[]; source: "firestore" | "built-in" }> | null = null;

export function getBuildTools() {
  cache ??= (async () => {
    try {
      const res = await fetch(URL_, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json();
      const docs: any[] = json.documents ?? [];
      const tools = docs.map((d) => normalizeTool(fromFields(d.fields ?? {}), d.name.split("/").pop()));
      if (tools.length) {
        console.log(`[filepro] build: loaded ${tools.length} links from Firestore`);
        return { tools: sortTools(tools), source: "firestore" as const };
      }
      console.log("[filepro] build: Firestore collection empty, using built-in links");
    } catch (e: any) {
      console.warn(`[filepro] build: Firestore unavailable (${e?.message || e}), using built-in links`);
    }
    return { tools: sortTools(DEFAULT_TOOLS), source: "built-in" as const };
  })();
  return cache;
}
