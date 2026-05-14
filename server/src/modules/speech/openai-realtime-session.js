/**
 * OpenAI Realtime — POST /v1/realtime/sessions gövdesi (ephemeral client_secret).
 * Anahtar yalnızca sunucuda; istemciye yalnızca client_secret.value gider.
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

function normalizeUiLang(value) {
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

/**
 * @param {object} opts
 * @param {string} opts.model — OPENAI_REALTIME_MODEL
 * @param {string} opts.uiLanguage — tr|en|…
 * @param {string} opts.voice — OpenAI built-in voice name
 */
export function buildOpenAiRealtimeSessionBody({ model, uiLanguage, voice }) {
  const lang = normalizeUiLang(uiLanguage);
  const whisperLang = UI_LANG_WHISPER[lang];
  const v = resolveRealtimeVoice(voice);

  return {
    model: String(model || "gpt-realtime").trim(),
    modalities: ["text", "audio"],
    voice: v,
    instructions: buildInstructions(lang),
    tools: [
      {
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
      },
    ],
    tool_choice: "auto",
    temperature: 0.6,
    max_response_output_tokens: 1200,
    turn_detection: {
      type: "server_vad",
      silence_duration_ms: 550,
      threshold: 0.45,
      prefix_padding_ms: 320,
    },
    input_audio_transcription: {
      model: "whisper-1",
      language: whisperLang,
    },
  };
}
