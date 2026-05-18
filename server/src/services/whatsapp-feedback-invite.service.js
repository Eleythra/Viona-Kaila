/**
 * Misafire WhatsApp şablon daveti: Meta Cloud API (`viona_feedback_completed`).
 *
 * Meta Manager’daki şablon sırası kodla birebir olmalı:
 * - Gövde: {{1}} misafir adı, {{2}} oda numarası (HEADER/FOOTER sabit metin varsayımı).
 * - URL butonu index 0: `WHATSAPP_FEEDBACK_URL_BUTTON_MODE=token` → `buildFeedbackUrlSuffix` (`fb_…`);
 *   Meta Website URL kökü `…/feedback/` olmalı (sonda `/`); yoksa `…/feedback` + `fb_…` → `…/feedbackfb_…` (404).
 *   `full` → tam geri bildirim URL’si (şablonda base sabit değilse).
 */

import { getEnv } from "../config/env.js";
import {
  buildWhatsappGraphMessagesUrl,
  parseMetaError,
  resolveWhatsappAccessToken,
  resolveWhatsappPhoneNumberId,
  templateLanguageCode,
} from "./whatsapp-operational-notification.service.js";

const BODY_CLIP = 900;
const FEEDBACK_TOKEN_RE = /^fb_[0-9A-Za-z_-]+$/;

function clip(s) {
  const t = String(s ?? "").trim();
  if (!t) return "-";
  return t.length <= BODY_CLIP ? t : `${t.slice(0, BODY_CLIP - 1)}…`;
}

/**
 * Basit rakam normalizasyonu — WhatsApp `to` alanı.
 * @param {string} raw
 * @param {string} defaultCc örn. "90"
 * @returns {string|null}
 */
export function normalizeGuestWhatsAppRecipientDigits(raw, defaultCc = "90") {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length >= 10 && d.length <= 15) return d;
  const cc = String(defaultCc || "").replace(/\D/g, "") || "90";
  if (d.length === 10 && d.startsWith("5")) return `${cc}${d}`;
  return null;
}

/** Admin / misafir profilinde gösterim: yalnızca rakamlardan `+…` (ör. +905061449208). */
export function formatGuestWhatsAppPhoneDisplay(digitsOnly) {
  const d = String(digitsOnly ?? "").replace(/\D/g, "");
  if (!d || d.length < 10) return null;
  return `+${d}`;
}

/**
 * Meta «Dynamic URL» suffix — «Panelde Aç» (`ops-tech.html?id=…`) ile aynı model.
 * Base URL şablonda `https://…/feedback/` (sonda `/`); API yalnızca `fb_…` gönderir.
 * @param {string} feedbackToken
 * @returns {string|null}
 */
export function buildFeedbackUrlSuffix(feedbackToken) {
  const s = String(feedbackToken ?? "").trim();
  if (!s.startsWith("fb_") || s.length < 11 || !FEEDBACK_TOKEN_RE.test(s)) return null;
  return s;
}

/**
 * @param {{
 *   toDigits: string,
 *   guestDisplayName: string,
 *   roomNumber: string,
 *   feedbackToken: string,
 *   feedbackUrlFull: string,
 * }} p
 * @returns {Promise<{ ok: boolean, skipped?: boolean, reason?: string, httpStatus?: number }>}
 */
export async function sendFeedbackCompletedWhatsApp(p) {
  const env = getEnv();
  const { token } = resolveWhatsappAccessToken();
  const phoneNumberId = resolveWhatsappPhoneNumberId();
  const graphUrl = buildWhatsappGraphMessagesUrl();

  if (!token || !phoneNumberId || !graphUrl) {
    console.warn("[whatsapp_feedback] skipped reason=missing_credentials");
    return { ok: false, skipped: true, reason: "missing_credentials" };
  }

  const templateName = env.whatsappFeedbackTemplateName || "viona_feedback_completed";
  const lang = templateLanguageCode();
  const mode = String(env.whatsappFeedbackUrlButtonMode || "token").toLowerCase();
  let urlButtonText;
  if (mode === "full") {
    urlButtonText = clip(String(p.feedbackUrlFull || "").trim());
  } else {
    const suffix = buildFeedbackUrlSuffix(p.feedbackToken);
    urlButtonText = clip(suffix || String(p.feedbackToken || "").trim());
  }

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: clip(p.guestDisplayName) },
        { type: "text", text: clip(p.roomNumber) },
      ],
    },
    {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: urlButtonText }],
    },
  ];

  let res;
  let raw = "";
  try {
    res = await fetch(graphUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: String(p.toDigits || "").replace(/\D/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: lang },
          components,
        },
      }),
    });
    raw = await res.text().catch(() => "");
  } catch (err) {
    console.warn("[whatsapp_feedback] send_error error=%s", err?.message || err);
    return { ok: false, reason: String(err?.message || "fetch_failed") };
  }

  if (res.ok) {
    console.info("[whatsapp_feedback] send_ok template=%s to_suffix_len=%d", templateName, String(p.toDigits).length);
    return { ok: true, httpStatus: res.status };
  }

  const { detail, msg } = parseMetaError(raw);
  console.warn("[whatsapp_feedback] send_failed http=%s detail=%s", res.status, detail || msg || raw?.slice(0, 400));
  return { ok: false, httpStatus: res.status, reason: detail || msg || "template_send_failed" };
}
