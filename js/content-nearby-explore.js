/**
 * Çevrede Keşfet — kategori → liste + Leaflet harita, manuel veri.
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

  function pick(row, lang) {
    if (!row || typeof row !== "object") return "";
    var L = lang === "en" || lang === "de" || lang === "ru" ? lang : "tr";
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
    if (m < 1000) {
      var mR = Math.round(m / 10) * 10;
      if (lang === "de") return "ca. " + mR + " m";
      if (lang === "ru") return "≈ " + mR + " м";
      return "≈ " + mR + " m";
    }
    var km = (m / 1000).toFixed(1).replace(".", ",");
    if (lang === "de") return "ca. " + km + " km";
    if (lang === "ru") return "≈ " + km.replace(",", ".") + " км";
    return "≈ " + km + " km";
  }

  function formatWalkMin(meters, lang) {
    var min = Math.max(1, Math.round(meters / 75));
    if (lang === "de") return "ca. " + min + " Min. zu Fuß";
    if (lang === "ru") return "≈ " + min + " мин пешком";
    if (lang === "tr") return "≈ " + min + " dk yürüyüş";
    return "≈ " + min + " min walk";
  }

  function googleDirectionsUrl(fromLat, fromLng, toLat, toLng) {
    return (
      "https://www.google.com/maps/dir/?api=1&origin=" +
      encodeURIComponent(fromLat + "," + fromLng) +
      "&destination=" +
      encodeURIComponent(toLat + "," + toLng) +
      "&travelmode=driving"
    );
  }

  function ensureLeaflet() {
    return typeof window.L !== "undefined" && window.L.map;
  }

  function renderNearbyExploreModule(container, t, lang) {
    var Lg = lang === "en" || lang === "de" || lang === "ru" ? lang : "tr";
    var d = DATA();
    var hotel = d.hotel;
    var places = d.places || [];
    var order = d.categoryOrder || [];

    var state = {
      screen: "home",
      category: null,
      selectedId: null,
      mapHome: null,
      mapCat: null,
      layers: { hotel: null, places: {} },
      markers: {},
    };

    var root = el("div", "viona-mod viona-mod--near-explore");

    var shellHome = el("div", "near-explore-shell near-explore-shell--home");
    var shellCat = el("div", "near-explore-shell near-explore-shell--category hidden");

    shellHome.appendChild(el("p", "near-explore-lead", t("nearExploreLead")));
    shellHome.appendChild(el("p", "near-explore-tagline", t("nearExploreTagline")));

    var mapHomeWrap = el("div", "near-explore-mapwrap near-explore-mapwrap--home");
    var mapHomeEl = el("div", "near-explore-map");
    mapHomeEl.id = "near-explore-map-home";
    mapHomeWrap.appendChild(mapHomeEl);
    shellHome.appendChild(mapHomeWrap);

    var catGrid = el("div", "near-explore-cats");
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
    var mapCatEl = el("div", "near-explore-map");
    mapCatEl.id = "near-explore-map-category";
    mapCatWrap.appendChild(mapCatEl);
    shellCat.appendChild(mapCatWrap);

    var listEl = el("div", "near-explore-list");
    shellCat.appendChild(listEl);

    var detail = el("div", "near-explore-detail hidden");
    detail.setAttribute("role", "dialog");
    detail.setAttribute("aria-modal", "true");
    var detailInner = el("div", "near-explore-detail__panel glass-block");
    detail.appendChild(detailInner);
    detail.addEventListener("click", function (e) {
      if (e.target === detail) detail.classList.add("hidden");
    });
    root.appendChild(shellHome);
    root.appendChild(shellCat);
    root.appendChild(detail);

    function showHome() {
      state.screen = "home";
      state.category = null;
      state.selectedId = null;
      shellHome.classList.remove("hidden");
      shellCat.classList.add("hidden");
      detail.classList.add("hidden");
      detailInner.innerHTML = "";
      if (state.mapCat) {
        try {
          state.mapCat.remove();
        } catch (e) {}
        state.mapCat = null;
        state.markers = {};
      }
      setTimeout(function () {
        if (state.mapHome) state.mapHome.invalidateSize();
      }, 80);
    }

    function placesInCategory(catId) {
      return places.filter(function (p) {
        return p.category === catId;
      });
    }

    function openCategory(catId) {
      state.screen = "category";
      state.category = catId;
      state.selectedId = null;
      shellHome.classList.add("hidden");
      shellCat.classList.remove("hidden");
      catTitle.textContent = t("nearCat_" + catId);
      listEl.innerHTML = "";
      detail.classList.add("hidden");

      var list = placesInCategory(catId);
      list.forEach(function (place) {
        var m = haversineM(hotel.lat, hotel.lng, place.lat, place.lng);
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

    function hotelDivIcon(Lref) {
      return Lref.divIcon({
        className: "near-explore-marker near-explore-marker--hotel",
        html: '<div class="near-explore-marker__dot"></div>',
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });
    }

    function placeDivIcon(Lref, active) {
      return Lref.divIcon({
        className: "near-explore-marker near-explore-marker--place" + (active ? " is-active" : ""),
        html: '<div class="near-explore-marker__pin"></div>',
        iconSize: [26, 34],
        iconAnchor: [13, 32],
      });
    }

    function initCategoryMap(catId, list) {
      if (!ensureLeaflet()) return;
      var Lref = window.L;
      if (state.mapCat) {
        try {
          state.mapCat.remove();
        } catch (e) {}
        state.mapCat = null;
      }
      state.markers = {};

      var bounds = Lref.latLngBounds([hotel.lat, hotel.lng]);
      list.forEach(function (p) {
        bounds.extend([p.lat, p.lng]);
      });

      state.mapCat = Lref.map(mapCatEl, {
        zoomControl: true,
        scrollWheelZoom: false,
      });
      Lref.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(state.mapCat);

      state.markers.hotel = Lref.marker([hotel.lat, hotel.lng], { icon: hotelDivIcon(Lref) })
        .addTo(state.mapCat)
        .bindPopup(pick(hotel.name, Lg));

      list.forEach(function (p) {
        var mk = Lref.marker([p.lat, p.lng], { icon: placeDivIcon(Lref, false) })
          .addTo(state.mapCat)
          .bindPopup(pick(p.name, Lg));
        mk.on("click", function () {
          selectPlace(p.id);
        });
        state.markers[p.id] = { marker: mk, place: p };
      });

      state.mapCat.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
      setTimeout(function () {
        state.mapCat.invalidateSize();
      }, 120);
    }

    function selectPlace(id) {
      state.selectedId = id;
      var p = places.filter(function (x) {
        return x.id === id;
      })[0];
      if (!p || !state.mapCat) return;

      Object.keys(state.markers).forEach(function (k) {
        if (k === "hotel") return;
        var o = state.markers[k];
        if (!o || !o.marker) return;
        var active = k === id;
        o.marker.setIcon(placeDivIcon(window.L, active));
      });

      state.mapCat.setView([p.lat, p.lng], Math.max(state.mapCat.getZoom(), 16), { animate: true });

      detailInner.innerHTML = "";
      var m = haversineM(hotel.lat, hotel.lng, p.lat, p.lng);
      var dist = formatDistance(m, Lg);
      var dur = formatWalkMin(m, Lg);

      var h = el("h4", "near-explore-detail__title", pick(p.name, Lg));
      detailInner.appendChild(h);
      detailInner.appendChild(el("p", "near-explore-detail__cat", t("nearCat_" + p.category)));
      detailInner.appendChild(el("p", "near-explore-detail__desc", pick(p.description, Lg)));
      detailInner.appendChild(el("p", "near-explore-detail__addr", pick(p.address, Lg)));
      var meta = el("div", "near-explore-detail__meta");
      meta.innerHTML = "<span>" + dist + "</span><span>" + dur + "</span>";
      detailInner.appendChild(meta);

      var actions = el("div", "near-explore-detail__actions");
      var aDir = el("a", "btn-primary near-explore-detail__btn", t("nearExploreDirections"));
      aDir.href = googleDirectionsUrl(hotel.lat, hotel.lng, p.lat, p.lng);
      aDir.target = "_blank";
      aDir.rel = "noopener noreferrer";
      var aRec = el("button", "near-explore-btn--ghost near-explore-detail__btn", t("nearExploreReception"));
      aRec.type = "button";
      aRec.addEventListener("click", function () {
        if (typeof window.vionaOpenRequestsFromNearby === "function") {
          window.vionaOpenRequestsFromNearby();
        }
      });
      actions.appendChild(aDir);
      actions.appendChild(aRec);
      detailInner.appendChild(actions);

      var btnClose = el("button", "near-explore-detail__close", "×");
      btnClose.type = "button";
      btnClose.setAttribute("aria-label", t("close"));
      btnClose.addEventListener("click", function () {
        detail.classList.add("hidden");
      });
      detailInner.appendChild(btnClose);

      detail.classList.remove("hidden");
    }

    function initHomeMap() {
      if (!ensureLeaflet()) return;
      var Lref = window.L;
      if (state.mapHome) return;
      state.mapHome = Lref.map(mapHomeEl, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        touchZoom: false,
      });
      Lref.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "",
        maxZoom: 19,
      }).addTo(state.mapHome);
      Lref.marker([hotel.lat, hotel.lng], { icon: hotelDivIcon(Lref) })
        .addTo(state.mapHome)
        .bindPopup(pick(hotel.name, Lg));
      state.mapHome.setView([hotel.lat, hotel.lng], hotel.defaultZoom || 16);
      setTimeout(function () {
        state.mapHome.invalidateSize();
      }, 100);
    }

    container.appendChild(root);

    requestAnimationFrame(function () {
      initHomeMap();
    });

    container._nearExploreCleanup = function () {
      try {
        if (state.mapHome) state.mapHome.remove();
      } catch (e) {}
      try {
        if (state.mapCat) state.mapCat.remove();
      } catch (e) {}
      state.mapHome = null;
      state.mapCat = null;
    };

    container._nearExplorePopState = function () {
      if (!detail.classList.contains("hidden")) {
        detail.classList.add("hidden");
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
