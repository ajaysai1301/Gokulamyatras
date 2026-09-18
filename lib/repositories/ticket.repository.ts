import { getDb, Collections, sessionOptions } from '@/lib/db/mongo';
import { prismaDb, usesPostgres } from '@/lib/db/prisma';
import { Ticket } from '@/lib/domain/types';

export interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findByToken(token: string): Promise<Ticket | null>;
  findByBooking(bookingId: string): Promise<Ticket | null>;
}

class MongoTicketRepository implements TicketRepository {
  async create(ticket: Ticket) {
    const db = await getDb();
    await db.collection(Collections.tickets).insertOne({ ...ticket }, sessionOptions());
    return ticket;
  }
  async findByToken(token: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.tickets).findOne({ token }, { ...sessionOptions(), projection: { _id: 0 } });
    return (doc as unknown as Ticket) || null;
  }
  async findByBooking(bookingId: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.tickets).findOne({ bookingId }, { ...sessionOptions(), projection: { _id: 0 } });
    return (doc as unknown as Ticket) || null;
  }
}
const ticketRow=(r:any):Ticket=>({...r,issuedAt:r.issuedAt.toISOString()});
class PrismaTicketRepository implements TicketRepository { async create(t:Ticket){return ticketRow(await prismaDb().ticket.create({data:{...t,issuedAt:new Date(t.issuedAt)}}));} async findByToken(token:string){const r=await prismaDb().ticket.findUnique({where:{token}});return r?ticketRow(r):null;} async findByBooking(bookingId:string){const r=await prismaDb().ticket.findUnique({where:{bookingId}});return r?ticketRow(r):null;} }

let repo: TicketRepository | null = null;
export function getTicketRepository(): TicketRepository {
  if(!repo || (usesPostgres() && !(repo instanceof PrismaTicketRepository)) || (!usesPostgres() && !(repo instanceof MongoTicketRepository))) repo=usesPostgres()?new PrismaTicketRepository():new MongoTicketRepository();
  return repo;
}
