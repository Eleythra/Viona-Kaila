import {
  opReportComplaintSubject,
  opReportFaultCategory,
  opReportFaultLocation,
  opReportFaultUrgency,
  opReportGuestNotificationMain,
  opReportGuestNotificationSub,
  opReportRequestQuantityDisplay,
  opReportRequestSection,
  opReportRequestTypeLine,
} from "../../../services/operational-template-format.js";

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dash(v) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function normalizeBucketStatus(st) {
  const s = String(st ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s === "new" || s === "pending") return "pending";
  return s;
}

function issueStatusLabelTr(issueType, status) {
  const s = normalizeBucketStatus(status);
  if (s === "cancelled") return "İptal";
  if (s === "pending") return "Bekliyor";
  if (s === "in_progress") return "Yapılıyor";
  if (s === "done") {
    if (issueType === "late_checkout") return "Onaylandı";
    return "Yapıldı";
  }
  if (s === "rejected") {
    if (issueType === "late_checkout") return "Onaylanmadı";
    return "Yapılmadı";
  }
  return dash(s);
}

function formatSubmittedAtTr(iso) {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

function formatReportDateTr(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
  if (!m) return dash(ymd);
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function summaryLineRequest(s) {
  if (!s || s.mode === "filtered") {
    return `Toplam: ${s?.toplam ?? 0} (durum filtresi)`;
  }
  return `Bekliyor: ${s.bekliyor} · Yapılıyor: ${s.islemde} · Yapıldı: ${s.yapildi} · Yapılmadı: ${s.yapilmadi} · İptal: ${s.iptal} · Toplam: ${s.toplam}`;
}

function summaryLineFrontOffice(s) {
  if (!s || s.mode === "filtered") {
    return `Toplam: ${s?.total ?? 0} (durum filtresi)`;
  }
  const parts = ["complaint", "guest_notification", "late_checkout"].map((t) => {
    const x = s.byType?.[t];
    if (!x) return `${t}: —`;
    return `${t}: T${x.toplam} (B${x.bekliyor}/İ${x.islemde}/Y${x.yapildi}/N${x.yapilmadi}/X${x.iptal})`;
  });
  return `Özet: Bekliyor ${s.bekliyor} · Yapılıyor ${s.islemde} · Yapıldı ${s.yapildi} · Yapılmadı ${s.yapilmadi} · İptal ${s.iptal} · Toplam ${s.toplam}<br/><span class="muted">${parts.join(" · ")}</span>`;
}

function tableWrap(inner) {
  return `<table class="tbl"><thead>${inner.thead}</thead><tbody>${inner.tbody}</tbody></table>`;
}

/** @typedef {'hk' | 'tech' | 'front'} DailyReportSegment */

const SEGMENT_TITLE = {
  hk: "HK — oda hizmeti (istekler)",
  tech: "Teknik — arızalar",
  front: "Ön büro — şikâyet / misafir bildirimi / geç çıkış",
};

/**
 * @param {{
 *   segment: DailyReportSegment,
 *   reportYmd: string,
 *   hotelName: string,
 *   summaryRequest: object,
 *   summaryFault: object,
 *   summaryFront: object,
 *   rowsRequest: object[],
 *   rowsFault: object[],
 *   rowsComplaint: object[],
 *   rowsGuestNotification: object[],
 *   rowsLateCheckout: object[],
 * }} data
 */
export function buildDailyOperationReportHtml(data) {
  const seg = String(data.segment || "").trim();
  if (!["hk", "tech", "front"].includes(seg)) {
    throw new Error("invalid_daily_report_segment");
  }
  const title = `${SEGMENT_TITLE[seg]} — ${formatReportDateTr(data.reportYmd)}`;
  const hotel = dash(data.hotelName);

  const hkHead =
    "<tr><th>Oda</th><th>Misafir</th><th>Uyruk</th><th>Form bölümü</th><th>Talep türü</th><th>Adet</th><th>Misafir notu</th><th>Durum</th><th>Kayıt</th></tr>";
  const hkBody = (data.rowsRequest || [])
    .map((r) => {
      return `<tr>
<td>${esc(dash(r.room_number))}</td>
<td>${esc(dash(r.guest_name))}</td>
<td>${esc(dash(r.nationality))}</td>
<td>${esc(opReportRequestSection(r))}</td>
<td>${esc(opReportRequestTypeLine(r))}</td>
<td>${esc(opReportRequestQuantityDisplay(r))}</td>
<td class="wrap">${esc(dash(r.description))}</td>
<td>${esc(issueStatusLabelTr("request", r.status))}</td>
<td>${esc(formatSubmittedAtTr(r.submitted_at))}</td>
</tr>`;
    })
    .join("");

  const techHead =
    "<tr><th>Oda</th><th>Misafir</th><th>Uyruk</th><th>Arıza</th><th>Konum</th><th>Öncelik</th><th>Açıklama</th><th>Durum</th><th>Kayıt</th></tr>";
  const techBody = (data.rowsFault || [])
    .map((r) => {
      return `<tr>
<td>${esc(dash(r.room_number))}</td>
<td>${esc(dash(r.guest_name))}</td>
<td>${esc(dash(r.nationality))}</td>
<td>${esc(opReportFaultCategory(r))}</td>
<td>${esc(opReportFaultLocation(r))}</td>
<td>${esc(opReportFaultUrgency(r))}</td>
<td class="wrap">${esc(dash(r.description))}</td>
<td>${esc(issueStatusLabelTr("fault", r.status))}</td>
<td>${esc(formatSubmittedAtTr(r.submitted_at))}</td>
</tr>`;
    })
    .join("");

  const compHead =
    "<tr><th>Oda</th><th>Misafir</th><th>Uyruk</th><th>Konu</th><th>Açıklama</th><th>Durum</th><th>Kayıt</th></tr>";
  const compBody = (data.rowsComplaint || [])
    .map((r) => {
      return `<tr>
<td>${esc(dash(r.room_number))}</td>
<td>${esc(dash(r.guest_name))}</td>
<td>${esc(dash(r.nationality))}</td>
<td>${esc(opReportComplaintSubject(r))}</td>
<td class="wrap">${esc(dash(r.description))}</td>
<td>${esc(issueStatusLabelTr("complaint", r.status))}</td>
<td>${esc(formatSubmittedAtTr(r.submitted_at))}</td>
</tr>`;
    })
    .join("");

  const gnHead =
    "<tr><th>Oda</th><th>Misafir</th><th>Uyruk</th><th>Genel alan</th><th>Alt başlık</th><th>Detay</th><th>Durum</th><th>Kayıt</th></tr>";
  const gnBody = (data.rowsGuestNotification || [])
    .map((r) => {
      return `<tr>
<td>${esc(dash(r.room_number))}</td>
<td>${esc(dash(r.guest_name))}</td>
<td>${esc(dash(r.nationality))}</td>
<td>${esc(opReportGuestNotificationMain(r))}</td>
<td>${esc(opReportGuestNotificationSub(r))}</td>
<td class="wrap">${esc(dash(r.description))}</td>
<td>${esc(issueStatusLabelTr("guest_notification", r.status))}</td>
<td>${esc(formatSubmittedAtTr(r.submitted_at))}</td>
</tr>`;
    })
    .join("");

  const lcHead =
    "<tr><th>Oda</th><th>Misafir</th><th>Uyruk</th><th>İstenen çıkış tarihi</th><th>İstenen çıkış saati</th><th>Açıklama</th><th>Durum</th><th>Kayıt</th></tr>";
  const lcBody = (data.rowsLateCheckout || [])
    .map((r) => {
      const rawD = String(r.checkout_date || r.details?.checkoutDate || r.raw_payload?.checkout_date || "").trim();
      const rawT = String(r.checkout_time || r.details?.checkoutTime || r.raw_payload?.checkout_time || "").trim();
      return `<tr>
<td>${esc(dash(r.room_number))}</td>
<td>${esc(dash(r.guest_name))}</td>
<td>${esc(dash(r.nationality))}</td>
<td>${esc(dash(rawD))}</td>
<td>${esc(dash(rawT))}</td>
<td class="wrap">${esc(dash(r.description))}</td>
<td>${esc(issueStatusLabelTr("late_checkout", r.status))}</td>
<td>${esc(formatSubmittedAtTr(r.submitted_at))}</td>
</tr>`;
    })
    .join("");

  const css = `
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 9px; color: #111; }
    h1 { font-size: 15px; margin: 0 0 4px 0; }
    .sub { font-size: 11px; color: #444; margin-bottom: 10px; }
    h2 { font-size: 12px; margin: 14px 0 6px 0; border-bottom: 1px solid #bbb; padding-bottom: 2px; }
    .box { border: 1px solid #ddd; padding: 6px 8px; margin: 6px 0 10px 0; background: #fafafa; line-height: 1.35; }
    .muted { color: #555; font-size: 8px; }
    table.tbl { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    table.tbl th, table.tbl td { border: 1px solid #ccc; padding: 3px 4px; vertical-align: top; }
    table.tbl th { background: #eee; font-weight: 600; }
    td.wrap { max-width: 140px; word-break: break-word; }
    .empty { color: #666; font-style: italic; padding: 4px 0; }
  `;

  const sections = [];

  if (seg === "hk") {
    sections.push(`<h2>HK — istekler</h2><div class="box">${summaryLineRequest(data.summaryRequest)}</div>`);
    sections.push(
      data.rowsRequest?.length
        ? tableWrap({ thead: hkHead, tbody: hkBody })
        : '<p class="empty">Bu gün için HK isteği yok.</p>',
    );
  } else if (seg === "tech") {
    sections.push(`<h2>Teknik — arızalar</h2><div class="box">${summaryLineRequest(data.summaryFault)}</div>`);
    sections.push(
      data.rowsFault?.length
        ? tableWrap({ thead: techHead, tbody: techBody })
        : '<p class="empty">Bu gün için arıza kaydı yok.</p>',
    );
  } else {
    sections.push(`<h2>Ön büro — özet</h2><div class="box">${summaryLineFrontOffice(data.summaryFront)}</div>`);
    sections.push(`<h2>Ön büro — şikâyetler</h2>`);
    sections.push(
      data.rowsComplaint?.length
        ? tableWrap({ thead: compHead, tbody: compBody })
        : '<p class="empty">Bu gün için şikâyet yok.</p>',
    );
    sections.push(`<h2>Ön büro — misafir bildirimleri</h2>`);
    sections.push(
      data.rowsGuestNotification?.length
        ? tableWrap({ thead: gnHead, tbody: gnBody })
        : '<p class="empty">Bu gün için misafir bildirimi yok.</p>',
    );
    sections.push(`<h2>Ön büro — geç çıkış</h2>`);
    sections.push(
      data.rowsLateCheckout?.length
        ? tableWrap({ thead: lcHead, tbody: lcBody })
        : '<p class="empty">Bu gün için geç çıkış talebi yok.</p>',
    );
  }

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${css}</style></head><body>
<h1>${esc(title)}</h1>
<div class="sub">${esc(hotel)} · Otel günü (kayıt tarihi): ${esc(formatReportDateTr(data.reportYmd))} · PDF üretim: sunucu (personel «iç notları» yer almaz)</div>
${sections.join("\n")}
</body></html>`;
}

export function formatDailyReportBodyDateTr(ymd) {
  return formatReportDateTr(ymd);
}
