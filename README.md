# GokulamYatras

A premium, production-quality **pilgrimage (yatra) booking platform** for
[gokulamyatras.in](https://gokulamyatras.in).

Built as a **single Next.js (App Router) + TypeScript** full-stack application with a
clean, layered architecture so it can be maintained and extended easily — and later
migrated from the Emergent preview database (MongoDB) to production PostgreSQL/Prisma
**without rewriting the application**.

---

## 1. Technology stack

| Layer            | Technology                                               |
|------------------|----------------------------------------------------------|
| Framework        | Next.js 15 (App Router) + React 18 + TypeScript          |
| Styling          | Tailwind CSS + shadcn/ui + lucide-react + framer-motion  |
| Fonts            | Fraunces (display) + Inter (body)                        |
| Preview DB       | MongoDB (via `MONGO_URL`) — Emergent environment         |
| Production DB    | PostgreSQL + Prisma (see `prisma/schema.prisma`)         |
| Payments         | Razorpay (test/sandbox) — *mocked in current phase*      |

---

## 2. Architecture (important)

All database access is isolated behind a **repository + service layer**. Business
logic and UI never touch the database directly.

```
UI (app/**, components/**)
        │  calls typed client helpers (lib/api-client.ts)
        ▼
API controller  app/api/[[...path]]/route.ts   ← thin transport only
        │  delegates to
        ▼
Services        lib/services/*.service.ts       ← business logic, derived data
        │  depends only on repository INTERFACES
        ▼
Repositories    lib/repositories/*.repository.ts
        │  MongoXxxRepository today · PrismaXxxRepository later
        ▼
DB adapter      lib/db/mongo.ts   (the ONLY file importing the mongodb driver)
```

- **Domain types & enums**: `lib/domain/types.ts` — framework-agnostic entities.
- **No MongoDB specifics leak** into services or UI. `_id` is stripped in the repo.
- **Swapping the database** = implement the same repository interface with Prisma and
  change one line in the repository factory. Nothing else changes.

### Folder structure

```
app/
  layout.tsx                 # metadata / SEO / providers
  page.tsx                   # Home
  yatras/page.tsx            # Upcoming/Past listing
  yatras/[slug]/page.tsx     # Editorial detail + itinerary timeline
  api/[[...path]]/route.ts   # catch-all API controller
components/
  ui/                        # shadcn/ui primitives
  site/                      # Navbar, Footer, YatraCard, SectionHeading, decorative
lib/
  domain/types.ts            # entities + enums (production model, DB-agnostic)
  db/mongo.ts                # Mongo connection + collection registry
  repositories/              # persistence abstraction (interface + Mongo impl)
  services/                  # application/business logic
  data/seed.ts               # demo yatra seed data
  format.ts                  # deterministic currency/date formatting
  api-client.ts              # typed client-side fetch helpers
prisma/schema.prisma         # production PostgreSQL data model
```

---

## 3. Database schema

The full production model lives in [`prisma/schema.prisma`](./prisma/schema.prisma).

Core entities: **User, Customer, Yatra, Booking, Traveller, Payment,
TermsAndConditions, TermsConsent, Ticket, CheckIn, AuditLog** — with foreign keys,
unique constraints, indexes, timestamps and enums.

Key rules encoded in the model:
- `Customer` is reusable and never deleted on cancellation.
- `TermsConsent` is an immutable snapshot — replacing a yatra's T&C PDF (new version)
  never overwrites historical consent.
- `Payment` history is separate from bookings and never mutated in place.
- `Ticket.token` is an opaque secure token — **no personal data in the QR**.

---

## 4. Environment variables

See [`.env.example`](./.env.example). Every variable is documented there.

| Variable                     | Purpose                                             |
|------------------------------|-----------------------------------------------------|
| `MONGO_URL` / `DB_NAME`      | Preview database (Emergent)                         |
| `DATABASE_URL`               | Production PostgreSQL (Prisma)                       |
| `NEXT_PUBLIC_BASE_URL`       | Public app URL (metadata, tickets)                  |
| `AUTH_SECRET`                | Signing secret for admin/coordinator auth           |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`| Razorpay key id (client-safe)                       |
| `RAZORPAY_KEY_SECRET`        | Razorpay secret (server only)                       |
| `RAZORPAY_WEBHOOK_SECRET`    | Razorpay webhook verification secret                |

---

## 5. Local development (Emergent / MongoDB)

The Emergent environment runs everything via supervisor.

```bash
# install deps
yarn install

# the app runs on 0.0.0.0:3000 under supervisor
sudo supervisorctl restart nextjs
```

The Yatra collection **auto-seeds** with demo data on first request when empty.

### API (all under `/api`)

| Method | Route                                | Description                    |
|--------|--------------------------------------|--------------------------------|
| GET    | `/api/root`                          | Health check                   |
| GET    | `/api/yatras?filter=upcoming\|past\|all` | List yatras                |
| GET    | `/api/yatras/featured`               | Featured (or next) yatra       |
| GET    | `/api/yatras/:slug`                  | Single yatra by slug           |

---

## 6. Migrating to PostgreSQL + Prisma (Codex handoff)

1. Provision a free-tier Postgres (e.g. Neon / Supabase) and set `DATABASE_URL`.
2. `npx prisma migrate dev --name init && npx prisma generate`.
3. For each repository in `lib/repositories/*.repository.ts`, add a Prisma
   implementation of the **same interface** (e.g. `PrismaYatraRepository`).
4. Change the factory return (`getYatraRepository()`) to the Prisma implementation.
5. Port `lib/data/seed.ts` to a `prisma/seed.ts` script.
6. Services and UI require **no changes** — they only depend on interfaces.

---

## 7. Roadmap (phased)

- ✅ **Phase 1 — Foundation**: design system, public website (Home, Yatras,
  Yatra detail), layered architecture, seed data, read APIs.
- ⏳ **Phase 2 — Yatra admin CRUD** (create/edit/publish, images, itinerary, T&C).
- ⏳ **Phase 3 — Booking** (multi-traveller, customer DB, capacity protection, consent).
- ⏳ **Phase 4 — Payment** (Razorpay order → verify → webhook → idempotency).
- ⏳ **Phase 5 — Ticketing** (QR generation, digital ticket, booking lookup).
- ⏳ **Phase 6 — Operations** (coordinator auth, QR scanner, check-in).
- ⏳ **Phase 7 — Admin** (reports, CSV, manual bookings, customer history, audit logs).

---

## 8. Known limitations (current phase)

- Payment/booking/admin/coordinator/auth are **not yet implemented**; "Book Your Seat"
  and "View T&C PDF" show informative toasts as placeholders.
- Persistence is MongoDB (preview). Prisma schema is provided for production.
- Capacity is stored as a `booked` counter on the yatra; server-side transactional
  enforcement arrives with the booking phase.

---

## 9. Future extension points (designed for, not built yet)

WhatsApp/SMS/email notifications, OTP customer login, per-traveller QR codes, offline
coordinator check-in, refunds, partial payments, coupons, additional payment providers,
multi-language, analytics. Each is a clean addition on top of the existing layers.

---

## 10. Operational workflow (Milestone 2)

### Demo credentials
- Admin: `admin@gokulamyatras.in` / `admin123` \u2014 `/admin`
- Coordinator: `coordinator@gokulamyatras.in` / `coord123` \u2014 `/coordinator`
- Staff are auto-seeded on first login. Auth uses stateless HMAC tokens (`AUTH_SECRET`), sent as `Authorization: Bearer <token>`.

### Booking lifecycle
`Traveller details \u2192 Review \u2192 T&C consent \u2192 (create booking) \u2192 mock payment \u2192 CONFIRMED \u2192 QR ticket`
- Statuses: `PENDING \u2192 PAYMENT_PENDING \u2192 CONFIRMED | CANCELLED | REFUNDED | EXPIRED`.
- Booking snapshots yatra name/date/price so later yatra edits never change historical bookings.
- Human reference: `GMY-YYYY-NNNNN` (atomic counter). Internal UUIDs never exposed as the booking ID.
- Capacity is enforced **server-side & atomically** (`YatraRepository.tryReserve` uses a conditional `$inc`), preventing oversell under concurrency.
- T&C consent is stored as an **immutable snapshot** (booking, yatra, version, timestamp) \u2014 never overwritten.

### Payment lifecycle (mock \u2192 Razorpay-ready)
`createOrder \u2192 (user pays) \u2192 verifyPayment \u2192 server confirmation`
- All payment logic goes through the `PaymentProvider` interface (`lib/payments/provider.ts`).
- Current impl: `MockPaymentProvider` (`isMock=true`) simulating success/failed/pending.
- To add Razorpay: implement `RazorpayPaymentProvider` with the same interface and return it from `getPaymentProvider()`. Verification stays server-side; no booking code changes.
- Payments are append-only history; booking data changes never mutate past payment records.

### QR ticket lifecycle
- Issued only on `CONFIRMED`. Token format `GMY-TKT-<random>` \u2014 **contains no personal data**.
- The QR encodes only the token; the backend resolves it to the booking.
- Customers retrieve their ticket via `/booking` (Booking ID + mobile). Ticket supports view / download (PNG) / print.

### Check-in lifecycle (coordinator)
`login \u2192 select yatra \u2192 scan/enter token \u2192 validate \u2192 CHECK IN ALL`
- Camera scanning via `html5-qrcode` with a manual-token fallback.
- Duplicate check-in prevented via a unique index on `bookingId` + server guard (`409 ALREADY_CHECKED_IN`).
- Per-yatra summary: booked / checked-in / remaining travellers.

### New API endpoints
Public: `POST /api/bookings`, `POST /api/bookings/lookup`, `POST /api/payments/order`, `POST /api/payments/verify`, `GET /api/yatras/:slug/terms`.
Auth: `POST /api/auth/login`.
Coordinator (ADMIN|COORDINATOR): `POST /api/checkin/validate`, `POST /api/checkin`, `GET /api/checkin/summary`.
Admin (ADMIN): `GET /api/admin/dashboard`, `GET|POST /api/admin/yatras`, `GET|PUT /api/admin/yatras/:id`, `POST /api/admin/yatras/:id/publish`, `GET /api/admin/bookings`, `GET /api/admin/bookings/:reference`, `POST /api/admin/bookings` (manual), `POST /api/admin/bookings/:reference/cancel`, `GET /api/admin/customers`, `GET /api/admin/customers/:id`, `GET /api/admin/reports`, `GET /api/admin/payments`.

### New entities (see prisma/schema.prisma)
`Customer, Booking, Traveller, Payment, TermsConsent, Ticket, CheckIn, StaffUser` \u2014 all behind repositories in `lib/repositories/`.
