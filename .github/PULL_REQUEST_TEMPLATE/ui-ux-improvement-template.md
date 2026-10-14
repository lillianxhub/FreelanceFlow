# PR: ปรับ UI/UX

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- flow/หน้าจอและผลต่อผู้ใช้ก่อน/หลัง; screenshots ใช้ข้อมูลทดสอบ
- Next routing/layout/provider และ API service boundary
- minimal tokens, Thai labels, responsive, keyboard/touch/focus/loading/error/empty
- drag และปุ่มต้องผ่าน use-case rules เดียวกัน; failure rollback และ timer consistency
- browser checks ที่รันจริง ไม่ใช้ screenshot แทนผลทดสอบ

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
