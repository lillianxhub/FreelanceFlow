# กฎเปลี่ยน schema และ data dictionary

Flyway migrations ใน `code/Backend/src/main/resources/db/migration` เป็นหลักฐาน schema จริง ไม่สร้างตารางหรือ field ตาม diagram ที่ยังไม่ได้ implement ปัจจุบัน migrations ต่อถึง V21; ตรวจ version สูงสุดก่อนเพิ่มทุกครั้ง

## สิ่งที่ต้องระบุสำหรับทุก field/table

ชื่อและ business meaning, SQL type/precision, nullable/default, primary/foreign key, unique/check/index, owner scope, หน่วย/timezone, lifecycle, retention และ mapping ไป Java/DTO/TypeScript ห้ามใช้ UUID รูปแบบถูกต้องเป็นหลักฐาน ownership

## กฎ schema

- migration ที่ใช้แล้วห้ามแก้หรือ renumber เพิ่ม version ใหม่และตรวจ Flyway validate
- ใช้ constraints เป็น invariants ที่ DB ป้องกันได้; precheck ใน service อย่างเดียวกัน race ไม่ได้
- index อิง owner/filter/join/order และ workload จริง ไม่เพิ่ม index ทุก field โดยไม่มี query รองรับ
- foreign key deletion policy ต้องออกแบบกับข้อมูลเวลา/รายงาน/daily-plan membership ก่อนเลือก CASCADE
- timestamp event เก็บ instant ที่ชัดเจน ส่วน daily plan ใช้ local date ตาม Asia/Bangkok อย่าแทน local date ด้วย server timezone
- เงินในอนาคตต้อง precision/currency/rounding จริงก่อนเพิ่ม ห้าม float หรือ placeholder เป็นยอดบัญชี

## Resource boundaries ที่ต้องรักษา

| Resource | กฎที่ต้องตรวจ |
| --- | --- |
| users, user_profiles, refresh_tokens | owner/session lifecycle และการไม่เผย credential |
| clients, projects, tasks | owner/parent relationships, state/archive/delete semantics |
| time_entries | duration/start/stop consistency และหนึ่ง running timer ต่อผู้ใช้ |
| daily_plans | primary key owner_id + plan_date และ optimistic version |
| daily_plan_items | membership/order ต่อแผน; unique position/task; การเลือกไม่เปลี่ยน Task status |
| workspace_preferences | owner scope และ board_timer_mode AUTO/MANUAL, default AUTO |

## เพิ่ม/แก้ไข/ลบข้อมูล

เพิ่ม nullable/default ที่รองรับข้อมูลเดิมตาม use case การเปลี่ยน type/NOT NULL/unique ต้องตรวจข้อมูลเก่าและ backfill ทดสอบกับ PostgreSQL จริง เลิกใช้ field ผ่าน expand/contract เมื่อมี consumers หลายรุ่น

ลบ feature ไม่เท่ากับลบตารางหรือ historical rows ต้องกำหนด retention/export/recovery ก่อน destructive migration ไม่ใช้ reset, clean หรือแก้ Flyway history เพื่อแก้ checksum

ทดสอบ migrate/validate ทั้ง empty DB และ upgrade จาก version ก่อนการเปลี่ยน schema พร้อมข้อมูลตัวอย่างที่มี FK/archive/timer conflicts
