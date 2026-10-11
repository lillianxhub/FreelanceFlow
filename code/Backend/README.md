# กฎ implementation — Spring Boot

ฐานปัจจุบันคือ Spring Boot 4.0, Java release 17, Spring MVC/Security, JPA/JDBC, PostgreSQL และ Flyway ตรวจเวอร์ชันจริงจาก `pom.xml` อ่าน [workflow](../../doc/feature-workflow.md) ก่อนเปลี่ยน feature

## ชั้นและหน้าที่

| ชั้น | หน้าที่ | สิ่งที่ต้องแยกออก |
| --- | --- | --- |
| Controller | parse/validate DTO, authenticated context, HTTP และ ApiResult | SQL, business orchestration และการคำนวณ domain |
| Service/use case | ownership, state rules, transaction และประสาน resource | servlet/UI และ persistence details ที่ไม่จำเป็น |
| Domain/policy | invariants, value/state behavior | response wrapper และ network |
| Repository/query adapter | owner-scoped query, persistence, paging/locking | ตัดสิน UX หรือ HTTP status |
| Mapper/DTO | สัญญาข้อมูลและ boundary mapping | entity graph ที่รั่วผ่าน JSON |

โครง package เดิมอยู่ใน `th.ac.kku.freelance_hub` ใช้ต่อ ไม่เปลี่ยนทั้ง package ในงาน feature ทั่วไป ใช้ constructor injection ตาม [Spring Boot DI](https://docs.spring.io/spring-boot/reference/using/spring-beans-and-dependency-injection.html) และ dependencies ที่ชัดเจน

Controller ใหม่ต้อง delegate ไป service/repository กรณี DailyPlanController/WorkspaceController เดิมมี SQL/orchestration ใน controller เป็นช่องว่างที่ต้องค่อยแยกเมื่อแตะส่วนนั้น ไม่ใช้เป็นแบบอย่างของโค้ดใหม่

## Transaction และ concurrency

- command หลาย writes ที่เป็น use case เดียวต้อง atomic และมี rollback test วาง `@Transactional` ที่ public service method ตาม [Spring transaction semantics](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
- self-invocation ไม่ผ่าน transaction proxy โดยปริยาย อย่าคิดว่า annotation อย่างเดียวทำให้ rollback ทำงาน
- optimistic version/unique constraints/locking ต้องกัน race ที่ DB; frontend precheck ไม่พอ
- ห้าม catch แล้วกลืน exception จน transaction commit บางส่วน; checked exception ที่ต้อง rollback ให้ระบุ policy
- ห้ามทำ network call ยาวภายใน DB transaction โดยไม่มีเหตุผลและ timeout; external effects ต้องระบุ failure/retry/idempotency หากเพิ่มในอนาคต
- ทดสอบว่าการย้าย Task กับ start/stop timer commit หรือ rollback พร้อมกัน และไม่เกิด timer ซ้อน

## Data และสิทธิ์

ทุก read/write/filter/count ต้อง scoped ตาม authenticated owner ไม่เชื่อ ownerId จาก request ตรวจ parent resource, archive/delete และสถานะโปรเจกต์ด้วย DTO validation ดูแลรูปแบบข้อมูล ส่วน business validation อยู่ใน service/domain

Query ใช้ parameters; sort field ใช้ allowlist; ทุก list ที่เติบโตได้ต้อง pagination หลีกเลี่ยง N+1 ด้วย query/projection ที่เหมาะกับ use case อย่าใส่ EAGER ทุก relation เพื่อกลบปัญหา

Flyway เป็น source ของ schema ใช้ `ddl-auto=validate` ห้ามแก้ migrations ที่ใช้แล้ว เพิ่มต่อจาก version สูงสุด (ปัจจุบัน V21) และตรวจ [schema rules](../../doc/data-dictionary.md)

## API/error/test

ใช้ ApiResult และ HTTP status จริงตาม [error contract](../../doc/error-contract.md) ไม่คืน JPA entities โดยตรง ไม่เผย stack trace/SQL/secret/ข้อมูล owner อื่น

Unit test policy/service และ negative paths; HTTP contract/security test; PostgreSQL integration test สำหรับ transaction/constraints/Flyway ดู [test plan](../../test/test-plan.md) สำหรับการเพิ่ม แก้ไข และลบ feature

```bash
./mvnw --batch-mode --no-transfer-progress verify
# เริ่ม local runtime หลังตั้ง .env ตาม README หลัก
docker compose up -d --build
```

ดู [Spring Boot 4 testing](https://docs.spring.io/spring-boot/4.0/reference/testing/index.html) เลือก test slice ตาม imports/dependencies ใน Boot 4 อย่าคัดลอก package จาก Boot 3 โดยไม่ตรวจ
