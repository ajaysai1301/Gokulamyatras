import { v4 as uuidv4 } from 'uuid';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
import { getPaymentRepository } from '@/lib/repositories/payment.repository';
import { getPaymentProvider } from '@/lib/payments/mock-provider';
import { PaymentOutcome } from '@/lib/payments/provider';
import { issueTicket } from '@/lib/services/ticket.service';
import { Booking, BookingStatus, Payment, PaymentMethod, PaymentStatus } from '@/lib/domain/types';
import { getYatraRepository } from '@/lib/repositories/yatra.repository';

export class PaymentError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export async function createOrder(bookingReference: string) {
  const bookingRepo = getBookingRepository();
  const booking = await bookingRepo.findByReference(bookingReference);
  if (!booking) throw new PaymentError('BOOKING_NOT_FOUND', 'Booking not found');

  const provider = getPaymentProvider();
  const order = await provider.createOrder({ bookingReference, amount: booking.totalAmount });

  const payment: Payment = {
    id: uuidv4(),
    bookingId: booking.id,
    amount: booking.totalAmount,
    method: PaymentMethod.RAZORPAY,
    status: PaymentStatus.PENDING,
    providerOrderId: order.orderId,
    createdAt: new Date().toISOString(),
  };
  await getPaymentRepository().create(payment);

  return { ...order, isMock: provider.isMock };
}

export async function verifyAndConfirm(params: {
  bookingReference: string; orderId: string; simulate?: PaymentOutcome;
}): Promise<{ status: PaymentStatus; booking: Booking }> {
  const bookingRepo = getBookingRepository();
  const booking = await bookingRepo.findByReference(params.bookingReference);
  if (!booking) throw new PaymentError('BOOKING_NOT_FOUND', 'Booking not found');

  // Idempotency: if already confirmed, return current state.
  if (booking.status === BookingStatus.CONFIRMED) {
    return { status: PaymentStatus.PAID, booking };
  }

  const provider = getPaymentProvider();
  const result = await provider.verifyPayment({
    orderId: params.orderId,
    bookingReference: params.bookingReference,
    amount: booking.totalAmount,
    simulate: params.simulate,
  });

  const now = new Date().toISOString();
  await getPaymentRepository().create({
    id: uuidv4(),
    bookingId: booking.id,
    amount: booking.totalAmount,
    method: PaymentMethod.RAZORPAY,
    status: result.status,
    providerOrderId: params.orderId,
    providerPaymentId: result.providerPaymentId,
    providerSignature: result.providerSignature,
    createdAt: now,
  });

  if (result.status === PaymentStatus.PAID) {
    await issueTicket(booking.id);
    const updated = await bookingRepo.update(booking.id, {
      status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID,
    });
    return { status: result.status, booking: updated || booking };
  }

  if (result.status === PaymentStatus.FAILED) {
    await getYatraRepository().releaseSeats(booking.yatraId, booking.travellerCount).catch(() => {});
    const updated = await bookingRepo.update(booking.id, {
      status: BookingStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED,
    });
    return { status: result.status, booking: updated || booking };
  }

  // Pending
  const updated = await bookingRepo.update(booking.id, {
    status: BookingStatus.PAYMENT_PENDING, paymentStatus: PaymentStatus.PENDING,
  });
  return { status: result.status, booking: updated || booking };
}

/** Admin/manual settlement (cash/UPI/bank/etc). Confirms booking + issues ticket. */
export async function recordManualPayment(params: {
  bookingReference: string; method: PaymentMethod; note?: string;
}): Promise<Booking> {
  const bookingRepo = getBookingRepository();
  const booking = await bookingRepo.findByReference(params.bookingReference);
  if (!booking) throw new PaymentError('BOOKING_NOT_FOUND', 'Booking not found');

  await getPaymentRepository().create({
    id: uuidv4(),
    bookingId: booking.id,
    amount: booking.totalAmount,
    method: params.method,
    status: PaymentStatus.PAID,
    note: params.note,
    createdAt: new Date().toISOString(),
  });
  await issueTicket(booking.id);
  const updated = await bookingRepo.update(booking.id, {
    status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID,
  });
  return updated || booking;
}
