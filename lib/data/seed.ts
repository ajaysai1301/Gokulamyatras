/**
 * Demo seed data for the Emergent preview. In production this data lives in the
 * database and is managed via the admin panel; here it bootstraps the public
 * site so the experience is complete out of the box.
 */
import { v4 as uuidv4 } from 'uuid';
import { Yatra, YatraStatus } from '@/lib/domain/types';

const IMG = {
  gopuram: 'https://images.pexels.com/photos/30647799/pexels-photo-30647799.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
  gopuramCard: 'https://images.pexels.com/photos/30647799/pexels-photo-30647799.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=940',
  templeCarved: 'https://images.pexels.com/photos/36526508/pexels-photo-36526508.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
  templeCarvedCard: 'https://images.pexels.com/photos/36526508/pexels-photo-36526508.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=940',
  varanasi: 'https://images.pexels.com/photos/31072582/pexels-photo-31072582.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
  varanasiCard: 'https://images.pexels.com/photos/31072582/pexels-photo-31072582.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=940',
  ghatAarti: 'https://images.pexels.com/photos/17869831/pexels-photo-17869831.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
  ghatAartiCard: 'https://images.pexels.com/photos/17869831/pexels-photo-17869831.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=940',
  templeA: 'https://images.pexels.com/photos/19272040/pexels-photo-19272040.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
  templeACard: 'https://images.pexels.com/photos/19272040/pexels-photo-19272040.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=940',
  templeB: 'https://images.pexels.com/photos/31143502/pexels-photo-31143502.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
  templeBCard: 'https://images.pexels.com/photos/31143502/pexels-photo-31143502.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=940',
  pilgrims: 'https://images.pexels.com/photos/15676541/pexels-photo-15676541.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
  pilgrimsCard: 'https://images.pexels.com/photos/15676541/pexels-photo-15676541.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=940',
};

export const HERO_IMAGE = IMG.gopuram;
export const AARTI_IMAGE = IMG.ghatAarti;

const now = new Date().toISOString();

type SeedInput = Omit<Yatra, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: YatraStatus;
};

