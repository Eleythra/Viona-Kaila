#!/usr/bin/env bash
# WhatsApp grup botu Puppeteer profili (session-viona-operational) için açık kalan Chrome süreçlerini kapatır.
# Sonra API’yi tek kez yeniden başlatın: node src/index.js
set -euo pipefail
PAT="${WHATSAPP_GROUP_CLIENT_ID:-viona-operational}"
if pgrep -af "session-${PAT}" >/dev/null 2>&1; then
  pkill -f "session-${PAT}" || true
  echo "Kapatıldı (session-${PAT} içeren Chromium). Şimdi Node API’yi yeniden başlatın."
else
  echo "Eşleşen Chromium süreci yok (session-${PAT})."
fi
