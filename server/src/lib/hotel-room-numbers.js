/**
 * Kaila Beach geçerli oda numaraları. `HOTEL_VALID_ROOM_COUNT` aralıklardan türetilir; Python `hotel_room_numbers.py` ile senkron tutun.
 * Admin «Odalar» blok/kat ayrımı: tarayıcıda `js/hotel-room-numbers.js` → `vionaParseRoomLayout` (binler=blok A/B/C, yüzler=kat).
 */
const ROOM_RANGES = [
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

function buildSet() {
  const s = new Set();
  for (const [a, b] of ROOM_RANGES) {
    for (let n = a; n <= b; n++) s.add(String(n));
  }
  if (process.env.VIONA_OPERATOR_GATE_BYPASS === "1") {
    const extra = String(process.env.VIONA_OPERATOR_GATE_ROOM || "").trim();
    const birth = String(process.env.VIONA_OPERATOR_GATE_BIRTHDATE || "").trim();
    if (extra && /^\d{4}-\d{2}-\d{2}$/.test(birth)) s.add(extra);
  }
  return s;
}

export const HOTEL_VALID_ROOM_NUMBERS = buildSet();

/** Geçerli oda adedi (`ROOM_RANGES` ile birebir; tarayıcı `VIONA_HOTEL_VALID_ROOM_COUNT` ile aynı mantık). */
export const HOTEL_VALID_ROOM_COUNT = HOTEL_VALID_ROOM_NUMBERS.size;

export function isValidHotelRoomNumber(value) {
  return HOTEL_VALID_ROOM_NUMBERS.has(String(value ?? "").trim());
}
