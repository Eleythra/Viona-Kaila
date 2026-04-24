/**
 * scripts/locales/survey-{da,nl,ro,cs,sk,ru}.json → js/i18n-survey-overlays-extra.js
 * Çalıştır: node scripts/build-survey-i18n-overlay.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const localesDir = path.join(__dirname, "locales");
const codes = ["da", "nl", "ro", "cs", "sk", "ru"];

const expected = JSON.parse(fs.readFileSync(path.join(localesDir, "survey-da.json"), "utf8"));
const expectedKeys = Object.keys(expected).sort();

const overlay = {};
for (const code of codes) {
  const fp = path.join(localesDir, `survey-${code}.json`);
  if (!fs.existsSync(fp)) throw new Error("missing " + fp);
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  const keys = Object.keys(data).sort();
  if (keys.join(",") !== expectedKeys.join(",")) {
    throw new Error(`Key mismatch for ${code}: expected ${expectedKeys.length} keys`);
  }
  const uiPath = path.join(localesDir, `extra-ui-${code}.json`);
  let extra = {};
  if (fs.existsSync(uiPath)) {
    extra = JSON.parse(fs.readFileSync(uiPath, "utf8"));
  }
  overlay[code] = Object.assign({}, data, extra);
}

const body = JSON.stringify(overlay, null, 2);
const out = `/**
 * Anket + modSurvey — ek dillerde tam yerel metin (scripts/locales/survey-*.json kaynak).
 * i18n-extra-locales.js sonrası yüklenir.
 * Güncelleme: JSON düzenleyin, ardından \`node scripts/build-survey-i18n-overlay.mjs\`
 */
(function () {
  "use strict";
  if (typeof I18N === "undefined" || !window.VIONA_LANG || !window.VIONA_LANG.EXTRA) return;

  var OVERLAY = ${body};

  window.VIONA_LANG.EXTRA.forEach(function (code) {
    var o = OVERLAY[code];
    if (o && I18N[code]) Object.assign(I18N[code], o);
  });
})();
`;

const outPath = path.join(root, "js", "i18n-survey-overlays-extra.js");
fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath);
