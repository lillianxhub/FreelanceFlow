# กฎใช้ SOLID ใน implementation และ review

ใช้ SOLID เพื่อควบคุมเหตุผลที่โค้ดเปลี่ยนและลด coupling ไม่ใช่ข้อกำหนดว่าทุก class ต้องมี interface มาตรฐานนี้ใช้กับ Spring services, TypeScript modules, hooks และ components ไม่มีคำรับรองว่าโค้ดเดิมผ่านครบทั้งระบบ

| หลักการ | กฎที่ review ได้ | ตัวอย่าง FreelanceFlow |
| --- | --- | --- |
| SRP | แยกส่วนที่เปลี่ยนด้วยเหตุผล/ผู้รับผิดชอบต่างกัน | Controller รับ HTTP, service ประสาน timer/status, repository จัด SQL; UI form แยก validation และ persistence |
| OCP | เพิ่ม variation ผ่าน boundary ที่จำเป็นแทนแก้ switch ซ้ำหลายจุด | ถ้า AUTO/MANUAL ซับซ้อนขึ้นใช้ policy/strategy เดียว ทั้งนี้สอง branch เรียบง่ายไม่ต้องรีบสร้าง hierarchy |
| LSP | implementation ที่แทนกันได้ต้องรักษา pre/postconditions, errors และ invariants | repository test double ต้องไม่อนุญาต owner อื่นหรือยอม duplicate ที่ PostgreSQL ปฏิเสธ |
| ISP | consumer พึ่งเฉพาะ operations ที่ใช้ | read/report query contract ไม่บังคับมี delete/startTimer; props form ไม่รับ workspace ทั้งก้อน |
| DIP | use-case rules ไม่ผูกกับรายละเอียดที่เปลี่ยนบ่อย | service พึ่ง clock/persistence adapter ตามจำเป็น; component เรียก service แทน fetch/SQL details |

## แนวทาง implement

SRP ให้ดูว่าใครหรือ requirement ใดทำให้ module เปลี่ยน ไม่ใช่จำกัดจำนวน method ตาม [Robert C. Martin: SRP](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) แยก mapper/validator/policy เมื่อมีเหตุผลร่วมชัดเจน

DIP และ constructor injection เป็นคนละเรื่อง DI ช่วยประกอบ dependencies แต่ไม่ทำให้ class ผ่าน DIP อัตโนมัติ ใช้ interface เมื่อมี boundary, alternative implementation หรือ test seam ที่มีคุณค่า ไม่สร้าง `XService`/`XServiceImpl` ใหม่ทุกกรณีเพียงเพื่อครบรูปแบบ

React composition/hooks เป็นเครื่องมือแยก behavior แต่ hook ที่โหลดทุก domain และแก้ทุก state ยังละเมิด SRP ได้ Functional module ที่เล็กและชัดเจนใช้ได้ ไม่ต้องบังคับ SOLID เป็น class hierarchy

## Review สำหรับการเพิ่ม/แก้ไข/ลบ

- ระบุ responsibility และ dependency direction ก่อนเพิ่ม abstraction
- variation ใหม่มี contract tests เดียวกันเมื่อแทนกันได้; ห้าม implementation คืน null/throw UnsupportedOperationException สำหรับ operation ที่ consumer ต้องใช้
- refactor ไม่เปลี่ยนกฎ ownership/status/transaction โดยแอบรวมกับการจัดไฟล์
- ลบ feature แล้วลด interface/dependency ที่ไม่มี consumer และตรวจ consumers ที่เหลือ
- PR อธิบายปัญหา coupling ที่ลด พร้อม trade-off ไม่ใช้ข้อความ “ผ่าน SOLID 100%” โดยไม่มีขอบเขตหลักฐาน

อ้างอิงแนวทาง dependencies เพิ่มเติมจาก [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) เป็นแนวคิดออกแบบ ไม่ใช่คำสั่งให้ย้ายทั้ง repository ไป architecture ใหม่
