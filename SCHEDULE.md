# แนวทางแบ่งงานและลำดับพัฒนา

เอกสารนี้กำหนดวิธีวางลำดับ implementation ไม่กำหนดกำหนดส่งในอดีตหรือสถานะงานที่ไม่มีหลักฐาน

1. **ค้นหาและออกแบบ:** criteria, consumers, state/data/permission rules และ compatibility
2. **Backend:** contract, migration, repository, use-case service, validation และ transaction tests
3. **Frontend:** API adapter/types, hook/provider, route/UI, minimal theme และ accessibility
4. **Integration:** PostgreSQL/Flyway, proxy/cookie, concurrency, failure recovery และ browser tests
5. **Review:** docs, CI, migration/retention notes และผลตรวจที่ผูกกับ commit
6. **Release:** งานแยกหลัง review ต้องมี configuration และ rollback/recovery ที่จริง

แบ่ง PR ตาม use case หรือการย้ายชั้นที่รักษา behavior ให้แต่ละหน่วย build/test ได้ งาน schema ที่เปลี่ยน consumer ควรใช้ expand → migrate consumers/backfill → contract ตามความจำเป็น อย่าเปิด destructive migration ก่อนออกแบบข้อมูลย้อนหลัง

เมื่อเปลี่ยนลำดับ ให้บอก dependency และเหตุผล ไม่ตั้งสถานะ “เสร็จ” จากการมี checklist การเงินเริ่มจากบันทึกรับจ่ายจริงแล้วค่อย invoice/payment ตาม design ที่ยืนยัน ไม่สร้าง UI ยอดสมมติเพื่อรอ Backend
