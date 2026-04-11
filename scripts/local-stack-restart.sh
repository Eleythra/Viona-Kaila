#!/usr/bin/env bash
# Lokal Viona: 8010 (asistan) + 3001 (Node) + 8080 (ön yüz/admin).
# Kullanım: ./scripts/local-stack-restart.sh stop | start
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

stop_all() {
  for p in 3001 8010 8080; do
    fuser -k "${p}/tcp" 2>/dev/null || true
    sudo -n fuser -k "${p}/tcp" 2>/dev/null || true
  done
  # fuser yetkisiz kalırsa: dinleyen süreçleri kapat
  for p in 3001 8010 8080; do
    for pid in $(lsof -t -iTCP:"$p" -sTCP:LISTEN 2>/dev/null); do
      kill -9 "${pid}" 2>/dev/null || true
    done
  done
  echo "Durduruldu: 3001, 8010, 8080."
}

start_all() {
  if [[ -x "$ROOT/.venv-assistant/bin/python" ]]; then
    echo "1) Asistan 8010..."
    cd "$ROOT"
    .venv-assistant/bin/python -m uvicorn assistant.main:app --app-dir server/src --host 127.0.0.1 --port 8010 &
    sleep 2
  else
    echo "1) Asistan atlandı (yok: $ROOT/.venv-assistant) — sohbet için venv kurulumu gerekir."
  fi
  echo "2) Node API 3001..."
  cd "$ROOT/server"
  node src/index.js &
  sleep 2
  echo "3) Ön yüz + admin 8080 (repo kökü)..."
  cd "$ROOT"
  python3 -m http.server 8080 --bind 127.0.0.1 &
  echo ""
  sleep 1
  if curl -sf --connect-timeout 3 "http://127.0.0.1:3001/api/health" >/dev/null 2>&1; then
    echo "Node API (3001) health: OK"
  else
    echo "UYARI: 3001 üzerinde health yanıt yok veya yeni Node başlamadı."
    echo "  Eski süreç portu tutuyor olabilir. Çözüm (bir kez, kendi terminalinde):"
    echo "    sudo fuser -k 3001/tcp"
    echo "  Sonra: cd \"${ROOT}/server\" && node src/index.js"
    echo "  Teşhis: curl -s http://127.0.0.1:3001/api/health"
  fi
  echo ""
  echo "Arka planda başlatıldı. Kontrol:"
  echo "  curl -s http://127.0.0.1:3001/api/health | head -c 400"
  echo "  Tarayıcı: http://127.0.0.1:8080/  ve  http://127.0.0.1:8080/admin/"
}

case "${1:-}" in
  stop) stop_all ;;
  start) stop_all; sleep 1; start_all ;;
  *)
    echo "Kullanım: $0 stop | start"
    exit 1
    ;;
esac
