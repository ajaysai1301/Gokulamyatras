import { getDb, Collections } from '@/lib/db/mongo';
import { Customer } from '@/lib/domain/types';

function strip<T>(doc: unknown): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc as Record<string, unknown>;
  void _id;
  return rest as unknown as T;
}

export interface CustomerRepository {
  findByMobile(mobile: string): Promise<Customer | null>;
  findById(id: string): Promise<Customer | null>;
  create(customer: Customer): Promise<Customer>;
  update(id: string, patch: Partial<Customer>): Promise<Customer | null>;
  findAll(search?: string): Promise<Customer[]>;
}

class MongoCustomerRepository implements CustomerRepository {
  async findByMobile(mobile: string) {
    const db = await getDb();
    return strip<Customer>(await db.collection(Collections.customers).findOne({ mobile }));
  }
  async findById(id: string) {
    const db = await getDb();
    return strip<Customer>(await db.collection(Collections.customers).findOne({ id }));
  }
  async create(customer: Customer) {
    const db = await getDb();
    await db.collection(Collections.customers).insertOne({ ...customer });
    return customer;
  }
  async update(id: string, patch: Partial<Customer>) {
    const db = await getDb();
    await db.collection(Collections.customers).updateOne({ id }, { $set: { ...patch, updatedAt: new Date().toISOString() } });
    return this.findById(id);
  }
  async findAll(search?: string) {
    const db = await getDb();
    const filter: Record<string, unknown> = {};
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      filter.$or = [{ fullName: rx }, { mobile: rx }, { email: rx }];
    }
    const docs = await db.collection(Collections.customers).find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return docs as unknown as Customer[];
  }
}

let repo: CustomerRepository | null = null;
export function getCustomerRepository(): CustomerRepository {
  if (!repo) repo = new MongoCustomerRepository();
  return repo;
}
