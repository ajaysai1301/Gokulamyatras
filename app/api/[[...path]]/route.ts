import { z, ZodError } from 'zod';
import { getUnitOfWork } from '@/lib/repositories/unit-of-work';
import { allowRequest } from '@/lib/services/security.service';
/**
 * HTTP API controller (catch-all). Thin transport layer only \u2014 parses requests,
 * enforces authorization, delegates to services, and shapes JSON responses.
 * Contains NO business logic and NO direct database access.
 */
import { getTerms } from '@/lib/services/terms.service';
import { NextRequest, NextResponse } from 'next/server';
import {
  listPublishedYatras, listUpcomingYatras, listPastYatras, getFeaturedYatra, getYatraBySlug,
  listAllYatras, getYatraViewById, createYatra, updateYatra, setPublished,
} from '@/lib/services/yatra.service';
import {
  createBooking, getBookingView, lookupBooking, listBookings, cancelBooking, BookingError,
} from '@/lib/services/booking.service';
import { createOrder, verifyAndConfirm, recordManualPayment, listPayments, PaymentError } from '@/lib/services/payment.service';
import { validateToken, checkIn, checkInSummary } from '@/lib/services/checkin.service';
import { listCustomers, getCustomerProfile } from '@/lib/services/customer.service';
import { getDashboardMetrics, getYatraReports } from '@/lib/services/dashboard.service';
import { login, getStaffFromToken } from '@/lib/services/auth.service';
import { createBookingSchema, loginSchema, lookupSchema, paymentSchema, yatraPatchSchema } from '@/lib/validation/schemas';
import { PaymentMethod, BookingSource, UserRole } from '@/lib/domain/types';
import { TokenPayload } from '@/lib/auth/crypto';

function withCORS(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control','no-store');
  res.headers.set('X-Content-Type-Options','nosniff');
  return res;
}
function json(data: unknown, status = 200): NextResponse {
  return withCORS(NextResponse.json(data as object, { status }));
}
function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') && h.length>7 ? h.slice(7) : req.cookies.get('gy_staff')?.value || null;
}
async function requireRole(req: NextRequest, roles: UserRole[]): Promise<TokenPayload | null> {
  const payload = await getStaffFromToken(bearer(req));
  if (!payload || !roles.includes(payload.role as UserRole)) return null;
  return payload;
}
async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const reader=req.body?.getReader();if(!reader) throw new Error('INVALID_BODY');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(value);}
  try { const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body || Array.isArray(body) || typeof body!=='object') throw new Error();return body; }
  catch{throw new Error('INVALID_BODY');}
}

export async function OPTIONS(): Promise<NextResponse> {
  return withCORS(new NextResponse(null, { status: 200 }));
}

