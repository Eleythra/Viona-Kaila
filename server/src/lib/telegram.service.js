import { getEnv } from "../config/env.js";
import {
  FAULT_CATEGORY_TR,
  FAULT_LOCATION_TR,
  FAULT_URGENCY_TR,
  labelOrRaw,
  REQUEST_CATEGORY_TR,
  REQUEST_ITEM_TYPE_TR,
  REQUEST_REQUEST_TYPE_TR,
  REQUEST_TIMING_TR,
} from "./telegram-labels-tr.js";

const TZ = "Europe/Istanbul";

function truncate(s, max) {
  const t = String(s || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function formatSubmittedDateTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
    const dateFmt = new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: TZ,
    });
    const timeFmt = new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    });
    return { date: dateFmt.format(d), time: timeFmt.format(d) };
  } catch {
    return { date: "—", time: "—" };
  }
}

function buildFaultTelegramText(normalized) {
  const { date, time } = formatSubmittedDateTime(normalized.submittedAt);
  const name = truncate(normalized.name, 120) || "—";
  const room = truncate(normalized.room, 20) || "—";
  const category = labelOrRaw(FAULT_CATEGORY_TR, normalized.category);
  const location = labelOrRaw(
    FAULT_LOCATION_TR,
    normalized.location || normalized.details?.location,
  );
  const urgency = labelOrRaw(FAULT_URGENCY_TR, normalized.urgency || normalized.details?.urgency);

  const lines = [
    "Yeni arıza kaydı",
    "",
    `Ad Soyad: ${name}`,
    `Oda: ${room}`,
    `Arıza kategorisi: ${category}`,
    `Lokasyon: ${location}`,
    `Aciliyet: ${urgency}`,
    `Tarih: ${date}`,
    `Saat: ${time}`,
  ];
  return lines.join("\n");
}

function requestSublineAndQuantity(normalized) {
  const cat = normalized.category;
  const d = normalized.details && typeof normalized.details === "object" ? normalized.details : {};
  let subline = "";
  let quantity = null;

  if (cat === "towel" || cat === "bedding") {
    subline = labelOrRaw(REQUEST_ITEM_TYPE_TR, d.itemType);
    quantity = d.quantity;
  } else if (cat === "room_cleaning") {
    const rt = labelOrRaw(REQUEST_REQUEST_TYPE_TR, d.requestType);
    const tm = labelOrRaw(REQUEST_TIMING_TR, d.timing);
    subline = tm !== "—" ? `${rt} · ${tm}` : rt;
  } else if (cat === "minibar") {
    subline = labelOrRaw(REQUEST_REQUEST_TYPE_TR, d.requestType);
  } else if (cat === "baby_equipment" || cat === "room_equipment") {
    subline = labelOrRaw(REQUEST_ITEM_TYPE_TR, d.itemType);
    quantity = d.quantity;
  } else if (cat === "other") {
    subline = truncate(normalized.description || normalized.otherCategoryNote, 100) || "Diğer";
  }

  if (!subline) subline = "—";
  return { subline: truncate(subline, 140), quantity };
}

function buildRequestTelegramText(normalized) {
  const { date, time } = formatSubmittedDateTime(normalized.submittedAt);
  const name = truncate(normalized.name, 120) || "—";
  const room = truncate(normalized.room, 20) || "—";
  const category = labelOrRaw(REQUEST_CATEGORY_TR, normalized.category);
  const { subline, quantity } = requestSublineAndQuantity(normalized);

  const hasAdet =
    quantity != null && Number.isFinite(Number(quantity)) && Number(quantity) > 0;

  const lines = [
    "Yeni istek kaydı",
    "",
    `Ad Soyad: ${name}`,
    `Oda: ${room}`,
    `Talep kategorisi: ${category}`,
    `Talep türü: ${subline}`,
  ];
  if (hasAdet) lines.push(`Adet: ${quantity}`);
  lines.push(`Tarih: ${date}`, `Saat: ${time}`);
  return lines.join("\n");
}

async function sendTelegramMessage(botToken, chatId, text) {
  const token = String(botToken || "").trim();
  const chat = String(chatId || "").trim();
  if (!token || !chat) return { skipped: true };

  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text,
      disable_web_page_preview: true,
    }),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || !data.ok) {
    const msg = data.description || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return { skipped: false };
}

function warnSkipTeknik() {
  console.warn(
    "[telegram] Teknik arıza bildirimi atlandı: TELEGRAM_TEKNIK_BOT_TOKEN ve TELEGRAM_TEKNIK_CHAT_ID ikisi de dolu olmalı (Render Environment / server/.env).",
  );
}

function warnSkipHk() {
  console.warn(
    "[telegram] HK istek bildirimi atlandı: TELEGRAM_HK_BOT_TOKEN ve TELEGRAM_HK_CHAT_ID ikisi de dolu olmalı.",
  );
}

export async function notifyTechnicalFaultRecord(normalized) {
  const env = getEnv();
  const token = env.telegramTeknikBotToken;
  const chatId = env.telegramTeknikChatId;
  if (!token || !chatId) {
    warnSkipTeknik();
    return;
  }

  const text = buildFaultTelegramText(normalized);
  await sendTelegramMessage(token, chatId, text);
}

export async function notifyHkRequestRecord(normalized) {
  const env = getEnv();
  const token = env.telegramHkBotToken;
  const chatId = env.telegramHkChatId;
  if (!token || !chatId) {
    warnSkipHk();
    return;
  }

  const text = buildRequestTelegramText(normalized);
  await sendTelegramMessage(token, chatId, text);
}

/**
 * Kayıt DB'ye yazıldıktan sonra çağrılır; ana akışı bloklamaz, hatalar loglanır.
 * @param {object} normalized — createGuestRequest içindeki normalize edilmiş gövde
 * @param {'request'|'complaint'|'fault'|'reservation'} bucket
 */
export function scheduleGuestRecordTelegram(normalized, bucket) {
  if (bucket === "fault") {
    void notifyTechnicalFaultRecord(normalized).catch((err) => {
      console.error(
        "[telegram] Teknik kanal arıza bildirimi başarısız:",
        err && err.message ? err.message : err,
      );
    });
    return;
  }
  if (bucket === "request") {
    void notifyHkRequestRecord(normalized).catch((err) => {
      console.error(
        "[telegram] HK kanal istek bildirimi başarısız:",
        err && err.message ? err.message : err,
      );
    });
  }
}
