#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api/v1}"
DEMO_EMAIL="${DEMO_EMAIL:-productor@campora.demo}"
: "${DEMO_PASSWORD:?DEMO_PASSWORD debe exportarse (secreto de CI, nunca en el repositorio)}"

python3 - <<'PY' > /dev/null
import urllib.request, time, sys
url = "http://localhost:3000/api/v1/offers"
for _ in range(60):
    try:
        urllib.request.urlopen(url, timeout=2).read()
        sys.exit(0)
    except Exception:
        time.sleep(2)
sys.exit("API no disponible tras 120s")
PY

TOKEN=$(curl -fsS -X POST "$API_URL/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["accessToken"])')

CID=$(python3 -c 'import uuid; print(uuid.uuid4())')
BODY=$(python3 -c 'import json,sys; print(json.dumps({"clientOfferId":sys.argv[1],"productName":"Mango Tommy","category":"Fruta","quantity":120,"unit":"kg","pricePerUnit":3500,"currency":"COP","municipality":"Espinal, Tolima","description":"PRUEBA-CI-IDEMPOTENCIA"}))' "$CID")

status() { curl -s -o "$1" -w '%{http_code}' -X POST "$API_URL/offers/sync" -H 'Content-Type: application/json' "${@:2}" -d "$BODY"; }

S1=$(status /tmp/campora_no_token.json)
S2=$(status /tmp/campora_bad_token.json -H 'Authorization: Bearer invalid.token.value')
S3=$(status /tmp/campora_valid.json -H "Authorization: Bearer $TOKEN")
ID1=$(python3 -c 'import json;print(json.load(open("/tmp/campora_valid.json"))["offer"]["id"])')
S4=$(status /tmp/campora_retry.json -H "Authorization: Bearer $TOKEN")
ID2=$(python3 -c 'import json;print(json.load(open("/tmp/campora_retry.json"))["offer"]["id"])')
COUNT=$(docker compose exec -T postgres psql -U campora -d campora -Atc \
  "SELECT count(*) FROM \"Offer\" WHERE \"clientOfferId\"='$CID';" | tr -d '\r')
LIST=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/offers")

python3 - "$S1" "$S2" "$S3" "$S4" "$ID1" "$ID2" "$COUNT" "$LIST" <<'PY'
import sys
s1,s2,s3,s4,id1,id2,count,list_code = sys.argv[1:]
checks = {
  "sin JWT devuelve 401": s1 == "401",
  "JWT invalido devuelve 401": s2 == "401",
  "JWT productor valido permite sync": s3 == "201",
  "retry con mismo clientOfferId": s4 == "201",
  "misma fila en ambas respuestas": id1 == id2 != "",
  "una sola fila en PostgreSQL": count.strip() == "1",
  "GET /offers responde 200": list_code == "200",
}
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + " " + name)
sys.exit(0 if all(checks.values()) else 1)
PY
