/**
 * Tek yerden API kökü: __VIONA_API_BASE__ → VIONA_API_CONFIG.baseUrl → *.vercel.app → Render → /api
 * api-config.js yüklendikten sonra da çağrılabilir (baseUrl güncellenmiş olur).
 */
(function () {
  "use strict";

  var RENDER_API_BASE = "https://viona-kaila.onrender.com/api";

  window.vionaGetApiBase = function () {
    var custom = window.__VIONA_API_BASE__;
    if (typeof custom === "string" && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    var c = window.VIONA_API_CONFIG || {};
    if (c.baseUrl && String(c.baseUrl).trim()) {
      return String(c.baseUrl).trim().replace(/\/+$/, "");
    }
    var host = String(window.location.hostname || "");
    if (host.indexOf("vercel.app") !== -1) {
      return RENDER_API_BASE;
    }
    return "/api";
  };
})();
