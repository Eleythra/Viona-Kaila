/**
 * Viona sesli asistan — OpenAI Realtime (WebRTC + ephemeral token).
 *
 *   idle ──(avatar)──► listening  (oturum açılır, mikrofon Realtime’a gider)
 *        │                ▼
 *        │            thinking / speaking  (model + sunucu tool → /api/chat)
 *        └────────────────┴──► idle
 *
 * Bilgi yanıtı Python’da kısıtlanır; ayrıntılar `voice_channel_layer`.
 */
(function () {
  "use strict";

  var LANG_KEY = "viona_lang";
  var STATE_IDLE = "idle";
  var STATE_LISTENING = "listening";
  var STATE_THINKING = "thinking";
  var STATE_SPEAKING = "speaking";

  var voiceState = STATE_IDLE;
  var mediaStream = null;
  var currentTtsAudio = null;
  var ttsObjectUrl = "";

  /** OpenAI Realtime WebRTC (tek tur: tool → /api/chat → ses). */
  var realtimePc = null;
  var realtimeDc = null;
  var realtimeRemoteAudio = null;
  var realtimeNoSpeechTimer = null;
  var realtimeAwaitSpeakDone = false;
  var realtimeHandledCallIds = {};
  var realtimeMuteConnectionErrors = false;
  var realtimePostResponseIdleTimer = null;

  /** Sesli bölüm kapalı başlar; tıklanınca açılır. Oturum sırasında kapatılamaz. */
  var panelExpanded = false;

  var els = {};

  var _cachedVoiceLangCode = null;
  var _tVoiceLocaleCode = null;
  var _tVoiceLocaleTable = null;

  function invalidateVoiceLangCache() {
    _cachedVoiceLangCode = null;
    _tVoiceLocaleCode = null;
    _tVoiceLocaleTable = null;
  }

  function getAppLang() {
    if (_cachedVoiceLangCode !== null) return _cachedVoiceLangCode;
    try {
      var raw = localStorage.getItem(LANG_KEY);
      if (!raw) {
        _cachedVoiceLangCode = "tr";
        return "tr";
      }
      var c = String(raw).trim();
      if (window.VIONA_LANG && typeof window.VIONA_LANG.normalizeToUiLang === "function") {
        c = window.VIONA_LANG.normalizeToUiLang(c);
      } else {
        c = String(raw).toLowerCase().slice(0, 2);
      }
      if (I18N[c]) {
        _cachedVoiceLangCode = c;
        return c;
      }
      if (I18N.en) {
        _cachedVoiceLangCode = "en";
        return "en";
      }
    } catch (e) {}
    _cachedVoiceLangCode = "tr";
    return "tr";
  }

  /** `app.js` ile aynı sıra: seçili dil → İngilizce → Türkçe → anahtar (sesli metin hiç düşmesin). */
  function t(key) {
    var code = getAppLang();
    if (code !== _tVoiceLocaleCode) {
      _tVoiceLocaleCode = code;
      _tVoiceLocaleTable = I18N[code] || I18N.tr;
    }
    var L = _tVoiceLocaleTable;
    if (L[key] !== undefined) return L[key];
    var E = I18N.en;
    if (E && E[key] !== undefined) return E[key];
    return I18N.tr[key] !== undefined ? I18N.tr[key] : key;
  }

  function voiceHintKeyFromRealtimeSessionPayload(data) {
    var code = data && data.error ? String(data.error) : "";
    if (code === "speech_unauthorized") return "voiceErrorSpeechUnauthorized";
    if (code === "realtime_not_configured") return "voiceErrorSpeechNotConfigured";
    if (code === "realtime_upstream_timeout") return "voiceErrorRealtimeTimeout";
    if (code === "http_429") return "voiceErrorRateLimit";
    if (code === "realtime_upstream" || code === "realtime_bad_response" || code === "bad_json")
      return "voiceErrorRealtimeUpstream";
    return "voiceErrorRealtimeSession";
  }

  /** Sunucudaki SPEECH_CLIENT_SECRET ile aynı; boşsa header gönderilmez. Öncelik: window → meta[name=viona-speech-client-secret]. */
  function speechAuthHeaders() {
    var s = "";
    try {
      if (typeof window.__VIONA_SPEECH_CLIENT_SECRET__ === "string") {
        s = String(window.__VIONA_SPEECH_CLIENT_SECRET__ || "").trim();
      }
      if (!s && typeof document !== "undefined") {
        var m = document.querySelector('meta[name="viona-speech-client-secret"]');
        if (m && m.getAttribute("content")) {
          s = String(m.getAttribute("content") || "").trim();
        }
      }
    } catch (e) {}
    if (!s) return {};
    return { "X-Viona-Speech-Secret": s };
  }

  function speechTimeoutMs(key, fallback) {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    var n = Number(cfg[key]);
    if (Number.isFinite(n) && n >= 5000) return Math.min(n, 120000);
    return fallback;
  }

  /** `?viona_voice_debug=1` veya `localStorage.viona_voice_debug=1` — konsola Realtime özeti. */
  function voiceDebugEnabled() {
    try {
      if (window.__VIONA_VOICE_DEBUG__ === true) return true;
      if (typeof localStorage !== "undefined" && localStorage.getItem("viona_voice_debug") === "1") return true;
      return /[?&]viona_voice_debug=1(?:&|$)/.test(String(window.location.search || ""));
    } catch (e) {
      return false;
    }
  }

  function voiceDebugLog(label, payload) {
    if (!voiceDebugEnabled()) return;
    try {
      console.warn("[viona-voice]", label, payload !== undefined ? payload : "");
    } catch (e) {}
  }

  function fetchWithTimeout(url, init, timeoutMs) {
    if (!timeoutMs || timeoutMs < 1000) return fetch(url, init);
    var ac = new AbortController();
    var id = setTimeout(function () {
      ac.abort();
    }, timeoutMs);
    var merged = Object.assign({}, init, { signal: ac.signal });
    return fetch(url, merged).finally(function () {
      clearTimeout(id);
    });
  }

  /** Yalnızca idle iken false — metin sohbeti bu sürede kilitlenir */
  window.vionaVoiceIsBusy = function () {
    return voiceState !== STATE_IDLE;
  };

  /** Sol üst geri: metin modunda modal kapanır; ses modunda (boşta) metin sohbetine döner */
  function syncChatNavBack() {
    var nav = document.getElementById("viona-chat-nav-back");
    if (!nav) return;
    if (panelExpanded) {
      nav.setAttribute("aria-label", t("voiceBackToChatAria"));
      nav.setAttribute("title", t("voiceBackToChat"));
    } else {
      nav.setAttribute("aria-label", t("chatNavBackAria"));
      nav.setAttribute("title", t("chatNavBackAria"));
    }
    var busy = voiceState !== STATE_IDLE;
    nav.disabled = panelExpanded && busy;
    nav.setAttribute("aria-disabled", nav.disabled ? "true" : "false");
  }

  function syncPanelUi() {
    if (!els.panel || !els.openBtn) return;
    els.panel.hidden = !panelExpanded;
    els.openBtn.setAttribute("aria-expanded", panelExpanded ? "true" : "false");
    els.openBtn.classList.toggle("viona-chat__bar-btn--on", panelExpanded);
    els.openBtn.setAttribute("aria-label", t(panelExpanded ? "voiceToggleCollapseAria" : "voiceToggleExpandAria"));
    var chatRoot = document.getElementById("viona-chat");
    if (chatRoot) chatRoot.classList.toggle("viona-chat--voice-drawer-open", panelExpanded);
    var primary = document.querySelector(".viona-chat-primary");
    if (primary) primary.classList.toggle("viona-chat-primary--voice-mode", panelExpanded);
    syncChatNavBack();
  }

  function setPanelExpanded(on) {
    var want = !!on;
    if (!want && voiceState !== STATE_IDLE) return;
    panelExpanded = want;
    syncPanelUi();
  }

  function expandPanelIfCollapsed() {
    if (!panelExpanded) {
      panelExpanded = true;
      syncPanelUi();
    }
  }

  /** Modal her açıldığında sesli paneli kapat (boşta ise). */
  window.vionaVoiceOnModalOpen = function () {
    if (voiceState === STATE_IDLE) {
      panelExpanded = false;
      syncPanelUi();
    }
  };

  function setComposerLocked(locked) {
    var inp = document.getElementById("viona-chat-input");
    var snd = document.getElementById("viona-chat-send");
    if (inp) {
      inp.disabled = !!locked;
      inp.setAttribute("aria-busy", locked ? "true" : "false");
    }
    if (snd) {
      snd.disabled = !!locked;
      snd.setAttribute("aria-busy", locked ? "true" : "false");
    }
  }

  function stopTtsPlayback() {
    if (currentTtsAudio) {
      try {
        currentTtsAudio.pause();
        currentTtsAudio.src = "";
      } catch (e) {}
      currentTtsAudio = null;
    }
    if (ttsObjectUrl) {
      try {
        URL.revokeObjectURL(ttsObjectUrl);
      } catch (e) {}
      ttsObjectUrl = "";
    }
  }

  function stopMicAndAnalysis() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(function (tr) {
        try {
          tr.stop();
        } catch (e) {}
      });
      mediaStream = null;
    }
  }

  function showAsset(which) {
    if (!els.idleImg || !els.vListen || !els.vThink || !els.vSpeak) return;
    var map = {
      idle: els.idleImg,
      listening: els.vListen,
      thinking: els.vThink,
      speaking: els.vSpeak,
    };
    Object.keys(map).forEach(function (k) {
      var node = map[k];
      var on = k === which;
      node.classList.toggle("hidden", !on);
      if (node.tagName === "VIDEO") {
        if (on) {
          node.muted = true;
          node.setAttribute("playsinline", "");
          var p = node.play();
          if (p && typeof p.catch === "function") p.catch(function () {});
        } else {
          try {
            node.pause();
          } catch (e) {}
        }
      }
    });
  }

  function setStatusText() {
    if (!els.status) return;
    var key =
      voiceState === STATE_IDLE
        ? "voiceStatusIdle"
        : voiceState === STATE_LISTENING
          ? "voiceStatusListening"
          : voiceState === STATE_THINKING
            ? "voiceStatusThinking"
            : "voiceStatusSpeaking";
    els.status.textContent = t(key);
    els.status.setAttribute("data-i18n", key);
  }

  function setAvatarInteractivity() {
    if (!els.hit) return;
    var idleOnly = voiceState === STATE_IDLE;
    els.hit.disabled = !idleOnly;
    els.hit.setAttribute("aria-disabled", idleOnly ? "false" : "true");
    els.hit.classList.toggle("viona-voice__hit--locked", !idleOnly);
  }

  function applyVoiceState(next) {
    voiceState = next;
    if (next !== STATE_IDLE) expandPanelIfCollapsed();
    if (els.panel) {
      var st =
        next === STATE_IDLE ? "idle" : next === STATE_LISTENING ? "listening" : next === STATE_THINKING ? "thinking" : "speaking";
      els.panel.setAttribute("data-voice-state", st);
    }
    showAsset(
      next === STATE_IDLE ? "idle" : next === STATE_LISTENING ? "listening" : next === STATE_THINKING ? "thinking" : "speaking",
    );
    setStatusText();
    setAvatarInteractivity();
    syncChatNavBack();
  }

  function cleanupRealtime() {
    realtimeAwaitSpeakDone = false;
    realtimeMuteConnectionErrors = true;
    clearRealtimePostResponseIdleTimer();
    clearRealtimeNoSpeechTimer();
    realtimeHandledCallIds = {};
    if (realtimeDc) {
      try {
        realtimeDc.close();
      } catch (e) {}
      realtimeDc = null;
    }
    if (realtimePc) {
      try {
        realtimePc.getSenders().forEach(function (s) {
          try {
            if (s.track) s.track.stop();
          } catch (e2) {}
        });
        realtimePc.close();
      } catch (e) {}
      realtimePc = null;
    }
    if (realtimeRemoteAudio) {
      try {
        realtimeRemoteAudio.pause();
        realtimeRemoteAudio.srcObject = null;
      } catch (e) {}
      realtimeRemoteAudio = null;
    }
    setTimeout(function () {
      realtimeMuteConnectionErrors = false;
    }, 0);
  }

  function goIdle() {
    cleanupRealtime();
    stopTtsPlayback();
    stopMicAndAnalysis();
    applyVoiceState(STATE_IDLE);
    setComposerLocked(false);
  }

  /** Kısa kullanıcı mesajı; ardından varsayılan idle metnine döner */
  function goIdleWithVoiceHint(i18nKey) {
    cleanupRealtime();
    stopTtsPlayback();
    stopMicAndAnalysis();
    applyVoiceState(STATE_IDLE);
    setComposerLocked(false);
    if (els.status && i18nKey) {
      els.status.textContent = t(i18nKey);
      setTimeout(function () {
        cacheEls();
        if (voiceState === STATE_IDLE && els.status) {
          els.status.textContent = t("voiceStatusIdle");
          els.status.setAttribute("data-i18n", "voiceStatusIdle");
        }
      }, 4200);
    }
  }

  /**
   * Realtime uzaktan ses ve mobil autoplay: avatar tıklandığında kısa sessiz çalma + AudioContext resume.
   */
  function primeVoiceAudioPlayback() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        var ctx = new AC();
        if (ctx.state === "suspended") {
          ctx.resume().catch(function () {});
        }
        var buf = ctx.createBuffer(1, 1, 22050);
        var src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        setTimeout(function () {
          try {
            ctx.close();
          } catch (e) {}
        }, 400);
      }
    } catch (e) {}
    try {
      var a = new Audio();
      a.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      var p = a.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    } catch (e) {}
  }

  var OPENAI_REALTIME_CALLS = "https://api.openai.com/v1/realtime/calls";
  var REALTIME_NO_SPEECH_MS = 36000;

  function waitIceGatheringComplete(pc, maxMs) {
    var cap = typeof maxMs === "number" && maxMs > 500 ? maxMs : 3500;
    return new Promise(function (resolve) {
      if (!pc || pc.iceGatheringState === "complete") {
        resolve();
        return;
      }
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        try {
          pc.removeEventListener("icegatheringstatechange", onCh);
        } catch (e) {}
        resolve();
      }
      function onCh() {
        if (pc.iceGatheringState === "complete") finish();
      }
      pc.addEventListener("icegatheringstatechange", onCh);
      setTimeout(finish, cap);
    });
  }

  function dcSend(obj) {
    try {
      if (!realtimeDc || realtimeDc.readyState !== "open") return;
      realtimeDc.send(JSON.stringify(obj));
    } catch (e) {
      voiceDebugLog("realtime_dc_send_err", e && e.message ? e.message : e);
    }
  }

  function clearRealtimePostResponseIdleTimer() {
    if (realtimePostResponseIdleTimer) {
      try {
        clearTimeout(realtimePostResponseIdleTimer);
      } catch (e) {}
      realtimePostResponseIdleTimer = null;
    }
  }

  /** output_audio_buffer.stopped gelmezse (bazı ağlar) yine de idle’a dön. */
  function scheduleRealtimePostResponseIdle() {
    clearRealtimePostResponseIdleTimer();
    var ms = speechTimeoutMs("realtimeSpeakFallbackMs", 14000);
    realtimePostResponseIdleTimer = setTimeout(function () {
      realtimePostResponseIdleTimer = null;
      if (realtimeAwaitSpeakDone && voiceState !== STATE_IDLE) {
        voiceDebugLog("realtime_speak_fallback_idle");
        goIdle();
      }
    }, ms);
  }

  function processVionaToolCall(callId, rawArgs) {
    if (!callId || realtimeHandledCallIds[callId]) return;
    var userText = "";
    try {
      var parsed = rawArgs ? JSON.parse(rawArgs) : {};
      userText = String(parsed.user_message || "").trim();
    } catch (parseErr) {
      userText = "";
    }
    if (!userText) {
      goIdleWithVoiceHint("voiceErrorNoSpeech");
      return;
    }
    realtimeHandledCallIds[callId] = true;
    clearRealtimeNoSpeechTimer();
    applyVoiceState(STATE_THINKING);
    setComposerLocked(true);
    if (typeof window.vionaChatRunAssistantTurn !== "function") {
      goIdle();
      return;
    }
    window
      .vionaChatRunAssistantTurn(userText, { skipChatHistory: true })
      .then(function (reply) {
        var text = String(reply || "").trim() || " ";
        var out = JSON.stringify({ reply: text });
        dcSend({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: callId,
            output: out,
          },
        });
        dcSend({ type: "response.create" });
        realtimeAwaitSpeakDone = true;
        applyVoiceState(STATE_SPEAKING);
        scheduleRealtimePostResponseIdle();
      })
      .catch(function () {
        goIdleWithVoiceHint("voiceErrorAssistant");
      });
  }

  function handleRealtimeServerEvent(ev) {
    if (!ev || typeof ev.type !== "string") return;
    if (ev.type === "response.function_call_arguments.done") {
      var name = String(ev.name || "");
      var callId = String(ev.call_id || "");
      var rawArgs = String(ev.arguments || "").trim();
      if (name !== "viona_backend_reply" || !callId) return;
      processVionaToolCall(callId, rawArgs);
      return;
    }
    if (ev.type === "response.output_item.done") {
      var it = ev.item;
      if (!it || String(it.type || "") !== "function_call") return;
      if (String(it.name || "") !== "viona_backend_reply") return;
      var oid = String(it.call_id || it.id || "").trim();
      var oargs = String(it.arguments || "").trim();
      if (!oid || !oargs || oargs.charAt(0) !== "{") return;
      processVionaToolCall(oid, oargs);
      return;
    }
    if (ev.type === "response.done") {
      if (realtimeAwaitSpeakDone && voiceState !== STATE_IDLE) {
        var resp = ev.response;
        var st = resp && resp.status != null ? String(resp.status) : "";
        if (st === "completed" || st === "cancelled" || st === "failed" || st === "incomplete") {
          scheduleRealtimePostResponseIdle();
        }
      }
      return;
    }
    if (ev.type === "output_audio_buffer.started") {
      if (realtimeAwaitSpeakDone) applyVoiceState(STATE_SPEAKING);
      return;
    }
    if (ev.type === "output_audio_buffer.stopped") {
      if (realtimeAwaitSpeakDone) {
        clearRealtimePostResponseIdleTimer();
        goIdle();
      }
      return;
    }
    if (ev.type === "error") {
      if (realtimeMuteConnectionErrors || voiceState === STATE_IDLE) return;
      voiceDebugLog("realtime_err", ev);
      goIdleWithVoiceHint("voiceErrorRealtimeUpstream");
    }
  }

  function clearRealtimeNoSpeechTimer() {
    if (realtimeNoSpeechTimer) {
      try {
        clearTimeout(realtimeNoSpeechTimer);
      } catch (e) {}
      realtimeNoSpeechTimer = null;
    }
  }

  function scheduleRealtimeNoSpeechTimer() {
    clearRealtimeNoSpeechTimer();
    realtimeNoSpeechTimer = setTimeout(function () {
      realtimeNoSpeechTimer = null;
      if (voiceState === STATE_LISTENING && !realtimeAwaitSpeakDone) {
        goIdleWithVoiceHint("voiceErrorNoSpeech");
      }
    }, REALTIME_NO_SPEECH_MS);
  }

  function startRealtimeVoiceSession() {
    if (typeof RTCPeerConnection === "undefined") {
      goIdleWithVoiceHint("voiceErrorRealtimeSession");
      return;
    }
    var cfg = window.VIONA_CHAT_CONFIG || {};
    var base = typeof window.vionaGetApiBase === "function" ? window.vionaGetApiBase() : "";
    var ep = String(cfg.realtimeSessionEndpoint || base + "/realtime/session").trim();
    var openVoice = cfg.openAiRealtimeVoice || "marin";

    return fetchWithTimeout(
      ep,
      {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, speechAuthHeaders()),
        body: JSON.stringify({
          ui_language: getAppLang(),
          voice: String(openVoice).trim(),
        }),
      },
      speechTimeoutMs("realtimeSessionTimeoutMs", 22000),
    )
      .then(function (res) {
        return res.text().then(function (raw) {
          var data = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch (e) {
            data = null;
          }
          if (!res.ok) {
            var errObj = data && typeof data === "object" ? data : { ok: false, error: "http_" + res.status };
            return { __err: errObj };
          }
          return data || { ok: false, error: "bad_json" };
        });
      })
      .then(function (data) {
        if (data && data.__err) {
          goIdleWithVoiceHint(voiceHintKeyFromRealtimeSessionPayload(data.__err));
          return null;
        }
        if (!data || !data.ok || !data.client_secret || !String(data.client_secret.value || "").trim()) {
          goIdleWithVoiceHint(voiceHintKeyFromRealtimeSessionPayload(data || {}));
          return null;
        }
        var ephemeral = String(data.client_secret.value).trim();

        return navigator.mediaDevices
          .getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: { ideal: 1 },
            },
          })
          .then(function (stream) {
            mediaStream = stream;
            realtimePc = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            realtimeRemoteAudio = new Audio();
            realtimeRemoteAudio.autoplay = true;
            realtimeRemoteAudio.setAttribute("playsinline", "true");

            realtimePc.ontrack = function (e) {
              if (e.streams && e.streams[0]) {
                realtimeRemoteAudio.srcObject = e.streams[0];
                var p = realtimeRemoteAudio.play();
                if (p && typeof p.catch === "function") {
                  p.catch(function () {});
                }
              }
            };

            realtimePc.onconnectionstatechange = function () {
              if (realtimeMuteConnectionErrors) return;
              var st = realtimePc && realtimePc.connectionState;
              if (st === "failed" || st === "disconnected") {
                if (voiceState !== STATE_IDLE) goIdleWithVoiceHint("voiceErrorNetwork");
              }
            };

            try {
              stream.getTracks().forEach(function (track) {
                realtimePc.addTrack(track, stream);
              });
            } catch (e) {
              goIdleWithVoiceHint("voiceErrorRealtimeSession");
              return null;
            }

            realtimeDc = realtimePc.createDataChannel("oai-events");

            realtimeDc.onopen = function () {
              scheduleRealtimeNoSpeechTimer();
            };

            realtimeDc.onmessage = function (e) {
              try {
                var msg = JSON.parse(e.data);
                handleRealtimeServerEvent(msg);
              } catch (err) {
                voiceDebugLog("realtime_parse", err);
              }
            };

            realtimeDc.onerror = function () {
              goIdleWithVoiceHint("voiceErrorRealtimeUpstream");
            };

            return realtimePc
              .createOffer()
              .then(function (offer) {
                return realtimePc.setLocalDescription(offer).then(function () {
                  return waitIceGatheringComplete(realtimePc, 7500).then(function () {
                    var ld = realtimePc.localDescription;
                    if (ld && ld.sdp) {
                      offer = { type: ld.type, sdp: ld.sdp };
                    }
                    return offer;
                  });
                });
              })
              .then(function (offer) {
                return fetchWithTimeout(
                  OPENAI_REALTIME_CALLS,
                  {
                    method: "POST",
                    headers: {
                      Authorization: "Bearer " + ephemeral,
                      "Content-Type": "application/sdp",
                    },
                    body: offer.sdp,
                  },
                  speechTimeoutMs("realtimeCallsTimeoutMs", 35000),
                ).then(function (sdpRes) {
                  return sdpRes.text().then(function (answerSdp) {
                    if (!sdpRes.ok) {
                      voiceDebugLog("realtime_sdp_http", sdpRes.status);
                      goIdleWithVoiceHint("voiceErrorRealtimeUpstream");
                      return null;
                    }
                    return realtimePc.setRemoteDescription({ type: "answer", sdp: answerSdp });
                  });
                });
              });
          });
      })
      .catch(function (err) {
        voiceDebugLog("realtime_catch", err && err.name ? err.name : err);
        goIdleWithVoiceHint("voiceErrorNetwork");
      });
  }

  function startListeningFromIdle() {
    if (voiceState !== STATE_IDLE) return;
    if (typeof window.vionaChatIsPending === "function" && window.vionaChatIsPending()) return;

    expandPanelIfCollapsed();
    stopTtsPlayback();
    primeVoiceAudioPlayback();
    setComposerLocked(true);
    applyVoiceState(STATE_LISTENING);

    startRealtimeVoiceSession();
  }

  function cacheEls() {
    els.root = document.getElementById("viona-voice");
    els.openBtn = document.getElementById("viona-voice-open");
    els.panel = document.getElementById("viona-voice-panel");
    els.hit = document.getElementById("viona-voice-hit");
    els.status = document.getElementById("viona-voice-status");
    els.idleImg = document.getElementById("viona-voice-idle");
    els.vListen = document.getElementById("viona-voice-listening");
    els.vThink = document.getElementById("viona-voice-thinking");
    els.vSpeak = document.getElementById("viona-voice-speaking");
  }

  function wire() {
    cacheEls();
    if (!els.hit || !els.openBtn || !els.panel) return;

    els.openBtn.addEventListener("click", function () {
      if (panelExpanded) {
        if (voiceState !== STATE_IDLE) return;
        setPanelExpanded(false);
      } else {
        setPanelExpanded(true);
      }
    });

    els.hit.addEventListener("click", function () {
      if (voiceState !== STATE_IDLE) return;
      if (typeof window.vionaChatIsPending === "function" && window.vionaChatIsPending()) return;
      startListeningFromIdle();
    });

    var navBack = document.getElementById("viona-chat-nav-back");
    if (navBack) {
      navBack.addEventListener("click", function () {
        if (panelExpanded) {
          if (voiceState !== STATE_IDLE) return;
          setPanelExpanded(false);
          return;
        }
        var bd = document.querySelector("#modal-viona .modal-backdrop");
        if (bd) bd.click();
      });
    }

    applyVoiceState(STATE_IDLE);
    panelExpanded = false;
    syncPanelUi();
    if (els.hit) els.hit.setAttribute("aria-label", t("voiceAvatarAria"));
  }

  window.vionaVoiceRefreshI18n = function () {
    invalidateVoiceLangCache();
    cacheEls();
    setStatusText();
    syncPanelUi();
    if (els.hit) els.hit.setAttribute("aria-label", t("voiceAvatarAria"));
    var hints = document.getElementById("viona-voice-hints");
    if (hints) {
      hints.querySelectorAll("[data-i18n]").forEach(function (node) {
        var k = node.getAttribute("data-i18n");
        if (k) node.textContent = t(k);
      });
    }
    syncChatNavBack();
    var open = document.getElementById("viona-voice-open");
    if (open) {
      var lab = open.querySelector("[data-i18n]");
      if (lab && lab.getAttribute("data-i18n") === "voiceSectionTitle") {
        lab.textContent = t("voiceSectionTitle");
      }
    }
    var panel = document.getElementById("viona-voice-panel");
    var primary = document.querySelector(".viona-chat-primary");
    if (panel) panel.setAttribute("aria-label", t("voicePanelAria"));
    if (primary) primary.setAttribute("aria-label", t("chatAriaPrimary"));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
