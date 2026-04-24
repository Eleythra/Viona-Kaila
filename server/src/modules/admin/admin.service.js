import { getSupabase, throwIfSupabaseDatastoreDnsError, withSupabaseFetchGuard } from "../../lib/supabase.js";

/** Geçici DNS (EAI_AGAIN) → datastore_dns_unavailable (503). */
function sb(fn) {
  return withSupabaseFetchGuard(fn);
}

function rethrowSupabaseError(error) {
  if (!error) return;
  throwIfSupabaseDatastoreDnsError(error);
  throw error;
}
import { getEnv } from "../../config/env.js";
import { buildVionaReportData } from "./reporting/report-engine.js";
import { renderVionaPdfBuffer } from "./reporting/pdf.service.js";
import { buildAnalyticsPayload, buildSurveyExtremesForPdf } from "./reporting/analytics-payload.js";
import { computeReportSnapshotId } from "./reporting/report-snapshot-id.js";
import { fetchPdfInsights } from "./reporting/pdf-insight-service.js";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { sendOperationalWhatsappNotification } from "../../services/whatsapp-operational-notification.service.js";

function toPositiveInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parsePaging(query = {}) {
  const page = toPositiveInt(query.page, 1);
  const pageSize = Math.min(toPositiveInt(query.pageSize, 20), 500);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

function isoCalendarDateOnly(v) {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

/** Takvim `YYYY-MM-DD` → UTC günü [00:00, ertesi gün 00:00); tam gün kapsar. Saat içeren değerler olduğu gibi gte/lt. */
function applyDateFilters(qb, query = {}, column = "submitted_at") {
  let out = qb;
  const fromD = isoCalendarDateOnly(query.from);
  const fromRaw = fromD ? "" : String(query.from || "").trim();
  if (fromD) out = out.gte(column, `${fromD}T00:00:00.000Z`);
  else if (fromRaw) out = out.gte(column, fromRaw);

  const toD = isoCalendarDateOnly(query.to);
  const toRaw = toD ? "" : String(query.to || "").trim();
  if (toD) {
    const [y, m, d] = toD.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const ny = next.getUTCFullYear();
    const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(next.getUTCDate()).padStart(2, "0");
    out = out.lt(column, `${ny}-${nm}-${nd}T00:00:00.000Z`);
  } else if (toRaw) out = out.lte(column, toRaw);

  return out;
}

/** Misafir uygulaması Viona sekmesi ile aynı dört soru anahtarı. */
const VIONA_SURVEY_KEYS = [
  "viona_helpfulness",
  "viona_understanding",
  "viona_usability",
  "viona_overall",
];

/** hotel_answers / viona_answers JSON alanlarından soru bazlı ortalama (yalnızca > 0 puanlar).
 * Viona: her soru bağımsız; kısmi doldurulmuş formlar da değerlendirmeler sekmesiyle uyumlu sayılır. */
function aggregateSurveyQuestionScores(rows) {
  const hotelSums = {};
  const hotelCounts = {};
  const vionaSums = {};
  const vionaCounts = {};
  for (const r of rows) {
    const ha = r.hotel_answers && typeof r.hotel_answers === "object" ? r.hotel_answers : {};
    Object.keys(ha).forEach((k) => {
      const v = Number(ha[k]);
      if (!Number.isFinite(v) || v <= 0) return;
      hotelSums[k] = (hotelSums[k] || 0) + v;
      hotelCounts[k] = (hotelCounts[k] || 0) + 1;
    });
    const va = r.viona_answers && typeof r.viona_answers === "object" ? r.viona_answers : {};
    VIONA_SURVEY_KEYS.forEach((k) => {
      const v = Number(va[k]);
      if (!Number.isFinite(v) || v <= 0) return;
      vionaSums[k] = (vionaSums[k] || 0) + v;
      vionaCounts[k] = (vionaCounts[k] || 0) + 1;
    });
  }
  const hotel = {};
  const viona = {};
  Object.keys(hotelSums).forEach((k) => {
    const n = hotelCounts[k] || 1;
    hotel[k] = { avg: Number((hotelSums[k] / n).toFixed(2)), count: n };
  });
  Object.keys(vionaSums).forEach((k) => {
    const n = vionaCounts[k] || 1;
    viona[k] = { avg: Number((vionaSums[k] / n).toFixed(2)), count: n };
  });
  return { hotel, viona };
}

/** listChatObservations ve getChatObservationSummary ile aynı mantık (sayfalama hariç). */
function applyChatObservationListFilters(qb, query = {}) {
  let q = applyDateFilters(qb, query, "created_at");
  if (query.language) q = q.eq("ui_language", String(query.language));
  if (query.intent) q = q.eq("intent", String(query.intent));
  if (query.layer) q = q.eq("layer_used", String(query.layer));
  if (query.domain) q = q.eq("domain", String(query.domain));
  if (query.route_target) q = q.eq("route_target", String(query.route_target));
  if (query.response_type) q = q.eq("response_type", String(query.response_type));
  if (query.session_id) q = q.eq("session_id", String(query.session_id));
  if (query.user_id) q = q.eq("user_id", String(query.user_id));
  if (query.multi_intent === "true") q = q.eq("multi_intent", true);
  if (query.multi_intent === "false") q = q.eq("multi_intent", false);
  if (query.recommendation_made === "true") q = q.eq("recommendation_made", true);
  if (query.recommendation_made === "false") q = q.eq("recommendation_made", false);
  if (query.is_correct === "true") q = q.eq("is_correct", true);
  if (query.is_correct === "false") q = q.eq("is_correct", false);
  if (query.search) {
    const raw = String(query.search).trim();
    if (raw) {
      const escaped = raw.replaceAll(",", " ");
      q = q.or(
        [
          `user_message.ilike.%${escaped}%`,
          `assistant_response.ilike.%${escaped}%`,
          `intent.ilike.%${escaped}%`,
          `domain.ilike.%${escaped}%`,
        ].join(",")
      );
    }
  }
  return q;
}

/** Dashboard/PDF: test/demo oturumlarını yanıtlanamayan konu listesinden düşürür. */
function isLikelyTestChatObservation(row) {
  const sid = String(row.session_id || "").trim().toLowerCase();
  if (/^(test|demo|dev|seed|e2e|qa)[-_]/i.test(sid)) return true;
  if (sid === "test" || sid === "demo" || sid === "dev") return true;
  const msg = String(row.user_message || "").trim();
  if (msg.length <= 1) return true;
  if (/^(test|deneme|hello|hi|ping|ok|asd)\s*$/i.test(msg)) return true;
  return false;
}

const OBS_BATCH = 1000;
const OBS_BATCH_MAX = 500000;

/** Pano `getDashboardReports` ile aynı: tarih yoksa son 30 gün (resolveDateRange({})). */
function normalizeAdminChatLogQuery(query = {}) {
  const q = { ...query };
  const fromE = !String(q.from || "").trim();
  const toE = !String(q.to || "").trim();
  if (fromE && toE) {
    const range = resolveDateRange({});
    q.from = range.from;
    q.to = range.to;
  }
  return q;
}

async function fetchAllChatObservationBatched(filterQuery, selectCols) {
  const all = [];
  let offset = 0;
  for (;;) {
    let qb = getSupabase().from("chat_observations").select(selectCols);
    qb = applyChatObservationListFilters(qb, filterQuery);
    qb = qb.order("created_at", { ascending: true });
    const { data, error } = await sb(() => qb.range(offset, offset + OBS_BATCH - 1));
    if (error) rethrowSupabaseError(error);
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < OBS_BATCH) break;
    offset += OBS_BATCH;
    if (offset > OBS_BATCH_MAX) break;
  }
  return all;
}

async function fetchAllChatObservationRowsForSummary(filterQuery) {
  return fetchAllChatObservationBatched(
    filterQuery,
    "id,created_at,layer_used,intent,response_type,multi_intent,is_correct,session_id,user_message",
  );
}

async function fetchAllRowsBatched(table, selectCols, dateQuery, dateColumn = "created_at") {
  const all = [];
  let offset = 0;
  let truncated = false;
  for (;;) {
    let q = getSupabase().from(table).select(selectCols);
    q = applyDateFilters(q, dateQuery, dateColumn);
    q = q.order(dateColumn, { ascending: true });
    const { data, error } = await sb(() => q.range(offset, offset + OBS_BATCH - 1));
    if (error) {
      throwIfSupabaseDatastoreDnsError(error);
      return { error, data: null, truncated: false };
    }
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < OBS_BATCH) break;
    offset += OBS_BATCH;
    if (offset > OBS_BATCH_MAX) {
      truncated = true;
      break;
    }
  }
  return { error: null, data: all, truncated };
}

