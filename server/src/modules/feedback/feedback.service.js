import crypto from "node:crypto";
import { getEnv } from "../../config/env.js";
import { getSupabase, throwIfSupabaseDatastoreDnsError, withSupabaseFetchGuard } from "../../lib/supabase.js";
import { normalizeGuestRoomForMatch } from "../../lib/guest-match-normalize.js";
import { findHotspotPhoneForRoomAndGuestName } from "../../services/hotel-advisor.service.js";
import {
  formatGuestWhatsAppPhoneDisplay,
  normalizeGuestWhatsAppRecipientDigits,
  sendFeedbackCompletedWhatsApp,
} from "../../services/whatsapp-feedback-invite.service.js";
import { sendOperationalWhatsappNotification } from "../../services/whatsapp-operational-notification.service.js";

const TOKEN_PREFIX = "fb_";
export const FEEDBACK_INVITE_TYPES = new Set(["request", "fault"]);
const FEEDBACK_TYPES = FEEDBACK_INVITE_TYPES;

/** Aynı kayıt için eşzamanlı davet (otomatik «Yapıldı» + elle «Geri bildirim») tek WA mesajına indirgenir. */
const feedbackInviteInflight = new Map();

/** @param {string} type */
function tableForFeedbackType(type) {
  const t = String(type || "").trim();
  if (t === "request") return "guest_requests";
  if (t === "fault") return "guest_faults";
  return "";
}

export function generateFeedbackToken() {
  return `${TOKEN_PREFIX}${crypto.randomBytes(18).toString("base64url")}`;
}

export function normalizeFeedbackTokenParam(raw) {
  const s = String(raw ?? "").trim();
  if (!s.startsWith(TOKEN_PREFIX) || s.length < TOKEN_PREFIX.length + 8) return "";
  if (!/^fb_[0-9A-Za-z_-]+$/.test(s)) return "";
  return s;
}

