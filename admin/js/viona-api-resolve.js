/**
 * API kökü.
 * Sıra: __VIONA_API_BASE__ → (Vercel/proxy: /api) → localhost|file → __VIONA_NODE_RENDER_API__ → /api
 *
 * Canlı Vercel: aynı origin /api kullanılır (vercel.json → Render); tarayıcı CORS gerektirmez.
 * Doğrudan Render alan adı yalnızca yerel / bilinmeyen host veya override ile.
 */
(function () {
  "use strict";

  /** HTTPS/HTTP canlıda Vercel rewrite üzerinden /api (eleythra.com, *.vercel.app, …). */
  window.vionaShouldUseRelativeApiBase = function () {
    var host = String(window.location.hostname || "");
    var proto = String(window.location.protocol || "");
    if (host === "localhost" || host === "127.0.0.1") return false;
    if (proto === "file:") return false;
    if (proto !== "https:" && proto !== "http:") return false;
    if (host.endsWith(".vercel.app")) return true;
    if (host.endsWith(".eleythra.com")) return true;
    return false;
  };

  window.vionaGetApiBase = function () {
    var custom = window.__VIONA_API_BASE__;
    if (typeof custom === "string" && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    if (typeof window.vionaShouldUseRelativeApiBase === "function" && window.vionaShouldUseRelativeApiBase()) {
      return "/api";
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
