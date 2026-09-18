import { getDb, Collections } from '@/lib/db/mongo';
import { StaffUser } from '@/lib/domain/types';

export interface UserRepository {
  findByEmail(email: string): Promise<StaffUser | null>;
  findById(id: string): Promise<StaffUser | null>;
  insertMany(users: StaffUser[]): Promise<void>;
  count(): Promise<number>;
}

class MongoUserRepository implements UserRepository {
  async findByEmail(email: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.users).findOne({ email: email.toLowerCase() }, { projection: { _id: 0 } });
    return (doc as unknown as StaffUser) || null;
  }
  async findById(id: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.users).findOne({ id }, { projection: { _id: 0 } });
    return (doc as unknown as StaffUser) || null;
  }
  async insertMany(users: StaffUser[]) {
    if (!users.length) return;
    const db = await getDb();
    await db.collection(Collections.users).insertMany(users.map((u) => ({ ...u })));
  }
  async count() {
    const db = await getDb();
    return db.collection(Collections.users).countDocuments();
  }
}

let repo: UserRepository | null = null;
export function getUserRepository(): UserRepository {
  if (!repo) repo = new MongoUserRepository();
  return repo;
}
