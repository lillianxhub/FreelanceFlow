# แนวทางวางแผนทดสอบทุกการเปลี่ยน feature

## เลือกระดับตามความเสี่ยง

| ระดับ | ตรวจอะไร | แนวทาง |
| --- | --- | --- |
| Backend unit | domain/service policies, validation, state, orchestration | JUnit/Mockito ตาม runner เดิม; mock ที่ boundary ไม่ mock business rule ที่กำลังตรวจ |
| HTTP/security | DTO/envelope/status/owner/unauthenticated | Spring MVC/Boot test slice ที่ตรง Boot 4 และ security wiring |
| PostgreSQL integration | queries, constraints, locking, atomic rollback | database สำหรับ tests เท่านั้น; H2 หรือ mocks ไม่แทน PostgreSQL semantics |
| Flyway | fresh schema + upgrade with existing data | migrate แล้ว validate; ตรวจ version/checksum/constraints |
| Frontend unit/component | mapper/validator/hooks/form/API handling | Node test runner + tsx/jsdom ปัจจุบัน แยก global mocks และ cleanup |
| Browser integration | route/layout/cookie/hydration/interaction | production Next + Backend จริงผ่าน proxy, Playwright desktop/mobile |

Async Server Components ที่เครื่องมือ unit ไม่รองรับต้องตรวจผ่าน integration/E2E ตาม [Next testing guidance](https://nextjs.org/docs/app/guides/testing) อย่าใช้ DOM mock อ้างว่า SSR ผ่าน

## Matrix สำหรับเพิ่ม แก้ไข และลบ

- เพิ่ม: success, invalid input, auth/owner, unavailable state, empty/paging และ retry/conflict ที่เกี่ยวข้อง
- แก้ bug: regression ที่จับ trigger จริงและขอบเขตเดิมที่ต้องคง
- refactor: observable contract เดิมและ integration boundaries ที่ย้าย
- ลบ: route/API/deprecation outcome, consumers ที่เหลือ, history/retention และ migration compatibility
- persistence: optimistic stale version, simultaneous writes และ rollback ของ command หลาย writes
- auth: login/refresh/logout, cookie ผ่าน proxy, expired session, tabs และไม่รั่ว user data ผ่าน rendering/cache
- Today: drag/add/remove/reorder, reload/device persistence, Bangkok day boundary, explicit carry-over, completed/deleted/unavailable task
- Board/timer: AUTO/MANUAL, same-column reorder, active timer marker, switching/cancel, mode change while running, API failure rollback และหนึ่ง timer ต่อ owner
- Task Board: Today/Kanban URL ตรงและย้อนกลับได้, Dashboard ไม่มี Today planner, start/stop ไม่ redirect, timer ต่อเนื่องระหว่างเปลี่ยนหน้า
- Finance: ทศนิยม, ส่วนลด, VAT/HALF_UP, ภาษีหัก ณ ที่จ่าย, รับชำระบางส่วน/เต็มจำนวน, cancel เพียงครั้งเดียว, concurrent payment/idempotency, snapshot หลังแก้ลูกค้า/settings, เอกสาร VAT หลายงวดและฉบับแทน, owner/Free/Admin, reload/logout และ A4 หลายหน้า ตรวจ migration V23 ทั้งฐานใหม่และฐาน V22 ที่มีบัญชีเดิม
- UX: keyboard, touch, panel/dialog focus, loading/error/empty และ mobile layout
- Admin/Premium: ผู้ใช้ทั่วไปเข้า `/api/admin/**` ได้ 403, ไม่มี session ได้ 401, Admin ได้เฉพาะข้อมูลบัญชีที่อนุญาตและยังถูกจำกัด owner ของ workspace; Free เข้า Finance ได้เมื่อปิด enforcement; เมื่อเปิดจึงล็อก Free และคงสิทธิ์ Premium/Admin, การเปลี่ยนแพ็กเกจตรวจ version/409 และสิทธิ์หลัง revoke

## คำสั่งมาตรฐาน

```bash
# จาก code/Backend
./mvnw --batch-mode --no-transfer-progress verify
# จาก code/Frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
# เปิด Backend ตาม port ที่กำหนด และ production Next.js port 5174
# ตั้ง BACKEND_ORIGIN ให้ตรง Backend ก่อน build
npm run test:e2e -- --workers=1
```

Flyway ตรวจโดย pipeline หรือ tool/runtime ที่รองรับ PostgreSQL ใช้ empty test database และอีก database ที่ migrate ถึง version ก่อนหน้า แล้วเพิ่ม migrations ใหม่/validate ห้าม flyway clean/reset กับฐานข้อมูลจริง

## ความเสถียรของ tests

ใช้ test data แยก owner และ unique IDs ไม่พึ่งลำดับ suite/time ปัจจุบัน ใช้ fixed clock สำหรับ date/time policy; browser ใช้ locator ตาม role/label และ await state/network outcome หลีกเลี่ยง arbitrary sleeps ถ้ากฎ timer ต้อง elapsed time ให้ระบุเหตุผล ใช้ output directory แยกเมื่อรันหลาย process ไม่ชน artifacts

mock failure ที่ boundary เพื่อพิสูจน์ recovery และเพิ่ม integration สำหรับ atomic writes ใช้ evidence จริง ไม่ตั้ง coverage/จำนวน tests เป็นข้อสรุป correctness

## Finance PostgreSQL regression suite

`FinancePostgresIntegrationTest` runs only when `FINANCE_TEST_DATABASE_URL` is set. Set `FINANCE_TEST_DATABASE_USER` and `FINANCE_TEST_DATABASE_PASSWORD` through the environment; do not put passwords in command arguments or commits. Use a test database where this account can create/drop schemas. Each run creates a UUID-named schema, runs Flyway, and drops only that schema after tests. The upgrade regression uses a separate schema migrated to V21 before applying all later migrations to an existing account.

```bash
# Database env vars supplied by the test environment
./mvnw --batch-mode --no-transfer-progress -Dtest=FinancePostgresIntegrationTest,FinancePolicyTest test
```

This suite exercises payment overrun races, same-key retries and changed payloads, cross-invoice key contention, cancellation versus payment, rollback of payment/income/document counters, monetary response strings, persistent snapshots, VAT residuals, Admin ownership, open/enforced Free access, inactive/deleted denial, quotation snapshots, concurrent conversion and rollback. It does not replace HTTP/security or browser tests. The Finance browser test requires `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` for an existing active Admin; without these credentials its Premium flow explicitly skips. Run browser suites on an isolated Backend/database with enforcement initially off; switch tests restore the prior setting in finally and run with one worker.

## Quotation and preview acceptance

- Fresh migration and V23 upgrade preserve existing invoice amounts, snapshots and plans; V24 starts open and persists later switch changes.
- Admin-only toggle: 401/403, invalid request, stale version 409, Free/Premium/Admin in both modes, existing data retained after re-enabling enforcement.
- Quotation: create/edit/issue/cancel, valid dates, owner-safe client/project references, QT numbering, immutable snapshots, no accounting impact, unique conversion under concurrency, atomic rollback.
- Browser: unsaved Quotation/Invoice preview, current form changes, exact decimal totals and invalid values, Escape/Close preserves form and focus, snapshot stability after customer changes, conversion and reload, desktop/mobile and multi-page A4 PDF.
- Frontend: `documentPreview.test.ts` covers HALF_UP, quantities with three decimals, large values, overflow and incomplete fields. `e2e/finance-documents.spec.ts` covers the new user journeys through the Next proxy.
