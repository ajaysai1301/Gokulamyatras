import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {mobileSchema} from '@/lib/validation/schemas';
import {enquiryRepository} from '@/lib/repositories/enquiry.repository';
export async function submitEnquiry(raw:unknown){const data=z.object({fullName:z.string().trim().min(2).max(120),mobile:mobileSchema,email:z.string().email().max(254).or(z.literal('')).optional(),message:z.string().trim().min(5).max(4000)}).parse(raw);await enquiryRepository.create({...data,id:randomUUID(),createdAt:new Date().toISOString()});return {ok:true};}
export const listEnquiries=()=>enquiryRepository.list();
