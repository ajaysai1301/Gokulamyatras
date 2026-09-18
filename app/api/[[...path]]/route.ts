/**
 * HTTP API controller (catch-all). Thin transport layer only \u2014 parses requests,
 * enforces authorization, delegates to services, and shapes JSON responses.
 * Contains NO business logic and NO direct database access.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  listPublishedYatras, listUpcomingYatras, listPastYatras, getFeaturedYatra, getYatraBySlug,
  listAllYatras, getYatraViewById, createYatra, updateYatra, setPublished,
} from '@/lib/services/yatra.service';
import {
  createBooking, getBookingView, lookupBooking, listBookings, cancelBooking, BookingError,
} from '@/lib/services/booking.service';
import { createOrder, verifyAndConfirm, recordManualPayment, PaymentError } from '@/lib/services/payment.service';
import { validateToken, checkIn, checkInSummary } from '@/lib/services/checkin.service';
import { listCustomers, getCustomerProfile } from '@/lib/services/customer.service';
import { getDashboardMetrics, getYatraReports } from '@/lib/services/dashboard.service';
import { login, getStaffFromToken } from '@/lib/services/auth.service';
import { getPaymentRepository } from '@/lib/repositories/payment.repository';
import { createBookingSchema, loginSchema } from '@/lib/validation/schemas';
import { PaymentMethod, BookingSource, UserRole } from '@/lib/domain/types';
import { TokenPayload } from '@/lib/auth/crypto';

function withCORS(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}
function json(data: unknown, status = 200): NextResponse {
  return withCORS(NextResponse.json(data as object, { status }));
}
function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function requireRole(req: NextRequest, roles: UserRole[]): TokenPayload | null {
  const payload = getStaffFromToken(bearer(req));
  if (!payload || !roles.includes(payload.role as UserRole)) return null;
  return payload;
}
async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  return (await req.json().catch(() => ({}))) as Record<string, unknown>;
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
    // ---------- Health ----------
    if ((route === '/' || route === '/root') && method === 'GET') {
      return json({ service: 'GokulamYatras API', status: 'ok' });
    }

    // ---------- Auth ----------
    if (route === '/auth/login' && method === 'POST') {
      const body = await readBody(req);
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return json({ error: 'Invalid credentials' }, 400);
      const result = await login(parsed.data.email, parsed.data.password);
      if (!result) return json({ error: 'Invalid email or password' }, 401);
      return json(result);
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
      return withCORS(new NextResponse(termsHtml(y.name, y.tcVersion), {
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
        const { booking } = await createBooking(parsed.data);
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
      const reference = String(body.reference || '').trim();
      const mobile = String(body.mobile || '').trim();
      if (!reference || !mobile) return json({ error: 'Booking ID and mobile are required' }, 400);
      const view = await lookupBooking(reference, mobile);
      if (!view) return json({ error: 'No booking found for those details' }, 404);
      return json({ booking: view });
    }
    if (route === '/payments/order' && method === 'POST') {
      const body = await readBody(req);
      try {
        const order = await createOrder(String(body.bookingReference || ''));
        return json({ order });
      } catch (e) {
        if (e instanceof PaymentError) return json({ error: e.message, code: e.code }, 404);
        throw e;
      }
    }
    if (route === '/payments/verify' && method === 'POST') {
      const body = await readBody(req);
      try {
        const result = await verifyAndConfirm({
          bookingReference: String(body.bookingReference || ''),
          orderId: String(body.orderId || ''),
          simulate: body.simulate as 'success' | 'failed' | 'pending' | undefined,
        });
        return json({ result: { status: result.status, booking: result.booking } });
      } catch (e) {
        if (e instanceof PaymentError) return json({ error: e.message, code: e.code }, 404);
        throw e;
      }
    }

    // ---------- Coordinator (ADMIN or COORDINATOR) ----------
    if (route === '/checkin/validate' && method === 'POST') {
      const staff = requireRole(req, [UserRole.ADMIN, UserRole.COORDINATOR]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);
      const body = await readBody(req);
      const token = extractToken(String(body.token || ''));
      const res = await validateToken(token);
      return json(res);
    }
    if (route === '/checkin' && method === 'POST') {
      const staff = requireRole(req, [UserRole.ADMIN, UserRole.COORDINATOR]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);
      const body = await readBody(req);
      const token = extractToken(String(body.token || ''));
      const res = await checkIn(token, staff);
      const status = res.ok ? 200 : res.reason === 'ALREADY_CHECKED_IN' ? 409 : 400;
      return json(res, status);
    }
    if (route === '/checkin/summary' && method === 'GET') {
      const staff = requireRole(req, [UserRole.ADMIN, UserRole.COORDINATOR]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);
      const yatraId = req.nextUrl.searchParams.get('yatraId') || '';
      return json(await checkInSummary(yatraId));
    }

    // ---------- Admin (ADMIN only) ----------
    if (p[0] === 'admin') {
      const staff = requireRole(req, [UserRole.ADMIN]);
      if (!staff) return json({ error: 'Unauthorized' }, 401);

      if (route === '/admin/dashboard' && method === 'GET') {
        return json(await getDashboardMetrics());
      }
      if (route === '/admin/reports' && method === 'GET') {
        return json({ reports: await getYatraReports() });
      }
      if (route === '/admin/payments' && method === 'GET') {
        return json({ payments: await getPaymentRepository().findAll() });
      }

      // Yatras
      if (route === '/admin/yatras' && method === 'GET') {
        return json({ yatras: await listAllYatras() });
      }
      if (route === '/admin/yatras' && method === 'POST') {
        const body = await readBody(req);
        return json({ yatra: await createYatra(body) }, 201);
      }
      if (p[1] === 'yatras' && p.length === 3 && method === 'GET') {
        const y = await getYatraViewById(p[2]);
        if (!y) return json({ error: 'Yatra not found' }, 404);
        return json({ yatra: y });
      }
      if (p[1] === 'yatras' && p.length === 3 && method === 'PUT') {
        const body = await readBody(req);
        const y = await updateYatra(p[2], body);
        if (!y) return json({ error: 'Yatra not found' }, 404);
        return json({ yatra: y });
      }
      if (p[1] === 'yatras' && p.length === 4 && p[3] === 'publish' && method === 'POST') {
        const body = await readBody(req);
        const y = await setPublished(p[2], body.published !== false);
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
        const parsed = createBookingSchema.safeParse({ ...body, source: 'ADMIN', acceptedTerms: true });
        if (!parsed.success) return json({ error: 'Validation failed', issues: parsed.error.flatten() }, 400);
        try {
          const { booking } = await createBooking({ ...parsed.data, source: BookingSource.ADMIN });
          const methodStr = String(body.paymentMethod || 'CASH').toUpperCase();
          const method = (Object.values(PaymentMethod) as string[]).includes(methodStr)
            ? (methodStr as PaymentMethod) : PaymentMethod.CASH;
          const confirmed = await recordManualPayment({ bookingReference: booking.reference, method, note: 'Manual admin booking' });
          return json({ booking: confirmed }, 201);
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
        const b = await cancelBooking(p[2]);
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
    console.error('API Error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

/** Accepts a raw token or a scanned URL containing the token. */
function extractToken(raw: string): string {
  const match = raw.match(/GMY-TKT-[a-f0-9]+/i);
  return match ? match[0] : raw.trim();
}

