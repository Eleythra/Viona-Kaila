# WhatsApp grup botu — 7/24 operasyon

## Hedef

QR **bir kez** taranır; `server/runtime/whatsapp-session` altında oturum kalır. API süreci **tek kopya** olarak sürekli çalışır; çökünce yeniden kalkar.

## Donanım / ortam

- **Sürekli açık bir makine**: VPS veya otel içi mini PC (laptop uyku modunda kalmasın).
- **Kalıcı disk**: Session klasörü silinmesin; Render “ephemeral disk” tek başına uygun değil.
- **Ağ**: Sabit çıkış IP gerekmiyor; telefondaki WhatsApp hesabı ara sıra açık kalsın (bağlı cihaz politikası).

## Tek süreç kuralı

- Aynı anda **yalnızca bir** `node` + bir Chromium profili (`session-viona-operational`).
- İkinci terminalde `node src/index.js` açmayın → port / profil kilidi.

## PM2 ile çalıştırma (önerilen)

```bash
cd server
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 logs viona-node-api
```

Sunucu yeniden açılınca otomatik başlasın:

```bash
pm2 startup
pm2 save
```

Durdurma (Chromium düzgün kapanır):

```bash
pm2 stop viona-node-api
```

## Graceful shutdown

`SIGINT` / `SIGTERM` geldiğinde API önce HTTP’yi kapatır, ardından WhatsApp istemcisini `destroy` eder. Böylece yeniden başlatmada **“browser is already running”** riski azalır.

## İzleme

- `GET /api/health` → `whatsappGroupBot.ready` ve `whatsappOperational.groupRegistry`.
- İsteğe bağlı: Uptime Kuma / basit cron ile `curl -sf http://127.0.0.1:3001/api/health | jq .whatsappGroupBot.ready`.

## Numara / oturum sıfırlama

Yalnızca hat değişince:

```bash
npm run whatsapp:reset-session
```

Sonra tekrar tek QR.

## Üretim domain

Misafir sitesi bu API’ye vurmalı (`__VIONA_NODE_RENDER_API__` veya ters proxy). Sadece lokalde bot varken canlı site başka hosta gidiyorsa WhatsApp o isteklerde çalışmaz.
