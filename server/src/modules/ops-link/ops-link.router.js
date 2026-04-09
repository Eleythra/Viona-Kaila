import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";
import { listAdminBucket, updateAdminItemStatus } from "../admin/admin.service.js";

const router = Router();

const BUCKETS_BY_ROLE = {
  hk: new Set(["request"]),
  tech: new Set(["fault"]),
  front: new Set(["complaint", "guest_notification", "late_checkout"]),
};

function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ""), "utf8");
  const y = Buffer.from(String(b ?? ""), "utf8");
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

function resolveRole(token) {
  const env = getEnv();
  const t = String(token || "").trim();
  if (!t) return null;
  const hk = String(env.opsLinkTokenHk || "").trim();
  const tech = String(env.opsLinkTokenTech || "").trim();
  const front = String(env.opsLinkTokenFront || "").trim();
  if (hk && safeEqual(t, hk)) return "hk";
  if (tech && safeEqual(t, tech)) return "tech";
  if (front && safeEqual(t, front)) return "front";
  return null;
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
  const token = extractOpsToken(req);
  const role = resolveRole(token);
  if (!role) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  return res.status(200).json({ ok: true, role });
});

router.use((req, res, next) => {
  const token = extractOpsToken(req);
  const role = resolveRole(token);
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

export default router;
