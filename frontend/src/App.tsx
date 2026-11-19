import React, { useEffect, useMemo, useState } from 'react';
import { login, listOffers, syncOffer, setToken, getToken, clearToken } from './api';
import { getAllLocalOffers, putLocalOffer, LocalOffer } from './db';

function uuid() {
  return (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
  });
}

export default function App() {
  const [email, setEmail] = useState('productor@campora.demo');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [localOffers, setLocalOffers] = useState<LocalOffer[]>([]);
  const [serverOffers, setServerOffers] = useState<any[]>([]);
  const [cacheInfo, setCacheInfo] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [form, setForm] = useState({ productName: 'Mango Tommy', category: 'Fruta', quantity: '100', unit: 'kg', pricePerUnit: '3500', currency: 'COP', municipality: 'Espinal, Tolima', description: 'Cosecha demo' });

  async function refreshLocal() { setLocalOffers(await getAllLocalOffers()); }
  async function refreshServer() {
    try {
      const data = await listOffers();
      setServerOffers(data.items || []);
      setCacheInfo(`cache=${data.cache || 'n/a'} key=${data.key || ''}`);
    } catch (e: any) {
      setCacheInfo(`No se pudo cargar listado: ${e.message || e}`);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) { try { setUser(JSON.parse(saved)); } catch {} }
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    refreshLocal();
    if (navigator.onLine) refreshServer();
    return () => { window.removeEventListener('online', onOn); window.removeEventListener('offline', onOff); };
  }, []);

  useEffect(() => { if (online) { syncPending(); refreshServer(); } }, [online]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setAuthError('');
    try {
      const data = await login(email, password);
      setToken(data.accessToken); setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err: any) { setAuthError(err.message || 'Error'); }
  }

  function handleLogout() { clearToken(); localStorage.removeItem('user'); setUser(null); }

  async function handleCreateOffline(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const offer: LocalOffer = {
      clientOfferId: uuid(),
      productName: form.productName,
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit,
      pricePerUnit: Number(form.pricePerUnit),
      currency: form.currency,
      municipality: form.municipality,
      description: form.description,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    await putLocalOffer(offer);
    await refreshLocal();
    setSyncMsg(`Oferta guardada localmente (pendiente). clientOfferId=${offer.clientOfferId}`);
  }

  async function syncPending() {
    const token = getToken();
    if (!token) return;
    const pending = (await getAllLocalOffers()).filter(o => o.status === 'PENDING' || o.status === 'ERROR' || o.status === 'SYNCING');
    if (!pending.length) return;
    for (const item of pending.sort((a,b)=>a.createdAt.localeCompare(b.createdAt))) {
      try {
        await putLocalOffer({ ...item, status: 'SYNCING', updatedAt: new Date().toISOString(), error: undefined });
        await refreshLocal();
        const payload = {
          clientOfferId: item.clientOfferId,
          productName: item.productName,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          currency: item.currency,
          municipality: item.municipality,
          description: item.description,
        };
        const res = await syncOffer(payload);
        await putLocalOffer({ ...item, status: 'SYNCED', serverOfferId: res?.offer?.id, updatedAt: new Date().toISOString(), error: undefined });
        setSyncMsg(`Sincronizada ${item.clientOfferId} -> serverOfferId=${res?.offer?.id}`);
      } catch (err: any) {
        const recoverable = !err?.status || err.status >= 500 || err.status === 408 || err.status === 429;
        await putLocalOffer({ ...item, status: recoverable ? 'PENDING' : 'ERROR', error: JSON.stringify(err?.data || err?.message || err), updatedAt: new Date().toISOString() });
        setSyncMsg(`Error sincronizando ${item.clientOfferId}: ${err?.status || 'red'} ${JSON.stringify(err?.data || err?.message || '')}`);
        if (recoverable) break;
      }
      await refreshLocal();
    }
    await refreshServer();
  }

  const badge = (s: string) => s === 'SYNCED' ? 'badge ok' : s === 'PENDING' ? 'badge pending' : s === 'SYNCING' ? 'badge sync' : 'badge err';

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>CAMPORA - Primer incremento (Productor)</h1>
          <div className="small">Flujo: login → crear oferta offline → recargar offline → reconectar → sincronizar → ver en listado</div>
        </div>
        <div className="row">
          <span className={online ? 'badge ok' : 'badge pending'}>{online ? 'ONLINE' : 'OFFLINE'}</span>
          {user ? <button className="secondary" onClick={handleLogout}>Salir</button> : null}
        </div>
      </div>

      {!user ? (
        <div className="card" style={{maxWidth:480}}>
          <h2>Iniciar sesión (productor demo)</h2>
          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} />
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            <div className="row" style={{marginTop:10}}>
              <button type="submit" disabled={!online}>Entrar</button>
              {!online && <span className="small">Conéctate para login inicial (JWT). Luego puedes trabajar offline.</span>}
            </div>
            {authError && <div className="error" style={{marginTop:8}}>{authError}</div>}
          </form>
          <div className="small" style={{marginTop:10}}>Demo: productor@campora.demo · Contraseña configurada en .env</div>
        </div>
      ) : (
        <>
          <div className={`statusbar ${online ? '' : 'offline'}`}>
            Sesión: <b>{user.fullName}</b> ({user.role}, {user.email}) — Municipio demo: {user.municipality || 'Tolima'}.
            {syncMsg ? <div className="small" style={{marginTop:4}}>Último estado: {syncMsg}</div> : null}
          </div>
          <div className="grid">
            <div className="card">
              <h2>Crear oferta (funciona offline)</h2>
              <form onSubmit={handleCreateOffline}>
                <label>Producto</label><input value={form.productName} onChange={e=>setForm({...form, productName:e.target.value})} required />
                <label>Categoría</label><input value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
                <div className="row"><div style={{flex:1}}><label>Cantidad</label><input type="number" step="0.01" value={form.quantity} onChange={e=>setForm({...form, quantity:e.target.value})} required /></div>
                <div style={{flex:1}}><label>Unidad</label><input value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} required /></div></div>
                <div className="row"><div style={{flex:1}}><label>Precio/unidad</label><input type="number" step="0.01" value={form.pricePerUnit} onChange={e=>setForm({...form, pricePerUnit:e.target.value})} required /></div>
                <div style={{flex:1}}><label>Moneda</label><input value={form.currency} onChange={e=>setForm({...form, currency:e.target.value})} /></div></div>
                <label>Municipio (Tolima)</label><input value={form.municipality} onChange={e=>setForm({...form, municipality:e.target.value})} required />
                <label>Descripción</label><textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
                <div className="row" style={{marginTop:10}}>
                  <button type="submit">Guardar oferta (local/offline)</button>
                  <button type="button" className="secondary" onClick={syncPending} disabled={!online}>Sincronizar pendientes</button>
                  <button type="button" className="secondary" onClick={refreshServer}>Refrescar listado</button>
                </div>
              </form>
              <div className="small" style={{marginTop:8}}>Tip demo: corta la red, guarda, recarga la página y verifica que siga pendiente; luego reconecta.</div>
            </div>

            <div className="card">
              <h2>Ofertas locales (IndexedDB - outbox)</h2>
              <div className="small">Persisten tras recarga offline hasta confirmación del servidor.</div>
              {localOffers.length === 0 ? <p className="small">Sin ofertas locales.</p> : (
                <table><thead><tr><th>Producto</th><th>Estado</th><th>IDs</th></tr></thead><tbody>
                  {localOffers.map(o => (
                    <tr key={o.clientOfferId}>
                      <td><b>{o.productName}</b><div className="small">{o.quantity} {o.unit} · ${o.pricePerUnit} {o.currency} · {o.municipality}</div></td>
                      <td><span className={badge(o.status)}>{o.status}</span>{o.error ? <div className="error">{o.error}</div> : null}</td>
                      <td className="small">client: {o.clientOfferId}<br/>server: {o.serverOfferId || '-'}</td>
                    </tr>
                  ))}
                </tbody></table>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Listado de ofertas (servidor / PostgreSQL)</h2>
            <div className="small">Respuesta API: {cacheInfo || 'sin datos'} — tras sincronizar se invalida caché de búsqueda (Redis versionada).</div>
            <div className="row" style={{margin:'8px 0'}}><button className="secondary" onClick={refreshServer}>Consultar listado</button></div>
            {serverOffers.length === 0 ? <p className="small">Sin ofertas en servidor aún.</p> : (
              <table><thead><tr><th>Producto</th><th>Cantidad/Precio</th><th>Municipio</th><th>Server ID</th><th>clientOfferId</th></tr></thead><tbody>
                {serverOffers.map((o:any) => (
                  <tr key={o.id}><td><b>{o.productName}</b></td><td>{o.quantity} {o.unit} · ${o.pricePerUnit} {o.currency}</td><td>{o.municipality}</td><td className="small">{o.id}</td><td className="small">{o.clientOfferId}</td></tr>
                ))}
              </tbody></table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
