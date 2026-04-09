#!/usr/bin/env bash
# Yerel Viona: portlar + API health. Kod değiştirmeden sorun ayıklamak için çalıştırın:
#   ./scripts/local-dev-check.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Viona yerel kontrol ($(date -Iseconds)) ==="
echo ""

for port in 3001 8010 8080; do
  if ss -tln 2>/dev/null | grep -q ":${port} "; then
    echo "[OK] Port ${port} dinleniyor"
    ss -tlnp 2>/dev/null | grep ":${port} " || true
  else
    echo "[EKSİK] Port ${port} boş — ilgili servis çalışmıyor"
  fi
  echo ""
done

echo "=== Node API /api/health (127.0.0.1:3001) ==="
if curl -sS --connect-timeout 3 -f "http://127.0.0.1:3001/api/health" 2>/dev/null | head -c 600; then
  echo ""
  echo ""
  echo "[OK] API yanıt veriyor."
else
  echo ""
  echo "[HATA] Health yanıt yok veya bağlantı kurulamadı."
  echo "  - ./scripts/local-stack-restart.sh start dene"
  echo "  - 3001 kilitliyse: sudo fuser -k 3001/tcp"
  echo "  - Sonra: cd ${ROOT}/server && node src/index.js"
fi

echo ""
echo "=== Yerel mimari (özet) ==="
echo "  Ön yüz + admin : http://127.0.0.1:8080/  ve  /admin/"
echo "  API (Node)     : http://127.0.0.1:3001/api  — tarayıcı buraya gider (localhost’ta /api değil)"
echo "  Asistan (Py)   : http://127.0.0.1:8010/docs — chat Node üzerinden proxy"
echo "  Render         : Sadece canlı deploy; yerelde şart değil"
echo ""
