import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {disposablePostgres} from './helpers/postgres';
import {closePrisma,getPrisma} from '../lib/db/prisma';
import {createYatra} from '../lib/services/yatra.service';
import {createBooking,getBookingView,cancelBooking,expirePendingBookings} from '../lib/services/booking.service';
import {createOrder,verifyAndConfirm,recordManualPayment,settleVerifiedPayment} from '../lib/services/payment.service';
import {checkIn,validateToken} from '../lib/services/checkin.service';
import {getUserRepository} from '../lib/repositories/user.repository';
import {getConsentRepository} from '../lib/repositories/consent.repository';
import {getYatraRepository} from '../lib/repositories/yatra.repository';
import {getBookingRepository} from '../lib/repositories/booking.repository';
import {publicBookingView} from '../lib/services/public-booking';
import {getDashboardMetrics,getYatraReports} from '../lib/services/dashboard.service';
import {consumeRateLimit} from '../lib/repositories/rate-limit.repository';
import {hashPassword} from '../lib/auth/crypto';
import {login,getStaffFromToken} from '../lib/services/auth.service';
import {saveGateway,gatewaySummary,configuredProvider} from '../lib/services/gateway.service';
import {BookingStatus,Gender,PaymentMethod,PaymentStatus,UserRole,YatraStatus} from '../lib/domain/types';
let pg:Awaited<ReturnType<typeof disposablePostgres>>;
const staff={exp:Math.floor(Date.now()/1000)+3600,sub:randomUUID(),role:'ADMIN',name:'Test Admin',email:'admin@example.test'};
before(async()=>{process.env.ENABLE_MOCK_PAYMENTS='true';process.env.ENABLE_DEMO_SEED='false';process.env.AUTH_SECRET='test-only-'+randomUUID()+randomUUID();process.env.PAYMENT_CONFIG_ENCRYPTION_KEY=randomUUID();pg=await disposablePostgres();const p=hashPassword('Test-only-password-123!');await getUserRepository().insertMany([{id:staff.sub,email:staff.email,name:staff.name,role:UserRole.ADMIN,active:true,passwordHash:p.hash,passwordSalt:p.salt,createdAt:new Date().toISOString()}]);});
after(async()=>{await closePrisma();await pg?.stop();});
const yatra=(capacity=8)=>createYatra({name:'PostgreSQL Test Yatra',slug:'pg-'+randomUUID(),price:100,capacity,startDate:'2099-10-01T00:00:00.000Z',endDate:'2099-10-03T00:00:00.000Z',status:YatraStatus.PUBLISHED});
const input=(slug:string)=>({requestKey:randomUUID(),yatraSlug:slug,primaryCustomer:{fullName:'Test Family',mobile:'9876543210'},travellers:[{fullName:'Traveller One',age:30,gender:Gender.OTHER,idProofNumber:'sensitive-proof'}],termsVersion:'1.0',acceptedTerms:true});
test('PostgreSQL migration, constraints and concurrent capacity reservations',async()=>{const y=await yatra(3);const results=await Promise.allSettled(Array.from({length:10},()=>createBooking(input(y.slug))));assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal((await getYatraRepository().findById(y.id))!.booked,3);await assert.rejects(getPrisma().yatra.update({where:{id:y.id},data:{booked:4}}));await assert.rejects(getPrisma().yatra.update({where:{id:y.id},data:{booked:-1}}));});
test('PostgreSQL idempotent booking/payment/ticket and selected-yatra check-in',async()=>{const y=await yatra();const body=input(y.slug);const results=await Promise.all(Array.from({length:6},()=>createBooking(body)));assert.equal(new Set(results.map(r=>r.booking.id)).size,1);const b=results[0].booking;const orders=await Promise.all(Array.from({length:6},()=>createOrder(b.reference)));assert.equal(new Set(orders.map(o=>o.orderId)).size,1);await Promise.all(Array.from({length:6},()=>verifyAndConfirm({bookingReference:b.reference,orderId:orders[0].orderId,simulate:'success'})));const view=(await getBookingView(b.reference))!;assert.equal(view.payments.filter(p=>p.status==='PAID').length,1);assert.ok(view.ticket);assert.equal((await validateToken(view.ticket!.token,'wrong-yatra')).valid,false);assert.equal((await checkIn(view.ticket!.token,staff,'wrong-yatra')).reason,'WRONG_YATRA');const scans=await Promise.all(Array.from({length:5},()=>checkIn(view.ticket!.token,staff,y.id)));assert.equal(scans.filter(r=>r.ok).length,1);assert.equal(await getPrisma().ticket.count({where:{bookingId:b.id}}),1);await assert.rejects(cancelBooking(b.reference),/checked-in/);const publicView=JSON.stringify(publicBookingView(view));assert.ok(!publicView.includes('sensitive-proof'));assert.ok(!publicView.includes(b.id));assert.ok(!publicView.includes('providerPaymentId'));});
test('PostgreSQL consent immutable and aggregate failure rolls back capacity',async()=>{const y=await yatra();const repo=getConsentRepository();const original=repo.create;repo.create=async()=>{throw Error('injected');};try{await assert.rejects(createBooking(input(y.slug)),/injected/);}finally{repo.create=original;}assert.equal((await getYatraRepository().findById(y.id))!.booked,0);const b=(await createBooking(input(y.slug))).booking;const c=await getPrisma().termsConsent.findUniqueOrThrow({where:{bookingId:b.id}});assert.ok(c.termsId);await assert.rejects(getPrisma().termsConsent.update({where:{id:c.id},data:{version:'tamper'}}));await assert.rejects(getPrisma().termsAndConditions.update({where:{id:c.termsId!},data:{html:'tamper'}}));});
test('PostgreSQL expiry, late captured payment, manual payment and reports',async()=>{const y=await yatra();const b=(await createBooking(input(y.slug))).booking;const order=await createOrder(b.reference);await getBookingRepository().update(b.id,{expiresAt:new Date(0).toISOString()});await expirePendingBookings();await settleVerifiedPayment(order.orderId,{status:PaymentStatus.PAID,providerPaymentId:'pay_late'});const late=(await getBookingView(b.reference))!;assert.equal(late.status,BookingStatus.EXPIRED);assert.equal(late.ticket,null);assert.equal((await getYatraRepository().findById(y.id))!.booked,0);const manual=(await createBooking(input(y.slug),staff.sub)).booking;await recordManualPayment({bookingReference:manual.reference,method:PaymentMethod.CASH});assert.ok((await getBookingView(manual.reference))!.ticket);assert.ok(await getDashboardMetrics());assert.ok((await getYatraReports()).length>0);});
test('PostgreSQL authentication, shared rate limits and encrypted gateway configuration',async()=>{const auth=await login(staff.email,'Test-only-password-123!');assert.ok(auth);assert.ok(await getStaffFromToken(auth.token));const limits=await Promise.all(Array.from({length:15},()=>consumeRateLimit('pg-test',5)));assert.equal(limits.filter(Boolean).length,5);await saveGateway({keyId:'rzp_test_example',keySecret:'unit-secret',webhookSecret:'unit-webhook',testMode:true,enabled:true},staff.sub);assert.ok(!(JSON.stringify(await gatewaySummary())).includes('unit-secret'));const saved=await getPrisma().paymentGatewayConfig.findUniqueOrThrow({where:{id:'razorpay'}});assert.notEqual(saved.encryptedKeySecret,'unit-secret');await saveGateway({keyId:'rzp_live_example',keySecret:'unit-live-secret',webhookSecret:'unit-live-webhook',testMode:false,enabled:false},staff.sub);assert.equal((await configuredProvider(true,saved.credentialId!)).name,'razorpay');assert.equal(await getPrisma().gatewayCredential.count(),2);});

