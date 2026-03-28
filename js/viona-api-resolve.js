/**
 * API kökü. Üretimde göreli "/api" (Vercel rewrites → Node). Önce elle override.
 * Sıra: __VIONA_API_BASE__ → localhost|file → 127.0.0.1:3001/api → /api
 */
(function () {
  "use strict";

  window.vionaGetApiBase = function () {
    var custom = window.__VIONA_API_BASE__;
    if (typeof custom === "string" && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    var host = String(window.location.hostname || "");
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://127.0.0.1:3001/api";
    }
    if (window.location.protocol === "file:") {
      return "http://127.0.0.1:3001/api";
    }
    return "/api";
  };
})();
