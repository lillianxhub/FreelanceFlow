# PR: ปรับกฎและคู่มือพัฒนา

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- เอกสารและกลุ่มผู้อ่านที่เปลี่ยน พร้อมเหตุผล
- แยก repository policy, current implementation, proposed design และ historical evidence
- ตรวจ version/source/official references, links และ diagrams ที่เกี่ยวข้อง
- คงเครดิตและหลักฐานประวัติ; ไม่แต่ง test counts/deployment URLs
- docs-only ไม่ต้องรัน runtime suites โดยไม่มีผลกระทบ แต่ต้องบอกการตรวจที่ทำจริง

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
