import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenAiRealtimeUnifiedSession,
  buildOpenAiRealtimeSessionBody,
  normalizeUiLang,
  resolveRealtimeVoice,
} from "./openai-realtime-session.js";

test("normalizeUiLang falls back to tr", () => {
  assert.equal(normalizeUiLang("xx"), "tr");
  assert.equal(normalizeUiLang("de"), "de");
});

test("resolveRealtimeVoice defaults to marin", () => {
  assert.equal(resolveRealtimeVoice(""), "marin");
  assert.equal(resolveRealtimeVoice("alloy"), "alloy");
});

test("unified session has GA shape and viona_backend_reply", () => {
  const s = buildOpenAiRealtimeUnifiedSession({ model: "gpt-realtime", uiLanguage: "en", voice: "marin" });
  assert.equal(s.type, "realtime");
  assert.equal(s.audio.output.voice, "marin");
  assert.equal(s.tools[0].name, "viona_backend_reply");
  assert.equal(s.turn_detection.type, "server_vad");
  assert.equal(s.input_audio_transcription.language, "en");
});

test("legacy session body keeps modalities for sessions API", () => {
  const s = buildOpenAiRealtimeSessionBody({ model: "gpt-realtime", uiLanguage: "tr", voice: "marin" });
  assert.deepEqual(s.modalities, ["text", "audio"]);
  assert.equal(s.voice, "marin");
});
