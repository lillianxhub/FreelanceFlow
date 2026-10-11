# FreelanceFlow

FreelanceFlow เริ่มพัฒนาต่อจาก [Freelance Hub](https://github.com/lillianxhub/freelance-hub) โดยเป็นโปรเจกต์และ repository แยกกัน ยังไม่มี GitHub repository หรือ deployment ของ FreelanceFlow และรอบนี้ไม่ได้เพิ่ม feature ใหม่

## ขอบเขตปัจจุบัน

Authentication และโปรไฟล์ผู้ใช้, ลูกค้า, โปรเจกต์, งานย่อย, จับเวลาและบันทึกเวลาย้อนหลัง, Dashboard และ Reports ยังไม่รวม Invoice, Payment หรือระบบบัญชี ใช้ React/TypeScript/Vite, Java 17/Spring Boot, PostgreSQL 16 และ Flyway โดยคง Java package `th.ac.kku.freelance_hub` และ migration V1–V20 เดิม

## ติดตั้งและรัน

ต้องมี Docker Compose, Node.js 22 (22.12 ขึ้นไป) และ JDK 17 หากรัน Backend บนเครื่อง ใช้ Maven Wrapper ที่ให้มา

```bash
cd /home/shachi/dev/University/2569/1st/project_management/projects/repos/FreelanceFlow
cp code/Backend/.env.example code/Backend/.env
cp code/Frontend/.env.example code/Frontend/.env
```

ตั้ง `POSTGRES_PASSWORD` ใหม่ใน Backend `.env` และใช้ค่าเดียวกันใน `SPRING_DATASOURCE_PASSWORD` สร้าง JWT secret ใหม่ด้วย `openssl rand -base64 48` แล้วนำค่าใส่ `JWT_SECRET` ห้ามใช้ credentials หรือ secret ของ Freelance Hub และห้าม commit `.env`

```bash
cd code/Backend
docker compose up -d --build
# อีก terminal จากรากโปรเจกต์
cd code/Frontend
npm ci
npm run dev
```

เปิด http://localhost:5174; Backend http://localhost:8081; PostgreSQL localhost:5433 Frontend proxy ส่ง `/api` ไป `http://localhost:8081` Compose project คือ `freelanceflow`, container คือ `freelanceflow_db` และ `freelanceflow_app`, volume คือ `freelanceflow_postgres_data` เปิดพร้อม Freelance Hub ได้โดย port ไม่ชนกัน

หากรัน Backend บนเครื่อง: เริ่มเฉพาะ DB ด้วย `docker compose up -d postgres` แล้ว `./mvnw spring-boot:run` จาก `code/Backend` (อ่าน `.env` ให้อัตโนมัติ) หยุด Docker ด้วย `docker compose down` โดยเก็บ volume ไว้

หากเครื่อง Linux/WSL ยังไม่มี Node.js ใช้ Docker จาก `code/Frontend` แทนได้ (host network ทำให้ proxy เข้าถึง Backend บน localhost):

```bash
docker run --rm -it --network host --user "$(id -u):$(id -g)" \
  -e npm_config_cache=/tmp/npm-cache -v "$PWD:/workspace" -w /workspace \
  node:22-bookworm sh -c 'npm ci && npm run dev -- --host 0.0.0.0'
```

## ทดสอบ

```bash
cd code/Backend
./mvnw --batch-mode --no-transfer-progress verify
# อีก terminal จากรากโปรเจกต์
cd code/Frontend
npm run lint
npm run typecheck
npm test
npm run build
```

CI เก็บ Maven verify, Frontend lint/typecheck/tests/build, Flyway migrate/validate บน PostgreSQL ว่าง และ Docker runtime smoke test ปิด deploy jobs และยังไม่เชื่อม Render/Vercel ต้องกำหนดปลายทางของ FreelanceFlow ก่อนเปิด deploy อีกครั้ง

## การแยกโปรเจกต์

ชื่อ BroadcastChannel, browser lock, local storage สำหรับรูปโปรไฟล์ และ refresh cookie แยกจากระบบเดิม Access JWT อยู่ในหน่วยความจำ Java package และ Flyway history คงเดิม เอกสาร `doc/`, `test/`, `REQUIREMENTS.md` และ `SCHEDULE.md` ที่รับต่อเป็นข้อมูลประวัติของ Freelance Hub ไม่ใช่หลักฐานว่าระบบใหม่ผ่านการทดสอบหรือ deploy แล้ว ดูผลตรวจรอบนี้ใน `SETUP_VERIFICATION.md`

## เชื่อม GitHub ภายหลัง

สร้าง repository ใหม่ที่ว่างและใช้ URL ที่ได้รับจริง ตรวจ `git remote -v` ก่อนเพิ่ม `origin` จากนั้นตรวจ diff/credentials, commit งานบน `main` และ `git push -u origin main` ห้ามใช้ remote ของ Freelance Hub ยังไม่มีการ push หรือ deploy ในรอบตั้งค่านี้

## ที่มาและเครดิต

คงเครดิตสมาชิกผู้พัฒนา Freelance Hub ด้านล่าง ส่วนไฟล์ที่มีเครดิตหรือใบอนุญาตเดิมให้คงไว้

## สมาชิกกลุ่ม

| ลำดับ | ชื่อ-นามสกุล | รหัสนักศึกษา | Section | Branch | หน้าที่รับผิดชอบ |
| ---: | --- | --- | --- | --- | --- |
| 1 | เพชรภิญโญ ธนศิรินรากร | 673380073-7 | 2 | `petpinyo_673380073-7_02` | Authentication, User, Security และ CI/CD |
| 2 | ถิรวัฒน์ อุจินา | 673380039-7 | 2 | `thirawat_673380039-7_02` | Client Management |
| 3 | กันตวิชญ์ นาคนวล | 673380027-4 | 1 | `kantavit_673380027-4_01` | Project และ Task Management |
| 4 | กรมภัฏ พิริยะ | 673380262-4 | 2 | `kompat_673380262-4_02` | Time Tracking |
| 5 | ณัฏฐดนย์ สาริกา | 673380511-9 | 2 | `nattadol_673380511-9_02` | Dashboard, Analytics และ Frontend |

