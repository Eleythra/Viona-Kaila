/**
 * Operasyon sekmeleri — seçilen takvim günü için özet PDF (jsPDF + autotable).
 * Gün filtresi: adapter.getBucketMergeAll(type, maxPages, { from, to }).
 */
(function () {
  "use strict";

  var MERGE_MAX_PAGES = 40;

  function pdfLatinize(s) {
    return String(s == null ? "" : s)
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");
  }

  function normAdminIssueStatus(row) {
    var st = String((row && row.status) || "new")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (st === "inprogress") st = "in_progress";
    if (
      st === "denied" ||
      st === "declined" ||
      st === "onaylanmadi" ||
      st === "not_approved" ||
      st === "yapilamadi" ||
      st === "dikkate_alinmadi"
    ) {
      st = "rejected";
    }
    if (
      st === "yapildi" ||
      st === "tamamlandi" ||
      st === "completed" ||
      st === "resolved" ||
      st === "fulfilled" ||
      st === "dikkate_alindi"
    ) {
      st = "done";
    }
    return st;
  }

  function countOpsKanbanStatus(rows) {
    var bekliyor = 0;
    var yapiliyor = 0;
    var yapildi = 0;
    var yapilmadi = 0;
    var iptal = 0;
    var diger = 0;
    (rows || []).forEach(function (r) {
      var st = normAdminIssueStatus(r);
      if (st === "new" || st === "pending") bekliyor++;
      else if (st === "in_progress") yapiliyor++;
      else if (st === "done") yapildi++;
      else if (st === "rejected") yapilmadi++;
      else if (st === "cancelled") iptal++;
      else diger++;
    });
    return {
      bekliyor: bekliyor,
      yapiliyor: yapiliyor,
      yapildi: yapildi,
      yapilmadi: yapilmadi,
      iptal: iptal,
      diger: diger,
      toplam: (rows || []).length,
    };
  }

  function rowStatusBucket(row) {
    var st = normAdminIssueStatus(row);
    if (st === "new" || st === "pending") return "bekliyor";
    if (st === "in_progress") return "yapiliyor";
    if (st === "done") return "yapildi";
    if (st === "rejected") return "yapilmadi";
    if (st === "cancelled") return "iptal";
    return "diger";
  }

  function rowTintRgb(bucket) {
    switch (bucket) {
      case "bekliyor":
        return [255, 248, 235];
      case "yapiliyor":
        return [235, 242, 255];
      case "yapildi":
        return [220, 252, 234];
      case "yapilmadi":
        return [254, 242, 242];
      case "iptal":
        return [241, 245, 249];
      default:
        return [252, 252, 253];
    }
  }

  /** Durum sutunu: koyu zemin + beyaz metin (okunabilir rozet). */
  function statusPillStyle(bucket) {
    switch (bucket) {
      case "bekliyor":
        return { fill: [180, 83, 9], text: [255, 255, 255] };
      case "yapiliyor":
        return { fill: [29, 78, 216], text: [255, 255, 255] };
      case "yapildi":
        return { fill: [21, 128, 61], text: [255, 255, 255] };
      case "yapilmadi":
        return { fill: [185, 28, 28], text: [255, 255, 255] };
      case "iptal":
        return { fill: [71, 85, 105], text: [248, 250, 252] };
      default:
        return { fill: [71, 85, 105], text: [255, 255, 255] };
    }
  }

  function drawStatusLegend(doc, M, y, contentW) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, contentW, 30, 4, 4, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(M, y, contentW, 30, 4, 4, "S");
    var items = [
      { b: "bekliyor", l: "Bekl." },
      { b: "yapiliyor", l: "Yapr." },
      { b: "yapildi", l: "Bitti" },
      { b: "yapilmadi", l: "Red" },
      { b: "iptal", l: "Iptal" },
    ];
    var slot = Math.min(104, (contentW - 16) / items.length);
    var x0 = M + 8;
    var pill = 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    items.forEach(function (it, i) {
      var x = x0 + i * slot;
      var st = statusPillStyle(it.b);
      doc.setFillColor(st.fill[0], st.fill[1], st.fill[2]);
      doc.roundedRect(x, y + 9, pill, pill, 2, 2, "F");
      doc.setTextColor(51, 65, 85);
      doc.text(pdfLatinize(it.l), x + pill + 3, y + 16);
    });
    return y + 36;
  }

  function createPdfDocument() {
    var root = window.jspdf;
    var DocCtor = null;
    if (root) {
      if (typeof root.jsPDF === "function") DocCtor = root.jsPDF;
      else if (root.default && typeof root.default === "function") DocCtor = root.default;
    }
    if (!DocCtor) {
      throw new Error("jspdf_missing");
    }
    var doc = new DocCtor({ orientation: "portrait", unit: "pt", format: "a4" });
    if (typeof doc.autoTable !== "function") {
      throw new Error("autotable_missing");
    }
    return doc;
  }

  function formatSubmittedShort(iso) {
    var s = String(iso || "");
    if (!s) return "-";
    var d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      var dd = String(d.getDate()).padStart(2, "0");
      var mm = String(d.getMonth() + 1).padStart(2, "0");
      var hh = String(d.getHours()).padStart(2, "0");
      var mi = String(d.getMinutes()).padStart(2, "0");
      return dd + "/" + mm + " " + hh + ":" + mi;
    }
    return s.length >= 16 ? s.slice(0, 16).replace("T", " ") : s.slice(0, 10);
  }

  function operationGuestName(row) {
    if (!row || typeof row !== "object") return "";
    var g = String(row.guest_name || "").replace(/\s+/g, " ").trim();
    if (g) return g;
    var raw = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    return String(raw.name || raw.guest_name || "").replace(/\s+/g, " ").trim();
  }

  function pdfDetailShort(row, type) {
    if (!row) return "-";
    var d = String(row.description || row.note || "").replace(/\s+/g, " ").trim();
    var c = String(row.category || "").trim();
    if (!c && row.categories && row.categories.length) c = String(row.categories[0] || "").trim();
    var bits = [];
    if (c) bits.push(c);
    if (d) bits.push(d);
    var t = bits.join(" — ") || "-";
    return pdfLatinize(t.length > 220 ? t.slice(0, 217) + "..." : t);
  }

  function statusLabelPdf(row, type) {
    var st = normAdminIssueStatus(row);
    if (type === "complaint" || type === "guest_notification") {
      if (st === "done") return pdfLatinize("Dikkate alindi");
      if (st === "rejected") return pdfLatinize("Dikkate alinmadi");
      if (st === "in_progress") return pdfLatinize("Islemde");
      if (st === "new" || st === "pending") return pdfLatinize("Bekliyor");
      if (st === "cancelled") return pdfLatinize("Iptal");
      return pdfLatinize(st);
    }
    if (st === "done") return pdfLatinize("Yapildi");
    if (st === "rejected") return pdfLatinize("Yapilmadi");
    if (st === "in_progress") return pdfLatinize("Yapiliyor");
    if (st === "new" || st === "pending") return pdfLatinize("Bekliyor");
    if (st === "cancelled") return pdfLatinize("Iptal");
    return pdfLatinize(st);
  }

  function drawPremiumHeader(doc, M, pageW, title, subtitle, reportDayYmd) {
    doc.setFillColor(8, 14, 26);
    doc.rect(0, 0, pageW, 86, "F");
    doc.setFillColor(22, 42, 78);
    doc.rect(0, 0, pageW * 0.62, 86, "F");
    doc.setFillColor(32, 58, 102);
    doc.rect(0, 0, pageW * 0.38, 86, "F");
    doc.setFillColor(61, 108, 255);
    doc.rect(0, 80, pageW, 4, "F");
    doc.setFillColor(212, 175, 85);
    doc.rect(M, 82, Math.min(200, pageW - 2 * M), 1.4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(pdfLatinize(title), M, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 212, 235);
    var sub = pdfLatinize(subtitle);
    doc.text(sub, M, 54, { maxWidth: pageW - 2 * M });
    if (reportDayYmd && /^\d{4}-\d{2}-\d{2}$/.test(reportDayYmd)) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 248, 220);
      doc.text(pdfLatinize("Rapor gunu: ") + reportDayYmd, M, 72);
    }
    doc.setTextColor(28, 38, 52);
    return 98;
  }

  function drawStatCards(doc, M, y, counts, contentW) {
    var items = [
      { k: "bekliyor", l: "Bekliyor", rgb: [245, 158, 11] },
      { k: "yapiliyor", l: "Yapiliyor", rgb: [59, 130, 246] },
      { k: "yapildi", l: "Yapildi", rgb: [34, 197, 94] },
      { k: "yapilmadi", l: "Yapilmadi", rgb: [239, 68, 68] },
      { k: "iptal", l: "Iptal", rgb: [100, 116, 139] },
    ];
    var gap = 7;
    var n = items.length;
    var w = (contentW - gap * (n - 1)) / n;
    var h = 54;
    items.forEach(function (it, i) {
      var x = M + i * (w + gap);
      doc.setFillColor(252, 253, 255);
      doc.roundedRect(x, y, w, h, 5, 5, "F");
      doc.setDrawColor(it.rgb[0], it.rgb[1], it.rgb[2]);
      doc.setLineWidth(2.2);
      doc.line(x + 5, y + 10, x + 5, y + h - 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(String(counts[it.k] != null ? counts[it.k] : 0), x + w / 2, y + 28, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(71, 85, 105);
      doc.text(pdfLatinize(it.l), x + w / 2, y + 44, { align: "center" });
    });
    return y + h + 16;
  }

  function drawSectionTitle(doc, M, y, text) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(M, y, doc.internal.pageSize.getWidth() - 2 * M, 22, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(pdfLatinize(text), M + 10, y + 14);
    return y + 30;
  }

  function buildRowsForTable(rows, type) {
    var body = [];
    var buckets = [];
    (rows || []).forEach(function (r) {
      buckets.push(rowStatusBucket(r));
      body.push([
        pdfLatinize(formatSubmittedShort(r.submitted_at)),
        pdfLatinize(String(r.room_number || "-")),
        pdfLatinize(operationGuestName(r) || "-"),
        pdfLatinize(String(r.category || (r.categories && r.categories[0]) || "-")),
        pdfDetailShort(r, type),
        statusLabelPdf(r, type),
      ]);
    });
    return { body: body, buckets: buckets };
  }

  function autoTableBlock(doc, M, pageW, pageH, startY, head, body, buckets) {
    if (!body.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfLatinize("Bu gun icin kayit bulunmuyor."), M, startY + 8);
      return startY + 28;
    }
    doc.autoTable({
      startY: startY,
      head: head,
      body: body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
        overflow: "linebreak",
        valign: "middle",
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.35,
      },
      headStyles: {
        fillColor: [30, 64, 110],
        textColor: [248, 250, 252],
        fontStyle: "bold",
        fontSize: 9,
        halign: "left",
        valign: "middle",
      },
      bodyStyles: { minCellHeight: 13, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 58 },
        1: { cellWidth: 32, halign: "center" },
        2: { cellWidth: 84 },
        3: { cellWidth: 68 },
        4: { cellWidth: "auto" },
        5: { cellWidth: 68, halign: "center", fontStyle: "bold" },
      },
      margin: { left: M, right: M },
      didParseCell: function (data) {
        if (data.section !== "body" || !buckets || data.row == null) return;
        var ri = typeof data.row.index === "number" ? data.row.index : -1;
        if (ri < 0 || ri >= buckets.length) return;
        var bucket = buckets[ri];
        if (typeof data.column.index !== "number") return;
        if (data.column.index === 5) {
          var pill = statusPillStyle(bucket);
          data.cell.styles.fillColor = pill.fill;
          data.cell.styles.textColor = pill.text;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.fillColor = rowTintRgb(bucket);
          data.cell.styles.textColor = [30, 41, 59];
          data.cell.styles.fontStyle = "normal";
        }
      },
      didDrawPage: function (data) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        var foot = pdfLatinize("Viona · Kaila Beach Hotel  |  Olusturma: " + formatSubmittedShort(new Date().toISOString()));
        doc.text(foot, M, pageH - 20);
        doc.text(pdfLatinize("Sayfa ") + data.pageNumber, pageW - M, pageH - 20, { align: "right" });
      },
    });
    return doc.lastAutoTable.finalY + 14;
  }

  /** Ayni kayit id iki kez gelirse (sayfalama/kenar durumu) tabloda tek satir. */
  function dedupeRowsById(items) {
    var seen = Object.create(null);
    var out = [];
    (items || []).forEach(function (r) {
      var id = r && r.id != null ? String(r.id).trim() : "";
      if (id) {
        var k = "id_" + id;
        if (seen[k]) return;
        seen[k] = true;
      }
      out.push(r);
    });
    return out;
  }

  async function fetchDay(adapter, type, ymd) {
    var raw = await adapter.getBucketMergeAll(type, MERGE_MAX_PAGES, { from: ymd, to: ymd });
    return { items: dedupeRowsById(raw.items), truncated: Boolean(raw.truncated) };
  }

  function oneSectionPdf(doc, variantTitle, typeTitle, ymd, rows, type) {
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var M = 36;
    var contentW = pageW - 2 * M;
    var sub =
      pdfLatinize("Operasyon gunu (Istanbul takvimi): ") +
      ymd +
      pdfLatinize("  |  Kayit sayisi: ") +
      String((rows || []).length);
    var y0 = drawPremiumHeader(doc, M, pageW, typeTitle, sub + " · " + variantTitle, ymd);
    var k = countOpsKanbanStatus(rows);
    var y1 = drawStatCards(doc, M, y0, k, contentW);
    y1 = drawStatusLegend(doc, M, y1, contentW);
    if (k.diger > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfLatinize("Not: ") + String(k.diger) + pdfLatinize(" kayit standart disi durum kodunda."), M, y1);
      y1 += 12;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(
      pdfLatinize(
        "Tablo: satir zemini durum grubunu, Durum sutunu renkli rozet olarak gosterir (Istanbul gunu ile filtrelenmis kayitlar).",
      ),
      M,
      y1,
      { maxWidth: contentW },
    );
    y1 += 22;
    var head = [
      [
        pdfLatinize("Zaman"),
        pdfLatinize("Oda"),
        pdfLatinize("Misafir"),
        pdfLatinize("Kategori"),
        pdfLatinize("Detay"),
        pdfLatinize("Durum"),
      ],
    ];
    var pack = buildRowsForTable(rows, type);
    return autoTableBlock(doc, M, pageW, pageH, y1, head, pack.body, pack.buckets);
  }

  async function download(opts) {
    if (download._vionaPdfBusy) {
      return;
    }
    download._vionaPdfBusy = true;
    try {
    var adapter = opts && opts.adapter;
    var ymd = String((opts && opts.ymd) || "").trim();
    var variant = String((opts && opts.variant) || "").trim();
    if (!adapter || typeof adapter.getBucketMergeAll !== "function") {
      throw new Error("adapter_missing");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      throw new Error("invalid_date");
    }
    var doc = createPdfDocument();

    if (variant === "hk") {
      var packHk = await fetchDay(adapter, "request", ymd);
      oneSectionPdf(doc, pdfLatinize("HK operasyon"), pdfLatinize("Gunluk HK talep raporu"), ymd, packHk.items || [], "request");
      if (packHk.truncated) {
        var ph = doc.internal.pageSize.getHeight();
        var pw = doc.internal.pageSize.getWidth();
        var fy =
          doc.lastAutoTable && typeof doc.lastAutoTable.finalY === "number" ? doc.lastAutoTable.finalY + 14 : ph - 40;
        if (fy > ph - 24) {
          doc.addPage();
          fy = 36;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text(
          pdfLatinize("Not: Sayfa limiti nedeniyle liste kesilmis olabilir; tam liste icin panelden kontrol edin."),
          36,
          fy,
          { maxWidth: pw - 72 },
        );
      }
      doc.save("Viona-Operasyon-HK_" + ymd + ".pdf");
      return;
    }

    if (variant === "tech") {
      var packT = await fetchDay(adapter, "fault", ymd);
      oneSectionPdf(doc, pdfLatinize("Teknik operasyon"), pdfLatinize("Gunluk ariza raporu"), ymd, packT.items || [], "fault");
      if (packT.truncated) {
        var ph2 = doc.internal.pageSize.getHeight();
        var pw2 = doc.internal.pageSize.getWidth();
        var fy2 =
          doc.lastAutoTable && typeof doc.lastAutoTable.finalY === "number" ? doc.lastAutoTable.finalY + 14 : ph2 - 40;
        if (fy2 > ph2 - 24) {
          doc.addPage();
          fy2 = 36;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text(
          pdfLatinize("Not: Sayfa limiti nedeniyle liste kesilmis olabilir; tam liste icin panelden kontrol edin."),
          36,
          fy2,
          { maxWidth: pw2 - 72 },
        );
      }
      doc.save("Viona-Operasyon-Teknik_" + ymd + ".pdf");
      return;
    }

    if (variant === "front") {
      var packC = await fetchDay(adapter, "complaint", ymd);
      var packG = await fetchDay(adapter, "guest_notification", ymd);
      var packL = await fetchDay(adapter, "late_checkout", ymd);
      var pageW = doc.internal.pageSize.getWidth();
      var pageH = doc.internal.pageSize.getHeight();
      var M = 36;
      var contentW = pageW - 2 * M;
      var total = (packC.items || []).length + (packG.items || []).length + (packL.items || []).length;
      var sub =
        pdfLatinize("Operasyon gunu: ") +
        ymd +
        pdfLatinize("  |  Toplam kayit: ") +
        String(total);
      var y = drawPremiumHeader(
        doc,
        M,
        pageW,
        pdfLatinize("Gunluk on buro operasyon raporu"),
        sub + pdfLatinize(" · Sikayet, misafir bildirimi, gec cikis"),
        ymd,
      );
      var allRows = (packC.items || []).concat(packG.items || []).concat(packL.items || []);
      var kAll = countOpsKanbanStatus(allRows);
      y = drawStatCards(doc, M, y, kAll, contentW);
      y = drawStatusLegend(doc, M, y, contentW);
      if (kAll.diger > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(pdfLatinize("Not: ") + String(kAll.diger) + pdfLatinize(" kayit standart disi durum kodunda."), M, y);
        y += 12;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(
        pdfLatinize("Her bolum ayri tablodur; satir zemini ve Durum rozetleri ayni renk mantigini kullanir."),
        M,
        y,
        { maxWidth: contentW },
      );
      y += 22;

      y = drawSectionTitle(doc, M, y, pdfLatinize("Sikayetler (" + String((packC.items || []).length) + ")"));
      var head = [
        [
          pdfLatinize("Zaman"),
          pdfLatinize("Oda"),
          pdfLatinize("Misafir"),
          pdfLatinize("Kategori"),
          pdfLatinize("Detay"),
          pdfLatinize("Durum"),
        ],
      ];
      var p1 = buildRowsForTable(packC.items, "complaint");
      y = autoTableBlock(doc, M, pageW, pageH, y, head, p1.body, p1.buckets);
      if (y > pageH - 120) {
        doc.addPage();
        y = M + 10;
      }

      y = drawSectionTitle(doc, M, y, pdfLatinize("Misafir bildirimleri (" + String((packG.items || []).length) + ")"));
      var p2 = buildRowsForTable(packG.items, "guest_notification");
      y = autoTableBlock(doc, M, pageW, pageH, y, head, p2.body, p2.buckets);
      if (y > pageH - 120) {
        doc.addPage();
        y = M + 10;
      }

      y = drawSectionTitle(doc, M, y, pdfLatinize("Gec cikis (" + String((packL.items || []).length) + ")"));
      var p3 = buildRowsForTable(packL.items, "late_checkout");
      autoTableBlock(doc, M, pageW, pageH, y, head, p3.body, p3.buckets);

      var trunc = packC.truncated || packG.truncated || packL.truncated;
      if (trunc) {
        var fy =
          doc.lastAutoTable && typeof doc.lastAutoTable.finalY === "number"
            ? doc.lastAutoTable.finalY + 16
            : pageH - 48;
        if (fy > pageH - 28) {
          doc.addPage();
          fy = 40;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text(
          pdfLatinize("Not: Sayfa limiti nedeniyle bazi listeler kesilmis olabilir; tam liste icin panelden filtre ile kontrol edin."),
          M,
          fy,
          { maxWidth: contentW },
        );
      }
      doc.save("Viona-Operasyon-OnBurol_" + ymd + ".pdf");
      return;
    }

    throw new Error("unknown_variant");
    } finally {
      download._vionaPdfBusy = false;
    }
  }

  window.VionaOpsDayPdf = { download: download };
})();
