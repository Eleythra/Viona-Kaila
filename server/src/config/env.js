import dotenv from "dotenv";
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** `server/` kökü — `env.js` konumuna göre (cwd’den bağımsız). */
const serverRoot = path.resolve(__dirname, "..", "..");

/** Son yüklenen `.env` özeti (health teşhisi; değer sızdırmaz). */
let envBootstrap = {
  loadedPath: "",
  parsedKeyCount: 0,
  error: "",
};

function applyParsedToProcessEnv(parsed) {
  for (const [key, value] of Object.entries(parsed)) {
    /* Shell / platform ortamı önce gelir; `.env` yalnızca boş anahtarları doldurur (örn. PORT=3002 ile geçici port). */
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    process.env[key] = String(value);
  }
}

/**
 * Önce dosyayı UTF-8 okuyup `dotenv.parse` ile `process.env`’e yazıyoruz (BOM / satır sonu edge-case).
 * Ardından `dotenv.config` (override yok — mevcut ortam kazanır).
 */
function loadServerDotenv() {
  const candidates = [
    path.join(serverRoot, ".env"),
    path.join(process.cwd(), "server", ".env"),
    path.join(process.cwd(), ".env"),
  ];
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (!fs.existsSync(resolved)) continue;
    try {
      let text = fs.readFileSync(resolved, "utf8");
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      const parsed = dotenv.parse(text);
      applyParsedToProcessEnv(parsed);
      dotenv.config({ path: resolved, override: false });
      envBootstrap = {
        loadedPath: resolved,
        parsedKeyCount: Object.keys(parsed).length,
        error: "",
      };
      return;
    } catch (err) {
      envBootstrap = {
        loadedPath: resolved,
        parsedKeyCount: 0,
        error: String(err?.message || err),
      };
      /* Bir sonraki aday yolu dene. */
    }
  }
  dotenv.config();
}

loadServerDotenv();

/**
 * Supabase vb. için `getaddrinfo EAI_AGAIN` (geçici DNS) sık görülür.
 * ipv4first + isteğe bağlı genel çözümleyiciler (DNS_SERVERS) ile azaltılır.
 */
function applyNodeDnsFromEnv() {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* çok eski Node */
  }
  const raw = String(process.env.DNS_SERVERS || "").trim();
  if (!raw) return;
  const servers = raw
    .split(",")
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  if (!servers.length) return;
  try {
    dns.setServers(servers);
    console.info("[dns] DNS_SERVERS aktif (%d sunucu)", servers.length);
  } catch (err) {
    console.warn("[dns] DNS_SERVERS geçersiz, yok sayılıyor: %s", String(err?.message || err));
  }
}

applyNodeDnsFromEnv();

/** `/api/health` teşhisi: tam yol yerine sadece dosya adı + sayılar. */
export function getEnvBootstrapDiagnostics() {
  const p = envBootstrap.loadedPath;
  const base = p ? path.basename(p) : "";
  const dnsCustom = String(process.env.DNS_SERVERS || "").trim();
  return {
    serverEnvLoaded: Boolean(p),
    serverEnvFile: base || null,
    parsedKeyCount: envBootstrap.parsedKeyCount,
    loadError: envBootstrap.error || null,
    cwd: process.cwd(),
    dnsIpv4First: true,
    dnsCustomResolverCount: dnsCustom
      ? dnsCustom.split(",").filter((x) => String(x || "").trim()).length
      : 0,
  };
}

function optional(name, fallback = "") {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim();
}

/** İlk dolu anahtarı kullanır (Render’da yanlış isimle eklenmiş değişkenler için). */
function optionalAny(names, fallback = "") {
  for (const name of names) {
    const v = optional(name, "");
    if (v) return v;
  }
  return fallback;
}

/**
 * Render/Meta panelinden yapıştırma: UTF-8 BOM, çevreleyen tırnak, fazla boşluk.
 * İkinci isim: eski dokümantasyonda görülen FACEBOOK_APP_SECRET (aynı App Secret).
 */
