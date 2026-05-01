/**
 * Çevrede Keşfet — Google Haritalar (gömülü iframe) + liste; yol tarifi Google yönlendirme URL’si.
 */
(function () {
  "use strict";

  var DATA = function () {
    return window.NEARBY_EXPLORE_DATA || { hotel: {}, places: [], categoryOrder: [] };
  };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function escapeHtmlAttrText(s) {
    return String(s != null ? s : "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function scheduleNoteHtml(place, Lg) {
    if (!place.scheduleNote || typeof place.scheduleNote !== "object") return "";
    var s = pick(place.scheduleNote, Lg);
    if (!s) return "";
    return (
      '<p class="near-explore-card__schedule" role="note">' + escapeHtmlAttrText(s) + "</p>"
    );
  }

  function pick(row, lang) {
    if (!row || typeof row !== "object") return "";
    if (window.VIONA_LANG && typeof window.VIONA_LANG.pickFromLangRow === "function") {
      return window.VIONA_LANG.pickFromLangRow(row, lang);
    }
    var L = String(lang || "tr").toLowerCase().slice(0, 2);
    if (window.VIONA_LANG && window.VIONA_LANG.ALL && window.VIONA_LANG.ALL.indexOf(L) === -1) L = "tr";
    if (row[L]) return row[L];
    if (row.tr) return row.tr;
    if (row.en) return row.en;
    return "";
  }

  function haversineM(aLat, aLng, bLat, bLng) {
    var R = 6371000;
    var p1 = (aLat * Math.PI) / 180;
    var p2 = (bLat * Math.PI) / 180;
    var dp = ((bLat - aLat) * Math.PI) / 180;
    var dl = ((bLng - aLng) * Math.PI) / 180;
    var x =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function formatDistance(m, lang) {
    if (m == null || isNaN(m) || m < 0) return "—";
    if (m < 1000) {
      var mR = Math.round(m / 10) * 10;
      if (lang === "de") return "ca. " + mR + " m";
      if (lang === "pl") return "≈ " + mR + " m";
      return "≈ " + mR + " m";
    }
    var kmNum = (m / 1000).toFixed(1);
    if (lang === "en" || lang === "pl") {
      if (lang === "pl") return "≈ " + kmNum + " km";
      return "≈ " + kmNum + " km";
    }
    var kmComma = kmNum.replace(".", ",");
    if (lang === "de") return "ca. " + kmComma + " km";
    return "≈ " + kmComma + " km";
  }

  function formatWalkMin(meters, lang) {
    if (meters == null || isNaN(meters) || meters < 0) return "—";
    var min = Math.max(1, Math.round(meters / 75));
    if (lang === "de") return "ca. " + min + " Min. zu Fuß";
    if (lang === "pl") return "≈ " + min + " min pieszo";
    if (lang === "tr") return "≈ " + min + " dk yürüyüş";
    return "≈ " + min + " min walk";
  }

  /** Koordinatları kısa, stabil metin yap (URL için). */
  function coordPair(lat, lng) {
    var la = typeof lat === "number" ? Math.round(lat * 1e7) / 1e7 : lat;
    var ln = typeof lng === "number" ? Math.round(lng * 1e7) / 1e7 : lng;
    return la + "," + ln;
  }

  /** Harita / rota URL’lerinde okunaklı etiket: isim + adres (ters jeode kodlamada yanlış POI adını azaltır). */
  function mapsEndpointLabel(nameStr, addressStr) {
    var n = nameStr != null ? String(nameStr).trim() : "";
    var a = addressStr != null ? String(addressStr).trim() : "";
    if (n && a) return n + ", " + a;
    return n || a;
  }

  function hotelMapsLabel(hotel, Lg) {
    return mapsEndpointLabel(pick(hotel.name, Lg), pick(hotel.address, Lg));
  }

  function placeMapsLabel(place, Lg) {
    return mapsEndpointLabel(pick(place.name, Lg), pick(place.address, Lg));
  }

  /** Rota uçları: önce isim+adres, yoksa koordinat. */
  function hotelRouteEndpoint(hotel, Lg) {
    var lbl = hotelMapsLabel(hotel, Lg);
    if (lbl) return lbl;
    return coordPair(hotel.lat, hotel.lng);
  }

  function placeRouteEndpoint(place, Lg) {
    var lbl = placeMapsLabel(place, Lg);
    if (lbl) return lbl;
    if (typeof place.lat === "number" && typeof place.lng === "number") {
      return coordPair(place.lat, place.lng);
    }
    return "";
  }

  function googleMapsHl(Lg) {
    if (window.VIONA_LANG && typeof window.VIONA_LANG.isUiLang === "function" && window.VIONA_LANG.isUiLang(Lg)) {
      return Lg;
    }
    if (window.VIONA_LANG && window.VIONA_LANG.ALL && window.VIONA_LANG.ALL.indexOf(Lg) !== -1) return Lg;
    return "tr";
  }

  /** Gömülü harita: tek nokta (otel / bölge). placeQuery doluysa isim+adres ile arama, yoksa pin koordinat. */
  function googleMapsEmbedPlace(lat, lng, zoom, Lg, placeQuery) {
    var q =
      placeQuery != null && String(placeQuery).trim()
        ? String(placeQuery).trim()
        : coordPair(lat, lng);
    return (
      "https://www.google.com/maps?q=" +
      encodeURIComponent(q) +
      "&z=" +
      (zoom || 17) +
      "&hl=" +
      googleMapsHl(Lg) +
      "&output=embed"
    );
  }

  /** Gömülü harita: otel → hedef rota önizlemesi (metin etiketleri). */
  function googleMapsEmbedRoute(saddrLabel, daddrLabel, Lg) {
    return (
      "https://www.google.com/maps?saddr=" +
      encodeURIComponent(saddrLabel) +
      "&daddr=" +
      encodeURIComponent(daddrLabel) +
      "&hl=" +
      googleMapsHl(Lg) +
      "&output=embed"
    );
  }

  /**
   * Tam ekran yol tarifi: başlangıç = otel, varış = seçilen yer (isim+adres; Google’da doğru etiketler).
   * @see https://developers.google.com/maps/documentation/urls/get-started
   */
  function googleDirectionsUrl(hotel, place, Lg) {
    var o = hotelRouteEndpoint(hotel, Lg);
    var d = placeRouteEndpoint(place, Lg);
    return (
      "https://www.google.com/maps/dir/?api=1&origin=" +
      encodeURIComponent(o) +
      "&destination=" +
      encodeURIComponent(d) +
      "&travelmode=driving"
    );
  }

  function validHotelCoords(h) {
    if (!h || typeof h !== "object") return false;
    var la = h.lat;
    var ln = h.lng;
    return (
      typeof la === "number" &&
      typeof ln === "number" &&
      !isNaN(la) &&
      !isNaN(ln) &&
      Math.abs(la) <= 90 &&
      Math.abs(ln) <= 180
    );
  }

  function renderNearbyExploreModule(container, t, lang) {
    var Lg =
      window.VIONA_LANG && typeof window.VIONA_LANG.normalizeToUiLang === "function"
        ? window.VIONA_LANG.normalizeToUiLang(lang)
        : (function (x) {
            x = String(x || "tr").toLowerCase().slice(0, 2);
            if (window.VIONA_LANG && window.VIONA_LANG.ALL && window.VIONA_LANG.ALL.indexOf(x) !== -1) return x;
            return "tr";
          })(lang);
    var d = DATA();
    var hotel = d.hotel;
    var places = d.places || [];
    var order = d.categoryOrder || [];

    if (!validHotelCoords(hotel)) {
      var errP = el("p", "placeholder near-explore-config-error", t("nearExploreConfigError"));
      container.appendChild(errP);
      return;
    }

    var state = {
      screen: "home",
      category: null,
      selectedId: null,
      homeIframeEl: null,
      catIframeEl: null,
    };

    function makeGmapsIframe(titleText, src) {
      var ifr = document.createElement("iframe");
      ifr.className = "near-explore-gmaps-frame";
      ifr.setAttribute("title", titleText);
      ifr.setAttribute("loading", "lazy");
      ifr.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      ifr.setAttribute("allowfullscreen", "");
      ifr.src = src;
      return ifr;
    }

    function setCategoryMapRoute(place) {
      if (!state.catIframeEl || !place) return;
      var fromLbl = hotelRouteEndpoint(hotel, Lg);
      var toLbl = placeRouteEndpoint(place, Lg);
      if (!toLbl) return;
      state.catIframeEl.src = googleMapsEmbedRoute(fromLbl, toLbl, Lg);
    }

    var root = el("div", "viona-mod viona-mod--near-explore");

    var shellHome = el("div", "near-explore-shell near-explore-shell--home");
    var shellCat = el("div", "near-explore-shell near-explore-shell--category hidden");

    shellHome.appendChild(el("p", "near-explore-lead", t("nearExploreLead")));
    shellHome.appendChild(el("p", "near-explore-tagline", t("nearExploreTagline")));

    var mapHomeWrap = el("div", "near-explore-mapwrap near-explore-mapwrap--home");
    var mapHomeEl = el("div", "near-explore-map");
    mapHomeEl.id = "near-explore-map-home";
    mapHomeWrap.appendChild(mapHomeEl);
    mapHomeWrap.setAttribute("role", "region");
    mapHomeWrap.setAttribute("aria-label", pick(hotel.name, Lg));
    shellHome.appendChild(mapHomeWrap);

    var catGrid = el("div", "near-explore-cats");
    catGrid.setAttribute("role", "group");
    catGrid.setAttribute("aria-label", t("nearExploreCategoriesAria"));
    order.forEach(function (catId) {
      var btn = el("button", "near-explore-cat", "");
      btn.type = "button";
      btn.dataset.category = catId;
      btn.innerHTML =
        '<span class="near-explore-cat__ico" aria-hidden="true"></span>' +
        '<span class="near-explore-cat__label">' +
        t("nearCat_" + catId) +
        "</span>";
      btn.addEventListener("click", function () {
        openCategory(catId);
      });
      catGrid.appendChild(btn);
    });
    shellHome.appendChild(catGrid);

    var catTop = el("div", "near-explore-cat-head");
    var btnBack = el("button", "near-explore-back near-explore-btn--ghost", t("nearExploreBack"));
    btnBack.type = "button";
    btnBack.addEventListener("click", function () {
      showHome();
    });
    catTop.appendChild(btnBack);
    var catTitle = el("h3", "near-explore-cat-title", "");
    catTop.appendChild(catTitle);
    shellCat.appendChild(catTop);

    var mapCatWrap = el("div", "near-explore-mapwrap near-explore-mapwrap--category");
    mapCatWrap.setAttribute("role", "region");
    var mapCatEl = el("div", "near-explore-map");
    mapCatEl.id = "near-explore-map-category";
    mapCatWrap.appendChild(mapCatEl);
    shellCat.appendChild(mapCatWrap);

    var listEl = el("div", "near-explore-list");
    listEl.setAttribute("role", "region");
    shellCat.appendChild(listEl);

    var detail = el("div", "near-explore-detail hidden");
    detail.setAttribute("role", "dialog");
    detail.setAttribute("aria-modal", "true");
    var detailInner = el("div", "near-explore-detail__panel glass-block");
    detail.appendChild(detailInner);

    var onDetailEscape = null;
    function detachDetailEscape() {
      if (onDetailEscape) {
        document.removeEventListener("keydown", onDetailEscape);
        onDetailEscape = null;
      }
    }
    function closeDetailSheet() {
      detachDetailEscape();
      detail.classList.add("hidden");
      detailInner.innerHTML = "";
      var sid = state.selectedId;
      if (sid && state.screen === "category") {
        requestAnimationFrame(function () {
          var cards = listEl.querySelectorAll(".near-explore-card");
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].dataset.placeId === sid && typeof cards[i].focus === "function") {
              cards[i].focus();
              break;
            }
          }
        });
      }
    }

    detail.addEventListener("click", function (e) {
      if (e.target === detail) closeDetailSheet();
    });
    root.appendChild(shellHome);
    root.appendChild(shellCat);
    root.appendChild(detail);

    function showHome() {
      detachDetailEscape();
      state.screen = "home";
      state.category = null;
      state.selectedId = null;
      shellHome.classList.remove("hidden");
      shellCat.classList.add("hidden");
      detail.classList.add("hidden");
      detailInner.innerHTML = "";
      mapCatEl.innerHTML = "";
      state.catIframeEl = null;
    }

    function placesInCategory(catId) {
      var list = places.filter(function (p) {
        return p.category === catId;
      });
      list.sort(function (a, b) {
        var af = a.isFeatured ? 1 : 0;
        var bf = b.isFeatured ? 1 : 0;
        if (bf !== af) return bf - af;
        var da =
          typeof a.lat === "number" && typeof a.lng === "number"
            ? haversineM(hotel.lat, hotel.lng, a.lat, a.lng)
            : Infinity;
        var db =
          typeof b.lat === "number" && typeof b.lng === "number"
            ? haversineM(hotel.lat, hotel.lng, b.lat, b.lng)
            : Infinity;
        return da - db;
      });
      return list;
    }

    function openCategory(catId) {
      detachDetailEscape();
      detailInner.innerHTML = "";
      detail.classList.add("hidden");
      state.screen = "category";
      state.category = catId;
      state.selectedId = null;
      shellHome.classList.add("hidden");
      shellCat.classList.remove("hidden");
      catTitle.textContent = t("nearCat_" + catId);
      mapCatWrap.setAttribute("aria-label", catTitle.textContent);
      listEl.setAttribute("aria-label", catTitle.textContent);
      listEl.innerHTML = "";

      var list = placesInCategory(catId);
      if (list.length === 0) {
        listEl.appendChild(el("p", "near-explore-empty", t("nearExploreEmptyCategory")));
      }
      list.forEach(function (place) {
        var m =
          typeof place.lat === "number" && typeof place.lng === "number"
            ? haversineM(hotel.lat, hotel.lng, place.lat, place.lng)
            : NaN;
        var card = el("article", "near-explore-card glass-block");
        if (place.isFeatured) card.classList.add("near-explore-card--featured");
        card.dataset.placeId = place.id;
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        var dist = formatDistance(m, Lg);
        var dur = formatWalkMin(m, Lg);
        card.innerHTML =
          '<div class="near-explore-card__head">' +
          '<h4 class="near-explore-card__title">' +
          pick(place.name, Lg) +
          "</h4>" +
          '<span class="near-explore-card__badge">' +
          t("nearCat_" + catId) +
          "</span>" +
          "</div>" +
          '<p class="near-explore-card__desc">' +
          pick(place.description, Lg) +
          "</p>" +
          '<p class="near-explore-card__addr">' +
          pick(place.address, Lg) +
          "</p>" +
          scheduleNoteHtml(place, Lg) +
          '<div class="near-explore-card__meta">' +
          '<span>' +
          dist +
          "</span>" +
          "<span>" +
          dur +
          "</span>" +
          "</div>";
        card.addEventListener("click", function () {
          selectPlace(place.id);
        });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectPlace(place.id);
          }
        });
        listEl.appendChild(card);
      });

      initCategoryMap(catId, list);
    }

    function initCategoryMap(catId, list) {
      mapCatEl.innerHTML = "";
      state.catIframeEl = null;
      var titleText = t("nearCat_" + catId) + " — " + pick(hotel.name, Lg);
      var src;
      if (list.length === 0) {
        src = googleMapsEmbedPlace(
          hotel.lat,
          hotel.lng,
          hotel.defaultZoom || 17,
          Lg,
          hotelMapsLabel(hotel, Lg)
        );
      } else {
        var first = list[0];
        var toFirst = placeRouteEndpoint(first, Lg);
        if (toFirst) {
          src = googleMapsEmbedRoute(hotelRouteEndpoint(hotel, Lg), toFirst, Lg);
        } else {
          src = googleMapsEmbedPlace(
            hotel.lat,
            hotel.lng,
            hotel.defaultZoom || 17,
            Lg,
            hotelMapsLabel(hotel, Lg)
          );
        }
      }
      var ifr = makeGmapsIframe(titleText, src);
      mapCatEl.appendChild(ifr);
      state.catIframeEl = ifr;
    }

    function selectPlace(id) {
      state.selectedId = id;
      var p = places.filter(function (x) {
        return x.id === id;
      })[0];
      if (!p) return;

      setCategoryMapRoute(p);

      listEl.querySelectorAll(".near-explore-card").forEach(function (c) {
        c.classList.toggle("near-explore-card--active", c.dataset.placeId === id);
      });
      var activeCard = null;
      var cardNodes = listEl.querySelectorAll(".near-explore-card");
      for (var ci = 0; ci < cardNodes.length; ci++) {
        if (cardNodes[ci].dataset.placeId === id) {
          activeCard = cardNodes[ci];
          break;
        }
      }
      if (activeCard && activeCard.scrollIntoView) {
        var smoothScroll = true;
        try {
          if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            smoothScroll = false;
          }
        } catch (e) {}
        activeCard.scrollIntoView({ block: "nearest", behavior: smoothScroll ? "smooth" : "auto" });
      }

      detailInner.innerHTML = "";
      var m =
        typeof p.lat === "number" && typeof p.lng === "number"
          ? haversineM(hotel.lat, hotel.lng, p.lat, p.lng)
          : NaN;
      var dist = formatDistance(m, Lg);
      var dur =
        typeof p.lat === "number" && typeof p.lng === "number" ? formatWalkMin(m, Lg) : "—";

      var h = el("h4", "near-explore-detail__title", pick(p.name, Lg));
      h.id = "near-explore-detail-heading";
      detail.setAttribute("aria-labelledby", "near-explore-detail-heading");
      detailInner.appendChild(h);
      detailInner.appendChild(el("p", "near-explore-detail__cat", t("nearCat_" + p.category)));
      detailInner.appendChild(el("p", "near-explore-detail__desc", pick(p.description, Lg)));
      detailInner.appendChild(el("p", "near-explore-detail__addr", pick(p.address, Lg)));
      if (p.scheduleNote && typeof p.scheduleNote === "object") {
        var sn = pick(p.scheduleNote, Lg);
        if (sn) {
          var snP = el("p", "near-explore-detail__schedule");
          snP.setAttribute("role", "note");
          snP.textContent = sn;
          detailInner.appendChild(snP);
        }
      }
      var meta = el("div", "near-explore-detail__meta");
      meta.innerHTML = "<span>" + dist + "</span><span>" + dur + "</span>";
      detailInner.appendChild(meta);

      var routeSummary = el("p", "near-explore-detail__route");
      routeSummary.textContent =
        pick(hotel.name, Lg) + " → " + pick(p.name, Lg);
      detailInner.appendChild(routeSummary);

      var actions = el("div", "near-explore-detail__actions");
      var destOk = placeRouteEndpoint(p, Lg) !== "";
      if (destOk) {
        var aDir = el("a", "btn-primary near-explore-detail__btn", t("nearExploreDirections"));
        aDir.href = googleDirectionsUrl(hotel, p, Lg);
        aDir.target = "_blank";
        aDir.rel = "noopener noreferrer";
        aDir.setAttribute(
          "aria-label",
          t("nearExploreDirections") + ": " + pick(hotel.name, Lg) + " — " + pick(p.name, Lg)
        );
        actions.appendChild(aDir);
      } else {
        actions.appendChild(el("p", "near-explore-detail__no-dir", t("nearExploreDirectionsNoCoords")));
      }
      if (p.mapsUrl && typeof p.mapsUrl === "string") {
        var aGm = el("a", "near-explore-btn--ghost near-explore-detail__btn", t("nearExploreOpenInMaps"));
        aGm.href = p.mapsUrl;
        aGm.target = "_blank";
        aGm.rel = "noopener noreferrer";
        actions.appendChild(aGm);
      }
      detailInner.appendChild(actions);

      var btnClose = el("button", "near-explore-detail__close", "×");
      btnClose.type = "button";
      btnClose.setAttribute("aria-label", t("close"));
      btnClose.addEventListener("click", function () {
        closeDetailSheet();
      });
      detailInner.appendChild(btnClose);

      detachDetailEscape();
      onDetailEscape = function (ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          closeDetailSheet();
        }
      };
      document.addEventListener("keydown", onDetailEscape);

      detail.classList.remove("hidden");
      try {
        btnClose.focus();
      } catch (e) {}
    }

    function initHomeMap() {
      if (state.homeIframeEl) return;
      mapHomeEl.innerHTML = "";
      var src = googleMapsEmbedPlace(
        hotel.lat,
        hotel.lng,
        hotel.defaultZoom || 17,
        Lg,
        hotelMapsLabel(hotel, Lg)
      );
      var ifr = makeGmapsIframe(pick(hotel.name, Lg), src);
      mapHomeEl.appendChild(ifr);
      state.homeIframeEl = ifr;
    }

    container.appendChild(root);

    requestAnimationFrame(function () {
      initHomeMap();
    });

    container._nearExploreCleanup = function () {
      detachDetailEscape();
      if (state.homeIframeEl) {
        try {
          state.homeIframeEl.src = "about:blank";
        } catch (e) {}
        try {
          state.homeIframeEl.remove();
        } catch (e2) {}
        state.homeIframeEl = null;
      }
      if (state.catIframeEl) {
        try {
          state.catIframeEl.src = "about:blank";
        } catch (e) {}
        try {
          state.catIframeEl.remove();
        } catch (e2) {}
        state.catIframeEl = null;
      }
    };

    container._nearExplorePopState = function () {
      if (!detail.classList.contains("hidden")) {
        closeDetailSheet();
        return true;
      }
      if (state.screen === "category") {
        showHome();
        return true;
      }
      return false;
    };
  }

  window.renderNearbyExploreModule = renderNearbyExploreModule;
})();
