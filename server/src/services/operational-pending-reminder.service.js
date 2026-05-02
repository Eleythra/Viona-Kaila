/**
 * «Bekliyor» (new/pending) kayıtlar: HK / teknik / ön büro formları — ilk WhatsApp’tan sonra her N dk’da bir
 * (env OPERATIONAL_PENDING_REMINDER_AFTER_MINUTES, varsayılan 60) aynı operasyon şablonu ile tekrar gönderilir;
 * gövdeye `OPERATIONAL_PENDING_REMINDER_SUFFIX_TR` ile «hatırlatma» notu eklenir (ilk bildirimden ayırt etmek için).
 * Supabase satırındaki `submitted_at` hatırlatıcıda payload’a yazılır — tarih/saat WhatsApp’ta otel saatine göre doğru kalır.
 * durum hâlâ bekliyorsa gönderim zaman damgası güncellenir, böylece bir sonraki N dk sonra yine düşer.
 * Cron: GET /api/internal/operational-pending-reminder-cron — OPERATIONAL_PENDING_REMINDER_CRON_KEY veya DAILY_OPERATION_REPORT_CRON_KEY.
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

/** Son hatırlatma veya kayıt zamanına göre sıralama (en eski önce). */
function reminderReferenceMs(row) {
  const r = row || {};
  const iso = r.whatsapp_pending_reminder_sent_at || r.submitted_at;
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

/**
 * Hiç hatırlatma gönderilmemiş: submitted_at <= cutoff.
 * Daha önce gönderilmiş: whatsapp_pending_reminder_sent_at <= cutoff (son gönderimden N dk geçmişse tekrar).
 */
async function fetchPendingReminderCandidates(table, cutoffIso, maxPerTable) {
  const limit = Math.max(1, maxPerTable);
  const baseSelect = "id,raw_payload,submitted_at,whatsapp_pending_reminder_sent_at";

  const [firstRound, repeats] = await Promise.all([
    sb(() =>
      getSupabase()
        .from(table)
        .select(baseSelect)
        .in("status", ["new", "pending"])
        .is("whatsapp_pending_reminder_sent_at", null)
        .lte("submitted_at", cutoffIso)
        .order("submitted_at", { ascending: true })
        .limit(limit),
    ),
    sb(() =>
      getSupabase()
        .from(table)
        .select(baseSelect)
        .in("status", ["new", "pending"])
        .not("whatsapp_pending_reminder_sent_at", "is", null)
        .lte("whatsapp_pending_reminder_sent_at", cutoffIso)
        .order("whatsapp_pending_reminder_sent_at", { ascending: true })
        .limit(limit),
    ),
  ]);

  const e1 = firstRound.error;
  const e2 = repeats.error;
  if (e1 || e2) {
    const msg = e1?.message || e2?.message || String(e1 || e2);
    return { error: msg, rows: [] };
  }

  const seen = new Set();
  const merged = [];
  for (const row of [...(firstRound.data || []), ...(repeats.data || [])]) {
    const idStr = String(row?.id ?? "").trim();
    if (!idStr || seen.has(idStr)) continue;
    seen.add(idStr);
    merged.push(row);
  }
  merged.sort(function (a, b) {
    return reminderReferenceMs(a) - reminderReferenceMs(b);
  });
  return { error: null, rows: merged.slice(0, limit) };
}

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
    const { rows, error } = await fetchPendingReminderCandidates(table, cutoffIso, maxPerTable);
    if (error) {
      errors.push(`${type}:${error}`);
      console.warn("[pending_whatsapp_reminder] query_failed type=%s error=%s", type, error);
      continue;
    }

    for (const row of rows || []) {
      const payload =
        row.raw_payload && typeof row.raw_payload === "object" ? { ...row.raw_payload } : null;
      const idStr = String(row.id ?? "").trim();
      if (!payload || !idStr) {
        console.info("[pending_whatsapp_reminder] skip reason=no_raw_payload type=%s id=%s", type, idStr || "-");
        continue;
      }
      if (row.submitted_at) {
        payload.submittedAt = row.submitted_at;
        payload.submitted_at = row.submitted_at;
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
              "[pending_whatsapp_reminder] sent type=%s id=%s delivered=%s repeat=%s",
              type,
              idStr,
              String(delivered),
              row.whatsapp_pending_reminder_sent_at ? "1" : "0",
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
