# กฎ implementation — Next.js

ใช้ Next.js 16.4 App Router, TypeScript, React และ Tailwind ใน `src/app` เวอร์ชัน dependency จริงอยู่ใน lockfile อ่าน [workflow](../../doc/feature-workflow.md) ก่อนเปลี่ยน feature

## Routing และ server/client boundary

- ใช้ `next/link` และ App Router hooks คง existing URLs เว้นแต่มี redirect/compatibility plan อย่าเพิ่ม React Router/Vite SPA routing
- route/layout เป็น shell; แยก presentation, feature hooks, API services, validators และ business transformations
- ตาม [Next.js Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) ใช้ Client Components เมื่อมี events, effects, browser APIs หรือ state; อย่าย้ายทุกไฟล์ไป client โดยไม่มีเหตุผล
- auth/timer/forms/charts ปัจจุบันอยู่ client ห้ามส่ง access token หรือ user secret ผ่าน Server Component props, rendered HTML, cache หรือ `NEXT_PUBLIC_*`
- AuthProvider และ workspace TimerProvider อยู่ใน layout ที่คงอยู่ อย่า remount จาก route key หรือวาง provider ซ้ำต่อหน้า
- browser storage/channel/lock ต้องอยู่ browser boundary และใช้ namespace FreelanceFlow cleanup subscriptions/timers เมื่อ unmount

## Data flow และ state

UI → hook/use case → `src/services` → `src/api/apiClient.ts` → `/api` ไม่ยิง Backend origin หรือ decode token เพื่อตัดสินสิทธิ์จาก component ตาม [API integration](docs/BACKEND_INTEGRATION.md)

DTO และ UI models แยกด้วย mapper/types ไม่ใช้ `any` เพื่อข้ามสัญญา Guard stale responses และยกเลิกงานเมื่อเปลี่ยน filter/unmount ไม่ fetch ทุก resource ทั้งระบบเพื่อแสดงข้อมูลหนึ่งหน้า

Backend เป็น source of truth สำหรับ ownership/status/timer/version UI ต้องรับ 409 และโหลดข้อมูลใหม่ หาก optimistic update ล้มเหลวให้คืน state และ refresh โดยไม่กลืน error ระหว่าง rollback

## UI และ accessibility

- minimal light theme ตาม Demo, DM Sans และ Anuphan สำหรับข้อมูลไทย, shared tokens/components, semantic status colors และ blue primary action
- มี loading/error/empty/disabled ที่สอดคล้องกัน label/error สัมพันธ์กับ input และไม่ใช้สีอย่างเดียว
- ลูกค้า/โปรเจกต์ใช้ cards กับ side panel, Task ใช้ dialog; `/task-board` มี Today table และ Kanban รายโปรเจกต์ พร้อม keyboard/touch และปุ่มให้ผลเดียวกับ drag
- focus เข้า/ออก dialog/panel ถูกต้อง คืน focus ให้ trigger; mobile panel เต็มจอและไม่ล้น viewport
- Board column status แยกจาก Today membership; sorting ไม่เริ่ม timer; switching งานต้องยืนยัน explicit choice และไม่เปลี่ยน timer เพราะเปลี่ยนโหมด
- ข้อความระบบเป็นอังกฤษ; ข้อมูลผู้ใช้ภาษาไทยคงเดิม; Finance ใช้ `/api/finance` และ PostgreSQL จริงผ่าน `src/services/finance.ts` ข้อมูลแยก owner และคงอยู่หลังรีโหลด/logout ดู [Finance API](../../doc/finance-api.md)
- ทดสอบ hydration, direct URL, reload และ layout persistence ไม่อาศัย unit test ของ component เพียงอย่างเดียว

## เพิ่ม แก้ไข หรือลบ UI

เพิ่ม contract/types/service ก่อนเรียกใน UI; แก้ bug ให้มี regression test ตามความเสี่ยง; ลบ feature ต้องค้นหา route/menu/deep link/service/provider/storage/dependency และ consumers ทั้งหมด รักษาข้อมูล Backend ตาม retention plan

```bash
cp .env.example .env
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
# เปิด Backend และ production Next.js ก่อน integration tests
npx playwright install chromium
npm run test:e2e
```

Frontend port 5174; `BACKEND_ORIGIN` เป็น server config สำหรับ [rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites) เปลี่ยนแล้ว rebuild ก่อน `npm run start` Unit tests ปัจจุบันใช้ Node test runner + tsx/jsdom และ browser tests ใช้ [Playwright](https://nextjs.org/docs/app/guides/testing/playwright) การเปลี่ยน runner ต้องเป็นงานที่ระบุชัดเจน

The current Next/TypeScript combination uses the TypeScript compiler API (`experimental.useTypeScriptCli: false`) during production builds. In constrained environments where Turbopack cannot bind its helper port, use `npm run build -- --webpack`; type checking remains enabled. Finance browser acceptance uses persistent Backend data. Open-access flows run with Free accounts; switch/revocation flows require an Admin test account. Use a dedicated test database because the switch is global. Set `NEXT_DIST_DIR=.next-finance-test` and `BACKEND_ORIGIN` before building to isolate browser-test output from a running development app.