export async function listAdminBucket(type, query = {}) {
  const map = {
    request: { table: "guest_requests" },
    complaint: { table: "guest_complaints" },
    fault: { table: "guest_faults" },
    guest_notification: { table: "guest_notifications" },
    late_checkout: { table: "guest_late_checkouts" },
    reservation: { table: "guest_reservations" },
  };
  const cfg = map[type];
  if (!cfg) throw new Error("invalid admin bucket type");

  const paging = parsePaging(query);
  let qb = getSupabase().from(cfg.table).select("*", { count: "exact" }).order("submitted_at", { ascending: false });
  qb = applyDateFilters(qb, query, "submitted_at");
  if (query.status) qb = applyGuestBucketStatusFilter(qb, type, query);
  const searchList = String(query.search ?? "").trim();
  if (type !== "reservation" && searchList) {
    qb = applyGuestBucketSearchOr(qb, type, searchList);
  } else if (type !== "reservation" && query.room_number) {
    const rn = String(query.room_number || "").trim();
    if (rn) qb = qb.eq("room_number", rn);
  }
  if (type === "reservation") {
    if (query.reservation_type) qb = qb.eq("reservation_type", String(query.reservation_type));
    if (query.service_code) qb = qb.eq("service_code", String(query.service_code));
    if (query.room_number) qb = qb.eq("room_number", String(query.room_number));
    if (query.reservation_date) qb = qb.eq("reservation_date", String(query.reservation_date));
  }
  const { data, error, count } = await sb(() => qb.range(paging.from, paging.to));
  if (error) rethrowSupabaseError(error);

  return {
    items: data || [],
    pagination: {
      page: paging.page,
      pageSize: paging.pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / paging.pageSize)),
    },
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidString(id) {
  return typeof id === "string" && UUID_RE.test(id.trim());
}

/** Tek satır (ops derin bağlantı / HK seçili kayıt paneli). */
export async function getAdminBucketItem(type, id) {
  const idStr = String(id ?? "").trim();
  if (!idStr || !isUuidString(idStr)) throw new Error("invalid_id");
  const table = tableForType(type);
  const { data, error } = await sb(() => getSupabase().from(table).select("*").eq("id", idStr).maybeSingle());
  if (error) rethrowSupabaseError(error);
  if (!data) throw new Error("record_not_found");
  return data;
}

const GUEST_BUCKET_TYPES_WITH_NEW = new Set(["request", "fault", "complaint", "guest_notification", "late_checkout"]);

/** Süzgeçte «Bekliyor» (pending) hem eski `new` hem `pending` satırlarını kapsar. */
function applyGuestBucketStatusFilter(qb, type, query = {}) {
  const st = String(query?.status || "").trim();
  if (!st) return qb;
  if (st === "pending" && GUEST_BUCKET_TYPES_WITH_NEW.has(String(type || ""))) {
    return qb.in("status", ["new", "pending"]);
  }
  return qb.eq("status", st);
}

/** Metin araması: virgül/postgREST `or` ayırıcılarından kaçın; ILIKE jokerlerini sınırla. */
function normalizeGuestBucketSearch(raw) {
  const s = String(raw ?? "")
    .trim()
    .slice(0, 80)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ");
  return s;
}

/** `search` doluysa oda tam eşleşmesi yerine bu OR kullanılır (plan). */
function applyGuestBucketSearchOr(qb, type, rawSearch) {
  const term = normalizeGuestBucketSearch(rawSearch);
  if (!term) return qb;
  const pat = `%${term}%`;
  const t = String(type || "").trim();
  const colsByType = {
    request: ["guest_name", "room_number", "description", "category", "other_category_note"],
    complaint: ["guest_name", "room_number", "description", "category", "other_category_note"],
    fault: ["guest_name", "room_number", "description", "category"],
    guest_notification: ["guest_name", "room_number", "description", "category", "other_category_note"],
    late_checkout: ["guest_name", "room_number", "description", "checkout_time"],
  };
  const cols = colsByType[t];
  if (!cols?.length) return qb;
  const ors = cols.map((c) => `${c}.ilike.${pat}`).join(",");
  return qb.or(ors);
}

function applyGuestBucketListFilters(qb, type, query = {}) {
  let q = applyDateFilters(qb, query, "submitted_at");
  const searchRaw = String(query.search ?? "").trim();
  if (type !== "reservation" && searchRaw) {
    q = applyGuestBucketSearchOr(q, type, searchRaw);
  } else if (type !== "reservation" && query.room_number) {
    const rn = String(query.room_number || "").trim();
    if (rn) q = q.eq("room_number", rn);
  }
  if (query.status) q = applyGuestBucketStatusFilter(q, type, query);
  return q;
}

async function countGuestBucketHead(table, type, query, statusRule) {
  let qb = getSupabase().from(table).select("id", { count: "exact", head: true });
  qb = applyGuestBucketListFilters(qb, type, query);
  if (statusRule?.kind === "in") qb = qb.in("status", statusRule.values);
  else if (statusRule?.kind === "eq") qb = qb.eq("status", statusRule.value);
  const { error, count } = await sb(() => qb);
  if (error) rethrowSupabaseError(error);
  return count || 0;
}

function stripPagingAndType(query = {}) {
  const out = { ...query };
  delete out.page;
  delete out.pageSize;
  delete out.type;
  return out;
}

async function countFrontTypeStatusGroups(type, q0) {
  const table = tableForType(type);
  /** `.in()` + `head` bazı ortamlarda güvenilir olmayabildiği için new ve pending ayrı sayılır. */
  const [bekNew, bekPending, islemde, yapildi, yapilmadi, iptal, toplam] = await Promise.all([
    countGuestBucketHead(table, type, q0, { kind: "eq", value: "new" }),
    countGuestBucketHead(table, type, q0, { kind: "eq", value: "pending" }),
    countGuestBucketHead(table, type, q0, { kind: "eq", value: "in_progress" }),
    countGuestBucketHead(table, type, q0, { kind: "eq", value: "done" }),
    countGuestBucketHead(table, type, q0, { kind: "eq", value: "rejected" }),
    countGuestBucketHead(table, type, q0, { kind: "eq", value: "cancelled" }),
    countGuestBucketHead(table, type, q0, null),
  ]);
  const bekliyor = bekNew + bekPending;
  return { bekliyor, islemde, yapildi, yapilmadi, iptal, toplam };
}

