(function () {
  "use strict";

  var TZ = "Europe/Istanbul";

  function istanbulMinutes(d) {
    var dt = d instanceof Date ? d : new Date();
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(dt);
    var h = 0;
    var m = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "hour") h = parseInt(parts[i].value, 10) || 0;
      if (parts[i].type === "minute") m = parseInt(parts[i].value, 10) || 0;
    }
    return h * 60 + m;
  }

  /**
   * 00:00–07:59 Europe/Istanbul: operasyonel 4 form türü kapalı.
   */
  window.vionaIsOperationalQuietHours = function (d) {
    return istanbulMinutes(d) < 8 * 60;
  };
})();
