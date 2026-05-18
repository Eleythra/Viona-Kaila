import test from "node:test";
import assert from "node:assert/strict";
import {
  extractEphemeralClientSecret,
  buildOpenAiRealtimeUnifiedSession,
} from "./openai-realtime-session.js";
import {
  openAiErrorPublicDetail,
  mintEphemeralRealtimeSession,
  proxyRealtimeCallSdp,
} from "./speech.router.js";

test("extractEphemeralClientSecret reads client_secret.value", () => {
  const out = extractEphemeralClientSecret({
    client_secret: { value: "ek_test_abc", expires_at: 123 },
  });
  assert.equal(out.value, "ek_test_abc");
  assert.equal(out.expiresAt, 123);
});

test("extractEphemeralClientSecret reads root value (client_secrets shape)", () => {
  const out = extractEphemeralClientSecret({ value: "ek_root_xyz", expires_at: 456 });
  assert.equal(out.value, "ek_root_xyz");
});

test("openAiErrorPublicDetail formats OpenAI error object", () => {
  const d = openAiErrorPublicDetail({
    error: { type: "invalid_request_error", code: "model_not_found", message: "Model not found" },
  });
  assert.match(d, /model_not_found/);
  assert.match(d, /Model not found/);
});

test("buildOpenAiRealtimeUnifiedSession includes viona_backend_reply tool", () => {
  const s = buildOpenAiRealtimeUnifiedSession({ model: "gpt-realtime", uiLanguage: "tr", voice: "marin" });
  assert.equal(s.type, "realtime");
  assert.equal(s.model, "gpt-realtime");
  assert.equal(s.audio.output.voice, "marin");
  assert.ok(Array.isArray(s.tools));
  assert.equal(s.tools[0].name, "viona_backend_reply");
});

test("mintEphemeralRealtimeSession uses client_secrets then legacy sessions fallback", async (t) => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url) => {
    call += 1;
    if (String(url).includes("/realtime/client_secrets")) {
      return new Response(JSON.stringify({ error: { message: "ga fail" } }), { status: 400 });
    }
    if (String(url).includes("/realtime/sessions")) {
      return new Response(
        JSON.stringify({ client_secret: { value: "ek_legacy_token", expires_at: 1 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("{}", { status: 404 });
  };
  const result = await mintEphemeralRealtimeSession({
    apiKey: "sk-test",
    model: "gpt-realtime",
    uiLang: "en",
    voice: "marin",
  });
  assert.equal(call, 2);
  assert.equal(result.ok, true);
  assert.equal(result.value, "ek_legacy_token");
});

test("mintEphemeralRealtimeSession client_secrets body has no temperature", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body || "{}"));
    assert.equal("temperature" in (body.session || {}), false);
    return new Response(JSON.stringify({ value: "ek_ok", expires_at: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const result = await mintEphemeralRealtimeSession({
    apiKey: "sk-test",
    model: "gpt-realtime",
    uiLang: "tr",
    voice: "marin",
  });
  assert.equal(result.ok, true);
});

test("proxyRealtimeCallSdp posts FormData to OpenAI calls", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let capturedUrl = "";
  let hadFormData = false;
  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    hadFormData = init?.body instanceof FormData;
    return new Response("v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n", {
      status: 200,
      headers: { "Content-Type": "application/sdp" },
    });
  };
  const result = await proxyRealtimeCallSdp({
    apiKey: "sk-test",
    model: "gpt-realtime",
    uiLang: "de",
    voice: "marin",
    sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n",
  });
  assert.equal(result.ok, true);
  assert.ok(result.sdp.includes("v=0"));
  assert.equal(capturedUrl, "https://api.openai.com/v1/realtime/calls");
  assert.equal(hadFormData, true);
});
