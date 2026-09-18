import { getDb, Collections } from '@/lib/db/mongo';
import { Payment } from '@/lib/domain/types';

export interface PaymentRepository {
  create(payment: Payment): Promise<Payment>;
  findByBooking(bookingId: string): Promise<Payment[]>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findAll(): Promise<Payment[]>;
}

class MongoPaymentRepository implements PaymentRepository {
  async create(payment: Payment) {
    const db = await getDb();
    await db.collection(Collections.payments).insertOne({ ...payment });
    return payment;
  }
  async findByBooking(bookingId: string) {
    const db = await getDb();
    const docs = await db.collection(Collections.payments).find({ bookingId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
    return docs as unknown as Payment[];
  }
  async findByOrderId(orderId: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.payments).findOne({ providerOrderId: orderId }, { projection: { _id: 0 } });
    return (doc as unknown as Payment) || null;
  }
  async findAll() {
    const db = await getDb();
    const docs = await db.collection(Collections.payments).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return docs as unknown as Payment[];
  }
}

let repo: PaymentRepository | null = null;
export function getPaymentRepository(): PaymentRepository {
  if (!repo) repo = new MongoPaymentRepository();
  return repo;
}
