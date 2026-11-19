# Evidencia 02 — Integridad e idempotencia (2026-11-18)

- **Atributo:** Integridad e idempotencia de sincronización offline.
- **Herramientas:** `curl`, `python3` (generación de UUID y depuración), `docker compose exec postgres psql`.
- **Procedimiento:** se generó un `clientOfferId` nuevo, se envió dos veces el mismo cuerpo autenticado a `POST /api/v1/offers/sync` y se consultó PostgreSQL en solo lectura.
- **Dato de prueba:** oferta `Mango Tommy`, `description = PRUEBA-IDEMPOTENCIA-2026-11-18`, `clientOfferId = c9677c97-fb1d-43cb-bca3-9a527c44e3ee` (nuevo en esta sesión).
- **Comando reproducible (secretos omitidos):**
  ```bash
  API=http://localhost:3000/api/v1
  TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d '{"email":"productor@campora.demo","password":"<DEMO_PASSWORD>"}' \
    | python3 -c 'import json,sys;print(json.load(sys.stdin)["accessToken"])')
  CID=$(python3 -c 'import uuid;print(uuid.uuid4())')
  BODY=$(python3 -c 'import json,sys;print(json.dumps({"clientOfferId":sys.argv[1],"productName":"Mango Tommy","category":"Fruta","quantity":120,"unit":"kg","pricePerUnit":3500,"currency":"COP","municipality":"Espinal, Tolima","description":"PRUEBA-IDEMPOTENCIA-2026-11-18"}))' "$CID")
  for N in 1 2; do
    curl -s -w '\nHTTP=%{http_code}\n' -X POST "$API/offers/sync" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d "$BODY"
  done
  docker compose exec -T postgres psql -U campora -d campora \
    -c "SELECT count(*) FROM \"Offer\" WHERE \"producerId\"='<PRODUCER_ID>' AND \"clientOfferId\"='$CID';"
  ```
- **Criterio de aceptación:** ambas respuestas devuelven el mismo `offer.id` y el mismo `clientOfferId`; la consulta de solo lectura devuelve exactamente `1` fila para ese productor y ese `clientOfferId`.
- **Resultado observado:**
  | Envío | HTTP | `offer.id` | `clientOfferId` | `synced` |
  | --- | --- | --- | --- | --- |
  | 1 | 201 | `665fb7bb-f484-4f4a-81fc-0665b5d7cab0` | `c9677c97-fb1d-43cb-bca3-9a527c44e3ee` | `true` |
  | 2 | 201 | `665fb7bb-f484-4f4a-81fc-0665b5d7cab0` | `c9677c97-fb1d-43cb-bca3-9a527c44e3ee` | `true` |
  | SQL `count(*)` | — | `1` | — | — |
- **Estado:** PASS.
- **Evidencia:** este archivo; `pg_count_2026-11-18.txt` (copia depurada del resultado). Los IDs son datos de prueba, no secretos.
