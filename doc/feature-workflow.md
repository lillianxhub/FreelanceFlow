# กฎร่วมสำหรับเพิ่ม แก้ไข และลบ feature

## ก่อน implement

1. ตรวจ branch, working tree, consumers และการทำงานเดิม อ่าน requirements, API, state rules และ tests ที่เกี่ยวข้อง
2. ระบุปัญหาของผู้ใช้ ขอบเขตที่เปลี่ยน และ acceptance criteria ที่สังเกตได้ รวมกรณีผิดพลาด ownership และข้อมูลเก่า
3. ระบุผลต่อ routes, DTOs, schema, cache, browser keys, timer, configuration และ CI เลือก backward-compatible change เป็นค่าเริ่มต้น
4. ออกแบบ use case และ transaction boundary ก่อนลงรายละเอียด UI; งานหลาย resource ต้องชัดว่าบันทึกพร้อมกันหรือชดเชยอย่างไร
5. หากมีหลายทางเลือกที่กระทบ architecture ให้บันทึก decision: บริบท ทางเลือก เหตุผล trade-off และเงื่อนไขทบทวน ไม่ต้องสร้าง ADR สำหรับแก้ข้อความเล็กน้อย

## เพิ่ม feature

- เพิ่มความสามารถทีละ use case ที่ตรวจได้ เริ่มจาก contract และกฎ domain แล้ว persistence/service/controller, frontend service/hook/UI และ tests
- Backend เป็นแหล่งตัดสินสิทธิ์และ business rules; validation ใน UI ช่วยผู้ใช้แต่แทน Backend ไม่ได้
- Schema ใหม่ต้องมี migration ต่อจาก version สูงสุดใน branch หลังตรวจ concurrency กับ PR อื่น ห้ามแก้ migration ที่ใช้แล้ว
- เพิ่ม routes/menus เฉพาะที่ใช้งานได้จริง มี loading/error/empty/disabled และวิธีกดแทนการลาก
- dependencies ใหม่ต้องมีเหตุผล ดูแล lockfile และตรวจ version compatibility ไม่เปลี่ยน test framework โดยอ้อม

## แก้ bug หรือ refactor

- bug ต้องมี regression test ที่ล้มเหลวก่อนแก้ เมื่อความเสี่ยงสมควร; UI ข้อความหรือเอกสารไม่ต้องเพิ่ม test ที่ไม่มีประโยชน์
- refactor ต้องรักษา observable behavior, API และ data semantics แยกจากการเปลี่ยน behavior เพื่อ review ได้
- แยก SQL/use-case logic ที่อยู่ใน controller เมื่อทำงานในส่วนนั้น ไม่ขยาย refactor ทั้งระบบโดยไม่มีขอบเขต
- ลด duplication ที่มีเหตุผลเปลี่ยนเดียวกัน; โค้ดคล้ายกันแต่คนละกฎไม่จำเป็นต้องรวม

## ลบหรือเลิกใช้ feature

1. ค้นหาทุก consumer: route, menu, service, DTO, entity/query, event listener, config, dependency, tests และเอกสาร
2. ระบุว่าเป็นการซ่อน UI, ปิด endpoint, deprecate contract หรือเลิกเก็บข้อมูล เป็นคนละระดับและต้องมี acceptance criteria ต่างกัน
3. หากมี consumer ภายนอก ให้มีช่วง compatibility/deprecation ตามการใช้งานจริง ไม่เปลี่ยน endpoint เป็น 404 ทันทีโดยไม่ประเมิน
4. ข้อมูลเดิมต้องมี retention/export/archival และ recovery plan การลบ feature ไม่ได้อนุญาตให้ลบข้อมูลจริงโดยอัตโนมัติ
5. Database contraction ทำหลัง consumers หยุดใช้แล้ว ผ่าน migration ใหม่ ห้ามแก้ V1–V21 หรือ reset database เพื่อให้ tests ผ่าน
6. ลบ dead imports/routes/tests ที่ทดสอบ behavior เก่าจริง แต่คง tests ที่พิสูจน์ compatibility และข้อมูลย้อนหลัง

## Definition of Done และ PR

- acceptance criteria และ negative paths มีหลักฐาน; code ไม่รั่วข้าม owner และไม่สร้าง timer ซ้อน
- public contract, docs, environment examples และ CI สอดคล้องกัน
- checks ที่จำเป็นผ่าน หรือระบุ command/environment/ข้อจำกัดอย่างตรงไปตรงมา
- PR อธิบายปัญหา behavior หลังเปลี่ยน การย้ายข้อมูล compatibility และผลตรวจ ไม่อ้างว่าทั้งระบบผ่าน SOLID จากการปรับหนึ่งส่วน
- commit ต้องเป็นหน่วย review ที่มีเหตุผล ไม่รวม feature ไม่เกี่ยวข้อง; ตรวจ remote เป็น FreelanceFlow ก่อน push ตามคำสั่งผู้ใช้
- merge/deploy เป็นคนละ action อย่าตีความการเปิด PR ว่าอนุญาต deploy
