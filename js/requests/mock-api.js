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
  window.submitGuestRequest = async function (payload) {
    var cfg = window.VIONA_API_CONFIG || {};
    var endpoint = cfg.guestRequestsEndpoint || "/api/guest-requests";

    var response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    var data = await response.json();

    if (!response.ok || !data || data.ok !== true || !data.id) {
      throw new Error((data && data.error) || "guest_request_submit_failed");
    }
    return {
      ok: true,
      id: String(data.id),
      bucket: String(data.bucket || ""),
    };
  };
})();
