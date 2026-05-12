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
 * Vercel önizleme / dağıtım hostları (`*.vercel.app`).
 * Tarayıcı Origin başlığı güvenilir sayılır; doğrudan curl ile köken taklit edilebilir (rate limit / secret ile sınırlama).
 */
export function isTrustedVercelAppPreviewOrigin(normalizedOrigin) {
  const n = normalizePublicSiteOrigin(normalizedOrigin);
  if (!n) return false;
  try {
    const u = new URL(n);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return u.hostname.toLowerCase().endsWith(".vercel.app");
  } catch {
    return false;
  }
}

/**
 * Sabit allowlist veya Vercel önizleme kökeni.
 * @param {string} origin — normalize edilmiş tam köken (`https://host`)
 * @param {Set<string>} allowlist
 */
export function isPublicSiteOriginAllowed(origin, allowlist) {
  const n = normalizePublicSiteOrigin(origin);
  if (!n) return false;
  if (allowlist.has(n)) return true;
  return isTrustedVercelAppPreviewOrigin(n);
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
 * Proxy (Vercel rewrite → Render) bazen `Origin` iletmez; `X-Forwarded-Host` veya `X-Vercel-Forwarded-Host` ile köken üretir.
 * Not: Doğrudan API’ye istek atan bir istemci bu başlıkları taklit edebilir; maliyet için SPEECH_CLIENT_SECRET veya rate limit ile birlikte düşünün.
 */
function syntheticOriginFromForwardedHeaders(req) {
  const rawXfh = String(req.headers?.["x-forwarded-host"] || "").trim();
  const rawVfh = String(req.headers?.["x-vercel-forwarded-host"] || "").trim();
  const firstHost = (rawXfh ? rawXfh.split(",")[0] : rawVfh ? rawVfh.split(",")[0] : "").trim();
  if (!firstHost) return "";

  let proto = String(req.headers?.["x-forwarded-proto"] || "")
    .trim()
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (proto !== "http" && proto !== "https") {
    const h = firstHost.toLowerCase();
    proto =
      h.startsWith("localhost") || h.startsWith("127.") ? "http" : "https";
  }

  return normalizePublicSiteOrigin(`${proto}://${firstHost}`);
}

/** RFC 7239 örnekleri: `host=example.com` veya `proto=https;host=example.com` */
function syntheticOriginFromForwardedHeader(req) {
  const raw = String(req.headers?.forwarded || "").trim();
  if (!raw) return "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const segment of parts) {
    let host = "";
    let proto = "";
    const pairs = segment.split(";").map((s) => s.trim());
    for (const p of pairs) {
      const eq = p.indexOf("=");
      if (eq === -1) continue;
      const k = p.slice(0, eq).trim().toLowerCase();
      const v = p.slice(eq + 1).trim().replace(/^"|"$/g, "");
      if (k === "host") host = v;
      if (k === "proto") proto = v.toLowerCase();
    }
    if (!host) continue;
    if (proto !== "http" && proto !== "https") {
      const hl = host.toLowerCase();
      proto =
        hl.startsWith("localhost") || hl.startsWith("127.") ? "http" : "https";
    }
    const o = normalizePublicSiteOrigin(`${proto}://${host}`);
    if (o) return o;
  }
  return "";
}

/**
 * Tarayıcıdan gelen Origin / Referer / (isteğe bağlı) proxy iletilen köken allowlist’te mi?
 * @param {import("express").Request} req
 * @param {Set<string>} allowlist
 * @param {{ trustForwardedHeaders?: boolean }} [opts]
 */
export function requestHasAllowedPublicSiteOrigin(req, allowlist, opts = {}) {
  const trustForwarded = opts.trustForwardedHeaders !== false;

  const origin = normalizePublicSiteOrigin(req.headers?.origin);
  if (origin && isPublicSiteOriginAllowed(origin, allowlist)) return true;

  const ref = String(req.headers?.referer || "").trim();
  if (ref) {
    try {
      const o = normalizePublicSiteOrigin(new URL(ref).origin);
      if (o && isPublicSiteOriginAllowed(o, allowlist)) return true;
    } catch {
      /* ignore */
    }
  }

  if (!trustForwarded) return false;

  const fromXfh = syntheticOriginFromForwardedHeaders(req);
  if (fromXfh && isPublicSiteOriginAllowed(fromXfh, allowlist)) return true;

  const fromFwd = syntheticOriginFromForwardedHeader(req);
  if (fromFwd && isPublicSiteOriginAllowed(fromFwd, allowlist)) return true;

  return false;
}
