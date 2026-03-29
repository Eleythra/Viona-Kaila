/**
 * Viona sohbet — frontend yapılandırması
 * Backend endpoint'i ve istemci tarafı varsayılanlar.
 */
(function () {
  "use strict";

  var isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  var apiBase =
    typeof window.vionaGetApiBase === "function"
      ? window.vionaGetApiBase()
      : isLocalhost
        ? "http://127.0.0.1:3001/api"
        : "/api";

  var chatEndpoint = apiBase + "/chat";

  window.VIONA_CHAT_CONFIG = {
    endpoint: chatEndpoint,
    ttsEndpoint: apiBase + "/tts",
    sttEndpoint: apiBase + "/stt",
    timeoutMs: 15000,
    /** Sesli tur: STT sonrası /api/chat (Python) daha uzun sürebilir */
    voiceUpstreamTimeoutMs: 35000,
    voiceUpstreamMaxCapMs: 90000,
    speechSttTimeoutMs: 25000,
    speechTtsTimeoutMs: 35000,
    errorReply:
      "Şu anda asistana kısa süreli erişim sorunu yaşıyorum. Lütfen birkaç saniye sonra tekrar deneyiniz.",
  };
})();
