#!/usr/bin/env node
/**
 * Anket raporu: tüm soru kırılımları, kategoriler ve diller (tr/en/de/ru).
 *
 * Varsayılan: doğrudan Supabase üzerinden `getSurveyReport` (kaynak kodla uyumlu).
 * HTTP ile test: SURVEY_VERIFY_REPORT_URL=http://127.0.0.1:3001/api/admin/surveys/report
 *
 * SURVEY_VERIFY_MIN_PER_QUESTION=8
 * SURVEY_VERIFY_MIN_PER_LANG=2
 */
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  SURVEY_HOTEL_QUESTION_IDS,
  SURVEY_VIONA_QUESTION_IDS,
  SURVEY_TEST_LANGS,
} from "./survey-eval-test-constants.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const REPORT_URL = process.env.SURVEY_VERIFY_REPORT_URL || "";
const MIN_PER_Q = Math.max(1, Number(process.env.SURVEY_VERIFY_MIN_PER_QUESTION || 8));
const MIN_PER_LANG = Math.max(1, Number(process.env.SURVEY_VERIFY_MIN_PER_LANG || 2));

function fail(msg) {
  console.error("VERIFY FAIL:", msg);
  process.exit(1);
}

async function loadReportViaHttp() {
  const r = await fetch(REPORT_URL);
  let body = null;
  try {
    body = await r.json();
  } catch {
    body = null;
  }
  if (!r.ok || !body || body.ok !== true || !body.report) {
    fail(`Rapor alınamadı HTTP ${r.status} — URL: ${REPORT_URL}`);
  }
  return body.report;
}

async function loadReportDirect() {
  const { getSurveyReport } = await import("../src/modules/admin/admin.service.js");
  return getSurveyReport({});
}

async function main() {
  const rep = REPORT_URL.trim() ? await loadReportViaHttp() : await loadReportDirect();

  if (REPORT_URL.trim() && rep.questionBreakdown == null) {
    fail(
      "API yanıtında questionBreakdown yok — sunucuyu güncel kodla yeniden başlatın (npm run dev) veya HTTP yerine doğrudan modu kullanın (SURVEY_VERIFY_REPORT_URL boş bırakın)."
    );
  }

  const qb = rep.questionBreakdown || {};
  const hotel = qb.hotel || {};
  const viona = qb.viona || {};
  const byLang = rep.byLanguage || {};
  const totals = rep.totals || {};

  console.log("Rapor özeti: anket=", totals.submissions, "avgOtel=", totals.avgOverall, "avgViona=", totals.avgViona);
  if (REPORT_URL.trim()) {
    console.log("(kaynak: HTTP)");
  } else {
    console.log("(kaynak: getSurveyReport → Supabase)");
  }

  for (const id of SURVEY_HOTEL_QUESTION_IDS) {
    const st = hotel[id];
    const n = st && st.count != null ? st.count : 0;
    if (n < MIN_PER_Q) {
      fail(`Otel sorusu "${id}": yanıt sayısı ${n} < ${MIN_PER_Q}`);
    }
    if (!(st && st.avg > 0)) {
      fail(`Otel sorusu "${id}": geçersiz ortalama`);
    }
  }

  for (const id of SURVEY_VIONA_QUESTION_IDS) {
    const st = viona[id];
    const n = st && st.count != null ? st.count : 0;
    if (n < MIN_PER_Q) {
      fail(`Viona sorusu "${id}": yanıt sayısı ${n} < ${MIN_PER_Q}`);
    }
    if (!(st && st.avg > 0)) {
      fail(`Viona sorusu "${id}": geçersiz ortalama`);
    }
  }

  for (const lang of SURVEY_TEST_LANGS) {
    const n = byLang[lang] || 0;
    if (n < MIN_PER_LANG) {
      fail(`Dil "${lang}": ${n} gönderim < ${MIN_PER_LANG}`);
    }
  }

  const cat = rep.byCategory || {};
  const needCat = ["food", "comfort", "cleanliness", "staff", "poolBeach", "spaWellness", "generalExperience"];
  for (const k of needCat) {
    const v = Number(cat[k]);
    if (!Number.isFinite(v) || v <= 0) {
      fail(`Kategori "${k}" ortalaması eksik veya sıfır`);
    }
  }

  console.log(
    "VERIFY OK: 20 otel + 4 Viona soru, 7 kategori, diller",
    SURVEY_TEST_LANGS.join("/"),
    "— eşikler geçti."
  );
}

main();
