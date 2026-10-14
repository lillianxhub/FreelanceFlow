# กฎออกแบบ API และ error contract

ใช้ `ApiResult<T>` ตาม `common/response` และ frontend `apiClient` ทุก endpoint ที่มี body ใช้ envelope `{ success, message, data, meta, error }`; 204 ต้องไม่มี body ไม่สร้าง wrapper ต่างออกไปเฉพาะ feature

## กฎ HTTP และ validation

| กรณี | แนวทาง |
| --- | --- |
| รูปแบบ/field/range ผิด | 400 พร้อม machine-readable code และ fieldErrors เมื่อเหมาะสม |
| ไม่ authenticated / session หมด | 401; frontend ใช้ refresh policy กลาง ไม่ refresh ซ้ำในแต่ละ component |
| authenticated แต่ไม่มีสิทธิ์ | 403 ตามนโยบาย disclosure ของ resource |
| ไม่พบ resource | 404; owner-scoped lookup ต้องไม่เปิดเผยว่าข้อมูล owner อื่นมีอยู่ |
| version/state/timer conflict | 409 พร้อมข้อมูลให้โหลดใหม่หรือให้ผู้ใช้ตัดสินใจ |
| rate limit | 429 พร้อม retry policy/header เมื่อมี |
| ความผิดพลาดไม่คาดคิด | 5xx; log ด้วย traceId ไม่ส่ง stack trace/SQL/secret ให้ browser |

อย่าใช้ 200 + success=false กลบสถานะ HTTP ใหม่ รักษา compatibility ของ consumers เก่าผ่าน adapter เมื่อจำเป็น error.code เป็น contract สำหรับ logic ข้อความภาษาไทยเป็นข้อความผู้ใช้ ไม่ parse message เพื่อตัดสิน behavior

`ApiError` ปัจจุบันมี code, details, status, timestamp, fieldErrors, traceId ฟิลด์ nullable ให้ตรง serializer/consumer ห้ามสร้างชื่อ field ขึ้นเองโดยไม่แก้ DTO, handler และ types พร้อมกัน

## Transaction และ conflict

Backend ต้องตรวจ version และ state ใกล้ write ภายใน transaction มี DB constraint/locking ตามกรณี เมื่อ 409 UI ต้องคืน optimistic state และโหลดข้อมูลจริง ห้าม retry ด้วย version ใหม่อัตโนมัติจนเขียนทับเจตนาผู้ใช้อื่น

Network retry ของ read ทำได้ตาม timeout policy แต่ mutation ที่อาจสำเร็จแล้วต้องมีวิธีตรวจผล/idempotency ก่อน retry ถ้าเพิ่ม idempotency ให้ระบุ key scope, expiry และ duplicate response

## เพิ่ม แก้ไข หรือลบ contract

เพิ่ม optional field ต้องตรวจ nullable/default และ consumers; เปลี่ยน type/enum/unit/error code เป็น breaking change ที่ต้องมีแผน; ลบ endpoint/field ต้องค้นหา frontend/services/tests/external callers และ deprecation ตาม [workflow](feature-workflow.md)

เพิ่ม HTTP contract tests สำหรับ success, invalid input, unauthorized, owner isolation และ conflict ทดสอบ error metadata ที่ UI ใช้จริง ไม่ผูก test กับข้อความ exception ภายใน
