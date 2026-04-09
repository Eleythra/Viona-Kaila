/**
 * Canlı Node API (Hetzner): misafir formları, admin proxy, WhatsApp operasyon tetikleri.
 *
 * Üretim: `https://api.eleythra.com/api` — DNS A kaydı VPS’e; sunucuda HTTPS (443) → Node :3001.
 *
 * Vercel’de aynı kökten `/api` kullanıyorsanız `vercel.json` bu adresi prox’lar; isterseniz burayı `""`
 * bırakıp yalnızca same-origin `/api` de kullanılabilir.
 *
 * Python sohbet asistanı Render’da kalır; bu dosya onu değiştirmez (`ASSISTANT_CHAT_ENDPOINT` sunucu .env).
 */
(function () {
  "use strict";
  window.__VIONA_NODE_RENDER_API__ = "https://api.eleythra.com/api";
})();
