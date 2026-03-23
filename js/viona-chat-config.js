/**
 * Viona sohbet — frontend yapılandırması
 * Backend endpoint'i ve istemci tarafı varsayılanlar.
 */
(function () {
  "use strict";

  var isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  window.VIONA_CHAT_CONFIG = {
    endpoint: isLocalhost ? "http://localhost:3001/api/chat" : "/api/chat",
    errorReply:
      "Şu anda asistana ulaşılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
  };
})();
