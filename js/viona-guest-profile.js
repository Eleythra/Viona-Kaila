/**
 * PMS kapısı sonrası misafir özeti (sessionStorage) — chat ve formlarda otomatik doldurma için hazırlık.
 * Okuma: window.vionaGuestProfile.get() → { guestName, roomNo, resId, resNameId, guestPhone?, guestEmail? } | null
 */
(function () {
  "use strict";
  var VER = "viona_guest_identity_verified";
  var NAME = "viona_guest_identity_name";
  var ROOM = "viona_guest_identity_room";
  var PMS = "viona_guest_pms_verified";
  var META = "viona_guest_pms_meta_json";
  var PHONE = "viona_guest_identity_phone";
  var EMAIL = "viona_guest_identity_email";

  function safeTrim(s) {
    return String(s == null ? "" : s).trim();
  }

  window.vionaGuestProfile = {
    /**
     * @param {{
     *   guestName?: string,
     *   roomNo?: string,
     *   resId?: number,
     *   resNameId?: number,
     *   guestPhone?: string|null,
     *   guestEmail?: string|null,
     * }} g
     */
    persist: function (g) {
      if (!g) return;
      try {
        var room = safeTrim(g.roomNo);
        var nm = safeTrim(g.guestName);
        if (!room) return;
        sessionStorage.setItem(VER, "1");
        sessionStorage.setItem(PMS, "1");
        sessionStorage.setItem(ROOM, room);
        sessionStorage.setItem(NAME, nm || "");
        var ph = safeTrim(g.guestPhone);
        var em = safeTrim(g.guestEmail);
        if (ph) sessionStorage.setItem(PHONE, ph.slice(0, 40));
        else sessionStorage.removeItem(PHONE);
        if (em) sessionStorage.setItem(EMAIL, em.slice(0, 120));
        else sessionStorage.removeItem(EMAIL);
        var meta = {};
        if (g.resId != null && String(g.resId).trim() !== "") meta.resId = Number(g.resId);
        if (g.resNameId != null && String(g.resNameId).trim() !== "") meta.resNameId = Number(g.resNameId);
        if (Object.keys(meta).length) sessionStorage.setItem(META, JSON.stringify(meta));
        else sessionStorage.removeItem(META);
      } catch (_e) {
        /* private mode */
      }
    },

    /** Misafir kimlik anahtarlarını temizler (operatör bypass ayrı tutulur). */
    clear: function () {
      try {
        sessionStorage.removeItem(VER);
        sessionStorage.removeItem(NAME);
        sessionStorage.removeItem(ROOM);
        sessionStorage.removeItem(PMS);
        sessionStorage.removeItem(PHONE);
        sessionStorage.removeItem(EMAIL);
        sessionStorage.removeItem(META);
      } catch (_e) {
        /* private mode */
      }
    },

    /**
     * @returns {{
     *   guestName: string,
     *   roomNo: string,
     *   resId: number|null,
     *   resNameId: number|null,
     *   guestPhone: string,
     *   guestEmail: string,
     *   pmsVerified: boolean,
     * } | null}
     */
    get: function () {
      try {
        if (sessionStorage.getItem(VER) !== "1" || sessionStorage.getItem(PMS) !== "1") return null;
        var room = safeTrim(sessionStorage.getItem(ROOM));
        if (!room) return null;
        var guestName = safeTrim(sessionStorage.getItem(NAME));
        var guestPhone = safeTrim(sessionStorage.getItem(PHONE));
        var guestEmail = safeTrim(sessionStorage.getItem(EMAIL));
        var resId = null;
        var resNameId = null;
        var raw = sessionStorage.getItem(META);
        if (raw) {
          try {
            var o = JSON.parse(raw);
            if (o && Number.isFinite(Number(o.resId))) resId = Math.trunc(Number(o.resId));
            if (o && Number.isFinite(Number(o.resNameId))) resNameId = Math.trunc(Number(o.resNameId));
          } catch (_j) {
            /* yoksay */
          }
        }
        return {
          guestName: guestName,
          roomNo: room,
          resId: resId,
          resNameId: resNameId,
          guestPhone: guestPhone,
          guestEmail: guestEmail,
          pmsVerified: true,
        };
      } catch (_e) {
        return null;
      }
    },
  };
})();
