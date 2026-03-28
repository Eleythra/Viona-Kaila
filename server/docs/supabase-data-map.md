# Supabase veri haritası (Viona / Kaila Beach)

Bu proje **tek bir Supabase projesi** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) ve **tek Postgres veritabanı** kullanır. Aşağıdaki tablolar **mantıksal alanlara** ayrılmıştır; fiziksel olarak hepsi aynı DB içindedir.

## Özet tablo

| Tablo | Amaç | Yazan | Okuyan (ör.) |
|-------|------|--------|----------------|
| `guest_requests` | Misafir talepleri (havlu, minibar vb.) | `POST /api/guest-requests` | Admin İstekler |
| `guest_complaints` | Şikâyet kayıtları | aynı endpoint, `type=complaint` | Admin Şikâyetler |
| `guest_faults` | Oda/tesis arızası | aynı endpoint, `type=fault` | Admin Arızalar |
| `guest_reservations` | Restoran / spa rezervasyon talepleri | aynı endpoint, rezervasyon tipleri | Admin Rezervasyonlar |
| `survey_submissions` | Anket (otel + Viona puanları, JSON cevaplar) | `POST /api/surveys` | Admin Değerlendirmeler, dashboard raporu |
| `chat_observations` | Sohbet mesajı + asistan yanıtı özeti (analitik) | `POST /api/chat` (Node veya serverless proxy) | Admin Loglar, dashboard |
| `promo_configs` | Dil bazlı popup reklam görselleri | Admin Reklamlar kaydet | Misafir uygulaması promo |
| `actions` | (İsteğe bağlı) Sohbetten sonra tıklama / dönüşüm olayları | Uygulama / başka servis | Dashboard “dönüşüm” metrikleri |

**Kural:** Harici bir sisteme bağlarken çoğu zaman **tablo adı = veri sınırı** yeterlidir; ayrı veritabanı yoktur.

---

## Misafir formları → dört tablo

Tek API: **`POST /api/guest-requests`**. Gövdedeki `type` alanı hedef tabloyu belirler (`guest-requests.service.js`):

- `request` → `guest_requests`
- `complaint` → `guest_complaints`
- `fault` → `guest_faults`
- `reservation_alacarte` / `reservation_spa` → `guest_reservations`

Admin tarafta “bucket” isimleri API ile hizalıdır: `request`, `complaint`, `fault`, `reservation` → yukarıdaki tablolar.

---

## Anket (`survey_submissions`)

**Yazan:** `POST /api/surveys` (`surveys.service.js`).

Önemli kolonlar (mantık):

- `overall_score` — gönderim anında hesaplanan **genel otel** özeti (tüm otel kategorilerinin ortalaması).
- `viona_rating` — Viona genel sorusu (`viona_overall`) puanı.
- `hotel_categories` — JSON: başlık bazında ortalamalar (`food`, `comfort`, …). Admin “Değerlendirmeler” kartı üstündeki **başlık ortalaması** buradan gelir.
- `hotel_answers` — JSON: soru id → puan (örn. `room_comfort`, `bed_comfort`). Admin **soru satırları** buradan hesaplanır.
- `viona_answers` — JSON: Viona soru id → puan.
- `language`, `device_type`, `submitted_at`, `raw_payload` — bağlam ve denetim.

**Tutarlılık:** Eski kayıtlarda `hotel_answers` boş olabilir; o zaman kategori ortalaması görünür, soru kırılımı “—” kalır. Yeni gönderimlerde ikisi birlikte doldurulmalıdır.

---

## Sohbet logları (`chat_observations`)

**Yazan:**

- Üretimde genelde **`server/src/index.js`** içindeki `POST /api/chat` proxy’si.
- Ayrıca kökteki **`api/chat.js`** (Vercel vb.) aynı tabloya REST ile yazabilir — **aynı tablo, iki olası giriş noktası**. Canlıda yalnızca birinin aktif olduğundan emin olun; yoksa çift yazım değil, dağınık yapılandırma riski olur.

**Okuyan:** Admin Loglar, dashboard sohbet metrikleri.

---

## Dashboard raporu (`getDashboardReports`)

`admin.service.js` şunları okur:

- `chat_observations` — hacim, fallback, sık sorular.
- `actions` — tıklama / dönüşüm (tablo yoksa veya hata olursa bu blok sessizce boş kalır).
- `survey_submissions` — `getSurveyReport` ile memnuniyet özetleri.

Yani **genel değerlendirme** ekranı = bu üç kaynağın birleşimi; anket özeti doğrudan `survey_submissions` ile güncel kalır.

---

## İyileştirme önerileri (isteğe bağlı)

1. **Tablo adlarını tek dosyada toplamak** — `database-tables.js` gibi bir modülde sabitler; yazım hatası ve sözlük dağılmasını azaltır.
2. **`actions` tablosu** — Şema yoksa dashboard dönüşümü “0 / boş” görünür; bu beklenen davranıştır, Supabase’te tabloyu oluşturmadan metrik dolmaz.
3. **Harici entegrasyon** — Raporlama için genelde **read-only rol + view** (ör. `v_survey_summary`) yeterli; tabloları kopyalamaya gerek yok.

Bu dosya, veri karmaşasını önlemek için **tek referans** olarak tutulmalı; yeni tablo eklendiğinde burası güncellenir.
