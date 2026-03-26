function esc(v) {
  return String(v == null ? "" : v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
  return `<div class="grid-2">${rows
    .map(([k, v]) => `<div class="metric-card"><h4>${esc(k)}</h4><p class="big">${esc(v)}</p></div>`)
    .join("")}</div>`;
}

function fallbackBacklog(items = []) {
  if (!items.length) return "<p>Fallback backlog verisi bulunmuyor.</p>";
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

export function buildReportHtml(data) {
  const scoreCards = (data.scores || [])
    .map(
      (s) => `<article class="score-card">
        <h4>${esc(s.title)}</h4>
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
  const trendList = (data.insights.trend || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const actionList = (data.actions || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const methodology = (data.methodology || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const noDataNotice = data.noData
    ? `<div class="nodata-banner"><strong>Veri Durumu:</strong> Bu tarih aralığında analiz için yeterli veri bulunamadı. Rapor, veri toplama eksiklerini görünür kılmak için oluşturuldu.</div>`
    : "";
  const logoImg = data.brandLogoUrl
    ? `<div class="brand-logo-pill"><img class="brand-logo" src="${esc(data.brandLogoUrl)}" alt="Eleythra logo" /></div>`
    : `<div class="logo-fallback">Eleythra Logo</div>`;
  const coverBgStyle = data.hotelImageUrl
    ? `style="--cover-image:url('${esc(data.hotelImageUrl)}');"`
    : "";
  const coverBgImage = data.hotelImageUrl ? `<div class="cover-bg-image"></div>` : "";
  const decisionSummary = (data.summary || [])[0] || "Önceliklendirme mevcut veri kalitesi dikkate alınarak yapılmalıdır.";
  const decisionChatbot = data.chatbotMetrics?.comment || "Chatbot performansına göre kısa aksiyon planı oluşturun.";
  const decisionSat = data.satisfactionMetrics?.comment || "Memnuniyet farklarını kategori bazında takip edin.";
  const decisionUnanswered = data.unansweredMetrics?.comment || "Tekrar eden fallback konularını backlog'a taşıyın.";
  const decisionConv = data.conversionMetrics?.comment || "Ticari yönlendirme akışını optimize edin.";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Viona AI Otel Performans Raporu</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    body { font-family: "DejaVu Sans", "Noto Sans", Arial, sans-serif; color: #192236; margin: 0; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .cover { background: radial-gradient(120% 100% at 0% 0%, #173c7f 0%, #14336f 38%, #102754 100%); color: #f0f4ff; border-radius: 16px; padding: 26px; min-height: 230mm; position: relative; overflow: hidden; }
    .cover-bg-image { position: absolute; inset: 0; background-image: var(--cover-image); background-size: cover; background-position: center; opacity: 0.18; filter: saturate(1.08) contrast(1.05); z-index: 0; }
    .cover-overlay { position: absolute; inset: 0; background: linear-gradient(110deg, rgba(7,17,42,0.82) 0%, rgba(12,31,70,0.72) 42%, rgba(19,44,95,0.55) 100%); z-index: 1; }
    .cover-content { position: relative; z-index: 2; }
    h1, h2, h3, h4, p { margin: 0; }
    h2 { margin-bottom: 10px; font-size: 21px; color: #122958; letter-spacing: 0.2px; }
    .muted { color: #61739a; }
    .subtitle { margin-top: 12px; color: #d4e1ff; max-width: 68%; line-height: 1.45; font-size: 16px; }
    .logo-fallback { position: absolute; top: 24px; right: 24px; width: 220px; height: 54px; border-radius: 999px; background: rgba(255,255,255,0.2); color: #e4ecff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; z-index: 4; }
    .brand-logo-pill { position: absolute; top: 24px; right: 24px; z-index: 4; background: rgba(255,255,255,0.95); border: 1px solid rgba(205,219,248,0.95); border-radius: 999px; padding: 8px 14px; box-shadow: 0 8px 24px rgba(5, 15, 36, 0.35); }
    .brand-logo { width: 188px; height: auto; object-fit: contain; display: block; }
    .cover-grid { display: block; position: relative; }
    .cover-title { margin-top: 96px; font-size: 50px; line-height: 1.09; letter-spacing: 0.1px; max-width: 62%; }
    .meta { margin-top: 22px; display: grid; gap: 8px; background: rgba(7, 18, 46, 0.52); border: 1px solid rgba(158,190,242,0.28); border-radius: 12px; padding: 11px 14px; max-width: 62%; backdrop-filter: blur(2px); }
    .meta p { font-size: 13px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .score-card, .metric-card, .card { border: 1px solid #d7e1f6; border-radius: 14px; padding: 13px; background: #fbfdff; box-shadow: 0 3px 10px rgba(20,43,84,0.05); }
    .score-card h4, .metric-card h4 { font-size: 13px; color: #24406f; }
    .big { font-size: 30px; font-weight: 700; margin-top: 8px; color: #123270; letter-spacing: 0.2px; }
    .badge { display: inline-block; margin-top: 10px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .badge-critical { background: #fce2e2; color: #9d1f1f; }
    .badge-warning { background: #ffefde; color: #a55a00; }
    .badge-good { background: #e4f0ff; color: #1f4fa8; }
    .badge-great { background: #e4f8ec; color: #20704c; }
    ul { margin: 8px 0 0; padding-left: 18px; }
    li { margin: 4px 0; }
    .section-note { margin-top: 10px; color: #3b4b73; line-height: 1.6; }
    .section-space { margin-top: 14px; }
    .decision-box { margin-top: 12px; border: 1px solid #d7e5ff; background: linear-gradient(180deg, #f4f8ff, #eef5ff); border-radius: 10px; padding: 9px 11px; color: #1d3a70; font-size: 12px; line-height: 1.45; }
    .decision-box strong { color: #123063; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #dbe3f7; text-align: left; padding: 8px 7px; font-size: 11.5px; }
    .bar-row { display: grid; grid-template-columns: 120px 1fr 42px; gap: 8px; align-items: center; margin: 8px 0; font-size: 12px; }
    .bar { background: #e5ecfb; border-radius: 999px; overflow: hidden; height: 10px; }
    .bar i { display: block; height: 10px; background: linear-gradient(90deg, #2f5fbe, #63b3ff); }
    .spaced { margin-top: 12px; }
    .kpi-line { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #d7dff1; }
    .nodata-banner { margin: 8px 0 14px; background: #fff4e5; color: #7f4a00; border: 1px solid #f2c078; border-radius: 10px; padding: 10px 12px; line-height: 1.45; }
  </style>
</head>
<body>
  <section class="page cover" ${coverBgStyle}>
    ${coverBgImage}
    <div class="cover-overlay"></div>
    <div class="cover-content">
      <div class="cover-grid">
        <div>
          ${logoImg}
          <h1 class="cover-title">Viona AI Otel<br/>Performans Raporu</h1>
          <p class="subtitle">Chatbot performansı, misafir memnuniyeti, cevaplanamayan sorular ve gelir etkisi analiz raporu.</p>
        </div>
      </div>
      <div class="meta">
        <p><strong>Otel:</strong> Kaila Beach Hotel</p>
        <p><strong>Tarih Aralığı:</strong> ${formatIsoDate(data.dateRange.from)} - ${formatIsoDate(data.dateRange.to)}</p>
        <p><strong>Oluşturulma:</strong> ${formatIsoDate(data.generatedAt, true)}</p>
      </div>
    </div>
  </section>

  ${page(
    "Yönetici Özeti",
    `${noDataNotice}<div class="card">${summaryParagraphs}</div>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionSummary)}</div>
    <div class="section-note spaced"><strong>Genel not:</strong> Değerlendirmeler mutlak hüküm yerine veriye dayalı yönetici yorumu mantığı ile üretilmiştir.</div>`
  )}

  ${page(
    "Genel Skor Kartı",
    `<div class="grid-2">${scoreCards}</div>
    <div class="section-note spaced">Skor formülü: Chatbot %35, Memnuniyet %25, İçerik Yeterlilik %20, Ticari Etki %20.</div>`
  )}

  ${page(
    "Chatbot Performans Analizi",
    `<div class="card">
      <div class="kpi-line"><span>Toplam sohbet</span><strong>${esc(data.chatbotMetrics.totalChats)}</strong></div>
      <div class="kpi-line"><span>Günlük kullanım yoğunluğu</span><strong>${esc((data.chatbotMetrics.dailyUsage || []).length)}</strong></div>
      <div class="kpi-line"><span>Kullanıcı başına mesaj</span><strong>${esc(data.chatbotMetrics.avgMessagesPerUser)}</strong></div>
      <div class="kpi-line"><span>Ortalama sohbet uzunluğu</span><strong>${esc(data.chatbotMetrics.avgConversationLength)}</strong></div>
      <div class="kpi-line"><span>Fallback oranı</span><strong>${esc(data.chatbotMetrics.fallbackRate)}%</strong></div>
      <div class="kpi-line"><span>En çok sorulan soru</span><strong>${esc(data.chatbotMetrics.topQuestion)}</strong></div>
    </div>
    <p class="section-note section-space">${esc(data.chatbotMetrics.comment)}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionChatbot)}</div>`
  )}

  ${page(
    "Memnuniyet Analizi",
    `<div class="grid-2">
      <div class="metric-card"><h4>Genel Otel Memnuniyeti</h4><p class="big">${esc(data.satisfactionMetrics.overall)}</p></div>
      <div class="metric-card"><h4>Viona Memnuniyeti</h4><p class="big">${esc(data.satisfactionMetrics.viona)}</p></div>
    </div>
    <div class="spaced">${categoryList(data.satisfactionMetrics.categories || {})}</div>
    <p class="section-note section-space">${esc(data.satisfactionMetrics.comment)}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionSat)}</div>`
  )}

  ${page(
    "Cevaplanamayan Sorular Analizi",
    `<div class="metric-card"><h4>Toplam fallback</h4><p class="big">${esc(data.unansweredMetrics.fallbackCount)}</p></div>
    <div class="card spaced"><h4>En çok fallback alınan konular</h4><ul>${topFallback || "<li>Veri yok</li>"}</ul></div>
    <div class="card spaced"><h4>Öncelikli İçerik Backlog'u</h4>${fallbackBacklog(data.unansweredMetrics.prioritizedBacklog || [])}</div>
    <p class="section-note section-space">${esc(data.unansweredMetrics.comment)}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionUnanswered)}</div>`
  )}

  ${page(
    "Gelire Etki / Conversion Analizi",
    `<div class="grid-2">
      <div class="metric-card"><h4>Toplam tıklama</h4><p class="big">${esc(data.conversionMetrics.actionClicks)}</p></div>
      <div class="metric-card"><h4>Toplam dönüşüm</h4><p class="big">${esc(data.conversionMetrics.actionConversions)}</p></div>
      <div class="metric-card"><h4>Action conversion oranı</h4><p class="big">${esc(data.conversionMetrics.actionConversionRate)}%</p></div>
      <div class="metric-card"><h4>Chat -> dönüşüm oranı</h4><p class="big">${esc(data.conversionMetrics.chatToConversionRate)}%</p></div>
    </div>
    <div class="card spaced"><h4>Servis Bazlı Tıklama Dağılımı</h4>${simpleBars(data.conversionMetrics.actionClicksByType || {})}</div>
    <p class="section-note section-space">${esc(data.conversionMetrics.comment)}</p>
    <div class="decision-box"><strong>Yönetici kararı:</strong> ${esc(decisionConv)}</div>
    <p class="section-note"><strong>Not:</strong> Bu oranlar başlangıç operasyon eşiği olarak okunmalıdır; kanal, cihaz ve trafik kalitesine göre değişkenlik gösterir.</p>`
  )}

  ${page(
    "Trend, Aksiyonlar ve Metodoloji",
    `<div class="card"><h4>Trend ve Dönem Karşılaştırması</h4><ul>${trendList || "<li>Önceki dönem verisi bulunmuyor.</li>"}</ul></div>
    <div class="card spaced"><h4>Yapılması Gereken İlk 5 Aksiyon</h4><ol>${actionList}</ol></div>
    <div class="card spaced"><h4>Metodoloji ve Notlar</h4><ul>${methodology}</ul></div>`
  )}
</body>
</html>`;
}
