/** Read-only legacy-data inspection. Does not initialize indexes or alter data. */
import { MongoClient } from 'mongodb';
export async function inspectMongoData() {
 if(!process.env.MONGO_URL) throw new Error('MONGO_URL is required');
 const client=new MongoClient(process.env.MONGO_URL);
 try {
  await client.connect();const db=client.db(process.env.DB_NAME||'gokulamyatras');
  const hello=await db.command({hello:1});const findings:Array<{check:string;count:number}>=[];
  const duplicates:Record<string,string[]>= {yatras:['id','slug'],customers:['id','mobile'],users:['id','email'],bookings:['id','reference'],travellers:['id'],payments:['id'],tickets:['id','bookingId','token'],checkins:['id','bookingId'],terms_consents:['id','bookingId']};
  for(const [name,fields] of Object.entries(duplicates)) for(const field of fields){
   const rows=await db.collection(name).aggregate([{$group:{_id:'$'+field,n:{$sum:1}}},{$match:{n:{$gt:1}}},{$count:'count'}]).toArray();
   if(rows[0]?.count)findings.push({check:`${name}: duplicate ${field}`,count:rows[0].count});
  }
  const bookings=await db.collection('bookings').find({}).toArray();
  for(const y of await db.collection('yatras').find({}).toArray()){
   const reserved=bookings.filter(b=>b.yatraId===y.id && ['PENDING','PAYMENT_PENDING','CONFIRMED'].includes(b.status)).reduce((n,b)=>n+b.travellerCount,0);
   if(reserved!==y.booked || y.booked>y.capacity || y.booked<0)findings.push({check:`seat accounting: ${y.id}`,count:1});
  }
  for(const b of bookings) {
   if(await db.collection('travellers').countDocuments({bookingId:b.id})!==b.travellerCount)findings.push({check:`traveller count: ${b.id}`,count:1});
   if(!await db.collection('customers').findOne({id:b.customerId}) || !await db.collection('yatras').findOne({id:b.yatraId}))findings.push({check:`orphan booking: ${b.id}`,count:1});
   const consent=await db.collection('terms_consents').findOne({bookingId:b.id});
   if(!consent?.termsHtml || !consent?.contentHash)findings.push({check:`missing historical terms evidence: ${b.id}`,count:1});
   if(!b.customerSnapshot)findings.push({check:`missing customer snapshot: ${b.id}`,count:1});
   if(b.status==='PAYMENT_PENDING' && !b.expiresAt)findings.push({check:`missing hold expiry: ${b.id}`,count:1});
  }
  const invalidMobiles=await db.collection('customers').countDocuments({mobile:{$not:/^[6-9]\d{9}$/}});
  if(invalidMobiles)findings.push({check:'noncanonical customer mobiles',count:invalidMobiles});
  if(!hello.setName && hello.msg!=='isdbgrid')findings.push({check:'Mongo replica set or sharded topology required',count:1});
  return {pass:findings.length===0,findings};
 } finally {await client.close();}
}
