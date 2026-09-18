import { getUnitOfWork } from '@/lib/repositories/unit-of-work';
import { yatraPatchSchema } from '@/lib/validation/schemas';
import { getTerms } from '@/lib/services/terms.service';
/**
 * Yatra service — application/business logic.
 * ---------------------------------------------------------------------------
 * Depends only on the YatraRepository interface. Computes derived data
 * (availability, past/upcoming) and enforces publication rules. UI and API
 * controllers call this service, never the repository or database directly.
 */
import { getYatraRepository } from '@/lib/repositories/yatra.repository';
import { v4 as uuidv4 } from 'uuid';
import { seedYatras } from '@/lib/data/seed';
import { Yatra, YatraStatus, YatraView, YatraAvailability } from '@/lib/domain/types';

function computeAvailability(y: Yatra): YatraAvailability {
  const available = Math.max(0, y.capacity - y.booked);
  return {
    capacity: y.capacity,
    booked: y.booked,
    available,
    isFull: available <= 0,
  };
}

function toView(y: Yatra): YatraView {
  const isPast = new Date(y.endDate).getTime() < Date.now();
  return { ...y, availability: computeAvailability(y), isPast };
}

function byStartDateAsc(a: Yatra, b: Yatra): number {
  return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
}

/** Seeds demo yatras only when the collection is empty (idempotent). */
export async function ensureSeeded(): Promise<void> {
  const repo = getYatraRepository();
  if (process.env.ENABLE_DEMO_SEED !== 'true' || process.env.NODE_ENV === 'production') return;
  const count = await repo.count();
  if (count === 0) {
    await repo.insertMany(seedYatras());
  }
}

export async function listPublishedYatras(): Promise<YatraView[]> {
  await ensureSeeded();
  const repo = getYatraRepository();
  const all = await repo.findAll({ status: YatraStatus.PUBLISHED });
  return all.sort(byStartDateAsc).map(toView);
}

export async function listUpcomingYatras(): Promise<YatraView[]> {
  const published = await listPublishedYatras();
  return published.filter((y) => !y.isPast);
}

export async function listPastYatras(): Promise<YatraView[]> {
  const published = await listPublishedYatras();
  return published.filter((y) => y.isPast);
}

export async function getFeaturedYatra(): Promise<YatraView | null> {
  const upcoming = await listUpcomingYatras();
  return upcoming.find((y) => y.featured) ?? upcoming[0] ?? null;
}

export async function getYatraBySlug(slug: string): Promise<YatraView | null> {
  await ensureSeeded();
  const repo = getYatraRepository();
  const y = await repo.findBySlug(slug);
  if (!y || y.status !== YatraStatus.PUBLISHED) return null;
  return toView(y);
}

// --- Admin methods (return all statuses, allow CRUD) ------------------------

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

export async function listAllYatras(): Promise<YatraView[]> {
  await ensureSeeded();
  const all = await getYatraRepository().findAll({});
  return all.sort(byStartDateAsc).map(toView);
}

export async function getYatraViewById(id: string): Promise<YatraView | null> {
  const y = await getYatraRepository().findById(id);
  return y ? toView(y) : null;
}

export async function createYatra(input: Partial<Yatra>): Promise<Yatra> {
  input=yatraPatchSchema.parse(input);
  const repo = getYatraRepository();
  const now = new Date().toISOString();
  const name = input.name || 'Untitled Yatra';
  let slug = input.slug ? slugify(input.slug) : slugify(name);
  if (await repo.findBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const yatra: Yatra = {
    id: uuidv4(),
    slug,
    name,
    subtitle: input.subtitle || '',
    description: input.description || '',
    destination: input.destination || '',
    heroImage: input.heroImage || 'https://images.pexels.com/photos/30647799/pexels-photo-30647799.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
    gallery: input.gallery || [],
    startDate: input.startDate || now,
    endDate: input.endDate || now,
    durationDays: input.durationDays ?? 1,
    durationNights: input.durationNights ?? 0,
    startingPoint: input.startingPoint || '',
    reportingLocation: input.reportingLocation || '',
    reportingTime: input.reportingTime || '',
    price: input.price ?? 0,
    capacity: input.capacity ?? 0,
    booked: 0,
    highlights: input.highlights || [],
    itinerary: input.itinerary || [],
    included: input.included || [],
    excluded: input.excluded || [],
    importantInfo: input.importantInfo || [],
    tcVersion: input.tcVersion || '1.0',
    tcPdfUrl: input.tcPdfUrl || `/api/yatras/${slug}/terms`,
    status: (input.status as YatraStatus) || YatraStatus.DRAFT,
    featured: input.featured ?? false,
    createdAt: now,
    updatedAt: now,
  };
  validateYatra(yatra);
  return getUnitOfWork().run(async()=>{await repo.create(yatra);await getTerms(yatra);return yatra;});
}

/** Never mutates booked/capacity accounting fields via arbitrary patch. */
export async function updateYatra(id: string, patch: Partial<Yatra>): Promise<Yatra | null> {
  const safe=yatraPatchSchema.parse(patch);
  return getUnitOfWork().run(async()=>{
   const repo=getYatraRepository();const old=await repo.findById(id);if(!old)return null;
   const next={...old,...safe};validateYatra(next);
   if(next.tcPdfUrl!==old.tcPdfUrl) throw new Error('External terms replacement is not supported; retain the versioned terms endpoint');
   await getTerms(old);
   const updated=await repo.update(id,safe);await getTerms(next);return updated;
  });
}

export async function setPublished(id: string, published: boolean): Promise<Yatra | null> {
  return updateYatra(id, { status: published ? YatraStatus.PUBLISHED : YatraStatus.DRAFT });
}

function validateYatra(y:Yatra) {
 if(Date.parse(y.endDate)<Date.parse(y.startDate) || y.capacity<y.booked || !y.name.trim()) throw new Error('Invalid dates, name or capacity below reserved seats');
 if(y.tcPdfUrl && y.tcPdfUrl!==`/api/yatras/${y.slug}/terms`) throw new Error('Terms must use the versioned local endpoint');
}
