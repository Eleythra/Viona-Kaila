# API Contracts

## WhatsApp operasyon yönlendirmesi (Cloud API)

Kayıt `createGuestRequest` ile Supabase’e yazıldıktan sonra aynı `type` ile `sendOperationalWhatsappNotification` tetiklenir. Alıcı listeleri yalnızca `server/.env` (Render ortam değişkenleri):

| `type` | Şablon (gövde parametre sayısı) | `.env` alıcı listesi |
|--------|----------------------------------|----------------------|
| `fault` | Arıza (8) | `WHATSAPP_TECH_RECIPIENTS` |
| `request` | İstek (8) | `WHATSAPP_HK_RECIPIENTS` |
| `complaint` | Şikayet (6) | `WHATSAPP_FRONT_RECIPIENTS` |
| `guest_notification` | Misafir bildirimi (7) | `WHATSAPP_FRONT_RECIPIENTS` |
| `late_checkout` | Geç çıkış (7, misafir şablonu ile aynı aile) | `WHATSAPP_FRONT_RECIPIENTS` |

Web formları (`js/render-requests-module.js` vb.) ve sohbetten gelen `create_guest_request` eylemi aynı Node API’yi kullanır; Render’da `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` ve yukarıdaki listeler dolu olmalı.

### PMS misafir doğrulama (ElektraWeb Hotspot)

`GUEST_PMS_VERIFY_ENABLED=1` ve `ELEKTRA_BASE_URL`, `ELEKTRA_HOTEL_ID`, `ELEKTRA_TOKEN` doluysa, `request` / `complaint` / `fault` / `guest_notification` için **Supabase insert öncesi** `GetHotspotList` ile doğrulama yapılır.

- **`GUEST_PMS_GATE_VERIFY_ENABLED=1`** (ve Elektra tam): misafir tarayıcısında HttpOnly `viona_guest_verified` çerezi (imzalı oda) set edilir; formlar ve web kanalı sohbet bu çerezdeki oda ile gövde `room` eşleşmesini ister — **Hotspot tekrar çağrılmaz**. Çerez yoksa `401` / `guest_session_required`.
- **Kapalı** (yalnızca insert doğrulama): `ROOMNO` + **soyad (`LNAME`)** (+ konaklama tarihleri) ile eşleme (tam ad ile belirsizlik daraltma).

Postman’daki istekle hizalamak için isteğe bağlı: `ELEKTRA_HOTSPOT_PATH`, `ELEKTRA_AUTH_MODE` (`bearer`, `raw`, `query`, `none`), `ELEKTRA_AUTH_HEADER`, `ELEKTRA_AUTH_QUERY_KEY`. Ayrıntı: `server/docs/elektra-hotspot-postman.md`, özet: `server/docs/elektra-hotspot-gethotspotlist.md`.

- **POST `/api/guest-requests`:** Başarısız doğrulamada `422` (veya `503` PMS erişilemez, `429` çok deneme, `401` oturum); gövde `{ ok: false, error: "<TR mesaj>", reason: "<kod>" }`.
- **reason:** `room_not_found` | `invalid_room` | `surname_mismatch` | `birthdate_mismatch` | `invalid_birthdate` | `stay_not_active` | `ambiguous_guest` | `pms_unavailable` | `too_many_verification_attempts` | `guest_session_required` | `guest_session_room_mismatch`
- **Sohbet (web):** `GUEST_PMS_GATE_VERIFY_ENABLED=1` iken çerez yoksa `403`; aksi halde proxy.
- **`/api/health`:** `elektraGateVerifyActive`, `guestGateRoomAllowlistActive` (kapı oda allowlist dolu mu), `elektraInsertVerifyActive` — env tam ve ilgili bayrak açık mı (değer sızmaz).

### Misafir kapısı (public)

İstemci `fetch(..., { credentials: "include" })` kullanmalıdır (çerez).

