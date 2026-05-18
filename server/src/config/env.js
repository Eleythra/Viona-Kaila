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
    /** Sesli asistan Realtime: `POST /v1/realtime/sessions` modeli (aynı OPENAI_API_KEY). */
    openAiRealtimeModel: optional("OPENAI_REALTIME_MODEL", "gpt-realtime"),
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
    /**
     * Misafir kapısı `POST /verify`: pencere başına IP; yalnızca başarısız yanıtlar (status >= 400) sayılır
     * (`skipSuccessfulRequests`). Varsayılan 15 dk / 40 başarısız deneme.
     */
    guestGateVerifyWindowMs: optionalInt("GUEST_GATE_VERIFY_WINDOW_MS", 900_000),
    guestGateVerifyMax: optionalInt("GUEST_GATE_VERIFY_MAX", 40),
    /** `POST /api/surveys`: başarılı gönderimler sayaca eklenmez. */
    surveySubmitWindowMs: optionalInt("SURVEY_SUBMIT_WINDOW_MS", 60_000),
    surveySubmitMax: optionalInt("SURVEY_SUBMIT_MAX", 45),
    /** Meta WhatsApp App Secret (Render: WHATSAPP_APP_SECRET). Webhook POST imzası; boşsa doğrulama yok. */
    get whatsappAppSecret() {
      return readWhatsappMetaAppSecret();
    },
    /**
     * Realtime `/api/realtime/session`: istemci `X-Viona-Speech-Secret` ile aynı değeri göndermeli. Boşsa kontrol yok.
     * Statik sitede aynı değer `window.__VIONA_SPEECH_CLIENT_SECRET__` ile verilir (kaynak görüntülenebilir; maliyet sınırı).
     */
    speechClientSecret: optionalAny(["SPEECH_CLIENT_SECRET", "VIONA_SPEECH_CLIENT_SECRET"], ""),
    /**
     * `1` (varsayılan): Vercel vb. proxy `Origin` iletmezse `X-Forwarded-Host` / `Forwarded` ile izinli köken kontrolü.
     * `0`: yalnızca Origin/Referer + doğru secret (doğrudan API erişiminde spoof riskini azaltır).
     */
    speechTrustForwardedOrigin: optional("SPEECH_TRUST_FORWARDED_ORIGIN", "1") !== "0",
    /**
     * Misafir kapısı (eski): çift şifre env değerleri — artık kapı zorunluluğu için kullanılmaz; yalnızca bilgi/health.
     * Öncelik `VIONA_GATE_PASSWORD_*`; yoksa `VIONA_UI_GATE_PASSWORD` / `_2`.
     */
    vionaGatePassword1: optionalAny(["VIONA_GATE_PASSWORD_1", "VIONA_UI_GATE_PASSWORD"], ""),
    vionaGatePassword2: optionalAny(["VIONA_GATE_PASSWORD_2", "VIONA_UI_GATE_PASSWORD_2"], ""),
    /** `0` ise şifre dolu olsa bile kapı doğrulaması kapalı (bakım / geçici). */
    guestUiGateDisabled: optional("VIONA_UI_GATE_ENABLED", "1") === "0",
    /** İki env gizli değer tanımlı mı (HttpOnly oturum + `/api/chat` web koruması). Tek alanda OR eşleşme. */
    get guestGateDualPasswordConfigured() {
      return Boolean(String(this.vionaGatePassword1 || "").trim() && String(this.vionaGatePassword2 || "").trim());
    },
    /**
     * Misafir web kapısı: HotelAdvisor (oda + doğum tarihi) env tamamsa zorunlu.
     * Çift şifre kapısı artık kapı açılması için kullanılmaz (`guestGateDualPasswordConfigured` yalnızca bilgi/health).
     */
    get guestUiGateRequired() {
      if (this.guestUiGateDisabled) return false;
      return this.hotelAdvisorConfigured;
    },
    /** `1` ise status yanıtında `strict: true`; istemci önceki oturumda da sıkı blok kullanabilir. */
    guestUiGateStrict: optional("VIONA_UI_GATE_STRICT", "") === "1",
    /**
     * `1` ise başarılı kapı doğrulamasında `guest_gate_entries` + structured `guest_gate_entry` log yazılır.
     * Varsayılan kapalı — tekrar açmak için `VIONA_GUEST_GATE_AUDIT_LOG=1`.
     */
    guestGateAuditLogEnabled: optional("VIONA_GUEST_GATE_AUDIT_LOG", "0") === "1",
    /** Misafir doğrulama oturumu (HttpOnly çerez imzası). Boşsa `ADMIN_API_TOKEN` türevi kullanılır (24+ karakter). */
    vionaGuestSessionSecret: optional("VIONA_GUEST_SESSION_SECRET", ""),
    /** Doğrulanmış misafir çerez ömrü (saniye); varsayılan 24 saat. */
    vionaGuestSessionTtlSec: optionalInt("VIONA_GUEST_SESSION_TTL_SEC", 86400),
    /**
     * Operatör kapı bypass: `1` + `VIONA_OPERATOR_GATE_ROOM` + `VIONA_OPERATOR_GATE_BIRTHDATE` (YYYY-MM-DD) ile
     * PMS çağrılmadan doğrulama (yalnızca kendi test ortamınızda açın).
     */
    operatorGateBypassEnabled: optional("VIONA_OPERATOR_GATE_BYPASS", "0") === "1",
    operatorGateRoom: optional("VIONA_OPERATOR_GATE_ROOM", ""),
    operatorGateBirthdate: optional("VIONA_OPERATOR_GATE_BIRTHDATE", ""),
    operatorGateDisplayName: optional("VIONA_OPERATOR_GATE_DISPLAY_NAME", "Viona Kontrol"),
    /** Operatör bypass misafirinin telefonu (geri bildirim WA / profil; PMS’teki gibi). */
    operatorGatePhone: optional("VIONA_OPERATOR_GATE_PHONE", "").replace(/\D/g, ""),
    get operatorGateBypassConfigured() {
      if (!this.operatorGateBypassEnabled) return false;
      const r = String(this.operatorGateRoom || "").trim();
      const b = String(this.operatorGateBirthdate || "").trim();
      if (!r) return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) return false;
      return true;
    },
    /** HotelAdvisor / Elektra Hotspot — yalnızca sunucu; token istemciye gitmez. */
    hotelAdvisorBaseUrl: optional("HOTEL_ADVISOR_BASE_URL", ""),
    hotelAdvisorHotelId: optional("HOTEL_ADVISOR_HOTEL_ID", ""),
    hotelAdvisorToken: optional("HOTEL_ADVISOR_TOKEN", ""),
    /** Hotspot misafir listesi kısa önbellek (ms); `0` = kapalı. Üst sınır 120000. */
    hotelAdvisorGuestsCacheMs: optionalNonNegativeMs("HOTEL_ADVISOR_GUESTS_CACHE_MS", 12_000),
    /** `1` iken `POST /api/test/hotel-login` ve `GET /test/hotel-advisor` açılır; aksi halde 404. */
    hotelAdvisorTestEnabled: optional("HOTEL_ADVISOR_TEST_ENABLED", "") === "1",
    get hotelAdvisorConfigured() {
      return Boolean(
        String(this.hotelAdvisorBaseUrl || "").trim() &&
          String(this.hotelAdvisorHotelId || "").trim() &&
          String(this.hotelAdvisorToken || "").trim(),
      );
    },
    /** Misafir geri bildirimi WhatsApp: `true` iken her zaman `whatsappTestPhone` kullanılır. */
    whatsappTestMode: optional("WHATSAPP_TEST_MODE", "").trim().toLowerCase() === "true",
    /** Test modunda kullanılacak alıcı; yalnızca rakamlar (ülke kodu dahil). */
    whatsappTestPhone: optional("WHATSAPP_TEST_PHONE", "").replace(/\D/g, ""),
    /** Public feedback sayfası kökü; sonda `/` yok. Örn. https://viona.eleythra.com */
    vionaFeedbackPublicOrigin: optional("VIONA_FEEDBACK_PUBLIC_ORIGIN", "").replace(/\/+$/, ""),
    /**
     * Misafir geri bildirimi (WA daveti + public form) ana anahtarı.
     * `false` / `0` / `off` → davet ve public uçlar kapalı (origin dolu olsa bile).
     * `true` / `1` / `on` → açık (origin yine zorunlu).
     * Boş → geriye dönük: `VIONA_FEEDBACK_PUBLIC_ORIGIN` tanımlıysa açık, yoksa kapalı.
     */
    vionaGuestFeedbackEnabledRaw: optional("VIONA_GUEST_FEEDBACK_ENABLED", ""),
    get guestFeedbackFeatureEnabled() {
      const raw = String(this.vionaGuestFeedbackEnabledRaw || "").trim().toLowerCase();
      const hasOrigin = Boolean(String(this.vionaFeedbackPublicOrigin || "").trim());
      if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
      if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
      return hasOrigin;
    },
    /** Meta şablon adı (misafir tamamlama bildirimi). */
    whatsappFeedbackTemplateName: optional("WHATSAPP_FEEDBACK_TEMPLATE_NAME", "viona_feedback_completed"),
    /** URL butonunda gönderilecek metin: `token` = yalnızca `fb_…`; `full` = tam `origin/feedback/fb_…`. */
    whatsappFeedbackUrlButtonMode: optional("WHATSAPP_FEEDBACK_URL_BUTTON_MODE", "token").toLowerCase(),
    /** Hotspot’tan gelen 10 haneli `5…` yerel GSM için varsayılan ülke kodu (rakam, örn. 90). */
    whatsappGuestDefaultCountryCode: optional("WHATSAPP_GUEST_DEFAULT_COUNTRY_CODE", "90").replace(/\D/g, ""),
    feedbackSubmitWindowMs: optionalInt("FEEDBACK_SUBMIT_RATE_LIMIT_WINDOW_MS", 60_000),
    feedbackSubmitMax: optionalInt("FEEDBACK_SUBMIT_RATE_LIMIT_MAX", 40),
    feedbackGetWindowMs: optionalInt("FEEDBACK_GET_RATE_LIMIT_WINDOW_MS", 60_000),
    feedbackGetMax: optionalInt("FEEDBACK_GET_RATE_LIMIT_MAX", 120),
  };
}
