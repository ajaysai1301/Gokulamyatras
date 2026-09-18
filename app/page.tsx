'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, Compass, ShieldCheck, HeartHandshake, Users, Sparkles,
  Search, CreditCard, Ticket, MapPin, Star, Phone, Mail, CalendarDays, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { SectionHeading } from '@/components/site/section-heading';
import { YatraCard } from '@/components/site/yatra-card';
import { OrnamentDivider } from '@/components/site/decorative';
import { fetchYatras } from '@/lib/api-client';
import { formatINR, formatDate, durationLabel } from '@/lib/format';
import { YatraView } from '@/lib/domain/types';

const HERO_IMAGE =
  'https://images.pexels.com/photos/30647799/pexels-photo-30647799.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1920';

const WHY = [
  { icon: ShieldCheck, title: 'Trusted & Reliable', desc: 'Thousands of pilgrims travelled with care, comfort and complete transparency.' },
  { icon: HeartHandshake, title: 'Devotion First', desc: 'Every journey is designed around darshan, ritual timings and spiritual comfort.' },
  { icon: Users, title: 'Dedicated Coordinators', desc: 'On-ground coordinators guide you through darshan, stays and every detail.' },
  { icon: Compass, title: 'Effortless Travel', desc: 'Comfortable transport, curated stays and hassle-free arrangements throughout.' },
];

const STEPS = [
  { icon: Search, title: 'Choose your Yatra', desc: 'Browse upcoming pilgrimages and pick the journey that calls to you.' },
  { icon: Users, title: 'Add travellers', desc: 'Book for yourself or your whole family in a single, simple booking.' },
  { icon: CreditCard, title: 'Secure payment', desc: 'Pay safely online. Your seat is confirmed the moment payment succeeds.' },
  { icon: Ticket, title: 'Get your QR ticket', desc: 'Receive a beautiful digital pass for a smooth boarding and check-in.' },
];

const TESTIMONIALS = [
  { name: 'Ravi Kumar', place: 'Tirupati Yatra', text: 'Every detail was taken care of. The darshan arrangement was seamless and the coordinators were wonderful.' },
  { name: 'Lakshmi Devi', place: 'Kashi Yatra', text: 'A truly divine experience. Comfortable travel, clean stays, and the Ganga aarti moment was unforgettable.' },
  { name: 'Suresh Reddy', place: 'Shirdi Darshan', text: 'Well organised from start to finish. I will travel with GokulamYatras for all our family pilgrimages.' },
];

const FAQS = [
  { q: 'How do I book a yatra?', a: 'Choose a yatra, add your travellers, accept the terms and complete a secure payment. You will instantly receive a digital QR ticket.' },
  { q: 'Can I book for my whole family?', a: 'Yes. A single booking can include multiple travellers. Add each traveller\u2019s details during the booking flow.' },
  { q: 'How is my seat confirmed?', a: 'Your seat is confirmed only after your payment is successfully verified on our server. Capacity is protected so seats are never oversold.' },
  { q: 'What is the QR ticket used for?', a: 'Your QR ticket is your digital travel pass. Our coordinator scans it at the reporting point for a quick, contactless check-in.' },
  { q: 'What if a yatra is fully booked?', a: 'Fully booked yatras are clearly marked. You can explore other upcoming journeys or contact us to know about future dates.' },
];

