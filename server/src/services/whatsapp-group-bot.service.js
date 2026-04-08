import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import qrcode from "qrcode-terminal";

const require = createRequire(import.meta.url);

let ClientCtor = null;
let LocalAuthCtor = null;

let bootAttempted = false;
let bootPromise = null;
let client = null;
let state = {
  enabled: false,
  ready: false,
  lastError: "",
  lastReadyAt: "",
  lastQrAt: "",
};

const dedupeMap = new Map();

/** Aynı anda iki sendMessage → pupPage.evaluate çakışması, detached Frame sık görülür. */
let sendSerializeChain = Promise.resolve();

function runSendSerialized(fn) {
  const next = sendSerializeChain.then(() => fn());
  sendSerializeChain = next.catch(() => {});
  return next;
}

function isEnabled() {
  const v = String(process.env.WHATSAPP_GROUP_BOT_ENABLED || "0")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function loadWhatsappWebJs() {
  if (ClientCtor && LocalAuthCtor) return;
  /** CJS paketi; dinamik `import()` ile ESM sarmalayıcı bazen `LocalAuth`’u constructor olarak vermez. */
  const wweb = require("whatsapp-web.js");
  ClientCtor = wweb.Client;
  LocalAuthCtor = wweb.LocalAuth;
  if (typeof ClientCtor !== "function" || typeof LocalAuthCtor !== "function") {
    throw new Error("whatsapp_web_js_load_failed: Client or LocalAuth not a constructor");
  }
}

/** Sunucunun çalıştığı cwd ile aynı mantıkta Puppeteer önbelleği (QR için Chrome buradan). */
function ensurePuppeteerCacheDir() {
  if (String(process.env.PUPPETEER_CACHE_DIR || "").trim()) return;
  const custom = String(process.env.WHATSAPP_PUPPETEER_CACHE_DIR || "").trim();
  process.env.PUPPETEER_CACHE_DIR = custom
    ? path.resolve(process.cwd(), custom)
    : path.join(process.cwd(), ".cache", "puppeteer");
}

/**
 * Önce .env (yalnızca dosya gerçekten varsa), sonra Puppeteer’ın indirdiği Chrome,
 * sonra yaygın Linux Chromium yolları.
 */
function resolvePuppeteerExecutable() {
  const envPath = String(
    process.env.WHATSAPP_PUPPETEER_EXECUTABLE_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || "",
  ).trim();
  if (envPath) {
    if (fs.existsSync(envPath)) return envPath;
    console.warn(
      "[whatsapp_group_bot] puppeteer_executable_missing path=%s (yolu kaldırın veya doğru binary kurun; başka aday deneniyor)",
      envPath,
    );
  }

  try {
    const puppeteerPkg = require("puppeteer");
    if (typeof puppeteerPkg.executablePath === "function") {
      const p = puppeteerPkg.executablePath();
      if (p && fs.existsSync(p)) return p;
    }
  } catch {
    /* puppeteer yok veya tarayıcı indirilmemiş */
  }

  const systemCandidates = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ];
  for (const p of systemCandidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function parsePuppeteerHeadless() {
  const raw = String(process.env.WHATSAPP_GROUP_PUPPETEER_HEADLESS ?? "true").trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  /** Puppeteer 19+: daha az tespit; QR bağlantısı bazen buna ihtiyaç duyar. */
  if (raw === "new") return "new";
  return true;
}

function buildPuppeteerOptions() {
  ensurePuppeteerCacheDir();
  const executablePath = resolvePuppeteerExecutable();
  const opts = {
    headless: parsePuppeteerHeadless(),
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      /** WhatsApp Web bazen otomasyon bayrağını reddeder. */
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-size=1280,800",
    ],
  };
  if (executablePath) opts.executablePath = executablePath;
  return opts;
}

function sessionDir() {
  const raw = String(process.env.WHATSAPP_GROUP_SESSION_DIR || "runtime/whatsapp-session").trim();
  return path.resolve(process.cwd(), raw);
}

function clientId() {
  return String(process.env.WHATSAPP_GROUP_CLIENT_ID || "viona-operational").trim();
}

function rememberDedupe(key = "", ttlMs = 120000) {
  const now = Date.now();
  dedupeMap.set(key, now + ttlMs);
  for (const [k, exp] of dedupeMap.entries()) {
    if (exp <= now) dedupeMap.delete(k);
  }
}

function isDuplicate(key = "") {
  const now = Date.now();
  const exp = dedupeMap.get(key);
  if (!exp) return false;
  if (exp <= now) {
    dedupeMap.delete(key);
    return false;
  }
  return true;
}

async function writeQrPngFile(qrPayload) {
  const raw = String(qrPayload || "").trim();
  if (!raw) return;
  try {
    const QRCode = (await import("qrcode")).default;
    const outDir = path.resolve(process.cwd(), "runtime");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "whatsapp-last-qr.png");
    await QRCode.toFile(outFile, raw, { width: 420, margin: 2, errorCorrectionLevel: "M" });
    console.warn(
      "[whatsapp_group_bot] QR PNG (telefondan bunu tara): %s — WhatsApp → Ayarlar → Bağlı cihazlar → Cihaz bağla",
      outFile,
    );
  } catch (err) {
    console.warn("[whatsapp_group_bot] qr_png_write_failed error=%s", err?.message || err);
  }
}

