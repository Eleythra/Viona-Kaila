import puppeteer from "puppeteer";
import { buildReportHtml } from "./report-template.js";

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserPromise;
}

export async function renderVionaPdfBuffer(reportData) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = buildReportHtml(reportData);
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });
  } finally {
    await page.close();
  }
}
