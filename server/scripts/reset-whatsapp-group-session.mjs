#!/usr/bin/env node
/**
 * WhatsApp grup botu oturumunu sıfırlar → bir sonraki API başlangıcında TEK seferlik yeni QR.
 *
 * ÖNEMLİ:
 * - Çalıştırmadan önce Node API’yi durdurun (Ctrl+C) ve bu session’ı kullanan Chromium’u kapatın.
 * - Bağlandıktan sonra bu scripti TEKRARLAMAYIN; session klasörü kalıcı kalsın ki her açılışta QR istemesin.
 * - API’yi her zaman `server` klasöründen başlatın (cwd tutarlı olsun).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serverRoot, "..");

dotenv.config({ path: path.join(serverRoot, ".env") });

const clientId = String(process.env.WHATSAPP_GROUP_CLIENT_ID || "viona-operational").trim();
const sessionRel = String(process.env.WHATSAPP_GROUP_SESSION_DIR || "runtime/whatsapp-session").trim();
const sessionBaseServer = path.resolve(serverRoot, sessionRel);
const sessionFolderServer = path.join(sessionBaseServer, `session-${clientId}`);

const dupSessionRoot = path.join(repoRoot, "runtime", "whatsapp-session", `session-${clientId}`);
const qrServer = path.join(serverRoot, "runtime", "whatsapp-last-qr.png");
const qrRepoRoot = path.join(repoRoot, "runtime", "whatsapp-last-qr.png");

function rmRf(p) {
  if (!fs.existsSync(p)) {
    console.log("Yok (atlandı):", p);
    return;
  }
  fs.rmSync(p, { recursive: true, force: true });
  console.log("Silindi (klasör):", p);
}

function rmFile(p) {
  try {
    fs.unlinkSync(p);
    console.log("Silindi (dosya):", p);
  } catch {
    console.log("Yok (atlandı):", p);
  }
}

console.log("\n=== WhatsApp grup botu session sıfırlama ===");
console.log("clientId:", clientId);
console.log("Sunucu cwd beklenen: %s\n", serverRoot);

rmRf(sessionFolderServer);
rmRf(dupSessionRoot);
rmFile(qrServer);
rmFile(qrRepoRoot);

console.log(`
Sonraki adımlar:
  1) cd server && node src/index.js
  2) Tek QR: runtime/whatsapp-last-qr.png veya terminal — telefondan bir kez tara.
  3) Logda [whatsapp_group_bot] ready görününce bitti; bu scripti yeniden çalıştırma.

Not: Meta güvenlik nedeniyle QR’ı ara sıra yenileyebilir; kalıcı oturum için session klasörünü silme.
`);
