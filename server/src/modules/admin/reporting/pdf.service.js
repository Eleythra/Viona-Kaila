import puppeteer from "puppeteer";
import { buildReportHtml } from "./report-template.js";

let browserPromise = null;

function launchOptions() {
  const execPath = String(process.env.PUPPETEER_EXECUTABLE_PATH || "").trim();
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--disable-gpu",
  ];
  const opts = {
    headless: true,
    args,
  };
  if (execPath) opts.executablePath = execPath;
  return opts;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch(launchOptions()).catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  const browser = await browserPromise;
  if (typeof browser.isConnected === "function" && !browser.isConnected()) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

const SET_CONTENT_TIMEOUT_MS = Math.min(
  120_000,
  Math.max(15_000, Number(process.env.PDF_SET_CONTENT_TIMEOUT_MS) || 60_000),
);

export async function renderVionaPdfBuffer(reportData) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = buildReportHtml(reportData);
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: SET_CONTENT_TIMEOUT_MS,
    });
    await page.emulateMediaType("screen");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
      timeout: 90_000,
    });
  } catch (err) {
    console.error("[pdf] renderVionaPdfBuffer failed:", err?.message || err);
    throw err;
  } finally {
    await page.close();
  }
}
