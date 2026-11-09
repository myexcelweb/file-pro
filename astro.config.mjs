import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify/static";
import sitemap from "@astrojs/sitemap";
import JavaScriptObfuscator from "javascript-obfuscator";

import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/**
 * Obfuscates our own browser JS in production builds only.
 * Runs on the final files in dist/_astro AFTER Vite has finished, so code-splitting
 * and Vite's dynamic-import preload markers are already resolved and stay intact.
 * Third-party code (Firebase) is forced into "vendor.*.js" and left untouched.
 * `npm run dev` stays readable for debugging.
 */
function obfuscateClient() {
  return {
    name: "obfuscate-client",
    hooks: {
      "astro:build:setup": ({ vite, target }) => {
        if (target !== "client") return;
        vite.build ??= {};
        vite.build.rollupOptions ??= {};
        const out = (vite.build.rollupOptions.output ??= {});
        for (const o of Array.isArray(out) ? out : [out]) {
          o.manualChunks = (id) => (id.includes("node_modules") ? "vendor" : undefined);
        }
      },
      "astro:build:done": async ({ dir, logger }) => {
        const assets = join(fileURLToPath(dir), "_astro");
        const files = (await readdir(assets)).filter((f) => f.endsWith(".js") && !f.startsWith("vendor."));
        for (const f of files) {
          const path = join(assets, f);
          const code = await readFile(path, "utf8");
          await writeFile(path, obfuscate(code));
          logger.info(`obfuscated ${f}`);
        }
      },
    },
  };
}

function obfuscate(code) {
  return JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    stringArray: true,
    stringArrayEncoding: ["base64"],
    stringArrayThreshold: 1,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    transformObjectKeys: true,
    target: "browser",
    sourceMap: false,
  }).getObfuscatedCode();
}

export default defineConfig({
  site: "https://file-pro.netlify.app",
  // The Netlify adapter is only needed for production builds. In dev it tries to
  // start a Deno edge-functions server (unused here) and crashes, so skip it.
  adapter: process.argv.includes("dev") ? undefined : netlify(),
  integrations: [sitemap(), obfuscateClient()],
  // Hide Astro's developer toolbar (bottom pill) during `npm run dev`.
  // It never appears in production builds anyway.
  devToolbar: { enabled: false },
});
