import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePdfDateRange } from "./admin.service.js";

describe("resolvePdfDateRange", () => {
  it("from+to yoksa 2000 alt sınırı kullanmaz; yaklaşık son 30 günlük pencere döner", () => {
    const r = resolvePdfDateRange({});
    const from = new Date(r.from).getTime();
    const to = new Date(r.to).getTime();
    const spanDays = (to - from) / (1000 * 60 * 60 * 24);
    assert.ok(spanDays >= 28 && spanDays <= 32, `spanDays=${spanDays}`);
    assert.ok(from > new Date("2010-01-01").getTime(), "from should not be year 2000");
  });

  it("from ve to doluysa seçilen aralığı kullanır", () => {
    const r = resolvePdfDateRange({ from: "2026-01-01", to: "2026-01-31" });
    assert.match(r.from, /^2026-01-01T/);
    assert.match(r.to, /^2026-01-31T/);
  });
});
