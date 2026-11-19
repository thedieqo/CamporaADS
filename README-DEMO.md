# CAMPORA - Demo primer incremento

## Levantar (requiere Docker Desktop activo)
```bash
# Configuración inicial para una copia nueva
umask 077
cp -n .env.example .env
# Completa las tres variables en .env antes de iniciar.
docker compose up --build -d
```

## URLs
- App web (PWA): http://localhost:5173
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs

## Credenciales demo
- Email: productor@campora.demo
- Contraseña: valor de `DEMO_PASSWORD` en `.env`. Usa valores nuevos para las tres variables. Genera cada valor con `openssl rand -hex 24`.

## Flujo demo
1. Abrir app y hacer login.
2. En DevTools > Network, activar Offline.
3. Crear oferta (se guarda en IndexedDB como pendiente).
4. Recargar la página offline: la oferta debe seguir pendiente.
5. Volver a Online y pulsar "Sincronizar pendientes" o esperar reconexión.
6. Refrescar listado: la oferta aparece en servidor y caché se invalida tras sync.

## Verificación duplicados en PostgreSQL
```bash
docker compose exec postgres psql -U campora -d campora -c 'SELECT id, "producerId", "clientOfferId", "productName" FROM "Offer";'
```
