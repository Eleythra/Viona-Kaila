import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPdfInsightCacheKey } from "./pdf-insight-service.js";

function basePayload() {
  return {
    meta: { hotel_name: "Test Otel", period: { from: "2026-01-01", to: "2026-01-31" } },
    data_quality: {
      has_chat_observations: true,
      has_survey_aggregate: true,
      survey_submissions: 10,
      chat_rows: 8,
      previous_period_included: false,
      notes: ["n1"],
    },
    scores: [
      { key: "overall", score: 57.3 },
      { key: "chatbot", score: 46.3 },
    ],
    chatbot: {
      total_chats: 8,
      fallback_rate_percent: 12.5,
      avg_messages_per_user: 1.6,
      avg_conversation_length: 1.6,
      top_questions: [{ text: "merhaba", count: 3 }],
    },
    satisfaction: {
      hotel_avg_1_to_5: 3.85,
      viona_avg_1_to_5: 4.56,
      category_averages_1_to_5: { food: 3.8, quietness: 2.5 },
    },
    survey_question_summaries: {
      hotel_lowest: [{ question: "quietness", avg: 2.5, count: 8 }],
      hotel_highest: [],
      viona_lowest: [],
      viona_highest: [],
    },
    fallback: {
      count: 1,
      top_topics: [{ topic: "test", count: 1 }],
      repeated_topics: [],
    },
    commercial: {
      action_clicks: 0,
      action_conversions: 0,
      action_conversion_rate_percent: 0,
      chat_to_conversion_rate_percent: 0,
    },
    loyalty_signals: { gap_return_minus_recommend: 0.5, return_again: { avg: 4.5 }, recommend: { avg: 4 } },
  };
}

describe("buildPdfInsightCacheKey", () => {
  it("aynı metriklerde aynı anahtar", () => {
    const a = basePayload();
    const b = JSON.parse(JSON.stringify(a));
    assert.equal(buildPdfInsightCacheKey(a), buildPdfInsightCacheKey(b));
  });

  it("otel ortalaması değişince anahtar değişir (aynı chat_rows)", () => {
    const a = basePayload();
    const b = JSON.parse(JSON.stringify(a));
    b.satisfaction.hotel_avg_1_to_5 = 3.9;
    assert.notEqual(buildPdfInsightCacheKey(a), buildPdfInsightCacheKey(b));
  });

  it("anket en düşük soru ortalaması değişince anahtar değişir (aynı submissions)", () => {
    const a = basePayload();
    const b = JSON.parse(JSON.stringify(a));
    b.survey_question_summaries.hotel_lowest[0].avg = 2.6;
    assert.notEqual(buildPdfInsightCacheKey(a), buildPdfInsightCacheKey(b));
  });

  it("insight_v11 soneki içerir", () => {
    assert.match(buildPdfInsightCacheKey(basePayload()), /insight_v11$/);
  });

  it("report_snapshot_id varsa önbellek anahtarı yalnızca snapshot + sürüm", () => {
    const a = basePayload();
    a.meta.report_snapshot_id = "deadbeefdeadbeef0001";
    const b = JSON.parse(JSON.stringify(a));
    b.satisfaction.hotel_avg_1_to_5 = 1.11;
    assert.equal(buildPdfInsightCacheKey(a), "deadbeefdeadbeef0001|insight_v11");
    assert.equal(buildPdfInsightCacheKey(a), buildPdfInsightCacheKey(b));
  });
});
