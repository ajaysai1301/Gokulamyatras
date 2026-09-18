'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CalendarDays, Clock, MapPin, Users, ArrowRight, Check, X, Info, FileText,
  ChevronLeft, ShieldCheck, AlarmClock, Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { AvailabilityBadge } from '@/components/site/yatra-card';
import { OrnamentDivider } from '@/components/site/decorative';
import { fetchYatra } from '@/lib/api-client';
import { formatINR, formatDate, durationLabel } from '@/lib/format';
import { YatraView } from '@/lib/domain/types';

export default function YatraDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;
  const [yatra, setYatra] = useState<YatraView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetchYatra(slug)
      .then(setYatra)
      .catch(() => setYatra(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-cream">
        <Navbar variant="solid" />
        <div className="container flex min-h-[70vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-sand border-t-brand-saffron" />
        </div>
      </main>
    );
  }

  if (!yatra) {
    return (
      <main className="min-h-screen bg-brand-cream">
        <Navbar variant="solid" />
        <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center">
          <OrnamentDivider className="mb-6" />
          <h1 className="heading-serif text-3xl">Yatra not found</h1>
          <p className="mt-3 max-w-md text-brand-muted">The journey you are looking for may have moved or is no longer available.</p>
          <Link href="/yatras" className="btn-primary mt-8">Browse all yatras <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <Footer />
      </main>
    );
  }

  const onViewTerms = () =>
    window.open(`/api/yatras/${yatra.slug}/terms`, '_blank', 'noopener,noreferrer');

  return (
    <main className="min-h-screen bg-brand-cream">
      <Navbar variant="overlay" />

      {/* ===== HERO ===== */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <img src={yatra.heroImage} alt={yatra.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="container relative z-10 pb-14 pt-32">
          <Link href="/yatras" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
            <ChevronLeft className="h-4 w-4" /> All yatras
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <AvailabilityBadge yatra={yatra} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <MapPin className="h-3.5 w-3.5" /> {yatra.destination}
            </span>
          </div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white text-balance sm:text-5xl md:text-6xl">
            {yatra.name}
          </motion.h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{yatra.subtitle}</p>
        </div>
      </section>

      {/* ===== BODY ===== */}
      <section className="py-14 md:py-20">
        <div className="container grid gap-12 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-16 lg:col-span-2">
            {/* Quick facts */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: CalendarDays, label: 'Date', value: formatDate(yatra.startDate) },
                { icon: Clock, label: 'Duration', value: durationLabel(yatra.durationDays, yatra.durationNights) },
                { icon: Navigation, label: 'From', value: yatra.startingPoint },
                { icon: Users, label: 'Availability', value: yatra.availability.isFull ? 'Full' : `${yatra.availability.available} seats` },
              ].map((f) => (
                <div key={f.label} className="card-premium p-4 text-center sm:p-5">
                  <f.icon className="mx-auto mb-2 h-5 w-5 text-brand-saffron" />
                  <p className="text-[11px] uppercase tracking-wide text-brand-muted">{f.label}</p>
                  <p className="mt-1 text-sm font-semibold text-brand-ink">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Overview */}
            <div>
              <span className="eyebrow">Journey overview</span>
              <h2 className="mt-3 heading-serif text-3xl">A pilgrimage to remember</h2>
              <p className="mt-5 text-base leading-relaxed text-brand-ink/80">{yatra.description}</p>
              {yatra.highlights?.length > 0 && (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {yatra.highlights.map((h) => (
                    <div key={h} className="flex items-start gap-3 rounded-xl bg-brand-sand/40 px-4 py-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-saffron" />
                      <span className="text-sm text-brand-ink/80">{h}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Itinerary timeline */}
            <div>
              <span className="eyebrow">Itinerary</span>
              <h2 className="mt-3 heading-serif text-3xl">Day-by-day plan</h2>
              <div className="mt-8 space-y-10">
                {yatra.itinerary.map((day) => (
                  <div key={day.day}>
                    <div className="mb-5 flex items-center gap-4">
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-saffron text-white">
                        <span className="text-[10px] uppercase leading-none opacity-80">Day</span>
                        <span className="font-display text-lg font-semibold leading-none">{day.day}</span>
                      </span>
                      <h3 className="heading-serif text-xl">{day.title}</h3>
                    </div>
                    <div className="ml-6 space-y-6 border-l-2 border-dashed border-brand-gold/40 pl-8">
                      {day.items.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: idx * 0.05 }}
                          className="relative"
                        >
                          <span className="absolute -left-[41px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand-saffron bg-brand-cream">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-saffron" />
                          </span>
                          <div className="flex items-center gap-2 text-sm font-semibold text-brand-saffronDark">
                            <AlarmClock className="h-4 w-4" /> {item.time}
                          </div>
                          <p className="mt-1 font-medium text-brand-ink">{item.title}</p>
                          {item.description && <p className="mt-0.5 text-sm text-brand-muted">{item.description}</p>}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Included / Excluded */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="card-premium p-7">
                <h3 className="heading-serif text-lg text-brand-moss">What&apos;s included</h3>
                <ul className="mt-4 space-y-3">
                  {yatra.included.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-brand-ink/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-moss" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-premium p-7">
                <h3 className="heading-serif text-lg text-brand-maroon">What&apos;s not included</h3>
                <ul className="mt-4 space-y-3">
                  {yatra.excluded.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-brand-ink/80">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-brand-maroon" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Important info */}
            {yatra.importantInfo?.length > 0 && (
              <div className="rounded-2xl border border-brand-gold/30 bg-brand-marigold/10 p-7">
                <h3 className="flex items-center gap-2 heading-serif text-lg">
                  <Info className="h-5 w-5 text-brand-saffronDark" /> Important information
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {yatra.importantInfo.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-brand-ink/80">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-saffron" /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Terms */}
            <div className="rounded-2xl border border-brand-sand bg-brand-ivory p-7 shadow-soft">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="heading-serif text-lg">Terms &amp; Conditions</h3>
                  <p className="mt-1 text-sm text-brand-muted">Version {yatra.tcVersion} · Applicable to this yatra</p>
                </div>
                <button onClick={onViewTerms} className="btn-ghost shrink-0">
                  <FileText className="h-4 w-4" /> View Terms &amp; Conditions PDF
                </button>
              </div>
            </div>
          </div>

          {/* Sticky booking summary */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28">
              <div className="card-premium overflow-hidden">
                <div className="border-b border-brand-sand bg-brand-sand/30 p-6">
                  <p className="text-xs uppercase tracking-wide text-brand-muted">Starting from</p>
                  <p className="font-display text-3xl font-semibold text-brand-ink">
                    {formatINR(yatra.price)} <span className="text-base font-normal text-brand-muted">/ person</span>
                  </p>
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-muted">Date</span>
                    <span className="font-medium text-brand-ink">{formatDate(yatra.startDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-muted">Duration</span>
                    <span className="font-medium text-brand-ink">{durationLabel(yatra.durationDays, yatra.durationNights)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-muted">Reporting</span>
                    <span className="font-medium text-brand-ink">{yatra.reportingTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-muted">Availability</span>
                    <AvailabilityBadge yatra={yatra} />
                  </div>

                  <button
                    onClick={() => { if (!yatra.availability.isFull) router.push(`/yatras/${yatra.slug}/book`); }}
                    disabled={yatra.availability.isFull}
                    className="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {yatra.availability.isFull ? 'Fully Booked' : (<>Book Your Seat <ArrowRight className="h-4 w-4" /></>)}
                  </button>
                  <p className="text-center text-xs text-brand-muted">Reporting at {yatra.reportingLocation}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
