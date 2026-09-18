import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
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
    const doc = await db.collection(Collections.users).findOne({ email: email.toLowerCase() }, { ...sessionOptions(), projection: { _id: 0 } });
    return (doc as unknown as StaffUser) || null;
  }
  async findById(id: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.users).findOne({ id }, { ...sessionOptions(), projection: { _id: 0 } });
    return (doc as unknown as StaffUser) || null;
  }
  async insertMany(users: StaffUser[]) {
    if (!users.length) return;
    const db = await getDb();
    for(const u of users) await db.collection(Collections.users).updateOne({email:u.email},{$setOnInsert:u},{...sessionOptions(),upsert:true});
  }
  async count() {
    const db = await getDb();
    return db.collection(Collections.users).countDocuments({}, sessionOptions());
  }
}
const userRow=(r:any):StaffUser=>({...r,createdAt:r.createdAt.toISOString()});
class PrismaUserRepository implements UserRepository {
 async findByEmail(email:string){const r=await prismaDb().user.findUnique({where:{email:email.toLowerCase()}});return r?userRow(r):null;}
 async findById(id:string){const r=await prismaDb().user.findUnique({where:{id}});return r?userRow(r):null;}
 async insertMany(users:StaffUser[]){for(const u of users)await prismaDb().user.upsert({where:{email:u.email.toLowerCase()},create:{...u,email:u.email.toLowerCase(),createdAt:new Date(u.createdAt)},update:{}});}
 async count(){return prismaDb().user.count();}
}

let repo: UserRepository | null = null;
export function getUserRepository(): UserRepository {
  if(!repo || (usesPostgres() && !(repo instanceof PrismaUserRepository)) || (!usesPostgres() && !(repo instanceof MongoUserRepository))) repo=usesPostgres()?new PrismaUserRepository():new MongoUserRepository();
  return repo;
}
