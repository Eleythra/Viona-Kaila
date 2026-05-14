import express from "express";
import { getEnv } from "../../config/env.js";
import { verifyHotelGuest } from "../../services/hotel-advisor.service.js";

const router = express.Router();

router.use((req, res, next) => {
  if (!getEnv().hotelAdvisorTestEnabled) {
    return res.status(404).end();
  }
  next();
});

router.post("/hotel-login", async (req, res) => {
  const t0 = Date.now();
  try {
    const { roomNo, birthDate } = req.body && typeof req.body === "object" ? req.body : {};

    if (!roomNo || !birthDate) {
      console.info("[hotel_advisor_test] hotel-login rejected reason=missing_fields ms=%d", Date.now() - t0);
      return res.status(400).json({
        success: false,
        message: "Oda numarası ve doğum tarihi zorunludur.",
      });
    }

    if (!getEnv().hotelAdvisorConfigured) {
      console.warn("[hotel_advisor_test] hotel-login rejected reason=hotel_advisor_env_incomplete");
      return res.status(503).json({
        success: false,
        message: "HotelAdvisor yapılandırması eksik (sunucu ortamı).",
      });
    }

    const guest = await verifyHotelGuest({
      roomNo: String(roomNo),
      birthDate: String(birthDate),
    });

    if (!guest) {
      console.info("[hotel_advisor_test] hotel-login no_match ms=%d", Date.now() - t0);
      return res.status(401).json({
        success: false,
        message: "Oda numarası veya doğum tarihi hatalı.",
      });
    }

    console.info(
      "[hotel_advisor_test] hotel-login ok resId=%s resNameId=%s ms=%d",
      String(guest.resId),
      String(guest.resNameId),
      Date.now() - t0,
    );

    return res.json({
      success: true,
      guest,
    });
  } catch (error) {
    console.error("[hotel_advisor_test] hotel-login error:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Giriş doğrulaması sırasında hata oluştu.",
    });
  }
});

/**
 * Basit test arayüzü (yalnızca HOTEL_ADVISOR_TEST_ENABLED=1 iken GET ile sunulur).
 * @returns {string}
 */
export function getHotelAdvisorTestPageHtml() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HotelAdvisor — test girişi</title>
  <style>
    :root { font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 1.5rem; max-width: 32rem; line-height: 1.5; background: #f6f7f9; }
    h1 { font-size: 1.25rem; margin: 0 0 1rem; }
    label { display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #333; }
    input { width: 100%; box-sizing: border-box; padding: 0.5rem 0.65rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
    button { width: 100%; padding: 0.65rem 1rem; font-size: 1rem; border: none; border-radius: 6px; background: #1a5f7a; color: #fff; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .card { background: #fff; border-radius: 8px; padding: 1rem 1.25rem; margin-top: 1rem; border: 1px solid #e0e0e0; }
    .success { border-color: #2e7d32; background: #e8f5e9; }
    .error { border-color: #c62828; background: #ffebee; color: #b71c1c; }
    .muted { font-size: 0.8rem; color: #666; margin-top: 1rem; }
    dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 0.35rem 1rem; font-size: 0.9rem; }
    dt { font-weight: 600; color: #444; }
    dd { margin: 0; }
  </style>
</head>
<body>
  <h1>HotelAdvisor / Elektra — test girişi</h1>
  <p class="muted">Yalnızca API doğrulaması; JWT veya oturum yok. Konsolu açın (F12) ayrıntılı log için.</p>
  <form id="f">
    <label for="roomNo">Oda numarası</label>
    <input id="roomNo" name="roomNo" autocomplete="off" placeholder="Örn. 101" required>
    <label for="birthDate">Doğum tarihi</label>
    <input id="birthDate" name="birthDate" type="date" required>
    <button type="submit" id="btn">Test Login</button>
  </form>
  <div id="out"></div>
  <script>
    (function () {
      var f = document.getElementById("f");
      var btn = document.getElementById("btn");
      var out = document.getElementById("out");

      function log() {
        var a = Array.prototype.slice.call(arguments);
        a.unshift("[hotel_advisor_test_ui]", new Date().toISOString());
        console.log.apply(console, a);
      }

      function setLoading(loading) {
        btn.disabled = loading;
        btn.textContent = loading ? "İstek gönderiliyor…" : "Test Login";
      }

      f.addEventListener("submit", async function (e) {
        e.preventDefault();
        out.innerHTML = "";
        var roomNo = document.getElementById("roomNo").value.trim();
        var birthDate = document.getElementById("birthDate").value.trim();
        setLoading(true);
        var url = "/api/test/hotel-login";
        log("POST", url, { roomNo: roomNo, birthDate: birthDate });
        try {
          var t0 = performance.now();
          var res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomNo: roomNo, birthDate: birthDate }),
          });
          var ms = Math.round(performance.now() - t0);
          var data = {};
          try { data = await res.json(); } catch (parseErr) { log("json_parse_failed", parseErr); }
          log("response", { status: res.status, ok: res.ok, elapsedMs: ms, bodyKeys: Object.keys(data || {}) });
          if (res.ok && data.success && data.guest) {
            var g = data.guest;
            out.innerHTML =
              '<div class="card success"><strong>Başarılı</strong><dl>' +
              "<dt>Misafir</dt><dd>" + escapeHtml(g.guestName || "—") + "</dd>" +
              "<dt>Oda</dt><dd>" + escapeHtml(String(g.roomNo)) + "</dd>" +
              "<dt>RESID</dt><dd>" + escapeHtml(String(g.resId)) + "</dd>" +
              "<dt>RESNAMEID</dt><dd>" + escapeHtml(String(g.resNameId)) + "</dd>" +
              "<dt>Check-in</dt><dd>" + escapeHtml(String(g.checkin ?? "—")) + "</dd>" +
              "<dt>Check-out</dt><dd>" + escapeHtml(String(g.checkout ?? "—")) + "</dd>" +
              "</dl><p class=\"muted\">HTTP " + res.status + " · " + ms + " ms</p></div>";
          } else {
            var msg = (data && data.message) ? String(data.message) : ("HTTP " + res.status);
            out.innerHTML =
              '<div class="card error"><strong>Hata</strong><p>' + escapeHtml(msg) + "</p>" +
              "<p class=\"muted\">HTTP " + res.status + " · " + ms + " ms</p></div>";
          }
        } catch (err) {
          log("fetch_error", err);
          out.innerHTML =
            '<div class="card error"><strong>Ağ hatası</strong><p>' + escapeHtml(String(err && err.message || err)) + "</p></div>";
        } finally {
          setLoading(false);
        }
      });

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }
    })();
  </script>
</body>
</html>`;
}

export default router;
