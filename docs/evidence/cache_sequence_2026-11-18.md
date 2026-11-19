# Evidencia 04 — Secuencia de caché Redis (2026-11-18)

- **Atributo:** caché de búsqueda versionada e invalidación tras sincronización.
- **Herramienta:** `curl`, `docker compose exec redis redis-cli`.
- **Procedimiento:** se eliminó solo la clave de caché (no datos), se listó dos veces, se ejecutó un `POST /offers/sync` idempotente y se listó dos veces más.
- **Comando reproducible:**
  ```bash
  V=$(docker compose exec -T redis redis-cli GET offers:search:version | tr -d '\r')
  docker compose exec -T redis redis-cli DEL "offers:search:v$V:all" >/dev/null
  curl -s http://localhost:3000/api/v1/offers | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["cache"],d["key"],d["count"])'
  curl -s http://localhost:3000/api/v1/offers | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["cache"],d["key"],d["count"])'
  # POST /offers/sync con JWT (ver 01_security_2026-11-18.md)
  curl -s http://localhost:3000/api/v1/offers | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["cache"],d["key"],d["count"])'
  ```
- **Resultado observado:** `miss v9 (count=5)` → `hit v9 (count=5)` → sync HTTP 201 → versión `9 → 10` → `miss v10 (count=5)` → `hit v10 (count=5)`.
- **Estado:** PASS (secuencia `miss`, `hit`, invalidación, `miss`, `hit` observada en esta sesión).
- **Evidencia:** este archivo. El archivo previo `offers_miss_1.json` está mal nombrado: su contenido real es `cache:"hit"`, `key:"offers:search:v1:all"`, `count:0`; se conserva pero se aclara aquí.
