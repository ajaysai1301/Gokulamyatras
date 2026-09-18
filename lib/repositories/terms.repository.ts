import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
export interface TermsDocument { id:string;yatraId:string;version:string;html:string;contentHash:string }
export interface TermsRepository { find(yatraId:string,version:string):Promise<TermsDocument|null>;create(doc:TermsDocument):Promise<TermsDocument> }
class MongoTermsRepository implements TermsRepository {
 async find(yatraId:string,version:string) { const db=await getDb(); return await db.collection(Collections.terms).findOne({yatraId,version},{...sessionOptions(),projection:{_id:0}}) as unknown as TermsDocument|null; }
 async create(doc:TermsDocument) { const db=await getDb(); await db.collection(Collections.terms).updateOne({yatraId:doc.yatraId,version:doc.version},{$setOnInsert:doc},{...sessionOptions(),upsert:true});return (await this.find(doc.yatraId,doc.version))!; }
}
class PrismaTermsRepository implements TermsRepository {async find(yatraId:string,version:string){return prismaDb().termsAndConditions.findUnique({where:{yatraId_version:{yatraId,version}},select:{id:true,yatraId:true,version:true,html:true,contentHash:true}});}async create(doc:TermsDocument){const r=await prismaDb().termsAndConditions.upsert({where:{yatraId_version:{yatraId:doc.yatraId,version:doc.version}},create:doc,update:{},select:{id:true,yatraId:true,version:true,html:true,contentHash:true}});return r;}}
let repo:TermsRepository|null=null; export const getTermsRepository=()=>{if(!repo || (usesPostgres()&&!(repo instanceof PrismaTermsRepository))||(!usesPostgres()&&!(repo instanceof MongoTermsRepository)))repo=usesPostgres()?new PrismaTermsRepository():new MongoTermsRepository();return repo;};
