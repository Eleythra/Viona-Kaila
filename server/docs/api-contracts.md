# API Contracts

## WhatsApp operasyon yönlendirmesi (Cloud API)

Kayıt `createGuestRequest` ile Supabase’e yazıldıktan sonra aynı `type` ile `sendOperationalWhatsappNotification` tetiklenir. Alıcı listeleri yalnızca `server/.env` (Render ortam değişkenleri):

| `type` | Şablon (gövde parametre sayısı) | `.env` alıcı listesi |
|--------|----------------------------------|----------------------|
| `fault` | Arıza (7; adet yok — `WHATSAPP_CLOUD_FAULT_PARAM_COUNT=8` ile eski 8) | `WHATSAPP_TECH_RECIPIENTS` |
| `request` | İstek (8) | `WHATSAPP_HK_RECIPIENTS` |
| `complaint` | Şikayet (6) | `WHATSAPP_FRONT_RECIPIENTS` |
| `guest_notification` | Misafir bildirimi (7) | `WHATSAPP_FRONT_RECIPIENTS` |
| `late_checkout` | Geç çıkış (7, misafir şablonu ile aynı aile) | `WHATSAPP_FRONT_RECIPIENTS` |

Web formları (`js/render-requests-module.js` vb.) ve sohbetten gelen `create_guest_request` eylemi aynı Node API’yi kullanır; Render’da `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` ve yukarıdaki listeler dolu olmalı.

### Misafir kapısı (public)

İstemci `fetch(..., { credentials: "include" })` kullanmalıdır (çerez).

- **`GET /api/public/guest-gate/status`** — `{ required, strict, dualPassword, identityRequired, identityRequiresBirthDate, identityRequiresFullName, pmsIdentity }`; operatör bypass açıkken isteğe bağlı `extraValidRoomNumbers` (tarayıcıda geçerli oda kümesine eklenir). `required`: `HOTEL_ADVISOR_BASE_URL` + `HOTEL_ADVISOR_HOTEL_ID` + `HOTEL_ADVISOR_TOKEN` dolu ve `VIONA_UI_GATE_ENABLED` kapalı değilse `true`. `pmsIdentity`: HotelAdvisor env tamamsa `true`. `dualPassword`: uyumluluk için `false` (çift şifre kapısı kaldırıldı). `identityRequiresBirthDate`: `pmsIdentity` ile aynı mantık.
- **`POST /api/public/guest-gate/verify`** — Kapı açıksa gövde: `roomNo` (veya `room`) ve `birthDate` (`YYYY-MM-DD`). KVKK onayı istemcidedir. Varsayılan: HotelAdvisor misafir listesi ile eşleştirir. Başarı: HttpOnly `viona_guest_verified`, `200` `{ ok: true, verification: "hotel_advisor", guest: { guestName, roomNo, resId, resNameId, guestPhone|null, guestEmail|null } }` (Hotspot’ta alan yoksa `null`). **Operatör bypass** (yalnızca test): `VIONA_OPERATOR_GATE_BYPASS=1` ve env’de tanımlı oda+doğum eşleşirse PMS atlanır, `verification: "operator_bypass"`, `guest.resId` / `resNameId` `null`, `guestPhone` / `guestEmail` `null`. `guest_gate_entries`: `hotel_advisor` ve `operator_bypass` Supabase yapılandırıysa **her zaman** insert; CHECK güncellemesi: `server/docs/migrations/guest-gate-entries-operator-bypass.sql`. Diğer yöntemler: `VIONA_GUEST_GATE_AUDIT_LOG=1`. Hatalar: `400` `identity_required`, `401` `invalid_identity`, `503` `hotel_advisor_not_configured`, `500` `verification_failed`. Kapı kapalıysa: `200` `{ ok: true }`.
- **`POST /api/public/guest-gate/logout`** — `{ ok: true }`; çerezi siler.

**Web sohbet:** `guestUiGateRequired` iken (HotelAdvisor env tam; bkz. `/api/health`) tarayıcıda geçerli doğrulama çerezi yoksa web kanalı `POST /api/chat` reddedilir; aksi halde istek Python asistana proxylanır. Web kanalında geçerli misafir çerezi varsa Node, upstream gövdeye `verified_guest_room` ekler; istemci isteğe bağlı `guest_full_name`, `guest_phone`, `guest_email` gönderebilir (PMS kapısı sonrası `vionaGuestProfile`) — Python şemada tanımlıdır; ad soyad sohbet formunda ad/oda adımlarını atlamak için kullanılır.

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

`whatsappOperational` içinde `cloudRecipientCounts`, `panelUrlButtons` (`hk` / `tech` / `front` boolean) yer alır (gizli anahtar sızdırmaz). Misafir kapısı için ayrıca `guestGateDualPasswordConfigured`, `hotelAdvisorConfigured`, `guestUiGateRequired`, `guestUiGateStrict` döner (değer sızmaz).

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
- **`type: "fault"`** — `category` granular teknik id (`ft_ac_not_cooling`, … `ft_other`) veya eski kaba değer (`hvac`, …); `details.location` / `details.urgency` / üst düzey `location` / `urgency` yok sayılır (NULL). `ft_other` ve `other` için `description` zorunlu.

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