function normalizeRowStatus(st) {
  return String(st ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

async function sb(fn) {
  return withSupabaseFetchGuard(fn);
}

/** Operatör bypass misafiri: kayıtta telefon yoksa env telefonu (PMS misafiri gibi). */
function operatorBypassGuestPhoneRaw(env, row) {
  if (!env.operatorGateBypassConfigured) return "";
  const room = normalizeGuestRoomForMatch(String(row.room_number || ""));
  const wantRoom = normalizeGuestRoomForMatch(String(env.operatorGateRoom || ""));
  if (!room || !wantRoom || room !== wantRoom) return "";
  const gn = String(row.guest_name || "")
    .trim()
    .toLowerCase();
  const wn = String(env.operatorGateDisplayName || "")
    .trim()
    .toLowerCase();
  if (wn && gn !== wn) return "";
  const digits = normalizeGuestWhatsAppRecipientDigits(
    env.operatorGatePhone,
    env.whatsappGuestDefaultCountryCode || "90",
  );
  if (!digits) return "";
  return formatGuestWhatsAppPhoneDisplay(digits) || digits;
}

function assertGuestFeedbackFeatureEnabled() {
  const env = getEnv();
  if (!env.guestFeedbackFeatureEnabled) {
    throw Object.assign(new Error("feedback_feature_disabled"), { statusCode: 503 });
  }
}

/**
 * Otomatik davet koşulları (saf; test edilebilir).
 * @param {{
 *   type: string,
 *   normalizedStatus: string,
 *   previousStatus?: string,
 *   feedbackStatus?: string,
 *   feedbackInviteCount?: number,
 *   featureEnabled?: boolean,
 *   autoOnDoneEnabled?: boolean,
 * }} p
 * @returns {{ ok: boolean, reason?: string }}
 */
export function shouldAutoInviteGuestFeedbackOnDone(p) {
  const type = String(p?.type || "").trim();
  const normalized = normalizeRowStatus(p?.normalizedStatus);
  const prev = normalizeRowStatus(p?.previousStatus);
  const fb = String(p?.feedbackStatus || "")
    .trim()
    .toLowerCase();
  const inviteCount = Math.max(0, Number(p?.feedbackInviteCount) || 0);
  if (!FEEDBACK_INVITE_TYPES.has(type)) return { ok: false, reason: "invalid_type" };
  if (!p?.featureEnabled) return { ok: false, reason: "feature_disabled" };
  if (!p?.autoOnDoneEnabled) return { ok: false, reason: "auto_disabled" };
  if (normalized !== "done") return { ok: false, reason: "not_done" };
  if (prev === "done") return { ok: false, reason: "already_done" };
  if (inviteCount > 0) return { ok: false, reason: "invite_already_sent" };
  if (fb === "pending" || fb === "submitted") return { ok: false, reason: `feedback_${fb}` };
  return { ok: true };
}

function feedbackInviteMaxFromEnv(env) {
  const n = Number(env?.feedbackInviteMax);
  return Number.isFinite(n) && n > 0 ? Math.min(20, Math.floor(n)) : 3;
}

function feedbackInviteCountFromRow(row) {
  return Math.max(0, Number(row?.feedback_invite_count) || 0);
}

/**
 * Admin «Yapıldı» sonrası arka planda WhatsApp daveti (yanıtı bloklamaz).
 * @param {string} type
 * @param {string} id
 * @param {{ normalizedStatus?: string, previousStatus?: string, feedbackStatus?: string }} ctx
 */
export function scheduleAutoGuestFeedbackInviteOnDone(type, id, ctx = {}) {
  const env = getEnv();
  const idStr = String(id ?? "").trim();
  const gate = shouldAutoInviteGuestFeedbackOnDone({
    type,
    normalizedStatus: ctx.normalizedStatus,
    previousStatus: ctx.previousStatus,
    feedbackStatus: ctx.feedbackStatus,
    feedbackInviteCount: ctx.feedbackInviteCount,
    featureEnabled: env.guestFeedbackFeatureEnabled,
    autoOnDoneEnabled: env.guestFeedbackAutoOnDoneEnabled,
  });
  if (!gate.ok) {
    console.info("[feedback_auto_invite] skip type=%s id=%s reason=%s", type, idStr, gate.reason || "unknown");
    return;
  }
  void inviteGuestFeedback(type, idStr)
    .then((r) => {
      console.info(
        "[feedback_auto_invite] ok type=%s id=%s testMode=%s",
        type,
        idStr,
        Boolean(r?.testMode),
      );
    })
    .catch((err) => {
      console.warn("[feedback_auto_invite] failed type=%s id=%s error=%s", type, idStr, err?.message || err);
    });
}

/**
 * @param {string} token
 * @returns {Promise<{ table: string, row: object }|null>}
 */
export async function findFeedbackRowByToken(token) {
  const tok = normalizeFeedbackTokenParam(token);
  if (!tok) return null;
  for (const table of ["guest_requests", "guest_faults"]) {
    const { data, error } = await sb(() =>
      getSupabase().from(table).select("*").eq("feedback_token", tok).maybeSingle(),
    );
    if (error) throwIfSupabaseDatastoreDnsError(error);
    if (error) throw Object.assign(new Error(error.message || "feedback_lookup_failed"), { cause: error });
    if (data) return { table, row: data };
  }
  return null;
}

/**
 * @param {string} type
 * @param {string} id
 */
export async function inviteGuestFeedback(type, id) {
  const t = String(type || "").trim();
  const idStr = String(id ?? "").trim();
  const inflightKey = `${t}:${idStr}`;
  if (feedbackInviteInflight.has(inflightKey)) {
    return feedbackInviteInflight.get(inflightKey);
  }
  const run = inviteGuestFeedbackOnce(t, idStr).finally(() => {
    feedbackInviteInflight.delete(inflightKey);
  });
  feedbackInviteInflight.set(inflightKey, run);
  return run;
}

/**
 * @param {string} t request | fault
 * @param {string} idStr
 */
async function inviteGuestFeedbackOnce(t, idStr) {
  if (!FEEDBACK_TYPES.has(t)) throw Object.assign(new Error("feedback_invalid_type"), { statusCode: 400 });
  if (!idStr) throw Object.assign(new Error("feedback_id_required"), { statusCode: 400 });

  assertGuestFeedbackFeatureEnabled();

  const table = tableForFeedbackType(t);
  const env = getEnv();
  const origin = String(env.vionaFeedbackPublicOrigin || "").trim();
  if (!origin) throw Object.assign(new Error("feedback_public_origin_not_configured"), { statusCode: 503 });

  const { data: row, error: fetchErr } = await sb(() =>
    getSupabase().from(table).select("*").eq("id", idStr).maybeSingle(),
  );
  if (fetchErr) throwIfSupabaseDatastoreDnsError(fetchErr);
  if (fetchErr) throw Object.assign(new Error(fetchErr.message || "feedback_fetch_failed"), { statusCode: 400 });
  if (!row) throw Object.assign(new Error("record_not_found"), { statusCode: 404 });

  const st = normalizeRowStatus(row.status);
  if (st !== "done") throw Object.assign(new Error("feedback_only_when_done"), { statusCode: 400 });

  const maxInvites = feedbackInviteMaxFromEnv(env);
  const inviteCount = feedbackInviteCountFromRow(row);
  if (inviteCount >= maxInvites) {
    throw Object.assign(new Error("feedback_invite_limit_reached"), {
      statusCode: 409,
      invitesSent: inviteCount,
      invitesMax: maxInvites,
    });
  }

  let phoneRaw = String(row.guest_phone || "").trim();
  if (!phoneRaw) {
    phoneRaw =
      (await findHotspotPhoneForRoomAndGuestName(String(row.room_number || ""), String(row.guest_name || ""))) || "";
  }
  if (!phoneRaw) phoneRaw = operatorBypassGuestPhoneRaw(env, row);

  let toDigits = normalizeGuestWhatsAppRecipientDigits(phoneRaw, env.whatsappGuestDefaultCountryCode || "90");
  if (env.whatsappTestMode) {
    const testDigits = normalizeGuestWhatsAppRecipientDigits(
      env.whatsappTestPhone,
      env.whatsappGuestDefaultCountryCode || "90",
    );
    if (!testDigits) {
      throw Object.assign(new Error("feedback_test_phone_not_configured"), { statusCode: 503 });
    }
    toDigits = testDigits;
  }

  if (!toDigits) {
    throw Object.assign(new Error("feedback_guest_phone_missing"), { statusCode: 400 });
  }

  const token = generateFeedbackToken();
  const feedbackUrlFull = `${origin}/feedback/${encodeURIComponent(token)}`;
  const nowIso = new Date().toISOString();
  const newInviteCount = inviteCount + 1;
  const claimPatch = {
    feedback_token: token,
    feedback_sent_at: nowIso,
    feedback_status: "pending",
    feedback_invite_count: newInviteCount,
    guest_confirmation: null,
    speed_rating: null,
    staff_rating: null,
    solution_rating: null,
    revisit_preference: null,
    feedback_note: null,
    reopen_note: null,
    feedback_submitted_at: null,
    reopened_at: null,
  };

  const { data: claimed, error: claimErr } = await sb(() =>
    getSupabase()
      .from(table)
      .update(claimPatch)
      .eq("id", idStr)
      .eq("status", "done")
      .lt("feedback_invite_count", maxInvites)
      .select("*")
      .maybeSingle(),
  );
  if (claimErr) throwIfSupabaseDatastoreDnsError(claimErr);
  if (claimErr) throw Object.assign(new Error(claimErr.message || "feedback_claim_failed"), { statusCode: 400 });
  if (!claimed) {
    throw Object.assign(new Error("feedback_invite_limit_reached"), {
      statusCode: 409,
      invitesSent: inviteCount,
      invitesMax: maxInvites,
    });
  }

  const guestDisplayName = clipGuestDisplayName(String(claimed.guest_name || "Misafir"));
  const roomNumber = String(claimed.room_number || "-").trim() || "-";

  const wa = await sendFeedbackCompletedWhatsApp({
    toDigits,
    guestDisplayName,
    roomNumber,
    feedbackToken: token,
    feedbackUrlFull,
  });

  if (!wa.ok) {
    await sb(() =>
      getSupabase()
        .from(table)
        .update({
          feedback_token: null,
          feedback_sent_at: null,
          feedback_status: null,
          feedback_invite_count: inviteCount,
          guest_confirmation: null,
          speed_rating: null,
          staff_rating: null,
          solution_rating: null,
          revisit_preference: null,
          feedback_note: null,
          reopen_note: null,
          feedback_submitted_at: null,
          reopened_at: null,
        })
        .eq("id", idStr),
    ).catch(() => {});
    throw Object.assign(new Error(String(wa.reason || "whatsapp_feedback_failed")), { statusCode: 502 });
  }

  return {
    ok: true,
    feedbackUrl: feedbackUrlFull,
    testMode: Boolean(env.whatsappTestMode),
    invitesSent: newInviteCount,
    invitesMax: maxInvites,
    invitesRemaining: Math.max(0, maxInvites - newInviteCount),
    item: claimed,
  };
}

function clipGuestDisplayName(name) {
  const s = String(name || "").trim().replace(/\s+/g, " ");
  if (!s) return "Misafir";
  return s.length <= 120 ? s : `${s.slice(0, 119)}…`;
}

/**
 * Public GET — pending token için güvenli özet.
 * @param {string} token
 */
export async function getFeedbackPublicSnapshot(token) {
  assertGuestFeedbackFeatureEnabled();
  const found = await findFeedbackRowByToken(token);
  if (!found) throw Object.assign(new Error("feedback_not_found"), { statusCode: 404 });
  const st = String(found.row.feedback_status || "").trim().toLowerCase();
  const guestName = clipGuestDisplayName(String(found.row.guest_name || ""));
  const roomNumber = String(found.row.room_number || "").trim() || "-";
  const bucket = found.table === "guest_faults" ? "fault" : "request";

  if (st === "submitted") {
    const guestConfirmation = String(found.row.guest_confirmation || "").trim().toLowerCase();
    const outcome = guestConfirmation === "not_completed" ? "reopened" : "completed";
    return {
      ok: true,
      state: "submitted",
      outcome,
      guestName,
      roomNumber,
      bucket,
    };
  }

  if (st !== "pending") {
    throw Object.assign(new Error("feedback_already_used"), { statusCode: 410 });
  }

  return {
    ok: true,
    state: "pending",
    guestName,
    roomNumber,
    bucket,
  };
}

/**
 * @param {string} token
 * @param {object} body
 */
export async function submitGuestFeedback(token, body = {}) {
  assertGuestFeedbackFeatureEnabled();
  const found = await findFeedbackRowByToken(token);
  if (!found) throw Object.assign(new Error("feedback_not_found"), { statusCode: 404 });
  const row = found.row;
  const table = found.table;
  const idStr = String(row.id || "").trim();

  const st = String(row.feedback_status || "").trim().toLowerCase();
  if (st !== "pending") throw Object.assign(new Error("feedback_already_used"), { statusCode: 410 });

  const solvedRaw = String(body?.solved ?? body?.resolved ?? "").trim().toLowerCase();
  const solved = solvedRaw === "yes" || solvedRaw === "true" || solvedRaw === "1";

  const nowIso = new Date().toISOString();

  if (solved) {
    const speed = Number(body.speedRating ?? body.speed_rating);
    const staff = Number(body.staffRating ?? body.staff_rating);
    const solution = Number(body.solutionRating ?? body.solution_rating);
    const revisit = String(body.revisitPreference ?? body.revisit_preference ?? "")
      .trim()
      .toLowerCase();
    const note = String(body.feedbackNote ?? body.feedback_note ?? "").trim();

    if (!Number.isFinite(speed) || speed < 1 || speed > 5) {
      throw Object.assign(new Error("feedback_invalid_speed_rating"), { statusCode: 400 });
    }
    if (!Number.isFinite(staff) || staff < 1 || staff > 5) {
      throw Object.assign(new Error("feedback_invalid_staff_rating"), { statusCode: 400 });
    }
    if (!Number.isFinite(solution) || solution < 1 || solution > 5) {
      throw Object.assign(new Error("feedback_invalid_solution_rating"), { statusCode: 400 });
    }
    if (!["yes", "unsure", "no"].includes(revisit)) {
      throw Object.assign(new Error("feedback_invalid_revisit"), { statusCode: 400 });
    }
    if (note.length > 4000) throw Object.assign(new Error("feedback_note_too_long"), { statusCode: 400 });

    const patch = {
      feedback_status: "submitted",
      guest_confirmation: "completed",
      speed_rating: Math.round(speed),
      staff_rating: Math.round(staff),
      solution_rating: Math.round(solution),
      revisit_preference: revisit,
      feedback_note: note || null,
      reopen_note: null,
      feedback_submitted_at: nowIso,
    };

    const { error } = await sb(() => getSupabase().from(table).update(patch).eq("id", idStr));
    if (error) throwIfSupabaseDatastoreDnsError(error);
    if (error) throw Object.assign(new Error(error.message || "feedback_submit_failed"), { statusCode: 400 });

    return { ok: true, outcome: "completed" };
  }

  const reopenNote = String(body.reopenNote ?? body.reopen_note ?? "").trim();
  if (reopenNote.length < 3) throw Object.assign(new Error("feedback_reopen_note_required"), { statusCode: 400 });
  if (reopenNote.length > 4000) throw Object.assign(new Error("feedback_reopen_note_too_long"), { statusCode: 400 });

  const patch = {
    feedback_status: "submitted",
    guest_confirmation: "not_completed",
    speed_rating: null,
    staff_rating: null,
    solution_rating: null,
    revisit_preference: null,
    feedback_note: null,
    reopen_note: reopenNote,
    feedback_submitted_at: nowIso,
    reopened_at: nowIso,
    status: "reopened",
    work_started_at: null,
    resolved_at: null,
  };

  const { error } = await sb(() => getSupabase().from(table).update(patch).eq("id", idStr));
  if (error) throwIfSupabaseDatastoreDnsError(error);
  if (error) throw Object.assign(new Error(error.message || "feedback_reopen_failed"), { statusCode: 400 });

  await notifyOpsOnFeedbackReopen(table, idStr, row, reopenNote);

  return { ok: true, outcome: "reopened" };
}

/**
 * @param {string} table
 * @param {string} idStr
 * @param {object} prevRow
 * @param {string} reopenNote
 */
async function notifyOpsOnFeedbackReopen(table, idStr, prevRow, reopenNote) {
  const payload =
    prevRow.raw_payload && typeof prevRow.raw_payload === "object" ? { ...prevRow.raw_payload } : {};
  const recordType = table === "guest_faults" ? "fault" : "request";
  payload.type = recordType;
  payload.name = String(prevRow.guest_name || payload.name || "").trim();
  payload.room = String(prevRow.room_number || payload.room || "").trim();
  payload.category = prevRow.category ?? payload.category;
  payload.description = String(prevRow.description || payload.description || "").trim();
  const suffix = `\n\n[Misafir geri bildirimi — sorun devam ediyor]\n${reopenNote}`;
  payload.description = `${payload.description}${suffix}`.trim();
  if ((payload.submittedAt == null || String(payload.submittedAt).trim() === "") && prevRow.submitted_at) {
    payload.submittedAt = prevRow.submitted_at;
  }

  try {
    await sendOperationalWhatsappNotification(payload, "guest_feedback_reopen", {
      recordId: idStr,
      resend: false,
    });
  } catch (err) {
    console.warn("[feedback_reopen_whatsapp] notify_failed error=%s", err?.message || err);
  }

  try {
    const raw =
      prevRow.raw_payload && typeof prevRow.raw_payload === "object" ? { ...prevRow.raw_payload } : {};
    raw.admin = raw.admin && typeof raw.admin === "object" ? { ...raw.admin } : {};
    raw.admin.feedback_reopen = {
      note: reopenNote,
      at: new Date().toISOString(),
    };
    await sb(() => getSupabase().from(table).update({ raw_payload: raw }).eq("id", idStr));
  } catch (err) {
    console.warn("[feedback_reopen_raw_payload] merge_failed error=%s", err?.message || err);
  }
}
