/**
 * Canlı Node API (Hetzner VPS; önceden Render).
 *
 * Vercel + HTTPS: `""` bırakın — `api-config.js` tabanı `/api` olur; `vercel.json` bunu
 * sunucu tarafında Hetzner Node’a prox’lar (HTTPS sayfadan http:// IP’ye doğrudan istek = mixed content, engellenir).
 *
 * İsteğe bağlı — doğrudan IP (yalnızca HTTP ile açılan site veya yerel test):
 *   window.__VIONA_NODE_RENDER_API__ = "http://178.104.104.45:3001/api";
 *
 * API’yi HTTPS + domain ile yayınladığınızda buraya `https://api.domaininiz/api` yazabilirsiniz.
 */
(function () {
  "use strict";
  window.__VIONA_NODE_RENDER_API__ = "";
})();
