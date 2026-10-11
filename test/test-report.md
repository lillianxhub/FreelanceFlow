# กฎบันทึกผลตรวจ implementation

ไฟล์นี้เป็นแม่แบบและกฎรายงาน ไม่ใช่ผลผ่านล่าสุด ไม่คัดจำนวน tests จากรายงานประวัติมาประกาศผลปัจจุบัน

## ข้อมูลที่ต้องบันทึกใน PR หรือรายงานของรอบนั้น

- commit/branch และขอบเขต feature ที่เปลี่ยน
- วันเวลา/Asia Bangkok, OS/runtime/dependency และ database versions
- exact commands และ environment ที่ไม่มี secrets
- passed/failed/skipped/blocked แยกกัน พร้อม exit code/log/artifact หรือ CI run URL
- migration starting version → target, fresh/upgrade/validate และข้อมูลตัวอย่าง
- browser/project/viewport และ flow ที่ตรวจจริง
- limitations, untested acceptance criteria และผู้รับผิดชอบตรวจต่อ

| Check | Command/environment | ผลจริง | Evidence/ข้อจำกัด |
| --- | --- | --- | --- |
| Backend verify | ระบุ command | รอผล | ระบุ log |
| Frontend lint/typecheck/unit/build | แยกแต่ละ command | รอผล | ระบุ artifact |
| Flyway fresh/upgrade | ระบุ versions และ test DB | รอผล | ไม่ใช้ข้อมูลจริง |
| Browser integration | ระบุ desktop/mobile/flow | รอผล | tests ที่ไม่ได้ครอบคลุม |
| CI | commit + run URL | รอผล | jobs skipped/pending แยก |

หาก command wrapper ออก 0 แต่ test ภายในล้มเหลว ต้องรายงานว่าล้มเหลว ตรวจ exit status และผล suite ไม่ดูเพียงข้อความท้าย log เมื่อแก้แล้วรันซ้ำเฉพาะ checks ที่เกี่ยวข้องและระบุผลล่าสุด

`test/evidence/*.json` เดิมคงเป็นข้อมูลประวัติ ไม่แก้ timestamp/count ให้ดูเหมือนรันใหม่ และไม่ลบหลักฐานที่ไม่ผ่าน
