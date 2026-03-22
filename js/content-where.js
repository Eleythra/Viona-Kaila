/**
 * Neredeyim / Nasıl giderim — dikey harita; POI’ler yüzde koordinatla. İşaretçide sayı yok.
 * Edit modu: URL ?whereEdit=1 veya window.VIONA_WHERE_EDIT = true (sayfa yüklenmeden önce).
 */
(function () {
  "use strict";

  var MAP_COORDS = {
    "a-lobi": { left: 51.14, top: 50.77 },
    reception: { left: 45.42, top: 54.03 },
    "a-lobi-bar": { left: 50.97, top: 56.74 },
    "a-rooms": { left: 50.88, top: 53.76 },
    "a-astra": { left: 56.43, top: 53.62 },
    pool: { left: 51.5, top: 71.54 },
    "pool-bar": { left: 60.12, top: 74.87 },
    "gusto-snack-bar": { left: 61.18, top: 77.79 },
    shops: { left: 95.86, top: 57.16 },
    "main-restaurant": { left: 74.38, top: 66.54 },
    "a-la-carte": { left: 76.67, top: 80.15 },
    "mare-a-la-carte": { left: 76.67, top: 83.76 },
    "b-rooms": { left: 96.21, top: 67.51 },
    spa: { left: 87.76, top: 47.3 },
    "indoor-pool": { left: 81.07, top: 48.89 },
    fitness: { left: 89.35, top: 50.42 },
    "libum-cafe": { left: 79.31, top: 44.45 },
    "function-room": { left: 73.68, top: 50.63 },
    "c-rooms": { left: 65.58, top: 35 },
    "dolphin-a-la-carte": { left: 66.11, top: 39.59 },
    "dolphin-bar": { left: 65.76, top: 43.62 },
    "dolphin-pool": { left: 29.31, top: 40.21 },
    "car-park": { left: 93.57, top: 34.79 },
    playground: { left: 58.89, top: 22.71 },
    "show-area": { left: 43.93, top: 21.87 },
    aquapark: { left: 75.09, top: 9.09 },
    "kiddie-pool": { left: 90.4, top: 21.32 },
    "aqua-bar": { left: 48.68, top: 15.14 },
    underground: { left: 75.09, top: 88.07 },
    "beach-imbiss": { left: 31.51, top: 94.81 },
    "moss-bar": { left: 52.11, top: 93.21 },
  };

  var COORDS_STORAGE_KEY = "viona_where_map_coords";

  function applyStoredWhereCoords() {
    try {
      var raw = localStorage.getItem(COORDS_STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(function (k) {
        if (!MAP_COORDS[k] || !parsed[k]) return;
        var L = parsed[k].left;
        var T = parsed[k].top;
        if (typeof L === "number" && typeof T === "number") {
          MAP_COORDS[k].left = L;
          MAP_COORDS[k].top = T;
        }
      });
    } catch (e) {}
  }

  applyStoredWhereCoords();

  var POI_SLUGS = [
    "a-lobi",
    "reception",
    "a-lobi-bar",
    "a-rooms",
    "a-astra",
    "pool",
    "pool-bar",
    "gusto-snack-bar",
    "shops",
    "main-restaurant",
    "a-la-carte",
    "mare-a-la-carte",
    "b-rooms",
    "spa",
    "indoor-pool",
    "fitness",
    "libum-cafe",
    "function-room",
    "c-rooms",
    "dolphin-a-la-carte",
    "dolphin-bar",
    "dolphin-pool",
    "car-park",
    "playground",
    "show-area",
    "aquapark",
    "kiddie-pool",
    "aqua-bar",
    "underground",
    "beach-imbiss",
    "moss-bar",
  ];

  var POI_DATA = [
    {
      id: 1,
      title: "Resepsiyon",
      konum: "Giriş alanı",
      yon: "Otele girişte ön tarafta",
      desc: "Otelin karşılama ve giriş noktası",
    },
    {
      id: 2,
      title: "Lobi",
      konum: "Giriş katı",
      yon: "Resepsiyondan içeri doğru",
      desc: "Dinlenme ve bekleme alanı",
    },
    {
      id: 3,
      title: "Lobi Bar",
      konum: "Lobi alanı",
      yon: "Lobiden sağa doğru",
      desc: "İçecek servisi yapılan bar",
    },
    {
      id: 4,
      title: "Odalar (3101–3612)",
      konum: "Üst katlar",
      yon: "Lobiden yukarı çıkılarak",
      desc: "Konaklama odaları",
    },
    {
      id: 5,
      title: "Astra Toplantı & Etkinlik Salonu",
      konum: "Alt kat",
      yon: "Lobiden aşağı inerek",
      desc: "Toplantı ve organizasyon alanı",
    },
    {
      id: 6,
      title: "Havuz",
      konum: "Açık alan",
      yon: "Lobiden dışarı çıkınca",
      desc: "Ana yüzme havuzu",
    },
    {
      id: 7,
      title: "Havuz Bar",
      konum: "Havuz kenarı",
      yon: "Havuz çevresinde",
      desc: "İçecek servisi yapılan alan",
    },
    {
      id: 8,
      title: "Gusto Snack Bar",
      konum: "Havuz alanı",
      yon: "Havuzdan sağ tarafa doğru",
      desc: "Atıştırmalık yiyecek alanı",
    },
    {
      id: 9,
      title: "Mağazalar",
      konum: "Geçiş alanı",
      yon: "Havuzdan sağa doğru ilerlerken",
      desc: "Alışveriş noktaları",
    },
    {
      id: 10,
      title: "Ana Restoran",
      konum: "Teras alanı",
      yon: "Havuzdan sağa doğru",
      desc: "Açık büfe ana restoran",
    },
    {
      id: 11,
      title: "A’la Carte Restoran",
      konum: "Dış alan",
      yon: "Restorandan sağa doğru",
      desc: "Özel menü restoran",
    },
    {
      id: 12,
      title: "Mare A’la Carte Restoran",
      konum: "Dış sağ alan",
      yon: "İleri sağ tarafta",
      desc: "Deniz ürünleri restoranı",
    },
    {
      id: 13,
      title: "Odalar (1001–1638)",
      konum: "Üst katlar",
      yon: "Bina içinde yukarı",
      desc: "Konaklama odaları",
    },
    {
      id: 14,
      title: "Spa",
      konum: "Alt kat",
      yon: "Bina içinde aşağı",
      desc: "Spa ve wellness alanı",
    },
    {
      id: 15,
      title: "Kapalı Havuz",
      konum: "Spa alanı",
      yon: "Spa içinde",
      desc: "Kapalı yüzme havuzu",
    },
    {
      id: 16,
      title: "Fitness",
      konum: "Alt kat",
      yon: "Spa yakınında",
      desc: "Spor salonu",
    },
    {
      id: 17,
      title: "Libum Cafe",
      konum: "Üst seviye",
      yon: "Bina içinde üst katta",
      desc: "Kafe ve tatlı alanı",
    },
    {
      id: 18,
      title: "Fonksiyon Salonu",
      konum: "Bağlantı alanı",
      yon: "Üst kat geçiş bölümünde",
      desc: "Toplantı ve etkinlik alanı",
    },
    {
      id: 19,
      title: "Odalar (2101–2612)",
      konum: "C blok",
      yon: "Üst katlarda",
      desc: "Konaklama odaları",
    },
    {
      id: 20,
      title: "Dolphin A’la Carte",
      konum: "Dış alan",
      yon: "Bina ön tarafında",
      desc: "A’la carte restoran",
    },
    {
      id: 21,
      title: "Dolphin Bar / Jammies Mini Club",
      konum: "Açık alan",
      yon: "Havuz tarafında",
      desc: "Bar ve çocuk kulübü",
    },
    {
      id: 22,
      title: "Dolphin Havuzu",
      konum: "Açık alan",
      yon: "Bina önünde",
      desc: "Ek yüzme havuzu",
    },
    {
      id: 23,
      title: "Otopark",
      konum: "Dış alan",
      yon: "Arka tarafta",
      desc: "Araç park alanı",
    },
    {
      id: 24,
      title: "Çocuk Oyun Alanı",
      konum: "Açık alan",
      yon: "Arka bölgede",
      desc: "Çocuklar için oyun alanı",
    },
    {
      id: 25,
      title: "Gösteri Alanı",
      konum: "Açık alan",
      yon: "Orta bölgede",
      desc: "Etkinlik ve gösteri alanı",
    },
    {
      id: 26,
      title: "Aquapark",
      konum: "Arka alan",
      yon: "Sol üst bölgede",
      desc: "Su kaydırakları alanı",
    },
    {
      id: 27,
      title: "Çocuk Havuzu",
      konum: "Aquapark yanında",
      yon: "Sağ tarafında",
      desc: "Çocuklara özel havuz",
    },
    {
      id: 28,
      title: "Aqua Bar",
      konum: "Aquapark içinde",
      yon: "Merkezde",
      desc: "İçecek servisi yapılan alan",
    },
    {
      id: 29,
      title: "Alt Geçit",
      konum: "Sahil geçişi",
      yon: "Havuzdan sahile doğru",
      desc: "Plaja ulaşım yolu",
    },
    {
      id: 30,
      title: "Sahil Büfesi",
      konum: "Sahil",
      yon: "Sağ tarafta",
      desc: "Atıştırmalık yiyecek alanı",
    },
    {
      id: 31,
      title: "Moss Bar",
      konum: "Sahil",
      yon: "Orta bölgede",
      desc: "Beach bar ve restoran",
    },
  ];

  function buildWhereMapPois() {
    return POI_SLUGS.map(function (slug, i) {
      var d = POI_DATA[i];
      var c = MAP_COORDS[slug];
      if (!c || !d) return null;
      return {
        id: slug,
        left: c.left,
        top: c.top,
        title: d.title,
        konum: d.konum,
        yon: d.yon,
        desc: d.desc,
      };
    }).filter(Boolean);
  }

  function reapplyPoisFromMapCoords() {
    var pois = window.WHERE_MAP_DATA && window.WHERE_MAP_DATA.pois;
    if (!pois) return;
    for (var i = 0; i < pois.length; i++) {
      var poi = pois[i];
      var c = MAP_COORDS[poi.id];
      if (c) {
        poi.left = c.left;
        poi.top = c.top;
      }
    }
  }

  window.WHERE_MAP_DATA = {
    imageSrc: "assets/images/kaila-beach-map-vertical.jpg",
    pois: buildWhereMapPois(),
  };

  function isWhereEditMode() {
    try {
      if (typeof window !== "undefined" && window.VIONA_WHERE_EDIT === true) return true;
      return /(?:\?|&)whereEdit=1(?:&|$)/.test(String(window.location.search || ""));
    } catch (e) {
      return false;
    }
  }

  function snapshotMapCoordsJson() {
    var o = {};
    POI_SLUGS.forEach(function (slug) {
      var c = MAP_COORDS[slug];
      if (c) o[slug] = { left: c.left, top: c.top };
    });
    return JSON.stringify(o, null, 2);
  }

  function persistWhereCoordsToStorage() {
    try {
      localStorage.setItem(COORDS_STORAGE_KEY, snapshotMapCoordsJson());
    } catch (e) {}
  }

  function renderWhereModule(container, t) {
    var data = window.WHERE_MAP_DATA;
    if (!data || !data.pois.length) return;

    var editMode = isWhereEditMode();
    var wrap = document.createElement("div");
    wrap.className = "where-module" + (editMode ? " where-module--edit" : "");

    var mapView = document.createElement("div");
    mapView.className = "where-map-view";
    mapView.setAttribute("aria-label", t("whereMapViewLabel"));

    var zoom = document.createElement("div");
    zoom.className = "where-map-zoom";

    var stage = document.createElement("div");
    stage.className = "where-map-stage";

    var img = document.createElement("img");
    img.className = "where-map-img";
    img.src = data.imageSrc;
    img.alt = "Kaila Beach Hotel — resort map";
    img.decoding = "async";
    img.loading = "eager";
    img.draggable = false;
    img.setAttribute("role", "presentation");

    var layer = document.createElement("div");
    layer.className = "where-map-pins";
    layer.setAttribute("aria-hidden", "false");

    var gridOverlay = document.createElement("div");
    gridOverlay.className = "where-map-grid-overlay";
    gridOverlay.setAttribute("aria-hidden", "true");

    var sheet = document.createElement("div");
    sheet.className = "where-sheet glass-block";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "false");
    sheet.setAttribute("aria-labelledby", "where-sheet-title");
    sheet.hidden = true;

    var sheetHead = document.createElement("div");
    sheetHead.className = "where-sheet-head";

    var sheetTitle = document.createElement("h3");
    sheetTitle.className = "where-sheet-title";
    sheetTitle.id = "where-sheet-title";

    var btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "btn-icon-close where-sheet-close";
    btnClose.setAttribute("aria-label", t("close"));
    btnClose.innerHTML = '<span aria-hidden="true">×</span>';

    sheetHead.appendChild(sheetTitle);
    sheetHead.appendChild(btnClose);

    var sheetBody = document.createElement("div");
    sheetBody.className = "where-sheet-body";

    sheet.appendChild(sheetHead);
    sheet.appendChild(sheetBody);

    function openSheet(poi) {
      sheetTitle.textContent = poi.title;
      sheetBody.innerHTML = "";
      function addBlock(labelKey, text) {
        var sec = document.createElement("section");
        sec.className = "where-sheet-row";
        var lbl = document.createElement("span");
        lbl.className = "where-sheet-label";
        lbl.textContent = t(labelKey);
        var val = document.createElement("p");
        val.className = "where-sheet-value";
        val.textContent = text;
        sec.appendChild(lbl);
        sec.appendChild(val);
        sheetBody.appendChild(sec);
      }
      addBlock("whereLocLabel", poi.konum);
      addBlock("whereDirLabel", poi.yon);
      addBlock("whereDescLabel", poi.desc);
      sheet.hidden = false;
    }

    function closeSheet() {
      sheet.hidden = true;
    }

    btnClose.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      closeSheet();
    });

    var jsonArea = null;
    var liveCoordsEl = null;
    var jsonPending = null;
    var selectedId = null;
    var labelsOnlySelected = false;
    var markerByPoiId = {};

    function setLiveCoords(poi) {
      if (!liveCoordsEl) return;
      if (!poi) {
        liveCoordsEl.textContent = "";
        return;
      }
      liveCoordsEl.textContent =
        poi.title + " — left " + poi.left + "% · top " + poi.top + "%";
    }

    function refreshJsonOutput() {
      if (!jsonArea) return;
      if (jsonPending) cancelAnimationFrame(jsonPending);
      jsonPending = requestAnimationFrame(function () {
        jsonPending = null;
        try {
          jsonArea.value = snapshotMapCoordsJson();
          jsonArea.scrollTop = jsonArea.scrollHeight;
        } catch (e) {}
      });
    }

    function updateLabelVisibility() {
      if (!editMode) return;
      data.pois.forEach(function (poi) {
        var rec = markerByPoiId[poi.id];
        if (!rec || !rec.labelEl) return;
        rec.labelEl.hidden = labelsOnlySelected && selectedId !== poi.id;
      });
    }

    function applySelection() {
      if (!editMode) return;
      data.pois.forEach(function (poi) {
        var rec = markerByPoiId[poi.id];
        if (!rec || !rec.mark) return;
        rec.mark.classList.toggle("where-marker--selected", selectedId === poi.id);
      });
      updateLabelVisibility();
      if (selectedId) {
        var sp = null;
        data.pois.forEach(function (p) {
          if (p.id === selectedId) sp = p;
        });
        if (sp) setLiveCoords(sp);
      } else {
        setLiveCoords(null);
      }
    }

    function pctFromClient(clientX, clientY) {
      var rect = stage.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;
      if (w <= 0 || h <= 0) return { left: 0, top: 0 };
      var x = clientX - rect.left;
      var y = clientY - rect.top;
      var left = (x / w) * 100;
      var top = (y / h) * 100;
      left = Math.max(0, Math.min(100, left));
      top = Math.max(0, Math.min(100, top));
      return { left: Math.round(left * 100) / 100, top: Math.round(top * 100) / 100 };
    }

    function syncMapCoord(poi) {
      if (MAP_COORDS[poi.id]) {
        MAP_COORDS[poi.id].left = poi.left;
        MAP_COORDS[poi.id].top = poi.top;
      }
    }

    var editPanel = null;
    if (editMode) {
      editPanel = document.createElement("aside");
      editPanel.className = "where-edit-panel";
      var editTitle = document.createElement("div");
      editTitle.className = "where-edit-panel__title";
      editTitle.textContent = "Where map edit";
      var editRow = document.createElement("div");
      editRow.className = "where-edit-panel__row";
      var labGrid = document.createElement("label");
      var chkGrid = document.createElement("input");
      chkGrid.type = "checkbox";
      labGrid.appendChild(chkGrid);
      labGrid.appendChild(document.createTextNode(" Grid"));
      chkGrid.addEventListener("change", function () {
        gridOverlay.classList.toggle("where-map-grid-overlay--on", chkGrid.checked);
      });
      var labSel = document.createElement("label");
      var chkSel = document.createElement("input");
      chkSel.type = "checkbox";
      labSel.appendChild(chkSel);
      labSel.appendChild(document.createTextNode(" Sadece seçili ad"));
      chkSel.addEventListener("change", function () {
        labelsOnlySelected = chkSel.checked;
        updateLabelVisibility();
      });
      editRow.appendChild(labGrid);
      editRow.appendChild(labSel);
      liveCoordsEl = document.createElement("div");
      liveCoordsEl.className = "where-edit-live";
      liveCoordsEl.setAttribute("aria-live", "polite");
      jsonArea = document.createElement("textarea");
      jsonArea.className = "where-edit-json";
      jsonArea.readOnly = true;
      jsonArea.setAttribute("aria-label", "MAP_COORDS JSON");
      jsonArea.setAttribute("spellcheck", "false");
      var btnExport = document.createElement("button");
      btnExport.type = "button";
      btnExport.className = "where-edit-export";
      btnExport.textContent = "Export coordinates";
      btnExport.addEventListener("click", function () {
        var text = snapshotMapCoordsJson();
        jsonArea.value = text;
        persistWhereCoordsToStorage();
        reapplyPoisFromMapCoords();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(function () {});
        }
        console.log("MAP_COORDS export (localStorage + pois güncellendi):\n" + text);
      });
      editPanel.appendChild(editTitle);
      editPanel.appendChild(editRow);
      editPanel.appendChild(liveCoordsEl);
      editPanel.appendChild(jsonArea);
      editPanel.appendChild(btnExport);
    }

    function maxTapRadiusPx(rect) {
      return Math.max(48, Math.min(72, 0.11 * Math.min(rect.width, rect.height)));
    }

    function nearestPoi(stageRect, x, y) {
      var best = null;
      var bestD = Infinity;
      data.pois.forEach(function (poi) {
        var cx = (poi.left / 100) * stageRect.width;
        var cy = (poi.top / 100) * stageRect.height;
        var dx = x - cx;
        var dy = y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) {
          bestD = d;
          best = poi;
        }
      });
      return { poi: best, d: bestD };
    }

    function onLayerPointer(ev) {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      var rect = stage.getBoundingClientRect();
      var x = ev.clientX - rect.left;
      var y = ev.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      var snap = nearestPoi(rect, x, y);
      if (snap.poi && snap.d <= maxTapRadiusPx(rect)) {
        openSheet(snap.poi);
      }
    }

    if (!editMode) {
      layer.addEventListener("pointerup", onLayerPointer);
    }

    data.pois.forEach(function (poi) {
      var mark = document.createElement("span");
      mark.className = "where-marker" + (editMode ? " where-marker--draggable" : "");
      mark.style.left = poi.left + "%";
      mark.style.top = poi.top + "%";
      mark.setAttribute("aria-hidden", "true");
      var ptr = document.createElement("span");
      ptr.className = "where-marker-pointer";
      mark.appendChild(ptr);
      var labelEl = null;
      if (editMode) {
        labelEl = document.createElement("span");
        labelEl.className = "where-marker-label";
        labelEl.textContent = poi.title;
        mark.appendChild(labelEl);
      }
      markerByPoiId[poi.id] = { mark: mark, labelEl: labelEl };

      if (editMode) {
        var dragState = null;
        mark.addEventListener("pointerdown", function (e) {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.stopPropagation();
          dragState = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            dragging: false,
          };
          try {
            mark.setPointerCapture(e.pointerId);
          } catch (err) {}
        });
        mark.addEventListener("pointermove", function (e) {
          if (!dragState || e.pointerId !== dragState.pointerId) return;
          var dx = e.clientX - dragState.startX;
          var dy = e.clientY - dragState.startY;
          if (dx * dx + dy * dy > 16) dragState.dragging = true;
          if (dragState.dragging) {
            var p = pctFromClient(e.clientX, e.clientY);
            poi.left = p.left;
            poi.top = p.top;
            syncMapCoord(poi);
            mark.style.left = poi.left + "%";
            mark.style.top = poi.top + "%";
            refreshJsonOutput();
            setLiveCoords(poi);
          }
        });
        function endPointer(e) {
          if (!dragState || e.pointerId !== dragState.pointerId) return;
          var wasDrag = dragState.dragging;
          var dx = e.clientX - dragState.startX;
          var dy = e.clientY - dragState.startY;
          if (!wasDrag && dx * dx + dy * dy <= 16) {
            selectedId = poi.id;
            applySelection();
          }
          if (wasDrag) {
            var p = pctFromClient(e.clientX, e.clientY);
            poi.left = p.left;
            poi.top = p.top;
            syncMapCoord(poi);
            mark.style.left = poi.left + "%";
            mark.style.top = poi.top + "%";
            refreshJsonOutput();
            setLiveCoords(poi);
            persistWhereCoordsToStorage();
            reapplyPoisFromMapCoords();
          }
          try {
            mark.releasePointerCapture(e.pointerId);
          } catch (err) {}
          dragState = null;
        }
        mark.addEventListener("pointerup", endPointer);
        mark.addEventListener("pointercancel", endPointer);
      }

      layer.appendChild(mark);
    });

    if (editMode) {
      layer.classList.add("where-map-pins--edit-mode");
    }

    stage.appendChild(img);
    stage.appendChild(gridOverlay);
    stage.appendChild(layer);
    zoom.appendChild(stage);
    mapView.appendChild(zoom);
    mapView.appendChild(sheet);

    var intro = document.createElement("p");
    intro.className = "where-module-intro";
    intro.textContent = t("whereModuleIntro");
    if (editMode) {
      intro.textContent +=
        " Edit: ?whereEdit=1 veya VIONA_WHERE_EDIT=true. Sürükleyince JSON ve tarayıcı hafızası (localStorage) güncellenir; Export ile panoya kopyalanır. Normal modda kayıtlı konumlar açılışta yüklenir.";
    }

    wrap.appendChild(intro);
    if (editMode && editPanel) {
      var editWrap = document.createElement("div");
      editWrap.className = "where-edit-wrap";
      editWrap.appendChild(mapView);
      editWrap.appendChild(editPanel);
      wrap.appendChild(editWrap);
    } else {
      wrap.appendChild(mapView);
    }

    container.appendChild(wrap);

    if (editMode) {
      function syncEditPanelFromCoords() {
        refreshJsonOutput();
        setLiveCoords(null);
      }
      syncEditPanelFromCoords();
      img.addEventListener("load", syncEditPanelFromCoords);
    }

    function onEscKey(ev) {
      if (ev.key === "Escape" && !sheet.hidden) closeSheet();
    }
    document.addEventListener("keydown", onEscKey);

    var cleanup = function () {
      document.removeEventListener("keydown", onEscKey);
      closeSheet();
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    };
    container._whereCleanup = cleanup;
  }

  window.renderWhereModule = renderWhereModule;
  window.VIONA_WHERE_COORDS_STORAGE_KEY = COORDS_STORAGE_KEY;
  window.VIONA_WHERE_GET_MAP_COORDS_JSON = snapshotMapCoordsJson;
  window.VIONA_WHERE_REAPPLY_POIS = reapplyPoisFromMapCoords;
})();
