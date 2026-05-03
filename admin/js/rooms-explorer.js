/**
 * Admin «Odalar» — blok / kat grid (vionaEnumerateHotelRoomsMeta ile).
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function enumerateRooms() {
    if (typeof global.vionaEnumerateHotelRoomsMeta === "function") {
      return global.vionaEnumerateHotelRoomsMeta();
    }
    return [];
  }

  function countByBlock(rooms) {
    var c = { A: 0, B: 0, C: 0 };
    (rooms || []).forEach(function (r) {
      var L = r && r.blockLetter;
      if (L && c[L] != null) c[L]++;
    });
    return c;
  }

  function groupBlockFloor(rooms) {
    var by = { A: {}, B: {}, C: {} };
    (rooms || []).forEach(function (r) {
      var L = r.blockLetter;
      if (!by[L]) return;
      var fk = String(r.floorDigit);
      if (!by[L][fk]) by[L][fk] = [];
      by[L][fk].push(r);
    });
    ["A", "B", "C"].forEach(function (L) {
      var floors = by[L];
      Object.keys(floors).forEach(function (fk) {
        floors[fk].sort(function (a, b) {
          return a.sortKey - b.sortKey;
        });
      });
    });
    return by;
  }

  function floorSortKeys(floorKeys) {
    return floorKeys
      .map(function (k) {
        return parseInt(k, 10);
      })
      .filter(function (n) {
        return Number.isFinite(n);
      })
      .sort(function (a, b) {
        return a - b;
      })
      .map(String);
  }

  function renderSummaryHtml(rooms) {
    var n = rooms.length;
    var c = countByBlock(rooms);
    return (
      '<div class="rooms-summary glass-block">' +
      '<p class="rooms-summary__line"><strong>' +
      esc(n) +
      "</strong> oda · Blok A: <strong>" +
      esc(c.A) +
      "</strong> · Blok B: <strong>" +
      esc(c.B) +
      "</strong> · Blok C: <strong>" +
      esc(c.C) +
      "</strong></p>" +
      '<p class="rooms-summary__hint">Haritada bir odaya tıklayın; yalnızca HK istekleri ve teknik arızalar listelenir.</p>' +
      "</div>"
    );
  }

  function renderBlockFilterHtml() {
    return (
      '<div class="rooms-block-filter" role="group" aria-label="Blok süzgeci">' +
      '<span class="rooms-block-filter__lbl">Blok</span>' +
      '<button type="button" class="rooms-block-filter__btn is-active" data-room-block-filter="all">Tümü</button>' +
      '<button type="button" class="rooms-block-filter__btn" data-room-block-filter="A">A</button>' +
      '<button type="button" class="rooms-block-filter__btn" data-room-block-filter="B">B</button>' +
      '<button type="button" class="rooms-block-filter__btn" data-room-block-filter="C">C</button>' +
      "</div>"
    );
  }

  function renderGridHtml(rooms, activeBlock) {
    var by = groupBlockFloor(rooms);
    var blocks = activeBlock === "all" ? ["A", "B", "C"] : [activeBlock];
    var parts = [];
    blocks.forEach(function (L) {
      var floorsObj = by[L] || {};
      var fKeys = floorSortKeys(Object.keys(floorsObj));
      if (!fKeys.length) return;
      parts.push('<section class="rooms-block glass-block" data-rooms-block="' + esc(L) + '">');
      parts.push('<h3 class="rooms-block__title">Blok ' + esc(L) + "</h3>");
      fKeys.forEach(function (fk) {
        var list = floorsObj[fk] || [];
        if (!list.length) return;
        var floorLabel = list[0].floorLabel || "Kat " + fk;
        parts.push('<div class="rooms-floor" data-floor="' + esc(fk) + '">');
        parts.push('<h4 class="rooms-floor__title">' + esc(floorLabel) + "</h4>");
        parts.push('<div class="rooms-floor__grid" role="list">');
        list.forEach(function (r) {
          parts.push(
            '<button type="button" class="rooms-cell" data-room="' +
              esc(r.number) +
              '" title="' +
              esc(r.blockLabel + " · " + r.floorLabel + " · Oda " + r.number) +
              '">' +
              esc(r.number) +
              "</button>",
          );
        });
        parts.push("</div></div>");
      });
      parts.push("</section>");
    });
    return parts.join("");
  }

  /**
   * @param {HTMLElement} mount
   * @param {{ onPickRoom?: function(Object): void }} options
   */
  function renderGrid(mount, options) {
    if (!mount) return;
    var opts = options || {};
    var onPick = typeof opts.onPickRoom === "function" ? opts.onPickRoom : function () {};
    var rooms = enumerateRooms();
    if (!rooms.length) {
      mount.innerHTML =
        '<p class="admin-load-error">Oda listesi yüklenemedi. <code>hotel-room-numbers.js</code> ve sayfa sırasını kontrol edin.</p>';
      return;
    }

    var activeBlock = "all";
    function paint() {
      mount.innerHTML =
        renderSummaryHtml(rooms) +
        renderBlockFilterHtml() +
        '<div class="rooms-grid-host">' +
        renderGridHtml(rooms, activeBlock) +
        "</div>";
      mount.querySelectorAll("[data-room-block-filter]").forEach(function (b) {
        b.classList.toggle("is-active", (b.getAttribute("data-room-block-filter") || "") === activeBlock);
      });
    }

    paint();

    mount.addEventListener(
      "click",
      function (e) {
        var bf = e.target && e.target.closest ? e.target.closest("[data-room-block-filter]") : null;
        if (bf) {
          var v = String(bf.getAttribute("data-room-block-filter") || "all");
          activeBlock = v === "A" || v === "B" || v === "C" ? v : "all";
          var host = mount.querySelector(".rooms-grid-host");
          if (host) host.innerHTML = renderGridHtml(rooms, activeBlock);
          mount.querySelectorAll("[data-room-block-filter]").forEach(function (b) {
            b.classList.toggle("is-active", (b.getAttribute("data-room-block-filter") || "") === activeBlock);
          });
          return;
        }
        var cell = e.target && e.target.closest ? e.target.closest("[data-room]") : null;
        if (!cell) return;
        var num = String(cell.getAttribute("data-room") || "").trim();
        if (!num) return;
        var meta =
          typeof global.vionaParseRoomLayout === "function" ? global.vionaParseRoomLayout(num) : { number: num };
        if (meta) onPick(meta);
      },
      false,
    );
  }

  global.RoomsExplorer = {
    renderGrid: renderGrid,
    enumerateRooms: enumerateRooms,
  };
})(typeof window !== "undefined" ? window : globalThis);
