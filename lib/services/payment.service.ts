import { getAuditRepository } from '@/lib/repositories/audit.repository';
import { getUnitOfWork } from '@/lib/repositories/unit-of-work';
import { v4 as uuidv4 } from 'uuid';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
import { getPaymentRepository } from '@/lib/repositories/payment.repository';
import { getYatraRepository } from '@/lib/repositories/yatra.repository';
import { getPaymentProvider } from '@/lib/payments/mock-provider';
import { PaymentOutcome } from '@/lib/payments/provider';
import { issueTicket } from '@/lib/services/ticket.service';
import { Booking,BookingStatus,PaymentMethod,PaymentStatus } from '@/lib/domain/types';
export class PaymentError extends Error { constructor(public code:string,message:string){super(message);} }
function pending(b:Booking) {
 if(b.status!==BookingStatus.PAYMENT_PENDING || !b.expiresAt || Date.parse(b.expiresAt)<=Date.now()) throw new PaymentError('INVALID_STATE','Booking is not awaiting payment or has expired');
}
export async function createOrder(bookingReference:string) {
 const provider=getPaymentProvider();
 return getUnitOfWork().run(async()=>{
  const repo=getBookingRepository(); const b=await repo.findByReference(bookingReference);
  if(!b) throw new PaymentError('BOOKING_NOT_FOUND','Booking not found'); pending(b);
  // Write the aggregate to serialize order, cancellation and confirmation races.
  await repo.update(b.id,{updatedAt:new Date().toISOString()});
  const history=await getPaymentRepository().findByBooking(b.id);
  const existing=history.find(p=>p.providerOrderId && p.status===PaymentStatus.PENDING);
  if(existing) return {orderId:existing.providerOrderId,amount:b.totalAmount,currency:'INR',provider:provider.name,isMock:provider.isMock};
  const order=await provider.createOrder({bookingReference,amount:b.totalAmount});
  await getPaymentRepository().create({id:uuidv4(),bookingId:b.id,amount:b.totalAmount,method:PaymentMethod.MOCK,status:PaymentStatus.PENDING,providerOrderId:order.orderId,createdAt:new Date().toISOString()});
  return {...order,isMock:provider.isMock};
 });
}
export async function verifyAndConfirm(params:{bookingReference:string;orderId:string;simulate?:PaymentOutcome}):Promise<{status:PaymentStatus;booking:Booking}> {
 const provider=getPaymentProvider();
 return getUnitOfWork().run(async()=>{
  const repo=getBookingRepository();const b=await repo.findByReference(params.bookingReference);
  if(!b) throw new PaymentError('BOOKING_NOT_FOUND','Booking not found');
  const payment=await getPaymentRepository().findByOrderId(params.orderId);
  if(!payment || payment.bookingId!==b.id || payment.amount!==b.totalAmount) throw new PaymentError('INVALID_ORDER','Order does not belong to this booking');
  if(b.status===BookingStatus.CONFIRMED) return {status:PaymentStatus.PAID,booking:b};
  pending(b);
  await repo.update(b.id,{updatedAt:new Date().toISOString()});
  const result=await provider.verifyPayment({...params,amount:b.totalAmount});
  if(result.status===PaymentStatus.PENDING) return {status:result.status,booking:b};
  await getPaymentRepository().create({id:uuidv4(),bookingId:b.id,amount:b.totalAmount,method:PaymentMethod.MOCK,status:result.status,providerOrderId:params.orderId,providerPaymentId:result.providerPaymentId,createdAt:new Date().toISOString()});
  const booking=(await repo.update(b.id,{status:result.status===PaymentStatus.PAID?BookingStatus.CONFIRMED:BookingStatus.CANCELLED,paymentStatus:result.status}))!;
  if(result.status===PaymentStatus.PAID) await issueTicket(b.id);
  else await getYatraRepository().releaseSeats(b.yatraId,b.travellerCount);
  await getAuditRepository().append({action:'PAYMENT_'+result.status,entity:'Booking',entityId:b.id});
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
