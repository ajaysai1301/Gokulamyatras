'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Eye, Loader2, XCircle, Printer } from 'lucide-react';
import { AdminShell, Modal } from '@/components/admin/admin-shell';
import { staffApi, ADMIN_TOKEN } from '@/lib/staff-client';
import { Ticket } from '@/components/site/ticket';
import { formatINR, formatDate } from '@/lib/format';
import { BookingView, YatraView, Gender } from '@/lib/domain/types';

interface Row { id: string; reference: string; customerName: string; customerMobile: string; yatraName: string; travellerCount: number; totalAmount: number; status: string; paymentStatus: string; checkedIn: boolean; createdAt: string; }

const STATUS_BADGE: Record<string, string> = { CONFIRMED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-red-100 text-red-700', PAYMENT_PENDING: 'bg-amber-100 text-amber-700' };

export default function AdminBookingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [detail, setDetail] = useState<BookingView | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (status) qs.set('status', status);
    if (paymentStatus) qs.set('paymentStatus', paymentStatus);
    staffApi<{ bookings: Row[] }>(ADMIN_TOKEN, `/admin/bookings?${qs.toString()}`).then((d) => setRows(d.bookings)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [search, status, paymentStatus]);

  const view = async (reference: string) => {
    try { const d = await staffApi<{ booking: BookingView }>(ADMIN_TOKEN, `/admin/bookings/${reference}`); setDetail(d.booking); } catch { toast.error('Could not load booking'); }
  };
  const cancel = async (reference: string) => {
    if (!confirm('Cancel this booking? Seats will be released.')) return;
    try { await staffApi(ADMIN_TOKEN, `/admin/bookings/${reference}/cancel`, { method: 'POST' }); toast.success('Booking cancelled'); setDetail(null); load(); } catch { toast.error('Could not cancel'); }
  };

  return (
    <AdminShell title="Bookings">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ref, customer, mobile, email, yatra" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-saffron" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option><option>CONFIRMED</option><option>PAYMENT_PENDING</option><option>CANCELLED</option></select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All payments</option><option>PAID</option><option>PENDING</option><option>FAILED</option></select>
        <button onClick={() => setManualOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-saffron px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Manual booking</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>
            <th className="px-4 py-3">Booking</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Yatra</th><th className="px-4 py-3">Pax</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (<tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>) :
            rows.length === 0 ? (<tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No bookings found</td></tr>) :
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><span className="font-mono font-medium text-slate-900">{r.reference}</span></td>
                <td className="px-4 py-3"><div className="text-slate-900">{r.customerName}</div><div className="text-xs text-slate-500">{r.customerMobile}</div></td>
                <td className="px-4 py-3 text-slate-600">{r.yatraName}</td>
                <td className="px-4 py-3 text-slate-600">{r.travellerCount}</td>
                <td className="px-4 py-3 text-slate-600">{formatINR(r.totalAmount)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-slate-600">{r.paymentStatus}</td>
                <td className="px-4 py-3">{r.checkedIn ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3"><button onClick={() => view(r.reference)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Booking ${detail.reference}` : ''} wide>
        {detail && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 text-sm">
              <div><p className="text-xs uppercase text-slate-400">Customer</p><p className="font-medium">{detail.customer?.fullName}</p><p className="text-slate-500">{detail.customer?.mobile} · {detail.customer?.email || '—'}</p></div>
              <div><p className="text-xs uppercase text-slate-400">Yatra</p><p className="font-medium">{detail.yatraName}</p><p className="text-slate-500">{formatDate(detail.yatraStartDate)}</p></div>
              <div><p className="text-xs uppercase text-slate-400">Travellers ({detail.travellerCount})</p><ul className="mt-1 space-y-1">{detail.travellers.map((t, i) => <li key={t.id}>{i + 1}. {t.fullName} · {t.age}/{t.gender[0]} {t.idProofType ? `· ${t.idProofType} ${t.idProofNumber || ''}` : ''}</li>)}</ul></div>
              <div><p className="text-xs uppercase text-slate-400">Payments</p>{detail.payments.map((p) => <p key={p.id} className="text-slate-600">{p.method} · {p.status} · {formatINR(p.amount)}</p>)}</div>
              <div><p className="text-xs uppercase text-slate-400">T&C Consent</p><p className="text-slate-600">{detail.consent ? `v${detail.consent.version} · agreed ${formatDate(detail.consent.agreedAt)}` : 'None'}</p></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"><Printer className="h-4 w-4" /> Print ticket</button>
                {detail.status !== 'CANCELLED' && <button onClick={() => cancel(detail.reference)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600"><XCircle className="h-4 w-4" /> Cancel booking</button>}
              </div>
            </div>
            <div>{detail.ticket ? <Ticket booking={detail} /> : <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No ticket (payment not confirmed)</div>}</div>
          </div>
        )}
      </Modal>

      <ManualBooking open={manualOpen} onClose={() => setManualOpen(false)} onDone={() => { setManualOpen(false); load(); }} />
    </AdminShell>
  );
}

function ManualBooking({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [yatras, setYatras] = useState<YatraView[]>([]);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState(''); const [mobile, setMobile] = useState('');
  const [count, setCount] = useState(1);
  const [method, setMethod] = useState('CASH');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) staffApi<{ yatras: YatraView[] }>(ADMIN_TOKEN, '/admin/yatras').then((d) => setYatras(d.yatras.filter((y) => y.status === 'PUBLISHED'))); }, [open]);

  const save = async () => {
    if (!slug || !name || !mobile) { toast.error('Yatra, name and mobile are required'); return; }
    setSaving(true);
    const travellers = Array.from({ length: count }, (_, i) => ({ fullName: i === 0 ? name : `${name} (guest ${i})`, age: 30, gender: Gender.OTHER }));
    try {
      await staffApi(ADMIN_TOKEN, '/admin/bookings', { method: 'POST', body: JSON.stringify({ yatraSlug: slug, primaryCustomer: { fullName: name, mobile }, travellers, paymentMethod: method }) });
      toast.success('Manual booking created & confirmed'); onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create manual booking">
      <div className="space-y-3 text-sm">
        <label>Yatra<select className="gy-input mt-1" value={slug} onChange={(e) => setSlug(e.target.value)}><option value="">Select yatra</option>{yatras.map((y) => <option key={y.id} value={y.slug}>{y.name} ({y.availability.available} left)</option>)}</select></label>
        <label>Customer name<input className="gy-input mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Mobile<input className="gy-input mt-1" value={mobile} onChange={(e) => setMobile(e.target.value)} /></label>
        <label>Travellers<input type="number" min={1} className="gy-input mt-1" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value)))} /></label>
        <label>Payment method<select className="gy-input mt-1" value={method} onChange={(e) => setMethod(e.target.value)}><option>CASH</option><option>UPI</option><option>BANK_TRANSFER</option><option>RAZORPAY</option></select></label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-saffron px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create & confirm</button>
      </div>
    </Modal>
  );
}
