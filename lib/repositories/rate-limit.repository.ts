import { prismaDb, usesPostgres } from '@/lib/db/prisma';
import { getDb, Collections } from '@/lib/db/mongo';
import { createHash } from 'node:crypto';
export async function consumeRateLimit(key:string,limit:number,windowMs=60000) {
 const bucket=Math.floor(Date.now()/windowMs);
 const id=createHash('sha256').update(key+':'+bucket).digest('hex');
 if(usesPostgres()){const r=await prismaDb().rateLimit.upsert({where:{key:id},create:{key:id,count:1,expiresAt:new Date((bucket+2)*windowMs)},update:{count:{increment:1}}});return r.count<=limit;}
 const db=await getDb();
 const result=await db.collection(Collections.rateLimits).findOneAndUpdate({key:id},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((bucket+2)*windowMs)}},{upsert:true,returnDocument:'after'});
 return (result?.count || 0)<=limit;
}

