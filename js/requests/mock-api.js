/**
 * @typedef {Object} GuestRequestPayload
 * @property {'request'|'complaint'|'fault'|'reservation_alacarte'|'reservation_spa'} type
 * @property {string} name
 * @property {string} room
 * @property {string} nationality
 * @property {string} description
 * @property {string[]} [categories]
 * @property {string} [otherCategoryNote]
 * @property {Object} [reservation]
 */

(function () {
  "use strict";

  /**
   * @param {GuestRequestPayload} payload
   * @returns {Promise<{ ok: boolean, id: string }>}
   */
  window.submitGuestRequest = function (payload) {
    return new Promise(function (resolve) {
      var id = "req-" + Date.now().toString(36);
      console.info("[Viona mock API] submitGuestRequest", id, payload);
      setTimeout(function () {
        resolve({ ok: true, id: id });
      }, 400);
    });
  };
})();
