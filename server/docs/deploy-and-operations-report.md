# Viona — Dağıtım ve operasyon özeti

Bu dosya repoda ayrı tutulur; **PDF olarak indirmek** için editörde “Yazdır → PDF” veya Markdown PDF aracı kullanın.

Son güncelleme: proje kökü `render.yaml`, `server/` Node API, Vercel/statik ön yüz varsayımı.

---

## 1. Mimari

| Bileşen | Rol |
|---------|-----|
| **Statik site** (Vercel vb.) | Misafir uygulaması + admin paneli HTML/JS |
| **Node API** (Render, `server/`) | Express: misafir formları, admin API, PDF, chat proxy |
| **Python asistan** (ayrı servis) | `ASSISTANT_CHAT_ENDPOINT`; Node `/api/chat` ile proxy |
| **Supabase** | Kalıcı veri |
| **WhatsApp Cloud API** | Operasyon: 3 onaylı şablon (`viona_issue_notification` / `viona_request_notification` / `viona_complaint_notification`) + arıza → TECH; istek → HK; şikayet → Front (virgülle çoklu numara, her numaraya ayrı template) |
| **Telegram** (opsiyonel) | Ayrı yapılandırmada teknik / HK kanalları |

API kökü: `js/viona-backend-url.js` → `https://viona-node-api.onrender.com/api` (servis adınız farklıysa güncelleyin).

---

## 2. Zorunlu ortam değişkenleri (Node / Render)

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ASSISTANT_CHAT_ENDPOINT` (Python `/api/chat` tam URL)
- Operasyon WhatsApp: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, isteğe bağlı `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_TEMPLATE_LANGUAGE` (veya `WHATSAPP_OPERATIONAL_TEMPLATE_LANGUAGE`, genelde `tr`), `WHATSAPP_*_RECIPIENTS` (virgülle; ayrıntı `server/.env.example`)
- İsteğe bağlı: `OPENAI_*`, `GEMINI_*` (PDF metin katmanı), `TELEGRAM_*` (Telegram bildirimleri)
- Sesli asistan: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (boşsa `/api/tts` ve `/api/stt` 503 döner)

Ayrıntılı şablon: `server/.env.example`.

### WhatsApp Cloud API — kalıcı token

`WHATSAPP_ACCESS_TOKEN` için **Meta Business Suite → Sistem kullanıcısı (System User)** ile **Permanent Access Token** üretin; Graph API Explorer veya kısa ömürlü kullanıcı token’ları üretimde süre dolar (ör. hata 190). Resmi akış: *Create a System User and Generate a Permanent Access Token* — [WhatsApp Cloud API — Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started).

---

## 3. Render (Node Web Service)

- **Root Directory:** `server`
- **Build Command:** `render.yaml` ile aynı olmalı; PDF için Puppeteer Chrome kurulumu + doğrulama script’i dahil.
- **Start Command:** `node src/index.js`
- **PUPPETEER_CACHE_DIR:** `.cache/puppeteer` (panel veya Blueprint)
- İlk deploy veya sorun sonrası: **Clear build cache & deploy**
- Build log’da `[verify-puppeteer] OK` satırını doğrula

---

## 4. Sağlık kontrolü

`GET https://<node-host>/api/health`

- `ok`, `hasSupabase`, `telegramTeknikConfigured` / `telegramHkConfigured` (token sızmaz)
- Grup bildirimi kullanıyorsanız: `whatsappOperational.mode`, `whatsappGroupBot.ready` (bağlı cihaz hazır mı), `whatsappGroupBot.lastError` (boş olmalı)

---

## 4a. WhatsApp grup botu (Viona Ops) — sürekli çalışma

**Telefondaki “son görülme” ile sunucunun göndermeye hazır olması aynı değil.** “Bağlı cihazlar” listesinde **Viona Ops** için görünen saat, WhatsApp’ın arayüzünde cihaz aktivitesini gösterir; headless oturum bazen uzun süre aynı saatte kalırken bile API tarafında mesaj gönderebilir. Asıl kritik olan:

