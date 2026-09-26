# StockSense — Inventory Management System

A production-quality, hackathon-ready Inventory Management System built to the StockSense
spec: authentication with OTP password reset, a live KPI dashboard, product/category
management, receipts, delivery orders, internal transfers, stock adjustments, and a full
audit-trail stock ledger — all backed by atomic database transactions so stock numbers can
never drift or go negative.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, Lucide icons
- **Backend:** Node.js + TypeScript + Express
- **Database:** SQLite via Prisma ORM (zero-config for local/demo use; swap to Postgres in
  five minutes — see `backend/.env.example`)
- **Auth:** JWT + bcrypt, OTP-based password reset

## Project structure

```
stocksense/
├── backend/     Express API, Prisma schema, seed data
└── frontend/    React + Vite SPA
```

## Running it locally

You need Node.js 18+ installed. Two terminals:

**1. Backend**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev          # starts on http://localhost:5000, auto-seeds demo data on first run
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev           # starts on http://localhost:5173, proxies /api to :5000
```

Open http://localhost:5173. The backend seeds realistic demo data automatically the first
time it starts (products already at full/low/out-of-stock levels, pending receipts,
deliveries and a scheduled transfer) so the app is presentable immediately.

> Note: `node_modules/` are intentionally **not** included in this delivery — run
> `npm install` in each folder as shown above. This keeps the handoff small and avoids
> shipping OS-specific native binaries (see "Known environment note" below).

### Demo login

| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Admin   | admin@stocksense.io    | admin123   |
| Manager | manager@stocksense.io  | manager123 |

Or click "Sign up" to create a new account, or "Forgot password?" to try the OTP reset flow
(the OTP is echoed back in the API response so it's demoable without an email server).

### Demo flow (matches the spec's required walkthrough)

1. Log in → land on the Dashboard, see live KPIs and filters.
2. Products → see `MOT-BRUSH-800` (Brushless DC Motor) at 0 stock — an out-of-stock alert.
3. Receipts → create/validate a receipt for that product → stock increases.
4. Transfers → move stock between locations → total company stock is unchanged, only the
   location changes.
5. Deliveries → validate a delivery → stock decreases; try over-delivering to see it
   correctly rejected.
6. Adjustments → record a physical count discrepancy (e.g. damaged goods) → stock corrects
   and is logged.
7. Stock Ledger → every one of the above shows up with before/after quantities, source,
   destination, user, and timestamp.

A guided "Hackathon Demo" walkthrough widget is built into the app (bottom-right) that
narrates this exact flow for judges.

## Known environment note (Prisma engines)

This project was originally scaffolded on Windows, so the committed lockfile assumes a
Windows Prisma engine. `prisma/schema.prisma` has been updated to declare
`binaryTargets = ["native", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x", "windows"]`,
so running `npx prisma generate` on **any** OS (Windows dev machine, Linux hackathon
laptop/server, macOS, Docker) will fetch the correct engine automatically — no code changes
needed. This does require normal internet access during `npm install` / `prisma generate`
(to download the engine binary once); after that it's fully offline/local (SQLite file).

## Requirement audit

| Requirement                                             | Implemented | Tested | Location |
|-----------------------------------------------------------|:---:|:---:|---|
| Sign up / Login                                          | ✅ | ✅ | `backend/src/controllers/authController.ts`, `frontend/src/pages/LoginPage.tsx` |
| OTP-based password reset                                 | ✅ | ✅ | `authController.ts` (`requestPasswordResetOtp`, `resetPasswordWithOtp`), `LoginPage.tsx` |
| Profile / Logout                                          | ✅ | ✅ | `authController.ts`, `frontend/src/pages/ProfilePage.tsx` |
| Protected routes (JWT)                                    | ✅ | ✅ | `backend/src/middleware/auth.ts`, `frontend/src/context/AuthContext.tsx` |
| Dashboard KPIs (products, low/out of stock, pending docs) | ✅ | ✅ | `dashboardController.ts`, `frontend/src/pages/DashboardPage.tsx` |
| Dashboard filters (doc type, status, warehouse, category) | ✅ | ✅ | `dashboardController.ts` (`getDashboardMetrics`) |
| Product CRUD + SKU/category/UOM/initial stock             | ✅ | ✅ | `productController.ts`, `frontend/src/pages/ProductsPage.tsx` |
| Stock availability by location                            | ✅ | ✅ | `StockLocation` model, `productController.ts` |
| Reordering rules (min/max/reorder qty)                    | ✅ | ✅ | `Product` model fields, `ProductsPage.tsx` |
| Categories                                                | ✅ | ✅ | `categoryController.ts` |
| SKU search & smart filters                                | ✅ | ✅ | `productController.ts` query params, `ProductsPage.tsx` |
| Receipts: create → validate → stock +qty                  | ✅ | ✅ | `receiptController.ts` (`validateReceipt`, `$transaction`) |
| Draft receipts don't change stock                          | ✅ | ✅ | `receiptController.ts` (status gate before validate) |
| Delivery: pick/pack → validate → stock −qty                | ✅ | ✅ | `deliveryController.ts` (`validateDelivery`) |
| Block delivery beyond available stock                      | ✅ | ✅ | `deliveryController.ts` (pre-check loop before mutating) |
| Internal transfers (warehouse/location/rack →)             | ✅ | ✅ | `transferController.ts` (`validateTransfer`) |
| Transfer changes location, not total stock                 | ✅ | ✅ | `transferController.ts` (decrement source + increment dest in one transaction) |
| Stock adjustments (physical count reconciliation)          | ✅ | ✅ | `adjustmentController.ts` |
| Stock ledger with full audit trail                         | ✅ | ✅ | `StockLedger` model, `ledgerController.ts`, `frontend/src/pages/LedgerPage.tsx` |
| Low-stock alerts / out-of-stock detection                  | ✅ | ✅ | `productController.ts`, `dashboardController.ts`, `frontend/src/components/layout/Navbar.tsx` |
| Multi-warehouse + warehouse/location management            | ✅ | ✅ | `warehouseController.ts`, `frontend/src/pages/WarehousesPage.tsx` |
| Responsive design, loading/empty/error states, validation   | ✅ | ✅ | Across all page components (skeleton loaders, empty states, inline validation) |
| Business logic on backend, atomic transactions              | ✅ | ✅ | All four workflow controllers use `prisma.$transaction` with rollback on any failure |
| Automated end-to-end test                                  | ✅ | ✅ | `backend/src/e2e-test.ts` (run with `npx tsx src/e2e-test.ts` against a running server) |

Every requirement in the original PDF is implemented, wired frontend-to-backend, and backed
by an atomic transaction where money/stock correctness matters.
