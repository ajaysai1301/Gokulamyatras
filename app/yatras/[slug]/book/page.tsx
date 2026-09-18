'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, Plus, Trash2, Check, ShieldCheck, CreditCard,
  CheckCircle2, Loader2, AlertTriangle, FileText, PartyPopper,
} from 'lucide-react';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { Ticket } from '@/components/site/ticket';
import { fetchYatra } from '@/lib/api-client';
import { formatINR, formatDate, durationLabel } from '@/lib/format';
import { YatraView, Gender, BookingView } from '@/lib/domain/types';

type TravellerForm = {
  fullName: string; age: string; gender: Gender;
  idProofType: string; idProofNumber: string; specialRequirements: string;
};
const emptyTraveller = (): TravellerForm => ({ fullName: '', age: '', gender: Gender.MALE, idProofType: '', idProofNumber: '', specialRequirements: '' });

const STEPS = ['Travellers', 'Review', 'Terms', 'Payment', 'Confirmed'];

export default function BookYatraPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;
  const [yatra, setYatra] = useState<YatraView | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);

  const [primary, setPrimary] = useState({ fullName: '', mobile: '', email: '', address: '', emergencyContactName: '', emergencyContactPhone: '' });
  const [travellers, setTravellers] = useState<TravellerForm[]>([emptyTraveller()]);
  const [agreed, setAgreed] = useState(false);

  const requestKey=useRef<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState<BookingView | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchYatra(slug).then(setYatra).finally(() => setLoading(false));
  }, [slug]);

  const count = travellers.length;
  const total = yatra ? yatra.price * count : 0;

  const setTraveller = (i: number, patch: Partial<TravellerForm>) =>
    setTravellers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const validateStep0 = () => {
    if (primary.fullName.trim().length < 2) return 'Please enter the primary customer name';
    if (primary.mobile.replace(/\D/g, '').length < 10) return 'Please enter a valid 10-digit mobile number';
    for (const [i, t] of travellers.entries()) {
      if (t.fullName.trim().length < 2) return `Please enter name for traveller ${i + 1}`;
      if (!t.age || Number(t.age) < 1) return `Please enter a valid age for traveller ${i + 1}`;
    }
    return null;
  };

  const next = () => {
    if (step === 0) { const err = validateStep0(); if (err) { toast.error(err); return; } }
    if (step === 2 && !agreed) { toast.error('Please accept the Terms & Conditions to continue'); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function startPayment(outcome: 'success' | 'failed' | 'pending') {
    if (!yatra) return;
    setProcessing(true);
    try {
      let ref = bookingRef;
      let ord = orderId;
      if (!ref) {
        requestKey.current ||= crypto.randomUUID();
        const bRes = await fetch('/api/bookings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestKey:requestKey.current,
            yatraSlug: yatra.slug,
            primaryCustomer: primary,
            travellers: travellers.map((t) => ({ ...t, age: Number(t.age) })),
            acceptedTerms: agreed,
            termsVersion: yatra.tcVersion,
          }),
        });
        const bData = await bRes.json();
        if (!bRes.ok) { toast.error(bData.error || 'Could not create booking'); setProcessing(false); return; }
        ref = bData.booking.reference;
        setBookingRef(ref);
      }
      if(!ord) {
        const oRes = await fetch('/api/payments/order', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingReference: ref, mobile: primary.mobile }),
        });
        const oData = await oRes.json();
        if (!oRes.ok) { toast.error('Could not initiate payment'); setProcessing(false); return; }
        ord = oData.order.orderId;
        setOrderId(ord);
      }
      const vRes = await fetch('/api/payments/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference: ref, mobile: primary.mobile, orderId: ord, simulate: outcome }),
      });
      const vData = await vRes.json();
      if(!vRes.ok) {toast.error(vData.error || 'Payment could not be verified');return;}
      const status = vData?.result?.status;
      if (status === 'PAID') {
        const lRes = await fetch('/api/bookings/lookup', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref, mobile: primary.mobile }),
        });
        const lData = await lRes.json();
        setConfirmed(lData.booking);
        setStep(4);
        toast.success('Payment successful — your yatra is confirmed!');
      } else if (status === 'PENDING') {
        toast.warning('Payment is pending. You can retry once it settles.');
      } else {
        toast.error('Payment failed. Please try again.');
        setBookingRef(null); setOrderId(null); requestKey.current=null; // booking was cancelled + seats released
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream"><Navbar variant="solid" />
        <div className="container flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-saffron" />
        </div>
      </main>
    );
  }
  if (!yatra) {
    return (
      <main className="min-h-screen bg-brand-cream"><Navbar variant="solid" />
        <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
          <h1 className="heading-serif text-3xl">Yatra not found</h1>
          <Link href="/yatras" className="btn-primary mt-6">Browse yatras</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      <Navbar variant="solid" />
      <div className="container pt-28 pb-20">
        {/* Stepper */}
        <div className="no-print mx-auto mb-10 flex max-w-3xl items-center justify-between">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  i < step ? 'bg-brand-moss text-white' : i === step ? 'bg-brand-saffron text-white' : 'bg-brand-sand text-brand-muted'
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : String(i + 1).padStart(2, '0')}
                </div>
                <span className={`mt-2 hidden text-xs sm:block ${i === step ? 'font-semibold text-brand-ink' : 'text-brand-muted'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${i < step ? 'bg-brand-moss' : 'bg-brand-sand'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === 0 && (
              <div className="space-y-8">
                <section className="card-premium p-6 sm:p-8">
                  <h2 className="heading-serif text-xl">Primary customer</h2>
                  <p className="mt-1 text-sm text-brand-muted">The main contact for this booking.</p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field label="Full name *"><input className="gy-input" value={primary.fullName} onChange={(e) => setPrimary({ ...primary, fullName: e.target.value })} placeholder="e.g. Ravi Kumar" /></Field>
                    <Field label="Mobile *"><input className="gy-input" value={primary.mobile} onChange={(e) => setPrimary({ ...primary, mobile: e.target.value })} placeholder="10-digit mobile" /></Field>
                    <Field label="Email"><input className="gy-input" value={primary.email} onChange={(e) => setPrimary({ ...primary, email: e.target.value })} placeholder="you@email.com" /></Field>
                    <Field label="Address"><input className="gy-input" value={primary.address} onChange={(e) => setPrimary({ ...primary, address: e.target.value })} placeholder="City / area" /></Field>
                    <Field label="Emergency contact name"><input className="gy-input" value={primary.emergencyContactName} onChange={(e) => setPrimary({ ...primary, emergencyContactName: e.target.value })} /></Field>
                    <Field label="Emergency contact number"><input className="gy-input" value={primary.emergencyContactPhone} onChange={(e) => setPrimary({ ...primary, emergencyContactPhone: e.target.value })} /></Field>
                  </div>
                </section>

                <section className="card-premium p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="heading-serif text-xl">Travellers</h2>
                      <p className="mt-1 text-sm text-brand-muted">Add everyone travelling on this booking.</p>
                    </div>
                    <button onClick={() => setTravellers((p) => [...p, emptyTraveller()])} className="inline-flex items-center gap-1.5 rounded-full bg-brand-sand px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-saffron hover:text-white"><Plus className="h-4 w-4" /> Add</button>
                  </div>
                  <div className="mt-6 space-y-6">
                    {travellers.map((t, i) => (
                      <div key={i} className="rounded-2xl border border-brand-sand bg-brand-cream/50 p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="font-display text-sm font-semibold text-brand-saffronDark">Traveller {i + 1}</span>
                          {travellers.length > 1 && (
                            <button onClick={() => setTravellers((p) => p.filter((_, idx) => idx !== i))} className="text-brand-maroon hover:opacity-70"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Full name *"><input className="gy-input" value={t.fullName} onChange={(e) => setTraveller(i, { fullName: e.target.value })} /></Field>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Age *"><input className="gy-input" type="number" value={t.age} onChange={(e) => setTraveller(i, { age: e.target.value })} /></Field>
                            <Field label="Gender"><select className="gy-input" value={t.gender} onChange={(e) => setTraveller(i, { gender: e.target.value as Gender })}><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
                          </div>
                          <Field label="ID proof type"><input className="gy-input" value={t.idProofType} onChange={(e) => setTraveller(i, { idProofType: e.target.value })} placeholder="Aadhaar / PAN / Passport" /></Field>
                          <Field label="ID proof number"><input className="gy-input" value={t.idProofNumber} onChange={(e) => setTraveller(i, { idProofNumber: e.target.value })} /></Field>
                          <div className="sm:col-span-2"><Field label="Special requirements"><input className="gy-input" value={t.specialRequirements} onChange={(e) => setTraveller(i, { specialRequirements: e.target.value })} placeholder="Meals, wheelchair, etc." /></Field></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {step === 1 && (
              <section className="card-premium p-6 sm:p-8">
                <h2 className="heading-serif text-2xl">Review your booking</h2>
                <div className="mt-6 rounded-2xl bg-brand-sand/40 p-5">
                  <p className="font-display text-lg font-semibold">{yatra.name}</p>
                  <p className="text-sm text-brand-muted">{formatDate(yatra.startDate)} · {durationLabel(yatra.durationDays, yatra.durationNights)} · from {yatra.startingPoint}</p>
                </div>
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Primary customer</p>
                  <p className="mt-1 font-medium">{primary.fullName} · {primary.mobile}</p>
                </div>
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Travellers ({count})</p>
                  <ul className="mt-2 divide-y divide-brand-sand">
                    {travellers.map((t, i) => (
                      <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="font-medium">{i + 1}. {t.fullName}</span>
                        <span className="text-brand-muted">{t.age} yrs · {t.gender.toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={back} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-saffronDark"><ArrowLeft className="h-4 w-4" /> Edit details</button>
              </section>
            )}

            {step === 2 && (
              <section className="card-premium p-6 sm:p-8">
                <h2 className="heading-serif text-2xl">Terms &amp; Conditions</h2>
                <p className="mt-2 text-sm text-brand-muted">Please review the Terms &amp; Conditions specific to this yatra (Version {yatra.tcVersion}).</p>
                <a href={`/api/yatras/${yatra.slug}/terms?version=${encodeURIComponent(yatra.tcVersion)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-5"><FileText className="h-4 w-4" /> View / Print Terms &amp; Conditions</a>
                <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-sand bg-brand-cream/50 p-4">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 accent-brand-saffron" />
                  <span className="text-sm text-brand-ink">I have read, understood and agree to the Terms &amp; Conditions for this yatra.</span>
                </label>
              </section>
            )}

            {step === 3 && (
              <section className="card-premium p-6 sm:p-8">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-marigold/20 px-3 py-1.5 text-xs font-semibold text-brand-saffronDark"><AlertTriangle className="h-3.5 w-3.5" /> Mock payment (development mode)</div>
                <h2 className="heading-serif text-2xl">Payment</h2>
                <div className="mt-6 flex items-center justify-between rounded-2xl bg-brand-ink px-6 py-5 text-brand-cream">
                  <span className="text-sm text-brand-cream/70">Amount payable</span>
                  <span className="font-display text-3xl font-semibold text-white">{formatINR(total)}</span>
                </div>
                <p className="mt-4 text-sm text-brand-muted">This is a simulated payment. Choose an outcome to test the flow. Razorpay will be plugged in later without changing this booking.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <button disabled={processing} onClick={() => startPayment('success')} className="btn-primary justify-center disabled:opacity-60">{processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Success</button>
                  <button disabled={processing} onClick={() => startPayment('failed')} className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-maroon/40 px-5 py-3.5 text-sm font-semibold text-brand-maroon disabled:opacity-60">Failed</button>
                  <button disabled={processing} onClick={() => startPayment('pending')} className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-gold/50 px-5 py-3.5 text-sm font-semibold text-brand-saffronDark disabled:opacity-60">Pending</button>
                </div>
              </section>
            )}

            {step === 4 && confirmed && (
              <section>
                <div className="no-print mb-8 flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-moss/15 text-brand-moss"><PartyPopper className="h-8 w-8" /></div>
                  <h2 className="mt-5 heading-serif text-3xl">Booking Confirmed</h2>
                  <p className="mt-2 text-brand-muted">Your journey is confirmed. Booking ID <span className="font-mono font-semibold text-brand-ink">{confirmed.reference}</span></p>
                </div>
                <Ticket booking={confirmed} />
                <div className="no-print mt-8 flex justify-center gap-3">
                  <Link href="/yatras" className="btn-ghost">Explore more yatras</Link>
                  <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-6 py-3.5 text-sm font-semibold text-brand-saffronDark">Back to website</Link>
                </div>
              </section>
            )}

            {/* Nav buttons */}
            {step < 3 && (
              <div className="no-print mt-8 flex items-center justify-between">
                <button onClick={back} disabled={step === 0} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-muted disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Back</button>
                <button onClick={next} className="btn-primary">Continue <ArrowRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          {step < 4 && (
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-28">
                <div className="card-premium overflow-hidden">
                  <img src={yatra.heroImage} alt={yatra.name} className="h-32 w-full object-cover" />
                  <div className="space-y-4 p-6">
                    <p className="font-display text-lg font-semibold">{yatra.name}</p>
                    <div className="flex justify-between text-sm"><span className="text-brand-muted">Date</span><span className="font-medium">{formatDate(yatra.startDate)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-brand-muted">Price / person</span><span className="font-medium">{formatINR(yatra.price)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-brand-muted">Travellers</span><span className="font-medium">× {count}</span></div>
                    <div className="flex items-center justify-between border-t border-brand-sand pt-4">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="font-display text-2xl font-semibold text-brand-ink">{formatINR(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-brand-ink">{label}</span>
      {children}
    </label>
  );
}
