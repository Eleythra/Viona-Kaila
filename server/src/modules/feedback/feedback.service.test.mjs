import test from "node:test";
import assert from "node:assert/strict";
import { shouldAutoInviteGuestFeedbackOnDone } from "./feedback.service.js";

const enabled = { featureEnabled: true, autoOnDoneEnabled: true };

test("shouldAutoInviteGuestFeedbackOnDone allows request transition to done", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "request",
    normalizedStatus: "done",
    previousStatus: "in_progress",
    feedbackStatus: "",
    ...enabled,
  });
  assert.equal(r.ok, true);
});

test("shouldAutoInviteGuestFeedbackOnDone allows fault transition to done", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "fault",
    normalizedStatus: "done",
    previousStatus: "pending",
    ...enabled,
  });
  assert.equal(r.ok, true);
});

test("shouldAutoInviteGuestFeedbackOnDone skips complaint", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "complaint",
    normalizedStatus: "done",
    previousStatus: "in_progress",
    ...enabled,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_type");
});

test("shouldAutoInviteGuestFeedbackOnDone skips when already done", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "fault",
    normalizedStatus: "done",
    previousStatus: "done",
    ...enabled,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "already_done");
});

test("shouldAutoInviteGuestFeedbackOnDone skips pending feedback", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "request",
    normalizedStatus: "done",
    previousStatus: "in_progress",
    feedbackStatus: "pending",
    ...enabled,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "feedback_pending");
});

test("shouldAutoInviteGuestFeedbackOnDone skips submitted feedback", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "request",
    normalizedStatus: "done",
    previousStatus: "reopened",
    feedbackStatus: "submitted",
    ...enabled,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "feedback_submitted");
});

test("shouldAutoInviteGuestFeedbackOnDone skips when feature disabled", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "request",
    normalizedStatus: "done",
    previousStatus: "in_progress",
    featureEnabled: false,
    autoOnDoneEnabled: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "feature_disabled");
});

test("shouldAutoInviteGuestFeedbackOnDone skips when auto disabled", () => {
  const r = shouldAutoInviteGuestFeedbackOnDone({
    type: "fault",
    normalizedStatus: "done",
    previousStatus: "in_progress",
    featureEnabled: true,
    autoOnDoneEnabled: false,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "auto_disabled");
});
