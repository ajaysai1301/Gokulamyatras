'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin, ArrowRight } from 'lucide-react';
import { YatraView } from '@/lib/domain/types';
import { formatINR, formatDate, durationLabel } from '@/lib/format';

export function AvailabilityBadge({ yatra }: { yatra: YatraView }) {
  const { availability } = yatra;
  if (availability.isFull) {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-maroon/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
        Fully Booked
      </span>
    );
  }
  if (availability.available <= 10) {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-saffron px-3 py-1 text-xs font-semibold text-white backdrop-blur">
        {availability.available} seats left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-brand-moss/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
      Available
    </span>
  );
}

export function YatraCard({ yatra, index = 0 }: { yatra: YatraView; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="group card-premium flex flex-col overflow-hidden transition-shadow duration-500 hover:shadow-premium"
    >
      <Link href={`/yatras/${yatra.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <img
          src={yatra.heroImage}
          alt={yatra.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
        <div className="absolute left-4 top-4">
          <AvailabilityBadge yatra={yatra} />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-xs font-medium text-white/90">
          <MapPin className="h-3.5 w-3.5" /> {yatra.destination}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="heading-serif text-xl leading-snug">{yatra.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-muted">{yatra.subtitle}</p>

        <div className="mt-5 space-y-2 text-sm text-brand-ink/75">
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-saffron" /> {formatDate(yatra.startDate)}</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-saffron" /> {durationLabel(yatra.durationDays, yatra.durationNights)}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-saffron" /> Starting from {yatra.startingPoint}</div>
        </div>

        <div className="mt-6 flex items-end justify-between border-t border-brand-sand pt-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-muted">Starting from</p>
            <p className="font-display text-2xl font-semibold text-brand-ink">
              {formatINR(yatra.price)} <span className="text-sm font-normal text-brand-muted">/ person</span>
            </p>
          </div>
          <Link
            href={`/yatras/${yatra.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-sand px-4 py-2.5 text-sm font-semibold text-brand-ink transition-colors group-hover:bg-brand-saffron group-hover:text-white"
          >
            Explore <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
