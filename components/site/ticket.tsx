'use client';
import type { PublicBookingView } from '@/lib/services/public-booking';

import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Download, Printer, MapPin, CalendarDays, Clock, Users, ShieldCheck } from 'lucide-react';
import { PaymentStatus } from '@/lib/domain/types';
import { formatINR, formatDate } from '@/lib/format';
import { LotusMark } from '@/components/site/decorative';

export function Ticket({ booking }: { booking: PublicBookingView }) {
  const ref = useRef<HTMLDivElement>(null);
  const token = booking.ticket?.token || booking.reference;
  const paid = booking.paymentStatus === PaymentStatus.PAID;

  const download = async () => {
    if (!ref.current) return;
    const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `GokulamYatras-${booking.reference}.png`;
    a.click();
  };

  return (
    <div className="w-full">
      <div ref={ref} className="ticket-print mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-premium">
        {/* Header */}
        <div className="relative bg-brand-ink px-7 py-6 text-brand-cream">
          <div className="paper-texture absolute inset-0 opacity-25" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <LotusMark className="h-7 w-7" color="#EFA43B" />
              <span className="font-display text-lg font-semibold">GokulamYatras</span>
            </span>
            <span className="rounded-full bg-brand-marigold/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-marigold">
              e-Travel Pass
            </span>
          </div>
        </div>

        {/* Yatra strip */}
        <div className="bg-brand-saffron px-7 py-4 text-white">
          <p className="text-[11px] uppercase tracking-widest text-white/80">Yatra</p>
          <p className="font-display text-xl font-semibold leading-tight">{booking.yatraName}</p>
        </div>

        {/* Body */}
        <div className="grid grid-cols-5 gap-4 px-7 py-6">
          <div className="col-span-3 space-y-3.5">
            <Row icon={CalendarDays} label="Date" value={formatDate(booking.yatraStartDate)} />
            <Row icon={Clock} label="Reporting" value={booking.reportingTime} />
            <Row icon={MapPin} label="Reporting point" value={booking.reportingLocation} />
            <Row icon={Users} label="Travellers" value={String(booking.travellerCount)} />
          </div>
          <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl bg-brand-cream p-3">
            <QRCodeCanvas value={token} size={112} fgColor="#26190f" bgColor="#FBF6EC" level="M" includeMargin={false} />
            <p className="mt-2 text-center text-[9px] leading-tight text-brand-muted">Scan at reporting point</p>
          </div>
        </div>

        {/* Perforation */}
        <div className="relative border-t-2 border-dashed border-brand-sand">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-brand-cream" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-brand-cream" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-brand-muted">Booking ID</p>
            <p className="font-mono text-sm font-semibold text-brand-ink">{booking.reference}</p>
            <p className="mt-1 text-xs text-brand-muted">{booking.customer?.fullName}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-brand-muted">Amount</p>
            <p className="font-display text-lg font-semibold text-brand-ink">{formatINR(booking.totalAmount)}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${paid ? 'bg-brand-moss/15 text-brand-moss' : 'bg-brand-marigold/20 text-brand-saffronDark'}`}>
              {paid ? 'PAID' : booking.paymentStatus}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-brand-sand bg-brand-cream/60 px-7 py-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-saffron" />
          <p className="text-[11px] leading-relaxed text-brand-muted">
            Please carry a valid photo ID for every traveller. Reach the reporting point 30 minutes early. This pass is required for check-in.
          </p>
        </div>
      </div>

      <div className="no-print mt-6 flex justify-center gap-3">
        <button onClick={download} className="btn-primary"><Download className="h-4 w-4" /> Download</button>
        <button onClick={() => window.print()} className="btn-ghost"><Printer className="h-4 w-4" /> Print</button>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-saffron" />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-brand-muted">{label}</p>
        <p className="text-sm font-medium text-brand-ink">{value}</p>
      </div>
    </div>
  );
}
