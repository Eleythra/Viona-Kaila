/**
 * Statik site bayrakları (build/deploy ile değiştirilir; Node .env okunmaz).
 *
 * Kapı katılığı — iki katman:
 * 1) Render: `VIONA_UI_GATE_STRICT=1` → başarılı `/guest-gate/status` yanıtında `strict: true`; tarayıcı sessionStorage’da saklar.
 * 2) Bu dosya: `window.__VIONA_GATE_STRICT__ = true` → İLK yüklemede bile status düşerse ana sayfaya geçiş bloklanır (otel şifre kullanıyorsa açın).
 *
 * Şifre kullanmıyorsanız ikisini de kapalı tutun (varsayılan false).
 */
(function () {
  "use strict";
  window.__VIONA_GATE_STRICT__ = false;
})();
