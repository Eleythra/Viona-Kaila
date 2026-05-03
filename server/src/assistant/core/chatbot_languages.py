"""Metin sohbet botunun desteklediği UI dil kodları (`js/lang-registry.js` ile uyumlu)."""

from __future__ import annotations

BASE_UI_LANGS: tuple[str, ...] = ("tr", "en", "de", "pl")
EXTRA_CHATBOT_UI_LANGS: tuple[str, ...] = ("ru", "da", "cs", "ro", "nl", "sk")

CHATBOT_UI_LANGS: tuple[str, ...] = BASE_UI_LANGS + EXTRA_CHATBOT_UI_LANGS
CHATBOT_UI_LANG_SET: frozenset[str] = frozenset(CHATBOT_UI_LANGS)

# `js/lang-registry.js` contentFallbackChain ile aynı mantık: tercih dilinden sonra satır içi deneme sırası.
FORM_LABEL_FALLBACK_ORDER: tuple[str, ...] = ("en", "tr", "de", "pl")

# UI bu dillerdeyken, algılayıcı yanlışlıkla TR döndürdüyse açık İngilizce otel cümlelerini EN say (şablon/i18n yolu).
UI_LANGS_COERCE_CLEAR_ENGLISH_FROM_TR_DETECT: frozenset[str] = frozenset(
    ("en", "ru", "da", "cs", "ro", "nl", "sk")
)

_TEMPLATE_BRANCH_LANGS: frozenset[str] = frozenset(BASE_UI_LANGS)


def normalize_chatbot_lang(lang: str | None) -> str:
    code = (lang or "tr").strip().lower()
    return code if code in CHATBOT_UI_LANG_SET else "tr"


def orchestrator_branch_lang(ui_lang: str | None) -> str:
    """
    Eski if/elif şablon dalları (en/de/pl/tr) için: ek UI dilleri şimdilik İngilizce şablon yoluna düşer.
    Gerçek `meta.language` / i18n anahtarı `normalize_chatbot_lang` ile kalır.
    """
    n = normalize_chatbot_lang(ui_lang)
    return n if n in _TEMPLATE_BRANCH_LANGS else "en"


def voice_dict_lang(reply_lang: str | None) -> str:
    """Sesli TTS / sözlük anahtarı — `normalize_chatbot_lang` ile aynı kod kümesi (tr…sk)."""
    return normalize_chatbot_lang(reply_lang)
