'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { LotusMark } from '@/components/site/decorative';
import { staffLogin, saveAuth, ADMIN_TOKEN, COORD_TOKEN } from '@/lib/staff-client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { const auth = await staffLogin(email, password); saveAuth(auth.role === 'ADMIN' ? ADMIN_TOKEN : COORD_TOKEN, auth); router.replace(auth.role === 'ADMIN' ? '/admin' : '/coordinator'); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in'); setBusy(false); } }
  return <main className="flex min-h-screen items-center justify-center bg-brand-ink p-4"><div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-premium"><div className="mb-7 flex items-center gap-2"><LotusMark className="h-9 w-9" color="#D9761E" /><span className="font-display text-2xl font-semibold text-slate-900">Gokulam<span className="text-brand-saffron">Yatras</span></span></div><h1 className="font-display text-2xl font-semibold text-slate-900">Sign in</h1><p className="mt-2 text-sm text-slate-500">Use your staff account. You will be sent to the correct workspace automatically.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium text-slate-700">Email<input required type="email" autoComplete="username" className="gy-input mt-1.5" value={email} onChange={e=>setEmail(e.target.value)} /></label><label className="block text-sm font-medium text-slate-700">Password<input required type="password" autoComplete="current-password" className="gy-input mt-1.5" value={password} onChange={e=>setPassword(e.target.value)} /></label>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}<button disabled={busy} className="btn-primary w-full justify-center">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<LogIn className="h-4 w-4"/>} Sign in</button></form></div></main>;
}
