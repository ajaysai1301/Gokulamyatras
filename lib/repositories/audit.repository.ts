import { randomUUID } from 'node:crypto';
import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
export interface AuditEntry { action:string; entity:string; entityId:string; userId?:string }
export interface AuditRepository { append(entry:AuditEntry):Promise<void> }
const mongoRepository:AuditRepository = {
 async append(entry) {
  const db=await getDb();
  await db.collection(Collections.auditLogs).insertOne({id:randomUUID(),...entry,createdAt:new Date().toISOString()},sessionOptions());
 }
};
const postgresRepository:AuditRepository={async append(entry){await prismaDb().auditLog.create({data:{id:randomUUID(),...entry,createdAt:new Date()}});}};
export const getAuditRepository=()=>usesPostgres()?postgresRepository:mongoRepository;
