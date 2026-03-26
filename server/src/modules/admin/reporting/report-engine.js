function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pct(part, total) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

function scoreLabel(score) {
  if (score < 40) return "Kritik";
  if (score < 60) return "Geliştirilmeli";
  if (score < 80) return "İyi";
  return "Çok İyi";
}

function normalizeFiveScale(v) {
  return clamp((safeNumber(v) / 5) * 100);
}

function chatVolumeScore(totalChats) {
  if (totalChats <= 0) return 10;
  if (totalChats < 50) return 30;
  if (totalChats < 200) return 55;
  if (totalChats < 500) return 78;
  return 92;
}

function messagesPerUserScore(v) {
  if (v < 2) return 35;
  if (v < 4) return 55;
  if (v < 8) return 80;
  return 90;
}

function conversationLengthScore(v) {
  if (v < 1.2) return 40;
  if (v < 3) return 65;
  if (v < 7) return 82;
  return 70;
}

function fallbackQualityScore(fallbackRate) {
  const rate = safeNumber(fallbackRate);
  if (rate < 5) return 95;
  if (rate < 10) return 80;
  if (rate < 20) return 58;
  return 30;
}

function contentAdequacyScore({ fallbackRate, repeatedCount, criticalTopics }) {
  const fallbackPart = 100 - clamp(fallbackRate * 3.5, 0, 80);
  const repeatedPenalty = clamp(repeatedCount * 6, 0, 35);
  const criticalPenalty = clamp(criticalTopics * 8, 0, 35);
  return clamp(fallbackPart - repeatedPenalty - criticalPenalty + 20);
}

function commercialScore({ chatToConversionRate, actionConversionRate, actionClicks }) {
  const chatRate = safeNumber(chatToConversionRate);
  const actionRate = safeNumber(actionConversionRate);
  const clickScore = actionClicks <= 0 ? 20 : actionClicks < 20 ? 50 : actionClicks < 80 ? 75 : 90;
  const chatScore = chatRate < 1 ? 25 : chatRate < 3 ? 45 : chatRate < 7 ? 75 : 92;
  const actionScore = actionRate < 5 ? 30 : actionRate < 10 ? 50 : actionRate < 20 ? 75 : 92;
  return clamp(clickScore * 0.2 + chatScore * 0.4 + actionScore * 0.4);
}

function detectCriticalFallbackTopics(items = []) {
  const criticalWords = ["spa", "transfer", "restoran", "restaurant", "rezervasyon", "checkout", "check out", "late", "erken", "havaalan", "airport"];
  return items.filter((it) => criticalWords.some((w) => String(it.key || "").toLowerCase().includes(w)));
}

