# กฎ CI และการเตรียม release

Pipeline ปัจจุบันอยู่ใน `.github/workflows/backend.yml` และ `frontend-ci.yml` ใช้ source YAML เป็นความจริง ไม่อ้างสถานะ CI จากเอกสารนี้

## Checks สำหรับ implementation

- Backend: Maven verify, Flyway migrate/validate และ Docker build/runtime smoke ที่ตรวจ port จริงของแอป
- Frontend: npm ci จาก lockfile, lint, typecheck, unit tests และ Next production build
- Browser integration: Playwright ต้องเปิด PostgreSQL/Backend/Next ที่แยกสำหรับ tests ตาม [test plan](../test/test-plan.md) ปัจจุบันเป็นคำสั่งแยก ไม่อ้างว่า frontend CI รัน browser โดยอัตโนมัติ
- schema change ต้องทดสอบทั้ง fresh และ upgrade; runtime checks ต้องใช้ container/host port ให้ตรง config
- ใช้ quality gates ที่ไม่ผ่านเมื่อ required job fail ตรวจ path filters เมื่อเพิ่ม/ย้าย/ลบ feature หรือโฟลเดอร์

## กฎแก้ CI

CI change ต้องตรวจ YAML, commands, working directory, versions, paths, ports และ secrets scopes ห้าม disable tests หรือเพิ่ม skip เพื่อกลบ bug เก็บ log/report เป็น evidence พร้อม commit/run URL ไม่ฝัง credentials จริงในตัวอย่าง

## Deployment

FreelanceFlow ไม่มี deploy jobs ที่เปิดใช้งาน การ build/push branch/เปิด PR ไม่ใช่ deploy หากเพิ่ม deployment ในอนาคตต้องกำหนด environment/URL จริง, secret storage, HTTPS/cookies, migrations, backup/restore, health และ recovery ก่อนเปิด job ไม่ใช้ปลายทางของ Freelance Hub

ลบ feature ต้องปรับ CI paths/artifacts/config ที่เลิกใช้และคง checks ของ consumers ที่เหลือ ไม่ลบ historical logs/evidence เพื่อให้ผลดูผ่าน
