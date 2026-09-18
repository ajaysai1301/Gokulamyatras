/** Ticket issuance + secure token resolution. */
import { v4 as uuidv4 } from 'uuid';
import { getTicketRepository } from '@/lib/repositories/ticket.repository';
import { generateTicketToken } from '@/lib/auth/crypto';
import { Ticket } from '@/lib/domain/types';

export async function issueTicket(bookingId: string): Promise<Ticket> {
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
}
