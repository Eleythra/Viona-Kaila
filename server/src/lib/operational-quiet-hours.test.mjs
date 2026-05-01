import test from "node:test";
import assert from "node:assert/strict";
import { isInOperationalQuietHours, isOperationalGuestRequestTypeBlocked } from "./operational-quiet-hours.js";

test("08:00 Istanbul is not quiet", () => {
  const d = new Date("2026-05-01T05:00:00.000Z"); // TR 08:00 in May = UTC+3
  assert.equal(isInOperationalQuietHours(d), false);
});

test("03:30 Istanbul is quiet", () => {
  const d = new Date("2026-05-01T00:30:00.000Z"); // TR 03:30
  assert.equal(isInOperationalQuietHours(d), true);
});

test("type guard", () => {
  assert.equal(isOperationalGuestRequestTypeBlocked("request"), true);
  assert.equal(isOperationalGuestRequestTypeBlocked("complaint"), true);
  assert.equal(isOperationalGuestRequestTypeBlocked("fault"), true);
  assert.equal(isOperationalGuestRequestTypeBlocked("guest_notification"), true);
  assert.equal(isOperationalGuestRequestTypeBlocked("late_checkout"), false);
  assert.equal(isOperationalGuestRequestTypeBlocked("reservation_alacarte"), false);
});

/** Europe/Istanbul 07:59 → sessiz; 08:00 → açık (UTC+3 ile sabit anlık örnekler). */
test("07:59 Istanbul quiet, 08:00 not quiet (boundary)", () => {
  assert.equal(isInOperationalQuietHours(new Date("2026-06-01T04:59:00.000Z")), true);
  assert.equal(isInOperationalQuietHours(new Date("2026-06-01T05:00:00.000Z")), false);
});

test("23:30 Istanbul not quiet (evening)", () => {
  assert.equal(isInOperationalQuietHours(new Date("2026-06-01T20:30:00.000Z")), false);
});
