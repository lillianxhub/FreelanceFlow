# FreelanceFlow CI

GitHub Actions ตรวจ Backend ด้วย Maven verify, PostgreSQL/Flyway V1–V21 migrate/validate และ Docker smoke test; Frontend ตรวจ lint, typecheck, tests และ build

ยังไม่มี deployment ของ FreelanceFlow และไม่มี deploy jobs ที่เรียก Render hooks ห้ามนำ secrets หรือการเชื่อม Vercel/Render ของ Freelance Hub มาใช้ ต้องจัดเตรียม infrastructure และ URL จริงของโปรเจกต์ใหม่ก่อนเปิด deployment
