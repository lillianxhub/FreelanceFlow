# PR: ลบหรือเลิกใช้ feature

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- ขอบเขต: hide UI / disable route / deprecate API / contract schema เป็นคนละ action
- consumers ทั้ง frontend/backend/external, deep links/events/config/dependencies
- compatibility/deprecation และ behavior ของ consumers ที่เหลือ
- historical data retention/export/recovery; การลบ feature ไม่อนุญาตลบข้อมูลจริงโดยอัตโนมัติ
- migration ใหม่หลัง consumers หยุดใช้; fresh/upgrade และ remaining-feature regression

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
