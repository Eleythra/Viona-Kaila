import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveCriticalFindingFromPayload } from "./pdf-insight-service.js";

describe("deriveCriticalFindingFromPayload", () => {
  it("en düşük kategori (ör. quietness 2.5) ticari sıfırdan önce gelir", () => {
    const payload = {
      satisfaction: {
        category_averages_1_to_5: { quietness: 2.5, food: 4.1 },
        hotel_avg_1_to_5: 3.8,
        viona_avg_1_to_5: 4.2,
      },
      commercial: { action_clicks: 0, action_conversions: 0 },
      chatbot: { total_chats: 50, fallback_rate_percent: 5 },
    };
    const t = deriveCriticalFindingFromPayload(payload);
    assert.match(t, /Gürültü|dinlenme|sessizlik/i);
    assert.doesNotMatch(t, /ticari huni|yönlendirme tıklaması/i);
  });
});
