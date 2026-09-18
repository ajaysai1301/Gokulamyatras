import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
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
    return strip<Customer>(await db.collection(Collections.customers).findOne({ mobile }, sessionOptions()));
  }
  async findById(id: string) {
    const db = await getDb();
    return strip<Customer>(await db.collection(Collections.customers).findOne({ id }, sessionOptions()));
  }
  async create(customer: Customer) {
    const db = await getDb();
    await db.collection(Collections.customers).insertOne({ ...customer }, sessionOptions());
    return customer;
  }
  async update(id: string, patch: Partial<Customer>) {
    const db = await getDb();
    await db.collection(Collections.customers).updateOne({ id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, sessionOptions());
    return this.findById(id);
  }
  async findAll(search?: string) {
    const db = await getDb();
    const filter: Record<string, unknown> = {};
    if (search) {
      const literal = Array.from(search).map(c => ('.*+?^$' + '{}()|[]\\').includes(c) ? '\\' + c : c).join('');
      const rx = { $regex: literal, $options:'i' };
      filter.$or = [{ fullName: rx }, { mobile: rx }, { email: rx }];
    }
    const docs = await db.collection(Collections.customers).find(filter, { ...sessionOptions(), projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return docs as unknown as Customer[];
  }
}
const customerRow=(r:any):Customer=>({...r,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),email:r.email??undefined,address:r.address??undefined,emergencyContactName:r.emergencyContactName??undefined,emergencyContactPhone:r.emergencyContactPhone??undefined});
class PrismaCustomerRepository implements CustomerRepository {
 async findByMobile(mobile:string){const r=await prismaDb().customer.findUnique({where:{mobile}});return r?customerRow(r):null;}
 async findById(id:string){const r=await prismaDb().customer.findUnique({where:{id}});return r?customerRow(r):null;}
 async create(c:Customer){return customerRow(await prismaDb().customer.create({data:{...c,createdAt:new Date(c.createdAt),updatedAt:new Date(c.updatedAt)}}));}
 async update(id:string,p:Partial<Customer>){try {return customerRow(await prismaDb().customer.update({where:{id},data:{...p} as never}));}catch(e:any){if(e?.code==='P2025')return null;throw e;}}
 async findAll(search?:string){const r=await prismaDb().customer.findMany({where:search?{OR:[{fullName:{contains:search,mode:'insensitive'}},{mobile:{contains:search,mode:'insensitive'}},{email:{contains:search,mode:'insensitive'}}]}:{},orderBy:{createdAt:'desc'}});return r.map(customerRow);}
}

let repo: CustomerRepository | null = null;
export function getCustomerRepository(): CustomerRepository {
  if(!repo || (usesPostgres() && !(repo instanceof PrismaCustomerRepository)) || (!usesPostgres() && !(repo instanceof MongoCustomerRepository))) repo=usesPostgres()?new PrismaCustomerRepository():new MongoCustomerRepository();
  return repo;
}