| Gereksinim | Açıklama |
|------------|----------|
| **Node API sürekli çalışsın** | İstek/arıza geldiğinde süreç ayakta olmalı. Yerelde: terminal kapanınca süreç ölür; üretimde **Render “always on”**, **systemd**, **PM2** vb. ile `node src/index.js` (veya `node server/src/index.js`) yeniden başlatma politikası kullanın. |
| **`whatsappGroupBot.ready: true`** | `/api/health` içinde düzenli kontrol edin; `ready: false` veya `lastError` doluysa loglara bakın (`[whatsapp_group_bot]`). |
| **Oturum kalıcılığı** | `WHATSAPP_GROUP_SESSION_DIR` (ör. `runtime/whatsapp-session`) aynı makinede kalıcı diskte olmalı; deploy’da bu klasörü sıfırlamayın, yoksa yeniden QR gerekir. |
| **Telefon + internet** | Bağlı cihaz modelinde telefonun ara sıra internete bağlı olması WhatsApp tarafından beklenir; sunucu kapalıyken gelen olaylar işlenmez. |
| **Çakışan süreç yok** | Aynı `user-data-dir` ile iki Chrome/Node çalışmasın; restart öncesi port **3001** ve gerekiyorsa Puppeteer süreçleri temizlenmeli (operasyon notlarındaki `pkill` / tek instance kuralı). |

**Özet:** Her dakika gruba mesaj gelebilmesi için **API sürecinin 7/24 ayakta** ve **grup botunun hazır** olması gerekir; bunu izlemek için health endpoint + log uyarıları (ör. `disconnected`, `auth_failure`) yeterlidir. “Son görülme”yi tek başına SLA göstergesi saymayın.

---

## 5. Git / push dikkatleri

- **`server/.cache/`** kök `.gitignore`’da **yok** (Render slug’ına Chromium girebilsin). Bu klasörü **asla commit etmeyin**.
- `git push` öncesi `cd server && npm test`
- Panel ile `render.yaml` farklıysa Build Command / env’yi elle hizalayın

---

## 6. Admin durumları (tutarlılık)

Sunucu `updateAdminItemStatus` için geçerli durumlar:  
`new`, `pending`, `in_progress`, `done`, `cancelled`, **`rejected`**

- Rezervasyonlarda **rejected** = admin arayüzünde “Onaylanmadı”.
- Supabase şema: `server/docs/supabase-paste-viona.sql` bölüm 9; eski kurulum için not: `server/docs/guest-reservations-status-rejected.sql`.

---

## 7. PDF raporu

- Uç: `GET /api/admin/reports/pdf`
- Puppeteer + opsiyonel Gemini; Chrome yolu `server/.cache/puppeteer` (Render build ile dolar)
- Sorun giderme: build log, `PUPPETEER_CACHE_DIR`, disk/RAM limitleri

---

## 8. Operasyon bildirimleri (WhatsApp)

| Kayıt türü | .env listesi |
|------------|----------------|
| `type: fault` | `WHATSAPP_TECH_RECIPIENTS` |
| `type: request` | `WHATSAPP_HK_RECIPIENTS` |
| `type: complaint` | `WHATSAPP_FRONT_RECIPIENTS` |
| `type: guest_notification` / `late_checkout` | `WHATSAPP_FRONT_RECIPIENTS` (ve isteğe bağlı `WHATSAPP_RECEPTION_RECIPIENTS`, `WHATSAPP_GUEST_RELATIONS_RECIPIENTS`, `WHATSAPP_HK_RECIPIENTS` birleşik) |

Virgül / noktalı virgül / satır sonu ile sıralı çoklu numara; ayrıntı: `server/.env.example`.

Kayıt oluşunca Node `createGuestRequest` içinde önce Supabase insert, sonra `sendOperationalWhatsappNotification` ile Meta API **template** mesajı gönderilir: arıza/istek için 8, şikâyet için 6, misafir bildirimi ve geç çıkış için **7** gövde parametresi. Misafir ilişkileri şablonunun varsayılan adı `viona_guest_relation_notification`; override: `WHATSAPP_GUEST_RELATION_TEMPLATE_NAME`. Üretimde Render loglarında `[whatsapp_ops]` önekiyle Meta hataları görülebilir. Supabase’e elle satır eklemek bildirim göndermez.

**Telegram** (ayrı `TELEGRAM_*` varsa): eski akış; WhatsApp ile birlikte veya yerine kullanılabilir.