function attachHandlers(botClient) {
  botClient.on("qr", (qr) => {
    state.lastQrAt = new Date().toISOString();
    state.ready = false;
    qrcode.generate(String(qr || ""), { small: true });
    void writeQrPngFile(qr);
    console.warn("[whatsapp_group_bot] qr_required last_qr_at=%s", state.lastQrAt);
  });

  botClient.on("ready", () => {
    state.ready = true;
    state.lastError = "";
    state.lastReadyAt = new Date().toISOString();
    console.info("[whatsapp_group_bot] ready at=%s", state.lastReadyAt);
  });

  botClient.on("auth_failure", (msg) => {
    state.ready = false;
    state.lastError = String(msg || "auth_failure");
    console.error("[whatsapp_group_bot] auth_failure detail=%s", state.lastError);
  });

  botClient.on("disconnected", (reason) => {
    state.ready = false;
    state.lastError = String(reason || "disconnected");
    console.warn("[whatsapp_group_bot] disconnected reason=%s", state.lastError);
  });
}

export async function ensureWhatsappGroupBotStarted() {
  if (bootAttempted) return bootPromise;
  bootAttempted = true;
  state.enabled = isEnabled();
  if (!state.enabled) {
    bootPromise = Promise.resolve(false);
    return bootPromise;
  }

  bootPromise = (async () => {
    try {
      loadWhatsappWebJs();
      const dir = sessionDir();
      fs.mkdirSync(dir, { recursive: true });
      const authTimeoutMs = Math.min(
        600_000,
        Math.max(30_000, Number(process.env.WHATSAPP_WWEB_AUTH_TIMEOUT_MS || 120000) || 120000),
      );
      /**
       * whatsapp-web.js: qrMaxRetries === 0 → “max QR” ile oturumu kesmez (sınırsız yenileme).
       * >0 ise o kadar QR değişiminden sonra destroy eder. Meta yine periyodik QR yeniler; bunu durduramayız.
       */
      const qrMaxRetries = (() => {
        const raw = String(process.env.WHATSAPP_WWEB_QR_MAX_RETRIES ?? "").trim();
        if (raw === "") return 0;
        const n = Math.floor(Number(raw));
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(9999, n);
      })();
      client = new ClientCtor({
        authStrategy: new LocalAuthCtor({
          clientId: clientId(),
          dataPath: dir,
        }),
        puppeteer: buildPuppeteerOptions(),
        /** QR sonrası yavaş ağ / WhatsApp Web yüklemesi için (varsayılan 30s bazen yetmez). */
        authTimeoutMs,
        /** 0 = vazgeçme yok (önerilen). Pozitif = en fazla o kadar QR turu sonra kesilir. */
        qrMaxRetries,
        /** Başka bir Web oturumu varsa bu tarayıcıya taşı (çakışma). */
        takeoverOnConflict: String(process.env.WHATSAPP_WWEB_TAKEOVER_ON_CONFLICT || "1") !== "0",
        takeoverTimeoutMs: Math.min(
          120_000,
          Math.max(0, Number(process.env.WHATSAPP_WWEB_TAKEOVER_TIMEOUT_MS || 60_000) || 60_000),
        ),
        deviceName: String(process.env.WHATSAPP_WWEB_DEVICE_NAME || "Viona Ops").slice(0, 60),
        browserName: String(process.env.WHATSAPP_WWEB_BROWSER_NAME || "Chrome").slice(0, 40),
        /** Kütüphane varsayılanı eski Chrome; güncel UA bağlantı reddini azaltabilir. */
        userAgent:
          String(process.env.WHATSAPP_WWEB_USER_AGENT || "").trim() ||
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      });
      attachHandlers(client);
      await client.initialize();
      return true;
    } catch (err) {
      state.lastError = String(err?.message || err || "init_failed");
      console.error("[whatsapp_group_bot] init_failed error=%s", state.lastError);
      try {
        if (client && typeof client.destroy === "function") {
          await client.destroy();
        }
      } catch {
        /* ignore */
      }
      client = null;
      /** Profil kilidi (çift süreç / eski Chromium): temizlik sonrası yeniden init denenebilsin. */
      const recoverable = /already running|userDataDir/i.test(state.lastError);
      if (recoverable) {
        bootAttempted = false;
        bootPromise = null;
        console.warn(
          "[whatsapp_group_bot] boot state reset (recoverable). Kill orphan Chrome for this session dir if needed, then retry send or restart API once.",
        );
      }
      return false;
    }
  })();

  return bootPromise;
}

