const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

export function getToken() { return localStorage.getItem('token'); }
export function setToken(t: string) { localStorage.setItem('token', t); }
export function clearToken() { localStorage.removeItem('token'); }

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.message || 'Error de login');
  return data;
}

export async function listOffers() {
  const res = await fetch(`${API}/offers`);
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.message || 'Error listando ofertas');
  return data;
}

export async function syncOffer(payload: any) {
  const token = getToken();
  const res = await fetch(`${API}/offers/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}
