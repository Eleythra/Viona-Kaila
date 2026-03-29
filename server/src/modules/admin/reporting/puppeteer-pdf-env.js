/**
 * Puppeteer modülü yüklenmeden ÖNCE çalışmalı (pdf.service.js içinde ilk import).
 * Render’da PUPPETEER_CACHE_DIR sık eksik kalır; o zaman Chrome ~/.cache’e iner ve deploy slug’ına girmez.
 */
import path from "node:path";

const raw = String(process.env.PUPPETEER_CACHE_DIR || "").trim();
if (!raw) {
  process.env.PUPPETEER_CACHE_DIR = path.join(process.cwd(), ".cache", "puppeteer");
} else if (!path.isAbsolute(raw)) {
  process.env.PUPPETEER_CACHE_DIR = path.resolve(process.cwd(), raw);
}
