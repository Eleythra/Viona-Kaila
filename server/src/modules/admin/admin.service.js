import { supabase } from "../../lib/supabase.js";

function toPositiveInt(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function parsePaging(query = {}) {
  const page = toPositiveInt(query.page, 1);
  const pageSize = Math.min(toPositiveInt(query.pageSize, 20), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

function applyDateFilters(qb, query = {}, column = "submitted_at") {
  let out = qb;
  if (query.from) out = out.gte(column, query.from);
  if (query.to) out = out.lte(column, query.to);
  return out;
}

export async function listAdminBucket(type, query = {}) {
  const map = {
    request: { table: "guest_requests" },
    complaint: { table: "guest_complaints" },
    fault: { table: "guest_faults" },
    reservation: { table: "guest_reservations" },
  };
  const cfg = map[type];
  if (!cfg) throw new Error("invalid admin bucket type");

  const paging = parsePaging(query);
  let qb = supabase.from(cfg.table).select("*", { count: "exact" }).order("submitted_at", { ascending: false });
  qb = applyDateFilters(qb, query, "submitted_at");
  if (query.status) qb = qb.eq("status", String(query.status));
  const { data, error, count } = await qb.range(paging.from, paging.to);
  if (error) throw error;

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

export async function listSurveySubmissions(query = {}) {
  const paging = parsePaging(query);
  let qb = supabase.from("survey_submissions").select("*", { count: "exact" }).order("submitted_at", { ascending: false });
  qb = applyDateFilters(qb, query, "submitted_at");
  if (query.language) qb = qb.eq("language", String(query.language));
  const { data, error, count } = await qb.range(paging.from, paging.to);
  if (error) throw error;
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
  let qb = supabase
    .from("survey_submissions")
    .select("submitted_at, overall_score, viona_rating, language, device_type")
    .order("submitted_at", { ascending: false });
  qb = applyDateFilters(qb, query, "submitted_at");
  const { data, error } = await qb;
  if (error) throw error;

  const rows = data || [];
  if (!rows.length) {
    return {
      totals: { submissions: 0, avgOverall: 0, avgViona: 0 },
      byLanguage: {},
      byDeviceType: {},
    };
  }

  let sumOverall = 0;
  let sumViona = 0;
  const byLanguage = {};
  const byDeviceType = {};
  rows.forEach((r) => {
    sumOverall += Number(r.overall_score || 0);
    sumViona += Number(r.viona_rating || 0);
    byLanguage[r.language || "unknown"] = (byLanguage[r.language || "unknown"] || 0) + 1;
    byDeviceType[r.device_type || "unknown"] = (byDeviceType[r.device_type || "unknown"] || 0) + 1;
  });
  return {
    totals: {
      submissions: rows.length,
      avgOverall: Number((sumOverall / rows.length).toFixed(2)),
      avgViona: Number((sumViona / rows.length).toFixed(2)),
    },
    byLanguage,
    byDeviceType,
  };
}
