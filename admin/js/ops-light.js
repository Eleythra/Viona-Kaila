(function () {
  "use strict";

  var PAGE_SIZE = 50;
  var OPS_MUTATION_BC = "viona-ops-mutations";
  var opsCrossTabBc = null;
  var opsVisListenerWired = false;

  function postOpsMutation() {
    try {
      if (typeof BroadcastChannel === "undefined") return;
      var c = new BroadcastChannel(OPS_MUTATION_BC);
      c.postMessage({ t: Date.now(), v: 1, source: "ops-light" });
      c.close();
    } catch (_e) {}
  }

  function wireOpsCrossTabListRefresh(reloader) {
    window.__vionaOpsVisReload = reloader;
    if (!opsVisListenerWired) {
      opsVisListenerWired = true;
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) return;
        if (typeof window.__vionaOpsVisReload === "function") void window.__vionaOpsVisReload();
      });
    }
    try {
      if (opsCrossTabBc) {
        opsCrossTabBc.close();
        opsCrossTabBc = null;
      }
      opsCrossTabBc = new BroadcastChannel(OPS_MUTATION_BC);
      opsCrossTabBc.onmessage = function () {
        if (document.hidden) return;
        if (typeof reloader === "function") void reloader();
      };
    } catch (_e) {}
  }

  function getRole() {
    return String(document.body.getAttribute("data-viona-ops-role") || "").trim();
  }

  var TITLES = {
    hk: "HK Operasyon",
    tech: "Teknik Operasyon",
    front: "Ön büro Operasyon",
  };

  function sessionKey() {
    return "viona_ops_link_" + getRole();
  }

  function getApiBase() {
    if (typeof document !== "undefined" && document.documentElement) {
      var domAttr = document.documentElement.getAttribute("data-viona-live-api");
      if (domAttr && String(domAttr).trim()) {
        return String(domAttr).trim().replace(/\/+$/, "");
      }
    }
    if (typeof window.vionaGetApiBase === "function") {
      return String(window.vionaGetApiBase() || "").replace(/\/+$/, "");
    }
    var custom = window.__VIONA_API_BASE__;
    if (typeof custom === "string" && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    var c = window.VIONA_API_CONFIG || {};
    if (c.baseUrl && String(c.baseUrl).trim()) {
      return String(c.baseUrl).trim().replace(/\/+$/, "");
    }
    return "/api";
  }

  function getToken() {
    try {
      return String(sessionStorage.getItem(sessionKey()) || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function setToken(t) {
    try {
      sessionStorage.setItem(sessionKey(), String(t || "").trim());
    } catch (_e) {}
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(sessionKey());
    } catch (_e) {}
  }

  function escHtml(s) {
    var d = document.createElement("div");
    d.textContent = String(s || "");
    return d.innerHTML;
  }

  function opsFetch(pathWithQuery, options) {
    var base = getApiBase().replace(/\/+$/, "");
    var url = base + "/ops" + pathWithQuery;
    var opts = options ? Object.assign({}, options) : {};
    opts.headers = Object.assign({}, opts.headers || {});
    var surface = getRole();
    if (surface) opts.headers["X-Viona-Ops-Page"] = surface;
    var tok = getToken();
    if (tok) {
      opts.headers["X-Ops-Token"] = tok;
      opts.headers["Authorization"] = "Bearer " + tok;
    }
    var m = String(opts.method || "GET").toUpperCase();
    if (m === "GET" && !opts.cache) opts.cache = "no-store";
    return fetch(url, opts).then(async function (r) {
      var text = await r.text();
      var d = null;
      try {
        d = text ? JSON.parse(text) : null;
      } catch (_e) {
        d = null;
      }
      if (!r.ok || !d || d.ok === false) {
        var msg = (d && d.error) || "http_" + r.status;
        throw new Error(msg);
      }
      return d;
    });
  }

  /** # sonrası tam metin OPS_LINK_TOKEN_* ile birebir aynı olmalı (kısa veya uzun fark etmez). */
  function absorbHashToken() {
    var h = String(window.location.hash || "");
    if (h.length <= 1) return;
    var raw = h.slice(1);
    try {
      raw = decodeURIComponent(raw);
    } catch (_e) {}
    raw = String(raw || "").trim();
    if (!raw) {
      try {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch (_e) {}
      return;
    }
    setToken(raw);
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (_e) {}
  }

  /**
   * WhatsApp / bazı uygulama tarayıcıları # parçasını düşürür; sunucu loglarına gitmez (yalnızca tarayıcı).
   * Örnek: ops-hk.html?k=ANAHTAR veya ?token= / ?t=
   */
  function absorbQueryToken() {
    try {
      var u = new URL(window.location.href);
      var raw = u.searchParams.get("k") || u.searchParams.get("token") || u.searchParams.get("t");
      if (!raw) return;
      raw = String(raw).trim();
      if (!raw) return;
      setToken(raw);
      u.searchParams.delete("k");
      u.searchParams.delete("token");
      u.searchParams.delete("t");
      var qs = u.searchParams.toString();
      var path = u.pathname + (qs ? "?" + qs : "") + (u.hash || "");
      history.replaceState(null, "", path);
    } catch (_e) {}
  }

  function absorbTokensFromUrl() {
    absorbHashToken();
    if (!getToken()) absorbQueryToken();
  }

  function showGateBusy() {
    var busy = document.getElementById("ops-login-busy");
    var form = document.getElementById("ops-login-form");
    if (busy) busy.classList.remove("hidden");
    if (form) form.classList.add("hidden");
  }

  function showGateForm() {
    var busy = document.getElementById("ops-login-busy");
    var form = document.getElementById("ops-login-form");
    if (busy) busy.classList.add("hidden");
    if (form) form.classList.remove("hidden");
  }

  function showLogin() {
    var login = document.getElementById("ops-login");
    var app = document.getElementById("ops-app");
    if (login) login.classList.remove("hidden");
    if (app) app.classList.add("hidden");
    if (getRole() === "hk") {
      try {
        document.body.classList.remove("admin-body--app");
      } catch (_e) {}
    }
  }

  function showApp() {
    var login = document.getElementById("ops-login");
    var app = document.getElementById("ops-app");
    if (login) login.classList.add("hidden");
    if (app) app.classList.remove("hidden");
    if (getRole() === "hk") {
      try {
        document.body.classList.add("admin-body--app");
      } catch (_e2) {}
    }
  }

  async function validateRole() {
    var d = await opsFetch("/auth/validate");
    var expected = getRole();
    if (d.role !== expected) {
      throw new Error("wrong_ops_token");
    }
    return true;
  }

  function hkDeepLinkUuid() {
    try {
      var id = String(new URL(window.location.href).searchParams.get("id") || "").trim();
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        )
      ) {
        return "";
      }
      return id;
    } catch (_e) {
      return "";
    }
  }

  function opQueryFromFilter(f) {
    var o = {};
    if (f.status) o.status = f.status;
    if (f.from) o.from = f.from;
    if (f.to) o.to = f.to;
    if (f.room && String(f.room).trim()) o.room_number = String(f.room).trim();
    return o;
  }

  function readOpFilterFromDom(prefix) {
    var status = document.getElementById(prefix + "-filter-status");
    var from = document.getElementById(prefix + "-filter-from");
    var to = document.getElementById(prefix + "-filter-to");
    var room = document.getElementById(prefix + "-filter-room");
    return {
      status: status && status.value ? status.value : "",
      from: from && from.value ? from.value : "",
      to: to && to.value ? to.value : "",
      room: room && room.value ? String(room.value).trim() : "",
    };
  }

  function clearOpFilterDom(prefix) {
    var status = document.getElementById(prefix + "-filter-status");
    var from = document.getElementById(prefix + "-filter-from");
    var to = document.getElementById(prefix + "-filter-to");
    var room = document.getElementById(prefix + "-filter-room");
    if (status) status.value = "";
    if (from) from.value = "";
    if (to) to.value = "";
    if (room) room.value = "";
  }

  /** Admin «tab-op-hk» ile aynı filtre çubuğu (id’ler app.js ile uyumlu). */
  function hkFilterBarHtml() {
    return (
      '<div class="op-filter-bar glass-block" id="op-hk-filters" role="search" aria-label="HK operasyon filtreleri">' +
      '<div class="op-filter-bar__row">' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Durum</span>' +
      '<select id="op-hk-filter-status" class="op-filter-input">' +
      '<option value="">Tüm kayıtlar</option>' +
      '<option value="new">Yeni</option>' +
      '<option value="pending">Bekliyor</option>' +
      '<option value="in_progress">Yapılıyor</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      '<option value="cancelled">İptal</option>' +
      "</select></label>" +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Kayıt başlangıç</span>' +
      '<input id="op-hk-filter-from" type="date" class="op-filter-input" autocomplete="off" /></label>' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Kayıt bitiş</span>' +
      '<input id="op-hk-filter-to" type="date" class="op-filter-input" autocomplete="off" /></label>' +
      '<label class="op-filter-field op-filter-field--room"><span class="op-filter-field__lbl">Oda</span>' +
      '<input id="op-hk-filter-room" type="text" class="op-filter-input" placeholder="Tam eşleşme" autocomplete="off" /></label>' +
      '<div class="op-filter-actions">' +
      '<button type="button" class="btn-primary btn-small" id="op-hk-filter-apply">Uygula</button>' +
      '<button type="button" class="btn-small" id="op-hk-filter-clear">Sıfırla</button>' +
      "</div></div>" +
      '<p class="op-filter-hint">Filtreler sunucuda uygulanır; <strong>Uygula</strong> ile listeyi yenilersiniz.</p></div>'
    );
  }

  /** Admin HK sekmesiyle aynı üst metin (WhatsApp / ?id= için ayrı metin yok). */
  function syncHkLead() {
    var lead = document.getElementById("ops-hk-lead");
    if (!lead) return;
    lead.innerHTML =
      "Misafir isteklerinde durum güncellemesi. Aşağıdan süz; salt okunur tam liste için <strong>İstekler</strong> sekmesini kullanın.";
  }

  async function loadHkMount(mount) {
    var ui = window.AdminUI;
    if (!ui || typeof ui.renderOperationBucket !== "function") throw new Error("ui_missing");
    var deepId = hkDeepLinkUuid();
    syncHkLead();

    function renderRequestTable(listHost, cfg) {
      ui.renderOperationBucket(listHost, {
        bucketType: "request",
        rows: cfg.rows || [],
        pagination: cfg.pagination,
        highlightRowId: cfg.highlightRowId || "",
        editableRowId: cfg.editableRowId != null ? cfg.editableRowId : "",
        onPage: typeof cfg.onPage === "function" ? cfg.onPage : null,
        buttonLabels: ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"],
        summaryRow: function (r) {
          return typeof ui.operationSummaryForType === "function"
            ? ui.operationSummaryForType("request", r)
            : "—";
        },
        onStatus: cfg.onStatus,
        onDelete: cfg.onDelete,
      });
    }

    if (deepId) {
      mount.innerHTML = '<div id="ops-hk-list-host" class="ops-hk-list-host"></div>';
      var listHostDeep = mount.querySelector("#ops-hk-list-host");

      async function loadDeepSingle() {
        try {
          var one = await opsFetch("/requests/request/" + encodeURIComponent(deepId));
          var row = one.item;
          if (!row) {
            listHostDeep.innerHTML =
              '<p class="admin-load-error">Bu UUID ile kayıt bulunamadı veya silinmiş olabilir.</p>';
            return;
          }
          renderRequestTable(listHostDeep, {
            rows: [row],
            pagination: null,
            highlightRowId: deepId,
            editableRowId: "",
            onPage: null,
            onStatus: async function (bt, id, status) {
              await opsFetch(
                "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: status }),
                },
              );
              postOpsMutation();
              await loadDeepSingle();
            },
            onDelete: async function (bt, id) {
              await opsFetch("/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id), {
                method: "DELETE",
              });
              postOpsMutation();
              try {
                var u = new URL(window.location.href);
                u.searchParams.delete("id");
                var qs = u.searchParams.toString();
                window.location.href = u.pathname + (qs ? "?" + qs : "") + (u.hash || "");
              } catch (_e2) {
                listHostDeep.innerHTML =
                  '<p class="admin-load-error">Kayıt silindi. Tam liste için adres çubuğundan ?id= kaldırıp sayfayı yenileyin.</p>';
              }
            },
          });
        } catch (e) {
          listHostDeep.innerHTML =
            '<p class="admin-load-error">' + escHtml(formatErr(e)) + "</p>";
        }
      }

      await loadDeepSingle();
      wireOpsCrossTabListRefresh(function () {
        void loadDeepSingle();
      });
      return;
    }

    mount.innerHTML = hkFilterBarHtml() + '<div id="ops-hk-list-host" class="ops-hk-list-host"></div>';
    var listHost = mount.querySelector("#ops-hk-list-host");
    var hkFilterState = { status: "", from: "", to: "", room: "" };
    var page = 1;

    var applyBtn = document.getElementById("op-hk-filter-apply");
    var clearBtn = document.getElementById("op-hk-filter-clear");
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        var next = readOpFilterFromDom("op-hk");
        hkFilterState.status = next.status;
        hkFilterState.from = next.from;
        hkFilterState.to = next.to;
        hkFilterState.room = next.room;
        page = 1;
        void load(1);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        hkFilterState.status = "";
        hkFilterState.from = "";
        hkFilterState.to = "";
        hkFilterState.room = "";
        clearOpFilterDom("op-hk");
        page = 1;
        void load(1);
      });
    }

    async function load(pageNum) {
      page = pageNum != null ? pageNum : page;
      var q = Object.assign(
        {
          type: "request",
          page: String(page),
          pageSize: String(PAGE_SIZE),
        },
        opQueryFromFilter(hkFilterState),
      );
      var res = await opsFetch("/requests?" + new URLSearchParams(q).toString());
      renderRequestTable(listHost, {
        rows: res.items || [],
        pagination: res.pagination,
        highlightRowId: "",
        onPage: function (p) {
          void load(p);
        },
        onStatus: async function (bt, id, status) {
          await opsFetch(
            "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: status }),
            },
          );
          postOpsMutation();
          await load(page);
        },
        onDelete: async function (bt, id) {
          await opsFetch("/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id), {
            method: "DELETE",
          });
          postOpsMutation();
          await load(page);
        },
      });
    }

    await load(1);
    wireOpsCrossTabListRefresh(function () {
      void load(page);
    });
  }

  async function loadTechMount(mount) {
    var ui = window.AdminUI;
    if (!ui || typeof ui.renderOperationBucket !== "function") throw new Error("ui_missing");
    var page = 1;
    async function load(pageNum) {
      page = pageNum != null ? pageNum : page;
      var q =
        "?" +
        new URLSearchParams({
          type: "fault",
          page: String(page),
          pageSize: String(PAGE_SIZE),
        }).toString();
      var res = await opsFetch("/requests" + q);
      ui.renderOperationBucket(mount, {
        bucketType: "fault",
        rows: res.items || [],
        pagination: res.pagination,
        onPage: function (p) {
          void load(p);
        },
        buttonLabels: ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"],
        onStatus: async function (bt, id, status) {
          await opsFetch(
            "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: status }),
            },
          );
          postOpsMutation();
          await load(page);
        },
        onDelete: async function (bt, id) {
          await opsFetch("/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id), {
            method: "DELETE",
          });
          postOpsMutation();
          await load(page);
        },
      });
    }
    await load(1);
    wireOpsCrossTabListRefresh(function () {
      void load(page);
    });
  }

  async function loadFrontMount(mount) {
    var ui = window.AdminUI;
    if (!ui || typeof ui.renderOperationFront !== "function") throw new Error("ui_missing");
    var pages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
    async function loadAll() {
      var parts = await Promise.all([
        opsFetch("/requests/front-summary").catch(function () {
          return { summary: null };
        }),
        opsFetch(
          "/requests?" +
            new URLSearchParams({
              type: "complaint",
              page: String(pages.complaint),
              pageSize: String(PAGE_SIZE),
            }).toString(),
        ),
        opsFetch(
          "/requests?" +
            new URLSearchParams({
              type: "guest_notification",
              page: String(pages.guest_notification),
              pageSize: String(PAGE_SIZE),
            }).toString(),
        ),
        opsFetch(
          "/requests?" +
            new URLSearchParams({
              type: "late_checkout",
              page: String(pages.late_checkout),
              pageSize: String(PAGE_SIZE),
            }).toString(),
        ),
      ]);
      var summary = parts[0] && parts[0].summary != null ? parts[0].summary : null;
      var c = parts[1];
      var gn = parts[2];
      var lc = parts[3];
      ui.renderOperationFront(
        mount,
        { complaint: c, guest_notification: gn, late_checkout: lc },
        {
          onPage: function (bt, p) {
            pages[bt] = p;
            void loadAll();
          },
          onStatus: async function (bt, id, status) {
            await opsFetch(
              "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: status }),
              },
            );
            postOpsMutation();
            await loadAll();
          },
          onDelete: async function (bt, id) {
            await opsFetch("/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id), {
              method: "DELETE",
            });
            postOpsMutation();
            await loadAll();
          },
        },
        summary,
      );
    }
    await loadAll();
    wireOpsCrossTabListRefresh(function () {
      void loadAll();
    });
  }

  function formatErr(e) {
    var m = e && e.message ? String(e.message) : "";
    if (m === "http_404")
      return "API’de /api/ops bulunamadı. Render’da Node servisinin son commit ile yeniden deploy edildiğini ve doğru repoya bağlı olduğunu kontrol edin.";
    if (m === "unauthorized" || m === "http_401")
      return "Sunucu girişi reddetti. Render’da OPS_TRUST_OPS_PAGE_HEADER=1 ekleyip servisi yeniden başlatın (linkte token gerekmez; yalnızca güvenilen admin sitesinden). Alternatif: OPS_LINK_TOKEN_* ile # veya ?k= aynı olsun. Ayrıca Authorization: Bearer bazı proxy’lerde X-Ops-Token’tan daha iyi iletilir — sayfayı sert yenileyin (ops-light.js güncel mi).";
    if (m === "wrong_ops_token") return "Bu şifre bu sayfa için değil (yanlış ekip bağlantısı).";
    if (m === "forbidden_bucket" || m === "http_403") return "Bu işlem bu hesap için izinli değil.";
    if (m === "http_503" || m.indexOf("datastore") !== -1) return "Sunucu veya veritabanı şu an kullanılamıyor.";
    return m ? "Hata: " + m : "Bir hata oluştu.";
  }

  async function bootApp() {
    var role = getRole();
    var titleEl = document.getElementById("ops-app-title");
    if (titleEl) titleEl.textContent = TITLES[role] || "Operasyon";
    var mount = document.getElementById("ops-mount");
    if (!mount) return;
    mount.innerHTML = '<p class="ops-light-loading">Yükleniyor…</p>';
    try {
      if (role === "hk") await loadHkMount(mount);
      else if (role === "tech") await loadTechMount(mount);
      else if (role === "front") await loadFrontMount(mount);
      else throw new Error("invalid_role");
    } catch (e) {
      mount.innerHTML = '<p class="ops-light-error">' + escHtml(formatErr(e)) + "</p>";
    }
  }

  async function tryEnter() {
    var err = document.getElementById("ops-login-error");
    if (err) err.textContent = "";
    try {
      await validateRole();
      showApp();
      await bootApp();
    } catch (e) {
      clearToken();
      showGateForm();
      if (err) err.textContent = formatErr(e);
    }
  }

  function wireLogout() {
    var b = document.getElementById("ops-logout");
    if (!b) return;
    b.addEventListener("click", function () {
      clearToken();
      showGateForm();
      showLogin();
      var pw = document.getElementById("ops-password");
      if (pw) pw.value = "";
    });
  }

  function wireLoginForm() {
    var form = document.getElementById("ops-login-form");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var pw = document.getElementById("ops-password");
      var v = (pw && pw.value) || "";
      setToken(v.trim());
      await tryEnter();
    });
  }

  function wirePwToggle() {
    var pw = document.getElementById("ops-password");
    var t = document.getElementById("ops-password-toggle");
    if (!pw || !t) return;
    t.addEventListener("click", function () {
      var show = pw.type === "password";
      pw.type = show ? "text" : "password";
      t.textContent = show ? "Gizle" : "Göster";
    });
  }

  function init() {
    var role = getRole();
    if (!role || !TITLES[role]) {
      document.body.innerHTML = "<p>Geçersiz operasyon sayfası.</p>";
      return;
    }
    absorbTokensFromUrl();
    document.title = (TITLES[role] || "Operasyon") + " · Viona";
    var h = document.getElementById("ops-login-heading");
    if (h) h.textContent = TITLES[role];
    var busyTitle = document.getElementById("ops-login-busy-title");
    if (busyTitle) busyTitle.textContent = TITLES[role] || "Operasyon";
    var deeplinkHint = document.getElementById("ops-deeplink-hint");
    if (deeplinkHint) {
      deeplinkHint.textContent = "";
      deeplinkHint.classList.add("hidden");
    }
    wireLoginForm();
    wirePwToggle();
    wireLogout();
    showLogin();
    showGateBusy();
    void tryEnter();
  }

  function onHashChange() {
    var role = getRole();
    if (!role || !TITLES[role]) return;
    absorbTokensFromUrl();
    showLogin();
    showGateBusy();
    void tryEnter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("hashchange", onHashChange);
})();
