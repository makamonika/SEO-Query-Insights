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
      runtime?: {
        env?: {
          IMPORT_SOURCE_BASE_URL?: string;
          USE_MOCK_IMPORT_DATA?: string;
          [key: string]: unknown;
        };
        cf?: unknown;
        ctx?: unknown;
      };
    }
  }
}
