# กฎพัฒนา FreelanceFlow

อ่าน [วงจรเปลี่ยน feature](doc/feature-workflow.md) ก่อนแก้โค้ด และอ่านคู่มือ Backend/Frontend/test ตามขอบเขตที่แตะ กฎในเอกสารใช้กับคนและ coding agents เหมือนกัน คำสั่งตรงจากผู้ใช้มีลำดับสูงกว่าแนวทาง repository

- ทำงานใน FreelanceFlow เท่านั้น รักษาเครดิตและ migrations ที่ใช้แล้ว ไม่แก้ Freelance Hub
- ตรวจ working tree และคำสั่งผู้ใช้ก่อนเปลี่ยน branch/commit/push อย่า reset หรือลบงานที่มีอยู่
- แยก HTTP/UI, use-case logic และ persistence; ตรวจ ownership และ state rules ที่ Backend ทุก action
- คง Java package เดิมและ auth/timer semantics เว้นแต่มีงานเปลี่ยนที่ระบุชัดเจน
- ใช้ `/api` ผ่าน Next.js proxy; ไม่ส่ง token/secret เข้า Server Component props หรือ public environment
- เพิ่ม แก้ไข หรือลบ feature ต้องปรับ contract, consumers, migration strategy, tests และเอกสารพร้อมกัน
- รัน checks ตาม [test plan](test/test-plan.md) แจ้งสิ่งที่ไม่ได้รันและเหตุผล ห้ามอ้างผลจากหลักฐานเก่า
- SOLID/patterns ใช้แก้ปัญหาที่อธิบายได้ ไม่สร้าง interface หรือ framework เพื่อให้ครบชื่อหลักการ
- การ deploy เป็นงานแยก ต้องมีปลายทางและ configuration จริงของ FreelanceFlow
