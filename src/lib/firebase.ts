// Firebase is loaded lazily (dynamic import) so the page paints before the SDK arrives.
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, onSnapshot, doc, addDoc, setDoc, deleteDoc,
  writeBatch, serverTimestamp,
} from "firebase/firestore";
import { normalizeTool, TOOL_FIELDS, type Tool } from "./tools";

const firebaseConfig = {
  apiKey: "AIzaSyCC8a_vSihxKiUWEuEf5TxKGE1Snh_Cygg",
  authDomain: "filepro-f4c5f.firebaseapp.com",
  projectId: "filepro-f4c5f",
  storageBucket: "filepro-f4c5f.firebasestorage.app",
  messagingSenderId: "1023580226117",
  appId: "1:1023580226117:web:75f38ef342508936d4d92c",
};

/** Only this collection is ever touched. */
export const COLLECTION = "filepro";

const app = getApps()[0] ?? initializeApp(firebaseConfig);
const db = getFirestore(app);
const col = collection(db, COLLECTION);

/** Strip a Tool down to the whitelisted fields allowed by the security rules. */
function toDoc(t: Partial<Tool>) {
  const clean = normalizeTool(t);
  const out: Record<string, unknown> = {};
  for (const k of TOOL_FIELDS) out[k] = clean[k];
  out.updatedAt = serverTimestamp();
  return out;
}

export const PROJECT_ID = firebaseConfig.projectId;

/**
 * Netlify build hook URL. When set, the admin panel triggers a site rebuild after
 * changes, so the HTML that Google indexes includes new/edited links.
 * Set it as the environment variable PUBLIC_NETLIFY_BUILD_HOOK in Netlify
 * (Site configuration → Environment variables) and/or a local `.env` file.
 */
export const BUILD_HOOK: string = import.meta.env.PUBLIC_NETLIFY_BUILD_HOOK || "";

/** Ask Netlify to rebuild the site. Fire-and-forget (Netlify sends no CORS headers). */
export function triggerRebuild(useBeacon = false) {
  if (!BUILD_HOOK) return false;
  if (useBeacon && navigator.sendBeacon) return navigator.sendBeacon(BUILD_HOOK, "");
  fetch(BUILD_HOOK, { method: "POST", mode: "no-cors", keepalive: true }).catch(() => {});
  return true;
}

export interface SyncMeta {
  /** true when data came from the local cache, not confirmed by the server */
  fromCache: boolean;
  /** true while local writes are still being sent to the server */
  pending: boolean;
}

export function watchTools(onData: (tools: Tool[], meta: SyncMeta) => void, onError: (e: Error) => void) {
  return onSnapshot(
    col,
    { includeMetadataChanges: true },
    (snap) =>
      onData(snap.docs.map((d) => normalizeTool(d.data(), d.id)), {
        fromCache: snap.metadata.fromCache,
        pending: snap.metadata.hasPendingWrites,
      }),
    onError,
  );
}

export async function createTool(t: Partial<Tool>) {
  const ref = await addDoc(col, toDoc(t));
  return ref.id;
}

export function updateTool(id: string, t: Partial<Tool>) {
  return setDoc(doc(db, COLLECTION, id), toDoc(t));
}

export function removeTool(id: string) {
  return deleteDoc(doc(db, COLLECTION, id));
}

/** Rewrite `order` for many tools at once (used by drag/arrow reordering). */
export async function saveOrder(tools: Tool[]) {
  const batch = writeBatch(db);
  tools.forEach((t, i) => batch.set(doc(db, COLLECTION, t.id), toDoc({ ...t, order: (i + 1) * 10 })));
  await batch.commit();
}

/** Bulk-insert tools (seed defaults / import JSON). New IDs are generated. */
export async function importTools(tools: Partial<Tool>[]) {
  const batch = writeBatch(db);
  tools.forEach((t) => batch.set(doc(col), toDoc(t)));
  await batch.commit();
}
