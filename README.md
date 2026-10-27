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

สร้างข้อมูลตัวอย่างสำหรับทดสอบหน้าจอด้วย `cd code/Backend && ./seed-local.sh` หลังตั้ง datasource ให้ชี้ PostgreSQL ในเครื่อง คำสั่งสร้างบัญชี ลูกค้า โปรเจกต์ งาน เวลา และข้อมูล Finance ได้แก่ Settings, หมวดหมู่, service presets, Quotation ทุกสถานะ, Invoice แบบร่าง/ค้างชำระ/ชำระแล้ว/ยกเลิก, Payments, Income/Expenses, Receipt และ Tax invoice สามารถรันซ้ำได้โดยไม่สร้างรายการซ้ำหรือเขียนทับข้อมูลตัวอย่างที่แก้ไว้ ตั้งบัญชีด้วย `LOCAL_SEED_EMAIL` และ `LOCAL_SEED_PASSWORD` ได้ตามเดิม

## ขอบเขตผลิตภัณฑ์

มีระบบบัญชีผู้ใช้ ลูกค้า โปรเจกต์ งาน จับเวลา Task Board ที่แยกจาก Dashboard พร้อมแท็บ Today/Kanban และรายงาน UI ใช้ธีมอ้างอิง Demo และข้อความระบบภาษาอังกฤษ

กลุ่ม Finance มี Financial Overview, Income, Expenses, Quotations, Invoices, Payments, Tax invoices และ Settings & templates ข้อมูลบันทึกใน PostgreSQL ผ่าน `/api/finance` แยกตามบัญชีผู้ใช้ ใช้เงินบาทและให้ Backend คำนวณยอด Invoice จากรายการ ส่วนลด และ VAT ค่าเริ่มต้นเปิดให้ทุกบัญชีที่ยังใช้งานอยู่ โดย Admin เห็นเฉพาะข้อมูลการเงินของตนเอง ดู [สัญญา Finance API](doc/finance-api.md) สำหรับ lifecycle, decimal string และข้อจำกัดการออกเอกสาร

เปิด `http://localhost:5174/task-board` เพื่อจัดงานและจับเวลาในหน้าเดียวกัน; เลือก Kanban และโปรเจกต์จากหน้าเดียวกัน Finance ที่ `/finance` เปิดให้ทุกบัญชีที่ล็อกอินและยังใช้งานอยู่เมื่อปิดการบังคับ Premium และข้อมูลคงอยู่หลังรีโหลดหรือออกจากระบบ

Admin dashboard อยู่ที่ `/admin` แสดงจำนวนบัญชี การสมัครย้อนหลัง 6 เดือน และรายชื่อบัญชี โดยไม่แสดงข้อมูลลูกค้า โปรเจกต์ งาน หรือเวลาทำงาน Admin เปลี่ยนแพ็กเกจ Free/Premium ได้จากตาราง แพ็กเกจไม่มีวันหมดอายุและยังไม่มีระบบรับชำระค่าสมาชิก สวิตช์ **Require Premium for Finance** ควบคุมการล็อก Finance ทั้งระบบ ค่าเริ่มต้น Off; เมื่อเปิดจะเหลือสิทธิ์เฉพาะ Premium/Admin โดยข้อมูลเอกสารและแพ็กเกจเดิมยังอยู่ ค่าตั้งคงอยู่หลังรีสตาร์ต

ตั้ง Admin คนแรกโดยสมัครบัญชีปกติก่อน แล้วรันคำสั่งครั้งเดียวจาก `code/Backend` โดยใช้ datasource configuration เดียวกับ Backend: `./mvnw spring-boot:run -Dspring-boot.run.main-class=th.ac.kku.freelance_hub.seed.AdminPromotionCommand -Dspring-boot.run.arguments=--email=admin@example.com` คำสั่งจะล้มเหลวถ้าบัญชีไม่มีอยู่ ปิดใช้งาน หรือถูกลบ และไม่ทำงานเองเมื่อเริ่มเซิร์ฟเวอร์

## เครดิต

คงเครดิตสมาชิกผู้พัฒนา Freelance Hub ด้านล่าง ส่วนไฟล์ที่มีเครดิตหรือใบอนุญาตเดิมให้คงไว้

Quotation อยู่ที่ `/finance/quotations`: บันทึกร่าง ออกเลข QT ยกเลิก และสร้าง Invoice ต่อได้หนึ่งฉบับต่อใบเสนอราคา ฟอร์ม Quotation/Invoice มีปุ่ม **Preview** แสดงข้อมูลที่ยังไม่บันทึก พร้อม **Print / Save PDF** รูปแบบ A4; ตัวอย่างไม่จองเลขหรือสร้างเอกสารจริง
