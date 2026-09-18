import { getDb, Collections } from '@/lib/db/mongo';
import { Booking, Traveller } from '@/lib/domain/types';

function strip<T>(doc: unknown): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc as Record<string, unknown>;
  void _id;
  return rest as unknown as T;
}

export interface BookingFilter {
  yatraId?: string;
  status?: string;
  paymentStatus?: string;
  search?: string;
}

export interface BookingRepository {
  nextReference(year: number): Promise<string>;
  create(booking: Booking): Promise<Booking>;
  findByReference(reference: string): Promise<Booking | null>;
  findById(id: string): Promise<Booking | null>;
  update(id: string, patch: Partial<Booking>): Promise<Booking | null>;
  findAll(filter?: BookingFilter): Promise<Booking[]>;
  findByCustomer(customerId: string): Promise<Booking[]>;
  saveTravellers(travellers: Traveller[]): Promise<void>;
  findTravellers(bookingId: string): Promise<Traveller[]>;
}

class MongoBookingRepository implements BookingRepository {
  async nextReference(year: number): Promise<string> {
    const db = await getDb();
    const key = `booking-${year}`;
    const res = await db.collection(Collections.counters).findOneAndUpdate(
      { _id: key as unknown as object },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' },
    );
    // mongodb v6 returns the document directly; guard both shapes.
    const anyRes = res as unknown as { seq?: number; value?: { seq?: number } } | null;
    const seq = anyRes?.seq ?? anyRes?.value?.seq ?? 1;
    return `GMY-${year}-${String(seq).padStart(5, '0')}`;
  }
  async create(booking: Booking) {
    const db = await getDb();
    await db.collection(Collections.bookings).insertOne({ ...booking });
    return booking;
  }
  async findByReference(reference: string) {
    const db = await getDb();
    return strip<Booking>(await db.collection(Collections.bookings).findOne({ reference }));
  }
  async findById(id: string) {
    const db = await getDb();
    return strip<Booking>(await db.collection(Collections.bookings).findOne({ id }));
  }
  async update(id: string, patch: Partial<Booking>) {
    const db = await getDb();
    await db.collection(Collections.bookings).updateOne({ id }, { $set: { ...patch, updatedAt: new Date().toISOString() } });
    return this.findById(id);
  }
  async findAll(filter: BookingFilter = {}) {
    const db = await getDb();
    const q: Record<string, unknown> = {};
    if (filter.yatraId) q.yatraId = filter.yatraId;
    if (filter.status) q.status = filter.status;
    if (filter.paymentStatus) q.paymentStatus = filter.paymentStatus;
    if (filter.search) {
      const rx = { $regex: filter.search, $options: 'i' };
      q.$or = [{ reference: rx }, { yatraName: rx }];
    }
    const docs = await db.collection(Collections.bookings).find(q, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return docs as unknown as Booking[];
  }
  async findByCustomer(customerId: string) {
    const db = await getDb();
    const docs = await db.collection(Collections.bookings).find({ customerId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return docs as unknown as Booking[];
  }
  async saveTravellers(travellers: Traveller[]) {
    if (!travellers.length) return;
    const db = await getDb();
    await db.collection(Collections.travellers).insertMany(travellers.map((t) => ({ ...t })));
  }
  async findTravellers(bookingId: string) {
    const db = await getDb();
    const docs = await db.collection(Collections.travellers).find({ bookingId }, { projection: { _id: 0 } }).toArray();
    return docs as unknown as Traveller[];
  }
}

let repo: BookingRepository | null = null;
export function getBookingRepository(): BookingRepository {
  if (!repo) repo = new MongoBookingRepository();
  return repo;
}
