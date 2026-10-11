# FreelanceFlow — คู่มือพัฒนา

FreelanceFlow พัฒนาต่อจาก [Freelance Hub](https://github.com/lillianxhub/freelance-hub) โดยแยก repository ระบบปัจจุบันใช้ Spring Boot 4.0 / Java 17, PostgreSQL 16, Flyway และ Next.js 16.4 App Router / React / TypeScript / Tailwind เวอร์ชันจริงให้ตรวจ `pom.xml` และ `package-lock.json`

เอกสารชุดนี้เป็นกฎและแนวทางสำหรับเพิ่ม แก้ไข refactor และลบ feature ไม่ใช่รายงานว่าทุกส่วนของโค้ดผ่านมาตรฐานแล้ว หาก implementation ต่างจากกฎ ให้ระบุช่องว่างและปรับเฉพาะขอบเขตงาน ไม่ประกาศ compliance จากเอกสารอย่างเดียว

## เริ่มอ่าน

- [กฎร่วมและวงจรเปลี่ยน feature](doc/feature-workflow.md): ขอบเขต acceptance criteria compatibility และ Definition of Done
- [Spring Boot](code/Backend/README.md): ชั้นโค้ด transaction ownership และฐานข้อมูล
- [Next.js](code/Frontend/README.md): routing, server/client boundary, state และ UX
- [SOLID](doc/solid-analysis.md) และ [Design patterns](doc/design-patterns.md): เกณฑ์เลือก abstraction และตัวอย่างการ review
- [Tests](test/README.md): ระดับการทดสอบ วิธีรัน และหลักฐาน
- [ดัชนีเอกสาร](doc/README.md): API, schema, diagrams, CI และแหล่งอ้างอิง

## ติดตั้งและรัน local

ต้องมี Docker Compose, JDK 17+ และ Node.js 22 สร้าง configuration ของ FreelanceFlow เอง:

```bash
cp code/Backend/.env.example code/Backend/.env
cp code/Frontend/.env.example code/Frontend/.env
openssl rand -base64 48
```

ใส่ password ใหม่และ JWT secret ที่สร้างใน Backend `.env` ให้ datasource password ตรงกับ PostgreSQL ห้ามนำ credentials ของระบบเดิมมาใช้

```bash
# terminal 1 จากราก repository
cd code/Backend
docker compose up -d --build
# terminal 2 จากราก repository
cd code/Frontend
npm ci
npm run dev
```

Frontend http://localhost:5174, Backend ผ่าน Compose ใช้ http://localhost:8080 ตามค่า default ใน working tree นี้ (ปรับด้วย `APP_PORT`), PostgreSQL localhost:5433 ใช้ `/api` ผ่าน Next.js rewrite โดย `BACKEND_ORIGIN` เป็น configuration ฝั่ง server เปลี่ยน origin แล้วต้อง build ใหม่ก่อนใช้ `npm run start` Compose project คือ `freelanceflow` ตรวจ host/container ports จาก Compose อย่าสมมติว่าเหมือนกัน การรัน Spring โดยตรงมี default port 8081 จึงต้องตั้ง `BACKEND_ORIGIN` ให้ตรงวิธีรันจริง

## ขอบเขตผลิตภัณฑ์

มีระบบบัญชีผู้ใช้ ลูกค้า โปรเจกต์ งาน จับเวลา แผนงานวันนี้ Project Board และรายงาน การเงินเป็น roadmap: ต้องออกแบบการบันทึกและกฎจริงก่อนเพิ่ม schema/API ห้ามคำนวณยอดจาก placeholder หรือแสดงยอดสมมติ

## เครดิต

คงเครดิตสมาชิกผู้พัฒนา Freelance Hub ด้านล่าง ส่วนไฟล์ที่มีเครดิตหรือใบอนุญาตเดิมให้คงไว้
