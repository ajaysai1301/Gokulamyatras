import { v4 as uuidv4 } from 'uuid';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
import { getConsentRepository } from '@/lib/repositories/consent.repository';
import { getPaymentRepository } from '@/lib/repositories/payment.repository';
import { getTicketRepository } from '@/lib/repositories/ticket.repository';
import { getCheckInRepository } from '@/lib/repositories/checkin.repository';
import { getYatraRepository } from '@/lib/repositories/yatra.repository';
import { ensureSeeded } from '@/lib/services/yatra.service';
import { upsertCustomerByMobile } from '@/lib/services/customer.service';
import {
  Booking, BookingStatus, BookingSource, PaymentStatus, Traveller, TermsConsent,
  BookingView, CreateBookingInput,
} from '@/lib/domain/types';

export class BookingError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function createBooking(input: CreateBookingInput): Promise<{ booking: Booking }> {
  await ensureSeeded();
  const yatraRepo = getYatraRepository();
  const bookingRepo = getBookingRepository();

  const yatra = await yatraRepo.findBySlug(input.yatraSlug);
  if (!yatra) throw new BookingError('YATRA_NOT_FOUND', 'Yatra not found');
  if (!input.acceptedTerms) throw new BookingError('TERMS_REQUIRED', 'Terms & Conditions must be accepted');

  const count = input.travellers.length;
  if (count < 1) throw new BookingError('NO_TRAVELLERS', 'At least one traveller is required');

  // Server-side, atomic capacity enforcement.
  const reserved = await yatraRepo.tryReserve(yatra.id, count);
  if (!reserved) throw new BookingError('CAPACITY_EXCEEDED', 'Not enough seats available for this yatra');

  try {
    const customer = await upsertCustomerByMobile(input.primaryCustomer);
    const year = new Date(yatra.startDate).getUTCFullYear();
    const reference = await bookingRepo.nextReference(year);
    const now = new Date().toISOString();

    const booking: Booking = {
      id: uuidv4(),
      reference,
      customerId: customer.id,
      yatraId: yatra.id,
      yatraSlug: yatra.slug,
      yatraName: yatra.name,
      yatraStartDate: yatra.startDate,
      reportingLocation: yatra.reportingLocation,
      reportingTime: yatra.reportingTime,
      status: BookingStatus.PAYMENT_PENDING,
      source: input.source || BookingSource.ONLINE,
      travellerCount: count,
      pricePerTraveller: yatra.price,
      totalAmount: yatra.price * count,
      paymentStatus: PaymentStatus.PENDING,
      tcVersion: yatra.tcVersion,
      createdAt: now,
      updatedAt: now,
    };
    await bookingRepo.create(booking);

    const travellers: Traveller[] = input.travellers.map((t) => ({
      id: uuidv4(),
      bookingId: booking.id,
      fullName: t.fullName,
      age: Number(t.age),
      gender: t.gender,
      idProofType: t.idProofType || undefined,
      idProofNumber: t.idProofNumber || undefined,
      specialRequirements: t.specialRequirements || undefined,
    }));
    await bookingRepo.saveTravellers(travellers);

    // Immutable consent snapshot (never overwritten if T&C version changes later).
    const consent: TermsConsent = {
      id: uuidv4(),
      bookingId: booking.id,
      yatraId: yatra.id,
      version: yatra.tcVersion,
      agreed: true,
      agreedAt: now,
    };
    await getConsentRepository().create(consent);

    return { booking };
  } catch (e) {
    // Roll back the seat reservation if anything failed after reserving.
    await yatraRepo.releaseSeats(yatra.id, count).catch(() => {});
    throw e;
  }
}

export async function getBookingView(reference: string): Promise<BookingView | null> {
  const bookingRepo = getBookingRepository();
  const booking = await bookingRepo.findByReference(reference);
  if (!booking) return null;
  const [travellers, payments, consent, ticket, checkIn] = await Promise.all([
    bookingRepo.findTravellers(booking.id),
    getPaymentRepository().findByBooking(booking.id),
    getConsentRepository().findByBooking(booking.id),
    getTicketRepository().findByBooking(booking.id),
    getCheckInRepository().findByBooking(booking.id),
  ]);
  const { getCustomerRepository } = await import('@/lib/repositories/customer.repository');
  const customer = await getCustomerRepository().findById(booking.customerId);
  return { ...booking, customer, travellers, payments, consent, ticket, checkIn };
}

/** Public booking lookup requires Booking ID + matching mobile. */
export async function lookupBooking(reference: string, mobile: string): Promise<BookingView | null> {
  const view = await getBookingView(reference);
  if (!view || !view.customer) return null;
  if (view.customer.mobile.replace(/\D/g, '').slice(-10) !== mobile.replace(/\D/g, '').slice(-10)) return null;
  return view;
}

export interface AdminBookingRow extends Booking {
  customerName: string;
  customerMobile: string;
  checkedIn: boolean;
}

export async function listBookings(filter: {
  yatraId?: string; status?: string; paymentStatus?: string; search?: string; checkinStatus?: string;
} = {}): Promise<AdminBookingRow[]> {
  const bookingRepo = getBookingRepository();
  const { getCustomerRepository } = await import('@/lib/repositories/customer.repository');
  const custRepo = getCustomerRepository();
  const checkinRepo = getCheckInRepository();
  const bookings = await bookingRepo.findAll(filter);
  const rows: AdminBookingRow[] = [];
  for (const b of bookings) {
    const customer = await custRepo.findById(b.customerId);
    const checkIn = await checkinRepo.findByBooking(b.id);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const hay = `${b.reference} ${b.yatraName} ${customer?.fullName ?? ''} ${customer?.mobile ?? ''} ${customer?.email ?? ''}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    if (filter.checkinStatus === 'checked_in' && !checkIn) continue;
    if (filter.checkinStatus === 'not_checked_in' && checkIn) continue;
    rows.push({
      ...b,
      customerName: customer?.fullName ?? 'Unknown',
      customerMobile: customer?.mobile ?? '',
      checkedIn: !!checkIn,
    });
  }
  return rows;
}

export async function cancelBooking(reference: string): Promise<Booking | null> {
  const bookingRepo = getBookingRepository();
  const booking = await bookingRepo.findByReference(reference);
  if (!booking) return null;
  if (booking.status !== BookingStatus.CANCELLED) {
    await getYatraRepository().releaseSeats(booking.yatraId, booking.travellerCount).catch(() => {});
  }
  return bookingRepo.update(booking.id, { status: BookingStatus.CANCELLED });
}