/** Şikâyet + misafir bildirimi + geç çıkış: tarih/oda (ve istenirse durum) filtreleriyle özet; kategori bazlı byType. */
export async function getFrontOfficeOperationSummary(query = {}) {
  const types = ["complaint", "guest_notification", "late_checkout"];
  const qAll = stripPagingAndType(query);
  const st = String(qAll.status || "").trim();
  if (st) {
    const byType = {};
    let total = 0;
    const parts = await Promise.all(
      types.map(async (type) => {
        const table = tableForType(type);
        const n = await countGuestBucketHead(table, type, qAll, null);
        return { type, n };
      }),
    );
    for (const { type, n } of parts) {
      byType[type] = {
        bekliyor: 0,
        islemde: 0,
        yapildi: 0,
        yapilmadi: 0,
        iptal: 0,
        toplam: n,
      };
      total += n;
    }
    return { mode: "filtered", total, byType };
  }
  const q0 = { ...qAll };
  delete q0.status;
  const byType = {};
  let bekliyor = 0;
  let islemde = 0;
  let yapildi = 0;
  let yapilmadi = 0;
  let iptal = 0;
  let toplam = 0;
  const perType = await Promise.all(types.map((type) => countFrontTypeStatusGroups(type, q0)));
  types.forEach((type, i) => {
    const c = perType[i];
    byType[type] = c;
    bekliyor += c.bekliyor;
    islemde += c.islemde;
    yapildi += c.yapildi;
    yapilmadi += c.yapilmadi;
    iptal += c.iptal || 0;
    toplam += c.toplam || 0;
  });
  return { mode: "full", bekliyor, islemde, yapildi, yapilmadi, iptal, toplam, byType };
}

const FRONT_SUMMARY_TYPES = new Set(["complaint", "guest_notification", "late_checkout"]);

const GUEST_BUCKET_SUMMARY_TYPES = new Set([
  "request",
  "fault",
  "complaint",
  "guest_notification",
  "late_checkout",
]);

/**
 * Tek misafir kovası için durum sayıları (tarih/oda/durum süzgeci listeyle aynı mantık).
 * HK (`request`), teknik (`fault`) ve ön büro tipleri için kullanılır.
 */
export async function getGuestBucketTypeSummary(type, query = {}) {
  const t = String(type || "").trim();
  if (!GUEST_BUCKET_SUMMARY_TYPES.has(t)) throw new Error("invalid bucket summary type");
  const qAll = stripPagingAndType(query);
  const st = String(qAll.status || "").trim();
  if (st) {
    const table = tableForType(t);
    const n = await countGuestBucketHead(table, t, qAll, null);
    return { mode: "filtered", type: t, toplam: n, bekliyor: 0, islemde: 0, yapildi: 0, yapilmadi: 0, iptal: 0 };
  }
  const q0 = { ...qAll };
  delete q0.status;
  const c = await countFrontTypeStatusGroups(t, q0);
  return { mode: "full", type: t, ...c };
}

/** Tek ön büro kovası için durum sayıları (tarih/oda/durum süzgeci listeyle aynı mantık). */
export async function getFrontOfficeTypeSummary(type, query = {}) {
  const t = String(type || "").trim();
  if (!FRONT_SUMMARY_TYPES.has(t)) throw new Error("invalid front summary type");
  return getGuestBucketTypeSummary(t, query);
}

export async function listSurveySubmissions(query = {}) {
  const paging = parsePaging(query);
  let qb = getSupabase().from("survey_submissions").select("*", { count: "exact" }).order("submitted_at", { ascending: false });
  qb = applyDateFilters(qb, query, "submitted_at");
  if (query.language) qb = qb.eq("language", String(query.language));
  const { data, error, count } = await sb(() => qb.range(paging.from, paging.to));
  if (error) rethrowSupabaseError(error);
  return {
    items: data || [],
    pagination: {
      page: paging.page,
      pageSize: paging.pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / paging.pageSize)),
    },
  };
}

export async function getSurveyReport(query = {}) {
  const selectCols =
    "submitted_at, overall_score, viona_rating, language, device_type, hotel_categories, hotel_answers, viona_answers";
  const dateQuery = { from: query.from, to: query.to };
  const batch = await fetchAllRowsBatched("survey_submissions", selectCols, dateQuery, "submitted_at");
  if (batch.error) throw batch.error;

  const rows = batch.data || [];
  const rowsTruncated = Boolean(batch.truncated);
  if (!rows.length) {
    return {
      totals: { submissions: 0, avgOverall: 0, avgViona: 0, avgOverallSource: "none", avgVionaSource: "none" },
      byLanguage: {},
      byDeviceType: {},
      byCategory: {},
      questionBreakdown: { hotel: {}, viona: {} },
      rowsTruncated: false,
    };
  }

  let sumOverall = 0;
  let countOverallPositive = 0;
  let sumViona = 0;
  let countVionaRated = 0;
  const byLanguage = {};
  const byDeviceType = {};
  const categoryAgg = {};
  const categoryCount = {};
  rows.forEach((r) => {
    const o = Number(r.overall_score || 0);
    if (Number.isFinite(o) && o > 0) {
      sumOverall += o;
      countOverallPositive += 1;
    }
    const vr = Number(r.viona_rating || 0);
    if (vr > 0) {
      sumViona += vr;
      countVionaRated += 1;
    }
    byLanguage[r.language || "unknown"] = (byLanguage[r.language || "unknown"] || 0) + 1;
    byDeviceType[r.device_type || "unknown"] = (byDeviceType[r.device_type || "unknown"] || 0) + 1;
    const cats = r.hotel_categories && typeof r.hotel_categories === "object" ? r.hotel_categories : {};
    Object.keys(cats).forEach((k) => {
      const v = Number(cats[k] || 0);
      if (!Number.isFinite(v) || v <= 0) return;
      categoryAgg[k] = (categoryAgg[k] || 0) + v;
      categoryCount[k] = (categoryCount[k] || 0) + 1;
    });
  });
  const byCategory = {};
  Object.keys(categoryAgg).forEach((k) => {
    byCategory[k] = Number((categoryAgg[k] / (categoryCount[k] || 1)).toFixed(2));
  });
  const questionBreakdown = aggregateSurveyQuestionScores(rows);

  let avgOverall =
    countOverallPositive > 0 ? Number((sumOverall / countOverallPositive).toFixed(2)) : 0;
  let avgOverallSource = countOverallPositive > 0 ? "submission_mean" : "none";

  const categoryVals = Object.values(byCategory).map(Number).filter((x) => Number.isFinite(x) && x > 0);
  if (avgOverall <= 0 && categoryVals.length > 0) {
    avgOverall = Number((categoryVals.reduce((a, b) => a + b, 0) / categoryVals.length).toFixed(2));
    avgOverallSource = "hotel_categories_mean";
  }
  if (avgOverall <= 0) {
    const hotelQ = questionBreakdown?.hotel || {};
    const qAvgs = Object.values(hotelQ)
      .map((cell) => (cell && typeof cell === "object" ? Number(cell.avg) : Number(cell)))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (qAvgs.length > 0) {
      avgOverall = Number((qAvgs.reduce((a, b) => a + b, 0) / qAvgs.length).toFixed(2));
      avgOverallSource = "hotel_questions_mean";
    }
  }

  let avgViona = countVionaRated ? Number((sumViona / countVionaRated).toFixed(2)) : 0;
  let avgVionaSource = countVionaRated > 0 ? "submission_mean" : "none";
  if (avgViona <= 0) {
    const vionaQ = questionBreakdown?.viona || {};
    const vAvgs = Object.values(vionaQ)
      .map((cell) => (cell && typeof cell === "object" ? Number(cell.avg) : Number(cell)))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (vAvgs.length > 0) {
      avgViona = Number((vAvgs.reduce((a, b) => a + b, 0) / vAvgs.length).toFixed(2));
      avgVionaSource = "viona_questions_mean";
    }
  }

  return {
    totals: {
      submissions: rows.length,
      avgOverall,
      avgViona,
      avgOverallSource,
      avgVionaSource,
    },
    byLanguage,
    byDeviceType,
    byCategory,
    questionBreakdown,
    rowsTruncated,
  };
}

function tableForType(type) {
  const map = {
    request: "guest_requests",
    complaint: "guest_complaints",
    fault: "guest_faults",
    guest_notification: "guest_notifications",
    late_checkout: "guest_late_checkouts",
    reservation: "guest_reservations",
  };
  const t = map[String(type || "")];
  if (!t) throw new Error("invalid admin bucket type");
  return t;
}

const VALID_STATUS = new Set(["new", "pending", "in_progress", "done", "cancelled", "rejected"]);

