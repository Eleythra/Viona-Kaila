import { hotelSurveyKeyMeta } from "./survey-labels-tr.js";

function esc(v) {
  return String(v == null ? "" : v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const VIONA_SURVEY_ORDER = ["viona_overall", "viona_understanding", "viona_helpfulness", "viona_usability"];

function vionaQuestionCards(vbq) {
  if (!vbq || typeof vbq !== "object") return "";
  const cells = VIONA_SURVEY_ORDER.map((k) => {
    const cell = vbq[k];
    const avg = cell && typeof cell === "object" ? cell.avg : cell;
    const n = Number(avg);
    if (!Number.isFinite(n) || n <= 0) return "";
    const m = hotelSurveyKeyMeta(k);
    return `<div class="metric-card metric-card--tile"><h4>${esc(m.label)}</h4><p class="survey-key-hint">${esc(m.hint)}</p><p class="big">${esc(n)}</p></div>`;
  }).filter(Boolean);
  if (!cells.length) return "";
  return `<div class="grid-cats spaced">${cells.join("")}</div>`;
}

function scoreBadgeClass(label) {
  if (label === "Kritik") return "badge-critical";
  if (label === "Geliştirilmeli") return "badge-warning";
  if (label === "İyi") return "badge-good";
  return "badge-great";
}

function categoryList(categories = {}) {
  const rows = Object.entries(categories);
  if (!rows.length) return "<p>Yeterli veri yok.</p>";
  return `<div class="grid-cats">${rows
    .map(([k, v]) => {
      const m = hotelSurveyKeyMeta(k);
      return `<div class="metric-card metric-card--tile"><h4>${esc(m.label)}</h4><p class="survey-key-hint">${esc(m.hint)}</p><p class="big">${esc(v)}</p></div>`;
    })
    .join("")}</div>`;
}

function fallbackBacklog(items = []) {
  if (!items.length) return "<p>Öncelikli konu listesi için veri bulunmuyor.</p>";
  return `<table><thead><tr><th>Konu</th><th>Tekrar</th><th>Pay (%)</th><th>Öncelik</th></tr></thead><tbody>${items
    .map((it) => `<tr><td>${esc(it.key)}</td><td>${esc(it.count)}</td><td>${esc(it.share)}</td><td>${esc(it.priority)}</td></tr>`)
    .join("")}</tbody></table>`;
}

function simpleBars(itemsObj = {}) {
  const rows = Object.entries(itemsObj);
  if (!rows.length) return "<p>Servis kırılımı verisi yok.</p>";
  const max = Math.max(...rows.map((r) => Number(r[1] || 0)), 1);
  return `<div>${rows
    .map(([k, v]) => {
      const width = Math.round((Number(v || 0) / max) * 100);
      return `<div class="bar-row"><span>${esc(k)}</span><div class="bar"><i style="width:${width}%"></i></div><strong>${esc(v)}</strong></div>`;
    })
    .join("")}</div>`;
}

function page(title, body) {
  return `<section class="page"><h2>${esc(title)}</h2>${body}</section>`;
}

function formatIsoDate(iso, withTime = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "-");
  const opt = withTime
    ? { year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "long", day: "2-digit" };
  return withTime ? d.toLocaleString("tr-TR", opt) : d.toLocaleDateString("tr-TR", opt);
}

function pickText(primary, fallback) {
  const p = String(primary || "").trim();
  if (p) return p;
  return String(fallback || "").trim();
}

/** Admin Değerlendirmeler özeti ile aynı 1–5 değeri; PDF’te ölçeği açık gösterir. */
function formatFivePointHeadline(displayVal, opts = {}) {
  const variant = opts.variant === "viona" ? "viona" : "hotel";
  const raw = displayVal == null ? "" : String(displayVal).trim();
  const disp = raw || pickText(displayVal, "");
  const alignedNote =
    variant === "viona"
      ? "Değerlendirmeler sekmesindeki Viona asistan satırı ile aynı kaynak ve tarih aralığı (1–5)."
      : "Değerlendirmeler sekmesindeki özet puan satırı ile aynı kaynak ve tarih aralığı (1–5).";
  if (!disp || disp === "yok") {
    return `<p class="big five-headline">${esc(disp || "—")}</p>
    <p class="section-note small muted">Ölçek 1–5. ${esc(alignedNote)}</p>`;
  }
  if (disp === "—") {
    return `<p class="big five-headline">${esc(disp)}</p>
    <p class="section-note small muted">Ölçek 1–5; bu dönem için hesaplanabilir özet yok. ${esc(alignedNote)}</p>`;
  }
  const n = Number(disp.replace(",", "."));
  if (Number.isFinite(n) && n > 0) {
    return `<p class="big five-headline"><span class="five-num">${esc(disp)}</span><span class="five-denom">/5</span></p>
    <p class="section-note small muted">${esc(alignedNote)}</p>`;
  }
  return `<p class="big five-headline">${esc(disp)}<span class="five-denom">/5</span></p>`;
}

function ulFromStrings(items, emptyMsg) {
  const list = (items || []).map((x) => String(x || "").trim()).filter(Boolean);
  if (!list.length) return `<p>${esc(emptyMsg)}</p>`;
  return `<ul>${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

function surveyExtremesBlock(title, rows) {
  if (!rows || !rows.length) return "";
  return `<div class="card spaced"><h4>${esc(title)}</h4><ul>${rows
    .map((r) => {
      const m = hotelSurveyKeyMeta(r.question);
      return `<li><strong>${esc(m.label)}</strong> — ort. ${esc(r.avg)} / 5 (n=${esc(r.count)})<br/><span class="survey-key-hint">${esc(m.hint)}</span></li>`;
    })
    .join("")}</ul></div>`;
}

function buildHotelSurveyDetailPage(data) {
  const ex = data.surveyExtremes;
  if (!ex || (!ex.hotel_lowest?.length && !ex.hotel_highest?.length)) return "";
  const lo = ex.hotel_lowest[0];
  const hi = (ex.hotel_highest || [])[0];
  const loTxt = lo
    ? `${hotelSurveyKeyMeta(lo.question).label} — ${lo.avg}/5 (n=${lo.count})`
    : "—";
  const hiTxt = hi
    ? `${hotelSurveyKeyMeta(hi.question).label} — ${hi.avg}/5 (n=${hi.count})`
    : "—";
  const story = `<div class="card spaced"><h4>Anket özeti (öncelik)</h4>
    <p class="section-note"><strong>En zayıf alan:</strong> ${esc(loTxt)}</p>
    <p class="section-note"><strong>En güçlü alan:</strong> ${esc(hiTxt)}</p>
    <p class="section-note"><strong>Genel yorum:</strong> Operasyon önceliği en düşük sorudan başlar; yüksek puanlı soru korunacak standarttır. Admin panelindeki Değerlendirmeler sekmesi ile aynı kaynak kullanılmıştır.</p>
  </div>`;
  const parts = [
    story,
    surveyExtremesBlock("Otel deneyimi — en düşük ortalamalar (soru bazında)", ex.hotel_lowest),
    surveyExtremesBlock("Otel deneyimi — en yüksek ortalamalar (soru bazında)", ex.hotel_highest),
  ];
  return page("Anket Detayı — Otel Deneyimi", parts.join(""));
}

function buildVionaSurveyDetailPage(data) {
  const ex = data.surveyExtremes;
  const ai = data.aiInsights || {};
  const commentary = pickText(ai.survey_commentary, "");
  const sm = data.satisfactionMetrics || {};
  const hasVionaQ = ex && (ex.viona_lowest?.length || ex.viona_highest?.length);
  const hasSat = Number(sm.viona) > 0 || Object.keys(sm.categories || {}).length > 0;
  if (!hasVionaQ && !commentary && !hasSat) return "";
  const lo = ex?.viona_lowest?.[0];
  const hi = ex?.viona_highest?.[0];
  const loTxt = lo
    ? `${hotelSurveyKeyMeta(lo.question).label} — ${lo.avg}/5 (n=${lo.count})`
    : "—";
  const hiTxt = hi
    ? `${hotelSurveyKeyMeta(hi.question).label} — ${hi.avg}/5 (n=${hi.count})`
    : "—";
  const story = `<div class="card spaced"><h4>Viona anketi — özet</h4>
    <p class="section-note"><strong>En zayıf soru:</strong> ${esc(loTxt)}</p>
    <p class="section-note"><strong>En güçlü soru:</strong> ${esc(hiTxt)}</p>
    <p class="section-note"><strong>Genel yorum:</strong> Genel memnuniyet, anlaşılma ve faydalı olma sorularını birlikte okuyun; bir sonraki dönemle kıyaslayın.</p>
  </div>`;
  const parts = [story];
  if (ex?.viona_lowest?.length) {
    parts.push(surveyExtremesBlock("Viona — düşük ortalamalar (detay listesi)", ex.viona_lowest));
  }
  if (commentary) {
    parts.push(`<p class="section-note section-space">${esc(commentary)}</p>`);
  } else if (hasSat) {
    parts.push(
      `<p class="section-note section-space">Veriler Değerlendirmeler sekmesindeki gönderimlerle aynı mantıkla hesaplanmıştır.</p>`
    );
  }
  return page("Anket Detayı — Viona Asistanı", parts.join(""));
}

function criticalFindingPage(data) {
  const ai = data.aiInsights || {};
  const text = pickText(ai.critical_finding, "");
  if (!text) return "";
  const impact = pickText(ai.critical_finding_impact, pickText(ai.critical_finding_detail, ""));
  const outcome = pickText(ai.critical_finding_outcome, "");
  return page(
    "En Kritik Bulgu",
    `<div class="critical-finding-box">
      <h4 class="cf-heading">Problem</h4>
      <p class="cf-primary">${esc(text)}</p>
      ${impact ? `<h4 class="cf-heading cf-heading--spaced">Etkisi</h4><p class="cf-detail">${esc(impact)}</p>` : ""}
      ${outcome ? `<h4 class="cf-heading cf-heading--spaced">Sonuç / aksiyon yönü</h4><p class="cf-detail">${esc(outcome)}</p>` : ""}
    </div>
    <p class="section-note spaced muted small">Öncelik sırası veri kurallarıyla belirlenir; anket ve saha bölümleriyle birlikte okuyun.</p>`
  );
}

function ifThenImpactsBlock(data) {
  const ai = data.aiInsights || {};
  const items = Array.isArray(ai.if_then_impacts) ? ai.if_then_impacts.filter(Boolean) : [];
  if (!items.length) return "";
  return `<div class="card spaced"><h4>Ne yaparsan ne olur?</h4><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <p class="section-note small muted">Neden–sonuç özeti; kesin rakam vaadi değildir.</p></div>`;
}

export function buildReportHtml(data) {
  const ai = data.aiInsights || {};
  const scoreCards = (data.scores || [])
    .map(
      (s) => `<article class="score-card${s.highlight === "critical" ? " score-card--critical" : ""}">
        <h4>${esc(s.title)}${s.key === "satisfaction" ? ' <span class="score-pill">öncelik</span>' : ""}</h4>
        <p class="big">${esc(s.score)}</p>
        <span class="badge ${scoreBadgeClass(s.label)}">${esc(s.label)}</span>
      </article>`
    )
    .join("");

  const summaryParagraphs = (data.summary || []).map((s) => `<p>${esc(s)}</p>`).join("");
  const topFallback = (data.unansweredMetrics.topFallbackQuestions || [])
    .slice(0, 10)
    .map((q) => `<li>${esc(q.key)} (${esc(q.count)})</li>`)
    .join("");
  const trendList = ((data.insights || {}).trend || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const hotelActionsPdf =
    Array.isArray(ai.recommended_actions_hotel) && ai.recommended_actions_hotel.length
      ? ai.recommended_actions_hotel
      : (data.actionsHotel || []).length
        ? data.actionsHotel
        : (Array.isArray(ai.recommended_actions) ? ai.recommended_actions.slice(0, 3) : []);
  const vionaActionsPdf =
    Array.isArray(ai.recommended_actions_viona) && ai.recommended_actions_viona.length
      ? ai.recommended_actions_viona
      : (data.actionsViona || []).length
        ? data.actionsViona
        : (Array.isArray(ai.recommended_actions) ? ai.recommended_actions.slice(3, 8) : []);
  const hotelActionList = (hotelActionsPdf.length ? hotelActionsPdf : ["—"]).map((x) => `<li>${esc(x)}</li>`).join("");
  const vionaActionList = (vionaActionsPdf.length ? vionaActionsPdf : ["—"]).map((x) => `<li>${esc(x)}</li>`).join("");
  const methodology = (data.methodology || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const noDataNotice = data.noData
    ? `<div class="nodata-banner"><strong>Veri Durumu:</strong> Bu tarih aralığında analiz için yeterli veri bulunamadı. Rapor, veri toplama eksiklerini görünür kılmak için oluşturuldu.</div>`
    : "";
  const logoImg = data.brandLogoUrl
    ? `<div class="brand-logo-pill"><img class="brand-logo" src="${esc(data.brandLogoUrl)}" alt="Eleythra" /></div>`
    : `<div class="logo-fallback">Eleythra</div>`;
  const coverBgStyle = data.hotelImageUrl
    ? `style="--cover-image:url('${esc(data.hotelImageUrl)}');"`
    : "";
  const coverBgImage = data.hotelImageUrl ? `<div class="cover-bg-image"></div>` : "";
  const decisionSummary =
    pickText(ai.recommended_actions_hotel?.[0], "") ||
    pickText(ai.recommended_actions?.[0], "") ||
    (data.summary || [])[0] ||
    "Öncelik, anketten gelen otel deneyimi sinyalleri ve operasyon aksiyonları üzerinden verilmelidir.";
  const decisionChatbot =
    data.chatbotMetrics?.comment || "Dijital asistan kullanımına göre görünürlük ve içerik adımlarını planlayın.";
  const decisionSat = data.satisfactionMetrics?.comment || "Otel memnuniyetini kategori ve anket maddeleriyle izleyin.";
  const decisionUnanswered =
    data.unansweredMetrics?.comment || "Tekrarlayan yanıtsız konular için hazır yanıt ve süreç netleştirin.";
  const decisionViona =
    pickText(ai.recommended_actions_viona?.[0], "") ||
    "Görünürlük ve içerik adımlarını önceliklendirin; otel aksiyonlarıyla hizalayın.";

  const execBlock = pickText(ai.executive_summary, "")
    ? `<div class="card insight-primary"><p class="insight-lead">${esc(ai.executive_summary)}</p>${
        pickText(ai.confidence_note, "")
          ? `<p class="muted insight-confidence"><strong>Veri güvencesi (kritik not):</strong> ${esc(ai.confidence_note)}</p>`
          : ""
      }</div>
      <div class="grid-2 spaced">
        <div class="card"><h4>Güçlü sinyaller</h4>${ulFromStrings(ai.strengths, "Özetlenemedi.")}</div>
        <div class="card"><h4>Risk / iyileştirme</h4>${ulFromStrings(ai.risks, "Özetlenemedi.")}</div>
      </div>`
    : `<div class="card">${summaryParagraphs}</div>`;

  const scoreNarrative = pickText(ai.score_commentary, "")
    ? `<p class="section-note spaced">${esc(ai.score_commentary)}</p>`
    : "";
  const chatNarrative = esc(pickText(ai.chatbot_commentary, data.chatbotMetrics?.comment));
  const satNarrative = esc(pickText(ai.satisfaction_commentary, data.satisfactionMetrics?.comment));
  const vionaLayerNarrativeRaw = pickText(
    ai.viona_assistant_commentary,
    data.satisfactionMetrics?.vionaLayerComment || ""
  );
  const vionaLayerNarrative = esc(vionaLayerNarrativeRaw);
  const hotelVionaBridgeRaw = pickText(ai.hotel_viona_operational_bridge, "");
  const hotelVionaBridge = esc(hotelVionaBridgeRaw);
  const fbNarrative = esc(pickText(ai.fallback_commentary, data.unansweredMetrics?.comment));

  const overallScore = (data.scores || []).find((s) => s.key === "overall");
  const coverScoreAside = overallScore
    ? `<div class="cover-score-pill">
        <span class="cover-score-eyebrow">Dönem özeti</span>
        <span class="cover-score-label">Genel skor</span>
        <span class="cover-score-value">${esc(overallScore.score)}</span>
        <span class="cover-score-sublabel">${esc(overallScore.label)}</span>
        <span class="cover-score-scale">/ 100</span>
      </div>`
    : `<div class="cover-score-pill cover-score-pill--empty">
        <span class="cover-score-eyebrow">Dönem özeti</span>
        <span class="cover-score-label">Genel skor</span>
        <span class="cover-score-value">—</span>
      </div>`;
  const coverPeriodLine = `${formatIsoDate(data.dateRange.from)} – ${formatIsoDate(data.dateRange.to)}`;
  const pdfCustomRange = Boolean(data.pdfUsesCustomDateRange);
  const periodHeading = pdfCustomRange ? "Seçilen tarih aralığı" : "Canlı veri özeti";
  const coverPeriodMain = pdfCustomRange ? coverPeriodLine : "Güncel kayıtlar · indirme anı";
  const periodSub = pdfCustomRange
    ? ""
    : `Teknik veri penceresi (pano ile aynı, yaklaşık son 30 gün): ${coverPeriodLine}. Tarih seçmediyseniz bu canlı özet geçerlidir; PDF tek anlık görüntüdür.`;
  const docTitle = `Viona Karar Özeti — ${String(data.hotelName || "Otel").trim()}`;

  const insightSourceNote =
    ai._source === "gemini"
      ? `<p class="section-note spaced muted small"><strong>Kaynak:</strong> Yorumlar yapay zekâ taslağıdır; rakamlar kayıtlı veriden hesaplanır.</p>`
      : `<p class="section-note spaced muted small"><strong>Kaynak:</strong> Yorumlar kural şablonudur; rakamlar kayıtlı veriden hesaplanır.</p>`;

  const hotelSurveyDetailHtml = buildHotelSurveyDetailPage(data);
  const vionaSurveyDetailHtml = buildVionaSurveyDetailPage(data);
  const criticalFindingHtml = criticalFindingPage(data);
  const ifThenHtml = ifThenImpactsBlock(data);

  const chatTruncateBanner = data.chatObservationsTruncated
    ? `<div class="nodata-banner"><strong>Veri kesiti:</strong> Çok yüksek mesaj hacminde özet üst sınırda kesilmiş olabilir; tablodaki konuşma sayısı gerçek toplamın altında kalabilir. Gerekirse log ekranından doğrulayın.</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(docTitle)}</title>
  <style>
    @page { size: A4; margin: 15mm 16mm; }
    body { font-family: "DejaVu Sans", "Noto Sans", Arial, sans-serif; color: #192236; margin: 0; line-height: 1.48; font-size: 12.5px; }
    .page { page-break-after: always; box-sizing: border-box; }
    .page:last-child { page-break-after: auto; }
    .page:not(.cover) { padding-top: 2mm; }
    .page:not(.cover) > h2 { margin: 0 0 14px 0; padding-bottom: 8px; font-size: 19px; color: #122958; letter-spacing: 0.02em; border-bottom: 2px solid #e3ebfa; }
    .cover { background: radial-gradient(120% 100% at 0% 0%, #173c7f 0%, #14336f 38%, #102754 100%); color: #f0f4ff; border-radius: 14px; padding: 22px 24px 20px; min-height: 230mm; position: relative; overflow: hidden; box-sizing: border-box; }
    .cover-bg-image { position: absolute; inset: 0; background-image: var(--cover-image); background-size: cover; background-position: center; opacity: 0.18; filter: saturate(1.08) contrast(1.05); z-index: 0; }
    .cover-overlay { position: absolute; inset: 0; background: linear-gradient(110deg, rgba(7,17,42,0.85) 0%, rgba(12,31,70,0.78) 45%, rgba(19,44,95,0.62) 100%); z-index: 1; }
    .cover-content { position: relative; z-index: 2; display: flex; flex-direction: column; min-height: 210mm; }
    h1, h2, h3, h4, p { margin: 0; }
    h2 { font-size: 19px; color: #122958; letter-spacing: 0.02em; }
    .muted { color: #61739a; }
    .cover-topbar { display: flex; justify-content: flex-end; align-items: flex-start; margin-bottom: 8px; }
    .logo-fallback { width: 140px; height: 40px; border-radius: 999px; background: rgba(255,255,255,0.18); color: #e4ecff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; border: 1px solid rgba(255,255,255,0.25); }
    .brand-logo-pill { background: rgba(255,255,255,0.96); border: 1px solid rgba(205,219,248,0.95); border-radius: 999px; padding: 7px 12px; box-shadow: 0 8px 24px rgba(5, 15, 36, 0.35); }
    .brand-logo { width: 132px; height: auto; object-fit: contain; display: block; }
    .cover-layout { display: grid; grid-template-columns: 1fr minmax(168px, 200px); gap: 20px 28px; align-items: start; flex: 1; margin-top: 8px; }
    .cover-kicker { font-size: 15px; font-weight: 700; letter-spacing: 0.04em; color: rgba(240, 244, 255, 0.96); margin-bottom: 10px; line-height: 1.35; word-break: normal; overflow-wrap: normal; hyphens: manual; max-width: 100%; }
    .cover-product { display: inline-block; margin-top: 10px; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #0f2a5c; background: linear-gradient(90deg, #b8d4ff, #e8f0ff); border: 1px solid rgba(255,255,255,0.45); }
    .cover-title { margin-top: 10px; font-size: 32px; line-height: 1.18; letter-spacing: -0.015em; max-width: 100%; font-weight: 800; }
    .subtitle { margin-top: 14px; color: #c8d8f8; max-width: 95%; line-height: 1.5; font-size: 14px; }
    .cover-right { display: flex; flex-direction: column; gap: 12px; align-items: stretch; padding-top: 4px; }
    .cover-period-block { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); border-radius: 12px; padding: 12px 14px; }
    .cover-period-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.85; margin-bottom: 6px; }
    .cover-period-value { font-size: 13px; font-weight: 600; line-height: 1.4; color: #fff; }
    .cover-period-sub { font-size: 10px; line-height: 1.45; color: rgba(220, 232, 255, 0.86); margin: 8px 0 0 0; }
    .cover-score-pill { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.28); border-radius: 14px; padding: 14px 12px; text-align: center; }
    .cover-score-pill--empty { opacity: 0.9; }
    .cover-score-eyebrow { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.8; margin-bottom: 6px; }
    .cover-score-label { display: block; font-size: 11px; opacity: 0.9; }
    .cover-score-value { display: block; font-size: 36px; font-weight: 800; line-height: 1.1; margin: 6px 0 2px; letter-spacing: -0.03em; }
    .cover-score-sublabel { display: block; font-size: 12px; font-weight: 600; color: #e8f0ff; }
    .cover-score-scale { display: block; font-size: 10px; opacity: 0.75; margin-top: 2px; }
    .cover-hint { font-size: 11px; line-height: 1.45; color: rgba(220, 232, 255, 0.88); margin: 0; }
    .meta { margin-top: 16px; display: grid; gap: 6px; background: rgba(7, 18, 46, 0.5); border: 1px solid rgba(158,190,242,0.26); border-radius: 12px; padding: 10px 12px; max-width: 100%; }
    .meta p { font-size: 12px; line-height: 1.45; }
    .meta .meta-note { font-size: 11px; line-height: 1.45; color: #c5d4f0; margin-top: 4px; opacity: 0.95; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: stretch; }
    .grid-scores { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: stretch; }
    .grid-cats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: stretch; }
    .score-card, .metric-card, .card { border: 1px solid #d7e1f6; border-radius: 12px; padding: 12px 14px; background: #fbfdff; box-shadow: 0 2px 8px rgba(20,43,84,0.06); box-sizing: border-box; }
    .score-card { min-height: 112px; display: flex; flex-direction: column; justify-content: space-between; }
    .metric-card--tile { min-height: 86px; display: flex; flex-direction: column; justify-content: center; }
    .score-card h4, .metric-card h4 { font-size: 12.5px; color: #24406f; font-weight: 700; }
    .big { font-size: 28px; font-weight: 700; margin-top: 6px; color: #123270; letter-spacing: 0.02em; }
    .five-headline { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .five-headline .five-denom { font-size: 16px; font-weight: 700; color: #61739a; }
    .badge { display: inline-block; margin-top: 8px; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; align-self: flex-start; }
    .badge-critical { background: #fce2e2; color: #9d1f1f; }
    .badge-warning { background: #ffefde; color: #a55a00; }
    .badge-good { background: #e4f0ff; color: #1f4fa8; }
    .badge-great { background: #e4f8ec; color: #20704c; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    li { margin: 3px 0; }
    .section-note { margin-top: 10px; color: #3b4b73; line-height: 1.5; font-size: 12.5px; max-width: 100%; }
    .survey-key-hint { font-size: 10.5px; color: #61739a; margin: 4px 0 8px; line-height: 1.38; font-weight: 400; }
    .section-space { margin-top: 14px; }
    .decision-box { margin-top: 14px; border: 1px solid #d7e5ff; background: linear-gradient(180deg, #f4f8ff, #eef5ff); border-radius: 10px; padding: 10px 12px; color: #1d3a70; font-size: 12px; line-height: 1.48; }
    .decision-box strong { color: #123063; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border-bottom: 1px solid #dbe3f7; text-align: left; padding: 7px 8px; font-size: 11.5px; }
    .bar-row { display: grid; grid-template-columns: 120px 1fr 42px; gap: 8px; align-items: center; margin: 7px 0; font-size: 12px; }
    .bar { background: #e5ecfb; border-radius: 999px; overflow: hidden; height: 10px; }
    .bar i { display: block; height: 10px; background: linear-gradient(90deg, #2f5fbe, #63b3ff); }
    .spaced { margin-top: 14px; }
    .kpi-line { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px dashed #d7dff1; font-size: 12.5px; }
    .nodata-banner { margin: 0 0 14px; background: #fff4e5; color: #7f4a00; border: 1px solid #f2c078; border-radius: 10px; padding: 10px 12px; line-height: 1.45; font-size: 12px; }
    .insight-primary { border-color: #c5d6f5; background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%); }
    .insight-lead { font-size: 12.5px; line-height: 1.52; color: #1a305c; max-width: 100%; }
    .insight-confidence { margin-top: 10px; font-size: 11px; line-height: 1.45; }
    .small { font-size: 11px; }
    .critical-finding-box { border: 2px solid #c53030; border-radius: 12px; padding: 14px 16px; background: #fff5f5; color: #1a1a2e; font-size: 13px; line-height: 1.5; font-weight: 600; }
    .cf-heading { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9b2c2c; margin: 0 0 6px 0; font-weight: 700; }
    .cf-heading--spaced { margin-top: 14px; }
    .cf-primary { margin: 0; font-weight: 700; }
    .cf-detail { margin: 6px 0 0 0; font-size: 12.5px; line-height: 1.52; font-weight: 500; color: #2d3748; }
    .score-card--critical { border-color: #e53e3e; background: linear-gradient(180deg, #fffafa 0%, #fff5f5 100%); }
    .score-pill { display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; background: #fed7d7; color: #9b2c2c; vertical-align: middle; }
  </style>
</head>
<body>
  <section class="page cover" ${coverBgStyle}>
    ${coverBgImage}
    <div class="cover-overlay"></div>
    <div class="cover-content">
      <div class="cover-topbar">${logoImg}</div>
      <div class="cover-layout">
        <div class="cover-left">
          <p class="cover-kicker">${esc(data.hotelName || "Kaila Beach Hotel")}</p>
          <span class="cover-product">Viona · Yönetici karar özeti</span>
          <h1 class="cover-title">Misafir deneyimi<br/>ve dijital performans</h1>
          <p class="subtitle">Önce anket ve saha sinyalleri; Viona destekleyici katmandır. Bu belge, admin paneliyle aynı kaynaktan (Değerlendirmeler + kayıtlı sohbetler) indirme anındaki canlı özeti sabitler.</p>
        </div>
        <aside class="cover-right" aria-label="Özet kutusu">
          ${coverScoreAside}
          <div class="cover-period-block">
            <div class="cover-period-label">${esc(periodHeading)}</div>
            <div class="cover-period-value">${esc(pdfCustomRange ? coverPeriodLine : coverPeriodMain)}</div>
            ${periodSub ? `<p class="cover-period-sub">${esc(periodSub)}</p>` : ""}
          </div>
          <p class="cover-hint">Canlı ekranlar güncel olabilir; PDF tek anlık görüntüdür.</p>
        </aside>
      </div>
      <div class="meta">
        <p><strong>Belge:</strong> Misafir deneyimi ve Viona performans raporu</p>
        <p><strong>${esc(periodHeading)}:</strong> ${esc(pdfCustomRange ? coverPeriodLine : coverPeriodMain)}</p>
        ${
          !pdfCustomRange
            ? `<p class="meta-note">Veri penceresi: ${esc(coverPeriodLine)}</p>`
            : ""
        }
        ${pickText(data.pdfRangeNote, "") ? `<p class="meta-note">${esc(data.pdfRangeNote)}</p>` : ""}
        <p><strong>Oluşturulma:</strong> ${formatIsoDate(data.generatedAt, true)}</p>
        ${
          data.reportSnapshotId
            ? `<p><strong>Veri özeti:</strong> ${esc(data.reportSnapshotId)}</p>`
            : ""
        }
      </div>
    </div>
  </section>

  ${page(
    "Yönetici Özeti",
    `${noDataNotice}${execBlock}
    <div class="decision-box spaced"><strong>Yönetici kararı:</strong> ${esc(decisionSummary)}</div>
    ${pickText(ai.executive_summary, "") ? "" : `<div class="section-note spaced">${summaryParagraphs}</div>`}
    ${insightSourceNote}`
  )}

  ${criticalFindingHtml}

  ${page(
    "Genel Skor Kartı",
    `<div class="grid-scores">${scoreCards}</div>
    ${scoreNarrative}
    <p class="section-note spaced small muted">Ağırlıklar: dijital asistan %38, memnuniyet %34, içerik %28. Ticari alt skor bu PDF’te yer almaz. Memnuniyet kartı operasyon için öncelik işaretidir.</p>`
  )}

  ${page(
    "Otel Deneyimi ve Memnuniyet",
    `<div class="metric-card"><h4>Genel otel memnuniyeti (anket özeti)</h4>${formatFivePointHeadline(data.satisfactionMetrics.overallDisplay ?? data.satisfactionMetrics.overall)}${
      pickText(data.satisfactionMetrics?.overallInferredNote, "")
        ? `<p class="section-note small muted" style="margin-top:8px">${esc(data.satisfactionMetrics.overallInferredNote)}</p>`
        : ""
    }</div>
    <div class="spaced">${categoryList(data.satisfactionMetrics.categories || {})}</div>
    <p class="section-note section-space">${satNarrative}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionSat)}</div>`
  )}

  ${page(
    "Viona Asistanı — Misafir Perspektifi",
    `${vionaQuestionCards(data.satisfactionMetrics?.vionaByQuestion || {})}
    <div class="metric-card spaced"><h4>Viona memnuniyeti (anket özeti)</h4>${formatFivePointHeadline(data.satisfactionMetrics.vionaDisplay ?? data.satisfactionMetrics.viona, { variant: "viona" })}${
      pickText(data.satisfactionMetrics?.vionaInferredNote, "")
        ? `<p class="section-note small muted" style="margin-top:8px">${esc(data.satisfactionMetrics.vionaInferredNote)}</p>`
        : ""
    }</div>
    ${
      pickText(data.satisfactionMetrics?.vionaUsageGapNote, "")
        ? `<div class="nodata-banner" style="margin-top:12px"><strong>Kullanım vs. kalite:</strong> ${esc(data.satisfactionMetrics.vionaUsageGapNote)}</div>`
        : ""
    }
    <div class="card spaced"><h4>Otel deneyimi ile Viona — operasyonel köprü</h4><p class="section-note">${hotelVionaBridgeRaw ? hotelVionaBridge : esc("Köprü metni üretilemedi; genel otel ve Viona ortalamalarını üst bölümdeki skorlarla çapraz okuyun.")}</p></div>
    <p class="section-note section-space">${vionaLayerNarrativeRaw ? vionaLayerNarrative : esc(hotelVionaBridgeRaw ? "Genel memnuniyet, anlaşılma ve faydalı olma soruları anket detayında; otel ortalaması ile çapraz okuyun." : "Viona puanını otel ortalaması ve anket detayıyla çapraz okuyun.")}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionViona)}</div>`
  )}

  ${hotelSurveyDetailHtml}
  ${vionaSurveyDetailHtml}

  ${page(
    "Dijital Asistan Kullanımı ve İçerik",
    `${chatTruncateBanner}
    <div class="card">
      <div class="kpi-line"><span>Toplam konuşma</span><strong>${esc(data.chatbotMetrics.totalChats)}</strong></div>
      <div class="kpi-line"><span>Günlük kullanım yoğunluğu</span><strong>${esc((data.chatbotMetrics.dailyUsage || []).length)}</strong></div>
      <div class="kpi-line"><span>Misafir başına mesaj</span><strong>${esc(data.chatbotMetrics.avgMessagesPerUser)}</strong></div>
      <div class="kpi-line"><span>Ortalama konuşma uzunluğu</span><strong>${esc(data.chatbotMetrics.avgConversationLength)}</strong></div>
      <div class="kpi-line"><span>Yanıt verilemeyen mesaj oranı</span><strong>${esc(data.chatbotMetrics.fallbackRate)}%</strong></div>
      <div class="kpi-line"><span>En sık sorulan ifade</span><strong>${esc(data.chatbotMetrics.topQuestion)}</strong></div>
    </div>
    <p class="section-note section-space">${chatNarrative}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionChatbot)}</div>`
  )}

  ${page(
    "Yanıtlanamayan Talepler ve İçerik Öncelikleri",
    `<div class="metric-card"><h4>Otomatik yanıt verilemeyen mesaj (toplam)</h4><p class="big">${esc(data.unansweredMetrics.fallbackCount)}</p></div>
    <div class="card spaced"><h4>En sık yanıtlanamayan konular</h4><ul>${topFallback || "<li>Veri yok</li>"}</ul></div>
    <div class="card spaced"><h4>Öncelikli içerik listesi</h4>${fallbackBacklog(data.unansweredMetrics.prioritizedBacklog || [])}</div>
    <p class="section-note section-space">${fbNarrative}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionUnanswered)}</div>`
  )}

  ${page(
    "Trend, Aksiyonlar ve Metodoloji",
    `${ifThenHtml}
    <div class="card${ifThenHtml ? " spaced" : ""}"><h4>Trend ve Dönem Karşılaştırması</h4><ul>${trendList || "<li>Önceki dönem verisi bulunmuyor veya kıyas isteği kapalı.</li>"}</ul></div>
    <div class="card spaced"><h4>Öncelikli otel operasyon aksiyonları</h4><ol>${hotelActionList}</ol></div>
    <div class="card spaced"><h4>Viona ve dijital kanal aksiyonları</h4><ol>${vionaActionList}</ol></div>
    <div class="card spaced"><h4>Metodoloji ve Notlar</h4><ul>${methodology}</ul></div>`
  )}
</body>
</html>`;
}
