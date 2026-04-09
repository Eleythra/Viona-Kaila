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
  "language": "tr|en|de|ru"
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
