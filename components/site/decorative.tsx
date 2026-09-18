'use client';

import React from 'react';

/** Minimal lotus/mandala mark used in the wordmark and section dividers. */
export function LotusMark({ className = 'h-7 w-7', color = '#D9761E' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <path d="M24 6c2.5 4 2.5 9 0 13-2.5-4-2.5-9 0-13Z" fill={color} />
      <path d="M24 42c-3.2-3.3-8-4.8-12.6-4 1.2-4.5 4.8-8.1 9.3-9.3M24 42c3.2-3.3 8-4.8 12.6-4-1.2-4.5-4.8-8.1-9.3-9.3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 42c0-6 3-11 8-14M24 42c0-6-3-11-8-14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="30" r="3" fill={color} />
    </svg>
  );
}

export function Wordmark({ dark = false, className = '' }: { dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LotusMark className="h-8 w-8" color={dark ? '#EFA43B' : '#D9761E'} />
      <span className="leading-none">
        <span className={`font-display text-xl font-semibold tracking-tight ${dark ? 'text-white' : 'text-brand-ink'}`}>Gokulam</span>
        <span className={`font-display text-xl font-semibold tracking-tight ${dark ? 'text-brand-marigold' : 'text-brand-saffron'}`}>Yatras</span>
      </span>
    </span>
  );
}

/** Ornamental divider used between sections. */
export function OrnamentDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-brand-gold/60" />
      <LotusMark className="h-5 w-5" color="#B9924A" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-brand-gold/60" />
    </div>
  );
}
