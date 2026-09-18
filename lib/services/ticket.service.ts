import { getUnitOfWork } from '@/lib/repositories/unit-of-work';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
/** Ticket issuance + secure token resolution. */
import { v4 as uuidv4 } from 'uuid';
import { getTicketRepository } from '@/lib/repositories/ticket.repository';
import { generateTicketToken } from '@/lib/auth/crypto';
import { Ticket } from '@/lib/domain/types';

export async function issueTicket(bookingId: string): Promise<Ticket> {
  return getUnitOfWork().run(async()=>{
  const b=await getBookingRepository().findById(bookingId);
  if(!b || b.status!=='CONFIRMED') throw new Error('Only confirmed bookings receive tickets');
  const repo = getTicketRepository();
  const existing = await repo.findByBooking(bookingId);
  if (existing) return existing;
  const ticket: Ticket = {
    id: uuidv4(),
    bookingId,
    token: generateTicketToken(),
    issuedAt: new Date().toISOString(),
  };
  return repo.create(ticket);
  });
}
