import {randomUUID} from 'node:crypto';
import { z } from 'zod';
import { usesPostgres } from '@/lib/db/prisma';
import { gatewayRepository } from '@/lib/repositories/gateway.repository';
import { getAuditRepository } from '@/lib/repositories/audit.repository';
import { getUnitOfWork } from '@/lib/repositories/unit-of-work';
import { encryptPaymentSecret, decryptPaymentSecret } from '@/lib/payments/config-crypto';
import { RazorpayPaymentProvider } from '@/lib/payments/razorpay-provider';
import { getPaymentProvider } from '@/lib/payments/mock-provider';
const schema=z.object({keyId:z.string().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/),keySecret:z.string().max(512).default(''),webhookSecret:z.string().max(512).default(''),testMode:z.boolean(),enabled:z.boolean()});
export async function gatewaySummary(){
 const c=usesPostgres()?await gatewayRepository.find():null;
 return {provider:'razorpay',displayName:'Razorpay',currency:'INR',apiBaseUrl:'https://api.razorpay.com/v1',keyId:c?.keyId??'',testMode:c?.testMode??true,enabled:c?.enabled??false,keySecretSaved:!!c?.encryptedKeySecret,webhookSecretSaved:!!c?.encryptedWebhookSecret};
}
export async function saveGateway(raw:unknown,userId:string){
 const input=schema.parse(raw);
 if(input.keyId.startsWith('rzp_test_')!==input.testMode)throw new Error('Key ID does not match selected payment mode');
 return getUnitOfWork().run(async()=>{
 const old=await gatewayRepository.find();
 // Keep credentials stable while an order can still receive callbacks/webhooks.
 if(old && old.keyId!==input.keyId && (!input.keySecret || !input.webhookSecret))throw new Error('Changing Key ID requires both new secrets');
 const encryptedKeySecret=input.keySecret?encryptPaymentSecret(input.keySecret):old?.encryptedKeySecret;
 const encryptedWebhookSecret=input.webhookSecret?encryptPaymentSecret(input.webhookSecret):old?.encryptedWebhookSecret;
 if(!encryptedKeySecret || !encryptedWebhookSecret)throw new Error('API secret and webhook secret are required');
 const changed=!old?.credentialId || old.keyId!==input.keyId || !!input.keySecret || !!input.webhookSecret;
 const credentialId=changed?randomUUID():old!.credentialId!;
 if(changed)await gatewayRepository.archive({id:credentialId,keyId:input.keyId,encryptedKeySecret,encryptedWebhookSecret});
 await gatewayRepository.save({credentialId,id:'razorpay',provider:'razorpay',displayName:'Razorpay',keyId:input.keyId,encryptedKeySecret,encryptedWebhookSecret,testMode:input.testMode,enabled:input.enabled});
 await getAuditRepository().append({userId,action:'PAYMENT_CONFIGURATION_UPDATED',entity:'PaymentGatewayConfig',entityId:'razorpay'});
 return gatewaySummary();
 });
}
export async function configuredProvider(forSettlement=false,credentialId?:string){
 if(usesPostgres()){
 if(credentialId){const c=await gatewayRepository.credential(credentialId);return new RazorpayPaymentProvider({keyId:c.keyId,secret:decryptPaymentSecret(c.encryptedKeySecret),credentialId});}
 const c=await gatewayRepository.find();
 if(c){if(!c.enabled && !forSettlement)throw new Error('Online payments are currently unavailable');return new RazorpayPaymentProvider({keyId:c.keyId,secret:decryptPaymentSecret(c.encryptedKeySecret),credentialId:c.credentialId??undefined});}
 }
 return getPaymentProvider();
}
export async function webhookSecret(){const c=usesPostgres()?await gatewayRepository.find():null;return c?decryptPaymentSecret(c.encryptedWebhookSecret):process.env.RAZORPAY_WEBHOOK_SECRET;}

export async function webhookSecrets(){const records=usesPostgres()?await gatewayRepository.credentials():[];const values=records.map(c=>decryptPaymentSecret(c.encryptedWebhookSecret));const current=await webhookSecret();if(current)values.push(current);return values;}
