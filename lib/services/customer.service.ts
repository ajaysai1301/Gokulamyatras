import { v4 as uuidv4 } from 'uuid';
import { getCustomerRepository } from '@/lib/repositories/customer.repository';
import { getBookingRepository } from '@/lib/repositories/booking.repository';
import { Customer, PrimaryCustomerInput } from '@/lib/domain/types';

export async function upsertCustomerByMobile(input: PrimaryCustomerInput): Promise<Customer> {
  const repo = getCustomerRepository();
  const existing = await repo.findByMobile(input.mobile);
  const now = new Date().toISOString();
  if (existing) return existing;
  const customer: Customer = {
    id: uuidv4(),
    fullName: input.fullName,
    mobile: input.mobile,
    email: input.email || undefined,
    address: input.address || undefined,
    emergencyContactName: input.emergencyContactName || undefined,
    emergencyContactPhone: input.emergencyContactPhone || undefined,
    createdAt: now,
    updatedAt: now,
  };
  return repo.create(customer);
}

export interface CustomerRow extends Customer {
  totalBookings: number;
  lastBookingAt: string | null;
}

export async function listCustomers(search?: string): Promise<CustomerRow[]> {
  const custRepo = getCustomerRepository();
  const bookingRepo = getBookingRepository();
  const customers = await custRepo.findAll(search);
  const rows: CustomerRow[] = [];
  for (const c of customers) {
    const bookings = await bookingRepo.findByCustomer(c.id);
    rows.push({
      ...c,
      totalBookings: bookings.length,
      lastBookingAt: bookings[0]?.createdAt ?? null,
    });
  }
  return rows;
}

export async function getCustomerProfile(id: string) {
  const custRepo = getCustomerRepository();
  const bookingRepo = getBookingRepository();
  const customer = await custRepo.findById(id);
  if (!customer) return null;
  const bookings = await bookingRepo.findByCustomer(id);
  return { customer, bookings };
}
