# PR: Refactor

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- responsibility/coupling/duplication ที่เป็นปัญหา
- boundaries ก่อน/หลังและเหตุผลเลือก SOLID/design pattern
- observable behavior/API/schema ที่ต้องรักษา พร้อม regression/contract tests
- หากเปลี่ยน behavior ให้แยกและระบุ criteria ไม่เรียกรวมว่า refactor
- abstraction/dependency ที่ถอดเมื่อไม่มี consumer

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
