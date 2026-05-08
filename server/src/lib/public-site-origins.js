/** Misafir sitesi / bilinen origin allowlist (CORS ve sesli API güveni için tek kaynak). */

const BUILTIN_PUBLIC_SITE_ORIGINS = [
  "https://viona-kaila.onrender.com",
  "https://viona-node-api.onrender.com",
  "https://viona.eleythra.com",
  "https://www.viona.eleythra.com",
  "https://viona-admin.eleythra.com",
  "https://www.viona-admin.eleythra.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

export function normalizePublicSiteOrigin(value = "") {
  const s = String(value || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  return s.toLowerCase();
}

/**
 * @param {{ corsAllowedOrigins?: string[] }} env
 * @returns {Set<string>}
 */
export function buildPublicSiteOriginAllowlist(env) {
  const set = new Set(
    (env.corsAllowedOrigins || []).map((x) => normalizePublicSiteOrigin(x)).filter(Boolean),
  );
  for (const o of BUILTIN_PUBLIC_SITE_ORIGINS) {
    set.add(normalizePublicSiteOrigin(o));
  }
  return set;
}

/**
 * Tarayıcıdan gelen Origin veya Referer kökeni allowlist’te mi?
 * @param {import("express").Request} req
 * @param {Set<string>} allowlist
 */
export function requestHasAllowedPublicSiteOrigin(req, allowlist) {
  const origin = normalizePublicSiteOrigin(req.headers?.origin);
  if (origin && allowlist.has(origin)) return true;
  const ref = String(req.headers?.referer || "").trim();
  if (!ref) return false;
  try {
    const o = normalizePublicSiteOrigin(new URL(ref).origin);
    return Boolean(o && allowlist.has(o));
  } catch {
    return false;
  }
}
