// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: "server", access: "secret" }),
      SUPABASE_KEY: envField.string({ context: "server", access: "secret" }),
      OPENROUTER_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      IMPORT_SOURCE_BASE_URL: envField.string({ context: "server", access: "public", optional: true }),
      USE_MOCK_IMPORT_DATA: envField.string({ context: "server", access: "public", optional: true }),
      IMPORT_FETCH_TIMEOUT_MS: envField.number({ context: "server", access: "public", default: 30000 }),
      IMPORT_MAX_BYTES: envField.number({ context: "server", access: "public", default: 70000000 }),
    },
  },
});