export function getWhatsappGroupBotState() {
  /** `enabled` env’den okunur; `/api/health` isteği bot boot’tan önce gelirse bile doğru görünsün. */
  const raw = process.env.WHATSAPP_GROUP_BOT_ENABLED;
  return {
    enabled: isEnabled(),
    /** Teşhis: değer yazılmamışsa false sebebi genelde .env yüklenmemiş / yanlış dosya. */
    envKeySet: raw !== undefined && raw !== null && String(raw).trim() !== "",
    ready: state.ready,
    lastError: state.lastError,
    lastReadyAt: state.lastReadyAt,
    lastQrAt: state.lastQrAt,
  };
}

function readyWaitMs() {
  return Math.min(
    300_000,
    Math.max(3_000, Number(process.env.WHATSAPP_GROUP_SEND_READY_WAIT_MS || 120_000) || 120_000),
  );
}

/** WhatsApp Web sayfa yenilemesi / iframe kopması — kısa bekleyip tekrar dene. */
function isRetryableWhatsappWebSendError(msg) {
  return /detached Frame|Execution context was destroyed|Target closed|Protocol error|Session closed|Navigation|Frame.*detached/i.test(
    String(msg || ""),
  );
}

function sendMessageMaxAttempts() {
  const n = Number(process.env.WHATSAPP_GROUP_SEND_MAX_ATTEMPTS || "8");
  return Math.min(12, Math.max(1, Number.isFinite(n) ? n : 8));
}

/** ready sonrası WA Web arayüzü tam oturmadan evaluate → detached Frame. 0 = bekleme yok. */
function preSendSettleMs() {
  const n = Number(process.env.WHATSAPP_GROUP_PRE_SEND_SETTLE_MS ?? "5000");
  return Math.min(60_000, Math.max(0, Number.isFinite(n) ? n : 5000));
}

