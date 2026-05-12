import crypto from "node:crypto";
import { getEnv } from "../config/env.js";

export const VERIFIED_GUEST_COOKIE_NAME = "viona_guest_verified";

function guestSessionHmacSecret() {
  const env = getEnv();
  const explicit = String(env.vionaGuestSessionSecret || "").trim();
  if (explicit) return explicit;
  const admin = String(process.env.ADMIN_API_TOKEN || "").trim();
  if (admin.length >= 24) {
    return crypto.createHash("sha256").update("viona_guest_session_v1|").update(admin, "utf8").digest("base64url");
  }
  return "";
}

function parseCookieHeader(cookieHeader, name) {
  const raw = String(cookieHeader || "");
  if (!raw) return null;
  const parts = raw.split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx < 1) continue;
    const k = p.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(p.slice(idx + 1).trim());
  }
  return null;
}

/**
 * @param {string} room
 * @param {number} ttlSec
 * @returns {string|null}
 */
export function buildVerifiedGuestCookieValue(room, ttlSec) {
  const secret = guestSessionHmacSecret();
  const r = String(room || "").trim();
  if (!secret || !r) return null;
  const exp = Math.floor(Date.now() / 1000) + Math.max(300, Math.min(86400 * 14, Number(ttlSec) || 86400));
  const payloadObj = { v: 1, room: r, exp };
  const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * @param {string|null|undefined} cookieHeader
 * @returns {{ room: string, exp: number } | null}
 */
export function parseVerifiedGuestCookie(cookieHeader) {
  const secret = guestSessionHmacSecret();
  if (!secret) return null;
  const raw = parseCookieHeader(cookieHeader, VERIFIED_GUEST_COOKIE_NAME);
  if (!raw || !raw.includes(".")) return null;
  const dot = raw.lastIndexOf(".");
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let obj;
  try {
    obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!obj || obj.v !== 1 || typeof obj.room !== "string" || !obj.room.trim()) return null;
  const exp = Number(obj.exp);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return { room: obj.room.trim(), exp };
}

/**
 * @param {import("express").Response} res
 * @param {string} room
 */
export function setVerifiedGuestCookie(res, room) {
  const env = getEnv();
  const ttl = Math.max(300, Math.min(86400 * 14, Number(env.vionaGuestSessionTtlSec) || 86400));
  const val = buildVerifiedGuestCookieValue(room, ttl);
  if (!val) return false;
  const secure =
    process.env.NODE_ENV === "production" || String(process.env.VIONA_SECURE_COOKIES || "").trim() === "1";
  res.cookie(VERIFIED_GUEST_COOKIE_NAME, val, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ttl * 1000,
  });
  return true;
}

/**
 * @param {import("express").Response} res
 */
export function clearVerifiedGuestCookie(res) {
  const secure =
    process.env.NODE_ENV === "production" || String(process.env.VIONA_SECURE_COOKIES || "").trim() === "1";
  res.clearCookie(VERIFIED_GUEST_COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "lax", secure });
}
