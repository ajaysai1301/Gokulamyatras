'use client';

import React, { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { staffApi, ADMIN_TOKEN } from '@/lib/staff-client';
import { formatDate } from '@/lib/format';
import { YatraView } from '@/lib/domain/types';

export default function AdminCheckinsPage() {
  const [yatras, setYatras] = useState<YatraView[]>([]);
  const [yatraId, setYatraId] = useState('');
  const [summary, setSummary] = useState<{ bookedTravellers: number; checkedInTravellers: number; remaining: number; confirmedBookings: number; checkedInBookings: number } | null>(null);

  useEffect(() => { staffApi<{ yatras: YatraView[] }>(ADMIN_TOKEN, '/admin/yatras').then((d) => setYatras(d.yatras)); }, []);
  useEffect(() => { if (yatraId) staffApi<NonNullable<typeof summary>>(ADMIN_TOKEN, `/checkin/summary?yatraId=${yatraId}`).then(setSummary).catch(() => setSummary(null)); }, [yatraId]);

  const pct = summary && summary.bookedTravellers ? Math.round((summary.checkedInTravellers / summary.bookedTravellers) * 100) : 0;

  return (
    <AdminShell title="Check-ins">
      <div className="max-w-md">
        <label className="text-sm text-slate-600">Select yatra
          <select className="gy-input mt-1" value={yatraId} onChange={(e) => setYatraId(e.target.value)}>
            <option value="">Choose a yatra…</option>
            {yatras.map((y) => <option key={y.id} value={y.id}>{y.name} · {formatDate(y.startDate)}</option>)}
          </select>
        </label>
      </div>

      {summary && (
        <div className="mt-6 max-w-2xl">
          <div className="grid grid-cols-3 gap-4">
            <Card label="Booked travellers" value={summary.bookedTravellers} />
            <Card label="Checked in" value={summary.checkedInTravellers} tint="text-emerald-600" />
            <Card label="Not checked in" value={summary.remaining} tint="text-amber-600" />
          </div>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">Check-in progress</span><span className="font-semibold">{pct}%</span></div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
            <p className="mt-3 text-sm text-slate-500">{summary.checkedInBookings} of {summary.confirmedBookings} confirmed bookings checked in.</p>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
function Card({ label, value, tint = 'text-slate-900' }: { label: string; value: number; tint?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 text-center"><p className={`text-3xl font-bold ${tint}`}>{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}
