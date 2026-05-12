# ElektraWeb HotelAdvisor — `GetHotspotList` (Hotspot)

Kısa referans: misafir listesi PMS’ten **aktif konaklayan** kayıtlar için kullanılır. Kod: `server/src/modules/pms/elektra/elektra-hotspot.provider.js`.

## İstek

- **Method / path:** `GET {ELEKTRA_BASE_URL}{ELEKTRA_HOTSPOT_PATH}` — varsayılan path `/apisequence/GetHotspotList`.
- **Query:** `HOTELID` (zorunlu, Elektra otel kimliği).
- **Kimlik (Bearer):** `Authorization: Bearer hotspot#<HOTELID>$<token>` — `buildElektraBearerToken` ile üretilir. Token env’de yalnızca secret olarak da saklanabilir.

Örnek base host (bölgeye göre değişir): `https://4001.hoteladvisor.net`

## Başarılı yanıt şekli

Kök dizi veya nesne içinde:

- `STATUS: true`
- `MESSAGE` (ör. `"OK."`)
- `DATA`: misafir nesneleri dizisi

`parseHotspotListEnvelope` bu yapıyı doğrular; tam gövde loglanmaz.

## Alanlar (özet)

| Alan | Not |
|------|-----|
| `NAME`, `LNAME` | Ad / soyad (eski doğrulama soyad ile). |
| `ROOMNO` | Dokümanda integer; örneklerde string (`"209"`). Karşılaştırma normalize string ile. |
| `CHECKIN`, `CHECKOUT` | Tarih; aktif konak için otel günü aralığı (`hotel-date.js`). |
| `RESID`, `RESNAMEID`, `HOTELID`, `PAX` | Sayısal kimlikler. |
| `BIRTHDATE` | Dokümanda «integer» denmiş; örnek yanıtta ISO string (`2001-07-16T00:00:00`). Uygulama yalnızca **takvim günü `YYYY-MM-DD`** çıkarır. |
| `EMAIL`, `AGENCY`, … | İhtiyaç halinde. |

## Hassas alanlar (PII)

- **`NATIONALIDNO`**, **`PASSPORTNO`**: `normalizeHotspotRow` içine **map edilmez**; istemci yanıtlarına ve kalıcı loglara taşınmaz.

## İlgili uçlar ve env

- Smoke: `GET /api/internal/elektra-hotspot-smoke` (`CRON_SECRET` veya admin token). `?nocache=1` önbelleği temizler.
- İsteğe bağlı **`GUEST_GATE_ROOM_ALLOWLIST`**: doluysa kapı / `guest-verify` yalnız listedeki oda anahtarları için `GetHotspotList` çağırır; liste dışı oda için **Elektra isteği atılmaz** (`invalid_room`).
- Env: `ELEKTRA_BASE_URL`, `ELEKTRA_HOTEL_ID`, `ELEKTRA_TOKEN`, `ELEKTRA_HOTSPOT_PATH`, `ELEKTRA_AUTH_MODE`, `ELEKTRA_CACHE_TTL_MS`, timeout/retry — ayrıntı: `server/.env.example`, `elektra-hotspot-postman.md`.
