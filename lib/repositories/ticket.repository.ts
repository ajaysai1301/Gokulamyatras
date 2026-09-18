import { getDb, Collections } from '@/lib/db/mongo';
import { Ticket } from '@/lib/domain/types';

export interface TicketRepository {
  create(ticket: Ticket): Promise<Ticket>;
  findByToken(token: string): Promise<Ticket | null>;
  findByBooking(bookingId: string): Promise<Ticket | null>;
}

class MongoTicketRepository implements TicketRepository {
  async create(ticket: Ticket) {
    const db = await getDb();
    await db.collection(Collections.tickets).insertOne({ ...ticket });
    return ticket;
  }
  async findByToken(token: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.tickets).findOne({ token }, { projection: { _id: 0 } });
    return (doc as unknown as Ticket) || null;
  }
  async findByBooking(bookingId: string) {
    const db = await getDb();
    const doc = await db.collection(Collections.tickets).findOne({ bookingId }, { projection: { _id: 0 } });
    return (doc as unknown as Ticket) || null;
  }
}

let repo: TicketRepository | null = null;
export function getTicketRepository(): TicketRepository {
  if (!repo) repo = new MongoTicketRepository();
  return repo;
}
