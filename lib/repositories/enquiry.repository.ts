import {prismaDb,usesPostgres} from '@/lib/db/prisma';
import {getDb,sessionOptions} from '@/lib/db/mongo';
export type Enquiry={id:string;fullName:string;mobile:string;email?:string;message:string;createdAt:string};
export const enquiryRepository={async create(e:Enquiry){if(usesPostgres())await prismaDb().enquiry.create({data:e});else await (await getDb()).collection('enquiries').insertOne(e,sessionOptions());},async list(){if(usesPostgres())return prismaDb().enquiry.findMany({orderBy:{createdAt:'desc'},take:500});return (await getDb()).collection('enquiries').find({},{projection:{_id:0}}).sort({createdAt:-1}).limit(500).toArray();}};
