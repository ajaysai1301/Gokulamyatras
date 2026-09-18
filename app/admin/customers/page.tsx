'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Loader2 } from 'lucide-react';
import { AdminShell, Modal } from '@/components/admin/admin-shell';
import { staffApi, ADMIN_TOKEN } from '@/lib/staff-client';
import { formatINR, formatDate } from '@/lib/format';
import { Customer, Booking } from '@/lib/domain/types';

interface Row extends Customer { totalBookings: number; lastBookingAt: string | null; }

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profile, setProfile] = useState<{ customer: Customer; bookings: Booking[] } | null>(null);

  const load = useCallback(() => { setLoading(true); staffApi<{ customers: Row[] }>(ADMIN_TOKEN, `/admin/customers?search=${encodeURIComponent(search)}`).then((d) => setRows(d.customers)).catch(() => {}).finally(() => setLoading(false)); },[search]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const view = async (id: string) => { const d = await staffApi<{ customer: Customer; bookings: Booking[] }>(ADMIN_TOKEN, `/admin/customers/${id}`); setProfile(d); };

  return (
    <AdminShell title="Customers">
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, mobile, email" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-saffron" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Last booking</th><th className="px-4 py-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (<tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>) :
            rows.length === 0 ? (<tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No customers yet</td></tr>) :
            rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{c.mobile}</td>
                <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{c.totalBookings}</td>
                <td className="px-4 py-3 text-slate-600">{c.lastBookingAt ? formatDate(c.lastBookingAt) : '—'}</td>
                <td className="px-4 py-3"><button onClick={() => view(c.id)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!profile} onClose={() => setProfile(null)} title={profile?.customer.fullName || ''} wide>
        {profile && (
          <div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><p className="text-xs uppercase text-slate-400">Mobile</p><p className="font-medium">{profile.customer.mobile}</p></div>
              <div><p className="text-xs uppercase text-slate-400">Email</p><p className="font-medium">{profile.customer.email || '—'}</p></div>
              <div><p className="text-xs uppercase text-slate-400">Address</p><p className="font-medium">{profile.customer.address || '—'}</p></div>
              <div><p className="text-xs uppercase text-slate-400">Bookings</p><p className="font-medium">{profile.bookings.length}</p></div>
            </div>
            <p className="mt-6 mb-2 text-xs font-semibold uppercase text-slate-400">Booking history</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Yatra</th><th className="px-3 py-2">Pax</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{profile.bookings.map((b) => (<tr key={b.id}><td className="px-3 py-2 font-mono">{b.reference}</td><td className="px-3 py-2">{b.yatraName}</td><td className="px-3 py-2">{b.travellerCount}</td><td className="px-3 py-2">{formatINR(b.totalAmount)}</td><td className="px-3 py-2">{b.status}</td></tr>))}</tbody></table>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
