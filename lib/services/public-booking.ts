import type { Booking, BookingView } from '@/lib/domain/types';
/** Allowlist for public responses; internal aggregates must never be serialized. */
export function publicBooking(b: Booking) {
 return {source:b.source,reference:b.reference,yatraName:b.yatraName,yatraSlug:b.yatraSlug,yatraStartDate:b.yatraStartDate,reportingLocation:b.reportingLocation,reportingTime:b.reportingTime,status:b.status,paymentStatus:b.paymentStatus,travellerCount:b.travellerCount,totalAmount:b.totalAmount,tcVersion:b.tcVersion,expiresAt:b.expiresAt};
}
export function publicBookingView(b: BookingView) {
 return {...publicBooking(b),customer:b.customer?{fullName:b.customer.fullName}:null,
 travellers:b.travellers.map(t=>({fullName:t.fullName,age:t.age,gender:t.gender})),
 consent:b.consent?{version:b.consent.version,agreed:b.consent.agreed,agreedAt:b.consent.agreedAt}:null,
 ticket:b.status==='CONFIRMED' && b.paymentStatus==='PAID' && b.ticket?{token:b.ticket.token,issuedAt:b.ticket.issuedAt}:null,
 checkIn:b.checkIn?{checkedInAt:b.checkIn.checkedInAt}:null};
}
export type PublicBookingView=ReturnType<typeof publicBookingView>;
