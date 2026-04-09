import dns from "node:dns";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";
import {
  createFetchWithDnsRetry,
  isTransientDnsFailure,
  messageLooksLikeTransientDns,
} from "./fetch-dns-retry.js";

const env = getEnv();

const _fetchDnsRetries = Math.min(
  12,
  Math.max(1, Number.parseInt(String(process.env.SUPABASE_FETCH_DNS_RETRIES || "8"), 10) || 8),
);
const _fetchDnsBaseMs = Math.min(
  2000,
  Math.max(40, Number.parseInt(String(process.env.SUPABASE_FETCH_DNS_BASE_MS || "200"), 10) || 200),
);
const _fetchWithDnsRetry = createFetchWithDnsRetry(_fetchDnsRetries, _fetchDnsBaseMs);

const _client =
  env.hasSupabase &&
  createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: _fetchWithDnsRetry,
    },
  });

if (env.hasSupabase && env.supabaseUrl) {
  try {
    const host = new URL(env.supabaseUrl).hostname;
    setImmediate(() => {
      dns.lookup(host, () => {});
    });
  } catch {
    /* yoksay */
  }
}

/**
 * fetch düzeyinde DNS tekrarı yetmezse yine düşebilir; istemciye 503 + anlaşılır mesaj için.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withSupabaseFetchGuard(fn) {
  try {
    return await fn();
  } catch (err) {
    if (isTransientDnsFailure(err)) {
      const e = new Error("datastore_dns_unavailable");
      e.statusCode = 503;
      throw e;
    }
    throw err;
  }
}

/** İstemci `error` nesnesi (throw değil); DNS / fetch → 503 + router’daki Türkçe mesaj. */
export function throwIfSupabaseDatastoreDnsError(error) {
  if (!error || typeof error !== "object") return;
  const text = [error.message, error.details, error.hint].filter(Boolean).map(String).join(" ");
  if (messageLooksLikeTransientDns(text)) {
    const e = new Error("datastore_dns_unavailable");
    e.statusCode = 503;
    throw e;
  }
}

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
