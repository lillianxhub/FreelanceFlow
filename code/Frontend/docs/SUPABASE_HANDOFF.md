# กฎย้ายจุดเชื่อม Backend เดิม

เอกสาร Supabase handoff เดิมเลิกใช้เป็นแนวทาง implementation ของ FreelanceFlow ให้ใช้ [Next.js → Spring Boot integration](BACKEND_INTEGRATION.md)

หากแตะโค้ด/เอกสารที่ยังอ้าง Supabase หรือ Vite ต้องตรวจ consumers ก่อนลบ แปลง contract ผ่าน service/adapter และ tests ไม่เพิ่ม Supabase dependency/configuration จากชื่อไฟล์เก่า ไม่อ้าง schema การเงินจาก handoff เดิมว่า Backend ปัจจุบันรองรับแล้ว

ประวัติเนื้อหาเดิมตรวจได้จาก Git history; เครดิตผู้พัฒนาเดิมคงไว้ใน README หลัก
