# Evidencia 03 — Desempeño (2026-11-18)

- **Atributo:** Desempeño de `GET /api/v1/offers`.
- **Herramienta:** `curl -w` (k6 no está disponible en el entorno: `command -v k6` → vacío; no se instaló nada).
- **Procedimiento / perfil de carga:** 30 solicitudes secuenciales, sin concurrencia, contra la API local ya caliente (caché Redis con `hit`), sobre Docker Compose en macOS. Se registró `http_code`, `time_total` y `size_download` por petición.
- **Comando reproducible:**
  ```bash
  API=http://localhost:3000/api/v1
  echo 'n,http,time_total_s,size_bytes' > perf_raw.csv
  for i in $(seq 1 30); do
    curl -s -o /dev/null -w "$i,%{http_code},%{time_total},%{size_download}\n" "$API/offers" >> perf_raw.csv
  done
  python3 - <<'PY'
  import csv,statistics
  rows=list(csv.DictReader(open('perf_raw.csv')))
  t=sorted(float(r['time_total_s']) for r in rows)
  p=lambda q: round(t[int((len(t)-1)*q)],4)
  print(len(rows), sorted({r['http'] for r in rows}), t[0], p(.5), p(.9), p(.95), t[-1], round(statistics.mean(t),4))
  PY
  ```
- **Criterio de aceptación:** no hay umbral acordado; se reporta como **línea base local**, no como aprobación de SLA. Criterio operativo observado: 30/30 respuestas HTTP 200, sin errores.
- **Resultado observado:** 30 solicitudes; códigos `{200}`; min `0.001794 s`; p50 `0.0027 s`; p90 `0.0044 s`; p95 `0.0049 s`; max `0.006168 s`; media `0.0030 s`; errores HTTP `0`. Tamaño de respuesta ~2231 bytes (5 ofertas).
- **Estado:** PASS como línea base (sin umbral).
- **Evidencia:** `perf_raw_2026-11-18.csv` (30 muestras), `pino_logs_sanitized_2026-11-18.log` (`responseTime_ms` 0–4 en las peticiones GET), `cache_sequence_2026-11-18.md`.
