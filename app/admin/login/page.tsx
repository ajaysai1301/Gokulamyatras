'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { staffLogin, saveAuth, ADMIN_TOKEN } from '@/lib/staff-client';
import { LotusMark } from '@/components/site/decorative';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@gokulamyatras.in');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const auth = await staffLogin(email, password);
      if (auth.role !== 'ADMIN') { setError('This account is not an administrator.'); setLoading(false); return; }
      saveAuth(ADMIN_TOKEN, auth);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <LotusMark className="h-8 w-8" color="#D9761E" />
          <span className="font-display text-xl font-semibold text-slate-900">Gokulam<span className="text-brand-saffron">Admin</span></span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Manage yatras, bookings and operations.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-saffron focus:ring-2 focus:ring-brand-saffron/20" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input type="password" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-saffron focus:ring-2 focus:ring-brand-saffron/20" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-saffron px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-saffronDark disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Sign in
          </button>
        </form>
        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Demo: admin@gokulamyatras.in / admin123</p>
      </div>
    </div>
  );
}
