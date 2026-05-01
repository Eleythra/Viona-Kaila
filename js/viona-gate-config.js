/**
 * Misafir erişim şifresi — haftalık değişimde VERSION değerini artırın.
 * Böylece cihazda kayıtlı eski onay geçersiz olur ve yeni şifre sorulur.
 */
(function () {
  "use strict";
  window.VIONA_GATE = {
    VERSION: 1,
    /** Güncel şifre (Türkçe İ ile girilebilir; İngilizce klavyede Viona2026 da kabul edilir). */
    PASSWORD: "Vİona2026",
  };
})();
