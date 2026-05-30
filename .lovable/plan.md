# Inventory Management System — Build Plan

A complete frontend for the Spring Boot REST API at `http://localhost:8080`. Built on the existing TanStack Start + React + Tailwind + shadcn/ui stack.

## Architecture

- **API client** (`src/lib/api.ts`): `fetch` wrapper that auto-attaches `Authorization: Bearer {token}`, handles 401 (clear localStorage → redirect to login), 404, 409 (surface backend message), 400 (validation errors). Exports typed methods per endpoint group.
- **Auth store** (`src/lib/auth.ts`): localStorage-backed (`token`, `role`, `mustChangePassword`), with `useAuth()` hook + helpers `login`, `logout`, `isAuthed`, `getRole`.
- **Route guard**: A `_app` layout route that checks auth + `mustChangePassword` + role permissions. Cashier blocked from admin pages.
- **Layout**: Sidebar (shadcn `Sidebar`) showing role-filtered nav + topbar with notification bell + user menu. POS and Login use minimal layouts.
- **Data fetching**: TanStack Query (`useQuery`/`useMutation`) for all endpoints. Toasts via `sonner` for success/error. Confirmation dialogs via shadcn `AlertDialog` for deletes.

## Routes

```
/login                        – public
/forgot-password              – public (or modal in login)
/change-password              – any authed user
/                             – Admin Dashboard (redirects cashier to /pos)
/pos                          – Cashier + Admin
/notifications                – any authed user
/users                        – Admin
/products                     – Admin
/categories                   – Admin
/suppliers                    – Admin
/stocks                       – Admin
/stock-adjustments            – Admin
/transactions                 – Admin
/reports                      – Admin
```

## Page implementations

1. **Login** – email/password, show/hide toggle, forgot-password modal, backend error display.
2. **Change Password** – validates ≥8 chars + uppercase + digit + special (`@#$%^&+=!.`), confirms match, handles 409.
3. **Dashboard** – cards for Total Sales (KES), Transactions, Top items list from `/api/report/today`.
4. **POS** – Two-pane: left search bar + product grid; right cart with qty controls (whole numbers when `isCountable`), subtotals, total. Hidden always-focused input listens for barcode scans (auto-submits on Enter, calls `/api/products/barcode/{code}`). Payment toggle CASH/MPESA, amount-given + change calc for cash. On submit POST `/api/Transactions/create` → receipt modal with Print button (`window.print()` on printable area) → clear cart.
5. **Users** – Table, search by name, create modal (role dropdown), activate/deactivate toggle, 409 handling.
6. **Products** – Tabs (All/Active/Deactivated), search, create/edit modal with supplier + category dropdowns (loaded from `/api/suppliers/active` and `/api/categories`), barcode optional, activate/deactivate/delete actions.
7. **Categories** – List, create/edit/delete, 409 duplicate handling.
8. **Suppliers** – Table with All/Active filter, create/edit/activate/deactivate/delete, 409 on duplicate contact.
9. **Stocks** – Table with status filter (PENDING/APPROVED/REJECTED), product/supplier filters, create form (product + supplier dropdowns, expiry optional), Approve/Reject buttons on PENDING rows.
10. **Stock Adjustments** – Table with status & product filters, create form (adjustmentType dropdown DAMAGED/THEFT/EXPIRED/CORRECTION), Approve/Reject for PENDING.
11. **Transactions** – Table (receipt, cashier, total, method, date) with Today / Date Range filters; row click → details modal with item list.
12. **Reports** – Tabs Today / This Month / Date Range, KES values, lists of top items, profit/loss display.
13. **Notifications** – List with unread highlight + type badges; click to mark as read; bell in topbar shows unread count.

## UI conventions

- KES formatter helper (`Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' })`).
- Loading skeletons / spinners on all queries.
- Toast on every success mutation.
- AlertDialog confirmation for all deletes.
- Responsive sidebar (collapsible on mobile).
- Clean professional palette suitable for POS (neutral surfaces + a green primary accent for retail).

## Tech notes

- No backend changes; pure frontend wired against `http://localhost:8080`. Base URL configurable via `VITE_API_BASE_URL` (defaults to localhost:8080).
- CORS: assumes Spring Boot allows the dev origin; documented in README if needed.
- TanStack Start SSR is fine here because all data fetching happens client-side via React Query (no loader prerender that would 401).

After approval I'll scaffold api client + auth + layout, then build pages in parallel batches.