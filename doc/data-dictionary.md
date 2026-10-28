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

## แพ็กเกจผู้ใช้

`users.plan` เพิ่มใน V22 เป็น `VARCHAR(20) NOT NULL DEFAULT 'FREE'` พร้อม CHECK ให้เป็น `FREE` หรือ `PREMIUM` บัญชีเดิมจึงเริ่มที่ Free ส่วน `users.role` ยังคงแยกเป็น `USER`/`ADMIN` Admin ใช้ Finance ได้โดยไม่ต้องเปลี่ยนแพ็กเกจ การเปลี่ยนแพ็กเกจเพิ่ม `users.version` และต้องส่ง version ปัจจุบันเพื่อป้องกันการบันทึกทับกัน ไม่มีข้อมูลการชำระเงินหรือวันหมดอายุใน schema นี้

## Finance (V23)

V23 เพิ่ม `finance_settings` (หนึ่งแถวต่อ owner), `finance_assets` (โลโก้ PNG/JPEG), `finance_categories`, `finance_presets`, `finance_invoices`, `finance_invoice_lines`, `finance_transactions`, `finance_payments`, `finance_documents` และ `finance_document_counters` ไม่มีข้อมูลตัวอย่างหรือยอดตั้งต้นใน migration นี้ ตารางที่มีความสัมพันธ์ข้าม resource ใช้ `owner_id` และ composite foreign key `(id,owner_id)` เพื่อไม่ให้ลูกค้า โปรเจกต์ Invoice หรือ Payment ข้ามเจ้าของได้ เลขเอกสาร unique ตามเจ้าของ และ counter แยกประเภท/ปี

เงินเก็บเป็น `NUMERIC(17,2)`, จำนวนบริการเป็น `NUMERIC(15,3)` และอัตรา VAT เป็น `NUMERIC(5,2)` Invoice เก็บ subtotal, discount, VAT, total ที่ Backend ยืนยันเมื่อบันทึก Draft; เมื่อ Issue จะเก็บ seller/buyer/brand snapshot แบบ `JSONB` และเลขเอกสาร รายการธุรกรรม/Payments/เอกสารที่ยกเลิกยังอยู่พร้อมเหตุผลและเวลา ข้อมูลการเงินไม่ลบเมื่อเปลี่ยนแพ็กเกจหรือ logout ดู [Finance API](finance-api.md) สำหรับสูตรและ lifecycle

## Global Premium policy (V24)

`app_feature_settings` is a singleton (`id=1`) with `premium_enforced BOOLEAN NOT NULL DEFAULT FALSE`, optimistic `version`, and `updated_at`. The migration inserts the initial row once; restarts and later migrations do not overwrite it. User plans remain unchanged.

## Quotations (V25)

`finance_quotations` stores owner, client/project, issue/valid-until dates, DRAFT/ISSUED/CANCELLED state, exact monetary totals, seller/buyer/brand JSONB snapshots, note, cancellation reason, version and timestamps. Owner-safe composite foreign keys match invoices. `(owner_id,number)` is unique; QT uses the existing transactional owner/type/year counter. `finance_quotation_lines` stores ordered description, quantity `NUMERIC(15,3)`, unit, unit price and rounded amount `NUMERIC(17,2)`.

`finance_invoices.source_quotation_id` is nullable for existing invoices, unique for converted invoices, and has an owner-safe composite foreign key to quotations. This permits at most one invoice per quotation without merging quotation data into the accounting ledger. Additive V24/V25 migrations retain all V23 records and existing migration checksums.

### Premium trial (V26)

`users.premium_trial_ends_at`: nullable TIMESTAMP WITH TIME ZONE. NULL means the account has not claimed a trial. A future instant grants Finance access alongside the stored plan; a past instant preserves trial usage and prevents renewal. Written once through the authenticated trial use case, with a conditional UPDATE and user version increment. No existing account or Finance data is rewritten by migration.
