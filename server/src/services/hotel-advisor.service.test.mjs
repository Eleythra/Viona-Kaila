import test from "node:test";
import assert from "node:assert/strict";
import {
  extractGuests,
  isActiveStay,
  normalizeDate,
} from "./hotel-advisor.service.js";
import { normalizeGuestRoomForMatch } from "../lib/guest-match-normalize.js";

test("extractGuests wraps DATA array", () => {
  const guests = [{ ROOMNO: "1204", BIRTHDATE: "1990-05-01" }];
  assert.deepEqual(extractGuests([{ DATA: guests }]), guests);
});

test("normalizeDate yyyy-mm-dd", () => {
  assert.equal(normalizeDate("1990-05-01T00:00:00"), "1990-05-01");
});

test("verifyHotelGuest room match uses same keys as guest-match-normalize", () => {
  const userRoom = "  001204  ";
  const pmsRoom = "1204";
  assert.equal(
    normalizeGuestRoomForMatch(userRoom),
    normalizeGuestRoomForMatch(pmsRoom),
    "leading-zero digit rooms must match PMS row",
  );
});

test("isActiveStay true when today in range", () => {
  assert.equal(isActiveStay("2000-01-01", "2099-12-31"), true);
});
