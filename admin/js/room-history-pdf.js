/**
 * Oda HK / arıza geçmişi — istemci PDF (jsPDF + autotable, UTF-8 için DejaVu).
 */
(function (global) {
  "use strict";

  var PDF_FONT_FAMILY = "DejaVuSans";
  var DEJAVU_URL = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf";
  var _gPdfUtf8 = false;
  var _dejavuNormalB64 = "";

  function uint8ToBinaryString(u8) {
    var CHUNK = 0x8000;
    var out = [];
    for (var i = 0; i < u8.length; i += CHUNK) {
      out.push(String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + CHUNK, u8.length))));
    }
    return out.join("");
  }

  async function ensurePdfUnicodeFont(doc) {
    if (doc.__vionaRoomPdfFontOk) {
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
      doc.__vionaRoomPdfFontOk = true;
      _gPdfUtf8 = true;
      doc.setFont(PDF_FONT_FAMILY, "normal");
      return true;
    } catch (_e) {
      _gPdfUtf8 = false;
      return false;
    }
  }

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

  function pdfText(s) {
    return _gPdfUtf8 ? String(s == null ? "" : s) : pdfLatinize(s);
  }

  function activePdfFont() {
    return _gPdfUtf8 ? PDF_FONT_FAMILY : "helvetica";
  }

  function createDoc() {
    var root = global.jspdf || (typeof window !== "undefined" ? window.jspdf : null);
    var DocCtor = null;
    if (root) {
      if (typeof root.jsPDF === "function") DocCtor = root.jsPDF;
      else if (root.default && typeof root.default === "function") DocCtor = root.default;
    }
    if (!DocCtor) throw new Error("jspdf_missing");
    var doc = new DocCtor({ orientation: "landscape", unit: "pt", format: "a4" });
    if (typeof doc.autoTable !== "function") throw new Error("autotable_missing");
    return doc;
  }

  function guestName(row) {
    if (!row || typeof row !== "object") return "";
    var g = String(row.guest_name || "").replace(/\s+/g, " ").trim();
    if (g) return g;
    var raw = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    return String(raw.name || raw.guest_name || "").replace(/\s+/g, " ").trim();
  }

  function statusTr(row) {
    var st = String((row && row.status) || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (st === "inprogress") st = "in_progress";
    if (st === "new" || st === "pending") return "Bekliyor";
    if (st === "in_progress") return "Yapılıyor";
    if (st === "done") return "Yapıldı";
    if (st === "rejected") return "Yapılmadı";
    if (st === "cancelled") return "İptal";
    return st || "—";
  }

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

  function summaryLine(type, row) {
    var d = String((row && row.description) || "").trim().replace(/\s+/g, " ");
    if (d.length > 140) d = d.slice(0, 137) + "…";
    if (type === "fault") {
      var c = String((row && row.category) || "").trim();
      if (c) return c + (d ? " — " + d : "");
    }
    return d || "—";
  }

  function bodyRows(type, rows) {
    return (rows || []).map(function (r) {
      return [
        pdfText(formatSubmittedPdfTr(r.submitted_at)),
        pdfText(type === "request" ? "İstek (HK)" : "Arıza"),
        pdfText(guestName(r) || "—"),
        pdfText(summaryLine(type, r)),
        pdfText(statusTr(r)),
      ];
    });
  }

  function triggerDownload(doc, fileName) {
    doc.save(fileName || "oda-gecmis.pdf");
  }

  /**
   * @param {{ room: string, blockLine?: string, type: string, rows: array, filterLine?: string }} opts
   */
  async function downloadCurrentPagePdf(opts) {
    var o = opts || {};
    var room = String(o.room || "").trim();
    var type = o.type === "fault" ? "fault" : "request";
    var rows = o.rows || [];
    var filterLine = String(o.filterLine || "").trim();
    var blockLine = String(o.blockLine || "").trim();
    var doc = createDoc();
    await ensurePdfUnicodeFont(doc);
    var pageW = doc.internal.pageSize.getWidth();
    var M = 40;
    doc.setFont(activePdfFont(), "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfText("Oda " + room + " — " + (type === "fault" ? "Arızalar" : "İstekler")), M, 42);
    doc.setFont(activePdfFont(), "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    var yMeta = 56;
    if (blockLine) {
      doc.text(pdfText(blockLine), M, yMeta, { maxWidth: pageW - 2 * M });
      yMeta += 14;
    }
    if (filterLine) {
      doc.text(pdfText("Süzgeç: " + filterLine), M, yMeta, { maxWidth: pageW - 2 * M });
      yMeta += 14;
    }
    doc.text(pdfText("Görünen sayfa (" + rows.length + " kayıt)"), M, yMeta);
    var startY = yMeta + 16;
    var head = [[pdfText("Tarih"), pdfText("Tür"), pdfText("Misafir"), pdfText("Özet"), pdfText("Durum")]];
    var body = bodyRows(type, rows);
    if (!body.length) {
      doc.setFont(activePdfFont(), "italic");
      doc.text(pdfText("Bu sayfada kayıt yok."), M, startY);
    } else {
      doc.autoTable({
        startY: startY,
        head: head,
        body: body,
        theme: "striped",
        styles: { font: activePdfFont(), fontSize: 7.5, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: {
          font: activePdfFont(),
          fillColor: [30, 64, 110],
          textColor: [248, 250, 252],
          fontStyle: "bold",
        },
        margin: { left: M, right: M },
        columnStyles: {
          0: { cellWidth: 92 },
          1: { cellWidth: 72 },
          2: { cellWidth: 100 },
          3: { cellWidth: 0 },
          4: { cellWidth: 72 },
        },
      });
    }
    var fn = "oda-" + room + "-" + type + "-sayfa.pdf";
    triggerDownload(doc, fn);
  }

  function drawTableSection(doc, M, startY, title, type, rows) {
    var pageW = doc.internal.pageSize.getWidth();
    doc.setFont(activePdfFont(), "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfText(title), M, startY);
    var y0 = startY + 14;
    var body = bodyRows(type, rows);
    if (!body.length) {
      doc.setFont(activePdfFont(), "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(pdfText("Kayıt yok."), M, y0);
      return y0 + 22;
    }
    doc.autoTable({
      startY: y0,
      head: [[pdfText("Tarih"), pdfText("Tür"), pdfText("Misafir"), pdfText("Özet"), pdfText("Durum")]],
      body: body,
      theme: "striped",
      styles: { font: activePdfFont(), fontSize: 7.2, cellPadding: 2.8, textColor: [30, 41, 59] },
      headStyles: {
        font: activePdfFont(),
        fillColor: [30, 64, 110],
        textColor: [248, 250, 252],
        fontStyle: "bold",
      },
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 88 },
        1: { cellWidth: 68 },
        2: { cellWidth: 96 },
        3: { cellWidth: 0 },
        4: { cellWidth: 68 },
      },
    });
    return doc.lastAutoTable.finalY + 18;
  }

  /**
   * @param {object} adapter — AdminDataAdapter
   * @param {{ room: string, baseQuery: object, scope: string, activeType: string, maxPages?: number, filterLine?: string, blockLine?: string }} opts
   */
  async function downloadMergedPdf(adapter, opts) {
    var o = opts || {};
    var room = String(o.room || "").trim();
    var base = o.baseQuery && typeof o.baseQuery === "object" ? o.baseQuery : {};
    var scope = String(o.scope || "segment").trim();
    var activeType = o.activeType === "fault" ? "fault" : "request";
    var maxPages = typeof o.maxPages === "number" && o.maxPages > 0 ? o.maxPages : 100;
    var filterLine = String(o.filterLine || "").trim();
    var blockLine = String(o.blockLine || "").trim();

    var doc = createDoc();
    await ensurePdfUnicodeFont(doc);
    var pageW = doc.internal.pageSize.getWidth();
    var M = 40;
    var y = 40;
    doc.setFont(activePdfFont(), "bold");
    doc.setFontSize(13);
    doc.text(pdfText("Oda " + room + " — birleşik geçmiş"), M, y);
    y += 18;
    doc.setFont(activePdfFont(), "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    if (blockLine) {
      doc.text(pdfText(blockLine), M, y, { maxWidth: pageW - 2 * M });
      y += 14;
    }
    if (filterLine) {
      doc.text(pdfText("Süzgeç: " + filterLine), M, y, { maxWidth: pageW - 2 * M });
      y += 14;
    }
    doc.text(pdfText("Kaynak: API birleşik liste · en fazla " + maxPages + " sayfa / tür"), M, y);
    y += 22;

    var notes = [];
    var pageH = doc.internal.pageSize.getHeight();
    var lastY = y;

    if (scope === "both") {
      var r1 = await adapter.getBucketMergeAll("request", maxPages, base);
      var r2 = await adapter.getBucketMergeAll("fault", maxPages, base);
      if (r1.truncated) notes.push("İstekler: sunucu sayfa üst sınırında kesildi.");
      if (r2.truncated) notes.push("Arızalar: sunucu sayfa üst sınırında kesildi.");
      lastY = drawTableSection(doc, M, lastY, "İstekler (HK)", "request", r1.items || []);
      if (lastY > pageH - 100) {
        doc.addPage();
        lastY = 40;
      }
      lastY = drawTableSection(doc, M, lastY, "Arızalar (Teknik)", "fault", r2.items || []);
    } else {
      var r = await adapter.getBucketMergeAll(activeType, maxPages, base);
      if (r.truncated) notes.push("Liste sunucu sayfa üst sınırında kesildi.");
      lastY = drawTableSection(
        doc,
        M,
        lastY,
        activeType === "fault" ? "Arızalar" : "İstekler",
        activeType,
        r.items || [],
      );
    }

    if (notes.length) {
      var ny = lastY + 10;
      if (ny > pageH - 36) {
        doc.addPage();
        ny = 40;
      }
      doc.setFont(activePdfFont(), "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text(pdfText(notes.join(" ")), M, ny, { maxWidth: pageW - 2 * M });
    }

    triggerDownload(doc, "oda-" + room + "-gecmis.pdf");
  }

  global.RoomHistoryPdf = {
    downloadCurrentPagePdf: downloadCurrentPagePdf,
    downloadMergedPdf: downloadMergedPdf,
  };
})(typeof window !== "undefined" ? window : globalThis);
