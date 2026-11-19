# INFORME DE EVIDENCIAS CAMPORA — modo BUILD (2026-11-18)

> **Nota de publicación:** el destino es [thedieqo/CamporaADS](https://github.com/thedieqo/CamporaADS). Las observaciones de Git corresponden al cierre local previo. La versión para GitHub exige credenciales mediante variables de entorno y CI genera valores efímeros. Las evidencias registran el estado probado antes de ese ajuste.

## 1. Estado actual y alcance

- **Demo local:** operativa. `docker compose ps` muestra 4 contenedores activos: `backend` (0.0.0.0:3000→3000), `frontend` (0.0.0.0:5173→80), `postgres` (5432, healthy) y `redis` (6379, healthy). Evidencia: `docs/evidence/container_status_2026-11-18.txt`.
- **URLs verificadas en esta sesión:** Swagger `http://localhost:3000/api/docs` → 200; API `http://localhost:3000/api/v1/offers` → 200; app `http://localhost:5173/` → 200. `docs/evidence/stack_status_2026-11-18.txt`. `/api/docs-json` expone exactamente tres rutas: `/api/v1/auth/login`, `/api/v1/offers`, `/api/v1/offers/sync`.
- **Git:** no hay repositorio en `/Users/usuario/Desktop/Campora_oficial` (`git status` → `fatal: not a git repository`) y, por tanto, no hay remoto verificable. **No se hizo commit ni push.** GitHub Actions **no se ejecutó**.
- **Modo BUILD:** se conservó el monolito modular y la arquitectura hexagonal; no se cambió código de aplicación. Cambios realizados: workflow de CI, script de integración, lockfiles generados, evidencias depuradas y este informe.
- **Datos de la demo:** se conservaron los registros existentes. Se añadieron ofertas de prueba etiquetadas y se creó/eliminó un usuario temporal `BUYER` para la prueba de rol; al final solo permanece la cuenta demo original.
- **Resultados previos vs. obtenidos ahora:** en `docs/evidence/` ya existían `login.json`, `sync_first.json`, `sync_retry_same.json`, `pg_count.txt`, `pg_rows.txt`, `offers_miss_1.json`, `offers_hit_2.json` y `offers_after_sync_miss.json` (evidencia previa reportada). En esta sesión se obtuvieron las tres pruebas principales, la secuencia de caché, los logs depurados, el estado de contenedores, las dos capturas offline y la ejecución local del script de CI. Se detectaron dos inconsistencias en la evidencia previa: `offers_miss_1.json` contiene en realidad `cache:"hit"` (`key offers:search:v1:all`, `count 0`), y las claves previas `v1`/`v2` no coinciden con la versión observada hoy (`v9`→`v10`→`v15`). `login.json` contenía un JWT real y datos de la persona demo; **se redactó en esta sesión**.

## 2. Tecnologías y estructura real

**Stack:** NestJS 10 + TypeScript 5 + Prisma 5 sobre PostgreSQL 16; Redis 7 con ioredis; Passport + JWT; class-validator/class-transformer; Pino/pino-http; Swagger; React 18 + Vite 5 + PWA (vite-plugin-pwa); IndexedDB nativa; Nginx; Docker Compose; Node 22.

Árbol real (sin `node_modules`, `dist`, `.git`, `.env`, `.DS_Store` ni secretos):

```
.env.example
.gitignore
README-DEMO.md
docker-compose.yml
.github/workflows/ci.yml
scripts/ci-integration.sh
backend/
  Dockerfile  docker-entrypoint.sh  nest-cli.json  package.json  package-lock.json
  tsconfig.json  .dockerignore
  prisma/{schema.prisma,seed.ts,seed.js}
  src/main.ts  src/app.module.ts
  src/infrastructure/{prisma.module.ts,prisma.service.ts,redis.module.ts,redis.service.ts}
  src/modules/auth/
    domain/auth-user.ts
    application/{login.usecase.ts,ports/user-auth.port.ts}
    infrastructure/{auth.module.ts,jwt-auth.guard.ts,jwt.strategy.ts,prisma-user-auth.adapter.ts,roles.ts}
    interface/auth.controller.ts
  src/modules/offers/
    domain/offer.ts
    application/{list-offers.usecase.ts,sync-offer.usecase.ts,ports/offer-repository.port.ts}
    infrastructure/{offers.module.ts,prisma-offer.repository.ts}
    interface/offers.controller.ts
frontend/
  Dockerfile  nginx.conf  package.json  package-lock.json  index.html  tsconfig.json
  vite.config.ts  vite-env.d.ts  pwa.d.ts
  public/{favicon.svg,pwa-192.svg,pwa-512.svg}
  src/{App.tsx,api.ts,db.ts,main.tsx,styles.css}
docs/evidence/  (inventario en §12)
INFORME_EVIDENCIAS_CAMPORA.md
```

**Componentes y límites (rutas: líneas):**

- *Bootstrap:* `backend/src/main.ts:9-29` (Pino `:10`, `pinoHttp` `:12`, CORS `:13`, prefijo `api/v1` `:14`, `ValidationPipe` con `whitelist/transform` `:15`, Swagger `:17-24`, puerto `:26-28`). Composición en `backend/src/app.module.ts:7-9`.
- *Módulos globales de infraestructura:* `prisma.module.ts:4-8` y `redis.module.ts:4-8`; `PrismaService` conecta/desconecta en `prisma.service.ts:5-11`; `RedisService` en `redis.service.ts:4-35`.
- *Auth:* controlador `interface/auth.controller.ts:7-26`; caso de uso `application/login.usecase.ts:12-17`; puerto `application/ports/user-auth.port.ts:3-5`; adaptador `infrastructure/prisma-user-auth.adapter.ts:10-16` (bcrypt); estrategia `infrastructure/jwt.strategy.ts:5-16`; guard `jwt-auth.guard.ts:4-5`; roles `roles.ts:4-16`; cableado `auth.module.ts:11-27`.
- *Ofertas:* controlador/DTO `interface/offers.controller.ts:9-45, 47-78`; casos de uso `list-offers.usecase.ts:12-22` y `sync-offer.usecase.ts:12-16`; puerto `application/ports/offer-repository.port.ts:3-20`; entidad `domain/offer.ts:1-14`; adaptador `infrastructure/prisma-offer.repository.ts:9-31`; módulo `offers.module.ts:9-18`.
- *PWA:* `frontend/src/api.ts:1-34` (token en `localStorage`, fetch), `frontend/src/db.ts:1-60` (outbox IndexedDB `campora-db`/`offers_outbox`), `frontend/src/App.tsx:34-46` (eventos online/offline), `:59-79` (creación local), `:81-113` (sincronización), `:115-206` (UI).

Fragmentos breves (sin secretos):

```ts
// backend/src/modules/auth/application/login.usecase.ts:15-17
const payload = { sub: user.id, email: user.email, role: user.role, name: user.fullName };
const accessToken = await this.jwt.signAsync(payload);
return { accessToken, user: {...} };
```

```ts
// backend/src/modules/offers/infrastructure/prisma-offer.repository.ts:14-17
return this.prisma.offer.upsert({
  where: { producer_client_offer_unique: { producerId: command.producerId,
                                          clientOfferId: command.clientOfferId } },
  update: {}, create: { ... },
});
```

```ts
// backend/src/modules/offers/application/list-offers.usecase.ts:13-21
const version = await this.redis.getVersion();
const key = `offers:search:v${version}:all`;
if (cached) return { cache: 'hit', key, items: JSON.parse(cached) };
// miss → listPublished() → redis.set(key, ..., 60)
```

## 3. Contratos REST existentes

| Método | Ruta | Acceso | Parámetros/entrada | Salida | Validaciones | Códigos observados |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Público | Body `{email, password}` (`auth.controller.ts:7-15`) | `{accessToken, user:{id,email,fullName,role,municipality}}` | `@IsEmail`, `@IsString`; `ValidationPipe` global | 201 con credenciales válidas; 401 `Credenciales inválidas` (`login.usecase.ts:14`); 400 por validación |
| `GET` | `/api/v1/offers` | Público | Sin parámetros | `{cache:"hit"\|"miss", key, items[], count}` (`offers.controller.ts:54-57`) | No requiere DTO | 200 (30/30 muestras) |
| `POST` | `/api/v1/offers/sync` | `Authorization: Bearer <JWT>` + rol `PRODUCER` (`offers.controller.ts:60-63`) | Body `SyncOfferDto` `:9-45`: `clientOfferId` UUID, `productName`, `quantity` (>0), `unit`, `pricePerUnit` (>=0), `municipality` obligatorios; `category`, `currency`, `description` opcionales | `{synced:true, offer:{id, producerId, clientOfferId, ...}}` | `@IsUUID`, `@IsString`, `@IsNumber`, `@Min`, `@IsOptional`, `whitelist:true` | 201 creación/reintento; 400 validación; 401 sin JWT o JWT inválido; 403 rol distinto |

El `producerId` no se toma del body: se obtiene de `req.user.id` (`offers.controller.ts:65-76`), por lo que un cliente no puede sincronizar ofertas en nombre de otro productor.

## 4. Persistencia real

- **PostgreSQL:** `schema.prisma:21-30` (`User` con `passwordHash`, `role`) y `:32-51` (`Offer`). Restricción `@@unique([producerId, clientOfferId])` `:49` e índice `[productName, municipality, status]` `:50`. `PrismaService` `$connect/$disconnect`; `docker-entrypoint.sh:3-7` aplica `prisma db push` y siembra el usuario demo al arrancar. `listPublished()` filtra `status: 'PUBLISHED'` y ordena por `createdAt desc`.
- **Redis:** `RedisService.searchVersionKey = 'offers:search:version'` (`redis.service.ts:7`), `getVersion()` inicializa en `1` `:13-18`, `invalidateSearchCache()` hace `INCR` `:20-22`, claves `offers:search:vN:all` con TTL 60 s `:24-30`. `list-offers.usecase.ts` sirve hit/miss; `sync-offer.usecase.ts:14` invalida tras cada sincronización (incluso reintentos idempotentes). Secuencia observada: `miss v9` → `hit v9` → sync → versión `10` → `miss v10` → `hit v10`.
- **IndexedDB:** base `campora-db`, store `offers_outbox` con `keyPath: 'clientOfferId'` (`db.ts:18-34`); estados `PENDING | SYNCING | SYNCED | ERROR` y `serverOfferId` (`db.ts:1-16`). La UI persiste antes de intentar red (`App.tsx:59-79`), reintenta estados recuperables y guarda el `Server ID` al confirmar (`App.tsx:81-113`).

## 5. Seguridad

Flujo: login → bcrypt.compare (`prisma-user-auth.adapter.ts:13`) → JWT firmado con `JwtModule` (`auth.module.ts:14-17`) → extracción Bearer (`jwt.strategy.ts:9`) → `JwtAuthGuard` + `RolesGuard` en sync. La contraseña demo existe solo en el seed y en la documentación local; **no se reproduce en este informe ni en evidencias**.

Prueba real: sin JWT `401`, JWT inválido `401`, JWT de productor `201`, JWT de usuario `BUYER` temporal `403` (`No autorizado`); usuario temporal eliminado. Detalle en `docs/evidence/01_security_2026-11-18.md`.

Hallazgos de seguridad (sin valores): los logs Pino sin depurar registran la cabecera `authorization` completa (`main.ts:12` con `pinoHttp` por defecto); hay secretos con valor por defecto en código (`jwt.strategy.ts:11`, `auth.module.ts:15`); el token se guarda en `localStorage` (`api.ts:3-5`); el rol viaja dentro del JWT y se confía en él (`roles.ts:14`). No se incluyó ningún token ni cabecera en la evidencia compartible.

## 6. Docker y configuración

- `backend/Dockerfile:1-23`: build multi-stage sobre `node:22-bookworm-slim`, instala openssl/ca-certificates, `npm install` (ahora con lockfile), `prisma generate`, `npm run build`; etapa final copia `dist`, `prisma` y entrypoint, `EXPOSE 3000`.
- `frontend/Dockerfile:1-14`: build `node:22-alpine`, `npm install`, `ARG/ENV VITE_API_URL`; etapa `nginx:alpine` con `nginx.conf` (SPA fallback) y `EXPOSE 80`.
- `docker-compose.yml`: `postgres` ( imagen `postgres:16-alpine`, volumen `pgdata`, healthcheck `pg_isready` `:2-16`), `redis` (`redis:7-alpine`, healthcheck `ping` `:18-26`), `backend` (build local, `depends_on` con `service_healthy` `:28-44`), `frontend` (build local, `:46-52`). Puertos publicados: `5432`, `6379`, `3000`, `5173`.
- **Nombres de variables** según `.env.example` (sin valores): `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`, `VITE_API_URL`. En Compose también se usan `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (solo nombres aquí). No se copiaron valores de `.env` a evidencias.

## 7. CI/CD

- Se generaron `backend/package-lock.json` y `frontend/package-lock.json` (`npm install --package-lock-only`): **no existían lockfiles antes de esta sesión**; fue necesario para que la instalación sea reproducible con `npm ci`.
- `.github/workflows/ci.yml`: job `build` con `actions/checkout@v4`, `actions/setup-node@v4` (Node 22, caché por lockfiles), `npm ci` + `npx prisma generate` + `npm run build` en backend, `npm ci` + `npm run build` en frontend, `npm audit --audit-level=critical --omit=dev` en ambos y `actions/dependency-review-action@v4` solo en PR. Job `integration`: `docker compose up -d --build`, ejecución de `scripts/ci-integration.sh` con `DEMO_PASSWORD` generado en el runner, logs depurados si falla y `docker compose down -v` siempre.
- `scripts/ci-integration.sh` contiene comprobaciones reales (no pasos vacíos): login, 401 sin JWT, 401 con JWT inválido, 201 con JWT válido, doble envío con el mismo `clientOfferId`, mismo `offer.id`, `count(*)=1`, `GET /offers` 200.
- **Ejecución local del script:** 7/7 PASS → `docs/evidence/ci_integration_local_2026-11-18.txt`. Compilaciones verificadas en contenedores Node 22 con `npm ci` (backend `nest build` y frontend `vite build` + PWA, exitosas). No hay scripts `lint`/`typecheck` definidos; `nest build` y `vite build` realizan la compilación TypeScript.
- **GitHub Actions no se ejecutó**: no hay repositorio ni remoto. `npm audit` local: frontend 0 vulnerabilidades; backend 0 críticas, 6 `high` y 4 `moderate` (no se modificaron dependencias por estar fuera de alcance).
- Publicación mínima (no ejecutada): `git init` → `git add .` → `git commit -m "..."` → `git remote add origin <URL>` → `git push -u origin main`.

## 8. Resultados de las tres pruebas reales

| # | Atributo | Herramienta | Criterio | Resultado observado | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Seguridad y autorización | curl, psql | 401/401/201 y rechazo por rol | 401, 401, 201, 403 (usuario `BUYER` temporal eliminado) | **PASS** | `docs/evidence/01_security_2026-11-18.md`, logs depurados |
| 2 | Integridad e idempotencia | curl, python3, psql | misma fila en dos envíos y `count=1` | `id 665fb7bb-…` en ambos; `CID c9677c97-…`; `count=1` | **PASS** | `docs/evidence/02_idempotency_2026-11-18.md`, `pg_count_2026-11-18.txt` |
| 3 | Desempeño | curl (k6 no disponible) | sin umbral: línea base local | 30/30 HTTP 200, 0 errores; p50 0.0027 s, p95 0.0049 s | **PASS (línea base)** | `docs/evidence/03_performance_2026-11-18.md`, `perf_raw_2026-11-18.csv` |

Comandos reproducibles con secretos omitidos, procedimiento y criterios están en cada archivo de evidencia. No se instalaron herramientas durante la sesión.

**Métricas:** 30 solicitudes secuenciales, caché caliente, `min 0.001794 s`, `p50 0.0027 s`, `p90 0.0044 s`, `p95 0.0049 s`, `max 0.006168 s`, `media 0.0030 s`; respuesta ~2231 bytes (5 ofertas). Percentiles calculados con interpolación lineal sobre muestras reales.

**Logs:** extracto Pino depurado de 25 líneas con `method`, `url`, `http_status`, `responseTime_ms` y `authorization_header_redacted` (`docs/evidence/pino_logs_sanitized_2026-11-18.log`). Incluye 401, 201, 403 y los GET 200 con `responseTime_ms` 0-4. Los logs originales contenían JWT completos: no se comparten.

**Caché:** `docs/evidence/cache_sequence_2026-11-18.md` registra `miss`, `hit`, `INCR` de versión `9→10` tras sync, `miss`, `hit`.

**Verificación navegador (extra):** se ejecutó. Oferta `Fruta Evidencia Offline`, `clientOfferId a65379d7-…`: captura 1 con `OFFLINE` + `PENDING`, captura 2 con `SYNCED`, mismo `clientOfferId` y `Server ID af538cc8-…` reflejado en el listado. Detalle y salvedad metodológica en `docs/evidence/05_offline_browser_2026-11-18.md`; imágenes `offline_pending_capture_2026-11-18.png` y `offline_synced_capture_2026-11-18.png`. No quedan capturas manuales pendientes de las mínimas solicitadas; Swagger y Docker se reutilizaron/verificaron por HTTP y `docker compose ps`.

## 9. Despliegue

- **Local (actual):** `docker compose up --build -d` desde la raíz; http://localhost:5173 (PWA), http://localhost:3000/api/v1 (API), http://localhost:3000/api/docs (Swagger). `README-DEMO.md:3-28` describe el flujo. El entrypoint aplica schema y seed antes de arrancar.
- **Opción pública futura (propuesta, no implementada):** publicar el frontend detrás de un reverse proxy con HTTPS (terminación TLS y cabeceras de seguridad), API con `CORS_ORIGIN` restringido, secretos inyectados por un gestor (sin valores en el repositorio), migraciones versionadas con `prisma migrate deploy` en lugar de `db push` en arranque, Postgres y Redis administrados con backups y healthchecks, y observabilidad con redacción de cabeceras. No se expondrían los puertos de datos directamente a Internet.

## 10. Revisión crítica con IA sobre el código real

| Tema | Hallazgo (ruta/líneas) | Impacto | Recomendación | Decisión |
| --- | --- | --- | --- | --- |
| Límites hexagonales y dependencias | Los casos de uso importan `RedisService` concreto (`list-offers.usecase.ts:3`, `sync-offer.usecase.ts:3`) y `OffersModule` importa `AuthModule` de infraestructura (`offers.module.ts:7,10`). El puerto `OfferRepositoryPort` sí está bien invertido (`offer-repository.port.ts:16-20`). | La capa de aplicación queda acoplada a ioredis y a la composición Nest de auth; las pruebas unitarias requieren Redis real o mocks del adaptador. | Definir `CachePort` en `application/ports`, inyectarlo por símbolo y mover la implementación a `infrastructure`; importar desde `auth` solo el guard/módulo mínimo necesario. | **Ajustar** (propuesto; no aplicado para no modificar la demo en esta sesión). |
| Idempotencia y consistencia offline | `upsert` + `@@unique([producerId, clientOfferId])` (`prisma-offer.repository.ts:14-30`, `schema.prisma:49`) garantiza una fila, verificado con `count=1`. Pero `update:{}` ignora silenciosamente cambios de payload con el mismo `clientOfferId`, y `App.tsx:46,81-113` dispara auto-sync basado en `navigator.onLine`; con emulación Offlinedevtools ese valor sigue `true` y la UI mostró `SYNCING` transitoriamente aunque IndexedDB ya estaba `PENDING`. | Riesgo de pérdida silenciosa de cambios locales y de estado de UI engañoso; no hay resolución de conflictos ni backoff. | Mantener la restricción única (correcta); registrar el reintento con payload distinto como conflicto (`409`) o guardar `payloadHash`; derivar el estado de la UI desde IndexedDB y usar eventos `online`/`offline` + reconocimiento explícito antes de marcar `SYNCING`. | **Aceptar** la estrategia de BD (verificada) y **ajustar** el manejo de UI/conflictos (propuesto). |
| Autenticación y credenciales | JWT con secreto por defecto en código (`jwt.strategy.ts:11`, `auth.module.ts:15`); rol tomado del payload (`roles.ts:14`); token en `localStorage` (`api.ts:3-5`); `pinoHttp` registra todas las cabeceras (`main.ts:12`). | En un entorno compartido, un secreto débil permite falsificar tokens; los logs filtran tokens vigentes; XSS podría robar el token; el rol no se revalida contra la BD. | Secretos obligatorios vía entorno con validación al arrancar; redactar `authorization`/`cookie` en Pino; token en cookie `HttpOnly; Secure; SameSite`; reconsultar el rol o usar `aud/iss` y rotación. | **Ajustar** (propuesto; no aplicado). La redacción se aplicó solo al extracto compartido, no al comportamiento de la app. |
| Alcance explícitamente excluido | Pedidos, pagos, administración, microservicios y ADR-007. | Fuera del incremento; incorporarlos los aumentaría sin evidencia. | No incorporar. | **Descartar** (fuera de alcance acordado). |

**Correcciones aplicadas en esta sesión:** redacción del JWT/datos en `docs/evidence/login.json`; generación de los dos lockfiles; creación de `.github/workflows/ci.yml` y `scripts/ci-integration.sh`; evidencias depuradas; este informe. **Propuestas no aplicadas:** las tres filas marcadas como *Ajustar* y la revisión de dependencias `high`/`moderate`.

## 11. Matriz de funcionalidad

| Funcionalidad | Diseñada | Propuesta | Implementada | Verificada | Evidencia |
| --- | --- | --- | --- | --- | --- |
| Login con JWT | Sí (`auth.controller.ts:22-26`) | Cookie HttpOnly y secreto obligatorio | Sí | Sí, sesión actual (201) | `01_security_2026-11-18.md` |
| Autorización por rol en sync | Sí (`offers.controller.ts:61-62`) | Revalidar rol contra BD | Sí | Sí, 403 con `BUYER` temporal | `01_security_2026-11-18.md` |
| Listado con caché versionada | Sí (`list-offers.usecase.ts:12-22`) | `CachePort` hexagono | Sí | Sí, `miss`/`hit`/invalidación | `cache_sequence_2026-11-18.md` |
| Sync idempotente | Sí (`schema.prisma:49`) | Conflicto ante payload distinto | Sí | Sí, dos 201 + `count=1` | `02_idempotency_2026-11-18.md` |
| Outbox offline IndexedDB | Sí (`db.ts`, `App.tsx:59-113`) | Estado desde IndexedDB y backoff | Sí | Sí, dos capturas | `05_offline_browser_2026-11-18.md`, PNGs |
| Logs estructurados Pino | Sí (`main.ts:10-12`) | Redactar `authorization` | Sí | Sí (extracto depurado) | `pino_logs_sanitized_2026-11-18.log` |
| Desempeño `GET /offers` | No hay SLA acordado | Definir umbral futuro | Medición disponible | Sí, línea base 30 muestras | `03_performance_2026-11-18.md` |
| CI con lockfiles y pruebas | — | Workflow creado | Sí | Solo local (7/7 PASS); Actions no ejecutada | `ci.yml`, `ci_integration_local_2026-11-18.txt` |
| Despliegue público HTTPS | No | Propuesto | No | Pendiente | §9 |

## 12. Limites, errores y pendientes

- **Errores concretos encontrados y cómo se trataron:** (1) `git status` → `fatal: not a git repository`; se registró y se continuó, sin publicar. (2) `k6` no disponible (`command -v k6` vacío); se usó `curl` sin instalar nada. (3) No existían lockfiles; se generaron. (4) Primer intento del script de CI falló por un pase incorrecto de argumentos en la función `status()` (`S2=401000`); se corrigió a `"${@:2}"` y se verificó 7/7 PASS. (5) Build en el host y en el contenedor de runtime falló por ausencia de dependencias/tsconfig; se verificó con contenedores Node 22 montando el código y `npm ci`. (6) La emulación `Offline` de DevTools no cambió `navigator.onLine` y dejó la UI en `SYNCING`; se documentó y se usó un script de inicialización del navegador para la captura, sin tocar la app.
- **Pendiente:** ejecución real de GitHub Actions al momento del cierre local; definición de umbral de desempeño; correcciones propuestas de la §10. No quedan capturas manuales pendientes de las mínimas exigidas.

## 13. Repositorio e inventario de evidencias

- Repositorio local: `/Users/usuario/Desktop/Campora_oficial`. Git: **sin inicializar**, sin remoto; no se divulgaron credenciales ni se hizo push. Enlace: **no existe uno verificable**.
- `docs/evidence/` — inventario:
  - Previo reportado (revisado): `login.json` (redactado), `sync_first.json`, `sync_retry_same.json`, `pg_count.txt`, `pg_rows.txt`, `offers_miss_1.json` (contenido real `hit`), `offers_hit_2.json`, `offers_after_sync_miss.json`.
  - Obtenido en esta sesión: `01_security_2026-11-18.md`, `02_idempotency_2026-11-18.md`, `03_performance_2026-11-18.md`, `cache_sequence_2026-11-18.md`, `05_offline_browser_2026-11-18.md`, `perf_raw_2026-11-18.csv`, `pg_count_2026-11-18.txt`, `pino_logs_sanitized_2026-11-18.log`, `container_status_2026-11-18.txt`, `stack_status_2026-11-18.txt`, `ci_integration_local_2026-11-18.txt`, `offline_pending_capture_2026-11-18.png`, `offline_synced_capture_2026-11-18.png`.
- Toda la evidencia compartible excluye contraseñas, JWT, cabeceras `Authorization`, valores de `.env` y datos personales reales; solo aparece la identidad demo documentada y UUIDs de datos de prueba.
