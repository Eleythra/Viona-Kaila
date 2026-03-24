import dotenv from "dotenv";

dotenv.config();

function mustGet(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return String(value).trim();
}

function optional(name, fallback = "") {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim();
}

function optionalInt(name, fallback) {
  const raw = optional(name, String(fallback));
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function getEnv() {
  return {
    port: optionalInt("PORT", 3001),
    openAiApiKey: optional("OPENAI_API_KEY", ""),
    openAiVectorStoreId: optional("OPENAI_VECTOR_STORE_ID", ""),
    openAiModel: optional("OPENAI_MODEL", "gpt-4.1-mini"),
    chatDebug: optional("CHAT_DEBUG", "0") === "1",
    supabaseUrl: mustGet("SUPABASE_URL"),
    supabaseServiceRoleKey: mustGet("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
