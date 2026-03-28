import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeReportSnapshotId } from "./report-snapshot-id.js";

describe("computeReportSnapshotId", () => {
  it("aynı içerikte aynı kimlik", () => {
    const p = { meta: { hotel_name: "A", period: { from: "2026-01-01", to: "2026-01-31" }, generated_at: "t1" }, scores: [{ key: "x", score: 1 }] };
    assert.equal(computeReportSnapshotId(p), computeReportSnapshotId(JSON.parse(JSON.stringify(p))));
  });

  it("generated_at farkı kimliği değiştirmez", () => {
    const a = { meta: { hotel_name: "A", generated_at: "early" }, x: 1 };
    const b = { meta: { hotel_name: "A", generated_at: "late" }, x: 1 };
    assert.equal(computeReportSnapshotId(a), computeReportSnapshotId(b));
  });

  it("meta.report_snapshot_id yok sayılır (döngü öncesi hesap)", () => {
    const base = { meta: { hotel_name: "A" }, scores: [] };
    const withSnap = JSON.parse(JSON.stringify(base));
    withSnap.meta.report_snapshot_id = "ffffffffffffffffffff";
    assert.equal(computeReportSnapshotId(base), computeReportSnapshotId(withSnap));
  });
});
