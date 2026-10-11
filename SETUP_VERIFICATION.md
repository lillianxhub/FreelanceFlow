# FreelanceFlow setup verification

ตรวจวันที่ 11 ตุลาคม 2026 (Asia/Bangkok)

## ที่มาของโค้ดและ Git

- ต้นฉบับ: `/home/shachi/dev/University/2569/1st/software_design/projects/repos/freelance-hub`
- Source HEAD: `6e1cb029f6a65f0bac4420af4f0e997daff4ddf9` บน `main` (local ตามหลัง origin/main 4 commits; ไม่ fetch/pull)
- ต้นฉบับ working tree สะอาดทั้งก่อนและหลัง ไม่แก้ไฟล์หรือประวัติของต้นฉบับ
- ปลายทางมีโค้ดอยู่แล้ว ไม่มี `.git`: 555 ไฟล์ตรงกับ source HEAD; `.gitignore` และ `code/Backend/mvnw.cmd` ต่างจาก source HEAD จึงใช้ไฟล์ปลายทางต่อโดยไม่คัดลอกทับ
- เริ่ม Git repository ใหม่บน `main` ไม่มี remote ไม่สร้าง GitHub repository, push หรือ deploy
- ไม่คัดลอก `.git`, credentials, node_modules หรือ build outputs จากต้นฉบับ Dependencies/build outputs ที่เกิดจากการตรวจถูก ignore

## การปรับและตรวจ

| รายการ | ผล |
| --- | --- |
| Backend `./mvnw --batch-mode --no-transfer-progress verify` | ผ่าน 551 tests; failures/errors/skipped = 0; BUILD SUCCESS |
| Java | ใช้ OpenJDK 21.0.12.1 บนเครื่อง โดย Maven compile ด้วย release 17; ยังไม่ได้ตรวจ runtime ด้วย JDK 17 ในรอบนี้ |
| Frontend `npm ci` | สำเร็จผ่าน Docker `node:22-bookworm` เพราะเครื่องไม่มี Node/npm |
| Frontend lint / typecheck | ผ่านทั้งสองรายการ |
| Frontend `npm test` | ผ่าน 95 tests; failed/skipped = 0 รวมการแยก browser lock, channel และ profile storage |
| Frontend `npm run build` | ผ่าน |
| Flyway migrate / validate | ผ่านครบ 20 migrations บน PostgreSQL 16.15 ใน container สำหรับการตรวจโดยเฉพาะ ไม่มีการใช้ฐานข้อมูลของต้นฉบับ |
| Migration compatibility | SQL V1–V20 ตรงกับไฟล์ committed ของต้นฉบับทุก byte |
| Compose config | ผ่านเมื่อระบุ POSTGRES_PASSWORD และ JWT_SECRET สำหรับตรวจ configuration; ไม่ได้เริ่ม Compose application หรือใช้ volume ของต้นฉบับ |
| Ignore / config audit | `.env`, `.env.*`, node_modules, dist และ target ถูก ignore; `.env.example` ยังเก็บใน Git ได้ และไม่มี password/JWT secret จริง |
| CI | เก็บ tests/build/migrations และ Docker smoke test; นำ Render deploy jobs ออก; ยังไม่ได้รัน GitHub Actions ของ repository ใหม่ |

แก้ tests ที่ยังอ้างชื่อ refresh cookie เดิมและ origin `localhost:5173` ให้ใช้ FreelanceFlow และ `localhost:5174` ก่อนรัน Maven verify รอบสุดท้าย

Branding เปลี่ยนเป็น FreelanceFlow; Maven artifact เป็น `freelanceflow`; คง Java package เดิม Cookie คือ `freelanceflow_refresh`, channel คือ `freelanceflow-auth`, browser lock คือ `freelanceflow-refresh`, profile storage prefix คือ `freelanceflow:profile-image:`

## สิ่งที่ยังเหลือ

- ตั้ง password และ JWT secret ใหม่ใน `.env` ตาม README แล้วรันระบบที่ ports Frontend 5174 / Backend 8081 / PostgreSQL 5433 ยังไม่ได้ทำ browser end-to-end หรือเปิด application เต็มชุดในรอบนี้
- `npm audit` พบ high 8 รายการ (critical 0): `@shadcn/registry`, `@ts-morph/common`, `braces`, `fast-glob`, `micromatch`, `shadcn`, `source-map-js`, `ts-morph` เป็น dependencies ที่รับต่อมา ไม่ได้เปลี่ยนเวอร์ชันหรือใช้ audit fix ในรอบย้าย/เปลี่ยนชื่อ
- สร้าง GitHub repository ใหม่ที่ว่าง เพิ่ม URL จริงเป็น origin หลังตรวจ remote และ push main จาก repository นี้ แล้วตรวจ CI และตั้ง branch protection ตามผล CI จริง
- จัดเตรียม deployment ของ FreelanceFlow พร้อม URL และ secrets ของตนเองก่อนเปิด deploy ไม่ใช้ปลายทาง/credentials ของ Freelance Hub
- เอกสารและผลทดสอบเดิมที่รับต่อถูกระบุเป็นข้อมูลประวัติและยังคงเครดิตผู้พัฒนาเดิม
