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
| **Telegram** | Arıza → teknik grup; istek → HK grubu (şikayet yok) |

API kökü: `js/viona-backend-url.js` → `https://viona-node-api.onrender.com/api` (servis adınız farklıysa güncelleyin).

---

## 2. Zorunlu ortam değişkenleri (Node / Render)

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ASSISTANT_CHAT_ENDPOINT` (Python `/api/chat` tam URL)
- İsteğe bağlı: `OPENAI_*`, `GEMINI_*` (PDF metin katmanı), `TELEGRAM_*` (bildirimler)

Ayrıntılı şablon: `server/.env.example`.

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

## 8. Telegram yönlendirme

| Kayıt | Bot / grup |
|-------|------------|
| `type: fault` | Teknik token + teknik chat id |
| `type: request` | HK token + HK chat id |
| Şikayet / rezervasyon | Bildirim yok |

Sadece `POST /api/guest-requests` ile oluşan kayıtlar tetikler; Supabase’e elle satır eklemek Telegram göndermez.
