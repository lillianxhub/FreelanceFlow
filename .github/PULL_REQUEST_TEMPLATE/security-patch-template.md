# PR: แก้ security behavior

<!-- เขียนชื่อ PR ให้ระบุผลที่เปลี่ยน และเติมเฉพาะส่วนที่เกี่ยวข้อง -->

## ปัญหา ขอบเขต และผลหลังเปลี่ยน

## เกณฑ์ implementation/review

- threat/trigger และผลกระทบโดยไม่เผย secret/ข้อมูลผู้ใช้
- auth/owner/cookie/origin/rendering/cache ที่เกี่ยวข้องและ root cause
- fix ที่รักษา business contract พร้อม unauthorized/owner isolation regression
- migration/compatibility/recovery หากกระทบ sessions หรือ stored data
- dependencies/lockfile และผล tests จริง; ไม่ลด security เพื่อให้ tests ผ่าน

## ผลตรวจจริงและ evidence

<!-- Commands, commit/environment, passed/failed/skipped, links และสิ่งที่ไม่ได้ตรวจ ห้ามอ้าง tests จากรอบก่อนเป็นผลรอบนี้ -->

## Compatibility ข้อมูลเดิม และข้อจำกัด

อ่าน [workflow](../../doc/feature-workflow.md) และ [test plan](../../test/test-plan.md) เพื่อเลือก checks ตามผลกระทบ
