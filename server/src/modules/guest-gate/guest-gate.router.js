import express from "express";
import crypto from "node:crypto";

function sha256Utf8(s) {
  return crypto.createHash("sha256").update(String(s ?? ""), "utf8").digest();
}

/** Büyük/küçük harf duyarsızlık; Türkçe İ/I için `tr`. */
function normalizeGatePassword(s) {
  return String(s ?? "").trim().toLocaleLowerCase("tr");
}

/**
 * @param {unknown} input
 * @param {string[]} acceptedList
 */
function verifyGuestGatePassword(input, acceptedList) {
  const list = Array.isArray(acceptedList) ? acceptedList : [];
  if (!list.length) return true;
  const normalizedInput = normalizeGatePassword(input);
  if (!normalizedInput) return false;
  const inputHash = sha256Utf8(normalizedInput);
  for (const cand of list) {
    const nc = normalizeGatePassword(cand);
    if (!nc) continue;
    const candHash = sha256Utf8(nc);
    if (inputHash.length === candHash.length && crypto.timingSafeEqual(inputHash, candHash)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {{ guestUiGateRequired: boolean, guestUiGatePasswordList: string[] }} envSlice
 */
export function createGuestGateRouter(envSlice) {
  const router = express.Router();

  router.get("/status", (_req, res) => {
    res.json({ required: Boolean(envSlice.guestUiGateRequired) });
  });

  router.post("/verify", (req, res) => {
    if (!envSlice.guestUiGateRequired) {
      return res.status(200).json({ ok: true });
    }
    const password = req.body?.password;
    if (password === undefined || password === null || String(password).trim() === "") {
      return res.status(400).json({ ok: false, error: "password_required" });
    }
    const ok = verifyGuestGatePassword(password, envSlice.guestUiGatePasswordList);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "invalid_password" });
    }
    return res.status(200).json({ ok: true });
  });

  return router;
}
