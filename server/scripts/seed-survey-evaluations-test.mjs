#!/usr/bin/env node
/**
 * Tüm anket soruları dolu; her dil (tr/en/de/pl) için 2 varyant = 8 gönderim.
 * Sunucu: npm run dev (varsayılan http://127.0.0.1:3001/api/surveys)
 *
 * Silme: node server/scripts/delete-survey-evaluations-seed.mjs
 */
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { SURVEY_TEST_LANGS } from "./survey-eval-test-constants.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

const BASE = process.env.SURVEY_SEED_API_URL || "http://127.0.0.1:3001/api/surveys";

function avg(nums) {
  const v = nums.filter((n) => Number(n) > 0);
  if (!v.length) return 0;
  return Number((v.reduce((a, b) => a + Number(b), 0) / v.length).toFixed(2));
}

function buildPayload(language, variant) {
  const h =
    variant === "a"
      ? {
          food_taste: 4,
          food_variety: 5,
          food_presentation: 4,
          room_comfort: 4,
          bed_comfort: 5,
          quietness: 3,
          room_cleanliness: 5,
          common_area_cleanliness: 4,
          staff_kindness: 5,
          staff_speed: 4,
          staff_helpfulness: 5,
          pool_beach_cleanliness: 4,
          pool_beach_access: 4,
          pool_beach_satisfaction: 5,
          spa_quality: 4,
          spa_ambience: 4,
          spa_satisfaction: 4,
          general_satisfaction: 4,
          return_again: 5,
          recommend: 4,
        }
      : {
          food_taste: 3,
          food_variety: 4,
          food_presentation: 3,
          room_comfort: 3,
          bed_comfort: 4,
          quietness: 2,
          room_cleanliness: 4,
          common_area_cleanliness: 3,
          staff_kindness: 4,
          staff_speed: 3,
          staff_helpfulness: 4,
          pool_beach_cleanliness: 3,
          pool_beach_access: 3,
          pool_beach_satisfaction: 4,
          spa_quality: 3,
          spa_ambience: 3,
          spa_satisfaction: 3,
          general_satisfaction: 3,
          return_again: 4,
          recommend: 3,
        };
  const viona =
    variant === "a"
      ? { viona_helpfulness: 5, viona_understanding: 4, viona_usability: 5, viona_overall: 5 }
      : { viona_helpfulness: 3, viona_understanding: 4, viona_usability: 3, viona_overall: 4 };

  const hotelCategories = {
    food: avg([h.food_taste, h.food_variety, h.food_presentation]),
    comfort: avg([h.room_comfort, h.bed_comfort, h.quietness]),
    cleanliness: avg([h.room_cleanliness, h.common_area_cleanliness]),
    staff: avg([h.staff_kindness, h.staff_speed, h.staff_helpfulness]),
    poolBeach: avg([h.pool_beach_cleanliness, h.pool_beach_access, h.pool_beach_satisfaction]),
    spaWellness: avg([h.spa_quality, h.spa_ambience, h.spa_satisfaction]),
    generalExperience: avg([h.general_satisfaction, h.return_again, h.recommend]),
  };
  const tabs = ["food", "comfort", "cleanliness", "staff", "poolBeach", "spaWellness", "generalExperience"];
  const overallScore = avg(tabs.map((id) => hotelCategories[id]));

  const langTag = String(language || "tr").toLowerCase();
  return {
    submittedAt: new Date().toISOString(),
    overallScore,
    hotelCategories,
    hotelAnswers: h,
    hotelComment: `VIONA_SEED_TEST [${langTag}/${variant}] teslim öncesi — production öncesi silin.`,
    vionaRating: viona.viona_overall,
    vionaAnswers: viona,
    vionaComment: "",
    deviceType: "web",
    language: langTag,
  };
}

async function main() {
  const jobs = [];
  for (const lang of SURVEY_TEST_LANGS) {
    for (const v of ["a", "b"]) {
      jobs.push({ lang, v });
    }
  }
  console.log(`${jobs.length} gönderim (${SURVEY_TEST_LANGS.join(", ")} × 2 varyant)…`);

  for (const { lang, v } of jobs) {
    const body = buildPayload(lang, v);
    const r = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let j = null;
    try {
      j = await r.json();
    } catch {
      j = {};
    }
    if (!r.ok || !j.ok) {
      console.error("Gönderim başarısız:", lang, v, r.status, j);
      process.exit(1);
    }
    console.log("OK", lang, v, "id=", j.id);
  }
  console.log("\nAdmin → Değerlendirmeler; dil dağılımında TR/EN/DE/PL görünmeli.");
  console.log("Doğrulama: npm run verify:surveys-report");
  console.log("Silmek için: npm run seed:surveys-test:clean\n");
}

main();
