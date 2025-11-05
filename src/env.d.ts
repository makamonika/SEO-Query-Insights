/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email: string;
        createdAt: string;
      };
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly IMPORT_SOURCE_BASE_URL: string;
  readonly IMPORT_FETCH_TIMEOUT_MS?: string;
  readonly IMPORT_MAX_BYTES?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
