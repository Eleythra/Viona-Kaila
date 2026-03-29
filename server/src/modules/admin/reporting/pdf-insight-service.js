import { generateGeminiJsonText } from "../../../lib/gemini-client.js";
import { getEnv } from "../../../config/env.js";
import { labelHotelSurveyKey } from "./survey-labels-tr.js";

const CACHE_MAX = 32;
const cache = new Map();

/**
 * Önbellek anahtarı yalnızca satır sayılarına bağlı kalmasın: aynı n sayıda sohbet/anket varken
 * ortalamalar veya soru uçları değişince yeni Gemini çağrısı yapılsın (canlı rapor tutarlılığı).
 */
function payloadMetricsFingerprint(payload) {
  const parts = [];
  const scores = payload?.scores || [];
  for (const s of scores) {
    parts.push(`${s.key}:${Number(s.score).toFixed(2)}`);
  }
  const cb = payload?.chatbot || {};
  parts.push(
    `tc:${safeFpNum(cb.total_chats)}|fb:${safeFpNum(cb.fallback_rate_percent, 2)}|amu:${safeFpNum(cb.avg_messages_per_user, 2)}|acl:${safeFpNum(cb.avg_conversation_length, 2)}`
  );
  const tq = (cb.top_questions || []).slice(0, 6);
  parts.push(tq.map((x) => `${fpTopic(x.text)}:${safeFpNum(x.count)}`).join(","));
  const sat = payload?.satisfaction || {};
  const hAv = sat.hotel_avg_1_to_5;
  const vAv = sat.viona_avg_1_to_5;
  parts.push(
    `h:${hAv == null ? "n" : safeFpNum(hAv, 3)}|v:${vAv == null ? "n" : safeFpNum(vAv, 3)}|hos:${String(sat.hotel_overall_source || "x")}|vos:${String(sat.viona_overall_source || "x")}`
  );
  const cats = sat.category_averages_1_to_5 || {};
  parts.push(
    Object.keys(cats)
      .sort()
      .map((k) => `${k}:${safeFpNum(cats[k], 3)}`)
      .join(",")
  );
  const hl = payload?.survey_question_summaries?.hotel_lowest || [];
  parts.push(hl.slice(0, 6).map((r) => `${r.question}:${safeFpNum(r.avg, 3)}:${safeFpNum(r.count)}`).join(","));
  const vl = payload?.survey_question_summaries?.viona_lowest || [];
  parts.push(vl.slice(0, 6).map((r) => `${r.question}:${safeFpNum(r.avg, 3)}:${safeFpNum(r.count)}`).join(","));
  const fb = payload?.fallback || {};
  parts.push(`fbc:${safeFpNum(fb.count)}`);
  const tt = fb.top_topics || [];
  parts.push(tt.slice(0, 6).map((x) => `${fpTopic(x.topic)}:${safeFpNum(x.count)}`).join(","));
  const com = payload?.commercial || {};
  parts.push(
    `clk:${safeFpNum(com.action_clicks)}|conv:${safeFpNum(com.action_conversions)}|acr:${safeFpNum(com.action_conversion_rate_percent, 2)}|ccr:${safeFpNum(com.chat_to_conversion_rate_percent, 2)}`
  );
  const svc = com.clicks_by_service || {};
  parts.push(
    Object.keys(svc)
      .sort()
      .map((k) => `${k}:${safeFpNum(svc[k])}`)
      .join(",")
  );
  const loy = payload?.loyalty_signals;
  if (loy && loy.gap_return_minus_recommend != null) {
    parts.push(`loy:${safeFpNum(loy.gap_return_minus_recommend, 2)}`);
  }
  return parts.join("||");
}

function safeFpNum(v, decimals = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "x";
  if (decimals <= 0) return String(Math.round(n));
  return n.toFixed(decimals);
}

function fpTopic(t) {
  return String(t || "")
    .slice(0, 48)
    .replace(/\|/g, "/");
}

function cacheKey(payload) {
  const m = payload?.meta || {};
  const p = m.period || {};
  const dq = payload?.data_quality || {};
  const q = [
    dq.has_chat_observations,
    dq.has_survey_aggregate,
    dq.survey_submissions,
    dq.chat_rows,
    dq.previous_period_included,
    (dq.notes || []).join("|"),
  ].join(";");
  const fp = payloadMetricsFingerprint(payload);
  const snap = String(m.report_snapshot_id || "").trim();
  return snap ? `${snap}|insight_v11` : `${m.hotel_name}|${p.from}|${p.to}|${q}|${fp}|insight_v11`;
}

/** Birim test ve teşhis için dışa açık önbellek anahtarı üretimi. */
export function buildPdfInsightCacheKey(payload) {
  return cacheKey(payload);
}

function cacheTtlMs() {
  return getEnv().geminiPdfCacheTtlMs;
}

