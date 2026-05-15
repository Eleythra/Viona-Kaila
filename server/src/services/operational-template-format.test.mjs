import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOperationalWhatsappEightParamValues,
  buildOperationalWhatsappTemplateBodyParams,
  formatOperationalTemplatePreviewText,
} from "./operational-template-format.js";

test("İstek: hk_water + adet — önizlemede talep kategorisi / tür / adet", () => {
  const text = formatOperationalTemplatePreviewText("request", {
    name: "Ahmet Bay",
    room: "1001",
    category: "hk_water",
    details: { quantity: 2 },
    description: "oda 12",
    submittedAt: "2026-04-08T12:00:00.000Z",
  });
  assert.match(text, /\*İSTEK\* · HK/);
  assert.match(text, /Talep kategorisi: İçecek & oda ikramları/);
  assert.match(text, /Talep türü: Su isteği \(adet\)/);
  assert.match(text, /Adet: 2/);
  assert.match(text, /Açıklama notu: oda 12/);
});

test("Teknik: ft_ac_fault — WhatsApp gövdesiyle aynı düzen (7 satır + açıklama)", () => {
  const text = formatOperationalTemplatePreviewText("fault", {
    name: "Test Misafir",
    room: "3007",
    category: "ft_ac_fault",
    details: { quantity: 1 },
    description: "Klima açılmıyor",
    submittedAt: "2026-03-31T11:40:00.000Z",
  });
  assert.match(text, /Arıza Kaydı Oluşturuldu/);
  assert.match(text, /Arıza kaydı detayları aşağıdadır\./);
  assert.match(text, /Misafir adı: Test Misafir/);
  assert.match(text, /Oda numarası: 3007/);
  assert.match(text, /Talep kategorisi: Klima & Havalandırma/);
  assert.match(text, /Talep türü: Klima Arızası/);
  assert.match(text, /Tarih bilgisi: 31\.03\.2026/);
  assert.match(text, /Saat bilgisi: 14:40/);
  assert.match(text, /Açıklama notu: Klima açılmıyor olarak iletildi/);
  assert.ok(!/Adet:/.test(text));
  assert.ok(!/Kayıt zamanı/.test(text));
});

test("Teknik: açıklama boş — önizlemede açıklama satırı yok", () => {
  const text = formatOperationalTemplatePreviewText("fault", {
    name: "X",
    room: "1",
    category: "ft_socket_fault",
    details: { quantity: 1 },
    description: "",
    submittedAt: "2026-04-08T12:00:00.000Z",
  });
  assert.ok(!/Açıklama notu/.test(text));
});

test("WhatsApp 7 parametre (teknik): adet satırı yok; sıra ad, oda, üst kategori, tür, tarih, saat, açıklama", () => {
  const params = buildOperationalWhatsappTemplateBodyParams(
    "fault",
    {
      name: "N",
      room: "R",
      category: "ft_tv_fault",
      details: {},
      description: "",
    },
    new Date("2026-04-08T15:00:00.000Z"),
  );
  assert.equal(params.length, 7);
  assert.equal(params[4], "08.04.2026");
  assert.equal(params[5], "18:00");
  assert.equal(params[6], "");
});

test("WhatsApp 8-param iç üretim (teknik): adet yoksa 1 (HK şablonu / PDF ile uyum)", () => {
  const params = buildOperationalWhatsappEightParamValues(
    "fault",
    {
      name: "N",
      room: "R",
      category: "ft_tv_fault",
      details: {},
      description: "",
    },
    new Date("2026-04-08T15:00:00.000Z"),
  );
  assert.equal(params[4], "1");
  assert.equal(params[7], "");
});
