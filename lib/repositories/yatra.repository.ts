/**
 * Yatra repository — persistence abstraction.
 * ---------------------------------------------------------------------------
 * The YatraRepository interface is the contract the rest of the application
 * codes against. MongoYatraRepository is the current Emergent implementation.
 * A future PrismaYatraRepository can implement the same interface and be
 * returned by getYatraRepository() with no changes to services or UI.
 */
import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
import { Yatra } from '@/lib/domain/types';

export interface YatraQuery {
  status?: string;
  featured?: boolean;
}

export interface YatraRepository {
  findAll(query?: YatraQuery): Promise<Yatra[]>;
  findBySlug(slug: string): Promise<Yatra | null>;
  findById(id: string): Promise<Yatra | null>;
  create(yatra: Yatra): Promise<Yatra>;
  update(id: string, patch: Partial<Yatra>): Promise<Yatra | null>;
  count(): Promise<number>;
  insertMany(yatras: Yatra[]): Promise<void>;
  /** Atomically increments booked only if capacity allows. Returns false when full. */
  tryReserve(id: string, count: number): Promise<boolean>;
  /** Releases previously reserved seats (e.g. on cancellation / failed payment). */
  releaseSeats(id: string, count: number): Promise<void>;
}

/** Removes Mongo-internal fields so nothing leaks into the domain. */
function strip(doc: Record<string, unknown> | null): Yatra | null {
  if (!doc) return null;
  const { _id, ...rest } = doc as Record<string, unknown>;
  void _id;
  return rest as unknown as Yatra;
}

class MongoYatraRepository implements YatraRepository {
  async findAll(query: YatraQuery = {}): Promise<Yatra[]> {
    const db = await getDb();
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (typeof query.featured === 'boolean') filter.featured = query.featured;
    const docs = await db
      .collection(Collections.yatras)
      .find(filter, { ...sessionOptions(), projection: { _id: 0 } })
      .toArray();
    return docs as unknown as Yatra[];
  }

  async findBySlug(slug: string): Promise<Yatra | null> {
    const db = await getDb();
    const doc = await db
      .collection(Collections.yatras)
      .findOne({ slug }, { ...sessionOptions(), projection: { _id: 0 } });
    return strip(doc);
  }

  async findById(id: string): Promise<Yatra | null> {
    const db = await getDb();
    const doc = await db
      .collection(Collections.yatras)
      .findOne({ id }, { ...sessionOptions(), projection: { _id: 0 } });
    return strip(doc);
  }

  async create(yatra: Yatra): Promise<Yatra> {
    const db = await getDb();
    await db.collection(Collections.yatras).insertOne({ ...yatra }, sessionOptions());
    return yatra;
  }