function touchCache(key, value) {
  const ttl = cacheTtlMs();
  if (ttl <= 0) return;
  const now = Date.now();
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { value, expires: now + ttl });
}

function getCached(key) {
  if (cacheTtlMs() <= 0) return null;
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() > row.expires) {
    cache.delete(key);
    return null;
  }
  return row.value;
}

const EMPTY_INSIGHT = () => ({
  executive_summary: "",
  critical_finding: "",
  critical_finding_detail: "",
  critical_finding_impact: "",
  critical_finding_outcome: "",
  score_commentary: "",
  chatbot_commentary: "",
  satisfaction_commentary: "",
  viona_assistant_commentary: "",
  hotel_viona_operational_bridge: "",
  strengths: [],
  risks: [],
  fallback_commentary: "",
  commercial_commentary: "",
  survey_commentary: "",
  if_then_impacts: [],
  recommended_actions: [],
  recommended_actions_hotel: [],
  recommended_actions_viona: [],
  confidence_note: "",
  _source: "fallback",
});

function asString(v) {
  if (v == null) return "";
  return String(v).trim();
}

function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x)).filter(Boolean);
}

const CATEGORY_LABEL_TR = {
  quietness: "Sessizlik / gürültü",
  food: "Yemek ve içecek",
  cleanliness: "Temizlik",
  staff: "Personel ilgisi",
  room: "Oda",
  location: "Konum",
  value: "Fiyat–performans",
  wifi: "Wi‑Fi",
  facilities: "Tesis olanakları",
};

function humanizeCategoryKey(k) {
  const key = String(k || "").trim();
  const schema = labelHotelSurveyKey(key);
  if (schema !== key) return schema;
  return CATEGORY_LABEL_TR[key] || key;
}

/**
 * Kritik bulgu çifti: kısa başlık + operasyonel “neden önemli” (PDF ikinci paragraf).
 */
