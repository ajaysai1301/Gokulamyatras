'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, Ticket as TicketIcon } from 'lucide-react';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { Ticket } from '@/components/site/ticket';
import { OrnamentDivider } from '@/components/site/decorative';
import { formatDate } from '@/lib/format';
import { BookingView, BookingStatus } from '@/lib/domain/types';

export default function BookingLookupPage() {
  const [reference, setReference] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingView | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setBooking(null);
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: reference.trim(), mobile: mobile.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Booking not found'); return; }
      setBooking(data.booking);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-cream">
      <Navbar variant="solid" />
      <section className="container pt-32 pb-20">
        <div className="mx-auto max-w-xl text-center">
          <span className="eyebrow">Manage booking</span>
          <h1 className="mt-3 heading-serif text-4xl">Find your booking &amp; ticket</h1>
          <p className="mt-3 text-brand-muted">Enter your Booking ID and the mobile number used while booking.</p>
          <OrnamentDivider className="mt-6" />
        </div>

        <form onSubmit={search} className="mx-auto mt-10 max-w-xl card-premium p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Booking ID</span>
              <input className="gy-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="GMY-2026-00001" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Mobile number</span>
              <input className="gy-input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="10-digit mobile" /></label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-6 w-full disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find my booking
          </button>
          {error && <p className="mt-4 text-center text-sm text-brand-maroon">{error}</p>}
        </form>

        {booking && (
          <div className="mx-auto mt-12 max-w-md">
            <div className="mb-5 flex items-center justify-center gap-2 text-sm text-brand-muted">
              <TicketIcon className="h-4 w-4 text-brand-saffron" />
              Status: <span className="font-semibold text-brand-ink">{booking.status}</span> · {formatDate(booking.yatraStartDate)}
            </div>
            {booking.status === BookingStatus.CONFIRMED && booking.ticket ? (
              <Ticket booking={booking} />
            ) : (
              <div className="card-premium p-8 text-center">
                <p className="heading-serif text-xl">Ticket not available yet</p>
                <p className="mt-2 text-sm text-brand-muted">A travel pass is issued once your payment is confirmed. Current payment status: <span className="font-semibold">{booking.paymentStatus}</span>.</p>
              </div>
            )}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
