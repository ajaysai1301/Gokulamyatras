import { getAuditRepository } from '@/lib/repositories/audit.repository';
import { getUnitOfWork } from '@/lib/repositories/unit-of-work';
import { v4 as uuidv4 } from 'uuid';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
import { getPaymentRepository } from '@/lib/repositories/payment.repository';
import { getYatraRepository } from '@/lib/repositories/yatra.repository';
import { configuredProvider } from '@/lib/services/gateway.service';
import { PaymentOutcome, VerifyPaymentResult } from '@/lib/payments/provider';
import { issueTicket } from '@/lib/services/ticket.service';
import { Booking,BookingStatus,PaymentMethod,PaymentStatus } from '@/lib/domain/types';
export class PaymentError extends Error { constructor(public code:string,message:string){super(message);} }
function pending(b:Booking) {
 if(b.status!==BookingStatus.PAYMENT_PENDING || !b.expiresAt || Date.parse(b.expiresAt)<=Date.now()) throw new PaymentError('INVALID_STATE','Booking is not awaiting payment or has expired');
}
export async function createOrder(bookingReference:string) {
 const provider=await configuredProvider();
 const repo=getBookingRepository();const b=await repo.findByReference(bookingReference);
 if(!b)throw new PaymentError('BOOKING_NOT_FOUND','Booking not found');pending(b);
 const existing=(await getPaymentRepository().findByBooking(b.id)).find(p=>p.providerOrderId && p.status===PaymentStatus.PENDING);
 const describe=(orderId:string)=>({orderId,amount:b.totalAmount,currency:'INR',provider:provider.name,isMock:provider.isMock,keyId:'keyId' in provider?String(provider.keyId):undefined});
 if(existing){const original=await configuredProvider(false,existing.credentialId);return {...describe(existing.providerOrderId!),keyId:'keyId' in original?String(original.keyId):undefined};}
 // Provider I/O is never inside a retryable database transaction. Concurrent unused
 // orders can be abandoned safely: only the persisted canonical order reaches Checkout.
 const order=await provider.createOrder({bookingReference,amount:b.totalAmount});
 return getUnitOfWork().run(async()=>{
 const current=await repo.findById(b.id);if(!current)throw new PaymentError('BOOKING_NOT_FOUND','Booking not found');pending(current);
 await repo.update(b.id,{updatedAt:new Date().toISOString()});
 const winner=(await getPaymentRepository().findByBooking(b.id)).find(p=>p.providerOrderId && p.status===PaymentStatus.PENDING);
 if(winner)return describe(winner.providerOrderId!);
 await getPaymentRepository().create({id:uuidv4(),bookingId:b.id,amount:b.totalAmount,method:provider.isMock?PaymentMethod.MOCK:PaymentMethod.RAZORPAY,status:PaymentStatus.PENDING,providerOrderId:order.orderId,credentialId:'credentialId' in provider?String(provider.credentialId??'')||undefined:undefined,createdAt:new Date().toISOString()});
 return {...order,isMock:provider.isMock};
 });
}
export async function verifyAndConfirm(params:{bookingReference:string;orderId:string;simulate?:PaymentOutcome;providerPaymentId?:string;providerSignature?:string}):Promise<{status:PaymentStatus;booking:Booking}> {
 const b=await getBookingRepository().findByReference(params.bookingReference);
 if(!b)throw new PaymentError('BOOKING_NOT_FOUND','Booking not found');
 const payment=await getPaymentRepository().findByOrderId(params.orderId);
 if(!payment || payment.bookingId!==b.id || payment.amount!==b.totalAmount)throw new PaymentError('INVALID_ORDER','Order does not belong to this booking');
 const provider=await configuredProvider(true,payment.credentialId);
 if(provider.isMock && b.status!==BookingStatus.CONFIRMED)pending(b);
 const verified=await provider.verifyPayment({...params,amount:b.totalAmount});
 return settleVerifiedPayment(params.orderId,verified,provider.isMock);
}
/** Only server-verified results may enter this function. Both transports converge here. */
export async function settleVerifiedPayment(orderId:string,result:VerifyPaymentResult,isMock=false):Promise<{status:PaymentStatus;booking:Booking}>{
 return getUnitOfWork().run(async()=>{
 const repo=getBookingRepository();const payments=getPaymentRepository();const order=await payments.findByOrderId(orderId);
 if(!order)throw new PaymentError('INVALID_ORDER','Unknown payment order');
 const b=await repo.findById(order.bookingId);if(!b)throw new PaymentError('BOOKING_NOT_FOUND','Booking not found');
 await repo.update(b.id,{updatedAt:new Date().toISOString()});
 const history=await payments.findByBooking(b.id);
 const settled=history.find(p=>p.providerOrderId===orderId && p.status===PaymentStatus.PAID);
 if(settled)return {status:PaymentStatus.PAID,booking:b};
 if(result.status===PaymentStatus.PENDING)return {status:result.status,booking:b};
 if(!isMock && result.status!==PaymentStatus.PAID)return {status:PaymentStatus.PENDING,booking:b};
 if(isMock && b.status!==BookingStatus.CONFIRMED)pending(b);
 if(b.status===BookingStatus.CONFIRMED)return {status:b.paymentStatus,booking:b};
 await payments.create({id:uuidv4(),bookingId:b.id,amount:b.totalAmount,method:isMock?PaymentMethod.MOCK:PaymentMethod.RAZORPAY,status:result.status,providerOrderId:orderId,providerPaymentId:result.providerPaymentId,createdAt:new Date().toISOString()});
 const held=b.status===BookingStatus.PAYMENT_PENDING;
 const validHold=held && Date.parse(b.expiresAt)>Date.now();
 const paid=result.status===PaymentStatus.PAID;
 const booking=(await repo.update(b.id,{status:paid && validHold?BookingStatus.CONFIRMED:held?(paid?BookingStatus.EXPIRED:BookingStatus.CANCELLED):b.status,paymentStatus:result.status}))!;
 if(paid && validHold)await issueTicket(b.id);
 else if(held)await getYatraRepository().releaseSeats(b.yatraId,b.travellerCount);
 await getAuditRepository().append({action:paid&&!validHold?'PAYMENT_REFUND_REVIEW_REQUIRED':'PAYMENT_'+result.status,entity:'Booking',entityId:b.id});
 return {status:result.status,booking};
 });
}
export async function recordManualPayment(params:{bookingReference:string;method:PaymentMethod;note?:string}):Promise<Booking> {
 if(![PaymentMethod.CASH,PaymentMethod.UPI,PaymentMethod.BANK_TRANSFER].includes(params.method)) throw new PaymentError('INVALID_METHOD','Select a manual payment method');
 return getUnitOfWork().run(async()=>{
  const repo=getBookingRepository();const b=await repo.findByReference(params.bookingReference);
  if(!b) throw new PaymentError('BOOKING_NOT_FOUND','Booking not found');
  if(b.status===BookingStatus.CONFIRMED) return b;
  pending(b);
  const updated=(await repo.update(b.id,{status:BookingStatus.CONFIRMED,paymentStatus:PaymentStatus.PAID}))!;
  await getPaymentRepository().create({id:uuidv4(),bookingId:b.id,amount:b.totalAmount,method:params.method,status:PaymentStatus.PAID,note:params.note,createdAt:new Date().toISOString()});
  await issueTicket(b.id);
  await getAuditRepository().append({action:'MANUAL_PAYMENT',entity:'Booking',entityId:b.id});return updated;
 });
}
export async function listPayments(){return getPaymentRepository().findAll();}

