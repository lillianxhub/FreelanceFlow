# กฎตรวจ environment และความพร้อมพัฒนา

ตรวจทุกเครื่องหรือ environment ใหม่ด้วย configuration ของ FreelanceFlow และฐานข้อมูลแยก อย่าใช้ข้อมูลหรือ credentials ของ Freelance Hub

## ตรวจ configuration

- อ่าน `pom.xml`, `package.json`, lockfile, `.env.example`, Compose และ Next config ก่อนเลือก runtime
- สร้าง password/JWT secret ใหม่; `.env` และ build outputs ต้องถูก ignore ขณะที่ `.env.example` ต้อง track ได้
- ตรวจ Frontend 5174, Backend host ตาม `APP_PORT` (Compose default 8080 ใน working tree นี้), PostgreSQL host 5433 ไม่ชนระบบอื่น และแยก host/container port การรัน Spring โดยตรงมี default 8081 ต้องตั้ง proxy ให้ตรง
- ใช้ `/api` rewrite และ `BACKEND_ORIGIN` ฝั่ง server; เปลี่ยน origin แล้ว rebuild production frontend
- ชื่อ cookie/channel/lock/storage ใช้ namespace FreelanceFlow; ไม่ใช้ข้อมูล browser ร่วมระบบเดิม
- ตรวจ origin/secure cookie ตาม local หรือ HTTPS environment ที่จริง ไม่ปิด security เพื่อให้ browser test ผ่าน

## ตรวจ runtime

1. เริ่ม PostgreSQL และ Backend ด้วย Compose ตาม README รอ health/Flyway ไม่มี migration error
2. เปิด Next.js ตรวจ login, refresh, logout และ URL รายละเอียดโดยตรง
3. ตรวจ timer ข้ามหน้า แผนวันนี้ และ owner isolation ด้วย test users แยก
4. รัน [test plan](test/test-plan.md) และ [CI](doc/ci-cd.md) ตามสิ่งที่เปลี่ยน
5. ถ้า schema เปลี่ยน ตรวจทั้ง empty DB และ upgrade จาก version ก่อนหน้า พร้อม validate

บันทึก command, commit, runtime, database version และผลจริงตาม [test report](test/test-report.md) ไฟล์นี้ไม่ใช่ผลผ่านของ environment ใดโดยตัวมันเอง
