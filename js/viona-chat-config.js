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
    realtimeSessionEndpoint: apiBase + "/realtime/session",
    /** OpenAI Realtime built-in ses adı (ör. marin, alloy). */
    openAiRealtimeVoice: "marin",
    realtimeSessionTimeoutMs: 22000,
    realtimeCallsTimeoutMs: 35000,
    /** Realtime: output_audio_buffer.stopped gelmezse idle (ms). */
    realtimeSpeakFallbackMs: 14000,
    timeoutMs: 15000,
    /** Sesli tur: tool sonrası /api/chat (Python) daha uzun sürebilir */
    voiceUpstreamTimeoutMs: 35000,
    voiceUpstreamMaxCapMs: 90000,
    errorReply:
      "Şu anda asistana kısa süreli erişim sorunu yaşıyorum. Lütfen birkaç saniye sonra tekrar deneyiniz.",
  };
})();
