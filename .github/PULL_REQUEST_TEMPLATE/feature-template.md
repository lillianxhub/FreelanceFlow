# PR: เพิ่ม feature

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- ปัญหาผู้ใช้, actor/owner, Given/When/Then และ negative paths
- contract/schema/service/route/UI ที่เพิ่ม; business rules อยู่ Backend
- transaction/version/constraints, loading/error/empty และ accessibility
- SOLID/pattern ที่เลือกพร้อมเหตุผล ไม่สร้าง abstraction เพื่อให้ครบชื่อ
- tests success/validation/owner/conflict และ integration ตามความเสี่ยง

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
