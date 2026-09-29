# Excel Cabs

**Private Shuttle Bus Service** — a frontend-only, clickable prototype of the booking and
operations app for customers, drivers and admins.

There is no backend. Every screen talks to a service interface, and the services are currently
implemented with mock data kept in the browser. Replacing those implementations with API calls is
the only change needed to connect a real backend (see [Connecting a real API](#connecting-a-real-api)).

## Quick start

Requires Node 20.9 or newer and pnpm 12 (`corepack enable` picks up the pinned version).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm dev` | Start the web app in development mode |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint across all packages (zero warnings allowed) |
| `pnpm typecheck` | TypeScript across all packages |
| `pnpm --filter web e2e:install` | One-time: install the Chromium build Playwright uses |
| `pnpm test:e2e` | Build, then run the Playwright suite |

## Demo accounts

All seeded accounts use the password `demo1234`. Sign-in pages show the matching demo account and
can fill it in for you.

| Role | Sign in at | Email |
|---|---|---|
| Customer | `/login` | `customer@example.com` |
| Driver | `/staff/driver/login` | `driver@excelcabs.com` |
| Admin | `/staff/admin/login` | `admin@excelcabs.com` |

Customers can also register at `/signup`. Drivers and admins cannot: an admin creates driver
accounts under **Admin › Drivers**.

The demo data is generated relative to today, so there are always trips for the past week and the
next two weeks. It is stored in the browser (`localStorage`), is refreshed automatically each day,
and can be restored at any time with **Reset demo data** (admin sidebar or any sign-in page).

Useful things in the seed:

- Today's 7:00 AM Shakthan Stand → SmartCity trip on Bus 2 has 18 of 40 seats booked, with each
  passenger's pickup and drop along the corridor (e.g. Chalakudy → Kakkanad).
- The next operating day's 9:00 AM trip on Bus 4 is full.
- The next fixed public holiday (for example 2 October) has no service.
- Bus 5 and driver Shaji Paul have no trips, so they can be disabled.
- "Test Test" is a fake-looking customer sign-up to try **Admin › Users › Disable** on.

## What's in the app

| Area | Routes | What you can do |
|---|---|---|
| Customer | `/`, `/book/[tripId]`, `/customer`, `/customer/bookings/[bookingId]` | Pick a date and a bus (Bus 1, Bus 2, …), type where you'll board and get off, book a seat, view and cancel bookings |
| Driver | `/driver`, `/driver/trips/[tripId]` | See assigned trips and passengers, call a passenger, start and complete a trip |
| Admin | `/admin`, `/admin/bookings`, `/admin/trips`, `/admin/buses`, `/admin/drivers`, `/admin/users`, `/admin/holidays` | Dashboard, manage buses (each with its route), drivers, trips, holidays and customer accounts; view and cancel bookings |

Out of scope by design: payments, seat maps and seat selection, QR codes, maps and tracking, chat,
ratings, coupons and marketing pages.

## Repository layout

```
apps/
  web/                Next.js app (App Router)
    e2e/              Playwright tests
    src/
      app/            Routes and layouts — thin pages that render a screen
      features/       Screens and their components, by area
      components/     Shared app components (layout, auth, status badges)
      queries/        TanStack Query hooks — the only way screens read and write data
      services/       Service interfaces + the mock implementations (services/mock)
      lib/mock/       Seed data and the in-browser store used by the mock services
      lib/            Dates, formatting, Zod schemas, env
      config/         Business constants, navigation, demo accounts
packages/
  types/              Domain types shared by everything (no runtime code besides constants)
  ui/                 Design system: tokens, shadcn/ui components, composites
  config/             Shared TypeScript and ESLint presets
```

## Architecture

```
Screen  →  query hook (src/queries)  →  service interface (src/services)  →  mock implementation
```

- **Screens never touch mock data.** ESLint blocks imports of `lib/mock` and `services/mock`
  outside the service layer.
- **Services behave like an API client.** Every method is async, works out who is calling from
  the session, and throws a `ServiceError` with a `code` (`NOT_FOUND`, `VALIDATION`, `CONFLICT`,
  `UNAUTHORIZED`, `FORBIDDEN`), an optional `reason` and optional `fieldErrors`.
- **Business rules live in the service layer** (`services/mock/_rules.ts`), where a backend would
  enforce them. Screens read the result, for example `bookability`, `canCancel` and
  `permissions`, instead of re-deriving it.
- **Types are centralised** in `packages/types`. Forms validate with Zod schemas in
  `src/lib/schemas` that are checked against those types.

### Connecting a real API

1. For each service, write an implementation of its interface that calls your API, for example
   `src/services/api/trip.api.ts` implementing `TripService`.
2. Map HTTP failures to `ServiceError` so screens keep showing the right messages and field errors.
3. Change the one assignment at the bottom of each `*.service.ts` file:

   ```ts
   export const tripService: TripService = apiTripService; // was mockTripService
   ```

4. Replace the mock session in `auth.service.ts` with your real session (cookie or token). Once
   sessions are cookies, a `src/proxy.ts` can redirect signed-out visitors on the server; today
   the role guards run in the browser because the session lives in `localStorage`.

Screens, hooks and types do not change. `services/demo.service.ts` (reset demo data) is
mock-only tooling and can be removed.

## Business rules

- A seat is available when the bus capacity exceeds the trip's non-cancelled bookings. One booking
  is one seat for one passenger.
- Customers search by date and choose a bus trip. Pickup and drop points are typed in, because
  passengers board and get off anywhere along the route; they are stored on the booking and shown
  on the driver's passenger list. They are not checked against a stop list.
- Booking closes at departure. A trip cannot be booked when it is full, cancelled, departed or on
  a holiday. The same passenger mobile cannot be booked twice on one trip.
- Booking IDs are `EXC-DDMMYY-NNN`: the trip date plus a running number for that date.
- Customers can cancel their own booking until departure. Admins can cancel any confirmed booking.
- Each bus runs one fixed route, in both directions. A trip is a bus, a direction, a date, a time
  and a driver. A bus's stops are locked once it has trips.
- A bus or driver cannot be on two overlapping trips (running time plus a 15-minute turnaround).
  Trips cannot be created in the past or on a holiday.
- Once a trip has bookings, its date and direction are locked, and it can only move to a bus on
  the same route with enough seats.
- Cancelling a trip cancels its bookings. Adding a holiday cancels that day's trips and bookings
  after a confirmation that shows the impact.
- A bus or driver with upcoming trips cannot be disabled until those trips are reassigned or
  cancelled.
- Disabling a customer signs them out, blocks sign-in and cancels their upcoming bookings.
- Drivers only see trips assigned to them. A trip can be started on its date and completed once
  started.

## Environment variables

Copy `.env.example` to `apps/web/.env.local`. All values are optional.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `Excel Cabs` | Name used in page titles |
| `NEXT_PUBLIC_MOCK_LATENCY_MS` | `400` | Simulated network delay, so loading states are visible. `0` turns it off |
| `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | `true` | Show the demo account helper on sign-in pages |
| `NEXT_PUBLIC_API_BASE_URL` | unset | Reserved for the future API implementation |

## Design system

`packages/ui` holds the tokens and components; see its [README](packages/ui/README.md) for the
component index. The brand is a single navy primary colour defined in
`packages/ui/src/styles/globals.css`; changing the `--primary` family there rebrands the app.

Customer and driver screens are designed mobile-first. Admin screens are designed for desktop and
switch from tables to cards on small screens.

## Testing

The Playwright suite in `apps/web/e2e` runs against a production build with the clock pinned, so
results do not depend on the time of day.

| Spec | Covers | Viewports |
|---|---|---|
| `smoke.spec.ts` | Every route renders its heading with no horizontal scrolling | 375, 390, 430, 1280, 1440 |
| `customer.spec.ts` | Bus search, typed pickup/drop, sign-in redirect, booking, cancelling, sign-up | 390, 1440 |
| `driver.spec.ts` | Trip list, passengers, start and complete, access rules | 390, 1440 |
| `admin.spec.ts` | Buses, drivers, trips, holidays, users, bookings, reset | 390, 1440 |
| `responsive.spec.ts` | Mobile menus, cards instead of tables | 375, 390, 430 |

## Known limitations

- Data lives in one browser's `localStorage`. Another browser or device has its own copy.
- The demo data is regenerated when the date changes, which discards changes made the day before.
- Authentication is simulated. Passwords are stored in plain text in the demo data and must never
  be reused as a pattern for production.
- Times are shown in Indian Standard Time regardless of the viewer's timezone.
