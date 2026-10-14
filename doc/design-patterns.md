# กฎเลือก design pattern

เลือก pattern หลังอธิบายปัญหา, alternatives, responsibilities และผลต่อ tests ได้ ไม่เพิ่ม pattern เพื่อให้ครบรายงาน รูปแบบที่มีอยู่ในโค้ดต้องตรวจจาก source ก่อนอ้างชื่อ

| Pattern/แนวทาง | ใช้เมื่อ | Trade-off และกฎทดสอบ |
| --- | --- | --- |
| Layered architecture | แยก HTTP, use case และ persistence | layer ไม่เพิ่มคุณค่าถ้าเพียงส่งต่อทุก method; test policy แยก HTTP และ DB |
| Repository / Query adapter | encapsulate persistence, owner scope และ reports queries | ไม่สร้าง generic CRUD god-interface; PostgreSQL tests สำหรับ query/constraints |
| Strategy / Policy | มีกฎหลายแบบที่เปลี่ยนอิสระ เช่น timer modes เมื่อซับซ้อน | ห้ามสร้าง hierarchy สำหรับ if ง่าย ๆ; shared contract และ per-mode tests |
| Adapter | แปลง API DTO/legacy field ไป UI/domain model | mapping ต้องคงหน่วย/null/status/version; contract test ตาม public behavior |
| Factory | การสร้าง value/response มีกฎและ invariants หลายทาง | static helper เดียวไม่ใช่ Abstract Factory โดยอัตโนมัติ; test invalid construction |
| Observer / domain event | มี consumers หลายตัวต่อเหตุการณ์ เช่น progress updates | ระบุ ordering, duplicate handling และ transaction/after-commit semantics; ห้ามส่ง external side effect ก่อน commit โดยไม่ออกแบบ |
| Chain of Responsibility | มีกฎ/handlers ต่อเนื่องที่เลือกผู้รับผิดชอบชัดเจน | ระบุ precedence และ fallback; exception advice ธรรมดาไม่จำเป็นต้องเรียก Chain |
| State / transition policy | transitions มี restrictions ตามสถานะ | explicit transition table อาจเพียงพอ; test allowed/rejected transitions และ side effects |
| Composition | reuse UI behavior ผ่าน components/hooks | หลีกเลี่ยง component props ครอบทุก feature; test focus/events/cleanup |

GoF patterns อ้างอิง Gamma, Helm, Johnson, Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley (1994) ใช้ชื่อ pattern ตรงบทบาทจริง; Spring-managed singleton bean ไม่ใช่การบังคับเขียน GoF Singleton และ Dependency Injection ไม่ใช่ GoF pattern

## Decision ที่ต้องบันทึก

บอก trigger/variation ที่เกิดจริง, ทางเลือกที่ง่ายกว่า, interface และ consumers, lifecycle/state, failure/concurrency, tests และเงื่อนไขถอน pattern หาก feature ถูกลบ ไม่ใช้ reflection/plugin registry สำหรับ requirement ที่ไม่มี

## ตัวอย่าง Board command

ต้องประสาน Task status และ timer ใน transaction เดียว service/use case เป็นเจ้าของ orchestration repository จัด version/persistence UI adapter รับ Task/currentTimer ล่าสุด หาก AUTO/MANUAL มี behavior มากขึ้นจึงพิจารณาแยก TimerModePolicy แต่ห้ามให้ policy ข้าม ownership หรือสร้าง timer ซ้อน

เมื่อ refactor pattern ให้เทียบ behavior ก่อน/หลัง เมื่อเพิ่ม implementation ให้ contract test เมื่อเลิกใช้ feature ให้ถอด strategy/registration/dead abstraction พร้อม consumers