function normalizeIncomingAdminStatus(status) {
  const s = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const aliases = {
    inprogress: "in_progress",
    denied: "rejected",
    declined: "rejected",
    onaylanmadi: "rejected",
    onaylanmadı: "rejected",
    not_approved: "rejected",
    yapilamadi: "rejected",
    yapılamadı: "rejected",
    dikkate_alinmadi: "rejected",
    dikkate_alınmadı: "rejected",
    yapildi: "done",
    yapıldı: "done",
    tamamlandi: "done",
    tamamlandı: "done",
    completed: "done",
    fulfilled: "done",
    resolved: "done",
    dikkate_alindi: "done",
    dikkate_alındı: "done",
  };
  return aliases[s] || s;
}

function formatStatusUpdateFailureMessage(type, normalized, supabaseError) {
  const parts = [
    supabaseError?.message,
    supabaseError?.details,
    supabaseError?.hint,
  ]
    .filter(Boolean)
    .map((x) => String(x));
  const raw = parts.join(" ");
  if (/check constraint|23514|violates check constraint/i.test(raw)) {
    let bucketHint =
      " İstek/şikâyet/arıza: supabase-paste-viona.sql bölüm 8b veya guest-buckets-status-rejected.sql çalıştırın.";
    if (type === "reservation") {
      bucketHint =
        " Rezervasyon: supabase-paste-viona.sql bölüm 9 sonunu (status CHECK) veya guest-reservations-status-rejected.sql çalıştırın; geçersiz status değerleri varsa betikteki OPSİYONEL UPDATE ile temizleyin.";
    } else if (type === "guest_notification") {
      bucketHint =
        " Misafir bildirimleri: server/docs/supabase-paste-viona.sql bölüm 10 (veya guest-notifications-table.sql); status CHECK güncel olmalı (rejected dahil).";
    } else if (type === "late_checkout") {
      bucketHint =
        " Geç çıkış: server/docs/supabase-paste-viona.sql bölüm 11 (guest_late_checkouts); status CHECK güncel olmalı.";
    }
    return `Veritabanı bu durumu kabul etmiyor (CHECK kısıtı).${bucketHint} Teknik: ${raw || "bilinmiyor"}`;
  }
  return raw || supabaseError?.message || "status_update_failed";
}

export async function updateAdminItemStatus(type, id, status) {
  const idStr = String(id ?? "").trim();
  if (!idStr) throw new Error("id is required");
  const normalized = normalizeIncomingAdminStatus(status);
  if (!VALID_STATUS.has(normalized)) throw new Error("invalid status");
  const table = tableForType(type);
  const { data, error } = await sb(() =>
    getSupabase()
      .from(table)
      .update({ status: normalized })
      .eq("id", idStr)
      .select("id,status")
      .maybeSingle(),
  );
  if (error) throw new Error(formatStatusUpdateFailureMessage(type, normalized, error));
  if (!data) {
    const hint =
      normalized === "rejected"
        ? " Supabase: status CHECK ‘rejected’ içermiyor olabilir (bölüm 8b / guest-buckets-status-rejected.sql) veya kayıt id eşleşmiyor."
        : " Kayıt bulunamadı veya güncelleme sonrası satır dönmedi (id / RLS).";
    throw new Error(`status_update_no_row.${hint}`);
  }
  return data;
}

const SATISFACTION_BUCKET_TYPES = new Set(["request", "complaint", "fault", "guest_notification", "late_checkout"]);

/**
 * Misafir memnuniyeti: raw_payload.admin.guest_satisfaction içinde saklanır (1–5 + not).
 * @param {string} type
 * @param {string} id
 * @param {{ score?: unknown, note?: unknown }} body
 */
export async function mergeGuestSatisfactionAdmin(type, id, body = {}) {
  const t = String(type || "").trim();
  if (!SATISFACTION_BUCKET_TYPES.has(t)) throw new Error("invalid admin bucket type");
  const idStr = String(id ?? "").trim();
  if (!idStr) throw new Error("id is required");

  let score = null;
  const rawScore = body.score;
  if (rawScore != null && rawScore !== "") {
    const n = Number(rawScore);
    if (!Number.isFinite(n) || n < 1 || n > 5) throw new Error("invalid satisfaction score");
    score = Math.round(n);
  }
  const note = body.note == null ? "" : String(body.note).trim();

  const table = tableForType(t);
  const { data: row, error: fetchErr } = await sb(() =>
    getSupabase().from(table).select("raw_payload").eq("id", idStr).maybeSingle(),
  );
  if (fetchErr) rethrowSupabaseError(fetchErr);
  if (!row) throw new Error("record_not_found");

  const raw = row.raw_payload && typeof row.raw_payload === "object" ? { ...row.raw_payload } : {};
  const admin = raw.admin && typeof raw.admin === "object" ? { ...raw.admin } : {};
  if (score == null && note === "") {
    if (admin.guest_satisfaction) delete admin.guest_satisfaction;
  } else {
    admin.guest_satisfaction = {
      score,
      note,
      updated_at: new Date().toISOString(),
    };
  }
  raw.admin = admin;

  const { data: out, error: upErr } = await sb(() =>
    getSupabase().from(table).update({ raw_payload: raw }).eq("id", idStr).select("id,raw_payload").maybeSingle(),
  );
  if (upErr) rethrowSupabaseError(upErr);
  if (!out) throw new Error("satisfaction_update_no_row");
  return out;
}

export async function deleteAdminItem(type, id) {
  const idStr = String(id ?? "").trim();
  if (!idStr) throw new Error("id is required");
  const table = tableForType(type);
  const { error } = await sb(() => getSupabase().from(table).delete().eq("id", idStr));
  if (error) rethrowSupabaseError(error);
  return { id };
}

export async function resendWhatsappForAdminItem(type, id) {
  const idStr = String(id ?? "").trim();
  if (!idStr) throw new Error("id is required");
  const table = tableForType(type);
  if (table === "guest_reservations") throw new Error("reservation_not_supported_for_whatsapp");
  const { data, error } = await sb(() => getSupabase().from(table).select("*").eq("id", idStr).maybeSingle());
  if (error) rethrowSupabaseError(error);
  if (!data) throw new Error("record_not_found");
  const payload = data?.raw_payload && typeof data.raw_payload === "object" ? data.raw_payload : null;
  if (!payload) throw new Error("raw_payload_missing");
  const result = await sendOperationalWhatsappNotification(payload, "unknown", {
    recordId: idStr,
    resend: true,
  });
  const mergedPayload = {
    ...payload,
    whatsapp_delivery: {
      channel: String(result?.channel || "unknown"),
      ok: Boolean(result?.ok),
      skipped: Boolean(result?.skipped),
      reason: String(result?.reason || ""),
      groupKey: String(result?.groupKey || ""),
      groupId: String(result?.groupId || ""),
      resentAt: new Date().toISOString(),
      manual: true,
    },
  };
  await sb(() => getSupabase().from(table).update({ raw_payload: mergedPayload }).eq("id", idStr));
  return { id: idStr, result };
}

