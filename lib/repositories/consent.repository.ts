import { getDb, Collections } from '@/lib/db/mongo';
import { TermsConsent } from '@/lib/domain/types';

export interface ConsentRepository {
  create(consent: TermsConsent): Promise<TermsConsent>;
  findByBooking(bookingId: string): Promise<TermsConsent | null>;
}

class MongoConsentRepository implements ConsentRepository {
  async create(consent: TermsConsent) {
    const db = await getDb();
    await db.collection(Collections.termsConsents).insertOne({ ...consent });
    return consent;
  }
  async findByBooking(bookingId: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.termsConsents).findOne({ bookingId }, { projection: { _id: 0 } });
    return (doc as unknown as TermsConsent) || null;
  }
}

let repo: ConsentRepository | null = null;
export function getConsentRepository(): ConsentRepository {
  if (!repo) repo = new MongoConsentRepository();
  return repo;
}
