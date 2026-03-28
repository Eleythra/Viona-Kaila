/**
 * Viona sohbet — frontend yapılandırması
 * Backend endpoint'i ve istemci tarafı varsayılanlar.
 */
(function () {
  "use strict";

  var isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  var chatEndpoint =
    typeof window.vionaGetApiBase === "function"
      ? window.vionaGetApiBase() + "/chat"
      : isLocalhost
        ? "http://127.0.0.1:3001/api/chat"
        : "/api/chat";

  window.VIONA_CHAT_CONFIG = {
    endpoint: chatEndpoint,
    timeoutMs: 15000,
    errorReply:
      "Şu anda asistana kısa süreli erişim sorunu yaşıyorum. Lütfen birkaç saniye sonra tekrar deneyiniz.",
  };
})();
