/**
 * Canlı API tek adres: Render’daki Node (Express). Tarayıcıdan tüm /api buraya gider;
 * Node /api/chat isteğini sunucu içinden Python asistana iletir (CORS tek yerde).
 *
 * Render’da bu Web Service için zorunlu ortam değişkenleri:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ASSISTANT_CHAT_ENDPOINT (Python /api/chat tam URL)
 *
 * Sağlık kontrolü: https://BU-HOST/api/health → JSON, hasSupabase:true ve assistantEndpoint dolu olmalı.
 * Servis adın farklıysa yalnızca aşağıdaki satırı güncelle.
 */
(function () {
  "use strict";
  window.__VIONA_NODE_RENDER_API__ = "https://viona-node-api.onrender.com/api";
})();