function groupTop(items, keyName, top = 10) {
  const map = {};
  items.forEach((it) => {
    const key = String(it[keyName] || "").trim().toLowerCase();
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

function hasExplicitDateParams(query = {}) {
  return Boolean(String(query.from || "").trim() || String(query.to || "").trim());
}

export async function getDashboardReports(query = {}) {
  /** Tarih yoksa: pano varsayılanı = güncel özet penceresi (PDF ile aynı; tüm geçmiş değil). */
  const range = hasExplicitDateParams(query) ? resolveDateRange(query) : resolveDateRange({});
  const dateQ = { from: range.from, to: range.to };

  const chatRes = await fetchAllRowsBatched(
    "chat_observations",
    "created_at, session_id, user_message, intent, layer_used, route_target, recommendation_made, ui_language",
    dateQ,
    "created_at"
  );

  let surveyReport = {
    totals: { submissions: 0, avgOverall: 0, avgViona: 0 },
    byLanguage: {},
    byDeviceType: {},
    byCategory: {},
    questionBreakdown: { hotel: {}, viona: {} },
    rowsTruncated: false,
  };
  let surveyOk = true;
  try {
    surveyReport = await getSurveyReport(dateQ);
  } catch (_e) {
    surveyOk = false;
  }

  const chatRowsRaw = chatRes.error ? [] : chatRes.data || [];
  const chatRows = chatRowsRaw.filter((r) => !isLikelyTestChatObservation(r));

  const totalChats = chatRows.length;
  const fallbackCount = chatRows.filter((x) => String(x.layer_used || "") === "fallback").length;
  const fallbackRate = totalChats ? Number(((fallbackCount / totalChats) * 100).toFixed(2)) : 0;

  const perDay = {};
  const perSession = {};
  chatRows.forEach((row) => {
    const d = String(row.created_at || "").slice(0, 10) || "unknown";
    perDay[d] = (perDay[d] || 0) + 1;
    const sid = row.session_id || "unknown";
    perSession[sid] = (perSession[sid] || 0) + 1;
  });
  const uniqueSessions = Object.keys(perSession).length;
  const avgMessagesPerUser = uniqueSessions ? Number((totalChats / uniqueSessions).toFixed(2)) : 0;
  const topQuestions = groupTop(chatRows, "user_message", 10);
  const fallbackTop = groupTop(
    chatRows.filter((x) => String(x.layer_used || "") === "fallback"),
    "user_message",
    10
  );

  const topIntents = groupTop(chatRows, "intent", 8);
  const topUiLanguages = groupTop(chatRows, "ui_language", 6);
  let recommendationCount = 0;
  let routeReception = 0;
  let routeGuestRelations = 0;
  const intentSet = new Set();
  chatRows.forEach((r) => {
    if (r.recommendation_made === true) recommendationCount += 1;
    const rt = String(r.route_target || "").trim();
    if (rt === "reception") routeReception += 1;
    else if (rt === "guest_relations") routeGuestRelations += 1;
    const intentKey = String(r.intent || "unknown").trim().toLowerCase() || "unknown";
    intentSet.add(intentKey);
  });
  const recommendationRate = totalChats ? Number(((recommendationCount / totalChats) * 100).toFixed(2)) : 0;
  const routeOther = Math.max(0, totalChats - routeReception - routeGuestRelations);

  /** Aynı sohbet loglarından; actions tablosu kullanılmıyor (PDF motoru alanları için sıfır). */
  const conversion = {
    actionClicksByType: {},
    actionClicks: 0,
    actionConversions: 0,
    actionConversionRate: 0,
    chatToConversionRate: 0,
  };

  return {
    kpis: {
      totalChats,
      fallbackRate,
      overallSatisfaction: surveyReport.totals.avgOverall,
      vionaSatisfaction: surveyReport.totals.avgViona,
    },
    chatbotPerformance: {
      totalChats,
      uniqueSessions,
      dailyUsage: Object.entries(perDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      avgMessagesPerUser,
      /** PDF / şablon uyumu: oturum başına mesaj ile aynı anlam. */
      avgConversationLength: avgMessagesPerUser,
      fallbackRate,
      topQuestions,
    },
    satisfaction: {
      overallScore: surveyReport.totals.avgOverall,
      overallScoreSource: surveyReport.totals.avgOverallSource || "none",
      vionaScore: surveyReport.totals.avgViona,
      vionaScoreSource: surveyReport.totals.avgVionaSource || "none",
      submissionCount: surveyReport.totals.submissions || 0,
      categories: surveyReport.byCategory || {},
    },
    unansweredQuestions: {
      fallbackCount,
      topFallbackQuestions: fallbackTop,
      repeatedUnanswered: fallbackTop.filter((x) => x.count >= 2),
    },
    conversion,
    chatInsights: {
      topIntents,
      topUiLanguages,
      recommendationCount,
      recommendationRate,
      routeReception,
      routeGuestRelations,
      routeOther,
      intentVariety: intentSet.size,
    },
    dataSources: {
      chatLogs: false,
      chatObservations: !chatRes.error,
      chatObservationsTruncated: Boolean(!chatRes.error && chatRes.truncated),
      surveys: surveyOk,
      usedMockFallback: Boolean(chatRes.error || !surveyOk),
    },
  };
}

function stripNonFilterLogQuery(query = {}) {
  const q = { ...query };
  delete q.page;
  delete q.pageSize;
  delete q.include_raw_payload;
  return q;
}

export async function listChatObservations(query = {}) {
  const paging = parsePaging(query);
  const filterQuery = normalizeAdminChatLogQuery(stripNonFilterLogQuery(query));
  const rawRows = await fetchAllChatObservationBatched(filterQuery, "*");
  const filtered = rawRows.filter((r) => !isLikelyTestChatObservation(r));
  filtered.sort((a, b) => {
    const ta = String(a.created_at || "");
    const tb = String(b.created_at || "");
    return tb.localeCompare(ta);
  });
  const total = filtered.length;
  const start = (paging.page - 1) * paging.pageSize;
  const items = filtered.slice(start, start + paging.pageSize);
  const ps = Math.max(1, paging.pageSize || 1);
  return {
    items,
    pagination: {
      page: paging.page,
      pageSize: paging.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / ps)),
    },
  };
}

export async function updateChatObservationReview(id, payload = {}) {
  if (!id) throw new Error("id is required");
  const patch = {
    is_correct: payload.is_correct,
    review_note: payload.review_note == null ? null : String(payload.review_note),
    reviewed_by: payload.reviewed_by == null ? null : String(payload.reviewed_by),
    reviewed_at: new Date().toISOString(),
  };
  const { data, error } = await sb(() =>
    getSupabase().from("chat_observations").update(patch).eq("id", id).select("*").single(),
  );
  if (error) rethrowSupabaseError(error);
  return data;
}

export async function deleteChatObservation(id) {
  if (!id) throw new Error("id is required");
  const { error } = await sb(() => getSupabase().from("chat_observations").delete().eq("id", id));
  if (error) rethrowSupabaseError(error);
  return { id };
}

const CHAT_OBSERVATION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aynı istekte en fazla bu kadar uuid silinir (aşırı yükü önlemek için). */
const CHAT_OBSERVATIONS_BULK_DELETE_MAX = 200;

/**
 * @param {unknown} ids
 * @returns {Promise<{ deleted: number, ids: string[] }>}
 */
export async function deleteChatObservationsBulk(ids) {
  const raw = Array.isArray(ids) ? ids : [];
  const seen = new Set();
  const unique = [];
  for (const x of raw) {
    const id = String(x ?? "").trim();
    if (!id || !CHAT_OBSERVATION_ID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= CHAT_OBSERVATIONS_BULK_DELETE_MAX) break;
  }
  if (!unique.length) {
    return { deleted: 0, ids: [] };
  }
  const { error } = await sb(() => getSupabase().from("chat_observations").delete().in("id", unique));
  if (error) rethrowSupabaseError(error);
  return { deleted: unique.length, ids: unique };
}

export async function getChatObservationSummary(query = {}) {
  const filterQuery = normalizeAdminChatLogQuery(stripNonFilterLogQuery(query));
  const rowsRaw = await fetchAllChatObservationRowsForSummary(filterQuery);
  const rows = rowsRaw.filter((r) => !isLikelyTestChatObservation(r));

  const summary = {
    total: rows.length,
    fallbackCount: 0,
    multiIntentCount: 0,
    recommendationCount: 0,
    reviewedCount: 0,
    correctCount: 0,
    wrongCount: 0,
    byLayer: {},
    byIntent: {},
    byResponseType: {},
  };

  rows.forEach((r) => {
    const layer = String(r.layer_used || "unknown");
    const intent = String(r.intent || "unknown");
    const responseType = String(r.response_type || "unknown");
    summary.byLayer[layer] = (summary.byLayer[layer] || 0) + 1;
    summary.byIntent[intent] = (summary.byIntent[intent] || 0) + 1;
    summary.byResponseType[responseType] = (summary.byResponseType[responseType] || 0) + 1;
    if (layer === "fallback") summary.fallbackCount += 1;
    if (Boolean(r.multi_intent)) summary.multiIntentCount += 1;
    if (intent === "recommendation") summary.recommendationCount += 1;
    if (r.is_correct === true) {
      summary.reviewedCount += 1;
      summary.correctCount += 1;
    } else if (r.is_correct === false) {
      summary.reviewedCount += 1;
      summary.wrongCount += 1;
    }
  });

  const pct = (num, den) => (den ? Number(((num / den) * 100).toFixed(2)) : 0);
  summary.fallbackRate = pct(summary.fallbackCount, summary.total);
  summary.multiIntentRate = pct(summary.multiIntentCount, summary.total);
  summary.correctRate = pct(summary.correctCount, summary.reviewedCount);
  summary.recommendationRate = pct(summary.recommendationCount, summary.total);
  summary.reviewCoverageRate = pct(summary.reviewedCount, summary.total);
  return summary;
}

function csvEscape(value) {
  const v = value == null ? "" : String(value);
  return `"${v.replaceAll('"', '""')}"`;
}

function boolToYesNo(v) {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "";
}

function cleanText(v) {
  return String(v == null ? "" : v).replaceAll(/\s+/g, " ").trim();
}

function mapObservationRow(row = {}, includeRawPayload = false) {
  const out = {
    created_at: row.created_at || "",
    session_id: row.session_id || "",
    user_id: row.user_id || "",
    user_message: cleanText(row.user_message),
    ui_language: row.ui_language || "",
    detected_language: row.detected_language || "",
    intent: row.intent || "",
    domain: row.domain || "",
    sub_intent: row.sub_intent || "",
    entity: row.entity || "",
    confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : "",
    multi_intent: boolToYesNo(row.multi_intent),
    response_type: row.response_type || "",
    route_target: row.route_target || "",
    recommendation_made: boolToYesNo(row.recommendation_made),
    layer_used: row.layer_used || "",
    fallback_reason: row.fallback_reason || "",
    decision_path: cleanText(row.decision_path),
    assistant_response: cleanText(row.assistant_response),
    is_correct: boolToYesNo(row.is_correct),
    review_note: cleanText(row.review_note),
    reviewed_by: row.reviewed_by || "",
    reviewed_at: row.reviewed_at || "",
  };
  if (includeRawPayload) out.raw_payload = row.raw_payload ? JSON.stringify(row.raw_payload) : "";
  return out;
}

function extractExportFilters(query = {}) {
  return {
    from: query.from || "",
    to: query.to || "",
    language: query.language || "",
    intent: query.intent || "",
    layer: query.layer || "",
    domain: query.domain || "",
    route_target: query.route_target || "",
    response_type: query.response_type || "",
    session_id: query.session_id || "",
    user_id: query.user_id || "",
    multi_intent: query.multi_intent || "",
    recommendation_made: query.recommendation_made || "",
    is_correct: query.is_correct || "",
    search: query.search || "",
    include_raw_payload: String(query.include_raw_payload || "false") === "true" ? "true" : "false",
  };
}

/** CSV üst bilgisi ve sütun sözlüğü (Türkçe); Excel’de # ile başlayan satırlar tek hücrede görünür. */
const CHAT_OBS_CSV_COL_META = {
  created_at: {
    trHeader: "olusturulma_zamani",
    trDesc: "Kaydın oluşturulduğu zaman (ISO 8601, UTC).",
  },
  session_id: {
    trHeader: "oturum_kimligi",
    trDesc: "Misafir oturumu tanımlayıcısı (anonim veya uygulama oturumu).",
  },
  user_id: {
    trHeader: "kullanici_kimligi",
    trDesc: "Giriş yapmış kullanıcı kimliği; boş olabilir.",
  },
  user_message: {
    trHeader: "misafir_mesaji",
    trDesc: "Misafirin gönderdiği metin (tek satıra indirgenmiş).",
  },
  ui_language: {
    trHeader: "arayuz_dili",
    trDesc: "Uygulama arayüzünde seçilen dil kodu.",
  },
  detected_language: {
    trHeader: "alginan_dil",
    trDesc: "Metinden tahmin edilen dil kodu.",
  },
  intent: {
    trHeader: "niyet_intent",
    trDesc: "Sınıflandırılmış ana niyet (backend IntentName ile uyumlu teknik ad).",
  },
  domain: {
    trHeader: "alan_domain",
    trDesc: "Konu alanı (ör. spa, oda); boş olabilir.",
  },
  sub_intent: {
    trHeader: "alt_niyet",
    trDesc: "Daha ince taneli niyet veya alt sınıf; model veya kural çıktısı.",
  },
  entity: {
    trHeader: "varlik_entity",
    trDesc: "Çıkarılan varlık adı veya kodu (ör. hizmet kodu); boş olabilir.",
  },
  confidence: {
    trHeader: "guven_skoru",
    trDesc: "Niyet güveni (0–1 arası sayı); boş ise kayıtta yoktur.",
  },
  multi_intent: {
    trHeader: "coklu_niyet_evet_hayir",
    trDesc: "Birden fazla konu işaretlendi mi (yes/no).",
  },
  response_type: {
    trHeader: "yanit_turu",
    trDesc: "Yanıt modu türü (ör. fixed, guided, answer, fallback).",
  },
  route_target: {
    trHeader: "yonlendirme_hedefi",
    trDesc: "Operasyonel yönlendirme hedefi; yoksa boş.",
  },
  recommendation_made: {
    trHeader: "oneri_verildi_evet_hayir",
    trDesc: "Bu turda somut öneri üretildi mi (yes/no).",
  },
  layer_used: {
    trHeader: "kullanilan_katman",
    trDesc: "Yanıtın üretildiği katman (rule, rag, llm, fallback).",
  },
  fallback_reason: {
    trHeader: "yedek_katman_nedeni",
    trDesc: "Fallback’e düşüldüyse kısa gerekçe metni.",
  },
  decision_path: {
    trHeader: "karar_yolu",
    trDesc: "Kural/orkestrasyon özeti (tek satır).",
  },
  assistant_response: {
    trHeader: "asistan_yaniti",
    trDesc: "Misafire gösterilen asistan yanıtı (tek satıra indirgenmiş).",
  },
  is_correct: {
    trHeader: "inceleme_dogru_evet_hayir",
    trDesc: "Manuel incelemede doğru işaretlendi mi (yes/no).",
  },
  review_note: {
    trHeader: "inceleme_notu",
    trDesc: "İnceleyenin serbest metin notu.",
  },
  reviewed_by: {
    trHeader: "inceleyen",
    trDesc: "İncelemeyi yapan kullanıcı veya kimlik.",
  },
  reviewed_at: {
    trHeader: "inceleme_zamani",
    trDesc: "İncelemenin yapıldığı zaman (ISO).",
  },
  raw_payload: {
    trHeader: "ham_yuk_json",
    trDesc: "İsteğe bağlı: ham JSON yükü (yalnızca panelde işaretlenirse).",
  },
};

function csvCommentLine(text) {
  const t = String(text || "").replaceAll("\r\n", " ").replaceAll("\n", " ").replaceAll("\r", " ");
  return `# ${t}`;
}

function summarizeExportFiltersTr(f) {
  const parts = [];
  if (f.from || f.to) parts.push(`tarih ${f.from || "—"} … ${f.to || "—"}`);
  if (f.language) parts.push(`arayüz dili=${f.language}`);
  if (f.intent) parts.push(`intent=${f.intent}`);
  if (f.layer) parts.push(`katman=${f.layer}`);
  if (f.domain) parts.push(`domain=${f.domain}`);
  if (f.route_target) parts.push(`route_target=${f.route_target}`);
  if (f.response_type) parts.push(`yanıt türü=${f.response_type}`);
  if (f.session_id) parts.push(`oturum=${f.session_id}`);
  if (f.user_id) parts.push(`kullanıcı=${f.user_id}`);
  if (f.multi_intent) parts.push(`çoklu niyet=${f.multi_intent}`);
  if (f.recommendation_made) parts.push(`öneri=${f.recommendation_made}`);
  if (f.is_correct) parts.push(`doğruluk incelemesi=${f.is_correct}`);
  if (f.search) parts.push(`arama="${f.search}"`);
  if (f.include_raw_payload === "true") parts.push("raw_payload dahil");
  return parts.length ? parts.join(" | ") : "ek filtre yok (tarih dışında)";
}

function buildChatObservationCsvPreamble(query, columns, dataRowCount) {
  const f = extractExportFilters(query);
  const exportedAt = new Date().toISOString();
  const lines = [
    csvCommentLine("Viona — Sohbet gözlemleri (chat_observations) dışa aktarımı"),
    csvCommentLine(
      "Bu dosya yönetim panelindeki liste ile aynı filtre mantığını kullanır; veri satırları aşağıdadır."
    ),
    csvCommentLine(`Dışa aktarım zamanı (ISO UTC): ${exportedAt}`),
    csvCommentLine(`Aktarılan veri satırı sayısı: ${dataRowCount} (üst sınır 5000; daha çok eşleşme varsa kesilir).`),
    csvCommentLine("Sıralama: en yeni kayıt önce (created_at azalan)."),
    csvCommentLine(`Uygulanan filtre özeti: ${summarizeExportFiltersTr(f)}`),
    csvCommentLine(""),
    csvCommentLine("--- Sütun başlıkları (bir sonraki satır) soldan sağa aşağıdaki açıklama sırasıyla eşleşir ---"),
  ];
  columns.forEach((key) => {
    const meta = CHAT_OBS_CSV_COL_META[key];
    const desc = meta ? meta.trDesc : "Ek alan.";
    const head = meta ? meta.trHeader : key;
    lines.push(csvCommentLine(`${head} (${key}): ${desc}`));
  });
  lines.push(csvCommentLine("--- Veri başlığı (Türkçe kısa adlar) ---"));
  return lines;
}

export async function exportChatObservations(query = {}, format = "csv") {
  const nq = normalizeAdminChatLogQuery({ ...query });
  let qb = getSupabase().from("chat_observations").select("*").order("created_at", { ascending: false });
  qb = applyChatObservationListFilters(qb, nq);
  const { data, error } = await sb(() => qb.limit(5000));
  if (error) rethrowSupabaseError(error);
  const rows = (data || []).filter((r) => !isLikelyTestChatObservation(r));
  const includeRawPayload = String(query.include_raw_payload || "false") === "true";
  const mapped = rows.map((row) => mapObservationRow(row, includeRawPayload));
  const columns = Object.keys(mapped[0] || mapObservationRow({}, includeRawPayload));
  if (format === "json") {
    return JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        record_count: mapped.length,
        export_row_cap: 5000,
        note_tr:
          "En fazla 5000 satır döner; filtre listeyle aynıdır. Sütun açıklamaları için CSV dışa aktarımına bakın.",
        filters: extractExportFilters(query),
        columns,
        column_descriptions_tr: Object.fromEntries(
          columns.map((c) => [c, CHAT_OBS_CSV_COL_META[c]?.trDesc || ""])
        ),
        rows: mapped,
      },
      null,
      2
    );
  }

  const preamble = buildChatObservationCsvPreamble(query, columns, mapped.length);
  const headerRow = columns.map((c) => csvEscape(CHAT_OBS_CSV_COL_META[c]?.trHeader || c)).join(",");
  const lines = [...preamble, headerRow];
  mapped.forEach((row) => {
    lines.push(columns.map((c) => csvEscape(row[c])).join(","));
  });
  return lines.join("\n");
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Tarih alanları YYYY-MM-DD ise gün sınırlarını UTC ile sabitler (tarayıcı timezone kayması azalır).
 */
/** Boş query ile çağrıldığında: bugüne kadar son 30 gün (pano / PDF varsayılanı). */
function resolveDateRange(query = {}) {
  const fromRaw = String(query.from || "").trim();
  const toRaw = String(query.to || "").trim();
  if (ISO_DATE_ONLY.test(fromRaw) && ISO_DATE_ONLY.test(toRaw)) {
    return {
      from: `${fromRaw}T00:00:00.000Z`,
      to: `${toRaw}T23:59:59.999Z`,
    };
  }
  const now = new Date();
  const to = query.to ? new Date(query.to) : now;
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 1000 * 60 * 60 * 24 * 30);
  const safeFrom = Number.isNaN(from.getTime()) ? new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30) : from;
  const safeTo = Number.isNaN(to.getTime()) ? now : to;
  return {
    from: safeFrom.toISOString(),
    to: safeTo.toISOString(),
  };
}

