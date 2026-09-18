'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ScanLine, LogOut, CheckCircle2, AlertTriangle, XCircle, Loader2, ArrowLeft, Users, Keyboard,
} from 'lucide-react';
import { COORD_TOKEN, getAuth, clearAuth, staffApi, staffLogin, saveAuth } from '@/lib/staff-client';
import { LotusMark } from '@/components/site/decorative';
import { formatDate } from '@/lib/format';
import { YatraView, BookingView } from '@/lib/domain/types';

type ValidateResult = { valid: boolean; reason?: string; booking?: BookingView; alreadyCheckedIn?: boolean; checkIn?: { checkedInAt: string; coordinatorName: string } | null };

export default function CoordinatorPage() {
  const [auth, setAuth] = useState<ReturnType<typeof getAuth>>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setAuth(getAuth(COORD_TOKEN)); setReady(true); }, []);

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">Loading…</div>;
  if (!auth) return <CoordinatorLogin onDone={setAuth} />;
  return <CoordinatorHome name={auth.name} onLogout={() => { clearAuth(COORD_TOKEN); setAuth(null); }} />;
}

function CoordinatorLogin({ onDone }: { onDone: (a: ReturnType<typeof getAuth>) => void }) {
  const [email, setEmail] = useState('coordinator@gokulamyatras.in');
  const [password, setPassword] = useState('coord123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const a = await staffLogin(email, password);
      saveAuth(COORD_TOKEN, a); onDone(a);
    } catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); setLoading(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-ink p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2"><LotusMark className="h-8 w-8" color="#D9761E" /><span className="font-display text-xl font-semibold">Coordinator</span></div>
        <h1 className="text-lg font-semibold">Sign in to check-in</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className="gy-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" className="gy-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn-primary w-full justify-center">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}</button>
        </form>
        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Demo: coordinator@gokulamyatras.in / coord123</p>
      </div>
    </div>
  );
}