test('PostgreSQL webhook duplicates converge with callback and survive credential rotation',async()=>{
 const {createHmac}=await import('node:crypto');const {processWebhook}=await import('../lib/services/webhook.service');const {RazorpayPaymentProvider}=await import('../lib/payments/razorpay-provider');
 // The fixture uses a real database with a mocked gateway transport, never live keys.
 await getPrisma().paymentGatewayConfig.update({where:{id:'razorpay'},data:{enabled:true}});
 const originalOrder=RazorpayPaymentProvider.prototype.createOrder,originalFetch=RazorpayPaymentProvider.prototype.fetchVerifiedPayment;
 const orderId='order_'+randomUUID(),paymentId='pay_'+randomUUID();
 RazorpayPaymentProvider.prototype.createOrder=async function(i){return {orderId,amount:i.amount,currency:'INR',provider:'razorpay',keyId:this.keyId};};
 RazorpayPaymentProvider.prototype.fetchVerifiedPayment=async()=>({status:PaymentStatus.PAID,providerPaymentId:paymentId});
 try{const y=await yatra();const b=(await createBooking(input(y.slug))).booking;await createOrder(b.reference);
 const raw=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:paymentId,order_id:orderId}}}});const sig=createHmac('sha256','unit-live-webhook').update(raw).digest('hex');const eventId=randomUUID();
 await assert.rejects(processWebhook(raw,'forged',eventId),/signature/);
 await Promise.all(Array.from({length:6},()=>processWebhook(raw,sig,eventId)));
 assert.equal(await getPrisma().webhookEvent.count({where:{id:eventId}}),1);assert.equal(await getPrisma().payment.count({where:{bookingId:b.id,status:'PAID'}}),1);assert.equal(await getPrisma().ticket.count({where:{bookingId:b.id}}),1);
 const callbackSig=createHmac('sha256','unit-live-secret').update(orderId+'|'+paymentId).digest('hex');await verifyAndConfirm({bookingReference:b.reference,orderId,providerPaymentId:paymentId,providerSignature:callbackSig});
 assert.equal(await getPrisma().ticket.count({where:{bookingId:b.id}}),1);
 }finally{RazorpayPaymentProvider.prototype.createOrder=originalOrder;RazorpayPaymentProvider.prototype.fetchVerifiedPayment=originalFetch;}
});