  async update(id: string, patch: Partial<Yatra>): Promise<Yatra | null> {
    const db = await getDb();
    await db
      .collection(Collections.yatras)
      .updateOne({ id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, sessionOptions());
    return this.findById(id);
  }

  async count(): Promise<number> {
    const db = await getDb();
    return db.collection(Collections.yatras).countDocuments({}, sessionOptions());
  }

  async insertMany(yatras: Yatra[]): Promise<void> {
    if (!yatras.length) return;
    const db = await getDb();
    for(const y of yatras) await db.collection(Collections.yatras).updateOne({slug:y.slug},{$setOnInsert:y},{...sessionOptions(),upsert:true});
  }

  async tryReserve(id: string, count: number): Promise<boolean> {
    if (!Number.isSafeInteger(count) || count <= 0) throw new Error('Invalid seat count');
    const db = await getDb();
    const res = await db.collection(Collections.yatras).updateOne(
      { id, status:'PUBLISHED', startDate:{$gt:new Date().toISOString()}, $expr: { $lte: [{ $add: ['$booked', count] }, '$capacity'] } },
      { $inc: { booked: count }, $set: { updatedAt: new Date().toISOString() } }, sessionOptions(),
    );
    return res.modifiedCount === 1;
  }

  async releaseSeats(id: string, count: number): Promise<void> {
    const db = await getDb();
    const result = await db.collection(Collections.yatras).updateOne({id,booked:{$gte:count}},{$inc:{booked:-count}},sessionOptions());
    if(result.modifiedCount !== 1) throw new Error('Seat accounting invariant violated');
  }
}

function fromPrismaYatra(row: any): Yatra {
  return {
    ...row,
    startDate: row.startDate.toISOString(), endDate: row.endDate.toISOString(),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    itinerary: row.itinerary as Yatra['itinerary'],
  };
}
function yatraData(y: Yatra) {
  return {
    ...y,
    startDate: new Date(y.startDate), endDate: new Date(y.endDate),
    createdAt: new Date(y.createdAt), updatedAt: new Date(y.updatedAt),
    itinerary: y.itinerary as object,
  };
}
class PrismaYatraRepository implements YatraRepository {
  async findAll(query: YatraQuery = {}) {
    const rows = await prismaDb().yatra.findMany({ where: { ...(query.status ? { status: query.status as never } : {}), ...(typeof query.featured === 'boolean' ? { featured: query.featured } : {}) } });
    return rows.map(fromPrismaYatra);
  }
  async findBySlug(slug: string) { const row = await prismaDb().yatra.findUnique({ where: { slug } }); return row ? fromPrismaYatra(row) : null; }
  async findById(id: string) { const row = await prismaDb().yatra.findUnique({ where: { id } }); return row ? fromPrismaYatra(row) : null; }
  async create(yatra: Yatra) { const row = await prismaDb().yatra.create({ data: yatraData(yatra) as never }); return fromPrismaYatra(row); }
  async update(id: string, patch: Partial<Yatra>) {
    try {
      const row = await prismaDb().yatra.update({ where: { id }, data: { ...patch, ...(patch.startDate ? { startDate: new Date(patch.startDate) } : {}), ...(patch.endDate ? { endDate: new Date(patch.endDate) } : {}), ...(patch.itinerary ? { itinerary: patch.itinerary as object } : {}) } as never });
      return fromPrismaYatra(row);
    } catch (error: any) { if (error?.code === 'P2025') return null; throw error; }
  }
  async count() { return prismaDb().yatra.count(); }
  async insertMany(yatras: Yatra[]) { for (const yatra of yatras) await prismaDb().yatra.upsert({ where: { slug: yatra.slug }, create: yatraData(yatra) as never, update: {} }); }
  async tryReserve(id: string, count: number) {
    if (!Number.isSafeInteger(count) || count <= 0) throw new Error('Invalid seat count');
    const yatra = await prismaDb().yatra.findUnique({ where: { id }, select: { booked: true, capacity: true, status: true, startDate: true } });
    if (!yatra || yatra.status !== 'PUBLISHED' || yatra.startDate <= new Date() || yatra.booked + count > yatra.capacity) return false;
    // Compare-and-swap plus Serializable unit-of-work means an overlapping reservation
    // either retries the transaction or observes the newer booked value; it cannot oversell.
    const updated = await prismaDb().yatra.updateMany({ where: { id, booked: yatra.booked }, data: { booked: { increment: count } } });
    return updated.count === 1;
  }
  async releaseSeats(id: string, count: number) {
    const updated = await prismaDb().yatra.updateMany({ where: { id, booked: { gte: count } }, data: { booked: { decrement: count } } });
    if (updated.count !== 1) throw new Error('Seat accounting invariant violated');
  }
}

let repo: YatraRepository | null = null;

/** Factory — swap this line to change the persistence backend. */
export function getYatraRepository(): YatraRepository {
  if (!repo || (usesPostgres() && !(repo instanceof PrismaYatraRepository)) || (!usesPostgres() && !(repo instanceof MongoYatraRepository))) repo = usesPostgres() ? new PrismaYatraRepository() : new MongoYatraRepository();
  return repo;
}
