'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TicketCheck, CheckCircle2, Clock, Users, IndianRupee, ScanLine, CalendarClock } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { staffApi, ADMIN_TOKEN } from '@/lib/staff-client';
import { formatINR, formatDate } from '@/lib/format';

interface Metrics {
  upcomingYatras: number; totalBookings: number; confirmedBookings: number; pendingPayments: number;
  totalTravellers: number; revenue: number; todayCheckins: number;
  capacity: Array<{ id: string; name: string; startDate: string; booked: number; capacity: number; available: number }>;
}

export default function AdminDashboardPage() {
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => { staffApi<Metrics>(ADMIN_TOKEN, '/admin/dashboard').then(setM).catch(() => {}); }, []);

  const cards = [
    { label: 'Upcoming Yatras', value: m?.upcomingYatras ?? '—', icon: CalendarClock, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Total Bookings', value: m?.totalBookings ?? '—', icon: TicketCheck, tint: 'bg-amber-50 text-amber-600' },
    { label: 'Confirmed', value: m?.confirmedBookings ?? '—', icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending Payments', value: m?.pendingPayments ?? '—', icon: Clock, tint: 'bg-orange-50 text-orange-600' },
    { label: 'Travellers', value: m?.totalTravellers ?? '—', icon: Users, tint: 'bg-violet-50 text-violet-600' },
    { label: 'Revenue', value: m ? formatINR(m.revenue) : '—', icon: IndianRupee, tint: 'bg-green-50 text-green-600' },
    { label: "Today's Check-ins", value: m?.todayCheckins ?? '—', icon: ScanLine, tint: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.tint}`}><c.icon className="h-5 w-5" /></div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Upcoming yatra capacity</h2>
          <Link href="/admin/yatras" className="text-sm font-medium text-brand-saffronDark hover:underline">Manage yatras</Link>
        </div>
        <div className="space-y-4">
          {(m?.capacity ?? []).map((y) => {
            const pct = y.capacity ? Math.round((y.booked / y.capacity) * 100) : 0;
            return (
              <div key={y.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{y.name} <span className="text-slate-400">· {formatDate(y.startDate)}</span></span>
                  <span className="text-slate-500">{y.booked} / {y.capacity} · {y.available} left</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>
            );
          })}
          {m && m.capacity.length === 0 && <p className="text-sm text-slate-500">No upcoming yatras.</p>}
        </div>
      </div>
    </AdminShell>
  );
}
