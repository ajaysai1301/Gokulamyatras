import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { getDb,closeDb,Collections,initializeIndexes } from '../lib/db/mongo';
import { createYatra,updateYatra } from '../lib/services/yatra.service';
import { createBooking,cancelBooking,getBookingView,expirePendingBookings } from '../lib/services/booking.service';
import { createOrder,verifyAndConfirm,recordManualPayment } from '../lib/services/payment.service';
import { checkIn } from '../lib/services/checkin.service';
import { getTerms } from '../lib/services/terms.service';
import { hashPassword,signToken,verifyToken } from '../lib/auth/crypto';
import { getStaffFromToken } from '../lib/services/auth.service';
import { getConsentRepository } from '../lib/repositories/consent.repository';
import { getBookingRepository } from '../lib/repositories/booking.repository';
import { getYatraRepository } from '../lib/repositories/yatra.repository';
import { BookingSource,Gender,PaymentMethod,YatraStatus } from '../lib/domain/types';
import { NextRequest } from 'next/server';
import { POST,GET } from '../app/api/[[...path]]/route';
import { csvCell } from '../lib/csv';
import { getPaymentProvider } from '../lib/payments/mock-provider';
let mongo:MongoMemoryReplSet;
let serial=0;
before(async()=>{
 process.env.AUTH_SECRET=crypto.randomBytes(48).toString('hex');
 process.env.ENABLE_DEMO_SEED='false';process.env.ENABLE_MOCK_PAYMENTS='true';
 process.env.MONGOMS_DOWNLOAD_DIR=path.resolve('../../mongo-binaries');
 mongo=await MongoMemoryReplSet.create({binary:{version:'7.0.14'},replSet:{count:1,storageEngine:'wiredTiger'}});
 process.env.MONGO_URL=mongo.getUri();process.env.DB_NAME='stabilization_test';
 await getDb();
});
after(async()=>{await closeDb();await mongo?.stop();});
async function yatra(capacity=30,name='Audit Yatra'){
 return createYatra({name,slug:'audit-'+(++serial),capacity,price:100,startDate:'2099-10-01T00:00:00.000Z',endDate:'2099-10-03T00:00:00.000Z',status:YatraStatus.PUBLISHED});
}
function input(slug:string,mobile='9876543210') {return {yatraSlug:slug,primaryCustomer:{fullName:'Test Customer',mobile},travellers:[{fullName:'Test Traveller',age:30,gender:Gender.OTHER}],termsVersion:'1.0',acceptedTerms:true};}
async function request(route:string,body:unknown,headers:Record<string,string>={}) {
 return POST(new NextRequest('http://localhost:3000/api/'+route,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}),{params:Promise.resolve({path:route.split('/')})});
}
test('tokens fail closed; revoked users cannot authenticate',async()=>{
 const payload={sub:'staff',role:'ADMIN',name:'Admin',email:'admin@example.test'};
 const token=signToken(payload);assert.ok(verifyToken(token));
 assert.equal(verifyToken(token+'.extra'),null);assert.equal(verifyToken(signToken(payload,-1)),null);
 assert.equal(verifyToken(token.split('.')[0]+'.'+'界'.repeat(43)),null);
 const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const sig=crypto.createHmac('sha256',process.env.AUTH_SECRET!).update(body).digest('base64url');
 assert.equal(verifyToken(body+'.'+sig),null);
 const secret=process.env.AUTH_SECRET;delete process.env.AUTH_SECRET;assert.throws(()=>signToken(payload));process.env.AUTH_SECRET=secret;
 const db=await getDb();await db.collection(Collections.users).insertOne({id:'staff',email:payload.email,name:'Admin',role:'ADMIN',active:false});
 assert.equal(await getStaffFromToken(token),null);
});
test('idempotent booking retries reserve once and reject changed payloads',async()=>{
 const y=await yatra();const body={...input(y.slug),requestKey:crypto.randomUUID()};
 const results=await Promise.all(Array.from({length:8},()=>createBooking(body)));
 assert.equal(new Set(results.map(r=>r.booking.id)).size,1);
 assert.equal((await getYatraRepository().findById(y.id))!.booked,1);
 await assert.rejects(createBooking({...body,primaryCustomer:{...body.primaryCustomer,fullName:'Someone else'}}),/different details/);
});
test('production cannot enable mock payments; CSV formulas are escaped',()=>{
 const env=process.env as Record<string,string|undefined>;const previous=env.NODE_ENV;env.NODE_ENV='production';
 try{assert.throws(()=>getPaymentProvider(),/disabled/);}finally{env.NODE_ENV=previous;}
 assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('a,"b"'),'"a,""b"""');
});
test('concurrent reservations never oversell and create complete aggregates',async()=>{
 const y=await yatra(3);
 const results=await Promise.allSettled(Array.from({length:12},()=>createBooking(input(y.slug))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);
 assert.equal((await getYatraRepository().findById(y.id))!.booked,3);
 const bs=await getBookingRepository().findAll({yatraId:y.id});assert.equal(bs.length,3);
 for(const b of bs){const view=(await getBookingView(b.reference))!;assert.equal(view.travellers.length,1);assert.ok(view.consent?.contentHash);}
 assert.equal(new Set(bs.map(b=>b.reference)).size,3);
});
test('injected consent failure rolls back customer, booking, travellers and seats',async()=>{
 const y=await yatra();const repo=getConsentRepository();const original=repo.create;
 repo.create=async()=>{throw new Error('injected failure');};
 try {await assert.rejects(createBooking(input(y.slug,'9876543201')),/injected failure/);} finally {repo.create=original;}
 assert.equal((await getYatraRepository().findById(y.id))!.booked,0);
 assert.equal((await getBookingRepository().findAll({yatraId:y.id})).length,0);
 const db=await getDb();assert.equal(await db.collection(Collections.customers).countDocuments({mobile:'9876543201'}),0);
});
test('orders are bound to bookings and repeated confirmation is idempotent',async()=>{
 const y=await yatra();const a=(await createBooking(input(y.slug))).booking;const b=(await createBooking(input(y.slug))).booking;
 const orders=await Promise.all(Array.from({length:8},()=>createOrder(a.reference)));
 assert.equal(new Set(orders.map(o=>o.orderId)).size,1);const orderId=orders[0].orderId!;
 await assert.rejects(verifyAndConfirm({bookingReference:b.reference,orderId,simulate:'success'}),/does not belong/);
 await Promise.all(Array.from({length:8},()=>verifyAndConfirm({bookingReference:a.reference,orderId,simulate:'success'})));
 const view=(await getBookingView(a.reference))!;assert.equal(view.status,'CONFIRMED');assert.equal(view.payments.filter(p=>p.status==='PAID').length,1);
 const db=await getDb();assert.equal(await db.collection(Collections.tickets).countDocuments({bookingId:a.id}),1);
});
test('duplicate cancellation releases once and cancelled bookings never resurrect',async()=>{
 const y=await yatra();const b=(await createBooking(input(y.slug))).booking;const order=await createOrder(b.reference);
 await Promise.all(Array.from({length:10},()=>cancelBooking(b.reference)));
 assert.equal((await getYatraRepository().findById(y.id))!.booked,0);
 await assert.rejects(verifyAndConfirm({bookingReference:b.reference,orderId:order.orderId!,simulate:'success'}),/not awaiting/);
});
test('payment versus cancellation race leaves a consistent terminal state',async()=>{
 const y=await yatra();const b=(await createBooking(input(y.slug))).booking;const order=await createOrder(b.reference);
 await Promise.allSettled([cancelBooking(b.reference),verifyAndConfirm({bookingReference:b.reference,orderId:order.orderId!,simulate:'success'})]);
 assert.equal((await getBookingView(b.reference))!.status,'CANCELLED');
 assert.equal((await getYatraRepository().findById(y.id))!.booked,0);
});
test('duplicate check-in is explicit and checked-in bookings cannot cancel',async()=>{
 const y=await yatra();const b=(await createBooking(input(y.slug))).booking;
 await recordManualPayment({bookingReference:b.reference,method:PaymentMethod.CASH});
 const v=(await getBookingView(b.reference))!;
 const staff={sub:'staff',role:'ADMIN',name:'Admin',email:'admin@example.test',exp:Date.now()+100000};
 const results=await Promise.all(Array.from({length:8},()=>checkIn(v.ticket!.token,staff)));
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(results.filter(r=>!r.ok && r.reason==='ALREADY_CHECKED_IN').length,7);
 await assert.rejects(cancelBooking(b.reference),/checked-in/);
});
test('expired holds release exactly once',async()=>{
 const y=await yatra();const b=(await createBooking(input(y.slug))).booking;
 await getBookingRepository().update(b.id,{expiresAt:'2000-01-01T00:00:00.000Z'});
 await Promise.all([expirePendingBookings(),expirePendingBookings()]);
 assert.equal((await getBookingView(b.reference))!.status,'EXPIRED');assert.equal((await getYatraRepository().findById(y.id))!.booked,0);
});
test('terms are escaped, immutable and stale acceptance is rejected',async()=>{
 const y=await yatra(30,'<script>alert(1)</script>');const first=await getTerms(y);
 assert.ok(!first.html.includes('<script>'));assert.ok(first.html.includes('&lt;script&gt;'));
 const b=(await createBooking(input(y.slug))).booking;
 await updateYatra(y.id,{name:'Edited name',tcVersion:'2.0'});
 await assert.rejects(createBooking(input(y.slug)),/Terms changed/);
 assert.equal((await getBookingView(b.reference))!.consent!.contentHash,first.contentHash);
 assert.equal((await getTerms(y)).html,first.html);
});
test('anonymous booking cannot overwrite existing customer; input mobile is canonical',async()=>{
 const y=await yatra();const a=(await createBooking(input(y.slug,'+919876543211'))).booking;
 const second=input(y.slug,'9876543211');second.primaryCustomer.fullName='Changed name';
 await createBooking(second);const db=await getDb();
 assert.equal(await db.collection(Collections.customers).countDocuments({mobile:'9876543211'}),1);
 assert.equal((await getBookingView(a.reference))!.customer!.fullName,'Test Customer');
});
test('draft, past, capacity tampering, and invalid manual methods are rejected',async()=>{
 const y=await yatra();await createBooking(input(y.slug));
 await assert.rejects(updateYatra(y.id,{capacity:0}));await assert.rejects(updateYatra(y.id,{booked:0}));
 await updateYatra(y.id,{status:YatraStatus.DRAFT});await assert.rejects(createBooking(input(y.slug)),/not open/);
 const b=(await getBookingRepository().findAll({yatraId:y.id}))[0];
 await assert.rejects(recordManualPayment({bookingReference:b.reference,method:PaymentMethod.RAZORPAY}));
});
test('indexes enforce uniqueness and initialization fails on legacy duplicates',async()=>{
 const db=await getDb();const indexes=await db.collection(Collections.bookings).indexes();assert.ok(indexes.some(i=>i.unique && i.key.reference===1));
 await assert.rejects(db.collection(Collections.users).insertOne({id:'staff',email:'other@example.test'}));
 await db.collection(Collections.checkins).dropIndex('bookingId_1');
 await db.collection(Collections.checkins).insertMany([{id:'duplicate1',bookingId:'duplicate'},{id:'duplicate2',bookingId:'duplicate'}]);
 await assert.rejects(initializeIndexes(db));
 await db.collection(Collections.checkins).deleteMany({bookingId:'duplicate'});await initializeIndexes(db);
});
test('API rejects unauthenticated admin, spoofed origins, invalid data and unrelated payment attempts',async()=>{
 const res=await GET(new NextRequest('http://localhost:3000/api/admin/bookings'),{params:Promise.resolve({path:['admin','bookings']})});assert.equal(res.status,401);
 assert.equal((await request('bookings',{}, {origin:'https://evil.example'})).status,403);
 assert.equal((await request('bookings',{})).status,400);
 const y=await yatra();const b=(await createBooking(input(y.slug))).booking;
 assert.equal((await request('payments/order',{bookingReference:b.reference,mobile:'9876543222'})).status,404);
 const sourceInput={...input(y.slug),source:BookingSource.ADMIN};const made=await request('bookings',sourceInput);assert.equal(made.status,201);assert.equal((await made.json()).booking.source,'ONLINE');
});
test('login sets an HttpOnly cookie, never returns a token, and enforces rate limits',async()=>{
 const db=await getDb();const password=hashPassword('test-password');
 await db.collection(Collections.users).insertOne({id:'login-staff',email:'login@example.test',name:'Login',role:'ADMIN',active:true,passwordHash:password.hash,passwordSalt:password.salt});
 const res=await request('auth/login',{email:'login@example.test',password:'test-password'});
 assert.equal(res.status,200);assert.ok(res.headers.get('set-cookie')?.includes('HttpOnly'));assert.ok(!(await res.json()).token);
 const cookie=res.headers.get('set-cookie')!.split(';')[0];
 const admin=await GET(new NextRequest('http://localhost:3000/api/admin/bookings',{headers:{cookie}}),{params:Promise.resolve({path:['admin','bookings']})});assert.equal(admin.status,200);
 let limited=false;for(let i=0;i<12;i++){if((await request('auth/login',{email:'login@example.test',password:'wrong'})).status===429)limited=true;}assert.ok(limited);
});