function termsHtml(yatraName: string, version: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Terms & Conditions \u00b7 ${yatraName}</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;color:#26190f;line-height:1.7}
h1{font-size:28px}h2{font-size:18px;margin-top:28px}small{color:#7a6a58}
.badge{display:inline-block;background:#D9761E;color:#fff;padding:4px 12px;border-radius:999px;font-family:Arial;font-size:12px}
button{margin-top:24px;background:#D9761E;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer}
@media print{button{display:none}}</style></head>
<body>
<span class="badge">GokulamYatras</span>
<h1>Terms &amp; Conditions</h1>
<small>${yatraName} \u00b7 Version ${version}</small>
<h2>1. Booking &amp; Payment</h2><p>All bookings are subject to availability and are confirmed only upon successful payment. Prices are per traveller in Indian Rupees.</p>
<h2>2. Travellers &amp; Identification</h2><p>Every traveller must carry a valid government-issued photo identification. Details provided at booking must match the identification presented at reporting.</p>
<h2>3. Itinerary Changes</h2><p>GokulamYatras may adjust the itinerary, timings or accommodation due to weather, temple administration, or circumstances beyond our control, while preserving the spirit of the yatra.</p>
<h2>4. Cancellation &amp; Refunds</h2><p>Cancellation charges apply based on the notice period before departure. Certain third-party costs may be non-refundable.</p>
<h2>5. Conduct &amp; Safety</h2><p>Travellers are expected to follow coordinator instructions and temple guidelines. GokulamYatras is not liable for losses arising from a traveller's failure to comply.</p>
<h2>6. Health</h2><p>Travellers should disclose medical conditions relevant to the journey. Some yatras involve treks or high altitudes requiring reasonable fitness.</p>
<h2>7. Consent</h2><p>By accepting these Terms &amp; Conditions during booking, you confirm you have read and understood them for this specific yatra and version.</p>
<button onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
