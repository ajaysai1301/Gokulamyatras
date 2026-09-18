import { prismaDb } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import type { BookingRepository, BookingFilter } from './booking.repository';
import type { PaymentRepository } from './payment.repository';
import { Booking, Traveller, Payment } from '@/lib/domain/types';

// Domain boundaries use ISO dates; JSON snapshots remain JSON rather than Date objects.
function domain<T>(value: unknown): T {
 return JSON.parse(JSON.stringify(value, (_key, item) => item === null ? undefined : item)) as T;
}
export class PrismaBookingRepository implements BookingRepository {
 async findByRequestKey(requestKey:string){return domain<Booking|null>(await prismaDb().booking.findUnique({where:{requestKey}}) ?? false) || null;}
 async nextReference(year:number){const c=await prismaDb().bookingCounter.upsert({where:{year},create:{year,seq:1},update:{seq:{increment:1}}});return `GMY-${year}-${String(c.seq).padStart(5,'0')}`;}
 async create(b:Booking){return domain<Booking>(await prismaDb().booking.create({data:{...b,customerSnapshot:b.customerSnapshot as unknown as Prisma.InputJsonValue}}));}
 async findByReference(reference:string){const b=await prismaDb().booking.findUnique({where:{reference}});return b?domain<Booking>(b):null;}
 async findById(id:string){const b=await prismaDb().booking.findUnique({where:{id}});return b?domain<Booking>(b):null;}
 async update(id:string,patch:Partial<Booking>){const {customerSnapshot,...rest}=patch;const result=await prismaDb().booking.updateMany({where:{id},data:{...rest,...(customerSnapshot?{customerSnapshot:customerSnapshot as unknown as Prisma.InputJsonValue}:{}),revision:{increment:1}}});return result.count?this.findById(id):null;}
 async findAll(f:BookingFilter={}){const where:Prisma.BookingWhereInput={yatraId:f.yatraId,status:f.status as Prisma.BookingWhereInput['status'],paymentStatus:f.paymentStatus as Prisma.BookingWhereInput['paymentStatus']};if(f.search)where.OR=[{reference:{contains:f.search,mode:'insensitive'}},{yatraName:{contains:f.search,mode:'insensitive'}}];return domain<Booking[]>(await prismaDb().booking.findMany({where,orderBy:{createdAt:'desc'}}));}
 async findByCustomer(customerId:string){return domain<Booking[]>(await prismaDb().booking.findMany({where:{customerId},orderBy:{createdAt:'desc'}}));}
 async saveTravellers(travellers:Traveller[]){if(travellers.length)await prismaDb().traveller.createMany({data:travellers});}
 async findTravellers(bookingId:string){return domain<Traveller[]>(await prismaDb().traveller.findMany({where:{bookingId},orderBy:{id:'asc'}}));}
}
export class PrismaPaymentRepository implements PaymentRepository {
 async create(p:Payment){return domain<Payment>(await prismaDb().payment.create({data:p}));}
 async findByBooking(bookingId:string){return domain<Payment[]>(await prismaDb().payment.findMany({where:{bookingId},orderBy:{createdAt:'asc'}}));}
 async findByOrderId(providerOrderId:string){const p=await prismaDb().payment.findFirst({where:{providerOrderId},orderBy:{createdAt:'asc'}});return p?domain<Payment>(p):null;}
 async findAll(){return domain<Payment[]>(await prismaDb().payment.findMany({orderBy:{createdAt:'desc'}}));}
}
