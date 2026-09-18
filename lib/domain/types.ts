/**
 * Domain layer — GokulamYatras
 * ---------------------------------------------------------------------------
 * Framework-agnostic business entities and enums. These types describe the
 * PRODUCTION data model and are intentionally free of any MongoDB or Prisma
 * specifics so the persistence layer can be swapped (Mongo -> Postgres/Prisma)
 * without touching business logic or the UI.
 */

export type ID = string;

/** Publication state of a yatra. */
export enum YatraStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  MOCK = 'MOCK',
  RAZORPAY = 'RAZORPAY',
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum BookingSource {
  ONLINE = 'ONLINE',
  ADMIN = 'ADMIN',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export interface ItineraryItem {
  time: string;
  title: string;
  description?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  items: ItineraryItem[];
}

/**
 * Core Yatra entity. Prices are stored in whole Indian Rupees (INR).
 * Dates are ISO-8601 strings at the domain boundary for portability.
 */
export interface Yatra {
  id: ID;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  destination: string;
  heroImage: string;
  gallery: string[];
  startDate: string;
  endDate: string;
  durationDays: number;
  durationNights: number;
  startingPoint: string;
  reportingLocation: string;
  reportingTime: string;
  price: number;
  capacity: number;
  booked: number;
  highlights: string[];
  itinerary: ItineraryDay[];
  included: string[];
  excluded: string[];
  importantInfo: string[];
  tcVersion: string;
  tcPdfUrl: string;
  status: YatraStatus;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface YatraAvailability {
  capacity: number;
  booked: number;
  available: number;
  isFull: boolean;
}

/** A Yatra enriched with computed, read-only presentation data. */
export interface YatraView extends Yatra {
  availability: YatraAvailability;
  isPast: boolean;
}

// ---------------------------------------------------------------------------
// Operational entities (booking, payment, ticketing, check-in, staff)
// ---------------------------------------------------------------------------

export interface Customer {
  id: ID;
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Traveller {
  id: ID;
  bookingId: ID;
  fullName: string;
  age: number;
  gender: Gender;
  idProofType?: string;
  idProofNumber?: string;
  specialRequirements?: string;
}

/**
 * A booking snapshots the yatra name/date/price at the time of booking so that
 * later edits to the yatra never alter historical bookings.
 */
export interface Booking {
  requestKey?:string;
  requestHash?:string;
  id: ID;
  reference: string; // human-readable, e.g. GMY-2026-00001
  customerSnapshot: Customer;
  expiresAt: string;
  customerId: ID;
  yatraId: ID;
  yatraSlug: string;
  yatraName: string;
  yatraStartDate: string;
  reportingLocation: string;
  reportingTime: string;
  status: BookingStatus;
  source: BookingSource;
  travellerCount: number;
  pricePerTraveller: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  tcVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: ID;
  bookingId: ID;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerSignature?: string;
  note?: string;
  createdAt: string;
}

export interface TermsConsent {
  id: ID;
  bookingId: ID;
  yatraId: ID;
  version: string;
  termsHtml: string;
  contentHash: string;
  recordedBy?: string;
  agreed: boolean;
  agreedAt: string;
}

export interface Ticket {
  id: ID;
  bookingId: ID;
  token: string; // opaque secure token encoded into the QR (no PII)
  issuedAt: string;
}

export interface CheckIn {
  id: ID;
  bookingId: ID;
  yatraId: ID;
  coordinatorId: ID;
  coordinatorName: string;
  travellerCount: number;
  checkedInAt: string;
}

export interface StaffUser {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  passwordSalt: string;
  passwordHash: string;
  active: boolean;
  createdAt: string;
}

/** A booking with all related records joined \u2014 used by admin/coordinator views. */
export interface BookingView extends Booking {
  customer: Customer | null;
  travellers: Traveller[];
  payments: Payment[];
  consent: TermsConsent | null;
  ticket: Ticket | null;
  checkIn: CheckIn | null;
}

/** Input shapes (validated at the API boundary) */
export interface PrimaryCustomerInput {
  fullName: string;
  mobile: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface TravellerInput {
  fullName: string;
  age: number;
  gender: Gender;
  idProofType?: string;
  idProofNumber?: string;
  specialRequirements?: string;
}

export interface CreateBookingInput {
  requestKey?:string;
  yatraSlug: string;
  primaryCustomer: PrimaryCustomerInput;
  travellers: TravellerInput[];
  termsVersion: string;
  acceptedTerms: boolean;
  source?: BookingSource;
}