function priorityFallbacks(items = [], totalFallback = 0) {
  return items
    .map((it) => {
      const key = String(it.key || "");
      const repeat = safeNumber(it.count);
      const share = pct(repeat, totalFallback);
      const lc = key.toLowerCase();
      const commercialImpact = /(spa|transfer|restoran|restaurant|rezervasyon|late|checkout|airport|aktivite)/.test(lc) ? 100 : 45;
      const priority = Number((repeat * 0.5 + share * 0.3 + commercialImpact * 0.2).toFixed(2));
      return { key, count: repeat, share, commercialImpact, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}

function summarizeTrend(curr, prev, label, inverse = false) {
  if (!prev && prev !== 0) return null;
  if (prev === 0 && curr === 0) return `${label} değişmedi (veri sınırlı).`;
  if (prev === 0) return `${label} önceki dönemde veri olmadığı için karşılaştırma sınırlıdır.`;
  const change = Number((((curr - prev) / prev) * 100).toFixed(2));
  if (Math.abs(change) < 0.5) return `${label} önceki döneme göre yatay seyretti.`;
  const up = change > 0;
  if (inverse) {
    return `${label} önceki döneme göre %${Math.abs(change)} ${up ? "arttı (olumsuz sinyal)" : "azaldı (olumlu sinyal)"}.`;
  }
  return `${label} önceki döneme göre %${Math.abs(change)} ${up ? "arttı" : "azaldı"}.`;
}

export function buildVionaReportData({ hotelName, dateRange, current, previous }) {
  const chatbot = current.chatbotPerformance || {};
  const satisfaction = current.satisfaction || {};
  const unanswered = current.unansweredQuestions || {};
  const conversion = current.conversion || {};
  const hasData = Boolean(
    (chatbot.totalChats || 0) > 0 ||
      (unanswered.fallbackCount || 0) > 0 ||
      (conversion.actionClicks || 0) > 0 ||
      (conversion.actionConversions || 0) > 0 ||
      (satisfaction.overallScore || 0) > 0 ||
      (satisfaction.vionaScore || 0) > 0 ||
      Object.keys(satisfaction.categories || {}).length > 0
  );

  const fallbackTop = unanswered.topFallbackQuestions || [];
  const prioritizedFallbacks = priorityFallbacks(fallbackTop, unanswered.fallbackCount || 0);
  const criticalFallbacks = detectCriticalFallbackTopics(fallbackTop);

  const chatbotScore = hasData
    ? clamp(
    chatVolumeScore(chatbot.totalChats || 0) * 0.25 +
      messagesPerUserScore(chatbot.avgMessagesPerUser || 0) * 0.25 +
      conversationLengthScore(chatbot.avgConversationLength || 0) * 0.15 +
      fallbackQualityScore(chatbot.fallbackRate || 0) * 0.35
      )
    : 0;

  const categoryValues = Object.values(satisfaction.categories || {}).map((x) => safeNumber(x)).filter((x) => x > 0);
  const categoryAvg = categoryValues.length ? categoryValues.reduce((a, b) => a + b, 0) / categoryValues.length : 0;
  const satisfactionScore = hasData
    ? clamp(
    normalizeFiveScale(satisfaction.overallScore || 0) * 0.4 +
      normalizeFiveScale(satisfaction.vionaScore || 0) * 0.4 +
      normalizeFiveScale(categoryAvg || 0) * 0.2
      )
    : 0;

  const contentScore = hasData
    ? contentAdequacyScore({
        fallbackRate: chatbot.fallbackRate || 0,
        repeatedCount: (unanswered.repeatedUnanswered || []).length,
        criticalTopics: criticalFallbacks.length,
      })
    : 0;

  const businessScore = hasData
    ? commercialScore({
        chatToConversionRate: conversion.chatToConversionRate || 0,
        actionConversionRate: conversion.actionConversionRate || 0,
        actionClicks: conversion.actionClicks || 0,
      })
    : 0;

  const overallScore = clamp(chatbotScore * 0.35 + satisfactionScore * 0.25 + contentScore * 0.2 + businessScore * 0.2);

  const scores = [
    { key: "chatbot", title: "Chatbot Performans Skoru", score: Number(chatbotScore.toFixed(1)), label: scoreLabel(chatbotScore) },
    { key: "satisfaction", title: "Memnuniyet Skoru", score: Number(satisfactionScore.toFixed(1)), label: scoreLabel(satisfactionScore) },
    { key: "content", title: "İçerik Yeterlilik Skoru", score: Number(contentScore.toFixed(1)), label: scoreLabel(contentScore) },
    { key: "commercial", title: "Ticari Etki Skoru", score: Number(businessScore.toFixed(1)), label: scoreLabel(businessScore) },
    { key: "overall", title: "Genel Viona Skoru", score: Number(overallScore.toFixed(1)), label: scoreLabel(overallScore) },
  ];

  const weakestCategory = Object.entries(satisfaction.categories || {})
    .map(([k, v]) => ({ key: k, value: safeNumber(v) }))
    .sort((a, b) => a.value - b.value)[0];
  const strongestCategory = Object.entries(satisfaction.categories || {})
    .map(([k, v]) => ({ key: k, value: safeNumber(v) }))
    .sort((a, b) => b.value - a.value)[0];

  const summary = [];
  if (!hasData) {
    summary.push("Bu tarih aralığında rapor üretimi için yeterli veri bulunmamaktadır.");
    summary.push("Skorlar ve bölüm yorumları veri eksikliği nedeniyle sınırlı değerlendirme içerir.");
    summary.push("Rapor, altyapının çalıştığını ve veri akışının izlenebilir olduğunu göstermek amacıyla yine de oluşturulmuştur.");
    summary.push("İlk öncelik chatbot logları, aksiyon tıklamaları ve memnuniyet kayıtlarının düzenli toplanmasıdır.");
  } else {
    if ((chatbot.totalChats || 0) <= 0) summary.push("Seçili dönemde chatbot kullanımı yok veya veri sınırlı; kararların ihtiyatlı okunması önerilir.");
    else if ((chatbot.totalChats || 0) < 50) summary.push("Chatbot kullanımı erken aşamadadır; mevcut bulgular yön tayini için değerlidir fakat trend takibi kritik önemdedir.");
    else summary.push("Chatbot kullanım hacmi analiz için yeterli seviyededir ve operasyonel sinyaller netleşmektedir.");
    summary.push(`Genel Viona skoru ${Number(overallScore.toFixed(1))}/100 olup durum etiketi '${scoreLabel(overallScore)}' seviyesindedir.`);
    summary.push(`En güçlü alan '${scores.slice(0, 4).sort((a, b) => b.score - a.score)[0].title}' olarak gözükmektedir.`);
    summary.push(`En kritik iyileştirme alanı '${scores.slice(0, 4).sort((a, b) => a.score - b.score)[0].title}' tarafındadır.`);
    if ((conversion.actionClicks || 0) > 0 && (conversion.actionConversions || 0) === 0) summary.push("Ticari akışta tıklama olmasına rağmen dönüşüm alınmaması teklif, fiyat algısı veya rezervasyon deneyiminde sürtünme olduğunu gösterebilir.");
    if ((conversion.actionClicks || 0) === 0) summary.push("Ticari aksiyon tıklaması görülmemesi CTA görünürlüğü veya yönlendirme kurgusunun güçlendirilmesi gerektiğine işaret eder.");
    summary.push("İlk aksiyon olarak tekrar eden fallback konularının bilgi tabanına öncelikli eklenmesi önerilir.");
  }

  const actions = [
    `İlk 2 hafta içinde en kritik 3 fallback konusu (${prioritizedFallbacks.slice(0, 3).map((x) => x.key).join(", ") || "veri bekleniyor"}) için içerik kartları oluşturun.`,
    "Chat akışında ticari CTA bloklarını görünür hale getirip servis bazlı yönlendirme metinlerini sadeleştirin.",
    "Memnuniyet skorlarında düşük kalan kategori için operasyon ekibi ile haftalık iyileştirme sprinti planlayın.",
    "Düşüş trendi görülen KPI'lar için önceki dönemle karşılaştırmalı kök neden analizi uygulayın.",
    "Onboarding mesajlarını optimize ederek chatbot benimsenmesini artırmak için check-in anına yönelik tetikleyiciler ekleyin.",
  ];

  const prev = previous || null;
  const trends = [
    summarizeTrend(chatbot.fallbackRate || 0, prev?.chatbotPerformance?.fallbackRate, "Fallback oranı", true),
    summarizeTrend(chatbot.avgMessagesPerUser || 0, prev?.chatbotPerformance?.avgMessagesPerUser, "Kullanıcı başına mesaj"),
    summarizeTrend(satisfaction.vionaScore || 0, prev?.satisfaction?.vionaScore, "Viona memnuniyeti"),
    summarizeTrend(conversion.chatToConversionRate || 0, prev?.conversion?.chatToConversionRate, "Chat -> dönüşüm oranı"),
  ].filter(Boolean);

  const vionaVsHotelComment =
    satisfaction.vionaScore >= 4 && satisfaction.overallScore < 3.8
      ? "Kullanıcılar dijital asistan deneyiminden memnunken genel konaklama deneyiminde operasyonel iyileştirme ihtiyacı dikkat çekmektedir."
      : satisfaction.overallScore >= 4 && satisfaction.vionaScore < 3.8
      ? "Genel otel deneyimi güçlü olmasına rağmen chatbot kalitesi veya içerik kapsamında geliştirme gereksinimi vardır."
      : satisfaction.overallScore < 3.5 && satisfaction.vionaScore < 3.5
      ? "Hem hizmet deneyimi hem de dijital asistan performansı tarafında iyileştirme ihtiyacı vardır."
      : "Otel ve Viona memnuniyet skorlarının birbirine yakın seyri genel deneyimde dengeli bir görünüme işaret etmektedir.";

  const chatbotComment = !hasData
    ? "Chatbot performansı için yeterli veri bulunmamaktadır."
    :
    chatbot.fallbackRate > 20
      ? "Fallback oranı kritik seviyededir. Bilgi tabanı kapsamı ve intent modelleme acilen güçlendirilmelidir."
      : chatbot.fallbackRate > 10
      ? "Fallback oranı geliştirilmeli seviyededir. Sıklıkla gelen soru kalıpları için yeni cevap kartları önerilir."
      : "Fallback oranı kabul edilebilir seviyededir; kapsam yönetimi sürdürülerek kalite korunmalıdır.";

  const conversionComment = !hasData
    ? "Gelire etki analizi için yeterli veri bulunmamaktadır."
    :
    conversion.actionClicks === 0
      ? "Tıklama görülmemesi chatbotta ticari yönlendirme görünürlüğünün düşük olduğuna işaret eder."
      : conversion.actionClicks > 0 && conversion.actionConversions === 0
      ? "Bot yönlendirme üretebilse de dönüşüm alınmıyor; fiyat algısı, teklif netliği veya rezervasyon akışı test edilmelidir."
      : "Tıklama ve dönüşüm birlikteliği chatbotun ticari katkısının oluştuğunu göstermektedir.";

  return {
    hotelName: hotelName || "Kaila Beach Hotel",
    dateRange,
    generatedAt: new Date().toISOString(),
    summary: summary.slice(0, 7),
    scores,
    chatbotMetrics: {
      totalChats: chatbot.totalChats || 0,
      dailyUsage: chatbot.dailyUsage || [],
      avgMessagesPerUser: chatbot.avgMessagesPerUser || 0,
      avgConversationLength: chatbot.avgConversationLength || 0,
      fallbackRate: chatbot.fallbackRate || 0,
      topQuestion: (chatbot.topQuestions || [])[0]?.key || "-",
      comment: chatbotComment,
    },
    satisfactionMetrics: {
      overall: satisfaction.overallScore || 0,
      viona: satisfaction.vionaScore || 0,
      categories: satisfaction.categories || {},
      weakestCategory: weakestCategory || null,
      strongestCategory: strongestCategory || null,
      comment: hasData ? vionaVsHotelComment : "Memnuniyet analizi için yeterli veri bulunmamaktadır.",
    },
    unansweredMetrics: {
      fallbackCount: unanswered.fallbackCount || 0,
      topFallbackQuestions: fallbackTop,
      repeatedUnanswered: unanswered.repeatedUnanswered || [],
      prioritizedBacklog: prioritizedFallbacks.slice(0, 8),
      comment:
        "Bu bölüm bir içerik geliştirme backlog'u olarak okunmalıdır. Tekrar eden fallback başlıkları önceliklendirilerek bilgi tabanına eklenmelidir.",
    },
    conversionMetrics: {
      actionClicks: conversion.actionClicks || 0,
      actionConversions: conversion.actionConversions || 0,
      actionConversionRate: conversion.actionConversionRate || 0,
      chatToConversionRate: conversion.chatToConversionRate || 0,
      actionClicksByType: conversion.actionClicksByType || {},
      comment: conversionComment,
    },
    insights: {
      trend: trends,
      strongest: [`En güçlü memnuniyet kategorisi: ${strongestCategory ? `${strongestCategory.key} (${strongestCategory.value})` : "veri yok"}.`],
      risks: [
        !hasData
          ? "Veri akışı eksikliği nedeniyle risk analizi sınırlıdır."
          : chatbot.fallbackRate > 15
          ? "Yüksek fallback, bilgi kapsamı ve yanıt kalitesinde risk oluşturur."
          : "Fallback riski kontrol altındadır.",
        !hasData
          ? "Veri toplama enstrümantasyonu tamamlanmadan ticari etki yorumu yapılamaz."
          : conversion.chatToConversionRate < 1
          ? "Chatten ticari aksiyona geçiş kritik seviyede düşüktür."
          : "Chatten ticari aksiyona geçiş temel seviyenin üzerindedir.",
      ],
    },
    actions,
    methodology: [
      "Skorlar mutlak sektör garantisi değildir; segment, sezon, kanal karması ve misafir profiline göre değişebilir.",
      "Değerlendirme başlangıç operasyon eşikleri ve mevcut dönem performansı bir arada okunarak üretilmiştir.",
      "Metrikler yorumlanırken oran, hacim ve tekrar eden konu yoğunluğu birlikte dikkate alınmıştır.",
      "Benchmark felsefesi: tek evrensel eşik yerine trend ve dönemsel değişim odaklı yönetici kararı desteği.",
    ],
  };
}
