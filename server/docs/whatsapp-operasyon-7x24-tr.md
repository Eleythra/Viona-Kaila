# WhatsApp operasyon

Operasyon bildirimleri **WhatsApp Cloud API** (Meta Graph şablonları) ile gider; grup botu / whatsapp-web.js kaldırılmıştır.

Kurulum ve ortam değişkenleri: `server/.env.example` ve `deploy-and-operations-report.md` (bölüm 4a).

Sunucunun sürekli çalışması için PM2 veya systemd ile `node src/index.js` kullanımı aynı şekilde geçerlidir; izleme için `GET /api/health` → `whatsappOperational.cloudApiSendReady`.
