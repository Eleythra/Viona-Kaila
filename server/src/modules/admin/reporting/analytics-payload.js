function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function questionMeta(breakdown, id) {
  const raw = breakdown?.[id];
  if (raw == null) return null;
  const m = raw && typeof raw === "object" ? raw : { avg: safeNum(raw), count: 0 };
  const avg = safeNum(m.avg);
  const count = safeNum(m.count, 0);
  if (!(avg > 0)) return null;
  return { question_id: id, avg, count };
}

/**
 * Tekrar konaklama vs tavsiye — sadakat / savunuculuk sinyali (yönetici yorumu için).
 */
export function buildLoyaltySignalsFromSurvey(qb) {
  const hotel = qb?.hotel || {};
  const ret = questionMeta(hotel, "return_again");
  const rec = questionMeta(hotel, "recommend");
  if (!ret && !rec) return null;
  const gap =
    ret && rec && Number.isFinite(ret.avg) && Number.isFinite(rec.avg) ? Number((ret.avg - rec.avg).toFixed(2)) : null;
  return {
    return_again: ret,
    recommend: rec,
    gap_return_minus_recommend: gap,
  };
}

export function buildSurveyExtremesForPdf(surveyReport) {
  const qb = surveyReport?.questionBreakdown;
  if (!qb || typeof qb !== "object") return null;
  const hotel = sortQuestionEntries(qb.hotel, "asc");
  const viona = sortQuestionEntries(qb.viona, "asc");
  if (!hotel.length && !viona.length) return null;
  return {
    hotel_lowest: hotel.slice(0, 5),
    hotel_highest: sortQuestionEntries(qb.hotel, "desc").slice(0, 5),
    viona_lowest: viona.slice(0, 5),
    viona_highest: sortQuestionEntries(qb.viona, "desc").slice(0, 5),
  };
}

function sortQuestionEntries(breakdown = {}, order = "asc") {
  const entries = Object.entries(breakdown || {}).map(([question, meta]) => {
    const m = meta && typeof meta === "object" ? meta : { avg: safeNum(meta), count: 0 };
    return { question, avg: safeNum(m.avg), count: safeNum(m.count, 0) };
  });
  entries.sort((a, b) => (order === "asc" ? a.avg - b.avg : b.avg - a.avg));
  return entries;
}

/**
 * Mevcut dashboard + anket özetinden Gemini'ye gidecek normalize paket.
 * Sayısal oranlar burada yalnızca kopyalanır; yeni oran üretilmez.
 */
