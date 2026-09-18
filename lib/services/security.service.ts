import { consumeRateLimit } from '@/lib/repositories/rate-limit.repository';
export async function allowRequest(route:string,subject='all') { return consumeRateLimit(route+':'+subject,subject==='all'?300:10); }
