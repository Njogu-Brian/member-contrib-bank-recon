# Evimeria Portal Modernization — Phase Plan (v1)

## 1. Goals & Scope

- React + Tailwind portal becomes the **only** web UI for staff (admins, accountants, support).  
- Laravel backend remains API-only (no Blade) with versioned routes (`/api/v1/*`, `/api/v1/admin/*`, `/api/v1/public/*`).  
- Flutter (`evimeria_app/`) continues serving members; this project focuses on the staff portal, shared API contract, RBAC, and delivery artifacts.

## 2. Architecture Decisions (Phase 1 baseline)

| Area | Decision |
| --- | --- |
| API Versioning | Introduce `/api/v1/...` across all domains (auth, members, wallets, payments, investments, announcements, meetings, reports, expenses, admin). Prepare `/api/v2` stubs inside OpenAPI for future breaking changes. |
| Namespaces | Public read endpoints under `/api/v1/public/*`, privileged actions under `/api/v1/admin/*`, and webhook integrations under `/api/v1/webhooks/*`. |
| Auth | Continue using Laravel Sanctum tokens; React portal consumes `/api/v1/auth/*`. Tokens stored in HttpOnly cookies with CSRF protection; fallback Bearer for service accounts. |
| RBAC | Use Laravel policies/gates tied to roles (Super Admin, Chairman, Secretary, Treasurer, Accountant, Group Treasurer, IT Support, Member, Guest/Auditor). React portal reads role claims and gates navigation/actions; APIs enforce via middleware. |
| Feature Flags | `.env` + config flags: `MPESA_ENABLED`, `SMS_ENABLED`, `FCM_ENABLED`, `PDF_SERVICE_ENABLED`, `BULK_BANK_ENABLED`, `OCRT_MATCHING_ENABLED`. Tests rely on stubs when flags are false. |
| Frontend Stack | Vite + React 18 + Tailwind + React Router + React Query + Zustand (lightweight state) + Cypress for E2E. Component gallery via Storybook-lite route (`/ui-kit`). |
| API Client | Centralized Axios instance with interceptors for versioned paths, error normalization, retry/backoff, and automatic logout on 401/419. |
| PDF & Receipts | Backend keeps Dompdf/QR generator. React portal calls `/api/v1/reports/receipts/:id`; integration tests mock responses to validate download + QR preview. |
| External Services | Documented in `docs/EXTERNAL_SERVICES.md` with credential checklist; missing creds mark integrations as BLOCKED while stubs allow local testing. |

## 3. Current State Audit (11/24/2025)

### Backend (Laravel `backend/`)
- Routes: currently under `/api/*` without versioning; mix of mobile + admin endpoints. No separation of public/admin namespaces.
- Controllers: API-focused, some services already exist (WalletService, PaymentService, InvestmentService, etc.). Audit logs and encryption service implemented.
- Views: Deleted/unused Blade for receipts (good). Need to confirm no other Blade dependencies remain.
- RBAC: Gates defined in `AuthServiceProvider`, but policies don’t cover all new roles. Need to expand role table/seeders.
- Testing: PHPUnit feature tests exist for Phase 1 endpoints; need more coverage for receipts, notifications, exports.

### Frontend (React `frontend/`)
- Vite + minimal UI (CSS modules). Already has API modules & pages, but styling is inconsistent and not Tailwind-based.
- Navigation/responsiveness limited; no explicit RBAC gating. Needs redesign per reference mock.
- No Storybook/component gallery. Tests limited to manual verification.

### Mobile (Flutter `evimeria_app/`)
- Full member functionality already built (Phase 2–4). Out-of-scope except for feature matrix references.

### Documentation
- README still geared toward legacy architecture; lacks portal/deployment instructions.
- No OpenAPI spec, no feature/role matrices, no external-service inventory.

## 4. Phase Breakdown & Key Tasks

### Phase 2 — React Portal Overhaul
1. Migrate styling to Tailwind, implement layout per reference PNG (responsive at 320/768/1440).
2. Build shared components (NavShell, DataTable, Form controls, Modal, Drawer, QR renderer, Upload).
3. Integrate React Query + Axios client with versioned endpoints + feature flags.
4. Implement RBAC-aware routing/navigation (role-based menu, component guards).
5. Add `/ui-kit` preview route (Storybook-lite) for designers/testers.

### Phase 3 — API Contract & Backend Alignment
1. ✅ (Nov 24) Namespaced Laravel routes to `/api/v1/...` with dedicated `public`, `admin`, `mobile`, and `webhooks` groups.
2. Expand policies/middleware to enforce new role matrix; seed roles/permissions.
3. Add feature-flag middleware + stubs for MPESA/SMS/FCM/PDF.
4. Generate `openapi/v1.yaml` + `openapi/v2-notes.yaml` (future planning).

### Phase 4 — Documentation & Matrices
1. `docs/FEATURE_SURFACE_MATRIX.md` + `.csv` (web vs mobile vs API coverage).
2. `docs/ROLES_PERMISSIONS.md` + `.csv` (permissions, API policy, UI visibility).
3. `docs/EXTERNAL_SERVICES.md` with credentials checklist, env var names, and BLOCKED status for missing creds.

### Phase 5 — Testing & Automation
1. Backend: PHPUnit tests for auth, contributions, receipts, push stub, report exports.
2. Frontend: Unit tests (Vitest/RTL) for core components; integration tests with MSW.
3. E2E: Cypress suite covering login, contribution submission, receipt preview, admin expense approval, report export.
4. Scripted smoke (`npm run dev`, `/api/v1/health`, `php artisan test`, `npm run test`, `npm run cy:run`).

### Phase 6 — Deployment & Delivery
1. Deployment notes/checklist for cPanel/VPS (env vars, build commands, queue workers).
2. Staff SSO/mobile considerations + endpoints to expose for staff actions via app.
3. `delivery_report.json` summarizing deliverables, test results, blocked credentials, CI/CD steps.

## 5. Risks & Open Questions
- **Credential Gaps:** MPESA/Bulk SMS/FCM keys likely missing; mark BLOCKED until provided.
- **Data Model for Roles:** Need to verify migrations support new roles/permissions per user; may require pivot updates.
- **Legacy React Pages:** Decide whether to refactor existing pages or rebuild. Likely faster to refactor with Tailwind + new components.
- **Timeboxing:** Each phase is sizable; maintain incremental commits & run tests per phase.

## 6. Next Actions (Phase 2 kickoff prerequisites)
1. Create Tailwind config upgrades + design tokens.
2. Draft component inventory & layout wires from reference PNG.
3. Confirm API mock data for React during development (MSW or Mirage).

_Created: 2025-11-24_  

