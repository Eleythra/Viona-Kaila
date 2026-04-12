import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";
import {
  deleteAdminItem,
  getAdminBucketItem,
  getFrontOfficeOperationSummary,
  getFrontOfficeTypeSummary,
  getGuestBucketTypeSummary,
  listAdminBucket,
  resendWhatsappForAdminItem,
  updateAdminItemStatus,
} from "../admin/admin.service.js";

const router = Router();

const BUCKETS_BY_ROLE = {
  hk: new Set(["request"]),
  tech: new Set(["fault"]),
  front: new Set(["complaint", "guest_notification", "late_checkout"]),
};

const SURFACE_ROLES = new Set(["hk", "tech", "front"]);

function normalizeOrigin(value = "") {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

function normText(s) {
  return String(s ?? "")
    .normalize("NFC")
    .trim();
}

function safeEqual(a, b) {
  const x = Buffer.from(normText(a), "utf8");
  const y = Buffer.from(normText(b), "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

function extractOpsToken(req) {
  const bearer = String(req.headers?.authorization || "").trim();
  if (bearer.toLowerCase().startsWith("bearer ")) {
    const t = bearer.slice(7).trim();
    if (t) return t;
  }
  const h = String(req.headers?.["x-ops-token"] || "").trim();
  return h || "";
}

function extractOpsPageHeader(req) {
  const h = String(req.headers?.["x-viona-ops-page"] || "").trim().toLowerCase();
  return SURFACE_ROLES.has(h) ? h : "";
}

/** Token ile eşleşen rol; yoksa null */
function roleFromToken(token, env) {
  const t = normText(token);
  if (!t) return null;
  const hk = normText(env.opsLinkTokenHk || "");
  const tech = normText(env.opsLinkTokenTech || "");
  const front = normText(env.opsLinkTokenFront || "");
  if (hk && safeEqual(t, hk)) return "hk";
  if (tech && safeEqual(t, tech)) return "tech";
  if (front && safeEqual(t, front)) return "front";
  return null;
}

function trustedOpsOriginSet(env) {
  const set = new Set([
    "https://viona-admin.eleythra.com",
    "https://www.viona-admin.eleythra.com",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://viona-kaila.onrender.com",
    "https://viona.eleythra.com",
    "https://www.viona.eleythra.com",
  ]);
  (env.corsAllowedOrigins || []).forEach((raw) => {
    const n = normalizeOrigin(raw);
    if (n) set.add(n);
  });
  return set;
}

function firstForwardedHost(req) {
  const raw = req.headers["x-forwarded-host"] || req.headers["x-vercel-forwarded-host"] || "";
  const first = String(raw).split(",")[0].trim().toLowerCase();
  return first.replace(/:\d+$/, "");
}

/** Vercel → Render: tarayıcı Origin’i bazen iletilmez; proxy X-Forwarded-Host taşır. */
function forwardedHostIsTrustedAdmin(req, env) {
  const h = firstForwardedHost(req);
  if (!h) return false;
  if (h === "viona-admin.eleythra.com" || h === "www.viona-admin.eleythra.com") return true;
  for (const raw of env.corsAllowedOrigins || []) {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (u.hostname.toLowerCase() === h) return true;
    } catch {
      /* yok say */
    }
  }
  return false;
}

function isTrustedOpsCaller(req, env) {
  if (forwardedHostIsTrustedAdmin(req, env)) return true;
  const allowed = trustedOpsOriginSet(env);
  const o = normalizeOrigin(req.headers?.origin);
  if (o && allowed.has(o)) return true;
  const ref = String(req.headers?.referer || "").trim().toLowerCase();
  if (!ref) return false;
  for (const base of allowed) {
    const b = base.toLowerCase();
    if (ref === b || ref.startsWith(`${b}/`)) return true;
  }
  return false;
}

/**
 * Önce token; yoksa veya OPS_TRUST_OPS_PAGE_HEADER=1 + güvenilir çağrı ise X-Viona-Ops-Page.
 */
function resolveRoleFromRequest(req) {
  const env = getEnv();
  const token = extractOpsToken(req);
  const fromTok = roleFromToken(token, env);
  if (fromTok) return fromTok;
  if (!env.opsTrustOpsPageHeader) return null;
  if (!isTrustedOpsCaller(req, env)) return null;
  const page = extractOpsPageHeader(req);
  return page || null;
}

function adminErr(res, error, fallbackMsg) {
  const code = error?.statusCode === 503 ? 503 : 400;
  let msg = error?.message || fallbackMsg;
  if (msg === "datastore_dns_unavailable") {
    msg =
      "Sunucu veritabanına şu an bağlanılamıyor (DNS veya geçici ağ). Lütfen bir süre sonra tekrar deneyin.";
  }
  return res.status(code).json({ ok: false, error: msg });
}

router.get("/auth/validate", (req, res) => {
  const role = resolveRoleFromRequest(req);
  if (!role) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  return res.status(200).json({ ok: true, role });
});

router.use((req, res, next) => {
  const role = resolveRoleFromRequest(req);
  if (!role) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  req.opsRole = role;
  return next();
});

router.get("/requests", async (req, res) => {
  try {
    const type = String(req.query.type || "");
    const allowed = BUCKETS_BY_ROLE[req.opsRole];
    if (!allowed || !allowed.has(type)) {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const result = await listAdminBucket(type, req.query || {});
    return res.status(200).json({ ok: true, type, ...result });
  } catch (error) {
    return adminErr(res, error, "ops_list_failed");
  }
});

router.get("/requests/front-summary", async (req, res) => {
  try {
    if (req.opsRole !== "front") {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const summary = await getFrontOfficeOperationSummary(req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "ops_front_summary_failed");
  }
});

router.get("/requests/front-type-summary", async (req, res) => {
  try {
    if (req.opsRole !== "front") {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const type = String(req.query.type || "");
    const allowed = BUCKETS_BY_ROLE[req.opsRole];
    if (!allowed || !allowed.has(type)) {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const summary = await getFrontOfficeTypeSummary(type, req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "ops_front_type_summary_failed");
  }
});

/** HK / Teknik: tek kova canlı özet (ön büro kartlarıyla aynı sayım mantığı). */
router.get("/requests/bucket-type-summary", async (req, res) => {
  try {
    const type = String(req.query.type || "");
    const allowed = BUCKETS_BY_ROLE[req.opsRole];
    if (!allowed || !allowed.has(type)) {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const summary = await getGuestBucketTypeSummary(type, req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "ops_bucket_type_summary_failed");
  }
});

/**
 * WhatsApp «Panelde Aç» derin bağlantı: rolün kovasındaki tek kayıt (liste sayfasında olmasa bile).
 * hk → request | tech → fault | front → complaint | guest_notification | late_checkout
 */
router.get("/requests/:type/:id", async (req, res) => {
  try {
    const type = String(req.params.type || "");
    const allowed = BUCKETS_BY_ROLE[req.opsRole];
    if (!allowed || !allowed.has(type)) {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const item = await getAdminBucketItem(type, req.params.id);
    return res.status(200).json({ ok: true, type, item });
  } catch (error) {
    const msg = String(error?.message || "");
    if (msg === "invalid_id") return res.status(400).json({ ok: false, error: "invalid_id" });
    if (msg === "record_not_found") return res.status(404).json({ ok: false, error: "record_not_found" });
    return adminErr(res, error, "ops_item_get_failed");
  }
});

router.patch("/requests/:type/:id/status", async (req, res) => {
  try {
    const type = String(req.params.type || "");
    const allowed = BUCKETS_BY_ROLE[req.opsRole];
    if (!allowed || !allowed.has(type)) {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const data = await updateAdminItemStatus(type, req.params.id, req.body?.status);
    return res.status(200).json({ ok: true, item: data });
  } catch (error) {
    return adminErr(res, error, "ops_status_update_failed");
  }
});

router.post("/requests/:type/:id/whatsapp-resend", async (req, res) => {
  try {
    const type = String(req.params.type || "");
    const allowed = BUCKETS_BY_ROLE[req.opsRole];
    if (!allowed || !allowed.has(type)) {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const data = await resendWhatsappForAdminItem(type, req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "ops_whatsapp_resend_failed");
  }
});

router.delete("/requests/:type/:id", async (req, res) => {
  try {
    const type = String(req.params.type || "");
    const allowed = BUCKETS_BY_ROLE[req.opsRole];
    if (!allowed || !allowed.has(type)) {
      return res.status(403).json({ ok: false, error: "forbidden_bucket" });
    }
    const data = await deleteAdminItem(type, req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "ops_item_delete_failed");
  }
});

export default router;
