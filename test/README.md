# กฎเขียนและตรวจ tests

Automated tests อยู่ใน Backend `src/test`, Frontend `src/**/*.test.ts(x)` และ `e2e/` โฟลเดอร์นี้เป็นคู่มือเลือก tests และบันทึก evidence

- [Test plan](test-plan.md): ระดับและกรณีทดสอบสำหรับเพิ่ม/แก้/ลบ feature
- [Test report](test-report.md): format บันทึกผลจริงและข้อจำกัด
- [Coverage](coverage-report.md): ตีความ coverage และ gaps

ต้องทดสอบ behavior/invariants ที่มีผลจริง ไม่เขียน test ที่คัด implementation หรือตรวจข้อความเอกสารแทน feature Bug ที่เสี่ยงควรมี regression test ล้มเหลวก่อนแก้ และผ่านหลังแก้ ห้ามแก้ expected ให้ตรง bug โดยไม่มี requirement ใหม่

JSON ใน `evidence/` เป็นหลักฐานประวัติที่รับต่อมา คงไฟล์เดิมไว้แต่ไม่ใช้เป็นผลปัจจุบัน ไม่กำหนดจำนวน tests ตายตัวเพื่อผ่าน gate

อ้างอิง [Spring Boot 4 testing](https://docs.spring.io/spring-boot/4.0/reference/testing/index.html), [Next.js testing](https://nextjs.org/docs/app/guides/testing) และ [Playwright best practices](https://playwright.dev/docs/best-practices)
