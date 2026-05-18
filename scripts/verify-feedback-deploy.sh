#!/usr/bin/env bash
# Canlı geri bildirim URL doğrulama (Vercel deploy sonrası).
set -euo pipefail
ORIGIN="${1:-https://viona.eleythra.com}"
fail=0
check() {
  local url="$1" expect="$2"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$url")
  if [[ "$code" == "$expect" ]]; then
    echo "OK $code $url"
  else
    echo "FAIL expected=$expect got=$code $url"
    fail=1
  fi
}
check "$ORIGIN/feedback/" 200
check "$ORIGIN/feedback" 200
check "$ORIGIN/feedback/fb_test" 200
api=$(curl -sS "$ORIGIN/api/public/feedback/fb_gecersiz")
if echo "$api" | grep -q '"error":"not_found"'; then
  echo "OK API feature up: $api"
else
  echo "FAIL API: $api"
  fail=1
fi
health=$(curl -sS "$ORIGIN/api/health")
if echo "$health" | grep -q '"featureEnabled":true'; then
  echo "OK Render guestFeedback.featureEnabled=true"
else
  echo "WARN guestFeedback not enabled in /api/health"
fi
exit "$fail"
