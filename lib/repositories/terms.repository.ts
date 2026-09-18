import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
export interface TermsDocument { id:string;yatraId:string;version:string;html:string;contentHash:string }
export interface TermsRepository { find(yatraId:string,version:string):Promise<TermsDocument|null>;create(doc:TermsDocument):Promise<TermsDocument> }
class MongoTermsRepository implements TermsRepository {
 async find(yatraId:string,version:string) { const db=await getDb(); return await db.collection(Collections.terms).findOne({yatraId,version},{...sessionOptions(),projection:{_id:0}}) as unknown as TermsDocument|null; }
 async create(doc:TermsDocument) { const db=await getDb(); await db.collection(Collections.terms).updateOne({yatraId:doc.yatraId,version:doc.version},{$setOnInsert:doc},{...sessionOptions(),upsert:true});return (await this.find(doc.yatraId,doc.version))!; }
}
const repo:TermsRepository=new MongoTermsRepository(); export const getTermsRepository=()=>repo;
