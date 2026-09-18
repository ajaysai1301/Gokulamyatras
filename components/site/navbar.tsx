'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, ArrowRight, LogIn } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Wordmark } from '@/components/site/decorative';

const NAV_LINKS = [
  { label: 'Yatras', href: '/yatras' },
  { label: 'How it works', href: '/#how' },
  { label: 'Why us', href: '/#why' },
  { label: 'Destinations', href: '/#destinations' },
  { label: 'Contact', href: '/#contact' },
];

export function Navbar({ variant = 'solid' }: { variant?: 'overlay' | 'solid' }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isTransparent = variant === 'overlay' && !scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        isTransparent
          ? 'bg-transparent'
          : 'border-b border-brand-sand/70 bg-brand-cream/85 backdrop-blur-md shadow-soft'
      }`}
    >
      <nav className="container flex h-16 items-center justify-between md:h-20">
        <Link href="/" aria-label="GokulamYatras home">
          <Wordmark dark={isTransparent} />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                isTransparent ? 'text-white/90 hover:text-white' : 'text-brand-ink/80 hover:text-brand-saffronDark'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/yatras" className="btn-primary hidden sm:inline-flex">
            Explore Yatras <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/signin" className={`hidden items-center gap-1.5 text-sm font-semibold sm:inline-flex ${isTransparent ? 'text-white' : 'text-brand-ink'}`}><LogIn className="h-4 w-4" /> Sign in</Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full lg:hidden ${
                  isTransparent ? 'text-white' : 'text-brand-ink'
                }`}
              >
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86%] max-w-sm border-brand-sand bg-brand-cream">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="mb-8 mt-2">
                <Wordmark />
              </div>
              <div className="flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3.5 text-base font-medium text-brand-ink transition-colors hover:bg-brand-sand/60"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
              <Link href="/yatras" onClick={() => setOpen(false)} className="btn-primary mt-6 w-full">
                Explore Yatras <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/signin" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-brand-sand px-4 py-3 font-semibold text-brand-ink"><LogIn className="h-4 w-4" /> Sign in</Link>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