function build(input: SeedInput): Yatra {
  return {
    id: uuidv4(),
    status: input.status ?? YatraStatus.PUBLISHED,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

export function seedYatras(): Yatra[] {
  return [
    build({
      slug: 'tirupati-yatra',
      name: 'Tirupati Balaji Yatra',
      subtitle: 'Darshan of Lord Venkateswara at the sacred Tirumala hills',
      description:
        'A serene, well-guided pilgrimage to Tirumala for the divine darshan of Lord Venkateswara. Travel in comfort from Vijayawada with dedicated coordinators, special-entry darshan assistance, and thoughtfully arranged prasadam and accommodation.',
      destination: 'Tirupati, Andhra Pradesh',
      heroImage: IMG.gopuram,
      gallery: [IMG.gopuramCard, IMG.templeACard, IMG.pilgrimsCard],
      startDate: '2026-10-15T00:00:00.000Z',
      endDate: '2026-10-16T23:59:59.000Z',
      durationDays: 2,
      durationNights: 1,
      startingPoint: 'Vijayawada',
      reportingLocation: 'Gokulam Travels Office, Benz Circle, Vijayawada',
      reportingTime: '05:30 AM',
      price: 4999,
      capacity: 40,
      booked: 32,
      highlights: [
        'Special-entry darshan assistance',
        'AC coach travel from Vijayawada',
        'Comfortable overnight stay near Tirumala',
        'Laddu prasadam arrangement',
      ],
      itinerary: [
        {
          day: 1,
          title: 'Vijayawada to Tirumala',
          items: [
            { time: '06:00 AM', title: 'Departure from Vijayawada', description: 'Board the AC coach after a short group prayer.' },
            { time: '12:30 PM', title: 'Lunch en route', description: 'Traditional Andhra vegetarian meal.' },
            { time: '04:00 PM', title: 'Arrival at Tirumala', description: 'Check-in and freshen up at the guest house.' },
            { time: '07:00 PM', title: 'Evening darshan', description: 'Guided special-entry darshan of Lord Venkateswara.' },
          ],
        },
        {
          day: 2,
          title: 'Darshan & Return',
          items: [
            { time: '06:00 AM', title: 'Suprabhatam & morning darshan' },
            { time: '09:00 AM', title: 'Prasadam & breakfast' },
            { time: '11:00 AM', title: 'Depart Tirumala for Vijayawada' },
            { time: '08:00 PM', title: 'Arrival at Vijayawada' },
          ],
        },
      ],
      included: ['AC coach travel', 'Accommodation (1 night)', 'Breakfast & lunch', 'Darshan assistance', 'Coordinator support'],
      excluded: ['Personal expenses', 'Special sevas / tickets', 'Any meals not mentioned'],
      importantInfo: [
        'Carry a valid government photo ID for every traveller.',
        'Dress code: traditional attire recommended for darshan.',
        'Senior citizens are requested to inform us of any medical needs.',
      ],
      tcVersion: '1.0',
      tcPdfUrl: '/api/yatras/tirupati-yatra/terms',
      featured: true,
    }),
    build({
      slug: 'kashi-varanasi-yatra',
      name: 'Kashi Vishwanath Yatra',
      subtitle: 'The eternal city of Shiva — Ganga aarti, ghats & Kashi Vishwanath',
      description:
        'An immersive spiritual journey through Varanasi, the oldest living city. Witness the mesmerising Ganga aarti at Dashashwamedh Ghat, a guided darshan at the Kashi Vishwanath corridor, and a soulful sunrise boat ride on the Ganga.',
      destination: 'Varanasi, Uttar Pradesh',
      heroImage: IMG.varanasi,
      gallery: [IMG.varanasiCard, IMG.ghatAartiCard, IMG.pilgrimsCard],
      startDate: '2026-11-05T00:00:00.000Z',
      endDate: '2026-11-08T23:59:59.000Z',
      durationDays: 4,
      durationNights: 3,
      startingPoint: 'Hyderabad',
      reportingLocation: 'Rajiv Gandhi Intl. Airport, Hyderabad',
      reportingTime: '04:00 AM',
      price: 12999,
      capacity: 45,
      booked: 45,
      highlights: ['Ganga aarti at Dashashwamedh Ghat', 'Kashi Vishwanath corridor darshan', 'Sunrise boat ride', 'Sarnath excursion'],
      itinerary: [
        { day: 1, title: 'Arrival in Kashi', items: [ { time: '09:00 AM', title: 'Arrival & hotel check-in' }, { time: '06:00 PM', title: 'Ganga aarti at Dashashwamedh Ghat' } ] },
        { day: 2, title: 'Kashi Vishwanath', items: [ { time: '05:00 AM', title: 'Sunrise boat ride on the Ganga' }, { time: '09:00 AM', title: 'Kashi Vishwanath darshan' } ] },
        { day: 3, title: 'Sarnath', items: [ { time: '09:00 AM', title: 'Excursion to Sarnath' }, { time: '05:00 PM', title: 'Evening at leisure' } ] },
        { day: 4, title: 'Return', items: [ { time: '10:00 AM', title: 'Departure to Hyderabad' } ] },
      ],
      included: ['Return flights', 'Hotel (3 nights)', 'Daily breakfast & dinner', 'All local transfers', 'Guided darshan'],
      excluded: ['Lunch', 'Personal expenses', 'Special pooja / sevas'],
      importantInfo: ['Comfortable walking shoes recommended.', 'Weather can be cool in November — carry light woollens.'],
      tcVersion: '1.0',
      tcPdfUrl: '/api/yatras/kashi-varanasi-yatra/terms',
      featured: false,
    }),
    build({
      slug: 'shirdi-sai-darshan',
      name: 'Shirdi Sai Darshan',
      subtitle: 'A tranquil weekend at the abode of Shri Sai Baba',
      description:
        'A restful, well-organised journey to Shirdi for the darshan of Shri Sai Baba, including the Samadhi Mandir, Dwarkamai and Chavadi, with comfortable stay and hassle-free darshan arrangements.',
      destination: 'Shirdi, Maharashtra',
      heroImage: IMG.templeB,
      gallery: [IMG.templeBCard, IMG.templeACard],
      startDate: '2026-09-20T00:00:00.000Z',
      endDate: '2026-09-21T23:59:59.000Z',
      durationDays: 2,
      durationNights: 1,
      startingPoint: 'Pune',
      reportingLocation: 'Gokulam Travels Desk, Shivajinagar, Pune',
      reportingTime: '05:00 AM',
      price: 5499,
      capacity: 50,
      booked: 20,
      highlights: ['Samadhi Mandir darshan', 'Dwarkamai & Chavadi visit', 'Aarti participation', 'Comfortable AC stay'],
      itinerary: [
        { day: 1, title: 'Pune to Shirdi', items: [ { time: '05:30 AM', title: 'Departure from Pune' }, { time: '11:00 AM', title: 'Arrival & darshan' }, { time: '06:00 PM', title: 'Dhoop aarti' } ] },
        { day: 2, title: 'Darshan & Return', items: [ { time: '05:00 AM', title: 'Kakad aarti' }, { time: '12:00 PM', title: 'Return to Pune' } ] },
      ],
      included: ['AC coach', '1 night stay', 'Breakfast', 'Darshan assistance'],
      excluded: ['Lunch & dinner', 'Personal expenses'],
      importantInfo: ['Please carry a valid photo ID.', 'Mobile phones are not allowed inside the temple.'],
      tcVersion: '1.0',
      tcPdfUrl: '/api/yatras/shirdi-sai-darshan/terms',
      featured: false,
    }),
    build({
      slug: 'char-dham-yatra',
      name: 'Char Dham Yatra',
      subtitle: 'Yamunotri, Gangotri, Kedarnath & Badrinath — the ultimate Himalayan pilgrimage',
      description:
        'The grand ten-day Himalayan pilgrimage covering all four dhams. Journey through breathtaking mountain landscapes with experienced coordinators, careful acclimatisation, and comfortable stays at each stop.',
      destination: 'Uttarakhand Himalayas',
      heroImage: IMG.templeCarved,
      gallery: [IMG.templeCarvedCard, IMG.pilgrimsCard, IMG.templeACard],
      startDate: '2026-05-12T00:00:00.000Z',
      endDate: '2026-05-21T23:59:59.000Z',
      durationDays: 10,
      durationNights: 9,
      startingPoint: 'Haridwar',
      reportingLocation: 'Haridwar Railway Station',
      reportingTime: '06:00 AM',
      price: 38999,
      capacity: 30,
      booked: 12,
      highlights: ['All four dhams covered', 'Experienced Himalayan coordinators', 'Careful acclimatisation schedule', 'Helicopter option for Kedarnath'],
      itinerary: [
        { day: 1, title: 'Haridwar to Barkot', items: [ { time: '06:00 AM', title: 'Departure from Haridwar' }, { time: '05:00 PM', title: 'Arrival at Barkot' } ] },
        { day: 2, title: 'Yamunotri Darshan', items: [ { time: '06:00 AM', title: 'Trek to Yamunotri' } ] },
        { day: 3, title: 'Gangotri Darshan', items: [ { time: '07:00 AM', title: 'Drive to Gangotri' } ] },
      ],
      included: ['All transfers', 'Accommodation (9 nights)', 'Breakfast & dinner', 'Coordinator & first-aid support'],
      excluded: ['Helicopter tickets', 'Pony / palki charges', 'Lunch', 'Personal expenses'],
      importantInfo: ['A basic fitness level is required.', 'Medical certificate recommended for senior citizens.', 'Carry warm clothing and rain protection.'],
      tcVersion: '1.0',
      tcPdfUrl: '/api/yatras/char-dham-yatra/terms',
      featured: false,
    }),
    build({
      slug: 'rameshwaram-madurai-yatra',
      name: 'Rameshwaram & Madurai Yatra',
      subtitle: 'Jyotirlinga darshan and the divine Meenakshi Amman temple',
      description:
        'A soulful South Indian temple trail covering the Ramanathaswamy Jyotirlinga at Rameshwaram and the magnificent Meenakshi Amman temple at Madurai, with comfortable travel and darshan support.',
      destination: 'Rameshwaram & Madurai, Tamil Nadu',
      heroImage: IMG.templeA,
      gallery: [IMG.templeACard, IMG.gopuramCard],
      startDate: '2026-12-08T00:00:00.000Z',
      endDate: '2026-12-10T23:59:59.000Z',
      durationDays: 3,
      durationNights: 2,
      startingPoint: 'Chennai',
      reportingLocation: 'Chennai Egmore Railway Station',
      reportingTime: '05:30 AM',
      price: 8999,
      capacity: 40,
      booked: 5,
      highlights: ['Ramanathaswamy Jyotirlinga darshan', '22 theerthams holy bath', 'Meenakshi Amman temple', 'Pamban bridge views'],
      itinerary: [
        { day: 1, title: 'Chennai to Rameshwaram', items: [ { time: '06:00 AM', title: 'Departure' }, { time: '06:00 PM', title: 'Evening darshan' } ] },
        { day: 2, title: 'Rameshwaram to Madurai', items: [ { time: '07:00 AM', title: 'Theertham bath & darshan' }, { time: '05:00 PM', title: 'Meenakshi temple' } ] },
        { day: 3, title: 'Return', items: [ { time: '10:00 AM', title: 'Departure to Chennai' } ] },
      ],
      included: ['AC coach', 'Hotel (2 nights)', 'Breakfast', 'Darshan assistance'],
      excluded: ['Lunch & dinner', 'Personal expenses'],
      importantInfo: ['Carry a valid photo ID.', 'Traditional attire recommended.'],
      tcVersion: '1.0',
      tcPdfUrl: '/api/yatras/rameshwaram-madurai-yatra/terms',
      featured: false,
    }),
    build({
      slug: 'vaishno-devi-yatra',
      name: 'Vaishno Devi Yatra',
      subtitle: 'The revered climb to Mata Vaishno Devi Bhawan',
      description:
        'A blessed journey to the shrine of Mata Vaishno Devi at Trikuta hills, with comfortable base stay at Katra, guided trek support, and darshan arrangements.',
      destination: 'Katra, Jammu & Kashmir',
      heroImage: IMG.pilgrims,
      gallery: [IMG.pilgrimsCard, IMG.templeBCard],
      startDate: '2026-10-18T00:00:00.000Z',
      endDate: '2026-10-20T23:59:59.000Z',
      durationDays: 3,
      durationNights: 2,
      startingPoint: 'Jammu',
      reportingLocation: 'Jammu Tawi Railway Station',
      reportingTime: '07:00 AM',
      price: 9999,
      capacity: 40,
      booked: 30,
      highlights: ['Guided trek to Bhawan', 'Comfortable base stay at Katra', 'Bhairavnath temple visit', 'Battery car / pony assistance available'],
      itinerary: [
        { day: 1, title: 'Jammu to Katra', items: [ { time: '08:00 AM', title: 'Drive to Katra' }, { time: '02:00 PM', title: 'Begin trek to Bhawan' } ] },
        { day: 2, title: 'Darshan', items: [ { time: '06:00 AM', title: 'Mata Vaishno Devi darshan' }, { time: '11:00 AM', title: 'Bhairavnath temple' } ] },
        { day: 3, title: 'Return', items: [ { time: '09:00 AM', title: 'Departure from Jammu' } ] },
      ],
      included: ['Transfers', 'Hotel at Katra (2 nights)', 'Breakfast', 'Coordinator support'],
      excluded: ['Pony / palki / helicopter', 'Lunch & dinner', 'Personal expenses'],
      importantInfo: ['A moderate fitness level helps for the trek.', 'Carry comfortable shoes and light woollens.'],
      tcVersion: '1.0',
      tcPdfUrl: '/api/yatras/vaishno-devi-yatra/terms',
      featured: false,
    }),
  ];
}
