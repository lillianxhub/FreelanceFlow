# กฎกำหนด requirement และ acceptance criteria

ใช้ร่วมกับ [feature workflow](doc/feature-workflow.md) ทุกงานเพิ่ม แก้ไข และลบ feature ต้องระบุผลที่ผู้ใช้สังเกตได้ ไม่ใช้รายการชื่อ component แทน requirement

## แม่แบบ requirement

- ID และชื่อ use case ที่คงที่
- actor, ownership, preconditions และข้อมูลเริ่มต้น
- trigger และ success outcome
- business invariants, validation, state transitions และ timezone
- failure outcomes รวม conflict/retry และการรักษาข้อมูล
- API/UI/schema ที่เกี่ยวข้องและ compatibility
- acceptance examples แบบ Given/When/Then และ tests ที่ยืนยัน

## ขอบเขตฐานของ FreelanceFlow

| ส่วน | ข้อกำหนดที่ต้องรักษาขณะพัฒนา |
| --- | --- |
| Authentication | refresh cookie และ access token แยกหน้าที่; logout/invalidation และ refresh concurrency ต้องสอดคล้อง |
| ลูกค้า/โปรเจกต์/งาน | ตรวจ owner และความสัมพันธ์ที่ Backend; archive/delete ต้องรักษารายงานและเวลาเดิม |
| Timer | มี timer ทำงานได้หนึ่งรายการต่อผู้ใช้; สลับงานต้องมีการตัดสินใจจากผู้ใช้และบันทึกอย่างถูกต้อง |
| วันนี้ | เลือกงานแยกจาก Task status, เก็บตามผู้ใช้/วันที่ Bangkok/ลำดับ, นำออกไม่ลบ Task; ไม่ยกงานค้างอัตโนมัติ |
| Project Board | OPEN / IN_PROGRESS / COMPLETED; AUTO และ MANUAL ไม่เปลี่ยน timer ที่วิ่งเมื่อสลับโหมด; การเรียงไม่เริ่ม timer ใหม่ |
| รายงาน | คำนวณจากข้อมูลบันทึกจริง ระบุช่วงวัน หน่วย duration และการจัดกลุ่ม |
| การเงิน | roadmap; ก่อน implement ต้องกำหนด amount precision, currency, invoice/payment/void/refund rules และข้อมูลจริง |

## ตัวอย่าง criteria

Given ผู้ใช้ A มีแผนวันนี้ version 2 เมื่อแท็บเก่าบันทึกด้วย version 1 ต้องตอบ 409 และ UI โหลดข้อมูลจริง ห้ามเขียนทับเงียบ ๆ

Given งานถูกเลือกเข้าวันนี้ เมื่อผู้ใช้นำออก ต้องเอาออกเฉพาะ membership ของ daily plan และคง Task status/time entries เดิม

Given ลบ feature รายงานชนิดหนึ่ง ต้องระบุ API consumers และการเก็บข้อมูลต้นทาง พร้อมพิสูจน์ว่ารายงานอื่นยังใช้ข้อมูลเดิมได้

## กฎคุณภาพ

ทุก flow ต้องใช้งานได้ด้วย keyboard/touch และมี loading/error/empty/focus states การเขียนพร้อมกันต้องมีนโยบาย conflict ไม่ขึ้นกับ frontend check เพียงอย่างเดียว เก็บข้อกำหนดปัจจุบันกับ roadmap แยกในเนื้อหา และอัปเดต criteria เมื่อเปลี่ยนพฤติกรรมโดยตั้งใจ
