'use client';

/** Client-side helpers for staff (admin + coordinator) auth and authed API calls. */
export const ADMIN_TOKEN = 'gy_admin_auth';
export const COORD_TOKEN = 'gy_coord_auth';

export interface StaffAuth { token: string; role: string; name: string; email: string; }

export function saveAuth(key: string, data: StaffAuth) {
  localStorage.setItem(key, JSON.stringify(data));
}
export function getAuth(key: string): StaffAuth | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
export function clearAuth(key: string) { localStorage.removeItem(key); }

export async function staffLogin(email: string, password: string): Promise<StaffAuth> {
  const res = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || 'Login failed');
  return d as StaffAuth;
}

export async function staffApi<T = unknown>(tokenKey: string, path: string, opts: RequestInit = {}): Promise<T> {
  const auth = getAuth(tokenKey);
  const res = await fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth?.token || ''}`, ...(opts.headers || {}) },
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((d as { error?: string }).error || 'Request failed');
  return d as T;
}
