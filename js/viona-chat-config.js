/**
 * Viona sohbet — backend / RAG API bağlantısı
 * Endpoint boş bırakıldığında yerel önizleme yanıtı kullanılır.
 *
 * Beklenen istek gövdesi (POST JSON):
 *   { "messages": [{ "role": "user"|"assistant", "content": "..." }], "locale": "tr"|"en"|"de"|"ru" }
 * Beklenen yanıt (200):
 *   { "reply": "..." } veya { "message": "..." } veya { "text": "..." } veya { "answer": "..." }
 */
(function () {
  "use strict";

  window.VIONA_CHAT_CONFIG = {
    /** Örn. "/api/viona/chat" veya tam URL. Boş = demo modu. */
    endpoint: "",
    /** fetch için ek başlıklar (örn. Authorization) */
    headers: {},
    /** "same-origin" | "omit" | "include" */
    credentials: "same-origin",
    /** Demo modunda yapay gecikme (ms) */
    mockDelayMs: 850,
  };
})();
