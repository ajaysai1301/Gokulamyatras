import { getDb, Collections } from '@/lib/db/mongo';
import { createHash } from 'node:crypto';
export async function consumeRateLimit(key:string,limit:number,windowMs=60000) {
 const db=await getDb(); const bucket=Math.floor(Date.now()/windowMs);
 const id=createHash('sha256').update(key+':'+bucket).digest('hex');
 const result=await db.collection(Collections.rateLimits).findOneAndUpdate({key:id},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((bucket+2)*windowMs)}},{upsert:true,returnDocument:'after'});
 return (result?.count || 0)<=limit;
}
