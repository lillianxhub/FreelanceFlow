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
- Finance prototype: invoice draft/issued → partial/full payment, ยอด income/outstanding ไม่ซ้ำ, ป้องกันยอดเกินและ invalid amount, รีเซ็ตเมื่อรีโหลด/logout, SAMPLE ใน print และไม่มี finance API write
- UX: keyboard, touch, panel/dialog focus, loading/error/empty และ mobile layout

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
