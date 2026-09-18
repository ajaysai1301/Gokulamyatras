import {prismaDb,usesPostgres} from '@/lib/db/prisma';
import {getDb,sessionOptions} from '@/lib/db/mongo';
export const webhookRepository={
 async find(id:string){return usesPostgres()?prismaDb().webhookEvent.findUnique({where:{id}}):(await getDb()).collection<{_id:string;bodyHash:string}>('webhook_events').findOne({_id:id},sessionOptions());},
 async create(id:string,bodyHash:string){if(usesPostgres())await prismaDb().webhookEvent.create({data:{id,bodyHash}});else await (await getDb()).collection<{_id:string;bodyHash:string}>('webhook_events').insertOne({_id:id,bodyHash},sessionOptions());}
};
