/**
 * Yatra repository — persistence abstraction.
 * ---------------------------------------------------------------------------
 * The YatraRepository interface is the contract the rest of the application
 * codes against. MongoYatraRepository is the current Emergent implementation.
 * A future PrismaYatraRepository can implement the same interface and be
 * returned by getYatraRepository() with no changes to services or UI.
 */
import { getDb, Collections } from '@/lib/db/mongo';
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
      .find(filter, { projection: { _id: 0 } })
      .toArray();
    return docs as unknown as Yatra[];
  }

  async findBySlug(slug: string): Promise<Yatra | null> {
    const db = await getDb();
    const doc = await db
      .collection(Collections.yatras)
      .findOne({ slug }, { projection: { _id: 0 } });
    return strip(doc);
  }

  async findById(id: string): Promise<Yatra | null> {
    const db = await getDb();
    const doc = await db
      .collection(Collections.yatras)
      .findOne({ id }, { projection: { _id: 0 } });
    return strip(doc);
  }

  async create(yatra: Yatra): Promise<Yatra> {
    const db = await getDb();
    await db.collection(Collections.yatras).insertOne({ ...yatra });
    return yatra;
  }

  async update(id: string, patch: Partial<Yatra>): Promise<Yatra | null> {
    const db = await getDb();
    await db
      .collection(Collections.yatras)
      .updateOne({ id }, { $set: { ...patch, updatedAt: new Date().toISOString() } });
    return this.findById(id);
  }

  async count(): Promise<number> {
    const db = await getDb();
    return db.collection(Collections.yatras).countDocuments();
  }

  async insertMany(yatras: Yatra[]): Promise<void> {
    if (!yatras.length) return;
    const db = await getDb();
    await db.collection(Collections.yatras).insertMany(yatras.map((y) => ({ ...y })));
  }

  async tryReserve(id: string, count: number): Promise<boolean> {
    const db = await getDb();
    const res = await db.collection(Collections.yatras).updateOne(
      { id, $expr: { $lte: [{ $add: ['$booked', count] }, '$capacity'] } },
      { $inc: { booked: count }, $set: { updatedAt: new Date().toISOString() } },
    );
    return res.modifiedCount === 1;
  }

  async releaseSeats(id: string, count: number): Promise<void> {
    const db = await getDb();
    const y = await this.findById(id);
    if (!y) return;
    const next = Math.max(0, y.booked - count);
    await db.collection(Collections.yatras).updateOne({ id }, { $set: { booked: next } });
  }
}

let repo: YatraRepository | null = null;

/** Factory — swap this line to change the persistence backend. */
export function getYatraRepository(): YatraRepository {
  if (!repo) repo = new MongoYatraRepository();
  return repo;
}
