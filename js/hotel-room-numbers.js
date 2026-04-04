/**
 * Kaila Beach geçerli oda numaraları (363). Sunucu `server/src/lib/hotel-room-numbers.js` ile senkron.
 */
(function (global) {
  "use strict";
  var RANGES = [
    [1001, 1008],
    [1101, 1123],
    [1201, 1244],
    [1301, 1342],
    [1401, 1442],
    [1501, 1542],
    [1601, 1638],
    [2101, 2108],
    [2201, 2208],
    [2301, 2308],
    [2401, 2408],
    [2501, 2508],
    [2601, 2612],
    [3101, 3112],
    [3201, 3212],
    [3301, 3312],
    [3401, 3412],
    [3501, 3512],
    [3601, 3612],
  ];
  var SET = Object.create(null);
  for (var ri = 0; ri < RANGES.length; ri++) {
    var a = RANGES[ri][0];
    var b = RANGES[ri][1];
    for (var n = a; n <= b; n++) SET[String(n)] = true;
  }
  global.isValidVionaHotelRoomNumber = function (v) {
    return !!SET[String(v || "").trim()];
  };
})(typeof window !== "undefined" ? window : globalThis);
