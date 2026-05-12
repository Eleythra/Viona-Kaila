import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGuestMatchString, normalizeGuestRoomForMatch } from "./guest-match-normalize.js";

test("Turkish fold and lowercase", () => {
  assert.equal(normalizeGuestMatchString("  Bayıklılar  "), "bayiklilar");
  assert.equal(normalizeGuestMatchString("BAYIKLILAR"), "bayiklilar");
  assert.equal(normalizeGuestMatchString("İstanbul"), "istanbul");
});

test("room suffix preserved as string", () => {
  assert.equal(normalizeGuestMatchString("1204A"), "1204a");
});

test("room numeric leading zeros collapse", () => {
  assert.equal(normalizeGuestRoomForMatch("01106"), "1106");
  assert.equal(normalizeGuestRoomForMatch("1106"), "1106");
  assert.equal(normalizeGuestRoomForMatch("  001204  "), "1204");
});

test("room non-pure-digit unchanged aside from case fold", () => {
  assert.equal(normalizeGuestRoomForMatch("VIP01"), "vip01");
  assert.equal(normalizeGuestRoomForMatch("1204A"), "1204a");
});
