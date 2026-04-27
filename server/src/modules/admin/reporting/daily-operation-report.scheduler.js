import { runDailyOperationReportJob, ymdTodayInHotelTz } from "./daily-operation-report.job.js";

let lastFiredYmd = "";
let lastHttpPingMs = 0;

function parseScheduleFromEnv() {
  const tz = String(
    process.env.DAILY_OPERATION_REPORT_TZ || process.env.HOTEL_TIMEZONE || "Europe/Istanbul",
  ).trim();
  const cronExpr = String(process.env.DAILY_OPERATION_REPORT_CRON || "30 21 * * *").trim();
  const cronParts = cronExpr.split(/\s+/);
  const parsedMin = Number(cronParts[0]);
  const parsedHour = Number(cronParts[1]);
  const rawEnvHour = Number(process.env.DAILY_OPERATION_REPORT_HOUR);
  const rawEnvMin = Number(process.env.DAILY_OPERATION_REPORT_MINUTE);
  const targetHour =
    Number.isFinite(rawEnvHour) && rawEnvHour >= 0 && rawEnvHour <= 23
      ? rawEnvHour
      : Number.isFinite(parsedHour) && parsedHour >= 0 && parsedHour <= 23
        ? parsedHour
        : 21;
  const targetMin =
    Number.isFinite(rawEnvMin) && rawEnvMin >= 0 && rawEnvMin <= 59
      ? rawEnvMin
      : Number.isFinite(parsedMin) && parsedMin >= 0 && parsedMin <= 59
        ? parsedMin
        : 30;
  const rawTick = Number(process.env.DAILY_OPERATION_REPORT_TICK_MS);
  const tickMs = Math.min(
    120_000,
    Math.max(20_000, Number.isFinite(rawTick) && rawTick > 0 ? rawTick : 45_000),
  );
  const rawFire = Number(process.env.DAILY_OPERATION_REPORT_FIRE_WINDOW_MIN);
  const fireWindowMin = Math.min(
    59,
    Math.max(1, Math.floor(Number.isFinite(rawFire) && rawFire >= 1 ? rawFire : 30)),
  );
  const maxMinuteInHour = Math.min(59, targetMin + fireWindowMin - 1);
  return { tz, targetHour, targetMin, tickMs, maxMinuteInHour, cronExpr };
}

function readHourMinuteHotelTz(tz) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const mi = Number(parts.find((p) => p.type === "minute")?.value);
  return { h, mi };
}

function tryFireDailyOperationReport(trigger) {
  if (String(process.env.DAILY_OPERATION_REPORT_ENABLED || "").trim() !== "1") return;
  const cfg = parseScheduleFromEnv();
  try {
    const ymd = ymdTodayInHotelTz();
    if (lastFiredYmd === ymd) return;
    const { h, mi } = readHourMinuteHotelTz(cfg.tz);
    const inCronMinuteWindow = h === cfg.targetHour && mi >= cfg.targetMin && mi <= cfg.maxMinuteInHour;
    const isAtOrAfterScheduleToday = h > cfg.targetHour || (h === cfg.targetHour && mi >= cfg.targetMin);
    const allow = trigger === "interval" ? inCronMinuteWindow : isAtOrAfterScheduleToday;
    if (!allow) return;
    lastFiredYmd = ymd;
    if (trigger === "startup_catchup" || trigger === "http_ping") {
      const lhm = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
      const tgt = `${String(cfg.targetHour).padStart(2, "0")}:${String(cfg.targetMin).padStart(2, "0")}`;
      console.info(
        "[daily_operation_report] %s tz=%s local_hm=%s target=%s ymd=%s",
        trigger === "http_ping" ? "http_wake_ping" : "startup_catchup",
        cfg.tz,
        lhm,
        tgt,
        ymd,
      );
    }
    runDailyOperationReportJob({ ymd, source: "cron" }).catch((e) =>
      console.error("[daily_operation_report] cron", e),
    );
  } catch (e) {
    console.error("[daily_operation_report] try_fire", trigger, e);
  }
}

/**
 * HTTP sunucusu açılınca: periyodik kontrol + kısa gecikmeyle startup catch-up.
 * Render ücretsiz planda dyno uyuduğunda timer çalışmaz; {@link pingDailyOperationReportFromHttpTraffic} ile uyandırınca aynı gün raporu tetiklenir.
 */
export function startDailyOperationReportScheduler() {
  if (String(process.env.DAILY_OPERATION_REPORT_ENABLED || "").trim() !== "1") return;
  const cfg = parseScheduleFromEnv();
  setInterval(() => tryFireDailyOperationReport("interval"), cfg.tickMs).unref();
  const rawCatch = Number(process.env.DAILY_OPERATION_REPORT_STARTUP_CATCHUP_MS);
  const catchupDelayMs = Math.min(
    60_000,
    Math.max(2000, Number.isFinite(rawCatch) && rawCatch > 0 ? rawCatch : 5000),
  );
  setTimeout(() => tryFireDailyOperationReport("startup_catchup"), catchupDelayMs).unref();
  const hh = String(cfg.targetHour).padStart(2, "0");
  const mm = String(cfg.targetMin).padStart(2, "0");
  console.info(
    "[daily_operation_report] scheduler_on tz=%s time=%s:%s window_min=%d..%d expr=%s tick_ms=%d",
    cfg.tz,
    hh,
    mm,
    cfg.targetMin,
    cfg.maxMinuteInHour,
    cfg.cronExpr,
    cfg.tickMs,
  );
}

/**
 * Herhangi bir `/api` isteği geldiğinde (throttle): program saatinden sonra ve o gün henüz ateşlenmediyse job’u dene.
 * Ücretsiz hostta süreç uyumuş olsa bile ilk istekte rapor kaçmasın diye.
 */
export function pingDailyOperationReportFromHttpTraffic() {
  if (String(process.env.DAILY_OPERATION_REPORT_ENABLED || "").trim() !== "1") return;
  if (String(process.env.DAILY_OPERATION_REPORT_HTTP_PING || "1").trim() !== "1") return;
  const rawThrottle = Number(process.env.DAILY_OPERATION_REPORT_HTTP_PING_THROTTLE_MS);
  const throttle = Math.max(
    15_000,
    Math.min(120_000, Number.isFinite(rawThrottle) && rawThrottle > 0 ? rawThrottle : 45_000),
  );
  const now = Date.now();
  if (now - lastHttpPingMs < throttle) return;
  lastHttpPingMs = now;
  tryFireDailyOperationReport("http_ping");
}