/**
 * PDF: başlangıç + bitiş ikisi de doluysa seçilen aralık; aksi halde pano ile aynı güncel özet penceresi (resolveDateRange({}) → son ~30 gün).
 * Dışa açık: tarih filtresi testleri için.
 */
export function resolvePdfDateRange(query = {}) {
  const fromQ = String(query.from || "").trim();
  const toQ = String(query.to || "").trim();
  if (fromQ && toQ) {
    return resolveDateRange({ from: fromQ, to: toQ });
  }
  return resolveDateRange({});
}

function previousPeriod(range) {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const diff = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1000);
  const prevFrom = new Date(prevTo.getTime() - Math.max(diff, 1000 * 60 * 60 * 24));
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
}

function fileSafeName(v = "") {
  return String(v || "otel")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function resolveProjectRoot() {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  return path.resolve(currentDir, "../../../../");
}

function imageDataUriIfExists(absPath) {
  if (!existsSync(absPath)) return "";
  const fileBuffer = readFileSync(absPath);
  let mime = "image/png";
  if (fileBuffer.length >= 3 && fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff) {
    mime = "image/jpeg";
  } else if (
    fileBuffer.length >= 4 &&
    fileBuffer[0] === 0x52 &&
    fileBuffer[1] === 0x49 &&
    fileBuffer[2] === 0x46 &&
    fileBuffer[3] === 0x46
  ) {
    mime = "image/webp";
  } else if (
    fileBuffer.length >= 8 &&
    fileBuffer[0] === 0x89 &&
    fileBuffer[1] === 0x50 &&
    fileBuffer[2] === 0x4e &&
    fileBuffer[3] === 0x47
  ) {
    mime = "image/png";
  }
  const b64 = fileBuffer.toString("base64");
  return `data:${mime};base64,${b64}`;
}

function firstExistingImageDataUri(candidates = []) {
  for (const p of candidates) {
    const data = imageDataUriIfExists(p);
    if (data) return data;
  }
  return "";
}

function createDummyDashboardReport() {
  return {
    kpis: { totalChats: 420, fallbackRate: 13.1, overallSatisfaction: 4.18, vionaSatisfaction: 3.98 },
    chatbotPerformance: {
      totalChats: 420,
      uniqueSessions: 95,
      dailyUsage: [
        { date: "2026-03-20", count: 52 },
        { date: "2026-03-21", count: 49 },
        { date: "2026-03-22", count: 57 },
      ],
      avgMessagesPerUser: 4.4,
      avgConversationLength: 4.6,
      fallbackRate: 13.1,
      topQuestions: [{ key: "restoran rezervasyonu", count: 34 }],
    },
    satisfaction: {
      overallScore: 4.18,
      overallScoreSource: "submission_mean",
      vionaScore: 3.98,
      vionaScoreSource: "submission_mean",
      submissionCount: 120,
      categories: {
        generalEval: 4.35,
        food_main_restaurant: 4.2,
        food_la_terracca: 4.4,
        food_snack_dolphin_gusto: 4.1,
        food_bars: 4.0,
        comfort: 4.25,
        staff: 4.3,
        pool_area: 4.15,
        beach_area: 4.05,
        spaWellness: 4.0,
        guestExperience: 4.2,
      },
    },
    unansweredQuestions: {
      fallbackCount: 55,
      topFallbackQuestions: [
        { key: "havaalani transfer ucreti", count: 15 },
        { key: "late checkout fiyati", count: 11 },
        { key: "spa paket detaylari", count: 9 },
      ],
      repeatedUnanswered: [
        { key: "havaalani transfer ucreti", count: 15 },
        { key: "late checkout fiyati", count: 11 },
      ],
    },
    conversion: {
      actionClicksByType: { spa: 42, restaurant: 33, transfer: 14, activity: 18 },
      actionClicks: 107,
      actionConversions: 17,
      actionConversionRate: 15.89,
      chatToConversionRate: 4.05,
    },
    chatInsights: {
      topIntents: [
        { key: "hotel_info", count: 98 },
        { key: "recommendation", count: 76 },
        { key: "request", count: 54 },
      ],
      topUiLanguages: [
        { key: "tr", count: 240 },
        { key: "en", count: 120 },
        { key: "de", count: 40 },
      ],
      recommendationCount: 88,
      recommendationRate: 20.95,
      routeReception: 155,
      routeGuestRelations: 42,
      routeOther: 223,
      intentVariety: 9,
    },
    dataSources: {
      chatLogs: false,
      chatObservations: true,
      surveys: false,
      usedMockFallback: true,
    },
  };
}

function createEmptyDashboardReport() {
  return {
    kpis: { totalChats: 0, fallbackRate: 0, overallSatisfaction: 0, vionaSatisfaction: 0 },
    chatbotPerformance: {
      totalChats: 0,
      uniqueSessions: 0,
      dailyUsage: [],
      avgMessagesPerUser: 0,
      avgConversationLength: 0,
      fallbackRate: 0,
      topQuestions: [],
    },
    satisfaction: {
      overallScore: 0,
      overallScoreSource: "none",
      vionaScore: 0,
      vionaScoreSource: "none",
      submissionCount: 0,
      categories: {},
    },
    unansweredQuestions: {
      fallbackCount: 0,
      topFallbackQuestions: [],
      repeatedUnanswered: [],
    },
    conversion: {
      actionClicksByType: {},
      actionClicks: 0,
      actionConversions: 0,
      actionConversionRate: 0,
      chatToConversionRate: 0,
    },
    chatInsights: {
      topIntents: [],
      topUiLanguages: [],
      recommendationCount: 0,
      recommendationRate: 0,
      routeReception: 0,
      routeGuestRelations: 0,
      routeOther: 0,
      intentVariety: 0,
    },
    dataSources: {
      chatLogs: false,
      chatObservations: false,
      surveys: false,
      usedMockFallback: true,
    },
  };
}

function hasAnyData(report) {
  if (!report) return false;
  const categories = Object.keys(report.satisfaction?.categories || {}).length;
  return Boolean(
    (report.chatbotPerformance?.totalChats || 0) > 0 ||
      (report.unansweredQuestions?.fallbackCount || 0) > 0 ||
      (report.conversion?.actionClicks || 0) > 0 ||
      (report.conversion?.actionConversions || 0) > 0 ||
      (report.satisfaction?.overallScore || 0) > 0 ||
      (report.satisfaction?.vionaScore || 0) > 0 ||
      categories > 0
  );
}

export async function getPdfReportPackage(query = {}) {
  const range = resolvePdfDateRange(query);
  const hotelName = String(query.hotelName || "Kaila Beach Hotel").trim() || "Kaila Beach Hotel";
  const useDummy = String(query.useDemo || "") === "1";
  let currentReport = useDummy ? createDummyDashboardReport() : null;
  if (!currentReport) {
    try {
      currentReport = await getDashboardReports(range);
    } catch (_e) {
      currentReport = createEmptyDashboardReport();
    }
  }

  let previousReport = null;
  if (String(query.comparePrev || "0") === "1") {
    const prevRange = previousPeriod(range);
    try {
      previousReport = useDummy ? createDummyDashboardReport() : await getDashboardReports(prevRange);
    } catch (_e) {
      previousReport = null;
    }
  }

  let surveyForPdf = null;
  try {
    surveyForPdf = await getSurveyReport({ from: range.from, to: range.to });
  } catch (_e) {
    surveyForPdf = null;
  }

  if (!useDummy && surveyForPdf?.totals) {
    const t = surveyForPdf.totals;
    currentReport = {
      ...currentReport,
      satisfaction: {
        ...(currentReport.satisfaction || {}),
        overallScore: t.avgOverall,
        overallScoreSource: t.avgOverallSource || "none",
        vionaScore: t.avgViona,
        vionaScoreSource: t.avgVionaSource || "none",
        submissionCount: t.submissions || 0,
        categories: surveyForPdf.byCategory || currentReport.satisfaction?.categories || {},
      },
    };
  }

  const reportData = buildVionaReportData({
    hotelName,
    dateRange: range,
    current: currentReport,
    previous: previousReport,
  });
  const customPdfRange = Boolean(String(query.from || "").trim() && String(query.to || "").trim());
  reportData.pdfUsesCustomDateRange = customPdfRange;
  reportData.pdfRangeNote = customPdfRange
    ? "Seçtiğiniz tarih aralığı uygulanmıştır."
    : "Bu rapor oluşturulduğu andaki güncel veri snapshot'ına dayanır.";
  reportData.chatObservationsTruncated = Boolean(currentReport?.dataSources?.chatObservationsTruncated);
  reportData.surveyExtremes = buildSurveyExtremesForPdf(surveyForPdf);
  if (surveyForPdf?.questionBreakdown?.viona && reportData.satisfactionMetrics) {
    reportData.satisfactionMetrics.vionaByQuestion = surveyForPdf.questionBreakdown.viona;
  }

  const analyticsPayload = buildAnalyticsPayload({
    hotelName,
    dateRange: range,
    currentReport,
    previousReport,
    reportData,
    surveyReport: surveyForPdf,
    flags: { comparePrev: String(query.comparePrev || "0") === "1" },
  });
  const reportSnapshotId = computeReportSnapshotId(analyticsPayload);
  analyticsPayload.meta = { ...analyticsPayload.meta, report_snapshot_id: reportSnapshotId };
  reportData.reportSnapshotId = reportSnapshotId;
  reportData.aiInsights = await fetchPdfInsights(analyticsPayload);

  const env = getEnv();
  const root = resolveProjectRoot();
  const hotelImageCandidates = [
    env.reportHotelCoverPath && path.isAbsolute(env.reportHotelCoverPath)
      ? env.reportHotelCoverPath
      : env.reportHotelCoverPath
        ? path.resolve(root, env.reportHotelCoverPath)
        : "",
    path.resolve(root, "assets/images/anasayfa1-5bb856f7-1a6f-422f-a788-b74e9a1081f8.png"),
  ].filter(Boolean);
  const logoCandidates = [
    env.reportBrandLogoPath && path.isAbsolute(env.reportBrandLogoPath)
      ? env.reportBrandLogoPath
      : env.reportBrandLogoPath
        ? path.resolve(root, env.reportBrandLogoPath)
        : "",
  ].filter(Boolean);
  reportData.hotelImageUrl = firstExistingImageDataUri(hotelImageCandidates);
  reportData.brandLogoUrl = firstExistingImageDataUri(logoCandidates);
  reportData.noData = !hasAnyData(currentReport);

  const buffer = await renderVionaPdfBuffer(reportData);
  const ymd = new Date(reportData.generatedAt).toISOString().slice(0, 10);
  const fileName = `viona-raporu-${fileSafeName(hotelName)}-${ymd}.pdf`;

  return { buffer, fileName, reportData, noData: reportData.noData };
}
