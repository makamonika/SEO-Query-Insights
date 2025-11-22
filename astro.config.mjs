// @ts-check
import { defineConfig, envField } from "astro/config";
import path from "path";
import { fileURLToPath } from "url";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: "server", access: "secret" }),
      SUPABASE_KEY: envField.string({ context: "server", access: "secret" }),
      OPENROUTER_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      IMPORT_FETCH_TIMEOUT_MS: envField.number({ context: "server", access: "public", default: 30000 }),
      IMPORT_MAX_BYTES: envField.number({ context: "server", access: "public", default: 70000000 }),
    },
  },
});
