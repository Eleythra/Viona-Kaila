import test from "node:test";
import assert from "node:assert/strict";
import {
  inferTrFieldsFromParsedJson,
  parseChatObservationTrModelJson,
} from "./chat-observation-translate.js";

test("parseChatObservationTrModelJson: plain object", () => {
  const o = parseChatObservationTrModelJson(
    '{"user_message_tr":"Merhaba","assistant_response_tr":"Tabii"}',
  );
  assert.equal(o.user_message_tr, "Merhaba");
});

test("parseChatObservationTrModelJson: fenced json", () => {
  const raw = "```json\n{ \"user_message_tr\": \"X\", \"assistant_response_tr\": \"Y\" }\n```";
  const o = parseChatObservationTrModelJson(raw);
  assert.equal(o.user_message_tr, "X");
  assert.equal(o.assistant_response_tr, "Y");
});

test("parseChatObservationTrModelJson: empty throws", () => {
  assert.throws(() => parseChatObservationTrModelJson(""), /empty_model_content/);
});

test("inferTrFieldsFromParsedJson: requires user TR", () => {
  assert.throws(
    () => inferTrFieldsFromParsedJson({ assistant_response_tr: "A" }, "hi", "yo"),
    /missing_user_message_tr/,
  );
});

test("inferTrFieldsFromParsedJson: assistant fallback to original when AR empty", () => {
  const { userTr, asstTr } = inferTrFieldsFromParsedJson(
    { user_message_tr: "  Merhaba  ", assistant_response_tr: "" },
    "Hello",
    "Still in English reply",
  );
  assert.equal(userTr, "Merhaba");
  assert.equal(asstTr, "Still in English reply");
});

test("inferTrFieldsFromParsedJson: whitespace-only assistant", () => {
  const { asstTr } = inferTrFieldsFromParsedJson(
    { user_message_tr: "A", assistant_response_tr: "" },
    "x",
    "",
  );
  assert.equal(asstTr, " ");
});
