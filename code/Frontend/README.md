# FreelanceFlow Frontend

Next.js App Router, React, TypeScript และ Tailwind CSS ดู [README หลัก](../../README.md) สำหรับ Backend และการตั้งค่า

```bash
cp .env.example .env
npm ci
npm run dev
npm run lint && npm run typecheck && npm test && npm run build
# เปิด Backend และ Frontend ก่อน จากนั้นรัน integration tests
npx playwright install chromium
npm run test:e2e
```

เปิด http://localhost:5174; `BACKEND_ORIGIN` ใช้เฉพาะ Next.js server เพื่อ rewrite `/api` ไป Backend และไม่ส่งไป browser หากเปลี่ยนค่า `BACKEND_ORIGIN` หลัง build ให้ build ใหม่ก่อน `npm run start` ไม่มี deployment configured
