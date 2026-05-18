/**
 * OpenAI Realtime — oturum gövdeleri (ephemeral `/sessions`, unified `/calls`, `client_secrets`).
 * Anahtar yalnızca sunucuda; istemciye yalnızca ephemeral token veya SDP cevabı gider.
 */

/** `js/lang-registry.js` / CHATBOT_UI_LANG_SET ile uyumlu 10 kod */
const UI_LANG_WHISPER = {
  tr: "tr",
  en: "en",
  de: "de",
  pl: "pl",
  ru: "ru",
  da: "da",
  cs: "cs",
  ro: "ro",
  nl: "nl",
  sk: "sk",
};

const UI_LANG_LABEL = {
  tr: "Turkish",
  en: "English",
  de: "German",
  pl: "Polish",
  ru: "Russian",
  da: "Danish",
  cs: "Czech",
  ro: "Romanian",
  nl: "Dutch",
  sk: "Slovak",
};

const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

const VIONA_BACKEND_REPLY_TOOL = {
  type: "function",
  name: "viona_backend_reply",
  description:
    "Send the guest spoken message to the hotel assistant backend and receive the official short reply text to read aloud.",
  parameters: {
    type: "object",
    properties: {
      user_message: {
        type: "string",
        description: "The guest's spoken request, verbatim in the guest UI language.",
      },
    },
    required: ["user_message"],
  },
};

export function normalizeUiLang(value) {
  const v = String(value || "")
    .toLowerCase()
    .trim()
    .slice(0, 2);
  if (UI_LANG_WHISPER[v]) return v;
  return "tr";
}

export function resolveRealtimeVoice(voiceInput) {
  const v = String(voiceInput || "")
    .toLowerCase()
    .trim();
  if (ALLOWED_VOICES.has(v)) return v;
  return "marin";
}

function buildInstructions(uiLang) {
  const label = UI_LANG_LABEL[uiLang] || "Turkish";
  return [
    `You are the voice layer for Viona, the digital concierge of Kaila Beach Hotel.`,
    `The guest selected UI language: ${label}. You MUST speak only in ${label}, with a short, professional, warm hotel tone.`,
    `When the guest finishes a spoken request (one utterance), call the function viona_backend_reply exactly once.`,
    `Set user_message to the guest's full request in ${label}, as literally as possible (same language).`,
    `Do not invent hotel facts. Do not answer from general knowledge about the hotel.`,
    `After the tool returns JSON with shape {"reply":"..."}, your ONLY next step is to speak that reply text aloud clearly.`,
    `Speak the reply text faithfully; do not add disclaimers, follow-up questions, or extra sentences unless they are already in the reply.`,
    `If the tool JSON has an empty reply field, briefly apologize in ${label} and suggest trying again or using text chat.`,
    `Between tool calls, stay silent until the guest speaks again.`,
  ].join(" ");
}

function buildRealtimeSessionCore({ model, uiLanguage, voice }) {
  const lang = normalizeUiLang(uiLanguage);
  const whisperLang = UI_LANG_WHISPER[lang];
  const v = resolveRealtimeVoice(voice);
  const m = String(model || "gpt-realtime").trim();

  return {
    lang,
    whisperLang,
    voice: v,
    model: m,
    instructions: buildInstructions(lang),
    tools: [VIONA_BACKEND_REPLY_TOOL],
    tool_choice: "auto",
    /** GA Realtime: `audio.input.turn_detection` (üst seviye `turn_detection` artık geçersiz). */
    turn_detection: {
      type: "server_vad",
      silence_duration_ms: 550,
      threshold: 0.45,
      prefix_padding_ms: 320,
      create_response: true,
    },
    transcription: {
      model: "whisper-1",
      language: whisperLang,
    },
  };
}

/**
 * Unified WebRTC (`POST /v1/realtime/calls` FormData `session` alanı).
 * OpenAI GA: `audio.input/output`, `max_output_tokens`; `temperature` yok.
 */
export function buildOpenAiRealtimeUnifiedSession({ model, uiLanguage, voice }) {
  const core = buildRealtimeSessionCore({ model, uiLanguage, voice });
  return {
    type: "realtime",
    model: core.model,
    instructions: core.instructions,
    output_modalities: ["audio"],
    tools: core.tools,
    tool_choice: core.tool_choice,
    max_output_tokens: 1200,
    audio: {
      input: {
        transcription: core.transcription,
        turn_detection: core.turn_detection,
      },
      output: { voice: core.voice },
    },
  };
}

/** `POST /v1/realtime/client_secrets` gövdesi (yedek ephemeral). */
export function buildClientSecretsRequestBody(opts) {
  return {
    session: buildOpenAiRealtimeUnifiedSession(opts),
  };
}

/**
 * Eski ephemeral oturum (`POST /v1/realtime/sessions`) — düz şema.
 */
export function buildOpenAiRealtimeSessionBody(opts) {
  const core = buildRealtimeSessionCore(opts);
  return {
    model: core.model,
    modalities: ["text", "audio"],
    voice: core.voice,
    instructions: core.instructions,
    tools: core.tools,
    tool_choice: core.tool_choice,
    max_response_output_tokens: 1200,
    turn_detection: {
      type: core.turn_detection.type,
      silence_duration_ms: core.turn_detection.silence_duration_ms,
      threshold: core.turn_detection.threshold,
      prefix_padding_ms: core.turn_detection.prefix_padding_ms,
    },
    input_audio_transcription: core.transcription,
  };
}

/** OpenAI yanıtından ephemeral token (sessions veya client_secrets). */
export function extractEphemeralClientSecret(data) {
  if (!data || typeof data !== "object") {
    return { value: "", expiresAt: null };
  }
  const cs = data.client_secret;
  if (cs && typeof cs === "object" && typeof cs.value === "string" && cs.value.trim()) {
    const expiresAt =
      typeof cs.expires_at === "number" || typeof cs.expires_at === "string" ? cs.expires_at : null;
    return { value: cs.value.trim(), expiresAt };
  }
  if (typeof data.value === "string" && data.value.trim()) {
    const expiresAt =
      typeof data.expires_at === "number" || typeof data.expires_at === "string" ? data.expires_at : null;
    return { value: data.value.trim(), expiresAt };
  }
  return { value: "", expiresAt: null };
}
