/**
 * Development mock payment provider. Simulates order creation and verification
 * without any external service. Clearly flagged via isMock = true.
 */
import crypto from 'crypto';
import { PaymentStatus } from '@/lib/domain/types';
import {
  PaymentProvider, CreateOrderInput, PaymentOrder, VerifyPaymentInput, VerifyPaymentResult,
} from '@/lib/payments/provider';
import { RazorpayPaymentProvider } from '@/lib/payments/razorpay-provider';

class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  readonly isMock = true;

  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    return {
      orderId: 'MOCK-ORD-' + crypto.randomBytes(8).toString('hex'),
      amount: input.amount,
      currency: input.currency || 'INR',
      provider: this.name,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const outcome = input.simulate || 'success';
    if (outcome === 'success') {
      return {
        status: PaymentStatus.PAID,
        providerPaymentId: 'MOCK-PAY-' + crypto.randomBytes(8).toString('hex'),
        providerSignature: 'mock-signature',
      };
    }
    if (outcome === 'pending') return { status: PaymentStatus.PENDING };
    return { status: PaymentStatus.FAILED };
  }
}

let mockProvider: PaymentProvider | null = null;
let razorpayProvider: PaymentProvider | null = null;

/** Production fails closed unless live Razorpay credentials are present. */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.ENABLE_MOCK_PAYMENTS === 'true') {
    if (process.env.NODE_ENV === 'production') throw new Error('Mock payments are disabled in production');
    if (!mockProvider) mockProvider = new MockPaymentProvider();
    return mockProvider;
  }
  if (!razorpayProvider) razorpayProvider = new RazorpayPaymentProvider();
  return razorpayProvider;
}
