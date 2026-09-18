import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { PaymentStatus } from '@/lib/domain/types';
import type { CreateOrderInput, PaymentOrder, PaymentProvider, VerifyPaymentInput, VerifyPaymentResult } from '@/lib/payments/provider';

/** Server-only Razorpay adapter. Secrets are read only here, never returned to a client. */
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = 'razorpay';
  readonly isMock = false;
  private readonly client: Razorpay;
  private readonly secret: string;
  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
    this.secret = secret;
    this.client = new Razorpay({ key_id: keyId, key_secret: secret });
  }
  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('Invalid payment amount');
    const currency = input.currency ?? 'INR';
    if (currency !== 'INR') throw new Error('Only INR is supported');
    const order = await this.client.orders.create({ amount: input.amount * 100, currency, receipt: input.bookingReference, notes: { bookingReference: input.bookingReference } });
    return { orderId: order.id, amount: input.amount, currency, provider: this.name };
  }
  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!input.providerPaymentId || !input.providerSignature) return { status: PaymentStatus.FAILED };
    const expected = crypto.createHmac('sha256', this.secret).update(`${input.orderId}|${input.providerPaymentId}`).digest('hex');
    const supplied = new TextEncoder().encode(input.providerSignature); const actual = new TextEncoder().encode(expected);
    if (supplied.length !== actual.length || !crypto.timingSafeEqual(supplied, actual)) return { status: PaymentStatus.FAILED };
    return { status: PaymentStatus.PAID, providerPaymentId: input.providerPaymentId, providerSignature: input.providerSignature };
  }
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const supplied = new TextEncoder().encode(signature); const actual = new TextEncoder().encode(expected);
  return supplied.length === actual.length && crypto.timingSafeEqual(supplied, actual);
}