const SEND_TEXT_OPTIONS = {
  sendSeen: false,
  linkPreview: false,
};

async function settlePuppeteerBeforeSend(cli, fullSettle = true) {
  const ms = fullSettle ? preSendSettleMs() : 0;
  if (ms > 0) {
    await new Promise((r) => setTimeout(r, ms));
  }
  try {
    const page = cli?.pupPage;
    if (page && typeof page.isClosed === "function" && !page.isClosed() && typeof page.bringToFront === "function") {
      await page.bringToFront();
    }
  } catch {
    /* headless / kapalı sayfa */
  }
}

export async function sendMessageToWhatsappGroup({ groupId, text, dedupeKey = "" }) {
  if (!isEnabled()) {
    throw new Error("whatsapp_group_bot_disabled");
  }
  const booted = await ensureWhatsappGroupBotStarted();
  if (!booted) {
    throw new Error(`whatsapp_group_bot_init_failed: ${state.lastError || "unknown"}`);
  }
  const maxWait = readyWaitMs();
  const start = Date.now();
  while (!state.ready) {
    if (Date.now() - start > maxWait) {
      throw new Error(
        `whatsapp_group_bot_ready_timeout after ${maxWait}ms (lastError=${state.lastError || "-"})`,
      );
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!client) {
    throw new Error("whatsapp_group_bot_no_client");
  }
  const gid = String(groupId || "").trim();
  if (!gid) {
    throw new Error("whatsapp_group_id_required");
  }
  if (dedupeKey && isDuplicate(dedupeKey)) {
    return { ok: true, duplicate: true, messageId: "", groupId: gid };
  }
  const body = String(text || "").trim() || " ";

  return runSendSerialized(async () => {
    await settlePuppeteerBeforeSend(client, true);

    const maxAttempts = sendMessageMaxAttempts();
    let result;
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        result = await client.sendMessage(gid, body, SEND_TEXT_OPTIONS);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        const msg = String(err?.message || err || "send_failed");
        const retryable = isRetryableWhatsappWebSendError(msg);
        if (retryable && attempt < maxAttempts) {
          const waitMs = Math.min(35_000, 3000 * attempt);
          console.warn(
            "[whatsapp_group_bot] sendMessage retry attempt=%d/%d wait_ms=%d error=%s",
            attempt,
            maxAttempts,
            waitMs,
            msg.slice(0, 220),
          );
          await new Promise((r) => setTimeout(r, waitMs));
          await settlePuppeteerBeforeSend(client, false);
          continue;
        }
        console.error("[whatsapp_group_bot] sendMessage failed groupId=%s error=%s", gid, msg);
        throw err;
      }
    }
    if (lastErr || !result) {
      throw lastErr || new Error("whatsapp_group_bot_send_exhausted_retries");
    }
    if (dedupeKey) rememberDedupe(dedupeKey);
    return {
      ok: true,
      duplicate: false,
      groupId: gid,
      messageId: String(result?.id?._serialized || ""),
    };
  });
}

export async function listWhatsappGroups() {
  if (!isEnabled()) throw new Error("whatsapp_group_bot_disabled");
  if (!client || !state.ready) throw new Error("whatsapp_group_bot_not_ready");
  const chats = await client.getChats();
  return chats
    .filter((chat) => chat.isGroup)
    .map((chat) => ({
      id: String(chat.id?._serialized || ""),
      name: String(chat.name || "").trim(),
    }))
    .filter((x) => x.id);
}

/** PM2/systemd yeniden başlatmadan önce Chromium kilidini bırakmak için. */
export async function shutdownWhatsappGroupBot() {
  const c = client;
  if (!c) return;
  client = null;
  state.ready = false;
  state.lastError = "";
  try {
    await c.destroy();
    console.info("[whatsapp_group_bot] shutdown destroy ok");
  } catch (err) {
    console.warn("[whatsapp_group_bot] shutdown destroy error=%s", err?.message || err);
  }
}
