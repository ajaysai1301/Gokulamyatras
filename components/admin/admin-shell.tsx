'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, MapPinned, TicketCheck, Users, ScanLine, BarChart3, LogOut, Menu, X,
} from 'lucide-react';
import { ADMIN_TOKEN, getAuth, clearAuth } from '@/lib/staff-client';
import { LotusMark } from '@/components/site/decorative';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/yatras', label: 'Yatras', icon: MapPinned },
  { href: '/admin/bookings', label: 'Bookings', icon: TicketCheck },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/checkins', label: 'Check-ins', icon: ScanLine },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Users },
  { href: '/admin/homepage', label: 'Homepage', icon: LayoutDashboard },
  { href: '/admin/payments', label: 'Payments', icon: TicketCheck },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const auth = getAuth(ADMIN_TOKEN);
    if (!auth) { router.replace('/admin/login'); return; }
    setName(auth.name);
    setReady(true);
  }, [router]);

  const logout = () => { clearAuth(ADMIN_TOKEN); router.replace('/admin/login'); };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">Loading…</div>;
  }

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <LotusMark className="h-7 w-7" color="#EFA43B" />
        <span className="font-display text-lg font-semibold text-white">Gokulam<span className="text-brand-marigold">Admin</span></span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-brand-saffron text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}>
              <n.icon className="h-4.5 w-4.5" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={logout} className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
        <LogOut className="h-4.5 w-4.5" /> Logout
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-slate-900 lg:block">{SidebarInner}</aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">{SidebarInner}</aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="hidden sm:inline">{name}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-saffron text-xs font-semibold text-white">{name.slice(0, 1)}</span>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/** Lightweight modal used across admin screens. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className={`my-8 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
