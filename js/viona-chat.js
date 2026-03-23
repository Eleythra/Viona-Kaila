/**
 * Viona otel asistanı — metin sohbeti (backend: http://localhost:3001/api/chat)
 */
(function () {
  "use strict";

  var LANG_KEY = "viona_lang";
  var MAX_INPUT = 2000;
  var MAX_MESSAGES = 80;

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

    askViona(lastUserText, getLang())
      .then(function (reply) {
        state.messages.push({ role: "assistant", content: reply });
        trimHistory();
      })
      .catch(function () {
        state.messages.push({
          role: "assistant",
          content: getClientErrorReply(),
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

  function getClientErrorReply() {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    if (typeof cfg.errorReply === "string" && cfg.errorReply.trim()) {
      return cfg.errorReply.trim();
    }
    return t("chatError");
  }

  async function askViona(message, locale) {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    var endpoint =
      typeof cfg.endpoint === "string" && cfg.endpoint.trim()
        ? cfg.endpoint.trim()
        : "http://localhost:3001/api/chat";
    var response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, locale: locale || "tr" }),
    });
    var data = await response.json();
    var reply = data && data.reply ? String(data.reply) : "";
    if (!response.ok && !reply.trim()) throw new Error("http_" + response.status);
    if (!reply.trim()) throw new Error("empty_reply");
    return reply;
  }

  function sendPipeline(text) {
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

    askViona(clean, getLang())
      .then(function (reply) {
        state.messages.push({ role: "assistant", content: reply });
        trimHistory();
      })
      .catch(function () {
        state.messages.push({
          role: "assistant",
          content: getClientErrorReply(),
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
