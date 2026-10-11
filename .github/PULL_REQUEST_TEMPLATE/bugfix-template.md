# PR: แก้ bug

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- trigger และ behavior ก่อน/หลัง; reproduction ที่ใช้ test data
- root cause และขอบเขตผลกระทบต่อ Spring/Next/contract/data
- regression test ที่จับอาการจริง หรือเหตุผลที่ test ไม่จำเป็น
- compatibility ของ consumer และผลตรวจขอบเขตเดิมที่ต้องรักษา

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
