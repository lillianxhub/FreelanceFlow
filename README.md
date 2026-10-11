# FreelanceFlow

FreelanceFlow เป็นระบบจัดการงานสำหรับฟรีแลนซ์ พัฒนาต่อจาก [Freelance Hub](https://github.com/lillianxhub/freelance-hub) ใน repository แยกกัน โดยรักษาเครดิตผู้พัฒนาเดิม

Frontend ใช้ Next.js App Router และธีม minimal แบบสว่าง ส่วน Backend ใช้ Spring Boot, PostgreSQL และ Flyway ระบบมีลูกค้า โปรเจกต์ งานย่อย จับเวลา รายงาน ลิสต์งานวันนี้ และ Project Board การเงิน (รับจ่าย ใบแจ้งหนี้ และยอดค้าง) อยู่ใน roadmap ระยะถัดไป ยังไม่แสดงยอดเงินจากฟิลด์ placeholder ในหน้าบ้านเดิม

## เริ่มใช้งานบนเครื่อง

ต้องมี Docker Compose, JDK 17+ สำหรับ Maven และ Node.js 22 สำหรับ Frontend

```bash
cp code/Backend/.env.example code/Backend/.env
cp code/Frontend/.env.example code/Frontend/.env
```

ตั้ง `POSTGRES_PASSWORD` ใหม่ใน Backend `.env` และใช้ค่าเดียวกันใน `SPRING_DATASOURCE_PASSWORD` สร้าง `JWT_SECRET` ใหม่ด้วย `openssl rand -base64 48` ห้ามใช้ค่าจาก Freelance Hub

```bash
cd code/Backend
docker compose up -d --build
# อีก terminal จากรากโปรเจกต์
cd code/Frontend
npm ci
npm run dev
```

เปิด http://localhost:5174; Next.js ส่ง `/api` ไป Backend http://localhost:8081 ด้วย `BACKEND_ORIGIN` ซึ่งเป็นค่า server เท่านั้น PostgreSQL ใช้ localhost:5433 Docker project/volume คือ `freelanceflow`/`freelanceflow_postgres_data` และแยกจาก Freelance Hub หากไม่มี Node.js บน Linux/WSL ใช้ `docker run --rm -it --network host --user "$(id -u):$(id -g)" -e npm_config_cache=/tmp/npm-cache -v "$PWD:/workspace" -w /workspace node:22-bookworm sh -c 'npm ci && npm run dev -- --hostname 0.0.0.0'` จาก `code/Frontend`

## การใช้งาน

หน้า **วันนี้** เลือกงานค้างข้ามโปรเจกต์ ลากเข้าลิสต์และเรียงลำดับได้ ข้อมูลเก็บตามวันในเขตเวลา Asia/Bangkok งานค้างจากวันก่อนต้องเลือกยกมาทำต่อเอง หน้า Project มี Board งานค้าง → กำลังทำ → เสร็จ และสลับเป็นตารางได้ ค่าเริ่มต้นของ Board คือลากเข้า “กำลังทำ” แล้วเริ่มจับเวลา สามารถเลือกโหมดกดจับเวลาเองได้ การจับเวลามีได้หนึ่งงานต่อผู้ใช้ และงานที่เริ่มแล้วไม่สามารถย้อนสถานะกลับเป็น “งานค้าง” ตามกฎเดิมของระบบ

## ตรวจสอบ

```bash
cd code/Backend
./mvnw --batch-mode --no-transfer-progress verify
# อีก terminal จากรากโปรเจกต์
cd code/Frontend
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e # เปิด Backend และ Next.js ที่ port 8081/5174 ก่อน
```

Flyway V1–V20 คงเดิม; V21 เพิ่มแผนรายวันและการตั้งค่าโหมด timer Java package ยังคง `th.ac.kku.freelance_hub` CI เก็บ unit tests/build/Flyway/Docker smoke test ส่วน Playwright เป็น integration test ที่ต้องเปิด Backend และ Frontend ก่อนรัน CI ไม่มี deploy jobs และยังไม่ deploy FreelanceFlow การเงินและ deployment ต้องออกแบบ/เตรียมระบบของโปรเจกต์นี้แยกต่างหาก

## เครดิต

คงเครดิตสมาชิกผู้พัฒนา Freelance Hub ด้านล่าง ส่วนไฟล์ที่มีเครดิตหรือใบอนุญาตเดิมให้คงไว้
