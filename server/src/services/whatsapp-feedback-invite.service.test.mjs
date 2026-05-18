import test from "node:test";
import assert from "node:assert/strict";
import { buildFeedbackUrlSuffix } from "./whatsapp-feedback-invite.service.js";

test("buildFeedbackUrlSuffix returns fb_ token", () => {
  assert.equal(buildFeedbackUrlSuffix("fb_abc123XYZ"), "fb_abc123XYZ");
});

test("buildFeedbackUrlSuffix rejects invalid token", () => {
  assert.equal(buildFeedbackUrlSuffix(""), null);
  assert.equal(buildFeedbackUrlSuffix("tq3CkY4mkZJiCIZiYKygFg73"), null);
  assert.equal(buildFeedbackUrlSuffix("fb_x"), null);
});
