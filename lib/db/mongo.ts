/** Mongo adapter. Transactions require a replica set; no unsafe standalone fallback. */
import { MongoClient, Db, ClientSession } from 'mongodb';
import { AsyncLocalStorage } from 'node:async_hooks';
const context = new AsyncLocalStorage<ClientSession>();
const state = globalThis as unknown as { gyReady?: Promise<Db>; gyClient?: MongoClient };
export const Collections = {
 yatras:'yatras', customers:'customers', bookings:'bookings', travellers:'travellers',
 payments:'payments', tickets:'tickets', checkins:'checkins', users:'users',
 termsConsents:'terms_consents', terms:'terms', auditLogs:'audit_logs', counters:'counters', rateLimits:'rate_limits',
} as const;
export function sessionOptions() { return { session: context.getStore() }; }
export async function initializeIndexes(db: Db) {
 for (const name of Object.values(Collections).filter(n=>!['counters','rate_limits'].includes(n)))
   await db.collection(name).createIndex({id:1},{unique:true});
 const unique: Array<[string, Record<string,1>]> = [
  [Collections.yatras,{slug:1}], [Collections.customers,{mobile:1}], [Collections.bookings,{reference:1}],
  [Collections.users,{email:1}], [Collections.tickets,{bookingId:1}], [Collections.tickets,{token:1}],
  [Collections.checkins,{bookingId:1}], [Collections.termsConsents,{bookingId:1}], [Collections.terms,{yatraId:1,version:1}],
 ];
 for(const [name,key] of unique) await db.collection(name).createIndex(key,{unique:true});
 await db.collection(Collections.payments).createIndex({providerOrderId:1,status:1},{unique:true,partialFilterExpression:{providerOrderId:{$type:'string'}}});
 await db.collection(Collections.payments).createIndex({providerPaymentId:1},{unique:true,partialFilterExpression:{providerPaymentId:{$type:'string'}}});
 await db.collection(Collections.auditLogs).createIndex({entity:1,entityId:1,createdAt:1});
 for(const name of [Collections.travellers,Collections.payments]) await db.collection(name).createIndex({bookingId:1});
 await db.collection(Collections.bookings).createIndex({requestKey:1},{unique:true,partialFilterExpression:{requestKey:{$type:'string'}}});
 await db.collection(Collections.bookings).createIndex({customerId:1,createdAt:-1});
 await db.collection(Collections.bookings).createIndex({yatraId:1,status:1});
 await db.collection(Collections.bookings).createIndex({status:1,expiresAt:1});
 await db.collection(Collections.checkins).createIndex({yatraId:1});
 await db.collection(Collections.yatras).createIndex({status:1,startDate:1});
 await db.collection(Collections.rateLimits).createIndex({key:1},{unique:true});
 await db.collection(Collections.rateLimits).createIndex({expiresAt:1},{expireAfterSeconds:0});
}
export async function getDb(): Promise<Db> {
 if(!state.gyReady) state.gyReady = (async()=>{
   if(!process.env.MONGO_URL) throw new Error('MONGO_URL is required');
   const client = new MongoClient(process.env.MONGO_URL);
   try { await client.connect(); const db=client.db(process.env.DB_NAME || 'gokulamyatras');
     await initializeIndexes(db); state.gyClient=client; return db;
   } catch(e) { await client.close(); throw e; }
 })().catch(e=>{state.gyReady=undefined;throw e;});
 return state.gyReady;
}
export async function transaction<T>(work:()=>Promise<T>):Promise<T> {
 if(context.getStore()) return work();
 await getDb(); const session=state.gyClient!.startSession();
 try {
  for(let attempt=0;;attempt++) {
   try {return await session.withTransaction(()=>context.run(session,work),{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}}) as T;}
   catch(error) {if(attempt>=2 || (error as {code?:number}).code!==11000)throw error;}
  }
 }
 finally { await session.endSession(); }
}
export async function closeDb() { await state.gyClient?.close(); state.gyReady=undefined; state.gyClient=undefined; }
