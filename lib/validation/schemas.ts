import { z } from 'zod';
import { Gender, YatraStatus } from '@/lib/domain/types';

export const mobileSchema=z.string().trim().regex(/^(?:\+91|91)?[6-9]\d{9}$/,'Use a valid Indian mobile number').transform(s=>s.slice(-10));
export const primaryCustomerSchema = z.object({
  fullName: z.string().trim().max(120).min(2, 'Name is required'),
  mobile: mobileSchema,
  email: z.string().trim().max(254).email().optional().or(z.literal('')),
  address: z.string().max(1000).optional().or(z.literal('')),
  emergencyContactName: z.string().max(1000).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(1000).optional().or(z.literal('')),
});

export const travellerSchema = z.object({
  fullName: z.string().trim().max(120).min(2, 'Traveller name is required'),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.nativeEnum(Gender),
  idProofType: z.string().max(1000).optional().or(z.literal('')),
  idProofNumber: z.string().max(1000).optional().or(z.literal('')),
  specialRequirements: z.string().max(1000).optional().or(z.literal('')),
});

export const createBookingSchema = z.object({
  requestKey:z.string().uuid().optional(),
  yatraSlug: z.string().min(1).max(200),
  primaryCustomer: primaryCustomerSchema,
  travellers: z.array(travellerSchema).min(1, 'At least one traveller is required').max(20),
  termsVersion: z.string().trim().min(1).max(40),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms & Conditions' }) }),

});

export const loginSchema = z.object({
  email: z.string().trim().max(254).email(),
  password: z.string().min(1).max(256),
});

export type CreateBookingBody = z.infer<typeof createBookingSchema>;

const text=z.string().trim().max(10000);
const list=z.array(text).max(100);
const url=z.string().max(2048).refine(s=>s==='' || /^https:\/\//.test(s) || /^\/(?!\/)/.test(s),'Use HTTPS or a local path');
export const yatraPatchSchema=z.object({
 name:text.min(2).optional(),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80).optional(),subtitle:text.optional(),description:text.optional(),destination:text.optional(),
 heroImage:url.optional(),gallery:z.array(url).max(50).optional(),startDate:z.string().datetime().optional(),endDate:z.string().datetime().optional(),
 durationDays:z.number().int().min(1).max(366).optional(),durationNights:z.number().int().min(0).max(366).optional(),
 startingPoint:text.optional(),reportingLocation:text.optional(),reportingTime:text.optional(),price:z.number().int().min(0).max(10000000).optional(),capacity:z.number().int().min(1).max(100000).optional(),
 highlights:list.optional(),included:list.optional(),excluded:list.optional(),importantInfo:list.optional(),
 itinerary:z.array(z.object({day:z.number().int().positive(),title:text,items:z.array(z.object({time:text,title:text,description:text.optional()})).max(100)})).max(366).optional(),
 tcVersion:z.string().trim().min(1).max(40).optional(),tcPdfUrl:url.optional(),status:z.nativeEnum(YatraStatus).optional(),featured:z.boolean().optional()
}).strict();
export const lookupSchema=z.object({reference:z.string().regex(/^GMY-\d{4}-\d{5,}$/),mobile:mobileSchema});
export const paymentSchema=z.object({bookingReference:z.string().regex(/^GMY-\d{4}-\d{5,}$/),mobile:mobileSchema,orderId:z.string().max(100).optional(),simulate:z.enum(['success','failed','pending']).optional()});
