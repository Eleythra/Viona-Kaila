import assert from "node:assert/strict";
import test from "node:test";
import { formatOperationalGroupMessageText } from "./operational-group-message-format.js";

test("İstek: kettle + not — Türkçe form bölümü ve tür, ham anahtar yok", () => {
  const text = formatOperationalGroupMessageText("request", {
    name: "Ahmet Bay",
    room: "1001",
    category: "kettle",
    details: {},
    description: "su ısıtıcısı lazım",
    submittedAt: "2026-04-08T12:00:00.000Z",
  });
  assert.match(text, /\*İSTEK\* · HK/);
  assert.match(text, /Form bölümü: Ekipman/);
  assert.match(text, /Talep türü: Su ısıtıcı/);
  assert.match(text, /Misafir notu: su ısıtıcısı lazım/);
  assert.ok(!text.includes("kettle"));
});

test("İstek: oda temizliği + şimdi", () => {
  const text = formatOperationalGroupMessageText("request", {
    name: "Test",
    room: "1205",
    category: "room_cleaning",
    details: { timing: "now" },
    description: "",
    submittedAt: "2026-04-08T12:00:00.000Z",
  });
  assert.match(text, /Oda hizmeti/);
  assert.match(text, /Oda temizliği · Şimdi/);
});

test("İstek: kategori büyük harf / camelCase — ham anahtar yok; yalnızca categories[]", () => {
  const text = formatOperationalGroupMessageText("request", {
    name: "Ahmet Bay",
    room: "1001",
    category: "Slippers",
    details: {},
    description: "aaa",
    submittedAt: "2026-04-08T12:00:00.000Z",
  });
  assert.ok(!text.includes("slippers") && !text.includes("Slippers"));
  assert.match(text, /Terlik/);
  assert.match(text, /Yastık, havlu, bornoz ve terlik/);

  const text2 = formatOperationalGroupMessageText("request", {
    name: "X",
    room: "1",
    categories: ["slippers"],
    details: {},
    description: "n",
    submittedAt: "2026-04-08T12:00:00.000Z",
  });
  assert.ok(!text2.includes("slippers"));
  assert.match(text2, /Terlik/);
});
