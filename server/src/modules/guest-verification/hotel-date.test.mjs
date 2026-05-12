import test from "node:test";
import assert from "node:assert/strict";
import { isPlausibleGuestBirthYmd } from "./hotel-date.js";

test("birth not in future", () => {
  assert.equal(isPlausibleGuestBirthYmd("2005-06-25", "2026-05-10"), true);
  assert.equal(isPlausibleGuestBirthYmd("2027-01-01", "2026-05-10"), false);
});

test("birth not older than 120 years (boundary)", () => {
  assert.equal(isPlausibleGuestBirthYmd("1906-05-11", "2026-05-10"), true);
  assert.equal(isPlausibleGuestBirthYmd("1906-05-10", "2026-05-10"), true);
  assert.equal(isPlausibleGuestBirthYmd("1906-05-09", "2026-05-10"), false);
});
