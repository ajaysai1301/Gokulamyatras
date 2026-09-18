'use client';
export type CheckoutResult={razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string};
type Options={key:string;amount:number;currency:string;order_id:string;name:string;handler:(r:CheckoutResult)=>void;modal:{ondismiss:()=>void};prefill:{name:string;contact:string;email:string}};
declare global {interface Window {Razorpay?:new(options:Options)=>{open:()=>void;on:(event:string,handler:()=>void)=>void}}}
export function openCheckout(order:{keyId?:string;amount:number;currency:string;orderId:string},customer:{fullName:string;mobile:string;email:string}):Promise<CheckoutResult>{
 return new Promise((resolve,reject)=>{
 if(!window.Razorpay || !order.keyId){reject(new Error('Secure checkout could not load. Please retry.'));return;}
 const checkout=new window.Razorpay({key:order.keyId,amount:order.amount*100,currency:order.currency,order_id:order.orderId,name:'GokulamYatras',prefill:{name:customer.fullName,contact:customer.mobile,email:customer.email},handler:resolve,modal:{ondismiss:()=>reject(new Error('Checkout closed. Your booking remains reserved until its expiry.'))}});
 checkout.on('payment.failed',()=>reject(new Error('Payment was unsuccessful. Retry before your booking expires.')));
 checkout.open();
 });
}
