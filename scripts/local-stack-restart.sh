#!/usr/bin/env bash
# Lokal Viona: 8010 (asistan) + 3001 (Node) + 8080 (ön yüz/admin).
# Kullanım: ./scripts/local-stack-restart.sh stop | start
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

stop_all() {
  for p in 3001 8010 8080; do
    fuser -k "${p}/tcp" 2>/dev/null || true
  done
  pkill -9 -f 'session-viona-operational' 2>/dev/null || true
  echo "Durduruldu: 3001, 8010, 8080 + WhatsApp session Chromium (varsa)."
}

start_all() {
  echo "1) Asistan 8010..."
  cd "$ROOT"
  .venv-assistant/bin/python -m uvicorn assistant.main:app --app-dir server/src --host 127.0.0.1 --port 8010 &
  sleep 2
  echo "2) Node 3001..."
  cd "$ROOT/server"
  node src/index.js &
  sleep 3
  echo "3) Ön yüz 8080..."
  cd "$ROOT"
  python3 -m http.server 8080 --bind 127.0.0.1 &
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
