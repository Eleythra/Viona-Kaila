import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicSiteOriginAllowlist,
  requestHasAllowedPublicSiteOrigin,
} from "./public-site-origins.js";

test("X-Forwarded-Host + proto → izinli köken (Vercel proxy)", () => {
  const allow = buildPublicSiteOriginAllowlist({ corsAllowedOrigins: [] });
  const req = {
    headers: {
      "x-forwarded-host": "viona.eleythra.com",
      "x-forwarded-proto": "https",
    },
  };
  assert.equal(requestHasAllowedPublicSiteOrigin(req, allow, { trustForwardedHeaders: true }), true);
});

test("Origin yok, Forwarded: host= (RFC 7239)", () => {
  const allow = buildPublicSiteOriginAllowlist({ corsAllowedOrigins: [] });
  const req = {
    headers: {
      forwarded: "proto=https;host=viona.eleythra.com;for=1.2.3.4",
    },
  };
  assert.equal(requestHasAllowedPublicSiteOrigin(req, allow, { trustForwardedHeaders: true }), true);
});

test("SPEECH_TRUST_FORWARDED_ORIGIN kapalıyken X-Forwarded-Host yok sayılır", () => {
  const allow = buildPublicSiteOriginAllowlist({ corsAllowedOrigins: [] });
  const req = {
    headers: {
      "x-forwarded-host": "viona.eleythra.com",
      "x-forwarded-proto": "https",
    },
  };
  assert.equal(
    requestHasAllowedPublicSiteOrigin(req, allow, { trustForwardedHeaders: false }),
    false,
  );
});

test("*.vercel.app kökeni sabit listede olmasa da izinlidir", () => {
  const allow = buildPublicSiteOriginAllowlist({ corsAllowedOrigins: [] });
  const req = {
    headers: {
      origin: "https://viona-kaila-beach-git-main-xxx.vercel.app",
    },
  };
  assert.equal(requestHasAllowedPublicSiteOrigin(req, allow, { trustForwardedHeaders: false }), true);
});
