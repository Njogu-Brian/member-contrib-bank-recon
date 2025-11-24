# Implementation Checklist (Tracking by Phase)

| Phase | Task | Owner | Status |
| --- | --- | --- | --- |
| 1 | Document architecture decisions & audit (PHASE_PLAN.md) | Backend/Frontend | ✅ |
| 2 | Rebuild layout shell with Tailwind + responsive breakpoints | Frontend | ☐ |
| 2 | Implement shared components (tables, forms, modals, QR, upload) | Frontend | ☐ |
| 2 | Wire React Router + React Query + API client with feature flags | Frontend | ☐ |
| 2 | Add RBAC-aware navigation + `/ui-kit` preview route | Frontend | ☐ |
| 3 | Namespace Laravel routes under `/api/v1/*` (public/admin/webhooks) | Backend | ✅ |
| 3 | Expand policies/middleware for new role matrix | Backend | ☐ |
| 3 | Add external-service stubs + feature flags | Backend | ☐ |
| 3 | Generate OpenAPI spec (`openapi/v1.yaml`) + v2 notes | Backend | ☐ |
| 4 | Produce Feature→Surface matrix (MD + CSV) | Docs | 🚧 (MD draft) |
| 4 | Produce Roles & Permissions matrix (MD + CSV) | Docs | ☐ |
| 4 | Document external services & credential checklist | Docs | ☐ |
| 5 | Backend tests (auth, contributions, receipts, push stub, reports) | Backend | ☐ |
| 5 | Frontend unit/integration tests + MSW mocks | Frontend | ☐ |
| 5 | Cypress/Playwright E2E suite for core flows | Frontend | ☐ |
| 6 | Deployment guide + env checklist | Ops | ☐ |
| 6 | Staff SSO/mobile action mapping | Ops | ☐ |
| 6 | Delivery report JSON (status/tests/blocked creds/CI) | PM | ☐ |

_Legend_: ✅ complete, 🚧 in progress, ☐ pending.

