import { getSupabase, isSupabaseConfigured, withSupabaseFetchGuard } from "../../lib/supabase.js";

function translationExplicitlyDisabled() {
  const v = String(process.env.CHAT_OBS_TRANSLATION_ENABLED || "")
    .trim()
    .toLowerCase();
  return v === "0" || v === "false" || v === "no";
}

export function shouldRunChatObservationTrTranslation() {
  if (translationExplicitlyDisabled()) return false;
  return Boolean(String(process.env.OPENAI_API_KEY || "").trim());
}

function translationModel() {
  return String(process.env.CHAT_OBS_TRANSLATION_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";
}

/**
 * Model çıktısından JSON nesnesi (test + iç kullanım).
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function parseChatObservationTrModelJson(text) {
  let s = String(text ?? "").trim();
  if (!s) throw new Error("empty_model_content");
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  try {
    const parsed = JSON.parse(s);
    if (!parsed || typeof parsed !== "object") throw new Error("not_object");
    return parsed;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`chat_obs_tr_json_parse: ${msg}`);
  }
}

/**
 * Parse edilmiş JSON + kaynak metinlerden TR alanlarını üretir.
 * Asistan çevirisi boş gelirse (model hatası) orijinal metin yazılır; kullanıcı çevirisi zorunludur.
 * @param {Record<string, unknown>} parsed
 * @param {string} user
 * @param {string} asstTrim
 * @returns {{ userTr: string, asstTr: string }}
 */
export function inferTrFieldsFromParsedJson(parsed, user, asstTrim) {
  const um =
    typeof parsed.user_message_tr === "string" ? parsed.user_message_tr.trim() : "";
  const ar =
    typeof parsed.assistant_response_tr === "string"
      ? parsed.assistant_response_tr.trim()
      : "";
  if (!um) throw new Error("missing_user_message_tr");
  const userTr = um;
  let asstTr;
  if (ar) asstTr = ar;
  else if (!asstTrim) asstTr = " ";
  else asstTr = asstTrim;
  return { userTr, asstTr };
}

/**
 * Misafir + asistan metnini tek çağrıda Türkçe operasyon sütunlarına yazar (Supabase patch).
 * @param {{ id: string, userMessage: string, assistantResponse: string }} param0
 */
async function patchChatObservationTrTranslations({ id, userMessage, assistantResponse }) {
  if (!isSupabaseConfigured()) return;
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return;

  const user = String(userMessage || "").trim();
  const asstRaw = String(assistantResponse ?? "");
  const asstTrim = asstRaw.trim();

  let userTr = user;
  let asstTr = asstTrim || " ";

  if (user || asstTrim) {
    const body = {
      model: translationModel(),
      temperature: 0.15,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are a professional translator for a beach resort hotel in Turkey.",
            "Translate the guest message and the assistant reply into clear, natural Turkish for operations staff (front desk, guest relations).",
            "Preserve proper names, room numbers, dates, times, prices, URLs, emails, phone numbers, and venue names exactly.",
            "Do not add explanations or markdown.",
            "Return ONLY a JSON object with exactly two string keys: user_message_tr and assistant_response_tr.",
            "Both values must be non-empty strings when the corresponding source text has visible characters;",
            "if the assistant source is only whitespace, set assistant_response_tr to a single space.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            user_message: user,
            assistant_response: asstTrim || " ",
          }),
        },
      ],
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`openai_http_${res.status}: ${errText.slice(0, 200)}`);
    }

    const completion = await res.json();
    const content = completion?.choices?.[0]?.message?.content;
    const parsed = parseChatObservationTrModelJson(content);
    const pair = inferTrFieldsFromParsedJson(parsed, user, asstTrim);
    userTr = pair.userTr;
    asstTr = pair.asstTr;
  }

  const { error } = await withSupabaseFetchGuard(() =>
    getSupabase()
      .from("chat_observations")
      .update({ user_message_tr: userTr, assistant_response_tr: asstTr })
      .eq("id", id),
  );
  if (error) throw error;
}

/**
 * /api/chat yanıtını bloklamaz; insert sonrası TR sütunlarını doldurur.
 * @param {{ id: string, userMessage: string, assistantResponse: string }} payload
 */
export function scheduleChatObservationTrTranslation(payload) {
  if (!payload?.id || !shouldRunChatObservationTrTranslation()) return;
  setImmediate(() => {
    void patchChatObservationTrTranslations(payload).catch((err) => {
      console.warn(
        "chat_observation_tr_translate_failed id=%s error=%s",
        payload.id,
        err?.message || err,
      );
    });
  });
}
