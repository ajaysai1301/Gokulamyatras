/** PostgreSQL adapter with one transaction context shared by every repository. */
import { PrismaClient, Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
const context = new AsyncLocalStorage<Prisma.TransactionClient>();
const state = globalThis as unknown as { gyPrisma?: PrismaClient };
export function usesPostgres(): boolean {
 if(process.env.DATABASE_URL)return true;
 if(process.env.NODE_ENV==='production')throw new Error('DATABASE_URL is required in production');
 return false;
}
export function getPrisma(): PrismaClient {
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
 return state.gyPrisma ??= new PrismaClient();
}
export function prismaDb(){return context.getStore() ?? getPrisma();}
export async function prismaTransaction<T>(work:()=>Promise<T>):Promise<T>{
 if(context.getStore())return work();
 for(let attempt=0;;attempt++){
  try{return await getPrisma().$transaction(tx=>context.run(tx,work),{isolationLevel:'Serializable',maxWait:10000,timeout:20000});}
  catch(error){const code=(error as {code?:string}).code;if(attempt>=5 || !['P2034','P2002'].includes(code??''))throw error;await new Promise(resolve=>setTimeout(resolve,20*(attempt+1)));}
 }
}
export async function closePrisma(){await state.gyPrisma?.$disconnect();state.gyPrisma=undefined;}
