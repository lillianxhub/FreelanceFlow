# แนวทางออกแบบ use case และ implementation

ทุก use case ต้องระบุ actor, trigger, preconditions, ownership, inputs, success result, state/data writes, transaction boundary, error outcomes และ tests ใช้ร่วมกับ [requirements](../REQUIREMENTS.md) ไม่กำหนด endpoint ใหม่จาก diagram อย่างเดียว

## Flow มาตรฐาน

1. Next UI รับ intent และตรวจ input ที่ช่วยผู้ใช้
2. API service ส่ง DTO/version ผ่าน `/api`
3. Spring controller ตรวจรูปแบบและใช้ authenticated context
4. service ตรวจ owner, parent/status และ orchestrate command
5. repository/DB ตรวจ constraints/concurrency; commit หรือ rollback ตาม use case
6. DTO ส่ง canonical state; UI synchronize และคืน focus/แสดงผลที่ถูกต้อง

## กฎเฉพาะ flow

- Auth: login → memory access token + refresh cookie; reload → refresh + current user; logout → invalidate session และแจ้งแท็บอื่นตาม contract
- CRUD: ตรวจ owner ทั้ง object และ parent การ archive/delete ต้องไม่ทำลาย time/report history โดยไม่มี retention plan
- Today: search/paging เป็นแหล่ง task ที่เลือกได้; PUT ordered IDs พร้อม version; remove เปลี่ยน membership เท่านั้น; วันใหม่ต้องเลือก carry-over เอง
- Board AUTO: ย้ายเข้ากำลังทำประสาน start timer; มีงานอื่นวิ่งต้องเลือก stop-and-save/switch หรือ cancel; ย้ายงานที่วิ่งออกประสาน stop กับ status
- Board MANUAL: status และ timer controls แยกกัน แต่ task ที่ timer วิ่งต้องหยุดก่อนย้ายออก; เปลี่ยนโหมดไม่เปลี่ยน running timer
- Reports: ตรวจ date/filter/owner และ aggregate จาก persisted records ไม่รวม running duration แบบสมมติโดยไม่มี contract

## Failure paths ที่ต้องออกแบบ

invalid DTO, unauthenticated, forbidden/not found, project unavailable, stale version, another timer running, zero/invalid duration, network timeout และ persistence failure ระบุว่า UI คืนตำแหน่ง/load state และใคร retry ได้ การย้ายบอร์ดต้องไม่มี partial stop/status/start เมื่อ transaction ล้มเหลว

## เพิ่ม แก้ไข ลบ use case

เพิ่ม criteria และ contract ก่อน code; bug เพิ่ม regression ที่พิสูจน์อาการ; refactor รักษาผล observable; ลบต้องค้นหา callers/deep links/events/schema dependencies และระบุผลต่อข้อมูลเดิม การกดปุ่มกับ drag ต้องเข้ากฎ use case เดียวกัน
