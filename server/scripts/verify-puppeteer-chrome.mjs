/**
 * Build sonunda çalışır: Chromium gerçekten indi mi kontrol eder (sessiz başarısız deploy önlenir).
 */
import { existsSync } from "node:fs";
import { executablePath } from "puppeteer";

const p = executablePath();
if (!existsSync(p)) {
  console.error("[verify-puppeteer] Chrome bulunamıyor:", p);
  process.exit(1);
}
console.log("[verify-puppeteer] OK:", p);
