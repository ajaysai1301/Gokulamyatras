'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { YatraCard } from '@/components/site/yatra-card';
import { OrnamentDivider } from '@/components/site/decorative';
import { fetchYatras } from '@/lib/api-client';
import { YatraView } from '@/lib/domain/types';

type Filter = 'upcoming' | 'past';

export default function YatrasPage() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [yatras, setYatras] = useState<YatraView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchYatras(filter)
      .then(setYatras)
      .catch(() => setYatras([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <main className="min-h-screen bg-brand-cream">
      <Navbar variant="solid" />

      {/* Page header */}
      <section className="relative overflow-hidden bg-brand-ink pb-16 pt-32 text-center text-brand-cream md:pb-20 md:pt-40">
        <div className="paper-texture absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="container relative">
          <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="eyebrow text-brand-marigold">
            Our Yatras
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }} className="mt-4 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
            Choose your <span className="text-brand-marigold">sacred journey</span>
          </motion.h1>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-brand-cream/70">
            Every yatra is thoughtfully arranged for comfort and devotion. Reserve your seat and travel with complete peace of mind.
          </p>
          <OrnamentDivider className="mt-8" />
        </div>
      </section>

      {/* Filter + grid */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mb-10 flex justify-center">
            <div className="inline-flex rounded-full border border-brand-sand bg-brand-ivory p-1 shadow-soft">
              {(['upcoming', 'past'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-6 py-2.5 text-sm font-semibold capitalize transition-colors ${
                    filter === f ? 'bg-brand-saffron text-white shadow-soft' : 'text-brand-ink/70 hover:text-brand-ink'
                  }`}
                >
                  {f} Yatras
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="card-premium h-[26rem] animate-pulse bg-brand-sand/40" />)}
            </div>
          ) : yatras.length === 0 ? (
            <div className="mx-auto max-w-md rounded-3xl border border-brand-sand bg-brand-ivory p-12 text-center shadow-soft">
              <OrnamentDivider className="mb-6" />
              <h3 className="heading-serif text-2xl">{filter === 'past' ? 'No past yatras yet' : 'No upcoming yatras'}</h3>
              <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                {filter === 'past'
                  ? 'Completed yatras will appear here once a journey concludes.'
                  : 'New pilgrimages are being planned. Please check back soon or contact us to know more.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {yatras.map((y, i) => <YatraCard key={y.id} yatra={y} index={i} />)}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
