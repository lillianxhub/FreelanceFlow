# กฎเชื่อม Next.js กับ Spring Boot

ปัจจุบันใช้ Spring Boot REST API และ PostgreSQL ไม่ใช้ Supabase client หรือ Vite environment เป็น contract

## Boundary

- ทุก browser request ใช้ `/api` ผ่าน `src/api/apiClient.ts`; `next.config.ts` rewrite ไป `BACKEND_ORIGIN` ฝั่ง server
- เก็บ API operations ใน `src/services` และ DTOs ใน `src/types/api.ts` แปลงผ่าน mapper ก่อน UI
- access token อยู่ client memory; refresh cookie แบบ HttpOnly จัดการโดย Backend ผ่าน proxy ห้ามเก็บ token ใน localStorage หรือ Server Component props
- คง `freelanceflow_refresh`, channel `freelanceflow-auth`, lock `freelanceflow-refresh` และ namespace storage ของ FreelanceFlow เมื่อแก้ auth ให้ตรวจหลายแท็บ/หลาย session
- API เป็น source of truth ไม่จำลองความสำเร็จหรือเงิน/เวลาเมื่อ request ล้มเหลว

## วิธีเปลี่ยน contract

1. อ่าน controller/request/response และ [error contract](../../../doc/error-contract.md) แล้วกำหนด field/type/nullability/status/version
2. เพิ่มหรือแก้ Backend contract + tests จากนั้น DTO/service/mapper ฝั่ง Frontend
3. ให้ loading/error/empty/stale/conflict มี UX ที่ตรวจได้ รักษา filter/pagination และไม่แสดง response เก่าทับ query ใหม่
4. ลบ contract ต้องค้นหา deep links, service calls, types และ consumers; คง compatibility ตามที่ใช้งานจริง
5. ตรวจ request ผ่าน Next proxy จริงสำหรับ cookie, origin, refresh, logout และ direct route ตาม [test plan](../../../test/test-plan.md)

Browser filters ใช้ค่า UI เช่น ALL ได้ แต่ต้อง map เป็น query ที่ Backend ยอมรับ Encode identifiers/query ด้วย URL APIs ไม่ต่อ untrusted query/sort field ตรง ๆ

เมื่อเปลี่ยน origin ต้อง rebuild production frontend แยก public configuration จาก secrets ตรวจ rewrite และการส่ง Set-Cookie โดยไม่ log token/cookie values

Finance ใช้ `src/services/finance.ts` ผ่าน proxy เดียวกัน รายการเงินเป็น decimal string จาก Backend และ `bigint` สตางค์เมื่อคำนวณใน browser; Backend ยืนยันยอด Invoice และการรับชำระ ดู [Finance API](../../../doc/finance-api.md) ทุก mutation ต้องรอ response ก่อนแสดงสำเร็จ และเมื่อได้ `409` ให้โหลดรายการใหม่ก่อนแก้ซ้ำ รูปโลโก้ต้อง fetch แบบ authenticated เพราะ `<img src="/api/...">` ไม่ส่ง Bearer token

Finance access now comes from the workspace `FeaturesProvider` and `/users/me/features`, not from the login plan alone. The Admin switch uses `/admin/features` with optimistic versioning. Sidebar, Finance layout and Backend policy agree in both open and enforced modes.

`SalesDocuments` shares the editor for invoices and quotations. `documentPreview` calculates unsaved totals using scaled integers and maps draft/current identity versus immutable issued snapshots. `DocumentPrint` renders both previews and printed documents. Conversion opens `/finance/invoices?invoice=<id>` with the persisted draft; every service uses the existing `/api` proxy.
