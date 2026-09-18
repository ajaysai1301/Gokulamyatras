'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { OrnamentDivider } from '@/components/site/decorative';

interface Props {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  align?: 'left' | 'center';
  dark?: boolean;
  ornament?: boolean;
}

export function SectionHeading({ eyebrow, title, description, align = 'center', dark = false, ornament = false }: Props) {
  const alignment = align === 'center' ? 'items-center text-center mx-auto' : 'items-start text-left';
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex max-w-2xl flex-col ${alignment}`}
    >
      {eyebrow && <span className="eyebrow mb-4">{eyebrow}</span>}
      <h2 className={`heading-serif text-3xl leading-[1.1] sm:text-4xl md:text-[2.75rem] ${dark ? 'text-white' : ''}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-5 text-base leading-relaxed ${dark ? 'text-brand-cream/70' : 'text-brand-muted'}`}>
          {description}
        </p>
      )}
      {ornament && <OrnamentDivider className={`mt-7 ${align === 'center' ? '' : 'self-start'}`} />}
    </motion.div>
  );
}
