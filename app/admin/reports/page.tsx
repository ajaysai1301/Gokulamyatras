'use client';

import React, { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { staffApi, ADMIN_TOKEN } from '@/lib/staff-client';
import { formatINR, formatDate } from '@/lib/format';
import { csvCell } from '@/lib/csv';

interface ReportRow { id: string; name: string; startDate: string; capacity: number; booked: number; available: number; confirmed: number; pending: number; cancelled: number; checkedIn: number; revenue: number; }

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { staffApi<{ reports: ReportRow[] }>(ADMIN_TOKEN, '/admin/reports').then((d) => setRows(d.reports)).catch(() => {}).finally(() => setLoading(false)); }, []);

  const exportCsv = () => {
    const headers = ['Yatra', 'Date', 'Capacity', 'Booked', 'Available', 'Confirmed', 'Pending', 'Cancelled', 'CheckedIn', 'Revenue'];
    const lines = rows.map((r) => [r.name, formatDate(r.startDate), r.capacity, r.booked, r.available, r.confirmed, r.pending, r.cancelled, r.checkedIn, r.revenue].map(csvCell).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gokulamyatras-report.csv'; a.click();
  };

  return (
    <AdminShell title="Reports">
      <div className="mb-4 flex justify-end"><button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-saffron px-4 py-2 text-sm font-semibold text-white"><Download className="h-4 w-4" /> Export CSV</button></div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>
            <th className="px-4 py-3">Yatra</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Cap</th><th className="px-4 py-3">Booked</th><th className="px-4 py-3">Avail</th><th className="px-4 py-3">Confirmed</th><th className="px-4 py-3">Pending</th><th className="px-4 py-3">Cancelled</th><th className="px-4 py-3">Checked in</th><th className="px-4 py-3">Revenue</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (<tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>) :
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(r.startDate)}</td>
                <td className="px-4 py-3">{r.capacity}</td><td className="px-4 py-3">{r.booked}</td><td className="px-4 py-3">{r.available}</td>
                <td className="px-4 py-3 text-emerald-600">{r.confirmed}</td><td className="px-4 py-3 text-amber-600">{r.pending}</td><td className="px-4 py-3 text-red-600">{r.cancelled}</td>
                <td className="px-4 py-3">{r.checkedIn}</td><td className="px-4 py-3 font-medium">{formatINR(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
