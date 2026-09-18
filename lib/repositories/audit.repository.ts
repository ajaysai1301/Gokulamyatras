import { randomUUID } from 'node:crypto';
import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
export interface AuditEntry { action:string; entity:string; entityId:string; userId?:string }
export interface AuditRepository { append(entry:AuditEntry):Promise<void> }
const repository:AuditRepository = {
 async append(entry) {
  const db=await getDb();
  await db.collection(Collections.auditLogs).insertOne({id:randomUUID(),...entry,createdAt:new Date().toISOString()},sessionOptions());
 }
};
export const getAuditRepository=()=>repository;
