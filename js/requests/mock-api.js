/**
 * @typedef {Object} GuestRequestPayload
 * @property {'request'|'complaint'|'fault'|'guest_notification'|'late_checkout'|'reservation_alacarte'|'reservation_spa'} type
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
    var endpoint =
      typeof window.vionaGetApiBase === "function"
        ? window.vionaGetApiBase() + "/guest-requests"
        : cfg.guestRequestsEndpoint || "/api/guest-requests";

    var ctrl = new AbortController();
    var timeoutMs = 60000;
    var tid = setTimeout(function () {
      ctrl.abort();
    }, timeoutMs);
    var response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
        signal: ctrl.signal,
      });
    } catch (e) {
      var aborted =
        e &&
        (e.name === "AbortError" ||
          String(e.message || "").toLowerCase().indexOf("abort") >= 0);
      if (aborted) {
        throw new Error("request_timeout");
      }
      throw e;
    } finally {
      clearTimeout(tid);
    }
    var text = await response.text();
    var data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_parseErr) {
      data = null;
    }

    if (!response.ok || !data || data.ok !== true || !data.id) {
      var serverErr =
        data && typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : null;
      if (!serverErr && !text) {
        serverErr = "http_" + response.status;
      } else if (!serverErr) {
        serverErr = "guest_request_bad_response";
      }
      throw new Error(serverErr);
    }
    return {
      ok: true,
      id: String(data.id),
      bucket: String(data.bucket || ""),
    };
  };
})();
