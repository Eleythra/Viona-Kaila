/**
 * Statik site bayrakları (build/deploy ile değiştirilir; Node .env okunmaz).
 *
 * Kapı katılığı — iki katman:
 * 1) Render: `VIONA_UI_GATE_STRICT=1` → başarılı `/guest-gate/status` yanıtında `strict: true`; tarayıcı sessionStorage’da saklar.
 * 2) Bu dosya: `window.__VIONA_GATE_STRICT__ = true` → İLK yüklemede bile status düşerse ana sayfaya geçiş bloklanır (otel şifre kullanıyorsa açın).
 *
 * Kapı oturumu (aynı sekme): sayfa yenilenince ana sayfada kalınır; sekme kapanınca sessionStorage silinir.
 * Boşta kalma süresi (ms): isteğe bağlı `window.__VIONA_GATE_IDLE_MS__` — aralık 10_000 … 86_400_000; tanımsızsa uygulama 180_000 (3 dk) kullanır.
 *
 * Şifre kullanmıyorsanız ikisini de kapalı tutun (varsayılan false).
 */
(function () {
  "use strict";
  window.__VIONA_GATE_STRICT__ = false;
})();
