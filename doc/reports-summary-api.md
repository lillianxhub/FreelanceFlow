# กฎ implementation ของ Reports API

ใช้ `ReportController`, `ReportService` และ query/mapper ที่มีอยู่เป็นจุดเริ่ม ไม่คำนวณ metric จาก placeholder ใน UI Endpoint ปัจจุบันภายใต้ `/api/reports` คือ summary, work-trend, distribution, work-pattern และ projects ตรวจ DTO/query params จริงจาก source/OpenAPI ก่อนแก้

## กฎ contract และการคำนวณ

- ระบุ metric formula, หน่วย, date inclusion, timezone, grouping, zero/empty และ rounding ให้ทดสอบได้
- owner filter ต้องอยู่ใน query/aggregate/count ทุกเส้น ไม่กรองข้อมูล owner อื่นหลังโหลดขึ้นมาแล้ว
- pagination/sort/filter ใช้ allowlist และ deterministic ordering; meta ต้องตรงกับ data
- วันนี้ใช้ date Bangkok แต่ reports ต้องรักษา semantics ช่วงเวลาปัจจุบันจนกว่าจะมี requirement เปลี่ยนอย่างชัดเจน
- ตีความ duration ที่ persisted และ running timer แยกกัน ห้ามเปลี่ยน historic totals จากการ format ใน UI
- UI แสดง empty/error จริง ไม่แทนด้วยข้อมูล demo หรือยอดการเงินจาก field placeholder

## เพิ่ม/แก้/ลบ report

ก่อนเพิ่ม metric ให้ระบุ data source และตัวอย่างคำนวณ ข้อมูล null/archived/deleted ต้องมีนโยบาย เมื่อแก้สูตรให้ regression fixtures เทียบ expected totals และประเมินผลย้อนหลัง

ลบ report/field ต้องค้นหา charts, export, filter state และ service types รวม consumers ภายนอกก่อนปิด contract ไม่ลบข้อมูลเวลาเพื่อเลิกใช้รายงาน

## Tests

Unit: สูตร/unit/date validation; repository integration: aggregates, owner isolation, filters, timezone boundaries, paging; HTTP contract: DTO/error/meta; UI/browser: filter changes, empty/error, accessible charts/table และ stale response ไม่ทับ filter ใหม่
