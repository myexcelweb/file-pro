import { defineConfig } from 'astro/config';
import netlify from "@astrojs/netlify/static"; // <-- IMPORTANT: We added "/static"
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: 'https://file-pro.netlify.app',
  
  // We remove 'output: "server"' and use the static adapter.
  // Astro's default output is "static", so we don't even need to write it.
  adapter: netlify(),

  integrations: [sitemap()]
}); 