function CoordinatorHome({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [yatras, setYatras] = useState<YatraView[]>([]);
  const [selected, setSelected] = useState<YatraView | null>(null);
  const [summary, setSummary] = useState<{ bookedTravellers: number; checkedInTravellers: number; remaining: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => { fetch('/api/yatras?filter=all').then((r) => r.json()).then((d) => setYatras(d.yatras || [])); }, []);

  const loadSummary = async (y: YatraView) => {
    try { setSummary(await staffApi(COORD_TOKEN, `/checkin/summary?yatraId=${y.id}`)); } catch { setSummary(null); }
  };

  const selectYatra = (y: YatraView) => { setSelected(y); setResult(null); loadSummary(y); };

  const validate = async (token: string) => {
    if (!token) return;
    setBusy(true); setResult(null);
    try {
      const res = await staffApi<ValidateResult>(COORD_TOKEN, '/checkin/validate', { method: 'POST', body: JSON.stringify({ token }) });
      setResult(res);
    } catch { toast.error('Could not validate ticket'); }
    finally { setBusy(false); }
  };

  const doCheckIn = async (token: string) => {
    setBusy(true);
    try {
      const res = await staffApi<{ ok: boolean; reason?: string }>(COORD_TOKEN, '/checkin', { method: 'POST', body: JSON.stringify({ token }) });
      if (res.ok) { toast.success('Checked in successfully'); if (selected) loadSummary(selected); await validate(token); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast.warning(msg.includes('409') ? 'Already checked in' : 'Already checked in');
      await validate(token);
    } finally { setBusy(false); }
  };

  async function startScan() {
    setScanning(true); setResult(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const el = document.getElementById('qr-reader');
      if (!el) return;
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = { stop: () => scanner.stop().then(() => scanner.clear()).catch(() => {}) };
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, (decoded: string) => {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
        setScanning(false);
        validate(decoded);
      }, () => {});
    } catch {
      toast.error('Camera not available. Use manual entry.');
      setScanning(false);
    }
  }
  function stopScan() { scannerRef.current?.stop(); setScanning(false); }

  // ---- Screens ----
  if (!selected) {
    return (
      <Shell name={name} onLogout={onLogout}>
        <h2 className="mb-1 text-lg font-semibold text-white">Select a yatra</h2>
        <p className="mb-5 text-sm text-slate-400">Choose the yatra you are coordinating today.</p>
        <div className="space-y-3">
          {yatras.map((y) => (
            <button key={y.id} onClick={() => selectYatra(y)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow">
              <img src={y.heroImage} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1"><p className="font-semibold text-slate-900">{y.name}</p><p className="text-xs text-slate-500">{formatDate(y.startDate)}</p></div>
            </button>
          ))}
          {yatras.length === 0 && <p className="text-sm text-slate-400">No yatras available.</p>}
        </div>
      </Shell>
    );
  }

  return (
    <Shell name={name} onLogout={onLogout}>
      <button onClick={() => { setSelected(null); setResult(null); stopScan(); }} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-300"><ArrowLeft className="h-4 w-4" /> Change yatra</button>
      <div className="rounded-xl bg-white p-4 shadow">
        <p className="font-semibold text-slate-900">{selected.name}</p>
        <p className="text-xs text-slate-500">{formatDate(selected.startDate)}</p>
        {summary && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Booked" value={summary.bookedTravellers} />
            <Stat label="Checked in" value={summary.checkedInTravellers} tint="text-emerald-600" />
            <Stat label="Remaining" value={summary.remaining} tint="text-amber-600" />
          </div>
        )}
      </div>

      {!result && (
        <div className="mt-5">
          {!scanning ? (
            <button onClick={startScan} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-saffron py-5 text-lg font-semibold text-white shadow-lg"><ScanLine className="h-6 w-6" /> SCAN TICKET</button>
          ) : (
            <div>
              <div id="qr-reader" className="overflow-hidden rounded-2xl bg-black" />
              <button onClick={stopScan} className="mt-3 w-full rounded-xl border border-slate-500 py-2.5 text-sm font-semibold text-slate-200">Stop camera</button>
            </div>
          )}
          <div className="mt-4 rounded-xl bg-white/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300"><Keyboard className="h-3.5 w-3.5" /> Or enter ticket token manually</p>
            <div className="flex gap-2">
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="GMY-TKT-…" className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
              <button onClick={() => validate(manual)} disabled={busy} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900">Check</button>
            </div>
          </div>
        </div>
      )}

      {busy && <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}

      {result && (
        <div className="mt-5">
          {!result.valid ? (
            <ResultCard tone="red" icon={XCircle} title="Invalid Ticket" subtitle="This QR code is not recognised." />
          ) : result.alreadyCheckedIn ? (
            <>
              <ResultCard tone="amber" icon={AlertTriangle} title="Already Checked In"
                subtitle={result.checkIn ? `At ${new Date(result.checkIn.checkedInAt).toLocaleTimeString()} by ${result.checkIn.coordinatorName}` : ''} />
              <BookingCard b={result.booking!} />
            </>
          ) : (
            <>
              <ResultCard tone="green" icon={CheckCircle2} title="Valid Ticket" subtitle={`Booking ${result.booking?.reference}`} />
              <BookingCard b={result.booking!} />
              <button onClick={() => doCheckIn(result.booking!.ticket!.token)} disabled={busy}
                className="mt-4 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white shadow-lg disabled:opacity-60">
                CHECK IN ALL ({result.booking?.travellerCount})
              </button>
            </>
          )}
          <button onClick={() => { setResult(null); setManual(''); }} className="mt-3 w-full rounded-xl border border-slate-500 py-2.5 text-sm font-semibold text-slate-200">Scan another</button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ name, onLogout, children }: { name: string; onLogout: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900">
      <header className="flex items-center justify-between px-4 py-4">
        <span className="inline-flex items-center gap-2"><LotusMark className="h-6 w-6" color="#EFA43B" /><span className="font-display font-semibold text-white">Coordinator</span></span>
        <button onClick={onLogout} className="inline-flex items-center gap-1.5 text-sm text-slate-300"><LogOut className="h-4 w-4" /> {name.split(' ')[0]}</button>
      </header>
      <div className="mx-auto max-w-md px-4 pb-16">{children}</div>
    </div>
  );
}
function Stat({ label, value, tint = 'text-slate-900' }: { label: string; value: number; tint?: string }) {
  return <div className="rounded-lg bg-slate-50 py-2"><p className={`text-xl font-bold ${tint}`}>{value}</p><p className="text-[11px] text-slate-500">{label}</p></div>;
}
function ResultCard({ tone, icon: Icon, title, subtitle }: { tone: 'green' | 'amber' | 'red'; icon: React.ElementType; title: string; subtitle: string }) {
  const tones = { green: 'bg-emerald-600', amber: 'bg-amber-500', red: 'bg-red-600' };
  return (
    <div className={`flex items-center gap-3 rounded-2xl ${tones[tone]} p-5 text-white`}>
      <Icon className="h-9 w-9" />
      <div><p className="text-lg font-bold">{title}</p><p className="text-sm text-white/85">{subtitle}</p></div>
    </div>
  );
}
function BookingCard({ b }: { b: BookingView }) {
  return (
    <div className="mt-3 rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold text-slate-900">{b.reference}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{b.paymentStatus}</span></div>
      <p className="mt-1 text-sm text-slate-700">{b.customer?.fullName} · {b.yatraName}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> {b.travellerCount} travellers</p>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {b.travellers?.map((t, i) => <li key={t.id}>{i + 1}. {t.fullName} <span className="text-slate-400">({t.age})</span></li>)}
      </ul>
    </div>
  );
}
