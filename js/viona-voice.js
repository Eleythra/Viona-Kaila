/**
 * Viona sesli asistan — tek akış state makinesi (idle → listening → thinking → speaking → idle).
 * Azure STT/TTS sunucuda; avatar tıklaması yalnızca idle iken kabul edilir.
 */
(function () {
  "use strict";

  var LANG_KEY = "viona_lang";
  /** Deterministik: otomatik dil algılama yok; uygulama dili = STT/TTS locale */
  var AZURE_LOCALE_BY_APP = {
    tr: "tr-TR",
    en: "en-US",
    de: "de-DE",
    pl: "pl-PL",
    ru: "ru-RU",
    da: "da-DK",
    cs: "cs-CZ",
    ro: "ro-RO",
    nl: "nl-NL",
    sk: "sk-SK",
  };

  var STATE_IDLE = "idle";
  var STATE_LISTENING = "listening";
  var STATE_THINKING = "thinking";
  var STATE_SPEAKING = "speaking";

  var voiceState = STATE_IDLE;
  var mediaStream = null;
  var mediaRecorder = null;
  var recordChunks = [];
  var analysisCtx = null;
  var analysisRaf = 0;
  var listenStartedAt = 0;
  var speechEver = false;
  var speechFirstAt = 0;
  var silenceSince = 0;
  var currentTtsAudio = null;
  var ttsObjectUrl = "";

  /** Sesli bölüm kapalı başlar; tıklanınca açılır. Oturum sırasında kapatılamaz. */
  var panelExpanded = false;

  var els = {};

  function getAppLang() {
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

  function t(key) {
    var L = I18N[getAppLang()] || I18N.tr;
    return L[key] !== undefined ? L[key] : I18N.tr[key] || key;
  }

  function azureLocale() {
    var g = getAppLang();
    return AZURE_LOCALE_BY_APP[g] || AZURE_LOCALE_BY_APP.en || "tr-TR";
  }

  function speechEndpoints() {
    var cfg = window.VIONA_CHAT_CONFIG || {};
    var base = typeof window.vionaGetApiBase === "function" ? window.vionaGetApiBase() : "";
    return {
      tts: String(cfg.ttsEndpoint || base + "/tts").trim(),
      stt: String(cfg.sttEndpoint || base + "/stt").trim(),
    };
  }

  /** Render’da SPEECH_CLIENT_SECRET ile aynı; boşsa header gönderilmez. */
  function speechAuthHeaders() {
    var s = "";
    try {
      if (typeof window.__VIONA_SPEECH_CLIENT_SECRET__ === "string") {
        s = String(window.__VIONA_SPEECH_CLIENT_SECRET__ || "").trim();
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
    if (analysisRaf) {
      cancelAnimationFrame(analysisRaf);
      analysisRaf = 0;
    }
    if (analysisCtx) {
      try {
        analysisCtx.close();
      } catch (e) {}
      analysisCtx = null;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (e) {}
    }
    mediaRecorder = null;
    recordChunks = [];
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

  function goIdle() {
    stopTtsPlayback();
    stopMicAndAnalysis();
    applyVoiceState(STATE_IDLE);
    setComposerLocked(false);
  }

  /** Kısa kullanıcı mesajı; ardından varsayılan idle metnine döner */
  function goIdleWithVoiceHint(i18nKey) {
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
   * Uzun STT/sohbet/TTS zincirinden sonra audio.play() mobilde engellenebiliyor.
   * Avatar tıklandığı anda bağlamı «açmak» için kısa sessiz çalma + AudioContext resume.
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

  function writeString(view, offset, s) {
    for (var i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }

  function resampleFloat32Mono(input, inRate, outRate) {
    if (inRate === outRate) return input;
    var ratio = inRate / outRate;
    var outLen = Math.ceil(input.length / ratio);
    var out = new Float32Array(outLen);
    for (var i = 0; i < outLen; i++) {
      var srcPos = i * ratio;
      var i0 = Math.floor(srcPos);
      var i1 = Math.min(i0 + 1, input.length - 1);
      var f = srcPos - i0;
      out[i] = input[i0] * (1 - f) + input[i1] * f;
    }
    return out;
  }

  function floatTo16BitPCM(float32) {
    var buf = new Int16Array(float32.length);
    for (var i = 0; i < float32.length; i++) {
      var s = Math.max(-1, Math.min(1, float32[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return buf;
  }

  function pcmToWavBlob(int16, sampleRate) {
    var buffer = new ArrayBuffer(44 + int16.length * 2);
    var view = new DataView(buffer);
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + int16.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, int16.length * 2, true);
    var off = 44;
    for (var j = 0; j < int16.length; j++, off += 2) {
      view.setInt16(off, int16[j], true);
    }
    return new Blob([buffer], { type: "application/octet-stream" });
  }

  /** WebM/Opus kaydı → 16 kHz mono WAV (Azure STT REST) */
  function blobToWav16kMono(blob) {
    return new Promise(function (resolve, reject) {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      blob
        .arrayBuffer()
        .then(function (ab) {
          return ctx.decodeAudioData(ab.slice(0));
        })
        .then(function (audioBuf) {
          var mono;
          if (audioBuf.numberOfChannels === 1) {
            mono = audioBuf.getChannelData(0);
          } else {
            var ch0 = audioBuf.getChannelData(0);
            var ch1 = audioBuf.getChannelData(1);
            mono = new Float32Array(ch0.length);
            for (var i = 0; i < ch0.length; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;
          }
          var resampled = resampleFloat32Mono(mono, audioBuf.sampleRate, 16000);
          var int16 = floatTo16BitPCM(resampled);
          return ctx.close().then(function () {
            return pcmToWavBlob(int16, 16000);
          });
        })
        .then(resolve)
        .catch(function (e) {
          try {
            ctx.close();
          } catch (err) {}
          reject(e);
        });
    });
  }

  function analyzeLoop(analyser, dataArray) {
    if (voiceState !== STATE_LISTENING) return;

    analyser.getByteTimeDomainData(dataArray);
    var sum = 0;
    for (var i = 0; i < dataArray.length; i++) {
      var v = (dataArray[i] - 128) / 128;
      sum += v * v;
    }
    var rms = Math.sqrt(sum / dataArray.length);

    var LOUD = 0.022;
    var QUIET = 0.012;
    var SILENCE_HOLD_MS = 1500;
    var MAX_MS = 28000;
    var NO_SPEECH_MAX_MS = 22000;
    var MIN_RECORD_MS = 700;

    var now = Date.now();
    var elapsed = now - listenStartedAt;

    if (rms > LOUD) {
      speechEver = true;
      silenceSince = 0;
      if (!speechFirstAt) speechFirstAt = now;
    } else if (speechEver && rms < QUIET) {
      if (!silenceSince) silenceSince = now;
      else if (
        now - silenceSince >= SILENCE_HOLD_MS &&
        speechFirstAt &&
        now - speechFirstAt >= 600 &&
        elapsed >= MIN_RECORD_MS
      ) {
        finishListeningPhase();
        return;
      }
    } else {
      silenceSince = 0;
    }

    if (!speechEver && elapsed > NO_SPEECH_MAX_MS) {
      finishListeningPhase();
      return;
    }
    if (elapsed > MAX_MS) {
      finishListeningPhase();
      return;
    }

    analysisRaf = requestAnimationFrame(function () {
      analyzeLoop(analyser, dataArray);
    });
  }

  function finishListeningPhase() {
    if (voiceState !== STATE_LISTENING) return;
    if (analysisRaf) {
      cancelAnimationFrame(analysisRaf);
      analysisRaf = 0;
    }
    if (mediaRecorder && mediaRecorder.state === "recording") {
      try {
        if (typeof mediaRecorder.requestData === "function") {
          try {
            mediaRecorder.requestData();
          } catch (reqErr) {}
        }
        mediaRecorder.stop();
      } catch (e) {
        goIdle();
      }
    } else {
      goIdle();
    }
  }

  function onRecorderStopped() {
    if (voiceState !== STATE_LISTENING) return;

    var blob = new Blob(recordChunks, { type: recordChunks[0] && recordChunks[0].type ? recordChunks[0].type : "audio/webm" });
    recordChunks = [];
    stopMicAndAnalysis();

    if (!blob.size) {
      goIdle();
      return;
    }

    applyVoiceState(STATE_THINKING);
    setComposerLocked(true);

    blobToWav16kMono(blob)
      .then(function (wavBlob) {
        var ep = speechEndpoints();
        return fetchWithTimeout(
          ep.stt + "?locale=" + encodeURIComponent(azureLocale()),
          {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/octet-stream" }, speechAuthHeaders()),
            body: wavBlob,
          },
          speechTimeoutMs("speechSttTimeoutMs", 25000),
        ).then(function (res) {
          return res.text().then(function (raw) {
            var data = null;
            try {
              data = raw ? JSON.parse(raw) : null;
            } catch (parseErr) {
              data = null;
            }
            if (!res.ok) {
              return {
                ok: false,
                error: (data && data.error) || "http_" + res.status,
                httpStatus: res.status,
              };
            }
            return data || { ok: false, error: "bad_json" };
          });
        });
      })
      .then(function (data) {
        if (!data || !data.ok || !String(data.text || "").trim()) {
          var code = data && data.error;
          var httpSt = data && data.httpStatus;
          var serverSide =
            code === "speech_not_configured" ||
            code === "stt_failed" ||
            code === "speech_unauthorized" ||
            code === "stt_error" ||
            code === "bad_json" ||
            (typeof httpSt === "number" && httpSt >= 500) ||
            (typeof code === "string" && code.indexOf("http_") === 0);
          goIdleWithVoiceHint(serverSide ? "voiceErrorNetwork" : "voiceErrorNoSpeech");
          return;
        }
        var said = String(data.text).trim();
        return runThinkingAndSpeaking(said);
      })
      .catch(function () {
        goIdleWithVoiceHint("voiceErrorNetwork");
      });
  }

  function runThinkingAndSpeaking(userText) {
    if (typeof window.vionaChatRunAssistantTurn !== "function") {
      goIdle();
      return Promise.resolve();
    }

    return window
      .vionaChatRunAssistantTurn(userText)
      .then(function (reply) {
        var text = String(reply || "").trim();
        if (!text) {
          goIdleWithVoiceHint("voiceErrorAssistant");
          return;
        }
        return fetchTtsAndSpeak(text);
      })
      .catch(function () {
        goIdleWithVoiceHint("voiceErrorAssistant");
      });
  }

  function fetchTtsAndSpeak(plainText) {
    applyVoiceState(STATE_SPEAKING);
    setComposerLocked(true);
    stopTtsPlayback();

    var ep = speechEndpoints();
    return fetchWithTimeout(
      ep.tts,
      {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, speechAuthHeaders()),
        body: JSON.stringify({ text: plainText, locale: azureLocale() }),
      },
      speechTimeoutMs("speechTtsTimeoutMs", 35000),
    )
      .then(function (res) {
        if (res.ok) return res.blob();
        return res.text().then(function (raw) {
          var code = "tts_http";
          try {
            var j = raw ? JSON.parse(raw) : null;
            if (j && j.error) code = String(j.error);
          } catch (parseErr) {}
          var err = new Error(code);
          throw err;
        });
      })
      .then(function (blob) {
        if (!blob || !blob.size) throw new Error("tts_empty");
        ttsObjectUrl = URL.createObjectURL(blob);
        var audio = new Audio(ttsObjectUrl);
        currentTtsAudio = audio;
        audio.addEventListener(
          "ended",
          function () {
            stopTtsPlayback();
            goIdle();
          },
          { once: true },
        );
        audio.addEventListener(
          "error",
          function () {
            stopTtsPlayback();
            goIdleWithVoiceHint("voiceErrorPlayback");
          },
          { once: true },
        );
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            stopTtsPlayback();
            goIdleWithVoiceHint("voiceErrorPlayback");
          });
        }
      })
      .catch(function (e) {
        var c = e && e.message ? String(e.message) : "";
        var network =
          (e && e.name === "AbortError") ||
          c === "speech_not_configured" ||
          c === "speech_unauthorized" ||
          c === "tts_error" ||
          c === "empty_text" ||
          c === "text_too_long" ||
          /^http_5\d\d$/.test(c) ||
          /aborted|Failed to fetch|NetworkError|Load failed/i.test(c);
        goIdleWithVoiceHint(network ? "voiceErrorNetwork" : "voiceErrorPlayback");
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

    navigator.mediaDevices
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
        var mime = "audio/webm;codecs=opus";
        if (!window.MediaRecorder || !MediaRecorder.isTypeSupported(mime)) {
          mime = "audio/webm";
        }
        var recOpts = { mimeType: mime };
        try {
          if (typeof MediaRecorder !== "undefined" && MediaRecorder.prototype) {
            recOpts.audioBitsPerSecond = 128000;
          }
        } catch (e) {}
        mediaRecorder = new MediaRecorder(stream, recOpts);
        recordChunks = [];
        mediaRecorder.ondataavailable = function (e) {
          if (e.data && e.data.size) recordChunks.push(e.data);
        };
        mediaRecorder.onstop = onRecorderStopped;

        analysisCtx = new (window.AudioContext || window.webkitAudioContext)();
        var source = analysisCtx.createMediaStreamSource(stream);
        var analyser = analysisCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        listenStartedAt = Date.now();
        speechEver = false;
        speechFirstAt = 0;
        silenceSince = 0;

        mediaRecorder.start(200);
        var dataArray = new Uint8Array(analyser.fftSize);
        analysisRaf = requestAnimationFrame(function () {
          analyzeLoop(analyser, dataArray);
        });
      })
      .catch(function () {
        goIdle();
      });
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
