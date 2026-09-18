import {createHash} from 'node:crypto';
import {z} from 'zod';
import {verifyRazorpayWebhook,RazorpayPaymentProvider} from '@/lib/payments/razorpay-provider';
import {configuredProvider,webhookSecrets} from './gateway.service';
import {webhookRepository} from '@/lib/repositories/webhook.repository';
import {getPaymentRepository} from '@/lib/repositories/payment.repository';
import {getBookingRepository} from '@/lib/repositories/booking.repository';
import {getUnitOfWork} from '@/lib/repositories/unit-of-work';
import {settleVerifiedPayment,PaymentError} from './payment.service';
export async function processWebhook(raw:string,signature:string|null,eventId:string|null){
 if(!(await webhookSecrets()).some(secret=>verifyRazorpayWebhook(raw,signature,secret)))throw new PaymentError('INVALID_SIGNATURE','Invalid webhook signature');
 const id=z.string().min(1).max(200).parse(eventId);
 const bodyHash=createHash('sha256').update(raw).digest('hex');
 const previous=await webhookRepository.find(id);
 if(previous){if(previous.bodyHash!==bodyHash)throw new PaymentError('EVENT_REUSED','Event payload mismatch');return {duplicate:true};}
 const event=z.object({event:z.string(),payload:z.unknown()}).parse(JSON.parse(raw));
 if(!['payment.captured','order.paid'].includes(event.event))return {ignored:true};
 const payload=z.object({payment:z.object({entity:z.object({id:z.string().min(1),order_id:z.string().min(1)})})}).parse(event.payload);
 const entity=payload.payment.entity;
 const order=await getPaymentRepository().findByOrderId(entity.order_id);
 // Retry unknown orders: a webhook may beat local order persistence.
 if(!order)throw new PaymentError('ORDER_NOT_READY','Order not yet available');
 const booking=await getBookingRepository().findById(order.bookingId);
 if(!booking)throw new PaymentError('BOOKING_NOT_FOUND','Booking not found');
 const provider=await configuredProvider(true,order.credentialId);
 if(!(provider instanceof RazorpayPaymentProvider))throw new PaymentError('INVALID_PROVIDER','Razorpay is not configured');
 const result=await provider.fetchVerifiedPayment({orderId:entity.order_id,providerPaymentId:entity.id,bookingReference:booking.reference,amount:booking.totalAmount});
 if(result.status!=='PAID')throw new PaymentError('PAYMENT_NOT_CAPTURED','Payment capture is not yet available');
 return getUnitOfWork().run(async()=>{
 const old=await webhookRepository.find(id);if(old){if(old.bodyHash!==bodyHash)throw new PaymentError('EVENT_REUSED','Event payload mismatch');return {duplicate:true};}
 await settleVerifiedPayment(entity.order_id,result);
 await webhookRepository.create(id,bodyHash);
 return {processed:true};
 });
}
