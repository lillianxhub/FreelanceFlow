# กฎใช้ diagrams ระหว่าง implementation

Diagrams ใช้อธิบาย decision และผลกระทบ ไม่แทน source, migrations หรือ tests ตัวอย่างในโฟลเดอร์นี้เป็นแม่แบบแนวทาง ต้องตรวจ implementation ก่อนใช้เป็นแผนภาพสถานะจริง

| คู่มือ | ใช้เมื่อ |
| --- | --- |
| [Use case](use-case-diagram.md) | เปลี่ยน actor/intent/ขอบเขต feature |
| [Domain](domain-model.md) | เปลี่ยน concepts/invariants/ownership |
| [Class](class-diagram.md) | เปลี่ยน responsibilities/interfaces/dependencies |
| [ER](er-diagram.md) | เปลี่ยน tables/keys/constraints/lifecycle |
| [Sequence](sequence-diagram.md) | เปลี่ยน orchestration/transaction/errors |
| [Project activity](activity-project-status.md) | เปลี่ยน validation/status workflow |
| [Timer activity](activity-timer.md) | เปลี่ยน timer/switching/rollback |
| [State](state-diagram.md) | เปลี่ยน transitions หรือ daily-plan semantics |
| [Component](component.md) | เปลี่ยน Spring/Next layers หรือ integration |
| [Deployment](deployment-diagram.md) | เปลี่ยน topology/ports/cookies/config |

ทุก diagram ต้องมี scope, current/proposed, source/commit ที่ตรวจ, legend และ decision เมื่อเพิ่ม/แก้/ลบ feature ให้เปลี่ยนเฉพาะ diagrams ที่กระทบ คง compatibility/data history ในคำอธิบาย ห้ามอ้าง cloud deployment จากภาพ topology

ใช้ Mermaid ที่ render ได้ ชื่อ node สื่อหน้าที่ ไม่มี secrets หรือ URL ที่แต่งขึ้น ตรวจ links และความสอดคล้องกับ acceptance criteria ตาม [workflow](../feature-workflow.md)
