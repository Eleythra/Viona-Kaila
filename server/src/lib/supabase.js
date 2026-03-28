import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

const env = getEnv();

const _client =
  env.hasSupabase &&
  createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

export function isSupabaseConfigured() {
  return Boolean(_client);
}

/** Admin / misafir / anket rotaları için. Yoksa 503 fırlatır. */
export function getSupabase() {
  if (!_client) {
    const e = new Error("SUPABASE_NOT_CONFIGURED");
    e.code = "SUPABASE_NOT_CONFIGURED";
    e.statusCode = 503;
    throw e;
  }
  return _client;
}
