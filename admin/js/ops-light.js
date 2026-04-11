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
  }

  function showApp() {
    var login = document.getElementById("ops-login");
    var app = document.getElementById("ops-app");
    if (login) login.classList.add("hidden");
    if (app) app.classList.remove("hidden");
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

  function hkFormatCategories(row) {
    if (!row) return "—";
    var c = row.categories;
    if (Array.isArray(c) && c.length) return c.join(", ");
    if (c && typeof c === "object" && !Array.isArray(c)) {
      try {
        return JSON.stringify(c);
      } catch (_e2) {
        return "—";
      }
    }
    if (c != null && String(c).trim()) return String(c).trim();
    return row.category ? String(row.category) : "—";
  }

  function renderHkSelectedPanel(panelEl, row, reloadList) {
    var ui = window.AdminUI;
    if (!panelEl || !row) return;
    var id = String(row.id || "");
    var st = ui && ui.normalizeBucketStatus ? ui.normalizeBucketStatus(row.status) : String(row.status || "new");
    var stLabel = ui && ui.issueStatusLabel ? ui.issueStatusLabel("request", st) : st;
    var stats = [
      { k: "Misafir", v: row.guest_name || "—" },
      { k: "Oda", v: row.room_number || "—" },
      { k: "Kategori / seçimler", v: hkFormatCategories(row) },
      { k: "Açıklama", v: String(row.description || "").trim() || "—" },
      { k: "Durum", v: stLabel },
    ];
    var dl = stats
      .map(function (x) {
        return (
          "<div><dt>" + escHtml(x.k) + "</dt><dd>" + escHtml(String(x.v)) + "</dd></div>"
        );
      })
      .join("");
    var btns = ["pending", "in_progress", "done", "rejected"].map(function (stat, i) {
      var labels = ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"];
      var on = st === stat || (st === "new" && stat === "pending");
      return (
        '<button type="button" class="btn-small op-st js-op-hk-selected-st' +
        (on ? " is-active" : "") +
        '" data-status="' +
        escHtml(stat) +
        '">' +
        escHtml(labels[i]) +
        "</button>"
      );
    });
    panelEl.innerHTML =
      '<section class="ops-hk-selected glass-block" aria-label="Seçili kayıt">' +
      '<div class="ops-hk-selected__head"><h2 class="ops-hk-selected__title">Seçili kayıt</h2>' +
      '<p class="ops-hk-selected__hint">WhatsApp bağlantısıyla bu kayıt açıldı. Durumu buradan veya aşağıdaki tablodan güncelleyebilirsiniz.</p></div>' +
      '<dl class="ops-hk-selected__dl">' +
      dl +
      "</dl>" +
      '<div class="ops-hk-selected__actions"><span class="ops-hk-selected__act-lbl">İşlem</span>' +
      '<div class="op-actions-cell"><div class="op-status-btns op-status-btns--hktech" data-op-id="' +
      escHtml(id) +
      '">' +
      btns.join("") +
      '</div><button type="button" class="btn-small op-del js-op-hk-selected-del" data-op-id="' +
      escHtml(id) +
      '">Sil</button></div></div></section>';

    panelEl.querySelectorAll(".js-op-hk-selected-st").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var stat = btn.getAttribute("data-status");
        var p = opsFetch(
          "/requests/" + encodeURIComponent("request") + "/" + encodeURIComponent(id) + "/status",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: stat }),
          },
        );
        btn.disabled = true;
        p.then(function () {
          postOpsMutation();
          void reloadList();
        }).finally(function () {
          btn.disabled = false;
        });
      });
    });
    var del = panelEl.querySelector(".js-op-hk-selected-del");
    if (del) {
      del.addEventListener("click", function () {
        if (!window.confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) return;
        del.disabled = true;
        opsFetch("/requests/" + encodeURIComponent("request") + "/" + encodeURIComponent(id), {
          method: "DELETE",
        })
          .then(function () {
            postOpsMutation();
            void reloadList();
          })
          .finally(function () {
            del.disabled = false;
          });
      });
    }
  }

  async function loadHkMount(mount) {
    var ui = window.AdminUI;
    if (!ui || typeof ui.renderOperationBucket !== "function") throw new Error("ui_missing");
    var deepId = hkDeepLinkUuid();
    mount.innerHTML =
      '<div id="ops-hk-selected-host" class="ops-hk-selected-host"></div><div id="ops-hk-list-host" class="ops-hk-list-host"></div>';
    var selHost = mount.querySelector("#ops-hk-selected-host");
    var listHost = mount.querySelector("#ops-hk-list-host");
    if (!deepId && selHost) selHost.innerHTML = "";

    var page = 1;

    async function paintSelected(reloadList) {
      if (!deepId || !selHost) return;
      try {
        var one = await opsFetch("/requests/request/" + encodeURIComponent(deepId));
        var row = one.item;
        if (!row) {
          selHost.innerHTML = '<p class="ops-hk-selected-error">Kayıt bulunamadı.</p>';
          return;
        }
        renderHkSelectedPanel(selHost, row, reloadList);
      } catch (e) {
        selHost.innerHTML =
          '<p class="ops-hk-selected-error">' + escHtml(formatErr(e)) + "</p>";
      }
    }

    async function load(pageNum) {
      page = pageNum != null ? pageNum : page;
      var q =
        "?" +
        new URLSearchParams({
          type: "request",
          page: String(page),
          pageSize: String(PAGE_SIZE),
        }).toString();
      var res = await opsFetch("/requests" + q);
      ui.renderOperationBucket(listHost, {
        bucketType: "request",
        rows: res.items || [],
        pagination: res.pagination,
        highlightRowId: deepId,
        onPage: function (p) {
          void load(p);
        },
        buttonLabels: ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"],
        summaryRow: function (r) {
          return typeof ui.operationSummaryForType === "function"
            ? ui.operationSummaryForType("request", r)
            : "—";
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
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var tr = listHost.querySelector("tr.ops-row--deep-link");
          if (tr && typeof tr.scrollIntoView === "function") {
            tr.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        });
      });
      await paintSelected(function () {
        void load(page);
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