export function readWhatsappMetaAppSecret() {
  for (const name of ["WHATSAPP_APP_SECRET", "FACEBOOK_APP_SECRET"]) {
    const raw = process.env[name];
    if (raw == null) continue;
    let s = String(raw).trim();
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1).trim();
    if (
      s.length >= 2 &&
      ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))
    ) {
      s = s.slice(1, -1).trim();
    }
    if (s) return s;
  }
  return "";
}

function optionalInt(name, fallback) {
  const raw = optional(name, String(fallback));
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function optionalCsv(name, fallback = []) {
  const raw = optional(name, "");
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}

/** @returns {"bearer"|"raw"|"query"|"none"} */
function normalizeElektraAuthMode(raw) {
  const s = String(raw || "bearer").trim().toLowerCase();
  if (s === "raw" || s === "header_raw" || s === "plain") return "raw";
  if (s === "query" || s === "query_only") return "query";
  if (s === "none" || s === "off") return "none";
  return "bearer";
}

/** 0 = özellik kapalı; boş = varsayılan (ms). */
function optionalNonNegativeMs(name, fallbackMs) {
  const v = process.env[name];
  if (v === "0") return 0;
  if (v === undefined || v === null || String(v).trim() === "") return fallbackMs;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallbackMs;
  return Math.floor(n);
}

export function getEnv() {
  return {
    port: optionalInt("PORT", 3001),
    openAiApiKey: optional("OPENAI_API_KEY", ""),
    openAiVectorStoreId: optional("OPENAI_VECTOR_STORE_ID", ""),
    openAiModel: optional("OPENAI_MODEL", "gpt-4.1-mini"),
    /** PDF insight katmanı; boşsa AI devre dışı, deterministic metinler kullanılır. */
    geminiApiKey: optional("GEMINI_API_KEY", ""),
    geminiModel: optional("GEMINI_MODEL", "gemini-2.5-flash-lite"),
    /** PDF insight önbelleği (ms). 0 = önbellek yok (prompt değişince anında yeni metin). */
    geminiPdfCacheTtlMs: optionalNonNegativeMs("GEMINI_PDF_CACHE_TTL_MS", 5 * 60 * 1000),
    /** PDF kapak görseli; yoksa proje varsayılanları denenir. */
    reportHotelCoverPath: optional("REPORT_HOTEL_COVER_PATH", ""),
    reportBrandLogoPath: optional("REPORT_BRAND_LOGO_PATH", ""),
    /** Eski davranış (tüm zaman); artık kullanılmıyor — PDF/pano varsayılanı son 30 gündür. */
    reportPdfFullFrom: optional("REPORT_PDF_FULL_FROM", ""),
    chatDebug: optional("CHAT_DEBUG", "0") === "1",
    supabaseUrl: optional("SUPABASE_URL", ""),
    supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY", ""),
    get hasSupabase() {
      return Boolean(
        String(this.supabaseUrl || "").trim() && String(this.supabaseServiceRoleKey || "").trim(),
      );
    },
    /** Misafir arıza kaydı → Teknik Telegram grubu (boşsa bildirim atlanır). */
    telegramTeknikBotToken: optionalAny([
      "TELEGRAM_TEKNIK_BOT_TOKEN",
      "TELEGRAM_TECHNICAL_BOT_TOKEN",
    ]),
    telegramTeknikChatId: optionalAny([
      "TELEGRAM_TEKNIK_CHAT_ID",
      "TELEGRAM_TECHNICAL_CHAT_ID",
    ]),
    /** Misafir istek kaydı → HK Telegram grubu (boşsa bildirim atlanır). */
    telegramHkBotToken: optionalAny(["TELEGRAM_HK_BOT_TOKEN", "TELEGRAM_HOUSEKEEPING_BOT_TOKEN"]),
    telegramHkChatId: optionalAny(["TELEGRAM_HK_CHAT_ID", "TELEGRAM_HOUSEKEEPING_CHAT_ID"]),
    /** Azure Speech (TTS/STT) — yalnızca sunucu; boşsa /api/tts ve /api/stt 503 döner */
    azureSpeechKey: optional("AZURE_SPEECH_KEY", ""),
    azureSpeechRegion: optional("AZURE_SPEECH_REGION", "westeurope"),
    /** Azure REST çağrıları için ms; 0 = zaman sınırı yok (STT iki deneme yapabilir, süre ikiye katlanabilir). */
    azureSpeechFetchTimeoutMs: optionalNonNegativeMs("AZURE_SPEECH_FETCH_TIMEOUT_MS", 25_000),
    /** Admin API auth token (zorunlu). */
    adminApiToken: optional("ADMIN_API_TOKEN", ""),
    /** Saha ekip sayfaları (admin/ops-*.html): tam admin token’dan ayrı; yalnızca ilgili kova listesi + durum PATCH. */
    opsLinkTokenHk: optional("OPS_LINK_TOKEN_HK", ""),
    opsLinkTokenTech: optional("OPS_LINK_TOKEN_TECH", ""),
    opsLinkTokenFront: optional("OPS_LINK_TOKEN_FRONT", ""),
    /**
     * 1 ise /api/ops istekleri (yalnızca admin / bilinen statik origin’lerden) token olmadan kabul edilir;
     * rol X-Viona-Ops-Page başlığından (ops-hk.html → hk) alınır. Linkte #/?k= gerekmez.
     */
    opsTrustOpsPageHeader: optional("OPS_TRUST_OPS_PAGE_HEADER", "") === "1",
    /** `1` ise personel manuel kayıtları da sessiz saatte misafir kurallarına tabi olur (varsayılan: hayır). */
    opsManualRespectQuietHours: optional("OPS_MANUAL_RESPECT_QUIET_HOURS", "") === "1",
    /** CORS allowlist (virgülle ayrılmış origin listesi). */
    corsAllowedOrigins: optionalCsv("CORS_ALLOWED_ORIGINS", []),
    /** Basit rate-limit. */
    rateLimitWindowMs: optionalInt("RATE_LIMIT_WINDOW_MS", 60_000),
    rateLimitMax: optionalInt("RATE_LIMIT_MAX", 180),
    adminRateLimitMax: optionalInt("ADMIN_RATE_LIMIT_MAX", 80),
    /** Meta WhatsApp App Secret (Render: WHATSAPP_APP_SECRET). Webhook POST imzası; boşsa doğrulama yok. */
    get whatsappAppSecret() {
      return readWhatsappMetaAppSecret();
    },
    /**
     * TTS/STT: istemci `X-Viona-Speech-Secret` ile aynı değeri göndermeli. Boşsa kontrol yok (mevcut davranış).
     * Statik sitede aynı değer `window.__VIONA_SPEECH_CLIENT_SECRET__` ile verilir (kaynak görüntülenebilir; maliyet sınırı).
     */
    speechClientSecret: optionalAny(["SPEECH_CLIENT_SECRET", "VIONA_SPEECH_CLIENT_SECRET"], ""),
    /**
     * `1` (varsayılan): Vercel vb. proxy `Origin` iletmezse `X-Forwarded-Host` / `Forwarded` ile izinli köken kontrolü.
     * `0`: yalnızca Origin/Referer + doğru secret (doğrudan API erişiminde spoof riskini azaltır).
     */
    speechTrustForwardedOrigin: optional("SPEECH_TRUST_FORWARDED_ORIGIN", "1") !== "0",
    /** ElektraWeb Hotspot misafir listesi — `GET .../apisequence/GetHotspotList?HOTELID=` */
    elektraBaseUrl: optional("ELEKTRA_BASE_URL", ""),
    elektraHotelId: optional("ELEKTRA_HOTEL_ID", ""),
    /** Tam `hotspot#otelId$secret` veya yalnızca secret (otel id ayrı env’deyse birleştirilir). */
    elektraToken: optional("ELEKTRA_TOKEN", ""),
    /**
     * Hotspot listesi path (Postman’daki path ile birebir). Varsayılan Elektra HotelAdvisor sırası.
     */
    elektraHotspotPath: optional("ELEKTRA_HOTSPOT_PATH", "/apisequence/GetHotspotList"),
    /**
     * bearer = Authorization: Bearer {credential}
     * raw = Authorization: {credential} (Bearer öneki yok)
     * query = Authorization yok; credential ELEKTRA_AUTH_QUERY_KEY ile query’de
     */
    elektraAuthMode: optional("ELEKTRA_AUTH_MODE", "bearer").toLowerCase(),
    /** Authorization header adı (varsayılan Postman ile uyumlu). */
    elektraAuthHeader: optional("ELEKTRA_AUTH_HEADER", "Authorization"),
    /**
     * Doluysa URL’e eklenir: &KEY=encodeURIComponent(credential)
     * MODE=query iken zorunlu; bearer/raw ile birlikte kullanılırsa ek parametre olarak gönderilir.
     */
    elektraAuthQueryKey: optional("ELEKTRA_AUTH_QUERY_KEY", ""),
    get elektraAuthModeNormalized() {
      return normalizeElektraAuthMode(this.elektraAuthMode);
    },
    /**
     * `1` ise misafir istekleri (POST guest-requests vb.) Supabase insert öncesi Elektra ile doğrulanır.
     * Kapı ekranı için ayrıca `GUEST_PMS_GATE_VERIFY_ENABLED` kullanılır — ikisi bağımsız.
     */
    guestPmsVerifyEnabled: optional("GUEST_PMS_VERIFY_ENABLED", "") === "1",
    /**
     * Kapıda Elektra ile ad+oda doğrulaması.
     * `GUEST_PMS_GATE_VERIFY_ENABLED` açıkça `0`/`1` değilse, geriye dönük olarak `GUEST_PMS_VERIFY_ENABLED` ile aynı kabul edilir.
     */
    guestPmsGateVerifyEnabled: (() => {
      const raw = String(optional("GUEST_PMS_GATE_VERIFY_ENABLED", "") || "").trim();
      if (raw === "1") return true;
      if (raw === "0") return false;
      return optional("GUEST_PMS_VERIFY_ENABLED", "") === "1";
    })(),
    guestPmsVerifyTypesCsv: optional(
      "GUEST_PMS_VERIFY_TYPES",
      "request,complaint,fault,guest_notification",
    ),
    elektraCacheTtlMs: optionalNonNegativeMs("ELEKTRA_CACHE_TTL_MS", 5 * 60 * 1000),
    elektraFetchTimeoutMs: optionalNonNegativeMs("ELEKTRA_FETCH_TIMEOUT_MS", 12_000),
    elektraFetchMaxRetries: optionalInt("ELEKTRA_FETCH_MAX_RETRIES", 2),
    guestVerifyFailMax: optionalInt("GUEST_VERIFY_FAIL_MAX", 5),
    guestVerifyFailWindowMs: optionalInt("GUEST_VERIFY_FAIL_WINDOW_MS", 10 * 60 * 1000),
    get guestPmsVerifyTypeSet() {
      const raw = String(this.guestPmsVerifyTypesCsv || "")
        .split(",")
        .map((x) => String(x || "").trim().toLowerCase())
        .filter(Boolean);
      return new Set(raw.length ? raw : ["request", "complaint", "fault", "guest_notification"]);
    },
    /** Form / insert öncesi PMS doğrulaması açık mı. */
    get elektraInsertVerifyConfigured() {
      const qk = String(this.elektraAuthQueryKey || "").trim();
      if (this.elektraAuthModeNormalized === "query" && !qk) return false;
      return Boolean(
        this.guestPmsVerifyEnabled &&
          String(this.elektraBaseUrl || "").trim() &&
          String(this.elektraHotelId || "").trim() &&
          String(this.elektraToken || "").trim(),
      );
    },
    /** Kapı ekranında Elektra ile doğrulama açık mı. */
    get elektraGateVerifyConfigured() {
      const qk = String(this.elektraAuthQueryKey || "").trim();
      if (this.elektraAuthModeNormalized === "query" && !qk) return false;
      return Boolean(
        this.guestPmsGateVerifyEnabled &&
          String(this.elektraBaseUrl || "").trim() &&
          String(this.elektraHotelId || "").trim() &&
          String(this.elektraToken || "").trim(),
      );
    },
    /** Hotspot URL + otel + token dolu mu (`GUEST_PMS_VERIFY_ENABLED` şart değil — smoke / kurulum). */
    get elektraHotspotCredentialsConfigured() {
      const qk = String(this.elektraAuthQueryKey || "").trim();
      if (this.elektraAuthModeNormalized === "query" && !qk) return false;
      return Boolean(
        String(this.elektraBaseUrl || "").trim() &&
          String(this.elektraHotelId || "").trim() &&
          String(this.elektraToken || "").trim(),
      );
    },
    /**
     * Misafir kapı şifreleri — yalnızca sunucuda; tarayıcıya gönderilmez.
     * İkinci şifre isteğe bağlı: `VIONA_UI_GATE_PASSWORD_2`. Karşılaştırma büyük/küçük harf duyarsız (tr).
     */
    guestUiGatePassword: optional("VIONA_UI_GATE_PASSWORD", ""),
    guestUiGatePassword2: optional("VIONA_UI_GATE_PASSWORD_2", ""),
    /**
     * Kurulum / test: otelde konaklamadan uygulamaya girmek için sunucuda sabit ad+oda çifti.
     * Eşleşirse Elektra çağrılmadan kapı geçilir (canlı konak listesinde olmak şart değildir).
     * Üretimde yalnız gerçek misafir + Elektra ile çalışılacaksa boş bırakın.
     */
    vionaDeployGuestFullName: optional("VIONA_DEPLOY_GUEST_FULL_NAME", ""),
    vionaDeployGuestRoom: optional("VIONA_DEPLOY_GUEST_ROOM", ""),
    /** `0` ise şifre dolu olsa bile kapı doğrulaması kapalı (bakım / geçici). */
    guestUiGateDisabled: optional("VIONA_UI_GATE_ENABLED", "1") === "0",
    get guestUiGatePasswordList() {
      return [this.guestUiGatePassword, this.guestUiGatePassword2]
        .map((s) => String(s || "").trim())
        .filter(Boolean);
    },
    get guestDeployIdentityConfigured() {
      return Boolean(
        String(this.vionaDeployGuestFullName || "").trim() &&
          String(this.vionaDeployGuestRoom || "").trim(),
      );
    },
    get guestUiGateRequired() {
      if (this.guestUiGateDisabled) return false;
      return this.guestUiGatePasswordList.length > 0;
    },
    /** `1` ise status yanıtında `strict: true`; istemci önceki oturumda da sıkı blok kullanabilir. */
    guestUiGateStrict: optional("VIONA_UI_GATE_STRICT", "") === "1",
    /** Misafir doğrulama oturumu (HttpOnly çerez imzası). Boşsa `ADMIN_API_TOKEN` türevi kullanılır (24+ karakter). */
    vionaGuestSessionSecret: optional("VIONA_GUEST_SESSION_SECRET", ""),
    /** Doğrulanmış misafir çerez ömrü (saniye); varsayılan 24 saat. */
    vionaGuestSessionTtlSec: optionalInt("VIONA_GUEST_SESSION_TTL_SEC", 86400),
  };
}
