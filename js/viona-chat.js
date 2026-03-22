/**
 * Viona otel asistanı — metin sohbeti (ses yok). API: viona-chat-config.js
 */
(function () {
  "use strict";

  var LANG_KEY = "viona_lang";
  var MAX_INPUT = 2000;
  var MAX_MESSAGES = 80;

  /** API yokken otel odaklı, çok dilli demo yanıtları (anahtar kelime eşlemesi). */
  var MOCK_ANSWERS = {
    tr: {
      restaurant:
        "Ana restoran ve barlar gün boyu Ultra Her Şey Dahil kapsamında hizmet verir; à la carte seçenekleri için uygulamada «Restaurant & barlar» ve «A la carte» bölümlerine bakın. Güncel saat ve menü için resepsiyon: dahili 9.",
      pool:
        "Tesis denize sıfırdır; plajda şezlong ve şemsiye ücretsizdir. Açık ve kapalı havuzlar, aquapark ve çocuk havuzu mevcuttur. Ayrıntılar için «Plaj & havuzlar» modülüne göz atabilirsiniz.",
      spa:
        "Spa ve wellness hizmetleri için «Spa & wellness» bölümünden bilgi alın; randevu ve saatler için spa birimi veya resepsiyon (dahili 9) ile iletişime geçebilirsiniz.",
      checkin:
        "Check-in saati 14:00, check-out 12:00’dir. Resepsiyon 24 saattir; dahili hat 9. Kart veya hassas bilgileri sohbette paylaşmayın — yüz yüze veya telefonla iletin.",
      wifi:
        "Genel alanlarda ve odalarda ücretsiz Wi‑Fi sunulur. Bağlantı sorununda resepsiyona (dahili 9) danışın.",
      default:
        "Kaila Beach Hotel, Alanya Obagöl’de denize sıfır konumda Ultra Her Şey Dahil konseptiyle hizmet verir. Restoran, havuz, spa ve daha fazlası için ana sayfadaki modüllere bakın veya sorunuzu kısaca detaylandırın. Resepsiyon: dahili 9.",
    },
    en: {
      restaurant:
        "Main restaurant and bars operate on Ultra All Inclusive throughout the day; see «Restaurants & bars» and «À la carte» in the app for venues and details. For the latest hours, contact reception (dial 9).",
      pool:
        "The resort is beachfront; sun loungers and parasols are free on the beach. Outdoor and indoor pools, aquapark and kids’ pool are available — see «Beach & pools» for more.",
      spa:
        "For spa & wellness, open «Spa & wellness» in the app. Book or confirm times via the spa desk or reception (dial 9).",
      checkin:
        "Check-in is from 14:00 and check-out by 12:00. Reception is 24h (dial 9). Do not share card or sensitive data in chat — use the desk or phone.",
      wifi:
        "Free Wi‑Fi is available in public areas and guest rooms. If you have connection issues, ask reception (dial 9).",
      default:
        "Kaila Beach Hotel is in Obagöl, Alanya, beachfront with Ultra All Inclusive. Browse the home modules for restaurants, pools, spa and more, or rephrase your question with a bit more detail. Reception: dial 9.",
    },
    de: {
      restaurant:
        "Hauptrestaurant und Bars sind tagsüber im Ultra-All-inclusive inklusive; «Restaurants & Bars» und «À la carte» in der App zeigen Details. Aktuelle Zeiten: Rezeption (Nebenstelle 9).",
      pool:
        "Direkt am Strand; Liegen und Schirme am Strand kostenlos. Außen- und Hallenbad, Aquapark und Kinderbecken — mehr unter «Strand & Pools».",
      spa:
        "Spa & Wellness: Infos unter «Spa & Wellness»; Termine über Spa oder Rezeption (9).",
      checkin:
        "Check-in ab 14:00, Check-out bis 12:00. Rezeption 24 h (9). Keine Kartendaten im Chat — bitte am Schalter oder telefonisch.",
      wifi:
        "Kostenloses WLAN in öffentlichen Bereichen und Zimmern. Bei Problemen: Rezeption (9).",
      default:
        "Kaila Beach Hotel liegt in Alanya Obagöl, direkt am Strand, Ultra All Inclusive. Nutzen Sie die Module auf der Startseite oder präzisieren Sie Ihre Frage. Rezeption: 9.",
    },
    ru: {
      restaurant:
        "Основной ресторан и бары работают в концепции Ultra All Inclusive; детали — в разделах «Рестораны и бары» и «À la carte». Актуальное время — на ресепшене (доб. 9).",
      pool:
        "Отель на первой линии; шезлонги и зонты на пляже бесплатны. Открытый и крытый бассейны, аквапарк, детский бассейн — см. «Пляж и бассейны».",
      spa:
        "Спа и wellness — раздел «Спа и wellness»; запись через спа или ресепшен (доб. 9).",
      checkin:
        "Заезд с 14:00, выезд до 12:00. Ресепшен круглосуточно (доб. 9). Не отправляйте данные карт в чате — только лично или по телефону.",
      wifi:
        "Бесплатный Wi‑Fi в зонах общего пользования и в номерах. Проблемы с сетью — на ресепшен (доб. 9).",
      default:
        "Kaila Beach Hotel в Обагёле, Аланья, первая линия, Ultra All Inclusive. Подробности — в модулях на главной или уточните вопрос. Ресепшен: доб. 9.",
    },
  };

  function pickMockAnswer(userText, locale) {
    var q = userText.toLowerCase();
    var pack = MOCK_ANSWERS[locale] || MOCK_ANSWERS.en;
    if (
      /restoran|restaurant|bar|yemek|buffet|breakfast|kahvaltı|frühstück|завтрак|ужин|обед|ресторан|essen|à la carte|a la carte|alacarte|dinner|lunch/.test(
        q
      )
    ) {
      return pack.restaurant;
    }
    if (/havuz|pool|plaj|beach|strand|aquapark|aqua|пляж|бассейн|аквапарк|sun|deniz|sea|meer/.test(q)) {
      return pack.pool;
    }
    if (/spa|wellness|massage|masaj|massage|массаж|hamam|сауна|peeling|кесе/.test(q)) {
      return pack.spa;
    }
    if (
      /check|giriş|çıkış|check-in|checkout|check-out|rezeption|засел|выезд|заезд|выезд|14:00|12:00|uhrzeit|час заезда/.test(q)
    ) {
      return pack.checkin;
    }
    if (/wifi|wi-fi|wlan|internet|интернет|беспровод|kablosuz|kabel|netz/.test(q)) {
      return pack.wifi;
    }
    return pack.default;
  }

  var state = {
    messages: [],
    pending: false,
  };

  var els = {};

  function getLang() {
    try {
      var c = localStorage.getItem(LANG_KEY);
      if (c && I18N[c]) return c;
    } catch (e) {}
    return "tr";
  }

  function t(key) {
    var L = I18N[getLang()] || I18N.tr;
    return L[key] !== undefined ? L[key] : I18N.tr[key] || key;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function applyStaticI18n() {
    if (!els.root) return;
    els.root.querySelectorAll("[data-i18n]").forEach(function (node) {
      var k = node.getAttribute("data-i18n");
      if (k) node.textContent = t(k);
    });
    els.root.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
      var k = node.getAttribute("data-i18n-placeholder");
      if (k) node.setAttribute("placeholder", t(k));
    });
    els.root.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
      var k = node.getAttribute("data-i18n-aria");
      if (k) node.setAttribute("aria-label", t(k));
    });
    if (els.quick) {
      els.quick.querySelectorAll("[data-i18n]").forEach(function (btn) {
        var k = btn.getAttribute("data-i18n");
        if (k) btn.textContent = t(k);
      });
    }
  }

  function scrollToBottom() {
    if (!els.scroll) return;
    requestAnimationFrame(function () {
      els.scroll.scrollTop = els.scroll.scrollHeight;
    });
  }

  function updateWelcomeVisibility() {
    if (!els.welcome) return;
    var has = state.messages.length > 0;
    els.welcome.classList.toggle("hidden", has);
    els.welcome.setAttribute("aria-hidden", has ? "true" : "false");
  }

  function renderMessages() {
    if (!els.list) return;
    els.list.innerHTML = "";
    state.messages.forEach(function (m, idx) {
      var row = document.createElement("div");
      row.className = "viona-chat__msg viona-chat__msg--" + m.role;
      row.setAttribute("role", "article");
      row.setAttribute(
        "aria-label",
        (m.role === "user" ? t("chatRoleUser") : t("chatRoleAssistant")) + ": " + m.content
      );
      var bubble = document.createElement("div");
      bubble.className = "viona-chat__bubble";
      bubble.innerHTML = escapeHtml(m.content).replace(/\n/g, "<br />");
      row.appendChild(bubble);
      if (m.error) {
        row.classList.add("viona-chat__msg--error");
        var err = document.createElement("div");
        err.className = "viona-chat__err-actions";
        var retry = document.createElement("button");
        retry.type = "button";
        retry.className = "viona-chat__linkbtn";
        retry.setAttribute("data-i18n", "chatRetry");
        retry.textContent = t("chatRetry");
        retry.addEventListener("click", function () {
          resendLastUser();
        });
        err.appendChild(retry);
        row.appendChild(err);
      }
      els.list.appendChild(row);
    });
    updateWelcomeVisibility();
    scrollToBottom();
  }

  function resendLastUser() {
    if (state.pending) return;
    var last = state.messages[state.messages.length - 1];
    if (!last || !last.error) return;
    state.messages.pop();
    var lastUserText = "";
    for (var i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].role === "user") {
        lastUserText = state.messages[i].content;
        break;
      }
    }
    if (!lastUserText) return;

    var locale = getLang();
    state.pending = true;
    setTyping(true);
    if (els.input) {
      els.input.disabled = true;
      els.input.setAttribute("aria-busy", "true");
    }
    if (els.send) {
      els.send.disabled = true;
      els.send.setAttribute("aria-busy", "true");
    }

    callChatApi(lastUserText, locale)
      .then(function (reply) {
        state.messages.push({ role: "assistant", content: reply });
        trimHistory();
      })
      .catch(function () {
        state.messages.push({
          role: "assistant",
          content: t("chatError"),
          error: true,
        });
        trimHistory();
      })
      .finally(function () {
        state.pending = false;
        setTyping(false);
        renderMessages();
        if (els.input) {
          els.input.disabled = false;
          els.input.removeAttribute("aria-busy");
        }
        if (els.send) {
          els.send.disabled = false;
          els.send.removeAttribute("aria-busy");
        }
        if (els.input) els.input.focus();
      });
  }

  function setTyping(on) {
    if (!els.typing) return;
    els.typing.classList.toggle("hidden", !on);
    els.typing.setAttribute("aria-hidden", on ? "false" : "true");
    if (on) {
      els.typing.innerHTML =
        '<span class="viona-chat__typing-inner" aria-hidden="true"><span class="viona-chat__dot"></span><span class="viona-chat__dot"></span><span class="viona-chat__dot"></span></span><span class="viona-chat__typing-label">' +
        escapeHtml(t("chatTyping")) +
        "</span>";
    }
  }

  function trimHistory() {
    while (state.messages.length > MAX_MESSAGES) {
      state.messages.shift();
    }
  }

  function mockReply(userText, locale) {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    var delay = typeof cfg.mockDelayMs === "number" ? cfg.mockDelayMs : 780;
    var text = pickMockAnswer(userText, locale);
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(text);
      }, delay);
    });
  }

  function callChatApi(userText, locale) {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    var url = cfg.endpoint;
    if (!url || String(url).trim() === "") {
      return mockReply(userText, locale);
    }

    var payloadMessages = state.messages
      .filter(function (m) {
        return !m.error;
      })
      .map(function (m) {
        return { role: m.role, content: m.content };
      });

    return fetch(url, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, cfg.headers || {}),
      body: JSON.stringify({
        messages: payloadMessages,
        locale: locale,
        lastUserMessage: userText,
      }),
      credentials: cfg.credentials || "same-origin",
    }).then(function (res) {
      if (!res.ok) throw new Error("http_" + res.status);
      return res.json();
    }).then(function (data) {
      var text =
        (data && (data.reply || data.message || data.text || data.answer || data.content)) || "";
      text = typeof text === "string" ? text : String(text || "");
      if (!text.trim()) throw new Error("empty_reply");
      return text;
    });
  }

  function sendPipeline(text) {
    var locale = getLang();
    var clean = text.replace(/\r/g, "").trim();
    if (!clean || state.pending) return;

    state.pending = true;
    state.messages.push({ role: "user", content: clean });
    trimHistory();
    renderMessages();
    setTyping(true);
    if (els.input) {
      els.input.disabled = true;
      els.input.setAttribute("aria-busy", "true");
    }
    if (els.send) {
      els.send.disabled = true;
      els.send.setAttribute("aria-busy", "true");
    }

    callChatApi(clean, locale)
      .then(function (reply) {
        state.messages.push({ role: "assistant", content: reply });
        trimHistory();
      })
      .catch(function () {
        state.messages.push({
          role: "assistant",
          content: t("chatError"),
          error: true,
        });
        trimHistory();
      })
      .finally(function () {
        state.pending = false;
        setTyping(false);
        renderMessages();
        if (els.input) {
          els.input.disabled = false;
          els.input.removeAttribute("aria-busy");
        }
        if (els.send) {
          els.send.disabled = false;
          els.send.removeAttribute("aria-busy");
        }
        if (els.input) els.input.focus();
      });
  }

  function onSubmit() {
    if (!els.input) return;
    var v = els.input.value;
    if (v.length > MAX_INPUT) {
      v = v.slice(0, MAX_INPUT);
      els.input.value = v;
    }
    var clean = v.replace(/\r/g, "").trim();
    if (!clean) return;
    els.input.value = "";
    autosizeTextarea();
    sendPipeline(clean);
  }

  function autosizeTextarea() {
    if (!els.input) return;
    els.input.style.height = "auto";
    var max = 120;
    els.input.style.height = Math.min(els.input.scrollHeight, max) + "px";
  }

  function clearChat() {
    if (!window.confirm(t("chatClearConfirm"))) return;
    state.messages = [];
    state.pending = false;
    setTyping(false);
    renderMessages();
    if (els.input) {
      els.input.value = "";
      els.input.disabled = false;
      autosizeTextarea();
    }
    if (els.send) els.send.disabled = false;
  }

  function wireQuick() {
    if (!els.quick) return;
    var prompts = ["chatQuickRest", "chatQuickPool", "chatQuickSpa", "chatQuickCheck", "chatQuickWifi"];
    els.quick.innerHTML = "";
    prompts.forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "viona-chat__chip";
      btn.setAttribute("data-i18n", key);
      btn.textContent = t(key);
      btn.addEventListener("click", function () {
        if (state.pending) return;
        var msg = t(key);
        sendPipeline(msg);
      });
      els.quick.appendChild(btn);
    });
  }

  function cacheEls() {
    els.root = document.getElementById("viona-chat");
    if (!els.root) return;
    els.welcome = document.getElementById("viona-chat-welcome");
    els.list = document.getElementById("viona-chat-messages");
    els.typing = document.getElementById("viona-chat-typing");
    els.scroll = document.getElementById("viona-chat-scroll");
    els.quick = document.getElementById("viona-chat-quick");
    els.input = document.getElementById("viona-chat-input");
    els.send = document.getElementById("viona-chat-send");
    els.clearBtn = document.getElementById("viona-chat-clear");
  }

  function wire() {
    cacheEls();
    if (!els.root) return;

    wireQuick();
    applyStaticI18n();

    if (els.clearBtn) {
      els.clearBtn.addEventListener("click", clearChat);
    }

    if (els.send) {
      els.send.addEventListener("click", onSubmit);
    }

    if (els.input) {
      els.input.addEventListener("input", autosizeTextarea);
      els.input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit();
        }
      });
    }

    renderMessages();
  }

  window.vionaChatOnOpen = function () {
    cacheEls();
    wireQuick();
    applyStaticI18n();
    if (els.input) {
      els.input.focus();
      autosizeTextarea();
    }
    scrollToBottom();
  };

  /** app.js setLang sonrası çağrılır — modal kapalıyken dil değişince chip metinleri güncellenir */
  window.vionaChatRefreshI18n = function () {
    cacheEls();
    wireQuick();
    applyStaticI18n();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
