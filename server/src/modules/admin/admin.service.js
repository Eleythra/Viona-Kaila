import { supabase } from "../../lib/supabase.js";
import { buildVionaReportData } from "./reporting/report-engine.js";
import { renderVionaPdfBuffer } from "./reporting/pdf.service.js";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";

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
      byCategory: {},
    };
  }

  let sumOverall = 0;
  let sumViona = 0;
  const byLanguage = {};
  const byDeviceType = {};
  const categoryAgg = {};
  const categoryCount = {};
  rows.forEach((r) => {
    sumOverall += Number(r.overall_score || 0);
    sumViona += Number(r.viona_rating || 0);
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
  return {
    totals: {
      submissions: rows.length,
      avgOverall: Number((sumOverall / rows.length).toFixed(2)),
      avgViona: Number((sumViona / rows.length).toFixed(2)),
    },
    byLanguage,
    byDeviceType,
    byCategory,
  };
}

function tableForType(type) {
  const map = {
    request: "guest_requests",
    complaint: "guest_complaints",
    fault: "guest_faults",
    reservation: "guest_reservations",
  };
  const t = map[String(type || "")];
  if (!t) throw new Error("invalid admin bucket type");
  return t;
}

const VALID_STATUS = new Set(["new", "pending", "in_progress", "done", "cancelled"]);

export async function updateAdminItemStatus(type, id, status) {
  if (!id) throw new Error("id is required");
  if (!VALID_STATUS.has(String(status || ""))) throw new Error("invalid status");
  const table = tableForType(type);
  const { data, error } = await supabase.from(table).update({ status }).eq("id", id).select("id,status").single();
  if (error) throw error;
  return data;
}

export async function deleteAdminItem(type, id) {
  if (!id) throw new Error("id is required");
  const table = tableForType(type);
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
  return { id };
}

export async function getPromoConfig() {
  const { data, error } = await supabase
    .from("promo_configs")
    .select("*")
    .eq("key", "discount_popup")
    .maybeSingle();
  if (error) {
    if (String(error.message || "").includes("promo_configs")) {
      return {
        key: "discount_popup",
        enabled: true,
        image_tr: "",
        image_en: "",
        image_de: "",
        image_ru: "",
        updated_at: null,
      };
    }
    throw error;
  }
  if (!data) {
    return {
      key: "discount_popup",
      enabled: true,
      image_tr: "",
      image_en: "",
      image_de: "",
      image_ru: "",
      updated_at: null,
    };
  }
  return data;
}

export async function upsertPromoConfig(payload = {}) {
  const row = {
    key: "discount_popup",
    enabled: payload.enabled !== false,
    image_tr: String(payload.image_tr || "").trim(),
    image_en: String(payload.image_en || "").trim(),
    image_de: String(payload.image_de || "").trim(),
    image_ru: String(payload.image_ru || "").trim(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("promo_configs")
    .upsert(row, { onConflict: "key" })
    .select("*")
    .single();
  if (error) {
    if (String(error.message || "").includes("promo_configs")) {
      throw new Error("promo_configs table is missing; create the table first");
    }
    throw error;
  }
  return data;
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

export async function getDashboardReports(query = {}) {
  const from = query.from;
  const to = query.to;

  let chatQ = supabase
    .from("chat_logs")
    .select("created_at, session_id, message, intent, used_fallback, action_type, converted, response_time, language");
  chatQ = applyDateFilters(chatQ, { from, to }, "created_at");
  const chatRes = await chatQ;

  let actionsQ = supabase.from("actions").select("created_at, session_id, type, clicked, converted");
  actionsQ = applyDateFilters(actionsQ, { from, to }, "created_at");
  const actionsRes = await actionsQ;

  let surveyReport = {
    totals: { submissions: 0, avgOverall: 0, avgViona: 0 },
    byLanguage: {},
    byDeviceType: {},
    byCategory: {},
  };
  let surveyOk = true;
  try {
    surveyReport = await getSurveyReport({ from, to });
  } catch (_e) {
    surveyOk = false;
  }

  const chatRows = chatRes.error ? [] : chatRes.data || [];
  const actionRows = actionsRes.error ? [] : actionsRes.data || [];

  const totalChats = chatRows.length;
  const fallbackCount = chatRows.filter((x) => x.used_fallback === true).length;
  const fallbackRate = totalChats ? Number(((fallbackCount / totalChats) * 100).toFixed(2)) : 0;

  const perDay = {};
  const perSession = {};
  chatRows.forEach((row) => {
    const d = String(row.created_at || "").slice(0, 10) || "unknown";
    perDay[d] = (perDay[d] || 0) + 1;
    const sid = row.session_id || "unknown";
    perSession[sid] = (perSession[sid] || 0) + 1;
  });
  const avgMessagesPerUser = Object.keys(perSession).length
    ? Number((totalChats / Object.keys(perSession).length).toFixed(2))
    : 0;
  const avgConversationLength = avgMessagesPerUser;
  const topQuestions = groupTop(chatRows, "message", 10);
  const fallbackTop = groupTop(chatRows.filter((x) => x.used_fallback === true), "message", 10);

  const actionClicksByType = {};
  let actionClicks = 0;
  let actionConversions = 0;
  actionRows.forEach((a) => {
    if (a.clicked) {
      actionClicks += 1;
      const t = String(a.type || "unknown");
      actionClicksByType[t] = (actionClicksByType[t] || 0) + 1;
    }
    if (a.converted) actionConversions += 1;
  });
  const chatToConversionRate = totalChats ? Number(((actionConversions / totalChats) * 100).toFixed(2)) : 0;
  const actionConversionRate = actionClicks ? Number(((actionConversions / actionClicks) * 100).toFixed(2)) : 0;

  return {
    kpis: {
      totalChats,
      fallbackRate,
      overallSatisfaction: surveyReport.totals.avgOverall,
      vionaSatisfaction: surveyReport.totals.avgViona,
    },
    chatbotPerformance: {
      totalChats,
      dailyUsage: Object.entries(perDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      avgMessagesPerUser,
      avgConversationLength,
      fallbackRate,
      topQuestions,
    },
    satisfaction: {
      overallScore: surveyReport.totals.avgOverall,
      vionaScore: surveyReport.totals.avgViona,
      categories: surveyReport.byCategory || {},
    },
    unansweredQuestions: {
      fallbackCount,
      topFallbackQuestions: fallbackTop,
      repeatedUnanswered: fallbackTop.filter((x) => x.count >= 2),
    },
    conversion: {
      actionClicksByType,
      actionClicks,
      actionConversions,
      actionConversionRate,
      chatToConversionRate,
    },
    dataSources: {
      chatLogs: !chatRes.error,
      actions: !actionsRes.error,
      surveys: surveyOk,
      usedMockFallback: Boolean(chatRes.error || actionsRes.error || !surveyOk),
    },
  };
}

function resolveDateRange(query = {}) {
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
      vionaScore: 3.98,
      categories: { food: 4.1, comfort: 4.2, cleanliness: 4.4, staff: 4.0, spa: 3.8 },
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
    dataSources: {
      chatLogs: false,
      actions: false,
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
      dailyUsage: [],
      avgMessagesPerUser: 0,
      avgConversationLength: 0,
      fallbackRate: 0,
      topQuestions: [],
    },
    satisfaction: {
      overallScore: 0,
      vionaScore: 0,
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
    dataSources: {
      chatLogs: false,
      actions: false,
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
  const range = resolveDateRange(query);
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

  const reportData = buildVionaReportData({
    hotelName,
    dateRange: range,
    current: currentReport,
    previous: previousReport,
  });
  const root = resolveProjectRoot();
  const hotelImageCandidates = [
    "/home/eleythra-derin-teknoloji/Masaüstü/viona-kaila-beach/assets/images/anasayfa1-5bb856f7-1a6f-422f-a788-b74e9a1081f8.png",
    path.resolve(root, "assets/images/anasayfa1-5bb856f7-1a6f-422f-a788-b74e9a1081f8.png"),
    "/home/eleythra-derin-teknoloji/.cursor/projects/home-eleythra-derin-teknoloji-Masa-st-viona-kaila-beach/assets/aaaa-18fe3e7d-7385-4612-a15f-2b4a541117ba.png",
  ];
  const logoCandidates = [
    "/home/eleythra-derin-teknoloji/.cursor/projects/home-eleythra-derin-teknoloji-Masa-st-viona-kaila-beach/assets/logo_arka_plan_yok-efdc10f0-402b-4cd9-91c4-810c844ec677.png",
    "/home/eleythra-derin-teknoloji/.cursor/projects/home-eleythra-derin-teknoloji-Masa-st-viona-kaila-beach/assets/logo_arka_plan_yok-9643ce5f-9bc6-4ef2-8670-5e71535ce219.png",
  ];
  reportData.hotelImageUrl = firstExistingImageDataUri(hotelImageCandidates);
  reportData.brandLogoUrl = firstExistingImageDataUri(logoCandidates);
  reportData.noData = !hasAnyData(currentReport);

  const buffer = await renderVionaPdfBuffer(reportData);
  const ymd = new Date(reportData.generatedAt).toISOString().slice(0, 10);
  const fileName = `viona-raporu-${fileSafeName(hotelName)}-${ymd}.pdf`;

  return { buffer, fileName, reportData, noData: reportData.noData };
}
