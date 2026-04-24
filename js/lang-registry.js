/**
 * Viona — tüm UI dil kodları tek yerde (chatbot dosyaları hariç senkron için burayı güncelleyin).
 * Yeni dil: EXTRA’ya kod ekleyin; sunucuda `server/src/lib/viona-ui-languages.js` ile aynı liste olmalı.
 */
(function (global) {
  "use strict";

  var BASE = ["tr", "en", "de", "pl"];
  /** Otel için eklenen 6 dil — i18n: `js/i18n-extra-locales.js` (İngilizce taban + yerel üst katman). */
  var EXTRA = ["ru", "da", "cs", "ro", "nl", "sk"];
  var ALL = BASE.concat(EXTRA);
  var DEFAULT_LANG = "tr";

  function isUiLang(code) {
    var c = String(code || "").trim().toLowerCase();
    return ALL.indexOf(c) !== -1;
  }

  function normalizeToUiLang(code) {
    var c = String(code || DEFAULT_LANG).trim().toLowerCase();
    return isUiLang(c) ? c : DEFAULT_LANG;
  }

  /** <html lang="…"> için BCP 47 (çoğu kod iki harf). */
  function htmlLangFor(code) {
    var c = normalizeToUiLang(code);
    var map = {
      tr: "tr",
      en: "en",
      de: "de",
      pl: "pl",
      ru: "ru",
      da: "da",
      cs: "cs",
      ro: "ro",
      nl: "nl",
      sk: "sk",
    };
    return map[c] || "en";
  }

  /**
   * Çok dilli satır objelerinde deneme sırası: tercih → en → tr → de → pl → diğerleri.
   */
  function contentFallbackChain(preferredCode) {
    var p = normalizeToUiLang(preferredCode || DEFAULT_LANG);
    /** Ek UI dilleri: önce de/pl (çook dilli içerikte var), sonra tr — İngilizce en sona. */
    var rest =
      EXTRA.indexOf(p) !== -1
        ? ["de", "pl", "tr", "en"].concat(EXTRA.filter(function (x) { return x !== p; }))
        : ["en", "tr", "de", "pl"].concat(EXTRA);
    var out = [];
    if (p) out.push(p);
    for (var i = 0; i < rest.length; i++) {
      if (out.indexOf(rest[i]) === -1) out.push(rest[i]);
    }
    return out;
  }

  function pickFromLangRow(row, preferredOpt) {
    if (!row || typeof row !== "object") return "";
    var pref = preferredOpt;
    if (pref == null && typeof global.localStorage !== "undefined") {
      try {
        pref = global.localStorage.getItem("viona_lang");
      } catch (_e) {
        pref = null;
      }
    }
    var chain = contentFallbackChain(pref);
    for (var i = 0; i < chain.length; i++) {
      var k = chain[i];
      if (row[k] == null) continue;
      var s = String(row[k]).trim();
      if (s !== "") return s;
    }
    return "";
  }

  global.VIONA_LANG = {
    ALL: ALL.slice(),
    BASE: BASE.slice(),
    EXTRA: EXTRA.slice(),
    DEFAULT_LANG: DEFAULT_LANG,
    isUiLang: isUiLang,
    normalizeToUiLang: normalizeToUiLang,
    htmlLangFor: htmlLangFor,
    contentFallbackChain: contentFallbackChain,
    pickFromLangRow: pickFromLangRow,
  };
})(typeof window !== "undefined" ? window : globalThis);
