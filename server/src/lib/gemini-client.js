import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "../config/env.js";

function extractResponseText(response) {
  let direct = "";
  try {
    direct = response?.text?.() || "";
  } catch (_e) {
    direct = "";
  }
  if (direct && String(direct).trim()) return String(direct).trim();
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const joined = parts.map((p) => (p && p.text ? String(p.text) : "")).join("");
    if (joined.trim()) return joined.trim();
  }
  const reason = response?.promptFeedback?.blockReason;
  if (reason) {
    return { blocked: true, reason: String(reason) };
  }
  return "";
}

/**
 * Tek merkezden Gemini çağrısı. API key yoksa çağıran fallback kullanır.
 */
export async function generateGeminiJsonText(prompt, options = {}) {
  const env = getEnv();
  const apiKey = env.geminiApiKey;
  if (!apiKey) return { ok: false, error: "missing_api_key", text: null };

  const modelName = env.geminiModel || "gemini-2.5-flash-lite";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: typeof options.temperature === "number" ? options.temperature : 0.35,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
      responseMimeType: "application/json",
    },
  });

  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 120_000;

  try {
    const run = model.generateContent(String(prompt || ""));
    const result = await Promise.race([
      run,
      new Promise((_, reject) => setTimeout(() => reject(new Error("gemini_timeout")), timeoutMs)),
    ]);
    const raw = extractResponseText(result?.response);
    if (raw && typeof raw === "object" && raw.blocked) {
      console.warn("[gemini-client] blocked:", raw.reason);
      return { ok: false, error: `blocked:${raw.reason}`, text: null };
    }
    const text = typeof raw === "string" ? raw : "";
    if (!text) {
      return { ok: false, error: "empty_response", text: null };
    }
    return { ok: true, error: null, text };
  } catch (e) {
    const msg = e?.message || String(e);
    console.warn("[gemini-client] generateContent failed:", msg);
    return { ok: false, error: msg, text: null };
  }
}
