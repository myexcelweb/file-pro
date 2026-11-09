# File Pro — tool directory by Parimal Hodar

An Astro + Tailwind index of all File Pro tools, with a live link list stored in
Firebase Firestore (`/filepro` collection) and a hidden admin panel.

## Commands

| Command           | Action                                              |
| :---------------- | :-------------------------------------------------- |
| `npm install`     | Install dependencies                                |
| `npm run dev`     | Dev server at `localhost:4321` (JS **not** obfuscated) |
| `npm run build`   | Production build to `./dist/` (own JS obfuscated)   |

## How it works

- `src/lib/tools.ts`: link data model, card renderer, and the **built-in list** (used for SEO,
  first paint, and as a fallback when Firestore is empty or unreachable).
- `src/lib/firebase.ts`: Firebase config and all reads/writes. Only `/filepro` is touched.
- `src/scripts/home.ts`: search (`/` or `Ctrl+K`), category filters, recently opened,
  live sync from Firestore with a localStorage cache.
- `src/scripts/admin.ts`: hidden admin panel (add / edit / delete / hide / reorder /
  import / export). It is lazy-loaded and builds its own HTML, so nothing about it
  appears in the page source.

## Admin panel

Type the admin keyword anywhere on the home page, or into the search box (works on
phones). Only its SHA-256 hash is in the code. After unlocking, a floating button stays
for that browser tab; the lock icon hides it again.

First run: the collection is empty, so click **Copy built-in links to Firestore**.

## Firestore setup

1. Firebase console → **Build → Firestore Database → Create database**.
2. **Rules** tab → paste `firestore.rules` (or only its `match /filepro/{toolId}` block
   and `isValidTool` function, if you already have rules) → **Publish**.

## Obfuscation

`npm run build` runs `javascript-obfuscator` over our own JS in `dist/_astro`
after Vite finishes (see `astro.config.mjs`). Firebase SDK code goes into `vendor.*.js`
and is left as-is.

## SEO: keeping Google's copy up to date

The homepage HTML is generated at **build time** from Firestore (`src/lib/build-data.ts`),
so search engines index the same links visitors see. To rebuild automatically after
admin changes:

1. Netlify → Site configuration → Build & deploy → **Build hooks** → *Add build hook*
   (name: `admin-publish`, branch: your main branch) → copy the URL.
2. Netlify → Site configuration → **Environment variables** → add
   `PUBLIC_NETLIFY_BUILD_HOOK` = that URL. Redeploy once.
3. Optional for local testing: put the same line in a `.env` file.

The admin panel then rebuilds the site 30 s after the last change (or click
**Publish for Google**). Visitors always see changes instantly via Firestore.
