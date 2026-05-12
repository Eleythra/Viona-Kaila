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

### Misafir kapısı (public)

İstemci `fetch(..., { credentials: "include" })` kullanmalıdır (çerez).

- **`GET /api/public/guest-gate/status`** — `{ required, strict, dualPassword, identityRequired, identityRequiresBirthDate, identityRequiresFullName, pmsIdentity }`. Kimlik alanları ve `pmsIdentity` uyumluluk için `false` döner. `required`: iki kapı şifresi env’de tanımlı ve kapı devre dışı değilse `true`. `dualPassword`: `VIONA_GATE_PASSWORD_1` + `VIONA_GATE_PASSWORD_2` (veya `VIONA_UI_GATE_PASSWORD` + `VIONA_UI_GATE_PASSWORD_2`) ikisi de doluysa `true` (istemci tek alanda girer; sunucu iki değerden **biriyle** OR eşler).
- **`POST /api/public/guest-gate/verify`** — Gövde: `password` (veya `password1` / `password_primary`). KVKK onayı istemcidedir; sunucu `privacy` beklemez. Girilen değer, env’deki iki gizli değerden **biriyle** eşleşmelidir (OR; büyük/küçük harf duyarsız). Başarılı girişte isteğe bağlı audit: yalnızca `VIONA_GUEST_GATE_AUDIT_LOG=1` iken `guest_gate_entries` + structured log (`Misafir` / `gate`); varsayılan kapalı. Başarı: HttpOnly `viona_guest_verified` (`room` iç kullanım `"gate"`), `200` `{ ok: true, verification: "password_dual" }`. Hatalar: `400` `password_required`, `401` `invalid_password`. Kapı kapalıysa: `200` `{ ok: true }`.
- **`POST /api/public/guest-gate/logout`** — `{ ok: true }`; çerezi siler.

**Web sohbet:** `guestGateDualPasswordConfigured` iken (bkz. `/api/health`; iki env değeri dolu demektir) tarayıcıda geçerli doğrulama çerezi yoksa web kanalı `POST /api/chat` reddedilir; aksi halde istek Python asistana proxylanır.

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

`whatsappOperational` içinde `cloudRecipientCounts`, `panelUrlButtons` (`hk` / `tech` / `front` boolean) yer alır (gizli anahtar sızdırmaz). Misafir kapısı için ayrıca `guestGateDualPasswordConfigured`, `guestUiGateRequired`, `guestUiGateStrict` döner (değer sızmaz).

---

## Public write endpoints

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

Yeni satırlar yalnızca ortamda `VIONA_GUEST_GATE_AUDIT_LOG=1` iken yazılır (varsayılan kapalı).

Tüm uçlar diğer admin API’leri gibi **admin bearer token** gerektirir (`Authorization` veya panelin kullandığı başlık).

- **`GET /api/admin/guest-gate-entries`** — Sayfalı liste. Query: `page`, `pageSize`, `from`, `to` (`created_at`), `verification_method` (`password_dual` \| `deploy_bypass` \| `elektra`), `room_number` (tam eşleşme), `search` (ad veya oda için `ilike`). Yanıt: `{ ok, items, pagination }`.
- **`GET /api/admin/guest-gate-entries/summary`** — Aynı filtrelerle özet: toplam ve yöntem bazlı sayılar (`passwordDualCount`, `deployBypassCount`, `elektraCount`).
- **`GET /api/admin/guest-gate-entries/export.csv`** — Filtrelerle uyumlu CSV indirimi (`Content-Disposition`).
- **`DELETE /api/admin/guest-gate-entries/:id`** — Tek kayıt silme (UUID); yanıt `{ ok: true, id }`.
