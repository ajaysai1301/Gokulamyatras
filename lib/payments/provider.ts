/**
 * Payment provider abstraction.
 * ---------------------------------------------------------------------------
 * The booking system depends ONLY on the PaymentProvider interface. Today the
 * factory returns a MockPaymentProvider. Codex can later add a
 * RazorpayPaymentProvider implementing the same interface and switch the factory
 * — no changes to booking/payment services are required.
 */
import { PaymentStatus } from '@/lib/domain/types';

export interface CreateOrderInput {
  bookingReference: string;
  amount: number; // whole INR
  currency?: string;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
}

export type PaymentOutcome = 'success' | 'failed' | 'pending';

export interface VerifyPaymentInput {
  orderId: string;
  bookingReference: string;
  amount: number;
  /** Mock-only: which outcome to simulate. Real providers ignore this. */
  simulate?: PaymentOutcome;
  providerPaymentId?: string;
  providerSignature?: string;
}

export interface VerifyPaymentResult {
  status: PaymentStatus;
  providerPaymentId?: string;
  providerSignature?: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isMock: boolean;
  createOrder(input: CreateOrderInput): Promise<PaymentOrder>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
