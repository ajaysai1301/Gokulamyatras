import { getAuditRepository } from '@/lib/repositories/audit.repository';
import { createHash } from 'node:crypto';
import { getUnitOfWork } from '@/lib/repositories/unit-of-work';
import { getTerms } from '@/lib/services/terms.service';
import { createBookingSchema } from '@/lib/validation/schemas';
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

export async function createBooking(input: CreateBookingInput, recordedBy?:string): Promise<{ booking: Booking }> {
  input = { ...createBookingSchema.parse(input), source: input.source };
  await ensureSeeded();
  await expirePendingBookings();
  return getUnitOfWork().run(async () => {
  const yatraRepo = getYatraRepository();
  const bookingRepo = getBookingRepository();

  const requestHash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  if(input.requestKey) {
   const existing=await bookingRepo.findByRequestKey(input.requestKey);
   if(existing) {if(existing.requestHash!==requestHash)throw new BookingError('KEY_REUSED','Request key already used for different details');return {booking:existing};}
  }
  const yatra = await yatraRepo.findBySlug(input.yatraSlug);
  if (!yatra) throw new BookingError('YATRA_NOT_FOUND', 'Yatra not found');
  if(yatra.status !== 'PUBLISHED' || Date.parse(yatra.startDate) <= Date.now()) throw new BookingError('NOT_BOOKABLE','Yatra is not open for booking');
  if(input.termsVersion !== yatra.tcVersion) throw new BookingError('TERMS_CHANGED','Terms changed; review and accept the current version');
  const terms = await getTerms(yatra);
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
      requestKey:input.requestKey,
      requestHash,
      customerId: customer.id,
      customerSnapshot: { id:customer.id, createdAt:now, updatedAt:now, ...input.primaryCustomer },
      expiresAt: new Date(Date.now()+30*60*1000).toISOString(),
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
      recordedBy,
      termsHtml: terms.html,
      contentHash: terms.contentHash,
      agreedAt: now,
    };
    await getConsentRepository().create(consent);

    await getAuditRepository().append({action:'BOOKING_CREATED',entity:'Booking',entityId:booking.id,userId:recordedBy});
    return { booking };
  } catch (e) {
    // The unit of work rolls back all writes, including seats.
    throw e;
  }
  });
}

export async function getBookingView(reference: string): Promise<BookingView | null> {
  const bookingRepo = getBookingRepository();
  const booking = await bookingRepo.findByReference(reference);
  if (!booking) return null;
  const [travellers, payments, consent, ticket, checkIn] = [
    // Mongo sessions require sequential operations.

    await bookingRepo.findTravellers(booking.id),
    await getPaymentRepository().findByBooking(booking.id),
    await getConsentRepository().findByBooking(booking.id),
    await getTicketRepository().findByBooking(booking.id),
    await getCheckInRepository().findByBooking(booking.id),
  ];
  const { getCustomerRepository } = await import('@/lib/repositories/customer.repository');
  const customer = booking.customerSnapshot || await getCustomerRepository().findById(booking.customerId);
  return { ...booking, customer, travellers, payments, consent, ticket, checkIn };
}

/** Public booking lookup requires Booking ID + matching mobile. */
export async function lookupBooking(reference: string, mobile: string): Promise<BookingView | null> {
  const view = await getBookingView(reference);
  if (!view || !view.customer) return null;
  if (view.customer.mobile !== mobile) return null;
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
  const bookings = await bookingRepo.findAll({ ...filter, search: undefined });
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

export async function cancelBooking(reference: string,userId?:string): Promise<Booking | null> {
 return getUnitOfWork().run(async()=>{
  const repo=getBookingRepository(); const b=await repo.findByReference(reference);
  if(!b || ['CANCELLED','EXPIRED','REFUNDED'].includes(b.status)) return b;
  if(await getCheckInRepository().findByBooking(b.id)) throw new BookingError('CHECKED_IN','Cannot cancel a checked-in booking');
  const updated=await repo.update(b.id,{status:BookingStatus.CANCELLED});
  await getYatraRepository().releaseSeats(b.yatraId,b.travellerCount);
  await getAuditRepository().append({action:'BOOKING_CANCELLED',entity:'Booking',entityId:b.id,userId});
  return updated;
 });
}
/** Called before new bookings; expiry releases seats in the same transaction. */
export async function expirePendingBookings() {
 const repo=getBookingRepository();
 const pending=await repo.findAll({status:BookingStatus.PAYMENT_PENDING});
 for(const candidate of pending) {
  if(!candidate.expiresAt || Date.parse(candidate.expiresAt)>Date.now()) continue;
  await getUnitOfWork().run(async()=>{
   const b=await repo.findById(candidate.id);
   if(!b || b.status!==BookingStatus.PAYMENT_PENDING || Date.parse(b.expiresAt)>Date.now()) return;
   await repo.update(b.id,{status:BookingStatus.EXPIRED});
   await getYatraRepository().releaseSeats(b.yatraId,b.travellerCount);
  });
 }
}
