import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
import { CheckIn } from '@/lib/domain/types';

export interface CheckInRepository {
  create(checkIn: CheckIn): Promise<CheckIn>;
  findByBooking(bookingId: string): Promise<CheckIn | null>;
  findByYatra(yatraId: string): Promise<CheckIn[]>;
}
const row=(r:any):CheckIn=>({...r,checkedInAt:r.checkedInAt.toISOString()});
class PrismaCheckInRepository implements CheckInRepository {async create(c:CheckIn){return row(await prismaDb().checkIn.create({data:{...c,checkedInAt:new Date(c.checkedInAt)}}));}async findByBooking(bookingId:string){const r=await prismaDb().checkIn.findUnique({where:{bookingId}});return r?row(r):null;}async findByYatra(yatraId:string){return (await prismaDb().checkIn.findMany({where:{yatraId}})).map(row);}}

class MongoCheckInRepository implements CheckInRepository {
  async create(checkIn: CheckIn) {
    const db = await getDb();
    // Unique guard on bookingId prevents duplicate check-in even under races.
    await db.collection(Collections.checkins).insertOne({ ...checkIn }, sessionOptions());
    return checkIn;
  }
  async findByBooking(bookingId: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.checkins).findOne({ bookingId }, { ...sessionOptions(), projection: { _id: 0 } });
    return (doc as unknown as CheckIn) || null;
  }
  async findByYatra(yatraId: string) {
    const db = await getDb();
    const docs = await db.collection(Collections.checkins).find({ yatraId }, { ...sessionOptions(), projection: { _id: 0 } }).toArray();
    return docs as unknown as CheckIn[];
  }
}

let repo: CheckInRepository | null = null;
export function getCheckInRepository(): CheckInRepository {
  if(!repo || (usesPostgres() && !(repo instanceof PrismaCheckInRepository)) || (!usesPostgres() && !(repo instanceof MongoCheckInRepository)))repo=usesPostgres()?new PrismaCheckInRepository():new MongoCheckInRepository();
  return repo;
}
