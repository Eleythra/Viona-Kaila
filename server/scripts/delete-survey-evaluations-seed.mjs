#!/usr/bin/env node
/**
 * hotel_comment alanı "VIONA_SEED_TEST" ile başlayan anket kayıtlarını siler.
 * Çalıştır: node server/scripts/delete-survey-evaluations-seed.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli (.env).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await supabase
    .from("survey_submissions")
    .delete()
    .like("hotel_comment", "VIONA_SEED_TEST%")
    .select("id");

  if (error) {
    console.error("Silme hatası:", error.message);
    process.exit(1);
  }
  const n = (data || []).length;
  console.log(n ? `${n} test kaydı silindi.` : "Silinecek VIONA_SEED_TEST kaydı yok.");
}

main();
