import { prismaDb } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
export const gatewayRepository={
 credential:(id:string)=>prismaDb().gatewayCredential.findUniqueOrThrow({where:{id}}),
 credentials:()=>prismaDb().gatewayCredential.findMany(),
 archive:(data:Prisma.GatewayCredentialCreateInput)=>prismaDb().gatewayCredential.create({data}),
 find:()=>prismaDb().paymentGatewayConfig.findUnique({where:{id:'razorpay'}}),
 save:(data:Prisma.PaymentGatewayConfigUncheckedCreateInput)=>prismaDb().paymentGatewayConfig.upsert({where:{id:'razorpay'},create:data,update:data}),
};
