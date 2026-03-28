/**
 * API kökü. Sıra: __VIONA_API_BASE__ → localhost|file → __VIONA_NODE_RENDER_API__ → /api
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
    var nodeBase = window.__VIONA_NODE_RENDER_API__;
    if (typeof nodeBase === "string" && nodeBase.trim()) {
      return nodeBase.trim().replace(/\/+$/, "");
    }
    return "/api";
  };
})();
