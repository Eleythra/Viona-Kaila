/**
 * Kaila Beach geçerli oda numaraları (363 oda). Python `hotel_room_numbers.py` ile senkron tutun.
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
  return s;
}

export const HOTEL_VALID_ROOM_NUMBERS = buildSet();

export function isValidHotelRoomNumber(value) {
  return HOTEL_VALID_ROOM_NUMBERS.has(String(value ?? "").trim());
}
