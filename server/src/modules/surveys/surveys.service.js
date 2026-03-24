import { supabase } from "../../lib/supabase.js";

function cleanText(value, maxLen = 5000) {
  return String(value || "").trim().slice(0, maxLen);
}

function normalize(payload) {
  return {
    submittedAt: payload?.submittedAt || new Date().toISOString(),
    overallScore: Number(payload?.overallScore || 0),
    hotelCategories: payload?.hotelCategories || {},
    hotelAnswers: payload?.hotelAnswers || {},
    hotelComment: cleanText(payload?.hotelComment, 4000),
    vionaRating: Number(payload?.vionaRating || 0),
    vionaAnswers: payload?.vionaAnswers || {},
    vionaComment: cleanText(payload?.vionaComment, 4000),
    deviceType: cleanText(payload?.deviceType, 30),
    language: cleanText(payload?.language, 10),
    source: "viona_web",
    rawPayload: payload || {},
  };
}

function validate(row) {
  if (!row.language) throw new Error("language is required");
  if (!row.submittedAt) throw new Error("submittedAt is required");
  if (!row.hotelAnswers || typeof row.hotelAnswers !== "object") throw new Error("hotelAnswers is required");
  if (!row.vionaAnswers || typeof row.vionaAnswers !== "object") throw new Error("vionaAnswers is required");
}

export async function createSurveySubmission(payload) {
  const row = normalize(payload);
  validate(row);
  const { data, error } = await supabase
    .from("survey_submissions")
    .insert({
      submitted_at: row.submittedAt,
      overall_score: row.overallScore,
      hotel_categories: row.hotelCategories,
      hotel_answers: row.hotelAnswers,
      hotel_comment: row.hotelComment,
      viona_rating: row.vionaRating,
      viona_answers: row.vionaAnswers,
      viona_comment: row.vionaComment,
      device_type: row.deviceType || null,
      language: row.language,
      source: row.source,
      raw_payload: row.rawPayload,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}
