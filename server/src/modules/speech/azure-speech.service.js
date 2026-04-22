/**
 * Azure Speech Services — TTS (SSML) ve tek parça STT (REST).
 * Anahtar yalnızca sunucu ortamında; istemciye sızdırılmaz.
 */

/** Uygulama dil kodu → Azure locale + sinir sesi (`js/lang-registry.js` EXTRA ile uyumlu). */
export const LOCALE_VOICE_MAP = {
  tr: { locale: "tr-TR", voice: "tr-TR-EmelNeural" },
  en: { locale: "en-US", voice: "en-US-JennyNeural" },
  de: { locale: "de-DE", voice: "de-DE-KatjaNeural" },
  pl: { locale: "pl-PL", voice: "pl-PL-AgnieszkaNeural" },
  ru: { locale: "ru-RU", voice: "ru-RU-SvetlanaNeural" },
  da: { locale: "da-DK", voice: "da-DK-ChristelNeural" },
  cs: { locale: "cs-CZ", voice: "cs-CZ-VlastaNeural" },
  ro: { locale: "ro-RO", voice: "ro-RO-AlinaNeural" },
  nl: { locale: "nl-NL", voice: "nl-NL-ColetteNeural" },
  sk: { locale: "sk-SK", voice: "sk-SK-ViktoriaNeural" },
};

function normalizeUiLang(value) {
  const v = String(value || "")
    .toLowerCase()
    .trim();
  if (LOCALE_VOICE_MAP[v]) return v;
  return "tr";
}

/** İstemci veya tam locale (tr-TR) → { locale, voice } */
export function resolveVoiceForRequest(localeInput) {
  const raw = String(localeInput || "").trim();
  const lower = raw.toLowerCase().replace(/_/g, "-");
  for (const key of Object.keys(LOCALE_VOICE_MAP)) {
    const spec = LOCALE_VOICE_MAP[key];
    if (lower === spec.locale.toLowerCase()) return spec;
  }
  const short = lower.slice(0, 2);
  if (LOCALE_VOICE_MAP[short]) return LOCALE_VOICE_MAP[short];
  return LOCALE_VOICE_MAP[normalizeUiLang(localeInput)];
}

/**
 * STT çıktısını sohbete güvenle vermek için: Unicode NFC, boşluk, görünmez karakter.
 * Dil otomatik tespit edilmez; locale zaten seçilmiş Azure modeline bağlı.
 */
export function normalizeTranscript(text, _localeHint) {
  let s = String(text || "")
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .trim();
  s = s.replace(/\s+/g, " ");
  return s;
}

function fetchWithOptionalTimeout(url, init, timeoutMs) {
  const ms = Number(timeoutMs);
  if (!Number.isFinite(ms) || ms <= 0) {
    return fetch(url, init);
  }
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  }
  return fetch(url, init);
}

function escapeXml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * SSML ile TTS; çıktı WAV (riff-16khz-16bit-mono-pcm).
 * @param {object} opts
 * @param {string} opts.text
 * @param {{ locale: string, voice: string }} opts.voiceSpec
 * @param {string} opts.key
 * @param {string} opts.region — örn. westeurope
 */
export async function synthesizeToWav({ text, voiceSpec, key, region, fetchTimeoutMs }) {
  const trimmed = normalizeTranscript(String(text || ""), voiceSpec?.locale);
  if (!trimmed) {
    const err = new Error("empty_text");
    err.code = "empty_text";
    throw err;
  }

  const hostRegion = String(region || "").toLowerCase().replace(/\s/g, "");
  const url = `https://${hostRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escapeXml(voiceSpec.locale)}"><voice name="${escapeXml(voiceSpec.voice)}"><prosody rate="0.95">${escapeXml(trimmed)}</prosody></voice></speak>`;

  const res = await fetchWithOptionalTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-16khz-16bit-mono-pcm",
        "User-Agent": "viona-kaila-beach-tts",
      },
      body: ssml,
    },
    fetchTimeoutMs,
  );

  if (!res.ok) {
    const err = new Error(`tts_http_${res.status}`);
    err.code = "tts_failed";
    err.status = res.status;
    throw err;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

/**
 * Azure kısa ifade STT: interactive = otel soruları gibi kısa komutlar/cümleler için conversation’dan genelde daha isabetli.
 * format=detailed → NBest[0] ile güven ve alternatif metin.
 */
function pickTranscriptFromDetailedPayload(data) {
  const top = data?.NBest?.[0];
  if (top && typeof top === "object") {
    const conf = Number(top.Confidence);
    const fromNb = String(top.Display || top.Lexical || top.ITN || "").trim();
    if (fromNb) {
      if (Number.isFinite(conf) && conf < 0.25) {
        return String(data.DisplayText || fromNb).trim() || fromNb;
      }
      return fromNb;
    }
  }
  return String(data.DisplayText || "").trim();
}

/**
 * Kısa ses tanıma (tek parça WAV, 16 kHz mono PCM önerilir).
 * @param {Buffer} wavBuffer
 * @param {{ locale: string }} voiceSpec
 */
export async function transcribeWav({ wavBuffer, voiceSpec, key, region, fetchTimeoutMs }) {
  if (!wavBuffer || wavBuffer.length < 800) {
    const err = new Error("audio_too_short");
    err.code = "audio_too_short";
    throw err;
  }

  const hostRegion = String(region || "").toLowerCase().replace(/\s/g, "");
  const lang = encodeURIComponent(voiceSpec.locale);
  const base = `https://${hostRegion}.stt.speech.microsoft.com/speech/recognition`;
  const urlInteractive = `${base}/interactive/cognitiveservices/v1?language=${lang}&format=detailed`;
  const urlConversation = `${base}/conversation/cognitiveservices/v1?language=${lang}&format=detailed`;

  const headers = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
    Accept: "application/json",
    "User-Agent": "viona-kaila-beach-stt",
  };

  async function postStt(url) {
    const res = await fetchWithOptionalTimeout(url, { method: "POST", headers, body: wavBuffer }, fetchTimeoutMs);
    const raw = await res.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (_e) {
      const err = new Error("stt_bad_response");
      err.code = "stt_failed";
      throw err;
    }
    return { res, data };
  }

  let { res, data } = await postStt(urlInteractive);

  if (!res.ok) {
    console.warn("stt_interactive_http status=%s retrying_conversation", res.status);
    ({ res, data } = await postStt(urlConversation));
  }

  if (!res.ok) {
    const err = new Error(`stt_http_${res.status}`);
    err.code = "stt_failed";
    err.status = res.status;
    throw err;
  }

  const status = String(data.RecognitionStatus || "");
  if (status !== "Success") {
    const err = new Error(`stt_status_${status}`);
    err.code = "stt_no_match";
    err.recognitionStatus = status;
    throw err;
  }

  let display = pickTranscriptFromDetailedPayload(data);
  if (!display) {
    const err = new Error("stt_empty_text");
    err.code = "stt_empty_text";
    throw err;
  }

  display = normalizeTranscript(display, voiceSpec.locale);
  if (!display) {
    const err = new Error("stt_empty_text");
    err.code = "stt_empty_text";
    throw err;
  }

  return display;
}
