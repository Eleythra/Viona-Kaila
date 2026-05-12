import assert from "node:assert/strict";
import test from "node:test";
import { buildHotspotListCacheKey } from "./elektra-hotspot-cache-key.js";
import {
  buildElektraBearerToken,
  buildHotspotAuthHeaders,
  buildHotspotListUrl,
  normalizeHotspotRow,
  parseHotspotListEnvelope,
} from "./elektra-hotspot.provider.js";

test("buildHotspotListCacheKey — path ve auth farkı ayrı anahtar", () => {
  const base = buildHotspotListCacheKey("1", "/a", "bearer", "Authorization", "");
  const otherPath = buildHotspotListCacheKey("1", "/b", "bearer", "Authorization", "");
  const otherMode = buildHotspotListCacheKey("1", "/a", "query", "Authorization", "tok");
  assert.notEqual(base, otherPath);
  assert.notEqual(base, otherMode);
});

test("buildElektraBearerToken — hotspot# ile olduğu gibi", () => {
  assert.equal(buildElektraBearerToken("9", "hotspot#9$x"), "hotspot#9$x");
});

test("buildElektraBearerToken — secret birleşimi", () => {
  assert.equal(buildElektraBearerToken("33149", "abc"), "hotspot#33149$abc");
});

test("buildHotspotListUrl — HOTELID ve isteğe bağlı query token", () => {
  const u = buildHotspotListUrl(
    "https://example.com",
    "/apisequence/GetHotspotList",
    "42",
    "LoginToken",
    "t%20ok",
  );
  assert.ok(u.startsWith("https://example.com/apisequence/GetHotspotList?"));
  assert.ok(u.includes("HOTELID=42"));
  assert.ok(u.includes("LoginToken=") && u.includes(encodeURIComponent("t%20ok")));
});

test("buildHotspotListUrl — base sonundaki slash temizlenir", () => {
  const u = buildHotspotListUrl("https://x.com///", "/p", "1", "", "");
  assert.equal(u, "https://x.com/p?HOTELID=1");
});

test("parseHotspotListEnvelope — STATUS + DATA", () => {
  const out = parseHotspotListEnvelope({
    STATUS: true,
    DATA: [{ ROOMNO: "101", LNAME: "Test" }],
  });
  assert.equal(out.records.length, 1);
  assert.equal(out.statusFieldPresent, true);
  assert.equal(out.statusOk, true);
});

test("parseHotspotListEnvelope — STATUS false throws", () => {
  assert.throws(
    () =>
      parseHotspotListEnvelope({
        STATUS: false,
        DATA: [],
      }),
    /elektra_status_false/,
  );
});

test("parseHotspotListEnvelope — kök dizi (STATUS yok)", () => {
  const out = parseHotspotListEnvelope([{ x: 1 }]);
  assert.equal(out.records.length, 1);
  assert.equal(out.statusFieldPresent, false);
});

test("normalizeHotspotRow — düz ROOMNO", () => {
  const r = normalizeHotspotRow({ ROOMNO: "1106", BIRTHDATE: "1990-01-15" });
  assert.equal(r.roomNo, "1106");
  assert.equal(r.birthDateRaw, "1990-01-15");
});

test("normalizeHotspotRow — Guest içinde RoomNumber", () => {
  const r = normalizeHotspotRow({
    Guest: { RoomNumber: "01106", BirthDate: "15.01.1990" },
  });
  assert.equal(r.roomNo, "01106");
  assert.equal(r.birthDateRaw, "15.01.1990");
});

test("buildHotspotAuthHeaders — bearer / raw / query / none", () => {
  assert.equal(
    buildHotspotAuthHeaders("bearer", "Authorization", "tok").Authorization,
    "Bearer tok",
  );
  assert.equal(buildHotspotAuthHeaders("raw", "Authorization", "tok").Authorization, "tok");
  assert.equal(
    Object.hasOwn(buildHotspotAuthHeaders("query", "Authorization", "tok"), "Authorization"),
    false,
  );
  assert.equal(
    Object.hasOwn(buildHotspotAuthHeaders("none", "X-Api-Key", "tok"), "X-Api-Key"),
    false,
  );
});
