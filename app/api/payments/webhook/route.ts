import {NextRequest,NextResponse} from 'next/server';
import {processWebhook} from '@/lib/services/webhook.service';
import {PaymentError} from '@/lib/services/payment.service';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{const reader=req.body?.getReader();if(!reader)return NextResponse.json({error:'Missing body'},{status:400});const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return NextResponse.json({error:'Body too large'},{status:413});}chunks.push(value);}
 return NextResponse.json(await processWebhook(Buffer.concat(chunks).toString('utf8'),req.headers.get('x-razorpay-signature'),req.headers.get('x-razorpay-event-id')));
 }catch(e){const invalid=e instanceof PaymentError && ['INVALID_SIGNATURE','EVENT_REUSED'].includes(e.code);return NextResponse.json({error:invalid?'Invalid webhook':'Webhook processing failed'},{status:invalid?400:503});}
}
