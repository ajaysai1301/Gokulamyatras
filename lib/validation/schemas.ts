import { z } from 'zod';
import { Gender } from '@/lib/domain/types';

export const primaryCustomerSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Valid mobile is required').max(15),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().optional().or(z.literal('')),
  emergencyContactPhone: z.string().optional().or(z.literal('')),
});

export const travellerSchema = z.object({
  fullName: z.string().min(2, 'Traveller name is required'),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.nativeEnum(Gender),
  idProofType: z.string().optional().or(z.literal('')),
  idProofNumber: z.string().optional().or(z.literal('')),
  specialRequirements: z.string().optional().or(z.literal('')),
});

export const createBookingSchema = z.object({
  yatraSlug: z.string().min(1),
  primaryCustomer: primaryCustomerSchema,
  travellers: z.array(travellerSchema).min(1, 'At least one traveller is required'),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms & Conditions' }) }),
  source: z.enum(['ONLINE', 'ADMIN']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CreateBookingBody = z.infer<typeof createBookingSchema>;