- **`GET /api/public/guest-gate/status`** — `{ required, strict, identityRequired, identityRequiresBirthDate, identityRequiresFullName, pmsIdentity, deployBypass, roomAllowlistActive }`. Kapı kimliği Elektra **oda + doğum tarihi**; `roomAllowlistActive`: `GUEST_GATE_ROOM_ALLOWLIST` doluysa liste dışı odada Elektra çağrılmaz.
- **`POST /api/public/guest-gate/verify`** — Gövde: isteğe bağlı `password` (kapı şifresi açıksa), zorunlu `room`, `birthDate` (`YYYY-MM-DD`). Başarıda `viona_guest_verified` set edilir.
- **`POST /api/public/guest-gate/logout`** — `{ ok: true }`; çerezi siler.
- **`POST /api/public/guest-verify`** — Yalnızca **oda + doğum tarihi** (`{ room, birthDate }`); kapı şifresi yok. Aynı Elektra doğrulaması + başarıda aynı çerez. `503` `not_configured` (kapı/Elektra kapalı).

### Meta Cloud API — gönderim uç noktası

- **HTTP:** `POST https://graph.facebook.com/{WHATSAPP_GRAPH_API_VERSION|v21.0}/{WHATSAPP_PHONE_NUMBER_ID}/messages`
- **Kimlik:** `Authorization: Bearer` + `WHATSAPP_ACCESS_TOKEN` veya `WHATSAPP_CLOUD_ACCESS_TOKEN`
- **Gövde:** `type: "template"`, `template.name` türe göre (`WHATSAPP_TEMPLATE_*` ile override), `template.language.code` genelde `tr`
- **Alıcı:** Şablon mesajı her numaraya ayrı POST (grup sohbeti yok); numaralar `WHATSAPP_*_RECIPIENTS` içinde virgül/noktalı virgül/satır sonu ile

### «Panelde Aç» (Dynamic URL) butonu

Şablonda **Visit Website / Dynamic URL** tanımlıysa ve Base URL admin kökü (örn. `https://viona-admin.eleythra.com/admin/`) ise, sunucu isteğe bağlı olarak `components` içine URL butonu ekler (`index: "0"` — şablondaki ilk URL butonu ile uyumlu olmalı):

| Env (`=1` açık) | Dinamik suffix (Base’e eklenir) |
|------------------|----------------------------------|
| `WHATSAPP_HK_PANEL_URL_BUTTON` | `ops-hk.html?id=<uuid>` (istek) |
| `WHATSAPP_TECH_PANEL_URL_BUTTON` | `ops-tech.html?id=<uuid>` (arıza) |
| `WHATSAPP_FRONT_PANEL_URL_BUTTON` | `ops-front.html?type=` + (`complaint` / `guest_notification` / `late_checkout`) + `&id=<uuid>` |

Ekip sayfası (`ops-light.js`) bu sorguyu **yenilemede silmez**; aynı `?id=` / `?type=&id=` ile tek kayıt kartı açılmaya devam eder. Tam liste için adres çubuğundan ilgili sorgu parametrelerini kaldırıp sayfayı yenileyin.

Buton yoksa veya `=1` yapılmış ama şablonda uyumsuzluk varsa Meta hata döner; bu durumda env’yi `0`/boş bırakın.

### `/api/health` özeti

`whatsappOperational` içinde `cloudRecipientCounts`, `panelUrlButtons` (`hk` / `tech` / `front` boolean) ve kimlik yapılandırma bayrakları yer alır (gizli anahtar sızdırmaz).

---

## Public write endpoints

### `POST /api/public/guest-verify`

- Purpose: verify **room + date of birth** against Elektra Hotspot (same cached list as gate). No gate password.
- Body: `{ "room": "209", "birthDate": "2001-07-16" }` (aliases: `roomNumber`, `birth_date`).
- Success: `{ "ok": true }` and HttpOnly `viona_guest_verified` cookie (same as successful `POST /api/public/guest-gate/verify` with Elektra birth path).
- Errors: `400` `identity_required`, `503` `not_configured` (gate/Elektra off), otherwise same HTTP status and `{ ok: false, error, message }` as gate verify (`invalid_room` if `GUEST_GATE_ROOM_ALLOWLIST` set and room not listed — **no Hotspot request**; `invalid_birthdate` for bad format / future / >120y — **no Hotspot**; then `birthdate_mismatch`, `room_not_found`, `429`, etc.).
- Client: send `credentials: "include"` if the SPA needs the cookie for subsequent `POST /api/guest-requests` / chat.

