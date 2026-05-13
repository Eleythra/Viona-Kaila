import { timingSafeEqual } from "node:crypto";

export function getAdminApiToken() {
  return String(process.env.ADMIN_API_TOKEN || "").trim();
}

export function extractAdminToken(req) {
  const bearer = String(req.headers?.authorization || "").trim();
  if (bearer.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (token) return token;
  }
  return String(req.headers?.["x-admin-token"] || "").trim();
}

export function isAdminTokenValid(candidate = "") {
  const ADMIN_API_TOKEN = getAdminApiToken();
  if (!ADMIN_API_TOKEN) return false;
  const left = Buffer.from(String(candidate || ""), "utf8");
  const right = Buffer.from(ADMIN_API_TOKEN, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * `Authorization` başlığının tamamını `Bearer <secret>` ile timing-safe karşılaştırır (CRON vb.).
 * @param {string|undefined} authorizationHeader — örn. req.headers.authorization
 * @param {string|undefined} secret
 */
export function isBearerSecretAuthValid(authorizationHeader, secret) {
  const s = String(secret ?? "").trim();
  if (!s) return false;
  const expected = `Bearer ${s}`;
  const auth = String(authorizationHeader ?? "").trim();
  const a = Buffer.from(auth, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Express middleware: ADMIN_API_TOKEN yoksa 503; token uyuşmazsa 401. */
export function requireAdminAuth(req, res, next) {
  const ADMIN_API_TOKEN = getAdminApiToken();
  if (!ADMIN_API_TOKEN) {
    return res.status(503).json({ ok: false, error: "admin_auth_not_configured" });
  }
  const token = extractAdminToken(req);
  if (!isAdminTokenValid(token)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  return next();
}
