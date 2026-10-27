# กฎใช้ coverage เพื่อวางแผน tests

Coverage เป็นตัวบอกโค้ดที่ถูก execute ไม่ได้ยืนยันว่าทุก rule ถูก assert ห้ามใช้ coverage บางไฟล์แทน whole-project coverage หรืออ้าง whole-system correctness จากเปอร์เซ็นต์เดียว

## รายงานที่ต้องมี

ระบุ tool/version, commit, include/exclude, line/branch/function metrics แยก Backend/Frontend และ unit/integration เก็บ command/artifact อธิบาย generated/vendor files ที่ exclude โดยไม่ซ่อน service/policy ที่ยังไม่ทดสอบ

## เกณฑ์ review

- ข้อกำหนด owner isolation, version conflict, timer atomicity และ historical data มี behavioral assertions หรือไม่
- branch ที่ไม่ครอบคลุมคือ error/rollback/permission path สำคัญหรือไม่
- test ผ่านเพราะ mock อนุญาตสิ่งที่ DB จริงปฏิเสธหรือไม่
- feature ที่ลบทำให้ coverage denominator เปลี่ยนอย่างไร อย่าตีความเปอร์เซ็นต์เพิ่มว่าเพิ่ม tests
- ไม่มี threshold ใหม่ที่ประกาศว่าปัจจุบันผ่านโดยไม่ได้เก็บ baseline หากตั้ง gate ให้เริ่มจากหลักฐานและความเสี่ยง

ดู [test plan](test-plan.md) สำหรับเลือก tests และ [test report](test-report.md) สำหรับผลจริง ไฟล์ evidence ประวัติไม่แทน baseline ของ branch ปัจจุบัน
