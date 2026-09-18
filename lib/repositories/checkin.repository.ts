import { getDb, Collections } from '@/lib/db/mongo';
import { CheckIn } from '@/lib/domain/types';

export interface CheckInRepository {
  create(checkIn: CheckIn): Promise<CheckIn>;
  findByBooking(bookingId: string): Promise<CheckIn | null>;
  findByYatra(yatraId: string): Promise<CheckIn[]>;
}

class MongoCheckInRepository implements CheckInRepository {
  async create(checkIn: CheckIn) {
    const db = await getDb();
    // Unique guard on bookingId prevents duplicate check-in even under races.
    await db.collection(Collections.checkins).createIndex({ bookingId: 1 }, { unique: true }).catch(() => {});
    await db.collection(Collections.checkins).insertOne({ ...checkIn });
    return checkIn;
  }
  async findByBooking(bookingId: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.checkins).findOne({ bookingId }, { projection: { _id: 0 } });
    return (doc as unknown as CheckIn) || null;
  }
  async findByYatra(yatraId: string) {
    const db = await getDb();
    const docs = await db.collection(Collections.checkins).find({ yatraId }, { projection: { _id: 0 } }).toArray();
    return docs as unknown as CheckIn[];
  }
}

let repo: CheckInRepository | null = null;
export function getCheckInRepository(): CheckInRepository {
  if (!repo) repo = new MongoCheckInRepository();
  return repo;
}
