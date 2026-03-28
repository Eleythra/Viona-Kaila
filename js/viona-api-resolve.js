/**
 * API kökü. ÖNEMLİ: baseUrl bazen "/api" (göreli) kalır — önce *.vercel.app kontrolü yapılmalı,
 * yoksa istekler yanlışlıkla vercel.app/api üzerinde kalır (404).
 * Sıra: __VIONA_API_BASE__ → *.vercel.app → Render → VIONA_API_CONFIG.baseUrl → /api
 */
(function () {
  "use strict";

  var RENDER_API_BASE = "https://viona-kaila.onrender.com/api";

  window.vionaGetApiBase = function () {
    var custom = window.__VIONA_API_BASE__;
    if (typeof custom === "string" && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    var host = String(window.location.hostname || "");
    if (host.indexOf("vercel.app") !== -1) {
      return RENDER_API_BASE;
    }
    var c = window.VIONA_API_CONFIG || {};
    if (c.baseUrl && String(c.baseUrl).trim()) {
      return String(c.baseUrl).trim().replace(/\/+$/, "");
    }
    return "/api";
  };
})();
