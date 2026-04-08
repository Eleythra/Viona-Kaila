#!/usr/bin/env node
/**
 * Yerel veya uzak API: örnek "oda temizliği" isteği oluşturur; WhatsApp grup sonucunu yazdırır.
 *
 * Kullanım (server klasöründen):
 *   node scripts/smoke-guest-request-room-cleaning.mjs
 *
 * Taban URL:
 *   SMOKE_API_BASE=http://127.0.0.1:3001
 *
 * Çıkış kodları: 0 başarılı gönderim, 1 bağlantı/JSON hatası, 2 eksik grup ID, 3 sendMessage hatası, 4 diğer.
 */

const BASE = String(process.env.SMOKE_API_BASE || "http://127.0.0.1:3001").replace(/\/+$/, "");

async function main() {
  const healthRes = await fetch(`${BASE}/api/health`, { cache: "no-store" });
  if (!healthRes.ok) {
    console.error(`Health HTTP ${healthRes.status} — sunucu çalışıyor mu? (${BASE})`);
    process.exit(1);
  }
  const health = await healthRes.json();
  console.log("--- GET /api/health (özet) ---");
  console.log("hasSupabase:", health.hasSupabase);
  console.log("whatsappGroupBot:", JSON.stringify(health.whatsappGroupBot, null, 2));
  console.log("groupRegistry:", JSON.stringify(health.whatsappOperational?.groupRegistry, null, 2));

  const body = {
    type: "request",
    name: "Smoke Oda Temizligi",
    room: "1205",
    nationality: "TR",
    description: "",
    category: "room_cleaning",
    details: { timing: "now" },
  };

  const res = await fetch(`${BASE}/api/guest-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    console.error("Geçersiz JSON:", text.slice(0, 800));
    process.exit(1);
  }

  console.log("\n--- POST /api/guest-requests (oda temizliği, timing=now) ---");
  console.log(JSON.stringify(data, null, 2));

  const wa = data?.whatsapp;
  if (!res.ok || !data?.ok) {
    console.error("\nİstek oluşturulamadı (validasyon veya sunucu hatası).");
    process.exit(4);
  }

  /** Sunucu WA’yı arka planda gönderir; yanıtta genelde { pending: true } gelir. */
  if (wa?.pending === true) {
    console.log(
      "\nOK: Kayıt oluşturuldu; WhatsApp grup bildirimi arka planda (sunucu logu: [whatsapp_ops] / [whatsapp_group_bot]).",
    );
    console.log("Birkaç saniye sonra tekrar health kontrol ediliyor…");
    await new Promise((r) => setTimeout(r, 4000));
    const h2 = await fetch(`${BASE}/api/health`, { cache: "no-store" }).then((x) => x.json());
    const bot = h2?.whatsappGroupBot;
    console.log("whatsappGroupBot.ready:", bot?.ready);
    console.log("whatsappGroupBot.lastError:", bot?.lastError || "(yok)");
    if (!bot?.ready) {
      console.error(
        "\nUYARI: Bot ready değil — mesaj gönderilememiş olabilir. Çözüm: çift Chrome kilidini kapatıp tek `node` ile API’yi yeniden başlatın; QR gerekiyorsa whatsapp-last-qr.png",
      );
      process.exit(5);
    }
    process.exit(0);
  }

  if (wa?.ok === true && wa?.channel === "group") {
    console.log("\nOK: whatsapp.ok=true — HK grubuna mesaj gitmiş olmalı (duplicate=true ise aynı anahtar tekrarı).");
    process.exit(0);
  }

  if (wa?.skipped === true && String(wa?.reason || "") === "missing_group_id") {
    console.error("\nUYARI: WHATSAPP_GROUP_ID_HK .env içinde yok veya API yeniden başlatılmadı.");
    process.exit(2);
  }

  if (String(wa?.reason || "") === "send_failed") {
    console.error(
      "\nHATA: WhatsApp sendMessage başarısız. whatsapp.error, sunucu logu [whatsapp_group_bot] ve grupta bot üyeliğini kontrol edin.",
    );
    process.exit(3);
  }

  console.error("\nBeklenmeyen whatsapp özeti:", JSON.stringify(wa));
  process.exit(4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
