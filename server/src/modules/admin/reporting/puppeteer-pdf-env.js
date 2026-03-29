/**
 * Puppeteer modülü yüklenmeden ÖNCE çalışmalı (pdf.service.js içinde ilk import).
 * Render’da PUPPETEER_CACHE_DIR sık eksik kalır; o zaman Chrome ~/.cache’e iner ve deploy slug’ına girmez.
 * Render panelinde yanlışlıkla $HOME/.cache/puppeteer verilmişse proje içine çekilir (RENDER=true iken).
 */
import os from "node:os";
import path from "node:path";

const projectCache = path.join(process.cwd(), ".cache", "puppeteer");
const homeCache = path.join(os.homedir(), ".cache", "puppeteer");
const onRender = String(process.env.RENDER || "").toLowerCase() === "true";

const raw = String(process.env.PUPPETEER_CACHE_DIR || "").trim();
if (!raw) {
  process.env.PUPPETEER_CACHE_DIR = projectCache;
} else if (!path.isAbsolute(raw)) {
  process.env.PUPPETEER_CACHE_DIR = path.resolve(process.cwd(), raw);
} else if (
  onRender &&
  (raw === homeCache || raw.startsWith(homeCache + path.sep))
) {
  process.env.PUPPETEER_CACHE_DIR = projectCache;
}
