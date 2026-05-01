/**
 * «Bekliyor» (new/pending) kayıtlar: ilk bildirimden N dk sonra aynı operasyon WhatsApp şablonunu bir kez daha gönderir.
 * Cron: GET /api/internal/operational-pending-reminder-cron — anahtar OPERATIONAL_PENDING_REMINDER_CRON_KEY veya DAILY_OPERATION_REPORT_CRON_KEY.
 */

import { getSupabase, withSupabaseFetchGuard } from "../lib/supabase.js";
import { sendOperationalWhatsappNotification } from "./whatsapp-operational-notification.service.js";

function sb(fn) {
  return withSupabaseFetchGuard(fn);
}

function clampInt(n, lo, hi, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(hi, Math.max(lo, Math.floor(x)));
}

const TYPES = ["request", "fault", "complaint", "guest_notification", "late_checkout"];

const TABLE_MAP = {
  request: "guest_requests",
  fault: "guest_faults",
  complaint: "guest_complaints",
  guest_notification: "guest_notifications",
  late_checkout: "guest_late_checkouts",
};

/**
 * @returns {Promise<{ ok: boolean, skipped?: boolean, reason?: string, sent?: number, failed?: number, errors?: string[], afterMinutes?: number }>}
 */
export async function runOperationalPendingReminderJob() {
  const enabled = String(process.env.OPERATIONAL_PENDING_REMINDER_ENABLED || "").trim() === "1";
  if (!enabled) {
    return { ok: true, skipped: true, reason: "disabled", sent: 0, failed: 0 };
  }

  const afterMinutes = clampInt(process.env.OPERATIONAL_PENDING_REMINDER_AFTER_MINUTES, 30, 24 * 60, 60);
  const maxPerTable = clampInt(process.env.OPERATIONAL_PENDING_REMINDER_MAX_PER_TABLE, 1, 100, 25);
  const cutoffIso = new Date(Date.now() - afterMinutes * 60 * 1000).toISOString();

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const type of TYPES) {
    const table = TABLE_MAP[type];
    const { data: rows, error } = await sb(() =>
      getSupabase()
        .from(table)
        .select("id,raw_payload,whatsapp_pending_reminder_sent_at")
        .in("status", ["new", "pending"])
        .lte("submitted_at", cutoffIso)
        .is("whatsapp_pending_reminder_sent_at", null)
        .order("submitted_at", { ascending: true })
        .limit(maxPerTable),
    );
    if (error) {
      const msg = error.message || String(error);
      errors.push(`${type}:${msg}`);
      console.warn("[pending_whatsapp_reminder] query_failed type=%s error=%s", type, msg);
      continue;
    }

    for (const row of rows || []) {
      const payload = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : null;
      const idStr = String(row.id ?? "").trim();
      if (!payload || !idStr) {
        console.info("[pending_whatsapp_reminder] skip reason=no_raw_payload type=%s id=%s", type, idStr || "-");
        continue;
      }

      try {
        const result = await sendOperationalWhatsappNotification(payload, "unknown", {
          recordId: idStr,
          resend: true,
        });
        const delivered = Number(result?.deliveredCount) || 0;
        if (result?.ok && delivered > 0) {
          const { error: upErr } = await sb(() =>
            getSupabase()
              .from(table)
              .update({ whatsapp_pending_reminder_sent_at: new Date().toISOString() })
              .eq("id", idStr),
          );
          if (upErr) {
            failed += 1;
            errors.push(`${type}:${idStr}:stamp:${upErr.message}`);
            console.warn(
              "[pending_whatsapp_reminder] stamp_failed type=%s id=%s error=%s",
              type,
              idStr,
              upErr.message,
            );
          } else {
            sent += 1;
            console.info(
              "[pending_whatsapp_reminder] sent type=%s id=%s delivered=%s",
              type,
              idStr,
              String(delivered),
            );
          }
        } else {
          failed += 1;
          console.warn(
            "[pending_whatsapp_reminder] send_not_ok type=%s id=%s reason=%s skipped=%s",
            type,
            idStr,
            String(result?.reason || ""),
            String(Boolean(result?.skipped)),
          );
        }
      } catch (err) {
        failed += 1;
        const msg = err?.message || String(err);
        errors.push(`${type}:${idStr}:${msg}`);
        console.warn("[pending_whatsapp_reminder] row_failed type=%s id=%s error=%s", type, idStr, msg);
      }
    }
  }

  return { ok: true, sent, failed, errors, afterMinutes, cutoffIso };
}
