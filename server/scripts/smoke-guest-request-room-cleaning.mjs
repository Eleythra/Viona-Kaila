#!/usr/bin/env node
/**
 * Yerel veya uzak API: örnek "oda temizliği" isteği oluşturur; WhatsApp Cloud şablon arka planda.
 *
 *   SMOKE_API_BASE=http://127.0.0.1:3001 node scripts/smoke-guest-request-room-cleaning.mjs
 *
 * Çıkış: 0 kayıt OK, 1 bağlantı/JSON, 4 oluşturma hatası.
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
  const op = health.whatsappOperational || {};
  console.log("whatsappOperational.cloudApiSendReady:", op.cloudApiSendReady);
  console.log("whatsappOperational.cloudRecipientCounts:", JSON.stringify(op.cloudRecipientCounts));

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

  console.log("\n--- POST /api/guest-requests ---");
  console.log(JSON.stringify(data, null, 2));

  if (!res.ok || !data?.ok) {
    console.error("\nİstek oluşturulamadı (validasyon veya sunucu hatası).");
    process.exit(4);
  }

  console.log(
    "\nOK: Kayıt oluşturuldu; WhatsApp Cloud şablon [whatsapp_ops] logundan izlenir. cloudApiSendReady=false ise .env token/phone ID ve WHATSAPP_HK_RECIPIENTS.",
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