function criticalFindingParts(payload) {
  const chat = payload?.chatbot || {};
  const sat = payload?.satisfaction || {};
  const chats = Number(chat.total_chats) || 0;
  const fbRate = Number(chat.fallback_rate_percent) || 0;
  const vo = sat.viona_avg_1_to_5 == null ? 0 : Number(sat.viona_avg_1_to_5) || 0;
  const ho = sat.hotel_avg_1_to_5 == null ? 0 : Number(sat.hotel_avg_1_to_5) || 0;

  const cats = sat.category_averages_1_to_5 || {};
  const catEntries = Object.entries(cats)
    .map(([k, v]) => ({ k: String(k), v: Number(v) }))
    .filter((x) => Number.isFinite(x.v) && x.v > 0)
    .sort((a, b) => a.v - b.v);
  if (catEntries.length) {
    const worst = catEntries[0];
    const wk = humanizeCategoryKey(worst.k);
    const isQuiet = String(worst.k).toLowerCase() === "quietness";
    if (worst.v < 3.0) {
      return {
        primary: `En düşük otel deneyimi boyutu "${wk}" (${worst.v.toFixed(2)}/5). Bu skor doğrudan memnuniyet riskidir.`,
        secondary: isQuiet
          ? "Koridor, oda konumu ve gece operasyonu (housekeeping / güvenlik) birlikte denetlenmeli; tekrarlayan gürültü şikâyeti tüm deneyimi zayıflatır."
          : "Bu boyutta gecikme olursa genel skor ve tavsiye niyeti baskı altında kalır; sorumlu ve kapanış tarihi netleştirin.",
      };
    }
    if (worst.v < 3.5) {
      return {
        primary: `"${wk}" ortalaması ${worst.v.toFixed(2)}/5 ile belirgin şekilde geride; operasyon toplantısının birinci maddesi olmalıdır.`,
        secondary: isQuiet
          ? "Gece gürültü kaynaklarını (etkinlik, teknik oda, dış mekân) haritalayıp misafire net beklenti iletin."
          : "Kök neden analizi ve haftalık ilerleme takibi olmadan iyileşme görünmez.",
      };
    }
  }

  const hotelLow = payload?.survey_question_summaries?.hotel_lowest;
  if (Array.isArray(hotelLow) && hotelLow.length) {
    const w = hotelLow[0];
    const a = Number(w?.avg);
    const qLow = String(w?.question || "").toLowerCase();
    const quietQ = qLow.includes("quiet") || qLow.includes("gürültü") || qLow.includes("sessiz");
    if (Number.isFinite(a) && a > 0 && a < 3) {
      return {
        primary: `Anket uçlarında en zayıf alan "${labelHotelSurveyKey(w.question)}" (${a}/5, n=${w.count ?? "—"}). Operasyon önceliğidir.`,
        secondary: quietQ
          ? "Oda blokları ve gece vardiyası için gürültü kontrol listesi uygulayın; aynı konuda tekrar eden yanıtlar varsa öncelik yükseltin."
          : "Bu soruda düşük puan tekrarlanıyorsa süreç hatası vardır; tek seferlik düzeltme yetmez.",
      };
    }
    if (Number.isFinite(a) && a > 0 && a < 3.5 && (Number(w?.count) || 0) >= 3) {
      return {
        primary: `"${labelHotelSurveyKey(w.question)}" sorusu ${a}/5 ile zayıf; düzeltici aksiyon ve sorumlu atama gerektirir.`,
        secondary: "Ölçüm ve misafir geri bildirimi aynı hafta içinde toplanmazsa iyileşme izlenemez.",
      };
    }
  }

  const loy = payload?.loyalty_signals;
  const gap = loy?.gap_return_minus_recommend;
  const ret = loy?.return_again?.avg;
  const rec = loy?.recommend?.avg;
  if (Number.isFinite(gap) && gap >= 0.5 && Number(ret) > 0 && Number(rec) > 0) {
    return {
      primary: `Tekrar gelme (${ret}/5) tavsiyeden (${rec}/5) belirgin yüksek; güçlü savunuculuk henüz yok.`,
      secondary: "Çıkış anında tavsiye deneyimini ölçün; düşük puanlı çıkışlar için düzeltici protokol tanımlayın.",
    };
  }

  if (vo > 0 && ho > 0 && vo >= 4.45 && vo - ho >= 0.25) {
    return {
      primary: `Viona ${vo.toFixed(2)}/5 ile güçlü; otel geneli ${ho.toFixed(2)}/5. Misafir dijital asistanı sahaya göre belirgin daha olumlu buluyor; asıl mesaj fiziksel deneyim ve iletişim standardının dijital algıyı yakalamaması.`,
      secondary: "Yüzeysel ‘dijital–saha boşluğu’ yerine anket kırılımlarında hedef seçin (sessizlik, F&B, talep yanıtı vb.); tek tip misafir vaadi ve haftalık kapanış tarihi koyun.",
    };
  }
  if (fbRate >= 20 && chats > 0) {
    return {
      primary: `Yanıtlanamayan mesaj oranı %${fbRate}; içerik ve süreç açığı gösterir.`,
      secondary: "En sık üç konu için 48 saat içinde yayınlanacak hazır yanıt atayın; ölçümü bir sonraki raporda karşılaştırın.",
    };
  }
  const avgMsg = Number(chat.avg_messages_per_user) || 0;
  if (chats > 0 && chats < 25 && avgMsg > 0 && avgMsg < 2.5) {
    return {
      primary: `${chats} konuşma, misafir başına ~${avgMsg.toFixed(1)} mesaj: sohbet derinleşmiyor; tek seferlik soru–cevap kalıbı hakim. Büyük olasılıkla check-in’de tanıtım/onboarding yok veya asistanın değeri görünmüyor.`,
      secondary: "İlk bot mesajını tek net soru ile açın; rezervasyon/spa/restoran için üç sabit kısayol gösterin; QR ve kısa tanıtımı prosedür yapın.",
    };
  }
  if (chats > 0 && chats < 25) {
    return {
      primary: `Dijital asistan kullanımı düşük (${chats} konuşma); hacim artana kadar bulgular yön tayinidir.`,
      secondary: "Kararı yalnızca bu kanala göre vermeyin; ana yönü anket ve saha verisi verir.",
    };
  }
  if (vo > 0 && ho > 0 && vo - ho >= 0.35) {
    return {
      primary: `Viona (${vo}/5) otel genelinden (${ho}/5) yüksek; misafir dijital teması sahaya göre daha olumlu buluyor.`,
      secondary: "Fiziksel deneyim dijital vaatle aynı mesajı taşımıyor; oda, yiyecek-içecek ve iletişim standardını hizalayın.",
    };
  }
  if (vo > 0 && ho > 0 && ho - vo >= 0.35) {
    return {
      primary: `Otel geneli (${ho}/5) Viona’dan (${vo}/5) yüksek; asistan kapsamı veya beklenti yönetimi güçlendirilmelidir.`,
      secondary: "Asistan ilk mesajı ve yönlendirmeleri otel vaadiyle uyumlu olmalı; eksik içerik güven kaybı yaratır.",
    };
  }
  return {
    primary: "Öncelik: anketten gelen en düşük otel deneyimi boyutu ile sık yanıtlanamayan konular birlikte ele alınmalıdır.",
    secondary: "İki sinyal ayrı okunursa yanlış kaynak ayırımı yapılır; tek operasyon toplantısında birleştirin.",
  };
}

/** @deprecated tek paragraf için; secondary kullanılmaz. */
export function deriveCriticalFindingFromPayload(payload) {
  return criticalFindingParts(payload).primary;
}

