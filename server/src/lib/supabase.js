import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

/** Tüm misafir / anket / log verileri tek Supabase projesinde; tablo listesi: server/docs/supabase-data-map.md */
const env = getEnv();

export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
