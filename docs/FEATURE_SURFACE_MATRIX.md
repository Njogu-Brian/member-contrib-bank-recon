# Feature ↔ Surface Matrix (v0.1)

Legend: ✅ complete/working, 🚧 partially working (needs data or follow-up), ☐ missing/not started, **BLOCKED** awaiting credentials.

| Feature / Module | Admin Portal (React) | Member App (Flutter) | API (`/api/v1/*`) | Notes / Follow-up |
| --- | --- | --- | --- | --- |
| Auth (login/logout + role claims) | 🚧 (UI ready; RBAC now wired after backend role payload fix) | ✅ (Phase 2) | 🚧 (routes namespaced, need OpenAPI + more tests) | Ensure Sanctum cookie/token config documented; add `/api/v1/auth/password-reset`, MFA challenge endpoints |
| Dashboard stats (members, contributions, alerts) | 🚧 (cards render but need API wiring + seed data) | ✅ | 🚧 | Implement `/api/v1/dashboard` service returning aggregates (current stub) |
| Members directory & profile | ✅ (list, search, profile shell) | ✅ | 🚧 | Finish member detail tabs (kyc, wallet, investments) + ensure pagination params match backend |
| Statements list + upload/re-analyze/delete | ✅ | N/A | 🚧 | Placeholder PDFs now seeded so list/upload/re-analyze work in demo; still need queue worker + tests for production |
| Statement PDF viewer + transactions overlay | 🚧 (UI done) | N/A | 🚧 | Viewer now loads seeded PDFs; next step is metadata-driven overlays + `/statements/:id/document` tests |
| Wallets & penalties | 🚧 | ✅ | 🚧 | Hook React page to WalletController endpoints; confirm penalties route implemented |
| Contributions (manual entry) | 🚧 | ✅ | 🚧 | Manual contributions page exists but needs validation + MPESA/bank flag toggles |
| Transactions (auto/draft/archive) | 🚧 | ✅ (view only) | 🚧 | Connect filters, add AI assist placeholder, ensure `transactions/ask-ai` returns stub |
| Expenses & Budgeting | 🚧 | 🚧 (future) | 🚧 | Budget controller is there; need charts + CRUD UX polish, plus OpenAPI spec |
| Investments & ROI | 🚧 | ✅ | 🚧 | CRUD modals exist; ensure ROI endpoint and seed data align |
| Announcements & Notification prefs | 🚧 | ✅ | 🚧 | UI ready; need API to return pinned/archived, plus preference toggles |
| Meetings, motions & voting | 🚧 | ✅ | 🚧 | Meetings page renders; voting flows incomplete – requires backend endpoints + sockets/polling |
| Notifications center (FCM / in-app) | 🚧 | ✅ | **BLOCKED** (FCM creds) | Provide stub feed while FCM production keys pending; mark integration BLOCKED in docs |
| Audit (Excel import, review mismatches) | ✅ (seeded run + sample workbook) | N/A | 🚧 | Demo audit run + XLSX now seeded; add automation/tests and allow re-analysis jobs |
| Attendance uploads | 🚧 | N/A | 🚧 | UI ready; seeded attendance file enables download; still need progress tracking + upload states |
| Compliance & Settings | 🚧 | N/A | 🚧 | Compliance screen placeholder; populate with audit logs, encryption status, data retention toggles |
| Reports & exports (PDF/Excel/CSV) | 🚧 | 🚧 | 🚧 | Backend controllers exist; need React download buttons + success states + tests |
| Notifications banner / Sandbox banner | ✅ | ✅ | ✅ | Feature flags (MPESA/SMS/FCM) surfaced; blocked integrations clearly labeled |
| UI Kit / component gallery | ✅ (route exists) | N/A | N/A | Continue adding new components as they’re built |
| External service integrations (MPESA, SMS, bank feeds) | **BLOCKED** | **BLOCKED** | **BLOCKED** | No credentials yet; keep stubs + mark in `docs/EXTERNAL_SERVICES.md` |

## Next Steps

1. Hook remaining data-driven components (dashboard stats, wallets, transactions, expenses) now that statements/audit/attendance sample assets exist.
2. Flesh out backend responses and React Query hooks for every 🚧 row above; prioritize Dashboard → Members → Wallets → Transactions.
3. Produce companion CSV (`docs/FEATURE_SURFACE_MATRIX.csv`) once statuses stabilize.
4. Update OpenAPI (`openapi/v1.yaml`) to reflect the real `/api/v1` contract per module.

_Updated: 2025-11-24_

