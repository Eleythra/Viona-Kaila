/**
 * Operasyon sekmeleri — seçilen takvim günü için özet PDF (jsPDF + autotable).
 * Gün filtresi: adapter.getBucketMergeAll(type, maxPages, { from, to }).
 */
(function () {
  "use strict";

  var MERGE_MAX_PAGES = 40;
  var PDF_FONT_FAMILY = "DejaVuSans";
  var DEJAVU_URL = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf";
  var DEJAVU_BOLD_URL = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf";
  var _gPdfUtf8 = false;
  var _dejavuNormalB64 = "";
  var _dejavuBoldB64 = "";

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

  function uint8ToBinaryString(u8) {
    var CHUNK = 0x8000;
    var out = [];
    for (var i = 0; i < u8.length; i += CHUNK) {
      out.push(String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + CHUNK, u8.length))));
    }
    return out.join("");
  }

  async function ensurePdfUnicodeFont(doc) {
    if (doc.__vionaPdfFontOk) {
      _gPdfUtf8 = true;
      return true;
    }
    try {
      if (!_dejavuNormalB64) {
        var rb = await fetch(DEJAVU_URL, { mode: "cors", cache: "force-cache" });
        if (!rb.ok) throw new Error("font_fetch");
        _dejavuNormalB64 = btoa(uint8ToBinaryString(new Uint8Array(await rb.arrayBuffer())));
      }
      doc.addFileToVFS("DejaVuSans.ttf", _dejavuNormalB64);
      doc.addFont("DejaVuSans.ttf", PDF_FONT_FAMILY, "normal");
      if (!_dejavuBoldB64) {
        try {
          var rb2 = await fetch(DEJAVU_BOLD_URL, { mode: "cors", cache: "force-cache" });
          if (rb2.ok) {
            _dejavuBoldB64 = btoa(uint8ToBinaryString(new Uint8Array(await rb2.arrayBuffer())));
          }
        } catch (_e2) {}
      }
      if (_dejavuBoldB64) {
        doc.addFileToVFS("DejaVuSans-Bold.ttf", _dejavuBoldB64);
        doc.addFont("DejaVuSans-Bold.ttf", PDF_FONT_FAMILY, "bold");
      }
      doc.__vionaPdfFontOk = true;
      _gPdfUtf8 = true;
      doc.setFont(PDF_FONT_FAMILY, "normal");
      return true;
    } catch (_e) {
      _gPdfUtf8 = false;
      return false;
    }
  }

  function pdfText(s) {
    return _gPdfUtf8 ? String(s == null ? "" : s) : pdfLatinize(s);
  }

  function activePdfFont() {
    return _gPdfUtf8 ? PDF_FONT_FAMILY : "helvetica";
  }

  function setPdfFont(doc, style) {
    doc.setFont(activePdfFont(), style || "normal");
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
    var boxH = 38;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, contentW, boxH, 4, 4, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(M, y, contentW, boxH, 4, 4, "S");
    var items = [
      { b: "bekliyor", l: "Bekleyen" },
      { b: "yapiliyor", l: "İşlemde" },
      { b: "yapildi", l: "Tamamlandı" },
      { b: "yapilmadi", l: "Olumsuz" },
      { b: "iptal", l: "İptal" },
    ];
    var slot = Math.min(118, (contentW - 16) / items.length);
    var x0 = M + 8;
    var pill = 8;
    setPdfFont(doc, "normal");
    doc.setFontSize(6.6);
    items.forEach(function (it, i) {
      var x = x0 + i * slot;
      var st = statusPillStyle(it.b);
      doc.setFillColor(st.fill[0], st.fill[1], st.fill[2]);
      doc.roundedRect(x, y + 10, pill, pill, 2, 2, "F");
      doc.setTextColor(51, 65, 85);
      doc.text(pdfText(it.l), x + pill + 3, y + 18, { maxWidth: slot - pill - 6 });
    });
    return y + boxH + 10;
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
    /* Yatay: operasyon tabloları 8–10 sütun; dikeyde taşma/kayma riski yüksek. */
    var doc = new DocCtor({ orientation: "landscape", unit: "pt", format: "a4" });
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

  /** PDF tablosu: gg.aa.yyyy ss:dd */
  function formatSubmittedPdfTr(iso) {
    var s = String(iso || "");
    if (!s) return "-";
    var d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      var dd = String(d.getDate()).padStart(2, "0");
      var mm = String(d.getMonth() + 1).padStart(2, "0");
      var yyyy = String(d.getFullYear());
      var hh = String(d.getHours()).padStart(2, "0");
      var mi = String(d.getMinutes()).padStart(2, "0");
      return dd + "." + mm + "." + yyyy + " " + hh + ":" + mi;
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

  function statusLabelPdf(row, type) {
    var st = normAdminIssueStatus(row);
    if (type === "complaint" || type === "guest_notification") {
      if (st === "done") return pdfText("Dikkate alındı");
      if (st === "rejected") return pdfText("Dikkate alınmadı");
      if (st === "in_progress") return pdfText("İşlemde");
      if (st === "new" || st === "pending") return pdfText("Bekliyor");
      if (st === "cancelled") return pdfText("İptal");
      return pdfText(st);
    }
    if (type === "late_checkout") {
      if (st === "done") return pdfText("Onaylandı");
      if (st === "rejected") return pdfText("Onaylanmadı");
      if (st === "in_progress") return pdfText("İşlemde");
      if (st === "new" || st === "pending") return pdfText("Bekliyor");
      if (st === "cancelled") return pdfText("İptal");
      return pdfText(st);
    }
    if (st === "done") return pdfText("Yapıldı");
    if (st === "rejected") return pdfText("Yapılmadı");
    if (st === "in_progress") return pdfText("Yapılıyor");
    if (st === "new" || st === "pending") return pdfText("Bekliyor");
    if (st === "cancelled") return pdfText("İptal");
    return pdfText(st);
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
    setPdfFont(doc, "bold");
    doc.setFontSize(18);
    doc.text(pdfText(title), M, 36);
    setPdfFont(doc, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 212, 235);
    doc.text(pdfText(subtitle), M, 54, { maxWidth: pageW - 2 * M });
    if (reportDayYmd && /^\d{4}-\d{2}-\d{2}$/.test(reportDayYmd)) {
      var p = reportDayYmd.split("-");
      var disp = p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : reportDayYmd;
      setPdfFont(doc, "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 248, 220);
      doc.text(pdfText("Rapor günü: ") + disp, M, 72);
    }
    doc.setTextColor(28, 38, 52);
    return 98;
  }

  function drawStatCards(doc, M, y, counts, contentW) {
    var items = [
      { k: "bekliyor", l: "Bekleyen", rgb: [245, 158, 11] },
      { k: "yapiliyor", l: "İşlemde", rgb: [59, 130, 246] },
      { k: "yapildi", l: "Tamamlandı", rgb: [34, 197, 94] },
      { k: "yapilmadi", l: "Olumsuz", rgb: [239, 68, 68] },
      { k: "iptal", l: "İptal", rgb: [100, 116, 139] },
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
      setPdfFont(doc, "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(String(counts[it.k] != null ? counts[it.k] : 0), x + w / 2, y + 28, { align: "center" });
      setPdfFont(doc, "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(pdfText(it.l), x + w / 2, y + 44, { align: "center", maxWidth: w - 6 });
    });
    return y + h + 16;
  }

  function drawSectionTitle(doc, M, y, text) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(M, y, doc.internal.pageSize.getWidth() - 2 * M, 22, 4, 4, "F");
    setPdfFont(doc, "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(pdfText(text), M + 10, y + 14);
    return y + 30;
  }

  function pdfSummaryCellFallback(row, type) {
    var oz = "";
    try {
      if (window.AdminUI && typeof window.AdminUI.operationSummaryForType === "function") {
        oz = String(window.AdminUI.operationSummaryForType(type, row) || "").trim();
      }
    } catch (_e) {}
    if (!oz) {
      var d = String(row.description || row.note || "").replace(/\s+/g, " ").trim();
      var c = String(row.category || "").trim();
      if (!c && row.categories && row.categories.length) c = String(row.categories[0] || "").trim();
      oz = [c, d].filter(Boolean).join(" — ") || "-";
    }
    if (oz.length > 260) oz = oz.slice(0, 257) + "…";
    return pdfText(oz);
  }

  function clampPdfCellText(s, maxLen) {
    var t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    var m = typeof maxLen === "number" && maxLen > 8 ? maxLen : 380;
    if (t.length <= m) return t;
    return t.slice(0, m - 1) + "…";
  }

  function buildRowsForTable(rows, type) {
    var body = [];
    var buckets = [];
    var ui = window.AdminUI;
    var useUi =
      ui &&
      typeof ui.operationPdfTableHeaders === "function" &&
      typeof ui.operationPdfRowCells === "function";
    var labels = useUi ? ui.operationPdfTableHeaders(type) : ["Tarih", "Oda", "Misafir", "Özet", "Durum"];
    var head = [labels.map(function (h) {
      return pdfText(h);
    })];
    var statusColIndex = labels.length > 0 ? labels.length - 1 : 0;
    (rows || []).forEach(function (r) {
      buckets.push(rowStatusBucket(r));
      if (useUi) {
        var rawCells = ui.operationPdfRowCells(type, r) || [];
        var rowOut = [];
        for (var ci = 0; ci < labels.length; ci++) {
          var v = ci < rawCells.length ? rawCells[ci] : "—";
          var maxC = ci === statusColIndex ? 40 : 1800;
          rowOut.push(pdfText(clampPdfCellText(v, maxC)));
        }
        body.push(rowOut);
      } else {
        body.push([
          pdfText(formatSubmittedPdfTr(r.submitted_at)),
          pdfText(String(r.room_number || "-")),
          pdfText(operationGuestName(r) || "-"),
          pdfSummaryCellFallback(r, type),
          statusLabelPdf(r, type),
        ]);
      }
    });
    if (!useUi) {
      statusColIndex = 4;
    }
    return { body: body, buckets: buckets, head: head, statusColIndex: statusColIndex };
  }

  /** Sabit + bir “auto” geniş sütun; toplam ≈ iç genişlik → taşma/kayma azalır. */
  function operationPdfColumnStyles(ncol, innerW) {
    innerW = Math.max(480, innerW);
    function mk(base, autoIdx) {
      var fixed = 0;
      var i;
      for (i = 0; i < base.length; i++) {
        if (i !== autoIdx) fixed += base[i];
      }
      var autoW = Math.max(96, innerW - fixed - 8);
      var out = {};
      for (i = 0; i < base.length; i++) {
        var w = i === autoIdx ? autoW : base[i];
        out[i] = { cellWidth: w, valign: "middle" };
      }
      return out;
    }
    if (ncol === 10) {
      var b10 = [76, 34, 74, 30, 76, 76, 28, 0, 84, 58];
      var cs10 = mk(b10, 7);
      cs10[1].halign = "center";
      cs10[6].halign = "center";
      cs10[9].halign = "center";
      return cs10;
    }
    if (ncol === 9) {
      var b9 = [72, 52, 40, 34, 72, 28, 0, 86, 58];
      var cs9 = mk(b9, 6);
      cs9[2].halign = "center";
      cs9[5].halign = "center";
      cs9[8].halign = "center";
      return cs9;
    }
    if (ncol === 8) {
      var b8 = [74, 34, 74, 30, 88, 0, 90, 58];
      var cs8 = mk(b8, 5);
      cs8[3].halign = "center";
      cs8[7].halign = "center";
      return cs8;
    }
    return null;
  }

  function autoTableBlock(doc, M, pageW, pageH, startY, head, body, buckets, tableOpts) {
    if (!body.length) {
      setPdfFont(doc, "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfText("Bu gün için kayıt bulunmuyor."), M, startY + 8);
      return startY + 28;
    }
    var tOpts = tableOpts || {};
    var ncol = head && head[0] && head[0].length ? head[0].length : 1;
    var statusIdx =
      typeof tOpts.statusColIndex === "number" && tOpts.statusColIndex >= 0 && tOpts.statusColIndex < ncol
        ? tOpts.statusColIndex
        : ncol - 1;
    var innerW = pageW - 2 * M;
    var fs = ncol >= 9 ? 7 : ncol >= 7 ? 7.2 : 8;
    var colStyles = operationPdfColumnStyles(ncol, innerW);
    var atOpts = {
      startY: startY,
      head: head,
      body: body,
      theme: "grid",
      tableWidth: innerW,
      styles: {
        font: activePdfFont(),
        fontSize: fs,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
        overflow: "linebreak",
        valign: "middle",
        textColor: [30, 41, 59],
        lineColor: [203, 213, 225],
        lineWidth: 0.28,
      },
      headStyles: {
        font: activePdfFont(),
        fillColor: [30, 64, 110],
        textColor: [248, 250, 252],
        fontStyle: "bold",
        fontSize: Math.min(7.8, fs + 0.35),
        halign: "left",
        valign: "middle",
        overflow: "linebreak",
      },
      bodyStyles: { minCellHeight: Math.max(12, fs + 7), textColor: [30, 41, 59] },
      margin: { left: M, right: M },
      didParseCell: function (data) {
        if (data.section === "head") {
          data.cell.styles.overflow = "linebreak";
          data.cell.styles.minCellHeight = 16;
          return;
        }
        if (data.section !== "body" || !buckets || data.row == null) return;
        var ri = typeof data.row.index === "number" ? data.row.index : -1;
        if (ri < 0 || ri >= buckets.length) return;
        var bucket = buckets[ri];
        if (typeof data.column.index !== "number") return;
        if (data.column.index === statusIdx) {
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
        setPdfFont(doc, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        var foot = pdfText("Viona · Kaila Beach Hotel  |  Oluşturma: " + formatSubmittedPdfTr(new Date().toISOString()));
        doc.text(foot, M, pageH - 20);
        doc.text(pdfText("Sayfa ") + data.pageNumber, pageW - M, pageH - 20, { align: "right" });
      },
    };
    if (colStyles) {
      atOpts.columnStyles = colStyles;
    }
    doc.autoTable(atOpts);
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

  async function fetchDay(adapter, type, ymd, mergeListQuery) {
    var base = { from: ymd, to: ymd };
    if (typeof mergeListQuery === "function") {
      try {
        var extra = mergeListQuery(type, ymd);
        if (extra && typeof extra === "object") {
          Object.keys(extra).forEach(function (k) {
            var v = extra[k];
            if (v == null || v === "") return;
            if (k === "from" || k === "to") return;
            base[k] = v;
          });
        }
      } catch (_e) {}
    }
    var raw = await adapter.getBucketMergeAll(type, MERGE_MAX_PAGES, base);
    return { items: dedupeRowsById(raw.items), truncated: Boolean(raw.truncated) };
  }

  function oneSectionPdf(doc, variantTitle, typeTitle, ymd, rows, type) {
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var M = 36;
    var contentW = pageW - 2 * M;
    var p = String(ymd || "").split("-");
    var ymdDisp = p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : ymd;
    var sub =
      pdfText("Operasyon günü (İstanbul takvimi): ") +
      ymdDisp +
      pdfText("  |  Kayıt sayısı: ") +
      String((rows || []).length);
    var y0 = drawPremiumHeader(doc, M, pageW, typeTitle, sub + " · " + variantTitle, ymd);
    var k = countOpsKanbanStatus(rows);
    var y1 = drawStatCards(doc, M, y0, k, contentW);
    y1 = drawStatusLegend(doc, M, y1, contentW);
    if (k.diger > 0) {
      setPdfFont(doc, "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfText("Not: ") + String(k.diger) + pdfText(" kayıt standart dışı durum kodunda."), M, y1);
      y1 += 12;
    }
    setPdfFont(doc, "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(
      pdfText(
        "Tablo, admin panelindeki liste ile aynı sütunlardır (İşlemler yok). Sayfa yatay A4; Türkçe için DejaVu yüklenir. Satır zemini durum grubunu, son sütun renkli rozet gösterir.",
      ),
      M,
      y1,
      { maxWidth: contentW },
    );
    y1 += 22;
    var pack = buildRowsForTable(rows, type);
    return autoTableBlock(doc, M, pageW, pageH, y1, pack.head, pack.body, pack.buckets, {
      statusColIndex: pack.statusColIndex,
    });
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
    var mergeListQuery = opts && opts.mergeListQuery;
    if (!adapter || typeof adapter.getBucketMergeAll !== "function") {
      throw new Error("adapter_missing");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      throw new Error("invalid_date");
    }
    var doc = createPdfDocument();
    _gPdfUtf8 = false;
    await ensurePdfUnicodeFont(doc);
    if (!_gPdfUtf8) {
      doc.setFont("helvetica", "normal");
    }

    if (variant === "hk") {
      var packHk = await fetchDay(adapter, "request", ymd, mergeListQuery);
      oneSectionPdf(doc, pdfText("HK operasyon"), pdfText("Günlük HK talep raporu"), ymd, packHk.items || [], "request");
      if (packHk.truncated) {
        var ph = doc.internal.pageSize.getHeight();
        var pw = doc.internal.pageSize.getWidth();
        var fy =
          doc.lastAutoTable && typeof doc.lastAutoTable.finalY === "number" ? doc.lastAutoTable.finalY + 14 : ph - 40;
        if (fy > ph - 24) {
          doc.addPage();
          fy = 36;
        }
        setPdfFont(doc, "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text(
          pdfText("Not: Sayfa limiti nedeniyle liste kesilmiş olabilir; tam liste için panelden kontrol edin."),
          36,
          fy,
          { maxWidth: pw - 72 },
        );
      }
      doc.save("Viona-Operasyon-HK_" + ymd + ".pdf");
      return;
    }

    if (variant === "tech") {
      var packT = await fetchDay(adapter, "fault", ymd, mergeListQuery);
      oneSectionPdf(doc, pdfText("Teknik operasyon"), pdfText("Günlük arıza raporu"), ymd, packT.items || [], "fault");
      if (packT.truncated) {
        var ph2 = doc.internal.pageSize.getHeight();
        var pw2 = doc.internal.pageSize.getWidth();
        var fy2 =
          doc.lastAutoTable && typeof doc.lastAutoTable.finalY === "number" ? doc.lastAutoTable.finalY + 14 : ph2 - 40;
        if (fy2 > ph2 - 24) {
          doc.addPage();
          fy2 = 36;
        }
        setPdfFont(doc, "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text(
          pdfText("Not: Sayfa limiti nedeniyle liste kesilmiş olabilir; tam liste için panelden kontrol edin."),
          36,
          fy2,
          { maxWidth: pw2 - 72 },
        );
      }
      doc.save("Viona-Operasyon-Teknik_" + ymd + ".pdf");
      return;
    }

    if (variant === "front") {
      var packC = await fetchDay(adapter, "complaint", ymd, mergeListQuery);
      var packG = await fetchDay(adapter, "guest_notification", ymd, mergeListQuery);
      var packL = await fetchDay(adapter, "late_checkout", ymd, mergeListQuery);
      var pageW = doc.internal.pageSize.getWidth();
      var pageH = doc.internal.pageSize.getHeight();
      var M = 36;
      var contentW = pageW - 2 * M;
      var total = (packC.items || []).length + (packG.items || []).length + (packL.items || []).length;
      var pd = String(ymd || "").split("-");
      var ymdDispF = pd.length === 3 ? pd[2] + "." + pd[1] + "." + pd[0] : ymd;
      var sub =
        pdfText("Operasyon günü: ") +
        ymdDispF +
        pdfText("  |  Toplam kayıt: ") +
        String(total);
      var y = drawPremiumHeader(
        doc,
        M,
        pageW,
        pdfText("Günlük ön büro operasyon raporu"),
        sub + pdfText(" · Şikâyet, misafir bildirimi, geç çıkış"),
        ymd,
      );
      var allRows = (packC.items || []).concat(packG.items || []).concat(packL.items || []);
      var kAll = countOpsKanbanStatus(allRows);
      y = drawStatCards(doc, M, y, kAll, contentW);
      y = drawStatusLegend(doc, M, y, contentW);
      if (kAll.diger > 0) {
        setPdfFont(doc, "italic");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(pdfText("Not: ") + String(kAll.diger) + pdfText(" kayıt standart dışı durum kodunda."), M, y);
        y += 12;
      }
      setPdfFont(doc, "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(
        pdfText(
          "Üç bölüm ayrı tablodur (şikâyet / misafir bildirimi / geç çıkış). Yatay A4, sütunlar panel ile aynı; Türkçe için DejaVu yüklenir.",
        ),
        M,
        y,
        { maxWidth: contentW },
      );
      y += 22;

      y = drawSectionTitle(doc, M, y, pdfText("Şikâyetler (" + String((packC.items || []).length) + ")"));
      var p1 = buildRowsForTable(packC.items, "complaint");
      y = autoTableBlock(doc, M, pageW, pageH, y, p1.head, p1.body, p1.buckets, { statusColIndex: p1.statusColIndex });
      if (y > pageH - 120) {
        doc.addPage();
        y = M + 10;
      }

      y = drawSectionTitle(doc, M, y, pdfText("Misafir bildirimleri (" + String((packG.items || []).length) + ")"));
      var p2 = buildRowsForTable(packG.items, "guest_notification");
      y = autoTableBlock(doc, M, pageW, pageH, y, p2.head, p2.body, p2.buckets, { statusColIndex: p2.statusColIndex });
      if (y > pageH - 120) {
        doc.addPage();
        y = M + 10;
      }

      y = drawSectionTitle(doc, M, y, pdfText("Geç çıkış (" + String((packL.items || []).length) + ")"));
      var p3 = buildRowsForTable(packL.items, "late_checkout");
      autoTableBlock(doc, M, pageW, pageH, y, p3.head, p3.body, p3.buckets, { statusColIndex: p3.statusColIndex });

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
        setPdfFont(doc, "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9);
        doc.text(
          pdfText("Not: Sayfa limiti nedeniyle bazı listeler kesilmiş olabilir; tam liste için panelden filtre ile kontrol edin."),
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
      _gPdfUtf8 = false;
    }
  }

  window.VionaOpsDayPdf = { download: download };
})();
