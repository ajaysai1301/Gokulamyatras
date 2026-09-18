'use client';

import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Wordmark, OrnamentDivider } from '@/components/site/decorative';

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-ink text-brand-cream">
      <div className="paper-texture absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="container relative py-16">
        <OrnamentDivider className="mb-12 opacity-80" />
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Wordmark dark />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-brand-cream/70">
              Sacred journeys, crafted with devotion. Trusted pilgrimage travel across India with comfort and care.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-marigold">Explore</h4>
            <ul className="space-y-3 text-sm text-brand-cream/75">
              <li><Link href="/yatras" className="hover:text-white">Upcoming Yatras</Link></li>
              <li><Link href="/#how" className="hover:text-white">How it works</Link></li>
              <li><Link href="/#why" className="hover:text-white">Why GokulamYatras</Link></li>
              <li><Link href="/#destinations" className="hover:text-white">Destinations</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-marigold">Support</h4>
            <ul className="space-y-3 text-sm text-brand-cream/75">
              <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/#contact" className="hover:text-white">Contact us</Link></li>
              <li><Link href="/booking" className="hover:text-white">Find my booking</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-marigold">Reach us</h4>
            <ul className="space-y-3 text-sm text-brand-cream/75">
              <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-brand-marigold" /> +91 98765 43210</li>
              <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-brand-marigold" /> care@gokulamyatras.in</li>
              <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-brand-marigold" /> Vijayawada, Andhra Pradesh</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-brand-cream/55 sm:flex-row">
          <p>© {new Date().getFullYear()} GokulamYatras. All rights reserved.</p>
          <p>Made with devotion · gokulamyatras.in</p>
        </div>
      </div>
    </footer>
  );
}
