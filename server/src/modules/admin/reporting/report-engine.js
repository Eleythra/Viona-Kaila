import { labelHotelSurveyKey } from "./survey-labels-tr.js";

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

function displayFivePoint(score, source, submissionCount) {
  const n = safeNumber(score);
  const src = String(source || "none");
  const sub = safeNumber(submissionCount);
  if (n > 0) return String(n);
  if (sub > 0) return "—";
  if (src === "none") return "yok";
  return "—";
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
  const hoRaw = safeNumber(satisfaction.overallScore);
  const voRaw = safeNumber(satisfaction.vionaScore);
  const hoForScore = hoRaw > 0 ? hoRaw : categoryAvg > 0 ? categoryAvg : 0;
  const voForScore = voRaw > 0 ? voRaw : 0;
  const satisfactionScore = hasData
    ? clamp(
        normalizeFiveScale(hoForScore) * 0.45 + normalizeFiveScale(voForScore) * 0.45 + normalizeFiveScale(categoryAvg || 0) * 0.1
      )
    : 0;

  const contentScore = hasData
    ? contentAdequacyScore({
        fallbackRate: chatbot.fallbackRate || 0,
        repeatedCount: (unanswered.repeatedUnanswered || []).length,
        criticalTopics: criticalFallbacks.length,
      })
    : 0;

  const overallScore = clamp(chatbotScore * 0.38 + satisfactionScore * 0.34 + contentScore * 0.28);

  const scores = [
    { key: "chatbot", title: "Dijital Asistan Kullanım Skoru", score: Number(chatbotScore.toFixed(1)), label: scoreLabel(chatbotScore) },
    {
      key: "satisfaction",
      title: "Memnuniyet Skoru",
      score: Number(satisfactionScore.toFixed(1)),
      label: scoreLabel(satisfactionScore),
      highlight: hasData && satisfactionScore < 55 ? "critical" : "",
    },
    { key: "content", title: "İçerik Yeterlilik Skoru", score: Number(contentScore.toFixed(1)), label: scoreLabel(contentScore) },
    { key: "overall", title: "Genel Performans Skoru", score: Number(overallScore.toFixed(1)), label: scoreLabel(overallScore) },
  ];

  const subCount = safeNumber(satisfaction.submissionCount);
  const overallDisplay = displayFivePoint(satisfaction.overallScore, satisfaction.overallScoreSource, subCount);
  const vionaDisplay = displayFivePoint(satisfaction.vionaScore, satisfaction.vionaScoreSource, subCount);

  const weakestCategory = Object.entries(satisfaction.categories || {})
    .map(([k, v]) => ({ key: k, value: safeNumber(v) }))
    .sort((a, b) => a.value - b.value)[0];
  const strongestCategory = Object.entries(satisfaction.categories || {})
    .map(([k, v]) => ({ key: k, value: safeNumber(v) }))
    .sort((a, b) => b.value - a.value)[0];

  const summary = [];
  if (!hasData) {
    summary.push("Bu tarih aralığında rapor için yeterli veri yok.");
    summary.push("Skorlar ve metinler sınırlı kalır; öncelik anket ve misafir temas noktalarından veri toplamaktır.");
    summary.push("Rapor yine de veri boşluklarını göstermek için üretilmiştir.");
    summary.push("Dijital asistan mesajları, yönlendirme tıklamaları ve anket kayıtlarının düzenli işlendiğinden emin olun.");
  } else {
    const wk = weakestCategory
      ? `${labelHotelSurveyKey(weakestCategory.key)} (${weakestCategory.value})`
      : "anket kırılımı";
    summary.push(
      `Misafir deneyimi: otel özeti ${
        overallDisplay === "yok" || overallDisplay === "—" ? "ölçülemedi" : `${overallDisplay}/5`
      }; kritik zayıflık adayı ${wk}.`
    );
    if ((chatbot.totalChats || 0) <= 0) {
      summary.push("Dijital asistan kullanımı bu dönemde yok veya çok sınırlı; görünürlük ve tanıtım gözden geçirilmeli.");
    } else if ((chatbot.totalChats || 0) < 50) {
      summary.push(
        "Dijital asistan hacmi düşük: onboarding veya değer algısı eksik olabilir; check-in tanıtımı ve ilk mesaj deneyimini netleştirin."
      );
    } else {
      summary.push("Dijital asistan kullanım hacmi yorum için yeterli seviyededir.");
    }
    summary.push(`Genel performans skoru ${Number(overallScore.toFixed(1))}/100; durum '${scoreLabel(overallScore)}'.`);
    summary.push(`Performans bileşenleri içinde görece en güçlü: ${scores.slice(0, 3).sort((a, b) => b.score - a.score)[0].title}.`);
    summary.push(`Görece en zayıf bileşen: ${scores.slice(0, 3).sort((a, b) => a.score - b.score)[0].title}.`);
    summary.push("Öncelik: en düşük anket boyutu için 7 gün içinde saha kontrolü + sorumlu + kapanış tarihi.");
  }

  const weakestLabel = weakestCategory ? labelHotelSurveyKey(weakestCategory.key) : "en düşük kategori";
  const actionsHotel = [
    `"${weakestLabel}" için 7 gün içinde saha kontrolü + düzeltme tarihi ve sorumlu yayınlayın.`,
    "Resepsiyon ve housekeeping ile sessizlik, temizlik ve servis hızı için kontrol listesi uygulayın.",
    "Çıkış anında kısa memnuniyet turu ve tavsiye için net jest listesi + sorumlu yayınlayın.",
  ];
  const actionsViona = [
    `En sık üç yanıtlanamayan konu (${prioritizedFallbacks.slice(0, 3).map((x) => x.key).join(", ") || "veri toplandıkça"}) için kısa hazır yanıtlar yazın.`,
    "Check-in ve Wi‑Fi girişinde Viona’yı tek ekran veya QR ile kısaca tanıtın.",
    "Asistan girişine rezervasyon, spa ve restoran yönlendirmelerini sabit düğmeler olarak ekleyin.",
    "İlk mesajı günlük öneri veya etkinlik sorusu ile açın.",
  ];
  const actions = [...actionsHotel, ...actionsViona];

  const prev = previous || null;
  const trends = [
    summarizeTrend(chatbot.fallbackRate || 0, prev?.chatbotPerformance?.fallbackRate, "Yanıtlanamayan mesaj oranı", true),
    summarizeTrend(chatbot.avgMessagesPerUser || 0, prev?.chatbotPerformance?.avgMessagesPerUser, "Misafir başına mesaj"),
    summarizeTrend(satisfaction.vionaScore || 0, prev?.satisfaction?.vionaScore, "Viona memnuniyeti"),
  ].filter(Boolean);

  const vo = safeNumber(satisfaction.vionaScore);
  const ho = safeNumber(satisfaction.overallScore);
  const vionaHotelDiff = vo - ho;
  const vionaVsHotelComment = (() => {
    if (!hasData) return "";
    if (vo <= 0 && ho <= 0) return "Bu dönem için anket özetinden otel veya Viona puanı okunamıyor; anket akışını kontrol edin.";
    if (vo >= 4.45 && vionaHotelDiff >= 0.25) {
      return `Viona ${vo.toFixed(2)}/5 ile güçlü bir skor; 5 üzerinden misafir dijital asistanı neredeyse tam nota yakın buluyor. Otel geneli ${ho.toFixed(2)}/5 kaldığı için asıl mesaj şu: fiziksel deneyim ve iletişim standardı, dijital kanaldaki olumlu algıyı sahada yakalamıyor.`;
    }
    if (vionaHotelDiff >= 0.3) {
      return `Viona memnuniyeti (${vo.toFixed(2)}/5) genel otel memnuniyetinin (${ho.toFixed(2)}/5) üzerindedir. Dijital temas noktası misafire oda ve sahadan daha olumlu geliyor; operasyonel deneyimle hizalanmalıdır.`;
    }
    if (vionaHotelDiff <= -0.3) {
      return `Genel otel memnuniyeti (${ho.toFixed(2)}/5) Viona puanından (${vo.toFixed(2)}/5) yüksektir. Fiziksel deneyim önde; asistanın kapsamı veya beklenti yönetimi güçlendirilmelidir.`;
    }
    if (Math.abs(vionaHotelDiff) < 0.12) {
      return `İki skor arasındaki fark (${vionaHotelDiff >= 0 ? "+" : ""}${vionaHotelDiff.toFixed(2)}) küçük; daha fazla anket yanıtı ile ayrışma netleşir.`;
    }
    return `Viona ${vo.toFixed(2)}, otel ${ho.toFixed(2)} — orta düzey fark var; kategori ve soru kırılımıyla kök neden ayrıştırılmalıdır.`;
  })();

  const vionaUsageGapNote = (() => {
    if (!hasData || vo <= 0) return "";
    const tc = chatbot.totalChats || 0;
    if (vo >= 4 && tc > 0 && tc < 30) {
      return "Anket Viona puanı yüksek; konuşma hacmi düşük — kanal muhtemelen beğeniliyor fakat görünürlük veya onboarding zayıf.";
    }
    if (vo >= 4 && tc === 0) {
      return "Anket Viona puanı yüksek; bu dönemde kayıtlı sohbet yok — kullanım verisi ile memnuniyet arasında kopukluk var.";
    }
    return "";
  })();

  const hotelExperienceComment = (() => {
    if (!hasData) return "Otel deneyimi için yeterli anket verisi yok.";
    const parts = [];
    if (overallDisplay !== "yok" && overallDisplay !== "—" && ho > 0) parts.push(`Genel otel memnuniyeti özeti ${ho.toFixed(2)}/5.`);
    else if (overallDisplay === "yok" || overallDisplay === "—")
      return "Bu dönem için genel otel puanı raporlanamıyor; değerlendirmeler sekmesinde yanıt ve tarih aralığını doğrulayın.";
    if (weakestCategory && weakestCategory.value > 0) {
      parts.push(
        `Kırılımda görece en zayıf alan: ${labelHotelSurveyKey(weakestCategory.key)} (${weakestCategory.value}).`
      );
    }
    if (strongestCategory && strongestCategory.value > 0) {
      parts.push(
        `Görece en güçlü alan: ${labelHotelSurveyKey(strongestCategory.key)} (${strongestCategory.value}).`
      );
    }
    return parts.length ? parts.join(" ") : "Kategori kırılımı için yeterli anket yanıtı birikmeli.";
  })();

  const chatbotComment = !hasData
    ? "Dijital asistan kullanımı için yeterli veri yok."
    : (chatbot.totalChats || 0) > 0 &&
        (chatbot.totalChats || 0) < 25 &&
        (chatbot.avgMessagesPerUser || 0) < 2.5
      ? `${chatbot.totalChats} konuşma ve misafir başına ~${Number(chatbot.avgMessagesPerUser || 0).toFixed(1)} mesaj: misafir sohbeti derinleştirmiyor; tek seferlik soru–cevap kalıbı hakim. Büyük olasılıkla check-in’de tanıtım/onboarding yok veya asistanın değeri görünmüyor. Görünürlük ve ilk mesaj deneyimini ayrı ele alın.`
      : (chatbot.totalChats || 0) > 0 && (chatbot.totalChats || 0) < 25
      ? `Konuşma sayısı düşük (${chatbot.totalChats}); hacim artana kadar bulgular yön tayini içindir.`
      : chatbot.fallbackRate > 20
      ? "Yanıt verilemeyen mesaj oranı kritik düzeydedir; hazır yanıt seti ve net yönlendirme eksikliği öne çıkar."
      : chatbot.fallbackRate > 10
      ? "Yanıt verilemeyen mesaj oranı yüksek; sık tekrar eden sorular için kısa, doğrudan yanıtlar yazılmalıdır."
      : "Yanıt verilemeyen mesaj oranı kontrol edilebilir; yeni konu başlıkları için içerik güncellemesi sürdürülmelidir.";

  const conversionComment = !hasData
    ? "Ticari etki için yeterli veri yok."
    : conversion.actionClicks === 0 && conversion.actionConversions === 0
      ? "Ölçülen tıklama ve dönüşüm sıfır: ticari huni bu raporda çalışmıyor görünüyor. Ölçüm hatası ihtimalini satış ile ayıklayın; gerçekten sıfırsa yönlendirme ve teklif görünürlüğü acil revize edilmeli."
      : conversion.actionClicks === 0
      ? "Tıklama kaydı yok; yönlendirme görünmüyor veya rapora düşmüyor olabilir."
      : conversion.actionClicks > 0 && conversion.actionConversions === 0
      ? "Tıklama var, dönüşüm yok; teklif netliği veya rezervasyon sürecinde sürtünme olabilir."
      : "Tıklama ve dönüşüm kayıtları birlikte geliyor; ticari yönlendirme işliyor.";

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
      overallDisplay,
      viona: satisfaction.vionaScore || 0,
      vionaDisplay,
      categories: satisfaction.categories || {},
      weakestCategory: weakestCategory || null,
      strongestCategory: strongestCategory || null,
      comment: hasData ? hotelExperienceComment : "Otel deneyimi için yeterli veri yok.",
      vionaLayerComment: hasData ? vionaVsHotelComment : "",
      vionaUsageGapNote,
      overallInferredNote:
        satisfaction.overallScoreSource === "hotel_categories_mean" ||
        satisfaction.overallScoreSource === "hotel_questions_mean"
          ? "Genel otel puanı, formlarda toplam skor alanı çoğunlukla boş olduğundan kategori/soru ortalamalarından hesaplanmıştır (değerlendirmeler sekmesi ile aynı mantık)."
          : "",
      vionaInferredNote:
        satisfaction.vionaScoreSource === "viona_questions_mean"
          ? "Özet puan, tek alan yerine Viona soru ortalamalarından türetilmiştir (değerlendirmeler sekmesi ile uyumlu)."
          : "",
      vionaByQuestion: {},
    },
    unansweredMetrics: {
      fallbackCount: unanswered.fallbackCount || 0,
      topFallbackQuestions: fallbackTop,
      repeatedUnanswered: unanswered.repeatedUnanswered || [],
      prioritizedBacklog: prioritizedFallbacks.slice(0, 8),
      comment:
        "Bu liste, misafire net cevap veya yönlendirme yazılması gereken konuların öncelik sırasıdır; operasyon ve dijital ekip birlikte tamamlamalıdır.",
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
      strongest: [
        `En güçlü memnuniyet kategorisi: ${strongestCategory ? `${labelHotelSurveyKey(strongestCategory.key)} (${strongestCategory.value})` : "veri yok"}.`,
      ],
      risks: [
        !hasData
          ? "Veri akışı eksikliği nedeniyle risk analizi sınırlıdır."
          : chatbot.fallbackRate > 15
          ? "Yüksek yanıtlanamayan mesaj oranı; hazır yanıt ve yönlendirme kalitesinde risk oluşturur."
          : "Yanıtlanamayan mesaj riski kontrol edilebilir düzeydedir.",
        !hasData
          ? "Ölçüm eksikliği nedeniyle risk özeti sınırlıdır."
          : (chatbot.totalChats || 0) > 0 && (chatbot.totalChats || 0) < 30
          ? "Düşük sohbet hacmi: onboarding ve görünürlük varsayılan risk olarak izlenmelidir."
          : "Hacim ve içerik sinyalleri birlikte okunmalıdır.",
      ],
    },
    actions,
    actionsHotel,
    actionsViona,
    methodology: [
      "Skorlar sektör garantisi değildir; sezon ve misafir profiline göre değişir.",
      "Dönem performansı ve oranlar birlikte okunmalıdır.",
      "Tekrarlayan konular ile hacim birlikte değerlendirilir.",
      "Kıyaslamada tek sabit eşik yerine trend ve dönem farkı önemlidir.",
      "Asistan metrikleri kayıtlı mesaj özetlerinden; memnuniyet Supabase anket gönderimlerinden (admin Değerlendirmeler) hesaplanır.",
      "Tarih seçilmediyse pencere yaklaşık son 30 gündür; PDF indirme anındaki canlı özet ile pano uyumludur.",
    ],
  };
}
