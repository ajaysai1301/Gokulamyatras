import { v4 as uuidv4 } from 'uuid';
import { getTicketRepository } from '@/lib/repositories/ticket.repository';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
import { getCheckInRepository } from '@/lib/repositories/checkin.repository';
import { BookingStatus, CheckIn } from '@/lib/domain/types';
import { getBookingView } from '@/lib/services/booking.service';
import { TokenPayload } from '@/lib/auth/crypto';

export async function validateToken(token: string) {
  const ticket = await getTicketRepository().findByToken(token);
  if (!ticket) return { valid: false as const, reason: 'INVALID' as const };
  const booking = await getBookingRepository().findById(ticket.bookingId);
  if (!booking) return { valid: false as const, reason: 'INVALID' as const };
  const view = await getBookingView(booking.reference);
  const existingCheckIn = await getCheckInRepository().findByBooking(booking.id);
  return {
    valid: true as const,
    booking: view,
    alreadyCheckedIn: !!existingCheckIn,
    checkIn: existingCheckIn,
  };
}

export async function checkIn(token: string, coordinator: TokenPayload) {
  const ticket = await getTicketRepository().findByToken(token);
  if (!ticket) return { ok: false as const, reason: 'INVALID' as const };
  const booking = await getBookingRepository().findById(ticket.bookingId);
  if (!booking) return { ok: false as const, reason: 'INVALID' as const };
  if (booking.status !== BookingStatus.CONFIRMED) {
    return { ok: false as const, reason: 'NOT_CONFIRMED' as const };
  }

  const existing = await getCheckInRepository().findByBooking(booking.id);
  if (existing) {
    return { ok: false as const, reason: 'ALREADY_CHECKED_IN' as const, checkIn: existing };
  }

  const record: CheckIn = {
    id: uuidv4(),
    bookingId: booking.id,
    yatraId: booking.yatraId,
    coordinatorId: coordinator.sub,
    coordinatorName: coordinator.name,
    travellerCount: booking.travellerCount,
    checkedInAt: new Date().toISOString(),
  };
  try {
    await getCheckInRepository().create(record);
  } catch {
    // Unique index violation => concurrent duplicate; return already checked in.
    const now = await getCheckInRepository().findByBooking(booking.id);
    return { ok: false as const, reason: 'ALREADY_CHECKED_IN' as const, checkIn: now };
  }
  return { ok: true as const, checkIn: record };
}

export async function checkInSummary(yatraId: string) {
  const bookingRepo = getBookingRepository();
  const checkinRepo = getCheckInRepository();
  const confirmed = await bookingRepo.findAll({ yatraId, status: BookingStatus.CONFIRMED });
  const bookedTravellers = confirmed.reduce((s, b) => s + b.travellerCount, 0);
  const checkIns = await checkinRepo.findByYatra(yatraId);
  const checkedInTravellers = checkIns.reduce((s, c) => s + c.travellerCount, 0);
  return {
    bookedTravellers,
    checkedInTravellers,
    remaining: Math.max(0, bookedTravellers - checkedInTravellers),
    confirmedBookings: confirmed.length,
    checkedInBookings: checkIns.length,
  };
}
