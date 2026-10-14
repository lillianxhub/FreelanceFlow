# PR: Hotfix

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- อาการ, ผลกระทบและ trigger ที่ต้องแก้เร่งด่วน
- fix ที่เล็กและ review ได้; รักษา ownership/data/transaction semantics
- checks ที่รันจริงและข้อจำกัดเวลา; ห้ามอ้าง skipped ว่าผ่าน
- recovery/ติดตามงานที่เหลือหากจำเป็น; deploy ต้องเป็น action ที่ได้รับคำสั่งแยก

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