export function buildAnalyticsPayload({
  hotelName,
  dateRange,
  currentReport,
  previousReport,
  reportData,
  surveyReport,
  flags = {},
}) {
  const cr = currentReport || {};
  const pr = previousReport || null;
  const chat = cr.chatbotPerformance || {};
  const sat = cr.satisfaction || {};
  const hotelOverallSrc = String(sat.overallScoreSource || "none").trim() || "none";
  const vionaOverallSrc = String(sat.vionaScoreSource || "none").trim() || "none";
  const hoVal = safeNum(sat.overallScore);
  const voVal = safeNum(sat.vionaScore);
  const hotelAvgPayload =
    hoVal > 0 || hotelOverallSrc === "hotel_categories_mean" || hotelOverallSrc === "hotel_questions_mean"
      ? hoVal
      : null;
  const vionaAvgPayload =
    voVal > 0 || vionaOverallSrc === "viona_questions_mean" ? voVal : null;
  const un = cr.unansweredQuestions || {};
  const conv = cr.conversion || {};
  const ci = cr.chatInsights || {};
  const ds = cr.dataSources || {};

  const scores = (reportData?.scores || []).map((s) => ({
    key: s.key,
    title: s.title,
    score: safeNum(s.score),
    label: s.label,
  }));

  const qb = surveyReport?.questionBreakdown || { hotel: {}, viona: {} };
  const hotelQ = sortQuestionEntries(qb.hotel, "asc");
  const vionaQ = sortQuestionEntries(qb.viona, "asc");

  const submissions = safeNum(surveyReport?.totals?.submissions, 0);
  const chatVolume = safeNum(chat.totalChats, 0);
  const hasPrevious = Boolean(pr && flags?.comparePrev);

  const dataNotes = [];
  if (!ds.chatObservations) dataNotes.push("Dijital asistan mesaj geçmişi bu dönem için okunamadı veya kayıt yok");
  if (!ds.surveys) dataNotes.push("Anket verisi eksik veya okunamadı");
  if (chatVolume < 30) dataNotes.push("Dijital asistan kullanım sayısı düşük; yorumlar erken sinyal düzeyinde kalmalı");
  if (submissions < 5) dataNotes.push("Anket yanıtı az; soru bazlı ortalamalar temkinli okunmalı");
  if (!hasPrevious) dataNotes.push("Önceki dönemle karşılaştırma bu raporda yok");
  if (reportData?.pdfUsesCustomDateRange === true) {
    dataNotes.push("Kullanıcı tanımlı tarih aralığı seçilmiştir.");
  } else if (reportData?.pdfUsesCustomDateRange === false) {
    dataNotes.push("Varsayılan dönem: operasyon panosu ile aynı güncel özet penceresi (oluşturma anına kadar son 30 gün).");
  }
  if (ds.chatObservationsTruncated) dataNotes.push("Çok fazla mesaj kaydı olduğu için özet üst sınıra göre kesilmiş olabilir; hacim gerçeğin altında kalabilir");
  if (reportData?.commercialMetricsNotInstrumented) {
    dataNotes.push(
      "Rezervasyon ve kampanya adımları bu rapora henüz tam yansımıyor olabilir; sıfır satırlar gerçek iş hacmini göstermeyebilir — satış ile doğrulayın"
    );
  }
  if (hotelOverallSrc === "hotel_categories_mean" || hotelOverallSrc === "hotel_questions_mean") {
    dataNotes.push(
      "Genel otel puanı (hotel_avg_1_to_5) çoğu formda boş toplam skor alanı nedeniyle kategori veya soru ortalamalarından türetilmiştir; tek başına 'sıfır memnuniyet' veya 'operasyonel çöküş' yorumu yapılmamalı — kırılım ortalamalarına öncelik ver."
    );
  }
  if (vionaOverallSrc === "viona_questions_mean") {
    dataNotes.push(
      "Viona özeti (viona_avg_1_to_5) tek alan yerine Viona soru ortalamalarından türetilmiştir (admin Değerlendirmeler ile uyumlu)."
    );
  }
  if (hotelAvgPayload == null && Object.keys(sat.categories || {}).length > 0) {
    dataNotes.push("hotel_avg_1_to_5 null; kategori ortalamaları satisfaction.category_averages_1_to_5 içinde — genel cümle kurarken bunları kullan.");
  }

  return {
    meta: {
      hotel_name: hotelName || "Otel",
      period: {
        from: dateRange?.from || null,
        to: dateRange?.to || null,
      },
      locale: "tr",
      generated_at: reportData?.generatedAt || null,
    },
    data_quality: {
      has_chat_observations: Boolean(ds.chatObservations),
      has_survey_aggregate: Boolean(ds.surveys),
      survey_submissions: submissions,
      chat_rows: chatVolume,
      previous_period_included: hasPrevious,
      notes: dataNotes,
    },
    scores,
    chatbot: {
      total_chats: safeNum(chat.totalChats),
      unique_sessions: safeNum(chat.uniqueSessions),
      avg_messages_per_user: safeNum(chat.avgMessagesPerUser),
      avg_conversation_length: safeNum(chat.avgConversationLength),
      fallback_rate_percent: safeNum(chat.fallbackRate),
      top_questions: (chat.topQuestions || []).slice(0, 8).map((x) => ({ text: x.key, count: safeNum(x.count) })),
    },
    chat_insights: {
      top_intents: (ci.topIntents || []).slice(0, 8).map((x) => ({ intent: x.key, count: safeNum(x.count) })),
      top_ui_languages: (ci.topUiLanguages || []).slice(0, 6).map((x) => ({ lang: x.key, count: safeNum(x.count) })),
      recommendation_count: safeNum(ci.recommendationCount),
      recommendation_rate_percent: safeNum(ci.recommendationRate),
      route_reception: safeNum(ci.routeReception),
      route_guest_relations: safeNum(ci.routeGuestRelations),
      route_other: safeNum(ci.routeOther),
    },
    satisfaction: {
      hotel_avg_1_to_5: hotelAvgPayload,
      viona_avg_1_to_5: vionaAvgPayload,
      category_averages_1_to_5: sat.categories || {},
      hotel_overall_source: hotelOverallSrc,
      viona_overall_source: vionaOverallSrc,
    },
    survey_question_summaries: {
      hotel_lowest: hotelQ.slice(0, 5),
      hotel_highest: sortQuestionEntries(qb.hotel, "desc").slice(0, 5),
      viona_lowest: vionaQ.slice(0, 5),
      viona_highest: sortQuestionEntries(qb.viona, "desc").slice(0, 5),
    },
    loyalty_signals: buildLoyaltySignalsFromSurvey(qb),
    fallback: {
      count: safeNum(un.fallbackCount),
      top_topics: (un.topFallbackQuestions || []).slice(0, 10).map((x) => ({ topic: x.key, count: safeNum(x.count) })),
      repeated_topics: (un.repeatedUnanswered || []).slice(0, 8).map((x) => ({ topic: x.key, count: safeNum(x.count) })),
    },
    commercial: {
      action_clicks: safeNum(conv.actionClicks),
      action_conversions: safeNum(conv.actionConversions),
      action_conversion_rate_percent: safeNum(conv.actionConversionRate),
      chat_to_conversion_rate_percent: safeNum(conv.chatToConversionRate),
      clicks_by_service: conv.actionClicksByType || {},
    },
    period_compare: hasPrevious
      ? {
          previous_fallback_rate_percent: safeNum(pr?.chatbotPerformance?.fallbackRate),
          previous_viona_satisfaction: safeNum(pr?.satisfaction?.vionaScore),
          previous_hotel_satisfaction: safeNum(pr?.satisfaction?.overallScore),
          previous_chat_volume: safeNum(pr?.chatbotPerformance?.totalChats),
        }
      : null,
    deterministic_trend_bullets: (reportData?.insights?.trend || []).slice(0, 12),
  };
}
