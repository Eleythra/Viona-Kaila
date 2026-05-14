#!/usr/bin/env node
/**
 * Sesli asistan i18n tutarlılığı:
 * - js/i18n.js: tr, en, de, pl aynı voice* anahtar kümesi
 * - server voice_channel_layer.py: ana TTS metin sözlükleri 10 dil (tr…sk)
 *   (VOICE_OPERATIONAL_USE_TEXT sözlük değil, VOICE_OUT_OF_SCOPE_PREMIUM_TEXT ile aynı.)
 *
 * Çalıştır: node scripts/check-voice-i18n.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function extractLangBlock(full, lang) {
  const head = `  ${lang}: {`;
  const start = full.indexOf(head);
  if (start < 0) throw new Error(`Lang block not found: ${lang}`);
  let i = start + head.length;
  let depth = 1;
  while (i < full.length && depth > 0) {
    const c = full[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  return full.slice(start, i);
}

function voiceKeys(block) {
  const s = new Set();
  const re = /\b(voice[A-Za-z0-9_]+)\s*:/g;
  let m;
  while ((m = re.exec(block))) s.add(m[1]);
  return s;
}

function main() {
  const i18nPath = path.join(root, "js", "i18n.js");
  const full = fs.readFileSync(i18nPath, "utf8");
  const base = ["tr", "en", "de", "pl"];
  const ref = voiceKeys(extractLangBlock(full, "en"));
  const problems = [];
  for (const lang of base) {
    const k = voiceKeys(extractLangBlock(full, lang));
    for (const x of ref) if (!k.has(x)) problems.push(`${lang} missing ${x}`);
    for (const x of k) if (!ref.has(x)) problems.push(`${lang} extra ${x}`);
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`OK js/i18n.js voice keys (${ref.size}) match for tr, en, de, pl`);

  const pyPath = path.join(root, "server", "src", "assistant", "services", "voice_channel_layer.py");
  const py = fs.readFileSync(pyPath, "utf8");
  const need = ["tr", "en", "de", "pl", "ru", "da", "nl", "cs", "ro", "sk"];
  const dicts = [
    "VOICE_OUT_OF_SCOPE_PREMIUM_TEXT",
    "VOICE_RECEPTION_RESERVATION_HINT",
    "VOICE_SPA_BOOKING_HINT",
    "VOICE_ALACARTE_RESERVATION_HINT",
    "VOICE_EMPTY_FALLBACK",
  ];
  const pyProblems = [];
  for (const name of dicts) {
    const re = new RegExp(`${name}:\\s*dict\\[str,\\s*str\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
    const m = py.match(re);
    if (!m) {
      pyProblems.push(`Python: block ${name} not matched`);
      continue;
    }
    const body = m[1];
    for (const c of need) {
      if (!new RegExp(`"${c}"\\s*:`).test(body)) pyProblems.push(`${name} missing "${c}"`);
    }
  }
  if (pyProblems.length) {
    console.error(pyProblems.join("\n"));
    process.exit(1);
  }
  console.log(`OK voice_channel_layer.py dicts have all ${need.length} UI langs`);
}

main();