export function deriveIfThenFromPayload(payload) {
  const chat = payload?.chatbot || {};
  const chats = Number(chat.total_chats) || 0;
  const out = [];
  const hotelLow = payload?.survey_question_summaries?.hotel_lowest;
  if (Array.isArray(hotelLow) && hotelLow[0]?.question) {
    const q = labelHotelSurveyKey(String(hotelLow[0].question));
    out.push(`"${q}" için saha düzeltme ve standart netleştirilirse → memnuniyet ve tekrar tercih sinyali netleşir.`);
  }
  const loy = payload?.loyalty_signals;
  if (Number(loy?.gap_return_minus_recommend) >= 0.4 && loy?.recommend?.avg) {
    out.push(
      `Tavsiye puanı net hedeflenirse (şu an ${loy.recommend.avg}/5) → savunuculuk ve doluluk sinyali güçlenir.`
    );
  }
  if (chats > 0 && chats < 40) {
    out.push("Check-in ve Wi‑Fi girişinde görünür üç kısayol (spa / restoran / talep) konursa → kullanım ve güvenilir sinyal artar.");
  }
  out.push("Sık sorulan ve yanıtlanamayan konular için kısa hazır yanıtlar yazılırsa → misafir bekleme ve şikâyet baskısı azalır.");
  out.push("Check-in ve Wi‑Fi girişinde asistanın kısa tanıtımı yapılırsa → kullanım artar, yönetim için daha güvenilir sinyal oluşur.");
  if (out.length < 3) {
    out.push("Haftalık operasyon toplantısında en düşük memnuniyet alanına tek sorumlu atanır ve kapanış tarihi konursa → aksiyon tamamlanma oranı yükselir.");
  }
  return out.slice(0, 5);
}

function deriveVionaAssistantFallback(payload) {
  const sat = payload?.satisfaction || {};
  const vo = sat.viona_avg_1_to_5 == null ? 0 : Number(sat.viona_avg_1_to_5) || 0;
  const ho = sat.hotel_avg_1_to_5 == null ? 0 : Number(sat.hotel_avg_1_to_5) || 0;
  const vl = payload?.survey_question_summaries?.viona_lowest;
  const parts = [];
  if (vo > 0 && ho > 0 && vo >= 4.45 && vo - ho >= 0.25) {
    parts.push(
      `Viona ${vo.toFixed(2)}/5 çok güçlü; otel ${ho.toFixed(2)}/5. Kanal beğeniliyor; zayıf taraf sahada operasyonel ve iletişim standardı.`
    );
  } else if (vo > 0 && ho > 0) {
    const d = vo - ho;
    if (d >= 0.3) {
      parts.push(`Viona ${vo}/5, otel ${ho}/5 üstünde; dijital kanal misafire daha olumlu geliyor.`);
    } else if (d <= -0.3) {
      parts.push(`Otel ${ho}/5, Viona ${vo}/5; asistan kapsamı veya içerik dar.`);
    } else {
      parts.push(`Viona ve otel ortalamaları yakın (${vo}/5 vs ${ho}/5).`);
    }
  } else if (vo > 0) {
    parts.push(`Viona ortalaması ${vo}/5.`);
  }
  if (Array.isArray(vl) && vl[0]?.question) {
    const w = vl[0];
    parts.push(`Viona sorularında en zayıf uç: "${w.question}" (${w.avg}/5).`);
  }
  return parts.join(" ") || "Viona için anket ve kullanım birlikte izlenmeli.";
}

/** Otel geneli vs Viona — kısa köprü (PDF; AI boşsa doldurulur). */
function deriveHotelVionaBridgeFromPayload(payload) {
  const sat = payload?.satisfaction || {};
  const vo = sat.viona_avg_1_to_5 == null ? 0 : Number(sat.viona_avg_1_to_5) || 0;
  const ho = sat.hotel_avg_1_to_5 == null ? 0 : Number(sat.hotel_avg_1_to_5) || 0;
  if (vo > 0 && ho > 0) {
    const d = vo - ho;
    if (vo >= 4.45 && d >= 0.25) {
      return `Viona ${vo.toFixed(2)}/5 ile güçlü; otel ${ho.toFixed(2)}/5. Misafir dijital asistanı sahaya göre belirgin daha olumlu buluyor; yorumu yumuşatma — asıl mesaj fiziksel deneyim ve iletişim standardının dijital algıyı yakalamaması. Anket kırılımlarında somut hedef seçin.`;
    }
    if (d >= 0.35) {
      return `Otel ${ho}/5, Viona ${vo}/5 (${Math.abs(d).toFixed(2)} puan lehte). Misafir dijital temas noktasını sahaya göre daha güçlü buluyor; bu tablo fiziksel deneyimin dijital vaatle aynı çizgide olmadığını gösterir. Saha ve iletişimde aynı standardı hedefleyin.`;
    }
    if (d <= -0.35) {
      return `Otel ${ho}/5, Viona ${vo}/5 (${Math.abs(d).toFixed(2)} puan aleyhte). Fiziksel deneyim önde; asistan içeriği ve ilk mesaj otel vaadiyle hizalanmalı.`;
    }
    return `Otel ${ho}/5 ve Viona ${vo}/5 yakın; zayıf anket uçlarını iki ekip birlikte izlemeli.`;
  }
  if (ho > 0) {
    return `Otel ${ho}/5; Viona ortalaması eksik — yanıt hacmini artırın.`;
  }
  if (vo > 0) {
    return `Viona ${vo}/5; otel ortalaması yok — iki skor birlikte olmadan bütçe ayırmayın.`;
  }
  return "Otel/Viona anket özeti yetersiz; veri birikince yorumlanır.";
}

