# ElektraWeb Hotspot API — Postman ile doğrulama

Resmi koleksiyon: [ElektraWeb — Hotspot API (Postman)](https://www.postman.com/elektrawebinc/elektraweb/collection/w5r4vz9/hotspot-api?sideView=agentMode)

Sayfa tarayıcıda (SPA) açılır; istek ayrıntılarını Postman masaüstü veya web ile inceleyin.

## Kontrol listesi (Viona `.env` ile eşleştirme)

1. **Tam URL** — Host (ör. `https://….hoteladvisor.net`) → `ELEKTRA_BASE_URL` (sonunda `/` olmadan).  
   Path (ör. `/apisequence/GetHotspotList`) → gerekirse `ELEKTRA_HOTSPOT_PATH` (varsayılan aynıdır).

2. **HOTELID** — Query parametresi → `ELEKTRA_HOTEL_ID`.

3. **Kimlik bilgisi** — Postman’da gösterilen tam değer (çoğu senaryoda `hotspot#otelId$secret`) → `ELEKTRA_TOKEN`.  
   Yalnızca `$` sonrası secret verildiyse, `ELEKTRA_HOTEL_ID` ile birleştirilir.

4. **Authorization** — Postman **Authorization** sekmesinde:
   - **Bearer Token** ve tek alan doluysa → `ELEKTRA_AUTH_MODE=bearer` (varsayılan).
   - Değer doğrudan header’a yapıştırılıyorsa (önek yok) → `ELEKTRA_AUTH_MODE=raw`.
   - Özel header adı varsa → `ELEKTRA_AUTH_HEADER` (varsayılan `Authorization`).

5. **Login token (query)** — API yanıtı “login token” istiyorsa ve token query’de ise:
   - Parametre adı (ör. `LoginToken`, `Token`) → `ELEKTRA_AUTH_QUERY_KEY`
   - Yalnızca query kullanılıyorsa → `ELEKTRA_AUTH_MODE=query` (header gönderilmez).

6. **Send** ile **200** ve JSON gövde doğrulayın; ardından sunucuda `GUEST_PMS_VERIFY_ENABLED=1` ile uçtan uca test edin.

## Sorun giderme

| Belirti | Olası neden |
|--------|-------------|
| HTTP 401 | Yanlış `ELEKTRA_AUTH_MODE` / eksik query token / yanlış base URL veya süresi dolmuş anahtar |
| Boş veya parse edilemeyen liste | Yanıt JSON yapısı; Elektra alan adları farklıysa kodda `normalizeHotspotRow` genişletilmeli |
| Çok yavaş yanıt | `ELEKTRA_FETCH_TIMEOUT_MS`, ağ / DNS (`DNS_SERVERS`) |

## Kod referansı

- İstek: [`server/src/modules/pms/elektra/elektra-hotspot.provider.js`](../src/modules/pms/elektra/elektra-hotspot.provider.js)
- Ortam: [`server/src/config/env.js`](../src/config/env.js)