export default function HomePage() {
  const [yatras, setYatras] = useState<YatraView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchYatras('upcoming')
      .then(setYatras)
      .catch(() => setYatras([]))
      .finally(() => setLoading(false));
  }, []);

  const featured = yatras.find((y) => y.featured) ?? yatras[0] ?? null;
  const upcoming = yatras.slice(0, 3);

  return (
    <main className="min-h-screen bg-brand-cream">
      <Navbar variant="overlay" />

      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden">
        <img src={HERO_IMAGE} alt="Sacred temple at golden hour" className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="container relative z-10 flex flex-col items-center pt-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-brand-marigold" /> Sacred journeys since generations
          </span>

          <h1 className="mt-7 max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white text-balance sm:text-5xl md:text-6xl lg:text-7xl">
            Journeys of Faith, <span className="text-brand-marigold">Crafted with Devotion</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
            Premium, thoughtfully organised pilgrimages across India — Tirupati, Kashi, Shirdi, Char Dham and beyond. Travel with comfort, trust and complete peace of mind.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link href="/yatras" className="btn-primary text-base">
              Explore Upcoming Yatras <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/#how" className="btn-ghost text-base text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50">
              How It Works
            </Link>
          </div>

          <div className="mt-14 grid w-full max-w-2xl grid-cols-3 gap-4 border-t border-white/15 pt-8">
            {[
              { k: '10,000+', v: 'Happy pilgrims' },
              { k: '25+', v: 'Sacred destinations' },
              { k: '4.9\u2605', v: 'Traveller rating' },
            ].map((s) => (
              <div key={s.v} className="text-center">
                <p className="font-display text-2xl font-semibold text-white sm:text-3xl">{s.k}</p>
                <p className="mt-1 text-xs text-white/70 sm:text-sm">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= UPCOMING YATRAS ================= */}
      <section className="paper-texture py-20 md:py-28">
        <div className="container">
          <div className="mb-14 flex flex-col items-center">
            <SectionHeading
              eyebrow="Upcoming Yatras"
              title={<>Journeys awaiting your <span className="text-brand-saffron">presence</span></>}
              description="Handpicked pilgrimages departing soon. Reserve your seat before they fill."
              ornament
            />
          </div>

          {loading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card-premium h-[26rem] animate-pulse bg-brand-sand/40" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-center text-brand-muted">No upcoming yatras right now. Please check back soon.</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((y, i) => (
                <YatraCard key={y.id} yatra={y} index={i} />
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link href="/yatras" className="btn-ghost">
              View all yatras <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURED YATRA ================= */}
      {featured && (
        <section className="bg-brand-ink py-20 text-brand-cream md:py-28">
          <div className="container grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative order-2 lg:order-1"
            >
              <div className="overflow-hidden rounded-3xl shadow-premium">
                <img src={featured.heroImage} alt={featured.name} className="aspect-[4/3] w-full object-cover" />
              </div>
              <div className="absolute -bottom-6 -right-2 rounded-2xl bg-brand-saffron px-6 py-4 shadow-premium sm:-right-6">
                <p className="text-xs uppercase tracking-wide text-white/80">From</p>
                <p className="font-display text-2xl font-semibold text-white">{formatINR(featured.price)}</p>
              </div>
            </motion.div>

            <div className="order-1 lg:order-2">
              <span className="eyebrow text-brand-marigold">Featured Yatra</span>
              <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
                {featured.name}
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-brand-cream/75">{featured.description}</p>

              <div className="mt-8 grid grid-cols-2 gap-5 sm:max-w-md">
                <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-brand-marigold" /><span className="text-sm text-brand-cream/85">{formatDate(featured.startDate)}</span></div>
                <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-brand-marigold" /><span className="text-sm text-brand-cream/85">{durationLabel(featured.durationDays, featured.durationNights)}</span></div>
                <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-brand-marigold" /><span className="text-sm text-brand-cream/85">{featured.startingPoint}</span></div>
                <div className="flex items-center gap-3"><Users className="h-5 w-5 text-brand-marigold" /><span className="text-sm text-brand-cream/85">{featured.availability.available} seats left</span></div>
              </div>

              <Link href={`/yatras/${featured.slug}`} className="btn-primary mt-9">
                Book Your Seat <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================= WHY ================= */}
      <section id="why" className="py-20 md:py-28">
        <div className="container">
          <div className="mb-14 flex flex-col items-center">
            <SectionHeading
              eyebrow="Why GokulamYatras"
              title={<>Travel with faith, <span className="text-brand-saffron">arrive with peace</span></>}
              description="We handle every worldly detail so you can focus entirely on your devotion."
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="card-premium p-7 transition-shadow duration-300 hover:shadow-soft"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-saffron/12 text-brand-saffronDark">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="heading-serif text-lg">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-brand-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="relative overflow-hidden bg-brand-sand/40 py-20 md:py-28">
        <div className="container">
          <div className="mb-16 flex flex-col items-center">
            <SectionHeading eyebrow="How it works" title="Your pilgrimage, in four simple steps" ornament />
          </div>
          <div className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-ivory shadow-soft">
                  <s.icon className="h-7 w-7 text-brand-saffron" />
                </div>
                <span className="mt-5 block font-display text-sm font-semibold text-brand-gold">0{i + 1}</span>
                <h3 className="mt-1 heading-serif text-lg">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-brand-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= DESTINATIONS ================= */}
      <section id="destinations" className="py-20 md:py-28">
        <div className="container">
          <div className="mb-14 flex flex-col items-center">
            <SectionHeading
              eyebrow="Sacred destinations"
              title={<>Where devotion <span className="text-brand-saffron">meets the divine</span></>}
              description="From the hills of Tirumala to the ghats of Kashi — explore the destinations our pilgrims cherish."
            />
          </div>
          {!loading && yatras.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {yatras.slice(0, 6).map((y, i) => (
                <motion.div
                  key={y.id}
                  initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                >
                  <Link href={`/yatras/${y.slug}`} className="group relative block h-64 overflow-hidden rounded-2xl shadow-soft">
                    <img src={y.heroImage} alt={y.destination} className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-6">
                      <p className="text-xs font-medium uppercase tracking-wide text-brand-marigold">{y.destination}</p>
                      <h3 className="mt-1 font-display text-xl font-semibold text-white">{y.name}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="relative overflow-hidden bg-brand-maroon py-20 text-brand-cream md:py-28">
        <div className="paper-texture absolute inset-0 opacity-20" aria-hidden="true" />
        <div className="container relative">
          <div className="mb-14 flex flex-col items-center">
            <SectionHeading eyebrow="Blessed voices" title={<span className="text-white">Words from our pilgrims</span>} dark />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl bg-white/8 p-7 backdrop-blur"
              >
                <div className="mb-4 flex gap-1 text-brand-marigold">
                  {[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="text-sm leading-relaxed text-brand-cream/90">“{t.text}”</blockquote>
                <figcaption className="mt-5 border-t border-white/15 pt-4">
                  <p className="font-display text-base font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-brand-marigold">{t.place}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="py-20 md:py-28">
        <div className="container max-w-3xl">
          <div className="mb-12 flex flex-col items-center">
            <SectionHeading eyebrow="Good to know" title="Frequently asked questions" ornament />
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-brand-sand">
                <AccordionTrigger className="text-left font-display text-lg font-medium hover:text-brand-saffronDark hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-brand-muted">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <section id="contact" className="pb-24">
        <div className="container">
          <div className="overflow-hidden rounded-3xl bg-brand-ink shadow-premium">
            <div className="grid lg:grid-cols-2">
              <div className="p-10 md:p-14">
                <span className="eyebrow text-brand-marigold">Get in touch</span>
                <h2 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">
                  Planning a pilgrimage? Let us help.
                </h2>
                <p className="mt-4 max-w-md leading-relaxed text-brand-cream/70">
                  Speak with our team for group bookings, custom yatras, or any questions about upcoming journeys.
                </p>
                <div className="mt-8 space-y-4 text-brand-cream/85">
                  <p className="flex items-center gap-3"><Phone className="h-5 w-5 text-brand-marigold" /> +91 98765 43210</p>
                  <p className="flex items-center gap-3"><Mail className="h-5 w-5 text-brand-marigold" /> care@gokulamyatras.in</p>
                  <p className="flex items-center gap-3"><MapPin className="h-5 w-5 text-brand-marigold" /> Vijayawada, Andhra Pradesh</p>
                </div>
              </div>

              <div className="bg-brand-ivory p-10 md:p-14">
                <form
                  onSubmit={async(e) => { e.preventDefault();const form=e.currentTarget;const button=form.querySelector('button');if(button)button.disabled=true;try{const values=new FormData(form);const res=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(values))});if(!res.ok)throw new Error('Please check your details and try again.');toast.success('Your enquiry has been saved for our team.');form.reset();}catch(e){toast.error(e instanceof Error?e.message:'Could not send enquiry');}finally{if(button)button.disabled=false;} }}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-brand-ink" htmlFor="c-name">Full name</label>
                    <input name="fullName" id="c-name" required className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm outline-none focus:border-brand-saffron focus:ring-2 focus:ring-brand-saffron/20" placeholder="Your name" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-brand-ink" htmlFor="c-phone">Mobile</label>
                      <input name="mobile" id="c-phone" required className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm outline-none focus:border-brand-saffron focus:ring-2 focus:ring-brand-saffron/20" placeholder="+91" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-brand-ink" htmlFor="c-email">Email</label>
                      <input name="email" id="c-email" type="email" className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm outline-none focus:border-brand-saffron focus:ring-2 focus:ring-brand-saffron/20" placeholder="you@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-brand-ink" htmlFor="c-msg">Message</label>
                    <textarea name="message" id="c-msg" rows={4} className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm outline-none focus:border-brand-saffron focus:ring-2 focus:ring-brand-saffron/20" placeholder="Tell us about your yatra plans" />
                  </div>
                  <button type="submit" className="btn-primary w-full">Send enquiry <ArrowRight className="h-4 w-4" /></button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
