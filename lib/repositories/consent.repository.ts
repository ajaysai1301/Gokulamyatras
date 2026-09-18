import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
import { TermsConsent } from '@/lib/domain/types';

export interface ConsentRepository {
  create(consent: TermsConsent): Promise<TermsConsent>;
  findByBooking(bookingId: string): Promise<TermsConsent | null>;
}

class MongoConsentRepository implements ConsentRepository {
  async create(consent: TermsConsent) {
    const db = await getDb();
    await db.collection(Collections.termsConsents).insertOne({ ...consent }, sessionOptions());
    return consent;
  }
  async findByBooking(bookingId: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.termsConsents).findOne({ bookingId }, { ...sessionOptions(), projection: { _id: 0 } });
    return (doc as unknown as TermsConsent) || null;
  }
}
const consentRow=(r:any):TermsConsent=>({...r,agreedAt:r.agreedAt.toISOString(),recordedBy:r.recordedBy??undefined});
class PrismaConsentRepository implements ConsentRepository {async create(c:TermsConsent){return consentRow(await prismaDb().termsConsent.create({data:{...c,agreedAt:new Date(c.agreedAt)}}));}async findByBooking(bookingId:string){const r=await prismaDb().termsConsent.findUnique({where:{bookingId}});return r?consentRow(r):null;}}

let repo: ConsentRepository | null = null;
export function getConsentRepository(): ConsentRepository {
  if(!repo || (usesPostgres() && !(repo instanceof PrismaConsentRepository)) || (!usesPostgres() && !(repo instanceof MongoConsentRepository))) repo=usesPostgres()?new PrismaConsentRepository():new MongoConsentRepository();
  return repo;
}
