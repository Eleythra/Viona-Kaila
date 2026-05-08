import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGuestMatchString } from "./guest-match-normalize.js";

test("Turkish fold and lowercase", () => {
  assert.equal(normalizeGuestMatchString("  Bayıklılar  "), "bayiklilar");
  assert.equal(normalizeGuestMatchString("BAYIKLILAR"), "bayiklilar");
  assert.equal(normalizeGuestMatchString("İstanbul"), "istanbul");
});

test("room suffix preserved as string", () => {
  assert.equal(normalizeGuestMatchString("1204A"), "1204a");
});
