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
