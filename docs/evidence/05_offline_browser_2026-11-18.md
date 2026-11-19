# Evidencia 05 — Verificación manual offline → reload → sync (2026-11-18)

- **Atributo:** consistencia offline en la PWA (IndexedDB outbox).
- **Herramienta:** navegador Chrome DevTools MCP sobre `http://localhost:5173`.
- **Procedimiento:** login demo; `Network: Offline`; crear oferta nueva `Fruta Evidencia Offline`; recargar; verificar `PENDING`; volver a Online; verificar `SYNCED` con el mismo `clientOfferId` y `serverOfferId`.
- **clientOfferId de la oferta de prueba:** `a65379d7-7174-4f03-bd63-f8bda7e3227a`.
- **Criterio de aceptación:** tras recargar offline la oferta sigue `PENDING`; al reconectar aparece `SYNCED`, conserva el mismo `clientOfferId` y muestra un `Server ID` que coincide con el listado del servidor.
- **Resultado observado:**
  - Captura 1 (`offline_pending_capture_2026-11-18.png`): badge `OFFLINE`, oferta local `PENDING`, `client: a65379d7-7174-4f03-bd63-f8bda7e3227a`, `server: -`.
  - Captura 2 (`offline_synced_capture_2026-11-18.png`): badge `ONLINE`, oferta local `SYNCED`, mismo `clientOfferId`, `server: af538cc8-509d-4af8-891f-0521ef013394`; el listado del servidor muestra el mismo par `Server ID`/`clientOfferId`; respuesta `cache=miss key=offers:search:v15:all` tras la invalidación.
- **Estado:** PASS con salvedad metodológica: la emulación `Offline` de DevTools no cambió `navigator.onLine`, por lo que se fijó `onLine=false` mediante script de inicialización del navegador solo para la captura 1 (sin modificar la app). Al recargar con `Offline` puro, el auto-sync intentó sincronizar, dejó el estado persistido en `PENDING` pero la UI mostró temporalmente `SYNCING`; se documenta como hallazgo de UI, no de persistencia.
- **Evidencia:** las dos capturas PNG anteriores y este archivo. No se incluyen tokens ni datos personales reales (la identidad visible es la cuenta demo documentada en `README-DEMO.md`).