### `POST /api/guest-requests`
- Purpose: write guest request forms to the correct bucket table.
- Body:
```json
{
  "type": "request | complaint | fault | reservation_alacarte | reservation_spa",
  "name": "Guest Name",
  "room": "1203",
  "nationality": "DE",
  "description": "free text (optional for request, required for others)",
  "category": "towel | bedding | room_cleaning | minibar | baby_equipment | room_equipment | other",
  "details": {
    "itemType": "bath_towel",
    "quantity": 2
  },
  "categories": ["extraTowels", "other"],
  "otherCategoryNote": "optional",
  "reservation": {
    "restaurantId": "mare",
    "reservationDate": "2026-03-21",
    "time": "20:15",
    "stayCheckIn": "2026-03-18",
    "stayCheckOut": "2026-03-25",
    "nights": 7,
    "stayPromoApplies": true
  }
}
```
- Response (201):
```json
{ "ok": true, "id": "uuid", "bucket": "request|complaint|fault|reservation" }
```

### `POST /api/surveys`
- Purpose: write survey submissions.
- Body:
```json
{
  "submittedAt": "2026-03-24T09:00:00.000Z",
  "overallScore": 4.2,
  "hotelCategories": { "food": 4.0, "comfort": 4.5 },
  "hotelAnswers": { "food_taste": 4 },
  "hotelComment": "optional",
  "vionaRating": 5,
  "vionaAnswers": { "viona_overall": 5 },
  "vionaComment": "optional",
  "deviceType": "mobile|web",
  "language": "tr|en|de|pl"
}
```
- Response (201):
```json
{ "ok": true, "id": "uuid" }
```

## Admin endpoints

### `GET /api/admin/requests`
- Query:
  - `type` (required): `request | complaint | fault | reservation`
  - `page` (default `1`)
  - `pageSize` (default `20`, max `100`)
  - `status` (optional)
  - `from` (optional ISO date/time)
  - `to` (optional ISO date/time)
- Response:
```json
{
  "ok": true,
  "type": "request",
  "items": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 }
}
```

### `GET /api/admin/surveys`
- Query:
  - `page`, `pageSize`, `language`, `from`, `to`
- Response:
```json
{
  "ok": true,
  "items": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 }
}
```

### `GET /api/admin/surveys/report`
- Query:
  - `from` (optional)
  - `to` (optional)
- Response:
```json
{
  "ok": true,
  "report": {
    "totals": { "submissions": 12, "avgOverall": 4.36, "avgViona": 4.17 },
    "byLanguage": { "tr": 7, "en": 3, "de": 2 },
    "byDeviceType": { "mobile": 9, "web": 3 }
  }
}
```

### Misafir kapısı girişleri (`guest_gate_entries`)

Tüm uçlar diğer admin API’leri gibi **admin bearer token** gerektirir (`Authorization` veya panelin kullandığı başlık).

- **`GET /api/admin/guest-gate-entries`** — Sayfalı liste. Query: `page`, `pageSize`, `from`, `to` (`created_at`), `verification_method` (`deploy_bypass` \| `elektra`), `room_number` (tam eşleşme), `search` (ad veya oda için `ilike`). Yanıt: `{ ok, items, pagination }`.
- **`GET /api/admin/guest-gate-entries/summary`** — Aynı filtrelerle özet: toplam ve yöntem bazlı sayılar (`deployBypassCount`, `elektraCount`).
- **`GET /api/admin/guest-gate-entries/export.csv`** — Filtrelerle uyumlu CSV indirimi (`Content-Disposition`).
- **`DELETE /api/admin/guest-gate-entries/:id`** — Tek kayıt silme (UUID); yanıt `{ ok: true, id }`.
