# ปัญหาและผลหลังเปลี่ยน

<!-- ระบุ trigger/ปัญหาและ behavior หลังเปลี่ยนให้ reviewer ที่ไม่ได้อ่าน chat เข้าใจ -->

## ประเภทและขอบเขต

- [ ] เพิ่ม feature
- [ ] แก้ bug
- [ ] Refactor โดยรักษา behavior
- [ ] ลบ/เลิกใช้ feature
- [ ] UI/UX หรือเอกสาร

<!-- ระบุ acceptance criteria และสิ่งที่กระทบ: Spring Boot / Next.js / API / schema / state / CI -->

## การออกแบบและ compatibility

<!-- อธิบาย responsibilities, transaction/owner/concurrency, SOLID/pattern ที่มีเหตุผลใช้, consumers และ migration/retention เมื่อเกี่ยวข้อง -->

## ผลตรวจจริง

<!-- ระบุ commands, environment/commit, passed/failed/skipped และ evidence ห้ามทำเครื่องหมายผ่านสิ่งที่ไม่ได้รัน -->

| Check | ผล/evidence หรือเหตุผลที่ไม่ต้องรัน |
| --- | --- |
| Backend verify/contract/integration | |
| Frontend lint/typecheck/unit/build | |
| Flyway fresh + upgrade + validate | |
| Browser/keyboard/touch/focus | |

## ประเด็น review

<!-- ระบุ material risk, breaking changes, recovery และข้อจำกัดที่เหลือ -->

ใช้ [feature workflow](../doc/feature-workflow.md), [SOLID](../doc/solid-analysis.md), [patterns](../doc/design-patterns.md) และ [test plan](../test/test-plan.md) ตรวจเฉพาะสิ่งที่เกี่ยวข้อง การเปิด PR ไม่ใช่การ deploy