Supabase yapılandırıysa `hotel_advisor` ve `operator_bypass` başarılı doğrulamaları **her zaman** bu tabloya yazılır (denetim). Diğer yöntemler (`password_dual`, `deploy_bypass`, `elektra`) yalnızca `VIONA_GUEST_GATE_AUDIT_LOG=1` iken eklenir (varsayılan kapalı).

Tüm uçlar diğer admin API’leri gibi **admin bearer token** gerektirir (`Authorization` veya panelin kullandığı başlık).

- **`GET /api/admin/guest-gate-entries`** — Sayfalı liste. Query: `page`, `pageSize`, `from`, `to` (`created_at`), `verification_method` (`hotel_advisor` \| `operator_bypass` \| `password_dual` \| `deploy_bypass` \| `elektra`), `room_number` (tam eşleşme), `search` (ad veya oda için `ilike`). Yanıt: `{ ok, items, pagination }`.
- **`GET /api/admin/guest-gate-entries/summary`** — Aynı filtrelerle özet: toplam ve yöntem bazlı sayılar (`hotelAdvisorCount`, `operatorBypassCount`, `passwordDualCount`, `deployBypassCount`, `elektraCount`).
- **`GET /api/admin/guest-gate-entries/export.csv`** — Filtrelerle uyumlu CSV indirimi (`Content-Disposition`).
- **`DELETE /api/admin/guest-gate-entries/:id`** — Tek kayıt silme (UUID); yanıt `{ ok: true, id }`.

### Misafir geri bildirimi (public token + admin davet)

**Admin (Bearer):**

- **`POST /api/admin/requests/:type/:id/feedback-invite`** — `type` yalnız `request` \| `fault`. Kayıt durumu `done` olmalı; aynı satırda `feedback_status=pending` iken `409` (`feedback_invite_already_pending`). Misafir telefonu `guest_phone` veya Hotspot eşlemesi ile çözülür; yoksa `400` (`feedback_guest_phone_missing`). `VIONA_GUEST_FEEDBACK_ENABLED=false` (veya `0`/`off`) iken `503` (`feedback_feature_disabled`). `VIONA_FEEDBACK_PUBLIC_ORIGIN` boşsa `503` (`feedback_public_origin_not_configured`). `WHATSAPP_TEST_MODE=true` iken `WHATSAPP_TEST_PHONE` geçersiz/boşsa `503` (`feedback_test_phone_not_configured`). Başarıda `{ ok, feedbackUrl, testMode, item }`.

**Public (auth yok; CORS: izinli misafir site kökenleri + rate limit):**

- **`GET /api/public/feedback/:token`** — Token `fb_` ile başlar. `VIONA_GUEST_FEEDBACK_ENABLED` kapalıysa `503` (`feedback_feature_disabled`). `feedback_status=pending` iken `{ ok, guestName, roomNumber, bucket }`. Kullanılmış / geçersiz: `410` / `404`.
- **`POST /api/public/feedback/:token/submit`** — Kapalı özellikte `503` (`feedback_feature_disabled`). JSON gövde:
  - `solved`: `"yes"` \| `"no"` (zorunlu)
  - Evet: `speedRating`, `staffRating`, `solutionRating` (1–5), `revisitPreference` (`yes` \| `unsure` \| `no`), isteğe bağlı `feedbackNote`
  - Hayır: `reopenNote` (zorunlu, kısa); sunucu kaydı `status=reopened` yapar ve operasyon WhatsApp’ı yeniden dener.

**Ortam:** `VIONA_GUEST_FEEDBACK_ENABLED` (`true`/`1`/`on` = açık; `false`/`0`/`off` = kapalı — origin dolu olsa bile; boş = `VIONA_FEEDBACK_PUBLIC_ORIGIN` tanımlıysa açık kabul edilir), `VIONA_FEEDBACK_PUBLIC_ORIGIN` (public sayfa kökü), `WHATSAPP_FEEDBACK_TEMPLATE_NAME` (varsayılan `viona_feedback_completed`), `WHATSAPP_FEEDBACK_URL_BUTTON_MODE` (`token` \| `full`), `WHATSAPP_TEST_MODE` + `WHATSAPP_TEST_PHONE` (E.164 rakamları; test modu açıkken telefon **zorunlu**, yoksa davet `503` `feedback_test_phone_not_configured`). **Meta şablondaki parametre sırası ile kod içindeki `components` birebir eşleşmeli** — aksi halde gönderim reddedilir.

**Meta URL düğmesi:** `token` modunda şablonda **Dynamic URL** seçilir; Website URL sabit olarak `VIONA_FEEDBACK_PUBLIC_ORIGIN` ile birleşen `/feedback/` yolu (sonunda slash) yazılır ve API butona yalnızca `fb_…` son ekini gönderir. `full` modunda API tam `https://…/feedback/fb_…` adresini üretir; şablondaki URL alanı buna göre tam URL kabul etmelidir.

**CORS:** Statik geri bildirim sayfasının kökeni (`Origin`), misafir siteniz için allowlist’te olmalı (`CORS_ALLOWED_ORIGINS` veya `server/src/lib/public-site-origins.js` içi sabitler); aksi halde tarayıcıdan `POST /submit` `403 cors_not_allowed` ile düşer.

Statik sayfa: kök `feedback.html` (`/feedback/<token>` için nginx / hosting kuralı gerekir).
