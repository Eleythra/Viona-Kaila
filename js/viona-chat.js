/**
 * Viona otel asistanı — metin sohbeti (backend: http://localhost:3001/api/chat)
 */
(function () {
  "use strict";

  var LANG_KEY = "viona_lang";
  /** Session reply language for API (mirrors last assistant meta.language); separate from site UI. */
  var CONV_LANG_KEY = "viona_chat_conversation_lang";
  var USER_ID_KEY = "viona_chat_user_id";
  var SESSION_ID_KEY = "viona_chat_session_id";
  var MAX_INPUT = 2000;
  var MAX_MESSAGES = 80;

  var state = {
    messages: [],
    pending: false,
    exitTimer: null,
  };

  var els = {};

  function getLang() {
    try {
      var raw = localStorage.getItem(LANG_KEY);
      if (!raw) return "tr";
      var c = String(raw).trim();
      if (window.VIONA_LANG && typeof window.VIONA_LANG.normalizeToUiLang === "function") {
        c = window.VIONA_LANG.normalizeToUiLang(c);
      } else {
        c = String(raw).toLowerCase().slice(0, 2);
      }
      if (I18N[c]) return c;
      if (I18N.en) return "en";
    } catch (e) {}
    return "tr";
  }

  function getConversationLang() {
    try {
      var c = String(sessionStorage.getItem(CONV_LANG_KEY) || "").toLowerCase().slice(0, 2);
      if (window.VIONA_LANG && window.VIONA_LANG.ALL && window.VIONA_LANG.ALL.indexOf(c) !== -1) return c;
    } catch (e) {}
    return null;
  }

  function setConversationLangFromMeta(metaLang) {
    var s = String(metaLang || "").toLowerCase().replace(/_/g, "-");
    if (s.length > 2 && s.indexOf("-") !== -1) s = s.slice(0, 2);
    if (window.VIONA_LANG && window.VIONA_LANG.ALL && window.VIONA_LANG.ALL.indexOf(s) === -1) return;
    try {
      sessionStorage.setItem(CONV_LANG_KEY, s);
    } catch (e) {}
  }

  function clearConversationLang() {
    try {
      sessionStorage.removeItem(CONV_LANG_KEY);
    } catch (e) {}
  }

  /** app.js `setLang`: site dili değişince eski session «conversation_language» yanıtı yeni UI dilini ezip TR’ye düşmesin. */
  window.vionaChatAfterSiteLangChange = function () {
    clearConversationLang();
  };

  function _generateUserId() {
    var rnd = Math.random().toString(36).slice(2, 10);
    return "viona_u_" + Date.now().toString(36) + "_" + rnd;
  }

  function getOrCreateUserId() {
    try {
      var existing = localStorage.getItem(USER_ID_KEY);
      if (existing && /^viona_u_[a-z0-9_]+$/i.test(existing)) return existing;
      var created = _generateUserId();
      localStorage.setItem(USER_ID_KEY, created);
      return created;
    } catch (e) {
      return _generateUserId();
    }
  }

  function _generateSessionId() {
    var rnd = Math.random().toString(36).slice(2, 10);
    return "viona_s_" + Date.now().toString(36) + "_" + rnd;
  }

  function getOrCreateSessionId() {
    try {
      var existing = sessionStorage.getItem(SESSION_ID_KEY);
      if (existing && /^viona_s_[a-z0-9_]+$/i.test(existing)) return existing;
      var created = _generateSessionId();
      sessionStorage.setItem(SESSION_ID_KEY, created);
      return created;
    } catch (e) {
      return _generateSessionId();
    }
  }

  function resetSessionId() {
    try {
      sessionStorage.removeItem(SESSION_ID_KEY);
    } catch (e) {}
  }

  function t(key) {
    var L = I18N[getLang()] || I18N.tr;
    return L[key] !== undefined ? L[key] : I18N.tr[key] || key;
  }

  var SVG_CHAT_CTA_CAL =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><rect x="3" y="6" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.75"/><path d="M3 11h18M8 15h.02M12 15h.02M16 15h.02M8 19h.02M12 19h.02" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
  var SVG_CHAT_CTA_BELL =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 20a2 2 0 01-4 0M6 8a6 6 0 1112 0c0 5 2 5 2 5H4s2 0 2-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_CHAT_CTA_COMPASS =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><path d="m14.5 9.5-3 5-1.5-1.5 3-5 1.5 1.5z" fill="currentColor" opacity="0.9"/></svg>';
  var SVG_CHAT_CTA_PIN =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.5" stroke="currentColor" stroke-width="1.75"/></svg>';
  var SVG_CHAT_CTA_COMPLAINT =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_CHAT_CTA_SPA =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3c-2 3-6 4-6 9a6 6 0 0012 0c0-5-4-6-6-9z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 18v3" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
  var SVG_CHAT_CTA_UTENSILS =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3v9a3 3 0 006 0V3M8 3H6a2 2 0 00-2 2v7a4 4 0 008 0V5a2 2 0 00-2-2h-2M14 3v17" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_CHAT_CTA_TRANSFER =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 17h2.5l1-3h8l1 3H19" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><path d="M6.5 14L5 7h4l1.5 4h3L15 7h4l-1.5 7M8 17v2M16 17v2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><circle cx="8.5" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.5"/><circle cx="15.5" cy="17.5" r="1.8" stroke="currentColor" stroke-width="1.5"/></svg>';

  function appendChatCtaButton(optWrap, opt, ctaClass, svgInner) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "viona-chat__option-btn " + ctaClass;
    var ico = document.createElement("span");
    ico.className = "viona-chat__option-btn-res-ico";
    ico.setAttribute("aria-hidden", "true");
    ico.innerHTML = svgInner;
    var lab = document.createElement("span");
    lab.className = "viona-chat__option-btn-res-label";
    lab.textContent = opt.label;
    btn.appendChild(ico);
    btn.appendChild(lab);
    btn.addEventListener("click", function () {
      if (state.pending) return;
      if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) return;
      if (opt.value === "__open_reservation_form__") {
        if (typeof window.vionaChatOpenReservations === "function") window.vionaChatOpenReservations();
        return;
      }
      if (opt.value === "__open_guest_notifications_form__") {
        if (typeof window.vionaChatOpenGuestNotifications === "function") window.vionaChatOpenGuestNotifications();
        return;
      }
      if (opt.value === "__open_alanya_module__") {
        if (typeof window.vionaChatOpenAlanya === "function") window.vionaChatOpenAlanya();
        return;
      }
      if (opt.value === "__open_spa_module__") {
        if (typeof window.vionaChatOpenSpa === "function") window.vionaChatOpenSpa();
        return;
      }
      if (opt.value === "__open_restaurants_bars_module__") {
        if (typeof window.vionaChatOpenRestaurantsBars === "function") window.vionaChatOpenRestaurantsBars();
        return;
      }
      if (opt.value === "__open_transfer_module__") {
        if (typeof window.vionaChatOpenTransfer === "function") window.vionaChatOpenTransfer();
        return;
      }
      if (opt.value === "__open_room_service_module__") {
        if (typeof window.vionaChatOpenRoomService === "function") window.vionaChatOpenRoomService();
        return;
      }
      if (opt.value === "__open_where_module__") {
        if (typeof window.vionaChatOpenWhere === "function") window.vionaChatOpenWhere();
        return;
      }
      if (opt.value === "__open_complaint_form__") {
        if (typeof window.vionaChatOpenComplaintForm === "function") window.vionaChatOpenComplaintForm();
        return;
      }
      if (!els.input || !els.send) return;
      els.input.value = String(opt.value || "").trim();
      els.send.click();
    });
    optWrap.appendChild(btn);
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
      if (m.role === "assistant" && m.options && Array.isArray(m.options) && m.options.length) {
        var optWrap = document.createElement("div");
        optWrap.className = "viona-chat__options";
        optWrap.setAttribute("role", "group");
        optWrap.setAttribute("aria-label", t("chatFormOptionsIntro"));
        m.options.forEach(function (opt) {
          if (opt.value === "__open_reservation_form__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-restaurant", SVG_CHAT_CTA_UTENSILS);
            return;
          }
          if (opt.value === "__open_guest_notifications_form__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-guest", SVG_CHAT_CTA_BELL);
            return;
          }
          if (opt.value === "__open_alanya_module__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-discover", SVG_CHAT_CTA_COMPASS);
            return;
          }
          if (opt.value === "__open_spa_module__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-spa", SVG_CHAT_CTA_SPA);
            return;
          }
          if (opt.value === "__open_restaurants_bars_module__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-restaurant", SVG_CHAT_CTA_UTENSILS);
            return;
          }
          if (opt.value === "__open_transfer_module__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-transfer", SVG_CHAT_CTA_TRANSFER);
            return;
          }
          if (opt.value === "__open_room_service_module__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-restaurant", SVG_CHAT_CTA_UTENSILS);
            return;
          }
          if (opt.value === "__open_where_module__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-discover", SVG_CHAT_CTA_PIN);
            return;
          }
          if (opt.value === "__open_complaint_form__") {
            appendChatCtaButton(optWrap, opt, "viona-chat__option-btn--cta-complaint", SVG_CHAT_CTA_COMPLAINT);
            return;
          }
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "viona-chat__option-btn";
          btn.textContent = opt.label;
          btn.addEventListener("click", function () {
            if (state.pending) return;
            if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) return;
            if (!els.input || !els.send) return;
            els.input.value = String(opt.value || "").trim();
            els.send.click();
          });
          optWrap.appendChild(btn);
        });
        row.appendChild(optWrap);
      }
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
    if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) return;
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

    var exitAfterRetry = null;
    askViona(lastUserText, getLang())
      .then(function (result) {
        exitAfterRetry = result.exitChatAfterMs;
        state.messages.push({
          role: "assistant",
          content: result.reply,
          options: result.options || null,
        });
        trimHistory();
      })
      .catch(function (err) {
        state.messages.push({
          role: "assistant",
          content: getClientErrorReply(err),
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
        if (exitAfterRetry) {
          scheduleExitToHomeAfterMs(exitAfterRetry);
        } else if (els.input) {
          els.input.focus();
        }
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

  function getClientErrorReply(err) {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    if (typeof cfg.errorReply === "string" && cfg.errorReply.trim()) {
      return cfg.errorReply.trim();
    }
    if (err) {
      if (err.name === "AbortError") return t("chatErrorTimeout");
      var msg = String(err.message || "");
      if (msg === "bad_json") return t("chatErrorBadJson");
      if (msg === "empty_reply") return t("chatErrorEmpty");
      if (/^http_5\d\d$/.test(msg)) return t("chatErrorServer");
      if (/^http_4\d\d$/.test(msg)) return t("chatErrorClient");
    }
    return t("chatError");
  }

  function clearExitToHomeTimer() {
    if (state.exitTimer) {
      clearTimeout(state.exitTimer);
      state.exitTimer = null;
    }
  }

  /** Sunucu meta.exit_chat_after_ms (web kayıt onayı): kısa gecikmeyle ana arayüze dön. */
  function scheduleExitToHomeAfterMs(ms) {
    clearExitToHomeTimer();
    var n = Number(ms);
    if (!Number.isFinite(n) || n < 500 || n > 120000) return;
    state.exitTimer = setTimeout(function () {
      state.exitTimer = null;
      if (typeof window.vionaExitChatToHome === "function") {
        window.vionaExitChatToHome();
      }
    }, Math.round(n));
  }

  async function askViona(message, locale, requestOpts) {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    var endpoint =
      typeof cfg.endpoint === "string" && cfg.endpoint.trim()
        ? cfg.endpoint.trim()
        : "http://localhost:3001/api/chat";
    var reqOpts = requestOpts && typeof requestOpts === "object" ? requestOpts : {};
    var conv = getConversationLang();
    var siteLang = locale || getLang() || "tr";
    var body = {
      message: message,
      locale: siteLang,
      ui_language: siteLang,
      user_id: getOrCreateUserId(),
    };
    body.session_id = getOrCreateSessionId();
    if (conv) body.conversation_language = conv;
    if (reqOpts.clientChannel === "voice") {
      body.channel = "voice";
      body.client_channel = "voice";
    }
    var timeoutMs = Number(cfg.timeoutMs || 15000);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 3000) timeoutMs = 15000;
    var maxCap = 60000;
    if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) {
      var vUp = Number(cfg.voiceUpstreamTimeoutMs || 35000);
      if (Number.isFinite(vUp) && vUp >= 3000) timeoutMs = Math.max(timeoutMs, vUp);
      var vMax = Number(cfg.voiceUpstreamMaxCapMs || 90000);
      if (Number.isFinite(vMax) && vMax >= timeoutMs) maxCap = Math.min(vMax, 120000);
    }
    if (timeoutMs > maxCap) timeoutMs = maxCap;
    var abortController = new AbortController();
    var timer = setTimeout(function () {
      abortController.abort();
    }, timeoutMs);
    var response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    var data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      var parseErr = new Error("bad_json");
      parseErr.cause = jsonErr;
      throw parseErr;
    }
    // Compatibility: new assistant shape {type,message,meta} + legacy {reply,locale}
    var reply = "";
    if (data && typeof data.message === "string") {
      reply = String(data.message);
    } else if (data && typeof data.reply === "string") {
      reply = String(data.reply);
    }
    var resolvedLocale = "";
    if (data && data.meta && typeof data.meta.language === "string") {
      resolvedLocale = String(data.meta.language);
    } else if (data && typeof data.locale === "string") {
      resolvedLocale = String(data.locale);
    }
    if (!response.ok && !reply.trim()) throw new Error("http_" + response.status);
    if (!reply.trim()) throw new Error("empty_reply");
    if (resolvedLocale) setConversationLangFromMeta(resolvedLocale);

    var options = null;
    var meta = data && data.meta ? data.meta : {};
    var action = meta && meta.action ? meta.action : null;
    if (action && action.kind === "open_reservation_form") {
      /* Sunucu niyeti «rezervasyon» olsa da uygulamada form yok; Restaurant & barlar modülüne yönlendir (çok dilli etiket). */
      options = [
        {
          value: "__open_restaurants_bars_module__",
          label: t("chatOpenRestaurantsBars") || "Restaurant & barlar",
        },
      ];
    } else if (action && action.kind === "open_guest_notifications_form") {
      options = [
        {
          value: "__open_guest_notifications_form__",
          label: t("chatOpenGuestNotifications") || "Geç çıkış formunu aç",
        },
      ];
    } else if (action && action.kind === "open_alanya_module") {
      options = [
        {
          value: "__open_alanya_module__",
          label: t("chatOpenDiscoverAlanya") || "Alanya'yı keşfedin",
        },
      ];
    } else if (action && action.kind === "open_spa_module") {
      options = [
        {
          value: "__open_spa_module__",
          label: t("chatOpenSpa") || "Spa & wellness",
        },
      ];
    } else if (action && action.kind === "open_restaurants_bars_module") {
      options = [
        {
          value: "__open_restaurants_bars_module__",
          label: t("chatOpenRestaurantsBars") || "Restaurant & barlar",
        },
      ];
    } else if (action && action.kind === "open_transfer_module") {
      options = [
        {
          value: "__open_transfer_module__",
          label: t("chatOpenTransfer") || "Transfer",
        },
      ];
    } else if (action && action.kind === "open_room_service_module") {
      options = [
        {
          value: "__open_room_service_module__",
          label: t("chatOpenRoomService") || "Oda servisi",
        },
      ];
    } else if (action && action.kind === "open_where_module") {
      options = [
        {
          value: "__open_where_module__",
          label: t("chatOpenWhere") || "Konum rehberini aç",
        },
      ];
    } else if (action && action.kind === "open_complaint_form") {
      options = [
        {
          value: "__open_complaint_form__",
          label: t("chatOpenComplaint") || "Şikayet formunu aç",
        },
      ];
    } else if (action && action.kind === "chat_form" && action.step) {
      // Numara + label satırlarını butonlara dönüştür.
      var lines = reply.split(/\r?\n/);
      var newLines = [];
      var opts = [];
      lines.forEach(function (line) {
        var m = line.match(/^\s*(\d+)\.\s+(.*)$/);
        if (m) {
          opts.push({ value: m[1], label: m[2] });
        } else {
          newLines.push(line);
        }
      });
      if (opts.length) {
        var introLine = t("chatFormOptionsIntro");
        var bodyOnly = newLines.join("\n").trim();
        reply = bodyOnly ? introLine + "\n\n" + bodyOnly : introLine;
        options = opts;
      }
    }

    var exitChatAfterMs = null;
    if (meta && typeof meta.exit_chat_after_ms === "number" && Number.isFinite(meta.exit_chat_after_ms)) {
      exitChatAfterMs = meta.exit_chat_after_ms;
    }
    return {
      reply: reply,
      locale: resolvedLocale,
      options: options,
      exitChatAfterMs: exitChatAfterMs,
    };
  }

  function sendPipeline(text) {
    if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) return;
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

    var exitAfterMs = null;
    askViona(clean, getLang())
      .then(function (result) {
        exitAfterMs = result.exitChatAfterMs;
        state.messages.push({
          role: "assistant",
          content: result.reply,
          options: result.options || null,
        });
        trimHistory();
      })
      .catch(function (err) {
        state.messages.push({
          role: "assistant",
          content: getClientErrorReply(err),
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
        if (exitAfterMs) {
          scheduleExitToHomeAfterMs(exitAfterMs);
        } else if (els.input) {
          els.input.focus();
        }
      });
  }

  function onSubmit() {
    if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) return;
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
    if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) return;
    if (!window.confirm(t("chatClearConfirm"))) return;
    clearExitToHomeTimer();
    state.messages = [];
    state.pending = false;
    clearConversationLang();
    resetSessionId();
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
    var prompts = ["chatQuickRest", "chatQuickPool", "chatQuickSpa", "chatQuickAnim"];
    els.quick.innerHTML = "";
    prompts.forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "viona-chat__chip";
      btn.setAttribute("data-i18n", key);
      btn.textContent = t(key);
      btn.addEventListener("click", function () {
        if (state.pending) return;
        if (typeof window.vionaVoiceIsBusy === "function" && window.vionaVoiceIsBusy()) return;
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

  // Harici çağrı için: sohbeti kullanıcı onayı sormadan tamamen sıfırlar
  window.vionaChatHardReset = function () {
    clearExitToHomeTimer();
    state.messages = [];
    state.pending = false;
    clearConversationLang();
    resetSessionId();
    setTyping(false);
    renderMessages();
    if (els.input) {
      els.input.value = "";
      els.input.disabled = false;
      autosizeTextarea();
    }
    if (els.send) els.send.disabled = false;
  };

  /**
   * Sesli tur: `client_channel=voice` ile bilgi katmanı (sunucu); metin sohbetindeki buton seçenekleri burada gösterilmez.
   */
  window.vionaChatRunAssistantTurn = async function (userText) {
    var clean = String(userText || "").replace(/\r/g, "").trim();
    if (!clean) throw new Error("empty");
    if (state.pending) throw new Error("busy");
    state.pending = true;
    state.messages.push({ role: "user", content: clean });
    trimHistory();
    renderMessages();
    setTyping(true);
    try {
      var result = await askViona(clean, getLang(), { clientChannel: "voice" });
      state.messages.push({
        role: "assistant",
        content: result.reply,
        options: null,
      });
      trimHistory();
      renderMessages();
      return result.reply;
    } catch (e) {
      state.messages.push({
        role: "assistant",
        content: getClientErrorReply(e),
        error: true,
      });
      trimHistory();
      renderMessages();
      throw e;
    } finally {
      state.pending = false;
      setTyping(false);
    }
  };

  window.vionaChatIsPending = function () {
    return state.pending;
  };

  window.vionaChatOnOpen = function () {
    cacheEls();
    wireQuick();
    applyStaticI18n();
    if (typeof window.vionaVoiceOnModalOpen === "function") window.vionaVoiceOnModalOpen();
    if (typeof window.vionaVoiceRefreshI18n === "function") window.vionaVoiceRefreshI18n();
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