function mergeRecommendedActionsIntoInsight(insight, payload) {
  const copy = { ...insight };
  let h = asStringArray(copy.recommended_actions_hotel);
  let v = asStringArray(copy.recommended_actions_viona);
  const derived = deriveRecommendedActionsSplit(payload);
  if (h.length < 2) h = [...h, ...derived.recommended_actions_hotel].filter(Boolean);
  if (v.length < 2) v = [...v, ...derived.recommended_actions_viona].filter(Boolean);
  const dedupe = (arr) => {
    const seen = new Set();
    return arr.filter((x) => {
      const k = x.slice(0, 80);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  copy.recommended_actions_hotel = dedupe(h).slice(0, 6);
  copy.recommended_actions_viona = dedupe(v).slice(0, 6);
  const flat = asStringArray(copy.recommended_actions);
  if (flat.length < 4) {
    copy.recommended_actions = dedupe([
      ...copy.recommended_actions_hotel.slice(0, 3),
      ...copy.recommended_actions_viona.slice(0, 3),
    ]).slice(0, 8);
  }
  return copy;
}

/** AI kapalıyken otel / dijital aksiyon listeleri (3’er madde hedefi). */
export function deriveRecommendedActionsSplit(payload) {
  const hotelLow = payload?.survey_question_summaries?.hotel_lowest;
  const q0 = Array.isArray(hotelLow) && hotelLow[0]?.question ? String(hotelLow[0].question) : "";
  const a0 = Number(hotelLow?.[0]?.avg);
  const cats = payload?.satisfaction?.category_averages_1_to_5 || {};
  const catEntries = Object.entries(cats)
    .map(([k, v]) => ({ k: String(k), v: Number(v) }))
    .filter((x) => Number.isFinite(x.v) && x.v > 0)
    .sort((a, b) => a.v - b.v);
  const worstKey = catEntries[0]?.k || "";
  const hotel = [];
  if (String(worstKey).toLowerCase() === "quietness" || /quiet|gürültü|sessiz/i.test(q0)) {
    hotel.push(
      "Sessizlik için: gürültülü oda bloklarını haritalayın; gece housekeeping ve koridor trafiği için saat/prosedür yayınlayın."
    );
  }
  if (q0 && Number.isFinite(a0) && a0 > 0) {
    hotel.push(`7 gün içinde "${labelHotelSurveyKey(q0)}" için saha kontrol listesi ve düzeltme tarihi yayınlayın (anket ${a0}/5).`);
  }
  hotel.push("En düşük üç kategori için haftalık kapama toplantısı; her maddeye tek sorumlu ve bitiş tarihi yazın.");
  hotel.push("Gürültü, temizlik ve servis hızı için gece ve gündüz vardiyasında ortak denetim yapın.");
  const loy = payload?.loyalty_signals;
  if (Number(loy?.gap_return_minus_recommend) >= 0.4) {
    hotel.push("Çıkış anında kısa memnuniyet sorusu ve düşük puanda devreye giren düzeltici aksiyon protokolü tanımlayın.");
  }
  const viona = [
    "Check-in’de 20 sn’lik Viona tanıtımı ve QR’ı standart prosedür yapın.",
    "Rezervasyon, spa ve restoran için girişte üç sabit kısayol gösterin.",
    "İlk bot mesajını günlük tek net soru ile açın (ör. spa müsaitliği).",
    "En sık üç yanıtsız konu için 48 saatte yayına alınacak hazır yanıt metni yazın.",
  ];
  return {
    recommended_actions_hotel: hotel.slice(0, 5),
    recommended_actions_viona: viona.slice(0, 5),
  };
}

function buildPrompt(payload) {
  const json = JSON.stringify(payload, null, 2);
  return `Rolün: üst düzey otel danışmanı. Çıktı yönetici karar notudur; uzun brifing değil.

SNAPSHOT: meta.report_snapshot_id dondurulmuş veri özetidir. Yalnızca bu JSON; dış varsayım yok.

SIRA: (1) Otel/anket (2) Viona (3) Dijital kullanım / yanıtsızlar. Ticari metrik bu raporda yok; commercial_commentary boş bırak veya tek cümle “bu PDF kapsamında yok”.

ÜSLUP:
- Cümleler kısa ve doğrudan; dolaylı anlatım yok.
- Gerekirse kullan: "performans yetersiz", "kritik zayıflık", "doğrudan risk", "acil müdahale".
- "Olabilir / görünmektedir / potansiyel" kullanma.
- "iyileştir", "artır", "güçlendir" kelimelerini kullanma; yerine somut fiil (yayınlayın, atayın, denetleyin, tanımlayın, kapatın).
- executive_summary TAM OLARAK ŞU ÜÇLÜYÜ KAPSASIN (toplam en fazla 5 kısa cümle): (1) genel durum — tek cümle (2) en kritik sorun — tek net cümle (3) aksiyon yönü — 1–2 cümle (“ne yapmalıyım?” cevabı).
- Aynı mesajı iki alanda tekrarlama: executive_summary ile viona_assistant_commentary ve chatbot_commentary çakışmasın.
- hotel_viona_operational_bridge: 2–3 kısa cümle; rakamlar + fark + dijital–saha hizası.
- viona_assistant_commentary: ≤2 cümle; genel memnuniyet / anlaşılma / faydalı olma sorularına göz kırp; Viona iyi ama kullanım düşükse bunu açık yaz.
- score_commentary: memnuniyet skoru 0 veya null ile kategori verisi çelişiyorsa önce veri kalitesini söyle; yanlış kriz dili kullanma.
- chatbot_commentary: düşük hacimde “neden kullanılmıyor?” — onboarding, değer algısı, görünürlük.

TEKNİK YASAK: API, endpoint, intent, dashboard, entegrasyon kelimeleri yok. confidence_note: veri hacmi/güvenilirlik; teknik terim yok.

VERİ KALİTESİ / TÜRETİLMİŞ SKOR:
- hotel_avg_1_to_5 null ise genel otel puanı yok demektir; sıfır memnuniyet veya çöküş yazma; kategori/soru ortalamalarına bak.
- satisfaction.hotel_overall_source türetilmiş ise "sıfır memnuniyet krizi" YASAK.
- Düşük konuşma + düşük avg_messages_per_user: onboarding ve değer algısı eksikliğini yaz.

EN KRİTİK BULGU: critical_finding alanına "" yaz (sunucu hesaplar).

AKSİYON: Somut adım; süre ve sorumlu ima et (7 gün, tek sahip).

ÇIKTI: Yalnızca geçerli JSON.

ŞEMA:
{
  "executive_summary": "5–6 kısa cümle",
  "critical_finding": "",
  "hotel_viona_operational_bridge": "2–3 kısa cümle; rakamlar + fark + hiza",
  "score_commentary": "2–3 kısa cümle",
  "satisfaction_commentary": "otel deneyimi; kısa",
  "viona_assistant_commentary": "≤2 cümle; köprüyü tekrarlamadan",
  "chatbot_commentary": "kısa; hacim ve yanıtsız oran",
  "strengths": ["2–3 madde, kısa"],
  "risks": ["2–3 madde, kısa"],
  "fallback_commentary": "kısa",
  "commercial_commentary": "boş veya tek cümle: bu PDF’te ticari sayfa yok",
  "survey_commentary": "kısa; otel vs Viona soru uçları",
  "if_then_impacts": ["3–4 madde, her biri tek satır"],
  "recommended_actions_hotel": ["3–5 keskin otel adımı"],
  "recommended_actions_viona": ["3–5 keskin dijital adım"],
  "recommended_actions": ["5 madde, otel ağırlıklı"],
  "confidence_note": "1 kısa cümle; teknik terim yok"
}

VERİ:
${json}`;
}

function parseInsightJson(text) {
  const out = EMPTY_INSIGHT();
  let raw = String(text || "").trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```[a-z0-9]*\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  try {
    const parsed = JSON.parse(raw);
    out.executive_summary = asString(parsed.executive_summary);
    out.critical_finding = asString(parsed.critical_finding);
    out.score_commentary = asString(parsed.score_commentary);
    out.chatbot_commentary = asString(parsed.chatbot_commentary);
    out.satisfaction_commentary = asString(parsed.satisfaction_commentary);
    out.viona_assistant_commentary = asString(parsed.viona_assistant_commentary);
    out.hotel_viona_operational_bridge = asString(parsed.hotel_viona_operational_bridge);
    out.strengths = asStringArray(parsed.strengths);
    out.risks = asStringArray(parsed.risks);
    out.fallback_commentary = asString(parsed.fallback_commentary);
    out.commercial_commentary = asString(parsed.commercial_commentary);
    out.survey_commentary = asString(parsed.survey_commentary);
    out.if_then_impacts = asStringArray(parsed.if_then_impacts);
    out.recommended_actions = asStringArray(parsed.recommended_actions);
    out.recommended_actions_hotel = asStringArray(parsed.recommended_actions_hotel);
    out.recommended_actions_viona = asStringArray(parsed.recommended_actions_viona);
    out.confidence_note = asString(parsed.confidence_note);
    out._source = "gemini";
    return out;
  } catch (_e) {
    return null;
  }
}

function secondaryToImpactOutcome(secondary) {
  const s = String(secondary || "").trim();
  if (!s) {
    return {
      impact: "Bu bulgu doğrudan memnuniyet, tekrar konaklama niyeti ve şikâyet kanalları üzerinden iş riski taşır.",
      outcome: "Tek operasyon toplantısında sorumlu ve kapanış tarihi netleştirin.",
    };
  }
  const idx = s.indexOf(". ");
  if (idx > 12 && idx < s.length - 8) {
    return { impact: s.slice(0, idx + 1).trim(), outcome: s.slice(idx + 2).trim() };
  }
  return {
    impact: "Misafir algısı ve doluluk üzerinde doğrudan etki; ölçülemezse yönetim kör noktada kalır.",
    outcome: s,
  };
}

function enrichInsightFromPayload(insight, payload) {
  let copy = { ...insight };
  if (!asString(copy.viona_assistant_commentary)) {
    copy.viona_assistant_commentary = deriveVionaAssistantFallback(payload);
  }
  if (!asString(copy.hotel_viona_operational_bridge)) {
    copy.hotel_viona_operational_bridge = deriveHotelVionaBridgeFromPayload(payload);
  }
  copy = mergeRecommendedActionsIntoInsight(copy, payload);
  const existing = asStringArray(copy.if_then_impacts);
  if (existing.length < 3) {
    const derived = deriveIfThenFromPayload(payload);
    const merged = [];
    const seen = new Set();
    for (const x of [...existing, ...derived]) {
      const k = x.slice(0, 120);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(x);
      if (merged.length >= 5) break;
    }
    copy.if_then_impacts = merged.length ? merged : derived;
  }
  const cf = criticalFindingParts(payload);
  copy.critical_finding = cf.primary;
  copy.critical_finding_detail = cf.secondary;
  const io = secondaryToImpactOutcome(cf.secondary);
  copy.critical_finding_impact = io.impact;
  copy.critical_finding_outcome = io.outcome;
  return copy;
}

function deriveHotelExperienceFallback(payload) {
  const sat = payload?.satisfaction || {};
  const ho = sat.hotel_avg_1_to_5 == null ? 0 : Number(sat.hotel_avg_1_to_5) || 0;
  const cats = sat.category_averages_1_to_5 || {};
  const entries = Object.entries(cats)
    .map(([k, v]) => ({ k, v: Number(v) || 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => a.v - b.v);
  const hotelLow = payload?.survey_question_summaries?.hotel_lowest;
  const parts = [];
  if (ho > 0) {
    parts.push(`Otel geneli ${ho}/5.`);
  }
  if (entries.length) {
    parts.push(`En zayıf boyutlar: ${entries
      .slice(0, 3)
      .map((e) => `${labelHotelSurveyKey(e.k)} (${e.v.toFixed(2)})`)
      .join(", ")}.`);
  }
  if (Array.isArray(hotelLow) && hotelLow[0]?.question) {
    const w = hotelLow[0];
    parts.push(`En düşük soru: "${labelHotelSurveyKey(w.question)}" (${w.avg}/5, n=${w.count ?? "—"}).`);
  }
  return (
    parts.join(" ") ||
    "Otel anket verisi sınırlı; yanıt hacmini artırın."
  );
}

/**
 * @param {"missing_key"|"api_error"|"parse_error"} reason
 */
function buildFallbackInsight(payload, reason = "missing_key") {
  const out = EMPTY_INSIGHT();
  const dq = payload?.data_quality || {};
  if (reason === "missing_key") {
    out.confidence_note =
      "Yorumlar şablondur; rakamlar kayıtlardan hesaplanır. Gelişmiş metin için kurulum IT ile yapılabilir.";
    out.executive_summary =
      "Rapor, misafir anketleri ve dijital asistan kullanım özetleriyle oluşturulmuştur. Önceliği otel deneyimi verilerinden okuyun; Viona metrikleri destekleyici katmandır.";
  } else if (reason === "parse_error") {
    out.confidence_note =
      "Özet metni işlenemedi; sayılar güvenilirdir. Kısa süre sonra yeniden indirin.";
    out.executive_summary =
      "Özet metin katmanı tamamlanamadı; kararlar için skor kartı ve anket tablolarına öncelik verin.";
  } else {
    out.confidence_note =
      "Yorum servisine ulaşılamadı; metin şablona düştü. Sayılar yerel hesaplamadır — kısa süre sonra yeniden deneyin.";
    out.executive_summary =
      "Rapor operasyon ve anket verileriyle tamamlandı; yönetici özeti metni bir sonraki denemede zenginleştirilebilir.";
  }
  const cf0 = criticalFindingParts(payload);
  out.critical_finding = cf0.primary;
  out.critical_finding_detail = cf0.secondary;
  out.score_commentary =
    "Tek skor: memnuniyet, asistan kullanımı, içerik ve yönlendirme ağırlıklı birleşik. Önce otel, sonra dijital okuyun.";
  out.chatbot_commentary =
    "Konuşma sayısı düşük ve mesaj/oturum ince ise misafir sohbeti derinleştirmiyor demektir; tanıtım/onboarding ve ilk mesaj deneyimini ayrı ele alın — yalnızca ‘erken sinyal’ demek yetmez.";
  out.satisfaction_commentary = deriveHotelExperienceFallback(payload);
  out.viona_assistant_commentary = deriveVionaAssistantFallback(payload);
  out.hotel_viona_operational_bridge = deriveHotelVionaBridgeFromPayload(payload);
  out.fallback_commentary =
    "Aynı konuda tekrarlayan yanıtsız sorular, misafire net cevap veya yönlendirme eksikliğine işaret eder; öncelik listesi olarak ele alınmalıdır.";
  out.commercial_commentary =
    Number(payload?.commercial?.action_clicks) === 0 && Number(payload?.commercial?.action_conversions) === 0
      ? "Tıklama ve dönüşüm sıfır; huni bu raporda çalışmıyor görünüyor. Ölçüm hatasını satış ile ayıklayın; kayıt gerçekten sıfırsa yönlendirme ve teklif görünürlüğü acil revize edilmeli."
      : "Tıklama ve dönüşüm bu rapordaki kayıtları yansıtır; iş birimleriyle birlikte yorumlayın.";
  out.survey_commentary =
    dq.survey_submissions > 0
      ? "Anket yanıtı az olsa da ortalamalar yön verir; otel soruları ile Viona sorularını ayrı okuyun ve bir sonraki dönemle kıyaslayın."
      : "Bu dönemde anket yanıtı çok sınırlı; trend için yanıt hacmi artırılmalıdır.";
  out.if_then_impacts = deriveIfThenFromPayload(payload);
  out.strengths = [
    "Skor kartı ve tablolar aynı dönem verisini tek bakışta sunar.",
    "Anket kırılımları, otel deneyiminde hangi alanların öne çıktığını gösterir.",
  ];
  out.risks = [
    "Metin özeti şablonda kaldıysa cümleler geneldir; kararı sayılar ve anket uçları doğrulamalıdır.",
    "En düşük puanlı anket maddeleri operasyon riski oluşturabilir; kritik bulgu kutusu ile çapraz kontrol edin.",
  ];
  const split = deriveRecommendedActionsSplit(payload);
  out.recommended_actions_hotel = split.recommended_actions_hotel;
  out.recommended_actions_viona = split.recommended_actions_viona;
  out.recommended_actions = [
    ...split.recommended_actions_hotel.slice(0, 3),
    ...split.recommended_actions_viona.slice(0, 2),
  ];
  if (reason === "missing_key") {
    out.recommended_actions_viona = [
      ...out.recommended_actions_viona,
      "Gelişmiş metin özeti için rapor ayarlarını yönetim veya destek ekibiyle görüşün.",
    ].slice(0, 6);
  } else if (reason === "api_error") {
    out.recommended_actions_viona = [
      ...out.recommended_actions_viona,
      "Metin özeti bir süre sonra tekrar denenebilir; bu arada sayısal bölümlere güvenin.",
    ].slice(0, 6);
  }
  out.recommended_actions = [
    ...out.recommended_actions_hotel.slice(0, 3),
    ...out.recommended_actions_viona.slice(0, 3),
  ];
  return mergeRecommendedActionsIntoInsight(out, payload);
}

/**
 * PDF için yapılandırılmış insight. Hata halinde asla throw etmez.
 */
export async function fetchPdfInsights(payload) {
  if (!payload || typeof payload !== "object") {
    return buildFallbackInsight({}, "api_error");
  }

  const key = cacheKey(payload);
  const hit = getCached(key);
  if (hit) return { ...hit };

  const prompt = buildPrompt(payload);
  const geminiTimeoutMs = Math.min(
    120_000,
    Math.max(8_000, Number(process.env.PDF_GEMINI_TIMEOUT_MS) || 45_000),
  );
  const gen = await generateGeminiJsonText(prompt, {
    temperature: 0,
    timeoutMs: geminiTimeoutMs,
  });
  if (!gen.ok || !gen.text) {
    const reason = gen.error === "missing_api_key" ? "missing_key" : "api_error";
    return buildFallbackInsight(payload, reason);
  }

  const parsed = parseInsightJson(gen.text);
  if (!parsed || !parsed.executive_summary) {
    return buildFallbackInsight(payload, "parse_error");
  }

  const enriched = enrichInsightFromPayload(parsed, payload);
  touchCache(key, enriched);
  return enriched;
}