async function handler(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }): Promise<NextResponse> {
  const { path = [] } = await params;
  const p = path;
  const route = `/${p.join('/')}`;
  const method = req.method;

  try {
    if(!['GET','HEAD','OPTIONS'].includes(method)) {
      const origin=req.headers.get('origin');
      const expected=process.env.NEXT_PUBLIC_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BASE_URL).origin : req.nextUrl.origin;
      if((origin && origin!==expected) || req.headers.get('sec-fetch-site')==='cross-site') return json({error:'Origin not allowed'},403);
      if(!req.headers.get('content-type')?.startsWith('application/json')) return json({error:'JSON content type required'},415);
      if(!await allowRequest(route)) return json({error:'Too many requests'},429);
    }
    if(route==='/auth/logout' && method==='POST'){const res=json({ok:true});res.cookies.set('gy_staff','',{httpOnly:true,sameSite:'strict',path:'/',maxAge:0});return res;}
    // ---------- Health ----------
    if ((route === '/' || route === '/root') && method === 'GET') {
      return json({ service: 'GokulamYatras API', status: 'ok' });
    }

    // ---------- Auth ----------
    if (route === '/auth/login' && method === 'POST') {
      const body = await readBody(req);
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return json({ error: 'Invalid credentials' }, 400);
      if(!await allowRequest(route,parsed.data.email.toLowerCase())) return json({error:'Too many requests'},429);
      const result = await login(parsed.data.email, parsed.data.password);
      if (!result) return json({ error: 'Invalid email or password' }, 401);
      const {token,...profile}=result;const response=json(profile);
      response.cookies.set('gy_staff',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:12*60*60});return response;
    }

    // ---------- Public: Yatras ----------
    if (route === '/yatras' && method === 'GET') {
      const filter = req.nextUrl.searchParams.get('filter') || 'upcoming';
      const data = filter === 'past' ? await listPastYatras()
        : filter === 'all' ? await listPublishedYatras()
        : await listUpcomingYatras();
      return json({ yatras: data });
    }
    if (route === '/yatras/featured' && method === 'GET') {
      return json({ yatra: await getFeaturedYatra() });
    }
    // /yatras/:slug/terms  -> printable HTML T&C
    if (p[0] === 'yatras' && p.length === 3 && p[2] === 'terms' && method === 'GET') {
      const y = await getYatraBySlug(p[1]);
      if (!y) return json({ error: 'Yatra not found' }, 404);
      return withCORS(new NextResponse((await getTerms(y,req.nextUrl.searchParams.get('version') || y.tcVersion)).html, {
        status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }));
    }
    if (p[0] === 'yatras' && p.length === 2 && method === 'GET') {
      const y = await getYatraBySlug(p[1]);
      if (!y) return json({ error: 'Yatra not found' }, 404);
      return json({ yatra: y });
    }

    // ---------- Public: Bookings + Payment (mock) ----------
    if (route === '/bookings' && method === 'POST') {
      const body = await readBody(req);
      const parsed = createBookingSchema.safeParse(body);
      if (!parsed.success) {
        return json({ error: 'Validation failed', issues: parsed.error.flatten() }, 400);
      }
      try {
        const { booking } = await createBooking({...parsed.data,source:BookingSource.ONLINE});
        return json({ booking }, 201);
      } catch (e) {
        if (e instanceof BookingError) {
          const status = e.code === 'CAPACITY_EXCEEDED' ? 409 : e.code === 'YATRA_NOT_FOUND' ? 404 : 400;
          return json({ error: e.message, code: e.code }, status);
        }
        throw e;
      }
    }
    if (route === '/bookings/lookup' && method === 'POST') {
      const body = await readBody(req);
      const {reference,mobile}=lookupSchema.parse(body);
      if(!await allowRequest(route,reference)) return json({error:'Too many requests'},429);
      if (!reference || !mobile) return json({ error: 'Booking ID and mobile are required' }, 400);
      const view = await lookupBooking(reference, mobile);
      if (!view) return json({ error: 'No booking found for those details' }, 404);
      return json({ booking: view });
    }
    if (route === '/payments/order' && method === 'POST') {
      const body = await readBody(req);
      try {
        const input=paymentSchema.parse(body);
        if(!await lookupBooking(input.bookingReference,input.mobile)) return json({error:'Booking not found'},404);
        const order = await createOrder(input.bookingReference);
        return json({ order });
      } catch (e) {
        if (e instanceof PaymentError) return json({ error: e.message, code: e.code }, e.code==='BOOKING_NOT_FOUND'?404:409);
        throw e;
      }
    }
    if (route === '/payments/verify' && method === 'POST') {
      const body = await readBody(req);
      try {
        const input=paymentSchema.extend({orderId:z.string().min(1).max(100)}).parse(body);
        if(!await lookupBooking(input.bookingReference,input.mobile)) return json({error:'Booking not found'},404);
        const result = await verifyAndConfirm({
          bookingReference: input.bookingReference,
          orderId: input.orderId,
          simulate: input.simulate,
          providerPaymentId: input.providerPaymentId,
          providerSignature: input.providerSignature,
        });
        return json({ result: { status: result.status, booking: result.booking } });
      } catch (e) {
        if (e instanceof PaymentError) return json({ error: e.message, code: e.code }, e.code==='BOOKING_NOT_FOUND'?404:409);
        throw e;
      }
    }

    // ---------- Coordinator (ADMIN or COORDINATOR) ----------
    if (route === '/checkin/validate' && method === 'POST') {
      const staff = await requireRole(req, [UserRole.ADMIN, UserRole.COORDINATOR]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);
      const body = await readBody(req);
      const token = extractToken(String(body.token || ''));
      const res = await validateToken(token);
      return json(res);
    }
    if (route === '/checkin' && method === 'POST') {
      const staff = await requireRole(req, [UserRole.ADMIN, UserRole.COORDINATOR]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);
      const body = await readBody(req);
      const token = extractToken(String(body.token || ''));
      const res = await checkIn(token, staff);
      const status = res.ok ? 200 : res.reason === 'ALREADY_CHECKED_IN' ? 409 : 400;
      return json(res, status);
    }
    if (route === '/checkin/summary' && method === 'GET') {
      const staff = await requireRole(req, [UserRole.ADMIN, UserRole.COORDINATOR]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);
      const yatraId = req.nextUrl.searchParams.get('yatraId') || '';
      return json(await checkInSummary(yatraId));
    }

    // ---------- Admin (ADMIN only) ----------
    if (p[0] === 'admin') {
      const staff = await requireRole(req, [UserRole.ADMIN]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);

      if (route === '/admin/dashboard' && method === 'GET') {
        return json(await getDashboardMetrics());
      }
      if (route === '/admin/reports' && method === 'GET') {
        return json({ reports: await getYatraReports() });
      }
      if (route === '/admin/payments' && method === 'GET') {
        return json({ payments: await listPayments() });
      }

      // Yatras
      if (route === '/admin/yatras' && method === 'GET') {
        return json({ yatras: await listAllYatras() });
      }
      if (route === '/admin/yatras' && method === 'POST') {
        const body = await readBody(req);
        return json({ yatra: await createYatra(yatraPatchSchema.parse(body)) }, 201);
      }
      if (p[1] === 'yatras' && p.length === 3 && method === 'GET') {
        const y = await getYatraViewById(p[2]);
        if (!y) return json({ error: 'Yatra not found' }, 404);
        return json({ yatra: y });
      }
      if (p[1] === 'yatras' && p.length === 3 && method === 'PUT') {
        const body = await readBody(req);
        const y = await updateYatra(p[2], yatraPatchSchema.parse(body));
        if (!y) return json({ error: 'Yatra not found' }, 404);
        return json({ yatra: y });
      }
      if (p[1] === 'yatras' && p.length === 4 && p[3] === 'publish' && method === 'POST') {
        const body = await readBody(req);
        const y = await setPublished(p[2], z.object({published:z.boolean()}).parse(body).published);
        if (!y) return json({ error: 'Yatra not found' }, 404);
        return json({ yatra: y });
      }

      // Bookings
      if (route === '/admin/bookings' && method === 'GET') {
        const sp = req.nextUrl.searchParams;
        const rows = await listBookings({
          yatraId: sp.get('yatraId') || undefined,
          status: sp.get('status') || undefined,
          paymentStatus: sp.get('paymentStatus') || undefined,
          checkinStatus: sp.get('checkinStatus') || undefined,
          search: sp.get('search') || undefined,
        });
        return json({ bookings: rows });
      }
      if (route === '/admin/bookings' && method === 'POST') {
        // Manual booking (ADMIN source) + immediate manual settlement.
        const body = await readBody(req);
        const parsed = createBookingSchema.safeParse(body);
        if (!parsed.success) return json({ error: 'Validation failed', issues: parsed.error.flatten() }, 400);
        try {
          const result=await getUnitOfWork().run(async()=>{
          const { booking } = await createBooking({ ...parsed.data, source: BookingSource.ADMIN },staff.sub);
          const methodStr = String(body.paymentMethod || 'CASH').toUpperCase();
          const method = (Object.values(PaymentMethod) as string[]).includes(methodStr)
            ? (methodStr as PaymentMethod) : PaymentMethod.CASH;
          const confirmed = await recordManualPayment({ bookingReference: booking.reference, method, note: 'Manual admin booking' });
          return confirmed;});
          return json({ booking: result }, 201);
        } catch (e) {
          if (e instanceof BookingError) {
            const status = e.code === 'CAPACITY_EXCEEDED' ? 409 : 400;
            return json({ error: e.message, code: e.code }, status);
          }
          throw e;
        }
      }
      if (p[1] === 'bookings' && p.length === 3 && method === 'GET') {
        const view = await getBookingView(p[2]);
        if (!view) return json({ error: 'Booking not found' }, 404);
        return json({ booking: view });
      }
      if (p[1] === 'bookings' && p.length === 4 && p[3] === 'cancel' && method === 'POST') {
        const b = await cancelBooking(p[2],staff.sub);
        if (!b) return json({ error: 'Booking not found' }, 404);
        return json({ booking: b });
      }

      // Customers
      if (route === '/admin/customers' && method === 'GET') {
        return json({ customers: await listCustomers(req.nextUrl.searchParams.get('search') || undefined) });
      }
      if (p[1] === 'customers' && p.length === 3 && method === 'GET') {
        const profile = await getCustomerProfile(p[2]);
        if (!profile) return json({ error: 'Customer not found' }, 404);
        return json(profile);
      }

      return json({ error: `Admin route ${route} not found` }, 404);
    }

    return json({ error: `Route ${route} not found` }, 404);
  } catch (error) {
    if(error instanceof ZodError) return json({error:'Validation failed',issues:error.flatten()},400);
    if(error instanceof Error && ['INVALID_BODY','BODY_TOO_LARGE'].includes(error.message)) return json({error:error.message},error.message==='BODY_TOO_LARGE'?413:400);
    if(error instanceof BookingError || error instanceof PaymentError) return json({error:error.message,code:error.code},409);
    console.error('API request failed',error instanceof Error ? error.name : 'UnknownError');
    return json({ error: 'Internal server error' }, 500);
  }
}

/** Accepts a raw token or a scanned URL containing the token. */
function extractToken(raw: string): string {
  const match = raw.match(/GMY-TKT-[a-f0-9]+/i);
  return match ? match[0] : raw.trim();
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
