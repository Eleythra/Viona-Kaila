/**
 * Canlı API tek adres: Render’daki Node (Express). Tarayıcıdan tüm /api buraya gider;
 * Node /api/chat isteğini sunucu içinden Python asistana iletir (CORS tek yerde).
 *
 * Render’da bu Web Service için zorunlu ortam değişkenleri:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ASSISTANT_CHAT_ENDPOINT (Python /api/chat tam URL)
 *
 * Sağlık kontrolü yalnızca bu Node servisinde: https://BU-HOST/api/health
 *   (Python/asistan URL’si değil; örn. viona-kaila…/api/health farklı uygulama dönebilir.)
 * JSON’da hasSupabase, adminAuthConfigured, whatsappOperational (Cloud API; grup botu yok) kontrol edilir.
 * Servis adın farklıysa yalnızca aşağıdaki satırı güncelle.
 */
(function () {
  "use strict";
  window.__VIONA_NODE_RENDER_API__ = "https://viona-node-api.onrender.com/api";
})();
