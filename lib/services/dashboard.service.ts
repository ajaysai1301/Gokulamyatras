import { listPublishedYatras, listUpcomingYatras } from '@/lib/services/yatra.service';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
import { getPaymentRepository } from '@/lib/repositories/payment.repository';
import { getCheckInRepository } from '@/lib/repositories/checkin.repository';
import { BookingStatus, PaymentStatus } from '@/lib/domain/types';

export async function getDashboardMetrics() {
  const bookingRepo = getBookingRepository();
  const [upcoming, allBookings, payments] = await Promise.all([
    listUpcomingYatras(),
    bookingRepo.findAll(),
    getPaymentRepository().findAll(),
  ]);

  const confirmed = allBookings.filter((b) => b.status === BookingStatus.CONFIRMED);
  const pendingPayments = allBookings.filter((b) => b.paymentStatus === PaymentStatus.PENDING).length;
  const totalTravellers = confirmed.reduce((s, b) => s + b.travellerCount, 0);
  const revenue = payments.filter((p) => p.status === PaymentStatus.PAID).reduce((s, p) => s + p.amount, 0);

  const today = new Date().toISOString().slice(0, 10);
  const checkinRepo = getCheckInRepository();
  let todayCheckins = 0;
  for (const y of upcoming) {
    const c = await checkinRepo.findByYatra(y.id);
    todayCheckins += c.filter((x) => x.checkedInAt.slice(0, 10) === today).reduce((s, x) => s + x.travellerCount, 0);
  }

  const capacity = upcoming.slice(0, 6).map((y) => ({
    id: y.id,
    slug: y.slug,
    name: y.name,
    startDate: y.startDate,
    booked: y.booked,
    capacity: y.capacity,
    available: y.availability.available,
  }));

  return {
    upcomingYatras: upcoming.length,
    totalBookings: allBookings.length,
    confirmedBookings: confirmed.length,
    pendingPayments,
    totalTravellers,
    revenue,
    todayCheckins,
    capacity,
  };
}

export async function getYatraReports() {
  const published = await listPublishedYatras();
  const bookingRepo = getBookingRepository();
  const checkinRepo = getCheckInRepository();
  const rows = [];
  for (const y of published) {
    const bookings = await bookingRepo.findAll({ yatraId: y.id });
    const confirmed = bookings.filter((b) => b.status === BookingStatus.CONFIRMED);
    const pending = bookings.filter((b) => b.status === BookingStatus.PAYMENT_PENDING);
    const cancelled = bookings.filter((b) => b.status === BookingStatus.CANCELLED);
    const collected = confirmed.reduce((s, b) => s + b.totalAmount, 0);
    const checkIns = await checkinRepo.findByYatra(y.id);
    const checkedIn = checkIns.reduce((s, c) => s + c.travellerCount, 0);
    rows.push({
      id: y.id,
      name: y.name,
      startDate: y.startDate,
      capacity: y.capacity,
      booked: y.booked,
      available: y.availability.available,
      confirmed: confirmed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      checkedIn,
      revenue: collected,
    });
  }
  return rows;
}
