export type HomepageContent = {
  hero: { image: string; badge: string; title: string; highlight: string; description: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string; stats: Array<{ value: string; label: string }> };
  upcoming: { eyebrow: string; title: string; highlight: string; description: string; viewAllLabel: string };
  featured: { eyebrow: string; fromLabel: string; buttonLabel: string; seatsLabel: string };
  why: { eyebrow: string; title: string; highlight: string; description: string; items: Array<{ title: string; desc: string }> };
  how: { eyebrow: string; title: string; items: Array<{ title: string; desc: string }> };
  destinations: { eyebrow: string; title: string; highlight: string; description: string };
  testimonials: { eyebrow: string; title: string; items: Array<{ name: string; place: string; text: string }> };
  faq: { eyebrow: string; title: string; items: Array<{ q: string; a: string }> };
  contact: { eyebrow: string; title: string; description: string; phone: string; email: string; address: string; formButtonLabel: string };
};

export const defaultHomepageContent: HomepageContent = {
  hero: { image: 'https://images.pexels.com/photos/30647799/pexels-photo-30647799.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1920', badge: 'Sacred journeys since generations', title: 'Journeys of Faith,', highlight: 'Crafted with Devotion', description: 'Premium, thoughtfully organised pilgrimages across India — Tirupati, Kashi, Shirdi, Char Dham and beyond. Travel with comfort, trust and complete peace of mind.', primaryLabel: 'Explore Upcoming Yatras', primaryHref: '/yatras', secondaryLabel: 'How It Works', secondaryHref: '/#how', stats: [{ value: '10,000+', label: 'Happy pilgrims' }, { value: '25+', label: 'Sacred destinations' }, { value: '4.9★', label: 'Traveller rating' }] },
  upcoming: { eyebrow: 'Upcoming Yatras', title: 'Journeys awaiting your', highlight: 'presence', description: 'Handpicked pilgrimages departing soon. Reserve your seat before they fill.', viewAllLabel: 'View all yatras' },
  featured: { eyebrow: 'Featured Yatra', fromLabel: 'From', buttonLabel: 'Book Your Seat', seatsLabel: 'seats left' },
  why: { eyebrow: 'Why GokulamYatras', title: 'Travel with faith,', highlight: 'arrive with peace', description: 'We handle every worldly detail so you can focus entirely on your devotion.', items: [{ title: 'Trusted & Reliable', desc: 'Thousands of pilgrims travelled with care, comfort and complete transparency.' }, { title: 'Devotion First', desc: 'Every journey is designed around darshan, ritual timings and spiritual comfort.' }, { title: 'Dedicated Coordinators', desc: 'On-ground coordinators guide you through darshan, stays and every detail.' }, { title: 'Effortless Travel', desc: 'Comfortable transport, curated stays and hassle-free arrangements throughout.' }] },
  how: { eyebrow: 'How it works', title: 'Your pilgrimage, in four simple steps', items: [{ title: 'Choose your Yatra', desc: 'Browse upcoming pilgrimages and pick the journey that calls to you.' }, { title: 'Add travellers', desc: 'Book for yourself or your whole family in a single, simple booking.' }, { title: 'Secure payment', desc: 'Pay safely online. Your seat is confirmed the moment payment succeeds.' }, { title: 'Get your QR ticket', desc: 'Receive a beautiful digital pass for a smooth boarding and check-in.' }] },
  destinations: { eyebrow: 'Sacred destinations', title: 'Where devotion', highlight: 'meets the divine', description: 'From the hills of Tirumala to the ghats of Kashi — explore the destinations our pilgrims cherish.' },
  testimonials: { eyebrow: 'Blessed voices', title: 'Words from our pilgrims', items: [{ name: 'Ravi Kumar', place: 'Tirupati Yatra', text: 'Every detail was taken care of. The darshan arrangement was seamless and the coordinators were wonderful.' }, { name: 'Lakshmi Devi', place: 'Kashi Yatra', text: 'A truly divine experience. Comfortable travel, clean stays, and the Ganga aarti moment was unforgettable.' }, { name: 'Suresh Reddy', place: 'Shirdi Darshan', text: 'Well organised from start to finish. I will travel with GokulamYatras for all our family pilgrimages.' }] },
  faq: { eyebrow: 'Good to know', title: 'Frequently asked questions', items: [{ q: 'How do I book a yatra?', a: 'Choose a yatra, add your travellers, accept the terms and complete a secure payment. You will instantly receive a digital QR ticket.' }, { q: 'Can I book for my whole family?', a: 'Yes. A single booking can include multiple travellers. Add each traveller’s details during the booking flow.' }, { q: 'How is my seat confirmed?', a: 'Your seat is confirmed only after your payment is successfully verified on our server. Capacity is protected so seats are never oversold.' }, { q: 'What is the QR ticket used for?', a: 'Your QR ticket is your digital travel pass. Our coordinator scans it at the reporting point for a quick, contactless check-in.' }, { q: 'What if a yatra is fully booked?', a: 'Fully booked yatras are clearly marked. You can explore other upcoming journeys or contact us to know about future dates.' }] },
  contact: { eyebrow: 'Get in touch', title: 'Planning a pilgrimage? Let us help.', description: 'Speak with our team for group bookings, custom yatras, or any questions about upcoming journeys.', phone: '+91 98765 43210', email: 'care@gokulamyatras.in', address: 'Vijayawada, Andhra Pradesh', formButtonLabel: 'Send enquiry' },
};

export function normalizeHomepageContent(value: unknown): HomepageContent {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, any>;
  const merge = <T extends Record<string, any>>(base: T, next: unknown): T => ({ ...base, ...((next && typeof next === 'object' ? next : {}) as Partial<T>) });
  return {
    hero: merge(defaultHomepageContent.hero, input.hero), upcoming: merge(defaultHomepageContent.upcoming, input.upcoming), featured: merge(defaultHomepageContent.featured, input.featured),
    why: merge(defaultHomepageContent.why, input.why), how: merge(defaultHomepageContent.how, input.how), destinations: merge(defaultHomepageContent.destinations, input.destinations),
    testimonials: merge(defaultHomepageContent.testimonials, input.testimonials), faq: merge(defaultHomepageContent.faq, input.faq), contact: merge(defaultHomepageContent.contact, input.contact),
  };
}
